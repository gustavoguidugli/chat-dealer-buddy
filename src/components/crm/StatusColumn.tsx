import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { LeadCard } from '@/pages/CrmFunil';

interface StatusColumnProps {
  title: string;
  leads: LeadCard[];
  totalValor: number;
  variant: 'won' | 'lost';
  onLeadClick?: (leadId: number) => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function StatusColumn({ title, leads, totalValor, variant, onLeadClick }: StatusColumnProps) {
  const isWon = variant === 'won';
  const droppableId = isWon ? 'status-won' : 'status-lost';
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[280px] shrink-0 rounded-xl border-2 transition-colors ${
        isOver
          ? isWon
            ? 'border-green-400 bg-green-100/60 dark:border-green-500/60 dark:bg-green-950/40 ring-2 ring-green-300/50'
            : 'border-red-400 bg-red-100/60 dark:border-red-500/60 dark:bg-red-950/40 ring-2 ring-red-300/50'
          : isWon
            ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
            : 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
      }`}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          {isWon ? (
            <Trophy className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
          )}
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
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
        <div className="flex flex-col gap-2">
          {leads.map(lead => (
            <div
              key={lead.id}
              onClick={() => onLeadClick?.(lead.id)}
              className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:shadow-sm ${
                isWon
                  ? 'bg-green-50 border-green-200/80 hover:border-green-300 dark:bg-green-950/30 dark:border-green-800/40'
                  : 'bg-red-50 border-red-200/80 hover:border-red-300 dark:bg-red-950/30 dark:border-red-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={`text-[10px] font-semibold ${
                    isWon
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  }`}>
                    {getInitials(lead.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">{lead.nome}</h4>
                  {lead.empresa_cliente && (
                    <p className="text-[11px] text-muted-foreground truncate">{lead.empresa_cliente}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-border/20">
                {isWon ? (
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                    {formatCurrency(lead.valor_final || lead.valor_estimado || 0)}
                  </span>
                ) : (
                  <span className="text-xs text-red-600 dark:text-red-400 truncate block">
                    {lead.motivo_perda || 'Sem motivo informado'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Nenhum negócio
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
