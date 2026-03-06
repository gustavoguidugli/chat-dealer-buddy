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
  const [wonLeads, setWonLeads] = useState<any[]>([])
  const [lostLeads, setLostLeads] = useState<any[]>([])
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
      const [openRes, wonRes, lostRes] = await Promise.all([
        supabase
          .from('leads_crm')
          .select(`*, funis(nome), etapas_funil(nome, ordem, cor)`)
          .eq('id_funil', funilId)
          .eq('status', 'aberto')
          .eq('ativo', true)
          .order('ordem_no_funil'),
        supabase
          .from('leads_crm')
          .select(`*, funis(nome), etapas_funil(nome, ordem, cor)`)
          .eq('id_funil', funilId)
          .eq('status', 'ganho')
          .eq('ativo', true)
          .order('data_ganho', { ascending: false })
          .limit(50),
        supabase
          .from('leads_crm')
          .select(`*, funis(nome), etapas_funil(nome, ordem, cor)`)
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

    // 2. Escuta mudanças em tempo real nos leads (sem filtro para capturar mudanças de funil)
    const channel = supabase
      .channel(`funil-${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads_crm',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newData = payload.new as any
            if (newData.id_funil === funilId && newData.ativo !== false) {
              if (newData.status === 'ganho') {
                setWonLeads((prev) => [newData, ...prev])
              } else if (newData.status === 'perdido') {
                setLostLeads((prev) => [newData, ...prev])
              } else {
                setLeads((prev) => [...prev, newData])
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

            if (newData.status === 'ganho') {
              setWonLeads((prev) => [newData, ...prev])
            } else if (newData.status === 'perdido') {
              setLostLeads((prev) => [newData, ...prev])
            } else if (newData.status === 'aberto') {
              setLeads((prev) =>
                prev.some(l => l.id === newData.id)
                  ? prev.map(l => l.id === newData.id ? { ...l, ...newData } : l)
                  : [...prev, newData]
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
          setEtiquetaVersion((v) => v + 1)
        }
      )
      .subscribe()

    // 4. Escuta mudanças em tempo real nas atividades dos leads
    const atividadeChannel = supabase
      .channel(`funil-atividades-${funilId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atividades',
        },
        () => {
          setAtividadeVersion((v) => v + 1)
        }
      )
      .subscribe()

    // 5. Cleanup
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(etiquetaChannel)
      supabase.removeChannel(atividadeChannel)
    }
  }, [funilId, etapaId])

  return { leads, setLeads, wonLeads, lostLeads, loading, etiquetaVersion, atividadeVersion }
}
