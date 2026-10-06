// STAT_TABLE: the sim-facing numbers for every shipped unit (ancient era). Owned by SIM (decisions D9); balance changes land here.
// UNITS merges these with model + text into full UnitDefs (src/content/era_ancient/units/*.js). Numbers follow spec/units.md.
// melee: {dmg,cd,range,type,ap?,kb?,style}   ranged: {proj,dmg,cd,range,minRange?,spread?,type,ap?,aoe?,pierceN?,speed?,gravity?}
// shield: {arc (half-angle degrees),block,proj}  abilities: [{id, ...params}]

const M = (dmg, cd, range, type, style, extra) => Object.assign({ dmg, cd, range, type, style }, extra);
const R = (proj, dmg, cd, range, extra) => Object.assign({ proj, dmg, cd, range, type: 'pierce' }, extra);
const S = (arc, block, proj) => ({ arc, block, proj });

export const STAT_TABLE = {
  // ---------------- Hellenes ----------------
  hoplite: { faction: 'hellenes', role: 'melee', cost: 100, hp: 92, armor: 0.30, speed: 2.6, radius: 0.65, mass: 1.0, melee: M(12, 1.2, 2.0, 'pierce', 'thrust'), shield: S(70, 0.45, 0.60), abilities: [{ id: 'stance', kind: 'phalanx' }], tags: ['spear'], ai: { style: 'hold' } },
  spartan: { faction: 'hellenes', role: 'melee', cost: 190, hp: 149, armor: 0.35, speed: 2.9, radius: 0.65, mass: 1.1, melee: M(17, 1.0, 2.0, 'pierce', 'thrust', { kb: 3.6 }), shield: S(80, 0.55, 0.65), abilities: [{ id: 'kick', cd: 8 }], tags: ['spear', 'elite', 'fearless'], ai: { style: 'charge' } },
  peltast: { faction: 'hellenes', role: 'ranged', cost: 85, hp: 63, armor: 0.05, speed: 3.4, mass: 0.9, melee: M(5, 0.9, 1.2, 'pierce', 'thrust'), ranged: R('javelin', 14, 2.0, 18, { ap: 0.25, speed: 30, spread: 0.05, gravity: 18 }), abilities: [], tags: ['skirmisher'], ai: { style: 'skirmish' } },
  cretan_archer: { faction: 'hellenes', role: 'ranged', cost: 90, hp: 58, armor: 0, speed: 2.7, mass: 0.9, melee: M(5, 1.0, 1.0, 'blunt', 'bash'), ranged: R('arrow', 12, 1.6, 34, { spread: 0.045, speed: 40, gravity: 22 }), abilities: [], tags: ['archer'], ai: { style: 'skirmish' } },
  companion_cavalry: { faction: 'hellenes', role: 'cavalry', cost: 220, hp: 171, armor: 0.25, speed: 3.4, runMul: 2.5, mass: 3.0, radius: 0.8, melee: M(27, 1.6, 2.6, 'pierce', 'thrust', { kb: 3.3 }), shield: S(60, 0.25, 0.4), abilities: [], tags: ['cavalry', 'lance'], ai: { style: 'flank' } },
  philosopher: { faction: 'hellenes', role: 'support', cost: 120, hp: 60, armor: 0, speed: 2.4, mass: 0.9, melee: M(4, 1.4, 1.0, 'blunt', 'bash'), abilities: [{ id: 'cc_field', effect: 'confuse', shape: 'circle', radius: 7, channel: 3, cd: 14 }], tags: ['support'], ai: { style: 'support' } },
  strategos: { faction: 'hellenes', role: 'hero', cost: 380, hp: 260, armor: 0.40, speed: 3.0, radius: 0.65, mass: 1.2, melee: M(22, 1.0, 1.8, 'slash', 'slash', { kb: 2.8 }), shield: S(70, 0.45, 0.5), abilities: [{ id: 'aura', effect: 'rally', radius: 10 }], tags: ['officer', 'elite', 'fearless'], ai: { style: 'hero' } },

  // ---------------- Romans ----------------
  legionary: { faction: 'romans', role: 'melee', cost: 129, hp: 110, armor: 0.38, speed: 2.5, radius: 0.65, mass: 1.0, melee: M(13, 1.0, 1.5, 'slash', 'slash'), shield: S(90, 0.50, 0.75), abilities: [{ id: 'stance', kind: 'testudo' }], tags: [], ai: { style: 'hold' } },
  pilum_thrower: { faction: 'romans', role: 'ranged', cost: 110, hp: 70, armor: 0.20, speed: 3.0, mass: 1.0, melee: M(10, 1.0, 1.4, 'slash', 'slash'), ranged: R('pilum', 21, 3.0, 14, { ap: 0.5, speed: 28, spread: 0.04, gravity: 20, }), shield: S(50, 0.3, 0.3), abilities: [{ id: 'breaks_shield', secs: 4 }], tags: ['skirmisher'], ai: { style: 'skirmish' } },
  centurion: { faction: 'romans', role: 'hero', cost: 260, hp: 200, armor: 0.42, speed: 2.9, radius: 0.65, mass: 1.1, melee: M(20, 0.95, 1.7, 'slash', 'slash', { kb: 3.1 }), shield: S(70, 0.45, 0.5), abilities: [{ id: 'aura', effect: 'discipline', radius: 9 }], tags: ['officer', 'elite'], ai: { style: 'hero' } },
  gladiator: { faction: 'romans', role: 'melee', cost: 142, hp: 167, armor: 0.10, speed: 3.1, mass: 1.0, melee: M(21, 1.1, 2.4, 'pierce', 'thrust', { kb: 2.7 }), abilities: [{ id: 'net', radius: 10, root: 2.5, cd: 12 }, { id: 'crowd_favorite', enemies: 5, radius: 5, dmg: 1.2 }], tags: ['spear'], ai: { style: 'charge' } },
  equites: { faction: 'romans', role: 'cavalry', cost: 168, hp: 154, armor: 0.22, speed: 3.5, runMul: 2.4, mass: 2.8, radius: 0.8, melee: M(21, 1.4, 2.4, 'pierce', 'thrust', { kb: 4.4 }), shield: S(50, 0.2, 0.3), abilities: [], tags: ['cavalry', 'spear'], ai: { style: 'flank' } },
  ballista: { faction: 'romans', role: 'siege', cost: 260, hp: 132, armor: 0.20, speed: 1.2, mass: 2.5, radius: 0.9, ranged: R('bolt', 66, 4.5, 55, { ap: 0.6, pierceN: 3, speed: 55, spread: 0.012, gravity: 8, minRange: 8 }), abilities: [], tags: ['siege'], ai: { style: 'siege' } },
  senator: { faction: 'romans', role: 'support', cost: 140, hp: 50, armor: 0, speed: 2.5, mass: 0.9, ranged: R('coin', 3, 2.0, 10, { speed: 20, spread: 0.08, gravity: 18 }), abilities: [{ id: 'bribe', chance: 0.05, secs: 6 }, { id: 'cc_field', effect: 'sleep', shape: 'circle', radius: 9, channel: 4, cd: 16 }], tags: ['support'], ai: { style: 'support' } },

  // ---------------- Egyptians ----------------
  medjay: { faction: 'egyptians', role: 'melee', cost: 85, hp: 95, armor: 0.15, speed: 3.0, mass: 1.0, melee: M(12, 1.2, 2.0, 'pierce', 'thrust'), shield: S(55, 0.35, 0.4), abilities: [], tags: ['spear'], ai: { style: 'hold' } },
  nubian_archer: { faction: 'egyptians', role: 'ranged', cost: 95, hp: 51, armor: 0, speed: 2.8, mass: 0.9, melee: M(4, 1.0, 1.0, 'blunt', 'bash'), ranged: R('arrow', 10, 1.5, 36, { spread: 0.04, speed: 40, gravity: 22 }), abilities: [{ id: 'fire_every', n: 6 }], tags: ['archer'], ai: { style: 'skirmish' } },
  khopesh_warrior: { faction: 'egyptians', role: 'melee', cost: 100, hp: 97, armor: 0.20, speed: 3.0, mass: 1.0, melee: M(15, 1.0, 1.6, 'slash', 'slash', { kb: 3.8 }), shield: S(50, 0.3, 0.3), abilities: [{ id: 'hook', chance: 0.15, secs: 3 }], tags: [], ai: { style: 'charge' } },
  chariot_archer: { faction: 'egyptians', role: 'cavalry', cost: 212, hp: 167, armor: 0.15, speed: 3.6, runMul: 2.2, mass: 3.5, radius: 0.9, melee: M(24, 1.0, 1.4, 'blunt', 'ram', { kb: 4.0 }), ranged: R('arrow', 12, 1.1, 30, { spread: 0.06, speed: 38, gravity: 22, whileMoving: true }), abilities: [], tags: ['cavalry', 'archer'], ai: { style: 'flank' } },
  mummy: { faction: 'egyptians', role: 'melee', cost: 124, hp: 215, armor: 0.10, speed: 1.9, mass: 1.4, melee: M(15, 1.4, 1.5, 'blunt', 'bash'), abilities: [{ id: 'aura', effect: 'curse', radius: 5 }], tags: ['fearless', 'undead', 'fire_weak'], ai: { style: 'charge' } },
  anubis_guard: { faction: 'egyptians', role: 'melee', cost: 230, hp: 172, armor: 0.40, speed: 2.9, radius: 0.65, mass: 1.3, scale: 1.15, melee: M(20, 1.1, 2.2, 'pierce', 'thrust', { kb: 3.1 }), shield: S(70, 0.5, 0.5), abilities: [{ id: 'execute', cd: 10, threshold: 0.2 }], tags: ['elite', 'fearless'], ai: { style: 'charge' } },
  priest_of_ra: { faction: 'egyptians', role: 'support', cost: 150, hp: 60, armor: 0, speed: 2.6, mass: 0.9, ranged: R('sunbeam', 8, 1.2, 14, { type: 'magic', speed: 60, spread: 0.01, gravity: 0 }), abilities: [{ id: 'heal_pulse', radius: 8, amount: 25, targets: 4, cd: 6 }], tags: ['support'], ai: { style: 'support' } },
  pharaoh: { faction: 'egyptians', role: 'hero', cost: 420, hp: 300, armor: 0.30, speed: 2.6, radius: 0.65, mass: 1.4, melee: M(18, 1.2, 1.6, 'blunt', 'bash', { kb: 3.4 }), ranged: R('scepter', 28, 2.5, 16, { type: 'magic', aoe: 3, speed: 40, spread: 0.01, gravity: 0 }), shield: S(60, 0.4, 0.4), abilities: [{ id: 'dot_cloud', radius: 7, duration: 6, dps: 8, cd: 25 }, { id: 'aura', effect: 'great_king', radius: 8 }], tags: ['officer', 'elite', 'general'], ai: { style: 'hero' } },

  // ---------------- Persians ----------------
  immortal: { faction: 'persians', role: 'melee', cost: 120, hp: 101, armor: 0.22, speed: 2.8, radius: 0.65, mass: 1.0, melee: M(12, 1.15, 2.1, 'pierce', 'thrust'), shield: S(55, 0.35, 0.45), abilities: [{ id: 'revive', hpFrac: 0.4, delay: 3 }], tags: ['spear'], ai: { style: 'hold' } },
  sparabara: { faction: 'persians', role: 'ranged', cost: 118, hp: 61, armor: 0.15, speed: 2.5, radius: 0.65, mass: 1.0, melee: M(7, 1.1, 1.4, 'pierce', 'thrust'), ranged: R('arrow', 9, 1.7, 28, { spread: 0.045, speed: 38, gravity: 22 }), shield: S(90, 0.65, 0.80), abilities: [{ id: 'stance', kind: 'shield_wall' }], tags: ['archer'], ai: { style: 'hold' } },
  cataphract: { faction: 'persians', role: 'cavalry', cost: 275, hp: 255, armor: 0.60, speed: 3.0, runMul: 2.2, mass: 4.0, radius: 0.85, melee: M(28, 1.8, 2.7, 'pierce', 'thrust', { kb: 3.1 }), shield: S(60, 0.3, 0.4), abilities: [], tags: ['cavalry', 'lance', 'heavy'], ai: { style: 'charge' } },
  camel_rider: { faction: 'persians', role: 'cavalry', cost: 150, hp: 142, armor: 0.15, speed: 3.3, runMul: 2.2, mass: 2.6, radius: 0.8, melee: M(16, 1.3, 2.4, 'pierce', 'thrust', { kb: 4.0 }), abilities: [{ id: 'cc_field', effect: 'panic_cav', shape: 'cone', radius: 6, passive: true }], tags: ['cavalry', 'spear'], ai: { style: 'flank' } },
  xerxes: { faction: 'persians', role: 'hero', cost: 400, hp: 280, armor: 0.25, speed: 2.6, radius: 0.65, mass: 1.3, melee: M(20, 1.0, 1.7, 'slash', 'slash', { kb: 3.1 }), shield: S(60, 0.4, 0.4), abilities: [{ id: 'throne', idle: 4 }, { id: 'aura', effect: 'great_king', radius: 10 }], tags: ['officer', 'general'], ai: { style: 'hero' } },

  // ---------------- Carthaginians ----------------
  war_elephant: { faction: 'carthage', role: 'monster', cost: 728, hp: 784, armor: 0.35, speed: 3.4, runMul: 1.6, mass: 12, radius: 1.5, melee: M(35, 2.0, 3.2, 'pierce', 'gore', { kb: 9.1 }), ranged: R('arrow', 8, 1.4, 28, { spread: 0.06, speed: 38, gravity: 22, volley: 2 }), abilities: [{ id: 'cc_field', effect: 'scare', shape: 'circle', radius: 10, cd: 15 }, { id: 'fire_panic', hits: 3, flee: 6 }], tags: ['large', 'boss', 'fire_panic'], ai: { style: 'charge' } },
  numidian: { faction: 'carthage', role: 'cavalry', cost: 125, hp: 90, armor: 0.05, speed: 4.0, runMul: 1.9, mass: 2.4, radius: 0.75, melee: M(9, 1.0, 1.4, 'pierce', 'thrust', { kb: 4.0 }), ranged: R('javelin', 15, 1.6, 16, { speed: 30, spread: 0.05, gravity: 18 }), abilities: [], tags: ['cavalry', 'skirmisher'], ai: { style: 'skirmish' } },
  catapult: { faction: 'carthage', role: 'siege', cost: 266, hp: 156, armor: 0.15, speed: 1.0, mass: 3.0, radius: 1.1, ranged: R('boulder', 78, 6.0, 70, { type: 'blunt', aoe: 4, minRange: 15, speed: 42, spread: 0.02, gravity: 24, crater: true }), abilities: [{ id: 'misfire', chance: 0.04 }], tags: ['siege'], ai: { style: 'siege' } },
  hannibal: { faction: 'carthage', role: 'hero', cost: 360, hp: 250, armor: 0.30, speed: 3.5, runMul: 2.3, mass: 3.0, radius: 0.8, melee: M(24, 1.2, 2.4, 'pierce', 'thrust', { kb: 3.3 }), shield: S(60, 0.3, 0.4), abilities: [{ id: 'aura', effect: 'pincer', radius: 14 }], tags: ['officer', 'elite', 'cavalry', 'general'], ai: { style: 'hero' } },

  // ---------------- Barbarians ----------------
  berserker: { faction: 'barbarians', role: 'melee', cost: 120, hp: 131, armor: 0, speed: 3.4, mass: 1.0, melee: M(24, 0.9, 1.8, 'slash', 'overhead', { kb: 2.5 }), abilities: [{ id: 'rage', hpFrac: 0.5, dmg: 1.5, speed: 1.3 }], tags: [], ai: { style: 'charge' } },
  axe_thrower: { faction: 'barbarians', role: 'ranged', cost: 105, hp: 86, armor: 0.10, speed: 3.0, mass: 1.0, melee: M(13, 1.0, 1.4, 'slash', 'slash'), ranged: R('francisca', 21, 2.4, 13, { type: 'slash', speed: 26, spread: 0.05, gravity: 20 }), abilities: [], tags: ['skirmisher'], ai: { style: 'skirmish' } },
  druid: { faction: 'barbarians', role: 'support', cost: 180, hp: 70, armor: 0, speed: 2.6, mass: 0.9, ranged: R('thunderbolt', 22, 5.0, 22, { type: 'magic', speed: 80, spread: 0, gravity: 0, chain: 3 }), abilities: [{ id: 'chain_lightning' }, { id: 'heal_pulse', radius: 6, amount: 15, targets: 1, cd: 5, onlyIdle: true }], tags: ['support'], ai: { style: 'support' } },
  warhound: { faction: 'barbarians', role: 'beast', cost: 55, hp: 50, armor: 0, speed: 4.2, runMul: 1.55, mass: 0.6, radius: 0.35, melee: M(8, 0.7, 1.0, 'pierce', 'bite'), abilities: [{ id: 'pack_bonus', per: 0.08, max: 0.4, radius: 5 }], tags: ['animal'], ai: { style: 'charge' } },
  chieftain: { faction: 'barbarians', role: 'hero', cost: 340, hp: 280, armor: 0.25, speed: 3.0, mass: 1.5, scale: 1.2, melee: M(30, 1.4, 2.0, 'blunt', 'overhead', { kb: 4.5 }), abilities: [{ id: 'war_horn', duration: 8, radius: 14, speed: 1.2, dmg: 1.2 }], tags: ['officer', 'elite', 'general'], ai: { style: 'hero' } },

  // ---------------- Mythic ----------------
  minotaur: { faction: 'mythic', role: 'monster', cost: 480, hp: 513, armor: 0.25, speed: 3.2, mass: 6, radius: 0.8, scale: 1.7, melee: M(37, 1.7, 2.8, 'slash', 'overhead', { kb: 9.6 }), abilities: [{ id: 'dash', kind: 'bull_charge', dist: 12, dmg: 30, stun: 1, cd: 10 }], tags: ['large'], ai: { style: 'charge' } },
  cyclops: { faction: 'mythic', role: 'monster', cost: 620, hp: 638, armor: 0.20, speed: 2.4, mass: 10, radius: 1.1, scale: 2.2, melee: M(41, 2.2, 3.5, 'blunt', 'overhead', { kb: 8.1 }), ranged: R('boulder', 50, 7.0, 28, { type: 'blunt', aoe: 2.5, speed: 27, spread: 0.02, gravity: 22, minRange: 6 }), abilities: [{ id: 'misaim', chance: 0.25 }], tags: ['large', 'boss'], ai: { style: 'charge' } },
  medusa: { faction: 'mythic', role: 'monster', cost: 248, hp: 154, armor: 0, speed: 2.8, mass: 1.0, melee: M(12, 1.0, 1.6, 'pierce', 'thrust'), abilities: [{ id: 'poison', dps: 3, secs: 3 }, { id: 'cc_field', effect: 'stone', shape: 'cone', radius: 14, angle: 40, duration: 4, cd: 9 }], tags: [], ai: { style: 'skirmish' } },
  centaur_archer: { faction: 'mythic', role: 'ranged', cost: 203, hp: 148, armor: 0.10, speed: 3.9, runMul: 1.7, mass: 2.6, radius: 0.7, melee: M(12, 1.2, 1.8, 'blunt', 'bash'), ranged: R('arrow', 16, 1.4, 38, { spread: 0.035, speed: 42, gravity: 22 }), abilities: [], tags: ['archer', 'cavalry'], ai: { style: 'skirmish' } },
  trojan_horse: { faction: 'mythic', role: 'siege', cost: 450, hp: 358, armor: 0.30, speed: 1.4, mass: 8, radius: 1.4, melee: M(27, 1.5, 2.5, 'blunt', 'ram', { kb: 12.1 }), abilities: [{ id: 'summon_on_death', spawn: 'hoplite', count: 6, onContact: 25, hpFrac: 0.4 }], tags: ['large', 'siege', 'fire_weak'], ai: { style: 'charge' } },
  sacred_chicken: { faction: 'mythic', role: 'swarm', cost: 28, hp: 22, armor: 0, speed: 4.6, mass: 0.3, radius: 0.25, melee: M(3, 0.3, 0.8, 'pierce', 'peck'), abilities: [{ id: 'tantrum', chance: 0.3, duration: 5, dmg: 3, speed: 1.5 }, { id: 'cluck', radius: 5, taunt: 2, cd: 12 }], tags: ['animal'], ai: { style: 'charge' } },
  battle_goat: { faction: 'mythic', role: 'beast', cost: 51, hp: 55, armor: 0.05, speed: 4.0, runMul: 1.4, mass: 1.2, radius: 0.4, melee: M(10, 1.5, 1.2, 'blunt', 'headbutt', { kb: 6 }), abilities: [{ id: 'dash', kind: 'goat_charge', dist: 8, dmgMul: 2, cd: 9 }], tags: ['animal'], ai: { style: 'charge' } },
};

export const FACTIONS = {
  hellenes: { name: 'Hellenes', blurb: 'Philosophers with spears. Philosophy first, spears second, naps third.', colors: [0x2a5db0, 0xf2d36b] },
  romans: { name: 'Romans', blurb: 'They built roads, aqueducts, and a surprisingly rigid shield formation.', colors: [0xb3262e, 0xe8c15a] },
  egyptians: { name: 'Egyptians', blurb: 'Five thousand years of history and exactly one dress code.', colors: [0x1f8f8a, 0xe8c15a] },
  persians: { name: 'Persians', blurb: 'An empire so big the supply carts needed their own empire.', colors: [0x6a3fb0, 0xf0d57a] },
  carthage: { name: 'Carthaginians', blurb: 'Ships, silver, and a questionable relationship with elephants.', colors: [0x7a2a8a, 0xdcdcdc] },
  barbarians: { name: 'Barbarians', blurb: 'Surprisingly well organised. Excellent pottery. Shouty.', colors: [0x2f7a3a, 0xd9a05a] },
  mythic: { name: 'Mythic', blurb: 'Monsters, a horse with secrets, and chickens that know too much.', colors: [0xd4a017, 0xffffff] },
};

export const DEFAULTS = {
  radius: 0.55, mass: 1, turnRate: 9, accel: 14, runMul: 1.5, scale: 1, kb: 4,
};
