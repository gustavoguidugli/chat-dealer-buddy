import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadCardComponent } from './LeadCardComponent';
import { Plus } from 'lucide-react';
import type { LeadCard } from '@/pages/CrmFunil';

interface KanbanColumnProps {
  etapa: { id: number; nome: string; cor: string | null };
  leads: LeadCard[];
  totalValor: number;
  onLeadClick?: (leadId: number) => void;
  onAddClick?: (etapaId: number) => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export function KanbanColumn({ etapa, leads, totalValor, onLeadClick, onAddClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `etapa-${etapa.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[300px] shrink-0 rounded-lg bg-secondary/60 border transition-colors ${
        isOver ? 'border-primary/40 bg-primary/5' : 'border-transparent'
      }`}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-semibold text-sm text-foreground">{etapa.nome}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(totalValor)} · {leads.length} negócios
        </p>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="flex flex-col gap-2 p-1">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => onLeadClick?.(lead.id)}>
              <LeadCardComponent lead={lead} />
            </div>
          ))}
          <button
            onClick={() => onAddClick?.(etapa.id)}
            className="w-full flex items-center justify-center py-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
