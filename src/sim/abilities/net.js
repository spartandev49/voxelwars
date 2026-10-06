// net (gladiator): throws a net at an enemy within r 10: roots it 2.5 s (it can still fight, not move). cd 12.
// Trigger: target 3..10 u away, not already rooted/heavy. AI rule: prefer the current target; telegraph = ground ring at the victim for the 0.4 s throw.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, gapTo, dist } from './util.js';

const THROW = 0.4;
function begin(u, ab, w, t) {
  ab.st.tgt = t; ab.st.tx = t.x; ab.st.tz = t.z;
  u.face = Math.atan2(t.x - u.x, t.z - u.z);
  beginChannel(w, u, ab, THROW, 'throw', 1);
  emitTelegraph(w, 'net', t.x, t.z, 1.4, THROW, 0, 0, u.team);
  ab.cd = ab.p.cd || 12;
}
reg('net', {
  init() { return { ch: 0, tgt: null, tx: 0, tz: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      if (tickChannel(w, u, ab, dt) === 1) {
        const t = st.tgt;
        if (t && t.alive && dist(u, t) <= (ab.p.radius || 10) + 2) { applyStatus(w, t, SE.ROOT, ab.p.root || 2.5); emitCast(w, u, ab, t.x, t.z); }
      }
      return;
    }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    const t = u.target; if (!t || !t.alive || t.se[SE.ROOT] > 0 || t.mass >= 8) return;
    const g = gapTo(u, t);
    if (g < 3 || dist(u, t) > (ab.p.radius || 10)) return;
    begin(u, ab, w, t);
  },
  cast(u, ab, w, ctx) { if (ab.cd > 0 || !canAct(w, u) || !ctx.target || dist(u, ctx.target) > (ab.p.radius || 10) + 1) return false; begin(u, ab, w, ctx.target); return true; },
});
