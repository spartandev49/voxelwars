# Requests from PROPS (to COORD unless noted)

## 1. Integration notes (nothing to change, please confirm)
- `src/render/props.js` exports `PropRenderer(engine, arena|null, {fx?, crowd?, lights?})`, `PROP_TIERS`, `preloadPropGeometry(props, onProgress)`, `disposePropGeometry()`.
  `Game` (`setArena(arena, simProps)`, `update(dt)`) and `BattleView` (`setStageById`, `removeById(id, payload)`, `debrisColors(type)`) and `EditorHost`
  (`add/removeById/transform/pick/setProps/reground/clear`) all work against it today: item ids are `arena.props` index + 1 (identical to `sim/world.js`).
- `removeById(id)` is a hard removal (editor). `removeById(id, payload)` with the sim's `prop_destroyed` payload (what BattleView passes) collapses the prop to its
  rubble stage and spawns nothing (BattleView already spawns the debris cubes). `remove(id)` collapses AND spawns 30-80 debris cubes from the `fx` pool passed at construction.
- Call `props.setQuality(tierKey)` whenever `Engine.setQuality` is called (shadow flags, LOD distance, cull distance, torch lights). `props.update(dt, camera)` should run
  AFTER the camera rig updated this frame (culling uses the camera matrices; one frame of lag is invisible but not free).
- The point-light pool is a constant 2 lights at every tier (intensity 0 on Potato/Papyrus or when the group is hidden), so toggling tiers never changes the light count.
- `props/models/index.js` is a small hand-written aggregation of `props/models/*.js` inside my own directory (static imports, no globbing). If the generated registry
  should own it instead, extend the glob with `props/models/*.js` and I will switch `index.js` to the registry (the exported API stays the same).

## 2. Engine look (src/render/engine.js, COORD)
- **Night floor**: after ~19:00 `Engine.setEnvironment` drops the hemisphere light so low that dark-ground arenas (Styx, night variants) become unreadable even with
  glowing lava/torches. Styx is shipped at 19.4 h (late dusk) as a workaround. Proposed: `hemi.intensity = max(current, 0.5)` at night with a cold colour (moonlight), and
  `sun.intensity` floor 0.25 tinted `0x9fb4ff`. R12 (6/12/18/23 h sheets, `node tools/arena_sheet.mjs <recipe> --env times`) shows 23:00 as nearly black on every grassy arena.
- `Engine.setQuality` calls `needsUpdate` on every material; prop meshes use the shared `getVoxelMaterial()` (one extra program for "instanced without instanceColor").
  Nothing to do, just do not add per-tier defines.

## 3. SIM
- The colosseum crowd reacts to `unit_kill` clusters, `first_blood`, `kill_streak`, `hero_down` and `battle_end` through `PropRenderer.bindEvents(bus)`. Spec §2 also names a
  rate-limited `crowd_roar{strength,x,z}` event: the renderer listens to it too, but the sim does not emit it yet (optional; the kill clusters already drive the wave).
- `prop_damaged.hpFrac < 0.6` selects the cracked stage; `prop_destroyed` the rubble stage. Both are consumed; please keep payload field names (`id,type,x,y,z,s`).

## 4. ANIM
- `buildSpectator(variant)` (src/content/era_ancient/props/models/crowd.js, re-exported by models/index.js) is a `hum_lite` ModelDef: parts `body, head, armUL, armUR, legUL, legUR`
  with the hum1 grid sizes, pivots and parents (left = +X), `meta.rig = 'hum1'`, `meta.lite = true`. Only deviation: the body origin is y = 5 voxels (hum1: 10, because there
  are no shins) so the feet touch the ground; the spectator is 2.1-2.4 u tall depending on the hat.
- The renderer poses spectators procedurally (idle sway, cheer = arms up + hop, gasp). To use real clips call `props.setCrowdPose((pose /*Float32Array 6*9*/, kind /*'cheer'|'gasp'*/, k /*0..1 intensity*/, time, phase, member) => {...})`;
  the pose layout is the standard 9 floats per part (tx,ty,tz,rx,ry,rz,sx,sy,sz) in the order `body, head, armUL, armUR, legUL, legUR`.

## 5. Not mine, seen while looking at arenas
- Hazard visuals (spikes at the Colosseum centre, geysers at the Styx banks) are not drawn by any renderer yet: the sheets show a dark painted disc only. Hazards live in `arena.hazards`.
- `node tools/look.mjs` currently fails to boot the built game (`ReferenceError: PUZZLES is not defined` in dist/voxelwars.html at start), so the Teutoburg check was done with
  `tools/arena_sheet.mjs --cams battle` (same camera maths as `Game.frameArmies` + `CameraRig`, stand-in soldiers) and `tests/props/readability.test.mjs`.
