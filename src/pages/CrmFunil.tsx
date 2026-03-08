import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronDown, Pencil, Filter, MoreHorizontal, ChevronRight, Search, X, UserCircle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { NovoNegocioModal } from '@/components/crm/NovoNegocioModal';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { EditarFunilModal } from '@/components/crm/EditarFunilModal';
import { CriarFunilModal } from '@/components/crm/CriarFunilModal';
import { LeadDrawer } from '@/components/crm/LeadDrawer';
import { useFunilRealtime } from '@/hooks/useFunilRealtime';

interface Funil {
  id: number;
  nome: string;
}

interface EtapaFunil {
  id: number;
  nome: string;
  ordem: number;
  cor: string | null;
}

export interface LeadAtividade {
  id: number;
  assunto: string;
  data_vencimento: string;
  concluida: boolean;
  atribuida_a: string | null;
  atribuida_a_nome?: string | null;
  descricao?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
}

export interface LeadCard {
  id: number;
  nome: string;
  empresa_cliente: string | null;
  whatsapp: string | null;
  valor_estimado: number | null;
  data_criacao: string | null;
  id_etapa_atual: number;
  ordem_no_funil: number | null;
  proprietario_id: string | null;
  etiquetas: { nome: string; cor: string }[];
  proximaAtividade: LeadAtividade | null;
  status?: string | null;
  motivo_perda?: string | null;
  valor_final?: number | null;
}

export default function CrmFunil() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [funis, setFunis] = useState<Funil[]>([]);
  const [funilAtual, setFunilAtual] = useState<number | null>(null);
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);
  const [loadingFunis, setLoadingFunis] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEtapaId, setModalEtapaId] = useState<number | null>(null);
  const [editarFunilOpen, setEditarFunilOpen] = useState(false);
  const [criarFunilOpen, setCriarFunilOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [filterProprietarioId, setFilterProprietarioId] = useState<string | null>(null);
  const [proprietarios, setProprietarios] = useState<{id: string; nome: string}[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dragGanhoLeadId, setDragGanhoLeadId] = useState<number | null>(null);
  const [dragPerdidoLeadId, setDragPerdidoLeadId] = useState<number | null>(null);
  const [dragMotivoPerda, setDragMotivoPerda] = useState('');

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch proprietários (users of the company)
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from('user_empresa')
        .select('user_id')
        .eq('empresa_id', empresaId);
      if (!data || data.length === 0) return;
      const userIds = data.map(d => d.user_id);
      // Fetch names from leads_crm proprietario usage or auth
      const { data: usersData } = await supabase.rpc('get_usuarios_empresa', { empresa_id_param: empresaId });
      if (usersData) {
        setProprietarios(usersData.map((u: any) => ({ id: u.id, nome: u.nome || u.email })));
      }
    })();
  }, [empresaId]);

  // Realtime leads
  const { leads: realtimeLeads, setLeads, wonLeads: realtimeWonLeads, lostLeads: realtimeLostLeads, loading: loadingLeads, etiquetaVersion, atividadeVersion } = useFunilRealtime(funilAtual || 0);

  // Enrich leads with etiquetas
  const [leads, setEnrichedLeads] = useState<LeadCard[]>([]);
  const [wonLeads, setEnrichedWonLeads] = useState<LeadCard[]>([]);
  const [lostLeads, setEnrichedLostLeads] = useState<LeadCard[]>([]);

  const mapLeads = (rawLeads: any[], etiquetasMap: Record<number, { nome: string; cor: string }[]>, atividadesMap: Record<number, LeadAtividade | null>): LeadCard[] => {
    return rawLeads.map((l: any) => ({
      id: l.id,
      nome: l.nome,
      empresa_cliente: l.empresa_cliente,
      whatsapp: l.whatsapp,
      valor_estimado: l.valor_estimado,
      data_criacao: l.data_criacao,
      id_etapa_atual: l.id_etapa_atual,
      ordem_no_funil: l.ordem_no_funil,
      proprietario_id: l.proprietario_id,
      etiquetas: etiquetasMap[l.id] || [],
      proximaAtividade: atividadesMap[l.id] || null,
      status: l.status,
      motivo_perda: l.motivo_perda,
      valor_final: l.valor_final,
    }));
  };

  useEffect(() => {
    const allRaw = [...realtimeLeads, ...realtimeWonLeads, ...realtimeLostLeads];
    if (!allRaw.length) {
      setEnrichedLeads([]);
      setEnrichedWonLeads([]);
      setEnrichedLostLeads([]);
      return;
    }
    const enrichLeads = async () => {
      const leadIds = allRaw.map((l: any) => l.id);
      let etiquetasMap: Record<number, { nome: string; cor: string }[]> = {};
      let atividadesMap: Record<number, LeadAtividade | null> = {};
      
      if (leadIds.length > 0) {
        const [etiquetasRes, atividadesRes] = await Promise.all([
          supabase
            .from('lead_etiquetas')
            .select('id_lead, etiquetas_card(nome, cor)')
            .in('id_lead', leadIds),
          supabase
            .from('atividades')
            .select('id, assunto, data_vencimento, concluida, atribuida_a, id_lead, descricao, hora_inicio, hora_fim')
            .in('id_lead', leadIds)
            .eq('concluida', false)
            .order('data_vencimento', { ascending: true }),
        ]);
        
        if (etiquetasRes.data) {
          for (const item of etiquetasRes.data) {
            if (!etiquetasMap[item.id_lead]) etiquetasMap[item.id_lead] = [];
            const ec = item.etiquetas_card as any;
            if (ec) etiquetasMap[item.id_lead].push({ nome: ec.nome, cor: ec.cor });
          }
        }

        if (atividadesRes.data) {
          for (const at of atividadesRes.data) {
            const lid = (at as any).id_lead;
            if (lid && !atividadesMap[lid]) {
              const ownerName = proprietarios.find(p => p.id === at.atribuida_a)?.nome || null;
              atividadesMap[lid] = {
                id: at.id,
                assunto: at.assunto,
                data_vencimento: at.data_vencimento,
                concluida: at.concluida ?? false,
                atribuida_a: at.atribuida_a,
                atribuida_a_nome: ownerName,
                descricao: at.descricao,
                hora_inicio: at.hora_inicio,
                hora_fim: at.hora_fim,
              };
            }
          }
        }
      }

      setEnrichedLeads(mapLeads(realtimeLeads, etiquetasMap, atividadesMap));
      setEnrichedWonLeads(mapLeads(realtimeWonLeads, etiquetasMap, atividadesMap));
      setEnrichedLostLeads(mapLeads(realtimeLostLeads, etiquetasMap, atividadesMap));
    };
    enrichLeads();
  }, [realtimeLeads, realtimeWonLeads, realtimeLostLeads, reloadKey, etiquetaVersion, atividadeVersion, proprietarios]);

  const loading = loadingFunis || loadingLeads;

  // Fetch funis
  useEffect(() => {
    if (!empresaId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .order('ordem');
      if (data && data.length > 0) {
        setFunis(data);
        setFunilAtual(data[0].id);
      }
      setLoadingFunis(false);
    };
    fetch();
  }, [empresaId, reloadKey]);

  // Fetch etapas when funil changes
  useEffect(() => {
    if (!funilAtual) return;
    const fetchEtapas = async () => {
      const { data: etapasData } = await supabase
        .from('etapas_funil')
        .select('id, nome, ordem, cor')
        .eq('id_funil', funilAtual)
        .eq('ativo', true)
        .order('ordem');

      if (etapasData) setEtapas(etapasData);
    };
    fetchEtapas();
  }, [funilAtual, reloadKey]);

  const handleMoveLead = useCallback(async (leadId: number, newEtapaId: number, newOrder: number) => {
    // Optimistic update
    setLeads((prev: any[]) => prev.map(l => 
      l.id === leadId ? { ...l, id_etapa_atual: newEtapaId, ordem_no_funil: newOrder } : l
    ));

    const { error } = await supabase
      .from('leads_crm')
      .update({
        id_etapa_atual: newEtapaId,
        ordem_no_funil: newOrder,
      })
      .eq('id', leadId);

    if (error) {
      toast({ title: 'Erro ao mover negócio', description: error.message, variant: 'destructive' });
    }
  }, [toast, setLeads]);

  const handleNewDeal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // totalNegocios computed after filteredLeads below
  const funilNome = funis.find(f => f.id === funilAtual)?.nome || '';

  // Search leads across all funnels
  useEffect(() => {
    if (!searchQuery.trim() || !empresaId) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('leads_crm')
        .select('id, nome, empresa_cliente, whatsapp, valor_estimado, id_funil, funis(nome), etapas_funil(nome)')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .eq('status', 'aberto')
        .or(`nome.ilike.%${searchQuery.trim()}%,empresa_cliente.ilike.%${searchQuery.trim()}%,whatsapp.ilike.%${searchQuery.trim()}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, empresaId]);

  const filteredLeads = useMemo(() => {
    if (!filterProprietarioId) return leads;
    return leads.filter(l => l.proprietario_id === filterProprietarioId);
  }, [leads, filterProprietarioId]);

  const filteredWonLeads = useMemo(() => {
    if (!filterProprietarioId) return wonLeads;
    return wonLeads.filter(l => l.proprietario_id === filterProprietarioId);
  }, [wonLeads, filterProprietarioId]);

  const filteredLostLeads = useMemo(() => {
    if (!filterProprietarioId) return lostLeads;
    return lostLeads.filter(l => l.proprietario_id === filterProprietarioId);
  }, [lostLeads, filterProprietarioId]);

  const leadsByEtapa = useMemo(() => {
    const map: Record<number, LeadCard[]> = {};
    for (const etapa of etapas) {
      map[etapa.id] = [];
    }
    for (const lead of filteredLeads) {
      if (map[lead.id_etapa_atual]) {
        map[lead.id_etapa_atual].push(lead);
      }
    }
    return map;
  }, [filteredLeads, etapas]);

  const totalNegocios = filterProprietarioId ? filteredLeads.length : leads.length;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-1.5"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Negócio
              <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
            </Button>

            {/* Search field */}
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                  placeholder="Buscar negócio..."
                  className="h-9 w-[260px] rounded-md border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              {searchOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 mt-1 w-[360px] bg-popover border border-border rounded-md shadow-lg z-50 max-h-[320px] overflow-y-auto">
                  {searching ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">Nenhum negócio encontrado</div>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.id}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/50 flex flex-col gap-0.5 border-b border-border last:border-0 transition-colors"
                        onClick={() => {
                          if (r.id_funil !== funilAtual) setFunilAtual(r.id_funil);
                          setSelectedLeadId(r.id);
                          setDrawerOpen(true);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">{r.nome}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {r.empresa_cliente && <span>{r.empresa_cliente}</span>}
                          {(r.funis as any)?.nome && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{(r.funis as any).nome}</span>
                          )}
                          {r.valor_estimado != null && (
                            <span>R$ {Number(r.valor_estimado).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{totalNegocios} negócios</span>

            <Select
              value={funilAtual?.toString() || ''}
              onValueChange={(v) => setFunilAtual(Number(v))}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Selecionar funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditarFunilOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCriarFunilOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={filterProprietarioId ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 relative"
                >
                  <Filter className="h-4 w-4" />
                  {filterProprietarioId && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-2" align="end">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Filtrar por proprietário</p>
                <button
                  className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors ${!filterProprietarioId ? 'bg-accent font-medium' : ''}`}
                  onClick={() => { setFilterProprietarioId(null); setFilterOpen(false); }}
                >
                  Todos
                </button>
                {proprietarios.map(p => (
                  <button
                    key={p.id}
                    className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors flex items-center gap-2 ${filterProprietarioId === p.id ? 'bg-accent font-medium' : ''}`}
                    onClick={() => { setFilterProprietarioId(p.id); setFilterOpen(false); }}
                  >
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {p.nome}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando funil...
            </div>
          ) : funis.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-muted-foreground text-lg">Você não possui nenhum funil criado.</p>
              <Button
                onClick={() => setCriarFunilOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Criar seu primeiro funil
              </Button>
            </div>
          ) : etapas.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhuma etapa configurada. Edite o funil para adicionar etapas.
            </div>
          ) : (
            <KanbanBoard
              etapas={etapas}
              leadsByEtapa={leadsByEtapa}
              wonLeads={filteredWonLeads}
              lostLeads={filteredLostLeads}
              onMoveLead={handleMoveLead}
              onLeadClick={(id) => { setSelectedLeadId(id); setDrawerOpen(true); }}
              onAddClick={(etapaId) => { setModalEtapaId(etapaId); setModalOpen(true); }}
            />
          )}
        </div>
      </div>

      {funilAtual && etapas.length > 0 && (
        <NovoNegocioModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setModalEtapaId(null); }}
          funilId={funilAtual}
          etapas={etapas}
          empresaId={empresaId!}
          onCreated={handleNewDeal}
          defaultEtapaId={modalEtapaId}
        />
      )}

      {funilAtual && (
        <EditarFunilModal
          open={editarFunilOpen}
          onOpenChange={setEditarFunilOpen}
          funilId={funilAtual}
          funilNome={funilNome}
          etapas={etapas}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
      {empresaId && (
        <CriarFunilModal
          open={criarFunilOpen}
          onOpenChange={setCriarFunilOpen}
          empresaId={empresaId}
          onCreated={() => setReloadKey((k) => k + 1)}
        />
      )}
      <LeadDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        leadId={selectedLeadId}
        onLeadChanged={() => setReloadKey((k) => k + 1)}
      />
    </AppLayout>
  );
}
