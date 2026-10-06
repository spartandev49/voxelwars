// Prop model contact sheets: every catalog id (intact | cracked | rubble, or --variants for the 4 colour variants) rendered with
// PropRenderer in headless Chromium into docs/sheets/props_<group>.png. Usage: node tools/props_sheet.mjs [--out docs/sheets] [--mode stage|variant] [--time 12]
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const outDir = opt('out', 'docs/sheets'), mode = opt('mode', 'stage'), time = opt('time', '12'), W = +opt('w', 1280), H = +opt('h', 720);
fs.mkdirSync(outDir, { recursive: true });
const GROUPS = {
  trees: ['tree_oak', 'tree_olive', 'tree_cypress', 'tree_pine', 'tree_dead', 'palm'],
  ground: ['bush', 'rock_small', 'rock_big', 'wheat', 'reeds', 'cactus', 'bones', 'skull_pile', 'log'],
  camp: ['crate', 'barrel', 'tent', 'torch', 'banner_post', 'fire_pit', 'campfire', 'goat_pen'],
  stone: ['column_marble', 'column_broken', 'ruin_wall', 'wall_stone', 'gate_door'],
  big: ['tower', 'arch_gate', 'temple'],
  monuments: ['obelisk', 'throne', 'statue_lion', 'sphinx_statue', 'statue_zeus'],
  places: ['pyramid', 'cave_mouth', 'cloud_island', 'ship', 'crowd'],
};
const bundle = await build({ entryPoints: ['tests/visual/props_demo.js'], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error' });
const js = bundle.outputFiles[0].text;
const post = ['CopyShader', 'LuminosityHighPassShader', 'EffectComposer', 'ShaderPass', 'RenderPass', 'UnrealBloomPass'];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#123}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
${post.map((n) => `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/${n.includes('Shader') && !n.includes('Pass') ? 'shaders' : 'postprocessing'}/${n}.js"></script>`).join('\n')}
</head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
const cdn = { 'three.min.js': '.cache/cdn/three.min.js' };
for (const n of post) cdn['/' + n + '.js'] = '.cache/cdn/' + n + '.js';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const logs = [];
for (const [g, types] of Object.entries(GROUPS)) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('console', (m) => { if (m.type() === 'error') logs.push(g + ': ' + m.text()); });
  p.on('pageerror', (e) => logs.push(g + ' PAGEERROR: ' + e.message));
  await p.route('**/*', (r) => {
    const u = r.request().url();
    for (const k of Object.keys(cdn)) if (u.includes(k)) return r.fulfill({ path: cdn[k], contentType: 'text/javascript' });
    if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
    return r.abort();
  });
  const gap = types.some((t) => ['temple', 'pyramid', 'arch_gate', 'sphinx_statue', 'ship', 'cave_mouth', 'cloud_island'].includes(t)) ? 16 : types.some((t) => ['tower', 'statue_zeus', 'tree_oak', 'tree_pine', 'tree_cypress', 'palm', 'gate_door', 'wall_stone'].includes(t)) ? 8 : 5;
  await p.goto(`http://t/?types=${types.join(',')}&rows=${mode}&gap=${gap}&t=${time}&cam=iso&zoom=${opt('zoom', '1')}`);
  await p.waitForFunction(() => window.__propsDone === true, null, { timeout: 120000 });
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(outDir, `props_${g}${mode === 'variant' ? '_variants' : ''}.png`) });
  console.log(g, types.length, 'types');
  await p.close();
}
console.log(logs.join('\n'));
await b.close();
