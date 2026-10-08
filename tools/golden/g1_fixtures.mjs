// G1 fixture production (docs/eras/spec/VF.md 3.6.1): builds the five frozen input documents of the sim matrix FROM THE BASELINE worktree
// (explicit placements, carrier ids, input logs, event field lists), so that no later change of armygen, the registry or the defs can hide behind
// "faction mixed". Pure function of the baseline: `makeFixtures(B)` called twice gives equal documents (the recorder checks that).
//
//   g1_matrix.json     the 83 cases (id, group, arena, seed, rules, army set, input log, cap), the 12-case core, hashing parameters, frozen event field lists
//   g1_placements.json army sets: the six arena armies (generateArmy mixed balanced 6000, seeds 9 and 10, cap 300), the two armies with a hero added
//                      for the possession logs, the stalemate hold armies
//   g1_kinds.json      group D: carrier def per projectile kind (first def in sorted id order) and the 14 v 14 placements
//   g1_abilities.json  groups E and F: carrier def per ability (first in sorted id order), the 10 mixed targets, the 10 v 10 placements
//   g1_inputs.json     group G: tick-stamped input logs {tick, cmd} in the shape World.record writes
//
// Deliberate deviations from the VF text, each listed in docs/eras/spec/VF-impl.md:
//   - the generated "mixed balanced 6000" armies contain no hero (measured on all six arenas), so the possess/combined logs use the arena army
//     plus ONE frozen strategos at the army centre (sets `marathon+hero`, `troy+hero`); "the first hero of team 0" is then that unit.
//   - H-waves uses the shape of survivalRules() (src/content/era_ancient/survival.js) with 3 waves: a survive_waves objective keeps the battle alive between waves.
//   - "id order" of the carrier choice is the sorted-id order of the defs (the registry order is not sorted and not part of any contract).
export const PROJECTILE_KINDS = ['javelin', 'arrow', 'pilum', 'bolt', 'coin', 'sunbeam', 'scepter', 'boulder', 'francisca', 'thunderbolt'];
export const HOOKING_ABILITIES = ['breaks_shield', 'bribe', 'chain_lightning', 'fire_every', 'hook', 'misaim', 'misfire', 'poison'];
export const OTHER_ABILITIES = ['stance', 'kick', 'cc_field', 'aura', 'net', 'crowd_favorite', 'execute', 'heal_pulse', 'dot_cloud', 'revive', 'throne', 'fire_panic', 'rage', 'pack_bonus', 'war_horn', 'dash', 'summon_on_death', 'tantrum', 'cluck'];
export const ARENAS = ['marathon', 'thermopylae', 'troy', 'styx', 'alpine', 'oasis'];
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const MUTATOR_CASES = ['big_heads', 'tiny_titans', 'moon_gravity', 'chicken_rain', 'wine_rain_always', 'friendly_fire_fiesta', 'speedy_soldiers', 'ragdoll_frenzy', 'glass_cannons'];
export const RULE_CASES = [['friendly_fire', { friendlyFire: true }], ['morale_off', { morale: false }], ['nokite', { noKite: true }], ['rain', { weather: 'rain' }], ['storm', { weather: 'storm' }], ['snow', { weather: 'snow' }], ['sandstorm', { weather: 'sandstorm' }], ['fog', { weather: 'fog' }]];
export const INPUT_CASES = ['zeus_lightning', 'meteor', 'earthquake', 'heal_wave', 'wine_rain', 'raise_chickens', 'orders', 'possess', 'combined'];
export const TARGET_DEFS = ['hoplite', 'spartan', 'peltast', 'cretan_archer', 'companion_cavalry', 'legionary', 'gladiator', 'immortal', 'berserker', 'anubis_guard'];
export const CORE_IDS = ['A-marathon-normal', 'A-thermopylae-hard', 'A-troy-normal', 'A-styx-normal', 'A-alpine-easy', 'A-oasis-normal', 'B-glass_cannons', 'C-rain', 'D-boulder', 'E-chain_lightning', 'G-meteor', 'G-combined'];
export const PARAMS = { cap: 6000, abilityCap: 1500, chainEvery: 100, walkEvery: 300, arenaSize: 'medium', arenaSeed: 5, armyBudget: 6000, armyStyle: 'balanced', armyCap: 300 };

const HALF_PI = Math.PI / 2;

/** A block of `n` units of one def in `cols` files and as many ranks as needed, front rank at x = frontX, ranks stepping away from the enemy. side: -1 team A (west), +1 team B. */
function block(defId, n, cols, frontX, side, step = 2.4, squadId = 1, order = 'advance') {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rank = Math.floor(i / cols), col = i % cols;
    out.push({ defId, x: round(frontX + side * rank * step), z: round((col - (cols - 1) / 2) * step), heading: side < 0 ? HALF_PI : -HALF_PI, squadId, formation: 'block', order });
  }
  return out;
}
const round = (v) => Math.round(v * 1e6) / 1e6;

export async function makeFixtures(B) {
  const { H } = B;
  const AG = await B.imp('src/sim/armygen.js');
  const EV = await B.imp('src/core/events.js');
  const ids = Object.keys(H.DEFS).sort();

  // ---- hashing parameters and the frozen event field lists (the baseline EVENTS table)
  const eventFields = {}; for (const k of Object.keys(EV.EVENTS).sort()) eventFields[k] = EV.EVENTS[k].slice();

  // ---- arena army sets
  const sets = {};
  for (const arena of ARENAS) {
    const a = H.getArena(arena, PARAMS.arenaSize, PARAMS.arenaSeed);
    const [pa, pb] = [0, 1].map((t) => AG.generateArmy({
      faction: 'mixed', budget: PARAMS.armyBudget, style: PARAMS.armyStyle, seed: 9 + t, cap: PARAMS.armyCap,
      arena: a, zone: a.zones[t ? 'B' : 'A'], enemyZone: a.zones[t ? 'A' : 'B'], team: t, defs: H.DEFS,
    }).placements);
    sets[arena] = { a: pa, b: pb };
  }
  for (const arena of ['marathon', 'troy']) {
    const a = H.getArena(arena, PARAMS.arenaSize, PARAMS.arenaSeed), zx = a.zones.A.x + 6;
    const hero = { defId: 'strategos', x: round(zx), z: 0, heading: HALF_PI, squadId: 99, formation: 'line', order: 'advance' };
    sets[arena + '+hero'] = { a: [...sets[arena].a, hero], b: sets[arena].b };
  }
  // stalemate: two hold armies 70 u apart on the flat arenalab. Mummies (speed 1.9, melee) close the gap so slowly after the forced advance at 18 s that the
  // first blow lands after the zeus stage at 30 s: warning (12 s), forced advance (18 s) and the zeus intervention (30 s) all happen before the fighting starts.
  const holdA = block('mummy', 14, 7, -35, -1, 2.4, 1, 'hold');
  const holdB = block('mummy', 14, 7, 35, 1, 2.4, 1, 'hold');
  sets.stalemate = { a: holdA, b: holdB };
  const placements = { sets, note: 'generateArmy(mixed balanced 6000, seeds 9 and 10, cap 300) per arena, frozen; +hero adds one strategos; stalemate = two armies of 14 mummies on hold 70 u apart' };

  // ---- group D: projectile kinds
  const byKind = {};
  for (const id of ids) { const d = H.DEFS[id]; if (d.ranged && d.ranged.proj && !byKind[d.ranged.proj]) byKind[d.ranged.proj] = id; }
  const kinds = { kinds: {}, opponent: 'hoplite', note: 'carrier = first def (sorted id order) whose ranged.proj is the kind; 14 carriers vs 14 hoplites 30 u apart on arenalab' };
  for (const k of PROJECTILE_KINDS) {
    if (!byKind[k]) throw new Error('no def with ranged.proj ' + k);
    kinds.kinds[k] = { carrier: byKind[k], a: block(byKind[k], 14, 7, -15, -1), b: block('hoplite', 14, 7, 15, 1) };
  }
  const extra = Object.keys(byKind).filter((k) => !PROJECTILE_KINDS.includes(k));
  if (extra.length) throw new Error('projectile kinds not covered by group D: ' + extra.join(', '));

  // ---- groups E and F: abilities
  const byAbil = {};
  for (const id of ids) for (const ab of H.DEFS[id].abilities || []) if (!byAbil[ab.id]) byAbil[ab.id] = id;
  const all = [...HOOKING_ABILITIES, ...OTHER_ABILITIES];
  const missing = Object.keys(byAbil).filter((a) => !all.includes(a)), absent = all.filter((a) => !byAbil[a]);
  if (missing.length || absent.length) throw new Error(`ability coverage mismatch: not listed ${missing.join(',')}, no carrier ${absent.join(',')}`);
  const targets = (side) => TARGET_DEFS.map((d, i) => ({ defId: d, x: round(side * (15 + 2.4 * Math.floor(i / 5))), z: round(((i % 5) - 2) * 2.4), heading: side < 0 ? HALF_PI : -HALF_PI, squadId: i + 1, formation: 'block', order: 'advance' }));
  const abilities = { abilities: {}, targets: TARGET_DEFS.slice(), note: 'carrier = first def (sorted id order) with the ability; 10 carriers vs 10 mixed targets 30 u apart on arenalab' };
  for (const a of all) abilities.abilities[a] = { carrier: byAbil[a], hooking: HOOKING_ABILITIES.includes(a), a: block(byAbil[a], 10, 5, -15, -1), b: targets(1) };

  // ---- the matrix
  const cases = [];
  const base = { size: PARAMS.arenaSize, arenaSeed: PARAMS.arenaSeed };
  let i = 0;
  for (const arena of ARENAS) for (const diff of DIFFICULTIES) cases.push({ id: `A-${arena}-${diff}`, group: 'A', arena, ...base, seed: 1 + i++, rules: { difficulty: diff }, armies: arena, cap: PARAMS.cap });
  MUTATOR_CASES.forEach((m, j) => cases.push({ id: `B-${m}`, group: 'B', arena: 'marathon', ...base, seed: 20 + j, rules: { difficulty: 'normal', mutators: [m] }, armies: 'marathon', cap: PARAMS.cap }));
  RULE_CASES.forEach(([name, rules], j) => cases.push({ id: `C-${name}`, group: 'C', arena: 'thermopylae', ...base, seed: 40 + j, rules: { difficulty: 'normal', ...rules }, armies: 'thermopylae', cap: PARAMS.cap }));
  PROJECTILE_KINDS.forEach((k, j) => cases.push({ id: `D-${k}`, group: 'D', arena: 'arenalab', ...base, seed: 60 + j, rules: {}, armies: 'kind:' + k, cap: PARAMS.abilityCap }));
  HOOKING_ABILITIES.forEach((a, j) => cases.push({ id: `E-${a}`, group: 'E', arena: 'arenalab', ...base, seed: 80 + j, rules: {}, armies: 'ability:' + a, cap: PARAMS.abilityCap }));
  OTHER_ABILITIES.forEach((a, j) => cases.push({ id: `F-${a}`, group: 'F', arena: 'arenalab', ...base, seed: 100 + j, rules: {}, armies: 'ability:' + a, cap: PARAMS.abilityCap }));
  const inputArena = { zeus_lightning: 'marathon', meteor: 'marathon', earthquake: 'marathon', heal_wave: 'marathon', wine_rain: 'marathon', raise_chickens: 'marathon', orders: 'thermopylae', possess: 'marathon', combined: 'troy' };
  const inputArmies = { possess: 'marathon+hero', combined: 'troy+hero' };
  INPUT_CASES.forEach((n, j) => cases.push({ id: `G-${n}`, group: 'G', arena: inputArena[n], ...base, seed: 130 + j, rules: { difficulty: 'normal' }, armies: inputArmies[n] || inputArena[n], inputs: n, cap: PARAMS.cap }));
  cases.push({ id: 'H-stalemate', group: 'H', arena: 'arenalab', ...base, seed: 150, rules: { timeLimit: 240 }, armies: 'stalemate', cap: PARAMS.cap });
  cases.push({ id: 'H-waves', group: 'H', arena: 'marathon', ...base, seed: 151, rules: { waves: { faction: 'mixed', interval: 40, autoAdvance: true, maxWaves: 3 }, timeLimit: 0, objective: { id: 'survive_waves', type: 'survive_waves', params: { waves: 3 }, markerIds: [], playerTeam: 0 } }, armies: 'marathon-player', cap: PARAMS.cap });
  sets['marathon-player'] = { a: sets.marathon.a, b: [] };

  const matrix = { params: PARAMS, core: CORE_IDS.slice(), groups: { A: 'arena x difficulty', B: 'mutators', C: 'rules and weather', D: 'projectile kinds', E: 'hooking abilities', F: 'other abilities', G: 'input logs', H: 'special' }, eventFields, cases };

  // ---- group G: input logs (squad and unit ids are read from the baseline worlds and frozen)
  const inputs = { logs: {}, ids: {}, note: 'tick-stamped inputs {tick, cmd} through World.input; ids of squads and the possessed hero frozen from the baseline' };
  const probe = (armiesKey, arena) => {
    const w = H.buildWorld({ arena, size: PARAMS.arenaSize, arenaSeed: PARAMS.arenaSeed, seed: 1, a: { placements: sets[armiesKey].a }, b: { placements: sets[armiesKey].b }, start: false });
    return { sq0: w.squads.filter((s) => s.team === 0).map((s) => s.id), sq1: w.squads.filter((s) => s.team === 1).map((s) => s.id), hero: (w.units.find((u) => u.team === 0 && u.def.role === 'hero') || {}).id, foe: (w.units.find((u) => u.team === 1) || {}).id, foeRanged: (w.units.find((u) => u.team === 1 && u.def.ranged) || {}).id };
  };
  const cast = (tick, power, x, z, team = 0) => ({ tick, cmd: { type: 'cast', power, x, z, team } });
  const DIRS = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
  const possess = (hero) => {
    const log = [{ tick: 60, cmd: { type: 'possess', unit: hero, move: { x: 1, z: 0 }, attack: false } }];
    for (let t = 75, k = 1; t <= 400; t += 15, k++) {
      const d = DIRS[k % DIRS.length], cmd = { type: 'possess', move: { x: d[0], z: d[1] }, attack: k % 2 === 0 };
      if (k % 4 === 3) cmd.ability = 1;
      log.push({ tick: t, cmd });
    }
    return log;
  };
  const orders = (p) => [
    { tick: 90, cmd: { type: 'command', squad: p.sq0[0], order: 'move', x: -12, z: 2 } }, { tick: 90, cmd: { type: 'command', squad: p.sq0[1], order: 'hold' } }, { tick: 90, cmd: { type: 'command', squad: p.sq1[0], order: 'hold' } },
    { tick: 300, cmd: { type: 'command', squad: p.sq0[2], order: 'focus', target: p.foe } }, { tick: 300, cmd: { type: 'command', squad: p.sq0[3], order: 'move', x: 0, z: -4 } },
    { tick: 600, cmd: { type: 'command', squad: p.sq0[0], order: 'retreat' } }, { tick: 600, cmd: { type: 'command', squad: p.sq0[1], order: 'advance' } }, { tick: 600, cmd: { type: 'command', squad: p.sq1[1], order: 'retreat' } },
    { tick: 900, cmd: { type: 'command', squad: p.sq0[2], order: 'hold' } }, { tick: 900, cmd: { type: 'command', squad: p.sq0[3], order: 'advance' } }, { tick: 900, cmd: { type: 'command', squad: p.sq0[0], order: 'advance' } },
  ];
  inputs.logs.zeus_lightning = [cast(150, 'zeus_lightning', 2, -3)];
  inputs.logs.meteor = [cast(150, 'meteor', -1.5, 4)];
  inputs.logs.earthquake = [cast(150, 'earthquake', 0, 0)];
  inputs.logs.heal_wave = [cast(150, 'heal_wave', -12, 0)];
  inputs.logs.wine_rain = [cast(150, 'wine_rain', 4, 2)];
  inputs.logs.raise_chickens = [cast(150, 'raise_chickens', -10, 5)];
  const pTh = probe('thermopylae', 'thermopylae'), pMa = probe('marathon+hero', 'marathon'), pTr = probe('troy+hero', 'troy');
  inputs.logs.orders = orders(pTh).map((e) => ({ tick: e.tick, cmd: e.cmd }));
  inputs.logs.possess = possess(pMa.hero);
  const comb = [cast(150, 'zeus_lightning', 2, -3), cast(360, 'meteor', -4, 5, 1), cast(540, 'heal_wave', -12, 0), ...orders(pTr).filter((e) => e.tick <= 600), ...possess(pTr.hero)];
  inputs.logs.combined = comb.sort((x, y) => x.tick - y.tick);
  inputs.ids = { orders: { squads0: pTh.sq0, squads1: pTh.sq1, foe: pTh.foe }, possess: { hero: pMa.hero }, combined: { squads0: pTr.sq0, squads1: pTr.sq1, hero: pTr.hero, foe: pTr.foe } };
  for (const [n, p] of [['possess', pMa], ['combined', pTr]]) if (!p.hero) throw new Error(`G-${n}: no hero in team 0`);
  if (pTh.sq0.length < 4 || pTh.sq1.length < 2) throw new Error('G-orders: not enough squads for the order log');

  return { matrix, placements, kinds, abilities, inputs };
}
