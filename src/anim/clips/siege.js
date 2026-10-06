// Bespoke wheeled rigs: chariot1, catapult1, ballista1, trojan1. Wheels roll with ground distance (the animator drives wheel parts from u.gait),
// so these clips only author body motion. Crews are hum_lite sub-rigs animated by the crew_* clips (clip ids chosen by the animator).
import { define, seq, mergeKeys, wave, waveC, bump, clamp, EASE } from '../dsl.js';

const PI = Math.PI;

// ---------------------------------------------------------------- chariot1 (strides equal the quad1 horse gaits so horses and chariot stay in phase)
const HORSE_TROT = { dur: 0.72, stride: 2.51 }, HORSE_GALLOP = { dur: 0.52, stride: 5.3 };
for (const [name, G, bob, rock] of [['trot', HORSE_TROT, 0.025, 0.012], ['gallop', HORSE_GALLOP, 0.07, 0.03]]) {
  define(name, {
    rig: 'chariot1', dur: G.dur, loop: true, speedRef: +(G.stride / G.dur).toFixed(3), meta: { cls: 'move', stride: G.stride },
    build(c, t, u) {
      const b = name === 'gallop' ? Math.max(0, Math.sin(2 * PI * (u + 0.1))) : 0.5 + 0.5 * Math.cos(4 * PI * u);
      c.pos('body', 0, b * bob, 0).rot('body', wave(u, 1, 0.3) * rock * 0.8, 0, wave(u, 1, 0.1) * rock);
      c.rot('pole', -0.02 + wave(u, name === 'gallop' ? 1 : 2, 0.4) * 0.04, 0, 0);
    },
  });
}
define('idle', { rig: 'chariot1', dur: 3.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) { c.rot('body', wave(u, 1) * 0.003, 0, wave(u, 1, 0.3) * 0.004).rot('pole', wave(u, 2, 0.2) * 0.01, 0, 0); } });
define('idle_combat', { rig: 'chariot1', dur: 1.6, loop: true, meta: { cls: 'ready' }, build(c, t, u) { c.rot('body', wave(u, 1) * 0.006, 0, wave(u, 2, 0.3) * 0.006).rot('pole', wave(u, 2, 0.2) * 0.02, 0, 0); } });
define('strike_ram', {
  rig: 'chariot1', dur: 0.9, hit: 0.4, recover: 0.65, meta: { cls: 'strike' },
  keys: seq([
    [0, { 'body.t': [0, 0, 0], body: [0, 0, 0], pole: [0, 0, 0] }],
    [0.2, { 'body.t': [0, 0, -0.18], body: [-0.03, 0, 0], pole: [0.1, 0, 0] }, 'out'],
    [0.4, { 'body.t': [0, 0, 0.3], body: [0.02, 0, 0], pole: [-0.08, 0, 0] }, 'in'],
    [0.5, { 'body.t': [0, 0.02, 0.26], body: [0.0, 0, 0], pole: [0, 0, 0] }, 'out'],
    [0.9, { 'body.t': [0, 0, 0], body: [0, 0, 0], pole: [0, 0, 0] }, 'io'],
  ]),
});
// shoot_bow: the archer draws and releases (hit 0.60); the chariot absorbs the release with a small rock
define('shoot_bow', {
  rig: 'chariot1', dur: 0.95, hit: 0.6, recover: 0.78, meta: { cls: 'shoot' },
  keys: seq([[0, { body: [0, 0, 0], 'body.t': [0, 0, 0] }], [0.5, { body: [0.005, 0, 0], 'body.t': [0, 0, 0] }, 'io'], [0.62, { body: [-0.012, 0, 0.004], 'body.t': [0, 0.004, -0.015] }, 'in'], [0.8, { body: [0, 0, 0], 'body.t': [0, 0, 0] }, 'out'], [0.95, { body: [0, 0, 0], 'body.t': [0, 0, 0] }, 'io']]),
});
define('hit_front', { rig: 'chariot1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, { 'body.t': [0, 0, 0], body: [0, 0, 0] }], [0.08, { 'body.t': [0, 0, -0.06], body: [-0.04, 0, 0.02] }, 'out'], [0.4, { 'body.t': [0, 0, 0], body: [0, 0, 0] }, 'io']]) });
define('death_back', {
  rig: 'chariot1', dur: 1.2, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0, { root: { roll: 0, pitch: 0, y: 0 }, body: [0, 0, 0], pole: [0, 0, 0] }],
    [0.15, { root: { roll: -0.08, pitch: -0.05, y: 0.03 }, body: [-0.06, 0, 0], pole: [0.2, 0, 0] }, 'out'],
    [0.6, { root: { roll: 1.1, pitch: -0.1, y: -0.2 }, body: [0, 0, 0], pole: [-0.5, 0, 0.1] }, 'in2'],
    [0.75, { root: { roll: 0.98, pitch: -0.1, y: -0.14 }, body: [0, 0, 0], pole: [-0.45, 0, 0.1] }, 'out'],
    [1.2, { root: { roll: 1.05, pitch: -0.1, y: -0.17 }, body: [0, 0, 0], pole: [-0.45, 0, 0.1] }, 'io'],
  ]),
});

// ---------------------------------------------------------------- catapult1
// arm rest rx = -0.55; fully cocked = -2.2 (pose -1.65); stop bar at +0.25 (pose +0.8). sling rest +0.55 (hangs plumb at the arm's rest angle).
define('idle', { rig: 'catapult1', dur: 3.2, loop: true, meta: { cls: 'idle' }, build(c, t, u) { c.rot('arm', wave(u, 1) * 0.008, 0, 0).rot('sling', wave(u, 1, 0.3) * 0.02, 0, wave(u, 2) * 0.01).pos('frame', 0, wave(u, 1) * 0.002, 0); } });
define('idle_combat', { rig: 'catapult1', dur: 1.6, loop: true, meta: { cls: 'ready' }, build(c, t, u) { c.rot('arm', -0.55 * 0 - 0.5 + wave(u, 1) * 0.01, 0, 0).rot('sling', wave(u, 1, 0.3) * 0.03, 0, 0); } });
define('walk', {
  rig: 'catapult1', dur: 1.0, loop: true, speedRef: 1.2, meta: { cls: 'move', stride: 1.2 },
  build(c, t, u) { c.rot('frame', wave(u, 2, 0.1) * 0.006, 0, wave(u, 1) * 0.008).pos('frame', 0, Math.abs(wave(u, 1)) * 0.012, 0).rot('arm', wave(u, 2, 0.3) * 0.03, 0, 0).rot('sling', wave(u, 2, 0.6) * 0.05, 0, 0); },
});
const CK = -1.65, STOP = 0.8;
define('launch', {
  rig: 'catapult1', dur: 1.2, hit: 0.5, recover: 0.9, meta: { cls: 'strike' },
  keys: mergeKeys(seq([
    [0.0, { arm: [0, 0, 0], sling: [0, 0, 0], 'frame.t': [0, 0, 0], frame: [0, 0, 0], 'stone.s': [1, 1, 1] }],
    // winch: the arm creaks back in ratchet steps, the frame groans
    [0.16, { arm: [CK * 0.35, 0, 0], sling: [0.3, 0, 0] }, 'io'],
    [0.28, { arm: [CK * 0.55, 0, 0], sling: [0.5, 0, 0] }, 'io'],
    [0.4, { arm: [CK * 0.85, 0, 0], sling: [0.8, 0, 0] }, 'io'],
    [0.47, { arm: [CK, 0, 0], sling: [0.9, 0, 0], 'frame.t': [0, 0, 0], frame: [0.012, 0, 0] }, 'io'],
    // RELEASE: the arm whips over, the sling lags and flips, the frame jolts
    [0.52, { arm: [STOP * 0.4, 0, 0], sling: [-0.4, 0, 0], 'frame.t': [0, 0.02, -0.04], frame: [-0.02, 0, 0] }, 'in'],
    [0.56, { arm: [STOP, 0, 0], sling: [-1.4, 0, 0], 'frame.t': [0, 0.03, -0.08], frame: [-0.03, 0, 0] }, 'in'],
    [0.66, { arm: [STOP - 0.35, 0, 0], sling: [-0.6, 0, 0], 'frame.t': [0, 0, -0.03], frame: [0.01, 0, 0] }, 'out'],
    [0.8, { arm: [0.1, 0, 0], sling: [0.4, 0, 0], 'frame.t': [0, 0, 0], frame: [0, 0, 0] }, 'io'],
    [1.2, { arm: [0, 0, 0], sling: [0, 0, 0], 'frame.t': [0, 0, 0], frame: [0, 0, 0] }, 'io'],
  ]), { 'stone.s': [[0, 1], [0.5, 1], [0.52, 0.0], [0.95, 0.0], [1.15, 1, 'out']] }),
});
define('reload', {
  rig: 'catapult1', dur: 2.0, meta: { cls: 'other' },
  keys: seq([[0, { arm: [0, 0, 0], sling: [0, 0, 0] }], [1.4, { arm: [CK, 0, 0], sling: [0.9, 0, 0] }, 'io'], [2.0, { arm: [CK, 0, 0], sling: [0.9, 0, 0] }, 'lin']]),
});
define('hit_front', { rig: 'catapult1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, { frame: [0, 0, 0], arm: [0, 0, 0] }], [0.08, { frame: [-0.03, 0, 0.02], arm: [0.06, 0, 0] }, 'out'], [0.4, { frame: [0, 0, 0], arm: [0, 0, 0] }, 'io']]) });
define('death_back', {
  rig: 'catapult1', dur: 1.2, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0, { root: { pitch: 0, roll: 0, y: 0 }, arm: [0, 0, 0], sling: [0, 0, 0] }],
    [0.12, { root: { pitch: 0.03, roll: 0.02, y: 0.02 }, arm: [-0.2, 0, 0], sling: [0.2, 0, 0] }, 'out'],
    [0.6, { root: { pitch: -0.12, roll: 0.55, y: -0.18 }, arm: [1.0, 0, 0], sling: [-0.8, 0, 0] }, 'in2'],
    [0.8, { root: { pitch: -0.1, roll: 0.5, y: -0.16 }, arm: [0.9, 0, 0], sling: [-0.6, 0, 0] }, 'out'],
    [1.2, { root: { pitch: -0.1, roll: 0.52, y: -0.16 }, arm: [0.95, 0, 0], sling: [-0.7, 0, 0] }, 'io'],
  ]),
});

// ---------------------------------------------------------------- ballista1
define('idle', { rig: 'ballista1', dur: 3.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) { c.pos('frame', 0, wave(u, 1) * 0.002, 0).pos('string', 0, 0, wave(u, 2) * 0.004); } });
define('idle_combat', { rig: 'ballista1', dur: 1.6, loop: true, meta: { cls: 'ready' }, build(c, t, u) { c.pos('frame', 0, wave(u, 1) * 0.003, 0).pos('string', 0, 0, -0.05 + wave(u, 2) * 0.004).pos('bolt', 0, 0, -0.05); } });
define('walk', { rig: 'ballista1', dur: 1.0, loop: true, speedRef: 1.2, meta: { cls: 'move', stride: 1.2 }, build(c, t, u) { c.rot('frame', wave(u, 2, 0.1) * 0.006, 0, wave(u, 1) * 0.008).pos('frame', 0, Math.abs(wave(u, 1)) * 0.012, 0); } });
define('launch', {
  rig: 'ballista1', dur: 1.2, hit: 0.5, recover: 0.9, meta: { cls: 'strike' },
  keys: mergeKeys(seq([
    [0.0, { 'string.t': [0, 0, 0], 'bolt.t': [0, 0, 0], 'frame.t': [0, 0, 0], frame: [0, 0, 0] }],
    [0.2, { 'string.t': [0, 0, -0.15, ], 'bolt.t': [0, 0, -0.15] }, 'io'],
    [0.38, { 'string.t': [0, 0, -0.34], 'bolt.t': [0, 0, -0.34] }, 'io'],
    [0.47, { 'string.t': [0, 0, -0.46], 'bolt.t': [0, 0, -0.46], frame: [0.008, 0, 0] }, 'io'],
    // release: the string snaps through, the bolt leaves, the frame kicks back
    [0.52, { 'string.t': [0, 0, 0.12], 'bolt.t': [0, 0, 0.6], 'frame.t': [0, 0.01, -0.05], frame: [-0.03, 0, 0] }, 'in'],
    [0.6, { 'string.t': [0, 0, -0.04], 'frame.t': [0, 0, -0.03], frame: [-0.01, 0, 0] }, 'out'],
    [0.7, { 'string.t': [0, 0, 0.02], 'frame.t': [0, 0, -0.01], frame: [0, 0, 0] }, 'out'],
    [0.85, { 'string.t': [0, 0, 0], 'frame.t': [0, 0, 0] }, 'io'],
    [1.2, { 'string.t': [0, 0, 0], 'bolt.t': [0, 0, 0] }, 'io'],
  ]), { 'bolt.s': [[0, 1], [0.5, 1], [0.53, 0.0], [0.95, 0.0], [1.12, 1, 'out']] }),
});
define('reload', { rig: 'ballista1', dur: 2.0, meta: { cls: 'other' }, keys: seq([[0, { 'string.t': [0, 0, 0], 'bolt.t': [0, 0, 0] }], [1.5, { 'string.t': [0, 0, -0.46], 'bolt.t': [0, 0, -0.46] }, 'io'], [2.0, { 'string.t': [0, 0, -0.46], 'bolt.t': [0, 0, -0.46] }, 'lin']]) });
define('hit_front', { rig: 'ballista1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, { frame: [0, 0, 0] }], [0.08, { frame: [-0.03, 0, 0.02] }, 'out'], [0.4, { frame: [0, 0, 0] }, 'io']]) });
define('death_back', {
  rig: 'ballista1', dur: 1.2, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0, { root: { pitch: 0, roll: 0, y: 0 }, 'string.t': [0, 0, 0], 'bolt.t': [0, 0, 0] }],
    [0.12, { root: { pitch: 0.04, roll: 0.03, y: 0.02 }, 'string.t': [0, 0, -0.1], 'bolt.t': [0, 0, -0.1] }, 'out'],
    [0.6, { root: { pitch: -0.1, roll: 0.5, y: -0.17 }, 'string.t': [0, 0, 0.1], 'bolt.t': [0, 0, 0.2] }, 'in2'],
    [1.2, { root: { pitch: -0.1, roll: 0.5, y: -0.16 }, 'string.t': [0, 0, 0.1], 'bolt.t': [0, 0, 0.2] }, 'io'],
  ]),
});

// ---------------------------------------------------------------- trojan1
define('idle', { rig: 'trojan1', dur: 3.4, loop: true, meta: { cls: 'idle' }, build(c, t, u) {
  const b = wave(u, 1);
  c.rot('body', b * 0.004, 0, wave(u, 1, 0.3) * 0.004).rot('head', 0.04 + b * 0.02, wave(u, 1, 0.2) * 0.06, 0).rot('tail', 0.05, 0, wave(u, 2) * 0.2).rot('neck', b * 0.01, 0, 0);
} });
define('idle_combat', { rig: 'trojan1', dur: 1.8, loop: true, meta: { cls: 'ready' }, build(c, t, u) {
  const b = wave(u, 2);
  c.rot('body', b * 0.01, 0, wave(u, 1) * 0.008).rot('head', 0.12 + b * 0.04, 0, 0).rot('tail', 0.15, 0, wave(u, 2) * 0.3).rot('neck', 0.03, 0, 0);
} });
define('walk', { rig: 'trojan1', dur: 1.2, loop: true, speedRef: 1.4, meta: { cls: 'move', stride: 1.68 }, build(c, t, u) {
  // rolling on wheels: the whole horse rocks with every bump, head nodding, rope tail swinging
  const k = wave(u, 2, 0.1), s = wave(u, 1);
  c.rot('body', k * 0.012, 0, s * 0.01).pos('body', 0, Math.abs(k) * 0.015, 0).rot('neck', 0.02 + k * 0.025, 0, 0).rot('head', 0.05 + wave(u, 2, 0.4) * 0.04, 0, 0).rot('tail', 0.1 + k * 0.1, 0, s * 0.2);
  for (const l of ['legFL', 'legFR', 'legBL', 'legBR']) c.rot(l, k * 0.02, 0, 0);
} });
define('strike_ram', {
  rig: 'trojan1', dur: 0.9, hit: 0.4, recover: 0.65, meta: { cls: 'strike' },
  keys: seq([
    [0, { 'body.t': [0, 0, 0], body: [0, 0, 0], neck: [0.02, 0, 0], head: [0.05, 0, 0] }],
    [0.22, { 'body.t': [0, 0.02, -0.25], body: [-0.04, 0, 0], neck: [-0.15, 0, 0], head: [-0.2, 0, 0] }, 'out'],
    [0.4, { 'body.t': [0, -0.02, 0.45], body: [0.06, 0, 0], neck: [0.4, 0, 0], head: [0.5, 0, 0] }, 'in'],
    [0.5, { 'body.t': [0, -0.02, 0.4], body: [0.05, 0, 0], neck: [0.3, 0, 0], head: [0.3, 0, 0] }, 'out'],
    [0.9, { 'body.t': [0, 0, 0], body: [0, 0, 0], neck: [0.02, 0, 0], head: [0.05, 0, 0] }, 'io'],
  ]),
});
// reveal: the belly hatch drops open and the passengers tumble out (hit 0.80); the horse shudders as the crew stirs inside
define('reveal', {
  rig: 'trojan1', dur: 1.6, hit: 0.8, recover: 1.2, meta: { cls: 'other' },
  keys: mergeKeys(seq([
    [0, { hatch: [0, 0, 0], body: [0, 0, 0], head: [0.05, 0, 0] }],
    [0.7, { body: [0.0, 0, 0] }, 'lin'],
    [0.8, { hatch: [1.12, 0, 0], head: [-0.15, 0, 0] }, 'in'],
    [0.9, { hatch: [0.98, 0, 0], head: [0.1, 0, 0] }, 'out'],
    [1.1, { hatch: [1.05, 0, 0], head: [0.05, 0, 0] }, 'io'],
    [1.6, { hatch: [1.05, 0, 0], head: [0.05, 0, 0], body: [0, 0, 0] }, 'io'],
  ]), { 'body.t': [[0, 0, 0, 0], [1.6, 0, 0, 0]] }),
  build(c, t, u) {
    // build-up: increasing trembling until the hatch drops, then a thump
    const k = clamp(t / 0.8, 0, 1), shake = k * k * (t < 0.8 ? 1 : 0), th = Math.exp(-(Math.max(0, t - 0.8)) * 6);
    c.addRot('body', Math.sin(t * 70) * 0.012 * shake, 0, Math.sin(t * 55) * 0.014 * shake);
    c.addPos('body', 0, Math.abs(Math.sin(t * 40)) * 0.02 * shake - th * 0.03 * Math.sin((t - 0.8) * 30), 0);
    c.addRot('tail', Math.sin(t * 60) * 0.05 * shake, 0, 0);
  },
});
define('death_back', {
  rig: 'trojan1', dur: 1.2, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0, { 'body.t': [0, 0, 0], body: [0, 0, 0], neck: [0.02, 0, 0], head: [0.05, 0, 0], tail: [0.1, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], hatch: [0, 0, 0], root: { roll: 0, pitch: 0, y: 0 } }],
    [0.15, { 'body.t': [0, 0.03, 0], body: [-0.04, 0, 0.02], neck: [-0.1, 0, 0], head: [-0.2, 0, 0], tail: [0.4, 0, 0] }, 'out'],
    // the legs buckle outward, the barrel drops, the head and neck crash forward
    [0.65, { 'body.t': [0, -0.32, 0.08], body: [0.18, 0, 0.1], neck: [0.5, 0, 0], head: [0.55, 0, 0], tail: [0.3, 0, 0.2], legFL: [-0.25, 0, 0.3], legFR: [-0.2, 0, -0.35], legBL: [0.3, 0, 0.3], legBR: [0.25, 0, -0.3], hatch: [0.6, 0, 0], root: { roll: 0.08, pitch: 0.03, y: 0 } }, 'in2'],
    [0.78, { 'body.t': [0, -0.26, 0.08], body: [0.14, 0, 0.08], neck: [0.42, 0, 0], head: [0.48, 0, 0], legFL: [-0.2, 0, 0.28], legFR: [-0.15, 0, -0.32], legBL: [0.28, 0, 0.28], legBR: [0.22, 0, -0.28], hatch: [0.4, 0, 0] }, 'out'],
    [1.2, { 'body.t': [0, -0.3, 0.08], body: [0.16, 0, 0.09], neck: [0.46, 0, 0], head: [0.5, 0, 0], legFL: [-0.22, 0, 0.3], legFR: [-0.18, 0, -0.33], legBL: [0.3, 0, 0.3], legBR: [0.24, 0, -0.3], hatch: [0.5, 0, 0] }, 'io'],
  ]),
});
