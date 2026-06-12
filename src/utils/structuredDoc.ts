/**
 * structuredDoc
 * -------------
 * Parse a markdown source into a structured document model. The
 * model is what the React viewer renders — chapters with numbers
 * and blocks of paragraphs, lists, tables, and callouts. This is
 * what makes the on-screen viewer feel like a finished proposal
 * document instead of a raw readme.
 *
 * Markdown conventions the AI uses (and that we recognise):
 *   - `# Title` — document title (used by CoverPage, not here)
 *   - `## Section Heading` — a "chapter" of the proposal
 *   - `### Subsection` — a sub-block within a chapter
 *   - `#### Minor heading` — a small label
 *   - `- item` / `1. item` — lists
 *   - `| col | col |` + `| --- | --- |` + `| val | val |` — table
 *   - `> Quote` — callout / pull quote
 *   - `---` — divider (skipped — chapters are the dividers)
 *   - plain paragraphs
 */

export type DocBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'unordered-list'; items: string[] }
  | { kind: 'ordered-list'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][]; align?: ('left' | 'center' | 'right')[] }
  | { kind: 'callout'; text: string }
  | { kind: 'subheading'; level: 3 | 4; text: string };

export interface DocChapter {
  number: number; // 1-based; the "Chapter N" prefix
  title: string;
  blocks: DocBlock[];
}

export interface StructuredDoc {
  chapters: DocChapter[];
  /** Roman-numeral labels per chapter (I, II, III, IV, V, ...) */
  numerals: string[];
}

/**
 * Parse the markdown source into a structured document model.
 * Skips the leading `# Title` (handled by the CoverPage) and
 * splits the rest on `## ` boundaries.
 */
export function parseStructuredDoc(md: string): StructuredDoc {
  const lines = md.split(/\r?\n/);

  const chapters: DocChapter[] = [];
  let current: DocChapter | null = null;
  let i = 0;

  // Skip the leading H1 if present (CoverPage owns it).
  if (lines[0] && /^#\s+/.test(lines[0])) {
    i = 1;
    // Skip blank line after the H1 if any.
    while (i < lines.length && lines[i].trim() === '') i += 1;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule — chapter boundary visual element. We treat
    // it as a no-op since the chapter structure already provides
    // the visual break.
    if (/^-{3,}\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // Chapter heading: ## Title
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      if (current) chapters.push(current);
      current = { number: chapters.length + 1, title: h2[1].trim(), blocks: [] };
      i += 1;
      continue;
    }

    // Without a chapter context, collect any leading content into
    // an implicit "Overview" chapter so we never lose paragraphs.
    if (!current) {
      current = { number: 1, title: 'Overview', blocks: [] };
    }

    // Markdown table: a header line of `| col | col |`, a separator
    // line of `| --- | --- |` (the canonical indicator), then any
    // number of `| val | val |` data rows. Without the separator the
    // markdown is just a paragraph with pipes in it — leave it alone.
    //
    // We detect the table by recognising a HEADER line: the current
    // line has pipes AND the next line is a separator. Then we look
    // FORWARD past the separator to collect data rows. The separator
    // may optionally use `:---` (left), `---:` (right), or `:---:`
    // (center) alignment markers; we capture and forward those so
    // the renderer can honour them.
    //
    // Detection is structural: split the candidate separator into
    // cells (by `|`) and check that every cell looks like a separator
    // cell — `:?` + at least three dashes + `:?`, optional whitespace.
    // A regex on the whole line is brittle (the trailing `|?` greedy
    // match swallowed the last cell in earlier attempts). This works
    // for any column count and any alignment combination.
    if (i + 1 < lines.length && line.includes('|') && isTableSeparator(lines[i + 1])) {
      const headerCells = splitTableRow(line);
      if (headerCells) {
        // Skip the header (i) and the separator (i+1), then collect
        // data rows until a non-`|` line or blank.
        const separatorLine = lines[i + 1];
        const dataRows: string[][] = [];
        i = i + 2;
        while (i < lines.length) {
          const rowLine = lines[i];
          if (rowLine.trim() === '') break;
          const cells = splitTableRow(rowLine);
          if (!cells) break;
          dataRows.push(cells);
          i += 1;
        }
        const align = parseAlignments(separatorLine);
        current.blocks.push({
          kind: 'table',
          header: headerCells,
          rows: dataRows,
          align,
        });
        continue;
      }
    }

    // Subheading: ### or ####
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      current.blocks.push({ kind: 'subheading', level: 3, text: h3[1].trim() });
      i += 1;
      continue;
    }
    const h4 = /^####\s+(.*)$/.exec(line);
    if (h4) {
      current.blocks.push({ kind: 'subheading', level: 4, text: h4[1].trim() });
      i += 1;
      continue;
    }

    // Callout / blockquote: > text
    if (/^>\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^>\s+/, ''));
        i += 1;
      }
      current.blocks.push({ kind: 'callout', text: items.join(' ') });
      continue;
    }

    // Unordered list
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''));
        i += 1;
      }
      current.blocks.push({ kind: 'unordered-list', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      current.blocks.push({ kind: 'ordered-list', items });
      continue;
    }

    // Blank line: skip
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph: collect contiguous non-blank, non-block lines. A
    // table header (`| col | col |` followed by `| --- | --- |`) or a
    // table separator line is a block boundary — we let the next
    // iteration (or this one) detect and emit the table block.
    // Otherwise the separator would be appended to the running
    // paragraph AND the table would be emitted as a separate block,
    // duplicating the content.
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^>\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^-{3,}\s*$/.test(lines[i]) &&
      // Stop at a table separator (`| --- | --- |`).
      !isTableSeparator(lines[i]) &&
      // Stop at a table header (the next line is a separator).
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      )
    ) {
      para.push(lines[i]);
      i += 1;
    }
    current.blocks.push({ kind: 'paragraph', text: para.join(' ') });
  }

  if (current) chapters.push(current);

  return {
    chapters,
    numerals: chapters.map((_, idx) => toRoman(idx + 1)),
  };
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  let remaining = n;
  for (const [value, symbol] of map) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result || 'I';
}

/**
 * True if `line` looks like a markdown table separator — e.g.
 * `| --- | --- |` or `| :--- | ---: | :---: |`. A separator cell is
 * `:?` + three-or-more dashes + `:?`, optional whitespace. At least
 * two cells are required (a single dash doesn't count as a table).
 *
 * We don't try to match this with a single regex on the whole line:
 * the `\|?` at the end greedily consumed the last cell in earlier
 * attempts, hiding the bug for 2-cell lines and breaking on 3+.
 * Splitting first and validating per cell is robust to any column
 * count and any alignment combination.
 */
function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  if (!cells || cells.length < 2) return false;
  return cells.every((c) => /^\s*:?-{3,}:?\s*$/.test(c));
}

/**
 * Split a markdown table row (`| a | b | c |` or `a | b | c`) into
 * an array of cell strings. Returns null if the line doesn't look
 * like a table row (no pipes).
 *
 * Cells are trimmed of surrounding whitespace. Empty cells (e.g.
 * `| a |  | b |`) come through as empty strings — not nulls — so
 * the column count stays consistent across rows.
 */
function splitTableRow(line: string): string[] | null {
  if (!line.includes('|')) return null;
  // Strip a single leading and trailing pipe (the canonical form) but
  // allow `a | b | c` (no surrounding pipes) by not requiring them.
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/**
 * Read the per-column alignment markers from a markdown table
 * separator line. `:---` is left, `---:` is right, `:---:` is
 * center, `---` (no colons) is default-left.
 *
 * Returns an array of `'left' | 'center' | 'right'` matching the
 * header column count, or undefined if no alignment markers are
 * present (the renderer can fall back to all-left).
 */
function parseAlignments(separator: string): ('left' | 'center' | 'right')[] | undefined {
  const cells = splitTableRow(separator);
  if (!cells) return undefined;
  let anyMarker = false;
  const result = cells.map((c) => {
    const hasLeft = c.startsWith(':');
    const hasRight = c.endsWith(':');
    if (!hasLeft && !hasRight) return 'left' as const;
    anyMarker = true;
    if (hasLeft && hasRight) return 'center' as const;
    if (hasRight) return 'right' as const;
    return 'left' as const;
  });
  return anyMarker ? result : undefined;
}
