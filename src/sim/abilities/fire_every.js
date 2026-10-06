// fire_every (Nubian archer): every Nth arrow is a flaming arrow (fire damage + burn 4 dps for 3 s; spreads to flammable props). Disabled in rain/storm.
// Trigger: shot counter. AI rule: none. Telegraph: the projectile carries `fire` (read Projectile.fire); burning units get status_apply 'burn'.
import { reg } from './registry.js';

reg('fire_every', {
  init() { return { n: 0 }; },
  onFire(u, ab, w, p) {
    const st = ab.st; st.n++;
    if (st.n % (ab.p.n || 6) === 0 && w.weather.burnMul > 0.6) { p.fire = true; p.type = 'fire'; p.ap = 1; }
  },
  onHitDealt(u, ab, w, dst, fin, o) { if (o.fire && dst.alive) w.burn(dst, 3 * w.weather.burnMul); },
});
