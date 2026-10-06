// UNITS-B: Persians (immortal, sparabara, xerxes + cataphract / camel riders), Barbarians (axe thrower, druid, chieftain), Mythic monsters (minotaur, cyclops, medusa),
// Carthaginian riders (numidian, hannibal), the centaur's human torso and the elephant / catapult / ballista crews.
// Criteria: U1-ish (each unit has a compiled model and the roster ids are the fixed stats.js ids), U2 (part count, grids, height, voxels, floor/offhand rules, monster scale + voxel
// budget), U3 (team tint measured by tools/tintcheck.mjs, negative control), determinism, unit-specific cues (the visual briefs), E4 (every new part switches the model), part rules
// (no out-of-bounds writes, solid flags, deterministic builders) and the composition with BEASTS' builders (seat error, part cap 48).
import assert from 'node:assert/strict';
import { VoxelGrid, F_TEAM, F_GLOW } from '../../src/voxel/grid.js';
import {
  compileSoldier, validateBlueprint, defaultBlueprint, randomBlueprint, restBounds, makeCtx, PART_REGISTRY, CATEGORIES, DIM, listParts, isPartUnlocked,
} from '../../src/content/era_ancient/blueprints.js';
import { BLUEPRINTS, MODELS, RIDERS, CREWS } from '../../src/content/era_ancient/units/units_b.js';
import { PARTS as P_PERSIAN } from '../../src/content/era_ancient/parts/units_b_persians.js';
import { PARTS as P_BARB } from '../../src/content/era_ancient/parts/units_b_barbarians.js';
import { PARTS as P_MYTH } from '../../src/content/era_ancient/parts/units_b_mythic.js';
import { STAT_TABLE, DEFAULTS } from '../../src/content/era_ancient/stats.js';
import { tintReport, projectModel, MIN_POOLED, MIN_VIEW } from '../../tools/tintcheck.mjs';
import { BUILDERS } from '../../src/content/era_ancient/beasts/index.js';
import { seatError } from '../../src/content/era_ancient/beasts/mounted.js';
import { RNG, hashString } from '../../src/core/rng.js';

const EPS = 1e-6;
const UNITS = ['immortal', 'sparabara', 'xerxes', 'axe_thrower', 'druid', 'chieftain', 'minotaur', 'cyclops', 'medusa'];
const MONSTERS = ['minotaur', 'cyclops', 'medusa'];
const RIDER_IDS = Object.values(RIDERS);
const CREW_IDS = [].concat(...Object.values(CREWS));
const ALL = [...UNITS, ...RIDER_IDS, ...CREW_IDS];

// ---------------------------------------------------------------- the roster: ids are the stats.js ids, every one has a humanoid ModelSpec
for (const id of UNITS) assert.ok(STAT_TABLE[id], `${id} is a stats.js unit`);
for (const id of ALL) { assert.ok(BLUEPRINTS[id], `blueprint ${id}`); assert.deepEqual(Object.keys(MODELS[id]).sort(), ['blueprint', 'kind']); assert.equal(MODELS[id].kind, 'humanoid'); assert.equal(MODELS[id].blueprint, BLUEPRINTS[id]); }
assert.deepEqual(Object.keys(RIDERS).sort(), ['camel_rider', 'cataphract', 'centaur_archer', 'hannibal', 'numidian']);
assert.deepEqual(Object.keys(CREWS).sort(), ['ballista', 'catapult', 'war_elephant']);
assert.deepEqual(CREWS.war_elephant.length + CREWS.catapult.length + CREWS.ballista.length, 7, 'elephant 2 + catapult 3 + ballista 2 crew');
for (const id of ALL) assert.equal(BLUEPRINTS[id].id, id);

const optsFor = (id, defaults) => {
  const st = STAT_TABLE[id];
  if (!st) return {};
  return { range: st.melee ? st.melee.range : undefined, radius: st.radius ?? (defaults ? DEFAULTS.radius : undefined), scale: st.scale };
};
const hashModel = (m) => { let h = 2166136261; for (const p of m.parts) { h = Math.imul(h ^ p.id.length, 16777619) >>> 0; for (let i = 0; i < p.grid.d.length; i++) h = Math.imul(h ^ p.grid.d[i], 16777619) >>> 0; for (const r of p.rest) h = Math.imul(h ^ Math.round(r * 1000), 16777619) >>> 0; } return h; };
const count = (model, pred, parts) => { let n = 0; for (const p of model.parts) { if (parts && !parts.includes(p.id)) continue; const d = p.grid.d; for (let i = 0; i < d.length; i++) if (d[i] && pred(d[i] >>> 24)) n++; } return n; };

// ---------------------------------------------------------------- U2 on every model (also with the sim's default radius)
const compiled = {};
for (const id of ALL) {
  for (const defaults of [false, true]) {
    const bp = BLUEPRINTS[id];
    const v = validateBlueprint(bp); assert.ok(v.ok, `${id}: ${v.errors.join(' ')}`);
    assert.equal(v.warnings.length, 0, `${id}: warnings ${v.warnings.join(' | ')}`);
    const c = compileSoldier(bp, optsFor(id, defaults));
    if (!defaults) compiled[id] = c;
    const m = c.model;
    assert.ok(c.parts <= 16, `${id}: ${c.parts} parts (hum1 caps at 16)`);
    assert.ok(c.height >= 2.4 - EPS && c.height <= 3.4 + EPS, `${id}: height ${c.height.toFixed(3)} outside 2.4-3.4 u`);
    assert.ok(c.voxels >= 600 && c.voxels <= 6000, `${id}: ${c.voxels} voxels outside 600-6000`);
    for (const p of m.parts) {
      assert.deepEqual([p.grid.sx, p.grid.sy, p.grid.sz], DIM[p.id].size, `${id}: ${p.id} is on the canonical grid`);
      assert.ok(restBounds(m, (q) => q === p.id).min[1] >= -EPS, `${id}: part ${p.id} below the foot plane`);
    }
    if (m.byId.offhand) {
      const b = restBounds(m, (q) => q === 'offhand');
      assert.ok(b.min[1] >= -EPS && b.min[2] >= -0.25 - EPS, `${id}: offhand below ground / through the back (${b.min[1].toFixed(2)}, ${b.min[2].toFixed(2)})`);
      assert.ok(b.max[1] - b.min[1] <= 1.6 + EPS && b.max[2] - b.min[2] <= 1.6 + EPS, `${id}: offhand larger than 16 voxels`);
    }
    for (const k of ['grip_main', 'grip_off', 'eyes', 'head_top', 'muzzle', 'body_center', 'feet']) assert.ok(m.attach[k], `${id}: attach ${k}`);
    assert.equal(m.meta.rig, 'hum1');
    assert.ok(c.radius >= 0.3 && c.radius <= 0.7 && c.reach <= 3.6 + EPS, `${id}: radius ${c.radius} reach ${c.reach}`);
    // weapon length rule: the tip of a thrust never passes range + radius + 0.3 (+ one voxel of rounding) from the body axis
    const st = STAT_TABLE[id];
    if (st && st.melee && c.weaponStyle !== 'shoot' && c.weaponLen > (PART_REGISTRY.mains[bp.main].meta.minLen ?? 6)) {
      const sc = st.scale || 1, maxW = Math.min(3.6, st.melee.range + c.radius + 0.3);
      assert.ok(c.reach * sc <= maxW + 0.1 * sc + EPS, `${id}: reach ${(c.reach * sc).toFixed(2)} > range rule ${maxW.toFixed(2)}`);
    }
  }
}
// monsters: scale and voxel budget (spec section 6: units.md scales are minotaur 1.7, cyclops 2.2; medusa is a normal-size humanoid)
assert.equal(STAT_TABLE.minotaur.scale, 1.7); assert.equal(STAT_TABLE.cyclops.scale, 2.2);
for (const id of MONSTERS) { assert.ok(compiled[id].voxels <= 6000, id); assert.ok(compiled[id].height * (STAT_TABLE[id].scale || 1) <= 7.6, `${id}: scaled height`); }
// the shielded infantry rule: a shield >= 12 wide needs radius >= 0.65 in stats.js (SIM owns it; assert it still holds for my units)
for (const id of ['immortal', 'sparabara']) assert.ok(STAT_TABLE[id].radius >= 0.65, `${id} radius`);

// ---------------------------------------------------------------- determinism
for (const id of ALL) {
  const a = compileSoldier(BLUEPRINTS[id], optsFor(id)), b = compileSoldier(JSON.parse(JSON.stringify(BLUEPRINTS[id])), optsFor(id));
  assert.equal(hashModel(a.model), hashModel(b.model), `${id} compile is not deterministic`);
}

// ---------------------------------------------------------------- U3: tint (>= 30% pooled in rest AND ready pose, every projection >= 15%): all my units, monsters included
const rows = [];
for (const id of ALL) {
  const r = tintReport(BLUEPRINTS[id], optsFor(id));
  rows.push(`${id} ${(r.tint.pooled * 100).toFixed(0)}/${(r.tintRest.pooled * 100).toFixed(0)}%`);
  assert.ok(r.pass, `${id}: tint ready ${(r.tint.pooled * 100).toFixed(1)}% rest ${(r.tintRest.pooled * 100).toFixed(1)}% (front ${(r.tint.front * 100).toFixed(0)} back ${(r.tint.back * 100).toFixed(0)} side ${(r.tint.side * 100).toFixed(0)})`);
  assert.ok(r.tint.pooled >= MIN_POOLED && r.tintRest.pooled >= MIN_POOLED);
  for (const k of ['front', 'back', 'side']) assert.ok(r.tint[k] >= MIN_VIEW && r.tintRest[k] >= MIN_VIEW, `${id}: ${k}`);
}
// negative control: strip the F_TEAM flag from a unit and the projection finds no tint
{
  const c = compileSoldier(BLUEPRINTS.minotaur, optsFor('minotaur'));
  let team = 0;
  for (const p of c.model.parts) for (let i = 0; i < p.grid.d.length; i++) { const v = p.grid.d[i]; if (v && ((v >>> 24) & F_TEAM)) { p.grid.d[i] = (v & ~(F_TEAM << 24)) >>> 0; team++; } }
  assert.ok(team > 100, 'minotaur has team voxels');
  const pr = projectModel(c.model, null);
  assert.equal(pr.front.tinted + pr.back.tinted + pr.left.tinted + pr.right.tinted, 0, 'negative control: stripped tint is not counted');
}

// ---------------------------------------------------------------- the visual briefs (spec/units.md): the cue that makes each unit recognisable, as checkable facts
const T_ = (id, parts) => count(compiled[id].model, (f) => f & F_TEAM, parts);
const GL = (id, parts) => count(compiled[id].model, (f) => f & F_GLOW, parts);
{
  // immortal: wicker shield (>= 12 wide, team rim), spear with the gold pomegranate butt, tall cap, scale coat
  const im = compiled.immortal; assert.ok(im.model.byId.offhand && im.weaponStyle === 'thrust');
  assert.ok(PART_REGISTRY.offs[BLUEPRINTS.immortal.off].meta.w >= 12, 'immortal shield >= 12 wide'); assert.ok(T_('immortal', ['offhand']) >= 40, 'shield rim band');
  assert.ok(T_('immortal', ['crest']) >= 20, 'tall tinted cap rises into the crest part'); assert.equal(BLUEPRINTS.immortal.main, 'spear_pomegranate');
  // sparabara: the bow must NOT drop the pavise (one-handed bow); the pavise is 12 wide x 16 tall, with a team band >= 3 voxels across the top
  const sp = compiled.sparabara; assert.ok(sp.model.byId.offhand, 'sparabara keeps the pavise'); assert.ok(!sp.twoHanded && sp.weaponStyle === 'shoot' && sp.warnings.length === 0);
  const pav = sp.model.byId.offhand.grid; let band = 0; for (let x = 2; x <= 13; x++) { let run = 0; for (let y = 15; y >= 0; y--) { let any = 0; for (let z = 0; z < 6; z++) if ((pav.get(x, y, z) >>> 24) & F_TEAM) any = 1; if (any) run++; else break; } band = Math.max(band, run); }
  assert.ok(band >= 3, `pavise band ${band} voxels`); assert.equal(PART_REGISTRY.offs.pavise_wall.meta.w, 12); assert.equal(PART_REGISTRY.offs.pavise_wall.meta.h, 16);
  // xerxes: tall tiara in the crest part, ringlet beard on the chest (body), gold robe parts, a shield with a team rim
  assert.ok(compiled.xerxes.height >= 3.2, 'tall tiara'); assert.ok(T_('xerxes', ['body', 'armUL', 'armUR']) > 200, 'robe is team cloth'); assert.ok(T_('xerxes', ['offhand']) >= 30);
  // cataphract rider: pennon on the lance (weapon part) and a shield rim; conical helm reaches the crest part
  assert.ok(T_('rider_cataphract', ['weapon']) >= 8, 'lance pennon'); assert.ok(T_('rider_cataphract', ['offhand']) >= 20, 'shield rim'); assert.ok(compiled.rider_cataphract.model.byId.crest || compiled.rider_cataphract.height >= 3.2);
  // camel rider: turban (head/crest) + back-slung scimitar
  assert.ok(T_('rider_camel', ['head', 'crest']) >= 40, 'turban'); assert.equal(BLUEPRINTS.rider_camel.back, 'scimitar_back');
  // axe thrower: axe in each hand, rack on the back, belt axes; the weapon is the throw-style francisca
  const at = compiled.axe_thrower; assert.ok(at.model.byId.offhand && at.model.byId.back && at.weaponStyle === 'throw');
  assert.ok(compiled.axe_thrower.model.byId.head && count(at.model, (f) => true, ['back']) > 80, 'axe rack voxels');
  // druid: mistletoe glows, golden sickle, white beard
  assert.ok(GL('druid', ['weapon']) >= 4, 'mistletoe berries glow'); assert.ok(compiled.druid.model.byId.offhand, 'sickle'); assert.equal(BLUEPRINTS.druid.body.hair, '#e8e8e8');
  // chieftain: giant horns (taller than the other helms), huge moustache, two-handed club, tinted baldric
  assert.ok(compiled.chieftain.twoHanded && !compiled.chieftain.model.byId.offhand); assert.equal(BLUEPRINTS.chieftain.head.face, 'moustache_huge'); assert.ok(compiled.chieftain.model.byId.crest, 'horns live in the crest part');
  // minotaur: tinted horn caps in the crest part, brass nose ring (gold voxels in the head), double-bit axe
  assert.ok(T_('minotaur', ['crest']) >= 20, 'horn caps'); assert.equal(BLUEPRINTS.minotaur.main, 'greataxe_double');
  // cyclops: boulder in the off hand (14 wide), tree club in the main hand, one eye (no base eyes)
  assert.ok(PART_REGISTRY.offs.boulder.meta.w >= 14); assert.equal(BLUEPRINTS.cyclops.off, 'boulder'); assert.equal(BLUEPRINTS.cyclops.main, 'tree_club'); assert.ok(PART_REGISTRY.helms.cyclops_face.meta.noEyes);
  // medusa: glowing eyes + glowing snake eyes, snakes in the crest, tint on gown and stole, no weapon
  assert.ok(GL('medusa', ['head']) >= 6, `gaze glow ${GL('medusa', ['head'])}`); assert.ok(GL('medusa', ['crest']) >= 6 && GL('medusa', ['head', 'crest', 'body']) >= 12, 'snake eyes glow'); assert.ok(compiled.medusa.model.byId.crest.grid.count() > 100, 'a crown of snakes');
  assert.equal(BLUEPRINTS.medusa.main, 'none');
  // the riders' colour cues: hannibal wears an eyepatch, numidian is bare-headed with braids
  assert.equal(BLUEPRINTS.rider_hannibal.head.face, 'eyepatch'); assert.equal(BLUEPRINTS.rider_numidian.head.hair, 'braids'); assert.equal(BLUEPRINTS.rider_numidian.head.helm, 'brow_band');
}

// ---------------------------------------------------------------- part rules for every NEW part: registered in the registry, named, canonical grids, no OOB writes, solid flags, deterministic
const NEW = {};
for (const set of [P_PERSIAN, P_BARB, P_MYTH]) for (const cat of Object.keys(set)) for (const id of Object.keys(set[cat])) (NEW[cat] || (NEW[cat] = [])).push(id);
let nNew = 0; for (const cat of Object.keys(NEW)) nNew += NEW[cat].length;
assert.ok(nNew >= 35, `new parts ${nNew}`);
let oob = '';
const oS = VoxelGrid.prototype.set, oI = VoxelGrid.prototype.setIfEmpty;
const chk = (g, x, y, z, tag) => { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (!g.inb(x, y, z)) oob += `${tag} wrote (${x},${y},${z}) outside ${g.sx}x${g.sy}x${g.sz}\n`; };
let tag = '';
VoxelGrid.prototype.set = function (x, y, z, v) { if (v) chk(this, x, y, z, tag); return oS.call(this, x, y, z, v); };
VoxelGrid.prototype.setIfEmpty = function (x, y, z, v) { if (v) chk(this, x, y, z, tag); return oI.call(this, x, y, z, v); };
const palettes = [
  defaultBlueprint(),
  Object.assign(defaultBlueprint(), { colors: { primary: '#2a5db0', secondary: '#ffffff', trim: '#111111', metal: 'blackiron', cloth: '#ffffff' }, emblem: 'skull' }),
  Object.assign(defaultBlueprint(), { colors: { primary: '#d4a017', secondary: '#111111', trim: '#ffeecc', metal: 'silver', cloth: '#222222' }, emblem: 'eagle' }),
];
const grid2map = (e, out) => (out instanceof VoxelGrid ? { [CATEGORIES[e.category].target]: out } : (out || {}));
for (const [ci, bp] of palettes.entries()) for (const cat of Object.keys(NEW)) for (const id of NEW[cat]) {
  const e = PART_REGISTRY[cat][id]; assert.ok(e, `${cat}.${id} is registered`); assert.ok(e.name && !/^[a-z_]+$/.test(e.name), `${cat}.${id} has a readable name`);
  const build = () => { const ctx = makeCtx(bp, {}); ctx.rng = new RNG(hashString(bp.id + id)); ctx.len = e.meta.len || 0; ctx.back = e.meta.back ?? 8; return e.build(ctx); };
  tag = `${cat}.${id}[${ci}]`;
  const map = grid2map(e, build());
  for (const pid of Object.keys(map)) {
    const g = map[pid]; if (!g) continue;
    assert.ok(DIM[pid], `${tag}: unknown part ${pid}`); assert.deepEqual([g.sx, g.sy, g.sz], DIM[pid].size, `${tag} ${pid} grid`);
    for (let i = 0; i < g.d.length; i++) assert.ok(g.d[i] === 0 || ((g.d[i] >>> 24) & 1) === 1, `${tag} ${pid}: voxel without the solid flag`);
    if (ci === 0) { const again = grid2map(e, build())[pid]; assert.deepEqual(Array.from(again.d), Array.from(g.d), `${tag} ${pid} not deterministic`); }
  }
  assert.ok(Object.keys(map).some((k) => map[k] && map[k].count() > 0), `${tag} builds nothing`);
}
VoxelGrid.prototype.set = oS; VoxelGrid.prototype.setIfEmpty = oI;
assert.equal(oob, '', 'out-of-bounds writes:\n' + oob.split('\n').slice(0, 20).join('\n'));
// weapon metadata contract of the new weapons
for (const id of NEW.mains) { const m = PART_REGISTRY.mains[id].meta; assert.deepEqual(m.grip, [4, 10, 4]); assert.ok(m.len >= 6 && m.len <= 38 && (m.back ?? 8) <= 10 && Array.isArray(m.rest) && m.rest.length === 3, id); assert.ok(Number.isFinite(m.reach) && m.reach <= 3.6 + 1e-9, `${id} natural reach`); }
// the new offhands stay within 16 x 16 x 6 and keep their pivot at the grip
for (const id of NEW.offs) { const e = PART_REGISTRY.offs[id]; const g = e.build(Object.assign(makeCtx(defaultBlueprint(), {}), { rng: new RNG(1), len: 0, back: 0 })); assert.deepEqual([g.sx, g.sy, g.sz], [16, 16, 6], id); }
// no new part needs an unlock (the specs name none): they are selectable in the Workshop from the start
for (const cat of Object.keys(NEW)) for (const id of NEW[cat]) assert.ok(isPartUnlocked(PART_REGISTRY[cat][id], new Set()), `${cat}.${id} unlocked`);
for (const cat of Object.keys(NEW)) { const listed = listParts(cat, new Set()).map((p) => p.id); for (const id of NEW[cat]) assert.ok(listed.includes(id) && !listParts(cat, new Set()).find((p) => p.id === id).locked, `${cat}.${id} in the Workshop list`); }

// ---------------------------------------------------------------- E4: swapping any new part into a base soldier visibly changes the model and stays within U2
{
  const base = Object.assign(defaultBlueprint(), {
    id: 'ub_swap', head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'none', off: 'none', emblem: 'lambda',
  });
  const SLOT = { helms: ['head', 'helm'], hair: ['head', 'hair'], faces: ['head', 'face'], armors: ['torso', 'armor'], tunics: ['torso', 'tunic'], legs: ['legs', 'armor'], skirts: ['legs', 'skirt'], shoulders: [null, 'shoulders'], capes: [null, 'cape'], backs: [null, 'back'], mains: [null, 'main'], offs: [null, 'off'] };
  const h0 = hashModel(compileSoldier(base).model); let n = 0;
  for (const cat of Object.keys(NEW)) for (const id of NEW[cat]) {
    const bp = JSON.parse(JSON.stringify(base)); const [g, k] = SLOT[cat]; if (g) bp[g][k] = id; else bp[k] = id;
    if (cat === 'mains' && PART_REGISTRY.mains[id].meta.twoHanded) bp.off = 'none';
    const c = compileSoldier(bp, { range: 1.6, radius: 0.55 });
    assert.ok(c.parts <= 16 && c.voxels >= 600 && c.voxels <= 6000 && c.height <= 3.4 + EPS, `${cat}.${id}: ${c.parts} parts ${c.voxels} voxels height ${c.height.toFixed(2)}`);
    assert.notEqual(hashModel(c.model), h0, `${cat}.${id} does not change the model`); n++;
  }
  // fuzz: random legal blueprints (core + new parts mixed) compile within U2
  const rng = new RNG(60601); let usedNew = 0;
  for (let i = 0; i < 400; i++) {
    const bp = randomBlueprint(rng, {}); const v = validateBlueprint(bp, { unlocked: new Set() }); assert.ok(v.ok, v.errors.join(' '));
    const c = compileSoldier(bp, i % 3 === 0 ? { range: 1.6, radius: 0.55 } : {});
    assert.ok(c.parts <= 16 && c.height <= 3.5 && c.voxels >= 600 && c.voxels <= 6000 && c.reach <= 3.6 + EPS, `${bp.id}: ${c.parts}/${c.height}/${c.voxels}`);
    for (const [cat, ids] of Object.entries(NEW)) { const [g, k] = SLOT[cat]; if (ids.includes(g ? bp[g][k] : bp[k])) { usedNew++; break; } }
  }
  assert.ok(usedNew > 40, `fuzz exercised the new parts (${usedNew})`);
  console.log(`E4: ${n} new-part swaps change the model; fuzz 400 (new parts in ${usedNew})`);
}

// ---------------------------------------------------------------- composition with BEASTS: riders seat on the saddle, crews stand on the machines, <= 48 parts
// (compileSoldier has no `lite` option: the crews are ordinary hum1 soldiers of 10-12 parts, see docs/requests/units_b_integration.md)
{
  const cm = (id) => compileSoldier(BLUEPRINTS[id], { lite: true }).model;
  assert.equal(compiled.crew_catapult_a.parts, compileSoldier(BLUEPRINTS.crew_catapult_a, { lite: true }).parts, 'the lite flag is ignored by the compiler today');
  for (const [unit, rid] of Object.entries(RIDERS)) {
    const m = BUILDERS[unit]({ rider: cm(rid) });
    assert.ok(m.parts.length <= 48, `${unit}: ${m.parts.length} parts`);
    if (unit !== 'centaur_archer') { assert.ok(seatError(m) < 0.05, `${unit}: seat error ${seatError(m)}`); assert.ok(m.byId.r_weapon && m.byId.r_legLL && m.byId.r_head, `${unit}: real rider parts are prefixed`); }
    else { assert.ok(m.byId.r_weapon && m.byId.r_head && !m.byId.r_legUL, 'centaur torso keeps the bow and loses its legs'); }
    assert.deepEqual(m.meta.subrigs.map((s) => s.prefix).slice(0, 2), ['', 'r_']);
  }
  const crews = (u) => CREWS[u].map(cm);
  const el = BUILDERS.war_elephant({ crew: crews('war_elephant') }), ca = BUILDERS.catapult({ crew: crews('catapult') }), ba = BUILDERS.ballista({ crew: crews('ballista') });
  assert.ok(el.parts.length <= 48 && ca.parts.length <= 48 && ba.parts.length <= 48, `${el.parts.length}/${ca.parts.length}/${ba.parts.length}`);
  assert.deepEqual(el.meta.subrigs.map((s) => s.prefix), ['', 'a1_', 'a2_']); assert.deepEqual(ca.meta.subrigs.map((s) => s.prefix), ['', 'c1_', 'c2_', 'c3_']); assert.deepEqual(ba.meta.subrigs.map((s) => s.prefix), ['', 'c1_', 'c2_']);
  assert.ok(el.byId.a1_weapon && el.byId.a2_weapon, 'the howdah archers carry bows');
  // composed units stay team-tinted (>= 15% for non-humanoids is BEASTS'; here: crews and riders contribute tinted voxels)
  for (const m of [el, ca, ba, BUILDERS.cataphract({ rider: cm('rider_cataphract') })]) assert.ok(count(m, (f) => f & F_TEAM) > 500, `${m.id} team voxels`);
}

console.log('units_b.test OK: ' + rows.join(', '));
