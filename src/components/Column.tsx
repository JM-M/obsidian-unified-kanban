import React from 'react';
import { UnifiedColumn } from '../types';
import { ProjectGroup } from './ProjectGroup';

interface ColumnProps {
  column: UnifiedColumn;
  projectColors: Record<string, string>;
  onCreateCard: (filePath: string, column: string, projectName: string, text: string) => void;
  onEditCard: (cardId: string, filePath: string, column: string, newText: string) => void;
  onDeleteCard: (cardId: string, filePath: string, column: string) => void;
}

export function Column({ column, projectColors, onCreateCard, onEditCard, onDeleteCard }: ColumnProps) {
  const totalCards = column.projects.reduce((n, p) => n + p.cards.length, 0);

  return (
    <div className="uk-column">
      <div className="uk-column__header">
        <span className="uk-column__title">{column.name}</span>
        <span className="uk-column__badge">{totalCards}</span>
      </div>

      <div className="uk-column__body">
        {column.projects.map((lane) => (
          <ProjectGroup
            key={lane.projectName}
            projectName={lane.projectName}
            filePath={lane.filePath}
            column={column.name}
            cards={lane.cards}
            color={projectColors[lane.projectName] ?? '#888'}
            onCreateCard={onCreateCard}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
          />
        ))}
        {column.projects.length === 0 && (
          <div className="uk-column__empty">No cards</div>
        )}
      </div>
    </div>
  );
}
