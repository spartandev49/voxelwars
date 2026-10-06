// harness.js: the browser entry for the battle-side UI tests and screenshots. Bundled by esbuild (tests/ui_battle/_page.mjs) and exposed as window.__ui.
// It mounts the real HUD modules and screens on UI-A's mock Ctx with a fake Game (mockhud.js); no WebGL, a 2D canvas stands in for the scene.
import * as K from '../../src/ui/kit.js';
import { createBattleMock, MISSIONS, POWERS } from './mockhud.js';
import { paintScene } from './scene.js';
import { mountHud } from '../../src/ui/hud/_hud.js';
import { avatar } from '../../src/ui/hud/_portraits.js';
import { icon, ICON_NAMES } from '../../src/ui/hud/_icons.js';
import { SCREENS } from './screens_registry.js';

const state = { mock: null, hud: null, raf: 0, last: 0, stats: { updates: 0 } };

function qs(id) { return document.getElementById(id); }

function setup(opts) {
  opts = opts || {};
  teardown();
  document.documentElement.style.fontSize = '16px';
  const root = qs('vw-root'); root.replaceChildren();
  const stage = document.createElement('div'); stage.id = 'vw-stage'; stage.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#101428';
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; cv.id = 'vw-canvas';
  stage.appendChild(cv);
  const ui = document.createElement('div'); ui.id = 'vw-ui'; ui.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none';
  root.append(stage, ui);
  paintScene(cv, window.innerWidth, window.innerHeight, opts.seed || 3);
  const mock = createBattleMock(opts);
  state.mock = mock; state.ui = ui; state.stage = stage;
  K.init(mock.ctx);
  mock.attachRouter(ui, SCREENS);
  // key routing like app/main.js: router.key(e) first (top overlay or base screen)
  window.addEventListener('keydown', state.onKey = (e) => { if (e.code === 'Escape') { const m = mock; if (m.router.overlays.length) { m.router.back(); return; } if (m.game.state === 'running') { m.game.pause(true); m.router.overlay('pause'); } return; } mock.router.key(e); });
  return mock;
}

function teardown() {
  cancelAnimationFrame(state.raf);
  if (state.onKey) window.removeEventListener('keydown', state.onKey);
  if (state.hud) { try { state.hud.destroy(); } catch (e) { /* ignore */ } state.hud = null; }
  if (state.mock && state.mock.router) { try { state.mock.router.closeOverlay(); if (state.mock.router.base) state.mock.router.goto && 0; } catch (e) { /* ignore */ } }
}

function mountHudOnly(hopts) {
  const m = state.mock;
  state.hud = mountHud(state.ui, m.ctx, hopts || {});
  window.addEventListener('keydown', (e) => { if (state.hud) state.hud.onKey(e); });
  return state.hud;
}

/** advance the fake battle by `seconds` in `dt` steps, updating the HUD each step (synchronous, for screenshots). Works for mountHudOnly() and for the battle screen. */
function step(seconds, dt) {
  const m = state.mock; dt = dt || 0.1;
  for (let t = 0; t < seconds - 1e-6; t += dt) {
    m.game.update(dt);
    const b = m.router && m.router.base && m.router.base.inst;
    const hud = state.hud || (b && b.hud);
    if (hud) { const data = m.game.hud(); hud.update(data, dt, true); if (b && b.fight) b.fight.update(data); }
  }
}

function startLoop(rate) {
  const m = state.mock; state.last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.1, (now - state.last) / 1000); state.last = now;
    m.game.update(dt);
    if (state.hud) { if (state.hud.update(m.game.hud(), dt)) state.stats.updates++; }
    state.raf = requestAnimationFrame(tick);
  };
  state.raf = requestAnimationFrame(tick);
  void rate;
}
function stopLoop() { cancelAnimationFrame(state.raf); }

window.__ui = { K, state, setup, teardown, mountHudOnly, step, startLoop, stopLoop, MISSIONS, POWERS, avatar, icon, ICON_NAMES, qs, SCREENS,
  get mock() { return state.mock; }, get hud() { return state.hud; }, get router() { return state.mock && state.mock.router; } };
window.__ready = true;
