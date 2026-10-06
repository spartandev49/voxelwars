// Projectiles: ballistic arrows, javelins, boulders, bolts, magic beams. Pooled objects, sub-stepped for speed.
// Per-weapon quirks (flaming arrows, shield breaking, misaim, misfire, chain lightning, bribes) live in sim/abilities/* and hook in through
// onAim (modify the aim point) and onFire (modify the projectile) / onHitDealt / onBlocked (modify the hit).

import { G, SE } from './consts.js';
import { applyDamage, Hit } from './combat.js';

export class Projectile {
  constructor() {
    this.active = false; this.kind = ''; this.team = 0; this.src = null; this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.px = 0; this.py = 0; this.pz = 0;
    this.g = 0; this.life = 0; this.dmg = 0; this.type = 'pierce'; this.ap = -1; this.opts = null; this.pierceN = 1; this.hits = 0; this.aoe = 0; this.crater = false; this.radius = 0.3; this.fire = false;
    this.stuck = 0; this.landX = 0; this.landZ = 0; this.id = 0; this.hitIds = new Int32Array(6); this.kb = 1.5; this.crew = false;
  }
}

const H_PROJ = new Hit(), H_EXP = new Hit();
export const AIM = { x: 0, z: 0, y: 0, missed: false };

export class ProjectileSystem {
  constructor(w, cap = 600) {
    this.w = w; this.list = []; this.cap = cap; this.nextId = 1;
    for (let i = 0; i < cap; i++) this.list.push(new Projectile());
    this.live = 0; this._scan = 0;
  }
  alloc() {
    const l = this.list, n = l.length;
    for (let k = 0; k < n; k++) { const i = (this._scan + k) % n; if (!l[i].active) { this._scan = i + 1; return l[i]; } }
    if (n < 4000) { const p = new Projectile(); l.push(p); return p; }
    return null;
  }

  /** Launch from unit u at target t using its ranged def. Returns the projectile or null. */
  fire(u, t, tx, tz, ty) {
    const w = this.w, r = u.def.ranged, p = this.alloc();
    if (!p) return null;
    const sx = u.x + Math.sin(u.heading) * 0.5, sz = u.z + Math.cos(u.heading) * 0.5, sy = u.y + u.height * 0.72;
    const g = r.gravity !== undefined ? r.gravity : G.gravity;
    const v = r.speed || 36;
    // lead the target
    let ax = tx, az = tz, ay = (ty !== undefined ? ty : (t ? t.y + t.height * 0.55 : u.y));
    if (t && g > 0 && r.proj !== 'bolt') {
      let tf = Math.hypot(ax - sx, az - sz) / v;
      for (let i = 0; i < 2; i++) { ax = t.x + (t.vx + t.kx) * tf; az = t.z + (t.vz + t.kz) * tf; tf = Math.hypot(ax - sx, az - sz) / v; }
    }
    AIM.x = ax; AIM.z = az; AIM.y = ay; AIM.missed = false;
    w.abilityHook('onAim', u, AIM);
    ax = AIM.x; az = AIM.z; ay = AIM.y;
    const dx = ax - sx, dz = az - sz, dh = Math.hypot(dx, dz) || 0.001, dy = ay - sy;
    let pitch;
    if (g > 0.5) {
      const v2 = v * v, disc = v2 * v2 - g * (g * dh * dh + 2 * dy * v2);
      if (disc >= 0) pitch = Math.atan2(v2 - Math.sqrt(disc), g * dh);
      else pitch = Math.PI / 4;
    } else pitch = Math.atan2(dy, dh);
    // spread (sandstorm widens it)
    const sp = (r.spread || 0) * w.weather.sprdMul;
    let yaw = Math.atan2(dx, dz);
    if (sp > 0) { yaw += w.rng.gauss() * sp; pitch += w.rng.gauss() * sp * 0.5; }
    const cp = Math.cos(pitch);
    p.active = true; p.id = this.nextId++; p.kind = r.proj; p.team = u.team; p.src = u;
    p.x = p.px = sx; p.y = p.py = sy; p.z = p.pz = sz;
    p.vx = Math.sin(yaw) * cp * v; p.vz = Math.cos(yaw) * cp * v; p.vy = Math.sin(pitch) * v; p.g = g;
    p.life = 6; p.dmg = r.dmg; p.type = r.type || 'pierce'; p.ap = r.ap !== undefined ? r.ap : -1; p.pierceN = r.pierceN || 1; p.hits = 0; p.aoe = r.aoe || 0; p.crater = !!r.crater;
    p.radius = r.proj === 'boulder' ? 0.6 : 0.3; p.kb = r.proj === 'bolt' ? 6 : (r.kb !== undefined ? r.kb : 1.5);
    p.fire = false; p.crew = false; p.landX = ax; p.landZ = az;
    p.opts = r;
    p.stuck = 0; p.hitIds.fill(0);
    w.abilityHook('onFire', u, p);
    this.live++;
    const e = w.P.projectile_launch; e.kind = p.kind; e.team = u.team; e.x = sx; e.y = sy; e.z = sz; e.tx = ax; e.tz = az; e.id = p.id; w.emit('projectile_launch', e);
    return p;
  }

  update(dt) {
    const w = this.w, list = this.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      if (p.stuck > 0) { p.stuck -= dt; if (p.stuck <= 0) { p.active = false; this.live--; } continue; }
      p.px = p.x; p.py = p.y; p.pz = p.z;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      const steps = Math.max(1, Math.ceil(speed * dt / 0.7));
      const sdt = dt / steps;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        p.vy -= p.g * sdt;
        p.x += p.vx * sdt; p.y += p.vy * sdt; p.z += p.vz * sdt;
        p.life -= sdt;
        dead = this._collide(p);
      }
      if (!dead && (p.life <= 0 || !w.nav.inside(p.x, p.z))) { dead = true; if (p.aoe > 0) this._explode(p); }
      if (dead && p.stuck <= 0) { p.active = false; this.live--; }
    }
  }

  _collide(p) {
    const w = this.w;
    // terrain
    const gy = w.arena.heightAt(p.x, p.z);
    if (p.y <= gy + 0.05) {
      p.y = gy;
      if (p.aoe > 0) this._explode(p);
      else {
        const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = false; e.blocked = false; w.emit('projectile_hit', e);
        p.stuck = 0.01; p.vx = p.vy = p.vz = 0;
        if (p.kind === 'arrow' || p.kind === 'javelin' || p.kind === 'pilum') p.stuck = 4;
        if (p.fire) w.igniteAt(p.x, p.z, 1.2);
      }
      return p.stuck <= 0;
    }
    // cover props (walls, columns, trees block shots)
    if (w.propBlocks(p)) {
      if (p.aoe > 0) this._explode(p);
      else { const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = false; e.blocked = true; w.emit('projectile_hit', e); p.stuck = 3; p.vx = p.vy = p.vz = 0; }
      return p.stuck <= 0;
    }
    // units
    const q = w.qbuf2, n = w.hash.query(p.x, p.z, 1.6, q), ff = w.rules.friendlyFire;
    for (let k = 0; k < n; k++) {
      const u = w.units[q[k]];
      if (!u || !u.alive || u === p.src) continue;
      if (u.team === p.team && !ff) continue;
      if (u.state === 13) continue;                              // ST.DOWN: nothing to hit
      if (p.kind === 'boulder' && p.vy > 0) continue;            // boulders only impact on the way down
      const dx = u.x - p.x, dz = u.z - p.z, rr = u.radius + p.radius;
      if (dx * dx + dz * dz > rr * rr) continue;
      if (p.y > u.y + u.height + 0.3 || p.y < u.y - 0.2) continue;
      let seen = false; for (let h = 0; h < p.hits && h < 6; h++) if (p.hitIds[h] === u.id) { seen = true; break; }
      if (seen) continue;
      if (u.team === p.team && w.rng.next() > 0.5) continue;    // friendly arrows often pass over
      if (p.aoe > 0) { this._explode(p); return true; }
      return this._hitUnit(p, u);
    }
    return false;
  }

  _hitUnit(p, u) {
    const w = this.w, src = p.src;
    const o = H_PROJ.reset();
    o.type = p.type; o.ap = p.ap; o.proj = true; o.kb = p.kb; o.cause = p.crew ? 'misfire' : 'ranged'; o.kind = p.kind; o.fire = p.fire; o.at(p.px, p.pz); o.dir(p.vx, p.vz);
    const fin = applyDamage(w, src, u, p.dmg, o);
    const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = true; e.blocked = fin === 0; w.emit('projectile_hit', e);
    if (p.hits < 6) p.hitIds[p.hits] = u.id;
    p.hits++;
    if (fin === 0 || p.hits >= p.pierceN) { p.stuck = p.kind === 'bolt' ? 1.0 : 2.5; p.vx = p.vy = p.vz = 0; return false; }
    p.dmg *= 0.8;
    return false;
  }

  _explode(p) {
    const w = this.w, r = p.aoe;
    const e = w.P.explosion; e.kind = p.crew ? 'crew' : p.kind === 'boulder' ? 'boulder' : p.type === 'fire' ? 'fire' : 'magic'; e.x = p.x; e.y = p.y; e.z = p.z; e.r = r; w.emit('explosion', e);
    const h = w.acquireHit(); h.type = p.type; h.ap = p.ap; h.kb = p.crew ? 3 : 6; h.cause = p.crew ? 'misfire' : 'aoe'; h.kind = p.kind; h.fire = p.fire;
    w.areaDamage(p.src, p.x, p.z, r, p.dmg, h, -1);
    w.releaseHit();
    if (p.crater) w.makeCrater(p.x, p.z, Math.max(1.4, r * 0.55), 3);
    if (p.type === 'fire') w.igniteAt(p.x, p.z, r);
    w.damageProps(p.x, p.z, r, p.dmg * 1.2);
    p.stuck = 0.01;
    p.vx = p.vy = p.vz = 0;
  }
}
