// hum1 locomotion + stances: authored fallbacks (idle, idle_combat, walk, run, rout, block_hold, sit) and the sleeping/sitting extras.
// Gaits come from the IK generator in ../gait.js, so planted feet move back at exactly speedRef (A4: no foot slide).
import { define, seq, wave, waveC } from '../dsl.js';
import { bipedFrame } from '../gait.js';
import { arm, leg, crouch, merge } from './poses.js';

const PI = Math.PI;

// ---- idle: breathing, weight shift, slow look-around -------------------------------------------------------------
define('idle', {
  rig: 'hum1', dur: 2.4, loop: true, meta: { cls: 'idle' },
  build(c, t, u) {
    const br = wave(u, 1), sh = wave(u, 1, 0.25), look = wave(u, 1, 0.1);
    c.rot('body', 0.02 + br * 0.012, sh * 0.03, sh * 0.02).rot('head', -0.02 - br * 0.01, look * 0.28, -sh * 0.03);
    c.rot('armUL', 0.05 + br * 0.02, 0, 0.1 + br * 0.015).rot('armLL', -0.28 - br * 0.02, 0, 0);
    c.rot('armUR', 0.05 - br * 0.02, 0, -0.1 - br * 0.015).rot('armLR', -0.28 + br * 0.02, 0, 0);
    c.rot('legUL', -0.04 + sh * 0.03, 0, 0.05 + sh * 0.03).rot('legLL', 0.06, 0, 0).rot('legUR', -0.02 - sh * 0.03, 0, -0.05 + sh * 0.03).rot('legLR', 0.05, 0, 0);
    c.rootSet('y', -0.01 + br * 0.004).rootSet('x', sh * 0.012).rootSet('roll', sh * 0.012);
  },
});

// ---- idle_combat: guarded ready stance with a small bounce ----------------------------------------------------------
define('idle_combat', {
  rig: 'hum1', dur: 1.6, loop: true, meta: { cls: 'ready' },
  build(c, t, u) {
    const b = waveC(u, 2), sh = wave(u, 1), br = wave(u, 1, 0.2);
    const cr = crouch(0.42, 0.1);
    c.rot('body', 0.14 + b * 0.01, -0.22 + sh * 0.025, 0).rot('head', -0.12, 0.2 - sh * 0.03, 0);
    c.rot('armUR', -0.55 + br * 0.03, 0.18, -0.3).rot('armLR', -1.15, 0, 0);          // weapon arm cocked at the hip
    c.rot('armUL', -0.5 + br * 0.02, -0.15, 0.22).rot('armLL', -1.25, 0, 0);          // shield arm forward
    c.rot('legUL', -0.35 + sh * 0.03, 0.3, 0.16).rot('legLL', 0.6, 0, 0);
    c.rot('legUR', 0.25 - sh * 0.03, 0.3, -0.18).rot('legLR', 0.42, 0, 0);
    c.rootSet('y', -0.06 + b * 0.008).rootSet('x', sh * 0.015).rootSet('pitch', 0.02);
  },
});

// ---- walk / jog / run (IK gaits, driven by distance travelled: feet never slide) -----------------------------------------------
const WALK = { D: 0.8, speed: 2.4, duty: 0.62, h0: 9.25, bob: 0.5, lift: 1.2, lean: 0.05, armSwing: 0.55, armBend: 0.3, armPhase: 0, twist: 0.09, twistPhase: PI, sway: 0.55, swayPhase: 0, rollAmt: 0.025, bodyRoll: 0.03, armOut: 0.1, headStab: 0.9, bodyRx: 0.02 };
define('walk', { rig: 'hum1', dur: WALK.D, loop: true, speedRef: WALK.speed, meta: { cls: 'move' }, build(c, t, u) { bipedFrame(c, u, WALK); } });
const JOG = { D: 0.68, speed: 3.8, duty: 0.5, flight: false, h0: 9.0, bob: 0.7, lift: 2.2, lean: 0.12, armSwing: 0.8, armBend: 0.9, armBendSwing: 0.1, armPhase: 0, twist: 0.15, twistPhase: PI, sway: 0.45, swayPhase: 0, rollAmt: 0.02, bodyRoll: 0.035, armOut: 0.12, headStab: 0.9, bodyRx: 0.05 };
define('jog', { rig: 'hum1', dur: JOG.D, loop: true, speedRef: JOG.speed, meta: { cls: 'move' }, build(c, t, u) { bipedFrame(c, u, JOG); } });
const RUN = { D: 0.64, speed: 5.6, duty: 0.35, flight: true, h0: 8.7, bob: 1.1, lift: 3.2, lean: 0.2, armSwing: 1.0, armBend: 1.3, armBendSwing: 0.2, armPhase: 0, twist: 0.2, twistPhase: PI, sway: 0.4, swayPhase: 0, rollAmt: 0.02, bodyRoll: 0.04, armOut: 0.15, headStab: 0.9, bodyRx: 0.08 };
define('run', { rig: 'hum1', dur: RUN.D, loop: true, speedRef: RUN.speed, meta: { cls: 'move' }, build(c, t, u) { bipedFrame(c, u, RUN); } });
const ROUT = { D: 0.5, speed: 5.0, duty: 0.34, flight: true, h0: 8.6, bob: 1.2, lift: 3.4, lean: 0.1, armSwing: 0.5, armBend: 0.5, armPhase: 0, twist: 0.28, twistPhase: PI, sway: 0.5, swayPhase: 0, rollAmt: 0.03, bodyRoll: 0.06, armOut: 0.5, headStab: 0.3, armRx: 0.0 };
define('rout', {
  rig: 'hum1', dur: ROUT.D, loop: true, speedRef: ROUT.speed, meta: { cls: 'move' },
  build(c, t, u) {
    bipedFrame(c, u, ROUT);
    // panic: arms thrown up and flapping, head whipping back over the shoulder
    const f = wave(u, 1), f2 = wave(u, 2, 0.25);
    c.rot('armUL', -1.9 + f2 * 0.35, -0.3, 0.55 + f * 0.2).rot('armLL', -0.5 + f * 0.4, 0, 0);
    c.rot('armUR', -1.75 - f2 * 0.35, 0.3, -0.55 - f * 0.2).rot('armLR', -0.5 - f * 0.4, 0, 0);
    c.rot('head', -0.35 + f2 * 0.08, 0.9 * wave(u, 0.5, 0), 0.12 * f);
    c.rootAdd('pitch', 0.08 * f2);
  },
});

// ---- block_hold: shield up, weapon back, braced --------------------------------------------------------------------------
define('block_hold', {
  rig: 'hum1', dur: 1.0, loop: true, meta: { cls: 'ready' },
  build(c, t, u) {
    const br = wave(u, 1), sh = wave(u, 2, 0.1);
    const cr = crouch(0.5, 0.12);
    c.rot('body', 0.1, -0.28 + br * 0.01, 0).rot('head', -0.06, 0.25, 0);
    c.rot('armUL', -1.15 + sh * 0.015, -0.1, 0.12).rot('armLL', -1.45, 0, 0);          // shield raised in front of the face
    c.rot('armUR', -0.35, 0.1, -0.35).rot('armLR', -1.25, 0, 0);
    c.rot('legUL', -0.5, 0.35, 0.18).rot('legLL', 0.75, 0, 0).rot('legUR', 0.3, 0.35, -0.2).rot('legLR', 0.5, 0, 0);
    c.rootSet('y', -0.09 + br * 0.004).rootSet('pitch', 0.03);
  },
});

// ---- sit (throne): hips drop 4.5 voxels, thighs forward; used by the throne gag ---------------------------------------------
define('sit', {
  rig: 'hum1', dur: 1.5, loop: true, meta: { cls: 'idle', pivotNote: 'seat height 0.45 u below standing hip' },
  build(c, t, u) {
    const br = wave(u, 1), nod = wave(u, 1, 0.3);
    c.rot('legUL', -1.5, 0.05, 0.1).rot('legLL', 1.5, 0, 0).rot('legUR', -1.5, -0.05, -0.1).rot('legLR', 1.5, 0, 0);
    c.rot('body', -0.03 + br * 0.012, nod * 0.04, 0).rot('head', 0.03 - br * 0.01, nod * 0.2, 0);
    c.rot('armUL', -0.45, 0, 0.12).rot('armLL', -1.0, 0, 0).rot('armUR', -0.45, 0, -0.12).rot('armLR', -1.0, 0, 0);
    c.rootSet('y', -0.465 + br * 0.003);
  },
});
