// Blueprint compiler: U2 (every shipped humanoid compiles within the model limits), validation, determinism, painting, weapon length rule,
// unlock gating (E9) and a 1,000-blueprint fuzz.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VoxelGrid } from '../../src/voxel/grid.js';
import {
  compileSoldier, validateBlueprint, defaultBlueprint, randomBlueprint, applyPaint, diffPaint, buildPartGrids, restBounds, PART_REGISTRY, DIM, PART_ORDER,
  PAINT_CAP, PAINT_ERASE, BlueprintError, compileForDef,
} from '../../src/content/era_ancient/blueprints.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import { RNG } from '../../src/core/rng.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EPS = 1e-6;

/** U2 checks on one compiled soldier. */
function checkU2(id, c, { mounted = false } = {}) {
  assert.ok(c.parts <= (mounted ? 48 : 24), `${id}: ${c.parts} parts`);
  assert.ok(c.height >= 2.4 - EPS && c.height <= 3.4 + EPS, `${id}: height ${c.height.toFixed(3)} outside 2.4-3.4 u`);
  assert.ok(c.voxels >= 600 && c.voxels <= 6000, `${id}: ${c.voxels} voxels outside 600-6000`);
  const m = c.model;
  for (const p of m.parts) {
    const d = DIM[p.id];
    assert.deepEqual([p.grid.sx, p.grid.sy, p.grid.sz], d.size, `${id}: ${p.id} is not on the canonical grid`);
    const b = restBounds(m, (q) => q === p.id);
    assert.ok(b.min[1] >= -EPS, `${id}: part ${p.id} extends below the foot plane (y ${b.min[1].toFixed(3)})`);
  }
  if (m.byId.offhand) {
    const b = restBounds(m, (q) => q === 'offhand');
    assert.ok(b.min[1] >= -EPS, `${id}: offhand bottom ${b.min[1]} below ground`);
    assert.ok(b.min[2] >= -0.25 - EPS, `${id}: offhand pokes through the back of the body (z ${b.min[2].toFixed(3)})`);
    assert.ok(b.max[1] - b.min[1] <= 1.6 + EPS && b.max[2] - b.min[2] <= 1.6 + EPS, `${id}: offhand larger than 16 voxels`);
  }
  for (const k of ['grip_main', 'grip_off', 'eyes', 'head_top', 'muzzle', 'body_center', 'feet']) assert.ok(m.attach[k], `${id}: attach point ${k}`);
  for (const k of Object.keys(m.attach)) { const a = m.attach[k], p = m.byId[a.part]; assert.ok(p, `${id}: attach ${k} -> missing part ${a.part}`); }
  assert.equal(m.meta.rig, 'hum1');
  assert.ok(c.radius >= 0.3 && c.radius <= 0.7, `${id}: radius ${c.radius}`);
  assert.ok(c.reach <= 3.6 + EPS, `${id}: reach ${c.reach}`);
}

// ---------------------------------------------------------------- every shipped blueprint (units/*.js MODELS)
const unitsDir = path.join(root, 'src/content/era_ancient/units');
const shipped = {};
for (const f of fs.readdirSync(unitsDir).filter((x) => x.endsWith('.js') && !x.startsWith('_')).sort()) {
  const m = await import(pathToFileURL(path.join(unitsDir, f)).href);
  for (const [id, spec] of Object.entries(m.MODELS || {})) { const bp = spec.blueprint || spec.rider; if (bp) shipped[id] = bp; }
}
assert.ok(Object.keys(shipped).length >= 9, 'T0 humanoids present: ' + Object.keys(shipped).join(','));
for (const id of ['hoplite', 'spartan', 'cretan_archer', 'legionary', 'medjay', 'nubian_archer', 'berserker', 'rider_companion', 'rider_equites']) assert.ok(shipped[id], `T0 model ${id}`);
let nShipped = 0;
for (const [id, bp] of Object.entries(shipped)) {
  const st = STAT_TABLE[id];
  const opts = st ? { range: st.melee ? st.melee.range : undefined, radius: st.radius, scale: st.scale } : {};
  const v = validateBlueprint(bp); assert.ok(v.ok, `${id}: ${v.errors.join(' ')}`);
  assert.equal(v.warnings.length, 0, `${id}: warnings ${v.warnings.join(' | ')}`);
  checkU2(id, compileSoldier(bp, opts), { mounted: id.startsWith('rider_') });
  nShipped++;
}

// ---------------------------------------------------------------- validateBlueprint rejects garbage with human messages
const garbage = [null, undefined, 5, 'hoplite', [], true, () => 1, {}, { v: 2, id: 'x' }, { v: 1 }, { v: 1, id: 'Bad Id!' }, { v: 1, id: 'ok', name: 'x'.repeat(100) },
  { v: 1, id: 'ok', head: { helm: 'corinthin' } }, { v: 1, id: 'ok', main: 'lightsaber' }, { v: 1, id: 'ok', off: 123 }, { v: 1, id: 'ok', body: { type: 'giant' } },
  { v: 1, id: 'ok', body: { skin: 'red' } }, { v: 1, id: 'ok', colors: { metal: 'unobtainium' } }, { v: 1, id: 'ok', colors: { primary: '#12345' } }, { v: 1, id: 'ok', emblem: 'dragon' },
  { v: 1, id: 'ok', body: 7 }, { v: 1, id: 'ok', paint: 5 }, { v: 1, id: 'ok', paint: { wing: { sx: 1, sy: 1, sz: 1, rle: [1, 1] } } },
  { v: 1, id: 'ok', paint: { head: { sx: 9, sy: 10, sz: 10, rle: [900, 0] } } }, { v: 1, id: 'ok', paint: { head: { sx: 10, sy: 10, sz: 10, rle: [1, 2, 3] } } },
  { v: 1, id: 'ok', paint: { head: { sx: 10, sy: 10, sz: 10, rle: [-4, 1] } } }, { v: 1, id: 'ok', paint: { head: { sx: 10, sy: 10, sz: 10, rle: [1000000, 1] } } },
  JSON.parse('{"v":1,"id":"ok","head":{"helm":"__proto__"}}'), { v: 1, id: 'ok', head: { helm: { toString: 1 } } }, { v: 1, id: 'ok', main: '<img src=x onerror=alert(1)>' }];
for (const g of garbage) {
  const r = validateBlueprint(g);
  assert.equal(r.ok, false, 'should reject ' + JSON.stringify(g));
  assert.ok(r.errors.length >= 1 && r.errors.every((e) => typeof e === 'string' && e.length > 10 && /[A-Za-z]/.test(e)), 'human message for ' + JSON.stringify(g));
  assert.equal(r.bp, null);
  assert.throws(() => compileSoldier(g), BlueprintError);
}
assert.ok(validateBlueprint({ v: 1, id: 'ok', head: { helm: 'corinthin' } }).errors[0].includes("Did you mean 'corinthian'"), 'suggestion');
assert.ok(!validateBlueprint({ v: 1, id: 'ok', main: '<img src=x onerror=alert(1)>' }).errors.join('').includes('<img src=x onerror=alert(1)>'.repeat(2)), 'echoed text is bounded');
// defaults fill in missing optional keys; unknown keys only warn
const min = validateBlueprint({ v: 1, id: 'plain' }); assert.ok(min.ok && min.bp.main === 'none' && min.bp.head.helm === 'none' && min.bp.colors.metal === 'bronze');
const extra = validateBlueprint({ v: 1, id: 'plain', evil: 1 }); assert.ok(extra.ok && extra.warnings.length === 1);
assert.ok(!('evil' in extra.bp));
// two-handed weapon + off-hand: warning, off-hand dropped by the compiler
const two = Object.assign(defaultBlueprint(), { main: 'sarissa', off: 'hoplon' });
const vt = validateBlueprint(two); assert.ok(vt.ok && vt.warnings.length === 1);
const ct = compileSoldier(two); assert.ok(!ct.model.byId.offhand && ct.twoHanded && ct.warnings.length >= 1);

// ---------------------------------------------------------------- unlock gating (E9)
const silly = Object.assign(defaultBlueprint(), { head: { helm: 'colander', hair: 'short', face: 'none', eyes: '#222222' }, main: 'rubber_chicken', back: 'wings', off: 'none' });
assert.equal(validateBlueprint(silly).ok, true, 'no lock enforcement unless the caller passes the unlocked set');
const locked = validateBlueprint(silly, { unlocked: new Set() });
assert.equal(locked.ok, false); assert.equal(locked.errors.length, 3); assert.ok(locked.errors.every((e) => e.includes('locked')));
assert.equal(validateBlueprint(silly, { unlocked: new Set(['silly_helms', 'silly_weapons']) }).errors.length, 1);
assert.equal(validateBlueprint(silly, { unlocked: new Set(['silly_helms', 'silly_weapons', 'wings']) }).ok, true);
checkU2('silly', compileSoldier(silly));

// ---------------------------------------------------------------- determinism
const hashModel = (m) => { let h = 2166136261; for (const p of m.parts) { h = Math.imul(h ^ p.id.length, 16777619) >>> 0; for (let i = 0; i < p.grid.d.length; i++) h = Math.imul(h ^ p.grid.d[i], 16777619) >>> 0; for (const r of p.rest) h = Math.imul(h ^ Math.round(r * 1000), 16777619) >>> 0; } return h; };
for (const id of Object.keys(shipped)) {
  const a = compileSoldier(shipped[id]), b = compileSoldier(JSON.parse(JSON.stringify(shipped[id])));
  assert.equal(hashModel(a.model), hashModel(b.model), id + ' compile is not deterministic');
}
const alt = JSON.parse(JSON.stringify(shipped.hoplite)); alt.id = 'hoplite_two';
assert.equal(compileSoldier(alt).voxels, compileSoldier(shipped.hoplite).voxels);

// ---------------------------------------------------------------- weapon length rule (spec 4.1): tip within range + radius + 0.3 of the body axis
{
  const bp = Object.assign(defaultBlueprint(), { main: 'dory', off: 'none' });
  const free = compileSoldier(bp);                                                  // no range: only the 3.6 u custom cap
  assert.ok(free.reach <= 3.6 + EPS);
  for (const range of [1.2, 1.5, 2.0, 2.6]) {
    const r = compileSoldier(bp, { range, radius: 0.55 });
    assert.ok(r.reach <= range + 0.55 + 0.3 + 0.1 + EPS, `reach ${r.reach} vs range ${range}`);          // 0.1 = one voxel of rounding
    assert.ok(r.weaponLen <= free.weaponLen);
  }
  assert.ok(compileSoldier(bp, { range: 1.2 }).weaponLen < compileSoldier(bp, { range: 2.6 }).weaponLen, 'shorter range => shorter weapon');
  const wide = compileSoldier(bp, { range: 2.0, radius: 0.7, scale: 1 }), tight = compileSoldier(bp, { range: 2.0, radius: 0.45 });
  assert.ok(wide.weaponLen >= tight.weaponLen);
  for (const id of Object.keys(PART_REGISTRY.mains)) {
    const w = Object.assign(defaultBlueprint(), { main: id, off: 'none' });
    const c = compileSoldier(w, { range: 1.0 });
    assert.ok(c.reach <= 3.6 + EPS && c.model.parts.length <= 24, id);
    if (PART_REGISTRY.mains[id].meta.style !== 'shoot' && !PART_REGISTRY.mains[id].meta.noClamp && id !== 'none') assert.ok(c.reach <= 1.0 + 0.55 + 0.3 + 0.1 + EPS || c.weaponLen <= (PART_REGISTRY.mains[id].meta.minLen ?? 6), `${id} reach ${c.reach} len ${c.weaponLen}`);
    checkU2('weapon ' + id, compileSoldier(w));
  }
  const dg = compileForDef(bp, { melee: { range: 2.0 }, radius: 0.65, scale: 1 }); assert.ok(dg.reach <= 2.0 + 0.65 + 0.3 + 0.1 + EPS);
}

// ---------------------------------------------------------------- painting
{
  const bp = defaultBlueprint(); bp.id = 'painted';
  const base = buildPartGrids(bp).grids;
  const edited = base.head.clone();
  edited.set(4, 6, 8, 0xff000000 | 0xff00ff);               // add a voxel (solid flag + colour)
  edited.set(4, 1, 8, 0);                                      // erase one that exists (the nose) or no-op
  const rle = diffPaint(edited, base.head);
  assert.ok(rle && rle.sx === 10);
  const bp2 = JSON.parse(JSON.stringify(bp)); bp2.paint = { head: rle };
  const v = validateBlueprint(bp2); assert.ok(v.ok, v.errors.join(' '));
  const g = buildPartGrids(bp2).grids; applyPaint(v.bp, g);
  assert.equal(g.head.get(4, 6, 8) >>> 0, (0xff000000 | 0xff00ff) >>> 0);
  assert.equal(diffPaint(base.head.clone(), base.head), null);
  const c = compileSoldier(bp2); assert.equal(c.model.byId.head.grid.get(4, 6, 8) >>> 0, (0xff000000 | 0xff00ff) >>> 0);
  assert.notEqual(hashModel(c.model), hashModel(compileSoldier(bp).model));
  // erase marker removes a generated voxel
  const e2 = new VoxelGrid(10, 10, 10); e2.d[base.head.idx(3, 2, 3)] = PAINT_ERASE;
  const bp3 = JSON.parse(JSON.stringify(bp)); bp3.paint = { head: e2.toRLE() };
  assert.ok(base.head.get(3, 2, 3) !== 0); assert.equal(compileSoldier(bp3).model.byId.head.grid.get(3, 2, 3), 0);
  // cap: more than PAINT_CAP painted voxels is rejected
  const big = new VoxelGrid(9, 48, 9); for (let i = 0; i < PAINT_CAP + 1; i++) big.d[i] = 0xff00ff00;
  const bp4 = JSON.parse(JSON.stringify(bp)); bp4.paint = { weapon: big.toRLE() };
  const r4 = validateBlueprint(bp4); assert.equal(r4.ok, false); assert.ok(r4.errors[0].includes('1500'));
  const ok = new VoxelGrid(9, 48, 9); for (let i = 0; i < PAINT_CAP; i++) ok.d[i] = 0xff00ff00;
  bp4.paint = { weapon: ok.toRLE() }; assert.ok(validateBlueprint(bp4).ok);
}

// ---------------------------------------------------------------- fuzz: 1,000 random legal blueprints
{
  const rng = new RNG(20240607);
  let minV = 1e9, maxV = 0;
  const seen = { helms: new Set(), mains: new Set(), offs: new Set(), armors: new Set() };
  for (let i = 0; i < 1000; i++) {
    const bp = randomBlueprint(rng);
    const v = validateBlueprint(bp, { unlocked: new Set() }); assert.ok(v.ok, v.errors.join(' '));
    const c = compileSoldier(bp, i % 3 === 0 ? { range: 1.6, radius: 0.55 } : {});
    checkU2(bp.id, c, {}); minV = Math.min(minV, c.voxels); maxV = Math.max(maxV, c.voxels);
    seen.helms.add(bp.head.helm); seen.mains.add(bp.main); seen.offs.add(bp.off); seen.armors.add(bp.torso.armor);
    assert.ok(!['colander', 'traffic_cone', 'cooking_pot', 'straw_hat'].includes(bp.head.helm), 'random never picks locked parts');
  }
  assert.ok(seen.helms.size >= 20 && seen.mains.size >= 20 && seen.offs.size >= 8, `fuzz coverage ${seen.helms.size}/${seen.mains.size}/${seen.offs.size}`);
  // with everything unlocked the silly parts can appear
  const rng2 = new RNG(5); let sillyHits = 0;
  for (let i = 0; i < 300; i++) { const bp = randomBlueprint(rng2, { unlocked: new Set(['silly_helms', 'silly_weapons', 'wings']) }); if (['colander', 'traffic_cone', 'cooking_pot', 'straw_hat'].includes(bp.head.helm) || bp.back === 'wings') sillyHits++; checkU2(bp.id, compileSoldier(bp)); }
  assert.ok(sillyHits > 0);
  console.log(`blueprints.test OK: ${nShipped} shipped units, fuzz 1000 (voxels ${minV}..${maxV})`);
}
