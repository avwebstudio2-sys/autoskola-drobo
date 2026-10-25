/*
 * Vite plugin: upisuje sadržaj stranice direktno u HTML (za pretraživače i AI alate koji ne pokreću JavaScript).
 *
 * Pri svakom buildu (npr. na Netlifyju):
 *   1. pročita javni sadržaj iz Firestore-a (usluge, kategorije, FAQ, raspored, ispitne rokove, postavke);
 *      ako baza nije dostupna ili je kolekcija prazna, koristi zadani sadržaj iz src/lib/defaults.js
 *   2. zamijeni oznake <!--ssr:...--> gotovim HTML-om (isti kod kao u pregledniku: src/lib/render.js)
 *   3. doda canonical, Open Graph, Twitter i JSON-LD oznake
 *   4. napravi robots.txt i sitemap.xml
 *
 * Adresa sajta: varijabla URL (Netlify je sam postavlja na glavnu domenu) ili SITE_URL, inače zadana ispod.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_CONFIG } from '../src/lib/firebase-config.js';
import { DEFAULT_SETTINGS, DEFAULTS, sortList, todayISO } from '../src/lib/defaults.js';
import { headerHTML, footerHTML, icon, esc, telHref } from '../src/lib/ui.js';
import {
  announcementHTML, servicesHTML, categoriesHTML, scheduleHTML, examPreviewHTML, faqHTML, contactCardsHTML,
  mapEmbedSrc, categoryOptionsHTML, examListHTML, examCategoryOptionsHTML, quizHubHTML,
  localBusinessLD, faqLD, ldJSON,
} from '../src/lib/render.js';

const DEFAULT_SITE_URL = 'https://autoskola-drobo.netlify.app';
const PAGES = {
  index: { path: '/', priority: '1.0' },
  testovi: { path: '/testovi', priority: '0.9' },
  ispiti: { path: '/ispiti', priority: '0.8' },
};
const OG_IMAGE = { path: '/img/og-image.jpg', width: 1200, height: 630, alt: 'Autoškola Edukacija – Drobo, Travnik: Edukacija. Kandidat. Sigurnost.' };

/* ---------- Firestore (REST, javno čitanje) ---------- */

function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return undefined;
}
const fromFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));

async function firestoreGet(docPath) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_CONFIG.projectId}/databases/(default)/documents`;
  const res = await fetch(`${base}/${docPath}?key=${PROJECT_CONFIG.apiKey}&pageSize=300`, { signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${docPath}: HTTP ${res.status}`);
  return res.json();
}

async function loadContent(useDefaultsOnly) {
  const content = { settings: { ...DEFAULT_SETTINGS }, ...structuredClone(DEFAULTS), source: 'zadani sadržaj' };
  if (useDefaultsOnly) return content;
  try {
    const site = await firestoreGet('settings/site');
    if (site?.fields) Object.assign(content.settings, fromFields(site.fields));
    for (const name of Object.keys(DEFAULTS)) {
      const json = await firestoreGet(name);
      const items = (json?.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...fromFields(d.fields || {}) }));
      if (items.length) content[name] = sortList(name, items);
    }
    content.source = 'Firestore';
  } catch (err) {
    console.warn(`[prerender] Firestore nije dostupan (${err.message}); koristim zadani sadržaj.`);
  }
  return content;
}

/* ---------- HTML ---------- */

const absolute = (siteUrl, p) => `${siteUrl}${p}`;

function headTags(page, html, siteUrl, c) {
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const url = absolute(siteUrl, PAGES[page]?.path || '/');
  const image = absolute(siteUrl, OG_IMAGE.path);
  const tags = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Autoškola Edukacija – Drobo" />`,
    `<meta property="og:locale" content="bs_BA" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
  ];
  const business = localBusinessLD({ settings: c.settings, services: c.services, categories: c.categories, siteUrl, image });
  tags.push(`<script type="application/ld+json" id="ld-business">${ldJSON(business)}</script>`);
  if (page === 'index') tags.push(`<script type="application/ld+json" id="ld-faq">${ldJSON(faqLD(c.faq))}</script>`);
  return tags.join('\n  ');
}

function injectIcons(html) {
  return html.replace(/(<(\w+)([^>]*?)\sdata-icon="([a-zA-Z]+)"([^>]*)>)(<\/\2>)/g, (m, open, tag, a, name, b, close) => {
    const size = Number(((a + b).match(/data-size="(\d+)"/) || [])[1]) || 20;
    return `${open}${icon(name, { size })}${close}`;
  });
}

function renderPage(page, html, siteUrl, c, questions) {
  const s = c.settings;
  const today = todayISO();
  const blocks = {
    head: headTags(page, html, siteUrl, c),
    header: `<header class="site-header">${headerHTML(page === 'index' ? 'home' : page)}</header>`,
    footer: `<footer class="site-footer">${footerHTML(s)}</footer>`,
    services: servicesHTML(c.services, c.categories),
    categories: categoriesHTML(c.categories),
    schedule: scheduleHTML(c.classSchedule),
    examPreview: examPreviewHTML(c.examDates, today),
    faq: faqHTML(c.faq),
    contact: contactCardsHTML(s),
    categoryOptions: categoryOptionsHTML(c.categories),
    examList: examListHTML(c.examDates.filter((e) => e.date >= today), today, s),
    examCategoryOptions: examCategoryOptionsHTML(c.examDates),
    quizHub: questions ? quizHubHTML({ mode: 'lekcije', data: questions, settings: s }) : '',
  };
  let out = html.replace(/<!--ssr:(\w+)-->/g, (m, name) => (name in blocks ? blocks[name] : m));
  out = out.replaceAll('%SSR_MAP_SRC%', esc(mapEmbedSrc(s)));

  // Tekstovi iz postavki (admin) i brojevi pitanja
  out = out.replace(/(data-setting="(\w+)"[^>]*>)([^<]*)(<)/g, (m, open, key, text, lt) => `${open}${s[key] ? esc(s[key]) : text}${lt}`);
  out = out.replace(/(<a [^>]*data-phone-link[^>]*href=")[^"]*(")/, `$1${esc(telHref(s.phone))}$2`);
  if (s.announcement) {
    out = out.replace('<a class="hero-announce" id="announcement" href="#upis" hidden></a>',
      `<a class="hero-announce" id="announcement" href="#upis">${announcementHTML(s.announcement)}</a>`);
  }
  if (questions) {
    const counts = { teorija: questions.teorija.length, znakovi: questions.znakovi.length, raskrsnice: questions.raskrsnice.length, prvaPomoc: questions.prvaPomoc.length };
    counts.total = counts.teorija + counts.znakovi + counts.raskrsnice + counts.prvaPomoc;
    out = out.replace(/(data-count="(\w+)"[^>]*>)(\d+)(<)/g, (m, open, key, n, lt) => `${open}${counts[key] ?? n}${lt}`);
  }
  return injectIcons(out);
}

function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function sitemapXml(siteUrl) {
  const today = todayISO();
  const urls = Object.values(PAGES).map((p) => `  <url>\n    <loc>${absolute(siteUrl, p.path)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.priority}</priority>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/* ---------- Plugin ---------- */

export default function prerender() {
  const siteUrl = (process.env.SITE_URL || process.env.URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  let root = process.cwd();
  let mode = 'production';
  let contentPromise;
  let questions;

  return {
    name: 'drobo-prerender',
    configResolved(config) {
      root = config.root;
      mode = config.mode;
    },
    buildStart() {
      contentPromise = undefined;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const page = path.basename(ctx.filename, '.html');
        if (page === 'admin') return html;
        contentPromise ??= loadContent(mode === 'emulator').then((c) => {
          console.log(`[prerender] sadržaj: ${c.source}, adresa sajta: ${siteUrl}`);
          return c;
        });
        questions ??= JSON.parse(fs.readFileSync(path.join(root, 'public/data/questions.json'), 'utf8'));
        return renderPage(page, html, siteUrl, await contentPromise, questions);
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl) });
    },
  };
}
