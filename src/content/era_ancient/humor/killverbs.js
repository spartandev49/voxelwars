// Kill-feed verbs per cause (owner: HUMOR). The feed composes "<killer> <verb> <victim>" from `by`,
// so every `by` entry is a transitive phrase that takes the victim as its object ("Hoplite politely disagreed with Immortal").
// When nobody did it (environment, falls) it composes "<victim> <solo>" from `solo` ("Hoplite stood in lava").
// Causes are exactly the unit_kill.cause values of spec 8.2. Every cause has >= 6 `by` verbs; environmental causes also have >= 3 `solo`.

export const KILL_VERBS = {
  melee: { by: [
    'bonked',
    'perforated',
    'politely disagreed with',
    'mildly inconvenienced',
    'philosophised at',
    'skewered',
    'ended a long argument with',
    'gave a stern talking-to to',
    'retired',
    'made a point to',
    'cancelled the plans of',
    'had the last word with',
    'downsized',
    'gently corrected',
  ] },
  ranged: { by: [
    'sniped',
    'plinked',
    'sent a strongly worded arrow to',
    'aimed vaguely at, and then hit,',
    'pin-cushioned',
    'mailed a feather to',
    'lodged a missile in',
    'posted a reply to',
    'shot an opinion into',
    'gifted a javelin to',
    'delivered an arrow to',
    'introduced an arrow to',
  ] },
  aoe: { by: [
    'redecorated',
    'bowled over',
    'cleared the neighbourhood of',
    'evicted, with a boulder,',
    'cratered',
    'dropped a rock on',
    'flattened',
  ] },
  fire: { by: [
    'flambeed',
    'toasted',
    'gave a warm reception to',
    'overcooked',
    'turned up the heat on',
    'baked',
    'raised the temperature of',
  ], solo: [
    'got a little too close to the torch',
    'was extremely flammable',
    'tested the fire. The fire won',
    'warmed up too thoroughly',
  ] },
  trample: { by: [
    'trampled',
    'wiped a foot on',
    'steamrolled',
    'stepped on',
    'ran over',
    'left footprints on',
  ] },
  magic: { by: [
    'smote',
    'politely zapped',
    'hexed',
    'sparkled at',
    'sunburned',
    'put a curse on',
  ] },
  stone: { by: [
    'petrified',
    'sculpted',
    'made a statue of',
    'gave a permanent pose to',
    'chiselled',
    'garden-gnomed',
  ] },
  kick: { by: [
    'punted',
    'booted',
    'taught flight to',
    'gave a lift to',
    'launched',
    'showed the sky to',
  ] },
  gore: { by: [
    'gored',
    'headbutted',
    'used a horn-based approach on',
    'tusked',
    'enthusiastically impaled',
    'rearranged the ribs of',
  ] },
  fall: { by: [
    'dropped',
    'introduced gravity to',
    'gave a very long way down to',
    'taught terminal velocity to',
    'introduced the ground to',
    'let gravity have',
  ], solo: [
    'tripped over gravity',
    'discovered the edge',
    'fell for it',
    'achieved terminal velocity',
    'went to see the ground',
  ] },
  poison: { by: [
    'poisoned',
    'envenomed',
    'slowly disagreed with',
    'gave a nasty surprise to',
    'administered a tiny toxic opinion to',
    'quietly ended',
  ], solo: [
    'should not have licked that',
    'forgot the antidote',
    'trusted a snake',
  ] },
  execute: { by: [
    'processed',
    'signed off on',
    'approved the termination of',
    'completed the paperwork on',
    'ended the shift of',
    'closed the file on',
  ] },
  misfire: { by: [
    'accidentally launched a colleague at',
    'catapulted a colleague onto',
    'yeeted a crewman at',
    'delivered a coworker to',
    'launched a very surprised crewman at',
    'used a colleague against',
  ], solo: [
    'was launched by the home crew',
    'was the wrong projectile',
    'took an unplanned flight',
  ] },
  bribe: { by: [
    'was bribed to deal with',
    'outbid the loyalty of',
    'bought a friend and used them on',
    'paid good money to defeat',
    'subsidised the demise of',
    'paid a friend to deal with',
  ] },
  lightning: { by: [
    'zapped',
    'delivered Zeus\'s regards to',
    'earthed',
    'sent a thunder-gram to',
    'called down the sky on',
    'turned the lights off on',
  ], solo: [
    'stood under the sky',
    'was in the wrong cloud',
    'tested the storm',
  ] },
  drown: { by: [
    'drowned',
    'gave a long bath to',
    'introduced the river to',
    'put a damp end to',
    'dunked',
    'rinsed',
  ], solo: [
    'forgot how to swim',
    'tested the river. It tested back',
    'took a long bath',
    'discovered the depth',
  ] },
  lava: { by: [
    'melted',
    'dipped',
    'demonstrated lava to',
    'gave a very hot bath to',
    'introduced the volcano to',
    'baked',
  ], solo: [
    'trusted the glowing river',
    'stood in lava',
    'asked what lava was',
    'tested whether it was hot',
  ] },
  spikes: { by: [
    'spiked',
    'introduced the pointy floor to',
    'gave unwanted acupuncture to',
    'pointed out the spikes to',
    'trapdoored',
    'pointed the floor at',
  ], solo: [
    'ignored the very obvious spikes',
    'sat on spikes',
    'stepped on the pointy part',
    'did not read the sign',
  ] },
  geyser: { by: [
    'launched',
    'gave a ride to',
    'steamed',
    'offered an early flight to',
    'boosted',
    'fountained',
  ], solo: [
    'got a very brief ride',
    'stood on the wrong rock',
    'discovered geysers',
  ] },
};

export const CAUSES = Object.keys(KILL_VERBS);

function rnd(rng) { return typeof rng === 'function' ? rng() : rng && typeof rng.next === 'function' ? rng.next() : 0; }

/** A verb phrase for "<killer> <verb> <victim>". rng: function or object with next(). */
export function killVerb(cause, rng) {
  const e = KILL_VERBS[cause] || KILL_VERBS.melee;
  return e.by[Math.floor(rnd(rng) * e.by.length) % e.by.length];
}
/** A phrase for "<victim> <phrase>" when nobody did it, or null when the cause has no solo forms. */
export function killSolo(cause, rng) {
  const e = KILL_VERBS[cause];
  if (!e || !e.solo) return null;
  return e.solo[Math.floor(rnd(rng) * e.solo.length) % e.solo.length];
}
/** "Hoplite politely disagreed with Immortal" / "Hoplite stood in lava". killerName may be null for environment kills. */
export function killFeedText(killerName, victimName, cause, rng) {
  if (!killerName) { const s = killSolo(cause, rng); if (s) return victimName + ' ' + s; }
  return (killerName || 'Somebody') + ' ' + killVerb(cause, rng) + ' ' + victimName;
}
