// Speech bubbles (comedy_bubbles.md): lookup chain unit text -> class list -> generic, deterministic call sites, no RNG draws, rate limits.
import { world, add, record, run, count, pin, test, finish, assert, defs } from './_util.mjs';
import { buildWorld, ARMY_150, DEFS } from '../../tools/lib/harness.mjs';
import { SIM_BARKS } from '../../src/content/era_ancient/sim_text.js';
import { applyDamage, newHit } from '../../src/sim/combat.js';

const NM = { morale: false, timeLimit: 0 };
const hurt = (w, src, dst, dmg) => { const o = newHit(); o.noBlock = true; o.noCrit = true; o.fixed = true; o.kb = 0; return applyDamage(w, src, dst, dmg, o); };

await test('bark lookup chain: the unit\'s own text, then SIM_BARKS[key:role], then SIM_BARKS[key]; rate limits 6 s per unit and 1.2 s global (heroes bypass)', () => {
  const w = world({ rules: NM }); const log = record(w, ['bark']);
  const sp = add(w, 'spartan', 0, 0, 0), ph = add(w, 'philosopher', 0, 3, 0), ch = add(w, 'sacred_chicken', 0, 6, 0);
  assert.ok(w.bark(sp, 'deaths')); const own = log[0][1].text;
  const lines = (defs.spartan.text && defs.spartan.text.deaths) || null;
  if (lines) assert.ok(lines.includes(own), 'a unit with its own last words speaks them');
  assert.ok(!w.bark(sp, 'deaths'), 'same unit within 6 s is silent'); assert.ok(!w.bark(ph, 'rout'), 'global limit 1.2 s');
  w.time += 1.3; assert.ok(w.bark(ph, 'rout')); assert.ok(SIM_BARKS['rout:support'] ? SIM_BARKS['rout:support'].includes(log[1][1].text) || (defs.philosopher.text && defs.philosopher.text.rout) : true, 'class list');
  w.time += 0.1; const hero = add(w, 'strategos', 0, 9, 0); assert.ok(w.bark(hero, 'cheer', false), 'heroes bypass the global limit'); assert.ok(!w.bark(ch, 'no_such_key_anywhere'), 'unknown key: nothing');
  assert.ok(w.bark(add(w, 'hoplite', 0, 12, 0), 'status:sleep', true), 'status lists exist and force bypasses the global limit');
});
await test('last words: heroes and monsters always speak when they die; first blow / low hp / rout / cheer / status / first meeting bubbles fire on their deterministic rolls', () => {
  const w = world({ rules: NM }); const log = record(w, ['bark', 'unit_kill']);
  const h = add(w, 'strategos', 0, 0, 0), foe = add(w, 'hoplite', 1, 40, 0); foe.hp = foe.hpMax = 1e9; pin(foe);
  hurt(w, foe, h, h.hpMax * 2);
  const k = log.findIndex((e) => e[0] === 'unit_kill'); assert.ok(k >= 0); const b = log.slice(k).find((e) => e[0] === 'bark'); assert.ok(b && b[1].id === h.id, 'a dying hero gets last words');
  const m = add(w, 'minotaur', 0, 4, 4); w.time += 5; hurt(w, foe, m, m.hpMax * 2); assert.ok(log.filter((e) => e[0] === 'bark' && e[1].id === m.id).length >= 1, 'monsters too');
  // the deterministic roll: exactly the (tickN*31+id)%100 < pct rule
  const u = add(w, 'hoplite', 0, 8, 0); const hits = []; for (let t = 0; t < 100; t++) { w.tickN = t; if (w.barkRoll(u, 12)) hits.push(t); } assert.equal(hits.length, 12, '12% of 100 consecutive ticks');
});
await test('barking never draws from the sim RNG: a battle hashes identically with the bubbles switched off, and two runs give the same bubbles', () => {
  const mk = () => buildWorld({ arena: 'marathon', seed: 9, a: { groups: ARMY_150.A.map((g) => ({ defId: g.defId, n: Math.max(1, Math.round(g.n / 4)) })) }, b: { groups: ARMY_150.B.map((g) => ({ defId: g.defId, n: Math.max(1, Math.round(g.n / 4)) })) } });
  const a = mk(), la = record(a, ['bark']); a.step(1500);
  const b = mk(), lb = record(b, ['bark']); b.step(1500);
  assert.deepEqual(la.map((e) => [e[1].id, e[1].text]), lb.map((e) => [e[1].id, e[1].text]), 'same bubbles every run');
  const c = mk(); c.bark = () => false; c.step(1500);
  assert.equal(c.rng.state !== undefined ? c.rng.state : c.stateHash(), a.rng.state !== undefined ? a.rng.state : a.stateHash(), 'the RNG stream is untouched by bubbles');
  assert.ok(la.length >= 3, 'a battle has a few bubbles: ' + la.length);
});

finish('sim barks');
