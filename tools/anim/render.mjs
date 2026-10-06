#!/usr/bin/env node
// Render filmstrips / contact sheets of baked hum1 clips with OUR rig's forward kinematics (blocky boxes), in headless Chromium (2D canvas).
//   node tools/anim/render.mjs <humanoid_clips.json> <outDir> [--clips a,b,c] [--sheets]
// Props drawn only for orientation checks: sword (right hand, blade 40deg forward of straight down when the arm hangs), shield plate (left forearm, outward).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { Q, V, eulerToQuat } from './math.mjs';
import { fk, partPoint, RIG, PART_IDS, sampleClip } from './fk.mjs';

const args = process.argv.slice(2);
const pos = args.filter(a => !a.startsWith('--'));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const bank = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
const outDir = pos[1];
fs.mkdirSync(outDir, { recursive: true });
const only = opt('clips') ? opt('clips').split(',') : null;
const sticks = opt('sticks') ? JSON.parse(fs.readFileSync(opt('sticks'), 'utf8')) : null;

const FACES = [ // corner indices (zi*4+yi*2+xi), local normal
  { i: [0, 2, 6, 4], n: [-1, 0, 0] }, { i: [1, 5, 7, 3], n: [1, 0, 0] },
  { i: [0, 4, 5, 1], n: [0, -1, 0] }, { i: [2, 3, 7, 6], n: [0, 1, 0] },
  { i: [0, 1, 3, 2], n: [0, 0, -1] }, { i: [4, 6, 7, 5], n: [0, 0, 1] },
];
const LIGHT = V.norm([-0.35, 0.85, 0.45]);

function boxFaces(frame, box, color, out) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const c = [];
  for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) c.push(V.add(frame.t, Q.rot(frame.q, [x, y, z])));
  for (const f of FACES) out.push({ pts: f.i.map(k => c[k]), n: Q.rot(frame.q, f.n), color });
}

function shade(hex, n) {
  const k = 0.42 + 0.58 * Math.max(0, V.dot(n, LIGHT));
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const VIEWS = {
  q34: (() => { const az = 40 * Math.PI / 180, el = 16 * Math.PI / 180; return V.norm([-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]); })(),
  side: V.norm([-1, 0.10, 0]),
  front: V.norm([0, 0.12, 1]),
  back: V.norm([0, 0.12, -1]),
};
function camBasis(c) {
  const fc = V.scale(c, -1);
  const right = V.norm(V.cross(fc, [0, 1, 0]));
  const up = V.cross(right, fc);
  return { right, up, c };
}

/** world geometry of the figure at a pose: list of faces */
function figureFaces(pose, props = true) {
  const W = fk(pose);
  const faces = [];
  for (const id of PART_IDS) {
    const col = id === 'body' ? '#b8864b' : id === 'head' ? '#e8c39e' : id.startsWith('leg') ? '#5b6f9e' : '#e8c39e';
    boxFaces(W[id], RIG[id].box, col, faces);
  }
  // nose (shows facing)
  boxFaces(W.head, [-0.8, 2, 4, 0.8, 3.6, 5.4], '#b5603c', faces);
  // body 'tunic' hem marker & back marker
  boxFaces(W.body, [-5.1, 0, -2.6, 5.1, 2.2, 2.6], '#8c5a2b', faces);
  if (props) {
    // sword in the right hand (display only): blade continues roughly along the forearm, tilted 40deg forward of straight-down.
    // frame = armLR * T(0,-4,0.5) * Rx(140deg)  (weapon-local +Y -> forearm-local (0,-0.77,0.64))
    const fr = { t: partPoint(W, 'armLR', [0, -4, 0.5]), q: Q.mul(W.armLR.q, eulerToQuat(140 * Math.PI / 180, 0, 0)) };
    boxFaces(fr, [-0.7, -3, -0.7, 0.7, 0.5, 0.7], '#6b4a2a', faces);
    boxFaces(fr, [-3, 0.5, -0.9, 3, 1.6, 0.9], '#d4b13a', faces);
    boxFaces(fr, [-1.1, 1.6, -0.45, 1.1, 22, 0.45], '#dfe6ee', faces);
    // shield on the left forearm, plate faces outward (+X)
    const sf = { t: partPoint(W, 'armLL', [0, 0, 0]), q: W.armLL.q };
    boxFaces(sf, [2.2, -9, -5.5, 3.9, 3, 5.5], '#b03a3a', faces);
  }
  return faces;
}

function projectFaces(faces, view, scale, ox, oy) {
  const B = camBasis(VIEWS[view]);
  const out = [];
  for (const f of faces) {
    if (V.dot(f.n, B.c) <= 0) continue; // backface
    const ctr = f.pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(v => v / f.pts.length);
    out.push({ d: V.dot(ctr, B.c), pts: f.pts.map(p => [ox + V.dot(p, B.right) * scale, oy - V.dot(p, B.up) * scale]), fill: shade(f.color, f.n) });
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}

function groundPolys(view, scale, ox, oy, extent = 22) {
  const B = camBasis(VIEWS[view]);
  const P = (x, z) => [ox + V.dot([x, 0, z], B.right) * scale, oy - V.dot([x, 0, z], B.up) * scale];
  const polys = [{ pts: [P(-extent, -extent), P(extent, -extent), P(extent, extent), P(-extent, extent)], fill: '#3a4a3c' }];
  const lines = [];
  for (let k = -20; k <= 20; k += 10) { lines.push([P(k, -extent), P(k, extent)]); lines.push([P(-extent, k), P(extent, k)]); }
  return { polys, lines };
}

function stickLines(st, view, scale, ox, oy) {
  const B = camBasis(VIEWS[view]);
  const P = p => [ox + V.dot(p, B.right) * scale, oy - V.dot(p, B.up) * scale];
  const cols = { spine: '#ff5a5a', shoulders: '#ffb454', pelvis: '#ffb454', armL: '#4aa8ff', armR: '#52e08a', legL: '#4aa8ff', legR: '#52e08a' };
  const lines = [];
  for (const [k, pts] of Object.entries(st)) lines.push({ pts: pts.map(P), color: cols[k] || '#fff', depth: V.dot(pts[0], B.c) });
  lines.sort((a, b) => a.depth - b.depth);
  return lines;
}

function fitFor(clip, view, cw, scale) {
  const e = extents(clip, view), half = (cw / 2 - 8) / scale;
  let sc = scale, cx = 0;
  if (e.lo < -half || e.hi > half) { sc = Math.min(scale, (cw - 16) / (e.hi - e.lo)); cx = (e.lo + e.hi) / 2; }
  return { scale: sc, cx };
}

function cellFor(clip, f, view, cw, ch, scale, fit) {
  const pose = sampleClip(clip, f);
  if (fit) { scale = fit.scale; }
  const ox = cw / 2 - (fit ? fit.cx * scale : 0), oy = ch - 26;
  const g = groundPolys(view, scale, ox, oy);
  const polys = [...g.polys.map(p => ({ ...p, stroke: null })), ...projectFaces(figureFaces(pose), view, scale, ox, oy)];
  return { polys, lines: g.lines };
}

function stickCell(stk, f, view, cw, ch, scale, fit) {
  if (fit) scale = fit.scale;
  const ox = cw / 2 - (fit ? fit.cx * scale : 0), oy = ch - 26;
  const g = groundPolys(view, scale, ox, oy);
  const i = Math.max(0, Math.min(stk.length - 1, f));
  return { polys: g.polys.map(p => ({ ...p, stroke: null })), lines: g.lines, sticks: stickLines(stk[i], view, scale, ox, oy) };
}

/** horizontal screen extents (voxels) of the figure over the whole clip for a view */
function extents(clip, view) {
  const B = camBasis(VIEWS[view]);
  let lo = 1e9, hi = -1e9, top = -1e9;
  for (let f = 0; f < clip.frames; f++) {
    for (const face of figureFaces(sampleClip(clip, f), false)) for (const p of face.pts) {
      const x = V.dot(p, B.right); lo = Math.min(lo, x); hi = Math.max(hi, x); top = Math.max(top, V.dot(p, B.up));
    }
  }
  return { lo, hi, top };
}

function pickFrames(clip, K) {
  const N = clip.frames;
  if (N <= 1) return [0];
  const idx = [];
  const denom = clip.loop ? K : K - 1;
  for (let i = 0; i < K; i++) idx.push(Math.min(N - 1, Math.round(i * (N - 1 + (clip.loop ? 1 : 0)) / denom)));
  // make sure hit / recover frames are shown (each takes a different slot)
  const used = new Set();
  for (const key of ['hitFrame', 'recoverFrame']) {
    const h = clip.meta?.[key]; if (h == null) continue;
    let best = -1; idx.forEach((v, i) => { if (!used.has(i) && (best < 0 || Math.abs(v - h) < Math.abs(idx[best] - h))) best = i; });
    if (best >= 0) { idx[best] = h; used.add(best); }
  }
  return [...new Set(idx)].sort((a, b) => a - b);
}

const sheets = [];
function filmstrip(name, clip) {
  const K = Math.min(clip.frames, 8), frames = pickFrames(clip, K);
  const cw = 200, ch = 250, scale = 6.6, head = 26;
  const rowsN = sticks && sticks[name] ? 3 : 2;
  const W = cw * frames.length, H = head + ch * rowsN;
  const cells = [];
  const fits = { q34: fitFor(clip, 'q34', cw, scale), side: fitFor(clip, 'side', cw, scale) };
  frames.forEach((f, ci) => {
    for (const [ri, view] of ['q34', 'side'].entries()) {
      const c = cellFor(clip, f, view, cw, ch, scale, fits[view]);
      cells.push({ x: ci * cw, y: head + ri * ch, w: cw, h: ch, ...c, label: ri === 0 ? `f${f}` : '', mark: (f === clip.meta?.hitFrame) ? '#ff3b3b' : (f === clip.meta?.recoverFrame ? '#ffd24a' : null) });
    }
    if (rowsN === 3) {
      const c = stickCell(sticks[name], f, 'side', cw, ch, scale, fits.side);
      cells.push({ x: ci * cw, y: head + 2 * ch, w: cw, h: ch, ...c, label: ci === 0 ? 'SOURCE' : '', mark: null });
    }
  });
  const meta = clip.meta || {};
  const title = `${name}   frames=${clip.frames} (${(clip.frames / 30).toFixed(2)}s) loop=${clip.loop}` + (meta.hitFrame != null ? `   hit=${meta.hitFrame} (red)  recover=${meta.recoverFrame} (yellow)` : '') + (meta.speedRef ? `   speedRef=${meta.speedRef}u/s` : '');
  return { name: 'filmstrip_' + name, W, H, title, cells };
}

function contact(title, entries, cols = 8) {
  const cw = 150, ch = 200, scale = 5.0, head = 24, lab = 0;
  const rows = entries.length;
  const W = cw * cols, H = head + rows * (ch + 14);
  const cells = [];
  const labels = [];
  entries.forEach(([name, clip], ri) => {
    const frames = pickFrames(clip, Math.min(cols, clip.frames));
    labels.push({ x: 6, y: head + ri * (ch + 14) + 11, text: `${name}  (${clip.frames}f${clip.loop ? ', loop' : ''}${clip.meta?.hitFrame != null ? ', hit ' + clip.meta.hitFrame : ''})` });
    const fit = fitFor(clip, 'q34', cw, scale);
    frames.forEach((f, ci) => {
      const c = cellFor(clip, f, 'q34', cw, ch, scale, fit);
      cells.push({ x: ci * cw, y: head + ri * (ch + 14) + 14, w: cw, h: ch, ...c, label: `f${f}`, mark: (f === clip.meta?.hitFrame) ? '#ff3b3b' : null });
    });
  });
  return { name: 'sheet_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_'), W, H, title, cells, labels };
}

const CATEGORIES = opt('categories') ? JSON.parse(fs.readFileSync(opt('categories'), 'utf8')) : {
  'Locomotion and idles': ['idle', 'idle_combat', 'walk', 'walk_formal', 'run', 'sprint', 'crouch', 'zombie_idle', 'zombie_walk'],
  'Melee attacks': ['strike_slash_1', 'strike_slash_2', 'strike_overhead', 'strike_thrust', 'strike_combo', 'strike_punch_1', 'strike_punch_2', 'strike_punch_3', 'strike_bash', 'shield_dash', 'throw'],
  'Defence and reactions': ['block_enter', 'block_hold', 'shield_break', 'hit_front', 'hit_head', 'knockdown', 'death_back', 'getup', 'roll'],
  'Magic, social and seated': ['cast', 'cast_idle', 'point_order', 'talk', 'smug', 'shake_no', 'dance', 'punch_ready', 'sit_enter', 'sit'],
};


const jobs = [];
for (const [name, clip] of Object.entries(bank.clips)) { if (only && !only.includes(name)) continue; jobs.push(filmstrip(name, clip)); }
if (args.includes('--sheets')) {
  for (const [title, names] of Object.entries(CATEGORIES)) {
    const entries = names.filter(n => bank.clips[n]).map(n => [n, bank.clips[n]]);
    if (entries.length) jobs.push(contact(title, entries));
  }
}

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent('<!doctype html><html><body style="margin:0"><canvas id="c"></canvas></body></html>');
const drawFn = ({ W, H, title, cells, labels }) => {
  const cv = document.getElementById('c'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#1b1f2a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8ecf4'; g.font = 'bold 14px monospace'; g.textBaseline = 'top'; g.fillText(title, 6, 5);
  for (const l of labels || []) { g.fillStyle = '#9fd2ff'; g.font = '12px monospace'; g.fillText(l.text, l.x, l.y - 9); }
  for (const c of cells) {
    g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip(); g.translate(c.x, c.y);
    g.fillStyle = '#9fb7d6'; g.fillRect(0, 0, c.w, c.h);
    for (const p of c.polys) {
      g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
      g.fillStyle = p.fill; g.fill();
      if (p.stroke !== null) { g.strokeStyle = 'rgba(15,15,25,0.55)'; g.lineWidth = 0.7; g.stroke(); }
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
    for (const l of c.lines) { g.beginPath(); g.moveTo(l[0][0], l[0][1]); g.lineTo(l[1][0], l[1][1]); g.stroke(); }
    for (const s of c.sticks || []) {
      g.strokeStyle = s.color; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); s.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
      g.fillStyle = '#10131a'; for (const q of s.pts) { g.beginPath(); g.arc(q[0], q[1], 1.6, 0, 7); g.fill(); }
    }
    g.restore();
    g.strokeStyle = c.mark || 'rgba(0,0,0,0.5)'; g.lineWidth = c.mark ? 3 : 1; g.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
    if (c.label) { g.fillStyle = '#111'; g.font = 'bold 11px monospace'; g.fillText(c.label, c.x + 4, c.y + 3); }
  }
  return cv.toDataURL('image/png');
};
for (const j of jobs) {
  const url = await page.evaluate(drawFn, j);
  fs.writeFileSync(path.join(outDir, j.name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', j.name + '.png', j.W + 'x' + j.H);
}
await browser.close();
