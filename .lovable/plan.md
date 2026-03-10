

# Plan: Fix All Frontend Issues

## Files to Create
1. **`src/pages/SemEmpresa.tsx`** — Simple page showing "account not linked" message with logout button
2. **`src/pages/ResetPassword.tsx`** — Password reset form that detects Supabase token, allows new password, redirects to login
3. **`src/pages/AceitarConvite.tsx`** — Page that reads `convite_id` from query, redirects to login if not authenticated, calls `manage-users` edge function to accept invite

## Files to Modify

### `src/contexts/AuthContext.tsx`
- Replace `(supabase as any).from('user_empresa_geral')` with `supabase.from('user_empresa_geral')` (table exists in types)
- Add `semEmpresa: boolean` state to context, default `false`
- After fetching empresa_id for non-super-admin users, if result is null, set `semEmpresa = true`
- Export `semEmpresa` in context value

### `src/pages/Login.tsx`
- Change redirect condition from `isAdmin && !empresaId` to `isSuperAdmin && !empresaId`
- Add check: if `semEmpresa` is true, redirect to `/sem-empresa`
- Handle `redirect` query param to support post-login redirect (for invite acceptance flow)

### `src/App.tsx`
- Add route `/sem-empresa` → `SemEmpresa` component
- Add route `/reset-password` → `ResetPassword` component
- Add route `/aceitar-convite` → `AceitarConvite` (protected)
- Remove `/invite` route and `/signup` redirect
- Remove `Invite` import

### `src/pages/Invite.tsx`
- Delete this file (replaced by new invite flow)

### `src/pages/SelectCompany.tsx`
- Confirm it already uses `isSuperAdmin` (it does at line 56) — no change needed

### `src/pages/CrmFunil.tsx`
- **Problem 5**: Update `handleNewDeal` to receive the `lead` parameter and add it to `leads` state via `setLeads`, then close modal
- **Problem 11**: Add `escapePostgrest()` function and use it in the `.or()` filter at line 325

### `src/hooks/useFunilRealtime.ts`
- **Problem 6**: On INSERT/UPDATE events, instead of using `payload.new` directly, fetch the full lead with joins (`funis(nome)`, `etapas_funil(nome, ordem, cor)`) by ID, then update state with the enriched result

### `src/pages/CrmAtividades.tsx`
- **Problem 7**: Replace sequential loops in `handleBulkExcluir` with `.delete().in('id', ids)` and `handleBulkConcluir` with `.update(...).in('id', ids)`

### `src/components/crm/CriarFunilModal.tsx`
- **Problem 8**: Move `let counter = 0` from module scope into the component as `useRef(0)`, update `nextTempId` to use the ref

### `src/components/crm/ActivityModal.tsx`
- **Problem 10**: Make `leadId` optional in props
- When `leadId` is 0/undefined, show a lead search/select field (fetch leads from `leads_crm` for the empresa)
- Make `id_lead` required validation before save
- When `leadId` is provided and > 0, keep current behavior (no select shown)

### `src/components/crm/LeadDrawer.tsx`
- **Problem 12**: Remove `data_entrada_etapa_atual: new Date().toISOString()` from the update payload at line 500

### `src/components/InviteModal.tsx`
- Update to send invites via email through `manage-users` edge function with action `convidar_usuario` instead of just creating a database record with a copyable link
- Keep the invite list display but remove the copy-link UI

### `supabase/functions/manage-users/index.ts`
- Add `convidar_usuario` action: creates invite record, sends email via Supabase auth invite or custom email
- Add `aceitar_convite_pos_login` action: validates invite, links user to empresa via `user_empresa` and `user_empresa_geral`, increments usage

## Database Migration
- Insert `'custom'` into `funil_tipos` table (Problem 1 from previous report, prerequisite for funnel creation)

## Summary of Changes by Problem

| # | What | Files |
|---|------|-------|
| 2 | Remove `as any` casts | AuthContext.tsx, (Invite.tsx removed) |
| 3+4 | Fix redirect loop, add semEmpresa state | AuthContext.tsx, Login.tsx, App.tsx, new SemEmpresa.tsx |
| 5 | Add lead to local state on creation | CrmFunil.tsx |
| 6 | Re-fetch lead with joins on realtime | useFunilRealtime.ts |
| 7 | Batch bulk operations | CrmAtividades.tsx |
| 8 | Move counter to useRef | CriarFunilModal.tsx |
| 9 | Create reset password page | new ResetPassword.tsx, App.tsx |
| 10 | Lead selector in ActivityModal | ActivityModal.tsx |
| 11 | Sanitize PostgREST search input | CrmFunil.tsx |
| 12 | Remove redundant field from update | LeadDrawer.tsx |
| New | Replace invite flow | new AceitarConvite.tsx, InviteModal.tsx, manage-users edge fn, delete Invite.tsx, App.tsx |

