// UI19 (data side): the Daily Skirmish plan is deterministic per date key, agrees with the screen's own plan (ui/screens/_daily_plan.js) and never reads the clock.
import { test, finish, assert } from '../sim/_util.mjs';
import { dailyKey, keyOfParts, parseKey, addDays, dailyPlan, dailySetup, dailyEnemy, resultString, streakOf, seedOf, DAILY_BUDGET, STYLES } from '../../src/content/era_ancient/daily.js';
import * as UI from '../../src/ui/screens/_daily_plan.js';
import { ARENAS } from '../../src/content/era_ancient/arenas.js';
import { FACTIONS } from '../../src/content/era_ancient/stats.js';
import { MUTATORS } from '../../src/sim/mutators.js';
import { generateArena } from '../../src/world/gen.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import fs from 'node:fs';

const content = { arenas: ARENAS, mutators: MUTATORS, factions: FACTIONS };
const keys = []; { let k = '2026-01-01'; for (let i = 0; i < 400; i++) { keys.push(k); k = addDays(k, 1); } }

await test('dailyKey: local calendar day of a Date, throws without one, month/day padding, leap day', () => {
  assert.equal(dailyKey(new Date(2026, 9, 6, 23, 59)), '2026-10-06');
  assert.equal(dailyKey(new Date(2026, 0, 5, 0, 0)), '2026-01-05');
  assert.equal(dailyKey(new Date(2028, 1, 29, 12)), '2028-02-29');
  assert.throws(() => dailyKey(), /valid Date/);
  assert.throws(() => dailyKey(new Date('nope')), /valid Date/);
  assert.equal(keyOfParts(2026, 3, 9), '2026-03-09');
  assert.deepEqual(parseKey('2026-10-06'), { y: 2026, m: 10, d: 6 }); assert.equal(parseKey('2026-1-6'), null);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01'); assert.equal(addDays('2028-03-01', -1), '2028-02-29'); assert.equal(seedOf('2026-10-06'), 20261006);
});

await test('plan is a pure function of the key: same key twice and in any order gives deep-equal plans; different days differ', () => {
  const a = keys.map((k) => dailyPlan(k)), b = keys.slice().reverse().map((k) => dailyPlan(k)).reverse();
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((p) => p.arenaId + '|' + p.factionA + '|' + p.factionB + '|' + p.enemyStyle + '|' + p.mutator)).size > 300, true, 'a year of days is not 400 copies of a few plans');
  assert.notDeepEqual(dailyPlan('2026-10-06'), dailyPlan('2026-10-07'));
});

await test('plan agrees with the screen\'s plan (ui/screens/_daily_plan.js) for 400 dates and with a content list passed explicitly', () => {
  for (const k of keys) assert.deepEqual(dailyPlan(k), UI.dailyPlan(k, content), k);
  for (const k of keys.slice(0, 40)) assert.deepEqual(dailyPlan(k, content), dailyPlan(k));
  assert.equal(DAILY_BUDGET, UI.DAILY_BUDGET); assert.deepEqual(STYLES, UI.STYLES);
  // the screen's streak and result string are the same functions of the same inputs
  const hist = [{ date: '2026-10-06' }, { date: '2026-10-05' }, { date: '2026-10-04' }, { date: '2026-10-01' }];
  assert.equal(streakOf(hist, '2026-10-06'), UI.streakOf(hist, '2026-10-06')); assert.equal(streakOf(hist, '2026-10-06'), 3);
  assert.equal(streakOf(hist, '2026-10-07'), 3, 'yesterday still counts'); assert.equal(streakOf(hist, '2026-10-08'), 0);
  const plan = dailyPlan('2026-10-06'), r = { winner: 0, time: 125, teams: [{ alive: 12, dead: 18, startCount: 30 }, {}] };
  assert.equal(resultString(plan, r, { [plan.factionA]: 'A', [plan.factionB]: 'B' }), UI.resultString(plan, r, { [plan.factionA]: 'A', [plan.factionB]: 'B' }));
  assert.match(resultString(plan, r), /^VOXELWARS Daily 2026-10-06 \| .+ \| .+ vs .+ \| WIN in 2:05 \| 40% of the army left \| seed 20261006$/);
  assert.ok(/^[\x20-\x7e]+$/.test(resultString(plan, r)), 'plain ASCII');
});

await test('plan content is legal: real arena preset (never arenalab/random), two different factions, a known style, a known mutator or none, budget 3,000', () => {
  const ar = new Set(ARENAS.filter((a) => a.id !== 'arenalab' && a.id !== 'random').map((a) => a.id)), seen = { arena: new Set(), mut: new Set(), style: new Set() };
  for (const k of keys) {
    const p = dailyPlan(k);
    assert.ok(ar.has(p.arenaId), p.arenaId); assert.ok(FACTIONS[p.factionA] && FACTIONS[p.factionB]); assert.notEqual(p.factionA, p.factionB);
    assert.ok(STYLES.includes(p.enemyStyle)); assert.ok(p.mutator === null || MUTATORS.some((m) => m.id === p.mutator));
    assert.equal(p.budget, 3000); assert.equal(p.difficulty, 'normal'); assert.ok(p.arenaSeed >= 1 && p.arenaSeed <= 100000);
    seen.arena.add(p.arenaId); seen.style.add(p.enemyStyle); if (p.mutator) seen.mut.add(p.mutator);
  }
  assert.equal(seen.arena.size, ar.size, 'every arena comes up within 400 days'); assert.equal(seen.style.size, STYLES.length); assert.ok(seen.mut.size >= 8);
});

await test('every 20th plan of a year builds: its arena generates, the setup is complete, the enemy army respects the 3,000 budget', () => {
  const defs = buildSimDefs();
  for (const k of keys.filter((_, i) => i % 20 === 0)) {
    const p = dailyPlan(k), s = dailySetup(p);
    assert.equal(s.armies.A.faction, p.factionA); assert.equal(s.armies.B.style, p.enemyStyle); assert.equal(s.rules.daily, k); assert.deepEqual(s.rules.mutators, p.mutator ? [p.mutator] : []);
    const a = generateArena(s.arena.presetId, s.arena.size, s.arena.seed); assert.ok(a.zones.A && a.zones.B);
    const e = dailyEnemy(p, defs); assert.ok(e.cost <= 3000 && e.cost > 3000 - 400, k + ' cost ' + e.cost); assert.ok(e.groups.length >= 1);
    assert.deepEqual(dailyEnemy(p, defs), e, 'the enemy of a day is identical on every call');
  }
});

await test('purity: daily.js never reads the clock or the RNG (static check) and no machine-dependent input exists', () => {
  const src = fs.readFileSync(new URL('../../src/content/era_ancient/daily.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/Date\.now|new Date\(\)|Math\.random|performance\.now/.test(src), 'no clock / Math.random in daily.js');
});

finish('daily');
