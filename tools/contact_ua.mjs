// UNITS-A copy of tools/contact.mjs (entry = contact_ua_entry.js: loads units_a parts, applies unit scale; --tall ids widens the framing). Contact-sheet renderer for humanoid blueprints and parts (headless Chromium + the real Engine/VoxSkin).
//
//   node tools/contact.mjs --name t0                              all units found in src/content/era_ancient/units/*.js
//   node tools/contact.mjs --name hoplites --units hoplite,spartan [--layout full|roster]
//   node tools/contact.mjs --bp path/to/blueprint.json [--name custom]    (a blueprint object or an array of them)
//   node tools/contact.mjs --catalog helms [--base hoplite] [--name helms]   every part of a category on a base soldier
//   options: --scale 1.5 (sheet pixel scale, 2 = hi-res), --pose ready|rest, --palette classic|cvd|contrast, --per N (units per sheet file)
//
// Output: docs/sheets/<name>.png (or <name>_1.png ... when split). Each unit is shown in a static READY stance (arms raised, weapon
// forward) from front, 3/4 (weapon side), 3/4 (shield side), side and back, plus a close head, for team A and team B, and at the
// bottom as eight 40 px-tall silhouettes on the arena grass colour (blitted 2x, nearest neighbour).
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tintReport } from './tintcheck.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const name = opt('name', 'sheet'), layout = opt('layout', 'full'), S = +opt('scale', 1.5), pose = opt('pose', 'ready'), palette = opt('palette', 'classic');
const per = +opt('per', layout === 'roster' ? 12 : 2);

// ------------------------------------------------------------------------------------------------ items
const unitsDir = path.join(root, 'src/content/era_ancient/units');
async function loadUnits() {
  const out = {};
  if (!fs.existsSync(unitsDir)) return out;
  for (const f of fs.readdirSync(unitsDir).filter((x) => x.endsWith('.js') && !x.startsWith('_')).sort()) {
    const m = await import(pathToFileURL(path.join(unitsDir, f)).href);
    for (const [id, spec] of Object.entries(m.MODELS || {})) out[id] = spec;
  }
  return out;
}
const { STAT_TABLE } = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/stats.js')).href);
const BP = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/blueprints.js')).href);
function optsFor(id) {
  const st = STAT_TABLE[id]; if (!st) return {};
  return { range: st.melee ? st.melee.range : undefined, radius: st.radius, scale: st.scale };
}
let items = [];
const bpArg = opt('bp', null), catArg = opt('catalog', null);
if (catArg) {
  const base = opt('base', 'hoplite');
  const units = await loadUnits();
  const baseSpec = units[base] || {};
  const baseBp = JSON.parse(JSON.stringify(baseSpec.blueprint || baseSpec.bp || baseSpec.rider || BP.defaultBlueprint()));
  const cat = String(catArg);
  if (!BP.PART_REGISTRY[cat]) { console.error('unknown category', cat, 'try', Object.keys(BP.PART_REGISTRY).join(', ')); process.exit(1); }
  const slot = { helms: ['head', 'helm'], hair: ['head', 'hair'], faces: ['head', 'face'], armors: ['torso', 'armor'], tunics: ['torso', 'tunic'], legs: ['legs', 'armor'], skirts: ['legs', 'skirt'], shoulders: [null, 'shoulders'], capes: [null, 'cape'], backs: [null, 'back'], mains: [null, 'main'], offs: [null, 'off'] }[cat];
  const only = opt('ids', null) ? String(opt('ids')).split(',') : null;
  for (const id of Object.keys(BP.PART_REGISTRY[cat])) {
    if (only && only.indexOf(id) < 0) continue;
    const b = JSON.parse(JSON.stringify(baseBp)); b.id = 'cat_' + id;
    if (!opt('keepface', false) && cat !== 'faces') b.head.face = 'none';
    if (slot[0]) b[slot[0]][slot[1]] = id; else b[slot[1]] = id;
    if (cat === 'mains' && BP.PART_REGISTRY.mains[id].meta.twoHanded) b.off = 'none';
    if (cat === 'offs') b.main = 'none';
    if (['armors', 'tunics', 'shoulders', 'legs', 'skirts', 'capes', 'backs'].includes(cat)) { b.off = 'none'; b.main = 'none'; if (b.head.helm !== 'none') { b.head.helm = 'none'; } }
    if (cat === 'hair' || cat === 'faces') { b.head.helm = 'none'; }
    if (cat === 'hair') b.head.face = 'none';
    items.push({ id, name: id, bp: b, opts: {} });
  }
} else if (bpArg) {
  const data = JSON.parse(fs.readFileSync(String(bpArg), 'utf8'));
  for (const b of Array.isArray(data) ? data : [data]) items.push({ id: b.id, name: b.name || b.id, bp: b, opts: {} });
} else {
  const units = await loadUnits();
  const want = opt('units', null) ? String(opt('units')).split(',') : Object.keys(units);
  for (const id of want) {
    const spec = units[id]; if (!spec) { console.error('no model for', id, '(have', Object.keys(units).join(', ') + ')'); process.exit(1); }
    const bp = spec.blueprint || spec.bp || spec.rider || spec;
    items.push({ id, name: bp.name || id, bp, opts: optsFor(id), unitScale: (STAT_TABLE[id] && STAT_TABLE[id].scale) || 1, camScale: String(opt('tall', '')).split(',').includes(id) ? 1.2 : 1 });
  }
}
if (opt('chariot', false)) {      // render the chariot_archer with the UNITS-A crew composed in (BEASTS builder), instead of the unit list
  const u = await loadUnits();
  items = [{ id: 'chariot_archer (UNITS-A crew)', name: 'chariot', bp: u.crew_chariot_driver.blueprint, opts: {}, unitScale: 1, camScale: 1.7, chariot: { driver: u.crew_chariot_driver.blueprint, archer: u.crew_chariot_archer.blueprint } }];
}
if (!items.length) { console.error('nothing to render'); process.exit(1); }

// ------------------------------------------------------------------------------------------------ layouts
const CW = 220, CH = 290;                        // full cell, CSS px (sheet px = *S)
const sx = (v) => Math.round(v * S);
const VIEWS = { front: 0, q34: -38, q34l: 38, side: -90, back: 180 };
const camFull = (az) => ({ az, el: 12, dist: 6.2, ty: 1.5 });
const camHead = (az) => ({ az, el: 8, dist: 2.9, ty: (catArg === 'hair' || catArg === 'faces') ? 2.3 : 2.55 });
const camTorso = (az) => ({ az, el: 10, dist: 4.2, ty: 1.9 });
const camMini = (az) => ({ az, el: 24, dist: 6.6, ty: 1.45 });
const cellFull = (item, team, az, x, y, cam) => ({ item, team, cam: cam || camFull(az), x, y, w: sx(CW), h: sx(CH), cssW: CW, cssH: CH, border: '#2a313c' });
const cellMini = (item, team, az, x, y) => ({ item, team, cam: camMini(az), x, y, w: 128, h: 128, cssW: 64, cssH: 64, mini: true });

function sheetFor(slice, idx0) {
  const cells = [], texts = [], gap = 4;
  let y = 0, maxW = 0;
  const catalog = !!catArg;
  if (catalog) {
    const g = ['helms', 'hair', 'faces'].includes(catArg) ? 'head' : ['armors', 'tunics', 'shoulders'].includes(catArg) ? 'torso' : ['legs', 'skirts'].includes(catArg) ? 'legs' : ['capes', 'backs'].includes(catArg) ? 'back' : catArg === 'offs' ? 'off' : 'full';
    const views = { head: [camHead(+opt('az', -35))], torso: [camTorso(0), camTorso(180)], legs: [{ az: -35, el: 8, dist: 4.4, ty: 0.95 }, { az: 180, el: 8, dist: 4.4, ty: 0.95 }], back: [camFull(150), camFull(60)], off: [camFull(38)], full: [camFull(-35)] }[g];
    const cw = g === 'head' ? sx(170) : (views.length > 1 ? sx(150) : sx(CW)), ch = g === 'head' ? sx(220) : (views.length > 1 ? sx(210) : sx(CH));
    const perRow = Math.max(2, Math.floor(1700 / (cw * views.length + gap)));
    let cellIdx = 0;
    slice.forEach((it, k) => {
      const col = k % perRow, row = Math.floor(k / perRow);
      const x0 = col * (cw * views.length + gap * 2), yy = row * (ch + 18 + gap);
      views.forEach((cam, vi) => {
        cells.push({ item: k, team: 0, cam, x: x0 + vi * cw, y: yy + 18, w: cw, h: ch, cssW: cw / S, cssH: ch / S, border: '#2a313c' });
        maxW = Math.max(maxW, x0 + (vi + 1) * cw);
      });
      texts.push({ x: x0 + 4, y: yy + 2, text: it.id, size: 13, weight: '600' });
      y = Math.max(y, yy + 18 + ch);
    });
    return { cells, texts, width: maxW, height: y };
  }
  slice.forEach((it, k) => {
    const rep = tintReport(it.bp, it.opts);
    const hdr = `${it.id}   voxels ${rep.voxels}  parts ${rep.parts}  height ${rep.height.toFixed(2)}u  reach ${rep.reach.toFixed(2)}u  weapon ${rep.weaponLen}   tint front ${(rep.tint.front * 100).toFixed(0)}%  back ${(rep.tint.back * 100).toFixed(0)}%  side ${(rep.tint.side * 100).toFixed(0)}%  ${rep.pass ? 'PASS' : 'FAIL'}`;
    texts.push({ x: 6, y: y + 4, text: hdr, size: 15, weight: '600', color: rep.pass ? '#e8e2d0' : '#ff8a7a' });
    y += 26;
    if (layout === 'roster') {
      let x = 0;
      for (const [team, az] of [[0, VIEWS.q34], [1, VIEWS.q34], [0, VIEWS.back]]) { cells.push(cellFull(k, team, az, x, y)); x += sx(CW) + gap; }
      const mx0 = x;
      [0, 1].forEach((team) => [VIEWS.front, VIEWS.q34, VIEWS.side, VIEWS.back].forEach((az, j) => cells.push(cellMini(k, team, az, mx0 + j * 132, y + 8 + team * 136))));
      maxW = Math.max(maxW, mx0 + 4 * 132); y += sx(CH) + gap + 6;
    } else {
      for (const team of [0, 1]) {
        let x = 0;
        for (const az of [VIEWS.front, VIEWS.q34, VIEWS.q34l, VIEWS.side, VIEWS.back]) { cells.push(cellFull(k, team, az, x, y)); x += sx(CW) + gap; }
        cells.push(cellFull(k, team, 0, x, y, camHead(-32))); x += sx(CW) + gap;
        maxW = Math.max(maxW, x); y += sx(CH) + gap;
      }
      [0, 1].forEach((team) => [VIEWS.front, VIEWS.q34, VIEWS.side, VIEWS.back].forEach((az, j) => cells.push(cellMini(k, team, az, (team * 4 + j) * 132, y))));
      y += 128 + gap + 14;
    }
  });
  return { cells, texts, width: maxW, height: y };
}

// ------------------------------------------------------------------------------------------------ run
const bundle = await build({
  stdin: { contents: "import '/tools/contact_ua_entry.js'", resolveDir: root, sourcefile: 'contact_stub.js' },
  absWorkingDir: root, bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error', alias: {}, plugins: [{ name: 'abs', setup(b) { b.onResolve({ filter: /^\/tools\// }, (a) => ({ path: path.join(root, a.path) })); } }],
});
const js = bundle.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#123}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script></head><body><script>${js}</script></body></html>`;
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: S });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() !== 'log' || process.env.CONTACT_VERBOSE) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.route('**/*', (r) => {
  const u = r.request().url();
  if (u.includes('three.min.js')) return r.fulfill({ path: path.join(root, '.cache/cdn/three.min.js'), contentType: 'text/javascript' });
  if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
  return r.abort();
});
await page.goto('http://t/');
await page.waitForFunction(() => !!window.__contact, null, { timeout: 30000 });
fs.mkdirSync(path.join(root, 'docs/sheets'), { recursive: true });
const written = [];
const perFile = catArg ? 20 : per;
for (let i = 0, n = 0; i < items.length; i += perFile, n++) {
  const slice = items.slice(i, i + perFile);
  const lay = sheetFor(slice, i);
  const job = { items: slice.map((it) => ({ bp: it.bp, opts: it.opts, pose, unitScale: it.unitScale || 1, camScale: it.camScale || 1, chariot: it.chariot || null })), cells: lay.cells, texts: lay.texts, width: lay.width, height: lay.height, palette };
  const res = await page.evaluate((j) => window.__contact.run(j), job);
  const file = path.join(root, 'docs/sheets', items.length > perFile ? `${name}_${n + 1}.png` : `${name}.png`);
  fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
  written.push(file);
  console.log(`wrote ${path.relative(root, file)} (${lay.width}x${lay.height}, ${slice.length} items, ${res.tris} tris last cell)`);
  res.info.forEach((inf, k) => { if (inf.warnings && inf.warnings.length) console.log('  warn', slice[k].id, inf.warnings.join(' | ')); });
}
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await browser.close();
