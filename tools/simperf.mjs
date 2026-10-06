// Headless sim performance probe: node tools/simperf.mjs [budget]   (600 units at 40000). Prints avg/max ms per tick per 50 ticks.
import { buildContent } from '../src/content/era_ancient/content.js';
import { World } from '../src/sim/world.js';
import { generateArena } from '../src/world/gen.js';
import { generateArmy } from '../src/sim/armygen.js';
const N = +process.argv[2] || 40000;
const c = buildContent();
const arena = generateArena('marathon', 'large', 3);
const w = new World({ arena, seed: 5, defs: c.defs, rules: { timeLimit: 0 } });
for (const t of [0, 1]) { const army = generateArmy({ faction: 'mixed', budget: N, style: 'balanced', defs: c.defs, arena, team: t, seed: 9 + t, cap: 300 }); w.addPlacements(t, army.placements, { defs: c.defs }); }
console.log('units', w.units.length);
w.start(0);
const times = [];
for (let i = 0; i < 400; i++) { const t0 = performance.now(); w.tick(); times.push(performance.now() - t0); if (i % 50 === 49) { const seg = times.slice(-50); console.log('tick', i + 1, 'avg ms', (seg.reduce((a, b) => a + b, 0) / 50).toFixed(2), 'max', Math.max(...seg).toFixed(1), 'alive', w.units.length); } }
