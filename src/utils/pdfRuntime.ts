/**
 * pdfRuntime
 * ----------
 * Lazy-loads `pdfmake`, fetches the embedded TTF font assets, registers
 * them with pdfmake's virtual file system, and returns a configured
 * module that downstream code (`pdfFromDoc.ts`, `pdfExport.ts`) can
 * use to build and render a PDF.
 *
 * Why lazy-load: pdfmake bundles pdfkit, which is ~1MB of JS. We only
 * pay that cost when the user actually exports a document. The first
 * call resolves a module-level promise; subsequent calls reuse it.
 *
 * Fonts registered (all under public/fonts/, shipped with the app):
 *   - Spectral — display serif (Regular, Italic, Bold)
 *   - IBMPlexSans — body sans (Regular, Italic, Bold, SemiBold)
 *   - IBMPlexMono — mono (Regular, Italic, Bold)
 *
 * Article VI: pdfmake is the only PDF library we use; the bespoke
 * html2canvas+jspdf pipeline was retired (see
 * specs/003-pdf-export for the migration record). No alternative PDF
 * library considered — pdfmake gives us a real, text-selectable
 * document model, custom font embedding, headers/footers, page
 * numbering, and a structured `TDocumentDefinitions` API that maps
 * cleanly to our `StructuredDoc` model.
 */
import type { TFontDictionary } from 'pdfmake/interfaces';

// Vite resolves `?url` imports to the bundled asset's URL at build time.
import spectralRegularUrl from '../../public/fonts/Spectral-Regular.ttf?url';
import spectralItalicUrl from '../../public/fonts/Spectral-Italic.ttf?url';
import spectralBoldUrl from '../../public/fonts/Spectral-Bold.ttf?url';
import plexSansRegularUrl from '../../public/fonts/IBMPlexSans-Regular.ttf?url';
import plexSansItalicUrl from '../../public/fonts/IBMPlexSans-Italic.ttf?url';
import plexSansBoldUrl from '../../public/fonts/IBMPlexSans-Bold.ttf?url';
import plexSansSemiBoldUrl from '../../public/fonts/IBMPlexSans-SemiBold.ttf?url';
import plexMonoRegularUrl from '../../public/fonts/IBMPlexMono-Regular.ttf?url';
import plexMonoItalicUrl from '../../public/fonts/IBMPlexMono-Italic.ttf?url';
import plexMonoBoldUrl from '../../public/fonts/IBMPlexMono-Bold.ttf?url';

type PdfMakeModule = (typeof import('pdfmake/build/pdfmake.js'))['default'];

interface PdfRuntime {
  pdfMake: PdfMakeModule;
  /** Aliases of every font file we registered. Exposed for debugging. */
  fontKeys: string[];
}

let runtimePromise: Promise<PdfRuntime> | null = null;

export async function getPdfRuntime(): Promise<PdfRuntime> {
  if (runtimePromise) return runtimePromise;
  runtimePromise = bootstrap();
  return runtimePromise;
}

async function bootstrap(): Promise<PdfRuntime> {
  // pdfmake ships as a CJS module that exposes its API on the default
  // export. Dynamic import keeps it out of the main bundle.
  const [pdfMakeModuleRaw, vfsFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/vfs_fonts.js') as Promise<{ default?: { pdfMake?: { vfs: Record<string, string> } } }>,
  ]);
  const pdfMakeModule = (pdfMakeModuleRaw as { default?: PdfMakeModule }).default ?? (pdfMakeModuleRaw as unknown as PdfMakeModule);

  // pdfmake's bundled Roboto vfs is the default font dictionary. We
  // start from there and overlay our own fonts.
  const vfs = extractVfs(vfsFontsModule);
  if (vfs) {
    pdfMakeModule.vfs = vfs;
  }

  // Register custom fonts. Each TTF is fetched, base64-encoded, and
  // dropped into pdfmake's virtual file system under a stable name,
  // then the `fonts` dictionary points pdfmake at those names.
  const fontAssets: Array<[string, string]> = [
    ['Spectral-Regular.ttf', spectralRegularUrl],
    ['Spectral-Italic.ttf', spectralItalicUrl],
    ['Spectral-Bold.ttf', spectralBoldUrl],
    ['IBMPlexSans-Regular.ttf', plexSansRegularUrl],
    ['IBMPlexSans-Italic.ttf', plexSansItalicUrl],
    ['IBMPlexSans-Bold.ttf', plexSansBoldUrl],
    ['IBMPlexSans-SemiBold.ttf', plexSansSemiBoldUrl],
    ['IBMPlexMono-Regular.ttf', plexMonoRegularUrl],
    ['IBMPlexMono-Italic.ttf', plexMonoItalicUrl],
    ['IBMPlexMono-Bold.ttf', plexMonoBoldUrl],
  ];

  const encodings = await Promise.all(
    fontAssets.map(async ([name, url]) => [name, await fetchAsBase64(url)] as const),
  );

  for (const [name, b64] of encodings) {
    pdfMakeModule.vfs[name] = b64;
  }

  const fonts: TFontDictionary = {
    Spectral: {
      normal: 'Spectral-Regular.ttf',
      italics: 'Spectral-Italic.ttf',
      bold: 'Spectral-Bold.ttf',
    },
    IBMPlexSans: {
      normal: 'IBMPlexSans-Regular.ttf',
      italics: 'IBMPlexSans-Italic.ttf',
      bold: 'IBMPlexSans-Bold.ttf',
    },
    IBMPlexSansSemiBold: {
      normal: 'IBMPlexSans-SemiBold.ttf',
      italics: 'IBMPlexSans-Italic.ttf',
      bold: 'IBMPlexSans-SemiBold.ttf',
    },
    IBMPlexMono: {
      normal: 'IBMPlexMono-Regular.ttf',
      italics: 'IBMPlexMono-Italic.ttf',
      bold: 'IBMPlexMono-Bold.ttf',
    },
    // Reuse Roboto as a last-resort fallback. We don't reference it
    // from any doc definition, but having it registered means pdfmake
    // won't error if some downstream code (or future block) omits a
    // font name and the default Roboto lookup fires.
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      italics: 'Roboto-Italic.ttf',
      bold: 'Roboto-Medium.ttf',
    },
  };

  pdfMakeModule.fonts = fonts;

  return {
    pdfMake: pdfMakeModule,
    fontKeys: Object.keys(pdfMakeModule.vfs),
  };
}

function extractVfs(mod: { default?: { pdfMake?: { vfs: Record<string, string> } } }): Record<string, string> | null {
  // pdfmake 0.3.x ships vfs_fonts with a default export that may be
  // either `{ pdfMake: { vfs } }` (older) or `{ vfs }` (newer). Be
  // defensive about the shape so a pdfmake minor bump doesn't break us.
  const d = mod.default;
  if (!d) return null;
  if ('vfs' in d && d.vfs) return d.vfs as Record<string, string>;
  if ('pdfMake' in d && d.pdfMake && 'vfs' in d.pdfMake) {
    return d.pdfMake.vfs as Record<string, string>;
  }
  return null;
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load font asset ${url}: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  // Chunk the conversion so we don't blow the JS call-stack on a 300KB
  // TTF (the naive `btoa(String.fromCharCode(...u8))` does).
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Reset the cached runtime. Test-only. */
export function _resetPdfRuntimeForTests(): void {
  runtimePromise = null;
}
