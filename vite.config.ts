import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// TwitterSL v2 — single web build serves browser preview AND Capacitor webDir.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@capacitor/community/secure-storage',
        '@capacitor/background-task',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@capacitor/community/secure-storage': '/src/native/__mocks__/secure-storage.ts',
      '@capacitor/background-task': '/src/native/__mocks__/background-task.ts',
    },
  },
});
