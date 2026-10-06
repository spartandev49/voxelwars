// BEASTS: every builder (U2 for non-humanoids, A8 geometry, U3 non-humanoid team tint). Plain node:assert.
import assert from 'node:assert/strict';
import { BUILDERS, BUILDER_KIND, SHEET_MODELS, buildBeast, buildBespoke, buildMounted, MOUNT_PRESETS } from '../../src/content/era_ancient/beasts/index.js';
import { modelBounds, rasterizeRest, teamShare, modelStats } from '../../src/content/era_ancient/beasts/common.js';
import { buildFixtureRider } from '../../src/content/era_ancient/beasts/fixture_rider.js';

const hashModel = (m) => {
  let h = 2166136261 >>> 0;
  const mix = (n) => { h ^= n >>> 0; h = Math.imul(h, 16777619) >>> 0; };
  for (const p of m.parts) {
    for (let i = 0; i < p.grid.d.length; i++) mix(p.grid.d[i]);
    for (const v of [...p.origin, ...p.pivot, ...p.rest]) mix(Math.round(v * 1000));
    for (let i = 0; i < p.id.length; i++) mix(p.id.charCodeAt(i));
  }
  for (const k of Object.keys(m.attach).sort()) { mix(k.length); for (const v of m.attach[k].at) mix(Math.round(v * 1000)); }
  return h;
};

let checked = 0;
for (const e of SHEET_MODELS) {
  const m = e.make();
  const tag = `[${e.id}]`;
  // ---- structure
  assert.ok(m.parts.length >= 5 && m.parts.length <= 48, `${tag} parts ${m.parts.length} must be 5..48`);
  assert.equal(m.voxelSize, 0.1, `${tag} voxelSize`);
  const seen = new Set();
  for (const p of m.parts) {
    assert.ok(!seen.has(p.id), `${tag} duplicate part id ${p.id}`); seen.add(p.id);
    if (p.parent) { assert.ok(m.byId[p.parent], `${tag} ${p.id}: unknown parent ${p.parent}`); assert.ok(m.byId[p.parent].index < p.index, `${tag} ${p.id}: parent must precede child`); assert.equal(p.parentIndex, m.byId[p.parent].index); }
    assert.ok(p.grid.count() > 0, `${tag} ${p.id}: empty part (builders omit empty parts)`);
    for (const v of [...p.origin, ...p.pivot, ...p.rest]) assert.ok(Number.isFinite(v), `${tag} ${p.id}: non-finite transform`);
    assert.ok(p.pivot[0] >= 0 && p.pivot[0] <= p.grid.sx && p.pivot[1] >= 0 && p.pivot[1] <= p.grid.sy && p.pivot[2] >= 0 && p.pivot[2] <= p.grid.sz, `${tag} ${p.id}: pivot outside its grid`);
  }
  // ---- attach points
  assert.ok(Object.keys(m.attach).length >= 2, `${tag} needs attach points`);
  for (const [name, a] of Object.entries(m.attach)) {
    assert.ok(m.byId[a.part], `${tag} attach ${name}: part ${a.part} missing`);
    assert.ok(a.at.length === 3 && a.at.every(Number.isFinite), `${tag} attach ${name}: bad coords`);
  }
  // ---- meta contract
  assert.ok(typeof m.meta.rig === 'string' && m.meta.rig, `${tag} meta.rig`);
  assert.ok(Array.isArray(m.meta.subrigs) && m.meta.subrigs.length >= 1, `${tag} meta.subrigs`);
  const covered = new Map();
  for (const sr of m.meta.subrigs) for (const id of sr.parts) { assert.ok(m.byId[id], `${tag} subrig part ${id} missing`); covered.set(id, (covered.get(id) || 0) + 1); }
  for (const p of m.parts) assert.equal(covered.get(p.id), 1, `${tag} part ${p.id} must belong to exactly one sub-rig`);
  if (BUILDERS[e.id]) {
    assert.equal(typeof m.meta.clipMap, 'object', `${tag} meta.clipMap`);
    assert.equal(m.meta.builder, e.id); assert.equal(m.meta.kind, BUILDER_KIND[e.id]);
  }
  // ---- bounds, ground plane (feet within one voxel of y=0, nothing below it)
  const b = modelBounds(m);
  assert.ok(b.size.every(Number.isFinite), `${tag} bounds`);
  assert.ok(b.size[1] > 0.9 && b.max[1] < 9.0, `${tag} height ${b.max[1].toFixed(2)} u out of range`);
  assert.ok(b.size[0] < 6 && b.size[2] < 10, `${tag} footprint ${b.size.map((x) => x.toFixed(1))} too large`);
  const { cells } = rasterizeRest(m);
  let minY = 1e9; for (const c of cells.values()) minY = Math.min(minY, c.b * 0.1);
  assert.ok(minY > -0.051 && minY < 0.11, `${tag} lowest voxel at y=${minY.toFixed(2)} (feet must touch the ground, nothing below it)`);
  // ---- voxel budget
  const st = modelStats(m);
  assert.ok(st.voxels >= 250 && st.voxels <= 140000, `${tag} voxel count ${st.voxels}`);
  assert.ok(st.team > 0, `${tag} needs team-tint voxels`);
  // ---- U3 (non-humanoid share of tinted visible surface >= 15% over 3 projections)
  const t = teamShare(m);
  assert.ok(t.mean >= 0.15, `${tag} team tint ${(t.mean * 100).toFixed(1)}% < 15% (front ${t.front.toFixed(2)} side ${t.side.toFixed(2)} top ${t.top.toFixed(2)})`);
  assert.ok(t.min >= 0.03, `${tag} one projection has almost no team tint (${t.min.toFixed(3)})`);
  // ---- determinism
  assert.equal(hashModel(e.make()), hashModel(m), `${tag} not deterministic`);
  checked++;
}
assert.ok(checked >= 20, 'sheet list too short');

// ---- registry: every unit builder exists, kinds are consistent
const ids = ['companion_cavalry', 'equites', 'cataphract', 'camel_rider', 'numidian', 'hannibal', 'centaur_archer', 'warhound', 'battle_goat', 'sacred_chicken', 'war_elephant', 'chariot_archer', 'catapult', 'ballista', 'trojan_horse'];
assert.deepEqual(Object.keys(BUILDERS).sort(), ids.slice().sort());
assert.deepEqual(Object.keys(BUILDER_KIND).sort(), ids.slice().sort());
for (const id of ids) {
  assert.equal(typeof BUILDERS[id], 'function');
  const m = BUILDERS[id]();
  assert.equal(m.id, id, `model id of ${id}`);
}
assert.throws(() => buildBeast('war_elephant'), /not a beast/);
assert.throws(() => buildBespoke('warhound'), /not a bespoke/);
assert.ok(buildBeast('warhound').parts.length > 0 && buildBespoke('catapult').parts.length > 0);
for (const k of Object.keys(MOUNT_PRESETS)) assert.equal(BUILDER_KIND[k], 'mounted');

// ---- a real humanoid rider (full hum1 with cape + quiver) must still fit in 48 parts for every mounted unit
for (const k of Object.keys(MOUNT_PRESETS)) {
  const rider = buildFixtureRider('numidian');          // numidian carries cape + back + the full limb set
  const m = BUILDERS[k]({ rider });
  assert.ok(m.parts.length <= 48, `${k} with a full rider: ${m.parts.length} parts`);
  assert.ok(m.byId.r_body && m.byId.r_cape && m.byId.r_back, `${k}: rider parts are prefixed r_`);
}
console.log(`beasts builders: ${checked} models OK`);
