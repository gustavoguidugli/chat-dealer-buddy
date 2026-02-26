
-- Allow admins to delete from empresas_geral
CREATE POLICY "admins_delete_empresas_geral"
ON public.empresas_geral
FOR DELETE
USING (is_admin(auth.uid()));

-- Allow admins to delete contatos_geral
CREATE POLICY "admins_delete_contatos_geral"
ON public.contatos_geral
FOR DELETE
USING (is_admin(auth.uid()));

-- Allow admins to delete mensagens
CREATE POLICY "admins_delete_mensagens"
ON public.mensagens
FOR DELETE
USING (is_admin(auth.uid()));
