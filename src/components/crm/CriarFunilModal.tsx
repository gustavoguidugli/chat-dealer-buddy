import { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EtapaNova {
  tempId: string;
  nome: string;
  ordem: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: number;
  onCreated: () => void;
}

function SortableEtapaCard({
  etapa,
  onChangeName,
  onDelete,
}: {
  etapa: EtapaNova;
  onChangeName: (val: string) => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: etapa.tempId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-col w-[260px] shrink-0 rounded-lg bg-secondary/60 border p-4 gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground truncate">{etapa.nome || 'Nova etapa'}</h3>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Nome</label>
          <Input
            value={etapa.nome}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Nome da etapa"
          />
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir etapa
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa "{etapa.nome || 'Nova etapa'}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa etapa será removida do novo funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(); setConfirmOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

let counter = 0;
function nextTempId() {
  return `temp-${++counter}`;
}

export function CriarFunilModal({ open, onOpenChange, empresaId, onCreated }: Props) {
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [etapas, setEtapas] = useState<EtapaNova[]>([
    { tempId: nextTempId(), nome: '', ordem: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEtapas((prev) => {
      const oldIndex = prev.findIndex((e) => e.tempId === String(active.id));
      const newIndex = prev.findIndex((e) => e.tempId === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = [...prev];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      return reordered.map((e, i) => ({ ...e, ordem: i + 1 }));
    });
  }, []);

  const handleChangeName = useCallback((index: number, val: string) => {
    setEtapas((prev) => prev.map((e, i) => (i === index ? { ...e, nome: val } : e)));
  }, []);

  const handleDelete = useCallback((index: number) => {
    setEtapas((prev) => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, ordem: i + 1 })));
  }, []);

  const handleAddEtapa = useCallback(() => {
    setEtapas((prev) => [...prev, { tempId: nextTempId(), nome: '', ordem: prev.length + 1 }]);
  }, []);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: 'Nome do funil é obrigatório', variant: 'destructive' });
      return;
    }
    if (etapas.length === 0) {
      toast({ title: 'Adicione pelo menos uma etapa', variant: 'destructive' });
      return;
    }
    if (etapas.some((e) => !e.nome.trim())) {
      toast({ title: 'Todas as etapas precisam ter nome', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .insert({ nome: nome.trim(), id_empresa: empresaId, ativo: true })
        .select('id')
        .single();

      if (funilError) throw funilError;

      const { error: etapasError } = await supabase
        .from('etapas_funil')
        .insert(
          etapas.map((e) => ({
            id_funil: funil.id,
            nome: e.nome.trim(),
            ordem: e.ordem,
            ativo: true,
          }))
        );

      if (etapasError) throw etapasError;

      toast({ title: 'Funil criado com sucesso!' });
      // Reset form
      setNome('');
      setEtapas([{ tempId: nextTempId(), nome: '', ordem: 1 }]);
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao criar funil', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sortableIds = etapas.map((e) => e.tempId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Nome do funil</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-[280px]"
              placeholder="Ex: Vendas, Pós-venda..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {saving ? 'Criando...' : 'Criar funil'}
            </Button>
          </div>
        </div>

        {/* Stages */}
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 min-w-max items-stretch">
                {etapas.map((etapa, idx) => (
                  <SortableEtapaCard
                    key={etapa.tempId}
                    etapa={etapa}
                    onChangeName={(val) => handleChangeName(idx, val)}
                    onDelete={() => handleDelete(idx)}
                  />
                ))}

                <div className="flex flex-col w-[260px] shrink-0 rounded-lg border border-dashed border-muted-foreground/30 p-6 items-center justify-center gap-3">
                  <h3 className="font-semibold text-base text-foreground">Adicionar nova etapa</h3>
                  <p className="text-xs text-muted-foreground text-center">
                    As etapas do funil representam os passos em seu processo de vendas.
                  </p>
                  <Button variant="outline" onClick={handleAddEtapa} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Nova etapa
                  </Button>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  );
}
