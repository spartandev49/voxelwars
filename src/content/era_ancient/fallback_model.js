// Fallback ModelDefs used when a unit has no authored model yet (or an import fails). Never crashes the game; always readable
// (team-tinted, faction-coloured). Authored models from UNITS/BEASTS replace these automatically.
import { VoxelGrid, V, T, shade } from '../../voxel/grid.js';
import { ModelDef } from '../../voxel/model.js';
import { FACTIONS } from './stats.js';

export function fallbackHumanoid(def) {
  const f = FACTIONS[def.faction] || FACTIONS.hellenes, c1 = f.colors[0], c2 = f.colors[1];
  const skin = 0xdfae85;
  const m = new ModelDef('fallback_' + def.id, 0.1); m.meta.rig = 'hum1'; m.meta.fallback = true;
  const body = new VoxelGrid(10, 9, 5).box(0, 0, 0, 10, 9, 5, T(0xf2f2f2)).box(0, 0, 0, 10, 2, 5, V(shade(c1, 0.6))).box(2, 2, 4, 6, 4, 1, V(c2));
  const head = new VoxelGrid(10, 10, 10).box(2, 0, 2, 6, 6, 6, V(skin)).box(2, 4, 2, 6, 2, 6, V(shade(c2, 0.9))).box(4, 6, 4, 2, def.role === 'hero' ? 5 : 3, 2, T(0xffffff)).box(3, 2, 7, 1, 1, 1, V(0x222222)).box(6, 2, 7, 1, 1, 1, V(0x222222));
  const armU = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(skin)), armL = new VoxelGrid(3, 5, 3).box(0, 0, 0, 3, 5, 3, V(skin)).box(0, 3, 0, 3, 2, 3, V(shade(c2, 0.8)));
  const legU = new VoxelGrid(4, 5, 4).box(0, 0, 0, 4, 5, 4, V(shade(c1, 0.9))), legL = new VoxelGrid(4, 5, 6).box(0, 0, 0, 4, 5, 4, V(skin)).box(0, 0, 0, 4, 2, 6, V(0x6b4a2a));
  const len = Math.max(14, Math.min(40, Math.round(((def.melee ? def.melee.range : 1.5) + 1.2) * 10)));
  const weapon = new VoxelGrid(5, len + 8, 5);
  if (def.ranged && !def.melee) weapon.box(2, 0, 2, 1, 16, 1, V(0x6a4a2a)).box(1, 0, 2, 3, 1, 1, V(0xd8d0b0)); else weapon.box(2, 0, 2, 1, len, 1, V(0x8b5a2b)).box(1, len, 1, 3, 4, 3, V(0xcfd3d8));
  const shield = new VoxelGrid(14, 14, 4).ellipsoid(7, 7, 1, 7, 7, 1.3, T(0xffffff)).ellipsoid(7, 7, 2, 3, 3, 0.8, V(c2));
  m.addPart('body', body, { origin: [0, 10, 0], pivot: [5, 0, 2.5] });
  m.addPart('head', head, { parent: 'body', origin: [0, 9, 0], pivot: [5, 0, 5] });
  m.addPart('armUL', armU, { parent: 'body', origin: [6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLL', armL, { parent: 'armUL', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armUR', armU, { parent: 'body', origin: [-6.5, 8, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('armLR', armL, { parent: 'armUR', origin: [0, -5, 0], pivot: [1.5, 5, 1.5] });
  m.addPart('weapon', weapon, { parent: 'armLR', origin: [0, -4, 0.5], pivot: [2.5, 8, 2.5], rest: [-1.3, 0, 0] });
  if (def.shield) m.addPart('offhand', shield, { parent: 'armLL', origin: [0, -4, 1.5], pivot: [7, 7, 1.5] });
  m.addPart('legUL', legU, { origin: [3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLL', legL, { parent: 'legUL', origin: [0, -5, 0], pivot: [2, 5, 2] });
  m.addPart('legUR', legU, { origin: [-3, 10, 0], pivot: [2, 5, 2] });
  m.addPart('legLR', legL, { parent: 'legUR', origin: [0, -5, 0], pivot: [2, 5, 2] });
  return m;
}

/** Four-legged block creature (mounts, beasts, siege) in faction colours. */
export function fallbackBeast(def) {
  const f = FACTIONS[def.faction] || FACTIONS.mythic, c1 = f.colors[0], c2 = f.colors[1];
  const big = (def.radius || 0.5) > 1.0, L = big ? 26 : 18, H = big ? 14 : 8, W = big ? 14 : 8, LEG = big ? 14 : 9;
  const m = new ModelDef('fallback_' + def.id, 0.1); m.meta.rig = 'quad1'; m.meta.fallback = true;
  const coat = def.role === 'siege' ? 0x8a6a40 : 0xa0724a;
  const body = new VoxelGrid(W, H, L).box(0, 0, 0, W, H, L, V(coat)).box(0, H - 3, 2, W, 3, L - 4, T(0xf0f0f0));
  const head = new VoxelGrid(W - 2, W - 2, 8).box(0, 0, 0, W - 2, W - 2, 8, V(shade(coat, 1.05))).box(1, 2, 7, 1, 1, 1, V(0x111111)).box(W - 4, 2, 7, 1, 1, 1, V(0x111111));
  const leg = new VoxelGrid(3, LEG, 3).box(0, 0, 0, 3, LEG, 3, V(shade(coat, 0.8)));
  m.addPart('body', body, { origin: [0, LEG, 0], pivot: [W / 2, 0, L / 2] });
  m.addPart('head', head, { parent: 'body', origin: [0, H - 2, L / 2 + 1], pivot: [(W - 2) / 2, 1, 1] });
  for (const [id, x, z] of [['legFL', W - 2, L - 4], ['legFR', 1, L - 4], ['legBL', W - 2, 2], ['legBR', 1, 2]]) m.addPart(id, leg, { parent: 'body', origin: [x - W / 2 + 1, 0, z - L / 2], pivot: [1.5, LEG, 1.5] });
  return m;
}
