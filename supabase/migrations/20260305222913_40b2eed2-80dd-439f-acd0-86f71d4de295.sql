
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_empresa_id bigint, p_new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email IN ('guidugli.gustavo@gmail.com', 'matheussenacarneiro2322@gmail.com') THEN
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
$$;

CREATE OR REPLACE FUNCTION public.remove_user_from_empresa(p_user_id uuid, p_empresa_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  IF v_email IN ('guidugli.gustavo@gmail.com', 'matheussenacarneiro2322@gmail.com') THEN
    RAISE EXCEPTION 'Cannot remove Super Admin';
  END IF;
  
  DELETE FROM user_empresa WHERE user_id = p_user_id AND empresa_id = p_empresa_id;
  DELETE FROM user_empresa_geral WHERE user_id = p_user_id AND empresa_id = p_empresa_id;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_for_specific_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
begin
  if new.email IN ('guidugli.gustavo@gmail.com', 'matheussenacarneiro2322@gmail.com') then
    insert into public.user_permissions (user_id, is_admin, created_at, updated_at)
    values (new.id, true, now(), now())
    on conflict (user_id)
    do update set
      is_admin = true,
      updated_at = now();
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_usuarios_empresa(empresa_id_param bigint)
 RETURNS TABLE(id uuid, email text, nome text, raw_user_meta_data jsonb, role text, last_sign_in_at timestamp with time zone, banned_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
      WHEN u.email IN ('guidugli.gustavo@gmail.com', 'matheussenacarneiro2322@gmail.com') THEN 0
      WHEN ue.role = 'admin' THEN 1
      ELSE 2
    END,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email);
END;
$$;
