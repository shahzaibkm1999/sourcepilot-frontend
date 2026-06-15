import { useMemo } from 'react';
import { DocBlock, parseStructuredDoc } from '../../utils/structuredDoc';
import { renderMarkdownInline } from '../../utils/markdown';
import '../../styles/structured-body.css';

interface StructuredBodyProps {
  markdown: string;
}

/**
 * StructuredBody
 * --------------
 * Renders a document body as a sequence of chapters, each with
 * a chapter number, italic serif title, and a sequence of typed
 * blocks (paragraphs, lists, callouts, subheadings). The visual
 * treatment — accent rule under each chapter title, drop cap on
 * the first paragraph, boxed callouts for emphasis — is what
 * makes the on-screen article feel like a finished proposal
 * document instead of a markdown readme.
 */
export default function StructuredBody({ markdown }: StructuredBodyProps) {
  const doc = useMemo(() => parseStructuredDoc(markdown), [markdown]);

  if (doc.chapters.length === 0) {
    return null;
  }

  return (
    <div className="structured-body">
      {doc.chapters.map((chapter) => (
        <section
          key={`${chapter.number}-${chapter.title}`}
          className="chapter"
          aria-label={`Chapter ${doc.numerals[chapter.number - 1]}: ${chapter.title}`}
        >
          <ChapterHeader
            numeral={doc.numerals[chapter.number - 1]}
            number={chapter.number}
            title={chapter.title}
          />

          <div className="chapter-body">
            {chapter.blocks.map((block, idx) => (
              <BlockView
                key={idx}
                block={block}
                isFirstParagraph={
                  block.kind === 'paragraph' &&
                  !chapter.blocks.slice(0, idx).some(
                    (b) => b.kind === 'paragraph',
                  )
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChapterHeader({
  number,
  title,
}: {
  numeral: string;
  number: number;
  title: string;
}) {
  // Two-digit arabic kicker (01, 02, 03, …) — feels more like a
  // modern consulting deck and matches the body section labels used
  // on the rest of the app. The roman numeral is preserved in the
  // aria-label for AT users.
  const kicker = String(number).padStart(2, '0');
  return (
    <header className="chapter-header">
      <div className="chapter-header-meta">
        <span className="chapter-numeral">{kicker}</span>
        <span className="chapter-number">Chapter {kicker} of the proposal</span>
      </div>
      <h2 className="chapter-title">{title}</h2>
      <div className="chapter-rule" aria-hidden="true" />
    </header>
  );
}

function BlockView({
  block,
  isFirstParagraph,
}: {
  block: DocBlock;
  isFirstParagraph: boolean;
}) {
  switch (block.kind) {
    case 'paragraph': {
      const html = renderMarkdownInline(block.text);
      return (
        <p
          className={
            isFirstParagraph
              ? 'chapter-paragraph chapter-paragraph--lead'
              : 'chapter-paragraph'
          }
          // The markdown source comes from our own backend
          // (DeepSeek). renderMarkdownInline escapes input
          // before applying syntax.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case 'unordered-list':
      return (
        <ul className="chapter-list chapter-list--unordered">
          {block.items.map((item, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: renderMarkdownInline(item) }}
            />
          ))}
        </ul>
      );
    case 'ordered-list':
      return (
        <ol className="chapter-list chapter-list--ordered">
          {block.items.map((item, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: renderMarkdownInline(item) }}
            />
          ))}
        </ol>
      );
    case 'callout':
      return (
        <aside className="chapter-callout">
          <span className="chapter-callout-mark" aria-hidden="true">❝</span>
          <div
            className="chapter-callout-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(block.text) }}
          />
        </aside>
      );
    case 'subheading':
      return block.level === 3 ? (
        <h3
          className="chapter-h3"
          dangerouslySetInnerHTML={{ __html: renderMarkdownInline(block.text) }}
        />
      ) : (
        <h4
          className="chapter-h4"
          dangerouslySetInnerHTML={{ __html: renderMarkdownInline(block.text) }}
        />
      );
    case 'table':
      return <TableView block={block} />;
  }
}

/**
 * TableView
 * ---------
 * Renders a markdown table as a real <table>. The structured parser
 * has already split the source into a header row + N data rows +
 * optional per-column alignment, so this is pure layout.
 *
 * Editorial treatment: narrow borders, paper-tinted header row,
 * accent rule under the header, mono small-caps header text (matches
 * the chapter-meta eyebrow styling). Body cells use the same display
 * font as paragraphs.
 */
function TableView({ block }: { block: Extract<DocBlock, { kind: 'table' }> }) {
  return (
    <div className="chapter-table-wrap">
      <table className="chapter-table">
        <thead>
          <tr>
            {block.header.map((cell, ci) => (
              <th
                key={ci}
                style={block.align ? { textAlign: block.align[ci] } : undefined}
                dangerouslySetInnerHTML={{ __html: renderMarkdownInline(cell) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={block.align ? { textAlign: block.align[ci] } : undefined}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownInline(cell) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
