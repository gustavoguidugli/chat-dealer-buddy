import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, BarChart2, Users, Target, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, XCircle, Timer, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  type DashboardFilters, type PeriodPreset, getDateRange,
  useFunis, useTeamMembers, useLeadKpis, useLeadsByPeriod, useLeadsByEtapa,
  useMotivosPerda, useFunnelKpis, useActivityKpis, useActivitiesByType,
  useActivitiesByAgent, useLeadsByEtiqueta, useLeadsByFunil, useLeadsByOrigem,
  useLeadsByFunilAgrupado,
} from '@/hooks/useDashboardData';

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'this_quarter', label: 'Este trimestre' },
  { value: 'custom', label: 'Personalizado' },
];

const DONUT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
const MOTIVOS_COLORS = ['#E24B4A', '#BA7517', '#378ADD', '#1D9E75', '#7F77DD', '#D85A30', '#888780'];

// ─── KPI Card ───
function KpiCard({ label, value, icon: Icon, loading, suffix, color }: {
  label: string; value: string | number; icon: React.ElementType; loading: boolean; suffix?: string; color?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold mt-1" style={color ? { color } : undefined}>
                {value}{suffix}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-5">
      <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">{title}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Chart wrapper ───
function ChartCard({ title, loading, isEmpty, children, className }: {
  title: string; loading: boolean; isEmpty?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn('border-border/50', className)}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isEmpty ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function CrmDashboards() {
  const { empresaId } = useAuth();

  // ── Pending filters (before "apply") ──
  const storageKey = `dashboard_filters_${empresaId}`;
  const [pendingPeriod, setPendingPeriod] = useState<PeriodPreset>('this_month');
  const [pendingStartDate, setPendingStartDate] = useState<Date>(new Date());
  const [pendingEndDate, setPendingEndDate] = useState<Date>(new Date());
  const [pendingFunilIds, setPendingFunilIds] = useState<number[]>([]);
  const [pendingAgenteIds, setPendingAgenteIds] = useState<string[]>([]);

  // ── Applied filters ──
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters | null>(null);
  const [dirty, setDirty] = useState(false);

  // ── Load saved filters ──
  useEffect(() => {
    if (!empresaId) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const period = parsed.period as PeriodPreset;
        setPendingPeriod(period);
        if (period === 'custom' && parsed.startDate && parsed.endDate) {
          setPendingStartDate(new Date(parsed.startDate));
          setPendingEndDate(new Date(parsed.endDate));
        }
      }
    } catch { /* ignore */ }
    // Auto-apply on mount
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const applyFilters = () => {
    const { start, end } = getDateRange(pendingPeriod, pendingStartDate, pendingEndDate);
    const filters: DashboardFilters = {
      period: pendingPeriod,
      startDate: start,
      endDate: end,
      funilIds: pendingFunilIds,
      agenteIds: pendingAgenteIds,
    };
    setAppliedFilters(filters);
    setDirty(false);
    if (empresaId) {
      localStorage.setItem(storageKey, JSON.stringify({ period: pendingPeriod, startDate: start.toISOString(), endDate: end.toISOString() }));
    }
  };

  const markDirty = () => setDirty(true);

  // ── Data hooks ──
  const funis = useFunis(empresaId);
  const members = useTeamMembers(empresaId);

  const { data: leadKpis, loading: loadingLeadKpis } = useLeadKpis(empresaId, appliedFilters);
  const { data: leadsByPeriod, loading: loadingLeadsByPeriod } = useLeadsByPeriod(empresaId, appliedFilters);
  const { data: leadsByEtapa, loading: loadingLeadsByEtapa } = useLeadsByEtapa(empresaId, appliedFilters);
  const { data: motivosPerda, loading: loadingMotivos } = useMotivosPerda(empresaId, appliedFilters);
  const { data: funnelKpis, loading: loadingFunnelKpis } = useFunnelKpis(empresaId, appliedFilters);
  const { data: actKpis, loading: loadingActKpis } = useActivityKpis(empresaId, appliedFilters);
  const { data: actByType, loading: loadingActByType } = useActivitiesByType(empresaId, appliedFilters);
  const { data: actByAgent, loading: loadingActByAgent } = useActivitiesByAgent(empresaId, appliedFilters, members);
  const { data: leadsByEtiqueta, loading: loadingEtiqueta } = useLeadsByEtiqueta(empresaId, appliedFilters);
  const { data: leadsByFunil, loading: loadingByFunil } = useLeadsByFunil(empresaId, appliedFilters);
  const { data: leadsByOrigem, loading: loadingOrigem } = useLeadsByOrigem(empresaId, appliedFilters);
  const { data: leadsByFunilAgrupado, loading: loadingFunilAgrupado } = useLeadsByFunilAgrupado(empresaId, appliedFilters);

  const isMultiFunil = !appliedFilters || appliedFilters.funilIds.length !== 1;

  // Funnel chart data (for conversion visual)
  const funnelChartData = useMemo(() => {
    if (!leadsByEtapa.length) return [];
    let prev = 0;
    return leadsByEtapa.map((e, i) => {
      const convPct = i === 0 ? 100 : (prev > 0 ? Math.round((e.total / prev) * 100) : 0);
      prev = e.total;
      return { ...e, convPct };
    });
  }, [leadsByEtapa]);

  // Motivos total for %
  const motivosTotal = useMemo(() => motivosPerda.reduce((a, b) => a + b.total, 0), [motivosPerda]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-secondary">
        {/* ── Filter bar ── */}
        <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Dashboards</h1>
            </div>

            <div className="flex-1" />

            {/* Period */}
            <Select value={pendingPeriod} onValueChange={(v) => { setPendingPeriod(v as PeriodPreset); markDirty(); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Custom date pickers */}
            {pendingPeriod === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm">
                      <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                      {format(pendingStartDate, 'dd/MM/yy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={pendingStartDate} onSelect={d => { if (d) { setPendingStartDate(d); markDirty(); } }} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 text-sm">
                      <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                      {format(pendingEndDate, 'dd/MM/yy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={pendingEndDate} onSelect={d => { if (d) { setPendingEndDate(d); markDirty(); } }} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Funil filter */}
            <Select value={pendingFunilIds.length ? String(pendingFunilIds[0]) : 'all'} onValueChange={v => { setPendingFunilIds(v === 'all' ? [] : [Number(v)]); markDirty(); }}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="Todos os funis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funis.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Agent filter */}
            <Select value={pendingAgenteIds.length ? pendingAgenteIds[0] : 'all'} onValueChange={v => { setPendingAgenteIds(v === 'all' ? [] : [v]); markDirty(); }}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="Todos os agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Apply button */}
            <Button size="sm" className="h-9 relative" onClick={applyFilters}>
              Aplicar filtros
              {dirty && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-card" />}
            </Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-6 max-w-[1400px] mx-auto">

          {/* ═══ SECTION 1: Visão Geral ═══ */}
          <SectionHeader title="Visão Geral de Leads" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Leads ativos" value={leadKpis.totalAtivos} icon={Users} loading={loadingLeadKpis} />
            <KpiCard label="Ganhos no período" value={leadKpis.ganhos} icon={TrendingUp} loading={loadingLeadKpis} color="hsl(160, 84%, 39%)" />
            <KpiCard label="Perdidos no período" value={leadKpis.perdidos} icon={TrendingDown} loading={loadingLeadKpis} color="hsl(0, 84%, 60%)" />
            <KpiCard label="Taxa de conversão" value={leadKpis.taxaConversao !== null ? leadKpis.taxaConversao : '—'} icon={Target} loading={loadingLeadKpis} suffix={leadKpis.taxaConversao !== null ? '%' : ''} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <ChartCard title="Leads criados por período" loading={loadingLeadsByPeriod} isEmpty={!leadsByPeriod.length}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={leadsByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="criados" name="Criados" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ganhos" name="Ganhos" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={isMultiFunil ? "Leads por funil" : "Leads por etapa do funil"} loading={isMultiFunil ? loadingFunilAgrupado : loadingLeadsByEtapa} isEmpty={isMultiFunil ? !leadsByFunilAgrupado.length : !leadsByEtapa.length}>
              {isMultiFunil ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={leadsByFunilAgrupado} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                      <Bar dataKey="total" name="Leads" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => {
                        if (data?.id) { setPendingFunilIds([data.id]); markDirty(); setTimeout(applyFilters, 50); }
                      }}>
                        {leadsByFunilAgrupado.map((f, i) => <Cell key={i} fill={f.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">Selecione um funil específico no filtro para ver a distribuição por etapa.</p>
                </>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={leadsByEtapa} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                    <Bar dataKey="total" name="Leads">
                      {leadsByEtapa.map((e, i) => <Cell key={i} fill={e.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ═══ SECTION 2: Funil de Vendas ═══ */}
          <SectionHeader title="Funil de Vendas" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KpiCard label="Tempo médio no funil" value={funnelKpis.tempoMedioFunil !== null ? funnelKpis.tempoMedioFunil : '—'} icon={Clock} loading={loadingFunnelKpis} suffix={funnelKpis.tempoMedioFunil !== null ? ' dias' : ''} />
            <KpiCard label="Leads sem atividade (+3d)" value={funnelKpis.leadsSemAtividade} icon={AlertTriangle} loading={loadingFunnelKpis} color={funnelKpis.leadsSemAtividade > 0 ? 'hsl(45, 93%, 47%)' : undefined} />
            <KpiCard label="Etapa mais longa" value={funnelKpis.etapaMaisLonga ? `${funnelKpis.etapaMaisLonga.nome} (${funnelKpis.etapaMaisLonga.dias}d)` : '—'} icon={Timer} loading={loadingFunnelKpis} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <ChartCard title="Funil de conversão" loading={isMultiFunil ? loadingFunilAgrupado : loadingLeadsByEtapa} isEmpty={isMultiFunil ? !leadsByFunilAgrupado.length : !funnelChartData.length}>
              {isMultiFunil ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={leadsByFunilAgrupado} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                      <Bar dataKey="total" name="Leads" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => {
                        if (data?.id) { setPendingFunilIds([data.id]); markDirty(); setTimeout(applyFilters, 50); }
                      }}>
                        {leadsByFunilAgrupado.map((f, i) => <Cell key={i} fill={f.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">Selecione um funil específico no filtro para ver a distribuição por etapa.</p>
                </>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnelChartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }}
                      formatter={(value: number, name: string, props: any) => [`${value} leads (${props.payload.convPct}%)`, 'Leads']}
                    />
                    <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                      {funnelChartData.map((e, i) => <Cell key={i} fill={e.cor} fillOpacity={1 - i * 0.08} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Motivos de perda" loading={loadingMotivos} isEmpty={!motivosPerda.length}>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={motivosPerda} dataKey="total" nameKey="motivo" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {motivosPerda.map((_, i) => <Cell key={i} fill={MOTIVOS_COLORS[i % MOTIVOS_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {motivosPerda.map((m, i) => (
                    <div key={m.motivo} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: MOTIVOS_COLORS[i % MOTIVOS_COLORS.length] }} />
                      <span className="text-muted-foreground">{m.motivo}</span>
                      <span className="font-medium">{m.total}</span>
                      <span className="text-muted-foreground">({motivosTotal > 0 ? Math.round((m.total / motivosTotal) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* ═══ SECTION 3: Atividades ═══ */}
          <SectionHeader title="Atividades" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Concluídas no período" value={actKpis.concluidas} icon={CheckCircle2} loading={loadingActKpis} color="hsl(160, 84%, 39%)" />
            <KpiCard label="Pendentes" value={actKpis.pendentes} icon={Clock} loading={loadingActKpis} />
            <KpiCard label="Vencidas" value={actKpis.vencidas} icon={XCircle} loading={loadingActKpis} color={actKpis.vencidas > 0 ? 'hsl(0, 84%, 60%)' : undefined} />
            <KpiCard label="Média conclusão" value={actKpis.mediaConclusaoDias !== null ? actKpis.mediaConclusaoDias : '—'} icon={Timer} loading={loadingActKpis} suffix={actKpis.mediaConclusaoDias !== null ? ' dias' : ''} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <ChartCard title="Atividades por tipo" loading={loadingActByType} isEmpty={!actByType.length}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={actByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="concluidas" name="Concluídas" stackId="a" fill="hsl(160, 84%, 39%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="total" name="Total" stackId="b" fill="hsl(30, 90%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Atividades por agente" loading={loadingActByAgent} isEmpty={!actByAgent.length}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={actByAgent} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} className="fill-muted-foreground" />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="concluidas" name="Concluídas" fill="hsl(160, 84%, 39%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total" name="Total" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ═══ SECTION 4: Leads & Prospecção ═══ */}
          <SectionHeader title="Leads & Prospecção" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Leads por etiqueta" loading={loadingEtiqueta} isEmpty={!leadsByEtiqueta.length}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leadsByEtiqueta} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={90} className="fill-muted-foreground" />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                    {leadsByEtiqueta.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Leads por funil" loading={loadingByFunil} isEmpty={!leadsByFunil.length}>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leadsByFunil} dataKey="total" nameKey="nome" cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={2}>
                      {leadsByFunil.map((f, i) => <Cell key={i} fill={f.cor || DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {leadsByFunil.map((f, i) => (
                    <div key={f.nome} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: f.cor || DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-muted-foreground">{f.nome}</span>
                      <span className="font-medium">{f.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Origem dos leads" loading={loadingOrigem} isEmpty={!leadsByOrigem.length}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leadsByOrigem}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="origem" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(220 13% 91%)', fontSize: 13 }} />
                  <Bar dataKey="total" name="Leads" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </AppLayout>
  );
}
