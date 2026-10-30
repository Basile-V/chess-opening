import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] },
      manifest: {
        name: 'Chess Opening',
        short_name: 'Ouvertures',
        description: 'Mon répertoire d’ouvertures, hors ligne',
        lang: 'fr',
        display: 'standalone',
        theme_color: '#1c1b19',
        background_color: '#1c1b19',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
