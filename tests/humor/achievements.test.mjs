// Achievement tests (H3): all 24 have working pure tests against the documented stats shape (docs/lifetime_stats.md). Run: node tests/humor/achievements.test.mjs
import assert from 'node:assert';
import { ACHIEVEMENTS, ARENA_IDS, MISSION_IDS, checkAchievements, getAchievement, totalStars } from '../../src/content/era_ancient/humor/achievements.js';

let checks = 0;
const failures = [];
const ok = (cond, msg) => { checks++; if (!cond) failures.push(msg); };
const battle = (o) => Object.assign({ kind: 'battle_end', win: true, draw: false, reason: 'elimination', t: 90, unitsStart: 30, unitsLost: 5, unitsAlive: 25, aliveDefs: { hoplite: 20 }, killsByDef: {}, friendlyKills: 0, playerCostStart: 3000, enemyCostStart: 3000 }, o || {});
const T = (id, stats, ev) => getAchievement(id).test(stats || {}, ev || null);

// first_victory: lifetime wins
ok(T('first_victory', { wins: 1 }) && !T('first_victory', { wins: 0 }), 'first_victory');
// goat_herder
ok(T('goat_herder', {}, battle({ objective: 'protect_vip', vipDef: 'battle_goat', vipDamage: 0 })), 'goat_herder positive');
ok(!T('goat_herder', {}, battle({ objective: 'protect_vip', vipDef: 'battle_goat', vipDamage: 3 })), 'goat_herder hurt goat');
ok(!T('goat_herder', {}, battle({ objective: 'protect_vip', vipDef: 'strategos', vipDamage: 0 })), 'goat_herder wrong vip');
ok(!T('goat_herder', {}, battle({ win: false, objective: 'protect_vip', vipDef: 'battle_goat', vipDamage: 0 })), 'goat_herder loss');
// chicken_dinner
ok(T('chicken_dinner', {}, battle({ killsByDef: { sacred_chicken: 10 } })) && !T('chicken_dinner', {}, battle({ killsByDef: { sacred_chicken: 9 } })) && !T('chicken_dinner', {}, battle({ win: false, killsByDef: { sacred_chicken: 30 } })), 'chicken_dinner');
// sparta
ok(T('sparta', { kicks: 25 }) && !T('sparta', { kicks: 24 }), 'sparta');
// et_tu
ok(T('et_tu', {}, battle({ friendlyKills: 5 })) && !T('et_tu', {}, battle({ friendlyKills: 4 })) && T('et_tu', {}, battle({ win: false, friendlyKills: 6 })), 'et_tu (win not required)');
// trunk_show
ok(T('trunk_show', {}, battle({ elephantTrampleKills: 20 })) && !T('trunk_show', {}, battle({ elephantTrampleKills: 19 })), 'trunk_show');
// depth_perception
ok(T('depth_perception', { cyclopsMisses: 5 }) && !T('depth_perception', { cyclopsMisses: 4 }), 'depth_perception');
// cogito
ok(T('cogito', {}, battle({ aliveDefs: { philosopher: 3 } })), 'cogito positive');
ok(!T('cogito', {}, battle({ aliveDefs: { philosopher: 3, hoplite: 1 } })) && !T('cogito', {}, battle({ aliveDefs: {} })) && !T('cogito', {}, battle({ win: false, aliveDefs: { philosopher: 3 } })), 'cogito negatives');
ok(T('cogito', {}, battle({ aliveDefs: { philosopher: 2, hoplite: 0 } })), 'cogito ignores zero counts');
// not_so_immortal
ok(T('not_so_immortal', { immortalsKilledAfterRevive: 1 }) && !T('not_so_immortal', { immortalsRevived: 9 }), 'not_so_immortal');
// gift_shop
ok(T('gift_shop', {}, battle({ trojanRevealed: true })) && !T('gift_shop', {}, battle({ trojanRevealed: false })) && !T('gift_shop', {}, battle({ win: false, trojanRevealed: true })), 'gift_shop');
// stone_cold
ok(T('stone_cold', {}, battle({ stonedUnits: 15 })) && !T('stone_cold', {}, battle({ stonedUnits: 14 })), 'stone_cold');
// dino_retirement
ok(T('dino_retirement', {}, battle({ maxMeteorKills: 30 })) && !T('dino_retirement', {}, battle({ maxMeteorKills: 29 })), 'dino_retirement');
// tipsy
ok(T('tipsy', {}, battle({ wineRain: true })) && !T('tipsy', {}, battle({ wineRain: false })) && !T('tipsy', {}, battle({ win: false, wineRain: true })), 'tipsy');
// perfect_phalanx
ok(T('perfect_phalanx', {}, battle({ unitsStart: 20, unitsLost: 0 })) && !T('perfect_phalanx', {}, battle({ unitsStart: 19, unitsLost: 0 })) && !T('perfect_phalanx', {}, battle({ unitsStart: 40, unitsLost: 1 })), 'perfect_phalanx');
// underpaid
ok(T('underpaid', {}, battle({ playerCostStart: 1000, enemyCostStart: 5000 })) && !T('underpaid', {}, battle({ playerCostStart: 1000, enemyCostStart: 4999 })) && !T('underpaid', {}, battle({ win: false, playerCostStart: 1000, enemyCostStart: 9000 })) && !T('underpaid', {}, battle({ playerCostStart: 0, enemyCostStart: 9000 })), 'underpaid');
// blitz
ok(T('blitz', {}, battle({ t: 29.9 })) && !T('blitz', {}, battle({ t: 30 })) && !T('blitz', {}, battle({ t: 12, win: false })), 'blitz');
// zeus_left
ok(T('zeus_left', { zeusRagequits: 1 }) && !T('zeus_left', { zeusRagequits: 0 }), 'zeus_left');
// landscaper, soldier_smith
ok(T('landscaper', { arenasSaved: 1 }) && !T('landscaper', {}) && T('soldier_smith', { soldiersSaved: 1 }) && !T('soldier_smith', {}), 'landscaper / soldier_smith');
// tourist
{ const all = {}; for (const id of ARENA_IDS) all[id] = 1; ok(ARENA_IDS.length === 14 && T('tourist', { arenasPlayed: all }), 'tourist positive'); const missing = Object.assign({}, all); delete missing.styx; ok(!T('tourist', { arenasPlayed: missing }) && !T('tourist', {}), 'tourist negatives'); }
// ancient_history
{ const stars = {}; for (const id of MISSION_IDS) stars[id] = 1; ok(MISSION_IDS.length === 9 && T('ancient_history', { campaign: { stars } }) && T('ancient_history', { campaign: { completed: true } }), 'ancient_history positive'); delete stars.zeus_bad_day; ok(!T('ancient_history', { campaign: { stars } }) && !T('ancient_history', {}), 'ancient_history negatives'); }
// overachiever
{ const full = {}; for (const id of MISSION_IDS) full[id] = 3; ok(totalStars({ campaign: { stars: full } }) === 27 && T('overachiever', { campaign: { stars: full } }), 'overachiever positive'); full.cyclops_meet = 2; ok(!T('overachiever', { campaign: { stars: full } }) && totalStars({ campaign: { stars: { marathon_sort_of: 9 } } }) === 3, 'overachiever clamps and negatives'); }
// body_count
ok(T('body_count', { kills: 1000 }) && !T('body_count', { kills: 999 }), 'body_count');
// main_character
ok(T('main_character', {}, battle({ takeCommandKills: 20 })) && !T('main_character', {}, battle({ takeCommandKills: 19 })), 'main_character');

// battle-only achievements never unlock from a plain re-check (ev missing or of another kind)
for (const id of ['goat_herder', 'chicken_dinner', 'et_tu', 'trunk_show', 'cogito', 'gift_shop', 'stone_cold', 'dino_retirement', 'tipsy', 'perfect_phalanx', 'underpaid', 'blitz', 'main_character']) {
  ok(!getAchievement(id).test({ wins: 99, kills: 99999 }, null) && !getAchievement(id).test({}, { kind: 'arena_saved' }), id + ' ignores non-battle checks');
}
// tests are pure and tolerate junk
for (const a of ACHIEVEMENTS) { let threw = false; try { a.test(undefined, undefined); a.test({ kicks: 'x', campaign: 5, arenasPlayed: null }, { kind: 'battle_end', aliveDefs: null, killsByDef: 7 }); } catch (e) { threw = true; } ok(!threw, a.id + ' tolerates junk input'); }
// checkAchievements skips unlocked ones
{ const got = checkAchievements({ wins: 3, kills: 1200, kicks: 30 }, null, ['first_victory']); ok(got.includes('body_count') && got.includes('sparta') && !got.includes('first_victory'), 'checkAchievements skips unlocked: ' + got.join()); }
ok(new Set(ACHIEVEMENTS.map((a) => a.icon)).size >= 20, 'icons are mostly distinct');

if (failures.length) { console.error(failures.join('\n')); console.error(`achievement tests: ${failures.length} FAILED of ${checks}`); process.exit(1); }
assert.strictEqual(failures.length, 0);
console.log(`achievement tests: ${checks} checks passed`);
