import { Heading } from '../../utils/headings';
import '../../styles/table-of-contents.css';

interface TableOfContentsProps {
  headings: Heading[];
}

/**
 * TableOfContents
 * ---------------
 * Renders a TOC for the document, derived from h1/h2 headings in
 * the markdown source. Editorial style: small mono "§ Contents"
 * label, dotted leaders to the section number, and a thin top
 * rule. Renders nothing if there are no headings.
 *
 * Renders INSIDE the article so the PDF export snapshots it
 * together with the cover page and body — clients get a
 * printed-style TOC on the exported PDF.
 */
export default function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <section className="toc" aria-label="Table of contents">
      <div className="toc-label">§ Contents</div>
      <ol className="toc-list">
        {headings.map((h, i) => (
          <li
            key={`${h.anchor}-${i}`}
            className={`toc-item toc-item--level-${h.level}`}
          >
            <span className="toc-text">{h.text}</span>
            <span className="toc-leader" aria-hidden="true" />
            <span className="toc-number">{romanize(i + 1)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Convert 1..20 to Roman numerals. The TOC rarely has more than
 * 10 sections in practice; we cap at XX to keep the typography
 * consistent.
 */
function romanize(n: number): string {
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
