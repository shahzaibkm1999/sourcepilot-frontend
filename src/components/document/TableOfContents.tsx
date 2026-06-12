import { useMemo } from 'react';
import { parseStructuredDoc } from '../../utils/structuredDoc';
import '../../styles/table-of-contents.css';

interface TableOfContentsProps {
  /** Markdown source. We re-parse it to align the TOC entries
   *  with the chapter numbers rendered in the body. */
  markdown: string;
}

/**
 * TableOfContents
 * ---------------
 * Renders a TOC for the document. We re-parse the markdown to
 * align the TOC numerals with the chapter numbers in the body.
 *
 * Editorial style: small mono "§ Contents" label, dotted leaders
 * to the section number, italic roman numerals. Renders nothing
 * if there are no chapters.
 *
 * Renders INSIDE the article so the PDF export snapshots it
 * together with the cover page and body — clients get a
 * printed-style TOC on the exported PDF.
 */
export default function TableOfContents({ markdown }: TableOfContentsProps) {
  const doc = useMemo(() => parseStructuredDoc(markdown), [markdown]);

  if (doc.chapters.length === 0) return null;

  return (
    <section className="toc" aria-label="Table of contents">
      <div className="toc-label">§ Contents</div>
      <ol className="toc-list">
        {doc.chapters.map((chapter) => (
          <li
            key={`${chapter.number}-${chapter.title}`}
            className="toc-item"
          >
            <span className="toc-numeral">{doc.numerals[chapter.number - 1]}</span>
            <span className="toc-text">{chapter.title}</span>
            <span className="toc-leader" aria-hidden="true" />
            <span className="toc-number">p. {chapter.number}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
