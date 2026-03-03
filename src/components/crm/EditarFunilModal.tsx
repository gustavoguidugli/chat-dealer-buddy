import { useState, useCallback, useEffect } from 'react';
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

interface EtapaEdit {
  id: number | null; // null = new
  nome: string;
  ordem: number;
  deleted?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: number;
  funilNome: string;
  etapas: { id: number; nome: string; ordem: number; cor: string | null }[];
  onSaved: () => void;
}

function SortableEtapaCard({
  etapa,
  onChangeName,
  onDelete,
}: {
  etapa: EtapaEdit;
  onChangeName: (val: string) => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: etapa.id?.toString() || `new-${etapa.ordem}`,
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
              Essa ação não pode ser desfeita. Os negócios dessa etapa precisarão ser movidos para outra etapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setConfirmOpen(false);
              }}
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

export function EditarFunilModal({ open, onOpenChange, funilId, funilNome, etapas: etapasIniciais, onSaved }: Props) {
  const { toast } = useToast();
  const [nome, setNome] = useState(funilNome);
  const [etapasEdit, setEtapasEdit] = useState<EtapaEdit[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(funilNome);
      setEtapasEdit(
        etapasIniciais.map((e) => ({ id: e.id, nome: e.nome, ordem: e.ordem }))
      );
    }
  }, [open, funilNome, etapasIniciais]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeEtapas = etapasEdit.filter((e) => !e.deleted);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEtapasEdit((prev) => {
      const visible = prev.filter((e) => !e.deleted);
      const oldIndex = visible.findIndex(
        (e) => (e.id?.toString() || `new-${e.ordem}`) === String(active.id)
      );
      const newIndex = visible.findIndex(
        (e) => (e.id?.toString() || `new-${e.ordem}`) === String(over.id)
      );
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = [...visible];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const deleted = prev.filter((e) => e.deleted);
      return [
        ...reordered.map((e, i) => ({ ...e, ordem: i + 1 })),
        ...deleted,
      ];
    });
  }, []);

  const handleChangeName = useCallback((index: number, val: string) => {
    setEtapasEdit((prev) => {
      const visible = prev.filter((e) => !e.deleted);
      const target = visible[index];
      return prev.map((e) =>
        e === target ? { ...e, nome: val } : e
      );
    });
  }, []);

  const handleDelete = useCallback((index: number) => {
    setEtapasEdit((prev) => {
      const visible = prev.filter((e) => !e.deleted);
      const target = visible[index];
      if (target.id === null) {
        // New stage, just remove it
        return prev.filter((e) => e !== target);
      }
      return prev.map((e) =>
        e === target ? { ...e, deleted: true } : e
      );
    });
  }, []);

  const handleAddEtapa = useCallback(() => {
    setEtapasEdit((prev) => {
      const maxOrdem = prev.reduce((max, e) => Math.max(max, e.ordem), 0);
      return [...prev, { id: null, nome: '', ordem: maxOrdem + 1 }];
    });
  }, []);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: 'Nome do funil é obrigatório', variant: 'destructive' });
      return;
    }

    const activeStages = etapasEdit.filter((e) => !e.deleted);
    if (activeStages.some((e) => !e.nome.trim())) {
      toast({ title: 'Todas as etapas precisam ter nome', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Update funnel name
      const { error: funilError } = await supabase
        .from('funis')
        .update({ nome: nome.trim() })
        .eq('id', funilId);

      if (funilError) throw funilError;

      // Delete removed stages (soft delete - set ativo = false)
      const deletedIds = etapasEdit.filter((e) => e.deleted && e.id).map((e) => e.id!);
      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from('etapas_funil')
          .update({ ativo: false })
          .in('id', deletedIds);
        if (error) throw error;
      }

      // Update existing stages
      for (const etapa of activeStages.filter((e) => e.id !== null)) {
        const { error } = await supabase
          .from('etapas_funil')
          .update({ nome: etapa.nome.trim(), ordem: etapa.ordem })
          .eq('id', etapa.id!);
        if (error) throw error;
      }

      // Insert new stages
      const newStages = activeStages.filter((e) => e.id === null);
      if (newStages.length > 0) {
        const { error } = await supabase
          .from('etapas_funil')
          .insert(
            newStages.map((e) => ({
              id_funil: funilId,
              nome: e.nome.trim(),
              ordem: e.ordem,
              ativo: true,
            }))
          );
        if (error) throw error;
      }

      toast({ title: 'Funil atualizado com sucesso!' });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sortableIds = activeEtapas.map(
    (e) => e.id?.toString() || `new-${e.ordem}`
  );

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
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>

        {/* Stages */}
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 min-w-max items-stretch">
                {activeEtapas.map((etapa, idx) => (
                  <SortableEtapaCard
                    key={etapa.id?.toString() || `new-${etapa.ordem}`}
                    etapa={etapa}
                    onChangeName={(val) => handleChangeName(idx, val)}
                    onDelete={() => handleDelete(idx)}
                  />
                ))}

                {/* Add new stage card */}
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
