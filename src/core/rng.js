// Deterministic RNG + noise. Everything that affects gameplay or arena shape draws from a seeded RNG
// so battles, arenas and tests are reproducible.

export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) { this.s = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0 || 0x9e3779b9; }
  /** mulberry32 */
  next() {
    let t = (this.s += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** Gaussian-ish (sum of 3 uniforms) in [-1,1] */
  gauss() { return (this.next() + this.next() + this.next()) / 1.5 - 1; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  fork(label = '') { return new RNG((this.s ^ hashString(String(label))) >>> 0); }
}

/** Process-wide non-deterministic helper for cosmetic effects (particles, jitter) so they never perturb the sim RNG. */
export const fxRand = new RNG((Math.random() * 4294967296) >>> 0);

// ---- 2D gradient noise ----
function makePerm(seed) {
  const r = new RNG(seed), p = new Uint8Array(512), a = new Uint8Array(256);
  for (let i = 0; i < 256; i++) a[i] = i;
  r.shuffle(a);
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  return p;
}
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

export class Noise2D {
  constructor(seed = 1) { this.p = makePerm(seed); }
  /** gradient noise in about [-1,1] */
  noise(x, y) {
    const p = this.p;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const g = (h, dx, dy) => { const v = GRAD[h & 7]; return v[0] * dx + v[1] * dy; };
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const u = fade(xf), v = fade(yf);
    const x1 = g(aa, xf, yf) * (1 - u) + g(ba, xf - 1, yf) * u;
    const x2 = g(ab, xf, yf - 1) * (1 - u) + g(bb, xf - 1, yf - 1) * u;
    return (x1 * (1 - v) + x2 * v) * 1.4142;
  }
  fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += amp * this.noise(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
    return sum / norm;
  }
  ridged(x, y, oct = 4) {
    let amp = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += amp * (1 - Math.abs(this.noise(x * f, y * f))); norm += amp; amp *= 0.5; f *= 2; }
    return sum / norm;
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
