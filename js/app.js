/* Simple pendulum · determining g — lesson app (no dependencies) */
(function () {
  'use strict';

  /* =====================================================================
     1. CONSTANTS + HELPERS
     ===================================================================== */
  const G_REAL = 980;                      // cm/s²
  const FOUR_PI2 = 4 * Math.PI * Math.PI;  // 39.478…
  const LAB = {
    rows: [
      { L: 20, T10: 10, T: 1, T2: 1 },
      { L: 40, T10: 14, T: 1.4, T2: 1.96 },
      { L: 60, T10: 16, T: 1.6, T2: 2.56 },
      { L: 80, T10: 18, T: 1.8, T2: 3.24 }
    ],
    S: 0.03, g: 1315.947
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) { const t = el('text', Object.assign({ x, y }, attrs || {}), parent); t.textContent = s; return t; }
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function trim(v, d) { if (!isFinite(v)) return '—'; return String(+Number(v).toFixed(d)); }
  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function radioGroup(id, onPick) {
    const box = $(id);
    const btns = Array.from(box.querySelectorAll('[role=radio]'));
    btns.forEach(b => b.addEventListener('click', () => { set(b); onPick(b); }));
    function set(b) { btns.forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); }
    return { btns, set, get: () => btns.find(b => b.getAttribute('aria-checked') === 'true') };
  }
  function parseNum(s) { if (s == null) return NaN; s = String(s).trim().replace(',', '.').replace(/\s/g, ''); if (!s) return NaN; return Number(s); }
  const near = (a, b, tol) => isFinite(a) && isFinite(b) && b !== 0 && Math.abs(a - b) / Math.abs(b) <= tol;

  /* Brass bob gradient shared by many SVGs */
  function bobDefs(svg, id) {
    const defs = el('defs', null, svg);
    let g = el('radialGradient', { id: id + '-bob', cx: .36, cy: .32, r: .78 }, defs);
    [['0', '#fbf0d4'], ['.3', '#e4c07e'], ['.75', '#b8873a'], ['1', '#7d571d']].forEach(s => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
    g = el('linearGradient', { id: id + '-rod', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    [['0', '#7f8d91'], ['.45', '#d9e0e2'], ['1', '#6b787c']].forEach(s => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
    g = el('linearGradient', { id: id + '-wood', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    [['0', '#f3e6c8'], ['1', '#e3cf9f']].forEach(s => el('stop', { offset: s[0], 'stop-color': s[1] }, g));
    return defs;
  }
  /* Retort stand: base, rod, arm, clamp; returns pivot */
  function drawStand(g, id, o) {
    const { rodX, baseY, armY, pivotX } = o;
    el('rect', { x: rodX - 52, y: baseY, width: 130, height: 16, rx: 5, fill: '#3b4a4f' }, g);
    el('rect', { x: rodX - 52, y: baseY, width: 130, height: 4, rx: 2, fill: '#5b6b70' }, g);
    el('rect', { x: rodX - 5, y: armY - 26, width: 10, height: baseY - armY + 26, rx: 4, fill: `url(#${id}-rod)` }, g);
    el('rect', { x: rodX - 10, y: armY - 9, width: 20, height: 18, rx: 4, fill: '#33413f' }, g);
    el('rect', { x: rodX, y: armY - 4, width: pivotX - rodX + 6, height: 8, rx: 3, fill: `url(#${id}-rod)` }, g);
    // split cork clamp
    el('path', { d: `M${pivotX - 10} ${armY + 2} h20 l-3 12 h-14 z`, fill: '#c9a26a', stroke: '#8d6a37', 'stroke-width': 1 }, g);
    el('line', { x1: pivotX, y1: armY + 3, x2: pivotX, y2: armY + 14, stroke: '#8d6a37', 'stroke-width': 1 }, g);
    return { x: pivotX, y: armY + 14 };
  }

  /* =====================================================================
     2. BACKGROUND — harmonograph traces + faint swinging pendulums
     ===================================================================== */
  (function background() {
    const cv = $('bg'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const traces = [], pends = [];
    const COL = ['43,106,87', '184,135,58', '74,120,148'];
    function newTrace(slot, t) {
      const ratios = [[2, 3], [3, 4], [3, 2], [4, 5], [5, 4], [1, 2], [2, 1], [3, 5]];
      const r = ratios[Math.floor(Math.random() * ratios.length)];
      const spots = [[.80, .72], [.22, .26], [.62, .18], [.30, .80]];
      const s = spots[(slot * 2 + Math.floor(Math.random() * 2)) % spots.length];
      return { cx: s[0], cy: s[1], R: .16 + Math.random() * .08, a: r[0] + (Math.random() - .5) * .02, b: r[1] + (Math.random() - .5) * .02,
        p1: Math.random() * 6.28, p2: Math.random() * 6.28, d: .018 + Math.random() * .01, col: COL[(slot + Math.floor(Math.random() * 3)) % 3],
        start: t, dur: 46 + Math.random() * 14, fade: 6, slot };
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pends.length = 0;
      [[.34, .62, 0], [.66, .9, 1], [.93, .45, 2]].forEach(([fx, fl, k]) => pends.push({ fx, fl, k, amp: .26 + k * .03, ph: k * 1.7 }));
    }
    function drawTrace(T, t) {
      const age = t - T.start, prog = clamp(age / T.dur, 0, 1);
      let alpha = 1;
      if (age > T.dur) alpha = clamp(1 - (age - T.dur) / T.fade, 0, 1);
      const S = Math.min(W, H) * T.R, cx = T.cx * W, cy = T.cy * H;
      const tMax = prog * 120, n = Math.max(2, Math.floor(prog * 2400));
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = tMax * i / n, e = Math.exp(-T.d * u);
        const x = cx + S * e * Math.sin(T.a * u * .5 + T.p1);
        const y = cy + S * e * Math.sin(T.b * u * .5 + T.p2);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(${T.col},${.16 * alpha})`; ctx.lineWidth = 1; ctx.stroke();
      // the "pen"
      if (age < T.dur) {
        const u = tMax, e = Math.exp(-T.d * u);
        const x = cx + S * e * Math.sin(T.a * u * .5 + T.p1), y = cy + S * e * Math.sin(T.b * u * .5 + T.p2);
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fillStyle = `rgba(${T.col},.35)`; ctx.fill();
      }
      return age > T.dur + T.fade;
    }
    function drawPend(P, t) {
      const px = P.fx * W, py = -4, L = P.fl * H;
      const w = Math.sqrt(G_REAL / (L * 1.6)) * .55;   // slowed, still √(g/L)
      const th = P.amp * Math.sin(w * t + P.ph);
      // arc guide
      ctx.beginPath(); ctx.arc(px, py, L, Math.PI / 2 - P.amp, Math.PI / 2 + P.amp);
      ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(29,40,43,.10)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      // ghost trail
      for (let k = 6; k >= 1; k--) {
        const tk = th - (P.amp * Math.cos(w * t + P.ph)) * w * k * .06;
        const bx = px + L * Math.sin(tk), by = py + L * Math.cos(tk);
        ctx.beginPath(); ctx.arc(bx, by, 9, 0, 6.283); ctx.fillStyle = `rgba(184,135,58,${.025 * (7 - k) / 6})`; ctx.fill();
      }
      const bx = px + L * Math.sin(th), by = py + L * Math.cos(th);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.strokeStyle = 'rgba(29,40,43,.12)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, 6.283); ctx.fillStyle = 'rgba(184,135,58,.16)'; ctx.fill();
      ctx.strokeStyle = 'rgba(141,100,36,.22)'; ctx.stroke();
    }
    const t0 = performance.now();
    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (let s = 0; s < 2; s++) {
        if (!traces[s]) traces[s] = newTrace(s, t - (s ? 20 : 8));
        if (drawTrace(traces[s], t)) traces[s] = newTrace(s, t);
      }
      pends.forEach(P => drawPend(P, t));
      if (!reduced) requestAnimationFrame(frame);
    }
    window.addEventListener('resize', size);
    size(); requestAnimationFrame(frame);
  })();

  /* =====================================================================
     3. NAVIGATION + PLUMB-LINE RAIL
     ===================================================================== */
  const views = Array.from(document.querySelectorAll('.view'));
  const ids = views.map(v => v.id.replace('view-', ''));
  const nav = $('rail-nav'), railLine = $('rail-line'), railBob = $('rail-bob'), btnPrev = $('btn-prev');
  const items = views.map((v, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rail-item';
    b.innerHTML = `<span>${v.dataset.title}</span>`;
    b.addEventListener('click', () => goTo(i, true));
    nav.appendChild(b);
    return b;
  });
  let current = -1;
  const onEnter = {}, onLeave = {};
  function fillRail() {
    const it = items[current]; if (!it) return;
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const plumb = railLine.parentElement;
    if (mobile) {
      plumb.style.setProperty('--fillw', ((current + .5) / items.length * 100) + '%');
      railLine.style.height = ''; railBob.style.top = '';
    } else {
      const tb = plumb.getBoundingClientRect(), ib = it.getBoundingClientRect();
      const y = clamp(ib.top + ib.height / 2 - tb.top, 0, 2000);
      railLine.style.height = y + 'px'; railBob.style.top = y + 'px';
    }
  }
  function goTo(i, push) {
    i = clamp(i, 0, views.length - 1);
    if (i === current) return;
    if (current >= 0 && onLeave[ids[current]]) onLeave[ids[current]]();
    current = i;
    views.forEach((v, k) => v.classList.toggle('active', k === i));
    items.forEach((b, k) => {
      b.classList.toggle('current', k === i); b.classList.toggle('done', k < i);
      if (k === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    btnPrev.hidden = i === 0;
    document.querySelector('.stage-top').style.maxWidth = views[i].querySelector('.sheet.wide') ? '1220px' : '';
    requestAnimationFrame(() => {
      fillRail();
      if (window.matchMedia('(max-width:980px)').matches) items[i].scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    if (push && location.hash !== '#' + ids[i]) history.pushState(null, '', '#' + ids[i]);
    window.scrollTo({ top: 0 });
    document.title = views[i].dataset.title.replace('&amp;', '&') + ' · Simple pendulum';
    if (onEnter[ids[i]]) onEnter[ids[i]]();
  }
  window.addEventListener('resize', () => requestAnimationFrame(fillRail));
  btnPrev.addEventListener('click', () => goTo(current - 1, true));
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => goTo(current + 1, true)));
  function fromHash() { const k = ids.indexOf(location.hash.replace('#', '')); return k < 0 ? 0 : k; }
  window.addEventListener('popstate', () => goTo(fromHash(), false));
  window.addEventListener('hashchange', () => goTo(fromHash(), false));

  /* =====================================================================
     4. CUSTOM CURSOR — a tiny pendulum whose bob swings as you move
     ===================================================================== */
  const cur = $('cursor');
  const fine = window.matchMedia('(pointer:fine)').matches;
  if (fine) {
    const arm = $('cu-arm');
    let mx = -100, my = -100, pvx = 0, lastX = null, phi = 0, om = 0, lastT = 0, running = false;
    function tickCursor(now) {
      const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
      const vx = lastX == null ? 0 : (mx - lastX) / dt; lastX = mx;
      const ax = clamp((vx - pvx) / dt, -60000, 60000); pvx = vx;
      const l = 30, g = 2600;
      const alpha = -(g / l) * Math.sin(phi) - (ax / l) * Math.cos(phi) * .35 - 5 * om;
      om += alpha * dt; phi = clamp(phi + om * dt, -1.2, 1.2);
      arm.setAttribute('transform', `rotate(${(phi * 180 / Math.PI).toFixed(2)})`);
      if (Math.abs(om) > .002 || Math.abs(phi) > .002 || Math.abs(vx) > 1) requestAnimationFrame(tickCursor);
      else { running = false; phi = 0; om = 0; arm.setAttribute('transform', ''); }
    }
    window.addEventListener('mousemove', e => {
      if (!document.body.classList.contains('has-cursor')) document.body.classList.add('has-cursor');
      mx = e.clientX; my = e.clientY;
      cur.style.transform = `translate(${mx}px,${my}px)`;
      cur.classList.remove('hidden');
      const t = e.target.closest ? e.target : null;
      const grab = t && t.closest('.bob-g, .slider-g, .handle');
      const hot = t && t.closest('button:not(:disabled), a, select, label, input[type=range], input[type=checkbox], .live');
      cur.classList.toggle('grab', !!grab);
      cur.classList.toggle('hot', !!hot && !grab);
      if (!running && !reduced) { running = true; lastT = performance.now(); lastX = mx; pvx = 0; requestAnimationFrame(tickCursor); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('hidden'));
    window.addEventListener('blur', () => cur.classList.add('hidden'));
  }

  /* =====================================================================
     5. AIM HERO + MEDICAL ICONS
     ===================================================================== */
  (function aimHero() {
    const svg = $('aim-hero'); bobDefs(svg, 'ah');
    const g = el('g', null, svg);
    const P = drawStand(g, 'ah', { rodX: 62, baseY: 372, armY: 40, pivotX: 196 });
    const L = 250, amp = .2;
    el('line', { x1: P.x, y1: P.y, x2: P.x, y2: P.y + L + 22, stroke: '#9fb0ab', 'stroke-dasharray': '4 6' }, svg);
    el('path', { d: `M${P.x + L * Math.sin(-amp)} ${P.y + L * Math.cos(amp)} A${L} ${L} 0 0 0 ${P.x + L * Math.sin(amp)} ${P.y + L * Math.cos(amp)}`, fill: 'none', stroke: '#c9b48a', 'stroke-dasharray': '2 6' }, svg);
    const str = el('line', { x1: P.x, y1: P.y, stroke: '#2b3a3e', 'stroke-width': 1.4 }, svg);
    const bob = el('circle', { r: 15, fill: 'url(#ah-bob)', stroke: '#7d571d' }, svg);
    txt(svg, P.x - 14, P.y + 140, 'L', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 30, fill: '#2b6a57', 'text-anchor': 'end' });
    const T = 2.6; const t0 = performance.now();
    function f(now) {
      const th = amp * Math.cos(2 * Math.PI * ((now - t0) / 1000) / T);
      const bx = P.x + L * Math.sin(th), by = P.y + L * Math.cos(th);
      str.setAttribute('x2', bx); str.setAttribute('y2', by); bob.setAttribute('cx', bx); bob.setAttribute('cy', by);
      if (!reduced) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  })();
  (function medIcons() {
    const c = '#2b6a57', b = '#b8873a';
    let s = $('med-ic-1');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#e3efea' }, s);
    el('circle', { cx: 40, cy: 14, r: 5, fill: c }, s);
    el('line', { x1: 40, y1: 19, x2: 40, y2: 36, stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
    const leg = el('g', null, s);
    el('line', { x1: 40, y1: 36, x2: 40, y2: 66, stroke: b, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, leg);
    el('circle', { cx: 40, cy: 66, r: 3.4, fill: b }, leg);
    if (!reduced) el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '-22 40 36;22 40 36;-22 40 36', dur: '1.6s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '.45 0 .55 1;.45 0 .55 1' }, leg);
    el('line', { x1: 40, y1: 36, x2: 34, y2: 64, stroke: c, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .45 }, s);
    s = $('med-ic-2');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#f6ecd8' }, s);
    el('path', { d: 'M26 66 L34 14 H46 L54 66 Z', fill: '#fff', stroke: '#8d6424', 'stroke-width': 2, 'stroke-linejoin': 'round' }, s);
    const rod = el('g', null, s);
    el('line', { x1: 40, y1: 60, x2: 40, y2: 20, stroke: '#1b272b', 'stroke-width': 2 }, rod);
    el('rect', { x: 36, y: 28, width: 8, height: 6, rx: 1.5, fill: b }, rod);
    if (!reduced) el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '-18 40 60;18 40 60;-18 40 60', dur: '1.2s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '.45 0 .55 1;.45 0 .55 1' }, rod);
    s = $('med-ic-3');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#e4eef3' }, s);
    const ecg = el('path', { d: 'M6 44 H22 L26 38 L30 44 H34 L38 20 L43 60 L47 44 H52 L56 36 L61 44 H74', fill: 'none', stroke: '#4a7894', 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': 140, 'stroke-dashoffset': 0 }, s);
    if (!reduced) el('animate', { attributeName: 'stroke-dashoffset', values: '140;0;0', keyTimes: '0;.6;1', dur: '2.2s', repeatCount: 'indefinite' }, ecg);
  })();

  /* =====================================================================
     6. THEORY — force diagram + small-angle check
     ===================================================================== */
  (function forces() {
    const svg = $('force-svg'); bobDefs(svg, 'fd');
    const defs = svg.querySelector('defs');
    [['ar-ink', '#1b272b'], ['ar-pine', '#2b6a57'], ['ar-brass', '#8d6424'], ['ar-sky', '#4a7894']].forEach(([id, c]) => {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0 L10 5 L0 10 z', fill: c }, m);
    });
    const P = { x: 150, y: 34 }, L = 215;
    el('rect', { x: 50, y: 18, width: 220, height: 14, rx: 3, fill: '#c7d2ce' }, svg);
    for (let i = 0; i < 12; i++) el('line', { x1: 56 + i * 18, y1: 18, x2: 66 + i * 18, y2: 8, stroke: '#9fb0ab', 'stroke-width': 1.5 }, svg);
    el('line', { x1: P.x, y1: P.y, x2: P.x, y2: P.y + L + 40, stroke: '#9fb0ab', 'stroke-dasharray': '4 6' }, svg);
    const g = el('g', null, svg);
    const slider = $('th-slider'), out = $('th-o'), box = $('small-angle');
    function arrow(x1, y1, x2, y2, mk, c, w) { return el('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w || 3, 'marker-end': `url(#${mk})` }, g); }
    function draw() {
      const deg = +slider.value, th = deg * Math.PI / 180;
      out.textContent = deg + '°';
      g.innerHTML = '';
      const bx = P.x + L * Math.sin(th), by = P.y + L * Math.cos(th);
      if (deg > 0) {
        const r = 58;
        el('path', { d: `M${P.x} ${P.y + r} A${r} ${r} 0 0 0 ${P.x + r * Math.sin(th)} ${P.y + r * Math.cos(th)}`, fill: 'none', stroke: '#8d6424', 'stroke-width': 1.6 }, g);
        txt(g, P.x + 70 * Math.sin(th / 2) + 4, P.y + 70 * Math.cos(th / 2) + 8, 'θ', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 22, fill: '#8d6424' });
        // arc path of the bob
        el('path', { d: `M${P.x - L * Math.sin(th)} ${P.y + L * Math.cos(th)} A${L} ${L} 0 0 0 ${bx} ${by}`, fill: 'none', stroke: '#d8c49b', 'stroke-dasharray': '3 6' }, g);
      }
      el('line', { x1: P.x, y1: P.y, x2: bx, y2: by, stroke: '#2b3a3e', 'stroke-width': 1.6 }, g);
      txt(g, P.x + (L / 2) * Math.sin(th) - 16, P.y + (L / 2) * Math.cos(th), 'L', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 24, fill: '#2b6a57', 'text-anchor': 'end' });
      const W = 110, ux = -Math.sin(th), uy = -Math.cos(th); // unit vector towards the pivot
      // tension
      arrow(bx, by, bx + ux * 80, by + uy * 80, 'ar-sky', '#4a7894');
      txt(g, bx + ux * 84 + 12, by + uy * 84 + 4, 'T', { 'font-family': 'Instrument Serif, serif', 'font-size': 22, fill: '#4a7894', 'font-weight': 700 });
      // weight
      arrow(bx, by, bx, by + W, 'ar-ink', '#1b272b');
      txt(g, bx - 10, by + W + 4, 'mg', { 'text-anchor': 'end', 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 22, fill: '#1b272b' });
      if (deg > 0) {
        const c = W * Math.cos(th), s = W * Math.sin(th);
        // along string (outward)
        arrow(bx, by, bx - ux * c, by - uy * c, 'ar-brass', '#8d6424', 2.2);
        txt(g, bx - ux * c + 12, by - uy * c + 2, 'mg cos θ', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 19, fill: '#8d6424' });
        // tangential (towards mean)
        const tx = -Math.cos(th), ty = Math.sin(th);
        arrow(bx, by, bx + tx * s, by + ty * s, 'ar-pine', '#2b6a57', 3);
        txt(g, bx + tx * s - 8, by + ty * s - 10, 'mg sin θ', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 19, fill: '#2b6a57', 'text-anchor': 'end' });
      }
      el('circle', { cx: bx, cy: by, r: 15, fill: 'url(#fd-bob)', stroke: '#7d571d' }, g);
      const rad = th, sin = Math.sin(th), diff = rad > 0 ? (rad - sin) / sin * 100 : 0;
      const longer = (th * th / 16 + 11 * Math.pow(th, 4) / 3072) * 100;
      box.className = 'small-angle' + (deg > 10 ? ' warn' : '');
      box.innerHTML = `θ = <b>${rad.toFixed(4)}</b> rad, sin θ = <b>${sin.toFixed(4)}</b><br>` +
        (deg === 0 ? 'At θ = 0 the bob hangs at rest: no restoring force.' :
        `sin θ ≈ θ is off by <b>${diff.toFixed(2)}%</b>; the true period is about <b>${longer.toFixed(2)}%</b> longer than 2π√(L/g).` +
        (deg > 10 ? ' Above 10° the formula starts to drift: keep the angle small.' : ' Small enough to ignore.'));
    }
    slider.addEventListener('input', draw);
    draw();
  })();

  /* Large-angle period (series) */
  function periodOf(L, g, th0) { return 2 * Math.PI * Math.sqrt(L / g) * (1 + th0 * th0 / 16 + 11 * Math.pow(th0, 4) / 3072); }
  /* RK4 step for θ'' = -(g/L) sin θ - c θ' */
  function rk4(s, dt, k, c) {
    const f = (th, om) => [om, -k * Math.sin(th) - c * om];
    const a = f(s.th, s.om), b = f(s.th + a[0] * dt / 2, s.om + a[1] * dt / 2);
    const d = f(s.th + b[0] * dt / 2, s.om + b[1] * dt / 2), e = f(s.th + d[0] * dt, s.om + d[1] * dt);
    s.th += dt / 6 * (a[0] + 2 * b[0] + 2 * d[0] + e[0]);
    s.om += dt / 6 * (a[1] + 2 * b[1] + 2 * d[1] + e[1]);
  }

  /* =====================================================================
     7. THEORY — compare two pendulums
     ===================================================================== */
  (function compare() {
    const svg = $('cmp-svg'); bobDefs(svg, 'cp');
    const defs = svg.querySelector('defs');
    let gg = el('radialGradient', { id: 'cp-bob2', cx: .36, cy: .32, r: .78 }, defs);
    [['0', '#eef3f5'], ['.35', '#9fb3bd'], ['1', '#3d5560']].forEach(s => el('stop', { offset: s[0], 'stop-color': s[1] }, gg));
    const SC = 2.6, TOP = 30;
    el('rect', { x: 40, y: TOP - 14, width: 440, height: 12, rx: 3, fill: '#c7d2ce' }, svg);
    const A = { x: 150, L: 60, m: 50, g: 980, a: 8, s: { th: 0, om: 0 }, label: 'A', fill: 'url(#cp-bob2)' };
    const B = { x: 370, L: 60, m: 50, g: 980, a: 8, s: { th: 0, om: 0 }, label: 'B', fill: 'url(#cp-bob)' };
    [A, B].forEach(p => {
      p.guide = el('line', { x1: p.x, y1: TOP, x2: p.x, y2: TOP + 290, stroke: '#d5ddda', 'stroke-dasharray': '3 6' }, svg);
      p.str = el('line', { x1: p.x, y1: TOP, stroke: '#2b3a3e', 'stroke-width': 1.3 }, svg);
      p.bob = el('circle', { fill: p.fill, stroke: '#4a4a3a', 'stroke-width': .8 }, svg);
      p.tag = txt(svg, p.x - 26, TOP + 22, p.label, { 'font-size': 20, 'font-weight': 700, fill: p.label === 'A' ? '#1b272b' : '#8d6424' });
    });
    const lO = $('cmp-l-o'), mO = $('cmp-m-o'), aO = $('cmp-a-o'), msg = $('cmp-msg');
    const gSeg = radioGroup('cmp-g', b => { B.g = +b.dataset.g; reset(); });
    let running = false, raf = 0, last = 0;
    function place(p) {
      const Lp = p.L * SC, bx = p.x + Lp * Math.sin(p.s.th), by = TOP + Lp * Math.cos(p.s.th);
      p.str.setAttribute('x2', bx); p.str.setAttribute('y2', by);
      p.bob.setAttribute('cx', bx); p.bob.setAttribute('cy', by);
      p.bob.setAttribute('r', (7 + 6 * Math.cbrt(p.m / 50)).toFixed(1));
    }
    function reset() {
      running = false; cancelAnimationFrame(raf);
      B.L = +$('cmp-l').value; B.m = +$('cmp-m').value; B.a = +$('cmp-a').value;
      lO.textContent = B.L + ' cm'; mO.textContent = B.m + ' g'; aO.textContent = B.a + '°';
      [A, B].forEach(p => { p.s.th = -p.a * Math.PI / 180; p.s.om = 0; place(p); });
      $('cmp-ta').textContent = '—'; $('cmp-tb').textContent = '—';
      msg.textContent = 'Both are pulled aside. Press Release both.';
    }
    function step(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const n = 8;
      [A, B].forEach(p => { for (let i = 0; i < n; i++) rk4(p.s, dt / n, p.g / p.L, 0); place(p); });
      if (running) raf = requestAnimationFrame(step);
    }
    function release() {
      reset(); running = true; last = performance.now(); raf = requestAnimationFrame(step);
      const ta = periodOf(A.L, A.g, A.a * Math.PI / 180), tb = periodOf(B.L, B.g, B.a * Math.PI / 180);
      $('cmp-ta').textContent = ta.toFixed(3) + ' s'; $('cmp-tb').textContent = tb.toFixed(3) + ' s';
      const notes = [];
      if (B.L !== A.L) notes.push(B.L > A.L ? 'a longer string gives a longer period' : 'a shorter string gives a shorter period');
      if (B.g !== A.g) notes.push('weaker gravity gives a longer period');
      if (B.a > 10) notes.push(`a ${B.a}° release is no longer "small", so the period grows slightly`);
      if (B.m !== A.m && notes.length === 0) msg.textContent = 'Same period, even with a different mass: the mass of the bob does not affect T.';
      else if (notes.length === 0) msg.textContent = 'Identical pendulums swing together.';
      else msg.textContent = 'B differs: ' + notes.join('; ') + (B.m !== A.m ? '. The different mass changes nothing.' : '.');
    }
    ['cmp-l', 'cmp-m', 'cmp-a'].forEach(id => $(id).addEventListener('input', reset));
    $('cmp-go').addEventListener('click', release);
    onLeave.theory = () => { running = false; cancelAnimationFrame(raf); };
    reset();
  })();

  /* =====================================================================
     8. METHOD — apparatus + illustrated steps
     ===================================================================== */
  (function apparatus() {
    const grid = $('app-grid');
    const items = [
      ['Retort stand and clamp', s => { bobDefs(s, 'ap1'); drawStand(s, 'ap1', { rodX: 40, baseY: 94, armY: 22, pivotX: 92 }); }],
      ['Split cork', s => { el('path', { d: 'M38 30 h20 l-4 50 h-16 z', fill: '#d2ad74', stroke: '#8d6a37', 'stroke-width': 1.5 }, s); el('path', { d: 'M62 30 h20 l-4 50 h-16 z', fill: '#c9a26a', stroke: '#8d6a37', 'stroke-width': 1.5 }, s); el('line', { x1: 60, y1: 18, x2: 60, y2: 96, stroke: '#2b3a3e', 'stroke-width': 1.3 }, s); }],
      ['Thread', s => { el('path', { d: 'M20 70 C30 30, 50 90, 60 50 S90 30, 100 60', fill: 'none', stroke: '#2b3a3e', 'stroke-width': 1.6 }, s); el('ellipse', { cx: 60, cy: 86, rx: 22, ry: 7, fill: 'none', stroke: '#2b3a3e', 'stroke-width': 1.2 }, s); el('ellipse', { cx: 60, cy: 84, rx: 18, ry: 5, fill: 'none', stroke: '#2b3a3e', 'stroke-width': 1.2 }, s); }],
      ['Metal bob', s => { bobDefs(s, 'ap4'); el('line', { x1: 60, y1: 14, x2: 60, y2: 42, stroke: '#2b3a3e', 'stroke-width': 1.4 }, s); el('circle', { cx: 60, cy: 42, r: 3, fill: '#5b6b70' }, s); el('circle', { cx: 60, cy: 66, r: 22, fill: 'url(#ap4-bob)', stroke: '#7d571d' }, s); }],
      ['Metre rule', s => { el('rect', { x: 8, y: 44, width: 104, height: 24, rx: 3, fill: '#f3e6c8', stroke: '#b89a5c' }, s); for (let i = 0; i <= 20; i++) el('line', { x1: 12 + i * 4.8, y1: 44, x2: 12 + i * 4.8, y2: i % 5 ? 51 : 57, stroke: '#5a4a2a', 'stroke-width': 1 }, s); }],
      ['Stopwatch', s => { el('rect', { x: 54, y: 10, width: 12, height: 10, rx: 2, fill: '#3b4a4f' }, s); el('circle', { cx: 60, cy: 60, r: 36, fill: '#fff', stroke: '#3b4a4f', 'stroke-width': 5 }, s); el('line', { x1: 60, y1: 60, x2: 60, y2: 32, stroke: '#b8873a', 'stroke-width': 3, 'stroke-linecap': 'round' }, s); el('circle', { cx: 60, cy: 60, r: 3.5, fill: '#1b272b' }, s); }]
    ];
    items.forEach(([name, f]) => {
      const d = document.createElement('div'); d.className = 'app-item';
      const s = el('svg', { viewBox: '0 0 120 110', 'aria-hidden': 'true' }); d.appendChild(s); f(s);
      const sp = document.createElement('span'); sp.textContent = name; d.appendChild(sp);
      grid.appendChild(d);
    });
  })();

  (function method() {
    const fig = $('step-fig'), cap = $('step-cap');
    const btns = Array.from(document.querySelectorAll('#steps .step'));
    let anim = 0, cur = 0;
    const caps = [
      'Clamp the thread between the two halves of the split cork so the point of suspension cannot slip. The bob hangs freely, clear of the bench.',
      'L runs from the point of suspension to the centre of the bob: the length of thread below the clamp plus the radius of the bob.',
      'Clear any old reading so the watch starts from 0.00 s.',
      'Pull the bob aside to a small angle and let go without pushing. Start the watch as it passes the centre and count "zero"; each return in the same direction is one oscillation. Stop on "ten".',
      'Longer pendulums swing more slowly. Four lengths give four points for the graph. Here the swings run at their true relative speeds.',
      'T² goes on the y-axis and L on the x-axis. Draw the best straight line and read the slope from two points far apart on it: S = ΔT² / ΔL.',
      'The slope is 4π² / g, so g = 4π² / S. With L in cm, g comes out in cm/s².'
    ];
    function frame(svg, id) { svg.innerHTML = ''; bobDefs(svg, id); return svg; }
    function mk(w, h) { const s = el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img' }); fig.innerHTML = ''; fig.appendChild(s); return s; }
    function hand(s, x, y, t, c, size, anchor) { return txt(s, x, y, t, { 'font-family': 'Gochi Hand, cursive', 'font-size': size || 22, fill: c || '#2b6a57', 'text-anchor': anchor || 'start' }); }
    function rig(s, id, L, th, o) {
      o = o || {};
      const P = drawStand(s, id, { rodX: o.rodX || 80, baseY: o.baseY || 336, armY: o.armY || 40, pivotX: o.pivotX || 250 });
      const bx = P.x + L * Math.sin(th), by = P.y + L * Math.cos(th);
      const str = el('line', { x1: P.x, y1: P.y, x2: bx, y2: by, stroke: '#2b3a3e', 'stroke-width': 1.4 }, s);
      const bob = el('circle', { cx: bx, cy: by, r: o.r || 14, fill: `url(#${id}-bob)`, stroke: '#7d571d' }, s);
      return { P, str, bob, L };
    }
    function stopAnim() { cancelAnimationFrame(anim); anim = 0; }
    const draws = [
      function s1() {
        const s = frame(mk(460, 360), 'm1'); rig(s, 'm1', 230, 0);
        hand(s, 290, 50, '← split cork clamp', '#8d6424');
        hand(s, 262, 170, 'thread', '#2b6a57');
        hand(s, 272, 300, '← bob', '#8d6424');
      },
      function s2() {
        const s = frame(mk(460, 360), 'm2'); const R = rig(s, 'm2', 230, 0, { r: 16 });
        const x = 340, y0 = R.P.y, y1 = R.P.y + 230;
        el('rect', { x: x - 8, y: y0 - 6, width: 30, height: 270, rx: 3, fill: 'url(#m2-wood)', stroke: '#b89a5c' }, s);
        for (let i = 0; i <= 25; i++) el('line', { x1: x - 8, y1: y0 + i * 10, x2: x - 8 + (i % 5 ? 7 : 13), y2: y0 + i * 10, stroke: '#5a4a2a' }, s);
        el('line', { x1: R.P.x, y1: y0, x2: x - 8, y2: y0, stroke: '#2b6a57', 'stroke-dasharray': '4 4' }, s);
        el('line', { x1: R.P.x + 16, y1: y1, x2: x - 8, y2: y1, stroke: '#2b6a57', 'stroke-dasharray': '4 4' }, s);
        el('path', { d: `M${x + 34} ${y0} v${y1 - y0}`, stroke: '#2b6a57', 'stroke-width': 2 }, s);
        el('path', { d: `M${x + 28} ${y0} h12 M${x + 28} ${y1} h12`, stroke: '#2b6a57', 'stroke-width': 2 }, s);
        txt(s, x + 46, (y0 + y1) / 2 + 10, 'L', { 'font-family': 'Instrument Serif, serif', 'font-style': 'italic', 'font-size': 34, fill: '#2b6a57' });
        el('circle', { cx: R.P.x, cy: y1, r: 2.5, fill: '#1b272b' }, s);
        hand(s, 120, y1 + 6, 'centre of bob →', '#8d6424', 20);
        hand(s, 110, y0 + 30, 'point of suspension ↗', '#8d6424', 20);
      },
      function s3() {
        const s = mk(460, 360);
        el('rect', { x: 210, y: 30, width: 40, height: 26, rx: 6, fill: '#3b4a4f' }, s);
        el('rect', { x: 130, y: 64, width: 30, height: 18, rx: 5, fill: '#2b6a57', transform: 'rotate(-30 145 73)' }, s);
        el('circle', { cx: 230, cy: 196, r: 130, fill: '#fff', stroke: '#3b4a4f', 'stroke-width': 10 }, s);
        for (let i = 0; i < 60; i++) { const a = i / 60 * 2 * Math.PI, r1 = i % 5 ? 112 : 102; el('line', { x1: 230 + r1 * Math.sin(a), y1: 196 - r1 * Math.cos(a), x2: 230 + 120 * Math.sin(a), y2: 196 - 120 * Math.cos(a), stroke: '#3b4a4f', 'stroke-width': i % 5 ? 1 : 2.2 }, s); }
        el('line', { x1: 230, y1: 196, x2: 230, y2: 92, stroke: '#b8873a', 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
        el('circle', { cx: 230, cy: 196, r: 7, fill: '#1b272b' }, s);
        el('rect', { x: 180, y: 226, width: 100, height: 34, rx: 6, fill: '#1d282b' }, s);
        txt(s, 230, 250, '0.00', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 22, fill: '#e9f3ee', 'text-anchor': 'middle', 'font-weight': 600 });
        hand(s, 112, 50, 'reset', '#2b6a57', 22, 'middle');
      },
      function s4() {
        const s = frame(mk(460, 360), 'm4'); const amp = 8 * Math.PI / 180;
        const R = rig(s, 'm4', 240, -amp);
        const P = R.P, L = 240;
        el('line', { x1: P.x, y1: P.y, x2: P.x, y2: P.y + L + 24, stroke: '#9fb0ab', 'stroke-dasharray': '4 6' }, s);
        const a10 = 10 * Math.PI / 180;
        el('path', { d: `M${P.x} ${P.y} L${P.x - L * Math.sin(a10)} ${P.y + L * Math.cos(a10)} A${L} ${L} 0 0 0 ${P.x + L * Math.sin(a10)} ${P.y + L * Math.cos(a10)} Z`, fill: 'rgba(43,106,87,.07)', stroke: 'none' }, s);
        hand(s, P.x - L * Math.sin(a10) - 8, P.y + L * Math.cos(a10) + 30, '10°', '#2b6a57', 20, 'end');
        hand(s, P.x + L * Math.sin(a10) + 8, P.y + L * Math.cos(a10) + 30, '10°', '#2b6a57', 20);
        el('rect', { x: P.x - 2, y: P.y + L + 18, width: 4, height: 14, fill: '#b8873a' }, s);
        const cnt = txt(s, 400, 120, '0', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 46, fill: '#8d6424', 'text-anchor': 'middle', 'font-weight': 600 });
        hand(s, 400, 150, 'count', '#8d6424', 20, 'middle');
        const T = 2.2; let t0 = performance.now(), prev = 0;
        function f(now) {
          const t = (now - t0) / 1000, th = -amp * Math.cos(2 * Math.PI * t / T);
          const bx = P.x + L * Math.sin(th), by = P.y + L * Math.cos(th);
          R.str.setAttribute('x2', bx); R.str.setAttribute('y2', by); R.bob.setAttribute('cx', bx); R.bob.setAttribute('cy', by);
          const n = Math.floor((t - T / 4) / T) + 1; // rightward crossings (first at T/4)
          if (n !== prev && n >= 0) { prev = n; cnt.textContent = String(n % 11); }
          if (!reduced) anim = requestAnimationFrame(f);
        }
        anim = requestAnimationFrame(f);
      },
      function s5() {
        const s = frame(mk(460, 360), 'm5');
        el('rect', { x: 30, y: 28, width: 400, height: 12, rx: 3, fill: '#c7d2ce' }, s);
        const Ls = [20, 40, 60, 80], xs = [80, 180, 280, 380], sc = 3.4, amp = .16;
        const ps = Ls.map((L, i) => {
          const str = el('line', { x1: xs[i], y1: 40, stroke: '#2b3a3e', 'stroke-width': 1.3 }, s);
          const bob = el('circle', { r: 11, fill: 'url(#m5-bob)', stroke: '#7d571d' }, s);
          txt(s, xs[i], 350, L + ' cm', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 16, fill: '#3a4a4f', 'text-anchor': 'middle' });
          return { L, x: xs[i], str, bob };
        });
        const t0 = performance.now();
        function f(now) {
          const t = (now - t0) / 1000;
          ps.forEach(p => {
            const T = 2 * Math.PI * Math.sqrt(p.L / G_REAL) * 1.6, th = amp * Math.cos(2 * Math.PI * t / T);
            const Lp = p.L * sc, bx = p.x + Lp * Math.sin(th), by = 40 + Lp * Math.cos(th);
            p.str.setAttribute('x2', bx); p.str.setAttribute('y2', by); p.bob.setAttribute('cx', bx); p.bob.setAttribute('cy', by);
          });
          if (!reduced) anim = requestAnimationFrame(f);
        }
        anim = requestAnimationFrame(f);
      },
      function s6() {
        const s = mk(460, 360);
        const X = L => 70 + L * 4.2, Y = v => 310 - v * 70;
        for (let i = 0; i <= 20; i++) el('line', { x1: X(i * 5), y1: Y(0), x2: X(i * 5), y2: Y(4), stroke: i % 4 ? '#eef3f0' : '#dbe5e0' }, s);
        for (let j = 0; j <= 8; j++) el('line', { x1: X(0), y1: Y(j * .5), x2: X(100), y2: Y(j * .5), stroke: j % 2 ? '#eef3f0' : '#dbe5e0' }, s);
        el('path', { d: `M${X(0)} ${Y(4) - 8} V${Y(0)} H${X(100) + 8}`, fill: 'none', stroke: '#1b272b', 'stroke-width': 2 }, s);
        txt(s, X(0) - 6, Y(4) - 16, 'T² (s²)', { 'font-size': 17, 'font-weight': 700, fill: '#4a7894', 'text-anchor': 'middle' });
        txt(s, X(100), Y(0) + 40, 'L (cm)', { 'font-size': 17, 'font-weight': 700, fill: '#8d6424', 'text-anchor': 'end' });
        [0, 20, 40, 60, 80, 100].forEach(v => txt(s, X(v), Y(0) + 20, String(v), { 'font-size': 14, fill: '#3a4a4f', 'text-anchor': 'middle' }));
        [1, 2, 3, 4].forEach(v => txt(s, X(0) - 10, Y(v) + 5, String(v), { 'font-size': 14, fill: '#3a4a4f', 'text-anchor': 'end' }));
        el('line', { x1: X(10), y1: Y(10 * .0366 + .36), x2: X(92), y2: Y(92 * .0366 + .36), stroke: '#2b6a57', 'stroke-width': 2.4 }, s);
        el('path', { d: `M${X(40)} ${Y(1.96)} H${X(60)} V${Y(2.56)}`, fill: 'rgba(184,135,58,.12)', stroke: '#8d6424', 'stroke-dasharray': '6 4', 'stroke-width': 1.8 }, s);
        hand(s, X(50), Y(1.96) + 22, 'ΔL', '#8d6424', 20, 'middle');
        hand(s, X(60) + 8, Y(2.26) + 6, 'ΔT²', '#8d6424', 20);
        LAB.rows.forEach(r => el('circle', { cx: X(r.L), cy: Y(r.T2), r: 5.5, fill: '#fff', stroke: '#8d6424', 'stroke-width': 2.4 }, s));
        hand(s, 300, 80, 'S = ΔT² / ΔL', '#2b6a57', 26, 'middle');
      },
      function s7() {
        const s = mk(460, 360);
        txt(s, 230, 150, 'g = 4π² / S', { 'font-family': 'Instrument Serif, serif', 'font-size': 64, fill: '#1b272b', 'text-anchor': 'middle' });
        txt(s, 230, 214, '4π² / 0.03 = 1315.95 cm/s²', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 19, fill: '#2b6a57', 'text-anchor': 'middle' });
        txt(s, 230, 248, '÷ 100  →  13.16 m/s²', { 'font-family': 'JetBrains Mono, monospace', 'font-size': 17, fill: '#8d6424', 'text-anchor': 'middle' });
      }
    ];
    function show(k) {
      stopAnim(); cur = k;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', i === k ? 'true' : 'false'));
      draws[k](); cap.textContent = caps[k];
    }
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
    onEnter.method = () => show(cur);
    onLeave.method = stopAnim;
    show(0); stopAnim();
  })();

  /* =====================================================================
     9. GRAPH PAPER — T² (y) against L (x)
     ===================================================================== */
  const GX = { x0: 104, x1: 716, y0: 66, y1: 462 };
  function niceStep(max, maxTicks) {
    const c = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    return c.find(s => max / s <= maxTicks) || 1000;
  }
  function graphBase(svg, o) {
    svg.innerHTML = '';
    const xmax = o.xmax, ymax = o.ymax, xs = o.xstep || niceStep(xmax, 10), ys = o.ystep || niceStep(ymax, 8);
    const X = x => GX.x0 + (x / xmax) * (GX.x1 - GX.x0);
    const Y = y => GX.y1 - (y / ymax) * (GX.y1 - GX.y0);
    const inv = (px, py) => [(px - GX.x0) / (GX.x1 - GX.x0) * xmax, (GX.y1 - py) / (GX.y1 - GX.y0) * ymax];
    const defs = el('defs', null, svg);
    const m = el('marker', { id: svg.id + '-ax', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto' }, defs);
    el('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#1b272b' }, m);
    const grid = el('g', null, svg);
    el('rect', { x: GX.x0, y: GX.y0, width: GX.x1 - GX.x0, height: GX.y1 - GX.y0, fill: '#fbfdfc' }, grid);
    const xm = xs / 5, ym = ys / 5;
    for (let i = 0; i * xm <= xmax + 1e-9; i++) { const x = X(i * xm); el('line', { x1: x, y1: GX.y0, x2: x, y2: GX.y1, stroke: i % 5 ? '#edf3f0' : '#d3e1da', 'stroke-width': i % 5 ? .8 : 1.1 }, grid); }
    for (let j = 0; j * ym <= ymax + 1e-9; j++) { const y = Y(j * ym); el('line', { x1: GX.x0, y1: y, x2: GX.x1, y2: y, stroke: j % 5 ? '#edf3f0' : '#d3e1da', 'stroke-width': j % 5 ? .8 : 1.1 }, grid); }
    el('line', { x1: GX.x0, y1: GX.y1, x2: GX.x1 + 16, y2: GX.y1, stroke: '#1b272b', 'stroke-width': 2, 'marker-end': `url(#${svg.id}-ax)` }, svg);
    el('line', { x1: GX.x0, y1: GX.y1, x2: GX.x0, y2: GX.y0 - 16, stroke: '#1b272b', 'stroke-width': 2, 'marker-end': `url(#${svg.id}-ax)` }, svg);
    const tl = el('g', { fill: '#3a4a4f', 'font-size': 19 }, svg);
    const dx = xs < 1 ? 1 : 0, dy = ys < 1 ? (ys < .2 ? 2 : 1) : 0;
    for (let v = 0; v <= xmax + 1e-9; v += xs) { txt(tl, X(v), GX.y1 + 28, v ? Math.abs(v).toFixed(dx) : '0', { 'text-anchor': 'middle' }); el('line', { x1: X(v), y1: GX.y1, x2: X(v), y2: GX.y1 + 6, stroke: '#1b272b' }, svg); }
    for (let v = ys; v <= ymax + 1e-9; v += ys) { txt(tl, GX.x0 - 12, Y(v) + 6, Math.abs(v).toFixed(dy), { 'text-anchor': 'end' }); el('line', { x1: GX.x0 - 6, y1: Y(v), x2: GX.x0, y2: Y(v), stroke: '#1b272b' }, svg); }
    txt(svg, GX.x0, 34, 'T² (s²)', { 'font-size': 23, 'font-weight': 700, fill: '#4a7894', 'text-anchor': 'middle' });
    txt(svg, GX.x1 + 14, GX.y1 + 64, 'L (cm)', { 'font-size': 23, 'font-weight': 700, fill: '#8d6424', 'text-anchor': 'end' });
    const layers = { ref: el('g', null, svg), line: el('g', null, svg), tri: el('g', null, svg), hover: el('g', null, svg), pts: el('g', null, svg), top: el('g', null, svg) };
    return { X, Y, inv, xmax, ymax, layers };
  }
  function lineSeg(G, parent, S, c, xa, xb, attrs) {
    // clip to the plot box
    let a = xa, b = xb;
    const yAt = x => S * x + c;
    if (S !== 0) {
      const xTop = (G.ymax - c) / S, xBot = (0 - c) / S;
      const lo = Math.min(xTop, xBot), hi = Math.max(xTop, xBot);
      a = Math.max(a, lo); b = Math.min(b, hi);
    }
    if (b <= a) return null;
    return el('line', Object.assign({ x1: G.X(a), y1: G.Y(yAt(a)), x2: G.X(b), y2: G.Y(yAt(b)), stroke: '#2b6a57', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, attrs || {}), parent);
  }
  function slopeTri(G, parent, p1, p2) {
    const [x1, y1] = p1[0] <= p2[0] ? p1 : p2, [x2, y2] = p1[0] <= p2[0] ? p2 : p1;
    const A = [G.X(x1), G.Y(y1)], B = [G.X(x2), G.Y(y2)];
    el('path', { d: `M${A[0]} ${A[1]} H${B[0]} V${B[1]}`, fill: 'rgba(184,135,58,.12)', stroke: '#8d6424', 'stroke-width': 2, 'stroke-dasharray': '7 5' }, parent);
    const dX = x2 - x1, dY = y2 - y1;
    const lowY = Math.max(A[1], B[1]);
    txt(parent, (A[0] + B[0]) / 2, lowY + 30, `ΔL = ${trim(Math.abs(dX), 2)} cm`, { class: 'hand', 'font-size': 24, fill: '#8d6424', 'text-anchor': 'middle' });
    const right = B[0] > 560;
    txt(parent, B[0] + (right ? -12 : 12), (A[1] + B[1]) / 2 + 8, `ΔT² = ${trim(Math.abs(dY), 3)} s²`, { class: 'hand', 'font-size': 24, fill: '#8d6424', 'text-anchor': right ? 'end' : 'start' });
    return { dX, dY };
  }
  function ptMark(G, parent, x, y, extra) {
    const g = el('g', Object.assign({ class: 'ptg' }, extra || {}), parent);
    el('circle', { class: 'hit', cx: G.X(x), cy: G.Y(y), r: 18 }, g);
    el('circle', { class: 'pt-dot', cx: G.X(x), cy: G.Y(y), r: 7, fill: '#fff', stroke: '#8d6424', 'stroke-width': 2.6 }, g);
    el('circle', { cx: G.X(x), cy: G.Y(y), r: 2.2, fill: '#8d6424', 'pointer-events': 'none' }, g);
    return g;
  }
  function hoverMark(G, layer, x, y) {
    layer.innerHTML = '';
    const px = G.X(x), py = G.Y(y);
    el('path', { d: `M${GX.x0} ${py} H${px} V${GX.y1}`, fill: 'none', stroke: '#4a7894', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, layer);
    const lab = (s, xx, yy, anchor) => {
      const t = txt(layer, xx, yy, s, { 'font-size': 15, 'font-weight': 700, fill: '#fff', 'text-anchor': anchor, 'font-family': 'JetBrains Mono, monospace' });
      const bb = t.getBBox();
      const r = el('rect', { x: bb.x - 6, y: bb.y - 3, width: bb.width + 12, height: bb.height + 6, rx: 5, fill: '#4a7894' }, layer);
      layer.insertBefore(r, t);
    };
    lab(trim(y, 3), GX.x0 + 8, py - 8, 'start');
    lab(trim(x, 1), px, GX.y1 - 10, 'middle');
    const tip = `L = ${trim(x, 1)} cm, T² = ${trim(y, 3)} s²`;
    const tx = clamp(px, GX.x0 + 110, GX.x1 - 110);
    const t = txt(layer, tx, py - 22, tip, { 'font-size': 16, 'font-weight': 600, fill: '#1b272b', 'text-anchor': 'middle' });
    const bb = t.getBBox();
    const r = el('rect', { x: bb.x - 10, y: bb.y - 5, width: bb.width + 20, height: bb.height + 10, rx: 8, fill: '#fff', stroke: '#c6d2cc' }, layer);
    layer.insertBefore(r, t);
  }
  function leastSq(pts) {
    const n = pts.length; if (n < 2) return null;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0; pts.forEach(p => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) ** 2; });
    if (sxx === 0) return null;
    const S = sxy / sxx; return { S, c: my - S * mx };
  }

  /* =====================================================================
     10. GRAPH PAGE — hover to highlight, compare slopes
     ===================================================================== */
  (function graphPage() {
    const svg = $('g-graph'), tbody = document.querySelector('#g-table tbody'), read = $('g-read'), refChk = $('g-ref');
    let mode = 'lab', lit = -1;
    radioGroup('g-mode', b => { mode = b.dataset.mode; render(); });
    refChk.addEventListener('change', render);
    const rows = LAB.rows.map((r, i) => {
      const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.L}</td><td>${r.T2}</td>`;
      tr.addEventListener('mouseenter', () => light(i)); tr.addEventListener('mouseleave', () => light(-1));
      tbody.appendChild(tr); return tr;
    });
    let G, pts = [];
    function light(i) {
      lit = i;
      rows.forEach((tr, k) => tr.classList.toggle('lit', k === i));
      pts.forEach((p, k) => p.classList.toggle('lit', k === i));
      if (i < 0) G.layers.hover.innerHTML = ''; else hoverMark(G, G.layers.hover, LAB.rows[i].L, LAB.rows[i].T2);
    }
    function render() {
      G = graphBase(svg, { xmax: 100, ymax: 4, xstep: 10, ystep: 0.5 });
      if (refChk.checked) {
        const Sr = FOUR_PI2 / G_REAL;
        lineSeg(G, G.layers.ref, Sr, 0, 0, 100, { stroke: '#4a7894', 'stroke-width': 2, 'stroke-dasharray': '8 6' });
        txt(G.layers.ref, G.X(90), G.Y(Sr * 90) - 14, 'g = 980 cm/s²', { class: 'hand', 'font-size': 22, fill: '#4a7894', 'text-anchor': 'end' });
      }
      let S, c, p1, p2, how;
      const R = LAB.rows;
      if (mode === 'lab') { p1 = [40, 1.96]; p2 = [60, 2.56]; how = 'the readings at 40 and 60 cm'; }
      else if (mode === 'ends') { p1 = [20, 1]; p2 = [80, 3.24]; how = 'the readings at 20 and 80 cm'; }
      else { const f = leastSq(R.map(r => [r.L, r.T2])); p1 = [20, f.S * 20 + f.c]; p2 = [80, f.S * 80 + f.c]; how = 'two points on the least-squares line'; }
      S = (p2[1] - p1[1]) / (p2[0] - p1[0]); c = p1[1] - S * p1[0];
      lineSeg(G, G.layers.line, S, c, 4, 98);
      slopeTri(G, G.layers.tri, p1, p2);
      pts = R.map((r, i) => {
        const g = ptMark(G, G.layers.pts, r.L, r.T2, { class: 'ptg live' });
        g.addEventListener('mouseenter', () => light(i)); g.addEventListener('mouseleave', () => light(-1));
        return g;
      });
      const g = FOUR_PI2 / S;
      read.innerHTML = `From ${how}:<br>S = ΔT² / ΔL = ${trim(p2[1] - p1[1], 3)} / ${trim(p2[0] - p1[0], 2)} = <b>${trim(S, 4)} s²/cm</b><br>g = 4π² / S = <b>${g.toFixed(2)} cm/s²</b><br>= <b>${(g / 100).toFixed(2)} m/s²</b>`;
      if (lit >= 0) light(lit);
    }
    render();
  })();

  /* =====================================================================
     11. MCQs — one list, numbered, choices shuffled
     ===================================================================== */
  const MCQ = [
    { q: 'What is the aim of this practical?', a: 'To determine g, the acceleration due to gravity', o: ['To determine the mass of the bob from its swing', 'To determine the tension in the thread', 'To determine the speed of the bob at the centre'],
      hint: 'Look at what the slope of the graph finally gives you.', ex: 'The slope of T² against L gives 4π²/g, so the experiment determines g.' },
    { q: 'The length L of a simple pendulum is measured from the point of suspension to…', a: 'the centre of the bob', o: ['the top of the bob', 'the bottom of the bob', 'the floor'],
      hint: 'The bob behaves as if all its mass were at one point.', ex: 'L = thread length below the clamp + radius of the bob, i.e. to the centre of the bob.' },
    { q: 'One complete oscillation of a pendulum is…', a: 'a swing from one side to the other and back again', o: ['a swing from one side to the other only', 'a swing from the centre to one side', 'the time the bob is at rest'],
      hint: 'After one oscillation the bob is back where it started, moving the same way.', ex: 'A full to-and-fro swing returns the bob to its starting position and direction.' },
    { q: 'T₁₀ = 14 s for ten oscillations. What is the period T?', a: '1.4 s', o: ['14 s', '140 s', '0.14 s'],
      hint: 'T = T₁₀ ÷ 10.', ex: 'T = 14 ÷ 10 = 1.4 s.' },
    { q: 'If T = 1.6 s, then T² is…', a: '2.56 s²', o: ['3.2 s²', '1.26 s²', '25.6 s²'],
      hint: 'Square means multiply by itself: 1.6 × 1.6.', ex: '1.6 × 1.6 = 2.56 s².' },
    { q: 'The period of a simple pendulum for small angles is given by…', a: 'T = 2π √(L / g)', o: ['T = 2π √(g / L)', 'T = 2π L / g', 'T = 4π² L / g'],
      hint: 'A longer pendulum swings more slowly, so L must be in the numerator.', ex: 'T = 2π√(L/g): T grows with √L and falls as g increases.' },
    { q: 'Which pair of quantities gives a straight-line graph through the origin?', a: 'T² against L', o: ['T against L', 'T against L²', 'T² against 1/L'],
      hint: 'Square both sides of T = 2π√(L/g).', ex: 'T² = (4π²/g) L is of the form y = S x, a straight line through the origin.' },
    { q: 'On the T² (y) against L (x) graph, the slope S is equal to…', a: '4π² / g', o: ['g / 4π²', '2π / g', '4π² g'],
      hint: 'Compare T² = (4π²/g) L with y = S x.', ex: 'The coefficient of L is 4π²/g, so S = 4π²/g and g = 4π²/S.' },
    { q: 'How is the slope found from two points on the T² against L line?', a: 'S = ΔT² / ΔL', o: ['S = ΔL / ΔT²', 'S = T² × L', 'S = ΔT / ΔL'],
      hint: 'Slope is rise over run: change in y divided by change in x.', ex: 'y = T² and x = L, so S = ΔT² / ΔL.' },
    { q: 'Using the points (40 cm, 1.96 s²) and (60 cm, 2.56 s²), the slope is…', a: '0.03 s²/cm', o: ['33.3 cm/s²', '0.3 s²/cm', '0.003 s²/cm'],
      hint: '(2.56 − 1.96) / (60 − 40).', ex: '0.60 / 20 = 0.03 s²/cm.' },
    { q: 'With S = 0.03 s²/cm, the value of g = 4π²/S is about…', a: '1315.95 cm/s²', o: ['13.16 cm/s²', '1.18 cm/s²', '131 595 cm/s²'],
      hint: '4π² ≈ 39.478; divide by 0.03.', ex: '39.478 / 0.03 = 1315.95 cm/s² (= 13.16 m/s²).' },
    { q: 'To convert g from cm/s² to m/s² you…', a: 'divide by 100', o: ['multiply by 100', 'divide by 1000', 'multiply by 10'],
      hint: '100 cm make 1 m, so a number of cm is 100 times the number of m.', ex: 'e.g. 980 cm/s² ÷ 100 = 9.8 m/s².' },
    { q: 'The accepted value of g is close to…', a: '980 cm/s²', o: ['98 cm/s²', '9800 cm/s²', '9.8 cm/s²'],
      hint: 'g ≈ 9.8 m/s²; convert to cm.', ex: '9.8 m/s² × 100 = 980 cm/s².' },
    { q: 'Why should the pendulum be released at a small angle (under about 10°)?', a: 'The formula uses sin θ ≈ θ, which is only accurate for small angles', o: ['A large angle would stretch the thread and change L', 'At a large angle the bob effectively becomes heavier', 'A small angle makes the value of g itself larger'],
      hint: 'Think about the approximation made in the derivation.', ex: 'For small θ, sin θ ≈ θ gives SHM. At large angles the true period becomes longer.' },
    { q: 'Doubling the mass of the bob (same length, small angle) makes the period…', a: 'stay the same', o: ['double', 'halve', 'increase by √2'],
      hint: 'Mass does not appear in T = 2π√(L/g).', ex: 'Mass cancels in the equation of motion, so T does not depend on it.' },
    { q: 'Making the pendulum four times longer makes the period…', a: 'twice as long', o: ['four times as long', 'half as long', 'unchanged'],
      hint: 'T is proportional to √L.', ex: '√4 = 2, so the period doubles.' },
    { q: 'On the Moon (smaller g), the same pendulum would swing with…', a: 'a longer period', o: ['a shorter period', 'the same period', 'no oscillation at all'],
      hint: 'g is in the denominator under the square root.', ex: 'Smaller g makes L/g larger, so T increases.' },
    { q: 'Why time 10 oscillations instead of just one?', a: 'The reaction-time error is shared over ten swings', o: ['The first swing is always faster than the rest', 'A stopwatch cannot measure a single swing', 'Ten swings make the bob slow down to a steady pace'],
      hint: 'The start/stop error is about the same however long you time.', ex: 'A 0.2 s reaction error becomes only 0.02 s on each period when divided by 10.' },
    { q: 'A student forgets to divide T₁₀ by 10 and plots T₁₀² against L. Their g will be…', a: '100 times too small', o: ['10 times too large', '100 times too large', 'unchanged'],
      hint: 'Every T² becomes 100 times bigger, so the slope does too.', ex: 'S is 100 times too big, and g = 4π²/S is 100 times too small.' },
    { q: 'At which length does a 0.2 s timing error in T₁₀ affect T² the most?', a: 'The shortest length, 20 cm', o: ['The longest length, 80 cm', 'It is the same at every length', 'The middle length, 60 cm'],
      hint: 'The same error is a bigger fraction of a smaller time.', ex: '0.2 s out of 10 s is 2% (4% on T²); out of 18 s it is about 1% (2% on T²).' }
  ];
  (function mcq() {
    const list = $('mcq-list'), score = $('mcq-score');
    let solved = 0;
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function updScore() { score.textContent = `${solved} of ${MCQ.length} correct`; }
    function render() {
      solved = 0; list.innerHTML = '';
      MCQ.forEach((m, qi) => {
        const li = document.createElement('li'); li.className = 'mcq';
        const opts = shuffle([m.a].concat(m.o));
        li.innerHTML = `<p class="mcq-q"><span class="mcq-n">${qi + 1}.</span><span></span></p><div class="mcq-opts"></div><div class="mcq-fb" aria-live="polite"></div>`;
        li.querySelector('.mcq-q span:last-child').textContent = m.q;
        const box = li.querySelector('.mcq-opts'), fb = li.querySelector('.mcq-fb');
        opts.forEach(o => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = o;
          b.addEventListener('click', () => {
            if (li.classList.contains('solved')) return;
            if (o === m.a) {
              b.classList.remove('wrong'); b.classList.add('right'); li.classList.add('solved');
              box.querySelectorAll('.opt').forEach(x => { x.disabled = true; x.classList.remove('wrong'); });
              fb.className = 'mcq-fb show explain'; fb.textContent = m.ex;
              solved++; updScore();
            } else {
              b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
              fb.className = 'mcq-fb show hint'; fb.textContent = 'Not quite. ' + m.hint;
            }
          });
          box.appendChild(b);
        });
        list.appendChild(li);
      });
      updScore();
    }
    $('mcq-reset').addEventListener('click', render);
    render();
  })();

  /* =====================================================================
     12. PRACTICAL
     ===================================================================== */
  (function practical() {
    /* ---------- lab-mode model: reproduces the recorded periods ---------- */
    const LP = LAB.rows.map(r => [r.L, r.T2]);
    function labT2(L) {
      if (L <= LP[0][0]) return LP[0][1] * L / LP[0][0];
      for (let i = 1; i < LP.length; i++) if (L <= LP[i][0]) { const [a, b] = [LP[i - 1], LP[i]]; return a[1] + (b[1] - a[1]) * (L - a[0]) / (b[0] - a[0]); }
      const [a, b] = [LP[LP.length - 2], LP[LP.length - 1]]; return b[1] + (b[1] - a[1]) / (b[0] - a[0]) * (L - b[0]);
    }
    const st = { L: 20, mode: 'real', slow: false, th: 0, om: 0, simT: 0, drag: null, swinging: false, relDeg: 0 };
    const gEff = () => st.mode === 'real' ? G_REAL : FOUR_PI2 * st.L / labT2(st.L);

    /* ---------- rig drawing ---------- */
    const svg = $('rig'); bobDefs(svg, 'rg');
    const SC = 5.6, P0 = { x: 250 };
    const stat = el('g', null, svg);
    const P = drawStand(stat, 'rg', { rodX: 70, baseY: 690, armY: 50, pivotX: P0.x });
    const RX = 410;
    el('line', { x1: P.x, y1: P.y, x2: P.x, y2: 676, stroke: '#a9b8b3', 'stroke-dasharray': '4 6' }, stat);
    // metre rule
    const rule = el('g', null, stat);
    el('rect', { x: RX - 6, y: P.y - 12, width: 34, height: 100 * SC + 26, rx: 4, fill: 'url(#rg-wood)', stroke: '#b89a5c' }, rule);
    for (let c = 0; c <= 100; c++) {
      const y = P.y + c * SC, len = c % 10 === 0 ? 16 : c % 5 === 0 ? 11 : 6;
      el('line', { x1: RX - 6, y1: y, x2: RX - 6 + len, y2: y, stroke: '#5a4a2a', 'stroke-width': c % 10 ? .8 : 1.3 }, rule);
      if (c % 10 === 0) txt(rule, RX + 22, y + 4.5, String(c), { 'font-size': 12.5, fill: '#5a4a2a', 'text-anchor': 'end', 'font-family': 'JetBrains Mono, monospace' });
    }
    txt(rule, RX + 11, P.y + 100 * SC + 30, 'cm', { 'font-size': 12, fill: '#5a4a2a', 'text-anchor': 'middle' });
    el('line', { x1: P.x + 12, y1: P.y, x2: RX - 6, y2: P.y, stroke: '#2b6a57', 'stroke-dasharray': '3 4' }, stat);
    // dynamic parts
    const dyn = el('g', null, svg);
    const restLine = el('line', { stroke: '#2b6a57', 'stroke-dasharray': '3 4' }, dyn);
    const arcG = el('g', null, dyn); let arcL = -1;
    function drawArc() {
      if (arcL === st.L) return; arcL = st.L; arcG.innerHTML = '';
      const R = st.L * SC, pt = (d, r) => [P.x + r * Math.sin(d * Math.PI / 180), P.y + r * Math.cos(d * Math.PI / 180)];
      const arc = (d1, d2, r) => { const [x1, y1] = pt(d1, r), [x2, y2] = pt(d2, r); return `M${x1} ${y1} A${r} ${r} 0 0 0 ${x2} ${y2}`; };
      el('path', { d: `M${P.x} ${P.y} L${pt(-10, R + 18).join(' ')} ${arc(-10, 10, R + 18).replace(/^M[^A]+/, '')} Z`, fill: 'rgba(43,106,87,.07)' }, arcG);
      el('path', { d: arc(-10, 10, R), fill: 'none', stroke: '#2b6a57', 'stroke-width': 2.4, 'stroke-opacity': .5 }, arcG);
      el('path', { d: arc(-35, -10, R), fill: 'none', stroke: '#b24a37', 'stroke-width': 1.6, 'stroke-opacity': .35, 'stroke-dasharray': '4 4' }, arcG);
      el('path', { d: arc(10, 35, R), fill: 'none', stroke: '#b24a37', 'stroke-width': 1.6, 'stroke-opacity': .35, 'stroke-dasharray': '4 4' }, arcG);
      for (let d = -30; d <= 30; d += 5) {
        if (!d) continue;
        const [x1, y1] = pt(d, R + 6), [x2, y2] = pt(d, R + (d % 10 ? 12 : 16));
        el('line', { x1, y1, x2, y2, stroke: Math.abs(d) > 10 ? '#b24a37' : '#2b6a57', 'stroke-width': 1.2, 'stroke-opacity': .7 }, arcG);
      }
      const labs = R > 150 ? [10, 20, 30] : [10, 30];
      labs.forEach(d => [-d, d].forEach(dd => { const [x, y] = pt(dd, R + 30); txt(arcG, x, y + 4, d + '°', { 'font-size': 12, fill: d > 10 ? '#b24a37' : '#2b6a57', 'text-anchor': 'middle' }); }));
    }
    const mark = el('g', null, dyn);
    const markBar = el('rect', { width: 4, height: 16, x: P.x - 2, fill: '#b8873a', rx: 1 }, mark);
    const markLab = txt(mark, P.x, 0, 'centre mark', { 'font-size': 11, fill: '#8d6424', 'text-anchor': 'middle' });
    const str = el('line', { x1: P.x, y1: P.y, stroke: '#2b3a3e', 'stroke-width': 1.5 }, dyn);
    const bobG = el('g', { class: 'bob-g' }, dyn);
    const bobHit = el('circle', { r: 30, fill: 'transparent' }, bobG);
    const bob = el('circle', { r: 13, fill: 'url(#rg-bob)', stroke: '#7d571d' }, bobG);
    const angLab = txt(dyn, 0, 0, '', { 'font-size': 18, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace' });
    const sliderG = el('g', { class: 'slider-g' }, svg);
    el('rect', { x: RX - 14, y: -16, width: 92, height: 32, fill: 'transparent' }, sliderG);
    el('path', { d: `M${RX - 12} 0 l12 -10 h40 a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h-40 z`, fill: '#b8873a', stroke: '#7d571d', transform: `translate(0 0)` }, sliderG);
    const sliderTxt = txt(sliderG, RX + 22, 5, '20', { 'font-size': 13, 'font-weight': 700, fill: '#fff', 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace' });
    const lenLab = txt(svg, RX + 70, 0, '', { 'font-size': 17, 'font-weight': 700, fill: '#2b6a57', 'font-family': 'JetBrains Mono, monospace' });

    function bobPos() { const Lp = st.L * SC; return [P.x + Lp * Math.sin(st.th), P.y + Lp * Math.cos(st.th)]; }
    function drawRig() {
      drawArc();
      const [bx, by] = bobPos(), yr = P.y + st.L * SC;
      str.setAttribute('x2', bx); str.setAttribute('y2', by);
      bobHit.setAttribute('cx', bx); bobHit.setAttribute('cy', by); bob.setAttribute('cx', bx); bob.setAttribute('cy', by);
      restLine.setAttribute('x1', P.x + 14); restLine.setAttribute('x2', RX - 6); restLine.setAttribute('y1', yr); restLine.setAttribute('y2', yr);
      markBar.setAttribute('y', yr + 22); markLab.setAttribute('y', yr + 54);
      sliderG.setAttribute('transform', `translate(0 ${yr})`); sliderTxt.textContent = st.L;
      lenLab.setAttribute('y', yr + 5); lenLab.textContent = '';
      const deg = st.th * 180 / Math.PI;
      if (st.drag === 'bob') {
        angLab.textContent = `θ = ${Math.abs(deg).toFixed(0)}°`;
        angLab.setAttribute('x', bx + (deg > 0 ? 34 : -34)); angLab.setAttribute('y', by - 18);
        angLab.setAttribute('fill', Math.abs(deg) > 10.5 ? '#b24a37' : '#2b6a57');
      } else angLab.textContent = '';
    }
    let markFlash = 0;
    function flashMark() { markBar.setAttribute('fill', '#2b6a57'); clearTimeout(markFlash); markFlash = setTimeout(() => markBar.setAttribute('fill', '#b8873a'), 180); }

    /* ---------- messages ---------- */
    const rigMsg = $('rig-msg'), swMsg = $('sw-msg');
    function say(elm, base, cls, s) { elm.className = base + (cls ? ' ' + cls : ''); elm.textContent = s; }

    /* ---------- length controls ---------- */
    const lenIn = $('p-len'), lenO = $('p-len-o'), quick = Array.from(document.querySelectorAll('#p-quick button'));
    function setL(L, fromUser) {
      L = clamp(Math.round(L), 10, 100);
      const changed = L !== st.L;
      st.L = L; lenIn.value = L; lenO.textContent = L + ' cm'; $('rec-l').textContent = L;
      quick.forEach(b => b.classList.toggle('on', +b.dataset.l === L));
      if (changed && fromUser) {
        const wasSwinging = st.swinging;
        st.th = 0; st.om = 0; st.swinging = false;
        if (sw.running || sw.acc > 0 || sw.armed) swReset(true);
        say(rigMsg, 'rig-msg', '', `L = ${L} cm, measured from the point of suspension to the centre of the bob.` + (wasSwinging ? ' The bob was stopped to change the length.' : ' Pull the bob aside and let go.'));
      }
      drawRig();
    }
    lenIn.addEventListener('input', () => setL(+lenIn.value, true));
    quick.forEach(b => b.addEventListener('click', () => setL(+b.dataset.l, true)));
    radioGroup('p-mode', b => {
      st.mode = b.dataset.mode;
      say(rigMsg, 'rig-msg', '', st.mode === 'lab'
        ? 'Lab mode: the pendulum reproduces the recorded lab times (T₁₀ = 10, 14, 16 and 18 s at 20, 40, 60 and 80 cm).'
        : `Real physics with g = 980 cm/s². At ${st.L} cm, 10 oscillations take about ${(10 * 2 * Math.PI * Math.sqrt(st.L / G_REAL)).toFixed(2)} s.`);
    });
    $('p-slow').addEventListener('change', e => {
      st.slow = e.target.checked;
      say(swMsg, 'sw-msg', '', st.slow ? 'Slow motion ×¼. The stopwatch still reads lab time, so your readings are unchanged.' : 'Normal speed.');
    });
    $('p-stop').addEventListener('click', () => { st.th = 0; st.om = 0; st.swinging = false; drawRig(); say(rigMsg, 'rig-msg', '', 'The bob is at rest. Pull it aside to start again.'); });

    /* ---------- bob + slider dragging ---------- */
    bobG.addEventListener('pointerdown', e => {
      e.preventDefault(); st.drag = 'bob'; st.swinging = false; st.om = 0;
      document.body.classList.add('dragging');
    });
    sliderG.addEventListener('pointerdown', e => { e.preventDefault(); st.drag = 'slider'; });
    window.addEventListener('pointermove', e => {
      if (!st.drag) return;
      const p = svgPoint(svg, e);
      if (st.drag === 'bob') {
        let a = Math.atan2(p.x - P.x, Math.max(20, p.y - P.y));
        a = clamp(a, -35 * Math.PI / 180, 35 * Math.PI / 180);
        st.th = a; st.om = 0;
        const d = Math.abs(a * 180 / Math.PI);
        if (d > 10.5) say(rigMsg, 'rig-msg', 'warn', `θ = ${d.toFixed(0)}°: too large. Keep the angle under 10°.`);
        else say(rigMsg, 'rig-msg', '', `θ = ${d.toFixed(0)}°. Let go to release.`);
        drawRig();
      } else setL((p.y - P.y) / SC, true);
    });
    window.addEventListener('pointerup', () => {
      if (st.drag === 'bob') {
        const d = Math.abs(st.th * 180 / Math.PI);
        st.relDeg = d;
        if (d < 1) { st.th = 0; say(rigMsg, 'rig-msg', '', 'Pull the bob a little further aside, about 5° to 8°.'); }
        else {
          st.swinging = true;
          if (d > 10.5) {
            const pct = ((periodOf(1, 1, st.th) / (2 * Math.PI)) - 1) * 100;
            say(rigMsg, 'rig-msg', 'warn', `Released at ${d.toFixed(0)}°, which is too large. T = 2π√(L/g) assumes a small angle (under 10°); here the period runs about ${pct.toFixed(1)}% long. Stop the bob and release it from a smaller angle.`);
          } else say(rigMsg, 'rig-msg', 'ok', `Released at ${d.toFixed(0)}°: a good small angle. Start the stopwatch as the bob crosses the centre mark moving right.`);
        }
        drawRig();
      }
      st.drag = null; document.body.classList.remove('dragging');
    });

    /* ---------- stopwatch + oscillation counter ---------- */
    const sw = { running: false, start: 0, acc: 0, count: 0, armed: false, auto: false };
    const swVal = $('sw-val'), swBox = $('stopwatch'), ctVal = $('ct-val'), ctBox = $('counter'), btnStart = $('sw-start');
    const dots = $('ct-dots'); for (let i = 0; i < 10; i++) dots.appendChild(document.createElement('i'));
    function swTime() { return sw.running ? sw.acc + (st.simT - sw.start) : sw.acc; }
    function showCount() {
      ctVal.textContent = sw.count;
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i < sw.count));
    }
    function swShow() { swVal.textContent = swTime().toFixed(2); swBox.classList.toggle('running', sw.running); btnStart.firstChild.textContent = sw.running ? 'Stop ' : 'Start '; }
    function swReset(silent) {
      sw.running = false; sw.acc = 0; sw.count = 0; sw.armed = false; sw.auto = false; showCount(); swShow();
      $('sw-auto').classList.remove('on');
      if (!silent) say(swMsg, 'sw-msg', '', 'Stopwatch reset to 0.00 s.');
    }
    function swToggle() {
      if (sw.armed || sw.auto) { sw.armed = false; sw.auto = false; $('sw-auto').classList.remove('on'); }
      if (!sw.running) {
        if (sw.acc > 0) { sw.acc = 0; sw.count = 0; showCount(); }
        sw.running = true; sw.start = st.simT; sw.count = 0; showCount();
        say(swMsg, 'sw-msg', '', st.swinging ? 'Running. Count each rightward crossing of the centre mark; stop on 10.' : 'Running, but the bob is at rest. Release the bob, reset and start again as it crosses the centre.');
      } else {
        sw.acc = swTime(); sw.running = false;
        if (sw.count === 10) say(swMsg, 'sw-msg', 'ok', `Stopped at ${sw.acc.toFixed(2)} s for 10 oscillations. Record it.`);
        else say(swMsg, 'sw-msg', 'warn', `Stopped at ${sw.acc.toFixed(2)} s, but the counter shows ${sw.count}. T₁₀ needs exactly 10 oscillations: reset and try again.`);
      }
      swShow();
    }
    btnStart.addEventListener('click', swToggle);
    $('sw-reset').addEventListener('click', () => swReset(false));
    $('sw-auto').addEventListener('click', () => {
      if (!st.swinging) { say(swMsg, 'sw-msg', 'warn', 'Release the bob first, then use Auto-count 10.'); return; }
      swReset(true); sw.armed = true; $('sw-auto').classList.add('on');
      say(swMsg, 'sw-msg', '', 'Auto-count: waiting for the bob to cross the centre mark moving right…');
    });
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' || ids[current] !== 'practical') return;
      const tg = e.target.tagName;
      if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA') return;
      e.preventDefault(); if (!e.repeat) swToggle();
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && ids[current] === 'practical' && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
    function onCrossing(tc) {
      flashMark();
      if (sw.armed) {
        sw.armed = false; sw.auto = true; sw.running = true; sw.start = tc; sw.acc = 0; sw.count = 0; showCount();
        say(swMsg, 'sw-msg', '', 'Auto-count: started at the centre ("zero"). Counting…');
        return;
      }
      if (!sw.running) return;
      sw.count++; showCount(); ctBox.classList.remove('bump'); void ctBox.offsetWidth; ctBox.classList.add('bump');
      if (sw.auto && sw.count === 10) {
        sw.acc = tc - sw.start; sw.running = false; sw.auto = false; $('sw-auto').classList.remove('on');
        say(swMsg, 'sw-msg', 'ok', `Auto-count: 10 oscillations in ${sw.acc.toFixed(2)} s. Record it.`);
      } else if (sw.count === 11) say(swMsg, 'sw-msg', 'warn', 'That is 11: you have gone past 10. Stop, reset and time again.');
    }

    /* ---------- simulation loop ---------- */
    let raf = 0, last = 0, active = false;
    function loop(now) {
      const real = Math.min(.05, (now - last) / 1000); last = now;
      const dt = real * (st.slow ? .25 : 1);
      if (st.swinging && !st.drag) {
        const k = gEff() / st.L, n = Math.max(1, Math.ceil(dt / .002)), h = dt / n;
        for (let i = 0; i < n; i++) {
          const th0 = st.th, t0 = st.simT;
          rk4(st, h, k, .006); st.simT += h;
          if (th0 < 0 && st.th >= 0 && st.om > 0) onCrossing(t0 + h * (-th0) / (st.th - th0));
        }
      } else st.simT += dt;
      drawRig(); swShow();
      if (active) raf = requestAnimationFrame(loop);
    }
    onEnter.practical = () => { if (!active) { active = true; last = performance.now(); raf = requestAnimationFrame(loop); } requestAnimationFrame(renderGraph); };
    onLeave.practical = () => { active = false; cancelAnimationFrame(raf); };

    /* ---------- observation table ---------- */
    const tbody = $('p-tbody'), tblMsg = $('tbl-msg');
    let rows = [];
    const FIELDS = ['L', 'T10', 'T', 'T2'];
    function renderTable(freshIdx) {
      tbody.innerHTML = '';
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        if (i === freshIdx) tr.className = 'fresh';
        FIELDS.forEach(f => {
          const td = document.createElement('td'); const inp = document.createElement('input');
          inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.value = r[f];
          inp.setAttribute('aria-label', { L: 'L in cm', T10: 'T10 in s', T: 'T in s', T2: 'T squared in s²' }[f] + ', row ' + (i + 1));
          inp.dataset.f = f;
          inp.addEventListener('input', () => { r[f] = inp.value; validate(); scheduleGraph(); });
          td.appendChild(inp); tr.appendChild(td);
        });
        const td = document.createElement('td'); const x = document.createElement('button');
        x.type = 'button'; x.className = 'row-x'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove row ' + (i + 1));
        x.addEventListener('click', () => { rows.splice(i, 1); fixSel(i); renderTable(); validate(); renderGraph(); });
        td.appendChild(x); tr.appendChild(td);
        tr.addEventListener('mouseenter', () => { if (ptIndexOfRow[i] != null) lightPt(i); });
        tr.addEventListener('mouseleave', () => lightPt(-1));
        tbody.appendChild(tr);
      });
      validate();
    }
    function fixSel(removed) { sel = sel.filter(k => k !== removed).map(k => k > removed ? k - 1 : k); }
    function num(r, f) { return parseNum(r[f]); }
    function rowIssues(r) {
      const out = {}, T10 = num(r, 'T10'), T = num(r, 'T'), T2 = num(r, 'T2');
      if (isFinite(T10) && isFinite(T) && T10 > 0) {
        if (T10 >= 2 && near(T, T10, .02)) out.T = 'slip10';
        else if (!near(T, T10 / 10, .03)) out.T = 'calcT';
      }
      if (isFinite(T) && isFinite(T2) && T > 0) {
        if (isFinite(T10) && T10 >= 2 && near(T2, T10 * T10, .03) && !near(T2, T * T, .03)) out.T2 = 'slip10';
        else if (Math.abs(T - 1) > .05 && near(T2, T, .02)) out.T2 = 'square';
        else if (!near(T2, T * T, .03)) out.T2 = 'calcT2';
      }
      return out;
    }
    function validate() {
      const msgs = [];
      Array.from(tbody.children).forEach((tr, i) => {
        const r = rows[i]; if (!r) return;
        const iss = rowIssues(r);
        tr.querySelectorAll('input').forEach(inp => inp.classList.toggle('flag', !!iss[inp.dataset.f]));
        const L = r.L || '?';
        if (iss.T === 'slip10') msgs.push(`L = ${L} cm: T is the time for one oscillation, so T = T₁₀ ÷ 10.`);
        else if (iss.T === 'calcT') msgs.push(`L = ${L} cm: check T = T₁₀ ÷ 10.`);
        if (iss.T2 === 'slip10') msgs.push(`L = ${L} cm: T² looks like T₁₀². Divide by 10 before squaring.`);
        else if (iss.T2 === 'square') msgs.push(`L = ${L} cm: T² still equals T. Square it (T × T).`);
        else if (iss.T2 === 'calcT2') msgs.push(`L = ${L} cm: check T² = T × T.`);
      });
      tblMsg.textContent = msgs.slice(0, 3).join(' ') + (msgs.length > 3 ? ' …' : '');
    }
    function fillRow(r) {
      const T10 = num(r, 'T10'); if (!isFinite(T10) || T10 <= 0) return false;
      const T = +(T10 / 10).toFixed(3); r.T = trim(T, 3); r.T2 = trim(T * T, 3); return true;
    }
    $('t-add').addEventListener('click', () => { rows.push({ L: '', T10: '', T: '', T2: '' }); renderTable(); const ins = tbody.querySelectorAll('tr:last-child input'); if (ins[0]) ins[0].focus(); });
    $('t-fill').addEventListener('click', () => { let n = 0; rows.forEach(r => { if (fillRow(r)) n++; }); renderTable(); renderGraph(); tblMsg.textContent = n ? '' : 'Enter T₁₀ values first.'; });
    $('sw-record').addEventListener('click', () => {
      if (sw.running) { say(swMsg, 'sw-msg', 'warn', 'Stop the stopwatch first.'); return; }
      if (!(sw.acc > 0)) { say(swMsg, 'sw-msg', 'warn', 'Time 10 oscillations first.'); return; }
      if (sw.count !== 10) { say(swMsg, 'sw-msg', 'warn', `The counter shows ${sw.count}. T₁₀ needs exactly 10 oscillations: reset and time again.`); return; }
      const T10 = +sw.acc.toFixed(2);
      let i = rows.findIndex(r => num(r, 'L') === st.L);
      if (i < 0) i = rows.findIndex(r => !String(r.L).trim() && !String(r.T10).trim());
      if (i < 0) { rows.push({ L: '', T10: '', T: '', T2: '' }); i = rows.length - 1; }
      rows[i].L = String(st.L); rows[i].T10 = trim(T10, 2); fillRow(rows[i]);
      rows.sort((a, b) => (num(a, 'L') || 1e9) - (num(b, 'L') || 1e9));
      const fi = rows.findIndex(r => num(r, 'L') === st.L);
      sel = []; renderTable(fi); renderGraph();
      say(swMsg, 'sw-msg', 'ok', `Recorded: L = ${st.L} cm, T₁₀ = ${trim(T10, 2)} s, T = ${rows[fi].T} s, T² = ${rows[fi].T2} s².`);
    });

    /* ---------- graph ---------- */
    const gsvg = $('p-graph'), slopeOut = $('slope-out');
    let G = null, sel = [], sMode = 'pick', line = null, ptIndexOfRow = {}, ptEls = {}, litRow = -1, gDrag = null;
    const sModeSeg = radioGroup('s-mode', b => { sMode = b.dataset.mode; if (sMode === 'line' && !line) initLine(); renderGraph(); });
    function points() {
      const out = [];
      rows.forEach((r, i) => { const L = num(r, 'L'), y = num(r, 'T2'); if (isFinite(L) && isFinite(y) && L > 0 && y > 0) out.push({ i, L, y }); });
      return out;
    }
    function scales(pts) {
      const maxL = Math.max(100, ...pts.map(p => p.L)), maxY = Math.max(0, ...pts.map(p => p.y));
      const xmax = Math.ceil(maxL / 10) * 10;
      let ymax = 4;
      if (maxY * 1.1 > 4) { const s = niceStep(maxY * 1.1, 8); ymax = Math.ceil(maxY * 1.1 / s) * s; }
      return { xmax, ymax };
    }
    function initLine() {
      const pts = points(), sc = scales(pts);
      const f = leastSq(pts.map(p => [p.L, p.y]));
      const xa = sc.xmax * .12, xb = sc.xmax * .88;
      if (f) line = [[xa, clamp(f.S * xa + f.c, 0, sc.ymax)], [xb, clamp(f.S * xb + f.c, 0, sc.ymax)]];
      else line = [[xa, sc.ymax * .2], [xb, sc.ymax * .8]];
    }
    function currentPair() {
      const pts = points();
      if (sMode === 'pick') {
        if (sel.length < 2) return null;
        const a = pts.find(p => p.i === sel[0]), b = pts.find(p => p.i === sel[1]);
        if (!a || !b || a.L === b.L) return null;
        return { p1: [a.L, a.y], p2: [b.L, b.y], how: `the points at ${trim(a.L, 1)} cm and ${trim(b.L, 1)} cm` };
      }
      if (!line || line[0][0] === line[1][0]) return null;
      return { p1: line[0], p2: line[1], how: 'two points on your line' };
    }
    function lightPt(i) {
      litRow = i;
      Array.from(tbody.children).forEach((tr, k) => tr.classList.toggle('lit', k === i));
      Object.keys(ptEls).forEach(k => ptEls[k].classList.toggle('lit', +k === i));
      if (!G) return;
      if (i < 0 || ptIndexOfRow[i] == null) G.layers.hover.innerHTML = '';
      else hoverMark(G, G.layers.hover, num(rows[i], 'L'), num(rows[i], 'T2'));
    }
    function renderGraph() {
      const pts = points(), sc = scales(pts);
      G = graphBase(gsvg, sc);
      ptIndexOfRow = {}; ptEls = {};
      if (sMode === 'line' && line) {
        line = line.map(([x, y]) => [clamp(x, 0, sc.xmax), clamp(y, 0, sc.ymax)]);
      }
      const pair = currentPair();
      if (pair) {
        const S = (pair.p2[1] - pair.p1[1]) / (pair.p2[0] - pair.p1[0]), c = pair.p1[1] - S * pair.p1[0];
        lineSeg(G, G.layers.line, S, c, 0, sc.xmax, sMode === 'line' ? {} : { 'stroke-opacity': .85 });
        const d = slopeTri(G, G.layers.tri, pair.p1, pair.p2);
        slopeOut.innerHTML = `From ${pair.how}: ΔT² = <b>${trim(Math.abs(d.dY), 3)} s²</b>, ΔL = <b>${trim(Math.abs(d.dX), 2)} cm</b>. Now work out S = ΔT² ÷ ΔL.`;
      } else {
        slopeOut.textContent = pts.length < 2 ? 'Record or type at least two readings to plot the graph.' :
          sMode === 'pick' ? `Click two points on the graph to use for the slope${sel.length === 1 ? ' (one chosen)' : ''}.` : 'Drag the two round handles to lay the line along your points.';
      }
      pts.forEach(p => {
        const isSel = sMode === 'pick' && sel.includes(p.i);
        const g = ptMark(G, G.layers.pts, p.L, p.y, { class: 'ptg live' + (isSel ? ' sel' : '') });
        if (isSel) { g.querySelector('.pt-dot').setAttribute('fill', '#b8873a'); }
        ptIndexOfRow[p.i] = true; ptEls[p.i] = g;
        g.addEventListener('mouseenter', () => lightPt(p.i));
        g.addEventListener('mouseleave', () => lightPt(-1));
        if (sMode === 'pick') g.addEventListener('click', () => {
          if (sel.includes(p.i)) sel = sel.filter(k => k !== p.i);
          else { sel.push(p.i); if (sel.length > 2) sel.shift(); }
          renderGraph();
        });
      });
      if (sMode === 'line' && line) {
        line.forEach((h, k) => {
          const hg = el('g', { class: 'handle' }, G.layers.top);
          el('circle', { cx: G.X(h[0]), cy: G.Y(h[1]), r: 20, fill: 'transparent' }, hg);
          el('circle', { cx: G.X(h[0]), cy: G.Y(h[1]), r: 10, fill: '#2b6a57', stroke: '#fff', 'stroke-width': 3 }, hg);
          hg.addEventListener('pointerdown', e => { e.preventDefault(); gDrag = k; });
        });
      }
      if (litRow >= 0) lightPt(litRow);
    }
    let gq = 0; function scheduleGraph() { if (gq) return; gq = requestAnimationFrame(() => { gq = 0; renderGraph(); }); }
    window.addEventListener('pointermove', e => {
      if (gDrag == null || !G) return;
      const p = svgPoint(gsvg, e), [x, y] = G.inv(p.x, p.y);
      line[gDrag] = [clamp(x, 0, G.xmax), clamp(y, 0, G.ymax)];
      scheduleGraph();
    });
    window.addEventListener('pointerup', () => { gDrag = null; });

    /* ---------- check ---------- */
    const inS = $('in-s'), inG = $('in-g'), inGu = $('in-gu'), msg = $('check-msg');
    function cmsg(cls, html) { msg.className = 'check-msg ' + cls; msg.innerHTML = html; }
    function refSlope() {
      const pair = currentPair();
      if (pair) return { S: (pair.p2[1] - pair.p1[1]) / (pair.p2[0] - pair.p1[0]), pair };
      const f = leastSq(points().map(p => [p.L, p.y]));
      return f ? { S: f.S, pair: null } : null;
    }
    $('btn-check').addEventListener('click', () => {
      const slip = rows.find(r => { const s = rowIssues(r); return s.T === 'slip10' || s.T2 === 'slip10'; });
      if (slip) { cmsg('nudge', `Check the table first: at L = ${slip.L} cm the period looks like T₁₀ itself. T = T₁₀ ÷ 10, then square it.`); return; }
      const ref = refSlope();
      if (!ref) { cmsg('nudge', 'Plot at least two readings first.'); return; }
      const S = parseNum(inS.value), g = parseNum(inG.value), unit = inGu.value, R = ref.S;
      if (!isFinite(S)) { cmsg('nudge', 'Enter your slope S = ΔT² ÷ ΔL first.'); return; }
      if (!near(S, R, .04)) {
        if (near(S, 1 / R, .06)) cmsg('nudge', 'Your slope is upside down: that is ΔL ÷ ΔT² (x over y). T² is on the y-axis, so S = ΔT² ÷ ΔL (rise over run).');
        else if (near(S, 100 * R, .06)) cmsg('nudge', 'Your slope is 100 times the graph\'s. Did you use T₁₀ instead of T (forgetting ÷ 10)? With L in cm, S should be in s²/cm.');
        else if (near(S, R / 100, .06)) cmsg('nudge', 'Your slope is 100 times too small. Keep L in cm (not m) and T² in s².');
        else { const d = ref.pair ? `ΔT² = ${trim(Math.abs(ref.pair.p2[1] - ref.pair.p1[1]), 3)} s² and ΔL = ${trim(Math.abs(ref.pair.p2[0] - ref.pair.p1[0]), 2)} cm` : 'the slope of the line through your points'; cmsg('bad', `That slope doesn't match your graph. Use ${d}, and divide: S = ΔT² ÷ ΔL.`); }
        return;
      }
      if (!isFinite(g)) { cmsg('nudge', `Slope ✓. Now g = 4π² ÷ S = 39.478 ÷ ${trim(S, 5)}.`); return; }
      const gExp = FOUR_PI2 / S, gCm = unit === 'm' ? g * 100 : g;
      if (near(gCm, gExp, .025)) {
        const diff = (gExp - G_REAL) / G_REAL * 100;
        cmsg('ok', `✓ Correct. g = 4π² ÷ ${trim(S, 5)} ≈ <b>${gExp.toFixed(2)} cm/s²</b> = <b>${(gExp / 100).toFixed(2)} m/s²</b>. ` +
          `The accepted value is about 980 cm/s² (9.8 m/s²); this result is ${Math.abs(diff).toFixed(1)}% ${diff >= 0 ? 'above' : 'below'} it. Hand timing over only 10 oscillations easily shifts g, most of all at the short lengths.`);
        return;
      }
      if (unit === 'cm' && near(g, gExp / 100, .025)) { cmsg('nudge', `Units: ${trim(g, 3)} is the value in m/s². With L in cm, 4π² ÷ S gives cm/s². Either switch the unit to m/s² or multiply by 100.`); return; }
      if (unit === 'm' && near(g, gExp, .025)) { cmsg('nudge', `Units: ${trim(g, 2)} is the value in cm/s² (L was in cm). To give it in m/s², divide by 100, or switch the unit to cm/s².`); return; }
      const v = unit === 'm' ? g * 100 : g;
      if (near(v, S / FOUR_PI2, .03) || near(v, S * FOUR_PI2, .03) || near(g, S / FOUR_PI2, .03) || near(g, S * FOUR_PI2, .03)) { cmsg('nudge', 'Divide, don\'t multiply: g = 4π² ÷ S, with 4π² on top.'); return; }
      if ([2 * Math.PI, 4 * Math.PI, Math.PI * Math.PI, 2 * Math.PI * Math.PI, 36, 16 * Math.PI * Math.PI].some(k => near(v, k / S, .02) || near(g, k / S, .02))) { cmsg('nudge', 'Check 4π²: it is 4 × π × π ≈ 39.478.'); return; }
      cmsg('bad', `Not quite. Work out 39.478 ÷ ${trim(S, 5)} and give the unit: cm/s² (L in cm).`);
    });

    /* ---------- guided calculation ---------- */
    const guide = $('guide'), btnGuide = $('btn-guide');
    let gSteps = [], gShown = 0;
    function buildGuide() {
      const valid = rows.filter(r => isFinite(num(r, 'T10')) && num(r, 'T10') > 0 && isFinite(num(r, 'L')));
      const tLines = valid.map(r => `${trim(num(r, 'T10'), 2)} ÷ 10 = ${trim(num(r, 'T10') / 10, 3)} s`).join(' &nbsp;·&nbsp; ');
      const t2Lines = valid.map(r => { const T = +(num(r, 'T10') / 10).toFixed(3); return `${trim(T, 3)}² = ${trim(T * T, 3)} s²`; }).join(' &nbsp;·&nbsp; ');
      const ref = refSlope();
      gSteps = [`<strong>Period:</strong> T = T₁₀ ÷ 10<span class="eq-line">${tLines || 'no T₁₀ values yet'}</span>`,
        `<strong>Square it:</strong> T² = T × T<span class="eq-line">${t2Lines || '—'}</span>`];
      if (ref && ref.pair) {
        const [a, b] = ref.pair.p1[0] <= ref.pair.p2[0] ? [ref.pair.p1, ref.pair.p2] : [ref.pair.p2, ref.pair.p1];
        const S = (b[1] - a[1]) / (b[0] - a[0]);
        gSteps.push(`<strong>Two points</strong> from ${ref.pair.how}:<span class="eq-line">(${trim(a[0], 2)} cm, ${trim(a[1], 3)} s²) and (${trim(b[0], 2)} cm, ${trim(b[1], 3)} s²)</span>`);
        gSteps.push(`<strong>Slope</strong> (y over x):<span class="eq-line">S = ΔT² / ΔL = (${trim(b[1], 3)} − ${trim(a[1], 3)}) / (${trim(b[0], 2)} − ${trim(a[0], 2)}) = ${trim(b[1] - a[1], 3)} / ${trim(b[0] - a[0], 2)} = ${trim(S, 5)} s²/cm</span>`);
        const g = FOUR_PI2 / S;
        gSteps.push(`<strong>g</strong>:<span class="eq-line">g = 4π² / S = 39.478 / ${trim(S, 5)} = ${g.toFixed(2)} cm/s²</span>`);
        gSteps.push(`<strong>In m/s²</strong> (÷ 100):<span class="eq-line">${g.toFixed(2)} cm/s² ÷ 100 = ${(g / 100).toFixed(2)} m/s²</span>Accepted value: about 980 cm/s² (9.8 m/s²).`);
      } else gSteps.push(sMode === 'pick' ? '<strong>Slope:</strong> click two points on the graph, then press Guided calculation again.' : '<strong>Slope:</strong> place the line on the graph first.');
    }
    function showGuide() {
      guide.innerHTML = gSteps.slice(0, gShown).map(s => `<li>${s}</li>`).join('');
      guide.hidden = gShown === 0;
      btnGuide.textContent = gShown === 0 ? 'Guided calculation' : gShown < gSteps.length ? `Next step (${gShown + 1} of ${gSteps.length})` : 'Hide the guide';
    }
    btnGuide.addEventListener('click', () => {
      if (gShown >= gSteps.length && gShown > 0) { gShown = 0; showGuide(); return; }
      buildGuide(); gShown = Math.min(gShown + 1, gSteps.length); showGuide();
    });
    function resetGuide() { gShown = 0; gSteps = []; showGuide(); }

    /* ---------- start over + load lab values ---------- */
    function loadLab() {
      rows = LAB.rows.map(r => ({ L: String(r.L), T10: String(r.T10), T: String(r.T), T2: String(r.T2) }));
      sel = [1, 2]; sMode = 'pick'; sModeSeg.set(sModeSeg.btns[0]); line = null;
      inS.value = ''; inG.value = ''; inGu.value = 'cm'; cmsg('', ''); resetGuide();
      renderTable(); renderGraph();
    }
    $('btn-load').addEventListener('click', () => { loadLab(); say(swMsg, 'sw-msg', '', 'Loaded the lab readings: L = 20, 40, 60, 80 cm with T₁₀ = 10, 14, 16, 18 s.'); });
    $('btn-reset').addEventListener('click', () => {
      rows = [20, 40, 60, 80].map(L => ({ L: String(L), T10: '', T: '', T2: '' }));
      sel = []; line = null; sMode = 'pick'; sModeSeg.set(sModeSeg.btns[0]);
      inS.value = ''; inG.value = ''; inGu.value = 'cm'; cmsg('', ''); resetGuide();
      st.th = 0; st.om = 0; st.swinging = false; swReset(true); setL(20, false);
      renderTable(); renderGraph();
      say(rigMsg, 'rig-msg', '', 'Fresh start. Set L = 20 cm, pull the bob aside and time 10 oscillations.');
      say(swMsg, 'sw-msg', '', 'Start the watch as the bob crosses the centre mark moving right. Each later rightward crossing is one oscillation.');
    });

    setL(20, false); swReset(true); loadLab(); drawRig();
  })();

  /* =====================================================================
     13. OPTIONAL EXTRAS — opens upward, closes ~500 ms after the pointer leaves
     ===================================================================== */
  (function extras() {
    const box = $('extras'), btn = $('extras-toggle');
    let t = null, openedAt = 0;
    const open = () => { clearTimeout(t); if (!box.classList.contains('open')) openedAt = Date.now(); box.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { clearTimeout(t); box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    const later = () => { clearTimeout(t); t = setTimeout(close, 500); };
    box.addEventListener('mouseenter', open);
    box.addEventListener('mouseleave', later);
    btn.addEventListener('click', () => {
      if (!box.classList.contains('open')) open();
      else if (Date.now() - openedAt > 350) close();
    });
    box.addEventListener('focusin', open);
    box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) later(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();

  goTo(fromHash(), false);
})();
