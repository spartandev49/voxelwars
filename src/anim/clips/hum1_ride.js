// Rider + crew clips. The rider's seated leg pose is baked into the model as static rest rotations (beasts/mounted.js SEAT_REST), so these
// clips only add DELTAS on the legs and drive the torso, arms and head. The locomotion loops (ride_walk / ride_trot / ride_gallop) are
// sampled at the SAME normalised phase as the mount's gait (the animator shares the phase), so the rider absorbs every stride.
import { define, seq, mergeKeys, wave, waveC, bump } from '../dsl.js';
import { merge } from './poses.js';

const PI = Math.PI;
const REINS = { armUL: [-0.85, -0.1, 0.12], armLL: [-1.15, 0, 0], armUR: [-0.55, 0.2, -0.3], armLR: [-1.1, 0, 0] };

define('ride_idle', {
  rig: 'hum1', dur: 2.0, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const br = wave(u, 1), sw = wave(u, 1, 0.3);
    c.rot('body', 0.04 + br * 0.012, sw * 0.05, sw * 0.02).rot('head', -0.04, wave(u, 1, 0.1) * 0.3, 0);
    c.rot('armUL', REINS.armUL[0] + br * 0.02, REINS.armUL[1], REINS.armUL[2]).rot('armLL', REINS.armLL[0], 0, 0).rot('armUR', REINS.armUR[0] - br * 0.02, REINS.armUR[1], REINS.armUR[2]).rot('armLR', REINS.armLR[0], 0, 0);
    c.rootSet('y', br * 0.004);
  },
});
function rideGait(name, o) {
  define(name, {
    rig: 'hum1', dur: o.D, loop: true, meta: { cls: 'move' },
    build(c, t, u) {
      const b2 = wave(u, o.beats, o.ph), b1 = wave(u, 1, o.ph + 0.15), co = waveC(u, o.beats, o.ph);
      c.rot('body', o.lean + b2 * o.bounce, wave(u, 1) * 0.04, b1 * 0.03).rot('head', -o.lean * 0.7 - b2 * o.bounce * 0.8, 0, 0);
      c.rot('armUL', REINS.armUL[0] - o.lean * 0.5 + b2 * 0.05, REINS.armUL[1], REINS.armUL[2]).rot('armLL', REINS.armLL[0] - o.lean * 0.3, 0, 0);
      c.rot('armUR', REINS.armUR[0] - o.lean * 0.3 - b2 * 0.06, REINS.armUR[1], REINS.armUR[2]).rot('armLR', REINS.armLR[0], 0, 0);
      // legs: heels absorb, knees grip
      c.rot('legUL', co * o.legSwing, 0, 0).rot('legLL', o.heels + b2 * o.legSwing * 0.8, 0, 0).rot('legUR', co * o.legSwing, 0, 0).rot('legLR', o.heels + b2 * o.legSwing * 0.8, 0, 0);
      c.rootSet('y', co * o.post);
    },
  });
}
rideGait('ride_walk', { D: 1.15, beats: 2, ph: 0.2, lean: 0.03, bounce: 0.03, legSwing: 0.02, heels: 0.05, post: 0.004 });
rideGait('ride_trot', { D: 0.72, beats: 2, ph: 0.35, lean: 0.08, bounce: 0.07, legSwing: 0.05, heels: 0.1, post: 0.025 });
rideGait('ride_gallop', { D: 0.52, beats: 1, ph: 0.4, lean: 0.38, bounce: 0.1, legSwing: 0.08, heels: 0.35, post: 0.03 });

// ride_strike: couched lance / spear thrust from the saddle (hit 0.28)
define('ride_strike', {
  rig: 'hum1', dur: 0.72, hit: 0.28, recover: 0.48, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, merge({ body: [0.04, 0.0, 0], head: [-0.04, 0, 0] }, REINS)],
    [0.13, { body: [-0.05, -0.65, 0.05], head: [-0.05, 0.5, 0], armUR: [0.2, 0.5, -0.5], armLR: [-1.7, 0, 0], armUL: [-0.9, -0.2, 0.2], armLL: [-1.1, 0, 0] }, 'out'],
    [0.28, { body: [0.25, 0.5, 0], head: [-0.15, -0.45, 0], armUR: [-1.5, 0.05, -0.1], armLR: [-0.06, 0, 0], armUL: [-1.0, -0.4, 0.3], armLL: [-0.9, 0, 0] }, 'in'],
    [0.36, { body: [0.3, 0.56, 0], head: [-0.18, -0.5, 0], armUR: [-1.56, 0.06, -0.1], armLR: [-0.04, 0, 0], armUL: [-1.0, -0.4, 0.3], armLL: [-0.9, 0, 0] }, 'out'],
    [0.72, merge({ body: [0.04, 0.0, 0], head: [-0.04, 0, 0] }, REINS), 'io'],
  ]), { aim: [[0, 1.2, 0, 1], [0.13, 0.9, 0.35, 1, 'out'], [0.28, 0.0, 0.0, 1, 'in'], [0.36, -0.05, 0.0, 1, 'out'], [0.72, 1.2, 0, 1, 'io']] }),
});
// ride_shoot: torso turned side-on, bow drawn from the saddle (release 0.60)
define('ride_shoot', {
  rig: 'hum1', dur: 0.95, hit: 0.60, recover: 0.78, meta: { cls: 'shoot', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, merge({ body: [0.04, 0.0, 0], head: [-0.04, 0, 0] }, REINS)],
    [0.2, { body: [0.0, 1.15, 0], head: [-0.05, -1.1, 0], armUR: [0.0, 0.0, -1.45], armLR: [0, 0, 0], armUL: [-1.1, -0.9, 0.55], armLL: [-0.8, 0, 0] }, 'out'],
    [0.5, { body: [0.0, 1.2, 0], head: [-0.05, -1.15, 0.12], armUR: [0.0, 0.0, -1.5], armLR: [0, 0, 0], armUL: [-0.35, 0.55, 1.15], armLL: [-2.5, 0, 0] }, 'io'],
    [0.567, { body: [0.0, 1.22, 0], head: [-0.05, -1.16, 0.12], armUR: [0.0, 0.0, -1.5], armLR: [0, 0, 0], armUL: [-0.33, 0.58, 1.16], armLL: [-2.55, 0, 0] }, 'lin'],
    [0.6, { body: [0.0, 1.15, 0], head: [-0.05, -1.12, 0.05], armUR: [-0.07, 0.0, -1.57], armLR: [0, 0, 0], armUL: [0.6, 0.35, 1.65], armLL: [-0.45, 0, 0] }, 'in'],
    [0.7, { body: [0.0, 1.15, 0], head: [-0.05, -1.05, 0], armUR: [-0.05, 0.0, -1.5], armLR: [0, 0, 0], armUL: [0.5, 0.3, 1.45], armLL: [-0.5, 0, 0] }, 'out'],
    [0.95, merge({ body: [0.04, 0.0, 0], head: [-0.04, 0, 0] }, REINS), 'io'],
  ]), { aim: [[0, 1.2, 0.0, 1, 0], [0.2, 1.5, 0.0, 1, -1.1, 'out'], [0.6, 1.5, 0.0, 1, -1.1], [0.74, 1.5, 0, 1, -1.0], [0.95, 1.2, 0, 1, 0, 'io']] }),
});
// ride_death: the rider slumps over, arms limp, head lolling (the mount carries him down)
define('ride_death', {
  rig: 'hum1', dur: 1.1, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0.0, merge({ body: [0.04, 0, 0], head: [-0.04, 0, 0] }, REINS)],
    [0.1, { body: [-0.4, 0.1, 0], head: [0.5, 0, 0], armUR: [-1.3, 0, -0.8], armLR: [-0.3, 0, 0], armUL: [-1.3, 0, 0.8], armLL: [-0.3, 0, 0] }, 'out'],
    [0.5, { body: [0.9, 0.2, 0.5], head: [0.3, 0.3, 0.3], armUR: [0.5, 0, -0.3], armLR: [-0.2, 0, 0], armUL: [0.3, 0, 0.4], armLL: [-0.2, 0, 0] }, 'in2'],
    [1.1, { body: [1.0, 0.25, 0.7], head: [0.5, 0.4, 0.4], armUR: [0.3, 0, -0.5], armLR: [-0.1, 0, 0], armUL: [0.2, 0, 0.6], armLL: [-0.1, 0, 0] }, 'out'],
  ]),
});
// ---- crew (hum1 / hum_lite): standing on a siege machine, in a howdah or chariot -------------------------------------------------------------------
define('crew_idle', {
  rig: 'hum1', dur: 2.2, loop: true, meta: { cls: 'ready' },
  build(c, t, u) {
    const br = wave(u, 1), sw = wave(u, 1, 0.3);
    c.rot('body', 0.05 + br * 0.01, sw * 0.08, sw * 0.02).rot('head', -0.03, wave(u, 1, 0.1) * 0.35, 0);
    c.rot('armUL', -0.3, 0, 0.18 + br * 0.01).rot('armLL', -0.5, 0, 0).rot('armUR', -0.3, 0, -0.18).rot('armLR', -0.5, 0, 0);
    c.rot('legUL', -0.06, 0, 0.08).rot('legLL', 0.1, 0, 0).rot('legUR', -0.04, 0, -0.08).rot('legLR', 0.08, 0, 0);
    c.rootSet('y', br * 0.003 - 0.005);
  },
});
define('crew_crank', {
  rig: 'hum1', dur: 1.0, loop: true, meta: { cls: 'other' },
  build(c, t, u) {
    const a = u * PI * 2, s = Math.sin(a), co = Math.cos(a);
    c.rot('body', 0.3 + co * 0.08, 0, 0).rot('head', 0.05, 0, 0);
    c.rot('armUL', -1.1 + s * 0.55, 0, 0.1).rot('armLL', -0.7 - co * 0.5, 0, 0).rot('armUR', -1.1 - s * 0.55, 0, -0.1).rot('armLR', -0.7 + co * 0.5, 0, 0);
    c.rot('legUL', -0.25, 0, 0.1).rot('legLL', 0.45, 0, 0).rot('legUR', 0.15, 0, -0.1).rot('legLR', 0.3, 0, 0);
    c.rootSet('y', -0.04 + Math.abs(co) * 0.01);
  },
});
define('crew_push', {
  rig: 'hum1', dur: 1.4, loop: true, meta: { cls: 'move' },
  build(c, t, u) {
    const s = wave(u, 1), s2 = wave(u, 2);
    c.rot('body', 0.5, s * 0.06, 0).rot('head', -0.35, 0, 0);
    c.rot('armUL', -1.35, 0, 0.12).rot('armLL', -0.15, 0, 0).rot('armUR', -1.35, 0, -0.12).rot('armLR', -0.15, 0, 0);
    c.rot('legUL', -0.45 * s - 0.1, 0, 0.06).rot('legLL', 0.35 + Math.max(0, -s) * 0.7, 0, 0).rot('legUR', 0.45 * s - 0.1, 0, -0.06).rot('legLR', 0.35 + Math.max(0, s) * 0.7, 0, 0);
    c.rootSet('y', -0.05 + Math.abs(s2) * 0.012);
  },
});
define('crew_shoot', {
  rig: 'hum1', dur: 0.95, hit: 0.60, recover: 0.78, meta: { cls: 'shoot' },
  keys: seq([
    [0.0, { body: [0.05, 0, 0], head: [-0.03, 0, 0], armUR: [-0.3, 0, -0.18], armLR: [-0.5, 0, 0], armUL: [-0.3, 0, 0.18], armLL: [-0.5, 0, 0] }],
    [0.25, { body: [0.0, 0.9, 0], head: [-0.05, -0.85, 0], armUR: [0.0, 0.0, -1.45], armLR: [0, 0, 0], armUL: [-1.1, -0.7, 0.55], armLL: [-0.8, 0, 0] }, 'out'],
    [0.52, { body: [0.0, 0.95, 0], head: [-0.05, -0.9, 0.1], armUR: [0.0, 0.0, -1.5], armLR: [0, 0, 0], armUL: [-0.35, 0.5, 1.1], armLL: [-2.4, 0, 0] }, 'io'],
    [0.6, { body: [0.0, 0.9, 0], head: [-0.05, -0.85, 0.05], armUR: [-0.07, 0.0, -1.55], armLR: [0, 0, 0], armUL: [0.6, 0.35, 1.6], armLL: [-0.4, 0, 0] }, 'in'],
    [0.95, { body: [0.05, 0, 0], head: [-0.03, 0, 0], armUR: [-0.3, 0, -0.18], armLR: [-0.5, 0, 0], armUL: [-0.3, 0, 0.18], armLL: [-0.5, 0, 0] }, 'io'],
  ]),
});
define('crew_react', {
  rig: 'hum1', dur: 0.9, meta: { cls: 'other' },
  keys: seq([
    [0.0, { body: [0.05, 0, 0], head: [-0.03, 0, 0], armUR: [-0.3, 0, -0.18], armLR: [-0.5, 0, 0], armUL: [-0.3, 0, 0.18], armLL: [-0.5, 0, 0] }],
    [0.12, { body: [-0.3, 0, 0.08], head: [0.3, 0.2, 0], armUR: [-1.0, 0.2, -0.9], armLR: [-0.4, 0, 0], armUL: [-1.0, -0.2, 0.9], armLL: [-0.4, 0, 0], legUL: [0.15, 0, 0.1], legUR: [-0.1, 0, -0.1], root: { y: 0.0, pitch: -0.1 } }, 'out'],
    [0.9, { body: [0.05, 0, 0], head: [-0.03, 0, 0], armUR: [-0.3, 0, -0.18], armLR: [-0.5, 0, 0], armUL: [-0.3, 0, 0.18], armLL: [-0.5, 0, 0], legUL: [-0.06, 0, 0.08], legUR: [-0.04, 0, -0.08], root: { y: 0, pitch: 0 } }, 'io'],
  ]),
});

// crew_launch: crank the winch until the release (0.50), then jump back from the kick and reset
define('crew_launch', {
  rig: 'hum1', dur: 1.2, hit: 0.5, recover: 0.9, meta: { cls: 'other' },
  build(c, t, u) {
    const k = Math.min(1, t / 0.47), a = t * 2 * PI * 3.2, s = Math.sin(a), co = Math.cos(a);
    const crank = t < 0.5 ? 1 : 0;
    const rel = Math.exp(-Math.max(0, t - 0.5) * 5) * (t >= 0.5 ? 1 : 0), settle = t >= 0.5 ? Math.min(1, (t - 0.5) / 0.4) : 0;
    c.rot('body', (0.3 + co * 0.08) * crank * (1 - 0.0) + (-0.25 * rel) + 0.05 * (1 - crank) * settle, 0, 0).rot('head', 0.05 - 0.3 * rel, 0, 0);
    c.rot('armUL', (-1.1 + s * 0.55) * crank + (-1.6 * rel) + (-0.3) * (1 - crank) * settle, 0, 0.1 + 0.6 * rel).rot('armLL', (-0.7 - co * 0.5) * crank + (-0.4) * (1 - crank), 0, 0);
    c.rot('armUR', (-1.1 - s * 0.55) * crank + (-1.6 * rel) + (-0.3) * (1 - crank) * settle, 0, -0.1 - 0.6 * rel).rot('armLR', (-0.7 + co * 0.5) * crank + (-0.4) * (1 - crank), 0, 0);
    c.rot('legUL', -0.25 * crank + 0.25 * rel, 0, 0.1).rot('legLL', 0.45 * crank, 0, 0).rot('legUR', 0.15 * crank - 0.2 * rel, 0, -0.1).rot('legLR', 0.3 * crank, 0, 0);
    c.rootSet('y', -0.04 * crank + 0.06 * rel).rootSet('z', -0.12 * rel);
  },
});
