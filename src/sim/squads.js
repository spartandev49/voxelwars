// Squad layer of the AI (spec §8.1 layer 1): anchor + formation slots, orders, line-aligned lag-throttled march, cavalry flank waypoints.
// A Squad owns an anchor point that marches along the team's flow field; members hold slots relative to it and break off to fight
// individually when they acquire a target (ai.js). Everything is allocation-free after construction.

import { G } from './consts.js';
import { angleDiff } from './combat.js';

export const CLS = { LINE: 0, HERO: 1, RANGED: 2, SUPPORT: 3, SIEGE: 4, CAV: 5 };

export function squadClass(def) {
  if (def.role === 'siege') return CLS.SIEGE;
  if (def.role === 'support') return CLS.SUPPORT;
  if (def.role === 'cavalry' && !(def.tags.includes('officer'))) return def.ai && def.ai.style === 'skirmish' ? CLS.RANGED : CLS.CAV;
  if (def.role === 'hero') return CLS.HERO;
  if (def.role === 'ranged') return CLS.RANGED;
  return CLS.LINE;
}

export class Squad {
  constructor(id, team, defId, def) {
    this.id = id; this.team = team; this.defId = defId; this.units = []; this.order = 'advance';
    this.ax = 0; this.az = 0; this.facing = 0; this.speed = 0; this.vx = 0; this.vz = 0; this.alive = true;
    this.cls = def ? squadClass(def) : CLS.LINE;
    this.formation = 'block';
    this.n = 0; this.cx = 0; this.cz = 0; this.d = 0; this.engF = 0; this.halfW = 1; this.lagT = 0; this.lag = 0;
    this.moveTo = null; this.focus = 0;
    this.flankStage = 0; this.flankT = 0; this.flankX = 0; this.flankZ = 0; this.flankSide = 0; this.holdX = 0; this.holdZ = 0; this.holdSet = false;
    this.mode = 'form';                        // kept for render/debug compatibility
    this.watch = false; this.minSpeed = 2.5; this.press = 0; this.lineT = 0; this.lineOk = true;
  }
}

const _t = [0, 0];

/** Per-tick squad update. Order of passes: members/centroid/engagement -> line alignment -> anchor motion. */
export function updateSquads(w, dt) {
  const sqs = w.squads, nav = w.nav;
  const sumD = w._sumD, cntD = w._cntD;
  sumD[0] = sumD[1] = 0; cntD[0] = cntD[1] = 0;
  // ---- pass A: compaction, centroid, speed, engagement, lag
  for (let i = sqs.length - 1; i >= 0; i--) {
    const sq = sqs[i];
    const us = sq.units;
    let n = 0, cx = 0, cz = 0, eng = 0, minSp = 99, hw = 0, press = 0;
    for (let k = 0, m = us.length; k < m; k++) {
      const u = us[k];
      if (!u.alive || u.squad !== sq) continue;
      us[n++] = u;
      cx += u.x; cz += u.z; if (u.engaged) eng++;
      const sp = u.speedBase * u.mSpeed; if (sp < minSp) minSp = sp;
      const a = Math.abs(u.sox); if (a > hw) hw = a;
      press += u.press; u.press = 0;
    }
    us.length = n;
    if (n === 0) { sq.alive = false; sqs.splice(i, 1); continue; }
    sq.press += (press / n - sq.press) * 0.15;
    sq.n = n; sq.cx = cx / n; sq.cz = cz / n; sq.engF = eng / n; sq.minSpeed = minSp; sq.halfW = hw + 0.6;
  }
  const forceAdv = w.forceAdvance;
  for (let i = 0; i < sqs.length; i++) {
    const sq = sqs[i];
    if (forceAdv && sq.order === 'hold') sq.order = 'advance';
    const f = w.fields[sq.team];
    sq.d = f.valid ? f.distAt(sq.ax, sq.az) : 1e9;
    if (sq.d > 1e8) sq.d = f.valid ? f.distAt(sq.cx, sq.cz) : 1e9;
    if (sq.cls === CLS.LINE && sq.d < 1e8) { sumD[sq.team] += sq.d * sq.n; cntD[sq.team] += sq.n; }
  }
  // ---- pass B: anchor motion
  const c = G;
  for (let i = 0; i < sqs.length; i++) {
    const sq = sqs[i], team = sq.team, us = sq.units, n = sq.n;
    const f = w.fields[team];
    const cs = Math.cos(sq.facing), sn = Math.sin(sq.facing);
    // lag of members from their slots (robust: mean/max blend)
    let lagSum = 0, lagMax = 0;
    for (let k = 0; k < n; k++) {
      const u = us[k];
      const gx = sq.ax + cs * u.sox + sn * u.soz, gz = sq.az - sn * u.sox + cs * u.soz;
      const d = Math.hypot(gx - u.x, gz - u.z); lagSum += d; if (d > lagMax) lagMax = d;
    }
    const lagEff = Math.min(lagMax, (lagSum / n) * 1.8);
    sq.lag = lagEff;
    let lagF = Math.max(0.25, Math.min(1, 1 - (lagEff - 2.0) / 6));
    if (lagF < 0.5) { sq.lagT += dt; if (sq.lagT > 3) lagF = Math.max(lagF, 0.8); } else if (lagEff < 1.5) sq.lagT = 0;
    let dx = 0, dz = 0, move = false, sp = 0, want = sq.facing, turnW = true;
    const order = sq.order;
    if (order === 'hold') { /* anchor stays */ }
    else if (order === 'retreat') {
      const ec = w.centroid[1 - team];
      if (ec && ec.n) { const l = Math.hypot(sq.ax - ec.x, sq.az - ec.z) || 1; dx = (sq.ax - ec.x) / l; dz = (sq.az - ec.z) / l; move = true; sp = sq.minSpeed * 1.15 * lagF; want = Math.atan2(-dx, -dz); }
    } else if (order === 'move' && sq.moveTo) {
      const mx = sq.moveTo.x - sq.ax, mz = sq.moveTo.z - sq.az, l = Math.hypot(mx, mz);
      if (l < 1.0) { sq.order = 'hold'; sq.moveTo = null; }
      else {
        move = true;
        if (nav.clearLine(sq.ax, sq.az, sq.moveTo.x, sq.moveTo.z)) { dx = mx / l; dz = mz / l; }
        else if (f.valid && f.dir(sq.ax, sq.az, _t)) { dx = _t[0]; dz = _t[1]; } else { dx = mx / l; dz = mz / l; }
        sp = sq.minSpeed * 1.2 * lagF; want = Math.atan2(dx, dz);
      }
    } else {
      // advance / focus / flank / skirmish
      let flanking = false;
      if (order === 'flank' && sq.cls === CLS.CAV && w.diff[team] > 0) flanking = flankStep(w, sq, dt);
      if (flanking) {
        const mx = sq.flankX - sq.ax, mz = sq.flankZ - sq.az, l = Math.hypot(mx, mz) || 1;
        dx = mx / l; dz = mz / l; move = true; sp = sq.minSpeed * 1.25 * lagF; want = Math.atan2(dx, dz);
        if (!nav.clearLine(sq.ax, sq.az, sq.flankX, sq.flankZ) && f.valid && f.dir(sq.ax, sq.az, _t)) { dx = _t[0]; dz = _t[1]; want = Math.atan2(dx, dz); }
      } else if (f.valid) {
        // march along the army's attack axis (parallel lines meet head-on); the flow field only takes over when the way is blocked
        const axx = w.axis[team * 2], axz = w.axis[team * 2 + 1];
        sq.lineT -= dt;
        if (sq.lineT <= 0) {
          // straight is fine while the flow-field distance keeps dropping at about the walking rate (trees add small detours; walls/rivers add big ones)
          const here = f.distAt(sq.ax, sq.az), px = sq.ax + axx * 8, pz = sq.az + axz * 8;
          sq.lineOk = nav.walkable(px, pz) && f.distAt(px, pz) <= here - 4.5;
          sq.lineT = 0.4;
        }
        if (sq.lineOk && (axx !== 0 || axz !== 0)) { dx = axx; dz = axz; move = true; }
        else if (f.dir(sq.ax, sq.az, _t) || f.dir(sq.cx, sq.cz, _t)) { dx = _t[0]; dz = _t[1]; move = true; }
        want = Math.atan2(dx, dz);
        let j = (sq.d - c.engageNear) / (c.engageFar - c.engageNear); j = j < 0 ? 0 : j > 1 ? 1 : j;
        sp = sq.minSpeed * (1 + (c.jogMul - 1) * j) * lagF;
        if (sq.cls === CLS.CAV) sp *= 1.1;
        sp /= 1 + 5 * sq.press;                    // crowd pressure feedback: a squad being squeezed stops pushing forward
        // line alignment: squads ahead of the line mean wait, squads behind catch up; support/ranged stay behind the line
        const D = w._cntD[team] > 0 ? w._sumD[team] / w._cntD[team] : sq.d;
        if (sq.d < 1e8) {
          const ahead = D - sq.d;        // > 0: this squad is closer to the enemy than the line mean
          if (sq.cls === CLS.LINE) sp *= clamp(1 - 0.16 * ahead, 0.45, 1.2);
          else if (sq.cls === CLS.HERO) sp *= clamp(1 - 0.16 * (ahead - 2), 0.4, 1.2);
          else if (sq.cls === CLS.RANGED) { const lim = ahead - (-3.0); sp *= clamp(1 - 0.2 * lim, 0, 1.15); }
          else if (sq.cls === CLS.SUPPORT) { const lim = ahead - (-5.0); sp *= clamp(1 - 0.2 * lim, 0, 1.1); }
          else if (sq.cls === CLS.SIEGE) { const lim = ahead - (-7.0); sp *= clamp(1 - 0.2 * lim, 0, 1.0); }
        }
        if (sq.watch && D < 24) sp = 0;            // overseer squads (Xerxes) stop at a distance and watch
        // in contact: push the anchor forward slowly so rear ranks follow the front as it advances
        if (sq.engF > 0) {
          if (sq.cls === CLS.RANGED || sq.cls === CLS.SIEGE || sq.cls === CLS.SUPPORT) sp *= sq.engF > 0.2 ? 0 : 0.5;
          else sp *= sq.engF >= 0.25 ? 0.28 : 0.7;
        }
      }
    }
    if (!move || sp <= 0.02) { sq.speed = 0; sq.vx = 0; sq.vz = 0; }
    else {
      const nx = sq.ax + dx * sp * dt, nz = sq.az + dz * sp * dt;
      let ok = true;
      if (nav.walkable(nx, nz)) { sq.ax = nx; sq.az = nz; }
      else if (nav.walkable(nx, sq.az)) { sq.ax = nx; dz = 0; }
      else if (nav.walkable(sq.ax, nz)) { sq.az = nz; dx = 0; }
      else ok = false;
      if (ok) { sq.speed = sp; sq.vx = dx * sp; sq.vz = dz * sp; } else { sq.speed = 0; sq.vx = 0; sq.vz = 0; }
      if (turnW) {
        const rate = clamp(2.8 / sq.halfW, 0.3, 1.6) * dt, d = angleDiff(sq.facing, want);
        sq.facing += d > rate ? rate : d < -rate ? -rate : d;
      }
    }
    // the anchor tracks the group so a squad that fought comes back together instead of marching to a stale point
    if (sq.engF > 0 || sq.speed === 0) {
      const k = Math.min(1, dt * (sq.engF > 0 ? 1.5 : 0.8));
      sq.ax += (sq.cx - sq.ax) * k * 0.5; sq.az += (sq.cz - sq.az) * k * 0.5;
      if (!nav.walkable(sq.ax, sq.az)) { sq.ax = sq.cx; sq.az = sq.cz; }
    }
    sq.mode = sq.engF > 0 ? 'free' : 'form';
  }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/** Cavalry flank state machine. Returns true while the squad should steer to (flankX, flankZ). */
function flankStep(w, sq, dt) {
  const team = sq.team, ec = w.centroid[1 - team], mc = w.centroid[team];
  if (!ec || !ec.n) return false;
  if (sq.flankStage === 0) {
    sq.flankT += dt;
    // pick the wing once: the side the squad already sits on relative to the attack axis
    const ax = ec.x - mc.x, az = ec.z - mc.z, al = Math.hypot(ax, az) || 1, nx = ax / al, nz = az / al;
    const lx = -nz, lz = nx;
    if (sq.flankSide === 0) { const s = (sq.ax - mc.x) * lx + (sq.az - mc.z) * lz; sq.flankSide = Math.abs(s) < 1.5 ? (sq.id % 2 ? 1 : -1) : (s > 0 ? 1 : -1); }
    const ext = w.enemyExt[team] || 12;
    // aim at the enemy's rear area (ranged/siege/support centroid when they exist), beside the line
    const bx = w.enemyBack[team].n ? w.enemyBack[team].x : ec.x, bz = w.enemyBack[team].n ? w.enemyBack[team].z : ec.z;
    sq.flankX = bx + lx * sq.flankSide * (ext + 4) + nx * 2; sq.flankZ = bz + lz * sq.flankSide * (ext + 4) + nz * 2;
    const d = Math.hypot(sq.flankX - sq.ax, sq.flankZ - sq.az);
    // contact of the main line, arrival, or timeout ends the wide swing
    if (d < 7 || sq.flankT > 22 || sq.d < 9) { sq.flankStage = 1; return false; }
    // do not run past the point where the wide swing is pointless (already close to the enemy)
    if (sq.d < 16) { sq.flankStage = 1; return false; }
    return true;
  }
  return false;
}
