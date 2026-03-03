
-- Drop and recreate get_usuarios_empresa with new return type
DROP FUNCTION IF EXISTS public.get_usuarios_empresa(bigint);

CREATE OR REPLACE FUNCTION public.get_usuarios_empresa(empresa_id_param bigint)
 RETURNS TABLE(id uuid, email text, nome text, raw_user_meta_data jsonb, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as nome,
    u.raw_user_meta_data,
    COALESCE(ue.role, 'member') as role
  FROM auth.users u
  INNER JOIN user_empresa ue ON ue.user_id = u.id
  WHERE ue.empresa_id = empresa_id_param
  ORDER BY 
    CASE 
      WHEN u.email = 'guidugli.gustavo@gmail.com' THEN 0
      WHEN ue.role = 'admin' THEN 1
      ELSE 2
    END,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email);
END;
$function$;

-- Create function to manage user roles
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id uuid,
  p_empresa_id bigint,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email = 'guidugli.gustavo@gmail.com' THEN
    RAISE EXCEPTION 'Cannot modify Super Admin role';
  END IF;
  
  IF p_new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;
  
  UPDATE user_empresa 
  SET role = p_new_role 
  WHERE user_id = p_user_id AND empresa_id = p_empresa_id;
  
  RETURN true;
END;
$function$;

-- Create function to remove user from company
CREATE OR REPLACE FUNCTION public.remove_user_from_empresa(
  p_user_id uuid,
  p_empresa_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email = 'guidugli.gustavo@gmail.com' THEN
    RAISE EXCEPTION 'Cannot remove Super Admin';
  END IF;
  
  DELETE FROM user_empresa WHERE user_id = p_user_id AND empresa_id = p_empresa_id;
  DELETE FROM user_empresa_geral WHERE user_id = p_user_id AND empresa_id = p_empresa_id;
  
  RETURN true;
END;
$function$;
