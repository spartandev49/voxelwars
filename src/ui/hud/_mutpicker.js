// _mutpicker.js: the mutator picker (toggle chips with lock state) used by Survival setup and the briefing's rules list.
// Mutators come from ctx.content.mutators = [{id, name, desc|blurb, stars}] ; `stars` is the campaign-star unlock threshold (spec section 14).
// mutatorPicker(ctx, {selected:Set|array, onChange(ids[]), max, readOnly}) -> element with .get() / .set(ids)
import { h, sfx } from './_dom.js';
import { icon } from './_icons.js';
import { mutatorInfo } from './mutators.js';
import { totalStars } from './_progress.js';

export function mutatorList(ctx) {
  const m = ctx && ctx.content && ctx.content.mutators;
  if (!m) return [];
  return Array.isArray(m) ? m.slice() : Object.keys(m).map((id) => Object.assign({ id }, m[id]));
}

export function mutatorPicker(ctx, o) {
  const opt = o || {};
  const list = mutatorList(ctx);
  const missions = (ctx.content && ctx.content.campaign && ctx.content.campaign.missions) || [];
  const have = totalStars(ctx, missions);
  const sel = new Set(opt.selected || []);
  const max = opt.max || 3;
  const btns = new Map();
  const el = h('div', { class: 'bs-mutpick', role: 'group', 'aria-label': 'Mutators' });
  const note = h('p', { class: 'bs-mutpick-note' });
  function paintNote() { note.textContent = sel.size ? sel.size + ' of ' + max + ' mutators on. Chaos level: reasonable.' : 'No mutators. Reality, as intended.'; }
  for (const m of list) {
    const info = mutatorInfo(ctx, m.id);
    const locked = (m.stars | 0) > have;
    const b = h('button', { class: 'bs-mut' + (locked ? ' is-locked' : ''), type: 'button', id: 'mut-' + m.id, 'aria-pressed': String(sel.has(m.id)), 'data-mutator': m.id, 'data-tip': locked ? 'Unlocks at ' + m.stars + ' campaign stars (you have ' + have + ').' : info.blurb, 'data-tip-pos': 'above',
      'aria-label': info.name + (locked ? ', locked, needs ' + m.stars + ' campaign stars' : ''), 'aria-disabled': locked ? 'true' : null },
      icon(locked ? 'lock' : info.icon), h('span', { class: 'bs-mut-name', text: info.name }), locked ? h('small', { class: 'bs-mut-lock', text: m.stars + '★' }) : null);
    b.addEventListener('click', () => {
      if (opt.readOnly) return;
      if (locked) { sfx(ctx, 'ui_error', { vol: 0.5 }); return; }
      if (sel.has(m.id)) sel.delete(m.id);
      else { if (sel.size >= max) { sfx(ctx, 'ui_error', { vol: 0.5 }); ctx.nav && ctx.nav.toast && ctx.nav.toast('Max ' + max + ' mutators. The universe has limits.', { kind: 'info' }); return; } sel.add(m.id); }
      sfx(ctx, 'ui_toggle', { vol: 0.5 });
      paint(); if (opt.onChange) opt.onChange(Array.from(sel));
    });
    btns.set(m.id, b); el.appendChild(b);
  }
  function paint() { btns.forEach((b, id) => b.setAttribute('aria-pressed', String(sel.has(id)))); paintNote(); }
  paint();
  const wrap = h('div', { class: 'bs-mutpick-wrap' }, el, note);
  wrap.get = () => Array.from(sel);
  wrap.set = (ids) => { sel.clear(); for (const i of ids || []) sel.add(i); paint(); };
  return wrap;
}
