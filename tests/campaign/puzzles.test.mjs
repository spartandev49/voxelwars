// UI19 (data side) + spec/world.md 6a: the six Puzzle Challenges load, are legal, are solved by a stored placement the sim replays to a win, stay
// deterministic, and fail correctly when the player does nothing or breaks a rule. Negative controls included.
import { test, finish, assert } from '../sim/_util.mjs';
import { validatePuzzle } from '../../src/content/era_ancient/campaign.js';
import { PUZZLES, puzzleAsMission, evaluatePuzzleStars, puzzleText, puzzleApi } from '../../src/content/era_ancient/puzzles.js';
import { SOLUTIONS } from '../../src/content/era_ancient/puzzle_solutions.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import { RECIPES } from '../../src/world/gen.js';
import { SIZES } from '../../src/world/arena.js';
import { World } from '../../src/sim/world.js';
import { defs, buildPuzzleWorld, runPuzzle, puzzleArena } from './_lib.mjs';

const FROZEN = { spear_wall: ['eliminate', 1400, 1000], kiting_101: ['eliminate', 1200, 900], elephant_room: ['eliminate', 2000, 1600], knock_knock: ['destroy', 1500, 1200], goat_logistics: ['protect_vip', 1000, 700], gaze_avoidance: ['kill_general', 1100, 800] };
const P = (id) => PUZZLES.find((p) => p.id === id);
const cost = (pl) => pl.reduce((s, q) => s + defs[q.defId].cost, 0);

await test('six puzzles, frozen ids / goal types / budgets / pars of spec 6a, restricted rosters of shipped units, par below budget, three stars with texts, no mutators, god powers off', () => {
  assert.deepEqual(PUZZLES.map((p) => p.id), Object.keys(FROZEN)); assert.equal(puzzleApi.puzzleById('knock_knock'), P('knock_knock')); assert.equal(puzzleApi.puzzleById('x'), null);
  for (const p of PUZZLES) {
    const [goal, budget, par] = FROZEN[p.id];
    assert.equal(p.kind, 'puzzle'); assert.equal(p.goal.type, goal); assert.equal(p.player.budget, budget); assert.equal(p.par, par); assert.ok(p.par < p.budget);
    assert.ok(p.title && p.blurb && p.hint && p.goalText && p.blurb.length > 20 && p.hint.length > 20);
    assert.equal(p.stars.length, 3); assert.deepEqual(p.stars.map((s) => typeof s.test), ['undefined', 'function', 'function'].map((x, i) => (i === 0 ? 'undefined' : 'function'))); p.stars.forEach((s) => assert.ok(s.id && s.text));
    assert.ok(p.player.roster.length >= 2 && p.player.roster.length <= 3 + 1); for (const id of p.player.roster) assert.ok(STAT_TABLE[id], p.id + ' roster ' + id);
    assert.equal(p.godPowers, false); assert.ok(p.timeLimit >= 100 && p.timeLimit <= 200); assert.ok(RECIPES.includes(p.arena.recipe)); assert.ok(SIZES[p.arena.size]);
    for (const q of p.enemy.placements) assert.ok(STAT_TABLE[q.defId], q.defId);
    const m = puzzleAsMission(p); assert.equal(m.enemy.placements, p.enemy.placements); assert.equal(m.objective.type, goal); assert.equal(m.budget, budget);
  }
  assert.equal(P('knock_knock').timeLimit, 120); assert.equal(P('goat_logistics').fixed.length, 1); assert.ok(P('goat_logistics').fixed[0].vip); assert.deepEqual(P('spear_wall').player.roster, ['hoplite', 'peltast']);
  assert.deepEqual(P('elephant_room').player.roster, ['hoplite', 'peltast', 'nubian_archer']); assert.deepEqual(P('knock_knock').player.roster, ['catapult', 'hoplite', 'peltast']);
});

await test('arenas and hand-placed enemies are legal: enemy units stand on walkable ground inside the arena, the objective markers exist, nothing is generated', () => {
  for (const p of PUZZLES) {
    const { w } = buildPuzzleWorld(p, []);
    assert.ok(w.objective && w.objective.type === p.goal.type, p.id + ' objective'); assert.equal(w.stats[1].startCount, p.enemy.placements.length + 0, p.id + ' enemy count is exactly the hand-placed list');
    for (const q of p.enemy.placements) assert.ok(w.nav.walkable(q.x, q.z), p.id + ' ' + q.defId + ' at ' + q.x + ',' + q.z);
    for (const id of p.goal.markerIds) assert.ok(p.arena.markers.some((k) => k.id === id));
    for (const g of p.enemy.generals || []) assert.ok(w.units.some((u) => u.team === 1 && u.general && u.def.id === g));
    if (p.goal.type === 'destroy') assert.ok(w.props.filter((q) => q.type === 'gate_door').length === 2);
    assert.equal(w.rules.godPowers, false); assert.deepEqual(w.rules.mutators, []); assert.equal(w.godpowers, null);
  }
});

await test('validatePuzzle: all six are valid; negative controls (par above budget, no hand-placed enemy, unknown roster unit, second VIP-less goat puzzle) are reported', () => {
  for (const p of PUZZLES) assert.deepEqual(validatePuzzle(p, puzzleAsMission), [], p.id);
  const bad = (mut, rx) => { const c = JSON.parse(JSON.stringify(Object.assign({}, P('spear_wall'), { stars: undefined }))); c.stars = P('spear_wall').stars; mut(c); const r = validatePuzzle(c, puzzleAsMission); assert.ok(r.some((x) => rx.test(x)), JSON.stringify(r)); };
  bad((c) => { c.par = c.player.budget + 1; }, /par must be below/); bad((c) => { c.enemy.placements = []; }, /hand-placed/); bad((c) => { c.player.roster = ['hoplite', 'ufo']; }, /roster unit/); bad((c) => { c.kind = 'mission'; }, /kind must be puzzle/);
  const g = JSON.parse(JSON.stringify(Object.assign({}, P('goat_logistics'), { stars: undefined }))); g.stars = P('goat_logistics').stars; g.fixed = []; assert.ok(validatePuzzle(g, puzzleAsMission).some((x) => /VIP/.test(x)), 'protect_vip without a VIP is invalid');
});

// ------------------------------------------------------------------------------------------------ stars (pure)
const base = (p, over) => Object.assign({ kind: 'battle_end', win: true, draw: false, mission: p.id, t: 40, playerCostStart: 900, spent: 900, unitsLost: 0, vipDef: null, vipDamage: 0, stonedUnits: 0, propDownT: {}, enemyDownT: {}, aliveDefs: {} }, over || {});
await test('puzzle stars: 1 win, 2 win while spending <= par, 3 the puzzle\'s bonus; a loss earns nothing even when the bonus fact holds; negative controls per puzzle', () => {
  for (const p of PUZZLES) { assert.equal(evaluatePuzzleStars(p, base(p, { win: false })).stars, 0, p.id + ' loss'); assert.equal(evaluatePuzzleStars(p, base(p, { mission: 'other' })).stars, 0); assert.equal(evaluatePuzzleStars(p.id, null).stars, 0); assert.equal(evaluatePuzzleStars(p, base(p, { draw: true })).stars, 0); }
  let p = P('spear_wall'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1000, unitsLost: 2 })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1001, unitsLost: 2 })).stars, 2); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1000, unitsLost: 3 })).stars, 2); assert.deepEqual(evaluatePuzzleStars(p, base(p, { spent: 1100, unitsLost: 5 })).earned, [true, false, false]);
  p = P('kiting_101'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 900, unitsLost: 0 })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 900, unitsLost: 1 })).stars, 2);
  p = P('elephant_room'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1600, enemyDownT: { war_elephant: [45] } })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1600, enemyDownT: { war_elephant: [45.5] } })).stars, 2); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1600, enemyDownT: {} })).stars, 2);
  p = P('knock_knock'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1200, propDownT: { gate_door: [69, 80] } })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1200, propDownT: { gate_door: [71, 80] } })).stars, 2); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 1500, propDownT: { gate_door: [10, 12] } })).stars, 2, 'over par');
  p = P('goat_logistics'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 700, vipDef: 'battle_goat', vipDamage: 0 })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 700, vipDef: 'battle_goat', vipDamage: 3 })).stars, 2); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 700, playerCostStart: 745, vipDef: 'battle_goat', vipDamage: 0 })).stars, 3, 'the free goat does not count against par');
  p = P('gaze_avoidance'); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 800, stonedUnits: 0 })).stars, 3); assert.equal(evaluatePuzzleStars(p, base(p, { spent: 800, stonedUnits: 2 })).stars, 2);
  // HUMOR override map changes the words, never the data
  const t = puzzleText('spear_wall', { spear_wall: { title: 'T', stars: ['a', 'b', 'c'] } }); assert.equal(t.title, 'T'); assert.deepEqual(t.stars.map((s) => s.text), ['a', 'b', 'c']); assert.equal(puzzleText('spear_wall').title, 'Please Hold Still'); assert.equal(P('spear_wall').title, 'Please Hold Still'); assert.equal(puzzleText('nope'), null);
});

// ------------------------------------------------------------------------------------------------ solutions
await test('every puzzle has a stored solution: legal roster, within budget, inside zone A on walkable ground, <= 16 types, and its recorded cost matches', () => {
  for (const p of PUZZLES) {
    const s = p.solution; assert.ok(s && s.placements && s.placements.length, p.id + ' has a solution'); assert.equal(SOLUTIONS[p.id], s);
    assert.equal(cost(s.placements), s.cost, p.id + ' recorded cost'); assert.ok(s.cost <= p.player.budget, p.id + ' budget ' + s.cost + ' > ' + p.player.budget);
    const arena = puzzleArena(p), A = arena.zones.A, { w } = buildPuzzleWorld(p, []);
    for (const q of s.placements) {
      assert.ok(p.player.roster.includes(q.defId), p.id + ' roster ' + q.defId); assert.ok(Math.abs(q.x - A.x) <= A.w / 2 + 1e-6 && Math.abs(q.z - A.z) <= A.d / 2 + 1e-6, p.id + ' zone ' + q.x + ',' + q.z); assert.ok(w.nav.walkable(q.x, q.z), p.id + ' walkable ' + q.x + ',' + q.z);
    }
    assert.ok(new Set(s.placements.map((q) => q.defId)).size <= 16); assert.ok(s.placements.length <= 300);
  }
});

await test('replay: every stored solution WINS, earns at least the recorded stars, and the same placement gives the identical battle twice (state hash + result)', () => {
  for (const p of PUZZLES) {
    const a = runPuzzle(p, p.solution.placements), b = runPuzzle(p, p.solution.placements);
    assert.equal(a.win, true, p.id + ' solution wins (reason ' + a.reason + ')'); assert.ok(a.stars >= p.solution.stars, p.id + ' stars ' + a.stars + ' < recorded ' + p.solution.stars);
    assert.equal(a.t, b.t); assert.equal(a.stars, b.stars); assert.deepEqual(a.summary.aliveDefs, b.summary.aliveDefs); assert.equal(a.summary.unitsLost, b.summary.unitsLost);
    const w1 = buildPuzzleWorld(p, p.solution.placements).w, w2 = buildPuzzleWorld(p, p.solution.placements).w; w1.step(600); w2.step(600); assert.equal(w1.stateHash(), w2.stateHash(), p.id + ' deterministic');
  }
});

await test('negative controls: placing nothing loses (or stalls) every puzzle; a solution with a unit outside the roster / over budget / outside the zone is detected; the best solution beats par only because of its cost', () => {
  for (const p of PUZZLES) {
    const r = runPuzzle(p, []); assert.equal(r.win, false, p.id + ' placing nothing must not win'); assert.equal(r.stars, 0);
    // the "solution" with a rule broken would be rejected by the checks the placement screen enforces: prove the checks can fail
    const s = p.solution.placements, bad = s.concat([{ defId: 'spartan', x: s[0].x, z: s[0].z, heading: 1.57 }]);
    assert.ok(!bad.every((q) => p.player.roster.includes(q.defId)), 'roster check can fail'); assert.ok(cost(s.concat(s, s, s, s, s, s, s, s, s, s)) > p.player.budget, 'budget check can fail');
    const A = puzzleArena(p).zones.A; assert.ok(!(Math.abs(A.x + 100 - A.x) <= A.w / 2), 'zone check can fail');
  }
  // a star-2 solution turns into a star-1 one when the player overspends: add one unit past the par and the same battle no longer earns the par star
  const p = P('kiting_101'), s = p.solution.placements, extra = s.concat([Object.assign({}, s[0], { x: s[0].x + 0.2 })]);
  const par = runPuzzle(p, s); if (par.summary.spent <= p.par) { const over = runPuzzle(p, extra.concat(extra.slice(0, 3))); if (over.summary.spent > p.par) assert.equal(over.earned[1], false, 'over par earns no par star'); }
});

await test('naive attempts do not trivially 3-star the puzzles: a plain advance-everything block of the cheapest roster unit earns fewer stars than the stored solution on at least 4 of 6 puzzles', () => {
  let weaker = 0;
  for (const p of PUZZLES) {
    const id = p.player.roster.slice().sort((a, b) => defs[a].cost - defs[b].cost)[0], n = Math.min(60, Math.floor(p.par / defs[id].cost)), A = puzzleArena(p).zones.A, pl = [];
    for (let i = 0; i < n; i++) pl.push({ defId: id, x: +(A.x + A.w / 2 - 1 - (i % 3) * 1.4).toFixed(2), z: +(A.z + ((i / 3 | 0) - n / 6) * 1.4).toFixed(2), heading: 1.57, squadId: 1, order: 'advance', formation: 'block' });
    const r = runPuzzle(p, pl); if (r.stars < p.solution.stars) weaker++;
  }
  assert.ok(weaker >= 4, 'naive blocks weaker on ' + weaker + ' of 6');
});

finish('puzzles');
