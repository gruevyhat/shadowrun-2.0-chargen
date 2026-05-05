import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo path on GitHub Pages: https://gruevyhat.github.io/shadowrun-2.0-chargen/
export default defineConfig({
  plugins: [react()],
  base: '/shadowrun-2.0-chargen/',
})
