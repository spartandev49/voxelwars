// kick (spartan): every 8 s a melee target is kicked 8 u away (explicit launch velocity), stunned 0.8 s, spin death clip if it dies in flight.
// Trigger: target within kick range, ability off cooldown. AI rule: always (elite crowd control); not on very heavy targets (mass >= 6).
// Telegraph: ability_channel_start (0.7 s kick clip) + ground ring at the victim.
import { reg } from './registry.js';
import { ST, SE } from '../consts.js';
import { applyDamage, applyStatus, newHit, setAnim } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, gapTo } from './util.js';

const KICK_V = 44;               // u/s launch speed: friction 6/s over 30 Hz ticks gives ~8 u of travel
const H = newHit();
const WIND = 0.7, HITAT = 0.3;

function strike(u, ab, w) {
  const t = ab.st.tgt;
  if (!t || !t.alive || t.mass >= 6 || gapTo(u, t) > 2.8) return;
  const dx = t.x - u.x, dz = t.z - u.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
  const h = H.reset(); h.type = 'blunt'; h.kb = 0; h.cause = 'kick'; h.noBlock = true; h.noCrit = true;
  applyDamage(w, u, t, 8, h);
  if (!t.alive) return;
  t.kx = dx / l * KICK_V; t.kz = dz / l * KICK_V; t.vx = 0; t.vz = 0;
  applyStatus(w, t, SE.STUN, 0.8);
  emitCast(w, u, ab, t.x, t.z);
  w.bark(u, 'kick');
}
function begin(u, ab, w, t) {
  ab.st.tgt = t; ab.st.hitDone = false;
  u.face = Math.atan2(t.x - u.x, t.z - u.z);
  beginChannel(w, u, ab, WIND, 'kick', 1);
  emitTelegraph(w, 'kick', t.x, t.z, 1.2, HITAT, 0, 0, u.team);
  ab.cd = ab.p.cd || 8;
}

reg('kick', {
  init() { return { ch: 0, tgt: null, hitDone: false }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      const el = WIND - st.ch;
      if (!st.hitDone && el >= HITAT) { st.hitDone = true; strike(u, ab, w); }
      tickChannel(w, u, ab, dt);
      return;
    }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    const t = u.target;
    if (!t || !t.alive || t.mass >= 6 || gapTo(u, t) > 2.0) return;
    begin(u, ab, w, t);
  },
  /** Player-triggered (possession): kick the nearest enemy in reach. */
  cast(u, ab, w, ctx) {
    if (ab.cd > 0 || !canAct(w, u) || !ctx.target || gapTo(u, ctx.target) > 2.6) return false;
    begin(u, ab, w, ctx.target); return true;
  },
});
