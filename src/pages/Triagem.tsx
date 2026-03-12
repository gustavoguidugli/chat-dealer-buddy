import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { InterestModal, InterestFormData } from '@/components/InterestModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, Save, CheckCheck } from 'lucide-react';

interface Interesse {
  id: string;
  nome: string;
  label: string;
  palavras_chave: string[];
  mensagem_resposta: string;
  ordem: number;
  ativo: boolean | null;
  empresa_id: number | null;
  funil_id: number | null;
}

interface FunilOption {
  id: number;
  nome: string;
}

function SortableInterestRow({
  interesse, index, funilNome, onEdit, onDelete
}: {
  interesse: Interesse; index: number; funilNome: string | null;
  onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: interesse.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-background border rounded-lg p-4">
      <span className="text-muted-foreground font-medium w-6 text-right shrink-0">{index + 1}.</span>
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-foreground">{interesse.label}</span>
        {funilNome && (
          <span className="text-xs text-muted-foreground ml-2">→ {funilNome}</span>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} className="shrink-0">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Triagem() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mensagemTriagem, setMensagemTriagem] = useState('');
  const [interesses, setInteresses] = useState<Interesse[]>([]);
  const [funis, setFunis] = useState<FunilOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState<Interesse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Interesse | null>(null);
  const [savingMsg, setSavingMsg] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    if (!empresaId) return;
    setLoading(true);

    const [configRes, interessesRes, funisRes] = await Promise.all([
      supabase.from('config_empresas_geral').select('mensagem_triagem').eq('id_empresa', empresaId).maybeSingle(),
      supabase.from('lista_interesses').select('*').eq('empresa_id', empresaId).order('ordem'),
      supabase.from('funis').select('id, nome').eq('id_empresa', empresaId).eq('ativo', true).order('ordem'),
    ]);

    setMensagemTriagem(configRes.data?.mensagem_triagem || '');
    setInteresses(interessesRes.data || []);
    setFunis(funisRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleSalvarMensagem = async () => {
    setSavingMsg(true);
    const { error } = await supabase
      .from('config_empresas_geral')
      .update({ mensagem_triagem: mensagemTriagem })
      .eq('id_empresa', empresaId);
    setSavingMsg(false);
    if (!error) toast({ title: 'Mensagem atualizada com sucesso!' });
    else toast({ title: 'Erro ao salvar mensagem', variant: 'destructive' });
  };

  const handleSaveInterest = async (formData: InterestFormData) => {
    if (editingInterest) {
      const { error } = await supabase.from('lista_interesses').update({
        nome: formData.nome, label: formData.label, palavras_chave: formData.palavras_chave,
        mensagem_resposta: formData.mensagem_resposta, ordem: formData.ordem,
        funil_id: formData.funil_id,
      }).eq('id', editingInterest.id);
      if (error) throw new Error('Erro ao atualizar interesse');
      toast({ title: 'Interesse atualizado!' });
    } else {
      const { error } = await supabase.from('lista_interesses').insert({
        empresa_id: empresaId!, nome: formData.nome, label: formData.label,
        palavras_chave: formData.palavras_chave, mensagem_resposta: formData.mensagem_resposta,
        ordem: formData.ordem, ativo: true, funil_id: formData.funil_id,
      });
      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate'))
          throw new Error('Já existe um interesse com esse nome');
        throw new Error('Erro ao criar interesse');
      }
      toast({ title: 'Interesse adicionado!' });
    }
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('lista_interesses').delete().eq('id', deleteTarget.id);
    if (error) toast({ title: 'Erro ao deletar', variant: 'destructive' });
    else { toast({ title: 'Interesse removido' }); await fetchData(); }
    setDeleteTarget(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = interesses.findIndex(i => i.id === active.id);
    const newIndex = interesses.findIndex(i => i.id === over.id);
    const reordered = arrayMove(interesses, oldIndex, newIndex).map((int, idx) => ({ ...int, ordem: idx + 1 }));
    setInteresses(reordered);
    for (const item of reordered) {
      await supabase.from('lista_interesses').update({ ordem: item.ordem }).eq('id', item.id);
    }
    toast({ title: 'Ordem atualizada!' });
  };

  const activeInteresses = interesses.filter(i => i.ativo !== false);
  const nextOrder = interesses.length > 0 ? Math.max(...interesses.map(i => i.ordem)) + 1 : 1;

  const funilNameMap = new Map(funis.map(f => [f.id, f.nome]));

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-10 space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-48 w-full max-w-2xl mx-auto rounded-xl" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração da Mensagem Inicial</h1>
          <p className="text-muted-foreground mt-1">
            Essa é a primeira mensagem que seu cliente vai receber. Edite abaixo e visualize em tempo real.
          </p>
        </div>

        {/* Preview WhatsApp */}
        <div className="flex justify-center">
          <div className="rounded-2xl p-5 max-w-lg w-full shadow-sm" style={{ backgroundColor: 'hsl(120 60% 95%)', borderColor: 'hsl(120 40% 80%)', borderWidth: '1px', borderStyle: 'solid' }}>
            <p className="text-foreground whitespace-pre-line">{mensagemTriagem || 'Olá, tudo bem?\nSobre qual assunto você gostaria de falar? 🧊💧'}</p>
            {activeInteresses.length > 0 && (
              <div className="mt-3 space-y-0.5">
                {activeInteresses.map((int, idx) => (
                  <p key={int.id} className="text-foreground">{idx + 1}. {int.label}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-2">
              <CheckCheck className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>

        {/* Boas-vindas */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Personalização da parte Boas-Vindas</h2>
          <div className="flex gap-2 items-start">
            <Textarea
              value={mensagemTriagem}
              onChange={(e) => setMensagemTriagem(e.target.value)}
              rows={3}
              placeholder="Olá, tudo bem?\nSobre qual assunto você gostaria de falar? 🧊💧"
              className="flex-1"
            />
            <Button onClick={handleSalvarMensagem} disabled={savingMsg}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite acima o texto que antecede as opções de interesse na Mensagem Inicial.
          </p>
        </div>

        {/* Interesses */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Personalizar Interesses</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Abaixo você pode personalizar os <strong>Interesses</strong> que podem ser escolhidos pelo seu lead/cliente.
              Edite no botão de personalizar, adicione ou exclua-os conforme a sua necessidade.
            </p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={interesses.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {interesses.map((interesse, index) => (
                  <SortableInterestRow
                    key={interesse.id}
                    interesse={interesse}
                    index={index}
                    funilNome={interesse.funil_id ? funilNameMap.get(interesse.funil_id) || null : null}
                    onEdit={() => { setEditingInterest(interesse); setModalOpen(true); }}
                    onDelete={() => setDeleteTarget(interesse)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex justify-center">
            <Button onClick={() => { setEditingInterest(null); setModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Interesse
            </Button>
          </div>

          {/* Placeholder example row */}
          <div className="flex items-center gap-3 border border-dashed rounded-lg p-4 opacity-50">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">Ex: Assistência Técnica</span>
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Modal */}
        <InterestModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingInterest(null); }}
          onSave={handleSaveInterest}
          initialData={editingInterest ? {
            nome: editingInterest.nome, label: editingInterest.label,
            palavras_chave: editingInterest.palavras_chave || [],
            mensagem_resposta: editingInterest.mensagem_resposta, ordem: editingInterest.ordem,
            funil_id: editingInterest.funil_id,
          } : undefined}
          nextOrder={nextOrder}
          funis={funis}
        />

        {/* Delete dialog */}
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
