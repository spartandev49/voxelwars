// UNITS-A: humanoid models of the Hellene, Roman and Egyptian specials (peltast, philosopher, strategos, pilum_thrower, centurion, gladiator, senator,
// khopesh_warrior, mummy, anubis_guard, priest_of_ra, pharaoh) plus the compact chariot crew. MODELS[id] = {kind:'humanoid', blueprint}.
import '../parts/units_a_helms.js';
import '../parts/units_a_faces.js';
import '../parts/units_a_garb.js';
import '../parts/units_a_gear.js';

const bp = (o) => o;
const HELLENE = { primary: '#c8453c', secondary: '#f2d36b', trim: '#4a2f1c', metal: 'bronze', cloth: '#ece6d4' };
const ROMAN = { primary: '#a8322a', secondary: '#e8c15a', trim: '#3a2418', metal: 'steel', cloth: '#ece4d4' };
const EGYPT = { primary: '#1f8f8a', secondary: '#e8c15a', trim: '#3a2a1a', metal: 'bronze', cloth: '#f0ead8' };

export const BLUEPRINTS = {
  peltast: bp({ v: 1, id: 'peltast', name: 'Peltast', body: { type: 'slim', skin: '#d9a47c', hair: '#3a2416' },
    head: { helm: 'thracian_fox', hair: 'short', face: 'stubble', eyes: '#2a3a2a' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'boots', skirt: 'none' },
    shoulders: 'none', cape: 'striped_cloak', back: 'javelin_bundle', main: 'javelin', off: 'pelte_wicker', colors: Object.assign({}, HELLENE, { trim: '#5a3a1c' }), emblem: 'none', paint: {} }),
  philosopher: bp({ v: 1, id: 'philosopher', name: 'Philosopher', body: { type: 'average', skin: '#e0ac84', hair: '#f0f0ec' },
    head: { helm: 'laurel', hair: 'receding', face: 'philosopher_beard', eyes: '#222222' }, torso: { armor: 'none', tunic: 'himation' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'scroll', off: 'none', colors: Object.assign({}, HELLENE, { primary: '#3a7a3a' }), emblem: 'none', paint: {} }),
  strategos: bp({ v: 1, id: 'strategos', name: 'Strategos', body: { type: 'average', skin: '#dba67e', hair: '#3a2a1a' },
    head: { helm: 'attic_fan', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'thorax_strategos', tunic: 'chiton' }, legs: { armor: 'greaves_bronze', skirt: 'pteruges' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'standard', off: 'round_shield', colors: HELLENE, emblem: 'lambda', paint: {} }),
  pilum_thrower: bp({ v: 1, id: 'pilum_thrower', name: 'Pilum Thrower', body: { type: 'average', skin: '#e2b08a', hair: '#3a2a1a' },
    head: { helm: 'galea_light', hair: 'short', face: 'none', eyes: '#2a2a2a' }, torso: { armor: 'chainmail', tunic: 'tunic' }, legs: { armor: 'caligae', skirt: 'pteruges' },
    shoulders: 'scarf', cape: 'none', back: 'pilum_pair', main: 'pilum', off: 'parma_small', colors: ROMAN, emblem: 'bolt', paint: {} }),
  centurion: bp({ v: 1, id: 'centurion', name: 'Centurion', body: { type: 'stocky', skin: '#e2b08a', hair: '#3a2a1a' },
    head: { helm: 'centurion_crest', hair: 'short', face: 'stubble', eyes: '#2a2a2a' }, torso: { armor: 'harness_phalerae', tunic: 'tunic' }, legs: { armor: 'greaves', skirt: 'pteruges' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'vine_staff', off: 'parma', colors: Object.assign({}, ROMAN, { metal: 'silver' }), emblem: 'eagle', paint: {} }),
  gladiator: bp({ v: 1, id: 'gladiator', name: 'Gladiator', body: { type: 'stocky', skin: '#c68a62', hair: '#2a1a10' },
    head: { helm: 'murmillo', hair: 'short', face: 'none', eyes: '#2a2a2a' }, torso: { armor: 'none', tunic: 'subligaculum' }, legs: { armor: 'gladiator_legs', skirt: 'none' },
    shoulders: 'manica', cape: 'none', back: 'net_coil', main: 'trident', off: 'none', colors: Object.assign({}, ROMAN, { metal: 'bronze' }), emblem: 'none', paint: {} }),
  senator: bp({ v: 1, id: 'senator', name: 'Senator', body: { type: 'stocky', skin: '#e0ac84', hair: '#d9d4c4' },
    head: { helm: 'laurel', hair: 'receding', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'toga_senator' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'coin_bag', off: 'none', colors: Object.assign({}, ROMAN, { primary: '#6a2a8a' }), emblem: 'none', paint: {} }),
  khopesh_warrior: bp({ v: 1, id: 'khopesh_warrior', name: 'Khopesh Warrior', body: { type: 'average', skin: '#a56a45', hair: '#151210' },
    head: { helm: 'nemes_lite', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar_gold', cape: 'none', back: 'none', main: 'khopesh', off: 'egyptian_shield', colors: EGYPT, emblem: 'none', paint: {} }),
  mummy: bp({ v: 1, id: 'mummy', name: 'Mummy', body: { type: 'average', skin: '#8a7a5a', hair: '#3a3a30' },
    head: { helm: 'mummy_head', hair: 'bald', face: 'none', eyes: '#80ff80' }, torso: { armor: 'none', tunic: 'mummy_wraps' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'bandage_trail', back: 'none', main: 'wrapped_club', off: 'none', colors: EGYPT, emblem: 'none', paint: {} }),
  anubis_guard: bp({ v: 1, id: 'anubis_guard', name: 'Anubis Guard', body: { type: 'stocky', skin: '#26262c', hair: '#15151a' },
    head: { helm: 'jackal_anubis', hair: 'bald', face: 'none', eyes: '#e8c050' }, torso: { armor: 'sash_team', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar_gold', cape: 'none', back: 'none', main: 'khopesh_spear', off: 'egyptian_shield_black', colors: Object.assign({}, EGYPT, { metal: 'gold' }), emblem: 'eye', paint: {} }),
  priest_of_ra: bp({ v: 1, id: 'priest_of_ra', name: 'Priest of Ra', body: { type: 'slim', skin: '#b87a52', hair: '#151210' },
    head: { helm: 'sun_circlet', hair: 'bald', face: 'none', eyes: '#2a1a0a' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'leopard_mantle', cape: 'none', back: 'none', main: 'scepter_sun', off: 'none', colors: Object.assign({}, EGYPT, { metal: 'gold' }), emblem: 'none', paint: {} }),
  pharaoh: bp({ v: 1, id: 'pharaoh', name: 'Pharaoh', body: { type: 'average', skin: '#b87a52', hair: '#151210' },
    head: { helm: 'pschent', hair: 'bald', face: 'beard_false', eyes: '#2a1a0a' }, torso: { armor: 'none', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar_gold', cape: 'royal_cape', back: 'none', main: 'crook_flail', off: 'egyptian_shield_gold', colors: Object.assign({}, EGYPT, { metal: 'gold' }), emblem: 'sun', paint: {} }),
};
export const MODELS = {};
for (const id of Object.keys(BLUEPRINTS)) MODELS[id] = { kind: 'humanoid', blueprint: BLUEPRINTS[id] };
