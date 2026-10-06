// S20 army generator (budget, zone bounds, legality, 16-type cap, tier caps, six distinct styles), counter table / scout report, stats formulas (U7), custom soldiers (U8 sample).
import { DESIGN_COSTS } from './design_costs.mjs';
import { defs, test, finish, assert, arena, world, add, run } from './_util.mjs';
import { generateArmy, layoutArmy, counterTable, scoutReport, threatProfile, STYLES, TIER_CAPS, MAX_TYPES, matchup, squadSize } from '../../src/sim/armygen.js';
import { costFormula, statsToUnitDef, validateStats, roleEfficiency, STAT_CAPS, legalAbilities, clampedCost } from '../../src/sim/stats.js';
import { power } from '../../src/sim/power.js';
import { RNG } from '../../src/core/rng.js';
import { STAT_TABLE, FACTIONS } from '../../src/content/era_ancient/stats.js';
import { abilityRegistry } from '../../src/sim/abilities/index.js';

const factions = Object.keys(FACTIONS);
await test('S20 generateArmy: budget +-cheapest unit, <= 16 types, tier cap, legal ids, deterministic, all styles x factions x budgets', () => {
  for (const faction of [...factions, 'mixed']) {
    const pool = Object.keys(defs).filter((id) => faction === 'mixed' || defs[id].faction === faction), minCost = Math.min(...pool.map((id) => defs[id].cost));
    for (const style of STYLES) for (const budget of [1500, 3000, 8000, 20000, 40000]) {
      const a = generateArmy({ faction, budget, style, seed: 3, defs, against: { hoplite: 20, companion_cavalry: 8 }, tier: 'marble' });
      assert.ok(a.cost <= budget, `${faction}/${style}/${budget}: cost ${a.cost} over budget`);
      assert.ok(budget - a.cost < minCost || a.total >= TIER_CAPS.marble || a.types >= 9, `${faction}/${style}/${budget}: leftover ${budget - a.cost} >= cheapest ${minCost} (units ${a.total}, types ${a.types})`);
      assert.ok(a.types <= MAX_TYPES && a.total <= TIER_CAPS.marble, 'caps');
      let sum = 0; for (const g of a.groups) { assert.ok(defs[g.defId] && g.n > 0 && (faction === 'mixed' || defs[g.defId].faction === faction)); sum += g.n * defs[g.defId].cost; } assert.equal(sum, a.cost);
    }
  }
  const x = generateArmy({ faction: 'romans', budget: 8000, style: 'balanced', seed: 9, defs }), y = generateArmy({ faction: 'romans', budget: 8000, style: 'balanced', seed: 9, defs }); assert.deepEqual(x.groups, y.groups, 'deterministic');
  assert.notDeepEqual(generateArmy({ faction: 'romans', budget: 8000, style: 'balanced', seed: 10, defs }).groups, x.groups, 'seed varies');
  for (const tier of ['potato', 'papyrus', 'marble', 'olympian']) { const a = generateArmy({ faction: 'mixed', budget: 40000, style: 'rush', seed: 2, defs, tier }); assert.ok(a.total <= TIER_CAPS[tier], tier + ' cap ' + a.total); assert.ok(a.cost <= 40000); }
  assert.ok(generateArmy({ faction: 'mixed', budget: 40000, style: 'chaos', seed: 5, defs, tier: 'olympian' }).types <= 16);
});
await test('S20 styles: all six produce different compositions with the intended character', () => {
  const sets = STYLES.map((style) => { const a = generateArmy({ faction: 'mixed', budget: 12000, style, seed: 4, defs, against: { hoplite: 30, medjay: 10 } }); return { style, a, p: threatProfile(a.counts, defs) }; });
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) assert.notDeepEqual(sets[i].a.counts, sets[j].a.counts, sets[i].style + ' vs ' + sets[j].style);
  const by = (s) => sets.find((x) => x.style === s);
  assert.ok(by('ranged').p.ranged > by('balanced').p.ranged, 'ranged style fields more ranged'); assert.ok(by('rush').p.cav + by('rush').p.swarm > by('balanced').p.cav + by('balanced').p.swarm - 0.05);
  const avgCost = (s) => by(s).a.cost / by(s).a.total; assert.ok(avgCost('elite') > avgCost('rush') * 1.3, 'elite is pricier per unit: ' + avgCost('elite').toFixed(0) + ' vs ' + avgCost('rush').toFixed(0));
  assert.ok(by('chaos').a.types >= by('balanced').a.types, 'chaos is more varied');
  // counter-pick: against cavalry the army fields spears; hard difficulty counters automatically
  const cav = { companion_cavalry: 20, equites: 10 };
  const c = generateArmy({ faction: 'mixed', budget: 12000, style: 'counter', seed: 1, defs, against: cav }); const spearShare = Object.keys(c.counts).reduce((s, id) => s + (defs[id].tags.includes('spear') && defs[id].role === 'melee' ? c.counts[id] * defs[id].cost : 0), 0) / c.cost;
  assert.ok(spearShare > 0.2, 'counter vs cavalry fields spears: ' + spearShare.toFixed(2));
  const hard = generateArmy({ faction: 'mixed', budget: 12000, style: 'balanced', difficulty: 'hard', seed: 1, defs, against: cav }); assert.equal(hard.style, 'counter');
});
await test('layout: placements inside the owning zone on every arena, facing the enemy, formation presets, no overlap inside a squad', () => {
  for (const recipe of ['marathon', 'thermopylae', 'colosseum', 'nile', 'giza', 'persepolis', 'carthage', 'teutoburg', 'alpine', 'olympus', 'troy', 'styx', 'cyclops', 'oasis', 'arenalab']) {
    const a = arena(recipe, 'medium', 5);
    for (const team of [0, 1]) {
      const zone = team === 0 ? a.zones.A : a.zones.B, ez = team === 0 ? a.zones.B : a.zones.A;
      const army = generateArmy({ faction: 'mixed', budget: 12000, style: 'balanced', seed: 6, defs, arena: a, team, tier: 'marble' });
      assert.ok(army.placements.length === army.total, 'every unit placed');
      for (const p of army.placements) {
        assert.ok(Math.abs(p.x - zone.x) <= zone.w / 2 + 0.01 && Math.abs(p.z - zone.z) <= zone.d / 2 + 0.01, `${recipe} team ${team}: ${p.defId} at ${p.x.toFixed(1)},${p.z.toFixed(1)} outside zone`);
        const dx = ez.x - zone.x, dz = ez.z - zone.z; const fx = Math.sin(p.heading), fz = Math.cos(p.heading); assert.ok(fx * dx + fz * dz > 0, 'faces the enemy zone'); assert.ok(['line', 'wedge', 'block'].includes(p.formation) && ['advance', 'flank'].includes(p.order));
      }
      const bySq = new Map(); for (const p of army.placements) { (bySq.get(p.squadId) || bySq.set(p.squadId, []).get(p.squadId)).push(p); }
      for (const g of bySq.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) assert.ok(Math.hypot(g[i].x - g[j].x, g[i].z - g[j].z) >= 0.85 * (defs[g[i].defId].radius + defs[g[j].defId].radius) - 1e-6, recipe + ' squad overlap');
    }
  }
  assert.equal(squadSize(defs.hoplite), 9); assert.equal(squadSize(defs.cretan_archer), 8); assert.equal(squadSize(defs.companion_cavalry), 5); assert.equal(squadSize(defs.sacred_chicken), 8); assert.equal(squadSize(defs.battle_goat), 3);
});
await test('counter table: every non-boss unit has a counter and a prey; scout report flags cavalry-vs-archers and missing anti-cavalry', () => {
  const t = counterTable(defs);
  let strong = 0, n = 0;
  for (const id of Object.keys(defs)) { if (defs[id].tags.includes('boss')) continue; n++; assert.ok(t[id].counters.length >= 1, id + ' has no counter'); assert.ok(t[id].prey.length >= 1, id + ' has no prey'); assert.ok(!t[id].counters.includes(id) && !t[id].prey.includes(id)); if (t[id].strong) strong++; }
  assert.ok(strong / n >= 0.6, 'most units have a clear (>= 1.25x) counter: ' + strong + '/' + n);
  assert.ok(t.companion_cavalry.counters.some((c) => defs[c].tags.includes('spear')), 'spears counter cavalry'); assert.ok(t.cretan_archer.counters.some((c) => defs[c].role === 'cavalry' || defs[c].shield || defs[c].role === 'beast'), 'cavalry/shields counter archers');
  assert.ok(matchup(defs.hoplite, defs.companion_cavalry) > 1.25);
  const rep = scoutReport(defs, { cretan_archer: 30, peltast: 10, hoplite: 5 }, { companion_cavalry: 15, equites: 10 }); assert.ok(rep.length >= 1 && rep.some((r) => r.code === 'exposed_archers' || r.code === 'no_anti_cav'), rep.map((r) => r.code).join());
  assert.ok(rep[0].ids.length >= 1 && rep[0].ids.every((id) => defs[id]), 'counter chips'); assert.deepEqual(scoutReport(defs, { hoplite: 10, cretan_archer: 6, philosopher: 2, companion_cavalry: 3 }, { hoplite: 10 }).filter((r) => r.code === 'no_anti_cav'), []);
});
await test('costFormula (U7): hoplite = 100 +- 5, monotonic in every stat, deterministic; spec table within tolerance', () => {
  assert.ok(Math.abs(costFormula(defs.hoplite) - 100) <= 5);
  const base = (o) => { const d = JSON.parse(JSON.stringify(defs.hoplite)); Object.assign(d, o); return d; };
  let prev = 0; for (const hp of [50, 80, 110, 160, 220]) { const c = costFormula(base({ hp })); assert.ok(c > prev, 'hp monotonic'); prev = c; }
  prev = 0; for (const armor of [0, 0.1, 0.3, 0.5, 0.7]) { const c = costFormula(base({ armor })); assert.ok(c > prev); prev = c; }
  prev = 0; for (const dmg of [5, 10, 14, 20, 30]) { const d = base({}); d.melee.dmg = dmg; const c = costFormula(d); assert.ok(c > prev, 'dmg monotonic'); prev = c; }
  prev = 0; for (const cd of [2.4, 1.6, 1.2, 0.8, 0.5]) { const d = base({}); d.melee.cd = cd; const c = costFormula(d); assert.ok(c > prev, 'attack speed monotonic'); prev = c; }
  prev = 0; for (const speed of [1.5, 2, 2.6, 3.2, 4]) { const c = costFormula(base({ speed })); assert.ok(c > prev, 'speed monotonic'); prev = c; }
  let worst = 0, off = []; for (const id of Object.keys(defs)) { const r = costFormula(defs[id]) / defs[id].cost; const e = Math.abs(r - 1); if (e > 0.35) off.push(id + ' ' + r.toFixed(2)); worst = Math.max(worst, e); }
  assert.equal(off.length, 0, 'formula within 35% of the shipped costs, off: ' + off.join(', '));
  // shipped costs stay within 15% of the design table (spec/units.md)
  const design = DESIGN_COSTS;
  for (const [id, c] of Object.entries(design)) assert.ok(Math.abs(defs[id].cost / c - 1) <= 0.15 + 1e-9, id + ' cost ' + defs[id].cost + ' vs design ' + c);
  assert.equal(Object.keys(design).length, 43); assert.ok(Object.keys(defs).length === 43);
});
await test('custom soldiers (U8 sample): point-buy validation, derived stats, ability legality, role efficiency cap 1.35x, radius rules, runs in the sim', () => {
  assert.equal(validateStats({ hp: 30, damage: 30, attackSpeed: 20, speed: 20, armor: 20, range: 10, morale: 10 }).ok, false, '140 points > 100');
  assert.ok(validateStats({ hp: 15, damage: 15, attackSpeed: 10, speed: 10, armor: 10, range: 5, morale: 5 }).ok); assert.ok(!validateStats({ hp: 31, damage: 0, attackSpeed: 0, speed: 0, armor: 0, range: 0, morale: 0 }).ok); assert.ok(!validateStats({}).ok);
  const mk = (main, off, stats, abilities, body) => statsToUnitDef({ id: 'cs_x', name: 'Sir Chadius', blueprint: { main, off, body: { type: body || 'average' } }, stats, abilities, ai: 'charge' });
  const z = { hp: 0, damage: 0, attackSpeed: 0, speed: 0, armor: 0, range: 0, morale: 0 };
  const base = mk('dory', 'hoplon', z), buff = mk('dory', 'hoplon', Object.assign({}, z, { hp: 30, damage: 30, attackSpeed: 20, speed: 20 }));
  assert.ok(buff.hp > base.hp && buff.melee.dmg > base.melee.dmg && buff.melee.cd < base.melee.cd && buff.speed > base.speed && buff.cost > base.cost, 'stats feed the def and the cost');
  assert.equal(mk('dory', 'hoplon', z).radius, 0.65, 'big shield => radius >= .65'); assert.equal(mk('gladius', 'buckler', z, [], 'slim').radius, 0.5); assert.equal(mk('gladius', 'none', z, [], 'stocky').radius, 0.62);
  assert.deepEqual(mk('gladius', 'none', z, ['kick', 'rage', 'net']).abilities.map((a) => a.id), ['kick', 'rage'], 'at most two abilities'); assert.deepEqual(mk('bow', 'none', z, ['kick']).abilities, [], 'kick needs a melee weapon');
  assert.ok(mk('bow', 'none', z).ranged && mk('bow', 'none', z).role === 'ranged'); assert.ok(legalAbilities('cast').includes('heal_pulse'));
  assert.ok(mk('dory', 'none', Object.assign({}, z, { range: 10 })).melee.range <= defs.hoplite.melee.range + 1.01 + 0.5);
  // fuzz sample (the 5,000 sample is in tools/balance.mjs): efficiency cap, compile-ability, sim survives
  const rng = new RNG(2024); const weapons = ['dory', 'gladius', 'greataxe', 'club', 'bow', 'javelin', 'scepter', 'sarissa', 'axe']; const offs = ['none', 'hoplon', 'buckler', 'scutum', 'pavise', 'wicker'];
  for (let i = 0; i < 300; i++) {
    const st = {}; let left = 100; for (const k of Object.keys(STAT_CAPS)) { const v = Math.min(left, Math.floor(rng.next() * (STAT_CAPS[k] + 1))); st[k] = v; left -= v; }
    const abil = []; for (const a of ['kick', 'rage', 'net', 'execute', 'heal_pulse', 'war_horn', 'cluck', 'revive']) if (rng.next() < 0.3) abil.push(a);
    const d = mk(rng.pick(weapons), rng.pick(offs), st, abil, rng.pick(['slim', 'average', 'stocky']));
    assert.ok(Number.isFinite(d.cost) && d.cost >= 10 && d.radius >= 0.3 && d.radius <= 0.7 && d.hp > 0);
    assert.ok(power(d) / d.cost <= 1.35 * roleEfficiency(d.role) + 1e-9, 'efficiency cap ' + (power(d) / d.cost / roleEfficiency(d.role)).toFixed(2));
    for (const a of d.abilities) assert.ok(abilityRegistry[a.id], 'ability ' + a.id + ' exists');
  }
  const w = world({ defs: Object.assign(Object.create(null), defs, { cs_x: buff }) }); const u = add(w, 'cs_x', 0, -2, 0); add(w, 'hoplite', 1, 2, 0); run(w, 12); assert.ok(u.dmgDealt > 0 || !u.alive, 'a custom soldier fights');
});

finish('armygen');
