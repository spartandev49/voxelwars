// PropRenderer in a real WebGL context (headless Chromium + SwiftShader, three r128 from .cache/cdn): stats, culling/LOD, editor API,
// destruction + debris, event wiring, emitters, floating ships, the animated crowd, dispose. Skips (exit 0, loudly) without Chromium.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!fs.existsSync(exe) || !fs.existsSync('.cache/cdn/three.min.js')) { console.log('SKIP renderer.test: Chromium or .cache/cdn/three.min.js missing'); process.exit(0); }
const bundle = await build({ entryPoints: ['tests/props/renderer_page.js'], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error' });
const js = bundle.outputFiles[0].text;
const post = ['CopyShader', 'LuminosityHighPassShader', 'EffectComposer', 'ShaderPass', 'RenderPass', 'UnrealBloomPass'];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
${post.map((n) => `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/${n.includes('Shader') && !n.includes('Pass') ? 'shaders' : 'postprocessing'}/${n}.js"></script>`).join('\n')}
</head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
const cdn = { 'three.min.js': '.cache/cdn/three.min.js' };
for (const n of post) cdn['/' + n + '.js'] = '.cache/cdn/' + n + '.js';
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GPU stall|swiftshader|ReadPixels/i.test(t)) logs.push(m.type() + ': ' + t); } });
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.route('**/*', (r) => {
  const u = r.request().url();
  for (const k of Object.keys(cdn)) if (u.includes(k)) return r.fulfill({ path: cdn[k], contentType: 'text/javascript' });
  if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
  return r.abort();
});
await p.goto('http://t/');
await p.waitForFunction(() => window.__result, null, { timeout: 120000 });
const res = await p.evaluate(() => window.__result);
await b.close();
let bad = 0;
for (const r of res) { if (!r.ok) { bad++; console.error('FAIL', r.name, r.detail); } }
for (const l of logs) { bad++; console.error('CONSOLE', l); }
if (bad) { console.error(bad + ' renderer check(s) failed of ' + res.length); process.exit(1); }
console.log(`prop renderer OK: ${res.length} checks, no console errors/warnings`);
