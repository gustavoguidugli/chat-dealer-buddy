

# Plan: Systematic Codebase Fixes (4 Stages)

After validating every claim against the actual code, here is the corrected and confirmed plan. One item from the original was **invalid** (1B) and is removed.

---

## Stage 1 — Security and Critical Data

### 1A — Centralize superadmin emails (4 files, not 5)

Validated: hardcoded in `AuthContext.tsx`, `ManageUsersModal.tsx`, `ConfigUsuarios.tsx`, and `manage-users/index.ts`. `AdminEmpresasTab.tsx` does NOT contain them.

- Create `src/lib/constants.ts` with `SUPER_ADMIN_EMAILS` array and `isSuperAdmin()` helper
- Replace in the 3 frontend files. The edge function keeps its own copy (runs in Deno, cannot import from src)

### ~~1B — ConviteData interface~~ REMOVED

Investigation confirmed the RPC `validar_convite` returns columns named exactly `valido, empresa_id, id, erro, email_destino, role` — matching the TypeScript interface perfectly. No bug here.

### 1C — Delete empresa cascade incomplete

Validated: `DeleteEmpresaModal.tsx` only deletes 4 tables before the empresa. Must add deletes for: `lead_etiquetas`, `anotacoes_lead`, `historico_lead`, `atividades`, `leads_crm`, `etiquetas_card`, `motivos_perda`, `icones_atividades`, `campos_customizados`, `etapas_funil`, `funis`, `lista_interesses`, `faqs`, `convites`, `user_empresa` — in FK-safe order before the final `empresas_geral` delete.

---

## Stage 2 — Realtime Stability

### 2A — SDR realtime channels missing empresa filter

Validated: channels 7 and 8 in `useLeadRealtime.ts` (lines 345-377) subscribe to `contatos_sdr_maquinagelo` and `contatos_sdr_purificador` without any filter. However, since SDR `id_empresa` references a different ID system, we cannot filter by `empresaId`. The current whatsapp-matching guard is actually correct. **Downgraded to optional** — adding a filter would require mapping empresa IDs.

### 2B — Mutable `let` variables in realtime closures

Validated: `contatoGeralId` and `contatoWhatsapp` (line 34-35) are `let` inside the useEffect. Convert to `useRef` for safety across async callbacks.

### 2C — `enrichLeads` re-fetches all leads on every event

Validated: `CrmFunil.tsx` lines 165-226 — every realtime event triggers enrichment of ALL leads. Refactor to enrich only the changed lead when the trigger is a single-lead realtime event.

---

## Stage 3 — Error Recovery

### 3A — ErrorBoundary for critical CRM components

Create `src/components/ui/ErrorBoundary.tsx` and wrap `CrmFunil`, `LeadDrawer`, `KanbanBoard`.

### 3B — localStorage empresa validation

In `AuthContext.tsx`, after reading `eco_empresa_id` from localStorage, validate it exists in the user's `user_empresa` mappings. If not, clear it and show a toast.

---

## Stage 4 — Cleanup

### 4A — Enhance AdminDiagnosticoTab

Add checks for: funnel stages missing, interests without `funil_id`, and missing global fields. Use the existing `diagnostico_setup_empresas` RPC if available.

### 4B — Fix toast delay

Change `TOAST_REMOVE_DELAY` from `1000000` to `4000` in `src/hooks/use-toast.ts`.

### 4C — Delete unused Index.tsx

Remove `src/pages/Index.tsx`. Confirmed no imports reference it.

### 4D — Refactor LeadDrawer (2068 lines)

Split into `LeadDrawerHeader`, `LeadDrawerFields`, `LeadDrawerTimeline` sub-components.

---

## Execution Order

Each stage is independent. Within a stage, items are done sequentially. We start with **Stage 1, item 1A**.

