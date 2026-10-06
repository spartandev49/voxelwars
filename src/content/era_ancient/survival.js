// Survival (spec/world.md section 7, owner: CAMPAIGN). The wave table and the score/leaderboard rules as PURE functions over sim/waves.js (which owns the
// WaveSystem that spawns the waves in a World). Nothing here touches storage: the leaderboard is device-local data the app keeps under `vw.survival`
// ({best, board}), these functions only compute the next value. No network, no Date, no Math.random.
//
//   survivalWave(n, seed, o?)      -> {n, name, budget, boss, bossCost, style, groups, cost, count, reinforce}   (the composition WaveSystem.compose(n) builds)
//   waveTable(count, seed)         -> rows of survivalWave (docs / tests / the setup screen)
//   playerPotential(n)             -> the most a player can have fielded at the start of wave n (start budget + every reinforcement, no losses)
//   survivalScore(run)             -> waves*1000 + kills*10 + remaining cost
//   recordRun(prev, entry)         -> {state:{best, board}, rank, newBest}   (local top five, ties keep the older entry first)
//   survivalRules(rules)           -> the Rules to hand to `new World` for kind 'survival' (rules.waves switches the WaveSystem on, an endless survive_waves objective, no time limit)
import { generateArmy } from '../../sim/armygen.js';
import { buildSimDefs } from '../../sim/defs.js';
import { waveBudget, reinforceBudget, waveStyle, isBossWave, bossOf, waveName } from '../../sim/waves.js';

export { waveBudget, reinforceBudget, waveStyle, isBossWave, bossOf, waveName };
export const SURVIVAL = { start: 6000, every: 40, bonusBase: 1600, bonusPer: 240, bossEvery: 5, enemyBase: 2400, enemyPer: 900, topN: 5, cap: 300 };
export const BOSS_IDS = ['minotaur', 'cyclops', 'war_elephant', 'medusa', 'pharaoh'];

let _defs = null;
const defsOr = (d) => d || _defs || (_defs = buildSimDefs());

/**
 * Wave n (1-based) of a run with `seed`: the same generator call as WaveSystem.compose(n) (seed * 131 + n), so the table the screens show and the army that
 * spawns are identical. `o.against` = the player's alive counts {defId:n} (used by the 'counter' style); `o.difficulty` 'easy'|'normal'|'hard'.
 */
export function survivalWave(n, seed, o = {}) {
  const defs = defsOr(o.defs);
  if (!(n >= 1) || n !== Math.floor(n)) throw new Error('survivalWave: n must be a positive integer, got ' + n);
  const budget = waveBudget(n), boss = isBossWave(n) ? bossOf(n) : null, bossCost = boss ? defs[boss].cost : 0;
  const army = generateArmy({ faction: o.faction || 'mixed', budget: budget - bossCost, style: waveStyle(n), difficulty: o.difficulty || 'normal', against: o.against || {}, defs, seed: (seed || 1) * 131 + n, cap: SURVIVAL.cap });
  const groups = army.groups.slice();
  if (boss) groups.push({ defId: boss, n: 1 });
  let count = 0; for (const g of groups) count += g.n;
  return { n, name: waveName(n), budget, boss, bossCost, style: waveStyle(n), groups, cost: army.cost + bossCost, count, reinforce: reinforceBudget(n) };
}

export function waveTable(count, seed, o = {}) { const rows = []; for (let n = 1; n <= count; n++) rows.push(survivalWave(n, seed, o)); return rows; }

/** Cumulative budget a player could have fielded at the start of wave n if nothing ever died: start + the reinforcement after each cleared wave. */
export function playerPotential(n) { let b = SURVIVAL.start; for (let k = 1; k < n; k++) b += reinforceBudget(k); return b; }

export function survivalScore(run) { return Math.round((run.waves | 0) * 1000 + (run.kills | 0) * 10 + (run.remainingCost || 0)); }

/**
 * Insert a finished run into the local top five. prev = {best, board:[{score, waves, date, arena}]} (or null). entry = {score, waves, date, arena}.
 * Higher score first; equal scores keep the older entry above the new one. Returns {state, rank (1-based, 0 when it missed the board), newBest}.
 */
export function recordRun(prev, entry) {
  const board = prev && Array.isArray(prev.board) ? prev.board.map((e) => Object.assign({}, e)) : [];
  const e = { score: Math.max(0, Math.round(entry.score || 0)), waves: Math.max(0, entry.waves | 0), date: String(entry.date || ''), arena: String(entry.arena || '') };
  let at = board.length; for (let i = 0; i < board.length; i++) if (e.score > board[i].score) { at = i; break; }
  board.splice(at, 0, e);
  const top = board.slice(0, SURVIVAL.topN), rank = at < SURVIVAL.topN ? at + 1 : 0;
  const prevBest = prev && prev.best ? prev.best | 0 : 0;
  return { state: { best: Math.max(prevBest, e.score), board: top }, rank, newBest: e.score > prevBest };
}

/** Rules for `new World` in a Survival battle (UI sets rules.survival; the sim switches on with rules.waves). */
export function survivalRules(rules = {}, o = {}) {
  // the endless run is a survive_waves objective that never completes: it is what keeps the battle alive while the field is empty between waves
  // (World._checkEnd lets an objective block the elimination end; without it the first cleared wave would end the run as a victory)
  const objective = { id: 'survive_waves', type: 'survive_waves', params: { waves: 1e9 }, markerIds: [], playerTeam: 0 };
  return Object.assign({}, rules, { waves: { faction: o.faction || 'mixed', interval: o.interval || SURVIVAL.every, autoAdvance: o.autoAdvance !== false }, timeLimit: 0, objective, budget: SURVIVAL.start, survival: true });
}

/** Budget a player may place for the next wave: the first wave uses the start budget, later waves the reinforcement of the cleared wave. */
export function placementBudget(nextWave) { return nextWave <= 1 ? SURVIVAL.start : reinforceBudget(nextWave - 1); }
