import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard } from '../types';

interface CardProps {
  card: KanbanCard;
  column: string;
  projectName: string;
  filePath: string;
  onEdit: (cardId: string, filePath: string, column: string, newText: string) => void;
  onDelete: (cardId: string, filePath: string, column: string) => void;
}

export function Card({ card, column, projectName, filePath, onEdit, onDelete }: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(card.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    disabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editText]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function startEdit() {
    setEditText(card.text);
    setIsEditing(true);
  }

  function confirmEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== card.text) {
      onEdit(card.id, filePath, column, trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setEditText(card.text);
    setIsEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`uk-card${isDragging ? ' uk-card--dragging' : ''}`}
      {...attributes}
      {...(isEditing ? {} : listeners)}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="uk-card__edit-input"
          value={editText}
          rows={1}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
          }}
          onBlur={confirmEdit}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span
            className="uk-card__text"
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(); }}
          >
            {card.text}
          </span>
          <button
            className="uk-card__delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(card.id, filePath, column); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete card"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}

/** Ghost card rendered in the DragOverlay */
export function CardOverlay({ card }: { card: KanbanCard }) {
  return (
    <div className="uk-card uk-card--overlay">
      <span className="uk-card__text">{card.text}</span>
    </div>
  );
}
