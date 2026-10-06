// stance: phalanx | testudo | shield_wall (spec §8.1): while stationary with >= 3 same-team allies within 2 u the shield bonuses switch on.
//   phalanx (hoplite) +0.12 block / +0.15 projectile block;  testudo (legionary) +0.20 projectile block with >= 4 adjacent allies and a ranged
//   threat within 30 u;  shield_wall (sparabara) +0.10 projectile block (0.80 -> 0.90).
import { reg } from './registry.js';
import { ST } from '../consts.js';
import { emitCast } from './util.js';

reg('stance', {
  init(u) { return { on: false, chk: (u.id % 5) * 0.03, castT: 0 }; },
  mods(u, ab, w, dt) {
    const st = ab.st, kind = ab.p.kind;
    st.chk -= dt; if (st.castT > 0) st.castT -= dt;
    if (st.chk <= 0) {
      st.chk = 0.2;
      let on = false;
      if (u.speedNow < 0.35 && (u.state === ST.IDLE || u.state === ST.WINDUP || u.state === ST.MOVE)) {
        const need = kind === 'testudo' ? 4 : 3;
        const q = w.qbuf3, n = w.hash.query(u.x, u.z, 2.0, q);
        let c = 0;
        for (let k = 0; k < n && c < need; k++) { const o = w.units[q[k]]; if (o && o !== u && o.alive && o.team === u.team && (o.x - u.x) ** 2 + (o.z - u.z) ** 2 <= 4) c++; }
        on = c >= need;
        if (on && kind === 'testudo') { const b = w.enemyBack[u.team]; on = b.n > 0 && (b.x - u.x) ** 2 + (b.z - u.z) ** 2 < 900; }
      }
      if (on && !st.on && st.castT <= 0) { st.castT = 6; emitCast(w, u, ab, u.x, u.z); }
      st.on = on;
    }
    if (!st.on) return;
    if (kind === 'phalanx') { u.mBlock += 0.12; u.mProj += 0.15; }
    else if (kind === 'testudo') u.mProj += 0.20;
    else if (kind === 'shield_wall') { u.mProj += 0.10; u.mBlock += 0.05; }
  },
});
