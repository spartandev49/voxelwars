// Shared helpers for the sim tests: tiny scripted worlds on the flat arena lab.
import { generateArena } from '../../src/world/gen.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { ST, SE } from '../../src/sim/consts.js';
export { ST, SE };
export const defs = buildSimDefs();
const arenas = new Map();
export function arena(recipe = 'arenalab', size = 'small', seed = 1) { const k = recipe + size + seed; if (!arenas.has(k)) arenas.set(k, generateArena(recipe, size, seed)); return arenas.get(k); }

/** A started world on a flat arena. opts: {arena, size, seed, rules, props, arenaObj (a prepared Arena), start} */
export function world(opts = {}) {
  const w = new World({ arena: opts.arenaObj || arena(opts.arena || 'arenalab', opts.size || 'small', opts.arenaSeed || 1), seed: opts.seed || 1, rules: opts.rules || {}, defs: opts.defs || defs, props: opts.props !== false });
  if (opts.start !== false) w.start();
  return w;
}
export function add(w, id, team, x, z, o = {}) { return w.addUnit(id, team, x, z, Object.assign({ heading: team === 0 ? Math.PI / 2 : -Math.PI / 2 }, o)); }
/** Spawn n units of a def in a row/block around (cx,cz). */
export function block(w, id, team, n, cx, cz, o = {}) {
  const out = []; const cols = Math.ceil(Math.sqrt(n)); const sp = o.spacing || 1.3;
  for (let i = 0; i < n; i++) out.push(add(w, id, team, cx + ((i / cols) | 0) * sp * (team === 0 ? -1 : 1), cz + ((i % cols) - (cols - 1) / 2) * sp, o));
  return out;
}
/** Rebuild the spatial hash by hand (tests that call hash-based internals without ticking). */
export function rehash(w) { w.hash.clear(); w.units.forEach((u, i) => { if (u.alive) w.hash.insert(i, u.x, u.z); }); return w; }
/** Keep a battle from ending: a far-away pinned unit for each team (elimination would stop the world). */
export function sentinels(w, x = 28) { const a = add(w, 'hoplite', 0, -x, 25), b = add(w, 'hoplite', 1, x, 25); pin(a); pin(b); a.hp = a.hpMax = b.hp = b.hpMax = 1e9; return [a, b]; }
/** Record events (copies). Returns the live array of [type, payload]. */
export function record(w, filter) {
  const log = [];
  w.ev.onAny((t, p) => { if (!filter || filter.includes(t)) log.push([t, JSON.parse(JSON.stringify(p, (k, v) => (k === 'stats' || k === 'perDef' ? undefined : v))), w.time]); });
  return log;
}
export const count = (log, type, pred) => log.filter((e) => e[0] === type && (!pred || pred(e[1]))).length;
export function run(w, secs, until) { const n = Math.round(secs * 30); for (let i = 0; i < n; i++) { w.tick(); if (until && until(w)) return i; } return n; }
export function stepUntil(w, maxSecs, pred) { return run(w, maxSecs, pred) / 30; }
/** Freeze a unit in place (no AI movement): handy for victims. */
export function pin(u) { u.se[SE.ROOT] = 1e9; return u; }
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
export { generateArena, World };

// ---- tiny test runner (plain node:assert, no deps)
import assert from 'node:assert/strict';
export { assert };
const results = [];
export async function test(name, fn) {
  const t0 = performance.now();
  try { await fn(); results.push([name, true, performance.now() - t0]); }
  catch (e) { results.push([name, false, performance.now() - t0, e]); }
}
export function finish(title) {
  const bad = results.filter((r) => !r[1]);
  for (const r of results) console.log((r[1] ? 'ok   ' : 'FAIL ') + r[0] + ' (' + r[2].toFixed(0) + ' ms)' + (r[1] ? '' : '\n     ' + String(r[3] && r[3].stack || r[3]).split('\n').slice(0, 4).join('\n     ')));
  console.log(`${title}: ${results.length - bad.length}/${results.length} passed`);
  if (bad.length) process.exit(1);
}
/** Zero the ability cooldowns of a unit (units start with a staggered partial cooldown). */
export function ready(u) { for (const a of u.abil) a.cd = 0; return u; }
/** Override ability params on one unit only (the def's param object is shared). */
export function tweak(u, id, over) { const a = u.abil.find((x) => x.p.id === id); a.p = Object.assign({}, a.p, over); return a; }
export function ab(u, id, effect) { return u.abil.find((x) => x.p.id === id && (!effect || x.p.effect === effect || x.p.kind === effect)); }
export function hurt(w, src, dst, dmg, o) { return import('../../src/sim/combat.js').then((c) => c.applyDamage(w, src, dst, dmg, o || c.newHit())); }
