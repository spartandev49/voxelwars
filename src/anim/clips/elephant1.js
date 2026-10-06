// elephant1 clips: walk, charge (run), idle, gore, stomp, trumpet, reactions, death. Part ids: body, head, trunkA..C, earL/R, tail, legFL..BR, howdah.
// Gait comes from the same recipe as quad1 (legs hang from a pivot 0.6 u inside the barrel, 2.2 u long) with a heavy, low-bob character.
import { define, seq, mergeKeys, wave, waveC, bump, clamp } from '../dsl.js';
import { gaitBuild, stride, LEGS } from './quad1.js';

const PI = Math.PI, TAU = Math.PI * 2;
const EL = { id: 'elephant', L: 2.2, zF: 1.5, zB: -1.55, hw: 1.3, bodyY: 1.6, pace: false, tail: 1.0, neck: [0, 0] };
const WALK = { amp: 0.55, duty: 0.72, D: 1.0, bob: 0.03, pitch: 0.012, neckAmp: 0.05, lift: 0.14, off: [0.25, 0.75, 0.0, 0.5] };
const RUN = { amp: 0.68, duty: 0.6, D: 0.72, bob: 0.08, pitch: 0.035, neckAmp: 0.06, lift: 0.22, off: [0.25, 0.75, 0.0, 0.5] };

/** trunk wave: each segment lags the one before it (follow-through down the trunk) */
function trunk(c, u, o) {
  const a = o.amp, ph = o.phase || 0, f = o.freq || 1;
  c.rot('trunkA', o.curlA + wave(u, f, ph) * a * 0.5, wave(u, f, ph + 0.1) * (o.sideA || 0), wave(u, f, ph + 0.25) * (o.side || 0));
  c.rot('trunkB', o.curlB + wave(u, f, ph - 0.12) * a * 0.8, wave(u, f, ph - 0.1) * (o.sideA || 0), wave(u, f, ph + 0.13) * (o.side || 0) * 1.3);
  c.rot('trunkC', o.curlC + wave(u, f, ph - 0.25) * a, wave(u, f, ph - 0.2) * (o.sideA || 0), wave(u, f, ph) * (o.side || 0) * 1.6);
}
function ears(c, u, o) { c.rot('earL', 0, o.base + wave(u, o.f || 1, o.ph || 0) * o.amp, 0).rot('earR', 0, -(o.base + wave(u, o.f || 1, (o.ph || 0)) * o.amp), 0); }

for (const [name, G, D, trk, earO] of [['walk', WALK, WALK.D, { curlA: 0.05, curlB: 0.1, curlC: 0.15, amp: 0.2, side: 0.12 }, { base: 0.0, amp: 0.15 }], ['run', RUN, RUN.D, { curlA: -0.7, curlB: -0.6, curlC: -0.5, amp: 0.1, side: 0.06, freq: 2 }, { base: 0.35, amp: 0.1, f: 2 }]]) {
  const gb = gaitBuild(EL, name, G), st = stride(EL, G);
  define(name, {
    rig: 'elephant1', dur: D, loop: true, speedRef: +(st / D).toFixed(3), meta: { cls: 'move', stride: +st.toFixed(3) },
    build(c, t, u) {
      gb(c, t, u);
      // heavy gait: the head dips on every footfall, the whole animal rolls from side to side, the howdah lags
      const roll = wave(u, 1, 0.1) * (name === 'run' ? 0.045 : 0.025);
      c.rot('body', c.rotOf('body', 0), 0, roll);
      c.rot('head', (name === 'run' ? 0.28 : 0.04) + wave(u, name === 'run' ? 2 : 1, 0.2) * 0.05, wave(u, 1, 0.3) * 0.05, -roll * 0.5);
      c.rot('neck', 0, 0, 0);
      trunk(c, u, trk); ears(c, u, earO);
      c.rot('tail', 0.25, 0, wave(u, 1, 0.4) * 0.35);
      c.rot('howdah', -c.rotOf('body', 0) * 0.5 + wave(u, 2, 0.5) * 0.012, 0, -roll * 0.6);
    },
  });
}
define('idle', {
  rig: 'elephant1', dur: 3.6, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const br = wave(u, 1), sh = wave(u, 1, 0.25);
    c.pos('body', 0, br * 0.008, 0).scl('body', 1, 1 + br * 0.008, 1 + br * 0.006).rot('body', br * 0.006, 0, sh * 0.012).rot('head', 0.04 + br * 0.015, wave(u, 1, 0.3) * 0.12, 0);
    trunk(c, u, { curlA: 0.1, curlB: 0.2, curlC: 0.3, amp: 0.3, side: 0.15, sideA: 0.05, phase: 0.1 });
    ears(c, u, { base: 0.05, amp: 0.2, f: 2, ph: 0.2 });
    c.rot('tail', 0.2, 0, wave(u, 2, 0.5) * 0.4).rot('howdah', -br * 0.004, 0, -sh * 0.01);
    const lf = Math.max(0, wave(u, 1, 0.6)); c.rot('legFR', -0.25 * lf, 0, 0).pos('legFR', 0, 0.12 * lf, 0);     // the occasional foreleg lift
  },
});
define('idle_combat', {
  rig: 'elephant1', dur: 1.8, loop: true, meta: { cls: 'ready' },
  build(c, t, u) {
    const br = wave(u, 1), s2 = wave(u, 2);
    c.pos('body', 0, br * 0.01, 0).rot('body', 0.03, 0, 0).rot('head', 0.2 + br * 0.02, wave(u, 1, 0.2) * 0.08, 0);
    trunk(c, u, { curlA: -0.5, curlB: -0.45, curlC: -0.4, amp: 0.15, side: 0.1, phase: 0.2 });
    ears(c, u, { base: 0.3, amp: 0.1, f: 2 });
    c.rot('tail', 0.3, 0, s2 * 0.3);
    const p = Math.max(0, s2); c.rot('legFL', -0.4 * p, 0, 0).pos('legFL', 0, 0.1 * p, 0);          // pawing
  },
});

const E0 = { root: { y: 0, roll: 0, pitch: 0, yaw: 0 }, body: [0, 0, 0], 'body.t': [0, 0, 0], head: [0.04, 0, 0], 'head.t': [0, 0, 0], trunkA: [0.1, 0, 0], trunkB: [0.2, 0, 0], trunkC: [0.3, 0, 0], earL: [0, 0, 0], earR: [0, 0, 0], tail: [0.2, 0, 0], howdah: [0, 0, 0],
  legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], 'legFL.t': [0, 0, 0], 'legFR.t': [0, 0, 0], 'legBL.t': [0, 0, 0], 'legBR.t': [0, 0, 0] };
const P = (o) => Object.assign({}, E0, o);

// strike_gore: head rears, then drives down and forward, tusks sweeping up (hit 0.45)
define('strike_gore', {
  rig: 'elephant1', dur: 0.95, hit: 0.45, recover: 0.7, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, E0],
    [0.3, P({ body: [-0.12, 0, 0], 'body.t': [0, 0.03, -0.18], head: [-0.6, 0, 0], trunkA: [-1.0, 0, 0], trunkB: [-0.9, 0, 0], trunkC: [-0.8, 0, 0], earL: [0, 0.4, 0], earR: [0, -0.4, 0], tail: [0.8, 0, 0], howdah: [0.08, 0, 0],
      legFL: [0.2, 0, 0], legFR: [0.2, 0, 0], legBL: [0.3, 0, 0], legBR: [0.3, 0, 0] }), 'io'],
    [0.45, P({ body: [0.12, 0, 0], 'body.t': [0, -0.08, 0.5], head: [0.55, 0, 0], trunkA: [-1.1, 0, 0], trunkB: [-1.0, 0, 0], trunkC: [-0.9, 0, 0], earL: [0, 0.5, 0], earR: [0, -0.5, 0], tail: [0.6, 0, 0], howdah: [-0.08, 0, 0],
      legFL: [-0.55, 0, 0], legFR: [-0.45, 0, 0], legBL: [0.1, 0, 0], legBR: [0.1, 0, 0], 'legFL.t': [0, 0.06, 0] }), 'in'],
    [0.56, P({ body: [0.14, 0, 0], 'body.t': [0, -0.06, 0.52], head: [0.3, 0, 0], trunkA: [-1.0, 0, 0], trunkB: [-0.9, 0, 0], trunkC: [-0.8, 0, 0], earL: [0, 0.45, 0], earR: [0, -0.45, 0], tail: [0.5, 0, 0], howdah: [-0.1, 0, 0],
      legFL: [-0.5, 0, 0], legFR: [-0.4, 0, 0], legBL: [0.1, 0, 0], legBR: [0.1, 0, 0] }), 'out'],
    [0.95, E0, 'io'],
  ]),
});
// strike_stomp: foreleg lifts, then stamps (hit 0.50), the ground shudders
define('strike_stomp', {
  rig: 'elephant1', dur: 1.0, hit: 0.5, recover: 0.75, meta: { cls: 'strike', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, E0],
    [0.34, P({ body: [-0.1, 0, 0.04], 'body.t': [0, 0.06, -0.08], head: [-0.2, 0, 0], trunkA: [-0.5, 0, 0], trunkB: [-0.4, 0, 0], trunkC: [-0.3, 0, 0], earL: [0, 0.3, 0], earR: [0, -0.3, 0], legFL: [-1.0, 0, 0.05], 'legFL.t': [0, 0.35, 0], legFR: [-0.05, 0, 0] }), 'out'],
    [0.5, P({ body: [0.08, 0, 0], 'body.t': [0, -0.12, 0.12], head: [0.15, 0, 0], trunkA: [-0.3, 0, 0], trunkB: [-0.2, 0, 0], trunkC: [-0.1, 0, 0], earL: [0, 0.35, 0], earR: [0, -0.35, 0], legFL: [-0.2, 0, 0.0], 'legFL.t': [0, 0.0, 0], legFR: [-0.1, 0, 0] }), 'in'],
    [0.6, P({ body: [0.03, 0, 0], 'body.t': [0, 0.02, 0.1], head: [0.08, 0, 0], legFL: [-0.18, 0, 0], legFR: [-0.08, 0, 0] }), 'out'],
    [1.0, E0, 'io'],
  ]),
});
// trumpet: rear the head, trunk straight up, ears flared, hold the blast, settle (hit 0.50)
define('trumpet', {
  rig: 'elephant1', dur: 1.4, hit: 0.5, recover: 1.0, meta: { cls: 'other', enter: 'neutral', exit: 'neutral' },
  keys: seq([
    [0.0, E0],
    [0.3, P({ body: [-0.18, 0, 0], 'body.t': [0, 0.04, -0.1], head: [-0.7, 0, 0], trunkA: [-1.5, 0, 0], trunkB: [-1.3, 0, 0], trunkC: [-1.0, 0, 0], earL: [0, 0.7, 0], earR: [0, -0.7, 0], tail: [0.9, 0, 0], howdah: [0.1, 0, 0], legFL: [-0.25, 0, 0], legFR: [-0.25, 0, 0] }), 'out'],
    [0.5, P({ body: [-0.22, 0, 0], 'body.t': [0, 0.05, -0.12], head: [-0.85, 0, 0], trunkA: [-1.7, 0, 0], trunkB: [-1.4, 0, 0], trunkC: [-1.1, 0, 0], earL: [0, 0.8, 0], earR: [0, -0.8, 0], tail: [1.0, 0, 0], howdah: [0.12, 0, 0], legFL: [-0.3, 0, 0], legFR: [-0.3, 0, 0] }), 'io'],
    [0.95, P({ body: [-0.2, 0, 0], 'body.t': [0, 0.05, -0.1], head: [-0.8, 0, 0], trunkA: [-1.65, 0, 0], trunkB: [-1.35, 0, 0], trunkC: [-1.05, 0, 0], earL: [0, 0.75, 0], earR: [0, -0.75, 0], tail: [0.95, 0, 0], howdah: [0.1, 0, 0], legFL: [-0.28, 0, 0], legFR: [-0.28, 0, 0] }), 'lin'],
    [1.4, E0, 'io'],
  ]),
});
define('hit_front', { rig: 'elephant1', dur: 0.4, meta: { cls: 'other' }, keys: seq([[0, E0], [0.08, P({ body: [-0.05, 0, 0], 'body.t': [0, 0, -0.06], head: [-0.2, 0, 0], trunkA: [-0.4, 0, 0], earL: [0, 0.4, 0], earR: [0, -0.4, 0] }), 'out'], [0.4, E0, 'io']]) });
define('stagger', { rig: 'elephant1', dur: 0.8, meta: { cls: 'down' }, keys: seq([[0, E0], [0.2, P({ body: [-0.1, 0, 0.06], 'body.t': [0, 0, -0.15], head: [-0.3, 0.2, 0], trunkA: [-0.6, 0.2, 0], earL: [0, 0.5, 0], earR: [0, -0.5, 0], legFL: [-0.5, 0, 0], legFR: [-0.4, 0, 0], 'legFL.t': [0, 0.1, 0] }), 'out'], [0.5, P({ body: [0.06, 0, -0.05], 'body.t': [0, 0, -0.1], head: [0.1, -0.2, 0], legBL: [-0.3, 0, 0], 'legBL.t': [0, 0.08, 0] }), 'io'], [0.8, E0, 'io']]) });
define('stun', { rig: 'elephant1', dur: 1.4, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), s2 = wave(u, 2, 0.25);
  c.rot('body', 0, 0, s2 * 0.04).rot('head', 0.3 + s * 0.1, s * 0.3, s2 * 0.1).rot('trunkA', -0.2 + s * 0.3, s * 0.4, 0).rot('trunkB', 0.2 + s * 0.3, s * 0.5, 0).rot('trunkC', 0.3, s * 0.5, 0).rot('earL', 0, 0.4 + s2 * 0.2, 0).rot('earR', 0, -0.4 - s2 * 0.2, 0).rot('tail', 0.3, 0, s * 0.5);
} });
define('dizzy', { rig: 'elephant1', dur: 1.4, loop: true, meta: { cls: 'down' }, build(c, t, u) {
  const s = wave(u, 1), co = waveC(u, 1);
  c.rot('body', 0, s * 0.05, co * 0.04).rot('head', 0.3 + co * 0.1, s * 0.4, -co * 0.15).rot('trunkA', 0.2, s * 0.5, co * 0.2).rot('trunkB', 0.3, s * 0.6, co * 0.2).rot('trunkC', 0.3, s * 0.6, co * 0.2).rot('earL', 0, 0.3 + co * 0.2, 0).rot('earR', 0, -0.3 - co * 0.2, 0);
} });
define('cower', { rig: 'elephant1', dur: 1.0, loop: true, meta: { cls: 'idle' }, build(c, t, u) {
  const tr = wave(u, 6);
  c.pos('body', 0, -0.25, 0).rot('body', 0.08, 0, 0).rot('head', 0.5, 0, tr * 0.02).rot('trunkA', 0.4, 0, 0).rot('trunkB', 0.5, 0, 0).rot('trunkC', 0.6, 0, 0).rot('earL', 0, 0.7, 0).rot('earR', 0, -0.7, 0).rot('tail', -0.4, 0, 0);
  c.rot('legFL', -0.5, 0, 0.1).rot('legFR', -0.5, 0, -0.1).rot('legBL', 0.5, 0, 0.1).rot('legBR', 0.5, 0, -0.1);
  for (const l of LEGS) c.pos(l, 0, 0.25 - 2.2 * (1 - Math.cos(0.5)), 0);
} });
// death: staggers, the legs give way and it topples onto its side with the trunk flopping out (long, heavy)
const SIDE = { y: EL.hw - EL.bodyY, roll: 1.5 };
const LIE = P({ body: [0, 0.05, 0], head: [0.2, 0.3, 0.1], trunkA: [0.4, 0.4, 0.2], trunkB: [0.5, 0.4, 0.2], trunkC: [0.6, 0.3, 0.2], earL: [0, 0.2, 0.2], earR: [0, -0.5, -0.2], tail: [0.2, 0, 0.3], howdah: [0.0, 0, 0],
  legFL: [-0.3, 0, 0.35], legFR: [-0.1, 0, -0.2], legBL: [0.3, 0, 0.3], legBR: [0.2, 0, -0.25], root: SIDE });
define('death_back', {
  rig: 'elephant1', dur: 1.8, meta: { cls: 'down', enter: 'neutral', exit: 'lying' },
  keys: seq([
    [0.0, E0],
    [0.2, P({ body: [-0.1, 0, 0.03], 'body.t': [0, 0, -0.12], head: [-0.4, 0, 0], trunkA: [-1.2, 0, 0], trunkB: [-1.0, 0, 0], trunkC: [-0.8, 0, 0], earL: [0, 0.6, 0], earR: [0, -0.6, 0], tail: [0.9, 0, 0], howdah: [0.1, 0, 0], legFL: [-0.3, 0, 0.1], legFR: [-0.3, 0, -0.1] }), 'out'],
    [0.7, P({ body: [0.12, 0, 0.05], 'body.t': [0, -0.35, 0], head: [0.4, 0.2, 0], trunkA: [-0.2, 0.2, 0], trunkB: [0.2, 0.2, 0], trunkC: [0.4, 0.2, 0], earL: [0, 0.5, 0.2], earR: [0, -0.5, -0.2], legFL: [-0.7, 0, 0.45], legFR: [-0.3, 0, -0.3], legBL: [0.35, 0, 0.3], legBR: [0.6, 0, -0.3], 'legFL.t': [0, 0.2, 0], root: { y: SIDE.y - 0.1, roll: 1.1 } }), 'in2'],
    [1.0, P({ body: [0.04, 0.05, 0], head: [0.25, 0.3, 0.1], trunkA: [0.3, 0.4, 0.2], trunkB: [0.4, 0.4, 0.2], trunkC: [0.5, 0.3, 0.2], earL: [0, 0.3, 0.2], earR: [0, -0.5, -0.2], legFL: [-0.4, 0, 0.4], legFR: [-0.1, 0, -0.2], legBL: [0.35, 0, 0.3], legBR: [0.2, 0, -0.25], root: { y: SIDE.y + 0.12, roll: 1.42 } }), 'out'],
    [1.2, P({ body: [0, 0.05, 0], head: [0.2, 0.3, 0.1], trunkA: [0.4, 0.4, 0.2], trunkB: [0.5, 0.4, 0.2], trunkC: [0.6, 0.3, 0.2], earL: [0, 0.2, 0.2], earR: [0, -0.5, -0.2], legFL: [-0.3, 0, 0.35], legFR: [-0.1, 0, -0.2], legBL: [0.3, 0, 0.3], legBR: [0.2, 0, -0.25], root: SIDE }), 'in2'],
    [1.8, LIE, 'out'],
  ]),
});
