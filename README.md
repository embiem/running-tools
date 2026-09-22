# running-tools

A small collection of offline-friendly tools for runners, built as an installable PWA with Svelte 5, TypeScript, and Vite.

## Tools

- **Cadence Metronome**: an audible beat at 120-220 steps/min to help you lock in your running cadence. The tempo persists between sessions, and the beat keeps playing as you navigate between pages.
- **Race Predictor**: coming soon.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build (includes service worker and PWA icons)
npm run preview  # serve the production build locally
npm run check    # typecheck (svelte-check + tsc)
```

## Notes

- Routes are hash-based (`/#/metronome`), so every page works fully offline from the precached service worker shell.
- The app is installable. When a new version is deployed, a reload prompt appears in the app.
