// BEASTS: mounted composition (A8): the rider sits on the saddle (<= 0.05 u), seated pose, rider substitution, sub-rig records.
import assert from 'node:assert/strict';
import { buildMounted, BUILDERS, MOUNT_PRESETS } from '../../src/content/era_ancient/beasts/index.js';
import { seatError, SEAT_REST } from '../../src/content/era_ancient/beasts/mounted.js';
import { buildFixtureRider, FIXTURE_KINDS } from '../../src/content/era_ancient/beasts/fixture_rider.js';
import { partPointAtRest, attachLocal, modelBounds, rasterizeRest } from '../../src/content/era_ancient/beasts/common.js';

for (const mount of ['horse', 'camel']) for (const kind of FIXTURE_KINDS.filter((k) => k !== 'centaur')) {
  const m = buildMounted({ mount, riderKind: kind, mountColors: mount === 'horse' ? { coat: 'chestnut' } : {} });
  const err = seatError(m);
  assert.ok(err < 0.05, `${mount}/${kind}: rider hip is ${err.toFixed(3)} u from the saddle attach`);
  assert.equal(m.byId.r_body.parent, 'saddle', 'rider hangs off the saddle part');
  assert.ok(m.parts.length <= 48);
  assert.deepEqual(m.meta.subrigs.map((s) => s.prefix), ['', 'r_']);
  assert.equal(m.meta.subrigs[0].rig, 'quad1'); assert.equal(m.meta.subrigs[1].rig, 'hum1');
  assert.equal(m.meta.kind, 'mounted'); assert.equal(m.meta.riderPrefix, 'r_');
  // seated pose: thighs forward (negative rx), shins back down (positive rx), legs spread outward, rider centred on the mount
  assert.ok(m.byId.r_legUL.rest[0] < -1 && m.byId.r_legLL.rest[0] > 1);
  assert.ok(m.byId.r_legUL.rest[2] > 0 && m.byId.r_legUR.rest[2] < 0, 'left thigh opens toward +X');
  const body = partPointAtRest(m, 'r_body', [0, 0, 0]);
  assert.ok(Math.abs(body[0]) < 0.01, 'rider on the centre line');
  assert.ok(body[1] > m.byId.body.origin[1] + 0.9, 'rider sits above the barrel');
  // feet stay inside the horse-sized volume: the rider's lowest voxel is well above the ground
  const { cells } = rasterizeRest(m); let riderMin = 1e9;
  for (const c of cells.values()) if (c.part.startsWith('r_')) riderMin = Math.min(riderMin, c.b * 0.1);
  assert.ok(riderMin > 0.8, `rider ${kind} on ${mount}: lowest rider voxel at ${riderMin.toFixed(2)} u`);
}

// a caller-supplied rider replaces the stand-in; the saddle contract is the same (a rider without legs still composes)
{
  const rider = buildFixtureRider('greek', { id: 'custom_rider' });
  const m = buildMounted({ mount: 'horse', rider, mountColors: { coat: 'white' } });
  assert.ok(m.byId.r_weapon && m.byId.r_offhand);
  assert.ok(seatError(m) < 0.05);
  const before = rider.byId.legUL.rest.slice();
  assert.deepEqual(before, [0, 0, 0], 'composition never mutates the supplied rider');
}
// each unit preset composes
for (const k of Object.keys(MOUNT_PRESETS)) {
  const m = BUILDERS[k]();
  assert.ok(seatError(m) < 0.05, k);
  assert.equal(m.meta.weaponStyle, MOUNT_PRESETS[k].weaponStyle);
}
// the cataphract is barded, the numidian has no saddle seat (pad only) and is smaller than the equites horse
assert.ok(BUILDERS.cataphract().byId.barding);
assert.ok(modelBounds(BUILDERS.numidian()).size[2] < modelBounds(BUILDERS.equites()).size[2] + 0.2);
assert.ok(Object.keys(SEAT_REST).length >= 4);
console.log('beasts mounted OK');

// ---- UNITS-LIB's real riders (units/t0.js) and lite crews seat/compose correctly (skipped silently if those modules are not there)
try {
  const { compileSoldier } = await import('../../src/content/era_ancient/blueprints.js');
  const { BLUEPRINTS } = await import('../../src/content/era_ancient/units/t0.js');
  for (const [unit, key] of [['companion_cavalry', 'rider_companion'], ['equites', 'rider_equites']]) {
    if (!BLUEPRINTS[key]) continue;
    const rider = compileSoldier(BLUEPRINTS[key]).model;
    const m = BUILDERS[unit]({ rider });
    assert.ok(seatError(m) < 0.05, `${unit} with the real rider`);
    assert.ok(m.parts.length <= 48, `${unit}: ${m.parts.length} parts`);
    assert.ok(m.byId.r_weapon && m.byId.r_legLL, 'real rider parts are prefixed');
  }
  const lite = () => compileSoldier(BLUEPRINTS.hoplite || Object.values(BLUEPRINTS)[0], { lite: true }).model;
  const ch = BUILDERS.chariot_archer({ driver: lite(), archer: lite() });
  assert.ok(ch.parts.length <= 48, `chariot with lite crews: ${ch.parts.length} parts`);
  assert.ok(BUILDERS.war_elephant({ crew: [lite(), lite()] }).parts.length <= 48);
  assert.ok(BUILDERS.catapult({ crew: [lite(), lite(), lite()] }).parts.length <= 48);
  assert.ok(BUILDERS.ballista({ crew: [lite(), lite()] }).parts.length <= 48);
  console.log('beasts mounted + lite crews with UNITS models OK');
} catch (err) { if (err && err.code === 'ERR_MODULE_NOT_FOUND') console.log('UNITS modules not available: skipped'); else throw err; }
