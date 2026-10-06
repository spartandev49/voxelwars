// Browser entry for the animation review renderer (bundled by tools/shot_anim.mjs). Renders filmstrips / contact sheets of clips on
// reference models through the real VoxSkin with an orthographic camera. Not part of the game bundle.
import { VoxSkin, newPose } from '../src/render/voxskin.js';
import { Animator } from '../src/anim/animator.js';
import { ClipLib } from '../src/anim/clips.js';
import { registerAllClips } from '../src/anim/boot.js';
import { createFixture } from '../tests/fixtures/index.js';
import humanoidJson from '../assets/anim/humanoid_clips.json';

const THREE = window.THREE;
const lin = (hex) => { const c = new THREE.Color(hex); c.convertSRGBToLinear(); return [c.r, c.g, c.b]; };
const TEAM = { a: lin(0x2f6bff), b: lin(0xe23b3b) };

registerAllClips(ClipLib, { humanoid: humanoidJson, alternates: true, onReport: (m) => console.log('boot: ' + m) });
Animator.warn = (m) => console.warn('ANIM: ' + m);

let renderer = null, scene = null, cam = null;
const skins = new Map();     // fixture key -> {model, skin, pose}
let ground = null;

function init(w, h) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0xdfe5ec, 1);
    document.body.style.margin = '0';
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa7b8, 1.15));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.9); sun.position.set(-40, 70, -25); scene.add(sun);
    ground = new THREE.Group(); scene.add(ground);
  }
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
}

async function skinFor(spec) {
  const key = JSON.stringify(spec);
  let e = skins.get(key);
  if (e) return e;
  const model = await createFixture(spec.fix, spec.opts || {});
  const skin = new VoxSkin({ scene }, model, { capacity: 128, shadow: false });
  e = { model, skin, pose: newPose(model.parts.length), key };
  skins.set(key, e);
  return e;
}

const HEAD = (title) => `<div style="position:absolute;left:8px;top:4px;font:bold 13px monospace;color:#223">${title}</div>`;
function overlay(html) {
  let o = document.getElementById('ov');
  if (o) o.remove();
  o = document.createElement('div'); o.id = 'ov'; o.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;width:100%;height:100%';
  o.innerHTML = html; document.body.appendChild(o);
}

/** Render one job (see tools/filmstrip.mjs for the format). */
async function render(job) {
  const { ppu, cellW, rowH, cols, labelW, rows } = job;
  const topPad = job.title ? 22 : 4, botPad = 10;
  const W = Math.round(labelW + cols * cellW * ppu), H = Math.round(rows.length * rowH * ppu + topPad + botPad);
  init(W, H);
  // camera: world z -> screen x, world y -> screen y (camera looks along +X from -X)
  const zMin = -cellW * 0.5 - labelW / ppu, zMax = cols * cellW - cellW * 0.5;
  const yTop = rowH * rows.length + topPad / ppu;
  // camera looks along +X from -X: camera-space x = world +Z (screen right), y = world y
  cam = new THREE.OrthographicCamera(zMin, zMax, yTop, yTop - H / ppu, 0.1, 200);
  cam.position.set(-60, 0, 0); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
  // clear ground slabs
  while (ground.children.length) { const c = ground.children.pop(); c.geometry.dispose(); c.material.dispose(); }
  const used = new Map();
  const labels = [];
  const rowY = (ri) => rowH * (rows.length - 1 - ri);     // world y of the row's ground
  const out4 = [0, 0, 0, 0];
  const rootOut = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const e = await skinFor(row.model);
    if (!used.has(e.key)) { e.skin.begin(); used.set(e.key, e); }
    const rig = e.model.meta.rig || 'hum1';
    const clipId = row.clip;
    const cm = ClipLib.meta(clipId, rig);
    const dur = row.t1 !== undefined ? row.t1 : cm.dur, t0 = row.t0 || 0;
    const loop = ClipLib.get(clipId, rig) ? ClipLib.get(clipId, rig).loop : cm.loop;
    const n = row.frames || cols;
    // ground slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, cols * cellW), new THREE.MeshBasicMaterial({ color: 0x8895a8 }));
    slab.position.set(0.5, rowY(ri) - 0.03, (cols * cellW) / 2 - cellW * 0.5); ground.add(slab);
    for (let c = 0; c < n; c++) {
      let t;
      if (row.times) t = row.times[c];
      else if (loop) t = t0 + (c / n) * (dur - t0);
      else t = t0 + (c / (n - 1)) * (dur - t0);
      const st = Object.assign({ clip: clipId, t, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 }, row.state || {});
      if (row.state && row.state.tOffset) st.t = t + row.state.tOffset;
      const heading = row.view === 'side' ? 0 : -0.6;
      const extra = { root: rootOut, heading, scale: 1, id: row.id || 0, t, speed: row.speed || 0, gait: NaN };
      if (row.speed && /^(walk|run|jog|trot|gallop|sprint)$/.test(clipId)) {
        // locomotion is driven by distance: walk a fraction of one stride so the cell shows phase c/n
        const gi = Animator.gaitInfo(e.model, row.speed);
        const dist = gi ? (c / n) * gi.stride : 0;
        extra.gait = 0; Animator.pose(e.model, st, extra, e.pose);
        extra.gait = dist; st.t = 0;
      }
      Animator.pose(e.model, st, extra, e.pose);
      const px = 0, pz = c * cellW + (row.zShift || 0), py = rowY(ri);
      e.skin.add(px + rootOut.x, py + rootOut.y, pz + rootOut.z, heading + rootOut.yaw, 1, 1, 1, e.pose, TEAM[row.team || 'a'], row.flash || 0, row.stone || 0, 0, rootOut.pitch, rootOut.roll);
      const hitF = ClipLib.meta(clipId, rig).hit, recT = ClipLib.meta(clipId, rig).recover;
      const frameDt = dur / Math.max(1, (loop ? n : n - 1));
      let mark = '';
      if (row.markHit !== false && hitF !== undefined && Math.abs(t - hitF) <= frameDt * 0.5) mark = 'hit';
      else if (recT !== undefined && Math.abs(t - recT) <= frameDt * 0.5) mark = 'rec';
      labels.push({ ri, c, t, mark });
    }
  }
  for (const e of used.values()) e.skin.end();
  for (const e of skins.values()) if (!used.has(e.key)) { e.skin.begin(); e.skin.end(); }
  renderer.render(scene, cam);
  // overlays
  let html = job.title ? HEAD(job.title) : '';
  const sx = (z) => (z - zMin) * ppu, sy = (y) => (yTop - y) * ppu;
  rows.forEach((row, ri) => {
    html += `<div style="position:absolute;left:6px;top:${sy(rowY(ri) + rowH - 0.1)}px;width:${labelW - 10}px;font:bold 12px monospace;color:#223;line-height:14px">${row.label || row.clip}</div>`;
  });
  for (const l of labels) {
    const row = rows[l.ri];
    const x0 = sx(l.c * cellW - cellW / 2), y0 = sy(rowY(l.ri) + rowH - 0.05);
    const border = l.mark === 'hit' ? '2px solid #e02020' : l.mark === 'rec' ? '2px solid #d8a800' : '1px solid rgba(60,70,90,.18)';
    html += `<div style="position:absolute;left:${x0}px;top:${y0}px;width:${cellW * ppu - 2}px;height:${rowH * ppu - 2}px;box-sizing:border-box;border:${border}"></div>`;
    html += `<div style="position:absolute;left:${x0 + 3}px;top:${sy(rowY(l.ri) - 0.02) - 15}px;font:11px monospace;color:#223">${l.t.toFixed(2)}${l.mark ? ' ' + l.mark : ''}</div>`;
  }
  overlay(html);
  return { width: W, height: H, warnings: Array.from(Animator.warnings) };
}

window.__film = { render, ready: true, clipIds: () => ClipLib.qualifiedIds() };
