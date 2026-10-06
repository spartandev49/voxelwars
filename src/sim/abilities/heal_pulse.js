// heal_pulse: priest of Ra (+25 hp to up to 4 wounded allies within r8, cd 6) and the druid (+15 hp to 1 ally within r6 when no enemy is in range).
// Trigger: at least one ally below 85% hp in range (druid: and the druid has nothing to shoot). Telegraph: green ground ring during the 0.4 s cast.
import { reg } from './registry.js';
import { healUnit } from '../combat.js';
import { canAct, aiAllowed, beginChannel, tickChannel, emitCast, emitTelegraph, collect, gapTo } from './util.js';

const L = new Array(400);
const CAST = 0.4;
function wounded(u, ab, w) {
  const n = collect(w, u.x, u.z, ab.p.radius || 8, L, u.team, 'ally');
  let c = 0;
  for (let i = 0; i < n; i++) if (L[i].hp < L[i].hpMax * 0.85) c++;
  return c;
}
function begin(u, ab, w) {
  beginChannel(w, u, ab, CAST, 'cast', 1);
  emitTelegraph(w, 'heal', u.x, u.z, ab.p.radius || 8, CAST, 0, 0, u.team);
  ab.cd = ab.p.cd || 6;
}
function pulse(u, ab, w) {
  const p = ab.p, n = collect(w, u.x, u.z, p.radius || 8, L, u.team, 'ally');
  // heal the most wounded (by fraction) up to `targets`, selection sort on a tiny list
  let healed = 0;
  for (let k = 0; k < (p.targets || 4); k++) {
    let bi = -1, bf = 0.999;
    for (let i = 0; i < n; i++) { const o = L[i]; if (!o) continue; const f = o.hp / o.hpMax; if (f < bf) { bf = f; bi = i; } }
    if (bi < 0) break;
    healUnit(w, L[bi], p.amount || 25); L[bi] = null; healed++;
  }
  if (healed) emitCast(w, u, ab, u.x, u.z);
}
reg('heal_pulse', {
  init() { return { ch: 0 }; },
  tick(u, ab, w, dt) {
    const st = ab.st;
    if (st.ch > 0) { if (tickChannel(w, u, ab, dt) === 1) pulse(u, ab, w); return; }
    if (ab.cd > 0 || !aiAllowed(w, u) || !canAct(w, u)) return;
    if (ab.p.onlyIdle) { const t = u.target; if (t && t.alive && gapTo(u, t) <= (u.def.ranged ? u.def.ranged.range : 2)) return; }
    if (wounded(u, ab, w) > 0) begin(u, ab, w);
  },
  cast(u, ab, w) { if (ab.cd > 0 || !canAct(w, u)) return false; begin(u, ab, w); return true; },
});
