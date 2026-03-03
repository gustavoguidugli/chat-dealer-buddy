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

    // 2. Realtime no lead
    const leadChannel = supabase
      .channel(`lead-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads_crm', filter: `id=eq.${leadId}` },
        (payload) => setLead((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe()

    // 3. Realtime nas anotações
    const anotacoesChannel = supabase
      .channel(`anotacoes-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'anotacoes_lead', filter: `id_lead=eq.${leadId}` },
        (payload) => setAnotacoes((prev) => [payload.new, ...prev])
      )
      .subscribe()

    // 4. Realtime nas atividades
    const atividadesChannel = supabase
      .channel(`atividades-${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atividades', filter: `id_lead=eq.${leadId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAtividades((prev) => [...prev, payload.new])
          }
          if (payload.eventType === 'UPDATE') {
            setAtividades((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            )
          }
          if (payload.eventType === 'DELETE') {
            setAtividades((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // 5. Realtime no histórico
    const historicoChannel = supabase
      .channel(`historico-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historico_lead', filter: `id_lead=eq.${leadId}` },
        (payload) => setHistorico((prev) => [payload.new, ...prev])
      )
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
