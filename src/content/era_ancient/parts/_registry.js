// Humanoid part registry. Pure data/JS, no DOM. Parts register themselves when their module is imported
// (`registerParts(PARTS)` at the bottom of every parts/*.js), so a unit module only has to import the parts file it needs.
//
// Registry entry: { id, name, category, build(ctx) -> VoxelGrid | {[partId]: VoxelGrid}, meta, unlock? }
//   build()  returns either ONE grid (the category's primary target part) or a map {partId: grid} when the item spans parts
//            (a helm builds `head` + `crest`, greaves build all four leg parts ...). Grids are on the canonical hum1 grids
//            (see _kit.js DIM) and contain ONLY the item's own voxels; compileSoldier stamps them over the base body in layer order.
//   meta     category specific (weapons: {style, reach, rest, twoHanded, grip, len, ...}; helms: {hair:'all'|'none', ...})
//   unlock   undefined (always available) or {key, hint}; the Workshop shows a lock with `hint` until the campaign grants `key`.

export const CATEGORIES = {
  helms:     { label: 'Helm',      target: 'head',    order: 70 },
  hair:      { label: 'Hair',      target: 'head',    order: 40 },
  faces:     { label: 'Face',      target: 'head',    order: 30 },
  tunics:    { label: 'Tunic',     target: 'body',    order: 10 },
  armors:    { label: 'Armour',    target: 'body',    order: 20 },
  shoulders: { label: 'Shoulders', target: 'body',    order: 25 },
  legs:      { label: 'Legs',      target: 'legUL',   order: 8 },
  skirts:    { label: 'Skirt',     target: 'legUL',   order: 9 },
  capes:     { label: 'Cape',      target: 'cape',    order: 50 },
  backs:     { label: 'Back',      target: 'back',    order: 60 },
  mains:     { label: 'Main hand', target: 'weapon',  order: 80 },
  offs:      { label: 'Off hand',  target: 'offhand', order: 81 },
};

export const PART_REGISTRY = {};
for (const k of Object.keys(CATEGORIES)) PART_REGISTRY[k] = Object.create(null);

const ID_RE = /^[a-z][a-z0-9_]*$/;

/** Register a set {category: {id: entryOrFn}}; entries may omit id/category (filled from the key). Idempotent for identical objects. */
export function registerParts(set) {
  for (const cat of Object.keys(set)) {
    if (!CATEGORIES[cat]) throw new Error(`registerParts: unknown category '${cat}'`);
    for (const id of Object.keys(set[cat])) {
      const e = set[cat][id];
      if (!ID_RE.test(id)) throw new Error(`registerParts: bad id '${id}' (lower_snake_case)`);
      if (typeof e.build !== 'function') throw new Error(`registerParts: ${cat}.${id} has no build()`);
      e.id = id; e.category = cat;
      if (!e.name) e.name = id.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      if (!e.meta) e.meta = {};
      const prev = PART_REGISTRY[cat][id];
      if (prev && prev !== e) throw new Error(`registerParts: duplicate ${cat}.${id}`);
      PART_REGISTRY[cat][id] = e;
    }
  }
  return PART_REGISTRY;
}

/** Entry lookup (undefined when unknown). */
export const getPart = (cat, id) => (PART_REGISTRY[cat] ? PART_REGISTRY[cat][id] : undefined);

/** True when the entry has no lock, or its unlock key is in `unlocked` (a Set/array of keys; undefined = nothing unlocked). */
export function isPartUnlocked(entry, unlocked) {
  if (!entry || !entry.unlock) return true;
  if (!unlocked) return false;
  return typeof unlocked.has === 'function' ? unlocked.has(entry.unlock.key) : unlocked.indexOf(entry.unlock.key) >= 0;
}

/** Workshop listing: [{id, name, category, locked, hint, meta}] in registration order. */
export function listParts(cat, unlocked) {
  const out = [];
  for (const id of Object.keys(PART_REGISTRY[cat] || {})) {
    const e = PART_REGISTRY[cat][id], ok = isPartUnlocked(e, unlocked);
    out.push({ id, name: e.name, category: cat, locked: !ok, hint: ok ? '' : e.unlock.hint, unlockKey: e.unlock ? e.unlock.key : null, meta: e.meta });
  }
  return out;
}

/** Unlock keys used by shipped parts (CAMPAIGN grants these). */
export const UNLOCKS = {
  silly_helms:   { key: 'silly_helms',   hint: 'Unlocked by finishing campaign mission 3.' },
  silly_weapons: { key: 'silly_weapons', hint: 'Unlocked by finishing campaign mission 5.' },
  wings:         { key: 'wings',         hint: 'Unlocked by finishing the campaign.' },
};
