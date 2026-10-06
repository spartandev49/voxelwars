// Page for tools/arena_sheet.mjs: renders any generator recipe with Engine + TerrainRenderer + PropRenderer (+ CubeFX for torch fire)
// from three named cameras. The Node tool drives window.__sheet.* through Playwright.
import { Engine } from '../../src/render/engine.js';
import { generateArena, RECIPES } from '../../src/world/gen.js';
import { TerrainRenderer } from '../../src/render/terrain.js';
import { PropRenderer } from '../../src/render/props.js';
import { CubeFX } from '../../src/render/fx.js';

const eng = new Engine(document.body);
const tr = new TerrainRenderer(eng.scene);
let pr = null, fx = null, arena = null, info = null;
const T = window.THREE;

// per-recipe hero shots: preferred camera spot (fx,fz as fractions of the arena width), target (tx,tz) and heights above ground.
// The page then searches around the preferred spot for a position that is clear of props with a clear line of sight.
const HERO = {
  marathon: { f: [-0.3, 0.2], t: [-0.06, 0.02], h: 4.2, ty: 3 },
  thermopylae: { f: [-0.3, 0.12], t: [-0.05, 0], h: 4.6, ty: 4 },
  colosseum: { f: [-0.22, 0.04], t: [0.12, 0], h: 4.0, ty: 5 },
  nile: { f: [-0.2, -0.14], t: [0, 0], h: 4.2, ty: 1.5 },
  giza: { f: [-0.3, 0.0], t: [0, -0.3], h: 4.4, ty: 6 },
  persepolis: { f: [0, 0.39], t: [0, -0.34], h: 4.4, ty: 3.5 },
  carthage: { f: [-0.08, -0.36], t: [0.3, -0.1], h: 4.6, ty: 1.5 },
  teutoburg: { f: [-0.34, 0.1], t: [0, 0], h: 3.6, ty: 3 },
  alpine: { f: [-0.34, 0.1], t: [0.1, 0], h: 4.6, ty: 8 },
  olympus: { f: [-0.1, 0.12], t: [0, -0.3], h: 5.0, ty: 6 },
  troy: { f: [-0.3, 0.03], t: [0.1, 0], h: 4.4, ty: 8 },
  styx: { f: [-0.3, 0.0], t: [0, -0.1], h: 5.0, ty: 2 },
  cyclops: { f: [-0.3, 0.3], t: [0, 0.05], h: 4.4, ty: 4.5 },
  oasis: { f: [-0.3, 0.12], t: [0, 0], h: 3.8, ty: 2 },
};
function groundAt(x, z) { return arena.heightAt(x, z); }
function maxGround(x, z, r) { let m = 0; for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) m = Math.max(m, arena.cellHeight(x + dx, z + dz)); return m; }
const SMALL = new Set(['bush', 'wheat', 'reeds', 'bones', 'skull_pile', 'rock_small', 'fire_pit', 'campfire', 'goat_pen', 'log', 'crowd', 'cloud_island']);
function camOk(x, z, tx, tz) {
  const half = arena.half();
  if (Math.abs(x) > half - 3 || Math.abs(z) > half - 3) return false;
  if (arena.water > 0 && arena.getH(arena.cx(x), arena.cz(z)) < arena.water + 1) return false;
  const dx = tx - x, dz = tz - z, L2 = dx * dx + dz * dz || 1;
  for (const p of arena.props) {
    if (SMALL.has(p.t)) continue;
    const r = Math.max(0.8, (p.s || 1) * (p.t === 'tower' || p.t === 'temple' || p.t === 'pyramid' ? 2.6 : 1.9));
    if ((p.x - x) ** 2 + (p.z - z) ** 2 < (r + 2.4) ** 2) return false;                 // camera inside / hugging a prop
    const u = Math.max(0, Math.min(1, ((p.x - x) * dx + (p.z - z) * dz) / L2)), cx = x + dx * u, cz = z + dz * u;
    if (u < 0.88 && (p.x - cx) ** 2 + (p.z - cz) ** 2 < (r * 0.55 + 0.7) ** 2 && (p.t.startsWith('tree') || p.t === 'palm' || p.t === 'column_marble' || p.t === 'rock_big')) return false;   // trees in the way
  }
  return true;
}
function heroSpot(spec, W) {
  const tx = spec.t[0] * W, tz = spec.t[1] * W, fx = spec.f[0] * W, fz = spec.f[1] * W;
  const ang0 = Math.atan2(fz - tz, fx - tx), r0 = Math.hypot(fx - tx, fz - tz);
  for (let k = 0; k < 60; k++) {
    const da = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.12, dr = 1 + (k % 5 - 2) * 0.12, a = ang0 + da, r = r0 * dr;
    const x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r;
    if (camOk(x, z, tx, tz)) return [x, z, tx, tz];
  }
  return [fx, fz, tx, tz];
}

window.__sheet = {
  recipes: RECIPES,
  load(recipe, size = 'medium', seed = 3, opts = {}) {
    arena = generateArena(recipe, size, seed);
    if (opts.time !== undefined) arena.env.time = opts.time;
    if (opts.weather) arena.env.weather = opts.weather;
    tr.setArena(arena);
    if (pr) pr.dispose();
    if (fx) fx.dispose();
    eng.setQuality(opts.quality || 'marble');
    fx = new CubeFX(eng.scene, arena, eng.q.debris);
    const t0 = performance.now();
    pr = new PropRenderer(eng, arena, { fx });
    const buildMs = performance.now() - t0;
    const f = eng.setEnvironment(arena.env, arena); tr.setFog(f.color, f.near, f.far);
    if (opts.look) {   // look-dev experiment: multipliers on the engine light rig (does not touch engine.js)
      eng.sun.intensity *= opts.look.sun ?? 1; eng.hemi.intensity *= opts.look.hemi ?? 1; eng.renderer.toneMappingExposure = opts.look.exp ?? eng.renderer.toneMappingExposure;
    }
    info = { buildMs: Math.round(buildMs), light: [eng.sun.intensity, eng.hemi.intensity, eng.renderer.toneMappingExposure], recipe, size: arena.size, W: arena.worldSize(), props: arena.props.length, water: arena.water, env: arena.env };
    window.__pr = pr; window.__arena = arena;
    return info;
  },
  cam(name, w, h) {
    const W = arena.worldSize(), c = eng.camera;
    if (w && h) { eng.renderer.setSize(w, h, false); c.aspect = w / h; c.updateProjectionMatrix(); eng.resize(); }
    const half = W / 2;
    if (name === 'top') {
      const H = (half * 1.2) / Math.tan((c.fov / 2) * Math.PI / 180);
      c.position.set(0, H, H * 0.05); c.lookAt(0, 0, 0); eng.focus.set(0, 8, 0);
    } else if (name === 'oblique') {
      c.position.set(-W * 0.52, W * 0.4, W * 0.5); c.lookAt(W * 0.02, groundAt(0, 0) * 0.6, 0); eng.focus.set(0, groundAt(0, 0), 0);
    } else {
      const spec = HERO[info.recipe] || { f: [-0.28, 0.1], t: [0, 0], h: 4, ty: 3 };
      const [cx0, cz0, tx, tz] = heroSpot(spec, W), gy = maxGround(cx0, cz0, 1);
      c.position.set(cx0, gy + spec.h, cz0); c.lookAt(tx, groundAt(tx, tz) + spec.ty, tz);
      eng.focus.set(tx, groundAt(tx, tz), tz);
    }
    c.updateMatrixWorld();
    return true;
  },
  render(frames = 2) {
    for (let i = 0; i < 24; i++) { fx.update(0.05); pr.update(0.05, eng.camera); }
    for (let i = 0; i < frames; i++) { tr.update(0.016); eng.render(0.016); }
    return pr.stats();
  },
};
window.__ready = true;
