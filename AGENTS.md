# Repository Guidelines

## Project Overview

`running-tools` is a client-only Svelte 5 + TypeScript + Vite 7 SPA/installable PWA of small utilities for runners. Zero backend, zero runtime `dependencies` (everything is a devDependency). Four tools are implemented: a **cadence metronome** (Web Audio), a **drink mix calculator** (pure arithmetic over literature-derived targets), a **race predictor** (equivalent performances, a pace plan and Daniels training paces from one recent result, over the Riegel and Daniels/Gilbert models) and a **taper planner** (pure date and volume arithmetic over the tapering literature). Home page is a card grid; unimplemented tools render as placeholders.

## Architecture & Data Flow

- **Routing**: hand-rolled hash routing in `src/App.svelte` — no router library. A `routes` map (`'/'` → `src/pages/Home.svelte`, `'/metronome'` → `src/pages/MetronomePage.svelte`, `'/drink-mix'` → `src/pages/DrinkMixPage.svelte`, `'/taper-planner'` → `src/pages/TaperPlannerPage.svelte`, `'/race-predictor'` → `src/pages/RacePredictorPage.svelte`), `location.hash` read + `hashchange` listener, unknown routes fall back to `/`. `PWABadge` is mounted once, in `App.svelte` — do not mount it again in a page.
  - Rationale (documented in `App.svelte` comments): hash routes work from the precached service-worker shell with no server rewrite config → every route works fully offline. **Do not introduce path-based routing or SvelteKit.**
- **Metronome**: framework-free engine in `src/lib/metronome.ts` (Web Audio "lookahead scheduler": 25 ms `setInterval` polls, schedules clicks up to 120 ms ahead on the audio clock — sample-accurate, throttling-immune). Exported as a **module-level singleton** `export const metronome = new Metronome()`; one engine per app must survive route changes.
- **UI ↔ engine contract**: `src/lib/Metronome.svelte` binds to the singleton, mirrors `metronome.running` into local `$state` on mount, and one `$effect` is the single source of truth pushing `bpm` → `metronome.bpm` + `localStorage` (`metronome.bpm`). Never instantiate `Metronome` in components.
- **Drink mix**: stateless pure functions in `src/lib/drinkMix.ts` — no class, no singleton, no DOM. `computeMix(input)` returns the recipe (grams of table salt / potassium chloride / sugar), what the batch delivers (sodium, potassium, carbohydrate, kcal, osmolality → tonicity), coverage of the session plan and the advice flags. `normalizeMixInput` turns any raw value into a valid `MixInput`; `isCompleteMixInput` reports whether every field is filled. Preset targets and concentration caps are derived from the ACSM / joint position-stand literature cited in the module header — **not** from commercial drink formulations.
- **Race predictor**: stateless pure functions in `src/lib/racePredictor.ts` — same shape as the drink mix engine. `predictRace(input, today?)` turns one recent result into a VDOT fitness score, then returns equivalent performances at every standard distance from two independent models (Riegel's `T₂ = T₁ × (D₂/D₁)^1.06` and Daniels/Gilbert's VO₂ ÷ %VO₂max, bisected on the duration it is solving for), the training-pace bands that VDOT implies (Daniels' 59–74 / 75–84 / 83–88 / 97–100 / 105–110 % bands, each paced by inverting the VO₂ quadratic), the goal race's split plan (even, or a linear ramp whose second half averages 1.5% faster — run at the models' predicted pace or at the runner's own `goalPaceSecPerKm` override) and the advice flags. `normalizeRaceInput` validates anything raw (the `mm:ss` / `h:mm:ss` time string included) into a `RaceInput`; `isCompleteRaceInput` gates persistence; `parseDuration` / `formatDuration` / `parsePace` / `formatPaceClock` / `formatPace` / `formatPaceRange` / `formatDistance` are shared with the UI. The module header cites what is literature and what is layout.
- **Taper planner**: stateless pure functions in `src/lib/taperPlanner.ts` — same shape as the drink mix engine. `predictTaper(input, today?)` counts the taper back from race day: the weekly training volume decays geometrically (bisection-solved so the taper window lands 50% below the same number of normal weeks, the middle of the 41–60% band Bosquet 2007 found optimal), then each week's volume is split over its runs and rounded to something runnable (largest remainders, so a week's days add up to the week's target instead of drifting above it). It returns the week and day schedules plus the realized volume reduction and the advice flags. `normalizeTaperInput` validates anything raw (dates included) into a `TaperInput`; `isCompleteTaperInput` gates persistence; `formatDistance`/`todayISO` are shared with the UI. Session *types* (long run, sharpener, day-before strides, rest two days out) are documented convention, not measurement — the module header says which parts are literature and which are layout. The defaults (a 40 km / 25 mi week, 4 runs a week) and the volume thresholds come from the 158,117 recreational marathoners in Smyth & Lawlor 2021, cited in the header.
- **PWA**: `vite-plugin-pwa` with `registerType: 'prompt'`, `injectRegister: false` — SW registration is manual via `src/lib/PWABadge.svelte` (`virtual:pwa-register/svelte`). PWA icons are generated at build time from `public/favicon.svg` via `pwa-assets.config.ts` (`minimal2023Preset`), emitted into `dist/`.
- **Data flow**: user input → Svelte runes state → engine mutation / `localStorage` → Web Audio scheduling. No network calls, no stores beyond Svelte built-ins. The drink mix, race predictor and taper planner tools are the same shape without audio: `input` → `$derived(normalize…Input(input))` → `$derived(computeMix(…) / predictRace(…) / predictTaper(…))`, so one validated snapshot feeds every figure on the page. The race predictor and taper planner additionally derive their flags from today's date, passed in rather than read inside the maths.

## Key Directories

- `src/pages/` — route-level pages (Home grid, MetronomePage, DrinkMixPage, RacePredictorPage and TaperPlannerPage wrappers).
- `src/lib/` — reusable components and logic (`metronome.ts` engine, `Metronome.svelte` UI, `drinkMix.ts` engine, `DrinkMix.svelte` UI, `racePredictor.ts` engine, `RacePredictor.svelte` UI, `taperPlanner.ts` engine, `TaperPlanner.svelte` UI, `flags.ts` shared advice-flag type, `Panel.svelte` shared input panel, `PWABadge.svelte` update toast).
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
- **Engine/UI separation**: platform logic lives in plain TS (`src/lib/*.ts`) — a class plus module-level singleton when state must survive navigation (`metronome.ts`), pure functions when it must not (`drinkMix.ts`, `taperPlanner.ts`); `.svelte` files are thin bindings with scoped `<style>` blocks. Follow this split for new tools.
- **Private class fields** (`#ctx`, `#timer`) for engine internals; public surface kept minimal (`bpm`, `running` getter, `start()`/`stop()`).
- **TypeScript strict** (`@tsconfig/svelte` → strict, `verbatimModuleSyntax`; ES2022; `allowJs`/`checkJs` on for `src/`). Use `interface`/types for data shapes (see `Tool` in `Home.svelte`).
- **State persistence**: validated `localStorage` read + write in the same `$effect` that drives the engine (see `STORAGE_KEY` pattern in `Metronome.svelte`). Where a bound form can be transiently incomplete, gate the write on completeness (`isCompleteMixInput`, `isCompleteRaceInput`, `isCompleteTaperInput`) so a half-typed field cannot persist a fallback over the last good value (`DrinkMix.svelte`, `RacePredictor.svelte`, `TaperPlanner.svelte`).
- **Accessibility**: aria-labels on controls (`aria-label="Cadence in steps per minute"`), `role="alert"` toast, semantic `<details>` for info copy. Keep this up.
- **Styling**: global `src/app.css` (dark-first, `color-scheme: light dark`, shared `.card`/`.grid`/`.badge` classes) + scoped component styles. No CSS framework; accent `#646cff`.
- **Input panels**: each group of inputs renders through `src/lib/Panel.svelte` (`<Panel title="…" hint="…">`), which owns the border, tint, heading and hint. Results are left unboxed, so a box always means "you set this". A tool's root is `<section class="tool">` carrying the width/centring/gap stack — `Panel` renders a `<section>` too, so keep that layout rule on `.tool`, never on the bare `section` selector.
- **Browser-only APIs assumed**: `AudioContext`, `localStorage`, `location.hash`. Never add Node-dependent code to `src/`.
- **Safari note**: `AudioContext` constructor typed without `latencyHint` but supports it at runtime — keep the cast/workaround comment in `metronome.ts`.

## Important Files

- `src/main.ts` — entry point (`mount(App, ...)`).
- `src/App.svelte` — root component + hash router (route table here; register new pages in `routes`).
- `src/lib/metronome.ts` — metronome engine + singleton (reference pattern for future tool engines).
- `src/lib/Metronome.svelte` — engine UI binding (singleton/state pattern reference).
- `src/lib/drinkMix.ts` — drink mix engine: pure functions, literature-derived targets, input normalization/validation.
- `src/lib/DrinkMix.svelte` — drink mix UI binding (form-driven `$derived` chain reference).
- `src/lib/racePredictor.ts` — race predictor engine: pure functions over one race result, Riegel and Daniels/Gilbert models, training-pace bands, split plan, input normalization/validation.
- `src/lib/RacePredictor.svelte` — race predictor UI binding (text/number/date/select form over the same `$derived` chain).
- `src/lib/taperPlanner.ts` — taper planner engine: pure functions over local dates and training volume, literature-derived volume model, schedule layout.
- `src/lib/TaperPlanner.svelte` — taper planner UI binding (date/number/select form over the same `$derived` chain).
- `src/lib/flags.ts` — shared `Flag` type (`{ level: 'warn' | 'info'; message: string }`) returned by the drink mix, race predictor and taper planner engines; no logic, one declaration.
- `src/lib/Panel.svelte` — shared input panel (`title`, optional `hint`, children snippet): one box per input group, so the border/tint/hint styling lives in one place. Used by the drink mix, race predictor and taper planner UIs.
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
- If adding tests, the untested business logic targets are `src/lib/metronome.ts` (pure scheduling logic), `src/lib/drinkMix.ts` (pure arithmetic), `src/lib/racePredictor.ts` (model arithmetic and split plan — `predictRace` takes `today` as an optional argument precisely so it can be asserted deterministically) and `src/lib/taperPlanner.ts` (date arithmetic and volume model — `predictTaper` takes `today` as an optional argument precisely so it can be asserted deterministically); vitest fits the existing Vite toolchain and needs no new wiring beyond `tsconfig`.
