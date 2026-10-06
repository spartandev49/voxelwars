// Test/screenshot harness: boots the mock app (src/ui/mockctx.js), registers screen modules by meta.id and exposes window.__ui.
// Stand-ins for the 3D canvas (diorama / battle scene) are plain DOM so screenshots show the menus over something sensible.
import { createMockApp } from '../../src/ui/mockctx.js';
import * as K from '../../src/ui/kit.js';
import { SCENARIOS } from './scenarios.js';
import CREDITS_MD from '../../assets/CREDITS.md';

function sceneStandIn(kind, content) {
  const el = document.createElement('div');
  el.id = 'vw-stage';
  el.style.cssText = 'position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none';
  if (kind === 'diorama') {
    el.style.background = 'linear-gradient(180deg,#2a63e0 0%,#58a6f5 55%,#cfeaff 100%)';
    const add = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;' + css; el.appendChild(d); return d; };
    add('left:58%;top:9%;width:5rem;height:5rem;background:#ffc93c;border:3px solid #14163a;border-radius:14px;box-shadow:0 6px 0 #14163a;transform:rotate(12deg)');
    for (const [x, y, w] of [[48, 20, 9], [70, 38, 7], [88, 14, 8], [58, 58, 6]]) add(`left:${x}%;top:${y}%;width:${w}rem;height:2rem;background:#f3f6fb;border-radius:8px;box-shadow:0 6px 0 rgba(20,22,58,.25)`);
    // island
    add('left:40%;bottom:9%;width:50%;height:16%;background:#6fae3f;border:3px solid #14163a;border-radius:20px;box-shadow:0 18px 0 #8a5a34,0 21px 0 #14163a');
    add('left:46%;bottom:21%;width:3rem;height:3rem;background:#e3c887;border:3px solid #14163a;border-radius:8px');
    for (let i = 0; i < 9; i++) { add(`left:${48 + i * 3}%;bottom:25%;width:1.1rem;height:1.6rem;background:${i % 2 ? '#3b6cf0' : '#ee4b4b'};border:2px solid #14163a;border-radius:4px`); }
  } else if (kind === 'scene') {
    el.style.background = 'linear-gradient(180deg,#6ec6ff 0%,#cfeaff 38%,#9ed3ff 100%)';
    const img = document.createElement('div');
    const url = content.arenaThumbSync('marathon');
    img.style.cssText = `position:absolute;left:-15%;right:-15%;top:24%;height:110%;background:url(${url}) center/100% 100%;transform:perspective(900px) rotateX(62deg);transform-origin:50% 0;border:3px solid #14163a;image-rendering:pixelated`;
    el.appendChild(img);
    const add = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;' + css; el.appendChild(d); return d; };
    for (let i = 0; i < 14; i++) add(`left:${22 + (i % 7) * 2.2}%;top:${48 + Math.floor(i / 7) * 3.2}%;width:.9rem;height:1.5rem;background:#3b6cf0;border:2px solid #14163a;border-radius:4px`);
    for (let i = 0; i < 14; i++) add(`left:${62 + (i % 7) * 2.2}%;top:${48 + Math.floor(i / 7) * 3.2}%;width:.9rem;height:1.5rem;background:#ee4b4b;border:2px solid #14163a;border-radius:4px`);
  }
  return el;
}

// Screens owned by other agents (UI-B, editors) may not exist yet: a tiny stand-in module lets navigation from my screens be tested end to end.
const STUB_IDS = ['campaign', 'survival', 'daily', 'arena_builder', 'workshop', 'battle', 'pause', 'results', 'briefing', 'countdown'];
function stub(id) {
  return {
    meta: { id, layer: 'menu', music: 'none', canvas: 'none' },
    mount(root, ctx) {
      const el = document.createElement('div'); el.className = 'vw-page'; el.dataset.stub = id;
      const t = document.createElement('h1'); t.className = 'vw-page__title'; t.textContent = 'Stand-in: ' + id;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vw-btn'; b.id = 'stub-back'; b.textContent = 'Back'; b.addEventListener('click', () => ctx.nav.back());
      el.append(t, b); root.appendChild(el);
      return { destroy() {}, onBack() { ctx.nav.back(); return true; } };
    },
  };
}

export function boot(mods) {
  window.__VW_CREDITS__ = CREDITS_MD;
  const registry = {};
  for (const m of mods) if (m && m.meta) registry[m.meta.id] = m;
  for (const id of STUB_IDS) if (!registry[id]) registry[id] = stub(id);
  let stage = null;
  const app = createMockApp({
    registry,
    onScreen(meta, el) {
      if (stage) { stage.remove(); stage = null; }
      if (meta.canvas === 'diorama' || meta.canvas === 'scene') { stage = sceneStandIn(meta.canvas, app.content); document.getElementById('vw-root').insertBefore(stage, el); }
    },
  });
  K.init(app.ctx);
  const ui = {
    app, ctx: app.ctx, game: app.game, K, registry,
    scenarios: SCENARIOS,
    async run(name) {
      const sc = SCENARIOS.find((s) => s.name === name);
      if (!sc) throw new Error('no scenario ' + name);
      if (!registry[sc.screen]) return false;
      K.closeModals();
      document.querySelectorAll('.vw-toasts,.vw-banner-host,.vw-tip').forEach((e) => e.remove());
      if (window.__restoreSettings) { window.__restoreSettings(); window.__restoreSettings = null; }
      if (sc.settings) { const prev = {}; for (const k of Object.keys(sc.settings)) { prev[k] = app.settings.get(k); app.settings.set(k, sc.settings[k]); } window.__restoreSettings = () => { for (const k of Object.keys(prev)) app.settings.set(k, prev[k]); }; }
      if (sc.reset) sc.reset(app);
      app.goto(sc.screen, sc.params);
      await new Promise((r) => setTimeout(r, 60));
      if (sc.setup) await sc.setup(ui);
      return true;
    },
    /** Activate every visible interactive element of a scenario (fresh screen each time). Big homogeneous groups are sampled (first/middle/last). */
    async clickthrough(name, opts) {
      const SELQ = '#vw-root button, #vw-root [role=button], #vw-root [role=tab], #vw-root [role=radio], #vw-root [role=switch], #vw-root [role=menuitem], #vw-root summary, #vw-root select, #vw-root input[type=checkbox], #vw-root input[type=search], #vw-root input[type=text]';
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.vw-hide,[hidden],[inert]'); };
      const targets = () => Array.from(document.querySelectorAll(SELQ)).filter((el) => vis(el) && !el.disabled && !el.closest('.vw-bg,.vw-tip'));
      const fast = !!(opts && opts.fast);
      await ui.run(name);
      const list = targets();
      // sample large homogeneous groups
      const groupOf = (el) => el.closest('[role=radiogroup],[role=tablist],.vw-qb__strip,.vw-pl__cards,.vw-cx__grid,.vw-chips') || null;
      const counts = new Map(); const picked = [];
      list.forEach((el, i) => { const g = groupOf(el); if (!g) { picked.push(i); return; } const a = counts.get(g) || []; a.push(i); counts.set(g, a); });
      counts.forEach((a) => { if (a.length <= 6) picked.push(...a); else picked.push(a[0], a[Math.floor(a.length / 2)], a[a.length - 1]); });
      picked.sort((a, b) => a - b);
      const results = [];
      for (const idx of picked) {
        await ui.run(name);
        const els = targets(); const el = els[idx]; if (!el) continue;
        const name2 = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
        const already = (el.getAttribute('role') === 'radio' || el.getAttribute('role') === 'tab') && (el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true');
        const snap = () => ({ screen: app.nav.current(), game: app.game.log.length, dl: app.calls.downloads.length, clip: app.calls.clipboard.length, misc: app.calls.misc.length, checked: el.checked, value: el.value, selIdx: el.selectedIndex, pressed: el.getAttribute('aria-pressed'), ac: el.getAttribute('aria-checked'), sel: el.getAttribute('aria-selected'), open: el.parentElement && el.parentElement.open });
        const before = snap(); let mut = 0;
        const mo = new MutationObserver((l) => { mut += l.length; });
        mo.observe(document.getElementById('vw-root'), { childList: true, subtree: true, attributes: true, characterData: true });
        if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); }
        else if (el.tagName === 'INPUT' && (el.type === 'search' || el.type === 'text')) { el.value = 'zzq'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
        else el.click();
        await ui.sleep(fast ? 50 : 90);
        mo.disconnect();
        const after = snap();
        const changed = Object.keys(before).some((k) => before[k] !== after[k]);
        const effect = mut > 0 || changed || !!document.querySelector('.vw-modal') || !!document.querySelector('.vw-toast');
        results.push({ id: el.id, text: name2, tag: el.tagName.toLowerCase(), already, effect: effect || already });
      }
      return { total: list.length, tested: results.length, dead: results.filter((r) => !r.effect) };
    },
    goto(id, params) { return app.goto(id, params); },
    q: (s) => document.querySelector(s),
    qa: (s) => Array.from(document.querySelectorAll(s)),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
  window.__ui = ui;
  return ui;
}
