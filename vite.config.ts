import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this repo at https://chizance.github.io/lootcacheqr/
// so every asset URL needs that subpath prefix — Vite's `base` handles this everywhere
// except the manifest, which we set separately below with the same prefix.
// (This whole BASE_PATH goes away in favor of '/' once the custom domain,
// lootcacheqr.is-a.dev, is live — see docs/SETUP.md.)
const BASE_PATH = '/lootcacheqr/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'LootcacheQR',
        short_name: 'LootcacheQR',
        description: 'Personal storage bin inventory with QR codes and search',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#c2410c',
        theme_color: '#c2410c',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell; bin data/photos come from Supabase over the network.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})
