# plan.md v1: Medieval, Modern and Sci-Fi eras for VOXELWARS (COORD, 2026-10-08)

Inputs: `docs/eras/e.md` (what the user expects), `docs/eras/maps/01..08` (what the code is). This plan is written the way a studio lead with unlimited discipline would do it: lock what must not change, prove the pipeline with one unit of every kind, then scale volume behind automatic checks, measure balance instead of guessing, and attack our own work with hostile reviewers before the user does. Nothing in it is a demo, an MVP or a placeholder; where something might be cut, the cut ladder (section 12) says in what order and it is logged, never silent.

## 0. The ten non-negotiables

1. **The Ancient era does not change.** Ids frozen, stats frozen, layouts frozen, text frozen, sounds frozen, saves load. Proof, not belief: golden tests recorded BEFORE any engine edit (G1 to G6, section 3).
2. **One engine, data-driven eras.** An era is a pack (`src/content/era_<id>/`), registered, merged, filtered. No `if (era === ...)` in engine code. New mechanics are generic primitives (a weapon field, a status, a layer), reachable from data, tested in isolation, and costing nothing for defs that do not use them.
3. **Determinism is sacred.** 30 Hz sim, one seeded RNG. New mechanics draw randomness only from a second stream (`rng2`) and only for defs that carry new-era fields, so every Ancient battle replays byte for byte. `stateHash` is extended to cover the new state.
4. **Budgets are gates, not hopes.** 600 units on Marble <= 160 draw calls; 16 types per team; 48 parts per model; sim <= 2 ms/tick at 300 units (proposal: new systems together <= +0.5 ms); packed page <= 5 MB (or the change is logged with its reason); <= 500 published files; decoded audio per era-scoped warm <= tier ceiling.
5. **Every unit is complete or it does not ship.** Stat row, real model (never the fallback), every clip it can request registered with timing, projectile row (look + audio), audio profile, text (name, plural, blurb, lore, 3 deaths, 2 taunts, codex joke, moment barks), codex entry, balance row, place in a campaign, survival pool or Quick Battle faction. The contract check fails the gate otherwise.
6. **Fictional, toy-box, kind.** Invented realms and factions. No real nations, wars, extremists, slurs or stereotypes. Jokes punch at situations, hubris and the three commentators, never at people.
7. **Sound and animation come from the internet where they exist** (CC0 or CC BY, credited, trimmed, loudness-normalised), with a synth fallback for every cue. We say plainly what nobody listened to.
8. **Studio finish.** Each era has its own look (accent colour, diorama, map, title strip, loading lines, currency word, music). Nothing placeholder, every button works, console clean.
9. **Honest verification.** Two independent QA rounds by agents who did not build the thing; verification report gains era criteria and an "unverified" section (sound by ear, real GPU frame rate, hosted viewer run, non-Chromium browsers, human play of every mission).
10. **Process is evidence.** Every phase ends with a green gate (or a named, owned red), a commit, and an entry in `docs/eras/STATUS.md` so the work survives context loss.

## 1. Scope (numbers and floors; D4 refined)

| per era | target | floor (below this we stop and replan, we do not quietly ship less) |
|---|---|---|
| factions | 5 to 6 fictional | 5 |
| units | 32 | 28 (every campaign unit plus >= 4 per faction) |
| arenas (recipes) | 12 | 10 (9 campaign settings must differ by recipe, not only by seed) |
| props (era-specific, plus shared `any`) | 36 | 30 |
| campaign | 9 missions, 3 acts | 9 |
| puzzles | 6 | 6 |
| survival | 20 wave names + 5 bosses + pool | all |
| daily | era-scoped plan, same streak | all |
| workshop parts | 60 helms/weapons/armour/offhand/back parts | 45 |
| achievements | 12 era + 3 meta | 12 |
| tips | 30 | 24 |
| announcer | >= 150 era lines (generic categories reuse the neutral Ancient lines), 27 campaign lines | 120 |
| sfx rows | ~100 new (45 families) | 70 |
| music | 6 tracks (menu, battle low/mid/high, victory, defeat) | 4 |
| god powers | 6 era-themed (reskins of existing effects plus the era signature) | 4 |

Totals at target: ~96 new units, ~36 arenas, ~108 props, 27 missions, 18 puzzles, ~300 sfx rows, 18 music tracks. Ancient: 43 units, 16 arenas, 41 props, 9 missions, 6 puzzles, 374 sfx, 8 music.

## 2. Architecture decisions (from maps 01, 05, 06)

- **A1 Era registry.** New pure module `src/content/registry.js` + one `data.js` manifest per era. `era_ancient/data.js` re-exports the existing `stats.js`, `arenas.js`, `props/catalog.js`, `sim_text.js`, `lesson_text.js`, `wave_names.js`, `humor/units_text.js`: no Ancient file moves. Merged frozen tables (Ancient first, so key order is unchanged): `STAT_TABLE, FACTIONS, DEFAULTS, ARENAS, PROP_CATALOG, PROP_CATEGORIES, PROJECTILES, UNIT_TEXT, MATERIALS`; per-era tables: `SIM_BARKS_BY_ERA, LESSON_TEXT_BY_ERA, WAVES_BY_ERA, GOD_POWERS_BY_ERA`. `mergeKind` throws on any duplicate id (`era id collision: kind "id" in a and b`). Logic modules (campaign, survival, puzzles, daily, custom, announcer) hang off `era_<id>/pack.js` loaded through the generated registry. The sim swaps its 7 import specifiers to `registry.js`; `World` always receives MERGED defs (chicken and goat are global utility units); era scoping happens in pools, UI and mode data.
- **A2 Ids.** Never reuse or rename an Ancient id. Units, factions, arenas: unique names (collision throws). Props, parts, cues, achievements, abilities, missions, puzzles: era prefix (`med_`, `mod_`, `sf_`) whenever the noun already exists; shared generic props stay `any` (tree_oak, rock_big, crate, barrel, campfire...). `tests/content/ancient_ids.test.mjs` snapshots every Ancient id by kind. Tombstone kinds `part, faction, mission, era, projectile` added to `save/tombstones.js` before anyone could ever move an id.
- **A3 Save.** Additive only, no version bump: `progress.stars` stays a flat id map (ids are global), `progress.eras{id:{opened,last}}`, `progress.lastEra`, `survival.eras{id:{best,bestWave,board}}`, `daily` rows carry `era`; `stats.campaign` whitelist gains `completedEras`; `save/stats.js` and `migrate.js` take id sets from the registry (`ALL_MISSION_IDS`, `ALL_ARENA_IDS`). Mutator unlock thresholds stay 3..27 total stars across all eras (never re-lock an Ancient player). An old build reading new data ignores the extra keys. Customs are re-costed on load, so `roleEfficiency` and `K` are computed from the Ancient table only (frozen constants) and per-era cost fits are separate.
- **A4 Campaign factories.** `campaign.js` body becomes `createCampaign({id, raw, text, starTests, statTable, mutatorStars})`, same for puzzles; the union facade `content.campaignApi/puzzleApi` dispatches on mission or puzzle id (ids are global). `content.eras[]` carries `{id,name,accent,currency,acts,map,tagline,order}`; `content.campaign` follows the era chooser. `recordCampaign` and `missionLine` use the registry (they silently drop unknown ids today); next-mission lookup uses the mission's own era list. Router history stores `{id, params}` so Back keeps the era.
- **A5 Era in a battle.** `World({era})` selects the kit (barks, lessons, wave names, bosses, god powers, mascot); `arena.env.era` (optional, omitted when `ancient`) drives music and ambience; units carry `def.era` (stamped by `normalizeDef`).
- **A6 Packaging.** Everything is inline (CSP). `gen-registry` loops `src/content/era_*`. Shared kits (parts, beasts/common, quad1, hum_lite, props kit) are imported, not copied. Text is the volume risk: announcer per era reuses neutral categories and adds only era lines. Lazy text chunks are not possible, so the byte budget per module family is tracked in the build report (section 11).
- **A7 Tooling is era-parameterised.** `--era=<id>` on contracts, balance, modes, feasibility, perf, contact sheets; a tests helper `forEachEra()`; hard literals (43/41/16/24/9) in about 9 tests become per-era or `>=`.

## 3. Phase 0: safety nets (must be green BEFORE any engine edit)

| id | golden | how |
|---|---|---|
| G1 | Ancient sim identity | `tests/sim/ancient_golden.test.mjs`: 6 fixed battles (all 43 units over marathon, troy, colosseum, styx, giza, nile at fixed seeds), per-100-tick `stateHash` + final tally recorded now, asserted forever |
| G2 | Arena generation identity | `tests/gen.golden.test.mjs`: the 16 FNV hashes measured in map 05 (marathon 69180a92 ...) |
| G3 | Ancient ids | `tests/content/ancient_ids.test.mjs` per kind (units 43, factions 7, arenas 16, props 41, parts 254, missions 9, puzzles 6, achievements 24, mutators 9, abilities 27, projectile kinds 10, cues 116, sfx rows 374) |
| G4 | Text identity | hash of `UNIT_TEXT`, announcer template pool order, `SIM_BARKS` lists: any edit to an Ancient text file fails G4 and must be intentional |
| G5 | Save identity | fixtures: a v1 blob, a v2 blob and an export code from the shipped build load with identical stars, parts, soldiers, armies, arenas after the era refactor |
| G6 | Campaign/puzzle replay | `tests/campaign` fast tests stay green; the slow feasibility record (450 battles) is re-run once at the very end (sim fingerprint flips on any sim edit; the report says so) |

`rng2` rule: golden G1 proves no Ancient draw moved.

## 4. Mechanics plan (map 02; owner SIM agent, one at a time in `src/sim/**`)

Principle: each mechanic = data field(s) pre-declared in `defs.js TOP_KEYS/SUB` (hidden-class stability) + pure code guarded by "def uses it" + a unit test + a perf probe + view/audio hooks + an event in `core/events.js` (+ `LOG_FIELDS`) + a lesson/bark line. Order = by how many eras need it and how little they depend on others.

| mod | mechanic | primitive | eras | notes / numbers |
|---|---|---|---|---|
| M1 | **Damage vocabulary** | `AP`/`DAMAGE_TYPES` rows `bullet explosive energy` (+ NaN guard + contracts check); `armorFace {front,side,rear}`; `resist` per type | all | 1-damage floor and `eff` cap 0.9 stay; tank armour 0.9 + ap 0 = rifles bounce |
| M2 | **Weapons** | `ranged.burst/burstGap`, `mag/reload`, `suppress{r,amt}`, `hitscan`, `arc:'high'`, `homing{turn}`, `noLead/descentOnly/stick` (replace kind special cases), `muzzle[fwd,up,side]`, `clip`, `air/groundOnly`, `structDmg` | M, S | proj-kind table in the registry (radius, kb, stick, vis, clip, sfx, impact) |
| M3 | **Statuses** | append `SE.SUPPRESS, EMP, CLOAK, SHIELDDOWN`; `u.sup`, `u.sh`, `u.cloak`, `u.ammo`, `u.aim`, `u.layer` added to `Unit` ctor and `stateHash` | M, S | Float32 slots append-only |
| M4 | **Shields (energy)** | `eshield{cap,regen,delay}` absorbs in `applyDamage` before hp (not dots), `shield_break` event, still sets `lastDamageT` | S | ~20 ns/unit/tick |
| M5 | **Cloak, detection** | ability `cloak`; `pickTarget` skips cloaked beyond `detect`; attack breaks it; `_ai.detector` | S | render dither |
| M6 | **EMP, repair** | `cc_field effect:'emp'` (stun + zero shield on `machine`), `heal_pulse` tag filters (organic vs machine), `repair` | S, M | |
| M7 | **Layers and movement** | `def.layer ground|hover|air`; nav move classes (`clear` distance map, hover ignores water/lava depth, air = bounds); air skipped by `_separate` vs ground, excluded from melee targeting, flow fields per class; AA guarantee in `armygen`; air-only remnant retarget (S11/S12) | M, S, Med(dragon) | per-class field cost 0.37 ms/tick amortised; budget check |
| M8 | **Turrets** | `def.turret{rate,arc}` slews `u.aim`; firing gate uses `aim` | M, S | published for render |
| M9 | **Cover and LOS** | `Prop.lowCover`, `u.inCover`, damage x0.5; AI `cover` step; `lineOfFire` sample at attack start | M | 1 Map.get per hit |
| M10 | **Explosives and craters** | `makeCrater({lazy})` rebuilds only the rect, no `invalidateFields` storm; rate cap; own 2048 buffer for big `areaDamage`; `_tickEffects` buffer aliasing fix | M, S | measured 4.1 ms per crater tick unthrottled |
| M11 | **Mines and hazards** | hazard kinds `mine_*` (hidden, team-owned, armed delay, `hash.query` trigger), `lay_mine` ability; hazard sanitizer keeps `team/arm` or encodes in kind; editor palette | M | |
| M12 | **Props as structures** | `Prop.team`, `info.gate` (owner passes), non-aoe projectiles hurt props via `structDmg`, `explosive{r,dmg}` props, prop-death coalescing per tick, `world.editTerrain(rect)` for bridges | Med, M | defenders stop breaching their own gates |
| M13 | **Abilities as params** | `aura effect:'banner'`, `dash kind:'blink'|'lance'`, `dot_cloud gas|smoke`, `summon_on_death bailout`, `call_strike`, `poison.proj`; registry cap 32 -> 64 total (32 per pack) by spec amendment | all | one module + test per new id |
| M14 | **Objectives and mission scripting** | `capture` (N points), `defend_core`, `escort` (fixes `reachOnly` progress 0), destroy-by-tag; `addPlacements` keeps `vip/general`; script events `strike spawn prop weather beat` | all | campaign gaps 1, 2 |
| M15 | **Era kit** | `World({era})`: `SIM_BARKS_BY_ERA`, `LESSON_TEXT_BY_ERA` + new detectors (suppressed, cover, emp, air_strike, shield_break, charge), `WAVES_BY_ERA`, `GodPowers(w, list)` (era sets; orbital = meteor template), `intervention{kind,unit}` mascot, `env.gravity` (3 sites), `weatherMods` rows | all | G1 stays green |
| M16 | **Perf and termination** | `warmup` ROSTER includes new paths; `perf_sim --era` scenarios (tank column, heli swarm, MG line, mortar barrage, 600u Marble); termination fuzz S11/S12 per era; watchdog tuned | all | |

Perf contract: all new per-unit systems together <= +0.5 ms at 300 units, +0.8 ms at 500; measured with `perf_sim.mjs` before/after each module; Ancient scenario must stay within noise.

Criteria S1 to S27 stay; new `S28 to S45` are written in the spec (one per module) with tests.

## 5. Rigs, animation, models (map 03; owner ANIM + UNITS agents)

**New weapon styles** (`rifle pistol mg rocket xbow beam launcher` plus `sniper`): AIM rows, STYLE_K, READY_ELEVATION, `noClamp`, far-LOD rule (barrels >= 2x2 voxels).
**New hum1 clips** (new ids only, never retime existing ones): `shoot_rifle shoot_mg shoot_pistol shoot_rocket shoot_xbow shoot_beam reload idle_gun walk_gun jog_gun run_gun kneel_aim prone_aim crew_load crew_fire crew_aim throw_grenade cast_power` (~16); every plain id gets a `DEFAULT_META` row first (`tests/anim/clips.test.mjs` forces baked == design).
**New rigs** (each with a parts table in `docs/spec/rigs.md`, `PARTS+SETS` rows, 7 to 12 clips, roster test):
| rig | parts | clips | units |
|---|---|---|---|
| trebuchet1 | 9 (+ crew <= 3 x 10 = 39) | catapult1 set | trebuchet |
| ram1 | 6 | strike_ram + walk | battering ram, siege tower (static variant) |
| dragon1 | 18 to 20 | idle walk run fly strike_bite strike_claw breathe roar hit_front stagger death_back | dragon boss, wyvern |
| gun1 | 6 (+ crew) | catapult1 set | howitzer, AT gun, mortar, HMG, AA gun |
| tank1 | 12 (hull, turret, gun, treads as scrolling cleats) | idle walk run launch reload hit death | tank, APC variant, mech tank |
| car1 | 7 (4 `wheel*`) | trot-style drive | jeep, technical, truck |
| heli1 | 6 | hover bob, pitch, crash spin | helicopter, gunship, dropship |
| drone1 | 4 | hover bob, spin | drones |
| hover1 | 8 | hover bob/roll, pads glow | hover tank, bike |
| walker (hum1 x2.0 to 2.6 with a bespoke `mechs.js` part module; boss: `walker4` rigid-leg quadruped) | 16 / 14 | reuse hum1 clips | mechs |
| insect1 | 10 to 12 | tripod gait, bite, claw, deaths | alien swarm |
| quad1 alien species | 8 to 13 | +7 clips | alien hounds |
Engine support: `meta.driven[{part,axis,mode,k}]` (tread cleats, rotors, dishes), `extra.aim{yaw,pitch}` + `meta.aimParts`, `meta.crewTable`, `meta.hover` exemption, `meta.bounds` for cull and previews, fallback-model forbidden (contracts `--strict`).
**Model budgets**: infantry <= 7 K near tris; vehicles <= 22 K; siege <= 30 K; boss <= 55 K; parts <= 48 (crew budget (48 - rig)/10); team-tint >= 15% (>= 30% hum), planned from the first sketch (pennants, stripes, glow trim `F_TEAM`).
**Look-dev loop** for every model: contact sheet at 3 zoom levels + silhouette at 40 px, read by the builder, 2 iterations minimum, then read again by the era QA agent.

## 6. Rendering (map 04; owner RENDER agent)

R1 `PROJ_FX` data table (len, thick, colour, glow, stretch streak, spin, trail, muzzle, impact, sticky, shape) replaces the positional 10-row array; unknown kind fails the contract. R2 `StreakLayer` (beams, orbital columns, EMP rings) +1 draw. R3 `ShieldLayer` +1 draw. R4 `ShadowBlobs` +1 draw. R5 `HazardLayer` (mines, radiation, laser grids) +1 draw. R6 skin shader v2: `aFx2` lane (cloak, shield, heat, emp) via dither-discard (no alpha-to-coverage in r128), shared `uTime`, `F_PULSE/F_GLASS/F_HEAT` voxel flags. R7 `THEME_LOOK` (`looks.js`): sky bodies (two moons, Earth), atmosphere on/off, fog colour, neon horizon band, grade, clouds per theme, liquids table (acid, coolant, plasma, oil), emissive terrain, per-theme preview colours; default = today's constants so Ancient pixels do not change. R8 weather rows: ash, acid rain, spores, ion storm, smoke, fireflies. R9 events subscribed by the view: `projectile_launch` (muzzle flash), `fire_started`, `unit_spawn`, new sim events. R10 per-def `fxClass` (organic, armoured, machine, alien, shield) for hit sparks and gore. R11 cull radius from `meta.bounds`; camera follows `u.y`; `nearBudget` counted in triangles. R12 draw-call buy-back BEFORE content lands: terrain super-chunks beyond ~60 u (97 -> ~45), merged markers (24 -> ~3), so +5 new draws fit under 160; `perf_assert.mjs` per era enforces calls and triangles. R13 `fx.update(0)` per tick investigated (0.79 ms each at Marble cap).

## 7. World, props, arenas (map 05; owner WORLD + PROPS + EDITORS agents)

W1 `gencore.js` split (Gen exported, `registerRecipes`), `gen.js` stays the facade; G2 hashes protect it. W2 merged prop catalog with `era`, optional oriented-rect footprint `foot{w,d}` (buildings, walls, bridges; decision after the city prototype, unknown U2), `cover:'low'`, flags `tiny noShadow thin float spin` as data; prop model registry with per-spec `voxel` size (0.2 to 0.25 for buildings > 10 u, <= 100 K voxels). W3 materials appended at 16+ (about 36 new: asphalt, concrete, metal plate, regolith, alien grass, neon pad, ice, basalt, hull, cobble road, thatch ...) with `emissive`, `hazard` kinds beyond lava, working `foot`; `m[i]===7` lava literal replaced by `MATERIALS[m].hazard`. W4 env: `sky`, `gravity`, `era` whitelisted in `sanitizeEnv` + the two default literals; `WEATHERS` extended. W5 nav: move classes (M7). W6 editors: `era` chips (props, materials, templates, recipes, themes), `PROP_TYPES` and `PLACEABLE` from the merged registry, `LIMITS.propTypes` raised/derived, hazards/markers/objectives lists derived; Arena Builder gets era tabs (shared `any` records in every tab). W7 theme vocabulary unified (egypt/egyptian, punic/carthage mismatch fixed in the registry with aliases, no Ancient audio change). W8 readability rule: every recipe passes `tests/props/readability.test.mjs` (skyscrapers at the edges, <= 4 to 5 u in the corridor). W9 draw rule per recipe: <= 35 visible (type, variant) batches.

Era arena families (design phase picks the 12 each):
- Medieval: castle assault with moat and drawbridge, village green, forest ambush, mountain pass, river ford, abbey, tournament field, ruined fort, bog, coastal cliff, winter field, dragon's mountain.
- Modern: city blocks, bridge, airfield, trench line, harbour, desert outpost, forest compound, ruined suburb, rail yard, oil field, mountain base, dam.
- Sci-Fi: moon base, alien jungle, neon city, crashed ship, ice world, lava world, orbital station, hive cavern, desert dig site, asteroid field, reactor, jungle ruins.

## 8. Campaign, meta, UI, save (map 06; owner CAMPAIGN + UI agents)

C1 Factories and facade (A4). C2 `campaign_validate(m, {era})`, `OBJECTIVE_TYPES/MARKER_TYPES` extended (capture, defend_core, escort; markers: spawn, airstrike, objective). C3 `script.events` registry (`strike spawn prop weather beat`), `script_beat` event forwarded to announcer and camera hint. C4 generic tracker counters (casts, statuses, lostByRole, events) and star-test helpers. C5 roster enforcement in campaign (`armies.A.roster = m.roster || era units`), `core` auto-placed. C6 `mission.teachBeats` with sim-event triggers and `seen['teach_'+id]` (cover, suppression, shields, EMP, charge, banners). C7 era chooser screen (`eras.js`: four cards with accent, diorama, stars x/27, tagline, joke), title strip replaces the roadmap tablet, per-era map via `ERA_MAPS` (land polygons, zones, rivers, props, pins, views) with the `buildMapSvg(eraMap)` refactor (Medieval: a hand-drawn kingdom; Modern: a coastline with grid roads; Sci-Fi: a planetary system chart with nine stations), per-era acts names, `[data-era]` CSS accents. C8 currency per era (`fmtCost(ctx,n)` replaces "dr/drachmae" in 19 files): florins, credits, cr.. C9 per-era `uiBattle` strings through the existing `getTB` hook extended to campaign/briefing/results/survival/daily. C10 per-era achievements/medals, titles written on first clear, `tourist` per era. C11 Quick Battle: era chips filter factions, arenas, mutators; faction chips never mix eras unless Time Warp (stretch S1). Codex: era filter above faction tabs, `glossary.abilities` filled for all abilities. Workshop: era filter on parts, new weapon classes `rifle pistol beam launcher...` in `sim/stats.js` (cost model refit per class), unlock keys namespaced. C12 Survival/Daily/Puzzles take `eraId`; daily picks the era first from a separate stream so Ancient dates keep their plans (parity test over 400 dates).

## 9. Audio and music (map 07; owner AUDIO agent; starts on day 1 because network work is slow and CPU-free)

AU1 Hunt: per era ~45 families / ~100 rows from OpenGameArt, Kenney, Wikimedia Commons, incompetech under the existing licence gate (CC0, CC BY 3.0/4.0, PD; no SA, GPL, NC); firearm library (194 MB 7z), helicopter, tank engine, explosions, `kenney-digital-audio` (lasers, shields, teleports; on disk and unused), mech steps, alien roars; 18 music tracks (medieval: RandomMind, Kevin MacLeod unused picks; modern: Kevin MacLeod action picks; sci-fi: OGA CC0 cyberpunk and space tracks). AU2 Sprite packs (rows get `pack,start,dur`, one fetch + decode per pack, `AudioBuffer` slices) because 382 + ~300 files exceeds the 511-file version cap; test with a throwaway 500-file publish. AU3 `era` on ledger rows, `warm(groups, era)` + eviction (decoded PCM 63 MB now; 4 eras would be ~250 MB), `engine.setEra`, `rankTracks` era filter, per-era synth beds. AU4 Cue router tables: `PROJ_AUDIO`, `EXPLOSION_AUDIO` (size classes from `r`), `AUDIO_PROFILES[unitId|tag|role]` (species, hit, swing, shoot, death, voice, step, material) per era, `ABILITY_CUES` extended, handlers for new events (beam, suppressed, shield_hit/break, emp, cloak, blink, mine_trigger, reload, telegraph sirens), burst template for guns (cooldown 60 to 90 ms, 5 to 6 voices), vehicle foley bed. AU5 Fix `ui_select/ui_drop` dead cues; alias. AU6 `build.mjs`: slim runtime manifest, guard `files <= 500`, un-core the 1.2 MB battle track if the page budget needs it, <= 10 tiny core sfx per era. AU7 Credits: every new asset has a line; `mixtest.mjs` for loudness (-18 +/- 3 LUFS, true peak < -1 dBFS). AU8 Verification by ear is impossible here: the report says so.

## 10. Humour (all eras; owner COMEDY agent, rubric `docs/spec/humor.md`)

The running gag: Brutus, Plato and Cassandra have been "dragged through time" by Zeus's intern. **Medieval**: Brutus buys a tabard and shouts "HUZZAH" wrongly; Plato asks whether a feudal contract is a dialogue; Cassandra predicts the plague and is also, for once, right. **Modern**: Brutus gets a headset; Plato asks what a tank is *for*; Cassandra files a risk assessment on the helicopter that is already overhead. **Sci-Fi**: Brutus asks if lasers are just very loud javelins; Plato debates the soul of a robot that has none; Cassandra "predicted the robots; nobody listened, again". Each era: loading lines (20), tips (30), unit text (blurb <= 14 words, lore <= 35), mission briefings (3 to 5 lines, three voices), results lessons, wave names (20 + 5 bosses), kill verbs for the new causes (bullet, explosive, beam, emp, crush, orbital), achievement names, mutators' flavour, credit-roll jokes, taunts and deaths. Rules: specific beats generic; callbacks across eras; no real nations or conflicts; no stereotypes; the 30%-cut rubric pass; banned-words contract. Neutral announcer categories are reused verbatim; era packs add the rest (`createAnnouncer({era})` with a per-era `{templates, arenaNames, missionTitles, propNames, heroes, abilitySub, eventCases, categoryPriority}`, session memory kept across battles).

## 11. Verification plan (the part that makes it true)

V1 per-era contracts (`tools/contracts.mjs --era --strict`): every unit has a non-fallback model, all clips registered with `DEFAULT_META`, projectile row, audio profile, full text, balance row; every prop has a model; every recipe generates and passes readability; every cue has a synth recipe; every mission/puzzle validates; banned-word scan; id collision. V2 per-mechanic tests (>= 4 each: effect, cooldown/limits, AI use, event/telegraph, Ancient-path-unchanged) and `S28..S45`. V3 goldens G1 to G6 stay green at every commit. V4 balance harness `--era`: pairs, duels, comp, mirror (S22 45 to 55%), fuzz termination (S11 >= 99%, S12 median 60 to 120 s, p90 <= 180 s), counters table (pikes > knights > archers; armour > rifles > ...; AT > tanks; AA > helis; EMP > mechs; shields > chip damage; cloak > range) measured with 20-seed bots, campaign win-rate bands (counter 60-100, greedy 25-70, turtle 10-60, per-mission exceptions recorded with reason). V5 perf: `perf_sim --era` scenarios, `tools/perf_assert.mjs` (calls and triangles per era arena at 600 units), size report per module family in `build.mjs`, `files <= 500`. V6 `tools/modes.mjs --era`: every mission and puzzle of every era through the real build (deploy, army, run, end, stars, unlock, next), survival, daily, nav, camera, saved arenas, era chooser, Back keeps the era. V7 visual: contact sheets per unit, arena 3-camera screenshots per recipe, era map screenshots, title and chooser, reviewed by an agent that did not build them. V8 gate steps become era-scoped (`gate --era=medieval`) with a full gate at milestones; heavy jobs serialised by a lock file (4 CPUs). V9 two independent QA rounds (fresh agents, adversarial scripts, play every mission by bot and by clicking), fixes, then `docs/verification_report.md` extended (era criteria E1..E12 and an explicit unverified list). V10 simulate the user: open the hosted link flow by flow (title -> era chooser -> campaign -> briefing -> deploy -> win -> results -> next; Quick Battle; Workshop with a rifle soldier; Arena Builder with a moon prop; Survival; Daily; Credits) and write what they would say.

## 12. Cut ladder (only in this order; each cut is logged in `docs/eras/cuts.md` with what is lost and what would restore it)

1. Time Warp (S1) and extra mutators. 2. Units 32 -> 28 per era (non-campaign variants first). 3. Arenas 12 -> 10 (Quick-only first). 4. Props 36 -> 30. 5. Workshop parts 60 -> 45. 6. Music 6 -> 4 per era (menu and battle low/high/victory first kept). 7. Tips and announcer to floor. 8. Per-era god powers reskins instead of new effects (orbital strike stays). 9. Gate stays; QA rounds stay; honesty stays. NEVER cut: determinism, the Ancient goldens, the 9 missions and 6 puzzles per era, contracts, the unverified section, credits.

## 13. Orchestration (how this actually runs on 4 CPUs)

- **COORD (me)** owns: plan/spec/status, the registry glue, commits, publishing. I never edit `src/sim`; the SIM agent does (one at a time).
- **Workstreams** (agent roles with directory ownership): SIM, ANIM, UNITS (per era: -MED, -MOD, -SF), RENDER, WORLD, PROPS (per era), EDITORS, CAMPAIGN (per era), UI, AUDIO (+ asset hunter), COMEDY (per era), QA (two rounds, fresh agents), BALANCE. Cross-owner needs go in `docs/requests/<agent>_<topic>.md`. Hand-back format as `docs/AGENTS.md` (gate-based).
- **Concurrency**: a workflow runs 2 agents at a time; I run several workflows side by side but only ONE heavy job (gate, balance, modes, browser sheets) at a time via `flock /tmp/vw.heavy.lock`; light jobs (reading, writing text, node unit tests) run freely. Never more than 4 Chromium instances.
- **Phases and dependencies**
  - P0 safety nets (G1..G6) + design bibles (parallel) -> P1 foundation: registry/packs, sim M1..M3 + M15, world/gencore, audio ledger eras and packs, render R1 R6 R7 R12; tracer units (one per rig family, end to end) -> P2 Medieval complete (needs M12 M13 M14, dragon1/trebuchet1/ram1), in parallel with sim M4..M11 for later eras -> P3 Modern (M2 M7 M8 M9 M10 M11), P4 Sci-Fi (M4 M5 M6 M7 M14), era content streams overlap once their mechanics land -> P5 integration: chooser, maps, daily/survival, Time Warp stretch -> P6 balance runs per era (background, serialised), perf, size -> P7 QA round 1 + fixes -> P8 QA round 2 + fixes -> P9 report, release build, publish, user simulation, final message.
- **Tracer bullet rule**: before volume, one unit per new family (rifleman, tank, helicopter, drone, mech, alien, trebuchet, dragon, knight, power-armour, shield trooper, cloak assassin) goes through the whole pipeline (stat, model, clips, projectile row, audio profile, text, codex, balance duel, screenshot, hosted-style smoke). Defects found here are fixed in the pipeline, once.
- **Content factory**: each unit is a row in the era's `UNIT_SPEC` table (id, faction, role, stats, weapon, tags, abilities, rig/model recipe, audio profile, text); agents fill rows; contracts reject incomplete rows.
- **Status**: `docs/eras/STATUS.md` (phase, done, in flight, red items, decisions, measured numbers) is rewritten at every phase boundary; commits at every green gate; push each time.

## 14. Risks and the standing mitigation

| risk | mitigation |
|---|---|
| Ancient drift | G1..G6 first, `rng2`, frozen ids/text, review diff of any Ancient file |
| Volume hides defects (96 units) | contracts + tracer bullet + contact sheets read by agents |
| Sim perf | per-module probes, perf scenarios, budget +0.5 ms, cull by flags |
| Draw calls 159/160 | buy-back (R12) before content; `perf_assert` gate |
| Page size 3.1 -> 4.0-4.3 MB | per-family byte report, text reuse, un-core music, shared kits |
| 511-file cap | sprite packs, throwaway publish test |
| Decoded PCM ceiling | era-scoped warm + eviction |
| Termination and stall (air, cloak, shields) | AA guarantee, retarget rule, fuzz per era, watchdog |
| Comedy quality | rubric, cross-reads, cut 30%, no real-world targets |
| CPU starvation (4 CPUs) | heavy-job lock, 2-agent cap, era-scoped gates |
| Context loss | STATUS.md, handbacks in docs, commits each green gate |
| Taste/safety of modern and sci-fi war content | cartoon tone, fictional factions, no gore beyond the existing gore setting, review by COMEDY + QA |
| Tool drift (docs vs code) | code is truth; spec lists doc errors found in the maps |

## 15. Open decisions (to be closed by q.md rounds or the spec)

D8 oriented-rect footprints for buildings (prototype first). D9 air layer collision rules for flyers vs ground units and what AA guarantee armygen enforces. D10 per-era god powers: which of the 6 become new effects. D11 wall-walk archers (terrain ramparts, not breachable) vs breachable walls (props): per mission. D12 seated crews on vehicles (static `SEAT_REST`) vs standing crew. D13 whether the 5 MB budget moves to 6 MB if measured need (log it). D14 whether Quick Battle shows all four eras' arenas in one carousel with era chips or one era at a time. D15 mutators per era or shared. D16 how stars/medals aggregate on the title (x/108). D17 whether `core` audio is dropped from the music track.
