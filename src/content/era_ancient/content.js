// Content assembly: merges the numeric truth (stats.js) with models (units/*, beasts/*) and text (humor/*) into full UnitDefs and
// provides modelFor(def, unit) for the renderer. Pure (no DOM/THREE) so tests and the balance harness can use it.
import { STAT_TABLE, FACTIONS } from './stats.js';
import { buildSimDefs } from '../../sim/defs.js';
import { fallbackHumanoid, fallbackBeast } from './fallback_model.js';
import { UNIT_MODEL_MODULES, BEAST_MODULES, HUMOR_MODULES, PART_MODULES } from '../../_generated/registry.content.js';
import { ARENAS } from './arenas.js';
import { MUTATORS } from '../../sim/mutators.js';
import { MUTATORS_TEXT, MUTATORS_HEADING } from './humor/mutators_text.js';
import { TIPS } from './humor/tips.js';
import { ACHIEVEMENTS } from './humor/achievements.js';
import { KILL_VERBS } from './humor/killverbs.js';
import { FIRST_NAMES, TITLES, EPITHETS, randomName } from './humor/names.js';
import { SETTINGS_TIPS, RULES_TIPS } from './humor/ui_text.js';
import { PROP_CATALOG } from './props/catalog.js';
import { FORMATIONS } from '../../sim/formations.js';
import { counterTable } from '../../sim/armygen.js';

function collect(mods, name) { const out = {}; for (const k of Object.keys(mods)) { const m = mods[k]; const v = m[name] || (m.default && m.default[name]); if (v) Object.assign(out, v); } return out; }

/** Campaign-star unlock thresholds for the mutators (spec §14): nine mutators, unlocked in order as stars are earned. */
const MUTATOR_STARS = { big_heads: 3, tiny_titans: 6, moon_gravity: 9, chicken_rain: 12, wine_rain_always: 15, friendly_fire_fiesta: 18, speedy_soldiers: 21, ragdoll_frenzy: 24, glass_cannons: 27 };

export function buildContent() {
  const MODELS = collect(UNIT_MODEL_MODULES, 'MODELS');
  const BUILDERS = collect(BEAST_MODULES, 'BUILDERS');
  const TEXT = collect(HUMOR_MODULES, 'UNIT_TEXT');
  const extra = {};
  for (const id of Object.keys(STAT_TABLE)) { extra[id] = { model: MODELS[id] || null, text: TEXT[id] || null, name: (TEXT[id] && TEXT[id].name) || undefined }; }
  const defs = buildSimDefs(extra);
  for (const id of Object.keys(defs)) { const d = defs[id]; if (!d.name || d.name === id) d.name = id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '); }
  const cache = new Map();
  let compile = null;
  // compileSoldier is optional until UNITS-LIB lands
  const bp = Object.values(PART_MODULES).length ? null : null;
  function setCompiler(fn) { compile = fn; }
  // Riders and crews are humanoid blueprints (units/*.js BLUEPRINTS: rider_<unit>, crew_*) compiled with the same compiler and handed to the beast builders.
  const BPS = collect(UNIT_MODEL_MODULES, 'BLUEPRINTS');
  const CREWS = { chariot_archer: { driver: 'crew_chariot_driver', archer: 'crew_chariot_archer' }, war_elephant: { crew: ['crew_elephant_a', 'crew_elephant_b'] }, catapult: { crew: ['crew_catapult_a', 'crew_catapult_b', 'crew_catapult_c'] }, ballista: { crew: ['crew_ballista_a', 'crew_ballista_b'] } };
  const crewCache = new Map();
  function crewOptions(def) {
    if (!compile) return {};
    let o = crewCache.get(def.id); if (o) return o; o = {};
    const comp = (name) => { try { return BPS[name] ? compile(BPS[name], { teamTint: true }).model : null; } catch (e) { console.warn('crew blueprint failed', name, e); return null; } };
    const c = CREWS[def.id];
    if (c) {
      for (const k of Object.keys(c)) { if (Array.isArray(c[k])) { const list = c[k].map(comp).filter(Boolean); if (list.length) o[k] = list; } else { const m = comp(c[k]); if (m) o[k] = m; } }
    } else {
      const rn = ['rider_' + def.id, 'rider_' + def.id.split('_')[0]].find((n) => BPS[n]);
      if (rn) { const m = comp(rn); if (m) o.rider = m; }
    }
    crewCache.set(def.id, o); return o;
  }
  /** @returns {{model:import('../../voxel/model.js').ModelDef, scale?:number[], glow?:number}} */
  function modelFor(def, unit) {
    const key = unit && unit.custom ? 'c:' + (unit.custom.id || def.id) : def.id;
    let r = cache.get(key); if (r) return r;
    const spec = unit && unit.custom ? { kind: 'humanoid', blueprint: unit.custom.blueprint } : def.model;
    try {
      if (spec && spec.kind === 'humanoid' && compile) { const c = compile(spec.blueprint || spec.bp, { teamTint: true, range: def.melee ? def.melee.range : def.range, radius: def.radius, scale: def.scale }); r = { model: c.model, scale: c.scale }; }
      else if (spec && (spec.kind === 'mounted' || spec.kind === 'beast' || spec.kind === 'bespoke') && BUILDERS[spec.builder || spec.mount || def.id]) { const b = BUILDERS[spec.builder || def.id](Object.assign({}, spec, crewOptions(def)), compile); r = { model: b.model || b, scale: b.scale }; }
      else if (BUILDERS[def.id]) { const b = BUILDERS[def.id](Object.assign({}, spec || {}, crewOptions(def)), compile); r = { model: b.model || b, scale: b.scale }; }
    } catch (e) { console.warn('model build failed for', def.id, e); }
    if (!r) { const isBeast = def.role === 'cavalry' || def.role === 'beast' || def.role === 'siege' || (def.tags && def.tags.indexOf('animal') >= 0); r = { model: isBeast ? fallbackBeast(def) : fallbackHumanoid(def) }; }
    cache.set(key, r); return r;
  }
  // ---- the data the UI screens read (app_contract §2) ----
  const mutators = MUTATORS.map((m) => { const t = MUTATORS_TEXT.find((x) => x.id === m.id) || {}; return { id: m.id, name: t.name || m.name, desc: t.desc || m.desc, blurb: t.desc || m.desc, short: t.short || '', locked: t.locked || '', stars: MUTATOR_STARS[m.id] || 0, mods: m.mods }; });
  const humor = { tips: TIPS.map((t) => t.text), achievements: ACHIEVEMENTS, killVerbs: KILL_VERBS, names: { first: FIRST_NAMES, titles: TITLES, epithets: EPITHETS, random: randomName }, settingsTips: SETTINGS_TIPS, rulesTips: RULES_TIPS, mutatorsHeading: MUTATORS_HEADING, scout: collect(HUMOR_MODULES, 'SCOUT_TEXT') };
  let counters = null;
  const arenaThumb = (id) => null;   // replaced by main.js once the preview service exists
  return {
    defs, units: defs, factions: FACTIONS, modelFor, setCompiler, unitList: () => Object.values(defs), MODELS, BUILDERS,
    arenas: ARENAS, arenaThumb, props: PROP_CATALOG, formations: FORMATIONS, mutators, humor,
    campaign: { missions: [] },                 // filled by the campaign module (content/era_ancient/campaign.js) when it is present
    get counters() { return counters || (counters = counterTable(defs)); },
    glossary: null, parts: PART_MODULES,
  };
}
