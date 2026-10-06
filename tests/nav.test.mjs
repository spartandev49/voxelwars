import { generateArena, RECIPES } from '../src/world/gen.js';
import { NavGrid, FlowField } from '../src/world/nav.js';
import assert from 'node:assert';
const out = [0, 0];
for (const r of RECIPES.filter(r => r !== 'random')) {
  const a = generateArena(r, 'medium', 7);
  const t0 = performance.now();
  const nav = new NavGrid(a); nav.applyProps(a.props.map(p => ({ x: p.x, z: p.z, radius: 0.6, blocks: p.t.startsWith('tree') || p.t.includes('wall') || p.t.includes('column') || p.t === 'tower' ? 'full' : 'none', hp: p.t.includes('wall') || p.t === 'tower' ? 600 : Infinity })), a.hazards);
  const t1 = performance.now();
  const ff = new FlowField(nav);
  const zb = a.zones.B, za = a.zones.A;
  const src = new Int32Array(1); src[0] = nav.cx(zb.x) + nav.cz(zb.z) * nav.n;
  ff.compute(src, 1);
  const t2 = performance.now();
  const d = ff.distAt(za.x, za.z);
  let walk = 0; for (const v of nav.walk) walk += v;
  console.log(r.padEnd(12), 'nav ms', (t1 - t0).toFixed(1), 'ff ms', (t2 - t1).toFixed(1), 'walk%', (walk / nav.walk.length * 100).toFixed(0), 'A->B dist', d > 1e8 ? 'UNREACHABLE' : d.toFixed(0));
  if (d > 1e8) process.exitCode = 1;
  // follow descent from A to B
  let x = za.x, z = za.z, steps = 0;
  while (steps++ < 600 && ff.distAt(x, z) > 1.5) { if (!ff.dir(x, z, out)) break; x += out[0] * 0.5; z += out[1] * 0.5; }
  console.log('   followed gradient steps', steps, 'final dist', ff.distAt(x, z).toFixed(1));
}
