// _progress.js: one place that knows where progress lives, so COORD can adjust the storage layout without touching the screens.
// Reads try, in order: ctx.save.progress.get(key) (collection-style, as in UI-A's mock) -> ctx.save.store.get(key) -> ctx.save.store.get('progress')[key].
// Shapes used by the campaign / survival / daily screens:
//   stars    : { [missionId]: 0..3 }
//   survival : { best: number, board: [{score, waves, date, arena}] (top 5) }
//   daily    : { last: 'YYYY-MM-DD', streak: n, history: [{date, result:'win|loss|draw', time, left, seed, arena, string}] }
// Writes go through ctx.save.progress.set(key, value) when it exists, else ctx.save.store.set(key, value). The Game / sim layer owns recording results;
// the screens only read (the one exception is the Daily screen's "mark as shared" no-op: none).
export function readKey(ctx, key, fallback) {
  const s = ctx && ctx.save;
  if (!s) return fallback;
  try {
    if (s.progress && typeof s.progress.get === 'function') { const v = s.progress.get(key); if (v !== undefined && v !== null) return v; }
  } catch (e) { /* fall through */ }
  try {
    if (s.store && typeof s.store.get === 'function') {
      const v = s.store.get(key, undefined); if (v !== undefined && v !== null) return v;
      const p = s.store.get('progress', null); if (p && p[key] !== undefined) return p[key];
    }
  } catch (e) { /* fall through */ }
  return fallback;
}

export function starsMap(ctx) {
  const v = readKey(ctx, 'stars', null);
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  const c = readKey(ctx, 'campaign', null);                       // alternative layout: { stars: {...} } or { missions: { id: {stars} } }
  if (c && c.stars) return c.stars;
  if (c && c.missions) { const o = {}; for (const k of Object.keys(c.missions)) o[k] = c.missions[k].stars | 0; return o; }
  return {};
}

export function totalStars(ctx, missions) { const m = starsMap(ctx); let n = 0; for (const x of missions) n += Math.max(0, Math.min(3, m[x.id] | 0)); return n; }

/** Missions unlock in order: the first is always open; the next opens with >= 1 star on its predecessor. */
export function isUnlocked(ctx, missions, i) {
  if (i <= 0) return true;
  const m = starsMap(ctx);
  return (m[missions[i - 1].id] | 0) >= 1;
}

export function survivalBoard(ctx) {
  const v = readKey(ctx, 'survival', null);
  if (v && Array.isArray(v.board)) return { best: v.best | 0, board: v.board.slice(0, 5) };
  const best = readKey(ctx, 'survivalBest', 0) | 0;
  return { best, board: Array.isArray(v) ? v.slice(0, 5) : [] };
}

export function dailyInfo(ctx) {
  const v = readKey(ctx, 'daily', null);
  if (v && typeof v === 'object') return { last: v.last || '', streak: v.streak | 0, history: Array.isArray(v.history) ? v.history.slice(0, 14) : [] };
  const last = readKey(ctx, 'dailyLast', '');
  return { last: typeof last === 'string' ? last : '', streak: 0, history: [] };
}

export function writeKey(ctx, key, value) {
  const s = ctx && ctx.save;
  if (!s) return false;
  try {
    if (s.progress && typeof s.progress.set === 'function') { s.progress.set(key, value); return true; }
  } catch (e) { /* fall through */ }
  try {
    if (s.store && typeof s.store.set === 'function') { const p = s.store.get('progress', {}) || {}; p[key] = value; s.store.set('progress', p); return true; }
  } catch (e) { /* storage blocked: the Not saving indicator handles it */ }
  return false;
}
