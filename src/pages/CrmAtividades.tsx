import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAtividadesRealtime, AtividadeRow } from '@/hooks/useAtividadesRealtime';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ActivityModal } from '@/components/crm/ActivityModal';
import { LeadDrawer } from '@/components/crm/LeadDrawer';
import {
  Plus, ChevronDown, Filter, MoreHorizontal, ArrowUp, ArrowDown,
  Phone, Video, Mail, FileText, DollarSign, AlertCircle, Pencil, Copy, Trash2, CalendarIcon, CheckSquare,
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, addWeeks, startOfWeek, endOfWeek, isWithinInterval, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const iconePorTipo: Record<string, React.ReactNode> = {
  follow_up: <Phone className="h-4 w-4" />,
  reuniao: <Video className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  ligacao: <Phone className="h-4 w-4" />,
  proposta: <FileText className="h-4 w-4" />,
  faturar: <DollarSign className="h-4 w-4" />,
  identificar_problema: <AlertCircle className="h-4 w-4" />,
};

type QuickFilter = 'todas' | 'concluido' | 'para_fazer' | 'vencido' | 'hoje' | 'amanha' | 'esta_semana' | 'proxima_semana' | 'periodo';

function getDateSP(dateStr: string) {
  return new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function getRowColor(dataVencimento: string, concluida: boolean) {
  if (concluida) return 'bg-muted/40';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = getDateSP(dataVencimento);
  v.setHours(0, 0, 0, 0);
  const diff = Math.floor((v.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'bg-destructive/5';
  if (diff === 0) return 'bg-emerald-50 dark:bg-emerald-950/20';
  return '';
}

function formatarData(dataStr: string) {
  const d = getDateSP(dataStr);
  const hoje = new Date();
  const diff = differenceInCalendarDays(d, hoje);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return format(d, "dd 'de' MMM. 'de' yyyy", { locale: ptBR });
}

function getDateColor(dataStr: string, concluida: boolean) {
  if (concluida) return 'text-muted-foreground';
  const d = getDateSP(dataStr);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d < hoje) return 'text-destructive font-medium';
  if (d.getTime() === hoje.getTime()) return 'text-emerald-600 dark:text-emerald-400 font-medium';
  return 'text-muted-foreground';
}

export default function CrmAtividades() {
  const { empresaId, user } = useAuth();
  const { toast } = useToast();
  const { atividades, loading } = useAtividadesRealtime(empresaId);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('para_fazer');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Advanced filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'todas' | 'concluidas' | 'pendentes'>('todas');
  const [filterUsuarios, setFilterUsuarios] = useState<string[]>([]);
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>();
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>();

  // Users list for filter
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [funis, setFunis] = useState<{ id: number; nome: string }[]>([]);

  // Modals
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [concluirId, setConcluirId] = useState<number | null>(null);
  const [excluirId, setExcluirId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLeadId, setDrawerLeadId] = useState<number | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkExcluirOpen, setBulkExcluirOpen] = useState(false);
  const [bulkConcluirOpen, setBulkConcluirOpen] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    const fetchMeta = async () => {
      const [usersRes, funisRes] = await Promise.all([
        supabase.rpc('get_usuarios_empresa', { empresa_id_param: empresaId }),
        supabase.from('funis').select('id, nome').eq('id_empresa', empresaId).eq('ativo', true).order('ordem'),
      ]);
      if (usersRes.data) setUsuarios(usersRes.data.map((u: any) => ({ id: u.id, nome: u.nome })));
      if (funisRes.data) setFunis(funisRes.data);
    };
    fetchMeta();
  }, [empresaId]);

  const filtered = useMemo(() => {
    let items = [...atividades];

    // Quick filter
    items = items.filter(a => {
      const d = getDateSP(a.data_vencimento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);

      switch (quickFilter) {
        case 'todas': return true;
        case 'concluido': return a.concluida;
        case 'para_fazer': return !a.concluida;
        case 'vencido': return !a.concluida && d < hoje;
        case 'hoje': return isToday(getDateSP(a.data_vencimento));
        case 'amanha': return isTomorrow(getDateSP(a.data_vencimento));
        case 'esta_semana': return isThisWeek(getDateSP(a.data_vencimento), { weekStartsOn: 1 });
        case 'proxima_semana': {
          const inicio = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
          const fim = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
          return isWithinInterval(getDateSP(a.data_vencimento), { start: inicio, end: fim });
        }
        case 'periodo': {
          if (periodoInicio && getDateSP(a.data_vencimento) < periodoInicio) return false;
          if (periodoFim) {
            const fimDia = new Date(periodoFim);
            fimDia.setHours(23, 59, 59, 999);
            if (getDateSP(a.data_vencimento) > fimDia) return false;
          }
          return true;
        }
        default: return true;
      }
    });

    // Advanced filters
    if (filterStatus === 'concluidas') items = items.filter(a => a.concluida);
    if (filterStatus === 'pendentes') items = items.filter(a => !a.concluida);
    if (filterUsuarios.length > 0) items = items.filter(a => a.atribuida_a && filterUsuarios.includes(a.atribuida_a));
    if (filterFunis.length > 0) items = items.filter(a => a.funil_id && filterFunis.includes(String(a.funil_id)));

    // Sort
    items.sort((a, b) => {
      const diff = new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });

    return items;
  }, [atividades, quickFilter, sortDir, filterStatus, filterUsuarios, filterFunis, periodoInicio, periodoFim]);

  // User name map
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    usuarios.forEach(u => { map[u.id] = u.nome; });
    return map;
  }, [usuarios]);

  const handleConcluir = async () => {
    if (!concluirId) return;
    await supabase.from('atividades').update({
      concluida: true,
      concluida_em: new Date().toISOString(),
      concluida_por: user?.id || null,
    }).eq('id', concluirId);
    setConcluirId(null);
    toast({ title: 'Atividade concluída' });
  };

  const handleExcluir = async () => {
    if (!excluirId) return;
    await supabase.from('atividades').delete().eq('id', excluirId);
    setExcluirId(null);
    toast({ title: 'Atividade excluída' });
  };

  const handleBulkExcluir = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('atividades').delete().eq('id', id);
    }
    setSelectedIds(new Set());
    setBulkExcluirOpen(false);
    toast({ title: `${ids.length} atividade(s) excluída(s)` });
  };

  const handleBulkConcluir = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('atividades').update({
        concluida: true,
        concluida_em: new Date().toISOString(),
        concluida_por: user?.id || null,
      }).eq('id', id);
    }
    setSelectedIds(new Set());
    setBulkConcluirOpen(false);
    toast({ title: `${ids.length} atividade(s) concluída(s)` });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  const handleDuplicar = async (a: AtividadeRow) => {
    await supabase.from('atividades').insert({
      id_empresa: a.id_empresa,
      id_lead: a.id_lead,
      tipo: a.tipo,
      assunto: `${a.assunto} (Cópia)`,
      descricao: a.descricao,
      atribuida_a: a.atribuida_a,
      data_vencimento: a.data_vencimento,
      hora_inicio: a.hora_inicio,
      hora_fim: a.hora_fim,
      prioridade: a.prioridade,
      created_by: user?.id || null,
      concluida: false,
    });
    toast({ title: 'Atividade duplicada' });
  };

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: 'todas', label: 'Todas atividades' },
    { key: 'concluido', label: 'Concluído' },
    { key: 'para_fazer', label: 'Para fazer' },
    { key: 'vencido', label: 'Vencido' },
    { key: 'hoje', label: 'Hoje' },
    { key: 'amanha', label: 'Amanhã' },
    { key: 'esta_semana', label: 'Esta semana' },
    { key: 'proxima_semana', label: 'Próxima semana' },
    { key: 'periodo', label: 'Selecionar período' },
  ];

  const hasActiveAdvancedFilters = filterStatus !== 'todas' || filterUsuarios.length > 0 || filterFunis.length > 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-1.5"
              onClick={() => { setEditingActivity(null); setActivityModalOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Atividade
              <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{filtered.length} atividades</span>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-1.5", hasActiveAdvancedFilters && "border-primary text-primary")}
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              Filtro
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1 px-4 py-2 border-b bg-card overflow-x-auto">
          {quickFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setQuickFilter(f.key)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors',
                quickFilter === f.key
                  ? 'text-foreground font-semibold underline underline-offset-4 decoration-2 decoration-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}

          {/* Date pickers for 'periodo' */}
          {quickFilter === 'periodo' && (
            <div className="flex items-center gap-2 ml-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {periodoInicio ? format(periodoInicio, 'dd/MM/yyyy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodoInicio} onSelect={setPeriodoInicio} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {periodoFim ? format(periodoFim, 'dd/MM/yyyy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodoFim} onSelect={setPeriodoFim} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50">
            <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkConcluirOpen(true)}>
              <CheckSquare className="h-4 w-4" /> Concluir
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setBulkExcluirOpen(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Carregando atividades...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Nenhuma atividade encontrada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[40px]" />
                  <TableHead className="w-[80px]">Concluído</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Atribuído a usuário</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Data de vencimento
                      {sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    </span>
                  </TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow
                    key={a.id}
                    className={cn(
                      getRowColor(a.data_vencimento, a.concluida),
                      'cursor-pointer hover:bg-muted/30 transition-colors',
                      a.concluida && 'opacity-60'
                    )}
                    onClick={() => {
                      if (a.id_lead) {
                        setDrawerLeadId(a.id_lead);
                        setDrawerOpen(true);
                      }
                    }}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(a.id)}
                        onCheckedChange={() => toggleSelect(a.id)}
                      />
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => { setEditingActivity(a); setActivityModalOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicar(a)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setExcluirId(a.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={a.concluida}
                        disabled={a.concluida}
                        onCheckedChange={() => { if (!a.concluida) setConcluirId(a.id); }}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {iconePorTipo[a.tipo] || <FileText className="h-4 w-4" />}
                        </span>
                        <span className={cn(
                          'text-sm',
                          a.concluida && 'line-through text-muted-foreground'
                        )}>
                          {a.assunto}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.funil_nome || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.atribuida_a ? (userNameMap[a.atribuida_a] || '—') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.lead_nome || '—'}</TableCell>
                    <TableCell className={cn('text-sm', getDateColor(a.data_vencimento, a.concluida))}>
                      {formatarData(a.data_vencimento)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Activity Modal */}
      {empresaId && (
        <ActivityModal
          leadId={editingActivity?.id_lead || 0}
          empresaId={empresaId}
          activity={editingActivity}
          isOpen={activityModalOpen}
          onClose={() => { setActivityModalOpen(false); setEditingActivity(null); }}
        />
      )}

      {/* Lead Drawer */}
      <LeadDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        leadId={drawerLeadId}
      />

      {/* Confirm conclude */}
      <AlertDialog open={!!concluirId} onOpenChange={() => setConcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação marcará a atividade como concluída.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConcluir} className="bg-emerald-500 hover:bg-emerald-600">Concluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete */}
      <AlertDialog open={!!excluirId} onOpenChange={() => setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk conclude */}
      <AlertDialog open={bulkConcluirOpen} onOpenChange={setBulkConcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir {selectedIds.size} atividade(s)?</AlertDialogTitle>
            <AlertDialogDescription>Todas as atividades selecionadas serão marcadas como concluídas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkConcluir} className="bg-emerald-500 hover:bg-emerald-600">Concluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete */}
      <AlertDialog open={bulkExcluirOpen} onOpenChange={setBulkExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} atividade(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkExcluir} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Filtros avançados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="concluidas">Concluídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Atribuído a</Label>
              <div className="mt-1 space-y-1 max-h-[140px] overflow-y-auto border rounded-md p-2">
                {usuarios.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filterUsuarios.includes(u.id)}
                      onCheckedChange={(checked) => {
                        setFilterUsuarios(prev =>
                          checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                        );
                      }}
                    />
                    {u.nome}
                  </label>
                ))}
                {usuarios.length === 0 && <span className="text-xs text-muted-foreground">Nenhum usuário encontrado</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Funil</Label>
              <div className="mt-1 space-y-1 max-h-[140px] overflow-y-auto border rounded-md p-2">
                {funis.map(f => (
                  <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filterFunis.includes(String(f.id))}
                      onCheckedChange={(checked) => {
                        setFilterFunis(prev =>
                          checked ? [...prev, String(f.id)] : prev.filter(id => id !== String(f.id))
                        );
                      }}
                    />
                    {f.nome}
                  </label>
                ))}
                {funis.length === 0 && <span className="text-xs text-muted-foreground">Nenhum funil encontrado</span>}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => { setFilterStatus('todas'); setFilterUsuarios([]); setFilterFunis([]); }}
            >
              Limpar filtros
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
