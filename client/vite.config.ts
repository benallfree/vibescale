/// <reference types="vite/client" />
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

config()

export default defineConfig({
  plugins: [tailwindcss(), ViteEjsPlugin(), imagetools(), ViteImageOptimizer()],
  build: {
    target: 'esnext',
  },
  server: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    proxy: {
      '/websocket': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
    allowedHosts: true,
  },
})
