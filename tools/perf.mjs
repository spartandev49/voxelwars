// CPU-side performance probe of the REAL built game in headless Chromium: sim tick, BattleView.update (pose + skinning), and counts for a big battle.
// GPU time is NOT measurable here (SwiftShader); this finds JS hotspots. Usage: node tools/perf.mjs [--budget=40000] [--ticks=120] [--page=dist/voxelwars.html]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const budget = +arg('budget', 40000), ticks = +arg('ticks', 120), pageFile = path.join(root, arg('page', 'dist/voxelwars.html')), quality = arg('q', 'marble');
const wrap = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"></head><body>' + h + '</body></html>');
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'vw.test') { if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html', body: wrap(fs.readFileSync(pageFile, 'utf8')) }); const f = path.join(root, decodeURIComponent(u.pathname)); if (fs.existsSync(f)) return route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: 'application/octet-stream' }); return route.fulfill({ status: 404, body: '' }); }
  if (/fonts/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  for (const k of Object.keys(CDN)) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, CDN[k])) });
  return route.abort();
});
await page.goto('http://vw.test/index.html');
await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 90000 });
const prof = process.argv.includes('--profile');
let cdp = null; if (prof) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
const r = await page.evaluate(async ({ budget, ticks, quality, prof }) => {
  const v = window.__vw, g = v.game; v.engine.setQuality(quality); v.game.setTier(quality); v.app.settings.data.autoScale = false;
  g.stopDiorama && g.stopDiorama();
  const s = g.newSetup('quick', { arena: { presetId: 'marathon', size: 'large', seed: 3 }, rules: { budget } });
  await g.begin(s); g.autoFill(0, {}); g.autoFill(1, {});
  g.fight(); g.world.countdown = 0; g.world.start(0);
  const w = g.world, units0 = w.units.length;
  const T = (f, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(i); return (performance.now() - t0) / n; };
  const tick = T(() => w.tick(), ticks);
  g.frameArmies(true); const cam = v.engine.camera; cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  window.__prof && 0;
  const upd = T(() => g.view.update(0.5, 0.016, cam), 30);
  const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null;
  return { units0, unitsNow: w.units.length, tickMs: +tick.toFixed(2), viewUpdateMs: +upd.toFixed(2), drawn: g.view.drawn, heapMB: heap, cap: g.tier };
}, { budget, ticks, quality, prof });
console.log(JSON.stringify(r));
if (prof) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dts = profile.timeDeltas; const total = dts.reduce((a, b) => a + b, 0);
  profile.samples.forEach((id, i) => { const n = byId.get(id); const k = (n.callFrame.functionName || '(anon)') + ' ' + (n.callFrame.url || '').split('/').pop() + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + dts[i]); });
  console.log('top self time (ms) of', (total / 1000).toFixed(0), 'ms sampled');
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28)) console.log(String((v / 1000).toFixed(0)).padStart(6), k);
}
await browser.close();
