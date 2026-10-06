# spec.md — VOXELWARS contracts v1.2 (FROZEN before agents start; v1.1 = after review rounds 1 and 2; v1.2 = round 3: decisions D1-D14 of `docs/decisions_r3.md` folded in, code of 2026-10-06 03:40 UTC as truth for what already exists)

Companion files: `spec/units.md` (roster design + abilities), `spec/world.md` (arenas, props, campaign, survival), `spec/ui.md` (art direction, tokens, screens, HUD, input), `spec/editors.md`, `spec/audio.md`, `spec/humor.md`, `spec/rigs.md` (per-rig part tables of every non-humanoid rig, §4.2). `verification.md` = numbered acceptance criteria. `plan.md` = tiers, ownership, cut ladder. `app_contract.md` = Ctx/Game/HUD contract between the app shell and UI. **Numeric source of truth for unit stats is `src/content/era_ancient/stats.js` (SIM tunes it); `spec/units.md` is the design intent.** If this file and a companion disagree, this file wins; where the code already exists, the code is the truth for what it does and this file describes it.

## Changes since v1.1 (round 3)
- **Lint/gate (D1, §0.1, §13)**: exactly two browser adapters live inside pure directories, `src/core/tween.js` and `src/save/store.js`; `tools/lint.mjs` exempts them by path (`ADAPTERS`). The pure set is whole `src/anim/**`, not two files.
- **Test hook (§0.11)**: `window.__vw` accessors are live getters (`Object.defineProperties`); full member list.
- **Ownership (D9, §3)**: SIM owns `src/sim/**` NOW and COORD files requests as `docs/requests/<agent>_<topic>.md`; the eight files that had no owner now have one; `stats.js` is SIM's; content assembly names (`MODELS`, `BUILDERS`, `UNIT_TEXT`, `setCompiler`) are documented; `docs/spec/rigs.md` is new (BEASTS writes it).
- **hum1 (D2, D3, §4.1)**: the table is regenerated from `parts/_kit.js DIM` (16 parts); new offhand/weapon/back rules; `hum_lite` is a 6-part crew rig whose legs reach the floor; part cap 48 is enforced in `VoxSkin` (`MAX_PARTS`).
- **Other rigs (§4.2)**: part ids and counts follow the builders; the pivot/origin/size tables are in `spec/rigs.md`; chariot1 crew = `hum_lite`; trojan1 has 14 parts.
- **Readability (D2, §5)**: shield rule is a >= 3 voxel tint band (rim or boss ring); U3 is measured by `tools/tintcheck.mjs`. `compileSoldier` return shape documented. CustomSoldier (D13, §5.1): seven stats, one weapon field, radius 0.3-0.7, scale clamp after multiplication, 38,000-char share limit.
- **Knockback (D10, §6)**: three ranges: infantry <= 0.7 u, cavalry charge 1.5-3 u, monsters 3-5 u; `ability` budget restated (20 classes + 11 modifiers = 31 <= 32; `crowd_favorite` and `bribe` are a unit flag and a ranged param).
- **Animation (D4, D5, §7)**: the Animator contract is written as the code does it: `AnimExtra`, the root out-param, `ClipLib(id, rig)`, the UAL container, `anim/boot.js`, per-rig `speedRef`, sub-rig clips derived by the Animator. **`u.anim.mount/rider` are removed from the sim contract.** Death linger, locomotion bands and corpse root motion (render-owned) are stated.
- **Sim (D6, D7, §8)**: render-read list gains `deadT, deathCause, deathKind, kx, kz, ky, deathLinger`; one **Rules** table (§8.4); the event catalog (§8.2) mirrors the single `EVENTS` table (`core/events.js`) and carries every event the code emits.
- **Render (§9)**: `VoxSkin.add` signature as in code; `aFx.w` is reserved (no `tint` argument); `BattleView` applies the root through `Animator.applyRoot`.
- **Audio (D8, §10)**: the facade is exactly the calls the app uses.
- **Save (§11)**: key list incl. `vw.stats`, `vw.draft.*`, `vw.survival`, `vw.daily`, `vw.seen`; collection caps.
- **Gate (D11, §13, §14)**: `npm run gate` = lint + syntax + tests + contract validators + build + smoke; S22 exemption list stated once; the diagnostics beacon is T3, Q9 is a manual owner read-back at T0.
- **Caps (§2)**: 41 prop types (`gate_door`), debris + particles from `engine.js QUALITY` (Marble 8,000 + 3,500 = 11,500; Olympian 16,000 + 7,000 = 23,000).
- **Not yet in code (owner)**: `core/events.js EVENTS` table + `tests/events.test.mjs` (COORD+SIM); `sim/power.js`, `objectives`, `godpowers`, `hazards`, `mutators`, `possession`, `waves`, `lessons`, `stats.js` (SIM: today stubs or absent); Animator band/stride locomotion and `heading/phase/lod` wiring in BattleView (ANIM+COORD); removal of corpse `pitch` and the fake y arc from `World._tickDying` (SIM); `Game.command` injecting `type:'command'` and `timeLimit 0 = none` in `Game.begin` (COORD); cavalry/monster `kb` retune and shield radius >= 0.65 (SIM); gate steps contract validators + smoke (COORD); the `standard` main-hand part (UNITS-LIB).

## 0. Hard rules (enforced by `tools/lint.mjs`, run in the gate)
1. `src/sim/**`, `src/content/**`, `src/voxel/**`, `src/anim/**`, `src/core/**`, `src/world/**`, `src/save/**` are **pure**: no `window`, no `document`, no `THREE`, no `Math.random` in `sim/` and `content/`. They run in Node for tests and the balance harness. **Exactly two browser adapters are exempt from the `pure-dom` rule, by path (`ADAPTERS` in `tools/lint.mjs`)**: `src/core/tween.js` (the GSAP shim: reads `window.gsap` and `requestAnimationFrame` lazily) and `src/save/store.js` (the `localStorage` wrapper; takes an injectable backend so Node tests run it). They still obey the THREE and `Math.random` rules. No other file in a pure directory may touch the browser; adding an adapter requires a spec change.
2. Only `src/render/**`, `src/ui/**`, `src/editors/**`, `src/audio/**`, `src/app/**` may touch `window/document/THREE/AudioContext` (plus the two adapters of rule 1).
3. `THREE` is `window.THREE` (CDN global r128). `import ... from 'three'` fails the build (esbuild alias to a stub that throws). Libraries: three (+ our own post), GSAP optional via `window.gsap` through the adapter `core/tween.js`.
4. No `alert/confirm/prompt`, no `innerHTML` with user-controlled strings (use `textContent`), no `eval`/`new Function`, no `fetch` to non-relative URLs.
5. Cosmetic randomness uses `fxRand`; UI uses `Math.random` only for non-persistent cosmetics.
6. No per-tick allocation in `sim/` hot paths (no object/array literals inside per-unit loops; pre-allocate scratch). Event payloads are reused objects (`world.P.<event>`, derived from the `EVENTS` table, §8.2), consumers must not retain them.
7. Never `Read`/`cat` `dist/*`, audio, or base64 blobs. Use `stat`, `wc -c`, `head -c 400`.
8. Ids (unit, prop, clip, cue, achievement, arena preset) are `lower_snake_case`, immutable once shipped; removal leaves a tombstone (`src/save/tombstones.js`). **Rig part ids are exempt and fixed by §4** (`armUL`, `legLL`, …).
9. Every user-visible string lives in content data (humor pass can edit it).
10. Content modules register through the generated registry (`tools/gen-registry.mjs` -> `src/_generated/registry.*.js`; globs `units/*.js`, `parts/*.js`, `beasts/*.js`, `props/models/*.js`, `humor/*.js`, `anim/clips/*.js`, `sim/abilities/*.js`, `ui/screens/*.js`, `ui/hud/*.js`, `editors/*.js`, plus the optional single modules listed in the generator). Never hand-edit the registry or add manual barrels.
11. `window.__vw` (test hook, installed by `app/main.js installHook`, **always installed**) exposes data and drives the loop only (no cheats). Live accessors **`game, world, engine, state`** are defined with `Object.defineProperties` (getters; `Object.assign` would freeze their value at install time and is forbidden for them). Data members: `app, clock, metrics(), step(n), goto(id, params), seed(s), quick(opts), fight(), audio` (the audio test hook of `spec/audio.md §6`), `version`. Debug overlays are the only thing stripped from dist.

## 1. Conventions
- **Axes**: right-handed, +Y up, a character faces **+Z**; its LEFT side is **+X**, its RIGHT side **-X**. Heading `h` rotates about +Y: forward = `(sin h, 0, cos h)`, left = `(cos h, 0, -sin h)`. Positive `rx` rotates +Y toward +Z (so a hanging arm (−Y) swings forward with **negative** rx, a leg swings forward with negative rx); positive `ry` turns +Z toward +X; euler order `Ry*Rx*Rz`.
- **World units**: 1 u. Terrain cell = 0.5 u cube; height quantum 0.5 u. **Humanoid voxel = 0.1 u; a hum1 soldier is 29 voxels = 2.9 u tall (3.3 u with crest), 1.6 u wide with arms; default collision radius 0.55 u.** All shipped ModelDefs use voxelSize 0.1 (giants use more voxels or instance scale).
- **Time**: seconds. Sim tick `DT = 1/30`; clip frame rate 30 fps; `ClipLib` APIs are in **seconds**.
- **Colours**: `0xRRGGBB` sRGB integers in data; the renderer converts to linear.
- **RNG streams**: `sim` (seeded), `fx` (cosmetic), `ui`. Never shared.
- **Determinism promise**: same build + same setup + same seed + same tick-stamped inputs => identical battle in the same browser. Share codes carry setup+seed+rules. Hit-stop is **render-only** (animation clock freeze + camera hold); the sim never pauses an entity. Unit ids come from a per-World counter (`world.nextUnitId`), never from a module global.
- **Teams**: `0 = A (blue/cobalt)`, `1 = B (red/crimson)` only. There is no neutral team: the VIP goat, wild chickens and summoned units belong to a player team. Team colours come from `style.TEAM_COLORS[palette]` (Classic, Colour-blind safe, High-contrast).
- **Ground**: a unit's Y = `arena.cellHeight(x,z)` (top of the cube it stands on) approached upward at 12 u/s and falling freely downward (gravity); R6 measures against `cellHeight`. `heightAt` (bilinear) is for cameras/FX only.

## 2. Caps table (single source for numbers; everything else refers here)
| thing | value |
|---|---|
| shipped humanoid/mounts/bespoke units | 43 (`stats.js`: Hellenes 7, Romans 7, Egyptians 8, Persians 5, Carthaginians 4, Barbarians 5, Mythic 7) |
| arena presets | 14 + `arenalab` + `random` (16 recipes in `world/gen.js RECIPES`); sizes 128/192/256 cells |
| god powers | 6 (zeus_lightning, meteor, earthquake, heal_wave, wine_rain, raise_chickens) |
| distinct unit types per battle | 16 (`Game TYPE_CAP`) |
| unit cap per team by tier | Potato 100 / Papyrus 200 / Marble 300 / Olympian 400 (total = 2x) (`Game TIER_CAP`) |
| army budget presets (drachmae per team) | Skirmish 3,000 (~30 units) / Battle 8,000 (~80) / War 20,000 (~200) / Epic 40,000 (~400, capped by tier) / Custom (`Game BUDGET_PRESETS`) |
| debris cubes (live) | Potato 1,200 / Papyrus 3,500 / Marble 8,000 / Olympian 16,000 (`render/engine.js QUALITY.debris`) |
| particles (live) | Potato 600 / Papyrus 1,500 / Marble 3,500 / Olympian 7,000 (`QUALITY.particles`); the CubeFX cap is debris + particles (`Game._applyTier`): 1,800 / 5,000 / 11,500 / 23,000 |
| projectiles live | 600 default pool, hard max 4,000 |
| speech bubbles | 12 pooled DOM elements |
| damage-number glyph quads | 400 |
| props per arena | 1,500; prop types 41 (`PROP_CATALOG`, incl. `gate_door`); hazards 60; zones 2; markers 8 |
| arena name length | 32; description 200 |
| model parts | max **48** per ModelDef (`VoxSkin MAX_PARTS`; the part texture is `3*parts` texels wide = 144 texels; the constructor throws above 48) |
| share payload | text code <= 38,000 chars (chat-safe size classes: S <= 1.8k, M <= 8k, L <= 38k), larger via file |
| saved collections | arenas 48, soldiers 24, armies 24 (`Collection` caps in `app/main.js`) |
| soldiers in roster | 24 |
| lifetime stat keys | `src/save/stats.js` list (shape: `docs/lifetime_stats.md`) |

## 3. File layout and ownership (one owner per directory; nobody edits another's directory without asking the owner)
```
src/core/        COORD   util, rng, events (EventBus + the EVENTS table), tween (browser adapter: GSAP shim), ids, crc32, base64url, deflate fallback, undo.js (shared command/undo lib)
src/voxel/       COORD   grid mesher model compose (lod.js: far-LOD `downsample2`, COORD, planned) text3d (planned)
src/world/       COORD   arena gen nav
src/sim/         SIM     OWNS ALL OF src/sim/** FROM NOW (COORD wrote the core and no longer edits it; COORD files change requests as docs/requests/coord_<topic>.md):
                         world unit spatial ai squads combat projectiles consts defs formations + abilities/*.js objectives.js godpowers.js hazards.js possession.js armygen.js waves.js power.js stats.js (statsToUnitDef) lessons.js mutators.js
src/anim/        ANIM    clips.js animator.js dsl.js gait.js ual.js analysis.js boot.js (converter + registration entry) clips/*.js (authored hum1 + beast clips)   data: assets/anim/humanoid_clips.json (UAL, build inlines it)
src/content/era_ancient/
   stats.js      SIM     numeric truth for all units (its header comment "Owned by COORD" is wrong; SIM fixes it)
   content.js    COORD   content assembly (below): merges stats.js + models + text into UnitDefs, exposes modelFor() and setCompiler()
   fallback_model.js COORD  plain stand-in humanoid/beast ModelDef for any def without a model
   units/*.js    UNITS   model assignment per faction: export MODELS = {id: ModelSpec}
   parts/*.js    UNITS   humanoid part library (one agent owns the library; faction-specific parts live in parts/<faction>_*.js); parts/_kit.js DIM is the canonical hum1 grid table
   blueprints.js UNITS   compileSoldier(), validateBlueprint(), presets
   beasts/*.js   BEASTS  quad1 builders (horse, camel, hound, goat), centaur, mounted, elephant1, chariot1, catapult1, ballista1, chicken1, trojan1, hum_lite crews; beasts/index.js exports BUILDERS; BEASTS also writes docs/spec/rigs.md
   props/catalog.js SIM  (exists)      props/models/*.js PROPS  prop models + staged damage
   arenas.js     COORD   presets;  campaign.js CAMPAIGN (data + objectives wiring), campaign_text.js HUMOR
   humor/*.js    HUMOR   tips, achievements, announcer, quotes, names, mission text; export UNIT_TEXT = {id: {name, blurb, lore, deaths, taunts, codexJoke}} (units_text.js)
src/render/      COORD   engine post voxskin terrain props fx cameras style preview battleview tempanimator (stand-in animator, deleted when the real one is wired)
src/audio/       AUDIO   engine sfx music speech cues synth (index.js createAudio)
src/ui/          UI      kit.css screens.css hud.css kit.js screens/*.js hud/*.js ; editors.css owned by EDITORS
src/editors/     EDITORS-A (arena builder) / EDITORS-B (workshop + painter) ; shared core/undo.js
src/save/        COORD   store (adapter) schema migrate share validate tombstones stats
src/app/         COORD   main boot game router debugui nullaudio loop input perf diagnostics (every file under app/)
tools/           COORD   build gate lint gen-registry smoke balance(SIM) humor-sim(HUMOR) contact(UNITS) etc.   tests/ per owner   assets/ AUDIO-HUNTER (asset pipeline, ledger, credits)   docs/ COORD (+ the doc agents' files named in their briefs)
```
**Content assembly (`content/era_ancient/content.js buildContent()`)**: collects, through the generated registry, `MODELS` from every `units/*.js` (`{unitId: ModelSpec}`), `BUILDERS` from `beasts/index.js` (`{builderId: (opts?) -> ModelDef}`; builder ids are unit ids; each result carries `meta.{rig, kind, species, subrigs, clipMap, builder}`), and `UNIT_TEXT` from `humor/*.js`; merges them with `STAT_TABLE` into full UnitDefs (`buildSimDefs`) and returns `{defs, factions, modelFor(def, unit), setCompiler(fn), unitList(), MODELS, BUILDERS}`. `setCompiler(compileSoldier)` is called once by `app/main.js` (the compiler is optional until UNITS-LIB lands). `modelFor(def, unit)` returns `{model, scale?}` and caches by def id (`'c:'+customId` for custom soldiers): humanoid specs go through `compile(spec.blueprint, {teamTint:true}) -> {model, scale, ...}` (§5), mounted/beast/bespoke specs through `BUILDERS[spec.builder || def.id]`, anything else gets `fallback_model.js`.
Agents: **COORD**, **SIM**, **UNITS-LIB** then **UNITS-A / UNITS-B** (faction groups), **BEASTS**, **PROPS**, **ANIM**, **AUDIO**, **AUDIO-HUNTER** (done), **HUMOR**, **COMEDY-EDITOR** (independent), **CAMPAIGN**, **UI**, **EDITORS-A**, **EDITORS-B**, **QA** (read-only reviewer + persona playtests). **Change requests**: an agent that needs a change in a directory it does not own writes `docs/requests/<agent>_<topic>.md` (what, why, exact API) and keeps going with a local workaround; the owner integrates. COORD requests to SIM go the same way.

## 4. Voxel and model contracts (implemented in `src/voxel/`)
- `VoxelGrid(sx,sy,sz)` Uint32 voxels: `(flags<<24)|0xRRGGBB`; flags `F_SOLID=1,F_TEAM=2,F_GLOW=4`. Builders `V(rgb)`, `T(rgb)` (team-tinted: base colour multiplied by team colour — use light bases), `G(rgb)` emissive. DSL: `box, boxIfEmpty, carve, hollowBox, ellipsoid, sphere, cyl, line, cone, replace, mirrorX, stamp, rotY, bounds, toRLE/fromRLE`.
- `ModelDef(id, voxelSize=0.1)` -> `addPart(id, grid, {parent, origin (voxels, relative to the parent's pivot), pivot (voxel coords in own grid), rest:[rx,ry,rz], shadow})`, `addAttach(name, partId, [x,y,z])` (voxel coords INSIDE the part grid; stored as `model.attach[name] = {part, at}`), `meta: {rig, kind, ...}`. A ModelDef is pure data.
- Rest rotation is applied after the animated one: `local = T(origin+poseT) * R(pose) * R(rest) * S(poseS)`. Parents precede children. **Max 48 parts**; empty parts are omitted by builders (`addLG` drops an empty grid; a builder whose limb boxes fall outside its grid therefore silently loses the part, check `model.parts.length`).
- `composeModels(id, items)` (`voxel/compose.js`) merges models (mounts + riders, chariot team, elephant + howdah crew, catapult + crew) into ONE ModelDef so it renders as one skinned instance. Items attach to the base's attach points (`on`); sub-models get prefixes (`r_`, `h1_`, `d_`, `a_`, `a1_`, `c1_`); `meta.subrigs=[{prefix, rig, parts, kind}]` tells the animator which clips pose which parts (§7.3).
- **Attach points** are an FX/render facility only: `model.attach[name] = {part, at}` in voxel coords. The world-unit offset of a point relative to its part's pivot (the convention `VoxSkin.attachWorld(i, partIndex, lx, ly, lz, out)` uses) is computed by the helper `attachLocal(model, name)` (today in `beasts/common.js`; `ModelDef` has no such method). The **sim derives projectile launch points** from the def (`origin = unit position + forward*0.5 + height*0.72`).
- **LOD**: `voxel/lod.js: downsample2(grid)` (majority vote, 2x) builds a far-LOD grid (far mesh <= 30% of the near quads); VoxSkin holds near+far InstancedMesh pairs per type (2 draw calls) and splits instances by camera distance (near < 38 u at Marble). The shadow pass uses the far mesh.

### 4.1 Humanoid rig `hum1` (canonical; every humanoid, custom soldiers included)
**The canonical table is the `DIM` table in `src/content/era_ancient/parts/_kit.js` (UNITS-LIB); this table is regenerated from it** (grid size, pivot in the grid, origin from the parent's pivot, parent), 16 parts in `PART_ORDER`. Origins are in voxels relative to the parent pivot. Left = +X. "Extent" says which side of the pivot the grid extends.
| part | parent | grid (x,y,z) | pivot (in grid) | origin from parent | extent from pivot / notes |
|---|---|---|---|---|---|
| body | root | 10,9,5 | 5,0,2.5 | 0,10,0 | +Y 9; ±5 x; ±2.5 z |
| head | body | 10,10,10 | 5,0,5 | 0,9,0 | +Y 10; ±5 x; ±5 z (face cube x 2..7, y 0..5, z 2..7 → faces +Z) |
| crest | head | 10,8,12 | 5,0,6 | 0,6,0 | +Y 8; z -6..+6 (plume/horns/hair volume) |
| armUL | body | 3,5,3 | 1.5,5,1.5 | 6.5,8,0 | -Y 5 (hangs down) |
| armLL | armUL | 3,5,3 | 1.5,5,1.5 | 0,-5,0 | -Y 5; hand at the bottom (y 0..1) |
| armUR | body | 3,5,3 | 1.5,5,1.5 | -6.5,8,0 | -Y 5 |
| armLR | armUR | 3,5,3 | 1.5,5,1.5 | 0,-5,0 | -Y 5; hand at the bottom |
| weapon | armLR | 9,48,9 | 4,10,4 | 0,-4,0.5 | grip at the pivot; blade/shaft along **+Y** (38 above the grip, 10 behind), edge normal +Z |
| offhand | armLL | 16,16,6 | 8,8,3 | 0,-4,0.5 | grip at the pivot; shield face normal +Z before its rest rotation, rim in XY |
| legUL | root | 4,5,4 | 2,5,2 | 3,10,0 | -Y 5 |
| legLL | legUL | 4,5,6 | 2,5,2 | 0,-5,0 | -Y 5; foot extends +Z (z 4..5) |
| legUR | root | 4,5,4 | 2,5,2 | -3,10,0 | -Y 5 |
| legLR | legUR | 4,5,6 | 2,5,2 | 0,-5,0 | -Y 5; foot +Z |
| back | body | 12,14,8 | 6,7,8 | 0,7,-2.5 | **content extends toward -Z** (z -8..0 from the pivot), ±6 x, ±7 y; **top at y 24** (the head top is y 29) |
| cape | body | 10,14,2 | 5,14,1 | 0,8,-3 | -Y 14 (hangs) |
| cape2 | cape | 10,10,2 | 5,10,1 | 0,-14,0 | -Y 10 (child of cape) |
Required parts: body, head, the four arm parts, the four leg parts (10); optional: crest, weapon, offhand, back, cape, cape2 (6). Standing height = 10 (legs) + 9 (body) + 10 (head) = **29 voxels (2.9 u); 33 (3.3 u) with a tall crest**. Attach points (set by `compileSoldier`): `grip_main` (weapon pivot), `muzzle` (weapon tip), `grip_off` (offhand pivot, else armLL), `eyes`, `head_top`, `body_center`, `feet`.
- **Offhand rules (D2)**: the grid is at most 16x16x6 voxels (a pavise and a tower shield are also <= 16x16; nothing taller). Its pivot is the grip. Its rest rotation comes from the part registry (`PART_REGISTRY.offs[id].meta.rest`; shield meta is `{kind:'shield', w, h, rest?}`), and at runtime the Animator turns the shield from `R_rest*(0,0,1)` so its face stays toward the body's +Z when the arm lifts (block raises it in front, idle carries it forward-left). The rest-pose AABB **may overlap the torso and the forearm** (the arm passes through the strap; interior overlap is invisible). It **must not poke through the back of the body** (min z >= the body's back plane) **or below y = 0**.
- **Weapon rules (D2)**: the compiler tilts the weapon's rest rotation until its lowest rest corner is >= y 0 (`blueprints.js compileSoldier` runs the `restBounds` loop). The Animator derives the blade axis from `R_rest*(0,1,0)`, so **a rest number is not a cross-agent contract**; the animation spike's `Rx(140deg)` is a spike-local convention and is replaced by the Animator. **Weapon length rule**: `compileSoldier` clamps the weapon's forward extent so the tip is at `range + radius + 0.3` u from the body axis when thrusting; `range` in the sim is authoritative and measured **edge to edge** (`gap = dist - r1 - r2 <= range`). Custom weapon reach <= 3.6 u.
- **Back slot (D2)**: the grid stays 12x14x8 (top y 24). A banner on the back is a SHORT flag (<= y 24). A tall banner pole is a **main-hand `standard` weapon** (tint cloth), e.g. the strategos; there is no back-pole.
- **Shielded-infantry spacing (D2)**: a unit whose shield is >= 12 voxels wide uses `radius >= 0.65` in `stats.js` so lines do not interpenetrate (SIM retunes); phalanx formations may overlap shields at 1.15 u spacing, that is the look.
- Body types are whole-model scale at instance time (`slim 0.92/1.0/0.92`, `average 1`, `stocky 1.12/0.98/1.12`; `giant` per unit def), never separate grids. Default radius by body type: slim 0.5, average 0.55, stocky 0.62.
- **`hum_lite`** (crews, spectators; `beasts/hum_lite.js buildHumLite`): **6 parts** `body, head, armUL, armUR, legUL, legUR` at the canonical hum1 pivots and origins; no forearms and no shins, so the single arm part carries the whole limb (grid 3,10,3, pivot 1.5,10,1.5) and the single leg part the whole leg (grid 4,10,6, pivot 2,10,2, toe at z +2..3); legs are 10 voxels long, so **a crew member stands on the floor** (feet at y 0). The Animator poses `hum_lite` groups with the hum1 clips and ignores the missing parts silently.

### 4.2 Other rigs (part ids frozen; BEASTS builds, ANIM animates; each beast ModelDef sets `meta.rig`)
The per-part tables (parent, grid, pivot, origin, rest rotation, clip-relevant axes, attach points) of every rig below are in **`spec/rigs.md`** (read from the builders in `src/content/era_ancient/beasts/`, the builder is the truth).
- `quad1` (horse, camel, hound, goat, centaur body): `body, neck, head, tail, legFL, legFR, legBL, legBR` (+ static children: `saddle, mane, ears, horns (goat), barding (barded horse)`). Faces +Z; the body pivot is the BELLY LINE (grid y 0), legs hang along -Y from a pivot at their TOP; proportion parameters per species. Attach: `saddle`, `head_top`, `mouth`, `feet`. 8 core parts, <= 12 with children (horse 11, barded horse 12, camel 11, hound 10, goat 11).
- `elephant1` (13 parts): `body, head, trunkA, trunkB, trunkC, earL, earR, tail, legFL, legFR, legBL, legBR, howdah` (+ attach `howdah_a`, `howdah_b` for crew sub-models, `trunk_tip`). With two `hum_lite` howdah crew (`a1_`, `a2_`, 6 parts each) = 25.
- `chariot1` (4 parts): `body, wheelL, wheelR, pole`; attach `seat_driver`, `seat_archer`, `yoke_1`, `yoke_2`. The unit `chariot_archer` composes it with 2 quad1 horses (`h1_`, `h2_`; 8 core parts each as built, a horse may add saddle/mane/ears) and **two `hum_lite` crew (`d_` driver, `a_` archer, 6 parts each)**: 4 + 2x8 + 2x6 = **32 parts as built** (at most 4 + 2x12 + 12 = 40; <= 48; U2).
- `catapult1` (6 parts): `frame, wheelL, wheelR, arm, sling, stone` + 3 `hum_lite` crew (`c1_..c3_`) = 24; `ballista1` (6 parts): `frame, wheelL, wheelR, bow, string, bolt` + 2 crew (`c1_`, `c2_`) = 18.
- `chicken1` (7 parts): `body, head, wingL, wingR, legL, legR, tail`.
- `trojan1` (14 parts): `base, wheelFL, wheelFR, wheelBL, wheelBR, body, neck, head, tail, legFL, legFR, legBL, legBR, hatch`.
- Mounted unit = `composeModels(id, [{model: mount}, {model: hum1 rider, prefix:'r_', on:'saddle', offset:[0,-10,0]}])` (`beasts/mounted.js buildMounted`); the rider's seated pose is baked as static `rest` rotations (`SEAT_REST`: thighs forward about X, shins back, cape up) and the `ride_*` clips add deltas. A mounted unit is at most 28 parts (horse <= 12 + rider <= 16; 23-26 as built). The centaur (`centaur_archer`, 17 parts) is a quad1 body without neck, head, mane and ears + a legless humanoid upper body (`r_`).

## 5. Blueprint (humanoid recipe) — JSON schema v1
```jsonc
{ "v":1, "id":"hoplite", "name":"Hoplite",
  "body":  { "type":"average|slim|stocky", "skin":"#e0ac84", "hair":"#4a3426" },
  "head":  { "helm":"corinthian", "hair":"short", "face":"stubble", "eyes":"#222222" },
  "torso": { "armor":"thorax_bronze", "tunic":"chiton" },
  "legs":  { "armor":"greaves_bronze", "skirt":"pteruges" },
  "shoulders":"none", "cape":"none", "back":"none", "main":"dory", "off":"hoplon",
  "colors":{ "primary":"#c8453c","secondary":"#f2d36b","trim":"#2b2f5a","metal":"bronze|iron|gold|silver|steel|blackiron","cloth":"#e8e2d0" },
  "emblem":"lambda|none|eye|sun|boar|eagle|star|skull|wave|bolt",
  "paint": { "head": <RLE>, "body": <RLE> }   // painted voxels per part on the canonical grids (cap 1,500 voxels per part)
}
```
- `compileSoldier(bp, opts) -> {model: ModelDef, scale: [sx,sy,sz], grip, reach, height, radius, weaponStyle, twoHanded, weaponLen, warnings, voxels, parts}` is the ONLY path from data to a humanoid ModelDef (presets and custom soldiers alike). `opts = {range?, radius?, scale?, unlocked?, teamTint?}`: `range` is the sim melee range (edge to edge) used by the weapon-length rule, `radius` is clamped to 0.3-0.7 (default by body type, §4.1), `teamTint` is accepted and ignored (tint is always baked as `F_TEAM` voxels). `scale` is the body-type vector; `height` includes it. `compileForDef(bp, def)` fills `range/radius/scale` from a UnitDef. `validateBlueprint(bp) -> {ok, errors[], warnings[], bp}` rejects unknown ids with a human message (with a "did you mean" suggestion); defaults only for missing optional keys. `compileSoldier` throws `BlueprintError` on an invalid blueprint.
- Part builder: `(ctx) => VoxelGrid` (+ metadata for weapons `{style, reach, rest:[rx,ry,rz], twoHanded, grip:[x,y,z]}`; for shields `{kind:'shield', w, h, rest?}`); `ctx = {bp, colors, rng(seeded by bp.id), dims}`. `style` ∈ `slash|thrust|overhead|bash|shoot|throw|cast|pike|none`.
- **Readability rules**: every shield carries a **>= 3 voxel wide team-tint band** (rim or boss ring; the shield face itself keeps its heraldic colour, a legionary's scutum is a neutral red-brown); faction-specific helmet silhouettes; role recognisable at 40 px tall in a 3-zoom contact sheet. **Team tint (U3)**: >= 30% of the visible humanoid silhouette (cloth, plume, cape, shield rim, sash — the whole silhouette) is `F_TEAM`, measured by `tools/tintcheck.mjs` (pooled over front/back/side in the rest and the READY pose >= 30%, every projection >= 22%); non-humanoids (monsters, animals, siege) >= 15% (saddle cloth, blanket, banner, collar); faction colours persist on metal/trim. Every unit in `spec/units.md` has a "Tint:" line naming its tint surfaces. Mirror matches (same faction both sides) must stay readable by tint alone.

### 5.1 CustomSoldier (editors, save, share, sim)
```jsonc
{ "v":1, "id":"cs_xxxxx", "name":"Sir Chadius", "blueprint":{...},   // the weapon lives ONLY in blueprint.main
  "stats":{ "hp":n, "damage":n, "attackSpeed":n, "speed":n, "armor":n, "range":n, "morale":n /* seven stats, point-buy, total <= 100; per-stat caps and diminishing returns: spec/editors.md §2 */ },
  "abilities":["kick"], "ai":"charge|hold|skirmish|flank|guard|support",
  "text":{ "catch":"…", "deaths":["…","…","…"], "pitch":1.0 } }
```
`statsToUnitDef(cs) -> UnitDef` (in `sim/stats.js`) derives hp/dmg/cd/range/speed/armor/radius/mass from the stats + the weapon class tables; `costFormula` is applied to the DERIVED def (never trusted from files) and clamped by the role efficiency cap (editors.md). **Clamps**: `radius` 0.3-0.7 (default from body type: slim 0.5, average 0.55, stocky 0.62; the compiler clamps again); instance `scale` = height slider (0.9-1.2) x body-type vector (slim/stocky) and is then **clamped to 0.85-1.35 after the multiplication** (no giants, nothing below the floor); weapon reach <= 3.6 u; share code <= 38,000 characters (§11).

## 6. UnitDef (sim + content contract)
```ts
UnitDef {
  id, name, faction, role:'melee|ranged|cavalry|siege|support|hero|monster|swarm|beast', tags:string[], cost,
  model: {kind:'humanoid', blueprint, scale?} | {kind:'mounted', mount:'horse|camel', mountColors, rider:Blueprint} | {kind:'beast', builder, opts?} | {kind:'bespoke', builder, opts?},
  radius (default 0.55), height (display, default by role), mass (default 1), scale (default 1), rig? (animation rig for timing; default below),
  hp, armor 0..0.75, speed (u/s walk), runMul (default 1.5), accel 14, turnRate 9,
  melee?:  { dmg, cd, range, type:'slash|pierce|blunt', style, ap?, kb?, hook?, poison? },
  ranged?: { proj:'arrow|javelin|pilum|francisca|boulder|bolt|coin|sunbeam|scepter|thunderbolt', dmg, cd, range, minRange?, speed, gravity, spread, type?, ap?, aoe?, pierceN?, chain?, volley?, whileMoving?, crater?, misfire?, misaim?, fireEvery?, bribe?, breaksShield? },
  shield?: { arc /*half-angle degrees*/, block, proj },
  abilities: AbilityRef[],  ai:{style:'charge|hold|skirmish|flank|guard|support|siege|hero', leash?, preferTargets?},
  sfx?: {hit?, swing?, shoot?, death?, voice?}, text:{blurb,lore,deaths[3+],taunts[2+],codexJoke} (HUMOR)
}
AbilityRef = { id:string /* key in sim/abilities registry */, ...params }  e.g. {id:'cc_field', effect:'confuse', shape:'circle', radius:7, channel:3, cd:14}
```
- **Semantics**: `range` is the **gap** between body edges (centre distance - r1 - r2). `cd` is the **full cycle** between attack starts; the clip plays faster (rate 1..2.4x) if its natural length exceeds `0.92*cd`. `dmg` is pre-armor. `kb` is a knockback strength used with the constant **KB_SCALE = 0.06**: initial velocity `= kb * dmg/mass * KB_SCALE` (u/s), friction 6/s => travel `v0/6`, clamp max 48 u/s (8 u of travel). **Contract ranges (S25)**: a normal infantry hit nudges its target **<= 0.7 u** (0.5 u typical; crits excluded), a **cavalry charge hit shoves 1.5-3 u**, a **monster hit (elephant, minotaur, cyclops) shoves 3-5 u on a mass-1 target**; nothing exceeds 8 u. `stats.js` is the source of the per-unit `kb` (SIM tunes it to these ranges; `units.md` carries no kb column). Explicit-distance effects (kick 8 u, bull charge) set velocity directly.
- **Rig for timing**: the sim reads clip timing with the unit's rig: `defRig(def)` (`sim/combat.js`) = `def.rig`, else `def.model.rig`, else by id (`war_elephant` elephant1, `sacred_chicken` chicken1, `catapult` catapult1, `ballista` ballista1, `trojan_horse` trojan1, `chariot_archer` chariot1), else `quad1` for role `beast` or tag `animal`, else `hum1`.
- **Projectile rules**: sim derives launch point from def; leads moving targets (2 iterations); solves low-arc ballistic angle for `speed` and `gravity` (fallback 45°); adds gaussian `spread`; sub-steps so a step never exceeds 0.7 u; collision radius 0.3 (boulder 0.6); hits the first unit whose cylinder it crosses (skips shooter; friendly units only if friendlyFire, and 50% pass-over otherwise); blocked by `cover` props and terrain; shields intercept in the front arc with `shield.proj`; `pierceN` continues with 0.8x damage; `aoe` explodes with 1 -> 0.4 falloff; `crater:true` deforms terrain.
- Defaults when a field is absent are in `sim/defs.js: normalizeDef`; U1 validates against the schema + defaults, not "every field present".

### 6.1 Abilities (mechanics, not classes): <= 32 total (20 classes + 11 modifiers = 31), each with trigger, AI cast rule, **visible telegraph**, cue, announcer hook, unit test
Classes (20): `aura, stance, kick, cc_field, net, heal_pulse, execute, dot_cloud, revive, rage, chain_lightning, war_horn, dash, summon_on_death, tantrum, cluck, pack_bonus, bribe, throne, crowd_favorite`. Two of them are data, not casts: `crowd_favorite` is the unit flag `crowdFavorite: true` (gladiator) and `bribe` is the ranged param `ranged.bribe` (senator, coin chance); they count against the budget and are tested for effect. Passive/attack-modifiers (via `onHit` hook class, 11): `hook` (khopesh pulls shield), `breaksShield` (pilum), `fireEvery` (flaming arrows), `poison`, `misfire` (catapult), `misaim` (cyclops), `fire_panic` (elephant flees after 3 fire hits and tramples allies in its path), `trample`, `brace`, `charge`, `backstab`. Hook points: `init, tick, mods, onAim, onFire, onHitDealt, onBlocked, onBlock, onDamaged, onLethal, onKilled, onKill, onLand, onBurn, cast`. Implementations in `sim/abilities/<id>.js` self-register in `abilities/index.js` (`reg(id, impl)`, `abilityRegistry`).

## 7. Clips, animation contract (src/anim/)
**Two layers**: `anim/clips.js` (`ClipLib`: pure data, seconds API, used by the sim) and `anim/animator.js` (`Animator`: pure, no THREE; poses models from clips). Support modules, all pure: `dsl.js` (clip DSL + `bake`), `gait.js` (procedural biped/quadruped gait, planar IK), `ual.js` (retargeted JSON -> Clip converter), `analysis.js` (FK, foot-slide and rest-bounds metrics for tests), `boot.js` (bake + register everything), `clips/*.js` (authored clips; `clips/index.js` imports them).
```ts
Clip { id, fps:30, frames:N, loop:boolean, rig:'hum1|quad1|elephant1|…',   // rig defaults to 'hum1'
  q: { [partId]: number[] }        // interleaved rx,ry,rz radians per frame (length 3*frames); optional t: {[partId]: number[3*frames]} translation (world u, added to the part origin), s: {[partId]: number[3*frames]} scale
  root?: { y?:number[], x?:number[], z?:number[], pitch?:number[], roll?:number[], yaw?:number[] }   // length frames, world units / radians, applies to the instance root
  aim?: number[]                   // 3*frames: weapon aim [elevation, azimuth, weight] in the body frame (hum1 weapon overlay)
  meta: { hitFrame?, recoverFrame?, speedRef? /*u/s that matches the foot cadence*/, fx?:[{frame, cue}], cls?:'idle|ready|move|strike|shoot|down|other', fall?, fallBlend?, wheelSpeed?, src?, source? } }
```
### 7.1 ClipLib (what the sim and tools call)
```
ClipLib.meta(id, rig?) -> {dur, hit?, recover?, loop, speedRef?}   // seconds; never null (an unknown id answers with idle timing)
ClipLib.dur(id, rig?)   ClipLib.hit(id, rig?)                      // hit defaults to dur/2 when the clip has none
ClipLib.get(id, rig?) -> Clip|null        // the 'rig:id' clip when rig is given and registered, else the plain-id clip
ClipLib.getQualified(id, rig) -> Clip|null // rig-specific only, no fallback
ClipLib.register(clip)                    // clip.id and clip.frames > 0 required (else throws 'bad clip'); rig = clip.rig || 'hum1'
ClipLib.has(id)  ids()  qualifiedIds()  owner(id)  version (bumps on every register/reset; animator caches key off it)  reset() (tests: drops data, restores DEFAULT_META)
```
Storage: every clip is stored under `'rig:id'`; **the plain id belongs to `hum1` when hum1 has it, otherwise to the first rig that registered it**. `DEFAULT_META` (design timings) keeps the sim functional before any data is registered; registering real data replaces the timing so sim and visuals agree. **Shared timing rule (D4)**: all rig variants of one attack/shoot/cast id share `hit` and `recover` (the sim reads the plain id); **`speedRef` is per rig** (an elephant `walk` needs its own `speedRef`, not hum1's), and death and locomotion clips may differ in length per rig (the sim reads a death clip's length with the unit's rig, `ClipLib.dur(id, defRig(def))`).
### 7.2 The shipped container and its converter (D4)
The retargeted humanoid data is `assets/anim/humanoid_clips.json`, **not** the `Clip` format: `{rig:'hum1', fps:30, parts:[body, head, armUL, armLL, armUR, armLR, legUL, legLL, legUR, legLR], conventions, license, clips:{ <id>: {frames, loop, meta, q:{part:[rx,ry,rz per frame]}, root[] (vertical), rootX, rootZ, rootPitch, rootRoll, rootYaw} }}` (39 clips; no `id`, no `rig` inside a clip; root arrays in leg lengths, 1.0 = 10 voxels = 1 u; `meta` carries `durationFrames, src, hitFrame, peakSpeedFrame, recoverFrame, peakSpeed, speedRef, strideVox, groundShiftVox, floorRaiseMaxVox` where applicable). **`anim/ual.js convertUAL(id, c, {id?, loop?}) -> Clip`** converts one entry (`root[]` becomes `root.y`, `rootX/rootZ/rootPitch/rootRoll/rootYaw` become `root.x/z/pitch/roll/yaw`, `meta.source = 'ual'`). **`anim/boot.js registerAllClips(ClipLib, {humanoid, alternates?, onReport?}) -> {authored, retargeted}`** is the registration entry (owner ANIM): it bakes every authored clip (`dsl.bakeAll`), registers them, then registers each UAL clip whose id has no authored hum1 clip (**authored wins**; `alternates:true` also registers the replaced UAL version as `ual_<id>` for review tools). `app/main.js` passes `window.__VW_UAL_CLIPS__` (the build inlines the JSON); Node tests read the file from disk.
### 7.3 Animator
`Animator.pose(model, state, extra, out) -> root` writes **9 floats per part** (`tx,ty,tz,rx,ry,rz,sx,sy,sz`, `POSE_STRIDE = 9`) into `out: Float32Array` in model part order, and writes the instance root track into `extra.root` (returned as well; a shared scratch object when `extra.root` is absent). Zero allocation per call after the first pose of a model (caches live on the ModelDef as `model.__anim` and on the state object; they invalidate when `ClipLib.version` changes).
- `state = u.anim = {clip, t, rate, flinch, dir, prev, blend}`. **The sim chooses ONE clip id, its time and rate; the animator only samples.** `t` seconds into `clip` (the sim advances `t += dt*rate`), `blend` 0..1 crossfade from `prev` (the sim advances `dt/0.14`; `BLEND_S = 0.14`), `flinch` 0..1 additive hit reaction toward `dir` (world angle of the hit direction). Animator-private fields: `_pc, _lt, _pt` (and an optional sim-provided `pt`, the previous clip's time at the switch). **`u.anim.mount` and `u.anim.rider` are REMOVED from the sim contract** (D4); the Animator still honours `state.mount|rider|crew` overrides for tools and tests (Codex clip picker), the sim never sets them.
- **`AnimExtra`** (the `extra` argument; one scratch object owned by `BattleView`, reused for every unit, no allocation):
| field | type | set by | meaning |
|---|---|---|---|
| `root` | `{y,x,z,pitch,roll,yaw}` | BattleView allocates and zeroes; **Animator writes** | OUT-param: model-space offsets x/y/z (u, already pivot-compensated so pitch/roll/yaw rotate about the hip pivot) and pitch/roll/yaw (rad). BattleView applies it with `Animator.applyRoot(root, x, y, z, heading, scale, out4)` (rotates x/z by the heading, scales by the instance scale; `out4[3] = heading + root.yaw`) and passes `root.pitch/roll` on to `VoxSkin.add` |
| `speed` | u/s | BattleView (`u.speedNow`) | current ground speed (locomotion band and cadence, cape/crest lean) |
| `gait` | u | BattleView (`u.gait`, the sim's distance accumulator `+= speedNow*dt`) | distance walked; the Animator converts it to cycles by the rig's stride (D5) |
| `heading` | rad | BattleView (interpolated unit heading) | needed for the hit-direction flinch and the fall direction |
| `phase` | 0..1 | BattleView (`Animator.idlePhase(u.id)`) | per-unit offset that de-synchronises looping clips |
| `lod` | 0..2 | BattleView (`Animator.lodTier(d²)`; tier 3 = skip, the caller keeps the last pose) | 0 full, 1 no secondary/overlays, 2 pose only |
| `dead, t, id, hp, state, team` | bool, s, int, 0..1, ST code, 0/1 | BattleView | corpse flag, BattleView clock, unit id, hp fraction, sim state, team (used by the stand-in `TempAnimator` today; the real Animator may read them) |
- What it does: crossfade with shortest-angle blending, looped/one-shot sampling (linear between the 30 fps frames), root tracks, additive hit flinch, weapon aim and shield facing for hum1 groups (`AIM` tables by weapon style `slash|thrust|pike|overhead|bash|shoot|throw|cast` and clip class; a clip's own `aim` track wins), idle sway, cape/crest follow-through, wheel roll for bespoke rigs (`meta.wheelSpeed`, angle = distance / wheel radius), composed models (every sub-rig group gets its own clip), and graceful fallbacks (a missing clip or part is reported once through `Animator.warn`, which tests set and production leaves null; `Animator.warnings` is the set of distinct messages). Helpers: `Animator.applyRoot`, `idlePhase(id)`, `lodTier(d2, near2 = 38²)`, `rest(model, out)`, `styleOf(model)`, `groupsOf(model)`, `subClips(model, stateClip)` (the clip each sub-rig will play), `clipDur(id, rig)`, `classOf(id)`, `info(model)`, `invalidate(model)`.
- **Clip resolution per sub-rig group** (`clipRig` = the group's rig, `hum_lite` -> `hum1`): `model.meta.clipMap[simId]` -> `<species>_<id>` -> `ClipLib.getQualified(id, clipRig)` -> the `FALLBACK` chain (e.g. `run -> walk`, `death_front -> death_back`, `ride_idle -> idle`) -> `idle`. There is no hum1 fallback for a non-hum rig: a horse never plays a human clip. The same plain clip id (`walk`, `death_back`, `strike_*`) is therefore valid for every rig.
- **Derived sub-rig clips (D4)**: for a composed model (`meta.subrigs`) the Animator derives each group's clip from `u.anim.clip` (tables in `animator.js`): **mount** (quad1 base group of a mounted model): `walk walk`, `run/rout/gallop gallop`, `trot trot`, `rear rear`, `death_* death_*`, `stagger stagger`, every attack/cast/throw/shoot/idle-class clip `idle` (the mount stands under its rider); **rider** (`r_`, a hum1 on a quad1): idle/idle_combat/block_hold/sit/walk `ride_idle`, run/rout/gallop `ride_gallop`, trot `ride_trot`, every melee strike/kick `ride_strike`, shoot_bow/throw/cast/launch `ride_shoot`, death_* `ride_death`, stagger/stun/dizzy/cower/cheer/taunt `ride_idle`; **crew** (`d_`, `a_`, `c1_..`, `a1_..`, hum1 or hum_lite on a chariot, siege engine or howdah): `crew_idle` by default, walk/run `crew_push`, launch `crew_react`, reload `crew_crank`, shoot_bow/throw `crew_shoot` (the chariot driver stays `crew_idle`), death_* `crew_idle`. A model's `clipMap` re-targets sim ids to rig clip ids first (`strike_thrust -> strike_ram` for a trojan horse, `strike_thrust -> strike_bite` for a hound, `throw -> launch` for a catapult).
- **Locomotion and timing (D5)**: the sim publishes **one** locomotion clip id (`walk`) plus `speed` (and `gait`); **the Animator owns cadence and band**. Cadence is driven by distance travelled: `extra.gait` is converted to cycles with the rig's stride (`speed * dt / stride(rig)`), so feet never slide. The band is chosen from `speed / speedRef(rig, walk)`: **< 0.8** slow walk, **0.8..1.6** walk, **1.6..2.6** jog (the walk clip at 1.7x with bounce, or the authored `jog` clip), **> 2.6** run. `speedRef` is per rig and per clip: hum1 as registered today is walk 2.4, jog 3.8, run 5.6, rout 5.0 u/s (the authored clips shadow the retargeted ones of the same id, whose speedRefs were walk 1.1, run 6.31, sprint 5.73). A4 (steps/s within 1.5-3.5 and foot slide <= 15% for every infantry def at its walk and run speed) is the arbiter of the band edges.
- **Death (D5)**: the death clip plays at rate 1.0 and the corpse stays in `world.dying` for **`deathLinger = max(1.6, deathClipDuration(rig) + 0.2)` seconds, per unit** (the sim reads `ClipLib.dur(clip, defRig(def))` when the unit dies; the real hum1 `death_back` is 2.43 s, so its corpse lingers 2.63 s). The sim publishes `deathCause, deadT, deathKind, kx, kz, ky, deathLinger` (§8).
- **Corpse root motion has ONE owner: render (Animator + BattleView)** (D5). The sim keeps only the ballistic xz/y motion of flung corpses (`deathKind 2`, from `kx, kz, ky`) and **no longer writes `pitch`/`roll`** (nor a fake y arc) on corpses. A kicked unit tumbles once: the Animator's death clip supplies the root pitch/roll and `BattleView` the cause/size variants of §9.
- **State -> clip mapping (owned by the sim, `sim/ai.js` + `combat.js`; ONE id per unit)**: idle, idle_combat, walk (the Animator derives jog/run/trot/gallop, see Locomotion above), strike_<style> (`strike_slash_1|2`, `strike_thrust`, `strike_overhead`, `strike_bash`, and per-beast `strike_bite|gore|stomp|ram|headbutt|peck`), shoot_bow, throw, cast, launch, kick, block_hit, hit_front|hit_back (by attacker side), stagger, stun, dizzy, cower (sleep), death_back|death_front|death_spin (by hit direction/knockback), getup, cheer, taunt, rout, sit, rear, trumpet, reveal, tantrum, reload, flap, sleep, flail, tumble. Clips the sim never asks for but the Animator plays for sub-rigs: `ride_idle, ride_strike, ride_shoot, ride_gallop, ride_trot, ride_death, crew_idle, crew_push, crew_crank, crew_react, crew_shoot`, and the locomotion variants `jog, trot, gallop`.
- **Clip sources (honest coverage)** — real CC0 mocap from Quaternius UAL 1/2 retargeted by direction-based retargeting (`tools/anim/`, 39 clips in `humanoid_clips.json`), registered only where no authored clip has the same id (28 of the 39 today): sprint, walk_formal, throw (OverhandThrow), cast and cast_idle (Spell_Simple), block_enter, shield_dash, shield_break, hit_front/hit_head/knockdown, death_back (Death01), getup, roll, sit_enter, crouch, zombie_*, strike_combo/strike_punch_*, and dance/talk/point_order/smug/shake_no for the throne and humor. **Hand-authored with the clip DSL (`anim/dsl.js`, `anim/clips/*.js`, procedural gaits in `anim/gait.js`)**: hum1 idle, idle_combat, walk, jog, run, rout, block_hold, sit, strike_slash_1/2, strike_thrust, strike_overhead, strike_bash, kick (baked at boot, they shadow the UAL ids), then shoot_bow, hit_back, block_hit, stagger, stun, dizzy, cower, taunt, cheer, death_front, death_spin, ride_*, crew_* and ALL beast/siege/mount clips (quad1 gait + attacks, elephant, chariot, catapult/ballista, chicken, trojan). Death variety also comes from root pitch/roll tumbles and time-warped variants. Credits and the final message state this split.
- Clips target hit moments: the sim lands damage at `hit / rate` into the clip (`hitAt`); the clip's `hitFrame` must coincide with the baked tip-speed peak (`meta.peakSpeedFrame` for retargeted clips, measured from the weapon-tip attach point with `anim/analysis.js` for authored ones; A5); `strike_*` natural durations in `DEFAULT_META` are design targets and `ClipLib.register` replaces them.

## 8. Sim contracts (src/sim/) — pure, deterministic
```js
const world = new World({ arena, seed, rules, defs, props })   // CLONES the arena (arena.clone()); render/editor use world.arena for the live (mutating) terrain; `rules` merge over the Rules table below
world.addUnit(defId, team, x, z, {heading, squad, name, custom, vip, general, def}) -> Unit      // ids are monotonic per World and NEVER reused
world.addSquad(defId, team, n, cx, cz, {formation, heading, order, spacing, offsets, names, def}) -> Squad
world.addPlacements(team, placements, {defs}) -> Squad[]   // placements {defId|customId, x, z, heading, squadId?, order?, formation?, name?, custom?}
world.removeUnit(u)  world.clearUnits(team?)               // placement phase only
world.start(countdownSeconds?)   world.tick()   world.step(n)   world.stateHash()
world.input(tick, cmd)           // tick-stamped input queue (throws without a tick): {type:'cast', power, x, z, team} | {type:'command', squad, order:'advance|hold|retreat|focus|move', target?, x?, z?} | {type:'possess', unit, move?:{x,z}, attack?:bool, ability?:n, release?:bool}
world.units (live, dense array, indices change; use unit.id)   world.dying (corpses: dead units still animating a death clip for their own `deathLinger`, same Unit objects)   world.props   world.hazards   world.proj (ProjectileSystem)
world.events (EventBus)   world.stats[team]   world.state: 'placing'|'countdown'|'running'|'ended'   world.winner: 0|1|-1(draw)   world.endReason   world.time   world.tickN
```
`world.stats[team] = {alive, dead, kills, damageDealt, damageTaken, startCount, startCost, aliveCost, deadCost}` (index 2 is a legacy slot; there is no third team).
**Unit fields read by render**: `id, def, team, x,y,z, px,py,pz (previous tick), heading, pheading, hp, hpMax, alive, state (ST code), speedNow, gait, anim, flash 0..1, se[] (status timers), stone 0..1, glow, scale, radius, height, squad, kills, name, custom, controlled`, and for corpses (**D5**) **`deadT, deathCause, deathKind (0 normal, 2 flung), kx, kz, ky (launch velocity at death), deathLinger`**. `pitch`/`roll` remain on `Unit` as legacy tilt (0 unless a sim effect sets it on a living unit; BattleView adds it to the animator root; **the sim never writes them on corpses**). Everything else is sim-private.
- **Arena markers** (data on the arena, used by objectives): `arena.markers = [{id, type:'hill|exit|vip_start|general_spawn|waypoint', x, z, r}]` (<= 8); `arena.env = {time, weather, fog, theme, wind, mood}`. `Arena.fromJSON` enforces the editor limits of §2.
- **Weather** is read from `rules.weather ?? arena.env.weather`; the sim reads it only through `weatherMods` (`rain|storm`: burn x0.5, fire x0.5; `snow`: speed x0.9; `sandstorm`: spread x1.5; `fog`: spread x1.2).
- **Power rating** (`sim/power.js`): `power(unit) = sqrt(hpEff * dps)` with `hpEff = hp*(1+armor*1.4)*(1+shield.block*0.35)`, `dps = melee.dmg/melee.cd (or ranged)*(1+0.25*sizeFactor)`; team power = sum over alive units; `big_swing` fires when `|ln(ratio) - ln(lastRatio)| > 0.35` and carries `{team, ratio, flank:'left|right|center', cluster:{x,z}}`; Cassandra's lines use these.

### 8.1 Core rules (formulas; each has a unit test and visible feedback)
- **Damage**: `raw = dmg * rand(0.9,1.1) * crit * charge * backstab * aura/status mults`; crit 6% x2; backstab (melee, attacker outside the target's 120° front arc) x1.35; `eff = clamp((armor + mArmor)*(1-ap), 0, 0.9)`; `final = max(1, raw*(1-eff))`. Types: slash ap 0, pierce 0.3, blunt 0.2 (+stagger), fire/magic ap 1 (fire adds burn 4 dps x3 s; `fire_weak` x1.8, undead x2).
- **Shield block**: attacker inside `shield.arc` (front) and `rand < block` (melee) or `< proj` (projectile) => negated, `unit_block` event (`unit_hit` is NOT emitted); bash styles stagger the attacker 0.25 s. Stance abilities add to block/proj while stationary with >= 3 same-team allies within 2 u.
- **Charge**: `chargeMul = clamp((speed/walk-1)/(runMul-1),0,1)` for `cavalry|large|beast`; melee dmg x(1+chargeMul), knockback x(1+1.5*chargeMul). **Brace**: a `spear|pike` target facing within 50° of a `cavalry` attacker and moving < 50% walk deals the charger 1.6x dmg and cancels its momentum (`unit_brace`).
- **Knockback**: see §6 (KB_SCALE, ranges). Units never leave the nav grid through knockback (movement is validated per step); falling/knockdown over cliffs is not simulated; lava/water are only entered by geysers/launch effects explicitly (they apply fall/lava damage, S9 excludes airborne units).
- **Trample** (`mass >= 8` moving > 1.5 u/s): units with mass < 3 take 18 dps and are shoved; `trample` event rate-limited 4/s. A fire-panicked elephant (`fire_panic`, SE.SCARE) also tramples its allies.
- **Friendly fire**: AoE hurts all; arrows/javelins hurt allies only if `rules.friendlyFire`; `friendly:true` on `unit_kill`.
- **Morale** 0..100: -2 per ally dying within 6 u (x1.5 officer/hero), -6 flanked, -0.9/s below 30% hp, +1.2/s within 10 u of an officer; <= 15 => **rout** until > 40 for 3 s; `fearless` ignores; army collapse (< 20% alive, >= 6 starting) => -10/s.
- **Engagement slots**: a target accepts `2 + floor(radius*4)` melee attackers (large: 8); extra attackers path to free ring slots; spears (range >= 2) attack over a friendly front rank; idle-in-contact fraction < 3%.
- **Stalemate watchdog**: no damage 12 s => `stalemate_warning`; 18 s => advance everyone; 30 s => Zeus lightning on the densest cluster + 1 goat for the weaker side (`intervention` events); 44 s => Zeus ragequit: draw (`winner = -1`, reason `intervention`). Max battle = `rules.timeLimit` (default 360 s = 6 min; 0 = none) => decided by remaining cost (reason `time`). Pacing governor: at 90 s with a > 4:1 ratio morale collapse accelerates; at 45 s with ratio within 10% and no engagement, advance.
- **AI layers**: (1) squad strategic (anchor + formation slots, orders, lag-throttled march, flow field), (2) tactical (target scoring with persistence/hysteresis, role rules, slots), (3) movement (flow field + steering + PBD collision, kiting). Difficulty by behaviour only: `easy` reaction 0.8 s, no flank, no ability use for non-heroes; `normal` 0.4 s; `hard` 0.2 s + focus fire + kiting + counter-pick composition.

### 8.2 Event catalog (the sim<->audio<->humor<->UI contract). Payloads reused; consumers must not retain.
**One table, one owner.** `src/core/events.js` exports `EVENTS = {name: [fields]}`; `World` derives its pre-allocated payload table `P` (`world.P.<event>`) from it, this section mirrors it, and **`tests/events.test.mjs` fails if any `w.P.x` use in `src/sim` is not in the table or a table field is never set** (today `world.js EVENT_NAMES` is a hand-kept name list; it is replaced by `EVENTS`). The table below is the union of the code's emit sites (`world.js, combat.js, projectiles.js`) and the contract for emitters SIM still has to write. **No emit site exists yet (SIM writes them; payloads are frozen here) for**: `unit_revive, ability_cast, ability_channel_start, ability_channel_end, telegraph, lightning_arc, god_power, hazard_trigger, big_swing, objective_update, wave_spawn, chicken_tantrum, philosopher_monologue, trojan_reveal, stone_gaze, throne_sit, cyclops_misaim, catapult_misfire, bark, crowd_roar, possess`; every other event is emitted by the code today.
```js
EVENTS = {
  // lifecycle
  battle_countdown: ['n'],  battle_start: ['teams'],            // teams: [{team, count, cost}]
  battle_end: ['winner','reason','t','stats','perDef'],           // winner -1 draw; reason 'elimination|time|objective|rout|forfeit|intervention'; perDef: [ {defId:alive} per team ]
  // units
  unit_spawn: ['id','team','def','x','z'],
  unit_hit: ['src','dst','srcDef','dstDef','dmg','type','crit','backstab','charge','proj','aoe','x','y','z'],   // blocked hits emit unit_block only
  unit_block: ['src','dst','x','y','z','kind'],                   // kind 'melee|proj'
  unit_kill: ['src','dst','srcDef','dstDef','srcTeam','dstTeam','friendly','byPlayer','revived','cause','x','y','z'],   // cause: melee|ranged|aoe|fire|fall|trample|magic|stone|kick|gore|drown|lava|spikes|geyser|poison|lightning|execute|misfire|bribe
  unit_heal: ['id','amount'], unit_stagger: ['id'], unit_rout: ['id','team'], unit_rally: ['id'], unit_revive: ['id'], unit_convert: ['id','team'],
  unit_corpse_done: ['id','def','team','x','y','z'],               // fires when deadT > deathLinger; the corpse leaves world.dying
  // abilities, statuses, powers (abilities/god powers: planned)
  ability_cast: ['id','ability','x','z','team'],  ability_channel_start: ['id','ability','duration'],  ability_channel_end: ['id','ability','duration'],
  telegraph: ['kind','x','z','r','t'],  status_apply: ['id','status'],  god_power: ['kind','x','z','team'],
  // projectiles and world effects
  projectile_launch: ['kind','team','x','y','z','tx','tz','id'],  projectile_hit: ['kind','x','y','z','onUnit','blocked'],
  explosion: ['kind','x','y','z','r'],                             // kind 'lightning|boulder|fire|magic|crew'
  lightning_arc: ['x0','y0','z0','x1','y1','z1'],  crater: ['x','z','r','x0','z0','x1','z1'],  fire_started: ['x','z','r'],
  prop_damaged: ['id','type','hpFrac','x','y','z'],  prop_destroyed: ['id','type','x','y','z','s'],  prop_spawned: ['id','type','x','z'],
  hazard_trigger: ['kind','x','z','r'],                            // planned (SIM hazards.js); kind = arena.hazards[].t
  // match narrative (humor/audio hooks)
  first_blood: ['src','dst','srcDef','dstDef'],  kill_streak: ['id','count','def'],  hero_down: ['id','def','team'],  army_low: ['team','frac'],
  lead_change: ['team','ratio'],  big_swing: ['team','ratio','flank','cluster'],   // big_swing: planned (sim/power.js)
  stalemate_warning: ['t'],  intervention: ['kind'],               // kind 'zeus|goat|ragequit'
  objective_update: ['id','state','progress'],  wave_spawn: ['n','count'],          // planned (objectives.js, waves.js)
  // systemic gags
  chicken_tantrum: ['id'], philosopher_monologue: ['id'], trojan_reveal: ['id'], stone_gaze: ['src','count'], throne_sit: ['id'],   // planned (abilities)
  friendly_fire: ['src','dst','dmg'], trample: ['id','count'], charge_hit: ['id','dst','mul'], unit_brace: ['id','dst'], cyclops_misaim: ['id'], catapult_misfire: ['id'],
  bark: ['id','text'],  crowd_roar: ['strength','x','z'],  possess: ['id','on'],    // crowd_roar, possess: planned (crowd reactions read strength/x/z; possess on = taking command, off = release)
}
```
Notes: `ability_channel_*` are the telegraph of channelled casts; `crowd_roar` and the colosseum crowd (render code) also react to clusters of `unit_kill`. Lifetime stats are accumulated by `src/save/stats.js` from this stream (single mapping table) plus UI-side events (`arena_saved`, `soldier_saved`, `arena_played`). The `Game` bus events (`placement`, `state`, `countdown`, `toast`, ...) are a different bus, see `app_contract.md`.

### 8.3 Time model
`app/loop.js` (COORD) is the rAF loop: dt clamped to 0.1 s, FPS meter, hidden-tab pause, perf auto-scaler with hysteresis; it calls `Game.frame(dt)`. `Game.frame` accumulates `min(dt, 0.1) * speed`, runs up to **5 ticks per frame** (an accumulator beyond 5 ticks is dropped) at `speed` ∈ {0.25,0.5,1,2,4}, and passes `alpha = acc / DT` for interpolation; global slow-mo = speed ramp. Hit-stop and screen shake are **render-side**: freeze the animation clock of the struck/striking pair (70-120 ms) and hold the camera, driven by `unit_hit` significance. A single injectable `Clock` (`window.__vw.clock`). Inputs are applied by tick via `world.input` (`Game` stamps them `world.tickN + 1`).

### 8.4 Rules (the only rules schema, D7)
`Setup.rules` (app_contract), the `rules` passed to `new World`, the Setup tablet in `spec/world.md §8`, mutators (§14), share codes and missions all use THIS table; a key not in it is rejected by `validate.js`. Defaults are the code's (`world.js DEFAULT_RULES`, `Game.newSetup`).
| key | type / values | default | read by |
|---|---|---|---|
| `friendlyFire` | bool | false | sim (projectiles, AoE) |
| `morale` | bool | true | sim |
| `speed` | 0.25..4 | 1 | app (initial playback speed; the sim ignores it) |
| `timeLimit` | seconds; **0 = none** | 360 | sim (`reason 'time'`). Today `Game.begin` maps a falsy value to 360 and `World._checkEnd` would end a battle at once for 0: COORD + SIM fix both |
| `difficulty` | `easy`, `normal`, `hard`, or `{A,B}` per team | normal | sim (`setDifficulty`) |
| `objective` | null or an objective spec `{type, ...}` (§14, `spec/world.md`) | null | sim (`createObjective`) |
| `godPowers` | bool | true | sim (false disables `GodPowers`) |
| `deathCorpses` | bool; equals `corpses !== 'none'` | true | render (legacy boolean of the same switch as `corpses`) |
| `corpses` | `stay`, `fade`, `none` | settings value (`stay`) | render (BattleView corpse ring, N = 60) |
| `gore` | `red`, `wine`, `confetti`, `off` | settings value (`red`) | render |
| `weather` | null (arena's) or `clear`, `rain`, `snow`, `sandstorm`, `fog`, `storm` | null | sim (`weatherMods`), render |
| `time` | null (arena's) or hour 0..24 | null | render (`arena.env.time`) |
| `startFormation` | `block`, `phalanx`, `line`, `column`, `wedge`, `skirmish`, `circle`, `hollow` (`formations.js`) | block | app (default brush formation, auto-fill) |
| `mutators` | string[] (ids of `sim/mutators.js`, §14) | [] | sim (`mutatorMods`) |
| `budget` | drachmae per team (presets §2) | 8,000 | app (placement budget, auto-fill) |
| `cap` | units per team, <= the tier cap | tier cap | app |
| `freePlacement` | bool (ignore deployment zones) | false | app |
| `mirror` | bool (mirror placement) | false | app |
| `mood` | `auto` or a music mood | auto | app (audio mood override) |
| `noKite` | bool (test harness only; never in share codes) | false | sim (ai.js) |

## 9. Render contracts (src/render/)
- `Engine`, `Post` (one HDR render-target path at **every** tier: tone mapping/sRGB in the composite; tiers only change bloom/FXAA/resolution, never recompile materials), `TerrainRenderer` (32-cell chunks (16 u): 36/64 chunks on medium/large; LOD by distance), `PropRenderer` (instanced per (id,stage), merged batches), `CubeFX` (exists), `Cameras`, `preview.js` (offscreen thumbnails/turntables for Codex, Workshop, painter, arena cards: render-to-texture on the single GL context).
- `VoxSkin` (implemented, `render/voxskin.js`): `new VoxSkin(host{scene}, model, {capacity = 32, shadow = true})` (throws above `MAX_PARTS = 48`), `skin.begin()`, **`skin.add(x, y, z, heading, sx, sy, sz, pose, teamRGB[3 linear], flash = 0, stone = 0, glow = 0, pitch = 0, roll = 0) -> instance index`**, `skin.end()`, `skin.attachWorld(i, partIndex, lx, ly, lz, out)`. Per-instance attributes: `instanceColor` = team RGB (multiplies voxels flagged `F_TEAM`, `aFlag == 1`); `aFx = (flash, stone, glow, reserved)`: **`aFx.w` is reserved and always written 0, there is no `tint` argument** (status tints `burn|wine|poison|sleep|selected-rim` are not delivered through `add()`: burning/wine/poison are CubeFX particles, stone/flash/glow are the three channels above, the selection rim is the BattleView ring mesh); glow voxels (`F_GLOW`, `aFlag == 2`) are emissive. Explicit `customProgramCacheKey`; matching `customDepthMaterial` for shadows. `pitch`/`roll` tilt the instance about the unit's root (flung corpses).
- **BattleView** (`new BattleView({engine, fx, animator, modelFor, palette, gore, corpses})`, `update(alpha, dt, camera)`): one VoxSkin per model key (def id, or `'c:'+customId`), per unit it fills `AnimExtra` (§7.3), calls `animator.pose(model, u.anim, extra, pose)`, applies the returned root with `Animator.applyRoot(root, x, y, z, heading, scale, out4)` and `skin.add(...)` with `pitch = (u.pitch||0) + root.pitch`, `roll = (u.roll||0) + root.roll`; draws `world.units`, `world.dying` and the static corpse ring (`maxCorpses = 60`, oldest recycled); instanced projectiles, health bars and selection rings; event-driven FX.
- Death matrix (8+ behaviours, **render-owned, chosen by `deathCause` x `deathKind` x size x launch velocity (`kx,kz,ky`)**): `crumple_back`, `crumple_front`, `flung_tumble` (kb > 6: root pitch/roll + arc), `spin_out`, `burning_run` (3 s then collapse), `stone_shatter`, `lava_sink`, `comic_puff` (chickens/goats: smoke puff + feather confetti), `monster_collapse` (slow fall + dust), `drowned`; each ends in a debris burst sampled from the model palette (18-58 cubes by size: `18 + min(40, hp/4)`) and a `unit_corpse_done` event; corpses persist per the `corpses` rule (stay N=60 oldest recycled | fade 8 s | none).
- FX inventory (all CubeFX unless noted): swing smear arcs (instanced ribbon quads), per-material impact sparks (flesh/bronze/wood/stone/shield), dust on charge/foot-fall, footstep dust by material, banner cloth wave (vertex shader), projectile trails, scorch decals (terrain vertex colour, capped), blood/wine/confetti, fire, smoke, lightning arcs, telegraph rings, heal sparkles, stone sparkle, damage numbers, bubbles.
- `style.js` freezes light rig, AO curve, `TEAM_COLORS`, tone mapping, fog; **frozen only after `post.js` exists** (look-dev gate comes after post).

## 10. Audio contract (src/audio/) — see spec/audio.md
`ctx.audio` (created by `audio/index.js createAudio({settings, getListener, quality})`; `app/nullaudio.js` mirrors every name as a no-op) is exactly:
- `play(cue, {x,y,z,vol,pitch,priority,delay})` -> voice|null; `ui(name, opts?)` (UI cue helper: `audio.ui('click')`, `audio.ui('error')`, `audio.ui('place', {mass})`);
- `setListener(x, y, z, yaw)` (called every frame by `Game.frame` from the camera rig; spatial pan/attenuation read it);
- `music.setMood(mood, {theme})` (`menu|editor|battle|victory|defeat|comedy`; `theme` = the arena theme), `music.setIntensity(v)` (0..1), also `music.getIntensity()`, `music.intensityFromWorld(world)`, `music.stop(fade)`, `music.state()`;
- `duck(bus, db = -6, ms = 400)` (bus `music|sfx|ui|announcer`; **amount is in dB, duration in milliseconds**), `setVolume(bus, v)`, `getVolume(bus)`, `setMuted(b)`, `isMuted()`;
- `unlock()` (called synchronously inside the first user gesture; the built-in gesture gate also does it), `attach(bus|null, {arena, world, defs, getListener}?)` (subscribes to `world.events`; `attach(null)` detaches) and `detach()`;
- `state()` -> `'unavailable|locked|running|suspended|muted|closed'`, `diagnostics()` -> object (Diagnostics screen, beacon), `installTestHook(vw)` fills `window.__vw.audio`. `audio.speech.*` is the optional TTS announcer.
`UnitDef.sfx` overrides cue defaults from `cues.js`. Core pack: **SFX only are embedded (<= 450 KB raw)** plus a short menu stinger; music is fetched; AU4 therefore requires hits/UI/horns/deaths offline and synthesized ambient music as the offline fallback (flagged).

## 11. Save and share (src/save/)
`store` (`save/store.js`, a browser adapter, §0.1) wraps localStorage (try/catch, memory fallback, per-key byte accounting, `status()` ok|memory|full). Keys (all stored as versioned `{v,data}` under the prefix `vw.`): `vw.settings, vw.progress, vw.arenas, vw.soldiers, vw.armies, vw.stats, vw.seen, vw.survival, vw.daily, vw.draft.*` (`vw.stats` = `{v:1, ...lifetimeKeys}` accumulated by `save/stats.js`, shape in `docs/lifetime_stats.md`; editor autosave every 20 s, one key per editor draft); `vw.arenas`, `vw.soldiers`, `vw.armies` are `Collection`s (`list/get/put/remove`, caps 48/24/24). `vw.safe` is a raw non-versioned flag (`'1'`) written by the fatal panel's Safe mode. **Decision: saves are device-local by design**; Settings > Data offers Export all / Import all (files via `downloads` + file input; text fallback) and shows a "Not saving" indicator when storage is blocked.
**Sharing** has three channels and one parser: (1) text code `VW1.<type>.<base64url(payload)>.<crc32>` (payload = JSON -> deflate-raw (CompressionStream, else the pure-JS fallback in `core/deflate.js`) with palette-indexed varint layers for heightmaps/paint), size classes S/M/L (<= 1.8k / 8k / 38k chars; **38,000 characters is the limit everywhere**), displayed; (2) `.vwarena` / `.vwsoldier` / `.vwarmy` files via `downloads.save` and file-input/drag-drop; (3) PNG cards (photo mode / results). `validate.js`: strict schema, clamps/rejects with plain-English messages, `Object.create(null)`, no `__proto__`, unknown ids -> clear error, NaN/Infinity rejected, strings length-limited, `textContent` only.

## 12. App state machine, screens, input (src/app, src/ui) — see spec/ui.md
`boot -> splash(press any key) -> title -> {quick | campaign | survival | daily | arena-builder | workshop | codex | achievements | settings | credits | diagnostics}`; `quick -> setup -> placement -> countdown -> battle -> results -> {rematch | tweak | replay-killcam | menu}`. **Platform contract table** (assumption -> source -> fallback -> test):
| assumption | source | fallback | test |
|---|---|---|---|
| relative `fetch()` of published files works | artifact tool text | synth audio + embedded core | B-run with fetch blocked |
| scripts only from cdnjs/jsDelivr/unpkg | CSP contract | loader fallback chain, fatal panel | B5 |
| sound only after interaction | contract | splash gate, stubbed suspended context test | AU2 |
| localStorage may throw | contract | memory fallback + indicator | P1 |
| clipboard may reject | contract | select-text box | UI14 |
| `<a download>` inert | contract | `downloads.save` or text export | E8 |
| pointer lock/fullscreen click-only, may reject | contract | drag-look, no fullscreen reliance | UI9 |
| no `alert/confirm/prompt` | contract | in-page modals | B9 |
| query string never reaches page | contract | share via paste/file only | lint (`location.search` banned) |
| shader compile blocks main thread (no parallel compile in r128) | measured | compile per material with yields, CSS loader | PF3 (compile tasks excluded) |
| skeleton wraps the page, 14 px default font/off-white ground | contract | explicit tokens + `body` background | UI2 |

## 13. Test and gate contracts (tools/)
- `npm run gate` (`tools/gate.mjs`) = `tools/lint.mjs` (§0) + `node --check` on every `src` file + unit tests (`tests/**/*.test.mjs`) + contract validators (UnitDef/Blueprint/Clip/Arena/Mission schema, every unit compiles to <= 48 parts, every cue resolves) + `build` + `smoke`; each step prints PASS/FAIL and the run ends with `GATE PASSED` or `GATE FAILED (n)`. `node tools/gate.mjs --fast` is the agents' finish line: the same steps without the files named `slow|fuzz|balance` and without `smoke` (Chromium); COORD runs the full gate before every commit. Today `gate.mjs` runs lint, syntax, tests and build; the contract validators and `smoke` are COORD's to wire (Q1 fails until they are). **The gate is the finish line**: an agent hands back only with `--fast` green, or names the red step and the file that is not theirs.
- `tools/smoke.mjs` (Playwright, explicit `executablePath=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, **a local server that sends the artifact CSP header** built from the contract text, fails on any console error/warn, `securitypolicyviolation`, 4xx/5xx, unhandled rejection; drives splash -> title -> quick fight -> countdown -> battle at 4x -> results through `window.__vw`). `tests/sim.smoke.mjs` is a manual probe (name is not `*.test.mjs`, no assertions); the gated sim smoke is a `*.test.mjs` that asserts a decided winner, `reason != 'time'` and a stable `stateHash`.
- Audio tests stub `AudioContext` to start `suspended` and resume only after a synthetic gesture, with a negative control (remove the gate => test must fail).
- Balance harness runtime budget (4 cores): 20v20 for pair matrices (~0.5 s each), 150v150 only for perf and fairness. **Fairness (S22)** uses n >= 400 battles per arena with side swap; **the exemption list lives here and only here**: the 8 asymmetric arenas `troy, thermopylae, nile, carthage, styx, alpine, giza, teutoburg` are exempt from the 45-55% band but must stay within 35-65%; every other preset (`marathon, colosseum, persepolis, oasis, olympus, cyclops, arenalab`) must be within 45-55%. `verification.md S22` and `spec/world.md §1` reference this list.
- Every N/B/M criterion that guards a high-risk behaviour has a **negative control** (listed in verification.md Q7); QA runs them at each gate and records pass-then-fail evidence.
- Hand-back from each agent includes: files changed, gate output, screenshots/filmstrips where visual.

## 14. Meta-features (decided; owners in plan.md)
**Lessons** (results screen: 3 generated lessons from the event log with Cassandra's voice, `sim/lessons.js`), **Scout report** (placement: composition weaknesses and counter chips from armygen tables), **Mutators** (>= 8 unlocked by campaign stars: Big Heads, Tiny Titans, Moon Gravity (knockback x3), Chicken Rain, Wine Rain Always, Friendly Fire Fiesta, Speedy Soldiers, Ragdoll Frenzy; data-only rule multipliers via `sim/mutators.js mutatorMods`), **Daily Skirmish** (seed from the local date, fixed budget/arena/enemy style, local history, copyable result string), **Puzzle Challenges** (6 data-only missions: goal, par, budget), **Kill-cam** (cinematic follow of the last 4 s of a hero/boss/streak kill using real-time slow-mo; full replay is on the cut ladder), battle **choreography** (pre-battle stand-off, finish, results camera orbit; reduce-motion variants), **teaching beats** in mission 1 (scripted hints with skip), optional owner-only **diagnostics beacon** via `db` (**T3**, opt-out setting `beacon`, one capped `diag/*` document per visit; verification B13). **Q9 at T0 does not need the beacon**: it is a manual read-back of the in-game Diagnostics screen from the hosted page by the owner (Copy button), recorded in `verification_report.md`.
