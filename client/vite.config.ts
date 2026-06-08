import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the React app runs on :5173 and proxies /api to the Express backend on :3000,
// so cookies stay same-origin (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    // Production build output — Express can later serve this folder.
    outDir: 'dist',
  },
});
