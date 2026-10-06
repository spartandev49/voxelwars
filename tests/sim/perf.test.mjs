// S3 perf gate (fast version): per-tick THREAD CPU time of a contact-phase battle, warm-up determinism, hot-loop hygiene.
// Thread CPU time (process.threadCpuUsage) is used on purpose: wall clock on a shared / oversubscribed machine says nothing about the code (measured 10x inflation at load 50 on 4 cores).
// Budgets are the spec's S3 numbers (<= 2 ms at 300 units); the assertions leave 2.5x slack so a busy CI box does not flake, the full-size numbers live in docs/balance_report.md.
import { test, finish, assert } from './_util.mjs';
import { buildWorld, getArena, DEFS } from '../../tools/lib/harness.mjs';
import { generateArmy } from '../../src/sim/armygen.js';
import { createWarmup } from '../../src/sim/warmup.js';
import v8 from 'node:v8';
import vm from 'node:vm';
let gc = global.gc; if (!gc) { try { v8.setFlagsFromString('--expose-gc'); gc = vm.runInNewContext('gc'); } catch (e) { gc = null; } }

const cpu = () => { const u = process.threadCpuUsage ? process.threadCpuUsage() : process.cpuUsage(); return (u.user + u.system) / 1000; };
function mixed(total, seed = 3) {
  const arena = getArena('marathon', 'large', seed), per = total / 2;
  const w = buildWorld({ arenaObj: arena, seed, start: false });
  for (const t of [0, 1]) w.addPlacements(t, generateArmy({ faction: 'mixed', budget: Math.round(per * 130), style: 'balanced', arena, team: t, seed: 9 + t, cap: 300 }).placements, { defs: DEFS });
  w.start(0);
  return w;
}

await test('S3: warm-up runs in slices, finishes, and leaves no trace (a battle after it hashes the same as one before it)', () => {
  const run = () => { const w = mixed(120, 5); for (let i = 0; i < 240; i++) w.tick(); return [w.stateHash(), w.stats[0].alive, w.stats[1].alive]; };
  const before = run();
  const wu = createWarmup({ defs: DEFS, arena: getArena('marathon', 'medium', 5) });
  let slices = 0; while (!wu.step(4)) { slices++; assert.ok(slices < 5000, 'warm-up terminates'); }
  assert.ok(slices >= 3, 'work is sliced (' + slices + ' slices), not one long freeze');
  assert.equal(wu.progress, 1);
  assert.deepEqual(run(), before, 'S1 holds across a warm-up');
});

await test('S3: 300-unit contact phase (warm JIT) stays inside the tick budget: avg < 5 ms, no tick above 60 ms of CPU', () => {
  const w = mixed(300);
  for (let i = 0; i < 60; i++) w.tick();                          // formations close: contact starts after ~3 s
  const n = w.units.length; assert.ok(n >= 200, 'units ' + n);
  let sum = 0, max = 0; const T = 300;
  for (let i = 0; i < T && w.state === 'running'; i++) { const c0 = cpu(); w.tick(); const d = cpu() - c0; sum += d; if (d > max) max = d; }
  const avg = sum / T;
  console.log(`  perf: ${n} units, ${avg.toFixed(2)} ms/tick avg, worst ${max.toFixed(1)} ms`);
  assert.ok(avg < 5, 'avg ' + avg.toFixed(2) + ' ms (budget 2 ms, slack 2.5x)');
  assert.ok(max < 60, 'worst tick ' + max.toFixed(1) + ' ms');
});

await test('S3: no per-tick growth: heap after 600 ticks of a 150-unit battle grows < 3 MB of the start (no leak in pools, events or corpses)', () => {
  const w = mixed(150, 4);
  for (let i = 0; i < 90; i++) w.tick();
  if (gc) gc();
  const h0 = process.memoryUsage().heapUsed;
  for (let i = 0; i < 600 && w.state === 'running'; i++) w.tick();
  if (gc) gc();
  const dh = (process.memoryUsage().heapUsed - h0) / 1e6;
  console.log(`  heap delta ${dh.toFixed(2)} MB`);
  assert.ok(dh < (gc ? 3 : 24), 'heap grew ' + dh.toFixed(1) + ' MB');
});

finish('sim perf');
