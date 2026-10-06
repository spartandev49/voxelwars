// Unit AI: tactical targeting (scored, with persistence + engagement slots), movement intent (formation slots, flow field,
// kiting, rout), and the per-unit state machine. Movement integration + collisions live in world.js.

import { ST, SE, G } from './consts.js';
import { startMelee, startRanged, resolveMelee, setAnim, angleDiff } from './combat.js';
import { ClipLib } from '../anim/clips.js';

const TAU = Math.PI * 2;
const _d = [0, 0];

export function aggroRadius(u) {
  const d = u.def, st = d.ai ? d.ai.style : 'charge';
  const rng = d.ranged ? d.ranged.range : 0;
  switch (st) {
    case 'hold': return 11 + (rng ? rng * 0.5 : 0);
    case 'skirmish': return Math.max(rng + 8, 20);
    case 'siege': return rng + 6;
    case 'support': return 16;
    case 'hero': return 26;
    case 'guard': return 14;
    default: return 42;               // charge / flank
  }
}

function slotsFor(t) { return t.def.tags.includes('large') ? 8 : 2 + Math.floor(t.radius * 4); }

/** Scored target pick. Returns best enemy unit or null. */
export function pickTarget(w, u) {
  const R = aggroRadius(u), R2 = R * R;
  const n = w.hash.query(u.x, u.z, R, w.qbuf);
  const d = u.def, tags = d.tags, ranged = !!d.ranged && !d.melee ? true : (d.ranged && d.ai.style === 'skirmish');
  let best = null, bestScore = -1e9;
  const prefer = d.ai && d.ai.preferTargets;
  const cavalry = tags.includes('cavalry'), spear = tags.includes('spear') || tags.includes('pike'), isSiege = d.role === 'siege';
  for (let k = 0; k < n; k++) {
    const c = w.units[w.qbuf[k]];
    if (!c || !c.alive || c.team === u.team || c.se[SE.STONE] > 0 && false) continue;
    const dx = c.x - u.x, dz = c.z - u.z, d2 = dx * dx + dz * dz;
    if (d2 > R2) continue;
    const dist = Math.sqrt(d2);
    let score = 100 - dist * 2.2;
    if (c === u.target) score += 25;                       // persistence
    if (c.atkCount >= slotsFor(c) && !(d.melee && d.melee.range >= 2) && !ranged) score -= 18;   // slot full: prefer others
    const ct = c.def.tags;
    if (cavalry && (ct.includes('archer') || c.def.role === 'siege' || c.def.role === 'support')) score += 28;
    if (spear && ct.includes('cavalry')) score += 22;
    if (isSiege) { /* clusters preferred: count neighbours cheaply via atkCount proxy */ score += Math.min(20, c.atkCount * 4) + (c.def.role === 'siege' ? 15 : 0); }
    if (ranged && c.hp < c.hpMax * 0.5) score += 8;
    if (c.def.role === 'hero' || ct.includes('officer')) score += (d.ai.style === 'hero' ? 10 : 6);
    if (u.def.role === 'hero' || ct.includes('boss')) score += 4;
    if (c.se[SE.TAUNT] < 0) score += 0;
    if (c.stone > 0.5) score -= 20;                        // statues are low priority
    if (c.se[SE.SLEEP] > 0) score += 6;
    if (prefer) for (let i = 0; i < prefer.length; i++) if (ct.includes(prefer[i])) score += 20;
    if (c.def.id === 'sacred_chicken') score += 0;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (best && u.target && best !== u.target && u.target.alive) {
    // hysteresis: only switch if clearly better
    const ct = u.target, dx = ct.x - u.x, dz = ct.z - u.z, dd = Math.sqrt(dx * dx + dz * dz);
    if (dd <= R && bestScore < 100 - dd * 2.2 + 25 + 20) return ct;
  }
  return best;
}

function enemyDir(w, u, out) {
  const f = w.fields[u.team];
  if (f && f.valid && f.dir(u.x, u.z, out)) return true;
  return false;
}

/** Steer toward a world point; falls back to the team flow field when the straight line is blocked. */
function steer(w, u, tx, tz, speed) {
  const dx = tx - u.x, dz = tz - u.z, l = Math.hypot(dx, dz);
  if (l < 0.02) { u.dvx = 0; u.dvz = 0; return; }
  if (u.lineT <= 0) { u.lineOk = w.nav.clearLine(u.x, u.z, tx, tz); u.lineT = 0.35 + (u.id % 5) * 0.04; }
  let nx = dx / l, nz = dz / l;
  if (!u.lineOk && enemyDir(w, u, _d)) { nx = _d[0]; nz = _d[1]; }
  u.dvx = nx * speed; u.dvz = nz * speed;
  u.face = Math.atan2(nx, nz);
}

function clipForMove(u, speed) {
  const d = u.def;
  if (d.role === 'cavalry' || d.tags.includes('cavalry')) return speed > d.speed * 1.35 ? 'gallop' : 'trot';
  if (d.role === 'beast' || d.tags.includes('animal')) return speed > d.speed * 1.2 ? 'gallop' : 'trot';
  return speed > d.speed * 1.25 ? 'run' : 'walk';
}

export function think(w, u, dt) {
  const se = u.se, def = u.def;
  u.lineT -= dt;
  // ----- hard disables -----
  if (se[SE.STUN] > 0 || se[SE.SLEEP] > 0 || se[SE.STONE] > 0) {
    u.dvx = 0; u.dvz = 0; u.state = ST.STUN;
    setAnim(u, se[SE.SLEEP] > 0 ? 'cower' : 'stun', 1);
    if (se[SE.STONE] > 0) u.anim.rate = 0;
    return;
  }
  if (u.state === ST.STUN) { u.state = ST.IDLE; u.stateT = 0; }
  // ----- timed states -----
  switch (u.state) {
    case ST.WINDUP: {
      u.stateT += dt;
      // keep facing the target during windup
      if (u.target && u.target.alive) { u.face = Math.atan2(u.target.x - u.x, u.target.z - u.z); if (u.atkKind === 1 && def.ranged.whileMoving) { /* moves on */ } else { u.dvx = 0; u.dvz = 0; } }
      if (!u.hitDone && u.stateT >= u.hitAt) {
        u.hitDone = true;
        if (u.atkKind === 0) resolveMelee(w, u);
        else if (u.target && u.target.alive) w.fireRanged(u);
      }
      if (u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; setAnim(u, 'idle_combat', 1); }
      return;
    }
    case ST.STAGGER: u.stateT += dt; u.dvx = 0; u.dvz = 0; if (u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; } return;
    case ST.CAST: case ST.SIT: case ST.GETUP: u.stateT += dt; u.dvx = 0; u.dvz = 0; if (u.state !== ST.SIT && u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; } return;
    case ST.ROUT: break;
    default: break;
  }
  const speedBase = def.speed * u.mSpeed;
  // ----- rout / fear -----
  if (u.state === ST.ROUT || se[SE.SCARE] > 0) { flee(w, u, speedBase * 1.25); return; }
  // ----- confusion: stumble around -----
  if (se[SE.CONFUSE] > 0) {
    if (((w.tickN + u.id) & 15) === 0) { u.face = w.rng.next() * TAU; }
    u.dvx = Math.sin(u.face) * speedBase * 0.5; u.dvz = Math.cos(u.face) * speedBase * 0.5; u.state = ST.MOVE;
    setAnim(u, 'dizzy', 1); return;
  }
  // ----- target management -----
  if (u.target && (!u.target.alive || u.target.team === u.team)) u.target = null;
  u.targetT -= 1;
  if (se[SE.TAUNT] > 0 && u.tauntSrc && u.tauntSrc.alive) { u.target = u.tauntSrc; }
  else if (u.targetT <= 0) {
    u.targetT = G.retargetEvery + ((u.id * 7) & 3);
    u.target = pickTarget(w, u);
  }
  const t = u.target;
  const melee = def.melee, ranged = def.ranged;
  let acted = false;
  if (t) {
    const dx = t.x - u.x, dz = t.z - u.z, dist = Math.hypot(dx, dz), gap = dist - u.radius - t.radius;
    const want = Math.atan2(dx, dz);
    u.face = want;
    const fdiff = Math.abs(angleDiff(u.heading, want));
    // ---- ranged behaviour ----
    const useRanged = !!ranged && (!melee || gap > melee.range + 1.2);
    if (useRanged) {
      const range = ranged.range, minR = ranged.minRange || 0;
      const skirm = def.ai.style === 'skirmish' || def.tags.includes('skirmisher');
      if (gap < minR || (skirm && gap < Math.min(range * 0.38, 6) && !melee) || (skirm && gap < 4.5 && u.cdR > 0.35)) {
        // kite away
        const l = dist || 1; u.dvx = -dx / l * speedBase * 1.05; u.dvz = -dz / l * speedBase * 1.05; u.state = ST.MOVE; acted = true;
        setAnim(u, clipForMove(u, speedBase), speedBase / (ClipLib.meta('walk').speedRef || 2.6));
        if (!w.nav.walkable(u.x + u.dvx * 0.3, u.z + u.dvz * 0.3)) { u.dvx = 0; u.dvz = 0; }
        if (gap < 1.4 && melee && u.cd <= 0) { u.target = t; startMelee(w, u); }
        return;
      }
      if (gap <= range * 0.98) {
        // in range: hold and shoot
        if (!ranged.whileMoving) { u.dvx = 0; u.dvz = 0; } else steer(w, u, t.x, t.z, speedBase * 0.9);
        u.state = ranged.whileMoving ? ST.MOVE : ST.IDLE;
        if (u.cdR <= 0 && fdiff < 0.4 && w.hasShot(u, t)) { startRanged(w, u); return; }
        setAnim(u, ranged.whileMoving ? clipForMove(u, speedBase) : 'idle_combat', 1);
        return;
      }
      // approach to 0.85*range
      steer(w, u, t.x, t.z, speedBase); u.state = ST.MOVE; acted = true;
      setAnim(u, clipForMove(u, u.speedNow || speedBase), Math.max(0.6, (u.speedNow || speedBase) / (ClipLib.meta(u.anim.clip).speedRef || 2.6)));
      return;
    }
    // ---- melee behaviour ----
    if (melee) {
      const reach = melee.range;
      if (gap <= reach + 0.15) {
        u.dvx = 0; u.dvz = 0; u.state = ST.IDLE;
        t.atkCount++;
        if (u.cd <= 0 && fdiff < 0.55) { startMelee(w, u); return; }
        setAnim(u, 'idle_combat', 1);
        return;
      }
      // charge: cavalry & beasts build speed; others walk/run at 1.0-1.3x
      let sp = speedBase;
      if (def.runMul > 1.2 || def.tags.includes('cavalry')) sp = speedBase * (gap > 6 ? def.runMul : 1.2);
      else if (gap > 6) sp = speedBase * 1.15;
      steer(w, u, t.x, t.z, sp); u.state = ST.MOVE;
      setAnim(u, clipForMove(u, sp), Math.max(0.5, sp / (ClipLib.meta(clipForMove(u, sp)).speedRef || 2.6)));
      return;
    }
    // units with no weapons (support): keep distance, fall through to support behaviour below
  }
  // ----- no (usable) target: follow squad slot or the flow field -----
  u.state = ST.MOVE;
  const sq = u.squad;
  let goalX = 0, goalZ = 0, have = false, sp = speedBase;
  if (sq && sq.alive) {
    if (sq.mode === 'form') {
      const c = Math.cos(sq.facing), s = Math.sin(sq.facing);
      // slot = anchor + left*lx + forward*lz   (left = (cos h, -sin h), forward = (sin h, cos h))
      goalX = sq.ax + c * u.sox + s * u.soz; goalZ = sq.az - s * u.sox + c * u.soz; have = true;
      const dx = goalX - u.x, dz = goalZ - u.z, dd = Math.hypot(dx, dz);
      sp = Math.min(speedBase * 1.6, sq.speed + dd * 2.2);
      if (dd < 0.35) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.face = sq.facing; setAnim(u, 'idle', 1); return; }
    } else if (sq.order === 'hold' || sq.order === 'guard') {
      // engaged hold squad with nothing in sight: drift back toward the slot
      const c = Math.cos(sq.facing), s = Math.sin(sq.facing);
      goalX = sq.ax + c * u.sox + s * u.soz; goalZ = sq.az - s * u.sox + c * u.soz; have = true;
      const dd = Math.hypot(goalX - u.x, goalZ - u.z);
      if (dd < 1.0) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; setAnim(u, 'idle', 1); return; }
    }
  }
  if (!have) {
    // lone wolf / engaged squad member without target: advance on the nearest enemy via the flow field (not for 'hold' style)
    if (def.ai.style === 'hold' && sq && sq.order === 'hold') { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; setAnim(u, 'idle', 1); return; }
    if (def.role === 'support') { supportMove(w, u, speedBase); return; }
    if (enemyDir(w, u, _d)) { u.dvx = _d[0] * speedBase; u.dvz = _d[1] * speedBase; u.face = Math.atan2(_d[0], _d[1]); }
    else { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; }
    setAnim(u, u.state === ST.IDLE ? 'idle' : clipForMove(u, speedBase), 1);
    return;
  }
  if (def.role === 'support' && sq && sq.mode !== 'form') { supportMove(w, u, speedBase); return; }
  steer(w, u, goalX, goalZ, sp);
  setAnim(u, clipForMove(u, sp), Math.max(0.5, sp / (ClipLib.meta(clipForMove(u, sp)).speedRef || 2.6)));
}

/** Support units stay behind friendly melee and away from enemies. */
function supportMove(w, u, speed) {
  const n = w.hash.query(u.x, u.z, 9, w.qbuf);
  let ex = 0, ez = 0, en = 0, fx = 0, fz = 0, fn = 0;
  for (let k = 0; k < n; k++) {
    const c = w.units[w.qbuf[k]]; if (!c || !c.alive || c === u) continue;
    if (c.team !== u.team) { ex += c.x; ez += c.z; en++; }
    else if (c.def.role === 'melee' || c.def.role === 'hero') { fx += c.x; fz += c.z; fn++; }
  }
  if (en > 0) { const l = Math.hypot(u.x - ex / en, u.z - ez / en) || 1; u.dvx = (u.x - ex / en) / l * speed; u.dvz = (u.z - ez / en) / l * speed; u.face = Math.atan2(u.dvx, u.dvz); u.state = ST.MOVE; setAnim(u, 'walk', 1); return; }
  if (fn > 0) { const tx = fx / fn, tz = fz / fn, d = Math.hypot(tx - u.x, tz - u.z); if (d > 4) { steer(w, u, tx, tz, speed); setAnim(u, 'walk', 1); u.state = ST.MOVE; return; } }
  if (enemyDir(w, u, _d) && fn === 0) { u.dvx = _d[0] * speed * 0.8; u.dvz = _d[1] * speed * 0.8; u.face = Math.atan2(_d[0], _d[1]); setAnim(u, 'walk', 1); return; }
  u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; setAnim(u, 'idle', 1);
}

function flee(w, u, speed) {
  // run away from the nearest enemies / enemy centroid
  const n = w.hash.query(u.x, u.z, 14, w.qbuf);
  let ex = 0, ez = 0, en = 0;
  for (let k = 0; k < n; k++) { const c = w.units[w.qbuf[k]]; if (c && c.alive && c.team !== u.team) { const wgt = 1 / (0.5 + Math.hypot(c.x - u.x, c.z - u.z)); ex += (c.x - u.x) * wgt; ez += (c.z - u.z) * wgt; en += wgt; } }
  let dx, dz;
  if (en > 0) { dx = -ex; dz = -ez; } else { const ec = w.centroid[1 - u.team === 0 ? 0 : 1]; dx = u.x - (ec ? ec.x : 0); dz = u.z - (ec ? ec.z : 0); }
  const l = Math.hypot(dx, dz) || 1;
  u.dvx = dx / l * speed; u.dvz = dz / l * speed; u.face = Math.atan2(u.dvx, u.dvz); u.state = ST.ROUT;
  setAnim(u, 'rout', 1);
}
