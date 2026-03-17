

# Plano: Controle de Repetição e Confirmação em Convites

---

## BLOCO 1 — Diagnóstico Objetivo

### Como o fluxo funciona hoje

Existem **3 pontos de criação** de convites e **2 ações sensíveis** sobre convites existentes:

**Criação:**
1. `InviteTeamModal` (Meu Time) — verifica pendentes pelo `status_convite = 'pending'`, mas não verifica tempo desde o último envio
2. `InviteModal` (Admin) — nenhuma validação de duplicata ou intervalo
3. `CreateCompanyModal` (Admin cria empresa) — nenhuma validação

**Ações sensíveis:**
- `handleCancelConvite` em `MeuTime.tsx` (linha 163) — execução direta, sem confirmação
- `handleResendConvite` em `MeuTime.tsx` (linha 170) — execução direta, sem confirmação. Cria novo convite + cancela o antigo imediatamente

### Hipótese principal
Não existe nenhuma trava de intervalo mínimo em nenhuma camada (frontend, backend ou banco). A única proteção é a validação do `InviteTeamModal` que bloqueia emails com convite `pending`, mas isso não impede reenvio rápido (que cancela o antigo e cria novo) nem convites via `InviteModal`/`CreateCompanyModal`.

### Hipóteses secundárias
1. O reenvio rápido gera múltiplos registros cancelados + novos pendentes, poluindo o histórico
2. Cancelar e reenviar são cliques diretos em ícones pequenos, sem feedback ou confirmação — risco alto de ação acidental
3. Não há proteção contra duplo-clique (o botão não é desabilitado durante a operação)

### Tipo de problema
**Combinação de camadas** — falta regra de negócio (intervalo mínimo) e falta UX de segurança (confirmação).

---

## BLOCO 2 — Fluxo Atual (AS-IS)

```text
CRIAÇÃO (InviteTeamModal):
  1. Abre modal → carrega pendingInvites (status=pending)
  2. Validação frontend: bloqueia se email já tem pending
  3. INSERT convites (sem checar tempo desde último envio)
  4. Chama send-invitation-email
  → LACUNA: não verifica se houve convite nos últimos 2min

CRIAÇÃO (InviteModal - Admin):
  1. Chama manage-users action convidar_usuario
  → LACUNA: nenhuma validação de duplicata ou intervalo

REENVIAR (MeuTime.tsx handleResendConvite):
  1. UPDATE convite antigo → canceled
  2. INSERT novo convite → pending
  3. Chama send-invitation-email
  → LACUNA: nenhum intervalo mínimo, nenhuma confirmação
  → LACUNA: sem loading state no botão (risco de duplo-clique)

CANCELAR (MeuTime.tsx handleCancelConvite):
  1. UPDATE convite → canceled
  → LACUNA: nenhuma confirmação antes da execução
  → LACUNA: sem loading state
```

### Onde o sistema deveria proteger e não protege
1. **Antes de inserir/reenviar**: checar `created_at` do último convite para o mesmo email na mesma empresa
2. **Antes de cancelar/reenviar**: exigir confirmação explícita
3. **Durante a execução**: desabilitar botões para evitar duplo-clique

---

## BLOCO 3 — Estado Esperado (TO-BE)

1. Para o mesmo email + empresa, novo convite ou reenvio só é permitido se o último convite (qualquer status) foi criado há mais de 2 minutos
2. A validação de intervalo existe no frontend (UX imediata) e no backend (segurança real)
3. Cancelar convite exige confirmação via AlertDialog antes da execução
4. Reenviar convite exige confirmação via AlertDialog antes da execução
5. Botões são desabilitados durante operações assíncronas
6. Feedback claro quando o intervalo mínimo não foi atingido (ex: "Aguarde X segundos para reenviar")

---

## BLOCO 4 — Plano de Correção em Etapas

### Etapa 1 — Validação de intervalo no backend (`manage-users`)

**Objetivo:** Na action `convidar_usuario`, antes de criar o convite, checar se existe convite para o mesmo email+empresa com `created_at` nos últimos 2 minutos.
**Verificação:** Query `convites WHERE email_destino = X AND empresa_id = Y AND created_at > now() - 2min`.
**Componente:** `supabase/functions/manage-users/index.ts`
**Risco:** Baixo — adição de query de leitura antes do insert.
**Validação:** Tentar criar convite duplicado em < 2min → erro retornado.

### Etapa 2 — Validação de intervalo no frontend (InviteTeamModal + MeuTime reenvio)

**Objetivo:** Antes de submeter novo convite ou reenviar, verificar `created_at` do último convite para aquele email.
**Componente:** `InviteTeamModal.tsx` (validação no `validate`), `MeuTime.tsx` (no `handleResendConvite`)
**Mudança:** Carregar último `created_at` por email ao abrir o modal. Mostrar erro inline "Aguarde X segundos" se < 2min.
**Risco:** Baixo.
**Validação:** Tentar reenviar imediatamente → botão bloqueado com mensagem.

### Etapa 3 — AlertDialog de confirmação para cancelar e reenviar

**Objetivo:** Adicionar confirmação explícita antes de cancelar ou reenviar convite.
**Componente:** `MeuTime.tsx`
**Mudança:** Adicionar estado `confirmAction` com tipo (`cancel` | `resend`) e o convite alvo. Renderizar `AlertDialog` com mensagem contextual. Executar a ação apenas após confirmação.
**Risco:** Baixo — mudança puramente de UX.
**Validação:** Clicar cancelar/reenviar → AlertDialog aparece → só executa ao confirmar.

### Etapa 4 — Loading state nos botões de ação

**Objetivo:** Impedir duplo-clique desabilitando botões durante operações.
**Componente:** `MeuTime.tsx`
**Mudança:** Adicionar estado `actionLoading` (string | null) com o ID do convite em execução. Desabilitar botões correspondentes.
**Risco:** Nenhum.

### Etapa 5 — Validação e deploy

**Verificações:**
1. Criar convite → esperar < 2min → tentar criar outro para mesmo email → bloqueado
2. Reenviar → confirmação aparece → confirmar → convite reenviado
3. Cancelar → confirmação aparece → confirmar → convite cancelado
4. Duplo-clique rápido → apenas uma execução
5. Após 2min → novo convite permitido normalmente

---

## BLOCO 5 — Critérios de Aceite

1. O sistema impede novo convite para o mesmo email antes de 2 minutos — tanto no frontend quanto no backend
2. Usuário recebe feedback claro com tempo restante quando tenta enviar cedo demais
3. Cancelar convite exige confirmação explícita via AlertDialog
4. Reenviar convite exige confirmação explícita via AlertDialog
5. Botões são desabilitados durante operações assíncronas
6. O fluxo continua funcional e sem fricção desnecessária após o intervalo mínimo
7. Nenhuma ação sensível é executada com clique único direto

---

## BLOCO 6 — Recomendação Final

**Recomendação: Correção intermediária**

**Justificativa:**
- O problema é uma combinação de falta de regra de negócio (intervalo) e falta de UX de segurança (confirmação)
- A correção envolve 2 arquivos principais (`MeuTime.tsx` e `InviteTeamModal.tsx`) + 1 edge function (`manage-users`)
- A validação de intervalo no backend garante que a proteção não depende apenas do frontend
- Os AlertDialogs usam componentes já existentes no projeto (`alert-dialog.tsx` do shadcn)
- Não requer mudanças no banco de dados — a query usa colunas já existentes (`email_destino`, `empresa_id`, `created_at`)
- Risco de reincidência sem correção: alto — qualquer clique acidental ou repetição rápida gera convites duplicados

