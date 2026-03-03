import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook para sincronizar UM lead específico em tempo real
 * 
 * O QUE FAZ:
 * - Quando alguém edita o lead, você vê a mudança instantaneamente
 * - Atualiza anotações, atividades, histórico automaticamente
 * 
 * COMO USAR:
 * const { lead, anotacoes, atividades, historico } = useLeadRealtime(leadId)
 */
export function useLeadRealtime(leadId: number | null) {
  const [lead, setLead] = useState<any>(null)
  const [anotacoes, setAnotacoes] = useState<any[]>([])
  const [atividades, setAtividades] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leadId) return

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

      // Anotações
      const { data: anotacoesData } = await supabase
        .from('anotacoes_lead')
        .select('*')
        .eq('id_lead', leadId)
        .order('created_at', { ascending: false })

      setAnotacoes(anotacoesData || [])

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
          setLead((prev: any) => ({ ...prev, ...payload.new }))
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

    // 6. Cleanup
    return () => {
      supabase.removeChannel(leadChannel)
      supabase.removeChannel(anotacoesChannel)
      supabase.removeChannel(atividadesChannel)
      supabase.removeChannel(historicoChannel)
    }
  }, [leadId])

  return { lead, setLead, anotacoes, setAnotacoes, atividades, setAtividades, historico, setHistorico, loading }
}
