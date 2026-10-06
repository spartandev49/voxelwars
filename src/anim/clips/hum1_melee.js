// hum1 melee strikes. Weapon is in the RIGHT hand (armLR), shield/offhand on the LEFT arm. Every strike starts and ends in the READY pose
// (idle_combat mean) so crossfades stay subtle. `aim` tracks steer the weapon in the BODY frame: [time, elevation, azimuth, weight]
// (elevation + up, 0 = horizontal forward, > PI/2 = up-and-back; azimuth + = toward the character's left).
import { define, seq, mergeKeys, wave, bump, smoothstep, lerp } from '../dsl.js';
import { arm, feet, ready, readyAt, READY, merge } from './poses.js';

// ---- strike_thrust: spear lunge (hit 0.28, recover 0.48) ------------------------------------------------------------------
define('strike_thrust', {
  rig: 'hum1', dur: 0.72, hit: 0.28, recover: 0.48, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.00, READY],
    // anticipation: rock back on the rear leg, twist the torso away, pull the spear arm back and cock the elbow
    [0.12, merge(readyAt(-1.8), { body: [0.0, -0.78, 0.05], head: [-0.05, 0.62, 0], armUR: [0.1, 0.55, -0.5], armLR: [-1.7, 0, 0], armUL: [-0.35, -0.5, 0.55], armLL: [-1.0, 0, 0], root: { y: -0.115, pitch: -0.04 } }), 'io'],
    // step: the front foot comes off the ground while the hip drives forward
    [0.2, merge(feet(6.2, -2.6, { hipZ: 1.2, liftL: 2.2, turnL: 0.1, turnR: -0.5, spread: 0.1 }), { body: [0.2, -0.1, 0], head: [-0.1, 0.1, 0], armUR: [-0.55, 0.25, -0.35], armLR: [-0.8, 0, 0], armUL: [-0.3, -0.5, 0.5], armLL: [-0.9, 0, 0], root: { pitch: 0.1 } }), 'in2'],
    // HIT: full extension, hip over the front foot, torso turned into the thrust
    [0.28, merge(feet(8.0, -2.6, { hipZ: 3.4, h: 7.5, turnL: 0.05, turnR: -0.55, spread: 0.08 }), { body: [0.34, 0.45, 0.02], head: [-0.2, -0.4, 0], armUR: [-1.5, 0.06, -0.1], armLR: [-0.06, 0, 0], armUL: [-0.2, -0.7, 0.6], armLL: [-0.8, 0, 0], root: { pitch: 0.1 } }), 'in'],
    // follow-through: the body keeps going a touch, then holds
    [0.35, merge(feet(8.0, -2.6, { hipZ: 3.9, h: 7.4, turnL: 0.05, turnR: -0.55, spread: 0.08 }), { body: [0.4, 0.52, 0.02], head: [-0.22, -0.45, 0], armUR: [-1.56, 0.08, -0.1], armLR: [-0.04, 0, 0], armUL: [-0.18, -0.75, 0.65], armLL: [-0.75, 0, 0], root: { pitch: 0.12 } }), 'out'],
    [0.5, merge(feet(8.0, -2.6, { hipZ: 2.4, h: 7.9, turnL: 0.1 }), { body: [0.26, 0.1, 0], head: [-0.15, 0.1, 0], armUR: [-1.0, 0.2, -0.25], armLR: [-0.5, 0, 0], armUL: [-0.4, -0.4, 0.4], armLL: [-1.0, 0, 0], root: { pitch: 0.06 } }), 'io'],
    [0.72, READY, 'io'],
  ]), {
    aim: [[0, 0.55, 0.06, 1], [0.12, 0.85, 0.3, 1, 'io'], [0.2, 0.4, 0.15, 1, 'in2'], [0.28, 0.07, 0.0, 1, 'in'], [0.35, 0.05, 0.0, 1, 'out'], [0.5, 0.25, 0.08, 1, 'io'], [0.72, 0.55, 0.06, 1, 'io']],
  }),
});

// ---- strike_overhead: two-beat chop (axe / club / greataxe). hit 0.46 ------------------------------------------------------------
define('strike_overhead', {
  rig: 'hum1', dur: 0.95, hit: 0.46, recover: 0.7, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    // wind-up: rise onto the toes, lean back, weapon up and behind the head, off-hand up for balance
    [0.26, merge(feet(1.5, -3.2, { hipZ: -2.2, spread: 0.12, turnL: 0.1, turnR: -0.4 }), { body: [-0.3, -0.35, 0.05], head: [0.2, 0.2, 0], armUR: [-3.2, 0.2, -0.3], armLR: [-1.9, 0, 0], armUL: [-2.3, -0.3, 0.55], armLL: [-0.6, 0, 0], root: { pitch: -0.1 } }), 'out'],
    // quiver at the top (anticipation hold)
    [0.33, merge(feet(1.5, -3.2, { hipZ: -2.4, spread: 0.12, turnL: 0.1, turnR: -0.4 }), { body: [-0.34, -0.38, 0.05], head: [0.25, 0.2, 0], armUR: [-3.3, 0.2, -0.3], armLR: [-2.0, 0, 0], armUL: [-2.4, -0.3, 0.55], armLL: [-0.6, 0, 0], root: { pitch: -0.12 } }), 'io'],
    // chop: whole body drops into it, step forward, arm accelerates through the vertical
    [0.46, merge(feet(7.0, -3.2, { hipZ: 3.0, h: 7.7, spread: 0.1, turnL: 0.05, turnR: -0.5 }), { body: [0.8, 0.12, 0], head: [0.1, 0, 0], armUR: [-0.6, 0.05, -0.2], armLR: [-0.15, 0, 0], armUL: [-0.5, -0.2, 0.45], armLL: [-0.9, 0, 0], root: { pitch: 0.2 } }), 'in'],
    // follow-through: weapon bites low, body folds over it
    [0.54, merge(feet(7.0, -3.2, { hipZ: 3.4, h: 7.5, spread: 0.1, turnL: 0.05, turnR: -0.5 }), { body: [0.92, 0.14, 0], head: [-0.1, 0, 0], armUR: [-0.2, 0.05, -0.2], armLR: [0.0, 0, 0], armUL: [-0.3, -0.2, 0.45], armLL: [-0.9, 0, 0], root: { pitch: 0.24 } }), 'out'],
    [0.7, merge(feet(7.0, -3.2, { hipZ: 3.0, h: 7.8 }), { body: [0.7, 0.1, 0], head: [-0.05, 0, 0], armUR: [-0.45, 0.1, -0.3], armLR: [-0.4, 0, 0], armUL: [-0.4, -0.2, 0.4], armLL: [-0.9, 0, 0], root: { pitch: 0.16 } }), 'io'],
    [0.95, READY, 'io'],
  ]), {
    aim: [[0, 0.3, 0.1, 1], [0.26, 1.85, 0.0, 1, 'out'], [0.33, 1.95, 0.0, 1, 'io'], [0.4, 1.4, 0.0, 1, 'in2'], [0.46, -0.45, 0.0, 1, 'in'], [0.54, -0.9, 0.0, 1, 'out'], [0.7, -0.3, 0.05, 1, 'io'], [0.95, 0.3, 0.1, 1, 'io']],
  }),
});

// ---- kick: the Spartan push-kick. hit 0.30 ---------------------------------------------------------------------------------------
define('kick', {
  rig: 'hum1', dur: 0.70, hit: 0.30, recover: 0.5, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral', fx: 'dust' },
  keys: seq([
    [0.0, READY],
    // chamber: weight onto the right leg, left knee up to the chest, torso leans back, arms out
    [0.13, merge({ body: [-0.12, -0.2, 0], head: [0.1, 0.2, 0], armUR: [-0.5, 0.1, -0.8], armLR: [-0.8, 0, 0], armUL: [-0.5, -0.1, 0.8], armLL: [-0.5, 0, 0],
      legUL: [-1.55, 0.1, 0.2], legLL: [2.0, 0, 0], legUR: [-0.18, -0.2, -0.1], legLR: [0.35, 0, 0], root: { y: -0.075, z: -0.08, pitch: -0.04 } }), 'out'],
    // snap: leg shoots straight out at hip height, body rocks back, arms flare
    [0.3, merge({ body: [-0.42, -0.1, 0], head: [0.2, 0.1, 0], armUR: [-0.2, 0.1, -1.1], armLR: [-0.5, 0, 0], armUL: [-0.7, -0.1, 1.2], armLL: [-0.3, 0, 0],
      legUL: [-1.62, 0.05, 0.12], legLL: [0.08, 0, 0], legUR: [-0.12, -0.2, -0.1], legLR: [0.35, 0, 0], root: { y: -0.075, z: -0.16, pitch: -0.1 } }), 'in'],
    [0.37, merge({ body: [-0.48, -0.1, 0], head: [0.24, 0.1, 0], armUR: [-0.15, 0.1, -1.2], armLR: [-0.45, 0, 0], armUL: [-0.75, -0.1, 1.3], armLL: [-0.3, 0, 0],
      legUL: [-1.7, 0.05, 0.12], legLL: [0.0, 0, 0], legUR: [-0.1, -0.2, -0.1], legLR: [0.35, 0, 0], root: { y: -0.075, z: -0.2, pitch: -0.12 } }), 'out'],
    // retract and plant (slower than the snap so the speed peak stays on the contact frame)
    [0.6, merge({ body: [0.0, -0.15, 0], head: [0.05, 0.2, 0], armUR: [-0.5, 0.2, -0.6], armLR: [-1.0, 0, 0], armUL: [-0.5, -0.1, 0.6], armLL: [-0.8, 0, 0],
      legUL: [-1.15, 0.1, 0.15], legLL: [1.5, 0, 0], legUR: [-0.2, -0.3, -0.1], legLR: [0.4, 0, 0], root: { y: -0.08, z: -0.1, pitch: 0.0 } }), 'io'],
    [0.7, READY, 'io'],
  ]),
});

// ---- strike_bash: shield bash (left arm). hit 0.28 ------------------------------------------------------------------------------
define('strike_bash', {
  rig: 'hum1', dur: 0.6, hit: 0.28, recover: 0.4, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.11, merge(readyAt(-1.2), { body: [0.1, -0.6, 0], head: [-0.1, 0.45, 0], armUL: [-0.2, -0.5, 0.8], armLL: [-2.1, 0, 0], armUR: [-0.5, 0.2, -0.35], armLR: [-1.1, 0, 0], root: { y: -0.12, pitch: -0.02 } }), 'out'],
    [0.28, merge(feet(7.0, -2.6, { hipZ: 3.0, h: 7.9, turnL: 0.08, turnR: -0.5, spread: 0.1 }), { body: [0.3, 0.15, 0], head: [-0.2, -0.1, 0], armUL: [-1.5, -0.05, 0.12], armLL: [-0.25, 0, 0], armUR: [-0.55, 0.3, -0.45], armLR: [-1.0, 0, 0], root: { pitch: 0.12 } }), 'in'],
    [0.34, merge(feet(7.0, -2.6, { hipZ: 3.4, h: 7.8, turnL: 0.08, turnR: -0.5, spread: 0.1 }), { body: [0.34, 0.22, 0], head: [-0.22, -0.15, 0], armUL: [-1.58, -0.05, 0.12], armLL: [-0.15, 0, 0], armUR: [-0.55, 0.3, -0.45], armLR: [-1.0, 0, 0], root: { pitch: 0.14 } }), 'out'],
    [0.6, READY, 'io'],
  ]),
});

// ---- strike_slash_1 / strike_slash_2: authored fallbacks for the retargeted UAL slashes ----------------------------------------------
define('strike_slash_1', {
  rig: 'hum1', dur: 0.62, hit: 0.30, recover: 0.42, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.13, merge(readyAt(-1.4), { body: [0.0, -0.75, 0.12], head: [-0.05, 0.5, 0], armUR: [-2.5, 0.45, -0.7], armLR: [-1.2, 0, 0], armUL: [-0.4, -0.4, 0.5], armLL: [-1.0, 0, 0], root: { y: -0.11, pitch: -0.06 } }), 'out'],
    [0.3, merge(feet(7.2, -2.6, { hipZ: 3.0, h: 7.6, turnL: 0.05, turnR: -0.5, spread: 0.1 }), { body: [0.4, 0.55, -0.08], head: [-0.15, -0.35, 0], armUR: [-1.2, -0.7, -0.15], armLR: [-0.25, 0, 0], armUL: [-0.2, -0.7, 0.6], armLL: [-0.8, 0, 0], root: { pitch: 0.12 } }), 'in'],
    [0.37, merge(feet(7.2, -2.6, { hipZ: 3.4, h: 7.5, turnL: 0.05, turnR: -0.5, spread: 0.1 }), { body: [0.45, 0.62, -0.1], head: [-0.18, -0.4, 0], armUR: [-0.95, -0.85, -0.15], armLR: [-0.15, 0, 0], armUL: [-0.18, -0.75, 0.65], armLL: [-0.75, 0, 0], root: { pitch: 0.14 } }), 'out'],
    [0.62, READY, 'io'],
  ]), { aim: [[0, 0.3, 0.1, 1], [0.13, 1.7, -0.5, 1, 'out'], [0.22, 1.2, -0.2, 1, 'in2'], [0.3, -0.25, 0.55, 1, 'in'], [0.37, -0.6, 0.7, 1, 'out'], [0.62, 0.3, 0.1, 1, 'io']] }),
});
define('strike_slash_2', {
  rig: 'hum1', dur: 0.62, hit: 0.30, recover: 0.42, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: mergeKeys(seq([
    [0.0, READY],
    [0.13, merge(readyAt(-1.0), { body: [0.08, 0.5, -0.1], head: [-0.1, -0.35, 0], armUR: [-1.0, 1.05, -0.35], armLR: [-1.1, 0, 0], armUL: [-0.5, -0.3, 0.4], armLL: [-1.1, 0, 0], root: { y: -0.1 } }), 'out'],
    [0.3, merge(feet(6.0, -2.6, { hipZ: 2.4, h: 8.0, turnL: 0.05, turnR: -0.5, spread: 0.1 }), { body: [0.2, -0.85, 0.05], head: [-0.1, 0.6, 0], armUR: [-1.35, -0.35, -0.9], armLR: [-0.2, 0, 0], armUL: [-0.3, -0.5, 0.7], armLL: [-0.9, 0, 0], root: { pitch: 0.08 } }), 'in'],
    [0.37, merge(feet(6.0, -2.6, { hipZ: 2.8, h: 7.9, turnL: 0.05, turnR: -0.5, spread: 0.1 }), { body: [0.22, -0.95, 0.05], head: [-0.1, 0.65, 0], armUR: [-1.35, -0.55, -1.0], armLR: [-0.15, 0, 0], armUL: [-0.3, -0.5, 0.75], armLL: [-0.9, 0, 0], root: { pitch: 0.1 } }), 'out'],
    [0.62, READY, 'io'],
  ]), { aim: [[0, 0.3, 0.1, 1], [0.13, 0.15, 1.1, 1, 'out'], [0.3, 0.05, -1.0, 1, 'in'], [0.37, 0.0, -1.2, 1, 'out'], [0.62, 0.3, 0.1, 1, 'io']] }),
});
