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
  onCreateCard: (filePath: string, column: string, projectName: string, text: string) => void;
  onEditCard: (cardId: string, filePath: string, column: string, newText: string) => void;
  onDeleteCard: (cardId: string, filePath: string, column: string) => void;
}

export function Board({ board, projectColors, onMove, onCreateCard, onEditCard, onDeleteCard }: BoardProps) {
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

    const overId = over.id as string;

    let toColumn: string;
    let toProject: string;
    let insertAfterId: string | null = null;

    if (overId.startsWith('col::')) {
      // Dropped onto a project group droppable (empty area) — append to end
      const parts = overId.split('::');
      toColumn = parts[1];
      toProject = parts[3];

      // insertAfterId stays null → store will append at end
      const col = board.columns.find((c) => c.name === toColumn);
      const lane = col?.projects.find((p) => p.projectName === toProject);
      if (lane && lane.cards.length > 0) {
        insertAfterId = lane.cards[lane.cards.length - 1].id;
      }
    } else {
      // Dropped onto a card — decide before or after based on pointer position
      const overData = over.data.current as {
        card: KanbanCard;
        column: string;
        projectName: string;
      } | undefined;
      if (!overData) return;
      toColumn = overData.column;
      toProject = overData.projectName;

      // Compare the midpoint of the target card to the top of the dragged item
      const activeTop = active.rect.current.translated?.top ?? 0;
      const overMid = over.rect.top + over.rect.height / 2;
      const insertBefore = activeTop < overMid;

      if (insertBefore) {
        // Find the card that comes before the target in this project group
        const col = board.columns.find((c) => c.name === toColumn);
        const lane = col?.projects.find((p) => p.projectName === toProject);
        if (lane) {
          const idx = lane.cards.findIndex((c) => c.id === overData.card.id);
          insertAfterId = idx > 0 ? lane.cards[idx - 1].id : null;
        }
      } else {
        insertAfterId = overData.card.id;
      }
    }

    // No-op: same position
    if (activeData.card.id === insertAfterId) return;

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
            onCreateCard={onCreateCard}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
          />
        ))}
      </div>

      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeCard ? <CardOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
