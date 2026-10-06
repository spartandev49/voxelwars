// S1 determinism, S24 identity, S26 input log, placement helpers, difficulty by behaviour.
import { world, add, block, sentinels, record, run, count, defs, SE, ST, pin, test, finish, assert, arena } from './_util.mjs';
import { buildWorld, ARMY_150, sampleGroups, DEFS } from '../../tools/lib/harness.mjs';
import { generateArena } from '../../src/world/gen.js';
import { World } from '../../src/sim/world.js';

const small = () => ({ a: { groups: sampleGroups([['hoplite', 20], ['cretan_archer', 8], ['companion_cavalry', 5], ['philosopher', 2]]) }, b: { groups: sampleGroups([['legionary', 20], ['pilum_thrower', 8], ['equites', 5], ['senator', 2]]) } });

await test('S1: same build + setup + seed => identical state hash after 2000 ticks (3 runs); a different seed differs', () => {
  const hashes = [];
  for (let i = 0; i < 3; i++) { const w = buildWorld(Object.assign({ arena: 'marathon', seed: 7 }, small())); w.step(2000); hashes.push([w.stateHash(), w.stats[0].alive, w.stats[1].alive, w.tickN]); }
  assert.deepEqual(hashes[1], hashes[0]); assert.deepEqual(hashes[2], hashes[0]);
  const w = buildWorld(Object.assign({ arena: 'marathon', seed: 8 }, small())); w.step(2000);
  assert.notEqual(w.stateHash(), hashes[0][0], 'different seeds diverge');
});
await test('S1: the sim never touches Math.random (RNG streams are separate)', () => {
  const orig = Math.random; let calls = 0; Math.random = () => { calls++; return orig(); };
  try { const w = buildWorld(Object.assign({ arena: 'marathon', seed: 3 }, small())); w.step(600); } finally { Math.random = orig; }
  assert.equal(calls, 0, 'Math.random called ' + calls + ' times');
});
await test('S24: unit ids are monotonic and never reused over a long battle with 400+ spawns and deaths', () => {
  const w = world({ rules: { morale: false, timeLimit: 0 }, size: 'medium' }); const log = record(w, ['unit_spawn', 'unit_kill']);
  sentinels(w);
  const ids = new Set(); let last = 0; let spawned = 0;
  for (let wave = 0; wave < 20; wave++) {
    for (let i = 0; i < 12; i++) { add(w, 'sacred_chicken', 0, -3 + (i % 4) * 1.2, (i / 4 | 0) * 1.2 - 2); add(w, 'sacred_chicken', 1, 3 - (i % 4) * 1.2, (i / 4 | 0) * 1.2 - 2); spawned += 2; }
    run(w, 28); w.lightning(0, 0, 900, 12, null); w.lightning(0, 0, 900, 12, null); run(w, 2);
  }
  assert.ok(spawned >= 400);
  for (const e of log) if (e[0] === 'unit_spawn') { assert.ok(!ids.has(e[1].id), 'id reused ' + e[1].id); ids.add(e[1].id); assert.ok(e[1].id > last, 'monotonic'); last = e[1].id; }
  assert.ok(count(log, 'unit_kill') >= 400, 'many deaths: ' + count(log, 'unit_kill'));
  assert.ok(w.time >= 600, 'ten simulated minutes: ' + w.time);
});
await test('S24: dying units keep their Unit object and death clip for >= 1.6 s, then unit_corpse_done; the arena is cloned on construction', () => {
  const src = arena('arenalab', 'small', 1); const before = Array.from(src.h).join(',');
  const w = world({ rules: { morale: false } }); sentinels(w); const log = record(w, ['unit_corpse_done', 'unit_kill']);
  assert.notEqual(w.arena, src); w.makeCrater(0, 0, 3, 3); assert.equal(Array.from(src.h).join(','), before, 'source arena untouched by a crater');
  const a = pin(add(w, 'hoplite', 0, -5, 0)), v = pin(add(w, 'hoplite', 1, 5, 0)); v.hp = 1; const h = (w.tick(), 0);
  import('../../src/sim/combat.js').then((c) => { const x = c.newHit(); x.noBlock = true; c.applyDamage(w, a, v, 100, x); });
  return new Promise((res) => setTimeout(res, 20)).then(() => {
    w.tick(); assert.ok(w.dying.includes(v) && !v.alive); const t0 = w.time;
    for (let i = 0; i < 40; i++) w.tick(); assert.ok(w.dying.includes(v), 'still animating after 1.3 s'); assert.equal(count(log, 'unit_corpse_done'), 0);
    assert.ok(v.deathLinger >= 1.6, 'linger ' + v.deathLinger); assert.equal(v.deathCause, 'melee');
    for (let i = 0; i < 90; i++) w.tick(); assert.ok(!w.dying.includes(v)); assert.equal(count(log, 'unit_corpse_done', (e) => e.id === v.id), 1);
  });
});
await test('S26: replaying the same tick-stamped inputs reproduces the state hash; unstamped inputs are rejected', () => {
  const mk = () => buildWorld(Object.assign({ arena: 'marathon', seed: 11 }, small()));
  const a = mk(); a.record = [];
  const sq = a.squads.find((s) => s.team === 0 && s.defId === 'hoplite').id;
  a.input(40, { type: 'command', squad: sq, order: 'hold' }); a.input(200, { type: 'command', squad: sq, order: 'advance' });
  a.input(90, { type: 'cast', power: 'zeus_lightning', x: 0, z: 0, team: 0 }); a.input(150, { type: 'cast', power: 'heal_wave', x: -10, z: 0, team: 0 });
  a.step(600); const rec = a.record.slice(); assert.equal(rec.length, 4); const h1 = a.stateHash();
  const b = mk(); for (const r of rec) b.input(r.tick, r.cmd); b.step(600); assert.equal(b.stateHash(), h1, 'replay identical');
  const c = mk(); c.step(600); assert.notEqual(c.stateHash(), h1, 'inputs matter');
  assert.throws(() => a.input(undefined, { type: 'command' }), /tick/); assert.throws(() => a.input('now', { type: 'command' }), /tick/);
});
await test('placement helpers: removeUnit / clearUnits adjust stats and squads; addPlacements keeps squad geometry', () => {
  const w = world({ start: false }); const pl = [];
  for (let i = 0; i < 6; i++) pl.push({ defId: 'hoplite', x: -10 + (i % 3) * 1.2, z: (i / 3 | 0) * 1.2, heading: Math.PI / 2, squadId: 5 });
  pl.push({ defId: 'peltast', x: -14, z: 4, heading: Math.PI / 2 });
  const sqs = w.addPlacements(0, pl); assert.equal(sqs.length, 2); assert.equal(w.stats[0].alive, 7); assert.equal(w.stats[0].startCount, 7);
  const sq = sqs[0], u0 = sq.units[0], u3 = sq.units[3];
  const c = Math.cos(sq.facing), s = Math.sin(sq.facing); const gx = sq.ax + c * u3.sox + s * u3.soz, gz = sq.az - s * u3.sox + c * u3.soz;
  assert.ok(Math.hypot(gx - u3.x, gz - u3.z) < 1e-6, 'slot offsets reproduce the placement');
  assert.equal(w.removeUnit(u0), true); assert.equal(w.stats[0].alive, 6); assert.equal(w.squads[0].units.length, 5);
  w.start(); assert.equal(w.removeUnit(sq.units[0]), false, 'placement phase only');
  const w2 = world({ start: false }); w2.addPlacements(0, pl); w2.addPlacements(1, pl.map((p) => Object.assign({}, p, { x: -p.x })));
  w2.clearUnits(1); assert.equal(w2.stats[1].alive, 0); assert.equal(w2.stats[0].alive, 7); assert.ok(w2.squads.every((q) => q.team === 0)); w2.clearUnits(); assert.equal(w2.units.length, 0); assert.equal(w2.squads.length, 0);
});
await test('difficulty by behaviour: easy reacts slower (0.8 s), no flank, no kiting; hard 0.2 s', () => {
  const e = world({ rules: { difficulty: 'easy' } }), n = world(), h = world({ rules: { difficulty: 'hard' } });
  assert.deepEqual([e.retarget[0], n.retarget[0], h.retarget[0]], [24, 12, 6]);
  const w = world({ rules: { difficulty: { 0: 'easy', 1: 'hard' } } }); assert.deepEqual([w.diff[0], w.diff[1]], [0, 2]);
  // easy: cavalry squads do not flank (stage never leaves 0, they just advance)
  const mk = (d) => { const x = buildWorld(Object.assign({ arena: 'arenalab', seed: 2, rules: { difficulty: d } }, { a: { groups: sampleGroups([['hoplite', 20], ['companion_cavalry', 6]]) }, b: { groups: sampleGroups([['hoplite', 20]]) } })); x.step(240); return x; };
  const easy = mk('easy'), normal = mk('normal');
  const cav = (x) => x.squads.filter((s) => s.team === 0 && s.cls === 5);
  assert.ok(cav(easy).every((s) => s.flankSide === 0), 'easy never picks a flank'); assert.ok(cav(normal).some((s) => s.flankSide !== 0), 'normal flanks');
  // kiting: a peltast with an enemy at 3 u retreats on normal, stands on easy
  const kite = (d) => { const x = world({ rules: { difficulty: d, morale: false } }); const p = add(x, 'peltast', 0, 0, 0); p.cdR = 5; const f = pin(add(x, 'hoplite', 1, 3.2, 0)); f.cd = 99; x.step(60); return p.x; };
  assert.ok(kite('normal') < -0.5, 'normal peltast backs away'); assert.ok(kite('easy') > -0.2, 'easy peltast stands');
});

finish('core');
