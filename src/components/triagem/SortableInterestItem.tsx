import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface SortableInterestItemProps {
  interesse: Interesse;
  isDefault: boolean;
  onEdit: (interesse: Interesse) => void;
  onDelete: (interesse: Interesse) => void;
}

const DEFAULT_NAMES = ['maquina_gelo', 'purificador', 'outros'];

export function SortableInterestItem({ interesse, isDefault, onEdit, onDelete }: SortableInterestItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: interesse.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
    >
      <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">
        {interesse.ordem}.
      </span>

      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none shrink-0"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="font-medium text-foreground flex-1 truncate">
        {interesse.label}
      </span>

      {isDefault && (
        <Badge variant="secondary" className="text-xs gap-1 shrink-0">
          <Lock className="h-3 w-3" /> Padrão
        </Badge>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(interesse)}>
          <Pencil className="h-4 w-4" />
        </Button>
        {!isDefault ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(interesse)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-30" disabled>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
