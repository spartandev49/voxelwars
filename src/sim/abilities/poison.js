// poison (medusa's snakes): a melee hit poisons the target: 3 dps for 3 s (refreshes). Passive onHit modifier.
// Trigger: landed melee hit. AI rule: none. Telegraph: status_apply 'poison' (green tint).
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';

reg('poison', {
  onHitDealt(u, ab, w, dst, fin, o) {
    if (o.proj || o.aoe || o.dot || !dst.alive || dst.def.tags.includes('undead')) return;
    applyStatus(w, dst, SE.POISON, ab.p.secs || 3); dst.poisonSrc = u;
    if (dst.se[SE.POISON] < (ab.p.secs || 3)) dst.se[SE.POISON] = ab.p.secs || 3;
  },
});
