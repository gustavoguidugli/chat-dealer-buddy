import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodPreset = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'custom';

export interface DashboardFilters {
  period: PeriodPreset;
  startDate: Date;
  endDate: Date;
  funilIds: number[];
  agenteIds: string[];
}

export function getDateRange(preset: PeriodPreset, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'this_week': return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'custom': return { start: customStart ?? startOfMonth(now), end: customEnd ?? endOfDay(now) };
  }
}

export function getTimeGrouping(start: Date, end: Date) {
  const days = differenceInDays(end, start);
  if (days <= 31) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

export function getTimeBuckets(start: Date, end: Date) {
  const grouping = getTimeGrouping(start, end);
  if (grouping === 'day') return eachDayOfInterval({ start, end }).map(d => ({ date: d, label: format(d, 'dd/MM') }));
  if (grouping === 'week') return eachWeekOfInterval({ start, end }, { locale: ptBR }).map(d => ({ date: d, label: format(d, 'dd/MM') }));
  return eachMonthOfInterval({ start, end }).map(d => ({ date: d, label: format(d, 'MMM', { locale: ptBR }) }));
}

// ─── Funis list ───
export function useFunis(empresaId: number | null) {
  const [funis, setFunis] = useState<{ id: number; nome: string; cor: string }[]>([]);
  useEffect(() => {
    if (!empresaId) return;
    supabase.from('funis').select('id, nome, cor').eq('id_empresa', empresaId).eq('ativo', true).order('ordem').then(({ data }) => {
      if (data) setFunis(data);
    });
  }, [empresaId]);
  return funis;
}

// ─── Team members ───
export function useTeamMembers(empresaId: number | null) {
  const [members, setMembers] = useState<{ id: string; nome: string }[]>([]);
  useEffect(() => {
    if (!empresaId) return;
    supabase.rpc('get_team_members', { p_empresa_id: empresaId }).then(({ data }) => {
      if (data) setMembers((data as any[]).map(m => ({ id: m.user_id, nome: m.nome || m.email })));
    });
  }, [empresaId]);
  return members;
}

// ─── KPI Section 1 ───
export interface LeadKpis {
  totalAtivos: number;
  ganhos: number;
  perdidos: number;
  taxaConversao: number | null;
}

export function useLeadKpis(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadKpis>({ totalAtivos: 0, ganhos: 0, perdidos: 0, taxaConversao: null });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    // Total ativos
    let qAtivos = supabase.from('leads_crm').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('status', 'aberto').eq('ativo', true);
    if (filters.funilIds.length) qAtivos = qAtivos.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qAtivos = qAtivos.in('proprietario_id', filters.agenteIds);
    qAtivos = qAtivos.gte('data_criacao', startStr).lte('data_criacao', endStr);

    // Ganhos
    let qGanhos = supabase.from('leads_crm').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('status', 'ganho')
      .gte('data_ganho', startStr).lte('data_ganho', endStr);
    if (filters.funilIds.length) qGanhos = qGanhos.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qGanhos = qGanhos.in('proprietario_id', filters.agenteIds);

    // Perdidos
    let qPerdidos = supabase.from('leads_crm').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('status', 'perdido')
      .gte('data_perdido', startStr).lte('data_perdido', endStr);
    if (filters.funilIds.length) qPerdidos = qPerdidos.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qPerdidos = qPerdidos.in('proprietario_id', filters.agenteIds);

    const [rAtivos, rGanhos, rPerdidos] = await Promise.all([qAtivos, qGanhos, qPerdidos]);
    const g = rGanhos.count ?? 0;
    const p = rPerdidos.count ?? 0;

    setData({
      totalAtivos: rAtivos.count ?? 0,
      ganhos: g,
      perdidos: p,
      taxaConversao: (g + p) > 0 ? Math.round((g / (g + p)) * 100) : null,
    });
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Leads by period (line chart) ───
export interface LeadsByPeriod { label: string; criados: number; ganhos: number }

export function useLeadsByPeriod(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadsByPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    let qCriados = supabase.from('leads_crm').select('data_criacao')
      .eq('id_empresa', empresaId).gte('data_criacao', startStr).lte('data_criacao', endStr);
    if (filters.funilIds.length) qCriados = qCriados.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qCriados = qCriados.in('proprietario_id', filters.agenteIds);

    let qGanhos = supabase.from('leads_crm').select('data_ganho')
      .eq('id_empresa', empresaId).eq('status', 'ganho').gte('data_ganho', startStr).lte('data_ganho', endStr);
    if (filters.funilIds.length) qGanhos = qGanhos.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qGanhos = qGanhos.in('proprietario_id', filters.agenteIds);

    const [rCriados, rGanhos] = await Promise.all([qCriados, qGanhos]);
    const buckets = getTimeBuckets(start, end);
    const grouping = getTimeGrouping(start, end);

    const formatKey = (d: string) => {
      const date = new Date(d);
      if (grouping === 'day') return format(date, 'dd/MM');
      if (grouping === 'week') return format(startOfWeek(date, { locale: ptBR }), 'dd/MM');
      return format(date, 'MMM', { locale: ptBR });
    };

    const criadosMap: Record<string, number> = {};
    const ganhosMap: Record<string, number> = {};
    rCriados.data?.forEach(l => { if (l.data_criacao) { const k = formatKey(l.data_criacao); criadosMap[k] = (criadosMap[k] || 0) + 1; } });
    rGanhos.data?.forEach(l => { if (l.data_ganho) { const k = formatKey(l.data_ganho); ganhosMap[k] = (ganhosMap[k] || 0) + 1; } });

    setData(buckets.map(b => ({ label: b.label, criados: criadosMap[b.label] || 0, ganhos: ganhosMap[b.label] || 0 })));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Leads by etapa (bar chart) ───
export interface LeadsByEtapa { nome: string; total: number; cor: string; ordem: number }

export function useLeadsByEtapa(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadsByEtapa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);

    // Get etapas
    let qEtapas = supabase.from('etapas_funil').select('id, nome, cor, ordem, id_funil').eq('ativo', true);
    if (filters.funilIds.length) qEtapas = qEtapas.in('id_funil', filters.funilIds);

    const { data: etapas } = await qEtapas;
    if (!etapas || !etapas.length) { setData([]); setLoading(false); return; }

    // Get lead counts per etapa
    let qLeads = supabase.from('leads_crm').select('id_etapa_atual')
      .eq('id_empresa', empresaId).eq('status', 'aberto').eq('ativo', true);
    if (filters.funilIds.length) qLeads = qLeads.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) qLeads = qLeads.in('proprietario_id', filters.agenteIds);

    const { data: leads } = await qLeads;
    const countMap: Record<number, number> = {};
    leads?.forEach(l => { countMap[l.id_etapa_atual] = (countMap[l.id_etapa_atual] || 0) + 1; });

    setData(etapas.map(e => ({ nome: e.nome, total: countMap[e.id] || 0, cor: e.cor || '#3B82F6', ordem: e.ordem })).sort((a, b) => a.ordem - b.ordem));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Motivos de perda ───
export interface MotivoPerda { motivo: string; total: number }

export function useMotivosPerda(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<MotivoPerda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

    let q = supabase.from('leads_crm').select('motivo_perda')
      .eq('id_empresa', empresaId).eq('status', 'perdido')
      .gte('data_perdido', start.toISOString()).lte('data_perdido', end.toISOString());
    if (filters.funilIds.length) q = q.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) q = q.in('proprietario_id', filters.agenteIds);

    const { data: leads } = await q;
    const map: Record<string, number> = {};
    leads?.forEach(l => { const m = l.motivo_perda || 'Sem motivo informado'; map[m] = (map[m] || 0) + 1; });

    setData(Object.entries(map).map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Funnel KPIs (section 2) ───
export interface FunnelKpis {
  tempoMedioFunil: number | null;
  leadsSemAtividade: number;
  etapaMaisLonga: { nome: string; dias: number } | null;
}

export function useFunnelKpis(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<FunnelKpis>({ tempoMedioFunil: null, leadsSemAtividade: 0, etapaMaisLonga: null });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);

    // Tempo médio no funil (leads abertos)
    let qAbertos = supabase.from('leads_crm').select('data_entrada_funil')
      .eq('id_empresa', empresaId).eq('status', 'aberto').eq('ativo', true).not('data_entrada_funil', 'is', null);
    if (filters.funilIds.length) qAbertos = qAbertos.in('id_funil', filters.funilIds);

    // Leads sem atividade (criados há +3 dias)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    let qSemAtividade = supabase.from('leads_crm').select('id')
      .eq('id_empresa', empresaId).eq('status', 'aberto').eq('ativo', true).lt('data_criacao', threeDaysAgo);
    if (filters.funilIds.length) qSemAtividade = qSemAtividade.in('id_funil', filters.funilIds);

    const [rAbertos, rSemAtiv] = await Promise.all([qAbertos, qSemAtividade]);

    // Calc avg days in funnel
    const now = Date.now();
    const days = rAbertos.data?.map(l => l.data_entrada_funil ? (now - new Date(l.data_entrada_funil).getTime()) / 86400000 : 0).filter(d => d > 0);
    const avgDays = days?.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;

    // Check which leads have activities
    const leadsIds = rSemAtiv.data?.map(l => l.id) ?? [];
    let semAtivCount = 0;
    if (leadsIds.length) {
      const { data: atividades } = await supabase.from('atividades').select('id_lead').eq('id_empresa', empresaId).in('id_lead', leadsIds.slice(0, 500));
      const comAtiv = new Set(atividades?.map(a => a.id_lead));
      semAtivCount = leadsIds.filter(id => !comAtiv.has(id)).length;
    }

    // Etapa mais longa
    const { data: hist } = await supabase.from('historico_lead').select('etapa_origem_id, tempo_na_etapa_anterior')
      .eq('id_empresa', empresaId).not('tempo_na_etapa_anterior', 'is', null).not('etapa_origem_id', 'is', null);

    let etapaMaisLonga: { nome: string; dias: number } | null = null;
    if (hist?.length) {
      const etapaMap: Record<number, number[]> = {};
      hist.forEach(h => {
        if (h.etapa_origem_id && h.tempo_na_etapa_anterior) {
          if (!etapaMap[h.etapa_origem_id]) etapaMap[h.etapa_origem_id] = [];
          // Parse interval string (e.g. "3 days 04:00:00") to days
          const match = String(h.tempo_na_etapa_anterior).match(/(\d+)\s*(days?|d)/i);
          const d = match ? parseInt(match[1]) : 0;
          etapaMap[h.etapa_origem_id].push(d);
        }
      });
      let maxAvg = 0; let maxId = 0;
      Object.entries(etapaMap).forEach(([id, vals]) => {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (avg > maxAvg) { maxAvg = avg; maxId = Number(id); }
      });
      if (maxId) {
        const { data: etapa } = await supabase.from('etapas_funil').select('nome').eq('id', maxId).maybeSingle();
        etapaMaisLonga = { nome: etapa?.nome ?? 'Desconhecida', dias: Math.round(maxAvg) };
      }
    }

    setData({ tempoMedioFunil: avgDays, leadsSemAtividade: semAtivCount, etapaMaisLonga });
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Activity KPIs ───
export interface ActivityKpis {
  concluidas: number;
  pendentes: number;
  vencidas: number;
  mediaConclusaoDias: number | null;
}

export function useActivityKpis(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<ActivityKpis>({ concluidas: 0, pendentes: 0, vencidas: 0, mediaConclusaoDias: null });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);
    const nowStr = new Date().toISOString();

    let qConc = supabase.from('atividades').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('concluida', true)
      .gte('concluida_em', start.toISOString()).lte('concluida_em', end.toISOString());
    if (filters.agenteIds.length) qConc = qConc.in('atribuida_a', filters.agenteIds);

    let qPend = supabase.from('atividades').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('concluida', false).gte('data_vencimento', nowStr);
    if (filters.agenteIds.length) qPend = qPend.in('atribuida_a', filters.agenteIds);

    let qVenc = supabase.from('atividades').select('id', { count: 'exact', head: true })
      .eq('id_empresa', empresaId).eq('concluida', false).lt('data_vencimento', nowStr);
    if (filters.agenteIds.length) qVenc = qVenc.in('atribuida_a', filters.agenteIds);

    // Média de conclusão
    let qMedia = supabase.from('atividades').select('created_at, concluida_em')
      .eq('id_empresa', empresaId).eq('concluida', true)
      .gte('concluida_em', start.toISOString()).lte('concluida_em', end.toISOString());
    if (filters.agenteIds.length) qMedia = qMedia.in('atribuida_a', filters.agenteIds);

    const [rConc, rPend, rVenc, rMedia] = await Promise.all([qConc, qPend, qVenc, qMedia]);

    const diffs = rMedia.data?.map(a => {
      if (a.created_at && a.concluida_em) return (new Date(a.concluida_em).getTime() - new Date(a.created_at).getTime()) / 86400000;
      return null;
    }).filter((d): d is number => d !== null && d >= 0);
    const avgDias = diffs?.length ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10 : null;

    setData({ concluidas: rConc.count ?? 0, pendentes: rPend.count ?? 0, vencidas: rVenc.count ?? 0, mediaConclusaoDias: avgDias });
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Activities by type ───
export interface ActivityByType { tipo: string; total: number; concluidas: number }

export function useActivitiesByType(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<ActivityByType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

    let q = supabase.from('atividades').select('tipo, concluida')
      .eq('id_empresa', empresaId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    if (filters.agenteIds.length) q = q.in('atribuida_a', filters.agenteIds);

    const { data: ativs } = await q;
    const map: Record<string, { total: number; concluidas: number }> = {};
    ativs?.forEach(a => {
      if (!map[a.tipo]) map[a.tipo] = { total: 0, concluidas: 0 };
      map[a.tipo].total++;
      if (a.concluida) map[a.tipo].concluidas++;
    });

    setData(Object.entries(map).map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Activities by agent ───
export interface ActivityByAgent { nome: string; total: number; concluidas: number }

export function useActivitiesByAgent(empresaId: number | null, filters: DashboardFilters | null, members: { id: string; nome: string }[]) {
  const [data, setData] = useState<ActivityByAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

    let q = supabase.from('atividades').select('atribuida_a, concluida')
      .eq('id_empresa', empresaId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    if (filters.agenteIds.length) q = q.in('atribuida_a', filters.agenteIds);

    const { data: ativs } = await q;
    const map: Record<string, { total: number; concluidas: number }> = {};
    ativs?.forEach(a => {
      const id = a.atribuida_a ?? 'sem_agente';
      if (!map[id]) map[id] = { total: 0, concluidas: 0 };
      map[id].total++;
      if (a.concluida) map[id].concluidas++;
    });

    const memberMap = Object.fromEntries(members.map(m => [m.id, m.nome]));
    setData(Object.entries(map).map(([id, v]) => ({ nome: memberMap[id] || 'Sem responsável', ...v })).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [empresaId, filters, members]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Leads by etiqueta ───
export interface LeadByEtiqueta { nome: string; cor: string; total: number }

export function useLeadsByEtiqueta(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadByEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

    const { data: etiquetas } = await supabase.from('etiquetas_card').select('id, nome, cor').eq('id_empresa', empresaId).eq('ativo', true);
    if (!etiquetas?.length) { setData([]); setLoading(false); return; }

    const { data: leadsEtiq } = await supabase.from('lead_etiquetas').select('id_etiqueta, id_lead').in('id_etiqueta', etiquetas.map(e => e.id));

    // Filter leads by period
    const leadIds = [...new Set(leadsEtiq?.map(le => le.id_lead) ?? [])];
    if (!leadIds.length) { setData([]); setLoading(false); return; }

    let qLeads = supabase.from('leads_crm').select('id').eq('id_empresa', empresaId)
      .gte('data_criacao', start.toISOString()).lte('data_criacao', end.toISOString()).in('id', leadIds.slice(0, 500));
    if (filters.funilIds.length) qLeads = qLeads.in('id_funil', filters.funilIds);
    const { data: validLeads } = await qLeads;
    const validSet = new Set(validLeads?.map(l => l.id));

    const countMap: Record<number, number> = {};
    leadsEtiq?.forEach(le => { if (validSet.has(le.id_lead)) countMap[le.id_etiqueta] = (countMap[le.id_etiqueta] || 0) + 1; });

    const etiqMap = Object.fromEntries(etiquetas.map(e => [e.id, e]));
    setData(Object.entries(countMap).map(([id, total]) => ({ nome: etiqMap[Number(id)]?.nome ?? '', cor: etiqMap[Number(id)]?.cor ?? '#3B82F6', total })).sort((a, b) => b.total - a.total).slice(0, 10));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Leads by funil (donut) ───
export interface LeadByFunil { nome: string; cor: string; total: number }

export function useLeadsByFunil(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadByFunil[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);

    const { data: funis } = await supabase.from('funis').select('id, nome, cor').eq('id_empresa', empresaId).eq('ativo', true);
    if (!funis?.length) { setData([]); setLoading(false); return; }

    let q = supabase.from('leads_crm').select('id_funil')
      .eq('id_empresa', empresaId).eq('status', 'aberto').eq('ativo', true);
    if (filters.agenteIds.length) q = q.in('proprietario_id', filters.agenteIds);

    const { data: leads } = await q;
    const countMap: Record<number, number> = {};
    leads?.forEach(l => { countMap[l.id_funil] = (countMap[l.id_funil] || 0) + 1; });

    const funilMap = Object.fromEntries(funis.map(f => [f.id, f]));
    setData(Object.entries(countMap).map(([id, total]) => ({ nome: funilMap[Number(id)]?.nome ?? '', cor: funilMap[Number(id)]?.cor ?? '#3B82F6', total })).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

// ─── Leads by origem ───
export interface LeadByOrigem { origem: string; total: number }

export function useLeadsByOrigem(empresaId: number | null, filters: DashboardFilters | null) {
  const [data, setData] = useState<LeadByOrigem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!empresaId || !filters) return;
    setLoading(true);
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate);

    let q = supabase.from('leads_crm').select('origem')
      .eq('id_empresa', empresaId).gte('data_criacao', start.toISOString()).lte('data_criacao', end.toISOString());
    if (filters.funilIds.length) q = q.in('id_funil', filters.funilIds);
    if (filters.agenteIds.length) q = q.in('proprietario_id', filters.agenteIds);

    const { data: leads } = await q;
    const map: Record<string, number> = {};
    leads?.forEach(l => { const o = l.origem || 'Não informado'; map[o] = (map[o] || 0) + 1; });

    setData(Object.entries(map).map(([origem, total]) => ({ origem, total })).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}
