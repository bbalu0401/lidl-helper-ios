import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './', // index.html a gyökérben
  build: {
    outDir: 'dist'
  }
})
