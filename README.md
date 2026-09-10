# InterviewIQ

AI mock-interview prep app — demanding technical, behavioral, and coding
interviews with every score traced back to the transcript line that earned it.

Built with React 19, Vite, Tailwind CSS v4, and Recharts. Originally scaffolded
in Figma Make.

## Local development

Requires Node 22 and pnpm 10 (`corepack enable` will provision pnpm).

```bash
pnpm install
pnpm dev        # start the Vite dev server
pnpm build      # production build → dist/
pnpm preview    # serve the production build locally
```

## Deployment (Vercel)

The repo is Vercel-ready via [`vercel.json`](./vercel.json):

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Framework preset  | Vite                             |
| Install command   | `pnpm install --frozen-lockfile` |
| Build command     | `pnpm run build`                 |
| Output directory  | `dist`                           |

Import the GitHub repo at [vercel.com/new](https://vercel.com/new) and deploy —
no environment variables are required. All routing is client-side, so
`vercel.json` rewrites every path to `index.html`.

## Project structure

- `src/App.tsx` — root component and page switcher
- `src/pages/*` — one component per screen
- `src/components/ui.tsx` — shared UI primitives
- `src/components/AppBackground.tsx` — shared animated background
- `src/index.css` — Tailwind v4 entry + design tokens (`@theme`)
- `vite.config.ts` — Vite config with React, Tailwind, and Figma Make plugins

## Notes

- Search-engine indexing is controlled by `robots.index` in
  `.figma/make/site.json`. Set it to `false` to ship a `noindex` build.
