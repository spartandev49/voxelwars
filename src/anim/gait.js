// Procedural gait generators for authored locomotion clips (pure). Legs are solved with a planar two-bone IK so that planted feet
// move back exactly at the clip's speedRef (no foot slide at rate = speed / speedRef) and the rigid hum1 foot never digs into the ground.
//
// Units here are VOXELS (1 voxel = 0.1 world unit) for geometry; angles in radians. hum1: thigh 5, shin 5, foot 2 high (legLL grid 4x5x6, pivot (2,5,2)): heel 2 behind
// the ankle pivot, toe 4 in front.
import { clamp } from './dsl.js';

const PI = Math.PI, TAU = Math.PI * 2;
export const THIGH = 5, SHIN = 5, TOE = 4, HEEL = 2;
export const MAX_FLEX = 2.72;

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
  const flex = Math.min(Math.acos(clamp(cosFlex, -1, 1)), MAX_FLEX);        // the knee stops at ~156 degrees: a sprint's heel kick never folds the leg further
  const psi = Math.atan2(dz, -dy);                                // forward angle of hip->ankle vector from straight down
  const beta = Math.atan2(b * Math.sin(flex), a + b * Math.cos(flex));
  const phi1 = psi + beta;                                        // thigh forward angle (knee bends backward)
  out[0] = -phi1; out[1] = flex;
  return out;
}

/** extra ankle height needed so that neither toe nor heel goes below the sole line for a total foot pitch (rx thigh+knee) */
export function footLift(rxTotal, tol = 0) {
  const s = Math.sin(rxTotal);
  return Math.max(0, TOE * s - tol, -HEEL * s - tol);
}

const _ik = [0, 0];
/**
 * Solve one leg for a foot at hip-relative position (z, liftY above ground) with the hip `h` voxels above the ground.
 * Ground contact: the foot is lifted by footLift so the sole never penetrates. Writes [thighRx, kneeRx] into out.
 */
export function solveLeg(z, ankleY, h, out, tol = 0.3) {
  legIK(z, ankleY - h, _ik);
  let lift = 0;
  for (let i = 0; i < 6; i++) {                       // fixed point: the lift changes the pitch, the pitch changes the lift
    const need = footLift(_ik[0] + _ik[1], tol);
    if (Math.abs(need - lift) < 0.02) break;
    lift = need;
    legIK(z, ankleY + lift - h, _ik);
  }
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

// ---------------------------------------------------------------------------------------------------------------- biped roll-over gait
// Stance is a REAL roll-over: the foot lands on its strike vertex (heel; mid-foot for runs), rolls flat while the hip passes over it, then pivots on the toe.
// The vertex that is on the ground stays at the same world position for as long as it is the contact (zero slide by construction, the hip travels at
// exactly the clip's speed). The foot is rigid with the shin (hum1 has no ankle joint), so its pitch is whatever the leg angles give: a fixed-point loop
// places the ANKLE so that the contact vertex sits on the ground at its planted position for that pitch. The hip height follows from reach: the legs are
// 10 voxels long and cannot plant a foot far from under the hip while the pelvis is high, so the pelvis dips as the feet spread (the natural walking bounce).
const MID_Z = 1;                    // sole mid point, voxels ahead of the ankle (heel -2 .. toe +4)
const LMAX = 9.9;                   // usable leg length (voxels): the IK clamps at 9.995
const _ik2 = [0, 0], _st = [0, 0, 0], _sw = [0, 0, 0], _tg = [0, 0, 0];

/**
 * Ankle placement for a stance foot at stance progress s (0 = landing, 1 = lift-off) with the hip h voxels above the ground and the body leaning by
 * `lean`. Writes out = [ankle z relative to the hip (world frame), ankle height above the ground, world foot pitch].
 */
function stanceAnkle(s, P, e, h, lean, out) {
  const v1 = P.strike === 'mid' ? MID_Z : -HEEL, first = s < 0.5, oz = first ? v1 : TOE;
  const Vz = oz + 0.5 * e - e * s;                                   // contact vertex, hip-relative: flat under the hip at s = 0.5, then travels back at the ground speed
  const cl = Math.cos(lean), sl = Math.sin(lean);
  let psi = 0, Az = 0, a = 0;
  for (let it = 0; it < 8; it++) {
    Az = Vz - oz * Math.cos(psi);
    a = oz * Math.sin(psi); if (a < 0) a = 0;                          // the contact vertex is the lowest point of the sole
    legIK(-(a - h) * sl + Az * cl, (a - h) * cl + Az * sl, _ik2);       // world target -> model frame (the whole model leans)
    const pn = _ik2[0] + _ik2[1] + lean;
    if (Math.abs(pn - psi) < 1e-4) { psi = pn; break; }
    psi = pn;
  }
  out[0] = Az; out[1] = a; out[2] = psi;
  return out;
}
const smin = (a, b, k) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k)); };   // soft minimum (no kinks)

/** foot targets per leg and the resulting hip height for gait phases phL / phR */
function planLegs(phL, phR, P, e, lean) {
  const duty = P.duty, nominal = P.h0;
  const wS = (ph) => (ph < duty ? Math.sqrt(Math.sin(PI * ph / duty)) : 0);
  const fly = P.fly ? P.fly * (1 - Math.max(wS(phL), wS(phR))) : 0;
  let h = nominal + fly;
  for (let it = 0; it < 4; it++) {
    let hl = 1e9;
    for (const ph of [phL, phR]) {
      if (ph >= duty) continue;
      stanceAnkle(ph / duty, P, e, h, lean, _st);
      const lim = _st[1] + Math.sqrt(Math.max(1, LMAX * LMAX - _st[0] * _st[0]));
      hl = smin(hl, lim, 0.35);
    }
    h = hl < 1e8 ? smin(nominal + fly, hl, 0.35) : nominal + fly;
  }
  return h;
}
function placeLeg(ph, P, e, h, lean, out) {
  // out = [thigh rx, knee rx, world foot pitch]
  const duty = P.duty;
  if (ph < duty) {
    stanceAnkle(ph / duty, P, e, h, lean, _st);
    ankleToLeg(_st[0], _st[1], h, lean, out);
    return out;
  }
  // swing: from the lift-off ankle to the next landing ankle, lifted for clearance (toe and heel never below the ground)
  const x = (ph - duty) / (1 - duty);
  stanceAnkle(1, P, e, h, lean, _sw); stanceAnkle(0, P, e, h, lean, _tg);
  const w = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.6) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.6);
  const z = _sw[0] + (_tg[0] - _sw[0]) * w;
  const sx = x * x * (3 - 2 * x);
  const bump = Math.sin(PI * Math.pow(x, 0.85 + ((P.swingBias === undefined ? 0.5 : P.swingBias) - 0.5)));
  let a = _sw[1] + (_tg[1] - _sw[1]) * sx + P.lift * Math.pow(Math.max(0, bump), 0.9);
  ankleToLeg(z, a, h, lean, out);
  for (let i = 0; i < 6; i++) {                                         // clearance: the foot pitch changes the toe / heel height
    const need = footLift(out[2], 0.3);
    const a2 = Math.max(a, need);
    if (a2 <= a + 0.02) break;
    a = a2; ankleToLeg(z, a, h, lean, out);
  }
  return out;
}
function ankleToLeg(Az, a, h, lean, out) {
  const cl = Math.cos(lean), sl = Math.sin(lean);
  legIK(-(a - h) * sl + Az * cl, (a - h) * cl + Az * sl, _ik2);
  out[0] = _ik2[0]; out[1] = _ik2[1]; out[2] = _ik2[0] + _ik2[1] + lean;
}

/**
 * Biped locomotion cycle. params:
 *   D (s cycle), speed (u/s ground speed this clip is designed for), duty (0.62 walk, ~0.35 run), h0 (highest pelvis, voxels; dips follow from reach),
 *   fly (extra pelvis rise while both feet are airborne), strike ('heel' | 'mid'), lift (swing clearance), lean (body pitch), armSwing, armBend (elbow
 *   flex), twist (torso counter rotation), sway (hip lateral shift, voxels), headStab (0..1 head counter rotation), rollAmt
 * Fills the frame context `c` at normalised time u.
 */
export function bipedFrame(c, u, P) {
  const e = P.speed * P.D * P.duty * 10;                 // stance excursion in voxels (speed u/s * time on ground * 10 vox/u)
  const lean = P.lean || 0;
  const phL = ((u + (P.phase || 0)) % 1 + 1) % 1, phR = (phL + 0.5) % 1;
  const h = planLegs(phL, phR, P, e, lean);
  placeLeg(phL, P, e, h, lean, _lgL); placeLeg(phR, P, e, h, lean, _lgR);
  c.rot('legUL', _lgL[0], P.toeOut ? 0.04 : 0, P.legRoll || 0).rot('legLL', _lgL[1], 0, 0);
  c.rot('legUR', _lgR[0], P.toeOut ? -0.04 : 0, -(P.legRoll || 0)).rot('legLR', _lgR[1], 0, 0);
  const swingL = Math.sin(TAU * (u + (P.phase || 0)) + P.armPhase);   // arm swing counter to the leg
  const dy = (h - 10) * 0.1;                                          // hip height offset in world units (10 vox = 1 u leg)
  c.rootSet('y', dy + (P.rootY || 0));
  // lateral sway over the stance foot
  const sw = Math.sin(TAU * (u + (P.phase || 0)) + (P.swayPhase || 0));
  c.rootSet('x', -sw * (P.sway || 0) * 0.1);
  c.rootSet('roll', sw * (P.rollAmt || 0));
  c.rootSet('pitch', lean);
  // torso counter-twist, head stabilisation
  const tw = Math.sin(TAU * (u + (P.phase || 0)) + (P.twistPhase || 0)) * (P.twist || 0);
  c.rot('body', P.bodyRx || 0, tw, -sw * (P.bodyRoll || 0));
  c.rot('head', -lean * (P.headStab === undefined ? 0.8 : P.headStab) + (P.headRx || 0), -tw * 0.7, sw * (P.bodyRoll || 0) * 0.8);
  // arms: opposite to legs
  const A = P.armSwing || 0, B = P.armBend || 0;
  const aL = swingL * A, aR = -swingL * A;
  c.rot('armUL', aL * -1 + (P.armRx || 0), 0, P.armOut || 0.08).rot('armLL', -(B + Math.max(0, -aL) * (P.armBendSwing || 0)), 0, 0);
  c.rot('armUR', aR * -1 + (P.armRx || 0), 0, -(P.armOut || 0.08)).rot('armLR', -(B + Math.max(0, -aR) * (P.armBendSwing || 0)), 0, 0);
}
const _lgL = [0, 0, 0], _lgR = [0, 0, 0];

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
/**
 * Rigid-leg planting (quadrupeds, birds, elephants). A leg is ONE rigid part (length L from its pivot to the sole), so the sole can only be put on a
 * target by turning the leg AND sliding its pivot along the leg (the pivot is buried inside the body, so the slide never shows). The body bobs by `by`
 * and pitches by `p` about its belly pivot (bodyY above the ground), the leg pivot sits hipY above that pivot and zLeg along the body; the target
 * `ft` = [z, y] is where the sole should be in the unit frame relative to the leg's rest position (ground contact in stance, lifted in swing):
 *   leg direction phi (forward angle) = atan2(dz, -dy) to the target, rx = -phi - p (relative to the body), pivot slide delta = d - L along it,
 *   in the body frame: ty = -delta * cos(phi + p), tz = delta * sin(phi + p). A planted sole therefore stays exactly where it landed: no foot slide.
 * Writes out = [rx, ty, tz].
 */
export function plantRigidLeg(bodyY, hipY, L, zLeg, by, p, ft, out) {
  const sn = Math.sin(p), cs = Math.cos(p);
  const hy = bodyY + by + hipY * cs - zLeg * sn, hz = hipY * sn + zLeg * cs;          // hip in the unit frame
  const dz = zLeg + ft[0] - hz, dy = ft[1] - hy, d = Math.hypot(dz, dy), phi = Math.atan2(dz, -dy), delta = d - L;
  out[0] = -phi - p; out[1] = -delta * Math.cos(phi + p); out[2] = delta * Math.sin(phi + p);
  return out;
}
export { TAU as _TAU, PI as _PI };
