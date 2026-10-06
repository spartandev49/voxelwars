// bribe (senator): each coin that hits has a 5% chance to buy the target: it fights for the senator's team for 6 s, then returns. Bosses cannot be bribed.
// Trigger: onHitDealt of a `coin` projectile. AI rule: the senator throws coins as its basic attack. Telegraph: unit_convert + ability_cast at the target.
import { reg } from './registry.js';
import { emitCast } from './util.js';

reg('bribe', {
  onHitDealt(u, ab, w, dst, fin, o) {
    if (o.kind !== 'coin' || !dst.alive || dst.team === u.team || dst.def.tags.includes('boss') || dst.mass >= 8 || dst.vip) return;
    if (w.rng.next() >= (ab.p.chance || 0.05)) return;
    w.convertUnit(dst, u.team, ab.p.secs || 6);
    emitCast(w, u, ab, dst.x, dst.z);
    w.bark(u, 'bribe');
  },
});
