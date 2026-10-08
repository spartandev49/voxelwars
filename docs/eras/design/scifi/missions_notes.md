# Sci-Fi campaign data: every derived and amended item of `missions.json`

Owner: CAMPAIGN-SF (conversion of `missions_outline.md`, `puzzles.md`, `arenas.md`, `rosters.md`, `first_three_minutes.md` into the MS schema). Generated together with `missions.json` and `context.json` (`node tools/ms_context.mjs --era=scifi --write`). Pointers are RFC 6901 JSON pointers into `docs/eras/design/scifi/missions.json`; mission index 0..8, puzzle index 0..5.

## 0. How the marks are carried

The task asked for a `"_derived": true` key and an `"_amend"` field inside the JSON. `docs/eras/spec/ms.schema.json` is closed (`additionalProperties: false` on every object) and `tools/ms_lint.mjs` has no rule that strips `_` keys: a `_derived` key anywhere is rule MS-S01 "unknown property" (re-proved on the Sci-Fi file by mutation: `/missions/0/enemy/groups/0/_derived` -> 1 error). The lint passing has priority, so **the marks live in this file, keyed by JSON pointer**, and the only in-schema carrier is the optional mission field `designAmendment` (<= 160 characters, tag `SF-AM-n`), set on the nine missions whose data carries an amendment of section 4. Puzzles have no `designAmendment` field (closed `puzzle` object): their amendments are tagged here only (SF-DA-10 to SF-DA-13). Proposed schema fix (owner DESIGN-CAMPAIGN): allow an optional `x-derived: [pointer]` array on the file wrapper, or let the lint ignore keys that start with `_`.

Counts at generation time: **37 derived markers (x, z, r), 31 enemy groups with a derived position, id or offset, 73 derived puzzle placements, 28 derived beat triggers, 9 blind variants, 9 derived `objective.text` and 9 derived `text.blurb`, 6 x 4 derived puzzle texts, and the 22 amendments SF-DA-01 to SF-DA-22 of section 4**; each is listed below. The mission tags `SF-AM-n` of the `designAmendment` field map to the amendments as: SF-AM-1 = SF-DA-01 (+02), SF-AM-2 = SF-DA-03 and 04, SF-AM-3 = SF-DA-03 and 04, SF-AM-4 = SF-DA-05, SF-AM-5 = SF-DA-07, SF-AM-6 = SF-DA-17, SF-AM-7 = SF-DA-05, SF-AM-8 = SF-DA-06, SF-AM-9 = SF-DA-08.

## 1. What was verified

* `node tools/ms_lint.mjs --era=scifi` -> **0 errors, 10 warnings (5 MS-R14 pending weather names, 5 MS-B11 blind-swap cost), 1 info (MS-V01: untaught rule inactive, `stats.js` absent)**, exit 0. `--era=all`: Ancient 0/0/0, Medieval 0/0/1, Modern 0/3/2, Sci-Fi 0/10/1. `node tools/ms_context.mjs --era=scifi --check` -> current. `node tests/campaign/ms.test.mjs` -> 175/175.
* **Verbatim check.** Every briefing line, victory, defeat, star line, rules line, beat text, beat hint and announcer line of `missions.json` is extracted from `missions_outline.md` by a script (`[B] "..."` patterns) and re-searched in `missions_outline.md` + `first_three_minutes.md` + `puzzles.md`; the only strings not found verbatim are the derived ones of section 3.7 (and the blocked-power reason, which is verbatim from `god_powers.md` section 2).
* **Cost audit.** The enemy cost of every mission (placed groups + wave groups, `repeat` expanded) equals the outline: 1,600 / 2,950 / 5,430 / 3,460 / 4,610 / 7,270 / 7,860 / 10,500 / 11,000 (+ 2,475 brood in M9), ratios 0.53 / 0.66 / 0.78 / 0.82 / 0.77 / 0.81 / 0.98 / 1.05 / 0.96. Reference armies cost 2,980 / 4,110 / 6,200 / 4,060 / 5,810 / 8,260 / 7,830 / 8,740 / 12,060 (99.3 / 91.3 / 88.6 / 96.7 / 96.8 / 91.8 / 97.9 / 87.4 / 86.1 percent of budget).
* **Outline numbers** (budget, par, timeLimit, attempts, hard and soft modules, star-3 helper and args) match for all nine missions without `designAmendment` doing any work (no MS-I06 warning).

## 2. Coordinate frame and zone arithmetic (applies to every derived position)

Play units, arena centred on the origin, **player zone at -x, enemy zone at +x**, south = -z, north = +z. Marker bound |x|,|z| <= 32 / 48 / 64 (small / medium / large, MS-A01). Zones (arenas.md section 1): small 40 u gap (zones 10 u deep, centres +-25), medium 56 u (14 u, +-35), large 80 u (16 u, +-48); lateral extent 0.7 W = 44.8 / 67.2 / 89.6. `zoneSpot(zone, enemyZone, u, v)` (`src/content/era_ancient/campaign_run.js:64`, margin 0.9) gives for the enemy zone `x = cx - (depth/2 - 0.9) + u * (depth - 1.8)` (+ the group `dx`) and `z = v * (width/2 - 0.9)` (+ `dz`): medium `x = 28.9 + 12.2 u`, `z = 32.7 v`; large `x = 40.9 + 14.2 u`, `z = 43.9 v`. `u = 0` is the front edge, `u = 1` the back margin. The generated arenas do not exist yet (no `sf_*` recipe is in `src/world`), so **every marker coordinate is a provisional value derived from the arena description of `arenas.md` section 2**; `W-D23` wants missions to read named recipe anchors instead: when the recipes land, the coordinates below are replaced by the recipe anchors with the same ids (open item OI-SF-1).

## 3. Derived items

### 3.1 Markers (37: ids, types and the role are the outline's; type changes are amendments A1/A2 of spec/MS; x, z, r are derived)

| pointer | id | type | x | z | r | basis |
| --- | --- | --- | --- | --- | --- | --- |
| `/missions/0/arena/markers/0` | `dome_panel` | waypoint | 30 | 24 | 3 | enemy-side flank dome (arenas.md 2.1: each flank dome carries a sf_dome_panel); medium enemy zone is x 28..42, the dome sits at its north flank, off the central 12 u lane |
| `/missions/0/arena/markers/1` | `crater_ring` | waypoint | -18 | 0 | 4 | arenas.md 2.1: craters ring the centre at 18 u; the point on the player side, where a popped unit rests out of the line of fire |
| `/missions/0/arena/markers/2` | `airlock_lane` | waypoint | 0 | 0 | 6 | the 12 u central lane between the two airlock doors, centred on the arena origin; r 6 = half the lane width |
| `/missions/1/arena/markers/0` | `islet_w` | capture | -9 | 0 | 4 | arenas.md 2.2: lake 26 u across (x -13..13), three islets in a row, w = near; pitch 9 u, r 4 |
| `/missions/1/arena/markers/1` | `islet_c` | capture | 0 | 0 | 4 | the middle islet, ringed by the three geyser vents |
| `/missions/1/arena/markers/2` | `islet_e` | capture | 9 | 0 | 4 | the far, hover-only islet (no road reaches it) |
| `/missions/1/arena/markers/3` | `lake_mid` | waypoint | 0 | 8 | 3 | lake centre, 8 u off the islet row; the outline lists it as the shot anchor although the shipped shot follows the first Dustpan |
| `/missions/1/arena/markers/4` | `causeway` | waypoint | 0 | -23 | 3 | the 6 u dry road along the south edge (south = -z): centre line z -23 (z -26..-20) |
| `/missions/2/arena/markers/0` | `core` | waypoint | 0 | 0 | 4 | arena origin: the reactor core stands in the centre (arenas.md 2.3) |
| `/missions/2/arena/markers/1` | `pylon_n` | waypoint | 6 | 10.4 | 3 | north-east vertex of the same triangle (6, 10.4) |
| `/missions/2/arena/markers/2` | `pylon_s` | waypoint | 6 | -10.4 | 3 | south-east vertex of the same triangle (6, -10.4) |
| `/missions/2/arena/markers/3` | `pylon_w` | waypoint | -12 | 0 | 3 | equilateral triangle of circumradius 12 u round the core (arenas.md 2.3: pylons at 12 u); the outline names the vertices n / s / w, the west one faces the player |
| `/missions/2/arena/markers/4` | `rex_bay` | waypoint | 44 | 0 | 5 | blast door at the enemy-side lane end; boss placed >= 12 u behind the front edge (28 + 12 = 40) in a >= 10 u boss lane |
| `/missions/3/arena/markers/0` | `envoy_start` | vip_start | -38 | 0 | 3 | escape pod on the sand end, inside the player zone (x -42..-28) |
| `/missions/3/arena/markers/1` | `pod_exit` | exit | 44 | 0 | 4 | beyond the far half of the hull, past the enemy zone front edge (28) |
| `/missions/3/arena/markers/2` | `ridge` | waypoint | 42 | 18 | 5 | wreck ridge of the Signers: >= 14 u behind the front edge (28 + 14 = 42), north flank |
| `/missions/3/arena/markers/3` | `dark_lane` | waypoint | 14 | -6 | 3 | the 4 u foot lane through the hull maze (the maze is x >= 8); camera anchor |
| `/missions/4/arena/markers/0` | `help_desk` | hill | 0 | 0 | 6 | atrium centre: the 1.5 u terrace with the fountain pond (arenas.md 2.5); r 6 = the 12 u terrace |
| `/missions/4/arena/markers/1` | `atrium_cam` | waypoint | 0 | 12 | 3 | camera anchor beside the terrace |
| `/missions/5/arena/markers/0` | `plaza` | general_spawn | 52 | 0 | 6 | plaza end of the boulevard; large enemy zone is x 40..56, boss >= 12 u behind the front edge (40 + 12 = 52) |
| `/missions/5/arena/markers/1` | `sign_stack` | waypoint | 44 | 0 | 6 | the three-billboard stack in front of the plaza: 8 u toward the player from the plaza |
| `/missions/5/arena/markers/2` | `boulevard_cam` | waypoint | 0 | 0 | 4 | camera anchor on the boulevard centre |
| `/missions/6/arena/markers/0` | `heart` | core | -12 | 0 | 4 | near (west) bank; the river is 8 u wide along z (x -4..4, arenas.md 2.7); acid_spitter range is 26 (rosters.md), so the Heart sits 24 u from the far-bank battery and is shelled from the start |
| `/missions/6/arena/markers/1` | `ford` | waypoint | 0 | 40 | 5 | the shallow crossing 40 u upstream (north, +z) of the Heart line |
| `/missions/6/arena/markers/2` | `far_bank` | waypoint | 12 | 0 | 6 | the spitter battery on the far bank, 24 u from the Heart (inside the 26 u acid_spitter range) |
| `/missions/6/arena/markers/3` | `hill_root` | waypoint | -20 | 10 | 4 | beside the Heart, where the Hummock rises (outline: "at the Heart's lowest point") |
| `/missions/6/arena/markers/4` | `grove_cam` | waypoint | -6 | -6 | 3 | camera anchor in the grove |
| `/missions/7/arena/markers/0` | `dais` | waypoint | 40 | 0 | 6 | the queen's dais end where the Manta enters; medium enemy zone x 28..42 |
| `/missions/7/arena/markers/1` | `pit` | waypoint | 0 | 0 | 4 | the sinkhole at the arena centre (camera anchor at its foot) |
| `/missions/7/arena/markers/2` | `spire_w` | waypoint | -12 | 12 | 3 | arenas.md 2.8: mirrored symmetry (sym mx) puts a spire either side: (-12, 12) |
| `/missions/7/arena/markers/3` | `spire_e` | waypoint | 12 | 12 | 3 | mirror of spire_w: (12, 12) |
| `/missions/7/arena/markers/4` | `front_choke` | waypoint | -18 | 0 | 3 | the first 6 u chokepoint, on the player side of the middle cavern |
| `/missions/8/arena/markers/0` | `queen_dais` | general_spawn | 40 | 0 | 6 | the dais end of the station (arenas.md 2.9); inside the enemy zone, boss >= 12 u behind the front edge |
| `/missions/8/arena/markers/1` | `window` | waypoint | 46 | 0 | 6 | centre of the line of five sf_force_gate props at the dais end; |x| <= 48 keeps it inside the arena |
| `/missions/8/arena/markers/2` | `hall` | waypoint | 0 | 0 | 10 | the 24 u central cargo hall (r 10) |
| `/missions/8/arena/markers/3` | `brood_gate` | waypoint | 30 | 24 | 4 | north-east lane mouth between hall and rim where the brood pulses tumble in |
| `/missions/8/arena/markers/4` | `station_cam` | waypoint | 0 | 46 | 4 | outside the hull at the north rim (camera anchor) |

### 3.2 Enemy groups with a derived position, id, offset or formation

| pointer | group | at (as authored) | resolved x, z | basis |
| --- | --- | --- | --- | --- |
| `/missions/0/enemy/groups/0` | rivet_gunner x4 | `{"u":0,"v":0}` | 28.9, 0 | outline "two ranks at the zone front edge": 8 gunners split into two ranks of 4 (a `line` formation each), rank 1 at the front edge (u 0), rank 2 one rank behind (u 0.15 = 1.8 u) |
| `/missions/0/enemy/groups/1` | rivet_gunner x4 | `{"u":0.15,"v":0}` | 30.73, 0 | second rank of the above |
| `/missions/1/enemy/groups/0` | rivet_gunner x6 | `{"marker":"islet_w"}` | -9, 0 | outline "the south shore and islet_w": 6 of the 12 garrison islet_w (SF-DA-03) |
| `/missions/1/enemy/groups/1` | rivet_gunner x6 | `{"u":0,"v":-0.75}` | 28.9, -24.52 | the other 6 on the far-side south shore: front edge, 3/4 of the way to the south end (v -0.75 -> z -24.5), beside the causeway end |
| `/missions/1/enemy/groups/2` | wrench_runner x6 | `{"u":0.5,"v":0}` | 35, 0 | outline "behind the line": middle of the zone depth |
| `/missions/1/enemy/groups/3` | junk_buggy x3 | `{"u":0.2,"v":0.9}` | 31.34, 29.43 | outline "the north shore, a long way round": north end of the zone (v 0.9) |
| `/missions/1/enemy/groups/4` | salvo_cart x2 | `{"u":1,"v":0}` dx 1.1 | 42.2, 0 | outline "placed >= 14 u behind the front edge": u 1 plus `dx` 1.1 puts them on the back edge, x 42.2 (28 + 14.2) (SF-DA-04) |
| `/missions/2/enemy/groups/0` | rivet_gunner x5 | `{"marker":"pylon_w","dx":3,"dz":-2}` | -9, -2 | outline "around the pylons, order hold": 5 / 5 / 4 gunners split over the three pylons; the west pylon group stands on the lee side of the pylon (dx +3) |
| `/missions/2/enemy/groups/1` | rivet_gunner x5 | `{"marker":"pylon_n","dx":2,"dz":2}` | 8, 12.4 | north-east pylon |
| `/missions/2/enemy/groups/2` | rivet_gunner x4 | `{"marker":"pylon_s","dx":2,"dz":-2}` | 8, -12.4 | south-east pylon |
| `/missions/2/enemy/groups/3` | wrench_runner x4 | `{"marker":"pylon_w","dx":1,"dz":3}` | -11, 3 | runners 4 / 3 / 3 split over the three pylons, beside the gunners |
| `/missions/2/enemy/groups/4` | wrench_runner x3 | `{"marker":"pylon_n","dx":1,"dz":-2}` | 7, 8.4 | north-east pylon |
| `/missions/2/enemy/groups/5` | wrench_runner x3 | `{"marker":"pylon_s","dx":1,"dz":2}` | 7, -8.4 | south-east pylon |
| `/missions/2/enemy/groups/6` | junk_buggy x4 | `{"u":0.4,"v":0}` | 33.78, 0 | outline "behind the core": u 0.4 of the enemy zone (x 33.8), i.e. on the enemy side of the core |
| `/missions/2/enemy/groups/7` | salvo_cart x3 | `{"u":1,"v":0}` dx 1.1 | 42.2, 0 | outline "behind the core" and carts >= 14 u behind the front edge: back edge (u 1, dx 1.1) |
| `/missions/2/enemy/groups/8` | rustbucket_rex x1 id rex | `{"marker":"rex_bay"}` | 44, 0 | group id `rex` for the script `order` op; asleep (`hold`) at `rex_bay` |
| `/missions/3/enemy/groups/0` | veil_cutter x3 | `{"marker":"dark_lane","dx":-6}` | 8, -6 | outline "cloaked ambush clusters along the hull, order hold": 10 cutters as clusters of 3 / 3 / 2 / 2: two at the foot lane marker (+-6 u), two in the hull maze at v -0.6 and +0.6 |
| `/missions/3/enemy/groups/1` | veil_cutter x3 | `{"marker":"dark_lane","dx":6}` | 20, -6 | second cluster at the foot lane |
| `/missions/3/enemy/groups/2` | veil_cutter x2 | `{"u":0.5,"v":-0.6}` | 35, -19.62 | third cluster (hull, south) |
| `/missions/3/enemy/groups/3` | veil_cutter x2 | `{"u":0.5,"v":0.6}` | 35, 19.62 | fourth cluster (hull, north) |
| `/missions/3/enemy/groups/4` | shush_bike x4 | `{"u":0,"v":-0.95}` | 28.9, -31.06 | outline "the sand end, a long loop": bikes start at the south edge of the front line and take the long way round (default order advance) |
| `/missions/3/enemy/groups/5` | silent_signer x2 | `{"marker":"ridge"}` | 42, 18 | outline "on the ridge, hold, >= 14 u behind the front": at the `ridge` marker |
| `/missions/3/enemy/groups/6` | rivet_gunner x8 | `{"u":0.8,"v":0}` | 38.66, 0 | outline "the far hull": back of the hull (u 0.8), hired (`hired:true`, `enemy.hired` = rummage) |
| `/missions/5/enemy/groups/0` | grand_concierge x1 id concierge | `{"marker":"plaza"}` | 52, 0 | group id `concierge` for the script `order` op; at the plaza, `hold` |
| `/missions/5/enemy/groups/1` | maitre_deluxe x1 id maitre | `{"marker":"plaza","dx":-3,"dz":4}` | 49, 4 | outline "beside it": 3 u toward the player and 4 u north of the plaza centre; id `maitre`; stays on hold (not released by the 25 s event) |
| `/missions/5/enemy/groups/2` | greeter_unit x20 id greeters | (auto) | - | group ids `greeters valets crawlers techs`: see SF-DA-17 |
| `/missions/5/enemy/groups/3` | valet_drone x12 id valets | (auto) | - | ditto |
| `/missions/5/enemy/groups/4` | refund_crawler x5 id crawlers | (auto) | - | ditto |
| `/missions/5/enemy/groups/5` | warranty_tech x5 id techs | (auto) | - | ditto |
| `/missions/6/enemy/groups/0` | acid_spitter x10 | `{"marker":"far_bank"}` | 12, 0 | outline "the far bank, order hold, shelling the Heart from the start" |
| `/missions/8/enemy/groups/0` | hive_queen x1 id queen | `{"marker":"queen_dais"}` | 40, 0 | group id `queen`; "on the dais, hold" |

Groups with no `at` (M5 wave 1, M6 greeters / valets / crawlers / techs are listed above for their ids only, M9 runners / beetles / spitters / glidewings) take the generator's battle-order layout (`layoutArmy`) in the enemy zone: the outline gives them no position.

### 3.3 Waves, scripts and ops

| pointer | value | basis |
| --- | --- | --- |
| `/missions/0/script/waves` `firstAfter 300, interval 300` | wave 2 is never forced | outline "spawns 25 s after W1 is cleared" (`breather 25`, verbatim). `ScriptedWaves` (`campaign_run.js:143,174`) forces the next wave after `firstAfter || interval` (default 40) seconds even if the field is not clear: with the default, wave 2 would spawn at 40 s, before the clear at about 45 s of `first_three_minutes.md`. 300 = the time limit, so only the clear can start it (SF-DA-01) |
| `/missions/4/script/waves` `firstAfter 30, interval 30` | 30 s apart | outline "three waves 30 s apart (placed:true, first at 0)": wave 1 is the placed army (at 0), the list holds waves 2 and 3; `breather` left at the engine default (4 s) |
| `/missions/6/script/waves` | verbatim | `placed:true, firstAfter:40, interval:60` and the three lists are the outline's. With `placed:true` the placed spitters are wave 1, so the third list wave is the third emitted `wave_spawn` (`wave_spawns >= 3`, spec/MS 3.6.4) |
| `/missions/7/script/waves` `first 20` (no `firstAfter`) | first wave at 20 s | outline `placed:false, firstAfter:20`; MS-E08 forbids `firstAfter` on an unplaced list and the engine reads `first` (SF-DA-06) |
| `/missions/1/script/events/0/do/0..2` | three `strike` ops `{kind prop, r 2.4, dmg 18, delay 1.5, team -1}` at (0, 5), (-4.3, -2.5), (4.3, -2.5) | outline: "three prop-kind eruptions (r 2.4, 18 fire damage, 1.5 s red telegraph) at the three vents"; vent positions derived: 120 degrees apart on a 5 u circle round `islet_c` ("three geyser vents around the middle islet"); knock-back 6 has no `strike` field |
| `/missions/2/script/events/1/do/0` | `strike` ring `{kind prop, at core, r 14, dmg 45, delay 0.5, team -1}` | outline r 14 / 45 energy / "delays staggered 0.1 to 0.9 s by distance"; `strike` has one `delay`, 0.5 is the midpoint; the by-distance stagger is the sim's (`strike` `kind:prop`) |
| `/missions/2/script/events/1/do/1` | `kill {def rustbucket_rex, cause energy}` | outline "the Rex slumps and topples (script kill)": the cause is not named; `energy` (overload) chosen from the 27 `KILL_CAUSES` |
| `/missions/3/script/events/0/do/1` | `sky {time 23, over 2}` | spec/MS 3.6.4 "sky 23" for "time-of-day jump to night"; the tween length `over` 2 s is derived |
| `/missions/5/script/events/0` (`boulevard_advances`) | four `order` ops at 20 s | outline "greeters ... warranty techs (rank behind the greeters along the boulevard, order advance at 20 s)": read as placed on `hold` and released at 20 s (SF-DA-17) |
| `/missions/5/script/events/1/do/0` | `prop destroy sf_billboard at sign_stack all` | spec/MS 3.6.4 "prop destroy sf_billboard all"; the `at` marker scopes it to the three billboards of the stack (the boulevard has other billboard stacks as cover); semantics of `all` + `at` is an M14 question (OI-SF-4) |
| `/missions/7/script/events/0/do/0` | `strike orbital dmg 0 at dais team -1` | outline "cosmetic strike (kind orbital, dmg 0, at an empty dais cell)" |

### 3.4 Set-piece shots, anchors, stingers, sfx

| pointer | derived value | basis |
| --- | --- | --- |
| `/missions/1/setpiece/shot/*` | anchors `unit:dustpan_hover` | outline `first_dustpan + (-8,4,-2)` -> `(5,3,6)`: the runtime-resolved "first Dustpan" is the named anchor `unit:<defId>` of MS-P02; offsets and hold 5.0 / ease out verbatim |
| `/missions/2/extraSetpieces/0/shot/*` | anchor `unit:rustbucket_rex`, from (-8, 1, 2) to (-3, 1.4, 0.5), ease `in` | outline gives only "a low push to the radiator teeth, 3.5 s" (hold 3.5 verbatim); the Rex faces west (toward the player), so the camera sits on its -x side, low |
| `/missions/2/extraSetpieces/0/stinger/secs` | 2.4 | `sound_music.md` section 3 (`sf_stg_rex_horn`) |
| `/missions/2/extraSetpieces/0/sfx` | `sf_truck_horn`, `sf_stilt_creak`, `sf_airlock_hiss` | outline "steam hiss" has no id; `sf_airlock_hiss` (steam) of `sound_music.md` 4.1 (SF-DA-20) |
| `/missions/3/setpiece/shot/*` | anchor `unit:bubble_tender`, from (-3, 2.2, 1.2) to (3, 2.2, -1.2) | outline "over the shoulder behind the Envoy ... rotating half a turn over the hold to face back": `from` verbatim; `to` is the opposite side of the half turn (a shot has two points, no rotation field); `envoy` = the fixed `bubble_tender` |
| `/missions/4/setpiece/shot/*` | from `enemy_centroid + (8,3,8)`, to `unit:greeter_unit + (1.2,1.4,0.8)` | outline anchors `pulse_centre` and `nearest_frozen_greeter` are runtime-resolved; collapsed to the nearest named anchors of MS-P02 (the pulse lands on the enemy clump; the frozen greeter is a greeter) |
| `/missions/5/setpiece/shot/*` | anchor `unit:grand_concierge` for feet and face | outline `concierge_feet + (-6,0.6,6)` rising to `concierge_face + (-6,7.5,6)`: both collapse to the unit anchor, offsets verbatim (the face height is the unit's) |
| `/missions/5/extraSetpieces/0/shot/*` | from (-14, 5, 14) to (-12, 4, 12) on `unit:grand_concierge`, ease `inout` | outline "a 4 s wide shot of the knees folding" (hold 4 verbatim) gives no coordinates |
| `/missions/5/extraSetpieces/0/stinger` | `sf_stg_buzzkill` comic 2.2 | outline "no new stinger (sf_stg_buzzkill reused at -3 dB)"; the -3 dB is a mix note with no field |
| `/missions/8/extraSetpieces/0/shot/*` | from (-4, 1, 6) to (-4, 10, 6) on `unit:hive_queen`, ease `out` | outline "a crane-up from the egg clusters to the antler crown, 4 s" (hold 4 verbatim) |
| `/missions/8/extraSetpieces/0/stinger/secs`, `sfx` | 3.6; `sf_alien_goo` | `sound_music.md` section 3; outline "egg pops, wet thump" have no ids and are variants of the `sf_alien_goo` family (SF-DA-20) |
| every `notes` | one-sentence sim-event note | condensed from the outline "Sim event" bullet; items without a field (knock-back, white flash, camera rotation, tilt angles, red tint) are named there only |

### 3.5 Rewards

| pointer | value | basis |
| --- | --- | --- |
| `/missions/1/rewards/quickUnlocks/0`, `/5/..`, `/7/..` | ids `sf_qp_magma_night`, `sf_qp_boss_rush`, `sf_qp_sinkhole_night`, kind `preset` | ids derived on the `med_qp_*` pattern of the Medieval pack; names are the outline's ("arena preset", "preset", "variant" all map to `preset`) |
| `rewards.codex` page ids | `sf_codex_hover_tanks`, `sf_codex_quiet_hour`, `sf_codex_courtesy_systems`, `sf_codex_the_hive` | the outline names pages ("Hover Tanks", "Quiet Hour", "Courtesy Systems", "The Hive"); snake ids derived on the `med_codex_*` pattern. Unit pages are unit ids (verbatim) |
| `rewards.substitution` generic parts | `sf_generic_helm`, `sf_generic_back` (M4, M5), `sf_generic_staff` | outline "a generic helm / back part / staff"; ids derived (`mod_generic_*` pattern). `sf_back_glowpads`, `sf_helm_bowtie`, `sf_back_antenna` are the outline's |
| `/rewardParts/sf_back_hoverpack` | name "Hoverpack", blurb "A hoverpack for the Soldier Workshop." | the outline names the plus part (M3) without a title or text; COMEDY-SF replaces both |
| `/rewardParts/*` other four | names "Fishbowl Helmet", "Shimmer Cape", "Fuse Bandolier", "Glow Staff" | outline reward names; blurbs are the reward `Text` verbatim |
| `rewards` of M9 and titles | `codex: []` | the finale cards of `humour.md` 3.3 (end card, Time Passport) and the plus **titles** have no field in `rewards` (one title per mission lives in `text.reward.title`); the CU11 ledger keeps them (SF-DA-16) |

### 3.6 Beats (50 mission beats + 6 puzzle first-sight beats)

| pointer | beat | trigger | other derived |
| --- | --- | --- | --- |
| `/missions/0/teaching/beats/0` | `b_place_line` | `placement_start` | hint from first_three_minutes.md |
| `/missions/0/teaching/beats/3` | `b_powers` | `first_contact` | hint from first_three_minutes.md |
| `/missions/0/teaching/beats/7` | `sf_b_lull` | `wave_cleared` (derived) |  |
| `/missions/0/teaching/beats/8` | `sf_tender_ring` | `tender_aura_active` (derived) |  |
| `/missions/0/teaching/beats/9` | `sf_dome_block` | `dome_block` (derived) |  |
| `/missions/1/teaching/beats/1` | `sf_third_islet` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/1/teaching/beats/2` | `sf_capture_how` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/1/teaching/beats/3` | `sf_geyser_tell` | `geyser_telegraph` (derived) |  |
| `/missions/1/teaching/beats/4` | `sf_salvo_ring` | `salvo_ring` (derived) |  |
| `/missions/2/teaching/beats/1` | `sf_destroy_list` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/2/teaching/beats/2` | `sf_pylon_pop` | `pylon_death` (derived) |  |
| `/missions/2/teaching/beats/3` | `sf_rear_plate` | `deflect_front` (derived) |  |
| `/missions/2/teaching/beats/4` | `sf_coolant_tank` | `tank_explosion` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/3/teaching/beats/1` | `sf_lamp_reveal` | `detector_reveal` (derived) |  |
| `/missions/3/teaching/beats/2` | `sf_attack_breaks` | `cloak_broken` (derived) |  |
| `/missions/3/teaching/beats/3` | `sf_lock_line` | `lock_line` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/3/teaching/beats/4` | `sf_envoy_rule` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/4/teaching/beats/1` | `sf_stun_pip` | `machine_stunned` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/4/teaching/beats/2` | `sf_b_repair` | `tech_repair` (derived) |  |
| `/missions/4/teaching/beats/3` | `sf_crawler_faces` | `deflect_front` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/4/teaching/beats/4` | `sf_hill_clock` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/5/teaching/beats/1` | `sf_emp_cap` | `emp_on_boss` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/5/teaching/beats/2` | `sf_back_plate` | `deflect_front` (derived) |  |
| `/missions/5/teaching/beats/3` | `sf_maitre_wait` | `please_wait` (derived) |  |
| `/missions/5/teaching/beats/4` | `sf_boss_bubble` | `boss_shield_break` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/6/teaching/beats/1` | `sf_river_acid` | `placement_start` | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/6/teaching/beats/2` | `sf_acid_dot` | `poison_through_shield` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/6/teaching/beats/3` | `sf_heart_bar` | `placement_start` | who `cassandra` derived: text = the hint |
| `/missions/6/teaching/beats/4` | `sf_spore_cloud` | `spore_burst` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/7/teaching/beats/1` | `sf_b_air` | `air_unit_in_view` (derived) |  |
| `/missions/7/teaching/beats/2` | `sf_channel_bar` | `channel_bar` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/7/teaching/beats/3` | `sf_ring_friendly` | `friendly_in_ring` (derived) |  |
| `/missions/7/teaching/beats/4` | `sf_manta_cycle` | `manta_cloak` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/8/teaching/beats/0` | `sf_b_queen` | `queen_reveal` (derived) |  |
| `/missions/8/teaching/beats/1` | `sf_brood_pulse` | `brood_pulse` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/8/teaching/beats/2` | `sf_window_vent` | `window_vent` (derived) | who `cassandra` derived: toast text, no voice in the outline |
| `/missions/8/teaching/beats/3` | `sf_sac_weak` | `sac_hit` (derived) |  |
| `/missions/8/teaching/beats/4` | `sf_finale_hint` | `placement_start` | who `cassandra` derived: text = the hint |

Trigger names in the R9 list of the outline (`shield_hit shield_break cloak_on emp_cast blink_cast strike_call mech_step hover_cross`), the CU5 basics triggers and `heal_pulse` (arenas.md 3.4) are verbatim; the rest are machine names (`snake_case`, pattern-only lint until CU5 publishes the list) built from the outline's condition, which is kept in `when`. Hint-only beats (`sf_third_islet sf_capture_how sf_destroy_list sf_envoy_rule sf_hill_clock sf_heart_bar sf_finale_hint`) and toast-only beats (`sf_coolant_tank sf_stun_pip sf_crawler_faces sf_lock_line sf_emp_cap sf_boss_bubble sf_channel_bar sf_manta_cycle sf_river_acid sf_acid_dot sf_spore_cloud sf_brood_pulse sf_window_vent`) have no voice in the outline; the schema needs `who` and `text`, so `who` is `cassandra` (the flat, factual voice) and `text` is the hint or toast line (SF-DA-19). Basics hints: `b_place_line` and `b_powers` carry the hints of `first_three_minutes.md` (the outline has none); `b_fight b_speed b_done` have none.

### 3.7 Text fields not in the outline

| pointer | value | basis |
| --- | --- | --- |
| `/acts/*` | titles "Act I: Landlords and Squatters" / "Act II: The Help Is Here" / "Act III: Queen Size"; blurbs | arenas.md section 3 act names and their parentheses ("the Moon has been repossessed; both parties are confident about it", ...), prefixed "Act I:" like the other eras |
| `/missions/*/text/blurb` (9) | star-1 line | the outline has no card blurb; the star 1 line is the one-sentence summary (the Modern pack does the same) |
| `/missions/*/objective/text` (9) | "Clear both waves of claim jumpers", "Hold all three relay posts for 10 seconds", "Destroy the reactor core and its three pylons", "Walk Envoy Plumbly to the exit", "Hold the Help Desk for 120 seconds in total", "Topple the Grand Concierge", "Keep the Heart tree alive through three waves", "Survive five waves of the Skitter Hive", "Topple the Hive Queen" | authored player-facing objective lines (<= 80 characters) condensed from the objective bullet and star line 1 |
| `/missions/{2,3,5,7,8}/botsWhy` | "blind bot" sentences | M1, M2, M5, M7 are the outline section 4 notes (capitalised); M3, M4, M6, M8 (extended), M9 are built from the "fails because" column of the same table |
| `/missions/*/blind` | 9 swaps (section 3.8) | outline section 4 gives the failure story, not a unit swap |
| `/puzzles/*/blurb` | the "Blurb seed" line, capitalised, final period | puzzles.md: "Text per puzzle (part 2)" does not exist in the repo (SF-DA-18) |
| `/puzzles/*/hint` | condensed from the "The trick" paragraph | ditto |
| `/puzzles/*/goalText` | "Defeat all ten rivet gunners", "... eight shore defenders", "... six veil cutters", "... four refund crawlers", "... five acid spitters", "... forty skitterlings" | from the Enemy bullet (goal is eliminate for all six) |
| `/puzzles/*/firstSightBeat` | ids `sf_pz_fs_{shield,hover,cloak,emp,blink,strike}`, trigger `placement_start`, text = the hint of the teaching mission's beat, voice of that beat | puzzles.md: "each puzzle opens with a one-line first-sight beat ... (the CU5 beat of the teaching mission, shortened)" |

### 3.8 Blind variants (`blind.swap`, MS-B09; all derived)

| mission | swap | cost change | why (outline section 4) |
| --- | --- | --- | --- |
| `/missions/0/blind` | bubble_tender -> bulwark_warden | -7% | The blind army never retreats a popped unit: with no Tender ring, every bubble breaks together and the runners walk in. |
| `/missions/1/blind` | dustpan_hover -> bulwark_warden | -48% | The blind army sends everything down the shelled causeway and never builds a hover tank. |
| `/missions/2/blind` | dustpan_hover -> bulwark_warden | -48% | The blind army has no hover flankers: it walks the Rex's front plate and ignores the pylons' bubble pops. |
| `/missions/3/blind` | glow_grazer -> tidy_trooper, spritz_medic -> tidy_trooper | 57%, -21% | The blind army has no lamp: it walks the Envoy through the cloaked ambush with troopers where the Grazers and Medics should be. |
| `/missions/4/blind` | zapper_tinker -> rivet_gunner | -25% | The blind army fights the greeters one by one with no Tinker, so the chip never ends. |
| `/missions/5/blind` | zapper_tinker -> rivet_gunner, veil_cutter -> rivet_gunner | -25%, -14% | The blind army has no Tinker stun and no cloak: it charges the Concierge head-on and never stuns or stabs the back plate. |
| `/missions/6/blind` | hop_notary -> thorn_slinger | -28% | The blind army stands on the near bank and never blinks, so the spitters shell the Heart down. |
| `/missions/7/blind` | grand_housekeeper -> dustpan_hover | -36% | The blind army never calls a strike (no Housekeeper) and stands in the rings of its own. |
| `/missions/8/blind` | hop_notary -> tidy_trooper, grand_housekeeper -> dustpan_hover | -31%, -36% | The blind army ignores half the tools: no blink onto the dais and no Deep Clean on the brood. |

Five swaps exceed the 35 percent cost band (MS-B11 warnings): M2, M3 and M8, M9 have no roster unit within 35 percent of the unit whose mechanic is removed (270 Dustpan against 150 at best; 420 Housekeeper against 270 at best), M4 has no lamp unit near the 70 erg Grazer (SF-DA-09).

### 3.9 Teaching exceptions (`teaching.exceptions`, MS-C08 shape: only mechanics taught LATER or first-sight)

Declared: slot 2 `sf_orbital_clean` (strike, taught M8) in M1 to M7 (outline 0.1 item 4 says "in every mission before M8"; only the M1 to M3 rows repeat it); `spritz_medic` -> cloak and `rustbucket_rex` -> emp in M3; `elder_hummock` -> repair (first-sight) in M7; `glidewing` and `void_manta` -> air (first-sight) in M8. **Not declarable** (D-MS-16: the lint rejects an exception for a mechanic taught earlier or for a thing that is no registry mechanic): the Valet Drone `detect` lamp in M5 and the Void Manta cloak in M8 (cloak is taught in M4), the Medic lamp in M4 (taught there), the `junk_buggy` bailout driver, the `salvo_cart` craters, the Rex rear plate and the crawler faces (no registry mechanic; they stay first-sight toasts) (SF-DA-15).

### 3.10 `firstThreeMinutes` (mission 1)

`/missions/0/firstThreeMinutes/fresh` and `returning` are the ordered ids of `first_three_minutes.md` sections 1.1 and 2.1 (read by `tools/ms_context.mjs`, MS-G02 green). `milestonesS` is derived from the totals paragraph of section 1 ("chooser 0:00, briefing deployed 0:32, Fight 1:20, set-piece 1:50, bubble beat 1:31, wave 1 cleared 2:05, wave 2 2:35, victory about 3:18, stars shown by 3:25, next-mission prompt at 3:40"): `{briefingDeployed 32, fight 80, setpiece 110, firstEffect 91, victory 198, starsShown 205, nextPrompt 220}`. The set-piece fires at 30 s of battle time = 1:50 on that timeline.

### 3.11 Other derived fields

| pointer | value | basis |
| --- | --- | --- |
| `/missions/*/caps`, `/missions/*/inputs` | `{}`, `[]` | the outline gives no unit caps and no scripted reference-run inputs (VF 3.9 step 6); open item OI-SF-2 |
| `/missions/*/friendlyFire` | `false` (9) | outline silent; ring and splash damage hurt friends regardless (`ui_text.js`: "Area attacks always do") |
| `/missions/*/powers` | M1 to M4: `disable [sf_off_switch]` with `reasons` "The intern has not been told about this one yet."; M3 adds `override sf_gravity_burp {propDmg 0}`; M5 to M9 none | god_powers.md section 2 and outline 0.1 item 3 (verbatim); the reason string is `god_powers.md` 3 item 4 |
| `/missions/8/requiresModules` | the 17 modules the era uses (no M9, no M11) | outline says "all (latest #19)" but 0 and 1.2 say Sci-Fi never touches cover (M9) or mines (M11) (SF-DA-08); the lint skips the comparison (`allModules`) |
| `/missions/4/marginWaiver` | `{ref, reason}` | outline 1.2 row 5 (M6b = position 19 = E-FREEZE, margin 0); wording follows the Modern pack's waiver; COORD logs it in `cuts.md` (OI-MS6) |
| `/missions/0/script/waves/list/0/order` | `advance` | outline "W2 ... (rush)" |
| `/missions/*/enemy/style` | outline strings | M1 "hold then rush"; others verbatim |
| `/missions/3/fixed/0` | Envoy Plumbly: `bubble_tender`, `vip`, `free`, `override.name`, heading pi/2 | outline "a free bubble_tender (name override only, vip:true)"; heading faces the exit (+x); both `name` and `override.name` set like the Modern van |
| `/missions/3/objective` | `escort {vip bubble_tender, exit pod_exit, mode path}`, `binding true`, markerIds start + exit | spec/MS A4 (outline `escort {vip:'envoy' ...}`); `reachOnly` dropped |
| `/missions/6/objective/params/prop` | `sf_heart_tree` | spec/MS A2 (outline `defend_core {core:'heart', time:300}`) |

### 3.12 Puzzles: placements, bonus encodings, counters

| puzzle | placements (all derived: `block()` of `puzzles.js:18`, enemy at +x facing -x) | basis |
| --- | --- | --- |
| `/puzzles/0` `sf_pz_pop_then_hide` | 10 rivet_gunner, two blocks of 5 (3 columns, spacing 1.6) at (2, -5) and (2, 5), `hold` | puzzles.md "two clumps of five on the east half, 20-26 u from the player's edge": measured from the small-arena player front edge x -20 -> x 0..6 |
| `/puzzles/1` `sf_pz_light_bridge` | 5 rivet_gunner row at x 30 (z -6.4..6.4), 2 junk_buggy at x 33 (z +-3), 1 salvo_cart at x 42, all `hold` | far shore of the medium arena; the cart on the back edge (>= 14 u behind the front edge 28) |
| `/puzzles/2` `sf_pz_do_not_disturb` | 6 veil_cutter, 3 x 2 block at x 32..34.4, `advance` | the hull on the east side; "advance after 10 s" has no field (SF-DA-11) |
| `/puzzles/3` `sf_pz_off_switch` | 4 refund_crawler in a column at x 24, 27.5, 31, 34.5, z 0, formation `column`, `advance` | "a tight column down the middle lane" |
| `/puzzles/4` `sf_pz_gap_year` | 5 acid_spitter row at x 13 (z -6.8..6.8), `hold`, formation `line` | rift x -4..4; "8-10 u behind the rift" -> x 12..14; the force gates are recipe props |
| `/puzzles/5` `sf_pz_bait_and_clean` | 40 skitterling, 4 columns x 10 rows from x 3 (spacing 1.1), `advance`; fixed free `grand_housekeeper` at (-37, 0) | "one column funnelling through a 6 u gap in the resin wall, 28 u from the player's edge" (front edge -28 -> gap at x 0); the Housekeeper behind the Warden line, at the player zone back |

| puzzle | bonus encoding | mechanicFired | note |
| --- | --- | --- | --- |
| 0 | `lossesAtMost [0]` ("Lose no unit") | `own_shield_break` >= 6 | SF-DA-10 |
| 1 | `noLoss [[dustpan_hover]]` ("No Dustpan bubble pops") | `hover_liquid_kill` >= 3 (verbatim) | SF-DA-12 |
| 2 | `lossesAtMost [0]` ("Kill all six before any of them strikes") | `cloak_kill` >= 5 (literal, unfireable) | SF-DA-11, SF-DA-12 |
| 3 | `usedMechanic [emp, 4]` ("One EMP stuns all four") | `emp_hit_machine` >= 4 (verbatim) | SF-DA-12 |
| 4 | `lossesAtMost [0]` ("Lose nobody") | `blink` >= 4 (verbatim) |  |
| 5 | `noLoss [[glow_grazer]]` ("The bait survives") | `strike_kill` >= 25 (verbatim "kills >= 25 in one cast") | SF-DA-13 |

`requiresModules` of the puzzles are the "requires" column of `puzzles.md` by name (`M4 M2`, `M7 M8 M10`, `M5 M7`, `M6b M4`, `M13 M12`, `M13 M10`); `teaches` is the mechanic of the teaching mission; `timeLimit` the Goal line (120 / 150 / 120 / 120 / 90 / 120); arenas, seeds, rosters, budgets and pars equal the table (MS-I05 green); puzzle arena `env {}` and `markers []` like the Ancient puzzles.

## 4. Design amendments and inconsistencies (the `designAmendments` of the hand-back; exact row and proposed fix)

| id | file and row | finding | local choice (JSON) | proposed fix (owner) |
| --- | --- | --- | --- | --- |
| **SF-DA-01** | `missions_outline.md` M1 Enemy ("`ScriptedWaves { placed:true, breather:25, ... }` ... spawns 25 s after W1 is cleared") with `first_three_minutes.md` t=75 | `ScriptedWaves` (`campaign_run.js:143,174`) spawns the next wave after `firstAfter || interval` seconds (default 40) even when the field is not clear; wave 1 is cleared at about t=45, so wave 2 could start at t=40 and the "25 s after the clear" and the lull lesson would break | `script.waves {firstAfter:300, interval:300, breather:25}` (`/missions/0`, SF-AM-1) | write `firstAfter`/`interval` = the time limit in the outline, or give `ScriptedWaves` a `forceAfter:false` (DESIGN-ERA-SCIFI / SIM) |
| **SF-DA-02** | `arenas.md` 3.2 row `sf_sp_lunch_served` ("at 45 s") against `missions_outline.md` 0.1 item 9 (30 s) | two binding files disagree; the outline carries the reasoning (the 45 s lull lesson would be shadowed) | trigger 30 (outline wins) | change `arenas.md` 3.2 to 30 s (DESIGN-ERA-SCIFI) |
| **SF-DA-03** | `missions_outline.md` M2 Enemy ("`rivet_gunner` x12 (the south shore and `islet_w`)") and M3 Enemy ("around the pylons, order hold"); `arenas.md` section 1 ("no unit starts inside its own weapon range of an enemy"), spec/W 3.7.5 P1 | islet_w (x -9) and the west-pylon group (x -9 after dx +3; the pylon itself is at x -12) are 19.9 u from the player front rank (x -28.9); the rivet range is 24: six gunners in M2 and five in M3 start inside range at tick 0, the arena-level `inRange0 = 0` policy fails for the mission | outline positions kept (islet_w garrison; the west-pylon group on the lee side, dx +3) (SF-AM-2, SF-AM-3) | move the garrisons >= 26 u from the front edge (islet_w x >= -2, pylons at 16 u radius) or relax P1 for hand-placed `hold` groups (DESIGN-ERA-SCIFI, WORLD) |
| **SF-DA-04** | `arenas.md` section 1 ("Signer, Salvo Cart and Housekeeper placed >= 14 u behind their zone's front edge") and `missions_outline.md` M2/M3 carts | a medium zone is 14 u deep and the zone margin is 0.9 u, so the deepest in-zone spot is 13.1 u behind the front edge | carts at `u 1` plus `dx 1.1` = the back edge (x 42.2), 14.2 u behind (SF-AM-2, SF-AM-3) | say ">= 13" or make medium zones 16 u deep (DESIGN-ERA-SCIFI) |
| **SF-DA-05** | `missions_outline.md` M4 Objective (`escort {vip:'envoy' ...}`, `reachOnly`) and M7 Objective (`defend_core {core:'heart', time:300}`) | spec/MS A4 and A2 are not yet adopted in the outline: the lint rejects the original form | vip `bubble_tender`, `reachOnly` dropped; `prop: sf_heart_tree` added (SF-AM-4, SF-AM-7) | adopt A2/A4 in the outline (OI-MS5) |
| **SF-DA-06** | `missions_outline.md` M8 Enemy ("`script.waves { placed:false, firstAfter:20, interval:60 }`") | MS-E08: unplaced waves use `first`, not `firstAfter`; the engine reads `first` when `placed` is false | `first: 20` (SF-AM-8) | edit the outline to `first:20` |
| **SF-DA-07** | `missions_outline.md` 1.2 row 5 (M5 margin 0) | MS-C07 needs a `marginWaiver` on the EMP mission; request R1 (split M6b) is still open | `marginWaiver` on M5 (SF-AM-5) | COORD logs it in `cuts.md` (OI-MS6) or SIM lands M6b's stun first |
| **SF-DA-08** | `missions_outline.md` 1 table / 1.2 row 9 ("all (#19)") against 0 and 1.2 ("Sci-Fi never needs #15 or #16") | "all" would put M9 cover and M11 mines into `requiresModules` | the 17 modules the era uses (SF-AM-9) | say "all of the era's 17" in the outline |
| **SF-DA-09** | `missions_outline.md` section 4 (blind bots) with MS-B11 | no roster unit costs within 35 percent of the Dustpan (270), Housekeeper (420) or Grazer (70) it replaces | five MS-B11 warnings (M2, M3, M4, M8, M9), lint exit 0 | raise the band to 50 percent or allow several swaps summing to the same cost (DESIGN-CAMPAIGN) |
| **SF-DA-10** | `puzzles.md` 1 "Mechanic fired: ... `usedMechanic('shield', 6)`" | `usedMechanic('shield', n)` counts `shield_break_enemy`, but the ten Rivet Gunners carry no bubble: the counter stays 0 and the stated quantities (recharges >= 6, own breaks <= 10) are player-side | `mechanicFired {own_shield_break, 6}` (a completed recharge needs a break first) | add a canonical `shield_recharge` counter (event `shield_recover`, player) and restate (DESIGN-CAMPAIGN, SIM) |
| **SF-DA-11** | `puzzles.md` 3 "Mechanic fired: cutters revealed ... `usedMechanic('cloak', 5)`" and "advance after 10 s" | `cloak_kill` counts kills by a cloaked PLAYER unit; the puzzle roster has no cloaker, so the counter cannot fire (ER9 would fail); the 10 s delay has no field in `placements` | literal `mechanicFired {cloak_kill, 5}` (unfireable), placements `advance` | add a canonical `cloak_reveal` counter (distinct enemy cutters revealed before their first strike) and a placement `delay` (DESIGN-CAMPAIGN, SIM) |
| **SF-DA-12** | `puzzles.md` 2 bonus "No Dustpan bubble pops", 3 bonus "Kill all six before any of them strikes", 4 bonus "One EMP stuns all four" (`empHits(4)` in a single cast) | no helper counts bubble pops of one def, hits taken from one def, or a single cast | `noLoss([dustpan_hover])`, `lossesAtMost(0)`, `usedMechanic(emp, 4)`; the text is kept verbatim | extend the helper vocabulary (`ownBreaksByAtMost`, `hitsTakenFromAtMost`, `empOneCast`) or reword the stars to what the helpers test (DESIGN-CAMPAIGN, COMEDY-SF) |
| **SF-DA-13** | `puzzles.md` 6 roster ("`glow_grazer`, `bulwark_warden`, `tidy_trooper` plus the fixed `grand_housekeeper`") | MS-I05 compares the roster set including the fixed unit, and the puzzle schema has no `caps`: the player could buy extra Housekeepers | `roster` includes `grand_housekeeper` and `fixed` carries the free one | MS-I05 should ignore `fixed` units, or the puzzle schema gains `caps` (DESIGN-CAMPAIGN) |
| **SF-DA-14** | task rule "_derived / _amend in the JSON" against `ms.schema.json` | the schema is closed; `_` keys are MS-S01 errors | marks live in this file by pointer; `designAmendment` carries the tag | section 0 |
| **SF-DA-15** | `missions_outline.md` 0.1 item 4 ("the Valet Drone's `detect` in M5", "the Void Manta's cloak in M8") against D-MS-16 / MS-C08 | cloak is taught in M4, so these are not exceptions and the lint rejects them; the junk_buggy bailout, salvo craters, Rex rear plate and crawler faces are no registry mechanic | omitted from `teaching.exceptions` (section 3.9) | reword outline 0.1 item 4: those are first-sight toasts, not exceptions |
| **SF-DA-16** | `missions_outline.md` M1 reward / M9 reward / plus-items | `rewards` has no field for plus titles or end cards | one title per mission in `text.reward.title`; M9 `codex []` | CU11 ledger carries them; add `rewards.titles[]` if wanted (DESIGN-CAMPAIGN) |
| **SF-DA-17** | `missions_outline.md` M6 Enemy ("... rank behind the greeters along the boulevard, order `advance` at 20 s") | ambiguous: either the four groups are placed advancing or they hold until 20 s | placed `hold` with ids and released by one event at 20 s (4 `order` ops); the Maitre stays on `hold` | state it in the outline (DESIGN-ERA-SCIFI) |
| **SF-DA-18** | `puzzles.md` section 7 "Text per puzzle (part 2): title, blurb, hint, goal text, star lines, first-sight beat" | the part-2 text does not exist in the repo; only titles and "Blurb seed" lines do | blurb = the seed, hint condensed from "The trick", goal text and first-sight beat derived (section 3.7) | COMEDY-SF writes the six puzzle texts |
| **SF-DA-19** | `missions_outline.md` teaching bullets (hint-only and toast-only beats) | the beat schema requires `who` and `text`; 20 outline beats have no voice (7 hint-only: sf_third_islet sf_capture_how sf_destroy_list sf_envoy_rule sf_hill_clock sf_heart_bar sf_finale_hint; 13 toast-only) | `who` cassandra, `text` = the hint or toast (section 3.6) | COMEDY-SF assigns voices, or `who` becomes optional for toasts (DESIGN-CAMPAIGN) |
| **SF-DA-20** | `missions_outline.md` M3 second package sfx ("steam hiss"), M9 second package sfx ("egg pops, wet thump") | no AUDIO ids exist for them (`sound_music.md` 4.1) | `sf_airlock_hiss`; `sf_alien_goo` | AUDIO adds `sf_steam_hiss`, `sf_egg_pop`, `sf_wet_thump` or accepts the aliases |
| **SF-DA-21** | `missions_outline.md` 0.1 item 8 and R7 (weather names `ember_ion neon_rain spores`) | five MS-R14 warnings until SIM adopts R7 (`ash rain fog` fallback applies) | names kept verbatim | SIM adopts R7 |
| **SF-DA-22** | `missions_outline.md` M3 / M4 / M8 set-piece Camera bullets ("swinging 90 degrees", "rotating half a turn", "tilted 70 degrees") | a shot has two points and no rotation or tilt field | two points chosen (section 3.4); the rotation is in `notes` | add `shot.yaw` / `shot.pitch` to the set-piece schema or leave to CU3 |

## 5. Outline details that have no field (not lost: named here)

* M1 poster tagline: `text.poster` (kept). The chooser / arrival-card texts belong to `first_three_minutes.md` and `humour.md`, not to a mission.
* M2 vents: knock-back 6; the "geyser hazard" fallback of the set-piece (SIM).
* M3 coolant tanks, `sf_blast_door`s, catwalks, the Rex rear plate: recipe or sim data (`props.md`, `rosters.md`), not mission data. "A pylon that dies pops nearby bubbles" is an M12 prop rule.
* M4 "veil cutters never cloak in the first 6 s": a unit-AI rule; the Envoy rule is the `vipMarch` block.
* M5 set-piece fires only if the player reaches an 8-machine EMP (declared in the outline); the reference run must therefore fire one: `inputs` for the reference run are an open item (OI-SF-2).
* M6 the -3 dB reuse of the buzzkill stinger; the Concierge's slow topple and hotel bell are the reaction table.
* M7 the Hummock "flagged `summoned`": the `free` spawn is excluded from accounting by M14 (H10); the Heart's 2,400 hit points are the prop catalogue's.
* M8 the Manta's 6-of-16 s cloak cycle and the Deep Clean numbers are unit data; the orbital god power shares the ring (`god_powers.md`).
* M9 the Queen's once-only `summon_on_death` brood of ten is unit data and excluded from accounting; the proximity trigger of `sf_sp_queen_rise` is rejected by spec/MS A7 (15 s only).

## 6. Requests of the outline (section 5 / 0.4) as encoded

| request | encoding | status |
| --- | --- | --- |
| R1 split M6b | M5 `marginWaiver`; M6 and M9 sit at margin 0 (M6 teaches no headline mechanic, so no waiver is required) | open with SIM/COORD |
| R2 `order` / `kill` | ops `order` (M3 Rex, M6 Concierge and boulevard) and `kill` (M3 Rex, M9 vent) in `script.events` | accepted by spec/MS 3.6.3 |
| R3 `powers.disable` | `sf_off_switch` in M1 to M4 with `reasons` | accepted (COORD) |
| R4 `powers.override` | `sf_gravity_burp {propDmg:0}` in M3 | accepted (COORD) |
| R5 | M2 `capture {points[3], need:3, hold:10}` | withdrawn in the outline; native M14 rule |
| R6 triggers | `hp_frac` (prop: Heart; unit: Queen), `prop_destroyed` by type (core, first pylon) | accepted |
| R7 weather names | verbatim, five MS-R14 warnings | open with SIM |
| R8 untaught lint | MS-C08 runs when `stats.js` exists; `teaching.exceptions` declared (3.9) | accepted |
| R9 beat triggers | machine names in `beats[].trigger` (3.6) | pattern-only until CU5 publishes the list |
| R10 time-of-day jump | `sky {time 23, over 2}` in the M4 blackout event | accepted (render-only) |

## 7. Open items

| id | item | owner | deadline phase |
| --- | --- | --- | --- |
| OI-SF-1 | replace the provisional marker coordinates (section 3.1) by the recipe anchors of the same ids when the twelve `sf_*` recipes exist (W-D23); re-run `ms_lint` | CAMPAIGN-SF, WORLD | when each recipe lands (P1 for `sf_moonbase`) |
| OI-SF-2 | author `inputs[]` for the nine reference runs (scripted god-power keys and orders, VF 3.9 step 6): M5 must fire an 8-machine EMP for its set-piece | CAMPAIGN-SF, BALANCE | P2 |
| OI-SF-3 | resolve SF-DA-01 to SF-DA-22 (owners in section 4); re-run the lint after each outline edit | DESIGN-ERA-SCIFI, DESIGN-CAMPAIGN, COMEDY-SF, SIM, AUDIO | before OI-MS4 (P1) |
| OI-SF-4 | M14 semantics of `prop destroy ... all` together with `at` (M6 billboards) and of `kill ... within` (M9 vent) | SIM | with M14 |
| OI-SF-5 | re-run the placements of section 3.2 through the W harness (`inRange0`, `T1`) once the recipes exist; SF-DA-03 will show in P1 | WORLD, BALANCE | P2 |
| OI-SF-6 | regenerate `context.json` when `src/content/era_scifi/stats.js` exists (`carries`, MS-C08 becomes active: 82 unit uses are unchecked today) | DESIGN-CAMPAIGN | E-FREEZE |

