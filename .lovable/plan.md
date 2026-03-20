

# Stage 3 — Error Recovery (Items 3A and 3B)

## Item 3A — ErrorBoundary for Critical CRM Components

**Create** `src/components/ui/ErrorBoundary.tsx`:
- Class component with `componentDidCatch` and `getDerivedStateFromError`
- Default fallback: card with "Algo deu errado nesta seção" message and "Recarregar página" button (`window.location.reload()`)
- Accept optional `fallback?: ReactNode` prop to override default UI

**Wrap in 3 places:**

1. **`src/pages/CrmFunil.tsx`** (~line 618): wrap `<KanbanBoard ... />` with `<ErrorBoundary>`
2. **`src/components/crm/LeadDrawer.tsx`** (~line 800): wrap the `<SheetContent>` children (inside the Sheet) with `<ErrorBoundary>`
3. **`src/pages/CrmFunil.tsx`** (~line 635 area): wrap the `<LeadDrawer>` usage with `<ErrorBoundary>` (or if LeadDrawer is rendered inside CrmFunil, wrap it there)

No logic changes — wrapper only.

---

## Item 3B — Validate localStorage empresa in AuthContext

**File**: `src/contexts/AuthContext.tsx`, lines 86-96

Current behavior: reads `eco_empresa_id`, finds it in mappings via `find()`, falls back to `mappings[0]` silently.

**Change**: When `savedId` exists but `preferred` is null (not found in mappings), add:
- `localStorage.removeItem('eco_empresa_id')` and `localStorage.removeItem('eco_empresa_nome')`
- After setting state, show a toast: "Seu acesso à empresa anterior foi removido"
- Still fall back to `mappings[0]` (current behavior preserved)

This requires importing `toast` from `@/hooks/use-toast` (the standalone function, not the hook — since this runs outside a component render).

---

## Execution
Item 3A first, then 3B after confirmation.

