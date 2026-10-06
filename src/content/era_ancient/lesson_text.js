// Lesson templates for the results screen (sim/lessons.js), in Cassandra's voice: weary, flat, always right, never listened to.
// Slots: {n} count, {t} time m:ss, {def} unit name, {flank} left|right, {pct} percent, {role} (unused: see below).
//
// TRUTH RULES (comedy editor pass). A template must be true every time sim/lessons.js can choose it:
//  - friendly_fire, cavalry_charge, brace_win, brace_loss, flank_fold, hero_down, stalemate and trample only ever come from their own detector, so they may use their own slots.
//  - army_low, routs, composition, ranged_win, melee_win, blitz and slog are ALSO the generic padding lessons that fill the screen to three
//    (sim/lessons.js `pads`), and the padding passes n = 0, pct = 0, role = 'infantry' and the battle length as t. Those templates therefore never
//    print {n}, {pct} or {role}, never say who did the damage, and never claim a fight was short, long, broken or close. Only {t} (always the true
//    length of the battle) is safe. docs/requests/comedy_lessons.md asks SIM to pad from the dedicated `pad_win_*` / `pad_loss_*` entries at the bottom and to fill
//    the real numbers, after which the specific wordings in that file can come back.
//  - Nothing names a unit the player may not have: no archers, no horses, no elephants, no "the {def}" (Hannibal is not "the Hannibal").
export const LESSON_TEXT = {
  friendly_fire: {
    text: ['{n} of our hits landed on our own side. I said somebody would. Nobody listens.', 'Our side hit itself {n} times. The enemy barely had to take part.', '{n} times our own units hurt each other. I filed them under "avoidable".'],
    fix: ['Give shooters and big swingers room, or turn Friendly Fire off in the rules.', 'Units that shoot or smash in a crowd hurt whoever is nearest. Spread them out.'],
  },
  cavalry_charge: {
    text: ['Their charges hit us {n} times. I said speed would be involved.', '{n} charges landed on us. I wrote "fast" beside every one.', 'Something fast and heavy hit us {n} times. I did mention the speed.'],
    fix: ['Hold a spear line: braced spears punish cavalry charges.', 'Charges need room. A second line behind the first absorbs them.'],
  },
  brace_win: {
    text: ['Our spears took {n} cavalry charges head-on. I said horses are bad at spears.', '{n} charges ran onto set spears. As foretold.', 'The horses met our spears {n} times and did not enjoy it.'],
    fix: ['Keep doing that: spears in front, standing still, facing the horses.', 'Hold the line. Do not advance into the horses.'],
  },
  brace_loss: {
    text: ['Our horsemen rode into set spears {n} times. I said they were spears.', '{n} charges into a spear wall. I counted the dents.', 'Cavalry against braced spears, {n} times. Nobody listens.'],
    fix: ['Send cavalry at archers and catapults, never at a spear wall.', 'Go round the spears: a brace only works on a charge from the front.'],
  },
  army_low: {
    text: ['By {t} we were mostly a rumour. I had a number for it. It was a small number.', '{t}. That is when the army ran out of army. I wrote the time down.', 'At {t} there was more of us in the past than the present. As foretold.'],
    fix: ['Keep a second line behind the first. It absorbs the first clash.', 'Heroes and healers keep armies fighting longer. A priest or an officer is cheap insurance.'],
  },
  flank_fold: {
    text: ['The {flank} flank folded at {t}. I said it would. Twice.', 'At {t} the {flank} flank went. Nobody listens.', 'At {t} the enemy found the {flank} flank. It had been there the whole time. As foretold.'],
    fix: ['Guard the {flank} flank: put cavalry or a second line there.', 'Put an officer (Strategos, Centurion or similar) near the {flank} flank. Morale holds around them.'],
  },
  hero_down: {
    text: ['Our {def} fell at {t}. I saw it coming.', '{def} died at {t}. Morale followed.', 'At {t} we lost our {def}. The nerve went with him.'],
    fix: ['Keep heroes inside your line, not in front of it.', 'Heroes keep morale up only while alive. Guard them.'],
  },
  routs: {
    text: ['Morale is the number nobody fixes in advance. I noted it, in the margin.', 'Soldiers have a point at which they leave. I know where it is. It is not on the budget sheet.', 'Courage is a resource. Every army spends it. I keep the accounts.'],
    fix: ['Keep an officer (Strategos, Centurion) within 10 u of the line.', 'Fearless units (mummies, spartans) hold when others run.'],
  },
  stalemate: {
    text: ['Nobody hit anybody for {n} seconds. I said they would stare.', 'For {n} seconds the armies admired each other. Zeus starts counting at about then.', '{n} seconds without a blow. Somebody always blinks. Nobody listens.'],
    fix: ['Add cavalry or siege so one side has a reason to move.', 'Use the Advance order when both lines are waiting.'],
  },
  trample: {
    text: ['The big one stomped {n} times. I said it was big.', '{n} stomps from something enormous. Size is a kind of argument.', 'Something large walked through the line, {n} stomps in all. As foretold.'],
    fix: ['Focus fire on the big one. Elephants and wooden horses also fear flames.', 'Do not stand in front of the big thing. Flank it, and stay out of its way.'],
  },
  ranged_win: {
    text: ['You won. I said you might. I also said you might not. One of those was always going to land.', 'A win is a loss that has not met the right enemy yet. I noted the enemy.', 'You won. The enemy will have notes. I have them.'],
    fix: ['Ranged units win from behind a line: give them one.', 'More of the same, and keep something fast nearby for the flanks.'],
  },
  melee_win: {
    text: ['You won. I wrote it down before it happened. It still counts.', 'A victory. The enemy has asked for a second opinion. I declined to give one.', 'You won. The wall had it first. The wall is now insufferable.'],
    fix: ['Add a few archers behind the line for more reach.', 'Cavalry on the wings would finish it faster.'],
  },
  blitz: {
    text: ['Done in {t}. Nobody had time to ignore me.', '{t}, start to finish. History will round it to "a while".', '{t}. I timed it so you would not have to. You are welcome.'],
    fix: ['Try Hard difficulty if you want a story worth telling.', 'A smaller budget makes a closer fight. Try one.'],
  },
  slog: {
    text: ['The battle lasted {t}. I had said {t}. Nobody wrote it down.', '{t}. Long enough for a plan to fail. Short enough to try another.', '{t} on the clock. I will remember that number. Nobody else will.'],
    fix: ['Cavalry, siege and heroes end fights. Budget for one of them.', 'Use the Advance order if both lines are waiting. It gets things moving.'],
  },
  composition: {
    text: ['The enemy brought a plan. You brought a different plan. I read both.', 'The Scout report said what they brought. I read it. It was short.', 'They brought something. You brought something. Only one of those was a counter.'],
    fix: ['Check the Scout report before you place. It names what you are about to fight.', 'Counter it: spears for cavalry, cavalry for archers, archers for slow blobs.'],
  },
  // Dedicated padding lessons for SIM to use instead of the generic ids above (docs/requests/comedy_lessons.md): `pads = won ? ['pad_win_1', 'pad_win_2', 'pad_win_3'] : ['pad_loss_1', ...]`.
  // Slot-free except {t}; each is true after any battle, and their fixes differ so a screen of three pads never repeats itself.
  pad_win_1: {
    text: ['You won. I said you might. I also said you might not. One of those was always going to land.', 'A win is a loss that has not met the right enemy yet. I noted the enemy.'],
    fix: ['Try Hard difficulty if you want a story worth telling.'],
  },
  pad_win_2: {
    text: ['Done in {t}. I wrote the result on a wall. The wall agrees with you, for once.', 'The battle lasted {t}. The wall had the result first. The wall is insufferable.'],
    fix: ['Change one thing next time. Then you will know which thing mattered.'],
  },
  pad_win_3: {
    text: ['You won. The enemy will have notes. I have them.', 'A victory. The enemy has asked for a second opinion. I declined to give one.'],
    fix: ['Win with a smaller budget once. It is a different game.'],
  },
  pad_loss_1: {
    text: ['{t}. That is how long it took to learn this. Most lessons take longer.', 'You lost in {t}. I wrote it down before it happened. That is not much comfort. It is some.'],
    fix: ['Change one thing next time. Then you will know which thing mattered.'],
  },
  pad_loss_2: {
    text: ['The enemy brought a plan. You brought a different plan. I read both.', 'They brought something. You brought something. Only one of those was a counter.'],
    fix: ['Check the Scout report before you place. It names what you are about to fight.'],
  },
  pad_loss_3: {
    text: ['Defeat is information with a bad temper. I have the information.', 'Nobody enjoys the lesson. Everybody remembers it. That is the whole design.'],
    fix: ['Counter it: spears for cavalry, cavalry for archers, archers for slow blobs.'],
  },
  pad_draw_1: {
    text: ['It ended level at {t}. I wrote "level" and underlined it twice.', 'Nobody won in {t}. I said nobody would. They did not enjoy being right.'],
    fix: ['Give one side a reason to move: cavalry, siege or the Advance order.'],
  },
  pad_draw_2: {
    text: ['Nobody won. Zeus has opinions about that. They are mostly lightning.', 'A draw is a battle where both generals are right. I recommend against it.'],
    fix: ['Set a time limit in the rules and let the accountants decide.'],
  },
  pad_draw_3: {
    text: ['Both armies are still out there, undefeated, unconvinced. I noted it.', 'Nobody lost. Nobody learned. I will be here.'],
    fix: ['Check the Scout report before you place. It names what you are about to fight.'],
  },
};
