import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: app served at "/" on :5173, proxies /api to the Express backend on :3000.
// Build: assets are emitted under "/admin/" so Express can serve the SPA at /admin.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
}));
