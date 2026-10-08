#!/usr/bin/env node
// tools/ms_lint.mjs: the MS lint (spec/MS.md). Owner DESIGN-CAMPAIGN; reviewed by REVIEWER; run by the gate step "ms" (tests/campaign/ms.test.mjs) and by hand.
//
//   node tools/ms_lint.mjs [--era=ancient|medieval|modern|scifi|all] [--file=<missions.json>] [--context=<context.json>] [--json] [--warn-fail]
//   exit 0 = no errors; 1 = errors; 2 = usage/IO. Without --era it lints every era whose docs/eras/design/<era>/missions.json exists.
//
// It validates a missions.json (a) against docs/eras/spec/ms.schema.json with a small JSON Schema 2020-12 subset interpreter (no npm package may be added), and
// (b) against the registry-like context of the era (docs/eras/design/<era>/context.json, built by tools/ms_context.mjs): unit, prop, recipe, faction, mechanic, reward,
// helper, set-piece, module, god-power, boss and weather ids, marker/objective consistency, reference-army legality, the curve rules of plan section 8, copy truth, and
// the script/counter grammar (M14). Every rule has a stable code (RULES below); tests/campaign/ms.test.mjs has a registered negative control for each family.
//
// Library exports (used by the tests and by the future generator tools/ms_gen.mjs): loadSchema, validateSchema, RULES, lintFile, lintAll, HELPERS, compileStar, evaluateStarsJson,
// evaluatePuzzleStarsJson, toLegacyMission, toLegacyPuzzle, legacyPar, msHash, renderText, numbersIn, expandBlock, helperProblems, loadDoc, loadContext, formatReport.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
/** Where docs/ lives: the tree, or VW_MAIN_ROOT inside a negctl copy (which carries src/ tools/ tests/ only). */
export const DOCS = fs.existsSync(path.join(ROOT, 'docs/eras')) ? ROOT : (process.env.VW_MAIN_ROOT || ROOT);
export const SCHEMA_PATH = path.join(DOCS, 'docs/eras/spec/ms.schema.json');
const designDir = (era) => path.join(DOCS, 'docs/eras/design', era);

let SCHEMA_CACHE = null;
export function loadSchema() { return SCHEMA_CACHE || (SCHEMA_CACHE = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))); }
export const vocab = () => loadSchema()['x-vocab'];

// ============================================================================================================================ JSON Schema subset interpreter
const KNOWN_KEYWORDS = new Set(['$schema', '$id', '$ref', '$defs', '$comment', 'title', 'description', 'default', 'examples', 'type', 'enum', 'const', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'minLength', 'maxLength', 'minimum', 'maximum', 'pattern', 'uniqueItems', 'oneOf', 'anyOf', 'allOf', 'if', 'then', 'else']);
export function schemaKeywordProblems(schema) {
  const bad = [];
  const walk = (s, p) => {
    if (Array.isArray(s)) { s.forEach((x, i) => walk(x, p + '/' + i)); return; }
    if (!s || typeof s !== 'object') return;
    for (const k of Object.keys(s)) {
      if (k.startsWith('x-')) continue;
      if (p.endsWith('/properties') || p.endsWith('/$defs')) { walk(s[k], p + '/' + k); continue; }       // property / def names are not keywords
      if (!KNOWN_KEYWORDS.has(k)) bad.push(p + '/' + k);
      else if (['properties', '$defs'].includes(k)) walk(s[k], p + '/' + k);
      else if (['items', 'additionalProperties', 'if', 'then', 'else'].includes(k) && s[k] && typeof s[k] === 'object') walk(s[k], p + '/' + k);
      else if (['oneOf', 'anyOf', 'allOf'].includes(k)) walk(s[k], p + '/' + k);
    }
  };
  walk(schema, '#');
  return bad;
}
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : t === 'array' ? Array.isArray(v) : t === 'null' ? v === null : t === 'object' ? v !== null && typeof v === 'object' && !Array.isArray(v) : typeof v === t);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Returns [{path, msg}] ; path is JSON-pointer-like (e.g. /missions/3/starTests/2/helper). */
export function validateSchema(data, schema = loadSchema(), root = schema) {
  const errs = [];
  const resolve = (s) => { while (s && s.$ref) { const parts = s.$ref.replace(/^#\//, '').split('/'); let t = root; for (const k of parts) t = t[k]; s = t; } return s; };
  const check = (v, sch, p, sink) => {
    sch = resolve(sch);
    if (!sch || typeof sch !== 'object') return;
    const err = (msg) => sink.push({ path: p || '/', msg });
    if (sch.type !== undefined) { const ts = Array.isArray(sch.type) ? sch.type : [sch.type]; if (!ts.some((t) => isType(v, t))) { err('expected ' + ts.join('|') + ', got ' + typeOf(v)); return; } }
    if (sch.const !== undefined && !deepEq(v, sch.const)) err('must equal ' + JSON.stringify(sch.const));
    if (sch.enum && !sch.enum.some((e) => deepEq(e, v))) err('must be one of ' + sch.enum.slice(0, 12).join(', ') + (sch.enum.length > 12 ? ', ...' : '') + ' (got ' + JSON.stringify(v) + ')');
    if (typeof v === 'string') {
      if (sch.minLength !== undefined && v.length < sch.minLength) err('string shorter than ' + sch.minLength);
      if (sch.maxLength !== undefined && v.length > sch.maxLength) err('string longer than ' + sch.maxLength + ' (' + v.length + ')');
      if (sch.pattern && !new RegExp(sch.pattern).test(v)) err('does not match ' + sch.pattern + ' (got ' + JSON.stringify(v.slice(0, 40)) + ')');
    }
    if (typeof v === 'number') {
      if (sch.minimum !== undefined && v < sch.minimum) err('below minimum ' + sch.minimum + ' (got ' + v + ')');
      if (sch.maximum !== undefined && v > sch.maximum) err('above maximum ' + sch.maximum + ' (got ' + v + ')');
    }
    if (Array.isArray(v)) {
      if (sch.minItems !== undefined && v.length < sch.minItems) err('fewer than ' + sch.minItems + ' items (got ' + v.length + ')');
      if (sch.maxItems !== undefined && v.length > sch.maxItems) err('more than ' + sch.maxItems + ' items (got ' + v.length + ')');
      if (sch.uniqueItems) { const seen = new Set(); for (const x of v) { const k = JSON.stringify(x); if (seen.has(k)) { err('duplicate item ' + k.slice(0, 40)); break; } seen.add(k); } }
      if (sch.items) v.forEach((x, i) => check(x, sch.items, p + '/' + i, sink));
    }
    if (isType(v, 'object')) {
      const props = sch.properties || {};
      for (const k of sch.required || []) if (!(k in v)) sink.push({ path: p + '/' + k, msg: 'required property missing' });
      for (const k of Object.keys(v)) {
        if (k in props) check(v[k], props[k], p + '/' + k, sink);
        else if (sch.additionalProperties === false) sink.push({ path: p + '/' + k, msg: 'unknown property' });
        else if (sch.additionalProperties && typeof sch.additionalProperties === 'object') check(v[k], sch.additionalProperties, p + '/' + k, sink);
      }
    }
    for (const a of sch.allOf || []) check(v, a, p, sink);
    if (sch.if) {
      const probe = []; check(v, sch.if, p, probe);
      if (!probe.length) { if (sch.then) check(v, sch.then, p, sink); } else if (sch.else) check(v, sch.else, p, sink);
    }
    if (sch.anyOf) {
      const trials = sch.anyOf.map((a) => { const t = []; check(v, a, p, t); return t; });
      if (!trials.some((t) => !t.length)) { const best = trials.reduce((a, b) => (b.length < a.length ? b : a)); sink.push({ path: p || '/', msg: 'matches none of the alternatives (closest: ' + (best[0] ? best[0].path.slice(p.length) + ' ' + best[0].msg : '?') + ')' }); }
    }
    if (sch.oneOf) {
      const trials = sch.oneOf.map((a) => { const t = []; check(v, a, p, t); return t; });
      const ok = trials.filter((t) => !t.length).length;
      if (ok !== 1) { const best = trials.reduce((a, b) => (b.length < a.length ? b : a)); sink.push({ path: p || '/', msg: (ok === 0 ? 'matches none of the alternatives' : 'matches several alternatives') + (ok === 0 && best[0] ? ' (closest: ' + best[0].path.slice(p.length) + ' ' + best[0].msg + ')' : '') }); }
    }
  };
  check(data, schema, '', errs);
  return errs;
}

// ============================================================================================================================ rule catalogue
// family letter: S schema, F file, I identity, R registry reference, O objective, A arena, B roster/budget/reference, K stars and copy, C curve, E script, P set-piece, W rewards, X bots, G guided first minutes, Y attempts, Z puzzles, V information
export const RULES = {
  'MS-S01': ['E', 'schema violation (ms.schema.json)'],
  'MS-F01': ['E', 'file era / idPrefix does not match the context'],
  'MS-F02': ['E', 'acts: ids 1,2,3 in order and nine missions as 3 + 3 + 3 with act non-decreasing'],
  'MS-F03': ['E', '`legacy` block: required in Ancient, forbidden in a new era'],
  'MS-F04': ['E', 'rewardParts catalogue: a part key used by a reward is missing, or an entry is unused'],
  'MS-I01': ['E', 'id prefix: new eras use <med_|mod_|sf_>, Ancient ids carry none'],
  'MS-I02': ['E', 'duplicate id among missions and puzzles (they share the flat progress.stars map)'],
  'MS-I03': ['E', 'id collides with another era'],
  'MS-I04': ['E', 'mission ladder (design/<era>/arenas.md section 3): id, order, objective type or arena differ'],
  'MS-I05': ['E', 'puzzle set (design/<era>/puzzles.md): ids, arena, roster or budget differ'],
  'MS-I06': ['E', 'a number of the binding outline (design/<era>/missions_outline.md) differs: budget, par, timeLimit, attempts, hard/soft modules or the star-3 helper (W when designAmendment is set)'],
  'MS-R01': ['E', 'unknown unit id'],
  'MS-R02': ['E', 'unknown prop id'],
  'MS-R03': ['E', 'unknown arena recipe or size'],
  'MS-R04': ['E', 'unknown marker id'],
  'MS-R05': ['E', 'unknown faction id'],
  'MS-R06': ['E', 'unknown mechanic id'],
  'MS-R07': ['E', 'unknown mutator, part or unlock key'],
  'MS-R08': ['E', 'unknown module name (not in spec/M.md modules block)'],
  'MS-R09': ['E', 'unknown god power id or override field'],
  'MS-R10': ['E', 'set-piece / stinger / sfx id malformed or duplicated'],
  'MS-R11': ['E', 'unknown, rejected or ill-typed star helper'],
  'MS-R12': ['E', 'unknown ability id'],
  'MS-R13': ['E', 'unknown boss id'],
  'MS-R14': ['W', 'weather kind is a pending name (spec/M WEATHER_KINDS lacks it): fallback mapping applies'],
  'MS-R15': ['E', 'unknown formation, weather, counter or event name'],
  'MS-O01': ['E', 'objective type not legal for this era (protect_vip is Ancient only; capture, defend_core, escort are new-era only)'],
  'MS-O02': ['E', 'objective marker ids must exist and have the type the objective needs'],
  'MS-O03': ['E', 'objective needs a marker of its own type (hill, exit+vip_start, general_spawn, capture, core)'],
  'MS-O04': ['E', 'kill_general needs enemy.generals present in the enemy army'],
  'MS-O05': ['E', 'objective parameters inconsistent with the script (waves, time, points, need)'],
  'MS-O06': ['E', 'escort / protect_vip needs a free VIP in fixed[] and the vip/exit params to match it'],
  'MS-O07': ['E', 'timeLimit must be at least the objective time'],
  'MS-O08': ['E', 'destroy targets must exist (prop type, enemy def or tag)'],
  'MS-A01': ['E', 'markers: <= 8, unique ids, inside |x|,|z| <= size/4, radius 1..30'],
  'MS-A02': ['E', 'arena.env value out of range or unknown theme/weather'],
  'MS-A03': ['E', 'arena.props placement unknown or outside the arena'],
  'MS-B03': ['E', 'core units must be in the roster and fielded by the reference'],
  'MS-B04': ['E', 'reference army illegal (units, roster, order, <= 16 types, spend 85..100 percent of budget)'],
  'MS-B05': ['E', 'more than 16 enemy unit types'],
  'MS-B06': ['E', 'fixed unit invalid (marker, unit, free VIP rules)'],
  'MS-B07': ['E', 'caps keys must be roster units and fewer than the budget allows'],
  'MS-B08': ['E', 'new-era mission: reference army is required (the assist ladder offers it)'],
  'MS-B09': ['E', 'new-era mission: blind variant required; swap keys must be reference units, values roster units; none on Ancient'],
  'MS-B10': ['E', 'timeLimit outside 120..600 seconds'],
  'MS-B11': ['W', 'blind swap changes the unit cost by more than 35 percent (the blind army should cost about the same)'],
  'MS-K01': ['E', 'starTests shape: [win][aliveCostFrac 0.5][own helper], ids unique and equal to text.stars ids'],
  'MS-K02': ['E', 'star 3 helper cannot be win, aliveCostFrac or a rejected alias'],
  'MS-K03': ['E', 'thrift arg must equal par.value (cost) and is forbidden with fixed[]'],
  'MS-K04': ['E', 'tests[] must list the mechanic(s) the star-3 helper tests'],
  'MS-K05': ['E', 'copy truth: a number in the star-3 text or in the "Star 3" rule line does not equal the helper args / budget / par'],
  'MS-K06': ['E', 'par: type none needs value 0; cost needs a spend below the budget'],
  'MS-C01': ['E', 'fewer than 5 distinct objective types in the era'],
  'MS-C02': ['E', 'a mechanic is taught twice, or an era mechanic is neither taught nor firstSightOnly'],
  'MS-C03': ['E', 'star 3 (tests[]) uses a mechanic not taught in an EARLIER mission'],
  'MS-C04': ['E', 'act finale (missions 3, 6, 9) must combine >= 2 earlier mechanics'],
  'MS-C05': ['E', 'headline mechanic not taught, or taught without a beat of its own'],
  'MS-C06': ['E', 'requiresModules (closed over the DAG deps of spec/M) misses a module of the taught mechanic or of the star-3 counters, or a module is both hard and soft'],
  'MS-C07': ['E', 'headline mechanic mission has no margin before E-FREEZE and no marginWaiver'],
  'MS-C08': ['E', 'untaught mechanic: a unit carrying a later mechanic appears early without teaching.exceptions'],
  'MS-C09': ['E', 'teaching beats: the five basics beats exactly in mission 1; beat ids unique and prefixed; beat mechanic known'],
  'MS-E01': ['E', 'script group references: ids unique, order/kill/hp_frac targets exist'],
  'MS-E02': ['E', 'script events: <= 64, ids unique, <= 8 ops, times within timeLimit'],
  'MS-E03': ['E', 'script events without module M14 in requiresModules may only be timed setpiece, beat or order ops (MissionRuntime lite events)'],
  'MS-E04': ['E', 'spawn op: units exist, player-side spawns are free reinforcements'],
  'MS-E05': ['E', 'weather / sky op value unknown or out of range'],
  'MS-E06': ['E', 'setpiece op names a set-piece this mission does not define'],
  'MS-E07': ['E', 'counter reference or local counter rule invalid'],
  'MS-E08': ['E', 'vipMarch / waves / zeus block inconsistent'],
  'MS-E09': ['E', 'powers.disable / override invalid'],
  'MS-E10': ['E', 'trigger target (prop type, def, group, marker) unknown'],
  'MS-P01': ['E', 'set-piece required in a new-era mission; exactly one primary'],
  'MS-P02': ['E', 'set-piece shot anchors must resolve (named anchor, marker of this mission, unit:<def present>)'],
  'MS-P03': ['E', 'set-piece announcer: category, sub, three lines (brutus, plato, cassandra once each)'],
  'MS-P04': ['E', 'set-piece must fire: a trigger XOR a script setpiece op'],
  'MS-W01': ['E', 'rewardId malformed, not unique or not <prefix>r<mission number>_<slug>'],
  'MS-W02': ['E', 'rewards.primary must be one of the granted lists; substitution required unless the primary is a mutator or a codex write'],
  'MS-W03': ['E', 'reward grant invalid (quick unlock arena unknown, codex entry unknown)'],
  'MS-X01': ['E', 'bots bands invalid, or a band wider than the default without botsWhy'],
  'MS-G01': ['E', 'firstThreeMinutes: exactly on mission 1 of a new era, none elsewhere'],
  'MS-G02': ['E', 'firstThreeMinutes ids differ from design/<era>/first_three_minutes.md'],
  'MS-Y01': ['E', 'attempts.design out of the curve'],
  'MS-Y02': ['E', 'attempts.computed inconsistent (1/p, interval, hash)'],
  'MS-Y03': ['W', 'attempts.computed is stale (missionHash differs) or far from the design number'],
  'MS-Z01': ['E', 'puzzle shape: par below budget, roster, godPowers false, goal legal'],
  'MS-Z02': ['E', 'puzzle placements: units exist, inside the arena'],
  'MS-Z03': ['E', 'puzzle bonus helper invalid'],
  'MS-Z04': ['E', 'new-era puzzle: teaches a known mechanic, requiresModules complete, mechanicFired and firstSightBeat present'],
  'MS-V01': ['I', 'information: a rule was skipped because the context lacks its input'],
};

// ============================================================================================================================ star helpers (reference implementations)
const sumOf = (o, keys) => keys.reduce((a, k) => a + ((o && o[k]) | 0), 0);
const cost = (env, id) => (env.units[id] && env.units[id].cost) || 0;
const costOf = (env, counts) => Object.keys(counts || {}).reduce((s, k) => s + (counts[k] | 0) * cost(env, k), 0);
const cnt = (s, id) => (s.counters && s.counters[id]) || 0;
const mechCounter = (env, id) => { const m = env.mechanics && env.mechanics[id]; return m ? m.counter : null; };
/** helper name -> eval(summary, args, env, mission) : boolean.  env = {units, mechanics, heroes}. These are the ORACLES of the shipped src/content/shared/ms_helpers.js (dual-implementation test). */
export const HELPERS = {
  aliveCostFrac: (s, [f], env) => { const start = s.playerCostStart > 0 ? s.playerCostStart : 1; return costOf(env, s.aliveRoster || s.aliveDefs) / start >= f; },
  thrift: (s, [par]) => s.playerCostStart <= par,
  spentAtMost: (s, [par]) => (s.spent !== undefined ? s.spent : s.playerCostStart) <= par,
  noLoss: (s, [defs, min = 1]) => sumOf(s.startDefs, defs) >= min && sumOf(s.lostDefs, defs) === 0,
  underTime: (s, [secs]) => s.t <= secs,
  vipUntouched: (s, [def]) => s.vipDef === def && s.vipDamage === 0,
  keptAlive: (s, [def, n]) => (((s.aliveRoster || s.aliveDefs) || {})[def] | 0) >= n,
  propDownBy: (s, [type, secs]) => { const g = s.propDownT && s.propDownT[type]; return !!g && g.length > 0 && Math.min.apply(null, g) <= secs; },
  noFriendlyFire: (s) => (s.friendlyKills | 0) === 0 && (s.friendlyHits | 0) === 0,
  heroesAlive: (s, a, env) => { let fielded = 0; for (const k of Object.keys(s.startDefs || {})) if (env.heroes.includes(k)) fielded += s.startDefs[k]; return fielded >= 1 && (s.heroesLost | 0) === 0; },
  usedMechanic: (s, [id, n], env) => { const c = mechCounter(env, id); return c !== null && cnt(s, c) >= n; },
  usedAll: (s, [ids, n], env) => ids.every((id) => { const c = mechCounter(env, id); return c !== null && cnt(s, c) >= n; }),
  propStanding: (s, [type]) => ((s.propsAlive && s.propsAlive[type]) | 0) >= 1,
  burnKills: (s, [tag, n]) => (((s.countersBy && s.countersBy.fire_kill) || {})[tag] | 0) >= n,
  shellsOnTarget: (s, [def, n]) => (((s.countersBy && s.countersBy.shell_hit) || {})[def] | 0) >= n,
  hitsDuringReload: (s, [n]) => cnt(s, 'reload_hit') >= n,
  bannerDownBy: (s, [def, secs]) => { const t = s.firstT && s.firstT['banner_fall:' + def]; return t !== undefined && t <= secs; },
  coverFracAtLeast: (s, [f]) => cnt(s, 'unit_ticks') > 0 && cnt(s, 'cover_unit_ticks') / cnt(s, 'unit_ticks') >= f,
  hitsWhileReloadingAtMost: (s, [n]) => cnt(s, 'reload_hit_taken') <= n,
  ownBreaksAtMost: (s, [n]) => cnt(s, 'own_shield_break') <= n,
  vipShieldNeverBroken: (s) => !!s.vipDef && cnt(s, 'vip_shield_break') === 0,
  coreHpAtLeast: (s, [f]) => s.coreHpFrac !== null && s.coreHpFrac !== undefined && s.coreHpFrac >= f,
  lossesAtMost: (s, [n]) => (s.unitsLost | 0) <= n,
  enemyDownBy: (s, [def, secs]) => { const e = s.enemyDownT && s.enemyDownT[def]; return !!e && e.length > 0 && e[0] <= secs; },
  summaryAtMost: (s, [field, n]) => (s[field] | 0) <= n,
};

/** Problems with the name/arity/types of one helper call against the context. Returns [string]. */
export function helperProblems(name, args, ctx, mission) {
  const V = vocab(), out = [];
  if (V.rejectedHelpers[name]) return ['helper ' + name + ' is not in the vocabulary (' + V.rejectedHelpers[name] + ')'];
  const h = V.helpers[name]; if (!h) return ['unknown helper ' + name];
  if (!Array.isArray(args)) return ['args must be an array'];
  const max = h.args.length, min = max - (h.optional || 0);
  if (args.length < min || args.length > max) return ['helper ' + name + ' takes ' + (min === max ? max : min + '..' + max) + ' args, got ' + args.length];
  const units = ctx.units || {}, props = ctx.props || {}, mech = (V.mechanics[ctx.era] || {});
  if (h.mechanic && typeof h.mechanic === 'object' && ctx.era !== 'ancient' && !h.mechanic[ctx.era]) out.push('helper ' + name + ' tests a mechanic that era ' + ctx.era + ' does not have (eras: ' + Object.keys(h.mechanic).join(', ') + ')');
  else if (h.mechanic && typeof h.mechanic === 'object' && ctx.era === 'ancient') out.push('helper ' + name + ' needs an era mechanic; Ancient has none');
  h.args.forEach((a, i) => {
    if (i >= args.length) return;
    const v = args[i], w = name + ' arg ' + a.name;
    const num = (x) => typeof x === 'number' && Number.isFinite(x);
    switch (a.type) {
      case 'unit': if (typeof v !== 'string' || !units[v]) out.push(w + ': unknown unit ' + JSON.stringify(v)); break;
      case 'units': if (!Array.isArray(v) || !v.length || v.some((x) => !units[x])) out.push(w + ': must be a non-empty list of units of this era'); break;
      case 'prop': if (typeof v !== 'string' || !props[v]) out.push(w + ': unknown prop ' + JSON.stringify(v)); break;
      case 'tag': if (typeof v !== 'string' || !/^[a-z][a-z0-9_]*$/.test(v)) out.push(w + ': tag must be snake_case'); break;
      case 'int': if (!Number.isInteger(v) || v < 0) out.push(w + ': must be an integer >= 0'); break;
      case 'num': if (!num(v) || v <= 0) out.push(w + ': must be a number > 0'); break;
      case 'secs': if (!num(v) || v <= 0 || (mission && v > mission.timeLimit)) out.push(w + ': seconds in (0, timeLimit]'); break;
      case 'frac': if (!num(v) || v < 0 || v > 1) out.push(w + ': must be in [0, 1]'); break;
      case 'cost': if (!num(v) || v <= 0) out.push(w + ': must be a number > 0'); break;
      case 'mechanic': if (!mech[v]) out.push(w + ': unknown mechanic ' + JSON.stringify(v) + ' for era ' + ctx.era); break;
      case 'mechanics': if (!Array.isArray(v) || !v.length || v.some((x) => !mech[x])) out.push(w + ': must be a non-empty list of mechanics of this era'); break;
      case 'field': if (!V.summaryFields.includes(v)) out.push(w + ': ' + JSON.stringify(v) + ' is not in x-vocab.summaryFields'); break;
      default: out.push(w + ': unhandled arg type ' + a.type);
    }
  });
  return out;
}
/** The mechanic ids a star-3 helper call tests ([] when it tests none). */
export function helperMechanics(name, args, era) {
  const h = vocab().helpers[name]; if (!h || !h.mechanic) return [];
  if (h.mechanic === 'arg0') return [args[0]];
  if (h.mechanic === 'arg0*') return args[0] || [];
  if (typeof h.mechanic === 'string') return [h.mechanic];
  return h.mechanic[era] ? [h.mechanic[era]] : [];                // a per-era map: the mechanic this helper tests in each era
}
/** The modules a star-3 helper call needs: the module of every counter it reads (usedMechanic / usedAll read the mechanic counters). */
export function helperModules(name, args, era) {
  const V = vocab(), h = V.helpers[name]; if (!h) return [];
  const cs = new Set(h.counters);
  if (name === 'usedMechanic') { const m = (V.mechanics[era] || {})[args[0]]; if (m) cs.add(m.counter); }
  if (name === 'usedAll') for (const id of args[0] || []) { const m = (V.mechanics[era] || {})[id]; if (m) cs.add(m.counter); }
  return uniq(Array.from(cs).map((c) => V.counters[c] && V.counters[c].module).filter(Boolean));
}
/** Transitive closure of a module list over the DAG deps of spec/M (a mission that needs M12 needs its dependencies M7 and M10 too). */
export function moduleClosure(list, modules) {
  const by = Object.fromEntries((modules || []).map((m) => [m.id, m])); const out = new Set();
  const visit = (id) => { if (out.has(id) || !by[id]) return; out.add(id); for (const d of by[id].deps) visit(d); };
  list.forEach(visit); return out;
}
export function compileStar(spec, env) {
  if (!spec || !spec.helper) return null;
  const f = HELPERS[spec.helper]; if (!f) throw new Error('unknown helper ' + spec.helper);
  return (s, m) => !!f(s, spec.args || [], env, m);
}
export function makeEnv(ctx) { return { units: ctx.units, mechanics: vocab().mechanics[ctx.era] || {}, heroes: ctx.heroes || [] }; }

/** evaluateStars over the JSON mission (the generic shape of campaign.js evaluateStars). */
export function evaluateStarsJson(j, summary, env) {
  const none = { stars: 0, earned: [false, false, false], aliveCostFrac: 0, win: false };
  if (!j || !summary || summary.kind !== 'battle_end') return none;
  if (summary.mission && summary.mission !== j.id) return none;
  if (summary.win !== true || summary.draw === true) return none;
  const start = summary.playerCostStart > 0 ? summary.playerCostStart : 1;
  const frac = costOf(env, summary.aliveRoster || summary.aliveDefs) / start;
  const t3 = compileStar(j.starTests[2], env);
  const earned = [true, !!HELPERS.aliveCostFrac(summary, j.starTests[1].args, env), !t3 || !!t3(summary, j)];
  return { stars: earned.filter(Boolean).length, earned, aliveCostFrac: frac, win: true };
}
export function evaluatePuzzleStarsJson(p, summary, env, currencyUnused) {
  const none = { stars: 0, earned: [false, false, false] };
  if (!p || !summary || summary.kind !== 'battle_end') return none;
  if (summary.mission && summary.mission !== p.id) return none;
  if (summary.win !== true || summary.draw === true) return none;
  const bonus = compileStar(p.bonus, env);
  const earned = [true, !!HELPERS.spentAtMost(summary, [p.par.value]), !!bonus(summary, p)];
  return { stars: earned.filter(Boolean).length, earned };
}

// ============================================================================================================================ legacy mapping (Ancient campaign.js build() and puzzles.js build())
export const legacyPar = (par) => (par && par.type === 'cost' ? par.value : 0);
const sumN = (gs) => (gs || []).reduce((s, g) => s + g.n, 0);
const scriptGroups = (j) => (j.script && j.script.waves ? j.script.waves.list.reduce((a, w) => a.concat(w.groups), []) : []);
export function toLegacyMission(j, index, ctx, file) {
  const env = makeEnv(ctx);
  const rp = (file && file.rewardParts) || {};
  const stars = j.starTests.map((st, k) => ({ id: j.text.stars[k].id, text: j.text.stars[k].text, test: k === 2 ? compileStar(st, env) : null }));
  const enemyGroups = j.enemy.groups || [];
  const m = {
    id: j.id, index, act: j.act, title: j.text.title, blurb: j.text.blurb, briefing: j.text.briefing, victory: j.text.victory, defeat: j.text.defeat, mood: j.mood,
    arena: j.arena, playerFaction: j.playerFaction, roster: j.roster, budget: j.budget, par: legacyPar(j.par), core: j.core, fixed: j.fixed.map(legacyFixed),
    enemy: j.enemy, objective: j.objective, timeLimit: j.timeLimit, friendlyFire: !!j.friendlyFire, godPowers: j.godPowers !== false,
    script: j.script || null, teaching: !!j.teaching, rules: j.rules, stars, reference: j.reference || null,
    rewards: { title: j.text.reward.title, blurb: j.text.reward.blurb, unlockParts: j.rewards.unlockParts, partNames: j.rewards.unlockParts.map((k) => (rp[k] ? rp[k].name : k)), unlockMutators: j.rewards.unlockMutators, codex: j.rewards.codex },
    bots: j.bots, botsWhy: j.botsWhy || '',
    units: { A: j.unitsA !== undefined ? j.unitsA : sumN(j.reference || []), B: sumN(enemyGroups) + sumN(scriptGroups(j)) },
    enemyCost: enemyGroups.reduce((a, g) => a + g.n * cost(env, g.defId), 0) + scriptGroups(j).reduce((a, g) => a + g.n * cost(env, g.defId), 0), textId: j.id,
  };
  if (ctx.era !== 'ancient') {
    // the new-era runtime reads these too (createCampaign cfg.raw); the Ancient shape stays exactly the shipped one
    Object.assign(m, { parSpec: j.par, caps: j.caps, powers: j.powers, inputs: j.inputs, blind: j.blind, teaches: j.teaches, tests: j.tests, combines: j.combines, requiresModules: j.requiresModules, softModules: j.softModules, setpiece: j.setpiece, extraSetpieces: j.extraSetpieces, rewardId: j.rewardId, rewardsPrimary: j.rewards.primary, quickUnlocks: j.rewards.quickUnlocks, substitution: j.rewards.substitution, attempts: j.attempts, firstThreeMinutes: j.firstThreeMinutes, teachingSpec: j.teaching, starTests: j.starTests });
  }
  return m;
}
function legacyFixed(f) { const o = Object.assign({}, f); delete o.free; delete o.selectable; delete o.override; return o; }
export function toLegacyPuzzle(j, index, ctx) {
  const env = makeEnv(ctx), cur = (ctx.currency && ctx.currency.name) || 'drachmae';
  const p = {
    id: j.id, kind: 'puzzle', index, title: j.title, blurb: j.blurb, hint: j.hint, goalText: j.goalText, arena: j.arena, player: j.player, par: legacyPar(j.par),
    enemy: j.enemy, goal: j.goal, timeLimit: j.timeLimit, godPowers: j.godPowers, fixed: j.fixed, script: j.script || null,
    stars: [{ id: 'win', text: 'Win' }, { id: 'par', text: 'Spend ' + legacyPar(j.par).toLocaleString('en-US') + ' ' + cur + ' or less', test: (s, pz) => HELPERS.spentAtMost(s, [pz.par]) }, { id: j.bonus.id, text: j.bonus.text, test: compileStar(j.bonus, env) }],
    budget: j.player.budget,
  };
  return p;
}
/** puzzles.js block(): a squad of n identical placements on a grid (authoring helper for new-era puzzles; the JSON stores the expanded placements). */
export function expandBlock(defId, n, cx, cz, o = {}) {
  const cols = o.cols || Math.ceil(Math.sqrt(n)), sp = o.spacing || 1.5, out = [];
  for (let i = 0; i < n; i++) out.push({ defId, x: cx + Math.floor(i / cols) * sp * (o.dirx || 1), z: cz + ((i % cols) - (cols - 1) / 2) * sp, heading: o.heading !== undefined ? o.heading : -Math.PI / 2, order: o.order || 'advance', squadId: o.squad || 1, formation: 'block' });
  return out;
}
/** FNV-1a of the gameplay-relevant subset of a JSON mission (stable: sorted keys); the "computed.missionHash" and the generated-file header carry it. */
export function msHash(j) {
  const keep = ['arena', 'playerFaction', 'roster', 'caps', 'budget', 'par', 'core', 'fixed', 'reference', 'enemy', 'objective', 'timeLimit', 'friendlyFire', 'godPowers', 'powers', 'script', 'starTests', 'requiresModules'];
  const norm = (x) => (Array.isArray(x) ? x.map(norm) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, norm(x[k])])) : x);
  const js = JSON.stringify(norm(Object.fromEntries(keep.map((k) => [k, j[k]]))));
  let h = 2166136261 >>> 0; for (let i = 0; i < js.length; i++) { h ^= js.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// ============================================================================================================================ copy truth
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50, hundred: 100 };
/** Numbers in a string: digits (thousands commas allowed) and number words. */
export function numbersIn(s) {
  const out = [];
  // the label "Star 3" is not a datum; the word "one" is a quantity of prose ("at least one hero"), never a threshold
  for (const m of String(s).replace(/\bStar 3\b/gi, 'Star').matchAll(/\d[\d,]*(?:\.\d+)?|\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|fifty|hundred)\b/gi)) {
    const t = m[0].toLowerCase(); out.push(WORDS[t] !== undefined ? WORDS[t] : Number(t.replace(/,/g, '')));
  }
  return out;
}
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
/** Replaces {par} {budget} {timeLimit} {arg0} {arg1} in a copy string (new eras may use placeholders; Ancient keeps literals). */
export function renderText(text, j) {
  const a = (j.starTests && j.starTests[2] && j.starTests[2].args) || [];
  const map = { par: fmtInt(j.par ? j.par.value : 0), budget: fmtInt(j.budget), timeLimit: String(j.timeLimit), arg0: a[0] !== undefined ? (typeof a[0] === 'number' ? fmtInt(a[0]) : String(a[0])) : '', arg1: a[1] !== undefined ? (typeof a[1] === 'number' ? fmtInt(a[1]) : String(a[1])) : '' };
  return String(text).replace(/\{(par|budget|timeLimit|arg0|arg1)\}/g, (m, k) => map[k]);
}
function allowedNumbers(j) {
  const out = new Set([j.budget, j.timeLimit]);
  if (j.par && j.par.value) out.add(j.par.value);
  const st = j.starTests && j.starTests[2];
  const walk = (a) => { if (typeof a === 'number') out.add(a); else if (Array.isArray(a)) a.forEach(walk); };
  if (st) walk(st.args);
  if (st && st.args && typeof st.args[0] === 'number' && st.helper && /Frac|AtLeast/.test(st.helper) && st.args[0] <= 1) { out.add(Math.round(st.args[0] * 100)); }
  return out;
}

// ============================================================================================================================ the lint
const SNAKE = /^[a-z][a-z0-9_]*$/;
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const uniq = (a) => Array.from(new Set(a));
const BASICS = ['b_place_line', 'b_fight', 'b_speed', 'b_powers', 'b_done'];

/** Lint one parsed missions.json against its context. Returns {errors:[], warnings:[], infos:[]} of {code, path, msg}. opts: {otherIds:{era:[ids]}, mdFirstThree, attemptsStaleIsError}. */
export function lintFile(doc, ctx, opts = {}) {
  const V = vocab(), schema = loadSchema(), res = { errors: [], warnings: [], infos: [] };
  const add = (code, p, msg) => { const sev = RULES[code] ? RULES[code][0] : 'E'; (sev === 'W' ? res.warnings : sev === 'I' ? res.infos : res.errors).push({ code, path: p, msg }); };
  if (!RULES['MS-S01']) throw new Error('rules missing');
  for (const e of validateSchema(doc, schema)) add('MS-S01', e.path, e.msg);
  if (res.errors.length) return res;                              // semantic rules assume a well-formed document
  const era = doc.era, ancient = era === 'ancient', pfx = V.eraPrefix[era];
  const units = ctx.units || {}, props = ctx.props || {}, recipes = ctx.recipes || {}, factions = new Set(ctx.factions || []);
  const mech = V.mechanics[era] || {}, mechIds = Object.keys(mech);
  const modules = Object.fromEntries((ctx.modules || []).map((m) => [m.id, m]));
  const freeze = (ctx.eFreeze && ctx.eFreeze[era]) || 0;
  const missions = doc.missions;
  const env = makeEnv(ctx);
  if (ctx.era !== era) add('MS-F01', '/era', 'file era ' + era + ' but context era ' + ctx.era);
  if (doc.idPrefix !== pfx) add('MS-F01', '/idPrefix', 'idPrefix must be ' + JSON.stringify(pfx) + ' for era ' + era);
  // ---------------------------------------------------------------- file level
  doc.acts.forEach((a, i) => { if (a.id !== i + 1) add('MS-F02', '/acts/' + i, 'acts must be ids 1,2,3 in order'); });
  missions.forEach((m, i) => { const want = 1 + Math.floor(i / 3); if (m.act !== want) add('MS-F02', '/missions/' + i + '/act', 'mission ' + (i + 1) + ' must be in act ' + want + ' (3 + 3 + 3)'); });
  if (ancient && !doc.legacy) add('MS-F03', '/legacy', 'Ancient needs the legacy block (MUTATOR_STARS, TEACHING_SKIP, TEACHING_BEATS)');
  if (!ancient && doc.legacy) add('MS-F03', '/legacy', 'legacy is Ancient only');
  // ---------------------------------------------------------------- identity
  const allIds = []; const seen = new Set();
  const idCheck = (id, p) => {
    if (ancient ? /^(med|mod|sf)_/.test(id) : !id.startsWith(pfx)) add('MS-I01', p, 'id ' + id + (ancient ? ' must not carry a new-era prefix' : ' must start with ' + pfx));
    if (seen.has(id)) add('MS-I02', p, 'duplicate id ' + id); seen.add(id); allIds.push(id);
    for (const [e, ids] of Object.entries(opts.otherIds || {})) if (e !== era && ids.includes(id)) add('MS-I03', p, 'id ' + id + ' also exists in era ' + e);
  };
  missions.forEach((m, i) => idCheck(m.id, '/missions/' + i + '/id'));
  doc.puzzles.forEach((p, i) => idCheck(p.id, '/puzzles/' + i + '/id'));
  if (ctx.ladder && ctx.ladder.length) {
    const alias = (t) => (t === 'protect_vip' ? 'escort' : t);
    ctx.ladder.forEach((r, i) => {
      const m = missions[i]; if (!m) return;
      if (m.id !== r.id) add('MS-I04', '/missions/' + i + '/id', 'ladder row ' + r.n + ' is ' + r.id + ', file has ' + m.id);
      else {
        if (alias(m.objective.type) !== alias(r.objective)) add('MS-I04', '/missions/' + i + '/objective/type', 'ladder objective ' + r.objective + ', file has ' + m.objective.type);
        if (r.arena && m.arena.recipe !== r.arena) add('MS-I04', '/missions/' + i + '/arena/recipe', 'ladder arena ' + r.arena + ', file has ' + m.arena.recipe);
      }
    });
    if (ctx.ladder.length !== missions.length) add('MS-I04', '/missions', 'ladder has ' + ctx.ladder.length + ' rows, file has ' + missions.length + ' missions');
  }
  if (ctx.puzzles && ctx.puzzles.length) {
    const byId = Object.fromEntries(ctx.puzzles.map((p) => [p.id, p]));
    for (const c of ctx.puzzles) if (!doc.puzzles.some((p) => p.id === c.id)) add('MS-I05', '/puzzles', 'puzzle ' + c.id + ' of the design table is missing');
    doc.puzzles.forEach((p, i) => {
      const c = byId[p.id]; if (!c) { add('MS-I05', '/puzzles/' + i + '/id', 'puzzle ' + p.id + ' is not in the design table'); return; }
      if (c.arena && p.arena.recipe !== c.arena) add('MS-I05', '/puzzles/' + i + '/arena', 'arena ' + c.arena + ' expected');
      if (c.seed != null && p.arena.seed !== c.seed) add('MS-I05', '/puzzles/' + i + '/arena/seed', 'seed ' + c.seed + ' expected');
      if (c.size && p.arena.size !== c.size) add('MS-I05', '/puzzles/' + i + '/arena/size', 'size ' + c.size + ' expected');
      if (c.budget != null && p.player.budget !== c.budget) add('MS-I05', '/puzzles/' + i + '/player/budget', 'budget ' + c.budget + ' expected');
      if (c.par != null && p.par.value !== c.par) add('MS-I05', '/puzzles/' + i + '/par', 'par ' + c.par + ' expected');
      const a = [...c.roster].sort().join(','), b = [...p.player.roster].sort().join(',');
      if (c.roster.length && a !== b) add('MS-I05', '/puzzles/' + i + '/player/roster', 'roster ' + a + ' expected');
    });
  }
  // ---------------------------------------------------------------- reference helpers
  const needUnit = (id, p) => { if (!units[id]) add('MS-R01', p, 'unknown unit ' + JSON.stringify(id) + ' (era ' + era + ')'); };
  const needProp = (id, p) => { if (!props[id]) add('MS-R02', p, 'unknown prop ' + JSON.stringify(id)); };
  const needFaction = (id, p) => { if (!factions.has(id)) add('MS-R05', p, 'unknown faction ' + JSON.stringify(id)); };
  const knownEvents = new Set([].concat((ctx.events && ctx.events.existing) || [], (ctx.events && ctx.events.m) || [])), requestedEvents = new Set();
  for (const c of Object.values(V.counters)) if (c.event && !knownEvents.has(c.event)) requestedEvents.add(c.event);
  const eventOk = (e) => knownEvents.has(e) || requestedEvents.has(e) || !knownEvents.size;
  const counterIds = new Set(Object.keys(V.counters));
  const enemyLike = (m) => { const out = [...m.enemy.groups]; for (const g of scriptGroups(m)) out.push(g); for (const e of (m.script && m.script.events) || []) for (const o of e.do) if (o.op === 'spawn') out.push(...o.groups); return out; };
  const markerIdsOf = (m) => new Set(m.arena.markers.map((k) => k.id));
  const markerById = (m) => Object.fromEntries(m.arena.markers.map((k) => [k.id, k]));

  const taughtAt = {}; missions.forEach((m, i) => { for (const t of m.teaches) { if (taughtAt[t] !== undefined) add('MS-C02', '/missions/' + i + '/teaches', 'mechanic ' + t + ' is already taught in mission ' + (taughtAt[t] + 1)); else taughtAt[t] = i; } });

  missions.forEach((m, i) => {
    const P = '/missions/' + i, mk = markerById(m), mkIds = markerIdsOf(m), size = ctx.sizes ? ctx.sizes[m.arena.size] : null;
    // ------------------------------------------------ arena
    if (!recipes[m.arena.recipe]) add('MS-R03', P + '/arena/recipe', 'unknown arena recipe ' + m.arena.recipe);
    if (ctx.sizes && !ctx.sizes[m.arena.size]) add('MS-R03', P + '/arena/size', 'unknown size ' + m.arena.size);
    if (!ancient && recipes[m.arena.recipe] && recipes[m.arena.recipe].size && recipes[m.arena.recipe].size !== m.arena.size) add('MS-R03', P + '/arena/size', 'recipe ' + m.arena.recipe + ' is ' + recipes[m.arena.recipe].size + ' in the arena table');
    if (!ancient && recipes[m.arena.recipe] && recipes[m.arena.recipe].seed != null && recipes[m.arena.recipe].seed !== m.arena.seed) add('MS-R03', P + '/arena/seed', 'recipe seed ' + recipes[m.arena.recipe].seed + ' expected');
    const half = (size || 192) * 0.25, ids = new Set();
    m.arena.markers.forEach((k, ki) => {
      if (ids.has(k.id)) add('MS-A01', P + '/arena/markers/' + ki, 'duplicate marker id ' + k.id); ids.add(k.id);
      if (Math.abs(k.x) > half || Math.abs(k.z) > half) add('MS-A01', P + '/arena/markers/' + ki, 'marker ' + k.id + ' lies outside the arena (|x|,|z| <= ' + half + ')');
    });
    const envv = m.arena.env || {};
    if (envv.weather !== undefined) {
      if (V.weather.pending[envv.weather] !== undefined) add('MS-R14', P + '/arena/env/weather', envv.weather + ' is not in WEATHER_KINDS yet; fallback ' + V.weather.pending[envv.weather]);
      else if (!V.weather.kinds.includes(envv.weather)) add('MS-R15', P + '/arena/env/weather', 'unknown weather ' + JSON.stringify(envv.weather));
    }
    for (const [k, lo, hi] of [['time', 0, 24], ['fog', 0, 1], ['wind', 0, 1], ['gravity', 0.2, 2]]) if (envv[k] !== undefined && (!isNum(envv[k]) || envv[k] < lo || envv[k] > hi)) add('MS-A02', P + '/arena/env/' + k, k + ' must be a number in [' + lo + ', ' + hi + ']');
    for (const [pi, pr] of (m.arena.props || []).entries()) { needProp(pr.t, P + '/arena/props/' + pi + '/t'); if (size && (Math.abs(pr.x) > size / 2 || Math.abs(pr.z) > size / 2)) add('MS-A03', P + '/arena/props/' + pi, 'prop outside the arena'); }
    // ------------------------------------------------ roster / budget / reference
    needFaction(m.playerFaction, P + '/playerFaction'); needFaction(m.enemy.faction, P + '/enemy/faction');
    for (const h of m.enemy.hired || []) needFaction(h, P + '/enemy/hired');
    if (m.roster) m.roster.forEach((u, ri) => needUnit(u, P + '/roster/' + ri));
    for (const c of m.core) { needUnit(c.defId, P + '/core'); if (m.roster && !m.roster.includes(c.defId)) add('MS-B03', P + '/core', 'core unit ' + c.defId + ' is not in the roster'); }
    for (const k of Object.keys(m.caps)) { needUnit(k, P + '/caps/' + k); if (m.roster && !m.roster.includes(k)) add('MS-B07', P + '/caps/' + k, 'capped unit is not in the roster'); }
    if (m.timeLimit < V.limits.timeLimitMin || m.timeLimit > V.limits.timeLimitMax) add('MS-B10', P + '/timeLimit', 'timeLimit ' + m.timeLimit + ' outside ' + V.limits.timeLimitMin + '..' + V.limits.timeLimitMax);
    if (m.reference) {
      let rc = 0; const have = {}; const types = new Set();
      m.reference.forEach((g, gi) => { if (!units[g.defId]) { add('MS-R01', P + '/reference/' + gi, 'unknown unit ' + g.defId); return; } if (m.roster && !m.roster.includes(g.defId)) add('MS-B04', P + '/reference/' + gi, 'reference unit ' + g.defId + ' is not in the roster'); rc += g.n * cost(env, g.defId); have[g.defId] = (have[g.defId] || 0) + g.n; types.add(g.defId); });
      for (const c of m.core) if ((have[c.defId] || 0) < c.n) add('MS-B03', P + '/reference', 'reference must include the core unit ' + c.defId + ' x' + c.n);
      for (const [k, cap] of Object.entries(m.caps)) if ((have[k] || 0) > cap) add('MS-B07', P + '/reference', 'reference fields ' + have[k] + ' ' + k + ' but the cap is ' + cap);
      if (rc > m.budget) add('MS-B04', P + '/reference', 'reference costs ' + rc + ', more than the budget ' + m.budget);
      else if (rc < V.limits.referenceFillMin * m.budget) add('MS-B04', P + '/reference', 'reference spends only ' + rc + ' of ' + m.budget + ' (a reference army uses the budget: >= ' + V.limits.referenceFillMin * 100 + ' percent)');
      if (types.size > V.limits.referenceTypes) add('MS-B04', P + '/reference', 'reference has more than 16 unit types');
    } else if (!ancient) add('MS-B08', P + '/reference', 'reference army required');
    // enemy
    const enemyAllGroups = enemyLike(m);
    enemyAllGroups.forEach((g) => needUnit(g.defId, P + '/enemy'));
    if (uniq(enemyAllGroups.map((g) => g.defId)).length > V.limits.enemyTypes) add('MS-B05', P + '/enemy', 'more than 16 enemy unit types');
    for (const g of m.enemy.generals || []) if (!enemyAllGroups.some((x) => x.defId === g)) add('MS-O04', P + '/enemy/generals', 'general ' + g + ' is not in the enemy army');
    for (const b of m.enemy.bosses || []) { if (ctx.bosses && ctx.bosses.length && !ctx.bosses.includes(b)) add('MS-R13', P + '/enemy/bosses', 'unknown boss ' + b); if (!enemyAllGroups.some((x) => x.defId === b)) add('MS-O04', P + '/enemy/bosses', 'boss ' + b + ' is not in the enemy army'); }
    const groupIds = new Set();
    const eachGroup = (gs, gp) => gs.forEach((g, gi) => {
      if (g.id) { if (groupIds.has(g.id)) add('MS-E01', gp + '/' + gi, 'duplicate group id ' + g.id); groupIds.add(g.id); }
      if (g.at && g.at.marker && !mkIds.has(g.at.marker)) add('MS-R04', gp + '/' + gi + '/at', 'unknown marker ' + g.at.marker);
      if (g.formation && ctx.formations && !ctx.formations.includes(g.formation)) add('MS-R15', gp + '/' + gi + '/formation', 'unknown formation ' + g.formation);
      for (const a of (g.override && g.override.disableAbilities) || []) if (ctx.abilities && ctx.abilities.length && !ctx.abilities.includes(a)) add('MS-R12', gp + '/' + gi + '/override', 'unknown ability ' + a);
      if (g.override && !ancient && g.override.disarm && g.override.passive) add('MS-R12', gp + '/' + gi + '/override', 'disarm and passive are exclusive');
    });
    eachGroup(m.enemy.groups, P + '/enemy/groups');
    if (m.script && m.script.waves) m.script.waves.list.forEach((w, wi) => eachGroup(w.groups, P + '/script/waves/list/' + wi + '/groups'));
    // fixed
    m.fixed.forEach((f, fi) => {
      needUnit(f.defId, P + '/fixed/' + fi);
      if (f.marker && !mkIds.has(f.marker)) add('MS-R04', P + '/fixed/' + fi + '/marker', 'unknown marker ' + f.marker);
      if (!f.marker && (f.x === undefined || f.z === undefined)) add('MS-B06', P + '/fixed/' + fi, 'fixed unit needs a marker or x,z');
      if (!ancient && f.def) add('MS-B06', P + '/fixed/' + fi + '/def', 'new eras use the closed `override`, not the open `def` patch');
      if (ancient && f.override) add('MS-B06', P + '/fixed/' + fi + '/override', 'Ancient keeps the shipped open `def` patch');
      for (const a of (f.override && f.override.disableAbilities) || []) if (ctx.abilities && ctx.abilities.length && !ctx.abilities.includes(a)) add('MS-R12', P + '/fixed/' + fi, 'unknown ability ' + a);
    });
    // ------------------------------------------------ objective
    const ob = m.objective, ot = ob.type;
    if (ancient ? V.objectiveTypes.added.includes(ot) : ot === 'protect_vip') add('MS-O01', P + '/objective/type', ot + ' is not legal in era ' + era + (ancient ? '' : ' (use escort)'));
    for (const id of ob.markerIds) if (!mkIds.has(id)) add('MS-O02', P + '/objective/markerIds', 'objective names marker ' + id + ' which does not exist');
    const needType = V.markerFor[ot];
    if (needType && !m.arena.markers.some((k) => k.type === needType)) add('MS-O03', P + '/objective', ot + ' needs a marker of type ' + needType);
    if ((ot === 'protect_vip' || ot === 'escort') && !m.arena.markers.some((k) => k.type === 'vip_start')) add('MS-O03', P + '/objective', ot + ' needs a vip_start marker');
    if (ot === 'kill_general' && !(m.enemy.generals || []).length) add('MS-O04', P + '/enemy/generals', 'kill_general needs enemy.generals');
    if (ot === 'kill_general' && !ob.markerIds.some((id) => mk[id] && mk[id].type === 'general_spawn')) add('MS-O02', P + '/objective/markerIds', 'kill_general names a general_spawn marker');
    if (ot === 'hold_hill' && !ob.markerIds.some((id) => mk[id] && mk[id].type === 'hill')) add('MS-O02', P + '/objective/markerIds', 'hold_hill names a hill marker');
    if (ot === 'protect_vip' || ot === 'escort') {
      const vips = m.fixed.filter((f) => f.vip);
      if (!vips.length) add('MS-O06', P + '/fixed', ot + ' needs a free VIP unit (fixed[].vip)');
      if (ot === 'escort') {
        const p = ob.params;
        if (!vips.some((f) => f.defId === p.vip)) add('MS-O06', P + '/objective/params/vip', 'params.vip ' + p.vip + ' is not a fixed VIP');
        if (!mk[p.exit] || mk[p.exit].type !== 'exit') add('MS-O06', P + '/objective/params/exit', 'params.exit must be an exit marker');
        if (!ob.markerIds.includes(p.exit)) add('MS-O02', P + '/objective/markerIds', 'markerIds must list the exit marker');
      }
      if (ob.params.time !== undefined && ob.params.time > m.timeLimit) add('MS-O07', P + '/objective/params/time', 'time exceeds timeLimit');
    }
    if (ot === 'hold_hill' && ob.params.time > m.timeLimit) add('MS-O07', P + '/objective/params/time', 'hold time ' + ob.params.time + ' exceeds timeLimit ' + m.timeLimit);
    if (ot === 'survive_waves') { const w = m.script && m.script.waves; const have = w ? w.list.length + (w.placed ? 1 : 0) : 0; if (have < ob.params.waves) add('MS-O05', P + '/script/waves', 'survive_waves ' + ob.params.waves + ' needs at least that many scripted waves (placed counts as one); have ' + have); }
    if (ot === 'capture') {
      const p = ob.params;
      for (const id of p.points) if (!mk[id] || mk[id].type !== 'capture') add('MS-O02', P + '/objective/params/points', 'capture point ' + id + ' must be a marker of type capture');
      if (p.need > p.points.length) add('MS-O05', P + '/objective/params/need', 'need exceeds the number of points');
      if (JSON.stringify(ob.markerIds.slice().sort()) !== JSON.stringify(p.points.slice().sort())) add('MS-O02', P + '/objective/markerIds', 'markerIds must equal params.points');
    }
    if (ot === 'defend_core') {
      const p = ob.params;
      if (!mk[p.core] || mk[p.core].type !== 'core') add('MS-O02', P + '/objective/params/core', 'core marker ' + p.core + ' must have type core');
      needProp(p.prop, P + '/objective/params/prop');
      if (p.time === undefined && !(m.script && m.script.waves)) add('MS-O05', P + '/objective/params', 'defend_core needs params.time or scripted waves');
      if (p.time !== undefined && p.time > m.timeLimit) add('MS-O07', P + '/objective/params/time', 'core time exceeds timeLimit');
    }
    if (ot === 'destroy') {
      ob.params.props.forEach((t, ti) => {
        if (t.type) needProp(t.type, P + '/objective/params/props/' + ti);
        if (t.def && !enemyAllGroups.some((g) => g.defId === t.def)) add('MS-O08', P + '/objective/params/props/' + ti, 'destroy target def ' + t.def + ' is not in the enemy army');
        if (t.tag && !enemyAllGroups.some((g) => (units[g.defId] && units[g.defId].tags || []).includes(t.tag))) add('MS-O08', P + '/objective/params/props/' + ti, 'no enemy unit carries tag ' + t.tag);
      });
    }
    // ------------------------------------------------ par / stars / copy
    if (m.par.type === 'none' && m.par.value !== 0) add('MS-K06', P + '/par', 'par none needs value 0');
    if (m.par.type !== 'none' && m.par.value <= 0) add('MS-K06', P + '/par', 'par ' + m.par.type + ' needs a positive value');
    if (m.par.type === 'cost' && m.par.value >= m.budget) add('MS-K06', P + '/par', 'cost par must be below the budget');
    const st = m.starTests;
    if (st[0].id !== 'win' || st[0].helper !== undefined) add('MS-K01', P + '/starTests/0', 'star 1 is {id:"win"} with no helper');
    if (st[1].helper !== 'aliveCostFrac' || !Array.isArray(st[1].args) || st[1].args.length !== 1 || st[1].args[0] !== 0.5 || st[1].id !== 'half') add('MS-K01', P + '/starTests/1', 'star 2 is {id:"half", helper:"aliveCostFrac", args:[0.5]}');
    if (new Set(st.map((s) => s.id)).size !== 3) add('MS-K01', P + '/starTests', 'star ids must be unique');
    st.forEach((s, k) => { if (m.text.stars[k].id !== s.id) add('MS-K01', P + '/text/stars/' + k + '/id', 'text star id ' + m.text.stars[k].id + ' differs from starTests id ' + s.id); });
    const s3 = st[2];
    if (!s3.helper) add('MS-K01', P + '/starTests/2', 'star 3 needs a helper');
    else if (s3.helper === 'aliveCostFrac' || s3.helper === 'win') add('MS-K02', P + '/starTests/2/helper', 'star 3 cannot be ' + s3.helper);
    else {
      const probs = helperProblems(s3.helper, s3.args, ctx, m);
      probs.forEach((x) => add('MS-R11', P + '/starTests/2', x));
      if (!probs.length) {
        const tested = helperMechanics(s3.helper, s3.args, era);
        for (const t of tested) if (!m.tests.includes(t)) add('MS-K04', P + '/tests', 'star 3 (' + s3.helper + ') tests mechanic ' + t + ' but tests[] does not list it');
        if (s3.helper === 'thrift') {
          if (m.par.type !== 'cost' || s3.args[0] !== m.par.value) add('MS-K03', P + '/starTests/2/args', 'thrift arg ' + s3.args[0] + ' must equal par.value ' + m.par.value + ' (par.type cost)');
          if (m.fixed.length) add('MS-K03', P + '/starTests/2', 'thrift counts fixed units (playerCostStart); use spentAtMost');
        }
        if (s3.helper === 'spentAtMost' && (m.par.type !== 'cost' || s3.args[0] !== m.par.value)) add('MS-K03', P + '/starTests/2/args', 'spentAtMost arg must equal par.value');
        const allow = allowedNumbers(m);
        const bad = (txt, where) => { for (const n of numbersIn(renderText(txt, m))) if (!allow.has(n)) add('MS-K05', where, 'number ' + n + ' in "' + String(txt).slice(0, 70) + '" is not a helper arg / budget / par / timeLimit of this mission'); };
        bad(m.text.stars[2].text, P + '/text/stars/2');
        for (const [ri, r] of m.rules.entries()) if (/^star 3\b/i.test(r)) bad(r, P + '/rules/' + ri);
      }
    }
    for (const t of m.tests) if (!mech[t]) add('MS-R06', P + '/tests', 'unknown mechanic ' + t);
    for (const t of m.teaches) if (!mech[t]) add('MS-R06', P + '/teaches', 'unknown mechanic ' + t);
    for (const t of m.combines) if (!mech[t]) add('MS-R06', P + '/combines', 'unknown mechanic ' + t);
    // ------------------------------------------------ bots
    for (const k of ['greedy', 'counter', 'turtle']) { const b = m.bots[k]; if (!(b[0] >= 0 && b[1] <= 1 && b[0] < b[1])) add('MS-X01', P + '/bots/' + k, 'band must be [lo, hi] with 0 <= lo < hi <= 1'); }
    const dflt = { greedy: [0.25, 0.7], counter: [0.6, 1], turtle: [0.1, 0.6] };
    if (Object.keys(dflt).some((k) => JSON.stringify(m.bots[k]) !== JSON.stringify(dflt[k])) && !m.botsWhy) add('MS-X01', P + '/botsWhy', 'a band differs from the default (greedy .25-.7, counter .6-1, turtle .1-.6): botsWhy must say why');
    // ------------------------------------------------ rewards
    const rw = m.rewards;
    for (const k of rw.unlockMutators) if (ctx.mutators && !ctx.mutators.includes(k) && !(ancient && doc.legacy && doc.legacy.mutatorStars[k])) add('MS-R07', P + '/rewards/unlockMutators', 'unknown mutator ' + k);
    for (const k of rw.unlockParts) if (!doc.rewardParts[k]) add('MS-F04', P + '/rewards/unlockParts', 'part ' + k + ' is not in rewardParts');
    if (ancient) for (const k of rw.unlockParts) if (ctx.unlocks && !ctx.unlocks.includes(k)) add('MS-R07', P + '/rewards/unlockParts', 'unknown unlock key ' + k);
    if (!ancient) for (const k of rw.unlockParts) if (!k.startsWith(pfx)) add('MS-R07', P + '/rewards/unlockParts', 'part ' + k + ' must carry the era prefix ' + pfx);
    if (!ancient) for (const k of rw.unlockMutators) if (!k.startsWith(pfx)) add('MS-R07', P + '/rewards/unlockMutators', 'an era mutator carries the era prefix ' + pfx + ' (the nine shared mutators unlock by stars)');
    for (const q of rw.quickUnlocks) if (q.kind === 'arena' && !recipes[q.id]) add('MS-W03', P + '/rewards/quickUnlocks', 'quick unlock names unknown arena ' + q.id);
    const lists = { mutator: rw.unlockMutators, part: rw.unlockParts, quick_unlock: rw.quickUnlocks.map((q) => q.id), codex_write: rw.codex };
    if (!(lists[rw.primary.class] || []).includes(rw.primary.id)) add('MS-W02', P + '/rewards/primary', 'primary ' + rw.primary.class + ':' + rw.primary.id + ' is not granted by the lists');
    if (!ancient && !rw.substitution && !['mutator', 'codex_write'].includes(rw.primary.class)) add('MS-W02', P + '/rewards/substitution', 'substitution required when the primary is a ' + rw.primary.class);
    const want = (ancient ? V.rewardPrefixes.ancient : V.rewardPrefixes[era]) + (i + 1) + '_';
    if (!m.rewardId.startsWith(want) || m.rewardId.length <= want.length) add('MS-W01', P + '/rewardId', 'rewardId must start with ' + want + ' (<prefix>r<mission number>_<slug>)');
    // ------------------------------------------------ teaching beats
    const th = m.teaching;
    if (th) {
      if (th.legacy && !ancient) add('MS-C09', P + '/teaching', 'teaching.legacy is Ancient only');
      if (th.legacy && i !== 0) add('MS-C09', P + '/teaching', 'legacy teaching is mission 1 only');
      if (!ancient) {
        if (th.beats.some((b) => b.basics) && i !== 0) add('MS-C09', P + '/teaching', 'basics beats belong to mission 1 only (once-ever layer)');
        if (i === 0) { const got = th.beats.filter((b) => b.basics).map((b) => b.id); if (JSON.stringify(got) !== JSON.stringify(BASICS)) add('MS-C09', P + '/teaching', 'mission 1 carries exactly the five basics beats ' + BASICS.join(', ') + ' in that order'); }
        for (const b of th.beats) { if (!b.basics && !b.id.startsWith(pfx)) add('MS-C09', P + '/teaching', 'era beat ' + b.id + ' must carry the prefix ' + pfx); if (b.mechanic && !mech[b.mechanic]) add('MS-C09', P + '/teaching', 'beat ' + b.id + ' names unknown mechanic ' + b.mechanic); }
        for (const t of m.teaches) if (!th.beats.some((b) => b.mechanic === t)) add('MS-C05', P + '/teaching', 'mission teaches ' + t + ' but no beat has mechanic ' + t);
      }
      th.exceptions.forEach((e, ei) => {
        const EP = P + '/teaching/exceptions/' + ei;
        if (e.kind === 'unit') needUnit(e.id, EP + '/id'); else if (e.kind === 'prop') needProp(e.id, EP + '/id'); else if (ctx.godPowers && ctx.godPowers.length && !ctx.godPowers.includes(e.id)) add('MS-R09', EP + '/id', 'unknown god power ' + e.id);
        if (!mech[e.mechanic]) add('MS-R06', EP + '/mechanic', 'unknown mechanic ' + e.mechanic);
        else if (!(taughtAt[e.mechanic] !== undefined && taughtAt[e.mechanic] > i) && !mech[e.mechanic].firstSightOnly) add('MS-C08', EP, 'exception for ' + e.mechanic + ' which is not taught later than this mission (nothing to declare)');
      });
    } else if (!ancient && m.teaches.length) add('MS-C05', P + '/teaching', 'a mission that teaches needs teaching beats');
    // ------------------------------------------------ modules
    const rm = m.requiresModules;
    for (const x of rm.concat(m.softModules)) if (!modules[x]) add('MS-R08', P + '/requiresModules', 'unknown module ' + x);
    for (const x of m.softModules) if (rm.includes(x)) add('MS-C06', P + '/softModules', x + ' is both hard and soft');
    const taughtNeed = uniq([].concat(...m.teaches.map((t) => (mech[t] ? mech[t].modules : []))));
    const testNeed = m.starTests[2].helper && !helperProblems(m.starTests[2].helper, m.starTests[2].args, ctx, m).length ? helperModules(m.starTests[2].helper, m.starTests[2].args, era) : [];
    const closure = moduleClosure(rm, ctx.modules);
    if (!ancient) {
      for (const x of taughtNeed) if (!closure.has(x)) add('MS-C06', P + '/requiresModules', 'module ' + x + ' is needed by the taught mechanic and is not in the closure of requiresModules');
      const closureAll = moduleClosure(rm.concat(m.softModules), ctx.modules);
      for (const x of testNeed) if (!closureAll.has(x)) res.infos.push({ code: 'MS-V01', path: P + '/starTests/2', msg: 'star 3 reads counters of module ' + x + ', which is not in requiresModules: the star is unearnable until it lands (star-only dependency)' });
      for (const x of taughtNeed) if (m.softModules.includes(x) && !closure.has(x)) add('MS-C06', P + '/softModules', 'the module ' + x + ' of the taught mechanic cannot be soft');
    }
    // ------------------------------------------------ powers
    if (m.powers.disable.length && m.godPowers === false) add('MS-E09', P + '/powers', 'powers.disable on a mission with godPowers false');
    for (const pid of m.powers.disable) if (ctx.godPowers && ctx.godPowers.length && !ctx.godPowers.includes(pid)) add('MS-R09', P + '/powers/disable', 'unknown god power ' + pid);
    for (const [pid, o] of Object.entries(m.powers.override)) {
      if (ctx.godPowers && ctx.godPowers.length && !ctx.godPowers.includes(pid)) add('MS-R09', P + '/powers/override/' + pid, 'unknown god power ' + pid);
      for (const f of Object.keys(o)) if (!V.powerOverrideFields.includes(f)) add('MS-R09', P + '/powers/override/' + pid + '/' + f, 'override field ' + f + ' is not in powerOverrideFields');
      if (m.powers.disable.includes(pid)) add('MS-E09', P + '/powers/override/' + pid, 'a disabled power cannot be overridden');
    }
    if (ancient && (m.powers.disable.length || Object.keys(m.powers.override).length)) add('MS-E09', P + '/powers', 'Ancient missions use no power patches (G6 frozen)');
    // ------------------------------------------------ script
    lintScript(m, P, { add, mk, mkIds, groupIds, ctx, V, eventOk, counterIds, needProp, needUnit, ancient, pfx, era });
    // ------------------------------------------------ set-pieces
    const sps = (m.setpiece ? [m.setpiece] : []).concat(m.extraSetpieces || []);
    if (!ancient) {
      if (!m.setpiece) add('MS-P01', P + '/setpiece', 'a new-era mission needs a primary set-piece'); else if (m.setpiece.role !== 'primary') add('MS-P01', P + '/setpiece/role', 'the setpiece field is the primary');
      for (const [xi, x] of (m.extraSetpieces || []).entries()) if (x.role === 'primary') add('MS-P01', P + '/extraSetpieces/' + xi + '/role', 'extra set-pieces are not primary');
    } else if (sps.length) add('MS-P01', P + '/setpiece', 'Ancient has no set-pieces (CU3 SETPIECES is a new-era kind; AP table)');
    const refOps = new Set(); for (const e of (m.script && m.script.events) || []) for (const o of e.do) if (o.op === 'setpiece') refOps.add(o.piece);
    sps.forEach((sp, si) => {
      const SP = si === 0 && m.setpiece ? P + '/setpiece' : P + '/extraSetpieces/' + (si - (m.setpiece ? 1 : 0));
      if (!ancient) {
        const base = new RegExp('^' + pfx + 'sp_[a-z0-9_]+$'); if (!base.test(sp.id)) add('MS-R10', SP + '/id', 'set-piece id must match ' + pfx + 'sp_<slug>');
        if (!new RegExp('^' + pfx + '(sting|stg)_[a-z0-9_]+$').test(sp.stinger.id)) add('MS-R10', SP + '/stinger/id', 'stinger id must match ' + pfx + '(sting|stg)_<slug>');
        for (const f of sp.sfx) if (!f.startsWith(pfx) && !/^[a-z]+_[a-z0-9_]+$/.test(f)) add('MS-R10', SP + '/sfx', 'sfx id ' + f + ' malformed');
      }
      if (allIds.includes(sp.id)) add('MS-R10', SP + '/id', 'set-piece id collides with a mission/puzzle id');
      const spSeen = (opts._sp = opts._sp || new Set()); if (spSeen.has(era + ':' + sp.id)) add('MS-R10', SP + '/id', 'duplicate set-piece id ' + sp.id); spSeen.add(era + ':' + sp.id);
      const okAnchor = (a) => V.namedAnchors.includes(a) || mkIds.has(a) || (a.startsWith('unit:') && enemyAllGroups.concat(m.fixed).concat((m.reference || [])).some((g) => g.defId === a.slice(5)));
      for (const k of ['from', 'to']) if (!okAnchor(sp.shot[k].anchor)) add('MS-P02', SP + '/shot/' + k + '/anchor', 'anchor ' + sp.shot[k].anchor + ' does not resolve in this mission');
      const cat = sp.announcer.category, okCat = cat === 'campaign_' + m.id || V.announcerCategories.objective.includes(cat);
      if (!okCat) add('MS-P03', SP + '/announcer/category', 'category must be campaign_' + m.id + ' or one of ' + V.announcerCategories.objective.join(', '));
      if (cat.startsWith('campaign_') && !sp.announcer.sub) add('MS-P03', SP + '/announcer/sub', 'campaign_<id> slots need a sub'); else if (sp.announcer.sub && !V.announcerCategories.subs.includes(sp.announcer.sub)) add('MS-P03', SP + '/announcer/sub', 'unknown sub ' + sp.announcer.sub);
      if ([...new Set(sp.announcer.lines.map((l) => l.who))].sort().join() !== 'brutus,cassandra,plato') add('MS-P03', SP + '/announcer/lines', 'three lines: brutus, plato and cassandra once each');
      const hasTrig = sp.trigger !== null && sp.trigger !== undefined, hasOp = refOps.has(sp.id);
      if (hasTrig === hasOp) add('MS-P04', SP + '/trigger', hasTrig ? 'set-piece has both a trigger and a script setpiece op' : 'set-piece never fires: give it a trigger or a script setpiece op');
      if (hasTrig) lintWhen(sp.trigger, SP + '/trigger', { add, ctx, V, m, mkIds, counterIds, needProp, groupIds, local: new Set(((m.script && m.script.counters) || []).map((c) => c.id)), ancient });
    });
    for (const o of refOps) if (!sps.some((s) => s.id === o)) add('MS-E06', P + '/script', 'setpiece op names ' + o + ' which this mission does not define');
    // ------------------------------------------------ first three minutes
    if (!ancient && i === 0 && !m.firstThreeMinutes) add('MS-G01', P + '/firstThreeMinutes', 'mission 1 needs the firstThreeMinutes index');
    if (m.firstThreeMinutes && (i !== 0 || ancient)) add('MS-G01', P + '/firstThreeMinutes', 'firstThreeMinutes belongs to mission 1 of a new era only');
    if (m.firstThreeMinutes && ctx.firstThree) {
      const key = (a) => JSON.stringify(a.map((x) => [x.kind, x.id]));
      if (key(m.firstThreeMinutes.fresh) !== key(ctx.firstThree.fresh)) add('MS-G02', P + '/firstThreeMinutes/fresh', 'fresh order differs from first_three_minutes.md section 1.1');
      if (key(m.firstThreeMinutes.returning) !== key(ctx.firstThree.returning)) add('MS-G02', P + '/firstThreeMinutes/returning', 'returning order differs from first_three_minutes.md section 2.1');
      const beatIds = new Set(((m.teaching && m.teaching.beats) || []).map((b) => b.id)); const spIds = new Set(sps.map((s) => s.id));
      for (const x of m.firstThreeMinutes.fresh) if (x.kind === 'beat' && !beatIds.has(x.id)) add('MS-G02', P + '/firstThreeMinutes', 'fresh order names beat ' + x.id + ' which mission 1 does not define'); else if (x.kind === 'setpiece' && !spIds.has(x.id)) add('MS-G02', P + '/firstThreeMinutes', 'fresh order names set-piece ' + x.id + ' which mission 1 does not define');
    }
    // ------------------------------------------------ attempts
    if (!ancient) {
      if (!m.attempts) add('MS-Y01', P + '/attempts', 'new-era mission needs attempts.design');
      else {
        const d = m.attempts.design; if (d.star3 < d.star1) add('MS-Y01', P + '/attempts/design', 'star3 attempts must be >= star1 attempts');
        const mx = V.attemptsMax; if (d.star1 > mx.star1[m.act - 1]) add('MS-Y01', P + '/attempts/design/star1', 'star1 ' + d.star1 + ' > ' + mx.star1[m.act - 1] + ' allowed in act ' + m.act); if (d.star3 > mx.star3[m.act - 1]) add('MS-Y01', P + '/attempts/design/star3', 'star3 ' + d.star3 + ' > ' + mx.star3[m.act - 1] + ' allowed in act ' + m.act);
        const c = m.attempts.computed;
        if (c) {
          if (Math.abs(c.star1 - 1 / c.p1) > 1e-3 * c.star1 + 1e-9 || (c.p3 > 0 ? c.star3 === null || Math.abs(c.star3 - 1 / c.p3) > 1e-3 * c.star3 + 1e-9 : c.star3 !== null)) add('MS-Y02', P + '/attempts/computed', 'star = 1/p violated');
          if (c.ci95.star1[0] > c.star1 || c.ci95.star1[1] < c.star1) add('MS-Y02', P + '/attempts/computed/ci95', 'star1 outside its interval');
          if (c.missionHash !== msHash(m)) add('MS-Y03', P + '/attempts/computed/missionHash', 'stale: the mission changed since it was measured (' + c.missionHash + ' vs ' + msHash(m) + ')');
          else if (c.star1 > 2 * d.star1 + 0.5 || c.star1 < d.star1 / 2 - 0.5) add('MS-Y03', P + '/attempts/computed/star1', 'measured ' + c.star1.toFixed(2) + ' is far from the design number ' + d.star1);
        }
      }
    } else if (m.attempts) add('MS-Y01', P + '/attempts', 'Ancient missions carry attempts: null (never measured; the shipped bands are the bots field)');
    // ------------------------------------------------ the binding outline
    const ol = ctx.outline && ctx.outline[i];
    if (ol && !ancient) {
      const diffs = [];
      if (ol.budget != null && m.budget !== ol.budget) diffs.push('budget ' + m.budget + ' vs outline ' + ol.budget);
      if (ol.par && (m.par.type !== ol.par.type || m.par.value !== ol.par.value)) diffs.push('par ' + JSON.stringify(m.par) + ' vs outline ' + JSON.stringify(ol.par));
      if (ol.timeLimit != null && m.timeLimit !== ol.timeLimit) diffs.push('timeLimit ' + m.timeLimit + ' vs outline ' + ol.timeLimit);
      if (ol.attempts && m.attempts && (m.attempts.design.star1 !== ol.attempts.star1 || m.attempts.design.star3 !== ol.attempts.star3)) diffs.push('attempts ' + m.attempts.design.star1 + '/' + m.attempts.design.star3 + ' vs outline ' + ol.attempts.star1 + '/' + ol.attempts.star3);
      const setKey = (a) => a.filter((x) => x !== 'M0').slice().sort().join(' ');
      if (!ol.allModules && setKey(m.requiresModules) !== setKey(ol.hard)) diffs.push('requiresModules [' + setKey(m.requiresModules) + '] vs outline [' + setKey(ol.hard) + ']');
      if (!ol.allModules && setKey(m.softModules) !== setKey(ol.soft)) diffs.push('softModules [' + setKey(m.softModules) + '] vs outline [' + setKey(ol.soft) + ']');
      if (ol.star3 && m.starTests[2].helper !== ol.star3.helper) diffs.push('star-3 helper ' + m.starTests[2].helper + ' vs outline ' + ol.star3.helper);
      else if (ol.star3 && ol.star3.args && JSON.stringify(m.starTests[2].args) !== JSON.stringify(ol.star3.args)) diffs.push('star-3 args ' + JSON.stringify(m.starTests[2].args) + ' vs outline ' + JSON.stringify(ol.star3.args));
      for (const d of diffs) { if (m.designAmendment) res.warnings.push({ code: 'MS-I06', path: P, msg: d + ' (amendment: ' + m.designAmendment + ')' }); else add('MS-I06', P, d); }
    }
    // ------------------------------------------------ blind
    if (!ancient) {
      if (!m.blind) add('MS-B09', P + '/blind', 'blind variant required');
      else {
        const refDefs = new Set((m.reference || []).map((g) => g.defId));
        for (const [a, b] of Object.entries(m.blind.swap)) {
          if (!refDefs.has(a)) add('MS-B09', P + '/blind/swap/' + a, 'swap key must be a reference unit');
          if (!units[b]) add('MS-R01', P + '/blind/swap/' + a, 'unknown unit ' + b);
          else if (units[a] && units[a].cost && units[b].cost && Math.abs(units[a].cost - units[b].cost) > 0.35 * units[a].cost) add('MS-B11', P + '/blind/swap/' + a, 'swap ' + a + ' -> ' + b + ' differs in cost by more than 35 percent');
          if (m.roster && !m.roster.includes(b)) add('MS-B09', P + '/blind/swap/' + a, 'swap target ' + b + ' is not in the roster');
        }
        if (!Object.keys(m.blind.swap).length) add('MS-B09', P + '/blind/swap', 'swap must name at least one unit');
      }
    } else if (m.blind) add('MS-B09', P + '/blind', 'Ancient missions have no blind variant');
    // ------------------------------------------------ inputs
    for (const [ii, x] of m.inputs.entries()) { if (x.at > m.timeLimit) add('MS-E02', P + '/inputs/' + ii, 'input after the time limit'); if (x.kind === 'power' && x.slot === undefined) add('MS-E02', P + '/inputs/' + ii, 'power input needs slot'); if (x.target && x.target.marker && !mkIds.has(x.target.marker)) add('MS-R04', P + '/inputs/' + ii, 'unknown marker ' + x.target.marker); if (x.defId) needUnit(x.defId, P + '/inputs/' + ii); }
    // finale / combine
    if ([2, 5, 8].includes(i) && !ancient) {
      if (m.combines.length < 2) add('MS-C04', P + '/combines', 'act finale must combine >= 2 earlier mechanics');
      for (const c of m.combines) if (!(taughtAt[c] !== undefined && taughtAt[c] < i) && !(taughtAt[c] === i)) add('MS-C04', P + '/combines', 'combined mechanic ' + c + ' is not taught in this or an earlier mission');
    }
    for (const t of m.tests) if (!ancient && !(taughtAt[t] !== undefined && taughtAt[t] < i)) add('MS-C03', P + '/tests', 'star 3 tests ' + t + ' which is ' + (taughtAt[t] === undefined ? 'never taught' : 'taught in mission ' + (taughtAt[t] + 1) + ', not earlier'));
  });

  // ---------------------------------------------------------------- whole-file curve rules
  const objTypes = uniq(missions.map((m) => m.objective.type));
  if (objTypes.length < 5) add('MS-C01', '/missions', 'only ' + objTypes.length + ' distinct objective types (' + objTypes.join(', ') + '); the rule is >= 5');
  if (!ancient) {
    for (const id of mechIds) if (taughtAt[id] === undefined && !mech[id].firstSightOnly) add('MS-C02', '/missions', 'mechanic ' + id + ' is never taught');
    for (const h of V.headline[era] || []) {
      if (taughtAt[h] === undefined) { add('MS-C05', '/missions', 'headline mechanic ' + h + ' is not taught by any mission'); continue; }
      const m = missions[taughtAt[h]];
      const latest = Math.max(0, ...m.requiresModules.map((x) => (modules[x] ? modules[x].pos : 0)));
      const margin = freeze - latest;
      if (margin < 1 && !m.marginWaiver) add('MS-C07', '/missions/' + taughtAt[h] + '/requiresModules', 'headline mechanic ' + h + ': latest hard module pos ' + latest + ' vs E-FREEZE pos ' + freeze + ' (margin ' + margin + ' < 1); add marginWaiver');
      if (margin >= 1 && m.marginWaiver) res.infos.push({ code: 'MS-V01', path: '/missions/' + taughtAt[h] + '/marginWaiver', msg: 'waiver present but margin is ' + margin + ' (now unneeded)' });
    }
    // untaught
    const carried = (id) => (units[id] && units[id].carries) || null; let unknownCarry = 0;
    missions.forEach((m, i) => {
      const used = uniq(enemyLike(m).map((g) => g.defId).concat(m.fixed.map((f) => f.defId), m.roster || []));
      for (const u of used) {
        const c = carried(u); if (!c) { unknownCarry++; continue; }
        for (const mech1 of c) if (taughtAt[mech1] !== undefined && taughtAt[mech1] > i && !(m.teaching && m.teaching.exceptions.some((x) => x.kind === 'unit' && x.id === u && x.mechanic === mech1))) add('MS-C08', '/missions/' + i, 'unit ' + u + ' carries mechanic ' + mech1 + ' which is taught in mission ' + (taughtAt[mech1] + 1) + ' (add teaching.exceptions if it is inert)');
      }
    });
    if (unknownCarry) res.infos.push({ code: 'MS-V01', path: '/', msg: 'untaught rule inactive for ' + unknownCarry + ' unit uses (context.units[].carries absent; stats.js not yet present)' });
  }
  // ---------------------------------------------------------------- puzzles
  doc.puzzles.forEach((p, i) => {
    const P = '/puzzles/' + i;
    if (!recipes[p.arena.recipe]) add('MS-R03', P + '/arena/recipe', 'unknown arena recipe ' + p.arena.recipe);
    needFaction(p.player.faction, P + '/player/faction'); needFaction(p.enemy.faction, P + '/enemy/faction');
    p.player.roster.forEach((u, ri) => needUnit(u, P + '/player/roster/' + ri));
    if (!(p.par.type === 'cost' && p.par.value > 0 && p.par.value < p.player.budget)) add('MS-Z01', P + '/par', 'par must be a cost below the budget');
    const mkIds = new Set(p.arena.markers.map((k) => k.id));
    const size = ctx.sizes ? ctx.sizes[p.arena.size] : null;
    p.arena.markers.forEach((k) => { if (size && (Math.abs(k.x) > size * 0.25 || Math.abs(k.z) > size * 0.25)) add('MS-A01', P + '/arena/markers', 'marker ' + k.id + ' outside the arena'); });
    for (const id of p.goal.markerIds) if (!mkIds.has(id)) add('MS-O02', P + '/goal/markerIds', 'goal names marker ' + id + ' which does not exist');
    if (p.goal.type === 'kill_general' && !(p.enemy.generals || []).length) add('MS-O04', P + '/enemy/generals', 'kill_general needs generals');
    p.enemy.placements.forEach((pl, pi) => { needUnit(pl.defId, P + '/enemy/placements/' + pi); if (size && (Math.abs(pl.x) > size / 2 || Math.abs(pl.z) > size / 2)) add('MS-Z02', P + '/enemy/placements/' + pi, 'placement outside the arena'); });
    for (const g of p.enemy.generals || []) if (!p.enemy.placements.some((x) => x.defId === g)) add('MS-O04', P + '/enemy/generals', 'general ' + g + ' is not placed');
    p.fixed.forEach((f, fi) => { needUnit(f.defId, P + '/fixed/' + fi); if (f.marker && !mkIds.has(f.marker)) add('MS-R04', P + '/fixed/' + fi, 'unknown marker ' + f.marker); });
    if (p.goal.type === 'destroy') for (const t of p.goal.params.props || []) if (t.type) needProp(t.type, P + '/goal/params/props');
    const probs = helperProblems(p.bonus.helper, p.bonus.args, ctx, p);
    probs.forEach((x) => add('MS-Z03', P + '/bonus', x));
    if (p.bonus.helper === 'aliveCostFrac') add('MS-Z03', P + '/bonus/helper', 'aliveCostFrac is the mission star 2, not a puzzle bonus');
    if (p.timeLimit > 400) add('MS-Z01', P + '/timeLimit', 'puzzle timeLimit above 400 s');
    if (!ancient) {
      for (const t of p.teaches) if (!mech[t]) add('MS-R06', P + '/teaches', 'unknown mechanic ' + t);
      if (!p.teaches.length) add('MS-Z04', P + '/teaches', 'a new-era puzzle teaches one mechanic');
      const need = uniq([].concat(...p.teaches.map((t) => (mech[t] ? mech[t].modules : []))));
      for (const x of need) if (!p.requiresModules.includes(x)) add('MS-Z04', P + '/requiresModules', 'puzzle teaches a mechanic that needs ' + x);
      for (const x of p.requiresModules) if (!modules[x]) add('MS-R08', P + '/requiresModules', 'unknown module ' + x);
      if (!p.mechanicFired) add('MS-Z04', P + '/mechanicFired', 'the stored solution must fire the taught mechanic'); else if (!counterIds.has(p.mechanicFired.counter)) add('MS-E07', P + '/mechanicFired/counter', 'unknown counter ' + p.mechanicFired.counter);
      if (!p.firstSightBeat) add('MS-Z04', P + '/firstSightBeat', 'a puzzle opens with a first-sight beat that names the mechanic (a player may meet it before the mission)'); else if (!p.firstSightBeat.id.startsWith(pfx)) add('MS-C09', P + '/firstSightBeat', 'beat id must carry the prefix ' + pfx);
    } else if (p.teaches.length || p.requiresModules.length || p.mechanicFired || p.firstSightBeat) add('MS-Z04', P, 'Ancient puzzles carry no mechanic metadata');
  });
  if (!ancient && !doc.puzzles.every((p) => p.id.startsWith(pfx))) add('MS-I01', '/puzzles', 'puzzle ids carry the era prefix');
  // rewardParts: every entry used by some reward (no dead catalogue rows)
  const usedParts = new Set(); missions.forEach((m) => m.rewards.unlockParts.forEach((k) => usedParts.add(k)));
  for (const k of Object.keys(doc.rewardParts)) if (!usedParts.has(k) && !ancient) add('MS-F04', '/rewardParts/' + k, 'rewardParts entry ' + k + ' is used by no mission');
  return res;
}

function lintWhen(w, p, c) {
  if (typeof w === 'number') return;
  const { add, ctx, m } = c;
  switch (w.on) {
    case 'prop_destroyed': c.needProp(w.type, p + '/type'); break;
    case 'counter':
      if (!c.counterIds.has(w.counter) && !c.local.has(w.counter)) add('MS-E07', p + '/counter', 'unknown counter ' + w.counter + ' (canonical x-vocab.counters or a script.counters rule of this mission)');
      if (w.within !== undefined && w.gte < 2) add('MS-E07', p + '/within', 'within needs gte >= 2');
      break;
    case 'unit_kill': if (w.def && !ctx.units[w.def]) add('MS-E10', p + '/def', 'unknown unit ' + w.def); if (w.group && !c.groupIds.has(w.group)) add('MS-E10', p + '/group', 'unknown group ' + w.group); break;
    case 'hp_frac': {
      const t = w.target;
      if (t.prop) c.needProp(t.prop, p + '/target/prop');
      if (t.unit && !ctx.units[t.unit]) add('MS-E10', p + '/target/unit', 'unknown unit ' + t.unit);
      if (t.group && !c.groupIds.has(t.group)) add('MS-E10', p + '/target/group', 'unknown group ' + t.group);
      break;
    }
    default: break;
  }
  void m;
}

function lintScript(m, P, c) {
  const { add, mk, mkIds, ctx, V, ancient } = c;
  const s = m.script; if (!s) return;
  if (s.zeus && !ancient) add('MS-E08', P + '/script/zeus', 'zeus is the Ancient legacy block; use script.events strike');
  if (s.vipMarch) {
    const v = s.vipMarch;
    if (!mk[v.to] || mk[v.to].type !== 'exit') add('MS-E08', P + '/script/vipMarch/to', 'vipMarch.to must be an exit marker');
    if (v.delay > v.patience) add('MS-E08', P + '/script/vipMarch', 'delay exceeds patience');
    if (!m.fixed.some((f) => f.vip)) add('MS-E08', P + '/script/vipMarch', 'vipMarch needs a fixed VIP');
  }
  if (s.waves) {
    const w = s.waves;
    if (w.placed && w.first !== undefined) add('MS-E08', P + '/script/waves', 'placed waves use firstAfter, not first');
    if (!w.placed && w.firstAfter !== undefined) add('MS-E08', P + '/script/waves', 'unplaced waves use first, not firstAfter');
    w.list.forEach((x, wi) => x.groups.forEach((g) => c.needUnit(g.defId, P + '/script/waves/list/' + wi)));
  }
  const local = new Set(); (s.counters || []).forEach((r, ri) => {
    if (!ancient && !r.id.startsWith(c.pfx)) add('MS-E07', P + '/script/counters/' + ri + '/id', 'local counter ids carry the era prefix ' + c.pfx);
    if (V.counters[r.id]) add('MS-E07', P + '/script/counters/' + ri + '/id', 'local counter shadows the canonical counter ' + r.id);
    if (local.has(r.id)) add('MS-E07', P + '/script/counters/' + ri + '/id', 'duplicate local counter ' + r.id); local.add(r.id);
    if (r.kind === 'event') { if (!r.event) add('MS-E07', P + '/script/counters/' + ri, 'event rule needs event'); else if (!c.eventOk(r.event)) add('MS-R15', P + '/script/counters/' + ri + '/event', 'unknown event ' + r.event); }
    if (r.kind === 'world') add('MS-E07', P + '/script/counters/' + ri, 'only canonical counters may read a world counter');
  });
  const evs = s.events || []; const evIds = new Set();
  const expanded = evs.reduce((a, e) => a + (e.repeat ? e.repeat.times : 1), 0);
  if (expanded > V.limits.scriptEvents) add('MS-E02', P + '/script/events', 'more than 64 events after expanding repeat (' + expanded + ')');
  const hasM14 = m.requiresModules.includes('M14');
  evs.forEach((e, ei) => {
    const EP = P + '/script/events/' + ei;
    if (evIds.has(e.id)) add('MS-E02', EP + '/id', 'duplicate event id ' + e.id); evIds.add(e.id);
    if (e.do.length > V.limits.opsPerEvent) add('MS-E02', EP + '/do', 'more than 8 ops');
    if (typeof e.at === 'number') { if (e.at > m.timeLimit) add('MS-E02', EP + '/at', 'event after the time limit'); }
    else lintWhen(e.at, EP + '/at', { add, ctx, V, m, mkIds, counterIds: c.counterIds, needProp: c.needProp, groupIds: c.groupIds, local, ancient });
    if (e.repeat && typeof e.at !== 'number') add('MS-E02', EP + '/repeat', 'repeat needs a timed event (at: seconds)');
    if (e.repeat && typeof e.at === 'number' && e.at + e.repeat.every * (e.repeat.times - 1) > m.timeLimit) add('MS-E02', EP + '/repeat', 'the last repetition falls after the time limit');
    if (!hasM14 && !(typeof e.at === 'number' && e.do.every((o) => V.liteOps.includes(o.op)))) add('MS-E03', EP, 'without M14 only timed ' + V.liteOps.join('/') + ' ops run (MissionRuntime lite events)');
    for (const [oi, o] of e.do.entries()) {
      const OP = EP + '/do/' + oi;
      if (o.at && o.at.marker && !mkIds.has(o.at.marker)) add('MS-R04', OP + '/at', 'unknown marker ' + o.at.marker);
      switch (o.op) {
        case 'spawn':
          o.groups.forEach((g) => c.needUnit(g.defId, OP));
          if (o.team === 'player' && o.free !== true) add('MS-E04', OP, 'player-side spawn must be a free reinforcement (free:true; excluded from startCost)');
          if (o.team === 'enemy' && o.free === false) add('MS-E04', OP, 'enemy spawns are always reinforcements');
          break;
        case 'prop': c.needProp(o.type, OP + '/type'); break;
        case 'weather': if (!V.weather.kinds.includes(o.kind) && V.weather.pending[o.kind] === undefined) add('MS-E05', OP + '/kind', 'unknown weather kind ' + o.kind); else if (V.weather.pending[o.kind] !== undefined) add('MS-R14', OP + '/kind', o.kind + ' is pending in WEATHER_KINDS; fallback ' + V.weather.pending[o.kind]); break;
        case 'order': case 'kill':
          if (o.group && !c.groupIds.has(o.group)) add('MS-E01', OP + '/group', 'unknown group ' + o.group);
          if (o.op === 'kill') {
            if (!o.group && !o.def && !o.tag) add('MS-E01', OP, 'kill needs group, def or tag');
            if (o.def && !ctx.units[o.def]) add('MS-E10', OP + '/def', 'unknown unit ' + o.def);
            if (o.within && !mkIds.has(o.within.marker)) add('MS-R04', OP + '/within', 'unknown marker ' + o.within.marker);
          }
          break;
        case 'strike': if (o.at && o.at.near && o.kind !== 'prop' && o.kind !== 'airstrike') void 0; break;
        default: break;
      }
    }
  });
}

// ============================================================================================================================ generated documentation tables (docs/eras/spec/MS.md sentinels)
const esc = (t) => String(t).replace(/\|/g, '\\|');
const j = (v) => '`' + esc(JSON.stringify(v)) + '`';
export function emitTable(name) {
  const V = vocab(); const L = [];
  if (name === 'RULES') {
    L.push('| code | severity | rule |', '|---|---|---|');
    for (const [c, [sev, text]] of Object.entries(RULES)) L.push('| `' + c + '` | ' + { E: 'error', W: 'warning', I: 'info' }[sev] + ' | ' + esc(text) + ' |');
  } else if (name === 'HELPERS') {
    L.push('| helper | args | star | tests mechanic | counters read | summary fields read | exact definition | Ancient equal |', '|---|---|---|---|---|---|---|---|');
    for (const [h, d] of Object.entries(V.helpers)) {
      const args = d.args.map((a) => a.name + ':' + a.type + (d.optional && d.args.indexOf(a) >= d.args.length - d.optional ? '?' : '')).join(', ');
      const mech = !d.mechanic ? 'none' : typeof d.mechanic === 'string' ? d.mechanic : Object.entries(d.mechanic).map(([e, m]) => e + ': ' + m).join('; ');
      L.push('| `' + h + '` | ' + (args || '(none)') + ' | ' + d.star.join('/') + ' | ' + mech + ' | ' + (d.counters.map((c) => '`' + c + '`').join(' ') || '-') + ' | ' + (d.reads.map((c) => '`' + esc(c) + '`').join(' ') || '-') + ' | ' + esc(d.doc) + ' | ' + esc(d.ancient || '-') + ' |');
    }
  } else if (name === 'REJECTED') {
    L.push('| name | verdict |', '|---|---|');
    for (const [h, why] of Object.entries(V.rejectedHelpers)) L.push('| `' + h + '` | rejected: ' + esc(why) + ' |');
  } else if (name === 'COUNTERS') {
    L.push('| counter | kind | source | subject (`of`, side) | `where` | add / distinct / by / first | unit | module | meaning |', '|---|---|---|---|---|---|---|---|---|');
    for (const [c, d] of Object.entries(V.counters)) {
      const src = d.kind === 'world' ? 'world `' + d.worldId + '`' : 'event `' + d.event + '`';
      const subj = d.kind === 'world' ? '-' : d.of + ', ' + d.side;
      const opts = d.kind === 'world' ? '-' : [d.add !== undefined ? 'add ' + d.add : '', d.distinct ? 'distinct ' + d.distinct : '', d.by ? 'by ' + d.by : '', d.first ? 'first ' + d.first : ''].filter(Boolean).join('; ');
      L.push('| `' + c + '` | ' + d.kind + ' | ' + src + ' | ' + subj + ' | ' + (d.where ? j(d.where) : '-') + ' | ' + opts + ' | ' + d.unit + ' | ' + (d.module || '-') + ' | ' + esc(d.doc) + (d.needs ? ' NEEDS: ' + esc(d.needs.join('; ')) : '') + ' |');
    }
  } else if (name === 'MECHANICS') {
    L.push('| era | mechanic id | title | counter | unit | modules to teach | headline | first-sight only |', '|---|---|---|---|---|---|---|---|');
    for (const [era, ms] of Object.entries(V.mechanics)) for (const [id, m] of Object.entries(ms)) L.push('| ' + era + ' | `' + id + '` | ' + esc(m.title) + ' | `' + m.counter + '` | ' + m.unit + ' | ' + (m.modules.join(' ') || '-') + ' | ' + (m.headline ? 'yes' : 'no') + ' | ' + (m.firstSightOnly ? 'yes' : 'no') + ' |');
  } else throw new Error('unknown table ' + name);
  return L.join('\n');
}
export const DOC_TABLES = ['RULES', 'HELPERS', 'REJECTED', 'COUNTERS', 'MECHANICS'];
const sentinel = (n) => ['<!-- ms-table:' + n + ':begin -->', '<!-- ms-table:' + n + ':end -->'];
/** Replaces the sentinel blocks of a markdown text with the freshly emitted tables. */
export function syncDoc(md) {
  let out = md;
  for (const n of DOC_TABLES) {
    const [a, b] = sentinel(n); const i = out.indexOf(a), k = out.indexOf(b);
    if (i < 0 || k < 0) throw new Error('MS.md lacks the sentinels for ' + n);
    out = out.slice(0, i + a.length) + '\n' + emitTable(n) + '\n' + out.slice(k);
  }
  return out;
}

// ============================================================================================================================ IO
export function loadDoc(era) { const p = path.join(designDir(era), 'missions.json'); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; }
export async function loadContext(era, o = {}) {
  const p = o.file || path.join(designDir(era), 'context.json');
  let ctx;
  if (fs.existsSync(p)) ctx = JSON.parse(fs.readFileSync(p, 'utf8'));
  else { const { buildContext } = await import(pathToFileURL(path.join(HERE, 'ms_context.mjs')).href); ctx = await buildContext(era); }
  if (!ctx.events) ctx.events = await loadEvents();
  return ctx;
}
async function loadEvents() {
  const ev = await import(pathToFileURL(path.join(ROOT, 'src/core/events.js')).href);
  const out = { existing: Object.keys(ev.EVENTS).sort(), m: [] };
  const mp = path.join(DOCS, 'docs/eras/spec/M.md');
  if (fs.existsSync(mp)) {
    const t = fs.readFileSync(mp, 'utf8'); const i = t.indexOf('**`EVENTS` additions');
    if (i >= 0) for (const l of t.slice(i, i + 4000).split('\n')) { if (!l.startsWith('|')) continue; const c0 = l.split('|')[1] || ''; for (const mm of c0.matchAll(/`([a-z_]+)`/g)) out.m.push(mm[1]); }
  }
  out.m = uniq(out.m).sort(); return out;
}
export function formatReport(label, r) {
  const lines = [];
  for (const [sev, list] of [['error', r.errors], ['warning', r.warnings], ['info', r.infos]]) for (const x of list) lines.push(label + ' ' + sev + ' ' + x.code + ' ' + x.path + ': ' + x.msg);
  return lines.join('\n');
}
export async function lintAll(eras, o = {}) {
  const otherIds = {}; for (const e of ['ancient', 'medieval', 'modern', 'scifi']) { const d = loadDoc(e); if (d) otherIds[e] = d.missions.map((m) => m.id).concat(d.puzzles.map((p) => p.id)); }
  const out = {};
  for (const era of eras) {
    const doc = o.docs && o.docs[era] ? o.docs[era] : loadDoc(era); if (!doc) { out[era] = null; continue; }
    const ctx = o.contexts && o.contexts[era] ? o.contexts[era] : await loadContext(era);
    out[era] = lintFile(doc, ctx, { otherIds });
  }
  return out;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
  if (args['sync-doc'] || args['check-doc']) {
    const f = path.join(DOCS, 'docs/eras/spec/MS.md'); const md = fs.readFileSync(f, 'utf8'); const out = syncDoc(md);
    if (args['check-doc']) { if (out !== md) { console.error('ms_lint: the generated tables of docs/eras/spec/MS.md are stale (node tools/ms_lint.mjs --sync-doc)'); process.exit(1); } console.log('ms_lint: MS.md tables are current'); process.exit(0); }
    fs.writeFileSync(f, out); console.log('ms_lint: MS.md tables refreshed'); process.exit(0);
  }
  const all = ['ancient', 'medieval', 'modern', 'scifi'];
  const eras = args.era && args.era !== 'all' ? String(args.era).split(',') : all;
  let code = 0, linted = 0;
  if (args.file) {
    const doc = JSON.parse(fs.readFileSync(String(args.file), 'utf8')); const ctx = await loadContext(doc.era, { file: args.context ? String(args.context) : undefined });
    const r = lintFile(doc, ctx); linted++; const rep = formatReport(String(args.file), r); if (rep) console.log(rep);
    console.log(String(args.file) + ': ' + r.errors.length + ' errors, ' + r.warnings.length + ' warnings');
    if (r.errors.length || (args['warn-fail'] && r.warnings.length)) code = 1;
  } else {
    const res = await lintAll(eras);
    for (const era of eras) {
      const r = res[era]; if (!r) { if (args.era && args.era !== 'all') { console.error(era + ': no missions.json'); code = 2; } continue; }
      linted++; const rep = formatReport(era, r); if (rep && !args.json) console.log(rep);
      console.log(era + ': ' + r.errors.length + ' errors, ' + r.warnings.length + ' warnings, ' + r.infos.length + ' infos');
      if (r.errors.length || (args['warn-fail'] && r.warnings.length)) code = 1;
      if (args.json) console.log(JSON.stringify(r));
    }
    if (!linted) { console.error('ms_lint: nothing to lint'); code = 2; }
  }
  process.exit(code);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });
