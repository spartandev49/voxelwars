// hook (khopesh): a melee hit has a 15% chance to hook the target's shield away: it loses its block for 3 s. Passive onHit modifier.
// Trigger: landed melee hit on a shielded target. AI rule: none. Telegraph: status_apply 'disarm' + ability_cast at the target.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { emitCast } from './util.js';

reg('hook', {
  onHitDealt(u, ab, w, dst, fin, o) {
    if (o.proj || o.aoe || o.dot || !dst.alive || !dst.def.shield || dst.se[SE.DISARM] > 0) return;
    if (w.rng.next() >= (ab.p.chance || 0.15)) return;
    applyStatus(w, dst, SE.DISARM, ab.p.secs || 3);
    emitCast(w, u, ab, dst.x, dst.z);
  },
});
