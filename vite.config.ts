import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Fixed port: IndexedDB data belongs to the exact origin, so a different port would look like an
  // empty app. 5174 because the expense app already uses 5173. Fail instead of silently switching.
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'My Meters',
        short_name: 'My Meters',
        description: 'Meter reading tracker: units used this month, daily average and alerts',
        theme_color: '#0b1220',
        background_color: '#eef2f6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache fonts and icons too (default is js/css/html only), so the app looks right offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // SPA: serve index.html for client-side routes when offline.
        navigateFallback: '/index.html',
      },
    }),
  ],
})
