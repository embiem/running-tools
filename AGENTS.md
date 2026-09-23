# Repository Guidelines

## Project Overview

`running-tools` is a client-only Svelte 5 + TypeScript + Vite 7 SPA/installable PWA of small utilities for runners. Zero backend, zero runtime `dependencies` (everything is a devDependency). Two tools are implemented: a **cadence metronome** (Web Audio) and a **drink mix calculator** (pure arithmetic over literature-derived targets). Home page is a card grid; unimplemented tools render as placeholders.

## Architecture & Data Flow

- **Routing**: hand-rolled hash routing in `src/App.svelte` — no router library. A `routes` map (`'/'` → `src/pages/Home.svelte`, `'/metronome'` → `src/pages/MetronomePage.svelte`, `'/drink-mix'` → `src/pages/DrinkMixPage.svelte`), `location.hash` read + `hashchange` listener, unknown routes fall back to `/`. `PWABadge` is mounted once, in `App.svelte` — do not mount it again in a page.
  - Rationale (documented in `App.svelte` comments): hash routes work from the precached service-worker shell with no server rewrite config → every route works fully offline. **Do not introduce path-based routing or SvelteKit.**
- **Metronome**: framework-free engine in `src/lib/metronome.ts` (Web Audio "lookahead scheduler": 25 ms `setInterval` polls, schedules clicks up to 120 ms ahead on the audio clock — sample-accurate, throttling-immune). Exported as a **module-level singleton** `export const metronome = new Metronome()`; one engine per app must survive route changes.
- **UI ↔ engine contract**: `src/lib/Metronome.svelte` binds to the singleton, mirrors `metronome.running` into local `$state` on mount, and one `$effect` is the single source of truth pushing `bpm` → `metronome.bpm` + `localStorage` (`metronome.bpm`). Never instantiate `Metronome` in components.
- **Drink mix**: stateless pure functions in `src/lib/drinkMix.ts` — no class, no singleton, no DOM. `computeMix(input)` returns the recipe (grams of table salt / potassium chloride / sugar), what the batch delivers (sodium, potassium, carbohydrate, kcal, osmolality → tonicity), coverage of the session plan and the advice flags. `normalizeMixInput` turns any raw value into a valid `MixInput`; `isCompleteMixInput` reports whether every field is filled. Preset targets and concentration caps are derived from the ACSM / joint position-stand literature cited in the module header — **not** from commercial drink formulations.
- **PWA**: `vite-plugin-pwa` with `registerType: 'prompt'`, `injectRegister: false` — SW registration is manual via `src/lib/PWABadge.svelte` (`virtual:pwa-register/svelte`). PWA icons are generated at build time from `public/favicon.svg` via `pwa-assets.config.ts` (`minimal2023Preset`), emitted into `dist/`.
- **Data flow**: user input → Svelte runes state → engine mutation / `localStorage` → Web Audio scheduling. No network calls, no stores beyond Svelte built-ins. The drink mix tool is the same shape without audio: `input` → `$derived(normalizeMixInput(input))` → `$derived(computeMix(...))`, so one validated snapshot feeds the headline, the batch quantities and the per-bottle division.

## Key Directories

- `src/pages/` — route-level pages (Home grid, MetronomePage and DrinkMixPage wrappers).
- `src/lib/` — reusable components and logic (`metronome.ts` engine, `Metronome.svelte` UI, `drinkMix.ts` engine, `DrinkMix.svelte` UI, `PWABadge.svelte` update toast).
- `public/` — static assets copied verbatim to `dist/` (only `favicon.svg`).
- `dist/` — gitignored build output; deployable artifact for any static host (root-path deploy: no `base` set, SW scope `/`).

## Development Commands

```bash
npm run dev       # vite dev server
npm run build     # vite build (also generates PWA assets + sw.js)
npm run preview   # serve dist/
npm run check     # svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json
```

There is **no** test, lint, or format script. `npm run check` is the only quality gate — run it before delivering changes.

## Code Conventions & Common Patterns

- **Svelte 5 runes everywhere**: `$state`, `$derived`, `$effect`; `mount()` bootstrap in `src/main.ts`. No legacy stores (exception: `PWABadge.svelte` consumes the plugin's generated store wrapped in `$derived`).
- **Engine/UI separation**: platform logic lives in plain TS (`src/lib/*.ts`) — a class plus module-level singleton when state must survive navigation (`metronome.ts`), pure functions when it must not (`drinkMix.ts`); `.svelte` files are thin bindings with scoped `<style>` blocks. Follow this split for new tools.
- **Private class fields** (`#ctx`, `#timer`) for engine internals; public surface kept minimal (`bpm`, `running` getter, `start()`/`stop()`).
- **TypeScript strict** (`@tsconfig/svelte` → strict, `verbatimModuleSyntax`; ES2022; `allowJs`/`checkJs` on for `src/`). Use `interface`/types for data shapes (see `Tool` in `Home.svelte`).
- **State persistence**: validated `localStorage` read + write in the same `$effect` that drives the engine (see `STORAGE_KEY` pattern in `Metronome.svelte`). Where a bound form can be transiently incomplete, gate the write on completeness (`isCompleteMixInput`) so a half-typed field cannot persist a fallback over the last good value (`DrinkMix.svelte`).
- **Accessibility**: aria-labels on controls (`aria-label="Cadence in steps per minute"`), `role="alert"` toast, semantic `<details>` for info copy. Keep this up.
- **Styling**: global `src/app.css` (dark-first, `color-scheme: light dark`, shared `.card`/`.grid`/`.badge` classes) + scoped component styles. No CSS framework; accent `#646cff`.
- **Browser-only APIs assumed**: `AudioContext`, `localStorage`, `location.hash`. Never add Node-dependent code to `src/`.
- **Safari note**: `AudioContext` constructor typed without `latencyHint` but supports it at runtime — keep the cast/workaround comment in `metronome.ts`.

## Important Files

- `src/main.ts` — entry point (`mount(App, ...)`).
- `src/App.svelte` — root component + hash router (route table here; register new pages in `routes`).
- `src/lib/metronome.ts` — metronome engine + singleton (reference pattern for future tool engines).
- `src/lib/Metronome.svelte` — engine UI binding (singleton/state pattern reference).
- `src/lib/drinkMix.ts` — drink mix engine: pure functions, literature-derived targets, input normalization/validation.
- `src/lib/DrinkMix.svelte` — drink mix UI binding (form-driven `$derived` chain reference).
- `vite.config.ts` — PWA/manifest/workbox config; `pwa-assets.config.ts` — icon generation.
- `tsconfig.json` — solution-style: references `tsconfig.app.json` (src) and `tsconfig.node.json` (vite.config.ts only; `pwa-assets.config.ts` and `svelte.config.js` are not typechecked).
- `index.html` — minimal shell; manifest link + theme-color injected at build by the PWA plugin.
- `README.md` — stock create-vite template README (template rationale, not project docs).

## Runtime/Tooling Preferences

- **Package manager**: npm (only `package-lock.json` exists). Node ≥ 20.19 / 22.12 / 24 (Vite 7 requirement); no `engines` field is declared.
- **ESM everywhere** (`"type": "module"`); module scripts, no CommonJS.
- `overrides` pin `sharp`/`sharp-ico` — don't bump them casually (asset generation).
- Deployment target is **root path** (`start_url`/`scope` = `/`). A subpath host would need a Vite `base` change plus SW scope review.

## Testing & QA

- **No test framework, test files, CI, linter, or formatter exist.** No `.github/`, no git hooks, no eslint/prettier config.
- Verification today = `npm run check` (typecheck) + manual/browser smoke testing (dev server + real interaction; e.g. metronome state across hash navigation).
- `src/lib/Counter.svelte` and `src/assets/svelte.svg` are dead create-vite scaffold leftovers, not referenced anywhere — don't build on them.
- If adding tests, the untested business logic targets are `src/lib/metronome.ts` (pure scheduling logic) and `src/lib/drinkMix.ts` (pure arithmetic); vitest fits the existing Vite toolchain and needs no new wiring beyond `tsconfig`.
