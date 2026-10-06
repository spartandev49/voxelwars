// Sim CPU probe (S3 / perf gate): node tools/perf_sim.mjs [total units ...] [--arena=marathon] [--scenario=mixed|marathon150] [--cold] [--ticks=N] [--prof]
//   Times World.tick() in THREAD CPU time (process.threadCpuUsage): wall clock on an oversubscribed machine is 5-15x worse and says nothing about the code.
//   Default = warmed JIT (what the game does: Game runs createWarmup() during placement); --cold shows the first-seconds cost of a fresh process.
//   scenario `mixed` = armygen 'mixed balanced' armies (what the app builds; contact phase = ticks 90-690), `marathon150` = the hand-made ARMY_150 composition.
import { buildWorld, ARMY_150, getArena, DEFS } from './lib/harness.mjs';
import { scaleGroups } from './lib/scale.mjs';
import { generateArmy } from '../src/sim/armygen.js';
import { warmSim } from '../src/sim/warmup.js';
import inspector from 'node:inspector';
const arg = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const sizes = arg.length ? arg.map(Number) : [150, 300, 500, 1000];
const flag = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const prof = process.argv.includes('--prof'), cold = process.argv.includes('--cold');
const cpuMs = () => { const u = process.threadCpuUsage ? process.threadCpuUsage() : process.cpuUsage(); return (u.user + u.system) / 1000; };
let warmed = false;
export function measure(total, opts = {}) {
  const per = total / 2, size = total > 200 ? 'large' : 'medium';
  if (!opts.cold && !warmed) { warmSim({ defs: DEFS, arena: getArena('marathon', 'medium', 5) }); warmed = true; }
  let w;
  if ((opts.scenario || 'mixed') === 'mixed') {
    const arena = getArena(opts.arena || 'marathon', size, opts.seed || 3);
    w = buildWorld({ arenaObj: arena, seed: opts.seed || 3, start: false });
    for (const t of [0, 1]) w.addPlacements(t, generateArmy({ faction: 'mixed', budget: Math.round(per * 130), style: 'balanced', arena, team: t, seed: 9 + t, cap: 300 }).placements, { defs: DEFS });
    w.start(0);
  } else w = buildWorld({ arena: opts.arena || 'marathon', size, seed: opts.seed || 3, a: { groups: scaleGroups(ARMY_150.A, per) }, b: { groups: scaleGroups(ARMY_150.B, per) } });
  const n0 = w.units.length;
  for (let i = 0; i < 90; i++) w.tick();
  const ticks = opts.ticks || 600;
  let session = null, profile = null;
  if (opts.prof) { session = new inspector.Session(); session.connect(); session.post('Profiler.enable'); session.post('Profiler.start'); }
  let done = 0, aliveSum = 0, sum = 0, max = 0; const samples = [];
  const heap0 = process.memoryUsage().heapUsed;
  while (done < ticks && w.state === 'running') { const c0 = cpuMs(); w.tick(); const d = cpuMs() - c0; sum += d; if (d > max) max = d; samples.push(d); done++; aliveSum += w.units.length; }
  if (session) session.post('Profiler.stop', (e, p) => { profile = p.profile; });
  samples.sort((a, b) => a - b);
  return { n0, alive: aliveSum / Math.max(1, done), ticks: done, msPerTick: sum / Math.max(1, done), p99: samples.length ? samples[Math.floor(samples.length * 0.99)] : 0, max, t: w.time, heapMB: (process.memoryUsage().heapUsed - heap0) / 1e6, profile };
}
if (process.argv[1] && process.argv[1].endsWith('perf_sim.mjs')) {
  for (const total of sizes) {
    const r = measure(total, { arena: flag('arena', 'marathon'), scenario: flag('scenario', 'mixed'), cold, prof, ticks: +flag('ticks', 600) });
    console.log(`units ${r.n0} avg alive ${r.alive.toFixed(0)} ticks ${r.ticks}  ${r.msPerTick.toFixed(2)} ms/tick avg  p99 ${r.p99.toFixed(1)}  max ${r.max.toFixed(1)}  (thread cpu${cold ? ', cold JIT' : ', warm JIT'})  t=${r.t.toFixed(0)}s  heap+${r.heapMB.toFixed(1)}MB`);
    if (prof && r.profile) {
      const self = {}, nodes = {}; r.profile.nodes.forEach((n) => { nodes[n.id] = n; });
      const dt = r.profile.timeDeltas; for (let i = 0; i < r.profile.samples.length; i++) { const n = nodes[r.profile.samples[i]]; const k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').slice(-2).join('/') + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + dt[i]; }
      const tot = Object.values(self).reduce((a, b) => a + b, 0);
      console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => '   ' + (v / tot * 100).toFixed(1) + '% ' + k).join('\n'));
    }
  }
}
