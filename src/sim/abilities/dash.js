// dash: bull_charge (minotaur: 12 u, 30 dmg + 1 s stun to everything in the path, cd 10) and goat_charge (battle goat: 8 u, melee dmg x2, stops on impact, cd 7).
// Trigger: target at charge distance with a clear line. AI rule: bull needs the target 5..14 u away, goat 3.5..8 u. Telegraph: a line on the ground for the 0.5 s rear-up wind-up.
import { reg } from './registry.js';
import { ST, SE } from '../consts.js';
import { applyDamage, applyStatus, newHit, setAnim } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect, dist, gapTo } from './util.js';

const L = new Array(64), H = newHit(), WIND = 0.5;
function begin(u, ab, w, dx, dz) {
  const st = ab.st, p = ab.p, l = Math.sqrt(dx * dx + dz * dz) || 1;
  st.dx = dx / l; st.dz = dz / l; u.face = Math.atan2(st.dx, st.dz);
  beginChannel(w, u, ab, WIND, 'rear', 1);
  const dist = p.dist || 8;
  emitTelegraph(w, 'line', u.x + st.dx * dist, u.z + st.dz * dist, 1.6, WIND, Math.atan2(st.dx, st.dz), dist, u.team);
  ab.cd = p.cd || 8;
}
function go(u, ab, w) {
  const st = ab.st, p = ab.p;
  st.go = true; st.left = p.dist || 8; st.nhit = 0; st.started = false; st.blocked = 0; st.lx = u.x; st.lz = u.z;
  const speed = p.kind === 'bull_charge' ? 20 : 18;
  st.speed = speed;
  u.state = ST.FLY; u.stateT = 0; u.stateDur = 99; u.ex = st.dx * speed; u.ez = st.dz * speed;
  setAnim(u, 'walk', 1);
  emitCast(w, u, ab, u.x + st.dx * st.left, u.z + st.dz * st.left);
  w.bark(u, 'taunt');
}
function stop(u, ab) {
  const st = ab.st; st.go = false; u.ex = 0; u.ez = 0;
  if (u.state === ST.FLY) { u.state = ST.IDLE; u.stateT = 0; }
}
reg('dash', {
  init() { return { ch: 0, go: false, dx: 0, dz: 1, left: 0, speed: 0, ids: new Int32Array(24), nhit: 0, started: false, blocked: 0, lx: 0, lz: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st, p = ab.p;
    if (st.ch > 0) { if (tickChannel(w, u, ab, dt) === 1) go(u, ab, w); return; }
    if (st.go) {
      if (u.state !== ST.FLY || u.se[SE.STUN] > 0) { stop(u, ab); return; }
      const step = st.speed * dt; st.left -= step;
      // hit everything in the path
      const n = collect(w, u.x + st.dx * 0.6, u.z + st.dz * 0.6, u.radius + 1.1, L, u.team, 'enemy');
      let stopNow = false;
      for (let i = 0; i < n; i++) {
        const o = L[i]; let seen = false;
        for (let k = 0; k < st.nhit; k++) if (st.ids[k] === o.id) { seen = true; break; }
        if (seen) continue;
        if (st.nhit < 24) st.ids[st.nhit++] = o.id;
        const h = H.reset(); h.type = 'blunt'; h.cause = 'gore'; h.noBlock = true; h.dir(-st.dz * 0 + (o.x - u.x), o.z - u.z);
        if (p.kind === 'bull_charge') { h.kb = 10; applyDamage(w, u, o, p.dmg || 30, h); if (o.alive) applyStatus(w, o, SE.STUN, p.stun || 1); }
        else { h.kb = u.def.melee ? (u.def.melee.kb !== undefined ? u.def.melee.kb : 4) : 8; applyDamage(w, u, o, (u.def.melee ? u.def.melee.dmg : 12) * (p.dmgMul || 2), h); stopNow = true; }
      }
      // blocked by terrain (did not advance) or distance exhausted
      const moved = Math.abs(u.x - st.lx) + Math.abs(u.z - st.lz);
      if (st.started && moved < step * 0.2) st.blocked++; else st.blocked = 0;
      st.started = true; st.lx = u.x; st.lz = u.z;
      if (stopNow || st.left <= 0 || st.blocked >= 3) stop(u, ab);
      return;
    }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    const t = u.target; if (!t || !t.alive || t.mass >= 10) return;
    const d = dist(u, t), bull = p.kind === 'bull_charge';
    if (d < (bull ? 5 : 3.5) || d > (bull ? 14 : 8)) return;
    if (!w.nav.clearLine(u.x, u.z, t.x, t.z)) return;
    begin(u, ab, w, t.x - u.x, t.z - u.z);
  },
  cast(u, ab, w, ctx) {
    if (ab.cd > 0 || !canAct(w, u)) return false;
    const dx = ctx.dx !== undefined ? ctx.dx : Math.sin(u.heading), dz = ctx.dz !== undefined ? ctx.dz : Math.cos(u.heading);
    begin(u, ab, w, dx, dz); return true;
  },
});
