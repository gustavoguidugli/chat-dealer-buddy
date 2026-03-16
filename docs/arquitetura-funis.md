# Arquitetura: Sistema de Funis, Triggers e Roteamento de Leads

> Documentação técnica completa do sistema de CRM multi-tenant com funis dinâmicos.

---

## Sumário

1. [Modelo de Dados](#1-modelo-de-dados)
2. [Tipos de Funil](#2-tipos-de-funil)
3. [Triggers e Ordem de Execução](#3-triggers-e-ordem-de-execução)
4. [Fluxos de Roteamento de Leads](#4-fluxos-de-roteamento-de-leads)
5. [Edge Function: copy-company-config](#5-edge-function-copy-company-config)
6. [Frontend: Criação Automática de Funil](#6-frontend-criação-automática-de-funil)
7. [RLS e Isolamento Multi-Tenant](#7-rls-e-isolamento-multi-tenant)
8. [Limitações Conhecidas (SDR Tables)](#8-limitações-conhecidas-sdr-tables)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Modelo de Dados

### Diagrama de Relacionamentos

```text
empresas_geral (id)
  │
  ├── funis (id_empresa → empresas_geral.id)
  │     ├── tipo → funil_tipos.id (FK)
  │     └── etapas_funil (id_funil → funis.id)
  │
  ├── lista_interesses (empresa_id → empresas_geral.id)
  │     └── funil_id → funis.id (FK direto)
  │
  ├── leads_crm (id_empresa → empresas_geral.id)
  │     ├── id_funil → funis.id
  │     ├── id_etapa_atual → etapas_funil.id
  │     └── id_contato_geral → contatos_geral.id
  │
  └── contatos_geral (empresa_id → empresas_geral.id)
```

### Tabelas Principais

| Tabela | Descrição | FK Principal |
|---|---|---|
| `empresas_geral` | Empresa (tenant) | — |
| `funis` | Pipeline/funil de vendas | `id_empresa → empresas_geral.id` |
| `funil_tipos` | Tabela de referência de tipos | — (lookup table) |
| `etapas_funil` | Etapas/colunas dentro de um funil | `id_funil → funis.id` |
| `lista_interesses` | Interesses configuráveis por empresa | `empresa_id`, `funil_id → funis.id` |
| `leads_crm` | Leads no CRM | `id_empresa`, `id_funil`, `id_etapa_atual` |
| `contatos_geral` | Contatos WhatsApp | `empresa_id → empresas_geral.id` |
| `campos_customizados` | Campos extras por funil | `id_empresa`, `id_funil → funis.id` |

### Regra Fundamental

> **IDs não são sincronizados entre empresas.** Cada empresa recebe funis com IDs sequenciais independentes (auto-increment). A vinculação é feita **exclusivamente por foreign keys**, nunca por nome ou convenção.

---

## 2. Tipos de Funil

A tabela `funil_tipos` define os tipos válidos:

| ID (tipo) | Nome | Descrição |
|---|---|---|
| `triagem` | Triagem | Funil de entrada — todos os novos contatos chegam aqui |
| `maquina_gelo` | Máquina de Gelo | Funil de vendas para máquinas de gelo |
| `purificador` | Purificador | Funil de vendas para purificadores |
| `outros` | Outros | Funil genérico para interesses não mapeados |
| `custom` | Personalizado | Tipo padrão para funis criados manualmente |

A coluna `funis.tipo` possui FK para `funil_tipos.id`, garantindo integridade referencial.

---

## 3. Triggers e Ordem de Execução

### Criação de Empresa

Quando um registro é inserido em `empresas_geral`, três triggers executam em ordem alfabética:

```text
INSERT INTO empresas_geral
  │
  ├─ 1. a_criar_funis_padrao()          ← prefixo "a_" garante execução primeiro
  │     Cria 4 funis padrão + etapas
  │
  ├─ 2. inserir_interesses_padrao()     ← executa depois (ordem alfabética)
  │     Cria 3 interesses e vincula funil_id
  │
  └─ 3. criar_convite_inicial()
        Cria convite de acesso
```

#### Trigger: `a_criar_funis_padrao()`

| Funil Criado | Tipo | Etapas |
|---|---|---|
| Sem interesse | `triagem` | Novos, Em atendimento |
| Máquina de Gelo | `maquina_gelo` | Novo, Qualificação, Proposta, Fechamento |
| Purificador | `purificador` | Novo, Qualificação, Proposta, Fechamento |
| Outros interesses | `outros` | Novo, Em atendimento |

#### Trigger: `inserir_interesses_padrao()`

Cria 3 interesses padrão e executa:

```sql
UPDATE lista_interesses
SET funil_id = (SELECT id FROM funis WHERE tipo = nome AND id_empresa = NEW.id)
WHERE empresa_id = NEW.id AND funil_id IS NULL;
```

Matching: `lista_interesses.nome` = `funis.tipo` (ex: `maquina_gelo` → funil com `tipo='maquina_gelo'`)

### Criação de Contato → Lead

```text
INSERT INTO contatos_geral (whatsapp, empresa_id)
  └─ Trigger: trg_criar_lead_apos_contato
       └─ Função: criar_lead_triagem(whatsapp, empresa_id)
```

### Mudança de Interesse → Mover Lead

```text
UPDATE contatos_geral SET interesse = 'maquina_gelo'
  └─ Trigger: mover_lead_por_interesse()
       └─ Consulta lista_interesses.funil_id para roteamento
```

### Características dos Triggers

- Todos usam `SECURITY DEFINER` + `SET search_path = public`
- Isso permite bypass de RLS para operações internas
- Validações incluem checagem de `crm_is_ativo` por empresa
- Proteção contra duplicatas de leads por whatsapp

---

## 4. Fluxos de Roteamento de Leads

### 4.1 Novo Contato WhatsApp → Lead no CRM

```text
INSERT INTO contatos_geral (whatsapp='5511...', empresa_id=42)
  │
  └─ criar_lead_triagem(whatsapp, empresa_id):
       │
       ├─ Verifica: crm_is_ativo = true?
       ├─ Verifica: lead já existe para este whatsapp?
       │
       ├─ SELECT id FROM funis
       │    WHERE tipo = 'triagem' AND id_empresa = 42
       │    → funil_id = 87
       │
       ├─ SELECT id FROM etapas_funil
       │    WHERE id_funil = 87 ORDER BY ordem LIMIT 1
       │    → etapa_id = 201
       │
       └─ INSERT INTO leads_crm (
            id_empresa = 42,
            id_funil = 87,
            id_etapa_atual = 201,
            whatsapp = '5511...',
            nome = nome_lead,
            status = 'aberto'
          )
```

### 4.2 Interesse Identificado → Mover para Funil Específico

```text
UPDATE contatos_geral SET interesse = 'maquina_gelo'
  │
  └─ mover_lead_por_interesse():
       │
       ├─ SELECT funil_id FROM lista_interesses
       │    WHERE nome = 'maquina_gelo' AND empresa_id = 42
       │    → funil_id = 89
       │
       ├─ SELECT id FROM etapas_funil
       │    WHERE id_funil = 89 ORDER BY ordem LIMIT 1
       │    → etapa_id = 210
       │
       └─ UPDATE leads_crm
            SET id_funil = 89,
                id_etapa_atual = 210,
                data_entrada_funil = now()
            WHERE id_contato_geral = OLD.id
```

### 4.3 Resumo dos Lookups

| Operação | Lookup | Tabela |
|---|---|---|
| Lead entra no CRM | `tipo = 'triagem'` + `id_empresa` | `funis` |
| Lead muda de funil | `nome` + `empresa_id` → `funil_id` | `lista_interesses` |
| Primeira etapa | `id_funil` + `ORDER BY ordem LIMIT 1` | `etapas_funil` |

---

## 5. Edge Function: copy-company-config

**Arquivo:** `supabase/functions/copy-company-config/index.ts`

### Propósito

Copia toda a configuração de uma empresa template para uma empresa destino, incluindo funis, etapas, FAQs, labels e interesses.

### Fluxo de Execução

```text
1. Autenticação + verificação de admin (user_permissions.is_admin)
2. Copiar funis (com remapeamento de IDs)
3. Copiar etapas (substituindo defaults do trigger)
4. Copiar FAQs
5. Copiar labels
6. Copiar faq_labels (com remapeamento)
7. Copiar config_empresas_geral
8. Copiar lista_interesses (com remapeamento de funil_id)
```

### Remapeamento de IDs (funilIdRemap)

```typescript
// Empresa fonte: funil id=10 (tipo='maquina_gelo')
// Empresa destino: funil id=87 (tipo='maquina_gelo', criado pelo trigger)
// funilIdRemap = { 10: 87 }

// Ao copiar interesses:
funil_id: i.funil_id ? (funilIdRemap[i.funil_id] ?? null) : null
```

### Lógica de Deduplicação

1. O trigger `a_criar_funis_padrao` já criou funis padrão na empresa destino
2. A edge function verifica funis existentes por `tipo`
3. Se o tipo já existe → reutiliza o ID existente (sem duplicar)
4. Se o tipo não existe → cria novo funil
5. Etapas dos funis existentes são **deletadas e substituídas** pelas da fonte

### Ordem de Cópia (Crítica)

```text
Funis + Etapas → FAQs → Labels → faq_labels → Config → Interesses
         ↑                                                    ↑
    Gera funilIdRemap                              Usa funilIdRemap
```

**Interesses DEVEM ser copiados por último** para que o `funilIdRemap` esteja completo.

---

## 6. Frontend: Criação Automática de Funil

### Página: `src/pages/Triagem.tsx`

Ao adicionar um novo interesse sem selecionar um funil existente:

1. O modal `InterestModal` oferece a opção "🔄 Criar funil automaticamente" (padrão)
2. Se `funil_id = null`, o código do frontend:
   - Cria um novo funil com `tipo = 'custom'` e nome do interesse
   - Cria 4 etapas padrão: Novo, Qualificação, Proposta, Fechamento
   - Associa o `funil_id` ao interesse

### Modal: `src/components/InterestModal.tsx`

```tsx
<Select value={form.funil_id ? String(form.funil_id) : 'auto'}>
  <SelectItem value="auto">🔄 Criar funil automaticamente</SelectItem>
  {funis.map(funil => (
    <SelectItem key={funil.id} value={String(funil.id)}>{funil.nome}</SelectItem>
  ))}
</Select>
```

---

## 7. RLS e Isolamento Multi-Tenant

### Função Helper: `get_empresas_usuario()`

Retorna os IDs de empresas que o usuário autenticado pode acessar via `user_empresa`.

### Políticas por Tabela

| Tabela | Política | Tipo |
|---|---|---|
| `funis` | `id_empresa IN get_empresas_usuario()` | ALL |
| `etapas_funil` | Via join com `funis.id_empresa` | ALL |
| `leads_crm` | `id_empresa IN get_empresas_usuario()` | ALL |
| `lista_interesses` | `empresa_id IN get_empresas_usuario()` | ALL |
| `contatos_geral` | `empresa_id` + `user_empresa` ou `is_admin()` | Per-operation |
| `empresas_geral` | SELECT para membros, CUD apenas para admins | Per-operation |

### Função Helper: `is_admin()`

```sql
-- SECURITY DEFINER para evitar recursão RLS
CREATE FUNCTION is_admin(_uid uuid) RETURNS boolean
  SELECT EXISTS (
    SELECT 1 FROM user_permissions WHERE user_id = _uid AND is_admin = true
  );
```

---

## 8. Limitações Conhecidas (SDR Tables)

### Tabelas SDR Separadas

O sistema possui duas tabelas SDR legadas com estrutura fixa:

- `contatos_sdr_maquinagelo` — campos específicos para máquina de gelo
- `contatos_sdr_purificador` — campos específicos para purificador

### Funções Afetadas

| Função | Limitação |
|---|---|
| `sync_contato_sdr_to_lead_crm()` | Usa `TG_TABLE_NAME` para determinar tipo |
| `update_contato_sdr_field()` | `IF p_interesse = 'purificador'` hardcoded |
| `resetar_lead_completo()` | Deleta de ambas tabelas explicitamente |
| `match_documents_*` | Funções com `tipo_faq` fixo por produto |
| `useLeadRealtime.ts` | Subscribe a ambas tabelas SDR fixas |

### Mitigação Atual

- `useLeadRealtime.ts` usa `campos_extras` (JSON) como fonte primária de dados SDR
- Tabelas SDR são usadas apenas como fallback
- A função genérica `buscar_faq_similar()` já existe como alternativa modular

### Solução Futura

Unificar em uma única tabela `contatos_sdr` com coluna `tipo_interesse`. Requer coordenação com sistemas externos (chatbot/integrações).

---

## 9. Troubleshooting

### Lead não aparece no CRM após contato WhatsApp

1. Verificar se `crm_is_ativo = true` em `config_empresas_geral`
2. Verificar se existe funil com `tipo = 'triagem'` para a empresa
3. Verificar se o funil de triagem tem pelo menos uma etapa
4. Verificar se não existe lead duplicado para o mesmo whatsapp

```sql
-- Diagnóstico
SELECT * FROM funis WHERE id_empresa = X AND tipo = 'triagem';
SELECT * FROM etapas_funil WHERE id_funil = Y ORDER BY ordem;
SELECT * FROM leads_crm WHERE whatsapp = '5511...' AND id_empresa = X;
```

### Lead não move de funil quando interesse é identificado

1. Verificar se o interesse existe em `lista_interesses` para a empresa
2. Verificar se `funil_id` está preenchido (não NULL)
3. Verificar se o funil de destino tem etapas

```sql
-- Diagnóstico
SELECT nome, funil_id FROM lista_interesses WHERE empresa_id = X;
SELECT * FROM etapas_funil WHERE id_funil = Y ORDER BY ordem;
```

### Empresa nova não tem funis

1. Verificar se o trigger `a_criar_funis_padrao` existe e está ativo
2. Verificar se `funil_tipos` contém os tipos padrão
3. Criar manualmente se necessário:

```sql
-- Verificar trigger
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'empresas_geral'::regclass;

-- Verificar tipos
SELECT * FROM funil_tipos;
```

### copy-company-config falha

1. Verificar se o usuário é admin (`user_permissions.is_admin`)
2. Verificar logs da edge function
3. Problemas comuns:
   - Empresa fonte sem funis → nada para copiar
   - Tipo de funil na fonte não existe em `funil_tipos` → FK violation
   - Interesses duplicados no destino → constraint violation (deletados antes da cópia)

---

## Referência Rápida

| Pergunta | Resposta |
|---|---|
| IDs são iguais entre empresas? | **Não.** Auto-increment independente |
| Como empresa se vincula ao funil? | `funis.id_empresa` = FK para `empresas_geral.id` |
| Como interesse sabe qual funil? | `lista_interesses.funil_id` = FK direto para `funis.id` |
| Como lead entra no CRM? | `criar_lead_triagem` busca funil `tipo='triagem'` da empresa |
| Como lead muda de funil? | `mover_lead_por_interesse` consulta `lista_interesses.funil_id` |
| Qual tipo usar para funis manuais? | `custom` (Personalizado) |
| Como garantir ordem dos triggers? | Prefixo alfabético (`a_criar...` < `inserir...`) |
