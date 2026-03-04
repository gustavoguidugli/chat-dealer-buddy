
DROP FUNCTION IF EXISTS public.get_usuarios_empresa(bigint);

CREATE OR REPLACE FUNCTION public.get_usuarios_empresa(empresa_id_param bigint)
 RETURNS TABLE(id uuid, email text, nome text, raw_user_meta_data jsonb, role text, last_sign_in_at timestamptz, banned_until timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email)::text as nome,
    u.raw_user_meta_data,
    COALESCE(ue.role, 'member')::text as role,
    u.last_sign_in_at,
    u.banned_until
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
