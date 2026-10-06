// Arena Builder wiring: the router entry, the copy tables (every tool, issue code and fix has words), the 16 tools and 40 placeable props.
import assert from 'node:assert';
import * as entry from '../../../src/editors/arena.js';
import { S, getS } from '../../../src/editors/arena/strings.js';
import { TOOLS, HAZARDS, MARKER_TYPES, OBJECTIVES, STAMPS, LIMITS } from '../../../src/editors/arena/consts.js';
import { PLACEABLE } from '../../../src/editors/arena/panels.js';
import { PROP_CATALOG } from '../../../src/content/era_ancient/props/catalog.js';
import { MATERIALS } from '../../../src/world/arena.js';
import { RECIPES } from '../../../src/world/gen.js';
let checks = 0; const ok = (c, m) => { checks++; assert.ok(c, m); };

ok(entry.meta && entry.meta.id === 'arena_builder' && entry.meta.layer === 'editor' && typeof entry.mount === 'function', 'router entry: {meta.id arena_builder, layer editor, mount}');
ok(TOOLS.length === 16, '16 tools');
for (const t of TOOLS) { const s = S.tools[t.id]; ok(s && s.name && s.tip && s.hint, 'copy for tool ' + t.id); ok(t.key, 'hotkey for ' + t.id); }
for (const h of HAZARDS) ok(S.hazards.kinds[h.id] && S.hazards.tips[h.id], 'copy for hazard ' + h.id);
ok(HAZARDS.length === 6 && MARKER_TYPES.length === 5 && OBJECTIVES.length === 5 && STAMPS.length === 6, 'six hazards, five marker types, five objectives, six stamps');
for (const m of MARKER_TYPES) ok(S.markers.types[m.id] && S.markers.tips[m.id], 'copy for marker ' + m.id);
for (const o of OBJECTIVES) ok(S.markers.objectives[o.id] && S.markers.needsText[o.id], 'copy for objective ' + o.id);
for (const k of STAMPS) ok(S.stamp.kinds[k], 'copy for stamp ' + k);
ok(S.paint.materials.length === 16 && MATERIALS.length === 16, '16 materials');
const codes = ['zone_missing', 'zone_bounds', 'zone_overlap', 'zone_walkable', 'zone_water', 'path_blocked', 'props_limit', 'prop_types_limit', 'prop_unknown', 'hazards_limit', 'markers_limit', 'marker_bounds', 'objective_markers', 'name_length'];
for (const c of codes) ok(typeof S.checks.issues[c] === 'function', 'issue text for ' + c);
for (const f of ['add_zone', 'fit_zone', 'separate_zones', 'level_zone', 'raise_zone', 'carve_ramp', 'trim_props', 'remove_unknown', 'trim_hazards', 'trim_markers', 'fit_markers', 'add_objective_markers', 'name_default']) ok(typeof S.checks.fixes[f] === 'function', 'fix label for ' + f);
ok(S.checks.issues.objective_markers({ objective: 'hold_hill', missing: ['hill'], missingProps: [] }, S).includes('Hill'), 'objective issue names the missing marker');
ok(PLACEABLE.length === 40 && !PLACEABLE.includes('crowd'), 'the prop palette lists the 40 placeable props (all but crowd): ' + PLACEABLE.length);
ok(Object.keys(PROP_CATALOG).length === 41 && LIMITS.propTypes === 41, '41 prop types in the catalog');
ok(RECIPES.length >= 15, 'recipes for the Generate tool: ' + RECIPES.length);
ok(getS({ content: { humor: { arenaBuilder: { title: 'Zzz', bar: { save: 'Stash' } } } } }).bar.save === 'Stash' && getS({}).title === 'Arena Builder', 'HUMOR can override copy through ctx.content.humor.arenaBuilder');
console.log('arena entry OK (' + checks + ' checks)');
