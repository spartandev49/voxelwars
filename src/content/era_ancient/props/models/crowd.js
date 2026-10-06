// Colosseum spectators. buildSpectator(variant) is a hum_lite ModelDef (spec 4.1): the 6 parts body, head, armUL, armUR, legUL, legUR with the
// hum1 part ids, grid sizes, pivots and parent links, so ANIM's hum1 clips (cheer, gasp, idle ...) pose them directly and silently drop the
// forearm/shin tracks. The only deviation: the model is placed so the feet touch the ground (body origin y = 5 voxels instead of hum1's 10,
// because hum_lite has no shins), so a spectator is 24 voxels = 2.4 u tall. 4 colour variants (red / blue / gold / green shirts).
// 'crowd' as a static prop (editor icon, codex, crowd-off tiers) is the same figure merged at rest pose.

import { VoxelGrid, V } from '../../../../voxel/grid.js';
import { ModelDef } from '../../../../voxel/model.js';
import { Pen, makeBuilder, shade } from './kit.js';

export const SPECTATOR_VARIANTS = 4;
export const SPECTATOR_PARTS = ['body', 'head', 'armUL', 'armUR', 'legUL', 'legUR'];
const SHIRT = [0xd9453a, 0x3b7be0, 0xf0c030, 0x4fb050];
const SKIN = [0xe8b890, 0xc88a60, 0xf0c8a0, 0x9a6a44];
const HAIR = [0x3a2a1a, 0x1a1a1a, 0xe0b040, 0x8a8a8a];
const TRIM = [0xf2efe6, 0xf2efe6, 0x3b6cf0, 0xffc93c];
const LEATHER = 0x7a5a3a, EYE = 0x222222;

function parts(variant) {
  const v = ((variant | 0) % SPECTATOR_VARIANTS + SPECTATOR_VARIANTS) % SPECTATOR_VARIANTS;
  const shirt = SHIRT[v], skin = SKIN[(v + 1) % 4], hair = HAIR[(v * 3 + 1) % 4], trim = TRIM[v];
  // body 10x9x5: tunic, belt and a trim stripe down the front
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, V(shirt));
  body.box(0, 2, 0, 10, 1, 5, V(LEATHER)).box(4, 3, 4, 2, 6, 1, V(trim)).box(0, 8, 0, 10, 1, 5, V(shade(shirt, 0.88)));
  body.box(4, 2, 4, 2, 1, 1, V(0xffc93c));
  // head 10x10x10: face cube x2..7, y0..5, z2..7 faces +Z (spec), hair on top and sides, a hat or wreath per variant
  const head = new VoxelGrid(10, 10, 10);
  head.box(2, 0, 2, 6, 6, 6, V(skin));
  head.box(3, 3, 8, 1, 1, 1, V(EYE)).box(6, 3, 8, 1, 1, 1, V(EYE)).box(4, 1, 8, 2, 1, 1, V(shade(skin, 0.7)));
  head.box(2, 5, 2, 6, 1, 6, V(hair)).box(2, 3, 2, 6, 3, 1, V(hair)).box(1, 3, 3, 1, 3, 4, V(hair)).box(8, 3, 3, 1, 3, 4, V(hair));
  head.box(5, 2, 8, 1, 1, 1, V(shade(skin, 0.88)));      // nose
  if (v === 0) {                                          // floppy red cap
    head.box(1, 6, 1, 8, 2, 8, V(0xd9453a)).box(2, 8, 2, 6, 1, 6, V(0xd9453a)).box(7, 8, 6, 2, 1, 2, V(0xf2efe6));
  } else if (v === 1) {                                   // laurel wreath
    head.box(1, 5, 1, 8, 1, 8, V(0x4fae3a)).box(1, 6, 1, 1, 1, 1, V(0x7bd04a)).box(8, 6, 1, 1, 1, 1, V(0x7bd04a)).box(1, 6, 8, 1, 1, 1, V(0x7bd04a)).box(8, 6, 8, 1, 1, 1, V(0x7bd04a));
  } else if (v === 2) {                                   // straw hat
    head.box(0, 6, 0, 10, 1, 10, V(0xe8c04a)).box(2, 7, 2, 6, 2, 6, V(0xf2d268)).box(2, 7, 2, 6, 1, 6, V(0xd9a93a));
  } else {                                                // big bushy hair
    head.box(1, 6, 1, 8, 2, 8, V(hair)).box(2, 8, 2, 6, 1, 6, V(hair));
  }
  // hum_lite limbs keep the hum1 UPPER-limb grids: arms 3x5x3 (hang from the shoulder, hand at the bottom), legs 4x5x4
  const arm = () => new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(shirt)).box(0, 0, 0, 3, 2, 3, V(skin)).box(0, 2, 0, 3, 1, 3, V(shade(shirt, 0.82)));
  const leg = () => new VoxelGrid(4, 5, 4).box(0, 0, 0, 4, 5, 4, V(skin)).box(0, 0, 0, 4, 2, 4, V(LEATHER)).box(0, 4, 0, 4, 1, 4, V(shirt));
  return { body, head, armUL: arm(), armUR: arm(), legUL: leg(), legUR: leg() };
}

/** hum_lite spectator ModelDef (parts body, head, armUL, armUR, legUL, legUR; hum1 grids/pivots), voxelSize 0.1, feet on the ground. */
export function buildSpectator(variant = 0) {
  const v = ((variant | 0) % SPECTATOR_VARIANTS + SPECTATOR_VARIANTS) % SPECTATOR_VARIANTS, p = parts(v);
  const m = new ModelDef('spectator_v' + v, 0.1);
  m.addPart('body', p.body, { origin: [0, 5, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', p.head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  m.addPart('armUL', p.armUL, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armUR', p.armUR, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('legUL', p.legUL, { origin: [3, 5, 0], pivot: [2, 5, 2] });
  m.addPart('legUR', p.legUR, { origin: [-3, 5, 0], pivot: [2, 5, 2] });
  m.addAttach('head_top', 'head', [5, 10, 5]); m.addAttach('eyes', 'head', [5, 3, 8]); m.addAttach('body_center', 'body', [5, 4, 2.5]); m.addAttach('feet', 'legUL', [2, 0, 2]);
  m.meta = { rig: 'hum1', kind: 'spectator', lite: true, variant: v, height: 2.4 };
  return m;
}

const crowd = {
  variants: SPECTATOR_VARIANTS, indestructible: true, pal: [0xd9453a, 0x3b7be0, 0xf0c030, 0x4fb050, 0xe8b890, 0xc88a60],
  build(v) {
    const p = parts(v), pen = new Pen(21, 24, 13, 0), ox = 10, oz = 6;
    pen.stamp(p.legUL, ox + 1, 0, oz - 2).stamp(p.legUR, ox - 5, 0, oz - 2);       // legs: grid 4x5x4, pivot (2,5,2) at (+3 / -3, 5, 0)
    pen.stamp(p.body, ox - 5, 5, oz - 2);                                              // body pivot (5,0,2.5) at y 5
    pen.stamp(p.armUL, ox + 5, 9, oz - 1).stamp(p.armUR, ox - 8, 9, oz - 1);          // arms hang from y 14
    pen.stamp(p.head, ox - 5, 14, oz - 5);
    return pen;
  },
};
export const MODELS = { crowd };
export const BUILDERS = { crowd: makeBuilder('crowd', crowd) };
