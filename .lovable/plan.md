

## Problema

Existem dois pontos de falha onde leads podem ficar sem funil:

1. **Novas empresas**: O trigger `inserir_interesses_padrao` cria interesses mas depende de funis já existirem — porém **nenhum trigger cria funis automaticamente**. A `copy-company-config` também não copia funis da empresa template.

2. **Novos interesses criados manualmente**: O usuário precisa selecionar um funil existente. Se não existir um funil adequado, o interesse fica sem destino.

## Solução

Atacar nos dois pontos: criação de empresa e criação de interesse.

### 1. Novo trigger no banco: `criar_funis_padrao()` — executado ANTES do `inserir_interesses_padrao`

Trigger `AFTER INSERT ON empresas_geral` que cria automaticamente os funis padrão com etapas:

- **Sem interesse** (`tipo = 'triagem'`) — etapas: Novos, Em atendimento
- **Máquina de Gelo** (`tipo = 'maquina_gelo'`) — etapas: Novo, Qualificação, Proposta, Fechamento
- **Purificador** (`tipo = 'purificador'`) — etapas: Novo, Qualificação, Proposta, Fechamento
- **Outros interesses** (`tipo = 'outros'`) — etapas: Novo, Em atendimento

Isso garante que quando `inserir_interesses_padrao` rodar, os funis já existem e o `UPDATE ... SET funil_id` funciona.

### 2. Atualizar `copy-company-config` para copiar funis + etapas

A edge function precisa copiar a tabela `funis` e `etapas_funil` da empresa template para a nova empresa **antes** de copiar interesses, permitindo o remapeamento correto de `funil_id`.

### 3. Criação automática de funil ao criar novo interesse (frontend)

No `handleSaveInterest` da página Triagem (`src/pages/Triagem.tsx`), ao criar um **novo** interesse:
- Remover o campo obrigatório de seleção de funil do `InterestModal`
- Criar automaticamente um funil com o nome do interesse (label) e etapas padrão (Novo, Qualificação, Proposta, Fechamento)
- Vincular o `funil_id` automaticamente ao interesse criado

No `InterestModal`, o campo "Funil de destino" passa a ser **opcional e pré-preenchido** — mostra o nome do funil que será criado automaticamente, mas permite trocar para um existente.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/new.sql` | Criar função `criar_funis_padrao()` + trigger AFTER INSERT ON `empresas_geral` |
| `supabase/functions/copy-company-config/index.ts` | Adicionar cópia de `funis` + `etapas_funil` antes dos interesses |
| `src/pages/Triagem.tsx` | No `handleSaveInterest`, criar funil automaticamente se nenhum for selecionado |
| `src/components/InterestModal.tsx` | Tornar campo funil opcional, com indicação de criação automática |

### Ordem de execução dos triggers para nova empresa

```text
INSERT INTO empresas_geral
  → criar_funis_padrao()        -- cria funis + etapas
  → inserir_interesses_padrao() -- cria interesses + vincula funil_id
  → criar_convite_inicial()     -- cria convite
```

A ordem é garantida pela nomenclatura alfabética dos triggers (`criar_f...` < `inserir_i...`).

