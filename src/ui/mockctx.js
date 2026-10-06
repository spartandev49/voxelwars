// mockctx.js: a fake Ctx + Game with realistic sample data so every screen mounts in a plain page (no 3D engine, no real save layer).
// Owner UI-A; used by tools/shot_ui.mjs, tests/ui/*.test.mjs and handy for UI-B too.
//   import { createMockApp } from '../../src/ui/mockctx.js';
//   const app = createMockApp({ registry: { title: titleModule, ... } });   // app.ctx, app.game, app.nav (router), app.goto(id, params)
// Data comes from the REAL content: STAT_TABLE + FACTIONS, the real arena generator (thumbnails are drawn from generated terrain),
// the real prop catalog. Unit text, achievements, humor lists are sample copy standing in for the HUMOR agent's content.
import { STAT_TABLE, FACTIONS } from '../content/era_ancient/stats.js';
import { PROP_CATALOG } from '../content/era_ancient/props/catalog.js';
import { generateArena, RECIPES } from '../world/gen.js';
import { MATERIALS } from '../world/arena.js';
import { FORMATIONS } from '../sim/formations.js';
import { normalizeDef } from '../sim/defs.js';

/* ------------------------------------------------------------------ sample copy */
const UNIT_TEXT = {
  hoplite: ['Hoplite', 'Spear, big shield, strong opinions about formations.', 'Citizen-soldiers who fought shoulder to shoulder, each trusting his neighbour’s shield more than his own judgement. The phalanx works until someone sneezes.', 'Dory length: whatever the sergeant says it is.'],
  spartan: ['Spartan', 'Kicks first, philosophises later. Mostly kicks.', 'Raised from childhood for war, which explains the posture and the lack of small talk. Famous for holding narrow passes and for punting enemies into the middle distance.', 'Brevity is the soul of Sparta. Also the whole vocabulary.'],
  peltast: ['Peltast', 'Light javelins, lighter armour, heavy running.', 'Skirmishers from the hills who throw things and then leave. The art of the strategic retreat, perfected by people who never stood still in the first place.', 'Not a coward. A mobile logistics solution.'],
  cretan_archer: ['Cretan Archer', 'Long-range opinions delivered at speed.', 'Island bowmen hired by everyone who could afford them. Their composite bows reach farther than a cavalry captain’s patience.', 'Invoices by the arrow.'],
  companion_cavalry: ['Companion Cavalry', 'Lance, white horse, excellent entrances.', 'The elite horsemen who hit the decisive spot at the decisive moment. A wedge of them can shred a flank before the flank finishes complaining.', 'The horse has seen things.'],
  philosopher: ['Philosopher', 'Confuses enemies by asking questions nobody can answer.', 'Brought to the front for morale, he brings long, relevant questions instead. Nearby enemies stop to consider whether swords truly exist.', 'Is the shield defending the man, or the man the shield?'],
  strategos: ['Strategos', 'Cloak, crest, and a plan nobody asked for.', 'A general who fights at the front because the plan was only ever "follow me". His presence steadies the line and confuses the opposing plan.', 'Has a baton. Uses it for pointing.'],
  legionary: ['Legionary', 'Walks in a box. Wins in a box.', 'Armoured professionals with large shields and larger paperwork. When they lock shields overhead, arrows file a complaint and leave.', 'Pay stub says "plus salt".'],
  pilum_thrower: ['Pilum Thrower', 'One javelin that ruins your shield’s day.', 'Throws a heavy javelin that bends on impact, leaving enemy shields hanging off their arms like wet laundry.', 'Reusable: the javelin, no; the shield, no.'],
  centurion: ['Centurion', 'Red crest, vine stick, boundless patience (none).', 'Commands eighty soldiers using volume, a crest and an unusually flexible stick of vine. Discipline is contagious around him, like a very strict cold.', 'Has never once said "good enough".'],
  gladiator: ['Gladiator', 'Trident, net, crowd appeal.', 'A showman who fights better when surrounded, because the applause is loud and the alternative is quiet. Nets are optional; flair is not.', 'Thumbs-up: twelve. Thumbs-down: negotiable.'],
  equites: ['Equites', 'Spear cavalry that arrives before the memo.', 'Roman horsemen guarding the army’s flanks and its reputation for punctuality. Mostly good at chasing the things that run away.', 'The horse unionised years ago.'],
  ballista: ['Ballista', 'A very large crossbow with a small crew.', 'Torsion-powered bolt thrower that can pin three soldiers to a tree and then, awkwardly, to each other. Crew of two, opinions of many.', 'Reload time: contemplative.'],
  senator: ['Senator', 'Puts enemies to sleep with a speech.', 'Arrives on the battlefield mainly to speak. Enemies in earshot slowly lose interest in the war. Coins occasionally change allegiances.', 'Filibuster, but with feeling.'],
  medjay: ['Medjay', 'Desert guardian, spear, dependable.', 'Police and soldiers of the river valley, equally comfortable arresting a thief or a chariot. Calm under pressure and excellent at paperwork.', 'Always knows where your sandals are.'],
  nubian_archer: ['Nubian Archer', 'Tall bow, steady aim, flaming opinions.', 'Famed bowmen whose accuracy was the envy of every army. Every sixth arrow is lit, because fire makes a point.', 'Counts arrows. Sixth one is lit. No exceptions.'],
  khopesh_warrior: ['Khopesh Warrior', 'A sickle-sword that steals your shield.', 'The curved blade hooks around a shield and tugs, which is rude. The wearer smiles about it afterwards.', 'Sharp, in every sense.'],
  chariot_archer: ['Chariot Archer', 'Two horses, a bow, no brakes.', 'Fast platforms for shooting while moving, which is nearly impossible and was somehow routine. Small enemies avoid standing in front of it.', 'Brakes: pending.'],
  mummy: ['Mummy', 'Slow, bandaged, mildly cursed.', 'An old soldier with a long to-do list and no time left to finish it. Enemies nearby slow down, because dread is heavy.', 'Bandage budget: unlimited.'],
  anubis_guard: ['Anubis Guard', 'Jackal helm. Finishes what you started.', 'Guardian of the underworld’s front door. Wounded enemies are escorted out, and the guards are not shy about it.', 'Does not do small talk. Does do last words.'],
  priest_of_ra: ['Priest of Ra', 'Heals friends with a very bright stick.', 'Channels the sun into a restorative beam, and into a less restorative one when pushed.', 'Fully charged. Sunscreen not included.'],
  pharaoh: ['Pharaoh', 'Crook, flail, a cloud of locusts.', 'A ruler who treats the battlefield as an extension of the palace. Locusts are provided.', 'The double crown is two crowns. He did not want to choose.'],
  immortal: ['Immortal', 'Always ten thousand. Technically not immortal.', 'The Persian elite, replaced whenever one fell, so the number never changed. Once in a while one of them gets back up. Awkward.', 'Ten thousand. Give or take ten thousand.'],
  sparabara: ['Sparabara', 'Shield-wall archers. Safe, and annoyed about it.', 'Shoot from behind a wall of wicker shields planted in the ground. The wall is carried by someone else, who has opinions.', 'Do not ask who holds the wall.'],
  cataphract: ['Cataphract', 'Armoured horse, armoured rider, armoured everything.', 'Heavily armoured lancers whose charge ends conversations. The armour is so thorough the horse also wears some.', 'Needs a crane to mount. Worth it.'],
  camel_rider: ['Camel Rider', 'Scares horses just by showing up.', 'Horses hate the smell, and camels know it. Enemy cavalry nearby slow down and think about their choices.', 'The camel is judging you. Quietly.'],
  xerxes: ['Xerxes', 'A king, a throne, and a tall hat.', 'Watches from a golden throne, cheers the loyal and shouts "Retreat!" when someone mentions the enemy by name.', 'The throne has its own cart.'],
  war_elephant: ['War Elephant', 'A very large reason to reconsider.', 'Brought across mountains for dramatic effect. Tramples small things and loses its composure near fire. It is not angry, just tall.', 'Also carries two archers and one existential question.'],
  numidian: ['Numidian', 'Light cavalry, javelins, no saddle, no problem.', 'Riders who guide their horses with a stick and their confidence. Excellent at hit-and-run, terrible at waiting in line.', 'Waits in line: never.'],
  catapult: ['Catapult', 'Throws boulders. Sometimes the crew.', 'Hurls heavy stones over walls and also, four percent of the time, a crew member. Training continues.', 'Misfire: 4%. Apology: 0%.'],
  hannibal: ['Hannibal', 'Black horse, red cloak, long plans.', 'A general who crossed mountains, with elephants, to prove a point. His presence makes pincer movements feel obvious.', 'The elephants were not consulted.'],
  berserker: ['Berserker', 'Fights faster the less health he has.', 'A warrior who treats hit points as a suggestion. Below half health he becomes loud, fast and frankly alarming.', 'Stress: fuel.'],
  axe_thrower: ['Axe Thrower', 'Throws axes. Axes return nothing.', 'Skirmishers carrying a belt of throwing axes and an unreasonable amount of faith. Excellent at making the front rank rethink things.', 'Axes are single-use. Enthusiasm is renewable.'],
  druid: ['Druid', 'Lightning, but with moss.', 'Calls a bolt that jumps between enemies and, between battles, heals friends. Mistletoe is the focus; the beard is the amplifier.', 'No relation to the one at the party.'],
  warhound: ['Warhound', 'Gets extra fierce for each friend.', 'Mastiffs trained to hunt in packs. Each dog nearby makes the others just a little worse for the enemy.', 'Good boy. Dangerous boy.'],
  chieftain: ['Chieftain', 'Horned helm, big club, huge moustache.', 'Leads from the front and from the middle, depending on the day. Blows a horn once, loudly, to make a point.', 'The horn is reusable. The point is not.'],
  minotaur: ['Minotaur', 'Bull-headed, axe-handed, labyrinth-averse.', 'Charges forward for twelve units of pure confidence, stunning everything in the way. Struggles with doors.', 'Still hasn’t found the exit.'],
  cyclops: ['Cyclops', 'Big club, bigger rocks, no depth perception.', 'Throws boulders with great enthusiasm and a quarter of them land somewhere else entirely. A bad day for anyone standing near the target.', 'One eye. Zero sense of distance.'],
  medusa: ['Medusa', 'Turns the line into statues.', 'A gaze that freezes enemies in solid grey. Statues take extra damage from blunt things and shatter beautifully.', 'Do not make eye contact. Or any contact.'],
  centaur_archer: ['Centaur Archer', 'Half horse, all bow, fully mobile.', 'Shoots while moving, retreats while shooting, argues while retreating. Sometimes the horse half disagrees.', 'Four legs. Two opinions.'],
  trojan_horse: ['Trojan Horse', 'A gift. Please do not open.', 'Large, wooden, suspiciously hollow. Once it reaches the enemy, a hatch opens and six hoplites tumble out.', 'Gift shop not included.'],
  sacred_chicken: ['Sacred Chicken', 'Small, furious, blessed.', 'Temple chickens that became a very small army. When hurt, they go from sacred to unstoppable.', 'Has a halo. Uses it as a weapon.'],
  battle_goat: ['Battle Goat', 'Wears a helmet. Headbutts anyway.', 'A champion in everything but title. Charges, rams, and takes no credit. The real hero, every time.', 'The real hero.'],
};
const DEATHS = { melee: ['Tell my shield I loved it.', 'Not like this.', 'Was that the plan?'], ranged: ['I had one more arrow...', 'Wrong spot, wrong day.', 'Reloading... oh.'], cavalry: ['Horse, continue without me.', 'This is the horse’s fault.', 'Tell the stable I tried.'], default: ['Ow.', 'Tell the goat I was brave.', 'Was it the helmet?'] };
const TAUNTS = ['Is that all you have?', 'Come closer. The shield is shy.'];

const ACHIEVEMENTS = [
  ['first_victory', 'First Blood (Technically Second)', 'Win a battle.', 'sword', 1], ['goat_herder', 'Goat Herder', 'Win Protect the Goat with the goat unhurt.', 'goat', 1], ['chicken_dinner', 'Winner Winner Chicken Dinner', 'Chickens defeat ten soldiers in a battle you win.', 'chicken', 10],
  ['sparta', 'THIS IS... A LOT OF KICKS', 'Land 25 Spartan kicks.', 'bolt', 25], ['et_tu', 'Et Tu, Brute?', 'Defeat five of your own soldiers in one battle.', 'skull', 5], ['trunk_show', 'Trunk Show', 'Elephants trample 20 soldiers in one battle.', 'paw', 20],
  ['depth_perception', 'Depth Perception Optional', 'Watch a cyclops miss five throws.', 'target', 5], ['cogito', 'Cogito, Ergo Won', 'Win with only philosophers still standing.', 'scroll', 1], ['not_so_immortal', 'Not So Immortal', 'Defeat an Immortal who already got back up.', 'refresh', 1],
  ['gift_shop', 'Gift Shop Manager', 'Reveal the Trojan Horse, then win.', 'door', 1], ['stone_cold', 'Stone Cold', 'Turn 15 soldiers to stone in one battle.', 'cube', 15], ['dino_retirement', 'Dinosaur Retirement Plan', 'Defeat 30 soldiers with one meteor.', 'fire', 30],
  ['tipsy', 'Wine Not?', 'Win during Wine Rain.', 'wine', 1], ['perfect_phalanx', 'Perfect Phalanx', 'Win with no losses (20 or more soldiers).', 'shield', 1], ['underpaid', 'Underpaid, Overperforming', 'Win against five times your army’s cost.', 'coin', 1],
  ['blitz', 'Blitzkrieg (Anachronistic)', 'Win in under 30 seconds.', 'clock', 1], ['zeus_left', 'Zeus Has Left The Chat', 'Make Zeus rage-quit a stalemate.', 'storm', 1], ['landscaper', 'Landscaper', 'Save an arena.', 'map', 1],
  ['soldier_smith', 'Soldier Smith', 'Save a custom soldier.', 'hammer', 1], ['tourist', 'Tourist Trap', 'Fight on every arena.', 'pin', 16], ['ancient_history', 'Ancient History', 'Finish the campaign.', 'laurel', 1],
  ['overachiever', 'Overachiever', 'Earn all 27 campaign stars.', 'star', 27], ['body_count', 'Body Count Is Not A Hobby', 'Defeat 1,000 soldiers in total.', 'skull', 1000], ['main_character', 'Main Character Energy', 'Defeat 20 soldiers in Take Command.', 'crown', 20],
];

const ARENAS = [
  ['marathon', 'Marathon Plain', 'Open field, rolling hills, olive trees. The reference battlefield.', ['open', 'tutorial'], 'greek', 3000], ['thermopylae', 'The Hot Gates', 'A narrow choke between cliffs and a stone wall. Spears and shields shine.', ['choke', 'defence'], 'greek', 6000],
  ['colosseum', 'The Colosseum', 'Sand oval with 90 enthusiastic spectators and a spiked trapdoor.', ['crowd', 'hazard'], 'roman', 8000], ['nile', 'Nile Delta', 'A river with a single ford. Crossing is the fight.', ['water', 'choke'], 'egypt', 6500],
  ['giza', 'Giza Plateau', 'Dunes, pyramids as cover, one very patient sphinx.', ['sand', 'cover'], 'egypt', 7500], ['persepolis', 'Persepolis Courtyard', 'Marble columns block arrows. Throne optional.', ['cover', 'columns'], 'persian', 8000],
  ['carthage', 'Carthage Harbor', 'Docks, ships, crates and a sea on one edge.', ['water', 'flammable'], 'carthage', 8000], ['teutoburg', 'Teutoburg Forest', 'Dense trees, fog and mud. Ambush weather.', ['forest', 'fog'], 'barbarian', 7500],
  ['alpine', 'Alpine Pass', 'Snow, a narrow pass and cliffs. Everyone is slower and grumpier.', ['snow', 'choke'], 'barbarian', 8000], ['olympus', 'Mount Olympus', 'Marble plateau above the clouds. Zeus is watching and has opinions.', ['zeus', 'columns'], 'mythic', 8000],
  ['troy', 'Siege of Troy', 'A wall with a gate and towers. Bring a catapult. Maybe a horse.', ['siege', 'walls'], 'greek', 10000], ['styx', 'The River Styx', 'Lava river, two bone bridges, geysers. Mind the bridges.', ['lava', 'choke'], 'mythic', 8000],
  ['cyclops', 'Cyclops Isle', 'An island, a cave mouth, many goats.', ['boss', 'goats'], 'mythic', 8000], ['oasis', 'Oasis Duel', 'A small lake in a palm ring. Quick duels, quick regrets.', ['small', 'water'], 'egypt', 3000],
  ['arenalab', 'Arena Lab', 'Flat grass, blank slate. Where editors start.', ['flat', 'editor'], 'greek', 3000], ['random', 'Random', 'A surprise battlefield from a seed. Same seed, same field.', ['random'], 'greek', 8000],
];

const MUTATORS = [['big_heads', 'Big Heads', 'Heads x1.6. Helmets are optional, vanity is not.', 0], ['tiny_titans', 'Tiny Titans', 'Everyone is half size and twice as dramatic.', 3], ['moon_gravity', 'Moon Gravity', 'Knockback x3. Mind the ceiling.', 6], ['chicken_rain', 'Chicken Rain', 'Sacred chickens fall from the sky now and then.', 9],
  ['wine_rain', 'Wine Rain Always', 'Permanent tipsy. Damage x0.6 and a lot of hiccups.', 12], ['friendly_fire_fiesta', 'Friendly Fire Fiesta', 'Everyone hurts everyone. Teamwork is a rumour.', 15], ['speedy', 'Speedy Soldiers', 'Everyone moves 30% faster.', 18], ['ragdoll', 'Ragdoll Frenzy', 'Knockback goes to eleven.', 21]];

const DEFAULT_KEYS = { pan_up: 'KeyW', pan_down: 'KeyS', pan_left: 'KeyA', pan_right: 'KeyD', rot_left: 'KeyQ', rot_right: 'KeyE', tilt_up: 'KeyZ', tilt_down: 'KeyX', follow: 'KeyF', topdown: 'KeyT', cinematic: 'KeyC', photo: 'KeyP', pause: 'Space', slower: 'BracketLeft', faster: 'BracketRight' };
export const DEFAULT_SETTINGS = {
  quality: 'marble', autoScale: true, resScale: 1, shadows: true, bloom: true, clouds: true, fpsCounter: false, gore: 'red', corpses: 'fade', camSens: 1, edgeScroll: true, autoPauseBlur: true,
  'vol.master': 0.8, 'vol.music': 0.6, 'vol.sfx': 0.8, 'vol.ui': 0.7, 'vol.announcer': 0.9, muted: false, tts: false, subtitles: true, reduceMotion: false, shake: 1, flashLimiter: true, uiScale: 1, palette: 'classic', highContrastUI: false,
  keys: {}, beacon: false, seenHints: {},
};

/* ------------------------------------------------------------------ small helpers */
const clone = (o) => JSON.parse(JSON.stringify(o));
function emitter() {
  const hs = [];
  return { on(fn) { hs.push(fn); return () => { const i = hs.indexOf(fn); if (i >= 0) hs.splice(i, 1); }; }, emit(...a) { hs.slice().forEach((f) => f(...a)); } };
}
function makeId(p) { return p + '_' + Math.random().toString(36).slice(2, 8); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ------------------------------------------------------------------ content */
export function buildUnits() {
  const units = {};
  for (const id of Object.keys(STAT_TABLE)) {
    const d = normalizeDef(id, STAT_TABLE[id]);
    const t = UNIT_TEXT[id] || [id, '', '', ''];
    d.name = t[0];
    d.text = { blurb: t[1], lore: t[2], codexJoke: t[3], deaths: DEATHS[d.role] || DEATHS.default, taunts: TAUNTS };
    units[id] = d;
  }
  return units;
}

function arenaThumbFor(recipe, seed, w, h) {
  const a = generateArena(recipe === 'random' ? 'oasis' : recipe, 'small', seed || 1);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const img = g.createImageData(w, h);
  const n = a.size;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.min(n - 1, Math.floor(x / w * n)), cz = Math.min(n - 1, Math.floor(y / h * n));
    const hh = a.getH(cx, cz), m = MATERIALS[a.getM(cx, cz)] || MATERIALS[0];
    let c = m.top[0];
    let r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
    const east = a.getH(Math.min(n - 1, cx + 1), cz), north = a.getH(cx, Math.max(0, cz - 1));
    const shade = 1 + (hh - east) * 0.07 + (north - hh) * 0.05 + (hh - 8) * 0.012;
    if (a.water > 0 && hh <= a.water) { const lava = a.lava; r = lava ? 255 : 60; gg = lava ? 106 : 150; b = lava ? 26 : 220; } else { r *= shade; gg *= shade; b *= shade; }
    const i = (y * w + x) * 4;
    img.data[i] = Math.max(0, Math.min(255, r)); img.data[i + 1] = Math.max(0, Math.min(255, gg)); img.data[i + 2] = Math.max(0, Math.min(255, b)); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // zones
  for (const [k, col] of [['A', 'rgba(59,108,240,.35)'], ['B', 'rgba(238,75,75,.35)']]) {
    const z = a.zones[k], ws = a.worldSize();
    g.fillStyle = col; g.fillRect((z.x - z.w / 2 + ws / 2) / ws * w, (z.z - z.d / 2 + ws / 2) / ws * h, z.w / ws * w, z.d / ws * h);
  }
  // props as dots
  g.fillStyle = 'rgba(20,22,58,.55)';
  for (let i = 0; i < a.props.length; i += 3) { const p = a.props[i]; g.fillRect((p.x + a.worldSize() / 2) / a.worldSize() * w - 1, (p.z + a.worldSize() / 2) / a.worldSize() * h - 1, 2, 2); }
  return { url: cv.toDataURL('image/jpeg', 0.62), arena: a };
}

export function buildContent() {
  const units = buildUnits();
  const unitList = () => Object.keys(units).map((k) => units[k]);
  const thumbs = {};
  const arenas = ARENAS.map(([id, name, blurb, tactics, theme, rec], i) => ({ id, name, recipe: id, size: id === 'oasis' ? 'small' : id === 'thermopylae' || id === 'troy' ? 'medium' : 'medium', seed: 100 + i * 17, blurb, tactics, theme, mood: theme, recommendedBudget: rec, thumbNew: true }));
  const arenaThumb = (id) => {
    if (thumbs[id]) return thumbs[id];
    const a = arenas.find((x) => x.id === id);
    if (!a) return '';
    try { thumbs[id] = arenaThumbFor(a.recipe, a.seed, 192, 108).url; } catch (e) { thumbs[id] = ''; }
    return thumbs[id];
  };
  const props = {};
  for (const id of Object.keys(PROP_CATALOG)) props[id] = Object.assign({ id }, PROP_CATALOG[id]);
  const missions = [['marathon_sort_of', 'Marathon (Sort Of)'], ['thermopylae_snack', 'The 300 Slightly Overweight Spartans'], ['pyramid_scheme', 'Pyramid Scheme'], ['nile_crossing', 'Goat Across the Nile'], ['alps_elephant', 'Hannibal Ante Portas'], ['teutoburg_peekaboo', 'Teutoburg Hide and Seek'], ['troy_giftshop', 'Siege of Troy (Gift Shop Not Included)'], ['cyclops_meet', 'Cyclops Isle Meet-and-Greet'], ['zeus_bad_day', 'Zeus Has a Bad Day']]
    .map(([id, title], i) => ({ id, title, act: 1 + Math.floor(i / 3), index: i }));
  return {
    units, unitList, factions: FACTIONS, arenas, arenaThumb, props,
    campaign: { missions },
    humor: {
      tips: ['Spears beat cavalry. Cavalry beat archers. Archers beat everyone who stands still.', 'Chickens are not a strategy. They are, however, effective.'],
      names: { titles: ['Sir', 'Dame'], first: ['Chadius'], epithets: ['the Mildly Concerned'] },
      achievements: ACHIEVEMENTS.map(([id, name, desc, icon, target]) => ({ id, name, desc, icon, target })),
      announcer: [], killVerbs: ['bonked', 'perforated', 'yeeted'], settingsJokes: null,
    },
    parts: {},
    mutators: MUTATORS.map(([id, name, desc, stars]) => ({ id, name, desc, stars })),
    glossary: {},
    formations: FORMATIONS,
    customDef: (cs) => ({ id: cs.id, name: cs.name, role: cs.role || 'melee', cost: cs.cost || 100, faction: 'custom', tags: [], hp: 100, armor: 0.1, speed: 3, melee: { dmg: 12, cd: 1.1, range: 1.5 }, text: { blurb: 'Made in the Soldier Workshop.' } }),
  };
}

/* ------------------------------------------------------------------ save layer */
function collection(items) {
  const m = new Map(items.map((i) => [i.id, i]));
  return { list: () => Array.from(m.values()), get: (id) => m.get(id) || null, put: (it) => { if (!it.id) it.id = makeId('item'); m.set(it.id, it); return it; }, remove: (id) => m.delete(id), count: () => m.size };
}
export function buildSave(content, opts) {
  opts = opts || {};
  const st = { status: opts.storage || 'ok' };
  const progress = {
    data: { stars: { marathon_sort_of: 3, thermopylae_snack: 2, pyramid_scheme: 1 }, achievements: { first_victory: { at: Date.UTC(2026, 8, 30), n: 1 }, tourist: { n: 9 }, sparta: { n: 17 }, body_count: { n: 684 }, overachiever: { n: 6 }, blitz: { at: Date.UTC(2026, 9, 2), n: 1 }, main_character: { n: 12 }, chicken_dinner: { at: Date.UTC(2026, 9, 3), n: 10 }, landscaper: { at: Date.UTC(2026, 9, 4), n: 1 }, tipsy: { n: 0 } }, codex: { locked: ['cyclops', 'medusa', 'minotaur'] }, survivalBest: 7, dailyLast: '2026-10-05' },
    get(k) { return k === undefined ? progress.data : progress.data[k]; }, set(k, v) { progress.data[k] = v; }, list() { return Object.keys(progress.data).map((id) => ({ id })); }, remove(id) { delete progress.data[id]; },
    reset() { progress.data = { stars: {}, achievements: {}, codex: { locked: ['cyclops', 'medusa', 'minotaur', 'war_elephant'] } }; },
  };
  const stats = {
    totals: { battles: 58, wins: 41, losses: 15, draws: 2, kills: 684, deaths: 530, damage: 61234, playSeconds: 9420, shieldBlocks: 1190, kicks: 17, chickenKills: 41, goatsSaved: 2, elephantTramples: 9, godPowers: 63, zeusRageQuits: 1, arenasSaved: 2, soldiersSaved: 3, arenasPlayed: 9, drachmaeSpent: 301400, boulders: 212, arrows: 4802, unitsPlaced: 2310, commandKills: 12, campaignStars: 6, bestWave: 7, dailyStreak: 3 },
    get() { return stats.totals; },
  };
  const arenas = collection([{ id: 'ar_hill', name: 'Hill of Mild Inconvenience', author: 'You', desc: 'A hill. It is mildly inconvenient.', size: 'medium', thumb: content.arenaThumb('marathon') }, { id: 'ar_lake', name: 'Lake Lemon', author: 'You', desc: 'Lakeside brawls.', size: 'small', thumb: content.arenaThumb('oasis') }]);
  const soldiers = collection([{ id: 'cs_chad', name: 'Sir Chadius the Mildly Concerned', blueprint: { v: 1 }, stats: {}, role: 'melee', cost: 140 }, { id: 'cs_pan', name: 'Frying Pan Dave', blueprint: { v: 1 }, stats: {}, role: 'melee', cost: 95 }, { id: 'cs_olive', name: 'Olive Branch Olga', blueprint: { v: 1 }, stats: {}, role: 'support', cost: 120 }]);
  const armies = collection([{ id: 'army_phalanx', name: 'Big Phalanx Energy', n: 38, cost: 3900 }, { id: 'army_birds', name: 'Chicken Rain Insurance', n: 61, cost: 2400 }]);
  return {
    arenas, soldiers, armies, progress, stats,
    status: () => st.status, setStatus: (s) => { st.status = s; },
    exportAll: async () => JSON.stringify({ v: 1, settings: {}, arenas: arenas.list(), soldiers: soldiers.list(), armies: armies.list(), progress: progress.data }),
    importAll: async (x) => { const t = typeof x === 'string' ? x : await x.text(); let o; try { o = JSON.parse(t); } catch (e) { throw new Error('That does not look like VOXELWARS save data.'); } if (!o || o.v !== 1) throw new Error('Unknown save data version.'); return { imported: Object.keys(o).length }; },
  };
}

/* ------------------------------------------------------------------ turntable stand-in (2D iso voxel figure, rotates) */
function figureVoxels(def, factions) {
  const f = factions[def.faction] || { colors: [0x3b6cf0, 0xffc93c] };
  const hexC = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const prim = hexC(f.colors[0]), sec = hexC(f.colors[1]);
  const skin = [224, 172, 132], metal = [200, 170, 90], dark = [70, 60, 60], white = [240, 240, 235];
  const v = [];
  const box = (x0, y0, z0, w, hgt, d, c) => { for (let x = 0; x < w; x++) for (let y = 0; y < hgt; y++) for (let z = 0; z < d; z++) v.push([x0 + x, y0 + y, z0 + z, c]); };
  const role = def.role;
  if (role === 'cavalry' || def.tags.indexOf('cavalry') >= 0 || def.tags.indexOf('large') >= 0 && role !== 'monster') {
    const horse = def.tags.indexOf('large') >= 0 ? [140, 140, 150] : (def.id === 'camel_rider' ? [190, 150, 100] : white);
    box(-3, 2, -5, 6, 5, 10, horse); box(-2, 6, 4, 4, 5, 3, horse); box(-1, 11, 5, 2, 2, 3, horse);
    box(-3, 0, -5, 2, 2, 2, dark); box(1, 0, -5, 2, 2, 2, dark); box(-3, 0, 3, 2, 2, 2, dark); box(1, 0, 3, 2, 2, 2, dark);
    box(-3, 7, -2, 6, 1, 4, prim);
    box(-2, 8, -2, 4, 4, 3, prim); box(-1, 12, -2, 2, 2, 2, skin); box(-2, 14, -2, 4, 1, 4, sec);
    box(3, 8, 0, 1, 1, 8, metal);
  } else if (role === 'siege') {
    box(-5, 2, -4, 10, 2, 8, [150, 105, 60]); box(-6, 0, -5, 2, 4, 2, dark); box(4, 0, -5, 2, 4, 2, dark); box(-6, 0, 3, 2, 4, 2, dark); box(4, 0, 3, 2, 4, 2, dark);
    box(-1, 4, -2, 2, 8, 2, [120, 80, 45]); box(-1, 11, -6, 2, 2, 8, [120, 80, 45]); box(-2, 11, -8, 4, 3, 3, [120, 120, 125]);
    box(3, 4, 0, 2, 4, 2, prim);
  } else if (role === 'beast' || role === 'swarm') {
    const body = def.id === 'sacred_chicken' ? white : (def.id === 'battle_goat' ? [160, 160, 160] : [120, 100, 80]);
    box(-2, 2, -3, 4, 3, 6, body); box(-1, 4, 3, 2, 3, 2, body); box(-1, 6, 4, 2, 2, 2, def.id === 'sacred_chicken' ? [230, 70, 60] : body);
    box(-2, 0, -3, 1, 2, 1, dark); box(1, 0, -3, 1, 2, 1, dark); box(-2, 0, 2, 1, 2, 1, dark); box(1, 0, 2, 1, 2, 1, dark);
    box(-2, 4, -2, 4, 1, 3, prim);
    if (def.id === 'battle_goat') { box(-2, 7, 4, 1, 2, 1, white); box(1, 7, 4, 1, 2, 1, white); }
  } else {
    const big = role === 'monster' ? 1.6 : 1;
    const s = (n) => Math.round(n * big);
    box(-2, 0, -1, 2, s(5), 2, role === 'monster' ? [120, 90, 70] : prim); box(0, 0, -1, 2, s(5), 2, role === 'monster' ? [120, 90, 70] : prim);
    box(-3, s(5), -2, 6, s(5), 4, role === 'monster' ? [140, 100, 80] : prim);
    box(-2, s(5) + 1, -3, 4, 3, 1, sec);
    box(-2, s(10), -2, 4, 4, 4, skin);
    box(-3, s(10) + 3, -3, 6, 2, 6, role === 'hero' ? sec : metal);
    if (role === 'hero') box(-1, s(10) + 5, -3, 2, 2, 6, prim);
    box(-4, s(5), -1, 1, 4, 2, skin); box(3, s(5), -1, 1, 4, 2, skin);
    if (role === 'ranged') { box(4, s(5) + 1, 1, 1, 6, 1, [120, 80, 45]); box(4, s(5) + 6, 0, 1, 1, 3, [120, 80, 45]); }
    else if (role === 'support') { box(4, s(5), 0, 1, 11, 1, [120, 80, 45]); box(3, s(5) + 11, -1, 3, 3, 3, [255, 220, 80]); }
    else { box(4, s(5) - 1, 0, 1, 1, 14, [160, 120, 70]); box(4, s(5) - 1, 14, 1, 1, 2, [210, 210, 220]); if (def.shield) box(-7, s(5), -3, 1, 6, 6, sec); }
  }
  return v;
}
function mountTurntable(container, opts, ctxDefs, factions) {
  const def = ctxDefs[opts.unitId] || { role: 'melee', faction: 'hellenes', tags: [], id: 'x' };
  const vox = figureVoxels(def, factions);
  const cv = document.createElement('canvas');
  const size = opts.size || 240;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', (def.name || 'Unit') + ' turntable preview');
  container.appendChild(cv);
  let ang = 0.6, clip = opts.clip || 'idle', raf = 0, t0 = performance.now(), dragging = false, lastX = 0, dead = false;
  const draw = (now) => {
    if (dead) return;
    const t = (now - t0) / 1000;
    const rect = container.getBoundingClientRect();
    const w = Math.max(80, Math.round(rect.width || size)), hgt = Math.max(80, Math.round(rect.height || size));
    if (cv.width !== w * dpr || cv.height !== hgt * dpr) { cv.width = w * dpr; cv.height = hgt * dpr; }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, hgt);
    if (!dragging && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) && !document.documentElement.classList.contains('vw-reduce-motion')) ang += 0.012;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const sc = Math.min(w, hgt) / 34;
    const kind = /^(strike|shoot|throw|launch|kick)/.test(clip) ? 'attack' : /^block/.test(clip) ? 'block' : /^death/.test(clip) ? 'death' : clip;
    const bob = kind === 'idle' ? Math.sin(t * 2) * 0.3 : 0;
    const pts = vox.map(([x, y, z, c]) => {
      let yy = y + bob, xx = x, zz = z;
      if (kind === 'walk' && y < 3 && (def.role === 'melee' || def.role === 'ranged' || def.role === 'hero' || def.role === 'support')) zz += Math.sin(t * 7 + (x > 0 ? 3.14 : 0)) * 1.4;
      if (kind === 'attack' && x >= 4 && y >= 4) zz += Math.max(0, Math.sin(t * 6)) * 5;
      if (kind === 'block' && x <= -4) { zz -= 1; xx += 1.5; }
      if (kind === 'cast') yy += (y > 8 ? Math.abs(Math.sin(t * 4)) * 1.5 : 0);
      if (kind === 'death') { const k = Math.min(1, (t % 3) / 1.2); const fall = k * 1.5; yy = y * (1 - 0.8 * k) - 0 + 0; zz = z - y * 0.8 * k * fall; }
      const rx = xx * ca - zz * sa, rz = xx * sa + zz * ca;
      return { sx: w / 2 + (rx - rz * 0.0) * sc * 1.0 + rz * sc * 0.0, sy: hgt * 0.84 - yy * sc * 0.85 - rz * sc * 0.45, d: rz, c };
    }).sort((a, b) => b.d - a.d);
    const vs = sc * 0.98;
    for (const p of pts) {
      const [r, gg, b] = p.c;
      g.fillStyle = `rgb(${Math.min(255, r * 1.12) | 0},${Math.min(255, gg * 1.12) | 0},${Math.min(255, b * 1.12) | 0})`; g.fillRect(p.sx - vs / 2, p.sy - vs * 0.9, vs, vs * 0.4);
      g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(p.sx - vs / 2, p.sy - vs * 0.5, vs, vs * 0.6);
      g.fillStyle = `rgb(${(r * 0.72) | 0},${(gg * 0.72) | 0},${(b * 0.72) | 0})`; g.fillRect(p.sx - vs / 2, p.sy + vs * 0.05, vs, vs * 0.25);
    }
    // shadow
    g.fillStyle = 'rgba(20,22,58,.25)'; g.beginPath(); g.ellipse(w / 2, hgt * 0.88, sc * 7, sc * 2.2, 0, 0, 7); g.fill();
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  cv.addEventListener('pointerdown', (e) => { if (opts.interactive === false) return; dragging = true; lastX = e.clientX; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!dragging) return; ang += (e.clientX - lastX) * 0.02; lastX = e.clientX; });
  cv.addEventListener('pointerup', () => { dragging = false; cv.style.cursor = 'grab'; });
  return { setClip(c) { clip = c; t0 = performance.now(); }, setBlueprint() {}, destroy() { dead = true; cancelAnimationFrame(raf); cv.remove(); }, canvas: cv };
}

/* ------------------------------------------------------------------ the game controller stand-in */
export function buildGame(content, save, settings) {
  const em = {};
  const on = (ev, fn) => { (em[ev] || (em[ev] = [])).push(fn); return () => { em[ev] = (em[ev] || []).filter((f) => f !== fn); }; };
  const emit = (ev, p) => (em[ev] || []).slice().forEach((f) => f(p));
  const units = content.units;
  const CAP = () => ({ potato: 100, papyrus: 200, marble: 300, olympian: 400 }[settings.get('quality')] || 300);
  const G = {
    get setup() { return G._setup; },
    state: 'idle', paused: false, speed: 1, _setup: null, _brush: { mode: 'single', defId: null, team: 0, formation: 'block', count: 9, mirror: false, order: 'advance' }, _p: [[], []], _undo: [], _redo: [], _budget: [8000, 8000], _time: 0, log: [],
    newSetup(kind, preset) {
      const base = { kind, arena: { presetId: 'marathon', size: 'medium', seed: 1, env: {} }, rules: { budget: 8000, difficulty: 'normal', friendlyFire: false, morale: true, speed: 1, gore: 'red', corpses: 'fade', freePlacement: false, mirror: false, timeLimit: 0, weather: null, time: null, mood: 'auto', mutators: [], formation: 'block' }, armies: { A: { faction: 'hellenes', placements: [], budget: 8000 }, B: { faction: 'persians', placements: [], budget: 8000 } } };
      return Object.assign(base, preset || {});
    },
    async begin(setup) { G._setup = setup; G._budget = [setup.armies.A.budget || setup.rules.budget, setup.armies.B.budget || setup.rules.budget]; G._p = [[], []]; G._undo = []; G._redo = []; G.state = 'placement'; G.log.push('begin'); emit('placement', setup); emit('state', 'placement'); },
    fight() { G.log.push('fight'); G.state = 'countdown'; emit('state', 'countdown'); },
    pause(b) { G.paused = !!b; }, isPaused() { return G.paused; }, setSpeed(s) { G.speed = s; }, getSpeed() { return G.speed; },
    rematch() { G.log.push('rematch'); }, tweak() { G.log.push('tweak'); G.state = 'placement'; emit('state', 'placement'); }, exitToMenu() { G.log.push('exit'); G.state = 'idle'; emit('state', 'idle'); },
    tools: {
      setBrush(b) { Object.assign(G._brush, b); emit('brush', G._brush); }, brush() { return G._brush; },
      place(team, defId, n) { const def = units[defId]; if (!def) return false; const cost = def.cost * n; if (G.info.budget(team).left < cost) return false; for (let i = 0; i < n; i++) G._p[team].push({ defId, x: (i % 5) * 1.2 + (team ? 20 : -20), z: Math.floor(i / 5) * 1.2, heading: team ? Math.PI : 0 }); G._undo.push({ team, n }); G._redo = []; emit('placed', { team, defId, n }); emit('placement_changed'); return true; },
      undo() { const u = G._undo.pop(); if (!u) return; G._p[u.team].splice(-u.n); G._redo.push(u); emit('placement_changed'); }, redo() { const u = G._redo.pop(); if (!u) return; G._undo.push(u); for (let i = 0; i < u.n; i++) G._p[u.team].push({ defId: 'hoplite', x: 0, z: 0, heading: 0 }); emit('placement_changed'); },
      canUndo() { return G._undo.length > 0; }, canRedo() { return G._redo.length > 0; },
      clear(team) { if (team === undefined) { G._p = [[], []]; } else G._p[team] = []; G._undo = []; G._redo = []; emit('placement_changed'); },
      autoFill(team, o) {
        o = o || {};
        const target = Math.min(o.budget || G._budget[team], G._budget[team]);
        const pool = Object.keys(units).filter((id) => (!o.faction || o.faction === 'mixed' || units[id].faction === o.faction) && units[id].role !== 'monster' && units[id].cost <= target);
        let guard = 0;
        while (guard++ < 400) { const spent = G.info.budget(team).spent; const afford = pool.filter((id) => spent + units[id].cost <= target); if (!afford.length || G._p[team].length >= CAP()) break; const id = afford[(guard * 7 + team * 3) % afford.length]; G._p[team].push({ defId: id, x: 0, z: 0, heading: 0 }); }
        G._undo.push({ team, n: 1 }); emit('placement_changed');
      },
      saveArmy(name) { const it = { id: makeId('army'), name, n: G._p[0].length, cost: G._p[0].reduce((s, p) => s + units[p.defId].cost, 0), placements: clone(G._p[0]) }; save.armies.put(it); return it; },
      loadArmy(idOrData) { const a = typeof idOrData === 'string' ? save.armies.get(idOrData) : idOrData; if (!a) return false; G._p[G._brush.team] = a.placements ? clone(a.placements) : G._p[G._brush.team]; emit('placement_changed'); return true; },
      exportArmy() { return 'VW1.army.' + btoa(JSON.stringify(G._p[0].slice(0, 5))).replace(/=+$/, '') + '.0badc0de'; },
      importArmy(text) { if (typeof text === 'string' && !text.startsWith('VW1.army.')) throw new Error('This code is for something else, not an army.'); return true; },
    },
    info: {
      budget(team) { const spent = G._p[team].reduce((s, p) => s + (units[p.defId] ? units[p.defId].cost : 0), 0); const cap = G._budget[team]; return { spent, cap, left: cap - spent }; },
      counts(team) { const by = {}; for (const p of G._p[team]) by[p.defId] = (by[p.defId] || 0) + 1; const types = Object.keys(by); return { total: G._p[team].length, cap: CAP(), types: types.length, typeCap: 16, byType: types.map((d) => ({ defId: d, n: by[d] })) }; },
      validity(x, z) { if (z > 30) return 'In the enemy’s zone'; if (x > 40) return 'Underwater'; return null; },
      scout(team) {
        const by = {}; for (const p of G._p[team]) by[units[p.defId].role] = (by[units[p.defId].role] || 0) + 1;
        const n = G._p[team].length;
        if (!n) return [];
        const out = [];
        if (!by.ranged) out.push({ id: 'no_ranged', severity: 'weak', text: 'No ranged units. Your line has nothing to say at a distance.', counters: ['cretan_archer', 'peltast'] });
        if (!by.cavalry) out.push({ id: 'no_cav', severity: 'weak', text: 'No cavalry to chase archers or punish a flank.', counters: ['companion_cavalry'] });
        if (by.melee > n * 0.5) out.push({ id: 'melee_heavy', severity: 'strong', text: 'A solid wall of infantry. Cavalry will think twice.', counters: [] });
        out.push({ id: 'tip', severity: 'tip', text: 'Spears hold the line against a cavalry charge. Keep them in front.', counters: ['hoplite'] });
        return out;
      },
    },
    camera: { mode: 'orbit', setMode() {}, follow() {}, photo: async () => '' },
    select() {}, selected() { return null; }, hover() { return null; }, command() {}, cast() {}, possess() {}, godPowers() { return []; },
    hud() { G._time += 0.1; return { state: G.state, time: G._time, speed: G.speed, paused: G.paused, fps: 60, cam: 'orbit', teams: [{ team: 0, name: 'Blue', alive: 38, start: 40, cost: 3900, costStart: 4000, byType: [] }, { team: 1, name: 'Red', alive: 31, start: 40, cost: 3300, costStart: 4000, byType: [] }], objective: null, killfeed: [], announcer: null, selection: null, powers: [], orders: {}, countdown: 0, minimap: {} }; },
    on,
    results() { return { winner: 0, reason: 'elimination', time: 94, teams: [{ alive: 12, dead: 28, kills: 33, damage: 3411, lostCost: 2800 }, { alive: 0, dead: 40, kills: 28, damage: 3220, lostCost: 4000 }], mvp: { unit: { name: 'Hoplite #7' }, kills: 6, quote: 'Tell my shield I loved it.' }, funnyStats: [], lessons: [], canRematch: true, canNext: false }; },
  };
  return G;
}

/* ------------------------------------------------------------------ the app shell: router + ctx */
export function createMockApp(opts) {
  opts = opts || {};
  const registry = opts.registry || {};
  const content = buildContent();
  const store = Object.assign({}, DEFAULT_SETTINGS, clone(opts.settings || {}));
  const setEm = emitter();
  const settings = {
    get: (k) => store[k], set: (k, v) => { store[k] = v; setEm.emit(k, v); }, on: (fn) => setEm.on(fn), all: () => Object.assign({}, store),
  };
  const save = buildSave(content, { storage: opts.storage });
  const calls = { audio: [], toasts: [], downloads: [], clipboard: [], misc: [] };
  const audio = {
    play: (cue, o) => { calls.audio.push(cue); }, music: { setMood() {}, setIntensity() {} }, duck() {}, setVolume: (b, v) => { store['vol.' + b] = v; }, getVolume: (b) => store['vol.' + b], state: () => 'running',
    diagnostics: () => ({ loaded: { embedded: 38, fetched: 71, synth: 3, failed: 0 } }),
  };
  const modalFns = [];
  const platform = {
    downloads: opts.noDownloads ? null : { save: async (filename, data) => { calls.downloads.push({ filename, size: String(data).length }); return true; } },
    clipboard: async (text) => { calls.clipboard.push(text); return opts.clipboardFails ? false : true; },
    pickFile: async () => { const f = new File(['{"v":1}'], 'save.json', { type: 'application/json' }); return f; },
    isTouch: !!opts.touch, viewport: () => ({ w: window.innerWidth, h: window.innerHeight }), isPhone: () => (opts.phone !== undefined ? !!opts.phone : window.innerWidth < 640),
  };
  const diag = {
    log: [{ t: 12.1, level: 'info', msg: 'boot: three r128 from cdnjs' }, { t: 12.9, level: 'info', msg: 'audio: 38 embedded, 71 fetched' }, { t: 14.2, level: 'warn', msg: 'music: track "olympus_choir" fell back to synth' }],
    snapshot: () => ({
      webgl: { webgl2: true, renderer: 'ANGLE (SwiftShader Device, Vulkan 1.3)', vendor: 'Google Inc. (Google)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)', maxTexture: 8192 },
      perf: { tier: store.quality, fps: 58, ms: 17.2, drawCalls: 126, triangles: 884210, units: 140, heapMB: 112 },
      audio: { state: 'running', ctxState: 'running', codecs: { mp3: 'probably', ogg: 'probably', wav: 'probably' }, loaded: { embedded: 38, fetched: 71, synth: 3, failed: 0 }, assets: [{ id: 'hit_blade_1', path: 'embedded' }, { id: 'horn_war_1', path: 'fetched' }, { id: 'music_olympus', path: 'synth' }] },
      storage: { status: save.status(), bytes: 48211, keys: 6 },
      csp: opts.csp || [],
      log: diag.log,
      build: { version: '1.0.0', date: '2026-10-06' },
    }),
  };
  const game = buildGame(content, save, settings);
  const preview = {
    turntable: (container, o) => mountTurntable(container, o || {}, content.units, FACTIONS),
    arena: (canvas, arenaData, o) => { const r = arenaThumbFor(arenaData.recipe || arenaData.id || 'marathon', arenaData.seed || 1, (o && o.w) || 192, (o && o.h) || 108); return r.url; },
    paintView: () => null,
  };

  /* router */
  const stack = [];
  let cur = null, curMod = null, curId = '';
  const rootEl = () => document.getElementById('vw-root');
  function mountScreen(id, params) {
    const mod = registry[id];
    if (!mod) throw new Error('mock router: no screen module registered for "' + id + '"');
    if (cur) { try { cur.api.destroy(); } catch (e) { console.error('destroy failed', e); } cur.el.remove(); cur = null; }
    const el = document.createElement('div');
    el.className = 'vw-screen vw-screen--' + id;
    el.dataset.screen = id;
    rootEl().appendChild(el);
    if (opts.onScreen) opts.onScreen(mod.meta || { id }, el);
    const api = mod.mount(el, ctx, params || {}) || {};
    cur = { el, api, id, params };
    curMod = mod; curId = id;
    return api;
  }
  const nav = {
    goto(id, params) { if (curId) stack.push({ id: curId, params: cur && cur.params }); return mountScreen(id, params); },
    back() { const p = stack.pop(); if (p) mountScreen(p.id, p.params); else mountScreen(opts.home || 'title'); },
    current: () => curId,
    modal: (o) => import('./kit.js').then((K) => K.modal(o)),
    toast: (text, o) => { calls.toasts.push(text); import('./kit.js').then((K) => K.toast(text, o)); },
  };
  const ctx = { nav, settings, save, content, audio, preview, game, platform, diag, version: { build: '2026-10-06', date: '2026-10-06', version: '1.0.0' } };
  const app = {
    ctx, game, nav, calls, content, save, settings, store,
    goto(id, params) { stack.length = 0; curId = ''; return mountScreen(id, params); },
    current: () => cur,
    key(e) { if (cur && cur.api.onKey && cur.api.onKey(e)) return true; if ((e.key === 'Escape') && cur && cur.api.onBack) return !!cur.api.onBack(); return false; },
    destroy() { if (cur) { try { cur.api.destroy(); } catch (e) { /* ignore */ } cur.el.remove(); cur = null; } },
  };
  // Esc/key routing like the real shell: modal handler (kit) swallows Esc first; otherwise the screen gets onKey/onBack.
  window.addEventListener('keydown', (e) => { if (e.defaultPrevented) return; app.key(e); });
  return app;
}

export { UNIT_TEXT, ARENAS, ACHIEVEMENTS, MUTATORS, DEFAULT_KEYS };
