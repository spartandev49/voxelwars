// S13 AI behaviour: shooters hold at 0.85 x range and kite inside minRange; cavalry prefer archers/siege; spears prefer cavalry; hold-style squads advance as a formation.
import { world, add, block, pin, run, rehash, record, count, test, finish, assert, ST, defs } from './_util.mjs';
import { pickTarget } from '../../src/sim/ai.js';
import { buildWorld } from '../../tools/lib/harness.mjs';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const calm = () => world({ rules: { morale: false, timeLimit: 0 }, size: 'medium' });

await test('S13: an archer takes its stand at 0.85 x range of a stationary target (and keeps shooting from there)', () => {
  const w = calm(); const R = defs.cretan_archer.ranged.range;
  const a = add(w, 'cretan_archer', 0, -30, 0), tgt = pin(add(w, 'hoplite', 1, 8, 0)); tgt.hp = tgt.hpMax = 1e9;
  const log = record(w, ['projectile_launch']);
  run(w, 14);
  const d = dist(a, tgt);
  assert.ok(d <= R * 0.9 && d >= R * 0.8, 'standoff ' + d.toFixed(1) + ' for range ' + R + ' (0.85 x = ' + (R * 0.85).toFixed(1) + ')');
  assert.ok(count(log, 'projectile_launch', (e) => e.team === 0) >= 4, 'it shoots while holding');
});
await test('S13: a skirmisher kites when an enemy closes inside its comfort gap; a siege engine backs off inside minRange', () => {
  const w = calm();
  const p = add(w, 'peltast', 0, 0, 0), h = add(w, 'hoplite', 1, 6, 0); h.hp = h.hpMax = 1e9; p.hp = p.hpMax = 1e9;
  let min = 99; run(w, 4, () => { min = Math.min(min, dist(p, h) - p.radius - h.radius); return false; });
  assert.ok(p.x < -3, 'the peltast gave ground (x=' + p.x.toFixed(1) + ')');
  const w2 = calm();
  const b = add(w2, 'ballista', 0, 0, 0), e = pin(add(w2, 'legionary', 1, 3.5, 0)); e.hp = e.hpMax = 1e9;
  const g0 = dist(b, e); run(w2, 3);
  assert.ok(dist(b, e) > g0 + 0.5, 'the ballista opens the distance inside minRange: ' + g0.toFixed(1) + ' -> ' + dist(b, e).toFixed(1));
});
await test('S13: target scoring: cavalry prefer archers and siege over infantry; spears prefer cavalry; nearest wins otherwise', () => {
  const w = calm();
  const cav = add(w, 'companion_cavalry', 0, 0, 0), inf = pin(add(w, 'legionary', 1, 6, 0)), arc = pin(add(w, 'cretan_archer', 1, 7.5, 3));
  rehash(w); assert.equal(pickTarget(w, cav), arc, 'cavalry choose the archer 7.5 u away over the infantryman 6 u away');
  arc.hp = 0; arc.alive = false; const sg = pin(add(w, 'catapult', 1, 7, -3)); rehash(w);
  assert.equal(pickTarget(w, cav), sg, 'cavalry choose siege over infantry');
  const w2 = calm();
  const sp = add(w2, 'hoplite', 0, 0, 0), e1 = pin(add(w2, 'legionary', 1, 5, 0)), e2 = pin(add(w2, 'equites', 1, 7, 2));
  rehash(w2); assert.equal(pickTarget(w2, sp), e2, 'a spearman chooses the cavalryman');
  e2.alive = false; rehash(w2); assert.equal(pickTarget(w2, sp), e1, 'and the nearest infantryman when no horse is around');
});
await test('COORD: a hold-style squad (hoplites) advances as a formation unless ordered to hold (and stays put when ordered)', () => {
  const run1 = (order) => {
    const w = buildWorld({ arena: 'marathon', size: 'medium', seed: 4, rules: { morale: false, timeLimit: 0 }, a: { groups: [{ defId: 'hoplite', n: 24 }] }, b: { groups: [{ defId: 'legionary', n: 12 }] } });
    for (const u of w.units) if (u.team === 1) { pin(u); u.hp = u.hpMax = 1e9; }
    const mine = w.units.filter((u) => u.team === 0);
    if (order) for (const s of w.squads) if (s.team === 0) s.order = order;
    const x0 = mine.reduce((a, u) => a + u.x, 0) / mine.length; run(w, 8);
    return mine.reduce((a, u) => a + u.x, 0) / mine.length - x0;
  };
  const adv = run1(null), hold = run1('hold');
  assert.ok(adv > 8, 'default order: the hoplite formation marched ' + adv.toFixed(1) + ' u in 8 s');
  assert.ok(Math.abs(hold) < 2, 'hold order: it stayed (' + hold.toFixed(1) + ')');
});

finish('sim ai');
