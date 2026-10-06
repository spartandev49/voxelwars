// Minimal glTF 2.0 / GLB reader in pure Node (no npm deps).
// Reads: nodes (hierarchy, TRS), skins, animations (channels + samplers), accessors
// (incl. byteStride, normalized ints and sparse). Never executes anything from the file.
//
//   import { loadGltf, readAccessor, nodeInfo, sampleAnimation } from './glb.mjs'
//   const g = loadGltf('x.glb');   // { json, buffers:[Buffer], nodes:[...], skins:[...], animations:[...] }

import fs from 'node:fs';
import path from 'node:path';

const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

export function parseGlbBuffer(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error('unsupported GLB version ' + version);
  const total = buf.readUInt32LE(8);
  if (total > buf.length) throw new Error('GLB length field exceeds file size');
  let off = 12, json = null, bin = null;
  while (off + 8 <= total) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const start = off + 8, end = start + len;
    if (end > buf.length) throw new Error('GLB chunk overruns file');
    if (type === 0x4e4f534a) json = JSON.parse(buf.toString('utf8', start, end));
    else if (type === 0x004e4942 && !bin) bin = buf.subarray(start, end);
    off = end + ((4 - (end % 4)) % 4);
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

export function loadGltf(file) {
  const raw = fs.readFileSync(file);
  let json, bin = null;
  if (raw.readUInt32LE(0) === 0x46546c67) ({ json, bin } = parseGlbBuffer(raw));
  else json = JSON.parse(raw.toString('utf8'));
  const dir = path.dirname(file);
  const buffers = (json.buffers || []).map((b, i) => {
    if (!b.uri) { if (i === 0 && bin) return bin; throw new Error('buffer ' + i + ' has no data'); }
    if (b.uri.startsWith('data:')) return Buffer.from(b.uri.slice(b.uri.indexOf(',') + 1), 'base64');
    // Only allow sibling files below the gltf dir (untrusted input: no path traversal).
    const p = path.resolve(dir, decodeURIComponent(b.uri));
    if (!p.startsWith(path.resolve(dir) + path.sep)) throw new Error('external buffer escapes dir: ' + b.uri);
    return fs.readFileSync(p);
  });
  const g = { json, buffers, file };
  g.nodes = buildNodes(json);
  g.skins = (json.skins || []).map(s => ({ name: s.name, joints: s.joints, skeleton: s.skeleton, ibm: s.inverseBindMatrices }));
  g.animations = (json.animations || []).map((a, i) => ({
    index: i, name: a.name || ('anim' + i),
    channels: a.channels.map(c => ({ node: c.target.node, path: c.target.path, sampler: c.sampler })),
    samplers: a.samplers,
  }));
  return g;
}

function buildNodes(json) {
  const nodes = (json.nodes || []).map((n, i) => {
    const o = { index: i, name: n.name || ('node' + i), children: n.children || [], parent: -1, mesh: n.mesh, skin: n.skin };
    if (n.matrix) {
      const d = decompose(n.matrix); o.t = d.t; o.q = d.q; o.s = d.s;
    } else {
      o.t = n.translation ? n.translation.slice() : [0, 0, 0];
      o.q = n.rotation ? n.rotation.slice() : [0, 0, 0, 1];
      o.s = n.scale ? n.scale.slice() : [1, 1, 1];
    }
    return o;
  });
  for (const n of nodes) for (const c of n.children) nodes[c].parent = n.index;
  return nodes;
}

function decompose(m) {
  // column-major 4x4 -> t,q,s (assumes no shear)
  const t = [m[12], m[13], m[14]];
  let sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]);
  const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
  if (det < 0) sx = -sx;
  const r = [m[0] / sx, m[1] / sx, m[2] / sx, m[4] / sy, m[5] / sy, m[6] / sy, m[8] / sz, m[9] / sz, m[10] / sz];
  // r is column-major 3x3 [c0 c1 c2]
  const m00 = r[0], m10 = r[1], m20 = r[2], m01 = r[3], m11 = r[4], m21 = r[5], m02 = r[6], m12 = r[7], m22 = r[8];
  const tr = m00 + m11 + m22; let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  return { t, q, s: [sx, sy, sz] };
}

/** Read an accessor into a Float32Array (normalized ints are expanded to float) + metadata. */
export function readAccessor(g, idx) {
  const a = g.json.accessors[idx];
  const [Arr, size] = COMP[a.componentType];
  const nc = NCOMP[a.type];
  const out = new Float64Array(a.count * nc);
  if (a.bufferView !== undefined) {
    const bv = g.json.bufferViews[a.bufferView];
    const buf = g.buffers[bv.buffer];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || size * nc;
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < nc; k++) out[i * nc + k] = readComp(dv, base + i * stride + k * size, a.componentType, a.normalized);
  }
  if (a.sparse) {
    const sp = a.sparse;
    const ib = g.json.bufferViews[sp.indices.bufferView], vb = g.json.bufferViews[sp.values.bufferView];
    const ibuf = g.buffers[ib.buffer], vbuf = g.buffers[vb.buffer];
    const idv = new DataView(ibuf.buffer, ibuf.byteOffset, ibuf.byteLength);
    const vdv = new DataView(vbuf.buffer, vbuf.byteOffset, vbuf.byteLength);
    const isz = COMP[sp.indices.componentType][1];
    for (let i = 0; i < sp.count; i++) {
      const target = readComp(idv, (ib.byteOffset || 0) + (sp.indices.byteOffset || 0) + i * isz, sp.indices.componentType, false);
      for (let k = 0; k < nc; k++) out[target * nc + k] = readComp(vdv, (vb.byteOffset || 0) + (sp.values.byteOffset || 0) + (i * nc + k) * size, a.componentType, a.normalized);
    }
  }
  return { data: out, count: a.count, ncomp: nc, min: a.min, max: a.max };
}

function readComp(dv, off, ct, norm) {
  switch (ct) {
    case 5126: return dv.getFloat32(off, true);
    case 5120: { const v = dv.getInt8(off); return norm ? Math.max(v / 127, -1) : v; }
    case 5121: { const v = dv.getUint8(off); return norm ? v / 255 : v; }
    case 5122: { const v = dv.getInt16(off, true); return norm ? Math.max(v / 32767, -1) : v; }
    case 5123: { const v = dv.getUint16(off, true); return norm ? v / 65535 : v; }
    case 5125: return dv.getUint32(off, true);
  }
  throw new Error('bad componentType ' + ct);
}

export function nodeInfo(g) {
  // print-friendly hierarchy
  const lines = [];
  const walk = (i, d) => { const n = g.nodes[i]; lines.push('  '.repeat(d) + n.name + (n.skin !== undefined ? ' [skin ' + n.skin + ']' : '') + (n.mesh !== undefined ? ' [mesh]' : '')); n.children.forEach(c => walk(c, d + 1)); };
  const roots = (g.json.scenes?.[g.json.scene || 0]?.nodes) || g.nodes.filter(n => n.parent < 0).map(n => n.index);
  roots.forEach(r => walk(r, 0));
  return lines.join('\n');
}

/**
 * Evaluate an animation at time t. Returns Map nodeIndex -> {t,q,s} overrides (only channels present).
 * Supports LINEAR, STEP and CUBICSPLINE interpolation. Quaternions use shortest-path slerp.
 */
export function prepareAnimation(g, anim) {
  const cache = new Map();
  const get = idx => { if (!cache.has(idx)) cache.set(idx, readAccessor(g, idx)); return cache.get(idx); };
  const tracks = [];
  let duration = 0;
  for (const c of anim.channels) {
    const s = anim.samplers[c.sampler];
    const times = get(s.input), vals = get(s.output);
    if (times.count) duration = Math.max(duration, times.data[times.count - 1]);
    tracks.push({ node: c.node, path: c.path, times: times.data, vals: vals.data, ncomp: vals.ncomp, interp: s.interpolation || 'LINEAR', n: times.count });
  }
  return { tracks, duration };
}

function findKey(times, n, t) {
  if (t <= times[0]) return [0, 0, 0];
  if (t >= times[n - 1]) return [n - 1, n - 1, 0];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
  return [lo, hi, (t - times[lo]) / (times[hi] - times[lo])];
}

export function slerp(a, b, f) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
  if (d > 0.9995) {
    const r = [0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * f); const l = Math.hypot(...r); return r.map(x => x / l);
  }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - f) * th) / s, wb = Math.sin(f * th) / s;
  return [0, 1, 2, 3].map(i => a[i] * wa + bb[i] * wb);
}

export function sampleAnimation(prep, t) {
  const out = new Map();
  for (const tr of prep.tracks) {
    const [i0, i1, f] = findKey(tr.times, tr.n, t);
    const nc = tr.ncomp;
    let v;
    const stride = tr.interp === 'CUBICSPLINE' ? nc * 3 : nc;
    const valAt = (i) => { const o = tr.interp === 'CUBICSPLINE' ? i * stride + nc : i * stride; return Array.from(tr.vals.subarray(o, o + nc)); };
    if (tr.interp === 'STEP' || i0 === i1) v = valAt(i0);
    else if (tr.interp === 'CUBICSPLINE') {
      const dt = tr.times[i1] - tr.times[i0], f2 = f * f, f3 = f2 * f;
      const p0 = valAt(i0), p1 = valAt(i1);
      const m0 = Array.from(tr.vals.subarray(i0 * stride + nc * 2, i0 * stride + nc * 3)).map(x => x * dt);
      const b1 = Array.from(tr.vals.subarray(i1 * stride, i1 * stride + nc)).map(x => x * dt);
      v = p0.map((_, k) => (2 * f3 - 3 * f2 + 1) * p0[k] + (f3 - 2 * f2 + f) * m0[k] + (-2 * f3 + 3 * f2) * p1[k] + (f3 - f2) * b1[k]);
      if (tr.path === 'rotation') { const l = Math.hypot(...v); v = v.map(x => x / l); }
    } else if (tr.path === 'rotation') v = slerp(valAt(i0), valAt(i1), f);
    else { const a = valAt(i0), b = valAt(i1); v = a.map((x, k) => x + (b[k] - x) * f); }
    let o = out.get(tr.node); if (!o) out.set(tr.node, o = {});
    if (tr.path === 'translation') o.t = v; else if (tr.path === 'rotation') o.q = v; else if (tr.path === 'scale') o.s = v;
  }
  return out;
}
