import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook para sincronizar UM lead específico em tempo real
 * 
 * O QUE FAZ:
 * - Quando alguém edita o lead, você vê a mudança instantaneamente
 * - Atualiza anotações, atividades, histórico automaticamente
 * - Puxa dados de contatos_geral (interesse) e contatos_sdr (cidade, tipo_uso, etc.)
 * 
 * COMO USAR:
 * const { lead, anotacoes, atividades, historico, dadosContato } = useLeadRealtime(leadId)
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

export function useLeadRealtime(leadId: number | null) {
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

  useEffect(() => {
    if (!leadId) return

    let contatoGeralId: number | null = null
    let contatoWhatsapp: string | null = null

    // Busca dados do contato_geral e SDR baseado no interesse
    async function fetchContatoData(idContatoGeral: number | null, whatsapp: string | null, interesse?: string | null) {
      let currentInteresse = interesse ?? null

      // Busca interesse de contatos_geral (prioriza FK e faz fallback por whatsapp)
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
        contatoGeralId = contatoGeral.id
        contatoWhatsapp = contatoWhatsapp ?? contatoGeral.whatsapp ?? null
        currentInteresse = currentInteresse ?? contatoGeral.interesse ?? null
      }

      const whatsappLookup = contatoWhatsapp ?? whatsapp ?? contatoGeral?.whatsapp ?? null

      const dados: DadosContato = {
        interesse: currentInteresse,
        cidade: null, tipo_uso: null,
        consumo_mensal: null, gasto_mensal: null, dias_semana: null,
        telefone: contatoGeral?.whatsapp_padrao_pipedrive ?? null,
      }

      // Busca dados SDR por whatsapp (independente da FK de contato_geral)
      if (whatsappLookup) {
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

        // Se interesse não veio do contato_geral, inferir pelo cadastro SDR existente
        if (!currentInteresse) {
          currentInteresse = sdrMaq ? 'maquina_gelo' : sdrPur ? 'purificador' : null
          dados.interesse = currentInteresse
        }

        // Prioriza purificador apenas quando interesse indicar purificador, senão usa máquina
        if (currentInteresse === 'purificador' && sdrPur) {
          dados.cidade = sdrPur.cidade || null
          dados.tipo_uso = sdrPur.tipo_uso || null
        } else if (sdrMaq) {
          dados.cidade = sdrMaq.cidade || null
          dados.tipo_uso = sdrMaq.tipo_uso || null
          dados.consumo_mensal = sdrMaq.consumo_mensal
          dados.gasto_mensal = sdrMaq.gasto_mensal
          dados.dias_semana = sdrMaq.dias_semana
        }
      }

      setDadosContato(dados)
    }

    // 1. Busca dados iniciais
    async function fetchData() {
      // Lead principal
      const { data: leadData } = await supabase
        .from('leads_crm')
        .select(`
          *,
          funis(nome, tipo),
          etapas_funil(nome, ordem, cor)
        `)
        .eq('id', leadId)
        .single()

      setLead(leadData)

      if (leadData) {
        contatoGeralId = leadData.id_contato_geral
        contatoWhatsapp = leadData.whatsapp
        await fetchContatoData(contatoGeralId, contatoWhatsapp)
      }

      // Anotações
      const { data: anotacoesData } = await supabase
        .from('anotacoes_lead')
        .select('*')
        .eq('id_lead', leadId)
        .order('created_at', { ascending: false })

      setAnotacoes(anotacoesData || [])

      // Anexos de anotações
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

      // Atividades
      const { data: atividadesData } = await supabase
        .from('atividades')
        .select('*')
        .eq('id_lead', leadId)
        .order('data_vencimento')

      setAtividades(atividadesData || [])

      // Histórico
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

    // 2. Realtime no lead
    const leadChannel = supabase
      .channel(`lead-${leadId}`)
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
            contatoGeralId = newData.id_contato_geral ?? null
            contatoWhatsapp = newData.whatsapp ?? null
            fetchContatoData(contatoGeralId, contatoWhatsapp)
          }
        }
      )
      .subscribe()

    // 3. Realtime nas anotações (sem filtro para não perder DELETE)
    const anotacoesChannel = supabase
      .channel(`anotacoes-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anotacoes_lead' }, (payload) => {
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

    // 4. Realtime nas atividades (sem filtro para não perder DELETE)
    const atividadesChannel = supabase
      .channel(`atividades-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atividades' }, (payload) => {
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

    // 5. Realtime no histórico (sem filtro para não perder DELETE)
    const historicoChannel = supabase
      .channel(`historico-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historico_lead' }, (payload) => {
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

    // 6. Realtime em contatos_geral (interesse)
    const contatoGeralChannel = supabase
      .channel(`contato-geral-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contatos_geral' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          const sameContatoGeralId = !!contatoGeralId && isSameNumericId(updated.id, contatoGeralId)
          const sameWhatsapp =
            !!contatoWhatsapp &&
            normalizeWhatsapp(updated.whatsapp) !== '' &&
            normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsapp)

          if (sameContatoGeralId || sameWhatsapp) {
            const parsedContatoId = Number(updated.id)
            contatoGeralId = Number.isNaN(parsedContatoId) ? contatoGeralId : parsedContatoId
            contatoWhatsapp = updated.whatsapp ?? contatoWhatsapp
            fetchContatoData(contatoGeralId, contatoWhatsapp, updated.interesse)
          }
        }
      })
      .subscribe()

    // 7. Realtime em contatos_sdr_maquinagelo
    const sdrMaqChannel = supabase
      .channel(`sdr-maq-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contatos_sdr_maquinagelo' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          if (contatoWhatsapp && normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsapp)) {
            fetchContatoData(contatoGeralId, contatoWhatsapp)
          }
        }
      })
      .subscribe()

    // 8. Realtime em contatos_sdr_purificador
    const sdrPurChannel = supabase
      .channel(`sdr-pur-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contatos_sdr_purificador' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as any
          if (contatoWhatsapp && normalizeWhatsapp(updated.whatsapp) === normalizeWhatsapp(contatoWhatsapp)) {
            fetchContatoData(contatoGeralId, contatoWhatsapp)
          }
        }
      })
      .subscribe()

    // 9. Realtime nos anexos de anotação
    const anexosChannel = supabase
      .channel(`anexos-anotacao-${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anexos_anotacao' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAnexo = payload.new as any
          // Only add if it belongs to one of this lead's anotações
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
  }, [leadId])

  return { lead, setLead, anotacoes, setAnotacoes, atividades, setAtividades, historico, setHistorico, dadosContato, anexos, setAnexos, loading }
}
