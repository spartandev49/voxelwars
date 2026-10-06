// A3 + A4: locomotion matches speed. Same metric for both (anim/analysis.js footSlideLive): the model walks at ground speed v through the REAL pipeline
// (extra.gait = distance travelled, the animator picks walk/jog/run by speed); a planted foot (sole within 3.5 cm of the lowest sole height) must stay put in
// world space: slide = world-z range during one stance, ratio = worst slide / distance per gait cycle <= 15 %.
//   A3: every looping hum1 gait clip at its own speedRef (authored or retargeted), no limb flips (see ranges.test.mjs).
//   A4: every infantry def of the stat table at its walk speed and at speed * runMul: slide <= 15 % AND 1.5 <= steps/s <= 3.5 (steps/s = 2 * v / stride:
//       cadence comes from distance travelled and the rig's own speedRef, spec 7.3). Every non-hum rig meets the slide bound at its own gait speeds.
import assert from 'node:assert';
import { boot, ClipLib, Animator, ok } from './_common.mjs';
import { footSlide, footSlideLive } from '../../src/anim/analysis.js';
import { makeSoldier } from '../fixtures/rigs.js';
import { createFixture } from '../fixtures/index.js';
import { STAT_TABLE, DEFAULTS } from '../../src/content/era_ancient/stats.js';

boot();
const MAXR = 0.15;
const fmt = (x) => (x * 100).toFixed(1) + '%';

// ---- A3: hum1 gait loops at their design speed ---------------------------------------------------------------------------------------------------
const sold = await makeSoldier({ main: 'dory', off: 'hoplon' });
const a3 = [];
for (const id of ['walk', 'jog', 'run', 'rout']) {
  const c = ClipLib.getQualified(id, 'hum1'); if (!c) continue;
  const sr = ClipLib.meta(id, 'hum1').speedRef;
  const r = footSlide(sold, id, sr, sr);
  a3.push(`${id}@${sr}u/s ${fmt(r.ratio)}`);
  assert.ok(r.ratio <= MAXR, `A3: ${id} foot slide ${fmt(r.ratio)} > 15%`);
}
ok('A3 hum1 gait clips at their speedRef: foot slide ' + a3.join(', '));

// ---- A4: every infantry def, walk and run ------------------------------------------------------------------------------------------------------------
const INFANTRY = Object.entries(STAT_TABLE).filter(([, d]) => ['melee', 'ranged', 'support', 'hero'].includes(d.role) && !(d.tags || []).includes('cavalry'));
const rows = [], bad = [];
for (const [id, d] of INFANTRY) {
  const sc = d.scale || 1, runMul = d.runMul || DEFAULTS.runMul;
  for (const [label, v] of [['walk', d.speed], ['run', d.speed * runMul]]) {
    const r = footSlideLive(sold, v, { scale: sc, seconds: 4 });
    const line = `${id.padEnd(16)} ${label.padEnd(4)} v ${v.toFixed(2).padStart(5)}  gait ${String(r.a).padEnd(4)}->${String(r.b).padEnd(4)}  steps/s ${r.stepsPerSec.toFixed(2)}  slide ${fmt(r.ratio)}`;
    rows.push(line);
    if (r.ratio > MAXR) bad.push(`${id} ${label}: slide ${fmt(r.ratio)} > 15%`);
    if (r.stepsPerSec < 1.5 || r.stepsPerSec > 3.5) bad.push(`${id} ${label}: ${r.stepsPerSec.toFixed(2)} steps/s outside 1.5..3.5`);
  }
}
console.log(rows.join('\n'));
assert.deepStrictEqual(bad, [], 'A4 infantry locomotion: ' + bad.join('; '));
ok(`A4 ${INFANTRY.length} infantry defs x (walk, run): slide <= 15% and 1.5..3.5 steps/s`);

// giants (hum1 models at scale 1.7-2.2) are not infantry: informational
const giants = Object.entries(STAT_TABLE).filter(([, d]) => d.role === 'monster' && d.scale);
for (const [id, d] of giants) {
  const r = footSlideLive(sold, d.speed, { scale: d.scale, seconds: 4 });
  console.log(`  (giant ${id.padEnd(9)} scale ${d.scale} walk ${d.speed}: steps/s ${r.stepsPerSec.toFixed(2)}, slide ${fmt(r.ratio)})`);
  assert.ok(r.ratio <= MAXR, `giant ${id}: slide ${fmt(r.ratio)}`);
}

// ---- A4 (non-hum): slide bound at each rig's own gait speeds ----------------------------------------------------------------------------------------
const LEGS = { quad1: ['legFL', 'legFR', 'legBL', 'legBR'], elephant1: ['legFL', 'legFR', 'legBL', 'legBR'], chicken1: ['legL', 'legR'] };
const MODELS = [['horse', 'u:companion_cavalry', 'r_', null], ['quad', 'quad1', '', null], ['camel', 'u:camel_rider', '', null], ['hound', 'u:warhound', '', null], ['goat', 'u:battle_goat', '', null],
  ['elephant', 'u:war_elephant', '', null], ['chicken', 'u:sacred_chicken', '', null], ['chariot horses', 'u:chariot_archer', '', ['h1_legFL', 'h1_legFR', 'h1_legBL', 'h1_legBR']]];
const nb = [];
for (const [label, fix, , legsOverride] of MODELS) {
  const m = await createFixture(fix);
  const rig = (m.meta.subrigs && m.meta.subrigs[0] && m.meta.subrigs[0].rig) || m.meta.rig;
  const legs = legsOverride || LEGS[rig];
  if (!legs) continue;
  const mountRig = legsOverride ? 'quad1' : rig;
  const gaits = ['walk', 'trot', 'gallop', 'run'].filter((g) => ClipLib.getQualified(g, mountRig) && (g !== 'run' || mountRig === 'elephant1'));
  const clip = legsOverride ? 'run' : 'walk';
  for (const g of gaits) {
    const v = ClipLib.meta(g, mountRig).speedRef;
    const r = footSlideLive(m, v, { legs, clip, seconds: 4 });
    nb.push(`${label} ${g}@${v}: ${fmt(r.ratio)}`);
    assert.ok(r.ratio <= MAXR, `A4 ${label} ${g} at ${v} u/s: slide ${fmt(r.ratio)} > 15%`);
  }
}
ok('A4 non-hum rigs at their gait speeds: ' + nb.join(', '));
void Animator;
