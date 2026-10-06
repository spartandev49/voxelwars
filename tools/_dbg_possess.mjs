// META smoke (tools/smoke_meta.mjs): same harness as smoke.mjs, but drives the META layer in the real page: stats, kill feed, announcer, results funny stats + lessons,
// god-power aim, Take Command input, kill-cam, export/import and reload persistence. Usage: node tools/smoke_meta.mjs [--page=dist/voxelwars.html]
// (derived from smoke.mjs) serves dist/voxelwars.html with the ARTIFACT CSP header (from the tool contract), CDN libs from .cache/cdn, assets from /assets,
// drives the real game in headless Chromium (SwiftShader WebGL2) and FAILS on any console error/warning, CSP violation, failed request or page error.
// Usage: node tools/smoke.mjs [--shots=<dir>] [--battle=<seconds>] [--no-assets] [--block-cdn] [--page=dist/voxelwars.html]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : (process.argv.includes('--' + n) ? true : d); };
const shotsDir = arg('shots', path.join(root, '.cache/smoke')); fs.mkdirSync(shotsDir, { recursive: true });
const battleSecs = +arg('battle', 8);
const pageFile = path.join(root, arg('page', 'dist/voxelwars.html'));
const blockCdn = !!arg('block-cdn', false);
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg' };

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [], logs = [];
page.on('console', (m) => { const t = m.type(); const txt = m.text(); logs.push(t + ': ' + txt); if (t === 'error' || t === 'warning') problems.push(`console.${t}: ${txt}`); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 4).map((x) => x.trim()).join(' <- ')));
page.on('requestfailed', (r) => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return; problems.push('requestfailed: ' + u + ' ' + (r.failure() && r.failure().errorText)); });
await page.exposeFunction('__vwCsp', (v) => problems.push('CSP violation: ' + v));
await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => window.__vwCsp(e.violatedDirective + ' blocked ' + e.blockedURI)); });
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'vw.test') {
    if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': CSP }, body: fs.readFileSync(pageFile) });
    const f = path.join(root, decodeURIComponent(u.pathname));
    if (!arg('no-assets', false) && f.startsWith(path.join(root, 'assets')) && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'not found' });
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  for (const k of Object.keys(CDN)) if (u.pathname.endsWith('/' + k) || u.pathname.endsWith(k)) { if (blockCdn) return route.abort(); return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, CDN[k])) }); }
  if (blockCdn && /cdnjs|jsdelivr|unpkg/.test(u.host)) return route.abort();
  return route.abort();
});


const ev = (fn, a) => page.evaluate(fn, a);
try {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 60000 });
  await page.waitForTimeout(600); await page.keyboard.press('Space'); await page.waitForTimeout(900);
  await ev(async () => { await window.__vw.quick({ rules: { budget: 3000 } }); }); await page.waitForTimeout(500);
  await ev(() => window.__vw.fight()); await page.waitForTimeout(300);
  await ev(() => window.__vw.step(100)); await page.waitForTimeout(500);
  console.log('state', await ev(() => ({ st: window.__vw.game.state, paused: window.__vw.game.paused, speed: window.__vw.game.speed, ws: window.__vw.world.state })));
  const r = await ev(async () => { const g = window.__vw.game, w = g.world; const u = w.units.find((x) => x.team === 0 && x.alive); g.possess(u.id); await new Promise((r) => setTimeout(r, 600)); const out = []; out.push({ cur: !!w.possession.current, st: u.state, x: u.x, z: u.z, tick: w.tickN, pid: g.possessId }); const ok = g.possessInput({ move: { x: 0, y: -1 } }); out.push({ ok, q: w.inputQ.length }); await new Promise((r) => setTimeout(r, 1500)); out.push({ x: u.x, z: u.z, st: u.state, tick: w.tickN, cur: !!w.possession.current, mx: w.possession.mx, mz: w.possession.mz, pid: g.possessId, dvx: u.dvx, dvz: u.dvz, controlled: u.controlled, yaw: g.rig.syaw, alive: u.alive, paused: g.paused }); return out; });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.log('driver', e.message); }
await browser.close(); process.exit(0);
