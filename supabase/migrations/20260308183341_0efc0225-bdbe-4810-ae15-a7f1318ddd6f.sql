
-- Enable RLS on tables that might not have it enabled
ALTER TABLE public.contatos_geral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_sdr_maquinagelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_sdr_purificador ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT from contatos_geral (needed for CRM lead details)
CREATE POLICY "authenticated_select_contatos_geral"
ON public.contatos_geral
FOR SELECT
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id FROM user_empresa_geral WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to SELECT from contatos_sdr_maquinagelo
CREATE POLICY "authenticated_select_contatos_sdr_maquinagelo"
ON public.contatos_sdr_maquinagelo
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to SELECT from contatos_sdr_purificador
CREATE POLICY "authenticated_select_contatos_sdr_purificador"
ON public.contatos_sdr_purificador
FOR SELECT
TO authenticated
USING (true);
