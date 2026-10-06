// Arena Builder share codes, strict import (E7/E8/E10 for arenas), library and drafts.
import assert from 'node:assert';
import { generateArena } from '../../../src/world/gen.js';
import { Arena } from '../../../src/world/arena.js';
import { RNG } from '../../../src/core/rng.js';
import { Store, Collection } from '../../../src/save/store.js';
import { encodeShare } from '../../../src/save/share.js';
import { EditSession, hashArena } from '../../../src/editors/arena/session.js';
import { exportArena, importArena, toDoc, fromDoc, ValidationError, MAX_CODE, sizeClass } from '../../../src/editors/arena/docs.js';
import { libraryFor, draftFor, makeDraft, readDraft } from '../../../src/editors/arena/library.js';
import { PROP_CATALOG } from '../../../src/content/era_ancient/props/catalog.js';
import { LIMITS } from '../../../src/editors/arena/consts.js';
let checks = 0; const ok = (c, m) => { checks++; assert.ok(c, m); };
const norm = (a) => Arena.fromJSON(JSON.parse(JSON.stringify(a.toJSON())));

// ---------------------------------------------------------------- round trips (E8)
{
  const rng = new RNG(5), recipes = ['marathon', 'oasis', 'nile', 'thermopylae', 'persepolis', 'giza'];
  for (let k = 0; k < 24; k++) {
    const s = new EditSession(generateArena(rng.pick(recipes), 'small', rng.int(1, 999)));
    s.addHazard({ t: 'geyser', x: rng.range(-20, 20), z: rng.range(-20, 20), r: 3 }); s.addMarker({ type: 'hill', x: 1, z: 2 }); s.setObjective(rng.pick(['hold_hill', 'destroy', 'eliminate'])); s.setTags(['trial', 'hills']);
    s.arena.name = 'Test ' + k;
    const { code, length, cls, tooLong } = await exportArena(s.arena, { objective: s.objective, tags: s.tags });
    ok(/^VW1\.arena\./.test(code) && length === code.length && !tooLong, 'a small arena fits a chat-safe code (' + cls + ', ' + length + ')');
    const r = await importArena(code);
    assert.strictEqual(hashArena(r.arena), hashArena(norm(s.arena)), 'import is hash-equal to the saved arena'); assert.strictEqual(r.objective, s.objective); assert.deepStrictEqual(r.tags, s.tags);
  }
}
{ // 1,500 props round trip and size class
  const s = new EditSession(generateArena('arenalab', 'medium', 1)); const rng = new RNG(8), types = Object.keys(PROP_CATALOG).filter((t) => PROP_CATALOG[t].place !== false);
  const ps = s.beginPropStroke('Fill'); ps.add(Array.from({ length: LIMITS.props }, () => ({ t: rng.pick(types), x: rng.range(-45, 45), z: rng.range(-45, 45), r: rng.range(0, 6.28), s: rng.range(0.7, 1.5), v: rng.int(0, 3) })), { sym: false }); ps.end();
  assert.strictEqual(s.arena.props.length, 1500);
  const { code, length, cls } = await exportArena(s.arena, { objective: 'eliminate' });
  ok(length <= MAX_CODE, 'a full 1,500-prop arena still fits the 38,000 character limit (' + length + ', class ' + cls + ')');
  const r = await importArena(code); assert.strictEqual(r.arena.props.length, 1500); assert.strictEqual(hashArena(r.arena), hashArena(norm(s.arena)));
  assert.strictEqual(sizeClass(1800), 'S'); assert.strictEqual(sizeClass(8000), 'M'); assert.strictEqual(sizeClass(38000), 'L'); assert.strictEqual(sizeClass(38001), 'XL');
}
{ // the biggest generated presets
  for (const [r, sz] of [['olympus', 'large'], ['troy', 'large'], ['giza', 'large']]) { const { length, cls } = await exportArena(generateArena(r, sz, 3), {}); console.log('  code size', r, sz, length, cls); }
}
// ---------------------------------------------------------------- strict, plain-English errors
async function rejects(text, re, label) { try { await importArena(text); } catch (e) { ok(e instanceof ValidationError && re.test(e.message), label + ': ' + e.message); return; } assert.fail(label + ' should have been rejected'); }
{
  const good = (await exportArena(generateArena('arenalab', 'small', 1), {})).code;
  await rejects('hello', /VOXELWARS code/, 'not a code'); await rejects('', /VOXELWARS code|not a code/, 'empty');
  await rejects(good.slice(0, good.length - 6), /damaged|cut off/, 'truncated');
  { const parts = good.split('.'); parts[2] = parts[2].slice(0, 20) + (parts[2][20] === 'A' ? 'B' : 'A') + parts[2].slice(21); await rejects(parts.join('.'), /damaged/, 'one flipped character (CRC)'); }
  await rejects('VW2.arena.AAAA.00000000', /Unsupported code version|newer/, 'wrong version');
  const soldier = (await encodeShare('soldier', { id: 'x', name: 'S' })).code; await rejects(soldier, /for a soldier, but you are importing an arena/, 'wrong type');
  const bad = async (mut) => { const doc = toDoc(generateArena('arenalab', 'small', 1), {}); mut(doc); return (await encodeShare('arena', doc)).code; };
  await rejects(await bad((d) => { d.props = [['dragon_egg', 1, 1, 0, 1, 0]]; }), /Unknown prop 'dragon_egg'.*newer game version/, 'unknown prop');
  await rejects(await bad((d) => { d.hazards = [{ t: 'kraken', x: 0, z: 0, r: 3 }]; }), /Unknown hazard 'kraken'/, 'unknown hazard');
  await rejects(await bad((d) => { d.markers = [{ id: 'x', type: 'portal', x: 0, z: 0, r: 3 }]; }), /Unknown marker type 'portal'/, 'unknown marker');
  await rejects(await bad((d) => { d.size = 100; }), /size/i, 'bad size'); await rejects(await bad((d) => { d.h = [5, 1]; }), /wrong length/, 'bad layer');
  // clamp or drop instead of crash
  const r = await importArena(await bad((d) => { d.name = '<img src=x onerror=alert(1)>\u0007\n' + 'x'.repeat(80); d.author = '\u0000evil'; d.desc = 'd'.repeat(500); d.props = [['tree_oak', 1e9, -1e9, 0, 1, 7], ['tree_oak', null, 0, 0, 1, 0], ['bush', 3, 3, 0, 1, 0]]; d.hazards = [{ t: 'fire', x: 1e999, z: NaN, r: 1e9 }]; d.objective = '__proto__'; d.tags = ['ok', { a: 1 }, 'x'.repeat(40)]; }));
  ok(r.arena.name.length <= 32 && !/[\u0000-\u001f]/.test(r.arena.name) && r.arena.name.startsWith('<img'), 'hostile name stays plain text (rendered with textContent), control characters stripped');
  ok(r.arena.desc.length <= 200 && r.arena.author.length <= 24, 'lengths clamp');
  ok(r.arena.props.every((p) => Number.isFinite(p.x) && Math.abs(p.x) <= 48), 'props are finite and inside the arena'); ok(r.arena.hazards.every((h) => Number.isFinite(h.x) && Number.isFinite(h.z) && h.r <= 30), 'hazards are finite');
  assert.strictEqual(r.objective, 'eliminate'); assert.ok(r.tags.length <= 2 && r.tags.every((t) => t.length <= 16), 'tags are strings <= 16 chars'); ok(r.notes.length >= 1, 'the importer says what it changed');
  const many = await importArena(await bad((d) => { d.props = Array.from({ length: 2000 }, (_, k) => ['bush', (k % 80) - 40, 0, 0, 1, 0]); }));
  strictEqualLen(many.arena.props.length, 1500); ok(many.notes.some((n) => /2,000 props/.test(n)), 'too many props are truncated with a note');
}
function strictEqualLen(a, b) { assert.strictEqual(a, b); checks++; }

// ---------------------------------------------------------------- hostile fuzz (E7)
{
  const rng = new RNG(99), base = (await exportArena(generateArena('oasis', 'small', 4), {})).code; let rej = 0, acc = 0;
  for (let k = 0; k < 400; k++) {
    let t = base;
    const kind = k % 5;
    if (kind === 0) { const i = rng.int(0, t.length - 1); t = t.slice(0, i) + String.fromCharCode(rng.int(33, 125)) + t.slice(i + 1); }
    else if (kind === 1) t = t.slice(0, rng.int(0, t.length));
    else if (kind === 2) { const parts = t.split('.'); parts[3] = rng.chance(0.5) ? '' : rng.int(0, 1e9).toString(16); t = parts.join('.'); }
    else if (kind === 3) t = t.split('.').map((p, i) => (i === 2 ? p.split('').reverse().join('') : p)).join('.');
    else t = Array.from({ length: rng.int(1, 60) }, () => String.fromCharCode(rng.int(0, 255))).join('');
    try { await importArena(t); acc++; } catch (e) { assert.ok(e instanceof ValidationError, 'only plain-English errors escape: ' + (e && e.message)); rej++; }
  }
  ok(rej >= 380, 'corrupt codes are rejected (' + rej + ' rejected, ' + acc + ' accepted)');
}
// ---------------------------------------------------------------- library, drafts
{
  const store = new Store(null); const ctx = { save: { arenas: new Collection(store, 'arenas', 48), store, status: () => store.status() } };
  const lib = libraryFor(ctx); const s = new EditSession(generateArena('marathon', 'small', 3)); s.arena.name = 'My Hill'; s.setTags(['a', 'b']); s.setObjective('hold_hill');
  const r1 = await lib.save(s, { thumb: 'data:image/jpeg;base64,AAAA' }); ok(r1.item && r1.item.name === 'My Hill' && r1.item.thumb.startsWith('data:'), 'save returns the item');
  assert.strictEqual(lib.status(), 'memory'); ok(!r1.ok, 'with blocked storage the save reports "not saved" instead of pretending');
  ok(lib.list().length === 1, 'the item is held in memory'); s.id = r1.item.id;
  const r2 = await lib.save(s); ok(lib.list().length === 1 && r2.item.id === r1.item.id && r2.item.thumb === r1.item.thumb, 'saving again updates the same item and keeps the thumbnail');
  const dup = await lib.duplicate(r1.item.id); ok(lib.list().length === 2 && dup.id !== r1.item.id && dup.name === 'My Hill copy', 'duplicate');
  ok(lib.rename(dup.id, 'Renamed'), 'rename'); assert.strictEqual(lib.get(dup.id).name, 'Renamed');
  const op = await lib.open(lib.get(dup.id)); assert.strictEqual(op.arena.name, 'Renamed'); assert.strictEqual(op.objective, 'hold_hill'); assert.deepStrictEqual(op.tags, ['a', 'b']);
  lib.remove(dup.id); ok(lib.list().length === 1, 'delete');
  for (let k = 0; k < 50; k++) col_put(ctx, k); function col_put(c, k) { c.save.arenas.put({ id: 'x' + k, name: 'n' + k, code: 'VW1.' }); }
  ok(lib.list().length === 48, 'the library holds at most 48 arenas');
  const d = draftFor(ctx); ok(d.load() === null, 'no draft at first');
  const rec = await makeDraft(s); d.save(rec); const back = await readDraft(d.load()); assert.strictEqual(hashArena(back.arena), hashArena(norm(s.arena))); assert.strictEqual(back.objective, 'hold_hill');
  d.clear(); ok(d.load() === null, 'draft clears'); ok((await readDraft({ code: 'junk' })) === null && (await readDraft(null)) === null, 'a broken draft is ignored');
  const ctx2 = { save: { draft: (k) => { assert.strictEqual(k, 'arena'); return { load: () => 7, save() {}, clear() {} }; } } }; assert.strictEqual(draftFor(ctx2).load(), 7);
}
console.log('arena share/library OK (' + checks + ' checks)');
