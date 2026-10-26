/*
 * Hero: cesta iz loga koja „vozi“ dok se skrola.
 * - Ako postoji /video/hero.mp4 (Google Flow), video se premotava skrolom.
 * - Dok videa nema (ili se ne može učitati), canvas crta perspektivu ceste
 *   sa isprekidanom linijom i svitanjem koje jača kako se skrola.
 * - Tekstualne faze (data-stage) se smjenjuju prema napretku skrola.
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

export function initHero(hero) {
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = hero.querySelector('.hero-canvas');
  const video = hero.querySelector('.hero-video');
  const stages = [...hero.querySelectorAll('.hero-stage')];
  const bar = hero.querySelector('.hero-progress-bar');
  const cue = hero.querySelector('.hero-scroll');

  const road = createRoad(canvas);
  let target = 0;
  let current = 0;
  let videoReady = false;

  setupVideo(video, () => {
    videoReady = true;
    hero.classList.add('has-video');
  });

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
    if (bar) bar.style.setProperty('--p', p.toFixed(4));
    if (cue) cue.style.opacity = String(1 - clamp(p * 6));
  };

  if (reduced) {
    road.draw(0.15, 0);
    window.addEventListener('resize', () => road.draw(0.15, 0));
    return;
  }

  readProgress();
  current = target;
  window.addEventListener('scroll', readProgress, { passive: true });
  window.addEventListener('resize', () => { road.resize(); readProgress(); });

  let last = performance.now();
  let idle = 0;
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);

  const tick = (now) => {
    const dt = Math.min(64, now - last) / 1000;
    last = now;
    if (visible) {
      current = lerp(current, target, 1 - Math.pow(0.0015, dt));
      if (Math.abs(current - target) < 0.0005) current = target;
      idle += dt;
      applyStages(current);
      if (videoReady && video.duration) {
        const t = current * (video.duration - 0.05);
        if (!video.seeking && Math.abs(video.currentTime - t) > 0.015) video.currentTime = t;
      } else {
        road.draw(current, idle);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupVideo(video, onReady) {
  // Video se učitava samo ako je naveden u HTML-u (data-src), da nema uzaludnih zahtjeva dok ga nema
  if (!video?.dataset.src) return;
  const small = matchMedia('(max-width: 720px)').matches;
  const sources = [small && video.dataset.srcMobile, video.dataset.src].filter(Boolean);
  let i = 0;
  const tryNext = () => {
    if (i >= sources.length) return;
    video.src = sources[i++];
    video.load();
  };
  video.addEventListener('error', tryNext);
  video.addEventListener('loadeddata', () => {
    video.pause();
    onReady();
  }, { once: true });
  tryNext();
}

/* ---------- Canvas cesta ---------- */

/** Crta prizor ceste na canvas; koristi se i za statičnu prvu sliku (public/img/hero-poster-*.webp). */
export function createRoad(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let ridges = [];

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ridges = [makeRidge(7, 0.55), makeRidge(13, 0.9)];
  };

  function makeRidge(seed, amp) {
    const pts = [];
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const waves = [0, 1, 2, 3].map((k) => ({ f: (k + 1) * (1.2 + rnd()), a: amp / (k + 1.4), ph: rnd() * 6.28 }));
    for (let x = 0; x <= 1.0001; x += 0.01) {
      let y = 0;
      waves.forEach((w) => { y += Math.sin(x * w.f * 3.1 + w.ph) * w.a; });
      pts.push([x, y]);
    }
    return pts;
  }

  const draw = (p, time) => {
    if (!W || !H) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 900;
    const vpx = W * (wide ? 0.62 : 0.5);
    // Uspravan ekran telefona: niži horizont, da tekst pri vrhu stoji preko neba, a cesta ostane ispod njega
    const portrait = !wide && H > W * 1.3;
    const horizon = H * (wide ? 0.46 : portrait ? 0.56 : 0.42);
    const dawn = smooth(clamp(p * 1.15));

    // Nebo: tamnoplavi sumrak prema jarkom crveno-narandžastom svitanju
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, `rgb(${lerp(34, 44, dawn)}, ${lerp(40, 46, dawn)}, ${lerp(78, 88, dawn)})`);
    sky.addColorStop(0.55, `rgb(${lerp(108, 170, dawn)}, ${lerp(40, 52, dawn)}, ${lerp(84, 84, dawn)})`);
    sky.addColorStop(1, `rgb(${lerp(218, 250, dawn)}, ${lerp(66, 120, dawn)}, ${lerp(48, 60, dawn)})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon + 1);

    // Sunce koje izlazi u tački nestajanja
    const sunY = horizon + lerp(H * 0.05, -H * 0.06, dawn);
    const glow = ctx.createRadialGradient(vpx, sunY, 0, vpx, sunY, Math.max(W, H) * 0.55);
    glow.addColorStop(0, `rgba(255, ${lerp(130, 186, dawn)}, ${lerp(70, 96, dawn)}, ${lerp(0.55, 0.95, dawn)})`);
    glow.addColorStop(0.18, `rgba(225, 40, 36, ${lerp(0.32, 0.48, dawn)})`);
    glow.addColorStop(1, 'rgba(215, 20, 26, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, horizon + 1);

    // Planine (dva sloja)
    const layers = [
      { pts: ridges[0], base: horizon, height: H * 0.11, color: `rgb(${lerp(80, 118, dawn)}, ${lerp(40, 46, dawn)}, ${lerp(74, 70, dawn)})`, shift: p * 0.02 },
      { pts: ridges[1], base: horizon + 2, height: H * 0.07, color: `rgb(${lerp(50, 62, dawn)}, ${lerp(36, 38, dawn)}, ${lerp(60, 58, dawn)})`, shift: p * 0.05 },
    ];
    layers.forEach((L) => {
      ctx.beginPath();
      ctx.moveTo(0, L.base);
      L.pts.forEach(([x, y]) => {
        const px = (x - L.shift) * W * 1.1;
        ctx.lineTo(px, L.base - L.height * (0.55 + y * 0.45));
      });
      ctx.lineTo(W, L.base);
      ctx.closePath();
      ctx.fillStyle = L.color;
      ctx.fill();
    });

    // Tlo
    const ground = ctx.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, '#35272f');
    ground.addColorStop(1, '#1e1f25');
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, W, H - horizon);

    // Perspektiva: dubina z (1 = dno ekrana) -> y na ekranu
    const near = 1;
    const far = 90;
    const yAt = (z) => horizon + (H - horizon) * (near / z);
    const half = W * (wide ? 0.62 : 0.85);
    const xAt = (z, side) => vpx + side * half * (near / z);

    // Asfalt
    const asphalt = ctx.createLinearGradient(0, horizon, 0, H);
    asphalt.addColorStop(0, `rgb(${lerp(112, 150, dawn)}, ${lerp(66, 76, dawn)}, ${lerp(80, 80, dawn)})`);
    asphalt.addColorStop(0.25, '#3c3d46');
    asphalt.addColorStop(1, '#2c2d34');
    ctx.beginPath();
    ctx.moveTo(xAt(far, -1), yAt(far));
    ctx.lineTo(xAt(far, 1), yAt(far));
    ctx.lineTo(xAt(near * 0.6, 1), yAt(near * 0.6));
    ctx.lineTo(xAt(near * 0.6, -1), yAt(near * 0.6));
    ctx.closePath();
    ctx.fillStyle = asphalt;
    ctx.fill();

    const travel = p * 260 + time * 1.4;

    // Rubne pune linije
    const edge = 0.9;
    ctx.fillStyle = 'rgba(242, 238, 234, 0.92)';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(vpx + side * half * edge * (near / far), yAt(far));
      ctx.lineTo(vpx + side * half * (edge + 0.02) * (near / far), yAt(far));
      ctx.lineTo(vpx + side * half * (edge + 0.02) / 0.6, yAt(0.6));
      ctx.lineTo(vpx + side * half * edge / 0.6, yAt(0.6));
      ctx.closePath();
      ctx.fill();
    });

    // Isprekidana srednja linija koja se kreće prema gledaocu
    const period = 7.5;
    const dash = 3.2;
    const lineHalf = 0.012;
    const offset = travel % period;
    for (let z0 = near * 0.6 - offset + period; z0 < far; z0 += period) {
      const za = Math.max(near * 0.6, z0);
      const zb = Math.min(far, z0 + dash);
      if (zb <= za) continue;
      const fade = clamp(1 - (za - 20) / 70);
      ctx.fillStyle = `rgba(242, 238, 234, ${0.95 * fade})`;
      ctx.beginPath();
      ctx.moveTo(vpx - half * lineHalf / za, yAt(za));
      ctx.lineTo(vpx + half * lineHalf / za, yAt(za));
      ctx.lineTo(vpx + half * lineHalf / zb, yAt(zb));
      ctx.lineTo(vpx - half * lineHalf / zb, yAt(zb));
      ctx.closePath();
      ctx.fill();
    }

    // Smjerokazni stupići sa crvenim reflektorom uz cestu
    const postGap = 14;
    const postOffset = travel % postGap;
    for (let z = near * 0.9 - postOffset + postGap; z < far * 0.7; z += postGap) {
      const scale = near / z;
      const fade = clamp(1 - (z - 10) / 50);
      const h = H * 0.11 * scale * 3;
      const w = Math.max(1, 10 * scale * 3);
      [-1, 1].forEach((side) => {
        const x = vpx + side * half * 1.08 * scale;
        const y = yAt(z);
        ctx.fillStyle = `rgba(232, 228, 224, ${0.85 * fade})`;
        ctx.fillRect(x - w / 2, y - h, w, h);
        ctx.fillStyle = `rgba(215, 20, 26, ${fade})`;
        ctx.fillRect(x - w / 2, y - h * 0.86, w, h * 0.16);
      });
    }

    // Blaga izmaglica na horizontu
    const haze = ctx.createLinearGradient(0, horizon - H * 0.06, 0, horizon + H * 0.08);
    haze.addColorStop(0, 'rgba(215, 20, 26, 0)');
    haze.addColorStop(0.5, `rgba(240, 100, 70, ${lerp(0.14, 0.26, dawn)})`);
    haze.addColorStop(1, 'rgba(215, 20, 26, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - H * 0.06, W, H * 0.14);
  };

  resize();
  return { draw, resize };
}
