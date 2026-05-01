import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { UnifiedBoard, KanbanCard } from '../types';
import { Column } from './Column';
import { CardOverlay } from './Card';

interface BoardProps {
  board: UnifiedBoard;
  projectColors: Record<string, string>;
  onMove: (
    cardId: string,
    fromColumn: string,
    fromProject: string,
    toColumn: string,
    toProject: string,
    insertAfterId: string | null
  ) => void;
  onToggle: (cardId: string, filePath: string, column: string) => void;
}

export function Board({ board, projectColors, onMove, onToggle }: BoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as {
      card: KanbanCard;
      column: string;
      projectName: string;
    } | undefined;
    if (data) setActiveCard(data.card);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as {
      card: KanbanCard;
      column: string;
      projectName: string;
      filePath: string;
    };

    // over could be a card (sortable) or a droppable project group
    const overId = over.id as string;

    let toColumn: string;
    let toProject: string;
    let insertAfterId: string | null = null;

    if (overId.startsWith('col::')) {
      // Dropped onto a project group droppable
      const parts = overId.split('::');
      // format: "col::Column Name::proj::ProjectName"
      toColumn = parts[1];
      toProject = parts[3];
    } else {
      // Dropped onto another card (sortable)
      const overData = over.data.current as {
        card: KanbanCard;
        column: string;
        projectName: string;
      } | undefined;
      if (!overData) return;
      toColumn = overData.column;
      toProject = overData.projectName;
      insertAfterId = overData.card.id;
    }

    if (
      activeData.card.id === insertAfterId ||
      (activeData.column === toColumn &&
        activeData.projectName === toProject &&
        !insertAfterId)
    ) {
      return; // No-op
    }

    onMove(
      activeData.card.id,
      activeData.column,
      activeData.projectName,
      toColumn,
      toProject,
      insertAfterId
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // Prefer droppables the pointer is actually inside; fall back to closest centre
        const hits = pointerWithin(args);
        return hits.length > 0 ? hits : closestCenter(args);
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="uk-board">
        {board.columns.map((col) => (
          <Column
            key={col.name}
            column={col}
            projectColors={projectColors}
            onToggle={onToggle}
          />
        ))}
      </div>

      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeCard ? <CardOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
