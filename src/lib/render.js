/*
 * HTML sekcija stranice kao čisti tekst (bez DOM-a).
 * Isti kod koristi build (scripts/prerender-plugin.mjs) da sadržaj bude upisan direktno u HTML
 * za pretraživače, i preglednik da ga osvježi podacima iz baze.
 */
import { icon, esc, safeHref, telHref, dayParts, formatDate, monthLabel } from './ui.js';
import { EXAM_TYPES, CLASS_LOCATIONS, CLASS_TYPES } from './defaults.js';

/* ---------- Početna ---------- */

export function announcementHTML(text) {
  return `<span class="dot" aria-hidden="true"></span>${esc(text)}${icon('arrow', { size: 16 })}`;
}

export function servicesHTML(list, categories) {
  return list.map((s, i) => {
    const online = s.icon === 'laptop';
    const practical = s.icon === 'wheel';
    return `
      <article class="card service-card${online ? ' is-featured' : ''}" data-reveal="${i}">
        <span class="service-icon">${icon(s.icon || 'book', { size: 30 })}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        ${practical ? `<div class="chips">${categories.map((c) => `<span class="chip">${esc(c.code)}</span>`).join('')}</div>` : ''}
        ${online ? `<a class="btn btn-primary" href="/testovi">Otvori online testove ${icon('arrow', { size: 18 })}</a>` : ''}
        ${!online && !practical ? `<a class="link-arrow" href="#casovi">Termini časova ${icon('arrow', { size: 18 })}</a>` : ''}
      </article>`;
  }).join('');
}

export function categoriesHTML(list) {
  return list.map((c, i) => `
    <li data-reveal="${i % 4}">
      <div class="category-tile">
        <span class="category-code">${esc(c.code)}</span>
        <h3>${esc(c.name)}</h3>
        ${c.text ? `<p>${esc(c.text)}</p>` : ''}
      </div>
    </li>`).join('');
}

export function scheduleHTML(list) {
  if (!list.length) {
    return `<div class="empty-state">${icon('calendar', { size: 32 })}<p><strong>Raspored časova uskoro.</strong><br />Za termine nas nazovite.</p></div>`;
  }
  return `<div class="schedule">${list.map((r, i) => {
    // Termin: vrsta nastave + lokacija; stariji unosi (naslov + napomena) se i dalje prikazuju
    const place = esc(CLASS_LOCATIONS[r.location] || r.location || '');
    let what;
    if (r.location && r.type) what = `<strong>${esc(CLASS_TYPES[r.type] || r.type)}</strong><span>${place}</span>`;
    else if (r.location) what = `<strong>${place}</strong>`;
    else what = `<strong>${esc(r.title)}</strong>${r.note ? `<span>${esc(r.note)}</span>` : ''}`;
    return `
    <div class="schedule-row" data-reveal="${i % 4}">
      <span class="schedule-day">${esc(r.day)}</span>
      <span class="schedule-time">${icon('clock', { size: 18 })}${esc(r.time)}</span>
      <span class="schedule-what">${what}</span>
      ${!r.location && r.category ? `<span class="chip">${esc(r.category)}</span>` : '<span></span>'}
    </div>`;
  }).join('')}</div>`;
}

export function examPreviewHTML(list, today) {
  const upcoming = list.filter((e) => e.date >= today).slice(0, 4);
  if (!upcoming.length) {
    return `<div class="empty-state">${icon('calendar', { size: 32 })}<p><strong>Novi ispitni rokovi uskoro.</strong><br />Pratite stranicu „Ispitni rokovi“.</p></div>`;
  }
  return `<ul class="exam-preview">${upcoming.map((e, i) => {
    const d = dayParts(e.date);
    return `
      <li class="exam-card" data-reveal="${i}">
        <span class="date-tile"><span><strong>${d.day}</strong><br /><span>${d.month}</span></span></span>
        <div>
          <h3>${esc(EXAM_TYPES[e.type] || e.type)}</h3>
          <p>${esc(formatDate(e.date))}${e.time ? ` · ${esc(e.time)}` : ''}</p>
          ${e.category ? `<span class="chip chip--dark">Kat. ${esc(e.category)}</span>` : ''}
        </div>
      </li>`;
  }).join('')}</ul>`;
}

export function faqHTML(list) {
  return list.map((f, i) => `
    <details class="faq-item" data-reveal="${i % 3}"${i === 0 ? ' open' : ''}>
      <summary><h3 class="faq-q">${esc(f.q)}</h3>${icon('chevron')}</summary>
      <p>${esc(f.a)}</p>
    </details>`).join('');
}

export function contactCardsHTML(s) {
  const items = [
    { ic: 'pin', label: 'Adresa', html: `<span class="val">${esc(s.address)}</span>` },
    { ic: 'phone', label: 'Telefon', html: `<a href="${telHref(s.phone)}">${esc(s.phone)}</a>${s.phone2 ? `<br /><a href="${telHref(s.phone2)}">${esc(s.phone2)}</a>` : ''}` },
    { ic: 'mail', label: 'E-mail', html: `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` },
    { ic: 'clock', label: 'Radno vrijeme', html: `<span class="val">${esc(s.hours)}</span>` },
    { ic: 'facebook', label: 'Facebook', html: `<a href="${safeHref(s.facebook)}" target="_blank" rel="noopener">Edukacija – Drobo</a>` },
  ];
  return items.map((it, i) => `
    <li data-reveal="${i}"><span class="ic">${icon(it.ic)}</span><div><small>${it.label}</small>${it.html}</div></li>`).join('');
}

export const mapEmbedSrc = (s) => `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address)}&z=15&output=embed`;
export const mapLink = (s) => `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address)}`;

export function categoryOptionsHTML(categories) {
  return '<option value="">Odaberite kategoriju</option>'
    + categories.map((c) => `<option value="${esc(c.code)}">${esc(c.code)} · ${esc(c.name)}</option>`).join('');
}

/* ---------- Ispitni rokovi ---------- */

export const splitCategories = (value) => String(value || '').split(/[,\s]+/).filter(Boolean);

export function examCategoryOptionsHTML(exams) {
  const cats = [...new Set(exams.flatMap((e) => splitCategories(e.category)))].sort();
  return '<option value="">Sve kategorije</option>'
    + cats.map((c) => `<option value="${esc(c)}">Kategorija ${esc(c)}</option>`).join('');
}

export function examListHTML(items, today, settings) {
  if (!items.length) {
    return `<div class="empty-state">${icon('calendar', { size: 34 })}<p><strong>Nema objavljenih termina za odabrane filtere.</strong><br />Novi rokovi se objavljuju čim budu poznati. Pitanja? Nazovite <a href="${telHref(settings.phone)}">${esc(settings.phone)}</a>.</p></div>`;
  }
  const groups = new Map();
  items.forEach((e) => {
    const k = e.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  });
  return [...groups.entries()].map(([k, rows]) => `
    <section class="month">
      <h2 class="month-title">${monthLabel(`${k}-01`)}</h2>
      <ul class="exam-rows">
        ${rows.map((e) => {
          const d = dayParts(e.date);
          const past = e.date < today;
          return `
            <li class="exam-row type-${esc(e.type)}${past ? ' is-past' : ''}">
              <span class="date-tile"><span><strong>${d.day}</strong><br /><span>${d.month}</span></span></span>
              <div class="exam-info">
                <h3>${esc(EXAM_TYPES[e.type] || e.type)}${past ? ' <span class="chip chip--muted">Održan</span>' : ''}</h3>
                <p class="exam-when">${icon('calendar', { size: 16 })}${esc(formatDate(e.date))}${e.time ? ` · ${icon('clock', { size: 16 })}${esc(e.time)}` : ''}</p>
                ${e.location ? `<p class="exam-where">${icon('pin', { size: 16 })}${esc(e.location)}</p>` : ''}
                ${e.note ? `<p class="exam-note">${esc(e.note)}</p>` : ''}
              </div>
              ${e.category ? `<span class="chip chip--solid">Kat. ${esc(e.category)}</span>` : '<span class="chip">Sve kat.</span>'}
            </li>`;
        }).join('')}
      </ul>
    </section>`).join('');
}

/* ---------- Online testovi: pregled kategorija ---------- */

export const SETS = {
  A: { label: 'A kategorija', sub: 'Mopedi i motocikli (AM, A1, A2, A)', kind: 'theory', cat: 'A', size: 20, icon: 'wheel' },
  B: { label: 'B kategorija', sub: 'Putnički automobili (B1, B, BE)', kind: 'theory', cat: 'B', size: 20, icon: 'wheel' },
  C: { label: 'C kategorija', sub: 'Teretna vozila (C1, C, CE)', kind: 'theory', cat: 'C', size: 20, icon: 'wheel' },
  D: { label: 'D kategorija', sub: 'Autobusi (D1, D, DE)', kind: 'theory', cat: 'D', size: 20, icon: 'wheel' },
  T: { label: 'T kategorija', sub: 'Traktori i radne mašine', kind: 'theory', cat: 'T', size: 20, icon: 'wheel' },
  znakovi: { label: 'Saobraćajni znakovi', sub: 'Značenje znakova i postupanje', kind: 'signs', size: 10, icon: 'sign' },
  raskrsnice: { label: 'Raskrsnice', sub: 'Prvenstvo prolaza i redoslijed vozila', kind: 'intersections', size: 10, icon: 'cross' },
  'prva-pomoc': { label: 'Prva pomoć', sub: 'Ispit iz pružanja prve pomoći', kind: 'firstaid', size: 20, icon: 'aid' },
};

/* Ispit iz teorije nosi najviše 120 bodova; prag u postocima (zadano 90 %) odgovara 108 bodova */
export const EXAM_MAX_POINTS = 120;
export const passPoints = (settings) => Math.round((EXAM_MAX_POINTS * Number(settings.passPercent || 90)) / 100);
export const passText = (settings) => `${passPoints(settings)} od ${EXAM_MAX_POINTS} bodova`;

export function questionsForSet(data, key) {
  const set = SETS[key];
  if (!set) return [];
  if (set.kind === 'theory') return data.teorija.filter((q) => q.cats.includes(set.cat));
  if (set.kind === 'signs') return data.znakovi;
  if (set.kind === 'intersections') return data.raskrsnice;
  return data.prvaPomoc;
}

export function quizHubHTML({ mode, data, settings, progress = { lessons: {}, tests: {} } }) {
  const total = data.teorija.length + data.znakovi.length + data.raskrsnice.length + data.prvaPomoc.length;
  const cards = Object.entries(SETS).map(([key, set], i) => {
    const count = questionsForSet(data, key).length;
    const lessonCount = Math.ceil(count / set.size);
    let done = 0;
    for (let li = 1; li <= lessonCount; li++) if (progress.lessons[`${key}-${li}`]?.done) done++;
    const best = progress.tests[key]?.best;
    const pct = lessonCount ? Math.round((done / lessonCount) * 100) : 0;
    const href = mode === 'test' ? `#/test/${key}` : `#/lekcije/${key}`;
    const meta = mode === 'test'
      ? (set.kind === 'theory'
        ? `${settings.testTheory} teorija + ${settings.testSigns} znakova + ${settings.testIntersections} raskrsnica`
        : `${set.kind === 'firstaid' ? settings.firstAidCount : 20} nasumičnih pitanja`)
      : `${count} pitanja · ${lessonCount} lekcija`;
    return `
      <li class="set-card${set.kind === 'theory' ? '' : ' set-card--special'}" style="--i:${i}">
        <a href="${href}">
          <span class="set-icon">${set.kind === 'theory' ? `<span class="set-letter">${esc(set.cat)}</span>` : icon(set.icon, { size: 28 })}</span>
          <span class="set-body">
            <h3 class="set-name">${esc(set.label)}</h3>
            <span>${esc(set.sub)}</span>
            <small>${meta}</small>
          </span>
          <span class="set-foot">
            ${mode === 'test'
              ? (best != null ? `<span class="chip ${best >= settings.passPercent ? 'chip--ok' : ''}">Najbolje: ${best}%</span>` : '<span class="chip chip--muted">Još niste radili</span>')
              : `<span class="set-progress" aria-label="Završeno ${done} od ${lessonCount} lekcija"><span style="width:${pct}%"></span></span><span class="set-progress-label">${done}/${lessonCount}</span>`}
            <span class="set-go" aria-hidden="true">${icon('arrow', { size: 20 })}</span>
          </span>
        </a>
      </li>`;
  }).join('');

  return `
    <section class="page-hero quiz-hero">
      <div class="container">
        <p class="eyebrow">Online učenje testova</p>
        <h1 class="section-title">${mode === 'test' ? 'Simulacija ispita' : 'Lekcije za vozački'}</h1>
        <p class="lead">${total} pitanja iz zvaničnog kataloga ispitnih pitanja (teorija, znakovi, raskrsnice i prva pomoć). Napredak se čuva na ovom uređaju.</p>
        <div class="mode-switch" role="tablist" aria-label="Način učenja">
          <a role="tab" href="#/lekcije" aria-selected="${mode !== 'test'}" class="${mode !== 'test' ? 'is-active' : ''}">
            ${icon('book', { size: 22 })}<span><strong>Lekcije</strong><small>Uči sa provjerom odgovora</small></span>
          </a>
          <a role="tab" href="#/test" aria-selected="${mode === 'test'}" class="${mode === 'test' ? 'is-active' : ''}">
            ${icon('timer', { size: 22 })}<span><strong>Simulacija ispita</strong><small>Kao na pravom ispitu</small></span>
          </a>
        </div>
      </div>
    </section>
    <section class="section section--paper quiz-sets">
      <div class="container">
        ${mode === 'test'
          ? `<div class="info-strip">${icon('trophy')}<p>Test za kategoriju sadrži <strong>${settings.testTheory} pitanja teorije, ${settings.testSigns} znakova i ${settings.testIntersections} raskrsnica</strong>. Za prolaz je potrebno <strong>${passText(settings)}</strong> (${settings.passPercent}% tačnih odgovora). Pitanja s više tačnih odgovora su označena.</p></div>`
          : `<div class="info-strip">${icon('check')}<p>Odaberi odgovor i klikni <strong>Provjeri</strong>: tačan odgovor se odmah prikaže. Lekcije za teoriju sadrže po ${SETS.B.size} pitanja, a znakovi i raskrsnice po ${SETS.znakovi.size}.</p></div>`}
        <h2 class="sets-title">Kategorije</h2>
        <ul class="set-grid">${cards}</ul>
      </div>
    </section>`;
}

/* ---------- Strukturisani podaci (JSON-LD) ---------- */

/*
 * Autoškola nema vlastiti schema.org tip, pa se koristi LocalBusiness.
 * Namjerno bez ocjena (aggregateRating), cijena i radnog vremena: na stranici nisu navedeni fiksni podaci.
 */
export function localBusinessLD({ settings, services, categories, siteUrl, image }) {
  const [street, rest = ''] = String(settings.address).split(',').map((x) => x.trim());
  const postal = (rest.match(/\d{5}/) || [''])[0];
  const city = rest.replace(postal, '').trim() || 'Travnik';
  const offers = [
    ...services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.text } })),
    ...categories.map((c) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: `Praktična nastava: ${c.code}`, description: [c.name, c.text].filter(Boolean).join('. ') },
    })),
  ];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/#autoskola`,
    name: 'Edukacija – Drobo',
    legalName: 'Edukacija – Drobo d.o.o. Travnik',
    alternateName: 'Autoškola Edukacija – Drobo',
    slogan: settings.slogan,
    description: settings.heroText,
    url: `${siteUrl}/`,
    image,
    telephone: settings.phone,
    email: settings.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      postalCode: postal || undefined,
      addressLocality: city,
      addressCountry: 'BA',
    },
    areaServed: { '@type': 'City', name: 'Travnik' },
    hasMap: mapLink(settings),
    sameAs: [settings.facebook].filter(Boolean),
    hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Usluge autoškole', itemListElement: offers },
  };
  return JSON.stringify(ld);
}

export function faqLD(faq) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
}

/** JSON za <script type="application/ld+json">, zaštićen od zatvaranja script taga. */
export const ldJSON = (json) => json.replace(/</g, '\\u003c');
