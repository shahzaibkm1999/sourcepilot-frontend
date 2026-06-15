/**
 * pdfmake — minimal ambient declarations
 *
 * pdfmake 0.3.x ships without TypeScript types. We declare the
 * surface we use so the rest of the codebase can import the types
 * (`TDocumentDefinitions`, `Content`, `TFontDictionary`) without
 * pulling in `@types/pdfmake` (which is unmaintained and out of
 * sync with 0.3.x).
 *
 * Only the entry points we use are typed; everything else is `any`
 * so a future pdfmake minor bump doesn't break the build.
 */
declare module 'pdfmake/build/pdfmake.js' {
  import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

  export interface PdfMake {
    vfs: Record<string, string>;
    fonts: TFontDictionary;
    createPdf(def: TDocumentDefinitions): PdfDocument;
    /**
     * Write font files into pdfmake's internal virtual file system.
     * Each value is either a base64-encoded string (when `encoding`
     * is omitted) or `{ data, encoding }`. Keys are the filenames
     * referenced by the `fonts` dictionary. Calling this is the
     * supported way to register custom fonts at runtime in 0.3.x;
     * direct `pdfMake.vfs[name] = ...` is a no-op because the
     * class has no `vfs` property — storage lives on the
     * internal virtualfs instance.
     */
    addVirtualFileSystem(
      vfs: Record<
        string,
        string | { data: string; encoding?: 'base64' | 'utf-8' }
      >,
    ): void;
  }

  export interface PdfDocument {
    download(filename?: string): void;
    getBlob(cb: (blob: Blob) => void): void;
    open(): void;
    print(): void;
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  // pdfmake 0.3.x: `module.exports = vfs` (the vfs is the default)
  // Older versions wrapped it; accept all three shapes.
  const vfsFonts:
    | Record<string, string>
    | { vfs: Record<string, string> }
    | { pdfMake: { vfs: Record<string, string> } };
  export default vfsFonts;
}

declare module 'pdfmake/interfaces' {
  // ----- Primitives -----
  export type Alignment = 'left' | 'right' | 'center' | 'justify';

  export interface Style {
    font?: string;
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    alignment?: Alignment;
    color?: string;
    columnGap?: number;
    fillColor?: string;
    characterSpacing?: number;
    lineHeight?: number;
    margin?: number | number[];
  }

  // ----- Content nodes (only the shapes we use) -----
  export interface TextContent {
    text: string | Content[];
    style?: string | string[];
    margin?: [number, number, number, number] | number;
    alignment?: Alignment;
  }

  export interface ColumnContent {
    columns: Array<{ width?: number | string; text?: string | Content[]; stack?: Content[]; table?: TableContent['table']; margin?: [number, number, number, number] | number; alignment?: Alignment; style?: string; canvas?: CanvasElement[] }>;
    columnGap?: number;
    margin?: [number, number, number, number] | number;
    style?: string;
  }

  export interface CanvasLine {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lineWidth: number;
    lineColor?: string;
    dash?: { length: number; space: number };
  }

  export interface CanvasRect {
    type: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
    lineColor?: string;
    fillColor?: string;
    lineWidth?: number;
  }

  export type CanvasElement = CanvasLine | CanvasRect;

  export interface CanvasContent {
    canvas: CanvasElement[];
    margin?: [number, number, number, number] | number;
  }

  export interface ListContent {
    ul?: Array<{ text: string | Content[]; style?: string }>;
    ol?: Array<{ text: string | Content[]; style?: string }>;
    margin?: [number, number, number, number] | number;
  }

  export interface TableContent {
    table: {
      widths: Array<number | string | 'auto' | '*'>;
      // `headerRows: N` repeats the first N body rows on every page
      // when the table spans a page break. We set it to 1 so the
      // header repeats.
      headerRows?: number;
      body: Array<Array<{ text?: string | Content[]; style?: string; fillColor?: string; border?: [boolean, boolean, boolean, boolean]; stack?: Content[]; margin?: [number, number, number, number] | number; alignment?: Alignment }>>;
    };
    layout?: {
      hLineWidth?: ((i: number, node: unknown) => number) | (() => number) | number;
      vLineWidth?: ((i: number, node: unknown) => number) | (() => number) | number;
      hLineColor?: ((i: number, node: unknown) => string) | (() => string) | string;
      vLineColor?: ((i: number, node: unknown) => string) | (() => string) | string;
      hPaddingBefore?: ((i: number, node: unknown) => number) | (() => number) | number;
      hPaddingAfter?: ((i: number, node: unknown) => number) | (() => number) | number;
      vPaddingBefore?: ((i: number, node: unknown) => number) | (() => number) | number;
      vPaddingAfter?: ((i: number, node: unknown) => number) | (() => number) | number;
      // pdfmake/pdfkit also support per-cell function-form paddings.
      // We use these for the table layout.
      paddingTop?: ((i: number, node: unknown) => number) | (() => number) | number;
      paddingBottom?: ((i: number, node: unknown) => number) | (() => number) | number;
      paddingLeft?: ((i: number, node: unknown) => number) | (() => number) | number;
      paddingRight?: ((i: number, node: unknown) => number) | (() => number) | number;
    };
    margin?: [number, number, number, number] | number;
  }

  export interface PageBreakContent {
    text?: string;
    pageBreak: 'before' | 'after' | 'nextPage';
  }

  export type Content =
    | string
    | TextContent
    | ColumnContent
    | CanvasContent
    | ListContent
    | TableContent
    | PageBreakContent;

  // ----- Document definition -----
  export interface TFontDictionary {
    [fontName: string]: {
      normal: string;
      bold: string;
      italics: string;
      bolditalics?: string;
    };
  }

  export interface PageSize {
    width: number;
    height: number;
  }

  export type PageOrientation = 'portrait' | 'landscape';

  export interface PageMargins {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  }

  export type FooterFn = (
    currentPage: number,
    pageCount: number,
  ) => Content;

  export interface TDocumentDefinitions {
    pageSize?: 'A4' | 'LETTER' | 'LEGAL' | PageSize;
    pageOrientation?: PageOrientation;
    pageMargins?: number | number[];
    defaultStyle?: Style;
    styles?: Record<string, Style>;
    header?: Content | FooterFn;
    footer?: Content | FooterFn;
    content: Content | Content[];
    info?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
      creator?: string;
      producer?: string;
    };
  }
}
