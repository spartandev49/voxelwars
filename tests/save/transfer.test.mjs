// Export all / Import all: round trip, strict validation, all-or-nothing apply, fuzz. Run: node tests/save/transfer.test.mjs
import assert from 'node:assert/strict';
import { Store, Settings, Collection, DEFAULT_SETTINGS } from '../../src/save/store.js';
import { createDocs } from '../../src/save/docs.js';
import { LifetimeStats, storeAdapter } from '../../src/save/stats.js';
import { createTransfer, EXPORT_KEYS, validateSettingsData, MAX_SAVE_CODE } from '../../src/save/transfer.js';
import { generateArena } from '../../src/world/gen.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { RNG } from '../../src/core/rng.js';
import { V1 } from './fixtures/v1_blobs.mjs';

const mem = (quota = Infinity) => { const m = new Map(); let bytes = 0; return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => { v = String(v); const old = m.has(k) ? m.get(k).length : 0; if (bytes - old + v.length > quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } bytes += v.length - old; m.set(k, v); },
  removeItem: (k) => { if (m.has(k)) { bytes -= m.get(k).length; m.delete(k); } }, _m: m }; };

function world(be = mem(), extra = {}) {
  const store = new Store(be); const settings = new Settings(store); const docs = createDocs(store); const stats = new LifetimeStats({ adapter: storeAdapter(store), debounceMs: 0 });
  const collections = { arenas: new Collection(store, 'arenas', 48), soldiers: new Collection(store, 'soldiers', 24), armies: new Collection(store, 'armies', 24) };
  const defs = buildSimDefs();
  const T = createTransfer(Object.assign({ store, docs, stats, settings, collections, defs, build: 'test', now: () => 1700000000000 }, extra));
  return { be, store, settings, docs, stats, collections, T, defs };
}
const snapshot = (be) => JSON.stringify(Array.from(be._m.entries()).sort());

// ---------------------------------------------------------------- build a rich source save
const A = world();
A.settings.set('quality', 'papyrus'); A.settings.set('vol.music', 0.25); A.settings.set('announcerVoice', true); A.settings.set('keys', { pause: 'KeyP' }); A.settings.set('seenHints', { teaching: true }); A.settings.flush();
A.docs.progress.set('stars', { marathon_sort_of: 3 }); A.docs.progress.set('achievements', { first_victory: { at: 1700000000000 } }); A.docs.survival.set('best', 12345); A.docs.survival.set('board', [{ score: 12345, waves: 6, date: '2026-01-01', arena: 'nile' }]);
A.docs.daily.set('history', [{ date: '2026-03-01', result: 'win', time: 100, left: 80, seed: 1, arena: 'x', string: 's' }]); A.docs.daily.set('last', '2026-03-01'); A.docs.seen.set('teaching', true);
A.stats.beginBattle({ playerTeam: 0 }); A.stats.onEvent('chicken_tantrum', {}); A.stats.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 12, stats: [{}, {}], perDef: [{ hoplite: 1 }, {}] });
const arena = generateArena('colosseum', 'small', 3).toJSON();
A.collections.arenas.put({ id: 'ar_1', name: 'Test <img src=x onerror=alert(1)>', data: arena, thumb: 'data:image/jpeg;base64,AAAA' });
A.collections.soldiers.put({ id: 'cs_1', name: 'Sir Chadius', stats: { hp: 20, damage: 20, speed: 10, armor: 10, morale: 5 }, weapon: 'gladius', abilities: [], blueprint: { v: 1, id: 'bp' }, text: { catch: '', deaths: [], pitch: 1 } });
A.collections.armies.put({ id: 'army_1', name: 'Mine', records: [{ team: 0, defId: 'hoplite', positions: [[1, 2], [3, 4]], heading: 1, order: 'advance' }] });

const code = await A.T.exportAll();
assert.ok(/^VW1\.save\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(code), 'share-style code: VW1.save.<body>.<crc>'); assert.ok(code.length < MAX_SAVE_CODE);
console.log('export code', code.length, 'chars');

// ---------------------------------------------------------------- round trip into a fresh device
{
  const B = world(); const r = await B.T.importAll(code);
  assert.deepEqual(r.errors, [], 'errors'); assert.equal(r.ok, true); assert.deepEqual(r.applied, EXPORT_KEYS.filter((k) => A.store.getVersioned(k)));
  for (const k of EXPORT_KEYS) { const a = A.store.getVersioned(k), b = B.store.getVersioned(k); if (!a) { assert.equal(b, null); continue; } assert.equal(b.v, a.v, k + ' version'); assert.deepEqual(b.data, a.data, k + ' data'); }
  assert.equal(B.settings.get('quality'), 'papyrus'); assert.equal(B.settings.get('vol.music'), 0.25); assert.equal(B.settings.get('announcerVoice'), true, 'settings this build does not list survive');
  assert.deepEqual(B.docs.progress.get('stars'), { marathon_sort_of: 3 }); assert.equal(B.docs.survival.get('best'), 12345);
  assert.equal(B.stats.get().chickenTantrums, 1, 'live stats object reloaded'); assert.equal(B.collections.arenas.list().length, 1); assert.equal(B.collections.armies.get('army_1').records[0].defId, 'hoplite');
  // idempotent: importing the same code again changes nothing
  const before = snapshot(B.be); assert.equal((await B.T.importAll(code)).ok, true); assert.equal(snapshot(B.be), before);
  // plain JSON of the same payload is accepted too
  const json = JSON.stringify({ f: 1, app: 'voxelwars', keys: { progress: A.store.getVersioned('progress') } }); const C = world(); assert.equal((await C.T.importAll(json)).ok, true);
  // a File-like input
  const D = world(); assert.equal((await D.T.importAll({ size: code.length, text: async () => code })).ok, true);
  // export of an empty device still works and re-imports (nothing to apply is an error: "That save is empty")
  const E = world(); const fresh = await E.T.exportAll(); const r1 = await world().T.importAll(fresh); assert.equal(r1.ok, true, 'a fresh device exports (settings) and re-imports'); assert.deepEqual(r1.applied, ['settings']);
  const r2 = await world().T.importAll('{"f":1,"keys":{}}'); assert.equal(r2.ok, false); assert.match(r2.errors[0], /empty/);
}

// ---------------------------------------------------------------- hand-made v1 blobs migrate on import
{
  const payload = { f: 1, app: 'voxelwars', keys: { progress: V1.progress, survival: V1.survival, daily: V1.daily, seen: V1.seen } };
  const B = world(); const r = await B.T.importAll(JSON.stringify(payload)); assert.deepEqual(r.errors, []); assert.equal(r.ok, true);
  assert.equal(B.store.getVersioned('progress').v, 2); assert.equal(B.docs.progress.get('stars').marathon_sort_of, 3); assert.equal(B.docs.survival.get('best'), 9000); assert.equal(B.docs.survival.get('bestWave'), 14, 'progress.survivalBest (best wave 14) beat the survival list best wave (7)'); assert.equal(B.docs.daily.get('streak'), 2);
  const only = world(); only.docs.survival.set('bestWave', 3); const r3 = await only.T.importAll(JSON.stringify({ f: 1, keys: { progress: V1.progress } })); assert.equal(r3.ok, true);
  assert.equal(only.docs.survival.get('bestWave'), 14, 'a v1 progress alone still delivers its survivalBest (best wave) to the live survival document'); assert.ok(r3.warnings.some((w) => /Merged/.test(w)));
}

// ---------------------------------------------------------------- strict validation: each rejection leaves the device untouched
const rejects = [];
async function mustReject(label, input, re) {
  const B = world(); B.settings.set('quality', 'olympian'); B.settings.flush(); B.docs.progress.set('stars', { marathon_sort_of: 1 }); B.collections.armies.put({ id: 'keep', name: 'keep', records: [] });
  const before = snapshot(B.be); const stats0 = JSON.stringify(B.stats.get());
  const r = await B.T.importAll(input);
  assert.equal(r.ok, false, label + ' must be rejected'); assert.ok(r.errors.length >= 1 && typeof r.errors[0] === 'string', label + ' reports why'); if (re) assert.match(r.errors.join(' | '), re, label);
  assert.equal(snapshot(B.be), before, label + ': nothing partially applied'); assert.equal(JSON.stringify(B.stats.get()), stats0); assert.equal(B.settings.get('quality'), 'olympian'); rejects.push(label);
}
const [, , body, crc] = code.split('.');
await mustReject('empty', '', /empty/); await mustReject('garbage', 'hello world', /VOXELWARS code/); await mustReject('number', 42, /Choose a VOXELWARS save/); await mustReject('null', null, /Choose/);
await mustReject('truncated', code.slice(0, -12), /damaged|check/); await mustReject('bad crc', `VW1.save.${body}.00000000`, /check value/);
await mustReject('flipped body', `VW1.save.${body.slice(0, 40)}${body[40] === 'A' ? 'B' : 'A'}${body.slice(41)}.${crc}`, /damaged|check/);
await mustReject('arena code', code.replace('VW1.save.', 'VW1.arena.'), /Unknown code type|damaged/); await mustReject('future code version', code.replace('VW1.', 'VW9.'), /newer game version|Unsupported/);
await mustReject('bad json', '{"f":1,', /JSON/); await mustReject('no format', '{"keys":{}}', /format marker/); await mustReject('newer format', JSON.stringify({ f: 2, keys: { seen: { v: 2, data: {} } } }), /newer version/);
await mustReject('foreign game', JSON.stringify({ f: 1, app: 'tetris', keys: { seen: { v: 2, data: {} } } }), /different game/); await mustReject('unknown part', JSON.stringify({ f: 1, keys: { seen: { v: 2, data: {} }, passwords: { v: 1, data: {} } } }), /does not know/);
await mustReject('no data', JSON.stringify({ f: 1, keys: { seen: { v: 2 } } }), /no data/); await mustReject('newer doc', JSON.stringify({ f: 1, keys: { seen: { v: 9, data: {} } } }), /newer version/);
await mustReject('proto key', '{"f":1,"keys":{"seen":{"v":2,"data":{"__proto__":{"x":1}}}}}', /forbidden key/);
await mustReject('infinity', '{"f":1,"keys":{"progress":{"v":2,"data":{"stars":{"marathon_sort_of":1e999}}}}}', /not valid|number/);
await mustReject('bad setting type', JSON.stringify({ f: 1, keys: { settings: { v: 1, data: { quality: 'ludicrous' } } } }), /unknown value/);
await mustReject('bad setting bool', JSON.stringify({ f: 1, keys: { settings: { v: 1, data: { shadows: 'yes' } } } }), /on or off/);
await mustReject('good part + bad part', JSON.stringify({ f: 1, keys: { progress: { v: 2, data: { stars: { marathon_sort_of: 3 } } }, arenas: { v: 1, data: [{ id: 'x', name: 'bad', data: { size: 999, h: [], props: [] } }] } } }), /not a valid arena/);
await mustReject('too many arenas', JSON.stringify({ f: 1, keys: { arenas: { v: 1, data: Array.from({ length: 49 }, (_, i) => ({ id: 'a' + i, name: 'x' })) } } }), /too long/);
await mustReject('dup ids', JSON.stringify({ f: 1, keys: { armies: { v: 1, data: [{ id: 'a', name: 'x' }, { id: 'a', name: 'y' }] } } }), /repeats the id/);
await mustReject('no id', JSON.stringify({ f: 1, keys: { armies: { v: 1, data: [{ name: 'x' }] } } }), /valid id|id/);
await mustReject('unknown unit in army', JSON.stringify({ f: 1, keys: { armies: { v: 1, data: [{ id: 'a', name: 'x', records: [{ team: 0, defId: 'ghost_unit', positions: [[0, 0]] }] }] } } }), /not a valid army/);
await mustReject('hostile soldier', JSON.stringify({ f: 1, keys: { soldiers: { v: 1, data: [{ id: 'cs', name: 'x', blueprint: {}, stats: { hp: 30, damage: 30, speed: 20, armor: 20, morale: 10 } }] } } }), /not a valid soldier/);
await mustReject('too deep', '{"f":1,"keys":{"seen":{"v":2,"data":{"a":' + '{"a":'.repeat(20) + '1' + '}'.repeat(20) + '}}}}', /deeply/);
await mustReject('oversized', 'x'.repeat(MAX_SAVE_CODE * 1.3), /too long/); await mustReject('file too big', { size: MAX_SAVE_CODE * 2, text: async () => 'x' }, /too large/);
await mustReject('text() throws', { size: 10, text: async () => { throw new Error('read failed'); } }, /could not be imported/);
console.log('rejected', rejects.length, 'invalid inputs, each leaving storage untouched');

// ---------------------------------------------------------------- tombstoned units in an imported army become the Mystery Goat
{
  const T = { unit: { retired_spartan: { removed: 'x' } } }; // the shipped table is empty today: exercise the real remap with a hand-made table through tombstones.remapArmy
  const { remapArmy } = await import('../../src/save/tombstones.js'); const defs = buildSimDefs();
  const r = remapArmy({ records: [{ team: 0, defId: 'retired_spartan', positions: [[0, 0]] }] }, defs, Object.assign({ prop: {}, achievement: {}, arena: {}, cue: {}, clip: {}, mutator: {} }, T)); assert.equal(r.army.records[0].defId, 'battle_goat');
}

// ---------------------------------------------------------------- all-or-nothing apply: a quota failure on the third key rolls everything back
{
  const small = mem(); const B = world(small); B.settings.set('quality', 'olympian'); B.settings.flush(); B.docs.progress.set('stars', { marathon_sort_of: 1 });
  const before = snapshot(small);
  // shrink the quota so the arenas key (written near the end) cannot fit
  const used = Array.from(small._m.values()).reduce((n, v) => n + v.length, 0);
  const tight = mem(used + 4000); for (const [k, v] of small._m) tight.setItem(k, v);
  const T2 = world(tight); const beforeTight = snapshot(tight); const r = await T2.T.importAll(code);
  assert.equal(r.ok, false); assert.match(r.errors[0], /storage|Nothing was changed/); assert.equal(snapshot(tight), beforeTight, 'rolled back to the exact previous strings');
  assert.equal(T2.store.status(), 'ok', 'status recovers after the rollback'); assert.ok(before);
}

// ---------------------------------------------------------------- storage blocked (memory mode): import works for the session and says nothing false
{
  const store = new Store(null); const settings = new Settings(store); const docs = createDocs(store); const stats = new LifetimeStats({ adapter: storeAdapter(store), debounceMs: 0 });
  const T = createTransfer({ store, docs, stats, settings, collections: {}, defs: buildSimDefs() }); const r = await T.importAll(code); assert.equal(r.ok, true, JSON.stringify(r.errors)); assert.equal(docs.progress.get('stars').marathon_sort_of, 3);
}

// ---------------------------------------------------------------- fuzz: mutated input never throws and never partially applies
{
  const rng = new RNG(20260101); let ok = 0, bad = 0; const B = world(); B.docs.progress.set('stars', { marathon_sort_of: 2 }); B.settings.set('quality', 'olympian'); B.settings.flush();
  const baseJson = JSON.stringify({ f: 1, app: 'voxelwars', keys: { settings: A.store.getVersioned('settings'), progress: A.store.getVersioned('progress'), stats: A.store.getVersioned('stats'), armies: A.store.getVersioned('armies') } });
  const mutate = (s) => {
    const c = s.split(''); const n = 1 + rng.int(0, 3);
    for (let j = 0; j < n; j++) { const p = rng.int(0, c.length - 1); const m = rng.int(0, 5); if (m === 0) c[p] = 'AzZ09-_.{}"[]:,'[rng.int(0, 14)]; else if (m === 1) c.splice(p, 1); else if (m === 2) c.splice(p, 0, '9'); else if (m === 3) c.length = Math.max(1, p); else if (m === 4) { const q = rng.int(0, c.length - 1); const t = c[p]; c[p] = c[q]; c[q] = t; } else c.splice(p, 0, ...'1e999'.split('')); }
    return c.join('');
  };
  const inputs = []; for (let i = 0; i < 300; i++) inputs.push(mutate(code)); for (let i = 0; i < 700; i++) inputs.push(mutate(baseJson));
  inputs.push(...[undefined, null, 0, NaN, {}, [], () => 1, Symbol.iterator, new Uint8Array(3), new ArrayBuffer(8), { text: 5 }, { size: NaN }, 'x'.repeat(10), '{}', '[]', 'null', '1', '"a"', '{"f":1}', '{"f":1,"keys":null}', '{"f":"1","keys":{}}', '{"f":1,"keys":[]}']);
  for (const inp of inputs) {
    const before = snapshot(B.be), keysBefore = JSON.stringify(B.stats.get());
    let r; try { r = await B.T.importAll(inp); } catch (e) { assert.fail('importAll threw: ' + e); }
    assert.ok(r && typeof r.ok === 'boolean' && Array.isArray(r.errors));
    if (!r.ok) { bad++; assert.ok(r.errors.length >= 1); assert.equal(snapshot(B.be), before, 'a rejected import changed storage'); assert.equal(JSON.stringify(B.stats.get()), keysBefore); }
    else { ok++; /* a mutation that stays valid (e.g. a changed number) is a legitimate import: it must be complete, so every stored key must validate again */ for (const k of EXPORT_KEYS) { const e = B.store.getVersioned(k); if (e) assert.ok(typeof e.v === 'number' && e.data !== undefined); } assert.ok(r.applied.length >= 1); }
    if (r.ok) { B.docs.progress.set('stars', { marathon_sort_of: 2 }); B.settings.set('quality', 'olympian'); B.settings.flush(); }
  }
  console.log('fuzz:', inputs.length, 'inputs,', bad, 'rejected,', ok, 'valid mutations accepted completely'); assert.ok(bad >= inputs.length * 0.8);
}

// settings validator edge cases
{
  const w = []; const s = validateSettingsData({ quality: 'marble', vol: { master: 5, music: -1 }, keys: { pause: 'Space' }, resScale: 9, zzz: { nested: 1 }, seenHints: { teaching: true, 'bad id': true } }, (m) => w.push(m));
  assert.equal(s.vol.master, 1); assert.equal(s.vol.music, 0); assert.equal(s.resScale, 1); assert.equal(s.zzz, undefined); assert.equal(w.length, 1); assert.deepEqual(s.seenHints, { teaching: true });
  assert.ok(Object.keys(DEFAULT_SETTINGS).length > 10);
}
console.log('transfer OK');
