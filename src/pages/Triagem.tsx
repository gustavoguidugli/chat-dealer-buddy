import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InterestModal, InterestFormData } from '@/components/InterestModal';
import { TriagemPreview } from '@/components/triagem/TriagemPreview';
import { SortableInterestItem } from '@/components/triagem/SortableInterestItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface Interesse {
  id: string;
  nome: string;
  label: string;
  palavras_chave: string[];
  mensagem_resposta: string;
  ordem: number;
  ativo: boolean | null;
  empresa_id: number | null;
}

const DEFAULT_NAMES = ['maquina_gelo', 'purificador', 'outros'];

export default function Triagem() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [interesses, setInteresses] = useState<Interesse[]>([]);
  const [mensagemTriagem, setMensagemTriagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState<Interesse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Interesse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    if (!empresaId) return;
    setLoading(true);

    const [configRes, interessesRes] = await Promise.all([
      supabase
        .from('config_empresas_geral')
        .select('mensagem_triagem')
        .eq('id_empresa', empresaId)
        .single(),
      supabase
        .from('lista_interesses')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem'),
    ]);

    if (configRes.data) {
      setMensagemTriagem(configRes.data.mensagem_triagem || '');
    }
    if (interessesRes.error) {
      toast({ title: 'Erro ao carregar interesses', variant: 'destructive' });
    } else {
      setInteresses(interessesRes.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  // Save welcome message
  const handleSalvarMensagem = async () => {
    if (!empresaId) return;
    setSavingMsg(true);
    const { error } = await supabase
      .from('config_empresas_geral')
      .update({ mensagem_triagem: mensagemTriagem })
      .eq('id_empresa', empresaId);

    if (error) {
      toast({ title: 'Erro ao salvar mensagem', variant: 'destructive' });
    } else {
      toast({ title: 'Mensagem atualizada com sucesso!' });
    }
    setSavingMsg(false);
  };

  // Save interest (add/edit)
  const handleSave = async (formData: InterestFormData) => {
    if (editingInterest) {
      const { error } = await supabase
        .from('lista_interesses')
        .update({
          label: formData.label,
          palavras_chave: formData.palavras_chave,
          mensagem_resposta: formData.mensagem_resposta,
          ordem: formData.ordem,
          ...(!(DEFAULT_NAMES.includes(editingInterest.nome)) ? { nome: formData.nome } : {}),
        })
        .eq('id', editingInterest.id);
      if (error) throw new Error('Erro ao atualizar interesse');
      toast({ title: 'Interesse atualizado com sucesso!' });
    } else {
      const { error } = await supabase
        .from('lista_interesses')
        .insert({
          empresa_id: empresaId!,
          nome: formData.nome,
          label: formData.label,
          palavras_chave: formData.palavras_chave,
          mensagem_resposta: formData.mensagem_resposta,
          ordem: formData.ordem,
          ativo: true,
        });
      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          throw new Error('Já existe um interesse com esse nome');
        }
        throw new Error('Erro ao criar interesse');
      }
      toast({ title: 'Interesse criado com sucesso!' });
    }
    await fetchData();
  };

  // Delete interest
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('lista_interesses').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    } else {
      toast({ title: 'Interesse removido' });
      await fetchData();
    }
    setDeleteTarget(null);
  };

  // Drag & drop reorder
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = interesses.findIndex(i => i.id === active.id);
    const newIndex = interesses.findIndex(i => i.id === over.id);
    const reordered = arrayMove(interesses, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      ordem: idx + 1,
    }));

    setInteresses(reordered);

    // Persist order
    await Promise.all(
      reordered.map(item =>
        supabase.from('lista_interesses').update({ ordem: item.ordem }).eq('id', item.id)
      )
    );
    toast({ title: 'Ordem atualizada!' });
  };

  const isDefault = (nome: string) => DEFAULT_NAMES.includes(nome);
  const nextOrder = interesses.length > 0 ? Math.max(...interesses.map(i => i.ordem)) + 1 : 1;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração da Mensagem Inicial</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure a mensagem de boas-vindas e os interesses que o cliente verá no WhatsApp.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Section 1: Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pré-visualização</CardTitle>
              </CardHeader>
              <CardContent>
                <TriagemPreview mensagem={mensagemTriagem} interesses={interesses} />
              </CardContent>
            </Card>

            {/* Section 2: Welcome message */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personalização da Boas-Vindas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-start">
                  <Textarea
                    value={mensagemTriagem}
                    onChange={(e) => setMensagemTriagem(e.target.value)}
                    rows={3}
                    placeholder="Olá, tudo bem?\nSobre qual assunto você gostaria de falar? 🧊💧"
                    className="flex-1 resize-none"
                  />
                  <Button size="icon" onClick={handleSalvarMensagem} disabled={savingMsg}>
                    {savingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite acima o texto que antecede as opções de interesse na Mensagem Inicial.
                </p>
              </CardContent>
            </Card>

            {/* Section 3: Interests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personalizar Interesses</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste para reordenar, edite ou exclua os interesses que o cliente pode escolher.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {interesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum interesse cadastrado.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext items={interesses.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {interesses.map((interesse) => (
                          <SortableInterestItem
                            key={interesse.id}
                            interesse={interesse}
                            isDefault={isDefault(interesse.nome)}
                            onEdit={(i) => { setEditingInterest(i); setModalOpen(true); }}
                            onDelete={(i) => setDeleteTarget(i)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setEditingInterest(null); setModalOpen(true); }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Interesse
                </Button>

                <div className="rounded-lg border border-dashed bg-muted/50 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Ex: Assistência Técnica</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Modal */}
        <InterestModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingInterest(null); }}
          onSave={handleSave}
          initialData={editingInterest ? {
            nome: editingInterest.nome,
            label: editingInterest.label,
            palavras_chave: editingInterest.palavras_chave || [],
            mensagem_resposta: editingInterest.mensagem_resposta,
            ordem: editingInterest.ordem,
          } : undefined}
          isDefault={editingInterest ? isDefault(editingInterest.nome) : false}
          nextOrder={nextOrder}
        />

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar interesse?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar "{deleteTarget?.label}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
