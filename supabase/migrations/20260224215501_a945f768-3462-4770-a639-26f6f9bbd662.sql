
-- Create user-empresa mapping table for non-admin users
CREATE TABLE IF NOT EXISTS public.user_empresa_geral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id bigint NOT NULL REFERENCES public.empresas_geral(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Security definer: check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_admin FROM user_permissions WHERE user_id = user_uuid LIMIT 1), false) $$;

-- Security definer: get user empresa_id
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(user_uuid uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT empresa_id FROM user_empresa_geral WHERE user_id = user_uuid LIMIT 1 $$;

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresa_geral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_geral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_interesses ENABLE ROW LEVEL SECURITY;

-- user_permissions policies
CREATE POLICY "users_read_own_perms" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_perms" ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- user_empresa_geral policies
CREATE POLICY "read_user_empresa" ON public.user_empresa_geral FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- empresas_geral policies
CREATE POLICY "read_empresas_geral" ON public.empresas_geral FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR id = public.get_user_empresa_id(auth.uid()));

-- lista_interesses policies
CREATE POLICY "select_interesses" ON public.lista_interesses FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "insert_interesses" ON public.lista_interesses FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "update_interesses" ON public.lista_interesses FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR empresa_id = public.get_user_empresa_id(auth.uid()));
CREATE POLICY "delete_interesses" ON public.lista_interesses FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR empresa_id = public.get_user_empresa_id(auth.uid()));
