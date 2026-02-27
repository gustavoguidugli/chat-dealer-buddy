import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, RefreshCw, Search, MessageSquare, ChevronRight, Loader2, ArrowRightLeft, Copy, CheckSquare, Tags } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FaqModal, FaqFormData } from '@/components/FaqModal';
import { LabelSelector, type LabelItem } from '@/components/LabelSelector';
import { ManageLabelsModal } from '@/components/ManageLabelsModal';

interface FaqItem {
  id: number;
  contexto: string;
  pergunta: string;
  resposta: string;
  tags: string[];
  hasEmbedding: boolean;
  labelIds: string[];
}

const TABS = [
  { value: 'geral_maquina', label: 'Máquina - Geral' },
  { value: 'qualificacao_maquina', label: 'Máquina - Qualificação' },
  { value: 'pos_qualificacao_maquina', label: 'Máquina - Pós-qualificação' },
  { value: 'purificador', label: 'Purificador' },
];

export default function GerenciarFaqs() {
  const navigate = useNavigate();
  const { empresaId, isAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(TABS[0].value);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [labelsModalOpen, setLabelsModalOpen] = useState(false);
  const [companyLabels, setCompanyLabels] = useState<LabelItem[]>([]);
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);

  const fetchCompanyLabels = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('labels')
      .select('id, nome, cor, icone')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    setCompanyLabels((data as LabelItem[]) || []);
  }, [empresaId]);

  const fetchFaqs = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata, embedding, document_labels(label_id)')
        .eq('id_empresa', empresaId)
        .filter('metadata->>tipo_faq', 'eq', activeTab)
        .order('id', { ascending: true });

      if (error) throw error;

      setFaqs(
        (data || []).map((doc: any) => ({
          id: doc.id,
          contexto: doc.metadata?.contexto ?? '',
          pergunta: doc.metadata?.pergunta ?? '',
          resposta: doc.metadata?.resposta ?? '',
          tags: doc.metadata?.tags ?? [],
          hasEmbedding: doc.embedding !== null,
          labelIds: doc.document_labels?.map((dl: any) => dl.label_id) ?? [],
        }))
      );
    } catch {
      toast({ title: 'Erro ao carregar FAQs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId, activeTab, toast]);

  useEffect(() => { fetchCompanyLabels(); }, [fetchCompanyLabels]);
  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  // Clear selection when tab changes
  useEffect(() => { setSelectedIds(new Set()); }, [activeTab]);

  const handleSave = async (data: FaqFormData) => {
    if (!empresaId) return;

    const content = `Contexto: ${data.contexto}\nPergunta: ${data.pergunta}\nResposta: ${data.resposta}`;
    const metadata = {
      tipo_faq: activeTab,
      contexto: data.contexto,
      pergunta: data.pergunta,
      resposta: data.resposta,
      tags: data.tags,
    };

    let embedding: any = null;
    try {
      toast({ title: 'Gerando embedding...' });
      const { data: embData, error: embError } = await supabase.functions.invoke('gerar-embedding', {
        body: { texto: content },
      });
      if (embError) throw embError;
      if (embData?.error) throw new Error(embData.error);
      embedding = embData?.embedding ?? null;
    } catch (err) {
      console.error('Falha ao gerar embedding:', err);
      toast({ title: 'Erro ao gerar embedding. FAQ será salvo sem embedding.', variant: 'destructive' });
    }

    if (editingFaq) {
      const { error } = await supabase
        .from('documents')
        .update({ content, metadata, embedding })
        .eq('id', editingFaq.id);
      if (error) { toast({ title: 'Erro ao atualizar FAQ', variant: 'destructive' }); throw error; }
      toast({ title: 'FAQ atualizado!' });
    } else {
      const { error } = await supabase
        .from('documents')
        .insert({ id_empresa: empresaId, content, metadata, embedding });
      if (error) { toast({ title: 'Erro ao criar FAQ', variant: 'destructive' }); throw error; }
      toast({ title: 'FAQ criado com sucesso!' });
    }

    setEditingFaq(null);
    fetchFaqs();
  };

  const handleDelete = async () => {
    if (!deletingFaq || !empresaId) return;
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', deletingFaq.id)
      .eq('id_empresa', empresaId);
    if (error) {
      toast({ title: 'Erro ao deletar FAQ', variant: 'destructive' });
    } else {
      toast({ title: 'FAQ deletado!' });
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deletingFaq.id); return n; });
      fetchFaqs();
    }
    setDeletingFaq(null);
  };

  const handleRegenerate = async (faq: FaqItem) => {
    if (!empresaId) return;
    setRegeneratingId(faq.id);
    try {
      const content = `Contexto: ${faq.contexto}\nPergunta: ${faq.pergunta}\nResposta: ${faq.resposta}`;
      const { data: embData, error } = await supabase.functions.invoke('gerar-embedding', {
        body: { texto: content },
      });
      if (error) throw error;
      if (embData?.error) throw new Error(embData.error);
      await supabase.from('documents').update({ embedding: embData.embedding }).eq('id', faq.id);
      toast({ title: 'Embedding gerado com sucesso!' });
      fetchFaqs();
    } catch (err) {
      console.error('Falha ao regerar embedding:', err);
      toast({ title: 'Erro ao gerar embedding', variant: 'destructive' });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleMoveToTab = async (faq: FaqItem, newTipoFaq: string) => {
    if (!empresaId) return;
    try {
      const { data: doc } = await supabase
        .from('documents')
        .select('metadata')
        .eq('id', faq.id)
        .single();
      
      const updatedMetadata = { ...(doc?.metadata as any), tipo_faq: newTipoFaq };
      
      const { error } = await supabase
        .from('documents')
        .update({ metadata: updatedMetadata })
        .eq('id', faq.id);
      
      if (error) throw error;
      
      const targetLabel = TABS.find(t => t.value === newTipoFaq)?.label ?? newTipoFaq;
      toast({ title: `FAQ movido para "${targetLabel}"` });
      fetchFaqs();
    } catch (err) {
      console.error('Erro ao mover FAQ:', err);
      toast({ title: 'Erro ao mover FAQ', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (faqsToDuplicate: FaqItem[], targetTab?: string) => {
    if (!empresaId) return;
    setBulkActionLoading(true);
    try {
      const inserts = faqsToDuplicate.map(faq => {
        const tipoFaq = targetTab ?? activeTab;
        const content = `Contexto: ${faq.contexto}\nPergunta: ${faq.pergunta}\nResposta: ${faq.resposta}`;
        const metadata = {
          tipo_faq: tipoFaq,
          contexto: faq.contexto,
          pergunta: faq.pergunta,
          resposta: faq.resposta,
          tags: faq.tags,
        };
        return { id_empresa: empresaId, content, metadata };
      });

      const { error } = await supabase.from('documents').insert(inserts);
      if (error) throw error;

      const targetLabel = targetTab ? TABS.find(t => t.value === targetTab)?.label : null;
      const msg = faqsToDuplicate.length === 1
        ? `FAQ duplicado${targetLabel ? ` para "${targetLabel}"` : ''}!`
        : `${faqsToDuplicate.length} FAQs duplicados${targetLabel ? ` para "${targetLabel}"` : ''}!`;
      toast({ title: msg });
      setSelectedIds(new Set());
      fetchFaqs();
    } catch (err) {
      console.error('Erro ao duplicar:', err);
      toast({ title: 'Erro ao duplicar FAQs', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkMove = async (newTipoFaq: string) => {
    if (!empresaId || selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { data: doc } = await supabase
          .from('documents')
          .select('metadata')
          .eq('id', id)
          .single();
        const updatedMetadata = { ...(doc?.metadata as any), tipo_faq: newTipoFaq };
        const { error } = await supabase
          .from('documents')
          .update({ metadata: updatedMetadata })
          .eq('id', id);
        if (error) throw error;
      }

      const targetLabel = TABS.find(t => t.value === newTipoFaq)?.label ?? newTipoFaq;
      toast({ title: `${ids.length} FAQ(s) movido(s) para "${targetLabel}"` });
      setSelectedIds(new Set());
      fetchFaqs();
    } catch (err) {
      console.error('Erro ao mover FAQs:', err);
      toast({ title: 'Erro ao mover FAQs', variant: 'destructive' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(f => f.id)));
    }
  };

  const selectedFaqs = faqs.filter(f => selectedIds.has(f.id));

  const filtered = faqs.filter((f) => {
    // Label filter
    if (filterLabelId && !f.labelIds.includes(filterLabelId)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.pergunta.toLowerCase().includes(s) ||
      f.resposta.toLowerCase().includes(s) ||
      f.tags.some((t) => t.toLowerCase().includes(s))
    );
  });

  const handleLabelToggle = (faqId: number, labelId: string, isAdding: boolean) => {
    setFaqs(prev => prev.map(f => {
      if (f.id !== faqId) return f;
      return {
        ...f,
        labelIds: isAdding
          ? [...f.labelIds, labelId]
          : f.labelIds.filter(id => id !== labelId),
      };
    }));
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <button onClick={() => navigate('/base-conhecimento')} className="hover:text-foreground transition-colors">
            Base de Conhecimento
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">FAQs</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Gerenciar FAQs</h1>
          <Button variant="outline" onClick={() => setLabelsModalOpen(true)}>
            <Tags className="h-4 w-4 mr-2" /> Gerenciar Etiquetas
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {/* Top bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por pergunta, resposta ou tag..."
                    className="pl-9"
                  />
                </div>
                {companyLabels.length > 0 && (
                  <select
                    value={filterLabelId || ''}
                    onChange={e => setFilterLabelId(e.target.value || null)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Todas etiquetas</option>
                    {companyLabels.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                )}
                <Button onClick={() => { setEditingFaq(null); setModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar FAQ
                </Button>
              </div>

              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50 border">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {selectedIds.size} selecionado(s)
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkActionLoading}
                      onClick={() => handleDuplicate(selectedFaqs)}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Duplicar
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                          <Copy className="h-4 w-4 mr-1" /> Duplicar para...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {TABS.filter(t => t.value !== activeTab).map(t => (
                          <DropdownMenuItem key={t.value} onClick={() => handleDuplicate(selectedFaqs, t.value)}>
                            {t.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                            <ArrowRightLeft className="h-4 w-4 mr-1" /> Mover para...
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {TABS.filter(t => t.value !== activeTab).map(t => (
                            <DropdownMenuItem key={t.value} onClick={() => handleBulkMove(t.value)}>
                              {t.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Limpar seleção
                    </Button>
                  </div>
                </div>
              )}

              {/* List */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {search ? 'Nenhum FAQ encontrado com essa busca' : 'Nenhuma FAQ cadastrada ainda'}
                  </p>
                  {!search && (
                    <Button onClick={() => { setEditingFaq(null); setModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar primeira FAQ
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select all */}
                  <div className="flex items-center gap-2 px-1">
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Selecionar todos</span>
                  </div>

                  {filtered.map((faq, idx) => (
                    <Card key={faq.id} className={selectedIds.has(faq.id) ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex items-center gap-2 shrink-0">
                            <Checkbox
                              checked={selectedIds.has(faq.id)}
                              onCheckedChange={() => toggleSelect(faq.id)}
                            />
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{faq.pergunta}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.contexto}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {faq.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                              {faq.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{faq.tags.length - 3}</Badge>
                              )}
                              {!faq.hasEmbedding && (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                  ⚠️ Sem embedding
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex gap-1">
                              {!faq.hasEmbedding && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={regeneratingId === faq.id}
                                  onClick={() => handleRegenerate(faq)}
                                  title="Gerar embedding"
                                >
                                  {regeneratingId === faq.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDuplicate([faq])}
                                title="Duplicar"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="Mover para outra tab"
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {TABS.filter(t => t.value !== activeTab).map(t => (
                                      <DropdownMenuItem
                                        key={t.value}
                                        onClick={() => handleMoveToTab(faq, t.value)}
                                      >
                                        {t.label}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Duplicar para</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {TABS.filter(t => t.value !== activeTab).map(t => (
                                      <DropdownMenuItem
                                        key={`dup-${t.value}`}
                                        onClick={() => handleDuplicate([faq], t.value)}
                                      >
                                        {t.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingFaq(faq); setModalOpen(true); }}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeletingFaq(faq)}
                                title="Deletar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <LabelSelector
                              documentId={faq.id}
                              labels={companyLabels}
                              selectedLabelIds={faq.labelIds}
                              onToggle={(labelId, isAdding) => handleLabelToggle(faq.id, labelId, isAdding)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add/Edit Modal */}
      <FaqModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingFaq(null); }}
        onSave={handleSave}
        initialData={editingFaq}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFaq} onOpenChange={() => setDeletingFaq(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a FAQ "{deletingFaq?.pergunta}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Labels Modal */}
      <ManageLabelsModal
        isOpen={labelsModalOpen}
        onClose={() => setLabelsModalOpen(false)}
        empresaId={empresaId!}
        onLabelsChanged={fetchCompanyLabels}
      />
    </AppLayout>
  );
}
