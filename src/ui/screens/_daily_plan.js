// _daily_plan.js: the Daily Skirmish plan as a PURE function of the local date (no DOM, runs in Node for tests).
// Same date + same content lists => identical plan (UI19: deterministic per date). Seed = YYYYMMDD as a number (also what game.newSetup('daily') uses).
export const STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];
export const FACTION_IDS = ['hellenes', 'romans', 'egyptians', 'persians', 'carthage', 'barbarians', 'mythic'];
export const DAILY_BUDGET = 3000;
const SKIP_ARENAS = new Set(['arenalab', 'random']);

export function dateKey(d) {
  const x = d || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate());
}
export const seedOf = (key) => Number(String(key).replace(/-/g, ''));

/** mulberry32 on the seed: tiny, fast, platform independent. */
function rng(seed) { let m = seed >>> 0; m = Math.imul(m ^ (m >>> 16), 0x85ebca6b); m = Math.imul(m ^ (m >>> 13), 0xc2b2ae35); m ^= m >>> 16; let a = m >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * dailyPlan('2026-10-06', {arenas:[{id,name,size,seed,blurb}], mutators:[{id}], factions:{id:{name}}})
 * -> { date, seed, arenaId, arenaName, size, arenaSeed, factionA, factionB, enemyStyle, budget, difficulty, mutator|null }
 */
export function dailyPlan(key, content) {
  const c = content || {};
  const seed = seedOf(key);
  const r = rng(seed);
  const arenas = (c.arenas || []).filter((a) => a && !SKIP_ARENAS.has(a.id));
  const a = arenas.length ? arenas[Math.floor(r() * arenas.length)] : { id: 'marathon', name: 'Marathon Plain', size: 'medium', seed };
  const fids = c.factions && Object.keys(c.factions).length ? Object.keys(c.factions) : FACTION_IDS;
  const fa = fids[Math.floor(r() * fids.length)];
  let fb = fids[Math.floor(r() * fids.length)];
  if (fb === fa) fb = fids[(fids.indexOf(fa) + 1 + Math.floor(r() * (fids.length - 1))) % fids.length];
  const style = STYLES[Math.floor(r() * STYLES.length)];
  const muts = (c.mutators || []).map((m) => m.id).filter(Boolean);
  const twist = r() < 0.67 && muts.length ? muts[Math.floor(r() * muts.length)] : null;
  return { date: key, seed, arenaId: a.id, arenaName: a.name || a.id, size: a.size || 'medium', arenaSeed: (seed % 100000) + 1, factionA: fa, factionB: fb, enemyStyle: style, budget: DAILY_BUDGET, difficulty: 'normal', mutator: twist };
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

/** streak: consecutive days ending at `today` (or yesterday) with a recorded game. history = [{date}] newest first. */
export function streakOf(history, today) {
  const set = new Set((history || []).map((h) => h.date));
  const day = (k, delta) => { const [y, m, d] = k.split('-').map(Number); const x = new Date(y, m - 1, d + delta); return dateKey(x); };
  let k = set.has(today) ? today : day(today, -1), n = 0;
  while (set.has(k)) { n++; k = day(k, -1); }
  return n;
}
