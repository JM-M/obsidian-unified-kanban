import React, { useEffect, useState } from 'react';
import { KanbanStore } from '../store';
import { UnifiedBoard, PluginSettings, PROJECT_COLORS } from '../types';
import { Board } from './Board';
import { FilterBar } from './FilterBar';

interface AppProps {
  store: KanbanStore;
  settings: PluginSettings;
  onSettingsChange: (settings: PluginSettings) => void;
}

export function App({ store, settings, onSettingsChange }: AppProps) {
  const [board, setBoard] = useState<UnifiedBoard>(store.getBoard());

  useEffect(() => {
    const unsubscribe = store.subscribe(setBoard);
    return unsubscribe;
  }, [store]);

  const allColumns = store.getAllColumnNames();
  const allProjects = store.getAllProjectNames();

  // Assign colors to projects: use settings first, then cycle through defaults
  const projectColors = React.useMemo(() => {
    const colors: Record<string, string> = { ...settings.projectColors };
    let colorIdx = 0;
    for (const name of allProjects) {
      if (!colors[name]) {
        colors[name] = PROJECT_COLORS[colorIdx % PROJECT_COLORS.length];
        colorIdx++;
      }
    }
    return colors;
  }, [allProjects, settings.projectColors]);

  function handleToggleColumn(name: string) {
    const hidden = settings.hiddenColumns.includes(name)
      ? settings.hiddenColumns.filter((c) => c !== name)
      : [...settings.hiddenColumns, name];
    onSettingsChange({ ...settings, hiddenColumns: hidden });
  }

  function handleToggleProject(name: string) {
    const hidden = settings.hiddenProjects.includes(name)
      ? settings.hiddenProjects.filter((p) => p !== name)
      : [...settings.hiddenProjects, name];
    onSettingsChange({ ...settings, hiddenProjects: hidden });
  }

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

  function handleCreateCard(filePath: string, column: string, projectName: string, text: string) {
    store.dispatch({ type: 'CREATE_CARD', projectName, filePath, column, text });
  }

  function handleEditCard(cardId: string, filePath: string, column: string, newText: string) {
    store.dispatch({ type: 'EDIT_CARD', cardId, filePath, column, newText });
  }

  function handleDeleteCard(cardId: string, filePath: string, column: string) {
    store.dispatch({ type: 'DELETE_CARD', cardId, filePath, column });
  }

  if (board.columns.length === 0 && allProjects.length === 0) {
    return (
      <div className="uk-empty">
        <p>No Kanban boards found in <code>{settings.projectsFolderPath}/</code>.</p>
        <p>Create a <code>Kanban.md</code> file in a project subfolder to get started.</p>
      </div>
    );
  }

  return (
    <div className="uk-app">
      <FilterBar
        allColumns={allColumns}
        allProjects={allProjects}
        hiddenColumns={settings.hiddenColumns}
        hiddenProjects={settings.hiddenProjects}
        projectColors={projectColors}
        onToggleColumn={handleToggleColumn}
        onToggleProject={handleToggleProject}
      />
      <Board
        board={board}
        projectColors={projectColors}
        onMove={handleMove}
        onCreateCard={handleCreateCard}
        onEditCard={handleEditCard}
        onDeleteCard={handleDeleteCard}
      />
    </div>
  );
}
