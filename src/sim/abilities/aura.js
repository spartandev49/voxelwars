// aura: rally | curse | great_king | discipline | pincer  (units.md). Applied every tick in the modifier pass (world._updateStatusesAndMods).
//   rally (strategos r10): allies +15% dmg, +morale.      curse (mummy r5): enemies in range -20% speed.
//   great_king (pharaoh r8 / xerxes r10): allies +10% dmg, +morale.   discipline (centurion r9): allies +morale, morale loss -40%.
//   pincer (hannibal r14): allies +15% dmg while their target is hit from outside its front arc (flanked).
// Visible telegraph: a ground pulse ring every ~3 s (event `telegraph` kind 'aura') plus one `ability_cast` per pulse.
import { reg } from './registry.js';
import { SE } from '../consts.js';
import { collect, emitTelegraph, emitCast } from './util.js';
import { inFrontArc } from '../combat.js';

const L = new Array(400);
const PINCER_ARC = 60 * Math.PI / 180;

reg('aura', {
  init() { return { pulse: 0.5 }; },
  mods(u, ab, w, dt) {
    const p = ab.p, r = p.radius || 8, e = p.effect;
    if (e === 'curse') {
      const n = collect(w, u.x, u.z, r, L, u.team, 'enemy');
      for (let i = 0; i < n; i++) { const o = L[i]; if (o.se[SE.CURSE] < 0.4) o.se[SE.CURSE] = 0.4; }
      return;
    }
    const n = collect(w, u.x, u.z, r, L, u.team, 'ally');
    for (let i = 0; i < n; i++) {
      const o = L[i];
      if (e === 'rally') { o.mDmg *= 1.15; o.morale = Math.min(o.moraleMax, o.morale + 0.8 * dt); }
      else if (e === 'great_king') { o.mDmg *= 1.10; o.morale = Math.min(o.moraleMax, o.morale + 0.5 * dt); }
      else if (e === 'discipline') { o.mMoraleLoss = 0.6; o.morale = Math.min(o.moraleMax, o.morale + 0.6 * dt); }
      else if (e === 'pincer') { const t = o.target; if (t && t.alive && !inFrontArc(t, o.x, o.z, PINCER_ARC)) o.mDmg *= 1.15; }
    }
  },
  tick(u, ab, w, dt) {
    const st = ab.st; st.pulse -= dt;
    if (st.pulse > 0) return;
    st.pulse = 3 + (u.id % 5) * 0.2;
    emitTelegraph(w, 'aura', u.x, u.z, ab.p.radius || 8, 0.8, 0, 0, u.team);
    emitCast(w, u, ab, u.x, u.z);
  },
});
