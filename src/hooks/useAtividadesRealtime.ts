import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AtividadeRow {
  id: number;
  assunto: string;
  tipo: string;
  concluida: boolean;
  data_vencimento: string;
  prioridade: string | null;
  atribuida_a: string | null;
  descricao: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  id_lead: number | null;
  id_empresa: number;
  created_by: string | null;
  concluida_em: string | null;
  concluida_por: string | null;
  // joined
  lead_nome?: string | null;
  funil_nome?: string | null;
  funil_id?: number | null;
}

export function useAtividadesRealtime(empresaId: number | null) {
  const [atividades, setAtividades] = useState<AtividadeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAtividades = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('atividades')
      .select('*, leads_crm(nome, id_funil, funis(nome))')
      .eq('id_empresa', empresaId)
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
      setAtividades(data.map((a: any) => ({
        ...a,
        lead_nome: a.leads_crm?.nome || null,
        funil_nome: a.leads_crm?.funis?.nome || null,
        funil_id: a.leads_crm?.id_funil || null,
      })));
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchAtividades();
  }, [fetchAtividades]);

  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`atividades-empresa-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'atividades',
        filter: `id_empresa=eq.${empresaId}`,
      }, () => {
        // Refetch to get joined data
        fetchAtividades();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId, fetchAtividades]);

  return { atividades, loading, refetch: fetchAtividades };
}
