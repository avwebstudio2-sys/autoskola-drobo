/*
 * Puni LOKALNE Firebase emulatore probnim podacima (ne dira produkcijsku bazu).
 * Pokretanje: npm run emulators   (u drugom terminalu)  pa  npm run seed:emulator
 *
 * Probni administrator za lokalno testiranje:
 *   e-mail:  admin@drobo.test
 *   lozinka: Drobo-Test-2026!
 */
const PROJECT = 'demo-drobo';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN = { email: 'admin@drobo.test', password: 'Drobo-Test-2026!' };

const toValue = (v) => {
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v && typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v ?? '') };
};
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

async function ensureAdmin() {
  const url = (op) => `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:${op}?key=demo-key`;
  let res = await fetch(url('signUp'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ADMIN, returnSecureToken: true }),
  });
  if (!res.ok) {
    res = await fetch(url('signInWithPassword'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ADMIN, returnSecureToken: true }),
    });
  }
  const { localId } = await res.json();
  await put(`admins/${localId}`, { email: ADMIN.email });
  return localId;
}

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const uid = await ensureAdmin();
console.log('Administrator:', ADMIN.email, uid);

const schedule = [
  { day: 'Ponedjeljak', time: '17:00 – 18:30', title: 'Teorijska nastava', note: 'Saobraćajni propisi i znakovi', category: 'Sve kat.', order: 1 },
  { day: 'Srijeda', time: '17:00 – 18:30', title: 'Teorijska nastava', note: 'Raskrsnice i prvenstvo prolaza', category: 'Sve kat.', order: 2 },
  { day: 'Petak', time: '16:00 – 17:30', title: 'Prva pomoć', note: 'Priprema za ispit iz prve pomoći', category: '', order: 3 },
  { day: 'Pon – Sub', time: 'Po dogovoru', title: 'Praktična nastava', note: 'Termin dogovarate sa instruktorom', category: 'Sve kat.', order: 4 },
];
for (const [i, row] of schedule.entries()) await put(`classSchedule/primjer-${i + 1}`, row);

const exams = [
  { type: 'teorija', category: 'B', date: addDays(9), time: '09:00', location: 'MUP SBK, Travnik', note: '' },
  { type: 'prva_pomoc', category: '', date: addDays(12), time: '10:00', location: 'Crveni križ Travnik', note: 'Ponijeti ličnu kartu' },
  { type: 'voznja', category: 'B', date: addDays(16), time: '08:00', location: 'Poligon Travnik', note: '' },
  { type: 'voznja', category: 'C', date: addDays(23), time: '08:00', location: 'Poligon Travnik', note: '' },
  { type: 'teorija', category: 'A, C, D', date: addDays(30), time: '09:00', location: 'MUP SBK, Travnik', note: '' },
  { type: 'teorija', category: 'B', date: addDays(-20), time: '09:00', location: 'MUP SBK, Travnik', note: '' },
];
for (const [i, row] of exams.entries()) await put(`examDates/primjer-${i + 1}`, row);

console.log('Gotovo: probni raspored časova i ispitni rokovi upisani u emulator.');
