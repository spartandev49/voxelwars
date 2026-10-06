// UNITS-A: the twelve Hellene/Roman/Egyptian special humanoids (+ the chariot crew) and the faction parts written for them.
// Criteria: U2 (compile within the model limits, weapon length rule), U3 (team tint measured by tools/tintcheck.mjs), E4 (every new part is Workshop-selectable and
// changes the model), determinism, part bounds, and a fuzz of part swaps. Run: node tests/units/units_a.test.mjs
import assert from 'node:assert/strict';
import { VoxelGrid } from '../../src/voxel/grid.js';
import {
  compileSoldier, validateBlueprint, randomBlueprint, restBounds, buildPartGrids, PART_REGISTRY, DIM, CATEGORIES, makeCtx, listParts, BODY_RADIUS, defaultBlueprint, ARM_REACH,
} from '../../src/content/era_ancient/blueprints.js';
import { MODELS, BLUEPRINTS } from '../../src/content/era_ancient/units/units_a.js';
import { PARTS as P_HELMS } from '../../src/content/era_ancient/parts/units_a_helms.js';
import { PARTS as P_FACES } from '../../src/content/era_ancient/parts/units_a_faces.js';
import { PARTS as P_GARB } from '../../src/content/era_ancient/parts/units_a_garb.js';
import { PARTS as P_GEAR } from '../../src/content/era_ancient/parts/units_a_gear.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import { tintReport, projectModel } from '../../tools/tintcheck.mjs';
import { BUILDERS } from '../../src/content/era_ancient/beasts/index.js';
import { RNG, hashString } from '../../src/core/rng.js';

const EPS = 1e-6;
const ROSTER = {
  hellenes: ['peltast', 'philosopher', 'strategos'],
  romans: ['pilum_thrower', 'centurion', 'gladiator', 'senator'],
  egyptians: ['khopesh_warrior', 'mummy', 'anubis_guard', 'priest_of_ra', 'pharaoh'],
};
const CREW = ['crew_chariot_driver', 'crew_chariot_archer'];
const optsFor = (id) => { const st = STAT_TABLE[id]; return st ? { range: st.melee ? st.melee.range : undefined, radius: st.radius, scale: st.scale } : {}; };
const hashModel = (m) => { let h = 2166136261; for (const p of m.parts) { h = Math.imul(h ^ (p.id.charCodeAt(0) + p.id.length), 16777619) >>> 0; for (let i = 0; i < p.grid.d.length; i++) h = Math.imul(h ^ p.grid.d[i], 16777619) >>> 0; h = Math.imul(h ^ Math.round(p.rest[0] * 1000), 16777619) >>> 0; } return h; };

// ---------------------------------------------------------------- the roster exists, with the right faction cues
for (const [faction, ids] of Object.entries(ROSTER)) for (const id of ids) {
  assert.ok(MODELS[id] && MODELS[id].kind === 'humanoid' && MODELS[id].blueprint === BLUEPRINTS[id], `model for ${id}`);
  assert.equal(STAT_TABLE[id].faction, faction, `${id} faction`);
}
for (const id of CREW) assert.ok(MODELS[id], id);
const cue = (id, path, want) => { const bp = BLUEPRINTS[id]; const v = path.split('.').reduce((o, k) => o[k], bp); assert.equal(v, want, `${id}.${path}`); };
cue('philosopher', 'head.face', 'philosopher_beard'); cue('philosopher', 'main', 'scroll'); cue('philosopher', 'torso.tunic', 'himation'); cue('philosopher', 'head.helm', 'laurel');
cue('strategos', 'main', 'standard'); cue('strategos', 'back', 'none'); cue('strategos', 'torso.armor', 'thorax_strategos'); cue('strategos', 'cape', 'long');
cue('peltast', 'head.helm', 'thracian_fox'); cue('peltast', 'legs.armor', 'thracian_leggings'); cue('peltast', 'off', 'pelte_wicker'); cue('peltast', 'back', 'javelin_baldric'); cue('peltast', 'main', 'javelin');
cue('pilum_thrower', 'main', 'pilum'); cue('pilum_thrower', 'back', 'pilum_pair'); cue('pilum_thrower', 'head.helm', 'galea_light');
cue('centurion', 'main', 'vine_staff'); cue('centurion', 'head.helm', 'centurion_gilded'); cue('centurion', 'torso.armor', 'harness_phalerae');
cue('gladiator', 'main', 'trident'); cue('gladiator', 'back', 'net_coil'); cue('gladiator', 'head.helm', 'murmillo'); cue('gladiator', 'shoulders', 'manica');
cue('senator', 'torso.tunic', 'toga_senator'); cue('senator', 'main', 'coin_bag'); cue('senator', 'head.helm', 'laurel');
cue('khopesh_warrior', 'main', 'khopesh'); cue('khopesh_warrior', 'head.helm', 'nemes_lite'); cue('khopesh_warrior', 'shoulders', 'broad_collar_gold');
cue('mummy', 'torso.tunic', 'mummy_wraps'); cue('mummy', 'head.helm', 'mummy_head'); cue('mummy', 'cape', 'bandage_trail');
cue('anubis_guard', 'head.helm', 'jackal_anubis'); cue('anubis_guard', 'main', 'khopesh_spear_pennon'); cue('anubis_guard', 'off', 'egyptian_shield_team');
cue('priest_of_ra', 'main', 'scepter_sun'); cue('priest_of_ra', 'shoulders', 'leopard_mantle'); cue('priest_of_ra', 'head.helm', 'sun_circlet');
cue('pharaoh', 'head.helm', 'pschent'); cue('pharaoh', 'main', 'crook_flail'); cue('pharaoh', 'cape', 'royal_cape'); cue('pharaoh', 'head.face', 'beard_false');

// ---------------------------------------------------------------- U2 + weapon length rule + determinism + tint (U3)
const rows = [];
for (const id of [].concat(...Object.values(ROSTER), CREW)) {
  const bp = BLUEPRINTS[id], st = STAT_TABLE[id], opts = optsFor(id);
  const v = validateBlueprint(bp); assert.ok(v.ok, `${id}: ${v.errors.join(' ')}`); assert.equal(v.warnings.length, 0, `${id}: ${v.warnings.join(' | ')}`);
  const c = compileSoldier(bp, opts);
  assert.ok(c.parts <= (CREW.includes(id) ? 14 : 16), `${id}: ${c.parts} parts`);
  assert.ok(c.height >= 2.4 - EPS && c.height <= 3.4 + EPS, `${id}: height ${c.height.toFixed(3)} outside 2.4-3.4 u`);
  assert.ok(c.voxels >= 600 && c.voxels <= 6000, `${id}: ${c.voxels} voxels outside 600-6000`);
  assert.ok(c.radius >= 0.3 && c.radius <= 0.7 && c.reach <= 3.6 + EPS, `${id}: radius ${c.radius} reach ${c.reach}`);
  for (const p of c.model.parts) {
    assert.deepEqual([p.grid.sx, p.grid.sy, p.grid.sz], DIM[p.id].size, `${id}: ${p.id} is not on the canonical grid`);
    assert.ok(restBounds(c.model, (q) => q === p.id).min[1] >= -EPS, `${id}: part ${p.id} extends below the foot plane`);
  }
  if (c.model.byId.offhand) {
    const b = restBounds(c.model, (q) => q === 'offhand');
    assert.ok(b.min[2] >= -0.25 - EPS, `${id}: offhand pokes through the back of the body (z ${b.min[2].toFixed(3)})`);
    assert.ok(b.max[1] - b.min[1] <= 1.6 + EPS && b.max[2] - b.min[2] <= 1.6 + EPS, `${id}: offhand larger than 16 voxels`);
  }
  for (const k of ['grip_main', 'grip_off', 'eyes', 'head_top', 'muzzle', 'body_center', 'feet']) assert.ok(c.model.attach[k], `${id}: attach ${k}`);
  // weapon length rule (spec 4.1): the tip of a thrust never passes range + radius + 0.3 from the body axis (standard/bows are noClamp by library design)
  const wm = PART_REGISTRY.mains[bp.main].meta;
  if (st && st.melee && bp.main !== 'none' && !wm.noClamp && wm.style !== 'shoot') {
    const radius = opts.radius ?? BODY_RADIUS[bp.body.type], maxD = Math.min(3.6, st.melee.range + radius + 0.3);
    assert.ok(c.reach * (opts.scale || 1) <= maxD + 0.02, `${id}: weapon reach ${(c.reach * (opts.scale || 1)).toFixed(2)} > ${maxD.toFixed(2)}`);
  }
  // deterministic
  assert.equal(hashModel(compileSoldier(bp, opts).model), hashModel(c.model), `${id}: compile is not deterministic`);
  // U3: pooled >= 30% in the rest AND the ready pose, every projection >= 22% (spec/verification U3)
  const t = tintReport(bp, opts);
  assert.ok(t.tint.pooled >= 0.30 && t.tintRest.pooled >= 0.30, `${id}: tint ${(t.tint.pooled * 100).toFixed(1)}/${(t.tintRest.pooled * 100).toFixed(1)}% < 30%`);
  for (const k of ['front', 'back', 'side']) { assert.ok(t.tint[k] >= 0.22 - EPS, `${id}: ready ${k} ${(t.tint[k] * 100).toFixed(1)}%`); assert.ok(t.tintRest[k] >= 0.22 - EPS, `${id}: rest ${k} ${(t.tintRest[k] * 100).toFixed(1)}%`); }
  let team = 0; for (const p of c.model.parts) for (let i = 0; i < p.grid.d.length; i++) if (p.grid.d[i] && ((p.grid.d[i] >>> 24) & 2)) team++;
  assert.ok(team > 100, `${id}: F_TEAM voxels ${team}`);
  // every shield carries a tint band >= 3 voxels wide (the tinted voxels, seen along z, run >= 3 cells in some row or column)
  if (c.model.byId.offhand && PART_REGISTRY.offs[bp.off].meta.kind === 'shield') {
    const g = c.model.byId.offhand.grid; let best = 0;
    const tinted = (x, y) => { for (let z = 0; z < g.sz; z++) { const q = g.d[x + g.sx * (z + g.sz * y)]; if (q && ((q >>> 24) & 2)) return true; } return false; };
    for (let y = 0; y < g.sy; y++) { let run = 0; for (let x = 0; x < g.sx; x++) { run = tinted(x, y) ? run + 1 : 0; best = Math.max(best, run); } }
    for (let x = 0; x < g.sx; x++) { let run = 0; for (let y = 0; y < g.sy; y++) { run = tinted(x, y) ? run + 1 : 0; best = Math.max(best, run); } }
    assert.ok(best >= 3, `${id}: shield tint band only ${best} voxels wide`);
  }
  rows.push(`${id} ${(t.tint.pooled * 100).toFixed(0)}/${(t.tintRest.pooled * 100).toFixed(0)}%`);
}

// ---------------------------------------------------------------- the parts: bounds, solid flags, determinism, naming, Workshop listing (E4)
const OWN = { helms: P_HELMS.helms, faces: P_FACES.faces, tunics: P_GARB.tunics, armors: P_GARB.armors, shoulders: P_GARB.shoulders, capes: P_GARB.capes, backs: P_GARB.backs, legs: P_GARB.legs, mains: P_GEAR.mains, offs: P_GEAR.offs };
let oob = [], tag = '';
const allOob = [];
const origSet = VoxelGrid.prototype.set, origIfEmpty = VoxelGrid.prototype.setIfEmpty;
const check = (g, x, y, z) => { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (!g.inb(x, y, z)) oob.push(`${tag} wrote (${x},${y},${z}) outside ${g.sx}x${g.sy}x${g.sz}`); };
VoxelGrid.prototype.set = function (x, y, z, v) { if (v) check(this, x, y, z); return origSet.call(this, x, y, z, v); };
VoxelGrid.prototype.setIfEmpty = function (x, y, z, v) { if (v) check(this, x, y, z); return origIfEmpty.call(this, x, y, z, v); };
const bp0 = defaultBlueprint();
const colorSets = [bp0,
  Object.assign(JSON.parse(JSON.stringify(bp0)), { colors: { primary: '#2a5db0', secondary: '#ffffff', trim: '#111111', metal: 'blackiron', cloth: '#ffffff' }, emblem: 'skull' }),
  Object.assign(JSON.parse(JSON.stringify(bp0)), { colors: { primary: '#d4a017', secondary: '#111111', trim: '#ffeecc', metal: 'silver', cloth: '#222222' }, emblem: 'eagle' })];
const hashGrid = (g) => { let h = 2166136261; for (let i = 0; i < g.d.length; i++) h = Math.imul(h ^ g.d[i], 16777619) >>> 0; return h; };
let nParts = 0;
for (const [cat, set] of Object.entries(OWN)) {
  for (const id of Object.keys(set)) {
    const e = PART_REGISTRY[cat][id];
    assert.ok(e && e === set[id], `${cat}.${id} is registered`);
    assert.ok(e.name && e.name.length > 3 && e.meta && typeof e.meta.faction === 'string', `${cat}.${id} has a name and a faction tag`);
    assert.ok(!e.unlock, `${cat}.${id}: no unlock key expected (not a silly part)`);
    const listed = listParts(cat, new Set()).find((p) => p.id === id);
    assert.ok(listed && !listed.locked, `${cat}.${id} is Workshop-selectable`);
    for (const [ci, bp] of colorSets.entries()) {
      oob = []; tag = `${cat}.${id}[${ci}]`;
      const ctx = makeCtx(bp, {}); ctx.rng = new RNG(hashString(bp.id + id)); ctx.len = e.meta.len || 0; ctx.back = e.meta.back ?? 8;
      const out = e.build(ctx);
      const map = out instanceof VoxelGrid ? { [CATEGORIES[cat].target]: out } : (out || {});
      for (const pid of Object.keys(map)) {
        const g = map[pid]; if (!g) continue;
        assert.ok(DIM[pid], `${tag} unknown part ${pid}`); assert.deepEqual([g.sx, g.sy, g.sz], DIM[pid].size, `${tag} ${pid} grid size`);
        for (let i = 0; i < g.d.length; i++) assert.ok(g.d[i] === 0 || (g.d[i] >>> 24 & 1) === 1, `${tag} ${pid} voxel without the solid flag`);
        if (ci === 0) { const ctx2 = makeCtx(bp, {}); ctx2.rng = new RNG(hashString(bp.id + id)); ctx2.len = e.meta.len || 0; ctx2.back = e.meta.back ?? 8; assert.equal(hashGrid(e.build(ctx2)[pid] || map[pid]), hashGrid(g), `${tag} not deterministic`); }
        nParts++;
      }
      allOob.push(...new Set(oob));
    }
  }
}
VoxelGrid.prototype.set = origSet; VoxelGrid.prototype.setIfEmpty = origIfEmpty;
assert.deepEqual(allOob, [], 'out-of-bounds writes: ' + allOob.slice(0, 30).join(' | '));
const nOwn = Object.values(OWN).reduce((n, s) => n + Object.keys(s).length, 0);
assert.ok(nOwn >= 30, `new faction parts: ${nOwn}`);
// every new part changes the compiled model when swapped into a plain base (E4)
const base = Object.assign(defaultBlueprint(), { id: 'ua_swap', head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'bare', skirt: 'none' }, shoulders: 'none', cape: 'none', back: 'none', main: 'none', off: 'none' });
const SLOT = { helms: ['head', 'helm'], faces: ['head', 'face'], armors: ['torso', 'armor'], tunics: ['torso', 'tunic'], legs: ['legs', 'armor'], shoulders: [null, 'shoulders'], capes: [null, 'cape'], backs: [null, 'back'], mains: [null, 'main'], offs: [null, 'off'] };
const h0 = hashModel(compileSoldier(base).model);
for (const [cat, set] of Object.entries(OWN)) for (const id of Object.keys(set)) {
  const b = JSON.parse(JSON.stringify(base)); const [g, k] = SLOT[cat]; if (g) b[g][k] = id; else b[k] = id;
  const c = compileSoldier(b);
  assert.ok(c.parts <= 16 && c.voxels >= 400, `${cat}.${id}: ${c.parts} parts ${c.voxels} voxels`);
  assert.notEqual(hashModel(c.model), h0, `${cat}.${id} does not change the model`);
}

// ---------------------------------------------------------------- fuzz: new parts mixed into random legal blueprints always compile within the limits
const rng = new RNG(20260310);
const ownList = []; for (const [cat, set] of Object.entries(OWN)) for (const id of Object.keys(set)) ownList.push([cat, id]);
let fuzz = 0;
for (let i = 0; i < 400; i++) {
  const b = randomBlueprint(rng, { name: 'Fuzz' }); b.id = 'ua_fuzz_' + i;
  for (let k = 0; k < 3; k++) { const [cat, id] = ownList[Math.floor(rng.next() * ownList.length)]; const [g, key] = SLOT[cat]; if (g) b[g][key] = id; else b[key] = id; }
  const v = validateBlueprint(b); assert.ok(v.ok, v.errors.join(' '));
  const c = compileSoldier(b);
  assert.ok(c.parts <= 16 && c.voxels >= 200 && c.voxels <= 9000, `fuzz ${i}: ${c.parts} parts ${c.voxels} voxels`);
  assert.ok(c.reach <= 3.6 + EPS, `fuzz ${i}: reach ${c.reach}`);
  const bb = restBounds(c.model, (q) => q === 'weapon' || q === 'offhand'); assert.ok(bb.min[1] >= -EPS, `fuzz ${i}: weapon/offhand below the floor`);
  fuzz++;
}

// ---------------------------------------------------------------- the chariot crew composes into BEASTS' chariot within the 48-part cap and keeps its tint
{
  const driver = compileSoldier(BLUEPRINTS.crew_chariot_driver).model, archer = compileSoldier(BLUEPRINTS.crew_chariot_archer).model;
  const ch = BUILDERS.chariot_archer({ driver, archer });
  assert.ok(ch.parts.length <= 48, `chariot with UNITS-A crew: ${ch.parts.length} parts`);
  assert.deepEqual(ch.meta.subrigs.map((s) => s.prefix), ['', 'h1_', 'h2_', 'd_', 'a_']);
  assert.ok(ch.byId.d_body && ch.byId.a_weapon && ch.byId.d_legLL && ch.byId.a_legLR, 'crew parts are prefixed d_ / a_');
  const pr = projectModel(ch, null); const cov = pr.front.covered + pr.back.covered + pr.left.covered + pr.right.covered, tin = pr.front.tinted + pr.back.tinted + pr.left.tinted + pr.right.tinted;
  assert.ok(tin / cov >= 0.15, `chariot tint ${(100 * tin / cov).toFixed(1)}% < 15%`);
  // crew stand on the chariot floor: the lowest crew voxel is at the seat height (not buried, not floating)
  const seat = ch.attach.seat_driver, host = ch.byId[seat.part];
  assert.ok(host, 'seat attach host part');
}

console.log(`units_a.test OK: ${rows.join(', ')}; ${nOwn} new parts (${nParts} part-grids), fuzz ${fuzz} blueprints`);
