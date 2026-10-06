// Lesson templates for the results screen (sim/lessons.js), in Cassandra's voice: weary, flat, always right, never listened to.
// Slots: {n} count, {t} time m:ss, {def} unit name (def id fallback), {flank} left|right|center, {pct} percent, {killer} unit name. HUMOR may replace this file's strings.
export const LESSON_TEXT = {
  friendly_fire: {
    text: ['I said our own arrows had opinions. {n} allies agreed.', 'Friendly fire: {n} of ours fell to ours. Nobody listens.', '{n} soldiers were hurt by their own side. As foretold.'],
    fix: ['Keep ranged units behind the melee line, or turn Friendly Fire off.', 'Do not park archers behind your own spearmen on a slope.'],
  },
  cavalry_charge: {
    text: ['Their cavalry hit us {n} times. I said the horses were fast.', 'Horses. {n} charges. I did say.', 'The cavalry charged {n} times and the line did not like it.'],
    fix: ['Put spearmen (hoplite, medjay, immortal) in front of your archers.', 'Spears beat horses: hold a spear line and let them come.'],
  },
  brace_win: {
    text: ['Your spears stopped {n} charges. As foretold.', 'Set spears, {n} fallen riders. I said so.'],
    fix: ['Keep doing that: spears in front, cavalry bait behind.', 'Hold the line, do not advance into the horses.'],
  },
  brace_loss: {
    text: ['Our horsemen rode into set spears {n} times. I said they were spears.', 'Cavalry versus spears, {n} times. The spears won each time.'],
    fix: ['Send cavalry at archers and catapults, never at a spear wall.', 'Flank the archers; ignore the hedgehog.'],
  },
  army_low: {
    text: ['The army broke at {t}. I said it would break about then.', 'By {t} only a quarter of us stood. As foretold.'],
    fix: ['Fight where your ranged units can help, or add a second line to absorb the first clash.', 'Bring more bodies to the front or fewer lonely archers.'],
  },
  flank_fold: {
    text: ['The {flank} flank folded at {t}. I said it would. Twice.', 'At {t} the {flank} flank went. Nobody listens.'],
    fix: ['Guard the {flank} flank: put cavalry or a second line there.', 'Use a Strategos or a Centurion near the {flank} flank to keep morale up.'],
  },
  hero_down: {
    text: ['Our {def} fell at {t}. I saw it coming.', 'The {def} died at {t}. Morale followed.'],
    fix: ['Keep heroes inside your line, not in front of it.', 'Heroes keep morale up only while alive: guard them.'],
  },
  routs: {
    text: ['{n} soldiers ran away. They were right to.', '{n} routed. I did not blame them.'],
    fix: ['Keep an officer (Strategos, Centurion) within 10 u of the line.', 'Fearless units (mummies, spartans) hold when others run.'],
  },
  stalemate: {
    text: ['Nobody attacked for {n} seconds. I said they would stare.', 'A stalemate. The gods got bored. As foretold.'],
    fix: ['Add cavalry or siege so one side has a reason to move.', 'Use the Advance order when both lines are waiting.'],
  },
  trample: {
    text: ['The elephant trampled {n} of ours. I said it was an elephant.', 'Trampled {n} times. I did mention the size.'],
    fix: ['Elephants fear fire and spears: mass spears and fire arrows.', 'Do not stand in front of the big grey thing.'],
  },
  ranged_win: {
    text: ['Your ranged units did {pct}% of the damage. As foretold.', 'The archers carried it: {pct}% of the damage.'],
    fix: ['Keep protecting them: spears in front, cavalry watching the flanks.', 'More of the same, with a few cavalry for the flanks.'],
  },
  melee_win: {
    text: ['The line did {pct}% of the work. I said it would.', 'Shields and spears: {pct}% of the damage. Unsurprising.'],
    fix: ['Add a few archers behind the line for more reach.', 'Cavalry on the wings would finish it faster.'],
  },
  blitz: {
    text: ['It was over at {t}. I blinked.', 'Done in {t}. Nobody had time to ignore me.'],
    fix: ['Next time try a smaller budget for a closer fight.', 'Try a harder opponent: this one was never in doubt.'],
  },
  slog: {
    text: ['{t} of battle. I said it would be long.', 'It took {t}. Everyone was tired. As foretold.'],
    fix: ['Cavalry and siege end long fights faster.', 'Bring something that can finish things: cavalry, siege or a hero.'],
  },
  composition: {
    text: ['They brought {pct}% {role}. I said to bring something for that.', 'The enemy fielded {pct}% {role}. Nobody listened.'],
    fix: ['Counter it: spears for cavalry, cavalry for archers, archers for slow blobs.', 'Check the Scout report before you place.'],
  },
};
