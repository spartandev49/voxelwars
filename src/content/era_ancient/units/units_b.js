// UNITS-B baseline (temporary): Persians, Barbarians, Mythic monsters, Carthaginian riders
import '../parts/units_b_persians.js';
import '../parts/units_b_barbarians.js';
import '../parts/units_b_mythic.js';
const PERSIAN = { primary: '#6a3fb0', secondary: '#f0d57a', trim: '#2a3a7a', metal: 'steel', cloth: '#f0ece4' };
const BARB = { primary: '#2f7a3a', secondary: '#d9a05a', trim: '#4a3418', metal: 'iron', cloth: '#e6e2cc' };
const MYTH = { primary: '#d4a017', secondary: '#f6d850', trim: '#4a3418', metal: 'bronze', cloth: '#e8e0cc' };
const PUNIC = { primary: '#7a2a8a', secondary: '#dcdcdc', trim: '#2a1a30', metal: 'bronze', cloth: '#ece6ee' };
const bp = (o) => o;
export const BLUEPRINTS = {
  immortal: bp({ v: 1, id: 'immortal', name: 'Immortal', body: { type: 'average', skin: '#cf9a6c', hair: '#4a3220' },
    head: { helm: 'persian_fez', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'immortal_scale', tunic: 'none' }, legs: { armor: 'persian_trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'spear_pomegranate', off: 'gerron', colors: PERSIAN, emblem: 'none', paint: {} }),
  sparabara: bp({ v: 1, id: 'sparabara', name: 'Sparabara', body: { type: 'average', skin: '#cf9a6c', hair: '#2a1a10' },
    head: { helm: 'persian_cap', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'persian_trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'quiver', main: 'sparabara_bow', off: 'pavise_wall', colors: PERSIAN, emblem: 'none', paint: {} }),
  xerxes: bp({ v: 1, id: 'xerxes', name: 'Xerxes', body: { type: 'average', skin: '#cf9a6c', hair: '#52382a' },
    head: { helm: 'royal_tiara', hair: 'short', face: 'beard_ringlets', eyes: '#222222' }, torso: { armor: 'none', tunic: 'royal_robe' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'scimitar', off: 'parma', colors: Object.assign({}, PERSIAN, { metal: 'gold' }), emblem: 'sun', paint: {} }),
  rider_cataphract: bp({ v: 1, id: 'rider_cataphract', name: 'Cataphract', body: { type: 'average', skin: '#cf9a6c', hair: '#2a1a10' },
    head: { helm: 'cataphract_helm', hair: 'short', face: 'none', eyes: '#222222' }, torso: { armor: 'scale_hauberk', tunic: 'none' }, legs: { armor: 'persian_trousers', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'kontos_pennon', off: 'buckler', colors: PERSIAN, emblem: 'none', paint: {} }),
  rider_camel: bp({ v: 1, id: 'rider_camel', name: 'Camel Rider', body: { type: 'average', skin: '#c08a5c', hair: '#2a1a10' },
    head: { helm: 'turban', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'persian_trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'scimitar_back', main: 'spear', off: 'none', colors: PERSIAN, emblem: 'none', paint: {} }),
  axe_thrower: bp({ v: 1, id: 'axe_thrower', name: 'Axe Thrower', body: { type: 'average', skin: '#e2b08a', hair: '#9a5a2a' },
    head: { helm: 'horned_fur_cap', hair: 'short', face: 'beard_braided', eyes: '#2a4a6a' }, torso: { armor: 'none', tunic: 'thrower_tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'axe_rack', main: 'francisca', off: 'throwing_axe', colors: BARB, emblem: 'none', paint: {} }),
  druid: bp({ v: 1, id: 'druid', name: 'Druid', body: { type: 'slim', skin: '#e0b090', hair: '#e8e8e8' },
    head: { helm: 'druid_hood', hair: 'long', face: 'beard_long', eyes: '#3a7a4a' }, torso: { armor: 'none', tunic: 'druid_robe' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'mistletoe_staff', off: 'golden_sickle', colors: BARB, emblem: 'none', paint: {} }),
  chieftain: bp({ v: 1, id: 'chieftain', name: 'Chieftain', body: { type: 'stocky', skin: '#dfae88', hair: '#8a3a1c' },
    head: { helm: 'horned_giant', hair: 'short', face: 'moustache_huge', eyes: '#2a4a6a' }, torso: { armor: 'horn_baldric', tunic: 'clan_tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'bearskin_short', back: 'none', main: 'war_club', off: 'none', colors: BARB, emblem: 'none', paint: {} }),
  minotaur: bp({ v: 1, id: 'minotaur', name: 'Minotaur', body: { type: 'stocky', skin: '#6b4a30', hair: '#3a2416' },
    head: { helm: 'minotaur_head', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'minotaur_harness', tunic: 'minotaur_fur' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'greataxe_double', off: 'none', colors: MYTH, emblem: 'none', paint: {} }),
  cyclops: bp({ v: 1, id: 'cyclops', name: 'Cyclops', body: { type: 'stocky', skin: '#c89a6a', hair: '#8a5a30' },
    head: { helm: 'cyclops_face', hair: 'wild', face: 'none', eyes: '#3a8a4a' }, torso: { armor: 'none', tunic: 'cyclops_tunic' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'tree_club', off: 'boulder', colors: MYTH, emblem: 'none', paint: {} }),
  medusa: bp({ v: 1, id: 'medusa', name: 'Medusa', body: { type: 'slim', skin: '#6fa84a', hair: '#2f6a2a' },
    head: { helm: 'gorgon_hair', hair: 'bald', face: 'none', eyes: '#d8f04a' }, torso: { armor: 'none', tunic: 'gorgon_gown' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'gorgon_stole', cape: 'none', back: 'none', main: 'none', off: 'none', colors: MYTH, emblem: 'none', paint: {} }),
  rider_numidian: bp({ v: 1, id: 'rider_numidian', name: 'Numidian', body: { type: 'slim', skin: '#8a5a3a', hair: '#1a1210' },
    head: { helm: 'brow_band', hair: 'braids', face: 'none', eyes: '#2a1a0a' }, torso: { armor: 'sash_team', tunic: 'tunic' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'javelin_bundle', main: 'javelin', off: 'none', colors: PUNIC, emblem: 'none', paint: {} }),
  rider_hannibal: bp({ v: 1, id: 'rider_hannibal', name: 'Hannibal', body: { type: 'average', skin: '#b98660', hair: '#1a1210' },
    head: { helm: 'chalcidian', hair: 'short', face: 'eyepatch', eyes: '#222222' }, torso: { armor: 'thorax_bronze', tunic: 'tunic' }, legs: { armor: 'boots', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'spear', off: 'round_shield', colors: PUNIC, emblem: 'none', paint: {} }),
};
export const MODELS = {};
for (const id of Object.keys(BLUEPRINTS)) MODELS[id] = { kind: 'humanoid', blueprint: BLUEPRINTS[id] };
