

# Diagnóstico: "Invalid login credentials" no Onboarding

---

## BLOCO 1 — Diagnóstico Objetivo

### O que deveria acontecer
O usuário convidado acessa o link de onboarding, define nome + senha, o sistema cria a conta e autentica o usuário.

### O que está acontecendo — CONFIRMADO NOS LOGS
A sequência para `matheus.carneiro@vammo.com` (user ID `c8ad6221`) é:

1. `signUp` → **422 "User already registered"** — o usuário já existe no Supabase Auth
2. Fallback: `signInWithPassword` com a senha recém-digitada → **400 "Invalid login credentials"** — a senha digitada não é a senha existente

### Hipótese principal — CONFIRMADA
**O usuário já foi criado anteriormente no Supabase Auth** (provavelmente via `inviteUserByEmail` ou signup anterior). O código de onboarding (`Onboarding.tsx`, linhas 85-96) tenta `signUp`, recebe erro de "user already registered", e então tenta `signInWithPassword` com a senha que o usuário acabou de definir. Mas essa é a senha NOVA — o usuário existente tem uma senha DIFERENTE (ou nenhuma, se foi criado via invite). O `signInWithPassword` falha porque a senha não bate.

### Hipóteses secundárias
1. O usuário foi criado via `inviteUserByEmail` em tentativa anterior (o `manage-users` antigo usava esse método)
2. O usuário fez um signup anterior que não completou o onboarding

### Onde o erro ocorre
Na **autenticação pós-definição de senha** — entre a criação da conta e o vínculo com a empresa. A conta já existe, a senha nova não foi aplicada, e o login com a senha nova falha.

---

## BLOCO 2 — Fluxo Atual (AS-IS)

```text
Onboarding.tsx → handleFinish():
  1. supabase.auth.signUp(email, novaSenha)
     → Se sucesso: userId = novo user
     → Se "User already registered":
        2. supabase.auth.signInWithPassword(email, novaSenha)  ← BUG AQUI
           → Falha: a novaSenha ≠ senha existente
           → throw "Invalid login credentials"
           → Toast: "Erro ao criar conta"
  
  3. (nunca alcançado) manage-users complete_onboarding
  4. (nunca alcançado) re-login
  5. (nunca alcançado) navigate('/home')
```

**Ponto de quebra:** Linha 91-95 — o fallback `signInWithPassword` usa a senha recém-digitada contra um usuário que tem outra senha.

---

## BLOCO 3 — Estado Esperado (TO-BE)

1. Se o usuário já existe no Auth, o sistema deve **atualizar a senha** para a nova senha definida (via admin API no backend)
2. Após atualizar, autenticar com a nova senha
3. Completar o vínculo com a empresa
4. Redirecionar para `/home`

---

## BLOCO 4 — Plano de Correção

### Etapa 1 — Mover a lógica de criação/ativação para a Edge Function

**Objetivo:** O `complete_onboarding` no `manage-users` já roda com `service_role`. Mover a criação do usuário (ou atualização de senha) para lá.

**Mudança em `manage-users/index.ts` (`complete_onboarding`):**
- Receber `password` como parâmetro adicional
- Tentar `adminClient.auth.admin.createUser({ email, password, email_confirm: true })`
- Se "already registered": usar `adminClient.auth.admin.updateUserById(existingUserId, { password })` para definir a nova senha
- Retornar o `user_id` resultante

**Risco:** Médio — alterar senha de usuário existente pode afetar outros cenários. Mitigação: só atualizar se o convite for válido e ativo.

### Etapa 2 — Simplificar o frontend `Onboarding.tsx`

**Objetivo:** O frontend não tenta mais `signUp`/`signIn` diretamente. Delega tudo ao backend.

**Mudança:**
- `handleFinish` chama `manage-users` com `action: 'complete_onboarding'` passando `password`
- O backend cria ou atualiza o usuário e retorna sucesso
- Após sucesso, o frontend faz `signInWithPassword` com a senha recém-definida (agora garantida como correta)

**Risco:** Baixo.

### Etapa 3 — Validação end-to-end

1. Usuário novo (nunca existiu) → conta criada, login OK
2. Usuário existente (já registrado) → senha atualizada, login OK
3. Convite expirado → mensagem correta
4. Convite já usado → mensagem correta

---

## BLOCO 5 — Critérios de Aceite

1. Usuário já existente no Auth consegue completar onboarding sem "Invalid login credentials"
2. A senha definida no onboarding é efetivamente aplicada à conta
3. O vínculo com a empresa é criado corretamente
4. Usuário novo continua funcionando normalmente
5. O fluxo não expõe a senha em logs

---

## BLOCO 6 — Recomendação Final

**Recomendação: Correção intermediária**

**Justificativa:**
- O bug é claro: o frontend tenta `signInWithPassword` com uma senha que o usuário ainda não tem. A lógica de "user already exists" precisa atualizar a senha via admin API antes de tentar login.
- A correção envolve dois arquivos: `manage-users/index.ts` (receber password e fazer create-or-update) e `Onboarding.tsx` (delegar ao backend, fazer login só depois).
- Não é um ajuste pontual porque a arquitetura atual (criar user no frontend) é fundamentalmente frágil para o caso de usuários pré-existentes.
- Não requer correção estrutural porque o fluxo geral (convite → onboarding → vínculo) está correto — só a etapa de criação/autenticação precisa ser reorganizada.

