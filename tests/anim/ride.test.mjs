// A8: riders stay on their seat. For every composed unit (mounted units, chariot, elephant howdah) and every live clip the sim can publish, the anchor part of
// each seated sub-rig (rider r_, driver d_, archers a_ / a1_ / a2_: its top-level part, the hips) must stay within 0.05 u of its rest position IN THE FRAME
// OF THE PART it is mounted on (saddle, body, howdah). Siege crews (c1_..c3_) stand beside their machine and work it (crank, push, step back): they only
// have to stay within 0.4 u of their station. Death clips are exempt (the rider falls off).
import assert from 'node:assert';
import { boot, ClipLib, Animator, ok } from './_common.mjs';
import { describeModel, fk } from '../../src/anim/analysis.js';
import { BUILDERS } from '../../src/content/era_ancient/beasts/index.js';

boot();
const LIMIT = 0.05, CREW_LIMIT = 0.4;
const CLIPS = ['idle', 'idle_combat', 'walk', 'run', 'trot', 'gallop', 'strike_thrust', 'strike_slash_1', 'strike_bash', 'shoot_bow', 'throw', 'cast', 'launch', 'reload', 'rear', 'stagger', 'hit_front', 'hit_back', 'block_hit',
  'cheer', 'taunt', 'stun', 'dizzy', 'cower', 'flap', 'trumpet', 'strike_gore'];
const SPEED = { walk: 1.4, trot: 3.5, run: 8, gallop: 9 };
const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };

let nUnits = 0, nPoses = 0, worstAll = 0, worstWhere = '';
for (const [bid, build] of Object.entries(BUILDERS)) {
  const m = build();
  const subs = m.meta.subrigs || [];
  const crew = subs.filter((s, i) => i > 0 && /^(r_|d_|a_|a1_|a2_|c\d_)/.test(s.prefix || ''));
  if (!crew.length) continue;
  nUnits++;
  const desc = describeModel(m), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  // anchors: [part index, parent part index, label, limit]
  const anchors = [];
  for (const s of crew) {
    const inGroup = new Set(s.parts), lim = /^c\d_/.test(s.prefix) ? CREW_LIMIT : LIMIT;
    for (const pid of s.parts) { const p = m.byId[pid]; if (p.parent && !inGroup.has(p.parent)) anchors.push([p.index, m.byId[p.parent].index, pid, lim]); }
  }
  // position of the anchor's pivot in its parent's frame
  const local = (W, a, pa, out) => {
    const w = pa * 12, dx = W[a * 12 + 3] - W[w + 3], dy = W[a * 12 + 7] - W[w + 7], dz = W[a * 12 + 11] - W[w + 11];
    out[0] = W[w] * dx + W[w + 4] * dy + W[w + 8] * dz; out[1] = W[w + 1] * dx + W[w + 5] * dy + W[w + 9] * dz; out[2] = W[w + 2] * dx + W[w + 6] * dy + W[w + 10] * dz;
  };
  // rest
  const rest0 = new Float32Array(P * 9); for (let i = 0; i < P; i++) { rest0[i * 9 + 6] = rest0[i * 9 + 7] = rest0[i * 9 + 8] = 1; }
  fk(desc, rest0, W);
  const r0 = anchors.map(([a, pa]) => { const o = [0, 0, 0]; local(W, a, pa, o); return o; });
  const tmp = [0, 0, 0];
  for (const clip of CLIPS) {
    const dur = ClipLib.dur(clip, m.meta.rig) || 1, sp = SPEED[clip] || 0;
    const st = { clip, t: 0, rate: 1, flinch: 0, dir: 0, prev: clip, blend: 1 };
    const N = Math.max(8, Math.round(Math.min(dur, 3) * 30));
    for (let f = 0; f < N; f++) {
      const t = f / 30;
      st.t = t % Math.max(dur, 1 / 30);
      Animator.pose(m, st, { root, speed: sp, gait: sp * t, id: 5, t, heading: 0, scale: 1 }, pose);
      fk(desc, pose, W); nPoses++;
      for (let k = 0; k < anchors.length; k++) {
        local(W, anchors[k][0], anchors[k][1], tmp);
        const e = Math.hypot(tmp[0] - r0[k][0], tmp[1] - r0[k][1], tmp[2] - r0[k][2]);
        if (anchors[k][3] === LIMIT && e > worstAll) { worstAll = e; worstWhere = `${bid} ${anchors[k][2]} clip ${clip} t ${t.toFixed(2)}`; }
        assert.ok(e < anchors[k][3], `A8: ${bid} ${anchors[k][2]} drifts ${e.toFixed(3)} u from its seat in clip ${clip} at ${t.toFixed(2)} s (limit ${anchors[k][3]})`);
      }
    }
  }
}
assert.ok(nUnits >= 10, 'expected the mounted / crewed units');
ok(`A8 ${nUnits} crewed units, ${nPoses} poses: worst seat drift ${worstAll.toFixed(4)} u (${worstWhere}) < ${LIMIT}`);
