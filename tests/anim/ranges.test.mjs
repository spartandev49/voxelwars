// A3 (limb flips, joint ranges) + A7 (death: every unit kind plays a death clip and ends lying on the ground, nothing T-posed).
//  - every hum1 clip (authored and retargeted): knee and elbow stay inside their hinge range (rx only), the other joints inside generous anatomical boxes
//    (lying / falling clips get wider head, body and shoulder boxes), and no channel moves more than 2.4 rad in one frame (a flip is ~3.1 rad);
//  - every death clip of every shipped model: the lowest point of the posed model rests on the ground (+-2 cm) at the end and never sinks below -2 cm
//    at any frame (the animator's floor fit), the body ends lying (its up axis turned > 60 degrees), and the arms are not both straight out sideways.
import assert from 'node:assert';
import { boot, ClipLib, Animator, ok } from './_common.mjs';
import { describeModel, fk, lowestPoint } from '../../src/anim/analysis.js';
import { HINGE } from '../../src/anim/ual.js';
import { createFixture } from '../fixtures/index.js';
import { BUILDERS } from '../../src/content/era_ancient/beasts/index.js';

boot();
// ---- joint ranges -------------------------------------------------------------------------------------------------------------------------------------
const LYING = /^(death|getup|knockdown|tumble|flail|sleep|stagger|stun|dizzy|launch|sit|cower|crew_|ride_death|roll)/;   // lying, falling and acrobatic clips get wider boxes
const BOX = {       // [rx lo, rx hi, ry lo, ry hi, rz lo, rz hi]
  body: [-1.3, 1.3, -1.5, 1.5, -0.9, 0.9], head: [-1.2, 1.5, -2.1, 2.1, -0.9, 0.9],
  armUL: [-3.6, 2.4, -2.0, 2.0, -0.9, 2.4], armUR: [-3.6, 2.4, -2.0, 2.0, -2.4, 0.9], legUL: [-2.8, 1.3, -1.0, 1.0, -1.0, 1.0], legUR: [-2.8, 1.3, -1.0, 1.0, -1.0, 1.0],
};
const WIDE = { body: [-2, 2, -3.2, 3.2, -1.6, 1.6], head: [-1.6, 1.8, -3.2, 3.2, -2.4, 2.4], armUL: [-4.2, 3.2, -3.2, 3.2, -3.2, 3.2], armUR: [-4.2, 3.2, -3.2, 3.2, -3.2, 3.2], legUL: [-3.2, 1.6, -1.6, 1.6, -1.6, 1.6], legUR: [-3.2, 1.6, -1.6, 1.6, -1.6, 1.6] };
const MAX_STEP = 2.4;
let nClips = 0, worstStep = 0, stepAt = '';
const bad = [];
for (const key of ClipLib.qualifiedIds()) {
  const [rig, id] = key.split(':'); if (rig !== 'hum1') continue;
  const c = ClipLib.getQualified(id, rig); nClips++;
  const lying = LYING.test(id), N = c.frames;
  for (const [part, q] of Object.entries(c.q)) {
    const hinge = HINGE[part], box = hinge ? null : (lying ? WIDE : BOX)[part];
    for (let k = 0; k < 3; k++) {
      for (let f = 0; f < N; f++) {
        const v = q[f * 3 + k];
        if (hinge) {
          if (k === 0 && (v < hinge[0] - 1e-3 || v > hinge[1] + 1e-3)) bad.push(`${id}.${part}.rx f${f} = ${v.toFixed(2)} outside the hinge range [${hinge[0]}, ${hinge[1]}]`);
          if (k > 0 && Math.abs(v) > 1e-3) bad.push(`${id}.${part} f${f}: a hinge carries no ${'xyz'[k]} rotation (${v.toFixed(2)})`);
        } else if (box && (v < box[k * 2] - 1e-3 || v > box[k * 2 + 1] + 1e-3)) bad.push(`${id}.${part}.r${'xyz'[k]} f${f} = ${v.toFixed(2)} outside [${box[k * 2]}, ${box[k * 2 + 1]}]`);
        if (f > 0) { const d = Math.abs(v - q[(f - 1) * 3 + k]); if (d > worstStep) { worstStep = d; stepAt = `${id}.${part}.r${'xyz'[k]}@${f}`; } if (d > MAX_STEP) bad.push(`${id}.${part}.r${'xyz'[k]} flips by ${d.toFixed(2)} rad at frame ${f}`); }
      }
    }
  }
}
const uniq = [...new Set(bad.map((b) => b.replace(/ f\d+/, '')))];
assert.deepStrictEqual(uniq.slice(0, 12), [], `A3 joint ranges / flips: ${uniq.length} violations, first: ${uniq.slice(0, 5).join(' | ')}`);
ok(`A3 ${nClips} hum1 clips: hinges inside [knee 0..2.75, elbow -2.85..0.1], joints inside their anatomical boxes, largest one-frame change ${worstStep.toFixed(2)} rad (${stepAt}) < ${MAX_STEP}`);

// ---- A7: deaths ----------------------------------------------------------------------------------------------------------------------------------------
const FIX = [['soldier (spear + shield)', () => createFixture('soldier', { main: 'dory', off: 'hoplon' })], ['soldier (greataxe)', () => createFixture('soldier', { main: 'greataxe', off: 'none' })], ['hum_lite', () => createFixture('hum_lite')]];
for (const [bid, build] of Object.entries(BUILDERS)) FIX.push([bid, async () => build()]);
const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
let nDeaths = 0; const worst = { sink: 0, rest: 0 };
for (const [label, make] of FIX) {
  const m = await make();
  const desc = describeModel(m), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  desc.skip = new Uint8Array(P);          // same rule as the animator's floor fit: held items and capes do not count
  for (let i = 0; i < P; i++) if (/(^|_)(weapon|offhand|cape2?|crest)$/.test(m.parts[i].id)) desc.skip[i] = 1;
  const organic = !/catapult|ballista|trojan/.test(label);
  const bodyIdx = [m.partIndex('body'), m.partIndex('frame'), m.partIndex('base')].find((i) => i >= 0);
  for (const id of ['death_back', 'death_front', 'death_spin']) {
    const rig = m.meta.rig || 'hum1';
    assert.ok(ClipLib.getQualified(id, rig) || ClipLib.getQualified(id, 'hum1'), `${label}: no ${id} clip`);
    const dur = ClipLib.dur(id, rig), st = { clip: id, t: 0, rate: 1, flinch: 0, dir: 0, prev: id, blend: 1 };
    const N = Math.round(dur * 30);
    for (let f = 0; f <= N; f++) {
      st.t = f / 30; Animator.pose(m, st, { root, id: 3, heading: NaN, scale: 1 }, pose); fk(desc, pose, W);
      const y = lowestPoint(desc, W, root);
      worst.sink = Math.min(worst.sink, y);
      assert.ok(y > -0.02, `A7 ${label} ${id} t=${st.t.toFixed(2)}: lowest point ${y.toFixed(3)} sinks into the floor`);
      if (f === N) {
        worst.rest = Math.max(worst.rest, Math.abs(y));
        assert.ok(Math.abs(y) <= 0.02, `A7 ${label} ${id}: ends ${y.toFixed(3)} above the ground (must rest on it)`);
        if (organic) {
          const w = bodyIdx * 12, up = W[w + 5];           // world y of the body's own up axis (before the root transform)
          const c = Math.cos(root.pitch) * Math.cos(root.roll);   // root tilt turns it further
          const upY = up * c;
          assert.ok(Math.abs(root.pitch) > 1.0 || Math.abs(root.roll) > 0.9 || Math.abs(upY) < 0.5, `A7 ${label} ${id}: still upright at the end (pitch ${root.pitch.toFixed(2)}, roll ${root.roll.toFixed(2)})`);
        }
        // T-pose: both arms straight out sideways at the end
        const L = m.partIndex('armUL'), R = m.partIndex('armUR'), LL = m.partIndex('armLL'), LR = m.partIndex('armLR');
        if (L >= 0 && R >= 0) {
          const tl = Math.abs(pose[L * 9 + 5]) > 1.2 && Math.abs(pose[R * 9 + 5]) > 1.2 && Math.abs(pose[LL * 9 + 3]) < 0.4 && Math.abs(pose[LR * 9 + 3]) < 0.4;
          assert.ok(!tl, `A7 ${label} ${id}: ends in a T-pose`);
        }
      }
    }
    nDeaths++;
  }
}
ok(`A7 ${nDeaths} death clips over ${FIX.length} models: never below the floor (min ${worst.sink.toFixed(3)}), rest on it (max ${worst.rest.toFixed(3)} off), lying, no T-pose`);
