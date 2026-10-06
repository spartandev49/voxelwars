#!/usr/bin/env node
// humor-sim: replays synthetic battle event logs through the announcer selector and reports repetition, frequency, coverage, voice share and gap stats.
// Usage: node tools/humor-sim.mjs [--minutes 60] [--speed 1|4|both] [--seed 7] [--stats veteran|novice] [--fresh] [--json]
//   --fresh    generate a new random battle script for every battle (default: replay 10 recorded scripts in random order, the harder case)
// Importable: runSimulation(opts) -> { lines, battles, metrics }, analyze(...), makeScript(...). tests/humor/sim.test.mjs asserts H1/H2/H3/H8 targets.
// Event names and payloads follow docs/spec.md 8.2. The generator is a small random battle-script writer, not the real sim.

import { createAnnouncer, CATEGORIES, categoryPriority, TEMPLATES } from '../src/content/era_ancient/humor/announcer.js';
import { RNG } from '../src/core/rng.js';

const MISSIONS = {
  marathon_sort_of: { arena: 'marathon', kind: 'line_battle' },
  thermopylae_snack: { arena: 'thermopylae', kind: 'line_battle' },
  pyramid_scheme: { arena: 'giza', kind: 'cavalry_clash' },
  nile_crossing: { arena: 'nile', kind: 'chaos' },
  alps_elephant: { arena: 'alpine', kind: 'mythic' },
  teutoburg_peekaboo: { arena: 'teutoburg', kind: 'line_battle' },
  troy_giftshop: { arena: 'troy', kind: 'siege' },
  cyclops_meet: { arena: 'cyclops', kind: 'mythic' },
  zeus_bad_day: { arena: 'olympus', kind: 'wine_party' },
};
const ARENAS = ['marathon', 'thermopylae', 'colosseum', 'nile', 'giza', 'persepolis', 'carthage', 'teutoburg', 'alpine', 'olympus', 'troy', 'styx', 'cyclops', 'oasis'];
const FACTIONS = ['Hellenes', 'Romans', 'Egyptians', 'Persians', 'Carthaginians', 'Barbarians', 'Mythic'];
const ROSTER = {
  line_battle: [['hoplite', 'cretan_archer', 'peltast', 'strategos', 'philosopher'], ['immortal', 'sparabara', 'cataphract', 'camel_rider', 'xerxes']],
  cavalry_clash: [['companion_cavalry', 'equites', 'hoplite', 'centurion'], ['cataphract', 'numidian', 'chariot_archer', 'medjay', 'pharaoh']],
  chaos: [['sacred_chicken', 'battle_goat', 'philosopher', 'senator', 'hoplite'], ['legionary', 'berserker', 'warhound', 'axe_thrower', 'druid']],
  siege: [['hoplite', 'trojan_horse', 'peltast', 'spartan'], ['catapult', 'ballista', 'legionary', 'centurion']],
  mythic: [['minotaur', 'medusa', 'war_elephant', 'centaur_archer', 'hoplite'], ['cyclops', 'legionary', 'pilum_thrower', 'hannibal', 'nubian_archer']],
  wine_party: [['hoplite', 'khopesh_warrior', 'priest_of_ra', 'gladiator'], ['legionary', 'immortal', 'berserker', 'mummy']],
  stalemate: [['hoplite', 'sparabara'], ['legionary', 'medjay']],
  blowout: [['spartan', 'hoplite', 'strategos'], ['peltast', 'cretan_archer', 'philosopher']],
  comeback: [['hoplite', 'spartan', 'cretan_archer', 'strategos'], ['immortal', 'legionary', 'anubis_guard', 'pharaoh']],
  hazards: [['spartan', 'hoplite', 'gladiator'], ['mummy', 'khopesh_warrior', 'medjay']],
};
const CAUSES_BY_KIND = {
  line_battle: ['melee', 'melee', 'melee', 'ranged', 'ranged', 'melee'],
  cavalry_clash: ['melee', 'melee', 'ranged', 'gore', 'melee'],
  chaos: ['melee', 'melee', 'ranged', 'melee'],
  siege: ['melee', 'melee', 'aoe', 'ranged', 'melee'],
  mythic: ['melee', 'gore', 'trample', 'magic', 'melee', 'aoe'],
  wine_party: ['melee', 'melee', 'ranged', 'magic', 'lightning'],
  stalemate: ['melee', 'ranged'],
  blowout: ['melee', 'melee', 'ranged', 'melee'],
  comeback: ['melee', 'melee', 'ranged', 'execute', 'melee'],
  hazards: ['melee', 'kick', 'melee', 'spikes', 'lava', 'fall', 'geyser', 'drown', 'kick'],
};

export const SCRIPT_KINDS = Object.keys(ROSTER);

/** Build one synthetic battle script. Times are battle seconds (sim time). */
export function makeScript(rng, kind, opts) {
  const o = opts || {};
  const mission = o.mission || null;
  const arena = mission ? MISSIONS[mission].arena : o.arena || rng.pick(ARENAS);
  const [rA, rB] = ROSTER[kind];
  const events = [];
  const E = (t, type, p) => events.push({ t, type, p: p || {} });
  const dur = kind === 'stalemate' ? 50 : kind === 'blowout' ? rng.range(25, 40) : kind === 'comeback' ? rng.range(120, 170) : kind === 'siege' ? rng.range(100, 150) : rng.range(60, 120);
  E(0, 'battle_start', { teams: 2 });
  const winnerRoll = rng.next();
  const winner = kind === 'stalemate' ? -1 : winnerRoll < (kind === 'blowout' ? 0.9 : 0.55) ? 0 : 1;
  // ---- kills ----
  const killCount = kind === 'stalemate' ? 3 : kind === 'blowout' ? rng.int(25, 40) : rng.int(30, 70);
  const stars = [1, 2, 3, 4].map((i) => ({ id: i, team: i % 2, def: (i % 2 ? rB : rA)[0], n: 0 }));
  const streakMarks = [3, 5, 7, 10, 14];
  let first = true;
  const times = [];
  for (let i = 0; i < killCount; i++) times.push(Math.max(1, Math.min(dur - 1, dur * (0.15 + 0.7 * (rng.next() + rng.next()) / 2))));
  times.sort((a, b) => a - b);
  const causes = CAUSES_BY_KIND[kind];
  const ids = { 0: 10, 1: 100 };
  for (const t of times) {
    const star = rng.chance(0.45) ? rng.pick(stars) : null;
    const srcTeam = star ? star.team : rng.int(0, 1);
    const dstTeam = 1 - srcTeam;
    const srcDef = star ? star.def : rng.pick(srcTeam ? rB : rA);
    const friendly = rng.chance(kind === 'chaos' ? 0.05 : 0.015);
    const dstDef = rng.pick(friendly ? (srcTeam ? rB : rA) : (dstTeam ? rB : rA));
    const cause = rng.pick(causes);
    const p = { src: star ? star.id : ids[srcTeam]++, dst: ids[dstTeam]++, srcDef, dstDef, srcTeam, dstTeam: friendly ? srcTeam : dstTeam, friendly, byPlayer: false, revived: false, cause, x: 0, y: 0, z: 0 };
    if (first) { first = false; if (rng.chance(0.5)) { E(t, 'first_blood'); E(t, 'unit_kill', p); } else { E(t, 'unit_kill', p); E(t, 'first_blood'); } } else E(t, 'unit_kill', p);
    if (star && !friendly) { star.n++; if (streakMarks.includes(star.n)) E(t + 0.01, 'kill_streak', { id: star.id, count: star.n, def: star.def }); }
    if (rng.chance(0.4)) { for (let k = 0; k < rng.int(3, 8); k++) E(t + k * 0.05, 'unit_hit', { src: 1, dst: 2, dmg: 10 }); }
  }
  // ---- swings, leads, low army ----
  const swingN = kind === 'stalemate' ? 0 : rng.int(2, 5);
  const side = ['left', 'right', 'center'];
  for (let i = 0; i < swingN; i++) {
    const t = rng.range(0.2, 0.85) * dur;
    const ratio = Math.exp(rng.range(-1.3, 1.3));
    E(t, 'big_swing', { team: rng.int(0, 1), ratio, flank: rng.pick(side), cluster: { x: 0, z: 0 } });
  }
  if (kind === 'comeback') {
    E(dur * 0.2, 'big_swing', { team: 1, ratio: 2.6, flank: 'left', cluster: { x: 0, z: 0 } });
    E(dur * 0.35, 'lead_change', { team: 1, ratio: 1.8 });
    E(dur * 0.6, 'big_swing', { team: 0, ratio: 2.4, flank: 'right', cluster: { x: 0, z: 0 } });
    E(dur * 0.62, 'lead_change', { team: 0, ratio: 1.6 });
  } else if (kind !== 'stalemate' && rng.chance(0.6)) E(rng.range(0.3, 0.8) * dur, 'lead_change', { team: rng.int(0, 1), ratio: rng.range(1.1, 2.2) });
  if (kind !== 'stalemate' && rng.chance(0.6)) E(rng.range(0.6, 0.9) * dur, 'army_low', { team: 1 - (winner < 0 ? 0 : winner), frac: rng.range(0.1, 0.25) });
  if (kind !== 'stalemate' && rng.chance(0.7)) { const t = rng.range(0.55, 0.9) * dur; for (let i = 0; i < rng.int(5, 9); i++) E(t + i * 0.3, 'unit_rout', { id: i, team: 1 - (winner < 0 ? 0 : winner) }); }
  if (rng.chance(0.45)) E(rng.range(0.3, 0.8) * dur, 'hero_down', { id: 3, def: rng.pick(['strategos', 'xerxes', 'pharaoh', 'centurion', 'hannibal']), team: rng.int(0, 1) });
  // ---- volleys, charges, siege, gags by kind ----
  const volleys = ['line_battle', 'cavalry_clash', 'comeback', 'siege', 'mythic'].includes(kind) ? rng.int(1, 3) : 0;
  for (let v = 0; v < volleys; v++) { const t = rng.range(0.1, 0.7) * dur; for (let i = 0; i < 20; i++) E(t + i * 0.05, 'projectile_launch', { kind: 'arrow', team: i % 2 }); }
  if (kind === 'cavalry_clash') { for (let i = 0; i < rng.int(2, 5); i++) E(rng.range(0.1, 0.5) * dur, 'charge_hit', { id: 5, dst: 6, mul: rng.range(0.8, 1) }); for (let i = 0; i < rng.int(1, 3); i++) E(rng.range(0.1, 0.5) * dur, 'unit_brace', { id: 7, dst: 8 }); }
  if (kind === 'chaos') {
    for (let i = 0; i < rng.int(1, 3); i++) E(rng.range(0.2, 0.8) * dur, 'chicken_tantrum');
    for (let i = 0; i < rng.int(1, 2); i++) E(rng.range(0.2, 0.8) * dur, 'philosopher_monologue');
    const ts = rng.range(0.3, 0.7) * dur; for (let i = 0; i < 5; i++) E(ts + i * 0.2, 'status_apply', { id: i, status: 'sleep' });
    if (rng.chance(0.7)) E(rng.range(0.3, 0.7) * dur, 'unit_convert', { id: 9, team: 0 });
    if (rng.chance(0.5)) E(rng.range(0.4, 0.8) * dur, 'unit_kill', { src: 20, dst: 21, srcDef: 'legionary', dstDef: 'hoplite', srcTeam: 0, dstTeam: 0, friendly: false, byPlayer: false, revived: false, cause: 'bribe', x: 0, y: 0, z: 0 });
    for (let i = 0; i < rng.int(2, 7); i++) E(rng.range(0.2, 0.9) * dur, 'unit_kill', { src: 30, dst: 31, srcDef: 'sacred_chicken', dstDef: rng.pick(['legionary', 'druid', 'berserker', 'axe_thrower']), srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: false, cause: 'melee', x: 0, y: 0, z: 0 });
    for (let i = 0; i < rng.int(2, 5); i++) E(rng.range(0.2, 0.9) * dur, 'unit_kill', { src: 40, dst: 41, srcDef: 'battle_goat', dstDef: rng.pick(['legionary', 'druid', 'berserker', 'warhound']), srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: false, cause: 'gore', x: 0, y: 0, z: 0 });
    if (rng.chance(0.4)) E(rng.range(0.5, 0.9) * dur, 'intervention', { kind: 'goat' });
  }
  if (kind === 'siege') {
    for (let i = 0; i < rng.int(5, 10); i++) E(rng.range(0.1, 0.9) * dur, 'explosion', { kind: 'boulder', x: 0, y: 0, z: 0, r: 4 });
    for (const t of ['wall_stone', 'tower', 'arch_gate', 'gate_door']) if (rng.chance(0.7)) E(rng.range(0.3, 0.9) * dur, 'prop_destroyed', { id: 1, type: t, x: 0, y: 0, z: 0, s: 1 });
    if (rng.chance(0.9)) E(rng.range(0.2, 0.9) * dur, 'catapult_misfire', { id: 11 });
    if (rng.chance(0.2)) E(rng.range(0.2, 0.9) * dur, 'unit_kill', { src: 11, dst: 12, srcDef: 'catapult', dstDef: 'hoplite', srcTeam: 1, dstTeam: 0, friendly: false, byPlayer: false, revived: false, cause: 'misfire', x: 0, y: 0, z: 0 });
    E(rng.range(0.3, 0.7) * dur, 'trojan_reveal');
  }
  if (kind === 'mythic') {
    E(rng.range(0.2, 0.6) * dur, 'stone_gaze', { src: 50, count: rng.int(3, 9) });
    for (let i = 0; i < rng.int(1, 4); i++) E(rng.range(0.3, 0.9) * dur, 'cyclops_misaim', { id: 51 });
    E(rng.range(0.3, 0.7) * dur, 'trample', { id: 52, count: rng.int(3, 8) });
    for (let i = 0; i < 3; i++) E(rng.range(0.4, 0.8) * dur + i * 0.1, 'status_apply', { id: 52, status: 'fire_panic' });
    if (rng.chance(0.9)) E(rng.range(0.2, 0.7) * dur, 'throne_sit');
    if (rng.chance(0.5)) E(rng.range(0.2, 0.7) * dur, 'unit_revive', { id: 61 });
    if (rng.chance(0.4)) E(rng.range(0.4, 0.9) * dur, 'unit_kill', { src: 62, dst: 61, srcDef: 'hoplite', dstDef: 'immortal', srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: true, cause: 'melee', x: 0, y: 0, z: 0 });
  }
  if (kind === 'wine_party') {
    const gp = ['wine_rain', 'meteor', 'earthquake', 'heal_wave', 'raise_chickens', 'zeus_lightning'];
    for (const k of rng.shuffle(gp.slice()).slice(0, rng.int(2, 4))) E(rng.range(0.1, 0.8) * dur, 'god_power', { kind: k, x: 0, z: 0, team: 0 });
    const tm = rng.range(0.3, 0.6) * dur;
    for (let i = 0; i < 12; i++) E(tm + i * 0.1, 'unit_kill', { src: 70, dst: 80 + i, srcDef: 'hoplite', dstDef: 'legionary', srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: false, cause: 'aoe', x: 0, y: 0, z: 0 });
    for (let w = 1; w <= 3; w++) E((w / 4) * dur, 'wave_spawn', { n: w, count: 12 });
  }
  if (kind === 'stalemate') {
    E(12, 'stalemate_warning', { t: 12 });
    E(30, 'intervention', { kind: 'zeus' });
    E(31, 'intervention', { kind: 'goat' });
    E(44, 'intervention', { kind: 'ragequit' });
  }
  if (kind === 'hazards') {
    for (let i = 0; i < 5; i++) E(rng.range(0.2, 0.9) * dur, 'ability_cast', { id: 90 + i, ability: 'kick', x: 0, z: 0, team: 0 });
  }
  // ---- cross-kind gags: real battles mix mechanics, so any archetype can contain a few ----
  if (kind !== 'stalemate' && kind !== 'chaos' && rng.chance(0.25)) E(rng.range(0.2, 0.8) * dur, 'chicken_tantrum');
  if (kind !== 'stalemate' && kind !== 'chaos' && rng.chance(0.25)) E(rng.range(0.2, 0.8) * dur, 'philosopher_monologue');
  if (kind !== 'stalemate' && kind !== 'chaos' && rng.chance(0.2)) { const ts = rng.range(0.3, 0.8) * dur; for (let i = 0; i < 4; i++) E(ts + i * 0.2, 'status_apply', { id: i, status: 'sleep' }); }
  if (kind !== 'mythic' && kind !== 'stalemate' && rng.chance(0.3)) { E(rng.range(0.2, 0.8) * dur, 'unit_revive', { id: 61 }); E(rng.range(0.5, 0.9) * dur, 'unit_kill', { src: 62, dst: 61, srcDef: 'hoplite', dstDef: 'immortal', srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: true, cause: 'melee', x: 0, y: 0, z: 0 }); }
  if (kind !== 'siege' && kind !== 'stalemate' && rng.chance(0.2)) E(rng.range(0.2, 0.9) * dur, 'prop_destroyed', { id: 1, type: rng.pick(['wall_stone', 'tower', 'column_marble', 'statue_lion']), x: 0, y: 0, z: 0, s: 1 });
  if (kind !== 'siege' && kind !== 'stalemate' && rng.chance(0.15)) E(rng.range(0.2, 0.9) * dur, 'explosion', { kind: 'boulder', x: 0, y: 0, z: 0, r: 4 });
  if (kind !== 'hazards' && kind !== 'stalemate' && rng.chance(0.2)) E(rng.range(0.2, 0.9) * dur, 'unit_kill', { src: 0, dst: 55, srcDef: null, dstDef: rng.pick(rA), srcTeam: 1, dstTeam: 0, friendly: false, byPlayer: false, revived: false, cause: rng.pick(['lava', 'spikes', 'geyser', 'drown', 'fall']), x: 0, y: 0, z: 0 });
  if (kind !== 'hazards' && kind !== 'stalemate' && rng.chance(0.2)) E(rng.range(0.2, 0.9) * dur, 'ability_cast', { id: 90, ability: 'kick', x: 0, z: 0, team: 0 });
  if (kind !== 'wine_party' && kind !== 'stalemate' && rng.chance(0.15)) E(rng.range(0.1, 0.8) * dur, 'god_power', { kind: rng.pick(['meteor', 'earthquake', 'heal_wave', 'wine_rain', 'raise_chickens', 'zeus_lightning']), x: 0, z: 0, team: 0 });
  if (kind !== 'mythic' && kind !== 'stalemate' && rng.chance(0.12)) E(rng.range(0.3, 0.8) * dur, 'trample', { id: 52, count: rng.int(3, 6) });
  if (kind !== 'mythic' && kind !== 'stalemate' && rng.chance(0.1)) E(rng.range(0.2, 0.8) * dur, 'throne_sit');
  if (kind !== 'stalemate' && rng.chance(0.15)) { const t = rng.range(0.2, 0.8) * dur; for (let i = 0; i < 4; i++) E(t + i * 0.1, 'unit_kill', { src: 70, dst: 90 + i, srcDef: 'hoplite', dstDef: 'legionary', srcTeam: 0, dstTeam: 1, friendly: false, byPlayer: false, revived: false, cause: 'melee', x: 0, y: 0, z: 0 }); }
  // ---- ending ----
  const reason = kind === 'stalemate' ? 'intervention' : rng.chance(0.2) ? 'time' : 'elimination';
  const perDef = { 0: {}, 1: {} };
  const wTeam = winner < 0 ? 0 : winner;
  const wRoster = wTeam ? rB : rA;
  if (winner >= 0) for (const d of wRoster) perDef[wTeam][d] = rng.int(0, 12);
  perDef[wTeam][wRoster[0]] = Math.max(1, perDef[wTeam][wRoster[0]] || 1);
  if (kind === 'chaos' && winner === 1 && rng.chance(0.5)) perDef[1].sacred_chicken = rng.int(1, 4);
  if (kind === 'chaos' && winner === 0) perDef[0].sacred_chicken = rng.int(1, 4);
  E(dur + 0.5, 'battle_end', { winner, reason, t: dur, stats: {}, perDef: winner < 0 ? { 0: {}, 1: {} } : perDef });
  if (mission && rng.chance(0.5)) E(dur * 0.5, 'objective_update', { id: 'main', state: 'running', progress: 0.5 });
  for (const e of events) if (e.type !== 'battle_end') e.t = Math.min(e.t, dur);
  events.sort((a, b) => a.t - b.t);
  return { kind, mission, arena, duration: dur + 0.5, factions: [rng.pick(FACTIONS), rng.pick(FACTIONS)], events };
}

/** 10 recorded logs: one per archetype (campaign variants are generated on top when `campaign` is true). */
export function recordedLogs(seed) {
  const r = new RNG(seed || 1);
  return SCRIPT_KINDS.map((k, i) => makeScript(r.fork('log' + i), k));
}

function veteran() { return { battles: 40, wins: 22, losses: 16, draws: 2, kills: 640, friendlyKills: 12, kicks: 22, chickenKills: 12, chickenDefeats: 1, goatKills: 8, zeusRagequits: 1, playSeconds: 0 }; }
function novice() { return { battles: 0, wins: 0, losses: 0, draws: 0, kills: 0, friendlyKills: 0, kicks: 0, chickenKills: 0, chickenDefeats: 0, goatKills: 0, zeusRagequits: 0, playSeconds: 0 }; }

/** Mirrors the accumulation rules of docs/lifetime_stats.md that the announcer callbacks read. */
function accumulate(S, type, p) {
  if (type === 'battle_end') {
    S.battles++; S.playSeconds += p.t || 0;
    if (p.winner === 0) S.wins++;
    else if (p.winner === 1) { S.losses++; if (p.perDef && p.perDef[1] && p.perDef[1].sacred_chicken > 0) S.chickenDefeats++; } else { S.draws++; if (p.reason === 'intervention') S.zeusRagequits++; }
  } else if (type === 'unit_kill' && p.srcTeam === 0) {
    if (p.friendly) S.friendlyKills++;
    else {
      S.kills++;
      if (p.srcDef === 'sacred_chicken') S.chickenKills++;
      if (p.srcDef === 'battle_goat') S.goatKills++;
      if (p.cause === 'kick') S.kicks++;
    }
  }
}

function pct(arr, q) { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; }

/**
 * runSimulation({ minutes=60, speed=1, seed=7, stats:'veteran'|'novice', fresh=false, menuGap=45, tick=0.25 })
 * Runs battles back to back until `minutes` of wall time. Between battles `menuGap` seconds pass (placement, results screen).
 */
export function runSimulation(opts) {
  const o = Object.assign({ minutes: 60, speed: 1, seed: 7, stats: 'veteran', fresh: false, menuGap: 45, tick: 0.25 }, opts || {});
  const rng = new RNG(o.seed);
  const stats = o.stats === 'novice' ? novice() : veteran();
  const ann = createAnnouncer({ rng: new RNG(o.seed ^ 0x51ed), stats });
  const logs = recordedLogs(o.seed + 100);
  let bag = [];
  const draw = () => { if (!bag.length) bag = rng.shuffle(logs.slice()); return bag.pop(); };
  const limit = o.minutes * 60;
  const lines = [];
  const battles = [];
  let wall = 0;
  const collect = (bi) => { let l; while ((l = ann.nextLine())) lines.push(Object.assign({ battle: bi, speed: o.speed }, l)); };
  const advance = (sec, bi) => { let left = sec; while (left > 1e-9) { const d = Math.min(o.tick, left); ann.tick(d); wall += d; left -= d; collect(bi); } };
  let bi = 0;
  const missionIds = Object.keys(MISSIONS);
  while (wall < limit) {
    let script;
    if (bi % 3 === 2) { const m = missionIds[(bi / 3 | 0) % missionIds.length]; script = makeScript(rng.fork('m' + bi), MISSIONS[m].kind, { mission: m }); }
    else if (o.fresh) script = makeScript(rng.fork('b' + bi), rng.pick(SCRIPT_KINDS));
    else script = draw();
    const ctx = { speed: o.speed, arena: script.arena, factions: script.factions, playerTeam: 0, mission: script.mission };
    const startIdx = lines.length;
    let prevT = 0;
    for (const e of script.events) {
      if (wall >= limit) break;
      advance(Math.max(0, (e.t - prevT) / o.speed), bi);
      prevT = e.t;
      if (e.type === 'battle_end') accumulate(stats, e.type, e.p);
      else if (e.type === 'unit_kill') accumulate(stats, e.type, e.p);
      ann.onEvent(e.type, e.p, ctx);
      collect(bi);
    }
    advance(Math.min(15, Math.max(0, limit - wall)), bi);      // results screen: chains finish, last lines land
    battles.push({ index: bi, kind: script.kind, mission: script.mission, lines: lines.length - startIdx, duration: script.duration, wall: script.duration / o.speed });
    advance(Math.min(o.menuGap, Math.max(0, limit - wall)), bi);
    bi++;
  }
  return { lines, battles, stats, options: o, metrics: analyze(lines, battles, o), debug: ann.debug() };
}

export function analyze(lines, battles, o) {
  const speed = (o && o.speed) || 1;
  const m = {};
  m.total = lines.length;
  m.perMinute = lines.length / (((o && o.minutes) || 60));
  // repetition within 5 minutes (by line id)
  let rep = 0;
  const lastAt = new Map();
  for (const l of lines) { const prev = lastAt.get(l.id); if (prev !== undefined && l.at - prev <= 300) rep++; lastAt.set(l.id, l.at); }
  m.repeatRate5 = lines.length ? rep / lines.length : 0;
  // per-line histogram
  const hist = new Map();
  for (const l of lines) hist.set(l.id, (hist.get(l.id) || 0) + 1);
  const top = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
  m.maxShare = lines.length ? top[0][1] / lines.length : 0;
  m.topLines = top.slice(0, 6).map(([id, n]) => ({ id, n, share: n / lines.length }));
  m.distinctLines = hist.size;
  // coverage
  const seenCats = new Set(lines.map((l) => l.cat));
  const ran = new Set(battles.map((b) => b.mission).filter(Boolean));
  const reachable = CATEGORIES.filter((c) => (speed <= 2 || categoryPriority(c) >= 4) && (c.indexOf('campaign_') !== 0 || ran.has(c.slice(9))));
  m.categories = { total: reachable.length, hit: reachable.filter((c) => seenCats.has(c)).length, missing: reachable.filter((c) => !seenCats.has(c)) };
  // voices
  const v = { brutus: 0, plato: 0, cassandra: 0 };
  for (const l of lines) v[l.who]++;
  m.voiceShare = { brutus: v.brutus / lines.length, plato: v.plato / lines.length, cassandra: v.cassandra / lines.length };
  // lines per battle
  const per = battles.filter((b) => b.wall >= 20).map((b) => b.lines);
  m.linesPerBattle = { mean: per.length ? per.reduce((a, b) => a + b, 0) / per.length : 0, p10: pct(per, 0.1), p90: pct(per, 0.9), min: Math.min(...per), max: Math.max(...per), n: per.length };
  // gaps and rule violations
  const gaps = [];
  let gapViol = 0, sameVoice = 0, beatErr = 0, lowAtFast = 0, recency = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (speed > 2 && l.pri < 4) lowAtFast++;
    if (i > 0) {
      const p = lines[i - 1];
      const g = l.at - p.at;
      if (l.head) {
        gaps.push(g);
        const need = l.pri >= 5 ? 1.5 : 3.5;
        if (g < need - 1e-6) gapViol++;
        if (p.who === l.who && p.battle === l.battle) sameVoice++;
      } else if (Math.abs(g - 1.1) > 1e-6) beatErr++;
    }
    for (let k = Math.max(0, i - 14); k < i; k++) if (lines[k].id === l.id) { recency++; break; }
  }
  m.gap = { min: gaps.length ? Math.min(...gaps) : 0, p5: pct(gaps, 0.05), mean: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0, p95: pct(gaps, 0.95) };
  m.violations = { gap: gapViol, sameVoice, chainBeat: beatErr, recency, lowPriorityAtFast: lowAtFast };
  m.avgSecondsPerLine = lines.length ? (((o && o.minutes) || 60) * 60) / lines.length : 0;
  const bt = battles.reduce((a, b) => a + b.wall, 0), bl = battles.reduce((a, b) => a + b.lines, 0);
  m.inBattleSecondsPerLine = bl ? bt / bl : 0;
  m.chains = lines.filter((l) => l.chain && l.head).length;
  return m;
}

export function formatReport(res) {
  const m = res.metrics, o = res.options;
  const f = (x, d = 1) => (x * 100).toFixed(d) + '%';
  const out = [];
  out.push(`humor-sim  ${o.minutes} min at ${o.speed}x  seed ${o.seed}  stats ${o.stats}  ${o.fresh ? 'fresh scripts' : 'recorded logs'}  battles ${res.battles.length}`);
  out.push(`  lines ${m.total}  (${m.perMinute.toFixed(2)}/min, one per ${m.avgSecondsPerLine.toFixed(1)} s overall, one per ${m.inBattleSecondsPerLine.toFixed(1)} s in battle)  distinct ${m.distinctLines} of ${TEMPLATES.length} templates  chains ${m.chains}`);
  out.push(`  repeats within 5 min   ${f(m.repeatRate5)}   (target < 8%)`);
  out.push(`  top line share         ${f(m.maxShare, 2)}   (target <= 4%)   ${m.topLines.map((t) => `${t.id} ${f(t.share, 2)}`).join(', ')}`);
  out.push(`  categories hit         ${m.categories.hit}/${m.categories.total}   ${m.categories.missing.length ? 'missing: ' + m.categories.missing.join(', ') : 'all'}`);
  out.push(`  voice share            brutus ${f(m.voiceShare.brutus)}  plato ${f(m.voiceShare.plato)}  cassandra ${f(m.voiceShare.cassandra)}   (target 25-45% each)`);
  out.push(`  lines per battle       mean ${m.linesPerBattle.mean.toFixed(1)}  p10 ${m.linesPerBattle.p10}  p90 ${m.linesPerBattle.p90}  min ${m.linesPerBattle.min}  max ${m.linesPerBattle.max}`);
  out.push(`  gap between speakers   min ${m.gap.min.toFixed(2)} s  p5 ${m.gap.p5.toFixed(2)}  mean ${m.gap.mean.toFixed(1)}  p95 ${m.gap.p95.toFixed(1)}`);
  out.push(`  rule violations        gap ${m.violations.gap}  same-voice ${m.violations.sameVoice}  chain-beat ${m.violations.chainBeat}  recency ${m.violations.recency}  low-priority-at-fast ${m.violations.lowPriorityAtFast}`);
  return out.join('\n');
}

// ---------------- CLI ----------------
const isMain = import.meta.url === new URL(process.argv[1] || '', 'file://').href;
if (isMain) {
  const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : def; };
  const minutes = Number(arg('minutes', 60));
  const seed = Number(arg('seed', 7));
  const stats = arg('stats', 'veteran');
  const fresh = process.argv.includes('--fresh');
  const speeds = arg('speed', 'both') === 'both' ? [1, 4] : [Number(arg('speed', 1))];
  const results = speeds.map((speed) => runSimulation({ minutes, speed, seed, stats, fresh }));
  if (process.argv.includes('--json')) console.log(JSON.stringify(results.map((r) => ({ options: r.options, metrics: r.metrics })), null, 1));
  else for (const r of results) {
    console.log(formatReport(r) + '\n');
    if (process.argv.includes('--debug')) { const d = r.debug; const cats = Array.from(new Set(Object.keys(d.offered))).sort(); console.log('  category            offered  spoken  expired  no-line'); for (const c of cats) { const spoken = r.lines.filter((l) => l.cat === c && l.head).length; console.log('  ' + c.padEnd(26) + String(d.offered[c]).padStart(5) + String(spoken).padStart(8) + String(d.expired[c] || 0).padStart(9) + String(d.noLine[c] || 0).padStart(9)); } console.log(''); }
  }
}
