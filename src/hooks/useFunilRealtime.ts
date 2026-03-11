import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook para sincronizar o funil em tempo real.
 * Todos os channels incluem filtro de empresa para compatibilidade com RLS.
 */
export function useFunilRealtime(funilId: number, empresaId: number | null, etapaId?: number) {
  const [leads, setLeads] = useState<any[]>([])
  const [wonLeads, setWonLeads] = useState<any[]>([])
  const [lostLeads, setLostLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [etiquetaVersion, setEtiquetaVersion] = useState(0)
  const [atividadeVersion, setAtividadeVersion] = useState(0)

  useEffect(() => {
    if (!funilId || !empresaId) {
      setLoading(false)
      return
    }

    const selectWithJoins = `*, funis(nome), etapas_funil(nome, ordem, cor)`

    async function fetchLeads() {
      const [openRes, wonRes, lostRes] = await Promise.all([
        supabase
          .from('leads_crm')
          .select(selectWithJoins)
          .eq('id_funil', funilId)
          .eq('status', 'aberto')
          .eq('ativo', true)
          .order('ordem_no_funil'),
        supabase
          .from('leads_crm')
          .select(selectWithJoins)
          .eq('id_funil', funilId)
          .eq('status', 'ganho')
          .eq('ativo', true)
          .order('data_ganho', { ascending: false })
          .limit(50),
        supabase
          .from('leads_crm')
          .select(selectWithJoins)
          .eq('id_funil', funilId)
          .eq('status', 'perdido')
          .eq('ativo', true)
          .order('data_perdido', { ascending: false })
          .limit(50),
      ])

      setLeads(openRes.data || [])
      setWonLeads(wonRes.data || [])
      setLostLeads(lostRes.data || [])
      setLoading(false)
    }

    fetchLeads()

    // Re-fetch a single lead with joins
    async function fetchEnrichedLead(leadId: number) {
      const { data } = await supabase
        .from('leads_crm')
        .select(selectWithJoins)
        .eq('id', leadId)
        .single()
      return data
    }

    const channel = supabase
      .channel(`funil-${funilId}-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads_crm',
          filter: `id_empresa=eq.${empresaId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newData = payload.new as any
            if (newData.id_funil === funilId && newData.ativo !== false) {
              const enriched = await fetchEnrichedLead(newData.id)
              if (!enriched) return
              if (enriched.status === 'ganho') {
                setWonLeads((prev) => [enriched, ...prev])
              } else if (enriched.status === 'perdido') {
                setLostLeads((prev) => [enriched, ...prev])
              } else {
                setLeads((prev) =>
                  prev.some(l => l.id === enriched.id)
                    ? prev.map(l => l.id === enriched.id ? enriched : l)
                    : [...prev, enriched]
                )
              }
            }
          }

          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any
            // Remove from all lists first
            setLeads((prev) => prev.filter((lead) => lead.id !== newData.id))
            setWonLeads((prev) => prev.filter((lead) => lead.id !== newData.id))
            setLostLeads((prev) => prev.filter((lead) => lead.id !== newData.id))

            // Only add back if belongs to current funil and is active
            if (newData.id_funil !== funilId || newData.ativo === false) return

            const enriched = await fetchEnrichedLead(newData.id)
            if (!enriched) return

            if (enriched.status === 'ganho') {
              setWonLeads((prev) => [enriched, ...prev])
            } else if (enriched.status === 'perdido') {
              setLostLeads((prev) => [enriched, ...prev])
            } else if (enriched.status === 'aberto') {
              setLeads((prev) =>
                prev.some(l => l.id === enriched.id)
                  ? prev.map(l => l.id === enriched.id ? enriched : l)
                  : [...prev, enriched]
              )
            }
          }

          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id
            setLeads((prev) => prev.filter((lead) => lead.id !== oldId))
            setWonLeads((prev) => prev.filter((lead) => lead.id !== oldId))
            setLostLeads((prev) => prev.filter((lead) => lead.id !== oldId))
          }
        }
      )
      .subscribe()

    const etiquetaChannel = supabase
      .channel(`funil-etiquetas-${funilId}-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_etiquetas',
          filter: `id_empresa=eq.${empresaId}`,
        },
        () => {
          setEtiquetaVersion((v) => v + 1)
        }
      )
      .subscribe()

    const atividadeChannel = supabase
      .channel(`funil-atividades-${funilId}-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atividades',
          filter: `id_empresa=eq.${empresaId}`,
        },
        () => {
          setAtividadeVersion((v) => v + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(etiquetaChannel)
      supabase.removeChannel(atividadeChannel)
    }
  }, [funilId, empresaId, etapaId])

  return { leads, setLeads, wonLeads, lostLeads, loading, etiquetaVersion, atividadeVersion }
}
