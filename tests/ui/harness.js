// Test/screenshot harness: boots the mock app (src/ui/mockctx.js), registers screen modules by meta.id and exposes window.__ui.
// Stand-ins for the 3D canvas (diorama / battle scene) are plain DOM so screenshots show the menus over something sensible.
import { createMockApp } from '../../src/ui/mockctx.js';
import * as K from '../../src/ui/kit.js';
import { SCENARIOS } from './scenarios.js';

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
    el.style.background = 'linear-gradient(180deg,#6ec6ff 0%,#cfeaff 30%)';
    const img = document.createElement('div');
    const url = content.arenaThumb('marathon');
    img.style.cssText = `position:absolute;left:8%;right:8%;top:22%;bottom:-30%;background:url(${url}) center/cover;transform:perspective(900px) rotateX(52deg);transform-origin:50% 100%;border:3px solid #14163a;image-rendering:pixelated`;
    el.appendChild(img);
  }
  return el;
}

export function boot(mods) {
  const registry = {};
  for (const m of mods) if (m && m.meta) registry[m.meta.id] = m;
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
      if (sc.settings) for (const k of Object.keys(sc.settings)) app.settings.set(k, sc.settings[k]);
      if (sc.reset) sc.reset(app);
      app.goto(sc.screen, sc.params);
      await new Promise((r) => setTimeout(r, 60));
      if (sc.setup) await sc.setup(ui);
      return true;
    },
    goto(id, params) { return app.goto(id, params); },
    q: (s) => document.querySelector(s),
    qa: (s) => Array.from(document.querySelectorAll(s)),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
  window.__ui = ui;
  return ui;
}
