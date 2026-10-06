// Take Command (spec §8): the player possesses one unit. Input arrives as world.input(tick, {type:'possess', unit, move:{x,z}, attack, ability}).
//   unit: unit id to take control of (null/0 releases);  move: desired direction (length 0..1, world axes; >1 = run bonus is not applied);
//   attack: hold to attack the nearest enemy inside the aim cone (+-60 degrees of the movement/facing direction, nearest-in-reach first);
//   ability: 1..3 triggers the unit's n-th active ability (edge-triggered).
// The controlled unit has unit.controlled = true; the AI skips it (ai.think returns after the timed states); its kills carry byPlayer.
import { ST, SE } from './consts.js';
import { startMelee, startRanged, setAnim, angleDiff } from './combat.js';

const CONE = Math.PI / 3;

export class Possession {
  constructor(w) { this.w = w; this.unit = null; this.mx = 0; this.mz = 0; this.attack = false; this.pendingAbility = 0; this.pendingT = 0; }
  /** Currently controlled unit or null. */
  get current() { return this.unit && this.unit.alive ? this.unit : null; }

  apply(cmd) {
    const w = this.w;
    if (cmd.unit !== undefined) {
      const id = cmd.unit;
      if (!id) this._release();
      else {
        const u = w.unitById(id);
        if (u && u.alive && u !== this.unit) { this._release(); this.unit = u; u.controlled = true; u.target = null; if (u.claim) { if (u.claim.claims > 0) u.claim.claims--; u.claim = null; } const e = w.P.possess; e.id = u.id; e.on = 1; w.emit('possess', e); }
      }
    }
    if (cmd.move) { this.mx = +cmd.move.x || 0; this.mz = +cmd.move.z || 0; const l = Math.hypot(this.mx, this.mz); if (l > 1) { this.mx /= l; this.mz /= l; } }
    if (cmd.attack !== undefined) this.attack = !!cmd.attack;
    if (cmd.ability) { this.pendingAbility = cmd.ability | 0; this.pendingT = 0.5; }       // buffered for 0.5 s so a press during a swing is not lost
  }

  _release() {
    const u = this.unit;
    if (u) { u.controlled = false; u.dvx = 0; u.dvz = 0; const e = this.w.P.possess; e.id = u.id; e.on = 0; this.w.emit('possess', e); }
    this.unit = null; this.mx = this.mz = 0; this.attack = false; this.pendingAbility = 0; this.pendingT = 0;
  }

  tick() {
    const w = this.w, u = this.unit;
    if (!u) return;
    if (!u.alive) { this._release(); return; }
    if (this.pendingAbility > 0) { this.pendingT -= 1 / 30; if (this.pendingT <= 0) this.pendingAbility = 0; }
    const st = u.state;
    if (st === ST.WINDUP || st === ST.STAGGER || st === ST.STUN || st === ST.CAST || st === ST.GETUP || st === ST.SIT || st === ST.COWER || st === ST.DOWN || st === ST.FLY || u.se[SE.SLEEP] > 0 || u.se[SE.STONE] > 0 || u.se[SE.STUN] > 0) return;
    const def = u.def, sp = u.speedBase * u.mSpeed;
    const mlen = Math.hypot(this.mx, this.mz);
    // facing: movement direction, or the aimed enemy while attacking
    let fx = Math.sin(u.heading), fz = Math.cos(u.heading);
    if (mlen > 0.05) { fx = this.mx / mlen; fz = this.mz / mlen; }
    const target = this._aim(u, fx, fz);
    if (this.pendingAbility > 0) {
      const act = this._activeAbility(u, this.pendingAbility);
      this.pendingAbility = 0;
      if (act && act.impl.cast && act.cd <= 0) {
        const ctx = this._ctx(fx, fz, target);
        if (act.impl.cast(u, act, w, ctx)) { act.cd = Math.max(act.cd, act.p.cd || 0); return; }
      }
    }
    if (this.attack && target) {
      const dx = target.x - u.x, dz = target.z - u.z, gap = Math.hypot(dx, dz) - u.radius - target.radius;
      u.target = target; u.face = Math.atan2(dx, dz);
      const m = def.melee, r = def.ranged;
      const useRanged = !!r && (!m || gap > (m.range + 1.2));
      if (!useRanged && m) {
        if (gap <= m.range + 0.15) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; if (u.cd <= 0 && Math.abs(angleDiff(u.heading, u.face)) < 0.6) { startMelee(w, u); return; } setAnim(u, 'idle_combat', 1); return; }
      } else if (r && gap <= r.range && gap >= (r.minRange || 0)) {
        u.dvx = 0; u.dvz = 0; u.state = ST.IDLE;
        if (u.cdR <= 0 && Math.abs(angleDiff(u.heading, u.face)) < 0.4) { startRanged(w, u); return; }
        setAnim(u, 'idle_combat', 1); return;
      }
    }
    // movement
    if (mlen > 0.05) {
      u.dvx = this.mx * sp * (mlen > 1 ? 1 : mlen); u.dvz = this.mz * sp * (mlen > 1 ? 1 : mlen);
      u.state = ST.MOVE; if (!(this.attack && target)) u.face = Math.atan2(this.mx, this.mz);
      setAnim(u, 'walk', 1);
    } else { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; setAnim(u, 'idle', 1); }
  }

  /** Nearest enemy inside the aim cone (falls back to the nearest enemy in melee reach when the cone is empty). */
  _aim(u, fx, fz) {
    const w = this.w, def = u.def, range = def.ranged ? def.ranged.range : (def.melee ? def.melee.range + 3 : 4);
    const q = w.qbuf2, n = w.hash.query(u.x, u.z, range + 1, q);
    let best = null, bd = 1e9, bestAny = null, bad = 1e9;
    for (let k = 0; k < n; k++) {
      const o = w.units[q[k]];
      if (!o || !o.alive || o.team === u.team || o.state === ST.DOWN) continue;
      const dx = o.x - u.x, dz = o.z - u.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d > range + 1) continue;
      if (d < bad) { bad = d; bestAny = o; }
      const cos = (dx * fx + dz * fz) / (d || 1);
      if (cos >= Math.cos(CONE) && d < bd) { bd = d; best = o; }
    }
    return best || (bad < 3 ? bestAny : null);
  }
  _ctx(fx, fz, target) { const c = this._c || (this._c = { target: null, dx: 0, dz: 1, x: 0, z: 0 }); c.target = target; c.dx = fx; c.dz = fz; c.x = target ? target.x : this.unit.x + fx * 8; c.z = target ? target.z : this.unit.z + fz * 8; return c; }
  _activeAbility(u, n) {
    let k = 0;
    for (let i = 0; i < u.abil.length; i++) { const a = u.abil[i]; if (a.impl.cast && !a.p.passive && a.p.effect !== 'panic_cav') { k++; if (k === n) return a; } }
    return null;
  }
}
