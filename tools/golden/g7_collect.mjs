// G7 collector (docs/eras/spec/VF.md 3.6.2): the content generators of the Ancient era, frozen.
//   (1) 48 generateArmy tuples (composition and placements hashes)            (2) counterTable(defs)
//   (3) 20 scoutReport cases from frozen literal compositions                  (4) survival: the first 12 waves for 20 seeds (survivalWave)
//   (5) dailyPlan(key) for 400 dates from 2026-01-01 (+ dailyEnemy for every 10th)
// `g7Inputs(T)` builds the INPUTS from a tree (baseline when recording); `g7Run(T, inputs)` runs them on a tree. The record stores the inputs, and the test
// replays the RECORDED inputs on the live tree, with the defs restricted to the recorded 43 Ancient ids, so new eras (more units, factions, arenas,
// mutators in the live lists) cannot move it: only a change of the Ancient generators or Ancient stats can.
//
// Choice of the 48 tuples (a deliberate reading of "every 45th of 8 factions x 6 styles x 3 difficulties x 3 budgets x 5 seeds = 2160"): taking every 45th index
// of the nested loop would always land on the same (difficulty, budget, seed) corner, because 45 = 3 x 3 x 5. Instead each of the 48 (faction, style) pairs gets
// ONE (difficulty, budget, seed) cell chosen by the stride-7 walk j = 7k mod 45 (7 and 45 are coprime, so the first 45 pairs hit all 45 cells exactly once and the
// last 3 repeat the first three). Tuples with style 'counter' or difficulty 'hard' carry a frozen `against` army so the counter-pick branch runs.
import { openTree } from './tree.mjs';
import { sha256, sha12, norm } from './common.mjs';
import { canonicalJSON } from '../lib/records.mjs';

export const G7_STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];
export const G7_DIFFICULTIES = ['easy', 'normal', 'hard'];
export const G7_BUDGETS = [1500, 6000, 12000];
export const G7_SEEDS = [1, 2, 3, 4, 5];
export const G7_ARENA = { recipe: 'marathon', size: 'medium', seed: 5 };
export const G7_AGAINST = { hoplite: 40, peltast: 12, cretan_archer: 12, companion_cavalry: 10 };
export const G7_WAVE_SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
export const G7_WAVES = 12;
export const G7_DATE_START = '2026-01-01';
export const G7_DATES = 400;

/** The 20 frozen scout cases: [name, myCounts, enemyCounts]. Together they must produce every scout code (checked by the recorder and by the test). */
export const G7_SCOUTS = [
  ['mass_hoplites_vs_nothing', { hoplite: 50 }, {}],
  ['cavalry_only_vs_nothing', { companion_cavalry: 20 }, {}],
  ['archers_only_vs_nothing', { cretan_archer: 40 }, {}],
  ['archers_vs_cavalry', { cretan_archer: 40, hoplite: 6 }, { companion_cavalry: 20, equites: 10 }],
  ['hoplites_vs_cavalry', { hoplite: 40, peltast: 8 }, { companion_cavalry: 20, equites: 10 }],
  ['mixed_vs_cavalry_wall', { hoplite: 6, cretan_archer: 20, philosopher: 3 }, { cataphract: 14, camel_rider: 10 }],
  ['hoplites_vs_archers', { hoplite: 40 }, { cretan_archer: 40, nubian_archer: 20 }],
  ['legion_vs_ballistae', { legionary: 40, gladiator: 6 }, { ballista: 6, catapult: 4 }],
  ['hoplites_vs_siege_and_archers', { hoplite: 50, spartan: 5 }, { catapult: 5, ballista: 4, cretan_archer: 20 }],
  ['hoplites_vs_minotaurs', { hoplite: 30, peltast: 10 }, { minotaur: 4 }],
  ['archers_vs_medusa_cyclops', { cretan_archer: 30, philosopher: 4 }, { medusa: 3, cyclops: 1 }],
  ['balanced_vs_balanced', { hoplite: 20, cretan_archer: 12, companion_cavalry: 5, philosopher: 3 }, { legionary: 20, pilum_thrower: 12, equites: 5, senator: 3 }],
  ['balanced_vs_nothing', { hoplite: 20, cretan_archer: 12, companion_cavalry: 5, philosopher: 3 }, {}],
  ['elite_few', { spartan: 12, strategos: 1, priest_of_ra: 2 }, { legionary: 30 }],
  ['egyptian_vs_roman_cav', { khopesh_warrior: 20, nubian_archer: 20, priest_of_ra: 4 }, { equites: 18, centurion: 2 }],
  ['persian_vs_greek', { immortal: 24, sparabara: 20, xerxes: 1 }, { hoplite: 30, spartan: 6, peltast: 10 }],
  ['barbarian_horde', { berserker: 30, axe_thrower: 20, chieftain: 2 }, { war_elephant: 1, minotaur: 2, hoplite: 10 }],
  ['animals_and_chickens', { warhound: 10, battle_goat: 6, sacred_chicken: 16 }, { cretan_archer: 20, ballista: 2 }],
  ['trojan_horse_and_cavalry', { trojan_horse: 1, companion_cavalry: 6, hannibal: 1 }, { catapult: 3, nubian_archer: 20, camel_rider: 6 }],
  ['one_support_blob', { medjay: 40, mummy: 10, anubis_guard: 6, pharaoh: 1 }, { sparabara: 30, pilum_thrower: 20, ballista: 3 }],
];

const pick = (obj, ids) => { const o = Object.create(null); for (const id of ids) { if (!(id in obj)) throw new Error('G7: unit def missing: ' + id); o[id] = obj[id]; } return o; };
const comp = (groups) => groups.map((g) => `${g.defId}:${g.n}`).join(',');
/** Insertion order is part of an object's meaning (float sums run in key order) but canonical JSON sorts keys, so recorded inputs keep maps as [key, value] pairs. */
const pairs = (o) => Object.entries(o);
const fromPairs = (a) => { const o = {}; for (const [k, v] of a) o[k] = v; return o; };
const slim = (o) => JSON.parse(JSON.stringify(o));     // only used for objects that are JSON-clean by construction (reports, plans)

/** Inputs as recorded: everything the run needs from the tree's live lists, frozen. */
export async function g7Inputs(T) {
  const [Defs, Stats, Arenas, Mut] = await Promise.all([T.src('defs'), T.src('stats'), T.src('arenas'), T.src('mutators')]);
  const unitIds = Object.keys(Defs.buildSimDefs());
  const factions = [...Object.keys(Stats.FACTIONS), 'mixed'];
  return norm({
    unitIds, factions, styles: G7_STYLES, difficulties: G7_DIFFICULTIES, budgets: G7_BUDGETS, seeds: G7_SEEDS, arena: G7_ARENA, against: pairs(G7_AGAINST),
    scouts: G7_SCOUTS.map(([name, mine, enemy]) => ({ name, mine: pairs(mine), enemy: pairs(enemy) })),
    waveSeeds: G7_WAVE_SEEDS, waves: G7_WAVES, dates: { start: G7_DATE_START, n: G7_DATES },
    content: { arenas: Arenas.ARENAS.map((a) => ({ id: a.id, name: a.name, size: a.size })), mutators: Mut.MUTATORS.map((m) => ({ id: m.id })), factions: Object.entries(Stats.FACTIONS).map(([id, f]) => [id, { name: f.name }]) },
  });
}

/** The 48 tuple descriptors of the recorded inputs, in order. */
export function armyTuples(inputs) {
  const out = [];
  let k = 0;
  for (const faction of inputs.factions) for (const style of inputs.styles) {
    const j = (7 * k) % 45;
    const difficulty = inputs.difficulties[Math.floor(j / 15)], budget = inputs.budgets[Math.floor(j / 5) % 3], seed = inputs.seeds[j % 5];
    out.push({ faction, style, difficulty, budget, seed, team: k % 2, against: style === 'counter' || difficulty === 'hard' });
    k++;
  }
  return out;
}

export async function g7Run(T, inputs) {
  const [Defs, Gen, Army, Surv, Daily] = await Promise.all(['defs', 'gen', 'armygen', 'survival', 'daily'].map((k) => T.src(k)));
  const defs = pick(Defs.buildSimDefs(), inputs.unitIds);
  const arena = Gen.generateArena(inputs.arena.recipe, inputs.arena.size, inputs.arena.seed);

  const armies = armyTuples(inputs).map((t) => {
    const army = Army.generateArmy({ faction: t.faction, budget: t.budget, style: t.style, difficulty: t.difficulty, seed: t.seed, defs, arena, team: t.team, against: t.against ? fromPairs(inputs.against) : undefined });
    return {
      key: `${t.faction}/${t.style}/${t.difficulty}/${t.budget}/${t.seed}/t${t.team}${t.against ? '/vs' : ''}`,
      composition: comp(army.groups), compositionSha: sha12(canonicalJSON(norm(army.groups))), placementsSha: sha12(canonicalJSON(norm(army.placements.map((p) => ({ ...p })))) ),
      placements: army.placements.length, cost: army.cost, total: army.total, types: army.types,
    };
  });

  const ct = Army.counterTable(defs);
  const ctRows = {};
  for (const id of Object.keys(ct)) ctRows[id] = `counters=${ct[id].counters.join('+')} prey=${ct[id].prey.join('+')} strong=${ct[id].strong ? 1 : 0}`;
  const counterTable = { sha256: sha256(canonicalJSON(norm(Object.fromEntries(Object.keys(ct).map((id) => [id, { counters: ct[id].counters, prey: ct[id].prey, strong: ct[id].strong }]))))), units: Object.keys(ct).length, rows: ctRows };

  const scouts = inputs.scouts.map((s) => {
    const rep = Army.scoutReport(defs, fromPairs(s.mine), fromPairs(s.enemy));
    return { name: s.name, codes: rep.map((r) => r.code).join(','), sha: sha12(canonicalJSON(norm(slim(rep)))) };
  });

  const waves = {};
  for (const seed of inputs.waveSeeds) {
    const rows = [], cost = [], count = [];
    for (let n = 1; n <= inputs.waves; n++) { const w = Surv.survivalWave(n, seed, { defs }); rows.push(sha12(canonicalJSON(norm(slim(w))))); cost.push(w.cost); count.push(w.count); }
    waves[String(seed)] = { sha256: sha256(rows.join('\n')), rows, cost, count };
  }

  const content = { arenas: inputs.content.arenas, mutators: inputs.content.mutators, factions: fromPairs(inputs.content.factions) };
  const dates = [], enemies = [];
  for (let i = 0; i < inputs.dates.n; i++) {
    const key = Daily.addDays(inputs.dates.start, i);
    const plan = Daily.dailyPlan(key, content);
    dates.push([key, sha12(canonicalJSON(norm(slim(plan)))), `${plan.arenaId}|${plan.factionA}|${plan.factionB}|${plan.enemyStyle}|${plan.mutator || '-'}`]);
    if (i % 10 === 0) { const e = Daily.dailyEnemy(plan, defs); enemies.push([key, comp(e.groups), e.cost]); }
  }
  return { armies, counterTable, scouts, waves, dailyPlans: { sha256: sha256(dates.map((d) => d.join(' ')).join('\n')), rows: dates }, dailyEnemies: enemies };
}

export async function collectG7(root) {
  const T = await openTree(root, { regime: 'baked' });
  const inputs = JSON.parse(canonicalJSON(await g7Inputs(T)));       // exactly what the record will hold (sorted keys), so the recorder and the test run identical inputs
  const results = await g7Run(T, inputs);
  const codes = new Set(results.scouts.flatMap((s) => (s.codes ? s.codes.split(',') : [])));
  const need = ['no_anti_cav', 'exposed_archers', 'no_ranged', 'no_cavalry', 'siege_exposed', 'blob_vs_ranged', 'monster_incoming', 'no_support', 'one_note'];
  const lacking = need.filter((c) => !codes.has(c));
  if (lacking.length) throw new Error('G7: the 20 scout cases do not produce these scout codes: ' + lacking.join(', '));
  return { data: { inputs, ...results } };
}
