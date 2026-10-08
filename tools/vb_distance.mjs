#!/usr/bin/env node
// tools/vb_distance.mjs: the VB (visual bible) measurement library + report CLI.
// Owner DESIGN-ERA (spec/VB). Consumer: tools/vbscan.mjs (ER3b, TOOLS-VERIFY) imports everything exported here; nothing else may
// re-implement CIEDE2000, the CVD matrices or the shape rules. Pure Node 22, no dependencies, no network, deterministic.
//
//   node tools/vb_distance.mjs selftest                       CIEDE2000 vs the 34 published pairs, CVD invariants, every negative control of vb_data.json
//   node tools/vb_distance.mjs pair '#rrggbb' '#rrggbb'        dE00 of two colours and the three CVD views
//   node tools/vb_distance.mjs report [--json] [--section s] [--data f]
//        sections: primaries pairs colours bodies graded banned team teammean emblems layouts markings rejects arenas looks chrome decisions corpus all (default: all but corpus)
//   node tools/vb_distance.mjs check [--data f]               exit 0 only if every hard rule of vb_data.json holds (spec/VB 4, what `vbscan --stage=palette` runs)
//
// Metric (spec/VB 3.1): CIEDE2000 (Sharma, Wu, Dalal 2005), kL = kC = kH = 1, Lab from 8-bit sRGB via linear sRGB -> XYZ (D65) -> Lab (D65 white).
// CVD (spec/VB 3.8): Machado, Oliveira, Fernandes 2009, severity 1.0, matrices applied in LINEAR sRGB, clamp 0..1, back to sRGB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DATA = path.join(ROOT, 'docs/eras/spec/vb_data.json');

// ================================================================================================ colour maths
export const hexToRgb = (h) => {
  let s = String(h).trim().replace(/^#|^0x/i, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error(`bad colour '${h}'`);
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
export const intToHex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
export const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const toLin = (c8) => { const c = c8 / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const fromLin = (c) => { const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, v)) * 255; };
export const rgbToLinear = (rgb) => rgb.map(toLin);
export const linearToRgb = (lin) => lin.map(fromLin);

const XN = 0.95047, YN = 1.0, ZN = 1.08883;
const labF = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
/** linear sRGB [0..1]^3 -> Lab (D65). */
export function linearToLab(l) {
  const X = (0.4124564 * l[0] + 0.3575761 * l[1] + 0.1804375 * l[2]) / XN;
  const Y = (0.2126729 * l[0] + 0.7151522 * l[1] + 0.0721750 * l[2]) / YN;
  const Z = (0.0193339 * l[0] + 0.1191920 * l[1] + 0.9503041 * l[2]) / ZN;
  const fx = labF(X), fy = labF(Y), fz = labF(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export const rgbToLab = (rgb) => linearToLab(rgb.map(toLin));
const LAB_MEMO = new Map();   // pure function of the string: safe to memoise
export const hexToLab = (h) => { let v = LAB_MEMO.get(h); if (!v) { v = rgbToLab(hexToRgb(h)); if (LAB_MEMO.size < 200000) LAB_MEMO.set(h, v); } return v; };

const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
const P25_7 = Math.pow(25, 7);
/** CIEDE2000 between two Lab triples (Sharma, Wu, Dalal 2005, kL = kC = kH = 1). */
export function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const Cb7 = Math.pow(Cb, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + P25_7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = deg(Math.atan2(b1, a1p)); if (h1p < 0) h1p += 360;
  let h2p = deg(Math.atan2(b2, a2p)); if (h2p < 0) h2p += 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else hbp = (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos(rad(hbp - 30)) + 0.24 * Math.cos(rad(2 * hbp)) + 0.32 * Math.cos(rad(3 * hbp + 6)) - 0.20 * Math.cos(rad(4 * hbp - 63));
  const dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + P25_7));
  const Sl = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(rad(2 * dTh)) * Rc;
  const x = dLp / Sl, y = dCp / Sc, z = dHp / Sh;
  return Math.sqrt(x * x + y * y + z * z + Rt * y * z);
}
export const dE = (hexA, hexB) => ciede2000(hexToLab(hexA), hexToLab(hexB));

// ================================================================================================ CVD (Machado 2009, severity 1.0, linear sRGB)
// Source: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html as tabulated in the daltonlens 0.1.5 wheel
// (PyPI, simulate.py machado_2009_matrices[...][10], MIT); retrieved 2026-10-08 and compared digit for digit with the values below.
export const CVD_KINDS = ['normal', 'protan', 'deutan', 'tritan'];
export const CVD_MATRIX = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
/** rgb 0..255 -> rgb 0..255 as seen with the deficiency. */
export function cvdRgb(rgb, kind) {
  if (!kind || kind === 'normal') return rgb.slice();
  const M = CVD_MATRIX[kind]; if (!M) throw new Error('unknown cvd ' + kind);
  const l = rgb.map(toLin);
  const o = [0, 1, 2].map((i) => Math.max(0, Math.min(1, M[i][0] * l[0] + M[i][1] * l[1] + M[i][2] * l[2])));
  return o.map(fromLin);
}
export const cvdLab = (hex, kind) => rgbToLab(cvdRgb(hexToRgb(hex), kind));
export const dECvd = (hexA, hexB, kind) => ciede2000(cvdLab(hexA, kind), cvdLab(hexB, kind));

// ================================================================================================ set matching (pairs, triples)
function perms(n) {
  if (n === 1) return [[0]];
  const out = [];
  for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) { const q = p.slice(); q.splice(i, 0, n - 1); out.push(q); }
  return out;
}
const PERMS = { 1: perms(1), 2: perms(2), 3: perms(3) };
function combos(n, k) {
  const out = [];
  const rec = (start, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  return out;
}
/**
 * Distance between a palette SET (hex list) and a reference tuple (hex list of size 1..3): the best assignment of the reference
 * elements onto distinct elements of the set (subset and order free). `max` is the "max element dE00" of the bibles: the set approaches
 * the reference only if EVERY reference element has a close partner. Returns { max, mean, assign:[[setHex, refHex, dE]...] }.
 */
export function setVsRef(setHex, refHex) {
  const k = refHex.length;
  if (setHex.length < k) return { max: Infinity, mean: Infinity, assign: [] };
  const sl = setHex.map(hexToLab), rl = refHex.map(hexToLab);
  let best = null;
  for (const sub of combos(setHex.length, k)) {
    for (const p of PERMS[k]) {
      let mx = 0, sum = 0; const ds = [];
      for (let i = 0; i < k; i++) { const d = ciede2000(sl[sub[p[i]]], rl[i]); ds.push(d); if (d > mx) mx = d; sum += d; }
      const mean = sum / k;
      if (!best || mx < best.max - 1e-12 || (Math.abs(mx - best.max) <= 1e-12 && mean < best.mean)) best = { max: mx, mean, assign: ds.map((d, i) => [setHex[sub[p[i]]], refHex[i], d]) };
    }
  }
  return best;
}
/** Banding of a max-element distance: BLOCK (< block), RESTRICT (< clear), CLEAR. */
export const band = (m, block, clear) => (m < block ? 'BLOCK' : m < clear ? 'RESTRICT' : 'CLEAR');

/** Expand a reference list into scan tuples: singles, pairs, triples and the three sub-pairs of every triple (flag `sub`). */
export function expandRefs(refs) {
  const out = [];
  for (const r of refs) {
    const c = r.colours;
    out.push({ id: r.id, ref: r.id, cls: r.class, colours: c, sub: false });
    if (c.length === 3) { out.push({ id: r.id + '/ab', ref: r.id, cls: r.class, colours: [c[0], c[1]], sub: true }, { id: r.id + '/ac', ref: r.id, cls: r.class, colours: [c[0], c[2]], sub: true }, { id: r.id + '/bc', ref: r.id, cls: r.class, colours: [c[1], c[2]], sub: true }); }
  }
  return out;
}

// ================================================================================================ lighting grade model (pre-pass, spec/VB 3.3.3)
/**
 * A deliberately simple model of how a THEME_LOOK row (spec/RA 3.10) changes a lit surface colour: light = 0.6 sun + 0.4 hemisphere,
 * then exposure, then saturation about luma, then contrast about mid grey, all on display values. It is a SENSITIVITY pre-pass for the
 * palette tests; ER17 (rendered frames) remains the arbiter. look = { sun: hex|null, sunMul, hemiMul, exposure, saturation, contrast }.
 */
export function gradeRgb(hex, look) {
  const sun = (look.sun ? rgbToLinear(hexToRgb(look.sun)) : [1, 1, 1]).map((v) => v * (look.sunMul ?? 1));
  const L = sun.map((v) => 0.6 * v + 0.4 * (look.hemiMul ?? 1));
  const lin = rgbToLinear(hexToRgb(hex)).map((v, i) => v * L[i] * (look.exposure ?? 1));
  let rgb = linearToRgb(lin);
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  rgb = rgb.map((v) => y + (v - y) * (look.saturation ?? 1));
  return rgb.map((v) => Math.max(0, Math.min(255, (v - 128) * (look.contrast ?? 1) + 128)));
}
export const gradeLab = (hex, look) => rgbToLab(gradeRgb(hex, look));
export const gradeHex = (hex, look) => rgbToHex(gradeRgb(hex, look));

// ================================================================================================ team tint model (spec/VB 3.7)
const mixLin = (items) => { const o = [0, 0, 0]; for (const [w, l] of items) for (let i = 0; i < 3; i++) o[i] += w * l[i]; return o; };
/** The colour a tint-carrier voxel shows: base voxel colour x team colour per channel in linear light (voxskin.js: vColor *= instanceColor). */
export function carrierColour(baseHex, teamHex) {
  const b = rgbToLinear(hexToRgb(baseHex)), t = rgbToLinear(hexToRgb(teamHex));
  return rgbToHex(linearToRgb([b[0] * t[0], b[1] * t[1], b[2] * t[2]]));
}
/** Mean colour of a unit: (1 - s) body + s carrier, mixed in linear light. */
export function unitMean(bodyHexes, carrierHex, s) {
  const body = mixLin(bodyHexes.map((h) => [1 / bodyHexes.length, rgbToLinear(hexToRgb(h))]));
  return rgbToHex(linearToRgb(mixLin([[1 - s, body], [s, rgbToLinear(hexToRgb(carrierHex))]])));
}
/**
 * Static carrier-vs-body separation cells. For one faction body set (hex list, normally [primary, accent]) and the team palettes of
 * vb_data.team: one cell per (palette, team, view) in the palette's scope; a cell SEPARATES when the carrier differs from its nearest
 * body colour by dE00 >= body_dE or by |dL*| >= body_dL in that view.
 */
export function teamCells(team, bodyHex, th) {
  const cells = [];
  for (const [pn, pair] of Object.entries(team.palettes)) {
    for (let t = 0; t < 2; t++) {
      const car = carrierColour(team.carrier_base, pair[t]);
      for (const view of team.scopes[pn]) {
        const cl = cvdLab(car, view);
        let worst = { d: Infinity, dl: Infinity, body: null };
        for (const b of bodyHex) { const bl = cvdLab(b, view); const d = ciede2000(cl, bl); if (d < worst.d) worst = { d, dl: Math.abs(cl[0] - bl[0]), body: b }; }
        cells.push({ palette: pn, team: t, view, d: worst.d, dl: worst.dl, body: worst.body, ok: worst.d >= th.body_dE || worst.dl >= th.body_dL });
      }
    }
  }
  return cells;
}

// ================================================================================================ bitmaps: emblems, templates, glyphs
export function parseBitmap(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const g = new Uint8Array(w * h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) g[y * w + x] = r[x] === '#' ? 1 : 0; });
  return { w, h, g };
}
export function bitmapHash(rows) { // FNV-1a 32 over "w,h:" + rows joined with '/'; stable and dependency-free
  const s = `${Math.max(...rows.map((r) => r.length))},${rows.length}:` + rows.join('/');
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const rotB = (s) => { const g = new Uint8Array(s.w * s.h); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) g[x * s.h + (s.h - 1 - y)] = s.g[y * s.w + x]; return { w: s.h, h: s.w, g }; };
const flipB = (s) => { const g = new Uint8Array(s.w * s.h); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) g[y * s.w + (s.w - 1 - x)] = s.g[y * s.w + x]; return { w: s.w, h: s.h, g }; };
/** The 8 dihedral variants (4 rotations x mirror): rotating or mirroring an emblem can never create a banned shape unseen. */
export function dihedral(b) { const out = []; let c = b; for (let i = 0; i < 4; i++) { out.push(c); out.push(flipB(c)); c = rotB(c); } return out; }
function cropB(b) {
  let x0 = b.w, x1 = -1, y0 = b.h, y1 = -1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.g[y * b.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { w: 1, h: 1, g: new Uint8Array(1) };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = b.g[(y0 + y) * b.w + x0 + x];
  return { w, h, g };
}
function resampleB(b, W, H) { // box filter, threshold 0.5
  const g = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xa = x * b.w / W, xb = (x + 1) * b.w / W, ya = y * b.h / H, yb = (y + 1) * b.h / H; let sum = 0, area = 0;
    for (let yy = Math.floor(ya); yy < Math.ceil(yb); yy++) for (let xx = Math.floor(xa); xx < Math.ceil(xb); xx++) {
      const wx = Math.min(xb, xx + 1) - Math.max(xa, xx), wy = Math.min(yb, yy + 1) - Math.max(ya, yy); if (wx <= 0 || wy <= 0) continue;
      sum += wx * wy * b.g[yy * b.w + xx]; area += wx * wy;
    }
    g[y * W + x] = area && sum / area >= 0.5 ? 1 : 0;
  }
  return { w: W, h: H, g };
}
const padB = (b, n) => { const w = b.w + 2 * n, h = b.h + 2 * n, g = new Uint8Array(w * h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) g[(y + n) * w + x + n] = b.g[y * b.w + x]; return { w, h, g }; };
const jaccard = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] & b[k]) i++; if (a[k] | b[k]) u++; } return u ? i / u : 0; };
/** Best Jaccard of template t over every placement in bitmap b (native scale, sliding window). */
export function windowBest(b, t) {
  let best = 0;
  for (let y0 = 0; y0 <= b.h - t.h; y0++) for (let x0 = 0; x0 <= b.w - t.w; x0++) {
    let inter = 0, uni = 0;
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { const a = b.g[(y0 + y) * b.w + x0 + x], c = t.g[y * t.w + x]; if (a & c) inter++; if (a | c) uni++; }
    const j = uni ? inter / uni : 0; if (j > best) best = j;
  }
  return best;
}
/** Template hits: `window` (native-scale sliding, flag-size faces) and `whole` (bbox crop resampled to the template size, emblem scale). */
export function templateHits(b, templates, mode = 'both') {
  const hits = [], crop = cropB(b);
  for (const tp of templates) {
    const t = parseBitmap(tp.rows);
    if ((mode === 'both' || mode === 'window') && tp.window != null) {
      let best = 0; for (const v of dihedral(t)) best = Math.max(best, windowBest(b, v));
      if (best >= tp.window) hits.push({ id: tp.id, kind: tp.kind, mode: 'window', jaccard: +best.toFixed(3), limit: tp.window });
    }
    if ((mode === 'both' || mode === 'whole') && tp.whole != null) {
      let best = 0; for (const v of dihedral(t)) best = Math.max(best, jaccard(resampleB(crop, v.w, v.h).g, v.g));
      if (best >= tp.whole) hits.push({ id: tp.id, kind: tp.kind, mode: 'whole', jaccard: +best.toFixed(3), limit: tp.whole });
    }
  }
  return hits;
}
/** Letter / digit hit: bbox crop resampled to 5x7 (and 7x5 for rotated glyphs) against the 5x7 font table, any of the 8 variants. */
export function glyphHits(b, glyphs, limit) {
  const crop = cropB(b); const hits = []; let n = 0; for (const v of crop.g) n += v; if (n < 6) return hits;
  for (const [ch, rows] of Object.entries(glyphs)) {
    let best = 0; for (const v of dihedral(parseBitmap(rows))) best = Math.max(best, jaccard(resampleB(crop, v.w, v.h).g, v.g));
    if (best >= limit) hits.push({ glyph: ch, jaccard: +best.toFixed(3) });
  }
  return hits;
}
/** Symmetry scores: share of the union matched by the rotated or mirrored copy (1.0 = fully symmetric). */
export function symmetry(b) {
  const { w, h, g } = b; const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x]);
  const s = (f) => { let i = 0, u = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = g[y * w + x], c = f(x, y); if (a & c) i++; if (a | c) u++; } return u ? i / u : 1; };
  return { rot90: w === h ? s((x, y) => at(y, w - 1 - x)) : 0, rot180: s((x, y) => at(w - 1 - x, h - 1 - y)), mirrorV: s((x, y) => at(w - 1 - x, y)), mirrorH: s((x, y) => at(x, h - 1 - y)), diag: w === h ? Math.max(s((x, y) => at(y, x)), s((x, y) => at(h - 1 - y, w - 1 - x))) : 0 };
}
/** Share of set pixels explained by the best thin (<= 2) horizontal bar and thin vertical bar that cross in the middle half, each spanning >= span of the extent. */
export function crossScore(b, span = 0.75) {
  const { w, h, g } = b; let n = 0; for (const v of g) n += v; if (!n) return 0;
  const rows = [], cols = [];
  for (let y = 0; y < h; y++) { let c = 0; for (let x = 0; x < w; x++) c += g[y * w + x]; rows.push(c); }
  for (let x = 0; x < w; x++) { let c = 0; for (let y = 0; y < h; y++) c += g[y * w + x]; cols.push(c); }
  let best = 0;
  for (let th = 1; th <= 2; th++) for (let y0 = 0; y0 + th <= h; y0++) {
    if (y0 + th / 2 < h * 0.25 || y0 + th / 2 > h * 0.75 + 0.01) continue;
    if (th > 0.4 * h) continue;                                   // a bar thicker than 40 percent of the extent is a block, not an arm
    let okh = true; for (let y = y0; y < y0 + th; y++) if (rows[y] < span * w) okh = false; if (!okh) continue;
    for (let tw = 1; tw <= 2; tw++) for (let x0 = 0; x0 + tw <= w; x0++) {
      if (x0 + tw / 2 < w * 0.25 || x0 + tw / 2 > w * 0.75 + 0.01) continue;
      if (tw > 0.4 * w) continue;
      let okv = true; for (let x = x0; x < x0 + tw; x++) if (cols[x] < span * h) okv = false; if (!okv) continue;
      let u = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!g[y * w + x]) continue; if ((y >= y0 && y < y0 + th) || (x >= x0 && x < x0 + tw)) u++; }
      if (u / n > best) best = u / n;
    }
  }
  return best;
}
/** Stripe pattern in a 1-bit bitmap: rows (or columns) are all-set or all-clear, no partial line, number of alternating runs (>= 3 = a three-band reading). */
export function stripeRuns(b) {
  const { w, h, g } = b;
  const test = (len, cnt, at) => {
    const kinds = []; for (let i = 0; i < len; i++) { let c = 0; for (let j = 0; j < cnt; j++) c += at(i, j); kinds.push(c === cnt ? 1 : (c === 0 ? 0 : 2)); }
    if (kinds.includes(2)) return 0; const runs = []; for (const k of kinds) { if (!runs.length || runs[runs.length - 1] !== k) runs.push(k); } return runs.length;
  };
  return Math.max(test(h, w, (i, j) => g[i * w + j]), test(w, h, (i, j) => g[j * w + i]));
}
/**
 * The rasterised emblem check (spec/VB 3.5). rows: array of strings ('#' set). data: vb_data.json (templates, glyphs, thresholds.emblem).
 * Returns { pass, reasons[], metrics }. Every rule is evaluated on all 8 dihedral variants (templates, glyphs) or is rotation invariant.
 */
export function evalEmblem(rows, data) {
  const th = data.thresholds.emblem, b = parseBitmap(rows); let n = 0; for (const v of b.g) n += v;
  const sym = symmetry(b), cs = crossScore(b, th.cross_span), runs = stripeRuns(b);
  const hits = templateHits(padB(b, 2), data.templates), gh = glyphHits(b, data.glyphs, th.glyph);
  const mir = Math.max(sym.mirrorV, sym.mirrorH, sym.diag);
  const pinwheel = sym.rot90 >= th.pinwheel_rot90 && mir <= th.pinwheel_mirror;
  const reasons = [];
  if (b.w > th.max_w || b.h > th.max_h) reasons.push(`size ${b.w}x${b.h} > ${th.max_w}x${th.max_h}`);
  if (n < th.min_n) reasons.push(`n ${n} < ${th.min_n}`);
  for (const h of hits) reasons.push(`template:${h.id}(${h.mode})@${h.jaccard}`);
  for (const h of gh) reasons.push(`glyph:${h.glyph}@${h.jaccard}`);
  if (cs >= th.cross_bars) reasons.push(`cross_bars@${cs.toFixed(2)}`);
  if (pinwheel) reasons.push(`pinwheel(rot90 ${sym.rot90.toFixed(2)}, mirror ${mir.toFixed(2)})`);
  if (runs >= th.stripe_runs) reasons.push(`stripe_runs=${runs}`);
  return { pass: reasons.length === 0, reasons, metrics: { w: b.w, h: b.h, n, rot90: +sym.rot90.toFixed(2), mirror: +mir.toFixed(2), cross: +cs.toFixed(2), stripeRuns: runs, hash: bitmapHash(rows) } };
}

// ================================================================================================ flag-size faces (cloth, tabard, shield face, caparison, board)
/**
 * Classify a 2-D colour-class grid g (Int16Array W*H, -1 = empty) of one outer face of a flag-role part (spec/VB 3.8.2).
 * kind: plain | charge | split (2 stripe runs) | bands (>= 3) | check (lattice incl. lozenge) | diagonal (line texture) | mottle | mixed | small | sparse | empty.
 * Stripes: >= 85 percent of rows (or columns) uniform in one class and >= 2 runs. Lattice: >= 4 shifts (|d| in 2..12) with self-similarity
 * >= 0.92, >= 2 shifts (|d| <= 3) with self-similarity <= 0.30 and two independent high shifts (a checker or a rotated checker; blotches fail the test).
 */
export function faceLayout(g, W, H) {
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] >= 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { kind: 'empty' };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, at = (x, y) => g[(y0 + y) * W + x0 + x];
  const cnt = new Map(); let filled = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = at(x, y); if (c >= 0) { filled++; cnt.set(c, (cnt.get(c) || 0) + 1); } }
  const classes = [...cnt.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n, share: +(n / filled).toFixed(3) }));
  const out = { w, h, filled, classes, kind: 'plain' };
  if (w < 3 || h < 3) { out.kind = 'small'; return out; }
  if (filled < 0.6 * w * h) { out.kind = 'sparse'; return out; }
  if (classes.length < 2) return out;
  const stripes = (len, cn, get) => {
    const cls = []; let uni = 0;
    for (let i = 0; i < len; i++) { const s = new Set(); for (let j = 0; j < cn; j++) { const c = get(i, j); if (c >= 0) s.add(c); } if (s.size === 1) { uni++; cls.push([...s][0]); } else cls.push(-2); }
    if (uni < 0.85 * len) return null;
    const runs = []; for (const c of cls) { if (c === -2) continue; if (!runs.length || runs[runs.length - 1].c !== c) runs.push({ c, n: 1 }); else runs[runs.length - 1].n++; }
    return runs.length >= 2 ? runs : null;
  };
  const hs = stripes(h, w, (i, j) => at(j, i)), vs = stripes(w, h, (i, j) => at(i, j)), pick = hs || vs;
  if (pick) { out.kind = pick.length === 2 ? 'split' : 'bands'; out.axis = hs ? 'h' : 'v'; out.runs = pick; out.bands = pick.length; return out; }
  const m = (dx, dy) => { let eq = 0, tot = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const a = at(x, y), b = at(xx, yy); if (a < 0 || b < 0) continue; tot++; if (a === b) eq++; } return tot >= 0.4 * w * h ? eq / tot : -1; };
  const hi = [], lo = [], R = Math.min(12, Math.max(w, h) >> 1);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (!dx && !dy) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); const v = m(dx, dy); if (v < 0) continue;
    if (d >= 2 && v >= 0.92) hi.push([dx, dy]); if (d <= Math.max(3, R >> 1) && v <= 0.35) lo.push([dx, dy]);
  }
  let indep = false; for (let i = 0; i < hi.length && !indep; i++) for (let j = i + 1; j < hi.length; j++) if (hi[i][0] * hi[j][1] - hi[i][1] * hi[j][0] !== 0) { indep = true; break; }
  out.hi = hi.length; out.lo = lo.length;
  const unit = [[1, 1], [1, -1], [1, 0], [0, 1]].map(([dx, dy]) => m(dx, dy)); // a unit shift that leaves the texture unchanged = line texture (diagonal stripes)
  if (((unit[0] >= 0.95) !== (unit[1] >= 0.95)) && classes[1].share >= 0.2) { out.kind = 'diagonal'; return out; }
  if (hi.length >= 4 && lo.length >= 2 && indep) { out.kind = 'check'; return out; }
  if (classes[0].share >= 0.6) { out.kind = 'charge'; return out; }
  // mottle: three or more colour classes of >= 12 percent each with no stripe or lattice structure (camouflage-like blotches)
  out.kind = classes.filter((c) => c.share >= 0.12).length >= 3 ? 'mottle' : 'mixed';
  return out;
}
/**
 * Registered pattern test (spec/VB 3.5.5): the face's two colour classes must tile one of data.patterns[] (tile rows, '#' = class B) under some
 * phase and class assignment with >= 95 percent of cells equal, and both class colours must lie within 12 of the pattern's registered pair.
 */
export function matchPattern(g, W, H, classHex, data) {
  const cnt = new Map(); for (let i = 0; i < g.length; i++) if (g[i] >= 0) cnt.set(g[i], (cnt.get(g[i]) || 0) + 1);
  const cls = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]); if (cls.length !== 2) return null;
  for (const pat of data.patterns || []) {
    const tw = pat.rows[0].length, th = pat.rows.length;
    const okCol = (a, b) => (dE(classHex[cls[0]], a) <= 12 && dE(classHex[cls[1]], b) <= 12) || (dE(classHex[cls[0]], b) <= 12 && dE(classHex[cls[1]], a) <= 12);
    if (!okCol(pat.pair[0], pat.pair[1])) continue;
    for (let py = 0; py < th; py++) for (let px = 0; px < tw; px++) for (const swap of [0, 1]) {
      let eq = 0, tot = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[y * W + x]; if (c < 0) continue; tot++; const t = pat.rows[(y + py) % th][(x + px) % tw] === '#' ? 1 : 0; if ((c === cls[swap ? 0 : 1] ? 1 : 0) === t) eq++; }
      if (tot && eq / tot >= 0.95) return pat.id;
    }
  }
  return null;
}
/** Letter or digit windows (native 5x7 and rotations, no resampling) inside each class mask of a face. */
export function faceGlyphs(g0, W, H, data) {
  const g = stripRegistered(g0, W, H, data).g, lay = faceLayout(g, W, H), hits = [];
  for (const c of lay.classes || []) {
    const rows = []; for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += g[y * W + x] === c.id ? '#' : '.'; rows.push(r); }
    const b = parseBitmap(rows);
    for (const [ch, grows] of Object.entries(data.glyphs)) { let best = 0; for (const v of dihedral(parseBitmap(grows))) best = Math.max(best, windowBest(b, v)); if (best >= data.thresholds.model.face_glyph) hits.push({ cls: c.id, glyph: ch, jaccard: +best.toFixed(3) }); }
  }
  return hits;
}
/** Contacts (4-neighbour) between two colour classes that match a banned adjacency pair within tol. Returns the contact count per ban. */
export function adjacencyHits(g, W, H, classHex, bans, tol) {
  const near = (c, hex) => c >= 0 && classHex[c] && dE(classHex[c], hex) <= tol, out = [];
  for (const ban of bans) {
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = g[y * W + x]; if (a < 0) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) { const xx = x + dx, yy = y + dy; if (xx >= W || yy >= H) continue; const b = g[yy * W + xx]; if (b < 0 || a === b) continue; if ((near(a, ban.a) && near(b, ban.b)) || (near(a, ban.b) && near(b, ban.a))) n++; }
    }
    out.push({ ban: ban.id, contacts: n });
  }
  return out;
}
/**
 * Verdict for one face of a flag-role part: reasons[] (empty = pass). classHex maps class id -> hex. A face is checked against the banned
 * references when it is flag-like: split, bands or check anywhere; a charge/mixed face only when `flagRole` (cloth, tabard, shield, board).
 */
export function faceVerdict(g, W, H, classHex, flagRole, data, bans = []) {
  const reasons = [], th = data.thresholds, sh = faceShapes(g, W, H, data), lay = sh.layout;
  const dominant = (lay.classes || []).filter((c) => c.share >= 0.12).map((c) => classHex[c.id]).filter(Boolean);
  if (lay.kind === 'bands' && lay.bands >= 3) reasons.push(`layout:three_band(${lay.bands})`);
  for (const h of sh.hits) reasons.push(`shape:${h.kind}:${h.id}@${h.jaccard}`);
  for (const h of faceGlyphs(g, W, H, data)) reasons.push(`glyph:${h.glyph}@${h.jaccard}`);
  if (lay.kind === 'mottle') reasons.push('layout:mottle(camouflage-like)');
  const pattern = ['split', 'bands', 'check', 'diagonal', 'mixed'].includes(lay.kind) ? matchPattern(g, W, H, classHex, data) : null;
  const stripeLike = ['split', 'bands', 'check'].includes(lay.kind) && !pattern;                                    // restricted band applies
  const chargeLike = flagRole && ['charge', 'mixed', 'mottle', 'diagonal'].includes(lay.kind) && !pattern;          // only the BLOCK band applies to a charge on a field
  if ((stripeLike || chargeLike) && dominant.length >= 2) {
    const limit = stripeLike ? th.banned.clear : th.banned.block;
    for (const r of expandRefs(data.banned.refs)) {
      if (r.colours.length < 2) continue;
      const set = dominant.slice(0, 3); if (set.length < r.colours.length) continue;
      const res = setVsRef(set, r.colours); if (res.max < limit) { reasons.push(`ref:${r.id}@${res.max.toFixed(1)}(${lay.kind})`); break; }
    }
  }
  for (const a of adjacencyHits(g, W, H, classHex, bans, th.model.adjacency_tol)) if (a.contacts >= th.model.adjacency_min_contact) reasons.push(`adjacency:${a.ban}x${a.contacts}`);
  return { pass: reasons.length === 0, reasons, layout: lay.kind, pattern };
}
/** Humming-blade rule: a part that is >= 90 percent glow voxels, thin (cross-section <= 3x3) and long (>= 12 voxels). */
export function glowBlade(dims, glowShare, th) { const s = [...dims].sort((a, b) => a - b); return glowShare >= 0.9 && s[0] <= th.glow_blade_section && s[1] <= th.glow_blade_section && s[2] >= th.glow_blade_len; }
export function gridFromRows(rows, map) {
  const H = rows.length, W = Math.max(...rows.map((r) => r.length)), g = new Int16Array(W * H).fill(-1);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = r[x]; g[y * W + x] = c in map ? map[c] : -1; } });
  return { g, W, H };
}
/** Remove registered emblem placements (identity or left-right mirror, exact) from a face by painting them with the surrounding field class. */
export function stripRegistered(g, W, H, data) {
  const out = Int16Array.from(g), cnt = new Map(); for (const v of g) if (v >= 0) cnt.set(v, (cnt.get(v) || 0) + 1);
  const field = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]; if (!field) return { g: out, stripped: [] };
  const stripped = [];
  for (const e of data.emblems) {
    const eb = parseBitmap(e.rows);
    for (const v of [eb, flipB(eb)]) {
      for (const c of cnt.keys()) {
        if (c === field[0]) continue;
        for (let y0 = -1; y0 <= H - v.h + 1; y0++) for (let x0 = -1; x0 <= W - v.w + 1; x0++) {
          let ok = true;
          for (let y = -1; y <= v.h && ok; y++) for (let x = -1; x <= v.w && ok; x++) { const fx = x0 + x, fy = y0 + y, inside = x >= 0 && y >= 0 && x < v.w && y < v.h, want = inside ? v.g[y * v.w + x] : 0; const have = fx >= 0 && fy >= 0 && fx < W && fy < H && g[fy * W + fx] === c ? 1 : 0; if (have !== want && !(fx < 0 || fy < 0 || fx >= W || fy >= H)) ok = false; }
          if (ok) { for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) if (v.g[y * v.w + x]) out[(y0 + y) * W + x0 + x] = field[0]; stripped.push({ emblem: e.id, at: [x0, y0] }); }
        }
      }
    }
  }
  return { g: out, stripped };
}
/** Shape scan of a face: each class mask (share >= 15 percent) against the window templates and the cross-bar rule. */
export function faceShapes(g0, W, H, data) {
  const { g, stripped } = stripRegistered(g0, W, H, data), lay = faceLayout(g, W, H), hits = [];
  for (const c of lay.classes || []) {
    if (c.share < 0.15) continue;
    const rows = []; for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += g[y * W + x] === c.id ? '#' : '.'; rows.push(r); }
    const b = parseBitmap(rows);
    for (const h of templateHits(padB(b, 2), data.templates, 'both')) hits.push({ cls: c.id, ...h });
    const cs = crossScore(cropB(b), data.thresholds.model.face_cross_span);
    if (cs >= data.thresholds.emblem.cross_bars) hits.push({ cls: c.id, id: 'cross_bars', kind: 'cross', mode: 'bars', jaccard: +cs.toFixed(2), limit: data.thresholds.emblem.cross_bars });
  }
  return { layout: lay, hits, stripped };
}

// ================================================================================================ data and context
export function loadData(p = DEFAULT_DATA) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
/** Ancient sources: FACTIONS (display colours), the 8 workshop PALETTES, the per-faction unit paint constants, the 9 emblems. */
export async function loadAncient(root = ROOT) {
  const stats = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/stats.js')).href);
  const bp = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/blueprints.js')).href);
  const kit = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/parts/_kit.js')).href);
  const out = { factions: {}, workshop: [], unitPaint: {}, emblems: kit.EMBLEMS };
  for (const [id, f] of Object.entries(stats.FACTIONS)) out.factions[id] = { primary: intToHex(f.colors[0]), accent: intToHex(f.colors[1]), name: f.name };
  bp.PALETTES.forEach((p, i) => out.workshop.push({ id: 'ws' + i, primary: p.primary, accent: p.secondary, trim: p.trim, cloth: p.cloth }));
  for (const f of ['t0.js', 'units_a.js', 'units_b.js']) {
    const src = fs.readFileSync(path.join(root, 'src/content/era_ancient/units', f), 'utf8');
    for (const m of src.matchAll(/^const ([A-Z]+) = \{ primary: '(#[0-9a-fA-F]{6})', secondary: '(#[0-9a-fA-F]{6})', trim: '(#[0-9a-fA-F]{6})', metal: '(\w+)', cloth: '(#[0-9a-fA-F]{6})' \};/gm)) out.unitPaint[m[1]] = { primary: m[2], accent: m[3], trim: m[4], metal: m[5], cloth: m[6] };
  }
  return out;
}
/** Flatten vb_data + Ancient into one faction list with era, id, primary, accent, trim. */
export function factionList(data, A) {
  const list = [];
  for (const [id, f] of Object.entries(A.factions)) list.push({ era: 'ancient', id, name: f.name, primary: f.primary, accent: f.accent, trim: null });
  for (const [era, e] of Object.entries(data.eras)) for (const [id, f] of Object.entries(e.factions)) list.push({ era, id, name: f.name, primary: f.primary, accent: f.accent, trim: f.trim, row: f });
  return list;
}
const NEW_ERAS = ['medieval', 'modern', 'scifi'];

// ================================================================================================ report sections
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : 'inf');
function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

export function sectionPrimaries(data, A) {
  const F = factionList(data, A), th = data.thresholds.primary;
  const rows = [];
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j], d = dE(a.primary, b.primary), same = a.era === b.era;
    const limit = same ? th.in_era : th.cross_era, newer = a.era !== 'ancient' || b.era !== 'ancient';
    rows.push({ a: `${a.era}:${a.id}`, b: `${b.era}:${b.id}`, d, same, limit, newer, ok: !newer || d >= limit });
  }
  rows.sort((x, y) => x.d - y.d);
  const matrix = F.map((a) => F.map((b) => (a === b ? 0 : dE(a.primary, b.primary))));
  const stat = (pred) => { const r = rows.filter(pred)[0]; return r ? { d: r.d, a: r.a, b: r.b } : null; };
  const summary = {
    ancient_in_era: stat((r) => r.a.startsWith('ancient') && r.b.startsWith('ancient')),
    in_era: Object.fromEntries(['ancient', ...NEW_ERAS].map((e) => [e, stat((r) => r.same && r.a.startsWith(e + ':'))])),
    vs_ancient: Object.fromEntries(NEW_ERAS.map((e) => [e, stat((r) => !r.same && ((r.a.startsWith('ancient') && r.b.startsWith(e + ':')) || (r.b.startsWith('ancient') && r.a.startsWith(e + ':'))))])),
    cross_new: Object.fromEntries([['medieval', 'modern'], ['medieval', 'scifi'], ['modern', 'scifi']].map(([x, y]) => [x + '-' + y, stat((r) => (r.a.startsWith(x + ':') && r.b.startsWith(y + ':')) || (r.b.startsWith(x + ':') && r.a.startsWith(y + ':')))])),
  };
  return { ids: F.map((f) => `${f.era}:${f.id}`), matrix, rows, summary, violations: rows.filter((r) => !r.ok) };
}
export function sectionPairs(data, A) {
  const F = factionList(data, A), th = data.thresholds, out = { internal: [], accentVsPrimary: [], escape: [], violations: [] };
  for (const f of F) if (f.era !== 'ancient') {
    const d = dE(f.primary, f.accent); out.internal.push({ id: `${f.era}:${f.id}`, d, ok: d >= th.accent.internal_min });
    if (d < th.accent.internal_min) out.violations.push(`internal contrast ${f.era}:${f.id} ${f1(d)} < ${th.accent.internal_min}`);
    for (const g of F) if (g.era === f.era && g.id !== f.id) { const da = dE(f.accent, g.primary); out.accentVsPrimary.push({ a: `${f.era}:${f.id}`, b: g.id, d: da }); }   // informational (Ancient shipped 9.2): accents are small-area trim, only primaries must be separate
  }
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j]; if (a.era === 'ancient' && b.era === 'ancient') continue;
    const dp = dE(a.primary, b.primary), lim = a.era === b.era ? th.primary.in_era : th.primary.cross_era;
    if (dp < lim) { // a pair needing the accent escape (only cross-era)
      const da = dE(a.accent, b.accent), ok = a.era !== b.era && dp >= th.primary.escape_floor && da >= th.primary.escape_accent_min;
      out.escape.push({ a: `${a.era}:${a.id}`, b: `${b.era}:${b.id}`, dPrimary: dp, dAccent: da, ok });
      if (!ok) out.violations.push(`primary pair ${a.era}:${a.id} / ${b.era}:${b.id} ${f1(dp)} < ${lim} and no accent escape (accent ${f1(da)})`);
    }
  }
  return out;
}
export function sectionGraded(data, A) {
  const F = factionList(data, A), th = data.thresholds.graded, out = { eras: {}, violations: [] };
  const looksFor = (era) => Object.entries(data.looks).filter(([id, l]) => l.era === era).map(([id, l]) => [id, l]);
  for (const era of ['ancient', ...NEW_ERAS]) {
    const fs_ = F.filter((f) => f.era === era), looks = looksFor(era); let worst = { d: Infinity }, cases = 0, below = 0, minRatio = Infinity;
    for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) {
      const d0 = dE(fs_[i].primary, fs_[j].primary);
      for (const [lid, l] of looks) { const d = ciede2000(gradeLab(fs_[i].primary, l), gradeLab(fs_[j].primary, l)); cases++; if (d < th.floor) below++; if (d / d0 < minRatio) minRatio = d / d0; if (d < worst.d) worst = { d, look: lid, a: fs_[i].id, b: fs_[j].id, nominal: d0 }; }
    }
    out.eras[era] = { looks: looks.length, cases, below, worst, minRatio };
    if (era !== 'ancient' && below) out.violations.push(`graded ${era}: ${below}/${cases} in-era primary pairs fall below ${th.floor} under their own looks (worst ${f1(worst.d)} ${worst.look} ${worst.a}/${worst.b})`);
  }
  return out;
}
/** Scan every faction against the banned reference list. Returns per faction the bands and the binding rows. */
export function sectionBanned(data, A, eras = NEW_ERAS) {
  const th = data.thresholds.banned, refs = expandRefs(data.banned.refs);
  const out = { factions: [], violations: [], restrictedRows: 0, ancient: [] };
  const scan = (id, era, row) => {
    const rec = { id: `${era}:${id}`, restrict: [], block: [], singles: [] };
    for (const r of refs) {
      const k = r.colours.length; let set;
      if (k === 1) set = [row.primary]; else if (k === 2) set = [row.primary, row.accent]; else if (row.trim) set = [row.primary, row.accent, row.trim]; else continue;
      if (k === 1 && r.cls === 'uniform' && !(data.banned.uniform_eras || []).includes(era)) continue;
      const res = setVsRef(set, r.colours), lo = k === 1 ? th.single_block : th.block, hi = k === 1 ? th.single_clear : th.clear, b = band(res.max, lo, hi);
      if (b === 'BLOCK') rec.block.push({ ref: r.id, max: res.max, assign: res.assign });
      else if (b === 'RESTRICT') (k === 1 ? rec.singles : rec.restrict).push({ ref: r.id, max: res.max, assign: res.assign, sub: r.sub });
    }
    rec.restrict.sort((a, b) => a.max - b.max); rec.singles.sort((a, b) => a.max - b.max);
    return rec;
  };
  for (const era of eras) for (const [id, f] of Object.entries(data.eras[era].factions)) {
    const rec = scan(id, era, f); out.factions.push(rec); out.restrictedRows += rec.restrict.length + rec.singles.length;
    for (const b of rec.block) out.violations.push(`BLOCK ${rec.id} vs ${b.ref} max element ${f1(b.max)} < ${b.ref.includes('uni_') ? th.single_block : th.block}`);
  }
  for (const [id, f] of Object.entries(A.factions)) out.ancient.push(scan(id, 'ancient', { primary: f.primary, accent: f.accent, trim: null }));
  return out;
}
/** Nearest other colour for every primary / accent / trim of the 18 new factions: among colours of other new factions (in-era and any-era) and the 14 Ancient display colours. */
export function sectionColours(data, A) {
  const pool = []; for (const [id, f] of Object.entries(A.factions)) for (const r of ['primary', 'accent']) pool.push({ era: 'ancient', id, role: r, hex: f[r] });
  for (const [era, e] of Object.entries(data.eras)) for (const [id, f] of Object.entries(e.factions)) for (const r of ['primary', 'accent', 'trim']) pool.push({ era, id, role: r, hex: f[r] });
  const rows = [];
  for (const c of pool) if (c.era !== 'ancient') {
    const others = pool.filter((o) => !(o.era === c.era && o.id === c.id));
    const nIn = others.filter((o) => o.era === c.era).map((o) => ({ d: dE(c.hex, o.hex), o })).sort((a, b) => a.d - b.d)[0];
    const nAny = others.map((o) => ({ d: dE(c.hex, o.hex), o })).sort((a, b) => a.d - b.d)[0];
    rows.push({ era: c.era, id: c.id, role: c.role, hex: c.hex, inEra: nIn, any: nAny });
  }
  return { rows };
}
/** In-era BODY colour separation (the colour that covers the unit, factions.md "body-dominant"): bar in_era_min; pairs under clause_below need a body clause. */
export function sectionBodies(data, A) {
  const th = data.thresholds.body, out = { rows: [], ancient: [], violations: [] };
  for (const era of NEW_ERAS) {
    const fs_ = Object.entries(data.eras[era].factions);
    for (let i = 0; i < fs_.length; i++) for (let j = i + 1; j < fs_.length; j++) {
      const [ia, a] = fs_[i], [ib, b] = fs_[j], ca = a[a.body], cb = b[b.body], d = dE(ca, cb);
      const dL = Math.abs(hexToLab(ca)[0] - hexToLab(cb)[0]), dEdge = a.edge && b.edge ? dE(a.edge, b.edge) : null;
      const needs = d < th.clause_below, okClause = !needs || (a.body_clause && a.body_clause.with === ib && b.body_clause && b.body_clause.with === ia && (dL >= th.clause_dL || (dEdge != null && dEdge >= th.clause_edge_dE)));
      let cvdMin = Infinity, cvdView = 'normal'; for (const v of CVD_KINDS) { const dv = dECvd(ca, cb, v); if (dv < cvdMin) { cvdMin = dv; cvdView = v; } }
      out.rows.push({ era, a: ia, b: ib, d, dL, dEdge, needs, cvdMin, cvdView, ok: d >= th.in_era_min && okClause && cvdMin >= th.cvd_in_era_min });
      if (cvdMin < th.cvd_in_era_min) out.violations.push(`body colours ${era}:${ia}/${ib} are ${f1(cvdMin)} apart under ${cvdView} (< ${th.cvd_in_era_min})`);
      if (d < th.in_era_min) out.violations.push(`body colours ${era}:${ia}/${ib} ${f1(d)} < ${th.in_era_min}`);
      else if (!okClause) out.violations.push(`body colours ${era}:${ia}/${ib} ${f1(d)} < ${th.clause_below} without a body clause that separates them by dL* >= ${th.clause_dL} or edge dE >= ${th.clause_edge_dE}`);
    }
  }
  const up = Object.entries(A.unitPaint);
  for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++) { let cm = Infinity, cv = 'normal'; for (const v of CVD_KINDS) { const dv = dECvd(up[i][1].primary, up[j][1].primary, v); if (dv < cm) { cm = dv; cv = v; } } out.ancient.push({ a: up[i][0], b: up[j][0], d: dE(up[i][1].primary, up[j][1].primary), cvdMin: cm, cvdView: cv }); }
  out.rows.sort((x, y) => x.d - y.d); out.ancient.sort((x, y) => x.d - y.d);
  return out;
}
/**
 * Whole-unit mean-colour team separation (what spec/VF 3.16.1 dE_team measures when taken over all unit pixels): unit mean = (1 - s) body + s carrier
 * in linear light, per team palette and view; mirror = same faction on both teams, cross = two different factions of the era. Reported to show
 * why the carrier-mask metric (PC-2) is the one with a threshold: the whole-unit number is dominated by the body and is low for Ancient too.
 */
export function sectionTeamMean(data, A) {
  const F = factionList(data, A), out = { rows: [] };
  for (const s of [data.team.tint_share.other_mean, data.team.tint_share.hum1_pooled]) for (const [pn, pair] of Object.entries(data.team.palettes)) for (const era of ['ancient', ...NEW_ERAS]) {
    const fs_ = F.filter((f) => f.era === era); let mir = { d: Infinity }, cross = { d: Infinity };
    for (const a of fs_) for (const b of fs_) for (const view of CVD_KINDS) {
      const ca = carrierColour(data.team.carrier_base, pair[0]), cb = carrierColour(data.team.carrier_base, pair[1]);
      const d = ciede2000(cvdLab(unitMean([a.primary, a.accent], ca, s), view), cvdLab(unitMean([b.primary, b.accent], cb, s), view));
      if (a === b) { if (d < mir.d) mir = { d, id: a.id, view }; } else if (d < cross.d) cross = { d, id: a.id + '/' + b.id, view };
    }
    out.rows.push({ share: s, palette: pn, era, mirror: mir, cross });
  }
  return out;
}
export function sectionTeam(data, A) {
  const t = data.team, th = data.thresholds.team, out = { carrierPairs: [], cells: {}, violations: [], edgeRequired: {} };
  for (const [pn, pair] of Object.entries(t.palettes)) for (const view of CVD_KINDS) {
    const d = dECvd(pair[0], pair[1], view); out.carrierPairs.push({ palette: pn, view, d, ok: d >= th.carrier_pair_min });
    if (d < th.carrier_pair_min) out.violations.push(`team palette ${pn} ${view} carrier pair ${f1(d)} < ${th.carrier_pair_min}`);
  }
  const F = factionList(data, A);
  for (const f of F) {
    const cells = teamCells(t, [f.primary, f.accent], th), fail = cells.filter((c) => !c.ok);
    out.cells[`${f.era}:${f.id}`] = { total: cells.length, fail: fail.length, failCells: fail.map((c) => `${c.palette[0]}${c.team}${c.view[0]}`), classicNormalFail: fail.some((c) => c.palette === 'classic' && c.view === 'normal') };
    out.edgeRequired[`${f.era}:${f.id}`] = fail.length > 0;
    if (f.era !== 'ancient') {
      const declared = !!(f.row.tint && f.row.tint.edge);
      if (fail.length && !declared) out.violations.push(`${f.era}:${f.id} has ${fail.length} failing carrier cells but tint.edge is not declared`);
    }
  }
  return out;
}
export function sectionEmblems(data, A) {
  const out = { rows: [], negatives: [], ancient: [], violations: [] };
  const regIds = new Set();
  for (const e of data.emblems) {
    if (regIds.has(e.id)) out.violations.push(`duplicate emblem id ${e.id}`); regIds.add(e.id);
    const r = evalEmblem(e.rows, data), hash = bitmapHash(e.rows);
    out.rows.push({ id: e.id, era: e.era, faction: e.faction, pass: r.pass, reasons: r.reasons, metrics: r.metrics, hashOk: e.hash === hash, status: e.status, signatures: (e.signatures || []).map((s) => s.role) });
    if (!r.pass) out.violations.push(`emblem ${e.id}: ${r.reasons.join('; ')}`);
    if (e.hash !== hash) out.violations.push(`emblem ${e.id}: stored hash ${e.hash} != ${hash}`);
    if (e.rows.some((x) => x.length !== e.w) || e.rows.length !== e.h) out.violations.push(`emblem ${e.id}: dimensions ${e.w}x${e.h} do not match rows`);
  }
  for (const [id, rows] of Object.entries(data.fixtures.emblem_negatives)) { const r = evalEmblem(rows, data); out.negatives.push({ id, caught: !r.pass, reasons: r.reasons }); if (r.pass) out.violations.push(`negative control emblem '${id}' was NOT rejected`); }
  for (const [id, rows] of Object.entries(A.emblems)) { const r = evalEmblem(rows, data); out.ancient.push({ id, pass: r.pass, reasons: r.reasons }); }
  return out;
}
export function sectionLayouts(data) {
  const out = { cases: [], violations: [] };
  for (const c of data.fixtures.layouts) {
    const { g, W, H } = gridFromRows(c.rows, c.map), r = faceShapes(g, W, H, data);
    const shape = r.hits.map((h) => h.kind), got = r.layout.kind;
    const ok = (c.expect_kind == null || c.expect_kind === got) && (c.expect_shape == null || shape.includes(c.expect_shape)) && (c.expect_no_shape == null || !shape.length);
    out.cases.push({ id: c.id, kind: got, bands: r.layout.bands, shapes: [...new Set(shape)], expect: c.expect_kind || c.expect_shape || 'none', ok });
    if (!ok) out.violations.push(`layout fixture ${c.id}: got kind ${got} shapes [${[...new Set(shape)]}], expected kind ${c.expect_kind} shape ${c.expect_shape}`);
  }
  return out;
}
export function sectionRejects(data) {
  const out = { cases: [], violations: [] };
  for (const c of data.fixtures.reject) {
    if (c.blade) {
      const hit = glowBlade(c.blade.dims, c.blade.glowShare, data.thresholds.model), ok = hit === true;
      out.cases.push({ id: c.id, era: c.era, name: c.name, reasons: hit ? ['glow_blade'] : [], expect: ['glow_blade'], ok }); if (!ok) out.violations.push(`reject fixture ${c.id} (${c.name}): glow blade not detected`);
      continue;
    }
    const { g, W, H } = gridFromRows(c.face.rows, c.face.map), v = faceVerdict(g, W, H, c.face.colours, !!c.face.flagRole, data, c.face.bans || []);
    const missing = c.expect.filter((e) => !v.reasons.some((r) => r.includes(e)));
    out.cases.push({ id: c.id, era: c.era, name: c.name, reasons: v.reasons, expect: c.expect, ok: !v.pass && missing.length === 0 });
    if (v.pass) out.violations.push(`reject fixture ${c.id} (${c.name}) PASSED the face verdict`);
    else if (missing.length) out.violations.push(`reject fixture ${c.id} (${c.name}) missing expected reasons ${missing.join(', ')}; got ${v.reasons.join(', ')}`);
  }
  for (const c of data.fixtures.accept || []) {
    const { g, W, H } = gridFromRows(c.face.rows, c.face.map), v = faceVerdict(g, W, H, c.face.colours, !!c.face.flagRole, data, c.face.bans || []);
    out.cases.push({ id: c.id, era: c.era, name: c.name, reasons: v.reasons, expect: ['pass'], ok: v.pass }); if (!v.pass) out.violations.push(`accept fixture ${c.id} (${c.name}) was rejected: ${v.reasons.join(', ')}`);
  }
  return out;
}
export function parseWMaterials(root = ROOT) {
  const out = [];
  const wp = path.join(root, 'docs/eras/spec/W.md');
  if (fs.existsSync(wp)) for (const l of fs.readFileSync(wp, 'utf8').split('\n')) {
    const m = l.match(/^\| (\d+) \| ((?:med|mod|sf)_[a-z_]+) \| ([^|]+) \| ([0-9a-f]{6}) ([0-9a-f]{6}) ([0-9a-f]{6}) \| ([0-9a-f]{6}) ([0-9a-f]{6}) \|/);
    if (m) out.push({ id: +m[1], key: m[2], name: m[3].trim(), top: ['#' + m[4], '#' + m[5], '#' + m[6]], strata: ['#' + m[7], '#' + m[8]] });
  }
  const ap = path.join(root, 'src/world/arena.js');
  if (fs.existsSync(ap)) for (const m of fs.readFileSync(ap, 'utf8').matchAll(/\{ id: (\d+), key: '(\w+)', name: '([^']+)', top: \[(0x\w+), (0x\w+), (0x\w+)\], strata: \[(0x\w+), (0x\w+)\]/g)) out.push({ id: +m[1], key: m[2], name: m[3], top: [m[4], m[5], m[6]].map((h) => '#' + h.slice(2).padStart(6, '0')), strata: [m[7], m[8]].map((h) => '#' + h.slice(2).padStart(6, '0')) });
  return out.sort((a, b) => a.id - b.id);
}
export function sectionArenas(data, A) {
  const mats = parseWMaterials(), th = data.thresholds.arena, refs = expandRefs(data.banned.refs).filter((r) => r.colours.length === 3 && !r.sub);
  const eraOf = (m) => (m.id < 16 ? 'ancient' : m.id < 32 ? 'medieval' : m.id < 48 ? 'modern' : 'scifi');
  const out = { materials: mats.length, eras: {}, vsFaction: [], violations: [] };
  if (!mats.length) return out;
  for (const era of NEW_ERAS) {
    const ms = mats.filter((m) => eraOf(m) === era || m.id < 16); let triples = 0, flagged = 0, blocked = 0; const ex = [];
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) for (let k = j + 1; k < ms.length; k++) {
      triples++; let hit = null;
      for (const r of refs) { const res = setVsRef([ms[i].top[0], ms[j].top[0], ms[k].top[0]], r.colours); if (res.max < th.triple_clear && (!hit || res.max < hit.max)) hit = { ref: r.id, max: res.max }; }
      if (hit) { flagged++; if (hit.max < th.triple_block) blocked++; if (ex.length < 3) ex.push(`${ms[i].key}+${ms[j].key}+${ms[k].key}~${hit.ref}:${f1(hit.max)}`); }
    }
    const byTime = {};
    for (const [tn, t] of Object.entries(data.times)) {
      const lk = { sun: t.sun, sunMul: t.mul }, tops = ms.map((m) => gradeHex(m.top[0], lk)); let fl = 0, bl = 0;
      for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) for (let k = j + 1; k < ms.length; k++) {
        let hit = null; for (const r of refs) { const res = setVsRef([tops[i], tops[j], tops[k]], r.colours); if (res.max < th.triple_clear && (!hit || res.max < hit)) hit = res.max; }
        if (hit != null) { fl++; if (hit < th.triple_block) bl++; }
      }
      byTime[tn] = { flagged: fl, blocked: bl };
    }
    out.eras[era] = { materials: ms.length, triples, flagged, blocked, examples: ex, byTime };
    const own = mats.filter((m) => eraOf(m) === era);
    for (const [id, f] of Object.entries(data.eras[era].factions)) for (const role of ['primary', 'accent']) for (const m of own) {
      const d = Math.min(...m.top.map((t) => dE(f[role], t))); if (d < th.faction_vs_floor_edge) out.vsFaction.push({ era, faction: id, role, material: m.key, d });
    }
  }
  out.vsFaction.sort((a, b) => a.d - b.d);
  return out;
}
/**
 * M-4 marking finder (spec/VB 3.9.2): registered emblems are located and removed first; every remaining connected region (4-neighbour) of one colour
 * class with area in [marking_min, marking_max] whose colour differs from its surrounding class by more than marking_dE is an UNDECLARED marking (a
 * free decal). Returns { registered: [{emblem, at}], undeclared: [{cls, area, at:[x,y]}] }.
 */
export function markingsOf(g0, W, H, classHex, data) {
  const th = data.thresholds.model, { g, stripped } = stripRegistered(g0, W, H, data);
  const cnt = new Map(); for (const v of g) if (v >= 0) cnt.set(v, (cnt.get(v) || 0) + 1);
  const undeclared = [], seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y * W + x]; if (c < 0 || seen[y * W + x]) continue;
    const comp = [], st = [[x, y]]; seen[y * W + x] = 1;
    while (st.length) { const [cx, cy] = st.pop(); comp.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[ny * W + nx] && g[ny * W + nx] === c) { seen[ny * W + nx] = 1; st.push([nx, ny]); } } }
    if (comp.length < th.marking_min || comp.length > th.marking_max) continue;
    const around = new Map(); for (const [cx, cy] of comp) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && g[ny * W + nx] >= 0 && g[ny * W + nx] !== c) around.set(g[ny * W + nx], (around.get(g[ny * W + nx]) || 0) + 1); }
    if (!around.size) continue;
    const surround = [...around.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (dE(classHex[c], classHex[surround]) > th.marking_dE) undeclared.push({ cls: c, area: comp.length, at: comp[0] });
  }
  return { registered: stripped, undeclared };
}
export function sectionMarkings(data) {
  const out = { cases: [], violations: [] };
  for (const c of data.fixtures.markings) {
    const { g, W, H } = gridFromRows(c.rows, c.map), r = markingsOf(g, W, H, c.colours, data);
    const reg = [...new Set(r.registered.map((x) => x.emblem))].sort().join(','), ok = (c.expect_undeclared_min != null ? r.undeclared.length >= c.expect_undeclared_min : r.undeclared.length === c.expect_undeclared) && reg === (c.expect_registered || []).slice().sort().join(',');
    out.cases.push({ id: c.id, name: c.name, registered: reg || '-', undeclared: r.undeclared.length, ok });
    if (!ok) out.violations.push(`marking fixture ${c.id} (${c.name}): registered [${reg}] undeclared ${r.undeclared.length}, expected [${(c.expect_registered || []).join(',')}] ${c.expect_undeclared_min != null ? '>= ' + c.expect_undeclared_min : c.expect_undeclared}`);
  }
  return out;
}
/** THEME_LOOK sky pairs (zenith, horizon) of every new look against every look of another era (incl. the Ancient default day sky): informational, ratcheted (S-slice SLP-9). */
export function sectionLooks(data) {
  const rows = [];
  for (const [id, l] of Object.entries(data.looks)) {
    if (l.era === 'ancient') continue;
    let best = { max: Infinity };
    for (const [oid, o] of Object.entries(data.looks)) if (o.era !== l.era) { const r = setVsRef(l.sky, o.sky); if (r.max < best.max) best = { max: r.max, id: oid, era: o.era }; }
    rows.push({ look: id, era: l.era, nearest: best.id, nearestEra: best.era, d: best.max });
  }
  rows.sort((a, b) => a.d - b.d);
  return { rows, near: rows.filter((r) => r.d < data.thresholds.looks.near) };
}
export function sectionChrome(data) {
  const c = data.chrome, th = data.thresholds.chrome, out = { rows: [], violations: [] };
  const all = []; for (const [era, toks] of Object.entries(c)) for (const [k, v] of Object.entries(toks)) all.push({ era, k, v });
  for (const a of all) if (a.era !== 'ancient' && a.k === 'accent') {   // the chooser shows the four era cards together: each era's `accent` against the other accents and every Ancient token
    let best = { d: Infinity };
    for (const b of all) if (b.era !== a.era && (b.era === 'ancient' || b.k === 'accent')) { const d = dE(a.v, b.v); if (d < best.d) best = { d, era: b.era, k: b.k }; }
    out.rows.push({ token: `${a.era}.${a.k}`, value: a.v, nearest: `${best.era}.${best.k}`, d: best.d, ok: best.d >= th.accent_min });
    if (best.d < th.accent_min) out.violations.push(`chrome ${a.era}.${a.k} ${f1(best.d)} from ${best.era}.${best.k} (< ${th.accent_min})`);
  }
  return out;
}
/** The open colour questions of the three bibles, answered with numbers (spec/VB 3.4.4). */
export function sectionDecisions(data, A) {
  const F = factionList(data, A), refs = expandRefs(data.banned.refs).filter((r) => r.colours.length >= 2);
  const nearP = (hex, skipKey) => F.filter((f) => `${f.era}:${f.id}` !== skipKey).map((f) => [dE(hex, f.primary), `${f.era}:${f.id}`]).sort((a, b) => a[0] - b[0]).slice(0, 3).map((x) => `${x[1]} ${f1(x[0])}`).join(', ');
  const nearA = (hex, skipKey) => F.filter((f) => `${f.era}:${f.id}` !== skipKey).map((f) => [dE(hex, f.accent), `${f.era}:${f.id}`]).sort((a, b) => a[0] - b[0]).slice(0, 2).map((x) => `${x[1]} ${f1(x[0])}`).join(', ');
  const clear = (set) => { let b = { max: Infinity, ref: '' }; for (const r of refs) { if (r.colours.length > set.length) continue; const res = setVsRef(set, r.colours); if (res.max < b.max) b = { max: res.max, ref: r.id }; } return `${f1(b.max)} (${b.ref})`; };
  const team = data.team, rows = [];
  const q = data.decisions_probe;
  for (const item of q) {
    const lines = [];
    for (const c of item.candidates) {
      const L = { colour: c.hex, label: c.label };
      if (c.near_primaries) L.nearestPrimaries = nearP(c.hex, item.self);
      if (c.near_accents) L.nearestAccents = nearA(c.hex, item.self);
      if (c.pair) L.pairClearance = clear(c.pair);
      if (c.team) { L.vsTeamClassicBlue = f1(dE(c.hex, team.palettes.classic[0])); L.vsTeamCvdBlue = f1(dE(c.hex, team.palettes.cvd[0])); }
      if (c.against) L.against = Object.fromEntries(Object.entries(c.against).map(([k, v]) => [k, f1(dE(c.hex, v))]));
      lines.push(L);
    }
    rows.push({ id: item.id, question: item.question, lines, verdict: item.verdict });
  }
  return { rows };
}
/** Ancient hum1 corpus baseline (needs the repo): off-palette share at the model-arm tolerance, glow and tint shares. */
export async function sectionCorpus(data, root = ROOT) {
  const R = (p) => pathToFileURL(path.join(root, p)).href;
  const BP = await import(R('src/content/era_ancient/blueprints.js'));
  const { STAT_TABLE } = await import(R('src/content/era_ancient/stats.js'));
  const bps = {};
  for (const f of ['t0.js', 'units_a.js', 'units_b.js']) { const m = await import(R('src/content/era_ancient/units/' + f)); for (const [id, spec] of Object.entries(m.MODELS || {})) if (spec && (spec.blueprint || spec.kind === 'humanoid')) bps[id] = spec.blueprint || spec; }
  const tol = data.thresholds.model.off_palette_dE, rows = [];
  const labOf = (n) => rgbToLab([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  for (const id of Object.keys(bps)) {
    let c; try { const st = STAT_TABLE[id]; c = BP.compileSoldier(bps[id], st ? { range: st.melee ? st.melee.range : undefined, radius: st.radius, scale: st.scale } : {}); } catch (e) { continue; }
    const bp = bps[id], col = bp.colors || {}, allowed = [];
    for (const h of [col.primary, col.secondary, col.trim, col.cloth, bp.body.skin, bp.body.hair, bp.head && bp.head.eyes]) if (h) allowed.push(hexToLab(h));
    for (const k of BP.METAL_KEYS) for (const v of BP.METALS[k]) allowed.push(labOf(v));
    let total = 0, tint = 0, glow = 0, off = 0; const cache = new Map();
    for (const part of c.model.parts) for (const v of part.grid.d) {
      if (!v) continue; total++; const f = v >>> 24; if (f & 2) { tint++; continue; } if (f & 4) { glow++; continue; }
      const rgb = v & 0xffffff; let dm = cache.get(rgb);
      if (dm === undefined) { const L = labOf(rgb); dm = Infinity; for (const a of allowed) { const dd = ciede2000(L, a); if (dd < dm) dm = dd; } cache.set(rgb, dm); }
      if (dm > tol) off++;
    }
    rows.push({ id, voxels: total, tint: tint / total, glow: glow / total, off: off / total });
  }
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const stat = (k) => { const a = rows.map((r) => r[k]); return { min: Math.min(...a), p50: q(a, 0.5), p90: q(a, 0.9), max: Math.max(...a) }; };
  return { units: rows.length, tolerance: tol, off: stat('off'), glow: stat('glow'), tint: stat('tint'), worstOff: rows.slice().sort((a, b) => b.off - a.off).slice(0, 3).map((r) => `${r.id} ${(r.off * 100).toFixed(1)}%`) };
}

// ================================================================================================ negative controls (selftest)
/** Doctored-input controls: every one must be REJECTED by the check it targets (registered as NC-VB-* in spec/VB 4). */
export async function negativeControls(data, A) {
  const results = []; const clone = () => JSON.parse(JSON.stringify(data));
  const run = (id, what, mutate, expectIn) => { const d = clone(); mutate(d); let v = []; try { v = expectIn(d); } catch (e) { v = ['threw ' + e.message]; } results.push({ id, what, rejected: v.length > 0, first: v[0] || null }); };
  const firstFac = (d, era = 'modern') => Object.values(d.eras[era].factions)[0];
  run('NC-VB-01', 'a new primary moved to 6 from another primary of its era', (d) => { d.eras.modern.factions.skyclub.primary = '#9bc2f6'; d.eras.modern.factions.shed.primary = '#9fc8ff'; }, (d) => sectionPrimaries(d, A).violations.map((r) => `${r.a}/${r.b}`));
  run('NC-VB-02', 'a new primary within 10 of an Ancient display primary', (d) => { d.eras.medieval.factions.yeomen.primary = '#2f66b5'; }, (d) => sectionPrimaries(d, A).violations.map((r) => `${r.a}/${r.b}`));
  run('NC-VB-03', 'a faction pair set to a national red-white pair', (d) => { const f = firstFac(d); f.primary = '#d62a2a'; f.accent = '#fefefe'; }, (d) => sectionBanned(d, A, ['modern']).violations);
  run('NC-VB-04', 'a faction primary equal to the uniform olive reference', (d) => { firstFac(d).primary = '#6b8e23'; d.banned.uniform_eras = ['modern']; }, (d) => sectionBanned(d, A, ['modern']).violations);
  run('NC-VB-05', 'tint.edge removed from a faction with failing carrier cells', (d) => { d.eras.scifi.factions.tidy_concord.tint.edge = false; }, (d) => sectionTeam(d, A).violations);
  run('NC-VB-06', 'team palette collapsed to two near colours', (d) => { d.team.palettes.classic = ['#2f6bff', '#3b72ff']; }, (d) => sectionTeam(d, A).violations);
  run('NC-VB-07', 'an emblem row with a cross bitmap', (d) => { d.emblems[0].rows = ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...']; d.emblems[0].hash = bitmapHash(d.emblems[0].rows); d.emblems[0].w = 8; d.emblems[0].h = 8; }, (d) => sectionEmblems(d, A).violations);
  run('NC-VB-08', 'an emblem row whose bitmap changed without a new hash', (d) => { d.emblems[1].rows = d.emblems[1].rows.slice().reverse(); }, (d) => sectionEmblems(d, A).violations);
  run('NC-VB-09', 'an emblem row shaped as a letter', (d) => { d.emblems[2].rows = ['..#..', '.#.#.', '#...#', '#...#', '#####', '#...#', '#...#']; d.emblems[2].hash = bitmapHash(d.emblems[2].rows); d.emblems[2].w = 5; d.emblems[2].h = 7; }, (d) => sectionEmblems(d, A).violations);
  run('NC-VB-10', 'a layout fixture expectation flipped (three bands expected plain)', (d) => { d.fixtures.layouts.find((c) => c.expect_kind === 'bands').expect_kind = 'plain'; }, (d) => sectionLayouts(d).violations);
  run('NC-VB-11', 'a duplicate emblem id', (d) => { d.emblems[3].id = d.emblems[0].id; }, (d) => sectionEmblems(d, A).violations);
  run('NC-VB-12', 'a faction accent made equal to its primary', (d) => { const f = firstFac(d, 'scifi'); f.accent = f.primary; }, (d) => sectionPairs(d, A).violations);
  run('NC-VB-13', 'the body clause removed from a pair of near-identical dark bodies', (d) => { delete d.eras.scifi.factions.skitter.body_clause; }, (d) => sectionBodies(d, A).violations);
  run('NC-VB-14', 'a free three-voxel blob expected to be allowed on a face', (d) => { d.fixtures.markings.find((c) => c.id === 'MK-3').expect_undeclared = 0; }, (d) => sectionMarkings(d).violations);
  return results;
}

// ================================================================================================ selftest
const SHARMA = `
50.0000 2.6772 -79.7751 50.0000 0.0000 -82.7485 2.0425
50.0000 3.1571 -77.2803 50.0000 0.0000 -82.7485 2.8615
50.0000 2.8361 -74.0200 50.0000 0.0000 -82.7485 3.4412
50.0000 -1.3802 -84.2814 50.0000 0.0000 -82.7485 1.0000
50.0000 -1.1848 -84.8006 50.0000 0.0000 -82.7485 1.0000
50.0000 -0.9009 -85.5211 50.0000 0.0000 -82.7485 1.0000
50.0000 0.0000 0.0000 50.0000 -1.0000 2.0000 2.3669
50.0000 -1.0000 2.0000 50.0000 0.0000 0.0000 2.3669
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0009 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0010 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0011 7.2195
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0012 7.2195
50.0000 -0.0010 2.4900 50.0000 0.0009 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0010 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0011 -2.4900 4.7461
50.0000 2.5000 0.0000 50.0000 0.0000 -2.5000 4.3065
50.0000 2.5000 0.0000 73.0000 25.0000 -18.0000 27.1492
50.0000 2.5000 0.0000 61.0000 -5.0000 29.0000 22.8977
50.0000 2.5000 0.0000 56.0000 -27.0000 -3.0000 31.9030
50.0000 2.5000 0.0000 58.0000 24.0000 15.0000 19.4535
50.0000 2.5000 0.0000 50.0000 3.1736 0.5854 1.0000
50.0000 2.5000 0.0000 50.0000 3.2972 0.0000 1.0000
50.0000 2.5000 0.0000 50.0000 1.8634 0.5757 1.0000
50.0000 2.5000 0.0000 50.0000 3.2592 0.3350 1.0000
60.2574 -34.0099 36.2677 60.4626 -34.1751 39.4387 1.2644
63.0109 -31.0961 -5.8663 62.8187 -29.7946 -4.0864 1.2630
61.2901 3.7196 -5.3901 61.4292 2.2480 -4.9620 1.8731
35.0831 -44.1164 3.7933 35.0232 -40.0716 1.5901 1.8645
22.7233 20.0904 -46.6940 23.0331 14.9730 -42.5619 2.0373
36.4612 47.8580 18.3852 36.2715 50.5065 21.2231 1.4146
90.8027 -2.0831 1.4410 91.1528 -1.6435 0.0447 1.4441
90.9257 -0.5406 -0.9208 88.6381 -0.8985 -0.7239 1.5381
6.7747 -0.2908 -2.4247 5.8714 -0.0985 -2.2286 0.6377
2.0776 0.0795 -1.1350 0.9033 -0.0636 -0.5514 0.9082`;
export async function selftest(log = console.log, dataPath = DEFAULT_DATA) {
  const fails = [];
  const rows = SHARMA.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number));
  if (rows.length !== 34) fails.push(`sharma rows ${rows.length} != 34`);
  let maxErr = 0;
  for (const r of rows) { const d = ciede2000([r[0], r[1], r[2]], [r[3], r[4], r[5]]); const e = Math.abs(d - r[6]); if (e > maxErr) maxErr = e; if (e > 6e-5) fails.push(`sharma ${r.slice(0, 6).join(',')} got ${d.toFixed(4)} want ${r[6]}`); }
  log(`ciede2000: 34 published pairs, max abs error ${maxErr.toExponential(2)} (limit 6e-5; the published values carry 4 decimals)`);
  if (dE('#2a5db0', '#2a5db0') !== 0) fails.push('identity');
  if (Math.abs(dE('#d9661c', '#b3262e') - dE('#b3262e', '#d9661c')) > 1e-9) fails.push('symmetry');
  const w = hexToLab('#ffffff'), k = hexToLab('#000000'), g = hexToLab('#777777'), r = hexToLab('#ff0000');
  const near = (a, b, t) => Math.abs(a - b) <= t;
  if (!(near(w[0], 100, 0.02) && near(w[1], 0, 0.05) && near(w[2], 0, 0.05))) fails.push('white Lab ' + w.join());
  if (!near(k[0], 0, 1e-6)) fails.push('black Lab');
  if (!near(g[0], 50.0, 0.1)) fails.push('grey #777777 L* ' + g[0]);
  if (!(near(r[0], 53.24, 0.05) && near(r[1], 80.09, 0.1) && near(r[2], 67.20, 0.1))) fails.push('red Lab ' + r.join());
  log(`lab: white ${w.map((v) => v.toFixed(2))}, red ${r.map((v) => v.toFixed(2))}`);
  for (const kd of ['protan', 'deutan', 'tritan']) {
    const M = CVD_MATRIX[kd]; M.forEach((row, i) => { const sm = row[0] + row[1] + row[2]; if (Math.abs(sm - 1) > 2e-3) fails.push(`${kd} row ${i} sums ${sm}`); });
    const gy = cvdRgb([128, 128, 128], kd); if (Math.max(...gy.map((v) => Math.abs(v - 128))) > 1.2) fails.push(`${kd} moves grey ${gy}`);
  }
  if (!(rgbToLab(cvdRgb([255, 0, 0], 'protan'))[0] < rgbToLab([255, 0, 0])[0] - 10)) fails.push('protan red not darker');
  log('cvd: matrices sum to 1 per row, grey preserved, protan red darker');
  if (band(7.9, 8, 20) !== 'BLOCK' || band(8, 8, 20) !== 'RESTRICT' || band(20, 8, 20) !== 'CLEAR') fails.push('band edges');
  if (fs.existsSync(dataPath)) {
    const data = loadData(dataPath), A = await loadAncient();
    const em = sectionEmblems(data, A); const caught = em.negatives.filter((n) => n.caught).length;
    log(`emblem negatives: ${caught}/${em.negatives.length} rejected; proposed rows: ${em.rows.filter((x) => x.pass).length}/${em.rows.length} pass`);
    for (const v of em.violations) fails.push(v);
    const ly = sectionLayouts(data); log(`layout fixtures: ${ly.cases.filter((c) => c.ok).length}/${ly.cases.length} as expected`); for (const v of ly.violations) fails.push(v);
    const mk = sectionMarkings(data); log(`marking fixtures: ${mk.cases.filter((c) => c.ok).length}/${mk.cases.length} as expected`); for (const v of mk.violations) fails.push(v);
    const rj = sectionRejects(data); log(`reject/accept fixtures: ${rj.cases.filter((c) => c.ok).length}/${rj.cases.length} as expected`); for (const v of rj.violations) fails.push(v);
    const ncs = await negativeControls(data, A);
    for (const n of ncs) { log(`  ${n.id} ${n.rejected ? 'rejected' : 'NOT REJECTED'}: ${n.what}${n.first ? '  [' + String(n.first).slice(0, 80) + ']' : ''}`); if (!n.rejected) fails.push(`${n.id} not rejected`); }
  } else log(`(no ${dataPath}: data-driven controls skipped)`);
  for (const f of fails) log('FAIL ' + f);
  log(fails.length ? `selftest FAILED (${fails.length})` : 'selftest ok');
  return fails;
}

// ================================================================================================ check + report printing
export async function runCheck(data, A) {
  const v = [];
  const P = sectionPrimaries(data, A); v.push(...P.violations.map((r) => `primary ${r.a} / ${r.b} ${f1(r.d)} < ${r.limit}`));
  v.push(...sectionPairs(data, A).violations, ...sectionBodies(data, A).violations, ...sectionGraded(data, A).violations, ...sectionBanned(data, A).violations, ...sectionTeam(data, A).violations, ...sectionEmblems(data, A).violations, ...sectionLayouts(data).violations, ...sectionMarkings(data).violations, ...sectionRejects(data).violations, ...sectionChrome(data).violations);
  for (const e of NEW_ERAS) for (const [id, f] of Object.entries(data.eras[e].factions)) for (const key of ['primary', 'accent', 'trim']) if (!/^#[0-9a-f]{6}$/.test(f[key])) v.push(`${e}:${id}.${key} is not #rrggbb lower case`);
  const em = new Set(data.emblems.map((e) => e.id)); for (const e of NEW_ERAS) for (const [id, f] of Object.entries(data.eras[e].factions)) if (!em.has(f.emblem)) v.push(`${e}:${id} names unknown emblem ${f.emblem}`);
  return v;
}
function printSection(name, data, A, args) {
  const P = (...s) => console.log(...s);
  if (name === 'primaries') {
    const s = sectionPrimaries(data, A); P('== primaries: 25 display primaries, CIEDE2000 (matrix in --json)');
    P('weakest pairs:'); for (const r of s.rows.slice(0, 12)) P(`  ${f1(r.d).padStart(5)}  ${pad(r.a, 22)} ${pad(r.b, 22)} ${r.same ? 'in-era' : 'cross  '} limit ${r.limit} ${r.newer ? (r.ok ? 'ok' : 'FAIL') : 'ancient-only (grandfathered)'}`);
    P('minimum per scope:'); P('  ancient in-era', s.summary.ancient_in_era && `${f1(s.summary.ancient_in_era.d)} ${s.summary.ancient_in_era.a} ${s.summary.ancient_in_era.b}`);
    for (const [k, v] of Object.entries(s.summary.in_era)) P(`  in-era ${pad(k, 9)} ${v ? `${f1(v.d)} ${v.a} / ${v.b}` : '-'}`);
    for (const [k, v] of Object.entries(s.summary.vs_ancient)) P(`  ${pad(k, 9)} vs ancient ${v ? `${f1(v.d)} ${v.a} / ${v.b}` : '-'}`);
    for (const [k, v] of Object.entries(s.summary.cross_new)) P(`  ${pad(k, 16)} ${v ? `${f1(v.d)} ${v.a} / ${v.b}` : '-'}`);
    P(`violations: ${s.violations.length}`);
  } else if (name === 'pairs') {
    const s = sectionPairs(data, A); P('== pairs and accents');
    P('internal primary-accent contrast (new eras):', s.internal.map((r) => `${r.id.split(':')[1]} ${f1(r.d)}`).join(', '));
    P(`accent-vs-other-in-era-primary (informational) minimum: ${s.accentVsPrimary.slice().sort((a, b) => a.d - b.d).slice(0, 3).map((r) => `${r.a} ${f1(r.d)} ${r.b}`).join(', ')}; escape pairs needed: ${s.escape.length}; violations: ${s.violations.length}`); for (const v of s.violations) P('  ' + v);
  } else if (name === 'graded') {
    const s = sectionGraded(data, A); P('== graded pre-pass: in-era primary pairs under the era\'s own THEME_LOOK rows');
    for (const [e, r] of Object.entries(s.eras)) P(`  ${pad(e, 9)} looks ${r.looks} cases ${r.cases} below floor ${r.below} worst ${f1(r.worst.d)} (${r.worst.look} ${r.worst.a}/${r.worst.b}, nominal ${f1(r.worst.nominal)}) min ratio ${r.minRatio.toFixed(2)}`);
    for (const v of s.violations) P('  ' + v);
  } else if (name === 'banned') {
    const s = sectionBanned(data, A); P(`== banned references: ${data.banned.refs.length} tuples (${expandRefs(data.banned.refs).length} scan rows); bands BLOCK < ${data.thresholds.banned.block}, RESTRICT < ${data.thresholds.banned.clear}`);
    for (const r of s.factions) { P(`  ${pad(r.id, 24)} block ${r.block.length} restrict ${r.restrict.length} uniform-singles ${r.singles.length}  nearest: ${r.restrict.slice(0, 2).map((x) => `${x.ref} ${f1(x.max)}`).join(', ')}${r.singles.length ? ' | single ' + r.singles[0].ref + ' ' + f1(r.singles[0].max) : ''}`); }
    P('ancient (grandfathered, informational):'); for (const r of s.ancient) P(`  ${pad(r.id, 24)} block ${r.block.length} nearest ${r.block.concat(r.restrict).slice(0, 2).map((x) => `${x.ref} ${f1(x.max)}`).join(', ')}`);
    P(`violations: ${s.violations.length}`); for (const v of s.violations) P('  ' + v);
  } else if (name === 'colours') {
    const s = sectionColours(data, A); P('== nearest other colour of every primary / accent / trim (new factions)');
    for (const r of s.rows) P(`  ${pad(r.era + ':' + r.id, 22)} ${pad(r.role, 8)} ${r.hex}  in-era ${f1(r.inEra.d).padStart(5)} ${r.inEra.o.id}.${r.inEra.o.role}   any ${f1(r.any.d).padStart(5)} ${r.any.o.era}:${r.any.o.id}.${r.any.o.role}`);
  } else if (name === 'bodies') {
    const s = sectionBodies(data, A); P('== body-dominant colours, in-era (the colour that covers the unit)');
    for (const r of s.rows.slice(0, 8)) P(`  ${f1(r.d).padStart(5)} ${pad(r.era, 9)} ${pad(r.a, 13)} ${pad(r.b, 13)} dL* ${f1(r.dL)} edge ${r.dEdge == null ? '-' : f1(r.dEdge)} ${r.needs ? 'clause needed' : ''} ${r.ok ? 'ok' : 'FAIL'}`);
    P('ancient unit paint (shipped, informational):', s.ancient.slice(0, 4).map((r) => `${r.a}/${r.b} ${f1(r.d)}`).join(', '), '| worst under CVD:', s.ancient.slice().sort((a, b) => a.cvdMin - b.cvdMin).slice(0, 2).map((r) => `${r.a}/${r.b} ${f1(r.cvdMin)} ${r.cvdView}`).join(', '));
    P('worst under CVD (new eras):', s.rows.slice().sort((a, b) => a.cvdMin - b.cvdMin).slice(0, 6).map((r) => `${r.era}:${r.a}/${r.b} ${f1(r.cvdMin)} ${r.cvdView}`).join(', '));
  } else if (name === 'teammean') {
    const s = sectionTeamMean(data, A); P('== whole-unit mean-colour dE_team (minimum over factions and the four views)');
    for (const r of s.rows.filter((x) => x.palette === 'classic')) P(`  share ${r.share} ${pad(r.era, 9)} mirror ${f1(r.mirror.d)} (${r.mirror.id} ${r.mirror.view}) cross ${f1(r.cross.d)} (${r.cross.id} ${r.cross.view})`);
  } else if (name === 'team') {
    const s = sectionTeam(data, A); P('== team / CVD (static model)');
    P('carrier pair dE00 by palette and view:'); for (const pn of Object.keys(data.team.palettes)) P(`  ${pad(pn, 9)} ${s.carrierPairs.filter((c) => c.palette === pn).map((c) => `${c.view} ${f1(c.d)}`).join('  ')}`);
    P('carrier-vs-body failing cells (palette initial + team + view initial):'); for (const [id, c] of Object.entries(s.cells)) P(`  ${pad(id, 24)} ${c.fail}/${c.total} ${c.failCells.join(' ')}`);
    P(`violations: ${s.violations.length}`); for (const v of s.violations) P('  ' + v);
  } else if (name === 'emblems') {
    const s = sectionEmblems(data, A); P(`== emblems: ${s.rows.length} registry rows, ${s.negatives.length} negative fixtures`);
    for (const r of s.rows) P(`  ${pad(r.id, 16)} ${r.pass ? 'pass' : 'FAIL'} ${r.metrics.w}x${r.metrics.h} n${r.metrics.n} cross ${r.metrics.cross} rot90 ${r.metrics.rot90} mirror ${r.metrics.mirror} hash ${r.metrics.hash}${r.hashOk ? '' : ' HASH MISMATCH'} sig[${r.signatures}]`);
    P('negatives:', s.negatives.map((n) => `${n.id}:${n.caught ? 'caught' : 'MISSED'}`).join(' '));
    P('ancient (grandfathered):', s.ancient.map((n) => `${n.id}:${n.pass ? 'pass' : 'would-fail ' + n.reasons.join('|')}`).join(' '));
    for (const v of s.violations) P('  ' + v);
  } else if (name === 'layouts') {
    const s = sectionLayouts(data); P('== layout fixtures'); for (const c of s.cases) P(`  ${pad(c.id, 18)} kind ${pad(c.kind, 7)} bands ${c.bands ?? '-'} shapes [${c.shapes}] expect ${c.expect} ${c.ok ? 'ok' : 'FAIL'}`);
  } else if (name === 'markings') {
    const s = sectionMarkings(data); P('== marking fixtures (M-4 free-decal finder)'); for (const c of s.cases) P(`  ${pad(c.id, 8)} ${c.ok ? 'ok  ' : 'FAIL'} ${pad(c.name, 46)} registered ${c.registered} undeclared ${c.undeclared}`);
  } else if (name === 'rejects') {
    const s = sectionRejects(data); P('== reject / accept fixtures (the named reject examples, machine part)'); for (const c of s.cases) P(`  ${pad(c.id, 12)} ${c.ok ? 'ok  ' : 'FAIL'} ${pad(c.name, 28)} ${c.reasons.slice(0, 4).join(' ')}`);
  } else if (name === 'arenas') {
    const s = sectionArenas(data, A); P(`== arenas: ${s.materials} material rows`);
    for (const [e, r] of Object.entries(s.eras)) P(`  ${pad(e, 9)} materials ${r.materials} triples ${r.triples} flagged(<${data.thresholds.arena.triple_clear}) ${r.flagged} (${((100 * r.flagged) / r.triples).toFixed(1)}%) blocked(<${data.thresholds.arena.triple_block}) ${r.blocked} e.g. ${r.examples[0] || '-'}  by time: ${Object.entries(r.byTime).map(([t, v]) => `${t} ${v.flagged}/${v.blocked}`).join(' ')}`);
    P('faction colour vs own-era material top colours, below the edge threshold:'); for (const v of s.vsFaction.slice(0, 12)) P(`  ${f1(v.d).padStart(5)} ${v.era}:${v.faction} ${v.role} on ${v.material}`);
  } else if (name === 'looks') {
    const s = sectionLooks(data); P(`== THEME_LOOK sky pairs against looks of other eras (informational; near-duplicates < ${data.thresholds.looks.near} are listed, not failed)`);
    for (const r of s.rows.slice(0, 8)) P(`  ${f1(r.d).padStart(5)} ${pad(r.look, 16)} ~ ${r.nearest} (${r.nearestEra})`); P(`  near-duplicates: ${s.near.length} of ${s.rows.length}`);
  } else if (name === 'chrome') {
    const s = sectionChrome(data); P('== chrome accents'); for (const r of s.rows) P(`  ${pad(r.token, 16)} ${r.value} nearest ${pad(r.nearest, 18)} ${f1(r.d)} ${r.ok ? 'ok' : 'FAIL'}`);
  } else if (name === 'decisions') {
    const s = sectionDecisions(data, A); P('== decisions: the open colour questions with numbers');
    for (const r of s.rows) { P(`${r.id}: ${r.question}`); for (const l of r.lines) P('   ' + JSON.stringify(l)); P(`   verdict: ${r.verdict}`); }
  }
}
export async function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
  const dataPath = opt('data', DEFAULT_DATA);
  if (cmd === 'selftest') return (await selftest(console.log, dataPath)).length ? 1 : 0;
  if (cmd === 'pair') { const [a, b] = rest; if (!a || !b) { console.error('usage: pair #a #b'); return 2; } console.log(`dE00 ${dE(a, b).toFixed(2)}  protan ${dECvd(a, b, 'protan').toFixed(2)}  deutan ${dECvd(a, b, 'deutan').toFixed(2)}  tritan ${dECvd(a, b, 'tritan').toFixed(2)}`); return 0; }
  const data = loadData(dataPath), A = await loadAncient();
  if (cmd === 'check') { const v = await runCheck(data, A); for (const x of v) console.log('FAIL ' + x); console.log(v.length ? `vb check FAILED (${v.length})` : 'vb check ok'); return v.length ? 1 : 0; }
  if (cmd === 'report') {
    const sec = opt('section', 'all'), names = ['primaries', 'pairs', 'colours', 'bodies', 'graded', 'banned', 'team', 'teammean', 'emblems', 'layouts', 'markings', 'rejects', 'arenas', 'looks', 'chrome', 'decisions'];
    if (rest.includes('--json')) {
      const o = { primaries: sectionPrimaries(data, A), pairs: sectionPairs(data, A), colours: sectionColours(data, A), bodies: sectionBodies(data, A), graded: sectionGraded(data, A), banned: sectionBanned(data, A), team: sectionTeam(data, A), teammean: sectionTeamMean(data, A), emblems: sectionEmblems(data, A), layouts: sectionLayouts(data), markings: sectionMarkings(data), rejects: sectionRejects(data), arenas: sectionArenas(data, A), looks: sectionLooks(data), chrome: sectionChrome(data), decisions: sectionDecisions(data, A) };
      if (sec === 'corpus' || sec === 'all+corpus') o.corpus = await sectionCorpus(data);
      console.log(JSON.stringify(sec === 'all' || sec === 'all+corpus' ? o : o[sec], null, 1)); return 0;
    }
    if (sec === 'corpus') { const c = await sectionCorpus(data); console.log('== Ancient hum1 corpus:', JSON.stringify(c)); return 0; }
    for (const n of sec === 'all' ? names : [sec]) printSection(n, data, A, rest);
    return 0;
  }
  console.log('usage: selftest | pair #a #b | report [--json] [--section s] [--data f] | check [--data f]');
  return cmd === 'help' ? 0 : 2;
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(await main(process.argv.slice(2)));
