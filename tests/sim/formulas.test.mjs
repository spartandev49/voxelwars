// S4 (damage/armor/shield/charge/brace/backstab/knockback/trample/friendly fire), S14 (spear wall), S15 (morale/rout), S25 (knockback numbers) — spec §8.1.
import { world, add, block, sentinels, rehash, record, run, count, stepUntil, defs, SE, ST, dist, pin, test, finish, assert, ready } from './_util.mjs';
import { applyDamage, newHit, resolveMelee, chargeFactor } from '../../src/sim/combat.js';
import { G } from '../../src/sim/consts.js';
import { buildWorld, runBattle, sampleGroups } from '../../tools/lib/harness.mjs';

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const noMorale = { morale: false };
function hitN(w, src, dst, base, n, mod) {
  const out = [];
  for (let i = 0; i < n; i++) { dst.hp = dst.hpMax = 1e6; const h = newHit(); h.noCrit = true; h.noBlock = true; h.kb = 0; if (mod) mod(h); out.push(applyDamage(w, src, dst, base, h)); }
  return out;
}

await test('damage: raw = dmg x rand(0.9,1.1); final = max(1, raw x (1 - eff)), eff = clamp((armor+mArmor)(1-ap),0,0.9)', () => {
  const w = world({ rules: noMorale }); sentinels(w);
  const a = pin(add(w, 'hoplite', 0, 0, 0)), t = pin(add(w, 'legionary', 1, 1, 0));            // armor .38
  const d = hitN(w, a, t, 100, 400, (h) => { h.type = 'slash'; });
  assert.ok(Math.min(...d) >= 100 * 0.9 * (1 - 0.38) - 1e-6 && Math.max(...d) <= 100 * 1.1 * (1 - 0.38) + 1e-6, 'roll range');
  assert.ok(Math.abs(mean(d) - 100 * (1 - 0.38)) < 1.2, 'mean ' + mean(d));
  // armor piercing: pierce ap .3 -> eff = .38*.7 ; blunt ap .2 ; magic/fire ap 1 ignore armor
  assert.ok(Math.abs(mean(hitN(w, a, t, 100, 400, (h) => { h.type = 'pierce'; })) - 100 * (1 - 0.38 * 0.7)) < 1.2);
  assert.ok(Math.abs(mean(hitN(w, a, t, 100, 400, (h) => { h.type = 'blunt'; })) - 100 * (1 - 0.38 * 0.8)) < 1.2);
  assert.ok(Math.abs(mean(hitN(w, a, t, 100, 400, (h) => { h.type = 'magic'; })) - 100) < 1.2);
  assert.ok(Math.abs(mean(hitN(w, a, t, 100, 400, (h) => { h.type = 'slash'; h.ap = 0.5; })) - 100 * (1 - 0.19)) < 1.2, 'explicit ap');
  // mArmor adds, cap 0.9, minimum damage 1
  t.mArmor = 0.9; assert.ok(Math.abs(mean(hitN(w, a, t, 100, 200, (h) => { h.type = 'slash'; })) - 10) < 0.8, 'eff capped at 0.9');
  t.mArmor = 0; assert.equal(Math.min(...hitN(w, a, t, 0.5, 50)), 1, 'min 1 damage');
});
await test('damage: crit 6% x2, backstab x1.35 (outside the 120deg front arc), fire vs fire_weak/undead, weather', () => {
  const w = world({ rules: noMorale }); sentinels(w); const a = pin(add(w, 'hoplite', 0, 0, 0)), t = pin(add(w, 'peltast', 1, 1.2, 0)); t.heading = -Math.PI / 2;   // t faces a
  let crits = 0, N = 6000; const base = [];
  for (let i = 0; i < N; i++) { t.hp = t.hpMax = 1e6; const h = newHit(); h.type = 'magic'; h.noBlock = true; h.kb = 0; const d = applyDamage(w, a, t, 10, h); if (d > 14) crits++; }
  assert.ok(Math.abs(crits / N - 0.06) < 0.015, 'crit rate ' + (crits / N).toFixed(3));
  const front = mean(hitN(w, a, t, 20, 300, (h) => { h.type = 'magic'; }));
  t.heading = Math.PI / 2;                                                                       // t faces away: a is behind it
  const back = mean(hitN(w, a, t, 20, 300, (h) => { h.type = 'magic'; }));
  assert.ok(Math.abs(back / front - 1.35) < 0.06, 'backstab ' + (back / front).toFixed(2));
  t.heading = Math.PI;                                                                           // a is at the side (90deg): outside a 120deg front arc => backstab
  assert.ok(Math.abs(mean(hitN(w, a, t, 20, 300, (h) => { h.type = 'magic'; })) / front - 1.35) < 0.06, 'flank counts as backstab');
  const mum = pin(add(w, 'mummy', 1, 3, 0)), horse = pin(add(w, 'trojan_horse', 1, 5, 0)), plain = pin(add(w, 'peltast', 1, 7, 0));
  const f = (u) => mean(hitN(w, a, u, 20, 200, (h) => { h.type = 'fire'; h.noBackstab = true; }));
  const base0 = f(plain);
  assert.ok(Math.abs(f(mum) / base0 - 2 * (1 - 0.1 * 0) / 1) < 0.15 || f(mum) > base0 * 1.9, 'undead x2 fire ' + (f(mum) / base0).toFixed(2));
  assert.ok(f(horse) / base0 > 1.4, 'wood fire_weak');
  const rain = world({ rules: Object.assign({ weather: 'rain' }, noMorale) }); sentinels(rain);
  const a2 = pin(add(rain, 'hoplite', 0, 0, 0)), p2 = pin(add(rain, 'peltast', 1, 1.2, 0));
  assert.ok(Math.abs(mean(hitN(rain, a2, p2, 20, 200, (h) => { h.type = 'fire'; h.noBackstab = true; })) / base0 - 0.5) < 0.05, 'rain halves fire damage');
});
await test('shield: block chance inside the front arc negates the hit (unit_block, no unit_hit); outside the arc nothing; bash staggers the attacker 0.25 s', () => {
  const w = world({ rules: noMorale }); sentinels(w); const log = record(w, ['unit_block', 'unit_hit', 'unit_stagger']);
  const a = pin(add(w, 'hoplite', 0, -1.5, 0)), t = pin(add(w, 'legionary', 1, 0, 0)); t.heading = -Math.PI / 2;              // shield .5 melee, arc 90 half-angle
  let blocked = 0, N = 2000; for (let i = 0; i < N; i++) { t.hp = t.hpMax = 1e6; const h = newHit(); h.noCrit = true; h.kb = 0; if (applyDamage(w, a, t, 10, h) === 0) blocked++; }
  assert.ok(Math.abs(blocked / N - 0.5) < 0.05, 'melee block rate ' + (blocked / N).toFixed(2));
  assert.equal(count(log, 'unit_block'), blocked); assert.equal(count(log, 'unit_hit'), N - blocked, 'blocked hits emit unit_block only');
  let pblocked = 0; for (let i = 0; i < N; i++) { t.hp = t.hpMax = 1e6; const h = newHit(); h.noCrit = true; h.kb = 0; h.proj = true; h.at(-8, 0); if (applyDamage(w, null, t, 10, h) === 0) pblocked++; }
  assert.ok(Math.abs(pblocked / N - 0.75) < 0.05, 'projectile block rate ' + (pblocked / N).toFixed(2));
  t.heading = Math.PI / 2;                                                                                                      // attacker now behind the shield
  let b2 = 0; for (let i = 0; i < 300; i++) { t.hp = t.hpMax = 1e6; const h = newHit(); h.noCrit = true; h.kb = 0; if (applyDamage(w, a, t, 10, h) === 0) b2++; } assert.equal(b2, 0, 'no block from behind');
  // bash staggers the attacker on a block
  const bash = pin(add(w, 'cretan_archer', 0, -1.5, 3)); t.heading = -Math.PI / 2; t.x = 0; t.z = 3; let st = 0;
  for (let i = 0; i < 80 && !st; i++) { t.hp = t.hpMax = 1e6; bash.state = ST.IDLE; const h = newHit(); h.noCrit = true; h.kb = 0; h.bash = true; if (applyDamage(w, bash, t, 5, h) === 0 && bash.state === ST.STAGGER) st = 1; }
  assert.ok(st && Math.abs(bash.stateDur - 0.25) < 1e-6, 'bash block staggers 0.25 s');
});
await test('charge: cavalry momentum scales damage x(1+ch) and knockback x(1+1.5 ch); brace punishes the charger (unit_brace)', () => {
  const w = world({ rules: noMorale }); sentinels(w); const log = record(w, ['charge_hit', 'unit_brace', 'unit_hit']);
  const c = pin(add(w, 'companion_cavalry', 0, 0, 0)); c.se[SE.ROOT] = 0;
  const v = pin(add(w, 'berserker', 1, 3.0, 0)); v.heading = Math.PI / 2;                       // faces away: no spear brace possible
  c.speedNow = 0; assert.equal(chargeFactor(c), 0);
  c.speedNow = c.def.speed * c.def.runMul; assert.ok(Math.abs(chargeFactor(c) - 1) < 1e-9, 'full charge at run speed');
  c.speedNow = c.def.speed * (1 + (c.def.runMul - 1) / 2); assert.ok(Math.abs(chargeFactor(c) - 0.5) < 1e-9, 'half');
  const run1 = (spd) => { c.speedNow = spd; c.target = v; v.hp = v.hpMax = 1e6; v.kx = v.kz = 0; v.x = 3.0; const n0 = log.length; for (let i = 0; i < 1; i++) resolveMelee(w, c); return log.slice(n0).filter((e) => e[0] === 'unit_hit').map((e) => e[1].dmg); };
  const still = mean(Array.from({ length: 60 }, () => run1(0)[0])), full = mean(Array.from({ length: 60 }, () => run1(c.def.speed * c.def.runMul)[0]));
  assert.ok(full / still > 1.8 && full / still < 2.2, 'charge doubles damage ' + (full / still).toFixed(2));
  assert.ok(count(log, 'charge_hit') >= 60, 'charge_hit events');
  // brace: spearman faces the charger and is nearly still
  const h = pin(add(w, 'hoplite', 1, 3.0, 5)); h.heading = -Math.PI / 2; const c2 = pin(add(w, 'companion_cavalry', 0, 0, 5)); c2.speedNow = c2.def.speed * c2.def.runMul; c2.target = h; h.speedNow = 0;
  const hpBefore = c2.hp; resolveMelee(w, c2);
  assert.equal(count(log, 'unit_brace'), 1, 'brace fired'); const expect = 14 * 1.6 * (1 - 0.25 * 0.7); assert.ok(Math.abs(hpBefore - c2.hp - expect) < expect * 0.25, 'charger takes ~1.6x spear damage ' + (hpBefore - c2.hp).toFixed(1) + ' vs ' + expect.toFixed(1));
  assert.equal(c2.vx, 0, 'momentum cancelled');
});
await test('knockback (S25): hoplite hit <= 0.7 u, cavalry charge 1.5-3 u, monsters 3-5 u, kick 8 +- 1 u, any single hit <= 8 u', () => {
  const travel = (attackerId, charge, nHits = 1) => {
    const w = world({ rules: noMorale }); sentinels(w);
    const a = add(w, attackerId, 0, 0, 0); pin(a); const v = add(w, 'berserker', 1, 0, 0); v.se[SE.ROOT] = 1e9; v.hp = v.hpMax = 1e6;
    const reach = a.def.melee.range + a.radius + v.radius - 0.2; v.x = reach; v.heading = -Math.PI / 2; a.speedNow = charge ? a.def.speed * a.def.runMul : 0; a.target = v;
    const res = [];
    for (let k = 0; k < 25; k++) { v.x = reach; v.z = 0; v.kx = v.kz = 0; resolveMelee(w, a); for (let t = 0; t < 40; t++) w._integrate(v, 1 / 30); res.push(Math.abs(v.x - reach)); }
    res.sort((x, y) => x - y); return res[12];
  };
  assert.ok(travel('hoplite', 0) <= 0.7, 'hoplite ' + travel('hoplite', 0));
  for (const id of Object.keys(defs)) { const d = defs[id]; if ((d.role === 'melee' || (d.role === 'hero' && !d.tags.includes('cavalry') && id !== 'chieftain')) && d.melee) assert.ok(travel(id, 0) <= 0.72, id + ' shoves ' + travel(id, 0).toFixed(2)); }
  const cc = travel('companion_cavalry', 1); assert.ok(cc >= 1.5 && cc <= 3.05, 'cavalry charge ' + cc.toFixed(2));
  for (const id of ['war_elephant', 'minotaur', 'cyclops']) { const m = travel(id, 0); assert.ok(m >= 3 && m <= 5.1, id + ' ' + m.toFixed(2)); }
  // no hit can launch further than the 48 u/s clamp (8 u)
  const w = world({ rules: noMorale }); sentinels(w); const a = pin(add(w, 'cyclops', 0, 0, 0)), v = add(w, 'sacred_chicken', 1, 2, 0); v.se[SE.ROOT] = 1e9; v.hp = v.hpMax = 1e9;
  const h = newHit(); h.noBlock = true; h.kb = 500; applyDamage(w, a, v, 500, h); assert.ok(Math.hypot(v.kx, v.kz) <= G.kbMax + 1e-6, 'velocity clamp');
  let x0 = v.x; for (let t = 0; t < 60; t++) w._integrate(v, 1 / 30); assert.ok(Math.abs(v.x - x0) <= 8.9, 'clamped travel ' + (v.x - x0).toFixed(2));
});
await test('trample: mass >= 8 moving > 1.5 u/s deals 18 dps to mass < 3 units and shoves them; trample event rate-limited', () => {
  const w = world({ rules: noMorale }); sentinels(w); const log = record(w, ['trample', 'unit_hit']);
  const e = add(w, 'war_elephant', 0, 0, 0), s = pin(add(w, 'peltast', 1, 1.2, 0)); s.hp = s.hpMax = 1000; e.se[SE.ROOT] = 0;
  const heavy = add(w, 'minotaur', 0, 0, 10), hv = pin(add(w, 'hoplite', 1, 1, 10));                      // mass 6 < 8: no trample
  for (let i = 0; i < 30; i++) { rehash(w); e.speedNow = 3; heavy.speedNow = 3; e.x = 0; s.x = 1.2; hv.x = 1; w._separate(1 / 30); }
  assert.ok(1000 - s.hp > 10 && 1000 - s.hp < 25, 'about 18 dps for one second ' + (1000 - s.hp).toFixed(1));
  assert.ok(count(log, 'trample') <= 5, 'rate limited ' + count(log, 'trample')); assert.equal(hv.hp, hv.hpMax);
});
await test('friendly fire: AoE hurts everyone; arrows only with rules.friendlyFire; unit_kill.friendly + friendly_fire event', () => {
  const w = world({ rules: noMorale }); sentinels(w); const log = record(w, ['friendly_fire', 'unit_kill', 'unit_hit']);
  const c = pin(add(w, 'catapult', 0, 0, 0)), ally = pin(add(w, 'hoplite', 0, 6, 0)), foe = pin(add(w, 'hoplite', 1, 6.5, 1));
  rehash(w); const h = newHit(); h.type = 'blunt'; h.cause = 'aoe'; w.areaDamage(c, 6.2, 0.5, 4, 70, h, -1);
  assert.ok(ally.hp < ally.hpMax && foe.hp < foe.hpMax, 'aoe hurts allies too'); assert.ok(count(log, 'friendly_fire') >= 1);
  ally.hp = 5; const h2 = newHit(); h2.type = 'blunt'; h2.aoe = true; h2.noBlock = true; h2.at(6, 0); applyDamage(w, c, ally, 70, h2);
  assert.ok(log.some((e) => e[0] === 'unit_kill' && e[1].friendly === true), 'friendly kill flag');
  // arrows: allies are skipped unless friendlyFire
  const mk = (ff) => { const x = world({ rules: Object.assign({ friendlyFire: ff }, noMorale) }); sentinels(x); const a = pin(add(x, 'cretan_archer', 0, 0, 0)), f = pin(add(x, 'hoplite', 0, 8, 0)); f.hp = f.hpMax = 1e5; f.heading = Math.PI; const e = pin(add(x, 'hoplite', 1, 20, 0)); a.target = e; for (let i = 0; i < 80; i++) { const p = x.proj.fire(a, e, e.x, e.z, 1.5); } run(x, 3); return f.hp < f.hpMax; };
  assert.equal(mk(false), false, 'no friendly arrows by default'); assert.equal(mk(true), true, 'friendlyFire lets arrows hit allies');
});
await test('S14: 20 holding hoplites beat 10 charging companion cavalry in >= 70% of 20 seeds', () => {
  let cavLose = 0, deaths = 0;
  for (let s = 1; s <= 20; s++) {
    const w = buildWorld({ arena: 'arenalab', seed: s, a: { groups: sampleGroups([['hoplite', 20]]) }, b: { groups: sampleGroups([['companion_cavalry', 10]]) } });
    for (const sq of w.squads) sq.order = sq.team === 0 ? 'hold' : 'advance';
    const r = runBattle(w, { maxTime: 150 }); if (r.winner === 0) cavLose++; deaths += 10 - w.units.filter((u) => u.team === 1).length;
  }
  assert.ok(cavLose >= 14, 'cavalry lost ' + cavLose + '/20'); assert.ok(deaths / 20 >= 7, 'cavalry casualties ' + (deaths / 2).toFixed(0) + '%');
});

// -------------------------------------------------------------------------------------------- morale (S15)
await test('morale: -2 per ally dying within 6 u (x1.5 for officers), -6 flanked, -0.9/s below 30% hp, +1.2/s near an officer; rout <= 15, rally > 40 for 3 s; fearless ignores', () => {
  const w = world({ rules: { morale: true } }); sentinels(w);
  const u = pin(add(w, 'hoplite', 0, 0, 0)), ally = pin(add(w, 'peltast', 0, 3, 0)), off = pin(add(w, 'centurion', 0, 4, 1)), far = pin(add(w, 'peltast', 0, 20, 0)); add(w, 'hoplite', 1, 30, 0); rehash(w);
  const m0 = u.morale; ally.hp = 1; applyDamage(w, null, ally, 50, Object.assign(newHit(), { noBlock: true }));
  assert.ok(Math.abs((m0 - u.morale) - 2) < 1e-6, 'ally death -2: ' + (m0 - u.morale)); assert.equal(far.morale, 100);
  const m1 = u.morale; rehash(w); off.hp = 1; applyDamage(w, null, off, 500, Object.assign(newHit(), { noBlock: true }));
  assert.ok(Math.abs((m1 - u.morale) - 3) < 1e-6, 'officer death -3: ' + (m1 - u.morale));
  // flanked: backstab hit
  const f = pin(add(w, 'hoplite', 0, 10, 10)), att = pin(add(w, 'hoplite', 1, 10, 8.8)); f.heading = Math.PI / 2 + 0.0; f.heading = 0;   // f faces +z, attacker at -z side: behind
  const fm = f.morale; applyDamage(w, att, f, 5, Object.assign(newHit(), { noBlock: true, noCrit: true, kb: 0 })); assert.ok(fm - f.morale >= 6 - 1e-6, 'flanked -6 ' + (fm - f.morale));
  // low hp drain and officer regen
  const lo = pin(add(w, 'hoplite', 0, -10, -10)); lo.morale = 80; lo.hp = lo.hpMax * 0.2; run(w, 3); assert.ok(lo.morale < 80 - 3 * 0.4, 'low hp drains ' + lo.morale.toFixed(1));
  const near = pin(add(w, 'hoplite', 0, 4, 3)); near.morale = 50; const solo = pin(add(w, 'hoplite', 0, -20, 20)); solo.morale = 50; const o2 = pin(add(w, 'strategos', 0, 5, 3)); run(w, 3);
  assert.ok(near.morale - solo.morale > 3, 'officer regen ' + (near.morale - solo.morale).toFixed(1));
  // rout and rally
  const log = record(w, ['unit_rout', 'unit_rally']); const r = pin(add(w, 'hoplite', 0, -15, 0)); r.morale = 14; run(w, 0.2);
  assert.equal(r.state, ST.ROUT); assert.equal(count(log, 'unit_rout'), 1);
  r.se[SE.ROOT] = 0; r.morale = 45; run(w, 2.5); assert.equal(r.state, ST.ROUT, 'must stay > 40 for 3 s'); run(w, 1.5); assert.notEqual(r.state, ST.ROUT); assert.equal(count(log, 'unit_rally'), 1);
  const sp = pin(add(w, 'spartan', 0, -15, 3)); sp.morale = 0; run(w, 0.5); assert.notEqual(sp.state, ST.ROUT, 'fearless');
});
await test('S15 army collapse: below 20% alive (>= 6 at start) morale melts and survivors rout, flee and do not attack; battle ends by rout', () => {
  const w = world({ rules: { morale: true } }); const log = record(w, ['unit_rout', 'battle_end']);
  const mine = block(w, 'hoplite', 0, 10, -14, 0), foes = block(w, 'hoplite', 1, 30, 28, 20); foes.forEach(pin); rehash(w);
  for (let i = 0; i < 9; i++) w.stats[0].alive, mine[i].hp = 1;       // wounded line dies quickly
  for (let i = 0; i < 9; i++) { const h = newHit(); h.noBlock = true; applyDamage(w, foes[0], mine[i], 100, h); }
  assert.equal(w.stats[0].alive, 1);
  run(w, 11);
  assert.ok(count(log, 'unit_rout') >= 1 || w.state === 'ended', 'the lone survivor routs');
  const rt = mine[9]; if (rt.alive) { assert.equal(rt.anim.clip, 'rout'); const t = rt.target; assert.ok(!t || rt.state === ST.ROUT, 'routed units do not attack'); }
  run(w, 8); assert.equal(w.state, 'ended', 'ended by rout'); const be = log.find((e) => e[0] === 'battle_end')[1]; assert.equal(be.winner, 1);
});

finish('formulas');
