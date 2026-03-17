

# Diagnóstico Técnico: AquaSampa (Empresa ID 4)

---

## BLOCO 1 — Diagnóstico Objetivo do Problema

### Estado atual da AquaSampa

**Camada de configuração (existe):**
- 6 interesses cadastrados em `lista_interesses`: `maquina_gelo`, `purificador`, `refil`, `assistencia_tecnica`, `financeiro`, `outros`
- `config_empresas_geral` existe com `crm_is_ativo = true`
- 6 campos customizados padrão existem (Interesse, Cidade, Tipo de Uso, Consumo Mensal, Gasto Mensal, Dias por Semana)
- 34 contatos ativos em `contatos_geral`

**Camada operacional (incompleta):**
- Apenas **2 funis** existem: `Sem interesse` (tipo `triagem`, id=16) e `Teste` (tipo `custom`, id=12)
- **Nenhum dos 6 interesses possui `funil_id` preenchido** — todos são `NULL`
- Leads existentes: 5 (3 ativos no funil triagem, 2 no funil "Teste")
- Nenhum funil para `maquina_gelo`, `purificador`, `refil`, `assistencia_tecnica`, `financeiro` ou `outros`

### Hipótese principal

A AquaSampa (criada em 2025-11-20) foi provisionada **antes** da implementação do trigger `a_criar_funis_padrao` (implementado no Block 3 do audit). Na época, a criação de funis não era automática. Os interesses foram criados manualmente (em 2026-03-01), mas como não existiam funis correspondentes, o campo `funil_id` permaneceu `NULL`. O funil de triagem (id=16) foi criado muito depois (2026-03-16), provavelmente de forma manual ou por uma execução tardia.

### Hipóteses secundárias

1. A edge function `copy-company-config` pode ter sido executada parcialmente — copiou interesses mas falhou na cópia de funis
2. Os interesses foram criados via frontend sem selecionar "criar funil automaticamente" (opção que também pode não existir na época)
3. O trigger `inserir_interesses_padrao` nunca executou porque a empresa já existia quando foi implementado

### Causa raiz vs. sintomas independentes

Os três sintomas (interesses sem funil, ausência de funis de produto, poucos leads) **derivam da mesma causa raiz**: provisionamento incompleto da empresa.
- Interesses sem `funil_id` = consequência direta de funis inexistentes
- Poucos leads = contatos existem (34 ativos), mas o trigger `mover_lead_por_interesse` falha silenciosamente quando `funil_id` é NULL, então leads ficam presos na triagem ou nem são criados
- O funil "Teste" (id=12) com etapas "Teste 1" e "Teste 2" confirma que alguém tentou configurar manualmente

---

## BLOCO 2 — Mapeamento do Fluxo Atual (AS-IS)

```text
FLUXO DE PROVISIONAMENTO (empresas novas, pós-Block 3):

INSERT empresas_geral
  ├─ Trigger a_criar_funis_padrao() → 4 funis + etapas
  ├─ Trigger inserir_interesses_padrao() → 3 interesses + vincula funil_id
  └─ Trigger criar_convite_inicial()

FLUXO DE INTERESSE MANUAL (via frontend):

InterestModal → INSERT lista_interesses
  └─ Se "criar funil automaticamente": cria funil custom + etapas + vincula funil_id
  └─ Se seleciona funil existente: vincula funil_id

FLUXO DE LEAD (contato WhatsApp):

INSERT contatos_geral → Trigger criar_lead_triagem() → lead no funil triagem
UPDATE contatos_geral.interesse → Trigger mover_lead_por_interesse()
  └─ SELECT funil_id FROM lista_interesses WHERE nome = interesse
  └─ Se funil_id IS NULL → NÃO MOVE (silenciosamente ignora)
```

### Onde a AquaSampa quebra

```text
AquaSampa (criada 2025-11-20, ANTES dos triggers automáticos):

1. Empresa criada → NENHUM trigger de funis executou (não existia)
2. Interesses criados manualmente (2026-03-01) → SEM opção de criar funil automático na época
3. Resultado: 6 interesses com funil_id = NULL
4. Funil triagem criado tardiamente (2026-03-16) → leads novos entram
5. Contatos com interesse identificado → mover_lead_por_interesse falha (funil_id NULL)
6. Leads ficam presos na triagem ou não são criados
```

---

## BLOCO 3 — Estado Esperado Correto (TO-BE)

Para uma empresa corretamente configurada:

| Camada | O que deve existir |
|---|---|
| **Interesses** | Cada interesse em `lista_interesses` com `funil_id` NOT NULL apontando para um funil ativo |
| **Funis** | No mínimo: 1 funil triagem (`tipo='triagem'`). Para cada interesse, 1 funil vinculado com etapas ativas |
| **Etapas** | Cada funil com pelo menos 1 etapa ativa, ordenada |
| **Campos customizados** | 6 campos padrão (já existem na AquaSampa) |
| **Config** | `crm_is_ativo = true` (já existe na AquaSampa) |
| **Leads** | Criados automaticamente via trigger quando contatos chegam. Movidos automaticamente quando interesse é identificado |

### Referência: Termall (empresa saudável, id=2)

| Item | Termall | AquaSampa |
|---|---|---|
| Funis | 4 (triagem + 3 de produto) | 2 (triagem + 1 teste) |
| Interesses | 4, todos com `funil_id` preenchido | 6, todos com `funil_id = NULL` |
| Leads ativos | 36 | 3 |
| Etapas por funil | 1-4 etapas configuradas | 2 etapas cada |
| Roteamento funcional | Sim | Não (funil_id NULL) |

---

## BLOCO 4 — Plano de Investigação e Correção em Etapas

### Etapa 1 — Auditoria da configuração (CONCLUÍDA)

**Objetivo:** Mapear tudo que existe para AquaSampa.
**Resultado:** 6 interesses (todos com `funil_id = NULL`), 2 funis (triagem + teste), 34 contatos ativos, 3 leads ativos, config CRM ativa.
**Validação:** Dados coletados acima.

### Etapa 2 — Comparação com empresa saudável (CONCLUÍDA)

**Objetivo:** Identificar gaps entre AquaSampa e Termall.
**Resultado:** AquaSampa falta funis de produto e vinculação de interesses. Termall tem 4 funis, todos interesses vinculados.
**Validação:** Tabela comparativa acima.

### Etapa 3 — Definição dos funis necessários

**Objetivo:** Determinar quais funis criar para os 6 interesses da AquaSampa.
**O que será verificado:** Mapear cada interesse a um funil novo ou existente.
**Proposta:**

| Interesse | Ação | Tipo funil | Etapas sugeridas |
|---|---|---|---|
| `maquina_gelo` | Criar funil | `custom` | Novo, Qualificação, Proposta, Fechamento |
| `purificador` | Criar funil | `custom` | Novo, Qualificação, Proposta, Fechamento |
| `refil` | Criar funil | `custom` | Novo, Em atendimento |
| `assistencia_tecnica` | Criar funil | `custom` | Novo, Em atendimento |
| `financeiro` | Criar funil | `custom` | Novo, Em atendimento |
| `outros` | Criar funil | `custom` | Novo, Em atendimento |

**Risco:** Baixo. Apenas insere novos registros.
**Validação:** `SELECT COUNT(*) FROM funis WHERE id_empresa = 4` deve retornar 8 (2 existentes + 6 novos).

### Etapa 4 — Criar funis e etapas via migration

**Objetivo:** Inserir os 6 funis com suas respectivas etapas.
**Tabelas impactadas:** `funis`, `etapas_funil`
**Risco:** Baixo. INSERT only, não altera dados existentes.
**Validação:** Cada funil tem etapas com `ativo = true` e `ordem` sequencial.

### Etapa 5 — Vincular interesses aos funis

**Objetivo:** Atualizar `lista_interesses.funil_id` para cada interesse.
**Tabelas impactadas:** `lista_interesses`
**Risco:** Médio. O `funil_id` passará de NULL para um valor real, ativando o roteamento automático de leads. Isso significa que contatos que tiverem interesse atualizado passarão a mover leads automaticamente.
**Validação:** `SELECT nome, funil_id FROM lista_interesses WHERE empresa_id = 4` — nenhum `funil_id` deve ser NULL.

### Etapa 6 — Validação pós-correção

**Objetivo:** Confirmar integridade end-to-end.
**Verificações:**
1. Todos os interesses possuem `funil_id` NOT NULL
2. Todos os funis vinculados possuem pelo menos 1 etapa ativa
3. O funil de triagem continua funcional
4. Leads existentes não foram afetados (permanecem nos funis atuais)
5. Novos contatos com interesse identificado seriam roteados corretamente

**Risco:** Nenhum — apenas leitura.

---

## BLOCO 5 — Critérios de Aceite

1. Os 6 interesses da AquaSampa possuem `funil_id` NOT NULL apontando para funis ativos
2. Existem 8 funis ativos para a empresa (2 existentes + 6 novos)
3. Cada funil novo possui pelo menos 2 etapas ativas e ordenadas
4. O funil de triagem (id=16) permanece inalterado
5. Os 3 leads ativos existentes permanecem em seus funis atuais sem alteração
6. O trigger `mover_lead_por_interesse` passa a funcionar corretamente para a AquaSampa (testável com UPDATE em `contatos_geral.interesse`)
7. A ausência de mais leads é confirmada como consequência da falta de funis (não um bug separado) — os 34 contatos ativos que não geraram leads podem ser investigados separadamente

---

## BLOCO 6 — Recomendação Final

**Recomendação: Correção intermediária**

**Justificativa:**

1. **Ajuste pontual** (apenas criar funis para AquaSampa) resolveria o caso imediato, mas não previne reincidência. Se outra empresa antiga existir sem funis, o problema se repete.

2. **Correção intermediária** (o que recomendo):
   - Criar funis + vincular interesses para AquaSampa via migration
   - Adicionar uma query de auditoria que verifica TODAS as empresas ativas por interesses com `funil_id = NULL`
   - Isso resolve o caso atual e identifica se outras empresas têm o mesmo gap

3. **Correção estrutural** (adicionar constraint NOT NULL em `lista_interesses.funil_id`) seria ideal a longo prazo, mas requer que o frontend sempre crie funis ao criar interesses — o que já foi implementado no Block 3 do audit. Porém, dados legados impediriam a constraint sem cleanup prévio de todas as empresas.

**Risco de reincidência:** Baixo para empresas novas (trigger `a_criar_funis_padrao` existe). Alto para empresas criadas antes do trigger que nunca foram corrigidas. A auditoria cross-empresa é essencial.

**Próximo passo recomendado:** Executar `SELECT empresa_id, nome, funil_id FROM lista_interesses WHERE funil_id IS NULL AND empresa_id IN (SELECT id FROM empresas_geral WHERE ativo = true)` para identificar o escopo total do problema antes de corrigir apenas a AquaSampa.

