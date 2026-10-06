// Headless campaign harness: scripted reference players (the three bots of spec/world.md section 6) fight a mission in the real sim and the result is
// scored with the mission's own stars. Shared by the feasibility runner, the campaign tests and the puzzle solver. Node only.
import { World } from '../../src/sim/world.js';
import { aiInfo } from '../../src/sim/ai.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { generateArmy, layoutArmy, groupsCost } from '../../src/sim/armygen.js';
import { MISSIONS, missionArena, missionRules, setupMission, battleSummary, evaluateStars } from '../../src/content/era_ancient/campaign.js';
import { PUZZLES, puzzleAsMission, evaluatePuzzleStars } from '../../src/content/era_ancient/puzzles.js';

export const defs = buildSimDefs();
// SIM bug (docs/requests/campaign_sim_bugs.md #1): a siege unit without a ranged weapon crashes breachBehaviour. Harness-only workaround so the missions can be measured.
if (defs.trojan_horse && !defs.trojan_horse.ranged) aiInfo(defs.trojan_horse).siege = false;
export { MISSIONS };
const arenaCache = new Map();
export function arenaOf(m) { let a = arenaCache.get(m.id); if (!a) { a = missionArena(m); arenaCache.set(m.id, a); } return a; }

/** Every group of the enemy over the whole mission (placed army + scripted waves): what a scout report shows. */
export function enemyAll(m) {
  const g = (m.enemy.groups || []).map((x) => ({ defId: x.defId, n: x.n }));
  const ws = m.script && m.script.waves ? m.script.waves.list : [];
  for (const w of ws) for (const x of w.groups) g.push({ defId: x.defId, n: x.n });
  return g;
}

/**
 * The player's army for a bot. kinds: 'counter' (counter-pick against the full enemy list), 'greedy' (spend everything on a random composition, every squad
 * advances), 'turtle' (balanced composition, every squad holds; on a hold_hill mission it forms up on the hill, on any other it holds for 25 s and then advances), 'melee' (infantry and heroes only, no ranged: the friendly-fire-safe army), 'raid' (the rush
 * style: fast cavalry and beasts, for the missions with a time star).
 * `core` units the mission asks for (the Trojan horse, elephants, Spartans) are always bought first.
 */
export function botGroups(m, kind, seed) {
  const core = (m.core || []).map((c) => ({ defId: c.defId, n: c.n }));
  const spent = groupsCost(core, defs);
  const rest = Math.max(0, m.budget - spent);
  const ids = m.roster ? m.roster.filter((id) => !core.some((c) => c.defId === id) || true) : null;
  const style = kind === 'counter' ? 'counter' : kind === 'greedy' ? 'chaos' : kind === 'raid' ? 'rush' : 'balanced';
  let pool = ids;
  if (kind === 'melee' && ids) pool = ids.filter((id) => defs[id].role === 'melee' || defs[id].role === 'hero');
  const army = generateArmy({ faction: m.roster ? 'mixed' : m.playerFaction, budget: rest, style, difficulty: kind === 'counter' ? 'hard' : 'normal', against: kind === 'counter' ? enemyAll(m) : undefined, ids: pool || undefined, seed: seed * 101 + 7, defs, cap: 300 });
  const by = new Map();
  for (const g of core.concat(army.groups)) by.set(g.defId, (by.get(g.defId) || 0) + g.n);
  return Array.from(by, ([defId, n]) => ({ defId, n }));
}

/**
 * God-power play of the 'expert' bots: Zeus lightning and meteors on the densest enemy cluster whenever they are ready (a human has six powers and uses
 * them; the three scripted bots of the bands do not). Called every tick by the world's onTick chain.
 */
export function installPowers(w) {
  if (!w.godpowers) return;
  const prev = w.onTick; let next = 0;
  w.onTick = (ww, dt) => {
    if (prev) prev(ww, dt);
    if (ww.time < next || ww.state !== 'running') return;
    next = ww.time + 0.5;
    for (const power of ['meteor', 'zeus_lightning']) {
      if (!ww.godpowers.ready(power, 0)) continue;
      let best = null, bn = 0;
      for (let i = 0; i < ww.units.length; i += 2) {
        const u = ww.units[i]; if (!u.alive || u.team !== 1) continue;
        let c = 0; for (let k = 0; k < ww.units.length; k += 2) { const o = ww.units[k]; if (o.alive && o.team === 1 && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 < 25) c++; }
        if (c > bn) { bn = c; best = u; }
      }
      if (best && bn >= (power === 'meteor' ? 4 : 2)) ww.godpowers.cast(power, best.x, best.z, 0);
    }
  };
}

/** Build a ready world: arena, rules, enemy, fixed units, the bot's army. Returns {w, rt, groups}. */
export function buildMissionWorld(m, bot, seed, o = {}) {
  const arena = o.arena || arenaOf(m);
  const w = new World({ arena, seed, rules: Object.assign(missionRules(m), o.rules || {}), defs });
  const rt = setupMission(w, m, { seed });
  const groups = o.groups || botGroups(m, bot, seed);
  let pl = o.placements || layoutArmy(groups, arena.zones.A, arena.zones.B, defs, { seed });
  if (bot === 'turtle') pl = pl.map((p) => Object.assign({}, p, { order: 'hold' }));
  const squads = w.addPlacements(0, pl, { defs });
  // a turtle on a hold_hill mission forms up ON the hill (placement is only allowed in the zone, so it marches there once) and holds it
  if (bot === 'turtle' && m.objective.type === 'hold_hill') {
    const hill = (m.arena.markers || []).find((k) => k.type === 'hill');
    const front = squads.filter((sq) => sq.cls === 0 || sq.cls === 1 || sq.cls === 5), back = squads.filter((sq) => !(sq.cls === 0 || sq.cls === 1 || sq.cls === 5));    // squad classes: LINE, HERO, CAV hold the front, the rest stand behind
    const rank = (list, x) => list.forEach((sq, i) => { sq.order = 'move'; sq.moveTo = { x, z: hill.z + (i - (list.length - 1) / 2) * Math.min(3.2, 16 / Math.max(1, list.length)) }; });
    rank(front, hill.x + 1); rank(back, hill.x - 4);       // a line of squads across the pass, shooters behind the shields
  }
  // any other turtle holds its ground for 25 s (the sim's own watchdog would otherwise draw a hold-forever army) and then advances like everybody else
  if (bot === 'turtle' && m.objective.type !== 'hold_hill') {
    let released = false; const prev = w.onTick;
    w.onTick = (ww, dt) => { if (prev) prev(ww, dt); if (!released && ww.time >= 25) { released = true; for (const sq of ww.squads) if (sq.team === 0 && sq.order === 'hold' && !sq.units.some((u) => u.vip)) sq.order = 'advance'; } };
  }
  if (o.powers) installPowers(w);
  w.start();
  return { w, rt, groups, placements: pl };
}

/** Fight a mission to its end. Returns {win, t, reason, stars, earned, summary, cpuMs, groups}. */
export function runMission(m, bot, seed, o = {}) {
  const { w, rt, groups } = buildMissionWorld(m, bot, seed, o);
  const t0 = performance.now(), maxT = (m.timeLimit || 360) + 40;
  while (w.state !== 'ended' && w.time < maxT) {
    w.tick();
    if (o.every && w.tickN % o.every === 0) o.onSample && o.onSample(w, rt);
  }
  if (w.state !== 'ended') w.end(-1, 'time');
  const summary = battleSummary(w, m, rt.tracker);
  const ev = evaluateStars(m, summary);
  const r = { win: summary.win, draw: summary.draw, t: w.time, reason: w.endReason, stars: ev.stars, earned: ev.earned, summary, cpuMs: performance.now() - t0, groups, aliveCostFrac: ev.aliveCostFrac, alive: [w.stats[0].alive, w.stats[1].alive] };
  rt.destroy();
  return r;
}

/** Run n seeds of a bot; returns win rate and star counts. */
export function sweep(m, bot, n, o = {}) {
  const res = []; let wins = 0; const starHits = [0, 0, 0]; let t = 0, cpu = 0;
  for (let s = 1; s <= n; s++) {
    const r = runMission(m, bot, s + (o.seedBase || 0), o);
    res.push(r); if (r.win) { wins++; t += r.t; } cpu += r.cpuMs;
    for (let k = 0; k < 3; k++) if (r.earned[k]) starHits[k]++;
  }
  return { bot, n, wins, rate: wins / n, starHits, avgWinT: wins ? t / wins : 0, cpuMs: cpu, results: res };
}

// ------------------------------------------------------------------------------------------------ puzzles
const puzArena = new Map();
export function puzzleArena(p) { let a = puzArena.get(p.id); if (!a) { a = missionArena(puzzleAsMission(p)); puzArena.set(p.id, a); } return a; }

/** Build and start a puzzle world with the player's placements (records {defId, x, z, heading, squadId?, order?, formation?}). */
export function buildPuzzleWorld(p, placements, o = {}) {
  const m = puzzleAsMission(p), arena = puzzleArena(p);
  const w = new World({ arena, seed: o.seed || 1, rules: Object.assign(missionRules(m), { godPowers: !!p.godPowers }), defs });
  const rt = setupMission(w, m, { seed: o.seed || 1 });
  w.addPlacements(0, placements, { defs });
  w.start();
  return { w, rt, m };
}

/** Fight a puzzle to its end. Returns {win, t, reason, stars, earned, summary, spent}. */
export function runPuzzle(p, placements, o = {}) {
  const { w, rt, m } = buildPuzzleWorld(p, placements, o);
  const maxT = p.timeLimit + 20;
  while (w.state !== 'ended' && w.time < maxT) w.tick();
  if (w.state !== 'ended') w.end(-1, 'time');
  const summary = battleSummary(w, m, rt.tracker), ev = evaluatePuzzleStars(p, summary);
  rt.destroy();
  return { win: summary.win, t: w.time, reason: w.endReason, stars: ev.stars, earned: ev.earned, summary, spent: summary.spent, alive: [w.stats[0].alive, w.stats[1].alive] };
}
export { PUZZLES };
