// quad1 clips (horse, camel, hound, goat, centaur body): gaits generated from the BEASTS gait recipe (model.meta.gait: amp, duty, stride),
// idle, rear, bite, headbutt, reactions and deaths. Legs are single rigid parts hanging from a pivot 2 voxels inside the barrel:
// forward swing = negative rx; the leg's vertical translation tracks its swing arc so a planted foot stays on the ground.
// Species variants are registered as '<species>_<clip>' (camel, hound, goat); the animator tries them first (model.meta.species).
import { define, seq, mergeKeys, wave, waveC, bump, clamp, lerp, smoothstep, EASE } from '../dsl.js';
import { plantRigidLeg } from '../gait.js';

const PI = Math.PI, TAU = Math.PI * 2;

/** species geometry (world units; from beasts/quad1.js): hipH = pivot-to-ground leg length, zF/zB = leg pivot z, hw = half body width */
export const QUAD_SPECIES = {
  horse: { id: 'horse', L: 1.2, zF: 1.05, zB: -1.05, hw: 0.6, bodyY: 1.0, pace: false, Dk: 1.0, neck: [0.0, 0.0], tail: 1.0 },
  camel: { id: 'camel', L: 1.6, zF: 1.05, zB: -1.05, hw: 0.5, bodyY: 1.4, pace: true, Dk: 1.2, neck: [0.1, 0.0], tail: 0.5 },
  hound: { id: 'hound', L: 0.8, zF: 0.52, zB: -0.54, hw: 0.35, bodyY: 0.6, pace: false, Dk: 0.72, neck: [0.0, 0.0], tail: 1.6 },
  goat:  { id: 'goat', L: 0.9, zF: 0.54, zB: -0.56, hw: 0.35, bodyY: 0.7, pace: false, Dk: 0.8, neck: [0.0, 0.0], tail: 1.3 },
};
// BEASTS recipe (beasts/quad1.js makeGait) + cycle durations chosen so speedRef = stride / D matches the roster speeds
const GAITS = {
  walk:   { amp: 0.42, duty: 0.66, D: 1.15, bob: 0.012, pitch: 0.0, neckAmp: 0.10, liftK: 0.108, off: [0.25, 0.75, 0.0, 0.5] },       // FL FR BL BR (lateral sequence)
  trot:   { amp: 0.55, duty: 0.50, D: 0.72, bob: 0.03, pitch: 0.02, neckAmp: 0.05, liftK: 0.142, off: [0.0, 0.5, 0.5, 0.0] },          // diagonal pairs
  gallop: { amp: 0.85, duty: 0.34, D: 0.52, bob: 0.1, pitch: 0.14, neckAmp: 0.16, liftK: 0.2, off: [0.62, 0.52, 0.0, 0.1] },       // BL BR FR FL (transverse)
};
const PACE_OFF = { walk: [0.0, 0.5, 0.0, 0.5], trot: [0.0, 0.5, 0.0, 0.5] };
export const LEGS = ['legFL', 'legFR', 'legBL', 'legBR'];
export const stride = (sp, g) => (2 * sp.L * Math.sin(g.amp)) / g.duty;
const eo = (x) => (x < 0.5 ? 0.5 * Math.pow(2 * x, 1.7) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.7));

/** foot target of one leg at gait phase ph, relative to the leg's own rest position: [z (forward), y (lift above the ground)] */
function footAt(ph, sp, g, out) {
  const zmax = sp.L * Math.sin(g.amp);
  if (ph < g.duty) { out[0] = zmax * (1 - 2 * (ph / g.duty)); out[1] = 0; }
  else { const x = (ph - g.duty) / (1 - g.duty); out[0] = -zmax + 2 * zmax * eo(x); out[1] = (g.liftK * sp.L) * Math.sin(PI * Math.pow(x, 0.9)); }
  return out;
}
const _ft = [0, 0], _lg = [0, 0, 0];
const HIP_Y = 0.2;      // the leg pivot sits 2 voxels above the belly line (beasts/quad1.js)
const plantLeg = (sp, zLeg, by, p, ft, out) => plantRigidLeg(sp.bodyY, sp.hipY === undefined ? HIP_Y : sp.hipY, sp.L, zLeg, by, p, ft, out);   // see gait.js

export function gaitBuild(sp, gname, gOverride) {
  const g = gOverride || GAITS[gname];
  const off = sp.pace && PACE_OFF[gname] ? PACE_OFF[gname] : g.off;
  const gallop = gname === 'gallop';
  return (c, t, u) => {
    // body vertical bob: walk/trot twice per cycle, gallop once
    const by = gallop ? -g.bob * 0.4 + g.bob * Math.max(0, Math.sin(TAU * (u + 0.1))) - g.bob * 0.5 * Math.max(0, -Math.sin(TAU * (u + 0.1))) : -g.bob * 0.5 + g.bob * 0.5 * Math.cos(TAU * 2 * u + 0.4);
    const pitch = gallop ? g.pitch * Math.sin(TAU * (u + 0.05)) : g.pitch * Math.sin(TAU * 2 * u + 1.0);
    c.pos('body', 0, by, 0).rot('body', pitch, 0, 0);
    for (let i = 0; i < 4; i++) {
      footAt((((u + off[i]) % 1) + 1) % 1, sp, g, _ft);
      plantLeg(sp, i < 2 ? sp.zF : sp.zB, by, pitch, _ft, _lg);
      c.rot(LEGS[i], _lg[0], 0, 0).pos(LEGS[i], 0, _lg[1], _lg[2]);
    }
    // neck + head: counter the body pitch, nod once per cycle (walk) / twice (trot) / stretch out (gallop)
    const nb = gallop ? -0.28 : sp.neck[0], n = wave(u, gallop ? 1 : (gname === 'trot' ? 2 : 1), 0.1);
    c.rot('neck', nb - pitch * 0.8 + n * g.neckAmp, 0, 0).rot('head', (gallop ? -0.12 : 0.02) + n * g.neckAmp * 0.5 - pitch * 0.4, 0, 0);
    // tail streams behind in a gallop, sways at a walk
    c.rot('tail', gallop ? 0.7 * sp.tail : 0.18 * sp.tail, 0, wave(u, 1) * 0.25 * sp.tail);
  };
}

for (const sp of [QUAD_SPECIES.horse, QUAD_SPECIES.camel, QUAD_SPECIES.hound, QUAD_SPECIES.goat]) {
  const pre = sp.id === 'horse' ? '' : sp.id + '_';
  for (const gname of ['walk', 'trot', 'gallop']) {
    const g = GAITS[gname], D = +(g.D * sp.Dk).toFixed(3), st = stride(sp, g);
    define(pre + gname, { rig: 'quad1', dur: D, loop: true, speedRef: +(st / D).toFixed(3), meta: { cls: 'move', stride: +st.toFixed(3), species: sp.id }, build: gaitBuild(sp, gname) });
  }
}

// ---- idle: breathing, weight shift, tail swish, a slow graze dip -----------------------------------------------------------------------------------
function idleBuild(sp, o = {}) {
  return (c, t, u) => {
    const br = wave(u, 1), sw = wave(u, 2, 0.2), dip = Math.pow(Math.max(0, wave(u, 1, 0.75)), 2);
    c.pos('body', 0, br * 0.006, 0).rot('body', br * 0.008, 0, 0).scl('body', 1, 1 + br * 0.012, 1 + br * 0.006);
    c.rot('neck', (o.neckBase || 0) + 0.04 * br + dip * (o.graze === undefined ? 0.5 : o.graze), (o.sway || 0.0) * wave(u, 1, 0.3), 0).rot('head', 0.02 + dip * 0.18 - 0.03 * br + (o.headTilt || 0) * wave(u, 1, 0.5), (o.look || 0.25) * wave(u, 1, 0.1), (o.tilt || 0) * wave(u, 1, 0.25));
    c.rot('tail', 0.15 * sp.tail + 0.05 * sw, 0, (o.wag || 0.35) * wave(u, o.wagRate || 2, 0.0) * sp.tail);
    // rest the near hind leg: weight shift
    const sh = wave(u, 1, 0.5);
    c.rot('legBR', 0.1 + 0.12 * Math.max(0, sh), 0, 0).pos('legBR', 0, 0.015 * Math.max(0, sh), 0);
    c.rot('legFL', -0.02 * br, 0, 0);
  };
}
define('idle', { rig: 'quad1', dur: 3.2, loop: true, meta: { cls: 'idle' }, build: idleBuild(QUAD_SPECIES.horse) });
define('idle_combat', { rig: 'quad1', dur: 1.6, loop: true, meta: { cls: 'ready' }, build(c, t, u) {
  const b = wave(u, 1), p = wave(u, 2);
  c.pos('body', 0, b * 0.01, 0).rot('body', 0.02, 0, 0).rot('neck', -0.12 + b * 0.03, 0, 0).rot('head', -0.05, wave(u, 1, 0.2) * 0.15, 0).rot('tail', 0.35, 0, wave(u, 2) * 0.25);
  c.rot('legFL', -0.12 + Math.max(0, p) * -0.55, 0, 0).pos('legFL', 0, Math.max(0, p) * 0.06, 0);        // pawing the ground
} });
define('camel_idle', { rig: 'quad1', dur: 4.0, loop: true, meta: { cls: 'idle', species: 'camel' }, build: idleBuild(QUAD_SPECIES.camel, { neckBase: 0.0, sway: 0.1, graze: 0.2, look: 0.35, wag: 0.1 }) });
define('hound_idle', { rig: 'quad1', dur: 2.0, loop: true, meta: { cls: 'idle', species: 'hound' }, build(c, t, u) {
  const br = wave(u, 2), pant = wave(u, 6);
  c.pos('body', 0, br * 0.004, 0).scl('body', 1, 1 + br * 0.02, 1).rot('neck', 0.05, wave(u, 1, 0.2) * 0.1, 0).rot('head', 0.08 + pant * 0.03, wave(u, 1) * 0.3, wave(u, 1, 0.25) * 0.08);
  c.rot('tail', 0.55, 0, wave(u, 4) * 0.6).rot('legBR', 0.06, 0, 0);
} });
define('goat_idle', { rig: 'quad1', dur: 2.6, loop: true, meta: { cls: 'idle', species: 'goat' }, build(c, t, u) {
  const br = wave(u, 1), chew = wave(u, 5);
  c.pos('body', 0, br * 0.004, 0).rot('neck', -0.05, wave(u, 1, 0.3) * 0.12, 0).rot('head', 0.05 + chew * 0.02, wave(u, 2, 0.1) * 0.35, wave(u, 1, 0.5) * 0.18);
  c.rot('tail', 0.2, 0, wave(u, 3) * 0.35);
} });

// ---- rear: the taunt / stamping rear. hind legs plant, the front lifts about the belly pivot --------------------------------------------------------
function pitchPivot(sp, phi) {            // body pitched by phi (negative = nose up) about its belly pivot while the hind feet stay put
  const y0 = 0.2, z0 = sp.zB, sn = Math.sin(phi), cs = Math.cos(phi);
  const yp = y0 * cs - z0 * sn, zp = y0 * sn + z0 * cs;
  return { by: y0 - yp, bz: z0 - zp };
}
function rearPose(sp, phi, forelegs) {
  const pv = pitchPivot(sp, phi);
  return { body: [phi, 0, 0], 'body.t': [0, pv.by, pv.bz], legBL: [-phi, 0, 0.05], legBR: [-phi, 0, -0.05], legFL: [forelegs[0], 0, 0.15], legFR: [forelegs[1], 0, -0.15],
    neck: [-0.15 - phi * 0.35, 0, 0], head: [-0.15, 0, 0], tail: [0.5, 0, 0] };
}
define('rear', {
  rig: 'quad1', dur: 1.0, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], tail: [0.15, 0, 0] }],
    [0.16, { body: [0.08, 0, 0], 'body.t': [0, -0.04, 0.03], neck: [0.15, 0, 0], head: [0.1, 0, 0], legFL: [0.0, 0, 0], legFR: [0.0, 0, 0], legBL: [0.04, 0, 0], legBR: [0.04, 0, 0], tail: [0.1, 0, 0] }, 'io'],
    [0.46, rearPose(QUAD_SPECIES.horse, -0.95, [-1.25, -1.1]), 'out'],
    [0.62, rearPose(QUAD_SPECIES.horse, -1.0, [-0.95, -1.4]), 'io'],
    [0.76, rearPose(QUAD_SPECIES.horse, -0.9, [-1.2, -0.9]), 'io'],
    [1.0, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], tail: [0.15, 0, 0] }, 'in'],
  ]),
});

// taunt = rear, cheer = a head-tossing hop
define('taunt', { rig: 'quad1', dur: 1.0, meta: { cls: 'other' }, keys: seq([[0, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0] }],
  [0.4, rearPose(QUAD_SPECIES.horse, -0.8, [-1.15, -1.0]), 'out'], [0.7, rearPose(QUAD_SPECIES.horse, -0.7, [-0.9, -1.2]), 'io'], [1.0, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0] }, 'in']]) });
define('cheer', { rig: 'quad1', dur: 1.2, loop: true, meta: { cls: 'other' }, build(c, t, u) {
  const hop = Math.abs(wave(u, 2)), s = wave(u, 2);
  c.pos('body', 0, hop * 0.12, 0).rot('body', -hop * 0.1, 0, 0).rot('neck', -0.35 + s * 0.15, 0, 0).rot('head', -0.3 + hop * 0.2, wave(u, 1) * 0.3, 0).rot('tail', 0.6, 0, s * 0.4);
  for (const l of LEGS) c.rot(l, -hop * 0.3 * (l[3] === 'F' ? 1.5 : 0.5), 0, 0).pos(l, 0, -hop * 0.12, 0);
} });

// ---- strike_bite: neck coils back, shoots forward, snaps (hit 0.22) --------------------------------------------------------------------------------------
define('strike_bite', {
  rig: 'quad1', dur: 0.55, hit: 0.22, recover: 0.36, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], tail: [0.2, 0, 0] }],
    [0.1, { body: [-0.1, 0, 0], 'body.t': [0, 0.0, -0.1], neck: [-0.45, 0, 0], head: [-0.4, 0, 0], legFL: [0.1, 0, 0], legFR: [0.1, 0, 0], legBL: [0.15, 0, 0], legBR: [0.15, 0, 0], tail: [0.5, 0, 0] }, 'out'],
    [0.22, { body: [0.12, 0, 0], 'body.t': [0, -0.04, 0.3], neck: [0.55, 0, 0], head: [0.5, 0, 0], legFL: [-0.3, 0, 0], legFR: [-0.2, 0, 0], legBL: [-0.2, 0, 0], legBR: [-0.2, 0, 0], tail: [0.5, 0, 0] }, 'in'],
    [0.3, { body: [0.1, 0, 0], 'body.t': [0, -0.03, 0.32], neck: [0.5, 0, 0], head: [0.3, 0, 0.0], legFL: [-0.32, 0, 0], legFR: [-0.22, 0, 0], legBL: [-0.22, 0, 0], legBR: [-0.2, 0, 0], tail: [0.4, 0, 0] }, 'out'],
    [0.55, { body: [0, 0, 0], 'body.t': [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], tail: [0.2, 0, 0] }, 'io'],
  ]),
});
// ---- strike_headbutt (goat / mule): rear back, hop and drive the horns, squash and stretch (hit 0.30) --------------------------------------------------------
define('strike_headbutt', {
  rig: 'quad1', dur: 0.7, hit: 0.3, recover: 0.48, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, { body: [0, 0, 0], 'body.t': [0, 0, 0], 'body.s': [1, 1, 1], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0] }],
    // anticipation: sink on the haunches (squash), head cocked up
    [0.14, { body: [-0.22, 0, 0], 'body.t': [0, -0.1, -0.12], 'body.s': [1.05, 0.9, 1.05], neck: [-0.35, 0, 0], head: [-0.5, 0, 0], legFL: [0.3, 0, 0], legFR: [0.3, 0, 0], legBL: [0.4, 0, 0], legBR: [0.4, 0, 0] }, 'out'],
    // stretch + drive: spring forward, head down
    [0.3, { body: [0.2, 0, 0], 'body.t': [0, 0.06, 0.42], 'body.s': [0.96, 1.06, 1.1], neck: [0.5, 0, 0], head: [0.75, 0, 0], legFL: [-0.7, 0, 0], legFR: [-0.7, 0, 0], legBL: [-0.5, 0, 0], legBR: [-0.5, 0, 0] }, 'in'],
    [0.38, { body: [0.18, 0, 0], 'body.t': [0, -0.04, 0.4], 'body.s': [1.06, 0.94, 0.96], neck: [0.55, 0, 0], head: [0.6, 0, 0], legFL: [-0.4, 0, 0], legFR: [-0.4, 0, 0], legBL: [-0.3, 0, 0], legBR: [-0.3, 0, 0] }, 'out'],
    [0.7, { body: [0, 0, 0], 'body.t': [0, 0, 0], 'body.s': [1, 1, 1], neck: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0] }, 'io'],
  ]),
});

// ---- reactions -------------------------------------------------------------------------------------------------------------------------------------
const Z4 = { root: { y: 0, roll: 0, pitch: 0, yaw: 0 }, body: [0, 0, 0], 'body.t': [0, 0, 0], 'body.s': [1, 1, 1], neck: [0, 0, 0], head: [0, 0, 0], tail: [0.15, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], 'legFL.t': [0, 0, 0], 'legFR.t': [0, 0, 0], 'legBL.t': [0, 0, 0], 'legBR.t': [0, 0, 0] };
const P4 = (o) => Object.assign({}, Z4, o);
define('hit_front', { rig: 'quad1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, Z4], [0.08, P4({ body: [-0.1, 0, 0], neck: [-0.35, 0, 0], head: [-0.3, 0, 0], legFL: [-0.2, 0, 0], legFR: [-0.2, 0, 0], 'body.t': [0, 0, -0.06] }), 'out'], [0.4, Z4, 'io']]) });
define('hit_back', { rig: 'quad1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, Z4], [0.08, P4({ body: [0.1, 0, 0], neck: [-0.2, 0, 0], head: [-0.45, 0, 0], legBL: [0.3, 0, 0], legBR: [0.3, 0, 0], 'body.t': [0, 0, 0.06] }), 'out'], [0.4, Z4, 'io']]) });
define('block_hit', { rig: 'quad1', dur: 0.3, meta: { cls: 'other' }, keys: seq([[0, Z4], [0.06, P4({ body: [-0.06, 0, 0], neck: [-0.2, 0, 0] }), 'out'], [0.3, Z4, 'io']]) });
define('stagger', {
  rig: 'quad1', dur: 0.8, meta: { cls: 'down' },
  keys: seq([
    [0.0, Z4],
    [0.14, P4({ body: [-0.28, 0, 0.06], 'body.t': [0, 0.05, -0.12], neck: [-0.4, 0.2, 0], head: [-0.4, 0, 0], legFL: [-1.0, 0, 0.1], legFR: [-0.8, 0, -0.1], legBL: [0.2, 0, 0], legBR: [0.3, 0, 0], 'legFL.t': [0, 0.12, 0], 'legFR.t': [0, 0.1, 0] }), 'out'],
    [0.36, P4({ body: [0.12, 0, -0.08], 'body.t': [0, -0.06, -0.2], neck: [0.3, -0.2, 0], head: [0.2, 0, 0], legFL: [0.3, 0, 0.1], legFR: [-0.3, 0, -0.1], legBL: [-0.5, 0, 0.1], legBR: [0.4, 0, -0.1], 'legBL.t': [0, 0.1, 0] }), 'io'],
    [0.6, P4({ body: [-0.08, 0, 0.05], 'body.t': [0, -0.02, -0.1], neck: [-0.15, 0.1, 0], head: [-0.1, 0, 0], legFL: [-0.5, 0, 0], legFR: [0.2, 0, 0], legBL: [0.2, 0, 0], legBR: [-0.4, 0, 0], 'legBR.t': [0, 0.08, 0] }), 'io'],
    [0.8, Z4, 'io'],
  ]),
});
define('stun', { rig: 'quad1', dur: 1.2, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), s2 = wave(u, 2, 0.25), k = waveC(u, 1);
  c.rot('body', -0.12 + k * 0.05, 0, s2 * 0.12).pos('body', 0, -0.05, 0).rot('neck', -0.35 + s * 0.2, s * 0.3, 0).rot('head', -0.3 + s2 * 0.15, -s * 0.4, s * 0.25).rot('tail', 0.6, 0, s * 0.5);
  c.rot('legFL', -0.3 + s * 0.15, 0, 0.1).rot('legFR', -0.2 - s * 0.15, 0, -0.1).rot('legBL', 0.15, 0, 0.1).rot('legBR', 0.1, 0, -0.1);
} });
define('dizzy', { rig: 'quad1', dur: 1.2, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), co = waveC(u, 1), s2 = wave(u, 2);
  c.pos('body', 0, -0.02 + s2 * 0.01, 0).rot('body', 0.04, s * 0.08, co * 0.14).rot('neck', 0.15 + co * 0.1, s * 0.35, 0).rot('head', 0.25 + s * 0.15, co * 0.5, -s * 0.3).rot('tail', 0.2, 0, s * 0.5);
  for (let i = 0; i < 4; i++) { const p = wave(u, 2, i * 0.25); c.rot(LEGS[i], p * 0.18, 0, 0).pos(LEGS[i], 0, Math.max(0, p) * 0.03, 0); }
} });
define('cower', { rig: 'quad1', dur: 1.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) {
  const tr = wave(u, 7), L = 1.2, a = 0.8, drop = -L * (1 - Math.cos(a));
  c.pos('body', 0, drop - 0.02, 0).rot('body', 0.1, 0, 0).rot('neck', 0.75, 0, 0).rot('head', 0.35 + tr * 0.03, 0, tr * 0.05).rot('tail', -0.5, 0, 0);
  c.rot('legFL', -a, 0, 0.05).rot('legFR', -a, 0, -0.05).rot('legBL', a, 0, 0.05).rot('legBR', a, 0, -0.05);
  for (const l of LEGS) c.pos(l, tr * 0.004, -drop - L * (1 - Math.cos(a)), 0);
} });
define('sleep', { rig: 'quad1', dur: 3.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) {
  const br = wave(u, 1);
  c.pos('body', 0, -0.88 + br * 0.006, 0).rot('body', 0, 0, 0).scl('body', 1, 1 + br * 0.015, 1).rot('neck', 0.9, 0.3, 0.2).rot('head', 0.6, 0.3, 0.2).rot('tail', 0.2, 0, 0.3);
  c.rot('legFL', -1.45, 0, 0.35).rot('legFR', -1.45, 0, -0.35).rot('legBL', 1.45, 0, 0.35).rot('legBR', 1.45, 0, -0.35);
  for (const l of LEGS) c.pos(l, 0, 0.35, 0);
} });

// ---- deaths ------------------------------------------------------------------------------------------------------------------------------------------
const SIDE = (sp) => ({ y: sp.hw - sp.bodyY, roll: 1.5 });
const LIEBACK = (sp) => P4({ body: [0, 0.1, 0], neck: [0.35, 0.3, 0.1], head: [0.4, 0.2, 0], tail: [0.2, 0, 0.3], legFL: [-0.35, 0, 0.4], legFR: [-0.1, 0, -0.25], legBL: [0.45, 0, 0.3], legBR: [0.2, 0, -0.35], root: SIDE(sp) });
for (const sp of [QUAD_SPECIES.horse, QUAD_SPECIES.camel, QUAD_SPECIES.hound, QUAD_SPECIES.goat]) {
  const pre = sp.id === 'horse' ? '' : sp.id + '_';
  const S = SIDE(sp);
  define(pre + 'death_back', {
    rig: 'quad1', dur: 1.1, meta: { cls: 'down', enter: 'neutral', exit: 'lying', species: sp.id },
    keys: seq([
      [0.0, Z4],
      // hit: the front end rears from the impact, legs stiffen
      [0.08, P4({ body: [-0.25, 0, 0], 'body.t': [0, 0.03, -0.06], neck: [-0.4, 0, 0], head: [-0.5, 0, 0], legFL: [-0.9, 0, 0.2], legFR: [-0.8, 0, -0.2], legBL: [0.1, 0, 0], legBR: [0.1, 0, 0], tail: [0.8, 0, 0] }), 'out'],
      // collapse: the legs buckle and the whole animal topples onto its side
      [0.5, P4({ body: [0.1, 0.1, 0], 'body.t': [0, -0.1, 0], neck: [0.5, 0.3, 0], head: [0.4, 0.2, 0], legFL: [-0.7, 0, 0.5], legFR: [-0.2, 0, -0.4], legBL: [0.3, 0, 0.3], legBR: [0.5, 0, -0.3], tail: [0.4, 0, 0.3], root: { y: S.y - 0.05, roll: 1.45 } }), 'in2'],
      [0.58, P4({ body: [0.05, 0.1, 0], neck: [0.4, 0.3, 0.1], head: [0.45, 0.2, 0], legFL: [-0.55, 0, 0.45], legFR: [-0.15, 0, -0.3], legBL: [0.4, 0, 0.3], legBR: [0.3, 0, -0.35], root: { y: S.y + 0.05, roll: 1.42 } }), 'out'],
      [0.72, P4({ body: [0, 0.1, 0], neck: [0.35, 0.3, 0.1], head: [0.4, 0.2, 0], legFL: [-0.4, 0, 0.4], legFR: [-0.1, 0, -0.25], legBL: [0.45, 0, 0.3], legBR: [0.2, 0, -0.35], root: S }), 'in2'],
      [1.1, LIEBACK(sp), 'out'],
    ]),
  });
  define(pre + 'death_front', {
    rig: 'quad1', dur: 1.1, meta: { cls: 'down', enter: 'neutral', exit: 'lying', species: sp.id },
    keys: seq([
      [0.0, Z4],
      [0.08, P4({ body: [0.12, 0, 0], neck: [0.4, 0, 0], head: [0.3, 0, 0], legFL: [-0.5, 0, 0], legFR: [-0.5, 0, 0], legBL: [-0.3, 0, 0], legBR: [-0.3, 0, 0], tail: [0.7, 0, 0] }), 'out'],
      // knees give: forelegs fold forward, nose plants, rump up, then it rolls over onto its side
      [0.45, P4({ body: [0.55, 0, 0], 'body.t': [0, -0.35, 0.2], neck: [0.7, 0, 0], head: [0.5, 0, 0], legFL: [-1.5, 0, 0.1], legFR: [-1.4, 0, -0.1], legBL: [-0.2, 0, 0], legBR: [-0.3, 0, 0], 'legFL.t': [0, 0.3, 0], 'legFR.t': [0, 0.3, 0], tail: [0.5, 0, 0] }), 'in2'],
      [0.75, P4({ body: [0.25, 0.1, 0], neck: [0.5, 0.3, 0], head: [0.4, 0.2, 0], legFL: [-0.8, 0, 0.4], legFR: [-0.5, 0, -0.3], legBL: [0.1, 0, 0.3], legBR: [0.2, 0, -0.3], root: { y: S.y, roll: 1.2 } }), 'io'],
      [1.1, LIEBACK(sp), 'out'],
    ]),
  });
  define(pre + 'death_spin', {
    rig: 'quad1', dur: 1.4, meta: { cls: 'down', enter: 'neutral', exit: 'lying', species: sp.id },
    keys: mergeKeys(seq([
      [0.0, Z4],
      [0.1, P4({ body: [-0.3, 0, 0], neck: [-0.4, 0, 0], head: [-0.4, 0, 0], legFL: [-1.0, 0, 0.3], legFR: [-0.9, 0, -0.3], legBL: [0.6, 0, 0.3], legBR: [0.5, 0, -0.3], tail: [0.8, 0, 0], root: { pitch: -0.25 } }), 'out'],
      [0.6, P4({ body: [0.1, 0, 0], neck: [0.3, 0.4, 0], head: [0.2, 0, 0], legFL: [-1.2, 0, 0.6], legFR: [-0.4, 0, -0.5], legBL: [0.7, 0, 0.5], legBR: [1.0, 0, -0.4], root: { pitch: -0.6, roll: 0.8, y: 0.2 } }), 'io'],
      [0.9, P4({ body: [0, 0.1, 0], neck: [0.4, 0.3, 0], head: [0.4, 0.2, 0], legFL: [-0.5, 0, 0.5], legFR: [-0.2, 0, -0.3], legBL: [0.5, 0, 0.3], legBR: [0.3, 0, -0.3], root: { y: S.y + 0.1, roll: 1.42, pitch: -0.1 } }), 'in'],
      [1.05, P4({ body: [0, 0.1, 0], neck: [0.35, 0.3, 0.1], head: [0.4, 0.2, 0], legFL: [-0.4, 0, 0.4], legFR: [-0.1, 0, -0.25], legBL: [0.45, 0, 0.3], legBR: [0.2, 0, -0.35], root: { y: S.y, roll: 1.5, pitch: 0 } }), 'in2'],
      [1.4, LIEBACK(sp), 'out'],
    ]), { 'root.yaw': [[0, 0], [0.8, -4.7, 'out2'], [1.4, -5.2, 'out']] }),
  });
}
define('getup', { rig: 'quad1', dur: 0.9, meta: { cls: 'down', enter: 'lying', exit: 'neutral' }, keys: seq([
  [0.0, LIEBACK(QUAD_SPECIES.horse)],
  [0.3, P4({ body: [0, 0, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], legFL: [-1.2, 0, 0.3], legFR: [-0.9, 0, -0.3], legBL: [0.6, 0, 0.3], legBR: [0.7, 0, -0.3], root: { y: -0.3, roll: 0.7 } }), 'io'],
  [0.6, P4({ body: [-0.15, 0, 0], neck: [-0.3, 0, 0], head: [-0.2, 0, 0], legFL: [-0.6, 0, 0], legFR: [-0.5, 0, 0], legBL: [0.3, 0, 0], legBR: [0.3, 0, 0], root: { y: -0.1, roll: 0.15 } }), 'io'],
  [0.9, Z4, 'out'],
]) });
