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
 *   - Spectral — display serif (Regular, Italic, Bold, BoldItalic)
 *   - IBMPlexSans — body sans (Regular, Italic, Bold, BoldItalic, SemiBold)
 *   - IBMPlexMono — mono (Regular, Italic, Bold, BoldItalic)
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
import spectralBoldItalicUrl from '../../public/fonts/Spectral-BoldItalic.ttf?url';
import plexSansRegularUrl from '../../public/fonts/IBMPlexSans-Regular.ttf?url';
import plexSansItalicUrl from '../../public/fonts/IBMPlexSans-Italic.ttf?url';
import plexSansBoldUrl from '../../public/fonts/IBMPlexSans-Bold.ttf?url';
import plexSansBoldItalicUrl from '../../public/fonts/IBMPlexSans-BoldItalic.ttf?url';
import plexSansSemiBoldUrl from '../../public/fonts/IBMPlexSans-SemiBold.ttf?url';
import plexMonoRegularUrl from '../../public/fonts/IBMPlexMono-Regular.ttf?url';
import plexMonoItalicUrl from '../../public/fonts/IBMPlexMono-Italic.ttf?url';
import plexMonoBoldUrl from '../../public/fonts/IBMPlexMono-Bold.ttf?url';
import plexMonoBoldItalicUrl from '../../public/fonts/IBMPlexMono-BoldItalic.ttf?url';

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
    import('pdfmake/build/vfs_fonts.js'),
  ]);
  const pdfMakeModule: PdfMakeModule =
    (pdfMakeModuleRaw as { default?: PdfMakeModule }).default ??
    (pdfMakeModuleRaw as unknown as PdfMakeModule);

  // Register the bundled Roboto vfs. The pdfmake 0.3.x singleton
  // exposes `addVirtualFileSystem(...)` which writes into the SAME
  // `virtualfs` storage that `createPdf` reads from at generation
  // time. (Assigning to `pdfMake.vfs[name] = ...` is a no-op because
  // the class has no `vfs` property — the storage lives on
  // `this.virtualfs.storage`, and `addVirtualFileSystem` is the only
  // supported way to write to it.) The vfs_fonts.js module already
  // calls `addVirtualFileSystem(robotoVfs)` as a side effect at import
  // time, but the order of side-effects vs. our dynamic imports is
  // not guaranteed, so we call it again here as an explicit
  // registration. `extractVfs` returns the raw vfs Record for all
  // three module shapes (raw, `{vfs}`, `{pdfMake:{vfs}}`).
  const robotoVfs = extractVfs(vfsFontsModule as { default?: unknown });
  if (robotoVfs) {
    pdfMakeModule.addVirtualFileSystem(robotoVfs);
  }

  // Register custom fonts. Each TTF is fetched, base64-encoded, and
  // dropped into pdfmake's virtual file system under a stable name,
  // then the `fonts` dictionary points pdfmake at those names.
  // Every family needs the full set {normal, italics, bold, bolditalics}
  // — pdfmake looks up bolditalics for any text that has both bold and
  // italic styling, even if no such text appears in the current doc
  // (the lookup is part of style resolution, not per-render).
  const fontAssets: Array<[string, string]> = [
    ['Spectral-Regular.ttf', spectralRegularUrl],
    ['Spectral-Italic.ttf', spectralItalicUrl],
    ['Spectral-Bold.ttf', spectralBoldUrl],
    ['Spectral-BoldItalic.ttf', spectralBoldItalicUrl],
    ['IBMPlexSans-Regular.ttf', plexSansRegularUrl],
    ['IBMPlexSans-Italic.ttf', plexSansItalicUrl],
    ['IBMPlexSans-Bold.ttf', plexSansBoldUrl],
    ['IBMPlexSans-BoldItalic.ttf', plexSansBoldItalicUrl],
    ['IBMPlexSans-SemiBold.ttf', plexSansSemiBoldUrl],
    ['IBMPlexMono-Regular.ttf', plexMonoRegularUrl],
    ['IBMPlexMono-Italic.ttf', plexMonoItalicUrl],
    ['IBMPlexMono-Bold.ttf', plexMonoBoldUrl],
    ['IBMPlexMono-BoldItalic.ttf', plexMonoBoldItalicUrl],
  ];

  const encodings = await Promise.all(
    fontAssets.map(async ([name, url]) => [name, await fetchAsBase64(url)] as const),
  );

  // The custom-vfs is a `Record<name, base64>`. Pass it to
  // `addVirtualFileSystem` so the keys land in pdfmake's storage.
  const customVfs: Record<string, string> = {};
  for (const [name, b64] of encodings) {
    customVfs[name] = b64;
  }
  pdfMakeModule.addVirtualFileSystem(customVfs);

  const fonts: TFontDictionary = {
    Spectral: {
      normal: 'Spectral-Regular.ttf',
      italics: 'Spectral-Italic.ttf',
      bold: 'Spectral-Bold.ttf',
      bolditalics: 'Spectral-BoldItalic.ttf',
    },
    IBMPlexSans: {
      normal: 'IBMPlexSans-Regular.ttf',
      italics: 'IBMPlexSans-Italic.ttf',
      bold: 'IBMPlexSans-Bold.ttf',
      bolditalics: 'IBMPlexSans-BoldItalic.ttf',
    },
    IBMPlexSansSemiBold: {
      // No SemiBold + italic variant ships for IBM Plex Sans, so we
      // reuse the regular BoldItalic for SemiBold-italic too. Same
      // visual weight class for the on-screen editorial design.
      normal: 'IBMPlexSans-SemiBold.ttf',
      italics: 'IBMPlexSans-Italic.ttf',
      bold: 'IBMPlexSans-SemiBold.ttf',
      bolditalics: 'IBMPlexSans-BoldItalic.ttf',
    },
    IBMPlexMono: {
      normal: 'IBMPlexMono-Regular.ttf',
      italics: 'IBMPlexMono-Italic.ttf',
      bold: 'IBMPlexMono-Bold.ttf',
      bolditalics: 'IBMPlexMono-BoldItalic.ttf',
    },
    // Reuse Roboto as a last-resort fallback. We don't reference it
    // from any doc definition, but having it registered means pdfmake
    // won't error if some downstream code (or future block) omits a
    // font name and the default Roboto lookup fires.
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      italics: 'Roboto-Italic.ttf',
      bold: 'Roboto-Medium.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  pdfMakeModule.fonts = fonts;

  // `addVirtualFileSystem` doesn't expose the vfs back as a property,
  // so there's no `pdfMakeModule.vfs` to read. We return the keys we
  // registered as a debugging hint.
  return {
    pdfMake: pdfMakeModule,
    fontKeys: Object.keys(customVfs),
  };
}

function extractVfs(mod: { default?: unknown }): Record<string, string> | null {
  // pdfmake 0.3.x ships vfs_fonts with `module.exports = vfs` — the
  // default export IS the vfs Record. Older versions wrapped it as
  // `{ vfs }` or `{ pdfMake: { vfs } }`. We try all three.
  const d = mod.default;
  if (!d || typeof d !== 'object') return null;
  const obj = d as Record<string, unknown>;

  // Wrapped shapes first.
  if (obj.vfs && typeof obj.vfs === 'object') {
    return obj.vfs as Record<string, string>;
  }
  if (obj.pdfMake && typeof obj.pdfMake === 'object') {
    const pm = obj.pdfMake as Record<string, unknown>;
    if (pm.vfs && typeof pm.vfs === 'object') {
      return pm.vfs as Record<string, string>;
    }
  }

  // Unwrapped: the default itself looks like a vfs. Heuristic — at
  // least one key matches a common font extension.
  if (Object.keys(obj).length > 0) {
    const hasFontKey = Object.keys(obj).some(
      (k) => typeof k === 'string' && /\.ttf$|\.otf$/.test(k),
    );
    if (hasFontKey) return obj as unknown as Record<string, string>;
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
