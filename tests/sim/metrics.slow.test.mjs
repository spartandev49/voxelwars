// Headless battle-quality metrics (S5-S9) + battle length (S12) + termination (S11) at reduced sample sizes. Slow: run by `node tests/sim/metrics.slow.test.mjs` / the full gate.
// The full-size versions (2,000 matchups, 400 mirror battles per arena, 200 fun battles per setup, 5,000 blueprints) live in tools/balance.mjs.
import { test, finish, assert, ST } from './_util.mjs';
import { buildWorld, getArena, DEFS, Metrics } from '../../tools/lib/harness.mjs';
import { generateArmy } from '../../src/sim/armygen.js';
import { RECIPES } from '../../src/world/gen.js';

function warBattle(recipe, seed, budget = 20000, size = 'large') {
  const arena = getArena(recipe, size, seed);
  const w = buildWorld({ arenaObj: arena, seed, start: false, rules: { timeLimit: 0 } });
  for (const t of [0, 1]) w.addPlacements(t, generateArmy({ faction: 'mixed', budget, style: 'balanced', arena, team: t, seed: seed * 3 + t, cap: 300 }).placements, { defs: DEFS });
  w.start(0);
  return w;
}
function blockedCount(w) {
  let bad = 0; const nav = w.nav;
  for (const u of w.units) {
    if (!u.alive || u.state === ST.SIT || u.state === ST.FLY || u.ky > 0 || u.kx * u.kx + u.kz * u.kz > 0.25 || u.y - w.arena.cellHeight(u.x, u.z) > 0.6) continue;
    if (!nav.walkable(u.x, u.z) && !nav.walkable(u.x + 0.4, u.z) && !nav.walkable(u.x - 0.4, u.z) && !nav.walkable(u.x, u.z + 0.4) && !nav.walkable(u.x, u.z - 0.4)) bad++;
  }
  return bad;
}

await test('S5-S8: 60 s of a ~200v200 War battle on marathon: overlap < 3%, in-contact idle < 3%, heading flips < 0.15 /unit-s, stuck < 1%', () => {
  const w = warBattle('marathon', 5); const n = w.units.length; assert.ok(n >= 300, 'army size ' + n);
  const m = new Metrics(w);
  while (w.state === 'running' && w.time < 60) { w.tick(); m.sample(); }
  const r = m.report();
  console.log('  ' + n + ' units  ' + JSON.stringify({ overlap: +r.overlap.toFixed(4), idle: +r.idleInContact.toFixed(4), flips: +r.flipsPerUnitSec.toFixed(3), stuck: +r.stuck.toFixed(4), contact: r.contactTicks }));
  assert.ok(r.contactTicks > 500, 'there was real contact: ' + r.contactTicks);
  assert.ok(r.overlap < 0.03, 'S5 overlap ' + (r.overlap * 100).toFixed(2) + '%');
  assert.ok(r.idleInContact < 0.03, 'S6 idle in contact ' + (r.idleInContact * 100).toFixed(2) + '%');
  assert.ok(r.flipsPerUnitSec < 0.15, 'S7 flips ' + r.flipsPerUnitSec.toFixed(3));
  assert.ok(r.stuck < 0.01, 'S8 stuck ' + (r.stuck * 100).toFixed(2) + '%');
});

await test('S5-S8 (open arenas): colosseum and persepolis stay inside the same bars on a 100v100 battle', () => {
  for (const [recipe, seed] of [['colosseum', 4], ['persepolis', 6]]) {
    const w = warBattle(recipe, seed, 10000, 'large'); const m = new Metrics(w);
    while (w.state === 'running' && w.time < 60) { w.tick(); m.sample(); }
    const r = m.report();
    console.log('  ' + recipe + ' ' + w.units.length + ' units  ' + JSON.stringify({ overlap: +r.overlap.toFixed(4), idle: +r.idleInContact.toFixed(4), flips: +r.flipsPerUnitSec.toFixed(3), stuck: +r.stuck.toFixed(4) }));
    assert.ok(r.overlap < 0.05 && r.idleInContact < 0.03 && r.flipsPerUnitSec < 0.15 && r.stuck < 0.01, recipe + ' ' + JSON.stringify(r));
  }
});

await test('S9: no grounded, non-knockback unit stands in a blocking prop, deep water or lava over 20 battles (sampled every 0.5 s)', () => {
  let bad = 0, samples = 0;
  const recipes = RECIPES.filter((r) => r !== 'random');
  for (let k = 0; k < 20; k++) {
    const recipe = recipes[k % recipes.length], seed = 1 + k;
    const w = warBattle(recipe, seed, 2500, 'medium');
    while (w.state === 'running' && w.time < 40) { w.tick(); if ((w.tickN % 15) === 0) { bad += blockedCount(w); samples++; } }
  }
  assert.ok(samples > 400);
  assert.equal(bad, 0, bad + ' unit-samples inside blocked cells');
});

await test('S11: termination fuzz (200 random matchups x random arenas): >= 99% end with reason != time inside 6 sim-minutes; the timeLimit=20 negative control fails the bar', () => {
  const recipes = RECIPES, factions = ['hellenes', 'romans', 'egyptians', 'persians', 'barbarians', 'carthage', 'mythic', 'mixed'];
  let ended = 0, ncEnded = 0; const N = 200, NC = 20; const reasons = {}; const lens = [];
  const play = (k, tl) => {
    const recipe = recipes[(k * 7) % recipes.length], arena = getArena(recipe, 'medium', 1 + (k % 30));
    const budget = 600 + (k * 37) % 1500;
    const w = buildWorld({ arenaObj: arena, seed: 900 + k, start: false, rules: { timeLimit: tl, difficulty: ['easy', 'normal', 'hard'][k % 3] } });
    for (const t of [0, 1]) w.addPlacements(t, generateArmy({ faction: factions[(k + t * 3) % factions.length], budget, style: ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'][(k + t) % 6], arena, team: t, seed: 40 + k * 2 + t }).placements, { defs: DEFS });
    w.start(0);
    while (w.state === 'running' && w.time < tl + 5) w.tick();
    return w;
  };
  for (let k = 0; k < N; k++) { const w = play(k, 360); reasons[w.endReason] = (reasons[w.endReason] || 0) + 1; lens.push(w.time); if (w.endReason !== 'time' && w.state === 'ended') ended++; }
  for (let k = 0; k < NC; k++) { const w = play(k, 20); if (w.endReason !== 'time') ncEnded++; }
  console.log('  reasons ' + JSON.stringify(reasons) + '  NC ended-before-time ' + ncEnded + '/' + NC);
  assert.ok(ended / N >= 0.99, 'ended ' + ended + '/' + N + ' ' + JSON.stringify(reasons));
  assert.ok(ncEnded / NC < 0.99, 'negative control must fail the bar (timeLimit 20 ends by time)');
});

await test('S12: default armies (the 8,000 Battle preset; 3,000 sanity-checked): battle length median 60-120 s, p90 <= 180 s', () => {
  const lens = { 3000: [], 8000: [] };
  for (const [budget, size, n] of [[3000, 'medium', 14], [8000, 'large', 6]]) {
    for (let k = 0; k < n; k++) {
      const w = warBattle('marathon', 70 + k, budget, size); w.rules.timeLimit = 360;
      while (w.state === 'running' && w.time < 366) w.tick();
      lens[budget].push(w.time);
    }
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], p90 = (a) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * 0.9))];
  console.log('  3000: median ' + med(lens[3000]).toFixed(0) + ' p90 ' + p90(lens[3000]).toFixed(0) + '   8000: median ' + med(lens[8000]).toFixed(0) + ' p90 ' + p90(lens[8000]).toFixed(0));
  // the default army is the 8,000 'Battle' preset (spec section 14); the 3,000 'Skirmish' preset is a small fight and is only sanity-checked
  assert.ok(med(lens[8000]) >= 60 && med(lens[8000]) <= 120, '8000 median ' + med(lens[8000])); assert.ok(p90(lens[8000]) <= 180, '8000 p90 ' + p90(lens[8000]));
  assert.ok(med(lens[3000]) >= 40 && p90(lens[3000]) <= 180, '3000 median ' + med(lens[3000]));
});

finish('sim metrics (slow)');
