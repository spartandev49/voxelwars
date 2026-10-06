// Small pure math helpers for the retargeter and the rig FK (no deps).
// Conventions: right-handed, +Y up. Quaternion = [x,y,z,w]. 3x3 matrices are row-major arrays of 9.
// Euler order "YXZ" == localRot = Ry(ry) * Rx(rx) * Rz(rz)   (identical to three.js Euler order 'YXZ').

export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

export const Q = {
  ident: () => [0, 0, 0, 1],
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  conj: a => [-a[0], -a[1], -a[2], a[3]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1; return [a[0] / l, a[1] / l, a[2] / l, a[3] / l]; },
  rot: (q, v) => {
    const u = [q[0], q[1], q[2]], s = q[3];
    const c1 = V.cross(u, v), c2 = V.cross(u, c1);
    return [v[0] + 2 * (s * c1[0] + c2[0]), v[1] + 2 * (s * c1[1] + c2[1]), v[2] + 2 * (s * c1[2] + c2[2])];
  },
  axisAngle: (axis, ang) => { const a = V.norm(axis), s = Math.sin(ang / 2); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(ang / 2)]; },
  /** minimal rotation taking unit vector a to unit vector b */
  minRot: (a, b) => {
    a = V.norm(a); b = V.norm(b);
    const d = V.dot(a, b);
    if (d > 0.999999) return [0, 0, 0, 1];
    if (d < -0.999999) { // 180 degrees: pick any perpendicular axis
      let ax = V.cross([1, 0, 0], a); if (V.len(ax) < 1e-6) ax = V.cross([0, 0, 1], a);
      return Q.axisAngle(ax, Math.PI);
    }
    const c = V.cross(a, b);
    return Q.norm([c[0], c[1], c[2], 1 + d]);
  },
  toMat: q => {
    const [x, y, z, w] = q;
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
            2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
            2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  },
  fromMat: m => {
    const tr = m[0] + m[4] + m[8]; let q;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, 0.25 * s]; }
    else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; q = [0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s]; }
    else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; q = [(m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s, (m[2] - m[6]) / s]; }
    else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s, (m[3] - m[1]) / s]; }
    return Q.norm(q);
  },
  /** angle (radians, 0..pi) between two rotations */
  angle: (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))),
};

export const Mx = { // 3x3 row-major
  mulV: (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]],
  mul: (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  },
  T: m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
};

const TAU = Math.PI * 2;
export const wrapPi = a => a - TAU * Math.round(a / TAU);

/** Euler YXZ -> quaternion:  Ry(ry) * Rx(rx) * Rz(rz) */
export function eulerToQuat(rx, ry, rz) {
  const qy = Q.axisAngle([0, 1, 0], ry), qx = Q.axisAngle([1, 0, 0], rx), qz = Q.axisAngle([0, 0, 1], rz);
  return Q.mul(Q.mul(qy, qx), qz);
}

/** Primary Euler YXZ solution [rx,ry,rz] of a rotation matrix (three.js algorithm). */
export function matToEulerYXZ(m) {
  const m23 = m[5]; // row 1, col 2
  const rx = Math.asin(-Math.max(-1, Math.min(1, m23)));
  let ry, rz;
  if (Math.abs(m23) < 0.9999999) { ry = Math.atan2(m[2], m[8]); rz = Math.atan2(m[3], m[4]); }
  else { ry = Math.atan2(-m[6], m[0]); rz = 0; }
  return [rx, ry, rz];
}

/** All equivalent Euler triples near `ref` (or near the principal range if no ref). Returns candidates sorted best-first. */
export function eulerCandidates(q, ref) {
  const m = Q.toMat(q), e = matToEulerYXZ(m);
  const alt = [Math.PI - e[0], e[1] + Math.PI, e[2] + Math.PI];
  const out = [];
  for (const base of [e, alt]) {
    const t = base.map((v, i) => ref ? ref[i] + wrapPi(v - ref[i]) : wrapPi(v));
    // x is only well-defined modulo 2pi too
    out.push(t);
  }
  const cost = t => ref ? t.reduce((s, v, i) => s + (v - ref[i]) ** 2, 0) : (Math.abs(t[0]) * 4 + Math.abs(t[1]) + Math.abs(t[2]));
  out.sort((a, b) => cost(a) - cost(b));
  return out;
}

/**
 * Convert a sequence of rotations (quaternions) to a continuous sequence of Euler YXZ triples.
 * Picks, per frame, the equivalent triple (and 2*pi branch) closest to the previous frame, so there are never 2*pi jumps.
 */
export function unwrapEulerSeq(quats) {
  const out = []; let ref = null;
  for (const q of quats) {
    const c = eulerCandidates(q, ref)[0];
    out.push(c); ref = c;
  }
  return out;
}
