// hum1 deaths + get-up. All fall about the hip pivot through root.pitch/yaw; `floor` keeps every part above the ground and rests the
// body exactly on it in the snap windows. The final lying poses are shared so getup can start exactly where a death ended.
import { define, seq, mergeKeys, wave, waveC, bump } from '../dsl.js';
import { feet, READY, readyAt, merge } from './poses.js';

const PI = Math.PI;
export const LIE_BACK = { body: [-0.04, 0.08, 0.05], head: [0.22, 0.3, 0.04], armUL: [-0.35, 0.25, 1.15], armLL: [-0.3, 0, 0], armUR: [-1.0, -0.2, -1.3], armLR: [-0.35, 0, 0],
  legUL: [-0.08, 0.12, 0.38], legLL: [0.18, 0, 0], legUR: [0.05, -0.1, -0.42], legLR: [0.45, 0, 0], root: { pitch: -1.54, roll: 0.05, y: 0 } };
export const LIE_FRONT = { body: [0.04, -0.1, 0.0], head: [-0.3, 0.55, 0.05], armUL: [-2.7, 0.2, 0.55], armLL: [-0.2, 0, 0], armUR: [-2.3, -0.1, -0.9], armLR: [-0.8, 0, 0],
  legUL: [0.12, 0.1, 0.3], legLL: [0.25, 0, 0], legUR: [-0.15, -0.1, -0.35], legLR: [0.7, 0, 0], root: { pitch: 1.54, roll: -0.04, y: 0 } };

// death_back: knocked off the feet by a frontal hit, lands on the back, limbs flop out
define('death_back', {
  rig: 'hum1', dur: 1.1, floor: { snap: [[0.5, 0.52], [0.72, 1.1]] }, meta: { cls: 'down', fall: Math.PI, fallBlend: 0.3, enter: 'neutral', exit: 'lying' },
  keys: seq([
    [0.0, READY],
    [0.07, merge(readyAt(-1.2), { body: [-0.5, 0.1, 0.05], head: [0.5, 0.1, 0], armUR: [-1.4, 0.2, -0.9], armLR: [-0.4, 0, 0], armUL: [-1.3, -0.2, 1.0], armLL: [-0.4, 0, 0], root: { pitch: -0.15 } }), 'out'],
    // the fall: gravity ease, arms fly up, knees give way, head snaps back
    [0.46, merge({ body: [-0.15, 0.1, 0.05], head: [0.35, 0.2, 0], armUR: [-2.6, 0.1, -0.5], armLR: [-0.4, 0, 0], armUL: [-2.5, -0.1, 0.5], armLL: [-0.4, 0, 0],
      legUL: [-0.5, 0.1, 0.2], legLL: [0.9, 0, 0], legUR: [-0.3, -0.1, -0.2], legLR: [1.0, 0, 0], root: { pitch: -1.46, y: -0.25 } }), 'in2'],
    // thump: slight rebound
    [0.56, merge(LIE_BACK, { armUL: [-1.2, 0.2, 0.9], armUR: [-1.4, -0.2, -1.0], legUL: [-0.25, 0.1, 0.3], legUR: [-0.2, -0.1, -0.3], root: { pitch: -1.5, y: 0.07 } }), 'out'],
    [0.7, merge(LIE_BACK, { root: { pitch: -1.54, y: 0.0 } }), 'in2'],
    [1.1, LIE_BACK, 'out'],
  ]),
});

// death_front: hit from behind, pitches onto the face with the arms stretched ahead
define('death_front', {
  rig: 'hum1', dur: 1.1, floor: { snap: [[0.5, 0.52], [0.72, 1.1]] }, meta: { cls: 'down', fall: 0, fallBlend: 0.3, enter: 'neutral', exit: 'lying' },
  keys: seq([
    [0.0, READY],
    [0.07, merge(readyAt(1.5), { body: [0.45, -0.1, 0.0], head: [-0.6, 0.0, 0], armUR: [0.7, 0.1, -0.7], armLR: [-0.2, 0, 0], armUL: [0.7, -0.1, 0.7], armLL: [-0.2, 0, 0], root: { pitch: 0.15 } }), 'out'],
    [0.46, merge({ body: [0.2, -0.1, 0], head: [-0.4, 0.2, 0], armUR: [-1.8, 0.1, -0.5], armLR: [-0.6, 0, 0], armUL: [-1.8, -0.1, 0.5], armLL: [-0.6, 0, 0],
      legUL: [0.3, 0.1, 0.2], legLL: [0.8, 0, 0], legUR: [0.5, -0.1, -0.2], legLR: [1.2, 0, 0], root: { pitch: 1.45, y: -0.25 } }), 'in2'],
    [0.56, merge(LIE_FRONT, { armUL: [-2.2, 0.2, 0.7], armUR: [-1.9, -0.1, -1.0], root: { pitch: 1.5, y: 0.06 } }), 'out'],
    [0.7, merge(LIE_FRONT, { root: { pitch: 1.54, y: 0.0 } }), 'in2'],
    [1.1, LIE_FRONT, 'out'],
  ]),
});

// death_spin: launched: spinning out through the air and crashing down on the back (the sim supplies the flight arc; we spin and tumble)
define('death_spin', {
  rig: 'hum1', dur: 1.4, floor: { snap: [[0.86, 0.9], [1.1, 1.4]] }, meta: { cls: 'down', fall: Math.PI, fallBlend: 0.15, enter: 'neutral', exit: 'lying' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.08, merge(readyAt(-1.0), { body: [-0.5, 0.2, 0.1], head: [0.5, 0, 0], armUR: [-1.5, 0.2, -1.0], armLR: [-0.5, 0, 0], armUL: [-1.5, -0.2, 1.0], armLL: [-0.5, 0, 0], root: { pitch: -0.3 } }), 'out'],
    [0.4, { body: [-0.3, 0.4, 0], head: [0.3, 0.5, 0], armUR: [-2.4, 0.4, -0.8], armLR: [-0.5, 0, 0], armUL: [-2.0, -0.4, 1.0], armLL: [-0.6, 0, 0], legUL: [-0.9, 0.1, 0.4], legLL: [1.0, 0, 0], legUR: [-0.4, -0.1, -0.4], legLR: [1.4, 0, 0], root: { pitch: -1.0, roll: 0.2 } }, 'io'],
    [0.8, { body: [-0.2, -0.3, 0], head: [0.2, -0.4, 0], armUR: [-1.8, -0.4, -1.2], armLR: [-0.4, 0, 0], armUL: [-2.4, 0.4, 0.8], armLL: [-0.5, 0, 0], legUL: [-0.5, 0.1, 0.5], legLL: [0.7, 0, 0], legUR: [-0.9, -0.1, -0.3], legLR: [1.1, 0, 0], root: { pitch: -1.3, roll: -0.15 } }, 'io'],
    [0.9, merge(LIE_BACK, { armUL: [-1.1, 0.2, 1.0], armUR: [-1.5, -0.2, -1.1], root: { pitch: -1.5, roll: 0.0, y: 0.1 } }), 'in'],
    [1.05, merge(LIE_BACK, { root: { pitch: -1.54, y: 0.0 } }), 'in2'],
    [1.4, LIE_BACK, 'out'],
  ]), { 'root.yaw': [[0, 0], [0.8, -5.6, 'out2'], [0.9, -5.8, 'out'], [1.4, -6.0, 'out']] }),
});

// getup: lying on the back -> sit up -> crouch -> ready (starts exactly at the death_back resting pose)
define('getup', {
  rig: 'hum1', dur: 0.9, floor: { snap: [[0, 0.04]] }, meta: { cls: 'down', enter: 'lying', exit: 'neutral' },
  keys: seq([
    [0.0, LIE_BACK],
    [0.26, merge({ body: [0.75, 0.0, 0], head: [-0.4, 0.0, 0], armUL: [-1.3, 0.0, 0.4], armLL: [-0.5, 0, 0], armUR: [-1.3, 0.0, -0.4], armLR: [-0.5, 0, 0],
      legUL: [-1.3, 0.0, 0.25], legLL: [1.9, 0, 0], legUR: [-1.3, 0.0, -0.25], legLR: [1.9, 0, 0], root: { pitch: -0.55, y: -0.1 } }), 'io'],
    [0.55, merge(feet(2.0, -2.0, { h: 6.4, spread: 0.2 }), { body: [0.75, 0.0, 0], head: [-0.5, 0.0, 0], armUL: [-0.9, 0.0, 0.5], armLL: [-0.7, 0, 0], armUR: [-0.9, 0.0, -0.5], armLR: [-0.7, 0, 0], root: { pitch: 0.0 } }), 'io'],
    [0.9, READY, 'out'],
  ]),
});
