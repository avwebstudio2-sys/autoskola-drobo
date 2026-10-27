/*
 * Prilagođeni padajući meniji umjesto izgleda preglednika.
 * Izvorni <select> ostaje u formi (vrijednost, slanje, reset, postojeći 'change' slušači),
 * a korisnik vidi dugme i listu u stilu stranice. Lista je u <body> (position: fixed),
 * pa je ne odsijecaju tabele ni kontejneri sa overflow.
 */

const valueProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
const indexProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
const CHEVRON = '<svg class="cs-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg class="cs-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

let uid = 0;
let openMenu = null;

/* Lista se dodaje u otvoreni <dialog> ako je polje u njemu: modalni dijalog je iznad stranice
   i sve izvan njega je neaktivno, pa se lista dodana u <body> ne bi vidjela niti dala kliknuti. */
export const popupHost = (el) => el.closest('dialog') || document.body;

export function enhanceSelect(select) {
  if (select.dataset.cs || select.multiple || select.size > 1) return;
  select.dataset.cs = '1';
  const id = `cs${++uid}`;

  const wrap = document.createElement('span');
  wrap.className = 'cs';
  select.before(wrap);
  wrap.append(select);

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${id}-list`);
  button.innerHTML = `<span class="cs-value"></span>${CHEVRON}`;
  wrap.append(button);

  const label = select.getAttribute('aria-label')
    || (select.id && document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.textContent.replace('*', '').trim());
  if (label) button.setAttribute('aria-label', label);

  select.classList.add('cs-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  // Klik na <label for> fokusira izvorni select: fokus prebacujemo na dugme
  select.addEventListener('focus', () => button.focus());

  const valueEl = button.querySelector('.cs-value');
  const sync = () => {
    button.className = `cs-trigger ${select.className.replace('cs-native', '')}`.trim();
    const opt = select.options[select.selectedIndex];
    valueEl.textContent = opt ? opt.textContent : '';
    button.classList.toggle('is-placeholder', !opt || opt.value === '');
    button.disabled = select.disabled;
  };

  // Vrijednost postavljena iz koda (select.value = …) se odmah vidi i na dugmetu
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return valueProp.get.call(this); },
    set(v) { valueProp.set.call(this, v); sync(); },
  });
  Object.defineProperty(select, 'selectedIndex', {
    configurable: true,
    get() { return indexProp.get.call(this); },
    set(v) { indexProp.set.call(this, v); sync(); },
  });
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true, characterData: true });
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => setTimeout(sync));

  let list = null;
  let active = -1;
  let typed = '';
  let typedTimer;

  const options = () => [...select.options];
  const enabled = (i) => { const o = select.options[i]; return o && !o.disabled && !o.hidden; };
  // „Odaberite …“ (prazna, onemogućena stavka) je samo natpis na dugmetu, ne i u listi
  const isPlaceholder = (o) => o.value === '' && o.disabled;

  function setActive(i, scroll = true) {
    if (!list) return;
    active = i;
    list.querySelectorAll('.cs-option').forEach((li, n) => li.classList.toggle('is-active', n === i));
    const li = list.children[i];
    if (li) {
      button.setAttribute('aria-activedescendant', li.id);
      if (scroll) li.scrollIntoView({ block: 'nearest' });
    }
  }

  function move(from, step) {
    const n = select.options.length;
    for (let i = from + step; i >= 0 && i < n; i += step) if (enabled(i)) return i;
    return from;
  }

  function place() {
    const r = button.getBoundingClientRect();
    const below = innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    list.style.left = `${Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 180) - 8))}px`;
    list.style.minWidth = `${r.width}px`;
    list.style.maxHeight = `${Math.min(320, up ? above : below)}px`;
    list.style.top = up ? '' : `${r.bottom + 6}px`;
    list.style.bottom = up ? `${innerHeight - r.top + 6}px` : '';
    list.classList.toggle('is-up', up);
  }

  function open() {
    if (list || button.disabled) return;
    openMenu?.close();
    list = document.createElement('ul');
    list.className = 'cs-list';
    list.id = `${id}-list`;
    list.setAttribute('role', 'listbox');
    if (label) list.setAttribute('aria-label', label);
    list.innerHTML = options().map((o, i) => `
      <li class="cs-option" id="${id}-o${i}" role="option" data-i="${i}" aria-selected="${o.selected}"${!enabled(i) ? ' aria-disabled="true"' : ''}${o.hidden || isPlaceholder(o) ? ' hidden' : ''}>
        <span></span>${CHECK}
      </li>`).join('');
    options().forEach((o, i) => { list.children[i].querySelector('span').textContent = o.textContent; });
    list.addEventListener('pointerdown', (e) => e.preventDefault()); // fokus ostaje na dugmetu
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.cs-option');
      if (li && li.getAttribute('aria-disabled') !== 'true') choose(Number(li.dataset.i));
    });
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('.cs-option');
      if (li && li.getAttribute('aria-disabled') !== 'true' && Number(li.dataset.i) !== active) setActive(Number(li.dataset.i), false);
    });
    popupHost(wrap).append(list);
    place();
    requestAnimationFrame(() => list?.classList.add('is-open'));
    button.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    setActive(select.selectedIndex >= 0 ? select.selectedIndex : move(-1, 1));
    openMenu = api;
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
  }

  function close() {
    if (!list) return;
    const el = list;
    list = null;
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), 160);
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
    wrap.classList.remove('is-open');
    if (openMenu === api) openMenu = null;
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', close);
  }

  function onScroll(e) {
    if (list && !list.contains(e.target)) place();
  }

  function outside(e) {
    if (!wrap.contains(e.target) && !list?.contains(e.target)) close();
  }

  function choose(i) {
    const changed = indexProp.get.call(select) !== i;
    indexProp.set.call(select, i);
    sync();
    close();
    button.focus();
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  button.addEventListener('click', () => (list ? close() : open()));
  button.addEventListener('keydown', (e) => {
    const n = select.options.length;
    if (!list) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(move(active, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(move(active, -1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(move(-1, 1)); }
    else if (e.key === 'End') { e.preventDefault(); setActive(move(n, -1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (enabled(active)) choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') close();
    else if (e.key.length === 1) {
      // Brzo traženje: tipkanjem početnih slova
      clearTimeout(typedTimer);
      typed += e.key.toLowerCase();
      typedTimer = setTimeout(() => { typed = ''; }, 600);
      const hit = options().findIndex((o, i) => enabled(i) && o.textContent.trim().toLowerCase().startsWith(typed));
      if (hit >= 0) setActive(hit);
    }
  });

  const api = { close };
  sync();
}

/**
 * Prijedlozi ispod tekstualnog polja umjesto <datalist> preglednika.
 * Polje i dalje prima slobodan unos; s data-multi se prijedlog dodaje kao još jedna
 * vrijednost odvojena zarezom (npr. kategorije „A, B, C“).
 */
export function enhanceSuggest(input) {
  if (input.dataset.suggest) return;
  const dl = input.list || document.getElementById(input.getAttribute('list'));
  if (!dl) return;
  const values = [...dl.options].map((o) => o.value).filter(Boolean);
  input.dataset.suggest = '1';
  input.removeAttribute('list');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  const id = `sg${++uid}`;
  const multi = 'multi' in input.dataset;
  let list = null;
  let items = [];
  let active = -1;

  const parts = () => input.value.split(',').map((t) => t.trim());
  const current = () => (multi ? parts().pop() : input.value.trim()).toLowerCase();

  function filter() {
    const q = current();
    const taken = multi ? parts().slice(0, -1).map((t) => t.toLowerCase()) : [];
    return values.filter((v) => v.toLowerCase().startsWith(q) && !taken.includes(v.toLowerCase())
      && (multi || v.toLowerCase() !== q));
  }

  function place() {
    const r = input.getBoundingClientRect();
    const below = innerHeight - r.bottom - 12;
    const up = below < 180 && r.top > below;
    list.style.left = `${r.left}px`;
    list.style.minWidth = `${r.width}px`;
    list.style.maxHeight = `${Math.min(260, up ? r.top - 12 : below)}px`;
    list.style.top = up ? '' : `${r.bottom + 6}px`;
    list.style.bottom = up ? `${innerHeight - r.top + 6}px` : '';
  }

  function render() {
    items = filter();
    if (!items.length) { close(); return; }
    if (!list) {
      list = document.createElement('ul');
      list.className = 'cs-list cs-list--suggest';
      list.id = `${id}-list`;
      list.setAttribute('role', 'listbox');
      list.addEventListener('pointerdown', (e) => e.preventDefault());
      list.addEventListener('click', (e) => {
        const li = e.target.closest('.cs-option');
        if (li) choose(Number(li.dataset.i));
      });
      popupHost(input).append(list);
      requestAnimationFrame(() => list?.classList.add('is-open'));
      input.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-controls', list.id);
      window.addEventListener('scroll', onScroll, true);
    }
    active = Math.min(active, items.length - 1);
    list.innerHTML = items.map((v, i) => `<li class="cs-option${i === active ? ' is-active' : ''}" id="${id}-o${i}" role="option" data-i="${i}" aria-selected="${i === active}"><span></span></li>`).join('');
    items.forEach((v, i) => { list.children[i].querySelector('span').textContent = v; });
    place();
  }

  function close() {
    if (!list) return;
    const el = list;
    list = null;
    active = -1;
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), 160);
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    window.removeEventListener('scroll', onScroll, true);
  }

  const onScroll = (e) => { if (list && !list.contains(e.target)) place(); };

  function choose(i) {
    const v = items[i];
    if (v == null) return;
    input.value = multi ? [...parts().slice(0, -1), v].filter(Boolean).join(', ') : v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }

  input.addEventListener('focus', render);
  input.addEventListener('click', () => { if (!list) render(); });
  input.addEventListener('input', () => { active = -1; render(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!list) render();
      if (!items.length) return;
      active = e.key === 'ArrowDown' ? (active + 1) % items.length : (active - 1 + items.length) % items.length;
      render();
      input.setAttribute('aria-activedescendant', `${id}-o${active}`);
      list?.children[active]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && list && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' && list) {
      e.preventDefault();
      e.stopPropagation(); // ne zatvara cijeli dijalog
      close();
    }
  });
}

/** Pretvara sve postojeće i buduće <select class="select"> u prilagođene menije. */
export function initCustomSelects(root = document) {
  const run = (scope) => {
    scope.querySelectorAll?.('select.select:not([data-cs])').forEach(enhanceSelect);
    scope.querySelectorAll?.('input[list]:not([data-suggest])').forEach(enhanceSuggest);
  };
  run(root);
  if (initCustomSelects.observing) return;
  initCustomSelects.observing = true;
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches('select.select:not([data-cs])')) enhanceSelect(node);
        else if (node.matches('input[list]:not([data-suggest])')) enhanceSuggest(node);
        else run(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
