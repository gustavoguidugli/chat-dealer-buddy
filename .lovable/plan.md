

# Plan: Fix 3 Dashboard Issues

## Correction 1 — "Leads por etapa" chart with multiple funnels

**Problem**: When "Todos os funis" is selected, stages from different funnels overlap with duplicate names.

**Changes in `useDashboardData.ts`**:
- Modify `useLeadsByEtapa` to also return `funilNome` and `funilId` per etapa
- Add a new hook `useLeadsByFunilAgrupado` that returns `{ nome: string; cor: string; total: number; id: number }[]` — total active leads grouped by funil (for the multi-funil view)

**Changes in `CrmDashboards.tsx`**:
- When `appliedFilters.funilIds.length !== 1` (i.e., all funnels or 2+):
  - Show a vertical bar chart grouped by **funil name** instead of etapas
  - Each bar = total active leads in that funil, colored by `funis.cor`
  - On bar click → update `pendingFunilIds` to that funil and auto-apply filters
  - Show helper text below: "Selecione um funil específico no filtro para ver a distribuição por etapa."
- When exactly 1 funil is selected → keep current horizontal bar chart by etapa (existing behavior)
- Apply same logic to the "Funil de conversão" chart in Section 2

## Correction 2 — "Leads por etiqueta" query fix

**Changes in `useDashboardData.ts` → `useLeadsByEtiqueta`**:
- Remove date filtering (`data_criacao BETWEEN`) from the leads query
- Add `.eq('ativo', true)` filter on leads
- Keep only funil and agent filters
- This ensures etiquetas show for all active leads, not just those created in the period

## Correction 3 — Colors in charts

**Changes in `CrmDashboards.tsx`**:
- **Etapa charts**: Already using `e.cor` via `<Cell>` — this is correct. The `useLeadsByEtapa` hook already returns `cor` from `etapas_funil.cor`. No change needed here (already working with `{leadsByEtapa.map((e, i) => <Cell key={i} fill={e.cor} />)}`).
- **"Motivos de perda" donut**: Replace `DONUT_COLORS` with a dedicated `MOTIVOS_COLORS` palette: `['#E24B4A', '#BA7517', '#378ADD', '#1D9E75', '#7F77DD', '#D85A30', '#888780']`
- **"Leads por funil" donut**: Already uses `f.cor` from `funis.cor` — no change needed.

