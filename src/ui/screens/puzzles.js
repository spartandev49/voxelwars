// puzzles.js: the Puzzle Challenges screen (spec/ui.md 4a.2, spec/world.md 6a). Six cards (3x2 on desktop, 2x3 on tablets, one column on phones): number + title,
// arena thumbnail, the goal line, Budget / Par chips, the roster the puzzle allows, three star slots and Play. Selecting a card opens a side panel (a row under the
// card on narrow screens) with the three star conditions, a hint behind "Need a hint?", the best result and "Reset best". Play opens the briefing overlay
// (params.puzzle) which deploys into placement. Data: ctx.content.puzzles (content/era_ancient/puzzles.js); progress: ctx.save.progress ('puzzles' map
// {id: {stars, spent, time}}, with the shared 'stars' map as a fallback). A puzzle whose data fails validation shows "re-chiselled" and a disabled Play;
// a browser that blocks storage shows "Not saving". Every card works without a thumbnail, hints or saved progress.
import * as K from '../kit.js';
import { setThumb, safe } from './_shared.js';
import { h, disposer, fmtInt, fmtTime, unitName, unitRole, ROLE_ICON } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { readKey, writeKey, starsMap } from '../hud/_progress.js';
import { getTB } from '../hud/_strings.js';

export const meta = { id: 'puzzles', layer: 'menu', music: 'menu', canvas: 'none' };

const TX = {
  title: 'Puzzles', sub: 'Six small battles. Each one teaches a counter-pick.', openNote: 'All six are open from the start. They are lessons, not gates.',
  stars: (n, max) => n + ' / ' + max + ' stars', free: 'Retries are free', notSaving: 'Not saving', notSavingTip: 'This browser blocks storage, so puzzle results will be forgotten when you close the tab.',
  budget: (n) => 'Budget ' + fmtInt(n), par: (n) => 'Par ' + fmtInt(n), enemy: (n) => n + ' enemies', play: 'Play', replay: 'Play again',
  broken: 'This puzzle is being re-chiselled', brokenSub: 'Try again after the next update.', empty: 'No puzzles found', emptySub: 'The puzzle master is on a coffee break. Try again in a moment.', back: 'Back',
  pick: 'Pick a puzzle to see its stars, hint and your best.', hint: 'Need a hint?', hideHint: 'Hide the hint', stars3: 'Stars', best: 'Your best', untried: 'Not tried yet. The enemy is waiting, politely.',
  bestLine: (stars, spent, time) => stars + (stars === 1 ? ' star' : ' stars') + (spent ? ' · ' + fmtInt(spent) + ' dr spent' : '') + (time ? ' · ' + fmtTime(time) : ''),
  reset: 'Reset best', resetTitle: 'Reset this best?', resetText: 'Your stars for this puzzle go back to zero. The puzzle itself is unharmed.', resetYes: 'Reset it', resetDone: 'Best cleared. A fresh start.',
  roster: 'Your roster', rosterFree: (n) => n + ' (free)', goal: 'Goal', limit: (s) => 'Time limit ' + fmtTime(s), noPowers: 'No god powers',
  cardAria: (i, t, n) => 'Puzzle ' + i + ': ' + t + ', ' + n + ' of 3 stars',
};
const GOAL_TEXT = { eliminate: 'Defeat the enemy army', destroy: 'Destroy the target', protect_vip: 'Get the VIP across', kill_general: 'Defeat their general', hold_hill: 'Hold the hill' };
export const GOAL_ICON = { eliminate: 'skull', destroy: 'tower', protect_vip: 'goat', kill_general: 'crown', hold_hill: 'flag' };

/** One puzzle def (spec/world.md 6a) -> the flat view this screen needs. `ok` is false when the data cannot be played (shown as "re-chiselled"). */
export function normPuzzle(raw, i, ctx) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const map = safe(() => ctx.content.humor.puzzles, null);
  const tx = (map && raw.id && map[raw.id]) || {};
  const pl = raw.player || {};
  const roster = Array.isArray(raw.roster) ? raw.roster : Array.isArray(pl.roster) ? pl.roster : [];
  const budget = +(raw.budget || pl.budget) || 0;
  const goal = raw.goal || {};
  const arena = raw.arena || {};
  const stars = Array.isArray(raw.stars) ? raw.stars.slice(0, 3).map((s, k) => ({ id: (s && s.id) || 's' + k, text: (tx.stars && tx.stars[k]) || (s && s.text) || '' })) : [];
  while (stars.length < 3) stars.push({ id: 's' + stars.length, text: ['Win', 'Win while spending the par budget or less', 'The puzzle bonus'][stars.length] });
  const enemy = raw.enemy || {};
  const title = tx.title || raw.title || '';
  const type = goal.type || 'eliminate';
  return {
    id: raw.id || 'puzzle_' + i, index: raw.index != null ? raw.index : i, ok: !!(raw.id && title && roster.length && budget > 0 && (arena.recipe || arena.presetId)),
    title: title || String(raw.id || 'Puzzle ' + (i + 1)), blurb: tx.blurb || raw.blurb || '', hint: tx.hint || raw.hint || '', goalType: type, goalText: tx.goalText || raw.goalText || GOAL_TEXT[type] || GOAL_TEXT.eliminate,
    arenaId: arena.recipe || arena.presetId || '', arena, roster, budget, par: +raw.par || 0, timeLimit: +raw.timeLimit || 0, stars, godPowers: !!raw.godPowers,
    faction: pl.faction || raw.playerFaction || 'hellenes', enemyFaction: enemy.faction || raw.enemyFaction || 'persians', enemyCount: Array.isArray(enemy.placements) ? enemy.placements.length : 0,
    fixed: Array.isArray(raw.fixed) ? raw.fixed : [], raw,
  };
}
export const puzzlesOf = (ctx) => { const l = safe(() => ctx.content.puzzles, []); return (Array.isArray(l) ? l : []).map((p, i) => normPuzzle(p, i, ctx)); };

/** Best results: {id: {stars, spent, time, tried}}. Reads the 'puzzles' map of vw.progress, falling back to the shared stars map. */
export function puzzleBest(ctx) {
  const pz = readKey(ctx, 'puzzles', null);
  const st = starsMap(ctx);
  const map = pz && typeof pz === 'object' && !Array.isArray(pz) ? pz : {};
  return (id) => {
    const r = map[id] && typeof map[id] === 'object' ? map[id] : null;
    const n = Math.max(0, Math.min(3, ((r && r.stars) | 0) || (st[id] | 0)));
    return { stars: n, spent: r && r.spent ? r.spent | 0 : 0, time: r && r.time ? +r.time : 0, tried: n > 0 || !!r };
  };
}
export function resetPuzzleBest(ctx, id) {
  const pz = Object.assign({}, readKey(ctx, 'puzzles', null) || {}); delete pz[id];
  const st = Object.assign({}, starsMap(ctx)); delete st[id];
  return writeKey(ctx, 'puzzles', pz) && writeKey(ctx, 'stars', st);
}

/** A strip of the unit types a puzzle allows (icon + name). `fixed` units (a free VIP) are marked "(free)". */
export function rosterStrip(ctx, p, TXT) {
  const items = p.roster.map((id) => ({ id, free: false })).concat(p.fixed.map((f) => ({ id: f.defId, free: true, name: f.name })));
  return h('ul', { class: 'bs-pz-roster', 'aria-label': (TXT || TX).roster }, items.map((u) => {
    const name = u.free ? (u.name ? u.name : unitName(ctx, u.id)) : unitName(ctx, u.id);
    return h('li', { class: 'bs-pz-unit' + (u.free ? ' is-free' : ''), title: u.free ? (TXT || TX).rosterFree(name) : name }, icon(ROLE_ICON[unitRole(ctx, u.id)] || 'sword'), h('span', { text: name }));
  }));
}

export function mount(root, ctx) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  const T = getTB(ctx, 'puzzles', TX);
  root.classList.add('bs', 'bs-puzzles');
  const puzzles = puzzlesOf(ctx);
  let best = puzzleBest(ctx);
  const back = () => { if (ctx.nav.back) ctx.nav.back(); else ctx.nav.goto('campaign'); };
  const frame = K.pageFrame({ title: T.title, sub: T.sub, onBack: back, id: 'pz-frame' });
  frame.mount(root);
  d.add(() => frame.destroy());

  if (!puzzles.length) {
    frame.content.append(K.emptyState({ icon: 'cube', title: T.empty, text: T.emptySub, action: { label: T.back, icon: 'back', onClick: back, id: 'pz-empty-back' } }));
    return { onBack() { back(); return true; }, destroy() { d.run(); } };
  }

  // ------------------------------------------------------------ summary row
  const totalSlot = h('span', { class: 'bs-pz-total' });
  const status = safe(() => ctx.save.status(), 'ok');
  const row = h('div', { class: 'bs-pz-summary' }, totalSlot, K.chip(T.free, { icon: 'refresh', variant: 'olive' }),
    status === 'memory' ? K.chip(T.notSaving, { icon: 'warning', variant: 'gold', title: T.notSavingTip, id: 'pz-notsaving' }) : null, h('p', { class: 'bs-pz-note', text: T.openNote }));
  const paintTotal = () => { const n = puzzles.reduce((s, p) => s + (p.ok ? best(p.id).stars : 0), 0); totalSlot.replaceChildren(K.chip(T.stars(n, puzzles.length * 3), { icon: 'star', variant: 'gold', id: 'pz-total' })); };

  // ------------------------------------------------------------ cards
  const grid = h('div', { class: 'bs-pz-grid', role: 'list', 'aria-label': T.title });
  const side = h('aside', { class: 'bs-pz-side', 'aria-label': 'Puzzle details' });
  const cards = new Map();
  let selected = null;

  const play = (p) => {
    if (!p.ok) return;
    if (ctx.nav.overlay) ctx.nav.overlay('briefing', { puzzle: p.id }); else ctx.nav.goto('briefing', { puzzle: p.id });
  };
  const starSlots = (n) => h('span', { class: 'bs-pz-stars', 'aria-hidden': 'true' }, [0, 1, 2].map((k) => icon(k < n ? 'star' : 'starO', 'bs-pz-star' + (k < n ? ' is-on' : ''))));

  function buildCard(p, i) {
    const b = best(p.id);
    const pick = h('button', { class: 'bs-pz-pick', type: 'button', 'aria-pressed': 'false', 'aria-label': p.ok ? T.cardAria(i + 1, p.title, b.stars) : (i + 1) + '. ' + p.title + '. ' + T.broken, id: 'pz-pick-' + p.id },
      h('b', { class: 'bs-pz-n', text: String(i + 1) }), h('span', { class: 'bs-pz-title', text: p.title }));
    pick.addEventListener('click', () => select(p.id));
    const thumb = h('img', { class: 'bs-pz-thumb vw-hide', alt: '', width: 192, height: 108 }), ph = h('div', { class: 'vw-thumb-ph', 'aria-hidden': 'true' });
    if (p.ok && p.arenaId) setThumb(thumb, ctx, p.arenaId, ph);
    const playBtn = K.button(b.stars ? T.replay : T.play, { variant: 'primary', size: 'sm', icon: 'play', id: 'pz-play-' + p.id, disabled: !p.ok, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); play(p); } });
    const el = h('article', { class: 'bs-pz is-' + (p.ok ? (b.stars >= 3 ? 'done' : 'open') : 'broken'), role: 'listitem', 'data-id': p.id, style: { '--i': i } },
      pick,
      h('div', { class: 'bs-pz-media' }, thumb, ph),
      p.ok ? h('p', { class: 'bs-pz-goal' }, icon(GOAL_ICON[p.goalType] || 'flag'), h('span', { text: p.goalText })) : h('p', { class: 'bs-pz-goal is-broken' }, icon('lock'), h('span', { text: T.broken })),
      p.ok ? h('div', { class: 'bs-pz-chips' }, K.chip(T.budget(p.budget), { icon: 'coin', variant: 'gold' }), p.par ? K.chip(T.par(p.par), { icon: 'target', variant: 'sky' }) : null) : h('p', { class: 'bs-pz-sub', text: T.brokenSub }),
      p.ok ? rosterStrip(ctx, p, T) : null,
      h('div', { class: 'bs-pz-foot' }, starSlots(b.stars), playBtn));
    el.addEventListener('click', (e) => { if (!e.target.closest('button')) select(p.id); });
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') el.classList.add('is-hot'); });
    el.addEventListener('pointerleave', () => el.classList.remove('is-hot'));
    cards.set(p.id, { el, pick, p, foot: el.querySelector('.bs-pz-foot') });
    return el;
  }
  puzzles.forEach((p, i) => grid.appendChild(buildCard(p, i)));

  // ------------------------------------------------------------ side panel
  const panel = K.tablet(T.title, h('div', { class: 'bs-pz-panel-body' }), { variant: 'glass', icon: 'scroll', id: 'pz-panel', class: 'bs-pz-panel' });
  const panelBody = panel.querySelector('.bs-pz-panel-body') || panel;
  let hintOpen = false;
  function paintPanel() {
    const c = selected && cards.get(selected);
    if (!c) { panel.setTitle && panel.setTitle(T.title); panelBody.replaceChildren(h('p', { class: 'bs-pz-pick-hint', text: T.pick })); return; }
    const p = c.p, b = best(p.id);
    panel.setTitle && panel.setTitle(p.title);
    const hintP = h('p', { class: 'bs-pz-hint', id: 'pz-hint', hidden: !hintOpen, text: p.hint || '' });
    const hintBtn = K.button(hintOpen ? T.hideHint : T.hint, { variant: 'secondary', size: 'sm', icon: 'help', id: 'pz-hint-btn', disabled: !p.hint, onClick: () => { hintOpen = !hintOpen; hintBtn.setLabel(hintOpen ? T.hideHint : T.hint); hintBtn.setAttribute('aria-expanded', String(hintOpen)); hintP.hidden = !hintOpen; } });
    hintBtn.setAttribute('aria-expanded', String(hintOpen)); hintBtn.setAttribute('aria-controls', 'pz-hint');
    const resetBtn = K.button(T.reset, { variant: 'ghost', size: 'sm', icon: 'trash', id: 'pz-reset', disabled: !b.tried, onClick: async () => {
      const yes = await K.ask({ title: T.resetTitle, text: T.resetText, yes: T.resetYes, danger: true });
      if (!yes) return;
      resetPuzzleBest(ctx, p.id); best = puzzleBest(ctx); refresh(); try { ctx.nav.toast && ctx.nav.toast(T.resetDone, { kind: 'info' }); } catch (e) { /* toast optional */ }
    } });
    const limit = p.timeLimit ? K.chip(T.limit(p.timeLimit), { icon: 'clock', variant: 'ink' }) : null;
    panelBody.replaceChildren(
      p.blurb ? h('p', { class: 'bs-pz-blurb', text: p.blurb }) : null,
      h('div', { class: 'bs-pz-goal is-panel' }, icon(GOAL_ICON[p.goalType] || 'flag'), h('div', {}, h('small', { text: T.goal }), h('b', { text: p.goalText }))),
      h('div', { class: 'bs-pz-chips' }, K.chip(T.budget(p.budget), { icon: 'coin', variant: 'gold' }), p.par ? K.chip(T.par(p.par), { icon: 'target', variant: 'sky' }) : null, p.enemyCount ? K.chip(T.enemy(p.enemyCount), { icon: 'skull', variant: 'crimson' }) : null, limit, p.godPowers ? null : K.chip(T.noPowers, { icon: 'bolt', variant: 'ink' })),
      h('h4', { class: 'bs-sub', text: T.stars3 }),
      h('ul', { class: 'bs-pz-stars-list', 'aria-label': T.stars3 }, p.stars.map((s, k) => h('li', { class: k < b.stars ? 'is-earned' : '' }, icon(k < b.stars ? 'star' : 'starO'), h('span', { text: s.text })))),
      h('h4', { class: 'bs-sub', text: T.best }),
      h('p', { class: 'bs-pz-best', id: 'pz-best', text: b.tried ? T.bestLine(b.stars, b.spent, b.time) : T.untried }),
      h('div', { class: 'bs-pz-panel-actions' }, hintBtn, resetBtn),
      hintP,
      p.ok ? h('div', { class: 'bs-pz-panel-play' }, K.button(b.stars ? T.replay : T.play, { variant: 'primary', icon: 'play', id: 'pz-panel-play', onClick: () => play(p) })) : null);
  }

  const wideMq = window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null;
  const isWide = () => !!(wideMq && wideMq.matches);
  function placePanel() {
    const c = selected && cards.get(selected);
    if (isWide()) { if (panel.parentNode !== side) side.appendChild(panel); return; }
    if (!c) { if (panel.parentNode) panel.remove(); return; }
    if (c.el.nextSibling !== panel) grid.insertBefore(panel, c.el.nextSibling);                 // narrow: a full-width row right under the selected card
  }
  function select(id) {
    if (!cards.has(id)) return;
    if (selected === id && !isWide()) { selected = null; hintOpen = false; for (const c of cards.values()) { c.el.classList.remove('is-selected'); c.pick.setAttribute('aria-pressed', 'false'); } paintPanel(); placePanel(); return; }
    if (selected !== id) hintOpen = false;
    selected = id;
    for (const [k, c] of cards) { const on = k === id; c.el.classList.toggle('is-selected', on); c.pick.setAttribute('aria-pressed', String(on)); }
    paintPanel(); placePanel();
    tick();
  }
  function tick() { try { ctx.audio && ctx.audio.play && ctx.audio.play('ui_tick', { vol: 0.5 }); } catch (e) { /* audio optional */ } }
  function refresh() {
    for (const [id, c] of cards) {
      const b = best(id);
      c.foot.replaceChildren(starSlots(b.stars), (() => { const btn = K.button(b.stars ? T.replay : T.play, { variant: 'primary', size: 'sm', icon: 'play', id: 'pz-play-' + id, disabled: !c.p.ok, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); play(c.p); } }); return btn; })());
      c.el.classList.toggle('is-done', c.p.ok && b.stars >= 3); c.el.classList.toggle('is-open', c.p.ok && b.stars < 3);
      c.pick.setAttribute('aria-label', c.p.ok ? T.cardAria(c.p.index + 1, c.p.title, b.stars) : c.pick.getAttribute('aria-label'));
    }
    paintTotal(); paintPanel();
  }

  const body = h('div', { class: 'bs-pz-body' }, grid, side);
  frame.content.append(row, body);
  K.roving(grid, { selector: '.bs-pz-pick', orientation: 'both' });
  paintTotal();
  const start = puzzles.find((p) => p.ok && best(p.id).stars < 3) || puzzles.find((p) => p.ok) || puzzles[0];
  if (isWide() && start) select(start.id); else { paintPanel(); }
  const onMq = () => { if (isWide() && !selected && start) select(start.id); else { paintPanel(); placePanel(); } };
  if (wideMq) { if (wideMq.addEventListener) { wideMq.addEventListener('change', onMq); d.add(() => wideMq.removeEventListener('change', onMq)); } }
  K.enter(Array.from(grid.children), 'pop', 0);

  return {
    onBack() { if (K.hasModal && K.hasModal()) return true; back(); return true; },
    onKey(e) { if (e.code === 'Enter' && document.activeElement === document.body && selected) { play(cards.get(selected).p); return true; } return false; },
    destroy() { d.run(); },
  };
}
