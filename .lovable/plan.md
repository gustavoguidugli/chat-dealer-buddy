

# Audit: Eco Ice (API Oficial) - Empresa ID 25

## Current Status

The diagnostic function reports `ok: true`, but deeper inspection reveals several issues that would impact the chatbot and CRM functionality.

## Issues Found

### 1. Triagem funnel missing "Novos" stage (CRITICAL)
The triagem funnel (ID 25) has only **1 active etapa** ("Descobrir interesse" at ordem 2). The two original etapas ("Ver problema", "Teste") are inactive. The standard pattern requires at least "Novos" as the first stage — without it, new leads enter directly at "Descobrir interesse", skipping the initial triage step.

**Fix**: Add a "Novos" etapa at ordem 0 for funil 25.

### 2. Documents/embeddings table is empty (CRITICAL for AI)
FAQs exist in `config_empresas_geral`:
- `faq_qualificacao_maquina`: 10,289 chars
- `faq_pos_qualificacao_maquina`: 9,308 chars
- `faq_purificador`: 16,361 chars
- `faq_geral_maquina`: **EMPTY** (0 chars)

But the `documents` table has **0 records** for empresa 25, and `faq_empresa` also has **0 records**. This means the AI chatbot **cannot perform semantic search** for this company — FAQs were configured but never vectorized.

**Fix**: Trigger the `gerar-embedding` edge function or `vetorizar_faq_texto` to process the existing FAQ content. Also flag that `faq_geral_maquina` is missing.

### 3. Lead 237 has empty `campos_extras` (MINOR)
The only lead (whatsapp `5543996971234`) is in the maquina_gelo funnel but has `campos_extras: {}`. No SDR record exists for this whatsapp in `contatos_sdr_maquinagelo`. This means the contact went through interest identification but the chatbot didn't complete qualification (no SDR data was collected). This is **expected behavior** — no data to sync.

### 4. Duplicate inactive campos_customizados (COSMETIC)
18 total records exist but only 6 are active. The 12 inactive ones are leftovers from previous copy-company-config operations. Not breaking, but clutters the database.

**Fix**: Delete inactive duplicates.

### 5. Missing `faq_geral_maquina` content
This FAQ field is empty (0 chars) while the other three have content. If the chatbot expects general FAQ data, it won't find any.

**Fix**: Needs content from the user/template company.

## What's Working Correctly

| Component | Status |
|-----------|--------|
| 4 funis (triagem, maquina_gelo, purificador, outros) | OK |
| 3 interesses with funil_id mapped | OK |
| 6 global campos_customizados (active) | OK |
| 3 temperature etiquetas | OK |
| 5 activity icons | OK |
| CRM enabled (`crm_is_ativo: true`) | OK |
| Triagem enabled (`triagem_is_ativo: true`) | OK |
| 2 users linked (admin + member) | OK |
| `config_empresas_geral` record exists | OK |

## Execution Plan

### Step 1: Add "Novos" etapa to triagem funnel
SQL migration to insert a "Novos" etapa at ordem 0 for funil 25, and adjust existing "Descobrir interesse" to ordem 1.

### Step 2: Clean up duplicate inactive campos
Delete the 12 inactive `campos_customizados` records for empresa 25.

### Step 3: Vectorize existing FAQs
Call the `gerar-embedding` edge function or use `vetorizar_faq_texto` to process the 3 existing FAQ texts into the `documents` table so the chatbot can use them.

### Step 4: Flag missing `faq_geral_maquina`
Inform the user that this FAQ section is empty and needs content — cannot be auto-generated.

### Technical Details

```sql
-- Step 1: Add Novos etapa
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo)
VALUES (25, 'Novos', 0, true);

UPDATE etapas_funil SET ordem = 1 WHERE id = 74; -- Descobrir interesse

-- Step 2: Clean duplicates
DELETE FROM campos_customizados
WHERE id_empresa = 25 AND ativo = false;
```

Step 3 requires invoking the edge function `gerar-embedding` with each FAQ text block, or calling `vetorizar_faq_texto` RPC for each tipo. This will populate the `documents` table with embeddings.

