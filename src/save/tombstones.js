// Tombstones (spec §0.8, verification P3): ids are immutable once shipped, so a removed unit / prop / achievement / arena preset / cue leaves a tombstone here.
// Old saves, share codes and imported files that still mention a tombstoned id keep working: units become the "Mystery Goat", the rest are dropped or
// replaced quietly instead of failing validation with "unknown id".   Adding a removal is one line in TOMBSTONES (`{removed:'v1.4', by:'new_id'?}`).
// Pure JS. A test (tests/save/tombstones.test.mjs) fails when an id is both live and tombstoned.

/** kind -> { removedId: { removed: 'build or version', by?: 'replacement id', note? } }. Empty today: nothing has been removed since ids were frozen. */
export const TOMBSTONES = {
  unit: {},
  prop: {},
  achievement: {},
  arena: {},
  cue: {},
  clip: {},
  mutator: {},
};
export const KINDS = Object.keys(TOMBSTONES);

/** The stand-in for any tombstoned unit: the Sacred Goat's cousin, display name "Mystery Goat" (def id `battle_goat`, which every build ships). */
export const MYSTERY_GOAT = Object.freeze({ id: 'battle_goat', name: 'Mystery Goat' });

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export function isTombstoned(kind, id, table = TOMBSTONES) { return !!(table[kind] && typeof id === 'string' && has(table[kind], id)); }

/**
 * Resolve a unit id read from a save. { id, name?, tombstoned, unknown }:
 *   live id -> itself;  tombstoned -> its replacement (`by`, when that is live) or the Mystery Goat;  unknown (never shipped, e.g. from a newer build) -> unknown:true, id unchanged.
 */
export function resolveUnit(id, defs, table = TOMBSTONES) {
  if (defs && typeof id === 'string' && defs[id]) return { id, tombstoned: false, unknown: false };
  if (isTombstoned('unit', id, table)) {
    const by = table.unit[id].by;
    if (by && defs && defs[by]) return { id: by, tombstoned: true, unknown: false };
    return { id: MYSTERY_GOAT.id, name: MYSTERY_GOAT.name, tombstoned: true, unknown: false };
  }
  return { id, tombstoned: false, unknown: true };
}
/** Display name for a unit id that may be tombstoned ("Mystery Goat") or live (the def's own name). */
export function unitLabel(id, defs, table = TOMBSTONES) {
  const r = resolveUnit(id, defs, table);
  if (r.name) return r.name;
  return (defs && defs[r.id] && defs[r.id].name) || String(id).replace(/_/g, ' ');
}
/** An army ({records:[{defId,...}]}) with tombstoned unit ids replaced; returns {army, replaced:[ids]} (the input is not mutated). */
export function remapArmy(army, defs, table = TOMBSTONES) {
  const replaced = [];
  if (!army || !Array.isArray(army.records)) return { army, replaced };
  const records = army.records.map((r) => {
    if (!r || typeof r !== 'object') return r;
    const res = resolveUnit(r.defId, defs, table);
    if (res.tombstoned && !r.custom) { replaced.push(r.defId); return Object.assign({}, r, { defId: res.id, was: r.defId }); }
    return r;
  });
  return { army: Object.assign({}, army, { records }), replaced };
}
/** Achievement map {id: {at}} without tombstoned ids (their medals are retired, not re-awarded). */
export function pruneAchievements(map, table = TOMBSTONES) {
  const out = {}; if (!map || typeof map !== 'object') return out;
  for (const id of Object.keys(map)) if (!isTombstoned('achievement', id, table)) out[id] = map[id];
  return out;
}
/** Arena preset id from a save: tombstoned -> its replacement or null. */
export function resolveArena(id, table = TOMBSTONES) {
  if (!isTombstoned('arena', id, table)) return id;
  return table.arena[id].by || null;
}
/** Prop type list (arena data) with tombstoned types removed; returns {props, dropped}. */
export function pruneProps(props, table = TOMBSTONES) {
  const dropped = []; const out = [];
  for (const p of Array.isArray(props) ? props : []) { const t = Array.isArray(p) ? p[0] : p && p.t; if (isTombstoned('prop', t, table)) dropped.push(t); else out.push(p); }
  return { props: out, dropped };
}
/** Ids that are tombstoned and live at once (a bug: a removed id was reused). */
export function conflicts(live, table = TOMBSTONES) {
  const bad = [];
  for (const kind of KINDS) { const L = live && live[kind]; if (!L) continue; const set = L instanceof Set ? L : new Set(Array.isArray(L) ? L : Object.keys(L)); for (const id of Object.keys(table[kind])) if (set.has(id)) bad.push(kind + ':' + id); }
  return bad;
}
