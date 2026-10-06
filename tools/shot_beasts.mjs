// BEASTS contact sheets. Renders every BEASTS model (SHEET_MODELS in beasts/index.js) with VoxSkin in headless Chromium.
// Usage: node tools/shot_beasts.mjs [--out=docs/sheets/beasts.png] [--only=id,id] [--group=mount|beast|siege|big] [--cell=240]
//                                   [--mode=sheet|zoom|turn] [--zoom-out=docs/sheets/beasts_zoom.png] [--all]
//   --all   writes the full set: docs/sheets/beasts.png (3 angles x team A/B), docs/sheets/beasts_zoom.png (160/80/40 px), plus one sheet per group.
// The page is bundled from tests/beasts/sheet_demo.js; three r128 comes from .cache/cdn (same as tools/shot.mjs).
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes('--' + k);

// VoxSkin currently guards at 24 parts; the spec cap is 48 (spec section 2). The sheet patches the guard locally (request filed in docs/requests/beasts.md).
const raise48 = {
  name: 'voxskin-48',
  setup(b) {
    b.onLoad({ filter: /render[\\/]voxskin\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, 'utf8').replace('this.P > 24', 'this.P > 48'), loader: 'js' }));
  },
};

async function bundle() {
  const r = await build({ entryPoints: [path.join(root, 'tests/beasts/sheet_demo.js')], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error', plugins: [raise48] });
  return r.outputFiles[0].text;
}

const cdn = { 'three.min.js': '.cache/cdn/three.min.js' };
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function render(js, cfg, out, W = 1400, H = 900) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#123}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>window.__SHEET=${JSON.stringify(cfg)};</script></head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
  const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  let failed = null;
  p.on('pageerror', (e) => { logs.push('PAGEERROR: ' + e.message); failed = failed || e.message; });
  await p.route('**/*', (r) => {
    const u = r.request().url();
    for (const k of Object.keys(cdn)) if (u.includes(k)) return r.fulfill({ path: path.join(root, cdn[k]), contentType: 'text/javascript' });
    if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
    return r.abort();
  });
  await p.goto('http://t/');
  const t0 = Date.now();
  while (Date.now() - t0 < 400000 && !failed) {
    if (await p.evaluate(() => !!window.__SHEET_RESULT)) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  if (failed) logs.push('aborted on page error');
  const res = await p.evaluate(() => window.__SHEET_RESULT || null);
  await b.close();
  if (res && res.dataUrl) {
    fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
    fs.writeFileSync(path.resolve(root, out), Buffer.from(res.dataUrl.split(',')[1], 'base64'));
  }
  console.log(`${out}: ${res ? res.models.length + ' models' : 'NO RESULT'}`);
  if (res) console.log(res.log.join('\n'));
  if (logs.length) console.log(logs.slice(0, 20).join('\n'));
  return res;
}

const js = await bundle();
const only = arg('only', null);
const cell = +arg('cell', 240);
if (flag('all')) {
  await render(js, { cell: 220, mode: 'sheet' }, 'docs/sheets/beasts.png');
  await render(js, { cell: 220, mode: 'zoom' }, 'docs/sheets/beasts_zoom.png');
  for (const g of ['mount', 'beast', 'siege', 'big']) await render(js, { cell: 300, mode: 'sheet', group: g }, `docs/sheets/beasts_${g}.png`);
} else {
  await render(js, { cell, mode: arg('mode', 'sheet'), only: only ? only.split(',') : null, group: arg('group', null) }, arg('out', 'docs/sheets/beasts.png'));
}
