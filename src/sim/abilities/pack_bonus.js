// pack_bonus (warhound): +8% damage per other hound of the same kind within 5 u (max +40%). Passive; recomputed every 3 ticks.
// Telegraph: none needed (passive); the bonus is visible through the number of hounds. AI rule: hounds charge together by design.
import { reg } from './registry.js';

reg('pack_bonus', {
  init(u) { return { n: 0, t: u.id % 3 }; },
  mods(u, ab, w) {
    const st = ab.st;
    if (--st.t <= 0) {
      st.t = 3;
      const q = w.qbuf3, n = w.hash.query(u.x, u.z, ab.p.radius || 5, q), r2 = (ab.p.radius || 5) ** 2;
      let c = 0;
      for (let k = 0; k < n; k++) { const o = w.units[q[k]]; if (o && o !== u && o.alive && o.team === u.team && o.def === u.def && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 <= r2) c++; }
      st.n = c;
    }
    u.mDmg *= 1 + Math.min(ab.p.max || 0.4, (ab.p.per || 0.08) * st.n);
  },
});
