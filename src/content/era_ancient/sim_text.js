// Default speech-bubble lines the SIM can emit as `bark` events when a unit's own text (def.text[key]) has no override.
// HUMOR may replace any list by providing UnitDef.text[key]. Keys are ability moments; each list is picked with the sim RNG.
export const SIM_BARKS = {
  throne_retreat: ['Retreat!', 'Retreat! Tell no one I said that.', 'Retreat! The chair is not insured!'],
  cluck: ['BAWK!', 'Bawk bawk BAWK!', 'Bawk! (Look at me.)'],
  tantrum: ['BWAAAK!', 'Bawk. BAWK. BAWK!!', 'Absolutely not! Bawk!'],
  monologue: ['But what is a sword, really?', 'Define "enemy".', 'If a spear falls in a forest...', 'Is the shield defending the man?', 'Consider: the unexamined charge.'],
  filibuster: ['As I was saying...', 'Point of order!', 'I yield... to no one.', 'Let the record show...', 'Zzz is not an argument!'],
  bribe: ['Pleasure doing business.', 'A small gift, citizen.', 'This is totally legal.'],
  kick: ['THIS IS SPARTA!', 'Madness? No. Footwork.', 'Have a nice flight!'],
  rage: ['RAAAGH!', 'Now I am cross!'],
  horn: ['FOR PLUNDER AND POTTERY!', 'HORN! HORN! HORN!'],
  revive: ['Ten thousand. Give or take ten thousand.', 'Not today.'],
  misfire: ['Oops!', 'That was Gary!', 'Not the crew!'],
  elephant_panic: ['TRUMPET!', 'Fire! Fire! Everyone move!'],
  taunt: ['Over here!', 'Bring it!'],
};
