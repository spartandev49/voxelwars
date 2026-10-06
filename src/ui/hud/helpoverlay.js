// helpoverlay.js: the in-battle controls overlay (H or ?). Reads the per-context binding table (rebinding aware). Esc / H / ? / click outside closes.
import { h, setCls, sfx } from './_dom.js';
import { icon } from './_icons.js';
import { controlsBody } from './_controls.js';

export const meta = { id: 'help', slot: 'overlay', order: 9, keepHidden: true };

export function mount(parent, ctx) {
  const close = h('button', { class: 'hud-btn hud-help-close', type: 'button', id: 'hud-help-close', 'aria-label': 'Close controls' }, icon('close'));
  const body = h('div', { class: 'hud-help-body' });
  const card = h('div', { class: 'hud-help-card hud-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Controls' },
    h('div', { class: 'hud-help-head' }, h('h2', { class: 'hud-help-title', text: 'Controls' }), h('span', { class: 'hud-help-sub', text: 'Everything a general needs, plus a few things a general should not need.' }), close), body);
  const el = h('div', { class: 'hud-help', hidden: true, 'data-hud': 'help' }, card);
  parent.appendChild(el);
  let open = false;

  function show(b) {
    if (b === open) return;
    open = b;
    if (b) { body.replaceChildren(controlsBody(ctx, { only: ['camera', 'control', 'command'] })); }
    el.hidden = !b;
    setCls(el, 'is-open', b);
    sfx(ctx, b ? 'ui_panel_open' : 'ui_panel_close', { vol: 0.5 });
    if (b) { try { close.focus({ preventScroll: true }); } catch (e) { /* focus optional */ } }
    el.dispatchEvent(new CustomEvent('hud:help', { bubbles: true, detail: { open: b } }));
  }
  close.addEventListener('click', () => show(false));
  el.addEventListener('pointerdown', (e) => { if (e.target === el) show(false); });

  return {
    el, show, toggle: () => show(!open), isOpen: () => open,
    update() {},
    destroy() { el.remove(); },
  };
}
