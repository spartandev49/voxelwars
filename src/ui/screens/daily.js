// daily.js: the Daily Skirmish screen. Today's seeded setup (arena, factions, enemy style, fixed 3,000 dr budget, optional twist mutator) as a plain
// summary, one big Play button, the local history (last 14 days, streak) and a copyable result string. dailyPlan() is a pure function of the date
// (screens/_daily_plan.js, unit tested). dailyResultPanel() / recordDaily() are used by the results overlay when ResultsData.daily is present.
import * as K from '../kit.js';
import { setThumb } from './_shared.js';
import { h, disposer, fmtInt, fmtTime } from '../hud/_dom.js';
import { icon } from '../hud/_icons.js';
import { mutatorBadge } from '../hud/mutators.js';
import { dailyInfo, writeKey } from '../hud/_progress.js';
import { dailyPlan, dateKey, resultString, streakOf, DAILY_BUDGET } from './_daily_plan.js';

export const meta = { id: 'daily', layer: 'menu', music: 'menu', canvas: 'none' };

const factionName = (ctx, id) => { const f = ctx.content && ctx.content.factions && ctx.content.factions[id]; return (f && f.name) || id; };
export function planFor(ctx, key) { return dailyPlan(key || dateKey(), { arenas: ctx.content && ctx.content.arenas, mutators: ctx.content && ctx.content.mutators, factions: ctx.content && ctx.content.factions }); }
const names = (ctx) => { const o = {}; const f = (ctx.content && ctx.content.factions) || {}; for (const k of Object.keys(f)) o[k] = f[k].name || k; return o; };

/** Store today's result once (first completed attempt of the day counts; later ones are practice). Returns the record or null. */
export function recordDaily(ctx, r) {
  const plan = planFor(ctx, (r.daily && r.daily.date) || dateKey());
  const info = dailyInfo(ctx);
  if (info.history.some((x) => x.date === plan.date)) return null;
  const str = (r.daily && r.daily.resultString) || resultString(plan, r, names(ctx));
  const A0 = (r.teams && r.teams[0]) || {};
  const start = A0.startCount || ((A0.alive || 0) + (A0.dead || 0)) || 1;
  const rec = { date: plan.date, result: r.winner === 0 ? 'win' : r.winner === 1 ? 'loss' : 'draw', time: Math.round(r.time || 0), left: Math.round(100 * (A0.alive || 0) / start), seed: plan.seed, arena: plan.arenaName, string: str };
  const history = [rec].concat(info.history).slice(0, 14);
  writeKey(ctx, 'daily', { last: plan.date, streak: streakOf(history, plan.date), history });
  return rec;
}

export function dailyResultPanel(ctx, r) {
  const plan = planFor(ctx, (r.daily && r.daily.date) || dateKey());
  const str = (r.daily && r.daily.resultString) || resultString(plan, r, names(ctx));
  let rec = null; try { rec = recordDaily(ctx, r); } catch (e) { rec = null; }
  const box = h('code', { class: 'bs-daily-string', id: 'daily-string', tabindex: '0', text: str });
  const copy = K.button('Copy result', { variant: 'primary', icon: 'copy', id: 'daily-copy', onClick: () => K.copyText(str, { title: 'Your daily result', done: 'Copied. Gloat modestly.' }) });
  const body = h('div', { class: 'bs-daily-res' }, h('p', { class: 'bs-daily-note', text: rec ? 'Counted for ' + plan.date + '. Come back tomorrow for a different battlefield.' : 'This one is practice: today’s first attempt already counted.' }), box, copy);
  return K.tablet('Daily Skirmish', body, { variant: 'glass', icon: 'calendar', tight: true, class: 'bs-res-tab bs-daily-panel', sub: plan.date });
}

export function mount(root, ctx) {
  try { K.init(ctx); } catch (e) { /* kit optional in tools */ }
  const d = disposer();
  root.classList.add('bs', 'bs-daily');
  const today = dateKey();
  const plan = planFor(ctx, today);
  const info = dailyInfo(ctx);
  const done = info.history.find((x) => x.date === today) || null;
  const frame = K.pageFrame({ title: 'Daily Skirmish', sub: 'Same battle for everyone today. Different tomorrow.', onBack: () => ctx.nav.back(), id: 'daily-frame' });
  frame.mount(root);

  // arenaThumb() returns a Promise<dataURL>: setThumb keeps the placeholder until it resolves (never assign the raw value to img.src).
  const thumb = h('img', { class: 'bs-daily-thumb vw-hide', alt: '', width: 192, height: 108 }), thumbPh = h('div', { class: 'vw-thumb-ph vw-hide', 'aria-hidden': 'true', style: { maxWidth: '22rem' } });
  setThumb(thumb, ctx, plan.arenaId, thumbPh);
  const mut = plan.mutator ? mutatorBadge(ctx, plan.mutator, { large: true }) : null;
  const facA = factionName(ctx, plan.factionA), facB = factionName(ctx, plan.factionB);
  const summary = h('div', { class: 'bs-daily-summary' },
    h('div', { class: 'bs-daily-date' }, icon('calendar'), h('b', { text: today }), info.streak ? K.chip('Streak: ' + (done ? info.streak : streakOf(info.history, today)) + ' day' + (info.streak === 1 ? '' : 's'), { icon: 'fire', variant: 'lava' }) : null),
    thumb, thumbPh, h('h3', { class: 'bs-daily-arena', text: plan.arenaName }),
    h('div', { class: 'bs-daily-vs' }, h('span', { class: 'is-a', text: facA }), h('i', { text: 'vs' }), h('span', { class: 'is-b', text: facB })),
    h('div', { class: 'bs-inter-chips' }, K.chip(fmtInt(DAILY_BUDGET) + ' dr each', { icon: 'coin', variant: 'gold' }), K.chip('Enemy: ' + plan.enemyStyle, { icon: 'flag', variant: 'sky' }), K.chip('Citizen difficulty', { variant: 'ink' })),
    mut ? h('div', { class: 'bs-daily-twist' }, h('span', { text: 'Today’s twist' }), mut) : h('p', { class: 'bs-daily-twist-none', text: 'No twist today. Pure, boring physics.' }));
  const play = K.button(done ? 'Fight again (practice)' : 'Fight today’s battle', { variant: 'primary', size: 'xl', icon: 'play', block: true, id: 'daily-play', onClick: async () => {
    const setup = ctx.game.newSetup('daily', { arena: { presetId: plan.arenaId, size: plan.size, seed: plan.arenaSeed }, rules: { budget: plan.budget, difficulty: plan.difficulty, mutators: plan.mutator ? [plan.mutator] : [], daily: plan.date }, armies: { A: { faction: plan.factionA, placements: [], budget: plan.budget }, B: { faction: plan.factionB, placements: [], budget: plan.budget, style: plan.enemyStyle } } });
    play.setDisabled(true);
    try { await ctx.game.begin(setup); } finally { play.setDisabled(false); }
  } });
  const today1 = K.tablet('Today’s battle', h('div', { class: 'vw-col' }, summary, done ? h('p', { class: 'bs-daily-done', text: 'Played today: ' + done.result.toUpperCase() + ' in ' + fmtTime(done.time) + ', ' + done.left + '% left.' }) : null, play), { variant: 'glass', icon: 'calendar', id: 'daily-today' });

  const hist = info.history.length
    ? h('ul', { class: 'bs-daily-hist' }, info.history.map((x) => h('li', { class: 'is-' + x.result }, h('b', { class: 'bs-daily-hd', text: x.date }), h('span', { class: 'bs-daily-ha', text: x.arena || '' }), K.chip(x.result.toUpperCase(), { variant: x.result === 'win' ? 'olive' : x.result === 'loss' ? 'danger' : 'ink' }), h('span', { class: 'bs-daily-ht', text: fmtTime(x.time) + ' · ' + x.left + '%' }),
      K.iconButton('copy', 'Copy result for ' + x.date, { variant: 'ghost', size: 'sm', onClick: () => K.copyText(x.string || '', { title: 'Result for ' + x.date, done: 'Copied.' }) }))))
    : K.emptyState({ icon: 'calendar', title: 'No history yet', text: 'Your first daily battle starts the streak. The streak is imaginary but motivating.' });
  const histTab = K.tablet('History', hist, { variant: 'glass', icon: 'scroll', id: 'daily-history', sub: 'last 14 days' });
  frame.content.appendChild(h('div', { class: 'bs-daily-grid' }, today1, histTab));
  K.enter(today1, 'left', 0); K.enter(histTab, 'right', 1);
  return { onBack() { ctx.nav.back(); return true; }, destroy() { d.run(); frame.destroy(); } };
}
