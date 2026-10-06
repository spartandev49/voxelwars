// The REAL roster: every shipped unit def with the model the renderer builds for it (content.modelFor + compileSoldier). For each unit, every clip the sim
// can publish for it (meleeClip / rangedClip, hit reactions, deaths, locomotion) must play without a missing-clip warning, with finite poses; locomotion is
// measured with the unit's own speed, run multiplier and instance scale (A4), and every death rests on the ground (A7) with the unit's own geometry.
import assert from 'node:assert';
import { boot, ClipLib, Animator, collectWarnings, roster, ok } from './_common.mjs';
import { footSlideLive, describeModel, fk, lowestPoint } from '../../src/anim/analysis.js';
import { meleeClip, rangedClip, defRig } from '../../src/sim/combat.js';
import { DEFAULTS } from '../../src/content/era_ancient/stats.js';

boot();
const R = await roster();
assert.ok(R.length >= 40, 'the roster has all shipped units (' + R.length + ')');
const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
const LEGS = { quad1: ['legFL', 'legFR', 'legBL', 'legBR'], elephant1: ['legFL', 'legFR', 'legBL', 'legBR'], chicken1: ['legL', 'legR'] };

// ---- every published clip plays ----------------------------------------------------------------------------------------------------------------------
let nPoses = 0;
const warns = collectWarnings(() => {
  for (const { id, def, model } of R) {
    const clips = ['idle', 'idle_combat', 'walk', 'rout', 'hit_front', 'stagger', 'stun', 'cower', 'dizzy', 'death_back', 'death_front', 'death_spin', 'getup', 'cheer', 'taunt'];
    if (def.melee) for (let n = 0; n < 2; n++) clips.push(meleeClip(def, n));
    if (def.ranged) clips.push(rangedClip(def));
    const out = new Float32Array(model.parts.length * 9);
    for (const clip of [...new Set(clips)]) {
      const dur = ClipLib.dur(clip, defRig(def)) || 1;
      for (const f of [0, 0.35, 0.7, 1]) {
        Animator.pose(model, { clip, t: dur * f, rate: 1, flinch: f > 0.5 ? 0.6 : 0, dir: 1, prev: clip, blend: 1 }, { root, speed: clip === 'walk' ? 2.5 : 0, gait: clip === 'walk' ? 3 * f : NaN, id: 5, heading: 0.4, scale: 1 }, out);
        for (let i = 0; i < out.length; i++) assert.ok(Number.isFinite(out[i]), `${id} ${clip}: non-finite pose value`);
        nPoses++;
      }
    }
    assert.ok(ClipLib.dur(meleeClipOrIdle(def), defRig(def)) > 0, id);
  }
});
function meleeClipOrIdle(def) { return def.melee ? meleeClip(def, 0) : 'idle'; }
// warn-once messages that are legitimate fallbacks: a clip the rig does not have falls back to its documented substitute (death_front -> death_back for an elephant, ...)
const real = warns.filter((w) => !/using (idle|stagger|hit_front|death_back|idle_combat|stun)\b/.test(w) && !/animates part/.test(w));
assert.deepStrictEqual(real, [], 'roster: unexpected animator warnings');
ok(`roster: ${R.length} units, ${nPoses} poses of every published clip, finite and without missing-clip warnings (${warns.length} documented fallbacks)`);

// ---- A4 with each unit's own numbers ---------------------------------------------------------------------------------------------------------------------
const rows = []; let worst = 0;
for (const { id, def, model, scaleVec } of R) {
  const rig = (model.meta.subrigs && model.meta.subrigs[0] && model.meta.subrigs[0].rig) || model.meta.rig;
  if (!(rig === 'hum1' || LEGS[rig] || rig === 'quad1')) continue;      // wheels / siege / trojan: not leg driven
  const sc = (def.scale || 1) * scaleVec[1];
  const runMul = def.runMul || DEFAULTS.runMul, legs = LEGS[rig], hipH = (model.meta.gait && model.meta.gait.hipH) || 1;
  const infantry = rig === 'hum1';
  for (const [label, v] of [['walk', def.speed], ['run', def.speed * runMul]]) {
    const r = footSlideLive(model, v, { legs, scale: sc, seconds: 4, plantTol: 0.035 * hipH * (legs ? 1 : sc) });
    worst = Math.max(worst, r.ratio);
    rows.push(`${id.padEnd(16)} ${label.padEnd(4)} v ${v.toFixed(2)}  ${String(r.a)}->${String(r.b)}  steps/s ${r.stepsPerSec.toFixed(2)}  slide ${(r.ratio * 100).toFixed(1)}%`);
    // quadrupeds above their top gait speed (a hound's run) are outside the blend table: bound only the gaits the roster actually uses
    assert.ok(r.ratio <= 0.2, `A4 ${id} ${label}: slide ${(r.ratio * 100).toFixed(1)}% on the real model`);
    if (infantry && !/minotaur|cyclops|medusa/.test(id) && !(def.tags || []).includes('cavalry')) assert.ok(r.stepsPerSec >= 1.5 && r.stepsPerSec <= 3.5, `A4 ${id} ${label}: ${r.stepsPerSec.toFixed(2)} steps/s`);
  }
}
console.log(rows.slice(0, 6).join('\n') + `\n  ... ${rows.length} rows, worst slide ${(worst * 100).toFixed(1)}%`);
ok(`A4 real models at the unit's own scale: ${rows.length / 2} leg-driven units, worst slide ${(worst * 100).toFixed(1)}%`);

// ---- A7 on the real models ------------------------------------------------------------------------------------------------------------------------------
let nDeaths = 0, sink = 0, rest = 0;
for (const { id, model } of R) {
  const desc = describeModel(model), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  desc.skip = new Uint8Array(P); for (let i = 0; i < P; i++) if (/(^|_)(weapon|offhand|cape2?|crest)$/.test(model.parts[i].id)) desc.skip[i] = 1;
  const rig = model.meta.rig;
  for (const clip of ['death_back', 'death_front', 'death_spin']) {
    const dur = ClipLib.dur(clip, rig), N = Math.round(dur * 30), r0 = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
    for (let f = 0; f <= N; f++) {
      Animator.pose(model, { clip, t: f / 30, rate: 1, flinch: 0, dir: 0, prev: clip, blend: 1 }, { root: r0, id: 3, heading: NaN, scale: 1 }, pose); fk(desc, pose, W);
      const y = lowestPoint(desc, W, r0); sink = Math.min(sink, y);
      assert.ok(y > -0.02, `A7 ${id} ${clip} t=${(f / 30).toFixed(2)}: sinks ${y.toFixed(3)}`);
      if (f === N) { rest = Math.max(rest, Math.abs(y)); assert.ok(Math.abs(y) <= 0.02, `A7 ${id} ${clip}: ends ${y.toFixed(3)} off the ground`); }
    }
    nDeaths++;
  }
}
ok(`A7 ${nDeaths} death clips on the real roster: never below the floor (${sink.toFixed(3)}), resting on it (<= ${rest.toFixed(3)} off)`);

// ---- weapon styles: an explicit model.meta.weaponStyle must equal the parts registry; models without one are guessed from the weapon's shape ----------------
{
  const { getPart } = await import('../../src/content/era_ancient/blueprints.js');
  let guessed = 0, wrong = 0, explicit = 0;
  const list = [];
  for (const { id, def, model } of R) {
    if (model.meta.rig !== 'hum1' || !model.byId.weapon || !(def.model && def.model.blueprint)) continue;
    const truth = getPart('mains', def.model.blueprint.main).meta.style, has = model.meta.weaponStyle !== undefined;
    if (has) { explicit++; assert.strictEqual(model.meta.weaponStyle, truth, `${id}: meta.weaponStyle ${model.meta.weaponStyle} vs registry ${truth}`); }
    else { guessed++; if (Animator.info(model).style !== truth) { wrong++; list.push(id); } }
  }
  console.log(`  weapon style: ${explicit} models carry meta.weaponStyle (all correct), ${guessed} are guessed from the shape, ${wrong} of those guessed wrong${wrong ? ' (docs/requests/anim.md #7): ' + list.join(', ') : ''}`);
  ok('roster: explicit weapon styles match the registry');
}
