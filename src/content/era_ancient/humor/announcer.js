// Announcer: slotted line templates for the three booth voices + the pure selector that decides what gets said and when.
// Owner: HUMOR. Pure module (no DOM, no Math.random: the caller passes an rng). See docs/lifetime_stats.md and docs/requests/humor.md.
//
// LINE SHAPE   { id, cat, who:'brutus'|'plato'|'cassandra', text, cond?, weight?, once?, cd?, chain?:[lineId...], follow?:true }
//              once: at most once per battle.  cd: minimum seconds between uses (used by persistent callbacks).  follow: chain beat, never picked alone.
// SLOTS        {unit} {unit2} {killer} {team} {team2} {faction} {faction2} {arena} {mission} {n} {streak} {ratio} {flank} {pct} {prop}
//              {lifetime:<stat>} reads the live lifetime-stats object passed to createAnnouncer.
//              Also {secs} {mins} (durations), {nth} (session counters, use {nth|ord}), {theirs} (enemy survivors in a close defeat).
//              Filters: {unit|pl} plural  {unit|a} indefinite article ("an Immortal", "Hannibal")  {unit|the} "the Hoplite" / "Hannibal"  {unit|A} {unit|The} the same, capitalised  {x|cap} capitalise  {unit|up} UPPERCASE  {n|ord} third  {n|words} three  {n|num} 1,234
// COND KEYS    sub, def, def2, faction, team ('player'|'enemy'), minN, maxN, arena, mission, flank, cluster (big_swing payload has a cluster), ratioMin, ratioMax,
//              stat {name,min?,max?} (or an array of these), milestone {name, at:[...]}
// A line is eligible only when every slot in its text can be resolved, so a line that names {unit2} never runs without one.

import { STAT_TABLE } from '../stats.js';
import { unitName, isProper } from './units_text.js';

const mk = (who) => (cat, key, text, o) => Object.assign({ id: cat + '_' + key, cat, who, text }, o);
const b = mk('brutus');
const p = mk('plato');
const c = mk('cassandra');

/** Hero unit ids (the first-blood "it was the big one" lines). */
const HEROES = ['strategos', 'centurion', 'pharaoh', 'xerxes', 'hannibal', 'chieftain'];

export const TEMPLATES = [
  // ================= battle_start =================
  // Generic openers (every battle), then size lines (cond minN/maxN on the total soldier count), then arena lines (cond arena), then the contextual subs:
  // duel (exclusive), outnumbered, outnumbering, tenth, losing, winning, loyal, rematch, mirror. See battle_start in createAnnouncer.
  b('battle_start', 'welcome', "WELCOME to {arena}! Today's carnage is brought to you by Pompeii Pizza, now with 20% more ash!"),
  b('battle_start', 'terms', 'The Terms of Conquest are LAMINATED and posted. Clause seven: nobody stabs the grape seller.'),
  b('battle_start', 'matchup', 'LIVE from {arena}: {faction} versus {faction2}! Place your bets with the man selling grapes!'),
  b('battle_start', 'locals', 'The locals were asked to leave! They declined! Several have brought CHAIRS!'),
  p('battle_start', 'define', 'Before we begin: what, precisely, is a battle?', { chain: ['battle_start_define_b', 'battle_start_define_c'] }),
  b('battle_start', 'define_b', 'FIGHTING! Next question!', { follow: true }),
  c('battle_start', 'define_c', 'It ends badly. That is the full definition.', { follow: true }),
  c('battle_start', 'ending', 'I wrote the ending down. Nobody will enjoy it. Please begin.'),
  c('battle_start', 'grapes', 'The man selling grapes will survive. Everyone else is a rumour.'),
  c('battle_start', 'wall', 'I wrote the result on a wall. You may read it afterwards. Not during.'),
  c('battle_start', 'faction', '{faction} against {faction2}. By evening one of them will call it a close one.'),
  c('battle_start', 'surprise', 'Today will go as it goes. Some of you will be surprised. I will not.'),
  c('battle_start', 'ledger', 'You have killed {lifetime:friendlyKills} of your own so far. I keep the count. I am not betting on improvement.', { once: true, cd: 480, cond: { stat: { name: 'friendlyKills', min: 5 } } }),
  p('battle_start', 'field', 'Two armies walk into a field. Does anyone remember who suggested the field?'),
  p('battle_start', 'orders', 'Each general has given orders. Each soldier will now interpret them. Is that obedience, or translation?'),
  p('battle_start', 'quiet', 'The quiet before a battle is the only part of it nobody complains about.'),
  b('battle_start', 'mission', "Today's event is {mission}! A very serious title for a very silly afternoon!"),
  p('battle_start', 'mission_p', '{mission}. Is a name chosen before the battle, or after the survivors have had their say?'),
  // career moments (lifetime stats, read at pick time): the very first battle, and the round-number ones
  b('battle_start', 'first_b', 'Your FIRST battle! Welcome to the arena! Nobody here knows what they are doing, and that includes me!', { weight: 4, once: true, cond: { stat: { name: 'battles', max: 0 } } }),
  p('battle_start', 'first_p', 'A first battle. Everyone remembers the first. Mostly because nobody told them about the second.', { weight: 4, once: true, cond: { stat: { name: 'battles', max: 0 } } }),
  c('battle_start', 'first_c', 'Your first battle. I wrote this one down in a larger font, for sentimental reasons.', { weight: 4, once: true, cond: { stat: { name: 'battles', max: 0 } } }),
  b('battle_start', 'record_b', '{lifetime:battles|num} battles! The Terms of Conquest have been AMENDED! Twice! In your honour!', { weight: 4, once: true, cd: 480, cond: { milestone: { name: 'battles', at: [10, 25, 50, 100, 250] } } }),
  c('battle_start', 'record_c', '{lifetime:battles|num} battles. I have a wall for them. The wall is full. I have started on the ceiling.', { weight: 4, once: true, cd: 480, cond: { milestone: { name: 'battles', at: [10, 25, 50, 100, 250] } } }),
  // size
  b('battle_start', 'small', 'A boutique battle of {n} soldiers! Hand-picked! Locally sourced! TRAGICALLY small!', { cond: { maxN: 20 } }),
  p('battle_start', 'small_p', '{n} soldiers in all. Every death will have a name. That is either better or worse.', { cond: { maxN: 20 } }),
  b('battle_start', 'big', '{n} SOLDIERS! The ground has asked for a moment to prepare!', { cond: { minN: 200 } }),
  c('battle_start', 'big_c', '{n} soldiers. I counted twice. The second count was worse.', { cond: { minN: 200 } }),
  // arenas (one voice each, three for the arena that Quick Battle opens on)
  b('battle_start', 'a_marathon', 'MARATHON! Where a man ran twenty-six miles with the news and was never TIPPED!', { cond: { arena: 'marathon' } }),
  p('battle_start', 'a_marathon_p', 'Marathon. The famous run came after the battle. Does anyone ask how the soldiers got home?', { cond: { arena: 'marathon' } }),
  c('battle_start', 'a_marathon_c', 'Marathon has a famous ending. The book is not on the field with you.', { cond: { arena: 'marathon' } }),
  b('battle_start', 'a_thermopylae', 'THE HOT GATES! Eight units wide! Room for heroes and exactly one snack table!', { cond: { arena: 'thermopylae' } }),
  p('battle_start', 'a_thermopylae_p', 'A gap eight units wide. Is a chokepoint a place, or a decision?', { cond: { arena: 'thermopylae' } }),
  c('battle_start', 'a_thermopylae_c', 'There is a goat path round the side. There is always a goat path. Nobody listens.', { cond: { arena: 'thermopylae' } }),
  b('battle_start', 'a_colosseum', 'THE COLOSSEUM! Ninety spectators! Zero refunds! The spikes are an optional EXTRA!', { cond: { arena: 'colosseum' } }),
  p('battle_start', 'a_colosseum_p', 'Ninety spectators, every one of them an expert. This is where criticism began.', { cond: { arena: 'colosseum' } }),
  c('battle_start', 'a_colosseum_c', 'The sand hides trapdoors. The trapdoors hide spikes. I marked them. Nobody reads the sand.', { cond: { arena: 'colosseum' } }),
  b('battle_start', 'a_nile', 'THE NILE! One ford, countless reeds, and a river with strong views on ARMOUR!', { cond: { arena: 'nile' } }),
  p('battle_start', 'a_nile_p', 'Whoever crosses first discovers the river. The rest watch the discovery.', { cond: { arena: 'nile' } }),
  c('battle_start', 'a_nile_c', 'The river slows everyone, and armour slows them further. I said wade lightly.', { cond: { arena: 'nile' } }),
  b('battle_start', 'a_giza', 'GIZA! Dunes! Pyramids! A sphinx who has seen this before and is NOT impressed!', { cond: { arena: 'giza' } }),
  p('battle_start', 'a_giza_p', 'The sphinx asks one question. Today the question is: why are you all here?', { cond: { arena: 'giza' } }),
  c('battle_start', 'a_giza_c', 'The sand slows everyone equally. The sphinx has seen how it ends. It is not saying.', { cond: { arena: 'giza' } }),
  b('battle_start', 'a_persepolis', 'PERSEPOLIS! Marble floors, a comfortable throne, and columns that are definitely not INSURED!', { cond: { arena: 'persepolis' } }),
  p('battle_start', 'a_persepolis_p', 'A palace built to impress visitors. Does a visitor holding a spear count?', { cond: { arena: 'persepolis' } }),
  c('battle_start', 'a_persepolis_c', 'The columns block arrows. Then they fall over. Then the arrows arrive. I wrote that order down.', { cond: { arena: 'persepolis' } }),
  b('battle_start', 'a_carthage', 'CARTHAGE HARBOR! Docks, crates, and one ship that is just WAITING to be on fire!', { cond: { arena: 'carthage' } }),
  p('battle_start', 'a_carthage_p', 'A ship, a harbour and a great deal of open flame. Somebody will call it a coincidence.', { cond: { arena: 'carthage' } }),
  c('battle_start', 'a_carthage_c', 'The ship will burn. Somebody will light it. It will be someone who was told not to.', { cond: { arena: 'carthage' } }),
  b('battle_start', 'a_teutoburg', 'TEUTOBURG FOREST! Fog, mud and ambush potential! Archers: squint now, complain later!', { cond: { arena: 'teutoburg' } }),
  p('battle_start', 'a_teutoburg_p', 'Fog: nature\'s way of asking whether anyone really knows where the enemy is.', { cond: { arena: 'teutoburg' } }),
  c('battle_start', 'a_teutoburg_c', 'Fog hides the enemy. It also hides the exit. Nobody asks about the exit.', { cond: { arena: 'teutoburg' } }),
  b('battle_start', 'a_alpine', 'THE ALPS! Snow! Cliffs! A path so narrow it causes ARGUMENTS!', { cond: { arena: 'alpine' } }),
  p('battle_start', 'a_alpine_p', 'Everything is ten percent slower in snow. Is that the cold, or only the thought of it?', { cond: { arena: 'alpine' } }),
  c('battle_start', 'a_alpine_c', 'Somebody will fall off that cliff. Look for the one in sandals.', { cond: { arena: 'alpine' } }),
  b('battle_start', 'a_olympus', 'MOUNT OLYMPUS! A temple, columns, and a very large Zeus keeping an eye on the SCORE!', { cond: { arena: 'olympus' } }),
  p('battle_start', 'a_olympus_p', 'A battle on the home of the gods. Does it count as a fight if someone can overrule it?', { cond: { arena: 'olympus' } }),
  c('battle_start', 'a_olympus_c', 'He is watching. He will get bored. Bored is when the lightning starts.', { cond: { arena: 'olympus' } }),
  b('battle_start', 'a_troy', 'SIEGE OF TROY! Somebody has parked a HORSE outside the gate! Nobody has asked who!', { cond: { arena: 'troy' } }),
  p('battle_start', 'a_troy_p', 'A wall that has held for ten years, and a horse that has not been inspected.', { cond: { arena: 'troy' } }),
  c('battle_start', 'a_troy_c', 'The gate will fall. The horse will open. A gift shop will be involved. I wrote it down.', { cond: { arena: 'troy' } }),
  b('battle_start', 'a_styx', 'THE RIVER STYX! Lava, two bone bridges and GEYSERS for variety! Mind your footing!', { cond: { arena: 'styx' } }),
  p('battle_start', 'a_styx_p', 'Two bridges and a river of fire. The only decision is who says after you.', { cond: { arena: 'styx' } }),
  c('battle_start', 'a_styx_c', 'The lava deals thirty damage a second. Everyone knows. Some will test it again.', { cond: { arena: 'styx' } }),
  b('battle_start', 'a_cyclops', 'CYCLOPS ISLE! One cave, a few goats and a very large LANDLORD!', { cond: { arena: 'cyclops' } }),
  p('battle_start', 'a_cyclops_p', 'A rocky island with a cave and several goats. Is a goat a witness or a participant?', { cond: { arena: 'cyclops' } }),
  c('battle_start', 'a_cyclops_c', 'That cave is occupied. I marked it on the map. The map was ignored.', { cond: { arena: 'cyclops' } }),
  b('battle_start', 'a_oasis', 'THE OASIS! A tiny lake, a ring of palms and exactly enough room to DISAGREE!', { cond: { arena: 'oasis' } }),
  p('battle_start', 'a_oasis_p', 'A small lake in a large desert. Was the desert not enough to fight over?', { cond: { arena: 'oasis' } }),
  c('battle_start', 'a_oasis_c', 'Small arena. Nowhere to retreat. I said that last time. It was true last time.', { cond: { arena: 'oasis' } }),
  b('battle_start', 'a_arenalab', 'THE ARENA LAB! Flat grass, no scenery, nothing to hide behind! A PURE test of nerve!', { cond: { arena: 'arenalab' } }),
  p('battle_start', 'a_arenalab_p', 'No hills, no trees, no excuses. This is what soldiers look like with the scenery removed.', { cond: { arena: 'arenalab' } }),
  // duel (exclusive: only these speak)
  b('battle_start', 'duel_b', 'A DUEL! One soldier each! The crowd is me, Plato and a man with grapes!', { cond: { sub: 'duel' } }),
  p('battle_start', 'duel_p', 'One against one. The smallest possible battle. Is it still a battle, or only an argument?', { cond: { sub: 'duel' } }),
  c('battle_start', 'duel_c', 'One of them wins. I checked. It was not hard to check.', { cond: { sub: 'duel' } }),
  b('battle_start', 'duel_b2', 'ONE versus ONE! The Terms of Conquest have no clause for this! We are improvising!', { cond: { sub: 'duel' } }),
  // outnumbered / outnumbering
  b('battle_start', 'outnumbered_b', 'OUTNUMBERED {ratio} to one! That is not a problem, that is a CHARACTER ARC!', { weight: 3, cond: { sub: 'outnumbered' } }),
  p('battle_start', 'outnumbered_p', '{ratio} to one against you. Is courage just a bad estimate of the odds?', { weight: 3, cond: { sub: 'outnumbered' } }),
  c('battle_start', 'outnumbered_c', '{ratio} to one. I will not say how it ends. You would want to be surprised.', { weight: 3, cond: { sub: 'outnumbered' } }),
  b('battle_start', 'outnumbering_b', 'You have {ratio} times their numbers! That is not a battle, that is a PARADE with extra steps!', { weight: 3, cond: { sub: 'outnumbering' } }),
  p('battle_start', 'outnumbering_p', '{ratio} to one in your favour. Fairness has left the building and taken the chairs.', { weight: 3, cond: { sub: 'outnumbering' } }),
  c('battle_start', 'outnumbering_c', 'They are outnumbered {ratio} to one. They know. They have brought a very short speech.', { weight: 3, cond: { sub: 'outnumbering' } }),
  // session moments
  b('battle_start', 'tenth_b', 'Battle number {nth|words}! The sponsors have started saving the good COUPONS!', { weight: 3, cond: { sub: 'tenth' } }),
  p('battle_start', 'tenth_p', 'Ten battles today. At some point a hobby becomes an occupation. Has anyone read the contract?', { weight: 3, cond: { sub: 'tenth' } }),
  c('battle_start', 'tenth_c', 'Ten. I wrote all ten down. Nine were avoidable.', { weight: 3, cond: { sub: 'tenth' } }),
  b('battle_start', 'losing_b', '{nth|words} losses in a ROW! A win is statistically overdue! (It is not! But I am hopeful!)', { weight: 3, cond: { sub: 'losing' } }),
  p('battle_start', 'losing_p', '{nth|words} defeats running. A teacher, certainly, but a repetitive one.', { weight: 3, cond: { sub: 'losing' } }),
  c('battle_start', 'losing_c', '{nth|words} defeats in a row. This is the point where I would change something. Anything.', { weight: 3, cond: { sub: 'losing' } }),
  b('battle_start', 'winning_b', '{nth|words} wins in a ROW! The Terms of Conquest now list you as a THREAT!', { weight: 3, cond: { sub: 'winning' } }),
  p('battle_start', 'winning_p', '{nth|words} victories running. Is it skill, or the enemy\'s generosity?', { weight: 3, cond: { sub: 'winning' } }),
  c('battle_start', 'winning_c', '{nth|words} wins. You will lose eventually. I wrote that down too, on the same wall.', { weight: 3, cond: { sub: 'winning' } }),
  b('battle_start', 'loyal_b', 'The {nth|ord} battle on {arena} in a row! The locals are charging you RENT!', { weight: 3, cond: { sub: 'loyal' } }),
  p('battle_start', 'loyal_p', '{arena}, for the {nth|ord} time running. Is it loyalty, or the only map you know?', { weight: 3, cond: { sub: 'loyal' } }),
  c('battle_start', 'loyal_c', '{arena} again. The {nth|ord} time. I wrote the same note every time.', { weight: 3, cond: { sub: 'loyal' } }),
  b('battle_start', 'rematch_b', 'BACK on {arena}! Same ground, same crowd, SLIGHTLY different excuses!', { weight: 3, cond: { sub: 'rematch' } }),
  p('battle_start', 'rematch_p', 'The same arena again. Is it a rematch, or stubbornness with a familiar view?', { weight: 3, cond: { sub: 'rematch' } }),
  c('battle_start', 'rematch_c', 'Same ground. Same ending, unless you change the thing. You know which thing.', { weight: 3, cond: { sub: 'rematch' } }),
  b('battle_start', 'mirror_b', '{faction} versus {faction2}! That is the SAME faction! Somebody is fighting their own cousin!', { weight: 3, cond: { sub: 'mirror' } }),
  p('battle_start', 'mirror_p', '{faction} against {faction2}. Is it civil war, or only a very honest rehearsal?', { weight: 3, cond: { sub: 'mirror' } }),
  c('battle_start', 'mirror_c', 'Same uniforms on both sides. Somebody will stab the wrong one. Nobody listens.', { weight: 3, cond: { sub: 'mirror' } }),

  // ================= first_blood =================
  b('first_blood', 'opinion', 'First blood to {unit|the}! {unit2|The} was just BEGINNING to have an opinion!'),
  c('first_blood', 'known', '{unit2|The} fell first. I said it would be {unit2|a}. I said it at breakfast.'),
  p('first_blood', 'inevitable', 'The first death. Statistically unavoidable. Spiritually inconvenient.'),
  p('first_blood', 'cook', 'Strictly, the first blood was spilt at breakfast, by the cook. This is merely the first from a soldier.'),
  c('first_blood', 'survive', 'First blood to {unit|the}. Remember it. It is the only thing today that will make sense.'),
  p('first_blood', 'spilt', 'Someone had to go first. The rest are now deciding how they feel about it.'),
  b('first_blood', 'off', 'And we are OFF! {unit|A} draws first blood from {unit2|a}, and the crowd is, frankly, relieved!'),
  b('first_blood', 'ripple', 'And THAT is how you open a battle! One fall, one gasp, one grape seller looking away!'),
  p('first_blood', 'statistics', 'The first death is a surprise. The second is a statistic. We are now in statistics.'),
  c('first_blood', 'nine', '{unit|The} struck first. It will matter for about nine seconds. I measured.'),
  b('first_blood', 'early_b', 'First blood at {secs} seconds! They did not even wait for the ANTHEM!', { weight: 3, cond: { sub: 'early' } }),
  p('first_blood', 'early_p', '{secs} seconds. Patience is not among the virtues of a spear.', { weight: 3, cond: { sub: 'early' } }),
  c('first_blood', 'early_c', '{secs} seconds to the first death. I wrote down "early" and underlined it.', { weight: 3, cond: { sub: 'early' } }),
  b('first_blood', 'late_b', 'First blood, FINALLY! {secs} seconds of politeness! The crowd had started on the grapes!', { weight: 3, cond: { sub: 'late' } }),
  p('first_blood', 'late_p', '{secs} seconds before the first death. Armies, like people, delay the inevitable.', { weight: 3, cond: { sub: 'late' } }),
  c('first_blood', 'late_c', '{secs} seconds of nothing, then one death. I wrote the nothing down as well.', { weight: 3, cond: { sub: 'late' } }),
  b('first_blood', 'chicken_b', 'First blood, and it is a CHICKEN! Sacred, small and already ahead of the field!', { cond: { def: 'sacred_chicken' } }),
  c('first_blood', 'chicken_c', 'First blood to a chicken. I have no note for this. I am writing one now.', { cond: { def: 'sacred_chicken' } }),
  b('first_blood', 'goat_b', 'FIRST BLOOD to the GOAT! Lowest rank, highest morale!', { cond: { def: 'battle_goat' } }),
  p('first_blood', 'goat_p', 'The goat strikes first. Is it ambition, or only a very good helmet?', { cond: { def: 'battle_goat' } }),
  b('first_blood', 'hero_b', 'First blood, and it is {unit2|the}! Somebody wanted the BIG one early!', { cond: { def2: HEROES } }),
  p('first_blood', 'hero_p', 'The first to fall is {unit2|the}. A bold way to open a war. Or a very unlucky one.', { cond: { def2: HEROES } }),

  // ================= kill_streak =================  (the sim announces streaks of 5, 10 and 20)
  b('kill_streak', 'fire', '{streak} kills! {killer|cap} is ON FIRE! Not literally! The fire marshal has asked me to clarify!'),
  b('kill_streak', 'review', '{streak}!!! This is no longer a battle, this is a PERFORMANCE REVIEW!', { cond: { minN: 8 } }),
  b('kill_streak', 'name', 'That is {streak} for {killer}! Remember the NAME! (I will not.)'),
  p('kill_streak', 'pattern', '{killer|cap}: {streak} kills. At what point does a pattern become a personality?'),
  p('kill_streak', 'brave', '{streak} kills. Is {unit|the} brave, or merely uninterrupted?'),
  c('kill_streak', 'forgotten', '{unit|The} reaches {streak} and is forgotten by supper. As foretold.'),
  b('kill_streak', 'laurel', '{streak}! Somebody fetch a LAUREL! Or a chair! Possibly both!', { cond: { minN: 10 } }),
  p('kill_streak', 'endurance', '{streak} kills without a pause. Either endurance, or everyone else is simply not coming back.', { cond: { minN: 10 } }),
  c('kill_streak', 'tally', '{streak}. I keep the tally on the wall. There is not much wall left.', { cond: { minN: 10 } }),
  b('kill_streak', 'chicken', '{streak} kills by a CHICKEN! The farmer is not returning my calls!', { cond: { def: 'sacred_chicken' } }),
  b('kill_streak', 'goat', 'THE GOAT has {streak}! Somebody give that animal a RANK!', { cond: { def: 'battle_goat' } }),
  p('kill_streak', 'goat_p', 'A goat on {streak} kills. Nobody asked it to. Nobody could have stopped it.', { cond: { def: 'battle_goat' } }),

  // ================= hero_down =================
  b('hero_down', 'parade', '{unit|The} is DOWN! Cancel the parade! Not the sponsors! Never the sponsors!', { chain: ['hero_down_parade_c'] }),
  c('hero_down', 'parade_c', 'The parade was cancelled in the second prophecy. Nobody read the memo.', { follow: true }),
  b('hero_down', 'statue', 'No! Not {unit|the}! The sculptor had already started on the NOSE!'),
  p('hero_down', 'army', 'The commander falls. The army becomes a crowd with equipment.'),
  c('hero_down', 'margin', 'Kill the officer and the nerve goes with him. I said so in the margin.'),
  b('hero_down', 'yours_b', 'Your {unit} has FALLEN! The army is looking at its feet! The sponsors are looking at the exits!', { cond: { team: 'player' } }),
  p('hero_down', 'yours_p', 'Your commander falls. They will fight on, because stopping would require a decision.', { cond: { team: 'player' } }),
  c('hero_down', 'yours_c', 'I said to guard {unit|the}. I said it in the plan. The plan is in the fire.', { cond: { team: 'player' } }),
  b('hero_down', 'theirs_b', 'THEIR {unit|up} IS DOWN! The enemy has just discovered what it was following!', { cond: { team: 'enemy' } }),
  p('hero_down', 'theirs_p', 'Their commander falls. Does an army without a head become a crowd, or a rumour?', { cond: { team: 'enemy' } }),
  c('hero_down', 'theirs_c', 'Their {unit} is gone. They will run now. Not all at once. Politely.', { cond: { team: 'enemy' } }),

  // ================= friendly_fire =================
  b('friendly_fire', 'clause', 'FRIENDLY fire! Terms of Conquest, clause nine: please stab only the other side!'),
  b('friendly_fire', 'same', '{unit|A} just killed {unit2|a}! SAME team! Unless I missed a memo!', { chain: ['friendly_fire_same_p', 'friendly_fire_same_c'] }),
  p('friendly_fire', 'same_p', 'The defence will argue that the target stood in the way.', { follow: true }),
  c('friendly_fire', 'same_c', 'It will happen again. Nobody listens.', { follow: true }),
  p('friendly_fire', 'question', 'Friendly fire. A misnomer, surely: is anything fired in friendship?'),
  c('friendly_fire', 'ledger', 'That is {lifetime:friendlyKills} of your own, lifetime. I said it was a pattern.', { cd: 480, cond: { stat: { name: 'friendlyKills', min: 10 } } }),
  b('friendly_fire', 'count', 'FRIENDLY fire, {n} so far! The arrows are not checking UNIFORMS!', { cond: { sub: 'generic' } }),
  p('friendly_fire', 'count_p', '{n} hits on their own side so far. Friendly is doing a lot of work in that phrase.', { cond: { sub: 'generic' } }),
  c('friendly_fire', 'count_c', '{n} friendly hits. I keep the count. Somebody should.', { cond: { sub: 'generic' } }),

  // ================= rout =================
  b('rout', 'running', 'They are RUNNING! {n} of them! Nobody told them the exit was the other way!'),
  p('rout', 'distance', '{n} soldiers have discovered distance. Is retreat anything but courage with a map?'),
  p('rout', 'opinion', 'Flight is the soldier\'s most honest opinion.'),
  c('rout', 'said', 'They run. I said they would run. They said they were repositioning.'),
  b('rout', 'yours_b', 'YOUR soldiers are running! {n} of them! Remind them where the enemy is, and that it is not behind them!', { cond: { team: 'player' } }),
  p('rout', 'yours_p', '{n} of yours have left in good order. Is that discipline, or panic with posture?', { cond: { team: 'player' } }),
  c('rout', 'yours_c', 'They ran. Morale is the one number nobody fixes in advance. I noted it.', { cond: { team: 'player' } }),
  b('rout', 'theirs_b', 'THEY are running! {n} of them! The enemy has discovered the OTHER direction!', { cond: { team: 'enemy' } }),
  p('rout', 'theirs_p', 'They run. Cowardice, or the first sensible decision of the day?', { cond: { team: 'enemy' } }),
  c('rout', 'theirs_c', 'They ran. I did not need to write that one down.', { cond: { team: 'enemy' } }),
  b('rout', 'rally_b', 'THEY ARE BACK! The runners have returned! Nobody ask where they have been!', { cond: { sub: 'rally' } }),
  p('rout', 'rally_p', 'They return. Courage, it seems, can be mislaid and then found.', { cond: { sub: 'rally' } }),
  c('rout', 'rally_c', 'They came back. They will leave again. I noted the times.', { cond: { sub: 'rally' } }),

  // ================= charge =================
  p('charge', 'physics', 'A charge is physics with a grudge. The horse does the arithmetic.'),
  c('charge', 'paragraph', 'The charge was in the third paragraph. I wrote the third paragraph. Nobody read it.'),
  b('charge', 'hooves', 'CHARGE! At full speed! That is a LOT of mass doing a lot of mass!'),
  b('charge', 'impact', 'IMPACT! Somewhere a very large animal is thinking: oh, we are really doing this!'),
  p('charge', 'momentum', 'Momentum has no opinions. It simply arrives.'),

  // ================= brace =================
  b('brace', 'fence', 'The spear wall says NO! The horse says: why?'),
  p('brace', 'spear', 'Spear: ten feet of persuasion. The horse is reconsidering.'),
  c('brace', 'told', 'Cavalry met spears. I told them. They bought horses anyway.'),
  b('brace', 'hedgehog', 'A hedgehog of spears! The horses are discovering what a HEDGE is!'),
  b('brace', 'said_no', 'BRACED! The spears said no! The horses, regrettably, were already committed!'),
  p('brace', 'geometry', 'The horse met the spear and learned a lesson about geometry.'),

  // ================= volley =================
  b('volley', 'shade', 'ARROWS! {n} of them! The sky goes dark and the shade company is thrilled!'),
  b('volley', 'weather', 'A rain of arrows! I LOVE weather that fights back!'),
  p('volley', 'sky', 'Arrows: an expensive way to learn the sky has opinions.'),
  c('volley', 'there', 'The volley will land on whoever is standing there. I said do not stand there.'),
  p('volley', 'dienekes', 'Told that arrows would hide the sun, Dienekes replied: good, shade. A cheerful man.', { cond: { arena: 'thermopylae' } }),
  p('volley', 'convinced', '{n} arrows in the air, each one convinced it is the important one.'),
  c('volley', 'someone', 'Every arrow lands on something. Today it is someone.'),

  // ================= boulder =================
  b('boulder', 'rated', 'BOULDER! Rated E for everyone nearby!'),
  p('boulder', 'blame', 'A boulder falls. Who is responsible: the rock, the engineer, or the man who stood there?'),
  p('boulder', 'crater', 'The crater is, strictly, a new landscape feature. Please do not mention the people in it.'),
  c('boulder', 'under', 'The boulder landed where the soldiers were. It always does.'),
  p('boulder', 'apology', 'A boulder: the one weapon that has never apologised.'),

  // ================= misfire =================
  b('misfire', 'union', 'The catapult has launched a WORKER! His union will have words!'),
  b('misfire', 'thumbs', 'A crewman is AIRBORNE! The rest of the crew give a very shaky thumbs up!'),
  p('misfire', 'flight', 'He wished to fly. A modest ambition, poorly supervised.'),
  c('misfire', 'four', 'Four percent. I said four percent. Nobody asked who.'),

  // ================= misaim =================
  b('misaim', 'horizon', 'The Cyclops has thrown a boulder at the HORIZON! Lovely view!'),
  p('misaim', 'depth', 'One eye. No depth. Is he aiming, or merely gesturing?'),
  c('misaim', 'quarter', 'A quarter of his throws go wide. That was one. The other three were aimed at you.'),

  // ================= chicken =================
  b('chicken', 'enough', 'The CHICKEN has had enough! Triple damage! Maximum squawk!', { cond: { sub: 'tantrum' } }),
  p('chicken', 'rage', 'Hurt a hen and discover the oldest weapon: the grudge.', { cond: { sub: 'tantrum' } }),
  c('chicken', 'act', 'A chicken will kill {unit|the}. I said this in the first act.', { cond: { sub: 'kill' } }),
  b('chicken', 'kill', 'The CHICKEN just killed {unit|a}! Somewhere a farmer is saying: told you!', { cond: { sub: 'kill' } }),
  c('chicken', 'ledger', 'Chicken kills, lifetime: {lifetime:chickenKills}. I keep the ledger. So do they.', { cd: 480, cond: { stat: { name: 'chickenKills', min: 25 } } }),
  p('chicken', 'general', '{lifetime:chickenKills} kills. At what number does a chicken become a general?', { cd: 480, cond: { stat: { name: 'chickenKills', min: 50 } } }),
  b('chicken', 'plan', 'The CHICKEN has a plan! Nobody knows what it is! Neither does the chicken!', { cond: { sub: 'tantrum' } }),

  // ================= goat =================
  b('goat', 'sent', 'ZEUS has sent a goat! The goat did not ask for our opinions!', { cond: { sub: 'intervention' } }),
  p('goat', 'hero', 'The goat arrives. Always the same goat, and always the actual protagonist.', { cond: { sub: 'intervention' } }),
  c('goat', 'decide', 'The goat will decide this. Nobody listens. The goat listens.', { cond: { sub: 'intervention' } }),
  b('goat', 'charge', 'GOAT CHARGE! It does it for glory, and for the hay!', { cond: { sub: 'kill' } }),
  p('goat', 'rank', 'The goat has {lifetime:goatKills} kills and no rank. Which of us is the fool?', { cd: 480, cond: { stat: { name: 'goatKills', min: 10 } } }),
  c('goat', 'kill', 'It was always going to be the goat. I wrote the goat first. The goat knew.', { cond: { sub: 'kill' } }),
  b('goat', 'beard', 'The GOAT! Bless that beard! Bless those horns! Bless that tiny helmet!', { cond: { sub: 'intervention' } }),

  // ================= philosopher =================
  p('philosopher', 'tactic', 'I do not follow him. Neither does the enemy. This is the tactic.'),
  c('philosopher', 'listen', 'They stopped to listen. Everyone dies listening.'),
  b('philosopher', 'monologue', 'The Philosopher is monologuing! The enemy has gone quiet! This is the SCARIEST part!'),
  p('philosopher', 'lecture', 'I recognise the technique. It is called a lecture. It is also a weapon.'),
  p('philosopher', 'explain', 'The philosopher is explaining the sword to the enemy. The enemy has, regrettably, started to listen.'),
  b('philosopher', 'nobody', 'The Philosopher has hit NOBODY! And the enemy is still LOSING! Explain THAT, Plato!'),

  // ================= senator =================
  b('senator', 'speech', 'The Senator has the FLOOR! Everyone else has the floor too! Asleep!', { cond: { sub: 'sleep' } }),
  p('senator', 'filibuster', 'The filibuster: history\'s gentlest siege weapon. Is boredom a wound?', { cond: { sub: 'sleep' } }),
  c('senator', 'hours', 'He will speak for four hours. They will sleep for four. Rome will bill both.', { cond: { sub: 'sleep' } }),
  b('senator', 'bribe', 'BRIBE! One coin, one defection! Corruption now comes with a five percent chance!', { cond: { sub: 'bribe' } }),
  p('senator', 'loyalty', 'An ally for a coin. Is loyalty a price, or merely a habit?', { cond: { sub: 'bribe' } }),
  c('senator', 'bought', 'He was bought, then used against his friends. Standard procedure in the Senate.', { cond: { sub: 'bribe_kill' } }),
  b('senator', 'bought_b', 'A bribed soldier just killed his OWN friend! Is that a tactic or a career move?', { cond: { sub: 'bribe_kill' } }),

  // ================= trojan =================
  b('trojan', 'open', 'THE HORSE HAS OPENED! Six hoplites! And I am told a small gift shop!'),
  p('trojan', 'lesson', 'A gift left unexamined. Does anyone ever learn, or do we only build better horses?'),
  c('trojan', 'told', 'I said not to open it. That is the story of Troy, and of my life.'),
  b('trojan', 'arena', 'Welcome to Troy! The gift shop is closed. The HORSE, however, is open!', { once: true, cond: { arena: 'troy' } }),

  // ================= medusa =================
  b('medusa', 'statues', 'Medusa just made {n} STATUES! That is a bigger gallery than most cities!'),
  c('medusa', 'look', 'They looked. Nobody has ever not looked.'),
  p('medusa', 'rude', 'She never makes eye contact. They do. Which of them is rude?'),

  // ================= elephant =================
  b('elephant', 'trample', 'The ELEPHANT is running over somebody! Roadkill, but ANCIENT!', { cond: { sub: 'trample' } }),
  b('elephant', 'stampede', 'The elephant is stampeding through his OWN lines! That is not a tactic, that is a lawsuit!', { cond: { sub: 'panic' } }),
  p('elephant', 'fire', 'Eleven tons of animal, undone by a torch. Perspective is a gift.', { cond: { sub: 'panic' } }),
  c('elephant', 'said', 'The elephant will panic and flatten its friends. I said fire. They brought fire.', { cond: { sub: 'panic' } }),
  c('elephant', 'weight', 'The elephant stepped on someone and did not notice. That is the whole problem with elephants.', { cond: { sub: 'trample' } }),

  // ================= kick =================
  b('kick', 'cus', 'SPARTA-cus has punted {unit2|a} into the next district!'),
  p('kick', 'sentence', 'He says almost nothing, and kicks the rest. Is that not economy?'),
  c('kick', 'eight', 'Eight units, every time. I measured. I measure everything. It has not helped.'),
  b('kick', 'lifetime', 'Your Spartans have kicked {lifetime:kicks} soldiers! That is a lot of CALF work!', { cd: 480, cond: { stat: { name: 'kicks', min: 15 } } }),

  // ================= immortal =================
  b('immortal', 'rise', 'He is UP again! They are called Immortals! Terms and conditions apply!', { cond: { sub: 'revive' } }),
  p('immortal', 'ten', 'Ten thousand. Give or take ten thousand.', { cond: { sub: 'revive' } }),
  c('immortal', 'once', 'The Immortal rose. He will not rise twice. The word was once.', { cond: { sub: 'revive' } }),
  b('immortal', 'again', 'And he is dead AGAIN! The asterisk wins!', { cond: { sub: 'second_death' } }),
  p('immortal', 'twice', 'Twice dead. Immortality, it seems, is a limited-time offer.', { cond: { sub: 'second_death' } }),

  // ================= throne =================
  b('throne', 'sit', 'XERXES sits down in the middle of a battle! Somebody bring snacks!', { cond: { sub: 'sit' } }),
  p('throne', 'view', 'The King of Kings requires a view. Is leadership not mostly seating?', { cond: { sub: 'sit' } }),
  c('throne', 'retreat', 'He will sit. Someone will touch him. He will shout retreat. I wrote it on the chair.', { cond: { sub: 'sit' } }),
  b('throne', 'up_b', 'XERXES IS UP! Somebody touched the THRONE! The word of the day is RETREAT!', { cond: { sub: 'stand' } }),
  p('throne', 'up_p', 'He sat, was disturbed, and fled. The King of Kings, undone by a chair.', { cond: { sub: 'stand' } }),
  c('throne', 'up_c', 'He fled. I told him about the chair. The chair did not listen either.', { cond: { sub: 'stand' } }),

  // ================= ability =================  (cast moments; every line is written for exactly one ability)
  b('ability', 'locusts_b', 'LOCUSTS! The Pharaoh has summoned a CLOUD! The sky is, frankly, mostly legs!', { cond: { sub: 'locusts' } }),
  p('ability', 'locusts_p', 'A plague, on demand. Is it still a plague if someone asked for it?', { cond: { sub: 'locusts' } }),
  c('ability', 'locusts_c', 'Locusts are only pests until somebody gives them a target.', { cond: { sub: 'locusts' } }),
  b('ability', 'horn_b', 'A HORN! A mighty horn! Everyone nearby just got faster and angrier!', { cond: { sub: 'horn' } }),
  p('ability', 'horn_p', 'A horn is only a loud request. The soldiers have chosen to treat it as an order.', { cond: { sub: 'horn' } }),
  c('ability', 'horn_c', 'He blew the horn. It can only be blown once. He chose now. I would have chosen later.', { cond: { sub: 'horn' } }),
  b('ability', 'execute_b', 'ANUBIS GUARD! He finishes the wounded! He is very POLITE about it!', { cond: { sub: 'execute' } }),
  p('ability', 'execute_p', 'The jackal-headed guard finishes what others began. Is it cruelty, or only good administration?', { cond: { sub: 'execute' } }),
  c('ability', 'execute_c', 'Below twenty percent they are paperwork. Anubis has the stamp.', { cond: { sub: 'execute' } }),
  b('ability', 'net_b', 'THE NET! A man throws a NET at another man! This is a very specific kind of fight!', { cond: { sub: 'net' } }),
  p('ability', 'net_p', 'A net: the only weapon that works by making the enemy think about their feet.', { cond: { sub: 'net' } }),
  c('ability', 'net_c', 'Two and a half seconds. That is what a net buys. It is enough, sometimes.', { cond: { sub: 'net' } }),
  b('ability', 'crowd_b', 'THE CROWD ROARS! Five enemies around one Gladiator! He loves it! He is a SHOWMAN!', { cond: { sub: 'crowd' } }),
  p('ability', 'crowd_p', 'The more enemies surround him, the better he fights. Is that courage, or marketing?', { cond: { sub: 'crowd' } }),
  c('ability', 'crowd_c', 'They have surrounded the Gladiator. He is delighted. I said do not surround the Gladiator.', { cond: { sub: 'crowd' } }),
  b('ability', 'druid_b', 'THE DRUID! One bolt, three enemies! A group discount from the sky!', { cond: { sub: 'druid' } }),
  p('ability', 'druid_p', 'Lightning hops from man to man. Gossip, at the speed of light.', { cond: { sub: 'druid' } }),
  c('ability', 'druid_c', 'Do not stand close together near a druid. I said this. Several of you did it anyway.', { cond: { sub: 'druid' } }),

  // ================= hazard =================
  b('hazard', 'lava', '{unit|The} walked into LAVA! Voluntarily? Unclear! The lava is not saying!', { cond: { sub: 'lava' } }),
  b('hazard', 'spikes', 'SPIKES! They were clearly marked! {unit|The} was clearly not reading!', { cond: { sub: 'spikes' } }),
  b('hazard', 'geyser', 'GEYSER! Up goes {unit|the}! Down comes {unit|the}! Physics always files its paperwork!', { cond: { sub: 'geyser' } }),
  p('hazard', 'drown', '{unit|The} drowned, and not even in the sea. Is there a cheaper way to lose?', { cond: { sub: 'drown' } }),
  c('hazard', 'marked', 'The hazard was marked. I marked it. Nobody reads maps.'),
  b('hazard', 'ground', 'The ground is trying to kill people! The ground is WINNING!'),
  b('hazard', 'gravity', 'GRAVITY! The oldest weapon on the field, and it has never missed!', { cond: { sub: 'fall' } }),
  p('hazard', 'fell', '{unit|The} fell. The ground, as ever, was waiting.', { cond: { sub: 'fall' } }),

  // ================= lead_change =================
  p('lead_change', 'momentum', 'The balance tips. We call it momentum. The soldiers call it oh no.'),
  p('lead_change', 'hands', 'The lead changes hands. Nothing else does. The spears remain with their owners.'),
  c('lead_change', 'keep', '{team} leads now. They will not keep it. They never do.'),
  b('lead_change', 'you_b', 'YOU are in the LEAD! Nobody panic! Especially not the leader!', { cond: { team: 'player' } }),
  b('lead_change', 'you_b2', 'YOU LEAD! The grape seller has gone to tell his friends!', { cond: { team: 'player' } }),
  c('lead_change', 'you_c2', 'You lead. I would say congratulations. I am saving it.', { cond: { team: 'player' } }),
  p('lead_change', 'you_p', 'You lead. A lead is a loan from the future, repaid with interest.', { cond: { team: 'player' } }),
  c('lead_change', 'you_c', 'You lead. Enjoy it. I will wait until you have finished enjoying it.', { cond: { team: 'player' } }),
  b('lead_change', 'them_b', 'THEY have the LEAD! The grape seller has quietly changed his hat!', { cond: { team: 'enemy' } }),
  b('lead_change', 'them_b2', 'THEY lead! This is the part where you do something CLEVER!', { cond: { team: 'enemy' } }),
  p('lead_change', 'them_p2', 'They are ahead. Ahead is not the same as right.', { cond: { team: 'enemy' } }),
  c('lead_change', 'them_c2', 'They lead. It is early. I have seen the end.', { cond: { team: 'enemy' } }),
  p('lead_change', 'them_p', 'The enemy leads. That, too, is information.', { cond: { team: 'enemy' } }),
  c('lead_change', 'them_c', 'They lead now. I wrote it on the first page. Nobody turned the page.', { cond: { team: 'enemy' } }),
  b('lead_change', 'ratio_b', '{ratio} to ONE! Somebody has brought the budget!', { cond: { ratioMin: 2 } }),
  p('lead_change', 'ratio_p', '{ratio} to one. At this point the ratio is a verdict.', { cond: { ratioMin: 3 } }),

  // ================= comeback =================
  b('comeback', 'dead', 'A COMEBACK! They were finished! They were gone! Apparently they were just resting!'),
  p('comeback', 'hope', 'From the brink. Perhaps hope is only arithmetic done late.'),
  c('comeback', 'quiet', 'I said {team} would recover. Quietly. Near the wall. Nobody listened.'),
  b('comeback', 'clause', '{team} strikes back! Terms of Conquest, clause twelve: comebacks may be DRAMATIC!'),
  b('comeback', 'them_b', 'THEY are coming BACK! I recommend you do something about that! ANYTHING!', { cond: { team: 'enemy' } }),
  c('comeback', 'you_c', 'You recovered. I marked it. Please do not let it go to your head.', { cond: { team: 'player' } }),

  // ================= big_swing =================  (flank is where the LOSING side lost its soldiers; the sim says "center" most of the time)
  c('big_swing', 'fold', 'I said the {flank} flank would fold. Twice.', { cond: { flank: ['left', 'right'] } }),
  c('big_swing', 'cluster', 'They are clustered. I said do not cluster. Now it is {ratio} to one.', { cond: { cluster: true } }),
  c('big_swing', 'foretold', '{team} took the {flank}. As foretold.', { cond: { flank: ['left', 'right'] } }),
  b('big_swing', 'flank', 'The {flank} flank is DONE! Somebody tell them it is rude to turn up like that!', { cond: { flank: ['left', 'right'] } }),
  p('big_swing', 'arith', 'The ratio is {ratio} to one. Arithmetic, I find, is never on anybody\'s side.'),
  c('big_swing', 'wall', 'It swung {flank}. {ratio} to one. I wrote it down. On a wall.', { cond: { flank: ['left', 'right'] } }),
  b('big_swing', 'mid_b', 'The CENTRE has collapsed! There is no flank to blame! Just a gap, and everyone is in it!', { cond: { flank: 'center' } }),
  p('big_swing', 'mid_p', 'The middle gave way. Even a philosopher could have predicted the middle.', { cond: { flank: 'center' } }),
  c('big_swing', 'mid_c', 'The middle folded. I said the middle. It is always the middle in the end.', { cond: { flank: 'center' } }),
  b('big_swing', 'yours_b', 'YOUR {flank} flank is FOLDING! Somebody tell it to stop folding!', { cond: { team: 'enemy', flank: ['left', 'right'] } }),
  b('big_swing', 'theirs_b', 'THEIR {flank} flank is folding! Press the advantage! Press it with something SHARP!', { cond: { team: 'player', flank: ['left', 'right'] } }),
  b('big_swing', 'yours_mid', 'YOUR line is buckling in the MIDDLE! Hold it! Hold it with SPEARS!', { cond: { team: 'enemy', flank: 'center' } }),
  b('big_swing', 'theirs_mid', 'THEIR middle is giving way! Push! PUSH! Push with FEELING!', { cond: { team: 'player', flank: 'center' } }),

  // ================= army_low =================
  p('army_low', 'gathering', 'At {pct} percent, an army is only a gathering with opinions about leaving.'),
  c('army_low', 'end', '{pct} percent. The end is near. Nobody listens. It is near.'),
  b('army_low', 'hats', 'Only {pct} percent of {team} left! That is mostly HATS!'),
  b('army_low', 'yours_b', 'YOU are down to {pct} percent! That is not an army, that is a SUGGESTION of an army!', { cond: { team: 'player' } }),
  p('army_low', 'yours_p', '{pct} percent of your army remains. The rest have become anecdotes.', { cond: { team: 'player' } }),
  c('army_low', 'yours_c', '{pct} percent. You will want to retreat. There is nowhere to go. I checked.', { cond: { team: 'player' } }),
  b('army_low', 'theirs_b', 'THEY are down to {pct} percent! That is not an army, that is a CHOIR!', { cond: { team: 'enemy' } }),
  p('army_low', 'theirs_p', '{pct} percent of theirs remain. At some point mercy becomes arithmetic.', { cond: { team: 'enemy' } }),
  c('army_low', 'theirs_c', '{pct} percent of theirs. They know. They are being very brave about it.', { cond: { team: 'enemy' } }),

  // ================= stalemate =================  (the sim warns after 12 s without damage, forces an advance at 18, Zeus at 30, ragequit at 44)
  b('stalemate', 'picnic', 'NOBODY is fighting! Is this a standoff or a very loud picnic?'),
  p('stalemate', 'contemplation', 'Stalemate. Philosophy calls it contemplation. Brutus calls it a refund.'),
  p('stalemate', 'diplomacy', 'Two armies, equally unwilling. We have accidentally invented diplomacy.'),
  c('stalemate', 'zeus', 'In six seconds someone moves. In eighteen, Zeus does.'),
  c('stalemate', 'sleep', 'Everyone is waiting for someone else. This is how empires fall asleep.'),
  c('stalemate', 'stand', 'This is the part where Zeus gets involved. I would stand somewhere else.'),

  // ================= zeus =================
  b('zeus', 'bolt', 'ZEUS has intervened! One bolt! He gets bored in about thirty seconds, folks!', { cond: { sub: 'bolt' } }),
  c('zeus', 'bad_day', 'Zeus is having a bad day. The goat will not help him.', { cond: { sub: 'bolt' } }),
  b('zeus', 'quit', 'ZEUS HAS RAGEQUIT! He did not even say goodbye to Hera!', { cond: { sub: 'ragequit' }, chain: ['zeus_quit_p', 'zeus_quit_c'] }),
  p('zeus', 'quit_p', 'He will be back. Gods always are.', { follow: true }),
  c('zeus', 'quit_c', 'Next Thursday. I said.', { follow: true }),
  p('zeus', 'quit_alt', 'Zeus has left. Has any god ever stayed for the ending?', { cond: { sub: 'ragequit' } }),
  p('zeus', 'left', 'Zeus departs, and with him the battle. A draw. Even gods leave early.', { cond: { sub: 'draw' } }),
  b('zeus', 'draw', 'A DRAW! Zeus took his lightning and went home!', { cond: { sub: 'draw' } }),
  c('zeus', 'prologue', 'Zeus stormed off. I predicted it. In the prologue. Of everything.', { cond: { sub: 'draw' } }),
  c('zeus', 'count', 'Zeus has left {lifetime:zeusRagequits} times now. He always comes back. As foretold.', { cd: 480, cond: { sub: 'draw', stat: { name: 'zeusRagequits', min: 3 } } }),
  b('zeus', 'email', 'ZEUS is tired of waiting! He is sending lightning! That is what gods do instead of emails!', { cond: { sub: 'bolt' } }),

  // ================= victory =================  (n = survivors; lines that count them need minN 2, the lone survivor has a sub of his own)
  b('victory', 'terms', 'VICTORY for {team}! {n} survivors! The Terms of Conquest have been enforced!', { cond: { minN: 2 }, chain: ['victory_terms_p'] }),
  p('victory', 'terms_p', 'And nobody, I notice, read them.', { follow: true }),
  b('victory', 'grapes', 'It is over! {n} left standing, mostly {unit|pl}! Somebody fetch the GRAPES!', { cond: { minN: 2 } }),
  b('victory', 'pizza', 'A decisive win! Pompeii Pizza congratulates {team} with a coupon, valid until the next ERUPTION!'),
  p('victory', 'puzzled', 'The last {unit|pl} stand. They look puzzled, as winners do.', { cond: { minN: 2 } }),
  c('victory', 'remember', 'Nobody will remember the details. They will remember {unit|the}.'),
  b('victory', 'wins', 'Win number {lifetime:wins}! We are putting your name on a WALL. Not a nice one!', { once: true, cd: 480, cond: { milestone: { name: 'wins', at: [10, 25, 50, 100] } } }),
  p('victory', 'milestone', '{lifetime:wins} wins. Is a record an achievement, or only a long habit?', { once: true, cd: 480, cond: { milestone: { name: 'wins', at: [10, 25, 50, 100] } } }),
  c('victory', 'notes', 'It went as I wrote. Slightly worse for the other side.'),
  c('victory', 'mission', 'You won {mission}. They will put it on a plaque. A small one.'),
  b('victory', 'first_b', 'YOUR FIRST VICTORY! The Terms of Conquest now include your name! In pencil!', { weight: 4, once: true, cond: { milestone: { name: 'wins', at: [1] } } }),
  p('victory', 'first_p', 'A first victory. It will feel like skill. It may be skill. It is too early to say.', { weight: 4, once: true, cond: { milestone: { name: 'wins', at: [1] } } }),
  c('victory', 'first_c', 'The first win. I wrote the date. I will write the second one, if there is one.', { weight: 4, once: true, cond: { milestone: { name: 'wins', at: [1] } } }),
  b('victory', 'buffet', '{team} WINS! Terms of Conquest, clause fourteen: the winner may stab the BUFFET!'),
  p('victory', 'agree', 'Victory: the moment when everyone remaining agrees about who was right.'),
  p('victory', 'winners', 'The winners will say it was planned. The losers will say it was the weather. Both are measuring something.'),
  c('victory', 'enemy', 'They lost. I wrote it down before they did.'),
  b('victory', 'flawless_b', 'FLAWLESS! Not one soldier lost! The sculptors are FURIOUS! There is nothing to carve!', { weight: 3, cond: { sub: 'flawless' } }),
  p('victory', 'flawless_p', 'No losses. Is a perfect victory a battle won, or a battle that never quite happened?', { weight: 3, cond: { sub: 'flawless' } }),
  c('victory', 'flawless_c', 'Nobody fell. I never noted that outcome. Please do it again so I can write it down.', { weight: 3, cond: { sub: 'flawless' } }),
  b('victory', 'tiny_b', 'You won with HALF their army! The sponsors have started calling you "frugal"! They mean it kindly!', { weight: 3, cond: { sub: 'tiny' } }),
  p('victory', 'tiny_p', 'A smaller army won. History loves this, and has been wrong about it before.', { weight: 3, cond: { sub: 'tiny' } }),
  c('victory', 'tiny_c', 'They had more. You had a plan. I noted the plan. It surprised me. That is rare.', { weight: 3, cond: { sub: 'tiny' } }),
  b('victory', 'last_b', 'ONE soldier left standing, and it is {unit|the}! Give it a LAUREL! Give it a SEAT!', { cond: { sub: 'last_man' } }),
  p('victory', 'last_p', 'One survivor. Is a lone {unit} an army, or merely a very lucky witness?', { cond: { sub: 'last_man' } }),
  c('victory', 'last_c', 'One left. {unit|The}. I counted the others. It did not take long.', { cond: { sub: 'last_man' } }),
  b('victory', 'goat_b', 'THE GOAT SURVIVES! Naturally! The helmet did not even slip!', { weight: 3, cond: { sub: 'goat' } }),
  p('victory', 'goat_p', 'The goat has outlasted generals. It does not know. It does not need to.', { weight: 3, cond: { sub: 'goat' } }),
  c('victory', 'goat_c', 'The goat stands. Of course it does. I wrote the goat first, on the wall.', { weight: 3, cond: { sub: 'goat' } }),
  b('victory', 'rout_b', 'They BROKE! The enemy army has left the building and taken the building with them!', { weight: 3, cond: { sub: 'rout' } }),
  p('victory', 'rout_p', 'They fled. A victory by absence. The most efficient kind.', { weight: 3, cond: { sub: 'rout' } }),
  c('victory', 'rout_c', 'The enemy left before the end. Even I was surprised. I am rarely surprised.', { weight: 3, cond: { sub: 'rout' } }),
  b('victory', 'quick_b', 'OVER in {secs} seconds! The sponsors want to know if they get a REFUND! (No!)', { weight: 3, cond: { sub: 'quick' } }),
  p('victory', 'quick_p', '{secs} seconds. Brief, like most good arguments.', { weight: 3, cond: { sub: 'quick' } }),
  c('victory', 'quick_c', '{secs} seconds. I wrote "short". Short was an overstatement.', { weight: 3, cond: { sub: 'quick' } }),
  b('victory', 'long_b', '{mins} MINUTES! That is a SHIFT! Somebody check on the grape seller!', { weight: 3, cond: { sub: 'long' } }),
  p('victory', 'long_p', '{mins} minutes of battle. Endurance, or merely poor planning on both sides?', { weight: 3, cond: { sub: 'long' } }),
  c('victory', 'long_c', '{mins} minutes. I said it would be long. I did not say this long.', { weight: 3, cond: { sub: 'long' } }),
  b('victory', 'duel_b', 'VICTORY! One soldier beat one soldier! The Terms of Conquest list this under OBVIOUS!', { cond: { sub: 'duel' } }),
  p('victory', 'duel_p', 'One of them is left. Is that a victory, or only a smaller silence?', { cond: { sub: 'duel' } }),
  c('victory', 'duel_c', 'As foretold: one stands. I would have said which. You did not ask.', { cond: { sub: 'duel' } }),

  // ================= defeat =================
  b('defeat', 'fall', 'DEFEAT! {team} falls! Their spirit lives on! Their lunch, regrettably, does not!'),
  p('defeat', 'teaching', 'A defeat is only a battle that has finished teaching.'),
  c('defeat', 'left', 'I said left flank. I said left flank. I said left flank.'),
  c('defeat', 'unit', 'You lost to {unit|pl}. I noted that, in the margin. Underlined.'),
  c('defeat', 'chicken', 'The {lifetime:chickenDefeats|ord} chicken defeat. I keep a ledger. The chickens keep another.', { cd: 480, cond: { sub: 'chicken', stat: { name: 'chickenDefeats', min: 1 } } }),
  b('defeat', 'chicken_b', 'Beaten by CHICKENS! Again! That is {lifetime:chickenDefeats|words} times now! The league has noticed!', { cd: 480, cond: { sub: 'chicken', stat: { name: 'chickenDefeats', min: 2 } } }),
  p('defeat', 'chicken_p', 'Defeated by poultry. Is it shame if the poultry are sacred?', { cond: { sub: 'chicken' } }),
  p('defeat', 'flattery', 'Defeat has the singular advantage of teaching without flattery.'),
  c('defeat', 'tomorrow', 'You will try again tomorrow. Differently. Then I will say I said.'),
  c('defeat', 'mission', '{mission} beat you. It is in my notes. I wrote it down twice.'),
  b('defeat', 'first_b', 'Your first DEFEAT! Every great general has one! Some have eleven!', { weight: 4, once: true, cond: { stat: [{ name: 'losses', min: 1, max: 1 }, { name: 'wins', max: 0 }] } }),
  p('defeat', 'first_p', 'A first defeat. The sooner it arrives, the cheaper the lesson.', { weight: 4, once: true, cond: { stat: [{ name: 'losses', min: 1, max: 1 }, { name: 'wins', max: 0 }] } }),
  b('defeat', 'basket', 'DEFEAT! The fruit basket has been quietly CANCELLED!'),
  b('defeat', 'weather', 'Terms of Conquest, clause sixteen: the loser may blame the WEATHER! Please check the sky!'),
  p('defeat', 'plan', 'Defeat: when the plan meets the ground, and the ground has a plan of its own.'),
  c('defeat', 'rematch', 'The rematch key is R. I would hold the line this time.'),
  b('defeat', 'third_b', '{nth|words} defeats in a ROW! The sponsors are asking if you are okay! (They mean the sponsorship!)', { weight: 3, cond: { sub: 'third_loss' } }),
  p('defeat', 'third_p', '{nth|words} losses. The first is a lesson. The third is a habit.', { weight: 3, cond: { sub: 'third_loss' } }),
  c('defeat', 'third_c', '{nth|words} in a row. I have run out of wall.', { weight: 3, cond: { sub: 'third_loss' } }),
  b('defeat', 'duel_b', 'DEFEAT! One soldier lost to one soldier! The sculptor has not even been INFORMED!', { cond: { sub: 'duel' } }),
  p('defeat', 'duel_p', 'One lost to one. No flank, no formation, no excuse. Is that clarifying?', { cond: { sub: 'duel' } }),
  c('defeat', 'duel_c', 'One against one. The other one won. That is the entire report.', { cond: { sub: 'duel' } }),
  b('defeat', 'crush_b', 'They lost almost NOBODY! That is not a battle, that is a GUIDED TOUR!', { weight: 3, cond: { sub: 'crush' } }),
  p('defeat', 'crush_p', 'They hardly lost anyone. A defeat so complete it is almost courteous.', { weight: 3, cond: { sub: 'crush' } }),
  c('defeat', 'crush_c', 'They kept nearly all of theirs. I have a sentence for that. It is short.', { weight: 3, cond: { sub: 'crush' } }),
  b('defeat', 'close_b', 'SO close! They have {n|words} left! A SNEEZE would have changed it!', { weight: 3, cond: { sub: 'close' } }),
  p('defeat', 'close_p', '{n|words} left on their side. A rounding error decided it. Is that comforting?', { weight: 3, cond: { sub: 'close' } }),
  c('defeat', 'close_c', '{n|words} left on their side. Two more arrows and I would be quiet. I am rarely quiet.', { weight: 3, cond: { sub: 'close' } }),

  // ================= timeout =================
  b('timeout', 'time', 'TIME! Decided by remaining cost, the least romantic way to win anything!', { cond: { sub: 'time' } }),
  c('timeout', 'accounting', 'It came down to accounting at {mins} minutes. Accounting always wins. I said accounting.', { cond: { sub: 'time' } }),
  p('timeout', 'clock', 'The clock decided, and the clock has no opinion. Is that fairness, or only indifference?', { cond: { sub: 'time' } }),
  b('timeout', 'draw', 'A DRAW! Nobody wins! Everybody gets a participation laurel!', { cond: { sub: 'draw' } }),
  c('timeout', 'draw_c', 'Nobody won. I said nobody would. They did not enjoy being right.', { cond: { sub: 'draw' } }),
  p('timeout', 'nothing', 'A draw: both sides win nothing in equal amounts.', { cond: { sub: 'draw' } }),

  // ================= mass_death =================
  b('mass_death', 'effect', '{n} DOWN at once! That is not a battle, that is a special effect!'),
  b('mass_death', 'discount', 'Whoever was standing together just got a GROUP discount on dying!'),
  c('mass_death', 'cluster', '{n} went together. I said do not cluster.'),
  p('mass_death', 'spread', '{n} fell at once. A tragedy, or merely a good argument for standing further apart?'),
  b('mass_death', 'sculptor', '{n} in two seconds! Somebody call the sculptor! Somebody call SEVERAL!'),
  c('mass_death', 'decision', '{n} at once. A clump is a decision. Somebody decided.'),

  // ================= prop_destroyed =================
  b('prop_destroyed', 'landlord', 'The {prop} is DOWN! Somebody\'s landlord is furious!'),
  p('prop_destroyed', 'stood', 'The {prop} falls. It stood for centuries, or until Tuesday.'),
  b('prop_destroyed', 'insurance', 'Property damage! Delphi Insurance says: we SAW this coming!'),
  c('prop_destroyed', 'map', 'The {prop} was on the map. I marked it. Nobody read the map.'),
  p('prop_destroyed', 'minute', 'Years to build the {prop}. One minute to lose it. History is mostly this.'),

  // ================= god_power =================
  b('god_power', 'meteor', 'A METEOR! The dinosaurs called! They want their extinction back!', { cond: { sub: 'meteor' } }),
  c('god_power', 'meteor_c', 'It lands in the middle. They stood in the middle.', { cond: { sub: 'meteor' } }),
  b('god_power', 'quake', 'EARTHQUAKE! The ground has joined the fight! Poor sport, the ground!', { cond: { sub: 'earthquake' } }),
  c('god_power', 'quake_c', 'The ground was never on anyone\'s side.', { cond: { sub: 'earthquake' } }),
  b('god_power', 'wine', 'WINE RAIN! Everyone is tipsy! Damage is down forty percent, spirits up a hundred!', { cond: { sub: 'wine_rain' } }),
  p('god_power', 'wine_p', 'Wine falls from the sky and the soldiers drink. A war, or a Thursday?', { cond: { sub: 'wine_rain' } }),
  c('god_power', 'wine_c', 'They will be sober by morning. Not all will see morning.', { cond: { sub: 'wine_rain' } }),
  b('god_power', 'heal', 'HEALING! Everyone is on their feet again, even the one who was definitely dead!', { cond: { sub: 'heal_wave' } }),
  c('god_power', 'heal_c', 'They are healed. They will die later, slightly further away.', { cond: { sub: 'heal_wave' } }),
  b('god_power', 'chickens', 'EIGHT chickens! Eight! That is a war party!', { cond: { sub: 'raise_chickens' } }),
  p('god_power', 'chickens_p', 'Why chickens? The gods will not say. The chickens will, loudly.', { cond: { sub: 'raise_chickens' } }),
  b('god_power', 'bolt', 'LIGHTNING! One bolt, many sorry hoplites! Rated T for thunder!', { cond: { sub: 'zeus_lightning' } }),
  c('god_power', 'bolt_c', 'The bolt jumped four times. I counted the jumps. I did not count the survivors.', { cond: { sub: 'zeus_lightning' } }),

  // ================= wave =================
  b('wave', 'bus', 'WAVE {n}! They keep coming! It is like a very violent bus service!'),
  p('wave', 'climate', 'Wave {n}. When does a crowd of enemies become a climate?'),
  c('wave', 'more', 'Wave {n}. There will be more. There are always more.'),
  p('wave', 'supply', 'Wave {n}. Perhaps the lesson is that the enemy has a better supply of enemy.'),
  c('wave', 'larger', 'Wave {n} is larger than the last. I noted that. I would plan for it.'),

  // ================= idle_filler =================
  b('idle_filler', 'pompeii', 'Brought to you by Pompeii Pizza: now with twenty percent more ASH!'),
  b('idle_filler', 'grapes', 'Camera, row ten: a man says he is just here for the free GRAPES. We respect that.'),
  b('idle_filler', 'oil', 'Athenian Olive Oil: slippery since 600 BC! That is a sponsor message and also a WARNING.'),
  b('idle_filler', 'delphi', 'Delphi Insurance: we SAW this coming! Ask Cassandra!', { chain: ['idle_filler_delphi_c'] }),
  c('idle_filler', 'delphi_c', 'Nobody asked me.', { follow: true }),
  b('idle_filler', 'platypus', 'And now, back to PLATYPUS!', { chain: ['idle_filler_platypus_p', 'idle_filler_platypus_b'] }),
  p('idle_filler', 'platypus_p', 'Plato.', { follow: true }),
  b('idle_filler', 'platypus_b', 'That is what I said!', { follow: true }),
  p('idle_filler', 'essence', 'A battle is, in its essence, the...', { chain: ['idle_filler_essence_b', 'idle_filler_essence_p'] }),
  b('idle_filler', 'essence_b', 'FIGHT! It is a fight!', { follow: true }),
  p('idle_filler', 'essence_p', 'I was going to say: disagreement. But yes.', { follow: true }),
  p('idle_filler', 'define', 'I spent the morning defining battle. The battle interrupted me.'),
  c('idle_filler', 'goat', 'The goat knows. Ask the goat.'),
  b('idle_filler', 'zeus', 'Zeus is watching! He gets bored in about thirty seconds, so work on your ENTERTAINMENT!'),
  c('idle_filler', 'ledger', 'Total lifetime kills: {lifetime:kills}. I keep the number. Somebody has to.', { cd: 480, cond: { stat: { name: 'kills', min: 100 } } }),
  p('idle_filler', 'problems', 'It is remarkable how many problems begin with two armies and a field.'),
  c('idle_filler', 'mistake', 'Somewhere a general is making the mistake I warned him about.'),
  p('idle_filler', 'spear', 'What is a spear, if not a long argument that has stopped being polite?'),

  // ================= campaign_* (start / win / lose per mission; one voice each, all three voices per mission) =================
  b('campaign_marathon_sort_of', 'start', 'Welcome to Marathon! SORT of! A great victory, historically, and a long walk, ceremonially!', { cond: { sub: 'start' } }),
  p('campaign_marathon_sort_of', 'win', 'We won at Marathon. Someone should run and tell Athens. Not me.', { cond: { sub: 'win' } }),
  c('campaign_marathon_sort_of', 'lose', 'You lost Marathon. History will be confused. So am I.', { cond: { sub: 'lose' } }),
  p('campaign_thermopylae_snack', 'start', 'The Hot Gates: a narrow pass, a small army, and a very large snack table. What is courage?', { cond: { sub: 'start' } }),
  p('campaign_thermopylae_snack', 'win', 'The gates held. Is courage the wall, or the thing that refuses to leave it?', { cond: { sub: 'win' } }),
  b('campaign_thermopylae_snack', 'lose', 'THEY WENT AROUND! A narrow pass is only narrow until somebody mentions a goat path!', { cond: { sub: 'lose' } }),
  b('campaign_pyramid_scheme', 'start', 'PYRAMID SCHEME! Take out the Pharaoh and you are the boss! Which is how pyramid schemes work!', { cond: { sub: 'start' } }),
  b('campaign_pyramid_scheme', 'win', 'THE PHARAOH IS DOWN! The scheme has collapsed! Please keep your receipts!', { cond: { sub: 'win' } }),
  c('campaign_pyramid_scheme', 'lose', 'The Pharaoh stands. A plan with this many gaps was never going to topple him. I noted the gaps.', { cond: { sub: 'lose' } }),
  c('campaign_nile_crossing', 'start', 'The goat must cross the Nile. Nobody listens when I say the goat is the point.', { cond: { sub: 'start' } }),
  b('campaign_nile_crossing', 'win', 'THE GOAT CROSSED! The sculptor is already sizing a SMALL, HEROIC marble! The goat has not been told!', { cond: { sub: 'win' } }),
  c('campaign_nile_crossing', 'lose', 'No goat across, no star. The river kept the helmet. I marked the spot.', { cond: { sub: 'lose' } }),
  b('campaign_alps_elephant', 'start', 'The ALPS! Elephants! Snow! A man with an eyepatch and a plan!', { cond: { sub: 'start' } }),
  p('campaign_alps_elephant', 'win', 'Victory in the snow. The elephants will want sweaters.', { cond: { sub: 'win' } }),
  c('campaign_alps_elephant', 'lose', 'The elephants panicked and flattened their friends. Rome did not even have to aim.', { cond: { sub: 'lose' } }),
  b('campaign_teutoburg_peekaboo', 'start', 'Teutoburg Forest! Thick fog, a long column, and the politest AMBUSH in history!', { cond: { sub: 'start' } }),
  p('campaign_teutoburg_peekaboo', 'win', 'Surprise is the cheapest weapon, and the most effective. Politeness helps.', { cond: { sub: 'win' } }),
  b('campaign_teutoburg_peekaboo', 'lose', 'SPOTTED! The ambush has been POLITELY declined! Please try again with thicker trees!', { cond: { sub: 'lose' } }),
  b('campaign_troy_giftshop', 'start', 'TROY! A wall, a gate, and a gift shop that is NOT included in the price!', { cond: { sub: 'start' } }),
  b('campaign_troy_giftshop', 'win', 'THE GATE FALLS! The horse has opened! Nobody has asked for a receipt! I checked!', { cond: { sub: 'win' } }),
  c('campaign_troy_giftshop', 'lose', 'The horse stayed shut. I said it would. A horse that is not opened is only a very large chair.', { cond: { sub: 'lose' } }),
  c('campaign_cyclops_meet', 'start', 'The Cyclops misses a quarter of his throws. He is also ten tons. Do not stand still.', { cond: { sub: 'start' } }),
  p('campaign_cyclops_meet', 'win', 'The Cyclops falls. He never learned to aim, only to hit hard. A fair review of most careers.', { cond: { sub: 'win' } }),
  b('campaign_cyclops_meet', 'lose', 'THE CYCLOPS WINS! Somebody tell him it was not his aim! It was NEVER his aim!', { cond: { sub: 'lose' } }),
  b('campaign_zeus_bad_day', 'start', 'MOUNT OLYMPUS! Monsters, lightning and a very annoyed Zeus! He woke up like this!', { cond: { sub: 'start' } }),
  b('campaign_zeus_bad_day', 'win', 'ZEUS HAS RUN OUT OF LIGHTNING! Or patience! Or both! The sky is QUIET!', { cond: { sub: 'win' } }),
  p('campaign_zeus_bad_day', 'lose', 'You lost to a god in a mood. There is no shame in this, and no appeal.', { cond: { sub: 'lose' } }),
];


// ===================================================================================================
// Selector
// ===================================================================================================

/** Category priorities (1-5). At speed > 2x only priority >= 4 may speak. campaign_* are always 5. */
export const CATEGORY_PRIORITY = {
  battle_start: 5, first_blood: 5, kill_streak: 4, hero_down: 5, friendly_fire: 4, rout: 4, charge: 3, brace: 4, volley: 2,
  boulder: 4, misfire: 5, misaim: 4, chicken: 4, goat: 4, philosopher: 4, senator: 4, trojan: 5, medusa: 4, elephant: 4,
  kick: 4, immortal: 4, throne: 4, ability: 3, hazard: 3, lead_change: 4, comeback: 5, big_swing: 4, army_low: 4, stalemate: 5, zeus: 5,
  victory: 5, defeat: 5, timeout: 5, mass_death: 4, prop_destroyed: 3, god_power: 4, wave: 4, idle_filler: 1,
};
export function categoryPriority(cat) { return cat.indexOf('campaign_') === 0 ? 5 : (CATEGORY_PRIORITY[cat] || 3); }

export const ARENA_NAMES = {
  marathon: 'Marathon Plain', thermopylae: 'the Hot Gates', colosseum: 'the Colosseum', nile: 'the Nile Delta', giza: 'the Giza Plateau',
  persepolis: 'the Persepolis Courtyard', carthage: 'Carthage Harbor', teutoburg: 'Teutoburg Forest', alpine: 'the Alpine Pass',
  olympus: 'Mount Olympus', troy: 'the Siege of Troy', styx: 'the River Styx', cyclops: 'Cyclops Isle', oasis: 'the Oasis',
  arenalab: 'the Arena Lab', random: 'a Randomly Generated Field',
};
export const MISSION_TITLES = {
  marathon_sort_of: 'Marathon (Sort Of)', thermopylae_snack: 'The 300 Slightly Overweight Spartans', pyramid_scheme: 'Pyramid Scheme',
  nile_crossing: 'Goat Across the Nile', alps_elephant: 'Hannibal Ante Portas', teutoburg_peekaboo: 'Teutoburg Hide and Seek',
  troy_giftshop: 'Siege of Troy (Gift Shop Not Included)', cyclops_meet: 'Cyclops Isle Meet-and-Greet', zeus_bad_day: 'Zeus Has a Bad Day',
};
export const PROP_NAMES = {
  wall_stone: 'wall', tower: 'tower', arch_gate: 'gate', gate_door: 'gate', column_marble: 'column', ruin_wall: 'ruin', tent: 'tent',
  statue_lion: 'lion statue', ship: 'ship', temple: 'temple', throne: 'throne', obelisk: 'obelisk',
};

export const DEFAULT_CONFIG = {
  minGap: 3.5,          // s between line starts (real time)
  minGapP5: 1.5,        // s for priority 5
  beat: 1.1,            // s between chain beats
  avgGap: 9.5,          // token refill = 1 / avgGap; with priority-5 moments on top this lands near one line per ~8 s in a battle
  tokenCap: 1.6,
  tokenFloor: -1.5,
  need: { 1: 0.9, 2: 0.5, 3: 0.5, 4: 0.5, 5: -99 },
  catCooldown: 20,
  fillerCooldown: 45,
  recencyN: 14,         // last N line ids are never repeated
  repeatWindow: 840,    // soft memory: a line heard in the last 14 minutes (a whole first session) is strongly avoided, so silence beats a repeat
  fillerQuiet: 14,      // s of silence before an idle filler may fire
  fastSpeed: 2,         // above this speed only priority >= 4 speaks, and the booth talks less (slower token refill, priority 5 must also have a little budget)
  fastRefill: 0.6,
  fastP5Need: -0.8,
  ttl: { 1: 4, 2: 9, 3: 9, 4: 8, 5: 10 },
  aging: 2,             // a waiting candidate gains up to this much effective priority as it ages, so gags are not starved by bigger moments
  hungryAfter: 120,     // a category silent this long may speak even when the token bucket is nearly empty (rare gags get heard)
  hungryNeed: -0.6,
  hunger: 2.5,          // a category that has been silent for 2+ minutes gains up to this much, so rare gags get a turn over frequent ones
};

/** Moments whose generic lines would be false (a 1v1 has no armies, no flank and no "survivors"): only lines with a matching cond.sub may speak. */
const EXCLUSIVE = new Set(['battle_start:duel', 'victory:duel', 'defeat:duel', 'victory:last_man', 'rout:rally']);
/** Moments that are stale once the battle has ended: a first-blood line must never follow the defeat line. */
const STALE_AT_END = new Set(['first_blood', 'kill_streak', 'mass_death', 'volley', 'charge', 'brace', 'boulder', 'prop_destroyed', 'big_swing', 'lead_change', 'army_low', 'comeback', 'friendly_fire', 'rout', 'misfire', 'misaim', 'hazard', 'ability', 'philosopher', 'senator', 'goat', 'chicken', 'elephant', 'medusa', 'trojan', 'throne', 'god_power', 'kick', 'immortal', 'idle_filler', 'stalemate', 'wave']);
/** ability_cast ids the booth reacts to, and the sub-moment each one becomes (category 'ability'). */
const ABILITY_SUB = { dot_cloud: 'locusts', war_horn: 'horn', execute: 'execute', net: 'net', chain_lightning: 'druid' };

const TOKEN_RE = /\{([a-z0-9_]+)(?::([A-Za-z0-9_]+))?(?:\|([A-Za-z]+))?\}/g;
const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

function ordinal(n) {
  n = Math.floor(n);
  if (n >= 0 && n < ORD.length) return ORD[n];
  const v = n % 100;
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
}
const wordsOf = (n) => (n >= 0 && n <= 20 ? WORDS[Math.floor(n)] : String(n));
const numOf = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const withArticle = (s) => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const hasValue = (v) => v !== undefined && v !== null && !(typeof v === 'number' && !Number.isFinite(v)) && v !== '';

function tokensOf(text) {
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) out.push({ name: m[1], arg: m[2], filter: m[3] });
  return out;
}

function resolveToken(t, slots, stats) {
  let v;
  if (t.name === 'lifetime') v = stats ? stats[t.arg] : undefined;
  else v = slots[t.name];
  if (!hasValue(v)) return null;
  const proper = t.name !== 'lifetime' && isProper(slots[t.name + 'Def']);          // "Hannibal" and named custom soldiers take no article
  if (t.filter === 'pl') { const pl = slots[t.name + '_pl']; if (hasValue(pl)) v = pl; }
  else if (t.filter === 'a') v = proper ? String(v) : withArticle(String(v));
  else if (t.filter === 'A') v = proper ? String(v) : capFirst(withArticle(String(v)));
  else if (t.filter === 'the') v = proper ? String(v) : 'the ' + String(v);
  else if (t.filter === 'The') v = proper ? String(v) : 'The ' + String(v);
  else if (t.filter === 'cap') v = capFirst(String(v));
  else if (t.filter === 'up') v = String(v).toUpperCase();
  else if (t.filter === 'lc') v = String(v).toLowerCase();
  else if (t.filter === 'ord') v = ordinal(Number(v));
  else if (t.filter === 'words') v = wordsOf(Number(v));
  else if (t.filter === 'num') v = numOf(Number(v));
  return String(v);
}

/** Fill a template. Returns null if any slot cannot be resolved. */
export function renderTemplate(text, slots, stats) {
  let ok = true;
  const out = text.replace(TOKEN_RE, (m, name, arg, filter) => {
    const r = resolveToken({ name, arg, filter }, slots || {}, stats);
    if (r === null) { ok = false; return ''; }
    return r;
  });
  return ok ? capFirst(out) : null;
}

export function lineSlots(line) { return tokensOf(line.text); }

const BY_ID = new Map(TEMPLATES.map((l) => [l.id, l]));
export const CATEGORIES = Array.from(new Set(TEMPLATES.filter((l) => !l.follow).map((l) => l.cat)));
export function getTemplate(id) { return BY_ID.get(id) || null; }

const FALLBACK_CAT = { start: 'battle_start', win: 'victory', lose: 'defeat' };

function fmtRatio(r) { const v = r >= 1 ? r : 1 / r; return String(Math.round(v * 10) / 10).replace(/\.0$/, ''); }

/**
 * createAnnouncer({ rng, stats, templates?, config? })
 *   rng:   function() -> [0,1)  or  object with next()
 *   stats: live lifetime-stats object (see docs/lifetime_stats.md); read at pick time
 * Returns { onEvent(type, payload, ctx), tick(dt), nextLine(), reset(), setStats(s), setSpeed(x), debug() }
 *   ctx (all optional): { speed, arena: id|{id,name}, factions:[nameA,nameB], teamNames:[a,b], playerTeam:0|1, mission:id|null,
 *                         unitName(defId, plural), nameOf(unitId) }
 *   Lines come back from nextLine() as { id, cat, sub, who, text, pri, at, dur, head, chain:{key,i,n}|null }.
 *   dt is REAL seconds. The caller loops: ann.tick(dt); while ((l = ann.nextLine())) show(l);
 */
export function createAnnouncer(opts) {
  const o = opts || {};
  const rand = typeof o.rng === 'function' ? o.rng : o.rng && typeof o.rng.next === 'function' ? () => o.rng.next() : () => 0.5;
  const cfg = Object.assign({}, DEFAULT_CONFIG, o.config || {});
  let stats = o.stats || {};
  const templates = o.templates || TEMPLATES;
  const byId = new Map(templates.map((l) => [l.id, l]));
  const byCat = new Map();
  for (const l of templates) {
    if (l.follow) continue;
    l.tokens = l.tokens || tokensOf(l.text);
    if (!byCat.has(l.cat)) byCat.set(l.cat, []);
    byCat.get(l.cat).push(l);
  }
  for (const l of templates) if (l.follow) l.tokens = l.tokens || tokensOf(l.text);

  const st = {
    now: 0, sim: 0, speed: 1, tokens: 1, lastEmit: -1e9, chainEnd: -1e9, lastWho: null, inBattle: false, lastActivity: 0,
    cands: [], out: [], recent: [], used: Object.create(null), usedAt: Object.create(null), catReady: Object.create(null),
    onceUsed: new Set(), voice: { brutus: 0, plato: 0, cassandra: 0 }, emitted: 0, catLast: Object.create(null), offered: Object.create(null), expired: Object.create(null), noLine: Object.create(null),
    // per-battle
    bs: null,
    // per-session: survives reset(), so "third battle on the same arena" and "three losses in a row" are real facts
    sess: { battles: 0, lastArena: null, sameArena: 0, winStreak: 0, lossStreak: 0 },
    // context snapshot
    arenaId: null, arenaName: null, factions: null, teamNames: null, playerTeam: 0, mission: null, unitNameFn: null, nameOfFn: null,
  };
  const freshBattle = () => ({ firstBlood: false, lastKill: null, killT: [], routT: [[], []], rallyT: [], arrowT: [], ffCount: 0, chickenKills: 0, goatKills: 0, deficit: [1, 1], midDone: false, massAt: -1e9, fbCand: null, t0: 0, pc: 0, ec: 0 });
  st.bs = freshBattle();

  function teamName(i) { return (st.teamNames && st.teamNames[i]) || ['Blue', 'Red'][i] || 'Team'; }
  function defName(id, pl) { return st.unitNameFn ? st.unitNameFn(id, pl) : unitName(id, pl); }
  function setUnit(s, key, defId) {
    if (!defId) return;
    s[key] = defName(defId, false); s[key + '_pl'] = defName(defId, true); s[key + 'Def'] = defId;
  }
  function baseSlots() {
    const s = {};
    if (st.arenaName) s.arena = st.arenaName;
    if (st.mission) s.mission = MISSION_TITLES[st.mission] || st.mission;
    if (st.factions) { if (st.factions[0]) s.faction = st.factions[0]; if (st.factions[1]) s.faction2 = st.factions[1]; }
    s.team = teamName(0); s.team2 = teamName(1);
    return s;
  }
  function readCtx(ctx) {
    if (!ctx) return;
    if (typeof ctx.speed === 'number') st.speed = ctx.speed;
    if (ctx.arena !== undefined) {
      const a = ctx.arena;
      if (a && typeof a === 'object') { st.arenaId = a.id || null; st.arenaName = a.name || ARENA_NAMES[a.id] || null; }
      else if (typeof a === 'string') { st.arenaId = a; st.arenaName = ARENA_NAMES[a] || a; }
    }
    if (ctx.factions) st.factions = ctx.factions;
    if (ctx.teamNames) st.teamNames = ctx.teamNames;
    if (typeof ctx.playerTeam === 'number') st.playerTeam = ctx.playerTeam;
    if (ctx.mission !== undefined) st.mission = ctx.mission || null;
    if (typeof ctx.unitName === 'function') st.unitNameFn = ctx.unitName;
    if (typeof ctx.nameOf === 'function') st.nameOfFn = ctx.nameOf;
  }

  function offer(cat, sub, slots, extra) {
    const pri = (extra && extra.pri) || categoryPriority(cat);
    if (st.speed > cfg.fastSpeed && pri < 4) return null;
    for (const c of st.cands) {
      if (c.cat === cat && c.sub === sub) { c.slots = slots; c.born = st.now; c.expire = st.now + cfg.ttl[pri]; c.arenaId = st.arenaId; c.mission = st.mission; return c; }
    }
    st.offered[cat] = (st.offered[cat] || 0) + 1;
    const cand = { cat, sub: sub || null, slots, pri, born: st.now, readyAt: st.now + ((extra && extra.delay) || 0), expire: st.now + cfg.ttl[pri], arenaId: st.arenaId, mission: st.mission };
    st.cands.push(cand);
    if (st.cands.length > 14) {
      let worst = 0;
      for (let i = 1; i < st.cands.length; i++) if (st.cands[i].pri < st.cands[worst].pri || (st.cands[i].pri === st.cands[worst].pri && st.cands[i].born < st.cands[worst].born)) worst = i;
      st.cands.splice(worst, 1);
    }
    return cand;
  }

  // ---------- eligibility ----------
  function statOK(spec) {
    const specs = Array.isArray(spec) ? spec : [spec];
    for (const s of specs) {
      const v = Number(stats && stats[s.name]) || 0;
      if (s.min !== undefined && v < s.min) return false;
      if (s.max !== undefined && v > s.max) return false;
    }
    return true;
  }
  const inList = (list, v) => (Array.isArray(list) ? list.indexOf(v) >= 0 : list === v);
  /** returns specificity (>=0) or -1 when the condition fails */
  function condScore(cond, cand) {
    if (!cond) return 0;
    let score = 0;
    const s = cand.slots;
    if (cond.sub !== undefined) { if (!inList(cond.sub, cand.sub)) return -1; score++; }
    if (cond.def !== undefined) { if (!inList(cond.def, s.unitDef)) return -1; score++; }
    if (cond.def2 !== undefined) { if (!inList(cond.def2, s.unit2Def)) return -1; score++; }
    if (cond.faction !== undefined) { const f = STAT_TABLE[s.unitDef] && STAT_TABLE[s.unitDef].faction; if (!inList(cond.faction, f)) return -1; score++; }
    if (cond.team !== undefined) {
      if (s.teamIdx === undefined) return -1;
      const mine = s.teamIdx === st.playerTeam ? 'player' : 'enemy';
      if (mine !== cond.team) return -1; score++;
    }
    if (cond.minN !== undefined) { if (!(s.value >= cond.minN)) return -1; score++; }
    if (cond.maxN !== undefined) { if (!(s.value <= cond.maxN)) return -1; score++; }
    if (cond.arena !== undefined) { if (!inList(cond.arena, cand.arenaId)) return -1; score++; }
    if (cond.mission !== undefined) { if (!inList(cond.mission, cand.mission)) return -1; score++; }
    if (cond.flank !== undefined) { if (!inList(cond.flank, s.flank)) return -1; score++; }
    if (cond.cluster !== undefined) { if (!!s.hasCluster !== cond.cluster) return -1; score++; }
    if (cond.ratioMin !== undefined) { if (!(s.ratioVal >= cond.ratioMin)) return -1; score++; }
    if (cond.ratioMax !== undefined) { if (!(s.ratioVal <= cond.ratioMax)) return -1; score++; }
    if (cond.stat !== undefined) { if (!statOK(cond.stat)) return -1; score += 1; }
    if (cond.milestone !== undefined) { const v = Number(stats && stats[cond.milestone.name]) || 0; if (cond.milestone.at.indexOf(v) < 0) return -1; score += 2; }
    return score;
  }
  function slotsResolvable(tokens, slots) {
    for (const t of tokens) {
      const v = t.name === 'lifetime' ? (stats ? stats[t.arg] : undefined) : slots[t.name];
      if (!hasValue(v)) return false;
    }
    return true;
  }
  function chainOf(line) {
    if (!line.chain) return null;
    const out = [];
    for (const id of line.chain) { const f = byId.get(id); if (!f) return null; out.push(f); }
    return out;
  }
  const isRecent = (id) => st.recent.indexOf(id) >= 0;

  function voiceFactor(who) {
    const total = st.voice.brutus + st.voice.plato + st.voice.cassandra;
    const share = (st.voice[who] + 1) / (total + 3);
    const f = Math.pow((1 / 3) / share, 2);
    return f < 0.35 ? 0.35 : f > 3 ? 3 : f;
  }

  function choosePool(cat, cand) {
    const lines = byCat.get(cat);
    if (!lines) return null;
    const pool = [], weights = [];
    let total = 0, freshCount = 0;
    const excl = EXCLUSIVE.has(cat + ':' + cand.sub);
    for (const L of lines) {
      if (excl && !(L.cond && L.cond.sub !== undefined)) continue;       // a duel has no flanks, armies or survivors: only lines written for it may speak
      if (L.who === st.lastWho) continue;
      if (isRecent(L.id)) continue;
      if (L.once && st.onceUsed.has(L.id)) continue;
      if (L.cd && st.now - (st.usedAt[L.id] === undefined ? -1e9 : st.usedAt[L.id]) < L.cd) continue;
      const sc = condScore(L.cond, cand);
      if (sc < 0) continue;
      if (!slotsResolvable(L.tokens, cand.slots)) continue;
      const chain = chainOf(L);
      if (L.chain) {
        if (!chain) continue;
        let bad = false;
        for (const f of chain) { if (isRecent(f.id) || !slotsResolvable(f.tokens, cand.slots)) { bad = true; break; } }
        if (bad) continue;
      }
      let w = (L.weight === undefined ? 1 : L.weight) * (1 + 1.5 * sc) / (1 + 0.6 * (st.used[L.id] || 0));
      const age = st.now - (st.usedAt[L.id] === undefined ? -1e9 : st.usedAt[L.id]);
      if (age < cfg.repeatWindow) w *= 0.04; else freshCount++;
      w *= voiceFactor(L.who);
      pool.push(L); weights.push(w); total += w;
    }
    if (!pool.length) return null;
    if (freshCount === 0 && cand.pri < 5) return null; // silence beats a repeat, except for the big moments
    let r = rand() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function choose(cand) {
    let line = choosePool(cand.cat, cand);
    // a mission-specific line can be blocked by voice alternation: fall back to the generic category for the same moment
    if (!line && cand.cat.indexOf('campaign_') === 0) line = choosePool(FALLBACK_CAT[cand.sub] || 'battle_start', cand);
    return line;
  }

  // cooldown key: campaign start/win/lose are distinct moments, everything else cools down per category
  const ckey = (c) => (c.cat.indexOf('campaign_') === 0 ? c.cat + ':' + c.sub : c.cat);

  function emit(cand, line) {
    const chain = chainOf(line);
    const seq = chain ? [line].concat(chain) : [line];
    const n = seq.length;
    const t0 = st.now;
    for (let i = 0; i < n; i++) {
      const L = seq[i];
      const text = renderTemplate(L.text, cand.slots, stats) || L.text;
      const words = wordCount(text);
      st.out.push({ id: L.id, cat: L.cat, sub: cand.sub, who: L.who, text, pri: cand.pri, at: t0 + i * cfg.beat, dur: Math.max(2, Math.min(7, 1.4 + words * 0.32)), head: i === 0, chain: n > 1 ? { key: line.id, i, n } : null });
      st.recent.push(L.id);
      if (st.recent.length > cfg.recencyN) st.recent.shift();
      st.used[L.id] = (st.used[L.id] || 0) + 1;
      st.usedAt[L.id] = t0;
      st.voice[L.who]++;
      if (L.once) st.onceUsed.add(L.id);
    }
    const last = t0 + (n - 1) * cfg.beat;
    st.lastEmit = last; st.chainEnd = last; st.lastWho = seq[n - 1].who; st.lastActivity = last;
    st.catReady[ckey(cand)] = t0 + (cand.cat === 'idle_filler' ? cfg.fillerCooldown : cfg.catCooldown);
    st.catLast[ckey(cand)] = t0;
    st.tokens = Math.max(cfg.tokenFloor, st.tokens - 1);
    st.emitted++;
  }

  function pick() {
    if (!st.cands.length || st.chainEnd > st.now) return;
    const eff = (c) => c.pri + Math.min(cfg.aging, ((st.now - c.born) / cfg.ttl[c.pri]) * cfg.aging) + Math.min(cfg.hunger, ((st.now - (st.catLast[ckey(c)] === undefined ? -120 : st.catLast[ckey(c)])) / 120) * cfg.hunger);
    st.cands.sort((a, b2) => (eff(b2) - eff(a)) || (b2.born - a.born));
    for (let i = 0; i < st.cands.length; i++) {
      const cand = st.cands[i];
      if (st.now < cand.readyAt) continue;
      if (st.speed > cfg.fastSpeed && cand.pri < 4) { st.cands.splice(i, 1); i--; continue; }
      if (st.now - st.lastEmit < (cand.pri >= 5 ? cfg.minGapP5 : cfg.minGap)) continue;
      if (st.now < (st.catReady[ckey(cand)] || 0)) continue;
      const silent = st.now - (st.catLast[ckey(cand)] === undefined ? -1e9 : st.catLast[ckey(cand)]);
      let needTok = cand.pri >= 3 && silent >= cfg.hungryAfter ? Math.min(cfg.need[cand.pri], cfg.hungryNeed) : cfg.need[cand.pri];
      if (st.speed > cfg.fastSpeed && cand.pri >= 5) needTok = Math.max(needTok, cfg.fastP5Need);
      if (st.tokens < needTok) continue;
      st.cands.splice(i, 1);
      const line = choose(cand);
      if (line) { emit(cand, line); return; }
      st.noLine[cand.cat] = (st.noLine[cand.cat] || 0) + 1;
      i--;
    }
  }

  // ---------- event mapping ----------
  const KILL_WINDOW = 2, MASS_N = 7, ROUT_WINDOW = 3, ROUT_N = 5, VOLLEY_WINDOW = 1.5, VOLLEY_N = 14;
  function prune(arr, now, win) { while (arr.length && now - arr[0] > win) arr.shift(); }

  /** A contextual sub-moment is used most of the time, not always, so a rematch loop does not turn into a loop of the same four jokes. */
  const maybe = (sub, p) => (rand() < (p === undefined ? 0.7 : p) ? sub : null);

  function battleEnd(pl) {
    const bs = st.bs, sess = st.sess;
    st.inBattle = false;
    for (let i = st.cands.length - 1; i >= 0; i--) if (STALE_AT_END.has(st.cands[i].cat)) st.cands.splice(i, 1);
    const winner = pl.winner;
    const s = baseSlots();
    let n = 0, topDef = null, topN = 0, chickens = 0, goats = 0;
    const pd = pl.perDef && (pl.perDef[winner] || pl.perDef[String(winner)]);
    if (pd) for (const k in pd) { n += pd[k]; if (pd[k] > topN) { topN = pd[k]; topDef = k; } if (k === 'sacred_chicken') chickens = pd[k]; if (k === 'battle_goat') goats = pd[k]; }
    if (pd) { s.n = n; s.value = n; setUnit(s, 'unit', topDef); }
    const secs = typeof pl.t === 'number' ? pl.t : 0;
    if (secs > 0) { s.secs = Math.max(1, Math.round(secs)); s.mins = Math.max(1, Math.round(secs / 60)); }
    const S = pl.stats, ps = S && S[st.playerTeam], es = S && S[1 - st.playerTeam];
    const duel = bs.pc === 1 && bs.ec === 1;
    const mission = st.mission;
    if (winner === st.playerTeam) { sess.winStreak++; sess.lossStreak = 0; }
    else if (winner === 0 || winner === 1) { sess.lossStreak++; sess.winStreak = 0; }
    if (winner === -1 || winner === undefined || winner === null) {
      if (pl.reason === 'intervention') offer('zeus', 'draw', s); else offer('timeout', 'draw', s);
    } else if (pl.reason === 'time') {
      s.team = teamName(winner); s.teamIdx = winner;
      offer('timeout', 'time', s);
    } else if (winner === st.playerTeam) {
      s.team = teamName(winner); s.teamIdx = winner;
      let sub = null;
      if (duel) sub = 'duel';
      else if (n === 1) sub = 'last_man';
      else if (ps && ps.startCount >= 6 && ps.alive === ps.startCount) sub = maybe('flawless', 0.8);
      else if (ps && es && ps.startCost > 0 && ps.startCost * 2 <= es.startCost) sub = maybe('tiny', 0.8);
      if (!sub && goats > 0) sub = maybe('goat', 0.8);
      if (!sub && pl.reason === 'rout') sub = maybe('rout');
      if (!sub && secs > 0 && secs < 25) sub = maybe('quick');
      if (!sub && secs >= 240) sub = maybe('long');
      if (mission) offer('campaign_' + mission, 'win', s); else offer('victory', sub, s);
    } else {
      s.team = teamName(st.playerTeam); s.teamIdx = st.playerTeam;
      let sub = null;
      if (duel) sub = 'duel';
      else if (chickens > 0) sub = 'chicken';
      else if (sess.lossStreak >= 3) { s.nth = sess.lossStreak; sub = maybe('third_loss', 0.85); }
      else if (es && es.startCount >= 6 && es.alive / es.startCount >= 0.9) sub = maybe('crush');
      else if (es && es.startCount >= 8 && n > 0 && n <= 2) sub = maybe('close', 0.85);
      if (mission) offer('campaign_' + mission, 'lose', s); else offer('defeat', sub, s);
    }
    st.bs = freshBattle();
  }

  function onKill(pl) {
    const bs = st.bs;
    bs.lastKill = { srcDef: pl.srcDef, dstDef: pl.dstDef, t: st.now };
    // first_blood slot upgrade
    if (bs.fbCand && st.now - bs.fbCand.born < 1) { const s = bs.fbCand.slots; if (!s.unit2) { setUnit(s, 'unit', pl.srcDef); setUnit(s, 'unit2', pl.dstDef); } }
    bs.killT.push(st.sim); prune(bs.killT, st.sim, KILL_WINDOW);
    if (bs.killT.length >= MASS_N && st.sim - bs.massAt > 4) {
      bs.massAt = st.sim;
      const s = baseSlots(); s.n = bs.killT.length; s.value = s.n;
      offer('mass_death', null, s);
      bs.killT.length = 0;
    }
    const cause = pl.cause;
    const s = baseSlots();
    if (pl.friendly) { setUnit(s, 'unit', pl.srcDef); setUnit(s, 'unit2', pl.dstDef); offer('friendly_fire', 'kill', s); return; }
    if (cause === 'kick') { setUnit(s, 'unit', pl.srcDef); setUnit(s, 'unit2', pl.dstDef); offer('kick', 'kill', s); return; }
    if (cause === 'misfire') { offer('misfire', null, s); return; }
    if (cause === 'bribe') { offer('senator', 'bribe_kill', s); return; }
    if (cause === 'lava' || cause === 'drown' || cause === 'spikes' || cause === 'geyser' || cause === 'fall') { setUnit(s, 'unit', pl.dstDef); offer('hazard', cause, s); return; }
    if (pl.revived && pl.dstDef === 'immortal') { offer('immortal', 'second_death', s); return; }
    if (cause === 'trample' && pl.srcDef === 'war_elephant') { offer('elephant', 'trample', s); return; }
    if (pl.srcDef === 'sacred_chicken') {
      bs.chickenKills++;
      const big = STAT_TABLE[pl.dstDef] && STAT_TABLE[pl.dstDef].cost >= 150;
      if (big || bs.chickenKills === 5 || bs.chickenKills === 10) { setUnit(s, 'unit', pl.dstDef); s.n = bs.chickenKills; offer('chicken', 'kill', s); }
      return;
    }
    if (pl.srcDef === 'battle_goat') {
      bs.goatKills++;
      if (bs.goatKills === 3 || bs.goatKills === 8) { setUnit(s, 'unit', pl.dstDef); offer('goat', 'kill', s); }
    }
  }

  const api = {
    onEvent(type, pl, ctx) {
      readCtx(ctx);
      const bs = st.bs;
      const duel = bs.pc === 1 && bs.ec === 1, tiny = bs.pc > 0 && bs.ec > 0 && Math.max(bs.pc, bs.ec) <= 4;     // a duel has no flanks, ratios or armies to talk about
      switch (type) {
        case 'battle_start': {
          st.bs = freshBattle(); st.onceUsed.clear(); st.inBattle = true; st.lastActivity = st.now; st.lastWho = null;
          st.bs.t0 = st.sim;
          const sess = st.sess, s = baseSlots();
          sess.battles++;
          const again = !st.mission && !!st.arenaId && st.arenaId === sess.lastArena;
          sess.sameArena = again ? sess.sameArena + 1 : 0; sess.lastArena = st.mission ? null : st.arenaId;
          if (st.mission) { offer('campaign_' + st.mission, 'start', s); break; }
          const T = pl && Array.isArray(pl.teams) ? pl.teams : null;
          const pc = (T && T[st.playerTeam] && T[st.playerTeam].count) || 0, ec = (T && T[1 - st.playerTeam] && T[1 - st.playerTeam].count) || 0;
          st.bs.pc = pc; st.bs.ec = ec;
          let sub = null;
          if (pc > 0 && ec > 0) { s.n = pc + ec; s.value = s.n; }
          if (pc === 1 && ec === 1) sub = 'duel';
          else if (sess.battles === 10) { s.nth = 10; sub = 'tenth'; }
          else if (pc > 0 && ec > 0 && ec / pc >= 2.5) { s.ratio = fmtRatio(ec / pc); sub = maybe('outnumbered', 0.6); }
          else if (pc > 0 && ec > 0 && pc / ec >= 2.5) { s.ratio = fmtRatio(pc / ec); sub = maybe('outnumbering', 0.6); }
          if (!sub && sess.lossStreak >= 2) { s.nth = sess.lossStreak; sub = maybe('losing', 0.6); }
          if (!sub && sess.winStreak >= 3) { s.nth = sess.winStreak; sub = maybe('winning', 0.6); }
          if (!sub && sess.sameArena >= 2) { s.nth = sess.sameArena + 1; sub = maybe('loyal', 0.6); }
          if (!sub && sess.sameArena === 1) sub = maybe('rematch', 0.5);
          if (!sub && st.factions && st.factions[0] && st.factions[0] === st.factions[1]) sub = maybe('mirror', 0.7);
          offer('battle_start', sub, s);
          break;
        }
        case 'battle_end': battleEnd(pl); break;
        case 'first_blood': {
          if (bs.firstBlood) break; bs.firstBlood = true;
          if (st.speed > cfg.fastSpeed && rand() < 0.5) break; // when the game is fast-forwarded first blood is only announced half the time
          const s = baseSlots();
          if (bs.lastKill && st.now - bs.lastKill.t < 1) { setUnit(s, 'unit', bs.lastKill.srcDef); setUnit(s, 'unit2', bs.lastKill.dstDef); }
          const sec = st.sim - bs.t0;
          s.secs = Math.max(1, Math.round(sec));
          bs.fbCand = offer('first_blood', sec <= 6 ? 'early' : sec >= 25 ? 'late' : null, s, { delay: 0.25 });
          break;
        }
        case 'unit_kill': onKill(pl); break;
        case 'kill_streak': {
          const s = baseSlots(); s.streak = pl.count; s.value = pl.count; setUnit(s, 'unit', pl.def);
          s.killer = (st.nameOfFn && st.nameOfFn(pl.id)) || (isProper(pl.def) ? defName(pl.def, false) : 'the ' + defName(pl.def, false));
          offer('kill_streak', null, s, { pri: pl.count >= 10 ? 5 : 4 });
          break;
        }
        case 'hero_down': { const s = baseSlots(); setUnit(s, 'unit', pl.def); s.team = teamName(pl.team); s.teamIdx = pl.team; offer('hero_down', null, s); break; }
        case 'friendly_fire': { bs.ffCount++; if (bs.ffCount % 6 === 0) { const s = baseSlots(); s.n = bs.ffCount; s.value = s.n; offer('friendly_fire', 'generic', s, { pri: 3 }); } break; }
        case 'unit_rout': {
          if (tiny) break;
          const arr = bs.routT[pl.team ? 1 : 0]; arr.push(st.sim); prune(arr, st.sim, ROUT_WINDOW);
          if (arr.length >= ROUT_N) { const s = baseSlots(); s.n = arr.length; s.value = s.n; s.team = teamName(pl.team); s.teamIdx = pl.team; arr.length = 0; offer('rout', null, s); }
          break;
        }
        case 'army_low': { if (tiny) break; const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team; s.pct = Math.round(pl.frac * 100); offer('army_low', null, s); break; }
        case 'lead_change': {
          if (duel) break;
          const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team;
          s.ratio = fmtRatio(pl.ratio); s.ratioVal = pl.ratio >= 1 ? pl.ratio : 1 / pl.ratio;
          if (pl.flank) s.flank = pl.flank;
          if (bs.deficit[pl.team ? 1 : 0] >= 2) { bs.deficit[pl.team ? 1 : 0] = 1; offer('comeback', null, s); } else offer('lead_change', null, s);
          break;
        }
        case 'big_swing': {
          if (tiny) break;
          const r = pl.ratio > 0 ? pl.ratio : 1;        // the sim sends team 0's power over team 1's (not the gaining team's), so a deficit is read from that
          const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team; s.ratio = fmtRatio(r); s.ratioVal = r >= 1 ? r : 1 / r;
          if (pl.flank) s.flank = pl.flank;
          s.hasCluster = !!pl.cluster;
          if (r < 1) bs.deficit[0] = Math.max(bs.deficit[0], 1 / r); else bs.deficit[1] = Math.max(bs.deficit[1], r);
          offer('big_swing', pl.team === st.playerTeam ? 'gain' : 'loss', s);
          break;
        }
        case 'stalemate_warning': { const s = baseSlots(); s.n = Math.round(pl.t || 12); offer('stalemate', null, s); break; }
        case 'intervention': {
          const s = baseSlots();
          if (pl.kind === 'zeus') offer('zeus', 'bolt', s); else if (pl.kind === 'goat') offer('goat', 'intervention', s); else if (pl.kind === 'ragequit') offer('zeus', 'ragequit', s);
          break;
        }
        case 'objective_update': break;
        case 'wave_spawn': { const s = baseSlots(); s.n = pl.n; s.value = pl.n; offer('wave', null, s); break; }
        case 'god_power': { const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team; offer('god_power', pl.kind, s); break; }
        case 'chicken_tantrum': offer('chicken', 'tantrum', baseSlots()); break;
        case 'philosopher_monologue': offer('philosopher', null, baseSlots()); break;
        case 'status_apply': {
          if (pl.status === 'sleep') { offer('senator', 'sleep', baseSlots()); }
          else if (pl.status === 'fire_panic' || pl.status === 'panic' || pl.status === 'panicked') offer('elephant', 'panic', baseSlots());
          break;
        }
        case 'unit_convert': offer('senator', 'bribe', baseSlots()); break;
        case 'unit_rally': {
          bs.rallyT.push(st.sim); prune(bs.rallyT, st.sim, 4);
          if (bs.rallyT.length >= 4) { bs.rallyT.length = 0; offer('rout', 'rally', baseSlots()); }
          break;
        }
        case 'crowd_roar': offer('ability', 'crowd', baseSlots()); break;
        case 'trojan_reveal': offer('trojan', null, baseSlots()); break;
        case 'stone_gaze': { const s = baseSlots(); s.n = pl.count; s.value = pl.count; offer('medusa', null, s); break; }
        case 'throne_sit': offer('throne', pl && pl.sitting === 0 ? 'stand' : 'sit', baseSlots()); break;      // the sim sends sitting:1 when he sits and sitting:0 when he leaps up
        case 'unit_revive': offer('immortal', 'revive', baseSlots()); break;
        case 'trample': { if (pl.count >= 3) { const s = baseSlots(); s.n = pl.count; s.value = pl.count; offer('elephant', 'trample', s); } break; }
        case 'charge_hit': if (pl.mul >= 0.9) offer('charge', null, baseSlots()); break;
        case 'unit_brace': offer('brace', null, baseSlots()); break;
        case 'projectile_launch': {
          if (pl.kind === 'arrow' || pl.kind === 'javelin') {
            bs.arrowT.push(st.sim); prune(bs.arrowT, st.sim, VOLLEY_WINDOW);
            if (bs.arrowT.length >= VOLLEY_N) { const s = baseSlots(); s.n = bs.arrowT.length; s.value = s.n; bs.arrowT.length = 0; offer('volley', null, s); }
          }
          break;
        }
        case 'explosion': if (pl.kind === 'boulder') offer('boulder', null, baseSlots()); break;
        case 'catapult_misfire': offer('misfire', null, baseSlots()); break;
        case 'cyclops_misaim': offer('misaim', null, baseSlots()); break;
        case 'prop_destroyed': { const nm = PROP_NAMES[pl.type]; if (nm) { const s = baseSlots(); s.prop = nm; offer('prop_destroyed', null, s); } break; }
        case 'ability_cast': {
          if (pl.ability === 'kick') offer('kick', 'cast', baseSlots());
          else if (ABILITY_SUB[pl.ability]) offer('ability', ABILITY_SUB[pl.ability], baseSlots());
          break;
        }
        default: break;
      }
      pick();
    },
    tick(dt) {
      if (dt > 0) {
        st.now += dt; st.sim += dt * st.speed;
        st.tokens = Math.min(cfg.tokenCap, st.tokens + (dt / cfg.avgGap) * (st.speed > cfg.fastSpeed ? cfg.fastRefill : 1));
      }
      for (let i = st.cands.length - 1; i >= 0; i--) if (st.now > st.cands[i].expire) { const ec = st.cands[i].cat; st.expired[ec] = (st.expired[ec] || 0) + 1; st.cands.splice(i, 1); }
      if (st.inBattle && st.speed <= cfg.fastSpeed && st.now - st.lastActivity >= cfg.fillerQuiet && st.chainEnd <= st.now && !st.cands.length && st.now >= (st.catReady.idle_filler || 0)) {
        offer('idle_filler', null, baseSlots());
      }
      pick();
      return st.out.length && st.out[0].at <= st.now ? 1 : 0;
    },
    nextLine() {
      if (!st.out.length || st.out[0].at > st.now) return null;
      return st.out.shift();
    },
    reset() { st.bs = freshBattle(); st.onceUsed.clear(); st.cands.length = 0; st.inBattle = false; },
    setStats(s) { stats = s || {}; },
    setSpeed(x) { st.speed = x; },
    debug() { return { offered: st.offered, expired: st.expired, noLine: st.noLine, now: st.now, tokens: st.tokens, lastWho: st.lastWho, recent: st.recent.slice(), pending: st.cands.length, queued: st.out.length, emitted: st.emitted, voice: Object.assign({}, st.voice), session: Object.assign({}, st.sess) }; },
  };
  return api;
}
