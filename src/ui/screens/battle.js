// battle.js: the battle screen = the HUD. Mounts every HUD module (hud/_hud.js), pulls HudData from ctx.game.hud() at <= 10 Hz, routes the battle
// hotkeys (onKey) and the gear button to the pause overlay, shows the FIGHT! beat when the countdown ends, and the "click the arena for keyboard focus" chip.
// Pointer events on the canvas stay with app/input.js: this screen and every container in it are pointer-events:none except real controls.
import { h, disposer, sfx } from '../hud/_dom.js';
import { mountHud, HUD_INTERVAL } from '../hud/_hud.js';
import { mountCountdown } from './countdown.js';

export const meta = { id: 'battle', layer: 'battle', music: 'battle', canvas: 'scene' };

export function mount(root, ctx, params) {
  const d = disposer();
  const p = params || {};
  root.classList.add('bs', 'bs-battle');
  const hud = mountHud(root, ctx, p.hud || {});
  const fight = mountCountdown(hud.slots.overlay, ctx, { numbers: false, fight: true });

  const pauseOpen = () => !!(root.parentElement && root.parentElement.querySelector('[data-screen="pause"]'));
  function openPause() {
    if (pauseOpen()) return false;
    try { ctx.game.pause(true); } catch (e) { /* not ready */ }
    if (ctx.nav && ctx.nav.overlay) ctx.nav.overlay('pause');
    hud.menuOpen(true);
    return true;
  }
  d.on(hud.root, 'hud:menu', () => { openPause(); });
  d.add(ctx.game && ctx.game.on ? ctx.game.on('pause', (e) => { if (!e || !e.paused) hud.menuOpen(false); }) : null);

  // keyboard focus chip (the page only receives keys while it has focus; embedded pages lose it on an outside click)
  const chip = h('button', { class: 'hud-focus-chip', type: 'button', id: 'hud-focus-chip', hidden: true, text: 'Click the arena to give it keyboard focus' });
  hud.slots.overlay.appendChild(chip);
  const refocus = () => { chip.hidden = true; const cv = document.getElementById('vw-canvas'); if (cv && cv.focus) { try { cv.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
  chip.addEventListener('click', refocus);
  d.on(window, 'blur', () => { chip.hidden = false; });
  d.on(window, 'focus', () => { chip.hidden = true; });
  d.on(window, 'pointerdown', () => { if (!chip.hidden) chip.hidden = true; }, true);

  // Escape belongs to the HUD first (close help, cancel aiming, leave photo mode / Take Command); only then does it reach app/input.js (pause).
  d.on(window, 'keydown', (e) => {
    if (e.code !== 'Escape' || pauseOpen()) return;
    if (hud.consumeEscape()) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  // poll HudData at 10 Hz; the HUD manager also throttles, this keeps game.hud() itself at that rate
  let raf = 0, last = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const t = performance.now();
    if (t - last < HUD_INTERVAL) return;
    const dt = Math.min(0.5, (t - last) / 1000); last = t;
    let data = null;
    try { data = ctx.game.hud(); } catch (e) { data = null; }
    if (!data) return;
    hud.update(data, dt, true);
    fight.update(data);
  };
  raf = requestAnimationFrame(tick);

  return {
    hud, fight,
    onKey(e) { return hud.onKey(e); },
    /** Esc / back with nothing else to close: pause during the countdown, re-open results after the end, otherwise let the router decide. */
    onBack() {
      const s = ctx.game && ctx.game.state;
      if (s === 'countdown' || s === 'running') { openPause(); sfx(ctx, 'ui_panel_open', { vol: 0.5 }); return true; }
      if (s === 'ended' && ctx.nav && ctx.nav.overlay) { ctx.nav.overlay('results'); return true; }
      return false;
    },
    destroy() { cancelAnimationFrame(raf); d.run(); fight.destroy(); hud.destroy(); },
  };
}
