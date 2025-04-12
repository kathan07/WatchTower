import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
