// T0 humanoid models (Hellenes, Romans, Egyptians, Barbarians + the riders that BEASTS seats on horses).
// MODELS[id] = ModelSpec {kind:'humanoid', blueprint}; BLUEPRINTS[id] = the bare blueprint (what BEASTS reads for rider_*).
// Tint surfaces (spec decisions D2, U3 measured by tools/tintcheck.mjs): see the `tint` note next to each blueprint.

const bp = (o) => o;
const HELLENE = { primary: '#c8453c', secondary: '#f2d36b', trim: '#4a2f1c', metal: 'bronze', cloth: '#ece6d4' };

export const BLUEPRINTS = {
  // tint: crest, chiton (whole), shield rim + boss ring
  hoplite: bp({
    v: 1, id: 'hoplite', name: 'Hoplite', body: { type: 'average', skin: '#e0ac84', hair: '#4a3426' },
    head: { helm: 'corinthian', hair: 'short', face: 'stubble', eyes: '#222222' }, torso: { armor: 'none', tunic: 'chiton' }, legs: { armor: 'greaves_bronze', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'dory', off: 'hoplon', colors: HELLENE, emblem: 'lambda', paint: {},
  }),
  // tint: transverse crest, cloak, skirt, shield rim
  spartan: bp({
    v: 1, id: 'spartan', name: 'Spartan', body: { type: 'stocky', skin: '#d79e74', hair: '#4a3020' },
    head: { helm: 'corinthian_transverse', hair: 'short', face: 'beard_short', eyes: '#222222' }, torso: { armor: 'none', tunic: 'none' }, legs: { armor: 'greaves_bronze', skirt: 'cloth_skirt' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'dory', off: 'hoplon', colors: HELLENE, emblem: 'lambda', paint: {},
  }),
  // tint: sash, tunic hem, quiver fletching
  cretan_archer: bp({
    v: 1, id: 'cretan_archer', name: 'Cretan Archer', body: { type: 'slim', skin: '#d9a47c', hair: '#3a2416' },
    head: { helm: 'leather_cap', hair: 'short', face: 'stubble', eyes: '#2a3a2a' }, torso: { armor: 'sash_team', tunic: 'tunic' }, legs: { armor: 'wraps', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'quiver', main: 'composite_bow', off: 'none', colors: Object.assign({}, HELLENE, { trim: '#5a3a1c' }), emblem: 'none', paint: {},
  }),
  // tint: tunic hem, helmet crest-less galea (tinted tunic + shield rim)
  legionary: bp({
    v: 1, id: 'legionary', name: 'Legionary', body: { type: 'average', skin: '#e2b08a', hair: '#3a2a1a' },
    head: { helm: 'galea_crest', hair: 'short', face: 'none', eyes: '#2a2a2a' }, torso: { armor: 'lorica_segmentata', tunic: 'tunic' }, legs: { armor: 'caligae', skirt: 'pteruges' },
    shoulders: 'scarf', cape: 'short', back: 'none', main: 'gladius', off: 'scutum', colors: { primary: '#a8322a', secondary: '#e8c15a', trim: '#3a2418', metal: 'steel', cloth: '#ece4d4' }, emblem: 'bolt', paint: {},
  }),
  // tint: kilt, shield, apron
  medjay: bp({
    v: 1, id: 'medjay', name: 'Medjay', body: { type: 'average', skin: '#a56a45', hair: '#151210' },
    head: { helm: 'none', hair: 'wig_bob', face: 'none', eyes: '#222222' }, torso: { armor: 'none', tunic: 'linen_kilt' }, legs: { armor: 'sandals', skirt: 'none' },
    shoulders: 'armbands', cape: 'none', back: 'none', main: 'spear', off: 'hide_shield', colors: { primary: '#1f8f8a', secondary: '#e8c15a', trim: '#3a2a1a', metal: 'bronze', cloth: '#f0ead8' }, emblem: 'none', paint: {},
  }),
  // tint: feathers, kilt, quiver
  nubian_archer: bp({
    v: 1, id: 'nubian_archer', name: 'Nubian Archer', body: { type: 'slim', skin: '#7a4a2e', hair: '#2a1a10' },
    head: { helm: 'feather_band', hair: 'curly', face: 'none', eyes: '#2a1a0a' }, torso: { armor: 'sash_leopard', tunic: 'linen_kilt' }, legs: { armor: 'bare', skirt: 'none' },
    shoulders: 'armbands', cape: 'none', back: 'quiver', main: 'longbow', off: 'none', colors: { primary: '#1f8f8a', secondary: '#e8c15a', trim: '#3a2a1a', metal: 'bronze', cloth: '#f0ead8' }, emblem: 'none', paint: {},
  }),
  // tint: war paint (woad swirls take the team colour), leg wraps
  berserker: bp({
    v: 1, id: 'berserker', name: 'Berserker', body: { type: 'stocky', skin: '#d9a888', hair: '#8a4a1c' },
    head: { helm: 'wolf_hood', hair: 'wild', face: 'beard_short', eyes: '#2a4a6a' }, torso: { armor: 'none', tunic: 'bare_warpaint' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'greataxe', off: 'none', colors: { primary: '#2f7a3a', secondary: '#d9a05a', trim: '#3a2a14', metal: 'iron', cloth: '#e6e2cc' }, emblem: 'none', paint: {},
  }),
  // riders (BEASTS seats them): tint = plume, linen cuirass, cloak, shield rim
  rider_companion: bp({
    v: 1, id: 'rider_companion', name: 'Companion', body: { type: 'average', skin: '#dba67e', hair: '#3a2a1a' },
    head: { helm: 'boeotian', hair: 'short', face: 'none', eyes: '#222222' }, torso: { armor: 'linothorax', tunic: 'tunic' }, legs: { armor: 'boots', skirt: 'none' },
    shoulders: 'none', cape: 'long', back: 'none', main: 'xyston', off: 'buckler', colors: HELLENE, emblem: 'star', paint: {},
  }),
  rider_equites: bp({
    v: 1, id: 'rider_equites', name: 'Eques', body: { type: 'average', skin: '#e0ac84', hair: '#3a2a1a' },
    head: { helm: 'montefortino', hair: 'short', face: 'none', eyes: '#222222' }, torso: { armor: 'chainmail', tunic: 'tunic' }, legs: { armor: 'trousers', skirt: 'none' },
    shoulders: 'scarf', cape: 'short', back: 'none', main: 'spear', off: 'parma', colors: { primary: '#a8322a', secondary: '#e8c15a', trim: '#3a2418', metal: 'steel', cloth: '#ece4d4' }, emblem: 'bolt', paint: {},
  }),
};

export const MODELS = {};
for (const id of Object.keys(BLUEPRINTS)) MODELS[id] = { kind: 'humanoid', blueprint: BLUEPRINTS[id] };
