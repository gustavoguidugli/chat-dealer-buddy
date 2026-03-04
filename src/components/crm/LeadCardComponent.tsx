import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { LeadCard } from '@/pages/CrmFunil';

interface LeadCardProps {
  lead: LeadCard;
  isDragging?: boolean;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | null) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function LeadCardComponent({ lead, isDragging }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const topColor = lead.etiquetas.length > 0 ? lead.etiquetas[0].cor : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-card rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-primary/20 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20 scale-[1.02]' : ''
      }`}
    >
      {/* Top color bar */}
      {topColor && (
        <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: topColor }} />
      )}

      <div className="px-3.5 py-3">
        {/* Header row: Avatar + Title */}
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[11px] font-semibold bg-accent/15 text-accent">
              {getInitials(lead.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{lead.nome}</h4>
            {lead.empresa_cliente && (
              <p className="text-[11px] text-muted-foreground truncate">{lead.empresa_cliente}</p>
            )}
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground">
              {formatCurrency(lead.valor_estimado)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(lead.data_criacao)}
            </span>
          </div>

          {/* Etiquetas dots */}
          {lead.etiquetas.length > 0 && (
            <div className="flex gap-1">
              {lead.etiquetas.slice(0, 3).map((et, i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-background"
                  style={{ backgroundColor: et.cor }}
                  title={et.nome}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
