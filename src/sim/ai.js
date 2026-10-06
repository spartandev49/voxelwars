// Unit AI (spec §8.1 layers 2+3): scored targeting with persistence and attack tokens (engagement slots), role behaviours
// (melee line, spear reach, archers that hold and kite, skirmishers, siege, support, heroes), and movement intent.
// Movement integration and collision live in world.js. Allocation-free per tick.

import { ST, SE, G } from './consts.js';
import { startMelee, startRanged, resolveMelee, setAnim, angleDiff, releaseClaim } from './combat.js';
import { CLS } from './squads.js';

const TAU = Math.PI * 2;
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const _d = [0, 0];

/** Cached per-def AI facts. */
export function aiInfo(d) {
  if (d._ai) return d._ai;
  const st = d.ai ? d.ai.style : 'charge', rng = d.ranged ? d.ranged.range : 0;
  const tags = d.tags;
  const a = { style: st, cav: tags.includes('cavalry') && d.role === 'cavalry', spear: tags.includes('spear') || tags.includes('pike') || (d.melee && d.melee.range >= 2.0), siege: d.role === 'siege', support: d.role === 'support', hero: d.role === 'hero' || tags.includes('officer'),
    ranged1st: !!d.ranged && (!d.melee || st === 'skirmish' || st === 'siege' || st === 'support' || d.role === 'ranged'), kiter: false, aggro: 12, scan: 12, flees: st === 'guard' };
  a.kiter = a.ranged1st && !!d.melee && (tags.includes('skirmisher') || st === 'skirmish') && d.role !== 'support';
  a.archer = tags.includes('archer');
  // target-side facts, precomputed so the scan loops do no string searches
  a.large = tags.includes('large'); a.tCav = tags.includes('cavalry'); a.tArch = a.archer || d.role === 'siege' || d.role === 'support' || d.role === 'ranged';
  a.officer = d.role === 'hero' || tags.includes('officer'); a.fearless = tags.includes('fearless'); a.discipline = tags.includes('discipline');
  let ag;
  switch (st) {
    case 'hold': ag = 11; break;
    case 'skirmish': ag = rng + 4; break;
    case 'siege': ag = rng + 6; break;
    case 'support': ag = Math.max(12, rng + 2); break;
    case 'hero': ag = 15; break;
    case 'guard': ag = 10; break;
    case 'flank': ag = 42; break;
    default: ag = 17;                // charge
  }
  if (d.ai && d.ai.aggro) ag = d.ai.aggro;
  if (a.ranged1st && d.role !== 'support') ag = Math.max(ag, rng + 3);
  a.aggro = ag;
  a.scan = ag;
  a.prefer = d.ai && d.ai.preferTargets ? d.ai.preferTargets : null;
  d._ai = a;
  return a;
}
export function aggroRadius(u) { return aiInfo(u.def).aggro; }

export function slotsFor(t) { const a = t.def._ai || aiInfo(t.def); return a.large ? G.slotsLarge : G.slotsBase + Math.floor(t.radius * G.slotsPerRadius); }

/** Scored target pick. Returns the best enemy unit or null. */
export function pickTarget(w, u) {
  const info = aiInfo(u.def), d = u.def;
  const units = w.units, q = w.qbuf, hash = w.hash;
  let best = null, bestScore = -1e9, curScore = -1e9;
  const cur = u.target && u.target.alive ? u.target : null;
  const hard = w.diff[u.team] === 2;
  const sq = u.squad, focusU = sq && sq.focus ? w.unitById(sq.focus) : null;
  const R = info.scan;
  const ring1 = info.cav ? 0 : Math.min(R, 8.5);
  for (let pass = 0; pass < 2 && !best; pass++) {
    const rad = pass === 0 && ring1 > 0 && ring1 < R ? ring1 : R;
    const n = hash.query(u.x, u.z, rad, q), r2 = rad * rad;
    for (let k = 0; k < n; k++) {
      const c = units[q[k]];
      if (!c || !c.alive || c.team === u.team || c.state === ST.DOWN) continue;
      const dx = c.x - u.x, dz = c.z - u.z, d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      const dist = Math.sqrt(d2);
      let s = 100 - dist * 2.2;
      if (c === cur) s += 25;
      const ci = c.def._ai || aiInfo(c.def);
      if (!info.ranged1st) { const sl = ci.large ? G.slotsLarge : G.slotsBase + Math.floor(c.radius * G.slotsPerRadius); const lim = info.spear ? sl * 2 : sl; if (c.claims >= lim && c !== u.claim) s -= 40; }
      if (info.cav && ci.tArch) s += 40;
      if (info.spear && ci.tCav) s += 24;
      if (info.siege) s += (c.def.role === 'siege' ? 12 : 0) + clusterBonus(w, c);
      if (info.ranged1st && !info.siege && c.hp < c.hpMax * 0.5) s += 8;
      if (hard) s += 14 * (1 - c.hp / c.hpMax);
      if (ci.officer) s += info.hero ? 10 : 6;
      if (c.stone > 0.5) s -= 20;
      if (c.se[SE.SLEEP] > 0) s += 6;
      if (c === focusU) s += 90;
      if (info.prefer) for (let i = 0; i < info.prefer.length; i++) if (c.def.tags.includes(info.prefer[i])) s += 20;
      if (c.vip) s += 5;
      if (c === cur) curScore = s;
      if (s > bestScore) { bestScore = s; best = c; }
    }
  }
  if (best && cur && best !== cur && curScore > -1e8 && bestScore < curScore + 18) return cur;     // hysteresis
  return best;
}

function clusterBonus(w, c) {
  const n = w.hash.query(c.x, c.z, 3, w.qbuf2);
  let cnt = 0;
  for (let k = 0; k < n; k++) { const o = w.units[w.qbuf2[k]]; if (o && o.alive && o.team === c.team) cnt++; }
  return Math.min(26, cnt * 2.5);
}

function enemyDir(w, u, out) {
  const f = w.fields[u.team];
  return !!(f && f.valid && f.dir(u.x, u.z, out));
}

/** Steer toward a world point; falls back to the team flow field when the straight line is blocked. */
function steer(w, u, tx, tz, speed) {
  const dx = tx - u.x, dz = tz - u.z, l = hyp(dx, dz);
  if (l < 0.02) { u.dvx = 0; u.dvz = 0; return; }
  if (u.lineT <= 0) { u.lineOk = w.nav.clearLine(u.x, u.z, tx, tz); u.lineT = 0.4 + (u.id % 5) * 0.05; }
  let nx = dx / l, nz = dz / l;
  if (!u.lineOk && enemyDir(w, u, _d)) { nx = _d[0]; nz = _d[1]; }
  // blocked by bodies: slide sideways (alternating per unit) so queues open up instead of pushing
  if (u.blockT > 0.45) { const s = u.sideSign * 0.8; const px = -nz * s, pz = nx * s; nx += px; nz += pz; const m = hyp(nx, nz) || 1; nx /= m; nz /= m; }
  u.dvx = nx * speed; u.dvz = nz * speed;
  setFace(u, Math.atan2(nx, nz));
}

/** True when the point just ahead of u is already crowded by slow/blocked friends (queue instead of shoving). */
function crowdAhead(w, u, vx, vz) {
  const l = hyp(vx, vz); if (l < 0.3) return false;
  if (u.waitT > 0) { u.waitT -= 1 / 30; return true; }
  if (((w.tickN + u.id) & 1) !== 0) return false;
  const px = u.x + vx / l * 1.0, pz = u.z + vz / l * 1.0;
  const n = w.hash.query(px, pz, 1.2, w.qbuf2);
  let cnt = 0;
  for (let k = 0; k < n; k++) {
    const o = w.units[w.qbuf2[k]];
    if (!o || o === u || !o.alive || o.team !== u.team) continue;
    const dx = o.x - px, dz = o.z - pz;
    if (dx * dx + dz * dz < 1.0 && o.speedNow < 0.45 * l) cnt++;
  }
  if (cnt >= 2) { u.waitT = 0.3; return true; }
  return false;
}

/** Face update with hysteresis: tiny direction changes while moving don't re-aim the unit (fewer heading flips). */
function setFace(u, a) {
  if (Math.abs(angleDiff(u.face, a)) > 0.12 || u.state !== ST.MOVE) u.face = a;
}

/** Locomotion: the sim publishes ONE clip id ('walk') plus speed; the Animator picks walk/jog/run bands (decisions D5). */
function playMove(u) { setAnim(u, 'walk', 1); }
function playIdle(u, combat) { setAnim(u, combat ? 'idle_combat' : 'idle', 1); }

export function think(w, u, dt) {
  const se = u.se, def = u.def, info = def._ai || aiInfo(def);
  u.lineT -= dt;
  u.engaged = false;
  // ----- hard disables -----
  const st0 = u.state;
  if (se[SE.STUN] > 0 || se[SE.SLEEP] > 0 || se[SE.STONE] > 0 || st0 === ST.DOWN) {
    u.dvx = 0; u.dvz = 0;
    if (st0 === ST.DOWN) return;
    u.state = ST.STUN;
    setAnim(u, se[SE.SLEEP] > 0 ? 'cower' : 'stun', 1);
    if (se[SE.STONE] > 0) u.anim.rate = 0;
    return;
  }
  if (st0 === ST.STUN) { u.state = ST.IDLE; u.stateT = 0; }
  // ----- timed states -----
  switch (u.state) {
    case ST.WINDUP: {
      u.stateT += dt;
      const t = u.target;
      if (t && t.alive) { u.face = Math.atan2(t.x - u.x, t.z - u.z); }
      else if (u.breach && !u.breach.dead) { u.face = Math.atan2(u.breach.x - u.x, u.breach.z - u.z); }
      if (!(u.atkKind === 1 && def.ranged && def.ranged.whileMoving)) { u.dvx = 0; u.dvz = 0; }
      if (!u.hitDone && u.stateT >= u.hitAt) {
        u.hitDone = true;
        if (u.atkKind === 0) resolveMelee(w, u);
        else w.fireRanged(u);
      }
      if (u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; playIdle(u, true); }
      u.engaged = true;
      return;
    }
    case ST.STAGGER: u.stateT += dt; u.dvx = 0; u.dvz = 0; if (u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; } return;
    case ST.CAST: case ST.GETUP: case ST.COWER: u.stateT += dt; u.dvx = 0; u.dvz = 0; if (u.stateT >= u.stateDur) { u.state = ST.IDLE; u.stateT = 0; } return;
    case ST.SIT: u.dvx = 0; u.dvz = 0; return;
    case ST.FLY: u.dvx = 0; u.dvz = 0; return;
    case ST.CHEER: return;
    default: break;
  }
  if (u.controlled) return;                      // possession.js drives movement and attacks
  const sq = u.squad && u.squad.alive ? u.squad : null;
  let speedBase = u.speedBase * u.mSpeed;
  // ----- rout / fear -----
  if (u.state === ST.ROUT || se[SE.SCARE] > 0) { flee(w, u, speedBase * 1.25); return; }
  const order = sq ? sq.order : 'advance';
  // ----- confusion: stumble around, but still swing at what is adjacent -----
  if (se[SE.CONFUSE] > 0 && ((u.id * 7 + w.tickN) % 40) < 24) {
    if (((w.tickN + u.id) & 15) === 0) u.face = w.rng.next() * TAU;
    u.dvx = Math.sin(u.face) * speedBase * 0.5; u.dvz = Math.cos(u.face) * speedBase * 0.5; u.state = ST.MOVE;
    setAnim(u, 'dizzy', 1);
    return;
  }
  // ----- retreat order: run away without fighting -----
  if (order === 'retreat') { retreatMove(w, u, sq, speedBase); return; }
  // ----- target management -----
  let t = u.target;
  if (t && (!t.alive || t.team === u.team || t.state === ST.DOWN)) { releaseClaim(u); t = u.target = null; }
  u.targetT--;
  if (se[SE.TAUNT] > 0 && u.tauntSrc && u.tauntSrc.alive) { if (t !== u.tauntSrc) { releaseClaim(u); u.target = t = u.tauntSrc; } }
  else if (u.targetT <= 0) {
    u.targetT = w.retarget[u.team] + ((u.id * 7) & 3);
    // units far from any enemy skip the scan entirely (path distance >= straight distance)
    const f = w.fields[u.team];
    let skip = false;
    if (f.valid && !info.cav) { const fd = f.distAt(u.x, u.z); if (fd > info.scan * 1.7 + 6) skip = true; }
    if (!skip) {
      const nt = pickTarget(w, u);
      if (nt !== t) { releaseClaim(u); u.target = t = nt; }
      if (t && !info.ranged1st && !u.claim) { const lim = info.spear ? slotsFor(t) * 2 : slotsFor(t); if (t.claims < lim) { t.claims++; u.claim = t; } }
      else if (!t) releaseClaim(u);
    } else if (t) { releaseClaim(u); u.target = t = null; }
    // leash: hold-style units do not chase beyond their leash
    if (t && sq && order === 'hold') { const dd = hyp(u.x - sq.ax, u.z - sq.az); if (dd > 16) { releaseClaim(u); u.target = t = null; u.targetT = 20; } }
  }
  const melee = def.melee, ranged = def.ranged;
  if (u.guard && guardBehaviour(w, u, speedBase)) return;
  if (sq && sq.breach && !u.breach && (melee || info.siege) && !info.support) { const pb = sq.breach, dd = hyp(pb.x - u.x, pb.z - u.z) - pb.radius; if (dd < 7) u.breach = pb; }
  if (u.breach || ((u.blockT > 0.7 || u.blockSoft > 0.5) && (melee || info.siege) && !info.support)) { if (breachBehaviour(w, u, t, dt, speedBase, info)) return; }
  if (t) {
    const dx = t.x - u.x, dz = t.z - u.z, dist = hyp(dx, dz), gap = dist - u.radius - t.radius;
    const want = Math.atan2(dx, dz);
    if (ranged && info.ranged1st) { if (rangedBehaviour(w, u, t, dt, gap, dist, dx, dz, want, speedBase, info, sq)) return; }
    else if (melee) { if (meleeBehaviour(w, u, t, dt, gap, dist, want, speedBase, info, sq)) return; }
    else if (ranged) { if (rangedBehaviour(w, u, t, dt, gap, dist, dx, dz, want, speedBase, info, sq)) return; }
  }
  // ----- no (usable) target: formation slot or the flow field -----
  followFormation(w, u, sq, speedBase, info);
}

// ------------------------------------------------------------------ guard (kill_general: the general avoids contact)
/** Slip away from enemies within 9 u toward the friendly army; fights back only when cornered (an enemy in reach and no room to flee). */
function guardBehaviour(w, u, speedBase) {
  const n = w.hash.query(u.x, u.z, 9, w.qbuf2);
  let ex = 0, ez = 0, wsum = 0, nearest = 99;
  for (let k = 0; k < n; k++) {
    const c = w.units[w.qbuf2[k]]; if (!c || !c.alive || c.team === u.team) continue;
    const d = hyp(c.x - u.x, c.z - u.z); if (d < nearest) nearest = d;
    const wt = 1 / (0.5 + d); ex += (c.x - u.x) * wt; ez += (c.z - u.z) * wt; wsum += wt;
  }
  if (wsum === 0) return false;                       // nobody close: normal behaviour (stay with the squad slot)
  const mc = w.centroid[u.team];
  let dx = -ex / wsum, dz = -ez / wsum;
  if (mc && mc.n) { const bx = mc.x - u.x, bz = mc.z - u.z, bl = hyp(bx, bz) || 1; dx += bx / bl * 0.4; dz += bz / bl * 0.4; }
  const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
  if (!w.nav.walkable(u.x + dx * 0.9, u.z + dz * 0.9)) { if (nearest < 3.2) return false; u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; return true; }
  u.dvx = dx * speedBase * 1.1; u.dvz = dz * speedBase * 1.1; u.face = Math.atan2(dx, dz); u.state = ST.MOVE; playMove(u);
  return true;
}

// ------------------------------------------------------------------ breach (destructible props that block the only path)
/** Attack the destructible prop in the way. Returns true if the unit is busy breaching. */
function breachBehaviour(w, u, t, dt, speedBase, info) {
  let p = u.breach;
  if (p && p.dead) { p = u.breach = null; u.breachT = 0; }
  if (!p) {
    if (u.breachT > 0) { u.breachT -= dt; return false; }
    const l = hyp(u.dvx, u.dvz);
    if (l < 0.3) return false;
    u.blockSoft = 0;
    p = w.nearestSoftProp(u.x + u.dvx / l * 1.4, u.z + u.dvz / l * 1.4, 1.5);
    if (!p) { u.breachT = 1.0; return false; }
    u.breach = p; u.breachT = 0;
  }
  // an enemy in reach beats the wall
  const def = u.def, dx = p.x - u.x, dz = p.z - u.z, dist = hyp(dx, dz), gap = dist - u.radius - p.radius;
  if (info.siege || (def.ranged && !def.melee)) {
    // siege engines shell the obstacle from range; infantry ranged units just wait
    if (!info.siege) { u.breach = null; return false; }
    if (t && t.alive) { u.breach = null; return false; }
    const r = def.ranged;
    if (gap > r.range * 0.95) { u.breach = null; u.breachT = 2; return false; }
    u.face = Math.atan2(dx, dz); u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.engaged = true;
    if (u.cdR <= 0 && Math.abs(angleDiff(u.heading, u.face)) < 0.4) { startRanged(w, u); return true; }
    playIdle(u, true);
    return true;
  }
  if (t && t.alive) { const g2 = hyp(t.x - u.x, t.z - u.z) - u.radius - t.radius; if (g2 <= def.melee.range + 0.4) { u.breach = null; u.breachT = 1.5; return false; } }
  const reach = def.melee.range + u.mReach;
  if (gap <= reach + 0.25) {
    u.face = Math.atan2(dx, dz); u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.engaged = true; u.hold = true;
    if (u.cd <= 0 && Math.abs(angleDiff(u.heading, u.face)) < 0.6) { startMelee(w, u); return true; }
    playIdle(u, true);
    return true;
  }
  if (gap > reach + 6) { u.breach = null; u.breachT = 1.5; return false; }
  u.state = ST.MOVE; steer(w, u, p.x, p.z, speedBase); playMove(u);
  return true;
}

// ------------------------------------------------------------------ melee
function meleeBehaviour(w, u, t, dt, gap, dist, want, speedBase, info, sq) {
  const def = u.def, m = def.melee, reach = m.range + u.mReach;
  const fdiff = Math.abs(angleDiff(u.heading, want));
  // opportunity attack: anything in reach beats walking around (no in-contact idling)
  if (gap > reach + 0.15 && !u.claim) {
    u.oppT--;
    if (u.oppT <= 0) { u.oppT = 4; const o = nearestInReach(w, u, reach + 0.15); if (o) { u.target = t = o; gap = hyp(o.x - u.x, o.z - u.z) - u.radius - o.radius; want = Math.atan2(o.x - u.x, o.z - u.z); } }
  }
  u.face = want;
  const inReach = gap <= reach + 0.15;
  if (inReach || (u.hold && gap <= reach + 0.55)) {
    u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.hold = true; u.engaged = true; u.blockT = 0;
    if (u.cd <= 0 && (fdiff < 0.55 || inReach && gap < 0.3)) { startMelee(w, u); return true; }
    playIdle(u, true);
    return true;
  }
  u.hold = false;
  // approach (with a token) or queue behind the front rank (reserve)
  if (!u.claim) {
    const standoff = info.spear ? reach + 0.3 : reach + 1.9;
    if (gap <= standoff) {
      // reserve: wait behind the front rank, re-scan quickly so a freed slot is taken within a few ticks
      u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.engaged = true; if (u.targetT > 4) u.targetT = 4;
      playIdle(u, true);
      return true;
    }
    u.state = ST.MOVE; u.engaged = false;
    if (u.targetT > 6) u.targetT = 6;
    steer(w, u, t.x, t.z, speedBase * 0.95);
    if (u.blockT > 0.4 && crowdAhead(w, u, u.dvx, u.dvz)) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, true); return true; }
    playMove(u);
    return true;
  }
  let sp = speedBase;
  if (def.runMul > 1.2 && (info.cav || def.role === 'beast' || def.tags.includes('large'))) sp = speedBase * (gap > 7 ? def.runMul : 1.25);
  else if (gap > 5) sp = speedBase * 1.2;
  u.state = ST.MOVE; u.engaged = gap < 5;
  steer(w, u, t.x, t.z, sp);
  playMove(u);
  // melee units with a ranged side-arm (elephant archers, cyclops boulders, pharaoh's scepter) throw while closing in
  if (def.ranged && u.cdR <= 0 && gap > reach + 2 && gap > (def.ranged.minRange || 0) && gap <= def.ranged.range * 0.95 && fdiffOk(u, want)) { startRanged(w, u); }
  return true;
}
function fdiffOk(u, want) { return Math.abs(angleDiff(u.heading, want)) < 0.45; }

function nearestInReach(w, u, reach) {
  const n = w.hash.query(u.x, u.z, reach + u.radius + 1.2, w.qbuf2);
  let best = null, bd = 1e9;
  for (let k = 0; k < n; k++) {
    const c = w.units[w.qbuf2[k]];
    if (!c || !c.alive || c.team === u.team || c.state === ST.DOWN) continue;
    const dd = hyp(c.x - u.x, c.z - u.z) - u.radius - c.radius;
    if (dd <= reach && dd < bd) { bd = dd; best = c; }
  }
  return best;
}

// ------------------------------------------------------------------ ranged
function rangedBehaviour(w, u, t, dt, gap, dist, dx, dz, want, speedBase, info, sq) {
  const def = u.def, r = def.ranged, range = r.range, minR = r.minRange || 0, melee = def.melee;
  const fdiff = Math.abs(angleDiff(u.heading, want));
  const diff = w.diff[u.team];
  u.face = want;
  // kite: shoot-and-scoot when an enemy gets close (skirmishers always on normal+, plain archers only on hard)
  const kiteGap = info.kiter ? 5.2 : (info.archer && diff === 2 && !info.siege ? 3.4 : 0);
  if (!w.rules.noKite && (gap < minR || (kiteGap > 0 && diff > 0 && gap < kiteGap && u.cdR > 0.25 && !(info.siege)))) {
    if (kiteAway(w, u, t, dist, dx, dz, speedBase, sq)) { u.engaged = true; return true; }
    // cornered: fight back
    if (melee && gap <= melee.range + 0.4 && u.cd <= 0) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; startMelee(w, u); return true; }
  }
  if (melee && gap <= melee.range && gap < 1.6 && u.cd <= 0 && !info.siege) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.face = want; startMelee(w, u); return true; }
  if (gap <= range * 0.98 && gap >= minR) {
    // in range: hold and shoot
    u.engaged = true;
    if (!r.whileMoving) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; }
    else { steer(w, u, t.x, t.z, speedBase * 0.9); u.state = ST.MOVE; }
    if (u.cdR <= 0 && fdiff < 0.4) { startRanged(w, u); return true; }
    if (r.whileMoving) playMove(u); else playIdle(u, true);
    return true;
  }
  if (gap < minR) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, true); return true; }
  // out of range: siege/support units hold position (squad moves them); others close to 0.85*range
  if (info.siege || info.support) return false;
  if (sq && sq.cls === CLS.RANGED && sq.order !== 'hold' && sq.engF === 0 && gap > range + 2) return false;   // keep marching with the squad
  u.state = ST.MOVE;
  steer(w, u, t.x, t.z, speedBase);
  playMove(u);
  return true;
}

function kiteAway(w, u, t, dist, dx, dz, speedBase, sq) {
  const l = dist || 1;
  let vx = -dx / l, vz = -dz / l;
  // drift back toward the friendly line (squad slot) rather than into the arena corner
  if (sq) { const bx = sq.ax - u.x, bz = sq.az - u.z, bl = hyp(bx, bz) || 1; vx += bx / bl * 0.35; vz += bz / bl * 0.35; const m = hyp(vx, vz) || 1; vx /= m; vz /= m; }
  const sp = speedBase * 1.05;
  if (!w.nav.walkable(u.x + vx * 0.9, u.z + vz * 0.9)) {
    // try the two perpendicular escapes
    const px = -vz, pz = vx;
    if (w.nav.walkable(u.x + px * 0.9, u.z + pz * 0.9)) { vx = px; vz = pz; }
    else if (w.nav.walkable(u.x - px * 0.9, u.z - pz * 0.9)) { vx = -px; vz = -pz; }
    else return false;
  }
  u.dvx = vx * sp; u.dvz = vz * sp; u.state = ST.MOVE;
  u.face = Math.atan2(-dx, -dz) ;
  // keep looking at the enemy while backing away (shoot-and-scoot reads better)
  u.face = Math.atan2(dx, dz);
  playMove(u);
  return true;
}

// ------------------------------------------------------------------ formation / idle movement
function followFormation(w, u, sq, speedBase, info) {
  if (sq) {
    const cs = Math.cos(sq.facing), sn = Math.sin(sq.facing);
    const gx = sq.ax + cs * u.sox + sn * u.soz, gz = sq.az - sn * u.sox + cs * u.soz;
    const ex = gx - u.x, ez = gz - u.z, ed = hyp(ex, ez);
    if (sq.speed < 0.05 && ed < 0.2) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; u.face = sq.facing; playIdle(u, false); u.hold = false; return; }
    let vx = sq.vx + ex * 2.5, vz = sq.vz + ez * 2.5;
    const cap = Math.max(speedBase * (ed > 5 ? 1.7 : 1.35), sq.speed * (ed > 2.5 ? 1.3 : 1.15));
    const l = hyp(vx, vz);
    if (l > cap) { vx = vx / l * cap; vz = vz / l * cap; }
    if (l < 0.12) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, false); return; }
    // blocked-by-prop fallback: when the slot is not walkable in a straight line follow the flow field
    if (ed > 2.5) {
      if (u.lineT <= 0) { u.lineOk = w.nav.clearLine(u.x, u.z, gx, gz); u.lineT = 0.5 + (u.id % 5) * 0.05; }
      if (!u.lineOk && enemyDir(w, u, _d)) { vx = _d[0] * Math.min(l, cap); vz = _d[1] * Math.min(l, cap); }
    }
    if (u.blockT > 0.4 && crowdAhead(w, u, vx, vz)) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, false); return; }
    u.dvx = vx; u.dvz = vz; u.state = ST.MOVE;
    const fa = l > 0.3 ? Math.atan2(vx, vz) : sq.facing;
    setFace(u, ed < 1.5 && sq.speed < 0.3 ? sq.facing : fa);
    playMove(u);
    return;
  }
  // lone unit: advance on the nearest enemy via the flow field
  if (info.support) { supportMove(w, u, speedBase); return; }
  if (enemyDir(w, u, _d)) { u.dvx = _d[0] * speedBase; u.dvz = _d[1] * speedBase; setFace(u, Math.atan2(_d[0], _d[1])); u.state = ST.MOVE; playMove(u); }
  else { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, false); }
}

function retreatMove(w, u, sq, speedBase) {
  const ec = w.centroid[1 - u.team];
  let dx = 0, dz = 0;
  if (ec && ec.n) { dx = u.x - ec.x; dz = u.z - ec.z; } else { dx = u.x; dz = u.z; }
  const l = hyp(dx, dz) || 1;
  u.dvx = dx / l * speedBase * 1.15; u.dvz = dz / l * speedBase * 1.15; u.face = Math.atan2(u.dvx, u.dvz); u.state = ST.MOVE;
  if (!w.nav.walkable(u.x + u.dvx * 0.3, u.z + u.dvz * 0.3)) { u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; }
  playMove(u);
}

/** Support units stay behind friendly melee and away from enemies. */
function supportMove(w, u, speed) {
  const n = w.hash.query(u.x, u.z, 9, w.qbuf2);
  let ex = 0, ez = 0, en = 0, fx = 0, fz = 0, fn = 0;
  for (let k = 0; k < n; k++) {
    const c = w.units[w.qbuf2[k]]; if (!c || !c.alive || c === u) continue;
    if (c.team !== u.team) { ex += c.x; ez += c.z; en++; }
    else if (c.def.role === 'melee' || c.def.role === 'hero') { fx += c.x; fz += c.z; fn++; }
  }
  if (en > 0) { const l = hyp(u.x - ex / en, u.z - ez / en) || 1; u.dvx = (u.x - ex / en) / l * speed; u.dvz = (u.z - ez / en) / l * speed; u.face = Math.atan2(u.dvx, u.dvz); u.state = ST.MOVE; playMove(u); return; }
  if (fn > 0) { const tx = fx / fn, tz = fz / fn, d = hyp(tx - u.x, tz - u.z); if (d > 4) { steer(w, u, tx, tz, speed); playMove(u); u.state = ST.MOVE; return; } }
  if (enemyDir(w, u, _d) && fn === 0) { u.dvx = _d[0] * speed * 0.8; u.dvz = _d[1] * speed * 0.8; u.face = Math.atan2(_d[0], _d[1]); u.state = ST.MOVE; playMove(u); return; }
  u.dvx = 0; u.dvz = 0; u.state = ST.IDLE; playIdle(u, false);
}

function flee(w, u, speed) {
  // run away from the nearest enemies / enemy centroid; fire-panicked animals use their stored flee point
  const n = w.hash.query(u.x, u.z, 14, w.qbuf2);
  let ex = 0, ez = 0, en = 0;
  for (let k = 0; k < n; k++) { const c = w.units[w.qbuf2[k]]; if (c && c.alive && c.team !== u.team) { const wgt = 1 / (0.5 + hyp(c.x - u.x, c.z - u.z)); ex += (c.x - u.x) * wgt; ez += (c.z - u.z) * wgt; en += wgt; } }
  let dx, dz;
  if (u.routFrom) { dx = u.x - u.routFrom.x; dz = u.z - u.routFrom.z; }
  else if (en > 0) { dx = -ex; dz = -ez; }
  else { const ec = w.centroid[1 - u.team]; dx = u.x - (ec ? ec.x : 0); dz = u.z - (ec ? ec.z : 0); }
  const l = hyp(dx, dz) || 1;
  u.dvx = dx / l * speed; u.dvz = dz / l * speed; u.face = Math.atan2(u.dvx, u.dvz);
  if (!w.nav.walkable(u.x + u.dvx * 0.4, u.z + u.dvz * 0.4)) { const px = -u.dvz, pz = u.dvx; if (w.nav.walkable(u.x + px * 0.4, u.z + pz * 0.4)) { u.dvx = px; u.dvz = pz; } else if (w.nav.walkable(u.x - px * 0.4, u.z - pz * 0.4)) { u.dvx = -px; u.dvz = -pz; } }
  if (u.state !== ST.ROUT) u.state = ST.MOVE;
  setAnim(u, 'rout', 1);
}
