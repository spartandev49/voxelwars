// Visual harness for prop models: lays out every prop type (or the ones in ?types=a,b) in rows of stages 0/1/2 and variants.
// Query: ?types=tree_oak,palm  ?rows=stage|variant  ?q=marble  ?t=12  ?cam=front|iso|top  ?zoom=1
import { Engine } from '../../src/render/engine.js';
import { Arena, MAT } from '../../src/world/arena.js';
import { TerrainRenderer } from '../../src/render/terrain.js';
import { PropRenderer } from '../../src/render/props.js';
import { PROP_CATALOG } from '../../src/content/era_ancient/props/catalog.js';
const q = new URLSearchParams(location.search);
const eng = new Engine(document.body);
const types = (q.get('types') || Object.keys(PROP_CATALOG).join(',')).split(',');
const mode = q.get('rows') || 'stage';
const a = new Arena(128);
a.h.fill(10); a.m.fill(MAT.grass);
a.env = Object.assign(a.env, { time: +(q.get('t') || 12), weather: q.get('w') || 'clear', fog: 0.05 });
if (q.get('water')) { a.water = 12; for (let i = 0; i < a.h.length; i++) if ((i % 128) < 50) a.h[i] = 6; }
const tr = new TerrainRenderer(eng.scene); tr.setArena(a);
const f = eng.setEnvironment(a.env, a); tr.setFog(f.color, f.near, f.far);
eng.setQuality(q.get('q') || 'marble');
const pr = new PropRenderer(eng, a, { fx: null });
const gap = +(q.get('gap') || 5.5), s = +(q.get('s') || 1);
const cols = mode === 'variant' ? 4 : 3;
types.forEach((t, row) => {
  for (let c = 0; c < cols; c++) {
    const stage = mode === 'stage' ? c : 0, v = mode === 'variant' ? c : 0;
    pr.add({ t, x: (c - (cols - 1) / 2) * gap, z: -(row - (types.length - 1) / 2) * gap * 0.9, r: +(q.get('rot') || 0), s, v, stage });
  }
});
const n = types.length, span = Math.max(8, n * gap * 0.9);
const cam = q.get('cam') || 'iso', zoom = +(q.get('zoom') || 1);
const maxH = Math.max(...types.map((t) => PROP_CATALOG[t].h * s));
const R = Math.max(span * 0.9 + 10, maxH * 2.6, cols * gap * 1.1) * zoom;
if (cam === 'front') { eng.camera.position.set(0, maxH * 0.6 + 1, R * 0.9); eng.camera.lookAt(0, maxH * 0.4, 0); }
else if (cam === 'top') { eng.camera.position.set(0, R * 1.1, 0.01); eng.camera.lookAt(0, 0, 0); }
else { eng.camera.position.set(R * 0.35, R * 0.55 + maxH * 0.3, R * 0.8); eng.camera.lookAt(0, maxH * 0.35, 0); }
eng.focus.set(0, 3, 0);
pr.update(0.016, eng.camera);
for (let i = 0; i < 3; i++) { pr.update(0.016, eng.camera); eng.render(0.016); }
const st = pr.stats();
console.log('props ok', JSON.stringify(st));
window.__propsDone = true;
