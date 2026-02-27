
-- Drop existing restrictive policies on labels
DROP POLICY IF EXISTS "Admins manage all labels" ON public.labels;
DROP POLICY IF EXISTS "Admins see all labels" ON public.labels;
DROP POLICY IF EXISTS "Users manage own company labels" ON public.labels;
DROP POLICY IF EXISTS "Users see own company labels" ON public.labels;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins manage all labels"
ON public.labels FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_permissions
  WHERE user_permissions.user_id = auth.uid() AND user_permissions.is_admin = true
));

CREATE POLICY "Users manage own company labels"
ON public.labels FOR ALL
USING (empresa_id IN (
  SELECT user_empresa.empresa_id FROM user_empresa
  WHERE user_empresa.user_id = auth.uid()
));
