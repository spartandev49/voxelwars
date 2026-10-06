// Custom soldiers: customDef / effectiveScale / clamps / compile of random blueprints / content binding (E4, E6, U8 cost clamp, caps of spec §5.1).
import assert from 'node:assert/strict';
import * as C from '../../../src/content/era_ancient/custom.js';
import { compileSoldier, randomBlueprint, PART_REGISTRY, BODY_TYPES } from '../../../src/content/era_ancient/blueprints.js';
import { statsToUnitDef, costFormula, clampedCost, roleEfficiency, EFFICIENCY_CAP, STAT_CAPS } from '../../../src/sim/stats.js';
import { power } from '../../../src/sim/power.js';
import { buildContent } from '../../../src/content/era_ancient/content.js';
import { RNG } from '../../../src/core/rng.js';
import { CATCHPHRASES, DEATH_QUOTES, BLURBS } from '../../../src/content/era_ancient/custom_text.js';

// ---- the scale clamp is applied AFTER the multiplication (spec §4.1 / §5.1)
assert.deepEqual(C.effectiveScale('slim', 0.9).map((x) => +x.toFixed(4)), [0.85, 0.9, 0.85], 'slim at 0.9 still measures 0.85 on x and z');
assert.deepEqual(C.effectiveScale('average', 1).map((x) => +x.toFixed(4)), [1, 1, 1]);
assert.ok(Math.abs(C.effectiveScale('stocky', 1.2)[0] - 1.344) < 1e-9, 'largest soldier is 1.344 on x and z');
assert.ok(C.effectiveScale('stocky', 1.2).every((x) => x <= 1.35), 'no giants');
for (const t of Object.keys(BODY_TYPES)) for (let h = 0.5; h <= 2; h += 0.01) for (const x of C.effectiveScale(t, h)) assert.ok(x >= 0.85 && x <= 1.35, `${t} ${h}: ${x}`);
assert.deepEqual(C.effectiveScale('average', NaN), [1, 1, 1], 'NaN height falls back to 1');
assert.equal(C.radiusFor('average', 5), 0.7); assert.equal(C.radiusFor('average', 0.01), 0.3); assert.equal(C.radiusFor('slim'), 0.5); assert.equal(C.radiusFor('stocky'), 0.62);

// ---- defaults and text pools
for (const q of CATCHPHRASES.concat(DEATH_QUOTES)) assert.ok(q.length <= 40 && q.length >= 8, 'quote length: ' + q);
for (const k of Object.keys(BLURBS)) for (const b of BLURBS[k]) assert.ok(b.split(/\s+/).length <= 14, 'blurb words: ' + b);
const rng = new RNG(5);
for (let i = 0; i < 50; i++) { const cs = C.newSoldier(rng); assert.ok(cs.name.length >= 1 && cs.name.length <= 40); assert.ok(/^cs_[a-z0-9]{1,5}$/.test(cs.id), cs.id); assert.equal(cs.blueprint.id, cs.id); assert.ok(C.statsTotal(cs.stats) <= 100); }

// ---- customDef == costFormula of the derived def (E4: "cost shown live equals costFormula")
const base = C.newSoldier(new RNG(11));
for (const main of ['dory', 'gladius', 'longbow', 'javelin', 'scepter', 'sarissa', 'fish', 'club_big', 'none', 'sling']) {
  const cs = JSON.parse(JSON.stringify(base)); cs.blueprint.main = main; cs.id = 'cs_t' + main.slice(0, 6);
  const ws = PART_REGISTRY.mains[main].meta.style;
  const d = C.customDef(cs);
  const ref = statsToUnitDef({ id: cs.id, name: cs.name, blueprint: cs.blueprint, stats: cs.stats, abilities: [], ai: undefined, text: {} }, { weaponStyle: ws, shield: PART_REGISTRY.mains[main].meta.twoHanded ? null : undefined, radius: undefined });
  assert.equal(d.cost, clampedCost(ref), `${main}: cost is the clamped cost formula of the derived def`);
  assert.equal(d.weaponStyle, ws); assert.equal(d.faction, 'custom'); assert.ok(d.custom);
  assert.ok(d.cost >= 10 && Number.isInteger(d.cost));
  assert.ok(d.text.deaths.length === 3 && d.text.deaths.every((x) => x.length <= 40) && d.text.blurb);
  assert.ok(d.radius >= 0.3 && d.radius <= 0.7);
}
// cost is monotonic in points and the efficiency clamp holds (U8 slice)
{
  const cs = JSON.parse(JSON.stringify(base)); let last = 0;
  for (let hp = 0; hp <= 30; hp += 5) { cs.stats.hp = hp; const c = C.customDef(Object.assign({}, cs, { stats: Object.assign({}, cs.stats) })).cost; assert.ok(c >= last, 'cost never drops as hp grows'); last = c; }
}
const mains = Object.keys(PART_REGISTRY.mains);
for (let i = 0; i < 400; i++) {
  const r = new RNG(1000 + i), bp = randomBlueprint(r);
  const st = {}; let left = 100; for (const k of C.STAT_KEYS) { const v = Math.min(left, r.int(0, STAT_CAPS[k])); st[k] = v; left -= v; }
  const cs = { v: 1, id: 'cs_f' + i, name: 'Fuzz ' + i, blueprint: bp, stats: st, abilities: C.legalAbilityIds(bp).slice(0, r.int(0, 2)), ai: 'charge', height: r.range(0.9, 1.2), text: {} };
  const d = C.customDef(cs);
  assert.ok(power(d) / d.cost <= EFFICIENCY_CAP * roleEfficiency(d.role) + 1e-6, `U8: efficiency of ${bp.main}/${JSON.stringify(st)} is over ${EFFICIENCY_CAP}x`);
  assert.ok(d.radius >= 0.3 && d.radius <= 0.7 && d.hp > 0 && d.speed > 0);
}

// ---- compile 200 random blueprints through the same path the battle uses: all valid, <= 48 parts, voxel and height bounds
{
  let maxParts = 0, maxVox = 0;
  for (let i = 0; i < 200; i++) {
    const r = new RNG(7000 + i), bp = randomBlueprint(r, { name: 'R' + i });
    const cs = { v: 1, id: 'cs_c' + i, name: 'Compile ' + i, blueprint: bp, stats: { hp: 10, damage: 10, attackSpeed: 5, speed: 5, armor: 5, range: r.int(0, 10), morale: 5 }, abilities: [], ai: 'charge', height: r.range(0.9, 1.2), text: {} };
    const out = C.compileCustom(cs);
    const c = out.compiled;
    assert.ok(c.parts <= 48 && c.parts <= 16, `parts ${c.parts}`); assert.ok(c.voxels >= 600 && c.voxels <= 6000, `voxels ${c.voxels}`);
    assert.ok(c.reach <= 3.6 + 1e-6, `reach ${c.reach}`); assert.ok(c.radius >= 0.3 && c.radius <= 0.7);
    for (let k = 0; k < 3; k++) { const e = out.eff[k]; assert.ok(e >= 0.85 - 1e-9 && e <= 1.35 + 1e-9); assert.ok(Math.abs(out.def.scale * out.scale[k] - e) < 1e-9, 'def.scale * scale == effective scale'); }
    assert.equal(out.compiled.model.meta.weaponStyle, c.weaponStyle);
    maxParts = Math.max(maxParts, c.parts); maxVox = Math.max(maxVox, c.voxels);
  }
  console.log('compile 200: max parts', maxParts, 'max voxels', maxVox);
}

// ---- normalisation never throws and never lets anything illegal through
for (const g of [null, undefined, 5, 'x', [], {}, { blueprint: 5 }, { name: 7, stats: { hp: 999, damage: -5, armor: NaN }, abilities: ['kick', 'kick', 'x', 'rage', 'net'], height: 99, radius: -2 }, JSON.parse('{"__proto__":{"a":1},"name":"x"}')]) {
  const n = C.normalizeSoldier(g); assert.ok(n.bp && n.stats && n.abilities.length <= 2 && n.name.length >= 1 && n.name.length <= 40);
  assert.ok(C.statsTotal(n.stats) <= 100 && C.STAT_KEYS.every((k) => n.stats[k] >= 0 && n.stats[k] <= STAT_CAPS[k]));
  assert.ok(n.height >= 0.9 && n.height <= 1.2); const d = C.customDef(g); assert.ok(d.cost > 0 && d.radius >= 0.3 && d.radius <= 0.7);
}
// two-handed weapon drops the shield (no shield block in the derived def)
{ const cs = JSON.parse(JSON.stringify(base)); cs.blueprint.main = 'sarissa'; cs.blueprint.off = 'hoplon'; assert.equal(C.customDef(cs).shield, undefined); cs.blueprint.main = 'dory'; assert.ok(C.customDef(cs).shield); }
// ability legality: heal_pulse needs a staff or scepter; kick needs melee
{ const bp = JSON.parse(JSON.stringify(base.blueprint));
  bp.main = 'gladius'; assert.ok(C.legalAbilityIds(bp).includes('kick') && !C.legalAbilityIds(bp).includes('heal_pulse')); assert.match(C.abilityReason('heal_pulse', bp), /staff or a scepter/);
  bp.main = 'staff'; assert.ok(C.legalAbilityIds(bp).includes('heal_pulse')); bp.main = 'scepter'; assert.ok(C.legalAbilityIds(bp).includes('heal_pulse') && C.legalAbilityIds(bp).includes('chain_lightning'));
  bp.main = 'longbow'; assert.ok(!C.legalAbilityIds(bp).includes('kick')); assert.match(C.abilityReason('kick', bp), /Bow weapon/);
  bp.main = 'mace'; assert.ok(!C.legalAbilityIds(bp).includes('heal_pulse')); }
// the weapon length rule sees the derived range: more range points keep a long weapon longer
{ const cs = JSON.parse(JSON.stringify(base)); cs.blueprint.main = 'sarissa'; cs.stats.range = 0; const a = C.compileCustom(cs).compiled.weaponLen; cs.stats.range = 10; const b = C.compileCustom(cs).compiled.weaponLen; assert.ok(b >= a, `range points never shorten the weapon (${a} -> ${b})`); }

// ---- content binding: non-enumerable registration, custom model path, shipped ids are never shadowed
{
  const content = buildContent(); const before = Object.keys(content.defs).length;
  const store = [JSON.parse(JSON.stringify(base)), Object.assign(JSON.parse(JSON.stringify(base)), { id: 'cs_second', name: 'Second' }), Object.assign(JSON.parse(JSON.stringify(base)), { id: 'hoplite', name: 'Impostor' })];
  C.bindContent(content, { list: () => store });
  assert.equal(Object.keys(content.defs).length, before, 'custom defs are invisible to enumeration (armygen, Codex, balance)');
  assert.ok(content.defs[base.id] && content.defs[base.id].custom, 'but resolvable by id for Game.placeAt and World.addUnit');
  assert.ok(!content.defs.hoplite.custom, 'a shipped id is never shadowed');
  assert.ok(!content.unitList().some((d) => d.custom));
  const d = content.customDef(store[0]); assert.equal(d.id, base.id);
  const mm = content.modelFor(d, null); assert.ok(mm.model.parts.length >= 10 && mm.scale.length === 3);
  assert.equal(content.modelFor(d, null), mm, 'cached per revision');
  const edited = JSON.parse(JSON.stringify(base)); edited.blueprint.head.helm = 'attic'; const d2 = content.customDef(edited);
  assert.notEqual(d2.rev, d.rev); assert.notEqual(content.modelFor(d2, null), mm, 'an edited soldier gets a new model');
  assert.ok(content.modelFor(content.defs.hoplite, null).model, 'shipped units still resolve');
  C.bindContent(content, null);   // idempotent
}
console.log('custom OK');
