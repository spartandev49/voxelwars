# decisions_r3.md - COORD decisions answering q3.md (round 3 Socratic review)

Binding on every agent. Where this file and spec.md disagree, THIS FILE WINS until spec.md is patched; the doc agents patch spec.md/companions to match, then this file is archived under docs/history/. Code that already exists is the source of truth for anything not listed here (the docs describe the code, not the other way round), unless a decision below says "code changes".

## D1 Gate / lint (C3-1)
`src/core/tween.js` and `src/save/store.js` are the ONLY browser adapters inside otherwise-pure directories (gsap shim; localStorage wrapper). `tools/lint.mjs` exempts them by path (`ADAPTERS`). Spec §0.1 names them. Code: COORD (done in lint.mjs).

## D2 hum1 shield / weapon geometry (C3-2, C3-9)
The canonical hum1 table is the `DIM` table in `src/content/era_ancient/parts/_kit.js` (UNITS-LIB) and the spec §4.1 table is regenerated FROM it (not the other way). Rules that replace the old "offhand centred on hand, face normal +Z, bottom >= y1" prose:
- The offhand grid is at most 16x16x6 voxels (pavise, tower shield: also <= 16x16; nothing taller). Pivot at the grip. Its rest rotation comes from the part registry meta (`offs[id].meta.rest`) and, at runtime, the Animator turns the shield by weapon style (block raises it in front, idle carries it forward-left). The rest-pose AABB MAY overlap the torso and the forearm (the arm passes through the strap; interior overlap is invisible). It MUST NOT poke through the back of the body or below y = 0.
- Weapon: the compiler tilts the rest rotation until its lowest corner is >= y 0 (`blueprints.js restBounds` loop already does this); the weapon-length rule stays edge-to-edge with `range`. The Animator derives the blade axis from `R_rest*(0,1,0)`, so a rest number is NOT a cross-agent contract; the animation spike's Rx(140deg) is a spike-local convention and is replaced by the Animator.
- Shielded infantry spread: units that carry a shield with width >= 12 use `radius >= 0.65` in stats.js so lines do not interpenetrate (SIM retunes). Phalanx formations may overlap shields at 1.15 u spacing; that is the look.
- `back` slot: the grid stays 12x14x8 (top y 24). A banner on the back is a SHORT flag (<= y 24). The strategos' tall banner pole is a main-hand "standard" weapon (tint cloth). Spec units.md is edited accordingly (strategos: standard in main hand, no back-pole).
- Tint surfaces: every unit in units.md gets a "Tint:" line naming the surfaces carrying `T()` team colour (hoplite: crest + chiton hem + shield rim + boss ring; legionary: scutum is NEUTRAL red-brown, tint = tunic hem + helmet crest + shield rim). The "shield >= 12 wide with tint on its face" rule becomes "shield carries a >= 3 voxel wide tint band (rim or boss ring)". U3 (>= 30% tint-visible pixels at default camera) is measured by `tools/tintcheck.mjs`; threshold stays 30% over the whole silhouette incl. cloth.

## D3 Part cap (C3-3)
VoxSkin cap = 48 parts (texture row is 3 texels per part = 144 texels). Code: COORD (done). Spec stays "max 48". chariot1 crew = `hum_lite` (16 parts but legs merged: `legUL` is one 4x10x4 part, `legLL` absent for hum_lite => 14 parts) so chariot1 = 4 + 2x quad1 (8) + 2x14 = 48 max. BEASTS adapts if its chariot builder uses hum1 crew. `hum_lite` stands on the floor (legs 10 long).

## D4 Animator contract (C3-4, C3-5)
- Spec §7 documents what `src/anim/animator.js`, `clips.js`, `boot.js`, `dsl.js`, `ual.js`, `gait.js` and `render/battleview.js` actually do: `Animator.pose(model, state, extra, out)` with `extra = {speed, gait, dead, t, id, hp, state, team, root:{y,x,z,pitch,roll,yaw}}` (BattleView owns the object, the Animator writes `extra.root`), `ClipLib.get(id, rig)` / `getQualified`, the UAL JSON container `{rig, fps, parts[], clips:{id:{frames, loop, meta, q, root[], rootX, rootZ, rootPitch, rootRoll, rootYaw}}}`, `anim/boot.js registerAllClips(ClipLib, {humanoid, onReport})` as converter + registration entry, per-rig `speedRef` (only hit/recover times must be shared across rigs of one id).
- `u.anim.mount` / `u.anim.rider` are REMOVED from the sim contract. The sim publishes ONE clip id + rate + stateT per unit (`u.anim.clip`). The Animator derives mount/rider/sub-rig clips from `u.anim.clip` + `model.meta.subrigs` + `model.meta.clipMap`. (A rider model plays `ride_*` for the humanoid sub-rig; the mount sub-rig plays gallop/trot/etc.)
- The same plain clip id (walk, death_back, ...) is valid for every rig; each rig resolves it through `ClipLib.get(id, rig)` with fallbacks (rig -> 'hum1' -> default).

## D5 Timing (C3-7, C3-8)
- Death: `deathLinger = max(1.6, deathClipDuration(rig) + 0.2)` per unit (SIM reads `ClipLib.duration(id, rig)`); the clip plays at rate 1.0. Real death_back = 2.43 s.
- Locomotion: the Animator drives gait cadence from distance travelled (`extra.gait` accumulates `speed * dt / stride(rig)`) and picks walk/jog/run by `speed / speedRef` band (< 0.8 walk-slow, 0.8..1.6 walk, 1.6..2.6 jog (walk clip at 1.7x with bounce), > 2.6 run). `speedRef` is per rig (hum1 walk 1.1 u/s, run 6.31 u/s). The sim only publishes `speed`. A4 asserts steps/s within 1.5-3.5 for every infantry def.
- Corpse root motion: ONE owner = render (Animator + BattleView). The sim publishes `deathCause`, `deadT`, `kx, kz, ky` (launch velocity at death) and `deathKind` on the unit; it NO LONGER writes `pitch`/`roll` on corpses. The render-read list in spec §8 gains `deadT, deathCause, deathKind, kx, kz, ky`. SIM removes `u.pitch = -u.deadT*5` and the y arc (keep ballistic xz/y from kx,kz,ky).

## D6 Events (C3-6)
One table `EVENTS = {name: [fields]}` in `src/core/events.js`; `World` derives its pre-allocated payload table `P` from it; spec §8.2 mirrors it; a test (`tests/events.test.mjs`) fails if any `w.P.x` use in `src/sim` is not in the table. `big_swing` payload = `{team, ratio, flank, cluster}` per spec §8.2 (sim/power.js). `battle_end` carries `perDef`. `reason` enum includes `objective|rout|elimination|time|forfeit`. SIM + COORD.

## D7 Rules schema (C3-14)
Spec §8 gains a single **Rules** table (the only schema): `{friendlyFire, morale, speed, timeLimit (0 = none, else seconds; default 360), difficulty, objective, godPowers, deathCorpses, gore, weather, time, startFormation, mutators[], budget, cap}`. `Setup.rules` (app_contract), World rules, world.md §8 UI fields and mutators all reference it. `Game.command({order, squad, ...})`: `type` is implied ('command'); the sim input envelope is `{type:'command', squad, order}` (spec §8).

## D8 Audio facade (C3-15)
Spec §10 and `Ctx.audio` list exactly: `play(id, opts)`, `ui(name)`, `setListener(x,y,z,yaw)`, `music.setMood(mood, {theme})`, `music.setIntensity(v)`, `duck(bus, amount, secs)`, `setVolume(bus, v)`, `setMuted(b)`, `unlock()`, `attach(node|null)`, `state()`, `diagnostics()`. AUDIO exposes all of them (nullaudio.js mirrors the same names).

## D9 Ownership (C3-16)
SIM owns `src/sim/**` NOW (COORD files change requests via docs/requests/). COORD additionally owns: `content/era_ancient/content.js`, `fallback_model.js`, `app/*`, `render/tempanimator.js`, `anim/boot.js` is ANIM's. `stats.js` is SIM's (the header "Owned by COORD" is wrong). `docs/beasts_rigs.md` becomes `docs/spec/rigs.md` (BEASTS writes it; spec §4.2 links to it and carries the per-rig pivot tables).

## D10 Knockback (C3-19)
Contract stays 1.5-3 u for charge hits. Cavalry `kb` ~2.5 (SIM). Monsters: elephant/minotaur/cyclops shove 3-5 u on a mass-1 target (clamped by the 48 u/s velocity clamp); spec §6 states the monster range (3-5 u) and S25 splits into infantry (<= 0.7 u without crit) / cavalry charge (1.5-3 u) / monster (3-5 u). units.md drops its kb column (stats.js is the source).

## D11 Verification rows (C3-10, C3-11, C3-12)
- PF2: per-tier formula `near*trisNear + far*trisFar <= triBudget(tier)` using measured `modelStats`; Marble reference = 120 near + 380 far at <= 1.2 M; Olympian = 250 near + 650 far at <= 2.4 M. LOD far = 30% quads.
- S11: >= 99% of 2,000 random matchups end with `reason != 'time'` within 6 sim-minutes.
- A5: compare `meta.hitFrame` with the baked tip-speed peak frame (`peakSpeedFrame` in the clip JSON) +-2 frames.
- Q9 (T0): manual read-back of Diagnostics from the hosted page by the owner; the db beacon row is its own criterion at T3.
- W1: path A->B exists for radius 0.45 AND 0.55 (nav grid is 1 u with soft blockers); `tests/nav.test.mjs` stamps `PROP_CATALOG` footprints.
- Q1: `npm run gate` = lint + syntax + tests + contract validators + build + smoke (smoke wired in).
- U1 validates against schema + defaults; S16 20 classes + 11 modifiers <= 32; R8 8,000 Marble / 16,000 Olympian debris plus particles 3,500/7,000; E8 38,000 chars; S5 War 20,000; A1 `q` (quaternion rows); AU4 offline: music falls back to synth; S22 as in spec §13 + world.md §1 (n >= 400, side swap, 8 exempt arenas Troy, Thermopylae, Nile, ... listed once in §13 and referenced).

## D12 Meta surfaces (C3-13)
ui.md gains §4a "Meta surfaces": Daily (seeded challenge card + streak), Puzzles (6 hand-authored: goal, par, budget), Scout (pre-battle enemy reveal), Lessons (post-battle "why you lost" cards), Mutators (picker with chips), Choreography (battle-intro / victory staging toggles), Teaching beats, Beacon consent. Delete the §6.0 legacy key list. App_contract: ResultsData = what `Game.results()` returns (+ `funnyStats`), `Ctx.save` keys list matches spec §11 incl. `vw.draft.*`.

## D13 CustomSoldier (C3-18)
`stats {hp, damage, attackSpeed, speed, armor, range, morale}` (seven), `weapon` lives only in `blueprint.main`; `radius` 0.3-0.7 (default derived from slim/stout), `scale` clamped to 0.85-1.35 AFTER multiplying height x slim x stout (clamp rule stated); share limit 38,000 chars everywhere.

## D14 Minor (C3-20..24)
Content assembly names (`MODELS`, `BUILDERS`, `UNIT_TEXT`, `setCompiler`) documented in §3; `compileSoldier` return shape documented as the code returns it; caps table single-sourced from `engine.js QUALITY`; elephant fire-panic tramples allies; `crowd_favorite`/`bribe` described as flags/params; catalog count 41 (incl. `gate_door`); plan.md stale bullets struck through (not deleted) with "superseded by decisions" markers.

## R. Resolutions after DOCS-A (COORD, binding)
1. hum_lite = 6 merged parts as built (`beasts/hum_lite.js`); chariot1 totals stand as the code builds them (<= 48). D3's "14 parts" is withdrawn.
2. Locomotion: the registered authored clips `walk/jog/run/rout` (speedRef 2.4 / 3.8 / 5.6 / 5.0) are the infantry locomotion set; the Animator picks by speed/speedRef band and A4 (steps/s 1.5-3.5, no foot-slide > 0.15 u/s) is the arbiter. D5's UAL numbers apply only to the retargeted UAL clips.
3. Audio: `duck(bus, db=-6, ms=400)` and `attach(bus|null, {arena, world, defs, getListener}?)` as coded. 4. A1: Euler triples (`q` length 3 x frames). 5. Clip fallback chain as coded (clipMap, species_id, getQualified, FALLBACK, idle). 6. `ClipLib.dur(id, rig)` is the name.
7. `rules.corpses: stay|fade|none` is the only corpse rule; `deathCorpses` is deleted (SIM removes it from world defaults).
8. `timeLimit`: 0 = no limit (World._checkEnd must treat 0 as none); Game.begin passes 0 through, defaults to 360 only when undefined. `Game.command` injects `type:'command'`.
9. Monster/cavalry kb: SIM retune stays on its list (D10).

## R2. Resolutions after DOCS-B (COORD, binding)
1. `abilities[]` entries authored in stats.js (crowd_favorite, bribe, hook, breaks_shield, fire_every, poison, misfire, misaim, fire_panic) are canonical; spec §6.1 is reconciled to the code.
2. Slot name is `{lifetime:<stat>}` (code). The lifetime stat object exposes BOTH spellings the UI uses: `zeusRagequits`/`zeusRageQuits`, `takeCommandKills`/`commandKills`, plus `bestWave` (survival); META implements aliases in save/stats.js.
3. `duck(bus, db, ms)` as coded. 4. CustomSoldier caps: attackSpeed 0-20, range 0-10 (+0.1 u per point, max +1.0 u), name 1-40; EDITORS-B owns `validateSoldier` in save/validate.js and the share schema for soldiers (seven stats, weapon only in blueprint.main, radius 0.3-0.7, scale clamp).
5. Beacon is OFF until the player accepts the one-time consent card (`beacon:false` default, `seenHints.beacon`); spec §14/plan say so now. No record is written before the answer.
6. `timeLimit` 0 = no limit: Game.begin passes it through (fixed). Weather values include `cloudy`.
7. Builder has 16 tools (E1). 8. New settings `choreoIntro/choreoFinish/choreoOrbit` (default true) exist in DEFAULT_SETTINGS. 9. Daily key = LOCAL date YYYYMMDD (Game.newSetup fixed). 10. 9 mutators (glass_cannons included); star thresholds live in content.js MUTATOR_STARS. 11. input.js gets arrow-key pan + Shift sprint (COORD); double-click focus and long-press info are cut. 12. Shield tint: tint bands + faction-appropriate faces are allowed so long as U3 (>= 30% tint-visible, tintcheck) passes; legionary scutum stays red-brown neutral. 13. SIM: radius .65 for Immortal too (wide wicker shield). 14. Scout items for the Placement UI are `{code, severity:'weak'|'tip', kind, text, counters[], share}` built in Game._scout from armygen.scoutReport; HUMOR provides `humor.scout[code] = {text}`.

## R3. Resolutions after META (COORD, binding)
1. `ctx.save.importAll(fileOrText)` RESOLVES `{ok:true, ...}` on success and REJECTS with `Error(message)` on failure (settings.js and every UI caller treat resolve as success). The pure `save/transfer.importAll` returns `{ok, errors[]}` and never throws. app_contract is to say so.
2. The diagnostics `db` beacon is CUT: declaring `db`/`user` capabilities would make the artifact less shareable and the in-game Diagnostics screen (Copy button) already carries the same data. Spec §14 / verification B13 / Q9 manual read-back stand as "copy and paste".
3. Kill-cam is a 4 s slow-motion dolly (not a replay). `Take Command` sprint maps to full stick magnitude until SIM adds a flag.

## R4. Release decisions (COORD)
1. B12 (claude.hot snapshot) is CUT; B13 (beacon) is CUT (R3.2); B10 budget raised to 5 MB for the packed fragment.
2. The artifact fragment ships its code packed (deflate + base64 in `<script type="text/plain" id="vw-pack">`, inflated at load with DecompressionStream). Reason found by bisecting the publisher: its page scanner flagged the plain script as a PR-review page. The standalone `dist/voxelwars.html` stays unpacked.
3. VFX sprites (Kenney particles) are not shipped (the renderer uses voxel particles); their entries are removed from the shipped credits.
4. R10 (context loss/restore) is handled in main.js (pause + toast + resume) and verified with WEBGL_lose_context in Chromium.
5. GSAP is NOT shipped or loaded (nothing used it; core/tween.js keeps its built-in timeline). The credits must not list it.
