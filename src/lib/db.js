/* Lagana verzija Firestore-a za javne stranice (čitanje sadržaja, slanje prijava i poruka). */
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore/lite';
import { app, useEmulator } from './firebase.js';

export const db = app ? getFirestore(app) : null;
if (db && useEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);
