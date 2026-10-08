# Medieval missions.json: conversion notes, derived items and amendments

Owner CAMPAIGN-MED. Inputs: `missions_outline.md` (binding), `puzzles.md`, `arenas.md`, `rosters.md`, `first_three_minutes.md`, `god_powers.md`, `spec/MS.md`, `spec/ms.schema.json`, `spec/CU.md` (reward ledger, section 3.11.2). Outputs: `missions.json` (9 missions, 6 puzzles, 93 KB), `context.json` (built by `node tools/ms_context.mjs --era=medieval --write`, checked by `--check`), this file.

## 1. State of the checks

| check | command | result |
|---|---|---|
| lint | `node tools/ms_lint.mjs --era=medieval --warn-fail` | 0 errors, 0 warnings, 1 information (MS-V01: the untaught rule C08 is inactive for 107 unit uses until `src/content/era_medieval/stats.js` provides `carries`) |
| lint, explicit files | `node tools/ms_lint.mjs --file=docs/eras/design/medieval/missions.json --context=docs/eras/design/medieval/context.json` | 0 errors, 0 warnings |
| context current | `node tools/ms_context.mjs --era=medieval --check` | current |
| MS test suite | `node tests/campaign/ms.test.mjs` | 175/175 (the suite does not read this file; run to prove the tree is unchanged) |

Per-mission `msHash` (FNV-1a of the gameplay subset, D-MS-23), so a later change is detectable: `med_dress_rehearsal` 3bada7b8; `med_tourney_trouble` c54bccf5; `med_ford_dithering` e33d8422; `med_mizzlemoor_beacons` 190f73b4; `med_castle_dour` 75954916; `med_bell_tolls_lunch` 96f25058; `med_pennywhistle_blaze` 78701247; `med_toll_bridge` 575a0a1f; `med_grand_pageant` 56d6105a.

## 2. How the marks are carried

The task asked for `"_derived": true` and `"_amend"` fields inside the JSON. `ms.schema.json` closes every object (`additionalProperties: false`, MS-S01 "unknown property"), so a marked file cannot pass the lint, and the schema file is not this work's to change. The JSON is therefore clean and **every mark is a JSON pointer in section 5** (generated from the authoring script that produced the file; each pointer was checked to resolve in the final document). Mission-level `designAmendment` is NOT set on any mission: no number of the outline (budget, par, timeLimit, attempts, hard/soft modules, star-3 helper and args) differs from `missions_outline.md`, which the lint proves (MS-I06 raises nothing). Proposed fix for the tooling: allow optional `_derived` / `_amend` strings on mission, group, event and puzzle objects in `ms.schema.json` (listed as AM-MED-13).

## 3. Amendments (real inconsistencies; the design was NOT changed silently)

Each row: where, what disagrees, the minimal local choice that keeps the lint green, the proposed fix and its owner.

| id | where | disagreement | local choice (lint green) | proposed fix | owner |
|---|---|---|---|---|---|
| AM-MED-01 | `missions_outline.md` mission 4 "Enemy" groups (sellsword x16, poacher x12, standard_bearer x1) | Sections 0.1 item 7, 1.1, 1.3 and 6.2 say M4 has parked, disarmed enemy trebuchets (and the M4 codex reward lists `trebuchet`), but the M4 block lists none and gives no count. | Group `parked_engines`: trebuchet x2, `hold`, `override.disarm`, `hired:true`, at zone spot u 0.9 v 0, spread 8; teaching exception trebuchet/arc. | Add one line to the M4 enemy list (count and place), or drop the other four mentions. | DESIGN-ERA-MED |
| AM-MED-02 | `god_powers.md` section 2 ("all nine missions leave god powers ON") vs slot 3 and `MS.md` 3.6.3 (Medieval M4 `powers.disable` accepted) | Slot 3 says CAMPAIGN-MED may disable `med_mud_season` in M4 once the schema allows it; section 2 table says M4 "mud interacts with the charge lesson". COORD decision: `powers.disable` is real. | M4 carries `powers.disable:["med_mud_season"]` with a derived reason line for the HUD. | Confirm the disable (and the line "Mud Season is off here: the charge lesson needs dry ground.") or delete `powers` content in M4; update god_powers.md section 2. | DESIGN-ERA-MED, COMEDY-MED |
| AM-MED-03 | `missions_outline.md` mission 7 enemy: "sellsword x8 (a second group flanks at t = 70 s)" | Ambiguous: eight sellswords in total, released at 70 s, or eight at the start plus a second flanking group of unstated size. | Read as one group `flankers` (sellsword x8, `hold`) released by an `order advance` event at t = 70 s; no unit count was invented. | State the count if a second group of sellswords is intended. | DESIGN-ERA-MED |
| AM-MED-04 | `missions_outline.md` mission 7 second package `med_sp_dragon_shadow` | Only Cassandra has a line ("Lovely day for it."); MS-P03 requires Brutus, Plato and Cassandra once each. | Brutus and Plato lines are derived placeholders in voice ("A SHADOW! Over the thatch! Nobody tell the windmill!" / "Something large has passed over the village. Is it a cloud, or a rumour with wings?"). | COMEDY-MED replaces both lines, or MS allows a one-voice cameo (`announcer.lines` minItems 1 for role `secondary`). | COMEDY-MED, DESIGN-CAMPAIGN |
| AM-MED-05 | `missions_outline.md` mission 9 "Core springald x4 and Dennis x1" | Dennis is the fixed free `pageant_dragon` outside the 14-type roster (the outline says so), but MS-B03 requires core units to be in the roster and fielded by the reference. | `core` is springald x4 only; Dennis is `fixed[]` (free, `selectable:false`, name "Dennis") at x -27 z 0. | Reword the outline to "Core springald x4; fixed Dennis". | DESIGN-ERA-MED |
| AM-MED-06 | `puzzles.md` puzzle 4 "Mechanic fired: status_apply NOHEAL >= 3, healer kills >= 4" | No canonical counter exists for NOHEAL or healer kills; `heal_hp` counts only player-side healing and the puzzle roster has no healer, so ER9 (stored solution fires the taught mechanic) cannot be met. | `mechanicFired:{counter:"heal_hp", min:1}` (lint-valid, unfireable). | Add a canonical counter (event `status_apply`, status NOHEAL, enemy side; or healer kills) to `ms.schema.json` x-vocab.counters and point the puzzle at it. | DESIGN-CAMPAIGN (MS), SIM |
| AM-MED-07 | `puzzles.md` puzzle 5 "a script event sends them out when the first boulder lands" | Puzzle placements have no `id`, so the `order` op cannot name its group; the lint does not check puzzle scripts, the generator would. | Event `med_pz5_sally` (counter `props_siege` >= 1) orders group `sally`; the ten squires and two lancers are placed on `hold` in squads 2 and 3. | Allow an optional `id` on puzzle `placement` (squad map), or a `groupIds{squadId:id}` map on the puzzle enemy. | DESIGN-CAMPAIGN (MS) |
| AM-MED-08 | `missions_outline.md` mission 7 set-piece trigger `prop_ignited {type:"med_windmill"}`; `MS.md` 3.6.4 and H6 | MS-R15 rejects the event: it is in no list the lint reads (not existing, not in spec/M 3.12, not used by a canonical counter). | Local counter `med_windmill_hit` on the existing event `prop_damaged` where type = `med_windmill` (first damage to the windmill = the first pitch pot). | Add `prop_ignited` to the requested events the lint accepts, then switch the counter to it when M12 lands H6. | DESIGN-CAMPAIGN (MS), SIM |
| AM-MED-09 | `missions_outline.md` "Reference sketch" lines of missions 2 to 9 | The stated costs ("about 5,000", "about 7,300" ...) do not match the stat table of `rosters.md` section 2: the sketches cost M2 3912, M3 5010, M4 5680, M5 5580, M6 4165, M7 3394, M8 6460, M9 8060 groats, 45 to 75 percent of the budget, below the 85 percent floor (MS-B04). Only M1 (2,925 of 3,000) is right. | Each reference scales every type of the sketch by one factor (heroes and capped units fixed, rounding topped up with the cheapest types) to 92 to 94 percent of the budget. | Replace the sketch lines by the final reference armies of section 6 (or re-state the budgets). | DESIGN-ERA-MED, BALANCE |
| AM-MED-10 | `missions_outline.md` mission 5 marker `gate` (x 22, z 0) vs `arenas.md` row 5 and layout 5 | Camp 44 u from the gate, a 54 u curtain square on the east half of a 128 u arena and an 8 u moat put the gatehouse near x 8 to 15, not 22. | Marker kept as in the outline; garrison placed by zone (u, v), not by wall anchors. | Check against the recipe; give the recipe a named anchor for the gate and the wall walk (W-D23 anchors) and re-anchor the garrison. | WORLD, DESIGN-ERA-MED |
| AM-MED-11 | `missions_outline.md` mission 6 marker `bell` (x 24, z 0) vs `arenas.md` layout 6 | The bell tower is in the north-east corner of a 60 x 44 precinct (not on z 0), the gate is in the west wall and raiders come from outside it, while the standard zones put the enemy in the east. | Marker kept as in the outline; raids are `spawn` events at x -44 z 0 (west of the gate, x -30), the plague cart arrives at the east postern (x 30, z 0). Assumes the defenders hold the abbey side. | WORLD states the recipe's zone sides and the tower position; if the tower is not the prop nearest to the marker (M14 nearest-prop rule) move the marker. | WORLD, DESIGN-ERA-MED |
| AM-MED-12 | `CU.md` 3.11.2 (substitution part `med_foam_sword`) vs `MS.md` D-MS-17 / MS-F04 | A substitution part is not in any `unlockParts`, and MS-F04 rejects `rewardParts` rows that no reward lists, so the substitution part has no catalogue row (name, blurb). | M1 `rewards.substitution = {part, med_foam_sword}`; no `rewardParts` row. | MS-F04 should count substitution parts as used, then add the row. | DESIGN-CAMPAIGN (MS) |
| AM-MED-13 | `ms.schema.json` (additionalProperties false everywhere) | The brief asks for `_derived` / `_amend` fields in the JSON; they cannot pass MS-S01. | Marks live in section 5 as JSON pointers. | Allow optional `_derived` / `_amend` strings in the schema (mission, group, event, puzzle, beat, setpiece). | DESIGN-CAMPAIGN (MS) |
| AM-MED-14 | `missions_outline.md` section 4 foils for M5 and M8; `MS.md` MS-B11 | The foils are bot behaviours ("spreads arrows at the wall", "trebuchets at the front line") but `blind.swap` is a unit swap that must stay within 35 percent of the cost; no roster unit is within 35 percent of a battering_ram (260) or a trebuchet (480). | M5 swaps pikeman to longbowman (105 / 100); M8 swaps mangonel to springald (240 / 230). Every other mission swaps the unit that carries the taught mechanic. | Let `blind` carry a behaviour tag for the bot, or relax B11 for siege units. | DESIGN-CAMPAIGN (MS), TOOLS-VERIFY |

Adopted without change from `MS.md` section 6 (already logged there, so not new amendments): A1 (capture markers type `capture`: M4), A2 (defend_core `core` marker, no `hp` key: M6), A3 (`capture {need:3, hold:20}`, live ownership, no `holdAll`: M4), A4 (M7 is `escort` with `vip:"pageant_dragon"`, no `reachOnly`), A5 (set-piece triggers as counters: M2 `banner_fall_crowd`, M3 `brace_break` within 10 s, M4 `charge_hit` within 1.5 s, M8 `wave_spawns`), A6 (M5 star 3 tests `bolts`), A8 (M1 and M9 release their units with an `order` op next to the `beat` op), A12 (typed `teaching.exceptions`), A15 (M1 keeps `requiresModules M0 M2b` because its only event is a timed lite event). Open and untouched: A14 / OI-MS12 (the dragon landing trigger of M9 depends only on the GROUNDED state: local counter `med_dragon_landed` on `unit_air_state` state 6).

## 4. Conversion rules applied

* Text (briefings, victory, defeat, star lines, rules, beats, set-piece lines) is copied verbatim from `missions_outline.md` and `first_three_minutes.md`; a script checked that every string longer than 18 characters occurs in the three design files except the ones listed as derived in section 5.
* Ids: mission and puzzle ids are the ladder and `puzzles.md` ids; `rewardId` is `med_r<k>_<slug>` with the slugs of the CU ledger; reward quick-unlock ids are the CU ids (`med_qp_wobbly`, `med_qp_siege_season`, `med_qp_dry_summer`, `med_qp_dragon_day`; kind `style` for the style, `preset` for the three presets); the codex page ids `med_codex_heraldry`, `med_codex_armour`, `med_codex_infirmary`, `med_codex_siegecraft` are page slugs (infirmary is the outline's).
* Waves: M3 and M8 use `script.waves` (content-layer waves; M3 has no M14). M6 and M9 spawn their waves with timed `spawn` events at the outline's seconds (10/55/100 and 20/60/100): `script.waves` would deploy into zone B and spawn early when the field clears, and M6 raids come from outside the west gate. Both use `binding:true` so an empty field between waves does not end the battle.
* Coordinates: markers are the outline's. Enemy groups with a zone position use `{u,v}` of `zoneSpot` (zone B on the east: medium centre x 34.56, depth 17.28 along x, width 67.2; large centre x 48.64, depth 23.04; u = 0 is the front edge, v = -1..1 across); groups anchored to markers use `{marker, dx, dz}`; spawn points are absolute `{x,z}`.
* Star-3 ids (not in the outline): `med_thrift`, `med_brace_four`, `med_banners_three`, `med_borrowed_banner`, `med_cranks_slow`, `med_gate_stands`, `med_ladle`, `med_burn_engines`, `med_shell_dragon`.
* `inputs`: the reference run of M1, M2, M3 and M6 gets one input, `order hold` for the pikemen at t = 0 (the briefings say "keep the pikes on Hold"); other missions have `inputs:[]` (BALANCE adds scripted powers if the ER8 reference run needs them).
* `bots`: defaults except M5 `turtle [0.1, 1]` (outline text kept in `botsWhy`) and M9 `greedy [0, 0.4]` ("random armies lack bolts"). The "reference wins" and "autofill" percentages of outline section 4 are ER8 targets (VF), not `bots` fields.
* Teaching exceptions (untaught rule C08, to be re-checked when `stats.js` gives `carries`, OI-MS11): M1 pageant_dragon/fire; M4 trebuchet/arc (parked); M5 castellan/fire and prop med_oil_cauldron/fire (inert oil); M7 mangonel/arc and cinderwyrm/air (passive flyby).
* Beat trigger names (CU5 `era_medieval/teaching.js` must define the ones not in the CU5 shared table): `air_dive_first` `air_spawn` `armour_plink` `banner_fall` `barrel_explosion` `battle_end` `battle_start` `bell_stun_first` `bolt_pierce` `brace_break` `charge_first` `charge_in_lists` `crater_first` `dennis_approaches` `dragon_landed` `enemy_engines_fire` `engine_in_min_range` `first_contact` `gas_cloud_first` `heal_first` `horse_netted` `hover_banner` `hover_gate` `keep_bailout` `knight_unhorsed` `levy_panic` `noheal_first` `placement_start` `poison_first` `portcullis_exposed` `ram_contact` `reload_start` `scout_no_anti_armor` `select_ranged` `select_trebuchet` `sight_enemy_banner` `sight_oil_cauldron` `thatch_ignited` `unit_in_ford` `unit_on_cobble`.

### Reference armies (final cost against the outline sketch)

| mission | budget | outline sketch | final reference | % | composition |
|---|---|---|---|---|---|
| med_dress_rehearsal | 3000 | 2925 (97.5%) | 2925 | 97.5 | pikeman 12, longbowman 8, billman 5, peasant_levy 20 |
| med_tourney_trouble | 5200 | 3912 (75.2%) | 4807 | 92.4 | pikeman 17, billman 8, longbowman 15, peasant_levy 21, reeve 1 |
| med_ford_dithering | 7000 | 5010 (71.6%) | 6450 | 92.1 | crossbowman 18, pavise_bearer 11, pikeman 18, reeve 1, billman 8 |
| med_mizzlemoor_beacons | 8500 | 5680 (66.8%) | 7950 | 93.5 | knight_errant 11, lancer 8, knight_afoot 8, squire 12, standard_bearer 4 |
| med_castle_dour | 10500 | 5580 (53.1%) | 9740 | 92.8 | battering_ram 6, rolling_keep 1, sellsword 15, pikeman 18, longbowman 18, billman 12, poacher 7 |
| med_bell_tolls_lunch | 8500 | 4165 (49%) | 7825 | 92.1 | physician 8, bellringer 6, apothecary 8, abbess 1, pikeman 27, longbowman 16 |
| med_pennywhistle_blaze | 7500 | 3394 (45.3%) | 6914 | 92.2 | physician 9, pikeman 17, billman 13, longbowman 17, peasant_levy 27, reeve 1 |
| med_toll_bridge | 12000 | 6460 (53.8%) | 11115 | 92.6 | trebuchet 2, mangonel 4, pavise_bearer 19, crossbowman 22, springald 4, pikeman 19, physician 6, reeve 1 |
| med_grand_pageant | 14000 | 8060 (57.6%) | 12960 | 92.6 | springald 6, crossbowman 19, longbowman 19, pikeman 19, pavise_bearer 15, physician 8, standard_bearer 4, abbess 1, trebuchet 2, castellan 1 |

## 5. Every derived and amended item

`derived` = a required field the outline does not state (value computed or composed here); `amend` = see section 3. Pointers are RFC 6901 paths into `missions.json`; a pointer to an object means the named fields of that object.

| id | kind | JSON pointer | what and why |
|---|---|---|---|
| rewardParts | derived | `/rewardParts/med_lance_used` | blurb: the outline says "Workshop weapon class Lance (Used), couched, long reach"; "previously owned" is the only addition |
| rewardParts | derived | `/rewardParts/med_mantlet_shield` | blurb: the outline names the part ("Workshop offhand") and gives no blurb |
| rewardParts | derived | `/rewardParts/med_cauldron_helm` | blurb: the outline names the part ("Workshop helm") and gives no blurb |
| acts | derived | `/acts` | titles and blurbs from the act headings of missions_outline.md ("ACT I: PAGEANT SEASON" and the quoted tagline); the "Act I: " prefix follows the Ancient ACTS |
| med_dress_rehearsal | derived | `/missions/0/reference` | the outline sketch (pikeman 12, longbowman 8, billman 5, peasant_levy 20) sums to 2925 of 3000 groats and is used unchanged |
| med_dress_rehearsal | derived | `/missions/0/text` | blurb: the outline has no map-card blurb; composed from the mission rules and the Teaches line (copy owner COMEDY-MED) |
| med_dress_rehearsal | derived | `/missions/0/text/stars/2` | star-3 id (the outline names the star, not its id) |
| med_dress_rehearsal | derived | `/missions/0/blind` | outline section 4 foil is a behaviour ("pikes in a blob on Advance"); expressed as the swap that removes the brace |
| med_dress_rehearsal | derived | `/missions/0/enemy/groups/0` | group position (zone u,v or marker offset): front of zone B, left squad of three (outline: two squads of three, hold until the bugle) |
| med_dress_rehearsal | derived | `/missions/0/enemy/groups/1` | group position (zone u,v or marker offset): front of zone B, right squad of three |
| med_dress_rehearsal | derived | `/missions/0/enemy/groups/2` | group position (zone u,v or marker offset): trailing the lancers |
| med_dress_rehearsal | derived | `/missions/0/enemy/groups/3` | group position (zone u,v or marker offset): follows the squires, back of the zone |
| med_dress_rehearsal | derived | `/missions/0/objective` | objective.text: authored short line from the star-1 text (outline has none) |
| med_dress_rehearsal | derived | `/missions/0/inputs/0` | the reference run keeps the pikes on Hold (outline: "keep the pikes on Hold, points toward the horses") |
| med_dress_rehearsal | derived | `/missions/0/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_dress_rehearsal | derived | `/missions/0/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_dress_rehearsal | amend | `/missions/0/rewards/substitution` | AM-MED-12: the substitution part med_foam_sword (CU ledger) cannot have a rewardParts row: MS-F04 rejects rewardParts entries that no mission lists in unlockParts |
| med_tourney_trouble | derived | `/missions/1/reference` | outline sketch 3912 of 5200 (75 percent, below the 85 percent floor of MS-B04): counts scaled up round-robin to 4807 |
| med_tourney_trouble | derived | `/missions/1/text` | blurb: composed (the outline has no map-card blurb) |
| med_tourney_trouble | derived | `/missions/1/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_tourney_trouble | derived | `/missions/1/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_tourney_trouble | derived | `/missions/1/blind` | outline section 4 foil: "hits nearest, ignores banners"; expressed as a swap that removes the ranged banner-killers |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/1` | group position (zone u,v or marker offset): beside Valiant (outline: one beside Valiant), 3.5 u off the marker |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/2` | group position (zone u,v or marker offset): north flank (outline: one on each flank) |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/3` | group position (zone u,v or marker offset): south flank |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/4` | group position (zone u,v or marker offset): advances with the lancers; hired:true because the hog is a yeomen unit in a marrowby army |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/5` | group position (zone u,v or marker offset): front of zone B |
| med_tourney_trouble | derived | `/missions/1/enemy/groups/6` | group position (zone u,v or marker offset): behind the lancers |
| med_tourney_trouble | derived | `/missions/1/objective` | objective.text: authored line (80 characters at most) taken from the star-1 text; the outline has none |
| med_tourney_trouble | derived | `/missions/1/inputs/0` | the reference run braces its pikes on Hold (star 3 counts brace breaks) |
| med_tourney_trouble | derived | `/missions/1/teaching/beats/1` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_tourney_trouble | amend | `/missions/1/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_tourney_trouble | derived | `/missions/1/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_tourney_trouble | derived | `/missions/1/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_tourney_trouble | derived | `/missions/1/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_tourney_trouble | derived | `/missions/1/rewards` | codex page id med_codex_heraldry: the outline page "Heraldry For The Hopeless" and the CU substitution page "Heraldry" are read as one page |
| med_ford_dithering | derived | `/missions/2/reference` | outline sketch 5010 of 7000 (72 percent): counts scaled up to 6450 |
| med_ford_dithering | derived | `/missions/2/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_ford_dithering | derived | `/missions/2/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_ford_dithering | derived | `/missions/2/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_ford_dithering | derived | `/missions/2/objective` | objective.text: authored line (80 characters at most) taken from the star-1 text; the outline has none |
| med_ford_dithering | derived | `/missions/2/inputs/0` | the reference run braces its pikes on Hold (finale combines brace) |
| med_ford_dithering | derived | `/missions/2/teaching/beats/2` | who and text: the outline gives only the hint; text = hint |
| med_ford_dithering | derived | `/missions/2/teaching/beats/3` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_ford_dithering | amend | `/missions/2/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_ford_dithering | derived | `/missions/2/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_ford_dithering | derived | `/missions/2/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_ford_dithering | derived | `/missions/2/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_ford_dithering | derived | `/missions/2/rewards/substitution` | codex page id med_codex_armour (CU ledger: codex page "Armour"; the slug is derived) |
| med_mizzlemoor_beacons | derived | `/missions/3/reference` | outline sketch 5680 of 8500 (67 percent): counts scaled up to 7950 |
| med_mizzlemoor_beacons | derived | `/missions/3/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_mizzlemoor_beacons | derived | `/missions/3/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_mizzlemoor_beacons | derived | `/missions/3/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_mizzlemoor_beacons | derived | `/missions/3/blind` | outline section 4 foil is a behaviour ("cavalry straight at the sellswords through the bog"); expressed as the cost-neutral swap that removes the charge |
| med_mizzlemoor_beacons | derived | `/missions/3/enemy/groups/0` | sixteen sellswords split 6/5/5 over the three beacons (outline: hold on the beacons) |
| med_mizzlemoor_beacons | derived | `/missions/3/enemy/groups/3` | twelve poachers split 4/4/4, 7 u behind (enemy side of) each beacon |
| med_mizzlemoor_beacons | derived | `/missions/3/enemy/groups/6` | the borrowed bearer stands with the central guard; hired:true (marrowby unit in a Company army) |
| med_mizzlemoor_beacons | amend | `/missions/3/enemy/groups/7` | AM-MED-01: the M4 block of missions_outline.md lists no trebuchet, but sections 0.1 item 7, 1.1, 1.3 and 6.2 say M4 has parked disarmed trebuchets; count 2 and position are derived |
| med_mizzlemoor_beacons | derived | `/missions/3/objective` | objective.text; params follow MS amendment A3 (need 3, hold 20, live ownership; the outline says holdAll:true, hold:20, "cumulative") |
| med_mizzlemoor_beacons | amend | `/missions/3/powers` | AM-MED-02: god_powers.md section 2 says all nine missions leave powers ON, slot 3 says CAMPAIGN-MED may disable mud in M4 once the schema allows it (it does: COORD decision, MS 3.6.3); reason line is derived copy |
| med_mizzlemoor_beacons | derived | `/missions/3/teaching/beats/0` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_mizzlemoor_beacons | derived | `/missions/3/teaching/beats/3` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_mizzlemoor_beacons | derived | `/missions/3/teaching/beats/4` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_mizzlemoor_beacons | amend | `/missions/3/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_mizzlemoor_beacons | derived | `/missions/3/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_mizzlemoor_beacons | derived | `/missions/3/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_mizzlemoor_beacons | derived | `/missions/3/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_castle_dour | derived | `/missions/4/reference` | outline sketch 5580 of 10500 (53 percent): counts scaled up to 9740 (rolling_keep stays at its cap of 1) |
| med_castle_dour | derived | `/missions/4/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_castle_dour | derived | `/missions/4/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_castle_dour | derived | `/missions/4/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_castle_dour | derived | `/missions/4/blind` | outline section 4 foil: "spreads arrows at the wall, ignores the gate"; no roster unit costs within 35 percent of a battering_ram (260), so the swap that removes rams would raise MS-B11; pikeman to longbowman is cost-neutral (105 / 100) |
| med_castle_dour | derived | `/missions/4/enemy/groups/0` | castle geometry is not a marker: sixteen crossbowmen are placed by zone, 4 per spot (NE tower, SE tower, north wall, south wall); re-anchor to recipe anchors when W publishes them |
| med_castle_dour | derived | `/missions/4/enemy/groups/4` | twelve pavise bearers on the near wall, 4 per spot |
| med_castle_dour | derived | `/missions/4/enemy/groups/7` | group position (zone u,v or marker offset): bailey centre, two squads 8 u apart |
| med_castle_dour | derived | `/missions/4/objective` | objective.text: authored line (80 characters at most) taken from the star-1 text; the outline has none |
| med_castle_dour | derived | `/missions/4/script/events/0` | sortie position: the outline gives only t = 80 s and the units; spawn point is a postern in the north curtain wall, derived |
| med_castle_dour | derived | `/missions/4/teaching/beats/0` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_castle_dour | amend | `/missions/4/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_castle_dour | derived | `/missions/4/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_castle_dour | derived | `/missions/4/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_castle_dour | derived | `/missions/4/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_castle_dour | amend | `/missions/4/arena/markers` | AM-MED-10: marker gate (x 22, z 0) is kept as in the outline; arenas.md geometry (54 u curtain square on the east half, camp 44 u from the gate) puts the gate near x 8..15; verify against the recipe |
| med_castle_dour | amend | `/missions/4/blind` | AM-MED-14: no roster unit costs within 35 percent of a battering_ram, so the blind swap cannot remove the rams without raising MS-B11; a cost-neutral pikeman to longbowman swap is used |
| med_bell_tolls_lunch | derived | `/missions/5/reference` | outline sketch 4165 of 8500 (49 percent): counts scaled up to 7825 |
| med_bell_tolls_lunch | derived | `/missions/5/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_bell_tolls_lunch | derived | `/missions/5/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_bell_tolls_lunch | derived | `/missions/5/blind` | outline section 4 foil: "no physician, no gas answer" |
| med_bell_tolls_lunch | derived | `/missions/5/objective` | objective.text; params follow MS amendment A2 (core marker, hp key dropped); binding:true so an empty field between raids does not end the battle |
| med_bell_tolls_lunch | derived | `/missions/5/script/events/0` | raid entry point x -44 z 0: outside the abbey gate (west wall, x -30); outline gives times and units only. Assumes the defenders hold the abbey side (east) in this recipe |
| med_bell_tolls_lunch | derived | `/missions/5/script/events/2` | strike position (cloister centre) and team -1 (neutral, hurts both sides per the outline); r and dmg are the gas kind defaults |
| med_bell_tolls_lunch | derived | `/missions/5/script/events/4` | arrival point: the east-wall postern at x 30 z 0 (outline: arrives free through the postern at t = 100 s) |
| med_bell_tolls_lunch | derived | `/missions/5/inputs/0` | the reference run holds the pikes at the gate (outline: "the gate is yours: hold it") |
| med_bell_tolls_lunch | derived | `/missions/5/teaching/beats/2` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_bell_tolls_lunch | derived | `/missions/5/teaching/beats/3` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_bell_tolls_lunch | derived | `/missions/5/teaching/beats/4` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_bell_tolls_lunch | amend | `/missions/5/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_bell_tolls_lunch | derived | `/missions/5/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_bell_tolls_lunch | derived | `/missions/5/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_bell_tolls_lunch | derived | `/missions/5/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_bell_tolls_lunch | amend | `/missions/5/arena/markers` | AM-MED-11: marker bell (x 24, z 0) is kept as in the outline; arenas.md puts the bell tower in the NE corner of a 60 x 44 precinct and the gate in the west wall; verify the nearest-prop rule and which zone the defenders hold |
| med_pennywhistle_blaze | derived | `/missions/6/reference` | outline sketch 3394 of 7500 (45 percent): counts scaled up to 6914 |
| med_pennywhistle_blaze | derived | `/missions/6/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_pennywhistle_blaze | derived | `/missions/6/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_pennywhistle_blaze | derived | `/missions/6/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_pennywhistle_blaze | derived | `/missions/6/blind` | outline section 4 foil is a behaviour ("fights on thatch"); the star-3 mechanic is healing, so the swap removes the healers |
| med_pennywhistle_blaze | derived | `/missions/6/enemy/groups/0` | group position (zone u,v or marker offset): on the hill 45 u from the Float route (outline "on the hill, 45 u"), north rise taken as -z; flip z if the recipe puts the rise at +z |
| med_pennywhistle_blaze | derived | `/missions/6/enemy/groups/1` | shooters deployed in zone B |
| med_pennywhistle_blaze | derived | `/missions/6/enemy/groups/2` | screen at the front of zone B |
| med_pennywhistle_blaze | derived | `/missions/6/enemy/groups/3` | the "second group" that flanks at t = 70 s is read as this sellsword x8 group, held until the order event (see AM-MED-03) |
| med_pennywhistle_blaze | derived | `/missions/6/enemy/groups/4` | group position (zone u,v or marker offset): zone B |
| med_pennywhistle_blaze | derived | `/missions/6/objective` | objective.text; type escort and no reachOnly per MS amendment A4 (outline says protect_vip reachOnly:true) |
| med_pennywhistle_blaze | amend | `/missions/6/script/counters/0` | AM-MED-08: the outline and MS 3.6.4 use the requested event prop_ignited {type} for the windmill set-piece, but the lint (MS-R15) only reads existing, spec/M 3.12 and canonical-counter events, none of which lists it; the existing event prop_damaged {type} is used instead (first damage to the windmill = the first pitch pot). Switch the event to prop_ignited when M12 lands H6 |
| med_pennywhistle_blaze | derived | `/missions/6/script/events/0` | arson target: a cottage cluster west of the market square (the outline gives the times only) |
| med_pennywhistle_blaze | derived | `/missions/6/script/events/2` | arson target: a cottage cluster east of the market square |
| med_pennywhistle_blaze | derived | `/missions/6/script/events/3` | flyby entry point: the west edge, so the cameo crosses the green at the east (outline: crosses the map and exits) |
| med_pennywhistle_blaze | derived | `/missions/6/teaching/beats/1` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_pennywhistle_blaze | derived | `/missions/6/setpiece/shot` | from: the outline orbits the burning sails (a prop, 2 u off, 9 u high) which is not a named anchor; approximated by enemy_centroid until CU3 resolves prop anchors |
| med_pennywhistle_blaze | derived | `/missions/6/extraSetpieces/0/shot` | from/to: the outline gives "from the green looking up, the shadow sweeping across the thatch, 3 s" |
| med_pennywhistle_blaze | amend | `/missions/6/extraSetpieces/0/announcer` | AM-MED-04: the outline gives only Cassandra's line ("Lovely day for it.") for the second package; MS-P03 needs three voices, so the Brutus and Plato lines are derived copy for COMEDY-MED to replace |
| med_pennywhistle_blaze | amend | `/missions/6/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_pennywhistle_blaze | derived | `/missions/6/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_pennywhistle_blaze | derived | `/missions/6/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_pennywhistle_blaze | derived | `/missions/6/extraSetpieces/0/shot` | camera prose of the outline expressed as anchors and offsets; simSpeed 0.5 by CU3 policy |
| med_pennywhistle_blaze | derived | `/missions/6/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_toll_bridge | derived | `/missions/7/reference` | outline sketch 6460 of 12000 (54 percent): counts scaled up to 11115 (trebuchet stays at its cap of 2) |
| med_toll_bridge | derived | `/missions/7/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_toll_bridge | derived | `/missions/7/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_toll_bridge | derived | `/missions/7/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_toll_bridge | derived | `/missions/7/blind` | outline section 4 foil is a behaviour ("trebuchets at the front line"); the trebuchet cannot be swapped at a comparable cost (480 vs 230 or less), so the swap removes the mangonel arc |
| med_toll_bridge | derived | `/missions/7/objective` | objective.text: authored line (80 characters at most) taken from the star-1 text; the outline has none |
| med_toll_bridge | derived | `/missions/7/script/waves/list/2/groups/0` | far-bank hold position (zone B east of the river) |
| med_toll_bridge | derived | `/missions/7/script/waves/list/2/groups/1` | far-bank hold position |
| med_toll_bridge | derived | `/missions/7/script/waves/list/2/groups/2` | group position (zone u,v or marker offset): front of the far bank (a wave with placed groups places all of them) |
| med_toll_bridge | derived | `/missions/7/script/waves/list/3/groups/0` | far-bank hold position |
| med_toll_bridge | derived | `/missions/7/script/waves/list/3/groups/1` | group position (zone u,v or marker offset): under/at mid-span of the bridge at the toll booth (outline: rises under the bridge with the wave); the deck cell may need to be a recipe anchor |
| med_toll_bridge | derived | `/missions/7/script/waves/list/3/groups/2` | group position (zone u,v or marker offset): front of the far bank |
| med_toll_bridge | derived | `/missions/7/teaching/beats/0` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_toll_bridge | derived | `/missions/7/teaching/beats/3` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_toll_bridge | derived | `/missions/7/extraSetpieces/0/stinger` | secs: the outline says only "a tuba wah" |
| med_toll_bridge | amend | `/missions/7/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_toll_bridge | derived | `/missions/7/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_toll_bridge | derived | `/missions/7/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_toll_bridge | derived | `/missions/7/extraSetpieces/0/shot` | camera prose of the outline expressed as anchors and offsets; simSpeed 0.5 by CU3 policy |
| med_toll_bridge | derived | `/missions/7/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_toll_bridge | derived | `/missions/7/rewards/primary` | codex page id med_codex_siegecraft (the outline gives the page title "Siege Engines: A Guide For The Late"; the slug is derived) |
| med_toll_bridge | amend | `/missions/7/blind` | AM-MED-14: no roster unit costs within 35 percent of a trebuchet (480), so the arc foil swaps the mangonel; the outline foil (trebuchets at the front line) is a bot behaviour |
| med_grand_pageant | derived | `/missions/8/reference` | outline sketch 8060 of 14000 (58 percent): counts scaled up to 12960 (springald at its cap of 6, trebuchet at 2) |
| med_grand_pageant | derived | `/missions/8/text` | text.blurb: the outline has no map-card blurb; composed from the objective and the Teaches line (copy owner COMEDY-MED) |
| med_grand_pageant | derived | `/missions/8/text/stars/2` | star-3 id: the outline names the star, not its id |
| med_grand_pageant | derived | `/missions/8/text/reward` | reward.blurb: composed from the reward line of the outline (the title is the outline title) |
| med_grand_pageant | derived | `/missions/8/fixed/0` | position: front of the player zone; the outline lists Dennis as "core x1" but also as the fixed free unit outside the 14-type roster, and MS-B03 forbids a core unit outside the roster (see AM-MED-05) |
| med_grand_pageant | derived | `/missions/8/blind` | outline section 4 foil: "no anti-air in the army" |
| med_grand_pageant | derived | `/missions/8/objective` | objective.text: authored line (80 characters at most) taken from the star-1 text; the outline has none |
| med_grand_pageant | derived | `/missions/8/script/events/1` | entry point: the east edge (zone B side); wyverns arrive by air from the same edge |
| med_grand_pageant | derived | `/missions/8/rewards` | codex: "all remaining codex pages" resolved to the five units no earlier mission opens (billman longbowman peasant_levy cinderwyrm wyvern) |
| med_grand_pageant | derived | `/missions/8/teaching/beats/1` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_grand_pageant | derived | `/missions/8/teaching/beats/2` | the outline gives this beat as a hint only: who (plato, the explainer voice) and text (= the hint) are derived |
| med_grand_pageant | amend | `/missions/8/reference` | AM-MED-09: the outline reference sketch costs far less than the 85 percent floor of MS-B04 (see the notes table); counts scaled proportionally, heroes and capped units fixed |
| med_grand_pageant | derived | `/missions/8/teaching/beats` | trigger machine names chosen for the prose triggers of the outline (shared CU5 names where they exist: brace_break banner_fall armour_plink reload_start charge_first air_spawn); the others are new Medieval entries for era_medieval/teaching.js triggers |
| med_grand_pageant | derived | `/missions/8/setpiece/shot` | camera prose of the outline expressed as anchors and offsets [dx, height, dz]; anchors limited to player_line, enemy_centroid, markers of this mission and unit:<defId>; simSpeed 0.5 by CU3 policy |
| med_grand_pageant | derived | `/missions/8/extraSetpieces/0/shot` | camera prose of the outline expressed as anchors and offsets; simSpeed 0.5 by CU3 policy |
| med_grand_pageant | derived | `/missions/8/text/stars/2/id` | star-3 id: the outline names the star, not its id |
| med_stake_your_claim | derived | `/puzzles/0` | hint and goalText: composed from "The trick" and the goal line of puzzles.md; blurb = the blurb seed |
| med_stake_your_claim | derived | `/puzzles/0/enemy` | placements: lancers x5 in a line at x = 40 (the outline: 40 u east of the ford), squires x4 behind at x = 43; spacing 3.6 / 1.8 u |
| med_stake_your_claim | derived | `/puzzles/0/bonus` | bonus id |
| med_stake_your_claim | derived | `/puzzles/0/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of plato (copy owner COMEDY-MED) |
| med_standard_deviation | derived | `/puzzles/1` | hint and goalText composed from "The trick" of puzzles.md; blurb = the blurb seed |
| med_standard_deviation | derived | `/puzzles/1/enemy` | placements: a 5 x 3 close block centred 22 u from the player edge (x -25.9 + 22 = -3.9): fourteen squires and the bearer in the middle of the middle rank |
| med_standard_deviation | derived | `/puzzles/1/bonus` | bonus id and helper: keptAlive(longbowman, 3) |
| med_standard_deviation | derived | `/puzzles/1/mechanicFired` | min 1 only: "rout events >= 8" of puzzles.md has no canonical counter |
| med_standard_deviation | derived | `/puzzles/1/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of brutus (copy owner COMEDY-MED) |
| med_oil_you_need | derived | `/puzzles/2` | hint and goalText composed from "The trick" of puzzles.md; blurb = the blurb seed |
| med_oil_you_need | derived | `/puzzles/2/arena` | props: eight pitch barrels in two rows of four lining the lane (x 33..21, z +-2.5) and two cauldrons at (27, -5.5) and (19, 5.5) |
| med_oil_you_need | derived | `/puzzles/2/enemy` | placements: two rams in a column at x 40 and 43.2, six sellswords as two escort files at z +-3.5 |
| med_oil_you_need | derived | `/puzzles/2/bonus` | bonus id |
| med_oil_you_need | derived | `/puzzles/2/mechanicFired` | "prop_explosion events >= 3" has no canonical counter; kills by fire >= 4 is the canonical fire_kill |
| med_oil_you_need | derived | `/puzzles/2/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of cassandra (copy owner COMEDY-MED) |
| med_physician_heal_thyself | derived | `/puzzles/3` | hint and goalText composed from "The trick" of puzzles.md; blurb = the blurb seed |
| med_physician_heal_thyself | derived | `/puzzles/3/enemy` | placements: knight_afoot x6 in a front rank at x 26.5, physician x3 behind at x 30, the abbess at x 33.5 |
| med_physician_heal_thyself | derived | `/puzzles/3/bonus` | bonus id |
| med_physician_heal_thyself | amend | `/puzzles/3/mechanicFired` | AM-MED-06: puzzles.md #4 fires "status_apply NOHEAL >= 3, healer kills >= 4" which has no canonical counter; heal_hp (player-side healing) is the only healers counter and the roster has no healer, so ER9 cannot be met until a counter such as noheal_applied is added to the MS vocabulary |
| med_physician_heal_thyself | derived | `/puzzles/3/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of plato (copy owner COMEDY-MED) |
| med_counterweight_calculus | derived | `/puzzles/4` | hint and goalText composed from "The trick" of puzzles.md; blurb = the blurb seed |
| med_counterweight_calculus | amend | `/puzzles/4/script` | AM-MED-07: the sally is released when the first boulder lands (puzzles.md #5) but puzzle placements carry no group id, so op order names a group ("sally") that no placement declares; proposed fix: an optional id on puzzle placements, or a squadId map on the puzzle enemy |
| med_counterweight_calculus | derived | `/puzzles/4/arena` | props: the gate stub (hp 2400) at x 38 between two wall segments |
| med_counterweight_calculus | derived | `/puzzles/4/enemy` | placements: squire x10 in two ranks of five behind the gate at x 42 and 43.8, lancer x2 at x 45.6, all on hold until the sally event |
| med_counterweight_calculus | derived | `/puzzles/4/bonus` | bonus id and helper: keptAlive(trebuchet, 1) |
| med_counterweight_calculus | derived | `/puzzles/4/mechanicFired` | counter props_siege (structure damage in hit points) with the 1800 threshold of puzzles.md; the counter belongs to the gates mechanic, the puzzle names arc |
| med_counterweight_calculus | derived | `/puzzles/4/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of plato (copy owner COMEDY-MED) |
| med_mind_the_gap | derived | `/puzzles/5` | hint and goalText composed from "The trick" of puzzles.md; blurb = the blurb seed |
| med_mind_the_gap | derived | `/puzzles/5/script` | event: the second flight of two wyverns at t = 20 s from the east edge |
| med_mind_the_gap | derived | `/puzzles/5/enemy` | placements: the first flight (wyvern x2, t = 0) at the east edge x 30, hoardling x10 bait in two ranks at x 24..25.8; the second flight is the t = 20 s spawn event |
| med_mind_the_gap | derived | `/puzzles/5/bonus` | bonus id and helper: noLoss([springald]) |
| med_mind_the_gap | derived | `/puzzles/5/firstSightBeat` | the whole beat: puzzles.md asks for "a one-line first-sight beat that names the mechanic" and gives no text; composed in the voice of cassandra (copy owner COMEDY-MED) |

Totals: 176 derived, 19 amend marks.

## 6. Requests of the design files answered here

| source | request | answer |
|---|---|---|
| `missions_outline.md` 6.2 | `override.disarm`, `override.disableAbilities` on enemy groups | used: M4 `parked_engines` (disarm), M5 castellan (`call_strike`) |
| `missions_outline.md` 6.2 | VIP `def` override (hp, speed) | `fixed[0].override {hp:260, speed:1.6}` in M7 (closed override, MS 3.6.3) |
| `missions_outline.md` 6.2 | scripted free arrival (plague cart) | M6 event `med_m6_plague_cart`: `spawn` team player, `free:true`, t = 100 |
| `missions_outline.md` 6.3 | strike with a status payload (Dennis pause) | rejected by MS 3.6.3; the pause is a render-only clip, stated in the notes of `med_sp_dennis_meets_dragon` |
| `missions_outline.md` 6.1, 6.4, 6.5, 6.6 | SIM parameters, rosters column, HUD strip, props | not mission-file content; unchanged here |
| `god_powers.md` slot 3 | `powers.disable` for M4 | accepted (AM-MED-02) |
| `first_three_minutes.md` | beat ids, order, triggers, texts, hints, pointers | mission 1 `teaching.beats` and `firstThreeMinutes` (fresh and returning lists come from `context.json`, equal to sections 1.1 and 2.1; milestones 32 / 80 / 96 / 100 / 165 / 175 / 180 s from its totals line) |
| `puzzles.md` | six puzzles, teaching beat per puzzle | `puzzles[]`; the first-sight lines are derived copy |
| `arenas.md` section 3 | binding ladder | ids, objectives and arenas equal (MS-I04 passes) |

## 7. Open items

| item | owner | when |
|---|---|---|
| Resolve AM-MED-01 to AM-MED-14 (rows marked DESIGN-ERA-MED / DESIGN-CAMPAIGN / WORLD) | named in section 3 | before ms_gen is built (end of P0 for the design rows) |
| Replace derived copy (blurbs, reward blurbs, hint-only beat texts, puzzle hints and first-sight lines, `powers.reasons`, objective lines) | COMEDY-MED | P1 copy pass |
| Re-run `ms_lint` when `era_medieval/stats.js` exists (C08 untaught rule becomes active; exceptions above may need additions) | DESIGN-CAMPAIGN | with OI-MS11 |
| Reference armies: play them (ER8) and retune counts or budgets | BALANCE | P2 |
| Zone and wall coordinates of the garrison (M5), raids (M6), mangonel hill and arson clusters (M7), far bank (M8), spawn edges (M9): confirm against the recipes | WORLD | P1 recipes |
