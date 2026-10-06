// execute (anubis guard): every 10 s a melee target below 20% hp (not a boss/large unit) is slain outright.
// Trigger: target in melee reach, ability ready, target hp fraction under `threshold`. AI rule: use it instead of a normal swing. Telegraph: ring on the victim for the 0.5 s wind-up.
import { reg } from './registry.js';
import { killUnit, newHit, meleeClip } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, gapTo } from './util.js';
import { setAnim } from '../combat.js';

const WIND = 0.5, H = newHit();
function ok(u, ab, t) { return t && t.alive && t.hp < t.hpMax * (ab.p.threshold || 0.2) && !t.def.tags.includes('boss') && !t.def.tags.includes('large') && t.mass < 8; }
function begin(u, ab, w, t) {
  ab.st.tgt = t; u.face = Math.atan2(t.x - u.x, t.z - u.z);
  beginChannel(w, u, ab, WIND, meleeClip(u.def, u.atkN++), 1);
  emitTelegraph(w, 'execute', t.x, t.z, 1.0, WIND, 0, 0, u.team);
  ab.cd = ab.p.cd || 10;
}
reg('execute', {
  init() { return { ch: 0, tgt: null }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      if (tickChannel(w, u, ab, dt) === 1) {
        const t = st.tgt;
        if (t && ok(u, ab, t) && gapTo(u, t) <= (u.def.melee ? u.def.melee.range : 2) + 0.8) { emitCast(w, u, ab, t.x, t.z); u.dmgDealt += t.hp; t.hp = 0; killUnit(w, t, u, 'execute', H.reset()); }
      }
      return;
    }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    const t = u.target;
    if (!ok(u, ab, t) || gapTo(u, t) > (u.def.melee ? u.def.melee.range : 2) + 0.15) return;
    begin(u, ab, w, t);
  },
  cast(u, ab, w, ctx) { const t = ctx.target; if (ab.cd > 0 || !canAct(w, u) || !ok(u, ab, t) || gapTo(u, t) > 3) return false; begin(u, ab, w, t); return true; },
});
