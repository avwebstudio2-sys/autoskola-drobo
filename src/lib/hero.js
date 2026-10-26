/*
 * Hero: video vožnje (auto autoškole) koji se premotava skrolom.
 * - Video je pretvoren u niz WebP kadrova (scripts/prepare_hero_frames.py) i crta se na canvas:
 *   premotavanje je glatko u svim preglednicima, bez trzanja koje ima <video> pri traženju kadra.
 * - Kadrovi se učitavaju postepeno (prvo svaki 32., pa sve gušće), pa animacija radi odmah.
 * - Između susjednih kadrova se blago pretapa, a skrol se ublažava (lerp) za mekan pokret.
 * - Tekstualne faze (data-stage) se smjenjuju; kad auto skrene lijevo, tekst prelazi desno.
 */

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const STAGES = [
  [0, 0.27],
  [0.35, 0.6],
  [0.68, 1.01],
];
const FADE = 0.07;
/* Auto u videu od oko 3. sekunde prilazi i skreće ulijevo: tekst i zatamnjenje prelaze desno u ovom rasponu skrola */
const SIDE_SWITCH = [0.25, 0.34];

export function initHero(hero) {
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stages = [...hero.querySelectorAll('.hero-stage')];
  const bar = hero.querySelector('.hero-progress-bar');
  const cue = hero.querySelector('.hero-scroll');
  const player = createFramePlayer(hero.querySelector('.hero-canvas'), { preloadAll: !reduced });

  let target = 0;
  let current = 0;

  const readProgress = () => {
    const rect = hero.getBoundingClientRect();
    const range = hero.offsetHeight - window.innerHeight;
    target = range > 0 ? clamp(-rect.top / range) : 0;
  };

  const applyStages = (p) => {
    stages.forEach((el, i) => {
      const [start, end] = STAGES[i] || [0, 1];
      const fadeIn = i === 0 ? 1 : smooth(clamp((p - (start - FADE)) / FADE));
      const fadeOut = 1 - smooth(clamp((p - end) / FADE));
      const o = Math.min(fadeIn, fadeOut);
      const dir = p < start ? 1 : -1;
      el.style.opacity = o.toFixed(3);
      el.style.transform = o >= 0.999 ? 'none' : `translateY(${((1 - o) * 36 * dir).toFixed(1)}px)`;
      el.inert = o < 0.5;
    });
    const side = smooth(clamp((p - SIDE_SWITCH[0]) / (SIDE_SWITCH[1] - SIDE_SWITCH[0])));
    hero.style.setProperty('--side', side.toFixed(3));
    hero.classList.toggle('is-right', side > 0.5);
    if (bar) bar.style.setProperty('--p', p.toFixed(4));
    if (cue) cue.style.opacity = String(1 - clamp(p * 6));
  };

  window.addEventListener('resize', () => { player.resize(); readProgress(); });

  if (reduced) {
    const still = () => { player.draw(0); };
    player.onFrame = still;
    still();
    return;
  }

  readProgress();
  current = target;
  window.addEventListener('scroll', readProgress, { passive: true });

  let last = performance.now();
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);

  const tick = (now) => {
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    if (visible) {
      // Mekano praćenje skrola: kotačić miša skače, a animacija se kreće glatko
      current = lerp(current, target, 1 - Math.pow(0.0005, dt));
      if (Math.abs(current - target) < 0.0002) current = target;
      applyStages(current);
      player.draw(current);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Kadrovi na canvasu ---------- */

/**
 * Crta kadar videa za napredak p (0–1) na canvas.
 * Široki ekran: kadar pokriva cijeli hero (cover).
 * Uspravan ekran (telefon): kadar je traka na dnu, a iznad nje je nebo u boji vrha kadra,
 * tako da tekst pri vrhu stoji preko neba, a auto je vidljiv ispod; kadar prati auto kad skrene lijevo.
 */
export function createFramePlayer(canvas, { preloadAll = true } = {}) {
  const ctx = canvas.getContext('2d');
  const small = matchMedia('(max-width: 720px)').matches;
  const count = Number(small ? canvas.dataset.framesMobile : canvas.dataset.frames);
  const base = small ? canvas.dataset.pathMobile : canvas.dataset.path;
  const firstSrc = small ? null : canvas.dataset.poster;
  const frames = new Array(count).fill(null);
  const topColors = new Array(count).fill(null);
  const sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  sampler.canvas.width = 1;
  sampler.canvas.height = 1;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let lastKey = '';
  const api = { draw, resize, onFrame: null };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    lastKey = '';
  }

  const src = (i) => (i === 0 && firstSrc) || `${base}${String(i + 1).padStart(3, '0')}.webp`;

  function load(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = i === 0 ? 'high' : 'low';
      img.onload = () => {
        frames[i] = img;
        lastKey = '';
        api.onFrame?.();
        // Dekodiranje unaprijed samo ubrzava prvo iscrtavanje; ne čeka se na njega
        // (u pozadinskom tabu decode() čeka dok tab ne postane vidljiv)
        img.decode?.().catch(() => {});
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src(i);
    });
  }

  // Redoslijed učitavanja: prvi i zadnji kadar, pa svaki 32., 16., 8., 4., 2. i na kraju svi
  function loadAll() {
    const saveData = navigator.connection?.saveData;
    const order = [];
    const seen = new Set([0]);
    const push = (i) => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
    push(count - 1);
    for (const stride of saveData ? [32, 16, 8, 4] : [32, 16, 8, 4, 2, 1]) {
      for (let i = 0; i < count; i += stride) push(i);
    }
    let next = 0;
    let active = 0;
    const pump = () => {
      while (active < 6 && next < order.length) {
        active++;
        load(order[next++]).finally(() => { active--; pump(); });
      }
    };
    pump();
  }

  load(0).then(() => {
    if (!preloadAll) return;
    // Ostali kadrovi nakon što se stranica učita, da ne usporavaju prvi prikaz
    if (document.readyState === 'complete') setTimeout(loadAll, 200);
    else window.addEventListener('load', () => setTimeout(loadAll, 200), { once: true });
  });

  function nearest(i) {
    if (frames[i]) return i;
    for (let d = 1; d < count; d++) {
      if (frames[i - d]) return i - d;
      if (frames[i + d]) return i + d;
    }
    return -1;
  }

  function topColor(i) {
    if (!topColors[i]) {
      const img = frames[i];
      sampler.drawImage(img, 0, 0, img.naturalWidth, Math.max(2, img.naturalHeight * 0.04), 0, 0, 1, 1);
      const [r, g, b] = sampler.getImageData(0, 0, 1, 1).data;
      topColors[i] = [r, g, b];
    }
    return topColors[i];
  }

  function draw(p) {
    if (!W || !H) resize();
    if (!count) return;
    const pos = clamp(p) * (count - 1);
    const i0 = Math.floor(pos);
    const a = nearest(i0);
    if (a === -1) return;
    const b = a === i0 && frames[i0 + 1] ? i0 + 1 : -1;
    const frac = b === -1 ? 0 : pos - i0;
    const key = `${a}|${b}|${frac.toFixed(2)}|${W}x${H}|${p.toFixed(3)}`;
    if (key === lastKey) return;
    lastKey = key;

    const img = frames[a];
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let dx;
    let dy;
    let dw;
    let dh;

    if (W / H >= 1.15) {
      const scale = Math.max(W / iw, H / ih);
      dw = iw * scale;
      dh = ih * scale;
      // Kad auto skrene lijevo, kadar se pomjeri udesno (koliko dozvoljava rezanje slike),
      // da auto ostane lijevo, a desno bude mjesta za tekst i na ekranima užim od 16:9
      const pan = lerp(0.5, 1, smooth(clamp((p - 0.28) / 0.22)));
      dx = -(dw - W) * pan;
      dy = (H - dh) / 2;
    } else {
      dh = Math.max(H * 0.5, W * (ih / iw));
      dw = dh * (iw / ih);
      dy = H - dh;
      const focus = lerp(0.5, 0.33, smooth(clamp((p - 0.38) / 0.24)));
      dx = clamp(W / 2 - focus * dw, W - dw, 0);
      const [r, g, bl] = topColor(a);
      const sky = ctx.createLinearGradient(0, 0, 0, dy + 2);
      sky.addColorStop(0, `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(bl * 0.45)})`);
      sky.addColorStop(1, `rgb(${r}, ${g}, ${bl})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, dy + 2);
    }

    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, dw, dh);
    if (b !== -1 && frac > 0.01) {
      ctx.globalAlpha = frac;
      ctx.drawImage(frames[b], dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }

    if (W / H < 1.15) {
      // Meki prelaz između neba i vrha kadra
      const [r, g, bl] = topColor(a);
      const blend = ctx.createLinearGradient(0, dy, 0, dy + dh * 0.2);
      blend.addColorStop(0, `rgba(${r}, ${g}, ${bl}, 1)`);
      blend.addColorStop(1, `rgba(${r}, ${g}, ${bl}, 0)`);
      ctx.fillStyle = blend;
      ctx.fillRect(0, dy, W, dh * 0.2);
    }
  }

  resize();
  return api;
}
