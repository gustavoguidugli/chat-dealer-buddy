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
      className={`flex flex-col w-[300px] shrink-0 rounded-xl border-2 transition-colors ${
        isOver ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-secondary/40'
      }`}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          {etapa.cor && (
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
          )}
          <h3 className="font-semibold text-sm text-foreground">{etapa.nome}</h3>
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
          {formatCurrency(totalValor)}
        </p>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 px-2.5 pb-2.5 pt-2">
        <div className="flex flex-col gap-2.5">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => onLeadClick?.(lead.id)}>
              <LeadCardComponent lead={lead} />
            </div>
          ))}
          <button
            onClick={() => onAddClick?.(etapa.id)}
            className="w-full flex items-center justify-center py-3.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
