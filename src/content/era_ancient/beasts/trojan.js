// trojan1: the Trojan horse, a huge wooden horse on a wheeled platform (6.0 u tall, 7.0 u long). One ModelDef, 14 parts:
//   base, wheelFL, wheelFR, wheelBL, wheelBR, body, neck, head, tail, legFL, legFR, legBL, legBR, hatch
// CONVENTIONS (voxels; +Z forward, +X left; positive rx rotates +Y toward +Z):
//   base   : root, pivot on the GROUND at the platform centre (y=0 ground). Deck top y=10, spans x +-12, z -22..+22; team side panels, tow ropes (front), lashings.
//            Roll/pitch the whole prop with the instance root; it never leaves the ground.
//   wheels : parent base, origins (+-14, 6, +-14), pivot at the hub, axle along X, radius 0.6 u (meta.wheelRadius); roll about X (positive rx = rolling forward).
//   body   : parent base, origin (0,24,0), pivot at the BELLY LINE on the centre line (grid y=0 = belly; barrel 18 tall incl. the caparison, 44 long). Team caparison over
//            the back, team shields on both flanks, painted flank door. Rocks/pitches for ram strikes: positive rx pitches the nose DOWN.
//   legs   : parent base (rigid wooden columns that stay planted), origins (+-7, 26, +13 front / -13 hind), pivot at the TOP, hang 18 along -Y to the deck. Not gait-animated
//            (clips may tilt them +-0.05 rad for rocking); team painted bands.
//   neck   : parent body, origin (0,8,15) = neck base; pivot there; rises 18 up and leans 11 forward (baked), carries the team mane crest. Positive rx leans it forward.
//   head   : parent neck, origin (0,17.5,10.6) = the poll; pivot there; the face points forward/down, 13 below / 20 forward of the pivot. Positive rx nods DOWN.
//   tail   : parent body, origin (0,12,-20), pivot at the root, hangs 17 along -Y (rope bundle, team tassel). Swish with rz.
//   hatch  : parent body, origin (0,0,-8) = the REAR hinge edge under the belly; the door lies along +Z (16 long). Positive rx swings the free (front) edge DOWN: ~1.05 rad
//            rests it on the deck as a ramp (the `reveal` clip).
//   Attach: head_top, mouth, feet. meta.clipMap: strike_* -> strike_ram, cast/taunt -> reveal.
import { LG, V, T, C, shade, newModel, addLG, attachLG, wheelLG, finishModel } from './common.js';

const P0 = C.plank, P1 = C.plankDark, SEAM = 0x57381a;
/** wooden board pattern: horizontal boards 3 voxels tall with staggered butt joints, two alternating tones, dark seams */
function boards(x, y, z, old) {
  const row = Math.floor(y / 3);
  if (((Math.floor(y) % 3) + 3) % 3 === 0) return V(SEAM);
  const j = (((Math.floor(z) + row * 5) % 11) + 11) % 11;
  if (j === 0) return V(SEAM);
  return V(((row + (j > 5 ? 1 : 0)) & 1) ? P0 : P1);
}

export function buildTrojan(o = {}) {
  const m = newModel(o.id || 'trojan_horse', { rig: 'trojan1', kind: 'bespoke', species: 'trojan' });
  const gold = V(C.gold), iron = V(C.iron), rope = V(C.rope), ropeD = V(C.ropeDark), woodD = V(C.woodDark);

  // ---- base platform
  const base = new LG(40, 18, 78, 20, 0, 36);
  base.box(-12, 7, -22, 12, 10, 22, (x, y, z) => (((Math.floor(z) >> 2) & 1) ? V(P0) : V(P1)));
  base.box(-12.5, 10, -22.5, -11.5, 11.4, 22.5, woodD); base.box(11.5, 10, -22.5, 12.5, 11.4, 22.5, woodD);       // low side rails
  base.box(-12.5, 10, -22.5, 12.5, 11.4, -21.5, woodD); base.box(-12.5, 10, 21.5, 12.5, 11.4, 22.5, woodD);
  for (const z of [-14, 14]) base.box(-16, 5, z - 1.2, 16, 7, z + 1.2, woodD);                                   // axles
  for (const sx of [-1, 1]) {                                                                                      // team painted side panels with gold trim
    base.box(sx * 12.5 - (sx > 0 ? 0 : 0.8), 7.4, -19, sx * 12.5 + (sx > 0 ? 0.8 : 0), 9.6, 19, T(0xffffff));
    base.box(sx * 12.5 - (sx > 0 ? 0 : 0.8), 9.6, -19, sx * 12.5 + (sx > 0 ? 0.8 : 0), 10.4, 19, gold);
    for (let z = -16; z <= 16; z += 8) base.ell(sx * 13, 8.5, z, 0.8, 1.2, 1.2, gold);                          // bosses
  }
  // tow rope: two ropes from the front beam running forward and sagging to the ground
  for (const sx of [-1, 1]) { base.line([sx * 6, 8.5, 22], [sx * 5, 6.5, 27], rope, 2); base.line([sx * 5, 6.5, 27], [sx * 3, 3, 33], ropeD, 2); base.ell(sx * 3, 2.4, 33, 1.8, 1.4, 1.8, rope); }
  base.box(-7, 7, 21, 7, 9, 23.2, woodD);
  // lashings around the platform
  for (const z of [-18, -6, 6, 18]) base.box(-12.9, 8, z - 0.6, 12.9, 8.6, z + 0.6, ropeD);
  addLG(m, 'base', base, { origin: [0, 0, 0] });
  const wheel = () => wheelLG(6, 3, { spokes: 6, rim: V(C.woodDark), spoke: V(C.wood), hub: iron, hubCap: gold, tire: iron, rimW: 1.8, fullSpokes: true });
  addLG(m, 'wheelFL', wheel(), { parent: 'base', origin: [14, 6, 14] });
  addLG(m, 'wheelFR', wheel(), { parent: 'base', origin: [-14, 6, 14] });
  addLG(m, 'wheelBL', wheel(), { parent: 'base', origin: [14, 6, -14] });
  addLG(m, 'wheelBR', wheel(), { parent: 'base', origin: [-14, 6, -14] });

  // ---- legs: wooden columns with iron shoes
  const LL = 18;
  const leg = () => {
    const l = new LG(10, LL + 1, 10, 5, LL, 5);
    l.box(-3.5, -LL, -3.5, 3.5, 0, 3.5, boards);
    l.box(-3.2, -LL + 2, -3.2, 3.2, -LL + 4, 3.2, V(SEAM));
    l.box(-4, -LL, -4, 4, -LL + 2, 4, iron);                           // iron shoe
    l.box(-4, -9.5, -4, 4, -8.5, 4, ropeD);                            // rope lashing at the knee
    l.box(-3.9, -6.2, -3.9, 3.9, -3.2, 3.9, T(0xffffff)); l.box(-3.9, -13.5, -3.9, 3.9, -11, 3.9, T(0xffffff));   // painted team bands
    return l;
  };
  addLG(m, 'legFL', leg(), { parent: 'base', origin: [7, 26, 13] });
  addLG(m, 'legFR', leg(), { parent: 'base', origin: [-7, 26, 13] });
  addLG(m, 'legBL', leg(), { parent: 'base', origin: [7, 26, -13] });
  addLG(m, 'legBR', leg(), { parent: 'base', origin: [-7, 26, -13] });

  // ---- body: planked barrel with chamfered corners, a team caparison on the back and painted flank doors
  const body = new LG(28, 26, 50, 14, 0, 25);
  body.box(-10, 0, -19, 10, 16, 19, boards);
  body.box(-9, 1, 18, 9, 17, 22, boards);                                // chest
  body.box(-9, 1, -22, 9, 15, -18, boards);                              // rump
  for (const sx of [-1, 1]) for (const z of [-19, 19]) { body.carve(sx * 10 - (sx > 0 ? 1.5 : 0), 0, z - (z > 0 ? 0 : -0), sx * 10 + (sx > 0 ? 0 : 1.5), 1.5, z + (z > 0 ? 3 : -3)); }
  body.carve(-10, 14.5, 21, 10, 17, 23); body.carve(-10, 14.5, -23, 10, 17, -20);
  // caparison over the back, hanging 6 voxels down both sides
  for (let z = -15; z < 16; z++) {
    for (let y = 8; y <= 17; y++) {
      const sy = y - 8;
      for (const sx of [-1, 1]) {
        const hw = y >= 16 ? 10 : 10.9;
        const c = y === 8 ? gold : (y < 10.5 ? T(0xcfcfcf) : (((Math.floor(z) + y) & 3) === 0 ? T(0xe4e4e4) : T(0xffffff)));
        body.box(sx * hw - (sx > 0 ? 0.9 : 0), y, z, sx * hw + (sx > 0 ? 0 : 0.9), y + 1, z + 1, c);
        if (y === 8 && ((z & 1) === 0)) body.box(sx * hw - (sx > 0 ? 0.9 : 0), y - 1.4, z, sx * hw + (sx > 0 ? 0 : 0.9), y, z + 1, gold);
      }
    }
  }
  body.box(-10.9, 16.2, -15, 10.9, 17.4, 16, (x, y, z) => ((Math.floor(z) & 1) ? T(0xe4e4e4) : T(0xffffff)));   // over the top
  for (const sx of [-1, 1]) body.box(sx * 10.45 - 0.45, 17, -15, sx * 10.45 + 0.45, 18, 16, gold);          // gold piping along both edges
  body.box(-10.9, 17, -15, 10.9, 18, -14, gold); body.box(-10.9, 17, 15, 10.9, 18, 16, gold);
  body.box(-0.5, 17, -14, 0.5, 18, 15, gold);
  // painted door outline (rear half) and a big round team shield with gold rim + boss (front half) on each flank
  for (const sx of [-1, 1]) {
    const x0 = sx * 11.2 - (sx > 0 ? 0 : 0.5), x1 = sx * 11.2 + (sx > 0 ? 0.5 : 0);
    body.box(x0, 2, -13, x1, 3, -4), body.box(x0, 10, -13, x1, 11, -4), body.box(x0, 2, -13, x1, 11, -12, V(SEAM)), body.box(x0, 2, -5, x1, 11, -4, V(SEAM));
    body.box(x0, 2, -13, x1, 3, -4, V(SEAM)); body.box(x0, 10, -13, x1, 11, -4, V(SEAM));
    body.ell(sx * 11.6, 6.6, -5.2, 0.6, 0.8, 0.8, gold);
    for (let y = 1; y <= 12; y++) for (let z = 1; z <= 14; z++) {
      const dy = y + 0.5 - 7, dz = z + 0.5 - 7.5, d = Math.hypot(dy, dz);
      if (d > 5.6) continue;
      const c = d > 4.4 ? gold : (d < 1.9 ? V(0xfff0b0) : (((Math.floor(dy + 8) + Math.floor(dz + 8)) & 1) ? T(0xffffff) : T(0xdcdcdc)));
      body.box(x0 - (sx > 0 ? 0 : 0.4), y, z, x1 + (sx > 0 ? 0.4 : 0), y + 1, z + 1, c);
    }
  }
  body.box(-10.5, 5, -19.4, 10.5, 6, -18.4, ropeD);                        // rope girth
  addLG(m, 'body', body, { parent: 'base', origin: [0, 24, 0] });

  // ---- neck (boxy, leaning forward) + team mane crest
  const neck = new LG(14, 26, 28, 7, 4, 8);
  for (let j = 0; j < 18; j++) {
    const z0 = j * 0.62, hw = 5.5 - j * 0.1;
    neck.box(-hw, j, z0 - 4.5, hw, j + 1, z0 + 4.5, boards);
  }
  for (let j = 0; j < 19; j++) { const z0 = j * 0.62; neck.box(-1, j, z0 - 6.2, 1, j + 2.2, z0 - 4.3, (j & 1) ? T(0xffffff) : T(0xdcdcdc)); }
  neck.box(-6, 0, -4.5, 6, 1.2, 4.5, ropeD);                              // rope collar at the base
  addLG(m, 'neck', neck, { parent: 'body', origin: [0, 8, 15] });

  // ---- head
  const head = new LG(14, 30, 30, 7, 16, 6);
  head.box(-4.2, -9, -2.5, 4.2, 2.6, 8, boards);                           // skull
  head.box(-3.4, -12, 7, 3.4, -4, 19, boards);                             // muzzle
  head.box(-3.8, -13.2, 14, 3.8, -11.4, 19.4, V(SEAM));                    // chin block
  head.box(-3.8, -6.2, 9, 3.8, -5.2, 19.4, ropeD);                         // noseband rope
  head.box(-2.8, -7, 19, -1, -5, 20, V(0x1c1410)); head.box(1, -7, 19, 2.8, -5, 20, V(0x1c1410));   // nostrils
  for (const sx of [-1, 1]) { head.box(sx * 4.5 - 0.5, -3.2, 3.6, sx * 4.5 + 0.5, -1.4, 5.8, V(0x15110d)); head.box(sx * 4.5 - 0.4, -3.4, 3.4, sx * 4.5 + 0.4, -1.2, 3.8, gold); }   // eyes in gold rims
  for (const sx of [-1, 1]) { head.box(sx * 3.2 - 1, 2.6, -1.4, sx * 3.2 + 1, 6.4, 0.6, boards); head.box(sx * 3.2 - 0.6, 6.4, -1.0, sx * 3.2 + 0.6, 7.6, 0.2, woodD); }  // ears
  head.box(-1.2, 2.6, 1, 1.2, 4, 4, ropeD);                                // forelock
  head.box(-1.2, 4, 0.5, 1.2, 8.5, 2.4, T(0xffffff)); head.box(-1.2, 7.6, -0.6, 1.2, 10.4, 1, T(0xe0e0e0));   // team plume
  head.box(-1.2, 2.6, 1, 1.2, 4, 2.4, gold);
  addLG(m, 'head', head, { parent: 'neck', origin: [0, 17.5, 10.6] });
  attachLG(m, 'head_top', 'head', head, [0, 8, 2]);
  attachLG(m, 'mouth', 'head', head, [0, -10, 18]);

  // ---- tail: rope bundle with a team tassel
  const tail = new LG(8, 20, 8, 4, 18, 4);
  for (const [x, z] of [[-1.4, 0], [1.4, 0], [0, 1.2], [0, -1.2]]) tail.line([x * 0.5, 0, z * 0.5], [x * 1.6, -13, z * 1.6 - 1.4], (x + z > 0) ? rope : ropeD, 2);
  tail.box(-2.2, -17, -2.2, 2.2, -13, 1.2, T(0xffffff)); tail.box(-2.2, -14, -2.2, 2.2, -13.2, 1.2, gold);
  addLG(m, 'tail', tail, { parent: 'body', origin: [0, 12, -20] });

  // ---- belly hatch (planks, iron hinges, a pull ring), hinged at the rear edge
  const hatch = new LG(14, 5, 20, 7, 2.5, 1);
  hatch.box(-5.5, -1.5, 0, 5.5, 1.5, 16, boards);
  hatch.box(-5.8, -1.7, 0, -4.4, 1.7, 16, woodD); hatch.box(4.4, -1.7, 0, 5.8, 1.7, 16, woodD);
  hatch.box(-5.5, -1.7, 0, 5.5, 1.7, 1.2, iron);                          // hinge strap
  hatch.box(-5.5, -1.7, 14.8, 5.5, 1.7, 16, iron);
  hatch.ell(0, -1.9, 11.5, 1.6, 0.5, 1.6, gold);                          // pull ring
  addLG(m, 'hatch', hatch, { parent: 'body', origin: [0, 0, -8] });

  m.addAttach('feet', 'base', [20, 0, 35]);
  m.meta.wheelRadius = 0.6;
  m.meta.clipMap = { strike_thrust: 'strike_ram', strike_slash_1: 'strike_ram', strike_gore: 'strike_ram', strike_headbutt: 'strike_ram', strike_bite: 'strike_ram', cast: 'reveal', taunt: 'reveal' };
  return finishModel(m);
}
