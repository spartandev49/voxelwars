// A6: crossfade pops. The sim switches clips with blend 0 -> 1 over 0.14 s (state.blend += dt/0.14). Over a long random switch sequence the largest
// per-joint rotation change a switch adds on top of the previous clip's own motion must stay <= 0.35 rad, for every transition the sim can produce
// (neutral -> neutral, lying -> lying), for every weapon style and shield kind.
import assert from 'node:assert';
import { boot, ClipLib, Animator, ok, roster } from './_common.mjs';
import { makeSoldier } from '../fixtures/rigs.js';

boot();
const FIX = [
  { main: 'dory', off: 'hoplon' }, { main: 'xiphos', off: 'round_shield' }, { main: 'axe', off: 'none' }, { main: 'bow', off: 'none' }, { main: 'javelin', off: 'buckler' },
  { main: 'scepter', off: 'none' }, { main: 'club', off: 'scutum' }, { main: 'sarissa', off: 'none' }, { main: 'greataxe', off: 'none' }, { main: 'gladius', off: 'pavise' },
];
// geodesic angle between two euler (Ry*Rx*Rz) rotations: Euler triples are not unique (a continuous motion can flip ry/rz by PI near rx = +-PI/2),
// so the pop is measured on the rotations themselves
const mat = (rx, ry, rz) => { const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx]; };
const angle = (A, B) => { let tr = 0; for (let i = 0; i < 9; i++) tr += A[i] * B[i]; return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))); };
const mulv = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const dirAngle = (u, v) => Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2])));

// sim-reachable humanoid clips (what ai.js / combat.js ever publish)
const IDS = ['idle', 'idle_combat', 'block_hold', 'strike_slash_1', 'strike_slash_2', 'strike_thrust', 'strike_overhead', 'strike_bash', 'shoot_bow', 'throw', 'cast', 'kick', 'block_hit', 'hit_front', 'hit_back',
  'stagger', 'stun', 'dizzy', 'cower', 'taunt', 'cheer', 'sit', 'death_back', 'death_front', 'death_spin', 'getup', 'launch', 'sleep'];
const LIE = new Set(['death_back', 'death_front', 'death_spin']);
const reachable = (a, b) => {
  if (LIE.has(a)) return b === 'getup' || LIE.has(b);          // a corpse only ever gets up (revive) or stays down
  if (b === 'getup') return false;                              // getup starts lying
  return true;
};
const DT = 1 / 30;
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let grandMax = 0, total = 0, grandRamp = 0;
const failures = [];

// the shipped humanoid roster too (real models: the weapon style comes from the shape heuristic where compileSoldier does not set it)
const KITS = [];
for (const fx of FIX) KITS.push({ label: fx.main + '+' + fx.off, m: await makeSoldier(fx), iters: 1500 });
// compileSoldier does not put the weapon style into model.meta yet (docs/requests/anim.md #7): the test sets it the way the fix will, so the animator runs with the real style
const { getPart } = await import('../../src/content/era_ancient/blueprints.js');
for (const r of await roster()) {
  if (r.model.meta.rig !== 'hum1' || (r.model.meta.subrigs && r.model.meta.subrigs.length > 1)) continue;
  const e = r.def.model && r.def.model.blueprint && getPart('mains', r.def.model.blueprint.main);
  if (e) { r.model.meta.weaponStyle = e.meta.style; Animator.invalidate(r.model); }
  KITS.push({ label: r.id, m: r.model, iters: 450 });
}
for (const { label, m, iters } of KITS) {
  const P = m.parts.length, outA = new Float32Array(P * 9), outB = new Float32Array(P * 9), root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  // a spear / staff / javelin is rotationally symmetric about its own axis: its roll is invisible, so for those weapons the pop is the change of where the
  // shaft POINTS (the rest axis mapped by the part's pose). Blades, axes, clubs and bows are measured as full rotations.
  const info = Animator.info(m), a0 = info.groups[0].wRestAxis;
  const shaft = ['thrust', 'pike', 'throw', 'cast'].includes(info.style);
  const wIdx = m.parts.findIndex((q) => q.id === 'weapon');
  let lastPart = '';
  const maxDelta = (a, b) => {
    let d = 0;
    for (let p = 0; p < P; p++) {
      const Ma = mat(a[p * 9 + 3], a[p * 9 + 4], a[p * 9 + 5]), Mb = mat(b[p * 9 + 3], b[p * 9 + 4], b[p * 9 + 5]);
      const x = (p === wIdx && shaft) ? dirAngle(mulv(Ma, a0), mulv(Mb, a0)) : angle(Ma, Mb);
      if (x > d) { d = x; lastPart = m.parts[p].id; }
    }
    return d;
  };
  let n = 0, maxPop = 0, maxRamp = 0, where = '', rampAt = '';
  for (let it = 0; it < iters; it++) {
    const a = IDS[(rnd() * IDS.length) | 0], b = IDS[(rnd() * IDS.length) | 0];
    if (a === b || !reachable(a, b)) continue;
    const da = ClipLib.dur(a, 'hum1'), loopA = ClipLib.get(a, 'hum1').loop;
    // the sim switches at any time while a plays (attacks are interrupted by hits, loops at random phase)
    const ta = loopA ? rnd() * da : Math.min(da, rnd() * da);
    const ex = { root, speed: 0, id: 11, heading: 0, scale: 1 };
    // two identical units: one keeps playing a, the other switches to b
    const keep = { clip: a, t: ta, rate: 1, flinch: 0, dir: 0, prev: a, blend: 1 }, sw = { clip: a, t: ta, rate: 1, flinch: 0, dir: 0, prev: a, blend: 1 };
    Animator.pose(m, keep, ex, outA); Animator.pose(m, sw, ex, outB);
    keep.t = ta + DT; Animator.pose(m, keep, ex, outA);                    // the pose a would show on the next frame anyway
    const BR = 0.14;                                                       // spec 7: the sim advances blend by dt / 0.14 (world.js _tickDying uses 0.1: see docs/requests/anim.md)
    sw.prev = a; sw.clip = b; sw.t = 0; sw.blend = DT / BR;                // setAnim() resets t and blend: the first frame after the switch shows blend = dt / BR
    Animator.pose(m, sw, ex, outB);
    const pop = maxDelta(outA, outB), popPart = lastPart;                  // what the crossfade adds on top of a's own motion
    n++; if (pop > maxPop) { maxPop = pop; where = `${a}->${b} [${popPart}]`; }
    // the rest of the ramp (informational): the crossfade moves poses, at most ramp-velocity per frame
    let prev = outB.slice(), cur = new Float32Array(P * 9);
    for (let f = 2; f <= 6; f++) { sw.t = (f - 1) * DT; sw.blend = Math.min(1, f * DT / BR); Animator.pose(m, sw, ex, cur); const d = maxDelta(prev, cur); if (d > maxRamp) { maxRamp = d; rampAt = `${a}->${b} f${f} [${lastPart}]`; } prev = cur.slice(); }
    if (pop > 0.35) failures.push(`${label}: ${a}->${b} [${popPart}] ${pop.toFixed(3)} (ta ${ta.toFixed(2)})`);
  }
  console.log(`  ${label.padEnd(22)} style ${String(info.style).padEnd(8)} transitions ${n}  max switch-frame change ${maxPop.toFixed(3)} rad (${where})  ramp ${maxRamp.toFixed(2)} (${rampAt})`);
  total += n; if (maxPop > grandMax) grandMax = maxPop; if (maxRamp > grandRamp) grandRamp = maxRamp;
}
if (failures.length) console.log(failures.slice(0, 20).join('\n'));
assert.ok(grandMax <= 0.35 + 1e-9, `A6: switch-frame change ${grandMax.toFixed(3)} rad > 0.35 (${failures.length} transitions over)`);
ok(`A6 crossfade: max change at a switch frame ${grandMax.toFixed(3)} rad over ${total} random transitions x ${KITS.length} weapon/shield kits and shipped humanoids`);
