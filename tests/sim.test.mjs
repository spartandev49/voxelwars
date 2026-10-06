// Sim smoke + invariants (replaces sim.smoke.mjs): a 50v50 battle runs to a decision, emits the core events, keeps every number finite and every unit on the ground.
import assert from 'node:assert/strict';
import { generateArena } from '../src/world/gen.js';
import { World } from '../src/sim/world.js';
import { buildSimDefs } from '../src/sim/defs.js';
import { ST } from '../src/sim/consts.js';

const defs = buildSimDefs();
const arena = generateArena('marathon', 'medium', 5);
const w = new World({ arena, seed: 1, defs });
const A = arena.zones.A, B = arena.zones.B;
w.addSquad('hoplite', 0, 20, A.x, A.z - 5, { heading: Math.PI / 2 });
w.addSquad('hoplite', 0, 20, A.x, A.z + 5, { heading: Math.PI / 2 });
w.addSquad('cretan_archer', 0, 10, A.x - 6, A.z, { heading: Math.PI / 2 });
w.addSquad('hoplite', 1, 20, B.x, B.z - 5, { heading: -Math.PI / 2 });
w.addSquad('legionary', 1, 20, B.x, B.z + 5, { heading: -Math.PI / 2 });
w.addSquad('nubian_archer', 1, 10, B.x + 6, B.z, { heading: -Math.PI / 2 });
assert.equal(w.stats[0].alive, 50); assert.equal(w.stats[1].alive, 50); assert.equal(w.state, 'placing');
const counts = {}; w.ev.onAny((t) => { counts[t] = (counts[t] || 0) + 1; });
w.start();
let bad = 0, sunk = 0, samples = 0, below = 0, maxSink = 0;
for (let i = 0; i < 30 * 200 && w.state !== 'ended'; i++) {
  w.tick();
  if ((i & 7) === 0) for (const u of w.units) {
    if (!Number.isFinite(u.x + u.y + u.z + u.hp + u.heading)) bad++;
    const sk = w.arena.cellHeight(u.x, u.z) - u.y; samples++; if (sk > 0.05) below++; if (sk > maxSink) maxSink = sk;
  }
}
assert.equal(w.state, 'ended', 'the battle reaches a decision within 200 s');
assert.ok(['elimination', 'rout'].includes(w.endReason), w.endReason); assert.ok(w.time > 25 && w.time < 200, 'battle length ' + w.time.toFixed(0));
assert.equal(bad, 0, 'finite numbers'); // R6: ground follow rises at <= 12 u/s, so a unit that steps up is briefly below the new cell top; it never sinks deeper than one walkable step and settles within a few ticks
assert.ok(maxSink <= 1.0 + 1e-6, 'never below the ground by more than a step: ' + maxSink.toFixed(2)); assert.ok(below / samples < 0.02, 'sink samples ' + (below / samples).toFixed(4));
for (const k of ['battle_start', 'battle_end', 'unit_hit', 'unit_kill', 'projectile_launch', 'first_blood']) assert.ok(counts[k] >= 1, k);
assert.equal(counts.battle_start, 1); assert.equal(counts.battle_end, 1); assert.ok(counts.unit_kill >= 30);
assert.equal(w.stats[0].dead + w.stats[0].alive, 50); assert.equal(w.stats[1].dead + w.stats[1].alive, 50);
const winner = w.winner; assert.ok(winner === 0 || winner === 1); assert.ok(w.stats[winner].alive > 0);
console.log('sim.test: ok, winner', winner, 'in', w.time.toFixed(0), 's, kills', counts.unit_kill);
