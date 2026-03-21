

# Fix 3 bugs in "Meu Time" (MeuTime.tsx)

## File: `src/pages/MeuTime.tsx`

### Bug 1 — Suspend/Reactivate not working
Currently `handleSuspend` and `handleReactivate` (lines 160-172) update `usuario_time` directly, which doesn't actually ban/unban the user. Replace with edge function calls:
- `handleSuspend`: call `manage-users` with `action: 'edit_user', ativo: false`
- `handleReactivate`: call `manage-users` with `action: 'edit_user', ativo: true`

### Bug 2 — Remove not working
Currently `handleRemove` (lines 174-179) updates `usuario_time` to `deactivated`. Replace with edge function call:
- Call `manage-users` with `action: 'delete_user'`
- After success, remove user from local state immediately (`setMembers(prev => prev.filter(...))`)

### Bug 3 — Permission and self-action protection

**3a. Menu visibility:**
- The `...` dropdown (line 321) already checks `isCompanyAdmin || isSuperAdmin` — good.
- Inside the menu, hide "Alterar permissão" if the member is the logged-in user (`m.id_usuario === user?.id`).

**3b. Self-action block on role change:**
- In `handleChangeRole`, add guard: if `selectedMember.id_usuario === user?.id`, show error toast and return.

**3c. Self-action block on suspend/remove:**
- Hide "Suspender", "Reativar", and "Remover do time" menu items when `m.id_usuario === user?.id`.

### Implementation detail
Add a helper similar to `callManageUsers` from ConfigUsuarios.tsx to make authenticated edge function calls. Reuse the same pattern (get session, pass Authorization header).

### Summary of changes
- Single file edit: `src/pages/MeuTime.tsx`
- Replace 3 handler functions to use edge function
- Add self-action guards in menu rendering and handlers

