// Puzzle Challenges (spec/world.md section 6a, ui.md section 4a.2; owner: CAMPAIGN). Six hand-authored battles: a hand-placed enemy, a restricted roster,
// a small budget, no mutators, free retries, the same placement always gives the same battle (the sim is deterministic).
// Each puzzle carries a SOLUTION: the exact placement that wins it, found by the headless sim (tests/campaign/solve_puzzles.mjs) and replayed by
// tests/campaign/puzzles.test.mjs. Copy: titles are the frozen spec titles; blurb/hint/star labels here are short function-only labels, HUMOR may
// override any of them through humor/ (puzzleText(id, map) merges a {id: {title, blurb, hint, stars:[...]}} map when one exists).
//
//   PUZZLES                          the six definitions (frozen ids and goal types: spear_wall, kiting_101, elephant_room, knock_knock, goat_logistics, gaze_avoidance)
//   evaluatePuzzleStars(p, summary)  -> {stars, earned:[win, par, bonus]}   pure, over the BattleSummary (+ tracker extras)
//   puzzleAsMission(p)               -> a mission-shaped def the campaign runtime (campaign_run.js setupMission/missionRules/battleSummary) can run
//   puzzleApi = {puzzleById, evaluate, asMission, text}
import { STAT_TABLE } from './stats.js';

const PI = Math.PI;
const cost = (id) => (STAT_TABLE[id] ? STAT_TABLE[id].cost : 0);

/** A squad of `n` identical enemy placements on a grid around (cx, cz), facing west (towards the player), all in one squad so they charge as a block. */
function block(defId, n, cx, cz, o = {}) {
  const cols = o.cols || Math.ceil(Math.sqrt(n)), sp = o.spacing || 1.5, out = [];
  for (let i = 0; i < n; i++) out.push({ defId, x: cx + Math.floor(i / cols) * sp * (o.dirx || 1), z: cz + ((i % cols) - (cols - 1) / 2) * sp, heading: o.heading !== undefined ? o.heading : -PI / 2, order: o.order || 'advance', squadId: o.squad || 1, formation: 'block' });
  return out;
}

const RAW = [
  {
    id: 'spear_wall', title: 'Please Hold Still',
    blurb: 'Ten cavalry charge the line. Spears stop horses, but only spears that stand still.', hint: 'Put the hoplites in one tight line facing the charge and keep them on Hold. Peltasts go behind the line.',
    goalText: 'Defeat all ten cavalry',
    arena: { recipe: 'marathon', size: 'medium', seed: 11, env: {}, markers: [] },
    player: { faction: 'hellenes', roster: ['hoplite', 'peltast'], budget: 1400 }, par: 1000,
    enemy: { faction: 'hellenes', placements: block('companion_cavalry', 10, 30, 0, { cols: 5, spacing: 2.2, order: 'advance' }) },
    goal: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 180, godPowers: false,
    bonus: { id: 'few_losses', text: 'Lose at most 2 units', test: (s) => (s.unitsLost | 0) <= 2 },
  },
  {
    id: 'kiting_101', title: 'Kiting for Beginners',
    blurb: 'Eight mummies walk slower than any archer. Shoot, step back, repeat.', hint: 'Spread the archers along your back edge and stay out of reach: the mummies are slower than every archer, so the archers can keep backing away while they shoot.',
    goalText: 'Defeat all eight mummies',
    arena: { recipe: 'oasis', size: 'small', seed: 15, env: {}, markers: [] },
    player: { faction: 'hellenes', roster: ['cretan_archer', 'peltast'], budget: 1200 }, par: 900,
    enemy: { faction: 'egyptians', placements: block('mummy', 8, 22, 0, { cols: 4, spacing: 1.7, order: 'advance' }) },
    goal: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 150, godPowers: false,
    bonus: { id: 'no_losses', text: 'Lose no unit', test: (s) => (s.unitsLost | 0) === 0 },
  },
  {
    id: 'elephant_room', title: 'The Elephant in the Room',
    blurb: 'One war elephant and six hoplites. Elephants are afraid of fire.', hint: 'Fire arrows from the Nubian archers make an elephant panic and trample its own side. Keep spears in front of the archers.',
    goalText: 'Defeat the elephant and its escort',
    arena: { recipe: 'marathon', size: 'medium', seed: 11, env: {}, markers: [] },
    player: { faction: 'mixed', roster: ['hoplite', 'peltast', 'nubian_archer'], budget: 2000 }, par: 1600,
    enemy: { faction: 'carthage', placements: [].concat(block('war_elephant', 1, 30, 0, { cols: 1, squad: 1 }), block('hoplite', 6, 27, 0, { cols: 6, spacing: 1.5, squad: 2 })) },
    goal: { type: 'eliminate', params: {}, markerIds: [] }, timeLimit: 180, godPowers: false,
    bonus: { id: 'elephant_fast', text: 'Elephant down within 45 seconds', test: (s) => { const e = s.enemyDownT && s.enemyDownT.war_elephant; return !!e && e.length > 0 && e[0] <= 45; } },
  },
  {
    id: 'knock_knock', title: 'Knock Knock',
    blurb: 'Eight defenders wait behind the gate. The gate is made of wood.', hint: 'Catapults outrange everything on the wall. Park them back, guard them with hoplites, and shell both gate doors.',
    goalText: 'Destroy both gate doors in 120 seconds',
    arena: { recipe: 'troy', size: 'large', seed: 12, env: {}, markers: [] },
    player: { faction: 'mixed', roster: ['catapult', 'hoplite', 'peltast'], budget: 1500 }, par: 1200,
    enemy: { faction: 'hellenes', placements: block('hoplite', 8, 17, 0, { cols: 2, spacing: 1.5, order: 'hold' }).map((p, i) => Object.assign(p, { squadId: 1 + (i >> 2) })) },
    goal: { type: 'destroy', params: { props: [{ type: 'gate_door', count: 2 }] }, markerIds: [] }, timeLimit: 120, godPowers: false,
    bonus: { id: 'gate_fast', text: 'First gate door down within 70 seconds', test: (s) => { const g = s.propDownT && s.propDownT.gate_door; return !!g && g.length > 0 && Math.min.apply(null, g) <= 70; } },
  },
  {
    id: 'goat_logistics', title: 'Goat Logistics',
    blurb: 'Walk one goat across the Nile. Twelve barbarians would like a word with it.', hint: 'The goat leaves when the way is clear. Kill the axe throwers before they reach the ford and keep the berserkers off the goat.',
    goalText: 'Get the goat to the far bank',
    arena: { recipe: 'nile', size: 'medium', seed: 4, env: {}, markers: [{ id: 'goat_start', type: 'vip_start', x: -24, z: -22, r: 3 }, { id: 'far_bank', type: 'exit', x: 8, z: 12, r: 4 }] },
    player: { faction: 'hellenes', roster: ['hoplite', 'peltast', 'cretan_archer'], budget: 1000 }, par: 700,
    fixed: [{ defId: 'battle_goat', marker: 'goat_start', vip: true, heading: PI / 2, name: 'The Goat', def: { melee: null, abilities: [], ai: { style: 'hold' } } }],
    enemy: { faction: 'barbarians', placements: [].concat(block('axe_thrower', 8, 19, 17, { cols: 4, spacing: 1.8, squad: 1, heading: -2.36 }), block('berserker', 4, 23, 21, { cols: 4, spacing: 1.5, squad: 2, heading: -2.36 })) },
    goal: { type: 'protect_vip', params: { time: 120, reachOnly: true }, markerIds: ['goat_start', 'far_bank'], binding: true }, timeLimit: 150, godPowers: false,
    script: { vipMarch: { to: 'far_bank', delay: 8, clear: 12 } },
    bonus: { id: 'goat_untouched', text: 'The goat takes no damage', test: (s) => s.vipDef === 'battle_goat' && s.vipDamage === 0 },
  },
  {
    id: 'gaze_avoidance', title: 'Do Not Look Directly',
    blurb: 'Medusa turns whoever she faces to stone, at short range. Her five guards do not.', hint: 'Her gaze reaches 14 units. Archers shoot from further away than that, and cavalry can run past her guards.',
    goalText: 'Kill Medusa',
    arena: { recipe: 'oasis', size: 'small', seed: 15, env: {}, markers: [{ id: 'medusa_start', type: 'general_spawn', x: 23, z: 0, r: 3 }] },
    player: { faction: 'hellenes', roster: ['cretan_archer', 'peltast', 'companion_cavalry'], budget: 1100 }, par: 800,
    enemy: { faction: 'mythic', generals: ['medusa'], placements: [{ defId: 'medusa', x: 23, z: 0, heading: -PI / 2, order: 'hold', squadId: 1 }].concat(block('immortal', 5, 20, 0, { cols: 5, spacing: 1.6, order: 'advance', squad: 2 })) },
    goal: { type: 'kill_general', params: {}, markerIds: ['medusa_start'] }, timeLimit: 150, godPowers: false,
    bonus: { id: 'no_stone', text: 'Nobody turned to stone', test: (s) => (s.stonedUnits | 0) === 0 },
  },
];

// ------------------------------------------------------------------------------------------------------------------------------ assembly
function build(raw, i) {
  const p = {
    id: raw.id, kind: 'puzzle', index: i, title: raw.title, blurb: raw.blurb, hint: raw.hint, goalText: raw.goalText, arena: raw.arena, player: raw.player, par: raw.par,
    enemy: raw.enemy, goal: raw.goal, timeLimit: raw.timeLimit, godPowers: raw.godPowers, fixed: raw.fixed || [], script: raw.script || null,
    stars: [{ id: 'win', text: 'Win' }, { id: 'par', text: 'Spend ' + raw.par.toLocaleString('en-US') + ' drachmae or less', test: (s, pz) => (s.spent !== undefined ? s.spent : s.playerCostStart) <= pz.par }, { id: raw.bonus.id, text: raw.bonus.text, test: raw.bonus.test }],
    budget: raw.player.budget, solution: null,
  };
  return p;
}
export const PUZZLES = RAW.map(build);
const BY_ID = Object.fromEntries(PUZZLES.map((p) => [p.id, p]));

/**
 * Stars of a finished puzzle: 1 win, 2 win while spending <= par, 3 the puzzle's own bonus. Independent achievements of a WON battle (a lost puzzle earns
 * nothing), `stars` is how many were earned.
 */
export function evaluatePuzzleStars(puzzle, summary) {
  const p = typeof puzzle === 'string' ? BY_ID[puzzle] : puzzle;
  const none = { stars: 0, earned: [false, false, false] };
  if (!p || !summary || summary.kind !== 'battle_end') return none;
  if (summary.mission && summary.mission !== p.id) return none;
  if (summary.win !== true || summary.draw === true) return none;
  const earned = [true, !!p.stars[1].test(summary, p), !!p.stars[2].test(summary, p)];
  return { stars: earned.filter(Boolean).length, earned };
}

/** A mission-shaped view of a puzzle for the campaign runtime (arena, hand-placed enemy, objective, VIP script, rules). */
export function puzzleAsMission(p) {
  return {
    id: p.id, kind: 'puzzle', index: p.index, act: 0, title: p.title, arena: p.arena, playerFaction: p.player.faction, roster: p.player.roster, budget: p.player.budget, par: p.par,
    core: [], fixed: p.fixed, enemy: { faction: p.enemy.faction, placements: p.enemy.placements, generals: p.enemy.generals || [], difficulty: 'normal' },
    objective: Object.assign({}, p.goal), timeLimit: p.timeLimit, friendlyFire: false, godPowers: !!p.godPowers, script: p.script, stars: p.stars, rules: [],
  };
}

/** Merge HUMOR's optional {id: {title, blurb, hint, stars:[a,b,c]}} map over the function-only labels (the data is never mutated). */
export function puzzleText(id, map) {
  const p = BY_ID[id]; if (!p) return null;
  const h = (map && map[id]) || {};
  return { title: h.title || p.title, blurb: h.blurb || p.blurb, hint: h.hint || p.hint, goalText: h.goalText || p.goalText, stars: p.stars.map((s, k) => ({ id: s.id, text: (h.stars && h.stars[k]) || s.text })) };
}

export const puzzleApi = { puzzles: PUZZLES, puzzleById: (id) => BY_ID[id] || null, evaluate: evaluatePuzzleStars, asMission: puzzleAsMission, text: puzzleText, cost: (ids) => ids.reduce((s, id) => s + cost(id), 0) };
export default PUZZLES;
