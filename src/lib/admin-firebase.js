/* Puni Firestore (žive liste) i prijava — učitava se samo u administraciji. */
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { app, useEmulator } from './firebase.js';

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

if (useEmulator && app) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
