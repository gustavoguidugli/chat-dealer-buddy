CREATE OR REPLACE FUNCTION public.create_user_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, is_admin)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;