// _controls.js: builds the controls reference (per-context binding tables) used by the in-battle overlay (H / ?) and the Controls screen.
import { h } from './_dom.js';
import { contextTables, TOUCH_TIPS } from './_bindings.js';

export function kbd(label) { return h('kbd', { class: 'hud-kbd', text: label }); }

/** controlsBody(ctx, {only:['camera','control','command'], touch:true}) -> HTMLElement */
export function controlsBody(ctx, opts) {
  const o = opts || {};
  const tables = contextTables(ctx && ctx.settings).filter((t) => !o.only || o.only.includes(t.id));
  const grid = h('div', { class: 'hud-ctl-grid' });
  for (const t of tables) {
    const card = h('section', { class: 'hud-ctl-card', 'aria-label': t.title }, h('h3', { class: 'hud-ctl-title', text: t.title }));
    const list = h('dl', { class: 'hud-ctl-list' });
    for (const [label, keys, rebind] of t.rows) {
      list.appendChild(h('dt', { text: label + (rebind ? ' *' : '') }));
      list.appendChild(h('dd', {}, keys.map((k, i) => (/^or |^\(/.test(k) ? h('span', { class: 'hud-ctl-or', text: k }) : kbd(k)))));
    }
    card.appendChild(list); grid.appendChild(card);
  }
  const wrap = h('div', { class: 'hud-ctl' }, grid);
  if (o.touch !== false) {
    const tl = h('dl', { class: 'hud-ctl-list' });
    for (const [a, b] of TOUCH_TIPS) { tl.appendChild(h('dt', { text: a })); tl.appendChild(h('dd', { text: b })); }
    wrap.appendChild(h('section', { class: 'hud-ctl-card is-touch', 'aria-label': 'Touch' }, h('h3', { class: 'hud-ctl-title', text: 'Touch' }), tl));
  }
  wrap.appendChild(h('p', { class: 'hud-ctl-note', text: '* rebindable in Settings > Controls. A rebinding cannot collide with another key in the same context.' }));
  return wrap;
}
