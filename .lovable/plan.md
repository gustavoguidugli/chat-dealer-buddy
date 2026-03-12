

# Correção dos 3 Bugs no LeadDrawer

## Bug 1: Mudar interesse nao muda de funil

**Causa raiz:** Ao alterar o interesse, o código salva em `campos_extras` e `contatos_geral`, mas nunca move o lead para o funil correspondente. Os funis possuem um campo `tipo` que mapeia diretamente para o interesse (`maquina_gelo`, `purificador`, `outros`, `triagem`).

**Correção:** Após salvar o interesse, buscar o funil da mesma empresa cujo `tipo` corresponde ao novo interesse. Se encontrar, atualizar `id_funil` e `id_etapa_atual` (primeira etapa do novo funil) no `leads_crm`, e re-fetch metadados.

## Bug 2: Gasto mensal nao atualiza

**Causa raiz:** `handleSaveField` salva apenas em `leads_crm.campos_extras`. Porém, a exibicao prioriza `dadosContato.gasto_mensal` que vem da tabela `contatos_sdr_maquinagelo` (via `useLeadRealtime`). O valor salvo em `campos_extras` é ignorado porque `contatoHasValue` retorna `true` com o valor antigo do SDR.

**Correção:** Expandir `handleSaveField` para detectar campos mapeados a `dadosContato` e tambem atualizar a tabela SDR correspondente (`contatos_sdr_maquinagelo` para gasto_mensal, consumo_mensal, dias_semana, cidade, tipo_uso; `contatos_sdr_purificador` para cidade, tipo_uso quando interesse=purificador).

**Nota:** As tabelas SDR possuem RLS somente SELECT para admins. Sera necessario criar uma RPC `SECURITY DEFINER` para permitir a atualizacao.

## Bug 3: Nao consegue navegar entre campos editaveis

**Causa raiz:** O `onBlur` do Input chama `handleSaveField` que executa `setEditingField(null)`. Quando o usuario clica em outro campo, o `onBlur` dispara antes do `onClick` do novo campo, causando um re-render que elimina o target do click. O novo campo nunca entra em modo edicao.

**Correção:** Substituir `onBlur` direto por um `onBlur` com `requestAnimationFrame` delay, permitindo que o `onMouseDown` do proximo campo defina o novo `editingField` antes do blur processar. Usar `onMouseDown` (que dispara antes do blur) em vez de `onClick` nos campos.

---

## Implementacao

### Arquivos a editar:
1. **`src/components/crm/LeadDrawer.tsx`** — Todos os 3 bugs
2. **Migration SQL** — RPC para update SDR tables (bug 2)

### Detalhes tecnicos:

**Bug 1 — Interesse → Funil:**
```typescript
// After saving interesse, find matching funnel
const { data: targetFunil } = await supabase
  .from('funis')
  .select('id')
  .eq('id_empresa', lead.id_empresa)
  .eq('tipo', val) // val = 'maquina_gelo' | 'purificador' | 'outros'
  .eq('ativo', true)
  .limit(1)
  .maybeSingle();

if (targetFunil && targetFunil.id !== lead.id_funil) {
  // Get first etapa of target funnel
  const { data: firstEtapa } = await supabase
    .from('etapas_funil')
    .select('id')
    .eq('id_funil', targetFunil.id)
    .eq('ativo', true)
    .order('ordem')
    .limit(1)
    .maybeSingle();

  if (firstEtapa) {
    await supabase.from('leads_crm').update({
      id_funil: targetFunil.id,
      id_etapa_atual: firstEtapa.id,
    }).eq('id', lead.id);
    fetchMeta();
    onLeadChanged?.();
  }
}
```

**Bug 2 — RPC + handleSaveField:**
Nova RPC `update_contato_sdr_field` que atualiza campo na tabela SDR correta por whatsapp.

**Bug 3 — Blur/Click race:**
```typescript
// Use onMouseDown instead of onClick to fire before blur
onMouseDown={(e) => {
  e.preventDefault(); // prevent blur on current input
  setEditingField(campo.slug);
  setEditingValue(value);
}}
```

