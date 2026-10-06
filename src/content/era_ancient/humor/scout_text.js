// Scout report wording for the placement screen (owner: HUMOR; thresholds and codes live in sim/armygen.js scoutReport).
// Shape: SCOUT_TEXT[code] = { who, text, variants: [{ who, text }, ...] }. `text` is the default (1-2 sentences, TRUE advice about the counter);
// COORD shows `text`, or picks a variant for flavour. The advice matches the rules: spears stop charges, siege cannot hit what is close,
// shields do not cover the back, aoe punishes clusters, fire frightens elephants, heroes and priests keep the army fighting.

export const SCOUT_TEXT = {
  no_anti_cav: {
    who: 'cassandra',
    text: 'They have cavalry and you have almost no spears. Spearmen standing still stop a charge, so add some and hold them in place.',
    variants: [
      { who: 'brutus', text: 'HORSES incoming and not a spear in sight! Hoplites standing still make a charge think twice. So should you.' },
      { who: 'plato', text: 'A horse will not run onto a wall of spears. Is that wisdom or only sense? Either way, bring spears.' },
    ],
  },
  exposed_archers: {
    who: 'brutus',
    text: 'Your archers are in the open and the other side has cavalry! Put a spear line in front of them and keep the bows behind it.',
    variants: [
      { who: 'plato', text: 'Archers are brave only at a distance. Place spearmen between them and the horses, and the distance will hold.' },
      { who: 'cassandra', text: 'Horses reach archers faster than archers reach horses. A spear line in front fixes that.' },
    ],
  },
  no_ranged: {
    who: 'plato',
    text: 'You have no ranged units, and this enemy has few shields. Archers and javelins hurt anyone who cannot hide behind one.',
    variants: [
      { who: 'brutus', text: 'Not one archer! The enemy can walk up in the open and enjoy it. Bring some bows, or some javelins!' },
      { who: 'cassandra', text: 'You will wait for them to arrive, and they will arrive with all their health. Add a few arrows.' },
    ],
  },
  no_cavalry: {
    who: 'cassandra',
    text: 'The enemy shoots a lot and you have no horses. Cavalry covers the distance faster than archers can punish it.',
    variants: [
      { who: 'brutus', text: 'ARCHERS everywhere and no riders to ride them down! A few horsemen would fix that quickly.' },
      { who: 'plato', text: 'Footsoldiers cross a field of arrows slowly. Horses cross it quickly. You may draw your own conclusion.' },
    ],
  },
  siege_exposed: {
    who: 'brutus',
    text: 'Their siege engines are slow and cannot hit anything close. Send cavalry to reach them before the crew finishes reloading!',
    variants: [
      { who: 'cassandra', text: 'Catapults and ballistae are helpless at short range. A horse is the shortest range there is.' },
      { who: 'plato', text: 'The engine kills what is far and fears what is near. Is cavalry not the nearest thing of all?' },
    ],
  },
  blob_vs_ranged: {
    who: 'plato',
    text: 'A tight block of infantry under arrows and boulders suffers together. Spread a little, or send cavalry and skirmishers at the shooters.',
    variants: [
      { who: 'brutus', text: 'A big beautiful BLOB of soldiers! Boulders adore a big beautiful blob. Spread out, or hit the shooters first!' },
      { who: 'cassandra', text: 'They will drop a boulder on the middle of your crowd. Do not be in the crowd.' },
    ],
  },
  monster_incoming: {
    who: 'cassandra',
    text: 'A very large monster is on the other side. Focus your fire, keep spearmen near, and use flames if it is an elephant or a wooden horse.',
    variants: [
      { who: 'brutus', text: 'A MONSTER! It is large, it is angry, and it has not been introduced. Focus fire on it, and bring torches for elephants!' },
      { who: 'plato', text: 'Size is not a defence against many hands. Focus your blows on the one great body.' },
    ],
  },
  no_support: {
    who: 'plato',
    text: 'You have no healers and no officers. A priest mends four allies at a time, and a commander lifts damage and morale around him.',
    variants: [
      { who: 'brutus', text: 'Nobody to heal, nobody to shout! Add a priest or a hero, and the army fights like it matters!' },
      { who: 'cassandra', text: 'Without someone to rally them, they will break first. It does not take much to prevent it.' },
    ],
  },
  one_note: {
    who: 'brutus',
    text: 'Your army is mostly one kind of unit! A mixed army has an answer to more problems. Add something that is not that.',
    variants: [
      { who: 'plato', text: 'An army of one kind has one strength and one weakness, and the enemy only needs to find the second.' },
      { who: 'cassandra', text: 'They will bring the one thing your army cannot answer. Mix it up and be ready.' },
    ],
  },
};

export const SCOUT_CODES = Object.keys(SCOUT_TEXT);
export function scoutText(code, rng) {
  const e = SCOUT_TEXT[code];
  if (!e) return null;
  const r = typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : -1;
  if (r < 0 || !e.variants || !e.variants.length) return { who: e.who, text: e.text };
  const all = [{ who: e.who, text: e.text }].concat(e.variants);
  return all[Math.floor(r * all.length) % all.length];
}
