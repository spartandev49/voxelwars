// Sim CPU profile: node tools/perf_sim.mjs [total units list] [--arena=marathon] [--prof]   (CPU time via process.cpuUsage: robust against a busy machine)
import { buildWorld, ARMY_150 } from './lib/harness.mjs';
import { scaleGroups } from './lib/scale.mjs';
import inspector from 'node:inspector';
const arg = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const sizes = arg.length ? arg.map(Number) : [150, 300, 500, 1000];
const flag = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const prof = process.argv.includes('--prof');
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
export function measure(total, opts = {}) {
  const per = total / 2, size = total > 500 ? 'large' : 'medium';
  const w = buildWorld({ arena: opts.arena || 'marathon', size, seed: opts.seed || 3, a: { groups: scaleGroups(ARMY_150.A, per) }, b: { groups: scaleGroups(ARMY_150.B, per) } });
  const n0 = w.units.length;
  for (let i = 0; i < 90; i++) w.tick();
  const ticks = opts.ticks || 600;
  let session = null, profile = null;
  if (opts.prof) { session = new inspector.Session(); session.connect(); session.post('Profiler.enable'); session.post('Profiler.start'); }
  const c0 = cpuMs(); let done = 0, aliveSum = 0;
  const heap0 = process.memoryUsage().heapUsed;
  while (done < ticks && w.state === 'running') { w.tick(); done++; aliveSum += w.units.length; }
  const ms = cpuMs() - c0;
  if (session) session.post('Profiler.stop', (e, p) => { profile = p.profile; });
  return { n0, alive: aliveSum / Math.max(1, done), ticks: done, msPerTick: ms / Math.max(1, done), t: w.time, heapMB: (process.memoryUsage().heapUsed - heap0) / 1e6, profile };
}
if (process.argv[1] && process.argv[1].endsWith('perf_sim.mjs')) {
  for (const total of sizes) {
    const r = measure(total, { arena: flag('arena', 'marathon'), prof });
    console.log(`units ${r.n0} avg alive ${r.alive.toFixed(0)} ticks ${r.ticks}  ${r.msPerTick.toFixed(2)} ms/tick (cpu)  t=${r.t.toFixed(0)}s  heap+${r.heapMB.toFixed(1)}MB`);
    if (prof && r.profile) {
      const self = {}, nodes = {}; r.profile.nodes.forEach((n) => { nodes[n.id] = n; });
      const dt = r.profile.timeDeltas; for (let i = 0; i < r.profile.samples.length; i++) { const n = nodes[r.profile.samples[i]]; const k = n.callFrame.functionName + ' ' + n.callFrame.url.split('/').pop() + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + dt[i]; }
      const tot = Object.values(self).reduce((a, b) => a + b, 0);
      console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => '   ' + (v / tot * 100).toFixed(1) + '% ' + k).join('\n'));
    }
  }
}
