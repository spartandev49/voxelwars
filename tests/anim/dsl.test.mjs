// Unit tests of the clip DSL (src/anim/dsl.js), the retarget adapter, the library API and boot determinism.
import assert from 'node:assert';
import { ok } from './_common.mjs';
import { ClipLib, DEFAULT_META } from '../../src/anim/clips.js';
import { registerAllClips } from '../../src/anim/boot.js';
import { loadHumanoid } from './_common.mjs';
import { evalKeys, EASE, seq, mergeKeys, bake, mirrorClip, timeWarp, retimeTo, subclip, blendClips, scaleAmp, concat, wave, bump, smoothstep, clamp, FPS } from '../../src/anim/dsl.js';
import { clampHinges, HINGE } from '../../src/anim/ual.js';

const close = (a, b, tol = 1e-5, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);

// ---- easing and key evaluation --------------------------------------------------------------------------------------------------------------------------
for (const [name, f] of Object.entries(EASE)) {
  if (name === 'back' || name === 'bounce' || name === 'elastic' || typeof f !== 'function') continue;
  close(f(0), 0, 1e-9, name + '(0)'); close(f(1), 1, 1e-9, name + '(1)');
}
const out = [0];
evalKeys([[0, 0, 'lin'], [1, 10, 'lin']], 0.25, 1, false, 1, out); close(out[0], 2.5, 1e-9, 'linear');
evalKeys([[0, 0, 'lin'], [1, 10, 'lin']], -3, 1, false, 1, out); close(out[0], 0, 1e-9, 'clamp before');
evalKeys([[0, 0, 'lin'], [1, 10, 'lin']], 9, 1, false, 1, out); close(out[0], 10, 1e-9, 'clamp after');
// cyclic: the segment from the last key wraps to the first, so t = period reads the first key again
const cyc = [[0, 1, 'lin'], [0.5, 3, 'lin']];
evalKeys(cyc, 0.75, 1, true, 1, out); close(out[0], 2, 1e-9, 'cyclic wrap midpoint');
evalKeys(cyc, 1, 1, true, 1, out); close(out[0], 1, 1e-9, 'cyclic period');
// a spline passes through its keys
const sp = [[0, 0, 'spline'], [0.5, 4, 'spline'], [1, 0, 'spline']];
evalKeys(sp, 0.5, 1, false, 1, out); close(out[0], 4, 1e-9, 'spline key');
ok('dsl: easing endpoints, linear / clamped / cyclic / spline evaluation');

// ---- seq + bake: a clip hits its keys exactly, loops are periodic -------------------------------------------------------------------------------------
const k = seq([[0, { armUR: [0, 0, 0], root: { y: 0 } }], [0.5, { armUR: [1, 0.5, -0.25], root: { y: 0.1 } }, 'lin'], [1, { armUR: [0, 0, 0], root: { y: 0 } }, 'lin']]);
const c = bake({ id: 't_seq', rig: 'hum1', dur: 1, keys: k, hit: 0.5, meta: { cls: 'strike' } });
assert.strictEqual(c.frames, 30); assert.strictEqual(c.meta.hitFrame, 15);
close(c.q.armUR[15 * 3], 1, 1e-6, 'key frame rx'); close(c.q.armUR[15 * 3 + 2], -0.25, 1e-6, 'key frame rz'); close(c.root.y[15], 0.1, 1e-6, 'root key');
close(c.q.armUR[29 * 3], 0, 1e-6, 'last frame = last key (non-loop clips end exactly on the final pose)');
const loop = bake({ id: 't_loop', rig: 'hum1', dur: 1, loop: true, build(cx, t, u) { cx.rot('head', Math.sin(u * Math.PI * 2) * 0.3, 0, 0); } });
close(loop.q.head[0], 0, 1e-6, 'loop starts at phase 0');
const step = Math.abs(loop.q.head[3 * 29] - loop.q.head[0]), typical = Math.abs(loop.q.head[3 * 1] - loop.q.head[0]);
assert.ok(step <= typical * 1.05, 'loop seam: frame N-1 -> frame 0 is one ordinary step');
// merged key sets keep both channels
const mk = mergeKeys(seq([[0, { head: [0, 0, 0] }], [1, { head: [1, 0, 0] }, 'lin']]), { aim: [[0, 0.5, 0, 1], [1, 0.4, 0, 1]] });
assert.ok(mk.head && mk.aim);
ok('dsl: bake hits keys exactly, loops are periodic, key sets merge');

// ---- clip transforms -------------------------------------------------------------------------------------------------------------------------------------
const slash = bake({ id: 't_slash', rig: 'hum1', dur: 0.6, hit: 0.3, keys: seq([[0, { armUR: [0, 0.2, -0.4], armUL: [0, 0.1, 0.4], root: { x: 0.05, roll: 0.1 } }], [0.6, { armUR: [-1.5, 0.6, -0.2], armUL: [-0.5, -0.2, 0.9], root: { x: -0.05, roll: -0.1 } }, 'lin']]) });
const mir = mirrorClip(slash, 't_slash_m');
assert.ok(mir.q.armUL && mir.q.armUR, 'mirror swaps left/right part ids');
close(mir.q.armUL[3 * 10 + 1], -slash.q.armUR[3 * 10 + 1], 1e-6, 'mirrored ry flips sign');
close(mir.q.armUL[3 * 10], slash.q.armUR[3 * 10], 1e-6, 'mirrored rx is unchanged');
close(mir.root.x[7], -slash.root.x[7], 1e-6, 'mirrored root.x flips');
close(mir.q.armUL[3 * 10 + 2], -slash.q.armUR[3 * 10 + 2], 1e-6, 'mirrored rz flips sign');
const twice = mirrorClip(mir, 't_slash');
for (let i = 0; i < slash.q.armUR.length; i++) close(twice.q.armUR[i], slash.q.armUR[i], 1e-6, 'mirror twice = identity');
const slow = retimeTo(slash, 1.2);
assert.strictEqual(slow.frames, 36);
close(slow.q.armUR[3 * 35], slash.q.armUR[3 * 17], 1e-6, 'retime keeps the pose at the end'); // last frame of both clips is the same pose
const sub = subclip(slash, 0.1, 0.4);
assert.strictEqual(sub.frames, 9);
const mid = blendClips(slash, mirrorClip(slash, 'x'), 0.5);
assert.ok(mid.q.armUR, 'blendClips returns a clip');
const small = scaleAmp(slash, 0.5, ['armUR']);
close(small.q.armUR[3 * 17], slash.q.armUR[3 * 17] * 0.5, 1e-6, 'scaleAmp halves the amplitude');
const cc = concat(slash, slash, 3, { id: 't_cc' });
assert.ok(cc.frames >= slash.frames * 2 - 3 && cc.frames <= slash.frames * 2, 'concat length');
const w = timeWarp(slash, [[0, 0], [0.3, 0.1], [0.6, 0.6]]);
assert.strictEqual(w.frames, 18);
close(w.q.armUR[3 * 3], slash.q.armUR[3 * 9], 1e-6, 'timeWarp: source 0.3 s shows up at 0.1 s');
ok('dsl: mirror (twice = identity), retime, subclip, blend, scale, concat, time warp');

// ---- helpers ------------------------------------------------------------------------------------------------------------------------------------------------
close(wave(0.25), 1, 1e-9); close(bump(0.5, 0.5, 0.2), 1, 1e-9); close(bump(0.9, 0.5, 0.2), 0, 1e-9);
close(smoothstep(0, 1, 0.5), 0.5, 1e-9); assert.strictEqual(clamp(5, 0, 1), 1); assert.strictEqual(FPS, 30);
ok('dsl: wave / bump / smoothstep / clamp');

// ---- hinge clamp (retargeted clips) ----------------------------------------------------------------------------------------------------------------------
const hc = { frames: 3, q: { legLL: new Float32Array([-1, 0.5, 0.2, 3.5, 0, 0, 1, 0, 0]), armLL: new Float32Array([0.9, 0, 0, -4, 0, 0, -1, 0, 0.3]) } };
const n = clampHinges(hc);
assert.strictEqual(n, 4);
assert.deepStrictEqual([...hc.q.legLL], [HINGE.legLL[0], 0, 0, HINGE.legLL[1], 0, 0, 1, 0, 0].map(Math.fround));
assert.ok(hc.q.armLL[0] <= HINGE.armLL[1] + 1e-6 && hc.q.armLL[3] >= HINGE.armLL[0] - 1e-6 && hc.q.armLL[8] === 0);
ok('ual: hinge clamp limits knees / elbows and zeroes their ry / rz');

// ---- library API ---------------------------------------------------------------------------------------------------------------------------------------
ClipLib.reset();
for (const id of Object.keys(DEFAULT_META)) assert.ok(ClipLib.has(id), 'DEFAULT_META clip ' + id);
assert.strictEqual(ClipLib.duration('walk'), ClipLib.dur('walk'));
const v0 = ClipLib.version;
ClipLib.register(bake({ id: 'walk', rig: 'hum1', dur: 0.5, loop: true, speedRef: 3, keys: seq([[0, { head: [0, 0, 0] }], [0.5, { head: [0.1, 0, 0] }, 'lin']]) }));
ClipLib.register(bake({ id: 'walk', rig: 'quad1', dur: 1.2, loop: true, speedRef: 1.3, keys: seq([[0, { body: [0, 0, 0] }], [1.2, { body: [0.1, 0, 0] }, 'lin']]) }));
assert.ok(ClipLib.version > v0, 'register bumps the version (animator caches key off it)');
close(ClipLib.dur('walk'), 0.5, 1e-9, 'plain id belongs to hum1'); close(ClipLib.dur('walk', 'quad1'), 1.2, 1e-9, 'rig-qualified duration');
close(ClipLib.meta('walk', 'quad1').speedRef, 1.3, 1e-9); assert.strictEqual(ClipLib.owner('walk'), 'hum1');
close(ClipLib.dur('nonexistent_clip'), ClipLib.dur('idle'), 1e-9, 'unknown clips fall back to idle timing');
ClipLib.reset();
ok('clips: DEFAULT_META complete, rig-qualified entries, plain id owned by hum1, unknown ids fall back, version bumps');

// ---- boot is deterministic and idempotent -------------------------------------------------------------------------------------------------------------------
function snapshot() {
  ClipLib.reset(); const r = registerAllClips(ClipLib, { humanoid: loadHumanoid() });
  const h = []; for (const key of ClipLib.qualifiedIds().sort()) {
    const [rig, id] = key.split(':'), cl = ClipLib.getQualified(id, rig); let acc = cl.frames * 31 + (cl.loop ? 7 : 0);
    for (const q of Object.values(cl.q)) for (let i = 0; i < q.length; i += 5) acc = (acc * 33 + Math.round(q[i] * 1e4)) | 0;
    for (const q of Object.values(cl.root || {})) for (let i = 0; i < q.length; i += 3) acc = (acc * 33 + Math.round(q[i] * 1e4)) | 0;
    h.push(key + '=' + acc);
  }
  return { r, h: h.join(',') };
}
const a = snapshot(), b = snapshot();
assert.strictEqual(a.h, b.h, 'two boots must produce identical clips');
assert.strictEqual(a.r.authored, b.r.authored);
assert.ok(a.r.authored > 100, 'authored clip count');
ok(`boot: deterministic (${a.r.authored} authored + ${a.r.adopted} adopted clips, identical on every boot)`);
