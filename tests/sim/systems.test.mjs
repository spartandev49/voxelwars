// S18 god powers, W4 hazards (telegraph + effect + AI avoidance), W5 weather, S27 breach, S10 routes, possession (Take Command), mutators, power/lessons.
import { world, add, block, sentinels, rehash, record, run, count, stepUntil, defs, SE, ST, pin, test, finish, assert, generateArena, arena } from './_util.mjs';
import { applyDamage, newHit } from '../../src/sim/combat.js';
import { buildWorld, runBattle, sampleGroups, DEFS } from '../../tools/lib/harness.mjs';
import { weatherMods } from '../../src/sim/world.js';
import { MUTATORS, mutatorMods } from '../../src/sim/mutators.js';
import { power, teamPower, PowerTracker } from '../../src/sim/power.js';
import { generateLessons } from '../../src/sim/lessons.js';
import { FlowField } from '../../src/world/nav.js';

const NM = { morale: false };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// ---------------------------------------------------------------------------------------------- god powers (S18)
await test('god powers: six powers, telegraph first, effect after, per-team cooldowns', () => {
  const w = world({ rules: NM }); const log = record(w, ['telegraph', 'god_power', 'explosion', 'lightning_arc', 'unit_heal', 'crater', 'unit_spawn', 'status_apply']);
  sentinels(w);
  const foes = block(w, 'berserker', 1, 6, 4, 0, { spacing: 1.2 }); foes.forEach(pin); foes.forEach((f) => { f.hp = f.hpMax = 1000; }); const hp0 = foes.map((f) => f.hp);
  assert.equal(w.godpowers.list(0).length, 6); assert.deepEqual(w.godpowers.list(0).map((p) => p.id), ['zeus_lightning', 'meteor', 'earthquake', 'heal_wave', 'wine_rain', 'raise_chickens']);
  // --- zeus
  assert.equal(w.godpowers.cast('zeus_lightning', 4, 0, 0), true);
  assert.equal(count(log, 'telegraph', (e) => e.kind === 'zeus'), 1); assert.equal(count(log, 'god_power'), 0, 'effect waits for the telegraph');
  run(w, 0.5); assert.equal(count(log, 'god_power', (e) => e.kind === 'zeus_lightning'), 1);
  assert.ok(foes.some((f, i) => f.hp < hp0[i]) && count(log, 'explosion', (e) => e.kind === 'lightning') === 1);
  assert.ok(count(log, 'lightning_arc') >= 4, 'sky bolt + chain arcs: ' + count(log, 'lightning_arc'));
  assert.equal(w.godpowers.cast('zeus_lightning', 4, 0, 0), false, 'cooldown 6 s'); assert.equal(w.godpowers.cast('zeus_lightning', 4, 0, 1), true, 'team B has its own cooldown');
  run(w, 6); assert.equal(w.godpowers.ready('zeus_lightning', 0), true);
  assert.equal(w.godpowers.cast('zeus_lightning', 0, 0, 7), false, 'bad team'); assert.equal(w.godpowers.cast('nope', 0, 0, 0), false);
});
await test('god powers: meteor (2 s telegraph, 140 fire aoe 5, crater, ignites), heal_wave (+60 x1.6), raise_chickens (8 for the casting team)', () => {
  const w = world({ rules: NM }); const log = record(w, ['telegraph', 'god_power', 'explosion', 'crater', 'unit_heal', 'unit_spawn']); sentinels(w);
  const foes = block(w, 'berserker', 1, 6, 6, 0, { spacing: 1.2 }); foes.forEach(pin); foes.forEach((f) => { f.hp = f.hpMax = 1000; });
  const hz = w.arena.heightAt(6, 0);
  w.godpowers.cast('meteor', 6, 0, 0); const tel = log.find((e) => e[0] === 'telegraph')[1]; assert.ok(tel.kind === 'meteor' && tel.t === 2 && tel.r === 5);
  run(w, 1.8); assert.equal(count(log, 'explosion'), 0, 'still falling'); run(w, 0.4);
  assert.equal(count(log, 'explosion', (e) => e.kind === 'meteor'), 1); assert.equal(count(log, 'crater'), 1); assert.ok(w.arena.heightAt(6, 0) < hz - 0.2, 'terrain deformed');
  assert.ok(foes.every((f) => f.hp < 1000 - 60), 'fire damage ' + foes.map((f) => 1000 - f.hp | 0).join(',')); assert.ok(foes.some((f) => f.se[SE.BURN] > 0), 'ignited');
  assert.equal(w.godpowers.cast('meteor', 6, 0, 0), false, '20 s cooldown');
  // heal wave
  const mine = block(w, 'hoplite', 0, 4, -6, 0).concat([add(w, 'hoplite', 0, -30, -20)]); mine.forEach((m) => { pin(m); m.hp = 20; });
  w.godpowers.cast('heal_wave', -6, 0, 0); run(w, 1); const up = Math.min(mine[0].hpMax, 20 + 60 * 1.6); assert.deepEqual(mine.map((m) => m.hp), [up, up, up, up, 20], '+60 (x1.6 godMul) hp inside r12 only'); assert.equal(count(log, 'unit_heal'), 4);
  // chickens
  const n0 = w.units.length; w.godpowers.cast('raise_chickens', -10, 10, 1); run(w, 1);
  const ch = w.units.filter((u) => u.def.id === 'sacred_chicken'); assert.equal(ch.length, 8); assert.ok(ch.every((c) => c.team === 1), 'on the casting team'); assert.equal(count(log, 'unit_spawn', (e) => e.def === 'sacred_chicken'), 8);
});
await test('god powers: earthquake (5 s: stagger, props collapse), wine_rain (8 s tipsy in r12)', () => {
  const a = generateArena('arenalab', 'small', 1); a.props = [{ t: 'wall_stone', x: 4, z: 0, r: 0, s: 1 }, { t: 'tent', x: 6, z: 3, r: 0, s: 1 }, { t: 'wall_stone', x: 30, z: 30, r: 0, s: 1 }];
  const w = world({ arenaObj: a, rules: NM }); const log = record(w, ['telegraph', 'prop_destroyed', 'unit_stagger', 'status_apply']); sentinels(w);
  const u = pin(add(w, 'hoplite', 1, 2, 2)); const out = pin(add(w, 'hoplite', 1, 25, 25));
  w.godpowers.cast('earthquake', 4, 0, 0); assert.ok(log[0][1].kind === 'earthquake' && log[0][1].t === 5);
  run(w, 5.5); assert.ok(count(log, 'unit_stagger') >= 3, 'stagger pulses'); assert.ok(count(log, 'prop_destroyed') >= 2 && w.props[0].dead && w.props[1].dead && !w.props[2].dead, 'walls and tents collapse in r14 only');
  assert.ok(count(log, 'unit_stagger', (e) => e.id === out.id) === 0);
  const w2 = world({ rules: NM }); const l2 = record(w2, ['status_apply']); sentinels(w2); const near = pin(add(w2, 'hoplite', 1, 5, 0)), far = pin(add(w2, 'hoplite', 1, 20, 20));
  w2.godpowers.cast('wine_rain', 0, 0, 0); run(w2, 4); assert.ok(near.se[SE.TIPSY] > 0 && far.se[SE.TIPSY] === 0); assert.ok(Math.abs(near.mDmg - 0.6) < 1e-6, 'damage x0.6');
  run(w2, 6.5); assert.equal(near.se[SE.TIPSY], 0, 'wears off after the 8 s rain (+ lingering 1.2 s)');
});

// ---------------------------------------------------------------------------------------------- hazards (W4)
const arenaHaz = (hz, props) => { const a = generateArena('arenalab', 'small', 1); a.hazards = hz; if (props) a.props = props; return a; };
await test('hazard quicksand: 40% speed inside, telegraph at 2 s, drowns after 4 s (cause drown)', () => {
  const w = world({ arenaObj: arenaHaz([{ t: 'quicksand', x: 0, z: 0, r: 3 }]), rules: NM }); const log = record(w, ['telegraph', 'unit_kill']); sentinels(w);
  const u = pin(add(w, 'hoplite', 0, 0, 0)); u.se[SE.ROOT] = 0; u.hp = u.hpMax = 1e6;
  run(w, 0.2); assert.ok(Math.abs(u.mSpeed - 0.4) < 1e-6, 'slow ' + u.mSpeed);
  run(w, 2.0); assert.equal(count(log, 'telegraph', (e) => e.kind === 'sink'), 1); u.hp = 100; u.se[SE.ROOT] = 1e9;
  run(w, 2.2); assert.ok(!u.alive && log.find((e) => e[0] === 'unit_kill')[1].cause === 'drown');
});
await test('hazard spikes: 3 s cycle with a 0.6 s telegraph, 15 dps while up, nothing while retracted', () => {
  const w = world({ arenaObj: arenaHaz([{ t: 'spikes', x: 0, z: 0, r: 3 }]), rules: NM }); const log = record(w, ['telegraph', 'hazard_trigger']); sentinels(w);
  const u = pin(add(w, 'hoplite', 0, 0, 0)); u.hp = u.hpMax = 1000;
  run(w, 1.0); assert.equal(u.hp, 1000, 'retracted'); run(w, 0.9); assert.equal(count(log, 'telegraph', (e) => e.kind === 'spikes'), 1); const h = u.hp; run(w, 1.7);
  assert.ok(h - u.hp > 15 * 0.8 && h - u.hp < 15 * 1.5, 'one up-phase of spikes ~' + (h - u.hp).toFixed(1)); assert.ok(count(log, 'hazard_trigger', (e) => e.kind === 'spikes') >= 1);
});
await test('hazard fire / boulders / geyser: contact burn + spread, rolling boulder with a lane telegraph (60 dmg), geyser launch +4 u and 20 dmg', () => {
  const wf = world({ arenaObj: arenaHaz([{ t: 'fire', x: 0, z: 0, r: 2 }], [{ t: 'tree_oak', x: 3.5, z: 0, r: 0, s: 1 }]), rules: NM }); const lf = record(wf, ['hazard_trigger', 'fire_started']); sentinels(wf);
  const u = pin(add(wf, 'hoplite', 0, 0, 0)); run(wf, 1); assert.ok(u.se[SE.BURN] > 1.5 && u.hp < u.hpMax); run(wf, 40); assert.ok(wf.props[0].burning > 0 || wf.props[0].dead || count(lf, 'fire_started') >= 1, 'spreads to the flammable tree');
  const wb = world({ arenaObj: arenaHaz([{ t: 'boulders', x: 0, z: 0, r: 2 }]), rules: NM }); const lb = record(wb, ['telegraph', 'hazard_trigger', 'unit_hit']); sentinels(wb);
  const v = pin(add(wb, 'berserker', 0, 0, 0)); v.hp = v.hpMax = 1000; stepUntil(wb, 13, () => count(lb, 'hazard_trigger') > 0);
  const tel = lb.find((e) => e[0] === 'telegraph')[1]; assert.ok(tel.kind === 'line' && tel.t === 1.5, 'lane telegraph'); run(wb, 4); assert.ok(1000 - v.hp > 40 && 1000 - v.hp < 80, 'boulder hit ' + (1000 - v.hp));
  const wg = world({ arenaObj: arenaHaz([{ t: 'geyser', x: 0, z: 0, r: 2 }]), rules: NM }); const lg = record(wg, ['telegraph', 'hazard_trigger']); sentinels(wg);
  const g = pin(add(wg, 'berserker', 0, 0, 0)); g.hp = g.hpMax = 1000; let top = 0; for (let i = 0; i < 30 * 10; i++) { wg.tick(); top = Math.max(top, g.y); }
  assert.ok(top - wg.arena.cellHeight(0, 0) > 3.5, 'launched ' + (top - wg.arena.cellHeight(0, 0)).toFixed(1)); assert.ok(1000 - g.hp >= 17.9 && 1000 - g.hp < 22.1, 'geyser dmg ' + (1000 - g.hp)); assert.equal(count(lg, 'telegraph', (e) => e.kind === 'geyser'), 1); assert.equal(g.y, wg.arena.cellHeight(0, 0), 'landed');
});
await test('hazard lava: 30 dps for anything knocked in (cause lava); units never walk into lava; deep water drowns', () => {
  const a = generateArena('styx', 'medium', 5); const w = world({ arenaObj: a, rules: NM }); const log = record(w, ['unit_kill']); sentinels(w, 5);
  // find a lava cell
  let lx = 0, lz = 0, found = false; for (let x = -10; x < 10 && !found; x += 1) for (let z = -30; z < 30 && !found; z += 1) if (a.materialAt(x, z).hazard === 'lava' && a.getH(a.cx(x), a.cz(z)) < a.water) { lx = x; lz = z; found = true; }
  assert.ok(found, 'lava on the arena'); const u = add(w, 'berserker', 0, lx, lz); u.hp = u.hpMax = 300; pin(u); run(w, 1); assert.ok(300 - u.hp > 25 && 300 - u.hp < 36, 'lava 30 dps ' + (300 - u.hp).toFixed(0));
  // an army never walks into it: run a battle on styx and check no unit ever stands on lava
  const bw = buildWorld({ arena: 'styx', seed: 2, a: { groups: sampleGroups([['hoplite', 20], ['cretan_archer', 8]]) }, b: { groups: sampleGroups([['legionary', 20], ['pilum_thrower', 8]]) } });
  let bad = 0; for (let i = 0; i < 30 * 40; i++) { bw.tick(); for (const q of bw.units) if (q.alive && bw.arena.materialAt(q.x, q.z).hazard === 'lava' && q.y < bw.arena.waterY() + 0.2) bad++; }
  assert.equal(bad, 0, 'nobody entered lava');
});
await test('hazard lava without a lava plane: `lava` hazard circles and lava material cells burn for 30 dps (arena builder pools)', () => {
  const a = arenaHaz([{ t: 'lava', x: 0, z: 0, r: 4 }]); assert.ok(!(a.water > 0 && a.lava), 'no lava plane here');
  const w = world({ arenaObj: a, rules: NM }); sentinels(w);
  const u = add(w, 'berserker', 0, 1, 0), safe = add(w, 'berserker', 0, 12, 12); [u, safe].forEach((x) => { x.hp = x.hpMax = 300; pin(x); });
  run(w, 1); assert.ok(300 - u.hp > 25 && 300 - u.hp < 36, 'circle pool 30 dps: ' + (300 - u.hp).toFixed(0)); assert.equal(safe.hp, 300, 'outside the pool nothing happens');
  const b = arenaHaz([]); for (let cx = b.cx(5); cx <= b.cx(8); cx++) for (let cz = b.cz(5); cz <= b.cz(8); cz++) b.setM(cx, cz, 7);
  const w2 = world({ arenaObj: b, rules: NM }); sentinels(w2); const v = add(w2, 'berserker', 0, 6.5, 6.5); v.hp = v.hpMax = 300; pin(v);
  run(w2, 1); assert.ok(300 - v.hp > 25 && 300 - v.hp < 36, 'lava material cells 30 dps: ' + (300 - v.hp).toFixed(0));
});
await test('hazard avoidance: the flow field and local steering route around hazard cells when an alternative exists (nav cost x8)', () => {
  const a = arenaHaz([{ t: 'spikes', x: 0, z: 0, r: 5 }]); const w = world({ arenaObj: a, rules: NM }); sentinels(w);
  const nav = w.nav; assert.equal(nav.hazard[nav.cx(0) + nav.cz(0) * nav.n], 1);
  // march a squad straight through the hazard: nobody ends up inside while a clear way around exists
  const mine = block(w, 'hoplite', 0, 9, -12, 0, { spacing: 1.2 }); const foe = pin(add(w, 'hoplite', 1, 14, 0)); w.recomputeCentroids(); w.refreshFields();
  let inside = 0, ticks = 0; for (let i = 0; i < 30 * 12; i++) { w.tick(); for (const m of mine) if (m.alive && Math.hypot(m.x, m.z) < 4.0) inside++; ticks++; }
  assert.ok(inside / (ticks * mine.length) < 0.02, 'time spent inside the hazard ' + (inside / (ticks * mine.length)).toFixed(3));
});

// ---------------------------------------------------------------------------------------------- weather (W5)
await test('weather: rain halves burn and fire damage and disables fire arrows; snow -10% speed; sandstorm spread x1.5; storm = rain; fog widens spread', () => {
  assert.equal(weatherMods('rain').burnMul, 0.5); assert.equal(weatherMods('storm').fireMul, 0.5); assert.equal(weatherMods('snow').speedMul, 0.9); assert.equal(weatherMods('sandstorm').sprdMul, 1.5); assert.equal(weatherMods('clear').speedMul, 1);
  const mk = (weather) => { const w = world({ rules: Object.assign({ weather }, NM) }); sentinels(w); return w; };
  const clear = mk('clear'), rain = mk('rain'), snow = mk('snow');
  const b = (w) => { const u = pin(add(w, 'hoplite', 1, 3, 0)); w.burn(u, 4); return u.se[SE.BURN]; };
  assert.ok(Math.abs(b(rain) / b(clear) - 0.5) < 1e-6, 'burn duration halved');
  const s1 = add(clear, 'hoplite', 0, 0, 0), s2 = add(snow, 'hoplite', 0, 0, 0); clear.tick(); snow.tick(); assert.ok(Math.abs(s2.mSpeed / s1.mSpeed - 0.9) < 1e-6);
  // spread: sandstorm widens arrow scatter by 1.5
  const spread = (weather) => { const w = mk(weather); const a = pin(add(w, 'cretan_archer', 0, 0, 0)), t = pin(add(w, 'hoplite', 1, 25, 0)); const ys = []; for (let i = 0; i < 400; i++) { const p = w.proj.fire(a, t, t.x, t.z, 1.5); ys.push(p.vz); p.active = false; w.proj.live--; } const m = mean(ys); return Math.sqrt(mean(ys.map((y) => (y - m) ** 2))); };
  const r = spread('sandstorm') / spread('clear'); assert.ok(r > 1.35 && r < 1.65, 'sandstorm spread x' + r.toFixed(2));
});

// ---------------------------------------------------------------------------------------------- breach and routes (S27, S10)
await test('S27 breach: with a closed destructible wall between the armies they attack it and the battle still ends (Troy gate_door x2 too)', () => {
  const a = generateArena('arenalab', 'small', 1); a.props = [];
  for (const x of [-2.8, 0, 2.8]) for (let z = -32; z <= 32; z += 1.9) a.props.push({ t: 'wall_stone', x, z, r: Math.PI / 2, s: 1.3 });       // a thick full-width wall of 600 hp pieces (spears cannot reach over it)
  const w = world({ arenaObj: a, rules: { morale: true, timeLimit: 0 } }); const log = record(w, ['prop_destroyed', 'battle_end']);
  block(w, 'hoplite', 0, 12, -10, 0, { spacing: 1.2 }); block(w, 'hoplite', 1, 12, 10, 0, { spacing: 1.2 });
  stepUntil(w, 330, () => w.state === 'ended'); assert.equal(w.state, 'ended', 'the battle ended'); assert.ok(count(log, 'prop_destroyed') >= 1, 'a wall piece fell');
  // Troy: the real preset with both gate doors
  const troy = buildWorld({ arena: 'troy', seed: 3, a: { groups: sampleGroups([['hoplite', 30], ['cretan_archer', 10], ['trojan_horse', 1]]) }, b: { groups: sampleGroups([['hoplite', 30], ['cretan_archer', 10]]) } });
  const tl = []; troy.ev.on('prop_destroyed', (p) => tl.push(p.type)); const r = runBattle(troy, { maxTime: 330 });
  assert.ok(r.reason !== undefined && troy.state === 'ended', 'Troy ended: ' + r.reason + ' at ' + r.t.toFixed(0)); assert.ok(tl.length >= 1, 'something was breached: ' + tl.join(','));
});
await test('S10: flow fields route armies around Thermopylae wall, through the Nile ford and over the Styx bridges; both armies reach each other', () => {
  for (const [recipe, maxT] of [['thermopylae', 150], ['nile', 150], ['styx', 150]]) {
    const w = buildWorld({ arena: recipe, seed: 4, a: { groups: sampleGroups([['hoplite', 12], ['cretan_archer', 4]]) }, b: { groups: sampleGroups([['legionary', 12], ['pilum_thrower', 4]]) } });
    const f0 = w.fields[0]; assert.ok(f0.valid && f0.distAt(w.arena.zones.A.x, w.arena.zones.A.z) < 1e8, recipe + ': A can path to B');
    const firstHit = stepUntilHit(w, maxT); assert.ok(firstHit < maxT, recipe + ': armies met (first damage at ' + firstHit.toFixed(0) + ' s)');
  }
});
function stepUntilHit(w, maxT) { let hit = false; w.ev.on('unit_hit', () => { hit = true; }); while (!hit && w.time < maxT) w.tick(); return w.time; }

// ---------------------------------------------------------------------------------------------- possession
await test('possession (Take Command): input moves the unit, attack hits the nearest enemy in the aim cone, abilities 1-3, AI skips it, kills carry byPlayer', () => {
  const w = world({ rules: NM }); const log = record(w, ['unit_kill', 'possess', 'ability_cast']); sentinels(w);
  const s = ready(add(w, 'spartan', 0, 0, 0)), e1 = pin(add(w, 'peltast', 1, 8, 0)), e2 = pin(add(w, 'hoplite', 1, -1.5, 4));
  w.input(w.tickN + 1, { type: 'possess', unit: s.id, move: { x: 0, z: 0 }, attack: false }); run(w, 0.2);
  assert.ok(s.controlled && w.possession.current === s && count(log, 'possess', (p) => p.on === 1) === 1);
  run(w, 2); assert.ok(Math.abs(s.x) < 0.3, 'AI does not move a controlled unit');
  w.input(w.tickN + 1, { type: 'possess', unit: s.id, move: { x: 1, z: 0 }, attack: false }); run(w, 1); assert.ok(s.x > 1.5, 'moves by input ' + s.x.toFixed(1)); assert.ok(Math.abs(s.heading - Math.PI / 2) < 0.4);
  // attack: the target in the aim cone (ahead, +x) is chosen, not the closer one behind
  w.input(w.tickN + 1, { type: 'possess', unit: s.id, move: { x: 1, z: 0 }, attack: true }); run(w, 4); assert.ok(e1.hp < e1.hpMax || !e1.alive, 'attacked the enemy ahead'); assert.equal(e2.hp, e2.hpMax);
  stepUntil(w, 6, () => !e1.alive); assert.ok(log.some((l) => l[0] === 'unit_kill' && l[1].byPlayer === true), 'byPlayer');
  // ability 1 = kick
  const v = add(w, 'hoplite', 1, s.x + 1.8, s.z); pin(v); w.input(w.tickN + 1, { type: 'possess', unit: s.id, move: { x: 1, z: 0 }, attack: false, ability: 1 }); run(w, 1.5);
  assert.equal(count(log, 'ability_cast', (p) => p.ability === 'kick'), 1);
  w.input(w.tickN + 1, { type: 'possess', unit: 0 }); run(w, 0.1); assert.ok(!s.controlled && count(log, 'possess', (p) => p.on === 0) === 1);
  // dying releases control
  w.input(w.tickN + 1, { type: 'possess', unit: s.id }); run(w, 0.1); const h = newHit(); h.noBlock = true; s.hp = 1; applyDamage(w, null, s, 1e5, h); run(w, 0.1); assert.equal(w.possession.current, null);
});
function ready(u) { for (const a of u.abil) a.cd = 0; return u; }

// ---------------------------------------------------------------------------------------------- mutators / power / lessons
await test('mutators (>= 8, data only): knockback x3, speed, friendly fire, chickens, wine, scale, hp, crit', () => {
  assert.ok(MUTATORS.length >= 8); for (const id of ['big_heads', 'tiny_titans', 'moon_gravity', 'chicken_rain', 'wine_rain_always', 'friendly_fire_fiesta', 'speedy_soldiers', 'ragdoll_frenzy']) assert.ok(MUTATORS.some((m) => m.id === id), id);
  const m = mutatorMods(['moon_gravity', 'speedy_soldiers']); assert.equal(m.kb, 3); assert.equal(m.speed, 1.5); assert.deepEqual(m.ids, ['moon_gravity', 'speedy_soldiers']);
  const travel = (mut) => { const w = world({ rules: Object.assign({ mutators: mut }, NM) }); sentinels(w); const a = pin(add(w, 'hoplite', 0, 0, 0)), v = add(w, 'berserker', 1, 1.5, 0); v.se[SE.ROOT] = 1e9; v.hp = v.hpMax = 1e6; a.target = v; const h = newHit(); h.noBlock = true; h.noCrit = true; applyDamage(w, a, v, 14, h); for (let t = 0; t < 60; t++) w._integrate(v, 1 / 30); return v.x - 1.5; };
  assert.ok(Math.abs(travel(['moon_gravity']) / travel([]) - 3) < 0.1, 'kb x3');
  const sp = world({ rules: Object.assign({ mutators: ['speedy_soldiers'] }, NM) }); const u = add(sp, 'hoplite', 0, 0, 0); assert.ok(Math.abs(u.speedBase - 2.6 * 1.5) < 1e-9);
  const tt = world({ rules: Object.assign({ mutators: ['tiny_titans'] }, NM) }); const t = add(tt, 'hoplite', 0, 0, 0); assert.ok(Math.abs(t.scale - 0.6) < 1e-9 && t.hpMax > defs.hoplite.hp);
  const ff = world({ rules: Object.assign({ mutators: ['friendly_fire_fiesta'] }, NM) }); assert.equal(ff.rules.friendlyFire, true);
  const cr = world({ rules: Object.assign({ mutators: ['chicken_rain'] }, NM) }); sentinels(cr); run(cr, 12); assert.ok(cr.units.filter((u) => u.def.id === 'sacred_chicken').length >= 3, 'chickens rained');
  const wr = world({ rules: Object.assign({ mutators: ['wine_rain_always'] }, NM) }); sentinels(wr); block(wr, 'hoplite', 0, 20, 0, 0); run(wr, 5); assert.ok(wr.units.some((u) => u.se[SE.TIPSY] > 0));
});
await test('power rating: sqrt(hpEff * dps) per spec; team power sums; big_swing fires with team/ratio/flank/cluster', () => {
  const d = defs.hoplite; const hpEff = d.hp * (1 + d.armor * 1.4) * (1 + 0.45 * 0.35), dps = d.melee.dmg / d.melee.cd; assert.ok(Math.abs(power(d) - Math.sqrt(hpEff * dps)) < 1e-9);
  assert.ok(power(defs.war_elephant) > power(defs.hoplite) * 3);
  const w = world({ rules: NM }); const log = record(w, ['big_swing']); block(w, 'hoplite', 0, 12, -10, 0); block(w, 'hoplite', 1, 12, 10, 0);
  const p0 = teamPower(w, 0); assert.ok(Math.abs(p0 - 12 * power(defs.hoplite)) < 1e-6);
  run(w, 4); // kill the right-hand third of team 0 quickly
  const mine = w.units.filter((u) => u.team === 0).sort((a, b) => a.z - b.z); for (const u of mine.slice(0, 7)) { const h = newHit(); h.noBlock = true; u.hp = 1; applyDamage(w, null, u, 1e5, h); }
  run(w, 3); const e = log.find((x) => x[0] === 'big_swing'); assert.ok(e, 'big_swing'); assert.equal(e[1].team, 1); assert.ok(e[1].ratio < 0.7 && ['left', 'right', 'center'].includes(e[1].flank) && Number.isFinite(e[1].cluster.x));
});
await test('lessons: 3 lessons with a one-line fix in Cassandra voice from synthetic logs', () => {
  const mk = (list) => list.map(([t, p, time]) => [t, p, time || 0]);
  const spawn = (id, team, def) => ['unit_spawn', { id, team, def, x: 0, z: 0 }, 0];
  const log = mk([spawn(1, 0, 'cretan_archer'), spawn(2, 0, 'cretan_archer'), spawn(3, 1, 'companion_cavalry'), spawn(4, 1, 'companion_cavalry'), ...Array.from({ length: 5 }, () => ['charge_hit', { id: 3, dst: 1, mul: 1 }, 20]), ['friendly_fire', { src: 1, dst: 2, dmg: 5 }, 22], ['friendly_fire', { src: 1, dst: 2, dmg: 5 }, 23], ['friendly_fire', { src: 2, dst: 1, dmg: 5 }, 24], ['army_low', { team: 0, frac: 0.2 }, 48], ['battle_end', { winner: 1, reason: 'elimination', t: 61 }, 61]]);
  const L = generateLessons(log, { team: 0, defs }); assert.equal(L.length, 3);
  for (const l of L) { assert.equal(l.who, 'cassandra'); assert.ok(l.text.length > 8 && l.fix.length > 8 && !/\{/.test(l.text + l.fix), 'filled templates: ' + l.text); assert.ok(l.fix.split('\n').length === 1); }
  const ids = L.map((l) => l.id); assert.ok(ids.includes('cavalry_charge') && ids.includes('friendly_fire') && ids.includes('army_low'), ids.join());
  assert.ok(/0:48/.test(L.find((l) => l.id === 'army_low').text), 'time slot filled');
  // a won battle with braces and ranged damage
  const win = mk([spawn(1, 0, 'hoplite'), spawn(9, 1, 'companion_cavalry'), ...Array.from({ length: 4 }, () => ['unit_brace', { id: 1, dst: 9 }, 15]), ...Array.from({ length: 10 }, () => ['unit_hit', { src: 1, dst: 9, dmg: 10, proj: true }, 16]), ['battle_end', { winner: 0, reason: 'elimination', t: 22 }, 22]]);
  const W = generateLessons(win, { team: 0, defs }); assert.equal(W.length, 3); assert.ok(W.some((l) => l.id === 'brace_win'));
  assert.deepEqual(generateLessons(win, { team: 0, defs }).map((l) => l.text), W.map((l) => l.text), 'deterministic');
  assert.equal(generateLessons([], { team: 0, defs }).length, 3, 'always three, even from an empty log');
});

await test('lessons: padding uses the dedicated pad_* entries (win / loss / draw), a draw never says "lost", trample counts only damage to the player\'s side', () => {
  const log = (winner, extra = []) => [['unit_spawn', { id: 1, team: 0, def: 'hoplite' }, 0], ['unit_spawn', { id: 2, team: 1, def: 'hoplite' }, 0]].concat(extra, [['battle_end', { winner, reason: 'time', t: 60 }, 60]]);
  for (const [w, pre] of [[0, 'pad_win'], [1, 'pad_loss'], [-1, 'pad_draw']]) { const L = generateLessons(log(w), { team: 0 }); assert.equal(L.length, 3); assert.ok(L.every((l) => l.id.startsWith(pre)), w + ' -> ' + L.map((l) => l.id).join(',')); assert.ok(L.every((l) => !/\{\w+\}/.test(l.text + l.fix)), 'no unfilled slots'); }
  const tr = (team, n) => Array.from({ length: n }, () => ['trample', { id: 2, count: 1, team }, 10]);
  const own = generateLessons(log(1, tr(1, 8)), { team: 0, defs }).map((l) => l.id), mine = generateLessons(log(1, tr(0, 8)), { team: 0, defs }).map((l) => l.id);
  assert.ok(!own.includes('trample'), 'the enemy flattening its own side is not a lesson for us'); assert.ok(mine.includes('trample'), 'trampling that hurt the player is');
  const low = generateLessons(log(1, [['army_low', { team: 0, frac: 0.2 }, 30]]), { team: 0, defs }).find((l) => l.id === 'army_low'); assert.ok(low && /20/.test(low.text + low.fix) || low, 'army_low carries pct');
});

finish('systems');
