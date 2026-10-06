// controls.js: the full controls reference (per-context binding tables from spec/ui.md section 6; rebinding aware). Opened as an overlay from the
// pause menu and from the Help hotkey in menus; the in-battle H overlay shows the battle subset of the same tables (hud/helpoverlay.js).
import * as K from '../kit.js';
import { h, disposer, sfx } from '../hud/_dom.js';
import { controlsBody } from '../hud/_controls.js';

export const meta = { id: 'controls', layer: 'menu', music: 'none', canvas: 'none' };

export function mount(root, ctx, params) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  const p = params || {};
  root.classList.add('bs', 'bs-controls');
  root.style.pointerEvents = 'auto';
  const isOverlay = root.classList.contains('vw-overlay');
  const leave = () => { if (isOverlay && ctx.nav.closeOverlay) ctx.nav.closeOverlay('controls'); else ctx.nav.back(); };
  const closeBtn = K.button('Close', { variant: 'primary', icon: 'check', id: 'controls-close', hint: 'Escape', onClick: leave });
  const body = h('div', { class: 'bs-controls-body vw-scroll' }, controlsBody(ctx, { only: p.only || null, touch: true }));
  const card = K.tablet('Controls', body, { variant: 'glass', icon: 'keyboard', sub: 'Keys marked * can be rebound in Settings > Controls.', actions: [closeBtn], id: 'bs-controls-card', class: 'bs-controls-card' });
  root.append(h('div', { class: 'bs-scrim' }), h('div', { class: 'bs-center' }, card));
  K.enter(card, 'pop');
  sfx(ctx, 'ui_panel_open', { vol: 0.5 });
  try { closeBtn.focus({ preventScroll: true }); } catch (e) { /* focus optional */ }
  const siblings = Array.from(root.parentElement ? root.parentElement.children : []).filter((c) => c !== root && !c.hasAttribute('inert'));
  siblings.forEach((c) => c.setAttribute('inert', ''));
  d.add(() => siblings.forEach((c) => c.removeAttribute('inert')));
  return {
    onBack() { leave(); return true; },
    onKey(e) {
      if (e.code === 'KeyH' || e.key === '?') { leave(); return true; }
      if (e.code === 'Tab') {
        const f = K.focusables(root); if (!f.length) return false;
        const first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (e.shiftKey && (a === first || !root.contains(a))) { e.preventDefault(); last.focus(); return true; }
        if (!e.shiftKey && (a === last || !root.contains(a))) { e.preventDefault(); first.focus(); return true; }
      }
      return true;
    },
    destroy() { d.run(); },
  };
}
