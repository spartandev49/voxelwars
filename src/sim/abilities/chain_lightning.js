// chain_lightning (druid): a thunderbolt that hits an enemy arcs to up to 2 more enemies within 8 u (0.7x damage per jump). Event lightning_arc per jump.
// Trigger: hook on a landed thunderbolt hit. AI rule: none (it is the druid's basic attack). Telegraph: the arcs themselves.
import { reg } from './registry.js';
import { chainLightning, emitCast } from './util.js';

reg('chain_lightning', {
  onHitDealt(u, ab, w, dst, fin, o) {
    if (o.kind !== 'thunderbolt' || !dst.alive && false) return;
    const n = (u.def.ranged && u.def.ranged.chain) || ab.p.chain || 3;
    chainLightning(w, u, dst, u.def.ranged ? u.def.ranged.dmg : 22, n, u.team);
    emitCast(w, u, ab, dst.x, dst.z);
  },
});
