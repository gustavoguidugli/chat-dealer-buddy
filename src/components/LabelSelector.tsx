import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, Plus, Tag, Star, Flag, Bookmark, Heart, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface LabelItem {
  id: string;
  nome: string;
  cor: string;
  icone: string | null;
}

interface LabelSelectorProps {
  faqId: number;
  labels: LabelItem[];
  selectedLabelIds: string[];
  onToggle: (labelId: string, isAdding: boolean) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  tag: Tag,
  star: Star,
  flag: Flag,
  bookmark: Bookmark,
  heart: Heart,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
};

export function LabelIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function LabelSelector({ faqId, labels, selectedLabelIds, onToggle }: LabelSelectorProps) {
  const selectedLabels = labels.filter(l => selectedLabelIds.includes(l.id));

  const handleToggle = async (labelId: string) => {
    const isSelected = selectedLabelIds.includes(labelId);

    if (isSelected) {
      await supabase
        .from('faq_labels')
        .delete()
        .eq('faq_id', faqId)
        .eq('label_id', labelId);
      onToggle(labelId, false);
    } else {
      await supabase
        .from('faq_labels')
        .insert({ faq_id: faqId, label_id: labelId });
      onToggle(labelId, true);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selectedLabels.map(label => (
        <Badge
          key={label.id}
          className="text-xs text-white border-0"
          style={{ backgroundColor: label.cor }}
        >
          <LabelIcon name={label.icone} className="h-3 w-3 mr-1" />
          {label.nome}
        </Badge>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Gerenciar etiquetas">
            <Tag className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {labels.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 text-center">Nenhuma etiqueta criada</p>
          ) : (
            labels.map(label => {
              const isSelected = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggle(label.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                >
                  <span
                    className="flex items-center justify-center h-4 w-4 rounded border"
                    style={{ borderColor: label.cor, backgroundColor: isSelected ? label.cor : 'transparent' }}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <LabelIcon name={label.icone} className="h-3.5 w-3.5" />
                  <span>{label.nome}</span>
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
