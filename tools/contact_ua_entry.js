// UNITS-A copy of tools/contact_entry.js: also loads units/units_a.js (so its self-registering parts exist in the bundle) and applies the unit scale
// (monsters: item.unitScale multiplies the instance scale and the camera distance/target height). Browser side of tools/contact_ua.mjs: renders contact-sheet cells with the real Engine + VoxSkin and blits them into one sheet canvas.
// Driven from Node via page.evaluate(window.__contact.run(job)). Not shipped in the game build.
import { Engine, lin } from '../src/render/engine.js';
import { VoxSkin } from '../src/render/voxskin.js';
import { compileSoldier } from '../src/content/era_ancient/blueprints.js';
import { teamColorsLinear } from '../src/render/style.js';
import { readyPose } from './contact_pose.js';
import '../src/content/era_ancient/units/units_a.js';

const THREE = () => window.THREE;
let eng = null, stage = null, ground = null;

function ensureEngine() {
  if (eng) return;
  stage = document.createElement('div');
  stage.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:320px;overflow:hidden';
  document.body.appendChild(stage);
  eng = new Engine(stage);
  eng.setEnvironment({ time: 11, weather: 'clear', fog: 0.05 }, null);
  const T = THREE();
  ground = new T.Mesh(new T.CircleGeometry(80, 48), new T.MeshLambertMaterial({ color: lin(0x6fae3f) }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  eng.scene.add(ground);
  eng.shadowRadius = 6; eng.focus.set(0, 1, 0);
}
function setSize(w, h, quality) {
  if (eng.qualityKey !== quality) eng.setQuality(quality);
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  eng.resize();
}

function buildItem(it) {
  const c = compileSoldier(it.bp, it.opts || {});
  const skin = new VoxSkin(eng, c.model, { capacity: 4, shadow: true });
  let pose;
  if (it.pose === 'rest') { pose = new Float32Array(c.model.parts.length * 9); for (let i = 0; i < c.model.parts.length; i++) pose[i * 9 + 6] = pose[i * 9 + 7] = pose[i * 9 + 8] = 1; }
  else pose = readyPose(c.model, { weaponStyle: c.weaponStyle, twoHanded: c.twoHanded, ready: c.weaponReady });
  return { c, skin, pose, us: it.unitScale || 1, cs: it.camScale || 1 };
}

export async function run(job) {
  ensureEngine();
  const teams = teamColorsLinear(job.palette || 'classic');
  const items = job.items.map(buildItem);
  for (const it of items) { it.skin.begin(); it.skin.end(); }
  const sheet = document.createElement('canvas');
  sheet.width = job.width; sheet.height = job.height;
  const g = sheet.getContext('2d');
  g.fillStyle = job.bg || '#14181f'; g.fillRect(0, 0, sheet.width, sheet.height);
  const order = job.cells.slice().sort((a, b) => (a.mini ? 1 : 0) - (b.mini ? 1 : 0));
  let lastKey = '';
  const T = THREE();
  for (const cell of order) {
    const key = (cell.mini ? 'p' : 'o') + (cell.cssW || 0) + 'x' + (cell.cssH || 0);
    if (key !== lastKey) { setSize(cell.cssW, cell.cssH, cell.mini ? 'papyrus' : 'olympian'); lastKey = key; }
    const it = items[cell.item];
    for (const o of items) { o.skin.begin(); o.skin.end(); }
    const t = teams[cell.team || 0];
    it.skin.begin();
    it.skin.add(0, 0, 0, cell.heading || 0, it.c.scale[0] * it.us, it.c.scale[1] * it.us, it.c.scale[2] * it.us, it.pose, t, 0, 0, 0, 0, 0);
    it.skin.end();
    const cam0 = cell.cam, kk = it.us * it.cs, cam = kk === 1 ? cam0 : Object.assign({}, cam0, { dist: cam0.dist * kk, ty: cam0.ty * kk });
    const az = cam.az * Math.PI / 180, el = cam.el * Math.PI / 180;
    const tx = cam.tx || 0, ty = cam.ty, tz = cam.tz || 0;
    eng.camera.fov = cam.fov || 40; eng.camera.updateProjectionMatrix();
    eng.camera.position.set(tx + cam.dist * Math.sin(az) * Math.cos(el), ty + cam.dist * Math.sin(el), tz + cam.dist * Math.cos(az) * Math.cos(el));
    eng.camera.lookAt(tx, ty, tz);
    eng.render(0.016); eng.render(0.016);
    g.imageSmoothingEnabled = !cell.mini;
    g.drawImage(eng.renderer.domElement, cell.x, cell.y, cell.w, cell.h);
    if (cell.border) { g.strokeStyle = cell.border; g.lineWidth = 1; g.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1); }
  }
  for (const tx of job.texts || []) { g.font = (tx.weight || '400') + ' ' + (tx.size || 14) + 'px sans-serif'; g.fillStyle = tx.color || '#e8e2d0'; g.textBaseline = 'top'; g.fillText(tx.text, tx.x, tx.y); }
  const info = items.map((it) => ({ voxels: it.c.voxels, parts: it.c.parts, height: it.c.height, reach: it.c.reach, radius: it.c.radius, weaponLen: it.c.weaponLen, warnings: it.c.warnings }));
  for (const it of items) it.skin.dispose();
  return { png: sheet.toDataURL('image/png'), info, tris: eng.renderer.info.render.triangles };
}
window.__contact = { run };
