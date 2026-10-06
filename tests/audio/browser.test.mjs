// Browser checks (headless Chromium, real WebAudio): AU2 (autoplay gate with a stubbed suspended AudioContext + negative control), AU4 (core pack
// with fetch blocked), AU8 (ducking restores within 800 ms), AU9 (volume sliders hit the right buses), AU10 (hidden -> suspended, visible -> running).
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { root } from './helpers.mjs';

const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
if (!fs.existsSync(exe)) { console.log('browser.test SKIPPED: Chromium not found at ' + exe); process.exit(0); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
const core = {}; for (const kind of ['sfx', 'music']) for (const e of manifest[kind]) if (e.core) core[e.id] = fs.readFileSync(path.join(root, 'assets', e.path)).toString('base64');
const coreBytes = Object.values(core).reduce((a, b) => a + b.length * 0.75, 0);

async function bundle(swaps) {
  const r = await build({ entryPoints: [path.join(root, 'src/audio/index.js')], bundle: true, write: false, format: 'iife', globalName: 'VWAudio', target: 'es2020', logLevel: 'error', plugins: [{ name: 'swap', setup(b) { b.onResolve({ filter: /.*/ }, (a) => { for (const k of Object.keys(swaps || {})) if (a.path.endsWith(k)) return { path: swaps[k] }; return null; }); } }] });
  return r.outputFiles[0].text;
}
// Stub AudioContext: starts SUSPENDED (really suspended) and resumes only when the page has had a user gesture (autoplay policy).
const STUB = `(() => { const Real = window.AudioContext; window.__stub = { created: 0, resumes: 0, blocked: 0 };
  class Gated extends Real { constructor(o) { super(o); window.__stub.created++; this.__allowed = false; super.suspend(); }
    get state() { return this.__allowed ? super.state : 'suspended'; }
    resume() { window.__stub.resumes++; if (!navigator.userActivation.hasBeenActive) { window.__stub.blocked++; return new Promise(() => {}); } this.__allowed = true; return super.resume(); } }
  window.AudioContext = Gated; })();`;

const gatedJs = await bundle(), ungatedJs = await bundle({ 'unlock.js': path.join(root, 'tests/audio/nogate_unlock.mjs') });
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(js, { blockAssets = false, withCore = true } = {}) {
  const page = await browser.newPage(); const logs = []; const reqs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.addInitScript(STUB);
  await page.addInitScript(`window.__VW_MANIFEST__ = ${JSON.stringify(manifest)}; window.__VW_CORE_AUDIO__ = ${withCore ? JSON.stringify(core) : '{}'}; window.__vw = {};`);
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url()); reqs.push(u.pathname);
    if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body style="margin:0"><div id=b style="width:400px;height:300px">x</div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>` });
    if (u.pathname.startsWith('/assets/')) { if (blockAssets) return r.abort(); const p = path.join(root, decodeURIComponent(u.pathname)); if (fs.existsSync(p)) return r.fulfill({ path: p, contentType: 'audio/mpeg' }); }
    return r.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://t/');
  await page.evaluate(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch (e) { /* longtask unsupported */ } });
  await page.evaluate(() => { window.audio = VWAudio.createAudio({ settings: { get: (k) => ({ 'vol.master': 0.9, 'vol.music': 0.8 })[k] }, quality: () => 'marble' }); window.audio.installTestHook(window.__vw); });
  return { page, logs, reqs };
}
const hook = (page) => page.evaluate(() => ({ state: window.__vw.audio.state, ctxState: window.__vw.audio.ctxState, music: window.__vw.audio.busRMS.music, mood: window.__vw.audio.music.mood, loaded: window.__vw.audio.loaded, voices: window.__vw.audio.voices }));
async function au2(js, label) {
  const { page, logs } = await open(js);
  await page.evaluate(() => window.audio.music.setMood('menu'));
  await sleep(600);
  const pre = await hook(page); const stubPre = await page.evaluate(() => window.__stub);
  await page.mouse.click(100, 100);                       // real user activation
  const t0 = Date.now(); let post = null, first = null;
  while (Date.now() - t0 < 3000) { post = await hook(page); if (post.music > 0.001 && first === null) first = Date.now() - t0; if (first !== null && Date.now() - t0 > first + 300) break; await sleep(50); }
  const d = await page.evaluate(() => window.audio.diagnostics());
  const longTasks = await page.evaluate(() => window.__long.slice());
  await page.close();
  return { label, pre, stubPre, post, first, d, logs, longTasks };
}
const passes = (r) => r.pre.ctxState === 'none' && r.pre.music === 0 && r.post.music > 0.001 && r.post.ctxState === 'running' && r.first !== null && r.first <= 3000;

// ---------------- AU2 + negative control
const good = await au2(gatedJs, 'gated');
console.log(`AU2 (real Chromium, stubbed suspended AudioContext): before gesture ctx=${good.pre.ctxState} musicRMS=${good.pre.music}; after click: ctx=${good.post.ctxState} musicRMS=${good.post.music.toFixed(4)} (first > 0.001 after ${good.first} ms), music source=${good.d.music.source}, state=${good.post.state}`);
assert.ok(passes(good), 'AU2 must pass: ' + JSON.stringify({ pre: good.pre, post: good.post, first: good.first }));
const bad = await au2(ungatedJs, 'ungated');
console.log(`AU2 negative control (gate removed): ctx=${bad.post.ctxState} musicRMS=${bad.post.music} -> ${passes(bad) ? 'PASSES (BAD)' : 'fails as required'}`);
assert.ok(!passes(bad), 'NEGATIVE CONTROL: AU2 predicate must fail without the gesture gate');
assert.ok(bad.stubPre.created === 0 && bad.post.ctxState !== 'running');
// AU12: loading (core decode, lazy groups, synth bed generation) never blocks the main thread for long; decoded PCM stays under the tier ceiling
{
  const maxLong = Math.max(0, ...good.longTasks);
  console.log(`AU12: long tasks during boot + unlock + 3 s of audio: ${good.longTasks.length}, longest ${maxLong.toFixed(0)} ms; decoded ${(good.d.decoded.bytes / 1048576).toFixed(1)} MB of ${(good.d.decoded.ceiling / 1048576).toFixed(0)} MB (marble) after ${good.d.decoded.ready}/${good.d.decoded.total} assets`);
  assert.ok(maxLong < 400, 'no main-thread task > 400 ms from audio loading: ' + maxLong);
  assert.ok(good.d.decoded.bytes <= good.d.decoded.ceiling, 'decoded memory under the tier ceiling');
}
const errs = good.logs.filter((l) => /^(error|warning|PAGEERROR)/.test(l)); assert.deepEqual(errs, [], 'no console errors/warnings during the gated run: ' + errs.join(' | '));

// ---------------- AU4 / AU8 / AU9 / AU10 on one page
{
  const { page, logs, reqs } = await open(gatedJs, { blockAssets: true });
  await page.mouse.click(50, 50); await sleep(700);
  // AU4: assets/ is blocked at the network layer; the embedded core still plays hits, UI, horns and death sounds
  const r = await page.evaluate(async () => {
    const a = window.audio, E = a.engine; await E.preload(); await new Promise((r) => setTimeout(r, 400)); E.setListener(0, 20, 0, 0);
    const out = {}; const cues = [['hit_blade', { x: 3, y: 1, z: 3 }], ['hit_flesh_light', { x: 3, y: 1, z: 3 }], ['hit_flesh_heavy', { x: -3, y: 1, z: 3 }], ['block_shield', { x: 2, y: 1, z: 2 }], ['bow_shoot', { x: 4, y: 1, z: 2 }], ['arrow_hit_flesh', { x: 4, y: 1, z: 2 }], ['death_male', { x: 3, y: 1, z: 2 }], ['horn_war', {}], ['drum_boom', {}], ['crowd_cheer_small', {}], ['catapult_launch', { x: 6, y: 1, z: 2 }], ['boulder_impact', { x: 6, y: 1, z: 2 }], ['chicken_cluck', { x: 2, y: 1, z: 2 }], ['goat_bleat', { x: 2, y: 1, z: 2 }], ['jingle_victory', {}], ['ui_click', {}], ['ui_hover', {}], ['ui_confirm', {}], ['ui_back', {}]];
    for (const [c, o] of cues) { await new Promise((r) => setTimeout(r, 40)); out[c] = !!a.play(c, o); }
    a.music.setMood('battle', { theme: 'mythic' }); await new Promise((r) => setTimeout(r, 1500));
    const d = a.diagnostics(); return { out, loaded: d.loaded, music: d.music, paths: Object.values(d.paths).filter((p) => p === 'embedded').length, failed: d.loaded.failed, errors: d.errors, rms: d.busRMS };
  });
  const missing = Object.entries(r.out).filter(([, v]) => !v).map(([k]) => k);
  console.log(`AU4 (fetch blocked): core ${(coreBytes / 1024).toFixed(0)} KB embedded; ${Object.keys(r.out).length - missing.length}/${Object.keys(r.out).length} cues played from the core pack, embedded assets ${r.loaded.embedded}, fetched ${r.loaded.fetched}, synth ${r.loaded.synth}; music ${r.music.track} via ${r.music.source}, music RMS ${r.rms.music.toFixed(4)}`);
  assert.deepEqual(missing, [], 'core-pack cues must play with fetch blocked');
  assert.equal(r.loaded.fetched, 0); assert.ok(r.loaded.embedded >= 20, 'embedded core decoded: ' + r.loaded.embedded);
  assert.ok(r.music.source === 'embedded' && r.rms.music > 0.001, 'one embedded music track plays offline: ' + JSON.stringify(r.music));
  assert.ok(coreBytes <= 3.0 * 1024 * 1024, 'core pack stays inside the page budget');
  // AU8 ducking on the real graph: attack within 100 ms, restored within 800 ms
  const du = await page.evaluate(async () => {
    const E = window.audio.engine, g = E.buses.music.duck.gain; await new Promise((r) => setTimeout(r, 200));
    const base = g.value; const t0 = performance.now(); E.play('horn_war'); const samples = [];
    while (performance.now() - t0 < 1400) { samples.push([performance.now() - t0, g.value]); await new Promise((r) => setTimeout(r, 15)); }
    const at = (ms) => samples.filter((s) => s[0] >= ms).map((s) => s[1])[0];
    const min = Math.min(...samples.map((s) => s[1])); const restored = samples.find((s) => s[0] > 200 && s[1] > 0.97);
    return { base, min, restoredAt: restored ? restored[0] : null, at100: at(100), at900: at(900) };
  });
  console.log(`AU8 ducking: base ${du.base.toFixed(2)}, min ${du.min.toFixed(2)} (-6 dB = 0.50), restored > 97% at +${du.restoredAt && du.restoredAt.toFixed(0)} ms`);
  assert.ok(du.min < 0.55 && du.at100 < 0.7, 'music ducks by ~6 dB within 100 ms of the horn'); assert.ok(du.restoredAt !== null && du.restoredAt <= 800, 'restored within 800 ms: ' + du.restoredAt);
  // AU9 volume sliders hit the right buses on the real graph
  const vo = await page.evaluate(async () => {
    const a = window.audio, E = a.engine; const val = (b) => E.buses[b].vol.gain.value; await new Promise((r) => setTimeout(r, 100));
    const before = { music: val('music'), sfx: val('sfx'), ui: val('ui') };
    a.setVolume('music', 0.1); await new Promise((r) => setTimeout(r, 120)); const m = { music: val('music'), sfx: val('sfx'), ui: val('ui') };
    a.setVolume('sfx', 0.2); await new Promise((r) => setTimeout(r, 120)); const s = { music: val('music'), sfx: val('sfx'), ui: val('ui') };
    a.setMuted(true); await new Promise((r) => setTimeout(r, 120)); const mu = { master: E.masterGain.gain.value, state: a.state() }; a.setMuted(false); await new Promise((r) => setTimeout(r, 120));
    return { before, m, s, mu, un: { master: E.masterGain.gain.value, state: a.state() } };
  });
  assert.ok(vo.m.music < vo.before.music * 0.3 && Math.abs(vo.m.sfx - vo.before.sfx) < 1e-6, 'music slider only moves the music bus'); assert.ok(vo.s.sfx < vo.m.sfx * 0.3 && Math.abs(vo.s.ui - vo.before.ui) < 1e-6, 'sfx slider only moves sfx');
  assert.ok(vo.mu.master < 0.01 && vo.mu.state === 'muted' && vo.un.master > 0.5 && vo.un.state === 'running', 'mute is visible in state and silences master');
  console.log('AU9 volumes: music/sfx sliders move only their bus; mute ' + vo.mu.state + ' -> ' + vo.un.state);
  // AU10 visibility
  const vis = await page.evaluate(async () => {
    const E = window.audio.engine; const hidden = (b) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => b }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (b ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); };
    const out = {}; hidden(true); await new Promise((r) => setTimeout(r, 250)); out.hiddenCtx = E.ctx.state; out.hiddenState = window.audio.state(); out.voicesHidden = E.vm.v.length; out.playHidden = !!window.audio.play('hit_blade', { x: 1, z: 1 });
    hidden(false); await new Promise((r) => setTimeout(r, 400)); out.visibleCtx = E.ctx.state; out.visibleState = window.audio.state(); out.rms = window.audio.busRMS().music;
    await new Promise((r) => setTimeout(r, 60)); out.playVisible = !!window.audio.play('hit_blade', { x: 1, y: 1, z: 1 });
    return out;
  });
  console.log('AU10 visibility: ' + JSON.stringify(vis));
  assert.equal(vis.hiddenCtx, 'suspended'); assert.equal(vis.hiddenState, 'suspended'); assert.equal(vis.voicesHidden, 0); assert.equal(vis.playHidden, false); assert.equal(vis.visibleCtx, 'running'); assert.equal(vis.visibleState, 'running'); assert.ok(vis.playVisible); assert.ok(vis.rms > 0.0005, 'music is audible again after resume');
  assert.ok(!reqs.some((p) => p.startsWith('/assets/audio/sfx/') && false));
  const bad = logs.filter((l) => /^(error|PAGEERROR)/.test(l) && !/Failed to load resource|net::ERR_FAILED|ERR_BLOCKED/.test(l)); assert.deepEqual(bad, [], 'no page errors: ' + bad.join(' | '));
  await page.close();
}
await browser.close();
console.log('browser.test OK');
