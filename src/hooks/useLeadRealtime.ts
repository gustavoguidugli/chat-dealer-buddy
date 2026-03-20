import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook para sincronizar UM lead específico em tempo real.
 * Todos os channels incluem filtro de empresa para compatibilidade com RLS.
 */

export interface DadosContato {
  interesse: string | null
  cidade: string | null
  tipo_uso: string | null
  consumo_mensal: number | null
  gasto_mensal: number | null
  dias_semana: number | null
  telefone: string | null
}

export function useLeadRealtime(leadId: number | null, empresaId: number | null) {
  const [lead, setLead] = useState<any>(null)
  const [anotacoes, setAnotacoes] = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [dadosContato, setDadosContato] = useState<DadosContato>({
    interesse: null, cidade: null, tipo_uso: null,
    consumo_mensal: null, gasto_mensal: null, dias_semana: null, telefone: null,
  })
  const [anexos, setAnexos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const contatoGeralIdRef = useRef<number | null>(null)
  const contatoWhatsappRef = useRef<string | null>(null)

  useEffect(() => {
    if (!leadId || !empresaId) return

    let cancelled = false

    // Reset state for new lead
    setLoading(true)
    setLead(null)
    setAnotacoes([])
    setAtividades([])
    setHistorico([])
    setAnexos([])
    setDadosContato({ interesse: null, cidade: null, tipo_uso: null, consumo_mensal: null, gasto_mensal: null, dias_semana: null, telefone: null })

    contatoGeralIdRef.current = null
    contatoWhatsappRef.current = null

    // Busca dados do contato_geral e SDR, usando campos_extras do lead como fonte primária
    async function fetchContatoData(idContatoGeral: number | null, whatsapp: string | null, interesse?: string | null, leadData?: any) {
      let currentInteresse = interesse ?? null

      let contatoGeral: {
        id: number
        interesse: string | null
        whatsapp: string | null
        whatsapp_padrao_pipedrive: string | null
      } | null = null

      if (idContatoGeral) {
        const { data: contatoGeralById } = await supabase
          .from('contatos_geral')
          .select('id, interesse, whatsapp, whatsapp_padrao_pipedrive')
          .eq('id', idContatoGeral)
          .maybeSingle()
        contatoGeral = contatoGeralById
      }

      if (!contatoGeral && whatsapp) {
        const { data: contatoGeralByWhatsapp } = await supabase
          .from('contatos_geral')
          .select('id, interesse, whatsapp, whatsapp_padrao_pipedrive')
          .eq('whatsapp', whatsapp)
          .limit(1)
          .maybeSingle()
        contatoGeral = contatoGeralByWhatsapp
      }

      if (contatoGeral) {
        contatoGeralIdRef.current = contatoGeral.id
        contatoWhatsappRef.current = contatoWhatsappRef.current ?? contatoGeral.whatsapp ?? null
        currentInteresse = currentInteresse ?? contatoGeral.interesse ?? null
      }

      const whatsappLookup = contatoWhatsappRef.current ?? whatsapp ?? contatoGeral?.whatsapp ?? null

      // Start with campos_extras from the lead as primary source
      const camposExtras = leadData?.campos_extras ?? lead?.campos_extras ?? {}

      const dados: DadosContato = {
        interesse: currentInteresse,
        cidade: camposExtras.cidade ?? null,
        tipo_uso: camposExtras.tipo_uso ?? null,
        consumo_mensal: camposExtras.consumo_mensal ?? null,
        gasto_mensal: camposExtras.gasto_mensal ?? null,
        dias_semana: camposExtras.dias_semana ?? null,
        telefone: contatoGeral?.whatsapp_padrao_pipedrive ?? null,
      }

      // Fallback: enrich from SDR tables if campos_extras is missing data
      if (whatsappLookup) {
        const needsSdrFallback = !dados.cidade || !dados.tipo_uso || dados.consumo_mensal == null || dados.gasto_mensal == null || dados.dias_semana == null

        if (needsSdrFallback) {
          const [sdrMaqRes, sdrPurRes] = await Promise.all([
            supabase
              .from('contatos_sdr_maquinagelo')
              .select('cidade, tipo_uso, consumo_mensal, gasto_mensal, dias_semana')
              .eq('whatsapp', whatsappLookup)
              .limit(1)
              .maybeSingle(),
            supabase
              .from('contatos_sdr_purificador')
              .select('cidade, tipo_uso')
              .eq('whatsapp', whatsappLookup)
              .limit(1)
              .maybeSingle(),
          ])

          const sdrMaq = sdrMaqRes.data
          const sdrPur = sdrPurRes.data

          // Use whichever SDR table has data (no hardcoded interest check)
          if (sdrPur && (sdrPur.cidade || sdrPur.tipo_uso)) {
            dados.cidade = dados.cidade || sdrPur.cidade || null
            dados.tipo_uso = dados.tipo_uso || sdrPur.tipo_uso || null
          }
          if (sdrMaq) {
            dados.cidade = dados.cidade || sdrMaq.cidade || null
            dados.tipo_uso = dados.tipo_uso || sdrMaq.tipo_uso || null
            dados.consumo_mensal = dados.consumo_mensal ?? sdrMaq.consumo_mensal
            dados.gasto_mensal = dados.gasto_mensal ?? sdrMaq.gasto_mensal
            dados.dias_semana = dados.dias_semana ?? sdrMaq.dias_semana
          }
        }
      }

      setDadosContato(dados)
    }

    // 1. Busca dados iniciais
    async function fetchData() {
      const { data: leadData } = await supabase
        .from('leads_crm')
        .select(`*, funis(nome, tipo), etapas_funil(nome, ordem, cor)`)
        .eq('id', leadId)
        .single()

      setLead(leadData)

      if (leadData) {
        contatoGeralIdRef.current = leadData.id_contato_geral
        contatoWhatsappRef.current = leadData.whatsapp
        await fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current, undefined, leadData)
      }

      const { data: anotacoesData } = await supabase
        .from('anotacoes_lead')
        .select('*')
        .eq('id_lead', leadId)
        .order('created_at', { ascending: false })
      setAnotacoes(anotacoesData || [])

      const anotacaoIds = (anotacoesData || []).map((a: any) => a.id)
      if (anotacaoIds.length > 0) {
        const { data: anexosData } = await supabase
          .from('anexos_anotacao')
          .select('*')
          .in('id_anotacao', anotacaoIds)
          .order('created_at', { ascending: true })
        setAnexos(anexosData || [])
      } else {
        setAnexos([])
      }

      const { data: atividadesData } = await supabase
        .from('atividades')
        .select('*')
        .eq('id_lead', leadId)
        .order('data_vencimento')
      setAtividades(atividadesData || [])

      const { data: historicoData } = await supabase
        .from('historico_lead')
        .select('*')
        .eq('id_lead', leadId)
        .order('created_at', { ascending: false })
      setHistorico(historicoData || [])
      setLoading(false)
    }

    fetchData()

    const isCurrentLead = (value: unknown) => Number(value) === Number(leadId)
    const isSameNumericId = (a: unknown, b: unknown) => {
      const aNumber = Number(a)
      const bNumber = Number(b)
      if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) return false
      return aNumber === bNumber
    }
    const normalizeWhatsapp = (value: unknown) => String(value ?? '').replace(/\D/g, '')
    const sortAtividades = (items: any[]) => [...items].sort(
      (a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
    )

    // 2. Realtime no lead (filtrado por id — OK, é específico)
    const leadChannel = supabase
      .channel(`lead-${leadId}-${empresaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_crm', filter: `id=eq.${leadId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setLead(null)
            return
          }
          const newData = payload.new as any
          const oldData = payload.old as any
          setLead((prev: any) => ({ ...prev, ...newData }))

          const contatoChanged =
            !isSameNumericId(newData.id_contato_geral, oldData?.id_contato_geral) ||
            normalizeWhatsapp(newData.whatsapp) !== normalizeWhatsapp(oldData?.whatsapp)

          if (contatoChanged) {
            contatoGeralIdRef.current = newData.id_contato_geral ?? null
            contatoWhatsappRef.current = newData.whatsapp ?? null
            fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current)
          }
        }
      )
      .subscribe()

    // 3. Realtime nas anotações (com filtro de empresa)
    const anotacoesChannel = supabase
      .channel(`anotacoes-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'anotacoes_lead',
        filter: `id_empresa=eq.${empresaId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!isCurrentLead((payload.new as any).id_lead)) return
          setAnotacoes((prev) => [payload.new, ...prev])
          return
        }

        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any
          setAnotacoes((prev) => {
            const withoutCurrent = prev.filter((item) => item.id !== updated.id)
            if (!isCurrentLead(updated.id_lead)) return withoutCurrent
            return [updated, ...withoutCurrent]
          })
          return
        }

        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any
          setAnotacoes((prev) => prev.filter((item) => item.id !== oldRow.id))
        }
      })
      .subscribe()

    // 4. Realtime nas atividades (com filtro de empresa)
    const atividadesChannel = supabase
      .channel(`atividades-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'atividades',
        filter: `id_empresa=eq.${empresaId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!isCurrentLead((payload.new as any).id_lead)) return
          setAtividades((prev) => sortAtividades([...prev.filter((a) => a.id !== (payload.new as any).id), payload.new]))
          return
        }

        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any
          setAtividades((prev) => {
            const withoutCurrent = prev.filter((a) => a.id !== updated.id)
            if (!isCurrentLead(updated.id_lead)) return withoutCurrent
            return sortAtividades([...withoutCurrent, updated])
          })
          return
        }

        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any
          setAtividades((prev) => prev.filter((a) => a.id !== oldRow.id))
        }
      })
      .subscribe()

    // 5. Realtime no histórico (com filtro de empresa)
    const historicoChannel = supabase
      .channel(`historico-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'historico_lead',
        filter: `id_empresa=eq.${empresaId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (!isCurrentLead((payload.new as any).id_lead)) return
          setHistorico((prev) => [payload.new, ...prev])
          return
        }

        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any
          setHistorico((prev) => {
            const withoutCurrent = prev.filter((item) => item.id !== updated.id)
            if (!isCurrentLead(updated.id_lead)) return withoutCurrent
            return [updated, ...withoutCurrent]
          })
          return
        }

        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any
          setHistorico((prev) => prev.filter((item) => item.id !== oldRow.id))
        }
      })
      .subscribe()

    // 6. Realtime em contatos_geral (interesse) — filtro por empresa_id
    const contatoGeralChannel = supabase
      .channel(`contato-geral-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contatos_geral',
        filter: `empresa_id=eq.${empresaId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          const sameContatoGeralId = !!contatoGeralIdRef.current && isSameNumericId(updated.id, contatoGeralIdRef.current)
          const sameWhatsapp =
            !!contatoWhatsappRef.current &&
            normalizeWhatsapp(updated.whatsapp) !== '' &&
            normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsappRef.current)

          if (sameContatoGeralId || sameWhatsapp) {
            const parsedContatoId = Number(updated.id)
            contatoGeralIdRef.current = Number.isNaN(parsedContatoId) ? contatoGeralIdRef.current : parsedContatoId
            contatoWhatsappRef.current = updated.whatsapp ?? contatoWhatsappRef.current
            fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current, updated.interesse)
          }
        }
      })
      .subscribe()

    // 7. Realtime em contatos_sdr_maquinagelo (sem filtro de empresa — id_empresa referencia empresas_sdr_maquinagelo, não empresas_geral)
    const sdrMaqChannel = supabase
      .channel(`sdr-maq-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contatos_sdr_maquinagelo',
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          if (contatoWhatsappRef.current && normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsappRef.current)) {
            fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current)
          }
        }
      })
      .subscribe()

    // 8. Realtime em contatos_sdr_purificador (sem filtro de empresa — id_empresa referencia empresas_sdr_purificador, não empresas_geral)
    const sdrPurChannel = supabase
      .channel(`sdr-pur-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contatos_sdr_purificador',
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          if (contatoWhatsappRef.current && normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsappRef.current)) {
            fetchContatoData(contatoGeralIdRef.current, contatoWhatsappRef.current)
          }
        }
      })
      .subscribe()

    // 9. Realtime nos anexos de anotação (filtro por id_empresa)
    const anexosChannel = supabase
      .channel(`anexos-anotacao-${leadId}-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'anexos_anotacao',
        filter: `id_empresa=eq.${empresaId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAnexo = payload.new as any
          setAnexos((prev) => {
            if (prev.some((a) => a.id === newAnexo.id)) return prev
            return [...prev, newAnexo]
          })
          return
        }
        if (payload.eventType === 'DELETE') {
          const oldAnexo = payload.old as any
          setAnexos((prev) => prev.filter((a) => a.id !== oldAnexo.id))
          return
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any
          setAnexos((prev) => prev.map((a) => a.id === updated.id ? updated : a))
        }
      })
      .subscribe()

    // 10. Cleanup
    return () => {
      supabase.removeChannel(leadChannel)
      supabase.removeChannel(anotacoesChannel)
      supabase.removeChannel(atividadesChannel)
      supabase.removeChannel(historicoChannel)
      supabase.removeChannel(contatoGeralChannel)
      supabase.removeChannel(sdrMaqChannel)
      supabase.removeChannel(sdrPurChannel)
      supabase.removeChannel(anexosChannel)
    }
  }, [leadId, empresaId])

  return { lead, setLead, anotacoes, setAnotacoes, atividades, setAtividades, historico, setHistorico, dadosContato, anexos, setAnexos, loading }
}
