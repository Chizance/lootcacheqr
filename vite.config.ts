import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a repo at /repo-name/, so every asset URL needs that
// subpath prefix. VITE_BASE_PATH is injected by the Actions workflow from the
// actual repo name (see deploy.yml), so forks get the right path automatically.
// Falls back to /lootcacheqr/ for local dev and for the original repo.
const BASE_PATH = process.env.VITE_BASE_PATH ?? '/lootcacheqr/'

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
