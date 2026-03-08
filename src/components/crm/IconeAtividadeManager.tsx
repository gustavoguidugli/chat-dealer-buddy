import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { icons, LucideIcon, Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface IconeAtividade {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  ordem: number;
}

const ICONES_DISPONIVEIS = [
  'trending-up', 'phone', 'mail', 'calendar', 'file-text',
  'map-pin', 'coffee', 'briefcase', 'check-circle', 'clock',
  'message-circle', 'video', 'user', 'users', 'package',
  'clipboard', 'send', 'star', 'flag', 'bell',
  'shopping-cart', 'pencil', 'truck', 'smartphone', 'heart',
];

const CORES_DISPONIVEIS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16',
];

function kebabToPascal(str: string): string {
  return str.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function getIcon(name: string): LucideIcon | null {
  return (icons as Record<string, LucideIcon>)[kebabToPascal(name)] || null;
}

/* ── Sortable Item ── */
function SortableItem({ icone, onDelete }: { icone: IconeAtividade; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: icone.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = getIcon(icone.icone);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2 px-3 rounded-lg border bg-card">
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      {Icon && <Icon className="h-5 w-5 shrink-0" style={{ color: icone.cor }} />}
      <span className="flex-1 text-sm font-medium">{icone.nome}</span>
      <button type="button" onClick={() => onDelete(icone.id)} className="text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Manager Modal ── */
interface Props {
  empresaId: number;
  open: boolean;
  onClose: () => void;
}

export function IconeAtividadeManager({ empresaId, open, onClose }: Props) {
  const { toast } = useToast();
  const [icones, setIcones] = useState<IconeAtividade[]>([]);
  const [creating, setCreating] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newIcone, setNewIcone] = useState('trending-up');
  const [newCor, setNewCor] = useState('#3B82F6');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchIcones = async () => {
    const { data } = await supabase
      .from('icones_atividades')
      .select('*')
      .eq('id_empresa', empresaId)
      .eq('ativo', true)
      .order('ordem');
    setIcones((data as IconeAtividade[]) || []);
  };

  useEffect(() => {
    if (open) fetchIcones();
  }, [open, empresaId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = icones.findIndex(i => i.id === active.id);
    const newIdx = icones.findIndex(i => i.id === over.id);
    const reordered = arrayMove(icones, oldIdx, newIdx);
    setIcones(reordered);
    await Promise.all(reordered.map((ic, idx) =>
      supabase.from('icones_atividades').update({ ordem: idx + 1 }).eq('id', ic.id)
    ));
  };

  const handleCreate = async () => {
    if (!newNome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    const maxOrdem = icones.length > 0 ? Math.max(...icones.map(i => i.ordem)) : 0;
    const { error } = await supabase.from('icones_atividades').insert({
      id_empresa: empresaId,
      nome: newNome.trim(),
      icone: newIcone,
      cor: newCor,
      ordem: maxOrdem + 1,
    });
    if (error) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    } else {
      setCreating(false);
      setNewNome('');
      setNewIcone('trending-up');
      setNewCor('#3B82F6');
      fetchIcones();
    }
  };

  const handleDelete = async (id: number) => {
    await supabase.from('icones_atividades').update({ ativo: false }).eq('id', id);
    fetchIcones();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Ícones de Atividades</DialogTitle>
        </DialogHeader>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={icones.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {icones.map(ic => (
                <SortableItem key={ic.id} icone={ic} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {creating ? (
          <div className="space-y-3 border rounded-lg p-3 mt-2">
            <Input
              placeholder="Nome do ícone (ex: Ligação)"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
              autoFocus
            />

            {/* Icon picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Ícone</p>
              <div className="flex flex-wrap gap-1">
                {ICONES_DISPONIVEIS.map(name => {
                  const Ic = getIcon(name);
                  if (!Ic) return null;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewIcone(name)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-colors",
                        newIcone === name ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                      )}
                    >
                      <Ic className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Cor</p>
              <div className="flex gap-2 flex-wrap">
                {CORES_DISPONIVEIS.map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setNewCor(cor)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      newCor === cor ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Check className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="mt-2 w-full" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Ícone
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
