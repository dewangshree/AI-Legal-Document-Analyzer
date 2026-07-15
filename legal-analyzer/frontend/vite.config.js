// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
