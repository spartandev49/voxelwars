// cluck (sacred chicken): a taunting BAWK: enemies within 5 u target the chicken for 2 s. cd 12.
// Trigger: >= 2 enemies within 5 u and ready. AI rule: any chicken in a fight. Telegraph: small ring + bark during the 0.4 s squawk.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect } from './util.js';

const L = new Array(200), CHAN = 0.4;
function begin(u, ab, w) { beginChannel(w, u, ab, CHAN, 'flap', 1.5); emitTelegraph(w, 'circle', u.x, u.z, ab.p.radius || 5, CHAN, 0, 0, u.team); ab.cd = ab.p.cd || 12; w.bark(u, 'cluck'); }
reg('cluck', {
  init() { return { ch: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      if (tickChannel(w, u, ab, dt) === 1) {
        const n = collect(w, u.x, u.z, ab.p.radius || 5, L, u.team, 'enemy');
        for (let i = 0; i < n; i++) { const o = L[i]; if (o.def.tags.includes('boss')) continue; applyStatus(w, o, SE.TAUNT, ab.p.taunt || 2); o.tauntSrc = u; }
        emitCast(w, u, ab, u.x, u.z);
      }
      return;
    }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    if (collect(w, u.x, u.z, ab.p.radius || 5, L, u.team, 'enemy') >= 2) begin(u, ab, w);
  },
  cast(u, ab, w) { if (ab.cd > 0 || !canAct(w, u)) return false; begin(u, ab, w); return true; },
});
