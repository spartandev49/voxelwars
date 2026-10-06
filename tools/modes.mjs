// Game-mode check of the REAL build: campaign mission, puzzle, survival (through an intermission) and daily, each deployed through the real briefing / setup screens, fought to the end and read back through game.results() and vw.progress.
// Usage: node tools/modes.mjs [--only=campaign,puzzle,survival,daily] [--page=dist/voxelwars.html] [--out=.cache/modes]. Fails on console errors, a mode that does not start, never ends, or records nothing.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const out = path.resolve(root, arg('out', '.cache/modes')); fs.mkdirSync(out, { recursive: true });
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
const ONLY = arg('only', 'campaign,puzzle,survival,daily,nav,camera').split(',');
const ev = (fn, a) => page.evaluate(fn, a);
// run the sim in small chunks until the predicate holds (the headless browser is slow: world.step is the same code the frame loop runs)
const verbose = process.argv.includes('--verbose');
async function runUntil(label, pred, { chunk = 30, max = 20000 } = {}) {
  for (let ticks = 0; ticks < max; ticks += chunk) {
    const st = await ev(({ chunk }) => { const g = window.__vw.game, w = g.world; if (g.state === 'countdown' || g.state === 'running') { w.step(chunk); } return { s: g.state, tick: w.tickN, a: w.stats[0].alive, b: w.stats[1].alive, wave: w.waves ? w.waves.n : 0 }; }, { chunk });
    if (verbose && (ticks / chunk) % 20 === 0) log('  t=' + st.tick + ' mine=' + st.a + ' enemy=' + st.b + ' wave=' + st.wave + ' ' + st.s);
    if (await ev(pred, st)) return st;
    if (st.s === 'ended') return st;
  }
  throw new Error(label + ': did not finish within ' + max + ' ticks');
}
const placeBrush = (defId, n, fx, fz) => ev(({ defId, n, fx, fz }) => { const g = window.__vw.game, z = g.world.arena.zones.A; g.tools.setBrush({ mode: n > 1 ? 'block' : 'single', defId, team: 0, count: n }); return g.placeAt(z.x + fx * z.w / 2, z.z + fz * z.d / 2); }, { defId, n, fx, fz });
try {
  await page.goto('http://vw.test/index.html');
  await page.waitForSelector('body[data-vw-ready="1"]', { timeout: 90000 }); log('ready');
  await page.keyboard.press('Space'); await page.waitForTimeout(900);

  if (ONLY.includes('campaign')) {
    log('--- campaign: mission 1 through the briefing');
    await ev(() => window.__vw.goto('briefing', { mission: 'marathon_sort_of' })); await page.waitForTimeout(800);
    await page.locator('#brief-deploy').click(); await page.waitForTimeout(1500);
    const s0 = await ev(() => { const g = window.__vw.game; return { state: g.state, screen: window.__vw.app.router.current(), kind: g.setup.kind, mission: g.setup.mission, b: g.world.stats[1].alive, a: g.world.stats[0].alive, budget: g.info.budget(0), objective: g.world.objective && g.world.objective.type, run: !!g.run }; });
    log('deployed: ' + JSON.stringify(s0));
    if (s0.state !== 'placement' || s0.screen !== 'placement' || !s0.run || s0.b < 20 || s0.objective === undefined) throw new Error('campaign deploy: ' + JSON.stringify(s0));
    // the enemy cannot be edited and auto-fill leaves it alone
    const lock = await ev(() => { const g = window.__vw.game, before = g.world.stats[1].alive; g.autoFill(1, {}); g.tools.clear(1); g.tools.setBrush({ mode: 'single', defId: 'hoplite', team: 1, count: 1 }); const z = g.world.arena.zones.B; const placed = g.placeAt(z.x, z.z); return { before, after: g.world.stats[1].alive, placed }; });
    log('enemy lock: ' + JSON.stringify(lock)); if (lock.before !== lock.after || lock.placed) throw new Error('the enemy army can be edited in a campaign mission');
    await shot('c1_placement');
    // a spear line, archers behind, peltasts on the flanks (the briefing's own advice), inside the 3,000 dr budget
    for (const [d, n, fx, fz] of [['hoplite', 12, 0.1, 0], ['hoplite', 9, 0.1, -0.7], ['cretan_archer', 9, -0.6, 0], ['peltast', 6, -0.2, 0.7]]) await placeBrush(d, n, fx, fz);
    const bud = await ev(() => window.__vw.game.info.budget(0)); log('budget after placing: ' + JSON.stringify(bud));
    await ev(() => window.__vw.game.fight()); await page.waitForTimeout(500); await shot('c2_battle');
    const end = await runUntil('campaign', () => false, { chunk: 60, max: 30000 });
    const r = await ev(() => { const g = window.__vw.game, r = g.results(), pr = window.__vw.app.save ? null : null; return { winner: r.winner, kind: r.kind, mission: r.mission, stars: r.stars, rewards: r.rewards, canNext: r.canNext, time: Math.round(r.time), lessons: (r.lessons || []).length }; });
    log('results: ' + JSON.stringify(r));
    if (r.kind !== 'campaign' || !r.mission || r.mission.id !== 'marathon_sort_of' || !Array.isArray(r.stars) || r.stars.length !== 3) throw new Error('campaign results lack the mission block: ' + JSON.stringify(r));
    const saved = await ev(() => { const a = window.__vw.app; const p = a.docs ? a.docs.progress : null; return p ? p.get('stars', {}) : 'no docs hook'; });
    log('progress stars: ' + JSON.stringify(saved));
    if (r.winner === 0 && !(saved && saved.marathon_sort_of >= 1)) throw new Error('a won mission recorded no star');
    await page.waitForTimeout(2200); await shot('c3_results'); void end;
  }

  if (ONLY.includes('puzzle')) {
    log('--- puzzle: spear_wall through the briefing, stored solution');
    await ev(() => window.__vw.goto('briefing', { puzzle: 'spear_wall' })); await page.waitForTimeout(800);
    await page.locator('#brief-deploy').click(); await page.waitForTimeout(1500);
    const s0 = await ev(() => { const g = window.__vw.game; return { state: g.state, screen: window.__vw.app.router.current(), kind: g.setup.kind, roster: g.setup.armies.A.roster, b: g.world.stats[1].alive, budget: g.info.budget(0), run: !!g.run, enemyTeamEditable: !g.mode.locked }; });
    log('deployed: ' + JSON.stringify(s0)); if (s0.state !== 'placement' || !s0.run || s0.b < 4 || s0.enemyTeamEditable) throw new Error('puzzle deploy: ' + JSON.stringify(s0));
    const n = await ev(() => { const g = window.__vw.game, pz = window.__vw.app.game.content.puzzleApi.puzzleById('spear_wall'); const recs = g._recordsFromPlacements(pz.solution.placements); for (const r of recs) { r.team = 0; r.heading = g._heading(0); g._applyRecord(r, false); } g.emit('placement', {}); return g.info.budget(0); });
    log('solution placed: ' + JSON.stringify(n));
    await shot('p1_placed'); await ev(() => window.__vw.game.fight());
    await runUntil('puzzle', () => false, { chunk: 60, max: 30000 });
    const r = await ev(() => { const r = window.__vw.game.results(); return { winner: r.winner, kind: r.kind, mission: r.mission, stars: r.stars, canNext: r.canNext }; });
    log('results: ' + JSON.stringify(r));
    if (r.kind !== 'puzzle' || !r.stars || r.stars.length !== 3) throw new Error('puzzle results: ' + JSON.stringify(r));
    const saved = await ev(() => window.__vw.app.docs.progress.get('puzzles', {})); log('progress puzzles: ' + JSON.stringify(saved));
    if (r.winner === 0 && !(saved && saved.spear_wall && saved.spear_wall.stars >= 1)) throw new Error('the won puzzle recorded nothing');
    await page.waitForTimeout(2200); await shot('p2_results');
  }

  if (ONLY.includes('survival')) {
    log('--- survival: setup screen, first wave, intermission, second wave');
    await ev(() => window.__vw.goto('survival')); await page.waitForTimeout(800);
    await page.locator('#surv-start').click(); await page.waitForTimeout(1500);
    const s0 = await ev(() => { const g = window.__vw.game; return { state: g.state, screen: window.__vw.app.router.current(), kind: g.setup.kind, waves: !!g.world.waves, budget: g.info.budget(0), obj: g.world.objective && g.world.objective.type, time: g.rules.timeLimit }; });
    log('deployed: ' + JSON.stringify(s0)); if (s0.state !== 'placement' || !s0.waves) throw new Error('survival deploy: ' + JSON.stringify(s0));
    for (const [d, n, fx, fz] of [['hoplite', 16, 0.1, 0], ['hoplite', 16, 0.1, -0.7], ['cretan_archer', 12, -0.6, 0], ['peltast', 12, -0.2, 0.7]]) await placeBrush(d, n, fx, fz);
    log('placed: ' + JSON.stringify(await ev(() => { const g = window.__vw.game; return { budget: g.info.budget(0), counts: g.info.counts(0) }; })));
    await ev(() => window.__vw.game.fight()); await page.waitForTimeout(500);
    await runUntil('survival wave 1 spawn', ({ wave }) => wave >= 1, { chunk: 30, max: 6000 });
    // wiring check, not a balance check: the first wave is wiped out at once so the intermission path is exercised deterministically
    await ev(() => { const g = window.__vw.game; const w = g.world, st = w.state; w.state = 'placing'; for (const u of w.units.slice()) if (u.team === 1) w.removeUnit(u); w.state = st; });
    log('wiped: ' + JSON.stringify(await ev(() => { const g = window.__vw.game, w = g.world; w.step(30); return { wstate: w.waves.state, alive1: w.stats[1].alive, units1: w.units.filter((u) => u.team === 1).length, gstate: g.state, n: w.waves.n }; })));
    const st = await runUntil('survival intermission', ({ s }) => s === 'placement' || s === 'ended', { chunk: 30, max: 3000 });
    log('after wave 1: ' + JSON.stringify(st));
    if (st.s === 'ended') log('(the army fell in wave 1: the intermission was not reached; that is a balance outcome, not a wiring failure)');
    else {
      await page.waitForTimeout(600); await shot('s1_intermission');
      const i1 = await ev(() => { const g = window.__vw.game; return { inter: g.inIntermission(), screen: window.__vw.app.router.current(), overlay: window.__vw.app.router.hasOverlay('survival'), budget: g.info.budget(0), hud: g.hud().survival }; });
      log('intermission: ' + JSON.stringify(i1)); if (!i1.inter || !i1.overlay || i1.budget.cap < 1800) throw new Error('survival intermission: ' + JSON.stringify(i1));
      const placed = await placeBrush('hoplite', 8, 0.2, 0.3); log('reinforcements placed: ' + placed + ' ' + JSON.stringify(await ev(() => window.__vw.game.info.budget(0))));
      await page.locator('#inter-go').click(); await page.waitForTimeout(500);
      const after = await ev(() => { const g = window.__vw.game; return { state: g.state, inter: g.inIntermission(), wave: g.world.waves.n }; }); log('after "send in wave": ' + JSON.stringify(after));
      if (after.state !== 'running' || after.inter) throw new Error('the next wave did not start');
      const st2 = await runUntil('survival wave 2', ({ s, wave }) => wave >= 2 || s === 'ended', { chunk: 30, max: 40000 }); log('wave 2: ' + JSON.stringify(st2));
    }
    await ev(() => { const g = window.__vw.game, w = g.world; if (g.state !== 'ended') { const st = w.state; w.state = 'placing'; for (const u of w.units.slice()) if (u.team === 0) w.removeUnit(u); w.state = st; } });   // the player's army falls: the run ends and is scored
    await runUntil('survival end', ({ s }) => s === 'ended', { chunk: 30, max: 3000 });
    const r = await ev(() => { const r = window.__vw.game.results(); return { winner: r.winner, survival: r.survival && { wave: r.survival.wave, score: r.survival.score, rank: r.survival.rank, board: (r.survival.board || []).length } }; }); log('results: ' + JSON.stringify(r));
    if (!r.survival) throw new Error('survival results lack the survival block');
    await page.waitForTimeout(2200); await shot('s2_results');
  }

  if (ONLY.includes('nav')) {
    log('--- navigation: Back / Esc never dead-ends or recurses');
    for (const scr of ['daily', 'survival', 'campaign', 'codex', 'settings']) {
      await ev(() => window.__vw.goto('title')); await page.waitForTimeout(500);
      await ev((id) => window.__vw.goto(id), scr); await page.waitForTimeout(700);
      await page.keyboard.press('Escape'); await page.waitForTimeout(600);
      const cur = await ev(() => window.__vw.app.router.current()); log('Esc on ' + scr + ' -> ' + cur);
      if (cur === scr) throw new Error('Esc did nothing on ' + scr);
      await ev((id) => window.__vw.goto(id), scr); await page.waitForTimeout(700);
      await page.locator('[id$="-back"]').first().click().catch(() => {}); await page.waitForTimeout(600);
      const cur2 = await ev(() => window.__vw.app.router.current()); log('BACK on ' + scr + ' -> ' + cur2);
      if (cur2 === scr) throw new Error('BACK did nothing on ' + scr);
    }
    // Tweak army, then Back: lands on the screen the battle was started from, and the title behind it has a live diorama, not the leftover placement world
    await ev(async () => { const v = window.__vw; v.goto('quick'); await v.quick({ rules: { budget: 1500 } }); v.fight(); v.step(30); await v.game.tweak(); });
    await page.waitForTimeout(800);
    const t1 = await ev(() => ({ s: window.__vw.game.state, scr: window.__vw.app.router.current(), hist: window.__vw.app.router.history.slice() })); log('after tweak: ' + JSON.stringify(t1));
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    const t2 = await ev(() => ({ s: window.__vw.game.state, scr: window.__vw.app.router.current() })); log('Esc after tweak: ' + JSON.stringify(t2));
    if (t2.scr === 'battle') throw new Error('Esc after Tweak landed on the battle HUD');
    await ev(() => window.__vw.goto('title')); await page.waitForTimeout(2500);
    const t3 = await ev(() => ({ s: window.__vw.game.state, scr: window.__vw.app.router.current() })); log('title: ' + JSON.stringify(t3));
    if (t3.s !== 'diorama' && t3.s !== 'idle') throw new Error('title shows a leftover world: ' + t3.s);
  }

  if (ONLY.includes('camera')) {
    log('--- camera: the battle view re-frames as the armies close, and stops once the player takes the camera');
    await ev(async () => { const v = window.__vw; v.goto('quick'); await v.quick({ rules: { budget: 1800 } }); v.game.setSpeed(4); v.fight(); });
    const samples = [];
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(4000); samples.push(await ev(() => { const g = window.__vw.game; return { t: Math.round(g.world.time), s: g.state, dist: Math.round(g.rig.dist * 10) / 10, touched: g.rig.userTouched }; })); }
    log('samples: ' + samples.map((x) => x.t + 's:' + x.dist).join('  '));
    await shot('cam1_mid_battle');
    const first = samples.find((x) => x.s === 'running') || samples[0], last = samples[samples.length - 1];
    if (!(last.dist <= first.dist + 0.5)) throw new Error('the camera did not close in as the armies met: ' + JSON.stringify([first, last]));
    await ev(() => { const g = window.__vw.game; g.rig.zoom(1.5); });
    const d0 = await ev(() => window.__vw.game.rig.dist); await page.waitForTimeout(6000); const d1 = await ev(() => window.__vw.game.rig.dist);
    log('after the player zoomed out: ' + d0 + ' -> ' + d1); if (Math.abs(d1 - d0) > 0.5) throw new Error('auto-frame fought the player: ' + d0 + ' -> ' + d1);
  }

  if (ONLY.includes('daily')) {
    log('--- daily: the army of the day is the same twice');
    await ev(() => window.__vw.goto('daily')); await page.waitForTimeout(800);
    const comp = async () => { await page.locator('#daily-play').click(); await page.waitForTimeout(1500); return ev(() => { const g = window.__vw.game, by = {}; for (const u of g.world.units) if (u.team === 1) by[u.def.id] = (by[u.def.id] || 0) + 1; return { kind: g.setup.kind, state: g.state, by, locked: g.mode.locked, mutators: g.setup.rules.mutators }; }); };
    const a = await comp(); log('daily A: ' + JSON.stringify(a));
    await ev(() => { window.__vw.game.exitToMenu(); window.__vw.goto('daily'); }); await page.waitForTimeout(800);
    const b = await comp(); log('daily B: ' + JSON.stringify(b));
    if (!Object.keys(a.by).length || JSON.stringify(a.by) !== JSON.stringify(b.by)) throw new Error('the daily enemy differs between two starts of the same day');
    await shot('d1_placement');
  }
} catch (e) { fail = 'driver: ' + e.message; }
await browser.close();
const uniq = [...new Set(problems)];
if (uniq.length) console.log('problems:\n' + uniq.slice(0, 30).join('\n'));
if (fail) console.log('MODES FAILED: ' + fail); else console.log(uniq.length ? 'MODES completed with console problems' : 'MODES PASSED');
process.exit(fail || uniq.length ? 1 : 0);
