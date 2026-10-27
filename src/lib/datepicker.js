/*
 * Kalendar u stilu stranice umjesto biranja datuma preglednika.
 * Vidljivo polje (readonly) prikazuje datum riječima („15. februar 2000.“), a vrijednost
 * za slanje (GGGG-MM-DD) je u skrivenom polju. Za datum rođenja kalendar počinje izborom
 * godine, pa mjeseca, pa dana, da se ne lista mjesec po mjesec unazad.
 *
 *   <input class="input" id="x" readonly data-datepicker data-target="x-value"
 *          data-min-age="14" data-max-age="100" data-start="year" />
 *   <input type="hidden" id="x-value" name="dob" />
 */

const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'];
const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
const YEARS_PER_PAGE = 20;
const ARROW = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const PREV = ARROW('m15 18-6-6 6-6');
const NEXT = ARROW('m9 18 6-6-6-6');

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const formatLong = (d) => `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;

let openPicker = null;

export function enhanceDateInput(input) {
  if (input.dataset.dpReady) return;
  input.dataset.dpReady = '1';
  const hidden = document.getElementById(input.dataset.target);
  const today = new Date();
  const ageBound = (years) => new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  const max = input.dataset.minAge ? ageBound(Number(input.dataset.minAge)) : null;
  const min = input.dataset.maxAge ? ageBound(Number(input.dataset.maxAge)) : null;
  const startView = input.dataset.start || 'day';

  input.readOnly = true;
  if (hidden.value && parse(hidden.value)) input.value = formatLong(parse(hidden.value));
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-haspopup', 'dialog');
  input.setAttribute('aria-expanded', 'false');
  input.classList.add('dp-input');

  let pop = null;
  let view = 'day';
  let cursor = null; // mjesec/dan koji se prikazuje ili je fokusiran
  let yearPage = 0;

  const value = () => parse(hidden.value);
  const inRange = (d) => (!min || d >= min) && (!max || d <= max);

  function setValue(d) {
    hidden.value = d ? iso(d) : '';
    input.value = d ? formatLong(d) : '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function place() {
    const r = input.getBoundingClientRect();
    const w = Math.max(Math.min(r.width, 360), 300);
    const h = pop.offsetHeight;
    const up = innerHeight - r.bottom < h + 16 && r.top > innerHeight - r.bottom;
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    pop.style.top = up ? `${Math.max(8, r.top - h - 6)}px` : `${r.bottom + 6}px`;
  }

  function header(title, label) {
    return `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-act="prev" aria-label="Prethodno">${PREV}</button>
        <button type="button" class="dp-title" data-act="up" aria-label="${label}">${title}</button>
        <button type="button" class="dp-nav" data-act="next" aria-label="Sljedeće">${NEXT}</button>
      </div>`;
  }

  function render(focus = true) {
    const sel = value();
    let html = '';
    if (view === 'year') {
      const from = yearPage;
      const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => from + i);
      html = header(`${from} – ${from + YEARS_PER_PAGE - 1}`, 'Odabir godine')
        + `<div class="dp-grid dp-grid--years">${years.map((y) => {
          const off = (min && y < min.getFullYear()) || (max && y > max.getFullYear());
          const cls = [sel && sel.getFullYear() === y ? 'is-selected' : '', cursor.getFullYear() === y ? 'is-cursor' : ''].join(' ');
          return `<button type="button" class="dp-cell ${cls}" data-year="${y}"${off ? ' disabled' : ''}>${y}</button>`;
        }).join('')}</div>`;
    } else if (view === 'month') {
      const y = cursor.getFullYear();
      html = header(String(y), 'Promijeni godinu')
        + `<div class="dp-grid dp-grid--months">${MONTHS.map((m, i) => {
          const off = (min && new Date(y, i + 1, 0) < min) || (max && new Date(y, i, 1) > max);
          const cls = [sel && sel.getFullYear() === y && sel.getMonth() === i ? 'is-selected' : '', cursor.getMonth() === i ? 'is-cursor' : ''].join(' ');
          return `<button type="button" class="dp-cell ${cls}" data-month="${i}"${off ? ' disabled' : ''}>${cap(m).slice(0, 3)}</button>`;
        }).join('')}</div>`;
    } else {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const first = new Date(y, m, 1);
      const lead = (first.getDay() + 6) % 7; // ponedjeljak je prvi dan
      const days = new Date(y, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span></span>');
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const cls = [sameDay(date, sel) ? 'is-selected' : '', sameDay(date, today) ? 'is-today' : '', sameDay(date, cursor) ? 'is-cursor' : ''].join(' ');
        cells.push(`<button type="button" class="dp-cell dp-day ${cls}" data-day="${d}" aria-label="${formatLong(date)}"${inRange(date) ? '' : ' disabled'}>${d}</button>`);
      }
      html = header(`${cap(MONTHS[m])} ${y}`, 'Promijeni mjesec i godinu')
        + `<div class="dp-week">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>`
        + `<div class="dp-grid dp-grid--days">${cells.join('')}</div>`;
    }
    pop.innerHTML = `${html}
      <div class="dp-foot">
        <span class="dp-hint">${view === 'year' ? 'Odaberite godinu' : view === 'month' ? 'Odaberite mjesec' : 'Odaberite dan'}</span>
        ${hidden.value ? '<button type="button" class="dp-clear" data-act="clear">Obriši</button>' : ''}
      </div>`;
    pop.dataset.view = view;
    place();
    if (focus) (pop.querySelector('.dp-cell.is-cursor:not([disabled])') || pop.querySelector('.dp-cell:not([disabled])'))?.focus();
  }

  function clampCursor(d) {
    if (min && d < min) return new Date(min);
    if (max && d > max) return new Date(max);
    return d;
  }

  function open() {
    if (pop) return;
    openPicker?.close();
    const sel = value();
    cursor = clampCursor(sel ? new Date(sel) : (max ? new Date(max.getFullYear() - 4, 0, 1) : new Date()));
    view = sel ? 'day' : startView;
    yearPage = cursor.getFullYear() - (cursor.getFullYear() % YEARS_PER_PAGE);
    pop = document.createElement('div');
    pop.className = 'dp-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Kalendar');
    pop.addEventListener('click', onClick);
    pop.addEventListener('keydown', onKey);
    // u otvoreni <dialog> (modal), inače se kalendar ne vidi i ne može kliknuti
    (input.closest('dialog') || document.body).append(pop);
    render();
    requestAnimationFrame(() => pop?.classList.add('is-open'));
    input.setAttribute('aria-expanded', 'true');
    input.closest('.field')?.classList.add('is-picking');
    openPicker = api;
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
  }

  function close(refocus = false) {
    if (!pop) return;
    const el = pop;
    pop = null;
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), 160);
    input.setAttribute('aria-expanded', 'false');
    input.closest('.field')?.classList.remove('is-picking');
    if (openPicker === api) openPicker = null;
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    if (refocus) input.focus({ preventScroll: true });
  }

  const onScroll = (e) => { if (pop && !pop.contains(e.target)) place(); };
  const onResize = () => { if (pop) place(); };
  const outside = (e) => { if (e.target !== input && !pop?.contains(e.target)) close(); };

  function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'clear') { setValue(null); close(true); return; }
    if (act === 'prev' || act === 'next') {
      const dir = act === 'prev' ? -1 : 1;
      if (view === 'year') yearPage += dir * YEARS_PER_PAGE;
      else if (view === 'month') cursor = new Date(cursor.getFullYear() + dir, cursor.getMonth(), 1);
      else cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
      render(false);
      pop.querySelector(`[data-act="${act}"]`)?.focus();
      return;
    }
    if (act === 'up') {
      if (view === 'day') view = 'month';
      else if (view === 'month') { view = 'year'; yearPage = cursor.getFullYear() - (cursor.getFullYear() % YEARS_PER_PAGE); }
      render();
      return;
    }
    if (b.dataset.year) { cursor = new Date(Number(b.dataset.year), cursor.getMonth(), 1); view = 'month'; render(); return; }
    if (b.dataset.month) { cursor = new Date(cursor.getFullYear(), Number(b.dataset.month), 1); view = 'day'; render(); return; }
    if (b.dataset.day) {
      setValue(new Date(cursor.getFullYear(), cursor.getMonth(), Number(b.dataset.day)));
      close(true);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.key === 'Tab') {
      // fokus ostaje unutar kalendara
      const items = [...pop.querySelectorAll('button:not([disabled])')];
      const i = items.indexOf(document.activeElement);
      const next = items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length];
      e.preventDefault();
      next?.focus();
      return;
    }
    const cell = document.activeElement?.closest('.dp-cell');
    if (!cell) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: view === 'day' ? -7 : -4, ArrowDown: view === 'day' ? 7 : 4 }[e.key];
    if (!step) return;
    e.preventDefault();
    if (view === 'day') {
      cursor = clampCursor(new Date(cursor.getFullYear(), cursor.getMonth(), Number(cell.dataset.day) + step));
    } else if (view === 'month') {
      cursor = new Date(cursor.getFullYear(), Math.min(11, Math.max(0, Number(cell.dataset.month) + step)), 1);
    } else {
      const y = Number(cell.dataset.year) + step;
      if (y < yearPage || y >= yearPage + YEARS_PER_PAGE) yearPage += step > 0 ? YEARS_PER_PAGE : -YEARS_PER_PAGE;
      cursor = new Date(y, cursor.getMonth(), 1);
    }
    render();
  }

  input.addEventListener('click', () => (pop ? close() : open()));
  input.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); open(); }
    else if (e.key === 'Escape') close();
    else if ((e.key === 'Backspace' || e.key === 'Delete') && hidden.value) { e.preventDefault(); setValue(null); }
  });
  input.form?.addEventListener('reset', () => setTimeout(() => { hidden.value = ''; input.value = ''; }));

  const api = { close };
}

export function initDatePickers(root = document) {
  root.querySelectorAll('input[data-datepicker]').forEach(enhanceDateInput);
}
