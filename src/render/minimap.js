// MinimapFeed: the data the radar HUD (ui/hud/minimap.js) reads from `hud.minimap`:
//   { world:{w,d}, terrain:{w,h,data}, terrainVersion, dots:Float32Array [x,z,code]*n, n, frustum:[8], cam:{x,z}, markers:[{x,z,r,type}], zones:[{team,x,z,w,d}] }
// The terrain colour map is rendered once per arena (material colours shaded by height, water, prop dots). Dots are rewritten every pull (<= 10 Hz).
import { MATERIALS } from '../world/arena.js';
import { propInfo } from '../content/era_ancient/props/catalog.js';

const hex = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const PX = 112;

export function buildTerrainMap(arena, px = PX) {
  const data = new Uint8ClampedArray(px * px * 4), W = arena.worldSize(), half = W / 2;
  let hmin = 1e9, hmax = -1e9;
  for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) { const hgt = arena.cellHeight((i + 0.5) / px * W - half, (j + 0.5) / px * W - half); if (hgt < hmin) hmin = hgt; if (hgt > hmax) hmax = hgt; }
  const span = Math.max(1, hmax - hmin);
  for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
    const x = (i + 0.5) / px * W - half, z = (j + 0.5) / px * W - half, o = (j * px + i) * 4;
    const cx = arena.cx(x), cz = arena.cz(z), hgt = arena.cellHeight(x, z);
    let c;
    if (arena.isWaterCell(cx, cz)) { c = arena.lava ? [236, 98, 34] : [58, 128, 196]; const d = Math.min(1, arena.waterDepth(x, z) / 2); c = c.map((v) => v * (1 - 0.35 * d)); }
    else { const m = MATERIALS[arena.getM(cx, cz)] || MATERIALS[0]; c = hex(m.top[0]); const sh = 0.78 + 0.4 * ((hgt - hmin) / span); c = c.map((v) => Math.min(255, v * sh)); }
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  const dot = (x, z, col, r) => { const ci = Math.round((x + half) / W * px), cj = Math.round((z + half) / W * px); for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= px || j >= px) continue; const o = (j * px + i) * 4; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; } };
  for (const p of arena.props || []) { const info = propInfo(p.t); if (!info) continue; if (info.cat === 'nature') dot(p.x, p.z, [38, 92, 44], 0); else if (info.blocks === 'full' || info.cat === 'monuments') dot(p.x, p.z, [210, 206, 196], info.r > 1.4 ? 1 : 0); }
  return { w: px, h: px, data };
}

export class MinimapFeed {
  constructor() { this.arena = null; this.terrain = null; this.version = 0; this.dots = new Float32Array(3 * 1024); this.out = { world: { w: 0, d: 0 }, terrain: null, terrainVersion: 0, dots: this.dots, n: 0, frustum: [0, 0, 0, 0, 0, 0, 0, 0], cam: { x: 0, z: 0 }, markers: [], zones: [] }; this._v = null; this._cp = null; }
  setArena(arena) { this.arena = arena; this.terrain = buildTerrainMap(arena); this.version++; this.out.terrain = this.terrain; this.out.terrainVersion = this.version; const W = arena.worldSize(); this.out.world.w = W; this.out.world.d = W; this.out.markers = (arena.markers || []).map((m) => ({ x: m.x, z: m.z, r: m.r, type: m.type })); }
  /** terrain changed (crater / builder edit): rebuild the colour map lazily */
  invalidate() { if (this.arena) { this.terrain = buildTerrainMap(this.arena); this.version++; this.out.terrain = this.terrain; this.out.terrainVersion = this.version; } }
  update(world, camera, selectedId, planeY, showZones) {
    const o = this.out, THREE = window.THREE; if (!world || !camera || !THREE) return null;
    const U = world.units; let n = 0; const need = U.length * 3;
    if (this.dots.length < need) { this.dots = new Float32Array(Math.ceil(need * 1.5)); o.dots = this.dots; }
    const d = this.dots;
    for (let i = 0; i < U.length; i++) { const u = U[i]; const def = u.def; const kind = u.id === selectedId ? 3 : def.role === 'hero' ? 1 : (def.mass >= 8 ? 2 : 0); d[n++] = u.x; d[n++] = u.z; d[n++] = u.team + 2 * kind; }
    o.n = n / 3;
    // camera footprint on the ground plane
    const v = this._v || (this._v = new THREE.Vector3()), cp = camera.position, f = o.frustum, corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      v.set(corners[k][0], corners[k][1], 0.5).unproject(camera); const dx = v.x - cp.x, dy = v.y - cp.y, dz = v.z - cp.z;
      let t = dy < -1e-4 ? (planeY - cp.y) / dy : 1e9; const maxT = 170 / Math.max(1e-3, Math.hypot(dx, dz)); if (t > maxT) t = maxT; if (t < 0) t = maxT;
      f[k * 2] = cp.x + dx * t; f[k * 2 + 1] = cp.z + dz * t;
    }
    o.cam.x = cp.x; o.cam.z = cp.z;
    if (showZones && this.arena && this.arena.zones) { const z = this.arena.zones; o.zones = [{ team: 0, x: z.A.x, z: z.A.z, w: z.A.w, d: z.A.d }, { team: 1, x: z.B.x, z: z.B.z, w: z.B.w, d: z.B.d }]; } else if (o.zones.length) o.zones = [];
    return o;
  }
}
