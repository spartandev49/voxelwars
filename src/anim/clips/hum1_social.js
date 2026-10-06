// hum1 social clips: taunt (one shot), cheer (loop).
import { define, seq, wave, waveC, bump } from '../dsl.js';
import { feet, READY, merge } from './poses.js';

// taunt: "THIS IS..." chest out, weapon thrust skyward, pumped twice, shield bashed against the chest
define('taunt', {
  rig: 'hum1', dur: 1.6, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, READY],
    [0.3, merge(feet(3.0, -3.0, { spread: 0.18, turnL: 0.1, turnR: -0.1 }), { body: [-0.25, 0.0, 0.0], head: [-0.4, 0.0, 0.0], armUR: [-2.95, 0.0, -0.5], armLR: [-0.4, 0, 0], armUL: [-1.0, -0.6, 0.5], armLL: [-1.7, 0, 0] }), 'out'],
    [0.5, merge(feet(3.0, -3.0, { spread: 0.18 }), { body: [-0.3, 0.0, 0.0], head: [-0.45, 0.0, 0.0], armUR: [-3.2, 0.0, -0.5], armLR: [-0.5, 0, 0], armUL: [-0.6, -0.9, 0.3], armLL: [-1.9, 0, 0], root: { y: 0.0 } }), 'in'],
    [0.7, merge(feet(3.0, -3.0, { spread: 0.18 }), { body: [-0.2, 0.0, 0.0], head: [-0.4, 0.0, 0.0], armUR: [-2.85, 0.0, -0.5], armLR: [-0.4, 0, 0], armUL: [-1.0, -0.6, 0.5], armLL: [-1.7, 0, 0] }), 'io'],
    [0.9, merge(feet(3.0, -3.0, { spread: 0.18 }), { body: [-0.3, 0.0, 0.0], head: [-0.45, 0.0, 0.0], armUR: [-3.2, 0.0, -0.5], armLR: [-0.5, 0, 0], armUL: [-0.6, -0.9, 0.3], armLL: [-1.9, 0, 0] }), 'in'],
    [1.25, merge(feet(3.0, -3.0, { spread: 0.18 }), { body: [-0.2, 0.0, 0.0], head: [-0.35, 0.0, 0.0], armUR: [-3.0, 0.0, -0.5], armLR: [-0.4, 0, 0], armUL: [-1.0, -0.6, 0.5], armLL: [-1.7, 0, 0] }), 'io'],
    [1.6, READY, 'io'],
  ]),
  aim: undefined,
});
// cheer: arms up, hopping in place
define('cheer', {
  rig: 'hum1', dur: 1.2, loop: true, meta: { cls: 'other' },
  build(c, t, u) {
    const hop = Math.abs(wave(u, 2)), s = wave(u, 2), co = waveC(u, 2);
    c.rot('body', -0.12 - hop * 0.08, wave(u, 1) * 0.12, s * 0.06).rot('head', -0.3 + hop * 0.1, wave(u, 1, 0.5) * 0.25, 0);
    c.rot('armUL', -2.9 + co * 0.35, -0.1, 0.45 + s * 0.12).rot('armLL', -0.35 - hop * 0.25, 0, 0).rot('armUR', -2.9 - co * 0.35, 0.1, -0.45 - s * 0.12).rot('armLR', -0.35 - hop * 0.25, 0, 0);
    const lift = hop;
    c.rot('legUL', -0.1 - lift * 0.55, 0, 0.12).rot('legLL', 0.2 + lift * 1.0, 0, 0).rot('legUR', -0.1 - lift * 0.55, 0, -0.12).rot('legLR', 0.2 + lift * 1.0, 0, 0);
    c.rootSet('y', hop * 0.2 - 0.02).rootSet('roll', s * 0.04);
  },
});
