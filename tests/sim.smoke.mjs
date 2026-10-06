import { generateArena } from '../src/world/gen.js';
import { World } from '../src/sim/world.js';
import { buildSimDefs } from '../src/sim/defs.js';
const defs = buildSimDefs();
const arena = generateArena(process.argv[2] || 'marathon', 'medium', 5);
const w = new World({ arena, seed: 1, defs });
const A = arena.zones.A, B = arena.zones.B;
w.addSquad('hoplite', 0, 20, A.x, A.z - 5, { heading: Math.PI / 2 });
w.addSquad('hoplite', 0, 20, A.x, A.z + 5, { heading: Math.PI / 2 });
w.addSquad('cretan_archer', 0, 10, A.x - 6, A.z, { heading: Math.PI / 2 });
w.addSquad('hoplite', 1, 20, B.x, B.z - 5, { heading: -Math.PI / 2 });
w.addSquad('legionary', 1, 20, B.x, B.z + 5, { heading: -Math.PI / 2 });
w.addSquad('nubian_archer', 1, 10, B.x + 6, B.z, { heading: -Math.PI / 2 });
const counts = {}; w.ev.onAny((t) => { counts[t] = (counts[t] || 0) + 1; });
w.start();
const t0 = performance.now();
let last = 0;
for (let i = 0; i < 30 * 200 && w.state !== 'ended'; i++) {
  w.tick();
  if (i % 300 === 0) console.log('t', w.time.toFixed(0), 'A', w.stats[0].alive, 'B', w.stats[1].alive, 'proj', w.proj.live);
}
const ms = performance.now() - t0;
console.log('ended', w.state, 'winner', w.winner, w.endReason, 'sim time', w.time.toFixed(1), 'cpu ms', ms.toFixed(0), 'ms/tick', (ms / w.tickN).toFixed(2));
console.log(counts);
