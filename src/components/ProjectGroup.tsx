import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from '../types';
import { Card } from './Card';

interface ProjectGroupProps {
  projectName: string;
  filePath: string;
  column: string;
  cards: KanbanCard[];
  color: string;
  onToggle: (cardId: string, filePath: string, column: string) => void;
}

export function ProjectGroup({
  projectName,
  filePath,
  column,
  cards,
  color,
  onToggle,
}: ProjectGroupProps) {
  // Each project group within a column is a droppable zone.
  // The id format: "col::Column Name::proj::ProjectName"
  const droppableId = `col::${column}::proj::${projectName}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { column, projectName, filePath },
  });

  return (
    <div
      className={`uk-project-group${isOver ? ' uk-project-group--over' : ''}`}
    >
      <div className="uk-project-group__header" style={{ borderLeftColor: color }}>
        <span className="uk-project-group__name" style={{ color }}>
          {projectName}
        </span>
        <span className="uk-project-group__count">{cards.length}</span>
      </div>

      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="uk-project-group__cards">
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              column={column}
              projectName={projectName}
              filePath={filePath}
              onToggle={onToggle}
            />
          ))}
          {cards.length === 0 && (
            <div className="uk-project-group__empty">Drop cards here</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
