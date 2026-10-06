// Listener + distance/pan maths (pure). Conventions follow spec section 1: a thing with heading h faces (sin h, 0, cos h);
// its left is (cos h, 0, -sin h), so its right is (-cos h, 0, sin h).
import { clamp, finite } from './util.js';

export const SPATIAL = {
  rolloff: 1.4,          // gain = 1 / (1 + (d/ref)^rolloff)
  panDist: 25,           // lateral metres for full pan
  cutHigh: 18000, cutLow: 2500,   // far low-pass range
  heightWeight: 0.35,    // how much of the camera's height above the sound counts as distance
  heightMax: 40,
  panMax: 0.9,
};

export class Listener {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.cos = 1; this.sin = 0; }
  set(x, y, z, yaw) {
    this.x = finite(x); this.y = finite(y); this.z = finite(z); this.yaw = finite(yaw);
    this.cos = Math.cos(this.yaw); this.sin = Math.sin(this.yaw);
    return this;
  }
}

export const distanceGain = (d, ref) => 1 / (1 + Math.pow(d / ref, SPATIAL.rolloff));
export const farCutoff = (d, maxDist) => {
  const t = clamp(d / maxDist, 0, 1);
  return SPATIAL.cutHigh * Math.pow(SPATIAL.cutLow / SPATIAL.cutHigh, Math.pow(t, 0.8));
};

/**
 * Fill `out` {dist, gain, pan, cutoff, near, cull} for a sound at (x,y,z). Allocation-free.
 * near is 1 inside `ref` and falls linearly to 0 at `maxDist` (used for priority scaling).
 */
export function spatialize(L, x, y, z, ref, maxDist, out) {
  const dx = x - L.x, dz = z - L.z;
  let dy = (y === undefined ? 0 : Math.abs(y - L.y)); if (dy > SPATIAL.heightMax) dy = SPATIAL.heightMax; dy *= SPATIAL.heightWeight;
  const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
  out.dist = d;
  out.cull = d > maxDist;
  out.gain = distanceGain(d, ref);
  const lateral = -dx * L.cos + dz * L.sin;
  out.pan = clamp(lateral / SPATIAL.panDist, -1, 1) * SPATIAL.panMax;
  out.cutoff = farCutoff(d, maxDist);
  out.near = d <= ref ? 1 : clamp(1 - (d - ref) / Math.max(1e-6, maxDist - ref), 0, 1);
  return out;
}
