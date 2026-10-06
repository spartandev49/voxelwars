// chicken1: the sacred chicken. Parts (spec 4.2): body, head, wingL, wingR, legL, legR, tail. 1.7 u tall with the halo, white with a red comb, orange beak/legs.
// CONVENTIONS (voxels; +Z forward, +X left; positive rx rotates +Y toward +Z):
//   body   : root, origin [0,3,0], pivot at the belly line on the centre line (grid y=0 is the belly). Pecking/bobbing: pitch with rx (positive = beak down).
//   head   : parent body, origin (0, 3.4, 2.7) = the neck base; pivot there. Neck + head + beak + comb + wattle + team scarf + the tilted golden halo (22 G glow voxels) in one part.
//            Positive rx pecks DOWN; ry looks around.
//   wingL/R: parent body, origins (+-3.1, 3.8, 0.9), pivot at the shoulder (top), the folded wing hangs 5 down and 7 back (tips team tinted). Flap: rz (wingL positive rz
//            swings the tip toward +X = outward); the `flap` clip lifts both wings 1.0-1.4 rad.
//   legL/R : parent body, origins (+-1.7, 1.3, 0.2), pivot at the hip (top), hang 4 voxels along -Y with the toes forward. Forward swing = negative rx.
//   tail   : parent body, origin (0, 3, -4), pivot at the root, fans up and back (plumes tip tinted). Wag with rx.
//   Attach: head_top, mouth, feet. meta.gait: hip 0.4 u, walk amp 0.7 stride 0.66, run amp 1.0 stride 1.4.
import { LG, V, T, G, C, shade, newModel, addLG, attachLG, finishModel } from './common.js';

export function buildChicken(o = {}) {
  const m = newModel(o.id || 'sacred_chicken', { rig: 'chicken1', kind: 'beast', species: 'chicken' });
  const white = V(0xf6f4ee), light = V(0xffffff), shadeW = V(0xdedad0), grey = V(0xcfcbc0), orange = V(0xf0a020), red = V(0xd22a1e), eye = V(0x15151a);
  const legLen = 3;

  const body = new LG(8, 7, 11, 4, 0, 5.5);
  body.ell(0, 2.2, -0.3, 2.9, 2.2, 3.6, white);
  body.ell(0, 2.6, 2.4, 2.6, 2.3, 2.2, white);                 // breast
  body.ell(0, 2.6, -3.4, 2.2, 2.0, 1.8, white);                // rump
  body.carve(-9, -4, -9, 9, 0, 9);
  body.paint((x, y, z) => (y < 0.8 ? light : (y > 3.9 ? grey : undefined)));
  addLG(m, 'body', body, { origin: [0, legLen, 0] });

  // legs: pivot at the hip; yellow shin, three toes
  const leg = () => {
    const l = new LG(3, 7, 6, 1.5, 6, 2);
    l.box(-1, -0.5, -0.5, 1, 1, 1.5, white);
    l.box(-0.5, -2.6, -0.5, 0.5, -0.5, 0.5, orange);
    l.box(-1.5, -3.6, -1.2, 1.5, -2.6, 2.4, orange);
    l.box(-0.5, -3.6, 2.4, 0.5, -3.1, 3.1, orange);
    return l;
  };
  addLG(m, 'legL', leg(), { parent: 'body', origin: [1.7, 1.3, 0.2] });
  addLG(m, 'legR', leg(), { parent: 'body', origin: [-1.7, 1.3, 0.2] });

  // head: neck base pivot
  const hd = new LG(10, 18, 12, 5, 0, 4);
  hd.tube([0, 0, 0], [0, 2.8, 0.9], 1.7, 1.4, white, 1);
  hd.ell(0, 4.2, 1.5, 1.9, 1.9, 2.0, white);                    // head
  hd.box(-0.5, 3.6, 3.4, 0.5, 4.7, 4.4, orange);               // beak
  hd.box(-0.5, 3.4, 3.4, 0.5, 3.6, 4.0, V(0xd88a18));
  hd.set(-1.7, 4.8, 2.1, eye); hd.set(1.2, 4.8, 2.1, eye);     // eyes
  hd.box(-0.5, 5.9, 0.3, 0.5, 7.0, 2.7, red); hd.box(-0.5, 7.0, 0.8, 0.5, 7.7, 1.8, red);          // comb
  hd.box(-0.5, 2.5, 3.0, 0.5, 3.6, 3.8, red);                  // wattle
  hd.paint((x, y, z) => (y >= 0 && y < 1.6 ? T(0xffffff) : undefined));                             // team scarf at the neck base
  hd.box(-2.2, 0.0, -1.6, 2.2, 1.4, 2.6, T(0xffffff), 'set');
  // halo: a tiny golden ring of glow voxels floating above the head
  for (let a = 0; a < 22; a++) { const th = (a / 22) * Math.PI * 2, dz = Math.sin(th) * 3.0; hd.set(Math.cos(th) * 3.0, 9.6 - dz * 0.45, 1.3 + dz, G(0xffcf3a)); }   // tilted golden halo ring
  addLG(m, 'head', hd, { parent: 'body', origin: [0, 3.4, 2.7] });

  // wings (folded), tips tinted
  const wing = (sx) => {
    const w = new LG(3, 7, 10, 1.5, 6, 7);
    w.ell(0, -2.4, -2.8, 0.9, 2.8, 3.6, white);
    w.paint((x, y, z) => (z < -4.4 || y < -3.6 ? T(0xffffff) : undefined));
    return w;
  };
  addLG(m, 'wingL', wing(1), { parent: 'body', origin: [3.1, 3.8, 0.9] });
  addLG(m, 'wingR', wing(-1), { parent: 'body', origin: [-3.1, 3.8, 0.9] });

  // tail: an upright fan of white plumes with team-tinted tips
  const tail = new LG(7, 11, 8, 3.5, 0, 6);
  for (let i = 0; i < 6; i++) {
    const y = 0.6 + i * 0.9, z = -0.4 - i * 0.75, w = 1.7 - i * 0.16;
    tail.box(-w, y - 0.5, z - 0.9, w, y + 0.55, z + 0.9, i >= 3 ? T(0xffffff) : (i & 1 ? white : shadeW));
  }
  tail.box(-0.5, 5.2, -5.2, 0.5, 6.4, -4.2, T(0xffffff));
  addLG(m, 'tail', tail, { parent: 'body', origin: [0, 3.0, -4.0] });

  attachLG(m, 'head_top', 'head', hd, [0, 8, 1.4]);
  attachLG(m, 'mouth', 'head', hd, [0, 4, 4.4]);
  m.addAttach('feet', 'body', [4, -legLen, 5.5]);
  m.meta.legLen = legLen * 0.1;
  m.meta.gait = { hipH: 0.4, walk: { amp: 0.7, duty: 0.6, stride: 0.66 }, run: { amp: 1.0, duty: 0.5, stride: 1.4 }, pace: false };
  return finishModel(m);
}
