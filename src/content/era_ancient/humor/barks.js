// Speech-bubble barks (owner: HUMOR). Short (<= 10 words), per unit class (UnitDef.role) and state, plus status barks and fallbacks.
// Unit-specific death quotes and taunts live in units_text.js; these are the class-level lines the bubble pool draws from at low frequency
// (spec: max 1 bubble per 1.2 s globally, heroes and bosses always). States: engage (first contact), hurt, rout, cheer (victory).

export const ROLES = ['melee', 'ranged', 'cavalry', 'siege', 'support', 'hero', 'monster', 'swarm', 'beast'];
export const STATES = ['engage', 'hurt', 'rout', 'cheer'];

export const BARKS = {
  melee: {
    engage: [
      'Contact! Mostly contact!',
      'I was told there would be lunch.',
      'Remember: pointy end forward.',
    ],
    hurt: [
      'That was my good shield arm.',
      'I felt that in my pension.',
      'Ow. Duly noted.',
    ],
    rout: [
      'Tactical walking!',
      'Not running! Advancing backwards!',
      'Somebody else can have the shield!',
    ],
    cheer: [
      'We won! Did we win?',
      'Tell my mother I was brave.',
    ],
  },
  ranged: {
    engage: [
      'Nock. Aim. Hope.',
      'Somebody is standing in front of my target.',
    ],
    hurt: [
      'Hey! I am the one at the back!',
      'Archer down! Slightly!',
    ],
    rout: [
      'Out of arrows! Out of bravery!',
      'Running is also ranged!',
    ],
    cheer: [
      'I counted three. Maybe four.',
      'Who aimed that? Me. I did.',
    ],
  },
  cavalry: {
    engage: [
      'Charge! Horse, you are in charge!',
      'Hold on, hold on, hold on!',
    ],
    hurt: [
      'Horse! Do not stop!',
      'That was a SPEAR!',
    ],
    rout: [
      'The horse has decided to leave.',
      'We are not retreating. The horse is.',
    ],
    cheer: [
      'Good horse! Best horse!',
      'I did that. The horse helped.',
    ],
  },
  siege: {
    engage: [
      'Load! Aim! Pray!',
      'Mind the colleagues!',
    ],
    hurt: [
      'Not the wheel! Anything but the wheel!',
      'Crew! Where is the crew?',
    ],
    rout: [
      'Abandon the engine!',
      'It is slow. I am faster. Goodbye.',
    ],
    cheer: [
      'Another successful experiment!',
      'Physics works!',
    ],
  },
  support: {
    engage: [
      'I am only here to help. Mostly.',
      'Stay close. I have snacks and spells.',
    ],
    hurt: [
      'I am a non-combatant! In theory!',
      'Healers are people too!',
    ],
    rout: [
      'Medic! Somebody! Me!',
      'This is above my pay grade!',
    ],
    cheer: [
      'See? Talking works.',
      'Everyone drink something.',
    ],
  },
  hero: {
    engage: [
      'Follow me! Closely! Not that closely!',
      'Forward! I will be right behind. In front.',
    ],
    hurt: [
      'A scratch. A noble scratch.',
      'Do not let them see me bleed. Too late.',
    ],
    rout: [
      'A strategic repositioning!',
      'Retreat! I mean: reposition! Retreat!',
    ],
    cheer: [
      'Statues for everyone!',
      'I planned that. Mostly.',
    ],
  },
  monster: {
    engage: [
      'Ahem. SMASH.',
      'Smash first, introductions later.',
    ],
    hurt: [
      'Ow. That was rude.',
      'Do you know how big I am?!',
    ],
    rout: [
      'I am big, not stupid!',
      'This was not in the brochure!',
    ],
    cheer: [
      'Fun! Again!',
      'Everyone is smaller now.',
    ],
  },
  swarm: {
    engage: [
      'BAWK!',
      'Bawk bawk BAWK!',
    ],
    hurt: [
      'BWAAK?!',
      'Feathers! Everywhere!',
    ],
    rout: [
      'Bock bock bock bock!',
      'Cluck and run!',
    ],
    cheer: [
      'Bawk! (We won. Corn?)',
      'Cluck! (Tell the farmer.)',
    ],
  },
  beast: {
    engage: [
      'WOOF!',
      'Baaah!',
    ],
    hurt: [
      'Yip!',
      'Baa-aah!',
    ],
    rout: [
      'Awoooo. (Going home.)',
      'Maaa, maaa, maaa!',
    ],
    cheer: [
      'Woof! (Who is a good boy?)',
      'Baaah! (Called it.)',
    ],
  },
};

// Bubbles shown on units under a status effect.
export const STATUS_BARKS = {
  confuse: [
    'But what is a sword, truly?',
    'Why am I here? Why is here?',
    'If I swing and nobody dodges...',
    'Is the shield defending me, or I it?',
    'I forgot what I was angry about.',
    'What if the spear is the real soldier?',
  ],
  sleep: [
    'Zzz... the aqueduct bill...',
    'Zzz... I move to adjourn...',
    'Zzz... all in favour... zzz.',
    'Zzz... clause four, subsection...',
  ],
  tipsy: [
    'Hic! Which army am I?',
    'Hic! Everything is purple!',
    'I love you, enemy! Hic!',
    'Hic! Wine! In battle! Hic!',
    'Where is shpear? Shpear?',
  ],
  stone: [
    '...',
    'I cannot feel my everything.',
  ],
  bribed: [
    'Money talks. It said: change sides.',
    'Nothing personal. It was a lot of coins.',
    'I was never loyal. Sorry.',
  ],
  panic: [
    'Everything is on fire!',
    'Run! Run! Everybody run!',
  ],
  burn: [
    'Hot! Hot! Hot!',
    'Roll! No, not like that!',
  ],
};

// Philosopher monologue bubbles (said by the philosopher while channelling confusion).
export const MONOLOGUE = [
  'Consider: the sword is also considering you.',
  'What is courage but fear with good posture?',
  'Is a battle won by the strong, or merely the remaining?',
  'To fight, or to define fighting? Both! Neither!',
  'If you stab me, are you also stabbing a metaphor?',
  'First, what is a hill? Second, why is it ours?',
];

// Fallbacks for custom soldiers and any unit with no text of its own.
export const GENERIC_DEATHS = [
  'Tell them I was somebody.',
  'That was not in the training manual.',
  'I should have specialised in running.',
  'I regret everything except the hat.',
  'Is that the afterlife? It looks like a field.',
  'Remember me. Or at least my sandal.',
];
export const GENERIC_TAUNTS = [
  'You will regret this. Probably me.',
  'Come on then. Gently.',
];

function rnd(rng) { return typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0; }
const pickFrom = (arr, rng) => arr[Math.floor(rnd(rng) * arr.length) % arr.length];

/** A class-level bark. Falls back to melee for unknown roles. */
export function barkFor(role, state, rng) {
  const r = BARKS[role] || BARKS.melee;
  const arr = r[state] || r.engage;
  return pickFrom(arr, rng);
}
export function statusBark(status, rng) { const a = STATUS_BARKS[status]; return a ? pickFrom(a, rng) : null; }
export function monologueBark(rng) { return pickFrom(MONOLOGUE, rng); }
export function genericDeath(rng) { return pickFrom(GENERIC_DEATHS, rng); }
export function genericTaunt(rng) { return pickFrom(GENERIC_TAUNTS, rng); }
