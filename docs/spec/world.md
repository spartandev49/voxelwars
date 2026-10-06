# spec/world.md — Arenas, props, hazards, weather, objectives, campaign, survival

## 1. Arenas
Data model and generators exist (`src/world/arena.js`, `gen.js`). Sizes: small 128 cells (64 u), medium 192 (96 u), large 256 (128 u). Presets (`content/era_ancient/arenas.js`): each = `{id, name, recipe, size, seed, blurb, tactics:[tags], theme, music mood, recommendedBudget}`; every preset must pass the **look gate** (screenshot from 3 cameras read by QA) and the **fairness gate**, which is defined once in spec §13 and verification S22 (n >= 400 mirror AI-vs-AI battles of equal armies per arena with sides swapped; the exempt asymmetric arenas and their wider band are listed there, not here); a failing arena has its zones/props re-balanced.

| id | name | tactical problem | notes |
|---|---|---|---|
| marathon | Marathon Plain | open field, rolling hills, olive trees | tutorial, reference arena |
| thermopylae | The Hot Gates | 8 u wide choke between cliffs, stone wall | chokepoint; spears and shields shine |
| colosseum | The Colosseum | oval sand arena, 90 voxel spectators who cheer, spikes trapdoor hazard, gates | crowd cheer reactions to kills; "arena of champions" |
| nile | Nile Delta | river with a single ford, palms, reeds | water slows, crossing is the fight |
| giza | Giza Plateau | dunes, pyramids as cover/obstacles, sphinx statue | sand slows 12% |
| persepolis | Persepolis Courtyard | marble courtyard with columns, throne | columns block arrows, destructible |
| carthage | Carthage Harbor | shoreline, docks, ships, crates | sea on one edge, wood props flammable |
| teutoburg | Teutoburg Forest | dense trees, fog, mud, tents | ambush cover; fog reduces ranged spread accuracy |
| alpine | Alpine Pass | snow, narrow pass, cliffs | snow -10% speed |
| olympus | Mount Olympus | marble plateau above the clouds, columns, temple, Zeus statue | Zeus lightning interventions; floating cloud islands |
| troy | Siege of Troy | wall with gate + towers on a raised plateau | destructible wall/towers, catapult use |
| styx | The River Styx | lava river, two bone bridges, geysers | lava deals 30 dps; units avoid lava; bridges = chokepoints |
| cyclops | Cyclops Isle | island, cave mouth, goats | campaign mission 8 |
| oasis | Oasis Duel | small lake, palm ring, dunes | quick duels |
| arenalab | Arena Lab | flat grass, blank | editor start |
| random | Random | seeded random pick of a recipe | seed shown, copy button |

**Zones**: `arena.zones.A/B` rectangles (x,z centre, w,d). Placement is only allowed inside the owning team's zone (sandbox option "free placement" removes that rule). Zones are flattened and never underwater (generator asserts).
**Nav grid** (`world/nav.js`, Dijkstra flow fields): 1 u cells; a cell is walkable if the height range over its 2x2 terrain block is <= 3 steps (1.5 u), it is not deep water (> 0.8 u), lava or a lava-lake, and no **hard** prop footprint covers it; stepping between neighbouring cells additionally needs a mean-height difference <= 1.0 u (so ramps work, cliffs block). Destructible blocking props (every `blocks:'full'` prop with finite `hp`: walls, gates, towers, tents, trees, crates, ships ...) are **soft**: solid for movement but passable for pathing at +30 cost, so armies route through breakable walls and attack them (`breach` behaviour) instead of freezing; indestructible props (`hp = Infinity`) are hard blockers. A footprint covers every cell within `radius + 0.35` of the prop centre. Shallow water (<= 0.8 u) is walkable at 60% speed. `cost` multiplies by material speed. Rebuilt incrementally for a dirty rectangle after craters/collapse/edit; flow fields invalidated for that region.
**Ground follow**: unit Y = `arena.cellHeight(x,z)` (top of the cube under it), rising at <= 12 u/s and dropping with gravity; cameras/FX use the smoothed `heightAt`.

## 2. Props (content/era_ancient/props/)
Two files per prop id: the **sim/editor record** in `props/catalog.js` (SIM) and the **model builder** in `props/models/*.js` (PROPS). Catalog record: `{cat:'nature|architecture|monuments|props', name, r (blocking radius, u, before scale), h (height for projectile cover and camera collision), hp (Infinity = indestructible), blocks:'full|none', cover:boolean (blocks projectiles), flam:boolean, place:boolean (false = not offered in the Builder), scale:[min,max]}`. `propInfo(type)` reads it; `PROP_CATEGORIES` lists the four editor categories. An arena prop instance is `{t, x, z, r (radians), s (scale), v (variant 0..3)}`.
Model builder: `buildProp(type, stage, variant, rng?) -> ModelDef` (one part, voxelSize 0.1, pivot at the ground centre of the footprint, front +Z). Stages: 0 intact -> 1 cracked (<= 60% hp) -> 2 collapsed rubble (half radius, no longer cover-blocks, spawns 30-80 debris cubes sampled from `debrisColors(type)`; `prop_destroyed` event; nav cells updated once); indestructible props return the intact model for every stage. Props are drawn with instanced meshes per (id, stage, variant) (static, merged into chunk-sized batches for >200 instances).
**Catalog: 41 entries** (ids used by recipes and the Builder): `tree_oak, tree_olive, tree_cypress, tree_pine, tree_dead, palm, bush, rock_small, rock_big, wheat, reeds, cactus, bones, skull_pile, log, crate, barrel, tent, torch, banner_post, fire_pit, campfire, goat_pen, column_marble, column_broken, ruin_wall, wall_stone, tower, arch_gate, gate_door, pyramid, obelisk, sphinx_statue, throne, statue_lion, statue_zeus, temple, ship, crowd, cloud_island, cave_mouth`. `gate_door` (wooden gate leaf, r 2.2, hp 700, flammable, blocks, cover) is the destructible part of a gate: the Troy recipe places two of them (z = +-2.0) under one `arch_gate` (the `destroy gate_door x2` objective); `crowd` (spectators) has `place:false`, so the Builder offers 40 placeable types; the per-arena limit of 41 prop types (spec §2) is the whole catalog.
HP (from the catalog): wall_stone 600, tower 900, arch_gate 700, gate_door 700, column_marble 250, column_broken 150, ruin_wall 300, statue_lion 400, ship 300, tent 120, log 80, crate/barrel 30, torch 20, trees 70-120 (oak 120, olive 110, pine 110, cypress 100, palm 90, dead 70; all flammable), cactus 40, bush 30, wheat/reeds 10; rocks, pyramid, obelisk, sphinx, throne, statue_zeus, temple, cave_mouth, cloud_island, crowd, bones, skull_pile, fire_pit, campfire are indestructible. Torches/fires emit light + particles (GLOW voxels).
Crowd spectators (colosseum): 90 non-colliding voxel people playing `cheer`/`gasp` clips triggered by `unit_kill` and `crowd_roar` rate-limited events.

## 3. Hazards
`quicksand` (slows to 40%, units sink and drown after 4 s inside), `spikes` (15 dps pop-up cycle 3 s, visible telegraph), `fire` (burn 4 dps 3 s on contact; spreads to flammable props/units via grass at 15%/s), `boulders` (a rolling boulder every 12 s along a lane with a telegraph, 60 dmg aoe, knocks aside), `geyser` (every 8 s: 1 s rumble telegraph then launch +4 u, 20 dmg), `lava` (30 dps, 100% avoid). AI avoids hazards (nav cost x8) unless routed.

## 4. Weather and time (env)
Weather: `clear, cloudy, rain, storm, snow, sandstorm, fog`. Real modifiers (each visible and tested): rain extinguishes fire (burn duration halved, fire damage x0.5, fire arrows disabled); snow -10% speed; sandstorm ranged spread x1.5 (+ reduced fog distance); storm = rain + random lightning (decorative unless Zeus intervenes; flash limited); fog = reduced view/ambience only; cloudy = no change. Time of day 0-24 drives light rig, torches glow after 18:00, stars at night.

## 5. Objectives (sim/objectives.js)
| id | rule |
|---|---|
| eliminate | destroy all enemy units (default) |
| kill_general | enemy hero/officer unit flagged `general`; win when dead; the general avoids contact (ai guard) |
| hold_hill | keep >= 1 allied unit inside zone circle (r 6) at the control point and no enemy inside for T seconds cumulative; capture meter UI |
| protect_vip | VIP (battle goat or a hero) must survive T seconds (or reach an exit marker); lose if it dies |
| survive_waves | survive N waves; waves spawn on the enemy zone edge with escalating compositions |
| destroy | destroy listed props (gate_door, catapults, tower) |
| timeout | all objectives have an optional time limit (lose or draw at timeout, per mission) |
Objective HUD: tracker top-centre with progress; `objective_update` events; announcer hooks.
**Markers** (`arena.markers`, <= 8, spec §8 and §2): `hill` {r 6 default} for `hold_hill`, `vip_start` + `exit` for `protect_vip` (win by reaching the exit marker or surviving T s), `general_spawn` for `kill_general` (where the flagged general starts), `waypoint` for scripted marches. The nine hand-written campaign missions carry their markers in the mission def (§6); custom arenas get theirs from the Builder's **Markers tool** (editors.md §1, tool 16), and Quick Battle's **Objective picker** (§8) offers only the objectives whose markers or props the arena actually contains.

## 6. Campaign — "The Ancient Era" (9 missions, 3 acts)
Mission def: `{id, act, title, blurb(HUMOR), briefing:[lines(HUMOR)], arena:{recipe,size,seed,env overrides,markers:[{id,type:'hill|exit|vip_start|general_spawn|waypoint',x,z,r}]}, playerFaction(s), roster: allowed UnitDef ids, budget, units: target unit counts per side (shown on the briefing), par (budget threshold for the 3rd star), enemy: {faction|list, budget, style, difficulty, special}, objective:{type, params, markerIds}, timeLimit, stars:[{id,text,test}], rewards:{title, unlockParts:[...], unlockMutators:[...], codex:[...]}, bots:{greedy,counter,turtle}}`. `markers` exist for the nine hand-written missions (below) and, for custom arenas, through the Builder's Markers tool plus the Quick Battle objective picker (§8). **Budgets below are 5x the original design numbers so a mission fields 30-130 units per side** (spec §2 economy). Mission 1 has scripted teaching beats (place a spear line, fight, use a god power, see a counter pay off) with a skip button. Progress is saved; missions unlock in order; replayable. Stars: ★1 win; ★2 win with >= 50% of the army (by cost) alive; ★3 mission-specific (under par budget, under time, no hero losses, no friendly fire, win via objective in time...). The three stars reward different strategies.
| # | act | id | title | arena | player | enemy | objective | ★3 |
|---|---|---|---|---|---|---|---|---|
| 1 | I Dawn of Bronze | marathon_sort_of | Marathon (Sort Of) | marathon | Hellenes 3,000 (~30): hoplite,cretan_archer,peltast | Persians 2,800 normal | eliminate | win under 2,250 spent |
| 2 | I | thermopylae_snack | The 300 Slightly Overweight Spartans | thermopylae | Hellenes 6,000 (~45): spartan,hoplite,philosopher... | Persian waves 4x (total 9,000) | hold_hill 120 s | lose no spartan |
| 3 | I | pyramid_scheme | Pyramid Scheme | giza | Romans 7,500 | Egyptians 7,500 incl. pharaoh (general) | kill_general | kill pharaoh before 90 s |
| 4 | II Empires | nile_crossing | Goat Across the Nile | nile | Egyptians 6,500 + VIP goat (player team) | Barbarians 6,500 | protect_vip 100 s (goat reaches the exit marker) | goat takes no damage |
| 5 | II | alps_elephant | Hannibal Ante Portas | alpine | Carthage 11,000 (elephants!) | Romans 11,000 | eliminate | win with >= 1 elephant alive |
| 6 | II | teutoburg_peekaboo | Teutoburg Hide and Seek | teutoburg | Barbarians 7,500 | Romans 11,000 (marching column) | kill_general (centurion) | win in 75 s |
| 7 | III Mythology Class | troy_giftshop | Siege of Troy (Gift Shop Not Included) | troy | Hellenes 10,000 incl. trojan_horse | Trojan defenders 9,000 | destroy gate_door x2 + eliminate | gate down before 100 s |
| 8 | III | cyclops_meet | Cyclops Isle Meet-and-Greet | cyclops | Hellenes 8,000 | Cyclops boss + goats | kill_general (cyclops) | no friendly fire |
| 9 | III | zeus_bad_day | Zeus Has a Bad Day | olympus | mixed any 15,000 | mythic waves x4 + Zeus lightning hazard | survive_waves 4 | survive without losing a hero |
Rewards: titles (`Marathoner`, `Hot Gater`, `Pyramid Schemer`, `Goat Herder`, `Alps Alpinist`, `Forest Phantom`, `Gift Shop Manager`, `Cyclops Whisperer`, `Zeus' Therapist`) and Workshop cosmetic unlocks (silly parts: colander helm, traffic cone helm, cooking pot helm, straw hat, fish, rubber chicken, baguette, frying pan, scroll of doom, olive branch, foam finger, wings) — sandbox keeps all combat units unlocked. Unlocks use the keys of `parts/_registry.js UNLOCKS`: `silly_helms` is granted by mission 3, `silly_weapons` by mission 5, `wings` by finishing mission 9; every silly part declares `unlock: {key, hint}` against one of them (editors.md §2) and a mission's `rewards.unlockParts` lists those keys. Mutators unlock on total campaign stars (each entry of `ctx.content.mutators` has a `stars` threshold, ui.md §4a.5); a mission's `rewards.unlockMutators` names the ones its results announce when that clear carries the total across their threshold.
Verification per mission: scripted bots `greedy` (spend max, random squads), `counter` (counter-pick), `turtle` (hold position) over 40 seeds each on normal difficulty must land in **win-rate bands**: greedy 25-75%, counter 50-90%, turtle 10-60% (so it is neither trivial nor impossible, and the counter-pick pays off); recorded in `docs/verification_report.md`. Mutators are unlocked by stars (see spec §14).

### 6a. Puzzle Challenges (6, data-only; UI in ui.md §4a)
A puzzle is a mission def (§6) with a fixed enemy and a small budget: `{id, kind:'puzzle', title, blurb(HUMOR), hint(HUMOR), arena:{recipe,size,seed,markers}, player:{faction|mixed, roster:[defIds], budget}, enemy:{placements:[{defId,x,z,heading,order}]}, goal:{type,params}, timeLimit, par, stars:[{id,text,test}], godPowers:bool}`. The enemy is hand-placed (no generator), the roster is restricted, there are no mutators, retries are free and the battle is deterministic for the same placement. Stars: ★1 win; ★2 win while spending <= `par`; ★3 the puzzle's own bonus. Data lives in `content/era_ancient/puzzles.js` (CAMPAIGN); text in `humor/` (HUMOR). The initial six, each teaching one counter-pick:
| id | title | arena | player roster / budget (par) | enemy | goal | ★3 |
|---|---|---|---|---|---|---|
| spear_wall | Please Hold Still | marathon | hoplite, peltast / 1,400 (1,000) | 10 companion_cavalry charging | eliminate | lose <= 2 units |
| kiting_101 | Kiting for Beginners | oasis | cretan_archer, peltast / 1,200 (900) | 8 mummy (speed 1.9, slower than every archer) | eliminate | lose no unit |
| elephant_room | The Elephant in the Room | marathon | hoplite, peltast, nubian_archer / 2,000 (1,600) | war_elephant + 6 hoplite | eliminate | elephant dead within 45 s |
| knock_knock | Knock Knock | troy | catapult, hoplite, peltast / 1,500 (1,200) | 8 hoplite behind the gate | destroy gate_door x2, 120 s | gate down before 70 s |
| goat_logistics | Goat Logistics | nile | hoplite, peltast, cretan_archer + a free VIP battle_goat on the player team / 1,000 (700) | 8 axe_thrower + 4 berserker | protect_vip: goat reaches the exit marker | goat takes no damage |
| gaze_avoidance | Do Not Look Directly | oasis | cretan_archer, peltast, companion_cavalry / 1,100 (800) | medusa (general) + 5 immortal | kill_general (medusa) | no unit turned to stone |
Budgets and pars are on the same drachma scale as the campaign (§6) and are tuned by `tools/balance.mjs`; the six ids and their goal types are frozen.

## 7. Survival
Start budget 6,000, one arena (player picks), waves every 40 s or when the field is clear. Wave n: enemy budget `2,400 + 900*n`, style rotates (balanced, rush, ranged, elite, chaos, counter), every 5th wave a boss (minotaur, cyclops, war_elephant, medusa, pharaoh). Between waves the player gets `+1,600 + 240*n` budget to place reinforcements inside the zone (intermission screen; battle paused). Score = waves*1000 + kills*10 + remaining cost; local top-5 table. Funny wave names ("Wave 3: The Tax Collectors", "Wave 7: Mildly Annoyed Titans"). Defeat = all player units dead.

## 8. Rules options (setup screen; every one has a tooltip and a sensible default)
The setup tablet (Quick Battle; the same fields, partly locked, inside Survival setup, Daily and the campaign briefing) edits **the Rules table of spec §8.4 and nothing else**; this section only says how each field is labelled and which values the UI offers. UI field -> Rules key (default in bold):
| setup field | Rules key | values the UI offers |
|---|---|---|
| Army budget | `budget` (+ read-only `cap`) | Skirmish 3,000 / **Battle 8,000** / War 20,000 / Epic 40,000 / Custom 500-40,000 (step 500). `cap` is the unit cap per team from the graphics tier (spec §2) and is shown as a note ("Marble caps each side at 300 units"), never edited here |
| Difficulty | `difficulty` | easy "Peasant Mode" / **normal "Citizen"** / hard "Consul" (by behaviour only) |
| Friendly fire | `friendlyFire` | **off** / on |
| Morale | `morale` | **on** / off |
| Starting speed | `speed` | 0.25 / 0.5 / **1** / 2 / 4 (changeable in battle) |
| Time limit | `timeLimit` | None / 3 min / 5 min = `0` / `180` / `300` seconds (spec §8.4: 0 = none; the default of an untouched Rules table is 360). A battle that reaches the limit is decided by remaining cost (`reason 'time'`); the stalemate watchdog (spec §8.1) still ends stuck battles whatever the limit |
| Objective | `objective` | **Eliminate** / Kill the general / Hold the hill / Protect the VIP / Destroy the gates. The **objective picker** lists only objectives the chosen arena supports (§5: markers `general_spawn`, `hill`, `vip_start`+`exit`, or at least one `gate_door`); unsupported ones are disabled with the reason as tooltip. `survive_waves` belongs to Survival, not to this picker |
| God powers | `godPowers` | **on** / off |
| Gore style | `gore` | **Classic red** / Wine / Confetti / Off |
| Corpses | `corpses` | **Stay** / Fade / "Pretend they're napping" (none); the legacy boolean `deathCorpses` of spec §8.4 is derived from it (`corpses !== 'none'`) |
| Starting formation | `startFormation` | **block** / line / phalanx / wedge / column / skirmish / circle / hollow (`sim/formations.js FORMATIONS`) |
| Weather, time of day | `weather`, `time` | arena default / clear, cloudy, rain, storm, snow, sandstorm, fog; time 0-24 h (null = arena default) |
| Mutators | `mutators[]` | chips of unlocked mutator ids (ui.md §4a; none in campaign missions and puzzles) |
| Free placement | `freePlacement` | **off** / on (removes the zone restriction; app-side) |
| Mirror placement | `mirror` | **off** / on (whatever one side places appears mirrored for the other; app-side) |
| Music mood | `mood` | **Match the arena (`auto`)** / menu / battle / comedy (app-side) |
"Fog of war" was cut. `noKite` is a test-harness key and never appears in the UI or in share codes.
