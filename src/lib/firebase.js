import { initializeApp } from 'firebase/app';

const env = import.meta.env;
export const useEmulator = env.VITE_USE_EMULATOR === 'true';

const config = useEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-drobo.firebaseapp.com', projectId: 'demo-drobo' }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };

/** false dok vlasnik ne upiše Firebase podatke u .env — stranica tada prikazuje zadani sadržaj. */
export const firebaseReady = Boolean(config.projectId);

export const app = firebaseReady ? initializeApp(config) : null;
