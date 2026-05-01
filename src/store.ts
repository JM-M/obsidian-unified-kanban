import { App, TFile, normalizePath } from 'obsidian';
import { parseKanbanFile, makeId } from './parser';
import { removeCard, insertCard, toggleCard, editCard } from './serializer';
import {
  UnifiedBoard,
  ParsedKanban,
  KanbanCard,
  BoardAction,
  PluginSettings,
  COLUMN_ORDER,
} from './types';

type Listener = (board: UnifiedBoard) => void;

export class KanbanStore {
  private app: App;
  private settings: PluginSettings;
  private parsedFiles = new Map<string, ParsedKanban>();
  private board: UnifiedBoard = { columns: [], columnOrder: [] };
  private listeners: Listener[] = [];
  /** Paths we are currently writing — ignore modify events for these */
  private writeLocks = new Set<string>();

  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  getBoard(): UnifiedBoard {
    return this.board;
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await this.loadAllFiles();
    this.rebuildBoard();
  }

  private async loadAllFiles(): Promise<void> {
    const folder = this.settings.projectsFolderPath;
    const files = this.app.vault.getMarkdownFiles().filter((f) =>
      f.path.startsWith(folder + '/') && f.name === 'Kanban.md'
    );

    await Promise.all(files.map((f) => this.loadFile(f)));
  }

  private async loadFile(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    // Project name = parent folder name
    const parts = file.path.split('/');
    const projectName = parts[parts.length - 2] ?? file.basename;
    const parsed = parseKanbanFile(content, file.path, projectName);
    this.parsedFiles.set(file.path, parsed);
  }

  // ─── File watcher ──────────────────────────────────────────────────────────

  onFileModified(file: TFile): void {
    if (!file.path.endsWith('Kanban.md')) return;
    if (!file.path.startsWith(this.settings.projectsFolderPath + '/')) return;
    if (this.writeLocks.has(file.path)) return;

    this.loadFile(file).then(() => {
      this.rebuildBoard();
      this.notify();
    });
  }

  onFileDeleted(file: TFile): void {
    if (!this.parsedFiles.has(file.path)) return;
    this.parsedFiles.delete(file.path);
    this.rebuildBoard();
    this.notify();
  }

  // ─── Board assembly ────────────────────────────────────────────────────────

  private rebuildBoard(): void {
    // Determine column order: use COLUMN_ORDER as canonical, supplement with
    // any extra columns found in files
    const allColumns = new Set<string>(COLUMN_ORDER);
    for (const parsed of this.parsedFiles.values()) {
      for (const col of parsed.columnOrder) allColumns.add(col);
    }

    const columnOrder = COLUMN_ORDER.filter((c) => allColumns.has(c));
    // Append any extra columns not in COLUMN_ORDER
    for (const col of allColumns) {
      if (!COLUMN_ORDER.includes(col)) columnOrder.push(col);
    }

    const visibleColumns = columnOrder.filter(
      (c) => !this.settings.hiddenColumns.includes(c)
    );

    const columns = visibleColumns.map((colName) => {
      const projects = Array.from(this.parsedFiles.values())
        .filter((p) => !this.settings.hiddenProjects.includes(p.projectName))
        .map((parsed) => ({
          projectName: parsed.projectName,
          filePath: parsed.filePath,
          cards: parsed.columns.get(colName) ?? [],
        }))
        // Keep all projects so empty columns still have registered droppables

      return { name: colName, projects };
    });

    this.board = { columns, columnOrder: visibleColumns };
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async dispatch(action: BoardAction): Promise<void> {
    switch (action.type) {
      case 'MOVE_CARD':
        await this.handleMoveCard(action);
        break;
      case 'TOGGLE_CARD':
        await this.handleToggleCard(action);
        break;
      case 'DELETE_CARD':
        await this.handleDeleteCard(action);
        break;
      case 'CREATE_CARD':
        await this.handleCreateCard(action);
        break;
      case 'EDIT_CARD':
        await this.handleEditCard(action);
        break;
      case 'FILE_CHANGED':
        // handled via onFileModified
        break;
    }
  }

  private findCard(cardId: string): { card: KanbanCard; parsed: ParsedKanban } | null {
    for (const parsed of this.parsedFiles.values()) {
      for (const cards of parsed.columns.values()) {
        const card = cards.find((c) => c.id === cardId);
        if (card) return { card, parsed };
      }
    }
    return null;
  }

  private findCardInProject(
    cardId: string,
    filePath: string
  ): KanbanCard | null {
    const parsed = this.parsedFiles.get(filePath);
    if (!parsed) return null;
    for (const cards of parsed.columns.values()) {
      const card = cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return null;
  }

  private async handleMoveCard(action: Extract<BoardAction, { type: 'MOVE_CARD' }>): Promise<void> {
    const sourceFile = this.parsedFiles.get(
      this.filePathForProject(action.fromProject)
    );
    const targetFile = this.parsedFiles.get(
      this.filePathForProject(action.toProject)
    );
    if (!sourceFile || !targetFile) return;

    const card = this.findCardInProject(action.cardId, sourceFile.filePath);
    if (!card) return;

    const afterCard = action.insertAfterId
      ? this.findCardInProject(action.insertAfterId, targetFile.filePath)
      : null;

    // Determine new checked state based on target column
    const newChecked = action.toColumn === 'Done today' || action.toColumn === 'Archive';
    const newCheckChar = newChecked ? 'x' : ' ';
    const movedCard: KanbanCard = {
      ...card,
      checked: newChecked,
      checkChar: newCheckChar,
      raw: `- [${newCheckChar}] ${card.text}`,
    };

    // Optimistic update on parsedFiles
    this.removeCardFromParsed(sourceFile, action.fromColumn, action.cardId);
    this.insertCardToParsed(targetFile, action.toColumn, movedCard, afterCard);
    this.rebuildBoard();
    this.notify();

    // Write to disk
    if (sourceFile.filePath === targetFile.filePath) {
      await this.writeFile(sourceFile.filePath, (content) => {
        content = removeCard(content, card);
        content = insertCard(content, action.toColumn, movedCard, afterCard);
        return content;
      });
    } else {
      await Promise.all([
        this.writeFile(sourceFile.filePath, (content) =>
          removeCard(content, card)
        ),
        this.writeFile(targetFile.filePath, (content) =>
          insertCard(content, action.toColumn, movedCard, afterCard)
        ),
      ]);
    }
  }

  private async handleToggleCard(
    action: Extract<BoardAction, { type: 'TOGGLE_CARD' }>
  ): Promise<void> {
    const parsed = this.parsedFiles.get(action.filePath);
    if (!parsed) return;

    const card = this.findCardInProject(action.cardId, action.filePath);
    if (!card) return;

    // Optimistic update
    const newChecked = !card.checked;
    const newCheckChar = newChecked ? 'x' : ' ';
    const updatedCard: KanbanCard = {
      ...card,
      checked: newChecked,
      checkChar: newCheckChar,
      raw: `- [${newCheckChar}] ${card.text}`,
    };
    this.replaceCardInParsed(parsed, action.column, card, updatedCard);
    this.rebuildBoard();
    this.notify();

    await this.writeFile(action.filePath, (content) =>
      toggleCard(content, card)
    );
  }

  private async handleDeleteCard(
    action: Extract<BoardAction, { type: 'DELETE_CARD' }>
  ): Promise<void> {
    const parsed = this.parsedFiles.get(action.filePath);
    if (!parsed) return;

    const card = this.findCardInProject(action.cardId, action.filePath);
    if (!card) return;

    // Optimistic update
    this.removeCardFromParsed(parsed, action.column, action.cardId);
    this.rebuildBoard();
    this.notify();

    await this.writeFile(action.filePath, (content) => removeCard(content, card));
  }

  private async handleCreateCard(
    action: Extract<BoardAction, { type: 'CREATE_CARD' }>
  ): Promise<void> {
    const parsed = this.parsedFiles.get(action.filePath);
    if (!parsed) return;

    const raw = `- [ ] ${action.text}`;
    const newCard: KanbanCard = {
      id: makeId(action.projectName, raw),
      raw,
      text: action.text,
      checked: false,
      checkChar: ' ',
      lineIndex: -1,
    };

    // Append after the last card in this column
    const colCards = parsed.columns.get(action.column) ?? [];
    const afterCard = colCards.length > 0 ? colCards[colCards.length - 1] : null;

    // Optimistic update
    this.insertCardToParsed(parsed, action.column, newCard, afterCard);
    this.rebuildBoard();
    this.notify();

    await this.writeFile(action.filePath, (content) =>
      insertCard(content, action.column, newCard, afterCard)
    );
  }

  private async handleEditCard(
    action: Extract<BoardAction, { type: 'EDIT_CARD' }>
  ): Promise<void> {
    const parsed = this.parsedFiles.get(action.filePath);
    if (!parsed) return;

    const card = this.findCardInProject(action.cardId, action.filePath);
    if (!card) return;

    const newRaw = `- [${card.checkChar}] ${action.newText}`;
    const updatedCard: KanbanCard = {
      ...card,
      raw: newRaw,
      text: action.newText,
      id: makeId(parsed.projectName, newRaw),
    };

    // Optimistic update
    this.replaceCardInParsed(parsed, action.column, card, updatedCard);
    this.rebuildBoard();
    this.notify();

    await this.writeFile(action.filePath, (content) =>
      editCard(content, card, action.newText)
    );
  }

  // ─── Parsed state helpers ──────────────────────────────────────────────────

  private removeCardFromParsed(
    parsed: ParsedKanban,
    column: string,
    cardId: string
  ): void {
    const cards = parsed.columns.get(column);
    if (cards) {
      parsed.columns.set(
        column,
        cards.filter((c) => c.id !== cardId)
      );
    }
  }

  private insertCardToParsed(
    parsed: ParsedKanban,
    column: string,
    card: KanbanCard,
    afterCard: KanbanCard | null
  ): void {
    let cards = parsed.columns.get(column) ?? [];
    if (!parsed.columns.has(column)) {
      parsed.columns.set(column, cards);
      parsed.columnOrder.push(column);
    }
    if (afterCard) {
      const idx = cards.findIndex((c) => c.id === afterCard.id);
      if (idx !== -1) {
        cards = [...cards.slice(0, idx + 1), card, ...cards.slice(idx + 1)];
      } else {
        cards = [...cards, card];
      }
    } else {
      cards = [card, ...cards];
    }
    parsed.columns.set(column, cards);
  }

  private replaceCardInParsed(
    parsed: ParsedKanban,
    column: string,
    oldCard: KanbanCard,
    newCard: KanbanCard
  ): void {
    const cards = parsed.columns.get(column);
    if (cards) {
      const idx = cards.findIndex((c) => c.id === oldCard.id);
      if (idx !== -1) {
        cards[idx] = newCard;
      }
    }
  }

  // ─── File I/O ──────────────────────────────────────────────────────────────

  private filePathForProject(projectName: string): string {
    for (const parsed of this.parsedFiles.values()) {
      if (parsed.projectName === projectName) return parsed.filePath;
    }
    return '';
  }

  private async writeFile(
    filePath: string,
    transform: (content: string) => string
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(filePath)
    ) as TFile | null;
    if (!file) return;

    this.writeLocks.add(filePath);
    try {
      await this.app.vault.process(file, transform);
      // Re-parse after write so our in-memory state is accurate
      await this.loadFile(file);
      this.rebuildBoard();
      this.notify();
    } finally {
      // Small delay so the modify event fires and we can ignore it
      setTimeout(() => this.writeLocks.delete(filePath), 500);
    }
  }

  // ─── Notify ────────────────────────────────────────────────────────────────

  private notify(): void {
    for (const fn of this.listeners) fn(this.board);
  }
}
