import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { icons, LucideIcon } from 'lucide-react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IconeAtividade {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  ordem: number;
}

interface ActivityIconBarProps {
  empresaId: number;
  selectedName?: string;
  onSelect: (nome: string) => void;
  onManage: () => void;
}

// Convert kebab-case to PascalCase for lucide icon lookup
function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function getIcon(iconeName: string): LucideIcon | null {
  const pascal = kebabToPascal(iconeName);
  return (icons as Record<string, LucideIcon>)[pascal] || null;
}

export function ActivityIconBar({ empresaId, selectedName, onSelect, onManage }: ActivityIconBarProps) {
  const [icones, setIcones] = useState<IconeAtividade[]>([]);

  const fetchIcones = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('icones_atividades')
      .select('id, nome, icone, cor, ordem')
      .eq('id_empresa', empresaId)
      .eq('ativo', true)
      .order('ordem');
    setIcones(data || []);
  }, [empresaId]);

  useEffect(() => {
    fetchIcones();
  }, [fetchIcones]);

  // Realtime subscription
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`icones-atividades-${empresaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'icones_atividades',
        filter: `id_empresa=eq.${empresaId}`,
      }, () => {
        fetchIcones();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId, fetchIcones]);

  if (icones.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap">
        {icones.map((ic) => {
          const Icon = getIcon(ic.icone);
          if (!Icon) return null;
          const isSelected = selectedName === ic.nome;
          return (
            <Tooltip key={ic.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(ic.nome)}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" style={{ color: ic.cor }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{ic.nome}</TooltipContent>
            </Tooltip>
          );
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onManage}
              className="p-2 rounded-lg border-2 border-transparent hover:bg-accent transition-colors text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Gerenciar ícones</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
