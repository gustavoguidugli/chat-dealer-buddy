

# Análise do Sistema de Usuários — Bugs e Inconsistências Encontrados

Após análise completa dos fluxos (criação, edição, exclusão, convite, onboarding, roles), identifiquei os seguintes problemas:

---

## Bug 1: Inconsistência de roles entre `MeuTime` e `ConfigUsuarios`

**Problema:** A página `MeuTime` (linha 122-128) altera o role na tabela `usuario_time`, mas o sistema de permissões real usa `user_empresa`. As duas tabelas ficam dessincronizadas — mudar o role em "Meu Time" não tem efeito prático na autorização.

**Correção:** `handleChangeRole` em `MeuTime` deve também atualizar `user_empresa` (via RPC `update_user_role`) além de `usuario_time`.

---

## Bug 2: `delete_user` na Edge Function apaga o auth user globalmente

**Problema:** `manage-users` linha 257 chama `adminClient.auth.admin.deleteUser(user_id)`, o que **apaga a conta do Supabase Auth inteiramente**. Se o usuário pertencer a múltiplas empresas, ele perde o acesso a todas. Além disso, `user_empresa_geral` é apagado incondicionalmente (linha 253).

**Correção:** Apenas remover de `user_empresa` para aquela empresa. Só apagar o auth user se não houver mais nenhum vínculo com outras empresas.

---

## Bug 3: `Onboarding` usa `supabase.rpc('aceitar_convite')` com `anon` key sem sessão

**Problema:** Na página de Onboarding (linha 93), após o `signUp`, o RPC `aceitar_convite` é chamado com o `p_user_id` explícito. A função é `SECURITY DEFINER`, então funciona. Porém, o `signUp` pode retornar o user sem sessão confirmada (dependendo da config do Supabase), e as operações subsequentes (upsert `usuarios`, insert `usuario_time`, update `convites`) na linha 105-129 são feitas pelo client `anon` — se RLS exigir autenticação, elas podem falhar silenciosamente.

**Correção:** Mover as operações pós-aceite (linhas 105-137) para dentro da Edge Function `manage-users` ou para uma nova RPC `SECURITY DEFINER`, garantindo execução com privilégios adequados.

---

## Bug 4: Inconsistência de role vocabulary (`user` vs `member`)

**Problema:** O `InviteTeamModal` usa `role: 'user'` como valor padrão (linha 28, 73). O `aceitar_convite` RPC mapeia roles com `CASE WHEN v_role_convite = 'admin' THEN 'admin' ELSE 'member'`, então 'user' vira 'member' no `user_empresa`. Mas na tabela `convites`, fica gravado `role = 'user'`. O `MeuTime` exibe `roleLabel['user'] = 'Usuário'` enquanto `ConfigUsuarios` exibe `'Membro'` para o mesmo usuário. Isso gera confusão visual.

**Correção:** Padronizar para `'member'` em todo o sistema — `InviteTeamModal`, `MeuTime` select options, e `roleLabel`.

---

## Bug 5: `MeuTime` não protege ações de não-admins

**Problema:** Todas as ações (suspender, remover, alterar permissão) estão disponíveis para qualquer membro autenticado. Não há verificação de `isCompanyAdmin` ou `isSuperAdmin` no frontend — o dropdown de ações aparece para todos.

**Correção:** Condicionar a exibição do dropdown e do botão "Enviar convite" com `isCompanyAdmin || isSuperAdmin`.

---

## Resumo das Correções

| # | Bug | Arquivo(s) | Tipo |
|---|-----|-----------|------|
| 1 | Role sync entre tabelas | `MeuTime.tsx` | Frontend |
| 2 | Delete apaga auth user global | `manage-users/index.ts` | Edge Function |
| 3 | Operações pós-onboarding sem permissão | `Onboarding.tsx` | Frontend/Backend |
| 4 | `user` vs `member` inconsistente | `InviteTeamModal.tsx`, `MeuTime.tsx` | Frontend |
| 5 | Sem controle de permissão em MeuTime | `MeuTime.tsx` | Frontend |

Posso implementar todos na sequência, começando pelo mais crítico (Bug 2 — delete destrutivo).

