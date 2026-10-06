// minimap.js: bottom-right radar. Terrain colour map + team dots + camera frustum + objective markers; click or drag to jump the camera.
// hud.minimap = { world:{w,d}, terrain, terrainVersion?, dots: Float32Array [x,z,code,...] (code = team + 2*kind; kind 0 unit, 1 hero, 2 big, 3 selected), n?,
//                 frustum?: [x0,z0,x1,z1,x2,z2,x3,z3], cam?: {x,z}, markers?: [{x,z,r?,type}], zones?: [{team,x,z,w,d}] }
// terrain = HTMLCanvasElement | OffscreenCanvas | ImageBitmap | ImageData | {w,h,data:Uint8ClampedArray RGBA}. World coords are centred on the origin.
// Canvas is redrawn at the HUD pull rate (<= 10 Hz); size is measured on mount/resize only (never inside update()).
import { h, setCls, hexCss, sfx, disposer, layoutOf } from './_dom.js';
import { icon } from './_icons.js';
import { TEAM_PALETTES } from '../../render/style.js';

export const meta = { id: 'minimap', slot: 'bottom-right', order: 2 };
const TAU = Math.PI * 2;

export function mount(parent, ctx) {
  const d = disposer();
  const cv = h('canvas', { class: 'hud-mini-cv', id: 'hud-minimap', role: 'img', 'aria-label': 'Radar: click to move the camera', width: 160, height: 160 });
  const toggle = h('button', { class: 'hud-btn hud-mini-toggle', type: 'button', id: 'hud-mini-toggle', 'aria-label': 'Hide radar', 'aria-expanded': 'true', 'data-tip': 'Radar on/off (M)', 'data-tip-pos': 'above' }, icon('map'));
  const el = h('div', { class: 'hud-mini hud-panel', 'data-hud': 'minimap' }, h('div', { class: 'hud-mini-body' }, cv, toggle));
  parent.appendChild(el);
  const g = cv.getContext('2d');
  let W = 160, H = 160, dpr = 1;
  let world = { w: 64, d: 64 }, last = null;
  let terrainCv = null, terrainSrc = null, terrainVer = -1;
  let colA = '#2f6bff', colB = '#e23b3b';

  function palette() { let pal = 'classic'; try { pal = ctx.settings.get('palette') || 'classic'; } catch (e) { /* default */ } const p = TEAM_PALETTES[pal] || TEAM_PALETTES.classic; colA = hexCss(p[0]); colB = hexCss(p[1]); }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || 160, ch = cv.clientHeight || cw;
    const nw = Math.max(32, Math.round(cw * dpr)), nh = Math.max(32, Math.round(ch * dpr));
    if (nw !== W || nh !== H || cv.width !== nw) { W = nw; H = nh; cv.width = W; cv.height = H; }
    if (last) draw(last);
  }
  let staging = null;
  function terrainCanvas(m) {
    const t = m.terrain; if (!t) return null;
    if (t === terrainSrc && (m.terrainVersion || 0) === terrainVer && terrainCv) return terrainCv;
    terrainSrc = t; terrainVer = m.terrainVersion || 0;
    try {
      let img = null;
      if (typeof ImageData !== 'undefined' && t instanceof ImageData) img = t;
      else if (t.w && t.h && t.data) img = new ImageData(t.data instanceof Uint8ClampedArray ? t.data : new Uint8ClampedArray(t.data), t.w, t.h);
      if (img) {
        if (!staging) staging = document.createElement('canvas');
        staging.width = img.width; staging.height = img.height;
        staging.getContext('2d').putImageData(img, 0, 0);
        terrainCv = staging;
      } else terrainCv = t;                      // canvas / bitmap: drawn directly (always current)
    } catch (e) { terrainCv = null; }
    return terrainCv;
  }
  const px = (x) => (x / world.w + 0.5) * W;
  const pz = (z) => (z / world.d + 0.5) * H;

  function draw(m) {
    if (!g) return;
    if (m.world) world = m.world;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const tc = terrainCanvas(m);
    if (tc) g.drawImage(tc, 0, 0, W, H);
    else { g.fillStyle = '#4a7a3a'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((i / 8) * W, 0); g.lineTo((i / 8) * W, H); g.moveTo(0, (i / 8) * H); g.lineTo(W, (i / 8) * H); g.stroke(); } }
    if (m.zones) for (const z of m.zones) { g.fillStyle = (z.team === 0 ? colA : colB) + '33'; g.fillRect(px(z.x - z.w / 2), pz(z.z - z.d / 2), (z.w / world.w) * W, (z.d / world.d) * H); }
    if (m.markers) for (const k of m.markers) {
      const x = px(k.x), y = pz(k.z), r = Math.max(4 * dpr, ((k.r || 4) / world.w) * W);
      g.lineWidth = 2 * dpr; g.strokeStyle = '#ffc93c'; g.fillStyle = 'rgba(255,201,60,.22)';
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(x, y - 3 * dpr); g.lineTo(x + 3 * dpr, y); g.lineTo(x, y + 3 * dpr); g.lineTo(x - 3 * dpr, y); g.closePath(); g.fill();
    }
    const dots = m.dots, n = m.n != null ? m.n : dots ? (dots.length / 3) | 0 : 0;
    if (dots && n) {
      const r = 1.9 * dpr;
      g.fillStyle = colA; g.beginPath();
      for (let i = 0; i < n; i++) { const c = dots[i * 3 + 2]; if ((c & 1) === 0) { const x = px(dots[i * 3]), y = pz(dots[i * 3 + 1]); g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } }
      g.fill();
      g.fillStyle = colB; g.beginPath();
      for (let i = 0; i < n; i++) { const c = dots[i * 3 + 2]; if ((c & 1) === 1) { const x = px(dots[i * 3]), y = pz(dots[i * 3 + 1]); g.rect(x - r, y - r, r * 2, r * 2); } }
      g.fill();
      // heroes, big units and the selected unit get a pale outline / ring on top
      g.lineWidth = 1.2 * dpr; g.strokeStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const c = dots[i * 3 + 2], kind = c >> 1; if (!kind) continue;
        const x = px(dots[i * 3]), y = pz(dots[i * 3 + 1]);
        g.beginPath(); g.arc(x, y, (kind === 3 ? 4.6 : kind === 1 ? 3.6 : 3.1) * dpr, 0, TAU); g.stroke();
      }
    }
    if (m.frustum && m.frustum.length >= 8) {
      const f = m.frustum;
      g.beginPath(); g.moveTo(px(f[0]), pz(f[1])); for (let i = 2; i < 8; i += 2) g.lineTo(px(f[i]), pz(f[i + 1])); g.closePath();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); g.lineWidth = 1.6 * dpr; g.strokeStyle = '#fff'; g.stroke();
    } else if (m.cam) {
      const x = px(m.cam.x), y = pz(m.cam.z); g.strokeStyle = '#fff'; g.lineWidth = 1.6 * dpr;
      g.strokeRect(x - 6 * dpr, y - 4 * dpr, 12 * dpr, 8 * dpr);
    }
  }

  function toWorld(e) {
    const r = cv.getBoundingClientRect();
    const u = (e.clientX - r.left) / Math.max(1, r.width), v = (e.clientY - r.top) / Math.max(1, r.height);
    return { x: (Math.max(0, Math.min(1, u)) - 0.5) * world.w, z: (Math.max(0, Math.min(1, v)) - 0.5) * world.d };
  }
  function jump(e) {
    const cam = ctx.game && ctx.game.camera; if (!cam) return;
    const p = toWorld(e);
    const f = cam.jumpTo || cam.panTo || cam.focusOn || cam.lookAt;
    try { if (f) f.call(cam, p.x, p.z); } catch (err) { /* not ready */ }
  }
  let dragging = false;
  cv.addEventListener('pointerdown', (e) => { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } jump(e); sfx(ctx, 'ui_tick', { vol: 0.3 }); e.stopPropagation(); });
  cv.addEventListener('pointermove', (e) => { if (dragging) jump(e); });
  const up = () => { dragging = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  let open = layoutOf(ctx) !== 'phone';        // phones start with the radar folded away
  function setOpen(b) {
    open = b; setCls(el, 'is-closed', !b);
    toggle.setAttribute('aria-expanded', String(b)); toggle.setAttribute('aria-label', b ? 'Hide radar' : 'Show radar'); toggle.dataset.tip = b ? 'Hide radar (M)' : 'Show radar (M)';
    if (b) resize();
  }
  toggle.addEventListener('click', () => setOpen(!open));

  setCls(el, 'is-closed', !open);
  palette(); resize();
  d.on(window, 'resize', resize);
  d.add(ctx.settings && ctx.settings.on ? ctx.settings.on(() => { palette(); if (last) draw(last); }) : null);

  return {
    el,
    toggle: () => setOpen(!open), isOpen: () => open, resize,
    update(hud) {
      const m = hud.minimap; if (!m) return;
      last = m;
      if (open) draw(m);
    },
    destroy() { d.run(); el.remove(); },
  };
}
