// Puzzle solver (CAMPAIGN tooling): searches placements for a puzzle with the headless sim. Candidates are parametric (counts per roster unit, a formation, a
// centre in the player's zone, an order) so every candidate is a legal, readable placement a human could draw; the best one is stored in puzzles.js.
//   node tests/campaign/solve_puzzles.mjs <puzzleId> [iters] [seed]      prints the best candidates; --write stores the best one into src/.../puzzle_solutions.js
import { RNG } from '../../src/core/rng.js';
import { formationOffsets, placeOffsets } from '../../src/sim/formations.js';
import { defs, puzzleArena, runPuzzle } from './_lib.mjs';

const HEAD = Math.PI / 2;
export const costOf = (counts) => Object.keys(counts).reduce((s, k) => s + counts[k] * defs[k].cost, 0);

/** Placements of one group: n units of defId in `formation` centred at (cx, cz), facing east, as one squad (squadId) with an order. */
export function group(defId, n, cx, cz, formation, order, squadId, spacing) {
  const d = defs[defId], sp = spacing || Math.max(1.15, d.radius * 2.2);
  const offs = formationOffsets(formation, n, sp, new RNG(squadId * 7 + 3));
  return placeOffsets(offs, cx, cz, HEAD).map((p) => ({ defId, x: +p[0].toFixed(2), z: +p[1].toFixed(2), heading: HEAD, squadId, formation, order }));
}

/** A random legal candidate for a puzzle: {placements, counts, spec}. */
export function randomCandidate(p, rng, opts = {}) {
  const arena = puzzleArena(p), A = arena.zones.A, roster = p.player.roster, budget = p.player.budget, par = p.par;
  const target = opts.target || (rng.chance(0.6) ? par : budget);
  // counts: pick a random subset of roster units and spend `target` among them
  const counts = {}; let left = target;
  const pool = roster.slice(); rng.shuffle(pool);
  const k = Math.max(1, Math.min(pool.length, rng.int(1, pool.length)));
  const chosen = pool.slice(0, k), w = chosen.map(() => 0.2 + rng.next());
  const tw = w.reduce((a, b) => a + b, 0);
  chosen.forEach((id, i) => { const c = defs[id].cost, n = Math.floor(target * w[i] / tw / c); if (n > 0) { counts[id] = n; left -= n * c; } });
  for (let g = 0; g < 40 && left >= 85; g++) { const fit = chosen.filter((id) => defs[id].cost <= left); if (!fit.length) break; const id = rng.pick(fit); counts[id] = (counts[id] || 0) + 1; left -= defs[id].cost; }
  if (!Object.keys(counts).length) counts[roster[0]] = 1;
  const placements = []; let sid = 1;
  const FORMS = ['line', 'block', 'phalanx', 'wedge', 'skirmish', 'column'];
  for (const id of Object.keys(counts)) {
    const d = defs[id], front = A.x + A.w / 2 - 1.2, back = A.x - A.w / 2 + 1.2;
    const cx = rng.range(back, front), cz = rng.range(-A.d / 2 + 4, A.d / 2 - 4) * (opts.zSpread || 0.6);
    const form = d.role === 'siege' ? 'line' : rng.pick(FORMS), order = d.role === 'ranged' || d.role === 'siege' ? rng.pick(['hold', 'advance']) : rng.pick(['hold', 'advance', 'advance']);
    // squads of at most 12
    let rem = counts[id];
    while (rem > 0) { const n = Math.min(rem, 12); placements.push(...group(id, n, +(cx + rng.range(-1.5, 1.5)).toFixed(1), +(cz + rng.range(-2, 2)).toFixed(1), form, order, sid++)); rem -= n; }
  }
  // clamp into the zone
  for (const q of placements) { q.x = +Math.max(A.x - A.w / 2 + 0.6, Math.min(A.x + A.w / 2 - 0.6, q.x)).toFixed(2); q.z = +Math.max(A.z - A.d / 2 + 0.6, Math.min(A.z + A.d / 2 - 0.6, q.z)).toFixed(2); }
  return { placements, counts, cost: costOf(counts) };
}

/** Perturb a candidate: move a squad, flip an order, or swap a few units for another type. */
export function mutate(p, cand, rng) {
  const arena = puzzleArena(p), A = arena.zones.A;
  const bySq = new Map(); for (const q of cand.placements) { (bySq.get(q.squadId) || bySq.set(q.squadId, []).get(q.squadId)).push(q); }
  const sqs = Array.from(bySq.values()), out = [];
  const pick = rng.int(0, sqs.length - 1), mode = rng.int(0, 3);
  sqs.forEach((sq, i) => {
    if (i !== pick) { for (const q of sq) out.push(Object.assign({}, q)); return; }
    const dx = mode === 0 ? rng.range(-5, 5) : 0, dz = mode === 1 ? rng.range(-6, 6) : 0, ord = mode === 2 ? (sq[0].order === 'hold' ? 'advance' : 'hold') : sq[0].order;
    for (const q of sq) out.push(Object.assign({}, q, { x: +Math.max(A.x - A.w / 2 + 0.6, Math.min(A.x + A.w / 2 - 0.6, q.x + dx)).toFixed(2), z: +Math.max(A.z - A.d / 2 + 0.6, Math.min(A.z + A.d / 2 - 0.6, q.z + dz)).toFixed(2), order: ord }));
  });
  const counts = {}; for (const q of out) counts[q.defId] = (counts[q.defId] || 0) + 1;
  return { placements: out, counts, cost: costOf(counts) };
}

/** Score of a result: stars first, then (win) earlier is better, then cheaper. */
export const score = (r, cand) => (r.win ? 1000 : 0) + r.stars * 100 + (r.win ? (200 - r.t) * 0.2 : (r.alive[0] - r.alive[1]) * 0.1) - cand.cost / 100;

export function solve(p, o = {}) {
  const rng = new RNG((o.seed || 1) * 7919 + 11), iters = o.iters || 60, log = o.log || (() => {});
  let best = null, bestR = null, bestS = -1e9;
  const tryIt = (cand, tag) => {
    if (cand.cost > p.player.budget) return;
    const r = runPuzzle(p, cand.placements);
    const s = score(r, cand);
    if (s > bestS) { best = cand; bestR = r; bestS = s; log(tag + ' best: win ' + r.win + ' stars ' + r.stars + ' t ' + r.t.toFixed(0) + ' cost ' + cand.cost + ' ' + JSON.stringify(cand.counts)); }
    return r;
  };
  for (const seedCand of o.seeds || []) tryIt(seedCand, 'seed');
  for (let i = 0; i < iters; i++) {
    const cand = i % 3 === 2 && best ? mutate(p, best, rng) : randomCandidate(p, rng, o);
    tryIt(cand, 'iter ' + i);
    if (bestR && bestR.stars === 3 && o.stopAtThree !== false) break;
  }
  return { best, result: bestR };
}
