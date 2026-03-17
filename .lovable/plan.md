

# Plano: Diagnóstico do Fluxo de Onboarding Empresa + Usuário

---

## BLOCO 1 — Diagnóstico Objetivo

### O que deveria acontecer
1. Admin cria empresa (via `CreateCompanyModal`)
2. Admin cria usuário vinculado (via `create_user` no `manage-users`)
3. Convite é enviado por email com link de onboarding
4. Usuário abre o link, define nome e senha
5. Frontend chama `complete_onboarding` no backend (edge function)
6. Backend cria o usuário no Auth OU atualiza a senha se já existir
7. Backend aceita o convite e cria os vínculos
8. Frontend faz `signInWithPassword` com a senha recém-definida
9. Usuário acessa `/home`

### O que está acontecendo
Os auth logs mostram chamadas diretas de `signUp` (422: user already registered) seguidas de `signInWithPassword` (400: invalid credentials). Isso indica que o frontend antigo (que fazia signUp no cliente) ainda está sendo executado, e o novo fluxo via `complete_onboarding` nunca foi acionado.

**Evidência decisiva**: os logs da edge function `manage-users` não contêm nenhum registro de `complete_onboarding` ter sido chamado. O frontend que o usuário está usando não é o código atualizado.

### Hipótese principal
**O usuário está testando em uma versão cacheada ou em um build que não incorporou as mudanças do `Onboarding.tsx`.** O código no repositório está correto (linhas 84-95 delegam ao backend), mas o build acessado pelo usuário ainda contém o código antigo que tenta `signUp` + `signInWithPassword` diretamente.

### Hipóteses secundárias
1. O teste foi feito na URL publicada (`chat-dealer-buddy.lovable.app`) que pode ter um build antigo
2. O navegador cacheou o bundle JS antigo da página de onboarding
3. O `create_user` (action do admin) já criou o usuário no Supabase Auth com uma senha diferente, e mesmo com o código novo, há um problema de timing entre `updateUserById` e `signInWithPassword`

### Camada do problema
**Frontend (build/deploy)** — o código correto existe no repositório mas não está sendo servido ao usuário.

Se após rebuild o problema persistir, a camada seria **autenticação** (timing entre password update e sign-in).

---

## BLOCO 2 — Fluxo Atual (AS-IS)

```text
CRIAÇÃO DA EMPRESA (CreateCompanyModal):
  1. INSERT empresas_geral → empresa criada
  2. INSERT convites (tipo=email) → convite pendente
  3. send-invitation-email → email enviado
  4. copy-company-config → config copiada de template
  → OK

CRIAÇÃO DO USUÁRIO (manage-users create_user):
  1. adminClient.auth.admin.createUser(email, password)
     → Cria o usuário NO SUPABASE AUTH com senha definida pelo admin
  2. INSERT user_empresa → vínculo criado
  3. UPSERT user_empresa_geral
  4. UPSERT user_permissions
  → PONTO CRÍTICO: o usuário já existe no Auth com uma senha
     que NÃO é a que ele vai definir no onboarding

ONBOARDING (Onboarding.tsx - código NO REPOSITÓRIO):
  1. validar_convite(token) → OK
  2. supabase.functions.invoke('manage-users', {action: 'complete_onboarding'})
     → Backend: createUser → 422 (já existe)
     → Backend: listUsers → encontra user
     → Backend: updateUserById(password) → ATUALIZA SENHA
     → Backend: aceitar_convite → OK
     → Backend: upsert usuarios, usuario_time, etc → OK
  3. signInWithPassword(email, novaSenha) → DEVERIA funcionar

ONBOARDING (código QUE O USUÁRIO ESTÁ EXECUTANDO - versão antiga):
  1. validar_convite(token) → OK
  2. signUp(email, novaSenha) → 422 user already registered
  3. signInWithPassword(email, novaSenha) → 400 invalid credentials
     → FALHA: a novaSenha ≠ senha do create_user
```

### Ponto de quebra
O frontend antigo ainda está sendo executado. O fluxo correto nunca é acionado.

---

## BLOCO 3 — Estado Esperado (TO-BE)

1. Empresa criada corretamente ✅ (já funciona)
2. O `create_user` do admin cria o usuário no Auth — quando o convite for aceito, o `complete_onboarding` atualiza a senha para a definida pelo usuário
3. O convite é válido e acessível
4. O frontend chama `complete_onboarding` (não `signUp`)
5. O backend atualiza a senha e vincula o usuário
6. O `signInWithPassword` usa a senha recém-definida (agora garantida pelo backend)
7. Usuário autenticado e redirecionado para `/home`

---

## BLOCO 4 — Plano de Correção

### Etapa 1 — Garantir que o build correto está sendo servido

**Objetivo**: Confirmar que o `Onboarding.tsx` atualizado (que chama `complete_onboarding`) está no build ativo.
**Ação**: O usuário precisa acessar a página de onboarding na **URL de preview** (não a publicada) e forçar refresh (Ctrl+Shift+R). Se estiver usando a URL publicada, é necessário republicar.
**Validação**: Nos logs da edge function `manage-users`, deve aparecer uma chamada com `complete_onboarding`. Nos auth logs, NÃO deve aparecer `signUp` — apenas `signInWithPassword` (que agora deve ter sucesso).

### Etapa 2 — Adicionar logging defensivo no `complete_onboarding`

**Objetivo**: Caso o problema persista após rebuild, ter visibilidade do que acontece no backend.
**Ação**: Adicionar `console.log` no início e em cada etapa do `complete_onboarding` para rastrear o fluxo exato.
**Componente**: `supabase/functions/manage-users/index.ts` (linhas 451-572)
**Risco**: Nenhum — apenas logging.

### Etapa 3 — Corrigir `listUsers()` para busca por email

**Objetivo**: Substituir `listUsers()` + `.find()` por uma busca mais precisa. Embora hoje haja apenas 12 usuários, `listUsers()` tem paginação (default 50) e não é a forma correta de buscar um usuário por email.
**Ação**: Usar `adminClient.auth.admin.listUsers({ filter: email })` ou iterar páginas. Alternativamente, buscar diretamente na tabela `auth.users` via query SQL (mas isso não é possível pelo client). A solução mais robusta é usar `getUserById` após buscar o ID via `auth.users` ou simplesmente tentar `updateUserById` com o email extraído de outra forma.
**Componente**: `supabase/functions/manage-users/index.ts` linhas 473-480
**Risco**: Baixo.

### Etapa 4 — Redesenhar o fluxo `create_user` + onboarding

**Objetivo**: Quando o admin cria um usuário via `create_user`, o sistema já cria o usuário no Supabase Auth com uma senha temporária. Isso cria o estado "usuário existe com senha desconhecida". O `complete_onboarding` resolve isso atualizando a senha — mas é uma complexidade desnecessária.
**Alternativa**: O `create_user` deveria NÃO criar o usuário no Auth — apenas criar o convite. O usuário seria criado no Auth apenas durante o `complete_onboarding`. Isso eliminaria o estado inconsistente.
**Risco**: Médio — requer análise do impacto em outros fluxos que dependem de `create_user`.
**Decisão**: Deixar para uma etapa futura se o fluxo atual funcionar após as etapas 1-3.

### Etapa 5 — Validação end-to-end

**Verificações**:
1. Criar empresa → criar convite → abrir link → definir senha → acesso ao sistema
2. Usuário criado via `create_user` + convite → onboarding → acesso
3. Convite expirado → mensagem correta
4. Convite já usado → mensagem correta
5. Edge function logs mostram `complete_onboarding` executado com sucesso

---

## BLOCO 5 — Critérios de Aceite

1. O frontend de onboarding chama `complete_onboarding` via edge function (não `signUp` diretamente)
2. A edge function atualiza a senha do usuário existente antes do `signInWithPassword`
3. O `signInWithPassword` funciona com a senha recém-definida
4. O usuário fica vinculado à empresa corretamente
5. O fluxo não termina com "Invalid login credentials"
6. Os logs da edge function registram a execução do `complete_onboarding`
7. O processo é reproduzível para novas empresas

---

## BLOCO 6 — Recomendação Final

**Recomendação: Ajuste pontual (Etapas 1-2) + melhoria preventiva (Etapa 3)**

**Justificativa**:
- O código no repositório está correto. O `complete_onboarding` no backend lida com usuários novos e existentes, atualiza a senha via Admin API, e faz o vínculo.
- O problema é de **deploy/cache** — o usuário está executando o código antigo.
- A ação imediata é garantir que o build correto está ativo e testar novamente.
- A Etapa 3 (substituir `listUsers()`) é uma melhoria preventiva para robustez.
- A Etapa 4 (não criar user no Auth durante `create_user`) seria a correção estrutural ideal, mas não é necessária agora porque o `complete_onboarding` já trata o caso de "user already exists".

**Ação imediata recomendada**: O usuário deve acessar o link de onboarding na URL de preview, forçar refresh, e testar novamente. Se o erro persistir, implementar logging (Etapa 2) e investigar.

