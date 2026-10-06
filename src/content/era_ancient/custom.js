// Custom soldiers (spec §5.1, editors.md §2): CustomSoldier -> UnitDef, the clamps, and the glue that lets the Placement palette and the battle view use them.
// Pure JS (no DOM, no THREE, no Math.random): runs in Node for the validators, the fuzzers and the balance harness.
//
//   customDef(cs)            -> UnitDef (statsToUnitDef + height + cost clamp); never throws. COORD wires it as ctx.content.customDef.
//   compileCustom(cs, opts)  -> {compiled, def, scale, eff}: the ModelDef the battle view and the Workshop show (weapon length rule fed with the derived range).
//   effectiveScale(type, h)  -> [sx, sy, sz] = clamp(h * bodyTypeScale[axis], 0.85, 1.35)   (the clamp is applied AFTER the multiplication)
//   normalizeSoldier(cs)     -> clamped copy + warnings (used by the def derivation and by the validators in save/validate.js)
//   bindContent(content, collection?)  registers the saved soldiers as NON-ENUMERABLE entries of content.defs (so Game.placeAt / World.addUnit resolve them by id,
//                            while armygen, the Codex and the balance harness, which enumerate defs, never see them) and wraps content.modelFor for custom defs.
import { RNG, hashString, clamp } from '../../core/rng.js';
import { PART_REGISTRY, validateBlueprint, defaultBlueprint, compileSoldier, BODY_TYPES, BODY_RADIUS } from './blueprints.js';
import { STAT_CAPS, STAT_POINTS, MAX_ABILITIES, ABILITY_PRESETS, legalAbilities, statsToUnitDef, clampedCost, costFormula, SHIELDS } from '../../sim/stats.js';
import { power } from '../../sim/power.js';
import { randomName } from './humor/names.js';
import { BLURBS, LORE, CODEX_JOKES, CLASS_LABEL, ABILITY_TEXT, pickSeeded, defaultQuotes } from './custom_text.js';

export { STAT_CAPS, STAT_POINTS, MAX_ABILITIES, ABILITY_PRESETS, CLASS_LABEL, ABILITY_TEXT };
export const STAT_KEYS = Object.keys(STAT_CAPS);              // hp, damage, attackSpeed, speed, armor, range, morale
export const HEIGHT_MIN = 0.9, HEIGHT_MAX = 1.2;
export const SCALE_MIN = 0.85, SCALE_MAX = 1.35;
export const RADIUS_MIN = 0.3, RADIUS_MAX = 0.7;
export const NAME_MAX = 40, QUOTE_MAX = 40, PITCH_MIN = 0.7, PITCH_MAX = 1.4;
export const AI_STYLES = ['charge', 'hold', 'skirmish', 'flank', 'guard', 'support'];
export const LIBRARY_CAP = 24;
export const SHARE_LIMIT = 38000;
/** Unlock keys of the campaign rewards (parts/_registry.js UNLOCKS) -> the mission id that grants them (world.md §6). */
export const UNLOCK_MISSIONS = { silly_helms: 'pyramid_scheme', silly_weapons: 'alps_elephant', wings: 'zeus_bad_day' };
const HEALER_BASH = new Set(['staff', 'vine_staff']);        // heal_pulse needs a staff or scepter (editors.md §2)

const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ------------------------------------------------------------------------------------------------ scale / radius
/** Effective instance scale per axis (spec §5.1): the height slider times the body-type vector, then clamped to 0.85-1.35. */
export function effectiveScale(bodyType, height) {
  const b = BODY_TYPES[bodyType] || BODY_TYPES.average;
  const h = clamp(num(height, 1), HEIGHT_MIN, HEIGHT_MAX);
  return [clamp(h * b[0], SCALE_MIN, SCALE_MAX), clamp(h * b[1], SCALE_MIN, SCALE_MAX), clamp(h * b[2], SCALE_MIN, SCALE_MAX)];
}
/** Collider radius: the optional override clamped to 0.3-0.7, else the body-type default. (statsToUnitDef then applies the big-shield rule.) */
export function radiusFor(bodyType, override) {
  const base = BODY_RADIUS[bodyType] || BODY_RADIUS.average;
  return clamp(override === undefined || override === null ? base : num(override, base), RADIUS_MIN, RADIUS_MAX);
}

// ------------------------------------------------------------------------------------------------ weapons and abilities
export const mainEntry = (bp) => (bp && PART_REGISTRY.mains[bp.main]) || PART_REGISTRY.mains.none;
export const weaponStyleOf = (bp) => (mainEntry(bp).meta && mainEntry(bp).meta.style) || 'none';
export const isTwoHanded = (bp) => !!(mainEntry(bp).meta && mainEntry(bp).meta.twoHanded);

/** Ability ids a soldier carrying this blueprint's weapon may pick (weapon class, plus the staff-or-scepter rule of heal_pulse). */
export function legalAbilityIds(bp) {
  const style = weaponStyleOf(bp);
  return legalAbilities(style).filter((a) => a !== 'heal_pulse' || style === 'cast' || HEALER_BASH.has(bp.main));
}
/** '' when `id` is legal for the blueprint's weapon, else a plain-English reason (the Workshop greys the ability out and shows it). */
export function abilityReason(id, bp) {
  if (!ABILITY_PRESETS[id]) return `'${String(id).slice(0, 24)}' is not an ability this game knows.`;
  if (legalAbilityIds(bp).indexOf(id) >= 0) return '';
  const style = weaponStyleOf(bp), w = mainEntry(bp).name;
  if (id === 'heal_pulse') return 'Needs a staff or a scepter in the main hand.';
  const cls = ABILITY_PRESETS[id].classes;
  const names = cls.map((c) => CLASS_LABEL[c] || c).join(', ');
  return `The ${w} is a ${CLASS_LABEL[style] || style} weapon; ${ABILITY_TEXT[id] ? ABILITY_TEXT[id].name : id} needs one of: ${names}.`;
}

// ------------------------------------------------------------------------------------------------ normalisation
export function statsTotal(stats) { let t = 0; for (const k of STAT_KEYS) t += stats && Number.isFinite(stats[k]) ? stats[k] : 0; return t; }
/** Clamp a stat record: integers, 0..cap each, total <= 100 (surplus is dropped from the last stat backwards, like statsToUnitDef does from the front). */
export function clampStats(stats) {
  const out = Object.create(null); let left = STAT_POINTS;
  for (const k of STAT_KEYS) { const v = Math.round(clamp(num(stats && stats[k], 0), 0, STAT_CAPS[k])); out[k] = Math.min(v, left); left -= out[k]; }
  return out;
}
const cleanText = (s, max) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Light, total normalisation of a CustomSoldier (a saved item, an import, a half-edited draft): never throws.
 * Returns {id, name, bp, stats, abilities, ai, text, height, radius, warnings[]}.
 */
export function normalizeSoldier(cs) {
  const warnings = [];
  const src = isObj(cs) ? cs : {};
  const id = typeof src.id === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(src.id) ? src.id : 'cs_' + hashString(String(src.name || 'x')).toString(36).slice(0, 6);
  const name = cleanText(src.name, NAME_MAX) || 'Nameless Recruit';
  let vb = validateBlueprint(isObj(src.blueprint) ? Object.assign({}, src.blueprint, { id: src.blueprint.id === undefined ? id : src.blueprint.id }) : null);
  if (!vb.ok) { warnings.push('The saved look is not valid any more, so a plain recruit stands in. ' + vb.errors[0]); const d = defaultBlueprint(); d.id = id; d.name = name; vb = validateBlueprint(d); }
  const bp = vb.bp;
  const stats = clampStats(src.stats);
  const legal = legalAbilityIds(bp), abilities = [];
  for (const a of Array.isArray(src.abilities) ? src.abilities : []) if (typeof a === 'string' && legal.indexOf(a) >= 0 && abilities.indexOf(a) < 0 && abilities.length < MAX_ABILITIES) abilities.push(a);
  const ai = AI_STYLES.indexOf(src.ai) >= 0 ? src.ai : '';
  const dq = defaultQuotes(id);
  const t = isObj(src.text) ? src.text : {};
  const deaths = (Array.isArray(t.deaths) ? t.deaths : []).slice(0, 3).map((d) => cleanText(d, QUOTE_MAX)).filter(Boolean);
  for (const q of dq.deaths) if (deaths.length < 3 && deaths.indexOf(q) < 0) deaths.push(q);
  while (deaths.length < 3) deaths.push(dq.deaths[deaths.length % dq.deaths.length]);
  const text = { catch: cleanText(t.catch, QUOTE_MAX) || dq.catch, deaths, pitch: clamp(num(t.pitch, 1), PITCH_MIN, PITCH_MAX) };
  return { id, name, bp, stats, abilities, ai, text, height: clamp(num(src.height, 1), HEIGHT_MIN, HEIGHT_MAX), radius: src.radius === undefined ? undefined : radiusFor(bp.body.type, src.radius), warnings };
}

// ------------------------------------------------------------------------------------------------ UnitDef
const firstName = (name) => { const w = String(name).split(' ').filter((x) => x.length > 2 && !/^(sir|dame|lord|lady|dr|doctor|probably|citizen|captain|admiral|private|professor|magistrate|honorary|technically)$/i.test(x)); return w[0] || name; };

function buildText(n, def) {
  const role = def.role === 'ranged' ? 'ranged' : def.role === 'support' ? 'support' : 'melee';
  const w = mainEntry(n.bp).name.toLowerCase();
  const blurb = pickSeeded(BLURBS[role], n.id).replace('{n}', firstName(n.name)).replace('{w}', w);
  return {
    blurb, lore: pickSeeded(LORE, n.id), codexJoke: pickSeeded(CODEX_JOKES, n.id, 1),
    deaths: n.text.deaths.slice(), taunts: [n.text.catch], catch: n.text.catch, engage: [n.text.catch], pitch: n.text.pitch,
  };
}

/** The UnitDef of a custom soldier. `cs` may be a saved item (extra fields are ignored). Pure and cheap (~0.1 ms): not cached, so edits are never stale. */
export function customDef(cs) {
  const n = normalizeSoldier(cs);
  const bp = n.bp, ws = weaponStyleOf(bp);
  const twoH = isTwoHanded(bp);
  const shield = twoH ? null : (SHIELDS[bp.off] || null);
  const d = statsToUnitDef({ id: n.id, name: n.name, blueprint: bp, stats: n.stats, abilities: n.abilities, ai: n.ai || undefined, text: {} }, { weaponStyle: ws, shield, radius: radiusFor(bp.body.type, n.radius) });
  if (n.height !== 1) d.scale = n.height;
  d.cost = clampedCost(d);
  d.clamped = d.cost > costFormula(d);                      // the role-efficiency clamp raised the price above the plain formula
  d.faction = 'custom'; d.custom = true; d.name = n.name;
  d.text = buildText(n, d);
  d.model = { kind: 'humanoid', blueprint: bp, height: n.height };
  d.rev = hashString(JSON.stringify([bp, n.height, d.melee && d.melee.range, d.radius, ws])).toString(36);
  d.warnings = n.warnings;
  return d;
}

/** Cost, derived stats and the power rating of a soldier (everything the Workshop shows, from the DERIVED def: nothing is trusted from a file). */
export function evaluate(cs) {
  const def = customDef(cs), r = def.ranged || null, m = def.melee;
  const atk = r || m;
  return {
    def, cost: def.cost, role: def.role, hp: def.hp, armor: def.armor, speed: def.speed, radius: def.radius, scale: def.scale,
    dmg: atk ? atk.dmg : 0, cd: atk ? atk.cd : 0, range: atk ? atk.range : 0, dps: atk ? atk.dmg / atk.cd : 0, moraleBonus: def.moraleBonus || 0,
    power: power(def), efficiency: power(def) / def.cost,
  };
}

/** Cost of the soldier with one more point in `stat` (the Workshop's "next point" readout) or null at the cap. */
export function nextPointCost(cs, stat) {
  const n = normalizeSoldier(cs); if (n.stats[stat] >= STAT_CAPS[stat] || statsTotal(n.stats) >= STAT_POINTS) return null;
  const s2 = Object.assign({}, n.stats, { [stat]: n.stats[stat] + 1 });
  return customDef(Object.assign({}, cs, { stats: s2 })).cost - customDef(cs).cost;
}
/** Cost impact of carrying ability `id` (the Workshop shows "+9" next to it). */
export function abilityCostDelta(cs, id) {
  const n = normalizeSoldier(cs); const has = n.abilities.indexOf(id) >= 0;
  const without = n.abilities.filter((a) => a !== id), withA = has ? n.abilities : n.abilities.concat([id]);
  return customDef(Object.assign({}, cs, { abilities: withA })).cost - customDef(Object.assign({}, cs, { abilities: without })).cost;
}

// ------------------------------------------------------------------------------------------------ compile
/** The compile options (range, radius, scale) of a derived custom def: the Voxel Painter builds its generated grids with the same ones. */
export function compileOptsOf(def) {
  const bp = def.model.blueprint, eff = effectiveScale(bp.body.type, def.model.height || 1);
  // melee weapons are trimmed to the sim's melee range; a thrown or magic weapon is carried for its projectile, so only the 3.6 u custom cap applies to it
  return { range: def.melee && !def.ranged ? def.melee.range : undefined, radius: def.radius, scale: eff[2] };
}
/**
 * The ModelDef (and metrics) of an already derived custom def, compiled with its own range and radius so the weapon-length rule matches what the sim fights with.
 * `scale` is what the renderer multiplies with def.scale (= height): effective / height, so def.scale * scale equals effectiveScale() on every axis.
 */
export function compileFromDef(def, opts = {}) {
  const bp = def.model.blueprint, h = def.model.height || 1;
  const eff = effectiveScale(bp.body.type, h);
  const c = compileSoldier(bp, Object.assign(compileOptsOf(def), { teamTint: true, unlocked: opts.unlocked }));
  c.model.meta.weaponStyle = c.weaponStyle;
  return { compiled: c, def, eff, scale: [eff[0] / h, eff[1] / h, eff[2] / h] };
}
/** compileFromDef for a CustomSoldier (derives the def first). */
export function compileCustom(cs, opts = {}) {
  const r = compileFromDef(customDef(cs), opts);
  r.normalized = normalizeSoldier(cs);
  return r;
}

// ------------------------------------------------------------------------------------------------ defaults and generators
const hex36 = (x) => (x >>> 0).toString(36).padStart(6, '0').slice(-5);
/** A fresh soldier: the default hoplite-ish look, a funny name, 64 of the 100 points spent (the rest is yours to waste). */
export function newSoldier(rng, opts = {}) {
  const r = rng || new RNG(1);
  const id = opts.id || 'cs_' + hex36(r.int(0, 0x7fffffff));
  const bp = defaultBlueprint(); bp.id = id;
  const name = opts.name || makeName(r);
  bp.name = name;
  const dq = defaultQuotes(id);
  return { v: 1, id, name, blueprint: bp, stats: { hp: 14, damage: 12, attackSpeed: 6, speed: 8, armor: 10, range: 5, morale: 9 }, abilities: [], ai: 'charge', height: 1, text: { catch: dq.catch, deaths: dq.deaths, pitch: 1 } };
}
/** A name that fits the 40-character limit ("Sir Chadius the Mildly Concerned"). */
export function makeName(rng) {
  for (let i = 0; i < 24; i++) { const nm = randomName(rng, { title: 0.45, epithet: 0.8 }); if (nm.length <= NAME_MAX) return nm; }
  return randomName(rng, { title: 0, epithet: 0 });
}
/** Fresh id for a duplicate or an import that collides with the library. */
export function freshId(rng, taken) { let id; do { id = 'cs_' + hex36(rng.int(0, 0x7fffffff)); } while (taken && taken.has(id)); return id; }

// ------------------------------------------------------------------------------------------------ content integration
const BOUND = new WeakSet();
/** Register (or refresh) a custom soldier in content.defs as a non-enumerable entry; refuses to shadow a shipped unit id. Returns the def. */
export function registerCustom(content, cs) {
  const def = customDef(cs);
  const defs = content && content.defs; if (!defs) return def;
  const cur = Object.getOwnPropertyDescriptor(defs, def.id);
  if (cur && cur.enumerable && !(cur.value && cur.value.custom)) return def;           // a shipped id: never overwrite
  Object.defineProperty(defs, def.id, { value: def, enumerable: false, configurable: true, writable: true });
  return def;
}
/**
 * Wire the custom-soldier support into the content object once: customDef registers what it returns, saved soldiers are registered up front,
 * and modelFor builds custom models with compileCustom (cached per id and revision; an edited soldier gets a new model).
 */
export function bindContent(content, collection) {
  if (!content || BOUND.has(content)) return content;
  BOUND.add(content);
  const cache = new Map();
  const orig = typeof content.modelFor === 'function' ? content.modelFor.bind(content) : null;
  content.customDef = (cs) => registerCustom(content, cs);
  content.customModel = (def) => {
    const key = def.id + ':' + def.rev; let r = cache.get(key);
    if (!r) {
      for (const k of Array.from(cache.keys())) if (k.startsWith(def.id + ':')) cache.delete(k);
      const c = compileFromDef(def);
      r = { model: c.compiled.model, scale: c.scale }; cache.set(key, r);
    }
    return r;
  };
  content.modelFor = (def, unit) => {
    if (def && def.custom && def.model && def.model.blueprint) {
      try { return content.customModel(def); } catch (e) { /* fall through to the stock path */ }
    }
    return orig ? orig(def, unit) : null;
  };
  if (collection && typeof collection.list === 'function') for (const cs of collection.list()) { try { registerCustom(content, cs); } catch (e) { /* a broken saved item must not stop the app */ } }
  return content;
}
