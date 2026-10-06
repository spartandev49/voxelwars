// Campaign copy for the 9 missions of "The Ancient Era" (owner: HUMOR). Pure data; the CAMPAIGN agent wires ids to objectives.
// Per mission: title, blurb (map hover), briefing (3-5 lines across the three voices), victory/defeat (results screen),
// stars [3] (what each star asks for), reward { title, blurb }, and a `par` note. Live in-battle lines are in humor/announcer.js (campaign_* categories).
// Voices: brutus (play-by-play, one ALL-CAPS word per line), plato (dry questions), cassandra (right, ignored).

export const ACTS = {
  1: { title: 'Act I: Dawn of Bronze', blurb: 'Spears, sandals and strongly held opinions about formations.' },
  2: { title: 'Act II: Empires', blurb: 'Bigger armies, bigger roads, bigger elephants.' },
  3: { title: 'Act III: Mythology Class', blurb: 'The monsters you were warned about are real, and some of them are very polite.' },
};

const B = (text) => ({ who: 'brutus', text });
const P = (text) => ({ who: 'plato', text });
const C = (text) => ({ who: 'cassandra', text });

export const CAMPAIGN_TEXT = {
  marathon_sort_of: {
    title: 'Marathon (Sort Of)', act: 1,
    blurb: 'The original marathon, with fewer marathons. Beat the Persians, then somebody runs to tell Athens.',
    briefing: [
      B('WELCOME to your first battle! Spears in a line, enemy in front, long walk home afterwards!'),
      P('The Persians have come to Marathon. We have come to ask whether this was necessary. Place your hoplites first.'),
      C('They will bring cavalry. Keep your spears still. I said so last time. Nobody remembers last time.'),
      B('Keep it CHEAP! Spend less, win more, make the accountants cry! Hello, third star!'),
    ],
    victory: B('MARATHON! The messenger has been dispatched. He has not been consulted.'),
    defeat: C('Marathon is lost. Persians in Athens by dinner. I said so in the original, too.'),
    stars: [
      { id: 'win', text: 'Win the battle. Running is optional.' },
      { id: 'half', text: 'Win with at least half your army still standing. Plato will count.' },
      { id: 'thrift', text: 'Win while spending under 2,250 drachmae. Frugal is the new fearless.' },
    ],
    reward: { title: 'Marathoner', blurb: 'Ran a little. Fought a lot. Sat down afterwards.' },
  },
  thermopylae_snack: {
    title: 'The 300 Slightly Overweight Spartans', act: 1,
    blurb: 'Hold a narrow pass for two minutes against four waves. Somebody brought a snack table into the pass.',
    briefing: [
      B('THE HOT GATES! Narrow! Spartan! And somebody has brought snacks!'),
      P('Hold the hill for two minutes against four waves. What is endurance, if not stubbornness with a schedule?'),
      C('The fourth wave is the one that matters. The first three are only warm-up. I said so at the briefing.'),
      B('Keep every Spartan alive for the third star! They hate being killed! It is a whole LIFESTYLE!'),
    ],
    victory: B('HELD! The gates held, the snacks held, and the Spartans did not even look winded.'),
    defeat: C('They came around the side. They always do. Somebody always knows the path.'),
    stars: [
      { id: 'win', text: 'Hold the hill for two minutes.' },
      { id: 'half', text: 'Hold it with at least half your army alive. Spartans keep their own score.' },
      { id: 'no_spartan_lost', text: 'Lose no Spartans. They take it personally, and so does the afterlife.' },
    ],
    reward: { title: 'Hot Gater', blurb: 'Stood in a narrow gap and refused. Very Spartan. Very sweaty.' },
  },
  pyramid_scheme: {
    title: 'Pyramid Scheme', act: 1,
    blurb: 'Take down the Pharaoh and the pyramid scheme collapses. They always do.',
    briefing: [
      B('PYRAMID SCHEME! The plan: stab the boss, and the whole thing falls apart!'),
      P('He will hide behind guards, locusts and an enormous hat. Is a general still a general when he is hiding?'),
      C('The locusts are the problem. I said locusts at the planning meeting. Nobody wrote it down.'),
      B('Under ninety SECONDS is the third star! The Pharaoh is a busy man. He has pyramids to finish!'),
    ],
    victory: C('The Pharaoh fell. His pyramid is still unfinished. It always is.'),
    defeat: P('The Pharaoh lives. He will build something larger, probably from your mistakes.'),
    stars: [
      { id: 'win', text: 'Kill the Pharaoh.' },
      { id: 'half', text: 'Win with at least half your army alive. The rest were doing their best.' },
      { id: 'quick', text: 'Kill the Pharaoh in under 90 seconds. He keeps a schedule.' },
    ],
    reward: { title: 'Pyramid Schemer', blurb: 'Toppled the top of the pyramid. Technically a promotion.' },
  },
  nile_crossing: {
    title: 'Goat Across the Nile', act: 2,
    blurb: 'Escort one goat across the Nile. The goat has done this before and has opinions about your route.',
    briefing: [
      B('THE GOAT! The NILE! A very important crossing and a very important goat!'),
      P('The goat must reach the far bank. Everything else on the battlefield is merely a reason for the goat to continue.'),
      C('The goat will be fine. The goat is always fine. It is you I am worried about.'),
      B('No damage to the goat for the third star! Not a scratch! The helmet is new!'),
    ],
    victory: B('THE GOAT HAS CROSSED! The goat has no comment. The goat is eating reeds.'),
    defeat: P('The goat is lost. Surely the wisest creature on the field was the one who knew the rules.'),
    stars: [
      { id: 'win', text: 'Get the goat across the Nile.' },
      { id: 'half', text: 'Win with at least half your army alive. Ignore the goat\'s expression.' },
      { id: 'untouched', text: 'The goat takes no damage. None. The goat is watching.' },
    ],
    reward: { title: 'Goat Herder', blurb: 'Delivered a goat across a river. A strange but honest career.' },
  },
  alps_elephant: {
    title: 'Hannibal Ante Portas', act: 2,
    blurb: 'Take elephants over the Alps and win. The elephants are cold, and want that noted.',
    briefing: [
      B('THE ALPS! Snow! Elephants! A genuinely poor idea that worked!'),
      P('Hannibal crossed the mountains with elephants. Brilliance or stubbornness? Historically, the same thing.'),
      C('The Romans will bring fire. I told the elephants. They are elephants. They did not listen.'),
      B('Win with at least one elephant standing for the third star! It needs snacks! The ELEPHANT does!'),
    ],
    victory: B('ROME BLINKS! The elephants are cold, tired and a little smug. So is Hannibal. He hides it badly.'),
    defeat: C('The elephants panicked. I said fire. Rome brought more fire. They brought it twice.'),
    stars: [
      { id: 'win', text: 'Defeat the Romans in the snow.' },
      { id: 'half', text: 'Win with at least half your army alive. Count elephants twice.' },
      { id: 'elephant_alive', text: 'Win with at least one elephant alive. Tell it it was a team effort.' },
    ],
    reward: { title: 'Alps Alpinist', blurb: 'Crossed a mountain range in a bad mood with large animals.' },
  },
  teutoburg_peekaboo: {
    title: 'Teutoburg Hide and Seek', act: 2,
    blurb: 'A Roman column marches into a foggy forest. The barbarians say hello very politely, then ambush it.',
    briefing: [
      B('TEUTOBURG FOREST! Fog! Mud! An entire Roman column about to be very surprised!'),
      P('We hide, we wait, we jump out. It is the oldest game there is, played with sharper tools.'),
      C('The centurion is the one with the plan. Hit him first, before he fills in the paperwork.'),
      B('Do it in seventy-five SECONDS! Tea is getting cold! Pottery class is at six!'),
    ],
    victory: P('A forest, a fog and a good deal of politeness. History has not forgotten.'),
    defeat: C('They saw you. The trees were not that thick. I said hide behind the thick ones.'),
    stars: [
      { id: 'win', text: 'Defeat the centurion.' },
      { id: 'half', text: 'Win with at least half your army alive. Hide better, next time.' },
      { id: 'fast', text: 'Win in 75 seconds. Politeness does not mean slowness.' },
    ],
    reward: { title: 'Forest Phantom', blurb: 'Was somewhere. Was suddenly everywhere. Vanished. Had tea.' },
  },
  troy_giftshop: {
    title: 'Siege of Troy (Gift Shop Not Included)', act: 3,
    blurb: 'Break the gates of Troy with a very large wooden horse. Please accept this gift. Please.',
    briefing: [
      B('TROY! A great wall, a great gate, and a great big horse! Surprise! It is full of hoplites!'),
      P('We wait outside, offering a gift. Will they accept it? Do they ever learn?'),
      C('The gate will fall. Wood burns 1.6 times better than anyone expects. I measured it.'),
      B('Bring the gate down inside a hundred seconds for the third star! The gift shop opens at DAWN!'),
    ],
    victory: C('The horse worked. The gate fell. They gave me no gift shop discount.'),
    defeat: P('Troy stands. The horse sits outside unopened. Is that a victory for caution, or for rudeness?'),
    stars: [
      { id: 'win', text: 'Break both gates and defeat the defenders.' },
      { id: 'half', text: 'Win with at least half your army alive. The horse counts as a family member.' },
      { id: 'gate_fast', text: 'Bring a gate down within 100 seconds. The horse is not a patient horse.' },
    ],
    reward: { title: 'Gift Shop Manager', blurb: 'Sold nothing. Won everything. Receipts are available on request.' },
  },
  cyclops_meet: {
    title: 'Cyclops Isle Meet-and-Greet', act: 3,
    blurb: 'Meet the Cyclops. He is huge, lonely and a terrible shot. His goats are friendly.',
    briefing: [
      B('CYCLOPS ISLE! A meet and greet! The guest of honour has one eye and a very large club!'),
      P('He misses a quarter of his throws. That is the nicest thing anyone can say about him.'),
      C('Do not shoot near your own people. The boulders cannot tell friends from enemies. Neither can some arrows.'),
      B('No friendly fire for the third star! Be NICE to your own side! It is a big island!'),
    ],
    victory: B('CYCLOPS DOWN! The island is quiet. The goats are not. The goats are celebrating.'),
    defeat: P('The Cyclops won. He missed a dozen times and still won. Was that skill, or volume?'),
    stars: [
      { id: 'win', text: 'Defeat the Cyclops.' },
      { id: 'half', text: 'Win with at least half your army alive. The goats stay out of the count.' },
      { id: 'no_ff', text: 'Cause no friendly fire. Aim at the giant, not the friend.' },
    ],
    reward: { title: 'Cyclops Whisperer', blurb: 'Talked a ten-ton monster into a nap. Mostly with a club.' },
  },
  zeus_bad_day: {
    title: 'Zeus Has a Bad Day', act: 3,
    blurb: 'Survive four waves of monsters on Mount Olympus while Zeus has a very bad day.',
    briefing: [
      B('MOUNT OLYMPUS! Four waves of monsters! A cranky god! The sky is on fire and he is not sorry!'),
      P('Zeus is having a bad day. The monsters are merely symptoms. Where does one begin with a temper?'),
      C('He will throw lightning at you. He will also throw it at them. I said he was fair. I did not say kind.'),
      B('Do not lose a HERO for the third star! The heroes have lawyers! Their statues are half done!'),
    ],
    victory: P('You survived Zeus. He will need a lie-down. So will you. Please do not lie down on the battlefield.'),
    defeat: C('Zeus had a bad day, and you were in it. I said you would be.'),
    stars: [
      { id: 'win', text: 'Survive four waves of monsters.' },
      { id: 'half', text: 'Win with at least half your army alive. Zeus took the rest in the settlement.' },
      { id: 'heroes_alive', text: 'Survive without losing a hero. Statues are expensive.' },
    ],
    reward: { title: 'Zeus\' Therapist', blurb: 'Listened to a god complain about his week. Billed him for the hour.' },
  },
};

export const MISSION_ORDER = ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'];

// Mission 1 scripted teaching beats (spec/world.md 6): place a spear line, fight, use a god power, see a counter pay off. Each is skippable.
// `trigger` names are the sim/campaign moments the CAMPAIGN agent fires; `text` is spoken by `who`; `hint` is the plain how-to under the bubble.
export const TEACHING_BEATS = [
  { id: 'place_spears', trigger: 'placement_start', who: 'plato', text: 'Place a line of hoplites across the field, spears toward the enemy. It looks simple because it is.', hint: 'Choose the line brush, then drag across the field.' },
  { id: 'fight', trigger: 'battle_start', who: 'brutus', text: 'FIGHT! Watch the line hold. Hoplites win by standing still and being annoying.', hint: 'Space pauses. The speed keys change the pace.' },
  { id: 'god_power', trigger: 'first_contact', who: 'cassandra', text: 'Press 1 to call down Zeus. He likes being asked. He will like the result more.', hint: 'Number keys 1 to 6 cast god powers. Each has a cooldown.' },
  { id: 'counter', trigger: 'cavalry_brace', who: 'plato', text: 'There it is: cavalry broke on the spears. Is that not a lesson? Write it down.', hint: 'Spears beat cavalry. Archers beat spears. Horses beat archers.' },
  { id: 'done', trigger: 'battle_end', who: 'brutus', text: 'THAT is how you win a battle! Do it again, smarter, for the stars!', hint: 'Stars unlock mutators and silly hats.' },
];
export const TEACHING_SKIP = { label: 'Skip tutorial', tip: 'Plato will pretend not to mind.' };

// Cosmetic unlock parts (Workshop). Ids are suggestions; the CAMPAIGN agent maps them to missions.
export const REWARD_PARTS = {
  colander_helm: { name: 'Colander Helm', blurb: 'Excellent ventilation. Terrible against arrows. Superb against pasta.' },
  traffic_cone_helm: { name: 'Traffic Cone Helm', blurb: 'Warns nobody of anything. Looks official.' },
  fish: { name: 'Fish', blurb: 'A sturdy weapon, if you believe in it. The fish has doubts.' },
  rubber_chicken: { name: 'Rubber Chicken', blurb: 'The sacred chicken\'s softer cousin. Squeaks in battle.' },
  frying_pan: { name: 'Frying Pan', blurb: 'Bonks with a pleasing sound and doubles as dinner.' },
  baguette: { name: 'Baguette', blurb: 'Anachronistic, crusty, and surprisingly effective.' },
  foam_finger: { name: 'Foam Finger', blurb: 'Number one. Technically only in the crowd.' },
  olive_branch: { name: 'Olive Branch', blurb: 'The weapon of peace, used for hitting.' },
  giant_moustache: { name: 'Giant Moustache', blurb: 'Adds nothing but authority.' },
  golden_toga: { name: 'Golden Toga', blurb: 'For senators who have already been bribed.' },
};

export function missionText(id) { return CAMPAIGN_TEXT[id] || null; }
