// Achievements: the 24 silly medals with progress bars; locked/unlocked filter and summary meter.
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe } from './_shared.js';
import { ARENA_IDS, MISSION_IDS } from '../../content/era_ancient/humor/achievements.js';

export const meta = { id: 'achievements', layer: 'menu', music: 'menu', canvas: 'none' };

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
/** Progress toward the lifetime-total medals, read from ctx.save.stats.get() (docs/lifetime_stats.md). Battle-only medals have no progress bar. */
const PROGRESS = {
  sparta: (st) => [num(st.kicks), 25],
  depth_perception: (st) => [num(st.cyclopsMisses), 5],
  body_count: (st) => [num(st.kills), 1000],
  tourist: (st) => { const a = st.arenasPlayed || {}; return [ARENA_IDS.filter((id) => num(a[id]) > 0).length, ARENA_IDS.length]; },
  ancient_history: (st) => { const m = (st.campaign && st.campaign.stars) || {}; return [MISSION_IDS.filter((id) => num(m[id]) >= 1).length, MISSION_IDS.length]; },
  overachiever: (st) => { const m = (st.campaign && st.campaign.stars) || {}; return [MISSION_IDS.reduce((t, id) => t + Math.max(0, Math.min(3, num(m[id]))), 0), 27]; },
};

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.ach;
  const cleanups = [];
  const defs = safe(() => ctx.content.humor.achievements, []) || [];
  const rec = safe(() => ctx.save.progress.get('achievements'), {}) || {};
  const lifetime = safe(() => ctx.save.stats.get(), {}) || {};
  const progressOf = (d) => { try { if (PROGRESS[d.id]) { const r = PROGRESS[d.id](lifetime); return r; } } catch (e) { /* no bar */ } const t = d.target || 1; return t > 1 ? [num((rec[d.id] || {}).n), t] : null; };
  const done = (id) => !!(rec[id] && (rec[id].at || rec[id].unlocked));
  const total = defs.length, got = defs.filter((d) => done(d.id)).length;
  let filter = 'all';

  const meter = K.progress({ value: got, max: Math.max(1, total), tone: 'gold', tall: true, label: T.of(got, total), aria: T.title });
  const grid = K.h('div', { class: 'vw-ach__grid', role: 'list', 'aria-label': T.title });
  const seg = K.segmented({ id: 'ach-filter', label: 'Filter', value: 'all', options: [{ value: 'all', label: `${T.all} (${total})` }, { value: 'unlocked', label: `${T.unlocked} (${got})` }, { value: 'locked', label: `${T.locked} (${total - got})` }], onChange: (v) => { filter = v; paint(); } });

  function dateStr(ms) { try { return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  function paint() {
    const shown = defs.filter((d) => filter === 'all' || (filter === 'unlocked') === done(d.id));
    if (!shown.length) { grid.replaceChildren(K.emptyState({ icon: 'trophy', title: filter === 'locked' ? T.allDoneTitle : (T.emptyTitle || T.title), text: filter === 'locked' ? T.allDone : T.empty })); return; }
    grid.replaceChildren(...shown.map((d, i) => {
      const ok = done(d.id), r = rec[d.id] || {}, pr = progressOf(d), target = pr ? pr[1] : 1;
      const n = pr ? Math.min(pr[0], target) : 0;
      const card = K.h('article', { class: ['vw-ach', ok ? 'is-done' : 'is-locked'], role: 'listitem', id: 'ach-' + d.id, 'aria-label': `${d.name}. ${ok ? T0.common.unlocked : T0.common.locked}.`, style: { '--i': Math.min(i, 12) } },
        K.h('div', { class: 'vw-ach__ico' }, K.icon(ok ? (d.icon || 'trophy') : (d.icon || 'lock'))),
        K.h('div', { class: 'vw-ach__body' }, K.h('h3', { class: 'vw-ach__name vw-display', text: d.name }), K.h('p', { class: 'vw-ach__desc', text: d.desc }),
          pr && !ok ? K.progress({ value: n, max: target, thin: false, tone: 'sky', label: T.progress(n, target), aria: d.name }) : null,
          ok ? K.h('div', { class: 'vw-chips' }, K.chip(r.at ? T.when(dateStr(r.at)) : T0.common.unlocked, { variant: 'olive', icon: 'check' })) : null));
      return card;
    }));
  }
  const statsBtn = K.button(T.statsLink, { icon: 'star', variant: 'secondary', size: 'sm', id: 'ach-stats', onClick: () => ctx.nav.goto('stats') });
  const frame = K.pageFrame({ id: 'ach', title: T.title, sub: T.sub, onBack: () => ctx.nav.back(), actions: [statsBtn] });
  frame.content.appendChild(K.h('div', { class: 'vw-col' }, K.tablet(T.of(got, total), K.h('div', { class: 'vw-col' }, meter, seg), { id: 'ach-summary', icon: 'trophy', tight: true }), grid));
  frame.mount(root);
  paint();
  K.enter(Array.from(frame.content.querySelectorAll('.vw-tablet')), 'pop', 0);
  cleanups.push(frame.destroy);
  return K.withExit(root, { destroy() { cleanups.forEach((f) => f()); }, onBack() { return K.hasModal(); } });
}
