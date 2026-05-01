import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard } from '../types';

interface CardProps {
  card: KanbanCard;
  column: string;
  projectName: string;
  filePath: string;
  onToggle: (cardId: string, filePath: string, column: string) => void;
}

export function Card({ card, column, projectName, filePath, onToggle }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card, column, projectName, filePath },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`uk-card${isDragging ? ' uk-card--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <input
        type="checkbox"
        checked={card.checked}
        className="uk-card__checkbox"
        onChange={(e) => {
          e.stopPropagation();
          onToggle(card.id, filePath, column);
        }}
        // Prevent drag from triggering on checkbox click
        onPointerDown={(e) => e.stopPropagation()}
      />
      <span className={`uk-card__text${card.checked ? ' uk-card__text--checked' : ''}`}>
        {card.text}
      </span>
    </div>
  );
}

/** Ghost card rendered in the DragOverlay */
export function CardOverlay({ card }: { card: KanbanCard }) {
  return (
    <div className="uk-card uk-card--overlay">
      <input type="checkbox" checked={card.checked} readOnly className="uk-card__checkbox" />
      <span className={`uk-card__text${card.checked ? ' uk-card__text--checked' : ''}`}>
        {card.text}
      </span>
    </div>
  );
}
