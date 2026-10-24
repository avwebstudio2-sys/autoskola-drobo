import { renderHeader, renderFooter, icon, esc, toast, initReveal, telHref, dayParts, formatDate } from '../lib/ui.js';
import { getSettings, getList, submitEnrollment, submitMessage, todayISO, EXAM_TYPES } from '../lib/content.js';
import { firebaseReady } from '../lib/firebase.js';
import { initHero } from '../lib/hero.js';

renderHeader('home');
injectIcons(document);
initHero(document.querySelector('.hero'));
loadCounts();

const settings = await getSettings();
renderFooter(settings);
applySettings(settings);

const [services, categories, schedule, exams, faq] = await Promise.all([
  getList('services'), getList('categories'), getList('classSchedule'), getList('examDates'), getList('faq'),
]);
renderServices(services, categories);
renderCategories(categories);
renderSchedule(schedule);
renderExams(exams);
renderFaq(faq);
renderContact(settings);
setupEnrollForm(categories, settings);
setupContactForm();
initReveal();

function injectIcons(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size) || 20 });
  });
}

async function loadCounts() {
  try {
    const meta = await (await fetch('/data/meta.json')).json();
    document.querySelectorAll('[data-count]').forEach((el) => {
      const v = meta.counts?.[el.dataset.count];
      if (v) el.textContent = v;
    });
  } catch { /* brojevi u HTML-u ostaju */ }
}

function applySettings(s) {
  document.querySelectorAll('[data-setting]').forEach((el) => {
    if (s[el.dataset.setting]) el.textContent = s[el.dataset.setting];
  });
  document.querySelectorAll('[data-phone-link]').forEach((a) => { a.href = telHref(s.phone); });
  const ann = document.getElementById('announcement');
  if (s.announcement) {
    ann.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(s.announcement)}${icon('arrow', { size: 16 })}`;
    ann.hidden = false;
  }
}

function renderServices(list, categories) {
  const box = document.getElementById('services-list');
  box.innerHTML = list.map((s, i) => {
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

function renderCategories(list) {
  document.getElementById('categories-list').innerHTML = list.map((c, i) => `
    <li data-reveal="${i % 4}">
      <div class="category-tile">
        <span class="category-code">${esc(c.code)}</span>
        <h3>${esc(c.name)}</h3>
        ${c.text ? `<p>${esc(c.text)}</p>` : ''}
      </div>
    </li>`).join('');
}

function renderSchedule(list) {
  const box = document.getElementById('schedule-list');
  if (!list.length) {
    box.innerHTML = `<div class="empty-state">${icon('calendar', { size: 32 })}<p><strong>Raspored časova uskoro.</strong><br />Za termine nas nazovite.</p></div>`;
    return;
  }
  box.innerHTML = `<div class="schedule">${list.map((r, i) => `
    <div class="schedule-row" data-reveal="${i % 4}">
      <span class="schedule-day">${esc(r.day)}</span>
      <span class="schedule-time">${icon('clock', { size: 18 })}${esc(r.time)}</span>
      <span class="schedule-what"><strong>${esc(r.title)}</strong>${r.note ? `<span>${esc(r.note)}</span>` : ''}</span>
      ${r.category ? `<span class="chip">${esc(r.category)}</span>` : '<span></span>'}
    </div>`).join('')}</div>`;
}

function renderExams(list) {
  const box = document.getElementById('exam-preview');
  const upcoming = list.filter((e) => e.date >= todayISO()).slice(0, 4);
  if (!upcoming.length) {
    box.outerHTML = `<div class="empty-state">${icon('calendar', { size: 32 })}<p><strong>Novi ispitni rokovi uskoro.</strong><br />Pratite stranicu „Ispitni rokovi“.</p></div>`;
    return;
  }
  box.innerHTML = upcoming.map((e, i) => {
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
  }).join('');
}

function renderFaq(list) {
  document.getElementById('faq-list').innerHTML = list.map((f, i) => `
    <details class="faq-item" data-reveal="${i % 3}"${i === 0 ? ' open' : ''}>
      <summary>${esc(f.q)}${icon('chevron')}</summary>
      <p>${esc(f.a)}</p>
    </details>`).join('');
}

function renderContact(s) {
  const items = [
    { ic: 'pin', label: 'Adresa', html: `<span class="val">${esc(s.address)}</span>` },
    { ic: 'phone', label: 'Telefon', html: `<a href="${telHref(s.phone)}">${esc(s.phone)}</a>${s.phone2 ? `<br /><a href="${telHref(s.phone2)}">${esc(s.phone2)}</a>` : ''}` },
    { ic: 'mail', label: 'E-mail', html: `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` },
    { ic: 'clock', label: 'Radno vrijeme', html: `<span class="val">${esc(s.hours)}</span>` },
    { ic: 'facebook', label: 'Facebook', html: `<a href="${esc(s.facebook)}" target="_blank" rel="noopener">Edukacija – Drobo</a>` },
  ];
  document.getElementById('contact-cards').innerHTML = items.map((it, i) => `
    <li data-reveal="${i}"><span class="ic">${icon(it.ic)}</span><div><small>${it.label}</small>${it.html}</div></li>`).join('');
  document.getElementById('map-frame').src = `https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery || s.address)}&z=15&output=embed`;
}

/* ---------- Validacija ---------- */

function setError(field, on) {
  const wrap = field.closest('.field');
  wrap?.classList.toggle('has-error', on);
  field.setAttribute('aria-invalid', String(on));
  return !on;
}

function validateField(el) {
  const v = el.type === 'checkbox' ? el.checked : el.value.trim();
  if (el.type === 'checkbox') return setError(el, el.required && !v);
  if (el.required && !v) return setError(el, true);
  if (el.minLength > 0 && v.length < el.minLength) return setError(el, true);
  if (el.type === 'tel') return setError(el, v.replace(/\D/g, '').length < 6);
  if (el.type === 'date' && v) {
    const year = Number(v.slice(0, 4));
    const now = new Date().getFullYear();
    return setError(el, !(year > now - 100 && year <= now - 14));
  }
  return setError(el, false);
}

function attachLiveValidation(form) {
  form.querySelectorAll('input, textarea, select').forEach((el) => {
    el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') validateField(el); });
    el.addEventListener('input', () => { if (el.closest('.field')?.classList.contains('has-error')) validateField(el); });
  });
}

function validateForm(form) {
  const fields = [...form.querySelectorAll('[required]')];
  const results = fields.map(validateField);
  const firstBad = fields[results.indexOf(false)];
  if (firstBad) firstBad.focus();
  return !firstBad;
}

/* ---------- Upis ---------- */

function setupEnrollForm(categories, s) {
  const form = document.getElementById('enroll-form');
  const select = form.querySelector('#f-category');
  select.innerHTML = '<option value="">Odaberite kategoriju</option>'
    + categories.map((c) => `<option value="${esc(c.code)}">${esc(c.code)} · ${esc(c.name)}</option>`).join('');

  const schoolField = document.getElementById('other-school-field');
  form.querySelectorAll('input[name="program"]').forEach((r) => r.addEventListener('change', () => {
    schoolField.hidden = form.program.value !== 'teorija';
  }));

  attachLiveValidation(form);
  const status = document.getElementById('enroll-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!validateForm(form)) return;
    if (!firebaseReady) {
      status.dataset.type = 'error';
      status.textContent = `Online prijava trenutno nije dostupna. Nazovite nas na ${s.phone}.`;
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Šaljem…';
    const data = {
      fullName: form.fullName.value.trim(),
      dob: form.dob.value,
      phone: form.phone.value.trim(),
      category: form.category.value,
      program: form.program.value,
      otherSchool: form.program.value === 'teorija' ? form.otherSchool.value.trim() : '',
    };
    try {
      await submitEnrollment(data);
      showEnrollSuccess(data, s);
    } catch (err) {
      console.error(err);
      status.dataset.type = 'error';
      status.textContent = `Prijava nije poslana. Pokušajte ponovo ili nas nazovite na ${s.phone}.`;
      btn.disabled = false;
      btn.textContent = 'Pošalji prijavu';
    }
  });

  document.getElementById('print-docs').addEventListener('click', () => window.print());
}

function showEnrollSuccess(data, s) {
  document.getElementById('enroll-form').hidden = true;
  const box = document.getElementById('enroll-success');
  document.getElementById('success-name').textContent = data.fullName;
  document.getElementById('success-phone').textContent = data.phone;
  const docs = Array.isArray(s.requiredDocs) ? s.requiredDocs : String(s.requiredDocs || '').split('\n');
  document.getElementById('docs-list').innerHTML = docs.filter(Boolean)
    .map((d) => `<li>${icon('check', { size: 18 })}<span>${esc(d)}</span></li>`).join('');
  document.getElementById('docs-note').textContent = s.docsNote || '';
  injectIcons(box);
  box.hidden = false;
  box.focus();
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------- Kontakt forma ---------- */

function setupContactForm() {
  const form = document.getElementById('contact-form');
  attachLiveValidation(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    if (!firebaseReady) { toast('Slanje poruka trenutno nije dostupno. Nazovite nas.', 'error'); return; }
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await submitMessage({
        name: form.name.value.trim(), contact: form.contact.value.trim(), message: form.message.value.trim(),
      });
      form.reset();
      toast('Poruka je poslana. Hvala!', 'success');
    } catch (err) {
      console.error(err);
      toast('Poruka nije poslana. Pokušajte ponovo.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
