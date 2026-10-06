// Combat resolution: damage formula, shields, crits, backstab, charge, knockback, kills, attack state machine.
// Rules per spec.md §8.1. Pure sim code (no render imports; clip timing comes from anim/clips.js data).
// No allocation on the hit path: callers fill a reusable Hit scratch object (see newHit()).

import { ST, SE, SE_NAMES, G, AP } from './consts.js';
import { ClipLib } from '../anim/clips.js';

const TAU = Math.PI * 2;
export function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

/** Is the point (ax,az) inside t's front arc of half-angle `arc` (radians)? */
export function inFrontArc(t, ax, az, arc) {
  const dx = ax - t.x, dz = az - t.z, l = Math.hypot(dx, dz) || 1;
  return (dx * Math.sin(t.heading) + dz * Math.cos(t.heading)) / l >= Math.cos(arc);
}

/** Reusable hit descriptor. Fields are reset by reset(); kb < 0 means "default 4". */
export class Hit {
  constructor() { this.reset(); }
  reset() {
    this.type = 'slash'; this.ap = -1; this.kb = 4; this.hasDir = false; this.dx = 0; this.dz = 0; this.x = 0; this.z = 0; this.hasPos = false;
    this.proj = false; this.aoe = false; this.dot = false; this.charge = 0; this.noBlock = false; this.noCrit = false; this.fixed = false;
    this.cause = ''; this.bash = false; this.nonLethal = false; this.kind = ''; this.friendlyFire = false; this.noBackstab = false; this.fire = false;
    return this;
  }
  dir(dx, dz) { this.hasDir = true; this.dx = dx; this.dz = dz; return this; }
  at(x, z) { this.hasPos = true; this.x = x; this.z = z; return this; }
}
export const newHit = () => new Hit();
const H_DOT = new Hit(), H_BRACE = new Hit(), H_MELEE = new Hit(), H_CLEAVE = new Hit();

const SLASH1 = ['strike_slash_1', 'strike_slash_2'];
export function meleeClip(def, n) {
  const s = def.melee.style;
  if (s === 'slash') return SLASH1[n & 1];   // alternate variants (same timing) deterministically
  return 'strike_' + s;
}
export function rangedClip(def) {
  const p = def.ranged.proj;
  if (p === 'arrow') return 'shoot_bow';
  if (p === 'boulder' || p === 'bolt') return def.role === 'siege' || def.role === 'monster' ? 'launch' : 'throw';
  if (p === 'sunbeam' || p === 'scepter' || p === 'thunderbolt') return 'cast';
  return 'throw';
}

const RIG_BY_ID = { war_elephant: 'elephant1', sacred_chicken: 'chicken1', catapult: 'catapult1', ballista: 'ballista1', trojan_horse: 'trojan1', chariot_archer: 'chariot1' };
/** Rig id used to look up rig-specific clip timing (death clip length). */
export function defRig(def) {
  if (def._rig) return def._rig;
  let r = RIG_BY_ID[def.id] || (def.model && def.model.rig) || def.rig;
  if (!r) r = (def.role === 'beast' || def.tags.includes('animal')) ? 'quad1' : 'hum1';
  def._rig = r; return r;
}

export function setAnim(u, clip, rate) {
  const a = u.anim;
  if (a.clip === clip) { a.rate = rate; return; }
  a.prev = a.clip; a.clip = clip; a.t = 0; a.rate = rate; a.blend = 0;
}

/** Set a status timer (keeps the larger duration) and emit status_apply on a fresh application. */
export function applyStatus(w, u, slot, secs) {
  if (!u.alive || secs <= 0) return false;
  const was = u.se[slot] > 0;
  if (secs > u.se[slot]) u.se[slot] = secs;
  if (!was) {
    const e = w.P.status_apply; e.id = u.id; e.status = SE_NAMES[slot]; w.emit('status_apply', e);
    if (slot === SE.CONFUSE || slot === SE.SLEEP || slot === SE.TIPSY || slot === SE.STONE || slot === SE.PANIC) w.bark(u, 'status:' + SE_NAMES[slot]);
  }
  return true;
}

/** Heal (respects NOHEAL), emits unit_heal. Returns the amount actually healed. */
export function healUnit(w, u, amount) {
  if (!u.alive || u.se[SE.NOHEAL] > 0 || amount <= 0) return 0;
  const a = Math.min(amount, u.hpMax - u.hp); if (a <= 0.01) return 0;
  u.hp += a;
  const e = w.P.unit_heal; e.id = u.id; e.amount = a; w.emit('unit_heal', e);
  return a;
}

/**
 * Central damage entry point.
 * @param src attacker unit or null (environment)  @param dst target unit  @param base pre-armor damage (def value / falloff applied)
 * @param o Hit descriptor. Returns final damage dealt (0 if blocked).
 */
export function applyDamage(w, src, dst, base, o) {
  if (!dst.alive || dst.state === ST.DOWN) return 0;       // downed (reviving) units are untouchable
  const type = o.type;
  const mut = w.mut;
  let raw = base * (0.9 + w.rng.next() * 0.2);
  let crit = false, back = false;
  const melee = !o.proj && !o.aoe && !o.dot;
  const ax = src ? src.x : (o.hasPos ? o.x : dst.x), az = src ? src.z : (o.hasPos ? o.z : dst.z);
  // ---- shield block ----
  const sh = dst.def.shield;
  if (sh && !o.noBlock && !o.dot && !o.aoe && dst.se[SE.SLEEP] <= 0 && dst.se[SE.STONE] <= 0 && dst.se[SE.STUN] <= 0 && dst.se[SE.DISARM] <= 0 && dst.state !== ST.DOWN) {
    if (inFrontArc(dst, ax, az, sh.arc * Math.PI / 180)) {
      const chance = Math.min(0.95, o.proj ? sh.proj + dst.mProj : sh.block + dst.mBlock);
      if (w.rng.next() < chance) {
        dst.anim.flinch = 0.4;
        if (w.ev.has('unit_block')) { const p = w.P.unit_block; p.src = src ? src.id : 0; p.dst = dst.id; p.x = dst.x; p.y = dst.y + 1.2; p.z = dst.z; p.kind = o.proj ? 'proj' : 'melee'; w.emit('unit_block', p); }
        if (src && src.alive && !o.proj && (o.bash || (src.def.melee && src.def.melee.style === 'bash'))) staggerUnit(w, src, 0.25);
        if (src) w.abilityHook('onBlocked', src, dst, o);
        w.abilityHook('onBlock', dst, src, o);
        return 0;
      }
    }
  }
  // ---- crit / backstab / charge ----
  if (!o.noCrit && !o.dot && w.rng.next() < G.critChance * (mut ? mut.crit : 1)) { raw *= G.critMul; crit = true; }
  if (melee && src && !o.noBackstab) {
    const dx = src.x - dst.x, dz = src.z - dst.z, l = Math.hypot(dx, dz) || 1;
    if ((dx * Math.sin(dst.heading) + dz * Math.cos(dst.heading)) / l < G.backstabArcCos) {
      raw *= G.backstabMul; back = true;
      if (w.rules.morale && w.time - dst.lastFlankT > 3) { dst.lastFlankT = w.time; dst.morale -= G.moraleFlanked; }
    }
  }
  const ch = o.charge;
  if (ch > 0.15) raw *= 1 + G.chargeDmg * ch;
  if (src) raw *= src.mDmg;
  if (mut) raw *= mut.dmg;
  raw *= dst.mDmgTaken;
  if (type === 'fire') {
    if (dst.def.tags.includes('fire_weak')) raw *= dst.def.tags.includes('undead') ? 2 : (dst.def.id === 'trojan_horse' ? 1.6 : 1.8);
    raw *= w.weather.fireMul;
  }
  if (dst.se[SE.SLEEP] > 0) raw *= 1.5;
  if (dst.se[SE.STONE] > 0 && type === 'blunt') raw *= 2;
  const apv = o.ap >= 0 ? o.ap : AP[type];
  const eff = Math.max(0, Math.min(0.9, (dst.def.armor + dst.mArmor) * (1 - apv)));
  let fin = o.fixed ? raw : Math.max(1, raw * (1 - eff));
  if (o.nonLethal && fin > dst.hp) fin = Math.max(0, dst.hp - 1);
  // ---- apply ----
  dst.hp -= fin; dst.dmgTaken += fin; dst.lastHitT = w.time;
  if (src) { src.dmgDealt += fin; dst.lastAttacker = src; }
  dst.flash = 1;
  dst.anim.flinch = Math.min(1, 0.5 + fin / dst.hpMax * 3);
  w.stats[dst.team].damageTaken += fin; if (src) w.stats[src.team].damageDealt += fin;
  w.lastDamageT = w.time;
  // knockback: v0 = kb * dmg / mass * KB_SCALE (u/s); travel = v0 / friction
  if (o.kb > 0 && !o.dot) {
    let dx, dz;
    if (o.hasDir) { dx = o.dx; dz = o.dz; } else { dx = dst.x - ax; dz = dst.z - az; }
    const l = Math.hypot(dx, dz) || 1;
    let kb = o.kb * base / dst.mass * G.kbScale * (mut ? mut.kb : 1);
    if (ch > 0.15) kb *= 1 + G.chargeKb * ch;
    if (kb > G.kbMax) kb = G.kbMax;
    if (dst.state === ST.DOWN) kb = 0;
    dst.kx += dx / l * kb; dst.kz += dz / l * kb;
    if (kb > G.staggerKb && dst.hp > 0 && dst.state !== ST.STUN && dst.mass < 6) staggerUnit(w, dst, Math.min(0.9, 0.2 + kb * 0.04));
  }
  if (mut && mut.ragdoll && dst.hp > 0 && !o.dot) staggerUnit(w, dst, 0.5);
  if (type === 'blunt' && o.kb > 0 && fin > dst.hpMax * 0.1 && dst.hp > 0 && dst.mass < 6 && !o.dot && !o.aoe) staggerUnit(w, dst, 0.2);
  // events
  if (!o.dot) {
    const p = w.P.unit_hit;
    p.src = src ? src.id : 0; p.dst = dst.id; p.dmg = fin; p.type = type; p.crit = crit; p.backstab = back; p.charge = ch; p.x = dst.x; p.y = dst.y + dst.height * 0.6; p.z = dst.z;
    p.srcDef = src ? src.def.id : ''; p.dstDef = dst.def.id; p.proj = !!o.proj; p.aoe = !!o.aoe;
    w.emit('unit_hit', p);
    if (src && src.team === dst.team && src !== dst) { const f = w.P.friendly_fire; f.src = src.id; f.dst = dst.id; f.dmg = fin; w.emit('friendly_fire', f); }
  }
  // speech bubbles (deterministic rolls, no RNG): a unit's first blow, and the first time it falls below the low-hp line
  if (src && !src.barkedEngage && src !== dst && src.team !== dst.team) { src.barkedEngage = true; if (w.barkRoll(src, 5)) w.bark(src, 'engage'); }
  if (!dst.barkedHurt && dst.hp > 0 && dst.hp < dst.hpMax * G.moraleLowHp) { dst.barkedHurt = true; if (w.barkRoll(dst, 12)) w.bark(dst, 'hurt'); }
  // ability hooks (before death so hooks see the state; killUnit runs onLethal)
  if (src && src.alive) w.abilityHook('onHitDealt', src, dst, fin, o);
  if (dst.hp <= 0) killUnit(w, dst, src, o.cause || (o.proj ? 'ranged' : o.aoe ? 'aoe' : type === 'fire' ? 'fire' : type === 'magic' ? 'magic' : 'melee'), o);
  else w.abilityHook('onDamaged', dst, src, fin, o);
  return fin;
}

/** Damage over time / hazards: no events, no knockback, no block. */
export function dotDamage(w, u, amt, cause, src) {
  if (!u.alive || u.state === ST.DOWN) return;
  const h = H_DOT.reset(); h.dot = true; h.noBlock = true; h.noCrit = true; h.fixed = true; h.kb = 0; h.type = cause === 'fire' ? 'fire' : 'magic'; h.cause = cause;
  u.hp -= amt; u.flash = Math.max(u.flash, 0.4); w.lastDamageT = w.time; w.stats[u.team].damageTaken += amt;
  if (src) { src.dmgDealt += amt; w.stats[src.team].damageDealt += amt; u.lastAttacker = src; }
  if (u.hp <= 0) killUnit(w, u, src || u.lastAttacker, cause, h);
}

export function staggerUnit(w, u, dur) {
  if (!u.alive || u.state === ST.STUN || u.state === ST.DOWN || u.state === ST.FLY) return;
  if (u.mass >= 8 && dur < 1.0) return;     // very heavy units shrug off stagger
  if (u.state === ST.SIT || u.state === ST.COWER || u.state === ST.CAST) return;
  u.state = ST.STAGGER; u.stateT = 0; u.stateDur = dur; u.dvx = 0; u.dvz = 0; u.hitDone = true;
  setAnim(u, 'stagger', 1);
  const e = w.P.unit_stagger; e.id = u.id; w.emit('unit_stagger', e);
}

export function killUnit(w, u, src, cause, o) {
  if (!u.alive) return;
  // revive / death-prevention hooks may cancel the death
  if (w.abilityHook('onLethal', u, src, cause, o) === true) return;
  u.alive = false; u.hp = 0; u.deadT = 0;
  u.target = null; releaseClaim(u);
  const team = u.team;
  const st = w.stats[team];
  st.dead++; st.deadCost += u.def.cost; st.alive--; st.aliveCost -= u.def.cost;
  if (src && src.alive) { src.kills++; w.stats[src.team].kills++; }
  const friendly = !!src && src.team === u.team && src !== u;
  // death clip + fling
  const sp = Math.hypot(u.kx, u.kz);
  let clip = 'death_back';
  if (u.se[SE.STONE] > 0) cause = 'stone';
  if (cause === 'stone') clip = 'stun';
  else if (cause === 'kick' || sp > 6) { clip = 'death_spin'; u.deathKind = 2; }
  else if (src) { const dx = src.x - u.x, dz = src.z - u.z; clip = (dx * Math.sin(u.heading) + dz * Math.cos(u.heading)) >= 0 ? 'death_back' : 'death_front'; }
  if (u.def.role === 'monster' || u.def.tags.includes('large')) clip = 'death_back';
  u.anim.dir = Math.atan2(u.kx, u.kz);
  setAnim(u, clip, 1);
  // corpse bookkeeping for the renderer (D5): cause, launch velocity, and a per-unit linger long enough for the real death clip
  u.deathCause = cause;
  u.deathLinger = Math.max(G.deathLinger, ClipLib.dur(clip, defRig(u.def)) + 0.2);
  u.ky = u.deathKind === 2 ? Math.min(7, sp * 0.4) : 0;
  u.state = ST.IDLE; u.stateT = 0; u.dvx = 0; u.dvz = 0;
  const p = w.P.unit_kill;
  p.src = src ? src.id : 0; p.dst = u.id; p.srcDef = src ? src.def.id : ''; p.dstDef = u.def.id; p.srcTeam = src ? src.team : -1; p.dstTeam = u.team; p.friendly = friendly; p.cause = cause;
  p.byPlayer = !!(src && src.controlled); p.revived = !!u.revived;
  p.x = u.x; p.y = u.y; p.z = u.z;
  w.emit('unit_kill', p);
  if (u.def.role === 'hero' || u.def.role === 'monster' || w.barkRoll(u, 6)) w.bark(u, 'deaths');
  w.moraleShock(u);
  w.abilityHook('onKilled', u, src, cause);
  if (src && src.alive) w.abilityHook('onKill', src, u, cause);
  w.checkFirstBlood(src, u);
}

/** Give back a unit's attack-token on its target. */
export function releaseClaim(u) {
  const c = u.claim;
  if (c) { if (c.claims > 0) c.claims--; u.claim = null; }
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

function hasBreachReach(u) {
  const p = u.breach, d = Math.sqrt((p.x - u.x) ** 2 + (p.z - u.z) ** 2) - u.radius - p.radius;
  const t = u.target, td = t && t.alive ? Math.sqrt((t.x - u.x) ** 2 + (t.z - u.z) ** 2) - u.radius - t.radius : 1e9;
  return d <= u.def.melee.range + 0.5 && d <= td;
}

/** The damage moment of a melee windup. */
export function resolveMelee(w, u) {
  const t = u.target, m = u.def.melee;
  if ((!t || !t.alive || (u.breach && !u.breach.dead && u.hold === true && hasBreachReach(u))) && u.breach && !u.breach.dead) {
    // breaching: damage the obstacle (blunt/heavy weapons are better at it)
    const p = u.breach, mul = (m.type === 'blunt' ? 1.5 : m.type === 'slash' ? 1.0 : 0.7) * (u.mass >= 6 ? 2.0 : 1.0);
    w.hurtProp(p, m.dmg * mul * u.mDmg);
    w.lastDamageT = w.time;                                    // chewing through the wall is progress, not a stalemate
    return;
  }
  if (!t || !t.alive) return;
  const dx = t.x - u.x, dz = t.z - u.z, dist = Math.hypot(dx, dz);
  const reach = m.range + u.mReach + u.radius + t.radius;
  if (dist > reach * 1.35 + 0.2) return;                      // target slipped away
  const chargeMul = chargeFactor(u);
  const o = H_MELEE.reset();
  o.type = m.type; o.ap = m.ap !== undefined ? m.ap : -1; o.kb = m.kb !== undefined ? m.kb : 4; o.charge = chargeMul; o.bash = m.style === 'bash';
  // brace: a spear/pike target facing a cavalry charger punishes it
  if (chargeMul > 0.3 && u.def.tags.includes('cavalry') && (t.def.tags.includes('spear') || t.def.tags.includes('pike'))) {
    const ax = u.x - t.x, az = u.z - t.z, l = Math.hypot(ax, az) || 1;
    const facing = (ax * Math.sin(t.heading) + az * Math.cos(t.heading)) / l;
    if (facing >= G.braceArcCos && t.speedNow < t.def.speed * 0.5) {
      const p = w.P.unit_brace; p.id = t.id; p.dst = u.id; w.emit('unit_brace', p);
      const b = H_BRACE.reset(); b.type = 'pierce'; b.kb = 6; b.cause = 'melee'; b.noBlock = true;
      applyDamage(w, t, u, t.def.melee.dmg * G.braceMul, b);
      u.kx = 0; u.kz = 0; u.vx = 0; u.vz = 0; u.dvx = 0; u.dvz = 0;          // momentum cancelled
      if (!u.alive) return;
      o.charge = 0; o.kb = 1;
      staggerUnit(w, u, 0.5);
    }
  }
  if (o.charge > 0.5) { const p = w.P.charge_hit; p.id = u.id; p.dst = t.id; p.mul = o.charge; w.emit('charge_hit', p); }
  const fin = applyDamage(w, u, t, m.dmg, o);
  // sweeping attacks for big weapons hit nearby enemies
  if (fin > 0 && u.alive && u.def.tags.includes('large') && u.def.role === 'monster') cleave(w, u, t, m.dmg * 0.5, m);
}

function cleave(w, u, first, dmg, m) {
  const reach = m.range + u.radius;
  const n = w.hash.query(first.x, first.z, 2.2, w.qbuf);
  let hit = 0;
  const q = w.qbuf;
  for (let k = 0; k < n && hit < 3; k++) {
    const o = w.units[q[k]]; if (!o || o === first || !o.alive || o.team === u.team) continue;
    if ((o.x - u.x) ** 2 + (o.z - u.z) ** 2 > (reach + o.radius + 0.8) ** 2) continue;
    const h = H_CLEAVE.reset(); h.type = m.type; h.kb = (m.kb !== undefined ? m.kb : 4) * 0.7; h.aoe = true; h.cause = 'melee'; h.at(u.x, u.z);
    applyDamage(w, u, o, dmg, h); hit++;
  }
}

/** 0..1 how much of its charge speed the unit currently has (cavalry/elephant/Minotaur) */
export function chargeFactor(u) {
  const d = u.def;
  if (!(d.tags.includes('cavalry') || d.tags.includes('large') || d.role === 'beast')) return 0;
  const walk = d.speed;
  const f = (u.speedNow / walk - 1) / Math.max(0.05, (d.runMul || 1.5) - 1);
  return f < 0 ? 0 : f > 1 ? 1 : f;
}
