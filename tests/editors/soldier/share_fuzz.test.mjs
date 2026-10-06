// Hostile soldier imports (E7) and CRC detection (E8): 1,000 corrupted codes + 1,500 structurally hostile payloads with a VALID check value.
// Nothing may throw anything but ValidationError, nothing may hang, and whatever is accepted must satisfy every limit of spec §5.1.
import assert from 'node:assert/strict';
import { importShare, decodeShare, encodeShare, packSoldier, MAGIC } from '../../../src/save/share.js';
import { ValidationError } from '../../../src/save/validate.js';
import { crc32hex } from '../../../src/core/crc32.js';
import { b64uEncode } from '../../../src/core/base64url.js';
import { deflateRaw } from '../../../src/core/deflate.js';
import * as C from '../../../src/content/era_ancient/custom.js';
import { randomBlueprint, DIM } from '../../../src/content/era_ancient/blueprints.js';
import { VoxelGrid, V } from '../../../src/voxel/grid.js';
import { RNG } from '../../../src/core/rng.js';

const enc = new TextEncoder();
async function rawCode(type, obj) { const packed = await deflateRaw(enc.encode(JSON.stringify(obj))); return `${MAGIC}.${type}.${b64uEncode(packed)}.${crc32hex(packed)}`; }

const rng = new RNG(77);
const bp = randomBlueprint(rng, { name: 'Victim' }); bp.id = 'cs_victim';
{ const g = new VoxelGrid(...DIM.head.size); for (let k = 0; k < 200; k++) g.d[rng.int(0, g.d.length - 1)] = V(rng.int(0, 0xffffff)); bp.paint = { head: g.toRLE() }; }
const cs = { v: 1, id: 'cs_victim', name: 'Victim', blueprint: bp, stats: { hp: 10, damage: 10, attackSpeed: 5, speed: 5, armor: 5, range: 5, morale: 5 }, abilities: C.legalAbilityIds(bp).slice(0, 1), ai: 'charge', height: 1.1, text: { catch: 'Hi', deaths: ['a', 'b', 'c'], pitch: 1 } };
const good = await encodeShare('soldier', cs); console.log('victim code', good.length, good.cls);
await importShare(good.code, 'soldier', {});

// ---- 1,000 corrupted codes (char flips, drops, inserts, truncation): all rejected with ValidationError; CRC catches single-bit flips every time
let rejected = 0, accepted = 0;
for (let i = 0; i < 1000; i++) {
  let c = good.code.split(''); const k = 1 + (i % 4);
  for (let j = 0; j < k; j++) { const p = rng.int(0, c.length - 1), m = rng.int(0, 4); if (m === 0) c[p] = 'AzZ09-_'[rng.int(0, 6)]; else if (m === 1) c.splice(p, 1); else if (m === 2) c.splice(p, 0, '.'); else if (m === 3) c = c.slice(0, p); else c.splice(p, 0, '<script>'); }
  try { await importShare(c.join(''), 'soldier', {}); accepted++; } catch (e) { assert.ok(e instanceof ValidationError, 'only ValidationError: ' + e); assert.ok(String(e.message).length > 8 && !/undefined|\[object/.test(e.message), 'human message: ' + e.message); rejected++; }
}
console.log('corrupt codes: rejected', rejected, 'accepted', accepted); assert.ok(rejected >= 990);
// every single base64 character flip inside the payload is caught by the CRC (negative control: with the CRC rewritten it would not be)
{ const [m, t, body, crc] = good.code.split('.'); let caught = 0, total = 0;
  for (let i = 0; i < body.length; i += Math.max(1, Math.floor(body.length / 150))) { const ch = body[i] === 'A' ? 'B' : 'A'; total++; try { await decodeShare([m, t, body.slice(0, i) + ch + body.slice(i + 1), crc].join('.')); } catch (e) { if (e instanceof ValidationError && /damaged/.test(e.message)) caught++; } }
  assert.equal(caught, total, 'CRC detects every flipped character'); }

// ---- 1,500 hostile payloads that carry a VALID check value: structure mutations
const WEIRD = [null, true, false, 0, -1, 1e308, -1e308, 4294967296, 0.5, '', 'x', '<img src=x onerror=alert(1)>', '__proto__', 'constructor', [], {}, [1, 2, 3], { a: 1 }, ['kick', 'kick', 'kick'], 'a'.repeat(5000), { __proto__: { x: 1 } }, [[[[[[]]]]]], { sx: 1, sy: 1, sz: 1, rle: [1, 1] }];
function mutate(o, r, depth = 0) {
  if (o === null || typeof o !== 'object' || depth > 6) return;
  const keys = Object.keys(o); if (!keys.length) return;
  const k = keys[r.int(0, keys.length - 1)], m = r.int(0, 5);
  if (m === 0) o[k] = WEIRD[r.int(0, WEIRD.length - 1)]; else if (m === 1) delete o[k]; else if (m === 2 && typeof o[k] === 'object') mutate(o[k], r, depth + 1); else if (m === 3) o['k' + r.int(0, 99)] = WEIRD[r.int(0, WEIRD.length - 1)]; else if (m === 4 && typeof o[k] === 'number') o[k] = o[k] * (r.chance(0.5) ? 1000 : -1); else if (typeof o[k] === 'object') mutate(o[k], r, depth + 1);
}
let ok = 0, bad = 0;
for (let i = 0; i < 1500; i++) {
  const o = JSON.parse(JSON.stringify(packSoldier(cs))), n = 1 + (i % 5);
  for (let j = 0; j < n; j++) mutate(o, rng);
  if (i % 7 === 0) o.__proto__ = undefined;
  let code; try { code = await rawCode('soldier', JSON.parse(JSON.stringify(o).replace('"__proto__":', '"__proto__":'))); } catch (e) { continue; }
  try {
    const r = await importShare(code, 'soldier', {});
    const s = r.value; ok++;
    // whatever got in obeys every limit of spec §5.1
    assert.ok(s.name.length >= 1 && s.name.length <= 40, 'name'); assert.ok(typeof s.id === 'string' && /^cs_[a-z0-9_]+$/.test(s.id), 'id ' + s.id);
    assert.ok(C.statsTotal(s.stats) <= 100 && C.STAT_KEYS.every((k) => Number.isInteger(s.stats[k]) && s.stats[k] >= 0 && s.stats[k] <= C.STAT_CAPS[k]), 'stats');
    assert.ok(s.abilities.length <= 2 && C.legalAbilityIds(s.blueprint).length >= s.abilities.length, 'abilities'); for (const a of s.abilities) assert.equal(C.abilityReason(a, s.blueprint), '');
    assert.ok(s.height >= 0.9 && s.height <= 1.2 && (s.radius === undefined || (s.radius >= 0.3 && s.radius <= 0.7)), 'height/radius');
    assert.ok(s.text.catch.length <= 40 && s.text.deaths.length === 3 && s.text.deaths.every((d) => d.length <= 40) && s.text.pitch >= 0.7 && s.text.pitch <= 1.4, 'text');
    for (const pid of Object.keys(s.blueprint.paint)) { const p = s.blueprint.paint[pid]; assert.ok(DIM[pid] && p.sx === DIM[pid].size[0] && p.sy === DIM[pid].size[1] && p.sz === DIM[pid].size[2], 'paint grid'); }
    const def = C.customDef(s); assert.ok(def.radius >= 0.3 && def.radius <= 0.7 && def.cost > 0, 'def');
    const c = C.compileCustom(s); assert.ok(c.compiled.parts <= 48 && c.compiled.reach <= 3.6 + 1e-6);
    assert.ok(Object.getPrototypeOf(s) === null && ({}).polluted === undefined);
  } catch (e) { assert.ok(e instanceof ValidationError, 'only ValidationError (got ' + (e && e.stack || e) + ')'); assert.ok(e.message.length > 8); bad++; }
}
console.log('hostile payloads: accepted-and-clamped', ok, 'rejected', bad); assert.ok(ok + bad >= 1400 && bad > 300);
// the prototype was never polluted
assert.equal(({}).x, undefined); assert.equal(Object.prototype.sx, undefined);
console.log('soldier share fuzz OK');
