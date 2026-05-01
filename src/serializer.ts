import { KanbanCard } from './types';

const HEADING_RE = /^## (.+)$/;
const TASK_RE = /^- \[(.)\] (.+)$/;
const FRONTMATTER_DELIM = '---';
const SETTINGS_START = '%% kanban:settings';
const ARCHIVE_SEP = '***';

/**
 * Remove a card from a specific column in a file's content.
 * Returns the updated content string.
 */
export function removeCard(content: string, card: KanbanCard): string {
  const lines = content.split('\n');
  // Verify the line still matches (file may have changed)
  const line = lines[card.lineIndex];
  if (line && line.trim() === card.raw) {
    lines.splice(card.lineIndex, 1);
    return lines.join('\n');
  }
  // Fallback: search by raw text in the whole file
  const idx = lines.findIndex((l) => l.trim() === card.raw);
  if (idx !== -1) {
    lines.splice(idx, 1);
  }
  return lines.join('\n');
}

/**
 * Insert a card into a specific column in a file's content.
 * If insertAfterId is provided, inserts after that card's line; otherwise appends to column.
 */
export function insertCard(
  content: string,
  columnName: string,
  card: KanbanCard,
  afterCard: KanbanCard | null
): string {
  const lines = content.split('\n');

  if (afterCard) {
    // Insert immediately after the target card's line
    const afterLine = lines.findIndex((l) => l.trim() === afterCard.raw);
    if (afterLine !== -1) {
      lines.splice(afterLine + 1, 0, card.raw);
      return lines.join('\n');
    }
  }

  // Find the column heading and append at the end of its card list
  let inTargetColumn = false;
  let insertAt = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      if (inTargetColumn) {
        // We've moved to the next column — insert before this line
        insertAt = i;
        break;
      }
      if (headingMatch[1].trim() === columnName) {
        inTargetColumn = true;
      }
      continue;
    }

    if (inTargetColumn) {
      // Track archive separator and settings as column terminators
      if (trimmed === ARCHIVE_SEP || trimmed.startsWith(SETTINGS_START)) {
        insertAt = i;
        break;
      }
      // Track the last task line in this column
      if (trimmed.match(TASK_RE) || trimmed === '') {
        insertAt = i + 1;
      }
    }
  }

  if (insertAt === -1 && inTargetColumn) {
    insertAt = lines.length;
  }

  if (insertAt === -1) {
    // Column not found — append column and card at end (before settings)
    const settingsIdx = lines.findIndex((l) =>
      l.trim().startsWith(SETTINGS_START)
    );
    const pos = settingsIdx !== -1 ? settingsIdx : lines.length;
    lines.splice(pos, 0, `## ${columnName}`, '', card.raw, '');
    return lines.join('\n');
  }

  lines.splice(insertAt, 0, card.raw);
  return lines.join('\n');
}

/**
 * Toggle the check state of a card in the file content.
 */
export function toggleCard(content: string, card: KanbanCard): string {
  const lines = content.split('\n');
  const newCheckChar = card.checked ? ' ' : 'x';
  const newRaw = `- [${newCheckChar}] ${card.text}`;

  // Try by lineIndex first
  const line = lines[card.lineIndex];
  if (line && line.trim() === card.raw) {
    lines[card.lineIndex] = newRaw;
    return lines.join('\n');
  }
  // Fallback: search
  const idx = lines.findIndex((l) => l.trim() === card.raw);
  if (idx !== -1) {
    lines[idx] = newRaw;
  }
  return lines.join('\n');
}
