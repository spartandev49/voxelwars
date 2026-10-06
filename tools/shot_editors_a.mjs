// EDITORS-A browser harness: drives the built page (dist/voxelwars.html, served with the artifact CSP) through the Arena Builder.
// Usage: node tools/shot_editors_a.mjs [--w=1280] [--h=720] [--scenario=shots|flow|all] [--out=.cache/ed] [--touch]
// Fails on any console error / warning, page error, CSP violation or failed request. Screenshots land in --out.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : (process.argv.includes('--' + n) ? true : d); };
const W = +arg('w', 1280), H = +arg('h', 720), outDir = path.join(root, arg('out', '.cache/ed')); fs.mkdirSync(outDir, { recursive: true });
const scenario = arg('scenario', 'shots');
const pageFile = path.join(root, arg('page', 'dist/voxelwars.html'));
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg' };
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: !!arg('touch', false), acceptDownloads: true });
const page = await ctx.newPage();
const problems = [], logs = [];
page.on('console', (m) => { const t = m.type(), txt = m.text(); logs.push(t + ': ' + txt); if (t === 'error' || t === 'warning') problems.push(`console.${t}: ${txt}`); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 5).map((x) => x.trim()).join(' <- ')));
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
const shot = async (name) => { const f = path.join(outDir, `${name}_${W}x${H}.png`); await page.screenshot({ path: f }); console.log('shot', f); return f; };
const step = (m) => console.log('[ed]', m);
const sleep = (ms) => page.waitForTimeout(ms);
const ev = (fn, a) => page.evaluate(fn, a);
const st = () => ev(() => { const b = window.__vw.arenaBuilder; return b ? { tool: b.st.tool, props: b.session.arena.props.length, hazards: b.session.arena.hazards.length, markers: b.session.arena.markers.length, depth: b.session.undo.depth, dirty: b.session.dirty, name: b.session.arena.name, size: b.session.arena.size, issues: b.issues && b.issues.issues.map((i) => i.code) } : null; });
const H_ = { page, shot, step, sleep, ev, st, problems, logs, W, H, outDir };

async function boot() {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 90000 });
  await sleep(600); await page.keyboard.press('Space'); await sleep(900);
}
async function openBuilder(opts = {}) {
  await ev(() => window.__vw.goto('arena_builder'));
  await page.waitForSelector('#ed-root', { timeout: 90000 });
  await sleep(600);
  if (opts.closeModal !== false) { for (let i = 0; i < 3; i++) { if (await page.$('.vw-modal-wrap')) { await page.keyboard.press('Escape'); await page.waitForSelector('.vw-modal-wrap', { state: 'detached', timeout: 3000 }).catch(() => {}); await sleep(250); } } }
  await sleep(opts.wait || 1200);
}
let ok = true;
try {
  await boot();
  const mod = await import(path.join(root, 'tests/editors/arena/browser_scenarios.mjs'));
  await mod.run(scenario, Object.assign(H_, { boot, openBuilder, arg }));
} catch (e) { problems.push('driver: ' + (e && e.stack || e)); }
await browser.close();
const shown = problems.filter((p) => !/Failed to load resource: net::ERR_FAILED/.test(p));
if (shown.length) { ok = false; console.log('PROBLEMS:\n' + shown.slice(0, 25).join('\n')); console.log('--- last console lines ---\n' + logs.slice(-15).join('\n')); }
else console.log('EDITORS-A browser run OK (' + logs.length + ' console lines, 0 errors/warnings)');
process.exit(ok ? 0 : 1);
