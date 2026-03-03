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
      className={`bg-card rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      }`}
    >
      {/* Top color bar */}
      {topColor && (
        <div className="h-1 rounded-t-lg" style={{ backgroundColor: topColor }} />
      )}

      <div className="p-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{lead.nome}</h4>
            {lead.empresa_cliente && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.empresa_cliente}</p>
            )}
          </div>
          <button className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Date */}
        <p className="text-xs text-muted-foreground mt-2">{formatDate(lead.data_criacao)}</p>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-accent/20 text-accent">
                {getInitials(lead.nome)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-muted-foreground">
              {formatCurrency(lead.valor_estimado)}
            </span>
          </div>

          {/* Etiquetas dots */}
          {lead.etiquetas.length > 0 && (
            <div className="flex gap-1">
              {lead.etiquetas.slice(0, 3).map((et, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
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
