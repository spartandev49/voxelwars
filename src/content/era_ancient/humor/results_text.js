// Results screen copy (owner: HUMOR): banners, funny stat labels, MVP wording. COORD builds ResultsData.funnyStats as [{label, value}]
// from the battle summary; the label for each stat key comes from here so the same number can be worded several ways.
// Keys match the BattleSummary in docs/lifetime_stats.md. Show only stats whose value is > 0 (except the always-on ones marked `always`).

export const BANNERS = {
  victory: ['VICTORY', 'GLORY', 'WINNER, WINNER'],
  defeat: ['DEFEAT', 'REGRETTABLE', 'WELL, THAT HAPPENED'],
  draw: ['DRAW', 'NOBODY WINS', 'ZEUS WENT HOME'],
};

export const SUBLINES = {
  victory: [
    'The Terms of Conquest have been satisfied.',
    'Somebody fetch the grapes.',
    'The wall of fame has one more brick.',
  ],
  defeat: [
    'Cassandra would like a word.',
    'The rematch button is right there.',
    'Next time, a slightly different plan.',
  ],
  draw: [
    'The gods left early.',
    'Both sides claim moral victory.',
  ],
};

// Each stat has three wordings; the screen picks one with a seeded ui rng. `always` stats are shown even at zero.
export const RESULT_LABELS = {
  kills: { always: true, labels: [
    'Soldiers inconvenienced',
    'Enemies sent home early',
    'Opponents who will not be at dinner',
  ] },
  losses: { always: true, labels: [
    'Friends lost to enthusiasm',
    'Drachmae spent on funerals',
    'Soldiers retired from the rota',
  ] },
  damage: { labels: [
    'Damage dealt, in bruises',
    'Imaginary bruises delivered',
    'Hit points redistributed',
  ] },
  friendlyKills: { labels: [
    'Friends accidentally stabbed',
    'Allies reclassified as enemies',
    'Own goals, spear edition',
  ] },
  chickenKills: { labels: [
    'Kills by chicken',
    'Poultry-related fatalities',
    'Kills credited to a hen',
  ] },
  goatKills: { labels: [
    'Goat kills',
    'Credit stolen from the goat',
    'The goat did this',
  ] },
  kicks: { labels: [
    'Dignity punted',
    'Enemies given flying lessons',
    'Soldiers sent to the horizon',
  ] },
  trampleKills: { labels: [
    'Soldiers used as doormats',
    'Stepped on by something large',
    'Footprints with consequences',
  ] },
  stoned: { labels: [
    'New garden statues',
    'Soldiers turned to art',
    'Medusa\'s gallery additions',
  ] },
  misfires: { labels: [
    'Crew members launched',
    'Colleagues catapulted',
    'Workers promoted to projectiles',
  ] },
  cyclopsMisses: { labels: [
    'Boulders thrown at nothing',
    'Depth perception failures',
    'Excellent throws at the wrong place',
  ] },
  longestStreak: { labels: [
    'Longest kill streak',
    'Best run of one soldier being busy',
    'Longest streak of competence',
  ] },
  shieldBlocks: { labels: [
    'Blocks that justified the shield',
    'Hits stopped by bronze',
    'Times a shield earned its pay',
  ] },
  arrowsFired: { labels: [
    'Arrows donated to the soil',
    'Arrows launched at the general area',
    'Arrows that found someone',
  ] },
  boulders: { labels: [
    'Boulders delivered',
    'Rocks with opinions',
    'Landscaping by catapult',
  ] },
  routs: { labels: [
    'Soldiers who left the building',
    'Retreats called "repositioning"',
    'Soldiers who remembered an appointment elsewhere',
  ] },
  revives: { labels: [
    'Immortals who were not',
    'Second chances, once',
    'Asterisks honoured',
  ] },
  heroKills: { labels: [
    'Heroes retired early',
    'Statues that needed a sculptor',
    'Statues postponed',
  ] },
  bribes: { labels: [
    'Soldiers bought',
    'Loyalty purchased',
    'Coins well spent',
  ] },
  duration: { always: true, labels: [
    'Duration of regret',
    'Time the sponsors were nervous',
    'Length of the argument',
  ] },
  survivorsCost: { labels: [
    'Drachmae still standing',
    'Money left on the field',
    'Drachmae still on their feet',
  ] },
  wasted: { labels: [
    'Budget never spent',
    'Drachmae that sat out the battle',
    'Unspent drachmae, looking sheepish',
  ] },
};

export const MVP = {
  title: ['Most Valuable Soldier', 'Employee of the Battle', 'The One the Sculptor Will Choose'],
  none: 'Nobody stood out. Everybody stood in the way.',
  killsLine: '{name}: {n} kills. The sculptor has been called.',
};

function rnd(rng) { return typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0; }
const pickFrom = (arr, rng) => arr[Math.floor(rnd(rng) * arr.length) % arr.length];

/** A label for a stat key, or null when the key has no wording. */
export function resultLabel(key, rng) { const e = RESULT_LABELS[key]; return e ? pickFrom(e.labels, rng) : null; }
export function banner(kind, rng) { return pickFrom(BANNERS[kind] || BANNERS.victory, rng); }
export function subline(kind, rng) { return pickFrom(SUBLINES[kind] || SUBLINES.victory, rng); }
export function mvpTitle(rng) { return pickFrom(MVP.title, rng); }
