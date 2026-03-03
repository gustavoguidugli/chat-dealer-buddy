import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, MoreHorizontal, FileText, Calendar,
  CheckCircle2, MessageSquare, ArrowRightLeft, Trophy, XCircle,
  Pencil, Pin, Plus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number | null;
  onLeadChanged?: () => void;
}

interface LeadDetail {
  id: number;
  nome: string;
  empresa_cliente: string | null;
  whatsapp: string | null;
  email: string | null;
  valor_estimado: number | null;
  valor_final: number | null;
  status: string | null;
  campos_extras: Record<string, any> | null;
  id_funil: number;
  id_empresa: number;
  id_etapa_atual: number;
  proprietario_id: string | null;
  data_entrada_etapa_atual: string | null;
  data_criacao: string | null;
  motivo_perda: string | null;
  cpf_cnpj: string | null;
  origem: string | null;
  midia: string | null;
  campanha: string | null;
}

interface EtapaInfo {
  id: number;
  nome: string;
  ordem: number;
}

interface CampoCustomizado {
  id: number;
  nome: string;
  slug: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
}

interface Anotacao {
  id: number;
  conteudo: string;
  criado_por: string | null;
  created_at: string | null;
}

interface Atividade {
  id: number;
  assunto: string;
  tipo: string;
  data_vencimento: string;
  concluida: boolean;
  prioridade: string | null;
  atribuida_a: string | null;
  descricao: string | null;
}

interface HistoricoItem {
  id: number;
  tipo_evento: string;
  descricao: string;
  created_at: string | null;
  usuario_id: string | null;
  metadados: any;
  etapa_destino_id: number | null;
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) +
    ` às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function diasEntre(dateStr: string | null) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export function LeadDrawer({ open, onOpenChange, leadId, onLeadChanged }: LeadDrawerProps) {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [funilNome, setFunilNome] = useState('');
  const [etapas, setEtapas] = useState<EtapaInfo[]>([]);
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [camposAbertos, setCamposAbertos] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'anotacoes' | 'atividades'>('todos');

  // Dialogs
  const [ganhoOpen, setGanhoOpen] = useState(false);
  const [perdidoOpen, setPerdidoOpen] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [concluirAtividadeId, setConcluirAtividadeId] = useState<number | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('texto');
  const [savingField, setSavingField] = useState(false);

  const handleAddField = async () => {
    if (!newFieldName.trim() || !lead) return;
    setSavingField(true);
    const slug = newFieldName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { error } = await supabase.from('campos_customizados').insert({
      nome: newFieldName.trim(),
      slug,
      tipo: newFieldType,
      id_empresa: lead.id_empresa,
      id_funil: lead.id_funil,
      ordem: campos.length,
      ativo: true,
      obrigatorio: false,
    });
    setSavingField(false);
    if (error) {
      toast({ title: 'Erro ao criar campo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campo criado com sucesso' });
      setNewFieldName('');
      setNewFieldType('texto');
      setAddFieldOpen(false);
      fetchAll();
    }
  };

  const fetchAll = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);

    const [leadRes, anotRes, ativRes, histRes] = await Promise.all([
      supabase.from('leads_crm').select('*').eq('id', leadId).single(),
      supabase.from('anotacoes_lead').select('*').eq('id_lead', leadId).order('created_at', { ascending: false }),
      supabase.from('atividades').select('*').eq('id_lead', leadId).order('data_vencimento'),
      supabase.from('historico_lead').select('*').eq('id_lead', leadId).order('created_at', { ascending: false }),
    ]);

    if (leadRes.data) {
      const l = leadRes.data;
      setLead({
        ...l,
        campos_extras: (l.campos_extras as Record<string, any>) || {},
      });

      // Fetch funil info + etapas + campos
      const [funilRes, etapasRes, camposRes] = await Promise.all([
        supabase.from('funis').select('nome').eq('id', l.id_funil).single(),
        supabase.from('etapas_funil').select('id, nome, ordem').eq('id_funil', l.id_funil).eq('ativo', true).order('ordem'),
        supabase.from('campos_customizados').select('*').or(`id_funil.is.null,id_funil.eq.${l.id_funil}`).eq('id_empresa', l.id_empresa).eq('ativo', true).order('ordem'),
      ]);

      setFunilNome(funilRes.data?.nome || '');
      setEtapas(etapasRes.data || []);
      setCampos((camposRes.data || []) as CampoCustomizado[]);
    }

    setAnotacoes((anotRes.data || []) as Anotacao[]);
    setAtividades((ativRes.data || []) as Atividade[]);
    setHistorico((histRes.data || []) as HistoricoItem[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    if (open && leadId) fetchAll();
  }, [open, leadId, fetchAll]);

  // --- ACTIONS ---

  const handleGanho = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').update({
      status: 'ganho',
      data_ganho: new Date().toISOString(),
    }).eq('id', lead.id);
    toast({ title: 'Lead marcado como ganho! 🎉' });
    setGanhoOpen(false);
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handlePerdido = async () => {
    if (!lead || !motivoPerda.trim()) return;
    await supabase.from('leads_crm').update({
      status: 'perdido',
      motivo_perda: motivoPerda.trim(),
      data_perdido: new Date().toISOString(),
    }).eq('id', lead.id);
    toast({ title: 'Lead marcado como perdido' });
    setPerdidoOpen(false);
    setMotivoPerda('');
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handleExcluir = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').update({ ativo: false }).eq('id', lead.id);
    toast({ title: 'Lead excluído' });
    setExcluirOpen(false);
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handleDuplicar = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').insert({
      nome: `${lead.nome} (Cópia)`,
      id_empresa: empresaId!,
      id_funil: lead.id_funil,
      id_etapa_atual: lead.id_etapa_atual,
      campos_extras: lead.campos_extras || {},
      valor_estimado: lead.valor_estimado,
      empresa_cliente: lead.empresa_cliente,
      whatsapp: lead.whatsapp,
      email: lead.email,
      proprietario_id: lead.proprietario_id,
      status: 'aberto',
    } as any);
    toast({ title: 'Lead duplicado com sucesso!' });
    setDuplicarOpen(false);
    onLeadChanged?.();
  };

  const handleSalvarAnotacao = async () => {
    if (!lead || !novaAnotacao.trim()) return;
    setSavingAnotacao(true);
    await supabase.from('anotacoes_lead').insert({
      id_lead: lead.id,
      id_empresa: empresaId!,
      conteudo: novaAnotacao.trim(),
      criado_por: user?.id || null,
    });
    setNovaAnotacao('');
    setSavingAnotacao(false);
    fetchAll();
  };

  const handleConcluirAtividade = async () => {
    if (!concluirAtividadeId) return;
    await supabase.from('atividades').update({
      concluida: true,
      concluida_em: new Date().toISOString(),
      concluida_por: user?.id || null,
    }).eq('id', concluirAtividadeId);
    setConcluirAtividadeId(null);
    fetchAll();
  };

  const handleSaveField = async (slug: string) => {
    if (!lead) return;
    const newExtras = { ...(lead.campos_extras || {}), [slug]: editingValue };
    await supabase.from('leads_crm').update({
      campos_extras: newExtras,
    }).eq('id', lead.id);
    setLead({ ...lead, campos_extras: newExtras });
    setEditingField(null);
    setEditingValue('');
  };

  if (!lead && !loading) return null;

  const etapaAtualOrdem = etapas.find(e => e.id === lead?.id_etapa_atual)?.ordem ?? 0;

  const atividadesPendentes = atividades.filter(a => !a.concluida);
  const atividadesConcluidas = atividades.filter(a => a.concluida);

  const filteredHistory = historico.filter(h => {
    if (historyFilter === 'todos') return true;
    if (historyFilter === 'anotacoes') return h.tipo_evento === 'anotacao';
    if (historyFilter === 'atividades') return h.tipo_evento === 'atividade_concluida' || h.tipo_evento === 'criado';
    return true;
  });

  const histAnotCount = historico.filter(h => h.tipo_evento === 'anotacao').length;
  const histAtivCount = historico.filter(h => h.tipo_evento !== 'anotacao' && h.tipo_evento !== 'mudou_etapa' && h.tipo_evento !== 'ganho' && h.tipo_evento !== 'perdido').length;

  function getHistoricoIcon(tipo: string) {
    switch (tipo) {
      case 'anotacao': return <MessageSquare className="h-4 w-4 text-amber-600" />;
      case 'mudou_etapa': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case 'ganho': return <Trophy className="h-4 w-4 text-green-600" />;
      case 'perdido': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[75vw] p-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Carregando...</div>
          ) : lead ? (
            <>
              {/* HEADER */}
              <div className="border-b px-6 py-4 bg-card shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{lead.nome}</h1>
                    <span className="text-sm text-primary cursor-pointer hover:underline">{funilNome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                      onClick={() => setGanhoOpen(true)}
                    >
                      Ganho
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold"
                      onClick={() => setPerdidoOpen(true)}
                    >
                      Perdido
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDuplicarOpen(true)}>Duplicar lead</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setExcluirOpen(true)}>Excluir lead</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex gap-0.5 mt-4">
                  {etapas.map((etapa, i) => {
                    const isPast = etapa.ordem < etapaAtualOrdem;
                    const isCurrent = etapa.id === lead.id_etapa_atual;
                    const dias = isCurrent ? diasEntre(lead.data_entrada_etapa_atual) : 0;
                    return (
                      <div key={etapa.id} className="flex-1 flex flex-col items-center">
                        <div
                          className={`h-2 w-full rounded-sm ${
                            isPast || isCurrent ? 'bg-green-500' : 'bg-muted'
                          } ${isCurrent ? 'bg-green-400' : ''} ${isPast ? 'bg-green-600' : ''}`}
                        />
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {isCurrent ? `${dias} dias` : isPast ? `${dias} dias` : etapa.nome}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BODY */}
              <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR - Campos */}
                <div className="w-[260px] border-r bg-muted/30 shrink-0 overflow-y-auto">
                  <Collapsible open={camposAbertos} onOpenChange={setCamposAbertos}>
                    <div className="flex items-center justify-between w-full px-4 py-3">
                      <CollapsibleTrigger className="text-sm font-semibold text-foreground hover:text-foreground/80">
                        Campos
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                        <Popover open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                          <PopoverTrigger asChild>
                            <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" side="bottom" align="end">
                            <p className="text-sm font-semibold text-foreground mb-3">Novo campo</p>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Nome</Label>
                                <Input
                                  value={newFieldName}
                                  onChange={e => setNewFieldName(e.target.value)}
                                  placeholder="Ex: Gasto Mensal"
                                  className="h-8 text-sm mt-1"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Tipo</Label>
                                <Select value={newFieldType} onValueChange={setNewFieldType}>
                                  <SelectTrigger className="h-8 text-sm mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="texto">Texto</SelectItem>
                                    <SelectItem value="numero">Número</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="select">Seleção</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                                onClick={handleAddField}
                                disabled={!newFieldName.trim() || savingField}
                              >
                                {savingField ? 'Criando...' : 'Adicionar'}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="px-4 pb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Negócio
                        </p>
                        {campos.map(campo => {
                          const value = lead.campos_extras?.[campo.slug];
                          const isEditing = editingField === campo.slug;
                          return (
                            <div key={campo.id} className="mb-3">
                              <div
                                className="flex items-start gap-2 cursor-pointer group"
                                onClick={() => {
                                  if (!isEditing) {
                                    setEditingField(campo.slug);
                                    setEditingValue(value || '');
                                  }
                                }}
                              >
                                <span className="h-2 w-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground">{campo.nome}</p>
                                  {isEditing ? (
                                    <div className="mt-1">
                                      <Input
                                        value={editingValue}
                                        onChange={e => setEditingValue(e.target.value)}
                                        className="h-7 text-xs"
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveField(campo.slug);
                                          if (e.key === 'Escape') setEditingField(null);
                                        }}
                                        onBlur={() => handleSaveField(campo.slug)}
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm text-foreground">
                                      {value || '-'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {campos.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2">Nenhum campo customizado</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* CENTER */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <Tabs defaultValue="anotacoes" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-4 w-fit">
                      <TabsTrigger value="anotacoes" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Anotações
                      </TabsTrigger>
                      <TabsTrigger value="atividade" className="gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Atividade
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB: ANOTAÇÕES */}
                    <TabsContent value="anotacoes" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
                      {/* Input anotação */}
                      <div className="border rounded-lg p-3 mt-3">
                        <Textarea
                          placeholder="Escreva uma anotação, @nome..."
                          value={novaAnotacao}
                          onChange={e => setNovaAnotacao(e.target.value)}
                          className="border-0 p-0 resize-none focus-visible:ring-0 min-h-[60px] text-sm"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{anotacoes.length}/100 notes</span>
                          <Button
                            size="sm"
                            disabled={!novaAnotacao.trim() || savingAnotacao}
                            onClick={handleSalvarAnotacao}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>

                      {/* A fazer */}
                      {atividadesPendentes.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-semibold text-sm text-foreground mb-3">A fazer</h3>
                          <div className="space-y-2">
                            {atividadesPendentes.map(ativ => (
                              <div key={ativ.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={false}
                                  onCheckedChange={() => setConcluirAtividadeId(ativ.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{ativ.assunto}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDateShort(ativ.data_vencimento)}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setConcluirAtividadeId(ativ.id)}>
                                      Concluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Histórico */}
                      <div className="mt-6">
                        <h3 className="font-semibold text-sm text-foreground mb-3">Histórico</h3>
                        <div className="flex gap-3 mb-3">
                          <button
                            className={`text-xs font-medium pb-1 ${historyFilter === 'todos' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                            onClick={() => setHistoryFilter('todos')}
                          >
                            Todos
                          </button>
                          <button
                            className={`text-xs font-medium pb-1 ${historyFilter === 'anotacoes' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                            onClick={() => setHistoryFilter('anotacoes')}
                          >
                            Anotações ({histAnotCount})
                          </button>
                          <button
                            className={`text-xs font-medium pb-1 ${historyFilter === 'atividades' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                            onClick={() => setHistoryFilter('atividades')}
                          >
                            Atividades ({histAtivCount})
                          </button>
                        </div>
                        <div className="space-y-2">
                          {filteredHistory.map(h => (
                            <div
                              key={h.id}
                              className={`flex items-start gap-3 p-3 rounded-lg ${
                                h.tipo_evento === 'anotacao' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/40'
                              }`}
                            >
                              <div className="mt-0.5">{getHistoricoIcon(h.tipo_evento)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  {formatDateShort(h.created_at)}
                                </p>
                                <p className="text-sm text-foreground mt-0.5">
                                  {h.tipo_evento === 'anotacao'
                                    ? (h.metadados as any)?.conteudo_completo || h.descricao
                                    : h.descricao}
                                </p>
                              </div>
                            </div>
                          ))}
                          {filteredHistory.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro</p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB: ATIVIDADE */}
                    <TabsContent value="atividade" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
                      <div className="mt-3">
                        {atividades.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade</p>
                        ) : (
                          <div className="space-y-2">
                            {atividades.map(ativ => (
                              <div key={ativ.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={ativ.concluida}
                                  disabled={ativ.concluida}
                                  onCheckedChange={() => {
                                    if (!ativ.concluida) setConcluirAtividadeId(ativ.id);
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${ativ.concluida ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                    {ativ.assunto}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDateShort(ativ.data_vencimento)}
                                    {ativ.tipo && ` · ${ativ.tipo}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* DIALOGS */}
      <AlertDialog open={ganhoOpen} onOpenChange={setGanhoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como ganho?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja marcar "{lead?.nome}" como ganho?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700 text-white" onClick={handleGanho}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={perdidoOpen} onOpenChange={setPerdidoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como perdido?</AlertDialogTitle>
            <AlertDialogDescription>Informe o motivo da perda.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da perda..."
            value={motivoPerda}
            onChange={e => setMotivoPerda(e.target.value)}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMotivoPerda('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={!motivoPerda.trim()}
              onClick={handlePerdido}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleExcluir}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={duplicarOpen} onOpenChange={setDuplicarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar lead?</AlertDialogTitle>
            <AlertDialogDescription>Deseja duplicar "{lead?.nome}"? Uma cópia será criada na mesma etapa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleDuplicar}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={concluirAtividadeId !== null} onOpenChange={(v) => { if (!v) setConcluirAtividadeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Marcar esta atividade como concluída?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleConcluirAtividade}>
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
