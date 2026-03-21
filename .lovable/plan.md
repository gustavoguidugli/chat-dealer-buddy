

# Optimize useLeadRealtime: skip unnecessary SDR queries + show lead instantly

## File: `src/hooks/useLeadRealtime.ts`

### Change 1 — Early return in `fetchContatoData` when `campos_extras` has all data

Before any `contatos_geral` or SDR queries, check if `campos_extras` already has the needed fields. If so, set `dadosContato` directly and return without querying.

Add after the `camposExtras` variable (around line 93):

```ts
const jaTemTudo = camposExtras.cidade && camposExtras.tipo_uso;
if (jaTemTudo && !idContatoGeral && !whatsapp) {
  if (!cancelled) setDadosContato({
    interesse: interesse ?? camposExtras.interesse ?? null,
    cidade: camposExtras.cidade,
    tipo_uso: camposExtras.tipo_uso,
    consumo_mensal: camposExtras.consumo_mensal ?? null,
    gasto_mensal: camposExtras.gasto_mensal ?? null,
    dias_semana: camposExtras.dias_semana ?? null,
    telefone: null,
  });
  return;
}
```

This eliminates up to 3 queries (contatos_geral, contatos_sdr_maquinagelo, contatos_sdr_purificador) when campos_extras is complete.

### Change 2 — Show lead immediately, fetch secondary data in background

In `fetchData()` (line 144+), split into two phases:

**Phase 1 (blocking):** Fetch `leads_crm` → `setLead` → `setLoading(false)`

**Phase 2 (non-blocking):** Fire anotações, atividades, histórico, and contato data fetches in parallel without awaiting them before setting loading.

```ts
async function fetchData() {
  // Phase 1: show lead immediately
  const { data: leadData } = await supabase
    .from('leads_crm')
    .select(`*, funis(nome, tipo), etapas_funil(nome, ordem, cor)`)
    .eq('id', leadId)
    .single()

  if (cancelled) return
  setLead(leadData)
  setLoading(false) // ← UI unblocked here

  // Phase 2: enrich in background (no await chain)
  if (leadData) {
    contatoGeralIdRef.current = leadData.id_contato_geral
    contatoWhatsappRef.current = leadData.whatsapp
    fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current, undefined, leadData)
  }

  // Fire all secondary fetches in parallel
  fetchSecondaryData(leadId)
}

async function fetchSecondaryData(id: number) {
  const [anotacoesRes, atividadesRes, historicoRes] = await Promise.all([
    supabase.from('anotacoes_lead').select('*').eq('id_lead', id).order('created_at', { ascending: false }),
    supabase.from('atividades').select('*').eq('id_lead', id).order('data_vencimento'),
    supabase.from('historico_lead').select('*').eq('id_lead', id).order('created_at', { ascending: false }),
  ])
  if (cancelled) return

  setAnotacoes(anotacoesRes.data || [])
  setAtividades(atividadesRes.data || [])
  setHistorico(historicoRes.data || [])

  // Fetch anexos based on anotações
  const anotacaoIds = (anotacoesRes.data || []).map((a: any) => a.id)
  if (anotacaoIds.length > 0) {
    const { data: anexosData } = await supabase
      .from('anexos_anotacao').select('*')
      .in('id_anotacao', anotacaoIds)
      .order('created_at', { ascending: true })
    if (!cancelled) setAnexos(anexosData || [])
  } else {
    if (!cancelled) setAnexos([])
  }
}
```

This also parallelizes the 3 secondary queries (previously sequential) into a single `Promise.all`.

### Summary

- **Queries saved**: Up to 3 SDR queries skipped when `campos_extras` is complete
- **Sequential → parallel**: 3 secondary fetches now run concurrently via `Promise.all`
- **Perceived speed**: Lead drawer opens instantly after 1 query instead of waiting for 5-9
- **Single file change**: `src/hooks/useLeadRealtime.ts`

