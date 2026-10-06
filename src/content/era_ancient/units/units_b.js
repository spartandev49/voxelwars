// UNITS-B baseline (temporary): Persians, Barbarians, Mythic monsters, Carthaginian riders
const PERSIAN = { primary: '#6a3fb0', secondary: '#f0d57a', trim: '#2a3a7a', metal: 'steel', cloth: '#f0ece4' };
const BARB = { primary: '#2f7a3a', secondary: '#d9a05a', trim: '#4a3418', metal: 'iron', cloth: '#e6e2cc' };
const MYTH = { primary: '#d4a017', secondary: '#f6d850', trim: '#4a3418', metal: 'bronze', cloth: '#e8e0cc' };
const PUNIC = { primary: '#7a2a8a', secondary: '#dcdcdc', trim: '#2a1a30', metal: 'bronze', cloth: '#ece6ee' };
const bp = (o) => o;
export const BLUEPRINTS = {
  immortal: bp({ v: 1, id: 'immortal', name: 'Immortal', body: { type: 'average', skin: '#cf9a6c', hair: '#2a1a10' },
    head: { helm: 'persian_cap', hair: 'short', face: 'beard_curled', eyes: '#222222' }, torso: { armor: 'scale_mail', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'cloth_skirt' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'spear_pomegranate', off: 'wicker', colors: PERSIAN, emblem: 'none', paint: {} }),
  sparabara: bp({ v: 1, id: 'sparabara', name: 'Sparabara', body: { type: 'average', skin: '#cf9a6c', hair: '#2a1a10' },
    head: { helm: 'persian_cap', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'composite_bow', off: 'pavise', colors: PERSIAN, emblem: 'none', paint: {} }),
  xerxes: bp({ v: 1, id: 'xerxes', name: 'Xerxes', body: { type: 'average', skin: '#cf9a6c', hair: '#1a1210' },
    head: { helm: 'persian_tiara', hair: 'short', face: 'beard_curled', eyes: '#222222' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'scimitar', off: 'parma', colors: PERSIAN, emblem: 'sun', paint: {} }),
  rider_cataphract: bp({ v: 1, id: 'rider_cataphract', name: 'Cataphract', body: { type: 'average', skin: '#cf9a6c', hair: '#2a1a10' },
    head: { helm: 'persian_cap', hair: 'short', face: 'none', eyes: '#222222' }, torso: { armor: 'scale_mail', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'kontos', off: 'none', colors: PERSIAN, emblem: 'none', paint: {} }),
  rider_camel: bp({ v: 1, id: 'rider_camel', name: 'Camel Rider', body: { type: 'average', skin: '#c08a5c', hair: '#2a1a10' },
    head: { helm: 'none', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'spear', off: 'none', colors: PERSIAN, emblem: 'none', paint: {} }),
  axe_thrower: bp({ v: 1, id: 'axe_thrower', name: 'Axe Thrower', body: { type: 'average', skin: '#e2b08a', hair: '#9a5a2a' },
    head: { helm: 'horned_small', hair: 'short', face: 'beard_braided', eyes: '#2a4a6a' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'francisca', off: 'none', colors: BARB, emblem: 'none', paint: {} }),
  druid: bp({ v: 1, id: 'druid', name: 'Druid', body: { type: 'slim', skin: '#e0b090', hair: '#e8e8e8' },
    head: { helm: 'none', hair: 'long', face: 'beard_long', eyes: '#3a7a4a' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'mistletoe_staff', off: 'none', colors: BARB, emblem: 'none', paint: {} }),
  chieftain: bp({ v: 1, id: 'chieftain', name: 'Chieftain', body: { type: 'stocky', skin: '#dfae88', hair: '#8a3a1c' },
    head: { helm: 'horned_big', hair: 'short', face: 'moustache_huge', eyes: '#2a4a6a' }, torso: { armor: 'fur_pelt', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'fur', back: 'none', main: 'club_big', off: 'none', colors: BARB, emblem: 'none', paint: {} }),
  minotaur: bp({ v: 1, id: 'minotaur', name: 'Minotaur', body: { type: 'stocky', skin: '#7a5236', hair: '#3a2416' },
    head: { helm: 'bull_head', hair: 'bald', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'bare', skirt: 'cloth_skirt' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'greataxe_double', off: 'none', colors: MYTH, emblem: 'none', paint: {} }),
  cyclops: bp({ v: 1, id: 'cyclops', name: 'Cyclops', body: { type: 'stocky', skin: '#c89a6a', hair: '#3a2416' },
    head: { helm: 'cyclops_head', hair: 'wild', face: 'none', eyes: '#3a7a4a' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'club_big', off: 'none', colors: MYTH, emblem: 'none', paint: {} }),
  medusa: bp({ v: 1, id: 'medusa', name: 'Medusa', body: { type: 'slim', skin: '#6fa84a', hair: '#2f6a2a' },
    head: { helm: 'snake_hair', hair: 'bald', face: 'none', eyes: '#d8f04a' }, torso: { armor: 'none', tunic: 'robe' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'none', off: 'none', colors: MYTH, emblem: 'none', paint: {} }),
  rider_numidian: bp({ v: 1, id: 'rider_numidian', name: 'Numidian', body: { type: 'slim', skin: '#8a5a3a', hair: '#1a1210' },
    head: { helm: 'none', hair: 'braids', face: 'none', eyes: '#2a1a0a' }, torso: { armor: 'none', tunic: 'tunic' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'javelin_bundle', main: 'javelin', off: 'none', colors: PUNIC, emblem: 'none', paint: {} }),
  rider_hannibal: bp({ v: 1, id: 'rider_hannibal', name: 'Hannibal', body: { type: 'average', skin: '#b98660', hair: '#1a1210' },
    head: { helm: 'chalcidian', hair: 'short', face: 'eyepatch', eyes: '#222222' }, torso: { armor: 'thorax_bronze', tunic: 'tunic' }, legs: { armor: 'boots', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'spear', off: 'round_shield', colors: PUNIC, emblem: 'none', paint: {} }),
};
export const MODELS = {};
for (const id of Object.keys(BLUEPRINTS)) MODELS[id] = { kind: 'humanoid', blueprint: BLUEPRINTS[id] };
