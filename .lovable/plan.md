

# Stage 4 — Cleanup (Items 4A, 4B, 4C, 4D)

## Item 4A — Add RPC diagnostics section to AdminDiagnosticoTab

**File**: `src/components/admin/AdminDiagnosticoTab.tsx`

Add a new section below the existing health-check table that calls `supabase.rpc('diagnostico_setup_empresas')` and displays the results. The RPC already exists and returns typed data (empresa_id, empresa_nome, ok, funil booleans, numeric counts, problemas string array).

Changes:
- Add new state: `setupRows` for RPC results, `loadingSetup` boolean
- Add `fetchSetup` callback that calls `supabase.rpc('diagnostico_setup_empresas')`
- Call `fetchSetup` on mount alongside existing `fetch`
- Render a second table section titled "Diagnóstico de Setup" with columns: Empresa, Status (green "OK" / red "Incompleto" badge), Problemas (comma-separated red text or "-")
- Add its own "Atualizar" button

---

## Item 4B — Fix toast delay

**File**: `src/hooks/use-toast.ts`, line 6

Change `TOAST_REMOVE_DELAY = 1000000` to `TOAST_REMOVE_DELAY = 4000`.

One line.

---

## Item 4C — Delete unused Index.tsx

**File**: `src/pages/Index.tsx`

Confirmed no imports reference this file. Delete it.

---

## Item 4D — Refactor LeadDrawer into 3 sub-components

The 2071-line `LeadDrawer.tsx` will be split into:

### Structure analysis (from reading the file):
- **Lines 807-1006**: Header section (name, etiquetas, funil/etapa selector, proprietario, ganho/perdido buttons, progress bar)
- **Lines 1008-1421**: Left sidebar with fields (telefone, valor, campos customizados collapsible)
- **Lines 1423-1776**: Center area with tabs (anotacoes tab with notes input + history, atividade tab)

### New files:

1. **`src/components/crm/LeadDrawerHeader.tsx`**
   - Receives: `lead`, `etapas`, `funilNome`, `allFunis`, `proprietarios`, `onLeadChanged`, and state setters for dialogs (ganho, perdido, reabrir, duplicar, excluir)
   - Contains: `EditableLeadName` (moved here), name row, etiqueta selector, funil/etapa popover, owner popover, ganho/perdido/reabrir buttons, dropdown menu, progress bar
   - All handler functions that belong to this section move here (handleOpenFunilEtapaPopover, handleTempFunilChange, handleSaveFunilEtapa, handleChangeProprietario)

2. **`src/components/crm/LeadDrawerFields.tsx`**
   - Receives: `lead`, `campos`, `dadosContato`, `listaInteresses`, `onLeadChanged`, `empresaId`
   - Contains: telefone field, valor field, campos collapsible with custom fields, manage/add field popovers
   - All handler functions for fields move here (handleAddField, handleUpdateField, handleDeleteField, handleSaveAllFields, field drag, SortableFieldItem)

3. **`src/components/crm/LeadDrawerTimeline.tsx`**
   - Receives: `lead`, `anotacoes`, `atividades`, `historico`, `realtimeAnexos`, `proprietarios`, `empresaId`, `onLeadChanged`
   - Contains: Tabs component with anotacoes tab (input, file upload, pending activities, history with filter) and atividade tab
   - All handler functions for notes/activities move here (handleSalvarAnotacao, handlePreviewFile, etc.)

### LeadDrawer.tsx becomes:
- Container with Sheet/SheetContent, ErrorBoundary, loading state
- Imports and renders `<LeadDrawerHeader>`, `<LeadDrawerFields>`, `<LeadDrawerTimeline>`
- Keeps the AlertDialog modals (ganho, perdido, reabrir, excluir, duplicar, etc.) since they depend on state shared across sections
- Keeps the `useLeadRealtime` hook, `fetchMeta`, and shared state management

No behavioral changes — purely structural reorganization.

---

## Execution order

4A first. Wait for confirmation. Then 4B, 4C, 4D sequentially.

