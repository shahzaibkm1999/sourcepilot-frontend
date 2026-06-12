/**
 * structuredDoc
 * -------------
 * Parse a markdown source into a structured document model. The
 * model is what the React viewer renders — chapters with numbers
 * and blocks of paragraphs, lists, and callouts. This is what
 * makes the on-screen viewer feel like a finished proposal
 * document instead of a raw readme.
 *
 * Markdown conventions the AI uses (and that we recognise):
 *   - `# Title` — document title (used by CoverPage, not here)
 *   - `## Section Heading` — a "chapter" of the proposal
 *   - `### Subsection` — a sub-block within a chapter
 *   - `#### Minor heading` — a small label
 *   - `- item` / `1. item` — lists
 *   - `> Quote` — callout / pull quote
 *   - `---` — divider (skipped — chapters are the dividers)
 *   - plain paragraphs
 */

export type DocBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'unordered-list'; items: string[] }
  | { kind: 'ordered-list'; items: string[] }
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

    // Paragraph: collect contiguous non-blank, non-block lines
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^>\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^-{3,}\s*$/.test(lines[i])
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
