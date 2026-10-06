# units_lib.md - humanoid part library, blueprints and tools (owner UNITS-LIB)

Everything a UNITS-A/B agent (or the Workshop/Painter, ANIM, BEASTS, SIM) needs to use or extend the humanoid pipeline.
Code: `src/content/era_ancient/parts/*.js` (library), `src/content/era_ancient/blueprints.js` (compiler), `src/content/era_ancient/units/t0.js`
(T0 models), `tools/contact.mjs` + `tools/tintcheck.mjs` (look-dev tools), `tests/units/*.test.mjs`.
The canonical grid table is `DIM` in `parts/_kit.js` (spec 4.1 is generated from it; it is stable - changing it breaks every saved soldier).

## 1. Pipeline in one picture
```
Blueprint JSON (spec 5)  --validateBlueprint-->  normalised bp
   -> baseGrids (skin body)  -> layers stamped in order:  legs, skirt, tunic, armour, shoulders, face, hair*, cape, back, helm, weapon, offhand
   -> applyPaint(bp.paint)   -> ModelDef (hum1 part ids, <= 16 parts, voxelSize 0.1) + attach points + metrics
   (* hair is skipped when the helm declares meta.hair = 'none')
```
`compileSoldier(bp, opts)` is the only path from data to a humanoid ModelDef (presets and custom soldiers). It is pure, deterministic
(from `bp.id` + contents) and takes ~4 ms.

### API (all exported from `blueprints.js`)
| function | notes |
|---|---|
| `compileSoldier(bp, opts?)` | returns `{model, scale:[x,y,z], grip, reach, height, radius, weaponStyle, weaponReady, twoHanded, weaponLen, warnings, voxels, parts}`. Throws `BlueprintError` (with `.errors[]`) on an invalid blueprint. `opts`: `range` (sim melee range, edge to edge), `radius`, `scale` (unit scale), `unlocked` (Set of unlock keys: enforces locks) |
| `compileForDef(bp, def, extra?)` | same, taking `range/radius/scale` from a UnitDef - **use this from `content.js modelFor`** so the weapon length rule sees the real range |
| `validateBlueprint(bp, {unlocked?})` | never throws. `{ok, errors[], warnings[], bp}`; `bp` is a normalised deep copy with defaults filled in (null when invalid). Errors are human text with "Did you mean 'corinthian'?" suggestions; echoed user text is truncated to 40 chars. Pass `unlocked` (Set) to enforce campaign locks; omit for presets |
| `defaultBlueprint()`, `randomBlueprint(rng, {unlocked?, name?})` | random is always legal and never uses locked parts unless unlocked; deterministic from the `RNG` |
| `PART_REGISTRY`, `listParts(cat, unlockedSet)`, `getPart`, `isPartUnlocked`, `UNLOCKS` | Workshop pickers: `listParts('helms', unlocked)` -> `[{id,name,category,locked,hint,unlockKey,meta}]` |
| `buildPartGrids(bp, opts)` | the canonical, UNPAINTED grids `{grids, ctx, bp, ...}` - the Voxel Painter starts from these |
| `applyPaint(bp, grids)`, `diffPaint(edited, generated)`, `PAINT_CAP`=1500, `PAINT_ERASE`=1 | see section 5 |
| `restTransforms(model, pose?)`, `restBounds(model, filter?)` | world-space rest/pose transforms and AABB (u) - used by tests and tintcheck |
| `BODY_TYPES`, `BODY_RADIUS`, `SKIN_TONES`, `SKIN_NAMES`, `HAIR_COLORS`, `EYE_COLORS`, `PALETTES`, `METALS`, `METAL_KEYS`, `EMBLEM_IDS` | swatch data for the Workshop |

`scale` is the body-type scale (`slim 0.92/1/0.92`, `stocky 1.12/0.98/1.12`) that BattleView multiplies into the instance scale; `height` already includes it.
`radius` defaults to 0.5/0.55/0.62 by body type, or `opts.radius` clamped to 0.3-0.7. `reach` is the tip distance from the body axis in a thrust (model space).

## 2. Registry and parts
Categories (target part in brackets): `helms [head+crest]`, `hair [head+crest+body]`, `faces [head+body]`, `tunics [body+limbs]`, `armors [body+limbs]`,
`shoulders [body+arms]`, `legs [leg parts]`, `skirts [legs+body]`, `capes [cape+cape2]`, `backs [back]`, `mains [weapon]`, `offs [offhand]`.
Blueprint slots: `head.helm/hair/face`, `torso.tunic/armor`, `legs.armor/skirt`, `shoulders`, `cape`, `back`, `main`, `off` (every category has a `none`).
Counts today: helms 36, hair 13, faces 12, tunics 9, armors 11, shoulders 6, legs 9, skirts 3, capes 5, backs 8, mains 47, offs 13.

Entry: `{id, name, category, build(ctx), meta, unlock?}`. `build(ctx)` returns **one VoxelGrid** (the category's primary target) or a **map `{partId: grid}`**
when the item spans parts. Grids are on the canonical hum1 sizes and contain only the item's own voxels; the compiler stamps them over the skin body in layer order
(later layers win). `registerParts` validates id (lower_snake_case), category and that `build` exists.

### Writing a part
```js
// src/content/era_ancient/parts/romans_helms.js      (faction parts: parts/<faction>_*.js; a leading '_' hides a file from the generated registry)
import { registerParts } from './_registry.js';
import { V, T, B, Bs, X, P, E, hash3, headSpace, cutFaceCube, metalAt } from './_kit.js';
import { lathe } from './helms.js';
export const PARTS = { helms: {} };
PARTS.helms.my_helm = {
  name: 'My helm', meta: { hair: 'none' },                 // meta.hair 'all' keeps the hair layer, 'none' hides it
  build(ctx) {
    const { head, crest, hs } = headSpace();               // draw in HEAD SPACE: y<8 -> head grid, y>=8 -> crest grid
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: (x, y, z) => metalAt(ctx, 0.3 + 0.1 * y) });
    cutFaceCube(hs);                                       // never replace the skull cube (x2..7,y0..5,z2..7): carve it out
    B(hs, 4, 5, 1, 5, 6, 8, ctx.t(1));                     // a team-tinted crest
    return { head, crest };
  },
};
registerParts(PARTS);                                       // self-registers on import
```
A unit module that needs the part just `import '../parts/romans_helms.js'` (side effect) before it is compiled. `tools/gen-registry.mjs` also imports every non-underscore
`parts/*.js` namespace, so the app gets them without edits; keep `export const PARTS` for introspection.

**Kit** (`parts/_kit.js`): `B/Bs/Be/X/Xs/P/Ps` (inclusive boxes; `s` = mirrored about the grid centre plane), `E` (ellipsoid by voxel index distance), `sprite` (ASCII
pixel art), `emblem`, `lathe` (helms.js: stacked rounded-square cross-sections), `gripWrap`, `headSpace`, `metalAt(ctx,f)`, `hash3` (stable noise), `vgrad`, `lighten/darken`, `DIM`, `newGrid(partId)`.
Coordinates are voxel INDICES; left of the character is +X; z+ is front. Even-width grids are symmetric about x = 4.5 (head, body), 3-wide arms about x = 1.

**ctx** (given to every builder): `ctx.c = {skin, hair, eyes, primary, secondary, trim, cloth}` (0xRRGGBB), `ctx.m` = 5-step metal ramp dark->light (`ctx.mt(i)` = voxel),
`ctx.t(f)` = team-tinted voxel from the cloth colour shaded by f, `ctx.emblem`, `ctx.bodyType`, `ctx.rng` (seeded per layer: use it, never `Math.random`), weapons also get
`ctx.len` (voxels from the grip to the tip, already clamped by the length rule) and `ctx.back` (voxels behind the grip). Part meta `metal: 'bronze'` forces a metal for that part (named items like `thorax_bronze`).

### Hard rules (enforced by `tests/units/parts.test.mjs`)
- every write stays inside the canonical grid (the test wraps `VoxelGrid.set` and fails on any out-of-bounds voxel), voxels carry the solid flag, builders are deterministic;
- helm/hair/face layers are drawn OUTSIDE the skull cube (use `cutFaceCube`); crests/plumes/horns that rise above y=7 live in the crest grid (head space handles the split);
- no voxel of a part may poke below y = 0 at rest or (offhand) through the back of the body: the compiler tilts weapons upward until their lowest corner clears the floor, shields must stay <= 16x16x6;
- ids are immutable once shipped; every registered item has a readable `name`.

## 3. Tinting rules (spec 5, decisions R2.12)
`ctx.t(f)` writes an `F_TEAM` voxel: the renderer multiplies its colour by the team colour, so the base is the (light) `cloth` colour; vary `f` 0.8-1.25 for form (lighter top,
darker bottom, noise via `hash3`). Faction colours (`primary`, `secondary`, `trim`) and metals are NOT tinted: use them for borders, emblems, hems and metal.
**Every unit needs >= 30% tinted visible surface** (`tools/tintcheck.mjs`: front/back/side z-buffer projections in the rest and the ready pose, pooled >= 30%, each view >= 15%).
What carries tint cheaply: tunic/chiton incl. sleeves and the thigh hem, capes, scarves, crests/plumes/feathers, shield faces AND shield rims/back rings (the side view sees the rim),
bandage/wrap strips, war paint, trousers/leg wraps, armbands. A bare-armed, bare-legged soldier in metal armour will fail: add cloth. Neutral shield faces (legionary scutum) are fine
if the rim/boss ring/tunic/crest carry the tint.

## 4. Weapons
Weapon grid 9x48x9, grip voxel (4,10,4), shaft/blade along +Y, cutting edge toward +Z, blade flat facing +/-X. `meta`: `style` (slash|thrust|overhead|bash|shoot|throw|cast|pike|none),
`len` (natural voxels beyond the grip), `back` (<= 10), `rest` (static rest rotation about X relative to the forearm: carry orientation; **not a cross-agent contract** - the Animator derives the blade axis from
`R_rest*(0,1,0)`), `twoHanded` (the compiler drops the off-hand and warns), `grip`, `minLen`, `noClamp` (bows, standard), `ready` (elevation in degrees for the contact-sheet ready stance), `kind`.
**Length rule**: `len = clamp(min(natural, floor((maxD - 0.95)/(0.1*K))), minLen, natural)` with `maxD = min(3.6, range + radius + 0.3)/scale` and K = 1.0 thrust/pike, 0.78 slash, 0.72 overhead, 0.8 bash,
0.75 throw/cast: the tip of a thrust never passes `range + radius + 0.3` from the body axis, custom weapons never reach beyond 3.6 u. Natural lengths are tuned to the stat ranges
(dory 21, spear 22, gladius 13, ...), so with the right `opts.range` the clamp only shortens. The strategos' tall banner is the main-hand `standard`.

## 5. Painting (Voxel Painter / `bp.paint`)
`bp.paint[partId]` is `grid.toRLE()` (`{sx,sy,sz,rle:[n,v,...]}`) of an **override layer** on the canonical grid: value 0 = keep the generated voxel, `PAINT_ERASE` (1) = delete it, any other value
(with the solid flag, e.g. `V()/T()/G()`) = set it. At most `PAINT_CAP` (1500) non-zero cells per part; validation rejects wrong grid sizes, corrupt runs and caps with plain-English messages.
Workflow: `buildPartGrids(bp)` -> edit a clone of `grids[partId]` -> `diffPaint(edited, generated)` -> store the returned RLE in `bp.paint[partId]` (null = nothing to store).

## 6. Unlocks (E9)
`UNLOCKS = {silly_helms, silly_weapons, wings}` (`{key, hint}`): colander, traffic_cone, cooking_pot, straw_hat -> `silly_helms`; fish, rubber_chicken, baguette, frying_pan, scroll_of_doom,
olive_branch, foam_finger -> `silly_weapons`; `wings` -> `wings`. CAMPAIGN grants keys (Set) and passes it to the Workshop (`listParts`) and to validation (`validateBlueprint(bp, {unlocked})`).

## 7. Units (T0) and the model-spec shape
`units/t0.js`: `export const MODELS = {id: {kind:'humanoid', blueprint}}` (what `content.js` reads) and `BLUEPRINTS = {id: bp}` (what BEASTS reads for `rider_companion`, `rider_equites`).
Colour roles in `bp.colors`: `primary` (faction accent, not tinted), `secondary` (gold/trim), `trim` (leather/dark), `metal`, `cloth` (light base for `T()`).

## 8. Tools
- `node tools/contact.mjs --name t0` - contact sheets (docs/sheets/<name>[_n].png): per unit front, 3/4 weapon side, 3/4 shield side, side, back, close head for team A and B, plus eight 40 px-tall silhouettes
  on the arena grass colour (blitted 2x). Options: `--units a,b`, `--bp file.json`, `--layout full|roster`, `--catalog <category> [--base unit] [--ids a,b]` (every part of a category on a base soldier), `--scale 2` (hi-res), `--per N`.
  The ready stance is `tools/contact_pose.js` (arms raised, weapon aimed per style, shield kept facing +Z) - ANIM can reuse it.
- `node tools/tintcheck.mjs [--units a,b] [--explain unit]` - U3 table; exit code 1 on failure; `--explain` lists visible/tinted pixels per part and view.
- Tests: `node tests/units/parts.test.mjs`, `blueprints.test.mjs` (U2, validation, determinism, paint, length rule, E9, 1,000-blueprint fuzz), `tint.test.mjs` (U3 + negative control).
