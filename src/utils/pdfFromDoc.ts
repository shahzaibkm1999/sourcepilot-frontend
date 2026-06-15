/**
 * pdfFromDoc
 * ----------
 * Convert a `StructuredDoc` + project + document metadata into a
 * pdfmake `TDocumentDefinitions` that the runtime can render.
 *
 * The on-screen React viewer (`StructuredBody`, `CoverPage`,
 * `TableOfContents`, `SignOffBlock`) and this PDF renderer share the
 * same source markdown and the same `parseStructuredDoc()` parser.
 * That means chapter numbers, numerals, and the block order are
 * always in sync between the two surfaces.
 *
 * Visual choices — "premium corporate editorial":
 *   - A4 page, generous editorial margins (A4 print convention).
 *   - Spectral for display + chapter titles + drop caps + quotes.
 *   - IBM Plex Sans for body, IBM Plex Mono for eyebrows / meta.
 *   - Navy primary, warm gold secondary, paper white surface.
 *   - Drop cap on the first paragraph of each chapter is implemented
 *     as a two-column layout (pdfmake has no `::first-letter` support).
 *   - Callouts use a gold-tinted background + a left gold rule.
 *   - Cover page: large italic title, kicker meta block, gold
 *     corner accent on the rule.
 *   - TOC: a hairline rule above and below, dotted leaders, small
 *     mono "01" kickers per row.
 *   - Chapter headers: small "01" pill in gold + italic title.
 *   - Footer on every page: project name on the left, "Page N of M"
 *     on the right, separated by a hairline rule.
 *   - Sign-off: heavy black rule + gold corner accent + tight meta
 *     grid.
 */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Project, ProjectDocument } from '../types';
import type { DocBlock, StructuredDoc } from './structuredDoc';
import { parseStructuredDoc } from './structuredDoc';
import { docTypeLabel } from './audience';

// --- Palette. Mirrors the CSS custom properties in styles/index.css
//     so the PDF reads as the same brand as the on-screen viewer.
const COLOR = {
  ink: '#0c111c',
  inkMuted: '#4a5266',
  inkSubtle: '#8b8f9a',
  accent: '#0b2545',
  accentSoft: '#e6ecf5',
  gold: '#a07836',
  goldSoft: '#f5eddc',
  paper: '#ffffff',
  border: '#e4e2da',
  rule: '#ece9e0',
} as const;

const FONT = {
  display: 'Spectral',
  body: 'IBMPlexSans',
  mono: 'IBMPlexMono',
} as const;

const PAGE = {
  size: 'A4' as const,
  // A4 = 595 x 842 pt
  width: 595.28,
  height: 841.89,
  marginTop: 64,
  marginBottom: 72,
  marginLeft: 64,
  marginRight: 64,
};

export interface ExportInputs {
  markdown: string;
  project: Project;
  doc: ProjectDocument;
}

/**
 * Build the pdfmake document definition for a `ProjectDocument`.
 *
 * The output covers: cover page, table of contents, all body
 * chapters (with drop caps on the first paragraph of each), and a
 * closing sign-off block. Headers and footers are added by the
 * doc-definition level (footer on every page; no header because the
 * cover and TOC speak for themselves).
 */
export function buildPdfDocDefinition({
  markdown,
  project,
  doc,
}: ExportInputs): TDocumentDefinitions {
  const structured = parseStructuredDoc(markdown);
  const title = stripH1(markdown) ?? project.name;

  // Build the content stream as a flat list of nodes. Each helper
  // returns `Content[]`; we concatenate and then flatten to handle
  // the page-break separators without nested arrays confusing the
  // type inference.
  const content: Content[] = [
    ...coverPageContent({ project, doc, title }),
    pageBreak(),
    ...tocContent({ structured }),
    pageBreak(),
    ...chaptersContent({ structured }),
    ...signOffContent({ project, doc }),
  ];

  return {
    pageSize: PAGE.size,
    pageMargins: [
      PAGE.marginLeft,
      PAGE.marginTop,
      PAGE.marginRight,
      PAGE.marginBottom,
    ],
    defaultStyle: {
      font: FONT.body,
      fontSize: 10.5,
      lineHeight: 1.5,
      color: COLOR.ink,
    },
    styles: pdfStyles(),
    footer: footerContent({ project }),
    content,
    info: {
      title: `${project.name} — ${docTypeLabel(doc.doc_type)}`,
      author: 'SourcePilot',
      subject: docTypeLabel(doc.doc_type),
      creator: 'SourcePilot PDF export',
    },
  };
}

function pdfStyles() {
  return {
    // --- Cover page ---
    eyebrow: {
      font: FONT.mono,
      fontSize: 8.5,
      characterSpacing: 0.6,
      color: COLOR.inkSubtle,
    },
    coverBrand: {
      font: FONT.display,
      fontSize: 11,
      italics: false,
      bold: true,
      color: COLOR.ink,
    },
    coverDocPill: {
      font: FONT.mono,
      fontSize: 8,
      characterSpacing: 0.5,
      color: COLOR.inkSubtle,
    },
    coverTitle: {
      font: FONT.display,
      fontSize: 42,
      italics: true,
      color: COLOR.ink,
      lineHeight: 1.02,
    },
    coverClientLabel: {
      font: FONT.mono,
      fontSize: 8.5,
      characterSpacing: 0.5,
      color: COLOR.inkSubtle,
    },
    coverClientName: {
      font: FONT.display,
      fontSize: 15,
      italics: true,
      color: COLOR.inkMuted,
    },
    metaLabel: {
      font: FONT.mono,
      fontSize: 8,
      characterSpacing: 0.5,
      color: COLOR.inkSubtle,
    },
    metaValue: {
      font: FONT.body,
      fontSize: 10,
      color: COLOR.ink,
      bold: false,
    },

    // --- Table of contents ---
    tocLabel: {
      font: FONT.mono,
      fontSize: 9,
      characterSpacing: 0.6,
      color: COLOR.inkMuted,
    },
    tocNumeral: {
      font: FONT.mono,
      fontSize: 8,
      bold: true,
      color: COLOR.gold,
    },
    tocText: {
      font: FONT.display,
      fontSize: 12,
      italics: true,
      color: COLOR.ink,
    },
    tocPage: {
      font: FONT.mono,
      fontSize: 8.5,
      color: COLOR.inkSubtle,
    },

    // --- Chapter header ---
    chapterKicker: {
      font: FONT.mono,
      fontSize: 8,
      bold: true,
      characterSpacing: 0.6,
      color: COLOR.gold,
    },
    chapterNumber: {
      font: FONT.mono,
      fontSize: 7.5,
      characterSpacing: 0.5,
      color: COLOR.inkSubtle,
    },
    chapterTitle: {
      font: FONT.display,
      fontSize: 24,
      italics: true,
      color: COLOR.ink,
      lineHeight: 1.1,
    },

    // --- Body ---
    body: {
      font: FONT.body,
      fontSize: 10.5,
      lineHeight: 1.6,
      color: COLOR.ink,
    },
    leadBody: {
      font: FONT.body,
      fontSize: 11,
      lineHeight: 1.6,
      color: COLOR.ink,
    },
    dropCap: {
      font: FONT.display,
      fontSize: 56,
      italics: true,
      bold: true,
      color: COLOR.accent,
      lineHeight: 0.88,
    },
    h3: {
      font: FONT.display,
      fontSize: 14,
      italics: true,
      bold: true,
      color: COLOR.ink,
    },
    h4: {
      font: FONT.body,
      fontSize: 9,
      bold: true,
      characterSpacing: 0.6,
      color: COLOR.inkMuted,
    },
    listItem: {
      font: FONT.body,
      fontSize: 10.5,
      lineHeight: 1.55,
      color: COLOR.ink,
    },
    tableHeader: {
      font: FONT.mono,
      fontSize: 8,
      bold: true,
      characterSpacing: 0.5,
      color: COLOR.inkMuted,
      fillColor: COLOR.paper,
    },
    tableHeaderFill: {
      fillColor: '#f6f5f1',
    },
    tableCell: {
      font: FONT.body,
      fontSize: 9.5,
      lineHeight: 1.4,
      color: COLOR.ink,
    },
    calloutMark: {
      font: FONT.display,
      fontSize: 28,
      italics: true,
      color: COLOR.gold,
      lineHeight: 0.7,
      margin: [0, -8, 0, 0],
    },
    calloutBody: {
      font: FONT.display,
      fontSize: 11.5,
      italics: true,
      lineHeight: 1.55,
      color: COLOR.ink,
    },
    strong: {
      bold: true,
    },
    em: {
      italics: true,
    },
    codeInline: {
      font: FONT.mono,
      fontSize: 9.5,
      color: COLOR.ink,
    },

    // --- Sign-off / footer ---
    signOffHeadline: {
      font: FONT.display,
      fontSize: 22,
      italics: true,
      color: COLOR.ink,
    },
    signOffBody: {
      font: FONT.display,
      fontSize: 11,
      italics: true,
      lineHeight: 1.55,
      color: COLOR.inkMuted,
    },
    footerText: {
      font: FONT.mono,
      fontSize: 7.5,
      characterSpacing: 0.5,
      color: COLOR.inkSubtle,
    },
  };
}

// ============================================================
// Section builders
// ============================================================

/**
 * Two-digit arabic kicker (01, 02, 03, …). Kept as a small helper
 * because both the on-screen viewer and the PDF use it.
 */
function kicker(n: number): string {
  return String(n).padStart(2, '0');
}

function coverPageContent({
  project,
  doc,
  title,
}: {
  project: Project;
  doc: ProjectDocument;
  title: string;
}): Content[] {
  const dateLong = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const audienceLabel =
    project.audience === 'tecnico' ? 'Technical' : 'Non-Technical';

  return [
    // Vertical breathing room above the eyebrow so the cover page has
    // an intentional top margin.
    { text: '', margin: [0, 120, 0, 0] },

    // Brand row — small SourcePilot wordmark on the left, doc type
    // pill on the right. Two-column layout to mirror the on-screen
    // cover.
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: [
                { text: '◎ ', style: 'coverBrand', color: COLOR.gold },
                { text: 'SourcePilot', style: 'coverBrand' },
              ] as unknown as string,
            },
          ],
        },
        {
          width: 'auto',
          stack: [
            {
              text: docTypeLabel(doc.doc_type).toUpperCase(),
              style: 'coverDocPill',
            },
          ],
          alignment: 'right',
        },
      ],
      columnGap: 8,
    },

    // Project title — display serif, italic, large.
    {
      text: title,
      style: 'coverTitle',
      margin: [0, 64, 0, 0],
    },

    // Optional client name, treated as a subtitle.
    project.client_name
      ? {
          text: [
            { text: 'Prepared for  ', style: 'coverClientLabel' },
            { text: project.client_name, style: 'coverClientName' },
          ],
          margin: [0, 16, 0, 0],
        }
      : { text: '', margin: [0, 0, 0, 0] },

    // Accent rule: black + small gold corner accent.
    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 64,
          h: 2,
          color: COLOR.ink,
        },
        {
          type: 'rect',
          x: 64,
          y: 0,
          w: 16,
          h: 2,
          color: COLOR.gold,
        },
      ],
      margin: [0, 36, 0, 0],
    },

    // Meta dl: project type, audience, version/date.
    {
      margin: [0, 28, 0, 0],
      table: {
        widths: ['auto', '*'],
        body: [
          ...(project.project_type
            ? [
                [
                  { text: 'Project type', style: 'metaLabel' },
                  { text: project.project_type, style: 'metaValue' },
                ],
              ]
            : []),
          [
            { text: 'Audience', style: 'metaLabel' },
            { text: audienceLabel, style: 'metaValue' },
          ],
          [
            { text: 'Issued', style: 'metaLabel' },
            { text: dateLong, style: 'metaValue' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hPaddingBefore: 0,
        hPaddingAfter: 8,
        vPaddingBefore: 0,
        vPaddingAfter: 0,
      },
    },
  ];
}

function tocContent({ structured }: { structured: StructuredDoc }): Content[] {
  if (structured.chapters.length === 0) return [];

  return [
    { text: 'Contents', style: 'tocLabel', margin: [0, 0, 0, 18] },

    ...structured.chapters.flatMap((chapter) => {
      const row: Content = {
        margin: [0, 0, 0, 8],
        columns: [
          {
            width: 32,
            // Arabic kicker pill (01, 02, …) — mirrors the
            // on-screen chapter header pill.
            stack: [
              {
                table: {
                  widths: [32],
                  body: [
                    [
                      {
                        text: kicker(chapter.number),
                        style: 'tocNumeral',
                        alignment: 'center',
                        margin: [0, 2, 0, 2],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineColor: () => '#d6c594',
                  vLineColor: () => '#d6c594',
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hPaddingBefore: () => 0,
                  hPaddingAfter: () => 0,
                  vPaddingBefore: () => 0,
                  vPaddingAfter: () => 0,
                },
              },
            ],
          },
          {
            width: '*',
            text: chapter.title,
            style: 'tocText',
            margin: [0, 4, 0, 0],
          },
          {
            width: 48,
            text: '',
            // Dotted leaders: a canvas of small dots stretched to fill.
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 6,
                x2: 48,
                y2: 6,
                lineWidth: 0.5,
                lineColor: COLOR.rule,
                dash: { length: 1, space: 2 },
              },
            ],
          },
          {
            width: 28,
            text: `p. ${chapter.number}`,
            style: 'tocPage',
            alignment: 'right',
            margin: [0, 4, 0, 0],
          },
        ],
        columnGap: 10,
      };
      return [row];
    }),
  ];
}

function chaptersContent({ structured }: { structured: StructuredDoc }): Content[] {
  return structured.chapters.flatMap((chapter, idx) =>
    chapterContent({ chapter, structured, isFirst: idx === 0 }),
  );
}

function chapterContent({
  chapter,
  isFirst,
}: {
  chapter: StructuredDoc['chapters'][number];
  structured: StructuredDoc;
  isFirst: boolean;
}): Content[] {
  const firstParagraphIdx = chapter.blocks.findIndex(
    (b) => b.kind === 'paragraph',
  );

  return [
    // Spacing above the chapter (less for the very first chapter on
    // the page, more for subsequent ones).
    { text: '', margin: [0, isFirst ? 0 : 36, 0, 0] },

    // Chapter header: kicker pill on the left, italic title on the
    // right. The kicker is a bordered cell so it reads as a small
    // "badge" even in print.
    {
      columns: [
        {
          width: 36,
          stack: [
            {
              table: {
                widths: [36],
                body: [
                  [
                    {
                      text: kicker(chapter.number),
                      style: 'chapterKicker',
                      alignment: 'center',
                      margin: [0, 4, 0, 4],
                    },
                  ],
                ],
              },
              layout: {
                hLineColor: () => '#d6c594',
                vLineColor: () => '#d6c594',
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hPaddingBefore: () => 0,
                hPaddingAfter: () => 0,
                vPaddingBefore: () => 0,
                vPaddingAfter: () => 0,
              },
            },
          ],
        },
        {
          width: '*',
          text: chapter.title,
          style: 'chapterTitle',
          margin: [0, 2, 0, 0],
        },
      ],
      columnGap: 14,
    },

    // Accent rule under the chapter header — black with a small
    // gold corner accent on the right.
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 467,
          y2: 0,
          lineWidth: 1,
          lineColor: COLOR.ink,
        },
        {
          type: 'rect',
          x: 455,
          y: -1,
          w: 12,
          h: 3,
          color: COLOR.gold,
        },
      ],
      margin: [0, 10, 0, 0],
    },

    // Body blocks
    ...chapter.blocks.flatMap((block, blockIdx) =>
      blockToContent(block, {
        isLeadParagraph:
          blockIdx === firstParagraphIdx &&
          firstParagraphIdx !== -1 &&
          block.kind === 'paragraph',
      }),
    ),
  ];
}

function blockToContent(block: DocBlock, opts: { isLeadParagraph: boolean }): Content[] {
  switch (block.kind) {
    case 'paragraph': {
      const inline = renderInlineText(block.text);
      if (opts.isLeadParagraph) {
        return [dropCapParagraph(inline)];
      }
      return [{ text: asPdfText(inline), style: 'body', margin: [0, 0, 0, 10] }];
    }
    case 'unordered-list':
      return [
        {
          ul: block.items.map((item) => ({
            text: asPdfText(renderInlineText(item)),
            style: 'listItem',
          })),
          margin: [0, 0, 0, 12],
        },
      ];
    case 'ordered-list':
      return [
        {
          ol: block.items.map((item) => ({
            text: asPdfText(renderInlineText(item)),
            style: 'listItem',
          })),
          margin: [0, 0, 0, 12],
        },
      ];
    case 'callout':
      return [calloutBlock(block.text)];
    case 'subheading':
      return [
        {
          text: asPdfText(renderInlineText(block.text)),
          style: block.level === 3 ? 'h3' : 'h4',
          margin: [0, 16, 0, 6],
        },
      ];
    case 'table':
      return [tableBlock(block)];
  }
}

/**
 * Render a markdown table as a pdfmake `table` content node.
 *
 * Premium treatment: hairline borders only on outer + header
 * bottom, a faint paper-tinted header row, mono small-caps header
 * text, body cells in body serif. Per-column alignment from the
 * markdown source is honoured.
 */
function tableBlock(block: Extract<DocBlock, { kind: 'table' }>): Content {
  const align = block.align;
  const cellAlign = (col: number): 'left' | 'center' | 'right' =>
    align?.[col] ?? 'left';

  const headerRow = block.header.map((cell, ci) => ({
    text: asPdfText(renderInlineText(cell)),
    style: 'tableHeader',
    alignment: cellAlign(ci),
    fillColor: '#f6f5f1',
  }));

  const bodyRows = block.rows.map((row) =>
    row.map((cell, ci) => ({
      text: asPdfText(renderInlineText(cell)),
      style: 'tableCell',
      alignment: cellAlign(ci),
    })),
  );

  return {
    table: {
      headerRows: 1,
      widths: Array.from({ length: block.header.length }, () => 'auto'),
      body: [headerRow, ...bodyRows],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#d8d4c4',
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
    margin: [0, 4, 0, 14],
  };
}

/**
 * Render a lead paragraph as a two-column layout: the first character
 * (or first run of the first word) sits in a narrow column as a
 * large display drop cap, the rest of the paragraph flows in the
 * wider right column.
 */
function dropCapParagraph(inline: RenderedInline): Content {
  const { dropCap, rest } = extractDropCap(inline);
  return {
    columns: [
      {
        width: 60,
        margin: [0, 6, 0, 0],
        text: dropCap,
        style: 'dropCap',
      },
      {
        width: '*',
        text: rest,
        style: 'leadBody',
      },
    ],
    columnGap: 10,
    margin: [0, 0, 0, 12],
  };
}

function calloutBlock(text: string): Content {
  // A 2-column table: thin gold column for the left rule, the
  // pull-quote text in the wide right column. The right cell has a
  // gold tint to read as a "callout" without a heavy border.
  return {
    table: {
      widths: [3, '*'],
      body: [
        [
          { text: '', fillColor: COLOR.gold, border: [false, false, false, false] },
          {
            stack: [
              { text: '“', style: 'calloutMark' },
              { text: asPdfText(renderInlineText(text)), style: 'calloutBody' },
            ],
            fillColor: COLOR.goldSoft,
            margin: [12, 8, 12, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      hPaddingBefore: 0,
      hPaddingAfter: 0,
      vPaddingBefore: 0,
      vPaddingAfter: 0,
    },
    margin: [0, 4, 0, 12],
  };
}

function footerContent({ project }: { project: Project }): (currentPage: number, pageCount: number) => Content {
  // Three columns: project name on the left, spacer, page number on
  // the right. The thin top rule is drawn by the canvas cell, with
  // a small gold corner accent.
  return (currentPage, pageCount) => ({
    margin: [PAGE.marginLeft, 24, PAGE.marginRight, 0],
    stack: [
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: PAGE.width - PAGE.marginLeft - PAGE.marginRight,
            y2: 0,
            lineWidth: 0.5,
            lineColor: COLOR.rule,
          },
          {
            type: 'rect',
            x: PAGE.width - PAGE.marginLeft - PAGE.marginRight - 12,
            y: -1,
            w: 12,
            h: 2,
            color: COLOR.gold,
          },
        ],
      },
      {
        margin: [0, 6, 0, 0],
        columns: [
          {
            width: '*',
            text: project.name,
            style: 'footerText',
          },
          {
            width: 'auto',
            text: `Page ${currentPage} of ${pageCount}`,
            style: 'footerText',
            alignment: 'right',
          },
        ],
        columnGap: 16,
      },
    ],
  });
}

function signOffContent({
  project,
  doc,
}: {
  project: Project;
  doc: ProjectDocument;
}): Content[] {
  const dateLong = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return [
    { text: '', margin: [0, 56, 0, 0] },
    // Heavy black rule + gold corner accent at top of sign-off
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 467,
          y2: 0,
          lineWidth: 2,
          lineColor: COLOR.ink,
        },
        {
          type: 'rect',
          x: 443,
          y: -1,
          w: 24,
          h: 6,
          color: COLOR.gold,
        },
      ],
    },
    { text: 'Ready to proceed?', style: 'signOffHeadline', margin: [0, 20, 0, 6] },
    {
      text: `This ${docTypeLabel(doc.doc_type).toLowerCase()} is ready for review. Reply with any questions, requested changes, or a confirmation to begin.`,
      style: 'signOffBody',
      margin: [0, 0, 0, 24],
    },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [
            { text: 'Project', style: 'metaLabel' },
            { text: project.name, style: 'metaValue' },
          ],
          ...(project.client_name
            ? [
                [
                  { text: 'Prepared for', style: 'metaLabel' },
                  { text: project.client_name, style: 'metaValue' },
                ],
              ]
            : []),
          [
            { text: 'Issued', style: 'metaLabel' },
            { text: dateLong, style: 'metaValue' },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hPaddingBefore: 0,
        hPaddingAfter: 8,
        vPaddingBefore: 0,
        vPaddingAfter: 0,
      },
    },
  ];
}

// ============================================================
// Inline markdown rendering
// ============================================================

/**
 * A flat inline span — either a plain string, or a styled text node.
 * We use a narrow internal type (not the full pdfmake `Content`
 * union) so TypeScript can narrow inside helpers like
 * `extractDropCap` without a string of `'text' in x` guards.
 */
type InlineContent = string | { text: string; style?: string };

/**
 * The shape that `renderInlineText` returns. pdfmake's `TextContent`
 * accepts `text: string | Content[]`, so this maps cleanly: a
 * string drops in as `text: string`, an array of `InlineContent`
 * drops in as `text: Content[]` (each `InlineContent` is a valid
 * `Content`).
 */
type RenderedInline = string | InlineContent[];

/**
 * Convert inline markdown (`**bold**`, `*italic*`, `` `code` ``) to
 * pdfmake content. Returns a string for the simple case (no inline
 * formatting) or a `TextContent` whose `text` is an array of inline
 * spans.
 */
function renderInlineText(text: string): RenderedInline {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const parts: InlineContent[] = [];

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const tok = match[0];
    if (tok.startsWith('**')) {
      parts.push({ text: tok.slice(2, -2), style: 'strong' });
    } else if (tok.startsWith('*')) {
      parts.push({ text: tok.slice(1, -1), style: 'em' });
    } else if (tok.startsWith('`')) {
      parts.push({ text: tok.slice(1, -1), style: 'codeInline' });
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) {
    const only = parts[0];
    if (typeof only === 'string') return only;
  }
  return parts;
}

/**
 * Convert the internal `RenderedInline` shape to the value pdfmake
 * expects in a `text:` field. The cast is safe: every `InlineContent`
 * is a valid pdfmake `Content` (a string is a `Content`; an
 * `{ text, style? }` is structurally a `TextContent`).
 */
function asPdfText(inline: RenderedInline): string | Content[] {
  if (typeof inline === 'string') return inline;
  return inline as unknown as Content[];
}

/**
 * Take a rendered inline content and split it into a single-character
 * drop cap and the rest. If the input is a plain string, the first
 * character goes into the cap and the remainder stays in the body.
 * If it's an array of spans, the first character of the first span
 * goes into the cap and the rest of the array stays intact. If the
 * first span is styled, the style is preserved on the remainder.
 */
function extractDropCap(inline: RenderedInline): { dropCap: string; rest: RenderedInline } {
  if (typeof inline === 'string') {
    if (inline.length === 0) return { dropCap: '', rest: '' };
    return {
      dropCap: inline.charAt(0).toUpperCase(),
      rest: inline.slice(1),
    };
  }
  if (inline.length === 0) {
    return { dropCap: '', rest: '' };
  }
  const first = inline[0];
  const tail = inline.slice(1);
  if (typeof first === 'string') {
    if (first.length === 0) {
      // Skip the empty leading span; recurse on the rest.
      return extractDropCap(tail);
    }
    const cap = first.charAt(0).toUpperCase();
    const remaining = first.slice(1);
    if (!remaining) {
      return { dropCap: cap, rest: tail };
    }
    return {
      dropCap: cap,
      rest: [remaining, ...tail],
    };
  }
  // First span is styled — keep its style on the remainder.
  if (first.text.length === 0) {
    return extractDropCap(tail);
  }
  const cap = first.text.charAt(0).toUpperCase();
  const remainingText = first.text.slice(1);
  if (!remainingText) {
    return { dropCap: cap, rest: tail };
  }
  const restHead: InlineContent = { text: remainingText, ...(first.style ? { style: first.style } : {}) };
  return {
    dropCap: cap,
    rest: [restHead, ...tail],
  };
}

// ============================================================
// Small helpers
// ============================================================

function pageBreak(): Content {
  return { text: '', pageBreak: 'after' };
}

function stripH1(markdown: string): string | null {
  const m = /^#\s+(.+?)\s*$/m.exec(markdown);
  return m ? m[1].trim() : null;
}
