// breaks_shield (pilum): a pilum that lands or is caught on a shield bends and disables that shield for 4 s. Passive onHit/onBlocked modifier.
// Trigger: pilum projectile hit or block. AI rule: none. Telegraph: status_apply 'disarm' + ability_cast at the victim.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { emitCast } from './util.js';

function bend(u, ab, w, dst, o) {
  if (o.kind !== 'pilum' || !dst.alive || !dst.def.shield) return;
  applyStatus(w, dst, SE.DISARM, ab.p.secs || 4);
  if (dst.se[SE.DISARM] < (ab.p.secs || 4)) dst.se[SE.DISARM] = ab.p.secs || 4;
  emitCast(w, u, ab, dst.x, dst.z);
}
reg('breaks_shield', {
  onHitDealt(u, ab, w, dst, fin, o) { bend(u, ab, w, dst, o); },
  onBlocked(u, ab, w, dst, o) { bend(u, ab, w, dst, o); },
});
