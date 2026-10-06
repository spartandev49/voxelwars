// powers.js: bottom-centre god-power bar: 6 icons, cooldown sweep, ready glow, hotkeys 1-6, aim ("telegraph target") mode.
// hud.powers = [{id,name,key,cd,cdMax,ready,blurb?}] (from game.godPowers()). Casting: game.aim(id) when the Game offers target mode;
// otherwise the HUD arms itself, waits for the next canvas click, asks game.camera.pick(x,y) -> {x,z} and calls game.cast(id,x,z).
import { h, setText, setCls, setVar, setHidden, setAttr, sfx, anim, disposer } from './_dom.js';
import { icon, POWER_ICON } from './_icons.js';

export const meta = { id: 'powers', slot: 'bottom-center', order: 1 };
const DEFAULTS = [
  ['zeus_lightning', "Zeus' Lightning", 'Smite a cluster. Zeus bills later.'],
  ['meteor', 'Meteor', 'Dinosaur Retirement Plan. Big crater, bigger apology.'],
  ['earthquake', 'Earthquake', 'Shake the formation. Rubble is free.'],
  ['heal_wave', 'Heal Wave', 'A very nice wave. Heals your units in the circle.'],
  ['wine_rain', 'Wine Rain', 'Everyone gets tipsy and slower. Damage x0.6.'],
  ['raise_chickens', 'Raise Chickens', 'A flock of furious, feathered volunteers.'],
];

export function mount(parent, ctx, layers) {
  const d = disposer();
  const slots = DEFAULTS.map((df, i) => {
    const sweep = h('i', { class: 'hud-power-sweep' });
    const cd = h('span', { class: 'hud-power-cd' });
    const key = h('kbd', { class: 'hud-power-key', text: String(i + 1) });
    const ic = h('span', { class: 'hud-power-ic' }, icon(POWER_ICON[df[0]] || 'star'));
    const el = h('button', { class: 'hud-power', type: 'button', id: 'hud-power-' + (i + 1), 'data-power': df[0], 'aria-label': df[1] + ', key ' + (i + 1), 'aria-pressed': 'false', 'data-tip': df[1] + ': ' + df[2], 'data-tip-pos': 'above' }, ic, sweep, cd, key);
    return { el, sweep, cd, id: df[0], name: df[1], blurb: df[2], ready: true, cdv: 0, cdMax: 1 };
  });
  const el = h('div', { class: 'hud-powers hud-panel', 'data-hud': 'powers', role: 'toolbar', 'aria-label': 'God powers' }, slots.map((s) => s.el));
  parent.appendChild(el);
  const hintText = h('span', { class: 'hud-aim-text' });
  const cancel = h('button', { class: 'hud-btn hud-aim-cancel', type: 'button', 'aria-label': 'Cancel aiming' }, icon('close'));
  const hint = h('div', { class: 'hud-aim hud-panel', hidden: true, role: 'status' }, icon('focus'), hintText, cancel);
  if (layers && layers.overlay) layers.overlay.appendChild(hint);

  let armed = -1, disabled = false, lastHud = null;
  const touch = !!(ctx.platform && ctx.platform.isTouch);

  function disarm(silent) {
    if (armed < 0) return false;
    armed = -1;
    setHidden(hint, true);
    slots.forEach((s) => { setCls(s.el, 'is-armed', false); setAttr(s.el, 'aria-pressed', false); });
    if (el.parentNode && el.closest) { const r = el.closest('.vw-hud'); if (r) r.classList.remove('is-aiming'); }
    try { if (ctx.game && ctx.game.aim) ctx.game.aim(null); } catch (e) { /* not ready */ }
    if (!silent) sfx(ctx, 'ui_back', { vol: 0.5 });
    return true;
  }

  function shake(s) { anim(ctx, s.el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' }); }

  function onCanvasDown(e) {
    if (armed < 0 || (ctx.game && ctx.game.aim)) return;      // with game.aim() the Game owns the click
    if (e.target.closest && e.target.closest('.hud-panel, .hud-btn, button')) return;
    const s = slots[armed];
    const gm = ctx.game; if (!gm) return;
    let p = null;
    try { p = gm.camera && gm.camera.pick ? gm.camera.pick(e.clientX, e.clientY) : null; } catch (err) { p = null; }
    if (!p && lastHud && lastHud.cam) p = { x: lastHud.cam.x || 0, z: lastHud.cam.z || 0 };
    if (!p) return;
    try { gm.cast(s.id, p.x, p.z); } catch (err) { /* not ready */ }
    sfx(ctx, 'ui_confirm', { vol: 0.6 });
    disarm(true);
  }

  function activate(i) {
    const s = slots[i]; if (!s) return false;
    if (disabled) { shake(s); sfx(ctx, 'ui_error', { vol: 0.4 }); ctx.nav && ctx.nav.toast && ctx.nav.toast('God powers are off while you are in command. Esc to get back to godhood.', { kind: 'info' }); return true; }
    if (armed === i) { disarm(); return true; }
    if (!s.ready) {
      shake(s); sfx(ctx, 'ui_error', { vol: 0.4 });
      ctx.nav && ctx.nav.toast && ctx.nav.toast(s.name + ' needs ' + Math.ceil(s.cdv) + ' more seconds. Even gods have cooldowns.', { kind: 'info' });
      return true;
    }
    disarm(true);
    armed = i;
    slots.forEach((x, j) => { setCls(x.el, 'is-armed', j === i); setAttr(x.el, 'aria-pressed', j === i); });
    setText(hintText, s.name + ': ' + (touch ? 'tap' : 'click') + ' the arena to cast. Esc cancels.');
    setHidden(hint, false);
    const r = el.closest && el.closest('.vw-hud'); if (r) r.classList.add('is-aiming');
    sfx(ctx, 'ui_panel_open', { vol: 0.5 });
    try { if (ctx.game && ctx.game.aim) ctx.game.aim(s.id); } catch (e) { /* not ready */ }
    return true;
  }

  slots.forEach((s, i) => s.el.addEventListener('click', () => activate(i)));
  cancel.addEventListener('click', () => disarm());
  d.on(window, 'pointerdown', onCanvasDown, true);

  return {
    el,
    activate, cancel: () => disarm(), isAiming: () => armed >= 0,
    update(hud) {
      lastHud = hud;
      const ps = hud.powers || [];
      disabled = !!hud.possess;
      setCls(el, 'is-disabled', disabled);
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i], p = ps[i];
        if (p) {
          if (p.id && p.id !== s.id) { s.id = p.id; s.el.dataset.power = p.id; s.el.firstChild.replaceChildren(icon(POWER_ICON[p.id] || 'star')); }
          if (p.name && p.name !== s.name) { s.name = p.name; }
          const blurb = p.blurb || s.blurb;
          setAttr(s.el, 'data-tip', s.name + ': ' + blurb);
          setAttr(s.el, 'aria-label', s.name + ', key ' + (p.key || i + 1) + (p.ready ? ', ready' : ', recharging'));
          if (p.key) setText(s.el.querySelector('.hud-power-key'), String(p.key));
          const wasReady = s.ready;
          s.ready = !!p.ready; s.cdv = p.cd || 0; s.cdMax = p.cdMax || 1;
          if (s.ready && !wasReady) {
            anim(ctx, s.el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
            sfx(ctx, 'ui_tick', { vol: 0.35, pitch: 1.5 });
          }
        }
        const frac = s.ready ? 0 : Math.max(0, Math.min(1, s.cdv / s.cdMax));
        setVar(s.sweep, '--p', (Math.round(frac * 100) / 100).toString());
        setCls(s.el, 'is-ready', s.ready && !disabled);
        setCls(s.el, 'is-cooling', !s.ready);
        setText(s.cd, s.ready ? '' : String(Math.ceil(s.cdv)));
        if (armed === i && !s.ready) disarm(true);
      }
    },
    destroy() { disarm(true); d.run(); el.remove(); hint.remove(); },
  };
}
