import { renderHeader, renderFooter, icon, esc, formatDate, monthLabel, dayParts, telHref } from '../lib/ui.js';
import { getSettings, getList, todayISO, EXAM_TYPES } from '../lib/content.js';

renderHeader('ispiti');
const [settings, exams] = await Promise.all([getSettings(), getList('examDates')]);
renderFooter(settings);

const list = document.getElementById('exam-list');
const typeFilter = document.getElementById('type-filter');
const catFilter = document.getElementById('cat-filter');
const showPast = document.getElementById('show-past');
const state = { type: '', cat: '' };

const cats = [...new Set(exams.flatMap((e) => String(e.category || '').split(/[,\s]+/).filter(Boolean)))].sort();
catFilter.insertAdjacentHTML('beforeend', cats.map((c) => `<option value="${esc(c)}">Kategorija ${esc(c)}</option>`).join(''));

typeFilter.addEventListener('click', (e) => {
  const b = e.target.closest('.filter-chip');
  if (!b) return;
  state.type = b.dataset.type;
  typeFilter.querySelectorAll('.filter-chip').forEach((x) => {
    x.classList.toggle('is-active', x === b);
    x.setAttribute('aria-pressed', String(x === b));
  });
  render();
});
catFilter.addEventListener('change', () => { state.cat = catFilter.value; render(); });
showPast.addEventListener('change', render);
render();

function render() {
  const today = todayISO();
  const items = exams.filter((e) => {
    if (!showPast.checked && e.date < today) return false;
    if (state.type && e.type !== state.type) return false;
    if (state.cat && !String(e.category || '').split(/[,\s]+/).includes(state.cat)) return false;
    return true;
  });

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">${icon('calendar', { size: 34 })}<p><strong>Nema objavljenih termina za odabrane filtere.</strong><br />Novi rokovi se objavljuju čim budu poznati. Pitanja? Nazovite <a href="${telHref(settings.phone)}">${esc(settings.phone)}</a>.</p></div>`;
    return;
  }

  const groups = new Map();
  items.forEach((e) => {
    const k = e.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  });

  list.innerHTML = [...groups.entries()].map(([k, rows]) => `
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
