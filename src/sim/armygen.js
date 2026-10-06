// Army generator + deployment layout. Pure, deterministic (seeded RNG only).
//
//   generateArmy({faction|'mixed', budget, style, difficulty, against?, zone?, team?, seed?, defs?, tier?}) -> Army
//   layoutArmy(groups, zone, team, defs, opts) -> placements[]      (formation presets: front line / skirmish line / flanks / rear)
//   counterTable(defs) -> { [defId]: { counters:[ids], prey:[ids] } }  (used by the Scout report)
//   scoutReport(defs, army/counts, against) -> Advice[]
//
// Army = { faction, style, budget, cost, groups:[{defId,n}], placements:[{defId,x,z,heading,squadId,formation,order}], counts:{defId:n}, total, types }
// Placements are what Game/setup stores (spec app_contract §3): {defId, x, z, heading, squadId?, formation?, order?}.
// World.addPlacements(team, placements) turns them back into squads.

import { RNG } from '../core/rng.js';
import { STAT_TABLE, FACTIONS } from '../content/era_ancient/stats.js';
import { buildSimDefs } from './defs.js';

export const TIER_CAPS = { potato: 100, papyrus: 200, marble: 300, olympian: 400 };
export const MAX_TYPES = 16;
export const STYLES = ['balanced', 'rush', 'ranged', 'elite', 'chaos', 'counter'];

let _defs = null;
function defsOr(d) { return d || _defs || (_defs = buildSimDefs()); }

// squad sizes by role (placement brush counts, units.md "Placement defaults")
export function squadSize(def) {
  if (def.role === 'monster' || def.role === 'hero' || def.role === 'siege') return 1;
  if (def.role === 'swarm') return 8;
  if (def.role === 'beast') return def.tags.includes('animal') && def.id === 'battle_goat' ? 3 : 6;
  if (def.role === 'cavalry') return 5;
  if (def.role === 'ranged') return 8;
  if (def.role === 'support') return 4;
  return 9;
}

const LINE_OF = (d) => {
  if (d.role === 'siege') return 'rear';
  if (d.role === 'support') return 'support';
  if (d.role === 'cavalry') return d.tags.includes('archer') && !d.melee ? 'second' : 'flank';
  if (d.role === 'ranged') return d.ai && d.ai.style === 'skirmish' && d.tags.includes('skirmisher') ? 'skirm' : (d.ai && d.ai.style === 'skirmish' ? 'second' : 'second');
  return 'front';
};

/** Axis-aligned deployment frame for a team: forward axis points at the enemy zone. */
export function zoneFrame(zone, enemyZone) {
  const dx = enemyZone.x - zone.x, dz = enemyZone.z - zone.z;
  const alongX = Math.abs(dx) >= Math.abs(dz);
  if (alongX) { const s = dx >= 0 ? 1 : -1; return { fx: s, fz: 0, heading: s > 0 ? Math.PI / 2 : -Math.PI / 2, depth: zone.w, width: zone.d, cx: zone.x, cz: zone.z }; }
  const s = dz >= 0 ? 1 : -1;
  return { fx: 0, fz: s, heading: s > 0 ? 0 : Math.PI, depth: zone.d, width: zone.w, cx: zone.x, cz: zone.z };
}

/**
 * Deploy groups in a battle order inside the zone. groups: [{defId, n}] (order irrelevant).
 * Returns placements. Lines (front to back): front (melee/hero/monster/swarm/beast), skirm+second (ranged), support, rear (siege);
 * cavalry sits on both flanks beside the front line.
 */
export function layoutArmy(groups, zone, enemyZone, defs, opts = {}) {
  defs = defsOr(defs);
  const fr = zoneFrame(zone, enemyZone || { x: -zone.x, z: -zone.z });
  const spacing0 = opts.spacing || 1.15;
  const margin = 1.2;
  const out = [];
  let squadId = opts.firstSquad || 1;
  const rng = new RNG((opts.seed || 1) * 31 + 7);
  const lat0 = fr.width / 2 - margin;         // half lateral extent usable
  // bucket groups into lines
  const lines = { front: [], flank: [], skirm: [], second: [], support: [], rear: [] };
  for (const g of groups) { if (g.n <= 0) continue; const d = defs[g.defId]; lines[LINE_OF(d)].push({ defId: g.defId, n: g.n, def: d }); }
  // centre-out order: most expensive per unit in the middle
  const centreOut = (arr) => { const s = arr.slice().sort((a, b) => b.def.cost - a.def.cost); const res = []; s.forEach((g, i) => { if (i % 2 === 0) res.push(g); else res.unshift(g); }); return res; };
  // vertical (depth) cursor measured back from the front edge
  let u = 0.0;
  const place = (lineGroups, flankHalfWidth, rankMax, gapAfter, wantFormation, opts2 = {}) => {
    if (!lineGroups.length) return 0;
    const sp = spacing0;
    const maxFiles = Math.max(2, Math.floor((2 * flankHalfWidth) / sp));
    const total = lineGroups.reduce((s, g) => s + g.n, 0);
    const ranks = Math.max(1, Math.min(rankMax, Math.ceil(total / maxFiles)));
    // files per group
    const gf = lineGroups.map((g) => Math.max(1, Math.ceil(g.n / ranks)));
    const totalFiles = gf.reduce((s, a) => s + a, 0);
    const groupGap = 0.6;
    let lat = -(totalFiles * sp + (lineGroups.length - 1) * groupGap) / 2 + (opts2.latShift || 0);
    let maxRanks = 0;
    for (let gi = 0; gi < lineGroups.length; gi++) {
      const g = lineGroups[gi], files = gf[gi];
      // chunk into squads along the lateral direction (<= 10 files each)
      const chunk = Math.min(files, 10);
      let remaining = g.n, fileCursor = 0;
      while (remaining > 0) {
        const f = Math.min(chunk, files - fileCursor, Math.max(1, remaining));
        const nSq = Math.min(remaining, f * ranks);
        const sid = squadId++;
        for (let k = 0; k < nSq; k++) {
          const col = k % f, row = (k / f) | 0;
          const lx = lat + (fileCursor + col + 0.5) * sp, lu = u + row * sp;
          maxRanks = Math.max(maxRanks, row + 1);
          out.push(mkPlacement(g.defId, fr, lx, lu, sid, wantFormation, g.def));
        }
        remaining -= nSq; fileCursor += f;
        if (fileCursor >= files) fileCursor = 0;
      }
      lat += files * sp + groupGap;
    }
    u += maxRanks * sp + gapAfter;
    return maxRanks;
  };
  // flanks first (they sit at the sides of the front line, same depth as the front)
  const frontStart = u;
  const flankTotal = lines.flank.reduce((s, g) => s + g.n, 0);
  const frontTotal = lines.front.reduce((s, g) => s + g.n, 0);
  const frontUsable = frontTotal > 0 && flankTotal > 0 ? lat0 * 0.78 : lat0;
  const frontRanks = place(centreOut(lines.front), frontUsable, 4, 1.6, 'line');
  const flankDepthU = frontStart;
  if (flankTotal > 0) {
    // split each cavalry group in two halves for left/right wings
    const left = [], right = [];
    for (const g of lines.flank) { const a = Math.ceil(g.n / 2); left.push({ defId: g.defId, n: a, def: g.def }); if (g.n - a > 0) right.push({ defId: g.defId, n: g.n - a, def: g.def }); }
    const wingHalf = Math.max(3, lat0 - frontUsable + 0.5), wingW = Math.min(wingHalf * 2, 14);
    const mkWing = (arr, sign) => {
      const saveU = u; u = flankDepthU + (frontRanks > 0 ? 0.6 : 0);
      place(arr, wingW / 2, 3, 0, 'wedge', { latShift: sign * (frontUsable + wingW / 2 + 0.2) });
      u = saveU;
    };
    mkWing(left, -1); mkWing(right, 1);
  }
  place(centreOut(lines.skirm), lat0, 2, 1.8, 'line');
  place(centreOut(lines.second), lat0, 3, 1.8, 'line');
  place(centreOut(lines.support), lat0 * 0.7, 2, 2.2, 'block');
  // siege: single row, wider spacing
  place(lines.rear, lat0, 1, 0, 'line');
  // clamp inside the zone (compress depth if we overflow)
  const over = u - fr.depth + margin;
  if (over > 0 && u > 0) { const k = Math.max(0.55, (fr.depth - margin * 2) / u); for (const p of out) p.__u *= k; }
  for (const p of out) finalize(p, fr);
  return out;
}

function mkPlacement(defId, fr, lx, lu, sid, formation, def) {
  const order = def.ai && def.ai.style === 'flank' && def.role === 'cavalry' ? 'flank' : (def.role === 'siege' ? 'advance' : 'advance');
  return { defId, x: 0, z: 0, heading: fr.heading, squadId: sid, formation, order, __l: lx, __u: lu };
}
function finalize(p, fr) {
  // local frame: __u back from the front edge, __l lateral
  const frontDist = fr.depth / 2 - 1.2 - p.__u;       // distance from the zone centre toward the enemy
  if (fr.fx !== 0) { p.x = fr.cx + fr.fx * frontDist; p.z = fr.cz + p.__l; }
  else { p.z = fr.cz + fr.fz * frontDist; p.x = fr.cx + p.__l; }
  delete p.__l; delete p.__u;
}
