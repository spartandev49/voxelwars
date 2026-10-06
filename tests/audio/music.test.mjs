// Music director on a mock context: mood choice per theme, 1.5 s cross-fades, loop handling (native loop points / 3 s equal-power
// cross-fade loop with no gap), intensity smoothing, decode-only-current+next, bridge + synth fallback, failure handling.
import assert from 'node:assert/strict';
import { runningEngine, makeEngine, sleep, tick, fixtureManifest } from './helpers.mjs';
import { LoopPlayer, intensityParams } from '../../src/audio/music.js';
import { makeFetch } from './mockctx.mjs';

const settle = async (ms = 40) => { await sleep(ms); };
const playing = (ctx) => ctx.sources.filter((s) => s.buffer && s.startT !== null);

// ---- before the context exists the request is remembered and applied after unlock
{
  const T = makeEngine({ gated: false, fetchOpts: { durOf: () => 8 } }); const { eng } = T;
  eng.music.setMood('menu'); assert.equal(eng.music.mood, 'menu'); assert.equal(eng.ctx, null);
  await eng.unlock(); await settle(80); assert.ok(eng.music.player, 'pending menu mood started after unlock'); assert.ok(/^menu_/.test(eng.music.track));
}

// ---- theme -> track, one track per battle, shuffle
{
  const { eng } = await runningEngine({ fetchOpts: { durOf: () => 8 } }); const m = eng.music;
  m.setMood('battle', { theme: 'barbarian' }); await settle(); assert.equal(m.track, 'battle_low_dark', 'dark theme -> dark drums'); const first = m.track;
  m.setMood('battle', { theme: 'carthage', force: true }); await settle(); assert.equal(m.track, 'battle_high_brass', 'carthage -> brass');
  m.setMood('battle', { theme: 'greek', force: true }); await settle(); assert.ok(['battle_mid_epic', 'battle_high_brass'].includes(m.track));
  const tracks = []; for (let i = 0; i < 6; i++) { m.setMood('battle', { theme: 'greek', force: true }); await settle(20); tracks.push(m.track); }
  for (let i = 1; i < tracks.length; i++) assert.notEqual(tracks[i], tracks[i - 1], 'no immediate repeat: ' + tracks.join(','));
  const before = m.track; m.setMood('battle', { theme: 'greek' }); await settle(20); assert.equal(m.track, before, 'same mood + theme does not restart');
  for (const [mood, re] of [['victory', /victory/], ['defeat', /defeat/], ['comedy', /comedy/], ['editor', /editor|menu/], ['menu', /menu/]]) { m.setMood(mood); await settle(); assert.ok(re.test(m.track) || m.source === 'synth', mood + ' -> ' + m.track); }
  m.setMood('title'); await settle(); assert.equal(m.mood, 'menu'); m.setMood('nonsense'); assert.equal(m.mood, 'menu', 'unknown moods are ignored');
}

// ---- cross-fade 1.5 s between moods; old player retired, gains equal-power-ish (sum of fades covers the span)
{
  const { eng } = await runningEngine({ fetchOpts: { durOf: () => 8 } }); const m = eng.music, ctx = eng.ctx;
  m.setMood('menu'); await settle(); const a = m.player; ctx.advance(2);
  const t0 = ctx.currentTime; m.setMood('battle', { theme: 'greek' }); await settle(); const b = m.player; assert.notEqual(a, b);
  assert.ok(Math.abs(a.g.gain.valueAt(t0 + 1.5)) < 0.01, 'old track fully out after 1.5 s'); assert.ok(a.g.gain.valueAt(t0 + 0.7) > 0.05 && a.g.gain.valueAt(t0 + 0.7) < 0.95, 'old track fading');
  assert.ok(b.g.gain.valueAt(t0) < 0.01 && Math.abs(b.g.gain.valueAt(t0 + 1.5) - b.base) < 0.01, 'new track fully in after 1.5 s');
  assert.ok(m.fading.length >= 1); ctx.advance(3); m.pump(); assert.equal(m.fading.length, 0, 'retired players are disposed'); assert.ok(m.fading.every((f) => f.dead));
  m.stop(0.5); await settle(20); assert.equal(m.mood, 'none'); assert.equal(m.track, null);
}

// ---- loop handling: loop:true -> native loop points; otherwise equal-power cross-fade loop starting 3 s before the end with no gap
{
  const { eng } = await runningEngine({ fetchOpts: { durOf: () => 8 } }); const m = eng.music, ctx = eng.ctx;
  m.setMood('battle', { theme: 'greek' }); await settle();
  // find a looped track (loop:true) and a non-looped one by forcing entries
  const cat = eng.catalog; const epic = cat.get('battle_mid_epic', 'music'), brass = cat.get('battle_high_brass', 'music');
  m.setMood('battle', { theme: 'x', force: true, entry: epic }); await settle(); let src = ctx.sources[ctx.sources.length - 1];
  assert.equal(src.loop, true); assert.equal(src.loopStart, 0); assert.equal(src.loopEnd, 8, 'native loop points from the ledger');
  m.setMood('battle', { theme: 'x', force: true, entry: brass }); await settle(); const p = m.player; assert.equal(p.loop, false);
  const startSrcs = ctx.sources.filter((s) => s.startT !== null).length;
  p.pump(0, 40);   // schedule cross-fade iterations covering the next 40 s
  const its = ctx.sources.filter((s) => s.startT !== null).slice(startSrcs - 1).filter((s) => s.buffer === p.buf).sort((a, b) => a.startT - b.startT);
  assert.ok(its.length >= 6, 'iterations scheduled: ' + its.length);
  for (let i = 1; i < its.length; i++) {
    const prevEnd = its[i - 1].startT + p.buf.duration, gap = its[i].startT - (prevEnd - 3);
    assert.ok(Math.abs(gap) < 1e-6, `iteration ${i} starts exactly 3 s before the previous one ends (gap ${gap})`);
    assert.ok(its[i].startT < prevEnd - 2.99, 'overlap >= 3 s means no silence at the seam (gap 0 ms <= 20 ms)');
  }
  // equal-power: at the middle of the seam both gains are ~0.707
  const mid = its[1].startT + 1.5, ga = its[0].out.values().next().value.gain.valueAt(mid), gb = its[1].out.values().next().value.gain.valueAt(mid);
  assert.ok(Math.abs(ga - Math.SQRT1_2) < 0.03 && Math.abs(gb - Math.SQRT1_2) < 0.03 && Math.abs(ga * ga + gb * gb - 1) < 0.05, `equal power at the seam: ${ga} ${gb}`);
  // a tail that is already faded out in the file is not faded a second time
  const baked = new LoopPlayer({ ctx, buf: p.buf, out: eng.buses.music.in, xf: 3, baked: true }); baked.start(ctx.currentTime, 0); baked.pump(ctx.currentTime, 12);
  const bs = ctx.sources.filter((s) => s.buffer === p.buf).slice(-3); assert.ok(bs.length >= 2);
  assert.ok(Math.abs(bs[0].out.values().next().value.gain.valueAt(ctx.currentTime + 6.5) - 1) < 1e-9, 'baked fade-out: previous iteration is not faded again');
  // the scheduler keeps going on its own while time passes (timer pump in the browser)
  const p2 = new LoopPlayer({ ctx, buf: p.buf, out: eng.buses.music.in, xf: 3 }); p2.start(ctx.currentTime, 0); p2.pump(ctx.currentTime, 4); const n1 = p2.n; ctx.advance(6); p2.pump(ctx.currentTime, 4); assert.ok(p2.n > n1, 'pump schedules more iterations as time advances'); ctx.advance(30); p2.pump(ctx.currentTime, 4); assert.ok(p2.iters.length <= 4, 'finished iterations are released: ' + p2.iters.length);
}

// ---- intensity: lowpass 1.8k..18k and gain -6..0 dB, smoothed over ~1.5 s (no jumps)
{
  const { eng } = await runningEngine({ fetchOpts: { durOf: () => 8 } }); const m = eng.music, ctx = eng.ctx;
  m.setMood('battle', { theme: 'greek' }); await settle(); m.setIntensity(0); ctx.advance(10);
  const f = m.filter.frequency, g = m.ig.gain; assert.ok(Math.abs(f.valueAt(ctx.currentTime) - 1800) < 5); assert.ok(Math.abs(g.valueAt(ctx.currentTime) - Math.pow(10, -6 / 20)) < 0.002);
  const t0 = ctx.currentTime; m.setIntensity(1);
  let prev = f.valueAt(t0), maxRel = 0, reached = null; for (let t = 0.01; t <= 3; t += 0.01) { const v = f.valueAt(t0 + t); assert.ok(v >= prev - 1e-6, 'monotonic'); maxRel = Math.max(maxRel, (v - prev) / 18000); prev = v; if (reached === null && v >= 1800 + 0.95 * (18000 - 1800)) reached = t; }
  assert.ok(maxRel < 0.03, 'smooth (max step ' + maxRel + ' of range per 10 ms)'); assert.ok(reached > 1.2 && reached < 1.8, '95% of the move in ~1.5 s: ' + reached);
  assert.ok(Math.abs(g.valueAt(t0 + 6) - 1) < 0.01); m.setIntensity(0.5); ctx.advance(10); assert.ok(Math.abs(f.valueAt(ctx.currentTime) - intensityParams(0.5).cutoff) < 20);
  m.setIntensity(9); assert.equal(m.intensity, 1); m.setIntensity(NaN); assert.equal(m.intensity, 1);
  // intensityFromWorld: fresh battle is calm, a late hot battle is intense; kills and hero events raise it
  const world = { time: 5, stats: [{ startCount: 150, alive: 150 }, { startCount: 150, alive: 150 }] }; const calm = m.intensityFromWorld(world, 10);
  m.tracker.reset(); for (let i = 0; i < 40; i++) m.note('unit_kill', {}, 10 + i * 0.1); m.note('hero_down', {}, 14); world.time = 90; world.stats = [{ startCount: 150, alive: 70 }, { startCount: 150, alive: 40 }];
  const hot = m.intensityFromWorld(world, 14.1); assert.ok(calm < 0.3 && hot > 0.7 && hot <= 1, `calm ${calm} hot ${hot}`);
  assert.equal(m.intensityFromWorld(null), m.intensity, 'no world -> unchanged');
}

// ---- memory: decode only the current + next track (cache never holds more than 2); mono downmix on the low tiers
{
  const { eng } = await runningEngine({ fetchOpts: { durOf: () => 8 }, quality: () => 'potato' }); eng.setQuality('potato'); const m = eng.music;
  for (const mood of ['menu', 'battle', 'victory', 'defeat', 'comedy', 'editor', 'battle']) { m.setMood(mood, { theme: 'greek', force: true }); await settle(25); assert.ok(m.cache.size <= 2, 'cache <= 2 after ' + mood + ': ' + m.cache.size); }
  assert.ok(m.decodedBytes > 0 && m.decodedBytes <= 2 * 8 * 22050 * 4 * 2 + 1000);
  const e = await m.prefetch('menu', ''); assert.ok(e && m.cache.has(e.id));
}

// ---- bridge: a slow track starts the synthesized bed, then cross-fades to the real track when it arrives; failure keeps the synth
{
  let release; const gate = new Promise((r) => { release = r; });
  const T = makeEngine({ gated: false, bridgeMs: 30, fetchOpts: { durOf: () => 8 } }); const orig = T.eng.fetchFn; T.eng.music.d.fetch = async (u) => { if (/menu_/.test(u)) await gate; return orig(u); };
  await T.eng.unlock(); const m = T.eng.music; m.setMood('menu'); await settle(120);
  assert.equal(m.source, 'synth', 'bridge synth while the real track is slow'); assert.ok(m.synthFlag && m.player);
  release(); await settle(120); assert.equal(m.source, 'fetched', 'real track takes over'); assert.ok(/^menu_/.test(m.track));
  assert.ok(m.diag === undefined);
  const T2 = makeEngine({ gated: false, fetchOpts: { block: true } }); await T2.eng.unlock(); T2.eng.music.setMood('menu'); await settle(150);
  assert.equal(T2.eng.music.source, 'synth'); assert.ok(T2.eng.diagnostics().loaded.synth >= 1 && T2.eng.diagnostics().loaded.failed >= 1, 'music load failure is flagged: ' + JSON.stringify(T2.eng.diagnostics().loaded));
  const T3 = makeEngine({ gated: false, manifest: { sfx: [], music: [] } }); await T3.eng.unlock(); T3.eng.music.setMood('battle', { theme: 'egypt' }); await settle(100); assert.equal(T3.eng.music.source, 'synth'); assert.equal(T3.eng.music.track, 'synth:battle');
  assert.ok(T3.eng.ctx.sources.some((s) => s.loop && s.buffer && s.buffer.numberOfChannels === 2), 'synth bed is a stereo native loop');
}

// ---- embedded music track (core:true) plays without fetch
{
  const man = JSON.parse(JSON.stringify(fixtureManifest())); man.music.find((e) => e.id === 'battle_mid_epic').core = true;
  const { writeWav, sine } = await import('./wav.mjs'); const b64 = writeWav([sine(200, 2), sine(300, 2)], 22050).toString('base64');
  const T = makeEngine({ gated: false, manifest: man, core: { battle_mid_epic: b64 }, fetchOpts: { block: true } }); await T.eng.unlock(); T.eng.music.setMood('battle', { theme: 'greek', entry: T.eng.catalog.get('battle_mid_epic', 'music') }); await settle(80);
  assert.equal(T.eng.music.source, 'embedded'); assert.equal(T.fetch.calls.length === 0 || !T.fetch.calls.some((u) => /battle_mid_epic/.test(u)), true, 'no fetch for the embedded track'); assert.equal(T.eng.diagnostics().loaded.embedded >= 1, true);
}
console.log('music.test OK');
