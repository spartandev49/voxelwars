// Schema versions and migrations for the versioned save documents (spec §11, verification P3 / B11).
//   migrate(name, env) -> { ok, v, data, steps, side, error? }      env = { v, data } as stored by save/store.js (never mutated)
// A migration upgrades ONE version step (n -> n+1) and is a pure function of the stored data. Documents never see another document's data, so when a
// step moves a value into a sibling document (progress.survivalBest -> survival.best) it reports it in `side` and the caller (save/docs.js createDocs)
// merges it into the sibling when the sibling has nothing better. Nothing here touches storage, `window` or a clock.
//
// Layout history (v1 is what builds before the document layer wrote; the fixtures in tests/save/fixtures describe it):
//   progress  v1: { stars: {mission:n} | [n...] (mission order), achievements: [id...] | {id: true|ms|{unlocked,at}}, codex: [defId...] | {seen:[...], locked:[...]},
//                   survivalBest, dailyLast }
//             v2: { stars: {mission: 0..3}, achievements: {id: {at: ms}}, codex: {locked: [defId], seen: {defId: true}}, unlockedMutators: [], titles: [], parts: [] }
//   survival  v1: [ {score, waves, date, arena} ... ]  or  { best, board }        v2: { best, bestWave, board: top 5 by score }
//   daily     v1: { last, history:[{date: 'YYYY-MM-DD' | YYYYMMDD number, ...}] }  v2: { last: 'YYYY-MM-DD', streak, history: newest first, <= 14 }
//   seen      v1: [id...]  or  { hints: {...} }                                    v2: { id: true | ms }
//   stats     v1 is current ({v:1, ...keys}); migrate() only normalises it (stats.js owns the shape).
import { MISSION_IDS } from '../content/era_ancient/humor/achievements.js';

export const CURRENT = { progress: 2, survival: 2, daily: 2, seen: 2, stats: 1 };
export const DOC_NAMES = Object.keys(CURRENT);
const ID_RE = /^[a-z0-9_]{1,48}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const fin = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 'YYYY-MM-DD' from a string, a YYYYMMDD number/string, or '' when it is not a real date. */
export function normDate(v) {
  let s = '';
  if (typeof v === 'number' && Number.isFinite(v)) s = String(Math.floor(v));
  else if (typeof v === 'string') s = v.trim();
  else return '';
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) || /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) return '';
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2200) return '';
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}
/** Days between two 'YYYY-MM-DD' strings (b - a). */
export function dayDiff(a, b) { const p = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return Date.UTC(+m[1], +m[2] - 1, +m[3]); }; return Math.round((p(b) - p(a)) / 86400000); }
/** Consecutive-day streak ending at `last` over history rows with a 'date' (any result counts as a played day). */
export function streakFrom(history, last) {
  const days = new Set(history.map((h) => h.date)); if (!last) return 0;
  let n = 0, cur = last;
  while (days.has(cur)) { n++; const d = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(5, 7) - 1, +cur.slice(8, 10)) - 86400000); cur = d.toISOString().slice(0, 10); }
  return n;
}

// ------------------------------------------------------------------ progress
function stars1to2(v) {
  const out = {};
  if (Array.isArray(v)) v.forEach((n, i) => { if (i < MISSION_IDS.length) { const s = clamp(Math.round(fin(+n)), 0, 3); if (s > 0) out[MISSION_IDS[i]] = s; } });
  else if (isObj(v)) for (const k of Object.keys(v)) { if (FORBIDDEN.has(k) || !ID_RE.test(k)) continue; const s = clamp(Math.round(fin(+v[k])), 0, 3); if (s > 0) out[k] = s; }
  return out;
}
function achievements1to2(v) {
  const out = {};
  const put = (id, at) => { if (typeof id === 'string' && ID_RE.test(id)) out[id] = { at: Math.max(0, Math.floor(fin(at))) }; };
  if (Array.isArray(v)) for (const id of v) put(id, 0);
  else if (isObj(v)) for (const id of Object.keys(v)) {
    const x = v[id];
    if (x === true) put(id, 0);
    else if (typeof x === 'number') put(id, x);
    else if (isObj(x) && (x.unlocked || x.at)) put(id, x.at);
  }
  return out;
}
function codex1to2(v) {
  const seen = {}, locked = [];
  const ids = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && ID_RE.test(x)) : []);
  if (Array.isArray(v)) for (const id of ids(v)) seen[id] = true;
  else if (isObj(v)) { for (const id of ids(v.seen)) seen[id] = true; if (isObj(v.seen)) for (const id of Object.keys(v.seen)) if (v.seen[id] && ID_RE.test(id)) seen[id] = true; for (const id of ids(v.locked)) locked.push(id); }
  return { locked, seen };
}
function progress1to2(d) {
  const side = {};
  const out = {
    stars: stars1to2(d.stars), achievements: achievements1to2(d.achievements), codex: codex1to2(d.codex),
    unlockedMutators: Array.isArray(d.unlockedMutators) ? d.unlockedMutators.filter((x) => typeof x === 'string' && ID_RE.test(x)) : [],
    titles: Array.isArray(d.titles) ? d.titles.filter((x) => typeof x === 'string').map((x) => x.slice(0, 60)).slice(0, 40) : [],
    parts: Array.isArray(d.parts) ? d.parts.filter((x) => typeof x === 'string' && ID_RE.test(x)).slice(0, 80) : [],
  };
  if (d.survivalBest !== undefined && fin(+d.survivalBest) > 0) side.survival = { best: Math.floor(fin(+d.survivalBest)) };
  const dl = normDate(d.dailyLast); if (dl) side.daily = { last: dl };
  return { data: out, side };
}

// ------------------------------------------------------------------ survival / daily / seen
function board1(list) {
  const rows = [];
  for (const e of Array.isArray(list) ? list : []) {
    if (!isObj(e)) continue;
    const score = Math.floor(fin(+e.score)); if (score <= 0) continue;
    rows.push({ score, waves: Math.max(0, Math.floor(fin(+e.waves))), date: normDate(e.date), arena: typeof e.arena === 'string' ? e.arena.slice(0, 40) : '' });
  }
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 5);
}
function survival1to2(d) {
  const list = Array.isArray(d) ? d : (isObj(d) && Array.isArray(d.board) ? d.board : []);
  const board = board1(list);
  const best = Math.max(isObj(d) ? Math.floor(fin(+d.best)) : 0, board.length ? board[0].score : 0);
  const bestWave = Math.max(isObj(d) ? Math.floor(fin(+d.bestWave)) : 0, ...board.map((r) => r.waves), 0);
  return { data: { best, bestWave, board }, side: {} };
}
function daily1to2(d) {
  const src = isObj(d) ? d : {};
  const hist = [];
  for (const e of Array.isArray(src.history) ? src.history : []) {
    if (!isObj(e)) continue;
    const date = normDate(e.date); if (!date) continue;
    hist.push({ date, result: ['win', 'loss', 'draw'].includes(e.result) ? e.result : 'draw', time: Math.max(0, Math.round(fin(+e.time))), left: clamp(Math.round(fin(+e.left)), 0, 100), seed: Math.floor(fin(+e.seed)), arena: typeof e.arena === 'string' ? e.arena.slice(0, 40) : '', string: typeof e.string === 'string' ? e.string.slice(0, 600) : '' });
  }
  hist.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const seen = new Set(); const history = hist.filter((h) => (seen.has(h.date) ? false : (seen.add(h.date), true))).slice(0, 14);
  const last = normDate(src.last) || (history[0] ? history[0].date : '');
  return { data: { last, streak: streakFrom(history, last), history }, side: {} };
}
function seen1to2(d) {
  const out = {};
  const put = (id, v) => { if (typeof id === 'string' && ID_RE.test(id) && v) out[id] = v === true ? true : Math.max(1, Math.floor(fin(+v, 1))); };
  if (Array.isArray(d)) for (const id of d) put(id, true);
  else if (isObj(d)) { const src = isObj(d.hints) ? d.hints : d; for (const id of Object.keys(src)) put(id, src[id]); }
  return { data: out, side: {} };
}

export const MIGRATIONS = {
  progress: { 1: progress1to2 },
  survival: { 1: survival1to2 },
  daily: { 1: daily1to2 },
  seen: { 1: seen1to2 },
  stats: {},
};

/**
 * Upgrade a stored envelope to the current version of document `name`. Never throws.
 *   env newer than CURRENT  -> { ok: true, future: true, v: env.v, data: env.data, steps: [] }  (caller must treat it as read-only)
 *   step failure            -> { ok: false, error, v: <version reached>, data: <data at that version> }
 */
export function migrate(name, env) {
  const target = CURRENT[name];
  if (target === undefined) return { ok: false, error: 'Unknown document ' + String(name).slice(0, 24), v: 0, data: null, steps: [], side: {} };
  if (!env || typeof env !== 'object' || !('data' in env)) return { ok: false, error: 'Not a stored document', v: 0, data: null, steps: [], side: {} };
  let v = Number.isFinite(+env.v) && +env.v >= 1 ? Math.floor(+env.v) : 1;
  if (v > target) return { ok: true, future: true, v, data: env.data, steps: [], side: {} };
  let data = env.data; const steps = []; const side = {};
  while (v < target) {
    const fn = MIGRATIONS[name] && MIGRATIONS[name][v];
    if (!fn) return { ok: false, error: `No migration for ${name} v${v}`, v, data, steps, side };
    try {
      const r = fn(data === undefined || data === null ? {} : data);
      data = r.data; steps.push(`${name} v${v} -> v${v + 1}`);
      for (const k of Object.keys(r.side || {})) side[k] = Object.assign(side[k] || {}, r.side[k]);
    } catch (e) { return { ok: false, error: `Migration ${name} v${v} failed: ${e && e.message}`, v, data, steps, side }; }
    v++;
  }
  return { ok: true, v, data, steps, side };
}
