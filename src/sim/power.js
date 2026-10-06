// Power rating (spec §8): power(unit) = sqrt(hpEff * dps) with hpEff = hp*(1+armor*1.4)*(1+shield.block*0.35) and
// dps = (melee.dmg/melee.cd or ranged.dmg/ranged.cd, the better one + 30% of the other) * (1 + 0.25*sizeFactor); sizeFactor = (scale-1) + (mass>=8 ? 1 : mass>=3 ? 0.4 : 0).
// Team power = sum over alive units. PowerTracker emits `big_swing{team,ratio,flank,cluster}` when |ln(ratio) - ln(lastRatio)| > 0.35 (checked once a second):
// `team` = the side that gained, `cluster` = where the losing side's recent deaths were, `flank` = left|right|center of that cluster seen from the losing army facing the enemy.
import { ST } from './consts.js';

export function sizeFactor(def) { const sc = def.scale || 1; return Math.max(0, sc - 1) + ((def.mass || 1) >= 8 ? 1 : (def.mass || 1) >= 3 ? 0.4 : 0); }
export function dpsOf(def) {
  const m = def.melee ? def.melee.dmg / def.melee.cd : 0, r = def.ranged ? def.ranged.dmg * (def.ranged.volley || 1) / def.ranged.cd : 0;
  const hi = Math.max(m, r), lo = Math.min(m, r);
  return (hi + 0.3 * lo) * (1 + 0.25 * sizeFactor(def));
}
export function hpEff(def, hp) { return hp * (1 + (def.armor || 0) * 1.4) * (1 + (def.shield ? def.shield.block : 0) * 0.35); }
/** Power of a unit def at a given hp (default full). */
export function power(def, hp) { return Math.sqrt(hpEff(def, hp === undefined ? def.hp : hp) * dpsOf(def)); }
export function unitPower(u) { return power(u.def, u.hp); }
export function teamPower(w, team) { let s = 0; for (const u of w.units) if (u.alive && u.team === team) s += power(u.def, u.hp); return s; }
/** Power of a composition [{defId,n}] (scout report, armygen difficulty scaling). */
export function groupsPower(groups, defs) { let s = 0; for (const g of groups) s += g.n * power(defs[g.defId]); return s; }

export class PowerTracker {
  constructor(w) {
    this.w = w; this.last = 1; this.have = false; this.ring = new Float32Array(16 * 3); this.ri = 0; this.n = 0;
    w.ev.on('unit_kill', (p) => this._kill(p));
  }
  reset() { this.have = false; this.n = 0; }
  _kill(p) {
    const k = this.ri * 3; this.ring[k] = p.dstTeam; this.ring[k + 1] = p.x; this.ring[k + 2] = p.z; this.ri = (this.ri + 1) & 15; if (this.n < 16) this.n++;
  }
  /** Called once a second by the world. */
  pulse() {
    const w = this.w;
    if (w.time < 3) return;
    const p0 = teamPower(w, 0) + 1, p1 = teamPower(w, 1) + 1, r = p0 / p1;
    if (!this.have) { this.have = true; this.last = r; return; }
    if (Math.abs(Math.log(r) - Math.log(this.last)) > 0.35) {
      const gain = r > this.last ? 0 : 1, lose = 1 - gain;
      const e = w.P.big_swing; e.team = gain; e.ratio = r;
      this._cluster(lose, e.cluster);
      e.flank = this._flank(lose, e.cluster);
      w.emit('big_swing', e);
      this.last = r;
    }
  }
  _cluster(team, out) {
    let sx = 0, sz = 0, c = 0;
    for (let i = 0; i < this.n; i++) { const k = i * 3; if (this.ring[k] === team) { sx += this.ring[k + 1]; sz += this.ring[k + 2]; c++; } }
    if (c) { out.x = sx / c; out.z = sz / c; return; }
    const m = this.w.centroid[team]; out.x = m.x; out.z = m.z;
  }
  /** left|right|center of the cluster relative to the losing army (facing the enemy). */
  _flank(team, cl) {
    const w = this.w, mc = w.centroid[team], ec = w.centroid[1 - team];
    if (!mc.n || !ec.n) return 'center';
    let fx = ec.x - mc.x, fz = ec.z - mc.z; const fl = Math.sqrt(fx * fx + fz * fz) || 1; fx /= fl; fz /= fl;
    // left of a unit facing (fx,fz) is (fz,-fx)  (spec §1: forward=(sin h,cos h), left=(cos h,-sin h))
    const lat = (cl.x - mc.x) * fz + (cl.z - mc.z) * -fx;
    let ext = 6; for (const u of w.units) if (u.alive && u.team === team) { const l = Math.abs((u.x - mc.x) * fz - (u.z - mc.z) * fx); if (l > ext) ext = l; }
    return lat > ext * 0.25 ? 'left' : lat < -ext * 0.25 ? 'right' : 'center';
  }
}
