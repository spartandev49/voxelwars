// throne (Xerxes): after `idle` (4) s standing still out of the fight he sits on a throne prop (event prop_spawned + throne_sit): allies within 12 u deal +20%
// damage while he is seated. When attacked (or an enemy gets within 4 u) he leaps up, shouts "Retreat!" and cowers for 2 s.
// Trigger: idle timer. AI rule: the squad holds back as an overseer (Squad.watch) so he actually gets to sit. Telegraph: the throne spawning + SIT clip.
import { reg } from './registry.js';
import { ST } from '../consts.js';
import { setAnim } from '../combat.js';
import { collect } from './util.js';

const L = new Array(400);

function sit(u, ab, w) {
  const st = ab.st, fx = Math.sin(u.heading), fz = Math.cos(u.heading);
  st.seated = true; st.idle = 0;
  u.state = ST.SIT; u.stateT = 0; u.dvx = 0; u.dvz = 0; setAnim(u, 'sit', 1);
  if (!st.prop || st.prop.dead) {
    // reuse a throne we already own if close enough, else spawn one behind him (max 2 per unit)
    if (st.spawned < 2) { st.prop = w.spawnProp('throne', u.x - fx * 1.6, u.z - fz * 1.6, { r: u.heading, s: 1.0 }); st.spawned++; }
  }
  const e = w.P.throne_sit; e.id = u.id; e.x = u.x; e.z = u.z; e.sitting = 1; w.emit('throne_sit', e);
}
function stand(u, ab, w) {
  const st = ab.st;
  st.seated = false; st.idle = -8;
  u.state = ST.COWER; u.stateT = 0; u.stateDur = 2.0; u.dvx = 0; u.dvz = 0; setAnim(u, 'cower', 1);
  const e = w.P.throne_sit; e.id = u.id; e.x = u.x; e.z = u.z; e.sitting = 0; w.emit('throne_sit', e);
  w.bark(u, 'throne_retreat');
}

reg('throne', {
  init() { return { idle: 0, seated: false, prop: null, spawned: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.seated) {
      if (u.state !== ST.SIT) { st.seated = false; return; }
      // an enemy walking up to the throne also ends the sitting
      if (collect(w, u.x, u.z, 4, L, u.team, 'enemy') > 0) stand(u, ab, w);
      return;
    }
    if ((u.state === ST.IDLE || u.state === ST.MOVE) && u.speedNow < 0.25 && !u.engaged && !u.controlled && w.diff[u.team] > 0) st.idle += dt; else if (st.idle > 0) st.idle = 0;
    else if (st.idle < 0 && !(u.state === ST.COWER)) st.idle = Math.min(0, st.idle + dt);
    if (st.idle >= (ab.p.idle || 4)) sit(u, ab, w);
  },
  mods(u, ab, w) {
    if (!ab.st.seated) return;
    const n = collect(w, u.x, u.z, 12, L, u.team, 'ally');
    for (let i = 0; i < n; i++) L[i].mDmg *= 1.2;
  },
  onDamaged(u, ab, w) { if (ab.st.seated && u.state === ST.SIT) stand(u, ab, w); },
  onKilled(u, ab, w) { ab.st.seated = false; },
});
