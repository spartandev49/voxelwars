// W7 (data and rules side): Survival wave table, budgets between waves, boss cadence, score and the local top-five leaderboard (pure functions);
// the sim-driven ramp check is tests/campaign/survival.slow.test.mjs.
import { test, finish, assert } from '../sim/_util.mjs';
import { SURVIVAL, survivalWave, waveTable, playerPotential, survivalScore, recordRun, survivalRules, placementBudget, waveBudget, reinforceBudget, waveStyle, isBossWave, bossOf, waveName, BOSS_IDS } from '../../src/content/era_ancient/survival.js';
import { WAVE_NAMES, BOSS_NAMES, BOSS_CYCLE } from '../../src/content/era_ancient/wave_names.js';
import { STYLES } from '../../src/sim/armygen.js';
import { WaveSystem } from '../../src/sim/waves.js';
import { World } from '../../src/sim/world.js';
import { generateArena } from '../../src/world/gen.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { SURVIVAL as UI_SURVIVAL } from '../../src/ui/screens/survival.js';

const defs = buildSimDefs();
const cheapest = Math.min(...Object.values(defs).filter((d) => d.cost > 0).map((d) => d.cost));
const rows = waveTable(40, 7);

await test('constants agree with spec 7 and with the Survival screen (start 6,000, every 40 s, +1,600 +240n, boss every 5th)', () => {
  assert.deepEqual({ start: SURVIVAL.start, every: SURVIVAL.every, bonusBase: SURVIVAL.bonusBase, bonusPer: SURVIVAL.bonusPer, bossEvery: SURVIVAL.bossEvery }, { start: UI_SURVIVAL.start, every: UI_SURVIVAL.every, bonusBase: UI_SURVIVAL.bonusBase, bonusPer: UI_SURVIVAL.bonusPer, bossEvery: UI_SURVIVAL.bossEvery });
  for (const n of [1, 2, 7, 30]) { assert.equal(waveBudget(n), 2400 + 900 * n); assert.equal(reinforceBudget(n), 1600 + 240 * n); }
  assert.equal(SURVIVAL.start, 6000); assert.equal(SURVIVAL.enemyBase, 2400); assert.equal(SURVIVAL.topN, 5);
});

await test('every wave: budget 2,400 + 900n, spends it to within 150 drachmae (the type cap can leave a little), a legal army (<= 16 types, <= 300 units), real unit ids', () => {
  for (const r of rows) {
    assert.equal(r.budget, 2400 + 900 * r.n); assert.ok(r.cost <= r.budget, 'wave ' + r.n + ' over budget ' + r.cost + ' > ' + r.budget);
    assert.ok(r.budget - r.cost < 150 || (r.count >= 299 && r.cost >= 0.8 * r.budget), 'wave ' + r.n + ' leaves ' + (r.budget - r.cost));   // at the 300-unit cap the generator may leave up to 20% unspent (wave 38+, docs/requests/campaign_sim_bugs.md #7)
    assert.ok(r.groups.length >= 1 && r.groups.length <= 16 + (r.boss ? 1 : 0), 'types ' + r.groups.length);   // the chaos style fills 16 types and the boss may add a 17th (sim/waves.js) assert.ok(r.count <= 301); assert.equal(r.count, r.groups.reduce((s, g) => s + g.n, 0));
    for (const g of r.groups) { assert.ok(defs[g.defId], g.defId); assert.ok(g.n >= 1); }
    assert.equal(r.reinforce, 1600 + 240 * r.n); assert.equal(r.name, waveName(r.n));
  }
});

await test('boss every 5th wave cycling minotaur, cyclops, war_elephant, medusa, pharaoh; names from wave_names.js ("Wave 3: The Tax Collectors")', () => {
  assert.deepEqual(BOSS_IDS, BOSS_CYCLE); assert.deepEqual(BOSS_CYCLE, ['minotaur', 'cyclops', 'war_elephant', 'medusa', 'pharaoh']);
  rows.forEach((r) => {
    const boss = r.n % 5 === 0; assert.equal(isBossWave(r.n), boss); assert.equal(r.boss !== null, boss, 'wave ' + r.n);
    if (boss) { assert.equal(r.boss, BOSS_CYCLE[(r.n / 5 - 1) % 5]); assert.ok(r.groups.some((g) => g.defId === r.boss && g.n >= 1)); assert.equal(r.bossCost, defs[r.boss].cost); assert.ok(r.name.includes(String(r.n))); assert.equal(r.name, BOSS_NAMES[r.boss].replace('{n}', String(r.n))); }
    else assert.equal(r.name, 'Wave ' + r.n + ': ' + WAVE_NAMES[(r.n - 1) % WAVE_NAMES.length]);
  });
  assert.equal(rows[2].name, 'Wave 3: The Tax Collectors'); assert.equal(rows[6].name, 'Wave 7: Mildly Annoyed Titans'); assert.equal(rows.filter((r) => r.boss).length, 8);
  assert.deepEqual(rows.slice(0, 6).map((r) => r.style), STYLES.slice(0, 6)); assert.equal(waveStyle(7), STYLES[0]); assert.equal(rows[9].style, waveStyle(10));
});

await test('ramp: wave cost strictly rises with n (budget +900 per wave > one unit; waves at the 300-unit cap are exempt but stay within 80%), no wave is unwinnable by construction (a player keeping every unit alive always has > 1.5x the wave), leaderboard-scale cap holds', () => {
  for (let i = 1; i < rows.length; i++) { if (rows[i].count >= 299) continue; assert.ok(rows[i].cost > rows[i - 1].cost, 'cost not rising at wave ' + rows[i].n + ': ' + rows[i - 1].cost + ' -> ' + rows[i].cost); }   // waves at the unit cap are exempt (below)
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].cost >= 0.8 * rows[i - 1].cost, 'a cap-limited wave never drops below 80% of the one before: wave ' + rows[i].n);
  for (const r of rows.slice(0, 30)) { const pot = playerPotential(r.n); assert.ok(pot >= 1.5 * r.cost, 'wave ' + r.n + ' potential ' + pot + ' vs ' + r.cost); }
  assert.equal(playerPotential(1), 6000); assert.equal(playerPotential(2), 6000 + 1840); assert.equal(playerPotential(3), 6000 + 1840 + 2080);
  assert.ok(rows[0].cost < 3500 && rows[0].cost > 3000, 'wave 1 is a warm-up of about 3,300'); assert.ok(rows[19].cost <= 20400);
  // the first wave is beatable with the starting budget alone: 6,000 vs 3,300 is 1.8x
  assert.ok(playerPotential(1) / rows[0].cost > 1.7);
});

await test('deterministic per seed: same (n, seed) twice is identical; different seeds give different armies; against= changes only the counter style; bad n throws', () => {
  assert.deepEqual(survivalWave(4, 12), survivalWave(4, 12)); assert.notDeepEqual(survivalWave(4, 12).groups, survivalWave(4, 13).groups);
  assert.deepEqual(survivalWave(2, 5, { against: { hoplite: 30 } }), survivalWave(2, 5), 'wave 2 is a rush wave: the player army does not change it');
  assert.notDeepEqual(survivalWave(6, 5, { against: { cretan_archer: 40 } }).groups, survivalWave(6, 5, { against: { hoplite: 40 } }).groups, 'wave 6 is the counter style');
  assert.throws(() => survivalWave(0, 1)); assert.throws(() => survivalWave(2.5, 1));
});

await test('the table is what the sim spawns: survivalWave(n, seed) equals WaveSystem.compose(n) of a World with the same seed, and wave_spawn/wave_intermission carry its numbers', () => {
  const arena = generateArena('marathon', 'small', 3);
  const w = new World({ arena, seed: 9, defs, rules: survivalRules({}, { autoAdvance: false }) });
  assert.ok(w.waves instanceof WaveSystem);
  for (const n of [1, 2, 3, 5, 6, 10]) { const c = w.waves.compose(n), t = survivalWave(n, 9); assert.deepEqual(c.groups, t.groups, 'wave ' + n); assert.equal(c.cost, t.cost); assert.equal(c.name, t.name); assert.equal(c.boss, t.boss); }
  const ev = []; w.events.onAny((t, p) => { if (t === 'wave_spawn' || t === 'wave_intermission') ev.push([t, JSON.parse(JSON.stringify(p))]); });
  w.addUnit('hoplite', 0, -25, 0, {}); w.start();
  w.step(2);
  const spawn = ev.find((e) => e[0] === 'wave_spawn'); assert.ok(spawn); assert.equal(spawn[1].n, 1); assert.equal(spawn[1].count, survivalWave(1, 9).count);
  assert.equal(w.stats[1].startCost, survivalWave(1, 9).cost, 'the spawned army costs exactly the table cost');
});

await test('survivalRules: switches the wave system on, no time limit, an endless survive_waves objective, 6,000 start; placementBudget = start then 1,600 + 240 per cleared wave', () => {
  const r = survivalRules({ difficulty: 'hard', mutators: ['big_heads'], budget: 1 });
  assert.equal(r.timeLimit, 0); assert.equal(r.objective.type, 'survive_waves'); assert.ok(r.objective.params.waves >= 1e6, 'endless'); assert.ok(r.waves && r.waves.faction === 'mixed' && r.waves.interval === 40); assert.equal(r.budget, 6000); assert.equal(r.difficulty, 'hard'); assert.deepEqual(r.mutators, ['big_heads']);
  assert.equal(r.survival, true); assert.equal(survivalRules({}, { autoAdvance: false }).waves.autoAdvance, false);
  assert.equal(placementBudget(1), 6000); assert.equal(placementBudget(2), 1840); assert.equal(placementBudget(3), 2080); assert.equal(placementBudget(6), reinforceBudget(5));
  // a survival battle does not end at the 6-minute limit: run 6.5 minutes of an unwinnable-by-idle world and it is still running
  // negative control: WITHOUT the objective the first cleared wave ends the run as a win (the bug the objective prevents)
  { const nr = Object.assign(survivalRules({}, { autoAdvance: false }), { objective: null }), nw = new World({ arena: generateArena('arenalab', 'small', 1), seed: 1, defs, rules: nr }); const a = nw.addUnit('hoplite', 0, -25, 0, {}); a.hpMax = a.hp = 1e9; nw.start(); nw.step(2); for (const u of nw.units.slice()) if (u.team === 1) { u.alive = false; nw.stats[1].alive--; } nw.step(60); assert.equal(nw.state, 'ended', 'no objective: an emptied field ends the battle'); }
  const arena = generateArena('arenalab', 'small', 1), w = new World({ arena, seed: 1, defs, rules: survivalRules({}, { autoAdvance: false }) });
  const g = w.addUnit('hoplite', 0, -25, 0, {}); g.hpMax = g.hp = 1e9; w.start(); w.step(30 * 60); assert.notEqual(w.state, 'ended', 'still fighting after 60 s'); assert.ok(w.waves.n >= 1);
});

await test('score = waves x 1000 + kills x 10 + remaining cost; rounded, never negative', () => {
  assert.equal(survivalScore({ waves: 7, kills: 120, remainingCost: 3450 }), 7000 + 1200 + 3450); assert.equal(survivalScore({}), 0); assert.equal(survivalScore({ waves: 1, kills: 0, remainingCost: 0.6 }), 1001);
  const w = new World({ arena: generateArena('arenalab', 'small', 1), seed: 1, defs, rules: survivalRules({}) });
  w.addUnit('hoplite', 0, -25, 0, {}); w.start(); w.step(5); assert.equal(w.waves.score(), survivalScore({ waves: w.waves.cleared, kills: w.stats[0].kills, remainingCost: w.stats[0].aliveCost }), 'the sim\'s score() and the content score agree');
});

await test('leaderboard (local top 5): sorted by score, equal scores keep the older entry first, rank 0 when it misses, personal best, input untouched, 1,000 runs stay at 5 rows', () => {
  let st = null; const E = (score, waves, date) => ({ score, waves, date, arena: 'marathon' });
  const a = recordRun(st, E(5000, 3, '2026-10-01')); assert.equal(a.rank, 1); assert.equal(a.newBest, true); assert.equal(a.state.best, 5000); st = a.state;
  const b = recordRun(st, E(8000, 6, '2026-10-02')); assert.equal(b.rank, 1); assert.deepEqual(b.state.board.map((e) => e.score), [8000, 5000]); st = b.state;
  const c = recordRun(st, E(5000, 3, '2026-10-03')); assert.equal(c.rank, 3, 'tie goes below the older one'); assert.deepEqual(c.state.board.map((e) => e.date), ['2026-10-02', '2026-10-01', '2026-10-03']); assert.equal(c.newBest, false); st = c.state;
  for (let i = 0; i < 4; i++) st = recordRun(st, E(9000 + i, 7, '2026-10-1' + i)).state;
  assert.equal(st.board.length, 5); assert.deepEqual(st.board.map((e) => e.score), [9003, 9002, 9001, 9000, 8000]);
  const miss = recordRun(st, E(100, 1, '2026-10-20')); assert.equal(miss.rank, 0); assert.deepEqual(miss.state.board, st.board); assert.equal(miss.state.best, 9003);
  const snap = JSON.stringify(st); recordRun(st, E(99999, 20, 'x')); assert.equal(JSON.stringify(st), snap, 'input not mutated');
  let big = null; for (let i = 0; i < 1000; i++) big = recordRun(big, E((i * 37) % 1000, i % 9, 'd' + i)).state; assert.equal(big.board.length, 5); assert.ok(big.board.every((e, i, a) => i === 0 || a[i - 1].score >= e.score));
  assert.deepEqual(recordRun({ best: 7, board: [] }, E(3, 1, 'd')).state, { best: 7, board: [E(3, 1, 'd')] }); assert.equal(recordRun(null, { score: -5 }).state.board[0].score, 0);
  // the shape ui/hud/_progress.js survivalBoard reads: {best, board:[{score, waves, date, arena}]}
  assert.deepEqual(Object.keys(recordRun(null, E(1, 1, 'd')).state.board[0]).sort(), ['arena', 'date', 'score', 'waves']);
});

finish('survival');
