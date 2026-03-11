-- Add FK for data integrity
ALTER TABLE usuario_time
  ADD CONSTRAINT fk_usuario_time_usuarios
  FOREIGN KEY (id_usuario) REFERENCES usuarios(uuid) ON DELETE CASCADE;

-- RPC to fetch team members with user info (bypasses RLS on usuarios)
CREATE OR REPLACE FUNCTION get_team_members(p_empresa_id bigint)
RETURNS TABLE (
  id bigint,
  id_usuario uuid,
  role text,
  status_membro text,
  joined_at timestamptz,
  email text,
  nome text,
  primeiro_nome text,
  sobrenome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ut.id,
    ut.id_usuario,
    ut.role,
    ut.status_membro,
    ut.joined_at,
    u.email,
    u.nome,
    u.primeiro_nome,
    u.sobrenome
  FROM usuario_time ut
  LEFT JOIN usuarios u ON u.uuid = ut.id_usuario
  WHERE ut.id_empresa = p_empresa_id
    AND ut.status_membro IN ('active', 'suspended')
    AND (
      p_empresa_id IN (SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid())
      OR is_admin(auth.uid())
    )
$$;