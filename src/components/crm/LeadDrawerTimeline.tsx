import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { FilePreviewModal } from '@/components/crm/FilePreviewModal';
import { ActivityModal } from '@/components/crm/ActivityModal';
import {
  FileText, Calendar, CheckCircle2, MessageSquare, ArrowRightLeft, Trophy, XCircle,
  Pencil, Plus, Trash2, MoreHorizontal, Paperclip, X,
} from 'lucide-react';

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

interface Anotacao {
  id: number;
  conteudo: string;
  criado_por: string | null;
  created_at: string | null;
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

function getHistoricoIcon(tipo: string) {
  switch (tipo) {
    case 'anotacao': return <MessageSquare className="h-4 w-4 text-amber-600" />;
    case 'mudou_etapa': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    case 'ganho': return <Trophy className="h-4 w-4 text-green-600" />;
    case 'perdido': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  }
}

interface LeadDrawerTimelineProps {
  lead: { id: number; id_empresa: number };
  leadId: number;
  empresaId: number;
  anotacoes: Anotacao[];
  atividades: Atividade[];
  historico: HistoricoItem[];
  realtimeAnexos: any[];
  proprietarios: { id: string; nome: string }[];
  onLeadChanged?: () => void;
}

export function LeadDrawerTimeline({
  lead, leadId, empresaId, anotacoes, atividades, historico, realtimeAnexos, proprietarios, onLeadChanged,
}: LeadDrawerTimelineProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [savingAnotacao, setSavingAnotacao] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'anotacoes' | 'atividades'>('todos');
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [concluirAtividadeId, setConcluirAtividadeId] = useState<number | null>(null);
  const [duplicarAtividade, setDuplicarAtividade] = useState<Atividade | null>(null);
  const [excluirAtividadeId, setExcluirAtividadeId] = useState<number | null>(null);
  const [editAnotacaoId, setEditAnotacaoId] = useState<number | null>(null);
  const [editAnotacaoText, setEditAnotacaoText] = useState('');
  const [excluirAnotacaoId, setExcluirAnotacaoId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string | null; name: string; mime: string; loading: boolean } | null>(null);

  const atividadesPendentes = useMemo(() => atividades.filter(a => !a.concluida), [atividades]);

  const filteredHistory = useMemo(() => historico.filter(h => {
    if (historyFilter === 'todos') return true;
    if (historyFilter === 'anotacoes') return h.tipo_evento === 'anotacao';
    if (historyFilter === 'atividades') return h.tipo_evento === 'atividade_concluida' || h.tipo_evento === 'criado';
    return true;
  }), [historico, historyFilter]);

  const histAnotCount = useMemo(() => historico.filter(h => h.tipo_evento === 'anotacao').length, [historico]);
  const histAtivCount = useMemo(() => historico.filter(h => h.tipo_evento !== 'anotacao' && h.tipo_evento !== 'mudou_etapa' && h.tipo_evento !== 'ganho' && h.tipo_evento !== 'perdido').length, [historico]);

  const handleSalvarAnotacao = async () => {
    if (!novaAnotacao.trim() && selectedFiles.length === 0) return;
    setSavingAnotacao(true);
    
    const { data: anotacaoData, error: anotacaoError } = await supabase.from('anotacoes_lead').insert({
      id_lead: lead.id,
      id_empresa: empresaId,
      conteudo: novaAnotacao.trim() || (selectedFiles.length > 0 ? `📎 ${selectedFiles.length} arquivo(s)` : ''),
      criado_por: user?.id || null,
    }).select('id').single();

    if (anotacaoError || !anotacaoData) {
      toast({ title: 'Erro ao salvar anotação', variant: 'destructive' });
      setSavingAnotacao(false);
      return;
    }

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
          id_empresa: empresaId,
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
    const anexosToDelete = realtimeAnexos.filter((a: any) => a.id_anotacao === excluirAnotacaoId);
    if (anexosToDelete.length > 0) {
      await supabase.storage
        .from('anexos-lead')
        .remove(anexosToDelete.map((a: any) => a.storage_path));
    }
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

  return (
    <>
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

      {/* Concluir atividade */}
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
                id_empresa: empresaId,
                id_lead: leadId,
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

      {/* Activity Modal */}
      <ActivityModal
        leadId={lead.id}
        empresaId={lead.id_empresa}
        activity={editingActivity}
        isOpen={activityModalOpen}
        onClose={() => { setActivityModalOpen(false); setEditingActivity(null); }}
      />

      {/* File Preview */}
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
