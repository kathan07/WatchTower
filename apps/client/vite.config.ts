import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/shared/src/index.ts'
)

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@repo/shared': sharedEntry,
    },
  },
  server:{
    port: 5173,
    proxy:{
      '/api': { 
        target: process.env.SERVER_URL_LOCAL,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
