// Pure geometry helpers for the Arena Builder: brush falloffs, symmetry transforms in cell and world space, rectangles.
// Everything works in "cell space" (u, v) = ((x + half) / CELL, (z + half) / CELL) so mirrored dabs are exactly symmetric:
// the mirror of cell column c is n - 1 - c and the mirror of a continuous u is n - u, both exact in floating point.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); };

/** Brush weight for normalised distance d in [0, 1]. */
export function falloffW(kind, d) {
  if (d >= 1) return 0;
  if (kind === 'flat') return 1;
  if (kind === 'linear') return 1 - d;
  return 0.5 + 0.5 * Math.cos(Math.PI * d);        // 'smooth'
}
/** Normalised distance of a cell centre (cx + 0.5, cz + 0.5) from the dab centre (u, v), for a circle or a square of radius rc cells. */
export function brushDist(shape, cx, cz, u, v, rc) {
  const dx = cx + 0.5 - u, dz = cz + 0.5 - v;
  return (shape === 'square' ? Math.max(Math.abs(dx), Math.abs(dz)) : Math.sqrt(dx * dx + dz * dz)) / rc;
}

// ---------------------------------------------------------------- symmetry
/** Positions (cell space) of a dab and its symmetric copies. The original is always first. */
export function symPoints(mode, u, v, n) {
  const out = [[u, v]];
  if (mode === 'mx') out.push([n - u, v]);
  else if (mode === 'mz') out.push([u, n - v]);
  else if (mode === 'rot') out.push([n - u, n - v]);
  return out;
}
/** The mirror cell index of (cx, cz) under a symmetry mode, or -1 for 'off'. */
export function symCell(mode, cx, cz, n) {
  if (mode === 'mx') return (n - 1 - cx) + cz * n;
  if (mode === 'mz') return cx + (n - 1 - cz) * n;
  if (mode === 'rot') return (n - 1 - cx) + (n - 1 - cz) * n;
  return -1;
}
/** Canonical representative cell of a symmetry class (for hashes that must agree across mirrored cells). */
export function canonCell(mode, cx, cz, n) {
  if (mode === 'mx') return [Math.min(cx, n - 1 - cx), cz];
  if (mode === 'mz') return [cx, Math.min(cz, n - 1 - cz)];
  if (mode === 'rot') { const ox = n - 1 - cx, oz = n - 1 - cz; return (ox < cx || (ox === cx && oz < cz)) ? [ox, oz] : [cx, cz]; }
  return [cx, cz];
}
/** World-space copies {x, z, r} of a placed thing (r = heading in radians as props use it). The original is NOT included. */
export function symWorld(mode, x, z, r) {
  if (mode === 'mx') return [{ x: -x, z, r: -r }];
  if (mode === 'mz') return [{ x, z: -z, r: Math.PI - r }];
  if (mode === 'rot') return [{ x: -x, z: -z, r: r + Math.PI }];
  return [];
}
/** Symmetric field wrapper: averages f over the symmetric copies so noise and other fields are continuous and symmetric. */
export function symField(mode, f, n) {
  if (mode === 'mx') return (u, v) => (f(u, v) + f(n - u, v)) * 0.5;
  if (mode === 'mz') return (u, v) => (f(u, v) + f(u, n - v)) * 0.5;
  if (mode === 'rot') return (u, v) => (f(u, v) + f(n - u, n - v)) * 0.5;
  return f;
}

// ---------------------------------------------------------------- hashing
/** Deterministic hash of two integers and a seed to [0, 1). */
export function hash01(x, z, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- rectangles
/** Zone rect {x, z, w, d} (centre + size) -> {x0, z0, x1, z1}. */
export function zoneBox(zn) { return { x0: zn.x - zn.w / 2, x1: zn.x + zn.w / 2, z0: zn.z - zn.d / 2, z1: zn.z + zn.d / 2 }; }
export function boxesOverlap(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0; }
export function inZoneRect(zn, x, z, pad = 0) { return Math.abs(x - zn.x) <= zn.w / 2 + pad && Math.abs(z - zn.z) <= zn.d / 2 + pad; }
export function unionRect(a, b) {
  if (!a) return b ? { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 } : null;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), z0: Math.min(a.z0, b.z0), x1: Math.max(a.x1, b.x1), z1: Math.max(a.z1, b.z1) };
}
