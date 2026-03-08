import { useDroppable } from '@dnd-kit/core';
import { Trophy, XCircle, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: 'won' | 'lost' | 'delete' | 'move';
}

function DropZone({ id, label, icon, variant }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const variantClasses = {
    won: isOver
      ? 'bg-green-500 text-white border-green-400 scale-105'
      : 'bg-green-500/10 text-green-600 border-green-300 dark:text-green-400 dark:border-green-700',
    lost: isOver
      ? 'bg-red-500 text-white border-red-400 scale-105'
      : 'bg-red-500/10 text-red-600 border-red-300 dark:text-red-400 dark:border-red-700',
    delete: isOver
      ? 'bg-destructive text-destructive-foreground border-destructive scale-105'
      : 'bg-destructive/10 text-destructive border-destructive/30',
    move: isOver
      ? 'bg-primary text-primary-foreground border-primary scale-105'
      : 'bg-primary/10 text-primary border-primary/30',
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed font-semibold text-sm uppercase tracking-wide transition-all duration-200',
        variantClasses[variant]
      )}
    >
      {icon}
      {label}
    </div>
  );
}

interface DragBottomBarProps {
  visible: boolean;
}

export function DragBottomBar({ visible }: DragBottomBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <DropZone
          id="status-lost"
          label="Perdido"
          icon={<XCircle className="h-5 w-5" />}
          variant="lost"
        />
        <DropZone
          id="status-won"
          label="Ganho"
          icon={<Trophy className="h-5 w-5" />}
          variant="won"
        />
      </div>
    </div>
  );
}
