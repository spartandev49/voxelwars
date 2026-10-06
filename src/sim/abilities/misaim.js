// misaim (cyclops depth perception): 25% of boulder throws land 4-9 u off target. Event cyclops_misaim (announcer: poor depth perception).
// Trigger: per throw roll (onAim hook). AI rule: none. Telegraph: the boulder visibly lands elsewhere; event for the announcer.
import { reg } from './registry.js';

reg('misaim', {
  onAim(u, ab, w, aim) {
    if (w.rng.next() >= (ab.p.chance || 0.25)) return;
    const a = w.rng.next() * Math.PI * 2, d = 4 + w.rng.next() * 5;
    aim.x += Math.cos(a) * d; aim.z += Math.sin(a) * d; aim.missed = true;
    const e = w.P.cyclops_misaim; e.id = u.id; w.emit('cyclops_misaim', e);
  },
});
