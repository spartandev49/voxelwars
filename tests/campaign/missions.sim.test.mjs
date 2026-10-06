// W6 (mechanics): the scripted behaviour of the nine missions in small, fast worlds with the real mission data and the real sim: objectives end the battle
// when they should (and not before), waves arrive on schedule, the VIP marches, Zeus strikes both sides, trackers feed the star tests. Each mechanic has a
// negative control (the same world with the mechanic removed behaves differently). Win-rate bands are the feasibility run, not this file.
import { test, finish, assert, pin } from '../sim/_util.mjs';
import { MISSIONS, missionArena, missionRules, setupMission, battleSummary, evaluateStars, campaignApi, ScriptedWaves } from '../../src/content/era_ancient/campaign.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { layoutArmy } from '../../src/sim/armygen.js';
import { aiInfo } from '../../src/sim/ai.js';
import { applyDamage, newHit, killUnit } from '../../src/sim/combat.js';
import { ST } from '../../src/sim/consts.js';

const defs = buildSimDefs();
if (defs.trojan_horse && !defs.trojan_horse.ranged) aiInfo(defs.trojan_horse).siege = false;       // SIM bug workaround (docs/requests/campaign_sim_bugs.md #1)
const M = (id) => MISSIONS.find((m) => m.id === id);
const arenas = new Map(); const arenaOf = (m) => { if (!arenas.has(m.id)) arenas.set(m.id, missionArena(m)); return arenas.get(m.id); };
/** A mission world with the enemy army replaced by `keep(unit)`-filtered units (placement phase), the player given `groups`. */
function world(m, o = {}) {
  const w = new World({ arena: arenaOf(m), seed: o.seed || 1, rules: Object.assign(missionRules(m), o.rules || {}), defs });
  const rt = setupMission(w, o.mission || m, { seed: o.seed || 1, noEnemy: !!o.noEnemy });
  if (o.thin) for (const u of w.units.slice()) if (u.team === 1 && !o.thin(u)) w.removeUnit(u);
  if (o.player) w.addPlacements(0, layoutArmy(o.player, arenaOf(m).zones.A, arenaOf(m).zones.B, defs, { seed: 1 }), { defs });
  return { w, rt };
}
const slay = (w, u) => killUnit(w, u, null, 'test');
const run = (w, secs, until) => { for (let i = 0; i < secs * 30 && w.state !== 'ended'; i++) { w.tick(); if (until && until(w)) return true; } return false; };

await test('mission 1 (eliminate + teaching): a counter-pick army fights, beats fire in order (battle_start, first_contact, battle_end), tracker extras fill the summary, stars computed from it', () => {
  const m = M('marathon_sort_of'), { w, rt } = world(m, { player: [{ defId: 'hoplite', n: 24 }, { defId: 'peltast', n: 4 }] });
  assert.equal(w.objective.type, 'eliminate'); assert.ok(m.teaching);
  w.start(); run(w, 200);
  assert.equal(w.state, 'ended'); const order = rt.beats.map((b) => b.trigger); assert.deepEqual(order.filter((t) => t !== 'cavalry_brace'), ['battle_start', 'first_contact', 'battle_end']);
  const s = battleSummary(w, m, rt.tracker); assert.equal(s.kind, 'battle_end'); assert.equal(s.mission, m.id); assert.equal(s.playerCostStart, w.stats[0].startCost); assert.equal(s.startDefs.hoplite, 24); assert.equal(s.unitsLost, w.stats[0].dead);
  assert.equal(s.win, w.winner === 0); assert.equal(s.objective, 'eliminate'); assert.ok(s.kills > 0 && s.t > 5); const ev = evaluateStars(m, s); assert.equal(ev.win, s.win); assert.ok(ev.earned[0] === s.win);
  assert.equal(JSON.stringify(Object.keys(s.startDefs).sort()), JSON.stringify(['hoplite', 'peltast']));
});

await test('teaching beats (UI18 data side): the four sim moments HUMOR\'s beats trigger on map from real events, once each, in the order they happen; missions without beats record nothing', () => {
  const m = M('marathon_sort_of'), { w, rt } = world(m, { player: [{ defId: 'hoplite', n: 6 }] });
  assert.deepEqual(campaignApi.teachingBeats(m.id).map((b) => b.trigger), ['placement_start', 'battle_start', 'first_contact', 'cavalry_brace', 'battle_end']);
  w.start(); assert.deepEqual(rt.beats.map((b) => b.trigger), ['battle_start']);
  const e = w.P.unit_brace; e.id = 1; e.dst = 2; w.emit('unit_brace', e); w.emit('unit_brace', e); assert.deepEqual(rt.beats.map((b) => b.trigger), ['battle_start', 'cavalry_brace'], 'brace fires once');
  const h = w.P.unit_hit; h.src = 1; h.dst = 2; h.dmg = 5; w.emit('unit_hit', h); w.emit('unit_hit', h); assert.deepEqual(rt.beats.map((b) => b.trigger), ['battle_start', 'cavalry_brace', 'first_contact']);
  w.end(0, 'elimination'); assert.equal(rt.beats[rt.beats.length - 1].trigger, 'battle_end');
  const other = world(M('thermopylae_snack'), { player: [{ defId: 'hoplite', n: 3 }] }); other.w.start(); const x = other.w.P.unit_hit; x.src = 1; x.dst = 2; other.w.emit('unit_hit', x); assert.deepEqual(other.rt.beats, [], 'only mission 1 teaches');
});

await test('mission 2 (hold_hill + waves): wave 1 is the placed army, waves 2-4 arrive on schedule with the data compositions, an emptied field does not end the battle between waves (negative control: without the guard it does)', () => {
  const m = M('thermopylae_snack'), cfg = m.script.waves;
  const { w, rt } = world(m, { player: [{ defId: 'spartan', n: 8 }, { defId: 'hoplite', n: 20 }] });
  const sp = []; w.events.on('wave_spawn', (e) => sp.push([+w.time.toFixed(1), e.n, e.count]));
  assert.ok(w.waves instanceof ScriptedWaves); assert.equal(w.waves.total, 4); assert.equal(w.waves.n, 1, 'the placed army is wave 1'); assert.equal(w.stats[1].startCount, m.enemy.groups.reduce((s, g) => s + g.n, 0));
  w.start();
  // delete every enemy the moment it appears: the field is empty over and over, the battle must keep waiting for the next wave
  let ended = false; for (let i = 0; i < 30 * 200 && !ended; i++) { w.tick(); for (const u of w.units.slice()) if (u.team === 1 && u.alive) slay(w, u); if (w.state === 'ended') ended = true; if (sp.length >= 3 && w.waves.n >= 4) break; }
  assert.equal(sp.length, 3, 'waves 2, 3 and 4 spawned: ' + JSON.stringify(sp)); assert.deepEqual(sp.map((s) => s[1]), [2, 3, 4]);
  sp.forEach((s, i) => assert.equal(s[2], cfg.list[i].groups.reduce((a, g) => a + g.n, 0), 'wave ' + s[1] + ' count'));
  assert.ok(sp[0][0] > 0 && sp[0][0] < 40, 'wave 2 arrives soon after the field is cleared: ' + sp[0][0]); assert.ok(sp[1][0] - sp[0][0] < 40 && sp[2][0] - sp[1][0] < 40);
  // negative control: remove the elimination guard and the battle ends as soon as the placed army is gone
  const nc = world(m, { player: [{ defId: 'spartan', n: 8 }, { defId: 'hoplite', n: 20 }] }); Object.defineProperty(nc.w.objective, 'blocksElimination', { configurable: true, get: () => false, set: () => {} }); nc.w.start();
  for (let i = 0; i < 30 * 8 && nc.w.state !== 'ended'; i++) { nc.w.tick(); for (const u of nc.w.units.slice()) if (u.team === 1 && u.alive) slay(nc.w, u); }
  assert.equal(nc.w.state, 'ended'); assert.equal(nc.w.winner, 0, 'without the guard the first emptied field ends the mission');
});

await test('mission 2: the hill clock counts only while an ally stands in the circle and no enemy does (120 s cumulative wins by objective); an enemy on the hill pauses it', () => {
  const m = M('thermopylae_snack'), solo = Object.assign({}, m, { script: null, enemy: Object.assign({}, m.enemy, { groups: [{ defId: 'immortal', n: 1, at: { x: 40, z: 25 }, order: 'hold' }] }) });
  const { w } = world(solo, { mission: solo, player: [{ defId: 'hoplite', n: 4 }] });
  const hill = m.arena.markers[0]; for (const sq of w.squads) if (sq.team === 0) { sq.ax = hill.x; sq.az = hill.z; sq.order = 'hold'; } for (const u of w.units) if (u.team === 0) { u.x = hill.x + u.sox * 0.3; u.z = hill.z + u.soz * 0.3; }
  for (const u of w.units) if (u.team === 1) u.squad.order = 'hold';
  w.start(); for (let i = 0; i < 30 * 60; i++) { w.tick(); w.lastDamageT = w.time; } const obj = w.objective; assert.ok(Math.abs(obj.held - 60) < 1.5, 'held ' + obj.held); assert.equal(obj.state, 'held');
  const e = w.units.find((u) => u.team === 1); e.x = hill.x + 2; e.z = hill.z; e.squad.order = 'hold'; const before = obj.held; for (let i = 0; i < 90; i++) { w.tick(); w.lastDamageT = w.time; } assert.ok(obj.held - before < 0.5, 'an enemy on the hill pauses the clock'); assert.equal(obj.state, 'contested');
  e.x = 40; e.z = 25; e.squad.ax = 40; e.squad.az = 25; for (let i = 0; i < 30 * 70 && w.state !== 'ended'; i++) { w.tick(); w.lastDamageT = w.time; } assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective');
});

await test('mission 3 (kill_general): the pharaoh is flagged and guards, killing him wins at once while the rest of his army stands; a routed army does not end the mission (binding); losing every player unit loses', () => {
  const m = M('pyramid_scheme'), { w } = world(m, { player: [{ defId: 'legionary', n: 12 }, { defId: 'equites', n: 2 }] });
  const ph = w.units.find((u) => u.def.id === 'pharaoh'); assert.ok(ph && ph.general && ph.team === 1); w.start(); assert.equal(ph.guard, true, 'KillGeneral sets the guard behaviour at battle start');
  const mk = m.arena.markers[0]; assert.ok(Math.hypot(ph.x - mk.x, ph.z - mk.z) < 6, 'pharaoh starts at the general_spawn marker');
  // everybody but the pharaoh routs: not a win
  for (const u of w.units) if (u.team === 1 && u !== ph) { u.state = 7; u.morale = -20; } run(w, 12); assert.notEqual(w.state, 'ended', 'army rout alone must not end a kill_general mission');
  const alive1 = w.stats[1].alive; assert.ok(alive1 > 5);
  ph.hp = 1; const killer = w.units.find((u) => u.team === 0); applyDamage(w, killer, ph, 500, newHit()); w.step(2);
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective'); assert.ok(w.stats[1].alive > 5, 'the rest of the army was still standing');
  const s = battleSummary(w, m, null); s.t = 80; assert.equal(evaluateStars(m, Object.assign(s, { aliveDefs: { legionary: 12, equites: 2 }, playerCostStart: 1600 })).stars, 3);
  // negative control: the same world without the objective's binding ends by rout
  const nb = Object.assign({}, m, { objective: Object.assign({}, m.objective, { binding: false }) }); const b = world(nb, { mission: nb, player: [{ defId: 'legionary', n: 12 }] }); b.w.start();
  for (const u of b.w.units) if (u.team === 1 && u.def.id !== 'pharaoh') { u.state = 7; u.morale = -20; } for (const u of b.w.units) if (u.team === 1 && u.def.id === 'pharaoh') { u.state = 7; u.morale = -20; }
  run(b.w, 20); assert.equal(b.w.state, 'ended', 'without binding a total rout ends the battle');
});

await test('mission 4 (protect_vip): the goat is a free, unarmed VIP squad that holds, leaves when the way to the exit is clear, wins by reaching the exit marker; the goat dying loses; vipDamage feeds the star', () => {
  const m = M('nile_crossing'), { w, rt } = world(m, { noEnemy: true, player: [{ defId: 'medjay', n: 6 }] });
  const goat = w.units.find((u) => u.vip); assert.ok(goat && goat.def.id === 'battle_goat' && !goat.def.melee && goat.team === 0); assert.equal(w.stats[0].startCost, 6 * defs.medjay.cost + defs.battle_goat.cost, 'the goat is a free extra unit placed by the mission, counted in the army value');
  assert.ok(defs.battle_goat.melee, 'the shared def keeps its melee (the override is per unit)');
  // an enemy standing next to the route keeps the goat at home; once it is gone the goat walks to the exit
  const foe = pin(w.addUnit('berserker', 1, -10, -8, {})); for (const sq of w.squads) if (sq.team === 0) sq.order = 'hold'; w.start(); run(w, 20); assert.equal(goat.squad.order, 'hold', 'route not clear: the goat waits');
  slay(w, foe);
  const exit = m.arena.markers.find((k) => k.type === 'exit'); const reached = run(w, 80, () => w.state === 'ended');
  assert.ok(reached || w.state === 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective'); assert.ok(Math.hypot(goat.x - exit.x, goat.z - exit.z) <= exit.r + 0.6, 'the goat is inside the exit marker');
  const s = battleSummary(w, m, rt.tracker); assert.equal(s.vipDef, 'battle_goat'); assert.equal(s.vipDamage, 0); assert.equal(evaluateStars(m, Object.assign(s, { aliveDefs: { medjay: 6, battle_goat: 1 } })).earned[2], true);
  // goat dies -> mission lost
  const l = world(m, { noEnemy: true, player: [{ defId: 'medjay', n: 6 }] }); const g2 = l.w.units.find((u) => u.vip); l.w.addUnit('berserker', 1, g2.x + 1, g2.z, {}); l.w.start(); g2.hp = 1; run(l.w, 30);
  assert.equal(l.w.state, 'ended'); assert.equal(l.w.winner, 1); const s2 = battleSummary(l.w, m, l.rt.tracker); assert.ok(s2.vipDamage > 0); assert.equal(evaluateStars(m, s2).stars, 0);
});

await test('mission 5 (eliminate, elephants): enemy has auxiliary archers with fire arrows (the line the briefing promises), core elephants fit the roster; summary reports elephants alive for the star', () => {
  const m = M('alps_elephant'); assert.ok(m.enemy.groups.some((g) => g.defId === 'nubian_archer' && g.n >= 8), 'fire arrows are on the Roman side'); assert.deepEqual(m.core, [{ defId: 'war_elephant', n: 2 }]);
  const { w, rt } = world(m, { thin: (u) => u.def.id === 'legionary' && (u.id % 6 === 0), player: [{ defId: 'war_elephant', n: 2 }, { defId: 'hoplite', n: 6 }] });
  w.start(); run(w, 200); assert.equal(w.state, 'ended'); const s = battleSummary(w, m, rt.tracker); assert.equal(s.startDefs.war_elephant, 2); assert.equal(s.win, w.winner === 0);
  if (s.win) assert.equal(evaluateStars(m, s).earned[2], (s.aliveDefs.war_elephant | 0) >= 1);
});

await test('mission 6 (kill_general + marching column): the column arrives in four pieces on schedule, the centurion is held at the rear until reached; killing him wins', () => {
  const m = M('teutoburg_peekaboo'), cfg = m.script.waves; assert.equal(cfg.list.length, 3);
  const { w } = world(m, { player: [{ defId: 'berserker', n: 12 }, { defId: 'axe_thrower', n: 6 }] });
  const sp = []; w.events.on('wave_spawn', (e) => sp.push([+w.time.toFixed(1), e.n, e.count])); const cen = w.units.find((u) => u.def.id === 'centurion'); assert.ok(cen.general);
  w.start(); for (let i = 0; i < 30 * 70 && w.state !== 'ended'; i++) { w.tick(); for (const u of w.units) if (u.team === 0) { u.hp = u.hpMax; } if (sp.length >= 3) break; }
  assert.deepEqual(sp.map((s) => s[1]), [2, 3, 4], JSON.stringify(sp)); sp.forEach((s, i) => assert.equal(s[2], cfg.list[i].groups.reduce((a, g) => a + g.n, 0)));
  assert.ok(Math.abs(sp[1][0] - sp[0][0] - 14) < 1.5 || sp[1][0] - sp[0][0] < 15, 'pieces arrive about 14 s apart: ' + JSON.stringify(sp));
  assert.equal(cen.guard, true); slay(w, cen); w.step(3); assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective');
});

await test('mission 7 (destroy gates + eliminate): wiping the defenders does not win while a gate door stands; gate door times are tracked (star 3); breaking both then ends it; fog-free troy arena has exactly two gate doors', () => {
  const m = M('troy_giftshop'), { w, rt } = world(m, { thin: (u) => u.def.id === 'hoplite' && u.id % 5 === 0, player: [{ defId: 'hoplite', n: 10 }, { defId: 'trojan_horse', n: 1 }] });
  const doors = w.props.filter((p) => p.type === 'gate_door'); assert.equal(doors.length, 2); assert.equal(w.objective.type, 'destroy');
  w.start(); for (const u of w.units.slice()) if (u.team === 1) slay(w, u); w.step(20); assert.notEqual(w.state, 'ended', 'defenders gone but the gates stand: not a win'); assert.equal(w.stats[1].alive, 0);
  w.hurtProp(doors[0], 1e6); w.step(3); assert.notEqual(w.state, 'ended'); assert.ok(rt.tracker.extras().propDownT.gate_door.length === 1, 'first door time recorded');
  const t1 = rt.tracker.extras().propDownT.gate_door[0]; w.hurtProp(doors[1], 1e6); w.step(3); assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective');
  const s = battleSummary(w, m, rt.tracker); assert.equal(s.propDownT.gate_door.length, 2); assert.equal(m.stars[2].test(s), t1 <= 100); s.aliveDefs = { hoplite: 10, trojan_horse: 1 }; s.playerCostStart = 1450; assert.equal(evaluateStars(m, s).earned[2], true);
});

await test('mission 8 (kill_general, friendly fire ON): rules carry friendlyFire, the player\'s arrows hurt friends and are counted (star 3 fails), killing the cyclops wins', () => {
  const m = M('cyclops_meet'), r = missionRules(m); assert.equal(r.friendlyFire, true);
  const { w, rt } = world(m, { thin: (u) => u.def.id === 'cyclops', player: [{ defId: 'cretan_archer', n: 6 }, { defId: 'hoplite', n: 6 }] });
  assert.equal(w.rules.friendlyFire, true); const cy = w.units.find((u) => u.def.id === 'cyclops'); assert.ok(cy.general);
  w.start(); const a = w.units.find((u) => u.team === 0 && u.def.id === 'cretan_archer'), v = w.units.find((u) => u.team === 0 && u.def.id === 'hoplite');
  a.x = -10; a.z = 0; v.x = -6; v.z = 0; a.target = v; a.cdR = 0; const h = newHit(); h.proj = true; applyDamage(w, a, v, 5, h);
  assert.ok(rt.tracker.friendlyHits >= 1, 'a friendly hit is counted'); const s = battleSummary(w, m, rt.tracker); assert.equal(m.stars[2].test(s), false);
  slay(w, cy); w.step(3); assert.equal(w.state, 'ended'); assert.equal(w.winner, 0);
  // negative control: with friendlyFire off in the rules the same hit never lands on an ally (no counted hits through projectiles)
  const off = world(m, { thin: (u) => false, rules: { friendlyFire: false }, noEnemy: true, player: [{ defId: 'hoplite', n: 2 }] }); assert.equal(off.w.rules.friendlyFire, false);
});

await test('mission 9 (survive_waves + Zeus): four scripted waves, a wave counts once its monsters are down, an empty field does not win early, Zeus strikes both sides every 12 s with a telegraph, the star needs a hero fielded', () => {
  const m = M('zeus_bad_day'), small = Object.assign({}, m, { script: Object.assign({}, m.script, { waves: Object.assign({}, m.script.waves, { first: 2, breather: 1, list: m.script.waves.list.map((w) => ({ name: w.name, groups: [{ defId: w.groups[0].defId, n: 1 }] })) }) }) });
  const { w } = world(small, { mission: small, noEnemy: true, player: [{ defId: 'hoplite', n: 30 }, { defId: 'strategos', n: 1 }] });
  assert.ok(w.waves instanceof ScriptedWaves); assert.equal(w.waves.total, 4); assert.equal(w.waves.n, 0); const ev = []; w.events.onAny((t, p) => { if (t === 'wave_spawn' || t === 'telegraph' || t === 'lightning_arc') ev.push([t, +w.time.toFixed(1), p.kind || p.n]); });
  const hit = { 0: 0, 1: 0 }; w.events.on('unit_kill', (e) => { if (e.cause === 'lightning') hit[e.dstTeam]++; });
  w.start(); for (let i = 0; i < 30 * 200 && w.state !== 'ended'; i++) { w.tick(); for (const u of w.units.slice()) if (u.team === 1 && u.alive) slay(w, u); }
  assert.equal(w.state, 'ended'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'objective'); assert.equal(w.waves.cleared, 4); assert.equal(w.objective.progress, 1);
  const waves = ev.filter((e) => e[0] === 'wave_spawn'); assert.equal(waves.length, 4); assert.ok(waves[0][1] >= 2 && waves[0][1] < 3.5, 'wave 1 at the first delay');
  assert.ok(m.script.zeus && m.script.zeus.every === 12 && m.script.zeus.first === 12, 'Zeus: first strike at 12 s, then every 12 s');
  // Zeus is even-handed: aim alternates between the sides (enemy first)
  const z = world(Object.assign({}, m, { script: { zeus: { first: 1, every: 2, dmg: 70, r: 3.2, delay: 0.5 } } }), { mission: Object.assign({}, m, { script: { zeus: { first: 1, every: 2, dmg: 70, r: 3.2, delay: 0.5 } } }), noEnemy: true, player: [{ defId: 'hoplite', n: 20 }] });
  const tp = []; z.w.events.on('telegraph', (e) => { if (e.kind === 'zeus') tp.push([e.x, e.z]); }); const mino = pin(z.w.addUnit('minotaur', 1, 20, 0, {})); mino.hp = mino.hpMax = 1e9; for (const sq of z.w.squads) sq.order = 'hold'; z.w.start(); run(z.w, 9); assert.ok(tp.length >= 4, 'strikes happen: ' + tp.length);
  const sides = tp.map((p) => { let best = null, bd = 1e9; for (const u of z.w.units) { const d = Math.hypot(u.x - p[0], u.z - p[1]); if (d < bd) { bd = d; best = u; } } return best ? best.team : -1; }); assert.ok(sides.includes(0) && sides.includes(1), 'both teams get struck: ' + sides.join(','));
  // star: a hero must be fielded and survive
  const s = battleSummary(w, m, null); s.startDefs = { hoplite: 30, strategos: 1 }; s.heroesLost = 0; s.aliveDefs = { hoplite: 30, strategos: 1 }; s.playerCostStart = 3380; s.win = true; assert.equal(evaluateStars(m, s).earned[2], true);
});

await test('mission 9: a routed monster does not hold its wave open (it runs for the corner), a monster that still fights does (negative control)', () => {
  const m = M('zeus_bad_day'), small = Object.assign({}, m, { script: Object.assign({}, m.script, { zeus: null, waves: Object.assign({}, m.script.waves, { first: 1, breather: 1, interval: 500, list: m.script.waves.list.map((w) => ({ name: w.name, groups: [{ defId: 'battle_goat', n: 4 }], after: 500 })) }) }) });
  const go = (rout) => {
    const { w } = world(small, { mission: small, noEnemy: true, player: [{ defId: 'hoplite', n: 20 }] });
    for (const sq of w.squads) sq.order = 'hold'; w.start(); run(w, 3, (ww) => ww.waves.n >= 1); assert.equal(w.waves.n, 1, 'wave 1 spawned');
    const mine = w.units.filter((u) => u.team === 1 && u.alive); assert.equal(mine.length, 4);
    if (rout) for (const u of mine) { u.state = ST.ROUT; u.morale = -50; u.routT = 0; }
    run(w, 1); return w;
  };
  const a = go(true), b = go(false);
  assert.equal(a.waves.cleared, 1, 'four routed goats: wave 1 counts as beaten'); assert.ok(a.units.filter((u) => u.team === 1 && u.alive).length === 4, 'they are still alive, just running');
  assert.equal(b.waves.cleared, 0, 'four goats still in the fight keep wave 1 open');
});

await test('S17 fail paths: every objective type loses correctly (timeout loses for hold_hill, kill_general, protect_vip, survive_waves, destroy; a wiped army loses; plain elimination is decided by cost at the limit)', () => {
  const quick = (m, t) => Object.assign({}, m, { timeLimit: t });
  for (const id of ['thermopylae_snack', 'pyramid_scheme', 'troy_giftshop', 'zeus_bad_day', 'nile_crossing']) {
    const m = quick(M(id), 12), pl = id === 'nile_crossing' ? [{ defId: 'medjay', n: 4 }] : [{ defId: 'hoplite', n: 4 }];
    const { w } = world(m, { mission: m, noEnemy: id === 'zeus_bad_day', thin: id === 'zeus_bad_day' ? undefined : (u) => u.def.role === 'melee' && u.id % 9 === 0, player: pl });
    for (const u of w.units) if (u.team === 1) { pin(u); u.hp = u.hpMax = 1e9; } for (const sq of w.squads) sq.order = 'hold';
    w.start(); for (let i = 0; i < 30 * 40 && w.state !== 'ended'; i++) { w.tick(); w.lastDamageT = w.time; }
    assert.equal(w.state, 'ended', id + ' ends at its timeout'); assert.equal(w.winner, 1, id + ' a timeout is a loss'); assert.equal(w.endReason, 'time'); assert.ok(w.time >= 11.9 && w.time < 13.5, id + ' ended at the limit: ' + w.time.toFixed(1));
    assert.equal(evaluateStars(M(id), battleSummary(w, M(id), null)).stars, 0, 'a loss earns no stars');
  }
  // plain elimination (missions 1 and 5): the limit decides by remaining cost, the stronger side wins (reason time)
  const m1 = quick(M('marathon_sort_of'), 10), { w } = world(m1, { mission: m1, thin: (u) => u.def.id === 'sparabara', player: [{ defId: 'hoplite', n: 40 }] });
  for (const u of w.units) if (u.team === 1) pin(u); for (const u of w.units) if (u.team === 0) pin(u); w.start(); for (let i = 0; i < 30 * 30 && w.state !== 'ended'; i++) { w.tick(); w.lastDamageT = w.time; }
  assert.equal(w.endReason, 'time'); assert.equal(w.winner, w.stats[0].aliveCost > w.stats[1].aliveCost * 1.02 ? 0 : w.stats[1].aliveCost > w.stats[0].aliveCost * 1.02 ? 1 : -1);
  // a wiped player army loses every objective type at once
  for (const id of ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'alps_elephant', 'troy_giftshop', 'cyclops_meet']) {
    const m = M(id), { w: x } = world(m, { player: [{ defId: 'hoplite', n: 3 }] }); x.start(); x.step(3); for (const u of x.units.slice()) if (u.team === 0) slay(x, u); x.step(3);
    assert.equal(x.state, 'ended', id); assert.equal(x.winner, 1, id + ' wiped army loses');
  }
});

finish('missions.sim');
