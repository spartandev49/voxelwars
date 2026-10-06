// summon_on_death (Trojan horse): the hatch opens and `count` hoplites tumble out: when the horse dies, when it has fought its way into the enemy
// line (>= 3 enemies within 5 u), when it falls under 50% hp, or `onContact` seconds after first contact. Once. Events: trojan_reveal + unit_spawn.
// Telegraph: the 1.6 s `reveal` clip (ability_channel_start) before the spawn at 0.8 s; death skips straight to the spawn.
import { reg } from './registry.js';
import { ST } from '../consts.js';
import { setAnim } from '../combat.js';
import { canAct, beginChannel, tickChannel, emitCast, collect } from './util.js';

const L = new Array(64);

function reveal(u, ab, w) {
  const st = ab.st; if (st.done) return;
  st.done = true;
  const p = ab.p, n = p.count || 6, fx = Math.sin(u.heading), fz = Math.cos(u.heading);
  // hatch is on the belly: spawn just behind the horse, tumble outward
  const cx = u.x - fx * (u.radius + 0.8), cz = u.z - fz * (u.radius + 0.8);
  const sq = w.addSquad(p.spawn || 'hoplite', u.team, n, cx, cz, { formation: 'circle', heading: u.heading, spacing: 1.2 });
  for (let i = 0; i < sq.units.length; i++) {
    const s = sq.units[i];
    const a = (i / n) * Math.PI * 2;
    s.kx = Math.cos(a) * 3.2; s.kz = Math.sin(a) * 3.2;
    s.state = ST.GETUP; s.stateT = 0; s.stateDur = 0.9; setAnim(s, 'getup', 1);
  }
  const e = w.P.trojan_reveal; e.id = u.id; e.x = u.x; e.z = u.z; e.count = n; w.emit('trojan_reveal', e);
  emitCast(w, u, ab, u.x, u.z);
}

reg('summon_on_death', {
  init() { return { done: false, ch: 0, contact: 0, spawned: false }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) {
      const el = 1.6 - st.ch; if (!st.spawned && el >= 0.8) { st.spawned = true; reveal(u, ab, w); }
      tickChannel(w, u, ab, dt); return;
    }
    if (st.done) return;
    const n = collect(w, u.x, u.z, 5, L, u.team, 'enemy');
    if (n > 0) st.contact += dt;
    const trigger = n >= 3 || u.hp < u.hpMax * 0.5 || st.contact >= (ab.p.onContact || 25);
    if (trigger && !u.controlled && canAct(w, u)) { st.spawned = false; beginChannel(w, u, ab, 1.6, 'reveal', 1); }
  },
  onKilled(u, ab, w) { reveal(u, ab, w); },
});
