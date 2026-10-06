// SFX bank: embedded core decode (no fetch), lazy group loading, retry once, graceful failure -> synth, decoded-PCM ceiling with LRU
// eviction per quality tier, cooperative yielding, shuffle-bag variants.
import assert from 'node:assert/strict';
import { Catalog, pcmCeiling } from '../../src/audio/manifest.js';
import { SfxBank, bufBytes } from '../../src/audio/sfx.js';
import { MockContext, makeFetch, wavB64 } from './mockctx.mjs';
import { fixtureManifest, sleep } from './helpers.mjs';
import { mulberry32 } from '../../src/audio/util.js';
import { writeWav, noiseBurst } from './wav.mjs';

const man = fixtureManifest(); const cat = new Catalog(man);
const ctx = new MockContext({ startState: 'running' });
const mk = (d, sr) => { const b = ctx.createBuffer(1, d.length, sr); b.copyToChannel(d, 0); return b; };
const dec = (ab) => ctx.decodeAudioData(ab);
const mkBank = (o = {}) => new SfxBank(Object.assign({ catalog: cat, decode: dec, makeBuffer: mk, fetch: makeFetch({ durOf: () => 0.4 }), rng: mulberry32(3), yieldFn: () => Promise.resolve(), sleep: () => Promise.resolve() }, o));

// ---- embedded core: decoded from base64, zero fetches
{
  const core = {}; for (const e of man.sfx) if (e.core) core[e.id] = wavB64(0.25, 300);
  const f = makeFetch(); const b = mkBank({ core, fetch: f });
  await b.loadCore(); assert.equal(f.calls.length, 0, 'no fetch for embedded assets'); const st = b.stats(); assert.equal(st.embedded, Object.keys(core).length); assert.equal(st.fetched, 0);
  const p = b.pick('hit_blade'); assert.ok(p && p.src === 'embedded' && p.entry.core, 'embedded asset served');
  assert.equal(b.pick('hit_flesh_heavy'), null, 'a non-core family is pending until its group loads (never replaced by synth while real assets are on the way)');
}

// ---- lazy groups: ui + combat first; nothing is fetched until asked; variants fill in
{
  const f = makeFetch(); const b = mkBank({ fetch: f });
  assert.equal(f.calls.length, 0); b.warm(['ui']); await b.idle();
  const uiUrls = f.calls.slice(); assert.ok(uiUrls.length > 0 && uiUrls.every((u) => /ui_|countdown_|jingle_/.test(u)), 'ui group first: ' + uiUrls.slice(0, 3));
  assert.ok(b.pick('ui_click') && b.pick('ui_click').src === 'fetched');
  b.ensure('hit_blade'); await b.idle(); assert.ok(b.pick('hit_blade')); assert.ok(f.calls.some((u) => /sword_hit/.test(u)));
  assert.ok(!f.calls.some((u) => /thunder|catapult/.test(u)), 'siege group not fetched until needed');
  // the same asset is never fetched twice
  const n = f.calls.length; b.warm(['ui', 'combat']); await b.idle(); assert.equal(new Set(f.calls).size, f.calls.length, 'no duplicate fetches'); assert.ok(f.calls.length > n);
  // shuffle-bag variants: never the same variant twice in a row
  let last = ''; const seen = new Set(); for (let i = 0; i < 60; i++) { const p = b.pick('hit_blade'); assert.notEqual(p.id, last); last = p.id; seen.add(p.id); } assert.ok(seen.size >= 3, 'three variants rotate');
}

// ---- retry once, then failure -> synth flagged
{
  const f = makeFetch({ failStatus: 503, fail: (u, n) => /sword_hit_1/.test(u) && n === 1 }); const b = mkBank({ fetch: f });
  b.ensure('hit_blade'); await b.idle(); assert.equal(f.calls.filter((u) => /sword_hit_1/.test(u)).length, 2, 'transient failure (503) retried once'); assert.equal(b.assets.get('sword_hit_1').state, 'ready');
  const g = makeFetch({ failStatus: 503, fail: (u) => /war_horn/.test(u) }); const b2 = mkBank({ fetch: g });
  b2.ensure('horn_war'); await b2.idle(); assert.equal(g.calls.filter((u) => /war_horn_1/.test(u)).length, 2, 'only one retry'); const st = b2.stats(); assert.equal(st.failed, 3, 'all three variants failed');
  const p = b2.pick('horn_war'); assert.ok(p && p.src === 'synth', 'graceful fallback to synth'); assert.equal(b2.stats().synth, 1); assert.ok(b2.paths()['synth:horn_war'] === 'synth'); assert.equal(b2.paths()['war_horn_1'], 'failed');
  // 404 / 403 are permanent: one request, no retry, silent synth fallback
  const gone = makeFetch({ fail: (u) => /war_horn/.test(u) }); const b404 = mkBank({ fetch: gone }); b404.ensure('horn_war'); await b404.idle(); assert.equal(gone.calls.filter((u) => /war_horn_1/.test(u)).length, 1, '404 is not retried'); assert.equal(b404.pick('horn_war').src, 'synth'); assert.ok(b404.failures().every((x) => /404/.test(x.err)) && b404.failures().length === 3);
  const blocked = mkBank({ fetch: makeFetch({ block: true }) }); blocked.ensure('hit_blade'); await blocked.idle(); assert.ok(blocked.pick('hit_blade').src === 'synth', 'fetch blocked -> synth');
  // an undecodable file fails cleanly too
  const bad = mkBank({ fetch: async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(64) }) }); bad.ensure('hit_blade'); await bad.idle(); assert.equal(bad.stats().failed, 3); assert.equal(bad.pick('hit_blade').src, 'synth');
  // UI cues fall back to synth while the real file is still loading (feedback must never be silent)
  const slow = mkBank({ fetch: () => new Promise(() => {}) }); assert.equal(slow.pick('ui_click', -1, true).src, 'synth'); assert.equal(slow.pick('hit_blade'), null);
}

// ---- decoded-PCM ceiling per tier: LRU eviction keeps decoded bytes under the ceiling, core is never evicted
{
  const big = { sfx: [], music: [] }; for (let i = 0; i < 30; i++) big.sfx.push({ id: 'sword_hit_' + i, file: 'sword_hit_' + i + '.wav', path: 'audio/sfx/sword_hit_' + i + '.wav', category: 'blade', tags: ['sword'], duration: 4 });
  const c2 = new Catalog(big);
  const fetch = async () => { const w = writeWav([noiseBurst(12, 44100, 0.3, 5)], 44100); return { ok: true, status: 200, arrayBuffer: async () => w.buffer.slice(w.byteOffset, w.byteOffset + w.length) }; };   // 12 s mono = 2.1 MB decoded, 30 of them = 63 MB
  for (const tier of ['potato', 'papyrus']) {
    const b = new SfxBank({ catalog: c2, decode: dec, makeBuffer: mk, fetch, quality: () => tier, rng: mulberry32(1), yieldFn: () => Promise.resolve(), sleep: () => Promise.resolve() });
    b.warm(['combat']); await b.idle();
    const cap = pcmCeiling(tier); assert.ok(b.decodedBytes <= cap, `${tier}: ${b.decodedBytes} <= ${cap}`);
    let sum = 0; for (const a of b.assets.values()) if (a.state === 'ready') sum += bufBytes(a.buf); assert.equal(sum, b.decodedBytes, 'byte accounting is exact');
    if (tier === 'potato') assert.ok(b.evictions > 0 && b.stats().ready < 30, 'potato (40 MB) evicts: ' + JSON.stringify(b.stats()));
    // an evicted asset can come back on demand
    const ev = [...b.assets.values()].find((a) => a.state === 'idle'); if (ev) { b.ensure('hit_blade'); await b.idle(); assert.ok(b.decodedBytes <= cap); }
    // lowering the tier at runtime trims to the new ceiling
    b.quality = () => 'potato'; b.enforce(); assert.ok(b.decodedBytes <= pcmCeiling('potato'));
  }
  const core = { sword_hit_0: wavB64(6, 200) }; const bc = new SfxBank({ catalog: c2, core, decode: dec, makeBuffer: mk, fetch, quality: () => 'potato', rng: mulberry32(1), yieldFn: () => Promise.resolve(), sleep: () => Promise.resolve() });
  await bc.loadCore(); bc.warm(['combat']); await bc.idle(); assert.equal(bc.assets.get('sword_hit_0').state, 'ready', 'embedded core is pinned (never evicted)');
}

// ---- decoding yields between jobs (the main thread stays responsive) and runs one decode at a time
{
  let yields = 0, concurrent = 0, maxConcurrent = 0;
  const d2 = async (ab) => { concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent); await sleep(1); concurrent--; return ctx.decodeAudioData(ab); };
  const b = mkBank({ decode: d2, yieldFn: async () => { yields++; await sleep(0); } });
  b.warm(['ui', 'combat', 'voice']); await b.idle();
  assert.ok(b.stats().ready > 20 && yields >= b.stats().ready, `yielded before each decode: ${yields} yields for ${b.stats().ready} assets`); assert.equal(maxConcurrent, 1, 'serial decode');
  // fetch concurrency is bounded
  let inflight = 0, peak = 0; const fch = async () => { inflight++; peak = Math.max(peak, inflight); await sleep(2); inflight--; const w = writeWav([noiseBurst(0.2)], 22050); return { ok: true, status: 200, arrayBuffer: async () => w.buffer.slice(w.byteOffset, w.byteOffset + w.length) }; };
  const b2 = mkBank({ fetch: fch }); b2.warm(['ui', 'combat']); await b2.idle(); assert.ok(peak <= 3, 'at most 3 concurrent fetches: ' + peak);
}

// ---- layered families resolve per layer; synth is used once for synth-only families
{
  const b = mkBank(); const r = b.resolve('crit'); assert.ok(r.real.length > 0 || r.synth); assert.ok(b.slot('crit', 0) && b.slot('crit', 1));
  assert.deepEqual(b.resolve('no_such'), null);
  const p = b.pick('philosopher_mumble'); assert.ok(p.src === 'synth' && p.buf.sampleRate === 22050 && p.buf.duration > 0.5);
  const seen = new Set(); for (let i = 0; i < 30; i++) seen.add(b.pick('philosopher_mumble').id); assert.equal(seen.size, 3, 'three synth variants rotate');
  const loop = b.pick('amb_birds'); assert.ok(loop.loop === true, 'synth ambience flagged as loop');
}
// ---- fetch blocked wholesale: circuit breaker stops hammering the network (few console errors), embedded core still loads first
{
  const core = {}; for (const e of man.sfx) if (e.core) core[e.id] = wavB64(0.25, 300);
  const blocked = makeFetch({ block: true }); const b = mkBank({ core, fetch: blocked, sleep: () => Promise.resolve() });
  b.warm(['ui', 'combat', 'voice', 'siege', 'misc']);          // queues EVERYTHING (including the core ids) before loadCore() runs
  await b.loadCore(); await b.idle();
  const st = b.stats(); assert.equal(st.embedded, Object.keys(core).length, 'embedded assets load even when they were already queued behind 70 others');
  assert.ok(blocked.calls.length <= 14, 'at most ~8 failing requests before the breaker opens: ' + blocked.calls.length + ' of ' + (st.total - st.embedded));
  assert.ok(st.failed >= st.total - st.embedded - 0 && b.failures().some((x) => /network down/.test(x.err) || /blocked/.test(x.err)), 'the rest fail fast and are recorded');
  assert.equal(b.pick('hit_blade').src, 'embedded', 'hits still play from the core pack');
  assert.equal(b.pick('thunder_crack').src, 'synth', 'non-core families fall back to flagged synth');
}
console.log('bank.test OK');
