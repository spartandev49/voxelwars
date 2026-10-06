// fire_panic (war elephant): after `hits` (3) fire hits the elephant panics and flees for `flee` (6) s, trampling friend and foe alike on its way.
// Trigger: fire damage taken (flaming arrows, fire explosions; burn ticks do not count). AI rule: automatic. Telegraph: status_apply 'scare' + trumpet bark.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';

reg('fire_panic', {
  init() { return { hits: 0, last: -9, src: { x: 0, z: 0 } }; },
  onDamaged(u, ab, w, src, fin, o) {
    if (o.type !== 'fire' && !o.fire) return;
    const st = ab.st;
    if (w.time - st.last < 0.3) return;
    st.last = w.time; st.hits++;
    if (st.hits < (ab.p.hits || 3)) return;
    st.hits = 0;
    // flee away from the fire source (the shooter / explosion)
    st.src.x = src ? src.x : (o.hasPos ? o.x : u.x - Math.sin(u.heading)); st.src.z = src ? src.z : (o.hasPos ? o.z : u.z - Math.cos(u.heading));
    u.routFrom = st.src;
    applyStatus(w, u, SE.SCARE, ab.p.flee || 6);
    w.bark(u, 'elephant_panic');
  },
  tick(u, ab, w) { if (u.routFrom === ab.st.src && u.se[SE.SCARE] <= 0) u.routFrom = null; },
});
