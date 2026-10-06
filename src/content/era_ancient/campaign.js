// CAMPAIGN: "The Ancient Era", nine missions in three acts (spec/world.md sections 5-8, owner: CAMPAIGN). Pure data + pure functions.
// COORD wires `CAMPAIGN` to ctx.content.campaign ({acts, missions, ...}); the screens read `missions` through normMission (ui/screens/campaign.js).
// Copy (titles, blurbs, briefings, victory/defeat, star texts, reward titles) is HUMOR's campaign_text.js, referenced by mission id; everything below
// is data and logic: arena + markers, forces, objective, scripted events, star tests, rewards.
//
//   evaluateStars(mission, summary, defs?) -> {stars:0..3, earned:[bool,bool,bool], aliveCostFrac, win}   pure, over the BattleSummary of docs/lifetime_stats.md section 3
//   campaignApi = {missionById, nextMission(progress), starsFor(summary, mission), unlockedMutators(totalStars), isUnlocked(mission, progress), ...}
// Mission-specific facts the star tests need beyond the base summary (startDefs, lostDefs, heroesLost, friendlyHits, propDownT, vipDamage) are produced by
// campaign_run.js MissionTracker and merged into the summary (campaignApi.summaryOf); docs/requests/campaign_battle_summary.md lists them for COORD.
import { STAT_TABLE } from './stats.js';
import { CAMPAIGN_TEXT, ACTS as ACT_TEXT, MISSION_ORDER, TEACHING_BEATS, TEACHING_SKIP, REWARD_PARTS } from './campaign_text.js';
import { UNLOCKS } from './parts/_registry.js';
import { PUZZLES } from './puzzles.js';
import { validateMission, validatePuzzle, OBJECTIVE_TYPES, MARKER_TYPES } from './campaign_validate.js';
import { missionArena, missionRules, setupMission, enemyForces, objectiveSpec, markerOf, battleSummary, MissionRuntime, MissionTracker, ScriptedWaves, layoutGroups } from './campaign_run.js';

export const MUTATOR_STARS = { big_heads: 3, tiny_titans: 6, moon_gravity: 9, chicken_rain: 12, wine_rain_always: 15, friendly_fire_fiesta: 18, speedy_soldiers: 21, ragdoll_frenzy: 24, glass_cannons: 27 };
const MUTATOR_ORDER = Object.keys(MUTATOR_STARS);

/** Stable hash of everything that decides how a mission plays (not its copy): feasibility records are only valid for the data they were run on. */
export function missionHash(m) {
  const js = JSON.stringify({ a: m.arena, f: m.playerFaction, r: m.roster, b: m.budget, c: m.core, x: m.fixed, e: m.enemy, o: m.objective, t: m.timeLimit, ff: m.friendlyFire, g: m.godPowers, s: m.script, p: m.par }, (k, v) => (typeof v === 'function' ? undefined : v));
  let h = 2166136261 >>> 0; for (let i = 0; i < js.length; i++) { h ^= js.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const cost = (id) => (STAT_TABLE[id] ? STAT_TABLE[id].cost : 0);
const HEROES = new Set(Object.keys(STAT_TABLE).filter((id) => STAT_TABLE[id].role === 'hero'));
const sum = (o) => Object.keys(o || {}).reduce((s, k) => s + (o[k] | 0), 0);
const costOf = (counts) => Object.keys(counts || {}).reduce((s, k) => s + (counts[k] | 0) * cost(k), 0);

// ------------------------------------------------------------------------------------------------------------------------------ star tests
// Each test receives the BattleSummary (+ extras) of a WON battle of this mission; star 1 (win) and star 2 (>= 50% of the army by cost alive) are generic.
const T = {
  thrift: (par) => (s) => s.playerCostStart <= par,
  noSpartanLost: (s) => ((s.startDefs && s.startDefs.spartan) || 0) >= 6 && ((s.lostDefs && s.lostDefs.spartan) || 0) === 0,
  quick: (secs) => (s) => s.t <= secs,
  goatUntouched: (s) => s.vipDef === 'battle_goat' && s.vipDamage === 0,
  elephantAlive: (s) => ((s.aliveDefs && s.aliveDefs.war_elephant) || 0) >= 1,
  gateFast: (secs) => (s) => { const g = s.propDownT && s.propDownT.gate_door; return !!g && g.length > 0 && Math.min.apply(null, g) <= secs; },
  noFriendlyFire: (s) => (s.friendlyKills | 0) === 0 && (s.friendlyHits | 0) === 0,
  heroesAlive: (s) => { let fielded = 0; for (const k of Object.keys(s.startDefs || {})) if (HEROES.has(k)) fielded += s.startDefs[k]; return fielded >= 1 && (s.heroesLost | 0) === 0; },
};

// ------------------------------------------------------------------------------------------------------------------------------ the missions
const RAW = [
  {
    id: 'marathon_sort_of', unitsA: 30, act: 1, mood: 'calm',
    arena: { recipe: 'marathon', size: 'medium', seed: 11, env: {}, markers: [] },
    playerFaction: 'hellenes', roster: ['hoplite', 'cretan_archer', 'peltast'], budget: 3000, par: 2250,
    enemy: { faction: 'persians', style: 'mixed', difficulty: 'normal', special: 'cavalry on both flanks',
      groups: [{ defId: 'immortal', n: 11 }, { defId: 'sparabara', n: 8 }, { defId: 'cataphract', n: 4 }, { defId: 'camel_rider', n: 6 }] },
    objective: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 300,
    teaching: true,
    rules: ['Place hoplites first: spears beat cavalry. Archers behind them, peltasts on the flanks.', 'Star 3 asks for a cheaper army: spend at most 2,250 of your 3,000 drachmae.'],
    starTests: [null, null, T.thrift(2250)],
    rewards: { unlockMutators: ['big_heads'], unlockParts: [], codex: ['immortal', 'cataphract', 'sparabara'] },
  },
  {
    id: 'thermopylae_snack', unitsA: 47, act: 1, mood: 'epic',
    arena: { recipe: 'thermopylae', size: 'medium', seed: 3, env: {},
      markers: [{ id: 'pass', type: 'hill', x: -8, z: 0, r: 6 }],
      props: [{ t: 'barrel', x: -13.5, z: -2.6, s: 1.1 }, { t: 'crate', x: -13.5, z: -1.3, s: 1.1, v: 1 }, { t: 'barrel', x: -13.5, z: 1.4, s: 1.1, v: 2 }, { t: 'crate', x: -13.5, z: 2.7, s: 1.1 }] },
    playerFaction: 'hellenes', roster: ['spartan', 'hoplite', 'philosopher', 'peltast', 'cretan_archer', 'strategos'], budget: 6000, par: 0,
    core: [{ defId: 'spartan', n: 8 }],
    enemy: { faction: 'persians', style: 'waves', difficulty: 'normal', special: 'four waves',
      groups: [{ defId: 'immortal', n: 10 }, { defId: 'sparabara', n: 7 }, { defId: 'camel_rider', n: 2 }] },
    objective: { type: 'hold_hill', params: { time: 120 }, markerIds: ['pass'] }, timeLimit: 330,
    script: { waves: { placed: true, firstAfter: 28, interval: 30, breather: 3,
      list: [
        { groups: [{ defId: 'immortal', n: 12 }, { defId: 'sparabara', n: 7 }], after: 30 },
        { groups: [{ defId: 'immortal', n: 10 }, { defId: 'cataphract', n: 2 }, { defId: 'sparabara', n: 5 }], after: 30 },
        { groups: [{ defId: 'immortal', n: 12 }, { defId: 'camel_rider', n: 4 }, { defId: 'xerxes', n: 1 }, { defId: 'sparabara', n: 5 }] },
      ] } },
    rules: ['Hold the hill behind the wall for 120 seconds in total. The clock stops while an enemy stands on it.', 'Four waves of Persians arrive, about thirty seconds apart.', 'Star 3 needs at least six Spartans on the field, and none may fall.'],
    starTests: [null, null, T.noSpartanLost],
    rewards: { unlockMutators: ['tiny_titans'], unlockParts: [], codex: ['xerxes', 'spartan'] },
  },
  {
    id: 'pyramid_scheme', unitsA: 52, act: 1, mood: 'epic',
    arena: { recipe: 'giza', size: 'large', seed: 5, env: {}, markers: [{ id: 'pharaoh_start', type: 'general_spawn', x: 47, z: 4, r: 3 }] },
    playerFaction: 'romans', roster: ['legionary', 'pilum_thrower', 'gladiator', 'equites', 'ballista', 'centurion', 'senator'], budget: 7500, par: 0,
    enemy: { faction: 'egyptians', style: 'guarded general', difficulty: 'normal', generals: ['pharaoh'], special: 'the pharaoh avoids contact',
      groups: [{ defId: 'pharaoh', n: 1, at: { x: 47, z: 4 }, order: 'hold' }, { defId: 'anubis_guard', n: 8, at: { x: 44, z: 4 }, order: 'advance', formation: 'circle' }, { defId: 'medjay', n: 23 }, { defId: 'khopesh_warrior', n: 15 }, { defId: 'nubian_archer', n: 13 }, { defId: 'chariot_archer', n: 5 }, { defId: 'priest_of_ra', n: 4 }] },
    objective: { type: 'kill_general', params: {}, markerIds: ['pharaoh_start'], binding: true }, timeLimit: 300,
    rules: ['Kill the Pharaoh. The rest of his army does not matter, but it will try to matter.', 'The Pharaoh avoids contact and hides behind his guards. Cavalry and archers reach him fastest.', 'Star 3: the Pharaoh must fall within 90 seconds.'],
    starTests: [null, null, T.quick(90)],
    rewards: { unlockMutators: ['moon_gravity'], unlockParts: ['silly_helms'], codex: ['pharaoh', 'anubis_guard'] },
  },
  {
    id: 'nile_crossing', unitsA: 50, act: 2, mood: 'tense',
    arena: { recipe: 'nile', size: 'medium', seed: 4, env: {}, markers: [{ id: 'goat_start', type: 'vip_start', x: -24, z: -22, r: 3 }, { id: 'far_bank', type: 'exit', x: 8, z: 12, r: 4 }] },
    playerFaction: 'egyptians', roster: ['medjay', 'khopesh_warrior', 'mummy', 'chariot_archer', 'anubis_guard', 'priest_of_ra'], budget: 6500, par: 0,
    fixed: [{ defId: 'battle_goat', marker: 'goat_start', vip: true, heading: Math.PI / 2, name: 'The Goat', def: { melee: null, abilities: [], ai: { style: 'hold' } } }],
    enemy: { faction: 'barbarians', style: 'ford ambush', difficulty: 'normal', special: 'goes for the goat',
      groups: [{ defId: 'berserker', n: 12, at: { x: 4, z: 17 }, order: 'hold', squad: 6 }, { defId: 'axe_thrower', n: 8, at: { x: 10, z: 20 }, order: 'hold', squad: 8 }, { defId: 'druid', n: 10, at: { x: 12, z: 24 }, order: 'hold', squad: 5 }, { defId: 'chieftain', n: 4, at: { x: 8, z: 18 }, order: 'hold' }, { defId: 'warhound', n: 20 }] },
    objective: { type: 'protect_vip', params: { time: 150, reachOnly: true }, markerIds: ['goat_start', 'far_bank'], binding: true }, timeLimit: 150,
    script: { vipMarch: { to: 'far_bank', delay: 12, clear: 14, patience: 50 } },
    rules: ['The Goat is a free extra unit. It waits at its start and walks to the far bank by itself once nothing hostile stands near the way (never before twelve seconds, and at the latest after fifty): clear the road.', 'Win by getting the Goat inside the exit marker. If it falls, you lose.', 'Star 3: the Goat takes no damage at all.'],
    starTests: [null, null, T.goatUntouched],
    rewards: { unlockMutators: ['chicken_rain'], unlockParts: [], codex: ['battle_goat', 'chieftain'] },
  },
  {
    id: 'alps_elephant', unitsA: 83, act: 2, mood: 'ominous',
    arena: { recipe: 'alpine', size: 'medium', seed: 9, env: {}, markers: [] },
    playerFaction: 'carthage', roster: ['war_elephant', 'numidian', 'catapult', 'hannibal', 'berserker', 'axe_thrower', 'warhound', 'druid', 'chieftain', 'hoplite', 'peltast', 'cretan_archer', 'nubian_archer', 'medjay'], budget: 11000, par: 0,
    core: [{ defId: 'war_elephant', n: 2 }],
    enemy: { faction: 'romans', style: 'legion with fire', difficulty: 'normal', special: 'auxiliary archers with fire arrows',
      groups: [{ defId: 'legionary', n: 34 }, { defId: 'pilum_thrower', n: 14 }, { defId: 'nubian_archer', n: 17 }, { defId: 'equites', n: 7 }, { defId: 'ballista', n: 2 }, { defId: 'centurion', n: 2 }] },
    objective: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 360,
    rules: ['Elephants charge hard and panic when set on fire: Rome brings auxiliary archers with fire arrows. Keep your elephants behind the lines until the archers are dead.', 'Star 3: win with at least one war elephant still alive.'],
    starTests: [null, null, T.elephantAlive],
    rewards: { unlockMutators: ['wine_rain_always'], unlockParts: ['silly_weapons'], codex: ['war_elephant', 'hannibal'] },
  },
  {
    id: 'teutoburg_peekaboo', unitsA: 68, act: 2, mood: 'ominous',
    arena: { recipe: 'teutoburg', size: 'large', seed: 8, env: { weather: 'fog' }, markers: [{ id: 'centurion_start', type: 'general_spawn', x: 47, z: 0, r: 3 }] },
    playerFaction: 'barbarians', roster: ['berserker', 'axe_thrower', 'warhound', 'druid', 'chieftain'], budget: 7500, par: 0,
    enemy: { faction: 'romans', style: 'marching column', difficulty: 'normal', generals: ['centurion'], special: 'arrives in a column',
      groups: [{ defId: 'centurion', n: 1, at: { x: 47, z: 0 }, order: 'hold' }, { defId: 'legionary', n: 10 }, { defId: 'equites', n: 3 }] },
    objective: { type: 'kill_general', params: {}, markerIds: ['centurion_start'], binding: true }, timeLimit: 240,
    script: { waves: { placed: true, firstAfter: 14, interval: 14, breather: 2, list: [
      { groups: [{ defId: 'legionary', n: 10 }, { defId: 'equites', n: 3 }], after: 14 },
      { groups: [{ defId: 'legionary', n: 10 }, { defId: 'gladiator', n: 3 }], after: 14 },
      { groups: [{ defId: 'legionary', n: 10 }, { defId: 'equites', n: 3 }, { defId: 'ballista', n: 1 }] },
    ] } },
    rules: ['The Roman column arrives in four pieces, one after another. Beat each piece before the next closes up.', 'Kill the Centurion. He stays at the back and avoids contact.', 'Star 3: finish in 75 seconds.'],
    starTests: [null, null, T.quick(75)],
    rewards: { unlockMutators: ['friendly_fire_fiesta'], unlockParts: [], codex: ['centurion', 'druid'] },
  },
  {
    id: 'troy_giftshop', unitsA: 71, act: 3, mood: 'epic',
    arena: { recipe: 'troy', size: 'large', seed: 12, env: {}, markers: [] },
    playerFaction: 'hellenes', roster: ['hoplite', 'spartan', 'peltast', 'cretan_archer', 'companion_cavalry', 'philosopher', 'strategos', 'trojan_horse', 'catapult'], budget: 10000, par: 0,
    core: [{ defId: 'trojan_horse', n: 1 }],
    enemy: { faction: 'hellenes', style: 'defenders', difficulty: 'normal', special: 'hold behind the walls',
      groups: [{ defId: 'hoplite', n: 43, order: 'hold' }, { defId: 'cretan_archer', n: 18, order: 'hold' }, { defId: 'peltast', n: 10, order: 'hold' }, { defId: 'strategos', n: 1, order: 'hold' }, { defId: 'ballista', n: 3, order: 'hold' }] },
    objective: { type: 'destroy', params: { props: [{ type: 'gate_door', count: 2 }], eliminate: true }, markerIds: [] }, timeLimit: 420,
    rules: ['Both gate doors must be destroyed and every defender beaten.', 'The Trojan Horse is slow but sturdy: it opens up on contact. Fire is its only real enemy.', 'Star 3: bring a gate down within 100 seconds.'],
    starTests: [null, null, T.gateFast(100)],
    rewards: { unlockMutators: ['speedy_soldiers'], unlockParts: [], codex: ['trojan_horse', 'catapult'] },
  },
  {
    id: 'cyclops_meet', unitsA: 62, act: 3, mood: 'tense',
    arena: { recipe: 'cyclops', size: 'medium', seed: 14, env: {}, markers: [{ id: 'cyclops_start', type: 'general_spawn', x: 30, z: 0, r: 3 }] },
    playerFaction: 'hellenes', roster: ['hoplite', 'spartan', 'peltast', 'cretan_archer', 'companion_cavalry', 'philosopher', 'strategos'], budget: 8000, par: 0,
    friendlyFire: true,
    enemy: { faction: 'mythic', style: 'boss and goats', difficulty: 'normal', generals: ['cyclops'], special: 'throws boulders, misses a quarter',
      groups: [{ defId: 'cyclops', n: 1, at: { x: 30, z: 0 } }, { defId: 'battle_goat', n: 54 }, { defId: 'sacred_chicken', n: 29 }] },
    objective: { type: 'kill_general', params: {}, markerIds: ['cyclops_start'], binding: true }, timeLimit: 300,
    rules: ['Friendly fire is ON: arrows and thrown javelins hurt your own soldiers.', 'Kill the Cyclops. The goats and chickens are an optional extra.', 'Star 3: not a single friendly hit.'],
    starTests: [null, null, T.noFriendlyFire],
    rewards: { unlockMutators: ['ragdoll_frenzy'], unlockParts: [], codex: ['cyclops', 'battle_goat'] },
  },
  {
    id: 'zeus_bad_day', unitsA: 125, act: 3, mood: 'epic',
    arena: { recipe: 'olympus', size: 'large', seed: 10, env: { weather: 'storm' }, markers: [] },
    playerFaction: 'mixed', roster: null, budget: 15000, par: 0,
    enemy: { faction: 'mythic', style: 'mythic waves', difficulty: 'normal', special: 'Zeus throws lightning at everyone', groups: [] },
    objective: { type: 'survive_waves', params: { waves: 4 }, markerIds: [] }, timeLimit: 420,
    script: { zeus: { first: 12, every: 12, dmg: 70, r: 3.2, delay: 1.2 }, waves: { placed: false, first: 6, interval: 40, breather: 5, list: [
      { name: 'Wave 1', groups: [{ defId: 'battle_goat', n: 18 }, { defId: 'sacred_chicken', n: 36 }, { defId: 'medusa', n: 3 }, { defId: 'centaur_archer', n: 9 }] },
      { name: 'Wave 2', groups: [{ defId: 'minotaur', n: 5 }, { defId: 'centaur_archer', n: 12 }, { defId: 'battle_goat', n: 18 }] },
      { name: 'Wave 3', groups: [{ defId: 'minotaur', n: 3 }, { defId: 'medusa', n: 6 }, { defId: 'trojan_horse', n: 1 }, { defId: 'centaur_archer', n: 9 }, { defId: 'sacred_chicken', n: 30 }] },
      { name: 'Wave 4', groups: [{ defId: 'cyclops', n: 3 }, { defId: 'minotaur', n: 3 }, { defId: 'medusa', n: 3 }, { defId: 'centaur_archer', n: 9 }] },
    ] } },
    rules: ['Survive four waves of monsters. A wave counts once every one of its monsters is down.', 'Zeus strikes both armies with lightning every twelve seconds: do not stand in a clump.', 'Star 3 needs at least one hero on the field, and none may fall.'],
    starTests: [null, null, T.heroesAlive],
    rewards: { unlockMutators: ['glass_cannons'], unlockParts: ['wings'], codex: ['minotaur', 'medusa'] },
  },
];

// ------------------------------------------------------------------------------------------------------------------------------ assembly
function build(raw, i) {
  const tx = CAMPAIGN_TEXT[raw.id];
  if (!tx) throw new Error('campaign_text.js has no entry for ' + raw.id);
  const stars = tx.stars.map((s, k) => ({ id: s.id, text: s.text, test: raw.starTests[k] || null }));
  const enemyCount = (raw.enemy.groups || []).reduce((s, g) => s + g.n, 0) + ((raw.script && raw.script.waves) ? raw.script.waves.list.reduce((s, w) => s + w.groups.reduce((a, g) => a + g.n, 0), 0) : 0);
  const m = {
    id: raw.id, index: i, act: raw.act, title: tx.title, blurb: tx.blurb, briefing: tx.briefing, victory: tx.victory, defeat: tx.defeat, mood: raw.mood,
    arena: raw.arena, playerFaction: raw.playerFaction, roster: raw.roster, budget: raw.budget, par: raw.par, core: raw.core || [], fixed: raw.fixed || [],
    enemy: raw.enemy, objective: Object.assign({ text: objectiveText(raw) }, raw.objective), timeLimit: raw.timeLimit, friendlyFire: !!raw.friendlyFire, godPowers: raw.godPowers !== false,
    script: raw.script || null, teaching: !!raw.teaching, rules: raw.rules, stars,
    rewards: { title: tx.reward.title, blurb: tx.reward.blurb, unlockParts: raw.rewards.unlockParts, partNames: raw.rewards.unlockParts.map((k) => (REWARD_PARTS[k] ? REWARD_PARTS[k].name : k)), unlockMutators: raw.rewards.unlockMutators, codex: raw.rewards.codex },
    bots: { greedy: [0.25, 0.7], counter: [0.6, 0.9], turtle: [0.1, 0.6] },
    units: { A: raw.unitsA, B: enemyCount },
    enemyCost: (raw.enemy.groups || []).reduce((a, g) => a + g.n * cost(g.defId), 0) + ((raw.script && raw.script.waves) ? raw.script.waves.list.reduce((a, w) => a + w.groups.reduce((b, g) => b + g.n * cost(g.defId), 0), 0) : 0),
    textId: raw.id,
  };
  return m;
}

function objectiveText(raw) {
  const o = raw.objective;
  switch (o.type) {
    case 'hold_hill': return 'Hold the hill for ' + Math.floor(o.params.time / 60) + ':' + String(o.params.time % 60).padStart(2, '0');
    case 'kill_general': return 'Kill the ' + ((raw.enemy.generals && raw.enemy.generals[0]) === 'pharaoh' ? 'Pharaoh' : (raw.enemy.generals && raw.enemy.generals[0]) === 'cyclops' ? 'Cyclops' : 'Centurion');
    case 'protect_vip': return 'Get the goat across the river';
    case 'survive_waves': return 'Survive ' + o.params.waves + ' waves';
    case 'destroy': return 'Break both gates, beat the defenders';
    default: return 'Defeat the enemy army';
  }
}

export const MISSIONS = RAW.map(build);
const BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
export const ACTS = [1, 2, 3].map((n) => ({ id: n, title: ACT_TEXT[n].title, blurb: ACT_TEXT[n].blurb, missions: MISSIONS.filter((m) => m.act === n).map((m) => m.id) }));

// ------------------------------------------------------------------------------------------------------------------------------ stars
/** aliveDefs {defId:n} -> drachmae of the army still standing. */
export const aliveCost = (summary) => costOf(summary.aliveDefs);

/**
 * Stars of one finished battle. The three stars are independent achievements of a WON battle: star 1 the win, star 2 a win with >= 50% of the army (by cost)
 * still alive, star 3 the mission's own test; `stars` is how many were earned (0..3, what the campaign map stores). A loss, a draw or a summary of another
 * mission earns nothing, whatever the star-3 predicate would say.
 */
export function evaluateStars(mission, summary) {
  const m = typeof mission === 'string' ? BY_ID[mission] : mission;
  const none = { stars: 0, earned: [false, false, false], aliveCostFrac: 0, win: false };
  if (!m || !summary || summary.kind !== 'battle_end') return none;
  if (summary.mission && summary.mission !== m.id) return none;
  if (summary.win !== true || summary.draw === true) return none;
  const start = summary.playerCostStart > 0 ? summary.playerCostStart : 1;
  const frac = aliveCost(summary) / start;
  const t = m.stars[2] && m.stars[2].test;
  const earned = [true, frac >= 0.5, !t || !!t(summary, m)];
  return { stars: earned.filter(Boolean).length, earned, aliveCostFrac: frac, win: true };
}

// ------------------------------------------------------------------------------------------------------------------------------ progress helpers
/** Accepts {stars:{id:n}}, {missions:{id:{stars}}} or the plain stars map. */
export function starsOf(progress) {
  if (!progress || typeof progress !== 'object') return {};
  if (progress.stars && typeof progress.stars === 'object') return progress.stars;
  if (progress.missions && typeof progress.missions === 'object') { const o = {}; for (const k of Object.keys(progress.missions)) o[k] = progress.missions[k].stars | 0; return o; }
  return progress;
}
export const totalStarsOf = (progress) => { const s = starsOf(progress); let n = 0; for (const m of MISSIONS) n += Math.max(0, Math.min(3, s[m.id] | 0)); return n; };
const asMission = (x) => (typeof x === 'string' ? BY_ID[x] || null : x || null);

export const campaignApi = {
  missions: MISSIONS,
  missionById: (id) => BY_ID[id] || null,
  /** First unlocked, not yet cleared mission (null when every mission has at least one star). */
  nextMission(progress) { const s = starsOf(progress); for (const m of MISSIONS) if ((s[m.id] | 0) < 1) return campaignApi.isUnlocked(m, progress) ? m : null; return null; },
  starsFor(summary, mission) { return evaluateStars(mission, summary).stars; },
  evaluateStars, hash: missionHash,
  /** Mutator ids unlocked by `totalStars` campaign stars, in unlock order. */
  unlockedMutators(totalStars) { return MUTATOR_ORDER.filter((id) => MUTATOR_STARS[id] <= (totalStars | 0)); },
  /** Mutators a clear announces: those whose threshold lies in (before, after]. */
  newlyUnlocked(before, after) { return MUTATOR_ORDER.filter((id) => MUTATOR_STARS[id] > (before | 0) && MUTATOR_STARS[id] <= (after | 0)); },
  /** Missions unlock in order: the first is open, the next opens with >= 1 star on its predecessor. */
  isUnlocked(mission, progress) {
    const m = asMission(mission); if (!m) return false;
    if (m.index === 0) return true;
    const prev = MISSIONS[m.index - 1];
    return ((starsOf(progress)[prev.id]) | 0) >= 1;
  },
  /** Result of a clear: new best stars, the mutators and parts it announces. before/after are star counts of this mission. */
  rewardsFor(mission, beforeProgress, summary) {
    const m = asMission(mission), ev = evaluateStars(m, summary), s = starsOf(beforeProgress);
    const had = s[m.id] | 0, now = Math.max(had, ev.stars), tb = totalStarsOf(beforeProgress), ta = tb - had + now;
    return { stars: ev.stars, best: now, improved: now > had, totalBefore: tb, totalAfter: ta, mutators: campaignApi.newlyUnlocked(tb, ta), parts: ev.stars >= 1 && had < 1 ? m.rewards.unlockParts.slice() : [], title: ev.stars >= 1 ? m.rewards.title : null, firstClear: ev.stars >= 1 && had < 1 };
  },
  arena: missionArena, rules: missionRules, setup: setupMission, forces: enemyForces, objective: objectiveSpec, marker: markerOf, summaryOf: battleSummary,
  teachingBeats: (id) => (BY_ID[id] && BY_ID[id].teaching ? TEACHING_BEATS : []),
  teachingSkip: TEACHING_SKIP,
};

/** What COORD wires to ctx.content.campaign. */
export const CAMPAIGN = { acts: ACTS, missions: MISSIONS, puzzles: PUZZLES, order: MISSION_ORDER, api: campaignApi };
export { validateMission, validatePuzzle, OBJECTIVE_TYPES, MARKER_TYPES, missionArena, missionRules, setupMission, enemyForces, objectiveSpec, markerOf, battleSummary, MissionRuntime, MissionTracker, ScriptedWaves, layoutGroups, UNLOCKS, REWARD_PARTS };
export default CAMPAIGN;
