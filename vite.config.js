import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        laboratory: resolve(import.meta.dirname, 'index.html'),
        tutorial: resolve(import.meta.dirname, 'tutorial/index.html')
      }
    }
  }
});
