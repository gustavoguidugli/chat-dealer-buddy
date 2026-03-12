import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MotivoPerda {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export function useMotivosPerda(empresaId: number | null) {
  const [motivos, setMotivos] = useState<MotivoPerda[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const fetch = useCallback(async () => {
    if (!empresaId) {
      setMotivos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('motivos_perda')
      .select('id, nome, descricao, ordem, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem');
    setMotivos((data as MotivoPerda[]) || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`motivos_perda_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motivos_perda',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          fetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetch]);

  return { motivos, loading, refetch: fetch };
}
