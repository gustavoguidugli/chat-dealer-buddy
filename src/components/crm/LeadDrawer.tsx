import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useLeadRealtime } from '@/hooks/useLeadRealtime';
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
import { EtiquetaSelector } from '@/components/crm/EtiquetaSelector';
import {
  ChevronDown, ChevronUp, MoreHorizontal, FileText, Calendar,
  CheckCircle2, MessageSquare, ArrowRightLeft, Trophy, XCircle,
  Pencil, Pin, Plus, Trash2, GripVertical,
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
  ordem: number;
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

function SortableFieldItem({ campo, index, editingCampos, setEditingCampos, onDelete }: {
  campo: CampoCustomizado;
  index: number;
  editingCampos: CampoCustomizado[];
  setEditingCampos: (c: CampoCustomizado[]) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 p-2 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <Input
          value={campo.nome}
          onChange={e => {
            const updated = [...editingCampos];
            updated[index] = { ...updated[index], nome: e.target.value };
            setEditingCampos(updated);
          }}
          className="h-7 text-xs"
          placeholder="Nome do campo"
        />
        <Select
          value={campo.tipo}
          onValueChange={v => {
            const updated = [...editingCampos];
            updated[index] = { ...updated[index], tipo: v };
            setEditingCampos(updated);
          }}
        >
          <SelectTrigger className="h-7 text-xs">
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
      <button
        className="text-destructive hover:text-destructive/80 shrink-0"
        onClick={() => onDelete(campo.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function LeadDrawer({ open, onOpenChange, leadId, onLeadChanged }: LeadDrawerProps) {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();

  // Realtime data for lead, annotations, activities, history
  const {
    lead: realtimeLead,
    setLead: setRealtimeLead,
    anotacoes: realtimeAnotacoes,
    atividades: realtimeAtividades,
    historico: realtimeHistorico,
    loading: realtimeLoading,
  } = useLeadRealtime(open ? leadId : null);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [funilNome, setFunilNome] = useState('');
  const [etapas, setEtapas] = useState<EtapaInfo[]>([]);
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [loading, setLoading] = useState(false);

  // Map realtime data to typed state
  const anotacoes = useMemo(() => (realtimeAnotacoes || []) as Anotacao[], [realtimeAnotacoes]);
  const atividades = useMemo(() => (realtimeAtividades || []) as Atividade[], [realtimeAtividades]);
  const historico = useMemo(() => (realtimeHistorico || []) as HistoricoItem[], [realtimeHistorico]);

  // UI state
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [camposAbertos, setCamposAbertos] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'anotacoes' | 'atividades'>('todos');
  const [editingAnotacaoId, setEditingAnotacaoId] = useState<number | null>(null);
  const [editingAnotacaoText, setEditingAnotacaoText] = useState('');

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
  const [manageFieldsOpen, setManageFieldsOpen] = useState(false);
  const [editingCampos, setEditingCampos] = useState<CampoCustomizado[]>([]);
  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);

  const openManageFields = () => {
    setEditingCampos(campos.map(c => ({ ...c })));
    setManageFieldsOpen(true);
  };

  const handleUpdateField = async (campo: CampoCustomizado) => {
    const { error } = await supabase.from('campos_customizados')
      .update({ nome: campo.nome, tipo: campo.tipo, ordem: campo.ordem })
      .eq('id', campo.id);
    if (error) {
      toast({ title: 'Erro ao atualizar campo', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteField = async (id: number) => {
    const { error } = await supabase.from('campos_customizados')
      .update({ ativo: false })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir campo', description: error.message, variant: 'destructive' });
    } else {
      setEditingCampos(prev => prev.filter(c => c.id !== id));
      setDeletingFieldId(null);
      toast({ title: 'Campo excluído' });
      fetchAll();
    }
  };

  const handleSaveAllFields = async () => {
    for (const campo of editingCampos) {
      await handleUpdateField(campo);
    }
    toast({ title: 'Campos atualizados' });
    setManageFieldsOpen(false);
    fetchAll();
  };

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = editingCampos.findIndex(c => c.id === active.id);
    const newIndex = editingCampos.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newCampos = [...editingCampos];
    const [moved] = newCampos.splice(oldIndex, 1);
    newCampos.splice(newIndex, 0, moved);
    newCampos.forEach((c, i) => { c.ordem = i; });
    setEditingCampos(newCampos);
  };

  const fieldSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const fieldIds = useMemo(() => editingCampos.map(c => c.id), [editingCampos]);

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

  // Fetch funil metadata (etapas, campos) - not realtime, only when lead changes
  const fetchMeta = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);

    const { data: leadData } = await supabase.from('leads_crm').select('*').eq('id', leadId).single();

    if (leadData) {
      const l = leadData;
      setLead({
        ...l,
        campos_extras: (l.campos_extras as Record<string, any>) || {},
      });

      const [funilRes, etapasRes, camposRes] = await Promise.all([
        supabase.from('funis').select('nome').eq('id', l.id_funil).single(),
        supabase.from('etapas_funil').select('id, nome, ordem').eq('id_funil', l.id_funil).eq('ativo', true).order('ordem'),
        supabase.from('campos_customizados').select('*').or(`id_funil.is.null,id_funil.eq.${l.id_funil}`).eq('id_empresa', l.id_empresa).eq('ativo', true).order('ordem'),
      ]);

      setFunilNome(funilRes.data?.nome || '');
      setEtapas(etapasRes.data || []);
      setCampos((camposRes.data || []) as CampoCustomizado[]);
    }

    setLoading(false);
  }, [leadId]);

  // Keep lead state in sync with realtime updates
  useEffect(() => {
    if (realtimeLead) {
      setLead(prev => prev ? {
        ...prev,
        ...realtimeLead,
        campos_extras: (realtimeLead.campos_extras as Record<string, any>) || prev.campos_extras || {},
      } : null);
    }
  }, [realtimeLead]);

  // Alias for backward compat with field management
  const fetchAll = fetchMeta;

  useEffect(() => {
    if (open && leadId) fetchMeta();
  }, [open, leadId, fetchMeta]);

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
    const { data: anotData } = await supabase.from('anotacoes_lead').insert({
      id_lead: lead.id,
      id_empresa: empresaId!,
      conteudo: novaAnotacao.trim(),
      criado_por: user?.id || null,
    }).select('id').single();

    if (anotData) {
      await supabase.from('historico_lead').insert({
        id_lead: lead.id,
        id_empresa: empresaId!,
        tipo_evento: 'anotacao',
        descricao: novaAnotacao.trim().slice(0, 100),
        usuario_id: user?.id || null,
        metadados: { conteudo_completo: novaAnotacao.trim(), id_anotacao: anotData.id },
      });
    }

    setNovaAnotacao('');
    setSavingAnotacao(false);
    fetchAll();
  };

  const handleEditarAnotacao = async (anotacaoId: number) => {
    if (!editingAnotacaoText.trim()) return;
    await supabase.from('anotacoes_lead').update({ conteudo: editingAnotacaoText.trim() }).eq('id', anotacaoId);
    // Also update historico metadados
    await supabase.from('historico_lead')
      .update({ descricao: editingAnotacaoText.trim().slice(0, 100), metadados: { conteudo_completo: editingAnotacaoText.trim(), id_anotacao: anotacaoId } })
      .eq('tipo_evento', 'anotacao')
      .eq('id_lead', lead!.id)
      .filter('metadados->>id_anotacao', 'eq', String(anotacaoId));
    setEditingAnotacaoId(null);
    setEditingAnotacaoText('');
    fetchAll();
  };

  const handleExcluirAnotacao = async (anotacaoId: number, historicoId: number) => {
    await supabase.from('anotacoes_lead').delete().eq('id', anotacaoId);
    await supabase.from('historico_lead').delete().eq('id', historicoId);
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
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-foreground">{lead.nome}</h1>
                      <EtiquetaSelector leadId={lead.id} empresaId={lead.id_empresa} onChange={onLeadChanged} />
                    </div>
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
                        <Popover open={manageFieldsOpen} onOpenChange={setManageFieldsOpen}>
                          <PopoverTrigger asChild>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={openManageFields} />
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" side="bottom" align="end">
                            <p className="text-sm font-semibold text-foreground mb-3">Gerenciar campos</p>
                            <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                              <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                  {editingCampos.map((campo, index) => (
                                    <SortableFieldItem
                                      key={campo.id}
                                      campo={campo}
                                      index={index}
                                      editingCampos={editingCampos}
                                      setEditingCampos={setEditingCampos}
                                      onDelete={(id) => setDeletingFieldId(id)}
                                    />
                                  ))}
                                  {editingCampos.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum campo</p>
                                  )}
                                </div>
                              </SortableContext>
                            </DndContext>
                            <Button
                              size="sm"
                              className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                              onClick={handleSaveAllFields}
                            >
                              Salvar alterações
                            </Button>
                          </PopoverContent>
                        </Popover>
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
                            <div
                              key={campo.id}
                              className="flex items-center justify-between py-2 px-1 rounded-md group hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                if (!isEditing) {
                                  setEditingField(campo.slug);
                                  setEditingValue(value || '');
                                }
                              }}
                            >
                              <span className="text-xs text-muted-foreground font-medium shrink-0 w-[90px] text-right pr-3">
                                {campo.nome}
                              </span>
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    className="h-7 text-xs flex-1"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveField(campo.slug);
                                      if (e.key === 'Escape') setEditingField(null);
                                    }}
                                    onBlur={() => handleSaveField(campo.slug)}
                                  />
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm text-foreground">{value || '-'}</span>
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
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
                              className={`group flex items-start gap-3 p-3 rounded-lg ${
                                h.tipo_evento === 'anotacao' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/40'
                              }`}
                            >
                              <div className="mt-0.5">{getHistoricoIcon(h.tipo_evento)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  {formatDateShort(h.created_at)}
                                </p>
                                {editingAnotacaoId === (h.metadados as any)?.id_anotacao ? (
                                  <div className="mt-1 space-y-2">
                                    <Textarea
                                      value={editingAnotacaoText}
                                      onChange={e => setEditingAnotacaoText(e.target.value)}
                                      className="text-sm min-h-[50px]"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleEditarAnotacao((h.metadados as any).id_anotacao)}>Salvar</Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingAnotacaoId(null)}>Cancelar</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-foreground mt-0.5">
                                    {h.tipo_evento === 'anotacao'
                                      ? (h.metadados as any)?.conteudo_completo || h.descricao
                                      : h.descricao}
                                  </p>
                                )}
                              </div>
                              {h.tipo_evento === 'anotacao' && (h.metadados as any)?.id_anotacao && editingAnotacaoId !== (h.metadados as any)?.id_anotacao && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingAnotacaoId((h.metadados as any).id_anotacao);
                                      setEditingAnotacaoText((h.metadados as any)?.conteudo_completo || h.descricao);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleExcluirAnotacao((h.metadados as any).id_anotacao, h.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
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

      <AlertDialog open={deletingFieldId !== null} onOpenChange={(v) => { if (!v) setDeletingFieldId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este campo? Os valores já preenchidos nos leads serão mantidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deletingFieldId && handleDeleteField(deletingFieldId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
