// _hud.js: the battle HUD manager. Builds the slot skeleton, mounts every HUD module, throttles update() to <= 10 Hz, owns Tab-hide, theme classes
// (palette / reduce motion / high contrast), the layout class (wide | tablet | phone) and the battle hotkeys (onKey).
// mountHud(parent, ctx, opts) -> { root, update(hud, dt, force), destroy(), onKey(e), modules, hide(b), toggleHide(), isHidden() }
import { h, applyTheme, disposer, isTyping, sfx, camMode } from './_dom.js';
import { isAction, FIXED } from './_bindings.js';
import * as armymeter from './armymeter.js';
import * as timer from './timer.js';
import * as objective from './objective.js';
import * as mutators from './mutators.js';
import * as speed from './speed.js';
import * as cameramodes from './cameramodes.js';
import * as killfeed from './killfeed.js';
import * as announcer from './announcer.js';
import * as selection from './selection.js';
import * as powers from './powers.js';
import * as orders from './orders.js';
import * as typecounts from './typecounts.js';
import * as minimap from './minimap.js';
import * as bubbles from './bubbles.js';
import * as takecommand from './takecommand.js';
import * as photo from './photo.js';
import * as teaching from './teaching.js';
import * as helpoverlay from './helpoverlay.js';

export const HUD_PARTS = [armymeter, timer, objective, mutators, speed, cameramodes, killfeed, announcer, selection, powers, orders, typecounts, minimap, bubbles, takecommand, photo, teaching, helpoverlay];
const SLOTS = ['top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

function layoutOf(ctx) {
  let w = window.innerWidth, hh = window.innerHeight;
  try { const v = ctx.platform && ctx.platform.viewport && ctx.platform.viewport(); if (v && v.w) { w = v.w; hh = v.h; } } catch (e) { /* use window */ }
  if (Math.min(w, hh) < 520 || w < 640) return 'phone';
  if (w < 1100) return 'tablet';
  return 'wide';
}

export function mountHud(parent, ctx, opts) {
  const o = opts || {};
  const d = disposer();
  const root = h('div', { class: 'vw-hud', 'data-hud-root': '', 'data-layout': layoutOf(ctx) });
  const slots = {};
  const world = h('div', { class: 'hud-world' });
  root.appendChild(world); slots.world = world;
  for (const s of SLOTS) { slots[s] = h('div', { class: 'hud-slot hud-' + s }); root.appendChild(slots[s]); }
  const overlay = h('div', { class: 'hud-overlay' });
  root.appendChild(overlay); slots.overlay = overlay;
  const chip = h('div', { class: 'hud-hidden-chip', hidden: true, role: 'status' }, h('span', { text: 'HUD hidden. Tab brings it back.' }));
  overlay.appendChild(chip);
  parent.appendChild(root);
  d.add(applyTheme(ctx, root));

  const layers = { overlay, world, slots, forceTouch: !!o.forceTouch };
  const modules = {};
  const list = [];
  for (const part of HUD_PARTS) {
    const id = part.meta.id;
    if (o.only && !o.only.includes(id)) continue;
    if (o.skip && o.skip.includes(id)) continue;
    let host = slots[part.meta.slot];
    if (part.meta.slot === 'army-mid') host = modules.armymeter && modules.armymeter.slots && modules.armymeter.slots.mid;
    if (!host) continue;
    const api = part.mount(host, ctx, layers);
    modules[id] = api; list.push({ api, keep: !!part.meta.keepHidden });
  }

  let hidden = false, last = -1e9, chipTimer = 0, lastHud = null;
  function hide(b) {
    b = !!b; if (b === hidden) return;
    hidden = b; root.classList.toggle('is-hidden', b);
    chip.hidden = !b;
    if (b) { clearTimeout(chipTimer); chip.classList.remove('is-fading'); chipTimer = setTimeout(() => chip.classList.add('is-fading'), 2200); }
    sfx(ctx, b ? 'ui_panel_close' : 'ui_panel_open', { vol: 0.4 });
  }
  d.add(() => clearTimeout(chipTimer));
  d.on(window, 'resize', () => { root.dataset.layout = layoutOf(ctx); });
  d.add(ctx.settings && ctx.settings.on ? ctx.settings.on(() => { root.dataset.layout = layoutOf(ctx); }) : null);
  // shell events from modules
  const menuOpen = (b) => root.classList.toggle('menu-open', !!b);

  // mouse clicks should not leave focus on a HUD button (Space / Enter would re-trigger it instead of pausing)
  d.on(root, 'click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && e.detail > 0) b.blur(); });
  // soft hover tick on HUD buttons
  let lastHover = null;
  d.on(root, 'pointerover', (e) => { const b = e.target.closest && e.target.closest('.hud-btn, .hud-power, .hud-order'); if (b && b !== lastHover) { lastHover = b; sfx(ctx, 'ui_hover', { vol: 0.25 }); } else if (!b) lastHover = null; });

  const hudApi = {
    root, modules, slots, layers, menuOpen,
    hide, isHidden: () => hidden, toggleHide: () => hide(!hidden),
    update(hud, dt, force) {
      const t = performance.now();
      if (!force && t - last < (o.interval || 95)) return false;
      last = t; lastHud = hud;
      if (!hud) return false;
      for (let i = 0; i < list.length; i++) { const m = list[i]; if (!hidden || m.keep) m.api.update(hud, dt); }
      return true;
    },
    /** Battle hotkeys. Returns true when consumed (the caller must not also treat the key as pause etc.). */
    onKey(e) {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return false;
      const m = modules, s = ctx.settings, code = e.code;
      const eat = () => { e.preventDefault(); return true; };
      const help = m.help;
      if (help && help.isOpen()) { if (code === 'Escape' || code === FIXED.help || e.key === '?') { help.show(false); return eat(); } return false; }
      if (code === FIXED.help || e.key === '?') { if (help) { help.show(true); return eat(); } return false; }
      if (code === FIXED.hide_hud) { hide(!hidden); return eat(); }
      if (code === 'Escape') {
        if (m.powers && m.powers.isAiming()) { m.powers.cancel(); return eat(); }
        if (m.photo && m.photo.isActive()) { m.cameramodes && m.cameramodes.set('orbit'); return eat(); }
        if (lastHud && lastHud.possess && m.takecommand) { m.takecommand.exit(); return eat(); }
        return false;
      }
      if (isAction(e, s, 'pause')) { if (m.speed) { m.speed.togglePause(); return eat(); } }
      if (isAction(e, s, 'slower')) { if (m.speed) { m.speed.slower(); return eat(); } }
      if (isAction(e, s, 'faster')) { if (m.speed) { m.speed.faster(); return eat(); } }
      if (isAction(e, s, 'follow')) { m.cameramodes && m.cameramodes.set('follow'); return eat(); }
      if (isAction(e, s, 'topdown')) { m.cameramodes && m.cameramodes.set('topdown'); return eat(); }
      if (isAction(e, s, 'cinematic')) { m.cameramodes && m.cameramodes.set('cinematic'); return eat(); }
      if (isAction(e, s, 'photo')) { m.cameramodes && m.cameramodes.set(camMode(lastHud) === 'photo' ? 'orbit' : 'photo'); return eat(); }
      if (code === FIXED.minimap) { if (m.minimap) { m.minimap.toggle(); return eat(); } }
      if (/^Digit[1-6]$/.test(code)) {
        const n = +code.slice(5);
        if (lastHud && lastHud.possess) { if (n <= 3) { const b = root.querySelector('#hud-tc-ab' + n); if (b) b.click(); return eat(); } return false; }
        if (m.powers) { m.powers.activate(n - 1); return eat(); }
      }
      if (code === FIXED.order_advance) { m.orders && m.orders.issue('advance'); return eat(); }
      if (code === FIXED.order_hold) { m.orders && m.orders.issue('hold'); return eat(); }
      if (code === FIXED.command) {
        const sel = lastHud && lastHud.selection;
        if (sel && sel.team === 0 && !(lastHud && lastHud.possess)) { try { ctx.game.possess(sel.id); } catch (err) { /* not ready */ } return eat(); }
      }
      return false;
    },
    destroy() { d.run(); for (const m of list.slice().reverse()) { try { m.api.destroy(); } catch (e) { /* teardown continues */ } } root.remove(); },
  };
  return hudApi;
}
