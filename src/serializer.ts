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
 * afterCard = null  → insert at the TOP of the column (before all existing cards).
 * afterCard = card  → insert immediately after that card's line.
 */
export function insertCard(
  content: string,
  columnName: string,
  card: KanbanCard,
  afterCard: KanbanCard | null
): string {
  const lines = content.split('\n');

  // ── Insert after a specific card ─────────────────────────────────────────
  if (afterCard) {
    const afterLine = lines.findIndex((l) => l.trim() === afterCard.raw);
    if (afterLine !== -1) {
      lines.splice(afterLine + 1, 0, card.raw);
      return lines.join('\n');
    }
    // afterCard not found — fall through to append-at-end behaviour
  }

  // ── Scan the column ───────────────────────────────────────────────────────
  let inTargetColumn = false;
  let firstCardLine = -1; // line index of the first task in this column
  let insertAt = -1;      // fallback: append position

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      if (inTargetColumn) {
        // Moved past the target column
        insertAt = i;
        break;
      }
      if (headingMatch[1].trim() === columnName) {
        inTargetColumn = true;
      }
      continue;
    }

    if (inTargetColumn) {
      if (trimmed === ARCHIVE_SEP || trimmed.startsWith(SETTINGS_START)) {
        insertAt = i;
        break;
      }
      if (trimmed.match(TASK_RE)) {
        if (firstCardLine === -1) firstCardLine = i;
        insertAt = i + 1; // keep updating so we end up after the last card
      } else if (trimmed === '' && insertAt === -1) {
        insertAt = i + 1;
      }
    }
  }

  if (insertAt === -1 && inTargetColumn) insertAt = lines.length;

  if (insertAt === -1) {
    // Column not found — create it before the settings footer
    const settingsIdx = lines.findIndex((l) =>
      l.trim().startsWith(SETTINGS_START)
    );
    const pos = settingsIdx !== -1 ? settingsIdx : lines.length;
    lines.splice(pos, 0, `## ${columnName}`, '', card.raw, '');
    return lines.join('\n');
  }

  // ── afterCard null → insert at TOP (before first existing card) ───────────
  if (!afterCard && firstCardLine !== -1) {
    lines.splice(firstCardLine, 0, card.raw);
    return lines.join('\n');
  }

  // afterCard null + empty column, OR afterCard not found → append at end
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
