

# Block 1 — Critical Fixes: Trigger `mover_lead_por_interesse` + Trigger `inserir_interesses_padrao` + FAQs Dinamicas

This block addresses the 3 most critical hardcoded issues that break multi-tenancy.

---

## 1. Rewrite `mover_lead_por_interesse()` trigger function

**Problem**: Hardcoded IF/ELSE for `maquina_gelo`, `purificador`, else `outros`. Custom interests always go to the wrong funnel.

**Fix**: Replace the entire function body to use `lista_interesses.funil_id` for dynamic routing:

```sql
-- Instead of IF v_interesse = 'maquina_gelo' THEN SELECT FROM funis WHERE tipo = ...
-- Do:
SELECT funil_id INTO v_novo_funil_id
FROM lista_interesses
WHERE nome = v_interesse
  AND empresa_id = v_empresa_id
  AND ativo = true
LIMIT 1;
```

Also update the "already in correct funnel" check: instead of comparing tipo strings, compare the current `id_funil` with the target `funil_id` directly.

---

## 2. Update `inserir_interesses_padrao()` trigger function

**Problem**: Inserts default interests without `funil_id`, so automatic routing doesn't work for new companies.

**Fix**: After inserting interests, update each one's `funil_id` by matching `funis.tipo` to the interest `nome` for the same company. This assumes the default funnel creation trigger runs before or alongside this one.

```sql
-- After INSERT INTO lista_interesses:
UPDATE lista_interesses li
SET funil_id = f.id
FROM funis f
WHERE li.empresa_id = NEW.id
  AND f.id_empresa = NEW.id
  AND f.tipo = li.nome
  AND f.ativo = true
  AND li.funil_id IS NULL;
```

---

## 3. Make `GerenciarFaqs.tsx` tabs dynamic

**Problem**: `TABS` constant is hardcoded to `maquina_gelo` and `purificador`. Companies with other interests can't manage FAQs properly.

**Fix**:
- Remove the hardcoded `TABS` constant
- Fetch active interests from `lista_interesses` for the company
- Generate tabs dynamically from interests
- Map `tipo_faq` values: for the first interest use its existing `tipoFaqs` mapping if it matches legacy names, otherwise use the interest `nome` as `tipo_faq`
- When creating a new FAQ, set `tipo_faq` to the interest name of the active tab

**Compatibility note**: Existing FAQs with `tipo_faq = 'geral_maquina'`, `'qualificacao_maquina'`, `'pos_qualificacao_maquina'` must still appear under the `maquina_gelo` interest tab. A mapping function handles this.

---

## 4. Update `copy-company-config` edge function

**Problem**: Does not copy `funil_id` when copying interests between companies.

**Fix**: After copying interests and (if applicable) funis, remap `funil_id` by matching funnel names between source and target company.

---

## Summary of changes

| Item | Type | File/Location |
|------|------|---------------|
| `mover_lead_por_interesse()` | DB Migration | SQL migration |
| `inserir_interesses_padrao()` | DB Migration | SQL migration |
| FAQ tabs dynamic | Frontend | `src/pages/GerenciarFaqs.tsx` |
| Copy funil_id | Edge Function | `supabase/functions/copy-company-config/index.ts` |

