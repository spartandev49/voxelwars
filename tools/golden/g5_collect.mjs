// G5 customs collector (docs/eras/spec/VF.md 3.6.2 "G5": 200 random customs from RNG(8008) and their costs). The shape of the 200 soldiers is the one of the U8 fuzzer
// (tests/editors/soldier/u8_fuzz.test.mjs): randomBlueprint(rng), a random point-buy walk over STAT_KEYS (<= caps, total <= 100), 0-2 legal abilities, an AI style, a height,
// and in one case of five a radius override. `g5Inputs(T)` generates them from a tree (the baseline when recording); `g5Rows(T, customs)` derives the numbers on a tree.
// The record stores the INPUTS (the 200 CustomSoldier objects after a canonical JSON round trip) and the derived rows, so the test replays the recorded soldiers on the
// live tree: new eras (more parts, new random draws) cannot move it, only a change of the Ancient costing, stats or power code can.
// Row = [id, cost, clamped, role, hp, armor, speed, radius, scale, dmg, cd, range, moraleBonus, power, efficiency, rev]  (everything the Workshop shows next to the cost).
import { openTree } from './tree.mjs';
import { sha256, norm } from './common.mjs';
import { canonicalJSON } from '../lib/records.mjs';

export const G5_SEED = 8008;
export const G5_N = 200;
export const ROW_FIELDS = ['id', 'cost', 'clamped', 'role', 'hp', 'armor', 'speed', 'radius', 'scale', 'dmg', 'cd', 'range', 'moraleBonus', 'power', 'efficiency', 'rev'];

async function load(T) {
  const [C, B, R, S, P] = await Promise.all([T.src('custom'), T.src('blueprints'), T.src('rng'), T.src('simStats'), T.src('power')]);
  return { C, B, RNG: R.RNG, S, P };
}

/** The 200 CustomSoldier objects, as the U8 fuzzer draws them (same call order on the rng), JSON-normalised. */
export async function g5Inputs(T) {
  const L = await load(T), rng = new L.RNG(G5_SEED), out = [];
  for (let i = 0; i < G5_N; i++) {
    const bp = L.B.randomBlueprint(rng, { name: 'G5 ' + i }); bp.id = 'cs_g5' + i;
    const st = {}; let left = 100; for (const k of L.C.STAT_KEYS) { const v = Math.min(left, rng.int(0, L.S.STAT_CAPS[k])); st[k] = v; left -= v; }
    const legal = L.C.legalAbilityIds(bp), abil = []; for (let j = rng.int(0, 2); j > 0 && legal.length; j--) { const a = rng.pick(legal); if (abil.indexOf(a) < 0) abil.push(a); }
    out.push({ v: 1, id: bp.id, name: 'G5 ' + i, blueprint: bp, stats: st, abilities: abil, ai: rng.pick(L.C.AI_STYLES), height: rng.range(0.9, 1.2), radius: rng.chance(0.2) ? rng.range(0, 2) : undefined, text: {} });
  }
  return JSON.parse(canonicalJSON(norm(out)));
}

/** Derived rows of the given customs on a tree. */
export async function g5Rows(T, customs) {
  const L = await load(T);
  return customs.map((cs) => {
    const e = L.C.evaluate(JSON.parse(JSON.stringify(cs))), d = e.def;
    return [cs.id, e.cost, d.clamped ? 1 : 0, e.role, e.hp, e.armor, e.speed, e.radius, e.scale, e.dmg, e.cd, e.range, e.moraleBonus, e.power, e.efficiency, d.rev];
  });
}

export const summarise = (rows) => {
  const costs = rows.map((r) => r[1]), roles = {};
  for (const r of rows) roles[r[3]] = (roles[r[3]] || 0) + 1;
  return { n: rows.length, minCost: Math.min(...costs), maxCost: Math.max(...costs), sumCost: costs.reduce((a, b) => a + b, 0), clamped: rows.filter((r) => r[2]).length, roles, costsSha256: sha256(JSON.stringify(costs)), rowsSha256: sha256(JSON.stringify(rows)) };
};

export async function collectG5(worktree) {
  const T = await openTree(worktree, { regime: 'baked' });
  const customs = await g5Inputs(T), rows = await g5Rows(T, customs);
  return { data: { seed: G5_SEED, n: G5_N, fields: ROW_FIELDS, customs, rows, summary: summarise(rows) } };
}
