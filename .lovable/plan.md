

# Stage 5 — Remaining Cleanup Items

## Status Check

Items **already completed** in previous stages:
- **L13** (Toast delay) — already 4000ms
- **L14** (Remove Index.tsx) — already deleted
- **L15** (/reset-password) — page already exists and works
- **L12** (Kanban enrichLeads pontual) — `enrichSingleLead` already implemented and used for etiqueta/atividade changes; `enrichAllLeads` still runs on every lead change but this is the correct behavior since lead-level changes (new leads, status changes) require full re-mapping

Items **still to do**: L6, L7, L8, L9, L10, L11

---

## L6 — CreateCompanyModal: use is_template + motivos_copied

**File**: `src/components/CreateCompanyModal.tsx`

1. Change template query (lines 76-81): replace `.neq('id', empresa.id).order('id', { ascending: true })` with `.eq('is_template', true)` to find the designated template company
2. Update toast description (line 104): add `${r.motivos_copied || 0} motivos` to the copied items string

**File**: `supabase/functions/copy-company-config/index.ts`

3. Add `motivos_copied: 0` to the `results` object (line 74-83)
4. Add a new section (after interests, before the response) that copies `motivos_perda` from source to target company, deduplicating by nome

---

## L7 — AuthContext: validate superadmin empresa via DB

**File**: `src/contexts/AuthContext.tsx`, lines 62-73

Currently superadmin trusts `localStorage` blindly without verifying the empresa exists in DB.

Change: when `savedId` exists, query `empresas_geral` to confirm the empresa exists before using it. If not found, clear localStorage and leave `empresaId` as null (superadmin will be redirected to company selector).

---

## L8 — Onboarding: ConviteData field issue

After reviewing the code, the `ConviteData` interface and its usage look correct — `id` maps to the RPC's UUID `id` field. However, the `role` field from the RPC returns values like `'member'` which the edge function already handles by mapping to `'user'`. No code change needed here.

**If the user has a specific field bug in mind**, clarification is needed. Otherwise this item is already correct.

---

## L9 — DeleteEmpresaModal: update warning text

**File**: `src/components/DeleteEmpresaModal.tsx`

Update the bullet list (lines 80-86) to be more comprehensive, reflecting the actual tables deleted by `delete_empresa_completa` RPC (~26 tables). Add items like:
- Todos os funis e etapas
- Todas as atividades e histórico
- Todas as configurações e FAQs
- Todos os campos customizados

---

## L10 — Remove '2024' suffix from invite code

**File**: `src/components/CreateCompanyModal.tsx`, line 65

Change: `const codigo = nome.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20) + '2024'`

To: `const codigo = nome.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20) + Date.now().toString(36).slice(-4).toUpperCase()`

This generates a unique suffix based on timestamp instead of a static '2024'.

---

## L11 — useLeadRealtime: fix race condition

**File**: `src/hooks/useLeadRealtime.ts`

The `useEffect` on line 34 fetches data asynchronously but has no cancellation when `leadId` changes. If lead A is loading and user clicks lead B, lead A's data may overwrite lead B's state.

Fix: add a `cancelled` flag (set to `true` in cleanup). Check `cancelled` before every `setState` call in `fetchData` and `fetchContatoData`. Reset state at the start of each effect run.

---

## Execution Order

L6 → L7 → L9 → L10 → L11, one at a time. Skip L8 (already correct) and L12/L13/L14/L15 (already done).

