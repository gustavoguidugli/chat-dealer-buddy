

# Diagnóstico: Email de Convite Não Recebido

---

## BLOCO 1 — Diagnóstico Objetivo do Problema

### O que deveria ter acontecido
Ao convidar uma nova empresa via painel admin (AdminEmpresasTab → InviteModal), o sistema deveria: criar o registro de convite, gerar um token, e enviar um email ao destinatário com o link de aceite.

### O que aconteceu
O convite provavelmente foi criado no banco (tabela `convites`), mas **nenhum email personalizado via Resend foi enviado**.

### Hipótese principal — CONFIRMADA NO CÓDIGO
**A `InviteModal` usada no painel admin NÃO dispara o email via Resend.**

Existem **três fluxos de convite distintos** no sistema, e eles usam mecanismos de envio diferentes:

| Fluxo | Componente | Envio de email |
|---|---|---|
| 1. Criar empresa (admin) | `CreateCompanyModal` | **Nenhum** — apenas insere na tabela `convites` |
| 2. Convidar via painel admin | `InviteModal` → `manage-users` action `convidar_usuario` | Usa `inviteUserByEmail` do Supabase Auth (email genérico do Supabase, não o template Eco Ice) |
| 3. Convidar via Meu Time | `InviteTeamModal` / `MeuTime.tsx` | **Chama `send-invitation-email`** (Resend, template branded Eco Ice) |

O fluxo que você usou (painel admin → InviteModal) chama `manage-users` com `convidar_usuario`, que:
1. Cria o convite no banco com `email_destino`, `token`, `expira_em` — funciona
2. Tenta enviar email via `adminClient.auth.admin.inviteUserByEmail()` — envia o email **padrão do Supabase Auth**, NÃO o template Eco Ice com Resend
3. **Nunca chama a Edge Function `send-invitation-email`** que é a que usa Resend

### Hipóteses secundárias
1. O email do Supabase Auth (`inviteUserByEmail`) pode ter sido enviado mas caiu em spam ou foi bloqueado pelo provedor do destinatário (`vammo.com`)
2. Se o usuário `matheus.carneiro@vammo.com` já existia no Supabase Auth, o fluxo usa `generateLink` (magic link) que pode não enviar email algum — apenas gera o link sem disparar
3. O `redirectTo` no `inviteUserByEmail` aponta para `chat-dealer-buddy.lovable.app/aceitar-convite`, não para `eco-ice.app.br/onboarding`

### Tipo de problema
**Arquitetural** — existe uma inconsistência entre os fluxos de convite. A Edge Function `send-invitation-email` (Resend + template branded) existe e funciona, mas só é chamada pelo fluxo do "Meu Time", nunca pelo fluxo do painel admin.

---

## BLOCO 2 — Fluxo Atual (AS-IS)

```text
FLUXO 1 — CreateCompanyModal (admin cria empresa):
  INSERT empresas_geral → INSERT convites (tipo='link', email_destino)
  → NENHUM envio de email
  → Token gerado automaticamente pelo DB (default gen_random_uuid)

FLUXO 2 — InviteModal (admin convida para empresa existente):
  Frontend → manage-users Edge Function (action: 'convidar_usuario')
    → INSERT convites (com email_destino, role, expira_em)
    → Se usuário NÃO existe: inviteUserByEmail() [email genérico Supabase]
    → Se usuário JÁ existe: generateLink(magiclink) [pode não enviar email]
    → NUNCA chama send-invitation-email

FLUXO 3 — MeuTime / InviteTeamModal (membro convida):
  Frontend → INSERT convites
  → Chama send-invitation-email Edge Function
  → Resend API com template branded Eco Ice
  → Email real é enviado via invitations@eco-ice.app.br

EDGE FUNCTION send-invitation-email (EXISTE MAS ESTÁ ÓRFÃ NO FLUXO ADMIN):
  Recebe convite_id → busca token do convite → monta HTML branded
  → Envia via Resend API (invitations@eco-ice.app.br)
  → Link: eco-ice.app.br/onboarding?token=XXX
```

### Onde o fluxo quebra
No Fluxo 2 (InviteModal do admin), após criar o convite, o sistema tenta enviar via `inviteUserByEmail` do Supabase Auth, que:
- Envia um email genérico (não branded)
- Usa o domínio do Supabase como remetente
- O link aponta para `chat-dealer-buddy.lovable.app`, não `eco-ice.app.br`
- Se o usuário já existe, usa `generateLink` que **gera o link mas pode não enviar email**

---

## BLOCO 3 — Estado Esperado (TO-BE)

1. Ao convidar um usuário via qualquer fluxo (admin ou Meu Time), o sistema deve criar o convite E enviar o email branded via Resend
2. O email deve usar o template Eco Ice (via `send-invitation-email`)
3. O link no email deve apontar para `eco-ice.app.br/onboarding?token=XXX`
4. O remetente deve ser `invitations@eco-ice.app.br`
5. O sistema deve registrar sucesso ou falha do envio do email
6. O fluxo deve ser consistente entre todos os pontos de entrada (admin, Meu Time, criar empresa)

---

## BLOCO 4 — Plano de Correção em Etapas

### Etapa 1 — Verificar se o convite foi criado no banco

**Objetivo:** Confirmar que o registro existe na tabela `convites` para `matheus.carneiro@vammo.com`.
**Verificação:** Query na tabela `convites` filtrando por `email_destino`.
**Risco:** Nenhum — leitura.
**Validação:** Convite existe com token, email_destino, ativo=true, não expirado.

### Etapa 2 — Verificar logs da Edge Function `manage-users`

**Objetivo:** Confirmar se o `inviteUserByEmail` do Supabase Auth foi chamado e se retornou erro.
**Verificação:** Edge function logs de `manage-users`.
**Risco:** Nenhum.
**Validação:** Identificar se houve erro silencioso no envio.

### Etapa 3 — Corrigir o fluxo `convidar_usuario` na Edge Function `manage-users`

**Objetivo:** Após criar o convite, chamar `send-invitation-email` ao invés de depender do `inviteUserByEmail` do Supabase.
**Componente:** `supabase/functions/manage-users/index.ts`, action `convidar_usuario` (linhas 313-377).
**Mudança:** Substituir o bloco de `inviteUserByEmail`/`generateLink` por uma chamada interna à `send-invitation-email` via fetch (ou inline a lógica de envio Resend).
**Risco:** Médio — precisa garantir que o nome da empresa seja passado corretamente.
**Validação:** Novo convite enviado via admin → email recebido com template Eco Ice.

### Etapa 4 — Corrigir o fluxo `CreateCompanyModal`

**Objetivo:** Ao criar empresa com email de convite, também disparar o email via Resend.
**Componente:** `src/components/CreateCompanyModal.tsx` (linhas 39-46).
**Mudança:** Após inserir o convite, chamar `send-invitation-email` com o `convite_id` retornado e o nome da empresa.
**Risco:** Baixo — adição de chamada.
**Validação:** Criar empresa com email → email recebido.

### Etapa 5 — Unificar o link de onboarding

**Objetivo:** Garantir que todos os fluxos usem o mesmo link base (`eco-ice.app.br`) e o mesmo formato de URL.
**Verificação:** `send-invitation-email` usa `eco-ice.app.br/onboarding?token=`. O `manage-users` usa `chat-dealer-buddy.lovable.app/aceitar-convite?convite_id=`. Estes são dois fluxos de aceite diferentes.
**Mudança:** Padronizar para usar o fluxo de onboarding com token (`eco-ice.app.br/onboarding?token=XXX`) consistentemente, já que é o que o template Resend espera.
**Risco:** Médio — precisa garantir que o fluxo de aceite funcione para usuários novos e existentes.

### Etapa 6 — Validação end-to-end

**Verificações:**
1. Criar convite via InviteModal admin → email recebido com template Eco Ice
2. Criar empresa com email via CreateCompanyModal → email recebido
3. Criar convite via Meu Time → continua funcionando (regressão)
4. Link no email leva ao onboarding correto
5. Convite pode ser aceito com sucesso

---

## BLOCO 5 — Critérios de Aceite

1. Todos os fluxos de convite (admin, criar empresa, Meu Time) disparam email via Resend com template branded
2. O email é enviado de `invitations@eco-ice.app.br`
3. O link no email usa o domínio correto (`eco-ice.app.br`)
4. O `convite_id` ou `token` é passado corretamente no link
5. O destinatário recebe o email (verificável)
6. Erro de envio é logado (não falha silenciosamente)
7. O fluxo funciona tanto para usuários novos quanto existentes

---

## BLOCO 6 — Recomendação Final

**Recomendação: Correção intermediária**

**Justificativa:**
- O problema é **arquitetural**: a Edge Function `send-invitation-email` existe e funciona, mas dois dos três fluxos de convite não a utilizam
- Um ajuste pontual (reenviar manualmente este convite) resolveria o caso imediato mas não previne reincidência
- A correção intermediária consiste em: (1) fazer `manage-users/convidar_usuario` chamar `send-invitation-email` após criar o convite, (2) fazer `CreateCompanyModal` chamar `send-invitation-email` após inserir o convite, (3) remover a dependência do `inviteUserByEmail` do Supabase Auth
- Não é necessário refatorar a Edge Function `send-invitation-email` — ela já funciona corretamente
- A correção estrutural (unificar todos os fluxos num único serviço de convite) seria ideal mas tem escopo maior do que o necessário agora

**Risco de reincidência sem correção:** Alto — qualquer convite feito pelo painel admin continuará sem enviar email.

