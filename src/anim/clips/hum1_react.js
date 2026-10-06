// hum1 reactions: hit_front / hit_back / block_hit / stagger / stun / dizzy / cower / sleep / flail / tumble.
import { define, seq, mergeKeys, wave, waveC, bump } from '../dsl.js';
import { feet, READY, readyAt, crouch, merge } from './poses.js';

const PI = Math.PI;

define('hit_front', {
  rig: 'hum1', dur: 0.4, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.07, merge(readyAt(-1.2), { body: [-0.42, 0.1, 0.05], head: [0.45, 0.1, 0], armUR: [-0.9, 0.2, -0.65], armLR: [-0.5, 0, 0], armUL: [-0.9, -0.2, 0.7], armLL: [-0.5, 0, 0], root: { pitch: -0.06 } }), 'out'],
    [0.4, READY, 'io'],
  ]),
});
define('hit_back', {
  rig: 'hum1', dur: 0.4, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.07, merge(readyAt(1.2), { body: [0.4, -0.1, 0.0], head: [-0.55, 0.0, 0], armUR: [0.8, 0.1, -0.7], armLR: [-0.2, 0, 0], armUL: [0.8, -0.1, 0.7], armLL: [-0.2, 0, 0], root: { pitch: 0.08 } }), 'out'],
    [0.4, READY, 'io'],
  ]),
});
define('block_hit', {
  rig: 'hum1', dur: 0.3, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.05, merge(readyAt(-0.9), { body: [0.04, -0.4, 0.0], head: [-0.05, 0.3, 0], armUL: [-0.85, -0.15, 0.3], armLL: [-1.5, 0, 0], armUR: [-0.55, 0.2, -0.3], armLR: [-1.15, 0, 0], root: { pitch: -0.03 } }), 'out'],
    [0.3, READY, 'io'],
  ]),
});

// stagger: reeling steps back, arms windmilling, then catching the balance
define('stagger', {
  rig: 'hum1', dur: 0.8, meta: { cls: 'down', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.12, merge(feet(-3.5, 1.5, { hipZ: -3.5, liftL: 2.5, spread: 0.12 }), { body: [-0.55, 0.2, 0.1], head: [0.5, 0.2, 0.1], armUR: [-1.9, 0.3, -0.9], armLR: [-0.3, 0, 0], armUL: [-1.7, -0.3, 0.9], armLL: [-0.3, 0, 0], root: { pitch: -0.12 } }), 'out'],
    [0.32, merge(feet(-6.5, -2.5, { hipZ: -6.0, liftR: 2.5, spread: 0.12 }), { body: [-0.35, -0.25, -0.15], head: [0.3, -0.2, 0], armUR: [-0.6, 0.2, -1.5], armLR: [-0.2, 0, 0], armUL: [-2.2, -0.2, 0.5], armLL: [-0.4, 0, 0], root: { pitch: -0.08 } }), 'io'],
    [0.56, merge(feet(-5.0, -8.0, { hipZ: -7.0, liftL: 1.5, spread: 0.15 }), { body: [0.35, 0.1, 0.1], head: [-0.2, 0.1, 0], armUR: [-1.2, 0.2, -1.1], armLR: [-0.5, 0, 0], armUL: [-1.3, -0.2, 1.1], armLL: [-0.5, 0, 0], root: { pitch: 0.1 } }), 'io'],
    [0.8, READY, 'io'],
  ]),
});

// stun / dizzy: frame 0 of stun is the "frozen in alarm" pose used for stone statues (rate 0), then a groggy sway loop
define('stun', {
  rig: 'hum1', dur: 1.2, loop: true, meta: { cls: 'down' },
  build(c, t, u) {
    const s = wave(u, 1), s2 = wave(u, 2, 0.25), k = waveC(u, 1);
    // u = 0: arms thrown up and out, head back, knees knocked: a startled statue; the sway then loosens everything
    c.rot('body', -0.3 + k * 0.1, s * 0.3, s2 * 0.22).rot('head', 0.35 + s * 0.15, -s * 0.5, -s2 * 0.3);
    c.rot('armUL', -1.5 + k * 0.5, 0.2, 0.9 + s * 0.2).rot('armLL', -0.5 + s * 0.3, 0, 0).rot('armUR', -1.6 + k * 0.5, -0.2, -0.9 - s * 0.2).rot('armLR', -0.5 - s * 0.3, 0, 0);
    c.rot('legUL', -0.35 + s * 0.2, 0.2, 0.22).rot('legLL', 0.6, 0, 0).rot('legUR', -0.2 - s * 0.2, -0.2, -0.22).rot('legLR', 0.5, 0, 0);
    c.rootSet('y', -0.07 + k * 0.01).rootSet('roll', s2 * 0.08).rootSet('pitch', -0.05);
  },
});
define('dizzy', {
  rig: 'hum1', dur: 1.2, loop: true, meta: { cls: 'down' },
  build(c, t, u) {
    const s = wave(u, 1), co = waveC(u, 1), s2 = wave(u, 2);
    c.rot('body', 0.12 + co * 0.12, s * 0.35, -s * 0.2).rot('head', 0.1 + s * 0.25, co * 0.6, -co * 0.35);      // head drawing circles
    c.rot('armUL', 0.2 + s * 0.4, 0, 0.5 + co * 0.2).rot('armLL', -0.35, 0, 0).rot('armUR', 0.2 - s * 0.4, 0, -0.5 - co * 0.2).rot('armLR', -0.35, 0, 0);
    c.rot('legUL', -0.3 + s2 * 0.18, 0.1, 0.2).rot('legLL', 0.5 + Math.max(0, s2) * 0.3, 0, 0).rot('legUR', -0.3 - s2 * 0.18, -0.1, -0.2).rot('legLR', 0.5 + Math.max(0, -s2) * 0.3, 0, 0);
    c.rootSet('y', -0.06 + Math.abs(s2) * 0.01).rootSet('x', s * 0.05).rootSet('roll', -s * 0.1);
  },
});
define('cower', {
  rig: 'hum1', dur: 1.0, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const tr = wave(u, 7), br = wave(u, 1), cr = crouch(1.5, 0.35);
    c.rot('body', 0.75 + br * 0.03, 0.05, 0).rot('head', 0.55 + tr * 0.03, 0, tr * 0.04);
    c.rot('armUL', -2.3, 0.3, 0.2 + tr * 0.03).rot('armLL', -2.2, 0, 0).rot('armUR', -2.3, -0.3, -0.2 - tr * 0.03).rot('armLR', -2.2, 0, 0);       // hands over the head
    c.rot('legUL', -1.0, 0, 0.3).rot('legLL', 1.9, 0, 0).rot('legUR', -1.0, 0, -0.3).rot('legLR', 1.9, 0, 0);
    c.rootSet('y', -0.36 + br * 0.006).rootSet('pitch', 0.05 + tr * 0.004).rootSet('x', tr * 0.006);
  },
});
// sleep: sitting down hard with the chin on the chest, slow breathing, the odd head-nod
define('sleep', {
  rig: 'hum1', dur: 3.0, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const br = wave(u, 1), nod = Math.max(0, wave(u, 2, 0.1)) * 0.2;
    c.rot('legUL', -1.45, 0.1, 0.35).rot('legLL', 0.15, 0, 0).rot('legUR', -1.45, -0.1, -0.35).rot('legLR', 0.15, 0, 0);
    c.rot('body', 0.55 + br * 0.025, 0.0, 0.08).rot('head', 0.7 + nod, 0.0, 0.18);
    c.rot('armUL', -0.2, 0.0, 0.3).rot('armLL', -0.6, 0, 0).rot('armUR', -0.25, 0.0, -0.3).rot('armLR', -0.6, 0, 0);
    c.rootSet('y', -0.465 + br * 0.003);
  },
});
// flail: airborne, arms windmilling, legs pedalling (catapult misfire victim)
define('flail', {
  rig: 'hum1', dur: 0.8, loop: true, meta: { cls: 'down' },
  build(c, t, u) {
    const s = wave(u, 2), co = waveC(u, 2), s1 = wave(u, 1);
    c.rot('body', -0.2 + s1 * 0.15, s * 0.25, co * 0.2).rot('head', 0.3 + co * 0.2, s * 0.3, 0);
    c.rot('armUL', -2.4 + co * 0.9, 0.3, 0.7 + s * 0.4).rot('armLL', -0.5 + s * 0.4, 0, 0).rot('armUR', -2.4 - co * 0.9, -0.3, -0.7 - s * 0.4).rot('armLR', -0.5 - s * 0.4, 0, 0);
    c.rot('legUL', -0.7 + s * 0.8, 0, 0.3).rot('legLL', 0.9 - s * 0.5, 0, 0).rot('legUR', -0.7 - s * 0.8, 0, -0.3).rot('legLR', 0.9 + s * 0.5, 0, 0);
    c.rootSet('pitch', -0.5 + s1 * 0.1).rootSet('roll', co * 0.15);
  },
});
define('tumble', {
  rig: 'hum1', dur: 0.9, loop: true, meta: { cls: 'down' },
  build(c, t, u) {
    const s = wave(u, 2), co = waveC(u, 2);
    c.rot('body', 0.5, 0, 0).rot('head', 0.3, 0, 0);
    c.rot('armUL', -2.0 + s * 0.4, 0.2, 0.6).rot('armLL', -1.0, 0, 0).rot('armUR', -2.0 - s * 0.4, -0.2, -0.6).rot('armLR', -1.0, 0, 0);
    c.rot('legUL', -1.2 + co * 0.3, 0, 0.2).rot('legLL', 1.3, 0, 0).rot('legUR', -1.2 - co * 0.3, 0, -0.2).rot('legLR', 1.3, 0, 0);
    c.rootSet('pitch', -u * PI * 2).rootSet('y', 0.1);
  },
});
