
-- Allow admins to insert into empresas_geral
CREATE POLICY "admins_insert_empresas_geral" ON public.empresas_geral
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins to update empresas_geral
CREATE POLICY "admins_update_empresas_geral" ON public.empresas_geral
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow authenticated users to insert own mapping in user_empresa_geral (signup flow)
CREATE POLICY "insert_own_empresa_geral" ON public.user_empresa_geral
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
