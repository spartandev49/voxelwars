// Arena Builder validators + fixes (E2) and the path check for unit radii 0.45 / 0.55 (W1 negative control: close a corridor to the narrower radius).
import assert from 'node:assert';
import { generateArena, RECIPES } from '../../../src/world/gen.js';
import { MAT } from '../../../src/world/arena.js';
import { EditSession, hashArena } from '../../../src/editors/arena/session.js';
import { validateArena } from '../../../src/editors/arena/validate.js';
import { applyFix } from '../../../src/editors/arena/fixes.js';
import { buildNav, pathExists, zoneWalkable, clearanceOffsets } from '../../../src/editors/arena/paths.js';
import { LIMITS, PATH_RADII } from '../../../src/editors/arena/consts.js';
let checks = 0; const ok = (c, m) => { checks++; assert.ok(c, m); };

const lab = () => new EditSession(generateArena('arenalab', 'small', 1));
const codes = (s, o) => validateArena(s.arena, Object.assign({ objective: s.objective }, o)).issues.map((i) => i.code);
const issue = (s, code) => validateArena(s.arena, { objective: s.objective }).issues.find((i) => i.code === code);
function fixes(s, code, resolved = true) {
  const iss = issue(s, code); assert.ok(iss, 'expected an issue ' + code);
  const h0 = hashArena(s.arena);
  assert.ok(applyFix(s, iss), 'fix ' + iss.fix + ' did something');
  if (resolved) { const again = validateArena(s.arena, { objective: s.objective }).issues.find((i) => i.code === code && (!iss.params.zone || i.params.zone === iss.params.zone)); assert.ok(!again, 'fix ' + iss.fix + ' resolves ' + code + (again ? ' (still: ' + JSON.stringify(again.params) + ')' : '')); }
  checks++;
  while (s.undo.canUndo() && hashArena(s.arena) !== h0) s.undo.undo();
  assert.strictEqual(hashArena(s.arena), h0, 'undoing the fix restores the arena exactly');
  // and the fix again (leave it applied)
  applyFix(s, issue(s, code) || iss);
}

// ---------------------------------------------------------------- presets and the blank lab are valid starts
for (const r of RECIPES) {
  const a = generateArena(r, r === 'oasis' ? 'small' : 'small', 7); const v = validateArena(a);
  const errs = v.issues.filter((i) => i.severity === 'error');
  ok(errs.length === 0, r + ' validates clean: ' + JSON.stringify(errs.map((e) => e.code + ':' + JSON.stringify(e.params))));
}
for (const [r, sz] of [['marathon', 'medium'], ['thermopylae', 'medium'], ['olympus', 'large'], ['styx', 'medium'], ['troy', 'large']]) {
  const v = validateArena(generateArena(r, sz, 3)); ok(v.errors === 0, r + ' ' + sz + ' validates clean: ' + JSON.stringify(v.issues.map((i) => i.code)));
}
ok(codes(lab()).length === 0, 'the blank lab has no issues');

// ---------------------------------------------------------------- zones
{ const s = lab(); s.arena.zones.B = null; ok(codes(s).includes('zone_missing'), 'missing zone'); fixes(s, 'zone_missing'); }
{ const s = lab(); s.arena.zones.A.x = -60; ok(codes(s).includes('zone_bounds'), 'zone outside the bounds'); fixes(s, 'zone_bounds'); }
{ const s = lab(); s.arena.zones.B = Object.assign({}, s.arena.zones.A); ok(codes(s).includes('zone_overlap'), 'overlapping zones'); fixes(s, 'zone_overlap'); }
{ const s = lab(); s.arena.zones.A = { x: -20, z: 0, w: 4, d: 4 }; ok(codes(s).includes('zone_walkable'), 'a 4 x 4 zone has fewer than 30 walkable cells'); fixes(s, 'zone_walkable'); }
{ // walkable count: props and lava reduce it
  const s = lab(); const nav = buildNav(s.arena); const full = zoneWalkable(nav, s.arena.zones.A); ok(full > 100, 'a default zone holds plenty of walkable cells (' + full + ')');
  { const zn = s.arena.zones.A; for (let x = zn.x - zn.w / 2; x <= zn.x + zn.w / 2; x += 1.5) for (let z = zn.z - zn.d / 2; z <= zn.z + zn.d / 2; z += 1.5) s.arena.props.push({ t: 'rock_big', x, z, r: 0, s: 1, v: 0 }); }
  ok(zoneWalkable(buildNav(s.arena), s.arena.zones.A) < 30, 'a field of boulders blocks the zone'); ok(codes(s).includes('zone_walkable'));
  fixes(s, 'zone_walkable');
}
{ const s = lab(); s.arena.zones.A.w = 6; s.arena.zones.A.d = 6; const z = s.arena.zones.A; for (let k = 0; k < s.arena.size * s.arena.size; k++) s.arena.m[k] = k % 7 === 0 ? MAT.lava : MAT.grass; void z; ok(codes(s).includes('zone_walkable')); fixes(s, 'zone_walkable'); }
{ // underwater zones (and lava lakes) must be raised
  for (const lava of [false, true]) {
    const s = lab(); s.arena.water = 20; s.arena.lava = lava; for (let k = 0; k < s.arena.h.length; k++) s.arena.h[k] = 10;
    const c = codes(s); ok(c.includes('zone_water'), 'a zone under the ' + (lava ? 'lava' : 'water') + ' is an error');
    fixes(s, 'zone_water'); fixes(s, 'zone_water', false);
  }
}
// ---------------------------------------------------------------- path A -> B for 0.45 and 0.55
function wall(s, gapCells, thickness = 4) {
  const a = s.arena, n = a.size, mid = n >> 1;
  for (let z = 0; z < n; z++) for (let x = mid - (thickness >> 1); x < mid + (thickness >> 1); x++) a.h[x + z * n] = 90;
  if (gapCells) { const g0 = ((n >> 1) - (gapCells >> 1)) & ~1; /* align to the 2x2 nav blocks */ for (let z = g0; z < g0 + gapCells; z++) for (let x = mid - (thickness >> 1); x < mid + (thickness >> 1); x++) a.h[x + z * n] = a.h[0]; }
}
{ const s = lab(); wall(s, 0); const v = validateArena(s.arena); const p = v.issues.find((i) => i.code === 'path_blocked');
  ok(p && p.params.radii.length === 2, 'a solid wall blocks both radii'); fixes(s, 'path_blocked'); const nav = buildNav(s.arena); for (const r of PATH_RADII) ok(pathExists(nav, s.arena, r).ok, 'after the fix a unit of radius ' + r + ' passes'); }
{ // negative control: a corridor exactly one nav cell wide admits 0.45 but not 0.55
  const s = lab(); wall(s, 2); // 2 terrain cells = 1 u gap
  const nav = buildNav(s.arena); const r45 = pathExists(nav, s.arena, 0.45).ok, r55 = pathExists(nav, s.arena, 0.55).ok;
  ok(r45 && !r55, 'a 1 u corridor passes radius 0.45 (' + r45 + ') and fails 0.55 (' + r55 + ')');
  const p = validateArena(s.arena).issues.find((i) => i.code === 'path_blocked'); ok(p && p.params.radii.length === 1 && p.params.radii[0] === 0.55, 'only the wider radius is reported');
  fixes(s, 'path_blocked'); ok(pathExists(buildNav(s.arena), s.arena, 0.55).ok, 'carving widens the corridor for the fat soldier');
  const s2 = lab(); wall(s2, 6); ok(pathExists(buildNav(s2.arena), s2.arena, 0.55).ok, 'a 3 u gap passes both'); ok(!codes(s2).includes('path_blocked'));
}
{ // water barrier + lava river + a wall of destructible props (soft = open)
  const s = lab(); const a = s.arena, n = a.size; a.water = 10; for (let z = 0; z < n; z++) for (let x = n / 2 - 8; x < n / 2 + 8; x++) a.h[x + z * n] = 4;
  ok(codes(s).includes('path_blocked'), 'a deep river blocks'); fixes(s, 'path_blocked');
  const t = lab(); for (let z = -32; z <= 32; z += 1.2) t.arena.props.push({ t: 'wall_stone', x: 0, z, r: 0, s: 1, v: 0 }); ok(!codes(t).includes('path_blocked'), 'destructible walls are soft, the path exists');
  const u = lab(); for (let z = -32; z <= 32; z += 1.2) u.arena.props.push({ t: 'statue_zeus', x: 0, z, r: 0, s: 1, v: 0 }); ok(codes(u).includes('path_blocked'), 'a wall of indestructible statues blocks'); fixes(u, 'path_blocked');
}
// ---------------------------------------------------------------- limits
{ const s = lab(); for (let k = 0; k < LIMITS.props + 1; k++) s.arena.props.push({ t: 'bush', x: (k % 60) - 30, z: (k % 50) - 25, r: 0, s: 1, v: 0 }); ok(codes(s).includes('props_limit')); fixes(s, 'props_limit'); }
{ const s = lab(); s.arena.props.push({ t: 'dragon_egg', x: 0, z: 0, r: 0, s: 1, v: 0 }); ok(codes(s).includes('prop_unknown')); fixes(s, 'prop_unknown'); }
{ const s = lab(); for (let k = 0; k < 61; k++) s.arena.hazards.push({ t: 'spikes', x: k - 30, z: 0, r: 2 }); ok(codes(s).includes('hazards_limit')); fixes(s, 'hazards_limit'); }
{ const s = lab(); for (let k = 0; k < 9; k++) s.arena.markers.push({ id: 'wp' + k, type: 'waypoint', x: k, z: 0, r: 4 }); ok(codes(s).includes('markers_limit')); fixes(s, 'markers_limit'); }
{ const s = lab(); s.arena.markers.push({ id: 'hill', type: 'hill', x: 500, z: 0, r: 6 }); ok(codes(s).includes('marker_bounds')); fixes(s, 'marker_bounds'); }
// ---------------------------------------------------------------- objectives need their markers
for (const [obj, need] of [['hold_hill', ['hill']], ['protect_vip', ['vip_start', 'exit']], ['kill_general', ['general_spawn']], ['destroy', []]]) {
  const s = lab(); s.setObjective(obj); const i = issue(s, 'objective_markers');
  ok(i && i.severity === 'warn', obj + ' without its markers warns'); assert.deepStrictEqual(i.params.missing, need); if (obj === 'destroy') ok(i.params.missingProps.includes('gate_door'));
  fixes(s, 'objective_markers');
  if (need.length) for (const t of need) ok(s.arena.markers.some((m) => m.type === t), obj + ' fix adds ' + t);
  else ok(s.arena.props.some((p) => p.t === 'gate_door'), 'destroy fix adds gate doors');
  ok(validateArena(s.arena, { objective: obj }).canPlaytest, 'the fix leaves the arena playable');
}
{ const s = lab(); ok(!codes(s).includes('objective_markers'), 'eliminate needs nothing'); }
// ---------------------------------------------------------------- name rules (1-32 chars) and blocking semantics
{ const s = lab(); s.arena.name = ''; ok(codes(s).includes('name_length')); fixes(s, 'name_length'); s.arena.name = 'x'.repeat(33); ok(codes(s).includes('name_length')); fixes(s, 'name_length'); s.arena.name = 'x'.repeat(32); ok(!codes(s).includes('name_length')); }
{ const s = lab(); s.arena.name = ''; const v = validateArena(s.arena); ok(v.canPlaytest && v.warnings === 1, 'warnings do not block Playtest');
  s.arena.zones.A = null; const w = validateArena(s.arena); ok(!w.canPlaytest && w.errors >= 1, 'errors block Playtest'); }
for (const o of [0.45, 0.55]) ok(Array.isArray(clearanceOffsets(o)));
assert.strictEqual(clearanceOffsets(0.45).length, 0); assert.strictEqual(clearanceOffsets(0.55).length, 4);
console.log('arena validators OK (' + checks + ' checks)');
