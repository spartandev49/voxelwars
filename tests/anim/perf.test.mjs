// A9: animation CPU cost. BattleView poses every unit each frame through Animator.pose with an LOD tier from its distance (0 full, 1 no secondary motion / overlays,
// 2 frozen pose: no overlays or root finishing). 500 mixed units (soldiers of every weapon style, mounted units, beasts, siege) must cost <= 4 ms per frame,
// the LOD tiers must each be cheaper than the one before, and a pose must not allocate (no GC spikes in a battle).
import assert from 'node:assert';
import v8 from 'node:v8';
import vm from 'node:vm';
import { boot, ClipLib, Animator, ok } from './_common.mjs';
import { makeSoldier } from '../fixtures/rigs.js';
import { createFixture } from '../fixtures/index.js';

boot();
const KITS = [['soldier', { main: 'dory', off: 'hoplon' }], ['soldier', { main: 'xiphos', off: 'round_shield' }], ['soldier', { main: 'bow', off: 'none' }], ['soldier', { main: 'greataxe', off: 'none' }],
  ['u:companion_cavalry'], ['u:camel_rider'], ['u:warhound'], ['u:war_elephant'], ['u:chariot_archer'], ['u:catapult'], ['u:sacred_chicken']];
const models = [];
for (const [fx, o] of KITS) models.push(await createFixture(fx, o || {}));
const CLIPS = ['walk', 'walk', 'walk', 'idle_combat', 'strike_thrust', 'idle', 'run', 'hit_front', 'strike_slash_1', 'shoot_bow', 'block_hold', 'death_back'];
const N = 500;
const units = [];
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (let i = 0; i < N; i++) {
  const m = models[(rnd() * models.length) | 0];
  const clip = CLIPS[(rnd() * CLIPS.length) | 0];
  units.push({ m, out: new Float32Array(m.parts.length * 9), root: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 }, state: { clip, t: rnd() * 0.8, rate: 1, flinch: rnd() < 0.1 ? 0.5 : 0, dir: 0, prev: clip, blend: 1 }, speed: clip === 'run' ? 5 : clip === 'walk' ? 2.5 : 0, id: i + 1, gait: rnd() * 50 });
}
const ex = { root: null, speed: 0, id: 0, heading: 0, scale: 1, lod: 0, gait: 0, t: 0 };
function frame(lodOf, f) {
  for (let i = 0; i < N; i++) {
    const u = units[i];
    u.state.t = (u.state.t + 1 / 60) % 0.8; u.gait += u.speed / 60;
    ex.root = u.root; ex.speed = u.speed; ex.id = u.id; ex.heading = i * 0.1; ex.lod = lodOf(i); ex.gait = u.gait; ex.t = f / 60;
    Animator.pose(u.m, u.state, ex, u.out);
  }
}
// best-of-5 batches of 30 frames, each summarised by its median: a shared CI box adds spikes, never speed
function bench(lodOf) {
  for (let f = 0; f < 30; f++) frame(lodOf, f);          // warm up (JIT, caches, floor tables)
  let best = Infinity;
  for (let b = 0; b < 5; b++) {
    const times = [];
    for (let f = 0; f < 30; f++) { const t0 = performance.now(); frame(lodOf, f); times.push(performance.now() - t0); }
    times.sort((x, y) => x - y); best = Math.min(best, times[15]);
  }
  return best;
}
const full = bench(() => 0), half = bench(() => 1), mixed = bench((i) => (i % 10 < 3 ? 0 : i % 10 < 6 ? 1 : 2)), far = bench(() => 2);
console.log(`  500 poses per frame (median ms, best of 5 batches): all LOD0 ${full.toFixed(2)}, all LOD1 ${half.toFixed(2)}, LOD 30/30/40 % ${mixed.toFixed(2)}, all LOD2 ${far.toFixed(2)}`);
assert.ok(mixed <= 4, `A9: mixed-LOD frame ${mixed.toFixed(2)} ms > 4 ms`);
assert.ok(full <= 4, `A9: all-full-detail frame ${full.toFixed(2)} ms > 4 ms`);
assert.ok(far <= half && half <= full, 'A9: LOD tiers must not get more expensive: far <= half <= full');
ok(`A9 500 mixed units: ${mixed.toFixed(2)} ms per frame (<= 4), all at full detail ${full.toFixed(2)} ms, LOD1 ${half.toFixed(2)}, LOD2 ${far.toFixed(2)}`);

// allocation: a warmed-up pose creates no arrays or objects (only a few boxed doubles): bytes per pose stay far below even one small array
{
  v8.setFlagsFromString('--expose_gc'); const gc = vm.runInNewContext('gc');
  gc(); const h0 = process.memoryUsage().heapUsed;
  for (let f = 0; f < 40; f++) frame(() => 0, f);
  const grown = process.memoryUsage().heapUsed - h0; gc();
  const per = grown / (40 * N);
  assert.ok(per < 400, `A9: ${per.toFixed(0)} bytes allocated per pose`);
  ok(`A9 allocation: ${per.toFixed(0)} bytes per pose over ${40 * N} poses`);
}
