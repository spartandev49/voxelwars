// survival.js: Survival mode UI. Three views (params.view): 'setup' (arena, faction, difficulty, mutators, rules, local top-5), 'intermission'
// (between waves: wave name, reinforcement budget, a compact unit palette that drives game.tools.setBrush, "Send in wave N") and 'results'
// (score + leaderboard). survivalPanel() is also embedded by the results overlay; mountIntermission() can be embedded by the placement screen.
// Rules (spec/world.md section 7): start budget 6,000; waves every 40 s or when the field is clear; +1,600 + 240*n reinforcements; boss every 5th wave.
import * as K from '../kit.js';
import { h, disposer, sfx, fmtInt, ROLE_ICON, unitRole, unitName } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { survivalBoard } from '../hud/_progress.js';
import { mutatorPicker } from '../hud/_mutpicker.js';

export const meta = { id: 'survival', layer: 'menu', music: 'menu', canvas: 'none' };

export const SURVIVAL = { start: 6000, every: 40, bonusBase: 1600, bonusPer: 240, bossEvery: 5 };
const DIFFS = [['easy', 'Peasant Mode', 'They think slowly'], ['normal', 'Citizen', 'Fair fight'], ['hard', 'Consul', 'They plan, you panic']];
const RULES = [
  ['coin', 'Start budget: ' + fmtInt(SURVIVAL.start) + ' dr, then you earn your reinforcements.'],
  ['clock', 'A new wave every ' + SURVIVAL.every + ' s, or sooner when the field is clear.'],
  ['hammer', 'Between waves: +' + fmtInt(SURVIVAL.bonusBase) + ' dr plus ' + SURVIVAL.bonusPer + ' per wave, placed inside your zone.'],
  ['skull', 'Every 5th wave a boss turns up. Bring a plan, or a goat.'],
  ['trophy', 'Score = waves x 1000 + kills x 10 + value still standing.'],
];

function boardTable(ctx, board, mark) {
  if (!board.length) return K.emptyState({ icon: 'trophy', title: 'No survivors yet', text: 'The leaderboard is empty and suspiciously tidy. Be the first.' });
  const t = h('table', { class: 'bs-board' }, h('caption', { class: 'vw-sr', text: 'Local top five' }),
    h('thead', {}, h('tr', {}, ['#', 'Score', 'Waves', 'Arena', 'When'].map((x) => h('th', { scope: 'col', text: x })))),
    h('tbody', {}, board.slice(0, 5).map((e, i) => h('tr', { class: mark === i ? 'is-me' : '' }, h('td', { text: String(i + 1) }), h('td', { class: 'is-score', text: fmtInt(e.score) }), h('td', { text: String(e.waves) }), h('td', { class: 'is-arena', text: e.arena || '' }), h('td', { class: 'is-when', text: e.date || '' })))));
  return t;
}

/** Score card + leaderboard for a finished run. r.survival = {wave, waveName, score, kills, remainingCost, best, rank, board}. */
export function survivalPanel(ctx, r) {
  const s = r.survival || {};
  const newBest = s.best != null && s.score > s.best || s.rank === 1;
  const stat = (label, v, ic) => h('div', { class: 'bs-surv-stat' }, icon(ic), h('b', { text: v }), h('span', { text: label }));
  const top = h('div', { class: 'bs-surv-score' },
    h('div', { class: 'bs-surv-big' }, h('span', { class: 'bs-surv-label', text: 'Score' }), h('b', { text: fmtInt(s.score) }), newBest ? K.chip('New personal best', { icon: 'trophy', variant: 'gold' }) : (s.best ? K.chip('Best: ' + fmtInt(s.best), { variant: 'ink' }) : null)),
    h('div', { class: 'bs-surv-stats' }, stat('Waves survived', String(s.wave != null ? Math.max(0, s.wave - 1) : 0), 'flag'), stat('Kills', fmtInt(s.kills), 'skull'), stat('Value standing', fmtInt(s.remainingCost) + ' dr', 'coin')));
  const board = s.board && s.board.length ? s.board : survivalBoard(ctx).board;
  const body = h('div', { class: 'bs-surv-res' }, s.waveName ? h('p', { class: 'bs-surv-wave', text: 'Fell at ' + s.waveName }) : null, top, boardTable(ctx, board, s.rank ? s.rank - 1 : -1));
  return K.tablet('Survival', body, { variant: 'glass', icon: 'trophy', tight: true, class: 'bs-res-tab bs-surv-panel' });
}

/** The unit palette + budget + "send in the wave" bar. parent is any container; returns {update(), destroy()}. */
export function mountIntermission(parent, ctx, params) {
  const d = disposer();
  const p = params || {};
  const data = () => { try { const hd = ctx.game.hud(); return p.survival || (hd && hd.survival) || {}; } catch (e) { return p.survival || {}; } };
  const sv = data();
  const wave = sv.wave || 1;
  const bonus = sv.bonus != null ? sv.bonus : SURVIVAL.bonusBase + SURVIVAL.bonusPer * wave;
  const setup = ctx.game && ctx.game.setup;
  const faction = (setup && setup.armies && setup.armies.A && setup.armies.A.faction) || sv.faction || 'hellenes';
  const all = ctx.content && ctx.content.unitList ? ctx.content.unitList() : [];
  const roster = all.filter((u) => u && u.cost && (faction === 'mixed' || u.faction === faction) && u.role !== 'monster').sort((a, b) => a.cost - b.cost).slice(0, 26);

  const meter = K.progress({ value: 0, max: 1, tone: 'gold', label: '' });
  const budgetTx = h('span', { class: 'bs-inter-budget', text: '' });
  const nameEl = h('b', { class: 'bs-inter-name', text: sv.waveName || ('Wave ' + wave) });
  const next = h('span', { class: 'bs-inter-next', text: sv.nextName ? 'Next up: ' + sv.nextName : 'Next up: more of them' });
  const chips = h('div', { class: 'bs-inter-chips' }, sv.nextStyle ? K.chip(sv.nextStyle, { icon: 'flag', variant: 'sky' }) : null, sv.boss ? K.chip('Boss wave', { icon: 'skull', variant: 'danger' }) : null, K.chip('+' + fmtInt(bonus) + ' dr', { icon: 'coin', variant: 'gold' }));
  const top = h('div', { class: 'bs-inter-top bs-panel' }, h('div', { class: 'bs-inter-title' }, icon(sv.boss ? 'skull' : 'flag'), h('div', {}, h('span', { class: 'bs-inter-kicker', text: 'Intermission' }), nameEl, next)), chips, h('div', { class: 'bs-inter-meter' }, budgetTx, meter));

  let brush = 'block', defId = roster[0] ? roster[0].id : null, left = 0;
  const units = new Map();
  const pal = h('div', { class: 'bs-pal vw-scroll', role: 'listbox', 'aria-label': 'Reinforcements' });
  for (const u of roster) {
    const b = h('button', { class: 'bs-pal-unit', type: 'button', role: 'option', 'aria-selected': 'false', 'data-def': u.id, id: 'pal-' + u.id, 'data-tip': (u.text && u.text.blurb) || unitName(ctx, u.id), 'data-tip-pos': 'above' }, icon(ROLE_ICON[unitRole(ctx, u.id)] || 'sword'), h('span', { class: 'bs-pal-name', text: unitName(ctx, u.id) }), h('b', { class: 'bs-pal-cost', text: fmtInt(u.cost) }));
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') { sfx(ctx, 'ui_error', { vol: 0.5 }); return; }
      defId = u.id; paintSel(); sfx(ctx, 'ui_click', { vol: 0.5 }); push();
    });
    units.set(u.id, { b, u }); pal.appendChild(b);
  }
  function push() { try { ctx.game.tools.setBrush({ mode: brush, defId, team: 0, count: brush === 'single' ? 1 : 9 }); } catch (e) { /* not ready */ } }
  function paintSel() { units.forEach(({ b }, id) => b.setAttribute('aria-selected', String(id === defId))); }
  const seg = K.segmented({ label: 'Brush', value: brush, options: [{ value: 'single', label: 'One' }, { value: 'line', label: 'Line' }, { value: 'block', label: 'Block' }], onChange: (v) => { brush = v; push(); }, id: 'inter-brush' });
  const undo = K.button('Undo', { variant: 'secondary', size: 'sm', icon: 'undo', id: 'inter-undo', onClick: () => { try { ctx.game.tools.undo(); } catch (e) { /* not ready */ } } });
  const go = K.button('Send in wave ' + wave, { variant: 'primary', size: 'lg', icon: 'play', id: 'inter-go', hint: 'Space', onClick: () => { try { ctx.game.fight(); } catch (e) { /* not ready */ } if (ctx.nav.closeOverlay) ctx.nav.closeOverlay('survival'); } });
  const bar = h('div', { class: 'bs-inter-bar bs-panel' }, h('div', { class: 'bs-inter-tools' }, seg, undo), pal, go);
  const el = h('div', { class: 'bs-inter' }, top, bar);
  parent.appendChild(el);
  paintSel(); push();

  function update() {
    let b = null; try { b = ctx.game.info.budget(0); } catch (e) { b = null; }
    if (!b) return;
    left = b.left;
    meter.set(Math.max(0, b.cap - b.left), Math.round(b.spent) + ' / ' + fmtInt(b.cap) + ' dr placed');
    meter.setAttribute('aria-valuemax', String(b.cap || 1));
    meter.style.setProperty('--v', String(b.cap ? Math.min(1, b.spent / b.cap) : 0));
    budgetTx.textContent = fmtInt(left) + ' dr left to spend';
    units.forEach(({ b: btn, u }) => { const off = u.cost > left; btn.setAttribute('aria-disabled', off ? 'true' : 'false'); btn.classList.toggle('is-off', off); });
  }
  update();
  d.interval(update, 200);
  return { el, update, go, destroy() { d.run(); el.remove(); } };
}

/** The screen. params.view: 'setup' (default) | 'intermission' | 'results'. */
export function mount(root, ctx, params) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const p = params || {};
  const view = p.view || 'setup';
  const d = disposer();
  root.classList.add('bs', 'bs-survival', 'bs-surv-' + view);
  if (view === 'intermission') {
    root.style.pointerEvents = 'none';
    const inter = mountIntermission(root, ctx, p);
    return { inter, onKey(e) { if (e.code === 'Space') { inter.go.click(); return true; } return false; }, destroy() { d.run(); inter.destroy(); } };
  }
  if (view === 'results') {
    root.style.pointerEvents = 'auto';
    const r = p.results || (ctx.game && ctx.game.results ? ctx.game.results() : {});
    const frame = K.pageFrame({ title: 'Survival', sub: 'The run is over. The goat is proud.', onBack: () => ctx.nav.goto('title'), id: 'surv-res' });
    frame.mount(root);
    frame.content.append(survivalPanel(ctx, r), h('div', { class: 'bs-surv-actions' }, K.button('One more wave', { variant: 'primary', size: 'lg', icon: 'refresh', id: 'surv-again', onClick: () => ctx.game.rematch() }), K.button('Menu', { variant: 'ghost', icon: 'door', id: 'surv-menu', onClick: () => ctx.nav.goto('title') })));
    return { onBack() { ctx.nav.goto('title'); return true; }, destroy() { d.run(); frame.destroy(); } };
  }

  // ---- setup view
  const arenas = ((ctx.content && ctx.content.arenas) || []).filter((a) => a.id !== 'arenalab');
  const factions = (ctx.content && ctx.content.factions) || {};
  let arenaId = (arenas[0] && arenas[0].id) || 'marathon', faction = 'hellenes', diff = 'normal', mutators = [];
  const frame = K.pageFrame({ title: 'Survival', sub: 'How long can you hold? Waves keep coming. Budgets do not.', onBack: () => ctx.nav.back(), id: 'surv-setup' });
  frame.mount(root);

  const thumb = h('img', { class: 'bs-surv-thumb', alt: '', width: 192, height: 108 });
  const arenaName = h('h3', { class: 'bs-surv-arena-name' }), arenaBlurb = h('p', { class: 'bs-surv-arena-blurb' }), tactics = h('div', { class: 'bs-inter-chips' });
  const paintArena = () => {
    const a = arenas.find((x) => x.id === arenaId) || arenas[0] || {};
    let url = ''; try { url = ctx.content.arenaThumb ? ctx.content.arenaThumb(a.id) : ''; } catch (e) { url = ''; }
    if (url) { thumb.src = url; thumb.hidden = false; } else thumb.hidden = true;
    arenaName.textContent = a.name || a.id || ''; arenaBlurb.textContent = a.blurb || '';
    tactics.replaceChildren(...(a.tactics || []).slice(0, 4).map((t) => K.chip(t, { variant: 'sky' })));
  };
  const sel = K.select({ label: 'Arena', value: arenaId, options: arenas.map((a) => ({ value: a.id, label: a.name || a.id })), onChange: (v) => { arenaId = v; paintArena(); }, id: 'surv-arena' });
  const arenaTab = K.tablet('Arena', h('div', { class: 'bs-surv-arena' }, h('div', { class: 'bs-surv-arena-media' }, thumb), h('div', { class: 'bs-surv-arena-text' }, sel, arenaName, arenaBlurb, tactics)), { variant: 'glass', icon: 'map', id: 'surv-arena-tab' });
  paintArena();

  const facOptions = Object.keys(factions).map((id) => ({ value: id, label: factions[id].name || id })).concat([{ value: 'mixed', label: 'Mixed' }]);
  const facSeg = K.segmented({ label: 'Your faction', value: faction, options: facOptions, onChange: (v) => { faction = v; }, id: 'surv-faction' });
  const diffSeg = K.segmented({ label: 'Difficulty', value: diff, options: DIFFS.map(([v, l, t]) => ({ value: v, label: l, title: t })), onChange: (v) => { diff = v; }, id: 'surv-diff' });
  const mutPick = mutatorPicker(ctx, { selected: [], max: 2, onChange: (ids) => { mutators = ids; } });
  const setupTab = K.tablet('Your side', h('div', { class: 'vw-col' }, K.field('Faction', facSeg, { stack: true }), K.field('Difficulty', diffSeg, { stack: true }), K.field('Mutators', mutPick, { stack: true, info: 'Mutators change the rules for fun. Unlock them with campaign stars.' })), { variant: 'glass', icon: 'users', id: 'surv-side-tab' });

  const rules = K.tablet('How it works', h('ul', { class: 'bs-rules' }, RULES.map(([ic, t]) => h('li', {}, icon(ic), h('span', { text: t })))), { variant: 'glass', icon: 'scroll', id: 'surv-rules-tab' });
  const board = K.tablet('Local top 5', boardTable(ctx, survivalBoard(ctx).board, -1), { variant: 'glass', icon: 'trophy', id: 'surv-board-tab' });
  const start = K.button('Begin the siege', { variant: 'primary', size: 'xl', icon: 'play', block: true, id: 'surv-start', onClick: async () => {
    const setup = ctx.game.newSetup('survival', { arena: { presetId: arenaId, size: ((arenas.find((a) => a.id === arenaId) || {}).size) || 'medium', seed: ((arenas.find((a) => a.id === arenaId) || {}).seed) || 1 }, rules: { budget: SURVIVAL.start, difficulty: diff, mutators, survival: true }, armies: { A: { faction, placements: [], budget: SURVIVAL.start }, B: { faction: 'mixed', placements: [], budget: 0 } } });
    start.setDisabled(true);
    try { await ctx.game.begin(setup); } finally { start.setDisabled(false); }
  } });
  const grid = h('div', { class: 'bs-surv-grid' }, h('div', { class: 'bs-surv-col' }, arenaTab, setupTab), h('div', { class: 'bs-surv-col' }, rules, board, start));
  frame.content.appendChild(grid);
  K.enter(arenaTab, 'left', 0); K.enter(setupTab, 'left', 1); K.enter(rules, 'right', 1); K.enter(board, 'right', 2);
  return { onBack() { ctx.nav.back(); return true; }, destroy() { d.run(); frame.destroy(); } };
}
