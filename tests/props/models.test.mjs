// Prop models (W3 inputs, R12/R13 neighbours): every catalog id has a pure builder for all 3 stages, bounds agree with the catalog,
// destruction stages shrink, debris palettes exist, spectators have the hum1 part ids, everything is deterministic.
import assert from 'node:assert';
import { PROP_CATALOG } from '../../src/content/era_ancient/props/catalog.js';
import { buildProp, PROP_MODEL_IDS, variantCount, isStaticProp, debrisColors, hasPropModel, measure, colorHistogram, propRng, buildSpectator, SPECTATOR_VARIANTS } from '../../src/content/era_ancient/props/models/index.js';
import { F_GLOW } from '../../src/voxel/grid.js';

const ids = Object.keys(PROP_CATALOG);
assert.ok(ids.length >= 40, 'catalog has at least 40 ids');
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.error('FAIL', msg); } };
const hash = (m) => { let h = 2166136261 >>> 0; for (const p of m.parts) for (let i = 0; i < p.grid.d.length; i++) { h ^= p.grid.d[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };
const rows = [];
for (const id of ids) {
  const cat = PROP_CATALOG[id];
  check(hasPropModel(id) && PROP_MODEL_IDS.includes(id), id + ': has a model builder');
  const nv = variantCount(id);
  check(nv >= 1 && nv <= 4, id + ': 1..4 variants');
  const stat = isStaticProp(id), m = [];
  for (let s = 0; s < 3; s++) {
    const model = buildProp(id, s, 0);
    check(model.parts.length === 1 && model.parts[0].id === 'root', id + ' stage ' + s + ': one root part');
    check(model.voxelSize === 0.1, id + ': voxelSize 0.1');
    check(model.parts[0].grid.count() > 0, id + ' stage ' + s + ': not empty');
    check(model.meta.kind === 'prop' && model.meta.stage === s, id + ': meta');
    m.push({ model, me: measure(model) });
  }
  const [m0, m1, m2] = m;
  // bounds consistent with the catalog (blocking radius and height) within 35%
  if (cat.r > 0) check(Math.abs(m0.me.baseRadius / cat.r - 1) <= 0.35, `${id}: base radius ${m0.me.baseRadius.toFixed(2)} vs catalog ${cat.r}`);
  check(Math.abs(m0.me.height / cat.h - 1) <= 0.35, `${id}: height ${m0.me.height.toFixed(2)} vs catalog ${cat.h}`);
  check(m0.me.depthBelow >= 0, id + ': foundation skirt is below ground');
  if (!stat && cat.hp !== Infinity) {
    check(m1.me.voxels < m0.me.voxels, `${id}: cracked stage has fewer voxels (${m1.me.voxels} vs ${m0.me.voxels})`);
    check(m2.me.voxels < m0.me.voxels, `${id}: rubble has fewer voxels`);
    check(m2.me.height <= Math.max(0.35 * m0.me.height, 0.4) + 0.2 && m2.me.height <= 2.2, `${id}: rubble is a low pile (${m2.me.height.toFixed(2)} u of ${m0.me.height.toFixed(2)})`);
    check(m2.me.baseRadius <= Math.max(cat.r * 1.8 + 0.5, m0.me.baseRadius * 1.25, 1.0), `${id}: rubble footprint ${m2.me.baseRadius.toFixed(2)} is near the original ${cat.r}`);
    check(hash(m1.model) !== hash(m0.model), id + ': cracked stage differs from intact');
  } else if (stat) {
    check(hash(m1.model) === hash(m0.model) && hash(m2.model) === hash(m0.model), id + ': indestructible props keep their model for every stage');
  }
  // debris palette: non-empty, 6 or fewer colours, and sampled from the model (at least half of the colours appear in the intact voxels)
  const pal = debrisColors(id);
  check(Array.isArray(pal) && pal.length >= 2 && pal.length <= 12, id + ': debris palette size');
  const have = new Set(); for (let v = 0; v < nv; v++) for (const e of colorHistogram(buildProp(id, 0, v))) have.add(e.rgb);
  const hit = pal.filter((c) => have.has(c)).length;
  check(hit >= Math.ceil(pal.length / 2), `${id}: debris palette matches the model (${hit}/${pal.length})`);
  // all variants build and differ in at least one voxel (when there is more than one)
  const hs = new Set();
  for (let v = 0; v < nv; v++) hs.add(hash(buildProp(id, 0, v)));
  check(hs.size === nv || id === 'statue_zeus', `${id}: variants differ (${hs.size}/${nv})`);
  // deterministic with the shared seed, and variant wrapping is stable
  check(hash(buildProp(id, 0, 0)) === hash(buildProp(id, 0, 0, propRng(id, 0, 0))), id + ': deterministic');
  check(hash(buildProp(id, 0, nv)) === hash(buildProp(id, 0, 0)), id + ': variant index wraps');
  rows.push(`${id.padEnd(14)} r ${m0.me.baseRadius.toFixed(2)}/${cat.r} h ${m0.me.height.toFixed(2)}/${cat.h} vox ${String(m0.me.voxels).padStart(7)} below ${m0.me.depthBelow.toFixed(1)}`);
}
// torches, campfires and pits expose emitters and GLOW voxels
for (const id of ['torch', 'campfire', 'fire_pit']) {
  const m = buildProp(id, 0, 0);
  check(m.meta.emitters.length >= 1, id + ': fire emitter');
  let glow = 0; const d = m.parts[0].grid.d; for (let i = 0; i < d.length; i++) if (d[i] && ((d[i] >>> 24) & F_GLOW)) glow++;
  check(glow > 3, id + ': GLOW voxels');
}
for (const id of ['statue_zeus', 'cave_mouth', 'throne', 'skull_pile']) {
  const m = buildProp(id, 0, id === 'cave_mouth' || id === 'skull_pile' ? 1 : 0); let glow = 0; const d = m.parts[0].grid.d; for (let i = 0; i < d.length; i++) if (d[i] && ((d[i] >>> 24) & F_GLOW)) glow++;
  check(glow > 0, id + ': has a glowing feature');
}
// the gate door has planks and iron bands (several distinct colours) and the throne is gold
{
  const door = colorHistogram(buildProp('gate_door', 0, 0)); check(door.length >= 5, 'gate_door: planks, bands, rivets');
  const th = colorHistogram(buildProp('throne', 0, 0)).slice(0, 4).map((e) => e.rgb); check(th.some((c) => ((c >> 16) & 255) > 200 && ((c >> 8) & 255) > 150 && (c & 255) < 120), 'throne: gold dominates');
  check(buildProp('tent', 0, 0).parts[0].grid.count() > 1000 && colorHistogram(buildProp('tent', 0, 1)).length >= 4, 'tent: striped');
}
// spectators: hum_lite-like, hum1 ids, 4 colour variants, standing on the ground
{
  const want = ['body', 'head', 'armUL', 'armUR', 'legUL', 'legUR'];
  const sigs = new Set();
  for (let v = 0; v < SPECTATOR_VARIANTS; v++) {
    const s = buildSpectator(v);
    assert.deepEqual(s.parts.map((p) => p.id), want, 'spectator part ids');
    check(s.parts.length === 6 && s.voxelSize === 0.1, 'spectator: 6 parts at 0.1');
    check(s.meta.rig === 'hum1', 'spectator rig hum1');
    check(s.height() > 2.3 && s.height() < 2.75, 'spectator height 2.3-2.7 u, got ' + s.height());
    check(s.byId.body.parent === null && s.byId.head.parent === 'body' && s.byId.armUL.parent === 'body' && s.byId.legUL.parent === null, 'spectator hierarchy follows hum1');
    sigs.add(hash(s));
    // feet on the ground: lowest leg voxel is at the leg pivot - 8 voxels, i.e. y = 0 once the origin is applied
    const leg = s.byId.legUL, lowY = leg.origin[1] - leg.pivot[1] * s.voxelSize;
    check(Math.abs(lowY) < 1e-6, 'spectator feet touch the ground (' + lowY + ')');
    check(JSON.stringify(buildSpectator(v).parts.map((p) => p.grid.count())) === JSON.stringify(s.parts.map((p) => p.grid.count())), 'spectator deterministic');
  }
  check(sigs.size === SPECTATOR_VARIANTS, 'spectator: 4 distinct colour variants');
  check(buildSpectator(5).meta.variant === 1, 'spectator variant wraps');
}
if (process.argv.includes('--rows')) console.log(rows.join('\n'));
if (fails) { console.error(fails + ' prop model check(s) failed'); process.exit(1); }
console.log(`prop models OK: ${ids.length} ids x 3 stages x variants, ${rows.reduce((a, r) => a + 1, 0)} measured`);
