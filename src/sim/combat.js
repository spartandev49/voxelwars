// Combat resolution: damage formula, shields, crits, backstab, charge, knockback, kills, attack state machine.
// Rules per spec.md §7.1. Pure sim code (no render imports; clip timing comes from anim/clips.js data).

import { ST, SE, G, AP } from './consts.js';
import { ClipLib } from '../anim/clips.js';

const TAU = Math.PI * 2;
export function angleDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }

/** Is attacker at (ax,az) inside the target's front arc of half-angle `arc` (radians)? */
export function inFrontArc(t, ax, az, arc) {
  const dx = ax - t.x, dz = az - t.z, l = Math.hypot(dx, dz) || 1;
  const fx = Math.sin(t.heading), fz = Math.cos(t.heading);
  return (dx * fx + dz * fz) / l >= Math.cos(arc);
}

const SLASH1 = ['strike_slash_1', 'strike_slash_2'];
export function meleeClip(def, n) {
  const s = def.melee.style;
  if (s === 'slash') return SLASH1[n & 1];   // alternate variants (same timing) deterministically
  return 'strike_' + s;
}
export function rangedClip(def) {
  const p = def.ranged.proj;
  if (p === 'arrow') return 'shoot_bow';
  if (p === 'boulder' || p === 'bolt') return def.role === 'siege' ? 'launch' : (def.role === 'monster' ? 'launch' : 'throw');
  if (p === 'sunbeam' || p === 'scepter' || p === 'thunderbolt') return 'cast';
  return 'throw';
}

/**
 * Central damage entry point.
 * @param src attacker unit or null (environment)  @param dst target unit
 * opts: {type, ap, kb, dir:[dx,dz]|null, proj:boolean, aoe:boolean, charge:number, noBlock, noCrit, fixed}
 * returns final damage dealt (0 if blocked)
 */
export function applyDamage(w, src, dst, base, opts) {
  if (!dst.alive) return 0;
  const type = opts.type || 'slash';
  let raw = base * (0.9 + w.rng.next() * 0.2);
  let crit = false, back = false;
  const melee = !opts.proj && !opts.aoe && !opts.dot;
  // ---- shield block ----
  const sh = dst.def.shield;
  if (sh && !opts.noBlock && !opts.dot && dst.se[SE.SLEEP] <= 0 && dst.se[SE.STONE] <= 0 && dst.se[SE.STUN] <= 0 && dst.se[SE.DISARM] <= 0) {
    const ax = src ? src.x : (opts.x !== undefined ? opts.x : dst.x), az = src ? src.z : (opts.z !== undefined ? opts.z : dst.z);
    if (opts.aoe !== true && inFrontArc(dst, ax, az, sh.arc * Math.PI / 180)) {
      const chance = Math.min(0.95, (opts.proj ? sh.proj + dst.mProj : sh.block + dst.mBlock));
      if (w.rng.next() < chance) {
        // blocked
        dst.flash = 0.0;
        dst.anim.flinch = 0.4;
        if (w.ev.has('unit_block')) { const p = w.P.unit_block; p.src = src ? src.id : 0; p.dst = dst.id; p.x = dst.x; p.y = dst.y + 1.2; p.z = dst.z; p.kind = opts.proj ? 'proj' : 'melee'; w.emit('unit_block', p); }
        if (src && opts.bash) staggerUnit(w, src, 0.25);
        if (src && !opts.proj && src.def.melee && src.def.melee.style === 'bash') staggerUnit(w, src, 0.25);
        if (src && opts.breaksShield) dst.se[SE.DISARM] = Math.max(dst.se[SE.DISARM], opts.breaksShield);
        return 0;
      }
    }
  }
  // ---- crit / backstab / charge ----
  if (!opts.noCrit && !opts.dot && w.rng.next() < G.critChance) { raw *= G.critMul; crit = true; }
  if (melee && src) {
    const dx = src.x - dst.x, dz = src.z - dst.z, l = Math.hypot(dx, dz) || 1;
    if ((dx * Math.sin(dst.heading) + dz * Math.cos(dst.heading)) / l < G.backstabArcCos) { raw *= G.backstabMul; back = true; }
  }
  const ch = opts.charge || 0;
  if (ch > 0.15) raw *= 1 + G.chargeDmg * ch;
  if (src) raw *= src.mDmg;
  raw *= dst.mDmgTaken;
  if (type === 'fire' && dst.def.tags.includes('fire_weak')) raw *= dst.def.tags.includes('undead') ? 2 : 1.8;
  if (dst.se[SE.SLEEP] > 0) raw *= 1.5;
  if (dst.se[SE.STONE] > 0 && type === 'blunt') raw *= 2;
  if (w.weather && w.weather.fireMul !== 1 && type === 'fire') raw *= w.weather.fireMul;
  const apv = opts.ap !== undefined ? opts.ap : AP[type];
  const eff = Math.max(0, Math.min(0.9, (dst.def.armor + dst.mArmor) * (1 - apv)));
  let fin = opts.fixed ? raw : Math.max(1, raw * (1 - eff));
  if (dst.def.tags && fin > dst.hp && opts.nonLethal) fin = Math.max(0, dst.hp - 1);
  // ---- apply ----
  dst.hp -= fin; dst.dmgTaken += fin;
  if (src) { src.dmgDealt += fin; dst.lastAttacker = src; }
  dst.flash = 1;
  dst.anim.flinch = Math.min(1, 0.5 + fin / dst.hpMax * 3);
  w.stats[dst.team].damageTaken += fin; if (src) w.stats[src.team].damageDealt += fin;
  w.lastDamageT = w.time;
  // knockback
  const kbBase = opts.kb !== undefined ? opts.kb : 4;
  if (kbBase > 0 && !opts.dot) {
    let dx, dz;
    if (opts.dir) { dx = opts.dir[0]; dz = opts.dir[1]; }
    else if (src) { dx = dst.x - src.x; dz = dst.z - src.z; }
    else { dx = dst.x - (opts.x || dst.x); dz = dst.z - (opts.z || dst.z); }
    const l = Math.hypot(dx, dz) || 1;
    let kb = kbBase * fin / dst.mass;
    if (ch > 0.15) kb *= 1 + G.chargeKb * ch;
    kb = Math.min(kb, 14);
    dst.kx += dx / l * kb; dst.kz += dz / l * kb;
    if (kb > 2.5 && dst.hp > 0 && dst.state !== ST.STUN && dst.def.mass < 6) staggerUnit(w, dst, Math.min(0.9, 0.2 + kb * 0.05));
  } else if (!opts.dot && fin > dst.hpMax * 0.12 && dst.state < ST.WINDUP + 1) {
    // small flinch
  }
  // events
  if (!opts.dot) {
    const p = w.P.unit_hit;
    p.src = src ? src.id : 0; p.dst = dst.id; p.dmg = fin; p.type = type; p.crit = crit; p.backstab = back; p.charge = ch; p.blocked = false; p.x = dst.x; p.y = dst.y + dst.height * 0.6; p.z = dst.z;
    p.srcDef = src ? src.def.id : ''; p.dstDef = dst.def.id; p.proj = !!opts.proj; p.aoe = !!opts.aoe;
    w.emit('unit_hit', p);
    // hit-stop on notable hits (render time-scale hint): hero, boss, crit or charge hits
    if (crit || ch > 0.5 || fin > 40) { dst.hitStop = Math.max(dst.hitStop, crit ? 0.1 : 0.07); if (src) src.hitStop = Math.max(src.hitStop, 0.06); }
  }
  if (dst.hp <= 0) killUnit(w, dst, src, opts.cause || (opts.proj ? 'ranged' : opts.aoe ? 'aoe' : type === 'fire' ? 'fire' : type === 'magic' ? 'magic' : 'melee'), opts);
  else {
    if (dst.hp < dst.hpMax * G.moraleLowHp && dst.hp > 0) { /* handled in morale tick */ }
    if (src && src.team === dst.team && !opts.dot) { const p = w.P.friendly_fire; p.src = src.id; p.dst = dst.id; p.dmg = fin; w.emit('friendly_fire', p); }
  }
  // ability hooks
  if (src) w.abilityHook('onHitDealt', src, dst, fin, opts);
  w.abilityHook('onDamaged', dst, src, fin, opts);
  return fin;
}

export function staggerUnit(w, u, dur) {
  if (!u.alive || u.state === ST.STUN) return;
  if (u.def.mass >= 8 && dur < 1.0) return;     // very heavy units shrug off stagger
  u.state = ST.STAGGER; u.stateT = 0; u.stateDur = dur; u.dvx = 0; u.dvz = 0; u.hitDone = true;
  setAnim(u, 'stagger', 1);
}

export function setAnim(u, clip, rate) {
  const a = u.anim;
  if (a.clip === clip) { a.rate = rate; return; }
  a.prev = a.clip; a.clip = clip; a.t = 0; a.rate = rate; a.blend = 0;
}

export function killUnit(w, u, src, cause, opts) {
  if (!u.alive) return;
  // revive / death-prevention hooks may cancel the death
  if (w.abilityHook('onLethal', u, src, cause, opts) === true) return;
  u.alive = false; u.hp = 0; u.deadT = 0;
  u.target = null;
  const team = u.team;
  w.stats[team].dead++; w.stats[team].deadCost += u.def.cost; w.stats[team].alive--; w.stats[team].aliveCost -= u.def.cost;
  if (src && src.alive) { src.kills++; w.stats[src.team].kills++; }
  const friendly = !!src && src.team === u.team && src !== u;
  // death clip + fling
  const sp = Math.hypot(u.kx, u.kz);
  let clip = 'death_back';
  if (cause === 'stone') clip = 'stun';
  else if (sp > 6) { clip = 'death_spin'; u.deathKind = 2; }
  else if (src) { const dx = src.x - u.x, dz = src.z - u.z; clip = (dx * Math.sin(u.heading) + dz * Math.cos(u.heading)) >= 0 ? 'death_back' : 'death_front'; }
  if (u.def.role === 'monster' || u.def.tags.includes('large')) clip = 'death_back';
  u.anim.dir = Math.atan2(u.kx, u.kz);
  setAnim(u, clip, 1);
  u.state = ST.IDLE; u.stateT = 0;
  const p = w.P.unit_kill;
  p.src = src ? src.id : 0; p.dst = u.id; p.srcDef = src ? src.def.id : ''; p.dstDef = u.def.id; p.srcTeam = src ? src.team : -1; p.dstTeam = u.team; p.friendly = friendly; p.cause = cause;
  p.x = u.x; p.y = u.y; p.z = u.z;
  w.emit('unit_kill', p);
  // morale shock for nearby allies
  w.moraleShock(u);
  w.abilityHook('onKilled', u, src, cause);
  if (src) w.abilityHook('onKill', src, u, cause);
  w.checkFirstBlood(src, u);
}

/** Start a melee attack on u.target. */
export function startMelee(w, u) {
  const d = u.def, m = d.melee;
  const clip = meleeClip(d, u.atkN++);
  const dur = ClipLib.dur(clip), hit = ClipLib.hit(clip);
  const cdTotal = m.cd / u.mCd;
  const rate = Math.max(1, Math.min(2.4, dur / (cdTotal * 0.92)));
  u.state = ST.WINDUP; u.stateT = 0; u.stateDur = dur / rate; u.hitAt = hit / rate; u.hitDone = false; u.atkKind = 0;
  u.cd = cdTotal;
  u.dvx = 0; u.dvz = 0;
  setAnim(u, clip, rate);
}

export function startRanged(w, u) {
  const d = u.def, r = d.ranged;
  const clip = rangedClip(d);
  const dur = ClipLib.dur(clip), hit = ClipLib.hit(clip);
  const cdTotal = r.cd / u.mCd;
  const rate = Math.max(1, Math.min(2.4, dur / (cdTotal * 0.92)));
  u.state = ST.WINDUP; u.stateT = 0; u.stateDur = dur / rate; u.hitAt = hit / rate; u.hitDone = false; u.atkKind = 1;
  u.cdR = cdTotal; u.cd = Math.max(u.cd, 0.3);
  if (!r.whileMoving) { u.dvx = 0; u.dvz = 0; }
  setAnim(u, clip, rate);
}

/** The damage moment of a melee windup. */
export function resolveMelee(w, u) {
  const t = u.target, m = u.def.melee;
  if (!t || !t.alive) return;
  const dx = t.x - u.x, dz = t.z - u.z, dist = Math.hypot(dx, dz);
  const reach = m.range + u.radius + t.radius;
  if (dist > reach * 1.35) return;                      // target slipped away
  const chargeMul = chargeFactor(u);
  const opts = { type: m.type, ap: m.ap, kb: m.kb !== undefined ? m.kb : 4, charge: chargeMul, bash: m.style === 'bash', hook: m.hook };
  // brace: a spear/pike target facing a cavalry charger punishes it
  if (chargeMul > 0.3 && u.def.tags.includes('cavalry') && t.def.tags.some((x) => x === 'spear' || x === 'pike')) {
    const ax = u.x - t.x, az = u.z - t.z, l = Math.hypot(ax, az) || 1;
    const facing = (ax * Math.sin(t.heading) + az * Math.cos(t.heading)) / l;
    if (facing >= G.braceArcCos && t.speedNow < t.def.speed * 0.5) {
      // charger is hurt and stopped
      const p = w.P.unit_brace; p.id = t.id; p.dst = u.id; w.emit('unit_brace', p);
      applyDamage(w, t, u, t.def.melee.dmg * G.braceMul * 1.2, { type: 'pierce', kb: 6, charge: 0, cause: 'melee' });
      u.kx *= 0; u.kz *= 0; u.vx = 0; u.vz = 0;
      if (!u.alive) return;
      opts.charge = 0;
    }
  }
  if (chargeMul > 0.5) { const p = w.P.charge_hit; p.id = u.id; p.dst = t.id; p.mul = chargeMul; w.emit('charge_hit', p); }
  let dmg = m.dmg;
  const fin = applyDamage(w, u, t, dmg, opts);
  if (fin > 0 && m.hook && t.alive && w.rng.next() < m.hook) { t.se[SE.DISARM] = Math.max(t.se[SE.DISARM], 3); }
  if (fin > 0 && m.poison && t.alive) t.se[SE.POISON] = Math.max(t.se[SE.POISON], 3);
  // sweeping attacks for big weapons hit a second nearby enemy
  if (u.def.tags.includes('large') && u.def.role === 'monster') cleave(w, u, t, dmg * 0.5, opts);
}

function cleave(w, u, first, dmg, opts) {
  const reach = u.def.melee.range + u.radius;
  const n = w.hash.query(first.x, first.z, 2.2, w.qbuf);
  let hit = 0;
  for (let k = 0; k < n && hit < 3; k++) {
    const o = w.units[w.qbuf[k]]; if (!o || o === first || !o.alive || o.team === u.team) continue;
    if ((o.x - u.x) ** 2 + (o.z - u.z) ** 2 > (reach + o.radius + 0.8) ** 2) continue;
    applyDamage(w, u, o, dmg, Object.assign({}, opts, { kb: (opts.kb || 4) * 0.7, charge: 0 })); hit++;
  }
}

/** 0..1 how much of its charge speed the unit currently has (cavalry/elephant/Minotaur) */
export function chargeFactor(u) {
  const d = u.def;
  const run = d.runMul || 1.5;
  if (!(d.tags.includes('cavalry') || d.tags.includes('large') || d.role === 'beast')) return 0;
  const walk = d.speed;
  const f = (u.speedNow / walk - 1) / Math.max(0.05, run - 1);
  return Math.max(0, Math.min(1, f));
}
