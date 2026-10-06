// Army generator + deployment layout + counter table. Pure, deterministic (seeded RNG only).
//
//   generateArmy({faction|'mixed', budget, style, difficulty, against?, arena?, zone?, enemyZone?, team?, seed?, defs?, tier?, ids?}) -> Army
//   layoutArmy(groups, zone, enemyZone, defs, opts) -> placements[]   (battle order: front line, skirmishers/archers, support, siege; cavalry on the wings)
//   counterTable(defs) -> { [defId]: { counters:[ids], prey:[ids] } }     scoutReport(defs, counts, enemyCounts) -> Advice[]
//
// Army = { faction, style, budget, cost, groups:[{defId,n}], placements:[{defId,x,z,heading,squadId,formation,order}], counts:{defId:n}, total, types }
// Budget compliance: cost <= budget and budget - cost < cost of the cheapest unit in the pool (S20); <= 16 types; <= tier cap units.
// Placements are what Game/setup stores (app_contract §3); World.addPlacements(team, placements) turns them back into squads.

import { RNG } from '../core/rng.js';
import { buildSimDefs } from './defs.js';
import { power, dpsOf } from './power.js';

export const TIER_CAPS = { potato: 100, papyrus: 200, marble: 300, olympian: 400 };
export const MAX_TYPES = 16;
export const STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];
export const BUDGET_PRESETS = { skirmish: 3000, battle: 8000, war: 20000, epic: 40000 };

let _defs = null;
function defsOr(d) { return d || _defs || (_defs = buildSimDefs()); }

/** Placement brush size by role (units.md "Placement defaults"). */
export function squadSize(def) {
  if (def.role === 'monster' || def.role === 'hero' || def.role === 'siege') return 1;
  if (def.role === 'swarm') return 8;
  if (def.id === 'battle_goat') return 3;
  if (def.role === 'beast') return 6;
  if (def.role === 'cavalry') return 5;
  if (def.role === 'ranged') return 8;
  if (def.role === 'support') return 4;
  return 9;
}

// ---------------------------------------------------------------------------------------------------------------- layout
const LINE_OF = (d) => {
  if (d.role === 'siege') return 'rear';
  if (d.role === 'support') return 'support';
  if (d.role === 'cavalry') return d.tags.includes('archer') && !d.melee ? 'second' : (d.ai && d.ai.style === 'skirmish' ? 'skirm' : 'flank');
  if (d.role === 'ranged') return d.tags.includes('skirmisher') ? 'skirm' : 'second';
  return 'front';
};

/** Axis-aligned deployment frame for a team: forward axis points at the enemy zone. depth = extent along forward, width = lateral extent. */
export function zoneFrame(zone, enemyZone) {
  const dx = enemyZone.x - zone.x, dz = enemyZone.z - zone.z;
  if (Math.abs(dx) >= Math.abs(dz)) { const s = dx >= 0 ? 1 : -1; return { fx: s, fz: 0, heading: s > 0 ? Math.PI / 2 : -Math.PI / 2, depth: zone.w, width: zone.d, cx: zone.x, cz: zone.z }; }
  const s = dz >= 0 ? 1 : -1;
  return { fx: 0, fz: s, heading: s > 0 ? 0 : Math.PI, depth: zone.d, width: zone.w, cx: zone.x, cz: zone.z };
}

/**
 * Deploy groups in a battle order inside the zone. groups: [{defId, n}] (order irrelevant). Returns placements (all inside the zone).
 * Lines (front to back): front (melee/hero/monster/swarm/beast), skirmishers, archers, support, siege; cavalry waits on both wings.
 */
export function layoutArmy(groups, zone, enemyZone, defs, opts = {}) {
  defs = defsOr(defs);
  const fr = zoneFrame(zone, enemyZone || { x: -zone.x, z: -zone.z });
  const margin = 0.9;
  const out = [];
  let squadId = opts.firstSquad || 1;
  const lat0 = Math.max(2, fr.width / 2 - margin);
  const lines = { front: [], flank: [], skirm: [], second: [], support: [], rear: [] };
  for (const g of groups) { if (g.n <= 0) continue; const d = defs[g.defId]; lines[LINE_OF(d)].push({ defId: g.defId, n: g.n, def: d }); }
  // centre-out order: most expensive per unit in the middle
  const centreOut = (arr) => { const s = arr.slice().sort((a, b) => b.def.cost - a.def.cost || (a.defId < b.defId ? -1 : 1)); const res = []; s.forEach((g, i) => { if (i % 2 === 0) res.push(g); else res.unshift(g); }); return res; };
  let u = 0;                                        // depth cursor measured back from the front edge
  const place = (lineGroups, halfWidth, rankMax, gapAfter, formation, latShift, keepDepth) => {
    if (!lineGroups.length) return 0;
    const sp = Math.max(opts.spacing || 1.15, ...lineGroups.map((g) => g.def.radius * 1.77));
    const maxFiles = Math.max(2, Math.floor((2 * halfWidth) / sp));
    const total = lineGroups.reduce((s, g) => s + g.n, 0);
    const ranks = Math.max(1, Math.min(rankMax, Math.ceil(total / maxFiles)));
    const gf = lineGroups.map((g) => Math.max(1, Math.ceil(g.n / ranks)));
    const totalFiles = gf.reduce((s, a) => s + a, 0);
    const groupGap = 0.5;
    let lat = -(totalFiles * sp + (lineGroups.length - 1) * groupGap) / 2 + (latShift || 0);
    let maxRanks = 0;
    for (let gi = 0; gi < lineGroups.length; gi++) {
      const g = lineGroups[gi], files = gf[gi];
      const chunk = Math.min(files, 10);                // squads are at most 10 files wide (they wheel as separate blocks)
      let remaining = g.n, fileCursor = 0;
      while (remaining > 0) {
        const f = Math.min(chunk, files - fileCursor), nSq = Math.min(remaining, Math.max(1, f) * ranks);
        const sid = squadId++;
        for (let k = 0; k < nSq; k++) {
          const col = k % f, row = (k / f) | 0;
          maxRanks = Math.max(maxRanks, row + 1);
          out.push(mkPlacement(g.defId, fr, lat + (fileCursor + col + 0.5) * sp, u + row * sp, sid, formation, g.def));
        }
        remaining -= nSq; fileCursor += f; if (fileCursor >= files) fileCursor = 0;
      }
      lat += files * sp + groupGap;
    }
    if (!keepDepth) u += maxRanks * sp + gapAfter;
    return maxRanks * sp;
  };
  const flankTotal = lines.flank.reduce((s, g) => s + g.n, 0), frontTotal = lines.front.reduce((s, g) => s + g.n, 0);
  const frontHalf = frontTotal > 0 && flankTotal > 0 ? lat0 * 0.78 : lat0;
  place(centreOut(lines.front), frontHalf, 4, 1.4, 'line', 0, false);
  if (flankTotal > 0) {
    const left = [], right = [];
    for (const g of lines.flank) { const a = Math.ceil(g.n / 2); left.push({ defId: g.defId, n: a, def: g.def }); if (g.n - a > 0) right.push({ defId: g.defId, n: g.n - a, def: g.def }); }
    const wingW = Math.min(Math.max(3, lat0 - frontHalf + 0.5) * 2, 16);
    const saveU = u;
    u = 0;
    // wings sit level with the front rank, outside it
    const sh = frontTotal > 0 ? frontHalf + wingW / 2 + 0.2 : wingW / 2 + 0.2;
    place(left, wingW / 2, 3, 0, 'wedge', -Math.min(sh, lat0 - wingW / 2), true);
    place(right, wingW / 2, 3, 0, 'wedge', Math.min(sh, lat0 - wingW / 2), true);
    u = saveU;
  }
  place(centreOut(lines.skirm), lat0, 2, 1.6, 'line', 0, false);
  place(centreOut(lines.second), lat0, 3, 1.6, 'line', 0, false);
  place(centreOut(lines.support), lat0 * 0.7, 2, 2.0, 'block', 0, false);
  place(lines.rear, lat0, 1, 0, 'line', 0, false);
  // compress depth if the formation is deeper than the zone
  const avail = Math.max(2, fr.depth - margin * 2);
  const maxU = out.reduce((m, p) => Math.max(m, p.__u), 0);
  if (maxU > avail) { const k = avail / maxU; for (const p of out) p.__u *= k; }
  for (const p of out) finalize(p, fr, margin);
  return out;
}

function mkPlacement(defId, fr, lx, lu, sid, formation, def) {
  const order = def.ai && def.ai.style === 'flank' && def.role === 'cavalry' ? 'flank' : 'advance';
  return { defId, x: 0, z: 0, heading: fr.heading, squadId: sid, formation, order, __l: lx, __u: lu };
}
function finalize(p, fr, margin) {
  const frontDist = fr.depth / 2 - margin - p.__u;     // distance from the zone centre toward the enemy
  const hw = fr.width / 2 - 0.4;
  const l = Math.max(-hw, Math.min(hw, p.__l));
  if (fr.fx !== 0) { p.x = fr.cx + fr.fx * frontDist; p.z = fr.cz + l; } else { p.z = fr.cz + fr.fz * frontDist; p.x = fr.cx + l; }
  delete p.__l; delete p.__u;
}

// ---------------------------------------------------------------------------------------------------------------- composition
const ROLE_GROUP = (d) => {
  switch (d.role) {
    case 'melee': return 'line'; case 'ranged': return 'ranged'; case 'cavalry': return 'cav'; case 'hero': return 'hero'; case 'siege': return 'siege';
    case 'support': return 'support'; case 'monster': return 'monster'; case 'beast': return 'beast'; case 'swarm': return 'swarm'; default: return 'line';
  }
};
// budget share by role group per style (renormalised over the groups that exist in the pool)
const SHARES = {
  balanced: { line: 0.38, ranged: 0.20, cav: 0.12, hero: 0.08, siege: 0.06, support: 0.07, monster: 0.05, beast: 0.02, swarm: 0.02 },
  rush: { line: 0.38, ranged: 0.07, cav: 0.25, hero: 0.05, siege: 0.0, support: 0.02, monster: 0.06, beast: 0.12, swarm: 0.05 },
  ranged: { line: 0.28, ranged: 0.40, cav: 0.04, hero: 0.06, siege: 0.10, support: 0.10, monster: 0.0, beast: 0.0, swarm: 0.02 },
  elite: { line: 0.38, ranged: 0.06, cav: 0.18, hero: 0.20, siege: 0.0, support: 0.04, monster: 0.14, beast: 0.0, swarm: 0.0 },
  chaos: { line: 0.18, ranged: 0.14, cav: 0.12, hero: 0.10, siege: 0.06, support: 0.08, monster: 0.14, beast: 0.08, swarm: 0.10 },
};
const GROUP_MAXTYPES = { line: 3, ranged: 3, cav: 2, hero: 2, siege: 2, support: 2, monster: 2, beast: 1, swarm: 1 };

/** Threat profile of an enemy composition -> role weights (cost-weighted shares) used by the 'counter' style and the scout report. */
export function threatProfile(counts, defs) {
  defs = defsOr(defs);
  const p = { cav: 0, ranged: 0, line: 0, monster: 0, siege: 0, support: 0, swarm: 0, hero: 0, shield: 0, total: 0 };
  for (const id of Object.keys(counts)) {
    const d = defs[id]; if (!d || !counts[id]) continue;
    const w = counts[id] * d.cost;
    p.total += w;
    const g = ROLE_GROUP(d); p[g === 'beast' ? 'swarm' : g] += w;
    if (d.shield && d.shield.block >= 0.4) p.shield += w;
  }
  if (p.total > 0) for (const k of Object.keys(p)) if (k !== 'total') p[k] /= p.total;
  return p;
}

const isSpear = (d) => d.tags.includes('spear') || d.tags.includes('pike') || (d.melee && d.melee.range >= 2.0 && d.role === 'melee');
const isShielded = (d) => !!d.shield && d.shield.block >= 0.4;
/** Estimated equal-cost advantage of unit `a` over unit `b` (>1 favours a): power per cost with rock-paper-scissors tag factors. */
export function matchup(a, b) {
  let r = (power(a) / a.cost) / (power(b) / b.cost);
  const tb = b.tags;
  if (isSpear(a) && !a.tags.includes('cavalry') && tb.includes('cavalry')) r *= 2.2;
  if (a.role === 'cavalry' && (b.role === 'ranged' || b.role === 'siege' || b.role === 'support')) r *= 1.7;
  if (a.role === 'cavalry' && isSpear(b)) r *= 0.45;
  if (a.role === 'ranged' && !isShielded(b) && b.role === 'melee') r *= 1.35;
  if (a.role === 'ranged' && isShielded(b) && !tb.includes('large')) r *= 0.75;
  if (isShielded(a) && b.role === 'ranged') r *= 1.4;
  if (a.role === 'siege' && (b.role === 'melee' || b.role === 'swarm')) r *= 1.25;
  if (a.role === 'siege' && b.role === 'cavalry') r *= 0.5;
  const fires = a.abilities.some((x) => x.id === 'fire_every');
  if (tb.includes('fire_weak') && fires) r *= 1.8;
  if (tb.includes('large') && (isSpear(a) || fires)) r *= 1.4;
  if (a.role === 'monster' && (b.role === 'melee' || b.role === 'ranged' || b.role === 'swarm')) r *= 1.5;
  if (a.role === 'beast' && (b.role === 'ranged' || b.role === 'support')) r *= 1.5;
  if (a.role === 'support' && b.role === 'melee') r *= 1.3;
  if (a.role === 'swarm' && (b.role === 'siege' || b.role === 'support')) r *= 1.5;
  if (a.role === 'swarm' && b.role === 'melee') r *= 0.7;
  return r;
}

let _ct = null, _ctDefs = null;
/** { defId: {counters:[ids], prey:[ids]} } for every non-boss unit (counters beat it at >= 1.25x equal-cost advantage; prey are the ones it beats that much). */
export function counterTable(defs) {
  defs = defsOr(defs);
  if (_ct && _ctDefs === defs) return _ct;
  const ids = Object.keys(defs).filter((id) => defs[id].cost > 0);
  const out = Object.create(null);
  for (const id of ids) {
    const d = defs[id]; if (d.tags.includes('boss')) continue;
    const sc = [];
    for (const o of ids) { if (o === id) continue; sc.push([o, matchup(defs[o], d)]); }
    sc.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const counters = sc.filter((s) => s[1] >= 1.25 && !defs[s[0]].tags.includes('boss')).slice(0, 4).map((s) => s[0]);
    const prey = sc.slice().reverse().filter((s) => s[1] <= 0.8 && !defs[s[0]].tags.includes('boss')).slice(0, 4).map((s) => s[0]);
    out[id] = { counters, prey };
  }
  _ct = out; _ctDefs = defs;
  return out;
}

/**
 * Scout report data (placement screen): the composition's biggest weaknesses with counter chips. Returns [{code, severity, share, ids}] sorted by severity.
 * codes: no_anti_cav, exposed_archers, no_ranged, no_cavalry, siege_exposed, blob_vs_ranged, monster_incoming, no_support, one_note. `ids` are chips from the pool.
 */
export function scoutReport(defs, counts, enemyCounts) {
  defs = defsOr(defs);
  const mine = threatProfile(counts, defs), theirs = threatProfile(enemyCounts || {}, defs);
  const adv = [];
  const tc = Object.keys(counts).reduce((s, id) => s + (defs[id] ? counts[id] * defs[id].cost : 0), 0) || 1;
  const spears = Object.keys(counts).reduce((s, id) => s + (defs[id] && defs[id].role === 'melee' && isSpear(defs[id]) ? counts[id] * defs[id].cost : 0), 0) / tc;
  const ids = (pred) => Object.keys(defs).filter((id) => pred(defs[id])).sort((a, b) => defs[a].cost - defs[b].cost || (a < b ? -1 : 1)).slice(0, 3);
  if (theirs.cav > 0.22 && spears < 0.2) adv.push({ code: 'no_anti_cav', severity: theirs.cav - spears, share: theirs.cav, ids: ids((d) => d.role === 'melee' && isSpear(d)) });
  if (theirs.cav > 0.15 && mine.ranged > 0.3) adv.push({ code: 'exposed_archers', severity: theirs.cav * mine.ranged * 2, share: mine.ranged, ids: ids((d) => d.role === 'melee' && isSpear(d)) });
  if (mine.ranged < 0.05 && theirs.shield < 0.3 && mine.total > 0) adv.push({ code: 'no_ranged', severity: 0.3, share: mine.ranged, ids: ids((d) => d.role === 'ranged') });
  if (theirs.ranged > 0.3 && mine.cav < 0.08) adv.push({ code: 'no_cavalry', severity: theirs.ranged - mine.cav, share: theirs.ranged, ids: ids((d) => d.role === 'cavalry') });
  if (theirs.siege > 0.1 && mine.cav < 0.1) adv.push({ code: 'siege_exposed', severity: theirs.siege * 2, share: theirs.siege, ids: ids((d) => d.role === 'cavalry') });
  if (mine.line > 0.55 && theirs.siege + theirs.ranged > 0.3) adv.push({ code: 'blob_vs_ranged', severity: mine.line * 0.5, share: mine.line, ids: ids((d) => d.role === 'cavalry' || d.tags.includes('skirmisher')) });
  if (theirs.monster > 0.15) adv.push({ code: 'monster_incoming', severity: theirs.monster * 2, share: theirs.monster, ids: ids((d) => d.role === 'melee' && isSpear(d)) });
  if (mine.support < 0.02 && mine.total > 0) adv.push({ code: 'no_support', severity: 0.1, share: 0, ids: ids((d) => d.role === 'support') });
  for (const k of ['line', 'ranged', 'cav']) if (mine[k] > 0.7) adv.push({ code: 'one_note', severity: mine[k] - 0.5, share: mine[k], ids: [] });
  adv.sort((a, b) => b.severity - a.severity || (a.code < b.code ? -1 : 1));
  return adv;
}

function weightedPick(rng, items, wfn) {
  let tot = 0; const ws = items.map((it) => { const w = Math.max(0, wfn(it)); tot += w; return w; });
  if (tot <= 0) return items[(rng.next() * items.length) | 0];
  let r = rng.next() * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/**
 * Generate an army. opts: faction ('hellenes'... or 'mixed'), budget (drachmae), style (STYLES), difficulty ('easy'|'normal'|'hard'), against (counts {defId:n}
 * or groups [{defId,n}] of the opposing army: used by 'counter' and by hard difficulty), arena/zone/enemyZone/team (for placements), seed, defs,
 * tier ('potato'..'olympian') or cap, ids (allowed defIds).
 */
export function generateArmy(opts) {
  const defs = defsOr(opts.defs);
  const rng = new RNG(((opts.seed || 1) * 2654435761 + 12345) >>> 0);
  const budget = Math.max(0, opts.budget || BUDGET_PRESETS.battle);
  const cap = opts.cap || TIER_CAPS[opts.tier || 'marble'] || 300;
  const style0 = STYLES.includes(opts.style) ? opts.style : 'balanced';
  const difficulty = opts.difficulty || 'normal';
  let against = null;
  if (opts.against) against = Array.isArray(opts.against) ? opts.against.reduce((m, g) => { m[g.defId] = (m[g.defId] || 0) + g.n; return m; }, {}) : opts.against;
  const style = style0 === 'balanced' && difficulty === 'hard' && against ? 'counter' : style0;
  const typeCap = Math.min(MAX_TYPES, opts.maxTypes || (style === 'chaos' ? MAX_TYPES : 9));
  // ----- pool
  const faction = opts.faction || 'mixed';
  const allowed = opts.ids ? new Set(opts.ids) : null;
  let pool = Object.keys(defs).filter((id) => {
    const d = defs[id];
    if (!(d.cost > 0) || d.custom) return false;
    if (allowed && !allowed.has(id)) return false;
    return faction === 'mixed' || d.faction === faction;
  });
  if (!pool.length) pool = Object.keys(defs).filter((id) => defs[id].cost > 0);
  pool.sort();
  const minCost = Math.min(...pool.map((id) => defs[id].cost));
  const okFor = (id, remain) => { const d = defs[id]; if (d.tags.includes('boss') && d.cost > budget * (style === 'chaos' || style === 'elite' ? 0.45 : 0.3)) return false; return d.cost <= remain; };
  // ----- shares
  let shares = Object.assign({}, SHARES[style] || SHARES.balanced);
  if (style === 'counter') {
    const t = threatProfile(against || {}, defs);
    shares = { line: 0.25 + 0.2 * t.cav, ranged: 0.1 + 0.3 * (t.line + t.shield * 0.5), cav: 0.05 + 0.5 * (t.ranged + t.siege + t.support), hero: 0.07, siege: 0.04 + 0.2 * t.line, support: 0.05 + 0.15 * t.line, monster: 0.04 + 0.2 * t.line, beast: 0.04 + 0.2 * (t.ranged + t.support), swarm: 0.03 };
    if (t.cav > 0.25) { shares.line += 0.25; shares.cav *= 0.5; }
  }
  const groupPool = {};
  for (const id of pool) { const g = ROLE_GROUP(defs[id]); (groupPool[g] || (groupPool[g] = [])).push(id); }
  let tot = 0; for (const g of Object.keys(shares)) { if (!groupPool[g]) shares[g] = 0; tot += shares[g]; }
  if (tot <= 0) { for (const g of Object.keys(groupPool).sort()) { shares[g] = 1; tot++; } }
  // ----- unit preference by style
  const pref = (id) => {
    const d = defs[id]; let w = 1;
    if (style === 'elite') w = Math.pow(d.cost / 100, 1.2) * (d.tags.includes('elite') ? 2 : 1);
    else if (style === 'rush') w = (d.speed || 2.6) * (d.cost < 130 ? 1.4 : 1);
    else if (style === 'ranged') w = (d.ranged && !d.melee ? 2 : 1) * (d.tags.includes('archer') ? 1.5 : 1);
    else if (style === 'chaos') w = 0.4 + rng.next() * 2;
    else if (style === 'counter' && against) {
      let s = 0, n = 0;
      for (const eid of Object.keys(against)) { if (!defs[eid]) continue; s += Math.log(matchup(d, defs[eid])) * against[eid] * defs[eid].cost; n += against[eid] * defs[eid].cost; }
      w = Math.exp(n ? s / n * 1.4 : 0);
    } else w = 1 / Math.sqrt(d.cost / 100);
    if (difficulty === 'easy') w = 0.5 + rng.next();                // easy: sloppier composition
    return w;
  };
  // ----- buy
  const counts = {}; let spent = 0;
  const buy = (id, n) => { if (n <= 0) return; counts[id] = (counts[id] || 0) + n; spent += defs[id].cost * n; };
  const typesUsed = () => Object.keys(counts).length;
  const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
  const groups = Object.keys(shares).filter((g) => shares[g] > 0).sort();
  for (const g of groups) {
    const spend = budget * shares[g] / tot;
    const cands = groupPool[g].filter((id) => okFor(id, budget));
    if (!cands.length) continue;
    let k = Math.min(GROUP_MAXTYPES[g] || 2, cands.length, budget < 4000 ? 2 : 3); if (budget < 2500) k = 1;
    const chosen = [], rest = cands.slice();
    for (let i = 0; i < k && rest.length; i++) { const pick = weightedPick(rng, rest, pref); chosen.push(pick); rest.splice(rest.indexOf(pick), 1); }
    const w = chosen.map(() => 0.4 + rng.next()), wt = w.reduce((a, b) => a + b, 0);
    chosen.forEach((id, i) => {
      if (typesUsed() >= typeCap && !counts[id]) return;
      const d = defs[id];
      let n = Math.floor(spend * w[i] / wt / d.cost);
      if (d.role === 'hero') n = Math.min(n, Math.max(1, Math.floor(budget / 6000)));
      if (n === 0 && spend * w[i] / wt >= d.cost * 0.6 && d.role !== 'hero') n = 1;
      if (spent + n * d.cost > budget) n = Math.floor((budget - spent) / d.cost);
      buy(id, n);
    });
  }
  // ----- top up to within one cheapest unit of the budget (prefer types already fielded, then anything cheap)
  let guard = 0;
  while (budget - spent >= minCost && guard++ < 6000) {
    const remain = budget - spent;
    let fit = Object.keys(counts).filter((id) => defs[id].cost <= remain && !defs[id].tags.includes('boss') && defs[id].role !== 'hero').sort();
    if (total() >= cap) {
      // at the unit cap: swap the cheapest fielded unit for the most expensive pool unit that still fits
      const cheapId = Object.keys(counts).filter((id) => !defs[id].tags.includes('boss')).sort((a, b) => defs[a].cost - defs[b].cost || (a < b ? -1 : 1))[0];
      if (!cheapId) break;
      const better = pool.filter((id) => !defs[id].tags.includes('boss') && defs[id].role !== 'hero' && defs[id].cost > defs[cheapId].cost && defs[id].cost - defs[cheapId].cost <= remain).sort((a, b) => defs[b].cost - defs[a].cost || (a < b ? -1 : 1))[0];
      if (!better || (typesUsed() >= typeCap && !counts[better])) break;
      counts[cheapId]--; if (!counts[cheapId]) delete counts[cheapId]; spent -= defs[cheapId].cost; buy(better, 1);
      continue;
    }
    if (!fit.length) {
      fit = pool.filter((id) => defs[id].cost <= remain && okFor(id, remain) && typesUsed() < typeCap);
      if (!fit.length) break;
    }
    buy(weightedPick(rng, fit, (id) => pref(id) * (1 / Math.sqrt(defs[id].cost / 80))), 1);
  }
  while (total() > cap) { const id = Object.keys(counts).sort((a, b) => defs[a].cost - defs[b].cost)[0]; counts[id]--; spent -= defs[id].cost; if (!counts[id]) delete counts[id]; }
  const groupsOut = Object.keys(counts).sort().map((id) => ({ defId: id, n: counts[id] }));
  const army = { faction, style, budget, cost: spent, groups: groupsOut, counts, total: total(), types: groupsOut.length, placements: [], difficulty };
  if (opts.zone || opts.arena) {
    const zone = opts.zone || opts.arena.zones[opts.team === 1 ? 'B' : 'A'], ez = opts.enemyZone || opts.arena.zones[opts.team === 1 ? 'A' : 'B'];
    army.placements = layoutArmy(groupsOut, zone, ez, defs, { seed: opts.seed || 1, firstSquad: opts.firstSquad || 1 });
  }
  return army;
}

/** Cost of a composition [{defId,n}]. */
export function groupsCost(groups, defs) { defs = defsOr(defs); return groups.reduce((s, g) => s + g.n * defs[g.defId].cost, 0); }
export { dpsOf };
