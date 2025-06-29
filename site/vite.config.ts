/// <reference types="vite/client" />
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

config()

export default defineConfig({
  plugins: [tailwindcss(), ViteEjsPlugin(), imagetools(), ViteImageOptimizer(), cloudflare()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: '/index.html',
      },
    },
  },
  server: {
    allowedHosts: true,
  },
})
