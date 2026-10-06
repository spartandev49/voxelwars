// hum_lite: the compact crew figure used by siege engines, the chariot and the elephant howdah (spec 4.1): body, head, armUL, armUR, legUL, legUR (6 parts) at the canonical
// hum1 pivots/origins (body 10x9x5 pivot (5,0,2.5) origin (0,10,0); head 10x10x10 pivot (5,0,5) origin (0,9,0) on the body; arms pivot at the shoulder (top) at
// (+-6.5, 8, 0) on the body; legs pivot at the hip (top) at (+-3, 10, 0) on the root). Differences from hum1: no forearms/shins/crest, so the single arm/leg part carries
// the WHOLE limb (arm grid 3x10x3, leg grid 4x10x4, same top pivots); clips drop the missing parts. Stands 2.9 u tall on the ground, faces +Z, left = +X.
// Swing convention as hum1: arm/leg FORWARD swing = NEGATIVE rx. `tool:'bow'` bakes a longbow into armUR (arm grid 5x10x24): with armUR raised forward (rx ~ -1.4)
// the limbs run vertically with the belly toward the target. UNITS-LIB's compileSoldier(bp,{lite:true}) (14 parts, with forearms) can be passed instead via opts.crew.
import { LG, V, T, C, shade, newModel, addLG, attachLG } from './common.js';

/**
 * @param {{id?:string, skin?:number, tunic?:number|'team', trim?:number, hair?:number, hat?:'none'|'cap'|'helm'|'hood'|'wreath', pants?:number, boots?:number,
 *          teamTunic?:boolean, apron?:boolean, tool?:'none'|'bow'}} o
 */
export function buildHumLite(o = {}) {
  const skin = o.skin ?? C.skin, trim = o.trim ?? C.leather, hair = o.hair ?? 0x4a3426, pants = o.pants ?? 0xd8cfb4, boots = o.boots ?? C.leatherDark;
  const tunicT = o.teamTunic !== false;
  const tunic = (x, y, z) => (tunicT ? T(0xffffff) : V(o.tunic ?? 0xdcd2b8));
  const m = newModel(o.id || 'hum_lite', { rig: 'hum_lite', kind: 'crew' });

  // body 10x9x5, pivot (5,0,2.5)
  const body = new LG(10, 9, 5, 5, 0, 2.5);
  body.box(-5, 0, -2.5, 5, 9, 2.5, tunic);
  body.box(-5, 0, -2.5, 5, 2, 2.5, V(trim));                                // belt band
  body.box(-1, 0, 2.4, 1, 2, 2.6, V(C.gold));                               // buckle
  if (o.apron) body.box(-3.5, 0, 2.5 - 0.1, 3.5, 6, 2.5, V(C.leather), 'set');
  addLG(m, 'body', body, { origin: [0, 10, 0] });

  // head 10x10x10, pivot (5,0,5); face cube x 2..7, y 0..5, z 2..7 -> local -3..3, 0..6, -3..3
  const head = new LG(10, 10, 10, 5, 0, 5);
  head.box(-3, 0, -3, 3, 6, 3, V(skin));
  head.box(-3, 0, -3, 3, 1, 3, V(shade(skin, 0.9)));
  head.set(-1.5, 3.5, 3.1, V(C.eye)); head.set(1.5, 3.5, 3.1, V(C.eye));    // eyes (+Z is the face)
  head.box(-1, 1, 3, 1, 2, 3.4, V(shade(skin, 0.78)));                      // mouth
  head.box(-1, 2, 3, 1, 3, 3.6, V(shade(skin, 1.05)), 'set');               // nose
  const hat = o.hat || 'cap';
  if (hat === 'cap' || hat === 'hood') {
    // tall soft cap (Phrygian style) / hood with a drooping tip, team tinted
    head.box(-3.4, 4.6, -3.4, 3.4, 7.6, 3.4, hat === 'hood' ? V(shade(skin, 0.5)) : T(0xffffff));
    head.box(-2.4, 7.6, -2.6, 2.4, 9, 2.0, hat === 'hood' ? V(shade(skin, 0.5)) : T(0xffffff)); head.box(-1.2, 8.6, 1.6, 1.2, 9.6, 3.4, hat === 'hood' ? V(shade(skin, 0.5)) : T(0xe8e8e8));
    head.box(-3.4, 1.2, -3.4, 3.4, 4.6, -2.6, V(hair));
  } else if (hat === 'helm') {
    head.box(-3.4, 4, -3.4, 3.4, 7, 3.4, V(C.iron)); head.box(-0.7, 7, -3.4, 0.7, 9.4, 3, T(0xffffff)); head.box(-3.4, 1, -3.4, 3.4, 4, -2.6, V(C.iron));   // iron cap with a team crest
    head.box(-3.7, 1, -1, -3.3, 4, 2.5, V(C.iron)); head.box(3.3, 1, -1, 3.7, 4, 2.5, V(C.iron));
  } else if (hat === 'wreath') { head.box(-3.4, 5, -3.4, 3.4, 6.4, 3.4, V(0x5a8a3a)); head.box(-3.4, 6.4, -3.4, 3.4, 7.6, 3.4, V(hair)); head.box(-3.4, 1.5, -3.4, 3.4, 5, -2.6, V(hair)); }
  else { head.box(-3.4, 5, -3.4, 3.4, 7.6, 3.4, V(hair)); head.box(-3.4, 1.5, -3.4, 3.4, 5, -2.6, V(hair)); }
  addLG(m, 'head', head, { parent: 'body', origin: [0, 9, 0] });

  // arms: whole limb in one part, 3x10x3, pivot at the shoulder (top centre); sleeves tinted, forearm skin.
  // tool 'bow': a longbow is baked into the RIGHT arm (armUR): with the arm raised forward (rx ~ -1.4) the limbs run vertically, belly toward the target.
  const arm = (bow) => {
    const a = bow ? new LG(5, 10, 24, 2.5, 10, 12) : new LG(3, 10, 3, 1.5, 10, 1.5);
    a.box(-1.5, -5, -1.5, 1.5, 0, 1.5, tunic);
    a.box(-1.5, -10, -1.5, 1.5, -5, 1.5, V(skin));
    a.box(-1.5, -5.6, -1.5, 1.5, -4.4, 1.5, V(trim));
    if (bow) {
      const wood = V(0x8a5a2e);
      for (let z = -11; z <= 10; z++) { const t = Math.abs(z + 0.5) / 11, y = -9.2 + 3.4 * t * t; a.box(-0.5, y - 0.5, z, 0.5, y + 0.5, z + 1, Math.abs(z + 0.5) < 2 ? V(C.leather) : wood); }
      a.line([0, -5.8, -11], [0, -5.8, 10], V(0xe8e0c8));                       // string (toward the archer)
    }
    return a;
  };
  const armL = arm(false), armR = arm(o.tool === 'bow');
  addLG(m, 'armUL', armL, { parent: 'body', origin: [6.5, 8, 0] });
  addLG(m, 'armUR', armR, { parent: 'body', origin: [-6.5, 8, 0] });

  // legs: whole leg in one part, 4x10x4 (+foot toe forward), pivot at the hip (top centre)
  const leg = () => {
    const l = new LG(4, 10, 6, 2, 10, 2);
    l.box(-2, -7, -2, 2, 0, 2, V(pants));
    l.box(-2, -10, -2, 2, -7, 2, V(boots));
    l.box(-2, -10, 2, 2, -8, 3, V(boots));                                // toe
    return l;
  };
  addLG(m, 'legUL', leg(), { origin: [3, 10, 0] });
  addLG(m, 'legUR', leg(), { origin: [-3, 10, 0] });

  attachLG(m, 'head_top', 'head', head, [0, 7, 0]);
  attachLG(m, 'eyes', 'head', head, [0, 3.5, 3]);
  attachLG(m, 'body_center', 'body', body, [0, 4.5, 0]);
  attachLG(m, 'grip_main', 'armUR', armR, [0, 0.5, 0.5]);
  attachLG(m, 'grip_off', 'armUL', armL, [0, 0.5, 0.5]);
  m.addAttach('feet', 'legUL', [2, 0, 2]);
  return m;
}
