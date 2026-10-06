// UNITS-A look-dev: places the twelve UNITS-A specials (both teams) in the REAL built game, side by side, and saves PNGs. Based on tools/look.mjs: starts a quick battle on each requested arena, steps the sim, frames the armies, saves PNGs.
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
const lodArg = arg('lod', ''), quality = arg('q', 'marble'), size = arg('size', 'medium'), cam = arg('cam', 'battle');
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
const IDS = arg('units', 'peltast,philosopher,strategos,pilum_thrower,centurion,gladiator,senator,khopesh_warrior,mummy,anubis_guard,priest_of_ra,pharaoh').split(',');
const camMode = arg('cam', 'lineup'), az = +arg('az', 0);
for (const a of arenas) {
  const info = await page.evaluate(async ({ a, size, ids, camMode, az }) => {
    const vw = window.__vw; const g = vw.game;
    const s = g.newSetup('quick', { arena: { presetId: a, size, seed: 5 }, rules: { budget: 40000 } });
    await g.begin(s);
    g.tools.clear(0); g.tools.clear(1);
    const n = ids.length, gap = 3.4, z0 = -((n - 1) * gap) / 2;
    ids.forEach((id, i) => {
      // two rows: team A (blue) at x = -3, team B (red) at x = +3, same unit side by side; both look at the camera (+x or -x side)
      g._applyRecord({ team: 0, defId: id, positions: [[-3, z0 + i * gap]], heading: az * Math.PI / 180, order: 'hold' }, false);
      g._applyRecord({ team: 1, defId: id, positions: [[3, z0 + i * gap]], heading: az * Math.PI / 180, order: 'hold' }, false);
    });
    vw.app.router.goto('placement');
    g.world.countdown = 0; vw.step(2);
    const r = g.rig; g.frameArmies(true);
    if (camMode === 'lineup') { r.dist = n * 2.9; r.pitch = 0.5; r.snap && r.snap(); }
    vw.app.router.goto('battle');
    for (let i = 0; i < 4; i++) vw.step(1);
    return { units: g.world.units.length, dist: r.dist };
  }, { a, size, ids: IDS, camMode, az });
  await page.waitForTimeout(900);
  const file = path.join(out, `ua_${a}_${camMode}.png`); await page.screenshot({ path: file });
  console.log('[look_ua]', JSON.stringify(info), '->', path.relative(root, file));
}
await browser.close();
if (errs.length) { console.log('console problems:\n' + errs.slice(0, 15).join('\n')); process.exit(1); }
