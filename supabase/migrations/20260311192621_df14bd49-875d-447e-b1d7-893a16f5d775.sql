
-- 1. Add id_empresa column to lead_etiquetas
ALTER TABLE public.lead_etiquetas ADD COLUMN id_empresa bigint;

-- 2. Backfill from leads_crm
UPDATE public.lead_etiquetas le
SET id_empresa = (SELECT l.id_empresa FROM public.leads_crm l WHERE l.id = le.id_lead);

-- 3. Make NOT NULL
ALTER TABLE public.lead_etiquetas ALTER COLUMN id_empresa SET NOT NULL;

-- 4. Add FK
ALTER TABLE public.lead_etiquetas
  ADD CONSTRAINT lead_etiquetas_id_empresa_fkey
  FOREIGN KEY (id_empresa) REFERENCES public.empresas_geral(id);

-- 5. Drop old RLS policies that use subquery
DROP POLICY IF EXISTS "Usuários veem etiquetas da própria empresa" ON public.lead_etiquetas;
DROP POLICY IF EXISTS "Usuários gerenciam etiquetas da própria empresa" ON public.lead_etiquetas;
DROP POLICY IF EXISTS "Users can view lead_etiquetas of their company" ON public.lead_etiquetas;
DROP POLICY IF EXISTS "Users can manage lead_etiquetas of their company" ON public.lead_etiquetas;

-- 6. Create new RLS policies using direct column
CREATE POLICY "lead_etiquetas_select"
ON public.lead_etiquetas FOR SELECT TO authenticated
USING (id_empresa IN (SELECT public.get_empresas_usuario()));

CREATE POLICY "lead_etiquetas_insert"
ON public.lead_etiquetas FOR INSERT TO authenticated
WITH CHECK (id_empresa IN (SELECT public.get_empresas_usuario()));

CREATE POLICY "lead_etiquetas_update"
ON public.lead_etiquetas FOR UPDATE TO authenticated
USING (id_empresa IN (SELECT public.get_empresas_usuario()));

CREATE POLICY "lead_etiquetas_delete"
ON public.lead_etiquetas FOR DELETE TO authenticated
USING (id_empresa IN (SELECT public.get_empresas_usuario()));
