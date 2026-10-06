// Loading tips: half real hints about counters and controls ('hint'), half jokes that also teach ('joke'). Each <= 18 words.
// Shape: { id, kind: 'hint'|'joke', topic, text }. Every tip is true of the current rules (spec 8.1 / units.md).

const H = (id, topic, text) => ({ id: 'tip_' + id, kind: 'hint', topic, text });
const J = (id, topic, text) => ({ id: 'tip_' + id, kind: 'joke', topic, text });

export const TIPS = [
  // ---- real hints: counters ----
  H('spears_cav', 'counter', 'Spearmen standing still beat cavalry charges. Hold position and let the horses come to you.'),
  H('cav_archers', 'counter', 'Cavalry catches archers; spearmen do not. Send horses after the bows.'),
  H('backstab', 'tactics', 'Hits from behind do 35% more damage. Shields only protect the front.'),
  H('fire_targets', 'counter', 'Fire beats elephants, mummies and wooden horses. Bring Nubian archers.'),
  H('rain_fire', 'weather', 'Rain halves burn damage and switches off fire arrows. Check the weather before you pack torches.'),
  H('stone_blunt', 'counter', 'Stoned units take double damage from blunt weapons. Medusa plus a club is a plan.'),
  H('senator_sleep', 'counter', 'Sleeping enemies take 1.5x damage. Let the Senator talk, then hit them while they snore.'),
  H('catapult_min', 'siege', 'Catapults cannot hit anything closer than 15 units. Protect them with something that is closer.'),
  H('hero_aura', 'tactics', 'Heroes carry auras. Keep your army inside the radius for bonus damage and morale.'),
  H('pilum_shield', 'counter', 'Pilum throwers break shields for four seconds. Follow them with swords.'),
  H('philosopher_back', 'tactics', 'Philosophers confuse everything within seven units. Keep them behind your front line.'),
  H('officers', 'morale', 'Kill the officer and nearby soldiers lose heart. Armies rout when morale hits the floor.'),
  H('stalemate', 'rules', 'If nobody fights for thirty seconds, Zeus steps in. After forty-four, he leaves.'),
  H('phalanx', 'tactics', 'Hoplites standing still in a tight group get the phalanx bonus. Walking spoils it.'),
  H('type_cap', 'rules', 'You can field 16 different unit types in a battle. Chickens count as a type.'),
  H('wine_rain', 'rules', 'Wine rain makes soldiers wander and deal 40% less damage. Time it for when you are losing.'),
  // ---- real hints: controls ----
  H('pause', 'controls', 'Space pauses. The speed keys go down to 0.25x, which is excellent for watching a goat.'),
  H('rematch', 'controls', 'R rematches instantly. Cassandra recommends changing something first.'),
  H('command', 'controls', 'Select a unit and press Enter to take command. WASD moves, a click attacks.'),
  H('budget', 'rules', 'Spend your whole budget. Unspent drachmae have never won a battle.'),
  // ---- jokes that teach ----
  J('trojan', 'counter', 'A suspicious horse is a wooden hint. Destroy it before it opens, or meet six hoplites.'),
  J('goat', 'units', 'The goat has no rank, no armour and the best kill record. Notice the goat.'),
  J('elephant_mouse', 'counter', 'Elephants fear fire. Rumours about mice are unconfirmed. Torches are not.'),
  J('spartan_kick', 'units', 'A Spartan kick launches enemies eight units. Do not stand behind the target.'),
  J('catapult_misfire', 'units', 'Never stand next to a catapult you love. It misfires four percent of the time.'),
  J('immortals', 'units', 'Immortals revive once. After that they are just men with excellent marketing.'),
  J('cyclops_aim', 'units', 'A Cyclops misses a quarter of his throws. He still has a club, so do not relax.'),
  J('chicken_rage', 'units', 'A hurt sacred chicken may throw a tantrum: five seconds of triple damage. Finish it fast.'),
  J('mummy', 'counter', 'Do not insult a mummy. Do not light it either. These are two different problems.'),
  J('sparabara', 'units', 'A Sparabara wall stops arrows. It does not stop cavalry. Nothing stops cavalry, except spears.'),
  J('cataphract', 'counter', 'Cataphracts have 60% armour. Do not poke them with sticks. Use blunt weapons, fire or Zeus.'),
  J('big_army', 'tactics', 'A big army is impressive. A big army in a bad spot is a very large lesson.'),
  J('choke', 'arena', 'Thermopylae is eight units wide. Spears adore it. Cavalry files a complaint.'),
  J('berserker', 'units', 'Berserkers hit harder below half health. Kill them fast; wounding them only helps.'),
  J('hannibal', 'units', 'Hannibal\'s pincer bonus needs a flanked target. Surround first, then thank him.'),
  J('spartans_fearless', 'units', 'Spartans are fearless and never rout. Brutus calls it loyalty. Plato calls it a design choice.'),
  J('chariot', 'units', 'Chariot archers shoot while moving. Parking is not their strong suit.'),
  J('druid', 'counter', 'Do not stand in a clump near a druid. His lightning is on a group discount.'),
  J('cassandra', 'meta', 'Cassandra is always right and never believed. Read the lessons screen. Be the exception.'),
  J('peltast', 'units', 'Peltasts kite at 85% of their range. Chase them with horses, not with dignity.'),
];
