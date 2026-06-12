/**
 * headingFromMarkdown
 * -------------------
 * Extract a list of headings (h1 + h2) from a markdown source.
 * Used by the document viewer to build a Table of Contents and by
 * the PDF export to stamp a running header per section.
 *
 * Returns an array of `{ level, text, anchor }` where `anchor` is
 * a slugified version of the heading text — the same slug the
 * on-screen body would get from a `id` attribute (we don't need
 * to write IDs into the rendered HTML, the TOC just shows the
 * entries, not jump links).
 */
export interface Heading {
  level: 1 | 2;
  text: string;
  anchor: string;
}

export function extractHeadings(md: string): Heading[] {
  const lines = md.split(/\r?\n/);
  const out: Heading[] = [];
  for (const line of lines) {
    const m = /^(#{1,2})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2;
    const text = m[2].trim();
    out.push({ level, text, anchor: slugifyHeading(text) });
  }
  return out;
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
