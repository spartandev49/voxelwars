// hum1 ranged / casting clips: shoot_bow (bow in the RIGHT hand, string hand = left), throw, cast, launch (giants).
// aim tracks: [time, elevation, azimuth, weight, twist-about-the-weapon-axis] in the unit frame (see animator.js).
import { define, seq, mergeKeys, wave, bump } from '../dsl.js';
import { feet, READY, readyAt, merge } from './poses.js';

const YAW = 1.15;
const STANCE_AR = (o = {}) => ({ legUL: [-0.04, 0.0, 0.3], legLL: [0.1, 0, 0], legUR: [-0.04, 0.0, -0.3], legLR: [0.1, 0, 0], root: Object.assign({ y: -0.05 }, o) });

// ---- shoot_bow: turn side-on, raise the bow arm, draw, hold, release (hit 0.60), follow through ------------------------------------
define('shoot_bow', {
  rig: 'hum1', dur: 0.95, hit: 0.60, recover: 0.78, meta: { cls: 'shoot', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.2, merge(STANCE_AR({ yaw: YAW }), { body: [0.0, 0.0, 0.0], head: [-0.05, -1.05, 0.0], armUR: [0.0, 0.0, -1.45], armLR: [0.0, 0, 0], armUL: [-1.1, -0.9, 0.55], armLL: [-0.8, 0, 0] }), 'out'],
    [0.5, merge(STANCE_AR({ yaw: YAW }), { body: [0.0, 0.05, 0.0], head: [-0.05, -1.1, 0.12], armUR: [0.0, 0.0, -1.5], armLR: [0.0, 0, 0], armUL: [-0.35, 0.55, 1.15], armLL: [-2.5, 0, 0] }), 'io'],
    [0.567, merge(STANCE_AR({ yaw: YAW }), { body: [0.0, 0.07, 0.0], head: [-0.05, -1.12, 0.12], armUR: [0.0, 0.0, -1.5], armLR: [0.0, 0, 0], armUL: [-0.33, 0.58, 1.16], armLL: [-2.55, 0, 0] }), 'lin'],
    // release: the string hand snaps back, the bow arm kicks up a hair
    [0.6, merge(STANCE_AR({ yaw: YAW }), { body: [0.0, -0.05, 0.0], head: [-0.05, -1.1, 0.05], armUR: [-0.07, 0.0, -1.57], armLR: [0.0, 0, 0], armUL: [0.6, 0.35, 1.65], armLL: [-0.45, 0, 0] }), 'in'],
    [0.7, merge(STANCE_AR({ yaw: YAW }), { body: [0.0, -0.03, 0.0], head: [-0.05, -1.05, 0.0], armUR: [-0.05, 0.0, -1.5], armLR: [0.0, 0, 0], armUL: [0.5, 0.3, 1.45], armLL: [-0.5, 0, 0] }), 'out'],
    [0.95, READY, 'io'],
  ]), {
    aim: [[0, 1.4, 0.0, 1, 0], [0.2, 1.5, 0.0, 1, -1.1, 'out'], [0.6, 1.5, 0.0, 1, -1.1], [0.7, 1.5, 0.0, 1, -1.1], [0.95, 1.4, 0, 1, 0, 'io']],
  }),
});

// ---- throw: javelin / francisca / pilum. release at 0.40 -------------------------------------------------------------------------------
define('throw', {
  rig: 'hum1', dur: 0.8, hit: 0.40, recover: 0.55, meta: { cls: 'shoot', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.17, merge(feet(2.8, -2.8, { hipZ: -1.6, turnL: 0.1, turnR: -0.7, spread: 0.08 }), { body: [0.0, -0.95, 0.1], head: [-0.05, 0.7, 0], armUR: [0.85, 0.15, -0.55], armLR: [-0.25, 0, 0], armUL: [-1.45, 0.45, 0.2], armLL: [-0.15, 0, 0], root: { pitch: -0.05 } }), 'out'],
    [0.4, merge(feet(7.0, -3.0, { hipZ: 3.0, h: 7.9, turnL: 0.05, turnR: -0.6 }), { body: [0.38, 0.55, -0.05], head: [-0.2, -0.45, 0], armUR: [-2.65, 0.0, -0.12], armLR: [-0.15, 0, 0], armUL: [0.3, 0.2, 0.7], armLL: [-0.5, 0, 0], root: { pitch: 0.1 } }), 'in'],
    [0.5, merge(feet(7.0, -3.0, { hipZ: 3.4, h: 7.8, turnL: 0.05, turnR: -0.6 }), { body: [0.5, 0.62, -0.05], head: [-0.2, -0.5, 0], armUR: [-2.1, -0.2, -0.1], armLR: [-0.1, 0, 0], armUL: [0.4, 0.2, 0.75], armLL: [-0.5, 0, 0], root: { pitch: 0.14 } }), 'out'],
    [0.8, READY, 'io'],
  ]), { aim: [[0, 0.9, 0.05, 1], [0.17, 0.5, 0.05, 1, 'out'], [0.4, 0.42, 0.0, 1, 'in'], [0.5, -0.2, 0.0, 1, 'out'], [0.8, 0.9, 0.05, 1, 'io']] }),
});

// ---- cast: raise the staff, gather, release a forward blast at 0.50 -----------------------------------------------------------------------
define('cast', {
  rig: 'hum1', dur: 1.0, hit: 0.50, recover: 0.72, meta: { cls: 'shoot', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.28, merge(feet(2.2, -2.2, { spread: 0.1 }), { body: [-0.15, 0.0, 0], head: [-0.45, 0.0, 0], armUR: [-2.9, 0.2, -0.3], armLR: [-0.6, 0, 0], armUL: [-1.5, 0, 0.95], armLL: [-0.3, 0, 0], root: { y: -0.02 } }), 'out'],
    [0.42, merge(feet(2.2, -2.2, { spread: 0.1 }), { body: [-0.22, 0.0, 0], head: [-0.5, 0.0, 0], armUR: [-3.05, 0.2, -0.3], armLR: [-0.7, 0, 0], armUL: [-1.7, 0, 1.1], armLL: [-0.3, 0, 0], root: { y: 0.0 } }), 'io'],
    [0.5, merge(feet(5.0, -2.4, { hipZ: 1.5, h: 8.8, spread: 0.1 }), { body: [0.3, 0.0, 0], head: [-0.15, 0.0, 0], armUR: [-1.45, 0.0, -0.05], armLR: [-0.1, 0, 0], armUL: [-1.55, 0.0, 0.1], armLL: [-0.15, 0, 0], root: { pitch: 0.08 } }), 'in'],
    [0.6, merge(feet(5.0, -2.4, { hipZ: 1.8, h: 8.7, spread: 0.1 }), { body: [0.34, 0.0, 0], head: [-0.2, 0.0, 0], armUR: [-1.5, 0.0, -0.05], armLR: [-0.1, 0, 0], armUL: [-1.6, 0.0, 0.1], armLL: [-0.15, 0, 0], root: { pitch: 0.1 } }), 'out'],
    [0.75, merge(feet(5.0, -2.4, { hipZ: 1.8, h: 8.7, spread: 0.1 }), { body: [0.3, 0.0, 0], head: [-0.2, 0.0, 0], armUR: [-1.45, 0.0, -0.05], armLR: [-0.1, 0, 0], armUL: [-1.55, 0.0, 0.1], armLL: [-0.15, 0, 0], root: { pitch: 0.08 } }), 'io'],
    [1.0, READY, 'io'],
  ]), { aim: [[0, 1.4, 0, 1], [0.28, 1.4, 0, 1], [0.5, 1.2, 0, 1], [0.75, 1.2, 0, 1], [1.0, 1.4, 0, 1]] }),
});

// ---- launch: giants heaving a boulder (two-handed). release at 0.50 ----------------------------------------------------------------------
define('launch', {
  rig: 'hum1', dur: 1.2, hit: 0.50, recover: 0.8, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.3, merge(feet(1.5, -2.5, { spread: 0.18, h: 7.4 }), { body: [0.85, 0.0, 0], head: [-0.6, 0, 0], armUR: [-0.7, 0.1, -0.35], armLR: [-0.3, 0, 0], armUL: [-0.7, -0.1, 0.35], armLL: [-0.3, 0, 0], root: { pitch: 0.05 } }), 'io'],
    [0.46, merge(feet(1.5, -2.5, { spread: 0.14, h: 8.6 }), { body: [-0.35, 0.0, 0], head: [0.2, 0, 0], armUR: [-3.0, 0.0, -0.15], armLR: [-0.45, 0, 0], armUL: [-3.0, 0.0, 0.15], armLL: [-0.45, 0, 0], root: { pitch: -0.05 } }), 'in2'],
    [0.5, merge(feet(5.5, -3.0, { hipZ: 1.6, h: 8.2, spread: 0.1 }), { body: [0.5, 0.0, 0], head: [-0.2, 0, 0], armUR: [-2.2, 0.0, -0.1], armLR: [-0.1, 0, 0], armUL: [-2.2, 0.0, 0.1], armLL: [-0.1, 0, 0], root: { pitch: 0.12 } }), 'in'],
    [0.65, merge(feet(5.5, -3.0, { hipZ: 2.2, h: 8.0, spread: 0.1 }), { body: [0.7, 0.0, 0], head: [-0.1, 0, 0], armUR: [-1.2, 0.0, -0.2], armLR: [-0.3, 0, 0], armUL: [-1.2, 0.0, 0.2], armLL: [-0.3, 0, 0], root: { pitch: 0.2 } }), 'out'],
    [1.2, READY, 'io'],
  ]),
});
