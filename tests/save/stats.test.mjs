// LifetimeStats: replay a synthetic event stream and check every key of docs/lifetime_stats.md, the BattleSummary, the achievement hand-off,
// negative controls (friendly kills excluded, side swap for playerTeam 1) and persistence. Run: node tests/save/stats.test.mjs
import assert from 'node:assert/strict';
import { LifetimeStats, normalizeStats, storeAdapter, STAT_KEYS, HANDLED_EVENTS, ALIASES } from '../../src/save/stats.js';
import { checkAchievements, ACHIEVEMENTS } from '../../src/content/era_ancient/humor/achievements.js';
import { Store } from '../../src/save/store.js';

const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

/** A tiny battle script. `pt` = player team; `me`/`foe` are the team numbers so the same script can be replayed with the sides swapped. */
function script(pt) {
  const me = pt, foe = 1 - pt;
  const ev = []; let t = 0; const E = (type, p, dt = 0) => { t += dt; ev.push([type, p, t]); };
  // placement: 3 of ours (hoplite x2, chicken), 2 of theirs; one of ours is erased before the fight (not in the roster)
  E('unit_spawn', { id: 1, team: me, def: 'hoplite', x: 0, z: 0 });
  E('unit_spawn', { id: 2, team: me, def: 'hoplite', x: 0, z: 1 });
  E('unit_spawn', { id: 3, team: me, def: 'sacred_chicken', x: 0, z: 2 });
  E('unit_spawn', { id: 9, team: me, def: 'archer_erased', x: 0, z: 3 });
  E('unit_spawn', { id: 4, team: foe, def: 'immortal', x: 9, z: 0 });
  E('unit_spawn', { id: 5, team: foe, def: 'hoplite', x: 9, z: 1 });
  E('unit_spawn', { id: 6, team: me, def: 'war_elephant', x: 0, z: 4 });
  E('unit_spawn', { id: 7, team: foe, def: 'sacred_chicken', x: 9, z: 4 });
  const roster = [[1, me, 'hoplite'], [2, me, 'hoplite'], [3, me, 'sacred_chicken'], [6, me, 'war_elephant'], [4, foe, 'immortal'], [5, foe, 'hoplite'], [7, foe, 'sacred_chicken']];
  E('battle_start', { teams: [{ team: 0, count: 0, cost: 0 }, { team: 1, count: 0, cost: 0 }].map((x) => (x.team === me ? { team: me, count: 4, cost: 700 } : { team: foe, count: 3, cost: 3500 })) }, 3);
  const K = (o) => Object.assign({ src: 0, dst: 0, srcDef: '', dstDef: '', srcTeam: -1, dstTeam: -1, friendly: false, byPlayer: false, revived: false, cause: 'melee', x: 0, y: 0, z: 0 }, o);
  E('unit_hit', { src: 1, dst: 4, dmg: 12 }, 1);
  E('unit_block', { src: 4, dst: 1, kind: 'melee' }, 0.1);              // ours blocked
  E('unit_block', { src: 1, dst: 4, kind: 'melee' }, 0.1);              // theirs blocked (not counted)
  E('projectile_launch', { kind: 'arrow', team: me, id: 1 }, 0.1); E('projectile_launch', { kind: 'arrow', team: foe, id: 2 }, 0.1); E('projectile_launch', { kind: 'javelin', team: me, id: 3 }, 0.1);
  E('explosion', { kind: 'boulder', x: 0, y: 0, z: 0, r: 3 }, 0.1); E('explosion', { kind: 'lightning', x: 0, y: 0, z: 0, r: 3 }, 0.1);
  E('ability_cast', { id: 1, ability: 'kick', x: 0, z: 0, team: me }, 1); E('ability_cast', { id: 1, ability: 'kick', x: 0, z: 0, team: me }, 0.1); E('ability_cast', { id: 4, ability: 'kick', x: 0, z: 0, team: foe }, 0.1); E('ability_cast', { id: 1, ability: 'charge', x: 0, z: 0, team: me }, 0.1);
  // kills: ours: melee x2 (one by the chicken, one while possessed), trample by the elephant, aoe; friendly kill of our own hoplite by us; their kill of ours
  E('unit_kill', K({ src: 1, dst: 5, srcDef: 'hoplite', dstDef: 'hoplite', srcTeam: me, dstTeam: foe, cause: 'melee', byPlayer: true }), 1);
  E('unit_kill', K({ src: 3, dst: 7, srcDef: 'sacred_chicken', dstDef: 'sacred_chicken', srcTeam: me, dstTeam: foe, cause: 'melee' }), 1);
  E('unit_kill', K({ src: 6, dst: 5, srcDef: 'war_elephant', dstDef: 'hoplite', srcTeam: me, dstTeam: foe, cause: 'trample' }), 1);
  E('unit_kill', K({ src: 6, dst: 5, srcDef: 'war_elephant', dstDef: 'hoplite', srcTeam: me, dstTeam: foe, cause: 'trample' }), 0.1);
  E('unit_kill', K({ src: 2, dst: 1, srcDef: 'hoplite', dstDef: 'hoplite', srcTeam: me, dstTeam: me, friendly: true, cause: 'melee' }), 1);          // NEGATIVE: friendly kill, not a kill
  E('unit_kill', K({ src: 4, dst: 2, srcDef: 'immortal', dstDef: 'hoplite', srcTeam: foe, dstTeam: me, cause: 'melee' }), 1);                          // our loss (not our kill)
  E('unit_kill', K({ src: 5, dst: 4, srcDef: 'hoplite', dstDef: 'immortal', srcTeam: foe, dstTeam: foe, friendly: true, cause: 'melee' }), 0.1);      // NEGATIVE: enemy friendly fire
  E('unit_kill', K({ src: 0, dst: 3, srcDef: '', dstDef: 'sacred_chicken', srcTeam: -1, dstTeam: me, cause: 'lava' }), 0.1);                           // environment kills one of ours
  E('unit_kill', K({ src: 1, dst: 4, srcDef: 'hoplite', dstDef: 'immortal', srcTeam: me, dstTeam: foe, cause: 'melee', revived: true }), 0.1);        // immortal killed after revive
  // meteor: our cast, 3 enemy kills in its window near it, 1 outside the radius
  E('god_power', { kind: 'meteor', x: 5, z: 5, team: me }, 1);
  E('unit_kill', K({ src: 0, dst: 11, srcDef: '', dstDef: 'hoplite', srcTeam: -1, dstTeam: foe, cause: 'aoe', x: 5, z: 6 }), 0.05);
  E('unit_kill', K({ src: 0, dst: 12, srcDef: '', dstDef: 'hoplite', srcTeam: -1, dstTeam: foe, cause: 'aoe', x: 6, z: 5 }), 0);
  E('unit_kill', K({ src: 0, dst: 13, srcDef: '', dstDef: 'hoplite', srcTeam: -1, dstTeam: foe, cause: 'fire', x: 4, z: 5 }), 1);
  E('unit_kill', K({ src: 0, dst: 14, srcDef: '', dstDef: 'hoplite', srcTeam: -1, dstTeam: foe, cause: 'aoe', x: 40, z: 40 }), 0);
  E('unit_kill', K({ src: 0, dst: 15, srcDef: '', dstDef: 'hoplite', srcTeam: -1, dstTeam: me, cause: 'aoe', x: 5, z: 5 }), 0);                       // our own unit under the meteor: not counted
  // a goat kill and the lightning / zeus bits
  E('unit_kill', K({ src: 8, dst: 16, srcDef: 'battle_goat', dstDef: 'hoplite', srcTeam: me, dstTeam: foe, cause: 'gore' }), 0.1);
  E('god_power', { kind: 'zeus_lightning', x: 0, z: 0, team: me }, 1); E('god_power', { kind: 'zeus_lightning', x: 0, z: 0, team: me }, 1); E('god_power', { kind: 'wine_rain', x: 0, z: 0, team: me }, 0.1);
  E('god_power', { kind: 'meteor', x: 0, z: 0, team: foe }, 0.1);                                                                                      // NEGATIVE: not ours
  E('intervention', { kind: 'zeus' }, 1); E('intervention', { kind: 'goat' }, 0.1);
  // heroes, streaks, gags
  E('hero_down', { id: 4, def: 'xerxes', team: foe }, 1); E('hero_down', { id: 1, def: 'leonidas', team: me }, 0.1);
  E('kill_streak', { id: 1, count: 5, def: 'hoplite' }, 1); E('kill_streak', { id: 1, count: 10, def: 'hoplite' }, 0.1); E('kill_streak', { id: 4, count: 20, def: 'immortal' }, 0.1);   // the enemy's 20 is not ours
  E('chicken_tantrum', { id: 3 }, 1); E('chicken_tantrum', { id: 7 }, 0.1);
  E('philosopher_monologue', { id: 2 }, 0.1); E('status_apply', { id: 2, status: 'sleep' }, 0.1); E('status_apply', { id: 2, status: 'burn' }, 0.1); E('status_apply', { id: 4, status: 'sleep' }, 0.1);
  E('unit_convert', { id: 5, team: me }, 0.1); E('trojan_reveal', { id: 20, x: 0, z: 0, count: 6 }, 0.1); E('cyclops_misaim', { id: 21 }, 0.1); E('cyclops_misaim', { id: 21 }, 0.1);
  E('catapult_misfire', { id: 22 }, 0.1); E('unit_revive', { id: 4 }, 0.1); E('throne_sit', { id: 23, x: 0, z: 0, sitting: 1 }, 0.1); E('throne_sit', { id: 23, x: 0, z: 0, sitting: 0 }, 0.1);
  E('stone_gaze', { src: 1, count: 4 }, 0.1); E('stone_gaze', { src: 4, count: 7 }, 0.1);                                                                // the second gaze is the enemy's
  E('unit_rout', { id: 2, team: me }, 0.1); E('unit_rout', { id: 5, team: foe }, 0.1); E('wave_spawn', { n: 3, count: 10 }, 0.1); E('wave_spawn', { n: 2, count: 10 }, 0.1);
  E('battle_end', { winner: me, reason: 'elimination', t: 91.5, stats: [{ damageDealt: 0, startCount: 0, startCost: 0 }, { damageDealt: 0, startCount: 0, startCost: 0 }].map((x, i) => (i === me ? { damageDealt: 410, startCount: 4, startCost: 700, aliveCost: 500 } : { damageDealt: 99, startCount: 3, startCost: 3500, aliveCost: 0 })), perDef: [0, 1].map((i) => (i === me ? { hoplite: 1, war_elephant: 1 } : {})) }, 2);
  return { ev, roster, pt, me, foe };
}
const asMap = (me, a, b) => (me === 0 ? [a, b] : [b, a]);

function replay(pt, opts = {}) {
  const sink = []; const stats = new LifetimeStats({ adapter: { load: () => opts.initial || null, save: (o) => { sink.push(o); } }, debounceMs: 0 });
  stats.beginBattle({ playerTeam: pt, arenaId: opts.arenaId === undefined ? 'colosseum' : opts.arenaId, mission: null, objective: opts.objective || null, mutators: opts.mutators || [], getVip: opts.getVip });
  const s = script(pt); const out = [];
  for (const [type, p, t] of s.ev) { const r = stats.onEvent(type, p, { t, roster: type === 'battle_start' ? s.roster : undefined }); if (r) out.push([type, r]); }
  return { stats, sink, out };
}

for (const pt of [0, 1]) {                                  // the same script from either side: the totals must be identical (side swap negative control)
  const { stats, sink, out } = replay(pt);
  const g = stats.get();
  const where = ` (playerTeam ${pt})`;
  // battle level
  assert.equal(g.battles, 1, 'battles' + where); assert.equal(g.wins, 1); assert.equal(g.losses, undefined); assert.equal(g.draws, undefined);
  assert.equal(g.playSeconds, 91.5);
  // kills: hoplite(melee), chicken, trample x2, immortal(after revive), goat, 3 in meteor window + 1 outside the radius = 9; the 'lava'/friendly/enemy ones are not ours
  assert.equal(g.kills, 6, 'kills' + where);
  assert.equal(g.unitsLost, 4, 'unitsLost: friendly-killed hoplite, enemy kill, lava chicken, meteor friendly fire' + where);
  assert.equal(g.friendlyKills, 1, 'friendlyKills (ours only)');
  assert.deepEqual(g.byCause, { melee: 3, trample: 2, gore: 1 }, 'byCause: our kills only; environment and god-power kills have no source unit');
  assert.equal(g.kicks, 2, 'kicks (ours only)');
  assert.equal(g.chickenKills, 1); assert.equal(g.goatKills, 1);
  assert.equal(g.chickenTantrums, 2); assert.equal(g.monologues, 1); assert.equal(g.sleeps, 2); assert.equal(g.bribes, 1); assert.equal(g.trojanReveals, 1);
  assert.equal(g.cyclopsMisses, 2); assert.equal(g.catapultMisfires, 1); assert.equal(g.immortalsRevived, 1); assert.equal(g.immortalsKilledAfterRevive, 1);
  assert.equal(g.thronesSat, 1, 'a throne sit counts once (sitting flag)'); assert.equal(g.zeusInterventions, 1);
  assert.equal(g.zeusRagequits, undefined, 'a win is not a Zeus ragequit');
  assert.deepEqual(g.godPowers, { meteor: 1, zeus_lightning: 2, wine_rain: 1 }, 'god powers: ours only');
  assert.equal(g.stoned, 4, 'stoned: the enemy medusa does not count');
  assert.equal(g.trampleKills, 2); assert.equal(g.heroKills, 1); assert.equal(g.heroLosses, 1);
  assert.equal(g.maxStreak, 10, "maxStreak: the enemy's 20 does not count"); assert.equal(g.takeCommandKills, 1);
  assert.equal(g.chickenDefeats, undefined, 'we won');
  // UI aliases and extras the UI reads
  assert.equal(g.zeusRageQuits, g.zeusRagequits); assert.equal(g.commandKills, g.takeCommandKills); assert.equal(g.deaths, g.unitsLost);
  assert.equal(g.bestWave, 3); assert.equal(g.shieldBlocks, 1); assert.equal(g.arrows, 2); assert.equal(g.boulders, 1); assert.equal(g.damage, 410); assert.equal(g.drachmaeSpent, 700); assert.equal(g.elephantTramples, 2);
  // roster-based counts: the erased archer never existed
  assert.equal(g.unitsPlaced, 4, 'unitsPlaced counts the roster at battle_start, not erased placements');
  assert.deepEqual(g.byDef.hoplite, { spawned: 2, kills: 2, deaths: 3 }, 'byDef.hoplite' + where);
  assert.deepEqual(g.byDef.war_elephant, { spawned: 1, kills: 2, deaths: 0 });
  assert.equal(g.byDef.sacred_chicken.kills, 1); assert.equal(g.byDef.sacred_chicken.deaths, 1); assert.equal(g.byDef.battle_goat.kills, 1);
  assert.equal(g.byDef.archer_erased, undefined);
  assert.deepEqual(g.arenasPlayed, { colosseum: 1 }, 'arenasPlayed counted once at battle_start');
  // BattleSummary
  const S = stats.summary();
  assert.equal(S.kind, 'battle_end'); assert.equal(S.win, true); assert.equal(S.draw, false); assert.equal(S.reason, 'elimination'); assert.equal(S.t, 91.5); assert.equal(S.playerTeam, pt);
  assert.equal(S.arenaId, 'colosseum'); assert.equal(S.mission, null); assert.equal(S.objective, null); assert.equal(S.vipDef, null); assert.equal(S.vipDamage, 0);
  assert.equal(S.unitsStart, 4); assert.equal(S.unitsLost, 4); assert.equal(S.unitsAlive, 2); assert.deepEqual(S.aliveDefs, { hoplite: 1, war_elephant: 1 });
  assert.equal(S.playerCostStart, 700); assert.equal(S.enemyCostStart, 3500); assert.equal(S.kills, 6); assert.equal(S.friendlyKills, 1);
  assert.deepEqual(S.killsByDef, { hoplite: 2, sacred_chicken: 1, war_elephant: 2, battle_goat: 1 }); assert.deepEqual(S.killsByCause, g.byCause);
  assert.equal(S.elephantTrampleKills, 2); assert.equal(S.stonedUnits, 4); assert.equal(S.cyclopsMisses, 2); assert.equal(S.kicks, 2); assert.equal(S.maxMeteorKills, 3, 'meteor: 3 enemy kills in the window and radius');
  assert.equal(S.trojanRevealed, true); assert.equal(S.wineRain, true, 'wine rain power was cast'); assert.equal(S.takeCommandKills, 1);
  for (const k of ['kind', 'win', 'draw', 'reason', 't', 'playerTeam', 'arenaId', 'mission', 'objective', 'vipDef', 'vipDamage', 'unitsStart', 'unitsLost', 'unitsAlive', 'aliveDefs', 'playerCostStart', 'enemyCostStart', 'kills', 'friendlyKills', 'killsByDef', 'killsByCause', 'elephantTrampleKills', 'stonedUnits', 'cyclopsMisses', 'kicks', 'maxMeteorKills', 'trojanRevealed', 'wineRain', 'takeCommandKills']) assert.ok(k in S, 'BattleSummary has ' + k);
  // dispatch: battle_start -> arena_played, battle_end -> the summary (lifetime totals already included the battle when it was returned)
  assert.deepEqual(out.map((x) => x[0]), ['battle_start', 'battle_end']); assert.deepEqual(out[0][1], { kind: 'arena_played', arenaId: 'colosseum' }); assert.equal(out[1][1], S);
  // achievements see the final stats + summary
  const got = checkAchievements(stats.get(), S, []);
  assert.ok(got.includes('first_victory') && got.includes('not_so_immortal') && got.includes('gift_shop') && got.includes('tipsy'), 'achievements from the summary: ' + got.join());
  assert.ok(!got.includes('perfect_phalanx') && !got.includes('et_tu'), 'et_tu needs 5 friendly kills');
  // persistence: flushed at battle_end, `v:1` inside, no `v` in get()
  const saved = sink[sink.length - 1]; assert.equal(saved.v, 1); assert.equal(saved.kills, 6); assert.equal('v' in g, false);
  // reload round trip
  const again = new LifetimeStats({ adapter: { load: () => saved, save() {} } }); assert.deepEqual(again.totals(), stats.totals());
}

// ---------------------------------------------------------------- losses, draws, chicken defeats, zeus ragequit
{
  const s = new LifetimeStats({ debounceMs: 0 }); s.beginBattle({ playerTeam: 0 });
  const r = s.onEvent('battle_end', { winner: 1, reason: 'elimination', t: 40, stats: [{}, {}], perDef: [{}, { hoplite: 3, sacred_chicken: 2 }] });
  assert.equal(r.win, false); assert.equal(s.get().losses, 1); assert.equal(s.get().chickenDefeats, 1, 'lost to a side with a live chicken');
  s.beginBattle({ playerTeam: 0 }); s.onEvent('battle_end', { winner: 1, reason: 'time', t: 10, stats: [{}, {}], perDef: [{}, { hoplite: 3 }] }); assert.equal(s.get().chickenDefeats, 1, 'no chicken, no chicken defeat');
  s.beginBattle({ playerTeam: 0 }); const d = s.onEvent('battle_end', { winner: -1, reason: 'intervention', t: 44, stats: [{}, {}], perDef: [{ hoplite: 1 }, { hoplite: 1 }] });
  assert.equal(d.draw, true); assert.equal(d.win, false); assert.equal(s.get().draws, 1); assert.equal(s.get().zeusRagequits, 1); assert.equal(s.get().zeusRageQuits, 1);
  s.beginBattle({ playerTeam: 0 }); s.onEvent('battle_end', { winner: -1, reason: 'time', t: 360, stats: [{}, {}], perDef: [{}, {}] }); assert.equal(s.get().zeusRagequits, 1, 'a timeout draw is not a ragequit');
  assert.equal(s.get().battles, 4); assert.equal(s.get().playSeconds, 40 + 10 + 44 + 360);
  assert.ok(checkAchievements(s.get(), s.summary(), []).includes('zeus_left'));
  // chicken defeat from the swapped side
  const sw = new LifetimeStats({ debounceMs: 0 }); sw.beginBattle({ playerTeam: 1 }); sw.onEvent('battle_end', { winner: 0, reason: 'elimination', t: 5, stats: [{}, {}], perDef: [{ sacred_chicken: 1 }, {}] }); assert.equal(sw.get().chickenDefeats, 1); assert.equal(sw.get().losses, 1);
  // winner 1 with playerTeam 1 is a win
  sw.beginBattle({ playerTeam: 1 }); assert.equal(sw.onEvent('battle_end', { winner: 1, reason: 'rout', t: 5, stats: [{}, {}], perDef: [{}, { hoplite: 2 }] }).win, true);
}

// ---------------------------------------------------------------- protect_vip summary (goat herder)
{
  const vip = { id: 77, def: { id: 'battle_goat' } };
  const { stats } = (() => { const s = new LifetimeStats({ debounceMs: 0 }); s.beginBattle({ playerTeam: 0, objective: 'protect_vip', getVip: () => vip });
    s.onEvent('battle_start', { teams: [{ team: 0, count: 2, cost: 100 }, { team: 1, count: 2, cost: 100 }] }, { t: 0, roster: [] });
    s.onEvent('unit_hit', { src: 1, dst: 5, dmg: 3 }); s.onEvent('battle_end', { winner: 0, reason: 'objective', t: 50, stats: [{}, {}], perDef: [{ battle_goat: 1 }, {}] }); return { stats: s }; })();
  let S = stats.summary(); assert.equal(S.vipDef, 'battle_goat'); assert.equal(S.vipDamage, 0); assert.equal(S.objective, 'protect_vip'); assert.equal(stats.get().goatsSaved, 1);
  assert.ok(checkAchievements(stats.get(), S, []).includes('goat_herder'));
  const s2 = new LifetimeStats({ debounceMs: 0 }); s2.beginBattle({ playerTeam: 0, objective: 'protect_vip', getVip: () => vip });
  s2.onEvent('battle_start', { teams: [] }, { roster: [] }); s2.onEvent('unit_hit', { src: 5, dst: 77, dmg: 4 }); s2.onEvent('unit_hit', { src: 5, dst: 78, dmg: 40 });
  S = s2.onEvent('battle_end', { winner: 0, reason: 'objective', t: 50, stats: [{}, {}], perDef: [{ battle_goat: 1 }, {}] }); assert.equal(S.vipDamage, 4, 'only damage to the VIP counts');
  assert.ok(!checkAchievements(s2.get(), S, []).includes('goat_herder'), 'a scratched goat is not a herded goat');
}

// ---------------------------------------------------------------- UI events + campaign + persistence
{
  const be = mem(); const store = new Store(be); const timers = []; const sched = (fn) => { timers.push(fn); return () => { timers.length = 0; }; };
  const st = new LifetimeStats({ adapter: storeAdapter(store), schedule: sched, debounceMs: 500 });
  assert.deepEqual(st.ui('arena_saved'), { kind: 'arena_saved' }); assert.deepEqual(st.ui('soldier_saved'), { kind: 'soldier_saved' }); st.ui('soldier_saved');
  assert.equal(st.get().arenasSaved, 1); assert.equal(st.get().soldiersSaved, 2);
  assert.equal(be.getItem('vw.stats'), null, 'debounced: nothing written yet'); assert.equal(timers.length, 1); timers[0](); assert.equal(JSON.parse(be.getItem('vw.stats')).data.soldiersSaved, 2);
  assert.deepEqual(st.ui('arena_played', { arenaId: 'troy' }), { kind: 'arena_played', arenaId: 'troy' }); st.ui('arena_played', { arenaId: 'arenalab' }); st.ui('arena_played', { arenaId: 'random' });
  assert.deepEqual(st.get().arenasPlayed, { troy: 1 }, 'arenalab / random / custom arenas do not count for Tourist Trap');
  assert.equal(st.ui('campaign', { mission: 'marathon_sort_of', stars: 2 }).kind, 'campaign'); st.ui('campaign', { mission: 'marathon_sort_of', stars: 1 }); st.ui('campaign', { mission: 'thermopylae_snack', stars: 3 }); st.ui('campaign', { mission: 'bogus', stars: 3 });
  assert.deepEqual(st.get().campaign, { stars: { marathon_sort_of: 2, thermopylae_snack: 3 }, completed: false }, 'best stars kept, unknown missions ignored'); assert.equal(st.get().campaignStars, 5);
  for (const m of ['pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day']) st.ui('campaign', { mission: m, stars: 1 });
  assert.equal(st.get().campaign.completed, true); assert.ok(checkAchievements(st.get(), { kind: 'campaign' }, []).includes('ancient_history'));
  assert.equal(st.ui('nonsense'), null);
  st.setValue('dailyStreak', 4); assert.equal(st.get().dailyStreak, 4); st.flush();
  // the live object is the same reference after load()/reset() (the announcer keeps it)
  const ref = st.get(); st.load({ kills: 7, battles: 2 }); assert.equal(st.get(), ref); assert.equal(ref.kills, 7); assert.equal(ref.arenasSaved, undefined);
  st.reset(); assert.equal(st.get(), ref); assert.deepEqual(Object.keys(ref), []); assert.deepEqual(JSON.parse(be.getItem('vw.stats')).data, { v: 1 });
}

// ---------------------------------------------------------------- normalizeStats: hostile / damaged data
{
  const n = normalizeStats({ kills: -5, battles: 'x', wins: Infinity, losses: 3.5, byCause: { melee: 2, '__proto__': 9, 'Bad Id': 1, fire: -1 }, byDef: { hoplite: { spawned: 3, kills: 'z', deaths: 1 }, constructor: { spawned: 1 } }, campaign: { stars: { marathon_sort_of: 9, x: 2 }, completed: 1 }, zeusRageQuits: 2, unknownKey: 5, v: 1 });
  assert.deepEqual(n.byCause, { melee: 2 }); assert.equal(n.kills, undefined); assert.equal(n.wins, undefined); assert.equal(n.losses, 3.5);
  assert.deepEqual(n.byDef, { hoplite: { spawned: 3, kills: 0, deaths: 1 } }); assert.equal(n.campaign.stars.marathon_sort_of, 3); assert.equal(n.campaign.completed, true);
  assert.equal(n.zeusRagequits, 2, 'alias filled from the other spelling'); assert.equal(n.unknownKey, undefined); assert.equal('v' in n, false);
  assert.deepEqual(normalizeStats(null), {}); assert.deepEqual(normalizeStats([1, 2]), {}); assert.deepEqual(normalizeStats('x'), {});
  // an adapter that throws must not break the app
  const bad = new LifetimeStats({ adapter: { load() { throw new Error('boom'); }, save() { throw new Error('nope'); } }, debounceMs: 0 }); bad.beginBattle({}); bad.onEvent('chicken_tantrum', {}); assert.equal(bad.get().chickenTantrums, 1); assert.ok(bad.error);
}

// every documented key has an owner in the table
const doc = ['battles', 'wins', 'losses', 'draws', 'playSeconds', 'kills', 'unitsLost', 'friendlyKills', 'byCause', 'kicks', 'chickenKills', 'chickenDefeats', 'chickenTantrums', 'goatKills', 'monologues', 'sleeps', 'bribes', 'trojanReveals', 'cyclopsMisses', 'catapultMisfires', 'immortalsRevived', 'immortalsKilledAfterRevive', 'thronesSat', 'zeusInterventions', 'zeusRagequits', 'godPowers', 'stoned', 'trampleKills', 'heroKills', 'heroLosses', 'maxStreak', 'takeCommandKills', 'arenasSaved', 'soldiersSaved', 'arenasPlayed', 'campaign', 'byDef'];
for (const k of doc) assert.ok(STAT_KEYS.includes(k), 'documented key present: ' + k);
for (const [a, b] of Object.entries(ALIASES)) assert.ok(STAT_KEYS.includes(a) && STAT_KEYS.includes(b));
assert.ok(ACHIEVEMENTS.length === 24); console.log('stats OK (' + HANDLED_EVENTS.length + ' event handlers)');
