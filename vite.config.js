import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name) => resolve(import.meta.dirname, name);

export default defineConfig({
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/firestore/lite', 'firebase/auth'],
  },
  build: {
    // Admin paket sadrži puni Firebase SDK (Firestore + Auth); javne stranice koriste Firestore Lite.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: page('index.html'),
        testovi: page('testovi.html'),
        ispiti: page('ispiti.html'),
        admin: page('admin.html'),
      },
    },
  },
});
