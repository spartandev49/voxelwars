// misfire (catapult): 4% of shots launch a crew member instead of the boulder: a short flight, dmg 5 aoe 1.5, event catapult_misfire (announcer: "Not the crew!").
// Trigger: per shot roll. AI rule: none. Telegraph: projectile_launch kind 'crew' + catapult_misfire.
import { reg } from './registry.js';

reg('misfire', {
  onFire(u, ab, w, p) {
    if (w.rng.next() >= (ab.p.chance || 0.04)) return;
    p.crew = true; p.kind = 'crew'; p.dmg = 5; p.aoe = 1.5; p.crater = false; p.radius = 0.5; p.type = 'blunt';
    p.vx *= 0.55; p.vz *= 0.55; p.vy = Math.abs(p.vy) * 0.8 + 4;
    const e = w.P.catapult_misfire; e.id = u.id; w.emit('catapult_misfire', e);
    w.bark(u, 'misfire');
  },
});
