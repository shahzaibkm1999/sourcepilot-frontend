/**
 * scripts/decode-fonts.cjs
 * -----------------------
 * One-off build-time helper. Decodes the WOFF2 fonts shipped in
 * node_modules/@fontsource/<name>/files/ into TTFs under public/fonts/.
 * pdfmake (which uses fontkit under the hood) prefers TTF, and the
 * TTFs are bundled into the generated PDF as embedded fonts so the
 * output is identical regardless of who opens it.
 *
 * Why TTF and not WOFF2 in public/fonts: pdfmake's bundled fontkit
 * is a slightly older fork that doesn't always handle WOFF2
 * cleanly, and the TTFs it ships in its own VFS are the canonical
 * format. Decoding to TTF at build time is more reliable than
 * runtime decoding inside the browser, and the TTF files are
 * committed alongside the WOFF2 source-of-truth in node_modules.
 *
 * Idempotent: skip any TTF that already exists. Safe to re-run.
 *
 * Run with: `node scripts/decode-fonts.cjs`
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Map of source WOFF2 (in node_modules) → target TTF (in public/fonts).
// Weights below are deliberately narrow: Regular (400), Medium (500),
// SemiBold (600), Bold (700) — the four weights pdfRuntime.ts registers.
// Italic variants are 400-italic. (700-italic isn't shipped by the
// @fontsource subset; we fall back to 700 normal for bold-italic in
// the font dictionary.)
const fonts = [
  // Spectral — display serif for chapter titles, drop caps, cover
  {
    src: 'node_modules/@fontsource/spectral/files/spectral-latin-400-normal.woff2',
    dst: 'public/fonts/Spectral-Regular.ttf',
  },
  {
    src: 'node_modules/@fontsource/spectral/files/spectral-latin-400-italic.woff2',
    dst: 'public/fonts/Spectral-Italic.ttf',
  },
  {
    src: 'node_modules/@fontsource/spectral/files/spectral-latin-700-normal.woff2',
    dst: 'public/fonts/Spectral-Bold.ttf',
  },

  // IBM Plex Sans — body sans
  {
    src: 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2',
    dst: 'public/fonts/IBMPlexSans-Regular.ttf',
  },
  {
    src: 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2',
    dst: 'public/fonts/IBMPlexSans-Italic.ttf',
  },
  {
    src: 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2',
    dst: 'public/fonts/IBMPlexSans-Bold.ttf',
  },
  {
    src: 'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2',
    dst: 'public/fonts/IBMPlexSans-SemiBold.ttf',
  },

  // IBM Plex Mono — eyebrows, meta lines, callouts, code
  {
    src: 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
    dst: 'public/fonts/IBMPlexMono-Regular.ttf',
  },
  {
    src: 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-italic.woff2',
    dst: 'public/fonts/IBMPlexMono-Italic.ttf',
  },
  {
    src: 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2',
    dst: 'public/fonts/IBMPlexMono-Bold.ttf',
  },
];

const repoRoot = path.resolve(__dirname, '..');
const woff2Decompress = path.join(
  repoRoot,
  'node_modules/wawoff2/bin/woff2_decompress.js',
);

if (!fs.existsSync(woff2Decompress)) {
  console.error('  ✗ wawoff2 not found. Run `npm install` first.');
  process.exit(1);
}

let converted = 0;
let skipped = 0;

for (const { src, dst } of fonts) {
  const absSrc = path.join(repoRoot, src);
  const absDst = path.join(repoRoot, dst);

  if (!fs.existsSync(absSrc)) {
    console.error(`  ✗ missing source: ${src}`);
    process.exit(1);
  }

  if (fs.existsSync(absDst)) {
    console.log(`  · skip (exists): ${dst}`);
    skipped += 1;
    continue;
  }

  console.log(`  + decode: ${path.basename(src)} → ${path.basename(dst)}`);
  execFileSync('node', [woff2Decompress, absSrc, absDst], {
    stdio: 'inherit',
  });
  converted += 1;
}

console.log(`\n  decoded ${converted}, skipped ${skipped}.`);
