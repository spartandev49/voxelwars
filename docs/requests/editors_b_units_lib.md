# Requests from EDITORS-B to UNITS-LIB (blueprints.js)

1. `validateBlueprint` -> `validatePaint`: `const d = DIM[pid]` is a plain-object lookup, so `paint: {"__proto__": {...}}` / `{"constructor": {...}}` resolves to `Object.prototype` / `Object`, `d.size` is undefined
   and the function throws a TypeError although it is documented as "never throws". `checkSoldier` (save/validate.js) wraps the call and pre-scans for forbidden keys, so soldiers are safe, but `validateBlueprint` is
   also called directly by `compileSoldier` and the Workshop: please use `Object.prototype.hasOwnProperty.call(DIM, pid)` (or make `DIM` null-prototype).
2. The weapon-length rule trims thrown and magic weapons to the MELEE fallback range (javelin 17 -> 16, pilum 22 -> 16, scepter_sun 22 -> 14 voxels for every `range` stat), which a player cannot fix with reach points.
   For custom soldiers `custom.js compileOptsOf` therefore passes `range: undefined` when the derived def is ranged (only the 3.6 u cap applies). `compileForDef` for shipped ranged units still trims; decide whether that is intended.
3. `compileSoldier(...).scale` is the body-type vector only. Custom soldiers also have a height slider 0.9-1.2; `custom.js effectiveScale(type, height)` = `clamp(h * vector[axis], 0.85, 1.35)` per axis (clamp AFTER the
   multiplication) and `compileFromDef(def)` returns it as `{eff, scale: eff / height}`. If you want it inside the compiler, read `bp.body.height` (0.9-1.2); today an unknown `body.height` is silently dropped by the normaliser.
4. `buildPartGrids(bp, {range, radius, scale})` must receive the same options as the final `compileSoldier`: the painter diffs against the GENERATED grids, and the weapon grid depends on them (`PaintDoc` takes them from `custom.js compileOptsOf`).
