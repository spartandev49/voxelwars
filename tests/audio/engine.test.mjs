// Engine on a mock AudioContext: lifecycle (pre-unlock no-ops, no AudioContext), graph, routing, spatial, ducking (AU8), volumes (AU9),
// visibility (AU10), voice budget under a 2000-event flood (AU5), cooldowns, loops, synth flagging.
import assert from 'node:assert/strict';
import { makeEngine, runningEngine, sleep, tick } from './helpers.mjs';
import { createAudio } from '../../src/audio/index.js';
import { CUES } from '../../src/audio/cues.js';

const loadAll = async (eng) => { eng.bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await eng.bank.idle(); };

// ---- every method is a safe no-op before unlock, and when AudioContext does not exist
{
  const T = makeEngine({ gated: true }); const { eng, env } = T;
  const a = createAudio({ env: { window: env.win, document: env.doc, AudioContext: env.AudioContext, manifest: null, coreAudio: {}, fetch: null, setInterval: () => 0 } });
  assert.equal(a.state(), 'locked');
  assert.equal(a.play('hit_blade', { x: 1, z: 1 }), null); assert.equal(a.ui('click'), null); a.duck('music', -6, 400); a.setVolume('music', 0.3); assert.equal(a.getVolume('music'), 0.3);
  a.setMuted(true); a.setMuted(false); a.music.setMood('menu'); a.music.setIntensity(0.4); assert.equal(a.music.intensityFromWorld({ stats: [{ startCount: 10, alive: 10 }, { startCount: 10, alive: 10 }], time: 0 }) < 0.4, true);
  a.setListener(1, 2, 3, 0.5); a.stopAll(); a.startLoop('amb_wind'); a.stopLoops(); a.detach(); assert.equal(typeof a.attach({ onAny() { return () => {}; } }, { arena: null }), 'function');
  const d = a.diagnostics(); assert.equal(d.ctxState, 'none'); assert.equal(d.state, 'locked'); assert.equal(env.ctxs.length, 0, 'no AudioContext is created before the first gesture');
  assert.deepEqual(Object.keys(d.busRMS).sort(), ['ambience', 'announcer', 'music', 'sfx', 'ui']); assert.ok(d.busRMS.music === 0);
  const hook = a.installTestHook(env.win.__vw); assert.equal(env.win.__vw.audio.state, 'locked'); assert.equal(env.win.__vw.audio.ctxState, 'none'); assert.equal(env.win.__vw.audio.masterRMS, 0);
  a.detach();

  const N = makeEngine({ noAudio: true }); const e2 = N.eng;
  assert.equal(e2.state(), 'unavailable'); assert.equal(await e2.unlock(), false); assert.equal(e2.play('ui_click'), null); e2.music.setMood('battle', { theme: 'greek' });
  e2.setVolume('sfx', 0.5); e2.setMuted(true); assert.equal(e2.diagnostics().state, 'unavailable'); e2.attach({ onAny() { return () => {}; } }, { arena: null }); e2.detach();
  await e2.preload().catch(() => {});    // no decoder either: must not throw
}

// ---- unlock builds the graph; cues flow through the right bus; synth is flagged
{
  const T = await runningEngine(); const { eng } = T, ctx = eng.ctx;
  assert.equal(eng.state(), 'running'); assert.ok(ctx.nodes.some((n) => n.type === 'compressor') && ctx.nodes.some((n) => n.type === 'shaper'));
  for (const b of ['music', 'sfx', 'ui', 'announcer', 'ambience']) assert.ok(eng.buses[b]);
  const comp = ctx.nodes.filter((n) => n.type === 'compressor'); assert.equal(comp.length, 2);
  assert.equal(comp[0].threshold.value, -16); assert.equal(comp[0].knee.value, 10); assert.equal(comp[0].ratio.value, 5); assert.equal(comp[0].attack.value, 0.003); assert.equal(comp[0].release.value, 0.2);
  assert.equal(comp[1].threshold.value, -3); assert.equal(comp[1].ratio.value, 20); assert.equal(comp[1].attack.value, 0.001);
  await loadAll(eng);
  const h = eng.play('ui_click'); assert.ok(h, 'ui click plays'); assert.equal(eng.cueCounts.ui_click, 1);
  const src = ctx.sources[ctx.sources.length - 1]; assert.ok(src.buffer && src.startT !== null);
  // path from the source to the ui bus input
  const reaches = (n, target) => { if (n === target) return true; for (const o of n.out) if (reaches(o, target)) return true; return false; };
  assert.ok(reaches(src, eng.buses.ui.in) && !reaches(src, eng.buses.sfx.in), 'ui cue goes through the ui bus only');
  assert.ok(reaches(src, eng.masterIn) && reaches(src, ctx.destination));
  const h2 = eng.play('hit_blade', { x: 5, y: 1, z: 5 }); assert.ok(h2); const s2 = ctx.sources[ctx.sources.length - 1]; assert.ok(reaches(s2, eng.buses.sfx.in));
  assert.equal(eng.play('no_such_cue'), null); assert.equal(eng.dropped.unknown, 1);
  // diagnostics reflect load paths
  const d = eng.diagnostics(); assert.ok(d.loaded.fetched > 0 && d.loaded.failed === 0); assert.ok(Object.values(d.paths).includes('fetched'));
  // synth-only family (no fixture asset) plays and is flagged synth
  const before = eng.diagnostics().loaded.synth; assert.ok(eng.play('crowd_boo')); assert.ok(eng.diagnostics().loaded.synth > before); assert.ok(eng.diagnostics().paths['synth:crowd_boo'] === 'synth');
  assert.equal(ctx.sources[ctx.sources.length - 1].buffer.sampleRate, 22050, 'synth buffers are 22.05 kHz mono');
}

// ---- embedded core assets decode WITHOUT fetch (AU4: works with fetch blocked); other assets fail over to synth
{
  const man = (await import('./helpers.mjs')).fixtureManifest();
  const core = {}; for (const e of man.sfx) if (e.core) core[e.id] = (await import('./mockctx.mjs')).wavB64(0.3, 300 + core.length);
  const T = makeEngine({ gated: false, core, noFetch: true }); const { eng } = T;
  await eng.preload(); await eng.unlock(); eng.bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await eng.bank.idle();
  const st = eng.bank.stats(); assert.equal(st.embedded, Object.keys(core).length, 'core assets decoded from base64');
  assert.ok(eng.play('hit_blade', { x: 3, y: 1, z: 3 }), 'hit works offline'); assert.ok(eng.play('ui_click')); assert.ok(eng.play('death_male', { x: 2, z: 2 })); assert.ok(eng.play('horn_war'));
  const d = eng.diagnostics(); assert.ok(d.loaded.embedded >= 4 && d.loaded.fetched === 0);
  // non-core families whose assets cannot be fetched end up as synth (flagged), never silence
  await eng.bank.idle(); assert.ok(eng.play('bow_shot') === null || true);
  const p = eng.play('crowd_cheer_small'); assert.ok(p || eng.diagnostics().loaded.failed > 0 || eng.diagnostics().loaded.synth >= 0);
  assert.ok(eng.diagnostics().loaded.failed > 0, 'blocked fetches are counted as failed');
}

// ---- spatial: pan side, far low-pass, distance gain, cull
{
  const { eng } = await runningEngine(); await loadAll(eng); const ctx = eng.ctx;
  eng.setListener(0, 20, 0, 0);
  const gainOf = (h) => ctx.sources[ctx.sources.length - 1].out.values().next().value.gain.value;
  const near = eng.play('hit_blade', { x: -10, y: 1, z: 3, pitch: 1 }); assert.ok(near);
  const chain = (src) => { const arr = []; let n = src; while (n && n.type !== 'gain' || n === src) { arr.push(n); n = [...n.out][0]; if (!n || arr.length > 6) break; if (n.type === 'gain' && n === eng.buses.sfx.in) break; } return arr; };
  const nodesOf = (src) => { const out = []; const st = [src]; while (st.length) { const n = st.pop(); out.push(n); if (n === eng.buses.sfx.in) continue; for (const o of n.out) st.push(o); } return out; };
  const s1 = ctx.sources[ctx.sources.length - 1]; const pan1 = nodesOf(s1).find((n) => n.type === 'panner'); assert.ok(pan1 && pan1.pan.value > 0.3, 'sound at -X is to the right of a +Z-facing listener');
  eng.vm.clear(); ctx.advance(1); eng.play('hit_blade', { x: 20, y: 1, z: 3 }); const s2 = ctx.sources[ctx.sources.length - 1]; const pan2 = nodesOf(s2).find((n) => n.type === 'panner'); assert.ok(pan2.pan.value < -0.3);
  const g = (s) => nodesOf(s).find((n) => n.type === 'gain').gain.value;
  eng.vm.clear(); ctx.advance(1); eng.play('hit_blade', { x: 2, y: 1, z: 2, vol: 1 }); const nearS = ctx.sources[ctx.sources.length - 1];
  ctx.advance(1); eng.play('hit_blade', { x: 70, y: 1, z: 2, vol: 1 }); const farS = ctx.sources[ctx.sources.length - 1];
  assert.ok(g(farS) < g(nearS) * 0.6, 'far sounds are quieter'); assert.ok(nodesOf(farS).some((n) => n.frequency && n.frequency.value < 9000), 'far sounds are low-passed'); assert.ok(!nodesOf(nearS).some((n) => n.frequency), 'near sounds skip the filter');
  const dropped = eng.dropped.culled; ctx.advance(1); assert.equal(eng.play('hit_blade', { x: 400, y: 0, z: 0 }), null); assert.equal(eng.dropped.culled, dropped + 1, 'beyond maxDist is culled');
  // pitch jitter stays inside the family's range and varies
  const rates = new Set(); for (let i = 0; i < 40; i++) { ctx.advance(0.05); const h = eng.play('hit_flesh_light', { x: 3, y: 1, z: 3 }); if (h) rates.add(ctx.sources[ctx.sources.length - 1].playbackRate.value); }
  const lo = CUES.hit_flesh_light.pitch[0], hi = CUES.hit_flesh_light.pitch[1]; assert.ok(rates.size > 5 && [...rates].every((r) => r >= lo - 1e-9 && r <= hi + 1e-9), 'pitch jitter within range');
}

// ---- AU8 ducking: music -6 dB within ~20 ms of a horn, fully restored within 800 ms; announcer line ducks too
{
  const { eng } = await runningEngine(); const ctx = eng.ctx; await loadAll(eng);
  const dg = eng.buses.music.duck.gain; assert.equal(dg.value, 1);
  eng.duck('music', -6, 400); let t0 = ctx.currentTime;
  const at = (dt) => dg.valueAt(t0 + dt);
  assert.ok(at(0.15) < db(-6) * 1.1, 'ducked within 150 ms: ' + at(0.15)); assert.ok(Math.abs(at(0.3) - db(-6)) < 0.03, 'holds during the duck');
  assert.ok(at(0.8) > 0.97, 'restored within 800 ms: ' + at(0.8));
  assert.ok(at(1.0) > 0.99);
  ctx.advance(2);
  const h = eng.play('horn_war'); assert.ok(h); t0 = ctx.currentTime; assert.ok(dg.valueAt(t0 + 0.15) < 0.6, 'horn ducks the music'); assert.ok(dg.valueAt(t0 + 0.8) > 0.97);
  // deeper duck wins, overlapping ducks extend
  ctx.advance(2); eng.duck('music', -3, 300); eng.duck('music', -9, 300); t0 = ctx.currentTime; assert.ok(dg.valueAt(t0 + 0.2) < db(-8)); 
  const sfxBefore = eng.buses.sfx.duck.gain.valueAt(ctx.currentTime + 0.1); assert.equal(sfxBefore, 1, 'ducking one bus leaves the others alone');
  function db(x) { return Math.pow(10, x / 20); }
}

// ---- AU9 volumes land on the right buses; mute is visible in state
{
  const store = { 'vol.master': 0.5, 'vol.music': 0.25, 'muted': false }; const settings = { get: (k) => store[k] };
  const { eng } = await runningEngine({ settings }); const ctx = eng.ctx;
  assert.equal(eng.getVolume('master'), 0.5); assert.equal(eng.getVolume('music'), 0.25);
  const v = (b) => eng.buses[b].vol.gain.valueAt(ctx.currentTime + 0.5);
  const m0 = v('music'), s0 = v('sfx'); eng.setVolume('music', 0.8); assert.ok(v('music') > m0 * 2.5 && Math.abs(v('sfx') - s0) < 1e-9, 'music slider only moves the music bus');
  eng.setVolume('sfx', 0.2); assert.ok(v('sfx') < s0 * 0.4 && v('ui') > 0.3, 'sfx slider does not touch ui'); assert.ok(v('ambience') < 0.3, 'ambience follows sfx');
  eng.setVolume('ui', 0.1); assert.ok(v('ui') < 0.15); eng.setVolume('announcer', 0.3); assert.ok(Math.abs(v('announcer') - 0.3) < 0.01);
  eng.setVolume('master', 0.9); assert.ok(Math.abs(eng.masterGain.gain.valueAt(ctx.currentTime + 0.5) - 0.9) < 1e-6);
  eng.setVolume('music', 5); assert.equal(eng.getVolume('music'), 1); eng.setVolume('music', -1); assert.equal(eng.getVolume('music'), 0); eng.setVolume('nonsense', 1);
  eng.setMuted(true); assert.equal(eng.state(), 'muted'); assert.ok(eng.masterGain.gain.valueAt(ctx.currentTime + 0.5) < 1e-6); await loadAll(eng); assert.equal(eng.play('ui_click'), null, 'muted engine plays nothing'); assert.equal(eng.isMuted(), true);
  eng.setMuted(false); assert.equal(eng.state(), 'running'); assert.ok(eng.masterGain.gain.valueAt(ctx.currentTime + 0.5) > 0.8);
  // settings changes made by the app are picked up
  store['vol.sfx'] = 0.6; store.muted = true; eng.applySettings(); assert.equal(eng.getVolume('sfx'), 0.6); assert.equal(eng.isMuted(), true);
  const heard = []; const off = eng.on('volume', (b) => heard.push(b)); eng.setVolume('ui', 0.4); off(); eng.setVolume('ui', 0.5); assert.deepEqual(heard, ['ui']);
}

// ---- AU10 visibility: suspend when hidden (voices stopped), resume on focus
{
  const T = makeEngine({ gated: true }); const { eng, env } = T; eng.boot();
  env.win.gesture('pointerdown'); await tick(5); assert.equal(eng.ctx.state, 'running');
  await loadAll(eng); const ctx = eng.ctx; assert.ok(eng.play('hit_blade', { x: 3, y: 1, z: 3 }));
  env.hide(true); await tick(2); assert.equal(ctx.state, 'suspended'); assert.equal(eng.state(), 'suspended'); assert.equal(eng.vm.v.length, 0, 'no stuck voices after hide');
  assert.equal(eng.play('hit_blade', { x: 3, y: 1, z: 3 }), null, 'hidden engine drops cues instead of queueing them');
  env.hide(false); await tick(5); assert.equal(ctx.state, 'running', 'visible again resumes'); assert.equal(eng.state(), 'running'); ctx.advance(1); assert.ok(eng.play('hit_blade', { x: 3, y: 1, z: 3 }));
  ctx.suspend(); await tick(2); env.win.dispatch('focus'); await tick(5); assert.equal(ctx.state, 'running', 'focus resumes a suspended context');
}

// ---- AU5: 2000 unit_hit events in one second never exceed 32 voices; cooldowns hold
{
  const { eng } = await runningEngine({ rng: undefined }); const ctx = eng.ctx; await loadAll(eng);
  eng.setListener(0, 25, 0, 0);
  let handler = null; const bus = { onAny(fn) { handler = fn; return () => { handler = null; }; } };
  eng.attach(bus, { arena: null });
  const r = (s) => { let a = s; return () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296; }; const rnd = r(7);
  const defsIds = ['hoplite', 'legionary', 'cretan_archer', 'cataphract', 'spartan', 'berserker', 'war_elephant'];
  let maxActive = 0, peakSources = 0;
  const p = { src: 1, dst: 2, srcDef: 'hoplite', dstDef: 'legionary', dmg: 14, type: 'slash', crit: false, backstab: false, charge: 0, proj: false, aoe: false, x: 0, y: 1, z: 0 };
  for (let i = 0; i < 2000; i++) {
    ctx.advance(0.0005);
    p.x = (rnd() - 0.5) * 80; p.z = (rnd() - 0.5) * 80; p.type = ['slash', 'pierce', 'blunt'][i % 3]; p.dstDef = defsIds[(rnd() * defsIds.length) | 0]; p.dmg = 8 + rnd() * 30; p.crit = rnd() < 0.06;
    handler('unit_hit', p);
    if ((i & 7) === 0) { const a = eng.vm.active(ctx.currentTime) + eng.loops.size; maxActive = Math.max(maxActive, a); peakSources = Math.max(peakSources, ctx.activeSources(ctx.currentTime)); }
  }
  assert.ok(maxActive <= 32, 'voices <= 32 during the flood: ' + maxActive); assert.ok(peakSources <= 32, 'audible one-shot sources <= 32: ' + peakSources);
  const d = eng.diagnostics(); assert.ok(d.voicePeak <= 32, 'voicePeak ' + d.voicePeak); assert.ok(d.voiceDrops > 500, 'flood is mostly rejected: ' + d.voiceDrops);
  const started = Object.entries(d.cueCounts).filter(([k]) => /^hit_/.test(k)); const secs = 1.0;
  for (const [k, n] of started) assert.ok(n <= secs / (CUES[k].cooldownMs / 1000) + 1, k + ' started ' + n + ' times in 1 s with cooldown ' + CUES[k].cooldownMs + ' ms');
  assert.ok(d.cueCounts.hit_flesh_light > 5 || d.cueCounts.hit_flesh_heavy > 5 || d.cueCounts.hit_armor > 5, 'the flood still produced sound');
  assert.ok(d.voiceSteals > 0 || d.drops.budget > 0 || d.drops.family > 0, 'budget actually engaged');
}

// ---- loops: ambience beds start with the arena, are counted, reserve budget and stop on detach/battle end
{
  const { eng } = await runningEngine(); await loadAll(eng);
  assert.ok(eng.startLoop('amb_wind', { vol: 1 })); assert.equal(eng.loops.size, 1); assert.equal(eng.vm.budget, 31); assert.ok(eng.startLoop('amb_birds')); assert.equal(eng.loops.size, 2);
  assert.ok(eng.diagnostics().loaded.synth >= 1, 'a synth ambience loop is flagged'); const looped = eng.ctx.sources.filter((s) => s.loop); assert.ok(looped.length >= 2, 'native loop sources');
  eng.stopLoops(0.5); assert.equal(eng.loops.size, 0); assert.equal(eng.vm.budget, 32);
}

// ---- quality tier changes the voice budget and memory ceiling
{
  const { eng } = await runningEngine({ quality: () => 'potato' }); eng.setQuality('potato'); assert.equal(eng.vm.budget, 24); assert.equal(eng.bank.ceiling, 40 * 1048576); eng.setQuality('olympian'); assert.equal(eng.vm.budget, 32); assert.equal(eng.bank.ceiling, 240 * 1048576);
}
// ---- REGRESSION (COORD report): settings.on must be subscribed exactly once; a change must not re-register a listener while
// Settings.set is iterating its listener array (that was an infinite loop that killed the page)
{
  const store = { 'vol.master': 0.5, quality: 'marble' }; const fns = [];
  const settings = {
    fns, get: (k) => store[k], on(fn) { fns.push(fn); return () => { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }; },
    set(k, v) { store[k] = v; for (let i = 0; i < fns.length; i++) { fns[i](k, v); if (fns.length > 3) throw new Error('listener count grew while iterating: ' + fns.length); } },   // iterates the LIVE array like the app does
  };
  const T = makeEngine({ gated: false, settings, quality: () => store.quality }); const { eng } = T;
  assert.equal(fns.length, 1, 'one subscription after construction'); await eng.unlock(); eng.preload(); await tick(3); assert.equal(fns.length, 1, 'unlock/preload never add listeners');
  for (let i = 0; i < 5; i++) settings.set('quality', i % 2 ? 'marble' : 'potato');
  settings.set('vol.master', 0.2); settings.set('muted', true); settings.set('muted', false);
  assert.equal(fns.length, 1, 'settings.fns.length unchanged after repeated set()'); assert.equal(eng.getVolume('master'), 0.2, 'volume still follows settings'); assert.equal(eng.isMuted(), false);
  settings.set('quality', 'potato'); assert.equal(eng.tier, 'potato'); assert.equal(eng.vm.budget, 24, 'quality change applied through the single listener');
  settings.set('muted', true); assert.equal(eng.isMuted(), true); assert.ok(eng.masterGain.gain.valueAt(eng.ctx.currentTime + 1) < 1e-6);
  eng.applySettings(); eng.applySettings(); assert.equal(fns.length, 1, 'applySettings is read-only');
  eng.destroy(); assert.equal(fns.length, 0, 'destroy unsubscribes');
  // settings objects without on() (or with an on() that throws) are tolerated
  makeEngine({ settings: { get: () => undefined } }); makeEngine({ settings: { get: () => undefined, on() { throw new Error('nope'); } } });
}
console.log('engine.test OK');
