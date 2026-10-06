// tantrum (sacred chicken): once its hp falls below (1 - chance) of max (30% damage) it throws a tantrum for 5 s: x3 damage, x1.5 speed. Re-arms 12 s after.
// Trigger: onDamaged threshold. AI rule: automatic. Telegraph: 0.4 s ruffle-and-flap clip, event chicken_tantrum, bark.
import { reg } from './registry.js';
import { ST, SE } from '../consts.js';
import { applyStatus, setAnim } from '../combat.js';

reg('tantrum', {
  init() { return { lock: 0 }; },
  tick(u, ab, w, dt) { if (ab.st.lock > 0) ab.st.lock -= dt; },
  onDamaged(u, ab, w) {
    const st = ab.st, p = ab.p;
    if (st.lock > 0 || !u.alive || u.hp > u.hpMax * (1 - (p.chance || 0.3))) return;
    st.lock = (p.duration || 5) + 12;
    u.rageDmg = p.dmg || 3; u.rageSpeed = p.speed || 1.5;
    applyStatus(w, u, SE.RAGE, p.duration || 5);
    if (u.state === ST.IDLE || u.state === ST.MOVE) { u.state = ST.CAST; u.stateT = 0; u.stateDur = 0.4; u.dvx = 0; u.dvz = 0; setAnim(u, 'tantrum', 1); }
    const e = w.P.chicken_tantrum; e.id = u.id; e.x = u.x; e.z = u.z; w.emit('chicken_tantrum', e);
    w.bark(u, 'tantrum');
  },
});
