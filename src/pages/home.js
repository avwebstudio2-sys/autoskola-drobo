import { renderHeader, renderFooter, icon, esc, initReveal, telHref } from '../lib/ui.js';
import { getSettings, getList, submitEnrollment, submitMessage, todayISO } from '../lib/content.js';
import {
  announcementHTML, servicesHTML, categoriesHTML, scheduleHTML, examPreviewHTML, faqHTML,
  contactCardsHTML, mapEmbedSrc, categoryOptionsHTML, localBusinessLD, faqLD, ldJSON,
} from '../lib/render.js';
import { firebaseReady } from '../lib/firebase.js';
import { initHero } from '../lib/hero.js';
import { initCustomSelects } from '../lib/select.js';
import { initDatePickers } from '../lib/datepicker.js';

/*
 * Sav sadržaj je već upisan u HTML pri buildu (scripts/prerender-plugin.mjs).
 * Ovdje se samo dodaje ponašanje i osvježava sadržaj najnovijim podacima iz baze
 * (admin izmjene se vide odmah, a u HTML ulaze pri sljedećem buildu).
 */
let settings = null;

renderHeader('home');
initCustomSelects();
setupFaqAnimation();
injectIcons(document);
initHero(document.querySelector('.hero'));
initReveal();
setupEnrollForm();
setupContactForm();

settings = await getSettings();
const [services, categories, schedule, exams, faq] = await Promise.all([
  getList('services'), getList('categories'), getList('classSchedule'), getList('examDates'), getList('faq'),
]);
renderFooter(settings);
applySettings(settings);
setHTML('services-list', servicesHTML(services, categories));
setHTML('categories-list', categoriesHTML(categories));
setHTML('schedule-list', scheduleHTML(schedule));
setHTML('exam-preview', examPreviewHTML(exams, todayISO()));
setHTML('faq-list', faqHTML(faq));
setHTML('contact-cards', contactCardsHTML(settings));
updateCategoryOptions(categories);
updateStructuredData(settings, services, categories, faq);
const map = document.getElementById('map-frame');
if (map.getAttribute('src') !== mapEmbedSrc(settings)) map.src = mapEmbedSrc(settings);
initReveal();

function injectIcons(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (!el.querySelector('svg')) el.innerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size) || 20 });
  });
}

/** Zamijeni sadržaj samo ako se razlikuje od onog iz builda (da animacije i fokus ostanu netaknuti). */
function setHTML(id, html) {
  const box = document.getElementById(id);
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const strip = (el) => el.innerHTML.replace(/\s(class|style)="[^"]*"/g, '').replace(/\s+/g, ' ').trim();
  if (strip(tpl) === strip(box)) return;
  box.innerHTML = html;
}

function applySettings(s) {
  document.querySelectorAll('[data-setting]').forEach((el) => {
    if (s[el.dataset.setting]) el.textContent = s[el.dataset.setting];
  });
  document.querySelectorAll('[data-phone-link]').forEach((a) => { a.href = telHref(s.phone); });
  const ann = document.getElementById('announcement');
  ann.hidden = !s.announcement;
  if (s.announcement) ann.innerHTML = announcementHTML(s.announcement);
}

function updateCategoryOptions(categories) {
  const select = document.getElementById('f-category');
  const value = select.value;
  const html = categoryOptionsHTML(categories);
  if (select.dataset.html !== html) {
    select.innerHTML = html;
    select.dataset.html = html;
    select.value = value;
  }
}

function updateStructuredData(s, services, categories, faq) {
  const business = document.getElementById('ld-business');
  if (business) {
    const current = JSON.parse(business.textContent);
    business.textContent = ldJSON(localBusinessLD({
      settings: s, services, categories, siteUrl: current.url.replace(/\/$/, ''), image: current.image,
    }));
  }
  const faqScript = document.getElementById('ld-faq');
  if (faqScript) faqScript.textContent = ldJSON(faqLD(faq));
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
  if (el.dataset.validate === 'contact') {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return setError(el, !isEmail && v.replace(/\D/g, '').length < 6);
  }
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

/* Zamka za botove: skriveno polje „website“ ljudi ne vide i ne popunjavaju, a botovi koji
   popunjavaju sva polja da. Tada se ništa ne šalje u bazu, a bot vidi uobičajenu potvrdu. */
function isBot(form) {
  return Boolean(form.elements.namedItem('website')?.value);
}

/** Slanje ne smije visiti bez kraja (spora mreža, blokator): nakon 20 s javi grešku. */
function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => { setTimeout(() => reject(new Error('Isteklo vrijeme za slanje')), ms); }),
  ]);
}

function setBusy(btn, busy, label) {
  btn.disabled = busy;
  btn.setAttribute('aria-busy', String(busy));
  btn.textContent = label;
}

/* ---------- Upis ---------- */

function setupEnrollForm() {
  const form = document.getElementById('enroll-form');
  initDatePickers(form);
  const phone = () => settings?.phone || document.querySelector('[data-setting="phone"]').textContent;
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
      status.textContent = `Online prijava trenutno nije dostupna. Nazovite nas na ${phone()}.`;
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Šaljem…');
    const data = {
      fullName: form.fullName.value.trim(),
      dob: form.dob.value,
      phone: form.phone.value.trim(),
      category: form.category.value,
      program: form.program.value,
      otherSchool: form.program.value === 'teorija' ? form.otherSchool.value.trim() : '',
    };
    try {
      if (!isBot(form)) await withTimeout(submitEnrollment(data));
      showEnrollSuccess(data, settings || await getSettings());
    } catch (err) {
      console.error(err);
      status.dataset.type = 'error';
      status.textContent = `Prijava nije poslana. Pokušajte ponovo ili nas nazovite na ${phone()}.`;
      setBusy(btn, false, 'Pošalji prijavu');
    }
  });

}

function showEnrollSuccess(data, s) {
  document.getElementById('enroll-form').hidden = true;
  const box = document.getElementById('enroll-success');
  box.closest('.upis-card')?.classList.add('is-done');
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
  const fields = form.querySelector('.contact-fields');
  const success = document.getElementById('contact-success');
  const status = document.getElementById('contact-status');
  const btn = fields.querySelector('button[type="submit"]');
  const input = (name) => form.elements.namedItem(name);
  const phone = () => settings?.phone || document.querySelector('[data-setting="phone"]').textContent;
  attachLiveValidation(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!validateForm(form)) return;
    if (!firebaseReady) {
      status.dataset.type = 'error';
      status.textContent = `Slanje poruka trenutno nije dostupno. Nazovite nas na ${phone()}.`;
      return;
    }
    const data = {
      name: input('name').value.trim(),
      contact: input('contact').value.trim(),
      message: input('message').value.trim(),
    };
    setBusy(btn, true, 'Šaljem…');
    try {
      if (!isBot(form)) await withTimeout(submitMessage(data));
      document.getElementById('contact-success-name').textContent = data.name;
      document.getElementById('contact-success-contact').textContent = data.contact;
      injectIcons(success);
      fields.hidden = true;
      success.hidden = false;
      success.focus();
      form.reset();
    } catch (err) {
      console.error(err);
      status.dataset.type = 'error';
      status.textContent = `Poruka nije poslana. Provjerite internet vezu i pokušajte ponovo ili nas nazovite na ${phone()}.`;
    } finally {
      setBusy(btn, false, 'Pošalji poruku');
    }
  });

  document.getElementById('contact-again').addEventListener('click', () => {
    success.hidden = true;
    fields.hidden = false;
    input('name').focus();
  });
}

/* ---------- Česta pitanja: glatko otvaranje i zatvaranje ---------- */

/* <details> se inače otvara naglo; ovdje se odgovor razvija/skuplja po visini.
   Slušač je na listi, pa radi i kad se pitanja ponovo iscrtaju iz baze. */
function setupFaqAnimation() {
  const list = document.getElementById('faq-list');
  if (!list || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  list.addEventListener('click', (e) => {
    const summary = e.target.closest('.faq-item > summary');
    if (!summary) return;
    const item = summary.parentElement;
    const body = item.querySelector(':scope > :not(summary)');
    if (!body || item.dataset.animating) return;
    e.preventDefault();
    item.dataset.animating = '1';
    const finish = () => { delete item.dataset.animating; };
    if (item.open) {
      item.classList.add('is-closing');
      const anim = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 240, easing: 'ease' });
      anim.onfinish = () => { item.open = false; item.classList.remove('is-closing'); finish(); };
    } else {
      item.open = true;
      const anim = body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      anim.onfinish = finish;
    }
  });
}

