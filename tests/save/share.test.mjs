import assert from 'node:assert';
import { encodeShare, decodeShare, importShare, sizeClass } from '../../src/save/share.js';
import { storedDeflate, inflateSync, deflateRaw, inflateRaw } from '../../src/core/deflate.js';
import { generateArena } from '../../src/world/gen.js';
import { RNG } from '../../src/core/rng.js';
import { validateSoldier, ValidationError } from '../../src/save/validate.js';
import { Arena } from '../../src/world/arena.js';

// stored deflate + pure inflate round trip, incl. > 65535 bytes
for (const n of [0, 1, 100, 70000, 200000]) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = (i * 31) & 255; assert.deepEqual(Array.from(inflateSync(storedDeflate(b))), Array.from(b)); }
// real deflate (CompressionStream) must be readable by the pure inflater too
{ const txt = new TextEncoder().encode('hello hello hello hello '.repeat(500)); const z = await deflateRaw(txt); assert.ok(z.length < txt.length / 5); assert.deepEqual(Array.from(inflateSync(z)), Array.from(txt)); assert.deepEqual(Array.from(await inflateRaw(z)), Array.from(txt)); }

// arena round trip
const a = generateArena('thermopylae', 'small', 4); a.name = 'Test <img onerror=alert(1)>';
const enc = await encodeShare('arena', a); console.log('arena small code', enc.length, enc.cls);
const back = await importShare(enc.code, 'arena', { propTypes: new Set(a.props.map((p) => p.t)) });
assert.deepEqual(Array.from(back.value.h), Array.from(a.h)); assert.equal(back.value.props.length, a.props.length);
// soldier round trip
const sold = { v: 1, id: 'cs_abc', name: 'Sir Chadius', blueprint: { v: 1, id: 'x' }, stats: { hp: 20, damage: 20, speed: 10, armor: 10, morale: 5 }, weapon: 'gladius', abilities: ['kick'], ai: 'charge', text: { catch: 'Hello', deaths: ['a', 'b', 'c'], pitch: 1 } };
const es = await encodeShare('soldier', sold); const bs = await importShare(es.code, 'soldier', { abilities: new Set(['kick']) }); assert.equal(bs.value.name, 'Sir Chadius');
assert.equal(es.cls, 'S');
// wrong type, tamper, truncation
await assert.rejects(() => importShare(es.code, 'arena'), /is for a soldier/);
const flip = es.code.slice(0, 30) + (es.code[30] === 'A' ? 'B' : 'A') + es.code.slice(31); await assert.rejects(() => importShare(flip, 'soldier'), (e) => e instanceof ValidationError);
await assert.rejects(() => importShare(es.code.slice(0, -10), 'soldier'), (e) => e instanceof ValidationError);
// hostile soldier
assert.throws(() => validateSoldier({ name: 'x', stats: { hp: 30, damage: 30, speed: 20, armor: 20, morale: 10 }, blueprint: {} }), /limit is 100/);
assert.throws(() => validateSoldier({ name: 'x', stats: { hp: NaN }, blueprint: {} }), ValidationError);
assert.throws(() => validateSoldier(JSON.parse('{"name":"x","stats":{},"blueprint":{},"__proto__":{}}')), ValidationError);
const hs = validateSoldier({ name: '<script>alert(1)</script>\n\u0000x', stats: { hp: 5 }, blueprint: { v: 1 } }); assert.ok(!/[\n\u0000]/.test(hs.name));
// fuzz: 1000 mutated codes never throw anything but ValidationError and never hang
const rng = new RNG(99); let rejected = 0, accepted = 0;
for (let i = 0; i < 1000; i++) {
  let c = enc.code.split(''); const k = 1 + (i % 4);
  for (let j = 0; j < k; j++) { const p = rng.int(0, c.length - 1); const m = rng.int(0, 3); if (m === 0) c[p] = 'AzZ09-_'[rng.int(0, 6)]; else if (m === 1) c.splice(p, 1); else if (m === 2) c.splice(p, 0, '.'); else c = c.slice(0, p); }
  try { await importShare(c.join(''), 'arena'); accepted++; } catch (e) { assert.ok(e instanceof ValidationError, 'unexpected error type: ' + e); rejected++; }
}
console.log('fuzz: rejected', rejected, 'accepted', accepted); assert.ok(rejected >= 990);
// arena limits: oversize prop list clamps
const big = a.toJSON(); big.props = new Array(5000).fill(['tree_oak', 0, 0, 0, 1, 0]); assert.equal(Arena.fromJSON(big).props.length, 1500);
console.log('share OK');
