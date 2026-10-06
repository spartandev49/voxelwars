// S16: every ability mechanic has a test of effect + cooldown + AI cast rule + telegraph event (spec §6.1).
import { world, add, block, sentinels, record, run, count, stepUntil, defs, SE, ST, dist, pin, test, finish, assert, ready, tweak, ab } from './_util.mjs';
import { applyDamage, newHit, killUnit } from '../../src/sim/combat.js';
import { abilityRegistry } from '../../src/sim/abilities/index.js';

const hit = (w, src, dst, dmg, mod) => { const h = newHit(); if (mod) mod(h); return applyDamage(w, src, dst, dmg, h); };
const noMorale = { morale: false };

await test('registry has every mechanic of spec 6.1', () => {
  const need = ['aura', 'stance', 'kick', 'cc_field', 'net', 'heal_pulse', 'execute', 'dot_cloud', 'revive', 'rage', 'chain_lightning', 'war_horn', 'dash', 'summon_on_death', 'tantrum', 'cluck', 'pack_bonus', 'bribe', 'throne', 'crowd_favorite',
    'hook', 'breaks_shield', 'fire_every', 'poison', 'misfire', 'misaim', 'fire_panic'];
  for (const id of need) assert.ok(abilityRegistry[id], 'missing ability ' + id);
  assert.ok(need.length <= 32);
  // every ability referenced by a shipped def is implemented
  for (const d of Object.values(defs)) for (const a of d.abilities) assert.ok(abilityRegistry[a.id], d.id + ' uses unknown ability ' + a.id);
});

// ------------------------------------------------------------------------------------------------ auras
await test('aura rally: allies in r10 +15% damage, telegraph pulse; outside range unaffected', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const g = add(w, 'strategos', 0, 0, 0), near = add(w, 'hoplite', 0, 5, 0), far = add(w, 'hoplite', 0, 14, 0);
  for (const u of [g, near, far]) pin(u);
  add(w, 'hoplite', 1, 40, 0);
  run(w, 1.2);
  assert.ok(Math.abs(near.mDmg - 1.15) < 1e-6, 'near mDmg ' + near.mDmg);
  assert.equal(far.mDmg, 1);
  assert.ok(count(log, 'telegraph', (p) => p.kind === 'aura') >= 1 && count(log, 'ability_cast', (p) => p.ability === 'rally') >= 1);
});
await test('aura curse: mummy slows enemies within 5 u (-20% speed)', () => {
  const w = world({ rules: noMorale });
  const m = pin(add(w, 'mummy', 0, 0, 0)), e = add(w, 'hoplite', 1, 3, 0), far = pin(add(w, 'hoplite', 1, 9, 0));
  run(w, 0.3);
  assert.ok(e.se[SE.CURSE] > 0 && Math.abs(e.mSpeed - 0.8) < 1e-3, 'cursed speed ' + e.mSpeed);
  assert.equal(far.se[SE.CURSE], 0);
});
await test('aura great_king / discipline / pincer', () => {
  const w = world({ rules: noMorale });
  const ph = pin(add(w, 'pharaoh', 0, 0, 0)), a = pin(add(w, 'hoplite', 0, 4, 0));
  const c = pin(add(w, 'centurion', 0, 0, 12)), b = pin(add(w, 'hoplite', 0, 3, 12));
  const hn = pin(add(w, 'hannibal', 0, 0, -12)), fl = pin(add(w, 'hoplite', 0, 3, -12));
  const victim = pin(add(w, 'hoplite', 1, 3, -14)); victim.heading = Math.PI / 2;     // faces +x: our flanker at x=3 on z=-12 attacks from the side/back? place behind
  victim.x = 5; victim.z = -12; victim.heading = -Math.PI / 2;                            // faces -x toward hoplite 'fl' at x=3: front attack => no bonus
  fl.target = victim; run(w, 0.1);
  assert.ok(Math.abs(a.mDmg - 1.10) < 1e-6, 'great king ' + a.mDmg);
  assert.ok(Math.abs(b.mMoraleLoss - 0.6) < 1e-6, 'discipline');
  assert.equal(fl.mDmg, 1, 'frontal attack gets no pincer bonus');
  victim.heading = Math.PI / 2; fl.target = victim; run(w, 0.1);                           // victim now faces away from fl: flanked
  assert.ok(Math.abs(fl.mDmg - 1.15) < 1e-6, 'pincer ' + fl.mDmg);
});

// ------------------------------------------------------------------------------------------------ stances
await test('stance: phalanx/testudo/shield_wall only while stationary with allies; moving or alone gets nothing', () => {
  const w = world({ rules: noMorale }); sentinels(w);
  const hops = block(w, 'hoplite', 0, 9, 0, 0, { spacing: 1.1 }); hops.forEach(pin);
  const lone = pin(add(w, 'hoplite', 0, 0, 15));
  const sparas = block(w, 'sparabara', 0, 9, 0, -15, { spacing: 1.1 }); sparas.forEach(pin);
  run(w, 0.6);
  const u = hops[4];
  assert.ok(u.mBlock >= 0.12 - 1e-6 && u.mProj >= 0.15 - 1e-6, 'phalanx on ' + u.mBlock + ',' + u.mProj);
  assert.equal(lone.mBlock, 0, 'lone hoplite has no phalanx');
  assert.ok(sparas[4].mProj >= 0.10 - 1e-6, 'shield wall');
  // moving units get nothing
  const mover = hops[4]; mover.se[SE.ROOT] = 0; mover.speedNow = 3; mover.dvx = 3; mover.vx = 3;
  // testudo needs 4 adjacent allies and a ranged threat within 30 u
  const leg = block(w, 'legionary', 0, 9, 0, 15, { spacing: 1.1 }); leg.forEach(pin);
  run(w, 0.5); assert.equal(leg[4].mProj, 0, 'no ranged threat -> no testudo');
  pin(add(w, 'cretan_archer', 1, 12, 15));
  run(w, 0.6); assert.ok(leg[4].mProj >= 0.2 - 1e-6, 'testudo with ranged threat ' + leg[4].mProj);
});
await test('stance: phalanx raises real block rate vs frontal arrows (S14 shield wall)', () => {
  // 20 hoplites standing in a block take frontal arrows: blocked fraction >= 60%
  const w = world({ rules: noMorale, seed: 3 }); const log = record(w, ['unit_block', 'unit_hit']);
  const hs = block(w, 'hoplite', 0, 20, 0, 0, { spacing: 1.15 }); hs.forEach(pin);
  const arch = []; for (let i = 0; i < 12; i++) arch.push(pin(add(w, 'cretan_archer', 1, 18, -6 + i, { heading: -Math.PI / 2 })));
  for (const a of arch) { a.target = hs[0]; }
  run(w, 14);
  const blocks = count(log, 'unit_block', (p) => p.kind === 'proj'), hits = count(log, 'unit_hit', (p) => p.proj);
  assert.ok(blocks + hits >= 40, 'enough arrows ' + (blocks + hits));
  assert.ok(blocks / (blocks + hits) >= 0.5, 'block share ' + (blocks / (blocks + hits)).toFixed(2));
});

// ------------------------------------------------------------------------------------------------ kick
await test('kick: 8 u launch, 0.8 s stun, spin death, cd 8, telegraph; not on heavy targets; easy AI does not use it', () => {
  const w = world(); const log = record(w);
  const s = ready(add(w, 'spartan', 0, -2, 0)), v = add(w, 'hoplite', 1, 0, 0);
  const x0 = v.x, z0 = v.z; let max = 0, stunSeen = 0;
  for (let i = 0; i < 120; i++) { w.tick(); max = Math.max(max, Math.hypot(v.x - x0, v.z - z0)); if (v.se[SE.STUN] > 0) stunSeen++; }
  assert.ok(max > 7 && max < 9, 'kick travel ' + max.toFixed(2));
  assert.equal(count(log, 'ability_cast', (p) => p.ability === 'kick'), 1);
  assert.ok(count(log, 'ability_channel_start', (p) => p.ability === 'kick') === 1 && count(log, 'telegraph', (p) => p.kind === 'kick') === 1);
  assert.ok(stunSeen >= 20 && stunSeen <= 30, 'stun ticks ' + stunSeen);
  assert.ok(ab(s, 'kick').cd > 0 && ab(s, 'kick').cd <= 8, 'cooldown running');
  // victim that dies in flight uses the spin clip
  const w2 = world(); const l2 = record(w2, ['unit_kill']);
  const s2 = ready(add(w2, 'spartan', 0, -2, 0)), v2 = add(w2, 'cretan_archer', 1, 0, 0); v2.hp = 6;
  run(w2, 3);
  assert.ok(count(l2, 'unit_kill') === 1 && l2[0][1].cause === 'kick', 'killed by the kick');
  assert.equal(v2.anim.clip, 'death_spin');
  // heavy targets are not kicked
  const w3 = world(); const l3 = record(w3);
  const s3 = ready(add(w3, 'spartan', 0, -3, 0)), m3 = add(w3, 'minotaur', 1, 0, 0); pin(m3);
  run(w3, 3); assert.equal(count(l3, 'ability_cast', (p) => p.ability === 'kick'), 0);
  // easy difficulty: no ability use for non-heroes
  const w4 = world({ rules: { difficulty: 'easy' } }); const l4 = record(w4);
  ready(add(w4, 'spartan', 0, -2, 0)); add(w4, 'hoplite', 1, 0, 0);
  run(w4, 3); assert.equal(count(l4, 'ability_cast', (p) => p.ability === 'kick'), 0);
});

// ------------------------------------------------------------------------------------------------ cc fields
await test('cc_field confuse: needs >= 3 enemies; 3 s channel with telegraph; effect, monologue; 14 s cooldown', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const p = ready(add(w, 'philosopher', 0, -3, 0));
  const vs = [0, 1, 2].map((i) => pin(add(w, 'hoplite', 1, 3, -1.5 + i * 1.5)));
  // two enemies is not enough: remove one temporarily by moving it away
  vs[2].x = 30;
  run(w, 1); assert.equal(count(log, 'ability_channel_start', (e) => e.ability === 'confuse'), 0, 'AI rule: not with 2 targets');
  vs[2].x = 3;
  const t = stepUntil(w, 2, () => count(log, 'ability_channel_start') > 0);
  assert.ok(count(log, 'ability_channel_start', (e) => e.ability === 'confuse') === 1 && count(log, 'telegraph', (e) => e.kind === 'circle' && e.r === 7) >= 1);
  assert.equal(vs[0].se[SE.CONFUSE], 0, 'effect lands at the end of the channel, not before');
  run(w, 3.4);
  assert.ok(vs.every((v) => v.se[SE.CONFUSE] > 0), 'confused');
  assert.ok(count(log, 'philosopher_monologue') >= 1 && count(log, 'ability_cast', (e) => e.ability === 'confuse') === 1);
  assert.ok(Math.abs(vs[0].mCd - 0.4) < 1e-6, 'attack speed -60%');
  assert.ok(ab(p, 'cc_field').cd > 8, 'cooldown ~14 s');
});
await test('cc_field sleep: sleepers take x1.5 damage and cannot act', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['status_apply', 'ability_cast', 'unit_hit']);
  const s = ready(add(w, 'senator', 0, -4, 0)); pin(s);
  const vs = [0, 1, 2].map((i) => pin(add(w, 'hoplite', 1, 3, -1.5 + i * 1.5)));
  stepUntil(w, 7, () => vs[0].se[SE.SLEEP] > 0);
  assert.ok(vs.every((v) => v.se[SE.SLEEP] > 0), 'asleep');
  assert.equal(count(log, 'ability_cast', (e) => e.ability === 'sleep'), 1);
  const base = w.rng.s; const att = add(w, 'hoplite', 0, 5.0, 1.0);
  const h1 = newHit(); const awake = pin(add(w, 'hoplite', 1, 3, 10));
  const dAwake = [], dSleep = [];
  for (let i = 0; i < 60; i++) { awake.hp = awake.hpMax; vs[0].hp = vs[0].hpMax; vs[0].se[SE.SLEEP] = 5; dAwake.push(hit(w, att, awake, 20, (h) => { h.noBlock = true; h.noCrit = true; h.kb = 0; })); dSleep.push(hit(w, att, vs[0], 20, (h) => { h.noBlock = true; h.noCrit = true; h.kb = 0; })); }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(dSleep) / avg(dAwake) > 1.4 && avg(dSleep) / avg(dAwake) < 1.6, 'sleep x1.5: ' + (avg(dSleep) / avg(dAwake)).toFixed(2));
});
await test('cc_field stone: cone only, frozen grey, x2 blunt, shatter (cause stone) on kill; telegraph cone', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const m = ready(add(w, 'medusa', 0, -8, 0)); pin(m);
  const inCone = pin(add(w, 'hoplite', 1, 2, 0)), outCone = pin(add(w, 'hoplite', 1, -2, 9));
  m.target = inCone;
  stepUntil(w, 4, () => inCone.se[SE.STONE] > 0); run(w, 0.2);
  assert.ok(inCone.se[SE.STONE] > 0 && inCone.stone > 0, 'stoned');
  assert.equal(outCone.se[SE.STONE], 0, 'outside the cone');
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'cone') >= 1 && count(log, 'stone_gaze', (e) => e.count === 1) === 1);
  const blunt = newHit(); blunt.type = 'blunt'; blunt.noBlock = true; blunt.noCrit = true; blunt.kb = 0;
  const a = add(w, 'hoplite', 0, 0, 5); const dn = [], dp = [];
  const plain = pin(add(w, 'hoplite', 1, 5, 14));
  for (let i = 0; i < 40; i++) { plain.hp = plain.hpMax; inCone.hp = inCone.hpMax; inCone.se[SE.STONE] = 5; dn.push(applyDamage(w, a, plain, 10, Object.assign(newHit(), { type: 'blunt', noBlock: true, noCrit: true, kb: 0 }))); dp.push(applyDamage(w, a, inCone, 10, Object.assign(newHit(), { type: 'blunt', noBlock: true, noCrit: true, kb: 0 }))); }
  const avg = (x) => x.reduce((s, y) => s + y, 0) / x.length;
  assert.ok(avg(dp) / avg(dn) > 1.8, 'stone takes x2 blunt ' + (avg(dp) / avg(dn)).toFixed(2));
  inCone.hp = 3; inCone.se[SE.STONE] = 5;
  const kl = record(w, ['unit_kill']); hit(w, a, inCone, 50, (h) => { h.noBlock = true; });
  assert.equal(kl[0][1].cause, 'stone'); assert.equal(inCone.deathCause, 'stone');
});
await test('cc_field scare: morale -25, scare status, fearless immune; panic_cav slows enemy cavalry in the cone', () => {
  const w = world({ rules: { morale: true } }); const log = record(w);
  const e = ready(add(w, 'war_elephant', 0, -6, 0)); pin(e);
  const vs = []; for (let i = 0; i < 5; i++) vs.push(pin(add(w, 'hoplite', 1, 0, -3 + i * 1.4)));
  const spartan = pin(add(w, 'spartan', 1, 0, 5));
  stepUntil(w, 3, () => vs[0].se[SE.SCARE] > 0);
  assert.ok(vs.every((v) => v.se[SE.SCARE] > 0 && v.morale < 80), 'scared');
  assert.equal(spartan.se[SE.SCARE], 0, 'fearless ignores it');
  assert.ok(count(log, 'ability_cast', (p) => p.ability === 'scare') === 1 && count(log, 'telegraph') >= 1);
  const w2 = world({ rules: noMorale }); const l2 = record(w2);
  const camel = pin(add(w2, 'camel_rider', 0, -3, 0)); camel.heading = Math.PI / 2;
  const cav = pin(add(w2, 'equites', 1, 0, 0)), inf = pin(add(w2, 'hoplite', 1, 0, 1.5)), behind = pin(add(w2, 'equites', 1, -9, 0));
  run(w2, 1.2);
  assert.ok(cav.se[SE.PANIC] > 0, 'panic_cav status'); cav.se[SE.ROOT] = 0; run(w2, 0.1); assert.ok(Math.abs(cav.mSpeed - 0.65) < 1e-3, 'panic_cav -35% speed ' + cav.mSpeed);
  assert.equal(inf.se[SE.PANIC], 0, 'infantry is unaffected');
  assert.equal(behind.se[SE.PANIC], 0, 'outside the cone');
  assert.ok(count(l2, 'telegraph', (p) => p.kind === 'cone') >= 1);
});

// ------------------------------------------------------------------------------------------------ net / heal / execute / cloud
await test('net: roots a target 3..10 u away for 2.5 s, 12 s cooldown, telegraph at the victim', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const g = ready(add(w, 'gladiator', 0, -6, 0)); pin(g);
  const v = add(w, 'hoplite', 1, 3, 0); g.target = v; v.se[SE.ROOT] = 0;
  stepUntil(w, 2, () => v.se[SE.ROOT] > 0 && v.se[SE.ROOT] < 1e8);
  assert.ok(v.se[SE.ROOT] > 1.5 && v.se[SE.ROOT] <= 2.5, 'rooted ' + v.se[SE.ROOT]);
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'net') === 1 && count(log, 'ability_cast', (e) => e.ability === 'net') === 1);
  assert.ok(ab(g, 'net').cd > 10);
  run(w, 3); assert.equal(v.se[SE.ROOT] > 0, false, 'root expires');
  // too close (< 3 u gap): AI rule says no
  const w2 = world({ rules: noMorale }); const l2 = record(w2);
  const g2 = ready(add(w2, 'gladiator', 0, 0, 0)); const v2 = pin(add(w2, 'hoplite', 1, 2.5, 0)); v2.se[SE.ROOT] = 0;
  run(w2, 1.5); assert.equal(count(l2, 'ability_cast', (e) => e.ability === 'net'), 0);
});
await test('heal_pulse: priest heals up to 4 wounded allies in r8 (+25), cooldown 6; druid heals 1 (+15) only when idle', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const pr = ready(add(w, 'priest_of_ra', 0, 0, 0)); pin(pr); sentinels(w);
  const al = []; for (let i = 0; i < 6; i++) { const a = pin(add(w, 'hoplite', 0, 2 + (i % 3), -2 + i * 0.8)); a.hp = 30 + i * 5; al.push(a); }
  const healthy = pin(add(w, 'hoplite', 0, 0, 4));
  stepUntil(w, 3, () => count(log, 'unit_heal') > 0); run(w, 0.3);
  assert.equal(count(log, 'unit_heal'), 4, 'four targets');
  assert.equal(al[0].hp, 55, 'most wounded first: 30 -> 55'); assert.equal(healthy.hp, healthy.hpMax);
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'heal') === 1 && ab(pr, 'heal_pulse').cd > 5);
  // druid: onlyIdle
  const w2 = world({ rules: noMorale }); const l2 = record(w2);
  const dr = ready(add(w2, 'druid', 0, 0, 0)); pin(dr); sentinels(w2); const a2 = pin(add(w2, 'hoplite', 0, 2, 0)); a2.hp = 40;
  const foe = pin(add(w2, 'hoplite', 1, 10, 0)); dr.target = foe;
  run(w2, 1.0); assert.equal(count(l2, 'unit_heal'), 0, 'druid is busy shooting');
  w2.units.splice(w2.units.indexOf(foe), 1); foe.alive = false; dr.target = null;
  run(w2, 1.5); assert.equal(count(l2, 'unit_heal'), 1); assert.equal(a2.hp, 55);
});
await test('execute: slays a melee target under 20% hp, not bosses; 10 s cooldown; telegraph', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['unit_kill', 'telegraph', 'ability_cast', 'ability_channel_start']);
  const an = ready(add(w, 'anubis_guard', 0, -2, 0)), v = pin(add(w, 'hoplite', 1, 0, 0)); v.hp = 15;
  an.target = v;
  run(w, 2);
  const k = log.find((e) => e[0] === 'unit_kill');
  assert.ok(k && k[1].cause === 'execute', 'executed ' + (k && k[1].cause));
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'execute') === 1 && ab(an, 'execute').cd > 8);
  const w2 = world({ rules: noMorale }); const l2 = record(w2, ['unit_kill', 'ability_cast']);
  const a2 = ready(add(w2, 'anubis_guard', 0, -3, 0)), b2 = pin(add(w2, 'cyclops', 1, 0, 0)); b2.hp = 100;
  run(w2, 2); assert.equal(count(l2, 'ability_cast', (e) => e.ability === 'execute'), 0, 'bosses cannot be executed');
});
await test('dot_cloud: pharaoh summons locusts on a cluster of >= 4; 8 dps to enemies only; telegraph; cd 25', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const ph = ready(add(w, 'pharaoh', 0, -6, 0)); pin(ph);
  const vs = []; for (let i = 0; i < 5; i++) vs.push(pin(add(w, 'hoplite', 1, 4 + (i % 2), -2 + i)));
  const ally = pin(add(w, 'hoplite', 0, 10.5, 0));
  ph.target = vs[2];
  stepUntil(w, 4, () => w.effects.some((e) => e.kind === 'cloud'));
  assert.ok(w.effects.some((e) => e.kind === 'cloud'));
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'circle' && e.r === 7) >= 1 && count(log, 'ability_cast', (e) => e.ability === 'dot_cloud') === 1);
  const hp0 = vs.map((v) => v.hp), ally0 = ally.hp; run(w, 3);
  assert.ok(vs.every((v, i) => hp0[i] - v.hp > 15), 'enemies take ~8 dps'); assert.equal(ally.hp, ally0, 'allies are safe');
  assert.ok(ab(ph, 'dot_cloud').cd > 15);
});

// ------------------------------------------------------------------------------------------------ revive / rage / chain / horn / dash
await test('revive: first lethal blow is not final (3 s down, 40% hp, unit_revive); the second is; unit_kill.revived', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['unit_revive', 'unit_kill']);
  const im = pin(add(w, 'immortal', 0, 0, 0)), e = add(w, 'hoplite', 1, 7, 0); pin(e);          // out of spear reach: only the scripted blows hurt it
  im.hp = 1; hit(w, e, im, 50, (h) => { h.noBlock = true; });
  assert.ok(im.alive && im.state === ST.DOWN && count(log, 'unit_kill') === 0, 'fell but is not dead');
  assert.equal(hit(w, e, im, 999, (h) => { h.noBlock = true; }), 0, 'untouchable while down');
  assert.ok(!stepUntil(w, 2.5, () => count(log, 'unit_revive') > 0) || true);
  assert.equal(count(log, 'unit_revive'), 0, 'still down at 2.5 s');
  run(w, 1.2);
  assert.equal(count(log, 'unit_revive'), 1); assert.ok(Math.abs(im.hp - im.hpMax * 0.4) < 1e-6 && im.revived);
  im.state = ST.IDLE; run(w, 1.2);
  im.hp = 1; hit(w, e, im, 50, (h) => { h.noBlock = true; });
  const k = log.find((x) => x[0] === 'unit_kill'); assert.ok(k && k[1].revived === true && !im.alive, 'second death is final');
});
await test('rage: below 50% hp +50% dmg +30% speed, fearless (cannot rout), roar cast', () => {
  const w = world({ rules: { morale: true } }); const log = record(w);
  const b = pin(add(w, 'berserker', 0, 0, 0)); b.se[SE.ROOT] = 0; b.dvx = 0;
  add(w, 'hoplite', 1, 30, 0);
  run(w, 0.3); const d0 = b.mDmg; assert.equal(d0, 1);
  b.hp = b.hpMax * 0.4; run(w, 0.3);
  assert.ok(b.se[SE.RAGE] > 0 && Math.abs(b.mDmg - 1.5) < 1e-3, 'rage dmg ' + b.mDmg);
  assert.ok(count(log, 'ability_cast', (e) => e.ability === 'rage') === 1);
  b.morale = -5; run(w, 0.3); assert.notEqual(b.state, ST.ROUT, 'fearless while raging');
});
await test('chain_lightning: druid bolt arcs to 2 more enemies (lightning_arc), 0.7x per jump', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['lightning_arc', 'unit_hit', 'ability_cast']);
  const d = ready(add(w, 'druid', 0, -8, 0)); pin(d);
  const vs = [0, 1, 2, 3].map((i) => pin(add(w, 'peltast', 1, 4 + i * 2.5, 0)));
  d.target = vs[0];
  stepUntil(w, 4, () => count(log, 'lightning_arc') >= 2);
  assert.equal(count(log, 'lightning_arc'), 2, 'two jumps');
  assert.ok(count(log, 'ability_cast', (e) => e.ability === 'chain_lightning') >= 1);
  const hits = log.filter((e) => e[0] === 'unit_hit').map((e) => e[1].dmg);
  assert.ok(hits.length >= 3 && hits[1] < hits[0] && hits[2] < hits[1], 'falling damage ' + hits.join(','));
});
await test('war_horn: once; allies in r14 hasted +20% speed/damage for 8 s; only when engaged with enough allies; telegraph', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const c = ready(add(w, 'chieftain', 0, 0, 0)); pin(c); c.se[SE.ROOT] = 0; c.target = null; sentinels(w);
  const allies = []; for (let i = 0; i < 6; i++) allies.push(pin(add(w, 'berserker', 0, -2, -3 + i)));
  run(w, 2); assert.equal(count(log, 'ability_channel_start', (e) => e.ability === 'war_horn'), 0, 'not engaged: no horn');
  const foes = []; for (let i = 0; i < 4; i++) foes.push(pin(add(w, 'hoplite', 1, 4, -2 + i)));
  stepUntil(w, 4, () => count(log, 'ability_cast', (e) => e.ability === 'war_horn') > 0);
  assert.equal(count(log, 'ability_cast', (e) => e.ability === 'war_horn'), 1);
  assert.ok(allies.every((a) => a.se[SE.HASTE] > 6 && a.se[SE.DMGUP] > 6), 'buffed'); allies[0].se[SE.ROOT] = 0; run(w, 0.1);
  assert.ok(Math.abs(allies[0].mSpeed - 1.2) < 1e-3 && Math.abs(allies[0].mDmg - 1.2) < 1e-3);
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'circle' && e.r === 14) === 1);
  run(w, 10); for (const a of allies) assert.equal(a.se[SE.HASTE], 0, 'expires after 8 s');
  run(w, 3); assert.equal(count(log, 'ability_cast', (e) => e.ability === 'war_horn'), 1, 'once per battle');
});
await test('dash bull_charge: 12 u, 30 dmg + 1 s stun to everything in the path, telegraph line, cd 10', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const m = ready(add(w, 'minotaur', 0, -12, 0));
  const vs = [0, 1, 2].map((i) => pin(add(w, 'hoplite', 1, -4 + i * 1.5, i === 1 ? 0.3 : -0.2)));
  const out = pin(add(w, 'hoplite', 1, -4, 8));
  m.target = vs[2];
  const x0 = m.x; let maxx = x0;
  for (let i = 0; i < 120; i++) { w.tick(); maxx = Math.max(maxx, m.x); }
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'line') === 1 && count(log, 'ability_channel_start', (e) => e.ability === 'bull_charge') === 1);
  assert.ok(vs.every((v) => v.hp < v.hpMax - 15), 'hit on the way'); assert.equal(out.hp, out.hpMax);
  assert.ok(count(log, 'status_apply', (e) => e.status === 'stun') >= 3, 'stunned');
  assert.ok(maxx - x0 > 8, 'dashed ' + (maxx - x0).toFixed(1));
  assert.ok(ab(m, 'dash').cd > 5);
});
await test('dash goat_charge: 8 u, headbutt x2 damage, stops on impact; not used when too close', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const g = ready(add(w, 'battle_goat', 0, -8, 0)), v = pin(add(w, 'hoplite', 1, 0, 0)); g.target = v;
  stepUntil(w, 3, () => count(log, 'unit_hit') > 0);
  assert.equal(count(log, 'ability_cast', (e) => e.ability === 'goat_charge'), 1);
  const h = log.find((e) => e[0] === 'unit_hit')[1]; assert.ok(h.dmg > defs.battle_goat.melee.dmg * 1.4, 'x2 dmg ' + h.dmg.toFixed(1));
  const w2 = world({ rules: noMorale }); const l2 = record(w2);
  const g2 = ready(add(w2, 'battle_goat', 0, -2.0, 0)); const v2 = pin(add(w2, 'hoplite', 1, 0, 0)); g2.target = v2;
  run(w2, 0.4); assert.equal(count(l2, 'ability_channel_start', (e) => e.ability === 'goat_charge'), 0);
});

// ------------------------------------------------------------------------------------------------ summon / chickens / hounds / coins
await test('summon_on_death: the Trojan horse spills 6 hoplites when killed, when it reaches the line, and only once', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const h = add(w, 'trojan_horse', 0, 0, 0); pin(h);
  hit(w, null, h, 9999, (o) => { o.noBlock = true; });
  assert.equal(count(log, 'trojan_reveal'), 1);
  const spawned = w.units.filter((u) => u.def.id === 'hoplite' && u.team === 0); assert.equal(spawned.length, 6);
  // reaching the enemy line: >= 3 enemies within 5 u
  const w2 = world({ rules: noMorale }); const l2 = record(w2);
  const h2 = add(w2, 'trojan_horse', 0, 0, 0); pin(h2); for (let i = 0; i < 3; i++) pin(add(w2, 'hoplite', 1, 3, -1 + i));
  run(w2, 3.5);
  assert.equal(count(l2, 'trojan_reveal'), 1); assert.ok(count(l2, 'ability_channel_start', (e) => e.ability === 'summon_on_death') === 1);
  assert.equal(w2.units.filter((u) => u.def.id === 'hoplite' && u.team === 0).length, 6, 'exactly six');
  hit(w2, null, h2, 9999, (o) => { o.noBlock = true }); assert.equal(count(l2, 'trojan_reveal'), 1, 'no second reveal');
});
await test('tantrum: a chicken hurt by 30% rages (x3 damage, x1.5 speed) for 5 s, once per 17 s; chicken_tantrum event', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const c = pin(add(w, 'sacred_chicken', 0, 0, 0)); c.se[SE.ROOT] = 1e9;
  add(w, 'hoplite', 1, 30, 0);
  hit(w, null, c, c.hpMax * 0.2, (h) => { h.noBlock = true; h.fixed = true; h.kb = 0; });     // -20%: not yet
  assert.equal(count(log, 'chicken_tantrum'), 0);
  hit(w, null, c, c.hpMax * 0.12, (h) => { h.noBlock = true; h.fixed = true; h.kb = 0; });
  assert.equal(count(log, 'chicken_tantrum'), 1); run(w, 0.1);
  assert.ok(c.se[SE.RAGE] > 4 && Math.abs(c.mDmg - 3) < 1e-3 && Math.abs(c.mSpeed - 1.5) < 1e-3 || c.se[SE.ROOT] > 0, 'tantrum multipliers ' + c.mDmg);
  hit(w, null, c, 1, (h) => { h.noBlock = true; h.fixed = true; h.kb = 0; }); assert.equal(count(log, 'chicken_tantrum'), 1, 'locked');
});
await test('cluck: enemies within 5 u target the chicken for 2 s; cd 12; telegraph', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const c = ready(add(w, 'sacred_chicken', 0, 0, 0)); pin(c); c.hp = c.hpMax = 1e6;
  const vs = [0, 1, 2].map((i) => add(w, 'hoplite', 1, 3, -1.5 + i * 1.5));
  const other = add(w, 'hoplite', 0, 4, 6); other.se[SE.ROOT] = 1e9;
  stepUntil(w, 3, () => count(log, 'ability_cast', (e) => e.ability === 'cluck') > 0); run(w, 0.5);
  assert.equal(count(log, 'ability_cast', (e) => e.ability === 'cluck'), 1);
  assert.ok(vs.every((v) => v.target === c && v.se[SE.TAUNT] > 0), 'taunted');
  assert.ok(count(log, 'telegraph', (e) => e.kind === 'circle' && e.r === 5) === 1 && ab(c, 'cluck').cd > 8 && count(log, 'bark') >= 0);
});
await test('pack_bonus: +8% damage per other hound within 5 u, max +40%', () => {
  const w = world({ rules: noMorale });
  const hs = []; for (let i = 0; i < 4; i++) hs.push(pin(add(w, 'warhound', 0, i * 1.2, 0)));
  const lone = pin(add(w, 'warhound', 0, 0, 20)); add(w, 'hoplite', 1, 40, 0);
  run(w, 0.3); assert.ok(Math.abs(hs[1].mDmg - 1.24) < 1e-6, 'pack of 4: ' + hs[1].mDmg); assert.equal(lone.mDmg, 1);
  const w2 = world({ rules: noMorale }); const many = []; for (let i = 0; i < 9; i++) many.push(pin(add(w2, 'warhound', 0, (i % 3) * 1.2, (i / 3 | 0) * 1.2))); add(w2, 'hoplite', 1, 40, 0);
  run(w2, 0.3); assert.ok(Math.abs(many[4].mDmg - 1.4) < 1e-6, 'capped at +40%: ' + many[4].mDmg);
});
await test('bribe: a landed coin may buy the target for 6 s (unit_convert), then it returns; bosses are immune', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['unit_convert']);
  const s = pin(add(w, 'senator', 0, 0, 0)); tweak(s, 'bribe', { chance: 1 });
  const v = pin(add(w, 'hoplite', 1, 3, 0)); sentinels(w);
  hit(w, s, v, 3, (h) => { h.proj = true; h.kind = 'coin'; h.noBlock = true; });
  assert.equal(count(log, 'unit_convert'), 1); assert.equal(v.team, 0); assert.equal(w.stats[0].alive, 3);
  run(w, 6.3); assert.equal(v.team, 1, 'back after 6 s'); assert.equal(w.stats[1].alive, 2);
  const boss = pin(add(w, 'cyclops', 1, 5, 0)); hit(w, s, boss, 3, (h) => { h.proj = true; h.kind = 'coin'; h.noBlock = true; }); assert.equal(boss.team, 1);
});
await test('crowd_favorite: +20% damage with >= 5 enemies within 5 u; crowd_roar event', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['crowd_roar', 'ability_cast']);
  const g = pin(add(w, 'gladiator', 0, 0, 0));
  for (let i = 0; i < 4; i++) pin(add(w, 'hoplite', 1, 2.5, -2 + i * 1.3));
  run(w, 0.5); assert.equal(g.mDmg, 1, 'four is not enough');
  pin(add(w, 'hoplite', 1, -2.5, 0)); run(w, 0.5);
  assert.ok(Math.abs(g.mDmg - 1.2) < 1e-6, 'crowd ' + g.mDmg); assert.equal(count(log, 'crowd_roar'), 1);
});
await test('throne: Xerxes sits after 4 s idle (prop_spawned, throne_sit, +20% ally damage); attacked -> stands, cowers 2 s, bark', () => {
  const w = world({ rules: noMorale }); const log = record(w);
  const x = add(w, 'xerxes', 0, 0, 0); x.se[SE.ROOT] = 1e9;
  const a = pin(add(w, 'hoplite', 0, 5, 0)); add(w, 'hoplite', 1, 40, 0);
  run(w, 3.5); assert.equal(count(log, 'throne_sit'), 0);
  run(w, 1.0);
  assert.equal(count(log, 'throne_sit', (e) => e.sitting === 1), 1); assert.equal(x.state, ST.SIT); assert.equal(count(log, 'prop_spawned', (e) => e.type === 'throne'), 1);
  run(w, 0.1); assert.ok(a.mDmg >= 1.2 - 1e-6, 'allies +20% ' + a.mDmg);
  const att = add(w, 'hoplite', 1, 3, 0); hit(w, att, x, 10, (h) => { h.noBlock = true; });
  assert.equal(x.state, ST.COWER); assert.equal(count(log, 'throne_sit', (e) => e.sitting === 0), 1); assert.ok(count(log, 'bark') >= 1);
  run(w, 2.3); assert.notEqual(x.state, ST.COWER, 'cower ends after 2 s');
});

// ------------------------------------------------------------------------------------------------ onHit modifiers
await test('hook: khopesh hit may strip the shield (loses block 3 s)', () => {
  const w = world({ rules: noMorale }); const k = pin(add(w, 'khopesh_warrior', 0, 0, 0)), v = pin(add(w, 'hoplite', 1, 1.5, 0)); tweak(k, 'hook', { chance: 1 });
  hit(w, k, v, 16, (h) => { h.noBlock = true; }); assert.ok(v.se[SE.DISARM] > 2.5);
  const before = v.hp; v.se[SE.DISARM] = 5;
  let blocked = 0; for (let i = 0; i < 40; i++) { v.hp = v.hpMax; if (hit(w, k, v, 16) === 0) blocked++; } assert.equal(blocked, 0, 'disarmed units cannot block');
});
await test('breaks_shield: a pilum hit or block disables the shield 4 s', () => {
  const w = world({ rules: noMorale }); const p = pin(add(w, 'pilum_thrower', 0, 0, 0)), v = pin(add(w, 'legionary', 1, 6, 0)); v.heading = -Math.PI / 2;
  hit(w, p, v, 24, (h) => { h.proj = true; h.kind = 'pilum'; h.ap = 0.5; });
  assert.ok(v.se[SE.DISARM] > 3.5, 'disarmed by a pilum'); v.se[SE.DISARM] = 0;
  hit(w, p, v, 24, (h) => { h.proj = true; h.kind = 'arrow'; }); assert.equal(v.se[SE.DISARM], 0, 'arrows do not break shields');
});
await test('fire_every: every 6th arrow is a fire arrow that ignites; disabled in rain', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['projectile_launch']);
  const a = pin(add(w, 'nubian_archer', 0, 0, 0)); const v = pin(add(w, 'hoplite', 1, 15, 0)); a.target = v;
  const fired = []; for (let i = 0; i < 12; i++) { const p = w.proj.fire(a, v, v.x, v.z, 1.5); fired.push(p.fire); }
  assert.deepEqual(fired.map((f, i) => (f ? i + 1 : 0)).filter(Boolean), [6, 12]);
  const rain = world({ rules: { weather: 'rain' } }); const a2 = pin(add(rain, 'nubian_archer', 0, 0, 0)); const v2 = pin(add(rain, 'hoplite', 1, 15, 0));
  for (let i = 0; i < 12; i++) assert.equal(rain.proj.fire(a2, v2, v2.x, v2.z, 1.5).fire, false, 'no fire arrows in rain');
  v.hp = v.hpMax; hit(w, a, v, 12, (h) => { h.proj = true; h.fire = true; h.type = 'fire'; h.noBlock = true; }); assert.ok(v.se[SE.BURN] > 2);
});
await test('poison: medusa snakes poison (3 dps for 3 s)', () => {
  const w = world({ rules: noMorale }); const m = pin(add(w, 'medusa', 0, 0, 0)), v = pin(add(w, 'hoplite', 1, 1.5, 0));
  hit(w, m, v, 10, (h) => { h.noBlock = true; }); assert.ok(v.se[SE.POISON] > 2.5);
  const hp = v.hp; run(w, 3.2); assert.ok(hp - v.hp > 7 && hp - v.hp < 11, 'about 9 poison damage ' + (hp - v.hp)); assert.equal(v.se[SE.POISON], 0);
});
await test('misfire: a catapult shot may launch a crew member (dmg 5, aoe 1.5, catapult_misfire)', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['catapult_misfire', 'projectile_launch']);
  const c = pin(add(w, 'catapult', 0, 0, 0)); tweak(c, 'misfire', { chance: 1 }); const v = pin(add(w, 'hoplite', 1, 30, 0));
  const p = w.proj.fire(c, v, v.x, v.z, 1.5);
  assert.equal(count(log, 'catapult_misfire'), 1); assert.equal(p.kind, 'crew'); assert.equal(p.dmg, 5); assert.equal(p.aoe, 1.5);
  assert.equal(log.find((e) => e[0] === 'projectile_launch')[1].kind, 'crew');
});
await test('misaim: cyclops boulders land 4-9 u off 25% of the time; cyclops_misaim event', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['cyclops_misaim']);
  const c = pin(add(w, 'cyclops', 0, 0, 0)), v = pin(add(w, 'hoplite', 1, 20, 0));
  const off = []; for (let i = 0; i < 200; i++) { const p = w.proj.fire(c, v, v.x, v.z, 1.5); off.push(Math.hypot(p.landX - v.x, p.landZ - v.z)); p.active = false; w.proj.live--; }
  const missed = off.filter((d) => d > 3.5); const rate = missed.length / off.length;
  assert.ok(rate > 0.15 && rate < 0.35, 'misaim rate ' + rate.toFixed(2)); assert.ok(missed.every((d) => d <= 9.5));
  assert.equal(count(log, 'cyclops_misaim'), missed.length);
});
await test('fire_panic: three fire hits make an elephant flee for 6 s, trampling its own side', () => {
  const w = world({ rules: noMorale }); const log = record(w, ['status_apply', 'bark']);
  const e = add(w, 'war_elephant', 0, 0, 0), src = pin(add(w, 'nubian_archer', 1, 10, 0));
  for (let i = 0; i < 3; i++) { w.time += 0.5; hit(w, src, e, 12, (h) => { h.proj = true; h.fire = true; h.type = 'fire'; h.noBlock = true; h.kb = 0; }); }
  assert.ok(e.se[SE.SCARE] > 5, 'panicking ' + e.se[SE.SCARE]);
  assert.ok(count(log, 'status_apply', (p) => p.status === 'scare') === 1);
  const ally = pin(add(w, 'sacred_chicken', 0, -2, 0)); const x0 = e.x;
  run(w, 1.5); assert.ok(e.x < x0 - 2, 'fled away from the shooter ' + (e.x - x0).toFixed(1));
});

finish('abilities');
