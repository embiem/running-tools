import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), VitePWA({
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
  })],
})