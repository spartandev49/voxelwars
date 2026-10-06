// revive (immortal): the first lethal blow is not final: the unit falls (invulnerable, untargetable), and after `delay` s rises with hpFrac of its hp. Once per unit.
// Trigger: lethal damage from combat (not drowning/lava/falls). Telegraph: death clip while down, then `getup` + event unit_revive.
import { reg } from './registry.js';
import { ST, SE } from '../consts.js';
import { setAnim } from '../combat.js';

reg('revive', {
  init() { return { used: false, t: 0 }; },
  onLethal(u, ab, w, src, cause) {
    const st = ab.st;
    if (st.used || u.revived || u.noRevive || cause === 'lava' || cause === 'drown' || cause === 'fall' || cause === 'stone') return false;
    st.used = true; st.t = ab.p.delay || 3;
    u.hp = 1; u.state = ST.DOWN; u.stateT = 0; u.dvx = 0; u.dvz = 0; u.target = null; u.se[SE.DOWNED] = st.t;
    u.kx *= 0.2; u.kz *= 0.2;
    setAnim(u, 'death_back', 1);
    if (u.claim) { if (u.claim.claims > 0) u.claim.claims--; u.claim = null; }
    return true;                                     // death cancelled
  },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (u.state !== ST.DOWN || !st.used) return;
    st.t -= dt;
    if (st.t > 0) return;
    u.state = ST.GETUP; u.stateT = 0; u.stateDur = 0.9; u.hp = Math.max(1, u.hpMax * (ab.p.hpFrac || 0.4)); u.revived = true; u.se[SE.DOWNED] = 0;
    setAnim(u, 'getup', 1);
    const e = w.P.unit_revive; e.id = u.id; w.emit('unit_revive', e);
    w.bark(u, 'revive');
  },
});
