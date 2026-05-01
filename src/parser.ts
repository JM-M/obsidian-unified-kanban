import { KanbanCard, ParsedKanban } from './types';

/** Matches "- [ ] text" or "- [x] text" (any check character) */
const TASK_RE = /^- \[(.)\] (.+)$/;
/** Matches "## Column Name" */
const HEADING_RE = /^## (.+)$/;
/** Frontmatter delimiter */
const FRONTMATTER_DELIM = '---';
/** Settings footer start */
const SETTINGS_START = '%% kanban:settings';
/** Archive separator */
const ARCHIVE_SEP = '***';

export function makeId(projectName: string, raw: string): string {
  // Simple stable hash: project + raw text
  let hash = 0;
  const str = projectName + '::' + raw;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function parseKanbanFile(
  content: string,
  filePath: string,
  projectName: string
): ParsedKanban {
  const lines = content.split('\n');
  const columns = new Map<string, KanbanCard[]>();
  const columnOrder: string[] = [];

  let inFrontmatter = false;
  let frontmatterDone = false;
  let frontmatterCount = 0;
  let currentColumn: string | null = null;
  let inSettings = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- Frontmatter handling ---
    if (!frontmatterDone) {
      if (trimmed === FRONTMATTER_DELIM) {
        frontmatterCount++;
        inFrontmatter = frontmatterCount === 1;
        if (frontmatterCount === 2) {
          frontmatterDone = true;
          inFrontmatter = false;
        }
        continue;
      }
      if (inFrontmatter) continue;
    }

    // --- Settings footer ---
    if (trimmed.startsWith(SETTINGS_START)) {
      inSettings = true;
    }
    if (inSettings) continue;

    // --- Archive separator (***) — still parse the archive column ---
    if (trimmed === ARCHIVE_SEP) continue;

    // --- Column heading ---
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      currentColumn = headingMatch[1].trim();
      if (!columns.has(currentColumn)) {
        columns.set(currentColumn, []);
        columnOrder.push(currentColumn);
      }
      continue;
    }

    // --- Task item ---
    if (currentColumn) {
      const taskMatch = trimmed.match(TASK_RE);
      if (taskMatch) {
        const checkChar = taskMatch[1];
        const text = taskMatch[2];
        const raw = `- [${checkChar}] ${text}`;
        const card: KanbanCard = {
          id: makeId(projectName, raw),
          raw,
          text,
          checked: checkChar !== ' ',
          checkChar,
          lineIndex: i,
        };
        columns.get(currentColumn)!.push(card);
      }
    }
  }

  return { filePath, projectName, columns, columnOrder };
}
