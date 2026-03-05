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
  type DragOverEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { LeadCardComponent } from './LeadCardComponent';
import type { LeadCard } from '@/pages/CrmFunil';

interface KanbanBoardProps {
  etapas: { id: number; nome: string; ordem: number; cor: string | null }[];
  leadsByEtapa: Record<number, LeadCard[]>;
  onMoveLead: (leadId: number, newEtapaId: number, newOrder: number) => void;
  onLeadClick?: (leadId: number) => void;
  onAddClick?: (etapaId: number) => void;
}

export function KanbanBoard({ etapas, leadsByEtapa, onMoveLead, onLeadClick, onAddClick }: KanbanBoardProps) {
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
    // over.id can be an etapa id (column) or a lead id
    let targetEtapaId: number;

    // Check if dropped over a column
    const overIdStr = String(over.id);
    if (overIdStr.startsWith('etapa-')) {
      targetEtapaId = Number(overIdStr.replace('etapa-', ''));
    } else {
      // Dropped over another lead - find which etapa that lead is in
      const overLeadId = Number(over.id);
      const found = Object.entries(leadsByEtapa).find(([_, leads]) =>
        leads.some(l => l.id === overLeadId)
      );
      if (!found) return;
      targetEtapaId = Number(found[0]);
    }

    // Find current etapa of the dragged lead
    const currentEtapa = Object.entries(leadsByEtapa).find(([_, leads]) =>
      leads.some(l => l.id === leadId)
    );
    if (!currentEtapa) return;

    const currentEtapaId = Number(currentEtapa[0]);
    if (currentEtapaId === targetEtapaId) return; // Same column, skip

    onMoveLead(leadId, targetEtapaId, 0);
  }, [leadsByEtapa, onMoveLead]);

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
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 opacity-90">
            <LeadCardComponent lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
