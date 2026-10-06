// Soldier name generator (owner: HUMOR). Pure; pass an rng (function returning [0,1) or an object with next()).
// "Sir Leonidas the Mildly Concerned", "Probably Marcus Who Forgot His Shield", "Dame Boudicca of the Second Lunch".

export const TITLES = {
  m: ['Sir', 'Lord', 'Citizen', 'Admiral', 'Doctor', 'Probably', 'Captain', 'Professor', 'Magistrate', 'Honorary', 'Technically', 'Private'],
  f: ['Dame', 'Lady', 'Citizen', 'Admiral', 'Doctor', 'Probably', 'Captain', 'Professor', 'Magistrate', 'Honorary', 'Technically', 'Private'],
};

// Mixed culture pools. Names are historical or mythic given names, used affectionately; no culture is the butt of a joke.
export const FIRST_NAMES = {
  greek: {
    m: ['Leonidas', 'Themistocles', 'Alcibiades', 'Nikias', 'Demetrios', 'Lysander', 'Pericles', 'Kleon', 'Archelaos', 'Damon', 'Xenon', 'Philon', 'Hippias', 'Aristo', 'Kallias'],
    f: ['Phoebe', 'Calliope', 'Theodora', 'Thais', 'Thaleia', 'Melina', 'Zoe', 'Lysistrata', 'Artemisia', 'Penelope'],
  },
  latin: {
    m: ['Marcus', 'Gaius', 'Lucius', 'Cassius', 'Quintus', 'Titus', 'Publius', 'Septimus', 'Decimus', 'Varro', 'Sulla', 'Flavius', 'Brutus', 'Maximus', 'Cato'],
    f: ['Livia', 'Octavia', 'Flavia', 'Julia', 'Aurelia', 'Valeria', 'Tullia', 'Claudia', 'Cornelia', 'Agrippina'],
  },
  egyptian: {
    m: ['Khaemwaset', 'Senusret', 'Amunhotep', 'Ramose', 'Nakht', 'Imhotep', 'Ahmose', 'Nebamun', 'Pentaur', 'Horemheb', 'Merenptah', 'Setnakht'],
    f: ['Nefertari', 'Ankhesen', 'Hatshepsut', 'Meryt', 'Tiye', 'Nitocris', 'Sitamun', 'Bakenmut'],
  },
  persian: {
    m: ['Darius', 'Cyrus', 'Bagoas', 'Hystaspes', 'Tigranes', 'Farnaces', 'Arsames', 'Mardonius', 'Artabanus', 'Orontes', 'Pharnaces', 'Xerxes'],
    f: ['Roxana', 'Parysatis', 'Shirin', 'Atossa', 'Amestris', 'Statira', 'Apama'],
  },
  celtic: {
    m: ['Vercingetorix', 'Brennus', 'Cathbad', 'Cunobelin', 'Caradoc', 'Fergus', 'Bran', 'Tasgetius', 'Morcant', 'Diarmuid', 'Cormac'],
    f: ['Boudicca', 'Rhiannon', 'Cartimandua', 'Brigid', 'Eithne', 'Ceridwen', 'Ailbe', 'Medb'],
  },
};

export const EPITHETS = [
  'the Mildly Concerned',
  'of the Second Lunch',
  'Who Forgot His Shield',
  'the Unbothered',
  'Slayer of Chickens (Allegedly)',
  'the Late',
  'the Punctual (Once)',
  'Defender of the Nearest Snack',
  'of Slightly Higher Ground',
  'the Underpaid',
  'Who Brought the Wrong Spear',
  'Who Asked for a Raise',
  'the Frequently Surrounded',
  'Who Has a Cousin',
  'the Reasonably Terrifying',
  'Collector of Mildly Interesting Rocks',
  'the Unexpectedly Flammable',
  'of the Left Flank (Mostly)',
  'Who Was Promised Grapes',
  'Who Cannot Swim',
  'the Not Yet Dead',
  'the Considerably Wounded',
  'the Fashionably Late',
  'Friend of Goats',
  'Who Read the Terms',
  'of the Disputed Boundary',
  'the Mildly Heroic',
  'Brave Under Supervision',
  'Who Did Not Sign That',
  'the Overtrained',
  'the Quietly Terrified',
  'Whom the Goat Respects',
  'Who Lost the Map',
  'the Almost Veteran',
  'of the Wrong Hill',
  'the Spear-Adjacent',
  'Whose Mother Is Disappointed',
  'Who Once Saw a Chicken',
  'Third Cousin of a General',
  'the Delightfully Confused',
  'Slayer of Several Bushes',
  'of Roughly That Region',
  'the Chronically Optimistic',
  'Who Was in the Back',
  'the Surprisingly Polite',
  'of the Pottery Evening',
  'Who Brings Snacks to Sieges',
  'the Cautiously Optimistic',
  'the Great (By Local Standards)',
  'the Quite Good at Retreating',
  'Warden of the Nearest Rock',
  'the Surprised',
  'of Many Excuses',
  'the Unexpectedly Tall',
  'the Slightly Flattened',
  'Who Knows a Guy',
  'the Underqualified',
  'of the Tenth Row',
  'the Seventh Choice',
  'Who Throws Pots Politely',
  'the Honorary Philosopher',
  'Who Has Seen the Ending',
  'of the Free Grapes',
  'Who Never Asked for This',
  'the Overpaid (By Himself)',
  'Collector of Helmets (Not His)',
];

// ---------- pure helpers ----------
function rnd(rng) { return typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0; }
function pick(rng, arr) { return arr[Math.min(arr.length - 1, Math.floor(rnd(rng) * arr.length))]; }

export const CULTURES = Object.keys(FIRST_NAMES);

/**
 * randomNameParts(rng, opts?) -> { title, first, epithet, culture, gender }
 * opts: { title: probability 0..1 (default 0.35), epithet: probability (default 0.6), culture, gender:'m'|'f' }
 */
export function randomNameParts(rng, opts) {
  const o = opts || {};
  const culture = o.culture || pick(rng, CULTURES);
  const gender = o.gender || (rnd(rng) < 0.5 ? 'm' : 'f');
  const first = pick(rng, FIRST_NAMES[culture][gender]);
  const title = rnd(rng) < (o.title === undefined ? 0.35 : o.title) ? pick(rng, TITLES[gender]) : null;
  const epithet = rnd(rng) < (o.epithet === undefined ? 0.6 : o.epithet) ? pick(rng, EPITHETS) : null;
  return { title, first, epithet, culture, gender };
}

/** "Sir Leonidas the Mildly Concerned". */
export function randomName(rng, opts) {
  const p = randomNameParts(rng, opts);
  return [p.title, p.first, p.epithet].filter(Boolean).join(' ');
}
