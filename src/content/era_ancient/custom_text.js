// Copy for custom soldiers (owner EDITORS-B): default catchphrases, last words, blurbs and ability descriptions.
// Pure data + one seeded picker. Tone rules: docs/spec/humor.md (specific beats generic, <= 40 characters per quote, nobody is the butt of an ethnic joke).
import { hashString } from '../../core/rng.js';

/** Last words (<= 40 characters each; a soldier carries exactly three). */
export const DEATH_QUOTES = [
  'Tell my goat I was brave.', 'I had a coupon for this.', 'That was NOT in the brochure.', 'At least the helmet matched.',
  'I regret nothing. Mostly the spear.', 'Is this the part with the grapes?', "I should've taken the desk job.", 'Remember me as taller.',
  'Plato never said it would hurt.', 'Tell the cook I liked the soup.', 'My shield was right here!', 'Worth it. Ow.',
  'Cassandra warned me. Everyone did.', "Don't let them have my sandals!", 'Who parked this boulder here?', 'I blame the sun disc.',
  "Rematch? I'll bring a bigger hat.", 'Hold my... oh no.', 'This is fine. This is... fine.', "File my paperwork under 'brave'.",
  'Tell my mother I was a philosopher.', "I've seen the ending. It's soup.", 'Not the face! ...Oh. The face.', 'That is what I get for volunteering.',
  'I felt that in my pension.', 'Somebody count the chickens for me.', 'I was only here for the free grapes.', 'Tactical lying down!',
];

/** Spawn lines (<= 40 characters). */
export const CATCHPHRASES = [
  'Behold! A soldier!', 'I came, I saw, I forgot lunch.', 'Where do I stand? Nobody told me.', 'Make way for a slightly worried hero!',
  'Is it too late to unionise?', 'I was promised snacks.', 'Forward! Unless that is the wrong way.', 'Let us keep this civil. And loud.',
  'I have a plan. It is mostly running.', 'Ready! Mostly! Ish!', 'My mother says I am very brave.', 'Glory, or at least a decent pension.',
  "Today's forecast: bonking.", 'This helmet suits me. Argue with it.', 'I brought my own spear. Mostly.', 'Ignore me. I am extremely dangerous.',
];

/** Codex blurbs by role (<= 14 words). {n} = the soldier's first name, {w} = the weapon. */
export const BLURBS = {
  melee: ['{n} and a {w}: one opinion, loudly held.', 'Hand-built by you. {n} insists the {w} is load-bearing.', '{n} brought a {w} and a firm handshake.'],
  ranged: ['{n} stands far away and has {w} opinions.', 'Hand-built by you. {n} aims with the {w} and optimism.', '{n} believes distance is a personality.'],
  support: ['{n} fights with a {w} and encouraging words.', 'Hand-built by you. {n} is here for morale and the {w}.', '{n} heals, taunts, and files a report.'],
};
export const LORE = [
  'Assembled in the Soldier Workshop from fine, mostly legal parts. The stitching shows. The confidence does too.',
  'Drafted at the last minute by someone with strong views on helmets. Warranty void if exposed to boulders.',
  'No ancient scribe recorded this soldier, which is why he is so well rested. Created by you, with pride.',
];
export const CODEX_JOKES = [
  'Stat block approved by a committee of one.', 'Not available in any shop. Not allowed in several.', 'Contains traces of your design choices.',
];

/** Weapon-class labels for the Workshop (registry meta.style -> short name). */
export const CLASS_LABEL = { thrust: 'Spear', pike: 'Pike', slash: 'Blade', overhead: 'Axe', bash: 'Blunt', throw: 'Thrown', shoot: 'Bow', cast: 'Magic', none: 'Fists' };

/** Ability copy (ids are the keys of sim/stats.js ABILITY_PRESETS). */
export const ABILITY_TEXT = {
  kick: { name: 'Spartan Kick', desc: 'Boots an enemy across the field. Dignity not included.' },
  rage: { name: 'Rage', desc: 'Below half health: hits harder and runs faster.' },
  net: { name: 'Net Toss', desc: 'Roots nearby enemies in place for a couple of seconds.' },
  execute: { name: 'Execute', desc: 'Finishes off enemies who are already having a bad day.' },
  heal_pulse: { name: 'Heal Pulse', desc: 'Patches up the nearest few friends. Needs a staff or scepter.' },
  war_horn: { name: 'War Horn', desc: 'Nearby allies fight faster and harder for a while.' },
  cluck: { name: 'Cluck', desc: 'A very loud chicken noise. Enemies look. It works every time.' },
  revive: { name: 'Second Wind', desc: 'Gets back up once, at 40% health. The Immortals are jealous.' },
  aura_rally: { name: 'Rally Aura', desc: 'Everyone close by feels a bit braver.' },
  chain_lightning: { name: 'Chain Lightning', desc: 'A bolt that hops between enemies. Zeus approves.' },
};

/** Deterministic pick: the same seed string always gives the same entry (offset shifts it for the next quote). */
export function pickSeeded(list, seed, offset = 0) { return list[(hashString(String(seed)) + offset * 7919) % list.length]; }

/** Three distinct last words and a catchphrase for a soldier id (defaults when the player writes none). */
export function defaultQuotes(seed) {
  const deaths = [];
  for (let i = 0; deaths.length < 3 && i < 40; i++) { const q = pickSeeded(DEATH_QUOTES, seed, i); if (deaths.indexOf(q) < 0) deaths.push(q); }
  return { catch: pickSeeded(CATCHPHRASES, seed, 3), deaths };
}
