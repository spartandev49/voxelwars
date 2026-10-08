# spec/W: world, props, arenas, materials, scale and tempo, Arena Builder (DESIGN-WORLD, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (sections 0, 3, 7, 14), `maps/01, 02, 04, 05, 08`, `spec/AR.md`, `spec/M.md`, the `q1_*`..`q3_*` residuals addressed to this file (section 5). Where code and a document disagree the code wins; every such case is in section 6. All facts below were verified on HEAD `4fe90f7` (Node 22.22.0, Chromium 141.0.7390.37) with read-only probes in the scratchpad; nothing under `src/`, `tools/`, `tests/` was touched. Policy codes (`FZ OI PX NEW DA`) are those of spec/AR section 1.

## 1. Purpose and scope

This file binds the world layer of the three new eras: (a) the `gencore` split and recipe registration (W1); (b) the merged prop catalog, flags, footprints, models, voxel size and budgets (W2, W9); (c) materials 16+, hazards-by-lookup, emissive, foot (W3); (d) env keys `sky gravity era`, weather additions, theme vocabulary (W4, W7); (e) nav move classes, clearance, oriented footprints, vehicle corridors (W5, W10); (f) scale and tempo, first contact (W11); (g) recipe authoring rules, readability (W8), anchors instead of absolute coordinates, symmetry and exemptions; (h) 36 arena families (first draft; `design/<era>` finalises); (i) the Arena Builder and every editor file (W6); (j) save/share compatibility; (k) acceptance (section 4).

Builders: WORLD (`src/world/**`, recipes, anchors, tempo tooling), PROPS-MED/MOD/SF (catalogs, models, flags), EDITORS (`src/editors/arena/**`), REGISTRY (data.js/pack.js wiring, shims), TOOLS-VERIFY and TOOLS-GOLDEN (harness metrics, fixtures), SPIKE (S-D8, S-VOX). Requests, not edits, go to SIM (`sim/world.js`, `sim/hazards.js`, `sim/ai.js`), RENDER (`props.js`, `terrainMesh.js`, `weather.js`, `engine.js`, `markers.js`), AUDIO (`cues.js`), UI (`strings.js`, css) through `docs/requests/world_<topic>.md` (list in 3.12). Not in scope: mechanics (spec/M), rigs and shader (spec/RA), mission data (spec/MS), screens (spec/CU), music (spec/AU).

**Ancient policy of this file.** Every touched Ancient path is bit-identical opt-in unless a row in 3.12 says otherwise: no new env/prop/hazard/material field is written for an Ancient arena, no Ancient id or material row changes, `generateArena` for the 16 Ancient presets stays byte-identical (G2), and with `released = {ancient}` the Builder DOM equals v8 (AR-D09). The only Ancient-visible behaviour left unfixed on purpose is the Builder theme-spelling defect (W-D19).

**Verified facts the design rests on** (probes `p1..p13`, 2026-10-08):

| # | fact | value | source |
|---|---|---|---|
| F1 | 16 preset arena hashes (FNV-1a-32 of `JSON.stringify(toJSON())`) reproduce map 05 exactly; Node 22 and Chromium 141 produce identical hashes for 16 presets + 30 extra (5 recipes x 3 sizes x 2 seeds) | 46 of 46 equal | `xe_run.mjs` |
| F2 | Ancient prop models: 40 placeable + crowd, voxels p50 4,869, max pyramid 986,215; tower 61,259 voxels / 29,948 LOD0 tris; wall_stone footprint 2.0 x 1.2 u as a circle r 1.0; gate_door 4.4 x 0.6 u as a circle r 2.2 | measured | `p1, p8` |
| F3 | Per Ancient arena: distinct (type, variant) batches 13..45 (median 22; Troy 45, Teutoburg 36), LOD0 triangles within 26 u of the origin 17k..335k (Troy 335k, Cyclops 224k), whole-arena LOD0 0.12M..1.19M (Teutoburg 10.1M if all near) | measured | `p9` |
| F4 | Keep 12 x 12 x 14 u with windows and merlons: 0.1 filled 1.85M solid / 259k tris / 870 ms build+mesh; 0.1 hollow 769k / 335k / 509 ms; 0.2 filled 231k / 65k / 168 ms; 0.2 hollow 96k / 84k / 188 ms (LOD1/LOD2 tris of 0.2 filled 15.5k / 3.7k) | measured | `p10` |
| F5 | Footprint approximation on a 4 x 4 building grid (nav stamp radius r + 0.35): 8 x 8 at pitch 14: inscribed circle leaks 6.3 %, circumscribed circle blocks 14.3 % phantom cells and leaves a 2-cell street; 10 x 6: inscribed leaks 46.7 %, circumscribed phantom 23.3 %; an oriented rectangle leaks 0 % and has 0 % phantom. A 40 u wall as 16 circles r 1.3 has 0 % leak, 3.3..6.1 % phantom | measured | `p7, p13` |
| F6 | Ancient deployment: front-to-front zone gap 19.2..57.6 u (median 39), centre gap 32.6..79.4 u; at tick 0 ranged units already have an enemy in range on colosseum (15 units), persepolis (11), oasis (9) | measured | `p5, p6` |
| F7 | Ancient first damage with balanced mixed armies (budget 6,000): 1.5..8.1 s, median 3.5 s over 14 presets | measured | `p6` |
| F8 | Ancient widest-path clearance between the zone centres (chamfer distance, soft props passable): 2.0 (styx, 2 u bone bridges) .. 30.0 (olympus); 13 of 14 reach >= 3.0 | measured | `p11` |
| F9 | Symmetric Ancient recipes: height equal within 1 step on 100 % of cells, materials equal 97.4..100 %, mirrored props 100 % | measured | `p12` |
| F10 | Ancient speed 1.0 (catapult) .. 4.6 (chicken) u/s, direct ranged range 10..38, siege range 55..70, largest radius 1.5; `layoutArmy` spacing = max(1.15, 2.05 x radius) | defs | `p4` |
| F11 | Share codes: 16 chars per extra prop; Teutoburg 984 props = 32,726 chars of the 38,000 limit; medium maps 2.6k..12.9k (styx) | measured | `p2` |
| F12 | Env sanitiser drops unknown keys (`arena.js:161`), `fromJSON` clamps material bytes to `MATERIALS.length - 1` (`arena.js:153`), hazard sanitiser keeps only `t x z r` (`arena.js:152`), `toJSON` writes `env` verbatim (`arena.js:130`) | code | read |

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| W-D01 | `Gen`, `inZone`, `distPoly`, `curve` move verbatim into `src/world/gencore.js`; `gen.js` becomes the facade that registers the 16 Ancient recipes, re-exports `RECIPES` (the live `RECIPE_IDS` array) and `generateArena`. | `Gen` is 290 un-exported lines (`gen.js:25-311`); era files cannot add recipes otherwise; AR 3.1.6 fixes the names. | W1 |
| W-D02 | The net for the split is G2 (16 hashes) plus a W-owned extension of 96 hashes (16 recipes x {small, medium, large} x seeds {1, 7}) recorded from HEAD before the first edit, plus a Chromium cross-engine record. | G2 at preset defaults covers one size and seed per recipe; F1 shows engines agree today so the record can be compared in both. | W1, G2 |
| W-D03 | No existing `Gen` method body changes; new helpers are added as new methods; `_clearHit` gains a branch only for a new entry shape. | The RNG call order in `put/scatter/groves/pickVariant` and the `ok()` rules decide every Ancient layout (map 05 risk 1). | W1 |
| W-D04 | The merged prop catalog is the registry table `PROP_CATALOG`; `era` is the registry owner of the id, except ids flagged `any` in `PROP_FLAGS`; render-facing flags live only in `PROP_FLAGS`; sim-facing fields only in catalog rows. The Ancient catalog file stays FZ. | One rule for four eras; the `TINY NO_SHADOW THIN FLOAT` literals (`render/props.js:43-48`) become the Ancient overlay with identical content. | W2, AR 3.1.1 |
| W-D05 | `cover` is `true`, `false` or `'low'`. The sim normalises once: `p.cover = info.cover === true`, `p.lowCover = info.cover === 'low'`; `'low'` never enters the projectile height test. | `Prop.cover = info.cover` (`world.js:41`) is truthy-tested in `propBlocks` and `_indexProps`; an un-normalised `'low'` would stop every projectile below the prop's height. | W2, M12 |
| W-D06 | Oriented rectangular footprints `foot: {w, d}` are adopted for catalog class `building` only (aspect >= 1.4 or any side > 8 u). Circles stay the default; curtain walls stay circle chains (Troy pattern). The decision rule and re-check are in 3.2.5; spike S-D8 runs it in P0 before any Medieval recipe is written. | F5: circles fail the 3 % leak / 8 % phantom thresholds for elongated buildings, pass for walls and squares <= 8 u. q1_scope Q20 asked for a decide-by phase. | W2, D8 |
| W-D07 | Voxel sizes are 0.1 (T, S, M classes) and 0.2 (L, XL). 0.25 is not used. `spec.voxel` is threaded through `makeBuilder` and `finishModel`. | F4: a 12 x 12 x 14 u keep at 0.1 costs 870 ms and 259k tris, at 0.2 168 ms and 65k tris. Terrain cells are already 0.5 u (5 x a soldier voxel), so 0.2 is the smaller mismatch. | W2, CONTENT-Q27 |
| W-D08 | No sealed cavities. Large buildings have a filled core; hollow is allowed only for open-topped ruins, arcades and courtyards whose cavity is visible. A cavity lint enforces it. | F4: hollow saves voxels (2.4 x) but adds 29 % triangles and mesh time; voxel count is not the binding cost, triangles and build time are. | W2 |
| W-D09 | Budgets are per prop class (3.3.3) and per recipe (3.3.5): at most 35 stage-0 batches, near-field LOD0 triangles <= 420,000 (hard) / 250,000 (target), arena LOD0 <= 1.5M, prop draws <= 60 at the default camera. | F3 x 1.25 (plan section 0.4); Troy (45 batches, 335k) stays Ancient-exempt. | W9 |
| W-D10 | `registerPropModels(eraId, {MODELS, BUILDERS})` replaces the five static imports in `props/models/index.js`; duplicate type throws naming both eras. | Map 05 seam 3; AR 3.1.5 row. | W2 |
| W-D11 | Animated props are data: `PROP_FLAGS.<id>.spin = {axis, rate}` and `.lift` (u). A windmill is two props (tower + sails). Float stays `float: {kind, amp, w}`. | The renderer's batch model has one rigid part per prop; the existing `FLOAT` loop already rewrites matrices per frame. | W2 |
| W-D12 | Emitter kinds: `fire smoke ember` + `spark steam plasma`; an emitter record may carry `col`. | Map 05 seam 4; table 3.2.4. | W2 |
| W-D13 | Materials are index-addressed Uint8 bytes in blocks of 16: Ancient 0-15, Medieval 16-31, Modern 32-47, Sci-Fi 48-63, 64-255 spare. Each era supplies its full 16-row block (12 real + 4 reserved). The 16 Ancient rows move verbatim to the NEW leaf `era_ancient/materials.js`; `arena.js` composes `MATERIALS` from the registry. | AR-D21; AR's Ancient `data.js` export list omits `MATERIALS` and `WEATHERS` (6.2). | W3 |
| W-D14 | Material hazards are a lookup `MATERIAL_HAZARDS` (kinds `lava`, `acid`); the Ancient lava numbers (30 dps, speed x0.6, unwalkable) are its first row. | `hazards.js:13` scans `m[i] === 7`, `:131` and `:133` carry the literals, `nav.js:49`, `gen.js:219`, `terrainMesh.js:46` read `.hazard === 'lava'`. | W3 |
| W-D15 | `emissive` (>= 1) multiplies the terrain vertex colour; values above 1.25 lift the mesher clamp to the value so the HDR bloom (threshold 1.0, `post.js:77`) picks the cell up; the Ancient lava row keeps its literal 1.25 without a new field. | `terrainMesh.js:46,55` clamps to 1; bloom needs > 1. | W3 |
| W-D16 | `foot` becomes a working vocabulary for arenas whose `env.era` is set; Ancient arenas keep `STEP_BY_BIOME`. | `foot` is dead data today; the biome path is a G9-covered Ancient behaviour. | W3, CONTENT-Q25 |
| W-D17 | `env` gains `sky`, `gravity`, `era`; each is written only when it differs from the default, appended after `mood` in that order. | F12: `toJSON` writes `env` verbatim, so absent keys keep Ancient codes byte-identical. | W4 |
| W-D18 | `WEATHERS` appends `smog ion_storm ash spores` (indices 7..10). | spec/M 3.2 draft adds the first three; `spores` serves the alien jungle (one M row, 6.2). | W4 |
| W-D19 | Theme ids are canonical and era-prefixed (18 new). Legacy spellings stay stored as they are; aliases are resolved by new readers only. The v8 defect that Builder themes `egyptian` and `punic` match no music or ambience row stays unfixed (an optional DA-W1 is described, not applied). | `THEME_STYLE/ENERGY/AMB` have no `egyptian/punic` keys (`music.js:41-48`, `cues.js:209`); fixing it changes Ancient audio for Builder arenas (G9 policy). | W7 |
| W-D20 | Nav gets three views over one arena: ground (existing), hover, clear (vehicle clearance), the latter two on a 2 u coarse grid, plus a chamfer clearance map and `bottleneck()`. | spec/M M7: "2 coarse field pairs"; q3_engine residual 27. | W5 |
| W-D21 | Vehicle corridor: authoring target >= 6 free nav cells; enforced floor `bottleneck >= 3.0` (5 cells); `bossSafe` arenas >= 3.75; six-tank column and 20-wreck dynamic tests. | A corridor of 5 and of 6 cells both have centre clearance 3.0; tank r 2.2 needs r + 0.65 = 2.85. | W10 |
| W-D22 | Scale and tempo are a table of ceilings (3.7.1), a size policy (3.7.3), four deployment presets (3.7.4) and a first-contact metric with bands (3.7.5). | F6, F7, F10 and the geometry bound of 3.7.5. | W11 |
| W-D23 | Mission markers are not absolute coordinates: missions reference named recipe anchors or derive positions from props/zones (`world/anchors.js`). | Ancient missions hard-code `pharaoh_start x47 z4` (map 05 risk 1). | W8, MS |
| W-D24 | Every new recipe is symmetric (`g.sym`) or on a per-era S22 exemption list; at least 5 of 12 per era are symmetric. | Ancient: 7 of 15 symmetric; S22 bands 45-55 / 35-65. | W8 |
| W-D25 | Tall-building readability: visual height >= 4.5 u forbidden in the fight band; buildings in the band are 3.0..4.5 u; towers at the edge. | camera pitch 0.65 rad hides points behind a prop up to 1.33 x its height; Teutoburg glade pattern. | W8 |
| W-D26 | The castle technique (q1_scope Q20 / D11): breachable chain walls with towers and gate props; wall-walk archers are not built; an optional rampart platform behind the wall lets defenders shoot over a wall of height <= platform + 1.5 u. | Terrain cannot be breached; Troy already proves the chain. | W8, D11 |
| W-D27 | `LIMITS.propTypes` stays 41 per arena and is decoupled from the catalog size (it only equalled it by coincidence). | Deriving it from a 156-id catalog would lift the per-arena type cap past the batch budget. | W6 |
| W-D28 | Hidden-era content is absent from palettes, chips, templates and import acceptance, and its ids produce the same "newer game version" message as any unknown id. The sim and the generator resolve the full registry. | q3_program residual 29; spec/M 3.10 M0; hidden-era leak criterion (VF). | W6 |
| W-D29 | Theme change in the Builder applies the theme's look (sky, gravity, weather, fog, time) as ONE undo step; later control changes override it. | PRODUCT-Q24. | W6 |
| W-D30 | The arena library cap stays 48, shared by four eras; saving warns from 44 items or 2.0 MB; eviction stays oldest-first. | Adding a refusal would change Ancient behaviour (`Collection.put`, `store.js:91`). | W6 |
| W-D31 | Preset order inside an era is append-only after release; preset id equals recipe id. | `dailyPlan` indexes the list (map 05 seam 12); `Game._arenaFor` uses presetId as recipe. | W8 |

## 3. Detailed specification

### 3.1 gencore split (W1)

**3.1.1 Module boundaries.**

| file | owner | contents | imports |
|---|---|---|---|
| `src/world/gencore.js` NEW | WORLD | `class Gen` (verbatim `gen.js:25-311`), `inZone`, `distPoly`, `curve` (verbatim `:19-23, 315-324`), `RECIPE_IDS`, `registerRecipes`, `recipeFn`, `generate` (body of `generateArena`, `gen.js:810-828`), new helpers (3.1.4) | `./arena.js`, `../core/rng.js`, `../content/registry.js` (AR DAG: world may import the registry) |
| `src/world/gen.js` EDIT (PX) | WORLD | the 16 Ancient recipes `R.*` unchanged, `R.random` calling `recipeFn(pick)`, `registerRecipes('ancient', R)` at import, `export const RECIPES = RECIPE_IDS`, `export function generateArena(recipe = 'marathon', size = 'medium', seed = 1)` delegating to `generate`, `export { inZone }`, the dead `DECOR` constant stays | `./gencore.js`, `./arena.js`, `../core/rng.js` |
| `src/content/era_<id>/recipes.js` NEW x3 | WORLD | `export const RECIPES = {med_x: (g) => {...}}`; imports `../../world/gencore.js` helpers only | gencore |
| `src/content/era_<id>/arenas.js` NEW x3 (L0 leaf) | WORLD | the 12 preset rows (3.9) | none |

**3.1.2 Exports and API (exact).**

```js
// src/world/gencore.js
export class Gen { constructor(a, rng, nz) /* unchanged */ }
export function inZone(a, x, z, pad = 0);   export function distPoly(x, z, pts);   export function curve(f, x0, x1, n = 24);
export const RECIPE_IDS = [];                              // live array, insertion order, Ancient first; gen.js re-exports it as RECIPES
export function registerRecipes(eraId, map);               // map: {id: (g) => void}
export function recipeFn(id);                              // throws Error('Unknown arena recipe ' + id)
export function recipesOf(eraId);                          // ids registered by that era (Ancient tests use recipesOf('ancient'))
export function generate(recipe, size, seed);              // exactly the old generateArena body; sets a.anchors = g.anchors (non-serialised)
```
`registerRecipes` rules: `eraId` in `registry.eras()`; every id passes `registry.owner('recipe', id) === eraId` (data and function agree); duplicate throws `Error` with `.code = 'RECIPE_DUP'` and a message naming both eras; a call after `registry.freeze()` throws `RECIPE_LATE`; an id outside the id regex of AR 3.3.1 throws `RECIPE_ID`; `RECIPE_IDS.push` happens in map insertion order. `generate` keeps the post-recipe "never leave zones underwater" block verbatim. New-era worlds have no `random` recipe (a "random" tile picks a preset by the Quick/Daily stream, spec/CU).

**3.1.3 Golden net and step plan.** Every step ends green on all three nets before the next starts; COORD commits between steps.

| step | change | nets that must be green |
|---|---|---|
| 0 | record from HEAD (before any edit): `tests/fixtures/gen_golden.json` = G2's 16 hashes + 96 extension hashes (`engine: 'node'`) and `gen_golden_chromium.json` (the 46 equal entries of F1, extended to the 96) | recording signed by TOOLS-GOLDEN (author WORLD does not sign), entry in `golden_log.md` |
| 1 | create `gencore.js` by moving lines 19-324 of `gen.js` verbatim (diff check: the moved block equals the old block except the `PROP_CATALOG` binding); `gen.js` imports it; recipes untouched | G2 + extension (Node) |
| 2 | `Gen.info/fp/blocking/ok/put` read `registry.propCatalog()` instead of the Ancient import; Ancient rows are the same objects | G2 + extension, `tests/props/arenas.test.mjs` |
| 3 | add `RECIPE_IDS`, `registerRecipes`, `recipeFn`, `recipesOf`; `RECIPES` becomes the live array; `R.random` uses `recipeFn` with the same 8 picks and `g.rng.int(0, 7)` | G2 + extension; `RECIPES.slice(0, 16)` equals the v8 array |
| 4 | append the new `Gen` helpers (3.1.4); `_clearHit` gains the rect entry branch | G2 + extension (no Ancient recipe calls a helper) |
| 5 | era `recipes.js` + `arenas.js`; `packs.js` registers them | recipe contract (WC12) per era, WC20 in Chromium |

**3.1.4 New `Gen` helpers (append-only; none changes RNG consumption of an existing call).**

| helper | signature | behaviour | RNG |
|---|---|---|---|
| `deploy` | `g.deploy(kind, {depth, shape})`; kind in `tight std wide deep` (3.7.4) | calls `setZones` with the preset's frac/width; returns `{frontGap}` and stores it for WC15 | none |
| `anchor` | `g.anchor(name, x, z, r = 2)` | records `g.anchors[name]`; the preset's `anchors` list must equal the recorded names | none |
| `keepClearRect` | `(cx, cz, hw, hd, rot)` | pushes a 6-element entry `[cx, cz, hw, hd, rot, pad]` honoured by `_clearHit` | none |
| `road` | `(pts, w, mat, {level})` | paints a polyline of width w, optionally `levelStrip`s it, adds `keepClearPath` | none |
| `rectField` | `(cx, cz, hw, hd, rot, fn)` | calls `fn(cx, cz, i, j)` for every cell of an oriented rectangle (stamps, floors, pits) | none |
| `flatRectRot` | `(cx, cz, hw, hd, rot, target, margin)` | oriented `flatRect` | none |
| `moat` | `(pts, w, bank, floorSteps)` | carves a channel below the single water plane; sets `a.water` once; the channel is deep (> 0.8 u) so it is impassable | none |
| `bridge` | `(x0, z0, x1, z1, w, mat, rail)` | planks/deck cells across a gap, rail props at both edges; throws if `w < 6` for recipes flagged `vehicles` | none |
| `wall` | `(type, pts, {towerEvery, towerType, gateAt, gateType, footing})` | chain of touching props at spacing `2 * r * 0.995 * s`, `levelStrip` footing, towers, a gate gap with the gate props; returns the pieces so anchors can name them | none |
| `block` | `(type, cx, cz, rot, {v, s})` | places a `foot` building (`raw`, forced, with its rect in `keepClearRect`) | none |
| `cityGrid` | `({cols, rows, pitchX, pitchZ, street, lot})` | streets as `road`, lots as `block` calls from `lot(i, j, g)`; returns the lots | via `lot` only |
| `trench` | `(pts, w, depthSteps)` | carves steps <= 2 per cell with ladder ramps every 12 u so a unit can climb (neighbour mean-height diff <= 1.0 u) | none |
| `rampart` | `(pts, w, steps)` | raised platform with 1:2 ramps at both ends and at towers | none |
| `fightBand` | `(frac = 0.22)` | returns a predicate `inBand(x, z)`: `abs(z) <= frac * W` across the zone axis, used by the readability rule | none |

### 3.2 Merged prop catalog, flags, footprints (W2)

**3.2.1 Row schema (`PROP_CATALOG`, sim-facing).** Existing fields `cat r h hp blocks cover flam place scale name` keep their meaning. New optional fields (absent = legacy behaviour; a test asserts the 41 Ancient rows have none of them):

| field | type, range | meaning | consumer |
|---|---|---|---|
| `cover` | `true / false / 'low'` | W-D05 | `Prop`, M9 |
| `foot` | `{w, d}` full extents in u at scale 1, each 0.6..24, `blocks` must be `'full'`, class `building` only | oriented rectangle centred on the prop, rotated by the arena prop's `r` | nav stamp, `propBlocks`, `damageProps`, gen `fp/ok`, editor paths/view3d |
| `gate` | bool | owner team passes (M12) | sim |
| `coalesce`, `explosive {r, dmg}`, `decor`, `wreck`, `ttl`, `pad` | per spec/M M12 | structures, wrecks, teleport pads | sim |
| `class` | `'T' 'S' 'M' 'L' 'XL'` | budget class of 3.3.3 (lint cross-checks the model) | contracts |
| `era` | era id | optional; must equal the registry owner (checked), or be absent | contracts |

`PROP_FLAGS` (render-facing, one idmap for all eras, rows may be partial): `tiny noShadow thin` (bool), `float {kind: 'water' or 'sky', amp, w, lift}`, `spin {axis: 'x' 'y' 'z' (model frame), rate rad/s}`, `lift` (u at scale 1, constant elevation), `breach` (bool: counts for the `destroy` objective, replaces `OBJECTIVES.destroy.props = ['gate_door']`), `era: 'any'` (appears in every era tab). Ancient overlay content: `tiny` = the 14 ids of `props.js:43`, `noShadow` = the 8 of `:44`, `thin` = the 15 live ids of `:46` (`tree_palm` there is not a catalog id: a dead entry the test drops), `float` = `ship`, `cloud_island` (rows verbatim from `:48`), `breach` = `gate_door`, `era: 'any'` = `tree_oak tree_pine tree_dead palm bush rock_small rock_big log cactus reeds wheat campfire fire_pit crate barrel` (15). Test `tests/props/flags_identity.test.mjs` rebuilds the four old sets from `PROP_FLAGS` and deep-equals the literals frozen in the test.

**3.2.2 Era counts and categories.** Targets per plan section 1: 38 new props per era (floor 34); with the 15 `any` ids an arena palette in one era shows about 53. Categories (registry `prop_category` list, ids prefixed): Medieval `med_castle` (walls, gates, towers, keep, hoardings, drawbridge), `med_folk` (cottages, stalls, banners, windmill, hay, bridges); Modern `mod_city` (shops, offices, lamps, cars), `mod_cover` (sandbags, barriers, wire, tank traps, hedges), `mod_works` (rail, cranes, containers, hangars, tanks of fuel); Sci-Fi `sf_base` (modules, domes, pads, pylons), `sf_flora` (alien plants, spore pods), `sf_tech` (reactor, crashed hull, wrecks, force walls). Class mix per era (counts add to 38): T 8, S 12, M 11, L 6, XL 1. The four Ancient categories stay.

**3.2.3 Registry and consumers.** `propInfo(type)`, `PROP_CATALOG`, `PROP_CATEGORIES` come from the registry (AR 3.1.7 row 4; the 14 `src` importers and 11 test/tool importers are listed in map 05 section 3). The sim resolves props from the FULL registry, hidden eras included (spec/M 3.10 M0). `Arena.fromJSON` and the generator stay tolerant: an unknown id is kept as data. The load boundaries are strict: `fromDoc`, `importShare`, `Game._arenaFor` for `a.data` (unknown id -> `ValidationError` / load error with the 3.10.4 message), and `World._buildProps` throws `Error('Unknown prop type ' + t)` when `world.strictProps` is true (tests, `tools/contracts.mjs`); the production default keeps today's silent skip (radius 0) so no Ancient world changes.

**3.2.4 Emitters.** Model emitters are `{kind, x, y, z, col?}` in `meta.emitters` (kit `Pen.emit(x, y, z, kind, col)`). The renderer table (`render/props.js:563-565` becomes data):

| kind | effect | rate at tier 1 | notes |
|---|---|---|---|
| `fire`, `smoke`, `ember` | unchanged (`:563-565`) | unchanged | Ancient identical |
| `spark` | `fx.sparks(x, y, z, 1, col or 0xffd27a, 1.0)` | 0.4 per frame | welding, broken cables |
| `steam` | `fx.smoke(x, y, z, 1, col or 0xd8dde6)` slow rise, short life | 0.5 per frame | pipes, kettles, vents |
| `plasma` | `fx.sparks(x, y, z, 1, col or 0x35e0ff, 0.6)` plus a GLOW voxel in the model | 0.35 per frame | reactors, pylons |

Visible emitters are capped by the tier `fx` factor (`PROP_TIERS`) and by 24 per arena (contract). Point lights stay the existing 2-light pool (only `fire` drives lights).

**3.2.5 Oriented footprints: sim contract, experiment, decision rule (D8).**

*Sim contract (request `world_prop_foot.md`, lands with M12).* `Prop` gains `fw = 0.5 * foot.w * s`, `fd = 0.5 * foot.d * s` (0 for circles) and `radius = hypot(fw, fd)` (the circumscribed radius, so every broad-phase user keeps working); exact tests: (1) `NavGrid.stampProp` stamps a cell iff the distance from its centre to the rectangle (rotated by `rot`) is <= 0.35 (the circle rule `r + 0.35` becomes a rounded rectangle); circles keep the existing arithmetic; (2) `propBlocks` uses the rectangle test for `fw > 0`; (3) `damageProps` and `hurtProp` splash use the distance to the rectangle; (4) `_indexProps` indexes the bounding box; (5) `nearestSoftProp` and breach targeting use the circumscribed radius. Helpers `footOf(info, s)`, `insideFoot`, `distToFoot` are exported from `world/nav.js` (already in the sim's import allowlist, no DAG change) and used by `gen.js fp/ok`, `editors/arena/paths.js:19,179,268`, `view3d.js:283`, `tests/props/arenas.test.mjs navOf`.

*Experiment S-D8 (`tools/spikes/d8_footprint.mjs`, P0, owner SPIKE; the throwaway code never lives in `src/`).* Layouts: L1 a 40 u curtain wall with a 12 x 6 u gatehouse; L2 a 4 x 4 block grid, buildings 8 x 8, 10 x 6, 6 x 6, pitches 12..16 u, rotations 0 and 0.52 rad; L3 a hedge lattice. Variants: V-chain (circles spacing 2r), V-in (inscribed circle), V-out (circumscribed circle), V-rect (`foot`). Metrics on the real `NavGrid` and `FlowField`: **leak** (share of true-footprint nav cells left unblocked), **phantom** (share of blocked cells farther than 0.85 u from the true footprint), **street run** (free cells across an alley at pitch 14), **bottleneck** (3.6.3), prop count, stamp time. Thresholds: leak <= 3 %, phantom <= 8 %, street run >= 6, bottleneck >= 3.0.
*Decision rule.* A prop class uses `foot` iff its best circle variant fails any threshold. Probe results already in hand (F5): V-chain passes for walls; V-in/V-out fail for 10 x 6 (leak 46.7 %, phantom 23.3 %, street 2 cells for V-out) and V-in leaks 6.3 % at 8 x 8; so verdict **YES for class `building`**. S-D8 re-runs on the real 12 + 12 + 12 layouts in P0; if the verdict flips to NO, the fallback is: buildings restricted to squares <= 8 u at circle-inscribed plus four corner pillars, elongated buildings forbidden (cost: fewer Modern/Sci-Fi building shapes), and `foot` is deleted from the schema before any era arena ships. The verdict file is `docs/eras/spikes/s_d8.md` signed by REVIEWER.

### 3.3 Prop models, voxel size, budgets (W2, W9)

**3.3.1 Registry (`registerPropModels`).**

```js
// src/content/era_ancient/props/models/index.js (AP-C03)
export function registerPropModels(eraId, mod);        // mod = {MODELS, BUILDERS}; throws Error('prop model collision: <type> in <a> and <b>') ; before registry.freeze() only
// SPECS/BUILD become module-level maps filled by registerPropModels('ancient', ...) at import; PROP_MODEL_IDS is the same mutated array.
// spec = { variants (1..4), indestructible?, voxel? (0.1 default, 0.2), cls? ('T'..'XL'), pal, build(v, rng), damage?, rubble?, afterRubble?, rubbleAlias? }
// kit.js: finishModel(id, pen, extra) -> new ModelDef(id, extra.voxel || VOX); emitter coordinates multiply by that voxel size; meta gains {voxel, cls}.
// makeBuilder(type, spec) passes spec.voxel and spec.cls into finishModel.
```
`tools/gen-registry.mjs` globs `era_<id>/props/models` per era (`registry.era_<id>.js`). All spec dimensions (`rubble w d h`, Pen sizes, emitter positions) stay in voxels; authors use `U = 1 / spec.voxel` (kit exports `unitsPer(voxel)`). `tests/props/models.test.mjs` loops the merged catalog per era and replaces `voxelSize === 0.1` by `voxelSize === spec.voxel`.

**3.3.2 Evidence for 0.1 vs 0.2 (F4) and the mixed-size experiment S-VOX.** Cost scales with solid voxels (0.23 ms per 1,000) and with surface area (tris = 2 x area / voxel^2). Rule: a prop with longest side > 8 u or height > 10 u is class L/XL and uses 0.2. *S-VOX (`tools/spikes/vox_mixed.mjs` + `tests/visual/props_demo.js` template, P0):* sheets of a hum1 soldier row beside (a) a 0.2 keep with a door and windows, (b) the same keep capped to 8 x 8 x 9 u at 0.1; metrics build+mesh ms and tris (F4 reproduced), door height >= 3.2 u and window >= 1.2 x 1.6 u, no feature thinner than 2 voxels (0.4 u); judged by a 3-agent panel (grain coherence 1..5) + REVIEWER. Decision threshold: 0.2 stays unless the panel median < 3.5; then L props shrink to <= 8 x 8 x 9 u at 0.1 (class M) and the XL class is dropped. The verdict file is `docs/eras/spikes/s_vox.md`. The judgement is model-judged and is listed in the VF unverified section.

**3.3.3 Class budgets (per model, any stage 0 variant, Node reference box).**

| class | definition | voxel | grid cells <= | solid voxels <= | LOD0 tris <= | build+mesh ms <= | per recipe |
|---|---|---|---|---|---|---|---|
| T | longest side <= 1.2 u and height <= 1.6 u | 0.1 | 20,000 | 2,400 (1 LOD) | 3,500 | 25 | any |
| S | side <= 3 u, height <= 4.5 u | 0.1 | 120,000 | 12,000 | 14,000 | 60 | any |
| M | side <= 8 u, height <= 10 u | 0.1 | 200,000 | 65,000 | 32,000 | 120 | any |
| L | side <= 16 u, height <= 14 u (0.2 mandatory above M) | 0.2 | 400,000 | 260,000 | 70,000 | 200 | <= 6 types |
| XL | side <= 28 u or height <= 20 u | 0.2 | 700,000 | 500,000 | 90,000 | 350 | <= 2 types, <= 3 instances |

Calibration: Ancient tower (M) 128k cells / 61k solid / 30k tris, tree_oak 121k / 22k / 14k, the F4 keep (L) 252k / 231k / 65k. Stage 1 has fewer voxels than stage 0; stage 2 (rubble) <= 3,000 voxels and <= 2.2 u high. Ancient pyramid and temple exceed these and are exempt (FZ). `lodCountFor` (`<2400: 1, <9000: 2, else 3`) is unchanged; at 0.2 the LODs are 0.4 and 0.8 voxels, so every L/XL model passes the `downsample2` far-mesh lint (spec/RA) with its defining features >= 3 voxels wide.

**3.3.4 Cavity lint (`tests/props/cavity.test.mjs`).** Flood-fill the empty cells of the grid from outside; any empty region not reached with volume > 8 voxels fails. Filled cores, open-top ruins, arcades and door/window-vented rooms (the region touches the outside) pass.

**3.3.5 Per-recipe prop budgets (`tools/prop_budget.mjs`).**

| metric | definition | limit | Ancient measured |
|---|---|---|---|
| B0 | distinct (type, variant mod variantCount) among stage-0 props | <= 35 | 13..45 |
| variants | variants used per type | <= 2 for M-with-tris > 10k, L, XL; <= 4 else | n/a |
| near26 | sum of LOD0 tris of props within 26 u of the arena centre | <= 250,000 target, <= 420,000 hard | 17k..335k |
| total | sum of LOD0 tris of all props (Teutoburg-style 10M is the all-near bound, not a gate) | <= 1,500,000 | 0.12M..1.19M |
| summs | sum of build+mesh ms over the distinct batches (first-sight hitch) | <= 700 | n/a |
| instances | props per arena | <= 1,100 target, 1,500 hard | 28..984 |
| emitters | emitting props per arena | <= 24 | 4..12 |
| spinners | props with `spin` per arena | <= 24 | 0 |
| drawsProps | `PropRenderer.stats().drawCalls` at the default camera, Marble, 16+16 unit types (Chromium) | <= 60 after the 52-draw governor | marathon 39, troy 84 meshes |
| dmgBatches | extra batch keys created by stages 1 and 2 over a 40-battle fuzz, p95 | <= 12 | n/a |

`spec.rubbleAlias` (optional) lets several L/XL types share one stage-2 model so rubble batches merge (RENDER request R-W6; not required to ship).

**3.3.6 Animated props.** `spin` and `lift` rewrite the instance matrix per frame exactly like the `FLOAT` loop (`props.js:504-508`): matrix = T(position + lift * s) * Ry(yaw) * R_axis(rate * t + phase) * S. Reduce Motion freezes spin at phase 0 (spec/CU flash and motion rules). A windmill is `med_windmill` (static tower) + `med_windmill_sails` (`blocks: 'none'`, `lift` = tower top, `spin {axis: 'z', rate: 0.6}`) placed by `g.raw` at the same x, z; the recipe asserts both exist (anchor `windmill`). A radar dish is `mod_radar_dish` with `spin {axis: 'y', rate: 0.9}` on a mast prop.

### 3.4 Materials (W3)

**3.4.1 Row schema and composition.**

```js
// era row: {id, key, name, top:[3 hex], strata:[2 hex], speed, foot, flammable, hazard?, emissive?, era?, reserved?}
// src/world/arena.js: export const MATERIALS = composeMaterials(registry.appended('material'))   // length 64 once all four blocks exist
// each era block is complete: 12 real rows + 4 padding rows {id, key:'reserved_<id>', name:'(reserved)', top/strata/speed/foot of grass, reserved:true};
// composeMaterials throws unless ids are contiguous from 0 and each block starts at its base (AR-D21).
export const MAT = Object.fromEntries(MATERIALS.map((m) => [m.key, m.id]));     // new keys are era-prefixed
```
`unrle(o.m, a.m, MATERIALS.length - 1)` keeps its form; bytes above the highest defined id clamp to it as today. A byte that names a reserved row renders and behaves as grass (speed 1, foot `grass`); the Builder never paints reserved rows and `sanitizeArena` leaves them (a future version may define them). The 16 Ancient rows live in `src/content/era_ancient/materials.js` (NEW leaf, content verbatim from `arena.js:14-29`); `tests/world/materials.test.mjs` deep-equals them against a frozen copy of the v8 literals (index, key, name, colours, speed, foot, flammable, hazard). The Ancient lava row gets no `emissive` field; the mesher default is `mat.emissive ?? (mat.hazard === 'lava' ? 1.25 : 1)`.

**3.4.2 The 36 new materials.** Colours are `0xRRGGBB`; `top` has the three per-cell variants chosen by hash (`terrainMesh.js:35`); speed multiplies movement (`nav.js:50,60`); `fl` = flammable (spawns fire patches in `igniteAt`); `foot` vocabulary: Ancient `grass dirt sand stone snow mud wood` + `gravel metal tile dust ice`.

Medieval, block 16-31 (28-31 reserved):

| id | key | name | top | strata | speed | foot | fl | other |
|---|---|---|---|---|---|---|---|---|
| 16 | med_flagstone | Flagstone | a39e94 9a958b aca79d | 7f7a70 6c675e | 1.08 | stone | - | |
| 17 | med_lists_sand | Tourney Sand | d8c08a cfb680 e0c993 | b99f68 9d8858 | 0.95 | sand | - | |
| 18 | med_heather | Heather | 7b5f86 72587e 866a90 | 5c4a40 4f4a47 | 0.90 | grass | yes | |
| 19 | med_bog | Bog Mud | 4a4a2c 424226 535334 | 3a3a22 33331f | 0.62 | mud | - | |
| 20 | med_scree | Ash Scree | 6e6a68 655f5e 78726f | 57534f 48443f | 0.85 | stone | - | |
| 21 | med_hay | Trampled Hay | c7a95a bd9f52 d1b366 | 9c8447 7e6a3a | 0.95 | grass | yes | |
| 22 | med_silt | Moat Silt | 56603f 4e5739 5f6a47 | 434b30 383e29 | 0.70 | mud | - | |
| 23 | med_old_cobble | Old Cobbles | 8f8a80 858076 99948a | 706c63 5f5b53 | 1.10 | stone | - | |
| 24 | med_basalt | Basalt | 4a4a52 42424a 52525b | 38383f 2b2b31 | 0.92 | stone | - | |
| 25 | med_bluebell | Bluebell Meadow | 5a8f5c 5b8e5f 7a8cc0 | 6b5a3a 5e5a50 | 1.00 | grass | yes | |
| 26 | med_boards | Weathered Boards | 8a6a44 7f6340 94734b | 6a5034 594229 | 1.05 | wood | yes | bridge decks |
| 27 | med_chapel_tile | Chapel Tile | b5703f a9673a c07a47 | 8f5832 774a2b | 1.05 | stone | - | |

Modern, block 32-47 (44-47 reserved):

| id | key | name | top | strata | speed | foot | fl | other |
|---|---|---|---|---|---|---|---|---|
| 32 | mod_asphalt | Asphalt | 4b4d52 45474c 53555a | 3a3b3f 2f3033 | 1.15 | stone | - | roads |
| 33 | mod_concrete | Concrete | 9a9b9c 909192 a4a5a6 | 7a7b7c 666768 | 1.05 | stone | - | |
| 34 | mod_paving | Paving Slabs | b4aca0 aaa296 beb6aa | 8f887d 777168 | 1.08 | stone | - | |
| 35 | mod_ballast | Rail Ballast | 7b786f 726f67 858277 | 625f58 504e48 | 0.90 | gravel | - | |
| 36 | mod_steel_deck | Steel Deck | 7d8791 737d87 87919b | 5f6872 4a525b | 1.10 | metal | - | bridges |
| 37 | mod_duckboard | Duckboards | 8b7048 806641 967a50 | 6c5636 5a4629 | 1.00 | wood | yes | trenches |
| 38 | mod_trench_mud | Trench Mud | 4d3d28 453722 57452d | 3b2f1f 30281c | 0.75 | mud | - | |
| 39 | mod_stubble | Stubble Field | c2ad5c b8a455 ccb868 | 93803f 6f6234 | 0.98 | grass | yes | |
| 40 | mod_felt | Felt Green | 3f8a4a 3a8044 479552 | 2f6a39 275a30 | 1.00 | grass | - | parade, lawn |
| 41 | mod_lino | Lino Tile | cfc8a6 c4bd9b d8d1b0 | a8a283 8c8769 | 1.10 | tile | - | indoor-style floors |
| 42 | mod_gravel | Gravel | a09a8e 968f84 aaa498 | 7d786e 66625a | 0.93 | gravel | - | |
| 43 | mod_runway | Runway | 6d6f72 65676a 76787b | 56575a 45464a | 1.15 | stone | - | |

Sci-Fi, block 48-63 (60-63 reserved):

| id | key | name | top | strata | speed | foot | fl | other |
|---|---|---|---|---|---|---|---|---|
| 48 | sf_regolith | Lunar Regolith | b9b6b0 aeaba5 c3c0ba | 8f8c86 6f6d68 | 0.90 | dust | - | |
| 49 | sf_hull | Hull Plate | 8f9aa8 859099 99a4b2 | 6c7682 56606b | 1.10 | metal | - | |
| 50 | sf_grate | Deck Grating | 5a6470 525c68 636d79 | 434b55 343b44 | 1.05 | metal | - | |
| 51 | sf_neon_cyan | Neon Cyan | 19e5ff 14d6f0 2af0ff | 0b6f80 08454f | 1.10 | metal | - | emissive 1.6 |
| 52 | sf_neon_pink | Neon Magenta | ff2fb5 f024a8 ff4bc2 | 7d1559 4d0d37 | 1.10 | metal | - | emissive 1.5 |
| 53 | sf_moss | Alien Moss | 6a3fb0 5f3aa3 7545be | 3f2a66 2e2048 | 0.95 | grass | - | |
| 54 | sf_spore_soil | Spore Soil | 2f6b55 2a6250 377860 | 1f4a3b 173a2e | 0.85 | mud | - | emissive 1.15 |
| 55 | sf_ice | Glacier Ice | b7e3ee aedde9 c2eaf4 | 8cbfcf 6a9bb0 | 1.08 | ice | - | no slip (sim has none) |
| 56 | sf_ember_basalt | Ember Basalt | 2b2528 252023 332c2f | 1d181a 141011 | 0.90 | stone | - | emissive 1.35, walkable |
| 57 | sf_acid | Acid Pool | 9bff3a 8ff230 a8ff52 | 4d8a1c 2f5410 | 0.70 | mud | - | hazard `acid`, emissive 1.4 |
| 58 | sf_crystal | Crystal Floor | 8a6bff 7e60f2 9878ff | 5238b8 3a2680 | 1.00 | stone | - | emissive 1.25 |
| 59 | sf_lab_tile | Lab Tile | dfe6ea d3dce1 e8eef1 | b4bfc6 95a1a9 | 1.10 | tile | - | |

Rules: speeds stay in 0.62..1.15 (Ancient 0.6..1.12); `nav.js:60` floors at 0.4. Era legality: a recipe of era E may paint Ancient ids 0-15 only from the generic subset `grass dirt sand stone snow mud planks brick cobble ash moss lava` plus its own block. VB palette inputs (q3_program residual 28): `top` and `strata` of every row are the arena palette; `materialShare(arena) -> Float32Array(64)` (exported from `world/vocab.js`, share of cells per id) lets the VB distance test weight them per time-of-day grade. Row-level tests (`materials.test.mjs`): ids equal indices, blocks complete (16 each), keys unique and era-prefixed, speed range, three distinct `top` colours with pairwise CIEDE2000 >= 2, emissive only 1.0..1.6, `reserved` rows never painted by a recipe, every non-reserved key has a Builder label.

**3.4.3 Hazard lookup (replaces the lava literals).**

```js
// src/world/vocab.js
export const MATERIAL_HAZARDS = {
  lava: { walk: false, dps: 30, slow: 0.6, cause: 'lava',   avoid: true },   // = hazards.js:133 (30 * dt, mEnv 0.6), nav.js:49 unwalkable
  acid: { walk: true,  dps: 9,  slow: 0.7, cause: 'poison', avoid: true },   // new; cause is in the legacy closed vocabulary
};
```
Consumers: `nav.rebuild` marks `walk = 0` iff the hazard has `walk: false`, and writes `nav.mhaz[i] = 1` for `avoid` hazards (a separate array: `applyProps` resets `nav.hazard` every call, so material hazards must not live there); `FlowField.compute` adds the same +8 cost for `mhaz`; `gen.js:219` `ok()` keeps rejecting `walk: false` kinds (and rejects `acid` cells for props); `hazards.js` constructor replaces `m[i] === 7` by `MATERIALS[m[i]].hazard === 'lava'` and builds `matHazCells` from the lookup, `_liquid` reads dps/slow/cause from the row (Ancient: 30 and 0.6 exactly, G1 lava battles). The scan loop and the lookup run once per World. SIM request `world_hazards_lookup.md`.

**3.4.4 Emissive and HDR (RENDER request R-W3).** `terrainMesh.js`: `const em = mat.emissive ?? (mat.hazard === 'lava' ? 1.25 : 1); const cap = em > 1.25 ? em : 1;` top colours use `Math.min(cap, top * AO * em)`; side bands keep `mat.hazard === 'lava' ? 1.15 : 1` for the Ancient row and use `1 + 0.6 * (em - 1)` otherwise. The Ancient output is unchanged (cap 1, em 1.25). Test: `tests/terrainmesh.test.mjs` hash of the 16 presets equal before/after (G8 tolerance not needed, vertex arrays equal).

**3.4.5 Foot.** `audio/cues.js` step selection: if `arena.env.era` is set, use `MATERIALS[m].foot` under the unit (one array read per step) mapped to `step_grass step_stone step_sand step_snow step_mud step_dirt step_wood` (existing) and `step_gravel step_metal step_tile step_dust` (AUDIO adds; `ice` maps to `step_snow`); else `STEP_BY_BIOME[arena.biome]` exactly as today. Request `world_foot_cues.md` (AUDIO). Biome vocabulary for new recipes: Ancient six + `gravel metal tile dust ice`.

### 3.5 Env additions, weather, themes (W4, W7)

**3.5.1 Env keys.** Default literals at `arena.js:51` and `:147` are unchanged. `sanitizeEnv` (after `mood`, in this order):

```js
if (typeof e.sky === 'string' && SKY_IDS.includes(e.sky) && e.sky !== 'earth') out.sky = e.sky;      // unknown or default: dropped silently
if (typeof e.gravity === 'number' && Number.isFinite(e.gravity)) { const g = clamp(Math.round(e.gravity * 100) / 100, 0.2, 1.5); if (g !== 1) out.gravity = g; }
if (typeof e.era === 'string' && ERA_IDS.includes(e.era) && e.era !== 'ancient') out.era = e.era;
```
`toJSON` needs no change (verbatim env, keys only present when set); `fromJSON` merges `Object.assign(defaults, sanitizeEnv(o.env))` so key order is `time weather fog theme wind mood sky gravity era`; `clone()` (JSON round trip) preserves them; the session snapshot (`session.js:113-124`) clones `env` whole, so undo and drafts carry them. `SKY_IDS` (engine vocabulary, `world/vocab.js`): `earth space violet green neon ember pale` (rows are RENDER's `THEME_LOOK`/sky presets; `earth` = today's computed day/dusk/night). `weather` stays whitelisted by `WEATHERS`; `era` in `ERA_IDS` of the registry (hidden eras included: a hidden era id in a code is accepted as data and ignored by the UI, so the sanitizer is never release-dependent). Gravity presets (Builder chips): `earth 1.0`, `dusty 0.7`, `moon 0.4`, `heavy 1.25`; the sim clamps `[0.2, 1.5]` (spec/M M15). Tests: Ancient codes byte-identical (WC08), hostile values (NaN, Infinity, strings, huge) clamp or drop, `clone()` equality.

**3.5.2 Weather.** `WEATHERS` = `clear cloudy rain storm snow sandstorm fog` + `smog ion_storm ash spores`. Era tags (Builder lists weathers of released eras only): `smog` modern, `ion_storm` scifi, `ash` any, `spores` scifi. Sim rows: spec/M 3.12 (`smog ion_storm ash`) + `spores` `{speed 1, spread 1.0, vis 0.9}` (6.2). Render rows R8: `smog` = fog tint + no particles, `ion_storm` = streaks + flash-limited arcs, `ash` = slow grey cubes, `spores` = rising teal motes; `engine.js:159` grey table `smog 0.55, ion_storm 0.85, ash 0.7, spores 0.4`. Consumers to extend: `sim/world.js:910 weatherMods` (SIM), `render/weather.js KINDS`, `render/engine.js:159-177`, `editors/arena/strings.js:76-77`, `ui/strings.js:52-53`, new tips (spec/H).

**3.5.3 Theme vocabulary (one registry kind `THEMES`, AR 3.3.1).** Row: `{id, era, label, aliases[], biome, look: {sky, gravity, weather, time, fog}, music: styleTags, amb: ambienceId}`; `look` is the Builder preset (W-D29) and RENDER's `THEME_LOOK` key; `music`/`amb` are AUDIO's to finalise (`THEME_STYLE/ENERGY/AMB` get one row per id).

| id | label | look: sky / gravity / weather / time / fog |
|---|---|---|
| med_meadow | Meadow | earth / 1.0 / clear / 10 / 0.20 |
| med_castle | Castle | earth / 1.0 / cloudy / 16 / 0.22 |
| med_village | Village | earth / 1.0 / clear / 9 / 0.25 |
| med_forest | Forest | earth / 1.0 / fog / 7 / 0.30 |
| med_moor | Moor | earth / 1.0 / fog / 14 / 0.35 |
| med_crag | Crag | ember / 1.0 / ash / 17 / 0.25 |
| mod_city | City | earth / 1.0 / clear / 15 / 0.20 |
| mod_field | Field | earth / 1.0 / clear / 11 / 0.15 |
| mod_industrial | Industrial | earth / 1.0 / smog / 14 / 0.30 |
| mod_water | Waterfront | earth / 1.0 / cloudy / 12 / 0.25 |
| mod_air | Airfield | earth / 1.0 / clear / 10 / 0.12 |
| mod_desert | Desert | earth / 1.0 / clear / 13 / 0.20 |
| sf_moon | Moon | space / 0.4 / clear / 12 / 0.05 |
| sf_station | Station | space / 1.0 / clear / 0 / 0.10 |
| sf_neon | Neon City | neon / 1.0 / smog / 22 / 0.35 |
| sf_jungle | Alien Jungle | green / 0.85 / spores / 19 / 0.40 |
| sf_ice | Ice World | pale / 0.7 / snow / 11 / 0.30 |
| sf_ember | Forge World | ember / 1.25 / ion_storm / 20 / 0.35 |

Legacy spellings (stored values never rewritten): presets/Builder `greek roman egyptian persian punic barbarian alpine mythic`, recipes/audio `egypt carthage styx olympus`. Aliases (registry `aliases`): `egyptian -> egypt`, `punic -> carthage`. `canonTheme(t, {legacy})` (in `world/vocab.js`): new readers (THEME_LOOK, Builder grouping, era derivation) call it with `legacy: true`; the audio readers (`music.js THEME_STYLE`, `cues.js THEME_AMB`) keep calling nothing, so Ancient audio is bit-identical (G9). Optional DA-W1 (not applied): make the audio readers call `canonTheme(t, {legacy: true})`; effect confined to Builder arenas saved with `egyptian/punic`; needs two signatures and a G9 fixture; decided by COORD at P4. The Builder `THEMES` list for the Ancient chip stays the 8 v8 words; era chips list their 6 canonical ids.

### 3.6 Nav, clearance, vehicle corridors (W5, W10)

**3.6.1 Constants and API (`src/world/nav.js`; names agree with M-layers OI-2).**

```js
export const NAV = 1.0;                                      // ground cell (u); instances carry this.cell
export const NAV_CLASS = { GROUND: 0, HOVER: 1, CLEAR: 2 };  // markNavDirty classMask bits: 1 << class (M-layers groups HOVER and CLEAR as the coarse pair, bit 1)
export const CLEAR_NEED = 3.0, BOSS_NEED = 3.75;             // chamfer clearance in nav cells: r + 0.65 rounded up to 0.25 (r 2.2 -> 2.85 -> 3.0; r 3.0 -> 3.65 -> 3.75)
class NavGrid {
  constructor(arena, opts = {})   // opts.kind 'ground' (default, Ancient arithmetic: cell = NAV exactly) / 'hover' / 'clear'; opts.cell 1 (ground) or 2 (hover, clear)
  rebuild(rect)                   // kind-specific walk rule below
  applyProps(props, hazards)      // unchanged for circles; rect props via stampProp
  stampProp(p) / unstampProp(p)   // spec/M M12; circle arithmetic unchanged, rect: footprint rule of 3.2.5; writes block/soft/gateTeam
  buildClear()                    // chamfer distance map `clear` (Float32Array), 3.6.2
  bottleneck(ax, az, bx, bz, soft = 'passable')   // widest-path clearance, 3.6.3
}
export function footOf(info, s); export function insideFoot(f, x, z, px, pz, rot, pad); export function distToFoot(f, x, z, px, pz, rot);
```
`FlowField.compute(sources, count, maxDist, extra, team)` works unchanged on any NavGrid instance (it only reads `n walk block soft cost hazard hs`); `FlowField.dir/distAt` use `nav.cx/cz`, so the cell size lives in the instance (`this.cell`; ground path divides by 1.0, so results are bit-identical). `NavGrid.rebuild` for `kind: 'ground'` is the current code plus `mhaz` and the `MATERIAL_HAZARDS` walk rule.

| view | cell | walk rule | blockers | used by |
|---|---|---|---|---|
| ground | 1 u | current rule: 2 x 2 terrain block spans <= 3 steps, not deep water (> 0.8 u), not lava plane, not `walk: false` material | `block`, `soft`, hazards | all ground units (Ancient unchanged) |
| hover | 2 u | slope rule relaxed to <= 6 steps over the 4 x 4 terrain block; water and lava depth ignored; `walk: false` materials allowed | `block` and `soft` props (not passable), buildings | hover tanks and hover scouts |
| clear | 2 u | ground walk AND ground `clear >= need` at the cell centre (sampled from the fine map); `need = CLEAR_NEED`, or `BOSS_NEED` for a second instance built only when a def of radius > 2.35 exists | as ground; `soft` counted passable for pathing (breach) | vehicles with radius > 0.9, bosses |

Coarse views are derived from the fine arrays by 2 x 2 reduction (`block = max`, `soft = max`, `walk` per the table) and rebuilt for a dirty rect through `markNavDirty(x0, z0, x1, z1, classMask)` (spec/M M10). Refresh cadence and freshness (ground <= 12 ticks, hover/clear <= 24) are M-layers'; this file guarantees `rebuild(rect)` cost <= 0.4 ms per 32 x 32 fine cells (test) and that no view allocates after construction.

**3.6.2 Clearance map.** Chamfer (1, 1.41421356) two-pass distance transform over the fine ground nav: seed 0 on cells with `!walk || block` (soft ignored, pathing semantics), cells on the arena border seeded 1, result in nav cells (cell-centre to blocked-cell-centre). Cost measured as part of `buildClear` <= 1.5 ms at 128 x 128 (large). A free corridor of w cells has centre clearance `ceil(w / 2)`: both w = 5 and w = 6 give 3.0, w = 7 gives 4.0.

**3.6.3 Bottleneck and baseline.** `bottleneck(A, B)` is the widest-path value (maximise the minimum `clear` along an 8-connected `canStepSoft` path) from the nav cell of zone A's centre to zone B's centre, by a max-heap Dijkstra. Ancient baseline (F8, frozen, informational, `tests/fixtures/clear_ancient.json`): marathon 17.2, thermopylae 7.0, colosseum 15.6, nile 5.0, giza 10.9, persepolis 20.8, carthage 11.0, teutoburg 13.4, alpine 12.0, olympus 30.0, troy 13.0 (soft passable; 0 with soft solid: the gate must be breached), styx 2.0 (fails: 2 u bone bridges), cyclops 8.0, oasis 12.7.

**3.6.4 Corridor rules.** (R-V1) Authoring: every route between the zones has >= 6 free nav cells wherever the era's roster has a unit of radius > 0.9; bridges and gates are >= 8 u wide (`bridge` throws below 6). (R-V2) Enforced: `bottleneck(A, B) >= CLEAR_NEED` for every new recipe at all sizes and seeds, and >= `BOSS_NEED` for presets flagged `bossSafe` (every `large` preset). (R-V3) The route must exist with `soft = 'solid'` too unless the preset flags `breachRoute: true` (castle, dam; the gate is the intended breach). (R-V4) Moats and rivers need a ford or bridge on the vehicle route; `hover` view may cross water.

**3.6.5 Dynamic six-tank column and wrecks (residual 28, 18, 27).** Fixture defs (`tests/fixtures/corridor_defs.mjs`, independent of any roster): `fx_tank` role `vehicle`, radius 2.2, speed 2.6, `squad` 3 (spec/M role table: vehicle squadSize 3, air 2), formation `armor` (spacing `2.05 * radius` = 4.51 u, rankMax 2); the test deploys 2 squads of 3 (six tanks) at zone A's rear centre, one variant with formation `column` (width 3, `formations.js`) and one with `line` (single rank to 12 wide, stretch case: they must file through), target = zone B front. Pass: all six within 4 u of the goal in `T = 2.5 * pathLen / 2.6 + 30` s; no unit with displacement < 0.5 u over any 6 s window while more than 4 u from the goal (S8); no unit inside a `block` cell at tick end (S9); no overlap > 0.3 u with a blocking prop. Wreck case: 20 `spawnProp(type, x, z, {decor: true})` wrecks (cap 24, spec/M M17e) placed on the centreline of the narrowest 6 cells of the route, then the same run must pass with unchanged `T`; negative control: wrecks made blocking. Air squad variant: 2 `fx_heli` (layer air) pass over the same route without nav (analytic steer, M-layers) and arrive.

**3.6.6 Interfaces spec/M needs from WORLD (M10, M11, M12; all additive).** (1) `NavGrid.stampProp(p)` / `unstampProp(p)`: increment/decrement `block` or `soft` over the cells of the prop's footprint (circle arithmetic of `applyProps` or the rect rule of 3.2.5), set `gateTeam[cell] = p.team` for `info.gate` props (`Int8Array`, -1 none); `applyProps` stays as the full restamp used at construction. (2) `FlowField.compute(sources, count, maxDist, extra, team)`: a `soft` cell with `gateTeam === team` costs 1.5 instead of 30 and is passable (owner team only); `team` undefined = today's behaviour. (3) `Arena.edit(rect, {dh, h, mat})`: for terrain cells in `{x0, z0, x1, z1}` add `dh` steps, or set height `h`, and/or set material `mat` (clamped like `setH/setM`), no RNG, returns the clipped dirty rect; `World.editTerrain` (M12) calls it, then `nav.rebuild` for the nav rect. (4) Sanitiser: hazards keep `tm`, `arm` for `mine_*`; props keep elements 6 (`tm`) and 7 (`lk`) only when present, so Ancient JSON is unchanged. (5) `markNavDirty` itself lives in the sim (M10); it calls `nav.rebuild(rect)` and the class views' `rebuild(rect)`.

### 3.7 Scale and tempo, first contact (W11)

**3.7.1 Ceilings (u and u/s; new-era columns are ceilings that rosters, `spec/M` kind rows and `design/<era>` must obey; Ancient is measured from the defs).**

| class | Ancient measured | Medieval | Modern | Sci-Fi |
|---|---|---|---|---|
| foot speed | melee 1.9..3.4, ranged 2.5..3.9, beast 4.0..4.2 | 2.0..3.4 | 2.6..3.6 | 2.6..3.8 |
| foot direct range | archers 13..38 | bow 30..40, crossbow 28..36 | pistol 10..14, SMG 14..20, shotgun 8..12, rifle 28..34, MG 24..30 | laser rifle 30..36, plasma 22..30, beam 12..20 |
| vehicle gun | none | none | 44..52 (AT 34..40) | 44..52 |
| sniper / hitscan precision | none | marksman <= 44 | 60..70 | 66..72 |
| indirect | catapult 70, ballista 55 | trebuchet 60..80, minRange >= 15 | mortar 50..65 (minRange 12), howitzer 70..80 (minRange 20) | 70..80 (minRange 20) |
| fast ground | cav 3.0..4.0 (run x1.5 <= 6.0) | 3.4..4.6, run <= 6.0 | runabout 4.5..5.4 | scout bike 5.0..6.0 |
| armoured ground | elephant 1.5 | ram, siege tower 1.0..1.6 | tank 1.9..2.6, APC 3.6 | mech 2.0..2.8 |
| hover | none | none | none | 4.5..6.0 (cap 6.5) |
| air cruise | none | dragon 4..6 | helicopter 6..8 | drone, dropship 6..8 |

Global caps: ground speed <= 6.0, hover <= 6.5, air cruise <= 8.0; direct-fire range <= 40 (foot) and <= 52 (vehicle); precision <= 72; indirect <= 80; every unit weapon range <= 0.65 x the largest legal arena (128 u -> 83). Crossing a medium arena (96 u): infantry at 3.0 -> 32 s, tank 2.6 -> 37 s, runabout 5.4 -> 18 s, hover 6.0 -> 16 s, helicopter 8.0 -> 12 s.

**3.7.2 Roles inside the harness.** `R_first` of a battle = the longest `ranged.range` among line weapons (not indirect, not sniper, not air) of either roster; `v_close` = sum of the two fastest line speeds (default 2 x 3.0 = 6.0; 2 x 2.6 = 5.2 for armour; 2 x 5.5 = 11 for hover).

**3.7.3 Size policy (what each arena size may host).**

| size | world | allowed rosters | not allowed |
|---|---|---|---|
| small | 128 cells, 64 u | `R_first <= 32` (melee, pistol, SMG, rifle, short beams); at most 2 presets per era | sniper, indirect, air, fast ground > 4.6 |
| medium | 192 cells, 96 u | `R_first <= 40`; sniper and indirect (<= 65) allowed; air allowed (cruise <= 7) | direct fire above 40 (vehicle guns), indirect above 65 |
| large | 256 cells, 128 u | `R_first <= 52`; everything | none |

Enforced by `campaign_validate` (`range` rule V-RANGE: `R_first(both rosters) <= cap(size)`), by `generateArmy` when it is given an arena, and by `tools/tempo.mjs` for Quick Battle presets (a preset declares `rangeClass` close/standard/long = the 32/40/52 caps of its size; Quick filters the army pool by it).

**3.7.4 Deployment presets (`g.deploy`).** Zones are symmetric about the origin with centre `+-f * W`, width `w * W`, depth `d * W` (default 0.62); front-to-front gap `F = W * (2f - w)`.

| preset | f | w | F at W = 64 / 96 / 128 | use |
|---|---|---|---|---|
| tight | 0.30 | 0.20 | 26 / 38 / 51 | Ancient marathon-like; melee-led armies (`R_first` <= 24) |
| std | 0.34 | 0.17 | 33 / 49 / 65 | medium with `R_first` <= 30, small arenas |
| wide | 0.37 | 0.15 | 38 / 57 / 76 | medium with rifles and lasers (55 u needed), large with `R_first` <= 48 |
| deep | 0.40 | 0.13 | 43 / 64 / 86 | medium with bows (63 u needed), large with tank guns and hover (zone outer edge 0.465 W < half) |

**3.7.5 First contact: metric, formula, bands.** `T1` = seconds from tick 0 to the first damage dealt by a line weapon (indirect and sniper shots excluded; reported separately as `T1_any`); `inRange0` = number of units with an enemy inside their own weapon range at tick 0 (edge distance). Design formula: `T1 ~ (F + d_back - R_first) / v_close + 1.2` with `d_back` ~ 6 u (ranged lines sit behind the front rank) and 1.2 s for wind-up and flight; it explains Ancient marathon (predicted 2.8 s, measured 3.3 s) and is a design aid only (obstacles lengthen the path). Policy: **P1** no unit has an enemy in range at tick 0: `inRange0 = 0` for every new recipe (hard); static form checked at generation: `F >= rangeCap + 2` where `rangeCap` is the preset's cap (default 32 / 40 / 52 by size, lower for melee-led arenas, 3.9); **P2** the `T1` median of a cell (recipe, size, army pair from the era's reference armies: balanced and rush, budgets 6,000 and 12,000, 3 seeds) lies in the band of its `v_close` class: normal (`v_close <= 6.0`, foot and armour) small [3, 14], medium [6, 20], large [6, 20]; fast (`v_close > 6.0`, hover and fast ground; not allowed on small) medium [4, 20], large [5, 24]; a single cell may miss by 2 s, at least 80 % of cells must be inside, every exception is listed and signed; the 6 s floor holds iff `F >= R_first + 4.8 * v_close - 6` (rifles 55 u, bows 63 u, tank guns 67 u, hover lasers 83 u), which is why 3.7.3 keeps tank guns off medium arenas and why small arenas (largest gap 43 u) top out at 4.0 s with rifles and use the [3, 14] band; **P3** `T1_any >= 2.5 s`; **P4** dead air: windows of > 8 s without any damage event between `T1` and the end minus 10 s: median 0 and p90 <= 1 per battle (S23's 20 s rule stays). Ancient is measured and recorded, not enforced (F6, F7): T1 1.5..8.1 s, `inRange0 > 0` on three presets. The same formula shows where the plan's single 6..20 s band is unreachable (PC-W1). Harness: `Metrics` in `tools/lib/harness.mjs` gains `firstDamageTick`, `firstLineDamageTick`, `inRange0`, `deadAir8`; `tools/tempo.mjs --era` writes `tempo.json` per (recipe, size) and `tests/fixtures/tempo_ancient.json` stores the Ancient baseline (feel-sheet and ER27 input: "target seconds to first contact" per era = the medians of this file).

### 3.8 Recipe authoring rules (W8, W9)

| id | rule | check |
|---|---|---|
| R-1 | Randomness only from `g.rng` and `g.nz`; no `Math.random`, `Date`, `performance`, unordered-key iteration; maths limited to `+ - * / abs min max floor ceil round sqrt hypot sin cos atan2` and integer powers (no `pow exp log tan`); the arbiter is the Chromium hash test | lint (existing `math-random` rule), WC20 |
| R-2 | Display name set explicitly: `a.name` (<= 32 chars); `generate` would otherwise write `Med_keep` | WC12 |
| R-3 | `a.env` is a full literal in the Ancient key order plus `sky gravity era` as needed; `era` = the owning era; `theme` a canonical id of the era | WC12 |
| R-4 | Zones by `g.deploy(kind)`; size/range policy 3.7.3; zones dry, flat (+-1 step), >= 95 % walkable, no blocking prop within 1.5 u of the zone edge | WC12, WC15 |
| R-5 | Keep-clear lanes: `keepClearPath` along the route A to B with half-width 2.4 (infantry) and 3.2 (vehicle lane); no blocking prop inside except authored `raw` set pieces | WC12 |
| R-6 | Symmetry: `g.sym` in `rot mx mxz`, or the preset is on the era's S22 exemption list (35-65 % band); >= 5 of 12 symmetric; measured on symmetric recipes: height within 1 step on >= 99.5 % of cells, materials equal >= 96 %, props mirrored >= 99 % | WC13 |
| R-7 | Readability (W8): visual height >= 4.5 u only outside the fight band `abs(z) <= 0.22 W` (z across the axis through both zones) and >= 8 u from zone edges; inside the band buildings are 3.0..4.5 u; >= 75 % of 200 head-height points visible from the default camera (yaw -0.7, pitch 0.65) for seeds {1, 3, 7} medium + small + large | WC14 |
| R-8 | Prop budgets of 3.3.5; counts scale with `areaK`; cap variants per type | WC05, WC06 |
| R-9 | Era legality: props owned by the era, `any` ids and the ids in the era's `manifest.sharedProps` (a subset of the Ancient generic nouns of AR 3.3.1: `tent torch banner_post wall_stone ruin_wall tower gate_door arch_gate ship`) and nothing else; materials per 3.4.2; hazards from the era vocabulary, <= 12 per recipe; weather and theme from the era | WC12 |
| R-10 | Markers: recipes write none; they record `anchors` (<= 8 names, equal to the preset's `anchors`) via `g.anchor` | WC21 |
| R-11 | Vehicles: R-V1..R-V4 of 3.6.4 | WC10, WC11 |
| R-12 | Single water plane; moats/rivers are channels below it (deep > 0.8 u impassable, shallow x1.7); bridges via `g.bridge` | WC12 |
| R-13 | Climbable detail: neighbouring nav cells differ <= 1.0 u (trenches <= 2 steps per cell with ladders every 12 u) | WC12 (S9, S8) |
| R-14 | Castle technique (W-D26): chain walls (`g.wall`), towers every ~14 u, gate props with `gate` and `breach`, optional rampart; wall-walk not built | WC12 |
| R-15 | Generation time <= 250 ms at large (Node warm), arena share code <= 30,000 chars at the preset size (headroom 8,000 chars = +500 props) | WC12, WC18 |
| R-16 | Prop positions keep the `toFixed(2)` precision of `toJSON` (0.01 u); no sub-0.01 spacing | WC12 |

**Anchors (W-D23).** `src/world/anchors.js` (pure): `resolveAnchor(arena, spec)` where `spec` is `'@name'` (recipe anchor from `arena.anchors`, set by `generate`; lost on `clone()`, so missions resolve before the World clones), `'prop:<type>#<n>'` (n-th prop of the type in array order), `'zone:A@fx,fz'` (fractions of the zone rect), `'centre'`, `'peak:<zone or all>'`; plus optional `+dx,dz` offsets <= 12 u; `resolveMarkers(arena, rows)` returns `{id, type, x, z, r}` rows. Mission files may use absolute `x, z` only through the `@` forms (MS lint rule); anchor names per preset are data (`arenas.js anchors`).

### 3.9 Arena families (first draft; `design/<era>` finalises names, features and objectives by logged amendment)

**Preset row (`era_<id>/arenas.js`, L0 leaf, same fields as the Ancient `ARENAS` rows plus the new ones).**

```js
{ id, name, recipe /* === id */, size: 'small' / 'medium' / 'large', seed, theme /* canonical id of 3.5.3 */, mood: 'calm' / 'tense' / 'epic' / 'ominous',
  recommendedBudget, blurb, tactics: [3 chips],
  rangeCap?: n,            // default 32 / 40 / 52 by size (3.7.3); 24 with deploy 'tight' for melee-led arenas; P1 needs frontGap >= rangeCap + 2
  sym: 'rot' / 'mx' / 'mxz' / null, s22: 'sym' / 'exempt', deploy: 'tight' / 'std' / 'wide' / 'deep', rangeClass: 'close' / 'standard' / 'long',
  anchors: [<= 8 names], objectives: [ids], campaign: true / false,        // false = Quick, Survival, Puzzles and Daily only (cut ladder rung 1 removes these first)
  bossSafe?: true, breachRoute?: true }
```
Rules: `size` small -> `rangeClass` close, medium -> standard, large -> long (3.7.3); ids carry the era prefix and equal the recipe id; the array order is append-only after the era's release (W-D31); per era: exactly 12 presets (floor 11), at most 2 small, every large preset `bossSafe`, at least 5 with `s22: 'sym'`, at least 9 with `campaign: true`, every `objectives` entry a legal objective of the era (3.10.1), every `anchors` name recorded by the recipe.

**Medieval** (theme ids `med_*`; deploy and range class follow the size):

| id | name | size | theme | sym | signature features | objectives | camp |
|---|---|---|---|---|---|---|---|
| med_tourney_field | The Tourney Field | medium | med_meadow | mx | two lists with tilt rails (low cover), 60 u charge run-up, grandstands with crowd props, pavilions | eliminate, kill_general | yes |
| med_ford | Ford of Errors | medium | med_meadow | - | 14 u shallow ford (x1.7 cost) beside a 8 u stone bridge, willows, spike stakes on one bank | hold_hill, escort, capture | yes |
| med_village | Thatch Hollow | medium | med_village | - | 12..14 cottages, windmill + sails (spin), well, haystacks (flammable), lanes >= 6 cells | escort, defend_core | yes |
| med_abbey | Bellmead Abbey Close | medium | med_village | mx | walled cloister, bell tower (core), herb beds, gatehouse with oak gate | defend_core, capture | yes |
| med_greenwood | Wickerwood | large | med_forest | - | glade rule (3.8 R-7), two trails, fog 0.25, fallen logs; `bossSafe` | escort, survive_waves | yes |
| med_castle_siege | Castle Dour | large | med_castle | - | curtain wall chain + 4 towers, gatehouse with portcullis (`gate`, `breach`), moat + drawbridge (soft prop; `editTerrain` collapse), keep on a motte, besieger camp 70 u away; `bossSafe`, `breachRoute` | destroy, defend_core, eliminate | yes |
| med_siege_camp | The Besiegers' Camp | medium | med_castle | - | tents, mantlets, 4 engine pads, palisade, ditch, supply carts | destroy, survive_waves | no |
| med_moat_keep | Moat and Mud Keep | small | med_castle | mx | motte keep, moat, drawbridge, one tower, courtyard (close quarters) | destroy, defend_core | yes |
| med_beacon_moor | Beacon Heath | large | med_moor | rot | central hill +6 u, 3 beacon braziers, bogs (med_bog), standing stones; `bossSafe` | hold_hill, capture | yes |
| med_dragon_pass | Dragon Pass | large | med_crag | - | switchback mountain pass, lava vein with 8 u bridges (Ancient lava material), ruined keep with perch, hoard heaps; `bossSafe` | kill_general, survive_waves | yes |
| med_toll_bridge | The Toll Bridge | medium | med_meadow | mx | deep river (impassable), one 8 u arched bridge (bridge drop via `editTerrain`), two fords 40 u downstream, toll house | capture, escort, kill_general | yes |
| med_winter_fair | The Winter Fair | small | med_moor | mxz | ring of stalls, bonfire casks, shallow pond, snow (Ancient snow material) | eliminate, capture | no |

**Modern.**

| id | name | size | theme | sym | signature features | objectives | camp |
|---|---|---|---|---|---|---|---|
| mod_parade_yard | Parade Yard | small | mod_field | mxz | felt-green drill square, tyre course, pop-up dummies, loudspeaker post | eliminate, puzzles | yes |
| mod_hedgerow | Hedgerow Meadow | medium | mod_field | - | field patchwork, hedge lattice (`cover:'low'`), hay bales, windmill, picnic hill | hold_hill, capture | yes |
| mod_trench | The Long Trench | medium | mod_field | rot | two carved trench systems (steps <= 2, ladders every 12 u), no-man's land craters (`arena.crater`), wire | capture, destroy | yes |
| mod_downtown | Downtown | large | mod_city | rot | 5 x 4 block grid, streets >= 8 u, `foot` buildings 3.0..4.5 u in the band, towers on the edges, centre tower (core); `bossSafe` | defend_core, escort, eliminate | yes |
| mod_bridge_gorge | Bridge Gorge | medium | mod_water | mx | 44 u steel-deck bridge 8 u wide with piers and rails, shallow ford (flank), cliffs | escort, kill_general | yes |
| mod_rail_yard | Rail Yard | large | mod_industrial | - | five tracks (ballast), wagon rows (low cover), signal gantry, turntable, loco shed; `bossSafe` | destroy, capture | yes |
| mod_airfield | Airfield Open Day | large | mod_air | mx | 70 u runway, 3 hangars (`foot`), control tower, parked planes, fuel tanks (`explosive`); `bossSafe` | kill_general, destroy | yes |
| mod_harbour | Harbour | medium | mod_water | - | quay + 3 piers (planks), cranes (spin), container stacks (`foot`), deep water (hover route), barge ramp | survive_waves, defend_core | yes |
| mod_dam | The Dam | large | mod_industrial | - | dam wall across a valley with an 8 u crest road, reservoir (water plane), dry spillway, two destroyable sluice gates (`breach`); `bossSafe`, `breachRoute` | kill_general, destroy | yes |
| mod_desert_outpost | Desert Outpost | medium | mod_desert | rot | walled compound, radar dish (spin), water tower, dunes, two gates | defend_core, capture, hold_hill | yes |
| mod_building_site | Building Site | medium | mod_industrial | - | foundation pits (ramped), tower cranes (spin), scaffold gantries, container offices, trench mud | hold_hill, escort | no |
| mod_garden_centre | Garden Centre | medium | mod_field | mx | greenhouse grid (glass soft props), hedges, beds, sprinkler rings (reuse `quicksand` hazard) | survive_waves, eliminate | no |

**Sci-Fi.**

| id | name | size | theme | sym | signature features | objectives | camp |
|---|---|---|---|---|---|---|---|
| sf_moon_base | Moonbase Dull | large | sf_moon | mx | modules + domes (`foot`), solar panels, landing pad, regolith, gravity 0.4, black sky; `bossSafe` | kill_general, defend_core | yes |
| sf_crater_rim | Crater Rim | medium | sf_moon | rot | bowl crater with a +6 u rim, rovers, antenna masts, low gravity | hold_hill, capture | yes |
| sf_neon_city | Neon Spine | large | sf_neon | rot | low block grid with emissive strips, plaza, night, smog; buildings 3.0..4.5 u in the band; `bossSafe` | escort, capture | yes |
| sf_spore_jungle | Spore Jungle | large | sf_jungle | - | glade rule, bioluminescent flora (GLOW voxels), spore weather, alien moss; `bossSafe` | survive_waves, eliminate | yes |
| sf_crash_site | Crash Site | medium | sf_jungle | - | crashed starship hull (XL), debris field, smoke emitters, scorched ground | destroy, defend_core | yes |
| sf_glacier | Glacier Run | large | sf_ice | - | ice shelf, crevasses (deep pits), ridge line, snow; `bossSafe` | hold_hill, kill_general | yes |
| sf_forge_world | Forge World | medium | sf_ember | mx | lava plane with three 8 u bridges, geysers (Ancient hazard), ember basalt, ion storm | capture, survive_waves | yes |
| sf_orbital_deck | Orbital Deck | small | sf_station | mxz | hull plates + grating, bulkhead walls (hard), airlock lanes (close quarters) | eliminate, puzzles | yes |
| sf_reactor_hall | Reactor Hall | medium | sf_station | mx | reactor core prop (destroyable, `explosive`), pipes, catwalk lanes (>= 6 cells) | defend_core, destroy | yes |
| sf_holo_range | Holo Range | small | sf_station | mxz | flat training range with cheerful markers (tutorial) | eliminate, puzzles | yes |
| sf_dome_garden | Dome Garden | medium | sf_jungle | rot | glass dome (soft props), garden beds, alien vines | hold_hill, survive_waves | no |
| sf_asteroid_dock | Asteroid Dock | large | sf_moon | - | docking platforms over deep pits, teleport pad pairs (`pad`), cargo; `bossSafe` | kill_general, capture | yes |

Counts check (script `WC12`): Medieval small 2 / medium 6 / large 4, sym 6, campaign 10; Modern small 1 / medium 7 / large 4, sym 7, campaign 10; Sci-Fi small 2 / medium 5 / large 5, sym 8, campaign 11 (the 9 mission arenas per era are chosen by MS; the surplus serves Quick, Survival, Puzzles and Daily). If `tempo` tests show a small preset cannot meet the small band of 3.7.5, it is promoted to medium (96 u) by amendment, not shipped out of band. The e.md settings are covered: castles with gates and moats (`med_castle_siege`, `med_moat_keep`), villages (`med_village`), forests (`med_greenwood`), mountain passes (`med_dragon_pass`); cities (`mod_downtown`), bridges (`mod_bridge_gorge`), airfields (`mod_airfield`), trench lines (`mod_trench`), harbours (`mod_harbour`); moon bases (`sf_moon_base`), alien jungles (`sf_spore_jungle`), neon cities (`sf_neon_city`), crashed ships (`sf_crash_site`), ice worlds (`sf_glacier`), lava worlds (`sf_forge_world`).

### 3.10 Arena Builder and editors (W6)

**3.10.1 Era chips and derived lists.** The chip bar (`All` + released eras) is created only when `registry.releasedEras().length > 1` (with only Ancient released the DOM equals v8, G10). `st.era` defaults to the arena's `env.era`, else the profile's `lastEra`, else `ancient`; it filters every list below; `All` shows the union of released eras.

| list | v8 source | new source (registry, filtered by chip and release state) |
|---|---|---|
| props palette `PLACEABLE` (`panels.js:15`) | `Object.keys(PROP_CATALOG)` filtered by `place` and `hasPropModel`, evaluated at import | `placeable(era)` evaluated per render: owner era, or `PROP_FLAGS.era === 'any'`, or listed in the chip era's `manifest.sharedProps`; `place !== false`, `hasPropModel`, released |
| prop categories chips (`PROP_CATEGORIES`, `S.props.cats`) | 4 fixed | the categories of the visible props (Ancient four + era categories); unknown category label falls back to the id (existing) |
| materials (`panels.js:50`, `S.paint.materials[i]`) | `MATERIALS.forEach` | non-reserved rows of the chip's block + the Ancient generic subset; label `S.paint.materials[id]` falling back to `m.name` |
| hazards (`HAZARDS`, 6) | `consts.js` | `HAZARDS` stays the 6 Ancient rows (test pin); `HAZARDS_EX` adds `mine_ap`, `mine_at`; `hazardsFor(era)` unions |
| markers (`MARKER_TYPES`, 5) | `consts.js` | `MARKER_TYPES` stays 5; `MARKER_TYPES_EX` adds `capture` (r 5, 0x35d0ff), `core` (r 4, 0xffd23c), `spawn` (r 4, 0xb06cff) |
| objectives (`OBJECTIVES`, 5) | `consts.js`, `arena.js:35` | `OBJECTIVES` stays 5; `OBJECTIVES_EX` adds `capture` (needs a `capture` marker), `defend_core` (a `core` marker and a prop), `escort` (`vip_start` + `exit`); `arena.js OBJECTIVES` accepts all 8; `destroy` needs a prop with `PROP_FLAGS.breach` of the arena's era |
| themes (`THEMES`, 8) | `consts.js:93` | Ancient chip: the 8 legacy words; era chips: their 6 canonical ids; labels in `S.env.themes`; `session.setEnv` validates against the union |
| weathers (`WEATHERS`) | 7 | 7 + era-tagged additions of released eras |
| sky, gravity | none | `SKY_IDS` select (hidden when `earth` is the only option for the chip), gravity slider 0.2..1.5 step 0.05 + preset chips |
| templates (`dialogs.js:55`) | all presets | presets of released eras grouped by era, filtered by chip |
| Generate recipes (`panels.js:253`) | `RECIPES` names | `RECIPES` of released eras, names from `ctx.content.arenas`, filtered by chip |
| import acceptance (`docs.js:13 PROP_TYPES`) | Set built at import | `propTypesAllowed()` = released eras' ids + `any`; evaluated per call |

**3.10.2 Limits.** `LIMITS.propTypes` stays 41 distinct types per arena (W-D27); new warn codes (data only, copy in `strings.js`): `batches_budget` (more than 60 distinct (type, variant) pairs: draw-call risk), `corridor_vehicle` (A to B `bottleneck < 3.0` with `soft: 'solid'`: vehicles may not fit), `mine_owner` (a mine without `tm`), `mine_zone` (a mine inside a deployment zone of the other team), `pad_unpaired` (error: a `pad` prop whose `lk` partner is missing), `era_mixed` (info: props of more than one era). `LIMITS.minesPerTeam = 24`, `LIMITS.pads = 12` (6 pairs). Other limits unchanged (props 1,500, hazards 60, markers 8).

**3.10.3 Staged release matrix (q3_program residual 29).** `tests/editors/arena/release_states.test.mjs` runs the four states A {ancient}, B +medieval, C +modern, D all. For each: palette id set equals the expected union and contains no id of an unreleased era; the chip bar exists iff more than one era is released; `propTypesAllowed()` and the import of a code containing an unreleased-era prop give exactly the unknown-prop message with no era name; materials, hazards, markers, objectives, themes, weathers, templates and recipes lists exclude unreleased content; an `env.era` of an unreleased era in a code is accepted as data and has no UI effect; an arena exported in state B contains no Modern id. The generator and the sim always resolve the full registry.

**3.10.4 Unknown-prop import (PRODUCT-Q24).** The message stays `Unknown prop '<id>' (the code may come from a newer game version)`. `importArena(text, {allowPartial: false})` is unchanged by default (tests); the Builder passes `allowPartial: true`: unknown props are dropped, the result carries `dropped: [ids]` and a note `N props from a newer version were left out: a, b, c`, and the import dialog offers "Open without them" / "Cancel" (copy in `strings.js`). Unknown hazards/markers keep their existing `ValidationError` text.

**3.10.5 Theme preset command and preview (W-D29).** `session.applyThemeLook(themeId)` = one `cmdSet` (key `env.look`) that sets `theme`, `sky`, `gravity`, `weather`, `fog`, `time` from the row's `look` (omitting defaults) as ONE undo step; later control edits are separate steps; a "Match the theme look" chip re-applies after manual edits. The preview (`view3d.js` -> `engine.setEnvironment`) passes the theme and sky so it uses RENDER's `THEME_LOOK`; low gravity shows a small "moon" badge. *Aim test at low gravity* (`tests/world/low_gravity_aim.test.mjs`, with spec/M M15): build a moon arena through `EditSession` (theme `sf_moon` -> gravity 0.4), export, import, `Game._arenaFor` -> `World`: `w.gMul === 0.4`; then 200 shots each of a ballistic arrow-class, a `shell` low arc and a `mortar` high arc at 0.3 / 0.6 / 1.0 x range at a stationary target, gravity 1.0 vs 0.4: absolute hit-rate difference <= 10 points and mean landing error <= 0.8 u (the spec/M arc test).

**3.10.6 Hazards palette for mines, teleporter pairs.** Mines (Modern/Sci-Fi chips): `{t: 'mine_ap' or 'mine_at', x, z, r (fixed by kind: 1.6 / 2.0, slider disabled), tm: 0 or 1, arm: 0..10 s, default 2}`; the hazards panel shows a Team A/B toggle and an Arm-delay slider for mine kinds; the hazard sanitiser (`arena.js:152`) keeps `tm` (0 or 1) and `arm` (0..30) only when `t` starts with `mine_`; the view draws a dashed ring in the owner's colour; they are hidden in battle (spec/M M11). Teleporter pairs: a "Place pair" mode of the props tool for props with `pad`: click A then B creates two props with `lk` = the partner's array index (prop element 7, spec/M M12); deleting either deletes both in one undo step; `session.removeProps` remaps every `lk` through `remapLinks(props, removedSet)`; `fromJSON` clears an `lk` that is not an integer in range, not reciprocal, or points at a prop without `pad`. The ladder rung 5 (teleport pads cut) removes the mode and rejects `lk` in the validator.

**3.10.7 Library cap and eviction (4 eras).** `Collection('arenas', 48)` is shared by all eras; `put` still evicts the oldest beyond 48 (W-D30). Worst case per item = code <= 38,000 chars + thumbnail <= 6,000 chars = 44 kB, so a full library of maximal arenas is about 2.1 MB of the ~5 MB `localStorage` that also holds the 1.5 MB progress cap. New in the Builder: items carry an optional `era` string (absent = ancient); saving shows an inline note from 44 items ("N of 48 slots used; the oldest arena is replaced when full") and from 2.0 MB of library bytes; export-all (`MAX_SAVE_CODE` 6,000,000 chars) is unaffected. The Quick "My arenas" strip lists library items of the chip's era plus unlabelled ones.

**3.10.8 Share-code size limits per era.** `MAX_CODE 38,000` (S <= 1.8k, M <= 8k, L <= 38k) unchanged; cost 16 chars per extra prop (F11). Preset ceilings (R-15): every new preset at its default size encodes to <= 30,000 chars, leaving >= 8,000 (+500 props) for edits. Expected: Medieval medium 4..10k, `med_castle_siege` 8..14k; Modern city grids compress well (about 12k for 2 materials and 1,500 props); Sci-Fi `sf_spore_jungle` (noisy large, about 900 props) 22..30k and is the risk row; Teutoburg (32.7k) remains the Ancient maximum. Above 38,000 only the `.vwarena` file is offered (existing behaviour). Measured per preset in `WC18` and printed.

**3.10.9 Export compatibility note.** When an arena uses a material id >= 16, any non-Ancient prop, `mine_*` hazard, `capture/core/spawn` marker or `sky/gravity/era`, the export dialog adds one line ("Older versions open this arena with Ancient looks or refuse it: new props, tiles and sky are not known there"); Ancient-only arenas show nothing (G10).

**3.10.10 Editor file-by-file change list (EDITORS unless noted; every row is PX/OI for the Ancient chip).**

| file | change |
|---|---|
| `consts.js` | `LIMITS` additions (3.10.2); `HAZARDS_EX`, `MARKER_TYPES_EX`, `OBJECTIVES_EX`; `THEMES` replaced by `themesFor(eraIds)` (the 8 v8 words stay for Ancient); `PATH_RADII` stays `[0.45, 0.55]` (Ancient validator unchanged); `PATH_RADII_VEHICLE = [1.6, 2.4]` feeds the `corridor_vehicle` warning only for arenas whose chip or `env.era` is not Ancient |
| `state.js` | `era`, `hazard.team`, `hazard.arm`, `props.pair` |
| `docs.js` | `PROP_TYPES` -> `propTypesAllowed()`; `importArena(text, {allowPartial})`; `readMeta` reads `era`; hazard/marker acceptance from the derived tables |
| `validate.js` | `propInfo` from the registry; new codes of 3.10.2; vehicle `bottleneck` via `paths.js` |
| `panels.js` | all lists of 3.10.1; chip bar; mine controls; sky/gravity controls; "Match the theme look" chip |
| `session.js` | `setEnv` accepts `sky gravity era theme` against the vocab; `applyThemeLook`; `patchHazard` keeps `tm arm`; `remapLinks`, `placePair`; snapshot already clones `env` whole |
| `controller.js` | prop placement uses `footOf` for rect props (ghost, snap); mine placement; pair mode |
| `paths.js` | `buildNav` uses `footOf` + `stampProp` (the same function as the sim); `clear`/`bottleneck` for the validator |
| `view3d.js` | `footprint(def)` via `footOf`; rect ghosts; preview environment with theme/sky; mine rings; gravity badge |
| `dialogs.js` | templates grouped by era; import dialog with "Open without them"; export note |
| `thumbs.js` | prefetch lazily for the visible chip in idle slices (target: palette interactive < 100 ms, thumbnails filled within 3 s; an L-class prop thumb costs <= 200 ms) |
| `fixes.js` | `remove_unknown` and the `destroy` auto-add use the registry and the era's `breach` props |
| `library.js` | optional `era` on items; the 44-item / 2.0 MB note |
| `strings.js` | all new copy through `ctx.content.humor.arenaBuilder` overrides (HUMOR/COMEDY edit text only): materials by id, weathers, skies, gravity presets, themes, mines, pads, notes |
| `index.js`, `icons.js`, `ui/editors_arena.css` | chip bar mount, appended icons (mine, pad), chip styles (UI) |
| `src/ui/mockctx.js` | era parameter for the dev harness; imports from the registry |

### 3.11 Save and share compatibility

| direction | content | outcome (tested in WC19) |
|---|---|---|
| v8 -> new | 16 preset codes, user-edited codes, library items, `vw.draft.arena`, export-all | decode equals v8 `toJSON`; `encodeShare('arena', generateArena(preset))` in the new build equals the v8 string byte for byte (same engine); library items without `era` read as ancient |
| new -> v8 | arena with Ancient content only plus `env.sky/gravity/era` | opens with Ancient look (env keys dropped by v8 `sanitizeEnv`) |
| new -> v8 | material bytes 16..63 | clamp to 15 (Crimson Sand) silently; the export note (3.10.9) warns |
| new -> v8 | non-Ancient prop / `mine_*` hazard / `capture` marker | v8 editor import rejects with its own "Unknown ... (newer game version)" message |
| new -> v8 | library items with `era`, drafts | extra item field ignored |
| new -> new | hidden era code opened where the era is not released | same unknown message; no era name |

Document versions: no `CURRENT` bump, no new top-level doc (AR-D11); additive arena keys only; `Arena.v` stays 1 and unused.

### 3.12 Files, Ancient policy table, requests, work packages

**New files.** `src/world/gencore.js`, `src/world/vocab.js` (`SKY_IDS`, `MATERIAL_HAZARDS`, `canonTheme`, `materialShare`, hazard/marker/objective vocab, `ERA_IDS` re-export), `src/world/anchors.js`, `src/content/era_ancient/materials.js`, per era `era_<id>/{arenas,materials,themes}.js` (L0), `era_<id>/recipes.js` (L3), `era_<id>/props/{catalog,flags}.js` (L0), `era_<id>/props/models/*.js` (L3), `tools/prop_budget.mjs`, `tools/tempo.mjs`, `tools/spikes/{d8_footprint,vox_mixed}.mjs`, fixtures `tests/fixtures/{gen_golden,gen_golden_chromium,clear_ancient,tempo_ancient,materials_v8,prop_flags_v8,corridor_defs}.*`, tests of section 4.

**Ancient-path policy rows owned here** (existing AR rows in brackets; rows marked NEW are appended to AR 3.2 by AM-W4).

| path | policy and content | golden |
|---|---|---|
| `src/world/gen.js` [AP-W01] | PX: helpers moved out, recipes untouched | G2 + extension |
| `src/world/arena.js` [AP-W03] | OI: `MATERIALS` composed from the registry (Ancient rows moved verbatim), `WEATHERS` appended, `sanitizeEnv` +3 keys, hazard keeps `tm arm` for `mine_*` only, props keep elements 6 and 7 only when set | G2, G5, `materials_v8` |
| `src/world/nav.js` [AP-W04] | OI: `cell` field, `kind`, `mhaz`, rect/gate stamps; ground arithmetic unchanged | G1, G2, `nav_classes` identity |
| `src/content/era_ancient/materials.js` NEW [AP-W05] | NEW leaf, rows verbatim | `materials_v8` |
| `src/world/vocab.js`, `src/world/anchors.js` NEW [AP-W06] | NEW | n/a |
| `src/content/era_ancient/props/models/{index,kit}.js` [AP-C03] | OI: `registerPropModels`, `spec.voxel` default 0.1 | `models.test.mjs`, G8 |
| `src/render/props.js`, `terrainMesh.js`, `weather.js`, `engine.js` [AP-R05, AP-R03, AP-R04] | PX: flags from `PROP_FLAGS`, spin/lift/emitter table, emissive cap, weather rows; Ancient output equal | G8, `terrainmesh.test.mjs` |
| `src/sim/hazards.js` [AP-S07] | OI: lookup replaces `m[i] === 7` and the 30 / 0.6 literals | G1 lava battles |
| `src/sim/world.js` [AP-S04] | OI: `foot`, `cover` normalisation, `strictProps` default false | G1, G6 |
| `src/audio/cues.js` [AP-U01] | OI: foot path only when `env.era` is set | G9 |
| `src/editors/arena/**` [AP-E01] | PX | G10, `entry.test.mjs` |
| `src/audio/music.js` theme tables | unchanged (DA-W1 optional, not applied) | G9 |

**Test pins that change (extends AR E11; Ancient intent is kept through the Ancient views).** `tests/editors/arena/entry.test.mjs:20,25,26` (`MATERIALS.length === 16`, `S.paint.materials.length === 16`, 40 placeable, 41 catalog ids, `LIMITS.propTypes === 41` -> Ancient views `appended('material','ancient')`, `placeable('ancient')`, `propCatalog('ancient')`; the `HAZARDS 6 / MARKER_TYPES 5 / OBJECTIVES 5` pins hold because those exports stay Ancient); `tests/props/models.test.mjs` (`ids.length >= 40`, `voxelSize === 0.1` become per-era); the `RECIPES` loops of `tests/gen.test.mjs`, `nav.test.mjs`, `props/arenas.test.mjs`, `props/readability.test.mjs`, `editors/arena/{validate,share.fuzz}.test.mjs`, `campaign/{campaign,puzzles}.test.mjs`, `sim/metrics.slow.test.mjs` and `tools/contracts.mjs:51-61` use `recipesOf('ancient')` when they mean the Ancient set and `eachEra` otherwise; `tests/props/arenas.test.mjs navOf` calls `stampProp` instead of rebuilding the circle by hand.

**Requests** (files `docs/requests/world_<topic>.md`, owner of the edit in brackets): `prop_foot` (SIM, M12), `cover_low` (SIM, M12/M9), `hazards_lookup` (SIM), `nav_views` (SIM/M-layers), `strict_props` (SIM), `weather_rows` (SIM: `smog ion_storm ash spores`), `render_props_flags` (RENDER: `PROP_FLAGS`, spin/lift, emitter table, `rubbleAlias`), `render_terrain_emissive` (RENDER), `render_weather` (RENDER), `foot_cues` (AUDIO), `ui_strings` (UI: `ui/strings.js:52-53`, css).

**Work packages (answers SCOPE-Q7 for W1..W11; sizes S/M/L = 1/2/4 sessions).**

| WP | content | owner | phase | size |
|---|---|---|---|---|
| WP-W01 | W1 steps 0-3, goldens, gencore | WORLD | P1 | M |
| WP-W02 | W1 step 4 helpers, anchors, vocab | WORLD | P1 | M |
| WP-W03 | W3/W4 materials, env, weather, themes data | WORLD + REGISTRY | P1 | M |
| WP-W04 | W2 catalog merge, `PROP_FLAGS`, `registerPropModels`, kit voxel | REGISTRY + PROPS | P1 | M |
| WP-W05 | W5 nav views, clearance, rect stamp (shape; M7 integration later) | WORLD | P1, P2 | L |
| WP-W06 | spikes S-D8, S-VOX | SPIKE | P0 | M |
| WP-W07 | W11 tempo tool, harness metrics, Ancient baseline | TOOLS-VERIFY | P1 | M |
| WP-W08 | W6 editors (chips, lists, mines, pads, theme look) | EDITORS | P2 | L + L |
| WP-W09 | recipes, 2 per WP, 6 WPs per era; first 3 per era in the plumbing slice, the rest after the mechanic slice passes | WORLD | P2 | M each |
| WP-W10 | props, 4 per WP, about 10 WPs per era | PROPS-x3 | P2 | M each |
| WP-W11 | tests WC01-WC24 | TOOLS-VERIFY, EDITORS, WORLD | rolling | S each |

## 4. Acceptance

Scripts live in `tests/world/`, `tests/props/`, `tests/editors/arena/`, `tests/save/`, `tools/`; each registers its criterion with `criterion(id, {owner, tier, negctl})` (spec/VF) and has `tests/negctl/<id>.mjs` = the mutation below and the check id that must turn red. Tiers are the plan's (T-fast, T-era, release-only, scheduled-heavy); runtimes are estimates from the probes (arena generation 15..212 ms, share encode about 30 ms, nav build 3 ms) and are re-measured into `gate_log.jsonl`; W's T-fast share is about 70 s. Every test runs per era through `tests/_eras.mjs eachEra` (zero assertions fails); Ancient recipes are addressed through `recipesOf('ancient')`.

| id (ER) | script | inputs | thresholds | owner | tier | negative control |
|---|---|---|---|---|---|---|
| WC01 (ER1, G2) | `tests/world/gen_golden.test.mjs` | 16 recipes x {small, medium, large} x seeds {1, 7} + the 16 preset-default hashes | 112 FNV hashes equal `gen_golden.json` (Node); `RECIPES.slice(0,16)` equals the v8 list | WORLD (fixture signed by TOOLS-GOLDEN) | T-fast, 12 s | swap two `rng.next()` draws in `Gen.put`: hashes red |
| WC02 (ER2) | `tests/world/gencore_api.test.mjs` | `registerRecipes` / `recipeFn` / `recipesOf` cases | duplicate -> `RECIPE_DUP` naming both eras; owner mismatch, late call, bad id throw; `RECIPES === RECIPE_IDS`; unknown recipe message unchanged | WORLD | T-fast, 1 s | let `registerRecipes` overwrite: duplicate case red |
| WC03 (ER2) | `tests/props/catalog_merge.test.mjs` | merged catalog, `PROP_FLAGS`, manifests | every row matches 3.2.1; the 41 Ancient rows deep-equal `props_v8.json` and carry no new field; era counts equal `manifest.expect` (38 target, 34 floor); `foot` only on class `building` with `blocks: 'full'`; `cover` in {true, false, `'low'`}; every `manifest.sharedProps` id exists and is Ancient-owned; v8 sets rebuilt from `PROP_FLAGS` equal the frozen literals | PROPS-x3, REGISTRY | T-fast, 3 s | add `foot` to an Ancient row: Ancient-identity red |
| WC04 (ER22) | `tests/props/models_era.test.mjs --era` | every catalog id x 3 stages x variants | `voxelSize === spec.voxel`; class budgets of 3.3.3 (cells, solid, tris, ms); cavity lint; stage 1 and 2 smaller; deterministic; emitter kinds legal; footprint within 35 % of catalog `r` (or `foot` circumradius); debris palette | PROPS-x3 | T-era, 25 s/era | a 0.1 keep of 12 x 12 x 14 u: budget red; a sealed cavity: cavity red |
| WC05 (ER13) | `tools/prop_budget.mjs --era` + `tests/props/prop_budget.test.mjs` | each recipe x {small, medium, large} x seeds {1, 3} | B0 <= 35, variants rule, instances, emitters <= 24, spinners <= 24, near26 <= 420k (target 250k), total <= 1.5M, summs <= 700 ms | WORLD, PROPS-x3 | T-era, 40 s/era | add 8 distinct types to a recipe: B0 red |
| WC06 (ER13) | `tests/props/renderer_budget.mjs` (Chromium) | worst recipe per era at the default camera, Marble, 16 + 16 unit types | `drawCalls` of props <= 60 after the 52-draw governor; extra batch keys from stages 1 and 2 over a 40-battle fuzz, p95 <= 12 | RENDER with WORLD | release-only | disable the governor merge: draws red |
| WC07 (ER2, ER16) | `tests/world/materials.test.mjs` | all 64 rows, 16 presets, G1 lava battles | 3.4.1/3.4.2 rules; Ancient rows equal `materials_v8.json`; `unrle` clamps; lava burns exactly as before (G1 hash equal); `acid` is walkable, slows, damages, is avoided (`nav.mhaz`); terrain vertex arrays of the 16 presets equal the pre-change record; neon rows exceed 1.0 after the mesher cap | WORLD | T-fast, 4 s | change an Ancient speed: row-identity red; mark `acid` `walk: false`: nav red |
| WC08 (ER1, ER16) | `tests/world/env.test.mjs` | env objects, 16 preset codes, 2,000 hostile envs | Ancient codes byte-identical; key order `time weather fog theme wind mood sky gravity era`; gravity in [0.2, 1.5] minus {1}; unknown sky/era dropped; `clone()` equal; no throw | WORLD | T-fast, 2 s | drop `gravity` from the sanitiser: round-trip red |
| WC09 (ER1) | `tests/world/nav_classes.test.mjs` | 14 Ancient presets with props, 8 flow fields, synthetic corridors of width 3..9 | ground arrays (`walk hs cost block soft hazard`) and flow-field distances equal the HEAD record; circle stamp unchanged; rect stamp leak 0 % and phantom 0 % on the 6 S-D8 layouts; `clear` of a w-cell corridor = `ceil(w/2)`; `buildClear` <= 1.5 ms (large); `rebuild(32 x 32)` <= 0.4 ms; bottlenecks equal `clear_ancient.json` +-0.01 | WORLD | T-fast, 8 s | change the chamfer weight: baseline red; divide by a different `cell`: identity red |
| WC10 (ER7) | `tests/world/corridor.test.mjs --static` | every new recipe x 3 sizes x seeds {1, 3} | `bottleneck >= 3.0` (soft passable); also with soft solid unless `breachRoute`; large presets `>= 3.75`; bridges and gates >= 8 u wide | WORLD | T-era, 25 s/era | narrow a bridge to 4 cells: red |
| WC11 (ER7, S8, S9) | `tests/world/corridor.test.mjs --dynamic` | 6 tanks (2 squads of 3; `column` and `line`), 20 wrecks, 2 helicopters; medium and large seed 3 of every recipe | 3.6.5 pass rule (arrive within `T`, no stuck unit, nobody in a `block` cell, no prop overlap > 0.3 u) | WORLD with SIM | T-era (Modern after M8, Sci-Fi after M7, Medieval after M12) | make wrecks blocking: red; turn the `clear` view off: wedge red |
| WC12 (ER2, ER7) | `tests/world/recipe_contract.test.mjs --era=<id/all> [--quick]` (also called by `tools/contracts.mjs`) | each recipe x 3 sizes x seeds {1, 3} (`--quick`: medium, seed 3) | determinism; zones dry/flat/free; path A to B for radii 0.45, 0.55, 1.6, 2.4; anchors equal the preset list; `a.name`, `env.era`, `env.theme` legal; props, materials, hazards, weather era-legal; presets obey the counts and the `F >= rangeCap + 2` rule of 3.9/3.7.5; markers 0; props <= 1,100 (hard 1,500), types <= 41; share code <= 30,000; generation <= 250 ms at large | WORLD | `--quick` T-fast (6 s); full T-era (30 s/era) | `Math.random` in a recipe: determinism/lint red; another era's prop: legality red |
| WC13 (ER7) | `tests/world/symmetry.test.mjs` | every recipe with `sym`, exempt lists | height within 1 step on >= 99.5 % of cells, materials equal >= 96 %, props mirrored >= 99 %; `s22` field equals `sym` presence; >= 5 symmetric per era | WORLD | T-fast, 8 s | bypass `g.S` in a symmetric recipe: red |
| WC14 (ER17) | `tests/props/readability.test.mjs` (extended) + static fight-band height check | all recipes, seeds {1, 3, 7} medium + small + large | >= 75 % of 200 head points visible (new eras hard); no prop >= 4.5 u in the band; Ancient ratchet: per-recipe value in `tests/baseline/readability_ancient.json` may not drop by more than 1 point | WORLD (ratchet: TOOLS-VERIFY) | T-era, 60 s/era | a 9 u building on the lane: red |
| WC15 (ER7) | `tools/tempo.mjs --era` + `tests/world/first_contact.test.mjs` | per (recipe, size): balanced and rush x budgets 6,000 and 12,000 x 3 seeds | P1 `inRange0 = 0` (static, all); P2 median `T1` inside the band of its `v_close` class (3.7.5: normal small [3, 14], medium and large [6, 20]; fast medium [4, 20], large [5, 24]; a cell may miss by 2 s, >= 80 % of cells inside); P3 `T1_any >= 2.5`; P4 (release-only, 200 battles/era) dead-air windows median 0, p90 <= 1; Ancient recorded, not enforced | TOOLS-VERIFY, WORLD | P1/P2/P3 T-era (tracer rosters until E-FREEZE); P4 release-only | `deploy('tight')` on a large arena with tank guns: P1 red |
| WC16 (ER7, ER22) | `tests/world/low_gravity_aim.test.mjs` | Builder-made moon arena, 3 weapon classes x 3 distances x 200 shots, gravity 1.0 vs 0.4 | `w.gMul === 0.4`; hit-rate difference <= 10 points; mean landing error <= 0.8 u | WORLD with SIM | T-era (after M15) | scale gravity for corpses only (projectiles untouched): red |
| WC17 (ER22, ER21) | `tests/editors/arena/release_states.test.mjs` + `era_flows.test.mjs` | 4 release states; chips; every list of 3.10.1; mines; pads; theme look; library note; thumbs | 3.10.3 matrix; one undo step for the theme look; mine round trip keeps `tm arm`; pad deletion removes both and remaps `lk`; palette interactive < 100 ms; hidden-era leak: no unreleased era name or id in any string, list or code | EDITORS | T-fast, 20 s | keep the import-time `PLACEABLE` snapshot: state B red |
| WC18 (ER7, ER22) | `tests/editors/arena/share_era.fuzz.test.mjs --era` | 300 arenas per era (recipes, random era edits incl. new env keys, materials 0..255, mines, pads); 1,000 mutations (bit flips, truncation, hostile fields) | round trip equals `toJSON`; every mutation rejected with `ValidationError` or sanitised; zero other exceptions; decode + validate p99 <= 60 ms (medium); every preset code <= 30,000 chars (table printed) | EDITORS | T-era, 40 s/era | remove the `lk` reciprocity check: pad fuzz red |
| WC19 (ER16) | `tests/save/arena_compat.test.mjs` | v8 fixtures produced by `.cache/baseline/ancient-v8`; new codes into the baseline | the 3.11 table, both directions; Ancient preset codes byte-equal (same engine) | TOOLS-GOLDEN, EDITORS | v8-to-new leg T-fast; new-to-v8 leg T-era | change the env key order: byte-compare red |
| WC20 (ER13 class b) | `tests/world/gen_xengine.mjs` (Chromium) | every registered recipe x 3 sizes x seeds {1, 7}, Node vs Chromium | hash equality 100 % | WORLD, TOOLS-VERIFY | release-only and at each E-FREEZE (90 s/era) | shim `Math.sin` with a 1-ulp perturbation in the page: at least one recipe red |
| WC21 (ER8 lint) | `tests/world/anchors.test.mjs` | each preset's anchors, resolver forms | recorded names equal the preset list; every anchor inside the arena and walkable (>= 95 %) or within 3 u of its named feature; `prop:`/`zone:`/`peak:` forms deterministic; a changed unrelated recipe does not move this recipe's anchors | WORLD | T-fast, 3 s | hard-code an anchor constant after changing the geometry: proximity red |
| WC22 (decision gates) | `tools/spikes/d8_footprint.mjs`, `tools/spikes/vox_mixed.mjs`, verdicts `docs/eras/spikes/s_d8.md`, `s_vox.md` | 3.2.5 and 3.3.2 layouts and scenes | thresholds of 3.2.5 (leak <= 3 %, phantom <= 8 %, street >= 6, bottleneck >= 3.0) and 3.3.2 (panel median >= 3.5, door >= 3.2 u, window >= 1.2 x 1.6 u) | SPIKE, REVIEWER signs | P0 | run the 10 x 6 block with V-in: must fail the leak threshold |
| WC23 (ER7) | `tools/balance.mjs metrics` and `mirror` with `--era` | every new recipe, 200v200 and n >= 400 side-swapped battles | S5 < 3 %, S6 < 3 %, S7 < 0.15, S8 < 1 %, S9 = 0, S12 median 60..120 s, S22 45..55 % (sym) / 35..65 % (exempt) | TOOLS-VERIFY (BALANCE runs) | scheduled-heavy (E-FREEZE, fix windows, release) | skip the rect stamp in the harness nav: S9 red |
| WC24 (ER2) | `tests/world/themes.test.mjs` | 18 theme rows, aliases, audio tables | rows complete; aliases resolve; `canonTheme` identity on canonical ids; every new recipe's theme belongs to its era; AUDIO tables have a row per canonical id; legacy audio readers never call `canonTheme` (spy), so Ancient routing equals G9 | WORLD, AUDIO | T-fast, 1 s | call `canonTheme` in `music.js`: G9 routing red |

## 5. Residual ledger

| item | requirement | answered in |
|---|---|---|
| q3_engine residual 18 (wreck part) | wrecks non-blocking or capped; tested by the corridor pass with 20 wrecks | 3.6.5, WC11 |
| q3_engine residual 27 | vehicle clearance map per radius class, tested by the six-tank column in each recipe that lists vehicles | 3.6.1 to 3.6.5, W-D20, W-D21, WC10, WC11 |
| q3_engine residual 28 | corridor test: squad formation (`column`/`line`, spacing from radius), squad sizes for vehicles and air, wreck-density case | 3.6.5 (spacing 4.51 u for r 2.2, 2 squads of 3, 2 helicopters, 20 wrecks) |
| q3_program residual 28 | VB depends on W: materials and palette append arrays; palette test per time of day | 3.4.2 (`top/strata` are the palette, `materialShare`; VB reads the rows, no amendment needed) |
| q3_program residual 29 | staged release: `LIMITS.propTypes`, editor era chips, hidden props absent, import messages | W-D27, W-D28, 3.10.1, 3.10.3, WC17 |
| q1_disposition "deferred to spec/W": scale/tempo table (PRODUCT-Q13, ENGINE-Q37) | ranges, speeds, arena sizes per role per era | 3.7.1 to 3.7.4 (derived from F6, F10), PC-W1 |
| same: vehicle widths and corridor rule (ENGINE-Q24) | corridors >= 6 cells, six-tank test | 3.6.4, 3.6.5, PC-W4 |
| same: first-contact policy; PRODUCT-Q13 dead-air metric | 6..20 s, metric in the harness | 3.7.5, WC15, PC-W1 |
| same: voxel-size decision (CONTENT-Q27) | keep 0.1 vs 0.2 | W-D07, W-D08, 3.3.2, WC22 |
| same: theme vocabulary | unify four vocabularies with aliases | W-D19, 3.5.3, WC24 |
| ENGINE-Q30, PRODUCT-Q24 | low-gravity aim test; builder moon experience; unknown-prop import message; preview with `THEME_LOOK` | 3.10.4, 3.10.5, WC16, WC17 |
| CONTENT-Q25 (W part) | surface-footstep mapping for new materials; ambience per arena family | 3.4.2 `foot` column, 3.4.5, 3.5.3 `amb` |
| VERIFY-Q15 | S5..S9 and share fuzz per era for every recipe | WC18, WC23 |
| VERIFY-Q18, ENGINE-Q20, q2_engine Q2 (props share of the 160 draws) | triangle and draw thresholds in numbers | 3.3.3, 3.3.5, F3, WC05, WC06 |
| VERIFY-Q25, q2_schedule Q16 | readability criteria; Ancient arenas under a ratchet | R-7, WC14 |
| q1_scope Q20 (D8, D11 decide-by) | D8 prototype in P0; castle technique vs wall-walk | W-D06, W-D26, 3.2.5, WC22 |
| SCOPE-Q7 (W5..W9 unplaced) | each W item has a phase | 3.12 work packages |
| q2_product Q23 (e.md 2.3 settings only in bibles); traceability row 2.3 | list of settings | 3.9 coverage paragraph |
| q2_product Q8 (feel sheet tempo fields) | target seconds to first contact per era | 3.7.5 (`tempo.json` medians) |
| ENGINE-Q23 (prop death storms) | M12/M10 own the algorithm; W supplies `stampProp/unstampProp` and the rect footprint | 3.6.1, 3.6.6 |
| spec/M 3.15 WORLD row | `stampProp/unstampProp`, `gateTeam`, `compute(.., team)`, `Arena.edit`, sanitiser keeps `tm lk`/`tm arm`, unknown prop type | 3.6.6, 3.12 (`arena.js` row), 3.2.3 |
| map 05 seams 1..15 | seam 1 -> 3.1; 2 -> 3.2.3; 3 -> 3.3.1; 4 -> 3.2.1, 3.2.4; 5 -> 3.4; 6 -> 3.5; 7 -> 3.10.1; 8 -> 3.2.5; 9 -> 3.4.3, 3.10.6; 10 -> 3.6; 11 -> 3.10; 12 -> W-D31, 3.9; 13 -> 3.4.5, 3.5.3; 14 -> W-D23; 15 -> 3.10.7 | as listed |
| map 05 risks 1..10 | layout drift -> W-D02, W-D03, WC01; determinism -> R-1, WC20; draw calls -> 3.3.5; prop memory -> 3.3.3; nav cost -> 3.6.1; wide vehicles -> 3.6; share size -> 3.10.8; save compat -> 3.11; look gate -> WC12, WC14; doc drift -> section 6 | as listed |
| map 05 unknowns 1..9 | 1 real GPU: unverified list (VF); 2 footprints -> 3.2.5; 3 mixed voxel -> 3.3.2; 4 theme/audio -> 3.5.3 (AUDIO fills tables); 5 sim owner -> requests 3.12; 6 bundle share -> AR7 size report; 7 arena era -> `env.era` (verified: session snapshot clones `env` whole); 8 wall-walk -> W-D26; 9 `PROP_MODEL_MODULES` consumers -> none found, per-era glob in 3.3.1 | as listed |

## 6. Plan corrections and cross-spec amendments

**6.1 Plan corrections (evidence in section 1).**

| id | plan statement | correction | evidence |
|---|---|---|---|
| PC-W1 | W11: "6-20 s to first contact at default placement" | P1 (no unit in range at tick 0) is hard; the T1 median band is [6, 20] s for normal-speed armies on medium and large, [3, 14] s on small, and [4, 20] (medium) / [5, 24] (large) for fast armies. The 6 s floor needs `F >= R_first + 4.8 x v_close - 6`: 55 u for rifles (medium 'wide' gives 57), 63 u for bows, 67 u for tank guns (the largest medium gap is 64: large only), 83 u for hover lasers (large 'deep' gives 86); the largest small gap is 43 u, so small arenas top out at 4.0 s with rifles | F6, F7, 3.7.4, 3.7.5 |
| PC-W2 | W6: "`LIMITS.propTypes` derived" | not derived from the catalog size: it is a per-arena distinct-type cap that merely equalled the 41-id catalog; it stays 41 | `validate.js:54`, `entry.test.mjs:26`, W-D27 |
| PC-W3 | W2: "per-spec voxel size 0.2 to 0.25" | 0.1 and 0.2 only | F4, W-D07 |
| PC-W4 | W10: "corridors >= 6 cells" | 6 cells is the authoring target; the enforced floor is chamfer clearance 3.0, which 5 and 6 cell corridors both give; bosses 3.75 | 3.6.2, F8 |
| PC-W5 | W3: "working `foot`" | only for arenas with `env.era`; Ancient keeps the biome path (G9) | `cues.js:233,542` |
| PC-W6 | W7: "one theme vocabulary with aliases" | canonical ids and aliases exist, but the Ancient audio readers do not resolve aliases (bit-identical); the v8 Builder-theme defect stays | `music.js:41-48`, `cues.js:209` |
| PC-W7 | W2: "oriented footprints only if the spikes prove the need" | preliminary verdict YES for class `building` from the probe; the P0 spike confirms or reverts (rule in 3.2.5) | F5 |
| PC-W8 | map 05 seam 5: lava literal at `hazards.js:13` only | the lava constants live at six sites: `hazards.js:13, 131, 133`, `nav.js:49`, `gen.js:219`, `terrainMesh.js:46, 76` | grep |
| PC-W9 | spec/M 3.15: "unknown prop type is a load error, not a silent inert prop" | the load error is at the boundaries (import, `fromDoc`, `Game._arenaFor` with `a.data`, `strictProps` worlds); `World._buildProps` keeps the silent skip by default so no Ancient world changes | `world.js:116` |
| PC-W10 | map 05 risk 1: "there is NO golden test today" | still true for G2; new evidence: Node and Chromium agree on 46 of 46 arenas, so G2 may be recorded and compared in both engines | F1 |
| PC-W11 | map 05 section 2.1/4: the Ancient-only importer list | `inZone` is exported by `gen.js` but imported nowhere; `DECOR` (`gen.js:17`) is an unused constant; both stay untouched | grep |

**6.2 Cross-spec amendments requested (text given, mechanical).**

| id | target | change |
|---|---|---|
| AM-W1 | spec/AR 3.1.5, 3.8.2 | the Ancient `data.js` export list gains `MATERIALS` (from the new leaf `era_ancient/materials.js`) and `WEATHERS` (the 7 literal strings), so `manifest.expect.materials = 16` holds; the manifest schema gains `sharedProps` (like `sharedParts`) |
| AM-W2 | spec/M 3.12 weather rows | add `spores {speed 1, spread 1.0, vis 0.9}` |
| AM-W3 | spec/M M12 | `Prop.fw/fd` and the rect tests of 3.2.5, `cover:'low'` normalisation of W-D05, `world.strictProps` (default false) |
| AM-W4 | spec/AR 3.2 AP table | rows AP-W05 (`era_ancient/materials.js` NEW), AP-W06 (`world/vocab.js`, `world/anchors.js` NEW); AP-S04 text mentions `foot` and `strictProps` |

## 7. Open items

| id | item | owner | deadline phase |
|---|---|---|---|
| OI-W1 | S-D8 spike verdict on the real 36 layouts (confirms or reverts W-D06) | SPIKE, signed by REVIEWER | P0 exit |
| OI-W2 | S-VOX spike verdict (confirms 0.2 for L/XL or applies the 0.1 fallback of 3.3.2) | SPIKE, REVIEWER | P0 exit |
| OI-W3 | apply AM-W1..AM-W4 in spec/AR and spec/M | DESIGN-ARCH (AM-W1, AM-W4), DESIGN-SIM (AM-W2, AM-W3) | P0 exit |
