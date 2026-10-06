// quad1: the four-legged rig (horse, pony, camel, mastiff, battle goat, centaur body).
//
// Parts (spec 4.2, ids frozen):  body, neck, head, tail, legFL, legFR, legBL, legBR  (+ static children: saddle, mane, ears, horns, barding)
// Frames (all coordinates in VOXELS, +Z forward, +X = the animal's LEFT):
//   root            : on the ground under the body centre.
//   body            : origin [0, legLen, 0]; pivot at the BELLY LINE, centre line of the barrel (grid y=0 is the belly).
//   neck            : child of body, pivot at the neck base (inside the shoulders). Positive rx nods the head UP... see docs/beasts_rigs.md
//   head            : child of neck, pivot at the poll (top of the neck).
//   tail            : child of body, pivot at the tail root.
//   legXY           : child of body, pivot at the TOP of the leg (inside the barrel), legs hang along -Y.
//   saddle/barding  : child of body in the SAME frame as the body (origin [0,0,0], same pivot) so they track it exactly.
//   mane            : child of neck, same frame as the neck.   ears/horns : child of head, same frame as the head.
// Species builders return plain {parts, attach, meta} descriptions; assembleQuad() turns them into a ModelDef.
import { LG, V, T, G, C, shade, mixRGB, newModel, addLG, attachLG, resolveCoat, shellOf } from './common.js';

const rnd = (n) => Math.round(n);
const ev = (n) => 2 * Math.round(n / 2);          // nearest even integer (symmetric grids)
const od = (n) => 2 * Math.floor(n / 2) + 1;      // nearest odd integer >= n-ish

// ------------------------------------------------------------------ shared leg drawing
/**
 * Draw a leg from a profile. Leg grid local frame: pivot at the top centre; y negative = down; z +forward. Profile = list of
 * [yTop, yBottom, zBack, zFront, halfWidth, color]. Hind legs use the same list with a hock kink baked into the zBack/zFront values.
 */
function drawLeg(lg, prof) {
  for (const [y0, y1, zb, zf, hw, col] of prof) lg.box(-hw, y1, zb, hw, y0, zf, col);
}

// ================================================================== HORSE (also pony / warhorse)
/** Horse species. k scales every dimension (1 = riding horse: back 2.2 u, body 3.2 u). */
function horseSpecies(o) {
  const k = o.k || 1, col = resolveCoat(o.coat), E = (n) => ev(n * k);
  const legLen = rnd(11 * k);
  const out = { legLen, parts: {}, attach: {}, kind: 'horse' };
  const main = V(col.main), light = V(col.light), dark = V(col.dark), legc = V(col.leg), hoof = V(col.hoof), maneC = V(col.mane), eye = V(C.eye);
  const heavy = !!o.barded;

  // ---- body
  const bw = 12, bl = E(36);
  const body = new LG(bw + 2, rnd(15 * k) + 2, bl, (bw + 2) / 2, 0, bl / 2);
  const Z = (z) => z * k, Y = (y) => y * k;
  body.ell(0, Y(5.8), Z(9.8), 6, Y(6.2), Z(7.6), main);
  body.ell(0, Y(5.5), 0, 5.9, Y(5.5), Z(11.2), main);
  body.ell(0, Y(6.3), Z(-9.6), 5.8, Y(6.3), Z(7.6), main);
  body.ell(0, Y(10.6), Z(8.6), 2.4, Y(3.2), Z(4.2), main);            // withers
  body.ell(0, Y(11.2), Z(-9), 3.2, Y(2), Z(5), main);                 // croup crown
  body.carve(-9, -8, -30, 9, 0, 30);                                  // flat belly line
  body.paint((x, y, z) => {
    if (y < Y(2.4)) return light;                                    // belly
    if (z > Z(13) && y < Y(8)) return o.chestLight ? light : main;
    if (y > Y(9.6) && Math.abs(z) < Z(14)) return mixRGB(col.main, col.dark, 0.35) | 0x01000000 ? V(mixRGB(col.main, col.dark, 0.3)) : main;
    return undefined;
  });
  out.parts.body = { lg: body, origin: [0, legLen, 0] };

  // ---- legs (pivot top centre; top sits 2 voxels inside the barrel)
  const top = 2, LL = legLen + top;
  const mkLeg = (hind, sock) => {
    const lg = new LG(5, LL + 1, 8, 2.5, LL, 4.5);
    const w = sock ? V(0xf1efe8) : legc;
    if (!hind) {
      drawLeg(lg, [
        [0, -5.5, -2.5, 2.5, 1.5, legc],            // shoulder / forearm
        [-5.5, -8.5, -1.5, 1.5, 1.5, w],            // cannon
        [-8.5, -9.5, -2, 2, 1.5, w],                // fetlock
        [-9.5 * 1, -(LL), -2.5, 3, 1.5, hoof],      // hoof
      ].map((r, i, a) => i === 3 ? [r[0], -LL, r[2], r[3], r[4], r[5]] : r));
    } else {
      drawLeg(lg, [
        [0, -4, -3.5, 2.5, 2.5, legc],              // thigh (5 wide)
        [-4, -6.5, -4, 0.5, 1.5, legc],             // gaskin sloping back to the hock
        [-6.5, -9, -3, 0, 1.5, w],                  // hock to cannon
        [-9, -10, -2.5, 1, 1.5, w],                 // fetlock
        [-10, -LL, -2.5, 2.5, 1.5, hoof],           // hoof
      ]);
    }
    return lg;
  };
  const fz = Z(10.5), hz = Z(-10.5), lx = 3.5;
  const socks = o.socks || [];
  out.parts.legFL = { lg: mkLeg(false, socks.includes('FL')), origin: [lx, top, fz], parent: 'body' };
  out.parts.legFR = { lg: mkLeg(false, socks.includes('FR')), origin: [-lx, top, fz], parent: 'body' };
  out.parts.legBL = { lg: mkLeg(true, socks.includes('BL')), origin: [lx, top, hz], parent: 'body' };
  out.parts.legBR = { lg: mkLeg(true, socks.includes('BR')), origin: [-lx, top, hz], parent: 'body' };

  // ---- neck (pivot at base, inside the withers)
  const nb = [0, Y(8.2), Z(10.4)];
  const nl = Z(7.2), nh = Y(11.6);
  const neck = new LG(10, rnd(nh) + 12, rnd(nl) + 14, 5, 6, 6);
  neck.tube([0, 0, 0], [0, nh, nl], 4.4 * k, 2.7 * k, main, 0.78);
  neck.paint((x, y, z) => (y < 2 ? undefined : undefined));
  out.parts.neck = { lg: neck, origin: nb, parent: 'body' };

  // ---- head (pivot at the poll)
  const hd = new LG(8, 18, 20, 4, 11, 4);
  hd.ell(0, -1.4, 2.4, 3, 3.5, 3.9, main);                                   // skull
  hd.tube([0, -2, 4], [0, -7.2, 10.2], 2.9, 2.0, main, 1.0);                  // face
  hd.ell(0, -7.3, 10.6, 2.2, 1.9, 2.4, main);                                // muzzle
  hd.ell(0, -5.2, 5.2, 2.7, 2.2, 3.4, main);                                 // jaw
  if (col.nose !== col.main) hd.paint((x, y, z) => (z > 9.4 && y < -6 ? V(col.nose) : undefined));
  hd.set(-1.2, -7.2, 12.7, V(0x1a1216)); hd.set(0.5, -7.2, 12.7, V(0x1a1216));
  hd.set(-3, -0.4, 3.2, eye); hd.set(2.5, -0.4, 3.2, eye);                    // eyes
  hd.box(-0.5, -8.6, 9.8, 0.5, -8.4, 12.2, V(shade(col.main, 0.55)));
  if (o.blaze) hd.box(-0.5, -6.6, 3.9, 0.5, -0.4, 5.2, V(0xf4f1ea), 'set');
  out.parts.head = { lg: hd, origin: [0, nh, nl - 0.5], parent: 'neck' };
  out.attach.head_top = { part: 'head', at: [0, 3.2, 2.5] };
  out.attach.mouth = { part: 'head', at: [0, -8, 11] };

  // ---- ears + forelock (static child of head)
  const ears = new LG(8, 10, 8, 4, 0, 4);
  ears.box(-2.5, 0, 0, -1.5, 2, 1, main); ears.box(-2.5, 2, 0.5, -1.5, 3.5, 1.5, main);
  ears.box(1.5, 0, 0, 2.5, 2, 1, main); ears.box(1.5, 2, 0.5, 2.5, 3.5, 1.5, main);
  ears.box(-1, 0, 1.5, 1, 1.5, 3.5, maneC);                                    // forelock
  out.parts.ears = { lg: ears, origin: [0, 2.2, 1.6], parent: 'head' };

  // ---- mane (static child of neck): follows the crest line
  const mane = new LG(6, rnd(nh) + 12, rnd(nl) + 14, 3, 6, 6);
  const ax = [0, nh, nl], al = Math.hypot(ax[1], ax[2]), dors = [0, ax[2] / al, -ax[1] / al];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, r = (4.4 + (2.7 - 4.4) * t) * k;
    const c = [0, ax[1] * t + dors[1] * (r - 0.4), ax[2] * t + dors[2] * (r - 0.4)];
    const len = 2.6 - t * 0.8;
    mane.box(-1, c[1] - len * 0.5, c[2] - 1.6, 1, c[1] + 1.2, c[2] + 0.4, maneC);
  }
  out.parts.mane = { lg: mane, origin: [0, 0, 0], parent: 'neck' };

  // ---- tail (pivot at the root)
  const tail = new LG(6, 17, 9, 3, 15.5, 4);
  tail.tube([0, 0, 0], [0, -5, -2], 2.0, 2.2, maneC, 1);
  tail.tube([0, -5, -2], [0, -13.5, -3.2], 2.2, 1.2, maneC, 1);
  out.parts.tail = { lg: tail, origin: [0, Y(10.2), Z(-16.2)], parent: 'body' };

  // ---- saddle cloth + seat (shares the body frame)
  const sad = shellOf(body, (x, y, z) => Math.abs(z - Z(0.5)) <= 6.2 && y > 2.8 + (Math.abs(z - Z(0.5)) > 5 ? 2 : 0), 1,
    (x, y, z) => (y < 3.6 ? V(C.gold) : T(0xffffff)));
  // leather seat on top of the cloth
  const seatY = Y(11.6);
  sad.box(-3.4, seatY, Z(0.5) - 4.6, 3.4, seatY + 1.6, Z(0.5) + 3.6, V(C.leather), 'empty');
  sad.box(-3.4, seatY + 1.6, Z(0.5) - 4.6, 3.4, seatY + 3.0, Z(0.5) - 3.6, V(C.leatherDark), 'empty');     // cantle
  sad.box(-1.2, seatY + 1.6, Z(0.5) + 2.6, 1.2, seatY + 2.6, Z(0.5) + 3.6, V(C.leatherDark), 'empty');     // pommel
  out.parts.saddle = { lg: sad, origin: [0, 0, 0], parent: 'body' };
  out.attach.saddle = { part: 'saddle', at: [0, seatY + 2.6, Z(0.5) - 0.5] };   // hip point of a seated rider (local coords of the saddle part)
  out.metaK = { k, legLen, backY: legLen + 11 * k, barrel: 11 * k };
  return out;
}

// ------------------------------------------------------------------ assembler
/** Turn a species description into a ModelDef (parts in a parent-first order). */
export function assembleQuad(id, sp, meta = {}, opts = {}) {
  const m = newModel(id, Object.assign({ rig: 'quad1', kind: 'beast' }, meta));
  const order = ['body', 'legFL', 'legFR', 'legBL', 'legBR', 'neck', 'head', 'tail', 'saddle', 'barding', 'mane', 'ears', 'horns'];
  const skip = opts.skip || [];
  for (const pid of order) {
    const p = sp.parts[pid]; if (!p || skip.includes(pid)) continue;
    addLG(m, pid, p.lg, { parent: p.parent || null, origin: p.origin, rest: p.rest });
  }
  for (const [name, a] of Object.entries(sp.attach)) {
    if (!m.byId[a.part]) continue;
    attachLG(m, name, a.part, sp.parts[a.part].lg, a.at);
  }
  m.attach.feet = { part: 'body', at: [m.byId.body.pivot[0], m.byId.body.pivot[1] - sp.legLen, m.byId.body.pivot[2]] };
  m.meta.legLen = sp.legLen * m.voxelSize;
  return m;
}

export function buildHorse(o = {}) {
  const sp = horseSpecies(o);
  return assembleQuad(o.id || 'horse', sp, { species: 'horse' }, o);
}
