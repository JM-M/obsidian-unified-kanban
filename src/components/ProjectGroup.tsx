import React, { useState, useRef, useEffect } from 'react';
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
  onCreateCard: (filePath: string, column: string, projectName: string, text: string) => void;
  onEditCard: (cardId: string, filePath: string, column: string, newText: string) => void;
  onDeleteCard: (cardId: string, filePath: string, column: string) => void;
}

export function ProjectGroup({
  projectName,
  filePath,
  column,
  cards,
  color,
  onCreateCard,
  onEditCard,
  onDeleteCard,
}: ProjectGroupProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCardText, setNewCardText] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  // Each project group within a column is a droppable zone.
  // The id format: "col::Column Name::proj::ProjectName"
  const droppableId = `col::${column}::proj::${projectName}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { column, projectName, filePath },
  });

  useEffect(() => {
    if (isCreating) createInputRef.current?.focus();
  }, [isCreating]);

  function confirmCreate() {
    const trimmed = newCardText.trim();
    if (trimmed) onCreateCard(filePath, column, projectName, trimmed);
    setNewCardText('');
    setIsCreating(false);
  }

  function cancelCreate() {
    setNewCardText('');
    setIsCreating(false);
  }

  return (
    <div
      className={`uk-project-group${isOver ? ' uk-project-group--over' : ''}`}
    >
      <div className="uk-project-group__header" style={{ borderLeftColor: color }}>
        <span className="uk-project-group__name" style={{ color }}>
          {projectName}
        </span>
        <div className="uk-project-group__header-right">
          <span className="uk-project-group__count">{cards.length}</span>
          <button
            className="uk-project-group__add-btn"
            onClick={() => setIsCreating(true)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Add card"
          >
            +
          </button>
        </div>
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
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
          {cards.length === 0 && !isCreating && (
            <div className="uk-project-group__empty">Drop cards here</div>
          )}
        </div>
      </SortableContext>

      {isCreating && (
        <div className="uk-project-group__create">
          <input
            ref={createInputRef}
            className="uk-card-input"
            placeholder="Card title…"
            value={newCardText}
            onChange={(e) => setNewCardText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); confirmCreate(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelCreate(); }
            }}
            onBlur={confirmCreate}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
