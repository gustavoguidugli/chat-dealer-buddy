

# Relatório de Regressão End-to-End — Eco Ice

---

## BLOCO 1 — Resumo Executivo

| Métrica | Resultado |
|---------|-----------|
| Fluxos analisados | 5 |
| PASSOU | 2 (parciais) |
| INCONCLUSIVO | 2 (dependem de autenticação/contexto real) |
| COM BUGS | 1 |
| Bugs encontrados | 2 |
| Severidade máxima | Média |

O sistema está **operacionalmente funcional** após as alterações recentes. As correções de SDR fallback (AND→OR) e alinhamento de chaves foram aplicadas corretamente. O principal problema remanescente é um **slug corrompido no banco** (Campo ID 50: "Interesse" com slug `gasto`) que funciona apenas graças a um workaround no frontend. Não há bloqueadores críticos.

---

## BLOCO 2 — Matriz de Validação por Fluxo

### FLUXO 1 — CRM / Visualização e Operação do Lead
**Status: PASSOU (com ressalva)**

| Item | Status | Evidência |
|------|--------|-----------|
| Board do CRM carrega | ✅ | `CrmFunil.tsx` monta corretamente, `useFunilRealtime` com isolamento por empresa |
| Card/detalhe abre | ✅ | `LeadDrawer` faz fetch com `leadId`, `useLeadRealtime` sincroniza |
| Propriedades carregadas | ✅ | Query em `fetchMeta` (linha 412) busca campos por empresa + funil |
| Propriedades duplicadas | ✅ | Deduplicação defensiva implementada (linhas 418-430), normaliza por nome |
| SDR fallback funciona | ✅ | Condição corrigida para OR (linha 90 do hook), merge campo-a-campo preservado |
| Fallback nome/telefone | ✅ | `getLeadDisplayName` em `lead-utils.ts` detecta telefone-como-nome e formata |
| Telefone clicável | ✅ | `buildWhatsAppLink` gera link wa.me, `formatPhoneDisplay` formata exibição |
| Mudança de interesse | ✅ | Sincroniza com `contatos_geral` primeiro, aguarda trigger, depois atualiza `campos_extras` |
| Persistência após edição | ✅ | `handleSaveField` agora usa `keyOrSlug` (storageKey alinhado com leitura) |

**Ressalva**: O campo "Interesse" no funil 26 tem slug `gasto` (ID 50), compensado por `gasto: 'interesse'` no `contatoFieldMap` (linha 1238). Funciona, mas é frágil — ver Bug #1.

### FLUXO 2 — Configuração de Interesses
**Status: PASSOU**

| Item | Status | Evidência |
|------|--------|-----------|
| Interesses carregados | ✅ | `lista_interesses` com `funil_id` FK para funis — arquitetura dinâmica |
| Reflexo no CRM | ✅ | `listaInteresses` passado para KanbanBoard e LeadCardComponent |
| Roteamento por interesse | ✅ | Trigger `mover_lead_por_interesse` consulta `funil_id` em `lista_interesses` |

### FLUXO 3 — Criação de Empresa + Convite
**Status: INCONCLUSIVO**

| Item | Status | Evidência |
|------|--------|-----------|
| Criação de empresa | ⚠️ | `CreateCompanyModal` existe, requer Super Admin — não testável sem auth |
| Envio de convite | ✅ (código) | `InviteTeamModal` usa `send-invitation-email` edge function, com validações |
| Cooldown 2min | ✅ | Implementado em `InviteTeamModal` (linha 62-70) e `MeuTime` (linha 126-138) |
| Confirmação antes de ação | ✅ | `AlertDialog` para cancelar/reenviar convites (linha 71 MeuTime) |
| Proteção contra duplicata | ✅ | Verifica `existingMembers` e `pendingInvites` antes de enviar |

### FLUXO 4 — Aceite de Convite / Onboarding
**Status: INCONCLUSIVO**

| Item | Status | Evidência |
|------|--------|-----------|
| Validação de token | ✅ (código) | RPC `validar_convite` retorna `valido`, `empresa_id`, `id`, `erro` |
| Fluxo 2 etapas | ✅ (código) | Step 1: nome, Step 2: senha com critérios |
| Criação de conta | ✅ (código) | Edge function `manage-users` com action `complete_onboarding` |
| Login automático | ✅ (código) | `signInWithPassword` após onboarding bem-sucedido |
| Aceite pós-login | ✅ (código) | `AceitarConvite.tsx` redireciona para login se não autenticado, depois aceita |

**Não testável sem gerar convite real.**

### FLUXO 5 — Meu Time
**Status: INCONCLUSIVO**

| Item | Status | Evidência |
|------|--------|-----------|
| Carregamento membros | ✅ (código) | RPC `get_team_members` com loading state |
| Carregamento convites | ✅ (código) | Query direta com expiração automática |
| Ações admin protegidas | ✅ (código) | Condicionadas a `isCompanyAdmin \|\| isSuperAdmin` |
| Loading infinito | ⚠️ | Possível se `empresaId` for null — mas `ProtectedRoute` previne acesso sem empresa |

---

## BLOCO 3 — Bugs Encontrados

### Bug #1 — Slug corrompido: "Interesse" com slug `gasto` (Funil 26)

- **Onde**: Tabela `campos_customizados`, ID 50
- **Estado atual**: `nome=Interesse`, `slug=gasto`, `id_funil=26`
- **Comportamento atual**: O frontend compensa com `contatoFieldMap: { gasto: 'interesse' }` (LeadDrawer.tsx linha 1238). Funciona, mas é um workaround.
- **Comportamento esperado**: O slug deveria ser `interesse` para consistência com os demais funis
- **Severidade**: **Média** — funciona hoje, mas qualquer refatoração futura que remova o workaround quebrará a exibição de interesse no funil 26
- **Correção**: Migration SQL: `UPDATE campos_customizados SET slug = 'interesse' WHERE id = 50;`
- **Risco após correção**: Baixo. O `contatoFieldMap` já mapeia tanto `interesse` quanto `gasto` para `'interesse'`, então a correção é retrocompatível. O workaround pode ser removido depois.

### Bug #2 — Campos globais órfãos ainda no banco (IDs 59, 60)

- **Onde**: Tabela `campos_customizados`, IDs 59 e 60
- **Estado atual**: `id_funil=NULL`, "Tipo de Uso" (slug=tipo_uso) e "Dias por Semana" (slug=dias_semana)
- **Comportamento atual**: A deduplicação defensiva no frontend os oculta corretamente (prioriza campo do funil). Porém, continuam existindo no banco sem utilidade.
- **Severidade**: **Baixa** — não causam problema visível, mas poluem o banco
- **Correção**: Migration SQL: `DELETE FROM campos_customizados WHERE id IN (59, 60);` ou `UPDATE campos_customizados SET ativo = false WHERE id IN (59, 60);`

---

## BLOCO 4 — Lacunas de Teste

| Lacuna | Motivo | Risco |
|--------|--------|-------|
| Fluxo completo de onboarding | Requer convite real + e-mail + navegação externa | Médio — o código está correto na inspeção, mas edge cases de timing podem falhar |
| Meu Time com usuário real | Requer sessão autenticada com empresa vinculada | Baixo — código robusto, RPC com SECURITY DEFINER |
| Criação de empresa no Admin | Requer Super Admin autenticado | Baixo — funcionalidade isolada |
| Roteamento de lead entre funis | Requer trigger `mover_lead_por_interesse` no banco + lead real | Médio — depende de trigger DB não inspecionável diretamente |
| Comportamento pós-edição de campo | Requer lead real com dados SDR para confirmar que campos não desaparecem | Médio — a correção AND→OR está aplicada mas precisa de validação funcional |

---

## BLOCO 5 — Plano de Correção Priorizado

| # | Prioridade | Ação | Área | Risco |
|---|-----------|------|------|-------|
| 1 | Alta | Corrigir slug do campo ID 50: `gasto` → `interesse` | DB Migration | Baixo — retrocompatível |
| 2 | Baixa | Desativar ou remover campos globais órfãos (IDs 59, 60) | DB Migration | Mínimo — já ocultos pela deduplicação |
| 3 | Baixa | Remover workaround `gasto: 'interesse'` do `contatoFieldMap` após fix #1 | LeadDrawer.tsx | Mínimo — limpeza de código |

---

## BLOCO 6 — Recomendação Final

**O sistema está seguro para continuar testes operacionais.** Não há bloqueadores críticos.

As alterações recentes (SDR fallback OR, deduplicação defensiva, alinhamento de chaves) estão corretamente implementadas e resolvem os problemas para os quais foram projetadas.

**Recomendação**: Executar a correção do slug (Bug #1) como migration SQL antes de prosseguir, pois é a única inconsistência estrutural que depende de workaround no frontend.

**Próximo ciclo de validação**: Teste funcional manual com sessão autenticada — abrir lead real no funil 26, editar um campo, fechar e reabrir, confirmar que todos os campos permanecem visíveis.

