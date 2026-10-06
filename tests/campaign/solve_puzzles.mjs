// Find (and store) a solving placement for each puzzle with the headless sim.
//   node tests/campaign/solve_puzzles.mjs <id|all> [iters=60] [seed=1] [--write]
// Seeds the search with the hand-made candidates in tests/campaign/_puzzle_seeds.mjs, then random + mutation search; keeps the best result (most stars,
// then cheapest). --write merges the winners into src/content/era_ancient/puzzle_solutions.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUZZLES, runPuzzle } from './_lib.mjs';
import { solve, costOf } from './_solver.mjs';
import { SEEDS } from './_puzzle_seeds.mjs';
import { SOLUTIONS } from '../../src/content/era_ancient/puzzle_solutions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [which = 'all', iters = '60', seed = '1'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const write = process.argv.includes('--write');
const list = which === 'all' ? PUZZLES : PUZZLES.filter((p) => p.id === which);
const out = Object.assign({}, SOLUTIONS);
for (const p of list) {
  const seeds = (SEEDS[p.id] || []).map((placements) => { const counts = {}; for (const q of placements) counts[q.defId] = (counts[q.defId] || 0) + 1; return { placements, counts, cost: costOf(counts) }; });
  const { best, result } = solve(p, { iters: +iters, seed: +seed, seeds, log: (m) => console.log(p.id, m) });
  if (!best || !result.win) { console.log(p.id, 'NO WINNING PLACEMENT FOUND'); continue; }
  let prev = out[p.id];
  let prevRobust = false;
  if (prev) { const re = runPuzzle(p, prev.placements); if (!re.win || re.stars < prev.stars) { console.log(p.id, 'the stored solution no longer wins (stars ' + re.stars + '): replaced'); prev = null; } else prevRobust = [3, 7].every((d) => { const x = runPuzzle(p, prev.placements, { seed: (p.arena.seed || 1) + d }); return x.win && x.stars >= re.stars; }); }
  const better = !prev || result.stars > prev.stars || (result.robust && !prevRobust) || (result.stars === prev.stars && !!result.robust === prevRobust && best.cost < prev.cost);
  console.log(p.id, 'best: stars', result.stars, 'cost', best.cost, 't', result.t.toFixed(1), better ? '(stored)' : '(kept the previous)');
  if (better) out[p.id] = { placements: best.placements, cost: best.cost, stars: result.stars, earned: result.earned, t: +result.t.toFixed(1), lost: result.summary.unitsLost, alive: result.alive[0] };
}
if (write) {
  const f = path.join(root, 'src/content/era_ancient/puzzle_solutions.js');
  const head = fs.readFileSync(f, 'utf8').split('\nexport const SOLUTIONS')[0];
  fs.writeFileSync(f, head + '\nexport const SOLUTIONS = ' + JSON.stringify(out, null, 1).replace(/\n\s+/g, (m) => (m.length > 1 ? ' ' : m)) + ';\n');
  console.log('written', f);
}
