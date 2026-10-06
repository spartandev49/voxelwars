// photo.js: photo-mode UI. While hud.cam.mode === 'photo' the rest of the HUD hides; this bar offers Snap (game.camera.photo() -> platform.downloads),
// a slow-mo slider (0.25x / 0.5x / 1x), Freeze, and Done. Without downloads the picture opens in a modal you can long-press / right-click to save.
import { h, setText, setHidden, setCls, sfx, disposer, anim, camMode } from './_dom.js';
import { icon } from './_icons.js';
import { keyOf } from './_bindings.js';

export const meta = { id: 'photo', slot: 'overlay', order: 6, keepHidden: true };
const STOPS = [0.25, 0.5, 1];

function dataUrlToBlob(u) {
  try {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(u); if (!m) return null;
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  } catch (e) { return null; }
}
const stamp = () => { const t = new Date(); const p = (n) => String(n).padStart(2, '0'); return t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + '-' + p(t.getHours()) + p(t.getMinutes()) + p(t.getSeconds()); };

export function mount(parent, ctx) {
  const d = disposer();
  const snap = h('button', { class: 'hud-photo-snap', type: 'button', id: 'hud-photo-snap', 'aria-label': 'Take a picture' }, icon('photo'), h('span', { text: 'Snap' }));
  const val = h('output', { class: 'hud-photo-val', text: '1x', for: 'hud-photo-slow' });
  const slider = h('input', { class: 'hud-photo-slider', type: 'range', id: 'hud-photo-slow', min: 0, max: STOPS.length - 1, step: 1, value: 2, 'aria-label': 'Slow motion' });
  const freeze = h('button', { class: 'hud-btn hud-photo-freeze', type: 'button', id: 'hud-photo-freeze', 'aria-pressed': 'false', 'data-tip': 'Freeze the moment', 'data-tip-pos': 'above' }, icon('pause'), h('span', { text: 'Freeze' }));
  const done = h('button', { class: 'hud-btn hud-photo-done', type: 'button', id: 'hud-photo-done', 'data-tip': 'Back to the battle (' + keyOf(ctx.settings, 'photo') + ')', 'data-tip-pos': 'above' }, icon('close'), h('span', { text: 'Done' }));
  const status = h('span', { class: 'hud-photo-status', role: 'status', 'aria-live': 'polite' });
  const bar = h('div', { class: 'hud-photo-bar hud-panel', role: 'toolbar', 'aria-label': 'Photo mode', 'data-hud': 'photo' }, snap,
    h('label', { class: 'hud-photo-slow', for: 'hud-photo-slow' }, icon('film'), h('span', { text: 'Slow-mo' }), slider, val), freeze, done, status);
  const flash = h('div', { class: 'hud-photo-flash', 'aria-hidden': 'true' });
  const hint = h('div', { class: 'hud-photo-hint hud-panel', 'aria-hidden': 'true', text: 'Photo mode. The HUD stepped out for a moment. Move the camera like normal.' });
  const el = h('div', { class: 'hud-photo', hidden: true }, hint, bar, flash);
  parent.appendChild(el);
  let busy = false, frozen = false, active = false;

  async function takePhoto() {
    if (busy) return; busy = true; setCls(snap, 'is-busy', true);
    let url = null;
    try { url = await (ctx.game && ctx.game.camera && ctx.game.camera.photo ? ctx.game.camera.photo() : null); } catch (e) { url = null; }
    const calm = !!(ctx.settings && ctx.settings.get && ctx.settings.get('flashLimiter'));
    anim(ctx, flash, calm ? [{ opacity: 0 }, { opacity: 0.25 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0.95, offset: 0.12 }, { opacity: 0 }], { duration: calm ? 500 : 360, easing: 'ease-out' }, [{ opacity: 0 }, { opacity: 0.2 }, { opacity: 0 }]);
    sfx(ctx, 'ui_confirm', { vol: 0.6 });
    if (!url) { setText(status, 'The camera blinked. Try again.'); busy = false; setCls(snap, 'is-busy', false); return; }
    const name = 'voxelwars-' + stamp() + (String(url).startsWith('data:image/jpeg') ? '.jpg' : '.png');
    let saved = false;
    try {
      const dl = ctx.platform && ctx.platform.downloads;
      if (dl && dl.save) { const r = dl.save(name, dataUrlToBlob(url) || url); if (r) saved = (await r) !== false; }
    } catch (e) { saved = false; }
    if (saved) { setText(status, 'Saved ' + name); ctx.nav && ctx.nav.toast && ctx.nav.toast('Saved ' + name + '. Frame it.', { kind: 'success' }); }
    else if (ctx.nav && ctx.nav.modal) {
      const img = h('img', { class: 'hud-photo-img', alt: 'Your screenshot', src: url });
      setText(status, 'Downloads are blocked here. Your picture is in the preview.');
      ctx.nav.modal({ title: 'Your masterpiece', body: h('div', { class: 'hud-photo-prev' }, img, h('p', { text: 'This page cannot save files directly. Long-press or right-click the picture and choose Save image.' })), buttons: [{ label: 'Done', variant: 'primary', value: true }] });
    }
    busy = false; setCls(snap, 'is-busy', false);
  }
  snap.addEventListener('click', takePhoto);
  slider.addEventListener('input', () => {
    const v = STOPS[+slider.value] || 1;
    setText(val, v + 'x');
    try { ctx.game && ctx.game.setSpeed && ctx.game.setSpeed(v); if (frozen) { frozen = false; setCls(freeze, 'is-on', false); freeze.setAttribute('aria-pressed', 'false'); ctx.game.pause && ctx.game.pause(false); } } catch (e) { /* not ready */ }
    sfx(ctx, 'ui_tick', { vol: 0.35, pitch: 0.8 + 0.2 * +slider.value });
  });
  freeze.addEventListener('click', () => {
    frozen = !frozen; setCls(freeze, 'is-on', frozen); freeze.setAttribute('aria-pressed', String(frozen));
    try { ctx.game && ctx.game.pause && ctx.game.pause(frozen); } catch (e) { /* not ready */ }
    sfx(ctx, 'ui_toggle', { vol: 0.5 });
  });
  done.addEventListener('click', () => { try { ctx.game && ctx.game.camera && ctx.game.camera.setMode && ctx.game.camera.setMode('orbit'); } catch (e) { /* not ready */ } if (frozen) { frozen = false; try { ctx.game.pause(false); } catch (e) { /* not ready */ } } });

  return {
    el, snap: takePhoto, isActive: () => active,
    update(hud) {
      const on = camMode(hud) === 'photo';
      if (on !== active) {
        active = on; setHidden(el, !on);
        const r = el.closest && el.closest('.vw-hud'); if (r) r.classList.toggle('is-photo', on);
        if (on) setText(status, '');
      }
    },
    destroy() { d.run(); el.remove(); },
  };
}
