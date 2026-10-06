// Projectiles: ballistic arrows, javelins, boulders, bolts, magic beams. Pooled objects, sub-stepped for speed.

import { G, SE } from './consts.js';
import { applyDamage, inFrontArc } from './combat.js';

export class Projectile {
  constructor() { this.active = false; this.kind = ''; this.team = 0; this.src = null; this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.px = 0; this.py = 0; this.pz = 0; this.g = 0; this.life = 0; this.dmg = 0; this.type = 'pierce'; this.opts = null; this.pierceN = 1; this.hits = 0; this.aoe = 0; this.crater = false; this.radius = 0.3; this.fire = false; this.chain = 0; this.homing = null; this.stuck = 0; this.bribe = 0; this.breaks = 0; this.landX = 0; this.landZ = 0; this.id = 0; this.hitIds = new Int32Array(6); }
}

export class ProjectileSystem {
  constructor(w, cap = 600) {
    this.w = w; this.list = []; this.cap = cap; this.nextId = 1;
    for (let i = 0; i < cap; i++) this.list.push(new Projectile());
    this.live = 0;
  }
  alloc() { for (let i = 0; i < this.list.length; i++) if (!this.list[i].active) return this.list[i]; if (this.list.length < 4000) { const p = new Projectile(); this.list.push(p); return p; } return null; }

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
    if (r.misaim && w.rng.next() < r.misaim) { const a = w.rng.next() * Math.PI * 2, d = 4 + w.rng.next() * 5; ax += Math.cos(a) * d; az += Math.sin(a) * d; const e = w.P.cyclops_misaim; if (e) { e.id = u.id; w.emit('cyclops_misaim', e); } }
    const dx = ax - sx, dz = az - sz, dh = Math.hypot(dx, dz) || 0.001, dy = ay - sy;
    let pitch;
    if (g > 0.5) {
      const v2 = v * v, disc = v2 * v2 - g * (g * dh * dh + 2 * dy * v2);
      if (disc >= 0) pitch = Math.atan2(v2 - Math.sqrt(disc), g * dh);
      else pitch = Math.PI / 4;
    } else pitch = Math.atan2(dy, dh);
    // spread
    const sp = r.spread || 0;
    let yaw = Math.atan2(dx, dz);
    if (sp > 0) { yaw += w.rng.gauss() * sp; pitch += w.rng.gauss() * sp * 0.5; }
    const cp = Math.cos(pitch);
    p.active = true; p.id = this.nextId++; p.kind = r.proj; p.team = u.team; p.src = u;
    p.x = p.px = sx; p.y = p.py = sy; p.z = p.pz = sz;
    p.vx = Math.sin(yaw) * cp * v; p.vz = Math.cos(yaw) * cp * v; p.vy = Math.sin(pitch) * v; p.g = g;
    p.life = 6; p.dmg = r.dmg; p.type = r.type || 'pierce'; p.pierceN = r.pierceN || 1; p.hits = 0; p.aoe = r.aoe || 0; p.crater = !!r.crater;
    p.radius = r.proj === 'boulder' ? 0.6 : 0.3; p.chain = r.chain || 0; p.bribe = r.bribe || 0; p.breaks = r.breaksShield || 0;
    p.fire = false;
    if (r.fireEvery) { u.fireHits = (u.fireHits || 0) + 1; if (u.fireHits % r.fireEvery === 0) { p.fire = true; p.type = 'fire'; } }
    p.opts = r;
    p.stuck = 0; p.hitIds.fill(0);
    this.live++;
    const e = w.P.projectile_launch; e.kind = r.proj; e.team = u.team; e.x = sx; e.y = sy; e.z = sz; e.tx = ax; e.tz = az; e.id = p.id; w.emit('projectile_launch', e);
    return p;
  }

  update(dt) {
    const w = this.w, list = this.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.active) continue;
      if (p.stuck > 0) { p.stuck -= dt; if (p.stuck <= 0) { p.active = false; this.live--; } continue; }
      p.px = p.x; p.py = p.y; p.pz = p.z;
      const speed = Math.hypot(p.vx, p.vz, p.vy);
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
      else { const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = false; e.blocked = false; w.emit('projectile_hit', e); p.stuck = 0.01; p.vx = p.vy = p.vz = 0; if (p.kind === 'arrow' || p.kind === 'javelin' || p.kind === 'pilum') p.stuck = 4; if (p.fire) w.igniteAt(p.x, p.z, 1.2); }
      return p.stuck <= 0;
    }
    // cover props (walls, columns, trees block shots)
    if (w.propBlocks(p)) {
      if (p.aoe > 0) this._explode(p);
      else { const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = false; e.blocked = true; w.emit('projectile_hit', e); p.stuck = 3; p.vx = p.vy = p.vz = 0; }
      return p.stuck <= 0;
    }
    // units
    const n = w.hash.query(p.x, p.z, 1.6, w.qbuf);
    for (let k = 0; k < n; k++) {
      const u = w.units[w.qbuf[k]];
      if (!u || !u.alive) continue;
      if (u === p.src) continue;
      if (u.team === p.team && !w.rules.friendlyFire) continue;
      if (p.kind === 'boulder' && p.vy > 0) continue;       // boulders only impact on the way down
      const dx = u.x - p.x, dz = u.z - p.z, rr = u.radius + p.radius;
      if (dx * dx + dz * dz > rr * rr) continue;
      if (p.y > u.y + u.height + 0.3 || p.y < u.y - 0.2) continue;
      // already hit this one (pierce)?
      let seen = false; for (let h = 0; h < p.hits && h < 6; h++) if (p.hitIds[h] === u.id) { seen = true; break; }
      if (seen) continue;
      if (u.team === p.team && u.team !== 99 && p.src && w.rng.next() > 0.5) continue;  // friendly arrows often pass over
      if (p.aoe > 0) { this._explode(p); return true; }
      return this._hitUnit(p, u);
    }
    return false;
  }

  _hitUnit(p, u) {
    const w = this.w, src = p.src;
    const hp0 = u.hp;
    const opts = { type: p.type, ap: p.opts.ap, proj: true, kb: p.kind === 'bolt' ? 6 : 1.5, breaksShield: p.breaks, cause: 'ranged', x: p.px, z: p.pz, dir: [p.vx, p.vz] };
    const fin = applyDamage(w, src && src.alive ? src : (src || null), u, p.dmg, opts);
    const e = w.P.projectile_hit; e.kind = p.kind; e.x = p.x; e.y = p.y; e.z = p.z; e.onUnit = true; e.blocked = fin === 0; w.emit('projectile_hit', e);
    if (fin > 0) {
      if (p.fire && u.alive) u.se[SE.BURN] = Math.max(u.se[SE.BURN], w.weather ? 3 * w.weather.burnMul : 3);
      if (p.bribe && u.alive && w.rng.next() < p.bribe) w.convertUnit(u, p.team, 6);
      if (p.chain > 0 && u.alive !== undefined) this._chain(p, u);
    }
    if (p.hits < 6) p.hitIds[p.hits] = u.id;
    p.hits++;
    if (fin === 0 || p.hits >= p.pierceN) { p.stuck = p.kind === 'bolt' ? 1.0 : 2.5; p.vx = p.vy = p.vz = 0; return p.stuck <= 0; }
    p.dmg *= 0.8;
    return false;
  }

  _chain(p, first) {
    const w = this.w; let from = first, dmg = p.dmg * 0.7;
    const done = [first.id];
    for (let j = 0; j < p.chain - 1; j++) {
      let best = null, bd = 64;
      const n = w.hash.query(from.x, from.z, 8, w.qbuf);
      for (let k = 0; k < n; k++) {
        const o = w.units[w.qbuf[k]]; if (!o || !o.alive || o.team === p.team || done.includes(o.id)) continue;
        const d2 = (o.x - from.x) ** 2 + (o.z - from.z) ** 2; if (d2 < bd) { bd = d2; best = o; }
      }
      if (!best) break;
      const e = w.P.lightning_arc; e.x0 = from.x; e.y0 = from.y + from.height * 0.6; e.z0 = from.z; e.x1 = best.x; e.y1 = best.y + best.height * 0.6; e.z1 = best.z; w.emit('lightning_arc', e);
      applyDamage(w, p.src, best, dmg, { type: 'magic', ap: 1, kb: 2, cause: 'magic', noBlock: true });
      done.push(best.id); from = best; dmg *= 0.7;
    }
  }

  _explode(p) {
    const w = this.w, r = p.aoe;
    const e = w.P.explosion; e.kind = p.kind === 'boulder' ? 'boulder' : p.type === 'fire' ? 'fire' : 'magic'; e.x = p.x; e.y = p.y; e.z = p.z; e.r = r; w.emit('explosion', e);
    w.areaDamage(p.src, p.x, p.y, p.z, r, p.dmg, { type: p.type, kb: 8, cause: 'aoe', aoe: true, proj: false, friendlyFire: true }, p.team);
    if (p.crater) w.makeCrater(p.x, p.z, Math.max(1.4, r * 0.55), 3);
    if (p.type === 'fire') w.igniteAt(p.x, p.z, r);
    w.damageProps(p.x, p.z, r, p.dmg * 1.2);
    p.stuck = 0.01;
  }
}
