# spec.md — VOXELWARS contracts v1.1 (FROZEN before agents start; v1.1 = after review rounds 1 and 2)

Companion files: `spec/units.md` (roster design + abilities), `spec/world.md` (arenas, props, campaign, survival), `spec/ui.md` (art direction, tokens, screens, HUD, input), `spec/editors.md`, `spec/audio.md`, `spec/humor.md`. `verification.md` = numbered acceptance criteria. `plan.md` = tiers, ownership, cut ladder. **Numeric source of truth for unit stats is `src/content/era_ancient/stats.js` (COORD/SIM tune it); `spec/units.md` is the design intent.** If this file and a companion disagree, this file wins.

## 0. Hard rules (enforced by `tools/lint.mjs`, run in the gate)
1. `src/sim/**`, `src/content/**`, `src/voxel/**`, `src/anim/clips.js`, `src/anim/animator.js`, `src/core/**`, `src/world/**`, `src/save/**` are **pure**: no `window`, no `document`, no `THREE`, no `Math.random` in `sim/` and `content/`. They run in Node for tests and the balance harness.
2. Only `src/render/**`, `src/ui/**`, `src/editors/**`, `src/audio/**`, `src/app/**` may touch `window/document/THREE/AudioContext`.
3. `THREE` is `window.THREE` (CDN global r128). `import ... from 'three'` fails the build (esbuild alias to a stub that throws). Libraries: three (+ our own post), GSAP optional via `window.gsap` with a shim in `core/tween.js`.
4. No `alert/confirm/prompt`, no `innerHTML` with user-controlled strings (use `textContent`), no `eval`/`new Function`, no `fetch` to non-relative URLs.
5. Cosmetic randomness uses `fxRand`; UI uses `Math.random` only for non-persistent cosmetics.
6. No per-tick allocation in `sim/` hot paths (no object/array literals inside per-unit loops; pre-allocate scratch). Event payloads are reused objects (`world.P.<event>`), consumers must not retain them.
7. Never `Read`/`cat` `dist/*`, audio, or base64 blobs. Use `stat`, `wc -c`, `head -c 400`.
8. Ids (unit, prop, clip, cue, achievement, arena preset) are `lower_snake_case`, immutable once shipped; removal leaves a tombstone (`src/save/tombstones.js`). **Rig part ids are exempt and fixed by §3** (`armUL`, `legLL`, …).
9. Every user-visible string lives in content data (humor pass can edit it).
10. Content modules register through the generated registry (`tools/gen-registry.mjs` -> `src/_generated/registry.js`; globs `units/*.js`, `parts/*.js`, `beasts/*.js`, `props/*.js`, `humor/*.js`). Never hand-edit the registry or add manual barrels.
11. `window.__vw` (test hook: step, seed, metrics, goto, state, audio, clock, world, engine) is **always installed**; it exposes data and drives the loop only (no cheats). Debug overlays are the only thing stripped from dist.

## 1. Conventions
- **Axes**: right-handed, +Y up, a character faces **+Z**; its LEFT side is **+X**, its RIGHT side **-X**. Heading `h` rotates about +Y: forward = `(sin h, 0, cos h)`, left = `(cos h, 0, -sin h)`. Positive `rx` rotates +Y toward +Z (so a hanging arm (−Y) swings forward with **negative** rx, a leg swings forward with negative rx); positive `ry` turns +Z toward +X; euler order `Ry*Rx*Rz`.
- **World units**: 1 u. Terrain cell = 0.5 u cube; height quantum 0.5 u. **Humanoid voxel = 0.1 u; a hum1 soldier is 29 voxels = 2.9 u tall (3.3 u with crest), 1.6 u wide with arms; default collision radius 0.55 u.** All shipped ModelDefs use voxelSize 0.1 (giants use more voxels or instance scale).
- **Time**: seconds. Sim tick `DT = 1/30`; clip frame rate 30 fps; `ClipLib` APIs are in **seconds**.
- **Colours**: `0xRRGGBB` sRGB integers in data; the renderer converts to linear.
- **RNG streams**: `sim` (seeded), `fx` (cosmetic), `ui`. Never shared.
- **Determinism promise**: same build + same setup + same seed + same tick-stamped inputs => identical battle in the same browser. Share codes carry setup+seed+rules. Hit-stop is **render-only** (animation clock freeze + camera hold); the sim never pauses an entity.
- **Teams**: `0 = A (blue/cobalt)`, `1 = B (red/crimson)` only. There is no neutral team: the VIP goat, wild chickens and summoned units belong to a player team. Team colours come from `style.TEAM_COLORS[palette]` (Classic, Colour-blind safe, High-contrast).
- **Ground**: a unit's Y = `arena.cellHeight(x,z)` (top of the cube it stands on) approached upward at 12 u/s and falling freely downward (gravity); R6 measures against `cellHeight`. `heightAt` (bilinear) is for cameras/FX only.

## 2. Caps table (single source for numbers; everything else refers here)
| thing | value |
|---|---|
| shipped humanoid/mounts/bespoke units | 43 (`stats.js`) |
| arena presets | 14 + `arenalab` + `random` (16 recipes in `world/gen.js`); sizes 128/192/256 cells |
| god powers | 6 (zeus_lightning, meteor, earthquake, heal_wave, wine_rain, raise_chickens) |
| distinct unit types per battle | 16 |
| unit cap per team by tier | Potato 100 / Papyrus 200 / Marble 300 / Olympian 400 (total = 2x) |
| army budget presets (drachmae per team) | Skirmish 3,000 (~30 units) / Battle 8,000 (~80) / War 20,000 (~200) / Epic 40,000 (~400, capped by tier) / Custom |
| debris cubes (live) | Potato 1,200 / Papyrus 3,500 / Marble 8,000 / Olympian 16,000 |
| particle budget | same pool as debris (CubeFX cap) — values above include particles; Potato 1,800 total, Papyrus 5,000, Marble 11,000, Olympian 22,000 |
| projectiles live | 600 default pool, hard max 4,000 |
| speech bubbles | 12 pooled DOM elements |
| damage-number glyph quads | 400 |
| props per arena | 1,500; prop types 40; hazards 60; zones 2; markers 8 |
| arena name length | 32; description 200 |
| model parts | max **48** per ModelDef (part texture is `3*parts` texels wide) |
| share payload | text code <= 38,000 chars (chat-safe size classes: S <= 1.8k, M <= 8k, L <= 38k), larger via file |
| soldiers in roster | 24 |
| lifetime stat keys | `src/save/stats.js` list |

## 3. File layout and ownership (one owner per directory; nobody edits another's directory without asking the owner)
```
src/core/        COORD   util, rng, events, store, tween, ids, crc32, base64url, deflate fallback, undo.js (shared command/undo lib)
src/voxel/       COORD   grid mesher model compose lod text3d
src/world/       COORD   arena gen nav
src/sim/         SIM     world unit spatial ai combat projectiles consts defs formations (COORD wrote the core; SIM owns from T1) + abilities/*.js objectives.js godpowers.js hazards.js armygen.js waves.js power.js stats.js lessons.js mutators.js
src/anim/        ANIM    clips.js (exists) animator.js dsl.js rigs/*.js clips/*.js data/*.json
src/content/era_ancient/
   stats.js      SIM     numeric truth for all units
   units/*.js    UNITS   model assignment per faction: export MODELS = {id: ModelSpec}
   parts/*.js    UNITS   humanoid part library (one agent owns the library; faction-specific parts live in parts/<faction>_*.js)
   blueprints.js UNITS   compileSoldier(), validateBlueprint(), presets
   beasts/*.js   BEASTS  quad1 builder, elephant, chariot, catapult, ballista, chicken, trojan horse, hum_lite crews
   props/catalog.js SIM  (exists)      props/models/*.js PROPS  prop models + staged damage
   arenas.js     COORD   presets;  campaign.js CAMPAIGN (data + objectives wiring), campaign_text.js HUMOR
   humor/*.js    HUMOR   tips, achievements, announcer, quotes, names, units_text.js, mission text
src/render/      COORD   engine post voxskin terrain props fx cameras style preview battleview
src/audio/       AUDIO   engine sfx music speech cues synth
src/ui/          UI      kit.css screens.css hud.css kit.js screens/*.js hud/*.js ; editors.css owned by EDITORS
src/editors/     EDITORS-A (arena builder) / EDITORS-B (workshop + painter) ; shared core/undo.js
src/save/        COORD   store schema migrate share validate tombstones stats
src/app/         COORD   main boot loop input perf diagnostics
tools/           COORD   build gate lint gen-registry smoke balance(SIM) humor-sim(HUMOR) contact(UNITS) etc.   tests/ per owner   assets/ AUDIO-HUNTER (asset pipeline, ledger, credits)   docs/ COORD
```
Agents: **COORD**, **SIM**, **UNITS-LIB** then **UNITS-A / UNITS-B** (faction groups), **BEASTS**, **PROPS**, **ANIM**, **AUDIO**, **AUDIO-HUNTER** (done), **HUMOR**, **COMEDY-EDITOR** (independent), **CAMPAIGN**, **UI**, **EDITORS-A**, **EDITORS-B**, **QA** (read-only reviewer + persona playtests).

## 4. Voxel and model contracts (implemented in `src/voxel/`)
- `VoxelGrid(sx,sy,sz)` Uint32 voxels: `(flags<<24)|0xRRGGBB`; flags `F_SOLID=1,F_TEAM=2,F_GLOW=4`. Builders `V(rgb)`, `T(rgb)` (team-tinted: base colour multiplied by team colour — use light bases), `G(rgb)` emissive. DSL: `box, boxIfEmpty, carve, hollowBox, ellipsoid, sphere, cyl, line, cone, replace, mirrorX, stamp, rotY, bounds, toRLE/fromRLE`.
- `ModelDef(id, voxelSize=0.1)` -> `addPart(id, grid, {parent, origin (voxels, relative to the parent's pivot), pivot (voxel coords in own grid), rest:[rx,ry,rz], shadow})`, `addAttach(name, partId, [x,y,z])` (voxel coords INSIDE the part grid), `meta: {rig, kind, ...}`. A ModelDef is pure data.
- Rest rotation is applied after the animated one: `local = T(origin+poseT) * R(pose) * R(rest) * S(poseS)`. Parents precede children. **Max 48 parts**; empty parts are omitted by builders.
- `composeModels(id, items)` (`voxel/compose.js`) merges models (mounts + riders, chariot team, elephant + howdah archers, catapult + crew) into ONE ModelDef so it renders as one skinned instance. Sub-models get prefixes (`r_`, `h1_`, `crew1_`); `meta.subrigs=[{prefix,rig,parts}]` tells the animator which clips pose which parts.
- `model.attachLocal(name)` returns the attach point as WORLD units relative to its part's pivot; `VoxSkin.attachWorld(i, partIndex, lx, ly, lz, out)` uses that convention. Attach points are an FX/render facility only; the **sim derives projectile launch points** from the def (`origin = unit position + forward*0.5 + height*0.72`).
- **LOD**: `voxel/lod.js: downsample2(grid)` (majority vote, 2x) builds a far-LOD grid; VoxSkin holds near+far InstancedMesh pairs per type (2 draw calls) and splits instances by camera distance (near < 38 u at Marble). The shadow pass uses the far mesh.

### 4.1 Humanoid rig `hum1` (canonical; every humanoid, custom soldiers included)
Origins are in voxels relative to the parent pivot. **Extent column says which side of the pivot the grid extends** (so builders don't guess). Left = +X.
| part | parent | grid (x,y,z) | pivot (in grid) | origin from parent | extent from pivot |
|---|---|---|---|---|---|
| body | root | 10,9,5 | 5,0,2.5 | 0,10,0 | +Y 9; ±5 x; ±2.5 z |
| head | body | 10,10,10 | 5,0,5 | 0,9,0 | +Y 10; ±5 x; ±5 z (face cube at x 2..7, y 0..5, z 2..7 → faces +Z) |
| crest | head | 10,8,12 | 5,0,6 | 0,6,0 | +Y 8; ±5 x; z -6..+6 (plume/horns/hair volume) |
| armUL / armUR | body | 3,5,3 | 1.5,5,1.5 | +6.5 / -6.5, 8, 0 | -Y 5 (hangs down) |
| armLL / armLR | armU* | 3,5,3 | 1.5,5,1.5 | 0,-5,0 | -Y 5; hand at the bottom (y 0..1) |
| weapon | armLR | 9,48,9 | 4,10,4 | 0,-4,0.5 | grip at pivot; blade/shaft along **+Y** (rest rotation turns it forward), edge normal +Z; extends up to 38 beyond the grip, 10 behind |
| offhand | armLL | 16,16,6 | 8,8,3 | 0,-4,0.5 | centred on the hand; shield **face normal +Z**, rim in XY; bottom stays >= y 1 above ground at idle |
| legUL / legUR | root | 4,5,4 | 2,5,2 | +3 / -3, 10, 0 | -Y 5 |
| legLL / legLR | legU* | 4,5,6 | 2,5,2 | 0,-5,0 | -Y 5; foot extends +Z (z 4..5) |
| back | body | 12,14,8 | 6,7,8 | 0,7,-2.5 | **content extends toward -Z** (z -8..0 from pivot), ±6 x, ±7 y |
| cape | body | 10,14,2 | 5,14,1 | 0,8,-3 | -Y 14 (hangs); cape2 child: 10,10,2 pivot 5,10,1 origin 0,-14,0 |
Standing height = 10 (legs) + 9 (body) + 10 (head) = **29 voxels (2.9 u); 33 (3.3 u) with a tall crest**. Attach points: `grip_main` (weapon pivot), `grip_off`, `eyes`, `head_top`, `muzzle` (weapon tip), `body_center`, `feet`.
- **Weapon length rule**: `compileSoldier` clamps the weapon's forward extent so the tip is at `range + radius + 0.3` u from the body axis when thrusting; `range` in the sim is authoritative and measured **edge to edge** (`gap = dist - r1 - r2 <= range`). Custom weapon reach <= 3.6 u.
- Body types are whole-model scale at instance time (`slim 0.92/1.0/0.92`, `average 1`, `stocky 1.12/0.98/1.12`; `giant` per unit def), never separate grids.
- **`hum_lite`** (crews, spectators): body, head, armUL, armUR, legUL, legUR (6 parts, no forearms/shins), same dims; clips drop the missing parts.

### 4.2 Other rigs (part ids frozen; BEASTS builds, ANIM animates; each beast ModelDef sets `meta.rig`)
- `quad1` (horse, camel, hound, goat, centaur body, sphinx-style): `body, neck, head, tail, legFL, legFR, legBL, legBR` (+ optional static children: `saddle, mane, ears, horns, barding`). Faces +Z; legs pivot at the top; proportion parameters per species. Attach: `saddle`, `head_top`, `mouth`.
- `elephant1`: `body, head, trunkA, trunkB, trunkC, earL, earR, tail, legFL, legFR, legBL, legBR, howdah` (+ attach `howdah_a`, `howdah_b` for crew sub-models).
- `chariot1`: `body, wheelL, wheelR, pole` + sub-rigs for 2 horses (`h1_`, `h2_` quad1), driver/archer `hum1` (`d_`, `a_`).
- `catapult1`: `frame, wheelL, wheelR, arm, sling` + 2-3 `hum_lite` crew (`c1_`..); `ballista1`: `frame, wheelL, wheelR, bow, string?, bolt` + crew.
- `chicken1`: `body, head, wingL, wingR, legL, legR, tail`. `trojan1`: `body, head, tail, legs (4, quad1-like), hatch` + wheels.
- Mounted unit = `composeModels(id, [{model: mount}, {model: hum1 rider, prefix:'r_', on:'saddle', offset:[0,…]}])`; the rider sits via the `ride_idle/ride_strike/ride_shoot` clips (legs forward).

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
- `compileSoldier(bp, opts) -> {model: ModelDef, grip, reach, height, radius, weaponStyle}` is the ONLY path from data to a humanoid ModelDef (presets and custom soldiers alike). `validateBlueprint(bp)` rejects unknown ids with a human message; defaults only for missing optional keys.
- Part builder: `(ctx) => VoxelGrid` (+ metadata for weapons `{style, reach, rest:[rx,ry,rz], twoHanded, grip:[x,y,z]}`); `ctx = {bp, colors, rng(seeded by bp.id), dims}`. `style` ∈ `slash|thrust|overhead|bash|shoot|throw|cast|pike|none`.
- **Readability rules**: shield >= 12 voxels wide with team-tint on its face; faction-specific helmet silhouettes; role recognisable at 40 px tall in a 3-zoom contact sheet. **Team tint**: >= 30% of visible humanoid surface (cloth, plume, cape, shield face, sash) is `F_TEAM`; non-humanoids (monsters, animals, siege) >= 15% (saddle cloth, blanket, banner, collar); faction colours persist on metal/trim. Mirror matches (same faction both sides) must stay readable by tint alone.

### 5.1 CustomSoldier (editors, save, share, sim)
```jsonc
{ "v":1, "id":"cs_xxxxx", "name":"Sir Chadius", "blueprint":{...}, 
  "stats":{ "hp":0..30, "damage":0..30, "speed":0..20, "armor":0..20, "morale":0..10 /* point-buy, total <= 100 */ },
  "weapon":"gladius", "abilities":["kick"], "ai":"charge|hold|skirmish|flank|guard|support",
  "text":{ "catch":"…", "deaths":["…","…","…"], "pitch":1.0 } }
```
`statsToUnitDef(cs) -> UnitDef` (in `sim/stats.js`) derives hp/dmg/cd/range/speed/armor/radius(0.45-0.7 from compiled bounds)/mass from the stats + weapon class tables; `costFormula` is applied to the DERIVED def (never trusted from files) and clamped by the role efficiency cap (editors.md).

## 6. UnitDef (sim + content contract)
```ts
UnitDef {
  id, name, faction, role:'melee|ranged|cavalry|siege|support|hero|monster|swarm|beast', tags:string[], cost,
  model: {kind:'humanoid', blueprint, scale?} | {kind:'mounted', mount:'horse|camel', mountColors, rider:Blueprint} | {kind:'beast', builder, opts?} | {kind:'bespoke', builder, opts?},
  radius (default 0.55), height (display, default by role), mass (default 1), scale (default 1),
  hp, armor 0..0.75, speed (u/s walk), runMul (default 1.5), accel 14, turnRate 9,
  melee?:  { dmg, cd, range, type:'slash|pierce|blunt', style, ap?, kb?, hook?, poison? },
  ranged?: { proj:'arrow|javelin|pilum|francisca|boulder|bolt|coin|sunbeam|scepter|thunderbolt', dmg, cd, range, minRange?, speed, gravity, spread, type?, ap?, aoe?, pierceN?, chain?, volley?, whileMoving?, crater?, misfire?, misaim?, fireEvery?, bribe?, breaksShield? },
  shield?: { arc /*half-angle degrees*/, block, proj },
  abilities: AbilityRef[],  ai:{style:'charge|hold|skirmish|flank|guard|support|siege|hero', leash?, preferTargets?},
  sfx?: {hit?, swing?, shoot?, death?, voice?}, text:{blurb,lore,deaths[3+],taunts[2+],codexJoke} (HUMOR)
}
AbilityRef = { id:string /* key in sim/abilities registry */, ...params }  e.g. {id:'cc_field', effect:'confuse', shape:'circle', radius:7, channel:3, cd:14}
```
- **Semantics**: `range` is the **gap** between body edges (centre distance - r1 - r2). `cd` is the **full cycle** between attack starts; the clip plays faster (rate 1..2.4x) if its natural length exceeds `0.92*cd`. `dmg` is pre-armor. `kb` is a knockback strength used with the constant **KB_SCALE = 0.06**: initial velocity `= kb * dmg/mass * KB_SCALE` (u/s), friction 6/s => travel `v0/6`; a normal hoplite hit nudges ~0.55 u, charge hits shove 1.5-3 u, clamp max 48 u/s (8 u). Explicit-distance effects (kick 8 u, bull charge) set velocity directly.
- **Projectile rules**: sim derives launch point from def; leads moving targets (2 iterations); solves low-arc ballistic angle for `speed` and `gravity` (fallback 45°); adds gaussian `spread`; sub-steps so a step never exceeds 0.7 u; collision radius 0.3 (boulder 0.6); hits the first unit whose cylinder it crosses (skips shooter; friendly units only if friendlyFire, and 50% pass-over otherwise); blocked by `cover` props and terrain; shields intercept in the front arc with `shield.proj`; `pierceN` continues with 0.8x damage; `aoe` explodes with 1 -> 0.4 falloff; `crater:true` deforms terrain.
- Defaults when a field is absent are in `sim/defs.js: normalizeDef`; U1 validates against the schema + defaults, not "every field present".

### 6.1 Abilities (mechanics, not classes): <= 32 total, each with trigger, AI cast rule, **visible telegraph**, cue, announcer hook, unit test
Classes: `aura, stance, kick, cc_field, net, heal_pulse, execute, dot_cloud, revive, rage, chain_lightning, war_horn, dash, summon_on_death, tantrum, cluck, pack_bonus, bribe, throne, crowd_favorite`; passive/attack-modifiers (via `onHit` hook class): `hook` (khopesh pulls shield), `breaksShield` (pilum), `fireEvery` (flaming arrows), `poison`, `misfire` (catapult), `misaim` (cyclops), `fire_panic` (elephant flees after 3 fire hits), `trample`, `brace`, `charge`, `backstab`. Hook points: `init, tick, mods, onHitDealt, onDamaged, onLethal, onKilled, onKill`. Implementations in `sim/abilities/<id>.js` self-register in `abilities/index.js`.

## 7. Clips, animation contract (src/anim/)
**Two layers**: `anim/clips.js` (exists, pure data, seconds API, used by the sim) and `anim/animator.js` (pure, no THREE; poses models from clips).
```ts
Clip { id, fps:30, frames:N, loop:boolean, rig:'hum1|quad1|elephant1|…', 
  q: { [partId]: number[] }        // interleaved rx,ry,rz radians per frame (length 3*frames); optional t: {[partId]: number[3*frames]} translation (world u), s: {[partId]: number[3*frames]} scale
  root?: { y?:number[], x?:number[], z?:number[], pitch?:number[], roll?:number[], yaw?:number[] }   // length frames, world units / radians, applies to the instance root
  meta: { hitFrame?, recoverFrame?, speedRef? /*u/s that matches the foot cadence*/, fx?:[{frame, cue}] } }
ClipLib.meta(id) -> {dur, hit?, loop, speedRef?}   // seconds; ClipLib.dur/hit/get/register/ids
```
`Animator.pose(model, state, extra, out: Float32Array)` writes **9 floats per part** (`tx,ty,tz,rx,ry,rz,sx,sy,sz`) in model part order (POSE_STRIDE=9). `state = u.anim = {clip, t, rate, flinch, dir, prev, blend, mount?, rider?}` — **the sim chooses clip ids and times; the animator only samples** (crossfade `blend` 0.12-0.2 s, locomotion rate = `speed / speedRef`, additive hit flinch toward `dir`, weapon/offhand overlay tracks by `weapon.style`). For composed models, `u.anim.mount` and `u.anim.rider` select clips for the mount sub-rig and rider sub-rig independently.
- **State -> clip mapping (owned by the sim, `sim/ai.js` + `combat.js`)**: idle, idle_combat, walk|run (|trot|gallop for animals/cavalry), strike_<style>, shoot_bow, throw, cast, launch, kick, block_hit, hit_front|hit_back (by attacker side), stagger, stun, dizzy, cower (sleep), death_back|death_front|death_spin (by hit direction/knockback), getup, cheer, taunt, rout, sit, ride_idle/ride_strike/ride_shoot, gallop, rear, strike_bite|gore|stomp|ram|headbutt|peck, trumpet, reveal, tantrum, reload, flap.
- **Clip sources (honest coverage)** — real CC0 mocap from Quaternius UAL 1/2 retargeted by direction-based retargeting (`tools/anim/`): idle, idle_combat (Sword_Idle), walk, run, strike_slash_1/2 (Sword_Regular A/B), strike_bash (Shield_OneShot), throw (OverhandThrow), cast (Spell_Simple_Shoot), block_hold (Idle_Shield_Loop), hit_front (Hit_Chest/Knockback), sit, death_back (Death01), dance for the throne/humor. **Hand-authored with the clip DSL (`anim/dsl.js`)**: strike_thrust, shoot_bow, strike_overhead, kick, hit_back, block_hit, stagger, stun, dizzy, cower, taunt, cheer, rout, death_front, death_spin, getup, ride_*, and ALL beast/siege/mount clips (quad1 gait + attacks, elephant, chariot, catapult/ballista, chicken, trojan). Death variety also comes from root pitch/roll tumbles and time-warped variants. Credits and the final message state this split.
- Clips target hit moments: damage lands at `hit` ± 1 tick; `strike_*` natural durations in `DEFAULT_META` are design targets.

## 8. Sim contracts (src/sim/) — pure, deterministic
```js
const world = new World({ arena, seed, rules, defs })   // CLONES the arena; render/editor use world.arena for the live (mutating) terrain
world.addUnit(defId, team, x, z, {heading, squad, order, name, custom, vip, general}) -> Unit      // ids are monotonic and NEVER reused
world.addSquad(defId, team, n, cx, cz, {formation, heading, order, spacing}) -> Squad
world.start(countdownSeconds?)   world.tick()   world.step(n)
world.input(tick, cmd)           // tick-stamped input queue: {type:'cast', power, x, z, team} | {type:'command', squad, order:'advance|hold|retreat|focus|move', target?, x?, z?} | {type:'possess', unit, move:{x,z}, attack:bool, ability:n}
world.units (live, dense array, indices change; use unit.id)   world.dying (corpses: dead units still animating a death clip for 1.6 s, same Unit objects)   world.props   world.hazards   world.proj (ProjectileSystem)
world.events (EventBus)   world.stats[team]   world.state: 'placing'|'countdown'|'running'|'ended'   world.winner: 0|1|-1(draw)   world.time
```
Unit fields read by render: `id, def, team, x,y,z, px,py,pz (previous tick), heading, pheading, pitch, roll, hp, hpMax, alive, anim, flash 0..1, se[] (status timers), stone 0..1, glow, scale, squad, kills, name, custom, controlled`. Everything else is sim-private.
- **Arena markers** (data on the arena, used by objectives): `arena.markers = [{id, type:'hill|exit|vip_start|general_spawn|waypoint', x, z, r}]` (<= 8); `arena.env = {time, weather, fog, theme, wind, mood}`. `Arena.fromJSON` enforces the editor limits of §2.
- **Weather** is read from `rules.weather ?? arena.env.weather`; the sim reads it only through `weatherMods`.
- **Power rating** (`sim/power.js`): `power(unit) = sqrt(hpEff * dps)` with `hpEff = hp*(1+armor*1.4)*(1+shield.block*0.35)`, `dps = melee.dmg/melee.cd (or ranged)*(1+0.25*sizeFactor)`; team power = sum over alive units; `big_swing` fires when `|ln(ratio) - ln(lastRatio)| > 0.35` and carries `{team, ratio, flank:'left|right|center', cluster:{x,z}}`; Cassandra's lines use these.

### 8.1 Core rules (formulas; each has a unit test and visible feedback)
- **Damage**: `raw = dmg * rand(0.9,1.1) * crit * charge * backstab * aura/status mults`; crit 6% x2; backstab (melee, attacker outside the target's 120° front arc) x1.35; `eff = clamp((armor + mArmor)*(1-ap), 0, 0.9)`; `final = max(1, raw*(1-eff))`. Types: slash ap 0, pierce 0.3, blunt 0.2 (+stagger), fire/magic ap 1 (fire adds burn 4 dps x3 s; `fire_weak` x1.8, undead x2).
- **Shield block**: attacker inside `shield.arc` (front) and `rand < block` (melee) or `< proj` (projectile) => negated, `unit_block` event (`unit_hit` is NOT emitted); bash styles stagger the attacker 0.25 s. Stance abilities add to block/proj while stationary with >= 3 same-team allies within 2 u.
- **Charge**: `chargeMul = clamp((speed/walk-1)/(runMul-1),0,1)` for `cavalry|large|beast`; melee dmg x(1+chargeMul), knockback x(1+1.5*chargeMul). **Brace**: a `spear|pike` target facing within 50° of a `cavalry` attacker and moving < 50% walk deals the charger 1.6x dmg and cancels its momentum (`unit_brace`).
- **Knockback**: see §6 (KB_SCALE). Units never leave the nav grid through knockback (movement is validated per step); falling/knockdown over cliffs is not simulated; lava/water are only entered by geysers/launch effects explicitly (they apply fall/lava damage, S9 excludes airborne units).
- **Trample** (`mass >= 8` moving > 1.5 u/s): units with mass < 3 take 18 dps and are shoved; `trample` event rate-limited 4/s.
- **Friendly fire**: AoE hurts all; arrows/javelins hurt allies only if `rules.friendlyFire`; `friendly:true` on `unit_kill`.
- **Morale** 0..100: -2 per ally dying within 6 u (x1.5 officer/hero), -6 flanked, -0.9/s below 30% hp, +1.2/s within 10 u of an officer; <= 15 => **rout** until > 40 for 3 s; `fearless` ignores; army collapse (< 20% alive, >= 6 starting) => -10/s.
- **Engagement slots**: a target accepts `2 + floor(radius*4)` melee attackers (large: 8); extra attackers path to free ring slots; spears (range >= 2) attack over a friendly front rank; idle-in-contact fraction < 3%.
- **Stalemate watchdog**: no damage 12 s => `stalemate_warning`; 18 s => advance everyone; 30 s => Zeus lightning on the densest cluster + 1 goat for the weaker side (`intervention` events); 44 s => Zeus ragequit: draw (`winner = -1`, reason `intervention`). Max battle 6 min => decided by remaining cost. Pacing governor: at 90 s with a > 4:1 ratio morale collapse accelerates; at 45 s with ratio within 10% and no engagement, advance.
- **AI layers**: (1) squad strategic (anchor + formation slots, orders, lag-throttled march, flow field), (2) tactical (target scoring with persistence/hysteresis, role rules, slots), (3) movement (flow field + steering + PBD collision, kiting). Difficulty by behaviour only: `easy` reaction 0.8 s, no flank, no ability use for non-heroes; `normal` 0.4 s; `hard` 0.2 s + focus fire + kiting + counter-pick composition.

### 8.2 Event catalog (the sim<->audio<->humor<->UI contract). Payloads reused; consumers must not retain.
`battle_countdown{n}`, `battle_start{teams}`, `battle_end{winner(-1 draw), reason:'elimination|time|objective|rout|intervention', t, stats, perDef:{team:{defId:alive}}}`, `unit_spawn{id,team,def,x,z}`, `unit_hit{src,dst,srcDef,dstDef,dmg,type,crit,backstab,charge,proj,aoe,x,y,z}` (blocked hits emit `unit_block` only), `unit_block{src,dst,x,y,z,kind}`, `unit_kill{src,dst,srcDef,dstDef,srcTeam,dstTeam,friendly,byPlayer,revived,cause,x,y,z}` with `cause ∈ melee|ranged|aoe|fire|fall|trample|magic|stone|kick|gore|drown|lava|spikes|geyser|poison|lightning|execute|misfire|bribe`, `unit_heal{id,amount}`, `unit_stagger{id}`, `unit_rout{id,team}`, `unit_rally{id}`, `unit_revive{id}`, `unit_convert{id,team}`, `ability_cast{id,ability,x,z,team}`, `ability_channel_start/end{id,ability,duration}` (telegraph), `telegraph{kind,x,z,r,t}`, `status_apply{id,status}`, `projectile_launch{kind,team,x,y,z,tx,tz,id}`, `projectile_hit{kind,x,y,z,onUnit,blocked}`, `explosion{kind,x,y,z,r}`, `lightning_arc{x0..z1}`, `crater{x,z,r,x0,z0,x1,z1}`, `prop_damaged{id,type,hpFrac,x,y,z}`, `prop_destroyed{id,type,x,y,z,s}`, `prop_spawned{id,type,x,z}`, `first_blood`, `kill_streak{id,count,def}`, `hero_down{id,def,team}`, `army_low{team,frac}`, `lead_change{team,ratio}`, `big_swing{team,ratio,flank,cluster}`, `stalemate_warning{t}`, `intervention{kind:'zeus|goat|ragequit'}`, `objective_update{id,state,progress}`, `wave_spawn{n,count}`, `god_power{kind,x,z,team}`, `chicken_tantrum`, `philosopher_monologue`, `trojan_reveal`, `stone_gaze{src,count}`, `throne_sit`, `friendly_fire{src,dst,dmg}`, `trample{id,count}`, `charge_hit{id,dst,mul}`, `unit_brace{id,dst}`, `cyclops_misaim{id}`, `catapult_misfire{id}`, `unit_corpse_done{id,def,team,x,y,z}`, `bark{id,text}`. The crowd (colosseum) reacts in render code to `unit_kill` clusters. Lifetime stats are accumulated by `src/save/stats.js` from this stream (single mapping table) plus UI-side events (`arena_saved`, `soldier_saved`, `arena_played`).

### 8.3 Time model
`app/loop.js` (COORD): accumulates real dt (clamped 0.1 s), runs up to 5 ticks per frame at `speed` ∈ {0.25,0.5,1,2,4}, passes `alpha` for interpolation; global slow-mo = speed ramp. Hit-stop and screen shake are **render-side**: freeze the animation clock of the struck/striking pair (70-120 ms) and hold the camera, driven by `unit_hit` significance. A single injectable `Clock` (`window.__vw.clock`). Inputs are applied by tick via `world.input`.

## 9. Render contracts (src/render/)
- `Engine`, `Post` (one HDR render-target path at **every** tier: tone mapping/sRGB in the composite; tiers only change bloom/FXAA/resolution, never recompile materials), `TerrainRenderer` (32-cell chunks (16 u): 36/64 chunks on medium/large; LOD by distance), `PropRenderer` (instanced per (id,stage), merged batches), `CubeFX` (exists), `Cameras`, `preview.js` (offscreen thumbnails/turntables for Codex, Workshop, painter, arena cards: render-to-texture on the single GL context).
- `VoxSkin` (implemented): `new VoxSkin(host{scene}, model, {capacity, shadow})`, `skin.begin()`, `skin.add(x,y,z,heading,sx,sy,sz,pose,teamRGB[3 linear],flash,stone,glow,pitch,roll)`, `skin.end()`, `skin.attachWorld(i, partIndex, lx,ly,lz,out)`. Per-instance status uniform `aFx = (flash, stone, glow, tint)` where `tint ∈ {0 none, 1 burn, 2 wine, 3 poison, 4 sleep, 5 selected-rim}` (added in T1). Explicit `customProgramCacheKey`; matching `customDepthMaterial` for shadows.
- Death matrix (8+ behaviours, chosen by cause x direction x size): `crumple_back`, `crumple_front`, `flung_tumble` (kb > 6: root pitch/roll + arc), `spin_out`, `burning_run` (3 s then collapse), `stone_shatter`, `lava_sink`, `comic_puff` (chickens/goats: smoke puff + feather confetti), `monster_collapse` (slow fall + dust), `drowned`; each ends in a debris burst sampled from the model palette (20-40 cubes by size) and a `unit_corpse_done` event; corpses persist per the `corpses` rule (stay N=60 oldest recycled | fade 8 s | none).
- FX inventory (all CubeFX unless noted): swing smear arcs (instanced ribbon quads), per-material impact sparks (flesh/bronze/wood/stone/shield), dust on charge/foot-fall, footstep dust by material, banner cloth wave (vertex shader), projectile trails, scorch decals (terrain vertex colour, capped), blood/wine/confetti, fire, smoke, lightning arcs, telegraph rings, heal sparkles, stone sparkle, damage numbers, bubbles.
- `style.js` freezes light rig, AO curve, `TEAM_COLORS`, tone mapping, fog; **frozen only after `post.js` exists** (look-dev gate comes after post).

## 10. Audio contract (src/audio/) — see spec/audio.md
`audio.play(cue, {x,y,z,vol,pitch,priority})`, `audio.music.setMood/setIntensity`, `audio.duck`, `audio.setVolume`, `audio.state`, `audio.diagnostics()`. `UnitDef.sfx` overrides cue defaults from `cues.js`. Core pack: **SFX only are embedded (<= 450 KB raw)** plus a short menu stinger; music is fetched; AU4 therefore requires hits/UI/horns/deaths offline and synthesized ambient music as the offline fallback (flagged).

## 11. Save and share (src/save/)
`store` wraps localStorage (try/catch, memory fallback, per-key byte accounting, `status()` ok|memory|full). Keys (versioned `{v,data}`): `vw.settings, vw.progress, vw.arenas, vw.soldiers, vw.armies, vw.seen, vw.survival, vw.daily, vw.draft.*`. **Decision: saves are device-local by design**; Settings > Data offers Export all / Import all (files via `downloads` + file input; text fallback) and shows a "Not saving" indicator when storage is blocked.
**Sharing** has three channels and one parser: (1) text code `VW1.<type>.<base64url(payload)>.<crc32>` (payload = JSON -> deflate-raw (CompressionStream, else the pure-JS fallback in `core/deflate.js`) with palette-indexed varint layers for heightmaps/paint), size classes S/M/L (<= 1.8k / 8k / 38k chars), displayed; (2) `.vwarena` / `.vwsoldier` / `.vwarmy` files via `downloads.save` and file-input/drag-drop; (3) PNG cards (photo mode / results). `validate.js`: strict schema, clamps/rejects with plain-English messages, `Object.create(null)`, no `__proto__`, unknown ids -> clear error, NaN/Infinity rejected, strings length-limited, `textContent` only.

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
- `npm run gate` = `tools/lint.mjs` (§0) + `node --check` + unit tests (`tests/**/*.test.mjs`) + contract validators (UnitDef/Blueprint/Clip/Arena/Mission schema, every unit compiles to <= 48 parts, every cue resolves) + `build` + `smoke`.
- `tools/smoke.mjs` (Playwright, explicit `executablePath=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, **a local server that sends the artifact CSP header** built from the contract text, fails on any console error/warn, `securitypolicyviolation`, 4xx/5xx, unhandled rejection).
- Audio tests stub `AudioContext` to start `suspended` and resume only after a synthetic gesture, with a negative control (remove the gate => test must fail).
- Balance harness runtime budget (4 cores): 20v20 for pair matrices (~0.5 s each), 150v150 only for perf and fairness; fairness uses n >= 400 per arena with side swap and a stated exemption band for asymmetric arenas (Troy, Thermopylae, Nile).
- Every N/B/M criterion that guards a high-risk behaviour has a **negative control** (listed in verification.md "NC" column); QA runs them at each gate and records pass-then-fail evidence.
- Hand-back from each agent includes: files changed, gate output, screenshots/filmstrips where visual.

## 14. Meta-features (decided; owners in plan.md)
**Lessons** (results screen: 3 generated lessons from the event log with Cassandra's voice, `sim/lessons.js`), **Scout report** (placement: composition weaknesses and counter chips from armygen tables), **Mutators** (>= 8 unlocked by campaign stars: Big Heads, Tiny Titans, Moon Gravity (knockback x3), Chicken Rain, Wine Rain Always, Friendly Fire Fiesta, Speedy Soldiers, Ragdoll Frenzy; data-only rule multipliers), **Daily Skirmish** (seed from the local date, fixed budget/arena/enemy style, local history, copyable result string), **Puzzle Challenges** (6 data-only missions), **Kill-cam** (cinematic follow of the last 4 s of a hero/boss/streak kill using real-time slow-mo; full replay is on the cut ladder), battle **choreography** (pre-battle stand-off, finish, results camera orbit; reduce-motion variants), **teaching beats** in mission 1 (scripted hints with skip), optional owner-only **diagnostics beacon** via `db` (T3).
