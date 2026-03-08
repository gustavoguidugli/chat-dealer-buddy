-- Add admin policy for icones_atividades
CREATE POLICY "admins_all_icones_atividades"
ON public.icones_atividades
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "admins_select_icones_atividades"
ON public.icones_atividades
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));