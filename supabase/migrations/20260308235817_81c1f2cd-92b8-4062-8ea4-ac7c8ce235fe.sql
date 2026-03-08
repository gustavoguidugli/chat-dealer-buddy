-- Adicionar política RLS para permitir UPDATE na tabela contatos_geral
CREATE POLICY "authenticated_update_contatos_geral" ON public.contatos_geral
FOR UPDATE TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM user_empresa_geral WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id FROM user_empresa_geral WHERE user_id = auth.uid()
  )
);