// W7 (sim-driven): a scripted Survival run on the real WaveSystem. The reference player buys a counter-pick army with the starting 6,000 and spends each
// intermission budget (1,600 + 240 n) on a counter-pick against the wave it just beat. Proves: no early wave is unwinnable, the ramp is real (the run ends
// somewhere), reinforcements matter (negative control: without them the same player dies earlier), boss waves arrive on the 5th, and the score is the
// documented formula. Slow (minutes): excluded from `gate --fast` by its name.
import { test, finish, assert } from '../sim/_util.mjs';
import { World } from '../../src/sim/world.js';
import { generateArena } from '../../src/world/gen.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { generateArmy, layoutArmy } from '../../src/sim/armygen.js';
import { survivalRules, survivalWave, survivalScore, reinforceBudget, SURVIVAL } from '../../src/content/era_ancient/survival.js';

const defs = buildSimDefs();
const arena = generateArena('marathon', 'medium', 11);

/** One scripted run: returns {cleared, reached (wave number alive at the end), kills, remainingCost, t, score, bossSeen, events}. */
function survive({ seed, reinforce = true, maxWaves = 6, faction = 'hellenes', immortal = false }) {
  const w = new World({ arena, seed, defs, rules: survivalRules({}, { autoAdvance: false }) });
  const A = arena.zones.A, B = arena.zones.B;
  const first = generateArmy({ faction, budget: SURVIVAL.start, style: 'balanced', difficulty: 'normal', seed: seed * 17, defs, cap: 300 });
  w.addPlacements(0, layoutArmy(first.groups, A, B, defs, { seed }), { defs });
  const log = []; let bossSeen = false;
  if (immortal) w.events.on('unit_spawn', (e) => { if (e.team === 0) { const u = w.unitById(e.id); u.hpMax = u.hp = 1e7; } });
  if (immortal) for (const u of w.units) if (u.team === 0) u.hpMax = u.hp = 1e7;
  w.events.on('wave_spawn', (e) => log.push(['spawn', e.n, e.count, +w.time.toFixed(1)]));
  w.events.on('wave_intermission', (e) => {
    log.push(['inter', e.n, e.budget, e.boss]);
    if (e.boss) bossSeen = true;
    if (reinforce) {
      const last = w.waves.lastArmy, against = {}; for (const g of last.groups) against[g.defId] = g.n;
      const army = generateArmy({ faction, budget: e.budget, style: 'counter', difficulty: 'normal', against, seed: seed * 31 + e.n, defs, cap: 300 });
      w.addPlacements(0, layoutArmy(army.groups, A, B, defs, { seed: seed + e.n, firstSquad: w.nextSquad + 500 }), { defs });
    }
    w.waves.next();
  });
  w.start();
  const t0 = performance.now();
  while (w.state !== 'ended' && w.waves.cleared < maxWaves && w.time < 60 * 40 && w.stats[0].alive > 0) w.tick();
  return { cleared: w.waves.cleared, reached: w.waves.n, kills: w.stats[0].kills, remaining: Math.round(w.stats[0].aliveCost), t: w.time, score: w.waves.score(), bossSeen, log, alive: w.stats[0].alive, ms: performance.now() - t0, w };
}

const runs = {};
await test('the reference player (no powers, no micro) clears wave 1 and meets wave 3 on 3 seeds (no early wave is unwinnable by construction); the wave sizes it fights are the table\'s', () => {
  for (const seed of [1, 2, 3]) {
    const r = runs[seed] = survive({ seed });
    console.log('  survival seed', seed, 'cleared', r.cleared, 'reached wave', r.reached, 'alive for', r.t.toFixed(0), 's', 'score', r.score);
    assert.ok(r.cleared >= 1 && r.reached >= 3, 'seed ' + seed + ' cleared ' + r.cleared + ' reached ' + r.reached);
    const spawns = r.log.filter((e) => e[0] === 'spawn');
    spawns.forEach((s) => assert.equal(s[2], survivalWave(s[1], seed).count, 'wave ' + s[1] + ' spawned with the table count'));
    const inters = r.log.filter((e) => e[0] === 'inter'); inters.forEach((e) => assert.equal(e[2], reinforceBudget(e[1] - 1), 'intermission before wave ' + e[1] + ' offers 1,600 + 240 x cleared'));
  }
});

await test('score of a finished run = cleared x 1000 + kills x 10 + remaining cost (the sim\'s score() and the content formula agree on real runs)', () => {
  for (const seed of [1, 2, 3]) { const r = runs[seed]; assert.equal(r.score, survivalScore({ waves: r.cleared, kills: r.kills, remainingCost: r.remaining }), 'seed ' + seed); assert.ok(r.score >= r.cleared * 1000); }
});

await test('negative control: the same player without any reinforcement survives for less time (the intermission budget is what keeps a run alive)', () => {
  let better = 0;
  for (const seed of [1, 2, 3]) { const nr = survive({ seed, reinforce: false, maxWaves: 6 }); console.log('  no reinforcement, seed', seed, 'alive for', nr.t.toFixed(0), 's vs', runs[seed].t.toFixed(0), 's'); if (runs[seed].t > nr.t) better++; }
  assert.ok(better >= 2, 'reinforcements lengthened the run on ' + better + ' of 3 seeds');
});

await test('boss wave on the fifth: a run that survives that long (immortal player) meets a minotaur in wave 5, announced by the intermission before it', () => {
  const r = survive({ seed: 3, maxWaves: 5, immortal: true });
  assert.ok(r.cleared >= 5, 'immortal player cleared ' + r.cleared); const inter = r.log.filter((e) => e[0] === 'inter');
  assert.ok(inter.some((e) => e[1] === 5 && e[3] === 'minotaur'), 'the intermission before wave 5 names the minotaur: ' + JSON.stringify(inter));
  assert.ok(inter.filter((e) => e[1] !== 5).every((e) => !e[3]), 'only wave 5 is a boss wave in the first five');
  const spawn5 = r.log.find((e) => e[0] === 'spawn' && e[1] === 5); assert.equal(spawn5[2], survivalWave(5, 3).count);
});

finish('survival.slow');
