

## Diagnóstico

Dois problemas impedem a exibição dos usuários ativos em "Meu Time":

1. **Sem Foreign Key**: A tabela `usuario_time` não tem FK de `id_usuario` para `usuarios.uuid`. O Supabase não consegue fazer o join `usuarios(email, nome, ...)` sem essa relação, retornando `null`.

2. **RLS restritiva em `usuarios`**: A policy de SELECT permite apenas `uuid = auth.uid()` — cada usuário só vê seus próprios dados. Mesmo com FK, o join só retornaria dados do usuário logado.

## Solução

Criar uma **função RPC `SECURITY DEFINER`** que retorna os membros do time com suas informações, contornando a RLS restritiva da tabela `usuarios`.

### 1. Migration SQL

```sql
-- Add FK (needed for data integrity)
ALTER TABLE usuario_time
  ADD CONSTRAINT fk_usuario_time_usuarios
  FOREIGN KEY (id_usuario) REFERENCES usuarios(uuid) ON DELETE CASCADE;

-- RPC to fetch team members with user info
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
```

### 2. Atualizar `src/pages/MeuTime.tsx`

Trocar o `supabase.from('usuario_time').select(...)` por `supabase.rpc('get_team_members', { p_empresa_id: empresaId })` e ajustar o tipo `TeamMember` para receber os campos diretamente (sem objeto `usuarios` aninhado).

Atualizar `getMemberName` e os acessos a email para usar os campos diretos (`m.email`, `m.primeiro_nome`, etc.) em vez de `m.usuarios.email`.

