import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseReady } from '../lib/firebase.js';
import { db, auth } from '../lib/admin-firebase.js';
import { DEFAULTS, DEFAULT_SETTINGS, EXAM_TYPES, PROGRAMS, WEEKDAYS, CLASS_LOCATIONS, CLASS_TYPES, sortList, todayISO } from '../lib/defaults.js';
import { logoSVG, icon, esc, toast, formatDate } from '../lib/ui.js';
import { initCustomSelects } from '../lib/select.js';

/* ==========================================================================
   Administracija: sve što se vidi na stranici uređuje se ovdje.
   ========================================================================== */

const root = document.getElementById('admin-root');
initCustomSelects();
const dialog = document.getElementById('edit-dialog');

const STATUSES = {
  nova: 'Nova',
  kontaktiran: 'Kontaktiran',
  upisan: 'Upisan',
  odustao: 'Odustao',
};

const CATEGORY_CODES = ['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T'];

/* Kolekcije koje se uređuju kroz istu tabelu + formu */
const COLLECTIONS = {
  examDates: {
    title: 'Ispitni rokovi', icon: 'calendar', single: 'ispitni rok',
    hint: 'Termini se prikazuju na stranici „Ispitni rokovi“ i u pregledu na početnoj. Protekli termini se automatski skrivaju.',
    sort: (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    fields: [
      { key: 'type', label: 'Vrsta ispita', type: 'select', options: EXAM_TYPES, required: true },
      { key: 'category', label: 'Kategorija', type: 'text', list: CATEGORY_CODES, placeholder: 'npr. B ili A, C, D (prazno = sve)' },
      { key: 'date', label: 'Datum', type: 'date', required: true },
      { key: 'time', label: 'Vrijeme', type: 'time24' },
      { key: 'location', label: 'Lokacija', type: 'text', placeholder: 'npr. MUP SBK, Travnik' },
      { key: 'note', label: 'Napomena', type: 'text' },
    ],
    columns: [
      { key: 'date', label: 'Datum', render: (r) => `<strong>${esc(formatDate(r.date))}</strong>${r.date < todayISO() ? ' <span class="tag tag--muted">prošao</span>' : ''}` },
      { key: 'time', label: 'Vrijeme' },
      { key: 'type', label: 'Vrsta', render: (r) => `<span class="tag tag--${esc(r.type)}">${esc(EXAM_TYPES[r.type] || r.type)}</span>` },
      { key: 'category', label: 'Kategorija', render: (r) => esc(r.category || 'Sve') },
      { key: 'location', label: 'Lokacija' },
    ],
  },
  classSchedule: {
    title: 'Termini časova', icon: 'clock', single: 'termin',
    hint: 'Raspored časova na početnoj stranici (sekcija „Termini časova“). Termini se sami poredaju po danu i satu.',
    sortAll: (rows) => sortList('classSchedule', rows),
    fields: [
      { key: 'type', label: 'Vrsta nastave', type: 'select', options: CLASS_TYPES, placeholder: 'Odaberite vrstu nastave', required: true },
      { key: 'location', label: 'Lokacija', type: 'select', options: CLASS_LOCATIONS, placeholder: 'Odaberite lokaciju', required: true },
      { key: 'day', label: 'Dan u sedmici', type: 'select', options: Object.fromEntries(WEEKDAYS.map((d) => [d, d])), placeholder: 'Odaberite dan', required: true },
      { key: 'time', label: 'Termin (od – do)', type: 'timerange', required: true },
    ],
    columns: [
      { key: 'day', label: 'Dan', render: (r) => `<strong>${esc(r.day)}</strong>` },
      { key: 'time', label: 'Termin' },
      { key: 'type', label: 'Nastava', render: (r) => esc(CLASS_TYPES[r.type] || r.type || r.title || '') },
      { key: 'location', label: 'Lokacija', render: (r) => esc(CLASS_LOCATIONS[r.location] || r.location || '') },
    ],
  },
  services: {
    title: 'Usluge', icon: 'book', single: 'uslugu', defaults: true,
    hint: 'Kartice u sekciji „Usluge“. Ikona „Online“ dobija istaknutu tamnu karticu i dugme ka testovima, a „Volan“ prikazuje kategorije.',
    fields: [
      { key: 'title', label: 'Naziv', type: 'text', required: true },
      { key: 'text', label: 'Opis', type: 'textarea', required: true },
      { key: 'icon', label: 'Ikona', type: 'select', options: { book: 'Knjiga (teorija)', wheel: 'Volan (vožnja)', laptop: 'Laptop (online učenje)' } },
      { key: 'order', label: 'Redni broj', type: 'number' },
    ],
    columns: [
      { key: 'order', label: '#' },
      { key: 'title', label: 'Naziv', render: (r) => `<strong>${esc(r.title)}</strong>` },
      { key: 'text', label: 'Opis', render: (r) => `<span class="clamp">${esc(r.text)}</span>` },
    ],
  },
  categories: {
    title: 'Kategorije', icon: 'wheel', single: 'kategoriju', defaults: true,
    hint: 'Kategorije za praktičnu nastavu: prikazuju se na početnoj i u padajućem meniju forme za upis.',
    fields: [
      { key: 'code', label: 'Oznaka', type: 'text', required: true, placeholder: 'npr. B ili C1 · C' },
      { key: 'name', label: 'Naziv', type: 'text', required: true },
      { key: 'text', label: 'Kratki opis', type: 'text' },
      { key: 'order', label: 'Redni broj', type: 'number' },
    ],
    columns: [
      { key: 'order', label: '#' },
      { key: 'code', label: 'Oznaka', render: (r) => `<strong>${esc(r.code)}</strong>` },
      { key: 'name', label: 'Naziv' },
      { key: 'text', label: 'Opis' },
    ],
  },
  faq: {
    title: 'Česta pitanja', icon: 'list', single: 'pitanje', defaults: true,
    hint: 'Pitanja i odgovori u sekciji FAQ na početnoj stranici.',
    fields: [
      { key: 'q', label: 'Pitanje', type: 'text', required: true },
      { key: 'a', label: 'Odgovor', type: 'textarea', required: true },
      { key: 'order', label: 'Redni broj', type: 'number' },
    ],
    columns: [
      { key: 'order', label: '#' },
      { key: 'q', label: 'Pitanje', render: (r) => `<strong>${esc(r.q)}</strong>` },
      { key: 'a', label: 'Odgovor', render: (r) => `<span class="clamp">${esc(r.a)}</span>` },
    ],
  },
};

const SETTINGS_FIELDS = [
  { group: 'Kontakt' },
  { key: 'phone', label: 'Telefon', type: 'text' },
  { key: 'phone2', label: 'Drugi telefon (mobitel)', type: 'text' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'address', label: 'Adresa', type: 'text' },
  { key: 'hours', label: 'Radno vrijeme', type: 'text' },
  { key: 'mapQuery', label: 'Lokacija za kartu', type: 'text', hint: 'Tekst po kojem Google Maps traži lokaciju.' },
  { key: 'facebook', label: 'Facebook stranica (link)', type: 'url' },
  { group: 'Početna stranica' },
  { key: 'heroText', label: 'Tekst ispod slogana (hero)', type: 'textarea' },
  { key: 'announcement', label: 'Obavještenje na vrhu stranice', type: 'text', hint: 'Npr. „Upis novih kandidata u toku!“. Ostavite prazno da se ne prikazuje.' },
  { key: 'slogan', label: 'Slogan (podnožje)', type: 'text' },
  { group: 'Nakon prijave za upis' },
  { key: 'requiredDocs', label: 'Potrebna dokumentacija (jedna stavka po redu)', type: 'lines' },
  { key: 'docsNote', label: 'Napomena uz dokumentaciju', type: 'textarea' },
  { group: 'Online testovi' },
  { key: 'passPercent', label: 'Prag za prolaz (%) · 90% = 108 od 120 bodova', type: 'number', min: 1, max: 100 },
  { key: 'testTheory', label: 'Broj pitanja teorije u testu', type: 'number', min: 1, max: 60 },
  { key: 'testSigns', label: 'Broj znakova u testu', type: 'number', min: 0, max: 40 },
  { key: 'testIntersections', label: 'Broj raskrsnica u testu', type: 'number', min: 0, max: 40 },
  { key: 'firstAidCount', label: 'Broj pitanja u testu prve pomoći', type: 'number', min: 1, max: 100 },
];

let unsub = [];
const live = { enrollments: [], messages: [] };

/* ---------- Start ---------- */

if (!firebaseReady) {
  renderSetupNeeded();
} else {
  onAuthStateChanged(auth, async (user) => {
    unsub.forEach((u) => u());
    unsub = [];
    if (!user) { renderLogin(); return; }
    try {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (!adminDoc.exists()) { renderNotAdmin(user); return; }
      renderShell(user);
    } catch (err) {
      console.error(err);
      renderNotAdmin(user);
    }
  });
}

function renderSetupNeeded() {
  root.innerHTML = `
    <div class="auth-wrap"><div class="auth-card">
      <span class="auth-logo">${logoSVG()}</span>
      <h1>Firebase nije podešen</h1>
      <p>Provjerite Firebase konfiguraciju u <code>src/lib/firebase.js</code> (vidi README.md) i ponovo objavite stranicu.</p>
    </div></div>`;
}

function renderLogin() {
  root.innerHTML = `
    <div class="auth-wrap">
      <form class="auth-card form-grid" id="login-form" novalidate>
        <span class="auth-logo">${logoSVG()}</span>
        <h1>Administracija</h1>
        <p class="auth-sub">Prijavite se za uređivanje stranice.</p>
        <div class="field">
          <label for="l-email">E-mail</label>
          <input class="input" id="l-email" type="email" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="l-pass">Lozinka</label>
          <input class="input" id="l-pass" type="password" autocomplete="current-password" required />
        </div>
        <p class="form-status" id="login-status" role="alert"></p>
        <button class="btn btn-primary" type="submit">Prijava</button>
        <button class="link-btn" type="button" id="reset-pass">Zaboravljena lozinka?</button>
        <a class="link-btn" href="/">${icon('arrowLeft', { size: 16 })} Nazad na stranicu</a>
      </form>
    </div>`;
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#l-email').value.trim();
    const pass = form.querySelector('#l-pass').value;
    if (!email || !pass) { status.dataset.type = 'error'; status.textContent = 'Upišite e-mail i lozinku.'; return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    status.textContent = '';
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error(err);
      status.dataset.type = 'error';
      status.textContent = 'Pogrešan e-mail ili lozinka.';
      btn.disabled = false;
    }
  });
  document.getElementById('reset-pass').addEventListener('click', async () => {
    const email = form.querySelector('#l-email').value.trim();
    if (!email) { status.dataset.type = 'error'; status.textContent = 'Upišite e-mail pa kliknite ponovo.'; return; }
    try {
      await sendPasswordResetEmail(auth, email);
      status.dataset.type = 'ok';
      status.textContent = 'Poslali smo link za novu lozinku na vaš e-mail.';
    } catch {
      status.dataset.type = 'error';
      status.textContent = 'Slanje nije uspjelo. Provjerite e-mail adresu.';
    }
  });
}

function renderNotAdmin(user) {
  root.innerHTML = `
    <div class="auth-wrap"><div class="auth-card">
      <span class="auth-logo">${logoSVG()}</span>
      <h1>Nemate administratorski pristup</h1>
      <p>Račun <strong>${esc(user.email)}</strong> nije administrator. Vlasnik u Firebase konzoli treba dodati dokument
      <code>admins/${esc(user.uid)}</code> u Firestore bazu.</p>
      <button class="btn btn-ghost btn-sm" id="logout-btn">${icon('logout', { size: 18 })} Odjava</button>
    </div></div>`;
  document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
}

/* ---------- Okvir ---------- */

const TABS = [
  { id: 'pregled', label: 'Pregled', icon: 'grid' },
  { id: 'prijave', label: 'Prijave za upis', icon: 'users', badge: 'enrollments' },
  { id: 'poruke', label: 'Poruke', icon: 'inbox', badge: 'messages' },
  { id: 'examDates', label: 'Ispitni rokovi', icon: 'calendar' },
  { id: 'classSchedule', label: 'Termini časova', icon: 'clock' },
  { id: 'services', label: 'Usluge', icon: 'book' },
  { id: 'categories', label: 'Kategorije', icon: 'wheel' },
  { id: 'faq', label: 'Česta pitanja', icon: 'list' },
  { id: 'postavke', label: 'Postavke', icon: 'settings' },
];

function renderShell(user) {
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-side">
        <a class="admin-brand" href="/" title="Otvori stranicu">
          <span class="admin-brand-logo">${logoSVG()}</span>
          <span><strong>Edukacija – Drobo</strong><small>Administracija</small></span>
        </a>
        <nav class="admin-nav" aria-label="Administracija">
          ${TABS.map((t) => `<a href="#${t.id}" data-tab="${t.id}">${icon(t.icon, { size: 20 })}<span>${t.label}</span>${t.badge ? `<span class="nav-badge" data-badge="${t.badge}" hidden></span>` : ''}</a>`).join('')}
        </nav>
        <div class="admin-user">
          <span title="${esc(user.email)}">${esc(user.email)}</span>
          <button class="icon-btn" id="logout-btn" aria-label="Odjava" title="Odjava">${icon('logout', { size: 20 })}</button>
        </div>
      </aside>
      <main class="admin-main" id="admin-main" tabindex="-1"></main>
    </div>`;
  document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

  // Žive liste prijava i poruka (za brojače i tabele)
  unsub.push(onSnapshot(collection(db, 'enrollments'), (snap) => {
    live.enrollments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    updateBadges();
    if (currentTab() === 'prijave') renderEnrollments();
    if (currentTab() === 'pregled') renderOverview();
  }));
  unsub.push(onSnapshot(collection(db, 'messages'), (snap) => {
    live.messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    updateBadges();
    if (currentTab() === 'poruke') renderMessages();
    if (currentTab() === 'pregled') renderOverview();
  }));

  window.onhashchange = showTab;
  showTab();
}

const currentTab = () => (location.hash.slice(1) || 'pregled');
let tabUnsub = null;

function showTab() {
  const tab = TABS.some((t) => t.id === currentTab()) ? currentTab() : 'pregled';
  document.querySelectorAll('.admin-nav a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  tabUnsub?.();
  tabUnsub = null;
  const main = document.getElementById('admin-main');
  main.scrollTop = 0;
  if (tab === 'pregled') renderOverview();
  else if (tab === 'prijave') renderEnrollments();
  else if (tab === 'poruke') renderMessages();
  else if (tab === 'postavke') renderSettings();
  else renderCollection(tab);
}

function updateBadges() {
  const counts = {
    enrollments: live.enrollments.filter((e) => e.status === 'nova').length,
    messages: live.messages.filter((m) => !m.read).length,
  };
  document.querySelectorAll('[data-badge]').forEach((b) => {
    const n = counts[b.dataset.badge];
    b.hidden = !n;
    b.textContent = n;
  });
}

function head(title, sub, actions = '') {
  return `
    <header class="admin-head">
      <div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
      <div class="admin-actions">${actions}</div>
    </header>`;
}

const fmtStamp = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return `${d.toLocaleDateString('bs-BA')} ${d.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}`;
};

/* ---------- Pregled ---------- */

async function renderOverview() {
  const main = document.getElementById('admin-main');
  const newOnes = live.enrollments.filter((e) => e.status === 'nova');
  const unread = live.messages.filter((m) => !m.read).length;
  main.innerHTML = `
    ${head('Pregled', 'Dobrodošli u administraciju autoškole.', '<a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener">Otvori stranicu ' + icon('external', { size: 16 }) + '</a>')}
    <div class="stat-grid">
      <a class="stat-card" href="#prijave"><span>${icon('users', { size: 24 })}</span><strong>${newOnes.length}</strong><small>novih prijava</small></a>
      <a class="stat-card" href="#prijave"><span>${icon('list', { size: 24 })}</span><strong>${live.enrollments.length}</strong><small>ukupno prijava</small></a>
      <a class="stat-card" href="#poruke"><span>${icon('inbox', { size: 24 })}</span><strong>${unread}</strong><small>nepročitanih poruka</small></a>
      <a class="stat-card" href="#examDates"><span>${icon('calendar', { size: 24 })}</span><strong id="ov-exams">…</strong><small>narednih ispita</small></a>
    </div>
    <section class="panel">
      <h2>Najnovije prijave</h2>
      ${newOnes.length ? `<ul class="mini-list">${newOnes.slice(0, 6).map((e) => `
        <li><strong>${esc(e.fullName)}</strong><span>${esc(PROGRAMS[e.program] || e.program)}${e.category ? ` · ${esc(e.category)}` : ''}</span><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a></li>`).join('')}</ul>`
        : '<p class="muted">Nema novih prijava.</p>'}
    </section>
    <section class="panel">
      <h2>Brze akcije</h2>
      <div class="quick-actions">
        <button class="btn btn-primary btn-sm" data-quick="examDates">${icon('plus', { size: 18 })} Novi ispitni rok</button>
        <button class="btn btn-dark btn-sm" data-quick="classSchedule">${icon('plus', { size: 18 })} Novi termin časa</button>
        <a class="btn btn-ghost btn-sm" href="#postavke">${icon('settings', { size: 18 })} Postavke</a>
      </div>
    </section>`;
  main.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
    location.hash = b.dataset.quick;
    setTimeout(() => openEditor(b.dataset.quick), 50);
  }));
  // broj narednih ispita
  const off = onSnapshot(collection(db, 'examDates'), (snap) => {
    const el = document.getElementById('ov-exams');
    if (el) el.textContent = snap.docs.filter((d) => (d.data().date || '') >= todayISO()).length;
    off();
  });
}

/* ---------- Prijave za upis ---------- */

const enrollFilter = { status: '', q: '' };

function renderEnrollments() {
  const main = document.getElementById('admin-main');
  const keepFocus = document.activeElement?.id === 'enroll-search';
  const rows = live.enrollments.filter((e) => {
    if (enrollFilter.status && e.status !== enrollFilter.status) return false;
    const q = enrollFilter.q.toLowerCase();
    return !q || `${e.fullName} ${e.phone} ${e.otherSchool}`.toLowerCase().includes(q);
  });
  main.innerHTML = `
    ${head('Prijave za upis', `${live.enrollments.length} prijava ukupno. Nove prijave stižu automatski.`, `<button class="btn btn-ghost btn-sm" id="csv-btn">${icon('download', { size: 18 })} Izvoz (CSV)</button>`)}
    <div class="toolbar">
      <input class="input" type="search" id="enroll-search" placeholder="Pretraži ime, telefon…" value="${esc(enrollFilter.q)}" aria-label="Pretraga prijava" />
      <select class="select" id="enroll-status" aria-label="Filter statusa">
        <option value="">Svi statusi</option>
        ${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}"${enrollFilter.status === k ? ' selected' : ''}>${v}</option>`).join('')}
      </select>
    </div>
    ${rows.length ? `
    <div class="table-wrap">
      <table class="admin-table">
        <thead><tr><th>Prijavljen</th><th>Ime i prezime</th><th>Datum rođenja</th><th>Telefon</th><th>Program</th><th>Kat.</th><th>Druga autoškola</th><th>Status</th><th><span class="sr-only">Akcije</span></th></tr></thead>
        <tbody>
          ${rows.map((e) => `
            <tr class="${e.status === 'nova' ? 'is-new' : ''}">
              <td data-label="Prijavljen">${esc(fmtStamp(e.createdAt))}</td>
              <td data-label="Ime"><strong>${esc(e.fullName)}</strong></td>
              <td data-label="Rođen">${esc(e.dob ? formatDate(e.dob, { weekday: false }) : '')}</td>
              <td data-label="Telefon"><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a></td>
              <td data-label="Program">${esc(PROGRAMS[e.program] || e.program)}</td>
              <td data-label="Kategorija">${esc(e.category || '–')}</td>
              <td data-label="Druga autoškola">${esc(e.otherSchool || '–')}</td>
              <td data-label="Status">
                <select class="select select-sm status-select status-${esc(e.status)}" data-id="${e.id}" aria-label="Status prijave">
                  ${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}"${e.status === k ? ' selected' : ''}>${v}</option>`).join('')}
                </select>
              </td>
              <td><button class="icon-btn icon-btn--danger" data-del="${e.id}" aria-label="Obriši prijavu">${icon('trash', { size: 18 })}</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="empty-state">${icon('users', { size: 32 })}<p>Nema prijava${enrollFilter.status || enrollFilter.q ? ' za odabrani filter' : ''}.</p></div>`}`;

  const search = main.querySelector('#enroll-search');
  search.addEventListener('input', () => { enrollFilter.q = search.value; renderEnrollments(); });
  if (keepFocus) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }
  main.querySelector('#enroll-status').addEventListener('change', (e) => { enrollFilter.status = e.target.value; renderEnrollments(); });
  main.querySelectorAll('.status-select').forEach((s) => s.addEventListener('change', async () => {
    try {
      await updateDoc(doc(db, 'enrollments', s.dataset.id), { status: s.value });
      toast('Status je sačuvan.', 'success');
    } catch (err) { console.error(err); toast('Greška pri čuvanju.', 'error'); }
  }));
  main.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const e = live.enrollments.find((x) => x.id === b.dataset.del);
    if (!confirm(`Obrisati prijavu: ${e?.fullName}?`)) return;
    try { await deleteDoc(doc(db, 'enrollments', b.dataset.del)); toast('Prijava je obrisana.'); } catch (err) { console.error(err); toast('Brisanje nije uspjelo.', 'error'); }
  }));
  main.querySelector('#csv-btn').addEventListener('click', () => exportCsv(rows));
}

function exportCsv(rows) {
  const cols = [
    ['Prijavljen', (e) => fmtStamp(e.createdAt)], ['Ime i prezime', (e) => e.fullName], ['Datum rođenja', (e) => e.dob],
    ['Telefon', (e) => e.phone], ['Program', (e) => PROGRAMS[e.program] || e.program], ['Kategorija', (e) => e.category],
    ['Druga autoškola', (e) => e.otherSchool], ['Status', (e) => STATUSES[e.status] || e.status],
  ];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(([h]) => q(h)).join(';'), ...rows.map((r) => cols.map(([, f]) => q(f(r))).join(';'))].join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `prijave-${todayISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Poruke ---------- */

function renderMessages() {
  const main = document.getElementById('admin-main');
  main.innerHTML = `
    ${head('Poruke', 'Poruke poslane preko kontakt forme.')}
    ${live.messages.length ? `<ul class="message-list">${live.messages.map((m) => `
      <li class="message ${m.read ? '' : 'is-unread'}">
        <div class="message-head">
          <strong>${esc(m.name)}</strong>
          <span>${esc(m.contact)}</span>
          <time>${esc(fmtStamp(m.createdAt))}</time>
        </div>
        <p>${esc(m.message)}</p>
        <div class="message-actions">
          <button class="btn btn-ghost btn-sm" data-read="${m.id}">${m.read ? 'Označi kao nepročitano' : `${icon('check', { size: 16 })} Označi kao pročitano`}</button>
          <button class="icon-btn icon-btn--danger" data-del="${m.id}" aria-label="Obriši poruku">${icon('trash', { size: 18 })}</button>
        </div>
      </li>`).join('')}</ul>` : `<div class="empty-state">${icon('inbox', { size: 32 })}<p>Nema poruka.</p></div>`}`;
  main.querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => {
    const m = live.messages.find((x) => x.id === b.dataset.read);
    updateDoc(doc(db, 'messages', m.id), { read: !m.read }).catch(() => toast('Greška.', 'error'));
  }));
  main.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Obrisati poruku?')) return;
    deleteDoc(doc(db, 'messages', b.dataset.del)).then(() => toast('Poruka je obrisana.')).catch(() => toast('Greška.', 'error'));
  }));
}

/* ---------- Kolekcije (CRUD) ---------- */

let collectionRows = [];

function renderCollection(name) {
  const cfg = COLLECTIONS[name];
  const main = document.getElementById('admin-main');
  main.innerHTML = `${head(cfg.title, cfg.hint, `<button class="btn btn-primary btn-sm" id="add-btn">${icon('plus', { size: 18 })} Dodaj ${cfg.single}</button>`)}<div id="col-body"><div class="quiz-loading"><span class="spinner"></span></div></div>`;
  main.querySelector('#add-btn').addEventListener('click', () => openEditor(name));

  tabUnsub = onSnapshot(collection(db, name), (snap) => {
    collectionRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (cfg.sortAll) collectionRows = cfg.sortAll(collectionRows);
    else collectionRows.sort(cfg.sort || ((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)));
    const body = document.getElementById('col-body');
    if (!body) return;

    if (!collectionRows.length && cfg.defaults) {
      body.innerHTML = `
        <div class="notice">
          ${icon('file', { size: 22 })}
          <div><strong>Stranica trenutno prikazuje zadani sadržaj.</strong>
          <p>Preuzmite ga u bazu da biste ga mogli uređivati, ili dodajte svoje stavke (tada se zadani sadržaj više ne prikazuje).</p></div>
          <button class="btn btn-dark btn-sm" id="seed-btn">Preuzmi zadani sadržaj</button>
        </div>
        ${table(cfg, DEFAULTS[name], false)}`;
      body.querySelector('#seed-btn').addEventListener('click', () => seedDefaults(name));
      return;
    }
    body.innerHTML = collectionRows.length
      ? table(cfg, collectionRows, true)
      : `<div class="empty-state">${icon(cfg.icon, { size: 32 })}<p>Još nema unosa. Kliknite „Dodaj ${cfg.single}“.</p></div>`;
    body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditor(name, collectionRows.find((r) => r.id === b.dataset.edit))));
    body.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const { id, ...rest } = collectionRows.find((r) => r.id === b.dataset.copy);
      openEditor(name, rest);
    }));
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Obrisati ovu stavku?')) return;
      try { await deleteDoc(doc(db, name, b.dataset.del)); toast('Obrisano.'); } catch (err) { console.error(err); toast('Brisanje nije uspjelo.', 'error'); }
    }));
  }, (err) => {
    console.error(err);
    document.getElementById('col-body').innerHTML = '<p class="form-status" data-type="error">Podaci nisu učitani. Provjerite pristup.</p>';
  });
}

function table(cfg, rows, editable) {
  return `
    <div class="table-wrap">
      <table class="admin-table">
        <thead><tr>${cfg.columns.map((c) => `<th>${c.label}</th>`).join('')}${editable ? '<th><span class="sr-only">Akcije</span></th>' : ''}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            ${cfg.columns.map((c) => `<td data-label="${c.label}">${c.render ? c.render(r) : esc(r[c.key] ?? '')}</td>`).join('')}
            ${editable ? `<td class="row-actions">
              <button class="icon-btn" data-edit="${r.id}" aria-label="Uredi">${icon('edit', { size: 18 })}</button>
              <button class="icon-btn" data-copy="${r.id}" aria-label="Kopiraj kao novo">${icon('plus', { size: 18 })}</button>
              <button class="icon-btn icon-btn--danger" data-del="${r.id}" aria-label="Obriši">${icon('trash', { size: 18 })}</button>
            </td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function seedDefaults(name) {
  try {
    const batch = writeBatch(db);
    DEFAULTS[name].forEach(({ id, ...rest }) => batch.set(doc(collection(db, name)), rest));
    await batch.commit();
    toast('Zadani sadržaj je preuzet. Sada ga možete uređivati.', 'success');
  } catch (err) {
    console.error(err);
    toast('Preuzimanje nije uspjelo.', 'error');
  }
}

/* ---------- Forma za uređivanje ---------- */

/* Vrijeme uvijek u 24-satnom formatu (preglednikovo polje za vrijeme zna prikazati AM/PM).
   Prihvata „17“, „1730“, „17.30“ ili „17:30“ i pretvara u „17:30“. */
function normalizeTime(value) {
  const m = String(value).trim().match(/^(\d{1,2})(?:[:.,\s]?(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const TIME_SUGGESTIONS = Array.from({ length: (21 - 7) * 4 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function timeInputHTML({ id, name, value, label, required, placeholder = '17:00' }) {
  return `<input class="input input-time" ${id ? `id="${id}" ` : ''}name="${name}" type="text" inputmode="numeric" autocomplete="off" maxlength="5"
    placeholder="${placeholder}" value="${esc(value)}" list="time-suggestions" data-time${label ? ` aria-label="${label}"` : ''}${required ? ' required' : ''} />`;
}

function fieldHTML(f, value) {
  const id = `fld-${f.key}`;
  const req = f.required ? ' required' : '';
  const v = value ?? '';
  let control;
  if (f.type === 'select') {
    const empty = f.placeholder ? `<option value=""${v ? '' : ' selected'} disabled>${esc(f.placeholder)}</option>` : '';
    control = `<select class="select" id="${id}" name="${f.key}"${req}>${empty}${Object.entries(f.options).map(([k, l]) => `<option value="${esc(k)}"${String(v) === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'timerange') {
    // Jedno polje za termin: početak i kraj časa, sprema se kao „17:00 – 18:30“
    const [from = '', to = ''] = String(v).split(/\s*[–-]\s*/);
    return `<div class="field"><span class="label" id="${id}-label">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</span>
      <div class="timerange" role="group" aria-labelledby="${id}-label">
        ${timeInputHTML({ id, name: `${f.key}_from`, value: from, label: 'Od', required: f.required, placeholder: '17:00' })}
        <span aria-hidden="true">–</span>
        ${timeInputHTML({ name: `${f.key}_to`, value: to, label: 'Do', required: f.required, placeholder: '18:30' })}
      </div>
      <p class="hint">24-satni format, npr. 17:00 – 18:30</p>
      <p class="field-error">Unesite početak i kraj časa u formatu 17:00 (kraj mora biti poslije početka).</p></div>`;
  } else if (f.type === 'time24') {
    control = timeInputHTML({ id, name: f.key, value: v, required: f.required, placeholder: '09:00' });
  } else if (f.type === 'textarea' || f.type === 'lines') {
    const text = Array.isArray(v) ? v.join('\n') : v;
    control = `<textarea class="textarea" id="${id}" name="${f.key}" rows="${f.type === 'lines' ? 4 : 3}"${req}>${esc(text)}</textarea>`;
  } else {
    const list = f.list ? ` list="${id}-list"` : '';
    const minmax = `${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}`;
    control = `<input class="input" id="${id}" name="${f.key}" type="${f.type}" value="${esc(v)}"${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}${list}${minmax}${req} />`
      + (f.list ? `<datalist id="${id}-list">${f.list.map((o) => `<option value="${esc(o)}"></option>`).join('')}</datalist>` : '');
  }
  const error = f.type === 'time24' ? 'Unesite vrijeme u formatu 09:00.' : 'Obavezno polje.';
  return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>${control}${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}<p class="field-error">${error}</p></div>`;
}

function readField(form, f) {
  if (f.type === 'timerange') {
    return `${normalizeTime(form.elements[`${f.key}_from`].value)} – ${normalizeTime(form.elements[`${f.key}_to`].value)}`;
  }
  if (f.type === 'time24') return normalizeTime(form.elements[f.key].value) || '';
  const el = form.elements[f.key];
  const raw = el.value.trim();
  if (f.type === 'number') return raw === '' ? 0 : Number(raw);
  if (f.type === 'lines') return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  return raw;
}

function openEditor(name, item = null) {
  const cfg = COLLECTIONS[name];
  const editing = item && item.id;
  const form = document.getElementById('edit-form');
  document.getElementById('edit-title').textContent = editing ? `Uredi ${cfg.single}` : `Novi ${cfg.single}`;
  const defaults = { examDates: { type: 'teorija', time: '09:00' }, classSchedule: {} }[name] || { order: (collectionRows.length || 0) + 1 };
  const fieldsBox = document.getElementById('edit-fields');
  fieldsBox.innerHTML = cfg.fields.map((f) => fieldHTML(f, item ? item[f.key] : defaults[f.key])).join('')
    + `<datalist id="time-suggestions">${TIME_SUGGESTIONS.map((t) => `<option value="${t}"></option>`).join('')}</datalist>`;
  fieldsBox.querySelectorAll('[data-time]').forEach((input) => input.addEventListener('blur', () => {
    const t = normalizeTime(input.value);
    if (t) input.value = t;
  }));
  form.onsubmit = async (e) => {
    e.preventDefault();
    let ok = true;
    cfg.fields.forEach((f) => {
      let el;
      let bad;
      if (f.type === 'timerange') {
        const from = form.elements[`${f.key}_from`];
        const to = form.elements[`${f.key}_to`];
        const a = normalizeTime(from.value);
        const b = normalizeTime(to.value);
        bad = !a || !b || b <= a;
        el = !a ? from : to;
      } else if (f.type === 'time24') {
        el = form.elements[f.key];
        const raw = el.value.trim();
        bad = (f.required && !raw) || (raw !== '' && !normalizeTime(raw));
      } else {
        el = form.elements[f.key];
        bad = f.required && !el.value.trim();
      }
      el.closest('.field').classList.toggle('has-error', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    if (!ok) return;
    const data = Object.fromEntries(cfg.fields.map((f) => [f.key, readField(form, f)]));
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      // Uređivanje zamjenjuje cijeli dokument, da ne ostanu stara polja (npr. raniji format termina)
      if (editing) await setDoc(doc(db, name, item.id), data);
      else await addDoc(collection(db, name), data);
      dialog.close();
      toast('Sačuvano.', 'success');
    } catch (err) {
      console.error(err);
      toast('Čuvanje nije uspjelo.', 'error');
    } finally {
      btn.disabled = false;
    }
  };
  dialog.showModal();
  form.querySelector('input, select, textarea')?.focus();
}

dialog.querySelectorAll('[data-close]').forEach((b) => {
  if (!b.textContent.trim()) b.innerHTML = icon('x', { size: 20 });
  b.addEventListener('click', () => dialog.close());
});

/* ---------- Postavke ---------- */

async function renderSettings() {
  const main = document.getElementById('admin-main');
  main.innerHTML = `${head('Postavke', 'Kontakt podaci, tekstovi i podešavanja online testova.')}<div class="quiz-loading"><span class="spinner"></span></div>`;
  let current = { ...DEFAULT_SETTINGS };
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    if (snap.exists()) current = { ...current, ...snap.data() };
  } catch (err) { console.error(err); }

  let html = '';
  let open = false;
  SETTINGS_FIELDS.forEach((f) => {
    if (f.group) {
      if (open) html += '</div></fieldset>';
      html += `<fieldset class="panel settings-group"><legend>${f.group}</legend><div class="form-grid">`;
      open = true;
    } else {
      html += fieldHTML(f, current[f.key]);
    }
  });
  if (open) html += '</div></fieldset>';

  main.innerHTML = `
    ${head('Postavke', 'Kontakt podaci, tekstovi i podešavanja online testova.')}
    <form id="settings-form" class="settings-form" novalidate>
      ${html}
      <div class="sticky-save"><button class="btn btn-primary" type="submit">Sačuvaj postavke</button></div>
    </form>`;
  const form = main.querySelector('#settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    SETTINGS_FIELDS.filter((f) => f.key).forEach((f) => { data[f.key] = readField(form, f); });
    try {
      await setDoc(doc(db, 'settings', 'site'), data, { merge: true });
      toast('Postavke su sačuvane.', 'success');
    } catch (err) {
      console.error(err);
      toast('Čuvanje nije uspjelo.', 'error');
    }
  });
}
