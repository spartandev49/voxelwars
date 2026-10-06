// war_horn (chieftain): once per battle: allies within r14 get +20% speed and +20% damage for 8 s.
// Trigger: in a fight (>= 4 enemies within 14 u) with >= 5 allies around, or when hurt below 50%. Telegraph: ring r14 during the 0.8 s blast.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { applyStatus } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect } from './util.js';

const L = new Array(400), CHAN = 0.8;
function begin(u, ab, w) {
  ab.st.used = true;
  beginChannel(w, u, ab, CHAN, 'taunt', 1.6);
  emitTelegraph(w, 'circle', u.x, u.z, ab.p.radius || 14, CHAN, 0, 0, u.team);
}
reg('war_horn', {
  init() { return { ch: 0, used: false }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      if (tickChannel(w, u, ab, dt) === 1) {
        const n = collect(w, u.x, u.z, ab.p.radius || 14, L, u.team, 'ally');
        for (let i = 0; i < n; i++) { applyStatus(w, L[i], SE.HASTE, ab.p.duration || 8); applyStatus(w, L[i], SE.DMGUP, ab.p.duration || 8); }
        emitCast(w, u, ab, u.x, u.z); w.bark(u, 'horn');
      }
      return;
    }
    if (st.used || !aiAllowed(w, u) || !canAct(w, u)) return;
    const r = ab.p.radius || 14;
    if (u.hp < u.hpMax * 0.5 || (u.engaged && collect(w, u.x, u.z, r, L, u.team, 'enemy') >= 4 && collect(w, u.x, u.z, r, L, u.team, 'ally') >= 5)) begin(u, ab, w);
  },
  cast(u, ab, w) { if (ab.st.used || !canAct(w, u)) return false; begin(u, ab, w); return true; },
});
