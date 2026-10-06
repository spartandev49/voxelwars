// Prop catalog: sim + editor facing data (pure). Models are built by props/models.js (BEASTS/COORD) keyed by the same ids.
// r = blocking radius (u, before scale), h = height for projectile cover / camera collision, hp = Infinity for indestructible,
// blocks: 'full' (units cannot enter), 'none' (decor), cover: blocks projectiles, flam: burns, cat: editor category.
const P = (cat, r, h, hp, o) => Object.assign({ cat, r, h, hp, blocks: r > 0 ? 'full' : 'none', cover: r >= 0.5, flam: false, place: true, scale: [0.7, 1.6], name: '' }, o);
const INF = Infinity;

export const PROP_CATALOG = {
  tree_oak:      P('nature', 0.5, 5, 120, { flam: true, name: 'Oak Tree' }),
  tree_olive:    P('nature', 0.45, 4, 110, { flam: true, name: 'Olive Tree' }),
  tree_cypress:  P('nature', 0.35, 6.5, 100, { flam: true, name: 'Cypress' }),
  tree_pine:     P('nature', 0.4, 6.5, 110, { flam: true, name: 'Pine' }),
  tree_dead:     P('nature', 0.35, 4, 70, { flam: true, name: 'Dead Tree' }),
  palm:          P('nature', 0.35, 6, 90, { flam: true, name: 'Palm Tree', cover: false }),
  bush:          P('nature', 0, 1.2, 30, { flam: true, name: 'Bush', blocks: 'none' }),
  rock_small:    P('nature', 0.5, 1, INF, { name: 'Rock', cover: false }),
  rock_big:      P('nature', 1.1, 2.6, INF, { name: 'Boulder' }),
  wheat:         P('nature', 0, 1, 10, { flam: true, name: 'Wheat', blocks: 'none' }),
  reeds:         P('nature', 0, 1.6, 10, { flam: true, name: 'Reeds', blocks: 'none' }),
  cactus:        P('nature', 0.3, 2, 40, { name: 'Cactus', cover: false }),
  bones:         P('nature', 0, 0.5, INF, { name: 'Bones', blocks: 'none' }),
  skull_pile:    P('nature', 0, 0.8, INF, { name: 'Skull Pile', blocks: 'none' }),
  log:           P('nature', 0.5, 1, 80, { flam: true, name: 'Log', cover: false }),
  crate:         P('props', 0.5, 1, 30, { flam: true, name: 'Crate', cover: false }),
  barrel:        P('props', 0.4, 1, 30, { flam: true, name: 'Barrel', cover: false }),
  tent:          P('props', 1.3, 2.6, 120, { flam: true, name: 'Tent' }),
  torch:         P('props', 0.15, 2.5, 20, { flam: true, name: 'Torch', cover: false, scale: [0.9, 1.4] }),
  banner_post:   P('props', 0.2, 5, 40, { flam: true, name: 'Banner Pole', cover: false, blocks: 'none' }),
  fire_pit:      P('props', 0, 0.5, INF, { name: 'Fire Pit', blocks: 'none' }),
  campfire:      P('props', 0, 0.5, INF, { name: 'Campfire', blocks: 'none' }),
  goat_pen:      P('props', 0, 1.2, 100, { flam: true, name: 'Goat Pen', blocks: 'none' }),
  column_marble: P('architecture', 0.6, 6, 250, { name: 'Marble Column', scale: [0.9, 1.5] }),
  column_broken: P('architecture', 0.6, 2.5, 150, { name: 'Broken Column' }),
  ruin_wall:     P('architecture', 1.0, 3, 300, { name: 'Ruined Wall' }),
  wall_stone:    P('architecture', 1.0, 4, 600, { name: 'Stone Wall', scale: [0.9, 1.4] }),
  tower:         P('architecture', 1.6, 9, 900, { name: 'Watchtower', scale: [0.9, 1.5] }),
  arch_gate:     P('architecture', 0, 6, 700, { name: 'Archway', blocks: 'none', cover: false }),
  gate_door:     P('architecture', 2.2, 4.5, 700, { name: 'Wooden Gate', flam: true }),
  pyramid:       P('monuments', 7, 12, INF, { name: 'Pyramid', scale: [0.6, 2.0] }),
  obelisk:       P('monuments', 0.7, 7, INF, { name: 'Obelisk' }),
  sphinx_statue: P('monuments', 3, 6, INF, { name: 'Sphinx Statue' }),
  throne:        P('monuments', 1.0, 3, INF, { name: 'Gold Throne' }),
  statue_lion:   P('monuments', 1.0, 3, 400, { name: 'Lion Statue' }),
  statue_zeus:   P('monuments', 2.0, 12, INF, { name: 'Statue of Zeus' }),
  temple:        P('monuments', 6, 8, INF, { name: 'Temple', scale: [0.7, 1.3] }),
  ship:          P('props', 2.5, 4, 300, { flam: true, name: 'Ship' }),
  crowd:         P('props', 0, 2, INF, { name: 'Spectator', blocks: 'none', place: false }),
  cloud_island:  P('props', 0, 2, INF, { name: 'Cloud Island', blocks: 'none' }),
  cave_mouth:    P('monuments', 2, 6, INF, { name: 'Cave Mouth' }),
};

export function propInfo(type) { return PROP_CATALOG[type] || null; }
export const PROP_CATEGORIES = ['nature', 'architecture', 'monuments', 'props'];
