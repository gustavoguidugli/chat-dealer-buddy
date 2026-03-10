
-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert audit logs
CREATE POLICY "authenticated_insert_audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Admins can read audit logs
CREATE POLICY "admin_select_audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Allow authenticated users to insert into usuarios (for onboarding)
CREATE POLICY "usuarios_insert_own" ON public.usuarios
  FOR INSERT TO authenticated WITH CHECK (uuid = auth.uid());

-- Allow authenticated users to update their own data
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE TO authenticated USING (uuid = auth.uid()) WITH CHECK (uuid = auth.uid());
