// dot_cloud (pharaoh's locusts): a swarm cloud r7 on an enemy cluster for 6 s, 8 dps to every enemy inside, cd 25.
// Trigger: >= 4 enemies within r of the target point and the point within 16 u. AI rule: centre on the current target. Telegraph: ring on the target point for the 1 s summoning.
import { reg } from './registry.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect, dist } from './util.js';

const L = new Array(400), CHAN = 1.0;
function begin(u, ab, w, x, z) {
  ab.st.tx = x; ab.st.tz = z; u.face = Math.atan2(x - u.x, z - u.z);
  beginChannel(w, u, ab, CHAN, 'cast', 1);
  emitTelegraph(w, 'circle', x, z, ab.p.radius || 7, CHAN, 0, 0, u.team);
  ab.cd = ab.p.cd || 25;
}
reg('dot_cloud', {
  init() { return { ch: 0, tx: 0, tz: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      if (tickChannel(w, u, ab, dt) === 1) { w.addEffect('cloud', st.tx, st.tz, ab.p.radius || 7, ab.p.duration || 6, ab.p.dps || 8, u.team, u); emitCast(w, u, ab, st.tx, st.tz); }
      return;
    }
    if (ab.cd > 0 || !canAct(w, u)) return;
    const t = u.target; if (!t || !t.alive || dist(u, t) > 16) return;
    if (collect(w, t.x, t.z, ab.p.radius || 7, L, u.team, 'enemy') >= 4) begin(u, ab, w, t.x, t.z);
  },
  cast(u, ab, w, ctx) { if (ab.cd > 0 || !canAct(w, u)) return false; const x = ctx.x !== undefined ? ctx.x : u.x + Math.sin(u.heading) * 8, z = ctx.z !== undefined ? ctx.z : u.z + Math.cos(u.heading) * 8; begin(u, ab, w, x, z); return true; },
});
