// Arena look gate (W2): renders every generator recipe from 3 cameras (top-down, oblique, low hero shot) with Engine + TerrainRenderer +
// PropRenderer into docs/sheets/arenas_<recipe>_<cam>.png (960x540) and a 4x4 contact sheet docs/sheets/arenas_index.png.
// Usage: node tools/arena_sheet.mjs [recipe,recipe|all] [--size medium|small|large] [--seed 3] [--cams top,oblique,hero] [--out docs/sheets]
//        [--look sun,hemi,exposure (light-rig multipliers, look-dev only)] [--time 12] [--weather rain] [--quality marble] [--w 960 --h 540] [--index]
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['index', 'index-only'].includes(args[i - 1].slice(2))));
const W = +opt('w', 960), H = +opt('h', 540), outDir = opt('out', 'docs/sheets'), size = opt('size', 'medium'), seed = +opt('seed', 3);
const cams = opt('cams', 'top,oblique,hero').split(',');
const loadOpts = {}; if (opt('time')) loadOpts.time = +opt('time'); if (opt('weather')) loadOpts.weather = opt('weather'); if (opt('quality')) loadOpts.quality = opt('quality');
if (opt('look')) { const [sun, hemi, exp] = opt('look').split(',').map(Number); loadOpts.look = { sun, hemi, exp }; }
fs.mkdirSync(outDir, { recursive: true });
const bundle = await build({ entryPoints: ['tests/visual/arena_sheet_page.js'], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error' });
const js = bundle.outputFiles[0].text;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#123}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
${['CopyShader', 'LuminosityHighPassShader', 'EffectComposer', 'ShaderPass', 'RenderPass', 'UnrealBloomPass'].map((n) => `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/${n.includes('Shader') && !n.includes('Pass') ? 'shaders' : 'postprocessing'}/${n}.js"></script>`).join('\n')}
</head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
const cdn = { 'three.min.js': '.cache/cdn/three.min.js' };
for (const n of ['CopyShader', 'LuminosityHighPassShader', 'ShaderPass', 'EffectComposer', 'RenderPass', 'UnrealBloomPass']) cdn['/' + n + '.js'] = '.cache/cdn/' + n + '.js';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const logs = [];
p.on('console', (m) => { const t = m.text(); if (!/GPU stall|swiftshader/i.test(t)) logs.push(m.type() + ': ' + t); });
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.route('**/*', (r) => {
  const u = r.request().url();
  for (const k of Object.keys(cdn)) if (u.includes(k)) return r.fulfill({ path: cdn[k], contentType: 'text/javascript' });
  if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
  return r.abort();
});
await p.goto('http://t/');
await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const all = await p.evaluate(() => window.__sheet.recipes);
let list = positional.length && positional[0] !== 'all' ? positional[0].split(',') : all;
const done = [];
// --env times|weather: one recipe under several times of day / weather presets, composed into one labelled sheet (R12 / R13)
if (opt('env')) {
  const kind = opt('env'), recipe = list[0];
  const variants = kind === 'look' ? [['engine default', undefined], ['sun .8 hemi .7', { sun: 0.8, hemi: 0.7, exp: 1 }], ['sun .65 hemi .55', { sun: 0.65, hemi: 0.55, exp: 1 }], ['sun .55 hemi .5 exp 1.1', { sun: 0.55, hemi: 0.5, exp: 1.1 }]].map(([label, look]) => ({ label, o: look ? { look } : {} })) : kind === 'times' ? [6, 12, 18, 23].map((t) => ({ label: `${t}:00`, o: { time: t } })) : ['clear', 'cloudy', 'rain', 'storm', 'snow', 'sandstorm', 'fog'].map((w) => ({ label: w, o: { weather: w } }));
  const files = [];
  for (const v of variants) {
    await p.evaluate(([rr, s, sd, o]) => window.__sheet.load(rr, s, sd, o), [recipe, size, seed, Object.assign({}, loadOpts, v.o)]);
    await p.evaluate(([cc, w, h]) => window.__sheet.cam(cc, w, h), [opt('cam', 'oblique'), W, H]);
    await p.evaluate(() => window.__sheet.render(2)); await p.waitForTimeout(120);
    const f = path.join(outDir, `env_${recipe}_${v.label.replace(/[^a-z0-9]+/gi, '_')}.png`); await p.screenshot({ path: f }); files.push({ label: v.label, f });
  }
  const big = kind === 'times' || kind === 'look', cols = big ? 2 : 4, tw = big ? 640 : 480, th = big ? 360 : 270, rows = Math.ceil(files.length / cols);
  const page2 = await b.newPage({ viewport: { width: cols * tw, height: rows * th } });
  const imgs = files.map((t, i) => `<div style="position:absolute;left:${(i % cols) * tw}px;top:${Math.floor(i / cols) * th}px;width:${tw}px;height:${th}px"><img src="data:image/png;base64,${fs.readFileSync(t.f).toString('base64')}" width="${tw}" height="${th}"><span style="position:absolute;left:8px;top:6px;font:bold 17px sans-serif;color:#fff;text-shadow:0 0 4px #000,0 0 3px #000">${recipe} ${t.label}</span></div>`).join('');
  await page2.setContent(`<body style="margin:0;background:#000">${imgs}</body>`); await page2.waitForTimeout(300);
  await page2.screenshot({ path: path.join(outDir, `sheet_${kind}_${recipe}.png`) });
  for (const t of files) fs.unlinkSync(t.f);
  console.log(logs.slice(0, 10).join('\n')); await b.close(); process.exit(0);
}
for (const r of (flag('index-only') ? [] : list)) {
  const t0 = Date.now();
  const info = await p.evaluate(([rr, s, sd, o]) => window.__sheet.load(rr, s, sd, o), [r, size, seed, loadOpts]);
  for (const c of cams) {
    await p.evaluate(([cc, w, h]) => window.__sheet.cam(cc, w, h), [c, W, H]);
    const st = await p.evaluate(() => window.__sheet.render(2));
    await p.waitForTimeout(120);
    const f = path.join(outDir, `arenas_${r}_${c}.png`);
    await p.screenshot({ path: f });
    done.push({ r, c, f, st });
  }
  console.log(r.padEnd(12), 'props', info.props, 'propBuildMs', info.buildMs, 'water', info.water, 'ms', Date.now() - t0, JSON.stringify(done[done.length - 1].st));
}
console.log(logs.slice(0, 20).join('\n'));
if (flag('index') || flag('index-only') || list.length > 1) {
  // contact sheet: one tile per recipe (oblique), 4 columns
  const tiles = list.map((r) => ({ r, f: path.join(outDir, `arenas_${r}_${cams.includes('oblique') ? 'oblique' : cams[0]}.png`) })).filter((t) => fs.existsSync(t.f));
  const cols = 4, tw = 480, th = 270, rows = Math.ceil(tiles.length / cols);
  const page2 = await b.newPage({ viewport: { width: cols * tw, height: rows * th } });
  const imgs = tiles.map((t, i) => `<div style="position:absolute;left:${(i % cols) * tw}px;top:${Math.floor(i / cols) * th}px;width:${tw}px;height:${th}px"><img src="data:image/png;base64,${fs.readFileSync(t.f).toString('base64')}" width="${tw}" height="${th}"><span style="position:absolute;left:6px;top:4px;font:bold 15px sans-serif;color:#fff;text-shadow:0 0 4px #000,0 0 3px #000">${t.r}</span></div>`).join('');
  await page2.setContent(`<body style="margin:0;background:#000">${imgs}</body>`);
  await page2.waitForTimeout(300);
  await page2.screenshot({ path: path.join(outDir, 'arenas_index.png') });
}
await b.close();
