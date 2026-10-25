import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import prerender from './scripts/prerender-plugin.mjs';

const page = (name) => resolve(import.meta.dirname, name);

export default defineConfig({
  // Sadržaj, meta oznake, JSON-LD, robots.txt i sitemap.xml se upisuju pri buildu (vidi scripts/prerender-plugin.mjs)
  plugins: [prerender()],
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
