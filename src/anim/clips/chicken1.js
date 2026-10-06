// chicken1 clips: the sacred chicken (body, head, wingL/R, legL/R, tail). Squash and stretch through scale tracks. Small (0.4 u hip height).
import { define, seq, mergeKeys, wave, waveC, bump, clamp } from '../dsl.js';

const PI = Math.PI, TAU = Math.PI * 2;
const LEG_L = 0.43;       // hip pivot to ground (u)

/** biped scurry: alternating legs, the head stays steady while the body bobs (the classic chicken head-bob) */
function scurry(D, amp, duty, o) {
  const zmax = LEG_L * Math.sin(amp), st = (2 * zmax) / duty;
  return {
    dur: D, speedRef: +(st / D).toFixed(3), stride: st,
    build(c, t, u) {
      for (const [id, off] of [['legL', 0.0], ['legR', 0.5]]) {
        const ph = (u + off) % 1;
        let z, f = 0;
        if (ph < duty) z = zmax * (1 - 2 * ph / duty); else { const x = (ph - duty) / (1 - duty); z = -zmax + 2 * zmax * (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)); f = o.lift * Math.sin(PI * x); }
        const th = Math.asin(clamp(z / LEG_L, -1, 1));
        c.rot(id, -th, 0, 0).pos(id, 0, f - LEG_L * (1 - Math.cos(th)) - o.drop, 0);
      }
      const b = Math.abs(Math.sin(PI * 2 * u)), s = Math.sin(TAU * u);
      c.pos('body', 0, -o.drop + b * o.bob, 0).rot('body', o.lean + s * 0.05, 0, s * o.roll).scl('body', 1, 1 - b * 0.04, 1 + b * 0.03);
      // head stays put in space: counter-translate against the body surge, pecking forward at each plant
      c.pos('head', 0, 0, -Math.cos(TAU * 2 * u) * o.headBob).rot('head', -o.lean * 0.6 - s * 0.05 + Math.max(0, Math.cos(TAU * 2 * u)) * 0.1, 0, 0);
      c.rot('wingL', 0, 0, o.wings + b * 0.1).rot('wingR', 0, 0, -(o.wings + b * 0.1)).rot('tail', 0.15 + o.tail * b, 0, s * 0.12);
    },
  };
}
for (const [name, D, amp, duty, o] of [
  ['walk', 0.5, 0.6, 0.6, { lift: 0.05, bob: 0.015, drop: 0.03, lean: 0.05, roll: 0.05, headBob: 0.025, wings: 0.05, tail: 0.1 }],
  ['trot', 0.38, 0.75, 0.55, { lift: 0.07, bob: 0.02, drop: 0.05, lean: 0.12, roll: 0.07, headBob: 0.03, wings: 0.25, tail: 0.15 }],
  ['gallop', 0.3, 0.9, 0.5, { lift: 0.1, bob: 0.04, drop: 0.07, lean: 0.3, roll: 0.09, headBob: 0.04, wings: 0.7, tail: 0.3 }],
]) { const g = scurry(D, amp, duty, o); define(name, { rig: 'chicken1', dur: g.dur, loop: true, speedRef: g.speedRef, meta: { cls: 'move', stride: +g.stride.toFixed(3) }, build: g.build }); }

// idle: peck, peck, look around, ruffle
define('idle', {
  rig: 'chicken1', dur: 2.8, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const br = wave(u, 1);
    // two quick pecks near the start of the loop, then a head-turning look-around
    const p1 = bump(u, 0.12, 0.05) + bump(u, 0.26, 0.05), look = wave(u, 1, 0.1) * smoothWin(u, 0.45, 0.95);
    c.pos('body', 0, br * 0.004 - p1 * 0.02, 0).scl('body', 1, 1 + br * 0.015 - p1 * 0.05, 1 + p1 * 0.03).rot('body', p1 * 0.25, 0, 0);
    c.rot('head', 0.05 + p1 * 1.0, look * 0.8, look * 0.2).pos('head', 0, 0, p1 * 0.05);
    c.rot('wingL', 0, 0, 0.04 + Math.max(0, wave(u, 3, 0.6)) * 0.1).rot('wingR', 0, 0, -0.04 - Math.max(0, wave(u, 3, 0.6)) * 0.1).rot('tail', 0.1 + Math.max(0, wave(u, 2)) * 0.1, 0, 0);
  },
});
const smoothWin = (u, a, b) => (u < a || u > b ? 0 : Math.sin(Math.PI * (u - a) / (b - a)));
define('idle_combat', {
  rig: 'chicken1', dur: 1.2, loop: true, meta: { cls: 'ready' },
  build(c, t, u) {
    const bob = wave(u, 2), s = wave(u, 1);
    c.pos('body', 0, -0.02 + bob * 0.006, 0).rot('body', 0.2, 0, s * 0.05).scl('body', 1.04, 0.96, 1.0).rot('head', -0.15 + bob * 0.05, s * 0.2, 0).rot('wingL', 0, 0, 0.35 + bob * 0.05).rot('wingR', 0, 0, -0.35 - bob * 0.05).rot('tail', 0.4, 0, bob * 0.1);
    c.rot('legL', 0.15, 0, 0).rot('legR', -0.1, 0, 0);
  },
});
define('strike_peck', {
  rig: 'chicken1', dur: 0.3, hit: 0.12, recover: 0.2, meta: { cls: 'strike' },
  keys: seq([
    [0, { 'body.t': [0, 0, 0], 'body.s': [1, 1, 1], body: [0, 0, 0], head: [0.05, 0, 0], 'head.t': [0, 0, 0] }],
    [0.06, { 'body.t': [0, 0.01, -0.04], 'body.s': [1.0, 1.08, 0.94], body: [-0.12, 0, 0], head: [-0.7, 0, 0], 'head.t': [0, 0.02, -0.03] }, 'out'],
    [0.12, { 'body.t': [0, -0.03, 0.1], 'body.s': [1.0, 0.9, 1.1], body: [0.25, 0, 0], head: [1.2, 0, 0], 'head.t': [0, -0.03, 0.08] }, 'in'],
    [0.18, { 'body.t': [0, -0.02, 0.08], 'body.s': [1.0, 0.95, 1.04], body: [0.18, 0, 0], head: [0.8, 0, 0], 'head.t': [0, -0.01, 0.05] }, 'out'],
    [0.3, { 'body.t': [0, 0, 0], 'body.s': [1, 1, 1], body: [0, 0, 0], head: [0.05, 0, 0], 'head.t': [0, 0, 0] }, 'io'],
  ]),
});
define('flap', {
  rig: 'chicken1', dur: 0.8, meta: { cls: 'other' },
  build(c, t, u) {
    // three hard flaps with a hop, wings snapping out, head thrown back
    const fl = Math.sin(u * PI * 2 * 3), hop = Math.sin(u * PI) , up = Math.max(0, hop);
    c.rot('wingL', 0, 0, 0.9 + fl * 0.8).rot('wingR', 0, 0, -(0.9 + fl * 0.8)).pos('body', 0, up * 0.14, 0).scl('body', 1 - up * 0.04, 1 + up * 0.1, 1 - up * 0.04).rot('body', -0.3 * hop, 0, 0);
    c.rot('head', -0.4 * hop, Math.sin(u * PI * 2) * 0.2, 0).rot('tail', 0.5 + up * 0.5, 0, 0).rot('legL', -0.5 * up, 0, 0).rot('legR', -0.5 * up, 0, 0).pos('legL', 0, up * 0.05, 0).pos('legR', 0, up * 0.05, 0);
  },
});
// tantrum: feathers up, shaking with rage, stomping, wings flailing
define('tantrum', {
  rig: 'chicken1', dur: 1.0, loop: true, meta: { cls: 'other' },
  build(c, t, u) {
    const sh = Math.sin(u * TAU * 8), sh2 = Math.sin(u * TAU * 11 + 1), st = wave(u, 4);
    const puff = 1.18 + sh * 0.04;
    c.scl('body', puff, puff - 0.04 + sh2 * 0.03, puff).pos('body', 0, Math.abs(wave(u, 4)) * 0.05, 0).rot('body', 0.15, sh * 0.06, sh2 * 0.08);
    c.rot('head', 0.35 + sh * 0.12, sh2 * 0.3, 0).pos('head', 0, 0, 0.03 + sh * 0.01).scl('head', 1.1, 1.1, 1.1);
    c.rot('wingL', 0, 0, 0.75 + Math.sin(u * TAU * 4) * 0.55).rot('wingR', 0, 0, -(0.75 + Math.sin(u * TAU * 4 + 0.5) * 0.55)).scl('wingL', 1.3, 1.2, 1.3).scl('wingR', 1.3, 1.2, 1.3).rot('tail', 0.9, 0, sh2 * 0.15).scl('tail', 1.2, 1.2, 1.2);
    c.rot('legL', st * 0.5, 0, 0).pos('legL', 0, Math.max(0, st) * 0.05, 0).rot('legR', -st * 0.5, 0, 0).pos('legR', 0, Math.max(0, -st) * 0.05, 0);
  },
});
define('hit_front', { rig: 'chicken1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, { body: [0, 0, 0], 'body.s': [1, 1, 1], head: [0.05, 0, 0] }], [0.07, { body: [-0.45, 0, 0.1], 'body.s': [1.1, 0.88, 1.0], head: [-0.6, 0, 0] }, 'out'], [0.4, { body: [0, 0, 0], 'body.s': [1, 1, 1], head: [0.05, 0, 0] }, 'io']]) });
define('hit_back', { rig: 'chicken1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, { body: [0, 0, 0], 'body.s': [1, 1, 1], head: [0.05, 0, 0] }], [0.07, { body: [0.45, 0, -0.1], 'body.s': [1.1, 0.88, 1.0], head: [0.6, 0, 0] }, 'out'], [0.4, { body: [0, 0, 0], 'body.s': [1, 1, 1], head: [0.05, 0, 0] }, 'io']]) });
define('stagger', { rig: 'chicken1', dur: 0.8, meta: { cls: 'down' }, keys: seq([[0, { body: [0, 0, 0], 'body.t': [0, 0, 0], head: [0, 0, 0] }], [0.15, { body: [-0.5, 0, 0.25], 'body.t': [0, 0.05, -0.1], head: [-0.5, 0.3, 0], wingL: [0, 0, 1.0], wingR: [0, 0, -1.0] }, 'out'], [0.4, { body: [0.25, 0, -0.3], 'body.t': [0, 0, -0.06], head: [0.4, -0.3, 0], wingL: [0, 0, 0.6], wingR: [0, 0, -0.6] }, 'io'], [0.8, { body: [0, 0, 0], 'body.t': [0, 0, 0], head: [0, 0, 0], wingL: [0, 0, 0], wingR: [0, 0, 0] }, 'io']]) });
define('stun', { rig: 'chicken1', dur: 1.2, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), s2 = wave(u, 2, 0.25);
  c.rot('body', 0, s * 0.3, s2 * 0.2).rot('head', 0.4 + s * 0.2, -s * 0.9, s2 * 0.4).rot('wingL', 0, 0, 0.8 + s2 * 0.3).rot('wingR', 0, 0, -0.8 - s2 * 0.3).rot('tail', 0.6, 0, s * 0.4);
} });
define('dizzy', { rig: 'chicken1', dur: 1.2, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), co = waveC(u, 1);
  c.rot('body', 0.1, s * 0.4, co * 0.25).rot('head', 0.3 + co * 0.2, s * 1.0, -co * 0.4).rot('wingL', 0, 0, 0.5 + co * 0.2).rot('wingR', 0, 0, -0.5 + s * 0.2);
} });
define('cower', { rig: 'chicken1', dur: 1.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) {
  const tr = wave(u, 9);
  c.pos('body', 0, -0.1, 0).scl('body', 1.12, 0.8, 1.1).rot('body', 0.1, 0, tr * 0.03).rot('head', 0.6, 0, tr * 0.05).pos('head', 0, -0.04, 0).rot('wingL', 0, 0, 0.5).rot('wingR', 0, 0, -0.5).rot('tail', -0.2, 0, 0);
  c.rot('legL', 0.5, 0, 0).rot('legR', 0.5, 0, 0).pos('legL', 0, -0.03, 0).pos('legR', 0, -0.03, 0);
} });
// death_back: the comic flip. A hop, a somersault onto the back, legs stiff in the air, wings flopped out (the renderer adds the feather puff)
define('death_back', {
  rig: 'chicken1', dur: 0.9, meta: { cls: 'down', exit: 'lying' },
  keys: seq([
    [0, { root: { roll: 0, pitch: 0, y: 0 }, body: [0, 0, 0], 'body.s': [1, 1, 1], head: [0.05, 0, 0], wingL: [0, 0, 0], wingR: [0, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0], tail: [0.15, 0, 0] }],
    [0.08, { root: { roll: -0.1, pitch: -0.1, y: 0 }, 'body.s': [1.12, 0.82, 1.1], head: [-0.5, 0, 0], wingL: [0, 0, 1.2], wingR: [0, 0, -1.2], tail: [0.8, 0, 0] }, 'out'],
    [0.36, { root: { roll: -1.9, pitch: -0.3, y: 0.38 }, 'body.s': [0.94, 1.1, 0.96], head: [0.2, 0.2, 0], wingL: [0, 0, 1.0], wingR: [0, 0, -1.0], legL: [-0.8, 0, 0.3], legR: [-0.5, 0, -0.3] }, 'io'],
    [0.58, { root: { roll: -PI, pitch: -0.15, y: 0.1 }, 'body.s': [1.15, 0.8, 1.12], head: [0.3, 0.3, 0], wingL: [0, 0, 0.7], wingR: [0, 0, -0.9], legL: [-0.4, 0, 0.3], legR: [-0.3, 0, -0.3] }, 'in'],
    [0.7, { root: { roll: -PI, pitch: -0.1, y: 0.13 }, 'body.s': [0.96, 1.05, 0.97], head: [0.3, 0.3, 0], wingL: [0, 0, 1.0], wingR: [0, 0, -1.2] }, 'out'],
    [0.9, { root: { roll: -PI, pitch: -0.1, y: 0.12 }, 'body.s': [1, 1, 1], head: [0.4, 0.4, 0.2], wingL: [0, 0, 0.9], wingR: [0, 0, -1.1], legL: [-0.2, 0, 0.2], legR: [-0.1, 0, -0.25], tail: [0.2, 0, 0.3] }, 'io'],
  ]),
});
