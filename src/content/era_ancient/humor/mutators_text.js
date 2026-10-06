// Names and descriptions for the 9 mutators (spec 14; rules live in sim/mutators.js, which SIM owns). This file only words them:
// the descriptions say what the mutator does in plain terms first, then wink. Numbers are kept out on purpose so SIM can retune without editing copy.
// Shape: { id, name, desc, short (<= 6 words, chip label), locked (hint shown while locked) }

export const MUTATORS_TEXT = [
  {
    id: 'big_heads', name: 'Big Heads',
    desc: 'Every head is twice the size, and easier to hit. Helmets are now a serious investment.',
    short: 'Heads double, crits up',
    locked: 'Locked. Win a few campaign stars and your ego will grow to match.',
  },
  {
    id: 'tiny_titans', name: 'Tiny Titans',
    desc: 'Everyone shrinks, speeds up and gets a little sturdier. Monsters stay furious, just closer to eye level.',
    short: 'Everyone small and quick',
    locked: 'Locked. Earn more stars and the titans will stop being so big about it.',
  },
  {
    id: 'moon_gravity', name: 'Moon Gravity',
    desc: 'Knockback is tripled. Hits send soldiers flying, and they land slowly, with dignity.',
    short: 'Knockback x3',
    locked: 'Locked. Earn stars to leave the ground.',
  },
  {
    id: 'chicken_rain', name: 'Chicken Rain',
    desc: 'Sacred chickens fall from the sky now and then, and they side with whoever is losing. Nobody ordered them.',
    short: 'Chickens help the losing side',
    locked: 'Locked. Win more campaign stars. The forecast is poultry.',
  },
  {
    id: 'wine_rain_always', name: 'Wine Rain Always',
    desc: 'It rains wine all battle. Soldiers keep getting tipsy, wander about and fight worse. Nobody complains.',
    short: 'Always tipsy',
    locked: 'Locked. Earn stars. The clouds are saving up.',
  },
  {
    id: 'friendly_fire_fiesta', name: 'Friendly Fire Fiesta',
    desc: 'Friendly fire is on, and every arrow is invited. Spread out. Pray. Spread out again.',
    short: 'Friendly fire on',
    locked: 'Locked. Collect stars. Invitations are being written.',
  },
  {
    id: 'speedy_soldiers', name: 'Speedy Soldiers',
    desc: 'Everyone moves much faster. Battles end sooner and regrets arrive earlier.',
    short: 'Everyone faster',
    locked: 'Locked. Earn stars. Please hurry.',
  },
  {
    id: 'ragdoll_frenzy', name: 'Ragdoll Frenzy',
    desc: 'Every hit sends soldiers flying and staggering. Dignity is optional and mostly missing.',
    short: 'Every hit floors them',
    locked: 'Locked. Earn stars, and then lie down.',
  },
  {
    id: 'glass_cannons', name: 'Glass Cannons',
    desc: 'Everyone hits much harder and has half the hit points. Battles are short and extremely educational.',
    short: 'Big hits, half the hp',
    locked: 'Locked. Earn stars. Handle with care.',
  },
];

export const MUTATOR_IDS = MUTATORS_TEXT.map((m) => m.id);
export function mutatorText(id) { return MUTATORS_TEXT.find((m) => m.id === id) || null; }
export const MUTATORS_HEADING = { title: 'Mutators', blurb: 'Rule twists unlocked by campaign stars. They stack, and so does the chaos.' };
