// hum_lite: the 6-part crew / rider-lite humanoid (spec 4.1): body, head, armUL, armUR, legUL, legUR at the canonical hum1 pivots and
// origins. Differences from hum1 (documented in docs/beasts_rigs.md): no forearms/shins, so the single arm/leg part carries the WHOLE limb
// (arm grid 3x10x3, leg grid 4x10x4, same top pivots), clips simply drop the missing parts.
import { LG, V, T, C, shade, newModel, addLG, attachLG } from './common.js';

/**
 * @param {{id?:string, skin?:number, tunic?:number|'team', trim?:number, hair?:number, hat?:'none'|'cap'|'helm'|'hood'|'wreath', pants?:number, boots?:number,
 *          teamTunic?:boolean, apron?:boolean, tool?:'none'|'crank'|'bolt'|'rope', face?:number}} o
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
  if (hat === 'cap' || hat === 'hood') { head.box(-3.4, 4.6, -3.4, 3.4, 6.8, 3.4, hat === 'hood' ? V(shade(skin, 0.5)) : T(0xffffff)); head.box(-3.4, 1.2, -3.4, 3.4, 4.6, -2.6, V(hair)); }
  else if (hat === 'helm') { head.box(-3.4, 4, -3.4, 3.4, 7, 3.4, V(C.iron)); head.box(-0.5, 7, -3, 0.5, 8, 2, V(C.ironDark)); head.box(-3.4, 1, -3.4, 3.4, 4, -2.6, V(C.iron)); }
  else if (hat === 'wreath') { head.box(-3.4, 5, -3.4, 3.4, 6.2, 3.4, V(0x5a8a3a)); head.box(-3.4, 1.5, -3.4, 3.4, 5, -2.6, V(hair)); }
  else { head.box(-3.4, 5, -3.4, 3.4, 6.4, 3.4, V(hair)); head.box(-3.4, 1.5, -3.4, 3.4, 5, -2.6, V(hair)); }
  addLG(m, 'head', head, { parent: 'body', origin: [0, 9, 0] });

  // arms: whole limb in one part, 3x10x3, pivot at the shoulder (top centre); sleeves tinted, forearm skin
  const arm = () => {
    const a = new LG(3, 10, 3, 1.5, 10, 1.5);
    a.box(-1.5, 5, -1.5, 1.5, 10, 1.5, tunic);
    a.box(-1.5, 0, -1.5, 1.5, 5, 1.5, V(skin));
    a.box(-1.5, 4.4, -1.5, 1.5, 5.6, 1.5, V(trim));
    return a;
  };
  const armL = arm(), armR = arm();
  addLG(m, 'armUL', armL, { parent: 'body', origin: [6.5, 8, 0] });
  addLG(m, 'armUR', armR, { parent: 'body', origin: [-6.5, 8, 0] });

  // legs: whole leg in one part, 4x10x4 (+foot toe forward), pivot at the hip (top centre)
  const leg = () => {
    const l = new LG(4, 10, 6, 2, 10, 2);
    l.box(-2, 3, -2, 2, 10, 2, V(pants));
    l.box(-2, 0, -2, 2, 3, 2, V(boots));
    l.box(-2, 0, 2, 2, 2, 3, V(boots));                                   // toe
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
