// TEMPORARY procedural hum1 animator so BattleView can be developed before ANIM delivers src/anim/animator.js.
// Same signature as the real one: pose(model, state, extra, out). Delete once ANIM's animator is integrated.
import { POSE_STRIDE } from './voxskin.js';
const ids = ['body', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR', 'weapon', 'offhand'];
export class TempAnimator {
  constructor() { this.cache = new WeakMap(); }
  _idx(model) { let c = this.cache.get(model); if (!c) { c = {}; for (const id of ids) { const p = model.byId[id]; c[id] = p ? p.index * POSE_STRIDE : -1; } this.cache.set(model, c); } return c; }
  pose(model, s, ex, out) {
    for (let i = 0; i < out.length; i += POSE_STRIDE) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = out[i + 4] = out[i + 5] = 0; out[i + 6] = out[i + 7] = out[i + 8] = 1; }
    const I = this._idx(model), set = (id, f, v) => { const o = I[id]; if (o >= 0) out[o + f] = v; };
    const rt = ex.root, clip = s.clip, t = s.t;
    const ph = ex.gait * 2.4;
    const move = clip === 'walk' || clip === 'run' || clip === 'trot' || clip === 'gallop' || clip === 'rout';
    if (move) {
      const amp = clip === 'walk' ? 0.7 : 1.0, sw = Math.sin(ph) * amp;
      set('legUL', 3, sw); set('legLL', 3, Math.max(0, -sw) * 1.1); set('legUR', 3, -sw); set('legLR', 3, Math.max(0, sw) * 1.1);
      set('armUL', 3, -sw * 0.6); set('armUR', 3, sw * 0.6); set('body', 1, Math.abs(Math.sin(ph)) * 0.06); set('body', 3, clip === 'walk' ? 0.05 : 0.18);
      set('armUR', 3, -1.0); set('armLR', 3, -0.5);
    } else if (clip.startsWith('strike') || clip === 'shoot_bow' || clip === 'throw' || clip === 'cast' || clip === 'kick') {
      const d = Math.max(0.2, ex.hp !== undefined ? 0.6 : 0.6), k = Math.min(1, t / 0.62), w = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
      set('armUR', 3, -1.1 - w * 0.9); set('armLR', 3, -0.4 + w * 0.2); set('body', 4, w * 0.35 * (clip === 'strike_thrust' ? 1 : -1)); set('body', 3, 0.1);
      set('armUL', 3, -0.7); set('legUL', 3, 0.3); set('legUR', 3, -0.3);
    } else if (clip.startsWith('death')) {
      const k = Math.min(1, t / 0.55), e = 1 - Math.pow(1 - k, 3);
      const back = clip !== 'death_front' ? -1 : 1;
      rt.pitch = back * e * 1.45; rt.y = -0.1 * e + (clip === 'death_spin' ? Math.sin(k * 3.14) * 0.6 : 0);
      set('armUL', 3, -1.4 * e); set('armUR', 3, -1.0 * e); set('legUL', 3, 0.4 * e); set('legUR', 3, -0.3 * e);
    } else if (clip === 'stagger' || clip === 'hit_front') {
      const k = Math.min(1, t / 0.4); set('body', 3, 0.35 * Math.sin(k * 3.14)); set('head', 3, 0.2); set('armUL', 3, -0.5); set('armUR', 3, -0.5);
    } else if (clip === 'cheer') { const b = Math.abs(Math.sin(t * 6)); set('armUL', 3, -2.6); set('armUR', 3, -2.6); rt.y = b * 0.15; }
    else if (clip === 'stun' || clip === 'cower') { set('body', 3, 0.5); set('head', 3, 0.4); set('armUL', 3, -1.2); set('armUR', 3, -1.2); rt.y = -0.1; }
    else { const b = Math.sin(ex.t * 2 + ex.id) * 0.02; set('body', 1, b); set('armUR', 3, -0.9); set('armLR', 3, -0.5); set('armUL', 3, 0.05); set('head', 4, Math.sin(ex.t * 0.7 + ex.id) * 0.2); }
    // flinch
    if (s.flinch > 0 && !clip.startsWith('death')) { set('body', 3, (out[I.body + 3] || 0) - s.flinch * 0.25); }
  }
}
