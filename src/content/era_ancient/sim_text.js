// Default speech-bubble lines the SIM emits as `bark` events (sim/world.js bark(u, key): `u.def.text[key]`, then `SIM_BARKS[key + ':' + role]`, then `SIM_BARKS[key]`).
// A unit's own answer lives in humor/units_text.js (MOMENTS: Spartan "If.", Immortal "Plot twist.", ...); these lists are the fallback for custom soldiers and any unit
// without one. Keys are ability moments plus the class-level states built from humor/barks.js (`engage:melee`, `hurt:ranged`, `rout:cavalry`, `cheer:hero`, ...), the unit
// last-words key `deaths` and the status keys (`confuse`, `sleep`, `tipsy`, `stone`, `bribed`, `panic`, `burn`). Each list is picked with the sim RNG. Lines are <= 12 words.
import { BARKS, STATUS_BARKS, GENERIC_DEATHS, GENERIC_TAUNTS } from './humor/barks.js';

export const SIM_BARKS = {
  throne_retreat: ['Retreat!', 'Retreat! Tell no one I said that.', 'Retreat! The chair is not insured!'],
  cluck: ['BAWK!', 'Bawk bawk BAWK!', 'Bawk! (Look at me.)'],
  tantrum: ['BWAAAK!', 'Bawk. BAWK. BAWK!!', 'Absolutely not! Bawk!'],
  monologue: ['But what is a sword, really?', 'Define "enemy".', 'If a spear falls in a forest...', 'Is the shield defending the man?', 'Consider: the unexamined charge.'],
  filibuster: ['As I was saying...', 'Point of order!', 'I yield... to no one.', 'Let the record show...', 'Zzz is not an argument!'],
  bribe: ['Pleasure doing business.', 'A small gift, citizen.', 'This is totally legal.'],
  kick: ['THIS IS SPARTA!', 'Madness? No. Footwork.', 'Have a nice flight!'],
  rage: ['RAAAGH!', 'Now I am cross!'],
  horn: ['FOR POTTERY AND PROCEDURE!', 'HORN! HORN! HORN!'],
  revive: ['Plot twist.', 'Not today.'],
  misfire: ['Oops!', 'Not the crew!', 'Gaius! GAIUS!'],
  elephant_panic: ['TRUMPET!', 'Fire! Fire! Everyone move!'],
  taunt: ['Over here!', 'Bring it!'],
  deaths: GENERIC_DEATHS,
  taunts: GENERIC_TAUNTS,
};
// class-level barks: engage / hurt / rout / cheer per unit role, e.g. SIM_BARKS['rout:cavalry']
for (const role of Object.keys(BARKS)) for (const state of Object.keys(BARKS[role])) SIM_BARKS[state + ':' + role] = BARKS[role][state];
// status bubbles: SIM_BARKS['status:sleep'] ...
for (const status of Object.keys(STATUS_BARKS)) SIM_BARKS['status:' + status] = STATUS_BARKS[status];
