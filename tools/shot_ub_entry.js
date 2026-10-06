// Browser entry for tools/shot_ub.mjs (UNITS-B copy of the BEASTS sheet page): renders contact sheets of the BEASTS models with VoxSkin (one cell at a time into a 2D canvas).
// Config arrives as window.__SHEET = {only?:[ids], group?:string, cell:number, mode:'sheet'|'zoom'|'turn', angles?:number[]}.
// The finished PNG is published as window.__SHEET_RESULT = {dataUrl, models:[...ids], log:[...]}.
import { Engine, lin } from '../src/render/engine.js';
import { VoxSkin, newPose } from '../src/render/voxskin.js';
import { SHEET_MODELS as BASE_MODELS, BUILDERS } from '../src/content/era_ancient/beasts/index.js';
import { compileSoldier } from '../src/content/era_ancient/blueprints.js';
import { modelBounds } from '../src/content/era_ancient/beasts/common.js';

const cfg = Object.assign({ cell: 240, mode: 'sheet', only: null, group: null, labels: true }, window.__SHEET || {});
const T = window.THREE;
const TEAMS = [lin(0x2f6bff), lin(0xe23b3b)];            // A cobalt, B crimson (spec: team 0 blue, team 1 red)
const ANGLES = cfg.angles || [{ n: '3/4 front', h: 0.62 }, { n: 'side', h: Math.PI / 2 }, { n: 'rear 3/4', h: Math.PI + 0.62 }];
const log = [];

// UNITS-B copy of tests/beasts/sheet_demo.js: renders the mounted / crewed units with the UNITS-B riders and crews (units/units_b.js) seated.
import '../src/content/era_ancient/units/units_b.js';
import { BLUEPRINTS as UB, RIDERS, CREWS } from '../src/content/era_ancient/units/units_b.js';
const cm = (id) => compileSoldier(UB[id]).model;
const UB_MODELS = [
  ...Object.entries(RIDERS).map(([u, r]) => ({ id: u, group: 'mount', label: u.replace(/_/g, ' ') + ' + ' + r, make: () => BUILDERS[u]({ rider: cm(r) }) })),
  ...Object.entries(CREWS).map(([u, cs]) => ({ id: u, group: 'siege', label: u.replace(/_/g, ' ') + ' + crew', make: () => BUILDERS[u]({ crew: cs.map(cm) }) })),
];
const SHEET_MODELS = UB_MODELS;
let list = SHEET_MODELS.slice();
if (cfg.group) list = list.filter((m) => m.group === cfg.group);
if (cfg.only) list = cfg.only.map((id) => list.find((m) => m.id === id) || SHEET_MODELS.find((m) => m.id === id)).filter(Boolean);

const host = document.createElement('div');
host.style.cssText = `position:fixed;left:0;top:0;width:${cfg.cell}px;height:${cfg.cell}px`;
document.body.appendChild(host);
const eng = new Engine(host);
eng.setQuality('papyrus');
eng.composer = null;
eng.renderer.setPixelRatio(1);
const CW = cfg.cell, CH = cfg.cell;
eng.renderer.setSize(CW, CH, false);
eng.camera.aspect = CW / CH; eng.camera.fov = 26; eng.camera.updateProjectionMatrix();
eng.sky.visible = false; if (eng.clouds) eng.clouds.visible = false;
eng.setEnvironment({ time: 11, weather: 'clear', fog: 0 }, null);
eng.scene.fog = null;
eng.hemi.intensity = 0.95; eng.sun.intensity = 1.25;
eng.renderer.setClearColor(0xc9d6e0, 1);
eng.shadowRadius = 9;
// ground disc
const ground = new T.Mesh(new T.CylinderGeometry(7, 7, 0.4, 40), new T.MeshLambertMaterial({ color: 0x8fa070 }));
ground.position.y = -0.2; ground.receiveShadow = true;
eng.scene.add(ground);

const sheetCols = cfg.mode === 'zoom' ? 1 : 6;
const labelW = cfg.labels ? 150 : 0;

function build(entry) {
  const t0 = performance.now();
  const model = entry.make();
  const skin = new VoxSkin(eng, model, { capacity: 4, shadow: true });
  const pose = newPose(model.parts.length);
  log.push(`${entry.id}: parts=${model.parts.length} verts=${skin.geometry.attributes.position.count} tris=${skin.triangles} build=${(performance.now() - t0).toFixed(0)}ms`);
  return { entry, model, skin, pose, b: modelBounds(model) };
}

function frame(item, heading, team, pxH, V) {
  const { skin, pose, b } = item;
  for (const o of built) o.skin.mesh.visible = false;
  skin.begin();
  skin.add(0, 0, 0, heading, 1, 1, 1, pose, [team.r, team.g, team.b], 0, 0, 0, 0, 0);
  skin.end();
  skin.mesh.visible = true;
  const hr = Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]), Math.abs(b.min[2]), Math.abs(b.max[2]));
  const hh = (b.max[1] - b.min[1]) / 2;
  const R = Math.sqrt(hr * hr + hh * hh) * (item.fitMul || 1);
  const cy = (b.min[1] + b.max[1]) / 2;
  const cam = eng.camera;
  let dist = (R / Math.sin(cam.fov * Math.PI / 360)) * 0.98;
  if (pxH) dist = ((b.max[1] - b.min[1]) * V) / (2 * pxH * Math.tan(cam.fov * Math.PI / 360));   // native pixel height of the model
  const el = 0.2;
  cam.position.set(0, cy + Math.sin(el) * dist, Math.cos(el) * dist);
  cam.lookAt(0, cy, 0);
  eng.focus.set(0, cy, 0);
  ground.scale.set(Math.max(0.3, R / 7 * 1.8), 1, Math.max(0.3, R / 7 * 1.8));
  eng.shadowRadius = Math.max(4, R * 1.6);
  eng.render(0);
}

const built = [];
for (const e of list) { try { built.push(build(e)); } catch (err) { log.push(`FAILED ${e.id}: ${err.message}`); console.error(err); } }
// warm-up render so shaders compile before the first captured cell
if (built.length) frame(built[0], 0, TEAMS[0]);

const rows = built.length;
let sheet, ctx;
function startSheet(w, h) {
  sheet = document.createElement('canvas'); sheet.width = w; sheet.height = h;
  ctx = sheet.getContext('2d'); ctx.fillStyle = '#20242c'; ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
}
const gl = eng.renderer.domElement;

if (cfg.mode === 'sheet') {
  const head = cfg.labels ? 26 : 0;
  startSheet(labelW + CW * 6, head + rows * CH);
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#e8e8e8';
  if (cfg.labels) {
    for (let t = 0; t < 2; t++) ANGLES.forEach((a, i) => ctx.fillText(`team ${t ? 'B red' : 'A blue'} - ${a.n}`, labelW + (t * 3 + i) * CW + 8, 17));
  }
  built.forEach((item, r) => {
    if (cfg.labels) { ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(item.entry.label || item.entry.id, 8, head + r * CH + 22); ctx.font = '11px sans-serif'; ctx.fillStyle = '#b9c0cc'; ctx.fillText(`${item.model.parts.length} parts`, 8, head + r * CH + 40); }
    for (let t = 0; t < 2; t++) ANGLES.forEach((a, i) => {
      frame(item, a.h, TEAMS[t]);
      ctx.drawImage(gl, 0, 0, CW, CH, labelW + (t * 3 + i) * CW, head + r * CH, CW, CH);
    });
  });
} else if (cfg.mode === 'zoom') {
  // native 120 / 80 / 40 px model height renders (3/4 side view), team A then team B, side by side per model (width follows the footprint)
  const sizes = [120, 80, 40], head = 24, rowH = 190, gap = 8;
  const widths = built.map((item) => {
    const hgt = item.b.max[1] - item.b.min[1], hr = Math.max(Math.abs(item.b.min[0]), Math.abs(item.b.max[0]), Math.abs(item.b.min[2]), Math.abs(item.b.max[2]));
    return sizes.map((s) => Math.max(Math.ceil(s * 1.4), Math.ceil(2 * hr * (s / hgt) * 1.12)));
  });
  const rowW = (r) => 2 * widths[r].reduce((a, w) => a + w + gap, 0);
  startSheet(labelW + Math.max(...built.map((_, r) => rowW(r))), head + rows * rowH);
  ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#e8e8e8';
  ctx.fillText('team A blue: 120 / 80 / 40 px tall   |   team B red: 120 / 80 / 40 px tall   (native renders, nothing upscaled)', labelW, 17);
  built.forEach((item, r) => {
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(item.entry.label || item.entry.id, 8, head + r * rowH + 22);
    let x = labelW;
    for (let t = 0; t < 2; t++) sizes.forEach((s, i) => {
      const Vh = Math.ceil(s * 1.4), Vw = widths[r][i];
      eng.renderer.setSize(Vw, Vh, false); eng.camera.aspect = Vw / Vh; eng.camera.updateProjectionMatrix();
      frame(item, Math.PI / 2 - 0.5, TEAMS[t], s, Vh);
      ctx.drawImage(gl, 0, 0, Vw, Vh, x, head + r * rowH + (rowH - Vh) / 2, Vw, Vh);
      x += Vw + gap;
    });
  });
  eng.renderer.setSize(CW, CH, false); eng.camera.aspect = 1; eng.camera.updateProjectionMatrix();
} else if (cfg.mode === 'turn') {
  // one model, 8 headings, big cells
  const item = built[0], n = 8;
  startSheet(CW * 4, CH * 2);
  for (let i = 0; i < n; i++) { frame(item, (i / n) * Math.PI * 2, TEAMS[i % 2 ? 1 : 0]); ctx.drawImage(gl, 0, 0, CW, CH, (i % 4) * CW, Math.floor(i / 4) * CH, CW, CH); }
}
window.__SHEET_RESULT = { dataUrl: sheet ? sheet.toDataURL('image/png') : null, models: built.map((b) => b.entry.id), log };
