// U8: custom-soldier fuzzer. 5,000 random LEGAL soldiers: none exceeds 1.35x the best shipped unit's cost efficiency in its role, all compile (<= 48 parts,
// radius 0.3-0.7, reach <= 3.6 u, scale clamp 0.85-1.35), and batches of them fight in the real sim without crashing. (Q7 negative control: widen a radius past 0.7 and the radius assertion fails.)
import assert from 'node:assert/strict';
import * as C from '../../../src/content/era_ancient/custom.js';
import { randomBlueprint, PART_REGISTRY } from '../../../src/content/era_ancient/blueprints.js';
import { roleEfficiency, EFFICIENCY_CAP, STAT_CAPS, statsToUnitDef } from '../../../src/sim/stats.js';
import { power } from '../../../src/sim/power.js';
import { checkSoldier } from '../../../src/save/validate.js';
import { World } from '../../../src/sim/world.js';
import { generateArena } from '../../../src/world/gen.js';
import { buildSimDefs } from '../../../src/sim/defs.js';
import { RNG } from '../../../src/core/rng.js';

const N = Number(process.env.U8_N || 5000);
const rng = new RNG(8008);
const shipped = buildSimDefs();
const arena = generateArena('arenalab', 'small', 1);
const batch = [];
let maxEff = 0, maxParts = 0, minR = 9, maxR = 0, worst = '';
for (let i = 0; i < N; i++) {
  const bp = randomBlueprint(rng, { name: 'U8 ' + i }); bp.id = 'cs_u8' + i;
  const st = {}; let left = 100; for (const k of C.STAT_KEYS) { const v = Math.min(left, rng.int(0, STAT_CAPS[k])); st[k] = v; left -= v; }
  const legal = C.legalAbilityIds(bp), abil = []; for (let j = rng.int(0, 2); j > 0 && legal.length; j--) { const a = rng.pick(legal); if (abil.indexOf(a) < 0) abil.push(a); }
  const cs = { v: 1, id: bp.id, name: 'U8 ' + i, blueprint: bp, stats: st, abilities: abil, ai: rng.pick(C.AI_STYLES), height: rng.range(0.9, 1.2), radius: rng.chance(0.2) ? rng.range(0, 2) : undefined, text: {} };
  const r = checkSoldier(cs, {}); assert.ok(r.ok, `legal soldier ${i} rejected: ${r.errors.join(' | ')}`);
  const d = C.customDef(cs);
  const eff = power(d) / d.cost / roleEfficiency(d.role); if (eff > maxEff) { maxEff = eff; worst = `${bp.main} ${JSON.stringify(st)}`; }
  assert.ok(eff <= EFFICIENCY_CAP + 1e-6, `U8: soldier ${i} (${bp.main}) is ${eff.toFixed(3)}x the best shipped efficiency of role ${d.role}`);
  assert.ok(d.radius >= 0.3 - 1e-9 && d.radius <= 0.7 + 1e-9, `radius ${d.radius}`);
  const c = C.compileFromDef(d); assert.ok(c.compiled.parts <= 48 && c.compiled.voxels > 0 && c.compiled.reach <= 3.6 + 1e-6, 'compile');
  for (let k = 0; k < 3; k++) assert.ok(c.eff[k] >= 0.85 - 1e-9 && c.eff[k] <= 1.35 + 1e-9, 'scale clamp');
  maxParts = Math.max(maxParts, c.compiled.parts); minR = Math.min(minR, d.radius); maxR = Math.max(maxR, d.radius);
  if (i % 4 === 0) batch.push(d);
}
// the same defs in the real sim: 30 per battle, 3 simulated seconds + a bit, no exception, units stay finite
let battles = 0;
for (let b = 0; b < batch.length; b += 30) {
  const defs = Object.assign(Object.create(null), shipped); const group = batch.slice(b, b + 30); for (const d of group) defs[d.id] = d;
  const w = new World({ arena, seed: 5 + b, rules: {}, defs }); 
  group.forEach((d, i) => { const team = i & 1; w.addUnit(d.id, team, (team ? 6 : -6) + (i % 5) * 0.9, (i / 5 | 0) * 1.1 - 3, { def: d }); });
  w.start(); for (let t = 0; t < 120; t++) w.tick();
  for (const u of w.units) assert.ok(Number.isFinite(u.x) && Number.isFinite(u.z) && Number.isFinite(u.hp), 'finite unit state');
  battles++;
}
console.log(`U8 fuzz: ${N} soldiers, worst efficiency ${maxEff.toFixed(3)}x (${worst}), radius ${minR.toFixed(2)}-${maxR.toFixed(2)}, max parts ${maxParts}, ${battles} sim battles OK`);
