import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Self-hosted custom fonts (Constitution Article VI — boring deps,
// no third-party CDN). The @fontsource/* packages ship the WOFF2
// files and a one-@font-face-per-weight CSS file each; importing
// only the latin subset keeps the bundle small and the page-load
// network waterfall shallow.
//
// The same fonts are also registered into pdfmake by
// `utils/pdfRuntime.ts` (via the TTFs decoded from these WOFF2
// files by `scripts/decode-fonts.cjs`). Keeping the on-screen and
// PDF renderers aligned on the same font families is what makes
// the downloaded PDF feel like the article on screen.
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-500.css';
import '@fontsource/spectral/latin-500-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-400-italic.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400-italic.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
