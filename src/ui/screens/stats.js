// Lifetime stats: the serious numbers and the absurd ones. Reads ctx.save.stats (totals by key; unknown keys are shown prettified).
import * as K from '../kit.js';
import { getT } from '../strings.js';
import { safe } from './_shared.js';

export const meta = { id: 'stats', layer: 'menu', music: 'menu', canvas: 'none' };

const SECONDS = ['playSeconds'];
const HEADLINE = ['battles', 'wins', 'kills', 'playSeconds'];
const humanize = (k) => { const t = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
// save/stats.js stores both spellings of three stats and keeps them equal (ALIASES): show each once, under the label we have
const ALIAS_TWINS = { unitsLost: 'deaths', zeusRagequits: 'zeusRageQuits', takeCommandKills: 'commandKills' };
function dur(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function mount(root, ctx, params) {
  K.init(ctx);
  const T0 = getT(ctx), T = T0.stats;
  const cleanups = [];
  const tot = safe(() => ctx.save.stats.get(), {}) || safe(() => ctx.save.stats.totals, {}) || {};
  const label = (k) => T.labels[k] || humanize(k);
  const val = (k, v) => (SECONDS.indexOf(k) >= 0 ? dur(v) : K.fmtNum(v));
  const keys = Object.keys(tot).filter((k) => typeof tot[k] === 'number' && !(ALIAS_TWINS[k] && typeof tot[ALIAS_TWINS[k]] === 'number'));
  const g = (k) => +tot[k] || 0;
  const tile = (name, value, sub) => K.h('div', { class: 'vw-statile' }, K.h('div', { class: 'vw-statile__v vw-display', text: value }), K.h('div', { class: 'vw-statile__l', text: name }), sub ? K.h('div', { class: 'vw-statile__s vw-micro', text: sub }) : null);
  const winRate = g('battles') ? Math.round((g('wins') / g('battles')) * 100) + '%' : '–';

  const headline = K.h('div', { class: 'vw-stats__tiles' },
    tile(label('battles'), val('battles', g('battles'))), tile(label('wins'), val('wins', g('wins')), winRate + ' win rate'), tile(label('kills'), val('kills', g('kills'))), tile(label('playSeconds'), val('playSeconds', g('playSeconds'))));

  const seriousKeys = keys.filter((k) => HEADLINE.indexOf(k) < 0);
  const table = K.h('dl', { class: 'vw-stats__list' }, ...seriousKeys.flatMap((k) => [K.h('dt', { text: label(k) }), K.h('dd', { class: 'vw-nums', text: val(k, tot[k]) })]));

  // computed silliness
  const placed = g('unitsPlaced'), kills = g('kills'), spent = g('drachmaeSpent');
  const absurd = [
    [T.absurdTitles.cubes, K.fmtNum(kills * 31 + g('deaths') * 27), 'give or take a helmet'],
    [T.absurdTitles.laps, (placed * 0.0024).toFixed(1), `if every soldier walked 100 m to the front`],
    [T.absurdTitles.spears, K.fmtNum(Math.round(placed * 0.62)), 'many of them for decoration'],
    [T.absurdTitles.napTime, (placed * 9 / 3600).toFixed(1) + ' h', 'standing very still, very bravely'],
    ['Drachmae per defeated soldier', kills ? K.fmtNum(Math.round(spent / kills)) : '–', 'inflation applies to the afterlife too'],
    ['Shield blocks per battle', g('battles') ? (g('shieldBlocks') / g('battles')).toFixed(1) : '–', 'the shields are doing their best'],
    ['Times the goat was the real hero', K.fmtNum(g('goatsSaved') + 1), 'always at least one'],
  ];
  const absurdEl = K.h('div', { class: 'vw-stats__absurd' }, ...absurd.map(([n, v, s]) => K.h('div', { class: 'vw-ab' }, K.h('div', { class: 'vw-ab__v vw-display', text: v }), K.h('div', { class: 'vw-ab__n', text: n }), K.h('div', { class: 'vw-ab__s vw-small vw-dim', text: s }))));

  // hall of fame from the nested maps (byDef: {id:{spawned,kills,deaths}}, arenasPlayed: {arenaId:n}); both are optional
  const nameOfUnit = (id) => safe(() => ctx.content.units[id].name, id);
  const nameOfArena = (id) => safe(() => ctx.content.arenas.find((a) => a.id === id).name, id);
  const byDef = tot.byDef && typeof tot.byDef === 'object' ? tot.byDef : {};
  const topUnits = Object.keys(byDef).map((id) => ({ id, k: +(byDef[id] || {}).kills || 0, s: +(byDef[id] || {}).spawned || 0 })).filter((x) => x.k > 0).sort((a, b) => b.k - a.k).slice(0, 5);
  const ap = tot.arenasPlayed && typeof tot.arenasPlayed === 'object' ? tot.arenasPlayed : {};
  const topArenas = Object.keys(ap).map((id) => ({ id, n: +ap[id] || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const fameBody = (topUnits.length || topArenas.length)
    ? K.h('div', { class: 'vw-col' },
      topUnits.length ? K.h('div', { class: 'vw-label', text: T.topUnits }) : null,
      ...topUnits.map((x) => K.statBar(nameOfUnit(x.id), x.k, topUnits[0].k, { tone: 'olive', text: `${K.fmtNum(x.k)} ${T.kills}` })),
      topArenas.length ? K.h('div', { class: 'vw-label', text: T.topArenas }) : null,
      ...topArenas.map((x) => K.statBar(nameOfArena(x.id), x.n, topArenas[0].n, { tone: 'sky', text: T.battlesN(x.n) })))
    : null;
  const empty = !keys.length || !g('battles');
  const frame = K.pageFrame({ id: 'st', title: T.title, sub: T.sub, onBack: () => ctx.nav.back() });
  if (empty && !keys.length) frame.content.appendChild(K.tablet(T.title, K.emptyState({ icon: 'target', title: T.emptyTitle || T.title, text: T.empty }), { id: 'st-empty' }));
  else frame.content.appendChild(K.h('div', { class: 'vw-col' }, headline, K.h('div', { class: 'vw-stats__cols' }, K.h('div', { class: 'vw-col' }, K.tablet(T.serious, table, { id: 'st-serious', icon: 'list' }), fameBody ? K.tablet(T.fame, fameBody, { id: 'st-fame', icon: 'trophy' }) : null), K.tablet(T.absurd, absurdEl, { id: 'st-absurd', icon: 'dice' }))));
  frame.mount(root);
  K.enter(Array.from(frame.content.querySelectorAll('.vw-tablet, .vw-statile')), 'pop', 0);
  cleanups.push(frame.destroy);
  return K.withExit(root, { destroy() { cleanups.forEach((f) => f()); }, onBack() { return K.hasModal(); } });
}
