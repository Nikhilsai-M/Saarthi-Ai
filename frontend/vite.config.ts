import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: '/' = production-style root URLs: /, /courses, /courses/1 (no subpath)
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
