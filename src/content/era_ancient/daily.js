// Daily Skirmish content (spec §14, UI19, owner: CAMPAIGN). PURE: the plan of a day is a function of its date key and the content lists, nothing else
// (no Date.now, no Math.random): the same key on any machine gives the same arena, factions, enemy style, twist mutator and seed.
// The UI plan (ui/screens/_daily_plan.js, UI-owned) is the screen's own copy of the same algorithm; tests/campaign/daily.test.mjs proves the two agree
// for hundreds of dates, so the screen and the sim-side content can never drift apart.
//
//   dailyKey(date)               -> 'YYYY-MM-DD' of the LOCAL calendar day of a Date (the caller passes the Date; there is no default)
//   keyOfParts(y, m, d)          -> 'YYYY-MM-DD'      parseKey(key) -> {y, m, d} | null      addDays(key, n)
//   dailyPlan(key, content?)     -> {date, seed, arenaId, arenaName, size, arenaSeed, factionA, factionB, enemyStyle, budget, difficulty, mutator}
//   dailySetup(plan)             -> the Setup fragment Game.newSetup('daily', ...) takes (arena, rules, armies)
//   dailyEnemy(plan, defs?)      -> {groups, cost}   the enemy army of the day (generateArmy with the plan's seed: identical everywhere)
//   resultString(plan, r, names) / streakOf(history, today)
//   dailyStars(r)                -> 0..3 (ui.md 4a.1: 1 win, 2 win with >= 50% of the army alive by count, 3 win with >= 75% alive)
//   recordDailyRun(prev, rec)    -> {state:{last, streak, best, history}, counted}   (first run of a date counts, later ones are practice; history capped at 60)
import { ARENAS } from './arenas.js';
import { FACTIONS } from './stats.js';
import { MUTATORS } from '../../sim/mutators.js';
import { generateArmy } from '../../sim/armygen.js';
import { buildSimDefs } from '../../sim/defs.js';

export const STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];
export const DAILY_BUDGET = 3000;
const SKIP_ARENAS = new Set(['arenalab', 'random']);
const pad2 = (n) => String(n).padStart(2, '0');

export function keyOfParts(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
/** The local calendar day of `date` (a Date). Throws without one: pure code never reads the clock. */
export function dailyKey(date) {
  if (!date || typeof date.getFullYear !== 'function' || Number.isNaN(date.getTime())) throw new Error('dailyKey needs a valid Date');
  return keyOfParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
export function parseKey(key) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key)); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
export function addDays(key, n) { const p = parseKey(key); if (!p) return null; const x = new Date(Date.UTC(p.y, p.m - 1, p.d + n)); return keyOfParts(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }
export const seedOf = (key) => Number(String(key).replace(/-/g, ''));

/** mulberry32 on the seed (platform independent integer maths only). */
function rng(seed) { let m = seed >>> 0; m = Math.imul(m ^ (m >>> 16), 0x85ebca6b); m = Math.imul(m ^ (m >>> 13), 0xc2b2ae35); m ^= m >>> 16; let a = m >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DEFAULT_CONTENT = { arenas: ARENAS, mutators: MUTATORS, factions: FACTIONS };

/** The day's plan. `content` = {arenas:[{id,name,size}], mutators:[{id}], factions:{id:{name}}} (ctx.content shape); defaults to the shipped lists. */
export function dailyPlan(key, content) {
  const c = content || DEFAULT_CONTENT;
  const seed = seedOf(key);
  const r = rng(seed);
  const arenas = (c.arenas || []).filter((a) => a && !SKIP_ARENAS.has(a.id));
  const a = arenas.length ? arenas[Math.floor(r() * arenas.length)] : { id: 'marathon', name: 'Marathon Plain', size: 'medium', seed };
  const fids = c.factions && Object.keys(c.factions).length ? Object.keys(c.factions) : Object.keys(FACTIONS);
  const fa = fids[Math.floor(r() * fids.length)];
  let fb = fids[Math.floor(r() * fids.length)];
  if (fb === fa) fb = fids[(fids.indexOf(fa) + 1 + Math.floor(r() * (fids.length - 1))) % fids.length];
  const style = STYLES[Math.floor(r() * STYLES.length)];
  const muts = (c.mutators || []).map((m) => m.id).filter(Boolean);
  const twist = r() < 0.67 && muts.length ? muts[Math.floor(r() * muts.length)] : null;
  return { date: key, seed, arenaId: a.id, arenaName: a.name || a.id, size: a.size || 'medium', arenaSeed: (seed % 100000) + 1, factionA: fa, factionB: fb, enemyStyle: style, budget: DAILY_BUDGET, difficulty: 'normal', mutator: twist };
}

/** The fragment of Game.newSetup('daily', preset) the Daily screen builds from a plan (kept here so the sim-side tests exercise the same shape). */
export function dailySetup(plan) {
  return {
    arena: { presetId: plan.arenaId, size: plan.size, seed: plan.arenaSeed },
    rules: { budget: plan.budget, difficulty: plan.difficulty, mutators: plan.mutator ? [plan.mutator] : [], daily: plan.date },
    armies: { A: { faction: plan.factionA, placements: [], budget: plan.budget }, B: { faction: plan.factionB, placements: [], budget: plan.budget, style: plan.enemyStyle } },
  };
}

/** The enemy army of the day: same generator call everywhere, so every player fights the same composition. */
export function dailyEnemy(plan, defs) {
  const d = defs || buildSimDefs();
  const army = generateArmy({ faction: plan.factionB, budget: plan.budget, style: plan.enemyStyle, difficulty: plan.difficulty, seed: plan.seed, defs: d });
  return { groups: army.groups, cost: army.cost, count: army.total };
}

/** The copyable one-liner: plain ASCII so it survives any chat box. */
export function resultString(plan, r, names) {
  const nm = names || {};
  const A = (nm[plan.factionA] || plan.factionA), B = (nm[plan.factionB] || plan.factionB);
  const t = Math.max(0, Math.round(r.time || 0));
  const time = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  const verdict = r.winner === 0 ? 'WIN' : r.winner === 1 ? 'LOSS' : 'DRAW';
  const A0 = (r.teams && r.teams[0]) || {};
  const start = A0.startCount || ((A0.alive || 0) + (A0.dead || 0)) || 1;
  const left = Math.round(100 * (A0.alive || 0) / start);
  return 'VOXELWARS Daily ' + plan.date + ' | ' + plan.arenaName + ' | ' + A + ' vs ' + B + ' | ' + verdict + ' in ' + time + ' | ' + left + '% of the army left | seed ' + plan.seed;
}

/** Consecutive days ending at `today` (or yesterday) with a recorded game. history = [{date}] newest first. */
export function streakOf(history, today) {
  const set = new Set((history || []).map((h) => h.date));
  let k = set.has(today) ? today : addDays(today, -1), n = 0;
  while (k && set.has(k)) { n++; k = addDays(k, -1); }
  return n;
}

/** Stars of a Daily result (ResultsData shape: {winner, teams:[{alive, dead, startCount}]}): 1 win, 2 with >= 50% of the army alive, 3 with >= 75% alive. */
export function dailyStars(r) {
  if (!r || r.winner !== 0) return 0;
  const A0 = (r.teams && r.teams[0]) || {}, start = A0.startCount || ((A0.alive || 0) + (A0.dead || 0)) || 1, frac = (A0.alive || 0) / start;
  return frac >= 0.75 ? 3 : frac >= 0.5 ? 2 : 1;
}

export const DAILY_HISTORY_CAP = 60;
/**
 * Record a finished Daily. prev = {last, streak, best, history:[{date, result, time, left, string...}]} (newest first) or null; rec = {date, result:'win|loss|draw', ...}.
 * Only the first completed run of a date is recorded (`counted: false` = practice, nothing changes). A run on the day after the last recorded one extends the streak,
 * a gap resets it to 1; `best` keeps the longest streak ever. Pure: the caller passes the date, the function never reads the clock.
 */
export function recordDailyRun(prev, rec) {
  const st = { last: (prev && prev.last) || '', streak: (prev && prev.streak) | 0, best: (prev && prev.best) | 0, history: prev && Array.isArray(prev.history) ? prev.history.slice() : [] };
  if (st.history.some((h) => h.date === rec.date)) return { state: st, counted: false };
  const yesterday = addDays(rec.date, -1);
  st.streak = st.history.some((h) => h.date === yesterday) ? st.streak + 1 : 1;
  st.best = Math.max(st.best, st.streak); st.last = rec.date;
  st.history.unshift(rec); st.history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); st.history = st.history.slice(0, DAILY_HISTORY_CAP);
  return { state: st, counted: true };
}
