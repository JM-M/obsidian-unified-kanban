import React, { useEffect, useState } from 'react';
import { KanbanStore } from '../store';
import { UnifiedBoard, PluginSettings, PROJECT_COLORS } from '../types';
import { Board } from './Board';

interface AppProps {
  store: KanbanStore;
  settings: PluginSettings;
}

export function App({ store, settings }: AppProps) {
  const [board, setBoard] = useState<UnifiedBoard>(store.getBoard());

  useEffect(() => {
    const unsubscribe = store.subscribe(setBoard);
    return unsubscribe;
  }, [store]);

  // Assign colors to projects: use settings first, then cycle through defaults
  const projectColors = React.useMemo(() => {
    const colors: Record<string, string> = { ...settings.projectColors };
    let colorIdx = 0;
    for (const col of board.columns) {
      for (const lane of col.projects) {
        if (!colors[lane.projectName]) {
          colors[lane.projectName] =
            PROJECT_COLORS[colorIdx % PROJECT_COLORS.length];
          colorIdx++;
        }
      }
    }
    return colors;
  }, [board, settings.projectColors]);

  function handleMove(
    cardId: string,
    fromColumn: string,
    fromProject: string,
    toColumn: string,
    toProject: string,
    insertAfterId: string | null
  ) {
    store.dispatch({
      type: 'MOVE_CARD',
      cardId,
      fromColumn,
      fromProject,
      toColumn,
      toProject,
      insertAfterId,
    });
  }

  function handleToggle(cardId: string, filePath: string, column: string) {
    store.dispatch({
      type: 'TOGGLE_CARD',
      cardId,
      filePath,
      column,
    });
  }

  if (board.columns.length === 0) {
    return (
      <div className="uk-empty">
        <p>No Kanban boards found in <code>{settings.projectsFolderPath}/</code>.</p>
        <p>Create a <code>Kanban.md</code> file in a project subfolder to get started.</p>
      </div>
    );
  }

  return (
    <div className="uk-app">
      <Board
        board={board}
        projectColors={projectColors}
        onMove={handleMove}
        onToggle={handleToggle}
      />
    </div>
  );
}
