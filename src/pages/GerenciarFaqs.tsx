import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, RefreshCw, Search, MessageSquare, ChevronRight, Loader2, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FaqModal, FaqFormData } from '@/components/FaqModal';

interface FaqItem {
  id: number;
  contexto: string;
  pergunta: string;
  resposta: string;
  tags: string[];
  hasEmbedding: boolean;
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

  const fetchFaqs = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, metadata, embedding')
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
        }))
      );
    } catch {
      toast({ title: 'Erro ao carregar FAQs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId, activeTab, toast]);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

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

    // Generate embedding
    let embedding: any = null;
    try {
      toast({ title: 'Gerando embedding...' });
      const { data: embData, error: embError } = await supabase.functions.invoke('gerar-embedding', {
        body: { texto: content },
      });
      if (embError) {
        console.error('Erro ao gerar embedding:', embError);
        throw embError;
      }
      if (embData?.error) {
        console.error('Erro retornado pela edge function:', embData.error);
        throw new Error(embData.error);
      }
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
      if (error) { console.error('Erro ao regerar embedding:', error); throw error; }
      if (embData?.error) { console.error('Erro da edge function:', embData.error); throw new Error(embData.error); }
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

  const filtered = faqs.filter((f) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.pergunta.toLowerCase().includes(s) ||
      f.resposta.toLowerCase().includes(s) ||
      f.tags.some((t) => t.toLowerCase().includes(s))
    );
  });

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

        <h1 className="text-2xl font-bold text-foreground mb-6">Gerenciar FAQs</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {/* Top bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por pergunta, resposta ou tag..."
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => { setEditingFaq(null); setModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar FAQ
                </Button>
              </div>

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
                  {filtered.map((faq, idx) => (
                    <Card key={faq.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-muted-foreground text-sm font-semibold shrink-0">{idx + 1}</span>
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
                          <div className="flex gap-1 shrink-0">
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
                                  {TABS.filter(t => t.value !== activeTab).map(t => (
                                    <DropdownMenuItem
                                      key={t.value}
                                      onClick={() => handleMoveToTab(faq, t.value)}
                                    >
                                      Mover para "{t.label}"
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
    </AppLayout>
  );
}
