

# Plan: Fix Lead Data Display Across All Companies

## Problem Summary

Three issues prevent lead fields from displaying correctly:

1. **Trigger `sync_contato_sdr_to_lead_crm` still has empresa ID mismatch** — it uses `NEW.id_empresa` from SDR tables to filter `leads_crm`, but SDR tables use a different ID system than `empresas_geral`. This causes new SDR data to never sync into `campos_extras`.

2. **Stale state bug in `useLeadRealtime.ts`** — `fetchContatoData` reads `lead?.campos_extras` from React state, but when called from `fetchData`, `setLead(leadData)` hasn't been applied yet, so `lead` is still `null` and `campos_extras` defaults to `{}`.

3. **2 leads (empresa 1) have SDR data but empty `campos_extras`** — caused by the trigger mismatch. Need backfill.

## Current Data State

| Company | Leads WITH extras | Leads WITHOUT extras | Missing SDR data to backfill |
|---------|-------------------|----------------------|------------------------------|
| Empresa 1 | 2 | 4 | 2 (SDR exists, cross-empresa) |
| Empresa 2 (Termall) | 13 | 65 | 0 (genuinely unqualified) |
| Empresa 4 (AquaSampa) | 10 | 2 | 0 (genuinely unqualified) |

## Execution Plan

### Step 1: Fix stale state bug in `useLeadRealtime.ts`

Pass `leadData` directly to `fetchContatoData` instead of reading from stale `lead` state. Change `fetchContatoData` to accept an optional `leadCamposExtras` parameter and use that on initial load.

**File**: `src/hooks/useLeadRealtime.ts`

### Step 2: Fix trigger `sync_contato_sdr_to_lead_crm`

Remove the `l.id_empresa = v_empresa_id` filter and instead match leads by whatsapp through `contatos_geral` only (which already ensures same-company scope via `empresa_id`). This way the trigger works regardless of SDR empresa ID.

**Migration SQL**: `CREATE OR REPLACE FUNCTION` with corrected WHERE clause.

### Step 3: Backfill `campos_extras` for existing leads

Run a one-time UPDATE to populate `campos_extras` for the 2 leads (IDs 106, 126) that have SDR data but empty `campos_extras`.

**Data operation via insert tool**.

### Technical Details

**useLeadRealtime fix** (Step 1):
```typescript
// Change fetchContatoData signature to accept leadData
async function fetchContatoData(idContatoGeral, whatsapp, interesse?, leadData?) {
  // Use passed leadData instead of stale state
  const camposExtras = leadData?.campos_extras ?? lead?.campos_extras ?? {}
}

// In fetchData, pass leadData
await fetchContatoData(contatoGeralId, contatoWhatsapp, undefined, leadData)
```

**Trigger fix** (Step 2):
```sql
-- Remove empresa filter, rely on contatos_geral.whatsapp match
SELECT l.id, c.interesse, c.whatsapp_padrao_pipedrive
FROM leads_crm l
INNER JOIN contatos_geral c ON c.id = l.id_contato_geral
WHERE c.whatsapp = NEW.whatsapp
AND l.ativo = true
LIMIT 1;
```

**Backfill** (Step 3):
```sql
UPDATE leads_crm SET campos_extras = jsonb_build_object(...)
WHERE id IN (106, 126);
```

