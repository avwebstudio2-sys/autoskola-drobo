import { initializeApp } from 'firebase/app';
import { PROJECT_CONFIG } from './firebase-config.js';

const env = import.meta.env;

/* Emulator samo uz `npm run dev:emulator` (Vite mode "emulator"), nikad u produkcijskom buildu. */
export const useEmulator = env.MODE === 'emulator' || env.VITE_USE_EMULATOR === 'true';

/* Konfiguracija je u firebase-config.js; varijable VITE_FIREBASE_* (vidi .env.example) je mogu pregaziti. */
const config = useEmulator
  ?{ apiKey: 'demo-key', authDomain: 'demo-drobo.firebaseapp.com', projectId: 'demo-drobo' }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY || PROJECT_CONFIG.apiKey,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || PROJECT_CONFIG.authDomain,
      projectId: env.VITE_FIREBASE_PROJECT_ID || PROJECT_CONFIG.projectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || PROJECT_CONFIG.storageBucket,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || PROJECT_CONFIG.messagingSenderId,
      appId: env.VITE_FIREBASE_APP_ID || PROJECT_CONFIG.appId,
    };

export const firebaseReady = Boolean(config.projectId);

export const app = firebaseReady ? initializeApp(config) : null;
