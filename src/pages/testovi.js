import { renderHeader, renderFooter, icon, esc, toast } from '../lib/ui.js';
import { getSettings } from '../lib/content.js';

/* ==========================================================================
   Online učenje: lekcije i simulacije ispita (po uzoru na driver.ba/testovi)
   Rute (hash):
     #/                       pregled (zadano: lekcije)
     #/lekcije | #/test       pregled sa odabranim načinom
     #/lekcije/:set           lista lekcija
     #/lekcije/:set/:n        lekcija (učenje sa provjerom)
     #/test/:set              simulacija ispita
   ========================================================================== */

const SETS = {
  A: { label: 'A kategorija', sub: 'Mopedi i motocikli (AM, A1, A2, A)', kind: 'theory', cat: 'A', size: 20, icon: 'wheel' },
  B: { label: 'B kategorija', sub: 'Putnički automobili (B1, B, BE)', kind: 'theory', cat: 'B', size: 20, icon: 'wheel' },
  C: { label: 'C kategorija', sub: 'Teretna vozila (C1, C, CE)', kind: 'theory', cat: 'C', size: 20, icon: 'wheel' },
  D: { label: 'D kategorija', sub: 'Autobusi (D1, D, DE)', kind: 'theory', cat: 'D', size: 20, icon: 'wheel' },
  T: { label: 'T kategorija', sub: 'Traktori i radne mašine', kind: 'theory', cat: 'T', size: 20, icon: 'wheel' },
  znakovi: { label: 'Saobraćajni znakovi', sub: 'Značenje znakova i postupanje', kind: 'signs', size: 10, icon: 'sign' },
  raskrsnice: { label: 'Raskrsnice', sub: 'Prvenstvo prolaza i redoslijed vozila', kind: 'intersections', size: 10, icon: 'cross' },
  'prva-pomoc': { label: 'Prva pomoć', sub: 'Ispit iz pružanja prve pomoći', kind: 'firstaid', size: 20, icon: 'aid' },
};

const AREA_LABEL = { t: 'Teorija', z: 'Znak', r: 'Raskrsnica', pp: 'Prva pomoć' };
const STORE_KEY = 'drobo-progress-v1';

const app = document.getElementById('app');
renderHeader('testovi');

let data;
let settings;
let runner = null;

try {
  [data, settings] = await Promise.all([fetch('/data/questions.json').then((r) => r.json()), getSettings()]);
} catch (err) {
  console.error(err);
  app.innerHTML = `<section class="page-hero"><div class="container"><h1 class="section-title">Pitanja nisu učitana</h1><p class="lead">Osvježite stranicu ili pokušajte kasnije.</p></div></section>`;
  throw err;
}
renderFooter(settings);
setupLightbox();
window.addEventListener('hashchange', route);
route();

/* ---------- Pomoćne ---------- */

function questionsFor(key) {
  const set = SETS[key];
  if (!set) return [];
  if (set.kind === 'theory') return data.teorija.filter((q) => q.cats.includes(set.cat));
  if (set.kind === 'signs') return data.znakovi;
  if (set.kind === 'intersections') return data.raskrsnice;
  return data.prvaPomoc;
}

function lessonsFor(key) {
  const qs = questionsFor(key);
  const size = SETS[key].size;
  const out = [];
  for (let i = 0; i < qs.length; i += size) out.push(qs.slice(i, i + size));
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildExam(key) {
  const set = SETS[key];
  const n = (v, d) => Math.max(1, Number(v) || d);
  if (set.kind === 'theory') {
    return [
      ...shuffle(questionsFor(key)).slice(0, n(settings.testTheory, 20)),
      ...shuffle(data.znakovi).slice(0, n(settings.testSigns, 10)),
      ...shuffle(data.raskrsnice).slice(0, n(settings.testIntersections, 10)),
    ];
  }
  if (set.kind === 'firstaid') return shuffle(data.prvaPomoc).slice(0, n(settings.firstAidCount, 20));
  return shuffle(questionsFor(key)).slice(0, 20);
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { lessons: {}, tests: {} }; } catch { return { lessons: {}, tests: {} }; }
}
function saveProgress(p) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* privatni način rada */ }
}

const isCorrect = (q, selected) => selected && selected.size === q.c.length && q.c.every((i) => selected.has(i));
const imgSrc = (q) => (q.img ? `/img/pitanja/${q.img}` : '');

function setTitle(t) { document.title = `${t} · Autoškola „Edukacija – Drobo“`; }

/* ---------- Router ---------- */

function route() {
  runner?.destroy();
  runner = null;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [section, key, n] = parts;
  if ((section === 'lekcije' || section === 'test') && key && !SETS[key]) { location.hash = `#/${section}`; return; }

  if (section === 'lekcije' && key && n) startLesson(key, Number(n));
  else if (section === 'lekcije' && key) renderLessonList(key);
  else if (section === 'test' && key) startExam(key);
  else renderHub(section === 'test' ? 'test' : 'lekcije');

  window.scrollTo({ top: 0, behavior: 'instant' });
  app.focus({ preventScroll: true });
}

/* ---------- Pregled ---------- */

function renderHub(mode) {
  setTitle(mode === 'test' ? 'Simulacija vozačkog ispita' : 'Lekcije za vozački ispit');
  const progress = loadProgress();
  const total = data.teorija.length + data.znakovi.length + data.raskrsnice.length + data.prvaPomoc.length;

  const cards = Object.entries(SETS).map(([key, set], i) => {
    const lessons = lessonsFor(key);
    const done = lessons.filter((_, li) => progress.lessons[`${key}-${li + 1}`]?.done).length;
    const best = progress.tests[key]?.best;
    const pct = Math.round((done / lessons.length) * 100);
    const count = questionsFor(key).length;
    const href = mode === 'test' ? `#/test/${key}` : `#/lekcije/${key}`;
    const meta = mode === 'test'
      ? (set.kind === 'theory'
        ? `${settings.testTheory} teorija + ${settings.testSigns} znakova + ${settings.testIntersections} raskrsnica`
        : `${set.kind === 'firstaid' ? settings.firstAidCount : 20} nasumičnih pitanja`)
      : `${count} pitanja · ${lessons.length} lekcija`;
    return `
      <li class="set-card${set.kind === 'theory' ? '' : ' set-card--special'}" style="--i:${i}">
        <a href="${href}">
          <span class="set-icon">${set.kind === 'theory' ? `<span class="set-letter">${esc(set.cat)}</span>` : icon(set.icon, { size: 28 })}</span>
          <span class="set-body">
            <strong>${esc(set.label)}</strong>
            <span>${esc(set.sub)}</span>
            <small>${meta}</small>
          </span>
          <span class="set-foot">
            ${mode === 'test'
              ? (best != null ? `<span class="chip ${best >= settings.passPercent ? 'chip--ok' : ''}">Najbolje: ${best}%</span>` : '<span class="chip chip--muted">Još niste radili</span>')
              : `<span class="set-progress" aria-label="Završeno ${done} od ${lessons.length} lekcija"><span style="width:${pct}%"></span></span><span class="set-progress-label">${done}/${lessons.length}</span>`}
            <span class="set-go" aria-hidden="true">${icon('arrow', { size: 20 })}</span>
          </span>
        </a>
      </li>`;
  }).join('');

  app.innerHTML = `
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
          ? `<div class="info-strip">${icon('trophy')}<p>Test za kategoriju sadrži <strong>${settings.testTheory} pitanja teorije, ${settings.testSigns} znakova i ${settings.testIntersections} raskrsnica</strong>. Za prolaz je potrebno najmanje <strong>${settings.passPercent}%</strong> tačnih odgovora. Pitanja s više tačnih odgovora su označena.</p></div>`
          : `<div class="info-strip">${icon('check')}<p>Odaberi odgovor i klikni <strong>Provjeri</strong>: tačan odgovor se odmah prikaže. Lekcije za teoriju sadrže po ${SETS.B.size} pitanja, a znakovi i raskrsnice po ${SETS.znakovi.size}.</p></div>`}
        <h2 class="sets-title">Kategorije</h2>
        <ul class="set-grid">${cards}</ul>
      </div>
    </section>`;
}

/* ---------- Lista lekcija ---------- */

function renderLessonList(key) {
  const set = SETS[key];
  setTitle(`Lekcije: ${set.label}`);
  const lessons = lessonsFor(key);
  const progress = loadProgress();
  app.innerHTML = `
    <section class="page-hero quiz-hero quiz-hero--compact">
      <div class="container">
        <a class="back-link" href="#/lekcije">${icon('arrowLeft', { size: 18 })} Sve kategorije</a>
        <h1 class="section-title">${esc(set.label)}</h1>
        <p class="lead">${esc(set.sub)} · ${questionsFor(key).length} pitanja u ${lessons.length} lekcija.</p>
        <div class="hero-buttons">
          <a class="btn btn-primary" href="#/test/${key}">${icon('timer', { size: 18 })} Simulacija ispita</a>
        </div>
      </div>
    </section>
    <section class="section section--paper">
      <div class="container">
        <ol class="lesson-grid">
          ${lessons.map((qs, i) => {
            const p = progress.lessons[`${key}-${i + 1}`];
            const from = i * set.size + 1;
            const state = p?.done ? (p.best === qs.length ? 'perfect' : 'done') : '';
            return `
              <li><a class="lesson-tile ${state ? `is-${state}` : ''}" href="#/lekcije/${key}/${i + 1}">
                <span class="lesson-n">${i + 1}</span>
                <span class="lesson-body"><strong>Lekcija ${i + 1}</strong><small>Pitanja ${from}–${from + qs.length - 1}</small></span>
                <span class="lesson-state">${p ? `${p.best}/${qs.length}` : icon('play', { size: 18 })}</span>
              </a></li>`;
          }).join('')}
        </ol>
      </div>
    </section>`;
}

/* ---------- Pokretanje kviza ---------- */

function startLesson(key, n) {
  const lessons = lessonsFor(key);
  const qs = lessons[n - 1];
  if (!qs) { location.hash = `#/lekcije/${key}`; return; }
  const set = SETS[key];
  setTitle(`${set.label}: lekcija ${n}`);
  runner = createRunner({
    mode: 'learn', key, lesson: n, lessonsCount: lessons.length,
    title: `${set.label} · Lekcija ${n}`, back: `#/lekcije/${key}`, questions: qs,
  });
}

function startExam(key) {
  const set = SETS[key];
  setTitle(`Simulacija: ${set.label}`);
  runner = createRunner({
    mode: 'exam', key, title: `Simulacija ispita · ${set.label}`, back: '#/test', questions: buildExam(key),
  });
}

/* ---------- Kviz ---------- */

function createRunner(cfg) {
  const { mode, questions } = cfg;
  const state = {
    index: 0,
    selected: questions.map(() => new Set()),
    checked: questions.map(() => false),
    showAnswers: false,
    started: Date.now(),
    finished: false,
  };
  let timer;

  app.innerHTML = `
    <section class="runner">
      <div class="container runner-top">
        <a class="back-link" href="${cfg.back}">${icon('arrowLeft', { size: 18 })} Nazad</a>
        <h1 class="runner-title">${esc(cfg.title)}</h1>
        <div class="runner-meta">
          <span class="runner-count" aria-live="polite"></span>
          ${mode === 'exam' ? `<span class="runner-timer">${icon('clock', { size: 18 })}<span>00:00</span></span>` : ''}
          ${mode === 'learn' ? `<label class="switch"><input type="checkbox" class="toggle-answers" /><span class="switch-ui" aria-hidden="true"></span>Prikaži tačne odgovore</label>` : ''}
        </div>
      </div>
      <div class="container">
        <nav class="q-nav" aria-label="Pitanja"></nav>
        <div class="runner-body"></div>
      </div>
    </section>`;

  const nav = app.querySelector('.q-nav');
  const body = app.querySelector('.runner-body');
  const count = app.querySelector('.runner-count');

  nav.innerHTML = questions.map((q, i) => `<button type="button" class="q-dot" data-i="${i}" aria-label="Pitanje ${i + 1}">${i + 1}</button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('.q-dot');
    if (b) go(Number(b.dataset.i));
  });

  app.querySelector('.toggle-answers')?.addEventListener('change', (e) => {
    state.showAnswers = e.target.checked;
    render();
  });

  if (mode === 'exam') {
    const out = app.querySelector('.runner-timer span');
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - state.started) / 1000);
      out.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);
  }

  const onKey = (e) => {
    if (state.finished || e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const q = questions[state.index];
    if (/^[1-5]$/.test(e.key) && Number(e.key) <= q.a.length) { toggle(Number(e.key) - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') go(state.index + 1);
    else if (e.key === 'ArrowLeft') go(state.index - 1);
    else if (e.key === 'Enter' && !e.target.closest('a, button')) { primary(); e.preventDefault(); }
  };
  document.addEventListener('keydown', onKey);

  function go(i) {
    if (i < 0 || i >= questions.length) return;
    state.index = i;
    render();
    body.querySelector('.q-card')?.focus({ preventScroll: true });
    const top = app.querySelector('.runner').getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }

  function toggle(oi) {
    const i = state.index;
    const q = questions[i];
    if (state.checked[i]) return;
    const sel = state.selected[i];
    if (q.c.length > 1 || q.multi) {
      sel.has(oi) ? sel.delete(oi) : sel.add(oi);
    } else {
      sel.clear();
      sel.add(oi);
    }
    render();
  }

  function primary() {
    const i = state.index;
    if (mode === 'learn') {
      if (!state.checked[i]) {
        if (!state.selected[i].size) { toast('Odaberite odgovor.'); return; }
        state.checked[i] = true;
        saveLessonProgress();
        render();
        return;
      }
      if (i < questions.length - 1) go(i + 1);
      else finish();
      return;
    }
    if (i < questions.length - 1) go(i + 1);
    else confirmFinish();
  }

  function confirmFinish() {
    const unanswered = state.selected.filter((s) => !s.size).length;
    if (unanswered && !confirm(`Niste odgovorili na ${unanswered} pitanja. Završiti test?`)) return;
    finish();
  }

  function saveLessonProgress() {
    if (mode !== 'learn') return;
    const progress = loadProgress();
    const k = `${cfg.key}-${cfg.lesson}`;
    const correct = questions.filter((q, i) => state.checked[i] && isCorrect(q, state.selected[i])).length;
    const all = state.checked.every(Boolean);
    const prev = progress.lessons[k] || { best: 0, done: false };
    progress.lessons[k] = { best: all ? Math.max(prev.best, correct) : prev.best, done: prev.done || all };
    saveProgress(progress);
  }

  function render() {
    const i = state.index;
    const q = questions[i];
    const sel = state.selected[i];
    const checked = state.checked[i];
    const reveal = checked || (mode === 'learn' && state.showAnswers);
    const answered = state.selected.filter((s) => s.size).length;
    count.textContent = mode === 'exam' ? `Odgovoreno ${answered}/${questions.length}` : `Pitanje ${i + 1}/${questions.length}`;

    nav.querySelectorAll('.q-dot').forEach((b, bi) => {
      b.classList.toggle('is-current', bi === i);
      b.classList.toggle('is-answered', state.selected[bi].size > 0);
      const ok = state.checked[bi] ? isCorrect(questions[bi], state.selected[bi]) : null;
      b.classList.toggle('is-correct', ok === true);
      b.classList.toggle('is-wrong', ok === false);
      if (bi === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });

    const multi = q.multi || q.c.length > 1;
    const verdict = checked ? isCorrect(q, sel) : null;
    const options = q.a.map((text, oi) => {
      const isSel = sel.has(oi);
      const isRight = q.c.includes(oi);
      let cls = '';
      if (reveal && isRight) cls = 'is-right';
      if (checked && isSel && !isRight) cls = 'is-wrong';
      if (!reveal && isSel) cls = 'is-selected';
      if (reveal && isSel && isRight) cls += ' is-selected';
      return `
        <li>
          <button type="button" class="opt ${cls}" data-o="${oi}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${isSel}" ${checked ? 'aria-disabled="true"' : ''}>
            <span class="opt-key">${oi + 1}</span>
            <span class="opt-text">${esc(text)}</span>
            <span class="opt-mark" aria-hidden="true">${reveal && isRight ? icon('check', { size: 20 }) : checked && isSel ? icon('x', { size: 20 }) : ''}</span>
          </button>
        </li>`;
    }).join('');

    const last = i === questions.length - 1;
    let primaryLabel;
    if (mode === 'learn') primaryLabel = !checked ? 'Provjeri' : last ? 'Završi lekciju' : 'Sljedeće pitanje';
    else primaryLabel = last ? 'Završi test' : 'Sljedeće pitanje';

    body.innerHTML = `
      <article class="q-card${q.img ? ' has-img' : ''}" tabindex="-1" aria-labelledby="q-text">
        <div class="q-main">
          <div class="q-tags">
            <span class="chip chip--dark">${AREA_LABEL[q.area]} · br. ${q.n}</span>
            ${multi ? `<span class="chip chip--solid">Više tačnih odgovora</span>` : ''}
          </div>
          <h2 class="q-text" id="q-text">${esc(q.q)}</h2>
          <ul class="opts" role="${multi ? 'group' : 'radiogroup'}" aria-labelledby="q-text">${options}</ul>
          ${checked ? `<p class="verdict ${verdict ? 'is-ok' : 'is-bad'}" role="status">${verdict ? `${icon('check')} Tačno!` : `${icon('x')} Netačno. Tačan odgovor je označen zelenom bojom.`}</p>` : ''}
        </div>
        ${q.img ? `<figure class="q-figure"><button type="button" class="q-zoom" aria-label="Uvećaj sliku"><img src="${imgSrc(q)}" alt="Slika uz pitanje ${q.n}" loading="eager" />${icon('zoom', { size: 20 })}</button></figure>` : ''}
      </article>
      <div class="runner-actions">
        <button type="button" class="btn btn-ghost btn-prev" ${i === 0 ? 'disabled' : ''}>${icon('chevronLeft', { size: 18 })} Prethodno</button>
        ${mode === 'exam' && !last ? `<button type="button" class="btn btn-ghost btn-finish">Završi test</button>` : ''}
        <button type="button" class="btn btn-primary btn-main">${primaryLabel}${!last || (mode === 'learn' && !checked) ? icon('chevronRight', { size: 18 }) : ''}</button>
      </div>
      <p class="kbd-hint">Tipkovnica: <kbd>1</kbd>–<kbd>${q.a.length}</kbd> odabir · <kbd>Enter</kbd> ${mode === 'learn' ? 'provjeri / dalje' : 'dalje'} · <kbd>←</kbd> <kbd>→</kbd> navigacija</p>`;

    body.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => toggle(Number(b.dataset.o))));
    body.querySelector('.btn-main').addEventListener('click', primary);
    body.querySelector('.btn-prev').addEventListener('click', () => go(i - 1));
    body.querySelector('.btn-finish')?.addEventListener('click', confirmFinish);
    body.querySelector('.q-zoom')?.addEventListener('click', () => openLightbox(imgSrc(q), `Slika uz pitanje ${q.n}`));
  }

  function finish() {
    state.finished = true;
    clearInterval(timer);
    const results = questions.map((q, i) => ({ q, sel: state.selected[i], ok: isCorrect(q, state.selected[i]) }));
    const correct = results.filter((r) => r.ok).length;
    const pct = Math.round((correct / questions.length) * 100);
    const pass = pct >= Number(settings.passPercent || 90);
    const secs = Math.floor((Date.now() - state.started) / 1000);

    const progress = loadProgress();
    if (mode === 'exam') {
      const prev = progress.tests[cfg.key] || { best: 0, count: 0 };
      progress.tests[cfg.key] = { best: Math.max(prev.best, pct), last: pct, count: prev.count + 1 };
    }
    saveProgress(progress);

    const byArea = ['t', 'z', 'r', 'pp'].map((a) => {
      const rs = results.filter((r) => r.q.area === a);
      return rs.length ? { a, total: rs.length, ok: rs.filter((r) => r.ok).length } : null;
    }).filter(Boolean);
    const wrong = results.filter((r) => !r.ok);
    const nextLesson = mode === 'learn' && cfg.lesson < cfg.lessonsCount ? `#/lekcije/${cfg.key}/${cfg.lesson + 1}` : null;

    app.innerHTML = `
      <section class="runner results">
        <div class="container">
          <a class="back-link" href="${cfg.back}">${icon('arrowLeft', { size: 18 })} Nazad</a>
          <div class="result-hero ${mode === 'exam' ? (pass ? 'is-pass' : 'is-fail') : ''}">
            <div class="result-ring" style="--pct:${pct}"><span><strong>${pct}%</strong><small>${correct}/${questions.length}</small></span></div>
            <div>
              <p class="eyebrow">${esc(cfg.title)}</p>
              <h1 class="section-title">${mode === 'exam' ? (pass ? 'Položeno!' : 'Nije položeno') : pct === 100 ? 'Sve tačno!' : 'Lekcija završena'}</h1>
              <p class="lead">${mode === 'exam'
                ? `Potrebno je ${settings.passPercent}% za prolaz. Vrijeme: ${Math.floor(secs / 60)} min ${secs % 60} s.`
                : `${wrong.length ? `Pogrešnih odgovora: ${wrong.length}. Pogledaj ih ispod i ponovi lekciju.` : 'Odlično, pređi na sljedeću lekciju.'}`}</p>
              <div class="hero-buttons">
                ${nextLesson ? `<a class="btn btn-primary" href="${nextLesson}">Sljedeća lekcija ${icon('arrow', { size: 18 })}</a>` : ''}
                <button type="button" class="btn ${nextLesson ? 'btn-ghost' : 'btn-primary'} btn-again">${icon('refresh', { size: 18 })} ${mode === 'exam' ? 'Novi test' : 'Ponovi lekciju'}</button>
                <a class="btn btn-ghost" href="${cfg.back}">${mode === 'exam' ? 'Druga kategorija' : 'Sve lekcije'}</a>
              </div>
            </div>
          </div>
          ${byArea.length > 1 ? `<ul class="area-stats">${byArea.map((b) => `<li><strong>${b.ok}/${b.total}</strong><span>${AREA_LABEL[b.a]}</span></li>`).join('')}</ul>` : ''}
          ${wrong.length ? `
            <h2 class="sets-title">Pregled grešaka</h2>
            <ol class="review-list">
              ${wrong.map(({ q, sel }) => `
                <li class="review-item">
                  <div>
                    <span class="chip chip--dark">${AREA_LABEL[q.area]} · br. ${q.n}</span>
                    <h3>${esc(q.q)}</h3>
                    <ul>${q.a.map((t, oi) => `<li class="${q.c.includes(oi) ? 'is-right' : sel.has(oi) ? 'is-wrong' : ''}">${q.c.includes(oi) ? icon('check', { size: 16 }) : sel.has(oi) ? icon('x', { size: 16 }) : '<span class="dot"></span>'}${esc(t)}</li>`).join('')}</ul>
                    ${!sel.size ? '<p class="review-note">Bez odgovora</p>' : ''}
                  </div>
                  ${q.img ? `<img src="${imgSrc(q)}" alt="Slika uz pitanje ${q.n}" loading="lazy" />` : ''}
                </li>`).join('')}
            </ol>` : ''}
        </div>
      </section>`;
    app.querySelector('.btn-again').addEventListener('click', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render();
  return {
    destroy() {
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
    },
  };
}

/* ---------- Uvećanje slike ---------- */

function setupLightbox() {
  const dlg = document.getElementById('lightbox');
  dlg.querySelector('.lightbox-close').innerHTML = icon('x', { size: 24 });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('.lightbox-close')) dlg.close(); });
}

function openLightbox(src, alt) {
  const dlg = document.getElementById('lightbox');
  const img = dlg.querySelector('img');
  img.src = src;
  img.alt = alt;
  dlg.showModal();
}
