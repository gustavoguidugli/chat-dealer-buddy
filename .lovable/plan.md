

# Plano: Corrigir campo "Cidade" no LeadDrawer

## Problema identificado

1. **Cidade aparecendo como Select dropdown** — Na screenshot, "Cidade" está renderizando como um dropdown (igual ao campo Interesse). Isso acontece porque o campo está sendo incorretamente detectado como `isInteresseField`, ou há outro bug no rendering.

2. **Edição salva no lugar errado** — Quando o usuário edita "Cidade", o valor vai para `leads_crm.campos_extras`, mas a leitura prioriza `dadosContato.cidade` (que vem de `contatos_sdr_purificador`). Se `dadosContato.cidade` for null, o campo mostra vazio mesmo com valor salvo em `campos_extras`.

3. **Sem realtime para cidade** — O hook `useLeadRealtime` já escuta mudanças em `contatos_sdr_purificador` e atualiza `dadosContato.cidade` via `fetchContatoData`. Porém, o campo precisa refletir isso corretamente.

## Solução

### 1. `LeadDrawer.tsx` — Corrigir renderização e edição do campo Cidade

- Garantir que "Cidade" **não** entre no branch `isInteresseField` (verificar que o slug/nome não está sendo capturado incorretamente).
- Quando o campo é "cidade" e o valor vem de `dadosContato`, a edição deve salvar de volta em `leads_crm.campos_extras` (como já faz), mas o valor exibido deve usar a cascata: `dadosContato.cidade` → `campos_extras.cidade` → vazio.
- O campo deve ser um **Input editável** normal (texto), não um Select.

### 2. Realtime já funciona

O hook `useLeadRealtime` já tem canal `sdr-pur-${leadId}` que escuta `contatos_sdr_purificador` e chama `fetchContatoData` quando o whatsapp bate. Quando `cidade` é atualizada na tabela, `dadosContato.cidade` será atualizado automaticamente, e o componente re-renderiza.

### Mudanças concretas

**Arquivo: `src/components/crm/LeadDrawer.tsx`**
- Verificar/corrigir a condição `isInteresseField` para excluir explicitamente "cidade" — atualmente `isInteresseField` checa `campo.slug === 'interesse' || campo.slug === 'gasto'`, o que não deveria pegar "cidade". Preciso verificar se há algum outro fator causando o dropdown no "Cidade" (possivelmente o slug no DB está errado).
- Se o slug no DB estiver mapeado incorretamente, corrigir o mapeamento.

Nenhuma mudança no Supabase é necessária — a estrutura de dados está correta.

