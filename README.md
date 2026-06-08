# AI Software Planning Assistant Frontend

React + TypeScript + Vite dashboard for the AI Powered Software Planning Assistant MVP.

* **No Tailwind** — only standard CSS, organised in `src/styles/`
* Modern SaaS-style layout: left sidebar (saved specs) + main panel
  (idea input + spec viewer)
* Talks to the backend over REST (see `src/services/api.ts`)
* Loading + error states for every async path
* Responsive: sidebar collapses to a single column on narrow viewports

## Project layout

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/         # Sidebar, IdeaInput, SpecViewer
│   ├── pages/              # Dashboard
│   ├── services/           # api.ts (typed fetch wrapper)
│   ├── hooks/              # useSpecs (sidebar data fetching)
│   ├── types/              # Mirrors backend domain types
│   ├── styles/             # Modular CSS (one file per component)
│   ├── utils/              # markdown.ts, date.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # only needed if backend isn't on localhost:5000
npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` and `/health` to `http://localhost:5000`
(see `vite.config.ts`). In production builds, set `VITE_API_BASE_URL` in
`.env.local` to the deployed backend URL.

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript check + Vite production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run typecheck` | TypeScript only, no emit |

## How the UI works

* `<Dashboard>` owns three pieces of state:
  * the saved-spec list (via `useSpecs`)
  * the right-hand `ViewerContent` (`idle` / `loading` / `error` / `generated` / `saved`)
  * whether a generation is in flight
* `<Sidebar>` renders the list and lets the user click a row to view it.
* `<IdeaInput>` is a controlled form. On submit it calls `api.generateSpec`,
  which hits `POST /api/specifications/generate` on the backend.
* `<SpecViewer>` renders the response. Markdown produced by Gemini is converted
  to HTML by a small dependency-free utility (`utils/markdown.ts`) that also
  HTML-escapes the input first.

## Styling

All styles live in `src/styles/` and are imported by the component they style:

| File | Used by |
| --- | --- |
| `index.css`     | Design tokens, reset, base typography |
| `dashboard.css` | `<Dashboard>` grid + header |
| `sidebar.css`   | `<Sidebar>` |
| `idea-input.css`| `<IdeaInput>` |
| `spec-viewer.css` | `<SpecViewer>` and the markdown body |

Adjust colours, spacing, and radii by editing the CSS custom properties at the
top of `index.css`.
