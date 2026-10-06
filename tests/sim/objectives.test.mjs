// S17: eliminate, kill_general, hold_hill, protect_vip, survive_waves, destroy (+ timeout) complete and fail correctly in scripted worlds. W7: survival waves.
import { world, add, block, sentinels, record, run, count, stepUntil, defs, SE, ST, pin, test, finish, assert, generateArena } from './_util.mjs';
import { applyDamage, newHit } from '../../src/sim/combat.js';
import { waveBudget, reinforceBudget, waveStyle, isBossWave, bossOf, waveName, WaveSystem } from '../../src/sim/waves.js';
import { STYLES } from '../../src/sim/armygen.js';

const arenaWith = (markers, props) => { const a = generateArena('arenalab', 'small', 1); a.markers = markers || []; if (props) a.props = props; return a; };
const kill = (w, u) => { u.hp = 1; const h = newHit(); h.noBlock = true; applyDamage(w, null, u, 9999, h); };
const NM = { morale: false };

await test('eliminate: wins when all enemies die (objective progress), loses when the player dies', () => {
  const w = world({ rules: Object.assign({ objective: { type: 'eliminate' } }, NM) }); const log = record(w, ['objective_update', 'battle_end']);
  const mine = block(w, 'hoplite', 0, 3, -5, 0), foes = block(w, 'hoplite', 1, 4, 5, 0);
  foes.forEach((f, i) => { if (i < 3) kill(w, f); }); run(w, 0.5); assert.ok(w.objective.progress > 0.7 && w.objective.progress < 1);
  kill(w, foes[3]); run(w, 0.3);
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(log.find((e) => e[0] === 'battle_end')[1].reason, 'elimination');
  const l = world({ rules: Object.assign({ objective: { type: 'eliminate' } }, NM) }); add(l, 'hoplite', 0, -5, 0); const f = add(l, 'hoplite', 1, 5, 0); kill(l, l.units[0]); run(l, 0.3); assert.equal(l.winner, 1);
});
await test('kill_general: killing the flagged enemy general wins ("objective"); the general avoids contact', () => {
  const w = world({ rules: Object.assign({ objective: { type: 'kill_general' } }, NM) }); const log = record(w, ['battle_end', 'objective_update']);
  const mine = block(w, 'hoplite', 0, 8, -4, 0); const gen = add(w, 'pharaoh', 1, 8, 0, { general: true }); block(w, 'hoplite', 1, 6, 12, 5);
  assert.ok(gen.general && w.objective);
  const x0 = gen.x; run(w, 4);
  assert.ok(gen.guard, 'general guards'); assert.ok(gen.x > x0 - 1.5, 'general does not advance to meet the army: x ' + gen.x.toFixed(1));
  mine.forEach((m) => { m.x = gen.x - 1 + Math.random() * 0; });
  kill(w, gen); run(w, 0.3);
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); const be = log.find((e) => e[0] === 'battle_end')[1]; assert.equal(be.reason, 'objective');
  assert.ok(count(log, 'objective_update', (p) => p.state === 'complete') >= 1);
});
await test('hold_hill: cumulative time with an ally inside and no enemy inside; contested pauses; win = objective', () => {
  const a = arenaWith([{ id: 'h1', type: 'hill', x: 0, z: 0, r: 6 }]);
  const w = world({ arenaObj: a, rules: Object.assign({ objective: { type: 'hold_hill', params: { time: 20 }, markerIds: ['h1'] } }, NM) }); const log = record(w, ['battle_end', 'objective_update']);
  const mine = pin(add(w, 'hoplite', 0, 1, 0)), foe = pin(add(w, 'hoplite', 1, 20, 20)); sentinels(w);
  run(w, 10); assert.ok(Math.abs(w.objective.progress - 0.5) < 0.05, 'half way ' + w.objective.progress);
  foe.x = 2; foe.z = 0; run(w, 5); assert.ok(Math.abs(w.objective.progress - 0.5) < 0.05, 'contested: no progress'); assert.equal(w.objective.state, 'contested');
  foe.x = 20; foe.z = 20; run(w, 9.8); assert.equal(w.state, 'running'); run(w, 0.6);
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(log.find((e) => e[0] === 'battle_end')[1].reason, 'objective');
  // lost when nobody holds it and the player dies
  const l = world({ arenaObj: a, rules: Object.assign({ objective: { type: 'hold_hill', params: { time: 20 } } }, NM) }); const m2 = add(l, 'hoplite', 0, -20, 0); add(l, 'hoplite', 1, 20, 0); kill(l, m2); run(l, 0.3); assert.equal(l.winner, 1);
});
await test('protect_vip: VIP death loses; surviving T seconds wins; reaching the exit marker wins', () => {
  const a = arenaWith([{ id: 'exit', type: 'exit', x: 10, z: 0, r: 3 }]);
  const mk = (extra, rules) => { const w = world({ arenaObj: a, rules: Object.assign({ objective: Object.assign({ type: 'protect_vip', params: { time: 15 } }, extra) }, NM, rules || {}) }); const g = add(w, 'battle_goat', 0, -10, 0, { vip: true }); sentinels(w); return [w, g]; };
  let [w, g] = mk({ markerIds: [] }); pin(g); kill(w, g); run(w, 0.3); assert.equal(w.winner, 1, 'vip died: lose');
  [w, g] = mk({ markerIds: [] }); pin(g); w.objective.exit = null; run(w, 14.5); assert.equal(w.state, 'running'); run(w, 1); assert.equal(w.winner, 0, 'survived T');
  [w, g] = mk({ markerIds: ['exit'] }); pin(g); g.x = 9; g.z = 0; run(w, 0.3); assert.equal(w.winner, 0, 'reached the exit');
  assert.ok(w.objective.vip === g);
});
await test('survive_waves: stragglers do not hold the intermission hostage (<= 25% of the wave for 4 s, or only routed units for 3 s); removeUnit works during an intermission', () => {
  const w = world({ rules: { morale: false, timeLimit: 0, objective: { type: 'survive_waves', params: { waves: 3 } }, waves: { autoAdvance: false } }, size: 'medium' }); const log = record(w, ['wave_spawn', 'wave_intermission']);
  block(w, 'hoplite', 0, 4, -30, 25); w.units.forEach((u) => { u.hp = u.hpMax = 1e9; pin(u); });                  // the player's army is far away and harmless: only the wave rules are tested
  run(w, 1); assert.equal(w.waves.state, 'fighting'); const wave = w.units.filter((u) => u.team === 1); assert.ok(wave.length >= 10);
  // kill all but ceil(10%) of the wave and pin the survivors: they never die, never move
  const keep = Math.max(1, Math.ceil(wave.length * 0.1));
  for (let i = keep; i < wave.length; i++) { const u = wave[i]; if (u.alive) w.lightning(u.x, u.z, 9999, 0.5, null); }
  run(w, 1);
  const left = w.units.filter((u) => u.alive && u.team === 1); assert.ok(left.length <= keep + 1, 'stragglers left ' + left.length + ' of ' + keep);
  left.forEach((u) => { pin(u); u.hp = u.hpMax = 1e9; });
  stepUntil(w, 8, () => w.waves.state === 'intermission'); assert.equal(w.waves.state, 'intermission', 'a handful of stragglers is a cleared wave after 4 s');
  assert.equal(count(log, 'wave_intermission'), 1); assert.ok(w.waves.timer < 20);
  // the Game removes units while the world is in the intermission
  const u = w.units.find((x) => x.team === 0); assert.equal(w.removeUnit(u), true, 'removeUnit is allowed in a survival intermission'); assert.ok(!w.units.includes(u));
  w.waves.next(); run(w, 1); assert.equal(w.removeUnit(w.units[0]), false, 'but not while the wave is fighting');
});
await test('survive_waves (W7): wave n budget 2400+900n, style rotation, boss every 5th, intermission budget 1600+240n, win after N cleared, defeat when the army dies', () => {
  assert.deepEqual([1, 2, 3, 10].map(waveBudget), [3300, 4200, 5100, 11400]); assert.equal(reinforceBudget(3), 2320);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(waveStyle), ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter', 'balanced']);
  assert.deepEqual([5, 10, 15, 20, 25].map(bossOf), ['minotaur', 'cyclops', 'war_elephant', 'medusa', 'pharaoh']); assert.ok(isBossWave(5) && !isBossWave(6));
  assert.ok(/^Wave 3: /.test(waveName(3)) && /^Wave 5: /.test(waveName(5)));
  const w = world({ rules: { morale: false, timeLimit: 0, objective: { type: 'survive_waves', params: { waves: 2 } }, waves: { autoAdvance: false } }, size: 'medium' }); const log = record(w, ['wave_spawn', 'wave_intermission', 'battle_end', 'objective_update']);
  assert.ok(w.waves instanceof WaveSystem);
  block(w, 'spartan', 0, 40, -10, 0, { spacing: 1.4 }); block(w, 'strategos', 0, 3, -16, 0);
  w.units.forEach((u) => { u.hp = u.hpMax = u.hpMax * 30; });          // an invincible-ish army so the waves are what is tested
  run(w, 2); assert.equal(count(log, 'wave_spawn'), 1); const c1 = w.waves.lastArmy; assert.equal(c1.n, 1); assert.ok(c1.cost <= 3300 && c1.cost > 3300 - 400, 'wave 1 cost ' + c1.cost);
  stepUntil(w, 120, () => w.waves.state === 'intermission');
  assert.equal(w.waves.state, 'intermission'); assert.equal(count(log, 'wave_intermission'), 1); assert.equal(log.find((e) => e[0] === 'wave_intermission')[1].budget, 1840);
  assert.equal(w.state, 'running', 'enemy elimination between waves does not end the battle');
  w.waves.next(); run(w, 1); assert.equal(count(log, 'wave_spawn'), 2);
  stepUntil(w, 150, () => w.state === 'ended'); assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(log.find((e) => e[0] === 'battle_end')[1].reason, 'objective');
  assert.equal(w.waves.cleared, 2); assert.ok(w.waves.score() >= 2000);
  // defeat: all player units dead
  const l = world({ rules: { morale: false, timeLimit: 0, objective: { type: 'survive_waves', params: { waves: 3 } }, waves: { autoAdvance: false } }, size: 'medium' }); add(l, 'peltast', 0, -10, 0); run(l, 60);
  assert.equal(l.state, 'ended'); assert.equal(l.winner, 1);
  // boss wave composition
  const w5 = world({ rules: { morale: false, timeLimit: 0, waves: { autoAdvance: false } }, size: 'medium' }); add(w5, 'hoplite', 0, -10, 0); const c5 = w5.waves.compose(5);
  assert.ok(c5.boss === 'minotaur' && c5.groups.some((g) => g.defId === 'minotaur') && c5.cost <= waveBudget(5) && c5.cost > waveBudget(5) - 400);
});
await test('destroy: gate_door x2 (+ eliminate) completes only when both gates are down and the enemy is gone', () => {
  const props = [{ t: 'gate_door', x: 6, z: -3, r: 0, s: 1 }, { t: 'gate_door', x: 6, z: 3, r: 0, s: 1 }, { t: 'tower', x: 8, z: 0, r: 0, s: 1 }];
  const a = arenaWith([], props);
  const w = world({ arenaObj: a, rules: Object.assign({ objective: { type: 'destroy', params: { props: [{ type: 'gate_door', count: 2 }], eliminate: true } } }, NM) }); const log = record(w, ['battle_end', 'objective_update']);
  const mine = pin(add(w, 'hoplite', 0, -20, 0)), foe = pin(add(w, 'hoplite', 1, 20, 20)); sentinels(w);
  assert.equal(w.props.filter((p) => p.type === 'gate_door' && !p.dead).length, 2);
  const g = w.props.filter((p) => p.type === 'gate_door'); w.hurtProp(g[0], 9999); run(w, 0.3); assert.equal(w.state, 'running'); assert.ok(w.objective.progress > 0.2 && w.objective.progress < 0.7);
  w.hurtProp(g[1], 9999); run(w, 0.3); assert.equal(w.state, 'running', 'gates are down but the enemy still lives'); assert.ok(w.objective.propsDone);
  w.units.filter((u) => u.team === 1).forEach((u) => { u.hp = 1; const h = newHit(); h.noBlock = true; applyDamage(w, null, u, 1e9, h); }); run(w, 0.5);
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(log.find((e) => e[0] === 'battle_end')[1].reason, 'objective');
  // plain destroy (no eliminate) ends as soon as the props fall
  const w2 = world({ arenaObj: a, rules: Object.assign({ objective: { type: 'destroy', params: { props: ['gate_door'] } } }, NM) }); pin(add(w2, 'hoplite', 0, -20, 0)); pin(add(w2, 'hoplite', 1, 20, 20)); sentinels(w2);
  w2.props.filter((p) => p.type === 'gate_door').forEach((p) => w2.hurtProp(p, 9999)); run(w2, 0.3); assert.equal(w2.winner, 0); assert.equal(w2.endReason, 'objective');
});
await test('timeout: any objective may carry a time limit (lose | draw | win), reason "time"', () => {
  for (const [onTimeout, expect] of [['lose', 1], ['draw', -1], ['win', 0]]) {
    const w = world({ rules: Object.assign({ objective: { type: 'hold_hill', params: { time: 999 }, timeLimit: 5, onTimeout } }, NM) }); pin(add(w, 'hoplite', 0, -20, 0)); pin(add(w, 'hoplite', 1, 20, 20));
    run(w, 5.5); assert.equal(w.state, 'ended'); assert.equal(w.winner, expect, onTimeout); assert.equal(w.endReason, 'time');
  }
});
await test('timeLimit 0 means no limit; default 360 s decides by remaining cost', () => {
  const w = world({ rules: { morale: false, timeLimit: 0 } }); pin(add(w, 'hoplite', 0, -20, 0)); pin(add(w, 'hoplite', 1, 20, 20));
  for (let s = 0; s < 400; s++) { w.lastDamageT = w.time; run(w, 1); } assert.equal(w.state, 'running'); w.rules.timeLimit = 360; run(w, 0.1); assert.equal(w.state, 'ended'); assert.equal(w.endReason, 'time');
});

finish('objectives');
