// The 24 achievements (spec/humor.md 5). Pure data + pure test functions (owner: HUMOR).
//
// test(stats, ev) -> boolean
//   stats: the LIFETIME stats object (src/save/stats.js), ALREADY updated with the battle that just finished. Shape: docs/lifetime_stats.md.
//   ev:    the event that triggered the check, or undefined/null for a plain re-check (profile screen, import).
//          Battle checks use  ev = { kind:'battle_end', win, draw, t, unitsStart, unitsLost, ... }  (BattleSummary, docs/lifetime_stats.md).
//          Tests that depend on a single battle return false when ev is not a battle_end, so a re-check can never grant them by accident.
//          Tests that depend only on lifetime totals ignore ev, so a re-check grants them correctly.
// icon: a generic icon id the UI maps to a silly glyph (lower_snake_case).

export const ARENA_IDS = ['marathon', 'thermopylae', 'colosseum', 'nile', 'giza', 'persepolis', 'carthage', 'teutoburg', 'alpine', 'olympus', 'troy', 'styx', 'cyclops', 'oasis'];
export const MISSION_IDS = ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'];

const isBattle = (ev) => !!ev && ev.kind === 'battle_end';
const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const map = (v) => (v && typeof v === 'object' ? v : {});

/** Total campaign stars across missions (0-27). Reads stats.campaign.stars = { missionId: 0..3 }. */
export function totalStars(stats = {}) {
  const s = map(map(stats.campaign).stars);
  let t = 0;
  for (const id of MISSION_IDS) t += Math.max(0, Math.min(3, n(s[id])));
  return t;
}

export const ACHIEVEMENTS = [
  {
    id: 'first_victory', icon: 'laurel', name: 'First Blood (Technically Second)',
    desc: 'Win a battle. Someone else bled first. We checked.',
    test: (stats = {}) => n(stats.wins) >= 1,
  },
  {
    id: 'goat_herder', icon: 'goat', name: 'Goat Herder',
    desc: 'Win Protect the Goat without a scratch on the goat. It will not thank you. It is a goat.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && ev.objective === 'protect_vip' && ev.vipDef === 'battle_goat' && n(ev.vipDamage) === 0,
  },
  {
    id: 'chicken_dinner', icon: 'drumstick', name: 'Winner Winner Chicken Dinner',
    desc: 'Win a battle in which your chickens got 10 kills. Serving suggestion: humility.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && n(map(ev.killsByDef).sacred_chicken) >= 10,
  },
  {
    id: 'sparta', icon: 'boot', name: 'THIS IS... A LOT OF KICKS',
    desc: 'Kick 25 enemies, lifetime. Doctors call it a calf problem.',
    test: (stats = {}) => n(stats.kicks) >= 25,
  },
  {
    id: 'et_tu', icon: 'dagger', name: 'Et Tu, Brute?',
    desc: 'Kill five of your own soldiers in one battle. The Senate calls it a stern review.',
    test: (stats = {}, ev = null) => isBattle(ev) && n(ev.friendlyKills) >= 5,
  },
  {
    id: 'trunk_show', icon: 'elephant', name: 'Trunk Show',
    desc: 'An elephant tramples 20 soldiers in one battle. It calls this a stroll.',
    test: (stats = {}, ev = null) => isBattle(ev) && n(ev.elephantTrampleKills) >= 20,
  },
  {
    id: 'depth_perception', icon: 'eye', name: 'Depth Perception Optional',
    desc: 'Watch a Cyclops miss five throws. He is trying. He has one eye.',
    test: (stats = {}) => n(stats.cyclopsMisses) >= 5,
  },
  {
    id: 'cogito', icon: 'scroll', name: 'Cogito, Ergo Won',
    desc: 'Win with only philosophers standing. They are already writing it up.',
    test: (stats = {}, ev = null) => {
      if (!isBattle(ev) || !ev.win) return false;
      const alive = map(ev.aliveDefs);
      const ids = Object.keys(alive).filter((k) => n(alive[k]) > 0);
      return ids.length > 0 && ids.every((k) => k === 'philosopher');
    },
  },
  {
    id: 'not_so_immortal', icon: 'phoenix', name: 'Not So Immortal',
    desc: 'Kill an Immortal who has already died once. It says once. It always said once.',
    test: (stats = {}) => n(stats.immortalsKilledAfterRevive) >= 1,
  },
  {
    id: 'gift_shop', icon: 'gift', name: 'Gift Shop Manager',
    desc: 'Reveal a Trojan Horse, then win. Exit through the gift shop.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && !!ev.trojanRevealed,
  },
  {
    id: 'stone_cold', icon: 'statue', name: 'Stone Cold',
    desc: 'Turn 15 soldiers to stone in one battle. Art class, but worse.',
    test: (stats = {}, ev = null) => isBattle(ev) && n(ev.stonedUnits) >= 15,
  },
  {
    id: 'dino_retirement', icon: 'meteor', name: 'Dinosaur Retirement Plan',
    desc: 'Kill 30 soldiers with one meteor. The dinosaurs feel represented.',
    test: (stats = {}, ev = null) => isBattle(ev) && n(ev.maxMeteorKills) >= 30,
  },
  {
    id: 'tipsy', icon: 'wine', name: 'Wine Not?',
    desc: 'Win a battle during wine rain. Nobody was sober. Everybody was brave.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && !!ev.wineRain,
  },
  {
    id: 'perfect_phalanx', icon: 'phalanx', name: 'Perfect Phalanx',
    desc: 'Win with 20 or more units and lose none. The shields will not stop mentioning it.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && n(ev.unitsStart) >= 20 && n(ev.unitsLost) === 0,
  },
  {
    id: 'underpaid', icon: 'coins', name: 'Underpaid, Overperforming',
    desc: 'Beat an army that cost five times yours. Ask for a raise.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && n(ev.playerCostStart) > 0 && n(ev.enemyCostStart) >= 5 * n(ev.playerCostStart),
  },
  {
    id: 'blitz', icon: 'lightning', name: 'Blitzkrieg (Anachronistic)',
    desc: 'Win in under 30 seconds. About 2,400 years early.',
    test: (stats = {}, ev = null) => isBattle(ev) && !!ev.win && n(ev.t) > 0 && n(ev.t) < 30,
  },
  {
    id: 'zeus_left', icon: 'storm_cloud', name: 'Zeus Has Left The Chat',
    desc: 'Be so dull that Zeus quits in a huff. Technically a draw. Spiritually a review.',
    test: (stats = {}) => n(stats.zeusRagequits) >= 1,
  },
  {
    id: 'landscaper', icon: 'shovel', name: 'Landscaper',
    desc: 'Save a custom arena. Landscaping, but with more cliffs and fewer permits.',
    test: (stats = {}) => n(stats.arenasSaved) >= 1,
  },
  {
    id: 'soldier_smith', icon: 'anvil', name: 'Soldier Smith',
    desc: 'Save a custom soldier. Please name him something dignified. Not Steve.',
    test: (stats = {}) => n(stats.soldiersSaved) >= 1,
  },
  {
    id: 'tourist', icon: 'map', name: 'Tourist Trap',
    desc: 'Fight on all fourteen arenas. The gift shops were closed.',
    test: (stats = {}) => { const a = map(stats.arenasPlayed); return ARENA_IDS.every((id) => n(a[id]) > 0); },
  },
  {
    id: 'ancient_history', icon: 'column', name: 'Ancient History',
    desc: 'Finish the campaign. Everything in it is ancient history, including your excuses.',
    test: (stats = {}) => !!map(stats.campaign).completed || MISSION_IDS.every((id) => n(map(map(stats.campaign).stars)[id]) >= 1),
  },
  {
    id: 'overachiever', icon: 'star', name: 'Overachiever',
    desc: 'Earn every campaign star. All 27. Please go outside.',
    test: (stats = {}) => totalStars(stats) >= 27,
  },
  {
    id: 'body_count', icon: 'skull', name: 'Body Count Is Not A Hobby',
    desc: 'Reach 1,000 lifetime kills. It is a hobby. We are not judging.',
    test: (stats = {}) => n(stats.kills) >= 1000,
  },
  {
    id: 'main_character', icon: 'crown', name: 'Main Character Energy',
    desc: 'Get 20 kills in a single battle while in Take Command. The camera adores you.',
    test: (stats = {}, ev = null) => isBattle(ev) && n(ev.takeCommandKills) >= 20,
  },
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);
export function getAchievement(id) { return ACHIEVEMENTS.find((a) => a.id === id) || null; }

/** Ids of achievements newly satisfied by (stats, ev), skipping ids already unlocked (array or object map). */
export function checkAchievements(stats, ev, unlocked) {
  const have = Array.isArray(unlocked) ? new Set(unlocked) : new Set(Object.keys(unlocked || {}));
  const out = [];
  for (const a of ACHIEVEMENTS) { if (have.has(a.id)) continue; let ok = false; try { ok = !!a.test(stats || {}, ev || null); } catch (e) { ok = false; } if (ok) out.push(a.id); }
  return out;
}

export { KILL_VERBS, CAUSES, killVerb, killSolo, killFeedText } from './killverbs.js';
