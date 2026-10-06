// rage (berserker): below `hpFrac` (50%) hp: +50% damage, +30% speed and fearless until the end of the fight.
// Trigger: hp threshold crossed (checked every tick). AI rule: automatic. Telegraph: glow + roar (ability_cast once, status_apply 'rage').
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { emitCast } from './util.js';

reg('rage', {
  init() { return { on: false }; },
  mods(u, ab, w) {
    const st = ab.st;
    if (u.hp < u.hpMax * (ab.p.hpFrac || 0.5)) {
      if (!st.on) {
        st.on = true; u.rageDmg = ab.p.dmg || 1.5; u.rageSpeed = ab.p.speed || 1.3; u.moraleMax = 999; u.morale = 999; u.glow = 0.6;
        if (u.state === 7) u.state = 0;                                   // un-rout
        emitCast(w, u, ab, u.x, u.z); w.bark(u, 'rage');
      }
      applyStatus(w, u, SE.RAGE, 0.3);                                    // the status pass multiplies dmg/speed by rageDmg/rageSpeed
    }
  },
});
