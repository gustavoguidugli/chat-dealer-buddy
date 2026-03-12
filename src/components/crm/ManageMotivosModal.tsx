import { useState, useEffect, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, GripVertical, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MotivoPerda {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  _status?: 'new' | 'edited' | 'deleted' | 'reordered';
  _tempId?: string;
}

interface ManageMotivosModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
  onSave?: () => void;
}

function SortableMotivoItem({ 
  motivo, 
  onEdit, 
  onDelete 
}: { 
  motivo: MotivoPerda; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: motivo._tempId || String(motivo.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 ${
        motivo._status ? 'bg-muted/30 border border-dashed border-primary/30' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <span className="text-sm font-medium">{motivo.nome}</span>
          {motivo._status && (
            <span className="ml-2 text-xs text-primary">
              {motivo._status === 'new' ? '(novo)' : motivo._status === 'reordered' ? '(reordenado)' : '(editado)'}
            </span>
          )}
          {motivo.descricao && (
            <p className="text-xs text-muted-foreground">{motivo.descricao}</p>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ManageMotivosModal({ isOpen, onClose, empresaId, onSave }: ManageMotivosModalProps) {
  const { toast } = useToast();
  const [motivos, setMotivos] = useState<MotivoPerda[]>([]);
  const [originalMotivos, setOriginalMotivos] = useState<MotivoPerda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoPerda | null>(null);
  const [deletingMotivo, setDeletingMotivo] = useState<MotivoPerda | null>(null);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const hasChanges = motivos.some(m => m._status);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchMotivos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('motivos_perda')
      .select('id, nome, descricao, ordem')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    const fetchedMotivos = (data as MotivoPerda[]) || [];
    setMotivos(fetchedMotivos);
    setOriginalMotivos(JSON.parse(JSON.stringify(fetchedMotivos)));
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) fetchMotivos();
  }, [isOpen, fetchMotivos]);

  const openForm = (motivo?: MotivoPerda) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setNome(motivo.nome);
      setDescricao(motivo.descricao || '');
    } else {
      setEditingMotivo(null);
      setNome('');
      setDescricao('');
    }
    setShowForm(true);
  };

  const handleFormSave = () => {
    if (!nome.trim()) return;

    if (editingMotivo) {
      setMotivos(prev => prev.map(m => {
        if (m.id === editingMotivo.id || m._tempId === editingMotivo._tempId) {
          return {
            ...m,
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            _status: m._status === 'new' ? 'new' : 'edited'
          };
        }
        return m;
      }));
    } else {
      const maxOrdem = motivos.length > 0 ? Math.max(...motivos.map(m => m.ordem ?? 0)) + 1 : 0;
      const newMotivo: MotivoPerda = {
        id: 0,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        ordem: maxOrdem,
        _status: 'new',
        _tempId: `temp_${Date.now()}`
      };
      setMotivos(prev => [...prev, newMotivo]);
    }

    setShowForm(false);
  };

  const handleMarkDelete = () => {
    if (!deletingMotivo) return;
    
    if (deletingMotivo._status === 'new') {
      setMotivos(prev => prev.filter(m => m._tempId !== deletingMotivo._tempId));
    } else {
      setMotivos(prev => prev.map(m => 
        m.id === deletingMotivo.id ? { ...m, _status: 'deleted' as const } : m
      ));
    }
    setDeletingMotivo(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const visibleIds = visibleMotivos.map(m => m._tempId || String(m.id));
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(visibleMotivos, oldIndex, newIndex);
    
    // Update ordem and mark as changed
    const updatedVisible = reordered.map((m, i) => ({
      ...m,
      ordem: i,
      _status: (m._status === 'new' ? 'new' : 
                m._status === 'deleted' ? 'deleted' : 
                'reordered') as MotivoPerda['_status'],
    }));

    // Merge back with deleted items
    const deletedItems = motivos.filter(m => m._status === 'deleted');
    setMotivos([...updatedVisible, ...deletedItems]);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    
    try {
      const toDelete = motivos.filter(m => m._status === 'deleted');
      for (const motivo of toDelete) {
        await supabase
          .from('motivos_perda')
          .update({ ativo: false })
          .eq('id', motivo.id);
      }

      const toInsert = motivos.filter(m => m._status === 'new');
      for (const motivo of toInsert) {
        await supabase
          .from('motivos_perda')
          .insert({
            nome: motivo.nome,
            descricao: motivo.descricao,
            ordem: motivo.ordem,
            empresa_id: empresaId
          });
      }

      const toUpdate = motivos.filter(m => m._status === 'edited' || m._status === 'reordered');
      for (const motivo of toUpdate) {
        await supabase
          .from('motivos_perda')
          .update({
            nome: motivo.nome,
            descricao: motivo.descricao,
            ordem: motivo.ordem,
          })
          .eq('id', motivo.id);
      }

      toast({ title: 'Alterações salvas!' });
      await fetchMotivos();
    } catch (error) {
      toast({ title: 'Erro ao salvar alterações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setMotivos(JSON.parse(JSON.stringify(originalMotivos)));
    }
    onClose();
  };

  const visibleMotivos = motivos.filter(m => m._status !== 'deleted');
  const sortableIds = visibleMotivos.map(m => m._tempId || String(m.id));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Motivos de Perda</DialogTitle>
            <DialogDescription>
              Crie e organize os motivos de perda para seus leads
            </DialogDescription>
          </DialogHeader>

          {showForm ? (
            <div className="space-y-4">
              <div>
                <Label>Nome do Motivo</Label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: Preço acima do orçamento" 
                />
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input 
                  value={descricao} 
                  onChange={e => setDescricao(e.target.value)} 
                  placeholder="Descrição adicional..." 
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleFormSave} disabled={!nome.trim()}>
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" /> Novo Motivo
              </Button>

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando...
                </p>
              ) : visibleMotivos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum motivo criado
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1 mt-2">
                      {visibleMotivos.map(motivo => (
                        <SortableMotivoItem
                          key={motivo._tempId || motivo.id}
                          motivo={motivo}
                          onEdit={() => openForm(motivo)}
                          onDelete={() => setDeletingMotivo(motivo)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {hasChanges && (
                <Button 
                  className="w-full mt-4" 
                  onClick={handleSaveAll}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMotivo} onOpenChange={() => setDeletingMotivo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover motivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O motivo "{deletingMotivo?.nome}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
