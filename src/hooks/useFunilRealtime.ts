import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook para sincronizar o funil em tempo real
 * 
 * O QUE FAZ:
 * - Quando alguém move um card, TODOS veem a mudança instantaneamente
 * - Quando alguém cria um lead novo, aparece para todos
 * - Quando alguém deleta/marca como ganho/perdido, remove para todos
 * 
 * COMO USAR:
 * const leads = useFunilRealtime(funilId, etapaId)
 */
export function useFunilRealtime(funilId: number, etapaId?: number) {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [etiquetaVersion, setEtiquetaVersion] = useState(0)
  const [atividadeVersion, setAtividadeVersion] = useState(0)

  useEffect(() => {
    if (!funilId) {
      setLoading(false)
      return
    }

    // 1. Busca os leads iniciais (primeira vez)
    async function fetchLeads() {
      let query = supabase
        .from('leads_crm')
        .select(`
          *,
          funis(nome),
          etapas_funil(nome, ordem, cor)
        `)
        .eq('id_funil', funilId)
        .eq('status', 'aberto')
        .eq('ativo', true)

      if (etapaId) {
        query = query.eq('id_etapa_atual', etapaId)
      }

      const { data } = await query.order('ordem_no_funil')
      setLeads(data || [])
      setLoading(false)
    }

    fetchLeads()

    // 2. Escuta mudanças em tempo real nos leads
    const channel = supabase
      .channel(`funil-${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads_crm',
          filter: `id_funil=eq.${funilId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [...prev, payload.new])
          }

          if (payload.eventType === 'UPDATE') {
            if (payload.new?.status !== 'aberto' || payload.new?.ativo === false) {
              setLeads((prev) => prev.filter((lead) => lead.id !== payload.new.id))
            } else {
              setLeads((prev) =>
                prev.map((lead) =>
                  lead.id === payload.new.id ? { ...lead, ...payload.new } : lead
                )
              )
            }
          }

          if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old?.id))
          }
        }
      )
      .subscribe()

    // 3. Escuta mudanças em tempo real nas etiquetas dos leads
    const etiquetaChannel = supabase
      .channel(`funil-etiquetas-${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_etiquetas',
        },
        () => {
          // Incrementa version para forçar re-enrich das etiquetas
          setEtiquetaVersion((v) => v + 1)
        }
      )
      .subscribe()

    // 4. Cleanup
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(etiquetaChannel)
    }
  }, [funilId, etapaId])

  return { leads, setLeads, loading, etiquetaVersion }
}
