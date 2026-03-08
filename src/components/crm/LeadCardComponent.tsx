import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, AlertTriangle, Play, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityModal } from '@/components/crm/ActivityModal';
import type { LeadCard } from '@/pages/CrmFunil';

interface LeadCardProps {
  lead: LeadCard;
  isDragging?: boolean;
  isOverlay?: boolean;
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

function getActivityStatus(dataVencimento: string): 'overdue' | 'today' | 'future' {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const dueDate = dataVencimento.slice(0, 10);
  if (dueDate < todayStr) return 'overdue';
  if (dueDate === todayStr) return 'today';
  return 'future';
}

function getActivityLabel(status: 'overdue' | 'today' | 'future', dataVencimento: string): string {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const today = new Date(todayStr + 'T12:00:00');
  const dueDate = new Date(dataVencimento.slice(0, 10) + 'T12:00:00');
  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (status === 'today') return 'Vence hoje';

  if (status === 'overdue') {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'Vencido há 1 dia';
    return `Vencido há ${absDays} dias`;
  }

  // future
  if (diffDays === 1) return 'Vence em 1 dia';
  return `Vence em ${diffDays} dias`;
}

export function LeadCardComponent({ lead, isDragging, isOverlay }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });
  const { toast } = useToast();
  const { empresaId } = useAuth();
  const [completing, setCompleting] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    ...(isDragging && !isOverlay ? { opacity: 0 } : {}),
  };

  const topColor = lead.etiquetas.length > 0 ? lead.etiquetas[0].cor : null;
  const atividade = lead.proximaAtividade;
  const activityStatus = atividade ? getActivityStatus(atividade.data_vencimento) : null;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!atividade || completing) return;
    setCompleting(true);
    const { error } = await supabase
      .from('atividades')
      .update({ concluida: true, concluida_em: new Date().toISOString() })
      .eq('id', atividade.id);
    setCompleting(false);
    if (error) {
      toast({ title: 'Erro ao concluir', variant: 'destructive' });
    } else {
      toast({ title: 'Atividade concluída!' });
    }
  };

  const handleOpenActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!atividade) return;
    setEditingActivity({
      id: atividade.id,
      assunto: atividade.assunto,
      data_vencimento: atividade.data_vencimento,
      concluida: atividade.concluida,
      atribuida_a: atividade.atribuida_a,
      descricao: atividade.descricao,
      hora_inicio: atividade.hora_inicio,
      hora_fim: atividade.hora_fim,
    });
    setActivityModalOpen(true);
  };

  const handleNewActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  const arrowColorClass =
    activityStatus === 'overdue' ? 'text-destructive' :
    activityStatus === 'today' ? 'text-green-500' :
    'text-muted-foreground';

  const labelColorClass =
    activityStatus === 'overdue' ? 'text-destructive' :
    activityStatus === 'today' ? 'text-green-500' :
    'text-muted-foreground';

  return (
    <>
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
          {/* Header row: Avatar + Title + Activity icon */}
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

            {/* Activity indicator */}
            <div data-activity-zone onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              {atividade ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={`p-1 rounded-full hover:bg-muted transition-colors ${arrowColorClass}`}>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="end" side="right">
                    <div className="flex items-start gap-3 p-3">
                      <button
                        onClick={handleComplete}
                        disabled={completing}
                        className="mt-0.5 h-5 w-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-colors shrink-0 flex items-center justify-center"
                        title="Concluir atividade"
                      >
                        {completing && <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />}
                      </button>
                      <button
                        className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                        onClick={handleOpenActivity}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{atividade.assunto}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`font-medium ${labelColorClass}`}>
                            {getActivityLabel(activityStatus!, atividade.data_vencimento)}
                          </span>
                          {atividade.atribuida_a_nome && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground truncate">{atividade.atribuida_a_nome}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                    <div className="border-t border-border/40">
                      <button
                        onClick={handleNewActivity}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Agendar uma atividade
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted transition-colors text-yellow-500">
                      <AlertTriangle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end" side="right">
                    <div className="flex items-center gap-2 p-3">
                      <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Negócio sem atividade agendada</span>
                    </div>
                    <div className="border-t border-border/40">
                      <button
                        onClick={handleNewActivity}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Agendar uma atividade
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
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

      {empresaId && (
        <div data-activity-zone onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <ActivityModal
            leadId={lead.id}
            empresaId={empresaId}
            activity={editingActivity}
            isOpen={activityModalOpen}
            onClose={() => setActivityModalOpen(false)}
          />
        </div>
      )}
    </>
  );
}
