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
import { FilePreviewModal } from '@/components/crm/FilePreviewModal';
import { ActivityModal } from '@/components/crm/ActivityModal';
import {
  ChevronDown, ChevronUp, MoreHorizontal, FileText, Calendar,
  CheckCircle2, MessageSquare, ArrowRightLeft, Trophy, XCircle,
  Pencil, Pin, Plus, Trash2, GripVertical, UserCircle, DollarSign,
  Paperclip, Download, Image, X,
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
  id_contato_geral: number | null;
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
function EditableLeadName({ leadId, nome, onSaved }: { leadId: number; nome: string; onSaved?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nome);
  const { toast } = useToast();

  useEffect(() => { setValue(nome); }, [nome]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === nome) { setEditing(false); setValue(nome); return; }
    const { error } = await supabase.from('leads_crm').update({ nome: trimmed }).eq('id', leadId);
    if (error) { toast({ title: 'Erro ao salvar nome', variant: 'destructive' }); setValue(nome); }
    else { onSaved?.(); }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="text-xl font-bold text-foreground bg-transparent border-b border-primary outline-none px-0 py-0"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(nome); setEditing(false); } }}
      />
    );
  }

  return (
    <h1
      className="text-xl font-bold text-foreground cursor-pointer hover:text-primary/80 transition-colors"
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {nome}
    </h1>
  );
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const spOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo' };
  const dSP = new Date(d.toLocaleString('en-US', spOptions));
  const nowSP = new Date(now.toLocaleString('en-US', spOptions));
  const isToday = dSP.toDateString() === nowSP.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  if (isToday) return `Hoje às ${hora}`;
  const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' });
  return `${dia} às ${hora}`;
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
    dadosContato,
    anexos: realtimeAnexos,
    loading: realtimeLoading,
  } = useLeadRealtime(open ? leadId : null);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [funilNome, setFunilNome] = useState('');
  const [etapas, setEtapas] = useState<EtapaInfo[]>([]);
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [listaInteresses, setListaInteresses] = useState<{ nome: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Map realtime data to typed state
  const anotacoes = useMemo(() => (realtimeAnotacoes || []) as Anotacao[], [realtimeAnotacoes]);
  const atividades = useMemo(() => (realtimeAtividades || []) as Atividade[], [realtimeAtividades]);
  const historico = useMemo(() => (realtimeHistorico || []) as HistoricoItem[], [realtimeHistorico]);

  // UI state
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [camposAbertos, setCamposAbertos] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string; mime: string; loading: boolean; storagePath?: string } | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'anotacoes' | 'atividades'>('todos');

  // Dialogs
  const [ganhoOpen, setGanhoOpen] = useState(false);
  const [perdidoOpen, setPerdidoOpen] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [concluirAtividadeId, setConcluirAtividadeId] = useState<number | null>(null);
  const [duplicarAtividade, setDuplicarAtividade] = useState<Atividade | null>(null);
  const [excluirAtividadeId, setExcluirAtividadeId] = useState<number | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('texto');
  const [savingField, setSavingField] = useState(false);
  const [manageFieldsOpen, setManageFieldsOpen] = useState(false);
  const [editingCampos, setEditingCampos] = useState<CampoCustomizado[]>([]);
  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [editAnotacaoId, setEditAnotacaoId] = useState<number | null>(null);
  const [editAnotacaoText, setEditAnotacaoText] = useState('');
  const [excluirAnotacaoId, setExcluirAnotacaoId] = useState<number | null>(null);
  const [proprietarios, setProprietarios] = useState<{id: string; nome: string}[]>([]);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [editingValor, setEditingValor] = useState(false);
  const [valorTemp, setValorTemp] = useState('');
  const [editingTelefone, setEditingTelefone] = useState(false);
  const [telefoneTemp, setTelefoneTemp] = useState('');
  const [funilEtapaPopoverOpen, setFunilEtapaPopoverOpen] = useState(false);
  const [allFunis, setAllFunis] = useState<{id: number; nome: string}[]>([]);
  const [tempFunilId, setTempFunilId] = useState<number | null>(null);
  const [tempEtapaId, setTempEtapaId] = useState<number | null>(null);
  const [tempEtapas, setTempEtapas] = useState<EtapaInfo[]>([]);
  const [savingFunilEtapa, setSavingFunilEtapa] = useState(false);
  const [interesseOverride, setInteresseOverride] = useState<string | null>(null);

  // Clear interesseOverride when realtime syncs the same value
  useEffect(() => {
    if (interesseOverride && dadosContato.interesse === interesseOverride) {
      setInteresseOverride(null);
    }
  }, [dadosContato.interesse, interesseOverride]);

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

      const [funilRes, etapasRes, camposRes, interessesRes] = await Promise.all([
        supabase.from('funis').select('nome').eq('id', l.id_funil).single(),
        supabase.from('etapas_funil').select('id, nome, ordem').eq('id_funil', l.id_funil).eq('ativo', true).order('ordem'),
        supabase.from('campos_customizados').select('*').or(`id_funil.is.null,id_funil.eq.${l.id_funil}`).eq('id_empresa', l.id_empresa).eq('ativo', true).order('ordem'),
        supabase.from('lista_interesses').select('nome, label').eq('empresa_id', l.id_empresa).order('ordem'),
      ]);

      setFunilNome(funilRes.data?.nome || '');
      setEtapas(etapasRes.data || []);
      setCampos((camposRes.data || []) as CampoCustomizado[]);
      setListaInteresses(interessesRes.data || []);
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

  // Fetch proprietários list
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase.rpc('get_usuarios_empresa', { empresa_id_param: empresaId });
      if (data) {
        setProprietarios(data.map((u: any) => ({ id: u.id, nome: u.nome || u.email })));
      }
    })();
  }, [empresaId]);

  // Fetch all funnels for the company
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .order('ordem');
      if (data) setAllFunis(data);
    })();
  }, [empresaId]);

  // When funnel/stage popover opens, initialize temp state
  const handleOpenFunilEtapaPopover = () => {
    if (!lead) return;
    setTempFunilId(lead.id_funil);
    setTempEtapaId(lead.id_etapa_atual);
    setTempEtapas(etapas);
    setFunilEtapaPopoverOpen(true);
  };

  // When temp funnel changes, fetch its etapas
  const handleTempFunilChange = async (newFunilId: number) => {
    setTempFunilId(newFunilId);
    const { data } = await supabase
      .from('etapas_funil')
      .select('id, nome, ordem')
      .eq('id_funil', newFunilId)
      .eq('ativo', true)
      .order('ordem');
    const newEtapas = data || [];
    setTempEtapas(newEtapas);
    if (newEtapas.length > 0) {
      setTempEtapaId(newEtapas[0].id);
    } else {
      setTempEtapaId(null);
    }
  };

  // Save funnel/stage change
  const handleSaveFunilEtapa = async () => {
    if (!lead || !tempFunilId || !tempEtapaId) return;
    setSavingFunilEtapa(true);
    const { error } = await supabase.from('leads_crm').update({
      id_funil: tempFunilId,
      id_etapa_atual: tempEtapaId,
      data_entrada_etapa_atual: new Date().toISOString(),
    }).eq('id', lead.id);
    setSavingFunilEtapa(false);
    if (error) {
      toast({ title: 'Erro ao mover lead', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Funil/etapa atualizado' });
      setFunilEtapaPopoverOpen(false);
      // Re-fetch metadata since funnel may have changed
      fetchMeta();
      onLeadChanged?.();
    }
  };

  const handleChangeProprietario = async (newOwnerId: string | null) => {
    if (!lead) return;
    await supabase.from('leads_crm').update({ proprietario_id: newOwnerId }).eq('id', lead.id);
    setLead({ ...lead, proprietario_id: newOwnerId });
    setOwnerPopoverOpen(false);
    toast({ title: 'Proprietário atualizado' });
    onLeadChanged?.();
  };

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
    if (!lead || (!novaAnotacao.trim() && selectedFiles.length === 0)) return;
    setSavingAnotacao(true);
    
    const { data: anotacaoData, error: anotacaoError } = await supabase.from('anotacoes_lead').insert({
      id_lead: lead.id,
      id_empresa: empresaId!,
      conteudo: novaAnotacao.trim() || (selectedFiles.length > 0 ? `📎 ${selectedFiles.length} arquivo(s)` : ''),
      criado_por: user?.id || null,
    }).select('id').single();

    if (anotacaoError || !anotacaoData) {
      toast({ title: 'Erro ao salvar anotação', variant: 'destructive' });
      setSavingAnotacao(false);
      return;
    }

    // Upload files
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${empresaId}/${lead.id}/${anotacaoData.id}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('anexos-lead')
          .upload(path, file);

        if (uploadError) {
          toast({ title: `Erro ao enviar ${file.name}`, description: uploadError.message, variant: 'destructive' });
          continue;
        }

        const { data: urlData } = supabase.storage.from('anexos-lead').getPublicUrl(path);

        await supabase.from('anexos_anotacao').insert({
          id_anotacao: anotacaoData.id,
          id_empresa: empresaId!,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          tamanho: file.size,
          storage_path: path,
          url_publica: urlData.publicUrl,
        });
      }
    }

    setNovaAnotacao('');
    setSelectedFiles([]);
    setSavingAnotacao(false);
  };

  const handleEditAnotacao = async () => {
    if (!editAnotacaoId || !editAnotacaoText.trim()) return;
    const conteudo = editAnotacaoText.trim();
    const { error } = await supabase.from('anotacoes_lead')
      .update({ conteudo })
      .eq('id', editAnotacaoId);
    if (error) {
      toast({ title: 'Erro ao editar anotação', description: error.message, variant: 'destructive' });
    } else {
      // Also update the historico_lead entry so it reflects in real-time
      await supabase.from('historico_lead')
        .update({
          descricao: conteudo.substring(0, 100) + (conteudo.length > 100 ? '...' : ''),
          metadados: { anotacao_id: editAnotacaoId, conteudo_completo: conteudo },
        })
        .eq('tipo_evento', 'anotacao')
        .contains('metadados', { anotacao_id: editAnotacaoId });
      toast({ title: 'Anotação atualizada' });
    }
    setEditAnotacaoId(null);
    setEditAnotacaoText('');
  };

  const handleExcluirAnotacao = async () => {
    if (!excluirAnotacaoId) return;
    // Delete storage files first
    const anexosToDelete = realtimeAnexos.filter((a: any) => a.id_anotacao === excluirAnotacaoId);
    if (anexosToDelete.length > 0) {
      await supabase.storage
        .from('anexos-lead')
        .remove(anexosToDelete.map((a: any) => a.storage_path));
    }
    // Delete historico entry first (FK won't cascade here)
    await supabase.from('historico_lead')
      .delete()
      .eq('tipo_evento', 'anotacao')
      .contains('metadados', { anotacao_id: excluirAnotacaoId });
    const { error } = await supabase.from('anotacoes_lead')
      .delete()
      .eq('id', excluirAnotacaoId);
    if (error) {
      toast({ title: 'Erro ao excluir anotação', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Anotação excluída' });
    }
    setExcluirAnotacaoId(null);
  };

  const handleConcluirAtividade = async () => {
    if (!concluirAtividadeId) return;
    await supabase.from('atividades').update({
      concluida: true,
      concluida_em: new Date().toISOString(),
      concluida_por: user?.id || null,
    }).eq('id', concluirAtividadeId);
    setConcluirAtividadeId(null);
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




  // Preview file in modal
  const handlePreviewFile = async (storagePath: string, mimeType: string, fileName: string) => {
    setPreviewFile({ url: null, name: fileName, mime: mimeType, loading: true });
    const { data, error } = await supabase.storage.from('anexos-lead').download(storagePath);
    if (error || !data) {
      toast({ title: 'Erro ao abrir arquivo', description: error?.message, variant: 'destructive' });
      setPreviewFile(null);
      return;
    }
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    setPreviewFile({ url, name: fileName, mime: mimeType, loading: false });
  };

  // Download file
  const handleDownloadFile = async (storagePath: string, mimeType: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('anexos-lead').download(storagePath);
    if (error || !data) {
      toast({ title: 'Erro ao baixar arquivo', description: error?.message, variant: 'destructive' });
      return;
    }
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
                      <EditableLeadName leadId={lead.id} nome={lead.nome} onSaved={onLeadChanged} />
                      <EtiquetaSelector leadId={lead.id} empresaId={lead.id_empresa} onChange={onLeadChanged} />
                    </div>
                    <Popover open={funilEtapaPopoverOpen} onOpenChange={setFunilEtapaPopoverOpen}>
                      <PopoverTrigger asChild>
                        <span
                          className="text-sm text-primary cursor-pointer hover:underline inline-flex items-center gap-1"
                          onClick={handleOpenFunilEtapaPopover}
                        >
                          {funilNome}
                          {etapas.find(e => e.id === lead.id_etapa_atual) && (
                            <> → {etapas.find(e => e.id === lead.id_etapa_atual)?.nome}</>
                          )}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-[340px] p-4" align="start">
                        <div className="space-y-3">
                          <Select
                            value={tempFunilId?.toString() || ''}
                            onValueChange={(v) => handleTempFunilChange(Number(v))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar funil" />
                            </SelectTrigger>
                            <SelectContent>
                              {allFunis.map(f => (
                                <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Etapa do funil</p>
                            <div className="flex items-center">
                              {tempEtapas.map((etapa, idx) => (
                                <button
                                  key={etapa.id}
                                  onClick={() => setTempEtapaId(etapa.id)}
                                  className={`relative h-8 flex-1 text-xs font-medium transition-colors ${
                                    tempEtapaId === etapa.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  } ${idx === 0 ? 'rounded-l-md' : ''} ${idx === tempEtapas.length - 1 ? 'rounded-r-md' : ''}`}
                                  title={etapa.nome}
                                  style={{
                                    clipPath: idx < tempEtapas.length - 1
                                      ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)'
                                      : idx > 0
                                      ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)'
                                      : undefined,
                                    marginLeft: idx > 0 ? '-4px' : undefined,
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFunilEtapaPopoverOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveFunilEtapa}
                              disabled={savingFunilEtapa}
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Proprietário selector */}
                    <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-normal">
                          <UserCircle className="h-3.5 w-3.5" />
                          {lead.proprietario_id
                            ? (proprietarios.find(p => p.id === lead.proprietario_id)?.nome || 'Sem nome')
                            : 'Sem proprietário'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-2" align="start">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Proprietário</p>
                        <button
                          className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors ${!lead.proprietario_id ? 'bg-accent font-medium' : ''}`}
                          onClick={() => handleChangeProprietario(null)}
                        >
                          Sem proprietário
                        </button>
                        {proprietarios.map(p => (
                          <button
                            key={p.id}
                            className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors flex items-center gap-2 ${lead.proprietario_id === p.id ? 'bg-accent font-medium' : ''}`}
                            onClick={() => handleChangeProprietario(p.id)}
                          >
                            <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            {p.nome}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    {lead.status === 'ganho' ? (
                      <button
                        onClick={() => setReabrirOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                        title="Clique para reabrir"
                      >
                        <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Ganho</span>
                      </button>
                    ) : lead.status === 'perdido' ? (
                      <button
                        onClick={() => setReabrirOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                        title="Clique para reabrir"
                      >
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">Perdido</span>
                      </button>
                    ) : (
                      <>
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
                      </>
                    )}
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
                      <div
                        key={etapa.id}
                        className={`flex-1 flex flex-col items-center cursor-pointer group`}
                        onClick={async () => {
                          if (etapa.id === lead.id_etapa_atual) return;
                          const { error } = await supabase.from('leads_crm').update({
                            id_etapa_atual: etapa.id,
                            data_entrada_etapa_atual: new Date().toISOString(),
                          }).eq('id', lead.id);
                          if (error) {
                            toast({ title: 'Erro ao mover lead', description: error.message, variant: 'destructive' });
                          } else {
                            toast({ title: `Movido para ${etapa.nome}` });
                            onLeadChanged?.();
                          }
                        }}
                      >
                        <div
                          className={`h-2 w-full rounded-sm transition-colors ${
                            isPast || isCurrent ? 'bg-green-500' : 'bg-muted group-hover:bg-green-300'
                          } ${isCurrent ? 'bg-green-400' : ''} ${isPast ? 'bg-green-600' : ''}`}
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
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
                  {/* Número de telefone */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Número de telefone</span>
                      {!editingTelefone && (
                        <Pencil
                          className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => {
                            setEditingTelefone(true);
                            setTelefoneTemp(lead.whatsapp || '');
                          }}
                        />
                      )}
                    </div>
                    {editingTelefone ? (
                      <div className="mt-1.5">
                        <Input
                          value={telefoneTemp}
                          onChange={e => setTelefoneTemp(e.target.value)}
                          className="h-7 text-sm"
                          placeholder="(00) 00000-0000"
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const val = telefoneTemp.trim() || null;
                              await supabase.from('leads_crm').update({ whatsapp: val }).eq('id', lead.id);
                              setEditingTelefone(false);
                              onLeadChanged?.();
                            } else if (e.key === 'Escape') {
                              setEditingTelefone(false);
                            }
                          }}
                          onBlur={async () => {
                            const val = telefoneTemp.trim() || null;
                            await supabase.from('leads_crm').update({ whatsapp: val }).eq('id', lead.id);
                            setEditingTelefone(false);
                            onLeadChanged?.();
                          }}
                        />
                      </div>
                    ) : (
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {dadosContato.telefone
                        ? dadosContato.telefone
                        : lead.whatsapp
                          ? lead.whatsapp
                          : <span className="text-muted-foreground font-normal">Não definido</span>
                      }
                    </p>
                    )}
                  </div>
                  {/* Valor do negócio */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Valor do negócio</span>
                      {!editingValor && (
                        <Pencil
                          className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => {
                            setEditingValor(true);
                            setValorTemp(lead.valor_estimado != null ? String(lead.valor_estimado) : '');
                          }}
                        />
                      )}
                    </div>
                    {editingValor ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          value={valorTemp}
                          onChange={e => setValorTemp(e.target.value)}
                          className="h-7 text-sm flex-1"
                          placeholder="0"
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const val = valorTemp.trim() ? Number(valorTemp) : null;
                              await supabase.from('leads_crm').update({ valor_estimado: val }).eq('id', lead.id);
                              setEditingValor(false);
                              onLeadChanged?.();
                            } else if (e.key === 'Escape') {
                              setEditingValor(false);
                            }
                          }}
                          onBlur={async () => {
                            const val = valorTemp.trim() ? Number(valorTemp) : null;
                            await supabase.from('leads_crm').update({ valor_estimado: val }).eq('id', lead.id);
                            setEditingValor(false);
                            onLeadChanged?.();
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {lead.valor_estimado != null
                          ? `R$ ${Number(lead.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : <span className="text-muted-foreground font-normal">Não definido</span>
                        }
                      </p>
                    )}
                  </div>

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
                          // Merge campos_extras com dadosContato (dados SDR têm prioridade quando preenchidos)
                          const normalizeFieldIdentifier = (value: string) =>
                            value
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .toLowerCase()
                              .trim()
                              .replace(/\s+/g, '_');

                          // Map campo slugs to dadosContato keys
                          // Handles both correct slugs and legacy/mismatched slugs from DB
                          const contatoFieldMap: Record<string, keyof typeof dadosContato> = {
                            interesse: 'interesse',
                            cidade: 'cidade',
                            tipo_uso: 'tipo_uso',
                            tipo_de_uso: 'tipo_uso',
                            consumo_mensal: 'consumo_mensal',
                            gasto_mensal: 'gasto_mensal',
                            dias_semana: 'dias_semana',
                            dias_por_semana: 'dias_semana',
                            // Legacy/mismatched slugs
                            gasto: 'interesse',
                          };

                          // Also map by campo.nome as fallback for mismatched slugs
                          const contatoNameMap: Record<string, keyof typeof dadosContato> = {
                            interesse: 'interesse',
                            cidade: 'cidade',
                            tipo_de_uso: 'tipo_uso',
                            consumo_mensal: 'consumo_mensal',
                            gasto_mensal: 'gasto_mensal',
                            dias_por_semana: 'dias_semana',
                          };

                          const normalizedNome = normalizeFieldIdentifier(campo.nome);
                          const normalizedSlug = normalizeFieldIdentifier(campo.slug);

                          // Prioriza nome do campo (mais confiável quando slugs são inconsistentes no DB)
                          const contatoKeyByName = contatoNameMap[normalizedNome];
                          const contatoKeyBySlug = contatoFieldMap[normalizedSlug];
                          const contatoKey = contatoKeyByName ?? contatoKeyBySlug;
                          const storageKey = contatoKey ?? campo.slug;

                          const contatoValue = contatoKey ? dadosContato[contatoKey] : null;
                          const contatoHasValue = contatoValue != null && String(contatoValue).trim() !== '';

                          const extraValue =
                            lead.campos_extras?.[storageKey] ??
                            lead.campos_extras?.[campo.slug] ??
                            '';

                          const value = contatoHasValue ? String(contatoValue) : String(extraValue);
                          const isEditing = editingField === campo.slug;
                          const isInteresseField = contatoKey === 'interesse' || normalizedNome === 'interesse';

                          return (
                            <div
                              key={campo.id}
                              className="flex items-center justify-between py-2 px-1 rounded-md group hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                if (!isEditing && !isInteresseField) {
                                  setEditingField(campo.slug);
                                  setEditingValue(value);
                                }
                              }}
                            >
                              <span className="text-xs text-muted-foreground font-medium shrink-0 w-[90px] text-right pr-3">
                                {campo.nome}
                              </span>
                              {isInteresseField ? (
                                <div className="flex-1">
                                  <Select
                                    value={interesseOverride ?? value || ''}
                                    onValueChange={async (val) => {
                                      // Update UI immediately
                                      setInteresseOverride(val);

                                      // Try to update contatos_geral by id first (most reliable)
                                      let contatoGeralId = lead.id_contato_geral;
                                      
                                      // If no id_contato_geral, try to find by whatsapp
                                      if (!contatoGeralId && lead.whatsapp) {
                                        const normalizedWhatsapp = lead.whatsapp.replace(/\D/g, '');
                                        const { data: contatoData } = await supabase
                                          .from('contatos_geral')
                                          .select('id')
                                          .or(`whatsapp.eq.${lead.whatsapp},whatsapp.eq.${normalizedWhatsapp}`)
                                          .limit(1)
                                          .maybeSingle();
                                        
                                        if (contatoData) {
                                          contatoGeralId = contatoData.id;
                                          // Optionally save id_contato_geral to lead for future use
                                          await supabase.from('leads_crm').update({ id_contato_geral: contatoGeralId }).eq('id', lead.id);
                                        }
                                      }

                                      if (contatoGeralId) {
                                        const { data: updateResult, error } = await supabase
                                          .from('contatos_geral')
                                          .update({ interesse: val })
                                          .eq('id', contatoGeralId)
                                          .select('id');
                                        
                                        if (error) {
                                          toast({ title: 'Erro ao atualizar interesse', description: error.message, variant: 'destructive' });
                                          setInteresseOverride(null);
                                          return;
                                        }
                                        
                                        if (!updateResult || updateResult.length === 0) {
                                          toast({ title: 'Erro ao atualizar interesse', description: 'Nenhum registro atualizado', variant: 'destructive' });
                                          setInteresseOverride(null);
                                          return;
                                        }
                                      } else {
                                        toast({ title: 'Contato não encontrado', description: 'Não foi possível atualizar o interesse', variant: 'destructive' });
                                        setInteresseOverride(null);
                                        return;
                                      }

                                      // Also update campos_extras as fallback
                                      const newExtras = { ...(lead.campos_extras || {}), [storageKey]: val };
                                      await supabase.from('leads_crm').update({ campos_extras: newExtras }).eq('id', lead.id);
                                      setLead({ ...lead, campos_extras: newExtras });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {listaInteresses.map(int => (
                                        <SelectItem key={int.nome} value={int.nome}>
                                          {int.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : isEditing ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    className="h-7 text-xs flex-1"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveField(storageKey);
                                      if (e.key === 'Escape') setEditingField(null);
                                    }}
                                    onBlur={() => handleSaveField(storageKey)}
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
                          placeholder="Escreva uma anotação, @nome... (cole imagens com Ctrl+V)"
                          value={novaAnotacao}
                          onChange={e => setNovaAnotacao(e.target.value)}
                          className="border-0 p-0 resize-none focus-visible:ring-0 min-h-[60px] text-sm"
                          onPaste={e => {
                            const items = e.clipboardData?.items;
                            if (!items) return;
                            const imageFiles: File[] = [];
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.startsWith('image/')) {
                                const file = items[i].getAsFile();
                                if (file) {
                                  const named = new File([file], `imagem-colada-${Date.now()}.png`, { type: file.type });
                                  imageFiles.push(named);
                                }
                              }
                            }
                            if (imageFiles.length > 0) {
                              e.preventDefault();
                              setSelectedFiles(prev => [...prev, ...imageFiles]);
                            }
                          }}
                        />
                        {/* File preview */}
                        {selectedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs">
                                {file.type.startsWith('image/') ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="h-8 w-8 rounded object-cover"
                                  />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="max-w-[120px] truncate text-foreground">{file.name}</span>
                                <button
                                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{anotacoes.length}/100 notes</span>
                            <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                              <Paperclip className="h-4 w-4" />
                              <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files) {
                                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          <Button
                            size="sm"
                            disabled={(!novaAnotacao.trim() && selectedFiles.length === 0) || savingAnotacao}
                            onClick={handleSalvarAnotacao}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            {savingAnotacao ? 'Enviando...' : 'Salvar'}
                          </Button>
                        </div>
                      </div>

                      {/* A fazer */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-base text-foreground">Atividades a fazer</h3>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-primary gap-1 h-auto p-0"
                            onClick={() => { setEditingActivity(null); setActivityModalOpen(true); }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Agendar uma atividade
                          </Button>
                        </div>
                        {atividadesPendentes.length > 0 && (
                          <div className="space-y-2">
                            {atividadesPendentes.map(ativ => (
                              <div
                                key={ativ.id}
                                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:opacity-80 transition-colors ${
                                  (() => {
                                    const now = new Date();
                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const due = new Date(ativ.data_vencimento);
                                    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                                    if (dueDay < today) return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/40';
                                    if (dueDay.getTime() === today.getTime()) return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/40';
                                    return 'bg-muted/30 border-border';
                                  })()
                                }`}
                                onClick={() => { setEditingActivity(ativ); setActivityModalOpen(true); }}
                              >
                                <Checkbox
                                  className="mt-0.5"
                                  checked={false}
                                  onCheckedChange={(e) => { e && setConcluirAtividadeId(ativ.id); }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{ativ.assunto}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDateShort(ativ.data_vencimento)}
                                  </p>
                                  {ativ.atribuida_a && (() => {
                                    const usr = proprietarios.find(p => p.id === ativ.atribuida_a);
                                    return usr ? (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        👤 {usr.nome}
                                      </p>
                                    ) : null;
                                  })()}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => e.stopPropagation()}>
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingActivity(ativ); setActivityModalOpen(true); }}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDuplicarAtividade(ativ); }}>
                                      <FileText className="h-3.5 w-3.5 mr-2" /> Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setConcluirAtividadeId(ativ.id); }}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Concluir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => { e.stopPropagation(); setExcluirAtividadeId(ativ.id); }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
                                <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">
                                  {h.tipo_evento === 'anotacao'
                                    ? (h.metadados as any)?.conteudo_completo || h.descricao
                                    : h.descricao}
                                </p>
                                {/* Anexos da anotação */}
                                {h.tipo_evento === 'anotacao' && (h.metadados as any)?.anotacao_id && (() => {
                                  const anotacaoAnexos = realtimeAnexos.filter((a: any) => a.id_anotacao === (h.metadados as any).anotacao_id);
                                  if (anotacaoAnexos.length === 0) return null;
                                  const imageAnexos = anotacaoAnexos.filter((a: any) => a.tipo_arquivo?.startsWith('image/'));
                                  const fileAnexos = anotacaoAnexos.filter((a: any) => !a.tipo_arquivo?.startsWith('image/'));
                                  return (
                                    <div className="mt-2 space-y-2">
                                      {/* Images shown inline */}
                                      {imageAnexos.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {imageAnexos.map((anexo: any) => (
                                            <button
                                              key={anexo.id}
                                              onClick={() => handlePreviewFile(anexo.storage_path, anexo.tipo_arquivo, anexo.nome_arquivo)}
                                              className="block"
                                            >
                                              <img
                                                src={anexo.url_publica}
                                                alt={anexo.nome_arquivo}
                                                className="max-w-[280px] max-h-[200px] rounded-lg border object-contain hover:opacity-80 transition-opacity cursor-pointer"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {/* Files shown as clickable cards */}
                                      {fileAnexos.map((anexo: any) => {
                                        const isPdf = anexo.tipo_arquivo === 'application/pdf';
                                        const sizeStr = anexo.tamanho >= 1024 * 1024
                                          ? `${(anexo.tamanho / (1024 * 1024)).toFixed(1)} MB`
                                          : `${Math.round(anexo.tamanho / 1024)} KB`;
                                        return (
                                          <button
                                            key={anexo.id}
                                            onClick={() => handlePreviewFile(anexo.storage_path, anexo.tipo_arquivo, anexo.nome_arquivo)}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/60 transition-colors group w-full text-left"
                                          >
                                            <div className="shrink-0">
                                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              {isPdf && (
                                                <div className="shrink-0 h-8 w-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                  <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                </div>
                                              )}
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-primary truncate group-hover:underline">
                                                  {anexo.nome_arquivo}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {formatDateShort(anexo.created_at)} · {sizeStr}
                                                </p>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                              {h.tipo_evento === 'anotacao' && (h.metadados as any)?.anotacao_id && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                                    onClick={() => {
                                      setEditAnotacaoId((h.metadados as any).anotacao_id);
                                      setEditAnotacaoText((h.metadados as any)?.conteudo_completo || h.descricao);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                                    onClick={() => setExcluirAnotacaoId((h.metadados as any).anotacao_id)}
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
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary gap-1 h-auto p-0 mb-4"
                          onClick={() => { setEditingActivity(null); setActivityModalOpen(true); }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Agendar uma atividade
                        </Button>
                        {atividades.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade</p>
                        ) : (
                          <div className="space-y-2">
                            {atividades.map(ativ => (
                              <div
                                key={ativ.id}
                                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                                onClick={() => { setEditingActivity(ativ); setActivityModalOpen(true); }}
                              >
                                <Checkbox
                                  className="mt-0.5"
                                  checked={ativ.concluida}
                                  disabled={ativ.concluida}
                                  onCheckedChange={() => {
                                    if (!ativ.concluida) setConcluirAtividadeId(ativ.id);
                                  }}
                                  onClick={e => e.stopPropagation()}
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

      {/* REABRIR DIALOG */}
      <AlertDialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir lead?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja reabrir &quot;{lead?.nome}&quot;? O lead voltará para o funil como aberto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!lead) return;
              const isWon = lead.status === 'ganho';
              await supabase.from('leads_crm').update(
                isWon
                  ? { status: 'aberto', data_ganho: null }
                  : { status: 'aberto', data_perdido: null, motivo_perda: null }
              ).eq('id', lead.id);
              toast({ title: 'Lead reaberto' });
              setReabrirOpen(false);
              onLeadChanged?.();
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Duplicar atividade */}
      <AlertDialog open={duplicarAtividade !== null} onOpenChange={(v) => { if (!v) setDuplicarAtividade(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar atividade?</AlertDialogTitle>
            <AlertDialogDescription>Deseja duplicar "{duplicarAtividade?.assunto}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={async () => {
              if (!duplicarAtividade) return;
              await supabase.from('atividades').insert({
                id_empresa: empresaId!,
                id_lead: leadId!,
                tipo: duplicarAtividade.tipo,
                assunto: `${duplicarAtividade.assunto} (Cópia)`,
                descricao: duplicarAtividade.descricao,
                atribuida_a: duplicarAtividade.atribuida_a,
                data_vencimento: duplicarAtividade.data_vencimento,
                prioridade: duplicarAtividade.prioridade,
                created_by: user?.id || null,
              });
              toast({ title: 'Atividade duplicada' });
              setDuplicarAtividade(null);
            }}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir atividade */}
      <AlertDialog open={excluirAtividadeId !== null} onOpenChange={(v) => { if (!v) setExcluirAtividadeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={async () => {
              if (!excluirAtividadeId) return;
              await supabase.from('atividades').delete().eq('id', excluirAtividadeId);
              toast({ title: 'Atividade excluída' });
              setExcluirAtividadeId(null);
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar anotação */}
      <AlertDialog open={editAnotacaoId !== null} onOpenChange={(v) => { if (!v) { setEditAnotacaoId(null); setEditAnotacaoText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar anotação</AlertDialogTitle>
            <AlertDialogDescription>Edite o conteúdo da anotação abaixo.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={editAnotacaoText}
            onChange={e => setEditAnotacaoText(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!editAnotacaoText.trim()} onClick={handleEditAnotacao}>
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir anotação */}
      <AlertDialog open={excluirAnotacaoId !== null} onOpenChange={(v) => { if (!v) setExcluirAnotacaoId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleExcluirAnotacao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lead && (
        <ActivityModal
          leadId={lead.id}
          empresaId={lead.id_empresa}
          activity={editingActivity}
          isOpen={activityModalOpen}
          onClose={() => { setActivityModalOpen(false); setEditingActivity(null); }}
        />
      )}
      {previewFile && (
        <FilePreviewModal
          open={!!previewFile}
          onOpenChange={(open) => {
            if (!open) {
              if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
              setPreviewFile(null);
            }
          }}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          mimeType={previewFile.mime}
          loading={previewFile.loading}
          onDownload={() => {
            if (previewFile?.url) {
              const a = document.createElement('a');
              a.href = previewFile.url;
              a.download = previewFile.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          }}
        />
      )}
    </>
  );
}
