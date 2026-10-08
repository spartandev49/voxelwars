// G6 collector (docs/eras/spec/VF.md 3.6.2 and 3.7, PC-3): the 9 Ancient campaign missions at seed 1 with an EXPLICIT frozen deployment each, and the 6 puzzle
// solutions, fought to the end in the real sim.
//   mission battle = exactly tests/campaign/_lib.mjs runMission(m, 'counter', 1) with the army taken from the frozen record instead of botGroups():
//     World({arena: missionArena(m), seed: 1, rules: missionRules(m), defs}) + setupMission + addPlacements(0, frozen placements) + start(), tick until
//     'ended' or time > timeLimit + 40 (then end(-1, 'time')); summary = battleSummary, stars = evaluateStars.
//   puzzle battle = runPuzzle(p, p.solution.placements): seed = the puzzle's arena seed, rules godPowers off, tick until 'ended' or time > timeLimit + 20.
// The harness workaround of tests/campaign/_lib.mjs:12 (trojan_horse siege = false) is NOT applied (measured: mission 7 seed 1 runs without it, VF 3.6.2);
// tests/baseline/harness_workarounds.json lists it so none can be added.
// Per battle: result {win, draw, t, stars, earned, endReason, spent, tickN, alive, dead, kills}, the legacy World.stateHash chain every 300 ticks
// (tests/golden/legacy_hash.mjs, the frozen body), the statwalk chain at the same ticks (tests/golden/v8_fields.json lists), and the final legacy hash.
// `g6Inputs(T)` freezes the deployments from a tree (the baseline when recording); `g6Run(T, inputs)` fights them on a tree (the baseline when recording,
// this repository when testing). The record stores the inputs, so the test replays the RECORDED deployments and a new era cannot move it.
//
// Deployment of the 9 missions: groups = botGroups(m, 'counter', 1): mission.reference (7 missions: the authored deployment, with its `order`s) or, for
// marathon_sort_of and cyclops_meet which have none (PC-3), the generated counter-pick frozen here; placements = layoutArmy(groups, zones A/B, defs, {seed: 1})
// with the reference orders applied. Both groups and placements are stored; the test checks the layout separately (label `layout`) so a layoutArmy change is
// named as such and the battle itself still replays from the stored placements.
import { openTree } from './tree.mjs';
import { canonicalJSON } from '../lib/records.mjs';
import { legacyStateHash } from '../../tests/golden/legacy_hash.mjs';
import { statwalk } from '../lib/statwalk.mjs';

export const G6_SEED = 1;
export const G6_CHAIN_EVERY = 300;
export const MISSION_EXTRA_S = 40, PUZZLE_EXTRA_S = 20;
const r3 = (v) => Math.round(v * 1000) / 1000;

const pl = (p) => ({ defId: p.defId, x: p.x, z: p.z, heading: p.heading, ...(p.squadId !== undefined ? { squadId: p.squadId } : {}), ...(p.formation !== undefined ? { formation: p.formation } : {}), ...(p.order !== undefined ? { order: p.order } : {}) });

/** Everything the run needs from the tree's modules. */
async function load(T) {
  const [world, campaign, puzzles, armygen, defsMod] = await Promise.all([T.src('world'), T.src('campaign'), T.src('puzzles'), T.src('armygen'), T.src('defs')]);
  return { World: world.World, C: campaign, P: puzzles, A: armygen, defs: defsMod.buildSimDefs() };
}

/** The enemy's whole unit list over the mission (placed army + scripted waves): what a scout report shows (_lib.mjs enemyAll). */
function enemyAll(m) {
  const g = (m.enemy.groups || []).map((x) => ({ defId: x.defId, n: x.n }));
  const ws = m.script && m.script.waves ? m.script.waves.list : [];
  for (const w of ws) for (const x of w.groups) g.push({ defId: x.defId, n: x.n });
  return g;
}
/** botGroups(m, 'counter', seed) of tests/campaign/_lib.mjs, verbatim in effect (the 'counter' kind only). */
function counterGroups(L, m, seed) {
  if (m.reference) return m.reference.map((g) => ({ defId: g.defId, n: g.n }));
  const core = (m.core || []).map((c) => ({ defId: c.defId, n: c.n }));
  const rest = Math.max(0, m.budget - L.A.groupsCost(core, L.defs));
  const army = L.A.generateArmy({ faction: m.roster ? 'mixed' : m.playerFaction, budget: rest, style: 'counter', difficulty: 'hard', against: enemyAll(m), ids: m.roster || undefined, seed: seed * 101 + 7, defs: L.defs, cap: 300 });
  const by = new Map();
  for (const g of core.concat(army.groups)) by.set(g.defId, (by.get(g.defId) || 0) + g.n);
  return Array.from(by, ([defId, n]) => ({ defId, n }));
}
function layout(L, m, groups, seed) {
  const arena = L.C.missionArena(m);
  const orders = m.reference ? Object.fromEntries(m.reference.filter((g) => g.order).map((g) => [g.defId, g.order])) : null;
  let p = L.A.layoutArmy(groups, arena.zones.A, arena.zones.B, L.defs, { seed });
  if (orders) p = p.map((q) => (orders[q.defId] ? Object.assign({}, q, { order: orders[q.defId] }) : q));
  return p.map(pl);
}

/** Freeze the deployments: { seed, missions:[{id, index, hash, source, groups:[[defId,n]], placements:[..]}], puzzles:[{id, seed, placements:[..]}] }. */
export async function g6Inputs(T) {
  const L = await load(T);
  const missions = L.C.MISSIONS.map((m, i) => {
    const groups = counterGroups(L, m, G6_SEED);
    return { id: m.id, index: i + 1, hash: L.C.missionHash(m), source: m.reference ? 'reference' : 'counter_pick', groups: groups.map((g) => [g.defId, g.n]), placements: layout(L, m, groups, G6_SEED) };
  });
  const puzzles = L.P.PUZZLES.map((p) => {
    if (!p.solution || !Array.isArray(p.solution.placements)) throw new Error('G6: puzzle ' + p.id + ' has no stored solution');
    return { id: p.id, seed: p.arena.seed || 1, placements: p.solution.placements.map(pl) };
  });
  return { seed: G6_SEED, chainEvery: G6_CHAIN_EVERY, missions, puzzles };
}

function digestOf(w, summary, stars, extra) {
  return {
    result: { win: !!summary.win, draw: !!summary.draw, t: w.time, stars: stars.stars, earned: stars.earned, endReason: w.endReason, spent: summary.spent === undefined ? null : summary.spent, tickN: w.tickN,
      alive: [w.stats[0].alive, w.stats[1].alive], dead: [w.stats[0].dead, w.stats[1].dead], kills: [w.stats[0].kills, w.stats[1].kills] },
    ...extra,
  };
}
function fight(w, maxT, every) {
  const chain = [], walk = [];
  while (w.state !== 'ended' && w.time < maxT) {
    w.tick();
    if (w.tickN % every === 0) { chain.push(legacyStateHash(w)); walk.push(statwalk(w)); }
  }
  if (w.state !== 'ended') w.end(-1, 'time');
  return { chain, walk, final: legacyStateHash(w), stateHash: w.stateHash(), walkFinal: statwalk(w) };
}

/** Fight one frozen mission deployment -> digest. */
export function runMissionBattle(L, inp, rec) {
  const m = L.C.MISSIONS.find((x) => x.id === rec.id);
  if (!m) throw new Error('G6: mission ' + rec.id + ' is not in the tree');
  const arena = L.C.missionArena(m);
  const w = new L.World({ arena, seed: inp.seed, rules: Object.assign({}, L.C.missionRules(m)), defs: L.defs });
  const rt = L.C.setupMission(w, m, { seed: inp.seed });
  w.addPlacements(0, rec.placements.map((p) => Object.assign({}, p)), { defs: L.defs });
  w.start();
  const f = fight(w, (m.timeLimit || 360) + MISSION_EXTRA_S, inp.chainEvery);
  const summary = L.C.battleSummary(w, m, rt.tracker), stars = L.C.evaluateStars(m, summary);
  rt.destroy();
  return digestOf(w, summary, stars, f);
}
/** Fight one frozen puzzle solution -> digest. */
export function runPuzzleBattle(L, inp, rec) {
  const p = L.P.PUZZLES.find((x) => x.id === rec.id);
  if (!p) throw new Error('G6: puzzle ' + rec.id + ' is not in the tree');
  const m = L.P.puzzleAsMission(p), arena = L.C.missionArena(m);
  const w = new L.World({ arena, seed: rec.seed, rules: Object.assign({}, L.C.missionRules(m), { godPowers: !!p.godPowers }), defs: L.defs });
  const rt = L.C.setupMission(w, m, { seed: rec.seed });
  w.addPlacements(0, rec.placements.map((q) => Object.assign({}, q)), { defs: L.defs });
  w.start();
  const f = fight(w, p.timeLimit + PUZZLE_EXTRA_S, inp.chainEvery);
  const summary = L.C.battleSummary(w, m, rt.tracker), stars = L.P.evaluatePuzzleStars(p, summary);
  rt.destroy();
  return digestOf(w, summary, stars, f);
}

/** Layout check on a tree: does layoutArmy(groups) of the tree still give the stored placements? -> {id: bool} */
export function layoutMatches(L, inp) {
  const out = {};
  for (const rec of inp.missions) {
    const m = L.C.MISSIONS.find((x) => x.id === rec.id);
    out[rec.id] = !!m && canonicalJSON(layout(L, m, rec.groups.map(([defId, n]) => ({ defId, n })), inp.seed)) === canonicalJSON(rec.placements);
  }
  return out;
}

export async function openL(T) { return load(T); }

/** Run every frozen battle on the tree -> { results: {<id>: digest}, ms: {<id>: n}, hashes: {<id>: missionHash} }. */
export async function g6Run(T, inp, { only = null } = {}) {
  const L = await load(T), results = {}, ms = {};
  for (const rec of inp.missions) { if (only && !only.includes(rec.id)) continue; const t0 = performance.now(); results[rec.id] = runMissionBattle(L, inp, rec); ms[rec.id] = Math.round(performance.now() - t0); }
  for (const rec of inp.puzzles) { if (only && !only.includes(rec.id)) continue; const t0 = performance.now(); results[rec.id] = runPuzzleBattle(L, inp, rec); ms[rec.id] = Math.round(performance.now() - t0); }
  return { results, ms };
}

/** What the recorders store: inputs + results (+ the mission data hashes and the no-workaround statement). */
export async function collectG6(worktree, regime = 'baked') {
  const T = await openTree(worktree, { regime });
  const inputs = await g6Inputs(T);
  const run = await g6Run(T, inputs);
  const ids = [...inputs.missions.map((m) => m.id), ...inputs.puzzles.map((p) => p.id)];
  return { data: { inputs, order: ids, results: run.results, workaround: 'none' }, meta: { ms: run.ms } };
}
