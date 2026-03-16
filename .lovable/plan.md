
## Audit — Block 1 ✅ (Completed)

1. **Trigger `mover_lead_por_interesse()`** — Rewritten to use `lista_interesses.funil_id` dynamically
2. **Trigger `inserir_interesses_padrao()`** — Now associates `funil_id` after inserting defaults
3. **`GerenciarFaqs.tsx`** — Tabs now dynamic from `lista_interesses`
4. **`copy-company-config`** — Now copies and remaps `funil_id`

## Audit — Block 2 ✅ (Completed)

1. **`useLeadRealtime.ts`** — Refactored to use `campos_extras` as primary SDR data source, SDR tables as fallback only. Removed hardcoded `if interesse === 'purificador'` logic.

### Accepted Architectural Limitations (SDR Tables)

The following items are tied to the separate SDR table architecture (`contatos_sdr_maquinagelo` / `contatos_sdr_purificador`). They function correctly for the two existing products but won't automatically support new product types without schema changes:

- `sync_contato_sdr_to_lead_crm()` — Uses `TG_TABLE_NAME` to determine product type
- `update_contato_sdr_field()` — Uses `IF p_interesse = 'purificador'` to route to correct table
- `resetar_lead_completo()` — Deletes from both SDR tables explicitly
- `match_documents_qualificacao/pos_qualificacao/purificador` — Hardcoded `tipo_faq` filters (generic `buscar_faq_similar()` already exists as modular alternative)
- `useLeadRealtime` SDR realtime channels — Subscribe to both fixed SDR tables

**Future fix**: Unify SDR tables into a single `contatos_sdr` table with a `tipo_interesse` column. This requires coordinating with external chatbot/integration systems.
