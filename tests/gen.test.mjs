import { generateArena, RECIPES } from '../src/world/gen.js';
import assert from 'node:assert';
for (const r of RECIPES) {
  const t = Date.now();
  const a = generateArena(r, 'medium', 5);
  const b = generateArena(r, 'medium', 5);
  assert.deepEqual(Array.from(a.h), Array.from(b.h), r + ' deterministic');
  let mn = 999, mx = 0; for (const v of a.h) { if (v < mn) mn = v; if (v > mx) mx = v; }
  console.log(r.padEnd(12), 'ms', Date.now() - t, 'h', mn, '-', mx, 'props', a.props.length, 'water', a.water);
}
