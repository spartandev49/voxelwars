// BEASTS: rig contracts (spec 4.2 part ids, frames, which side is which) for every beast/siege rig.
import assert from 'node:assert/strict';
import { BUILDERS, buildHorse, buildCamel, buildHound, buildGoat, buildChicken, buildTrojan, buildHumLite } from '../../src/content/era_ancient/beasts/index.js';
import { partPointAtRest, attachLocal, modelBounds } from '../../src/content/era_ancient/beasts/common.js';

const ids = (m) => m.parts.map((p) => p.id);
const world = (m, partId, local = [0, 0, 0]) => partPointAtRest(m, partId, local);
const QUAD = ['body', 'neck', 'head', 'tail', 'legFL', 'legFR', 'legBL', 'legBR'];
const QUAD_STATIC = ['saddle', 'mane', 'ears', 'horns', 'barding'];

// ---- quad1: required ids, only the documented static children, legs hang from the top, left = +X, front = +Z
for (const [name, m] of [['horse', buildHorse({ coat: 'bay' })], ['barded', buildHorse({ coat: 'black', barded: true })], ['pony', buildHorse({ k: 0.9, lean: true, saddle: 'none' })], ['camel', buildCamel({})], ['hound', buildHound({})], ['goat', buildGoat({})]]) {
  const have = ids(m);
  for (const r of QUAD) assert.ok(have.includes(r), `${name}: missing quad1 part ${r}`);
  for (const id of have) assert.ok(QUAD.includes(id) || QUAD_STATIC.includes(id), `${name}: part id ${id} is not in the quad1 contract`);
  assert.equal(m.meta.rig, 'quad1');
  for (const L of ['legFL', 'legFR', 'legBL', 'legBR']) {
    const p = m.byId[L], b = p.grid.bounds();
    assert.equal(p.parent, 'body', `${name}.${L} parent`);
    assert.ok(b.y1 + 1 <= p.pivot[1] + 1e-6, `${name}.${L}: nothing may sit above the leg pivot (legs hang along -Y from the top)`);
    assert.equal(b.y0, 0, `${name}.${L}: hoof at the bottom of the grid`);
  }
  assert.ok(m.byId.legFL.origin[0] > 0 && m.byId.legBL.origin[0] > 0 && m.byId.legFR.origin[0] < 0 && m.byId.legBR.origin[0] < 0, `${name}: left legs are +X`);
  assert.ok(m.byId.legFL.origin[2] > 0 && m.byId.legBL.origin[2] < 0, `${name}: front legs forward (+Z)`);
  assert.ok(m.byId.tail.origin[2] < 0, `${name}: tail at the rear`);
  const headW = world(m, 'head'), bodyW = world(m, 'body');
  assert.ok(headW[2] > bodyW[2] + 0.5, `${name}: head forward of the body centre`);
  assert.ok(headW[1] > bodyW[1], `${name}: head above the belly line`);
  for (const a of ['saddle', 'head_top', 'mouth', 'feet']) if (a !== 'saddle' || have.includes('saddle')) assert.ok(m.attach[a], `${name}: attach ${a}`);
  assert.ok(m.meta.gait && m.meta.gait.walk.stride > 0 && m.meta.gait.gallop.stride > m.meta.gait.walk.stride, `${name}: gait recipe`);
  // the belly line is where the legs end: body origin y == legLen
  assert.ok(Math.abs(m.byId.body.origin[1] - m.meta.legLen) < 1e-6, `${name}: body origin y == legLen`);
}
// species static children
assert.ok(ids(buildHorse({ barded: true })).includes('barding'));
assert.ok(ids(buildGoat({})).includes('horns') && ids(buildHorse({})).includes('mane') && ids(buildHorse({})).includes('ears'));
assert.ok(!ids(buildHorse({ lean: true, saddle: 'none' })).includes('mane'), 'lean horses bake mane/ears (fewer parts)');
// camel paces: flagged for ANIM
assert.equal(buildCamel({}).meta.gait.pace, true); assert.equal(buildHorse({}).meta.gait.pace, false);

// ---- centaur: quad1 body + hum1 upper body (no legs), waist on the torso attach
{
  const m = BUILDERS.centaur_archer();
  assert.ok(!m.byId.head && m.byId.r_head && m.byId.r_weapon && m.byId.r_armLR && !m.byId.r_legUL, 'centaur: no equine head, human upper body without legs');
  assert.equal(m.byId.r_body.parent, 'body');
  const a = world(m, 'body', attachLocal(m, 'torso')), r = world(m, 'r_body');
  assert.ok(Math.hypot(a[0] - r[0], a[1] - r[1], a[2] - r[2]) < 0.05, 'centaur waist sits on the torso attach');
  assert.deepEqual(m.meta.subrigs.map((s) => s.prefix), ['', 'r_']);
  assert.equal(m.meta.weaponStyle, 'shoot');
}

// ---- elephant1
{
  const m = BUILDERS.war_elephant();
  const need = ['body', 'head', 'trunkA', 'trunkB', 'trunkC', 'earL', 'earR', 'tail', 'legFL', 'legFR', 'legBL', 'legBR', 'howdah'];
  for (const r of need) assert.ok(m.byId[r], `elephant: part ${r}`);
  assert.equal(m.byId.trunkA.parent, 'head'); assert.equal(m.byId.trunkB.parent, 'trunkA'); assert.equal(m.byId.trunkC.parent, 'trunkB');
  assert.ok(m.byId.earL.origin[0] > 0 && m.byId.earR.origin[0] < 0, 'ears: left = +X');
  assert.equal(m.byId.howdah.parent, 'body');
  assert.ok(m.attach.howdah_a && m.attach.howdah_b && m.attach.trunk_tip && m.attach.head_top);
  const tip = world(m, 'trunkC', attachLocal(m, 'trunk_tip'));
  assert.ok(tip[1] > -0.05 && tip[1] < 1.2, `trunk tip near the ground (y=${tip[1].toFixed(2)})`);
  // crew stand on the howdah floor, inside the tower, facing outward
  const ha = world(m, 'howdah', attachLocal(m, 'howdah_a')), c1 = world(m, 'a1_body'), c1feet = world(m, 'a1_legUL');
  assert.ok(Math.hypot(ha[0] - c1feet[0], ha[2] - c1feet[2]) < 0.45, 'crew 1 stands on howdah_a');
  assert.deepEqual(m.meta.subrigs.map((s) => s.prefix), ['', 'a1_', 'a2_']);
  assert.deepEqual(m.meta.subrigs.map((s) => s.rig), ['elephant1', 'hum_lite', 'hum_lite']);
  assert.ok(modelBounds(m).max[1] > 6.5, 'elephant stands tall with its howdah');
}

// ---- chariot1: 2 wheels + pole + 2 quad1 horses + 2 hum_lite crew; <= 32 parts
{
  const m = BUILDERS.chariot_archer();
  for (const r of ['body', 'wheelL', 'wheelR', 'pole']) assert.ok(m.byId[r], `chariot: ${r}`);
  assert.deepEqual(m.meta.subrigs.map((s) => s.prefix), ['', 'h1_', 'h2_', 'd_', 'a_']);
  assert.deepEqual(m.meta.subrigs.map((s) => s.rig), ['chariot1', 'quad1', 'quad1', 'hum_lite', 'hum_lite']);
  assert.ok(m.parts.length <= 48);
  assert.ok(m.byId.wheelL.origin[0] > 0 && m.byId.wheelR.origin[0] < 0);
  assert.ok(world(m, 'h1_body')[0] > 0 && world(m, 'h2_body')[0] < 0, 'horse 1 is on the left');
  assert.ok(world(m, 'h1_head')[2] > world(m, 'body')[2] + 2.0, 'horses are in front of the chariot');
  assert.ok(Math.abs(m.meta.wheelRadius - 0.8) < 0.1);
}

// ---- catapult1 / ballista1
{
  const c = BUILDERS.catapult();
  for (const r of ['frame', 'wheelL', 'wheelR', 'arm', 'sling']) assert.ok(c.byId[r], `catapult: ${r}`);
  assert.equal(c.byId.sling.parent, 'arm'); assert.equal(c.byId.stone.parent, 'sling');
  assert.deepEqual(c.meta.subrigs.map((s) => s.prefix), ['', 'c1_', 'c2_', 'c3_']);
  // the arm pivots on the torsion axle ahead of the middle; the arm tip clears the frame
  assert.ok(c.byId.arm.origin[2] > 0.5 && c.byId.arm.origin[1] > 1.2);
  const tip = world(c, 'sling'); assert.ok(tip[1] > 3.0, 'arm tip high');
  const b = BUILDERS.ballista();
  for (const r of ['frame', 'wheelL', 'wheelR', 'bow', 'string', 'bolt']) assert.ok(b.byId[r], `ballista: ${r}`);
  assert.deepEqual(b.meta.subrigs.map((s) => s.prefix), ['', 'c1_', 'c2_']);
  const bb = b.byId.bolt.grid.bounds(); assert.ok(bb.z1 - bb.z0 > 20, 'bolt is long along +Z');
  for (const m of [c, b]) for (const w of ['wheelL', 'wheelR']) {
    const g = m.byId[w].grid.bounds(), r = Math.max(g.y1 - g.y0 + 1, g.z1 - g.z0 + 1) * 0.05;
    assert.ok(Math.abs(r - m.meta.wheelRadius) < 0.06, `${m.id}.${w}: meta.wheelRadius ${m.meta.wheelRadius} vs ${r}`);
  }
}

// ---- chicken1: exactly 7 parts, glow halo, white coat
{
  const m = BUILDERS.sacred_chicken();
  assert.deepEqual(ids(m).sort(), ['body', 'head', 'legL', 'legR', 'tail', 'wingL', 'wingR']);
  let glow = 0; const g = m.byId.head.grid; for (let i = 0; i < g.d.length; i++) if (g.d[i] && ((g.d[i] >>> 24) & 4)) glow++;
  assert.ok(glow >= 4, 'tiny golden halo of GLOW voxels');
  assert.ok(m.byId.legL.origin[0] > 0 && m.byId.wingL.origin[0] > 0);
}

// ---- trojan1
{
  const m = buildTrojan({});
  for (const r of ['base', 'wheelFL', 'wheelFR', 'wheelBL', 'wheelBR', 'body', 'neck', 'head', 'tail', 'legFL', 'legFR', 'legBL', 'legBR', 'hatch']) assert.ok(m.byId[r], `trojan: ${r}`);
  assert.equal(m.byId.hatch.parent, 'body');
  const hatch = world(m, 'hatch'), body = world(m, 'body');
  assert.ok(hatch[1] <= body[1] + 1e-6 && hatch[1] > 1.0, 'hatch hangs under the belly, above the deck');
  assert.ok(world(m, 'head')[1] > 4.5, 'huge horse');
  assert.equal(m.meta.clipMap.strike_gore, 'strike_ram');
}
console.log('beasts rigs OK');
