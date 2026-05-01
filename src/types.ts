export interface KanbanCard {
  /** Stable ID: hash of projectName + rawText */
  id: string;
  /** Full markdown line, e.g. "- [ ] Fix login bug" */
  raw: string;
  /** Display text (stripped of "- [ ] " prefix) */
  text: string;
  checked: boolean;
  /** The character inside [ ], either ' ' or 'x' */
  checkChar: string;
  /** 0-based line index in the source file */
  lineIndex: number;
}

export interface ProjectLane {
  projectName: string;
  /** Absolute vault path, e.g. "Projects/Vesslr/Kanban.md" */
  filePath: string;
  cards: KanbanCard[];
}

export interface UnifiedColumn {
  name: string;
  projects: ProjectLane[];
}

export interface UnifiedBoard {
  columns: UnifiedColumn[];
  /** Ordered list of column names */
  columnOrder: string[];
}

/** Parsed representation of a single Kanban.md file */
export interface ParsedKanban {
  filePath: string;
  projectName: string;
  /** Map from column name to ordered list of cards */
  columns: Map<string, KanbanCard[]>;
  /** Preserved column order from the file */
  columnOrder: string[];
}

export type MoveCardAction = {
  type: 'MOVE_CARD';
  cardId: string;
  fromColumn: string;
  fromProject: string;
  toColumn: string;
  toProject: string;
  /** Insert after this card id; null means insert at top */
  insertAfterId: string | null;
};

export type ToggleCardAction = {
  type: 'TOGGLE_CARD';
  cardId: string;
  filePath: string;
  column: string;
};

export type DeleteCardAction = {
  type: 'DELETE_CARD';
  cardId: string;
  filePath: string;
  column: string;
};

export type CreateCardAction = {
  type: 'CREATE_CARD';
  projectName: string;
  filePath: string;
  column: string;
  text: string;
};

export type EditCardAction = {
  type: 'EDIT_CARD';
  cardId: string;
  filePath: string;
  column: string;
  newText: string;
};

export type FileChangedAction = {
  type: 'FILE_CHANGED';
  filePath: string;
};

export type BoardAction = MoveCardAction | ToggleCardAction | DeleteCardAction | CreateCardAction | EditCardAction | FileChangedAction;

export interface StoreState {
  board: UnifiedBoard;
  parsedFiles: Map<string, ParsedKanban>;
}

export interface ProjectSettings {
  color: string;
}

export interface PluginSettings {
  projectsFolderPath: string;
  projectColors: Record<string, string>;
  hiddenColumns: string[];
  hiddenProjects: string[];
}

export const DEFAULT_SETTINGS: PluginSettings = {
  projectsFolderPath: 'Projects',
  projectColors: {},
  hiddenColumns: [],
  hiddenProjects: [],
};

export const COLUMN_ORDER = [
  'Incoming',
  'Waiting for',
  'In progress',
  'Done today',
  'Archive',
];

export const PROJECT_COLORS = [
  '#4A90D9',
  '#7B68EE',
  '#50C878',
  '#FF7F50',
  '#FFD700',
  '#FF69B4',
  '#40E0D0',
  '#FFA500',
];
