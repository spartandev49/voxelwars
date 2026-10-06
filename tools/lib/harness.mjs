// Headless battle harness shared by tests/sim/*, tools/balance.mjs and the AI tuning scripts.
// Everything here is deterministic (seeded) and Node-only.
import { generateArena } from '../../src/world/gen.js';
import { World } from '../../src/sim/world.js';
import { buildSimDefs } from '../../src/sim/defs.js';
import { layoutArmy } from '../../src/sim/armygen.js';
import { ST } from '../../src/sim/consts.js';

export const DEFS = buildSimDefs();
const arenaCache = new Map();
export function getArena(recipe = 'marathon', size = 'medium', seed = 5) {
  const k = recipe + '|' + size + '|' + seed;
  let a = arenaCache.get(k); if (!a) { a = generateArena(recipe, size, seed); arenaCache.set(k, a); }
  return a;                                                   // World clones it
}

/**
 * Build a ready-to-start world. Armies: {groups:[{defId,n}]} or {placements:[...]} (already laid out).
 * opts: {arena, size, arenaSeed, seed, rules, defs, start:false|true, spacing}
 */
export function buildWorld(opts) {
  const defs = opts.defs || DEFS;
  const arena = opts.arenaObj || getArena(opts.arena || 'marathon', opts.size || 'medium', opts.arenaSeed || 5);
  const w = new World({ arena, seed: opts.seed || 1, rules: opts.rules || {}, defs });
  const A = arena.zones.A, B = arena.zones.B;
  const armies = [opts.a, opts.b];
  for (let t = 0; t < 2; t++) {
    const army = armies[t]; if (!army) continue;
    const pl = army.placements || layoutArmy(army.groups, t === 0 ? A : B, t === 0 ? B : A, defs, { seed: (opts.seed || 1) + t });
    w.addPlacements(t, pl, { defs });
  }
  if (opts.start !== false) w.start();
  return w;
}

const TAU = Math.PI * 2;
const adiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };

/** Battle-quality metrics (spec S5-S8). Call sample() after every world.tick(). */
export class Metrics {
  constructor(world, o = {}) {
    this.w = world; this.every = o.every || 1;
    this.ovUnits = 0; this.ovSamples = 0;             // units overlapping another unit / unit samples
    this.ctxTicks = 0; this.idleTicks = 0;            // in-contact melee ticks, idle among them
    this.flips = 0; this.unitSeconds = 0;
    this.stuck = 0; this.stuckElig = 0;
    this.hist = new Map(); this.posSnap = new Map();
    this.n = 0; this.engagedTicks = 0;
    this.lastKillT = 0; this.maxDeadAir = 0; this.leadChanges = 0; this._lead = -1;
  }
  sample() {
    const w = this.w, units = w.units, hash = w.hash; this.n++;
    const dt = 1 / 30, tickN = w.tickN;
    const sampleOv = (tickN % 3) === 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      this.unitSeconds += dt;
      // ---- heading flips
      let h = this.hist.get(u.id);
      if (!h) { h = { a: new Float32Array(15), k: 0, cool: 0, filled: 0 }; this.hist.set(u.id, h); }
      if (h.cool > 0) h.cool--;
      const old = h.a[h.k];
      if (h.filled >= 15 && h.cool === 0 && u.state !== ST.STAGGER && u.state !== ST.STUN && Math.abs(adiff(old, u.heading)) > Math.PI / 2) { this.flips++; h.cool = 15; }
      h.a[h.k] = u.heading; h.k = (h.k + 1) % 15; if (h.filled < 15) h.filled++;
      // ---- overlap (sampled every 3rd tick)
      const reach = u.def.melee ? u.def.melee.range + 0.15 : 0;
      let contact = false;
      if (sampleOv || (reach > 0 && u.cd <= 0)) {
        const q = w.qbuf; const nq = hash.query(u.x, u.z, 3.2, q);
        let ov = false;
        for (let k = 0; k < nq; k++) {
          const o = units[q[k]]; if (!o || o === u || !o.alive) continue;
          const d = Math.hypot(o.x - u.x, o.z - u.z);
          if (sampleOv && d < 0.8 * (u.radius + o.radius)) ov = true;
          if (reach > 0 && o.team !== u.team && d - u.radius - o.radius <= reach) contact = true;
        }
        if (sampleOv) { this.ovSamples++; if (ov) this.ovUnits++; }
      }
      if (reach > 0 && contact && u.cd <= 0 && u.state !== ST.STUN && u.state !== ST.ROUT && u.state !== ST.CHEER) {
        this.ctxTicks++;
        if (u.state !== ST.WINDUP && u.state !== ST.STAGGER && u.speedNow < 0.4) this.idleTicks++;
      }
    }
    // stuck units: every 6 s compare positions
    if ((tickN % 180) === 0) {
      const snap = this.posSnap, next = new Map();
      for (let i = 0; i < units.length; i++) {
        const u = units[i]; if (!u.alive) continue;
        const t = u.target; let elig = false;
        if (t && t.alive && u.state !== ST.WINDUP && u.state !== ST.ROUT && u.state !== ST.STUN && u.state !== ST.SIT && u.state !== ST.CAST && u.state !== ST.CHEER) {
          const reach = u.def.ranged ? u.def.ranged.range : (u.def.melee ? u.def.melee.range : 1);
          const gap = Math.hypot(t.x - u.x, t.z - u.z) - u.radius - t.radius;
          elig = gap > reach * 1.3 + 0.4 && !u.engaged && !(u.squad && u.squad.order === 'hold');
        }
        const p = snap.get(u.id);
        if (p && p.elig && elig) { this.stuckElig++; if (Math.hypot(u.x - p.x, u.z - p.z) < 0.5) this.stuck++; }
        next.set(u.id, { x: u.x, z: u.z, elig });
      }
      this.posSnap = next;
    }
  }
  report() {
    return {
      overlap: this.ovSamples ? this.ovUnits / this.ovSamples : 0,
      idleInContact: this.ctxTicks ? this.idleTicks / this.ctxTicks : 0,
      flipsPerUnitSec: this.unitSeconds ? this.flips / this.unitSeconds : 0,
      stuck: this.stuckElig ? this.stuck / this.stuckElig : 0,
      contactTicks: this.ctxTicks, stuckElig: this.stuckElig,
    };
  }
}

/** Run until the battle ends (or maxTime sim seconds). Returns {t, winner, reason, metrics?, cpuMs, ticks}. */
export function runBattle(w, o = {}) {
  const maxT = o.maxTime || 400, m = o.metrics ? new Metrics(w) : null;
  const t0 = performance.now();
  while (w.state !== 'ended' && w.time < maxT) { w.tick(); if (m) m.sample(); if (o.onTick) o.onTick(w); }
  const cpuMs = performance.now() - t0;
  return { t: w.time, winner: w.winner, reason: w.endReason, metrics: m ? m.report() : null, cpuMs, msPerTick: cpuMs / Math.max(1, w.tickN), ticks: w.tickN, alive: [w.stats[0].alive, w.stats[1].alive], aliveCost: [w.stats[0].aliveCost, w.stats[1].aliveCost], startCost: [w.stats[0].startCost, w.stats[1].startCost] };
}

/** A default mixed army of roughly `n` units of a faction-agnostic composition (tuning scripts). */
export function sampleGroups(spec) { return spec.map(([defId, n]) => ({ defId, n })); }
export const ARMY_150 = {
  A: sampleGroups([['hoplite', 60], ['spartan', 8], ['peltast', 16], ['cretan_archer', 24], ['companion_cavalry', 10], ['philosopher', 4], ['strategos', 1]]),
  B: sampleGroups([['legionary', 56], ['gladiator', 10], ['pilum_thrower', 16], ['senator', 4], ['equites', 10], ['ballista', 2], ['centurion', 2]]),
};
