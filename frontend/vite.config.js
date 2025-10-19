import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: '../postcss.config.js', // 👈 tell Vite where to find PostCSS
  },
})