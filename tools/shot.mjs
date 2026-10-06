// Dev helper: bundle an entry file with esbuild, load it in headless Chromium (SwiftShader WebGL) with the CDN libs
// served from .cache/cdn, and save a screenshot. Usage: node tools/shot.mjs <entry.js> <out.png> [waitMs] [width] [height]
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
const [entry, out, wait = '1500', W = '1280', H = '720'] = process.argv.slice(2);
const bundle = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', target: 'es2020', logLevel: 'error' });
const js = bundle.outputFiles[0].text;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#123}canvas{display:block}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
${['CopyShader','LuminosityHighPassShader','EffectComposer','ShaderPass','RenderPass','UnrealBloomPass'].map(n=>`<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/${n.includes('Shader')&&!n.includes('Pass')?'shaders':'postprocessing'}/${n}.js"></script>`).join('\n')}
</head><body><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
const cdn = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
for (const n of ['CopyShader','LuminosityHighPassShader','ShaderPass','EffectComposer','RenderPass','UnrealBloomPass']) cdn['/' + n + '.js'] = '.cache/cdn/' + n + '.js';
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const logs = [];
p.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.route('**/*', (r) => {
  const u = r.request().url();
  for (const k of Object.keys(cdn)) if (u.includes(k)) return r.fulfill({ path: cdn[k], contentType: 'text/javascript' });
  if (u.startsWith('http://t/')) return r.fulfill({ contentType: 'text/html', body: html });
  return r.abort();
});
await p.goto('http://t/' + (process.env.QS || ''));
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log(logs.slice(0, 30).join('\n'));
await b.close();
