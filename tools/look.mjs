// Look-dev screenshots of the REAL built game: starts a quick battle on each requested arena, steps the sim, frames the armies, saves PNGs.
// Usage: node tools/look.mjs [--arenas=marathon,troy] [--ticks=240] [--out=.cache/look] [--q=marble] [--size=medium] [--cam=battle|wide|close]
// Uses the same CSP-header server as tools/smoke.mjs (so what you see is what the artifact shows). Needs dist/voxelwars.html (npm run build).
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const arenas = arg('arenas', 'marathon').split(',');
const ticks = +arg('ticks', 240);
const out = path.resolve(root, arg('out', '.cache/look')); fs.mkdirSync(out, { recursive: true });
const seArg = arg('se', ''), lodArg = arg('lod', ''), quality = arg('q', 'marble'), size = arg('size', 'medium'), cam = arg('cam', 'battle');
const pageFile = path.join(root, arg('page', 'dist/voxelwars.html'));
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const wrapPage = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const MIME = { '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' };
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('console', (m) => { if (process.env.LOOK_LOG) console.log('  [page]', m.type(), m.text()); if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'vw.test') {
    if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': CSP }, body: wrapPage(fs.readFileSync(pageFile, 'utf8')) });
    const f = path.join(root, decodeURIComponent(u.pathname));
    if (f.startsWith(path.join(root, 'assets')) && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'not found' });
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  for (const k of Object.keys(CDN)) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, CDN[k])) });
  return route.abort();
});
await page.goto('http://vw.test/index.html');
await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 60000 });
await page.evaluate(({ q, lod }) => { const v = window.__vw; v.engine.setQuality(q); v.game.setTier(q); v.app.settings.data.autoScale = false; window.__lodForce = lod === '' ? null : +lod; }, { q: quality, lod: lodArg });
for (const a of arenas) {
  const info = await page.evaluate(async ({ a, size, ticks, cam, se }) => {
    const vw = window.__vw; const g = vw.game;
    const s = g.newSetup('quick', { arena: { presetId: a, size, seed: 5 }, rules: { budget: +(window.__lookBudget || 3000) } });
    console.log('begin'); await g.begin(s); console.log('begun'); g.autoFill(0, {}); g.autoFill(1, {}); console.log('filled ' + g.world.units.length); vw.app.router.goto('placement'); console.log('placement');
    g.fight(); console.log('fight ' + g.state); g.world.countdown = 0; vw.step(1); console.log('stepped');
    vw.step(Math.max(0, ticks));
    g.frameArmies(true); if (window.__lodForce !== null && window.__lodForce !== undefined) g.view.lodDist = window.__lodForce; g.setTier = () => {};
    const r = g.rig; if (cam === 'wide') { r.dist *= 1.35; r.snap(); } else if (cam === 'close') { r.dist *= 0.45; r.pitch = 0.42; r.snap(); }
    vw.app.router.goto('battle');
    if (se) { const ids = se.split(',').map(Number); g.world.units.forEach((u, i) => { u.se[ids[i % ids.length]] = 99; }); }
    for (let i = 0; i < 4; i++) vw.step(1);
    return { units: g.world.units.length, tick: g.world.tickN, arena: a, dist: r.dist };
  }, { a, size, ticks, cam, se: seArg });
  await page.waitForTimeout(700);
  const file = path.join(out, `${a}_${cam}.png`); await page.screenshot({ path: file, timeout: 180000 });
  console.log('[look]', JSON.stringify(info), '->', path.relative(root, file));
}
await browser.close();
if (errs.length) { console.log('console problems:\n' + errs.slice(0, 15).join('\n')); process.exit(1); }
