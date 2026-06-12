import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Rasterize a DOM element and save it as a multi-page A4 PDF.
 *
 * Flow:
 *   1. Snapshot the element into a canvas with html2canvas (scale 2
 *      for crisp text on retina displays, white background so the
 *      snapshot looks like paper in any PDF viewer). An `onclone`
 *      callback sanitises the cloned document first:
 *        - strips `.document-article-actions` (UI, not printable)
 *        - resolves every `color-mix(...)` call in the cloned
 *          stylesheets to a concrete `rgb(...)` so html2canvas's
 *          parser doesn't choke
 *   2. Create a portrait A4 jsPDF document.
 *   3. Tile the canvas across as many pages as needed by slicing
 *      it vertically and adding one `addImage` per page.
 *
 * Why we resolve color-mix() manually:
 *   html2canvas v1.4.1 doesn't support the CSS `color-mix()`
 *   function and throws "unsupported color function 'color'".
 *   The app uses `color-mix()` in 6 stylesheets (border, background,
 *   box-shadow, etc.), so we walk every stylesheet rule, find any
 *   property whose value contains `color-mix(`, and rewrite the
 *   value to a concrete `rgb(...)` or `rgba(...)` that html2canvas
 *   can parse. The resolution uses the live page's `getComputedStyle`
 *   — the browser does the math for us; we just copy the result.
 *
 * The function resolves once `jsPDF.save()` has been called.
 * Errors propagate to the caller so the button can show an alert
 * and re-enable itself.
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
      //    Edit / Delete / Regenerate / Close) and the running
      //    header from the cloned article — they're UI, not part
      //    of the printable doc.
      const actions = clonedDoc.querySelectorAll('.document-article-actions');
      actions.forEach((el) => el.parentElement?.removeChild(el));
      const running = clonedDoc.querySelectorAll('.running-header');
      running.forEach((el) => el.parentElement?.removeChild(el));

      // 2. Resolve every `color-mix(...)` call in the cloned
      //    stylesheets to a concrete `rgb(...)` so html2canvas's
      //    parser doesn't choke. The probe is a hidden div in the
      //    LIVE document (the clone's CSS variables aren't fully
      //    materialised at the time onclone fires).
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
            // Iterate every declared property. For each one whose
            // value contains `color-mix(`, resolve the value to a
            // concrete rgb/rgba and write it back. This handles
            // border, background, box-shadow, etc. — not just
            // `color`.
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

    // Page-numbered footer. Editorial style: small mono italic
    // text in the bottom margin, with a thin rule above it on
    // every page except the first (cover page convention). jsPDF
    // gives us text in points; we sit ~24pt from the bottom edge
    // and right-align to the right margin (~32pt from the right).
    const isCover = page === 0;
    if (!isCover) {
      const footerY = pageHeightPt - 24;
      const marginX = 32;
      pdf.setDrawColor(220, 211, 188); // matches --color-border
      pdf.setLineWidth(0.5);
      pdf.line(
        marginX,
        footerY - 12,
        pageWidthPt - marginX,
        footerY - 12,
      );
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(90, 83, 78); // matches --color-ink-muted
      const label = `Page ${page + 1} of ${totalPages}`;
      const textWidth = pdf.getTextWidth(label);
      pdf.text(label, pageWidthPt - marginX - textWidth, footerY);
    }
  }

  pdf.save(filename);
}

/**
 * Resolve a CSS property value containing one or more
 * `color-mix(...)` calls into an `rgb(...)` or `rgba(...)` form, by
 * asking the browser's own `getComputedStyle` to evaluate it.
 *
 * We set the value on the probe's `color` property as a way to ask
 * the browser "what's the resolved color of this string?" — `color`
 * is always a color-typed property, so the browser accepts any
 * color syntax for it. The computed value comes back as
 * `rgb(...)` or `rgba(...)` if the browser supports `color-mix`,
 * and we copy that back over the original property (whatever it
 * was: `color`, `border-color`, `background-color`, etc.).
 *
 * Returns the original value unchanged if no substitution was
 * possible (browser doesn't support `color-mix`).
 */
function resolveColorMix(probe: HTMLElement, value: string): string | null {
  if (typeof CSS === 'undefined' || !('supports' in CSS)) return null;
  if (!CSS.supports('color', 'color-mix(in srgb, red, blue)')) return null;

  probe.style.color = value;
  const computed = getComputedStyle(probe).color;
  // `computed` will be `rgb(...)` or `rgba(...)` if the browser
  // resolved the value successfully. If the browser failed to
  // parse the value, the computed value falls back to the
  // inherited color (typically `rgb(0, 0, 0)`) — we can't
  // distinguish that from a successful parse, so we check that
  // the value is non-empty and starts with `rgb`.
  if (!computed.startsWith('rgb')) return null;
  return computed;
}
