import { useState, useCallback } from 'react';
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Funil {
  id: number;
  nome: string;
}

interface FunilSortableSelectProps {
  funis: Funil[];
  value: number | null;
  onValueChange: (id: number) => void;
  onReorder: (reordered: Funil[]) => void;
}

function SortableItem({
  funil,
  isSelected,
  onSelect,
}: {
  funil: Funil;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: funil.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${
        isSelected ? 'bg-accent font-medium' : 'hover:bg-accent/50'
      } ${isDragging ? 'shadow-md bg-popover' : ''}`}
      onClick={onSelect}
    >
      <button
        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 truncate">{funil.nome}</span>
      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
    </div>
  );
}

export function FunilSortableSelect({
  funis,
  value,
  onValueChange,
  onReorder,
}: FunilSortableSelectProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = funis.findIndex((f) => f.id === active.id);
      const newIndex = funis.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(funis, oldIndex, newIndex);

      // Optimistic update
      onReorder(reordered);

      // Persist new order
      const updates = reordered.map((f, i) => ({
        id: f.id,
        ordem: i,
      }));

      for (const u of updates) {
        const { error } = await supabase
          .from('funis')
          .update({ ordem: u.ordem })
          .eq('id', u.id);
        if (error) {
          toast({
            title: 'Erro ao reordenar funis',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }
      }
    },
    [funis, onReorder, toast]
  );

  const selectedNome = funis.find((f) => f.id === value)?.nome || 'Selecionar funil';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] h-9 justify-between font-normal"
        >
          <span className="truncate">{selectedNome}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1.5" align="end">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={funis.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {funis.map((f) => (
              <SortableItem
                key={f.id}
                funil={f}
                isSelected={f.id === value}
                onSelect={() => {
                  onValueChange(f.id);
                  setOpen(false);
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
}
