import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Rasterize a DOM element and save it as a multi-page A4 PDF.
 *
 * Flow:
 *   1. Snapshot the element into a canvas with html2canvas (scale 2
 *      for crisp text on retina displays, white background so the
 *      snapshot looks like paper in any PDF viewer). An `onclone`
 *      callback sanitises the cloned document first — html2canvas
 *      v1.4.1 doesn't support CSS `color-mix()`, so we resolve any
 *      such calls to `rgb(...)` against the live page's computed
 *      style before snapshotting. We also remove the action button
 *      row from the clone; buttons don't belong in a printable PDF.
 *   2. Create a portrait A4 jsPDF document.
 *   3. Tile the canvas across as many pages as needed by slicing it
 *      vertically and adding one `addImage` per page. A naive
 *      single-page export would shrink long proposals to a tiny
 *      thumbnail; the tile loop is the standard pattern for this
 *      stack.
 *
 * The function resolves once `jsPDF.save()` has been called. The
 * browser handles the actual download dialog; we don't return a
 * Blob. Errors propagate to the caller so the button can show an
 * alert and re-enable itself.
 */
export async function exportElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    onclone: (clonedDoc) => {
      // 1. Strip the action bar (Copy / Download / Export PDF /
      //    Edit / Delete / Regenerate / Close) from the cloned
      //    article — they're UI, not part of the printable doc.
      const actions = clonedDoc.querySelectorAll('.document-article-actions');
      actions.forEach((el) => el.parentElement?.removeChild(el));

      // 2. Resolve every `color-mix(...)` call in the cloned
      //    stylesheets to a concrete `rgb(...)` so html2canvas's
      //    parser doesn't choke. We use a hidden probe element in
      //    the LIVE document to compute the resolved value (the
      //    clone's variables aren't materialised at the time
      //    onclone fires).
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.width = '0';
      probe.style.height = '0';
      document.body.appendChild(probe);

      try {
        const sheets = Array.from(clonedDoc.styleSheets);
        for (const sheet of sheets) {
          // Cross-origin sheets: skip (we can't read their rules).
          // Our own stylesheets are same-origin.
          let rules: CSSRuleList | null = null;
          try {
            rules = (sheet as CSSStyleSheet).cssRules;
          } catch {
            continue;
          }
          if (!rules) continue;

          for (let i = 0; i < rules.length; i += 1) {
            const rule = rules[i];
            if (!(rule instanceof CSSStyleRule)) continue;
            const style = rule.style;
            for (let j = 0; j < style.length; j += 1) {
              const prop = style.item(j);
              const value = style.getPropertyValue(prop);
              if (!value.includes('color-mix(')) continue;
              const resolved = resolveColorMix(probe, value);
              if (resolved !== null) {
                style.setProperty(prop, resolved);
              }
            }
          }
        }
      } finally {
        document.body.removeChild(probe);
      }
    },
  });

  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();

  // The canvas is rendered at scale 2, so its pixel dimensions are
  // 2x the on-screen CSS pixels. We render it onto the PDF at the
  // full A4 width, which means the rendered height in PDF-space is:
  //   renderedHeightPt = (canvas.height / canvas.width) * pageWidthPt
  // and the corresponding slice height in source-canvas pixels is:
  //   pageHeightPx = (pageHeightPt / renderedHeightPt) * canvas.height
  //                = (pageHeightPt / pageWidthPt) * canvas.width
  const pageHeightPx = (pageHeightPt / pageWidthPt) * canvas.width;
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

  for (let page = 0; page < totalPages; page += 1) {
    if (page > 0) pdf.addPage();

    // Source Y offset in canvas pixels for the top of this page.
    const sourceY = page * pageHeightPx;
    // Sliced height in canvas pixels — last page may be shorter.
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);

    // Create a per-page canvas containing just this vertical slice.
    // Drawing the full canvas at a negative offset would work, but
    // a real slice keeps each page's PNG compact.
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context for PDF page slice');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    // Compute the rendered height of this slice in PDF points so
    // short final pages don't get stretched to a full A4.
    const sliceHeightPt = (sliceHeightPx / canvas.width) * pageWidthPt;

    const imgData = pageCanvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidthPt, sliceHeightPt);
  }

  pdf.save(filename);
}

/**
 * Resolve a CSS property value containing one or more
 * `color-mix(...)` calls into an `rgb(...)` form, by asking the
 * browser's own `getComputedStyle` to evaluate it. Returns the
 * original value unchanged if no substitution was possible (e.g.
 * the browser doesn't support `color-mix`).
 */
function resolveColorMix(probe: HTMLElement, value: string): string | null {
  if (typeof CSS === 'undefined' || !('supports' in CSS)) return null;
  if (!CSS.supports('color', 'color-mix(in srgb, red, blue)')) return null;

  probe.style.color = value;
  const computed = getComputedStyle(probe).color;
  // `computed` will be `rgb(...)` or `rgba(...)` if the browser
  // resolved the value successfully; otherwise it falls back to
  // the inherited color and equals an empty value or the original
  // string.
  if (!computed.startsWith('rgb')) return null;
  return computed;
}
