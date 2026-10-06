// Part icons for the Workshop pickers: a tiny orthographic render (2D canvas, no WebGL) of the voxels a registry part builds, in the soldier's CURRENT colours.
// Helms and faces are seen from the front, weapons from the side (the blade is flat towards +X), team-tinted voxels get the team A colour so the tint shows.
import { PART_REGISTRY, CATEGORIES, makeCtx } from '../../content/era_ancient/blueprints.js';
import { METALS, EMBLEMS } from '../../content/era_ancient/parts/_kit.js';
import { VoxelGrid } from '../../voxel/grid.js';
import { RNG, hashString } from '../../core/rng.js';

const TEAM = [0x2f, 0x6b, 0xff];
/** which part grids make the icon and where they sit (voxel offsets in a shared "icon space", y up) */
const LAYOUT = {
  helms: [['head', 0, 0], ['crest', 0, 6]], hair: [['head', 0, 0], ['crest', 0, 6]], faces: [['head', 0, 0]],
  tunics: [['body', 0, 0]], armors: [['body', 0, 0]], shoulders: [['body', 0, 0]],
  legs: [['legLL', 0, 0], ['legUL', 0, 5]], skirts: [['legUL', 0, 5]],
  capes: [['cape2', 0, 0], ['cape', 0, 10]], backs: [['back', 0, 0]], mains: [['weapon', 0, 0]], offs: [['offhand', 0, 0]],
};
const CACHE = new Map();

function buildOutput(cat, id, bp) {
  const e = PART_REGISTRY[cat][id]; if (!e || (id === 'none' && !e.build)) return null;
  const ctx = makeCtx(bp, {}); ctx.noEyes = false;
  ctx.rng = new RNG(hashString(bp.id || 'icon')).fork(cat + ':' + id);
  if (cat === 'mains') { ctx.len = e.meta.len || 0; ctx.back = e.meta.back !== undefined ? e.meta.back : 8; }
  if (e.meta && e.meta.metal) { ctx.m = METALS[e.meta.metal]; ctx.metalKey = e.meta.metal; }
  const out = e.build(ctx); if (!out) return null;
  return out instanceof VoxelGrid ? { [CATEGORIES[cat].target]: out } : out;
}

/** The icon as a canvas (cached). `bp` = the soldier's normalised blueprint (its colours decide the look). */
export function partIcon(cat, id, bp, size = 48) {
  const sig = [bp.colors.primary, bp.colors.secondary, bp.colors.trim, bp.colors.cloth, bp.colors.metal, bp.body.skin, bp.body.hair, bp.emblem, bp.id].join('|');
  const key = cat + ':' + id + ':' + size + ':' + sig;
  const hit = CACHE.get(key); if (hit) { const c = document.createElement('canvas'); c.width = hit.width; c.height = hit.height; c.getContext('2d').drawImage(hit, 0, 0); return c; }
  const px = size * 2, cv = document.createElement('canvas'); cv.width = cv.height = px; cv.className = 'ws-icon';
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  let out = null; try { out = buildOutput(cat, id, bp); } catch (e) { out = null; }
  if (!out) { drawNone(g, px); } else drawVoxels(g, px, out, LAYOUT[cat] || [], cat === 'mains');
  if (CACHE.size > 700) CACHE.clear();
  CACHE.set(key, cv);
  const c2 = document.createElement('canvas'); c2.width = c2.height = px; c2.className = 'ws-icon'; c2.getContext('2d').drawImage(cv, 0, 0); return c2;
}

function drawNone(g, px) {
  g.strokeStyle = 'rgba(185,194,224,.55)'; g.lineWidth = Math.max(2, px / 16); g.setLineDash([px / 10, px / 14]);
  g.beginPath(); g.arc(px / 2, px / 2, px * 0.27, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(px * 0.33, px * 0.67); g.lineTo(px * 0.67, px * 0.33); g.stroke();
}

function drawVoxels(g, px, out, layout, side) {
  // z-buffer of the composite (front view: depth = z, horizontal = x; side view: depth = x, horizontal = z)
  const cells = new Map(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [pid, dx, dy] of layout) {
    const gr = out[pid]; if (!gr) continue;
    for (let y = 0; y < gr.sy; y++) for (let z = 0; z < gr.sz; z++) for (let x = 0; x < gr.sx; x++) {
      const v = gr.d[x + gr.sx * (z + gr.sz * y)]; if (!v) continue;
      const hx = (side ? z : x) + dx, hy = y + dy, depth = side ? x : z, k = hx * 4096 + hy;
      const cur = cells.get(k); if (!cur || depth >= cur.d) cells.set(k, { v, d: depth, x: hx, y: hy });
      if (hx < x0) x0 = hx; if (hx > x1) x1 = hx; if (hy < y0) y0 = hy; if (hy > y1) y1 = hy;
    }
  }
  if (!cells.size) { drawNone(g, px); return; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.max(1, Math.floor((px - 8) / Math.max(w, h)));
  const ox = Math.floor((px - w * s) / 2), oy = Math.floor((px - h * s) / 2);
  g.fillStyle = '#14163a';
  for (const c of cells.values()) for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!cells.has((c.x + ax) * 4096 + (c.y + ay))) g.fillRect(ox + (c.x + ax - x0) * s, oy + (y1 - (c.y + ay)) * s, s, s); }
  for (const c of cells.values()) {
    const v = c.v, fl = (v >>> 24) & 255; let r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
    if (fl & 2) { r = Math.round(r * TEAM[0] / 255); gg = Math.round(gg * TEAM[1] / 255); b = Math.round(b * TEAM[2] / 255); }
    if (fl & 4) { r = Math.min(255, r + 40); gg = Math.min(255, gg + 40); b = Math.min(255, b + 40); }
    g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(ox + (c.x - x0) * s, oy + (y1 - c.y) * s, s, s);
  }
}

/** 8x8 emblem sprite as a canvas icon. */
export function emblemIcon(name, color = '#f3f6fb', size = 32) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.className = 'ws-icon';
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const rows = EMBLEMS[name];
  if (!rows) { drawNone(g, size); return cv; }
  const s = Math.floor(size / 8), o = Math.floor((size - s * 8) / 2);
  g.fillStyle = color; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (rows[r][c] === '#') g.fillRect(o + c * s, o + r * s, s, s);
  return cv;
}
