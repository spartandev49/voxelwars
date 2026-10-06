// Browser harness for the Soldier Workshop and Voxel Painter (owner EDITORS-B): serves dist/voxelwars.html with the artifact CSP, drives the REAL app in headless
// Chromium (SwiftShader) and runs a scenario module: tests/editors/soldier/browser/<name>.mjs exporting `run({page, shot, step, check, sleep, problems})`.
// Usage: node tools/shot_editors_b.mjs <scenario> [--out=<dir>] [--size=1280x720] [--no-build]
// Fails on any console error/warning, page error, CSP violation or failed request.
import { chromium } from 'playwright-core';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : (process.argv.includes('--' + n) ? true : d); };
const scenario = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'workshop_look';
const outDir = path.join(root, arg('out', '.cache/editors_b')); fs.mkdirSync(outDir, { recursive: true });
const [W, H] = String(arg('size', '1280x720')).split('x').map(Number);
if (!arg('no-build', false)) { const r = spawnSync('node', ['tools/build.mjs'], { cwd: root, encoding: 'utf8' }); if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); } }
const pageFile = path.join(root, 'dist/voxelwars.html');
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg' };
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: !!arg('touch', false), acceptDownloads: true });
const page = await context.newPage();
const problems = [], logs = [];
page.on('console', (m) => { const t = m.type(), txt = m.text(); logs.push(t + ': ' + txt); if (t === 'error' || t === 'warning') problems.push(`console.${t}: ${txt}`); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 4).map((x) => x.trim()).join(' <- ')));
page.on('requestfailed', (r) => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return; problems.push('requestfailed: ' + u + ' ' + (r.failure() && r.failure().errorText)); });
await page.exposeFunction('__vwCsp', (v) => problems.push('CSP violation: ' + v));
await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', (e) => window.__vwCsp(e.violatedDirective + ' blocked ' + e.blockedURI)); });
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'vw.test') {
    if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': CSP }, body: fs.readFileSync(pageFile) });
    const f = path.join(root, decodeURIComponent(u.pathname));
    if (f.startsWith(path.join(root, 'assets')) && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'not found' });
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  for (const k of Object.keys(CDN)) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, CDN[k])) });
  return route.abort();
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name, opts = {}) => { const f = path.join(outDir, `${name}_${W}x${H}.png`); await page.screenshot(Object.assign({ path: f }, opts)); console.log('[shot]', path.relative(root, f)); return f; };
const step = (m) => console.log('[step]', m);
let fails = 0;
const check = (cond, msg) => { if (cond) console.log('  PASS', msg); else { fails++; console.log('  FAIL', msg); } };
try {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 60000 });
  await page.keyboard.press('Space'); await sleep(600);
  const mod = await import(pathToFileURL(path.join(root, 'tests/editors/soldier/browser', scenario + '.mjs')).href);
  await mod.run({ page, shot, step, check, sleep, problems, W, H, outDir, context });
} catch (e) { problems.push('driver: ' + (e && e.stack || e)); }
await browser.close();
if (problems.length) { console.log('PROBLEMS:\n' + problems.slice(0, 20).join('\n')); }
if (fails) console.log(`${fails} check(s) FAILED`);
if (problems.length || fails) { console.log('--- last console lines ---\n' + logs.slice(-12).join('\n')); process.exit(1); }
console.log('OK (' + logs.length + ' console lines, 0 errors/warnings)');
