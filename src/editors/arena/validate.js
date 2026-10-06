// Arena Builder validators (spec/editors.md section 1, exactly as specified). Pure.
//   * both zones exist, are inside the bounds, do not overlap, have >= 30 walkable cells each and are NOT underwater (fix: raise);
//   * a path exists between zone A and zone B on the nav grid for unit radius 0.45 AND 0.55 (flood fill; fix: "carve a ramp");
//   * props <= 1,500 and unique prop types <= 41, hazards <= 60, markers <= 8 and inside the bounds;
//   * the picked objective's markers exist (hold_hill needs a hill, protect_vip vip_start + exit, kill_general general_spawn, destroy >= 1 gate_door);
//   * name 1-32 characters.
// Issues carry data only ({id, code, severity, params, fix}); the words live in strings.js. Save is allowed with warnings, Playtest is
// blocked only by errors.

import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { LIMITS, PATH_RADII, OBJECTIVE_BY_ID } from './consts.js';
import { boxesOverlap, zoneBox } from './geom.js';
import { buildNav, pathExists, zoneWalkable, zoneSubmerged } from './paths.js';

const finite = (z) => z && [z.x, z.z, z.w, z.d].every((v) => typeof v === 'number' && Number.isFinite(v));

/**
 * @param {import('../../world/arena.js').Arena} arena
 * @param {{objective?:string}} [o]
 * @returns {{issues:Array<{id:string,code:string,severity:'error'|'warn',params:object,fix:string|null}>, errors:number, warnings:number, canPlaytest:boolean, info:object}}
 */
export function validateArena(arena, o = {}) {
  const objective = o.objective || 'eliminate';
  const issues = []; const add = (code, severity, params, fix) => issues.push({ id: code + (params && params.zone ? ':' + params.zone : ''), code, severity, params: params || {}, fix: fix || null });
  const W = arena.worldSize(), half = W / 2, eps = 1e-6;
  const info = { zones: {}, path: {}, props: arena.props.length, hazards: arena.hazards.length, markers: arena.markers.length };
  const nav = buildNav(arena);

  // ---- zones
  const ok = {};
  for (const k of ['A', 'B']) {
    const zn = arena.zones[k];
    if (!finite(zn)) { add('zone_missing', 'error', { zone: k }, 'add_zone'); ok[k] = false; continue; }
    ok[k] = true;
    const b = zoneBox(zn);
    if (b.x0 < -half - eps || b.x1 > half + eps || b.z0 < -half - eps || b.z1 > half + eps) add('zone_bounds', 'error', { zone: k }, 'fit_zone');
    const walk = zoneWalkable(nav, zn);
    info.zones[k] = { walkable: walk, submerged: zoneSubmerged(arena, zn) };
    if (walk < LIMITS.zoneMinWalkable) add('zone_walkable', 'error', { zone: k, count: walk, need: LIMITS.zoneMinWalkable }, 'level_zone');
    if (info.zones[k].submerged > 0) add('zone_water', 'error', { zone: k, cells: info.zones[k].submerged, lava: !!arena.lava }, 'raise_zone');
  }
  if (ok.A && ok.B && boxesOverlap(zoneBox(arena.zones.A), zoneBox(arena.zones.B))) add('zone_overlap', 'error', {}, 'separate_zones');

  // ---- path A -> B for both radii (only meaningful when both zones can host soldiers)
  if (ok.A && ok.B && info.zones.A.walkable > 0 && info.zones.B.walkable > 0) {
    const failing = [];
    for (const r of PATH_RADII) { const res = pathExists(nav, arena, r); info.path[r] = res.ok; if (!res.ok) failing.push(r); }
    if (failing.length) add('path_blocked', 'error', { radii: failing }, 'carve_ramp');
  }

  // ---- limits
  if (arena.props.length > LIMITS.props) add('props_limit', 'error', { count: arena.props.length, max: LIMITS.props }, 'trim_props');
  const types = new Set(arena.props.map((p) => p.t));
  if (types.size > LIMITS.propTypes) add('prop_types_limit', 'error', { count: types.size, max: LIMITS.propTypes }, 'remove_unknown');
  const unknown = [...types].filter((t) => !propInfo(t));
  if (unknown.length) add('prop_unknown', 'error', { types: unknown.slice(0, 5) }, 'remove_unknown');
  if (arena.hazards.length > LIMITS.hazards) add('hazards_limit', 'error', { count: arena.hazards.length, max: LIMITS.hazards }, 'trim_hazards');
  if (arena.markers.length > LIMITS.markers) add('markers_limit', 'error', { count: arena.markers.length, max: LIMITS.markers }, 'trim_markers');
  const outside = arena.markers.filter((m) => Math.abs(m.x) > half + eps || Math.abs(m.z) > half + eps);
  if (outside.length) add('marker_bounds', 'error', { ids: outside.map((m) => m.id) }, 'fit_markers');

  // ---- objective
  const obj = OBJECTIVE_BY_ID[objective];
  if (obj) {
    const have = new Set(arena.markers.map((m) => m.type));
    const missing = obj.markers.filter((t) => !have.has(t));
    const gates = arena.props.filter((p) => obj.props.includes(p.t)).length;
    const missingProps = obj.props.length && !gates ? obj.props.slice() : [];
    if (missing.length || missingProps.length) add('objective_markers', 'warn', { objective, missing, missingProps }, 'add_objective_markers');
  }

  // ---- name
  const nm = String(arena.name || '').trim();
  if (nm.length < LIMITS.nameMin || nm.length > LIMITS.nameMax) add('name_length', 'warn', { length: nm.length }, 'name_default');

  const errors = issues.filter((i) => i.severity === 'error').length, warnings = issues.length - errors;
  return { issues, errors, warnings, canPlaytest: errors === 0, info };
}
