

# Plan: Invite System & Onboarding (Blocos 2–6)

This is a large feature set. The plan covers database migrations, new pages, a new edge function, and modifications to existing components.

## Database Migrations

The `usuario_time` and `usuarios` tables need new columns before the frontend can work.

### Migration 1: Add columns to `usuario_time`
```sql
ALTER TABLE public.usuario_time
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status_membro text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();
```

### Migration 2: Add columns to `usuarios`
```sql
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS primeiro_nome text,
  ADD COLUMN IF NOT EXISTS sobrenome text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
```

### Migration 3: RLS for `audit_logs`
Currently `audit_logs` has no RLS policies. Add an INSERT policy for authenticated users and a SELECT policy for admins.
```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_insert_audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_select_audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));
```

---

## New Files to Create

### 1. `src/pages/MeuTime.tsx` (Bloco 2)
Page with two tabs ("Usuarios ativos" and "Convites") using existing Tabs component.

**Tab "Usuarios ativos":**
- Fetch `usuario_time` with join on `usuarios` (via `id_usuario` = `uuid`) filtered by empresa
- Display: Name (primeiro_nome + sobrenome, fallback to nome), Email, Role, Status, Actions dropdown
- Filter: `status_membro IN ('active', 'suspended')`
- Actions: Change permission, Suspend/Reactivate, Remove (update status_membro to 'deactivated')
- Each action logs to `audit_logs`

**Tab "Convites":**
- Fetch `convites` for the empresa
- Before rendering, update expired pending invites (`expira_em < now()`)
- Show: email_destino, status_convite, expira_em, role
- Context actions: Cancel, Resend, Recreate, View user
- Each action logs to `audit_logs`

Button "Enviar convite" opens the invite modal (Bloco 3).

### 2. `src/components/InviteTeamModal.tsx` (Bloco 3)
New modal (separate from the existing `InviteModal.tsx` which is for the admin empresa flow).

- Dynamic list of email+role rows (max 20)
- Real-time validation: email format, duplicates, already member (check `usuario_time`), pending invite (check `convites`)
- On submit: insert each valid row into `convites` with `tipo: 'email'`, `expira_em: now() + 72h`, `criado_por: auth.uid()`
- After insert: call `send-invitation-email` edge function per invite (catch errors silently)
- Toast success, audit_logs, close modal, refresh invites tab

### 3. `supabase/functions/send-invitation-email/index.ts` (Bloco 4)
Edge function stub:
- Receives `{ convite_id }`, fetches convite, validates status = 'pending'
- Builds email payload with link `https://chat-dealer-buddy.lovable.app/onboarding?token={token}`
- `console.log` the payload instead of calling Resend
- Returns `{ success: true, message: 'Email stub' }`
- Add config.toml entry with `verify_jwt = false`

### 4. `src/pages/Onboarding.tsx` (Bloco 5)
Multi-step onboarding flow at `/onboarding?token=...`:

**Initial validation:** Call `validar_convite(p_token)` RPC. On error, redirect to appropriate error page.

**Step 1 — Identity:** First name + last name fields with validation.

**Step 2 — Password:** New password + confirm with real-time criteria checklist (8+ chars, upper, lower, number, special).

**Step 3 — 2FA:** If role=admin, mandatory setup button. If role=user, optional with "configure later" link. (2FA setup is UI-only for now; actual TOTP integration deferred.)

**Conclusion sequence:**
1. `supabase.auth.signUp({ email, password })`
2. Upsert `usuarios` with primeiro_nome, sobrenome, nome, id_empresa, nivel_acesso, onboarding_completed
3. Insert `usuario_time` with id_usuario, id_empresa, role, status_membro='active'
4. Call `aceitar_convite` RPC
5. Update convite status to 'accepted'
6. Insert audit_log
7. Auto-login and redirect to `/home`

### 5. Error Pages (Bloco 6)
Three simple pages, no sidebar:
- `src/pages/OnboardingInvalid.tsx` — `/onboarding/invalid`
- `src/pages/OnboardingExpired.tsx` — `/onboarding/expired`
- `src/pages/OnboardingUsed.tsx` — `/onboarding/used` (with "Ir para login" button)

---

## Files to Modify

### `src/App.tsx`
Add routes:
- `/meu-time` → `<ProtectedRoute><MeuTime /></ProtectedRoute>`
- `/onboarding` → `<Onboarding />` (public, no ProtectedRoute)
- `/onboarding/invalid` → `<OnboardingInvalid />`
- `/onboarding/expired` → `<OnboardingExpired />`
- `/onboarding/used` → `<OnboardingUsed />`

### `src/components/AppSidebar.tsx`
Add "Meu Time" nav link under Configurações collapsible menu, route `/meu-time`, icon `Users`.

### `supabase/config.toml`
Add entry for the new edge function:
```toml
[functions.send-invitation-email]
verify_jwt = false
```

---

## Execution Order

1. Database migrations (add columns + RLS)
2. Sidebar nav link + route setup in App.tsx
3. MeuTime page (Bloco 2)
4. InviteTeamModal (Bloco 3)
5. send-invitation-email edge function (Bloco 4)
6. Onboarding flow (Bloco 5)
7. Error pages (Bloco 6)

---

## Notes

- The existing `InviteModal.tsx` and `ConfigUsuarios.tsx` remain untouched — they serve a different purpose (admin backoffice user management).
- The `MeuTime` page is the team-facing view; `ConfigUsuarios` is the admin-facing user management.
- Email sending is stubbed — Resend integration will be activated later.
- 2FA step in onboarding is UI placeholder; actual TOTP setup requires Supabase MFA API integration (deferred).

