// Arena Builder constants (spec/editors.md section 1): the 16 tools, brush defaults, hazards, markers, objectives, stamps, limits.
// Pure data. No DOM, no THREE. Copy lives in strings.js (HUMOR can edit it); this file holds ids, numbers and hotkeys.

export const LIMITS = {
  props: 1500, propTypes: 41, hazards: 60, markers: 8, zones: 2,
  nameMin: 1, nameMax: 32, authorMax: 24, descMax: 200, tagsMax: 5, tagMax: 16,
  zoneMinWalkable: 30, zoneMin: 2,
  undo: 100,
  thumbChars: 6000,
};

/** Unit radii the A -> B path check must admit (spec editors.md section 1, decisions D11/W1). */
export const PATH_RADII = [0.45, 0.55];

export const BRUSH = {
  radiusMin: 1, radiusMax: 20, radiusDefault: 5,
  strengthMin: 0.05, strengthMax: 1, strengthDefault: 0.4,
  shapes: ['circle', 'square'],
  falloffs: ['smooth', 'linear', 'flat'],
};
/** B cycles through these combinations (shape + falloff). */
export const BRUSH_CYCLE = [
  { shape: 'circle', falloff: 'smooth' }, { shape: 'circle', falloff: 'flat' },
  { shape: 'square', falloff: 'flat' }, { shape: 'square', falloff: 'smooth' },
];

/** The 16 tools. `brush` tools share radius / strength / shape / falloff. `key` is a KeyboardEvent.code. */
export const TOOLS = [
  { id: 'raise', key: 'Digit1', icon: 'raise', group: 'sculpt', brush: true },
  { id: 'smooth', key: 'Digit2', icon: 'smooth', group: 'sculpt', brush: true },
  { id: 'flatten', key: 'Digit3', icon: 'flatten', group: 'sculpt', brush: true },
  { id: 'paint', key: 'Digit4', icon: 'paint', group: 'sculpt', brush: true },
  { id: 'water', key: 'Digit5', icon: 'water', group: 'sculpt', brush: false },
  { id: 'noise', key: 'Digit6', icon: 'noise', group: 'sculpt', brush: true },
  { id: 'ramp', key: 'Digit7', icon: 'ramp', group: 'sculpt', brush: false, radius: true },
  { id: 'stamp', key: 'Digit8', icon: 'stamp', group: 'sculpt', brush: false, radius: true },
  { id: 'props', key: 'Digit9', icon: 'props', group: 'place', brush: false, radius: true },
  { id: 'hazards', key: 'Digit0', icon: 'hazards', group: 'place', brush: false },
  { id: 'zones', key: 'KeyZ', icon: 'zones', group: 'place', brush: false },
  { id: 'symmetry', key: 'KeyY', icon: 'symmetry', group: 'world', brush: false },
  { id: 'generate', key: 'KeyG', icon: 'generate', group: 'world', brush: false },
  { id: 'environment', key: 'KeyV', icon: 'environment', group: 'world', brush: false },
  { id: 'info', key: 'KeyI', icon: 'info', group: 'world', brush: false },
  { id: 'markers', key: 'KeyM', icon: 'markers', group: 'place', brush: false },
];
/** Lookup tables are null-prototype objects so hostile ids such as '__proto__' or 'constructor' can never resolve. */
const table = (list) => Object.assign(Object.create(null), Object.fromEntries(list.map((t) => [t.id, t])));
export const TOOL_BY_ID = table(TOOLS);

export const SYMMETRY = ['off', 'mx', 'mz', 'rot'];

/** Hazard circles (world.md section 3). `lava` also paints lava material under the circle (see session.js). */
export const HAZARDS = [
  { id: 'quicksand', r: 4, color: 0xc9a14a },
  { id: 'spikes', r: 2.8, color: 0xb8bcc8 },
  { id: 'fire', r: 2.5, color: 0xff7a2f },
  { id: 'boulders', r: 3, color: 0x9a6b3a },
  { id: 'geyser', r: 2.6, color: 0x6ec6ff },
  { id: 'lava', r: 4, color: 0xff4a1a },
];
export const HAZARD_BY_ID = table(HAZARDS);
export const HAZARD_RADIUS = { min: 1, max: 30 };
/** Length (u, half) of the rolling-boulder lane: the sim uses max(r * 3, 16) along +z (sim/hazards.js). */
export const boulderHalfLane = (r) => Math.max(r * 3, 16);

/** Objective markers (world.md section 5). */
export const MARKER_TYPES = [
  { id: 'hill', r: 6, color: 0xffc93c },
  { id: 'exit', r: 4, color: 0x8bc34a },
  { id: 'vip_start', r: 4, color: 0xff7eb6 },
  { id: 'general_spawn', r: 4, color: 0xee4b4b },
  { id: 'waypoint', r: 4, color: 0x6ec6ff },
];
export const MARKER_BY_ID = table(MARKER_TYPES);
export const MARKER_RADIUS = { min: 1, max: 30 };

/** Default objective suggestions (world.md section 8). `markers` and `props` list what the objective needs. */
export const OBJECTIVES = [
  { id: 'eliminate', markers: [], props: [] },
  { id: 'kill_general', markers: ['general_spawn'], props: [] },
  { id: 'hold_hill', markers: ['hill'], props: [] },
  { id: 'protect_vip', markers: ['vip_start', 'exit'], props: [] },
  { id: 'destroy', markers: [], props: ['gate_door'] },
];
export const OBJECTIVE_BY_ID = table(OBJECTIVES);

export const STAMPS = ['hill', 'crater', 'mesa', 'trench', 'island', 'ridge'];

/** Props palette: catalog categories (PROP_CATEGORIES) and the scatter defaults. */
export const PROP_TOOL = { densityMin: 1, densityMax: 12, densityDefault: 4, rotStep: Math.PI / 12 };

/** Weather ids shared with world/arena.js WEATHERS; themes are the music/ambience themes the presets use. */
export const THEMES = ['greek', 'roman', 'egyptian', 'persian', 'punic', 'barbarian', 'alpine', 'mythic'];
export const MOODS = ['auto', 'menu', 'battle', 'comedy'];

export const AUTOSAVE_MS = 20000;
export const DRAFT_KEY = 'arena';
export const SIZE_ORDER = ['small', 'medium', 'large'];
