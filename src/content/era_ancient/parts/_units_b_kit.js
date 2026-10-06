// Helpers shared by the UNITS-B part modules (units_b_*.js). A leading '_' keeps this file out of the generated registry.
// Everything works in grid voxel indices like _kit.js; nothing here registers parts.
import { V, G, shade, mixRGB, hash3 } from './_kit.js';

/** keep a coordinate inside [0, n-1] so a builder can never write out of its grid */
export const cl = (v, n) => Math.max(0, Math.min(n - 1, v));

/** fur colour with stable noise: base 0xRRGGBB, lo..hi shade range */
export const furV = (base, x, y, z, s = 1, lo = 0.72, hi = 1.12) => V(shade(base, lo + (hi - lo) * hash3(x, y, z, s)));

/** one cuboid brush of size w x h x d with its min corner at (x,y,z), through setter fn */
export function brush(set, x, y, z, w, h, d, v) {
  for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) set(x + i, y + j, z + k, typeof v === 'function' ? v(x + i, y + j, z + k) : v);
}

/**
 * Draw a thick polyline through `pts` ([x,y,z] voxel indices, any space with a set(x,y,z,v) method) with a cube brush of `thick`
 * voxels, then a snake head at the last point. colorAt(i, x, y, z) gives the body voxel; the head faces along the last segment's dominant axis
 * and is 2 long x (thick+2) wide x `o.headH` (default thick) high; eyes are GLOW voxels on the outer top corners of the front row, the tongue a red fork.
 * `o.ok(x,y,z)` (default: everything) lets the caller clip cells that would fall outside its grid. Used by Medusa's hair.
 */
export function snake(S, pts, thick, colorAt, o = {}) {
  const rnd = Math.round, ok = o.ok || (() => true);
  const put0 = (x, y, z, v) => { if (ok(x, y, z)) S.set(x, y, z, v); };
  let n = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s], b = pts[s + 1];
    const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let i = 0; i <= len; i++) {
      const t = i / len, x = rnd(a[0] + (b[0] - a[0]) * t), y = rnd(a[1] + (b[1] - a[1]) * t), z = rnd(a[2] + (b[2] - a[2]) * t);
      brush((xx, yy, zz, v) => put0(xx, yy, zz, v), x, y, z, thick, thick, thick, (xx, yy, zz) => colorAt(n, xx, yy, zz));
      n++;
    }
  }
  const p = pts[pts.length - 1], q = pts[pts.length - 2];
  const dv = [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const ax = Math.abs(dv[0]) >= Math.abs(dv[1]) && Math.abs(dv[0]) >= Math.abs(dv[2]) ? 0 : (Math.abs(dv[1]) >= Math.abs(dv[2]) ? 1 : 2);
  const sg = dv[ax] >= 0 ? 1 : -1;
  const up = ax === 1 ? 2 : 1, side = 3 - ax - up;
  const head = o.head || V(0x4f9a3a), eye = o.eye || G(0xd8ff50), tongue = o.tongue || V(0xd8281c);
  const put = (f, s2, u, v) => { const c = [0, 0, 0]; c[ax] = sg > 0 ? p[ax] + thick - 1 + f : p[ax] - f; c[side] = p[side] + s2; c[up] = p[up] + u; put0(c[0], c[1], c[2], v); };
  const hH = o.headH || thick;
  const hL = o.headL || 2;
  for (let f = 1; f <= hL; f++) for (let s2 = -1; s2 <= thick; s2++) for (let u = 0; u < hH; u++) put(f, s2, u, head);
  put(hL, -1, hH - 1, eye); put(hL, thick, hH - 1, eye);
  put(hL + 1, 0, 0, tongue); put(hL + 2, 0, 0, tongue); put(hL + 2, -1, 0, tongue); put(hL + 2, 1, 0, tongue);
}

/** alternating purple/gold fringe voxel for hems (x or z index decides) */
export const fringeV = (ctx, i, k = 1) => V(i % 2 ? shade(ctx.c.primary, 0.95 * k) : shade(ctx.c.secondary, 0.95 * k));
