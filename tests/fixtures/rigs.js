// Reference models for animation review and tests (until the real compileSoldier / beast builders are used).
// hum1_ref follows spec.md §4.1 exactly (part ids, grids, pivots, origins); weapons carry rest = [0,0,0] (blade along +Y).
// Pure JS (VoxelGrid + ModelDef), no THREE: usable from Node tests and from the browser bundle.
import { VoxelGrid, V, T, G, shade } from '../../src/voxel/grid.js';
import { ModelDef } from '../../src/voxel/model.js';
import { composeModels } from '../../src/voxel/compose.js';

const SKIN = 0xe0ac84, BRONZE = 0xc89a4a, LEATHER = 0x7a5233, LINEN = 0xe8e2d0, IRON = 0xb8bcc4, WOOD = 0x8b5a2b, GOLD = 0xe0b84a;

function weaponGrid(kind) {
  const g = new VoxelGrid(9, 48, 9);   // pivot (4,10,4): voxel boundary, so 2-wide shafts at x/z 3..4 are centred on the grip
  switch (kind) {
    case 'spear':
      g.box(3, 0, 3, 2, 42, 2, V(WOOD));                                  // shaft
      g.box(2, 42, 2, 4, 5, 4, V(IRON)).box(3, 47, 3, 2, 1, 2, V(0xdfe3ea)); // head
      g.box(2, 2, 2, 4, 1, 4, V(GOLD));                                   // collar
      break;
    case 'sword':
      g.box(3, 6, 3, 2, 4, 2, V(LEATHER));                                // grip
      g.box(1, 10, 3, 6, 1, 2, V(GOLD));                                  // guard
      g.box(2, 11, 3, 4, 17, 2, V(IRON)).box(3, 28, 3, 2, 3, 2, V(0xdfe3ea)); // blade, tip
      g.box(3, 4, 3, 2, 2, 2, V(GOLD));                                   // pommel
      break;
    case 'axe':
      g.box(3, 0, 3, 2, 32, 2, V(WOOD));
      g.box(1, 22, 3, 7, 9, 2, V(IRON)).box(0, 24, 3, 1, 5, 2, V(0xdfe3ea));
      break;
    case 'club':
      g.box(3, 0, 3, 2, 26, 2, V(WOOD)).box(2, 18, 2, 4, 14, 4, V(shade(WOOD, 0.85)));
      break;
    case 'bow': {
      // limbs curve toward +Z (away from the archer); string on the -Z side. grip at (4,10,4)
      for (let i = -14; i <= 16; i++) { const y = 10 + i, bz = 4 + Math.round(3.2 * (1 - Math.pow(i / 16, 2))); g.set(4, y, bz, V(WOOD)); g.set(3, y, bz, V(shade(WOOD, 0.9))); }
      for (let i = -14; i <= 16; i++) g.set(4, 10 + i, 1, V(0xe8e2c8));   // string
      g.box(3, 8, 5, 2, 4, 3, V(LEATHER));
      break;
    }
    case 'staff':
      g.box(3, 0, 3, 2, 40, 2, V(WOOD)); g.sphere(4, 44, 4, 3, G(0x66ddff));
      break;
    default: break;
  }
  return g;
}

/**
 * hum1 reference soldier. opts: {weapon:'spear'|'sword'|'axe'|'club'|'bow'|'staff'|'none', shield, cape, crest, back:'quiver'|'none', team:boolean}
 */
export function makeHum1Ref(opts = {}) {
  const o = Object.assign({ weapon: 'sword', shield: false, cape: true, crest: true, back: 'none', id: 'hum1_ref' }, opts);
  const m = new ModelDef(o.id, 0.1);
  m.meta.rig = 'hum1'; m.meta.kind = 'humanoid';
  m.meta.weaponStyle = { spear: 'thrust', sword: 'slash', axe: 'overhead', club: 'bash', bow: 'shoot', staff: 'cast', none: 'none' }[o.weapon];
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, T(0xf4f4f4)).box(0, 0, 0, 10, 2, 5, V(LEATHER)).box(3, 2, 4, 4, 5, 1, V(BRONZE)).box(4, 6, 4, 2, 2, 1, V(GOLD));
  body.box(0, 7, 0, 10, 2, 5, V(BRONZE)).box(1, 8, 4, 8, 1, 1, V(GOLD));  // shoulder band / collar
  const head = new VoxelGrid(10, 10, 10).box(2, 0, 2, 6, 6, 6, V(SKIN)).box(1, 4, 1, 8, 4, 8, V(BRONZE)).box(1, 1, 1, 1, 4, 8, V(BRONZE)).box(8, 1, 1, 1, 4, 8, V(BRONZE));
  head.box(3, 2, 7, 1, 1, 1, V(0x1c1c1c)).box(6, 2, 7, 1, 1, 1, V(0x1c1c1c)).box(4, 1, 7, 2, 1, 1, V(0x8a4a3a));
  head.box(4, 4, 7, 2, 4, 2, V(BRONZE));                                  // nasal guard
  const armU = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(SKIN)).box(0, 3, 0, 3, 2, 3, T(0xffffff));
  const armL = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(SKIN)).box(0, 2, 0, 3, 2, 3, V(BRONZE));
  const legU = new VoxelGrid(4, 5, 4).box(0, 0, 0, 4, 5, 4, V(LINEN)).box(0, 0, 0, 4, 1, 4, T(0xffffff));
  const legL = new VoxelGrid(4, 5, 6).box(0, 0, 0, 4, 5, 4, V(BRONZE)).box(0, 0, 0, 4, 2, 6, V(LEATHER));
  m.addPart('body', body, { origin: [0, 10, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  if (o.crest) {
    const crest = new VoxelGrid(10, 8, 12).box(4, 0, 3, 2, 3, 7, V(BRONZE)).box(4, 3, 1, 2, 5, 10, T(0xffffff)).box(4, 3, 0, 2, 3, 1, T(0xffffff));
    m.addPart('crest', crest, { parent: 'head', origin: [0, 6, 0], pivot: [5, 0, 6] });
  }
  m.addPart('armUL', armU, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLL', armL, { parent: 'armUL', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armUR', armU, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLR', armL, { parent: 'armUR', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  if (o.weapon !== 'none') m.addPart('weapon', weaponGrid(o.weapon), { parent: 'armLR', origin: [0, -4, 0.5], pivot: [4, 10, 4], rest: o.weaponRest || [0, 0, 0] });
  if (o.shield) {
    const sh = new VoxelGrid(16, 16, 6);
    sh.ellipsoid(8, 8, 2.5, 7.6, 7.6, 2.4, V(shade(BRONZE, 0.85)));
    sh.ellipsoid(8, 8, 3.5, 6.4, 6.4, 2.4, T(0xffffff));
    sh.ellipsoid(8, 8, 5, 2.4, 2.4, 1, V(GOLD));
    m.addPart('offhand', sh, { parent: 'armLL', origin: [0, -4, 0.5], pivot: [8, 8, 3] });
  }
  m.addPart('legUL', legU, { origin: [3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLL', legL, { parent: 'legUL', origin: [0, -5, 0], pivot: [2, 5, 2] });
  m.addPart('legUR', legU, { origin: [-3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLR', legL, { parent: 'legUR', origin: [0, -5, 0], pivot: [2, 5, 2] });
  if (o.back === 'quiver') {
    const bk = new VoxelGrid(12, 14, 8).box(4, 0, 0, 4, 12, 3, V(LEATHER)).box(4, 12, 1, 1, 2, 1, V(0xdddddd)).box(6, 12, 0, 1, 2, 1, V(0xdddddd));
    m.addPart('back', bk, { parent: 'body', origin: [0, 7, -2.5], pivot: [6, 7, 8] });
  }
  if (o.cape) {
    const cape = new VoxelGrid(10, 14, 2).box(0, 0, 0, 10, 14, 2, T(0xffffff)).box(0, 0, 0, 10, 1, 2, V(GOLD));
    const cape2 = new VoxelGrid(10, 10, 2).box(0, 0, 0, 10, 10, 2, T(0xf0f0f0)).box(0, 0, 0, 10, 1, 2, V(GOLD));
    m.addPart('cape', cape, { parent: 'body', origin: [0, 8, -3], pivot: [5, 14, 1] });
    m.addPart('cape2', cape2, { parent: 'cape', origin: [0, -14, 0], pivot: [5, 10, 1] });
  }
  m.addAttach('grip_main', 'weapon', [4, 10, 4]);
  return m;
}

/** hum_lite crew (6 parts, whole-limb arms/legs) */
export function makeHumLiteRef(id = 'hum_lite_ref') {
  const m = new ModelDef(id, 0.1); m.meta.rig = 'hum_lite'; m.meta.kind = 'crew';
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, T(0xf0f0f0)).box(0, 0, 0, 10, 2, 5, V(LEATHER));
  const head = new VoxelGrid(10, 10, 10).box(2, 0, 2, 6, 6, 6, V(SKIN)).box(1, 4, 1, 8, 3, 8, V(LEATHER)).box(3, 2, 7, 1, 1, 1, V(0x1c1c1c)).box(6, 2, 7, 1, 1, 1, V(0x1c1c1c));
  const arm = new VoxelGrid(3, 10, 3).box(0, 5, 0, 3, 5, 3, T(0xffffff)).box(0, 0, 0, 3, 5, 3, V(SKIN));
  const leg = new VoxelGrid(4, 10, 6).box(0, 3, 0, 4, 7, 4, V(LINEN)).box(0, 0, 0, 4, 3, 4, V(LEATHER)).box(0, 0, 4, 4, 2, 2, V(LEATHER));
  m.addPart('body', body, { origin: [0, 10, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  m.addPart('armUL', arm, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 10, 1.5] });
  m.addPart('armUR', arm, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 10, 1.5] });
  m.addPart('legUL', leg, { origin: [3, 10, 0], pivot: [2, 10, 2] });
  m.addPart('legUR', leg, { origin: [-3, 10, 0], pivot: [2, 10, 2] });
  return m;
}

/** a horse + rider composed model (uses the BEASTS horse when present, else a coarse quad1) */
export async function makeMountedRef(opts = {}) {
  const horse = await makeQuad1Ref(opts.horse || {});
  const rider = makeHum1Ref(Object.assign({ weapon: 'spear', shield: true, id: 'rider' }, opts.rider || {}));
  if (!horse.attach.saddle) throw new Error('mount has no saddle attach');
  return composeModels(opts.id || 'mounted_ref', [{ model: horse }, { model: rider, prefix: 'r_', on: 'saddle', offset: opts.offset || [0, 0, 0] }]);
}

/** quad1 reference: the real BEASTS horse when available, else a coarse block animal with the same part ids */
export async function makeQuad1Ref(o = {}) {
  try {
    const mod = await import('../../src/content/era_ancient/beasts/quad1.js');
    if (mod.buildHorse) return mod.buildHorse(Object.assign({ coat: 'chestnut', blaze: true, socks: ['FL', 'BR'] }, o));
  } catch (e) { /* fall through to the coarse fixture */ }
  return coarseQuad(o);
}

function coarseQuad(o = {}) {
  const LEG = 11, W = 12, L = 34;
  const m = new ModelDef('quad_coarse', 0.1); m.meta.rig = 'quad1'; m.meta.kind = 'beast'; m.meta.species = o.species || 'horse';
  const coat = 0xa0724a;
  const body = new VoxelGrid(W + 2, 15, L).box(1, 0, 0, W, 14, L, V(coat)).box(1, 0, 0, W, 3, L, V(shade(coat, 1.2)));
  const leg = new VoxelGrid(5, LEG + 2, 5).box(1, 0, 1, 3, LEG + 2, 3, V(shade(coat, 0.8))).box(1, 0, 1, 3, 2, 3, V(0x2a2018));
  m.addPart('body', body, { origin: [0, LEG, 0], pivot: [(W + 2) / 2, 0, L / 2] });
  for (const [id, x, z] of [['legFL', 3.5, 10.5], ['legFR', -3.5, 10.5], ['legBL', 3.5, -10.5], ['legBR', -3.5, -10.5]]) m.addPart(id, leg, { parent: 'body', origin: [x, 2, z], pivot: [2.5, LEG + 2, 2.5] });
  const neck = new VoxelGrid(7, 18, 9).box(1, 0, 0, 5, 16, 6, V(coat));
  m.addPart('neck', neck, { parent: 'body', origin: [0, 8, 14], pivot: [3.5, 2, 2] });
  const head = new VoxelGrid(7, 8, 14).box(1, 0, 0, 5, 7, 12, V(shade(coat, 1.1)));
  m.addPart('head', head, { parent: 'neck', origin: [0, 15, 1], pivot: [3.5, 6, 2] });
  const tail = new VoxelGrid(3, 14, 3).box(0, 0, 0, 3, 14, 3, V(0x2a2018));
  m.addPart('tail', tail, { parent: 'body', origin: [0, 12, -16.5], pivot: [1.5, 14, 1.5] });
  const sad = new VoxelGrid(W + 2, 6, 14).box(1, 0, 0, W, 4, 12, T(0xffffff)).box(3, 4, 3, 8, 2, 6, V(LEATHER));
  m.addPart('saddle', sad, { parent: 'body', origin: [0, 12, 0], pivot: [(W + 2) / 2, 0, 7] });
  m.addAttach('saddle', 'saddle', [(W + 2) / 2, 6, 7]);
  return m;
}
