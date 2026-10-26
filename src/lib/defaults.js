/* Zadani sadržaj: prikazuje se dok admin ne unese svoj (ili ako baza nije dostupna). */

export const DEFAULT_SETTINGS = {
  slogan: 'Edukacija – Kandidat – Sigurnost',
  heroText: 'Teorijska i praktična nastava za sve kategorije u Travniku, uz besplatno online učenje testova.',
  address: 'Konatur bb, 72270 Travnik',
  phone: '030 501-433',
  phone2: '',
  email: 'edukacijadrobo@bih.net.ba',
  facebook: 'https://www.facebook.com/edukacijadrobo',
  hours: 'Po dogovoru, nazovite nas za termin',
  mapQuery: 'Autoškola Edukacija Drobo, Konatur, Travnik',
  announcement: '',
  requiredDocs: [
    'Ljekarsko uvjerenje o zdravstvenoj sposobnosti za upravljanje motornim vozilom',
    'Kopija lične karte',
  ],
  docsNote: 'Dokumente donesite lično u prostorije autoškole prije početka nastave. Javićemo vam se telefonom radi potvrde upisa.',
  passPercent: 90,
  firstAidCount: 20,
  testTheory: 20,
  testSigns: 10,
  testIntersections: 10,
};

export const DEFAULTS = {
  services: [
    { id: 's1', order: 1, icon: 'book', title: 'Teorijska nastava',
      text: 'Predavanja iz saobraćajnih propisa, znakova i raskrsnica, uz ciljanu pripremu za teorijski ispit i ispit iz prve pomoći.' },
    { id: 's2', order: 2, icon: 'wheel', title: 'Praktična nastava',
      text: 'Obuka iz upravljanja motornim vozilom za sve kategorije, od poligona do gradske i vangradske vožnje, sa iskusnim instruktorima.' },
    { id: 's3', order: 3, icon: 'laptop', title: 'Online učenje testova',
      text: 'Besplatne lekcije i simulacije ispita sa svim pitanjima iz zvaničnog kataloga: teorija, znakovi, raskrsnice i prva pomoć.' },
  ],
  categories: [
    { id: 'c1', order: 1, code: 'AM · A1 · A', name: 'Mopedi i motocikli', text: 'Od mopeda do motocikla bez ograničenja snage.' },
    { id: 'c2', order: 2, code: 'B', name: 'Putnički automobili', text: 'Najtraženija kategorija, vozila do 3.500 kg.' },
    { id: 'c3', order: 3, code: 'BE', name: 'Automobil s prikolicom', text: 'Skup vozila sa prikolicom preko 750 kg.' },
    { id: 'c4', order: 4, code: 'C1 · C', name: 'Teretna vozila', text: 'Kamioni do i preko 7.500 kg.' },
    { id: 'c5', order: 5, code: 'CE', name: 'Kamion s prikolicom', text: 'Teški skup vozila za profesionalne vozače.' },
    { id: 'c6', order: 6, code: 'D', name: 'Autobusi', text: 'Prevoz putnika, više od 8 sjedišta.' },
    { id: 'c7', order: 7, code: 'T', name: 'Traktori', text: 'Traktori i radne mašine.' },
  ],
  faq: [
    { id: 'f1', order: 1, q: 'Koji dokumenti su potrebni za upis?',
      a: 'Ljekarsko uvjerenje o zdravstvenoj sposobnosti za upravljanje motornim vozilom i kopija lične karte. Dokumente donesite prije početka nastave.' },
    { id: 'f2', order: 2, q: 'Mogu li kod vas polagati samo teoriju, a vožnju u drugoj autoškoli?',
      a: 'Da. U formi za upis odaberite „Samo teorija“ i upišite naziv autoškole u kojoj pohađate praktičnu nastavu.' },
    { id: 'f3', order: 3, q: 'Da li je online učenje testova besplatno?',
      a: 'Jeste. Lekcije i simulacije ispita su besplatne i dostupne svima, sa pitanjima iz zvaničnog kataloga ispitnih pitanja.' },
    { id: 'f4', order: 4, q: 'Kada su ispitni rokovi?',
      a: 'Svi termini teorijskih ispita, ispita iz prve pomoći i vožnje objavljeni su na stranici „Ispitni rokovi“ i redovno se ažuriraju.' },
    { id: 'f5', order: 5, q: 'Sa koliko godina mogu upisati B kategoriju?',
      a: 'Za B kategoriju potrebno je navršenih 18 godina. Za uslove ostalih kategorija nazovite nas i rado ćemo vas uputiti.' },
    { id: 'f6', order: 6, q: 'Šta ako ne položim ispit iz prvog pokušaja?',
      a: 'Ispit možete ponovo prijaviti u narednom roku. Pomoći ćemo vam da kroz dodatne časove i online simulacije ispravite slabe tačke.' },
  ],
  classSchedule: [],
  examDates: [],
};

export const EXAM_TYPES = {
  teorija: 'Teorijski ispit',
  prva_pomoc: 'Prva pomoć',
  voznja: 'Vožnja',
};

export const PROGRAMS = {
  teorija: 'Samo teorija',
  teorija_voznja: 'Teorija i vožnja',
};

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Termini časova: admin bira dan i lokaciju iz ovih lista */
export const WEEKDAYS = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
export const CLASS_LOCATIONS = {
  ucionica: 'Učionica autoškole',
  crveni_kriz: 'Crveni križ Travnik',
};
export const CLASS_TYPES = {
  teorija: 'Teorijska nastava',
  prva_pomoc: 'Prva pomoć',
};

const dayIndex = (day) => {
  const i = WEEKDAYS.indexOf(day);
  return i === -1 ? WEEKDAYS.length : i;
};

const sorters = {
  examDates: (a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`),
  classSchedule: (a, b) => dayIndex(a.day) - dayIndex(b.day)
    || String(a.time || '').localeCompare(String(b.time || ''))
    || (Number(a.order) || 0) - (Number(b.order) || 0),
  default: (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
};

/** Sortira listu iz baze kao na stranici (ispitni rokovi po datumu, ostalo po rednom broju). */
export function sortList(name, items) {
  return [...items].sort(sorters[name] || sorters.default);
}
