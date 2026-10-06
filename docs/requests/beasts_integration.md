# BEASTS -> COORD / SIM / ANIM / DOCS-A : integration notes and requests

## COORD (registry + content assembly)
- `src/content/era_ancient/beasts/index.js` is the module the generated registry should merge. It exports `BUILDERS` (builder id -> `(opts) => ModelDef`, ids exactly as in UnitDefs), `BUILDER_KIND` ('mounted' | 'beast' | 'bespoke'), `MOUNT_PRESETS`, `buildMounted`, `buildBeast`, `buildBespoke`, `SHEET_MODELS`. The other files in `beasts/` are libraries (no `BUILDERS` export): the glob must tolerate that.
- Assembly: UnitDef `{kind:'mounted', mount, mountColors, rider}` -> `buildMounted({mount, mountColors, rider: compileSoldier(riderBlueprint).model})`; the six mounted unit ids also exist as `BUILDERS[id]({rider})`. `{kind:'beast'|'bespoke', builder, opts}` -> `BUILDERS[builder](opts)`.
- Crews: builders default to the 6-part `hum_lite` stand-in (spec 4.1). To use UNITS-LIB's compact crew pass `compileSoldier(bp, {lite:true}).model`: `war_elephant {crew:[a,b]}`, `chariot_archer {driver, archer}`, `catapult {crew:[c1,c2,c3]}`, `ballista {crew:[c1,c2]}`. Verified <= 48 parts in every case (chariot 42, elephant 35, catapult 39, ballista 28; tests/beasts/mounted.test.mjs). Mounted units with a real UNITS rider: 24-26 parts.
- Every composed model sets `meta.subrigs` (prefix, rig, parts, kind), `meta.clipMap`, `meta.species`, `meta.weaponStyle` (mounted, centaur, chariot, elephant) and, new, `meta.height` / `meta.footprint` (true rest-pose extents in u) for health bars and cameras.
- VoxSkin cap 48 is in (thanks); `tools/shot_beasts.mjs` no longer patches it.

## SIM (stats.js radii / heights; informational, no change forced)
Rest-pose model extents (u, width x length) against the sim collision radius: war_elephant 3.4 x 8.9 (r 1.5; the length is the whole animal incl. trunk, 4.6 u shoulder, 7.7 u with the howdah crew), catapult 4.2 x 5.4 and 4.75 u tall at the arm tip (r 1.1; spec text said ~3 u, the machine is built 1.25x so it dwarfs its 2.9 u crew), ballista 4.9 x 6.6 (r 0.9), chariot_archer 2.7 x 7.5 (r 0.9), trojan_horse 3.2 x 7.0 and 6.0 u tall (r 1.4), cavalry about 1.6-2.0 x 5.6-5.9 (r 0.8). If overlap on screen is a problem raise those radii or ask BEASTS for a smaller `k` (`o.k` on catapult/ballista, `k` on horses).

## ANIM
- Rest rotations that must not be doubled by clips: mounted riders carry the SEATED pose as static `rest` (`mounted.js SEAT_REST`: r_legUL/UR rest rx -1.22, rz +-0.30; r_legLL/LR rest rx +1.2; r_cape +0.55, r_cape2 +0.3). `ride_*` clips should add small deltas on the legs, not re-pose them.
- centaur_archer: quad1 sub-rig has `neck` (chest rise) but NO `head`/`mane`/`ears`; the torso sub-rig `r_` is declared `hum_lite` (hum1 skeleton without legs, with forearms + bow `r_weapon` + quiver `r_back`), so hum1 clips apply and missing legs are ignored silently. Expect a warn-once for a quad1 clip that animates `head` there.
- Optional rig parts for polish: catapult1 `stone` (child of `sling`; scale to 0 at launch), ballista1 `string` (translate -Z to draw) and `bolt` (translate with the string, shoot, scale 0), trojan1 `hatch` (hinged at the REAR edge, positive rx opens it as a ramp ~1.05 rad), elephant1 `earL/earR` (rest ry -+0.32, flap about ry), howdah crew yaw +-0.5 at rest.
- Camel: `meta.gait.pace = true` (pace gait: legFL+legBL together). Gait recipe per species in `meta.gait` (stride = 2*hipH*sin(amp)/duty).
- Wheels: `meta.wheelRadius` is in u and matches the wheel parts' voxel extent (tested); wheel parts are `wheelL/wheelR` (chariot, catapult, ballista) and `wheelFL/FR/BL/BR` (trojan), axle along X.

## DOCS-A (docs/spec/rigs.md)
`node tests/beasts/rigtables.mjs` prints the tables in the rigs.md format straight from the builders; the tables in rigs.md were read before the last visual passes. Known drift: catapult/ballista are built at K = 1.25 / 1.3 (rigs.md says 1.35 for the catapult), elephant ears are larger (grid 4,34,28, pivot 2,30,24, rest ry -+0.32), chicken wing/leg/head/tail grids, trojan head/neck/base grids, goat horns grid, horse tail/head grids.

## Tools and tests added
`tools/shot_beasts.mjs [--all | --only=id,id --group=mount|beast|siege|big --mode=sheet|zoom|turn --cell=N --out=file]`, `tests/beasts/{builders,rigs,mounted,hum_lite,animator}.test.mjs`, `tests/beasts/preview.mjs` (fast software preview, no WebGL), `tests/beasts/sheet_demo.js` (the sheet page), `tests/beasts/rigtables.mjs`.
