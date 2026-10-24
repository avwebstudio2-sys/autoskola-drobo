import {
  collection, doc, getDoc, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore/lite';
import { db } from './db.js';
import { DEFAULT_SETTINGS, DEFAULTS } from './defaults.js';

export { DEFAULT_SETTINGS, DEFAULTS, EXAM_TYPES, PROGRAMS, todayISO } from './defaults.js';

const sorters = {
  examDates: (a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`),
  default: (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
};

export async function getSettings() {
  if (!db) return { ...DEFAULT_SETTINGS };
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    return { ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) };
  } catch (err) {
    console.warn('Postavke nisu učitane, koristim zadane.', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Lista iz kolekcije; prazna kolekcija ili greška vraća zadani sadržaj. */
export async function getList(name) {
  const fallback = DEFAULTS[name] || [];
  if (!db) return [...fallback];
  try {
    const snap = await getDocs(collection(db, name));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!items.length) return [...fallback];
    return items.sort(sorters[name] || sorters.default);
  } catch (err) {
    console.warn(`Kolekcija ${name} nije učitana.`, err);
    return [...fallback];
  }
}

export async function submitEnrollment(data) {
  if (!db) throw new Error('Baza nije podešena.');
  return addDoc(collection(db, 'enrollments'), {
    ...data, consent: true, status: 'nova', createdAt: serverTimestamp(),
  });
}

export async function submitMessage(data) {
  if (!db) throw new Error('Baza nije podešena.');
  return addDoc(collection(db, 'messages'), { ...data, read: false, createdAt: serverTimestamp() });
}
