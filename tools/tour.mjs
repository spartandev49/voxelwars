// UI tour: boots the real build, visits every menu/editor screen, screenshots each, and fails on console errors/warnings or screens that did not mount.
// Usage: node tools/tour.mjs [--screens=title,quick,...] [--size=1280x720] [--out=.cache/tour] [--page=dist/voxelwars.html]
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const SCREENS = arg('screens', 'title,quick,campaign,survival,daily,puzzles,codex,achievements,stats,settings,credits,diagnostics,controls,arena_builder,workshop,painter').split(',');
const [W, H] = arg('size', '1280x720').split('x').map(Number);
const out = path.resolve(root, arg('out', '.cache/tour')); fs.mkdirSync(out, { recursive: true });
const pageFile = path.join(root, arg('page', 'dist/voxelwars.html'));
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const wrap = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const problems = []; let cur = 'boot';
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${cur}] console.${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`[${cur}] pageerror: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${cur}] HTTP ${r.status()} ${r.url()}`); });
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  if (u.host === 'vw.test') {
    if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': CSP }, body: wrap(fs.readFileSync(pageFile, 'utf8')) });
    const f = path.join(root, decodeURIComponent(u.pathname));
    if (f.startsWith(path.join(root, 'assets')) && fs.existsSync(f)) return route.fulfill({ status: 200, contentType: f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: 'not found' });
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  for (const k of Object.keys(CDN)) if (u.pathname.endsWith(k)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(root, CDN[k])) });
  return route.abort();
});
await page.goto('http://vw.test/index.html');
await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 90000 });
await page.keyboard.press('Space'); await page.waitForTimeout(600);
let bad = 0;
for (const id of SCREENS) {
  cur = id;
  const r = await page.evaluate((id) => { const v = window.__vw; const has = v.app.router.has(id); const ok = has ? v.goto(id) : false; return { has, ok, cur: v.app.router.current() }; }, id);
  await page.waitForTimeout(+arg('wait', 900));
  const mounted = await page.evaluate((id) => !!document.querySelector('.vw-screen[data-screen="' + id + '"]'), id);
  await page.screenshot({ path: path.join(out, `${W}x${H}_${id}.png`) });
  const tag = r.has && mounted ? 'ok' : 'MISSING'; if (tag !== 'ok') bad++;
  console.log(`[tour] ${id.padEnd(14)} ${tag}${r.has ? '' : ' (no screen module; fallback or none)'}`);
}
await browser.close();
const uniq = [...new Set(problems)];
if (uniq.length) console.log('problems:\n' + uniq.slice(0, 40).join('\n'));
console.log(bad || uniq.length ? `TOUR: ${bad} screen(s) missing, ${uniq.length} problem(s)` : 'TOUR PASSED');
process.exit(bad || uniq.length ? 1 : 0);
