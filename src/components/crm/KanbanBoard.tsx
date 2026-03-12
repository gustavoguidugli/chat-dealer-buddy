import { useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { LeadCardComponent } from './LeadCardComponent';
import { DragBottomBar } from './DragBottomBar';
import type { LeadCard } from '@/pages/CrmFunil';

interface KanbanBoardProps {
  etapas: { id: number; nome: string; ordem: number; cor: string | null }[];
  leadsByEtapa: Record<number, LeadCard[]>;
  wonLeads: LeadCard[];
  lostLeads: LeadCard[];
  onMoveLead: (leadId: number, newEtapaId: number, newOrder: number) => void;
  onLeadClick?: (leadId: number) => void;
  onAddClick?: (etapaId: number) => void;
  onDropWon?: (leadId: number) => void;
  onDropLost?: (leadId: number) => void;
  listaInteresses?: { nome: string; label: string }[];
  onLeadChanged?: () => void;
}

export function KanbanBoard({ etapas, leadsByEtapa, wonLeads, lostLeads, onMoveLead, onLeadClick, onAddClick, onDropWon, onDropLost, listaInteresses, onLeadChanged }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const activeLead = activeId
    ? Object.values(leadsByEtapa).flat().find(l => l.id === activeId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = Number(active.id);
    const overIdStr = String(over.id);

    // Handle drop on status columns
    if (overIdStr === 'status-won') {
      onDropWon?.(leadId);
      return;
    }
    if (overIdStr === 'status-lost') {
      onDropLost?.(leadId);
      return;
    }

    let targetEtapaId: number;

    if (overIdStr.startsWith('etapa-')) {
      targetEtapaId = Number(overIdStr.replace('etapa-', ''));
    } else {
      const overLeadId = Number(over.id);
      const found = Object.entries(leadsByEtapa).find(([_, leads]) =>
        leads.some(l => l.id === overLeadId)
      );
      if (!found) return;
      targetEtapaId = Number(found[0]);
    }

    const currentEtapa = Object.entries(leadsByEtapa).find(([_, leads]) =>
      leads.some(l => l.id === leadId)
    );
    if (!currentEtapa) return;

    const currentEtapaId = Number(currentEtapa[0]);
    if (currentEtapaId === targetEtapaId) return;

    onMoveLead(leadId, targetEtapaId, 0);
  }, [leadsByEtapa, onMoveLead, onDropWon, onDropLost]);

  const wonTotal = wonLeads.reduce((sum, l) => sum + (l.valor_final || l.valor_estimado || 0), 0);
  const lostTotal = lostLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 h-full min-w-max bg-background">
        {etapas.map(etapa => {
          const etapaLeads = leadsByEtapa[etapa.id] || [];
          const totalValor = etapaLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

          return (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              leads={etapaLeads}
              totalValor={totalValor}
              onLeadClick={onLeadClick}
              onAddClick={onAddClick}
              listaInteresses={listaInteresses}
              onLeadChanged={onLeadChanged}
            />
          );
        })}
      </div>

      <DragBottomBar visible={activeId !== null} />

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 opacity-90">
            <LeadCardComponent lead={activeLead} isDragging isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
