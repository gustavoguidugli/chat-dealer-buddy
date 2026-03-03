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

  useEffect(() => {
    if (!funilId) return

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

    // 2. Escuta mudanças em tempo real
    const channel = supabase
      .channel(`funil-${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leads_crm',
          filter: `id_funil=eq.${funilId}`
        },
        (payload) => {
          // Quando alguém CRIA um lead novo
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [...prev, payload.new])
          }

          // Quando alguém ATUALIZA um lead (move de etapa, edita, etc)
          if (payload.eventType === 'UPDATE') {
            // Se o lead foi marcado como não-aberto ou inativo, remover da lista
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

          // Quando alguém DELETA
          if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old?.id))
          }
        }
      )
      .subscribe()

    // 3. Cleanup: desconecta quando sai da tela
    return () => {
      supabase.removeChannel(channel)
    }
  }, [funilId, etapaId])

  return { leads, setLeads, loading }
}
