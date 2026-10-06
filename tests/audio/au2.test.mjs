// AU2: with a stubbed AudioContext that starts SUSPENDED and resumes only on a user gesture, the music bus RMS stays 0 before the
// gesture and is > 0.001 within 3 s after it. NEGATIVE CONTROL: a build with the gesture gate removed must FAIL the same check.
import assert from 'node:assert/strict';
import path from 'path';
import { bundleEngine, makeEnv, makeFetch, MockContext, sleep, tick, root } from './helpers.mjs';

async function scenario(mod, label, manifest) {
  const env = makeEnv();
  const E = { window: env.win, document: env.doc, navigator: { userAgent: 'node' }, AudioContext: env.AudioContext, OfflineAudioContext: class extends MockContext { constructor(nc, n, sr) { super({ sampleRate: sr, startState: 'running' }); } }, fetch: makeFetch({ durOf: () => 6 }), manifest, coreAudio: {}, yieldFn: () => Promise.resolve(), setInterval: () => 0, bridgeMs: 50 };
  const eng = new mod.AudioEngine({ env: E });
  eng.boot();
  eng.music.setMood('menu');                      // the title screen asks for music before any gesture
  await sleep(120);
  const pre = { ctxState: eng.diagnostics().ctxState, rms: eng.busRMS().music, ctxs: env.ctxs.length };
  // the user presses a key: synthetic gesture dispatched on window
  env.win.gesture('keydown', { key: 'a' });
  const ctx = env.ctxs[0];
  let t = 0, post = 0, firstOk = null;
  for (let i = 0; i < 60; i++) {                  // 3 s of audio time in 50 ms steps, letting async loading proceed
    await sleep(8); if (ctx) ctx.advance(0.05); t += 0.05;
    post = eng.busRMS().music; if (post > 0.001 && firstOk === null) firstOk = t;
  }
  const res = { label, pre, post, firstOk, ctxState: eng.diagnostics().ctxState, state: eng.state(), music: eng.music.getState() };
  return res;
}
const passes = (r) => r.pre.rms === 0 && r.pre.ctxState === 'none' && r.pre.ctxs === 0 && r.post > 0.001 && r.firstOk !== null && r.firstOk <= 3 && r.ctxState === 'running';

const real = await bundleEngine('gated');
const ungated = await bundleEngine('nogate', { 'unlock.js': path.join(root, 'tests/audio/nogate_unlock.mjs') });
for (const [name, manifest] of [['synth fallback (no music assets)', { sfx: [], music: [] }], ['with a manifest music track', JSON.parse((await import('fs')).readFileSync(path.join(root, 'tests/fixtures/audio/manifest.json'), 'utf8'))]]) {
  const good = await scenario(real, 'gated / ' + name, manifest);
  console.log(`AU2 ${name}: before gesture ctx=${good.pre.ctxState} musicRMS=${good.pre.rms}; after: ctx=${good.ctxState} musicRMS=${good.post.toFixed(4)} first > 0.001 at +${good.firstOk}s; music=${JSON.stringify(good.music)}`);
  assert.ok(passes(good), 'AU2 must pass with the gesture gate: ' + JSON.stringify(good));
  const bad = await scenario(ungated, 'ungated / ' + name, manifest);
  console.log(`AU2 negative control (${name}): ctx=${bad.ctxState} musicRMS=${bad.post} -> predicate ${passes(bad) ? 'PASSES (BAD)' : 'fails as required'}`);
  assert.ok(!passes(bad), 'NEGATIVE CONTROL: without the gesture gate the AU2 predicate must FAIL');
  assert.equal(bad.pre.ctxs, 0);
  assert.ok(bad.post <= 0.001 && bad.ctxState !== 'running', 'ungated build never gets audio');
}
// pressing Escape is not an activating key; pointer/touch/keys are
{
  const env = makeEnv(); const E = { window: env.win, document: env.doc, AudioContext: env.AudioContext, manifest: { sfx: [], music: [] }, coreAudio: {}, fetch: null, setInterval: () => 0, yieldFn: () => Promise.resolve() };
  const eng = new real.AudioEngine({ env: E }); eng.boot(); env.win.gesture('keydown', { key: 'Escape' }); await tick(3); assert.equal(env.ctxs.length, 0, 'Escape does not unlock');
  env.win.gesture('touchend'); await tick(5); assert.equal(env.ctxs[0].state, 'running', 'touchend unlocks (iOS)');
  assert.equal(env.win.count('pointerdown'), 0, 'gate removes its listeners once running');
}
// explicit unlock() from the splash works too, and is idempotent
{
  const env = makeEnv(); const E = { window: env.win, document: env.doc, AudioContext: env.AudioContext, manifest: { sfx: [], music: [] }, coreAudio: {}, fetch: null, setInterval: () => 0, yieldFn: () => Promise.resolve() };
  const eng = new real.AudioEngine({ env: E });
  let p; env.gate.active = true; p = eng.unlock(); env.gate.active = false; assert.equal(await p, true); assert.equal(await eng.unlock(), true); assert.equal(env.ctxs.length, 1, 'one context only');
  // outside a gesture on a fresh engine resume() is refused by the stubbed autoplay policy: unlock stays pending, state stays locked
  const env2 = makeEnv(); const e2 = new real.AudioEngine({ env: Object.assign({}, E, { window: env2.win, document: env2.doc, AudioContext: env2.AudioContext }) });
  e2.unlock(); await tick(3); assert.equal(e2.state(), 'locked'); assert.ok(e2.play('hit_blade', { x: 1, z: 1 }) === null, 'gameplay cues are dropped while the context is not running'); assert.equal(e2.diagnostics().busRMS.music, 0);
}
console.log('au2.test OK');
