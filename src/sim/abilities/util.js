// Shared helpers for ability implementations: gating, channel (telegraph) lifecycle, shape queries, chain lightning, barks.
import { ST, SE } from '../consts.js';
import { setAnim, applyDamage, newHit } from '../combat.js';

export const abName = (ab) => ab.p.effect || ab.p.kind || ab.p.id;

/** A unit may start an ability: alive, free to act (idle/moving), not controlled by the player, not disabled. */
export function canAct(w, u) {
  if (!u.alive || u.controlled) return false;
  const s = u.state;
  if (s !== ST.IDLE && s !== ST.MOVE) return false;
  const se = u.se;
  return !(se[SE.STUN] > 0 || se[SE.SLEEP] > 0 || se[SE.STONE] > 0 || se[SE.SCARE] > 0);
}
/** Difficulty gate (spec §8.1): easy AI does not use abilities except heroes. */
export function aiAllowed(w, u) { return !(w.diff[u.team] === 0 && u.def.role !== 'hero'); }

export function emitTelegraph(w, kind, x, z, r, t, h, a, team) {
  const e = w.P.telegraph; e.kind = kind; e.x = x; e.z = z; e.r = r; e.t = t; e.h = h || 0; e.a = a || 0; e.team = team === undefined ? -1 : team;
  w.emit('telegraph', e);
}
export function emitCast(w, u, ab, x, z) {
  const e = w.P.ability_cast; e.id = u.id; e.ability = abName(ab); e.x = x; e.z = z; e.team = u.team; w.emit('ability_cast', e);
}
/** Begin a channel: unit freezes in CAST for `dur` (+ a short recovery), events ability_channel_start (+ optional ground telegraph). */
export function beginChannel(w, u, ab, dur, clip, rate) {
  const st = ab.st;
  u.state = ST.CAST; u.stateT = 0; u.stateDur = dur + 0.2; u.dvx = 0; u.dvz = 0;
  st.ch = dur; st.chDur = dur;
  setAnim(u, clip, rate || 1);
  const e = w.P.ability_channel_start; e.id = u.id; e.ability = abName(ab); e.duration = dur; w.emit('ability_channel_start', e);
}
/** Tick a running channel. Returns 1 when it just completed, -1 when it was interrupted, 0 while running/idle. */
export function tickChannel(w, u, ab, dt) {
  const st = ab.st;
  if (!(st.ch > 0)) return 0;
  if (u.state !== ST.CAST) { st.ch = 0; endChannelEvent(w, u, ab); ab.cd = Math.max(ab.cd, (ab.p.cd || 5) * 0.5); return -1; }
  st.ch -= dt;
  if (st.ch <= 0) { st.ch = 0; endChannelEvent(w, u, ab); return 1; }
  return 0;
}
export function endChannelEvent(w, u, ab) {
  const e = w.P.ability_channel_end; e.id = u.id; e.ability = abName(ab); e.duration = ab.st.chDur || 0; w.emit('ability_channel_end', e);
}

/**
 * Collect alive units within r of (x,z) into `list` (unit refs, copied out of the shared query buffer so callers may re-enter).
 * want: 'enemy' of `team`, 'ally' of `team`, or 'all'. Skips downed units. Returns the count (<= list.length).
 */
export function collect(w, x, z, r, list, team, want) {
  const q = w.qbuf3, n = w.hash.query(x, z, r, q), r2 = r * r;
  let c = 0;
  for (let k = 0; k < n && c < list.length; k++) {
    const o = w.units[q[k]];
    if (!o || !o.alive || o.state === ST.DOWN) continue;
    if (want === 'enemy' ? o.team === team : want === 'ally' ? o.team !== team : false) continue;
    const dx = o.x - x, dz = o.z - z;
    if (dx * dx + dz * dz > r2) continue;
    list[c++] = o;
  }
  return c;
}
/** Is (px,pz) inside the cone from (ox,oz) along heading dir (dx,dz unit) with the given half-angle (radians) and range? */
export function inCone(ox, oz, dx, dz, px, pz, range, half) {
  const vx = px - ox, vz = pz - oz, d2 = vx * vx + vz * vz;
  if (d2 > range * range) return false;
  const d = Math.sqrt(d2) || 1e-6;
  return (vx * dx + vz * dz) / d >= Math.cos(half);
}
export function dist(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
export function gapTo(u, t) { return dist(u, t) - u.radius - t.radius; }

const H_CHAIN = newHit();
const CHAIN_SEEN = new Int32Array(8);
/** Chain lightning from `first` to up to n-1 more enemies of src's team within 8 u, damage falling 0.7x per jump. Emits lightning_arc. */
export function chainLightning(w, src, first, dmg, n, team) {
  let from = first, d = dmg * 0.7, seen = 1;
  CHAIN_SEEN[0] = first.id;
  const q = w.qbuf3;
  for (let j = 1; j < n && j < 8; j++) {
    let best = null, bd = 64;
    const m = w.hash.query(from.x, from.z, 8, q);
    for (let k = 0; k < m; k++) {
      const o = w.units[q[k]]; if (!o || !o.alive || o.team === team || o.state === ST.DOWN) continue;
      let dup = false; for (let s = 0; s < seen; s++) if (CHAIN_SEEN[s] === o.id) { dup = true; break; }
      if (dup) continue;
      const d2 = (o.x - from.x) ** 2 + (o.z - from.z) ** 2; if (d2 < bd) { bd = d2; best = o; }
    }
    if (!best) break;
    const e = w.P.lightning_arc; e.x0 = from.x; e.y0 = from.y + from.height * 0.6; e.z0 = from.z; e.x1 = best.x; e.y1 = best.y + best.height * 0.6; e.z1 = best.z; w.emit('lightning_arc', e);
    const h = H_CHAIN.reset(); h.type = 'magic'; h.ap = 1; h.kb = 2; h.cause = 'lightning'; h.noBlock = true; h.noCrit = true;
    applyDamage(w, src, best, d, h);
    CHAIN_SEEN[seen++] = best.id; from = best; d *= 0.7;
  }
}
