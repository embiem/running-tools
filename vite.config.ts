import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Compiles messages/{locale}.json into typed message functions in
    // src/paraglide (generated, gitignored) on dev start, on every message edit
    // and on build. Same options as the `i18n` script in package.json, which
    // compiles for `npm run check` and `npm run narrate` without Vite.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // One module per locale rather than per message: ~800 messages would
      // otherwise be ~800 modules for the dev server to load.
      outputStructure: 'locale-modules',
      // What Paraglide's own getLocale() would resolve. src/lib/i18n.svelte.ts
      // replaces getLocale() with a rune and resolves the first locale the
      // same way (a saved choice, then the browser's languages, then English).
      strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
    }),
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'running-tools',
        short_name: 'running-tools',
        description: 'Tools for runners',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
      },

      workbox: {
        // mp3: the guided-workout narration clips (src/assets/narration), so
        // the workouts run offline without having been played online first.
        // woff2: the bundled Archivo font, so the offline app keeps its type.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mp3,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
})
