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

// per-recipe hero shots: [camera offset from the focus, focus point] in world units (y = metres above ground at the focus)
const HERO = {
  thermopylae: (a, W) => ({ pos: [-W * 0.16, 4.2, W * 0.1], look: [-W * 0.05, 3.5, 0] }),
  colosseum: (a, W) => ({ pos: [-W * 0.2, 4.5, W * 0.08], look: [W * 0.1, 5, 0] }),
  nile: (a, W) => ({ pos: [-W * 0.18, 4, -W * 0.28], look: [0, 1.5, 0] }),
  giza: (a, W) => ({ pos: [-W * 0.24, 4, W * 0.05], look: [0, 6, -W * 0.3] }),
  persepolis: (a, W) => ({ pos: [-W * 0.2, 4.2, W * 0.25], look: [0, 3, -W * 0.1] }),
  carthage: (a, W) => ({ pos: [-W * 0.1, 4.5, -W * 0.3], look: [W * 0.35, 2, -W * 0.1] }),
  teutoburg: (a, W) => ({ pos: [-W * 0.3, 3.4, W * 0.1], look: [0, 3, 0] }),
  alpine: (a, W) => ({ pos: [-W * 0.3, 4, W * 0.06], look: [W * 0.1, 8, 0] }),
  olympus: (a, W) => ({ pos: [-W * 0.18, 5.5, -W * 0.1], look: [0, 8, W * 0.26] }),
  troy: (a, W) => ({ pos: [-W * 0.18, 4.5, W * 0.02], look: [W * 0.1, 7, 0] }),
  styx: (a, W) => ({ pos: [-W * 0.34, 4, -W * 0.12], look: [0, 2.5, 0] }),
  cyclops: (a, W) => ({ pos: [-W * 0.16, 3.6, W * 0.2], look: [0, 4.5, -W * 0.08] }),
  oasis: (a, W) => ({ pos: [-W * 0.3, 3.4, W * 0.12], look: [0, 2, 0] }),
};
function groundAt(x, z) { return arena.heightAt(x, z); }
function maxGround(x, z, r) { let m = 0; for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) m = Math.max(m, arena.cellHeight(x + dx, z + dz)); return m; }
/** Nudge a camera position off props (a hero shot must not sit inside a tree) by spiralling out to the nearest clear spot. */
function clearSpot(x, z) {
  const free = (px, pz) => !arena.props.some((p) => p.t !== 'bush' && p.t !== 'wheat' && p.t !== 'reeds' && p.t !== 'bones' && (p.x - px) ** 2 + (p.z - pz) ** 2 < (2.2 + (p.s || 1) * 1.6) ** 2);
  if (free(x, z)) return [x, z];
  for (let r = 1.5; r < 14; r += 1.5) for (let a = 0; a < 6.28; a += 0.5) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz)) return [px, pz]; }
  return [x, z];
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
    pr = new PropRenderer(eng, arena, { fx });
    const f = eng.setEnvironment(arena.env, arena); tr.setFog(f.color, f.near, f.far);
    if (opts.look) {   // look-dev experiment: multipliers on the engine light rig (does not touch engine.js)
      eng.sun.intensity *= opts.look.sun ?? 1; eng.hemi.intensity *= opts.look.hemi ?? 1; eng.renderer.toneMappingExposure = opts.look.exp ?? eng.renderer.toneMappingExposure;
    }
    info = { light: [eng.sun.intensity, eng.hemi.intensity, eng.renderer.toneMappingExposure], recipe, size: arena.size, W: arena.worldSize(), props: arena.props.length, water: arena.water, env: arena.env };
    window.__pr = pr; window.__arena = arena;
    return info;
  },
  cam(name, w, h) {
    const W = arena.worldSize(), c = eng.camera;
    if (w && h) { eng.renderer.setSize(w, h, false); c.aspect = w / h; c.updateProjectionMatrix(); eng.resize(); }
    const half = W / 2;
    if (name === 'top') {
      const H = (half * 1.04) / Math.tan((c.fov / 2) * Math.PI / 180);
      c.position.set(0, H, H * 0.05); c.lookAt(0, 0, 0); eng.focus.set(0, 8, 0);
    } else if (name === 'oblique') {
      c.position.set(-W * 0.52, W * 0.4, W * 0.5); c.lookAt(W * 0.02, groundAt(0, 0) * 0.6, 0); eng.focus.set(0, groundAt(0, 0), 0);
    } else {
      const spec = (HERO[info.recipe] || ((a, WW) => ({ pos: [-WW * 0.24, 3.8, WW * 0.1], look: [0, 3, 0] })))(arena, W);
      const [cx0, cz0] = clearSpot(spec.pos[0], spec.pos[2]), gy = maxGround(cx0, cz0, 2);
      c.position.set(cx0, gy + spec.pos[1], cz0); c.lookAt(spec.look[0], spec.look[1] + 0 * gy, spec.look[2]);
      eng.focus.set(spec.look[0], groundAt(spec.look[0], spec.look[2]), spec.look[2]);
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
