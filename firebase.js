import { initializeApp } from 'firebase/app';

const env = import.meta.env;

/* Emulator samo uz `npm run dev:emulator` (Vite mode "emulator"), nikad u produkcijskom buildu. */
export const useEmulator = env.MODE === 'emulator' || env.VITE_USE_EMULATOR === 'true';

/*
 * Firebase web konfiguracija projekta „autoskola-drobo“.
 * Ovo su javni identifikatori aplikacije (vide se u svakom pregledniku), nisu tajna:
 * podatke štite pravila u firestore.rules. Mogu se pregaziti varijablama VITE_FIREBASE_* (vidi .env.example).
 */
const PROJECT_CONFIG = {
  apiKey: 'AIzaSyDWj0rXIoWjMzgPNgnhNGutTRNEzyimK04',
  authDomain: 'autoskola-drobo.firebaseapp.com',
  projectId: 'autoskola-drobo',
  storageBucket: 'autoskola-drobo.firebasestorage.app',
  messagingSenderId: '1086160193833',
  appId: '1:1086160193833:web:679851d191f8fdee4bcf38',
};

const config = useEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-drobo.firebaseapp.com', projectId: 'demo-drobo' }
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
