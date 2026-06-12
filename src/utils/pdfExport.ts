/**
 * pdfExport
 * ---------
 * Public entry point for the PDF pipeline. `DocumentViewer` calls
 * `exportStructuredDocAsPdf(...)` from its "↓ PDF" button.
 *
 * Pipeline:
 *   1. `getPdfRuntime()` — lazy-loads pdfmake + registers fonts.
 *   2. `buildPdfDocDefinition(...)` — turns the structured inputs
 *      into a pdfmake `TDocumentDefinitions`.
 *   3. `pdfMake.createPdf(...).download(filename)` — renders and
 *      triggers the browser download.
 *
 * The function is async; callers should `await` and surface errors.
 *
 * Article VI: this module is the only place that touches pdfmake.
 * The shared `SpecificationGenerator` analogue (Article II) lives
 * in the service layer; this is purely a frontend utility.
 */
import type { Project, ProjectDocument } from '../types';
import { buildPdfDocDefinition } from './pdfFromDoc';
import { getPdfRuntime } from './pdfRuntime';

export interface ExportPdfInputs {
  /** Raw markdown body of the document. */
  markdown: string;
  project: Project;
  doc: ProjectDocument;
  /** Filename for the downloaded PDF (no extension). */
  filename: string;
}

export async function exportStructuredDocAsPdf({
  markdown,
  project,
  doc,
  filename,
}: ExportPdfInputs): Promise<void> {
  const { pdfMake } = await getPdfRuntime();
  const def = buildPdfDocDefinition({ markdown, project, doc });
  // pdfmake 0.3.x exposes `download()` as an async method (it awaits
  // `getBlob()` internally). If the build or the file-save rejects, the
  // rejection is unhandled unless we await — and an unhandled
  // rejection is invisible to the caller's try/catch, so the user
  // would see "nothing happens" with the error only in the console.
  // Awaiting routes the failure back through `handleExportPdf`'s
  // try/catch, which surfaces it via `window.alert`.
  await pdfMake.createPdf(def).download(`${filename}.pdf`);
}

/**
 * Lower-level helper for callers that want the blob in memory
 * (e.g. to upload, preview in an `<embed>`, or wrap in tests). Not
 * used by `DocumentViewer` directly but kept here so future code
 * doesn't have to re-bootstrap the runtime.
 */
export async function renderStructuredDocAsBlob({
  markdown,
  project,
  doc,
}: Omit<ExportPdfInputs, 'filename'>): Promise<Blob> {
  const { pdfMake } = await getPdfRuntime();
  const def = buildPdfDocDefinition({ markdown, project, doc });
  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(def).getBlob((blob) => resolve(blob));
  });
}
