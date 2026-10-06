// crowd_favorite (gladiator): +20% damage while >= 5 enemies are within 5 u (the crowd loves a gladiator who is outnumbered). Event crowd_roar on activation.
// Trigger: enemy count in range (recomputed every 5 ticks). AI rule: automatic. Telegraph: ability_cast + crowd_roar when it switches on.
import { reg } from './registry.js';
import { emitCast } from './util.js';

reg('crowd_favorite', {
  init(u) { return { on: false, chk: u.id % 5, cd: 0 }; },
  mods(u, ab, w, dt) {
    const st = ab.st, p = ab.p;
    if (st.cd > 0) st.cd -= dt;
    if (--st.chk <= 0) {
      st.chk = 5;
      const r = p.radius || 5, q = w.qbuf3, n = w.hash.query(u.x, u.z, r, q), r2 = r * r;
      let c = 0;
      for (let k = 0; k < n; k++) { const o = w.units[q[k]]; if (o && o.alive && o.team !== u.team && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 <= r2) c++; }
      const on = c >= (p.enemies || 5);
      if (on && !st.on && st.cd <= 0) { st.cd = 6; emitCast(w, u, ab, u.x, u.z); const e = w.P.crowd_roar; e.x = u.x; e.z = u.z; w.emit('crowd_roar', e); }
      st.on = on;
    }
    if (st.on) u.mDmg *= p.dmg || 1.2;
  },
});
