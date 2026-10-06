// Post-battle lessons (spec §14, UI16): 3 lessons generated from a recorded event log, each with a one-line fix, voiced for Cassandra.
//   generateLessons(log, ctx) -> [{id, who:'cassandra', text, fix, score, vars}]   (always 3 when the log holds a battle_end)
//   log: array of [type, payload, simTime] (EventBus.record format) or {type, payload, t}.   ctx: {team (the player's team, default 0), defs, rng (optional, for line choice), tOf?}
// Detectors score how interesting each pattern is; the top three with distinct ids win; templates live in content/era_ancient/lesson_text.js.
import { LESSON_TEXT } from '../content/era_ancient/lesson_text.js';

const fmtT = (t) => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const nm = (defs, id) => { const d = defs && defs[id]; return d ? d.name : String(id).replace(/_/g, ' '); };

/** Normalise a recorded log to [{t, type, p}] with a running time from battle_start / unit events (events carry no time; we use the order index when absent). */
function norm(log) {
  const out = []; let t = 0;
  for (const e of log) {
    const type = Array.isArray(e) ? e[0] : e.type, p = Array.isArray(e) ? e[1] : e.payload;
    if (p && typeof p.t === 'number' && (type === 'battle_end' || type === 'stalemate_warning')) t = p.t;
    if (p && typeof p.time === 'number') t = p.time;
    const tt = Array.isArray(e) ? e[2] : e.t;
    out.push({ type, p: p || {}, t: tt !== undefined ? tt : t });
  }
  return out;
}

export function generateLessons(log, ctx = {}) {
  const team = ctx.team === 1 ? 1 : 0, defs = ctx.defs, ev = norm(log);
  // team of each unit (unit_spawn) and name of each def
  const teamOf = new Map(), defOf = new Map();
  for (const e of ev) if (e.type === 'unit_spawn') { teamOf.set(e.p.id, e.p.team); defOf.set(e.p.id, e.p.def); }
  const end = ev.find((x) => x.type === 'battle_end');
  const total = end ? end.p.t : (ev.length ? ev[ev.length - 1].t : 0);
  const won = end ? end.p.winner === team : false;
  const cand = [];
  const add = (id, score, vars) => cand.push({ id, score, vars: vars || {} });
  // ---- friendly fire by the player's side
  let ff = 0, ffDmg = 0;
  for (const e of ev) if (e.type === 'friendly_fire' && teamOf.get(e.p.src) === team) { ff++; ffDmg += e.p.dmg || 0; }
  if (ff >= 3) add('friendly_fire', 40 + Math.min(40, ff * 2), { n: ff });
  // ---- cavalry charges against the player's units
  let chargesAgainst = 0, chargesFor = 0, bracesWin = 0, bracesLoss = 0;
  for (const e of ev) {
    if (e.type === 'charge_hit') { if (teamOf.get(e.p.dst) === team) chargesAgainst++; else chargesFor++; }
    if (e.type === 'unit_brace') { if (teamOf.get(e.p.id) === team) bracesWin++; else bracesLoss++; }
  }
  if (chargesAgainst >= 3) add('cavalry_charge', 35 + Math.min(40, chargesAgainst * 3), { n: chargesAgainst });
  if (bracesWin >= 2) add('brace_win', 30 + bracesWin * 4, { n: bracesWin });
  if (bracesLoss >= 2) add('brace_loss', 40 + bracesLoss * 5, { n: bracesLoss });
  // ---- army low / flank folds / heroes / routs
  for (const e of ev) if (e.type === 'army_low' && e.p.team === team) add('army_low', 45 + (won ? -30 : 15), { t: fmtT(e.t) });
  for (const e of ev) if (e.type === 'big_swing' && e.p.team !== team && e.p.flank && e.p.flank !== 'center') { add('flank_fold', 50 + Math.abs(Math.log(e.p.ratio || 1)) * 30, { flank: e.p.flank, t: fmtT(e.t) }); break; }
  for (const e of ev) if (e.type === 'hero_down' && e.p.team === team) { add('hero_down', 38, { def: nm(defs, e.p.def), t: fmtT(e.t) }); break; }
  let routs = 0; for (const e of ev) if (e.type === 'unit_rout' && e.p.team === team) routs++;
  if (routs >= 4) add('routs', 25 + Math.min(40, routs * 2), { n: routs });
  const stale = ev.find((x) => x.type === 'stalemate_warning');
  if (stale) add('stalemate', 45, { n: Math.round(stale.p.t || 12) });
  let tramples = 0; for (const e of ev) if (e.type === 'trample' && teamOf.get(e.p.id) !== team) tramples += e.p.count || 1;
  if (tramples >= 4) add('trample', 35 + Math.min(30, tramples * 2), { n: tramples });
  // ---- damage split (ranged vs melee) of the player's side
  let rd = 0, md = 0;
  for (const e of ev) if (e.type === 'unit_hit' && teamOf.get(e.p.src) === team) { if (e.p.proj) rd += e.p.dmg; else md += e.p.dmg; }
  const dsum = rd + md;
  if (won && dsum > 0) { if (rd / dsum > 0.55) add('ranged_win', 30 + (rd / dsum) * 20, { pct: Math.round(rd / dsum * 100) }); else if (md / dsum > 0.8) add('melee_win', 28 + (md / dsum) * 15, { pct: Math.round(md / dsum * 100) }); }
  // ---- pacing
  if (end) { if (won && total < 30) add('blitz', 36, { t: fmtT(total) }); if (total > 170) add('slog', 34, { t: fmtT(total) }); }
  // ---- enemy composition
  const enemyCost = {}; let ec = 0;
  for (const e of ev) if (e.type === 'unit_spawn' && e.p.team !== team) { const d = defs && defs[e.p.def]; if (!d) continue; const g = d.role === 'beast' ? 'swarm' : d.role; enemyCost[g] = (enemyCost[g] || 0) + d.cost; ec += d.cost; }
  if (ec > 0) for (const g of Object.keys(enemyCost)) { const share = enemyCost[g] / ec; if (share > 0.35 && !won) add('composition', 32 + share * 30, { pct: Math.round(share * 100), role: g }); }
  // ---- pick the best three, distinct ids, deterministic tie-break
  cand.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  const picked = [], seen = new Set();
  for (const c of cand) { if (seen.has(c.id)) continue; seen.add(c.id); picked.push(c); if (picked.length === 3) break; }
  // pad with generic lessons so the screen always has three
  const pads = won ? ['melee_win', 'blitz', 'ranged_win', 'slog'] : ['army_low', 'composition', 'routs', 'slog'];
  for (const id of pads) { if (picked.length >= 3) break; if (seen.has(id)) continue; seen.add(id); picked.push({ id, score: 0, vars: { n: 0, t: fmtT(total), pct: 0, role: 'infantry', flank: 'center', def: 'hero' } }); }
  const rng = ctx.rng, pick = (arr, k) => arr[(rng ? Math.floor(rng.next() * arr.length) : k % arr.length)];
  return picked.map((c, i) => {
    const T = LESSON_TEXT[c.id];
    const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (c.vars[k] !== undefined ? String(c.vars[k]) : m));
    return { id: c.id, who: 'cassandra', text: fill(pick(T.text, i)), fix: fill(pick(T.fix, i + 1)), score: c.score, vars: c.vars };
  });
}
