// typecounts.js: collapsible per-type unit counts (A | B) with tiny survival bars. Pooled rows (the battle cap is 16 distinct types).
// Data: hud.teams[i].byType = [{defId, alive, start}].
import { h, setText, setCls, setHidden, setScaleX, setAttr, unitName, unitRole, ROLE_ICON } from './_dom.js';
import { icon } from './_icons.js';

export const meta = { id: 'typecounts', slot: 'bottom-right', order: 1 };
const ROWS = 16;
let rememberedOpen = false;       // survives battles within one session; deliberately not persisted

export function mount(parent, ctx) {
  const chev = h('span', { class: 'hud-types-chev' }, icon('chevup'));
  const sumA = h('b', { class: 'is-a' }), sumB = h('b', { class: 'is-b' });
  const head = h('button', { class: 'hud-types-head', type: 'button', id: 'hud-types-toggle', 'aria-expanded': 'false', 'aria-controls': 'hud-types-body', 'data-tip': 'Unit counts by type', 'data-tip-pos': 'above' },
    icon('list'), h('span', { class: 'hud-types-title', text: 'Units' }), h('span', { class: 'hud-types-sum' }, sumA, h('i', { text: ' vs ' }), sumB), chev);
  const rows = [];
  const body = h('div', { class: 'hud-types-body', id: 'hud-types-body', role: 'table', 'aria-label': 'Units by type', hidden: true });
  for (let i = 0; i < ROWS; i++) {
    const r = { el: h('div', { class: 'hud-types-row', role: 'row', hidden: true }), ic: h('span', { class: 'hud-types-ic' }), nm: h('span', { class: 'hud-types-name' }),
      a: h('span', { class: 'hud-types-n is-a' }), b: h('span', { class: 'hud-types-n is-b' }), ba: h('i', { class: 'hud-bar-fill' }), bb: h('i', { class: 'hud-bar-fill' }), id: null };
    r.el.append(r.ic, r.nm, h('span', { class: 'hud-types-cell is-a' }, r.a, h('span', { class: 'hud-bar' }, r.ba)), h('span', { class: 'hud-types-cell is-b' }, r.b, h('span', { class: 'hud-bar' }, r.bb)));
    rows.push(r); body.appendChild(r.el);
  }
  const el = h('div', { class: 'hud-types hud-panel', 'data-hud': 'types' }, head, body);
  parent.appendChild(el);

  let open = false, order = [];           // order: defIds, stable once seen
  function setOpen(b) { open = b; rememberedOpen = b; setHidden(body, !b); setAttr(head, 'aria-expanded', b); setCls(el, 'is-open', b); parent.classList.toggle('types-open', b); }
  head.addEventListener('click', () => setOpen(!open));
  setOpen(rememberedOpen);

  return {
    el, toggle: () => setOpen(!open),
    update(hud) {
      const ts = hud.teams; if (!ts || ts.length < 2) return;
      setText(sumA, ts[0].alive); setText(sumB, ts[1].alive);
      if (!open) return;
      const map = new Map();
      for (let t = 0; t < 2; t++) for (const e of (ts[t].byType || [])) { let m = map.get(e.defId); if (!m) { m = { a: 0, as: 0, b: 0, bs: 0 }; map.set(e.defId, m); } if (t === 0) { m.a = e.alive; m.as = e.start; } else { m.b = e.alive; m.bs = e.start; } }
      for (const id of map.keys()) if (!order.includes(id)) order.push(id);
      order = order.filter((id) => map.has(id));
      order.sort((x, y) => { const mx = map.get(x), my = map.get(y); return (my.as + my.bs) - (mx.as + mx.bs); });
      for (let i = 0; i < ROWS; i++) {
        const r = rows[i], id = order[i], m = id && map.get(id);
        setHidden(r.el, !m);
        if (!m) continue;
        if (r.id !== id) { r.id = id; r.ic.replaceChildren(icon(ROLE_ICON[unitRole(ctx, id)] || 'sword')); setText(r.nm, unitName(ctx, id)); }
        setText(r.a, m.as ? m.a : '-'); setText(r.b, m.bs ? m.b : '-');
        setScaleX(r.ba, m.as ? m.a / m.as : 0); setScaleX(r.bb, m.bs ? m.b / m.bs : 0);
        setCls(r.el, 'is-wiped', m.a + m.b === 0);
      }
    },
    destroy() { el.remove(); },
  };
}
