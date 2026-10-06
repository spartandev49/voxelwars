// Procedural fallbacks for EVERY cue family (noise bursts, filtered thumps, FM clicks, saw brass, formant "voices", chimes)
// plus an offline-safe synthesized music loop per mood. Everything is plain DSP on Float32Array (deterministic, runs in Node),
// generated once per (family, variant) and cached; the engine flags anything served from here as `synth` in diagnostics.
import { mulberry32, hashStr } from './util.js';

export const SYNTH_SR = 22050;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ DSP kit
class K {
  constructor(id, v, sr) { this.id = id; this.v = v; this.sr = sr; this.rng = mulberry32(hashStr(id) ^ (v * 0x9e3779b1)); this.p = 1 + (v - 1) * 0.07; }
  r(a = 0, b = 1) { return a + (b - a) * this.rng(); }
}
const mk = (sec, sr) => new Float32Array(Math.max(1, Math.round(sec * sr)));

/** transposed direct-form II biquad with retunable coefficients */
class BQ {
  constructor(sr) { this.sr = sr; this.z1 = 0; this.z2 = 0; this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; }
  set(type, fc, q = 0.707) {
    const w0 = TAU * Math.min(fc, this.sr * 0.46) / this.sr, cs = Math.cos(w0), sn = Math.sin(w0), al = sn / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }   // bp (constant 0 dB peak)
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * cs / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  p(x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; }
}
function fil(x, type, fc, q, sr) { const f = new BQ(sr).set(type, fc, q); for (let i = 0; i < x.length; i++) x[i] = f.p(x[i]); return x; }
/** exponential frequency sweep of a filter across the whole buffer */
function sweepFil(x, type, f0, f1, q, sr) {
  const f = new BQ(sr), n = x.length, lr = Math.log(f1 / f0);
  for (let i = 0; i < n; i++) { if ((i & 31) === 0) f.set(type, f0 * Math.exp(lr * i / n), q); x[i] = f.p(x[i]); }
  return x;
}
function noise(k, sec) { const x = mk(sec, k.sr); for (let i = 0; i < x.length; i++) x[i] = k.rng() * 2 - 1; return x; }
/** attack/exp-decay envelope in place */
function ad(x, a, d, sr) { for (let i = 0; i < x.length; i++) { const t = i / sr; x[i] *= t < a ? t / a : Math.exp(-(t - a) / d); } return x; }
/** attack / sustain / release (smooth) envelope in place */
function asr(x, a, r, sr) { const n = x.length; for (let i = 0; i < n; i++) { const t = i / sr, tr = (n - i) / sr; x[i] *= Math.min(1, t / a) * Math.min(1, tr / r); } return x; }
function gainEnv(x, fn, sr) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / sr); return x; }
function am(x, rate, depth, sr, ph = 0) { for (let i = 0; i < x.length; i++) x[i] *= 1 - depth + depth * (0.5 + 0.5 * Math.sin(TAU * rate * i / sr + ph)); return x; }
function scale(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
let ADD_SR = SYNTH_SR;
function add(dst, src, tSec, g, sr = ADD_SR) {
  const o = Math.round(tSec * sr);
  for (let i = 0; i < src.length; i++) { const j = o + i; if (j >= dst.length) break; if (j >= 0) dst[j] += src[i] * g; }
  return dst;
}
function mix(k, sec, parts) { const o = mk(sec, k.sr); for (const [s, t, g] of parts) add(o, s, t || 0, g === undefined ? 1 : g, k.sr); return o; }
function finish(x, peak = 0.9, loop = false) {
  let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
  const g = m > 1e-6 ? peak / m : 1; const fo = loop ? 0 : Math.min(x.length >> 2, 64);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  for (let i = 0; i < fo; i++) x[x.length - 1 - i] *= i / fo;       // never end on a click
  return x;
}
/** make a buffer loop seamlessly: cross-fade its tail over its head (result is `xf` samples shorter) */
function loopify(x, xf) {
  const n = x.length - xf, o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = x[i];
  for (let i = 0; i < xf; i++) { const t = i / xf; o[i] = x[i] * Math.sin(t * Math.PI / 2) + x[n + i] * Math.cos(t * Math.PI / 2); }
  return o;
}

// ------------------------------------------------------------------ voices
const WAVES = {
  sin: (p) => Math.sin(TAU * p), tri: (p) => 4 * Math.abs(p - Math.floor(p + 0.5)) - 1,
  saw: (p) => 2 * (p - Math.floor(p)) - 1, sq: (p) => ((p - Math.floor(p)) < 0.5 ? 1 : -1),
};
/** oscillator with pitch sweep f0->f1, optional vibrato [hz, depth], FM [ratio, index], envelope a/d */
function tone(k, o) {
  const { f0, f1 = f0, dur, wave = 'sin', a = 0.004, d = dur / 3, amp = 1, vib, fm } = o, sr = k.sr, n = Math.round(dur * sr), x = new Float32Array(n), w = WAVES[wave], pv = 1 + (k.v - 1) * 0.015;
  let ph = 0, pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; let f = (f0 + (f1 - f0) * (i / n)) * pv;
    if (vib) f *= 1 + vib[1] * Math.sin(TAU * vib[0] * t);
    ph += f / sr;
    let s;
    if (fm) { pm += f * fm[0] / sr; s = Math.sin(TAU * ph + fm[1] * Math.sin(TAU * pm)); } else s = w(ph);
    x[i] = s * amp * (t < a ? t / a : Math.exp(-(t - a) / d));
  }
  return x;
}
/** additive inharmonic partials (bells, gongs, chimes): [[freqRatio, amp, decaySec]...] */
function partials(k, f, parts, dur) {
  const sr = k.sr, n = Math.round(dur * sr), x = new Float32Array(n), pv = 1 + (k.v - 1) * 0.015;
  for (const [r, a, d] of parts) { const w = TAU * f * pv * r / sr; for (let i = 0; i < n; i++) x[i] += a * Math.sin(w * i) * Math.exp(-i / sr / d); }
  return x;
}
/** low thump: pitch-dropping sine + optional click */
function thump(k, o) {
  const { f0, f1, dur, d = dur / 4, amp = 1, click = 0 } = o, sr = k.sr, n = Math.round(dur * sr), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; const f = f1 + (f0 - f1) * Math.exp(-t / (dur / 6)); ph += f / sr; x[i] = Math.sin(TAU * ph) * Math.exp(-t / d) * amp + (i < 40 ? click * (k.rng() * 2 - 1) * (1 - i / 40) : 0); }
  return x;
}
/** filtered noise burst */
function burst(k, o) {
  const { dur, lp, hp, bp, q = 0.8, a = 0.001, d = dur / 3, amp = 1 } = o, x = noise(k, dur);
  ad(x, a, d, k.sr);
  if (hp) fil(x, 'hp', hp, 0.7, k.sr);
  if (lp) fil(x, 'lp', lp, 0.7, k.sr);
  if (bp) fil(x, 'bp', bp, q, k.sr);
  return scale(x, amp);
}
/** swishy sweep: band-passed noise with a gliding centre frequency and a bell envelope */
function swish(k, o) {
  const { f0, f1, dur, q = 1.2, amp = 1, peak = 0.35 } = o, x = noise(k, dur);
  sweepFil(x, 'bp', f0, f1, q, k.sr);
  gainEnv(x, (t) => { const u = t / dur; return Math.pow(Math.sin(Math.PI * Math.pow(u, Math.log(0.5) / Math.log(peak))), 1.5); }, k.sr);
  return scale(x, amp);
}
const VOW = { a: [800, 1200, 2600], o: [500, 850, 2500], u: [330, 800, 2400], e: [550, 1800, 2600], i: [300, 2200, 3000], ae: [690, 1700, 2500], uh: [600, 1000, 2400], aw: [650, 1050, 2600] };
/** formant "voice": saw source through three resonators. vowel=[F1,F2,F3] or a key of VOW */
function voice(k, o) {
  const { f0, f1 = f0, dur, vowel = 'a', vib = [5.5, 0.012], a = 0.03, r = 0.08, amp = 1, breath = 0.05, rough = 0, v1 = null } = o;
  const F = typeof vowel === 'string' ? VOW[vowel] : vowel, sr = k.sr, n = Math.round(dur * sr), x = new Float32Array(n);
  const res = F.map((f, i) => new BQ(sr).set('bp', f, [5, 7, 9][i])), gn = [1, 0.7, 0.35], pv = 1 + (k.v - 1) * 0.02;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, u = i / n;
    let f = f0 + (f1 - f0) * u; if (v1 !== null) f += (v1 - f) * Math.sin(Math.PI * u) * 0.5;
    f *= pv * (1 + vib[1] * Math.sin(TAU * vib[0] * t) + (rough ? rough * (k.rng() - 0.5) : 0));
    ph += f / sr; const src = 2 * (ph - Math.floor(ph)) - 1 + breath * (k.rng() * 2 - 1);
    let s = 0; for (let j = 0; j < 3; j++) s += res[j].p(src) * gn[j];
    x[i] = s * amp * Math.min(1, t / a) * Math.min(1, (dur - t) / r);
  }
  return x;
}
/** sawtooth brass: lowpass opens with the envelope; bend = start pitch ratio */
function brass(k, o) {
  const { f, dur, amp = 1, a = 0.08, r = 0.15, bend = 1, vib = [5, 0.006], bright = 0.6 } = o, sr = k.sr, n = Math.round(dur * sr), x = new Float32Array(n);
  const lp = new BQ(sr), pv = 1 + (k.v - 1) * 0.012; let ph = 0, ph2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, e = Math.min(1, t / a) * Math.min(1, (dur - t) / r);
    if ((i & 15) === 0) lp.set('lp', 400 + (800 + 5200 * bright) * e, 0.9);
    const fr = f * pv * (bend + (1 - bend) * Math.min(1, t / 0.12)) * (1 + vib[1] * Math.sin(TAU * vib[0] * t));
    ph += fr / sr; ph2 += fr * 1.004 / sr;
    x[i] = lp.p(((ph - Math.floor(ph)) * 2 - 1) * 0.6 + ((ph2 - Math.floor(ph2)) * 2 - 1) * 0.4) * e * amp;
  }
  return x;
}
const note = (m) => 440 * Math.pow(2, (m - 69) / 12);
function chime(k, notes, o = {}) {      // sequence of bell-ish partial stacks; notes = midi numbers or [midi, time]
  const { gap = 0.09, dec = 0.5, len = 1.2, amp = 0.8 } = o, out = mk(len, k.sr);
  notes.forEach((m, i) => { const b = partials(k, note(m), [[1, 1, dec], [2.76, 0.35, dec * 0.5], [5.4, 0.12, dec * 0.3]], dec * 3); add(out, b, i * gap, amp, k.sr); });
  return out;
}
function clicks(k, sec, rate, o = {}) {      // random short ticks (debris, crackle, rustle)
  const { lp, hp = 1500, amp = 1, dec = 0.004 } = o, x = mk(sec, k.sr), n = Math.round(sec * rate);
  for (let c = 0; c < n; c++) { const at = Math.floor(k.r(0, 1) * (x.length - 400)), a = k.r(0.2, 1) * amp, len = 240; for (let i = 0; i < len; i++) x[at + i] += (k.rng() * 2 - 1) * a * Math.exp(-i / k.sr / dec); }
  if (hp) fil(x, 'hp', hp, 0.7, k.sr); if (lp) fil(x, 'lp', lp, 0.7, k.sr);
  return x;
}
const sw = (k, ...a) => swish(k, ...a);

// ------------------------------------------------------------------ recipes: one per cue family (113)
// Each recipe: (k) => Float32Array (any level; normalised by finish()). k.p = per-variant pitch factor, k.r() = seeded random.
const step = (k, mat, o = {}) => {
  const m = {
    dirt: () => mix(k, 0.2, [[thump(k, { f0: 160, f1: 70, dur: 0.14, d: 0.05, amp: 0.8 }), 0, 1], [burst(k, { dur: 0.12, lp: 900, d: 0.04, amp: 0.6 }), 0, 1]]),
    grass: () => mix(k, 0.2, [[burst(k, { dur: 0.18, bp: 2800 * k.p, q: 0.5, a: 0.02, d: 0.06, amp: 0.9 }), 0, 1], [thump(k, { f0: 120, f1: 70, dur: 0.1, amp: 0.3 }), 0, 1]]),
    stone: () => mix(k, 0.2, [[burst(k, { dur: 0.05, hp: 1800, d: 0.012, amp: 0.8 }), 0, 1], [thump(k, { f0: 190, f1: 110, dur: 0.1, d: 0.03, amp: 0.7 }), 0, 1]]),
    sand: () => mix(k, 0.22, [[burst(k, { dur: 0.2, bp: 1500, q: 0.4, a: 0.03, d: 0.07, amp: 0.9 }), 0, 1], [thump(k, { f0: 100, f1: 60, dur: 0.1, amp: 0.25 }), 0, 1]]),
    snow: () => { const c = burst(k, { dur: 0.22, bp: 4200, q: 0.6, a: 0.01, d: 0.09, amp: 1 }); am(c, 85, 0.8, k.sr); return mix(k, 0.24, [[c, 0, 1], [thump(k, { f0: 90, f1: 55, dur: 0.12, amp: 0.3 }), 0, 1]]); },
    mud: () => mix(k, 0.26, [[burst(k, { dur: 0.22, lp: 380, a: 0.01, d: 0.1, amp: 1 }), 0, 1], [tone(k, { f0: 140, f1: 70, dur: 0.15, d: 0.05, amp: 0.5 }), 0, 1]]),
    wood: () => mix(k, 0.2, [[tone(k, { f0: 330 * k.p, f1: 250, dur: 0.1, d: 0.025, amp: 0.8 }), 0, 1], [burst(k, { dur: 0.06, bp: 1100, d: 0.015, amp: 0.7 }), 0, 1]]),
    water: () => { const s = burst(k, { dur: 0.35, bp: 1400, q: 0.5, a: 0.01, d: 0.12, amp: 1 }); const b = mix(k, 0.35, [[tone(k, { f0: 500, f1: 900, dur: 0.07, d: 0.025, amp: 0.4 }), 0.05, 1], [tone(k, { f0: 700, f1: 1200, dur: 0.06, d: 0.02, amp: 0.3 }), 0.13, 1]]); return mix(k, 0.35, [[s, 0, 1], [b, 0, 1]]); },
  }[mat];
  return m();
};
const horde = (k, sec, o = {}) => {   // crowd babble: several detuned formant voices + shaped noise
  const { n = 6, f = 170, amp = 1, vowels = ['a', 'o', 'ae'] } = o, out = mk(sec, k.sr);
  for (let i = 0; i < n; i++) add(out, voice(k, { f0: f * k.r(0.8, 1.5), f1: f * k.r(0.8, 1.7), dur: sec * k.r(0.55, 0.95), vowel: vowels[i % vowels.length], a: sec * 0.25, r: sec * 0.3, vib: [k.r(4, 7), 0.03], breath: 0.15, amp: 0.5 }), k.r(0, sec * 0.25), 1 / Math.sqrt(n));
  const nz = noise(k, sec); fil(nz, 'bp', 900, 0.4, k.sr); gainEnv(nz, (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / sec)), 0.8), k.sr);
  return mix(k, sec, [[out, 0, amp], [nz, 0, 0.35 * amp]]);
};
const ambLoop = (k, sec, fn) => loopify(fn(sec + 0.6), Math.round(0.6 * k.sr));

export const RECIPES = {
  // ---- combat
  hit_blade: (k) => mix(k, 0.3, [[burst(k, { dur: 0.12, hp: 2200, d: 0.03, amp: 0.8 }), 0, 1], [partials(k, 1500 * k.p, [[1, 1, 0.1], [2.4, 0.5, 0.06], [3.9, 0.3, 0.04]], 0.3), 0, 0.5], [thump(k, { f0: 170, f1: 90, dur: 0.1, amp: 0.7 }), 0, 1]]),
  hit_pierce: (k) => mix(k, 0.2, [[burst(k, { dur: 0.09, bp: 3000, q: 0.7, d: 0.02, amp: 1 }), 0, 1], [thump(k, { f0: 230, f1: 120, dur: 0.08, amp: 0.8 }), 0, 1]]),
  hit_blunt: (k) => mix(k, 0.3, [[thump(k, { f0: 140 * k.p, f1: 55, dur: 0.22, d: 0.07, amp: 1, click: 0.6 }), 0, 1], [burst(k, { dur: 0.12, lp: 900, d: 0.04, amp: 0.7 }), 0, 1]]),
  hit_flesh_light: (k) => mix(k, 0.2, [[burst(k, { dur: 0.1, lp: 1500, d: 0.03, amp: 1 }), 0, 1], [thump(k, { f0: 180 * k.p, f1: 90, dur: 0.09, amp: 0.7 }), 0, 1]]),
  hit_flesh_heavy: (k) => mix(k, 0.35, [[thump(k, { f0: 110 * k.p, f1: 50, dur: 0.25, d: 0.08, amp: 1 }), 0, 1], [burst(k, { dur: 0.2, lp: 800, d: 0.06, amp: 0.9 }), 0, 1]]),
  hit_armor: (k) => mix(k, 0.4, [[tone(k, { f0: 700 * k.p, dur: 0.3, d: 0.08, fm: [1.41, 3.5], amp: 0.9 }), 0, 1], [burst(k, { dur: 0.05, hp: 3000, d: 0.012, amp: 0.8 }), 0, 1], [thump(k, { f0: 200, f1: 110, dur: 0.08, amp: 0.5 }), 0, 1]]),
  block_shield: (k) => mix(k, 0.35, [[thump(k, { f0: 150 * k.p, f1: 80, dur: 0.15, d: 0.05, amp: 1, click: 0.4 }), 0, 1], [burst(k, { dur: 0.1, bp: 650, q: 0.9, d: 0.035, amp: 0.8 }), 0, 1], [clicks(k, 0.2, 14, { hp: 2500, amp: 0.3 }), 0.05, 0.6]]),
  block_parry: (k) => mix(k, 0.6, [[partials(k, 2100 * k.p, [[1, 1, 0.3], [1.5, 0.5, 0.2], [2.2, 0.35, 0.15]], 0.6), 0, 0.7], [burst(k, { dur: 0.04, hp: 3500, d: 0.01 }), 0, 0.8]]),
  crit: (k) => mix(k, 0.5, [[partials(k, 3000 * k.p, [[1, 1, 0.2], [1.5, 0.6, 0.15]], 0.5), 0, 0.6], [thump(k, { f0: 130, f1: 55, dur: 0.2, amp: 1 }), 0, 1]]),
  swing_light: (k) => sw(k, { f0: 900 * k.p, f1: 3600, dur: 0.22, q: 1.4, peak: 0.55 }),
  swing_heavy: (k) => sw(k, { f0: 350 * k.p, f1: 1500, dur: 0.34, q: 1, peak: 0.5 }),
  bow_shoot: (k) => mix(k, 0.3, [[tone(k, { f0: 240 * k.p, f1: 170, dur: 0.16, wave: 'tri', d: 0.05, amp: 0.7 }), 0, 1], [burst(k, { dur: 0.07, hp: 2200, d: 0.02 }), 0, 0.8], [sw(k, { f0: 1500, f1: 4000, dur: 0.14, peak: 0.3 }), 0.01, 0.4]]),
  arrow_whoosh: (k) => sw(k, { f0: 2400 * k.p, f1: 900, dur: 0.3, q: 1.8, peak: 0.45 }),
  arrow_hit_flesh: (k) => mix(k, 0.15, [[thump(k, { f0: 210 * k.p, f1: 110, dur: 0.07, amp: 0.8 }), 0, 1], [burst(k, { dur: 0.05, lp: 1800, d: 0.015 }), 0, 0.8]]),
  arrow_hit_wood: (k) => mix(k, 0.2, [[tone(k, { f0: 420 * k.p, f1: 320, dur: 0.12, d: 0.03, amp: 0.9 }), 0, 1], [burst(k, { dur: 0.05, bp: 1200, d: 0.015 }), 0, 0.6]]),
  arrow_hit_shield: (k) => mix(k, 0.25, [[tone(k, { f0: 300 * k.p, f1: 220, dur: 0.14, d: 0.04, amp: 1 }), 0, 1], [clicks(k, 0.15, 10, { hp: 2000, amp: 0.3 }), 0.03, 0.6]]),
  javelin_throw: (k) => sw(k, { f0: 600 * k.p, f1: 2400, dur: 0.32, q: 1.1, peak: 0.5 }),
  spear_thrust: (k) => sw(k, { f0: 1300 * k.p, f1: 2800, dur: 0.16, q: 1.5, peak: 0.5 }),
  axe_chop: (k) => mix(k, 0.3, [[thump(k, { f0: 120 * k.p, f1: 60, dur: 0.18, amp: 1, click: 0.5 }), 0, 1], [burst(k, { dur: 0.07, lp: 2500, d: 0.02 }), 0, 0.8]]),
  kick_whoomp: (k) => mix(k, 0.5, [[thump(k, { f0: 130, f1: 38, dur: 0.4, d: 0.12, amp: 1 }), 0, 1], [sw(k, { f0: 900, f1: 200, dur: 0.3, q: 0.8, peak: 0.3 }), 0, 0.7]]),
  net_throw: (k) => { const n = burst(k, { dur: 0.34, bp: 500, q: 0.6, a: 0.05, d: 0.15 }); am(n, 28, 0.7, k.sr); return mix(k, 0.35, [[n, 0, 1], [sw(k, { f0: 400, f1: 1200, dur: 0.25 }), 0, 0.6]]); },
  // ---- death / voice
  death_male: (k) => mix(k, 0.7, [[voice(k, { f0: 150 * k.p, f1: 85, dur: 0.55, vowel: 'aw', vib: [6, 0.02], breath: 0.12, a: 0.02, r: 0.2 }), 0, 1], [burst(k, { dur: 0.1, lp: 1200, d: 0.03 }), 0, 0.4]]),
  death_scream: (k) => voice(k, { f0: 420 * k.p, f1: 260, v1: 520, dur: 0.85, vowel: 'a', vib: [7, 0.03], rough: 0.04, breath: 0.1, a: 0.04, r: 0.3 }),
  death_oof: (k) => mix(k, 0.3, [[voice(k, { f0: 135 * k.p, f1: 100, dur: 0.17, vowel: 'uh', a: 0.01, r: 0.06, breath: 0.2 }), 0, 1], [burst(k, { dur: 0.08, lp: 700, d: 0.03 }), 0, 0.6]]),
  death_big: (k) => mix(k, 1.1, [[voice(k, { f0: 75 * k.p, f1: 42, dur: 0.95, vowel: 'o', vib: [4, 0.03], breath: 0.2, rough: 0.05, a: 0.05, r: 0.35 }), 0, 1], [thump(k, { f0: 80, f1: 35, dur: 0.6, amp: 0.8 }), 0.35, 1]]),
  death_animal: (k) => voice(k, { f0: 650 * k.p, f1: 300, dur: 0.32, vowel: 'ae', vib: [11, 0.04], breath: 0.1, a: 0.01, r: 0.12 }),
  battle_cry: (k) => horde(k, 0.9, { n: 4, f: 190 * k.p, vowels: ['a', 'o', 'a'] }),
  taunt: (k) => mix(k, 0.45, [[voice(k, { f0: 220 * k.p, f1: 320, dur: 0.36, vowel: 'e', a: 0.02, r: 0.1, breath: 0.1 }), 0, 1]]),
  cheer_small: (k) => voice(k, { f0: 270 * k.p, f1: 420, dur: 0.42, vowel: 'ae', vib: [7, 0.02], a: 0.03, r: 0.12 }),
  philosopher_mumble: (k) => { const o = mk(0.95, k.sr); [['uh', 0], ['o', 0.27], ['u', 0.5]].forEach(([v, t], i) => add(o, voice(k, { f0: (112 - i * 6) * k.p, f1: 98 - i * 4, dur: 0.22, vowel: v, vib: [4, 0.01], a: 0.03, r: 0.06, breath: 0.08 }), t, 1)); return o; },
  senator_blah: (k) => { const o = mk(1.1, k.sr); for (let i = 0; i < 5; i++) { const t = i * 0.2 + k.r(0, 0.03); add(o, voice(k, { f0: k.r(130, 170) * k.p, f1: k.r(110, 150), dur: 0.14, vowel: i % 2 ? 'ae' : 'a', a: 0.012, r: 0.04, breath: 0.15 }), t, 1); } return o; },
  chicken_cluck: (k) => { const o = mk(0.55, k.sr); for (let i = 0; i < 3; i++) add(o, voice(k, { f0: (620 - i * 50) * k.p, f1: 430, dur: 0.1, vowel: [1400, 2300, 3300], a: 0.008, r: 0.04, vib: [0, 0], breath: 0.1 }), i * 0.13 + 0.03 * k.rng(), 1 - i * 0.12); return o; },
  chicken_rage: (k) => mix(k, 0.8, [[voice(k, { f0: 880 * k.p, f1: 1300, v1: 1500, dur: 0.65, vowel: [1500, 2600, 3500], vib: [14, 0.06], rough: 0.08, a: 0.02, r: 0.15, breath: 0.2 }), 0, 1], [horde(k, 0.6, { n: 3, f: 600 }), 0.05, 0.3]]),
  goat_bleat: (k) => { const x = voice(k, { f0: 330 * k.p, f1: 290, dur: 0.75, vowel: [750, 1250, 2500], vib: [26, 0.07], rough: 0.03, a: 0.04, r: 0.2, breath: 0.12 }); return x; },
  hound_bark: (k) => { const o = mk(0.5, k.sr); for (let i = 0; i < 2; i++) add(o, voice(k, { f0: 420 * k.p, f1: 240, dur: 0.14, vowel: [700, 1300, 2500], a: 0.006, r: 0.05, vib: [0, 0], breath: 0.2 }), i * 0.2, 1); return o; },
  horse_neigh: (k) => voice(k, { f0: 640 * k.p, f1: 480, v1: 1150, dur: 1.0, vowel: [900, 2100, 3100], vib: [9, 0.04], rough: 0.03, a: 0.05, r: 0.3, breath: 0.1 }),
  horse_gallop: (k) => { const o = mk(0.7, k.sr); [0, 0.13, 0.26, 0.5].forEach((t, i) => add(o, mix(k, 0.15, [[thump(k, { f0: 200, f1: 100, dur: 0.1, d: 0.03, amp: 0.8 }), 0, 1], [burst(k, { dur: 0.05, bp: 1200, d: 0.015, amp: 0.6 }), 0, 1]]), t, 1 - i * 0.05)); return o; },
  camel_groan: (k) => voice(k, { f0: 95 * k.p, f1: 70, dur: 0.95, vowel: 'aw', vib: [5, 0.04], rough: 0.06, a: 0.08, r: 0.3, breath: 0.2 }),
  elephant_trumpet: (k) => mix(k, 1.3, [[brass(k, { f: 390 * k.p, bend: 0.75, dur: 1.1, a: 0.06, r: 0.3, vib: [7, 0.02], bright: 0.9 }), 0, 1], [burst(k, { dur: 1.0, bp: 1800, q: 0.5, a: 0.05, d: 0.4, amp: 0.25 }), 0, 1]]),
  elephant_step: (k) => mix(k, 0.45, [[thump(k, { f0: 65, f1: 32, dur: 0.38, d: 0.12, amp: 1 }), 0, 1], [burst(k, { dur: 0.25, lp: 220, d: 0.08, amp: 0.8 }), 0, 1]]),
  minotaur_roar: (k) => { const x = voice(k, { f0: 72 * k.p, f1: 58, dur: 1.2, vowel: 'o', vib: [3, 0.03], rough: 0.08, breath: 0.3, a: 0.08, r: 0.4 }); am(x, 38, 0.35, k.sr); return mix(k, 1.3, [[x, 0, 1], [burst(k, { dur: 1.0, bp: 500, q: 0.5, a: 0.1, d: 0.4, amp: 0.3 }), 0, 1]]); },
  cyclops_roar: (k) => { const x = voice(k, { f0: 52 * k.p, f1: 40, dur: 1.6, vowel: 'u', vib: [2.5, 0.03], rough: 0.1, breath: 0.35, a: 0.12, r: 0.5 }); am(x, 30, 0.4, k.sr); return mix(k, 1.7, [[x, 0, 1], [thump(k, { f0: 60, f1: 30, dur: 0.5, amp: 0.7 }), 0.1, 1]]); },
  medusa_hiss: (k) => { const x = burst(k, { dur: 0.9, hp: 3800, a: 0.12, d: 0.5, amp: 1 }); am(x, 13, 0.5, k.sr); return mix(k, 0.95, [[x, 0, 1], [burst(k, { dur: 0.8, bp: 6500, q: 1.2, a: 0.15, d: 0.4, amp: 0.4 }), 0, 1]]); },
  // ---- crowd
  crowd_cheer_small: (k) => horde(k, 1.6, { n: 5, f: 190 }),
  crowd_cheer_big: (k) => horde(k, 2.6, { n: 9, f: 175 }),
  crowd_gasp: (k) => { const x = noise(k, 0.9); fil(x, 'bp', 2400, 0.5, k.sr); gainEnv(x, (t) => Math.min(1, t / 0.4) * Math.exp(-Math.max(0, t - 0.4) / 0.2), k.sr); return mix(k, 0.95, [[x, 0, 0.8], [horde(k, 0.8, { n: 4, f: 260, vowels: ['o', 'u'] }), 0, 0.5]]); },
  crowd_boo: (k) => horde(k, 1.8, { n: 7, f: 120, vowels: ['u', 'o'] }),
  crowd_loop: (k) => ambLoop(k, 5, (s) => { const o = mk(s, k.sr); for (let i = 0; i < 14; i++) add(o, voice(k, { f0: k.r(110, 280), f1: k.r(110, 280), dur: k.r(0.5, 1.4), vowel: ['a', 'o', 'ae', 'e'][i & 3], a: 0.2, r: 0.3, vib: [k.r(3, 6), 0.03], breath: 0.3, amp: 0.4 }), k.r(0, s - 1), 0.35); const nz = noise(k, s); fil(nz, 'bp', 800, 0.35, k.sr); return mix(k, s, [[o, 0, 1], [nz, 0, 0.45]]); }),
  // ---- instruments
  horn_war: (k) => mix(k, 2.0, [[brass(k, { f: 116.5 * k.p, dur: 1.8, a: 0.2, r: 0.35, bend: 0.92, bright: 0.7 }), 0, 1], [brass(k, { f: 174.6 * k.p, dur: 1.6, a: 0.25, r: 0.3, bend: 0.95, bright: 0.5, amp: 0.5 }), 0.05, 1]]),
  horn_charge: (k) => mix(k, 1.2, [[brass(k, { f: 174.6 * k.p, dur: 0.32, a: 0.05, r: 0.05, bright: 0.9 }), 0, 1], [brass(k, { f: 174.6 * k.p, dur: 0.32, a: 0.05, r: 0.05, bright: 0.9 }), 0.36, 1], [brass(k, { f: 233 * k.p, dur: 0.6, a: 0.05, r: 0.25, bright: 1 }), 0.72, 1]]),
  horn_victory: (k) => mix(k, 2.4, [[brass(k, { f: 196 * k.p, dur: 0.45, a: 0.04, r: 0.08, bright: 0.9 }), 0, 1], [brass(k, { f: 261.6 * k.p, dur: 0.45, a: 0.04, r: 0.08, bright: 0.9 }), 0.5, 1], [brass(k, { f: 329.6 * k.p, dur: 1.3, a: 0.05, r: 0.5, bright: 1 }), 1.0, 1]]),
  drum_boom: (k) => mix(k, 0.9, [[thump(k, { f0: 90 * k.p, f1: 38, dur: 0.8, d: 0.22, amp: 1, click: 0.3 }), 0, 1], [burst(k, { dur: 0.15, bp: 220, q: 0.7, d: 0.05, amp: 0.7 }), 0, 1]]),
  drum_roll: (k) => { const o = mk(1.5, k.sr); for (let i = 0; i < 22; i++) { const t = i * 0.06, u = i / 22; add(o, thump(k, { f0: 150, f1: 70, dur: 0.1, d: 0.03, amp: 0.4 + u * 0.6, click: 0.3 }), t, 1); } return o; },
  gong: (k) => mix(k, 3.5, [[partials(k, 110 * k.p, [[1, 1, 2.4], [1.51, 0.7, 1.9], [2.12, 0.6, 1.6], [2.74, 0.5, 1.2], [3.5, 0.3, 0.8], [4.9, 0.2, 0.5]], 3.5), 0, 1], [burst(k, { dur: 0.3, bp: 900, q: 0.4, d: 0.08, amp: 0.5 }), 0, 1]]),
  // ---- siege / destruction
  catapult_creak: (k) => { const x = noise(k, 0.9); sweepFil(x, 'bp', 180, 520, 6, k.sr); am(x, 11, 0.8, k.sr); gainEnv(x, (t) => Math.sin(Math.PI * t / 0.9), k.sr); return x; },
  catapult_launch: (k) => mix(k, 0.8, [[thump(k, { f0: 110, f1: 45, dur: 0.5, d: 0.16, amp: 1, click: 0.6 }), 0, 1], [sw(k, { f0: 400, f1: 1800, dur: 0.4, peak: 0.25 }), 0.02, 0.7], [burst(k, { dur: 0.08, hp: 1500, d: 0.02 }), 0, 0.8]]),
  ballista_twang: (k) => mix(k, 0.6, [[tone(k, { f0: 150 * k.p, f1: 95, dur: 0.45, wave: 'tri', d: 0.12, fm: [2.01, 1.2], amp: 0.9 }), 0, 1], [burst(k, { dur: 0.05, hp: 2500, d: 0.01 }), 0, 0.8]]),
  boulder_whoosh: (k) => sw(k, { f0: 250, f1: 900, dur: 0.9, q: 0.9, peak: 0.6 }),
  boulder_impact: (k) => mix(k, 1.2, [[thump(k, { f0: 75 * k.p, f1: 30, dur: 0.8, d: 0.25, amp: 1, click: 0.5 }), 0, 1], [burst(k, { dur: 0.6, lp: 450, a: 0.005, d: 0.18, amp: 0.9 }), 0, 1], [clicks(k, 0.6, 22, { hp: 500, lp: 3000, amp: 0.5, dec: 0.01 }), 0.12, 0.6]]),
  wall_crumble: (k) => mix(k, 2.0, [[burst(k, { dur: 1.8, lp: 380, a: 0.05, d: 0.7, amp: 1 }), 0, 1], [clicks(k, 1.6, 40, { hp: 400, lp: 3500, amp: 0.6, dec: 0.012 }), 0.1, 0.7], [thump(k, { f0: 60, f1: 28, dur: 0.9, amp: 0.7 }), 0, 1]]),
  wood_crack: (k) => mix(k, 0.5, [[burst(k, { dur: 0.05, hp: 1500, d: 0.012 }), 0, 1], [tone(k, { f0: 280 * k.p, f1: 180, dur: 0.2, d: 0.05, amp: 0.7 }), 0.02, 1], [clicks(k, 0.3, 14, { hp: 1000, amp: 0.4 }), 0.06, 1]]),
  rubble: (k) => mix(k, 1.2, [[clicks(k, 1.1, 26, { hp: 400, lp: 3000, amp: 0.7, dec: 0.012 }), 0, 1], [burst(k, { dur: 0.9, lp: 350, a: 0.02, d: 0.4, amp: 0.6 }), 0, 1]]),
  voxel_break: (k) => mix(k, 0.4, [[burst(k, { dur: 0.25, hp: 700, lp: 4500, d: 0.07 }), 0, 1], [clicks(k, 0.25, 12, { hp: 1500, amp: 0.6 }), 0, 0.7], [thump(k, { f0: 160, f1: 80, dur: 0.12, amp: 0.5 }), 0, 1]]),
  // ---- fx
  fire_ignite: (k) => mix(k, 1.2, [[burst(k, { dur: 1.0, bp: 700, q: 0.5, a: 0.12, d: 0.4 }), 0, 1], [clicks(k, 1.0, 18, { hp: 2000, amp: 0.5 }), 0.1, 1], [thump(k, { f0: 90, f1: 40, dur: 0.3, amp: 0.5 }), 0, 1]]),
  fire_loop: (k) => ambLoop(k, 3, (s) => { const b = noise(k, s); fil(b, 'lp', 1400, 0.7, k.sr); am(b, 0.7, 0.4, k.sr); return mix(k, s, [[b, 0, 0.7], [clicks(k, s, 24, { hp: 1800, amp: 0.9, dec: 0.006 }), 0, 1]]); }),
  thunder_crack: (k) => mix(k, 3.0, [[burst(k, { dur: 0.25, hp: 800, d: 0.05, amp: 1 }), 0, 1], [burst(k, { dur: 2.8, lp: 260, a: 0.04, d: 1.0, amp: 1 }), 0.05, 1], [thump(k, { f0: 55, f1: 28, dur: 1.2, amp: 0.8 }), 0.1, 1]]),
  lightning_zap: (k) => { const x = noise(k, 0.4); fil(x, 'hp', 2500, 0.7, k.sr); am(x, 90, 0.8, k.sr); ad(x, 0.002, 0.14, k.sr); return mix(k, 0.45, [[x, 0, 1], [tone(k, { f0: 3500, f1: 400, dur: 0.25, wave: 'saw', d: 0.08, amp: 0.4 }), 0, 1]]); },
  heal_chime: (k) => chime(k, [76, 83, 88], { gap: 0.12, dec: 0.5, len: 1.5 }),
  buff_power: (k) => mix(k, 1.2, [[tone(k, { f0: 280, f1: 880, dur: 0.5, wave: 'tri', a: 0.02, d: 0.35, amp: 0.7 }), 0, 1], [chime(k, [72, 79, 84], { gap: 0.1, dec: 0.4, len: 1.0 }), 0.25, 0.8]]),
  curse_whoosh: (k) => mix(k, 1.2, [[sw(k, { f0: 1400, f1: 180, dur: 1.0, q: 1.0, peak: 0.4 }), 0, 1], [tone(k, { f0: 220, f1: 110, dur: 0.9, wave: 'sq', a: 0.1, d: 0.5, amp: 0.25, vib: [6, 0.05] }), 0, 1]]),
  coin_clink: (k) => { const a = partials(k, 3100 * k.p, [[1, 1, 0.12], [1.34, 0.6, 0.1]], 0.4); return mix(k, 0.45, [[a, 0, 1], [partials(k, 4200, [[1, 1, 0.1]], 0.3), 0.06, 0.7]]); },
  stone_freeze: (k) => mix(k, 0.9, [[clicks(k, 0.7, 40, { hp: 2500, amp: 0.8 }), 0, 1], [partials(k, 520, [[1, 1, 0.5], [2.9, 0.4, 0.3]], 0.9), 0, 0.5], [burst(k, { dur: 0.4, lp: 600, d: 0.12 }), 0, 0.8]]),
  wine_pour: (k) => { const x = noise(k, 1.4); fil(x, 'bp', 1000, 1.4, k.sr); gainEnv(x, (t) => 0.4 + 0.6 * Math.abs(Math.sin(t * 22 + Math.sin(t * 7) * 3)), k.sr); asr(x, 0.1, 0.3, k.sr); const o = mk(1.4, k.sr); for (let i = 0; i < 10; i++) add(o, tone(k, { f0: k.r(350, 700), f1: k.r(700, 1300), dur: 0.06, d: 0.025, amp: 0.35 }), k.r(0.1, 1.2), 1); return mix(k, 1.4, [[x, 0, 0.8], [o, 0, 1]]); },
  confetti_pop: (k) => mix(k, 0.6, [[thump(k, { f0: 260, f1: 120, dur: 0.1, amp: 1, click: 0.8 }), 0, 1], [burst(k, { dur: 0.45, bp: 5000, q: 0.5, a: 0.01, d: 0.15, amp: 0.5 }), 0.02, 1], [clicks(k, 0.4, 24, { hp: 3000, amp: 0.4 }), 0.05, 1]]),
  voxel_pop: (k) => tone(k, { f0: 600 * k.p, f1: 260, dur: 0.1, d: 0.03, amp: 1 }),
  debris_clatter: (k) => mix(k, 0.8, [[clicks(k, 0.75, 20, { hp: 600, lp: 4000, amp: 0.9, dec: 0.01 }), 0, 1]]),
  revive_chime: (k) => chime(k, [72, 76, 79, 84], { gap: 0.13, dec: 0.6, len: 1.8 }),
  // ---- ui
  ui_hover: (k) => tone(k, { f0: 1500 * k.p, dur: 0.05, d: 0.015, amp: 0.7 }),
  ui_click: (k) => mix(k, 0.12, [[tone(k, { f0: 1000 * k.p, f1: 800, dur: 0.07, d: 0.02, amp: 0.8 }), 0, 1], [burst(k, { dur: 0.02, hp: 3000, d: 0.005, amp: 0.5 }), 0, 1]]),
  ui_confirm: (k) => mix(k, 0.3, [[tone(k, { f0: 660, dur: 0.1, d: 0.05, amp: 0.8 }), 0, 1], [tone(k, { f0: 990, dur: 0.18, d: 0.08, amp: 0.8 }), 0.08, 1]]),
  ui_back: (k) => mix(k, 0.3, [[tone(k, { f0: 780, dur: 0.1, d: 0.05, amp: 0.8 }), 0, 1], [tone(k, { f0: 520, dur: 0.16, d: 0.07, amp: 0.8 }), 0.08, 1]]),
  ui_error: (k) => mix(k, 0.3, [[tone(k, { f0: 150, f1: 130, dur: 0.22, wave: 'saw', d: 0.12, amp: 0.45 }), 0, 1], [tone(k, { f0: 230, dur: 0.2, wave: 'sq', d: 0.1, amp: 0.25 }), 0, 1]]),
  ui_toggle: (k) => tone(k, { f0: 720 * k.p, f1: 900, dur: 0.08, d: 0.03, amp: 0.8 }),
  ui_tick: (k) => tone(k, { f0: 2100 * k.p, dur: 0.03, d: 0.008, amp: 0.7 }),
  ui_panel_open: (k) => mix(k, 0.25, [[sw(k, { f0: 400, f1: 2400, dur: 0.2, q: 0.8, peak: 0.6, amp: 0.7 }), 0, 1], [tone(k, { f0: 600, f1: 900, dur: 0.1, d: 0.04, amp: 0.3 }), 0.1, 1]]),
  ui_panel_close: (k) => mix(k, 0.25, [[sw(k, { f0: 2400, f1: 400, dur: 0.2, q: 0.8, peak: 0.4, amp: 0.7 }), 0, 1]]),
  ui_achievement: (k) => chime(k, [79, 83, 86, 91], { gap: 0.11, dec: 0.5, len: 1.6 }),
  ui_countdown_beep: (k) => tone(k, { f0: 880 * k.p, dur: 0.18, d: 0.12, amp: 0.8 }),
  ui_go: (k) => mix(k, 0.6, [[tone(k, { f0: 1318, dur: 0.5, d: 0.25, amp: 0.7 }), 0, 1], [tone(k, { f0: 1976, dur: 0.5, d: 0.25, amp: 0.4 }), 0, 1], [tone(k, { f0: 659, dur: 0.5, d: 0.2, wave: 'tri', amp: 0.4 }), 0, 1]]),
  ui_place: (k) => mix(k, 0.18, [[thump(k, { f0: 280 * k.p, f1: 130, dur: 0.12, d: 0.04, amp: 1, click: 0.4 }), 0, 1], [tone(k, { f0: 520 * k.p, f1: 340, dur: 0.07, d: 0.02, amp: 0.4 }), 0, 1]]),
  ui_erase: (k) => mix(k, 0.25, [[burst(k, { dur: 0.2, bp: 1800, q: 0.6, a: 0.01, d: 0.07, amp: 0.8 }), 0, 1], [tone(k, { f0: 420, f1: 220, dur: 0.1, d: 0.04, amp: 0.4 }), 0, 1]]),
  // ---- jingles / stingers
  jingle_victory: (k) => mix(k, 3.6, [[brass(k, { f: 196, dur: 0.4, a: 0.03, r: 0.06, bright: 0.9 }), 0, 1], [brass(k, { f: 261.6, dur: 0.4, a: 0.03, r: 0.06, bright: 0.9 }), 0.45, 1], [brass(k, { f: 329.6, dur: 0.4, a: 0.03, r: 0.06, bright: 0.9 }), 0.9, 1], [brass(k, { f: 392, dur: 1.8, a: 0.04, r: 0.7, bright: 1 }), 1.35, 1], [brass(k, { f: 261.6, dur: 1.8, a: 0.05, r: 0.7, bright: 0.8, amp: 0.6 }), 1.35, 1], [thump(k, { f0: 90, f1: 40, dur: 0.8, amp: 0.9 }), 1.35, 1], [chime(k, [79, 84, 88, 91], { gap: 0.1, dec: 0.7, len: 1.8 }), 1.5, 0.5]]),
  jingle_defeat: (k) => mix(k, 3.6, [[brass(k, { f: 220, dur: 0.7, a: 0.06, r: 0.1, bright: 0.3 }), 0, 1], [brass(k, { f: 196, dur: 0.7, a: 0.06, r: 0.1, bright: 0.3 }), 0.8, 1], [brass(k, { f: 164.8, dur: 0.7, a: 0.06, r: 0.1, bright: 0.3 }), 1.6, 1], [brass(k, { f: 110, dur: 1.4, a: 0.1, r: 0.6, bright: 0.2 }), 2.3, 1], [thump(k, { f0: 70, f1: 32, dur: 1.0, amp: 0.9 }), 2.3, 1]]),
  jingle_start: (k) => mix(k, 2.2, [[brass(k, { f: 146.8, dur: 0.5, a: 0.04, r: 0.1, bright: 0.8 }), 0, 1], [brass(k, { f: 220, dur: 0.5, a: 0.04, r: 0.1, bright: 0.8 }), 0.5, 1], [brass(k, { f: 293.7, dur: 1.0, a: 0.05, r: 0.4, bright: 1 }), 1.0, 1], [thump(k, { f0: 90, f1: 36, dur: 0.7, amp: 1 }), 0, 1], [thump(k, { f0: 90, f1: 36, dur: 0.7, amp: 1 }), 1.0, 1]]),
  stinger_hero_down: (k) => mix(k, 2.4, [[partials(k, 98, [[1, 1, 1.6], [1.5, 0.6, 1.2], [2.3, 0.4, 0.8]], 2.4), 0, 1], [thump(k, { f0: 70, f1: 30, dur: 0.9, amp: 1 }), 0, 1], [brass(k, { f: 110, dur: 1.2, a: 0.1, r: 0.6, bright: 0.2, amp: 0.6 }), 0.1, 1]]),
  stinger_epic: (k) => mix(k, 1.8, [[brass(k, { f: 196, dur: 0.9, a: 0.03, r: 0.4, bright: 1 }), 0, 1], [brass(k, { f: 294, dur: 0.9, a: 0.03, r: 0.4, bright: 1, amp: 0.7 }), 0, 1], [thump(k, { f0: 100, f1: 38, dur: 0.9, amp: 1 }), 0, 1], [partials(k, 150, [[1, 1, 1.0], [2.1, 0.5, 0.6]], 1.6), 0, 0.4]]),
  stinger_funny: (k) => mix(k, 1.4, [[tone(k, { f0: 330, f1: 247, dur: 0.4, wave: 'saw', d: 0.3, vib: [6, 0.04], amp: 0.5 }), 0, 1], [tone(k, { f0: 294, f1: 196, dur: 0.6, wave: 'saw', d: 0.4, vib: [6, 0.05], amp: 0.5 }), 0.4, 1], [chime(k, [88], { len: 0.8, dec: 0.4 }), 1.0, 0.6]]),
  // ---- announcer voice clips (synth stand-ins: short formant shouts)
  announce_ready: (k) => mix(k, 0.8, [[voice(k, { f0: 150, f1: 140, dur: 0.22, vowel: 'e', a: 0.01, r: 0.05, breath: 0.1 }), 0, 1], [voice(k, { f0: 140, f1: 125, dur: 0.3, vowel: 'e', a: 0.01, r: 0.1, breath: 0.1 }), 0.28, 1]]),
  announce_go: (k) => voice(k, { f0: 190, f1: 150, v1: 230, dur: 0.55, vowel: 'o', vib: [5, 0.01], a: 0.02, r: 0.2, breath: 0.1 }),
  announce_winner: (k) => mix(k, 1.1, [[voice(k, { f0: 140, f1: 150, dur: 0.25, vowel: 'i', a: 0.01, r: 0.06 }), 0, 1], [voice(k, { f0: 155, f1: 105, dur: 0.5, vowel: 'e', a: 0.02, r: 0.2 }), 0.3, 1]]),
  // ---- foley
  step_dirt: (k) => step(k, 'dirt'), step_grass: (k) => step(k, 'grass'), step_stone: (k) => step(k, 'stone'), step_sand: (k) => step(k, 'sand'),
  step_snow: (k) => step(k, 'snow'), step_mud: (k) => step(k, 'mud'), step_wood: (k) => step(k, 'wood'), step_water: (k) => step(k, 'water'),
  armor_rustle: (k) => mix(k, 0.7, [[clicks(k, 0.6, 26, { hp: 3500, amp: 0.7, dec: 0.005 }), 0, 1], [burst(k, { dur: 0.5, bp: 5200, q: 0.5, a: 0.03, d: 0.2, amp: 0.25 }), 0, 1]]),
  // ---- ambience loops (seamless)
  amb_wind: (k) => ambLoop(k, 6, (s) => { const x = noise(k, s); fil(x, 'lp', 700, 0.7, k.sr); gainEnv(x, (t) => 0.55 + 0.45 * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1), k.sr); const w = noise(k, s); fil(w, 'bp', 1100, 6, k.sr); gainEnv(w, (t) => 0.15 * (0.5 + 0.5 * Math.sin(t * 0.6 + 2)), k.sr); return mix(k, s, [[x, 0, 1], [w, 0, 1]]); }),
  amb_birds: (k) => ambLoop(k, 6, (s) => { const o = mk(s, k.sr); for (let i = 0; i < 9; i++) { const f = k.r(2800, 5200), t = k.r(0, s - 0.5); for (let j = 0; j < 3; j++) add(o, tone(k, { f0: f * k.r(0.9, 1.1), f1: f * k.r(1.1, 1.5), dur: 0.08, d: 0.03, amp: 0.5 }), t + j * 0.11, 1); } const b = noise(k, s); fil(b, 'lp', 500, 0.7, k.sr); return mix(k, s, [[o, 0, 1], [b, 0, 0.12]]); }),
  amb_desert: (k) => ambLoop(k, 6, (s) => { const x = noise(k, s); fil(x, 'lp', 380, 0.8, k.sr); gainEnv(x, (t) => 0.5 + 0.5 * Math.sin(t * 0.5 + 1) * Math.sin(t * 0.23), k.sr); const g = noise(k, s); fil(g, 'bp', 2000, 1.2, k.sr); gainEnv(g, (t) => 0.1 * Math.max(0, Math.sin(t * 0.5)), k.sr); return mix(k, s, [[x, 0, 1], [g, 0, 1]]); }),
  amb_forest: (k) => ambLoop(k, 6, (s) => { const x = noise(k, s); fil(x, 'bp', 3200, 0.4, k.sr); gainEnv(x, (t) => 0.1 + 0.08 * Math.sin(t * 1.3), k.sr); const o = mk(s, k.sr); for (let i = 0; i < 6; i++) add(o, tone(k, { f0: k.r(1800, 3200), f1: k.r(2200, 3800), dur: 0.12, d: 0.05, amp: 0.4 }), k.r(0, s - 0.3), 1); const w = noise(k, s); fil(w, 'lp', 450, 0.7, k.sr); return mix(k, s, [[x, 0, 1], [o, 0, 1], [w, 0, 0.3]]); }),
  amb_water: (k) => ambLoop(k, 6, (s) => { const x = noise(k, s); fil(x, 'bp', 900, 0.8, k.sr); gainEnv(x, (t) => 0.5 + 0.5 * Math.sin(t * 5.1) * Math.sin(t * 2.3 + 1), k.sr); const y = noise(k, s); fil(y, 'hp', 2500, 0.7, k.sr); gainEnv(y, (t) => 0.1 + 0.08 * Math.sin(t * 9), k.sr); return mix(k, s, [[x, 0, 1], [y, 0, 1]]); }),
  amb_fire: (k) => ambLoop(k, 4, (s) => { const b = noise(k, s); fil(b, 'lp', 1200, 0.7, k.sr); am(b, 0.9, 0.4, k.sr); return mix(k, s, [[b, 0, 0.6], [clicks(k, s, 30, { hp: 1800, amp: 0.9, dec: 0.006 }), 0, 1]]); }),
  amb_crowd: (k) => RECIPES.crowd_loop(k),
};
// loops: families whose synth variant must loop seamlessly (all `amb_*`, crowd_loop, fire_loop)
export const LOOP_FAMILIES = new Set(['amb_wind', 'amb_birds', 'amb_desert', 'amb_forest', 'amb_water', 'amb_fire', 'amb_crowd', 'crowd_loop', 'fire_loop']);
export const SYNTH_FAMILIES = Object.keys(RECIPES);

/** Render one synth variant to a Float32Array (mono). Deterministic for (id, variant, sr). */
export function renderSynth(id, variant = 0, sr = SYNTH_SR) {
  const fn = RECIPES[id]; if (!fn) return null;
  const k = new K(id, variant, sr);
  ADD_SR = sr;
  const x = fn(k);
  return LOOP_FAMILIES.has(id) ? finish(x, 0.8, true) : finish(x, 0.9);
}

// ------------------------------------------------------------------ synthesized music (offline fallback)
const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygdom: [0, 1, 4, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11], harmin: [0, 2, 3, 5, 7, 8, 11],
};
const degNote = (root, mode, d) => { const m = MODES[mode], o = Math.floor(d / 7); return root + m[((d % 7) + 7) % 7] + 12 * o; };
const MUSIC_SPECS = {
  menu:    { bpm: 78, bars: 8, root: 50, mode: 'dorian', prog: [0, 5, 3, 4, 0, 5, 6, 4], pad: 0.16, bass: 'half', arp: 'up8', arpAmp: 0.12, drums: { tom: 'x.......x.......' }, lead: 0, rev: 0.28 },
  editor:  { bpm: 92, bars: 8, root: 52, mode: 'mixo', prog: [0, 3, 4, 3, 0, 5, 3, 4], pad: 0.15, bass: 'half', arp: 'sk', arpAmp: 0.1, drums: {}, lead: 0, rev: 0.25 },
  victory: { bpm: 112, bars: 8, root: 55, mode: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 0], pad: 0.14, bass: 'eighth', arp: 'up8', arpAmp: 0.1, drums: { kick: 'x...x...x...x.x.', snare: '....x.......x...' }, lead: 0.2, brassChord: 0.18, rev: 0.3 },
  defeat:  { bpm: 60, bars: 8, root: 45, mode: 'aeolian', prog: [0, 5, 3, 4, 0, 5, 1, 0], pad: 0.2, bass: 'half', arp: 0, drums: { tom: 'x...............' }, lead: 0.12, rev: 0.35 },
  comedy:  { bpm: 128, bars: 8, root: 53, mode: 'major', prog: [0, 3, 0, 4, 0, 3, 4, 0], pad: 0, bass: 'oompah', arp: 0, drums: {}, lead: 0, polka: true, rev: 0.12 },
  battle_heroic:   { bpm: 108, bars: 8, root: 50, mode: 'mixo', prog: [0, 5, 3, 4, 0, 5, 4, 3], pad: 0.13, bass: 'eighth', arp: 0, drums: { kick: 'x.......x.x.....', snare: '....x.......x...', tom: '..x...x...x...x.' }, lead: 0.16, brassChord: 0.1, rev: 0.28 },
  battle_eastern:  { bpm: 100, bars: 8, root: 50, mode: 'phrygdom', prog: [0, 1, 0, 3, 0, 1, 4, 0], pad: 0.13, bass: 'half', arp: 'sk', arpAmp: 0.12, drums: { kick: 'x.......x.......', tak: '..x.x..x..x.x.x.', tom: '....x.......x..x' }, lead: 0.15, rev: 0.25 },
  battle_dark:     { bpm: 84, bars: 8, root: 40, mode: 'aeolian', prog: [0, 0, 5, 4, 0, 0, 3, 4], pad: 0.17, bass: 'drive', arp: 0, drums: { kick: 'x...x...x...x...', tom: '..x...x...x..x.x', snare: '........x.......' }, lead: 0.1, rev: 0.3 },
  battle_mythic:   { bpm: 96, bars: 8, root: 45, mode: 'harmin', prog: [0, 5, 3, 4, 0, 5, 6, 4], pad: 0.12, bass: 'half', arp: 0, drums: { kick: 'x.......x.......', tom: '....x.......x...' }, lead: 0.12, choir: 0.22, rev: 0.4 },
  battle_brass:    { bpm: 112, bars: 8, root: 48, mode: 'dorian', prog: [0, 3, 4, 0, 5, 3, 4, 0], pad: 0.1, bass: 'eighth', arp: 0, drums: { kick: 'x...x...x...x...', snare: '....x.......x...', tom: '..x...x.....x.x.' }, lead: 0.22, brassChord: 0.2, rev: 0.25 },
};
export const MUSIC_MOODS = Object.keys(MUSIC_SPECS);
export const THEME_TO_SYNTH_BATTLE = { greek: 'battle_heroic', roman: 'battle_heroic', egypt: 'battle_eastern', persian: 'battle_eastern', barbarian: 'battle_dark', alpine: 'battle_dark', styx: 'battle_dark', mythic: 'battle_mythic', olympus: 'battle_mythic', carthage: 'battle_brass' };
export function synthMusicSpecFor(mood, theme) { return MUSIC_SPECS[mood === 'battle' ? (THEME_TO_SYNTH_BATTLE[theme] || 'battle_heroic') : mood] || MUSIC_SPECS.menu; }

function padVoice(L, R, t0, dur, f, amp, pan, sr, rng) {
  const n = Math.round(dur * sr), o = Math.round(t0 * sr), lp = new BQ(sr).set('lp', 1100, 0.8), det = [0.994, 1.0, 1.006];
  const ph = [rng(), rng(), rng()];
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), a = Math.min(dur * 0.4, 0.5), r = Math.min(dur * 0.4, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sr; let s = 0;
    for (let j = 0; j < 3; j++) { ph[j] += f * det[j] / sr; s += (ph[j] - Math.floor(ph[j])) * 2 - 1; }
    s = lp.p(s / 3) * amp * Math.min(1, t / a) * Math.min(1, (dur - t) / r);
    const idx = o + i; if (idx >= L.length) break; L[idx] += s * gl; R[idx] += s * gr;
  }
}
function pluckVoice(L, R, t0, f, amp, pan, sr) {
  const n = Math.round(0.5 * sr), o = Math.round(t0 * sr), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const t = i / sr, s = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.12 * Math.sin(TAU * f * 3 * t)) * amp * Math.exp(-t / 0.18) * Math.min(1, t / 0.003); const idx = o + i; if (idx >= L.length) break; L[idx] += s * gl; R[idx] += s * gr; }
}
function bassVoice(L, R, t0, dur, f, amp, sr) {
  const n = Math.round(dur * sr), o = Math.round(t0 * sr); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += f / sr; const s = (Math.sin(TAU * ph) + 0.4 * (4 * Math.abs(ph - Math.floor(ph + 0.5)) - 1)) * amp * Math.min(1, t / 0.01) * Math.exp(-t / (dur * 0.9)); const idx = o + i; if (idx >= L.length) break; L[idx] += s; R[idx] += s; }
}
function drumHit(L, R, t0, kind, amp, sr, rng, pan = 0) {
  const o = Math.round(t0 * sr), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  const len = Math.round((kind === 'tom' ? 0.45 : kind === 'kick' ? 0.35 : 0.22) * sr); let ph = 0; const bp = new BQ(sr).set('bp', kind === 'snare' ? 1900 : 3200, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / sr; let s = 0;
    if (kind === 'kick') { ph += (38 + 90 * Math.exp(-t / 0.03)) / sr; s = Math.sin(TAU * ph) * Math.exp(-t / 0.11); }
    else if (kind === 'tom') { ph += (60 + 110 * Math.exp(-t / 0.05)) / sr; s = Math.sin(TAU * ph) * Math.exp(-t / 0.2) + 0.3 * (rng() * 2 - 1) * Math.exp(-t / 0.01); }
    else if (kind === 'snare') { ph += 190 / sr; s = bp.p(rng() * 2 - 1) * Math.exp(-t / 0.08) * 0.8 + Math.sin(TAU * ph) * Math.exp(-t / 0.05) * 0.4; }
    else { ph += 620 / sr; s = Math.sin(TAU * ph) * Math.exp(-t / 0.035) * 0.6 + bp.p(rng() * 2 - 1) * Math.exp(-t / 0.02) * 0.4; }   // tak
    const idx = o + i; if (idx >= L.length) break; L[idx] += s * amp * gl; R[idx] += s * amp * gr;
  }
}
function brassNote(L, R, t0, dur, f, amp, sr, pan = 0) {
  const n = Math.round(dur * sr), o = Math.round(t0 * sr), lp = new BQ(sr); let ph = 0;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const t = i / sr, e = Math.min(1, t / 0.06) * Math.min(1, (dur - t) / 0.12); if ((i & 15) === 0) lp.set('lp', 500 + 3500 * e, 0.9); ph += f / sr; const s = lp.p((ph - Math.floor(ph)) * 2 - 1) * amp * e; const idx = o + i; if (idx >= L.length) break; L[idx] += s * gl; R[idx] += s * gr; }
}
function choirChord(L, R, t0, dur, freqs, amp, sr, rng) {
  const vow = ['a', 'o', 'u']; const o = Math.round(t0 * sr);
  freqs.forEach((f, ci) => {
    const F = VOW[vow[ci % 3]], res = F.map((ff, i) => new BQ(sr).set('bp', ff, [6, 8, 10][i])), n = Math.round(dur * sr); let ph = rng();
    for (let i = 0; i < n; i++) { const t = i / sr; ph += f * (1 + 0.004 * Math.sin(TAU * 5.2 * t + ci)) / sr; const src = (ph - Math.floor(ph)) * 2 - 1; let s = 0; for (let j = 0; j < 3; j++) s += res[j].p(src) * [1, 0.7, 0.35][j]; s *= amp * Math.min(1, t / (dur * 0.35)) * Math.min(1, (dur - t) / (dur * 0.3)); const idx = o + i; if (idx >= L.length) break; const p = (ci - 1) * 0.4; L[idx] += s * Math.cos((p + 1) * Math.PI / 4); R[idx] += s * Math.sin((p + 1) * Math.PI / 4); }
  });
}

/**
 * Render a looping stereo music bed. Returns {L, R, sr, dur}. Notes whose tails pass the end are folded onto the start so the
 * loop is seamless.
 */
export function renderMusic(mood, theme, sr = SYNTH_SR) {
  const g = renderMusicGen(mood, theme, sr); let r;
  while (!(r = g.next()).done);
  return r.value;
}
/** generator form: yields once per bar so an async caller can give the main thread back between slices */
export function* renderMusicGen(mood, theme, sr = SYNTH_SR) {
  const sp = synthMusicSpecFor(mood, theme), rng = mulberry32(hashStr(mood + ':' + (theme || '')) + 12345);
  const spb = 60 / sp.bpm, bar = 4 * spb, s16 = spb / 4, total = sp.bars * bar, tail = 1.2;
  const n = Math.round((total + tail) * sr), L = new Float32Array(n), R = new Float32Array(n);
  const D = (b, d) => degNote(sp.root, sp.mode, d + sp.prog[b % sp.prog.length]);
  for (let b = 0; b < sp.bars; b++) {
    const t0 = b * bar;
    if (sp.pad) { for (let i = 0; i < 3; i++) { padVoice(L, R, t0, bar * 1.04, note(D(b, [0, 2, 4][i]) + 12), sp.pad * 0.5, (i - 1) * 0.5, sr, rng); yield (b + i / 3) / sp.bars; } }
    // bass
    const bn = note(D(b, 0) - 12);
    if (sp.bass === 'half') { bassVoice(L, R, t0, bar * 0.48, bn, 0.34, sr); bassVoice(L, R, t0 + bar * 0.5, bar * 0.48, bn * (b % 2 ? 1.5 : 1), 0.28, sr); }
    else if (sp.bass === 'eighth' || sp.bass === 'drive') for (let i = 0; i < 8; i++) bassVoice(L, R, t0 + i * spb / 2, spb * 0.45, bn * (i % 4 === 3 ? 1.5 : 1), sp.bass === 'drive' ? 0.34 : 0.26, sr);
    else if (sp.bass === 'oompah') for (let i = 0; i < 4; i++) { if (i % 2 === 0) bassVoice(L, R, t0 + i * spb, spb * 0.4, bn * (i === 2 ? 1.5 : 1), 0.32, sr); else [0, 2, 4].forEach((d) => pluckVoice(L, R, t0 + i * spb, note(D(b, d) + 12), 0.1, 0.1, sr)); }
    // arpeggio / pluck
    if (sp.arp) for (let i = 0; i < 8; i++) { const idx = sp.arp === 'up8' ? [0, 2, 4, 7, 4, 2, 7, 9][i] : [0, 4, 2, 5, 4, 7, 5, 2][i]; pluckVoice(L, R, t0 + i * spb / 2, note(D(b, idx) + 12), sp.arpAmp || 0.1, ((i % 4) - 1.5) * 0.3, sr); }
    // lead (long modal line) / brass chords / choir
    if (sp.lead) { const motif = sp.polka ? [4, 2, 4, 5] : [4, 5, 4, 2, 0, 2, 4, 1]; const m = motif.length; for (let i = 0; i < 4; i++) brassNote(L, R, t0 + i * spb, spb * 0.9, note(D(b, motif[(i + (b % 2) * 4) % m]) + 12), sp.lead * 0.5, sr, 0.15); }
    if (sp.polka) for (let i = 0; i < 8; i++) { const d = [4, 7, 5, 4, 7, 9, 7, 4][i]; pluckVoice(L, R, t0 + i * spb / 2, note(D(b, d) + 12), 0.2, ((i % 3) - 1) * 0.3, sr); bassVoice(L, R, t0 + i * spb / 2, spb * 0.2, note(D(b, d) - 12) * 2, 0.05, sr); }
    if (sp.brassChord && b % 2 === 0) [0, 2, 4].forEach((d, i) => brassNote(L, R, t0, bar * 0.9, note(D(b, d)), sp.brassChord * 0.4, sr, (i - 1) * 0.3));
    if (sp.choir) { choirChord(L, R, t0, bar * 1.9, [0, 2, 4].map((d) => note(D(b, d) + 12)), sp.choir * 0.5, sr, rng); yield b / sp.bars; }
    // drums
    const dr = sp.drums;
    for (const kind of Object.keys(dr)) for (let i = 0; i < 16; i++) if (dr[kind][i] === 'x') drumHit(L, R, t0 + i * s16 + (kind === 'tak' ? 0 : 0), kind, kind === 'kick' ? 0.8 : kind === 'tom' ? 0.6 : 0.4, sr, rng, kind === 'tom' ? ((i % 4) - 1.5) * 0.25 : 0);
    yield b / sp.bars;
  }
  // fold the tail onto the head so the loop is seamless
  const loopN = Math.round(total * sr);
  for (let i = 0; i < n - loopN; i++) { L[i] += L[loopN + i]; R[i] += R[loopN + i]; }
  const oL = L.slice(0, loopN), oR = R.slice(0, loopN);
  // cheap stereo space: two feedback combs per channel
  const rv = sp.rev || 0;
  if (rv > 0) {
    const dl = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => Math.round(s * sr)), buf = [oL, oR];
    for (let c = 0; c < 2; c++) {
      const src = buf[c], wet = new Float32Array(loopN);
      for (let j = 0; j < 4; j++) { const d = dl[(j + c * 2) % 4], fb = 0.62 + 0.04 * j; const line = new Float32Array(d); let w = 0, lpz = 0; for (let i = 0; i < loopN; i++) { const y = line[w]; lpz += (y - lpz) * 0.35; wet[i] += y * 0.25; line[w] = src[i] + lpz * fb; if (++w >= d) w = 0; if ((i & 65535) === 65535) yield 1; } yield 1; }
      for (let i = 0; i < loopN; i++) src[i] += wet[i] * rv;
    }
  }
  // level: peak <= 0.85, rms about -17 dBFS
  let pk = 0, ss = 0; for (let i = 0; i < loopN; i++) { pk = Math.max(pk, Math.abs(oL[i]), Math.abs(oR[i])); ss += oL[i] * oL[i] + oR[i] * oR[i]; }
  const rms = Math.sqrt(ss / (2 * loopN)) || 1, g = Math.min(0.85 / (pk || 1), 0.14 / rms);
  for (let i = 0; i < loopN; i++) { oL[i] *= g; oR[i] *= g; }
  return { L: oL, R: oR, sr, dur: total };
}
