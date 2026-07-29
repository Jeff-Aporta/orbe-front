# Orbe — web (la A+S del stack PAWS)

[![Deploy web](https://github.com/Jeff-Aporta/orbe-front/actions/workflows/deploy.yml/badge.svg)](https://github.com/Jeff-Aporta/orbe-front/actions/workflows/deploy.yml)

Front estático de **Orbe**, to-do colaborativo en tiempo real. SPA sin framework
de build pesado: React 18 por CDN (importmap esm.sh), TypeScript + TSX,
esbuild → `_dist/`, Web Awesome 3, Iconify, Tailwind por CDN y router propio
por querystring `?s=`.

- **API:** [`orbe-back`](https://github.com/Jeff-Aporta/orbe-back) — consume
  `https://orbe-api.jeffaporta.workers.dev` (configurable en un solo lugar:
  `src/js/config.ts`).
- **Demo:** usuarios `demo/demo123`, `ana/ana123`, `luis/luis123`.

## Desarrollo

```bash
npm install
npm run build       # esbuild → _dist (commiteado)
npm run typecheck   # tsc --noEmit
# abrir index.html con Live Server
```

## Deploy

Push a `main` → GitHub Actions hace typecheck + build y publica en GitHub Pages.
