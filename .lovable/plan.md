

## Análise de Bugs Encontrados

Após auditar o código atual, identifiquei **3 bugs** introduzidos ou persistentes nas implementações recentes:

---

### BUG 1 — Ordem invertida no LeadDrawer (interesse)

**Arquivo:** `src/components/crm/LeadDrawer.tsx`, linhas 1270-1335

No `LeadDrawer`, quando o usuário muda o interesse de um lead, a ordem das operações é:
1. Atualiza `campos_extras` no `leads_crm` (linha 1272)
2. Depois atualiza `contatos_geral.interesse` (linha 1328-1331)

Isso está **invertido** em relação ao que fizemos no `LeadCardComponent.tsx` (que faz contatos_geral primeiro, depois campos_extras). O problema: o UPDATE em `campos_extras` gera um evento Realtime **antes** do trigger de movimentação ser disparado, causando o mesmo "flicker" que corrigimos no card.

**Correção:** Inverter a ordem — primeiro `contatos_geral.update({interesse})`, depois `campos_extras`.

---

### BUG 2 — LeadDrawer não fecha/recarrega após move por interesse

**Arquivo:** `src/components/crm/LeadDrawer.tsx`, linhas 1337-1340

Quando o interesse é alterado e o trigger do banco move o lead para outro funil, o drawer chama `fetchMeta()` e `onLeadChanged()`. Porém, `fetchMeta()` busca as etapas do funil **antigo** (usando `l.id_funil` na linha 408) porque o lead no banco já foi movido pelo trigger mas o estado local `lead` ainda tem o `id_funil` antigo. Isso causa campos e etapas inconsistentes no drawer.

**Correção:** Após alterar interesse, fazer um `setTimeout` curto antes de chamar `fetchMeta()` para dar tempo ao trigger de atualizar o `leads_crm`, ou melhor, ler o lead atualizado diretamente e atualizar o estado local antes de buscar os metadados.

---

### BUG 3 — Warning de ref no AlertDialogFooter

**Console:** `Function components cannot be given refs` no `LeadDrawer`

Este é um warning do React sobre `AlertDialogFooter` não usar `forwardRef`. É cosmético e não causa bug funcional, mas polui o console.

**Correção:** Não é prioritário, mas pode ser resolvido adicionando `forwardRef` ao `AlertDialogFooter`.

---

### Plano de Correção

**Etapa 1: Corrigir ordem de operações no LeadDrawer**
- Mover o bloco de sync `contatos_geral` (linhas 1294-1335) para ANTES do update de `campos_extras` (linha 1272)
- Manter a mesma ordem que já funciona no `LeadCardComponent.tsx`

**Etapa 2: Corrigir refresh do drawer após move**  
- Após o sync com `contatos_geral`, aguardar brevemente e re-fetch o lead para capturar o novo `id_funil` definido pelo trigger

**Etapa 3 (opcional): Resolver warning de ref**
- Adicionar `forwardRef` ao `AlertDialogFooter`

Risco: Baixo. São ajustes de ordem de execução e timing, sem mudança de lógica.

