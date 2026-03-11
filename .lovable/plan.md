

# Diagnóstico de Triggers do CRM

## Triggers Ativos Encontrados

| Tabela | Trigger | Evento | Timing |
|--------|---------|--------|--------|
| contatos_geral | trg_criar_lead_apos_contato | INSERT | AFTER |
| contatos_geral | trigger_mover_lead_interesse | INSERT, UPDATE | AFTER |
| contatos_sdr_maquinagelo | trg_avancar_lead_qualificado | UPDATE | AFTER |
| contatos_sdr_maquinagelo | trigger_sync_maquina_to_crm | INSERT, UPDATE | AFTER |
| contatos_sdr_purificador | trigger_sync_purificador_to_crm | INSERT, UPDATE | AFTER |
| leads_crm | trigger_criar_followup | INSERT | AFTER |
| leads_crm | trigger_historico_lead_criado | INSERT | AFTER |
| leads_crm | trigger_historico_mudanca_etapa | UPDATE | BEFORE |
| leads_crm | trigger_historico_status | UPDATE | AFTER |
| anotacoes_lead | trigger_historico_anotacao | INSERT | AFTER |

---

## BUG 1 — CRÍTICO: `criar_lead_triagem` ignora `id_empresa` na checagem de duplicata

A função verifica se já existe lead ativo com o mesmo WhatsApp, mas **sem filtrar por empresa**:

```sql
SELECT id INTO v_lead_id FROM leads_crm 
WHERE whatsapp = p_whatsapp AND ativo = true LIMIT 1;
-- FALTA: AND id_empresa = p_id_empresa
```

**Impacto**: Se o mesmo número de WhatsApp mandar mensagem para duas empresas diferentes, apenas a primeira receberá o lead. A segunda empresa será silenciosamente ignorada.

**Correção**: Adicionar `AND id_empresa = p_id_empresa` na query.

---

## BUG 2 — CRÍTICO: `avancar_lead_qualificado` ignora `id_empresa`

Mesmo problema:

```sql
SELECT l.id, l.id_funil, l.id_etapa_atual, e.ordem INTO v_lead
FROM leads_crm l ...
WHERE l.whatsapp = NEW.whatsapp AND l.ativo = true LIMIT 1;
-- FALTA: AND l.id_empresa = NEW.id_empresa
```

**Impacto**: Poderia avançar o lead da empresa errada.

---

## BUG 3 — MÉDIO: Atividade follow-up criada sem responsável

`criar_atividade_followup_automatica` usa `NEW.proprietario_id`, mas leads criados via `criar_lead_triagem` **não definem `proprietario_id`**. Resultado: atividade de follow-up com `atribuida_a = NULL` e `created_by = NULL`.

---

## BUG 4 — MÉDIO: Replica Identity DEFAULT em tabelas com realtime filtrado

Apenas `atividades` tem REPLICA IDENTITY FULL. As demais tabelas usam DEFAULT:

- `leads_crm` — DEFAULT
- `anotacoes_lead` — DEFAULT
- `historico_lead` — DEFAULT
- `anexos_anotacao` — DEFAULT
- `contatos_geral` — DEFAULT
- `lead_etiquetas` — DEFAULT

**Impacto**: Eventos `DELETE` no realtime não incluem colunas como `id_empresa`, fazendo com que o filtro do Supabase Channel descarte esses eventos silenciosamente. Deletes de anotações, histórico, anexos e etiquetas não atualizam a UI em tempo real.

---

## BUG 5 — BAIXO: 7 leads órfãos sem `id_contato_geral`

Existem 7 leads ativos sem vínculo com `contatos_geral` (IDs: 2, 3, 7, 13, 14, 34, 48). Provavelmente criados manualmente antes do trigger existir. Não é um bug de trigger, mas dados inconsistentes.

---

## BUG 6 — BAIXO: `sync_contato_sdr_to_lead_crm` sobrescreve `campos_extras`

A função usa `jsonb_build_object(...)` que substitui completamente o campo `campos_extras`, perdendo qualquer dado previamente armazenado nele.

---

## Plano de Correção

**Migration SQL com todas as correções:**

1. Recriar `criar_lead_triagem` com filtro `id_empresa` na checagem de duplicata
2. Recriar `avancar_lead_qualificado` com filtro `id_empresa`
3. Definir REPLICA IDENTITY FULL em: `leads_crm`, `anotacoes_lead`, `historico_lead`, `anexos_anotacao`, `contatos_geral`, `lead_etiquetas`
4. (Opcional) Corrigir `sync_contato_sdr_to_lead_crm` para usar `||` ao invés de sobrescrever `campos_extras`

Nenhuma mudança no frontend necessária.

