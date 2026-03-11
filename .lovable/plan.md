

# Correção: Usuários não aparecem em "Meu Time" e validação de convite falha

## Problema raiz

O vínculo real entre usuário e empresa está em `user_empresa`, mas a listagem de membros em "Meu Time" e a validação de convites usam `usuario_time`. O usuário `matheus.carneiro@aluno.lsb.com.br` tem registro em `user_empresa` (empresa 17, role admin) mas nenhum registro em `usuario_time` — por isso não aparece na tela e pode receber convites duplicados.

## Solução

### 1. Reescrever a RPC `get_team_members` para usar `user_empresa` como fonte primária

A RPC passará a consultar `user_empresa` (que é a tabela de vínculo real) em vez de `usuario_time`. Fará LEFT JOIN em `usuarios` para dados de perfil e LEFT JOIN em `usuario_time` para status (se existir, senão assume `active`).

```sql
CREATE OR REPLACE FUNCTION get_team_members(p_empresa_id bigint)
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
```

### 2. Corrigir validação no `InviteTeamModal`

Substituir a query em `usuario_time` pela RPC `get_team_members` para buscar membros existentes — garantindo que a validação detecte todos os usuários vinculados.

**Arquivo:** `src/components/InviteTeamModal.tsx` — linhas 39-43

```typescript
const [membersRes, invitesRes] = await Promise.all([
  supabase.rpc('get_team_members', { p_empresa_id: empresaId }),
  supabase.from('convites').select('email_destino').eq('empresa_id', empresaId).eq('status_convite', 'pending'),
]);
setExistingMembers((membersRes.data ?? []).map((m: any) => m.email?.toLowerCase()).filter(Boolean));
```

### Arquivos a editar
- Migração SQL (nova) — reescrever RPC `get_team_members`
- `src/components/InviteTeamModal.tsx` — trocar query de validação

### Resultado
- Todos os usuários vinculados via `user_empresa` aparecem em "Meu Time"
- Convites para usuários já vinculados são bloqueados na validação

