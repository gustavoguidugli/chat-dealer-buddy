-- 1. Create a SECURITY DEFINER function to look up user ID by email from auth.users
-- This avoids the listUsers() GoTrue API bug with banned_until='infinity'
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- 2. Fix any existing banned_until='infinity' values that crash GoTrue listUsers
-- Replace with a far-future date that GoTrue can parse
UPDATE auth.users
SET banned_until = '9999-12-31T23:59:59Z'::timestamptz
WHERE banned_until = 'infinity'::timestamptz;

-- 3. Fix the trigger to use a parseable far-future date instead of 'infinity'
CREATE OR REPLACE FUNCTION public.fn_revogar_acesso_usuario_removido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status_membro = 'deactivated' AND OLD.status_membro <> 'deactivated' THEN
    -- Use far-future date instead of 'infinity' to avoid GoTrue scan bug
    UPDATE auth.users
    SET banned_until = '9999-12-31T23:59:59+00'::timestamptz
    WHERE id = NEW.id_usuario;

    DELETE FROM public.user_empresa
    WHERE user_id = NEW.id_usuario
      AND empresa_id = NEW.id_empresa;

    UPDATE public.user_permissions
    SET is_admin = false
    WHERE user_id = NEW.id_usuario;
  END IF;

  IF NEW.status_membro = 'active' AND OLD.status_membro = 'deactivated' THEN
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = NEW.id_usuario;
  END IF;

  RETURN NEW;
END;
$function$;