# Requests from UNITS-LIB

## To COORD (content.js / registry)
1. `content.js modelFor`: call `BLUEPRINTS.compileForDef(spec.blueprint, def)` (or `compileSoldier(bp, {range: def.melee?.range, radius: def.radius, scale: def.scale})`) instead of `compile(bp, {teamTint:true})`.
   Without `range` the weapon length rule can only apply the 3.6 u custom cap (spears then look ~0.7 u too long for range-2.0 units). The result also carries `scale` (body type) which `modelFor` already forwards.
2. Parts modules self-register on import (`registerParts(PARTS)` at the bottom of each `parts/*.js`); `PART_MODULES` from the generated registry only needs to be imported once at boot (blueprints.js already imports the core files). Files starting with `_` (`_kit.js`, `_registry.js`, `_base.js`) are helpers.
3. `DIM` in `parts/_kit.js` is unchanged from spec 4.1 (no part sizes, pivots or origins moved). hum_lite: nothing to do from my side (decision R.1: BEASTS builds it).
4. The Workshop silly-part locks use keys `silly_helms`, `silly_weapons`, `wings` (see `UNLOCKS`): CAMPAIGN has to grant them and the app must pass the unlocked Set to `listParts` / `validateBlueprint(bp, {unlocked})`.

## To SIM
- `compileSoldier(...).reach` = tip distance from the body axis in a thrust (u, model space, before unit scale). For custom soldiers derive `range = max(0.8, reach - radius - 0.3)` (the same rule the compiler uses to clamp preset weapons); weapon meta (`style`, `len`, `twoHanded`) is in `PART_REGISTRY.mains[id].meta`. `radius` returned is the body-type default (0.5/0.55/0.62); shielded infantry (shield width >= 12) should override with >= 0.65 as per D2 (the compiler accepts `opts.radius`).
- Weapon style ids used by the library: slash, thrust, overhead, bash, shoot, throw, cast, pike, none (spec 4.1/5).

## To ANIM
- Part ids are the spec's (`body head crest armUL armLL armUR armLR weapon offhand legUL legLL legUR legLR back cape cape2`); empty parts (no crest, cape, back, weapon, offhand) are omitted. Weapon rest rotation is `model.byId.weapon.rest = [rx,0,0]` (carry orientation: blades 2.44 rad down-forward, polearms 0.3 rad upright, bows 0.3 rad); the compiler tilts it toward horizontal when the butt would sink below y = 0. Derive blade directions from `R_rest*(0,1,0)`, not from a table.
- Weapon blade/shaft = local +Y, cutting edge +Z, flat faces +/-X; shield face normal +Z, `offs[id].meta.rest` (only `second_sword` uses one).
- `tools/contact_pose.js: readyPose(model, {weaponStyle, twoHanded, ready})` is a worked example of aiming the weapon part at a world elevation and keeping the shield facing +Z while the forearm is bent (weapon pose rx = target angle - (armU.rx + armL.rx) - rest.rx).
- Tall crests/plumes live in the `crest` part (child of `head`); horns/wings are static (a little sway on `crest`/`cape`/`cape2`/`back` is the intended use).

## To EDITORS-B (Workshop / Voxel Painter)
- API in docs/units_lib.md sections 1, 5, 6: `listParts(category, unlockedSet)`, `validateBlueprint` (human messages), `randomBlueprint`, `buildPartGrids` + `diffPaint` for the painter, `PAINT_CAP`, `PAINT_ERASE`, swatch data (`SKIN_TONES`, `HAIR_COLORS`, `PALETTES`, `METAL_KEYS`, `EMBLEM_IDS`).
- `compileSoldier` takes ~4 ms: a live turntable rebuild per click is fine.

## To BEASTS
- `units/t0.js BLUEPRINTS.rider_companion / rider_equites` compile to 14-15 part hum1 models (long cloak = cape + cape2) (`meta.rig = 'hum1'`), attach points `grip_main grip_off eyes head_top muzzle body_center feet`; compose with prefix `r_`.

## To UNITS-A / UNITS-B
- Read docs/units_lib.md. Add faction parts as `parts/<faction>_*.js` (self-registering), blueprints in `units/<tier>_<faction>.js` exporting `MODELS`; run `node tools/tintcheck.mjs --units <ids>` (>= 30%) and `node tools/contact.mjs --units <ids> --name <sheet>` and read the sheet at 3 zoom levels; `node tests/units/blueprints.test.mjs` compiles every shipped unit under the U2 limits.
