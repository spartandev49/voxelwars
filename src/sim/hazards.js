// Hazards (world.md §3): quicksand, spikes, fire, boulders, geyser, lava (+ deep water). Each has a ground telegraph (or a static visible zone),
// a real effect and AI avoidance (nav cost x8 on hazard cells in world/nav.js; units deflect around hazard cells they are not already standing in).
// Events: telegraph{kind,x,z,r,t,h,a}, hazard_trigger{kind,x,z,r}. The rolling boulder is public state on its hazard (hz.boulder = {active,x,y,z}).
import { ST, SE } from './consts.js';
import { applyDamage, dotDamage, killUnit, applyStatus, staggerUnit, newHit, setAnim } from './combat.js';

const H = newHit(), HB = newHit();
const CYCLE = { spikes: 3, geyser: 8, boulders: 12 };

export class HazardSystem {
  constructor(w) { this.w = w; this.t = 0; this.hitIds = new Int32Array(64); this.hitN = 0; this.hasLava = w.arena.water > 0 && w.arena.lava; this.hasWater = w.arena.water > 0 && !w.arena.lava; this.sinkMask = 0;
    // lava without a lava plane (builder pools: lava material cells and `lava` hazard circles) burns too
    this.lavaCells = false; const m = w.arena.m; if (m) for (let i = 0; i < m.length; i++) if (m[i] === 7) { this.lavaCells = true; break; }
    this.lavaCircles = []; for (const h of w.hazards) if (h.kind === 'lava') this.lavaCircles.push(h);
    this.anyLava = this.hasLava || this.lavaCells || this.lavaCircles.length > 0;
  }

  tick(dt) {
    const w = this.w, hz = w.hazards, units = w.units;
    // reset the per-tick environment slow
    for (let i = 0; i < hz.length; i++) hz[i].tm += dt;
    if (hz.length || this.anyLava) for (let i = 0; i < units.length; i++) units[i].mEnv = 1;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      switch (h.kind) {
        case 'quicksand': this._quicksand(h, dt); break;
        case 'spikes': this._spikes(h, dt); break;
        case 'fire': this._fire(h, dt, i); break;
        case 'boulders': this._boulders(h, dt); break;
        case 'geyser': this._geyser(h, dt); break;
        default: break;
      }
    }
    if (this.anyLava || this.hasWater) this._liquid(dt);
  }

  _inside(h, u, pad) { const dx = u.x - h.x, dz = u.z - h.z; const r = h.r + (pad || 0); return dx * dx + dz * dz <= r * r; }

  _quicksand(h, dt) {
    const w = this.w, units = w.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive || u.ky > 0 || u.y > w.arena.cellHeight(u.x, u.z) + 0.3) continue;
      if (this._inside(h, u, 0)) {
        u.mEnv = Math.min(u.mEnv, 0.4);
        u.sink = (u.sink || 0) + dt;
        if (u.sink > 2 && !u.sinkWarn) { u.sinkWarn = true; const e = w.P.telegraph; e.kind = 'sink'; e.x = u.x; e.z = u.z; e.r = 1.2; e.t = 2; e.h = 0; e.a = 0; e.team = u.team; w.emit('telegraph', e); }
        if (u.sink >= 4) { u.hp = 0; killUnit(w, u, null, 'drown', H.reset()); }
      } else if (u.sink > 0) { u.sink = Math.max(0, u.sink - dt * 0.5); if (u.sink === 0) u.sinkWarn = false; }
    }
  }

  _spikes(h, dt) {
    const w = this.w, c = h.tm % CYCLE.spikes;
    // 3 s cycle: 0..1.2 retracted, 1.2..1.8 telegraph (0.6 s), 1.8..3.0 up (1.2 s)
    const up = c >= 1.8, tele = c >= 1.2 && c < 1.8;
    if (tele && !h.tele) { h.tele = true; const e = w.P.telegraph; e.kind = 'spikes'; e.x = h.x; e.z = h.z; e.r = h.r; e.t = 0.6; e.h = 0; e.a = 0; e.team = -1; w.emit('telegraph', e); }
    if (!tele) h.tele = false;
    if (up && !h.active) { h.active = true; const e = w.P.hazard_trigger; e.kind = 'spikes'; e.x = h.x; e.z = h.z; e.r = h.r; w.emit('hazard_trigger', e); }
    if (!up) h.active = false;
    if (!up) return;
    const units = w.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive || u.y > w.arena.cellHeight(u.x, u.z) + 0.4) continue;
      if (this._inside(h, u, -0.2)) dotDamage(w, u, 15 * dt, 'spikes', null);
    }
  }

  _fire(h, dt, idx) {
    const w = this.w, units = w.units;
    for (let i = 0; i < units.length; i++) { const u = units[i]; if (u.alive && this._inside(h, u, 0)) w.burn(u, 3); }
    // spreads to flammable props (and onward) at ~15%/s
    h.sp = (h.sp || 0) + dt;
    if (h.sp >= 1) {
      h.sp = 0;
      if (w.weather.burnMul > 0.01 && w.rng.next() < 0.15) w.igniteAt(h.x, h.z, h.r + 1.5);
      if (!h.active) { h.active = true; const e = w.P.hazard_trigger; e.kind = 'fire'; e.x = h.x; e.z = h.z; e.r = h.r; w.emit('hazard_trigger', e); }
    }
  }

  _geyser(h, dt) {
    const w = this.w, c = h.tm % CYCLE.geyser;
    // 7.0 rumble telegraph (1 s), 8.0 eruption
    if (c >= 7 && !h.tele) { h.tele = true; const e = w.P.telegraph; e.kind = 'geyser'; e.x = h.x; e.z = h.z; e.r = h.r; e.t = 1.0; e.h = 0; e.a = 0; e.team = -1; w.emit('telegraph', e); }
    if (c < 1 && h.tele) {
      h.tele = false;
      const e = w.P.hazard_trigger; e.kind = 'geyser'; e.x = h.x; e.z = h.z; e.r = h.r; w.emit('hazard_trigger', e);
      const units = w.units;
      for (let i = 0; i < units.length; i++) {
        const u = units[i]; if (!u.alive || !this._inside(h, u, 0)) continue;
        const o = H.reset(); o.type = 'blunt'; o.kb = 0; o.noBlock = true; o.noCrit = true; o.fixed = true; o.cause = 'geyser'; o.aoe = true; o.at(h.x, h.z);
        applyDamage(w, null, u, 20, o);
        if (u.alive) { u.ky = 13.3; u.y += 0.1; u.state = ST.FLY; u.stateT = 0; u.stateDur = 99; u.dvx = 0; u.dvz = 0; setAnim(u, 'flail', 1); }
      }
    }
  }

  _boulders(h, dt) {
    const w = this.w, c = h.tm % CYCLE.boulders;
    const L = Math.max(h.r * 3, 16), speed = 14;
    if (!h.boulder) h.boulder = { active: false, x: h.x, y: 0, z: h.z - L, t: 0 };
    const b = h.boulder;
    // lane runs along +z through (h.x,h.z): telegraph 1.5 s before the roll starts
    if (!b.active && c >= CYCLE.boulders - 1.5 && !h.tele) { h.tele = true; const e = w.P.telegraph; e.kind = 'line'; e.x = h.x; e.z = h.z + L; e.r = h.r; e.t = 1.5; e.h = 0; e.a = 2 * L; e.team = -1; w.emit('telegraph', e); }
    if (!b.active && h.tele && c < 1) { h.tele = false; b.active = true; b.z = h.z - L; b.x = h.x; b.t = 0; this.hitN = 0; const e = w.P.hazard_trigger; e.kind = 'boulders'; e.x = h.x; e.z = h.z; e.r = h.r; w.emit('hazard_trigger', e); }
    if (!b.active) return;
    b.z += speed * dt; b.y = w.arena.heightAt(b.x, b.z);
    const units = w.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive) continue;
      const dx = u.x - b.x, dz = u.z - b.z, rr = h.r * 0.6 + 0.9 + u.radius;
      if (dx * dx + dz * dz > rr * rr) continue;
      let seen = false; for (let k = 0; k < this.hitN; k++) if (this.hitIds[k] === u.id) { seen = true; break; }
      if (seen) continue;
      if (this.hitN < 64) this.hitIds[this.hitN++] = u.id;
      const o = HB.reset(); o.type = 'blunt'; o.kb = 8; o.noBlock = true; o.noCrit = true; o.cause = 'aoe'; o.aoe = true; o.at(b.x - 1, b.z); o.dir(dx, 0.3 * (dz < 0 ? -1 : 1));
      applyDamage(w, null, u, 60, o);
    }
    w.damageProps(b.x, b.z, 1.2, 40 * dt);
    if (b.z > h.z + L) b.active = false;
  }

  /** Lava burns (30 dps), deep water drowns after 3 s: only reachable by knockback/launches since the nav grid forbids walking in. */
  _liquid(dt) {
    const w = this.w, a = w.arena, units = w.units, wy = a.waterY(), circles = this.lavaCircles;
    for (let i = 0; i < units.length; i++) {
      const u = units[i]; if (!u.alive || u.ky > 0 || u.state === ST.FLY) continue;
      const ch = a.cellHeight(u.x, u.z);
      const grounded = u.y <= ch + 0.4;
      let lava = false;
      if (this.hasLava && ch < wy && u.y <= Math.max(wy, ch) + 0.4) lava = true;                 // the lava plane
      else if (grounded && (this.lavaCells && a.materialAt(u.x, u.z).hazard === 'lava')) lava = true;   // lava material cells (with or without a plane)
      else if (grounded) for (let k = 0; k < circles.length; k++) if (this._inside(circles[k], u, 0)) { lava = true; break; }   // `lava` hazard circles
      if (lava) { dotDamage(w, u, 30 * dt, 'lava', null); u.mEnv = Math.min(u.mEnv, 0.6); }
      else if (this.hasWater && wy - ch > 0.8 && u.y <= wy) { u.drown = (u.drown || 0) + dt; if (u.drown >= 3) killUnit(w, u, null, 'drown', H.reset()); } else if (u.drown) u.drown = 0;
    }
  }
}
