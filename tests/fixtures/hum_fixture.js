// Reference hum1 ModelDef (canonical dims from spec §4.1) for tests/visual before the real parts library exists.
import { VoxelGrid, V, T } from '../../src/voxel/grid.js';
import { ModelDef } from '../../src/voxel/model.js';
export function humFixture(opts = {}) {
  const skin = opts.skin ?? 0xe0ac84, cloth = opts.cloth ?? 0xe8e2d0, metal = opts.metal ?? 0xb87333;
  const m = new ModelDef('hum_fixture', 0.1); m.meta.rig = 'hum1';
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, T(0xf4f4f4)).box(0, 0, 0, 10, 2, 5, V(0x7a5a3a)).box(2, 2, 4, 6, 4, 1, V(metal)).box(1, 7, 0, 8, 2, 5, V(cloth));
  const head = new VoxelGrid(10, 10, 10).box(2, 0, 2, 6, 6, 6, V(skin)).box(2, 4, 2, 6, 2, 6, V(metal)).box(4, 6, 4, 2, 3, 2, T(0xffffff)).box(3, 2, 7, 1, 1, 1, V(0x222222)).box(6, 2, 7, 1, 1, 1, V(0x222222));
  const armU = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(skin)), armL = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(skin)).box(0, 3, 0, 3, 2, 3, V(metal));
  const legU = new VoxelGrid(4, 5, 4).box(0, 0, 0, 4, 5, 4, V(cloth)), legL = new VoxelGrid(4, 5, 6).box(0, 0, 0, 4, 5, 4, V(skin)).box(0, 0, 0, 4, 2, 6, V(0x6b4a2a));
  const spear = new VoxelGrid(5, 40, 5).box(2, 0, 2, 1, 36, 1, V(0x8b5a2b)).box(1, 36, 1, 3, 4, 3, V(0xcfd3d8));
  const shield = new VoxelGrid(16, 16, 4).ellipsoid(8, 8, 1, 8, 8, 1.3, T(0xffffff)).ellipsoid(8, 8, 2, 3, 3, 0.8, V(0xe0b84a));
  m.addPart('body', body, { origin: [0, 10, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  m.addPart('armUL', armU, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLL', armL, { parent: 'armUL', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armUR', armU, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLR', armL, { parent: 'armUR', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('weapon', spear, { parent: 'armLR', origin: [0, -4, 0.5], pivot: [2.5, 8, 2.5], rest: [-1.2, 0, 0] });
  m.addPart('offhand', shield, { parent: 'armLL', origin: [0, -4, 1.5], pivot: [8, 8, 1.5], rest: [0, 0, 0] });
  m.addPart('legUL', legU, { origin: [3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLL', legL, { parent: 'legUL', origin: [0, -5, 0], pivot: [2, 5, 2] });
  m.addPart('legUR', legU, { origin: [-3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLR', legL, { parent: 'legUR', origin: [0, -5, 0], pivot: [2, 5, 2] });
  return m;
}
