CREATE OR REPLACE FUNCTION public.get_team_members(p_empresa_id bigint)
RETURNS TABLE(
  id bigint, id_usuario uuid, role text, status_membro text,
  joined_at timestamptz, email text, nome text,
  primeiro_nome text, sobrenome text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(ut.id, 0) as id,
    ue.user_id as id_usuario,
    ue.role,
    COALESCE(ut.status_membro, 'active') as status_membro,
    COALESCE(ut.joined_at, ue.created_at) as joined_at,
    au.email,
    u.nome,
    u.primeiro_nome,
    u.sobrenome
  FROM user_empresa ue
  JOIN auth.users au ON au.id = ue.user_id
  LEFT JOIN usuarios u ON u.uuid = ue.user_id
  LEFT JOIN usuario_time ut ON ut.id_usuario = ue.user_id AND ut.id_empresa = ue.empresa_id
  WHERE ue.empresa_id = p_empresa_id
    AND COALESCE(ut.status_membro, 'active') IN ('active', 'suspended')
    AND (
      p_empresa_id IN (SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid())
      OR is_admin(auth.uid())
    )
$$;