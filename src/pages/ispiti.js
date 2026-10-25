import { renderHeader, renderFooter } from '../lib/ui.js';
import { getSettings, getList, todayISO } from '../lib/content.js';
import { examListHTML, examCategoryOptionsHTML, splitCategories } from '../lib/render.js';

/* Lista rokova je već upisana u HTML pri buildu; ovdje se osvježava iz baze i dodaju filteri. */
renderHeader('ispiti');

const list = document.getElementById('exam-list');
const typeFilter = document.getElementById('type-filter');
const catFilter = document.getElementById('cat-filter');
const showPast = document.getElementById('show-past');
const state = { type: '', cat: '' };
let exams = [];
let settings = null;

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

[settings, exams] = await Promise.all([getSettings(), getList('examDates')]);
renderFooter(settings);
const options = examCategoryOptionsHTML(exams);
if (catFilter.innerHTML.replace(/\s+/g, '') !== options.replace(/\s+/g, '')) {
  catFilter.innerHTML = options;
  catFilter.value = state.cat;
}
render();

function render() {
  if (!settings) return;
  const today = todayISO();
  const items = exams.filter((e) => {
    if (!showPast.checked && e.date < today) return false;
    if (state.type && e.type !== state.type) return false;
    if (state.cat && !splitCategories(e.category).includes(state.cat)) return false;
    return true;
  });
  list.innerHTML = examListHTML(items, today, settings);
}
