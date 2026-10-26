/* Zajednički dijelovi stranice: logo, ikone, zaglavlje, podnožje, pomoćne funkcije. */

let logoCount = 0;

/**
 * Vektorska verzija loga autoškole (ispravljeno „SIGURNOST“).
 * Boje dolaze iz CSS varijabli --logo-red, --logo-road i --logo-bg.
 */
export function logoSVG({ title = 'Autoškola Edukacija – Drobo, Travnik', className = 'logo', id } = {}) {
  const n = id || `l${++logoCount}`;
  const top = `logo-top-${n}`;
  const bottom = `logo-bottom-${n}`;
  return `
<svg class="${className}" viewBox="0 0 1000 1000" role="img" aria-label="${title}">
  <title>${title}</title>
  <defs>
    <path id="${top}" d="M128.7 552.2 A375 375 0 1 1 871.3 552.2" />
    <path id="${bottom}" d="M87.6 602.8 A425 425 0 0 0 912.4 602.8" />
  </defs>
  <circle class="logo-bg" cx="500" cy="500" r="498" />
  <g class="logo-road" fill="none" stroke-linecap="butt">
    <path d="M222 600 L452 190" stroke-width="12" />
    <path d="M778 600 L548 190" stroke-width="12" />
    <path d="M500 190 V450" stroke-width="8" stroke-dasharray="38 34" />
  </g>
  <g class="logo-text">
    <text font-size="100" text-anchor="middle"><textPath href="#${top}" startOffset="50%" textLength="1260" lengthAdjust="spacingAndGlyphs">EDUKACIJA - Drobo d.o.o. Travnik</textPath></text>
    <text font-size="84" text-anchor="middle"><textPath href="#${bottom}" startOffset="50%" textLength="1100" lengthAdjust="spacingAndGlyphs">- EDUKACIJA - KANDIDAT - SIGURNOST -</textPath></text>
    <text x="500" y="590" font-size="126" text-anchor="middle" textLength="500" lengthAdjust="spacingAndGlyphs">AUTO ŠKOLA</text>
  </g>
</svg>`;
}

const ICONS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  wheel: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2.5"/><path d="M12 14.5V22M9.6 11.3 2.4 9.5M14.4 11.3l7.2-1.8"/>',
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  sign: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  cross: '<path d="M9 2v7H2M15 2v7h7M9 22v-7H2M15 22v-7h7"/>',
  aid: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  play: '<path d="m6 3 14 9-14 9V3z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h2"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
};

export function icon(name, { size = 20, className = '' } = {}) {
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const DAYS = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'];

export function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(iso, { weekday = true } = {}) {
  if (!iso) return '';
  const d = parseISODate(iso);
  const base = `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;
  return weekday ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function monthLabel(iso) {
  const d = parseISODate(iso);
  const m = MONTHS[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}.`;
}

export function dayParts(iso) {
  const d = parseISODate(iso);
  return { day: d.getDate(), month: MONTHS[d.getMonth()].slice(0, 3), weekday: DAYS[d.getDay()] };
}

export function telHref(phone) {
  const digits = String(phone).replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('0') ? `+387${digits.slice(1)}` : digits}`;
}

export const NAV = [
  { href: '/#usluge', label: 'Usluge' },
  { href: '/#casovi', label: 'Časovi' },
  { href: '/ispiti', label: 'Ispitni rokovi', page: 'ispiti' },
  { href: '/#upis', label: 'Upis' },
  { href: '/#faq', label: 'Pitanja' },
  { href: '/#kontakt', label: 'Kontakt' },
];

/* Zaglavlje i podnožje: isti HTML se upisuje u stranicu pri buildu (scripts/prerender-plugin.mjs),
   a u pregledniku se samo dodaje ponašanje. */
export function headerHTML(current = 'home') {
  return `
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="Autoškola Edukacija – Drobo, početna">
        <span class="brand-badge">${logoSVG({ className: 'logo logo-badge', id: 'hdr' })}</span>
        <span class="brand-text"><strong>Edukacija – Drobo</strong><small>Autoškola · Travnik</small></span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Glavni meni">
        <ul>
          ${NAV.map((l) => `<li><a href="${l.href}"${l.page === current ? ' aria-current="page"' : ''}>${l.label}</a></li>`).join('')}
        </ul>
        ${current === 'testovi' ? '' : `<a class="btn btn-primary nav-cta-mobile" href="/testovi">${icon('laptop')} Online testovi</a>`}
      </nav>
      ${current === 'testovi' ? '' : `<a class="btn btn-primary btn-sm header-cta" href="/testovi">${icon('laptop', { size: 18 })}<span>Online testovi</span></a>`}
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Otvori meni">${icon('menu', { size: 24 })}</button>
    </div>`;
}

export function renderHeader(current = 'home') {
  let header = document.querySelector('.site-header');
  if (!header) {
    header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = headerHTML(current);
    document.body.prepend(header);
  }

  const toggle = header.querySelector('.nav-toggle');
  const nav = header.querySelector('.main-nav');
  let lockedY = 0;
  // Dok je meni otvoren, stranica ispod se ne smije pomjerati (i na iOS-u, gdje overflow:hidden nije dovoljan)
  const lockScroll = (lock) => {
    const body = document.body;
    if (lock) {
      lockedY = window.scrollY;
      body.style.top = `-${lockedY}px`;
      body.classList.add('no-scroll');
    } else if (body.classList.contains('no-scroll')) {
      body.classList.remove('no-scroll');
      body.style.top = '';
      window.scrollTo({ top: lockedY, behavior: 'instant' });
    }
  };
  const setOpen = (open) => {
    if (open === header.classList.contains('nav-open')) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zatvori meni' : 'Otvori meni');
    toggle.innerHTML = icon(open ? 'x' : 'menu', { size: 24 });
    header.classList.toggle('nav-open', open);
    lockScroll(open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    setOpen(false);
    // Skok na sekciju iste stranice radimo ručno: preglednik ga preskoči dok se stranica otključava
    const url = new URL(a.href, location.href);
    const target = url.pathname === location.pathname && url.hash && document.querySelector(url.hash);
    if (target) {
      e.preventDefault();
      history.pushState(null, '', url.hash);
      const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }));
    }
  });
  nav.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return header;
}

export function footerHTML(settings) {
  return `
    <div class="container footer-grid">
      <div class="footer-brand">
        <span class="footer-logo">${logoSVG({ id: 'ftr' })}</span>
        <p class="footer-slogan">${esc(settings.slogan)}</p>
      </div>
      <div>
        <h2 class="footer-title">Kontakt</h2>
        <ul class="footer-list">
          <li>${icon('pin', { size: 18 })}<span>${esc(settings.address)}</span></li>
          <li>${icon('phone', { size: 18 })}<a href="${telHref(settings.phone)}">${esc(settings.phone)}</a></li>
          ${settings.phone2 ? `<li>${icon('phone', { size: 18 })}<a href="${telHref(settings.phone2)}">${esc(settings.phone2)}</a></li>` : ''}
          <li>${icon('mail', { size: 18 })}<a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer-title">Stranice</h2>
        <ul class="footer-list footer-links">
          <li><a href="/testovi">Online učenje testova</a></li>
          <li><a href="/ispiti">Ispitni rokovi</a></li>
          <li><a href="/#upis">Upis kandidata</a></li>
          <li><a href="/#faq">Česta pitanja</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer-title">Pratite nas</h2>
        <a class="btn btn-ghost btn-sm" href="${esc(settings.facebook)}" target="_blank" rel="noopener">${icon('facebook', { size: 18 })} Facebook</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <div class="footer-legal">
        <span>© ${new Date().getFullYear()} Edukacija – Drobo d.o.o. Travnik</span>
        <span class="footer-sep" aria-hidden="true"></span>
        <span>Sva prava zadržana.</span>
        <a href="/admin" class="footer-admin">Administracija</a>
      </div>
      <a class="footer-credit" href="https://avstudio.site" target="_blank" rel="noopener">
        <span>Stranicu izradio <strong>A&amp;V Web Studio</strong></span>
        <img src="/img/avstudio-logo.webp" alt="A&amp;V Web Studio logo" width="18" height="15" loading="lazy" />
      </a>
    </div>`;
}

/** Osvježi podnožje podacima iz baze (statička verzija je već u HTML-u). */
export function renderFooter(settings) {
  let footer = document.querySelector('.site-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.className = 'site-footer';
    document.body.append(footer);
  }
  footer.innerHTML = footerHTML(settings);
  return footer;
}

let toastTimer;
export function toast(message, type = 'info') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3800);
}

/** Lagano pojavljivanje elemenata sa [data-reveal] pri skrolanju. */
export function initReveal(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.is-revealed)');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${(Number(el.dataset.reveal) || 0) * 70}ms`);
    io.observe(el);
    if (i > 200) el.classList.add('is-revealed');
  });
}
