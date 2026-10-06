// Asset reachability (COORD report: the Placement screen requested ui_place_*.mp3 and got 404s). Every file any cue family, bank warm-up or
// music mood can request must exist in assets/manifest.json AND on disk; a missing file must fall back to synth silently (no console output,
// no retry) and show up in diagnostics; rows that are not published are never requested at all.
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { Catalog, groupOf } from '../../src/audio/manifest.js';
import { SfxBank } from '../../src/audio/sfx.js';
import { MusicDirector, MOODS } from '../../src/audio/music.js';
import { CUES, CUE_IDS } from '../../src/audio/cues.js';
import { MockContext, makeFetch, makeEnv } from './mockctx.mjs';
import { realManifest, makeEngine, runningEngine, root, fixtureManifest } from './helpers.mjs';

const man = realManifest(); assert.ok(man, 'assets/manifest.json exists');
const onDisk = (rel) => { const p = path.join(root, 'assets', rel); return fs.existsSync(p) && fs.statSync(p).size > 0; };
const cat = new Catalog(man);

// ---- 1. every ledger row (sfx + music) exists on disk with a consistent path/file
const missing = [];
for (const kind of ['sfx', 'music']) for (const r of man[kind]) {
  if (!r.path || !onDisk(r.path)) missing.push(`${kind}:${r.id} -> ${r.path}`);
  if (r.file && r.path && path.basename(r.path) !== r.file) missing.push(`${kind}:${r.id} file/path mismatch ${r.file} vs ${r.path}`);
}
const soft = !!process.env.ASSETS_SOFT;   // debugging aid only: prints instead of failing (sections 4-5 still verify the fallback)
if (soft && missing.length) console.log('SOFT: ' + missing.length + ' ledger rows missing on disk: ' + missing.slice(0, 8).join(' | '));
if (!soft) assert.deepEqual(missing, [], `${missing.length} ledger rows are not on disk (the page would 404 on them): ${missing.slice(0, 12).join(' | ')}`);
const idsSeen = new Set(); for (const r of man.sfx) { assert.ok(!idsSeen.has(r.id), 'duplicate ledger id ' + r.id); idsSeen.add(r.id); }

// ---- 2. every file any cue family can request (all layers, all fallback groups) is a ledger row that exists on disk
const bank0 = new SfxBank({ catalog: cat, decode: async () => null, makeBuffer: () => null });
const reachable = new Set();
for (const f of CUE_IDS) { const def = CUES[f]; const lays = def.layers && def.layers.length ? def.layers.map((_, i) => i) : [-1]; for (const li of lays) for (const e of bank0.slot(f, li).entries) reachable.add(e.id); }
for (const id of reachable) { const e = cat.get(id); assert.ok(e, 'family selector reaches unknown asset ' + id); if (!soft) assert.ok(onDisk(e.url.replace(/^assets\//, '')), `family can request ${e.url} but it is not on disk`); }
const ui = bank0.resolve('ui_place'); if (!soft) assert.ok(ui.real.length === 0 || ui.real.every((i) => onDisk(cat.get(i).url.replace(/^assets\//, ''))), 'ui_place only resolves to files that exist');

// ---- 3. run the real loading paths against a fetch that serves from disk and records every URL: nothing requested may be absent
async function crawl() {
  const urls = []; const ctx = new MockContext({ startState: 'running' });
  const fetch = async (u) => { urls.push(u); const p = path.join(root, u); return fs.existsSync(p) ? { ok: true, status: 200, arrayBuffer: async () => { const { writeWav, noiseBurst } = await import('./wav.mjs'); const w = writeWav([noiseBurst(0.1)], 22050); return w.buffer.slice(w.byteOffset, w.byteOffset + w.length); } } : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }; };
  const bank = new SfxBank({ catalog: cat, decode: (ab) => ctx.decodeAudioData(ab), makeBuffer: (d, sr) => { const b = ctx.createBuffer(1, d.length, sr); b.copyToChannel(d, 0); return b; }, fetch, yieldFn: () => Promise.resolve(), sleep: () => Promise.resolve(), quality: () => 'olympian' });
  bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await bank.idle();
  for (const f of CUE_IDS) bank.ensure(f);                                   // and every family on demand
  await bank.idle();
  const md = new MusicDirector({ catalog: cat, fetch, decode: (ab) => ctx.decodeAudioData(ab), makeStereo: () => null, retryMs: 1 });
  for (const mood of MOODS) for (const theme of ['greek', 'egypt', 'barbarian', 'mythic', 'carthage', '']) { const e = md.choose(mood, theme); if (e) try { await md._load(e); } catch (err) { /* decode of fake wav is fine; failures show up as 404s below */ } }
  return { urls, bank };
}
const crawled = await crawl();
const bad = [...new Set(crawled.urls)].filter((u) => !fs.existsSync(path.join(root, u)));
if (!soft) assert.deepEqual(bad, [], 'requested but not on disk (would be a 404 in the page): ' + bad.slice(0, 10).join(', '));
assert.equal(new Set(crawled.urls).size, crawled.urls.filter((u, i, a) => a.indexOf(u) === i).length);
console.log(`assets: ${man.sfx.length} sfx + ${man.music.length} music rows all on disk; ${reachable.size} sfx reachable from cue families; crawl requested ${new Set(crawled.urls).size} distinct files, ${bad.length} missing on disk`);

// ---- 4. a missing file: one request (no retry), silent synth fallback, recorded in diagnostics, nothing written to the console
{
  const logged = []; const orig = { e: console.error, w: console.warn, l: console.log }; console.error = console.warn = (...a) => logged.push(a.join(' '));
  try {
    const fm = fixtureManifest(); const f404 = makeFetch({ fail: (u) => /ui_click/.test(u) });
    const T = makeEngine({ gated: false, fetchOpts: { fail: (u) => /ui_click/.test(u) || /sword_hit/.test(u) } }); const { eng, fetch } = T;
    await eng.unlock(); eng.bank.warm(['ui', 'combat']); await eng.bank.idle();
    const calls = fetch.calls.filter((u) => /ui_click_1/.test(u)).length; assert.equal(calls, 1, '404 is permanent: requested once, not retried (' + calls + ')');
    const h = eng.play('ui_click'); assert.ok(h, 'the UI click still sounds (synth)'); const d = eng.diagnostics();
    assert.ok(d.loaded.failed >= 3 && d.loaded.synth >= 1, 'diagnostics count the failures and the synth fallback: ' + JSON.stringify(d.loaded));
    assert.ok(d.failedAssets.some((a) => /ui_click/.test(a.id) && /404/.test(a.err)), 'failedAssets lists the missing file with its error'); assert.equal(d.paths['ui_click_1'], 'failed'); assert.equal(d.paths['synth:ui_click'], 'synth');
    assert.deepEqual(logged, [], 'no console output from the fallback');
  } finally { console.error = orig.e; console.warn = orig.w; }
}

// ---- 5. rows that are not published are never requested (window.__VW_FILES__ from the build)
{
  const fm = fixtureManifest(); const published = fm.sfx.filter((e) => !/^(ui_click|sword_hit)/.test(e.id)).map((e) => e.path).concat(fm.music.map((e) => e.path));
  const c = new Catalog(fm, published); assert.ok(c.missing.length >= 6 && c.missing.every((m) => /ui_click|sword_hit/.test(m.id)), 'unpublished rows are recorded: ' + c.missing.length);
  assert.ok(!c.sfx.some((e) => /^(ui_click|sword_hit)/.test(e.id)) && c.sfx.length === fm.sfx.length - c.missing.length);
  const { AudioEngine } = await import('../../src/audio/engine.js'); const env = makeEnv({ ungated: true }); const fetch = makeFetch();
  const eng = new AudioEngine({ env: { window: env.win, document: env.doc, AudioContext: env.AudioContext, manifest: fm, publishedFiles: new Set(published.map((p) => 'assets/' + p)), fetch, coreAudio: {}, yieldFn: () => Promise.resolve(), setInterval: () => 0 } });
  await eng.unlock(); eng.bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await eng.bank.idle();
  assert.ok(fetch.calls.length > 20 && !fetch.calls.some((u) => /ui_click|sword_hit/.test(u)), 'unpublished files are never requested');
  assert.ok(eng.play('ui_click'), 'and the family sounds through synth'); const d = eng.diagnostics(); assert.ok(d.manifest.notPublished >= 6 && d.manifest.notPublishedIds.length > 0, 'diagnostics list unpublished rows');
  assert.equal(new Catalog(fm, ['audio/sfx/' + fm.sfx[0].file]).sfx.length, 1, 'published list accepts paths relative to assets/');
}
console.log('assets.test OK');
