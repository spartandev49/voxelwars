// Procedural gait generators for authored locomotion clips (pure). Legs are solved with a planar two-bone IK so that planted feet
// move back exactly at the clip's speedRef (no foot slide at rate = speed / speedRef) and the rigid hum1 foot never digs into the ground.
//
// Units here are VOXELS (1 voxel = 0.1 world unit) for geometry; angles in radians. hum1: thigh 5, shin 5, foot 2 high, heel 2 behind
// the ankle pivot, toe 3 in front (legLL grid 4x5x6, pivot (2,5,2)).
import { clamp } from './dsl.js';

const PI = Math.PI, TAU = Math.PI * 2;
export const THIGH = 5, SHIN = 5, TOE = 3, HEEL = 2;

/**
 * Planar 2-bone IK. Target = sole point (bottom of the shin) relative to the hip pivot: dz forward, dy up (negative below the hip).
 * Returns [thighRx, kneeRx] (VoxSkin convention: forward swing = negative rx, knee flexion = positive rx).
 */
export function legIK(dz, dy, out, a = THIGH, b = SHIN) {
  let d = Math.hypot(dz, dy);
  const dmax = (a + b) * 0.9995, dmin = Math.abs(a - b) + 0.05;
  if (d > dmax) { dz *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) d = dmin;
  const cosFlex = (d * d - a * a - b * b) / (2 * a * b);          // angle between thigh and shin vectors (flex = PI - interior)
  const flex = Math.acos(clamp(cosFlex, -1, 1));
  const psi = Math.atan2(dz, -dy);                                // forward angle of hip->ankle vector from straight down
  const beta = Math.atan2(b * Math.sin(flex), a + b * Math.cos(flex));
  const phi1 = psi + beta;                                        // thigh forward angle (knee bends backward)
  out[0] = -phi1; out[1] = flex;
  return out;
}

/** extra ankle height needed so that neither toe nor heel goes below the sole line for a total foot pitch (rx thigh+knee) */
export function footLift(rxTotal) {
  const s = Math.sin(rxTotal);
  return Math.max(0, TOE * s, -HEEL * s);
}

const _ik = [0, 0];
/**
 * Solve one leg for a foot at hip-relative position (z, liftY above ground) with the hip `h` voxels above the ground.
 * Ground contact: the foot is lifted by footLift so the sole never penetrates. Writes [thighRx, kneeRx] into out.
 */
export function solveLeg(z, ankleY, h, out) {
  legIK(z, ankleY - h, _ik);
  let lift = footLift(_ik[0] + _ik[1]);
  if (lift > 0) { legIK(z, ankleY + lift - h, _ik); const l2 = footLift(_ik[0] + _ik[1]); if (l2 > lift) legIK(z, ankleY + l2 - h, _ik); }
  out[0] = _ik[0]; out[1] = _ik[1];
  return out;
}

const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Hip-relative foot path for one foot at gait phase ph (0..1, 0 = heel strike).
 * stance (ph < duty): foot moves back linearly at the ground speed; swing: smooth forward with lift.
 * e = stance excursion (voxels), lift = swing clearance (voxels), flight = true for runs (airborne between stances)
 */
export function footPath(ph, duty, e, lift, out, swingBias = 0.5) {
  if (ph < duty) { const k = ph / duty; out[0] = e * 0.5 - e * k; out[1] = 0; return out; }
  const x = (ph - duty) / (1 - duty);
  // forward travel eased (accelerate then brake), lift peaks around swingBias
  const z0 = -e * 0.5, z1 = e * 0.5;
  const w = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.6) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.6);
  out[0] = z0 + (z1 - z0) * w;
  const bump = Math.sin(PI * Math.pow(x, 0.85 + (swingBias - 0.5)));
  out[1] = lift * Math.pow(Math.max(0, bump), 0.9);
  return out;
}

/**
 * Biped locomotion cycle. params:
 *   D (s cycle), speed (u/s ground speed this clip is designed for), duty (0.62 walk, ~0.38 run), h0/bob (hip height & bounce, voxels),
 *   lift (foot clearance), lean (body pitch), armSwing, armBend (elbow flex), twist (torso counter rotation), sway (hip lateral shift, voxels),
 *   headStab (0..1 head counter rotation), rollAmt
 * Fills the frame context `c` at normalised time u.
 */
export function bipedFrame(c, u, P) {
  const e = P.speed * P.D * P.duty * 10;                 // stance excursion in voxels (speed u/s * time on ground * 10 vox/u)
  const phL = ((u + (P.phase || 0)) % 1 + 1) % 1, phR = (phL + 0.5) % 1;
  const fp = _fpL, fq = _fpR;
  // hip height: walk = high at mid-stance, low in double support; run = low at mid-stance (spring compression), high in flight
  const midStance = (ph) => (ph < P.duty ? Math.sin(PI * ph / P.duty) : 0);
  const stanceL = midStance(phL), stanceR = midStance(phR);
  const peak = Math.max(stanceL, stanceR);
  const h = P.flight ? P.h0 - P.bob * peak + P.bob * 0.5 : P.h0 + P.bob * peak;
  footPath(phL, P.duty, e, P.lift, fp);
  footPath(phR, P.duty, e, P.lift, fq);
  // foot pitch bias: during stance a bit of toe-off lift near the end
  solveLeg(fp[0], fp[1], h, _lg); const lUL = _lg[0], lLL = _lg[1];
  solveLeg(fq[0], fq[1], h, _lg); const lUR = _lg[0], lLR = _lg[1];
  c.rot('legUL', lUL, P.toeOut ? 0.04 : 0, P.legRoll || 0).rot('legLL', lLL, 0, 0);
  c.rot('legUR', lUR, P.toeOut ? -0.04 : 0, -(P.legRoll || 0)).rot('legLR', lLR, 0, 0);
  const swingL = Math.sin(TAU * (u + (P.phase || 0)) + P.armPhase);   // arm swing counter to the leg
  const dy = (h - 10) * 0.1;                                          // hip height offset in world units (10 vox = 1 u leg)
  c.rootSet('y', dy + (P.rootY || 0));
  // lateral sway over the stance foot
  const sw = Math.sin(TAU * (u + (P.phase || 0)) + (P.swayPhase || 0));
  c.rootSet('x', -sw * (P.sway || 0) * 0.1);
  c.rootSet('roll', sw * (P.rollAmt || 0));
  c.rootSet('pitch', P.lean || 0);
  // torso counter-twist, head stabilisation
  const tw = Math.sin(TAU * (u + (P.phase || 0)) + (P.twistPhase || 0)) * (P.twist || 0);
  c.rot('body', P.bodyRx || 0, tw, -sw * (P.bodyRoll || 0));
  c.rot('head', -(P.lean || 0) * (P.headStab === undefined ? 0.8 : P.headStab) + (P.headRx || 0), -tw * 0.7, sw * (P.bodyRoll || 0) * 0.8);
  // arms: opposite to legs
  const A = P.armSwing || 0, B = P.armBend || 0;
  const aL = swingL * A, aR = -swingL * A;
  c.rot('armUL', aL * -1 + (P.armRx || 0), 0, P.armOut || 0.08).rot('armLL', -(B + Math.max(0, -aL) * (P.armBendSwing || 0)), 0, 0);
  c.rot('armUR', aR * -1 + (P.armRx || 0), 0, -(P.armOut || 0.08)).rot('armLR', -(B + Math.max(0, -aR) * (P.armBendSwing || 0)), 0, 0);
}
const _fpL = [0, 0], _fpR = [0, 0], _lg = [0, 0];

/** measured speedRef of a generated gait (u/s): by construction speed */
export const designSpeed = (P) => P.speed;

// ---------------------------------------------------------------------------------------------------------------- quadruped gaits
/**
 * Generic quadruped leg cycle. Legs are single rigid parts hanging from the pivot, so a "lifted" foot is faked with a translation up
 * and a forward swing. Returns per-leg [rx, lift] for gait phase u and leg phase offset `po`.
 *   swing amplitude A (rad), stance duty, lift height (world u)
 */
export function quadLeg(u, po, A, duty, lift, out) {
  const ph = (((u + po) % 1) + 1) % 1;
  if (ph < duty) { const k = ph / duty; out[0] = -A * (1 - 2 * k) * 0.9 + 0 ; out[1] = 0; }       // stance: foot moves from forward (-rx) to back (+rx)
  else {
    const x = (ph - duty) / (1 - duty);
    const w = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.7) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.7);
    out[0] = A * 0.9 - 2 * A * 0.9 * w;                                                          // swing: back -> forward
    out[1] = lift * Math.sin(PI * Math.pow(x, 0.9));
  }
  return out;
}
export { TAU as _TAU, PI as _PI };
