// Colosseum spectators. buildSpectator(variant) is a hum_lite-style ModelDef (6 parts with the hum1 ids: body, head, armUL, armUR,
// legUL, legUR) that the crowd renderer poses with cheer / gasp motions; ANIM can drive the same part ids with real clips.
// Deviations from hum1 (documented for ANIM): arms are 8 voxels long and legs 8 (hum1: 5 + 5 with forearms/shins), pivots stay at the
// top of each limb, body origin y = 8, so a spectator is 2.6 u tall (catalog crowd.h = 2) and the feet touch the ground.
// 'crowd' as a static prop (editor icon, codex, crowd-off tiers) is the same figure merged at rest pose.

import { VoxelGrid, V } from '../../../../voxel/grid.js';
import { ModelDef } from '../../../../voxel/model.js';
import { Pen, makeBuilder, shade } from './kit.js';

export const SPECTATOR_VARIANTS = 4;
const SHIRT = [0xd9453a, 0x3b7be0, 0xf0c030, 0x4fb050];
const SKIN = [0xe8b890, 0xc88a60, 0xf0c8a0, 0x9a6a44];
const HAIR = [0x3a2a1a, 0x1a1a1a, 0xe0b040, 0x8a8a8a];
const TRIM = [0xf2efe6, 0xf2efe6, 0x3b6cf0, 0xffc93c];
const LEATHER = 0x7a5a3a, EYE = 0x222222;

function parts(variant) {
  const v = ((variant | 0) % SPECTATOR_VARIANTS + SPECTATOR_VARIANTS) % SPECTATOR_VARIANTS;
  const shirt = SHIRT[v], skin = SKIN[(v + 1) % 4], hair = HAIR[(v * 3 + 1) % 4], trim = TRIM[v];
  // body 10x9x5: tunic with a belt and a trim stripe down the front
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, V(shirt));
  body.box(0, 3, 0, 10, 1, 5, V(LEATHER)).box(4, 4, 4, 2, 5, 1, V(trim)).box(0, 8, 0, 10, 1, 5, V(shade(shirt, 0.88)));
  body.box(4, 3, 4, 2, 1, 1, V(0xffc93c));
  // head 10x9x10: face cube x2..7 (faces +Z), hair, hat per variant
  const head = new VoxelGrid(10, 9, 10);
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
  } else {                                                // big bushy hair + sunglasses-less grin
    head.box(1, 6, 1, 8, 2, 8, V(hair)).box(2, 8, 2, 6, 1, 6, V(hair));
  }
  const arm = (side) => new VoxelGrid(3, 8, 3).box(0, 0, 0, 3, 8, 3, V(skin)).box(0, 4, 0, 3, 4, 3, V(shirt)).box(0, 3, 0, 3, 1, 3, V(shade(shirt, 0.8)));
  const leg = () => new VoxelGrid(4, 8, 4).box(0, 0, 0, 4, 8, 4, V(skin)).box(0, 0, 0, 4, 2, 4, V(LEATHER)).box(0, 6, 0, 4, 2, 4, V(shirt));
  return { body, head, armUL: arm(1), armUR: arm(-1), legUL: leg(), legUR: leg() };
}

/** hum_lite-style spectator ModelDef: parts body, head, armUL, armUR, legUL, legUR (hum1 ids), voxelSize 0.1, feet on the ground. */
export function buildSpectator(variant = 0) {
  const v = ((variant | 0) % SPECTATOR_VARIANTS + SPECTATOR_VARIANTS) % SPECTATOR_VARIANTS, p = parts(v);
  const m = new ModelDef('spectator_v' + v, 0.1);
  m.addPart('body', p.body, { origin: [0, 8, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', p.head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  m.addPart('armUL', p.armUL, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 8, 1.5] });
  m.addPart('armUR', p.armUR, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 8, 1.5] });
  m.addPart('legUL', p.legUL, { origin: [3, 8, 0], pivot: [2, 8, 2] });
  m.addPart('legUR', p.legUR, { origin: [-3, 8, 0], pivot: [2, 8, 2] });
  m.addAttach('head_top', 'head', [5, 9, 5]); m.addAttach('eyes', 'head', [5, 3, 8]); m.addAttach('body_center', 'body', [5, 4, 2.5]); m.addAttach('feet', 'legUL', [2, 0, 2]);
  m.meta = { rig: 'hum1', kind: 'spectator', lite: true, variant: v, height: 2.6 };
  return m;
}

const crowd = {
  variants: SPECTATOR_VARIANTS, indestructible: true, pal: [0xd9453a, 0x3b7be0, 0xf0c030, 0x4fb050, 0xe8b890, 0xc88a60],
  build(v) {
    const p = parts(v), pen = new Pen(21, 26, 13, 0), ox = 10, oz = 6;
    pen.stamp(p.legUL, ox + 1, 0, oz - 2).stamp(p.legUR, ox - 5, 0, oz - 2);        // legs: pivot (2,8,2) at (+3 / -3, 8, 0)
    pen.stamp(p.body, ox - 5, 8, oz - 2);                                              // body pivot (5,0,2.5)
    pen.stamp(p.armUL, ox + 5, 9, oz - 1).stamp(p.armUR, ox - 8, 9, oz - 1);          // arms hang from y 17
    pen.stamp(p.head, ox - 5, 17, oz - 5);
    return pen;
  },
};
export const MODELS = { crowd };
export const BUILDERS = { crowd: makeBuilder('crowd', crowd) };
