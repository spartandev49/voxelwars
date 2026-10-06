// orders.js: Advance / Hold / Retreat / Focus for the selected squad (or everyone when nothing is selected).
// Calls game.command({type:'command', order, squad:<id|'all'>, team:0, target?}). Hotkeys O (advance) and L (hold) are routed by the battle screen.
import { h, setText, setCls, setAttr, sfx, anim } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'orders', slot: 'bottom-center', order: 2 };
const ORDERS = [
  { id: 'advance', label: 'Advance', key: 'O', tip: 'Advance: march on the enemy (O)', toast: 'Advance! Glory awaits, probably.' },
  { id: 'hold', label: 'Hold', key: 'L', tip: 'Hold position: be a wall (L)', toast: 'Hold the line. Hold it nicely.' },
  { id: 'retreat', label: 'Retreat', key: '', tip: 'Retreat: tactical backwards advance', toast: 'Retreat! (Tactically.)' },
  { id: 'focus', label: 'Focus', key: '', tip: 'Focus: everyone hits the selected or hovered enemy', toast: 'Focus fire. Pick on one at a time.' },
];

export function mount(parent, ctx) {
  const btns = ORDERS.map((o) => h('button', { class: 'hud-order', type: 'button', id: 'hud-order-' + o.id, 'data-order': o.id, 'aria-pressed': 'false', 'aria-label': o.label + ' order', 'data-tip': o.tip, 'data-tip-pos': 'above' }, icon(o.id), h('span', { class: 'hud-order-label', text: o.label })));
  const scope = h('span', { class: 'hud-orders-scope', text: 'All', 'data-tip': 'Orders apply to: all squads', 'data-tip-pos': 'above' });
  const el = h('div', { class: 'hud-orders hud-panel', 'data-hud': 'orders', role: 'toolbar', 'aria-label': 'Orders' }, scope, btns);
  parent.appendChild(el);
  let sel = null, current = null, disabled = false, hover = null;

  function issue(i) {
    const o = ORDERS[i];
    if (disabled) { sfx(ctx, 'ui_error', { vol: 0.4 }); return false; }
    const own = sel && sel.team !== 1;
    const cmd = { type: 'command', order: o.id, squad: own && sel.squad != null ? sel.squad : 'all', team: 0 };
    if (o.id === 'focus') {
      const t = (sel && sel.team === 1) ? sel : (hover && hover.team === 1 ? hover : null);
      if (!t) { ctx.nav && ctx.nav.toast && ctx.nav.toast('Focus needs a target: select or hover an enemy first.', { kind: 'info' }); sfx(ctx, 'ui_error', { vol: 0.4 }); return false; }
      cmd.target = t.id;
    }
    try { ctx.game && ctx.game.command && ctx.game.command(cmd); } catch (e) { /* not ready */ }
    current = o.id; paint();
    sfx(ctx, 'ui_confirm', { vol: 0.5 });
    anim(ctx, btns[i], [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (ctx.nav && ctx.nav.toast) ctx.nav.toast(o.toast, { kind: 'info' });
    return true;
  }
  function paint() { btns.forEach((b, i) => { const on = ORDERS[i].id === current; setCls(b, 'is-on', on); setAttr(b, 'aria-pressed', on); }); }
  btns.forEach((b, i) => b.addEventListener('click', () => issue(i)));

  return {
    el,
    issue: (id) => issue(ORDERS.findIndex((o) => o.id === id)),
    update(hud) {
      sel = hud.selection || null;
      hover = hud.hover || null;
      disabled = !!hud.possess;
      setCls(el, 'is-disabled', disabled);
      const c = hud.orders && hud.orders.current;
      if (c !== undefined && c !== current) { current = c || null; paint(); }
      const sq = sel && sel.team !== 1 && sel.squad != null;
      setText(scope, sq ? 'Squad' : 'All');
      setAttr(scope, 'data-tip', sq ? 'Orders apply to the selected squad: ' + (sel.squadName || sel.name || 'selected') : 'Orders apply to: all squads');
    },
    destroy() { el.remove(); },
  };
}
