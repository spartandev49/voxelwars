// AI development script: run a battle, print metrics, optionally dump PNG frames. Usage:
//   node tools/ai_dev.mjs [arena] [seed] [--frames=10,20,40] [--small]
import { buildWorld, runBattle, ARMY_150, sampleGroups } from './lib/harness.mjs';
import { plotWorld } from './lib/plot.mjs';
import fs from 'node:fs';
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (n) => (process.argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1];
const arena = args[0] || 'marathon', seed = +(args[1] || 1);
const frames = (flag('frames') || '').split(',').filter(Boolean).map(Number);
const small = process.argv.includes('--small');
const A = small ? sampleGroups([['hoplite', 18], ['cretan_archer', 8], ['companion_cavalry', 5]]) : ARMY_150.A;
const B = small ? sampleGroups([['legionary', 18], ['pilum_thrower', 8], ['equites', 5]]) : ARMY_150.B;
const w = buildWorld({ arena, seed, a: { groups: A }, b: { groups: B } });
const dir = '/tmp/claude-0/-home-user-voxelwars/5a03d429-49db-52c0-ac0f-4e3dc7b2f4e0/scratchpad';
fs.mkdirSync(dir, { recursive: true });
let nextF = 0, lastLog = -10;
const r = runBattle(w, { metrics: true, onTick: (w) => {
  if (frames[nextF] !== undefined && w.time >= frames[nextF]) { plotWorld(w, `${dir}/f_${arena}_${seed}_${frames[nextF]}.png`, 6); nextF++; }
  if (w.time - lastLog >= 10) { lastLog = w.time; console.log('t', w.time.toFixed(0), 'A', w.stats[0].alive, 'B', w.stats[1].alive); }
} });
console.log(JSON.stringify(r, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
