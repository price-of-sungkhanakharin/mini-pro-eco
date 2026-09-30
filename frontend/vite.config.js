import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/logs': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/image': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/json-sidecar': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/telemetry': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/latest': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/settings': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/api/roi': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    },
  },
})
