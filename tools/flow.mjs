// Player-flow test of the REAL UI (clicks, not hooks): splash -> title -> Quick Battle -> Quick Fight -> battle -> results -> Rematch -> menu.
// Usage: node tools/flow.mjs [--page=dist/voxelwars.html] [--out=.cache/flow] [--maxwait=240]. Fails on console errors, missing UI, or a battle that never ends.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const out = path.resolve(root, arg('out', '.cache/flow')); fs.mkdirSync(out, { recursive: true });
const pageFile = path.join(root, arg('page', 'dist/voxelwars.html')), maxWait = +arg('maxwait', 240);
const CSP = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:; worker-src blob: 'self'; base-uri 'none'; form-action 'none'";
const wrap = (h) => (/^\s*<!doctype/i.test(h) ? h : '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
const CDN = { 'three.min.js': '.cache/cdn/three.min.js', 'gsap.min.js': '.cache/cdn/gsap.min.js' };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = []; const log = (m) => console.log('[flow]', m);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
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
const shot = (n) => page.screenshot({ path: path.join(out, n + '.png') });
const state = () => page.evaluate(() => ({ s: window.__vw.game.state, scr: window.__vw.app.router.current(), tick: window.__vw.game.world ? window.__vw.game.world.tickN : -1, alive: window.__vw.game.world ? [window.__vw.game.world.stats[0].alive, window.__vw.game.world.stats[1].alive] : null }));
let fail = '';
try {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 90000 }); log('ready');
  await page.keyboard.press('Space'); await page.waitForTimeout(900);
  await page.getByText('Quick Battle', { exact: false }).first().click(); await page.waitForTimeout(1200); await shot('01_quick'); log('quick screen: ' + (await state()).scr);
  // small battle: pick the Skirmish budget if the chip exists
  const sk = page.getByText(/skirmish/i).first(); if (await sk.count()) { await sk.click().catch(() => {}); await page.waitForTimeout(300); }
  await page.getByText('Quick Fight', { exact: false }).first().click(); log('quick fight clicked');
  await page.waitForTimeout(2500); await shot('02_after_click'); let st = await state(); log('state: ' + JSON.stringify(st));
  if (st.s === 'placement') { await page.getByText('FIGHT', { exact: true }).first().click(); await page.waitForTimeout(1500); st = await state(); log('after FIGHT: ' + JSON.stringify(st)); }
  await page.evaluate(() => window.__vw.game.setSpeed(4));
  const t0 = Date.now(); let ended = false, n = 0;
  while ((Date.now() - t0) / 1000 < maxWait) { await page.waitForTimeout(3000); st = await state(); n++; if (n === 3) await shot('03_battle'); if (n % 5 === 0) log('t+' + Math.round((Date.now() - t0) / 1000) + 's ' + JSON.stringify(st)); if (st.s === 'ended') { ended = true; break; } }
  if (!ended) fail = 'battle did not end within ' + maxWait + 's (' + JSON.stringify(st) + ')';
  else {
    await page.waitForTimeout(4500); await shot('04_results'); log('results screen: ' + (await state()).scr);
    const hasResults = await page.evaluate(() => !!document.querySelector('.vw-screen[data-screen="results"]'));
    if (!hasResults) fail = 'results overlay did not appear';
    else {
      await page.getByText(/rematch|again/i).first().click().catch(() => { fail = 'no rematch button'; }); await page.waitForTimeout(2500); st = await state(); log('after rematch: ' + JSON.stringify(st));
      if (!fail && !['countdown', 'running', 'placement'].includes(st.s)) fail = 'rematch did not restart the battle: ' + st.s;
      await shot('05_rematch');
    }
  }
} catch (e) { fail = 'driver: ' + e.message; }
await browser.close();
const uniq = [...new Set(problems)];
if (uniq.length) console.log('problems:\n' + uniq.slice(0, 30).join('\n'));
if (fail) console.log('FLOW FAILED: ' + fail); else console.log(uniq.length ? 'FLOW completed with console problems' : 'FLOW PASSED');
process.exit(fail || uniq.length ? 1 : 0);
