// W6 (data side): the nine campaign missions load, their objectives construct against the real arenas, the stars are computed by a pure function
// (synthetic BattleSummaries with negative controls), rewards point at real unlocks and the progress helpers behave. Feasibility (win-rate bands) is
// tests/campaign/feasibility.slow.test.mjs; the numbers are in docs/campaign_report.md.
import { test, finish, assert } from '../sim/_util.mjs';
import { validateMission, CAMPAIGN, MISSIONS, ACTS, campaignApi, evaluateStars, MUTATOR_STARS, starsOf, totalStarsOf, aliveCost, missionArena, missionRules, setupMission, objectiveSpec, markerOf } from '../../src/content/era_ancient/campaign.js';
import { CAMPAIGN_TEXT, MISSION_ORDER, REWARD_PARTS, TEACHING_BEATS } from '../../src/content/era_ancient/campaign_text.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';
import { UNLOCKS, PART_REGISTRY, listParts } from '../../src/content/era_ancient/blueprints.js';
import { RECIPES } from '../../src/world/gen.js';
import { SIZES } from '../../src/world/arena.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { MUTATORS } from '../../src/sim/mutators.js';
import { createObjective } from '../../src/sim/objectives.js';
import { normMission } from '../../src/ui/screens/campaign.js';
import { buildContent } from '../../src/content/era_ancient/content.js';

const defs = buildSimDefs();
const M = (id) => MISSIONS.find((m) => m.id === id);
const OBJ = new Set(['eliminate', 'kill_general', 'hold_hill', 'protect_vip', 'survive_waves', 'destroy']);
const MARKER = new Set(['hill', 'exit', 'vip_start', 'general_spawn', 'waypoint']);
const need = { hold_hill: 'hill', protect_vip: 'exit', kill_general: 'general_spawn' };

await test('9 missions, 3 acts, ids and order match the HUMOR copy; every mission wires text, three stars (3rd has a test), rewards and bands', () => {
  assert.equal(MISSIONS.length, 9); assert.deepEqual(MISSIONS.map((m) => m.id), MISSION_ORDER); assert.equal(CAMPAIGN.missions, MISSIONS); assert.equal(CAMPAIGN.acts.length, 3);
  assert.deepEqual(ACTS.map((a) => a.missions.length), [3, 3, 3]);
  MISSIONS.forEach((m, i) => {
    const tx = CAMPAIGN_TEXT[m.id];
    assert.equal(m.index, i); assert.equal(m.act, tx.act); assert.equal(m.title, tx.title); assert.equal(m.blurb, tx.blurb); assert.equal(m.briefing, tx.briefing); assert.equal(m.victory, tx.victory); assert.equal(m.defeat, tx.defeat);
    assert.equal(m.stars.length, 3); m.stars.forEach((s, k) => { assert.equal(s.id, tx.stars[k].id); assert.equal(s.text, tx.stars[k].text); });
    assert.equal(m.stars[0].id, 'win'); assert.equal(m.stars[1].id, 'half'); assert.equal(typeof m.stars[2].test, 'function', m.id + ' star 3 test');
    assert.equal(m.rewards.title, tx.reward.title); assert.ok(m.rules.length >= 2 && m.rules.every((r) => typeof r === 'string' && r.length > 10));
    assert.ok(m.bots.greedy && m.bots.counter && m.bots.turtle); assert.ok(m.budget >= 3000 && m.budget <= 15000); assert.ok(m.timeLimit >= 120 && m.timeLimit <= 600);
  });
  assert.equal(MISSIONS.filter((m) => m.teaching).length, 1); assert.ok(M('marathon_sort_of').teaching); assert.equal(campaignApi.teachingBeats('marathon_sort_of'), TEACHING_BEATS); assert.deepEqual(campaignApi.teachingBeats('thermopylae_snack'), []);
});

await test('arena data: real recipe, valid size, <= 8 markers of known types with unique ids, markers on walkable ground, objective markerIds resolve, the right marker exists per objective', () => {
  for (const m of MISSIONS) {
    const a = m.arena; assert.ok(RECIPES.includes(a.recipe), a.recipe); assert.ok(SIZES[a.size], a.size); assert.ok((a.markers || []).length <= 8);
    const ids = new Set(); for (const k of a.markers) { assert.ok(MARKER.has(k.type), k.type); assert.ok(!ids.has(k.id), 'dup ' + k.id); ids.add(k.id); assert.ok(k.r >= 1 && k.r <= 30); }
    assert.ok(OBJ.has(m.objective.type), m.id); for (const id of m.objective.markerIds) assert.ok(ids.has(id), m.id + ' marker ' + id);
    if (need[m.objective.type]) assert.ok(a.markers.some((k) => k.type === need[m.objective.type]), m.id + ' needs a ' + need[m.objective.type] + ' marker');
    if (m.objective.type === 'protect_vip') assert.ok(a.markers.some((k) => k.type === 'vip_start'));
  }
});

await test('worlds build for every mission: arena + markers + decor, objective constructs, forces placed in the enemy zone, flagged generals, fixed units, rules follow spec 8.4', () => {
  for (const m of MISSIONS) {
    const arena = missionArena(m);
    assert.deepEqual(arena.markers.map((k) => k.id), m.arena.markers.map((k) => k.id)); if (m.arena.env) for (const k of Object.keys(m.arena.env)) assert.equal(arena.env[k], m.arena.env[k]);
    const rules = missionRules(m);
    for (const k of Object.keys(rules)) assert.ok(['friendlyFire', 'morale', 'speed', 'timeLimit', 'difficulty', 'objective', 'godPowers', 'mutators', 'budget', 'weather', 'time', 'startFormation'].includes(k), 'unknown rules key ' + k);
    assert.deepEqual(rules.mutators, []); assert.equal(rules.budget, m.budget); assert.equal(rules.objective.playerTeam, 0); assert.ok(rules.timeLimit > 0);
    const w = new World({ arena, seed: 7, rules, defs });
    const rt = setupMission(w, m, { seed: 7 });
    assert.ok(w.objective && w.objective.type === m.objective.type, m.id + ' objective');
    const B = arena.zones.B, spots = new Set((m.enemy.groups || []).filter((g) => g.at && g.at.x !== undefined).map((g) => g.defId));
    for (const u of w.units) if (u.team === 1) { assert.ok(w.nav.walkable(u.x, u.z), m.id + ' enemy ' + u.def.id + ' stands on walkable ground at ' + u.x.toFixed(1) + ',' + u.z.toFixed(1)); if (!spots.has(u.def.id)) assert.ok(Math.abs(u.x - B.x) <= B.w / 2 + 6 && Math.abs(u.z - B.z) <= B.d / 2 + 6, m.id + ' enemy ' + u.def.id + ' in zone'); }
    assert.ok(w.stats[1].alive >= 1 || m.objective.type === 'survive_waves', m.id);
    for (const g of m.enemy.generals || []) assert.ok(w.units.some((u) => u.team === 1 && u.general && u.def.id === g), m.id + ' general ' + g);
    for (const f of m.fixed) { const u = w.units.find((x) => x.team === 0 && x.vip); assert.ok(u, 'vip placed'); assert.equal(u.def.id, f.defId); }
    rt.destroy();
  }
});

await test('markers sit on walkable ground inside the arena (hill, exit, start and spawn markers) and enemy general spawns inside the enemy zone', () => {
  for (const m of MISSIONS) {
    const arena = missionArena(m), w = new World({ arena, seed: 1, rules: missionRules(m), defs });
    for (const k of m.arena.markers) {
      assert.ok(w.nav.inside(k.x, k.z), m.id + ' ' + k.id + ' inside'); assert.ok(w.nav.walkable(k.x, k.z), m.id + ' ' + k.id + ' walkable at ' + k.x + ',' + k.z);
      if (k.type === 'general_spawn') { const B = arena.zones.B; assert.ok(Math.abs(k.x - B.x) <= B.w / 2 && Math.abs(k.z - B.z) <= B.d / 2, m.id + ' general spawn in zone B'); }
      if (k.type === 'vip_start') { const A = arena.zones.A; assert.ok(Math.abs(k.x - A.x) <= A.w / 2 && Math.abs(k.z - A.z) <= A.d / 2, m.id + ' vip start in zone A'); }
    }
  }
});

await test('rosters and forces: every id is a shipped unit, core units are in the roster, enemy groups are legal, wave groups are legal, fixed VIP is free', () => {
  for (const m of MISSIONS) {
    for (const id of m.roster || []) assert.ok(STAT_TABLE[id], m.id + ' roster ' + id);
    for (const c of m.core) { assert.ok(STAT_TABLE[c.defId]); assert.ok(!m.roster || m.roster.includes(c.defId), m.id + ' core ' + c.defId + ' in roster'); }
    const all = (m.enemy.groups || []).concat(...((m.script && m.script.waves) ? m.script.waves.list.map((w) => w.groups) : []));
    for (const g of all) { assert.ok(STAT_TABLE[g.defId], m.id + ' enemy ' + g.defId); assert.ok(g.n >= 1); }
    assert.ok(m.enemy.generals === undefined || m.enemy.generals.every((id) => all.some((g) => g.defId === id)));
    assert.ok(new Set(all.map((g) => g.defId)).size <= 16, 'type cap');
  }
});

// ------------------------------------------------------------------------------------------------ stars (pure, synthetic summaries)
const base = (m, over) => Object.assign({ kind: 'battle_end', win: true, draw: false, reason: 'objective', t: 100, playerTeam: 0, arenaId: m.arena.recipe, mission: m.id, objective: m.objective.type, vipDef: null, vipDamage: 0, unitsStart: 40, unitsLost: 5, unitsAlive: 35, aliveDefs: { hoplite: 30 }, playerCostStart: 3600, enemyCostStart: 3500, kills: 40, friendlyKills: 0, killsByDef: {}, killsByCause: {}, elephantTrampleKills: 0, stonedUnits: 0, cyclopsMisses: 0, kicks: 0, maxMeteorKills: 0, trojanRevealed: false, wineRain: false, takeCommandKills: 0, startDefs: {}, lostDefs: {}, heroesLost: 0, friendlyHits: 0, propDownT: {} }, over || {});
const starsN = (m, s) => evaluateStars(m, s).stars;

await test('stars: generic rules. loss/draw/other mission/not a battle_end = 0 even when the star-3 fact is true; win = 1; win with >= 50% by cost alive = 2', () => {
  for (const m of MISSIONS) {
    const t3 = { startDefs: { spartan: 8, hoplite: 20 }, lostDefs: {}, aliveDefs: { hoplite: 30 }, playerCostStart: 3600, vipDef: 'battle_goat', vipDamage: 0, t: 40, propDownT: { gate_door: [30, 50] }, friendlyKills: 0, friendlyHits: 0, heroesLost: 0 };
    assert.equal(starsN(m, base(m, { win: false, aliveDefs: {}, ...t3 })), 0, m.id + ' loss'); assert.equal(starsN(m, base(m, { win: false, draw: true })), 0);
    assert.equal(starsN(m, base(m, { win: true, draw: true })), 0, 'draw flag beats win'); assert.equal(starsN(m, base(m, { mission: 'someone_else' })), 0, 'other mission');
    assert.equal(starsN(m, Object.assign(base(m), { kind: 'arena_saved' })), 0); assert.equal(starsN(m, null), 0); assert.equal(starsN(m, {}), 0);
    const lowAlive = base(m, { aliveDefs: { hoplite: 10 }, playerCostStart: 3600 });             // 1,000 / 3,600 = 28%
    const e = evaluateStars(m, lowAlive); assert.equal(e.earned[0], true); assert.equal(e.earned[1], false, m.id + ' <50% alive'); assert.ok(e.aliveCostFrac < 0.5);
    const half = evaluateStars(m, base(m, { aliveDefs: { hoplite: 18 }, playerCostStart: 3600 })); assert.equal(half.earned[1], true, m.id + ' exactly 50%'); assert.ok(Math.abs(half.aliveCostFrac - 0.5) < 1e-9);
    assert.equal(evaluateStars(m, base(m, { aliveDefs: { hoplite: 17 }, playerCostStart: 3600 })).earned[1], false, '49.9% is not half');
  }
  assert.equal(aliveCost({ aliveDefs: { hoplite: 2, spartan: 1 } }), 390); assert.equal(starsN('no_such_mission', base(M('pyramid_scheme'))), 0);
});

await test('stars: marathon thrift (par 2,250), pyramid under 90 s, teutoburg under 75 s, alps elephant, cyclops no friendly fire, olympus heroes, nile goat, troy gate, thermopylae spartans', () => {
  const win2 = (m, over) => starsN(m, base(m, Object.assign({ aliveDefs: { hoplite: 30 }, playerCostStart: 3600 }, over)));          // 3,000 alive of 3,600: star 2 earned
  let m = M('marathon_sort_of'); assert.equal(win2(m, { playerCostStart: 2250, aliveDefs: { hoplite: 15 } }), 3); assert.equal(win2(m, { playerCostStart: 2251, aliveDefs: { hoplite: 15 } }), 2, 'one drachma over par');
  assert.equal(win2(m, { playerCostStart: 1800, aliveDefs: { hoplite: 3 } }), 2, 'thrift without half alive = stars 1 + 3'); assert.deepEqual(evaluateStars(m, base(m, { playerCostStart: 1800, aliveDefs: { hoplite: 3 } })).earned, [true, false, true]);
  m = M('pyramid_scheme'); assert.equal(win2(m, { t: 89.9 }), 3); assert.equal(win2(m, { t: 90 }), 3); assert.equal(win2(m, { t: 90.1 }), 2);
  m = M('teutoburg_peekaboo'); assert.equal(win2(m, { t: 75 }), 3); assert.equal(win2(m, { t: 76 }), 2);
  m = M('alps_elephant'); assert.equal(win2(m, { aliveDefs: { war_elephant: 1, hoplite: 20 } }), 3); assert.equal(win2(m, { aliveDefs: { hoplite: 30 } }), 2);
  m = M('cyclops_meet'); assert.equal(win2(m, { friendlyKills: 0, friendlyHits: 0 }), 3); assert.equal(win2(m, { friendlyKills: 1 }), 2); assert.equal(win2(m, { friendlyHits: 4 }), 2, 'wounding a friend counts');
  m = M('zeus_bad_day'); assert.equal(win2(m, { startDefs: { strategos: 1, hoplite: 30 }, heroesLost: 0 }), 3); assert.equal(win2(m, { startDefs: { strategos: 1, hoplite: 30 }, heroesLost: 1 }), 2); assert.equal(win2(m, { startDefs: { hoplite: 30 } }), 2, 'no hero fielded = nothing to protect');
  m = M('nile_crossing'); assert.equal(win2(m, { vipDef: 'battle_goat', vipDamage: 0 }), 3); assert.equal(win2(m, { vipDef: 'battle_goat', vipDamage: 0.5 }), 2); assert.equal(win2(m, { vipDef: null, vipDamage: 0 }), 2, 'no VIP recorded = no proof');
  m = M('troy_giftshop'); assert.equal(win2(m, { propDownT: { gate_door: [99.9, 140] } }), 3); assert.equal(win2(m, { propDownT: { gate_door: [100.2, 140] } }), 2); assert.equal(win2(m, { propDownT: {} }), 2); assert.equal(win2(m, { propDownT: { gate_door: [150, 60] } }), 3, 'either door counts');
  m = M('thermopylae_snack'); assert.equal(win2(m, { startDefs: { spartan: 8 }, lostDefs: { hoplite: 9 } }), 3); assert.equal(win2(m, { startDefs: { spartan: 8 }, lostDefs: { spartan: 1 } }), 2); assert.equal(win2(m, { startDefs: { spartan: 5 }, lostDefs: {} }), 2, 'fewer than six Spartans fielded');
});

await test('stars: evaluateStars is pure (same summary twice, input untouched) and starsFor/evaluateStars accept a mission id or a def', () => {
  const m = M('pyramid_scheme'), s = base(m, { t: 60, aliveDefs: { hoplite: 30 } }), copy = JSON.stringify(s);
  assert.deepEqual(evaluateStars(m, s), evaluateStars('pyramid_scheme', s)); assert.equal(JSON.stringify(s), copy); assert.equal(campaignApi.starsFor(s, m), 3); assert.equal(campaignApi.starsFor(s, 'pyramid_scheme'), 3);
});

// ------------------------------------------------------------------------------------------------ rewards / progress
await test('rewards: parts are real UnitDef-free unlock keys that gate real parts (3 / 5 / 9), mutators follow the star thresholds, titles are HUMOR\'s', () => {
  const keys = new Set(Object.keys(UNLOCKS)); const all = [].concat(...MISSIONS.map((m) => m.rewards.unlockParts));
  assert.deepEqual(all.slice().sort(), ['silly_helms', 'silly_weapons', 'wings']); for (const k of all) assert.ok(keys.has(k), k);
  assert.deepEqual(M('pyramid_scheme').rewards.unlockParts, ['silly_helms']); assert.deepEqual(M('alps_elephant').rewards.unlockParts, ['silly_weapons']); assert.deepEqual(M('zeus_bad_day').rewards.unlockParts, ['wings']);
  const gated = {}; for (const cat of Object.keys(PART_REGISTRY)) for (const id of Object.keys(PART_REGISTRY[cat])) { const e = PART_REGISTRY[cat][id]; if (e.unlock) (gated[e.unlock.key] = gated[e.unlock.key] || []).push(cat + ':' + id); }
  for (const k of all) assert.ok(gated[k] && gated[k].length >= 1, 'a locked part uses ' + k);
  // the Workshop lists them locked until the key is granted, unlocked after (E9)
  const helms = (u) => listParts('helms', u).filter((p) => p.unlockKey === 'silly_helms'); assert.ok(helms(new Set()).every((p) => p.locked) && helms(new Set(['silly_helms'])).every((p) => !p.locked)); assert.ok(helms(new Set()).length === 4);
  // HUMOR's REWARD_PARTS suggestions: each is a real part id (or an alias of one), mapped to the unlock key that gates it
  const ALIAS = { colander_helm: 'helms:colander', traffic_cone_helm: 'helms:traffic_cone', giant_moustache: 'faces:moustache_huge' };
  const missing = [];
  for (const k of keys) assert.ok(REWARD_PARTS[k] && REWARD_PARTS[k].name && REWARD_PARTS[k].blurb, 'HUMOR names the unlock pack ' + k);
  for (const m of MISSIONS) assert.deepEqual(m.rewards.partNames, m.rewards.unlockParts.map((k) => REWARD_PARTS[k].name));
  for (const id of Object.keys(REWARD_PARTS).filter((k) => !keys.has(k))) { const ref = ALIAS[id] || ['mains', 'helms', 'backs', 'faces', 'tunics'].map((c) => c + ':' + id).find((r) => PART_REGISTRY[r.split(':')[0]] && PART_REGISTRY[r.split(':')[0]][id]); if (!ref || !PART_REGISTRY[ref.split(':')[0]][ref.split(':')[1]]) missing.push(id); }
  assert.deepEqual(missing, ['golden_toga'], 'only golden_toga has no part yet (reported to UNITS in docs/campaign_report.md)');
  assert.equal(MUTATOR_STARS.glass_cannons, 27); const content = buildContent();
  for (const mu of content.mutators) assert.equal(MUTATOR_STARS[mu.id], mu.stars, mu.id + ' threshold matches ctx.content.mutators');
  assert.deepEqual(Object.keys(MUTATOR_STARS), MUTATORS.map((m) => m.id));
  MISSIONS.forEach((m, i) => { assert.deepEqual(m.rewards.unlockMutators, [Object.keys(MUTATOR_STARS)[i]]); assert.equal(MUTATOR_STARS[m.rewards.unlockMutators[0]], 3 * (i + 1), 'a three-star clear of mission ' + (i + 1) + ' reaches the next threshold'); });
});

await test('campaignApi: missionById, isUnlocked chain (>= 1 star on the predecessor), nextMission, unlockedMutators thresholds, newlyUnlocked, rewardsFor, three progress shapes', () => {
  assert.equal(campaignApi.missionById('troy_giftshop').index, 6); assert.equal(campaignApi.missionById('nope'), null);
  const p0 = {}, p1 = { stars: { marathon_sort_of: 1 } }, p2 = { missions: { marathon_sort_of: { stars: 3 }, thermopylae_snack: { stars: 0 } } };
  assert.equal(campaignApi.isUnlocked('marathon_sort_of', p0), true); assert.equal(campaignApi.isUnlocked('thermopylae_snack', p0), false); assert.equal(campaignApi.isUnlocked('thermopylae_snack', p1), true); assert.equal(campaignApi.isUnlocked('pyramid_scheme', p1), false);
  assert.equal(campaignApi.isUnlocked(M('thermopylae_snack'), p2), true); assert.equal(campaignApi.isUnlocked(M('pyramid_scheme'), p2), false, 'zero stars does not open the next mission'); assert.equal(campaignApi.isUnlocked(null, p0), false);
  assert.deepEqual(starsOf({ marathon_sort_of: 2 }), { marathon_sort_of: 2 }); assert.equal(totalStarsOf(p2), 3); assert.equal(totalStarsOf({ stars: { marathon_sort_of: 9, thermopylae_snack: -4 } }), 3, 'clamped 0..3');
  assert.equal(campaignApi.nextMission(p0).id, 'marathon_sort_of'); assert.equal(campaignApi.nextMission(p1).id, 'thermopylae_snack'); assert.equal(campaignApi.nextMission(p2).id, 'thermopylae_snack');
  const all = {}; for (const m of MISSIONS) all[m.id] = 1; assert.equal(campaignApi.nextMission(all), null); delete all.troy_giftshop; assert.equal(campaignApi.nextMission(all).id, 'troy_giftshop');
  assert.deepEqual(campaignApi.unlockedMutators(0), []); assert.deepEqual(campaignApi.unlockedMutators(2), []); assert.deepEqual(campaignApi.unlockedMutators(3), ['big_heads']); assert.deepEqual(campaignApi.unlockedMutators(8), ['big_heads', 'tiny_titans']);
  assert.equal(campaignApi.unlockedMutators(27).length, 9); assert.equal(campaignApi.unlockedMutators(99).length, 9);
  assert.deepEqual(campaignApi.newlyUnlocked(2, 6), ['big_heads', 'tiny_titans']); assert.deepEqual(campaignApi.newlyUnlocked(3, 5), []); assert.deepEqual(campaignApi.newlyUnlocked(0, 0), []);
  const m = M('pyramid_scheme'), win = base(m, { t: 50, aliveDefs: { hoplite: 30 }, playerCostStart: 3600 });
  const r = campaignApi.rewardsFor(m, { stars: { marathon_sort_of: 3, thermopylae_snack: 3 } }, win);
  assert.equal(r.stars, 3); assert.equal(r.firstClear, true); assert.deepEqual(r.parts, ['silly_helms']); assert.equal(r.title, 'Pyramid Schemer'); assert.equal(r.totalBefore, 6); assert.equal(r.totalAfter, 9); assert.deepEqual(r.mutators, ['moon_gravity']);
  const again = campaignApi.rewardsFor(m, { stars: { marathon_sort_of: 3, thermopylae_snack: 3, pyramid_scheme: 3 } }, win); assert.equal(again.improved, false); assert.deepEqual(again.parts, []); assert.deepEqual(again.mutators, []);
  const lost = campaignApi.rewardsFor(m, { stars: {} }, base(m, { win: false })); assert.equal(lost.stars, 0); assert.equal(lost.title, null); assert.deepEqual(lost.parts, []);
});

await test('UI contract: the screens\' normMission renders every mission without gaps (title, blurb, 3 stars with text, objective text, budget, units, rewards), briefing reads arena/faction fields', () => {
  for (const m of MISSIONS) {
    const n = normMission(m, m.index);
    assert.equal(n.title, m.title); assert.ok(n.blurb.length > 10); assert.equal(n.stars.length, 3); assert.ok(n.stars.every((s) => s.id && s.text)); assert.equal(n.act, m.act); assert.ok(n.budget >= 3000);
    assert.ok(n.objective.text && n.objective.type === m.objective.type); assert.equal(n.briefing.length, 4); assert.ok(n.briefing.every((l) => ['brutus', 'plato', 'cassandra'].includes(l.who) && l.text));
    assert.ok(n.units && n.units.A > 0 && n.units.B > 0, m.id + ' unit counts for the briefing'); assert.ok(n.rules.length >= 2); assert.ok(n.rewards.title);
    const raw = n.raw; assert.ok(raw.arena.recipe && raw.arena.size && raw.arena.seed); assert.ok(raw.playerFaction); assert.ok(raw.enemy.faction);
  }
});

await test('validateMission (the Mission contract of the gate): every shipped mission is valid; each rule has a negative control that makes it report a problem', () => {
  for (const m of MISSIONS) assert.deepEqual(validateMission(m, { mutatorStars: MUTATOR_STARS }), [], m.id);
  const NC = (name, mutate, expect) => { const c = JSON.parse(JSON.stringify(Object.assign({}, M('thermopylae_snack'), { stars: M('thermopylae_snack').stars.map((s) => ({ id: s.id, text: s.text, test: s.test })) }))); c.stars = M('thermopylae_snack').stars; mutate(c); const p = validateMission(c, { mutatorStars: MUTATOR_STARS }); assert.ok(p.some((x) => expect.test(x)), name + ' not reported: ' + JSON.stringify(p)); };
  NC('recipe', (c) => { c.arena.recipe = 'atlantis'; }, /recipe/); NC('size', (c) => { c.arena.size = 'huge'; }, /size/); NC('markers', (c) => { c.arena.markers = Array.from({ length: 9 }, (_, i) => ({ id: 'm' + i, type: 'hill', x: 0, z: 0, r: 3 })); }, /more than 8/);
  NC('marker type', (c) => { c.arena.markers[0].type = 'banana'; }, /unknown type/); NC('marker outside', (c) => { c.arena.markers[0].x = 500; }, /outside/); NC('objective marker', (c) => { c.objective.markerIds = ['nope']; }, /does not exist/);
  NC('hill marker', (c) => { c.arena.markers = []; c.objective.markerIds = []; }, /needs a hill marker/); NC('objective type', (c) => { c.objective.type = 'dance'; }, /objective type/); NC('hill time', (c) => { c.objective.params = {}; }, /params.time/);
  NC('roster', (c) => { c.roster = ['hoplite', 'laser_cow']; }, /roster unit/); NC('core', (c) => { c.core = [{ defId: 'xerxes', n: 1 }]; }, /not in the roster/); NC('enemy unit', (c) => { c.enemy.groups[0].defId = 'dragon'; }, /enemy unit/);
  NC('stars', (c) => { c.stars = c.stars.slice(0, 2); }, /three stars/); NC('star test', (c) => { c.stars = c.stars.map((s, i) => (i === 2 ? { id: s.id, text: s.text } : s)); }, /star 3 needs a test/);
  NC('unlock key', (c) => { c.rewards.unlockParts = ['golden_toga_pack']; }, /unknown unlock key/); NC('mutator', (c) => { c.rewards.unlockMutators = ['chaos_goat']; }, /unknown mutator/); NC('bands', (c) => { c.bots.counter = [0.9, 0.5]; }, /band/);
  NC('time limit', (c) => { c.timeLimit = 0; }, /timeLimit/); NC('budget', (c) => { c.budget = 5; }, /budget/); NC('id', (c) => { c.id = 'Bad Id'; }, /lower_snake_case/); NC('act', (c) => { c.act = 7; }, /act/);
  assert.deepEqual(validateMission(null), ['mission is not an object']);
});

finish('campaign');
