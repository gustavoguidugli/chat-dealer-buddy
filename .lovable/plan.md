

# Revised Plan: Etapas 1-6 with User Corrections

## ETAPA 1 — Remove hardcoded superadmin emails

**Files**: `src/lib/constants.ts`, `src/contexts/AuthContext.tsx`, `src/pages/ConfigUsuarios.tsx`, `src/components/ManageUsersModal.tsx`

### AuthContext changes (critical fix per user feedback):
1. Add state: `const [isSuperAdminState, setIsSuperAdminState] = useState(false)`
2. Add to `resetState`: `setIsSuperAdminState(false)`
3. In `fetchUserData`: replace `isSuperAdmin(currentUser.email)` with:
   ```ts
   const { data: superAdminFlag } = await supabase.rpc('get_is_super_admin');
   const superAdmin = superAdminFlag === true;
   setIsSuperAdminState(superAdmin);
   ```
4. In superadmin branch: validate saved empresa against DB (`ativo = true`) before using; clear localStorage if invalid
5. In Provider value: change `isSuperAdmin: isSuperAdmin(user?.email)` to `isSuperAdmin: isSuperAdminState`
6. Remove import of `isSuperAdmin, SUPER_ADMIN_EMAILS` from constants

### ConfigUsuarios.tsx and ManageUsersModal.tsx:
Both import `checkSuperAdmin` from constants to mark users as super admin in listings. These need a different approach since they check OTHER users' emails, not the current user. Options:
- Add an RPC `check_is_super_admin(p_user_id uuid)` that checks if a given user is super admin
- Or have the `manage-users` edge function return a `is_super_admin` flag per user

Simplest: create an RPC `get_super_admin_user_ids()` (security definer) that returns the list of super admin user IDs, call it once in the fetch, and mark users accordingly. This avoids N+1 calls.

### Delete `src/lib/constants.ts`

---

## ETAPA 2 — Onboarding ConviteData interface

Comparing the interface vs RPC return type from `types.ts`:

| Interface field | RPC return field | Match? |
|---|---|---|
| `valido: boolean` | `valido: boolean` | Yes |
| `empresa_id: number` | `empresa_id: number` | Yes |
| `id: string` | `id: string` | Yes |
| `erro: string \| null` | `erro: string` | **Minor** — RPC type says non-nullable but interface has `null` |
| `email_destino: string` | `email_destino: string` | Yes |
| `role: string` | `role: string` | Yes |

**Result**: All field names match correctly. The only difference is `erro` nullability, which is harmless since the `as unknown as ConviteData` cast handles it. No changes needed — will confirm to user.

---

## ETAPA 3 — CreateCompanyModal: template + suffix

Three targeted edits as previously planned. No changes to the plan.

---

## ETAPA 4 — DeleteEmpresaModal: update deletion list

Update `<ul>` with complete cascade list. No changes to the plan.

---

## ETAPA 5 — useLeadRealtime: SDR isolation + fetch versioning

Per user's clarification, three independent fixes:

1. **`.eq('empresa_id', empresaId)` on fallback query** (line 64): Add filter when looking up `contatos_geral` by WhatsApp. This is separate from any WhatsApp validation in SDR channels.
2. **Fetch version ref**: Add `fetchVersionRef` to prevent stale async results from overwriting newer state.
3. SDR channel handlers already validate WhatsApp match — no additional changes needed there.

---

## ETAPA 6 — GerenciarFaqs: dynamic tabs

Remove hardcoded mapping, build tabs from `lista_interesses`. No changes to the plan.

---

## Execution Order

Etapa 1 first (requires DB migration for super admin user IDs RPC). Then 2 through 6 sequentially.

