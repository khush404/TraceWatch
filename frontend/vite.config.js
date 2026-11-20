import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // API Gateway – service health, simulate, etc.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Prometheus – metrics queries
      '/prometheus': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prometheus/, ''),
      },
      // Jaeger – trace queries
      '/jaeger': {
        target: 'http://localhost:16686',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jaeger/, ''),
      },
    },
  },
})
