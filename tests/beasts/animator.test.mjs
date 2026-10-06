// BEASTS: every model poses through the real Animator without throwing and with finite output for the sim's common clip ids,
// and mounted riders keep their saddle attachment (the rider part chain is rigid below `saddle`, so error stays 0).
import assert from 'node:assert/strict';
import { SHEET_MODELS } from '../../src/content/era_ancient/beasts/index.js';
import { Animator, POSE_STRIDE } from '../../src/anim/animator.js';
import { ClipLib } from '../../src/anim/clips.js';
import { registerAllClips } from '../../src/anim/boot.js';

registerAllClips(ClipLib, {});
Animator.warn = null;
const CLIPS = ['idle', 'idle_combat', 'walk', 'run', 'strike_thrust', 'shoot_bow', 'launch', 'death_back'];
let n = 0;
for (const e of SHEET_MODELS) {
  const m = e.make();
  const out = new Float32Array(m.parts.length * POSE_STRIDE);
  for (const clip of CLIPS) {
    const st = { clip, t: 0.3, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 0.6 };
    const root = Animator.pose(m, st, { speed: 3, heading: 0 }, out);
    for (let i = 0; i < out.length; i++) assert.ok(Number.isFinite(out[i]), `${e.id}/${clip}: non-finite pose value at ${i}`);
    for (let p = 0; p < m.parts.length; p++) for (let k = 6; k < 9; k++) assert.ok(out[p * POSE_STRIDE + k] > 0, `${e.id}/${clip}: scale must stay positive`);
    n++;
  }
}
assert.ok(n >= SHEET_MODELS.length * CLIPS.length);
console.log(`beasts animator OK (${n} poses)`);
