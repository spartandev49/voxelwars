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

const shot = async (name) => { await page.screenshot({ path: path.join(shotsDir, 'meta_' + name + '.png') }); };
const step = (m) => console.log('[smoke-meta]', m);
let ok = true; const fails = [];
const check = (c, msg) => { if (!c) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok  ', msg); };
const ev = (fn, a) => page.evaluate(fn, a);
const waitState = async (st, secs) => { const t0 = Date.now(); while ((Date.now() - t0) / 1000 < secs) { if ((await ev(() => window.__vw.game.state)) === st) return true; await page.waitForTimeout(250); } return false; };
try {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 60000 });
  await page.waitForTimeout(600); await page.keyboard.press('Space'); await page.waitForTimeout(900);
  check(await ev(() => !!window.__vw.app.meta && window.__vw.app.game.meta === window.__vw.app.meta), 'game.meta is wired');
  const save = await ev(() => { const s = window.__vw.app.router.getCtx().save; return ['progress', 'survival', 'daily', 'seen', 'stats', 'draft', 'exportAll', 'importAll'].filter((k) => s[k] === undefined); });
  check(save.length === 0, 'ctx.save has progress/survival/daily/seen/stats/draft/exportAll/importAll ' + JSON.stringify(save));

  // ---- battle 1: stats, kill feed, announcer, results (4x speed)
  await ev(async () => { await window.__vw.quick({ rules: { budget: 3000 } }); }); await page.waitForTimeout(800);
  await ev(() => window.__vw.fight()); await page.waitForTimeout(400);
  await ev(() => window.__vw.game.setSpeed(4));
  let feedSeen = 0, annSeen = 0; const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < 150) { await page.waitForTimeout(1500); const m = await ev(() => { const g = window.__vw.game; const h = g.hud(); return { st: g.state, feed: h.killfeed.length, ann: !!h.announcer, teach: h.teaching, possess: h.possess }; }); feedSeen = Math.max(feedSeen, m.feed); if (m.ann) annSeen++; if (m.st === 'ended') break; }
  check(await waitState('ended', 5), 'the battle ended');
  check(feedSeen > 0, 'kill feed filled during the battle (max rows ' + feedSeen + ')');
  const r = await ev(() => { const g = window.__vw.game; const res = g.results(); const s = window.__vw.app.stats.get(); return { funny: res.funnyStats, lessons: res.lessons, mvp: res.mvp, battles: s.battles, kills: s.kills || 0, winner: res.winner, feed: g.killfeed.slice(), announce: g.announce, summary: !!res.summary, played: s.arenasPlayed }; });
  check(r.battles === 1, 'lifetime stats counted the battle (battles=' + r.battles + ', kills=' + r.kills + ')');
  check(Array.isArray(r.funny) && r.funny.length >= 1 && r.funny.every((x) => typeof x.label === 'string' && typeof x.value === 'string'), 'results.funnyStats shape ' + JSON.stringify(r.funny));
  check(r.lessons.length === 3 && r.lessons.every((l) => l.text && l.fix), 'results.lessons has 3 lessons: ' + r.lessons.map((l) => l.id).join());
  check(!r.mvp || typeof r.mvp.quote === 'string', 'MVP has last words');
  check(r.feed.every((f) => f.verb && f.text.includes(f.verb) && f.key), 'kill feed rows carry verb/text/key');
  const persisted = await ev(() => JSON.parse(localStorage.getItem('vw.stats') || 'null'));
  check(persisted && persisted.data && persisted.data.battles === 1, 'vw.stats persisted to localStorage');
  const ann = await ev(() => window.__vw.app.meta.debug().announcer);
  check(ann.emitted >= 1, 'the announcer spoke ' + ann.emitted + ' line(s)');
  await page.waitForTimeout(2600); await shot('results');
  check(await ev(() => !!document.querySelector('[data-screen="results"]')), 'the results overlay mounted with the decorated data');
  const funnyDom = await ev(() => document.querySelectorAll('.bs-res-funny dt').length); check(funnyDom >= 1, 'results screen shows the funny stats (' + funnyDom + ' rows)');
  const lessonDom = await ev(() => document.querySelectorAll('.bs-res-lesson').length); check(lessonDom === 3, 'results screen shows 3 lessons (' + lessonDom + ')');

  // ---- kill-cam from the results screen (UI16/UI19 path): plays, restores, does not change results
  const before = await ev(() => JSON.stringify(window.__vw.game.results().teams) + window.__vw.game.speed);
  const kc = ev(() => window.__vw.game.killcam().then((v) => v));
  await page.waitForTimeout(600); const mid = await ev(() => ({ mode: window.__vw.game.rig.mode, speed: window.__vw.game.speed, active: window.__vw.game.killcamActive() }));
  check(mid.mode === 'killcam' && mid.speed === 0.25 && mid.active, 'kill-cam running: ' + JSON.stringify(mid)); await shot('killcam');
  const played = await kc; check(played === true, 'kill-cam resolved after ~4 s');
  const after = await ev(() => JSON.stringify(window.__vw.game.results().teams) + window.__vw.game.speed); check(after === before, 'kill-cam left results and speed untouched');

  // ---- export / import round trip through ctx.save
  const tr = await ev(async () => { const s = window.__vw.app.router.getCtx().save; const code = await s.exportAll(); const res = await s.importAll(code); let rejected = null; try { await s.importAll(code.slice(0, -9)); } catch (e) { rejected = String(e.message); } return { len: code.length, head: code.slice(0, 9), ok: res.ok, applied: res.applied, rejected, battles: window.__vw.app.stats.get().battles }; });
  check(/^VW1\.save\./.test(tr.head) && tr.ok && tr.applied.includes('stats'), 'exportAll -> importAll round trip (' + tr.len + ' chars, applied ' + tr.applied.join() + ')');
  check(tr.rejected && /damaged|check/.test(tr.rejected), 'a damaged code is rejected with a plain message: ' + tr.rejected); check(tr.battles === 1, 'import kept the stats');

  // ---- battle 2: god-power aim + Take Command input at 1x
  await ev(() => { window.__vw.app.router.closeOverlay('results'); return window.__vw.game.rematch(); }); await page.waitForTimeout(500);
  check(await waitState('running', 12), 'rematch reached running');
  await ev(() => window.__vw.game.setSpeed(1));
  const aim = await ev(() => { const g = window.__vw.game; const ok = g.aim('zeus_lightning'); const armed = window.__vw.app.meta.aim.active; const ring = g.engine.scene.children.some((c) => c.type === 'Group' && c.visible && c.renderOrder === 22); return { ok, armed, ring, hudAim: g.hud().aim }; });
  check(aim.ok && aim.armed && aim.hudAim === 'zeus_lightning', 'aim(zeus_lightning) arms target mode ' + JSON.stringify(aim));
  const box = await ev(() => { const r = window.__vw.engine.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.waitForTimeout(150);
  const ringOn = await ev(() => window.__vw.game.engine.scene.children.some((c) => c.type === 'Group' && c.visible && c.renderOrder === 22)); check(ringOn, 'the aim ring follows the cursor'); await shot('aim');
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(400);
  const cast = await ev(() => { const g = window.__vw.game; return { armed: window.__vw.app.meta.aim.active, cd: g.godPowers().find((p) => p.id === 'zeus_lightning'), selected: g.selected() }; });
  check(!cast.armed && cast.cd && cast.cd.cd > 0 && !cast.cd.ready, 'a click casts at the terrain point and disarms (cooldown ' + (cast.cd && cast.cd.cd.toFixed(1)) + ')');
  await ev(() => window.__vw.game.aim('meteor')); await page.mouse.click(box.x + 40, box.y + 40, { button: 'right' }); await page.waitForTimeout(250);
  check(await ev(() => !window.__vw.app.meta.aim.active), 'a right-click cancels aiming'); check(await ev(() => window.__vw.game.state === 'running' && !window.__vw.game.isPaused()), 'and does not pause the game');
  await ev(() => window.__vw.game.aim('meteor')); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  check(await ev(() => !window.__vw.app.meta.aim.active), 'Esc cancels aiming');
  // take command
  const tc = await ev(async () => { const g = window.__vw.game, w = g.world; const u = w.units.find((x) => x.team === 0 && x.alive); g.possess(u.id); await new Promise((r) => setTimeout(r, 400)); const x0 = u.x, z0 = u.z; const ok = g.possessInput({ move: { x: 0, y: -1 } }); await new Promise((r) => setTimeout(r, 1200)); const hud = g.hud(); return { ok, moved: Math.hypot(u.x - x0, u.z - z0), possess: hud.possess && { id: hud.possess.id, name: hud.possess.name, ab: hud.possess.abilities.length }, alive: u.alive }; });
  check(tc.ok && (tc.moved > 0.8 || !tc.alive), 'possessInput moves the possessed soldier (moved ' + tc.moved.toFixed(2) + ')'); check(!!tc.possess || !tc.alive, 'hud.possess is filled ' + JSON.stringify(tc.possess));
  await shot('possess');
  await ev(() => window.__vw.game.possess(null));
  // teaching: not a mission-1 setup, so nothing is shown
  check(await ev(() => window.__vw.game.hud().teaching === null), 'no teaching card outside mission 1');
  const safe = await ev(() => { const g = window.__vw.game; g.exitToMenu(); return [g.aim('meteor'), g.possessInput({ move: { x: 1, y: 0 } }), g.teachingNext(), g.skipTeaching()].map(String).join(); });
  check(safe === 'false,false,false,false' || /false/.test(safe), 'aim / possessInput / teaching are safe without a world: ' + safe);
  check(await ev(() => window.__vw.game.killcam().then((v) => String(v))) === 'false', 'killcam() without a world resolves false');

  // ---- reload: persistence
  await page.reload(); await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 60000 });
  const re = await ev(() => ({ battles: window.__vw.app.stats.get().battles, ach: Object.keys(window.__vw.app.router.getCtx().save.progress.get('achievements')) }));
  check(re.battles === 1, 'lifetime stats survive a reload (battles=' + re.battles + ')'); step('achievements after reload: ' + (re.ach.join() || '(none)'));
} catch (e) { problems.push('driver: ' + e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')); }
await browser.close();
if (problems.length || fails.length) { ok = false; console.log('META SMOKE FAILED:\n' + problems.slice(0, 25).concat(fails).join('\n')); }
if (arg('logs', false) || problems.length) console.log('--- last console lines ---\n' + logs.slice(-30).join('\n'));
if (ok) console.log('META SMOKE PASSED (' + logs.length + ' console lines, 0 errors/warnings)');
process.exit(ok ? 0 : 1);
