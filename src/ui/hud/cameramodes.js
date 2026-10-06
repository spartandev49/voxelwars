// cameramodes.js: Orbit / Follow / Command / Top-down / Cinematic / Photo buttons (hotkeys routed by the battle screen).
import { h, setCls, setAttr, sfx, camMode } from './_dom.js';
import { icon } from './_icons.js';
import { keyOf } from './_bindings.js';

export const meta = { id: 'cameramodes', slot: 'top-right', order: 2 };

const MODES = [
  { id: 'orbit', label: 'Orbit', tip: 'Orbit: drag the arena around' },
  { id: 'follow', label: 'Follow', tip: 'Follow the selected unit', key: 'follow' },
  { id: 'command', label: 'Command', tip: 'Command: RTS-style free camera' },
  { id: 'topdown', label: 'Top-down', tip: 'Top-down: generals have maps', key: 'topdown' },
  { id: 'cinematic', label: 'Cinematic', tip: 'Cinematic: the director cuts for you', key: 'cinematic' },
  { id: 'photo', label: 'Photo', tip: 'Photo mode: hide the HUD, take pictures', key: 'photo' },
];

const ICON_OF = { orbit: 'orbit', follow: 'follow', command: 'command', topdown: 'topdown', cinematic: 'cinematic', photo: 'photo' };

export function mount(parent, ctx) {
  const btns = MODES.map((m) => {
    const k = m.key ? keyOf(ctx.settings, m.key) : '';
    return h('button', { class: 'hud-btn hud-cam', type: 'button', id: 'hud-cam-' + m.id, 'data-mode': m.id, 'aria-pressed': 'false', 'aria-label': m.label + ' camera', 'data-tip': m.tip + (k ? ' (' + k + ')' : ''), 'data-tip-pos': 'below' }, icon(m.id));
  });
  const menu = h('button', { class: 'hud-btn hud-cam-menu', type: 'button', id: 'hud-cam-menu', 'aria-label': 'Camera modes', 'aria-expanded': 'false', 'data-tip': 'Camera modes', 'data-tip-pos': 'below' }, icon('orbit'));
  const row = h('div', { class: 'hud-cams-row', role: 'toolbar', 'aria-label': 'Camera mode' }, btns);
  const el = h('div', { class: 'hud-cams hud-panel', 'data-hud': 'camera' }, menu, row);
  parent.appendChild(el);
  let mode = 'orbit', selId = null;

  function set(id) {
    const cam = ctx.game && ctx.game.camera; if (!cam) return;
    try {
      if (id === 'follow') {
        if (selId == null) { ctx.nav && ctx.nav.toast && ctx.nav.toast('Following a volunteer. Click a soldier first to pick your favourite.', { kind: 'info' }); }
        else if (cam.follow) cam.follow(selId);
        if (cam.setMode) cam.setMode('follow');
      } else if (cam.setMode) cam.setMode(id);
    } catch (e) { /* camera not ready */ }
    mode = id; paint(); setMenu(false);
  }
  function paint() { btns.forEach((b, i) => { const on = MODES[i].id === mode; setCls(b, 'is-on', on); setAttr(b, 'aria-pressed', on); }); menu.replaceChildren(icon(mode in ICON_OF ? ICON_OF[mode] : 'orbit')); }
  let menuOpen = false;
  function setMenu(b) { menuOpen = b; setCls(el, 'is-open', b); menu.setAttribute('aria-expanded', String(b)); }
  menu.addEventListener('click', () => setMenu(!menuOpen));
  btns.forEach((b, i) => b.addEventListener('click', () => set(MODES[i].id)));
  paint();

  return {
    el, set,
    update(hud) {
      selId = hud.selection ? hud.selection.id : null;
      const m = camMode(hud);
      if (m !== mode) { mode = m; paint(); }
    },
    destroy() { el.remove(); },
  };
}
