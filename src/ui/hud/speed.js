// speed.js: top-right pause + speed controls (0.25/0.5/1/2/4) + settings gear. Hotkeys are routed by the battle screen through api.*.
import { h, setCls, setAttr, setText, sfx, anim } from './_dom.js';
import { icon } from './_icons.js';
import { keyOf } from './_bindings.js';

export const meta = { id: 'speed', slot: 'top-right', order: 1 };
export const SPEEDS = [0.25, 0.5, 1, 2, 4];
const LABEL = { 0.25: '.25x', 0.5: '.5x', 1: '1x', 2: '2x', 4: '4x' };

export function mount(parent, ctx, layers) {
  const g = () => ctx.game;
  const pauseBtn = h('button', { class: 'hud-btn hud-pause', id: 'hud-pause', type: 'button', 'aria-label': 'Pause', 'data-tip': 'Pause (' + keyOf(ctx.settings, 'pause') + ')', 'data-tip-pos': 'below' }, icon('pause'));
  const gear = h('button', { class: 'hud-btn hud-gear', id: 'hud-gear', type: 'button', 'aria-label': 'Menu and settings', 'data-tip': 'Menu (Esc)', 'data-tip-pos': 'below' }, icon('gear'));
  const muteBtn = h('button', { class: 'hud-btn hud-mute', id: 'hud-mute', type: 'button', 'aria-label': 'Mute sound', 'aria-pressed': 'false', 'data-tip': 'Mute sound', 'data-tip-pos': 'below' }, icon('speaker'));
  const btns = SPEEDS.map((s) => h('button', { class: 'hud-btn hud-spd', type: 'button', id: 'hud-speed-' + String(s).replace('.', '_'), 'data-speed': s, 'aria-pressed': 'false', 'aria-label': 'Speed ' + s + 'x', 'data-tip': s + 'x speed', 'data-tip-pos': 'below', text: LABEL[s] }));
  const seg = h('div', { class: 'hud-seg', role: 'group', 'aria-label': 'Game speed' }, btns);
  const cycle = h('button', { class: 'hud-btn hud-spd-cycle', type: 'button', id: 'hud-speed-cycle', 'aria-label': 'Change speed', 'data-tip': 'Next speed', 'data-tip-pos': 'below', text: '1x' });
  const el = h('div', { class: 'hud-speed hud-panel', 'data-hud': 'speed', role: 'toolbar', 'aria-label': 'Speed controls' }, pauseBtn, seg, cycle, muteBtn, gear);
  parent.appendChild(el);

  // "Paused" ribbon lives in the overlay layer so it is centred on the screen
  const flag = h('div', { class: 'hud-paused-flag', hidden: true, 'aria-hidden': 'true' }, icon('pause'), h('span', { text: 'PAUSED' }), h('small', { text: keyOf(ctx.settings, 'pause') + ' to resume' }));
  if (layers && layers.overlay) layers.overlay.appendChild(flag);

  let speed = 1, paused = false;
  function setSpeed(s) {
    const gm = g(); if (!gm) return;
    try { gm.setSpeed(s); if (paused && gm.pause) gm.pause(false); } catch (e) { /* game not ready */ }
    speed = s; paint();
  }
  function togglePause() {
    const gm = g(); if (!gm) return;
    try { gm.pause(!paused); } catch (e) { /* game not ready */ }
    paused = !paused; paint();
    sfx(ctx, paused ? 'ui_panel_open' : 'ui_panel_close', { vol: 0.5 });
  }
  const step = (d) => { const i = SPEEDS.indexOf(speed); const j = Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 2 : i) + d)); if (SPEEDS[j] !== speed) setSpeed(SPEEDS[j]); else { const b = btns[j]; anim(ctx, b, [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 200 }); sfx(ctx, 'ui_error', { vol: 0.3 }); } };

  function paint() {
    btns.forEach((b, i) => { const on = SPEEDS[i] === speed; setCls(b, 'is-on', on); setAttr(b, 'aria-pressed', on); });
    setText(cycle, LABEL[speed] || speed + 'x');
    pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause'));
    setAttr(pauseBtn, 'aria-label', paused ? 'Resume' : 'Pause');
    setCls(pauseBtn, 'is-on', paused);
    flag.hidden = !paused;
  }

  // every screen shows the sound state (AU9): the battle HUD has its own mute toggle, in step with Settings and the pause menu
  const isMuted = () => { try { return !!ctx.settings.get('muted'); } catch (e) { return false; } };
  function paintMute() { const m = isMuted(); setCls(muteBtn, 'is-muted', m); setAttr(muteBtn, 'aria-pressed', m); setAttr(muteBtn, 'aria-label', m ? 'Unmute sound' : 'Mute sound'); setAttr(muteBtn, 'data-tip', m ? 'Sound is off. Click to unmute' : 'Mute sound'); }
  muteBtn.addEventListener('click', () => { try { ctx.settings.set('muted', !isMuted()); } catch (e) { /* settings unavailable */ } paintMute(); sfx(ctx, 'ui_click', { vol: 0.5 }); });
  let offMute = null; try { if (ctx.settings && typeof ctx.settings.on === 'function') offMute = ctx.settings.on(paintMute); } catch (e) { offMute = null; }
  paintMute();
  pauseBtn.addEventListener('click', togglePause);
  gear.addEventListener('click', () => el.dispatchEvent(new CustomEvent('hud:menu', { bubbles: true })));
  btns.forEach((b, i) => b.addEventListener('click', () => setSpeed(SPEEDS[i])));
  cycle.addEventListener('click', () => { const i = SPEEDS.indexOf(speed); setSpeed(SPEEDS[(i + 1) % SPEEDS.length]); });

  return {
    el,
    togglePause, slower: () => step(-1), faster: () => step(1), setSpeed,
    update(hud) {
      const s = hud.speed || 1, p = !!hud.paused;
      if (s !== speed || p !== paused) { speed = s; paused = p; paint(); }
    },
    destroy() { if (typeof offMute === 'function') offMute(); el.remove(); flag.remove(); },
  };
}
