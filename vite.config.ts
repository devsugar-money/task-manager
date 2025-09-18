import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: true,
    exclude: []
  },
  server: {
    port: 4444,
    host: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  cacheDir: '.vite-new',
  build: {
    rollupOptions: {
      cache: false
    }
  }
});
