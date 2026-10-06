// UNITS-A draft (existing parts only)
const bp = (o) => o;
const HELLENE = { primary: '#c8453c', secondary: '#f2d36b', trim: '#4a2f1c', metal: 'bronze', cloth: '#ece6d4' };
const ROMAN = { primary: '#a8322a', secondary: '#e8c15a', trim: '#3a2418', metal: 'steel', cloth: '#ece4d4' };
const EGYPT = { primary: '#1f8f8a', secondary: '#e8c15a', trim: '#3a2a1a', metal: 'bronze', cloth: '#f0ead8' };

export const BLUEPRINTS = {
  peltast: bp({ v: 1, id: 'peltast', name: 'Peltast', body: { type: 'slim', skin: '#d9a47c', hair: '#3a2416' },
    head: { helm: 'leather_cap', hair: 'short', face: 'stubble', eyes: '#2a3a2a' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'boots', skirt: 'none' },
    shoulders: 'none', cape: 'short', back: 'javelin_bundle', main: 'javelin', off: 'pelte', colors: HELLENE, emblem: 'none', paint: {} }),
  philosopher: bp({ v: 1, id: 'philosopher', name: 'Philosopher', body: { type: 'average', skin: '#e0ac84', hair: '#e8e8e8' },
    head: { helm: 'laurel', hair: 'receding', face: 'beard_long', eyes: '#222222' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'scroll_of_doom', off: 'none', colors: Object.assign({}, HELLENE, { primary: '#3a7a3a' }), emblem: 'none', paint: {} }),
  strategos: bp({ v: 1, id: 'strategos', name: 'Strategos', body: { type: 'average', skin: '#dba67e', hair: '#3a2a1a' },
    head: { helm: 'corinthian_tall', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'thorax_bronze', tunic: 'chiton' }, legs: { armor: 'greaves_bronze', skirt: 'pteruges' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'standard', off: 'round_shield', colors: HELLENE, emblem: 'lambda', paint: {} }),
  pilum_thrower: bp({ v: 1, id: 'pilum_thrower', name: 'Pilum Thrower', body: { type: 'average', skin: '#e2b08a', hair: '#3a2a1a' },
    head: { helm: 'galea_light', hair: 'short', face: 'none', eyes: '#2a2a2a' }, torso: { armor: 'chainmail', tunic: 'tunic' }, legs: { armor: 'caligae', skirt: 'pteruges' },
    shoulders: 'scarf', cape: 'none', back: 'javelin_bundle', main: 'pilum', off: 'parma', colors: ROMAN, emblem: 'bolt', paint: {} }),
  centurion: bp({ v: 1, id: 'centurion', name: 'Centurion', body: { type: 'stocky', skin: '#e2b08a', hair: '#3a2a1a' },
    head: { helm: 'centurion_crest', hair: 'short', face: 'stubble', eyes: '#2a2a2a' }, torso: { armor: 'lorica_segmentata', tunic: 'tunic' }, legs: { armor: 'greaves', skirt: 'pteruges' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'vine_staff', off: 'parma', colors: Object.assign({}, ROMAN, { metal: 'silver' }), emblem: 'eagle', paint: {} }),
  gladiator: bp({ v: 1, id: 'gladiator', name: 'Gladiator', body: { type: 'stocky', skin: '#c68a62', hair: '#2a1a10' },
    head: { helm: 'horned_small', hair: 'short', face: 'none', eyes: '#2a2a2a' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'greaves', skirt: 'cloth_skirt' },
    shoulders: 'armbands', cape: 'none', back: 'none', main: 'trident', off: 'none', colors: ROMAN, emblem: 'none', paint: {} }),
  senator: bp({ v: 1, id: 'senator', name: 'Senator', body: { type: 'stocky', skin: '#e0ac84', hair: '#d9d4c4' },
    head: { helm: 'laurel', hair: 'receding', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'toga' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'olive_branch', off: 'none', colors: Object.assign({}, ROMAN, { primary: '#6a2a8a' }), emblem: 'none', paint: {} }),
  khopesh_warrior: bp({ v: 1, id: 'khopesh_warrior', name: 'Khopesh Warrior', body: { type: 'average', skin: '#a56a45', hair: '#151210' },
    head: { helm: 'nemes', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar', cape: 'none', back: 'none', main: 'khopesh', off: 'buckler', colors: EGYPT, emblem: 'none', paint: {} }),
  mummy: bp({ v: 1, id: 'mummy', name: 'Mummy', body: { type: 'average', skin: '#9a8a6a', hair: '#3a3a30' },
    head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#80ff80' }, torso: { armor: 'none', tunic: 'bandages' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'tattered', back: 'none', main: 'none', off: 'none', colors: EGYPT, emblem: 'none', paint: {} }),
  anubis_guard: bp({ v: 1, id: 'anubis_guard', name: 'Anubis Guard', body: { type: 'stocky', skin: '#2a2a30', hair: '#15151a' },
    head: { helm: 'jackal_head', hair: 'bald', face: 'none', eyes: '#e8c050' }, torso: { armor: 'sash_team', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar', cape: 'none', back: 'none', main: 'khopesh_spear', off: 'round_shield', colors: Object.assign({}, EGYPT, { metal: 'gold' }), emblem: 'eye', paint: {} }),
  priest_of_ra: bp({ v: 1, id: 'priest_of_ra', name: 'Priest of Ra', body: { type: 'slim', skin: '#b87a52', hair: '#151210' },
    head: { helm: 'none', hair: 'bald', face: 'none', eyes: '#2a1a0a' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'scepter_sun', off: 'none', colors: EGYPT, emblem: 'none', paint: {} }),
  pharaoh: bp({ v: 1, id: 'pharaoh', name: 'Pharaoh', body: { type: 'average', skin: '#b87a52', hair: '#151210' },
    head: { helm: 'pschent', hair: 'bald', face: 'beard_false', eyes: '#2a1a0a' }, torso: { armor: 'none', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'broad_collar', cape: 'long', back: 'none', main: 'crook_flail', off: 'hide_shield', colors: Object.assign({}, EGYPT, { metal: 'gold' }), emblem: 'sun', paint: {} }),
};
export const MODELS = {};
for (const id of Object.keys(BLUEPRINTS)) MODELS[id] = { kind: 'humanoid', blueprint: BLUEPRINTS[id] };
