-- Permite que administradores leiam contatos_geral, inclusive para sincronização realtime
DROP POLICY IF EXISTS "admins_select_contatos_geral" ON public.contatos_geral;

CREATE POLICY "admins_select_contatos_geral"
ON public.contatos_geral
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));