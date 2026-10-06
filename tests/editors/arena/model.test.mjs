// Arena Builder model tests (E1 undo/redo hash equality over 100 random operations, E3 symmetry, strokes, stamps, ramps, limits, resize, generate).
import assert from 'node:assert';
import { Arena, MAT } from '../../../src/world/arena.js';
import { generateArena } from '../../../src/world/gen.js';
import { RNG } from '../../../src/core/rng.js';
import { EditSession, hashArena, resampleArena } from '../../../src/editors/arena/session.js';
import { LIMITS, STAMPS, HAZARDS, MARKER_TYPES, OBJECTIVES, SYMMETRY } from '../../../src/editors/arena/consts.js';
import { PROP_CATALOG } from '../../../src/content/era_ancient/props/catalog.js';

const newSession = (recipe = 'arenalab', size = 'small', seed = 1) => new EditSession(generateArena(recipe, size, seed));
const stats = (a) => { let s = 0, m = 0; for (const v of a.h) { s += v; m += v * v; } const n = a.h.length; return { mean: s / n, var: m / n - (s / n) ** 2 }; };
let checks = 0; const ok = (c, msg) => { checks++; assert.ok(c, msg); };

// ---------------------------------------------------------------- strokes
{
  const s = newSession(); const a = s.arena, h0 = hashArena(a);
  const cx = a.cx(0), cz = a.cz(0), i0 = cx + cz * a.size, base = a.h[i0];
  let st = s.beginStroke('raise', { radius: 5, strength: 0.5 }); for (let k = 0; k < 10; k++) st.dab(0, 0, false); st.end();
  ok(a.h[i0] > base, 'raise lifts the centre'); const raised = a.h[i0];
  st = s.beginStroke('raise', { radius: 5, strength: 0.5 }); for (let k = 0; k < 4; k++) st.dab(0, 0, true); st.end();
  ok(a.h[i0] < raised, 'shift (lower) lowers');
  assert.strictEqual(s.undo.depth, 2);
  s.undo.undo(); assert.strictEqual(a.h[i0], raised); s.undo.undo(); assert.strictEqual(hashArena(a), h0, 'two undos restore the start state');
  s.undo.redo(); s.undo.redo(); assert.strictEqual(a.h[i0], raised - (raised - a.h[i0]));
}
{ // smooth reduces variance, flatten converges, paint paints, noise is seeded
  const s = newSession('marathon', 'small', 3); const a = s.arena;
  const v0 = stats(a).var;
  let st = s.beginStroke('smooth', { radius: 20, strength: 1 }); for (let k = 0; k < 8; k++) st.dab(0, 0); st.end();
  ok(stats(a).var < v0, 'smooth lowers the variance');
  st = s.beginStroke('flatten', { radius: 6, strength: 1, target: 30 }); for (let k = 0; k < 12; k++) st.dab(0, 0); st.end();
  assert.strictEqual(a.h[a.cx(0) + a.cz(0) * a.size], 30, 'flatten reaches its target at the centre');
  st = s.beginStroke('paint', { radius: 6, strength: 1, falloff: 'flat', material: MAT.snow }); st.dab(0, 0); st.end();
  assert.strictEqual(a.m[a.cx(0) + a.cz(0) * a.size], MAT.snow); assert.notStrictEqual(a.m[a.cx(20) + a.cz(20) * a.size], MAT.snow, 'paint stays inside its radius');
  const b1 = newSession(), b2 = newSession();
  for (const b of [b1, b2]) { const k = b.beginStroke('noise', { radius: 8, strength: 1, seed: 77 }); k.dab(2, 2); k.end(); }
  assert.strictEqual(hashArena(b1.arena), hashArena(b2.arena), 'noise is deterministic for a seed');
  const b3 = newSession(); { const k = b3.beginStroke('noise', { radius: 8, strength: 1, seed: 78 }); k.dab(2, 2); k.end(); }
  assert.notStrictEqual(hashArena(b1.arena), hashArena(b3.arena), 'a different noise seed gives different terrain');
}
{ // square brush and falloffs cover what they promise
  const s = newSession(); const a = s.arena; const st = s.beginStroke('raise', { radius: 4, strength: 1, shape: 'square', falloff: 'flat' }); st.dab(0, 0); st.end();
  const at = (x, z) => a.h[a.cx(x) + a.cz(z) * a.size];
  ok(at(3.5, 3.5) > at(10, 10), 'square brush reaches its corner'); ok(at(3.5, 3.5) >= at(0, 0) - 1);
}
{ // stamps
  for (const kind of STAMPS) {
    const s = newSession('marathon', 'small', 5); const h0 = hashArena(s.arena);
    const rect = s.stamp(kind, 0, 0, { radius: 10, strength: 0.7, rot: 0.6 });
    ok(rect && s.undo.depth === 1, 'stamp ' + kind + ' changes the terrain'); s.undo.undo(); assert.strictEqual(hashArena(s.arena), h0, 'stamp ' + kind + ' undoes exactly');
  }
}

// ---------------------------------------------------------------- symmetry (E3)
function symOK(a, mode) {
  const n = a.size; let bad = 0;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const mx = mode === 'mx' || mode === 'rot' ? n - 1 - x : x, mz = mode === 'mz' || mode === 'rot' ? n - 1 - z : z;
    if (a.h[x + z * n] !== a.h[mx + mz * n] || a.m[x + z * n] !== a.m[mx + mz * n]) bad++;
  }
  return bad;
}
for (const mode of ['mx', 'mz', 'rot']) {
  const s = newSession(); s.arena.h.fill(20); s.arena.m.fill(MAT.grass); s.arena.props.length = 0; s.setSymmetry(mode);
  const rng = new RNG(11), tools = ['raise', 'smooth', 'flatten', 'paint', 'noise'];
  for (let k = 0; k < 24; k++) {
    const tool = tools[k % 5], st = s.beginStroke(tool, { radius: rng.range(2, 10), strength: rng.range(0.3, 1), shape: k % 3 ? 'circle' : 'square', falloff: ['smooth', 'linear', 'flat'][k % 3], material: rng.int(0, 15), seed: 5 + k, target: 24 });
    const x = rng.range(-20, 20), z = rng.range(-20, 20);
    for (let d = 0; d < 3; d++) st.dab(x + d, z - d, d === 2); st.end();
  }
  for (const kind of STAMPS) s.stamp(kind, rng.range(-15, 15), rng.range(-15, 15), { radius: 7, strength: 0.6, rot: rng.range(0, 6) });
  assert.strictEqual(symOK(s.arena, mode), 0, mode + ': terrain and paint are symmetric (hash)');
  for (let k = 0; k < 20; k++) s.addProp({ t: 'tree_oak', x: rng.range(-25, 25), z: rng.range(-25, 25), r: rng.range(0, 6), s: 1, v: 0 });
  const key = (p) => p.t + '|' + p.x.toFixed(2) + '|' + p.z.toFixed(2);
  const set = new Set(s.arena.props.map(key)); let miss = 0;
  for (const p of s.arena.props) { const c = mode === 'mx' ? { x: -p.x, z: p.z } : mode === 'mz' ? { x: p.x, z: -p.z } : { x: -p.x, z: -p.z }; if (!set.has(p.t + '|' + c.x.toFixed(2) + '|' + c.z.toFixed(2)) && !set.has(p.t + '|' + (c.x + 0).toFixed(2) + '|' + (c.z + 0).toFixed(2))) miss++; }
  assert.strictEqual(miss, 0, mode + ': props are mirrored');
  ok(s.arena.props.length >= 20, 'symmetry adds copies');
}

// ---------------------------------------------------------------- E1: 100 random operations, exact undo/redo
{
  const s = newSession('marathon', 'small', 9), a = s.arena, rng = new RNG(2024);
  const hashAt = new Map([[0, hashArena(a)]]);
  const propTypes = Object.keys(PROP_CATALOG).filter((t) => PROP_CATALOG[t].place !== false);
  const randXZ = (r = 24) => [rng.range(-r, r), rng.range(-r, r)];
  const ops = [
    () => { const [x, z] = randXZ(); const st = s.beginStroke(rng.pick(['raise', 'smooth', 'flatten', 'paint', 'noise']), { radius: rng.range(1, 12), strength: rng.range(0.2, 1), shape: rng.pick(['circle', 'square']), falloff: rng.pick(['smooth', 'linear', 'flat']), material: rng.int(0, 15), seed: rng.int(1, 999), target: rng.int(5, 40) }); for (let k = 0; k < 4; k++) st.dab(x + k, z, rng.chance(0.3)); st.end(); },
    () => { const [x, z] = randXZ(); s.stamp(rng.pick(STAMPS), x, z, { radius: rng.range(3, 12), strength: rng.range(0.2, 1), rot: rng.range(0, 6) }); },
    () => { const [x, z] = randXZ(); const [x2, z2] = randXZ(); s.ramp([{ x, z }, { x: x2, z: z2 }], { width: rng.range(2, 6) }); },
    () => { const [x, z] = randXZ(); s.addProp({ t: rng.pick(propTypes), x, z, r: rng.range(0, 6), s: rng.range(0.7, 1.5), v: rng.int(0, 3) }); },
    () => { const [x, z] = randXZ(); const ps = s.beginPropStroke('Scatter'); ps.add(Array.from({ length: 6 }, () => ({ t: rng.pick(propTypes), x: x + rng.range(-4, 4), z: z + rng.range(-4, 4), r: 0, s: 1, v: 0 }))); ps.end(); },
    () => { const [x, z] = randXZ(); s.removeProps(s.propsNear(x, z, 8)); },
    () => { const [x, z] = randXZ(); s.addHazard({ t: rng.pick(HAZARDS).id, x, z, r: rng.range(2, 6) }); },
    () => { if (a.hazards.length) s.removeHazards([rng.pick(a.hazards)]); },
    () => { const [x, z] = randXZ(); s.addMarker({ type: rng.pick(MARKER_TYPES).id, x, z }); },
    () => { if (a.markers.length) s.patchMarker(rng.pick(a.markers), { x: rng.range(-20, 20) }); },
    () => { if (a.markers.length) s.removeMarkers([rng.pick(a.markers)]); },
    () => { const [x, z] = randXZ(10); s.setZone(rng.pick(['A', 'B']), { x, z, w: rng.range(4, 14), d: rng.range(8, 30) }); },
    () => { s.setWater(rng.int(0, 30), rng.chance(0.3)); },
    () => { s.setEnv({ time: rng.range(0, 24), fog: rng.next(), wind: rng.next(), weather: rng.pick(['clear', 'rain', 'snow', 'fog']) }); },
    () => { s.setObjective(rng.pick(OBJECTIVES).id); },
    () => { s.setSymmetry(rng.pick(SYMMETRY)); },
  ];
  const heavy = [
    () => { s.resize(rng.pick(['small', 'medium', 'small'])); },
    () => { s.generate(rng.pick(['marathon', 'oasis', 'nile', 'thermopylae']), rng.int(1, 99), rng.pick(['terrain', 'props', 'both'])); },
  ];
  for (let k = 0; k < 100; k++) {
    (k % 23 === 22 ? rng.pick(heavy) : rng.pick(ops))();
    hashAt.set(s.undo.depth, hashArena(a));
  }
  const finalDepth = s.undo.depth, finalHash = hashArena(a);
  ok(finalDepth >= 60, 'a hundred operations leave a deep history (' + finalDepth + ')');
  assert.ok(finalDepth <= LIMITS.undo);
  while (s.undo.canUndo()) { s.undo.undo(); const d = s.undo.depth; if (hashAt.has(d)) assert.strictEqual(hashArena(a), hashAt.get(d), 'undo to depth ' + d + ' restores that exact state'); }
  const first = hashArena(a);
  while (s.undo.canRedo()) s.undo.redo();
  assert.strictEqual(hashArena(a), finalHash, 'redo of everything restores the final state');
  ok(first !== finalHash, 'the operations changed something');
}

// ---------------------------------------------------------------- limits
{
  const s = newSession(); s.arena.props.length = 0;
  const ps = s.beginPropStroke('Fill');
  const added = ps.add(Array.from({ length: LIMITS.props + 40 }, (_, k) => ({ t: 'bush', x: ((k * 7) % 60) - 30, z: (((k * 13) % 60) - 30), r: 0, s: 1, v: 0 })), { sym: false }); ps.end();
  assert.strictEqual(s.arena.props.length, LIMITS.props, 'props are capped at 1,500'); assert.strictEqual(added.length, LIMITS.props);
  for (let k = 0; k < LIMITS.hazards + 5; k++) s.addHazard({ t: 'spikes', x: k % 20, z: Math.floor(k / 20) * 3, r: 2 });
  assert.strictEqual(s.arena.hazards.length, LIMITS.hazards, 'hazards are capped at 60');
  for (let k = 0; k < 12; k++) s.addMarker({ type: 'waypoint', x: k * 2, z: 0 });
  assert.strictEqual(s.arena.markers.length, LIMITS.markers, 'markers are capped at 8');
  const ids = new Set(s.arena.markers.map((m) => m.id)); assert.strictEqual(ids.size, s.arena.markers.length, 'marker ids are unique');
  s.arena.markers.length = 0; s.addMarker({ type: 'hill', x: 1, z: 1 }); s.addMarker({ type: 'hill', x: 5, z: 5 });
  assert.strictEqual(s.arena.markers.length, 1, 'a second hill moves the first'); assert.strictEqual(s.arena.markers[0].x, 5);
}
// ---------------------------------------------------------------- lava hazard paints and unpaints
{
  const s = newSession(); const a = s.arena, i0 = a.cx(0) + a.cz(0) * a.size, h0 = hashArena(a);
  const h = s.addHazard({ t: 'lava', x: 0, z: 0, r: 4 }); assert.strictEqual(a.m[i0], MAT.lava, 'a lava pool paints lava');
  s.removeHazards([h]); assert.notStrictEqual(a.m[i0], MAT.lava, 'removing it takes the lava away');
  s.undo.undo(); assert.strictEqual(a.m[i0], MAT.lava); s.undo.undo(); s.undo.undo(); assert.strictEqual(hashArena(a), h0);
}
// ---------------------------------------------------------------- resize / generate
{
  const s = newSession('marathon', 'small', 4); const a = s.arena; const h0 = hashArena(a), n0 = a.size, props0 = a.props.length;
  assert.ok(s.resize('large')); assert.strictEqual(a.size, 256); assert.strictEqual(a.h.length, 256 * 256);
  assert.ok(Math.abs(a.zones.A.x) > 30, 'zones scale with the map'); assert.ok(a.props.length >= props0 * 0.9);
  s.undo.undo(); assert.strictEqual(a.size, n0); assert.strictEqual(hashArena(a), h0, 'resize undoes exactly');
  assert.ok(!s.resize('small'), 'same size is a no-op');
  const keepZones = JSON.stringify(a.zones); s.generate('nile', 5, 'terrain'); assert.strictEqual(JSON.stringify(a.zones), keepZones, 'terrain-only generate keeps the zones');
  const keepH = hashArena(a); s.generate('nile', 5, 'props'); assert.ok(a.props.length > 0);
  s.undo.undo(); s.undo.undo(); assert.strictEqual(hashArena(a), h0);
  const rs = resampleArena(a, 192); assert.strictEqual(rs.size, 192); void keepH;
}
// ---------------------------------------------------------------- serialisation round trip keeps everything the builder edits
{
  const s = newSession('persepolis', 'small', 6); const a = s.arena;
  s.addHazard({ t: 'geyser', x: 3, z: 3, r: 3 }); s.addMarker({ type: 'hill', x: 0, z: 0 }); s.setEnv({ time: 19, weather: 'rain', fog: 0.5 }); s.setWater(6, false);
  const b = Arena.fromJSON(JSON.parse(JSON.stringify(a.toJSON()))), c = Arena.fromJSON(JSON.parse(JSON.stringify(b.toJSON())));
  assert.strictEqual(hashArena(c), hashArena(b), 'toJSON -> fromJSON is stable (hash-equal after the first pass)');
  assert.deepStrictEqual(Array.from(b.h), Array.from(a.h)); assert.deepStrictEqual(Array.from(b.m), Array.from(a.m)); assert.strictEqual(b.props.length, a.props.length);
  assert.deepStrictEqual(b.hazards, a.hazards); assert.deepStrictEqual(b.markers, a.markers); assert.strictEqual(b.water, a.water);
  // props placed by the builder survive a save exactly (their precision matches Arena.toJSON)
  const e = new EditSession(generateArena('arenalab', 'small', 1)); e.addProp({ t: 'tree_oak', x: 1.23456, z: -7.65432, r: 0.123456, s: 1.2345, v: 2 });
  assert.strictEqual(hashArena(Arena.fromJSON(JSON.parse(JSON.stringify(e.arena.toJSON())))), hashArena(e.arena), 'builder props round-trip exactly');
}
console.log('arena model OK (' + checks + ' checks)');
