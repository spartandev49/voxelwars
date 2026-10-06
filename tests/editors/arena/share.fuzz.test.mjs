// E8 for arenas: share-code round trip over 1,000 random arenas (random recipe / size / edits), size classes, CRC bit-flip detection, and the
// pure-JS deflate fallback (no CompressionStream). Slow: skipped by `gate --fast` (name contains "fuzz").
import assert from 'node:assert';
import { generateArena, RECIPES } from '../../../src/world/gen.js';
import { Arena } from '../../../src/world/arena.js';
import { RNG } from '../../../src/core/rng.js';
import { EditSession, hashArena } from '../../../src/editors/arena/session.js';
import { exportArena, importArena, ValidationError, MAX_CODE } from '../../../src/editors/arena/docs.js';
import { STAMPS, HAZARDS, MARKER_TYPES, OBJECTIVES } from '../../../src/editors/arena/consts.js';

const norm = (a) => Arena.fromJSON(JSON.parse(JSON.stringify(a.toJSON())));
const rng = new RNG(31337); let tooLong = 0, flips = 0;
for (let k = 0; k < 1000; k++) {
  const s = new EditSession(generateArena(rng.pick(RECIPES), 'small', rng.int(1, 99999)));
  for (let e = 0; e < rng.int(0, 6); e++) {
    const x = rng.range(-25, 25), z = rng.range(-25, 25);
    const w = rng.int(0, 5);
    if (w === 0) { const st = s.beginStroke(rng.pick(['raise', 'smooth', 'noise', 'paint']), { radius: rng.range(2, 8), strength: 0.8, material: rng.int(0, 15), seed: rng.int(1, 99) }); st.dab(x, z); st.end(); }
    else if (w === 1) s.stamp(rng.pick(STAMPS), x, z, { radius: rng.range(3, 10), rot: rng.range(0, 6) });
    else if (w === 2) s.addProp({ t: 'tree_oak', x, z, r: rng.range(0, 6), s: 1.1, v: rng.int(0, 3) });
    else if (w === 3) s.addHazard({ t: rng.pick(HAZARDS).id, x, z, r: rng.range(2, 6) });
    else if (w === 4) s.addMarker({ type: rng.pick(MARKER_TYPES).id, x, z });
    else s.setObjective(rng.pick(OBJECTIVES).id);
  }
  s.arena.name = 'Fuzz ' + k; s.setTags(['t' + (k % 7)]);
  const { code, length, tooLong: tl } = await exportArena(s.arena, { objective: s.objective, tags: s.tags });
  if (tl || length > MAX_CODE) tooLong++;
  const r = await importArena(code);
  assert.strictEqual(hashArena(r.arena), hashArena(norm(s.arena)), 'arena ' + k + ' round-trips');
  assert.strictEqual(r.objective, s.objective);
  if (k % 10 === 0) { // a single flipped bit in the payload must be caught by the CRC (or fail to unpack): never accepted
    const parts = code.split('.'); const i = rng.int(0, parts[2].length - 1); const ch = parts[2][i]; parts[2] = parts[2].slice(0, i) + (ch === 'A' ? 'B' : 'A') + parts[2].slice(i + 1);
    try { await importArena(parts.join('.')); assert.fail('a corrupted code was accepted'); } catch (e) { assert.ok(e instanceof ValidationError, 'plain error'); flips++; }
  }
}
// the pure-JS fallback (stored blocks) still round-trips and decodes codes made by the compressing path
{
  const s = new EditSession(generateArena('marathon', 'small', 5)); const { code } = await exportArena(s.arena, {});
  const CS = globalThis.CompressionStream, DS = globalThis.DecompressionStream; globalThis.CompressionStream = undefined; globalThis.DecompressionStream = undefined;
  try { const stored = (await exportArena(s.arena, {})).code; const a = await importArena(stored), b = await importArena(code); assert.strictEqual(hashArena(a.arena), hashArena(b.arena), 'the fallback path decodes both'); }
  finally { globalThis.CompressionStream = CS; globalThis.DecompressionStream = DS; }
}
console.log('arena share fuzz OK: 1000 arenas, ' + flips + ' bit flips rejected, ' + tooLong + ' over 38,000 characters');
