// Soldier validators and share codes (E7 hostile imports, E8 round trip, E9 locks, E10 one validator): checkSoldier / validateSoldier / VW1.soldier codes.
import assert from 'node:assert/strict';
import { checkSoldier, validateSoldier, ValidationError } from '../../../src/save/validate.js';
import { encodeShare, decodeShare, importShare, packSoldier, sizeClass, MAX_CODE } from '../../../src/save/share.js';
import * as C from '../../../src/content/era_ancient/custom.js';
import { randomBlueprint, defaultBlueprint, PART_REGISTRY, DIM, PART_ORDER } from '../../../src/content/era_ancient/blueprints.js';
import { VoxelGrid, V } from '../../../src/voxel/grid.js';
import { RNG } from '../../../src/core/rng.js';

const base = () => { const cs = C.newSoldier(new RNG(42)); cs.name = 'Sir Chadius the Mildly Concerned'.slice(0, 40); return cs; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const errs = (o, ctx) => checkSoldier(o, ctx).errors.join(' | ');

// ---- a good soldier passes untouched, with defaults filled in
{
  const r = checkSoldier(base()); assert.ok(r.ok, r.errors.join(' '));
  const s = r.soldier; assert.equal(s.v, 1); assert.equal(s.name.length <= 40, true); assert.equal(s.text.deaths.length, 3); assert.ok(s.height === 1);
  assert.equal(C.statsTotal(s.stats) <= 100, true); assert.equal(Object.getPrototypeOf(s), null, 'null-prototype object');
  const minimal = checkSoldier({ name: 'Min', blueprint: { v: 1 } }); assert.ok(minimal.ok, minimal.errors.join(' ')); assert.match(minimal.soldier.id, /^cs_[a-z0-9]+$/); assert.equal(minimal.soldier.blueprint.main, 'none');
}
// ---- name 1-40
assert.match(errs({ ...base(), name: '' }), /needs a name/); assert.match(errs({ ...base(), name: '   ' }), /needs a name/); assert.match(errs({ ...base(), name: 12 }), /needs a name/);
assert.match(errs({ ...base(), name: 'x'.repeat(41) }), /41 characters; the limit is 40/); assert.ok(checkSoldier({ ...base(), name: 'x'.repeat(40) }).ok);
{ const r = checkSoldier({ ...base(), name: '<img src=x onerror=alert(1)>\n\u0000' + String.fromCharCode(0x2028) + 'x' }); assert.ok(r.ok); assert.ok(!/[\n\u0000]/.test(r.soldier.name) && r.soldier.name.indexOf(String.fromCharCode(0x2028)) < 0); assert.ok(r.soldier.name.includes('<img'), 'markup is data; the UI renders it with textContent'); }
// ---- stats: caps (clamped with a warning), NaN/Infinity rejected, total <= 100
{ const r = checkSoldier({ ...base(), stats: { hp: 99, damage: 0 } }); assert.ok(r.ok); assert.equal(r.soldier.stats.hp, 30); assert.match(r.warnings.join(' '), /capped at 30/); }
assert.match(errs({ ...base(), stats: { hp: NaN } }), /not a valid number/); assert.match(errs({ ...base(), stats: { hp: Infinity } }), /not a valid number/); assert.match(errs({ ...base(), stats: { hp: '5' } }), /not a valid number/);
assert.match(errs({ ...base(), stats: { hp: 30, damage: 30, attackSpeed: 20, speed: 20, armor: 20, range: 10, morale: 10 } }), /add up to 140; the limit is 100/);
assert.ok(checkSoldier({ ...base(), stats: { hp: 30, damage: 30, attackSpeed: 20, speed: 20, armor: 0, range: 0, morale: 0 } }).ok, '100 exactly is fine');
assert.equal(checkSoldier({ ...base(), stats: { hp: -4.4, damage: 3.6 } }).soldier.stats.damage, 4);
assert.match(errs({ ...base(), stats: 7 }), /seven numbers/); assert.match(errs({ ...base(), stats: JSON.parse('{"__proto__":{"x":1}}') }), /seven numbers/);
// ---- abilities: <= 2, known, legal for the weapon, unique
{ const cs = base(); cs.blueprint.main = 'gladius';
  assert.ok(checkSoldier({ ...cs, abilities: ['kick', 'rage'] }).ok);
  assert.match(errs({ ...cs, abilities: ['kick', 'rage', 'net'] }), /at most 2 abilities/);
  assert.match(errs({ ...cs, abilities: ['teleport'] }), /Unknown ability 'teleport'/); assert.match(errs({ ...cs, abilities: ['kick', 'kick'] }), /listed twice/);
  assert.match(errs({ ...cs, abilities: ['heal_pulse'] }), /staff or a scepter/); assert.match(errs({ ...cs, abilities: [5] }), /must be text/);
  assert.match(errs({ ...cs, abilities: ['__proto__'] }), /Unknown ability/); assert.match(errs({ ...cs, abilities: 'kick' }), /must be a list/);
  cs.blueprint.main = 'longbow'; assert.match(errs({ ...cs, abilities: ['kick'] }), /Bow weapon/);
  assert.match(errs({ ...cs, abilities: ['kick'] }, { abilities: new Set(['rage']) }), /Unknown ability/); }
// ---- radius and height clamps, ai
{ const r = checkSoldier({ ...base(), radius: 5, height: 9 }); assert.ok(r.ok); assert.equal(r.soldier.radius, 0.7); assert.equal(r.soldier.height, 1.2); assert.equal(r.warnings.length >= 2, true);
  const r2 = checkSoldier({ ...base(), radius: 0.01, height: 0.1 }); assert.equal(r2.soldier.radius, 0.3); assert.equal(r2.soldier.height, 0.9);
  assert.match(errs({ ...base(), radius: 'wide' }), /radius is not a valid number/); assert.match(errs({ ...base(), height: NaN }), /height is not a valid number/);
  const r3 = checkSoldier({ ...base(), ai: 'berserk' }); assert.ok(r3.ok); assert.equal(r3.soldier.ai, 'charge'); assert.match(r3.warnings.join(' '), /AI style 'berserk'/); }
// ---- personality: lengths clamp, three last words, pitch clamp
{ const r = checkSoldier({ ...base(), text: { catch: 'c'.repeat(60), deaths: ['a'.repeat(50), 'b'], pitch: 5 } }); assert.ok(r.ok); assert.equal(r.soldier.text.catch.length, 40); assert.equal(r.soldier.text.deaths.length, 3); assert.ok(r.soldier.text.deaths.every((d) => d.length <= 40)); assert.equal(r.soldier.text.pitch, 1.4);
  assert.match(errs({ ...base(), text: { pitch: 'high' } }), /pitch is not a valid number/); assert.match(errs({ ...base(), text: { deaths: 'bye' } }), /must be a list/); }
// ---- blueprint: unknown ids with suggestions, locked parts (E9), paint grid size and cap
{ const cs = base(); cs.blueprint.head.helm = 'corinthin'; assert.match(errs(cs), /Did you mean 'corinthian'/);
  const cs2 = base(); cs2.blueprint.head.helm = 'colander'; assert.ok(checkSoldier(cs2).ok, 'no lock enforcement without a progress set'); assert.match(errs(cs2, { unlocked: new Set() }), /locked\. Unlocked by finishing campaign mission 3/); assert.ok(checkSoldier(cs2, { unlocked: new Set(['silly_helms']) }).ok);
  const cs3 = base(); cs3.blueprint.main = 'frying_pan'; assert.match(errs(cs3, { unlocked: [] }), /mission 5/); cs3.blueprint.back = 'wings'; assert.match(errs(cs3, { unlocked: ['silly_weapons'] }), /finishing the campaign/);
  const cs4 = base(); cs4.blueprint.paint = { head: { sx: 9, sy: 10, sz: 10, rle: [900, 0] } }; assert.match(errs(cs4), /grid must be 10x10x10/);
  const cs5 = base(); cs5.blueprint.paint = { wing: { sx: 1, sy: 1, sz: 1, rle: [1, 1] } }; assert.match(errs(cs5), /not a part of the soldier/);
  const cs6 = base(); cs6.blueprint.paint = JSON.parse('{"__proto__":{"sx":1}}'); assert.match(errs(cs6), /forbidden key/);
  const cs7 = base(); cs7.blueprint.paint = { constructor: { sx: 1, sy: 1, sz: 1, rle: [1, 1] } }; assert.ok(!checkSoldier(cs7).ok);
  const big = new VoxelGrid(...DIM.weapon.size); for (let i = 0; i < 1600; i++) big.d[i] = V(0xff0000 + i); const cs8 = base(); cs8.blueprint.paint = { weapon: big.toRLE() }; assert.match(errs(cs8), /over the limit of 1500 per part/);
  const cs9 = base(); cs9.blueprint.main = 'dory'; cs9.weapon = 'fish'; assert.equal(checkSoldier(cs9).soldier.blueprint.main, 'dory', 'the weapon lives only in blueprint.main');
  const legacy = { name: 'Old', stats: { hp: 5 }, blueprint: { v: 1, id: 'x' }, weapon: 'gladius', abilities: ['kick'] }; assert.ok(checkSoldier(legacy).ok, 'pre-D13 files: the top-level weapon is adopted when the blueprint has none'); }
// ---- structure
for (const g of [null, undefined, 5, 'x', [], true]) assert.ok(!checkSoldier(g).ok);
assert.match(errs({ ...base(), v: 2 }), /newer game version/); assert.match(errs(JSON.parse('{"__proto__":{"a":1},"name":"x"}')), /forbidden key/);
assert.match(errs({ ...base(), blueprint: null }), /no appearance/); assert.match(errs({ ...base(), blueprint: 'hoplite' }), /must be an object/);
{ const r = checkSoldier({ ...base(), name: '', stats: { hp: NaN }, abilities: ['x'], blueprint: null }); assert.ok(r.errors.length >= 4, 'every problem is collected: ' + r.errors.length); }
{ const r = checkSoldier({ ...base(), id: 'hoplite' }); assert.ok(r.ok); assert.match(r.soldier.id, /^cs_/, 'ids are always cs_*: a shipped id cannot be claimed'); assert.match(r.warnings.join(' '), /id was not valid/); }
assert.throws(() => validateSoldier({ ...base(), name: '' }), (e) => e instanceof ValidationError && /needs a name/.test(e.message));
assert.throws(() => validateSoldier({ ...base(), name: '', stats: { hp: 30, damage: 30, attackSpeed: 20, speed: 20, armor: 20 } }), /and 1 more problem/);
{ const s = validateSoldier(base()); assert.deepEqual(s.warnings, []); }

// ---- share: S-class round trip with exact equality (E8), size classes
{
  const cs = base(); cs.abilities = ['kick']; cs.blueprint.main = 'gladius'; cs.text = { catch: 'Hi', deaths: ['a', 'b', 'c'], pitch: 1.1 }; cs.height = 1.1;
  const enc = await encodeShare('soldier', cs); assert.equal(enc.cls, 'S'); assert.ok(!enc.tooLong); assert.match(enc.code, /^VW1\.soldier\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  const back = await importShare(enc.code, 'soldier', {});
  assert.deepEqual(JSON.parse(JSON.stringify(back.value)), JSON.parse(JSON.stringify(checkSoldier(cs).soldier)));
  assert.equal(JSON.stringify(packSoldier(cs)).includes('thumb'), false);
  assert.equal(sizeClass(1800), 'S'); assert.equal(sizeClass(1801), 'M'); assert.equal(sizeClass(8000), 'M'); assert.equal(sizeClass(8001), 'L'); assert.equal(sizeClass(MAX_CODE), 'L'); assert.equal(sizeClass(MAX_CODE + 1), 'XL');
  // a thumbnail or a cost in the saved item never travels
  const saved = { ...cs, thumb: 'data:image/jpeg;base64,' + 'A'.repeat(500), cost: 1, savedAt: 5 }; const e2 = await encodeShare('soldier', saved); assert.equal(e2.code, enc.code);
  // wrong type
  await assert.rejects(() => importShare(enc.code, 'arena'), /is for a soldier, but you are importing an arena/);
}
// ---- 1,000 random soldiers round trip (E8) + the size limit (painted soldiers over 38,000 characters are flagged, not lost)
{
  const rng = new RNG(2026); let L = 0, M = 0, S = 0;
  for (let i = 0; i < 1000; i++) {
    const bp = randomBlueprint(rng, { name: 'Fuzz ' + i }); bp.id = 'cs_z' + i.toString(36);
    const st = {}; let left = 100; for (const k of C.STAT_KEYS) { const v = Math.min(left, rng.int(0, C.STAT_CAPS[k])); st[k] = v; left -= v; }
    const cs = { v: 1, id: bp.id, name: 'Fuzz ' + i, blueprint: bp, stats: st, abilities: C.legalAbilityIds(bp).slice(0, rng.int(0, 2)), ai: rng.pick(C.AI_STYLES), height: +rng.range(0.9, 1.2).toFixed(2), text: { catch: 'Hello ' + i, deaths: ['a', 'b', 'c'], pitch: +rng.range(0.7, 1.4).toFixed(2) } };
    if (i % 5 === 0) { const g = new VoxelGrid(...DIM.body.size); for (let k = 0; k < 120; k++) g.d[rng.int(0, g.d.length - 1)] = V(rng.int(0, 0xffffff)); cs.blueprint.paint = { body: g.toRLE() }; }
    const enc = await encodeShare('soldier', cs); assert.ok(enc.length <= MAX_CODE, 'size ' + enc.length); if (enc.cls === 'S') S++; else if (enc.cls === 'M') M++; else L++;
    const back = await importShare(enc.code, 'soldier', {});
    assert.deepEqual(JSON.parse(JSON.stringify(back.value)), JSON.parse(JSON.stringify(checkSoldier(cs).soldier)), 'round trip #' + i);
  }
  console.log('1000 soldiers: S', S, 'M', M, 'L', L);
  // noise paint in many parts -> too long for a text code, still decodes from a file (parser limit 400,000)
  const bp = defaultBlueprint(); bp.id = 'cs_huge'; bp.paint = {};
  for (const pid of ['body', 'head', 'crest', 'back', 'weapon', 'offhand', 'cape', 'legUL', 'legLL']) { const g = new VoxelGrid(...DIM[pid].size); let n = 0; for (let k = 0; k < g.d.length && n < 1400; k++) if (rng.chance(0.9)) { g.d[k] = V(rng.int(0, 0xffffff)); n++; } bp.paint[pid] = g.toRLE(); }
  const huge = { v: 1, id: 'cs_huge', name: 'Huge', blueprint: bp, stats: { hp: 5 }, abilities: [], text: {} };
  const e = await encodeShare('soldier', huge); assert.ok(e.tooLong && e.cls === 'XL', 'noise paint exceeds 38,000: ' + e.length);
  const b2 = await importShare(e.code, 'soldier', {}); assert.equal(Object.keys(b2.value.blueprint.paint).length, 9);
}
console.log('soldier share OK');
