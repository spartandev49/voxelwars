// Announcer: slotted line templates for the three booth voices + the pure selector that decides what gets said and when.
// Owner: HUMOR. Pure module (no DOM, no Math.random: the caller passes an rng). See docs/lifetime_stats.md and docs/requests/humor.md.
//
// LINE SHAPE   { id, cat, who:'brutus'|'plato'|'cassandra', text, cond?, weight?, once?, cd?, chain?:[lineId...], follow?:true }
//              once: at most once per battle.  cd: minimum seconds between uses (used by persistent callbacks).  follow: chain beat, never picked alone.
// SLOTS        {unit} {unit2} {killer} {team} {team2} {faction} {faction2} {arena} {mission} {n} {streak} {ratio} {flank} {pct} {prop}
//              {lifetime:<stat>} reads the live lifetime-stats object passed to createAnnouncer.
//              Also {secs} {mins} (durations), {nth} (session counters, use {nth|ord}), {theirs} (enemy survivors in a close defeat).
//              Filters: {unit|pl} plural  {unit|a} indefinite article ("an Immortal", "Hannibal")  {unit|the} "the Hoplite" / "Hannibal"  {unit|up} UPPERCASE  {n|ord} third  {n|words} three  {n|num} 1,234
// COND KEYS    sub, def, def2, faction, team ('player'|'enemy'), minN, maxN, arena, mission, flank, cluster (big_swing payload has a cluster), ratioMin, ratioMax,
//              stat {name,min?,max?} (or an array of these), milestone {name, at:[...]}
// A line is eligible only when every slot in its text can be resolved, so a line that names {unit2} never runs without one.

import { STAT_TABLE } from '../stats.js';
import { unitName, isProper } from './units_text.js';

const mk = (who) => (cat, key, text, o) => Object.assign({ id: cat + '_' + key, cat, who, text }, o);
const b = mk('brutus');
const p = mk('plato');
const c = mk('cassandra');

export const TEMPLATES = [
  // ================= battle_start =================
  b('battle_start', 'welcome', 'WELCOME to {arena}! Today\'s carnage is brought to you by Pompeii Pizza, now with 20% more ash!'),
  b('battle_start', 'terms', 'The Terms of Conquest are LAMINATED and posted. Clause seven: nobody stabs the grape seller.'),
  b('battle_start', 'matchup', 'LIVE from {arena}: {faction} versus {faction2}! Place your bets with the man selling grapes!'),
  p('battle_start', 'define', 'Before we begin: what, precisely, is a battle?', { chain: ['battle_start_define_b', 'battle_start_define_c'] }),
  b('battle_start', 'define_b', 'FIGHTING! Next question!', { follow: true }),
  c('battle_start', 'define_c', 'It ends badly. That is the full definition.', { follow: true }),
  c('battle_start', 'ending', 'I have seen the ending. Nobody will enjoy it. Please begin.'),
  c('battle_start', 'grapes', 'The man selling grapes will survive. Everyone else is a rumour.'),
  c('battle_start', 'ledger', 'You have killed {lifetime:friendlyKills} of your own so far. I am not betting on improvement.', { once: true, cd: 480, cond: { stat: { name: 'friendlyKills', min: 5 } } }),

  p('battle_start', 'field', 'Two armies walk into a field. Does anyone remember who suggested the field?'),
  c('battle_start', 'surprise', 'Today will go as it goes. Some of you will be surprised. I will not.'),
  b('battle_start', 'mission', 'Today\'s event is {mission}! A very serious title for a very silly afternoon!'),
  p('battle_start', 'mission_p', '{mission}. Is a name chosen before the battle, or after the survivors have had their say?'),
  // ================= first_blood =================
  b('first_blood', 'opinion', 'First blood to the {unit}! The {unit2} was just BEGINNING to have an opinion!'),
  c('first_blood', 'known', 'The {unit2} fell first. I said it would be a {unit2}. I said it at breakfast.'),
  p('first_blood', 'inevitable', 'The first death. Statistically unavoidable. Spiritually inconvenient.'),
  c('first_blood', 'invite', 'First blood. Nobody asked who sent the invitations.'),

  p('first_blood', 'cook', 'Strictly, the first blood was spilt at breakfast, by the cook. This is merely the first from a soldier.'),
  c('first_blood', 'survive', 'First blood goes to the {unit}. He will not survive it. Most do not.'),
  p('first_blood', 'spilt', 'Someone had to go first. The rest are now deciding how they feel about it.'),
  b('first_blood', 'off', 'And we are OFF! A {unit} draws first blood from a {unit2}, and the crowd is, frankly, relieved!'),
  c('first_blood', 'sooner', 'First blood, sooner than expected. Everything is sooner than expected.'),
  // ================= kill_streak =================
  b('kill_streak', 'fire', '{streak} kills! He is ON FIRE! Not literally! The fire marshal has asked me to clarify!'),
  b('kill_streak', 'review', '{streak}!!! This is no longer a battle, this is a PERFORMANCE REVIEW!', { cond: { minN: 8 } }),
  b('kill_streak', 'name', 'That is {streak} for {killer}! Remember the NAME! (I will not.)'),
  p('kill_streak', 'pattern', '{killer}: {streak} kills. At what point does a pattern become a personality?'),
  p('kill_streak', 'brave', '{streak} kills. Is the {unit} brave, or merely uninterrupted?'),
  c('kill_streak', 'forgotten', 'The {unit} reaches {streak} and is forgotten by supper. As foretold.'),

  // ================= hero_down =================
  b('hero_down', 'parade', 'The {unit} is DOWN! Cancel the parade! Not the sponsors! Never the sponsors!', { chain: ['hero_down_parade_c'] }),
  c('hero_down', 'parade_c', 'The parade was cancelled in the second prophecy. Nobody read the memo.', { follow: true }),
  b('hero_down', 'statue', 'No! Not the {unit}! The sculptor had already started on his NOSE!'),
  p('hero_down', 'army', 'The commander falls. The army becomes a crowd with equipment.'),
  c('hero_down', 'flank', 'Without the {unit}, they fold. Left flank first. As foretold.'),

  // ================= friendly_fire =================
  b('friendly_fire', 'clause', 'FRIENDLY fire! Terms of Conquest, clause nine: please stab only the other side!'),
  b('friendly_fire', 'same', 'A {unit} just killed a {unit2}! SAME team! Unless I missed a memo!', { chain: ['friendly_fire_same_p', 'friendly_fire_same_c'] }),
  p('friendly_fire', 'same_p', 'In his defence, the target stood in the way.', { follow: true }),
  c('friendly_fire', 'same_c', 'It will happen again. Nobody listens.', { follow: true }),
  p('friendly_fire', 'question', 'Friendly fire. A misnomer, surely: is anything fired in friendship?'),
  c('friendly_fire', 'ledger', 'That is {lifetime:friendlyKills} of your own, lifetime. I said it was a pattern.', { cd: 480, cond: { stat: { name: 'friendlyKills', min: 10 } } }),

  // ================= rout =================
  b('rout', 'running', 'They are RUNNING! {n} of them! Nobody told them the exit was the other way!'),
  p('rout', 'distance', '{n} soldiers have discovered distance. Is retreat anything but courage with a map?'),
  p('rout', 'opinion', 'Flight is the soldier\'s most honest opinion.'),
  c('rout', 'said', 'They run. I said they would run. They said they were repositioning.'),

  // ================= charge =================
  p('charge', 'physics', 'A charge is physics with a grudge. The horse does the arithmetic.'),
  c('charge', 'spears', 'The charge ends on the spears. It is a short prophecy.'),

  c('charge', 'left', 'It comes from the left. Everything comes from the left. I said left.'),
  // ================= brace =================
  b('brace', 'fence', 'The spear wall says NO! The horse says: why?'),
  p('brace', 'spear', 'Spear: ten feet of persuasion. The horse is reconsidering.'),
  c('brace', 'told', 'Cavalry met spears. I told them. They bought horses anyway.'),

  b('brace', 'hedgehog', 'A hedgehog of spears! The horses are discovering what a HEDGE is!'),
  // ================= volley =================
  b('volley', 'shade', 'ARROWS! {n} of them! The sky goes dark and the shade company is thrilled!'),
  b('volley', 'weather', 'A rain of arrows! I LOVE weather that fights back!'),
  p('volley', 'sky', 'Arrows: an expensive way to learn the sky has opinions.'),
  c('volley', 'there', 'The volley will land on whoever is standing there. I said do not stand there.'),
  p('volley', 'dienekes', 'Told that arrows would hide the sun, Dienekes replied: good, shade. A cheerful man.', { cond: { arena: 'thermopylae' } }),

  // ================= boulder =================
  b('boulder', 'rated', 'BOULDER! Rated E for everyone nearby!'),
  p('boulder', 'blame', 'A boulder falls. Who is responsible: the rock, the engineer, or the man who stood there?'),
  p('boulder', 'crater', 'The crater is, strictly, a new landscape feature. Please do not mention the people in it.'),
  c('boulder', 'under', 'The boulder landed where the soldiers were. It always does.'),

  // ================= misfire =================
  b('misfire', 'union', 'The catapult has launched a WORKER! His union will have words!'),
  b('misfire', 'thumbs', 'A crewman is AIRBORNE! The rest of the crew give a very shaky thumbs up!'),
  p('misfire', 'flight', 'He wished to fly. A modest ambition, poorly supervised.'),
  c('misfire', 'four', 'Four percent. I said four percent. Nobody asked who.'),

  // ================= misaim =================
  b('misaim', 'horizon', 'The Cyclops has thrown a boulder at the HORIZON! Lovely view!'),
  p('misaim', 'depth', 'One eye. No depth. Is he aiming, or merely gesturing?'),
  c('misaim', 'nine', 'He missed by nine units. He will miss by nine more.'),

  // ================= chicken =================
  b('chicken', 'enough', 'The CHICKEN has had enough! Triple damage! Maximum squawk!', { cond: { sub: 'tantrum' } }),
  p('chicken', 'rage', 'Hurt a hen and discover the oldest weapon: the grudge.', { cond: { sub: 'tantrum' } }),
  c('chicken', 'act', 'A chicken will kill the {unit}. I said this in the first act.', { cond: { sub: 'kill' } }),
  b('chicken', 'kill', 'The CHICKEN just killed a {unit}! Somewhere a farmer is saying: told you!', { cond: { sub: 'kill' } }),
  c('chicken', 'ledger', 'Chicken kills, lifetime: {lifetime:chickenKills}. They keep a ledger too.', { cd: 480, cond: { stat: { name: 'chickenKills', min: 25 } } }),
  p('chicken', 'general', '{lifetime:chickenKills} kills. At what number does a chicken become a general?', { cd: 480, cond: { stat: { name: 'chickenKills', min: 50 } } }),

  b('chicken', 'plan', 'The CHICKEN has a plan! Nobody knows what it is! Neither does the chicken!', { cond: { sub: 'tantrum' } }),
  // ================= goat =================
  b('goat', 'sent', 'ZEUS has sent a goat! The goat did not ask for our opinions!', { cond: { sub: 'intervention' } }),
  p('goat', 'hero', 'The goat arrives. Always the same goat, and always the actual protagonist.', { cond: { sub: 'intervention' } }),
  c('goat', 'decide', 'The goat will decide this. Nobody listens. The goat listens.', { cond: { sub: 'intervention' } }),
  b('goat', 'charge', 'GOAT CHARGE! He does it for glory, and for the hay!', { cond: { sub: 'kill' } }),
  p('goat', 'rank', 'The goat has {lifetime:goatKills} kills and no rank. Which of us is the fool?', { cd: 480, cond: { stat: { name: 'goatKills', min: 10 } } }),
  c('goat', 'kill', 'It was always going to be the goat. The goat knew.', { cond: { sub: 'kill' } }),

  b('goat', 'beard', 'The GOAT! Bless that beard! Bless those horns! Bless that tiny helmet!', { cond: { sub: 'intervention' } }),
  // ================= philosopher =================
  p('philosopher', 'tactic', 'I do not follow him. Neither does the enemy. This is the tactic.'),
  c('philosopher', 'listen', 'They stopped to listen. Everyone dies listening.'),

  b('philosopher', 'monologue', 'The Philosopher is monologuing! The enemy has gone quiet! This is the SCARIEST part!'),
  p('philosopher', 'lecture', 'I recognise the technique. It is called a lecture. It is also a weapon.'),
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
  b('elephant', 'trample', 'The ELEPHANT is running over {n}! Roadkill, but ancient!', { cond: { sub: 'trample' } }),
  b('elephant', 'stampede', 'The elephant is stampeding through his OWN lines! That is not a tactic, that is a lawsuit!', { cond: { sub: 'panic' } }),
  p('elephant', 'fire', 'Eleven tons of animal, undone by a torch. Perspective is a gift.', { cond: { sub: 'panic' } }),
  c('elephant', 'said', 'The elephant will panic and flatten its friends. I said fire. They brought fire.', { cond: { sub: 'panic' } }),
  c('elephant', 'weight', 'The elephant stepped on {n} and did not notice. That is the whole problem with elephants.', { cond: { sub: 'trample' } }),

  // ================= kick =================
  b('kick', 'cus', 'SPARTA-cus has punted a {unit2} into the next district!'),
  p('kick', 'sentence', 'He says almost nothing, and kicks the rest. Is that not economy?'),
  c('kick', 'eight', 'Eight units. He always kicks eight. I counted.'),
  b('kick', 'lifetime', 'Your Spartans have kicked {lifetime:kicks} soldiers! That is a lot of CALF work!', { cd: 480, cond: { stat: { name: 'kicks', min: 15 } } }),

  // ================= immortal =================
  b('immortal', 'rise', 'He is UP again! They are called Immortals! Terms and conditions apply!', { cond: { sub: 'revive' } }),
  p('immortal', 'ten', 'Ten thousand. Give or take ten thousand.', { cond: { sub: 'revive' } }),
  c('immortal', 'once', 'The Immortal rose. He will not rise twice. The word was once.', { cond: { sub: 'revive' } }),
  b('immortal', 'again', 'And he is dead AGAIN! The asterisk wins!', { cond: { sub: 'second_death' } }),
  p('immortal', 'twice', 'Twice dead. Immortality, it seems, is a limited-time offer.', { cond: { sub: 'second_death' } }),

  // ================= throne =================
  b('throne', 'sit', 'XERXES sits down in the middle of a battle! Somebody bring snacks!'),
  p('throne', 'view', 'The King of Kings requires a view. Is leadership not mostly seating?'),
  c('throne', 'retreat', 'He will sit. Someone will touch him. He will shout retreat.'),

  // ================= hazard =================
  b('hazard', 'lava', 'He walked into LAVA! Voluntarily? Unclear! The lava is not saying!', { cond: { sub: 'lava' } }),
  b('hazard', 'spikes', 'SPIKES! They were clearly marked! He was clearly not reading!', { cond: { sub: 'spikes' } }),
  b('hazard', 'geyser', 'GEYSER! He went up! He will come down! Physics always files its paperwork!', { cond: { sub: 'geyser' } }),
  p('hazard', 'drown', 'Drowned, and not even in the sea. Is there a cheaper way to lose?', { cond: { sub: 'drown' } }),
  c('hazard', 'marked', 'The hazard was marked. I marked it. Nobody reads maps.'),

  b('hazard', 'ground', 'The ground is trying to kill people! The ground is WINNING!'),
  // ================= lead_change =================
  p('lead_change', 'momentum', 'The balance tips. We call it momentum. The soldiers call it oh no.'),
  c('lead_change', 'keep', '{team} leads now. They will not keep it. They never do.'),
  c('lead_change', 'ratio', '{ratio} to one. It was bound to swing. I said the {flank} flank.'),

  c('lead_change', 'again', 'The lead will change again. I will not say when. I will say I said.'),
  // ================= comeback =================
  b('comeback', 'dead', 'A COMEBACK! They were finished! They were gone! Apparently they were just resting!'),
  p('comeback', 'hope', 'From the brink. Perhaps hope is only arithmetic done late.'),
  c('comeback', 'quiet', 'I said {team} would recover. Quietly. Near the wall. Nobody listened.'),
  b('comeback', 'clause', '{team} strikes back! Terms of Conquest, clause twelve: comebacks may be DRAMATIC!'),

  // ================= big_swing =================
  c('big_swing', 'fold', 'I said the {flank} flank would fold. Twice.'),
  c('big_swing', 'cluster', 'They are clustered. I said do not cluster. Now it is {ratio} to one.', { cond: { cluster: true } }),
  c('big_swing', 'foretold', '{team} took the {flank}. As foretold.'),
  b('big_swing', 'flank', 'The {flank} flank is DONE! Somebody tell them it is rude to turn up like that!'),
  p('big_swing', 'arith', 'The ratio is {ratio} to one. Arithmetic, I find, is never on anybody\'s side.'),

  c('big_swing', 'wall', 'It swung {flank}. {ratio} to one. I wrote it down. On a wall.'),
  // ================= army_low =================
  p('army_low', 'gathering', 'At {pct} percent, an army is only a gathering with opinions about leaving.'),
  c('army_low', 'end', '{pct} percent. The end is near. Nobody listens. It is near.'),

  b('army_low', 'hats', 'Only {pct} percent of {team} left! That is mostly HATS!'),
  // ================= stalemate =================
  b('stalemate', 'picnic', 'NOBODY is fighting! Is this a standoff or a very loud picnic?'),
  p('stalemate', 'contemplation', 'Stalemate. Philosophy calls it contemplation. Brutus calls it a refund.'),
  p('stalemate', 'diplomacy', 'Two armies, equally unwilling. We have accidentally invented diplomacy.'),
  c('stalemate', 'zeus', 'In eighteen seconds someone moves. In thirty, Zeus does.'),

  c('stalemate', 'sleep', 'Everyone is waiting for someone else. This is how empires fall asleep.'),
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
  // ================= victory =================
  b('victory', 'terms', 'VICTORY for {team}! {n} survivors! The Terms of Conquest have been enforced!', { chain: ['victory_terms_p'] }),
  p('victory', 'terms_p', 'And nobody, I notice, read them.', { follow: true }),
  b('victory', 'grapes', 'It is over! {n} left standing, mostly {unit|pl}! Somebody fetch the GRAPES!'),
  b('victory', 'pizza', 'A decisive win! Pompeii Pizza congratulates {team} with a coupon, valid until the next ERUPTION!'),
  p('victory', 'puzzled', 'The last {unit|pl} stand. They look puzzled, as winners do.'),
  c('victory', 'remember', 'Nobody will remember the details. They will remember the {unit}.'),
  c('victory', 'left', '{team} won. I said they would, once the left flank stopped believing in itself.'),
  b('victory', 'wins', 'Win number {lifetime:wins}! We are putting your name on a WALL. Not a nice one!', { once: true, cd: 480, cond: { milestone: { name: 'wins', at: [10, 25, 50, 100] } } }),
  p('victory', 'milestone', '{lifetime:wins} wins. Is a record an achievement, or only a long habit?', { once: true, cd: 480, cond: { milestone: { name: 'wins', at: [10, 25, 50, 100] } } }),

  c('victory', 'notes', 'It went as I wrote. Slightly worse for the other side.'),
  c('victory', 'mission', 'You won {mission}. They will put it on a plaque. A small one.'),
  // ================= defeat =================
  b('defeat', 'fall', 'DEFEAT! {team} falls! Their spirit lives on! Their lunch, regrettably, does not!'),
  p('defeat', 'teaching', 'A defeat is only a battle that has finished teaching.'),
  c('defeat', 'left', 'I said left flank. I said left flank. I said left flank.'),
  c('defeat', 'unit', 'You lost to {unit|pl}. It was in my notes. In the margin. Underlined.'),
  c('defeat', 'chicken', 'The {lifetime:chickenDefeats|ord} chicken defeat. I keep a ledger. The chickens keep another.', { cd: 480, cond: { sub: 'chicken', stat: { name: 'chickenDefeats', min: 1 } } }),
  b('defeat', 'chicken_b', 'Beaten by CHICKENS! Again! That is {lifetime:chickenDefeats|words} times now! The league has noticed!', { cd: 480, cond: { sub: 'chicken', stat: { name: 'chickenDefeats', min: 2 } } }),
  p('defeat', 'chicken_p', 'Defeated by poultry. Is it shame if the poultry are sacred?', { cond: { sub: 'chicken' } }),

  p('defeat', 'flattery', 'Defeat has the singular advantage of teaching without flattery.'),
  c('defeat', 'tomorrow', 'You will try again tomorrow. Differently. Then I will say I said.'),
  c('defeat', 'mission', '{mission} beat you. It is in my notes. I wrote it down twice.'),
  // ================= timeout =================
  b('timeout', 'time', 'TIME! Decided by remaining cost, the least romantic way to win anything!', { cond: { sub: 'time' } }),
  c('timeout', 'accounting', 'It came down to accounting at six minutes. Accounting always wins. I said accounting.', { cond: { sub: 'time' } }),
  b('timeout', 'draw', 'A DRAW! Nobody wins! Everybody gets a participation laurel!', { cond: { sub: 'draw' } }),
  c('timeout', 'draw_c', 'Nobody won. I said nobody would. They did not enjoy being right.', { cond: { sub: 'draw' } }),

  // ================= mass_death =================
  b('mass_death', 'effect', '{n} DOWN at once! That is not a battle, that is a special effect!'),
  b('mass_death', 'discount', 'Whoever was standing together just got a GROUP discount on dying!'),
  c('mass_death', 'cluster', '{n} went together. I said do not cluster.'),

  // ================= prop_destroyed =================
  b('prop_destroyed', 'landlord', 'The {prop} is DOWN! Somebody\'s landlord is furious!'),
  p('prop_destroyed', 'stood', 'The {prop} falls. It stood for centuries, or until Tuesday.'),
  b('prop_destroyed', 'insurance', 'Property damage! Delphi Insurance says: we SAW this coming!'),

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
  c('god_power', 'bolt_c', 'It struck three. It will strike three again. As foretold.', { cond: { sub: 'zeus_lightning' } }),

  // ================= wave =================
  b('wave', 'bus', 'WAVE {n}! They keep coming! It is like a very violent bus service!'),
  p('wave', 'climate', 'Wave {n}. When does a crowd of enemies become a climate?'),
  c('wave', 'more', 'Wave {n}. There will be more. There are always more.'),

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
  // ================= campaign_* (start / win / lose per mission; one voice each, all three voices per mission) =================
  b('campaign_marathon_sort_of', 'start', 'Welcome to Marathon! SORT of! A great victory, historically, and a long walk, ceremonially!', { cond: { sub: 'start' } }),
  p('campaign_marathon_sort_of', 'win', 'We won at Marathon. Someone should run and tell Athens. Not me.', { cond: { sub: 'win' } }),
  c('campaign_marathon_sort_of', 'lose', 'You lost Marathon. History will be confused. So am I.', { cond: { sub: 'lose' } }),
  p('campaign_thermopylae_snack', 'start', 'The Hot Gates: a narrow pass, a small army, and a very large snack table. What is courage?', { cond: { sub: 'start' } }),
  b('campaign_thermopylae_snack', 'win', 'HELD! The gates held! The Spartans did not even drop the snacks!', { cond: { sub: 'win' } }),
  c('campaign_thermopylae_snack', 'lose', 'They went around. Somebody always shows them the path. I said it.', { cond: { sub: 'lose' } }),
  b('campaign_pyramid_scheme', 'start', 'PYRAMID SCHEME! Take out the Pharaoh and you are the boss! Which is how pyramid schemes work!', { cond: { sub: 'start' } }),
  c('campaign_pyramid_scheme', 'win', 'The Pharaoh fell. His pyramid was unfinished. It always is.', { cond: { sub: 'win' } }),
  p('campaign_pyramid_scheme', 'lose', 'The Pharaoh lives. He will build something larger, probably out of your mistakes.', { cond: { sub: 'lose' } }),
  c('campaign_nile_crossing', 'start', 'The goat must cross the Nile. Nobody listens when I say the goat is the point.', { cond: { sub: 'start' } }),
  b('campaign_nile_crossing', 'win', 'THE GOAT CROSSED! The goat is safe! The goat will not be giving interviews!', { cond: { sub: 'win' } }),
  p('campaign_nile_crossing', 'lose', 'The goat is lost. Surely the wisest creature present was the one who knew the rules.', { cond: { sub: 'lose' } }),
  b('campaign_alps_elephant', 'start', 'The ALPS! Elephants! Snow! A man with an eyepatch and a plan!', { cond: { sub: 'start' } }),
  p('campaign_alps_elephant', 'win', 'Victory in the snow. The elephants will want sweaters.', { cond: { sub: 'win' } }),
  c('campaign_alps_elephant', 'lose', 'The elephants panicked. I said fire. They brought fire. Rome brought more.', { cond: { sub: 'lose' } }),
  b('campaign_teutoburg_peekaboo', 'start', 'Teutoburg Forest! Thick fog, a long column, and the politest AMBUSH in history!', { cond: { sub: 'start' } }),
  p('campaign_teutoburg_peekaboo', 'win', 'Surprise is the cheapest weapon, and the most effective. Politeness helps.', { cond: { sub: 'win' } }),
  c('campaign_teutoburg_peekaboo', 'lose', 'They saw you. The trees are not that thick. I said hide behind the thicker ones.', { cond: { sub: 'lose' } }),
  b('campaign_troy_giftshop', 'start', 'TROY! A wall, a gate, and a gift shop that is NOT included in the price!', { cond: { sub: 'start' } }),
  c('campaign_troy_giftshop', 'win', 'The horse worked. The gate fell. I said it would. They gave me no gift shop discount.', { cond: { sub: 'win' } }),
  p('campaign_troy_giftshop', 'lose', 'Troy stands. The horse sits outside, unopened. Is that victory for it, or for caution?', { cond: { sub: 'lose' } }),
  c('campaign_cyclops_meet', 'start', 'The Cyclops cannot aim. He is also ten tons. Please do not stand still.', { cond: { sub: 'start' } }),
  b('campaign_cyclops_meet', 'win', 'CYCLOPS DOWN! The meet and greet was a success! He did not even sign anything!', { cond: { sub: 'win' } }),
  p('campaign_cyclops_meet', 'lose', 'The Cyclops won. He missed twelve times and still won. Is that skill, or volume?', { cond: { sub: 'lose' } }),
  b('campaign_zeus_bad_day', 'start', 'MOUNT OLYMPUS! Monsters, lightning and a very annoyed Zeus! He woke up like this!', { cond: { sub: 'start' } }),
  p('campaign_zeus_bad_day', 'win', 'You survived Zeus. He will need a lie-down.', { cond: { sub: 'win' } }),
  c('campaign_zeus_bad_day', 'lose', 'Zeus had a bad day. You were in it. I said you would be.', { cond: { sub: 'lose' } }),
];

// ===================================================================================================
// Selector
// ===================================================================================================

/** Category priorities (1-5). At speed > 2x only priority >= 4 may speak. campaign_* are always 5. */
export const CATEGORY_PRIORITY = {
  battle_start: 5, first_blood: 5, kill_streak: 4, hero_down: 5, friendly_fire: 4, rout: 4, charge: 3, brace: 4, volley: 2,
  boulder: 4, misfire: 5, misaim: 4, chicken: 4, goat: 4, philosopher: 4, senator: 4, trojan: 5, medusa: 4, elephant: 4,
  kick: 4, immortal: 4, throne: 4, ability: 3, hazard: 3, lead_change: 4, comeback: 5, big_swing: 4, army_low: 4, stalemate: 5, zeus: 5,
  victory: 5, defeat: 5, timeout: 5, mass_death: 3, prop_destroyed: 3, god_power: 4, wave: 4, idle_filler: 1,
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
  repeatWindow: 300,    // soft memory: a line heard in the last 300 s is strongly avoided
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

const TOKEN_RE = /\{([a-z0-9_]+)(?::([A-Za-z0-9_]+))?(?:\|([a-z]+))?\}/g;
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
  else if (t.filter === 'the') v = proper ? String(v) : 'the ' + String(v);
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
      else if (sess.lossStreak >= 3) sub = maybe('third_loss', 0.85);
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
    if (cause === 'trample' && pl.srcDef === 'war_elephant') { s.n = 1; offer('elephant', 'trample', s); return; }
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
          if (!sub && sess.lossStreak >= 2) sub = maybe('losing', 0.6);
          if (!sub && sess.winStreak >= 3) sub = maybe('winning', 0.6);
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
          const arr = bs.routT[pl.team ? 1 : 0]; arr.push(st.sim); prune(arr, st.sim, ROUT_WINDOW);
          if (arr.length >= ROUT_N) { const s = baseSlots(); s.n = arr.length; s.value = s.n; s.team = teamName(pl.team); s.teamIdx = pl.team; arr.length = 0; offer('rout', null, s); }
          break;
        }
        case 'army_low': { const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team; s.pct = Math.round(pl.frac * 100); offer('army_low', null, s); break; }
        case 'lead_change': {
          const s = baseSlots(); s.team = teamName(pl.team); s.teamIdx = pl.team;
          s.ratio = fmtRatio(pl.ratio); s.ratioVal = pl.ratio >= 1 ? pl.ratio : 1 / pl.ratio;
          if (pl.flank) s.flank = pl.flank;
          if (bs.deficit[pl.team ? 1 : 0] >= 2) { bs.deficit[pl.team ? 1 : 0] = 1; offer('comeback', null, s); } else offer('lead_change', null, s);
          break;
        }
        case 'big_swing': {
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
        case 'throne_sit': offer('throne', null, baseSlots()); break;
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
