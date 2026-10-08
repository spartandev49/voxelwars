# Medieval campaign: the nine missions (binding design, DESIGN-ERA-MEDIEVAL part 2)

Status: binding for CAMPAIGN-MED (`missions.json`), COMEDY-MED, AUDIO, UI (teaching data) and the MS lint. It implements the binding ladder of `arenas.md` section 3 (mission ids, arenas, objectives, teaches, player and enemy rosters) and uses only unit and faction ids from `rosters.md` / `factions.md` (34 units, six factions: `marrowby yeomen gatehouse bellfount free_company wyrmkin`), arena ids from `arenas.md` and prop ids from `props.md` (38). Where this document differs from the ladder or the roster files, section 0.1 lists the difference and the reason. Written against plan.md v3.1 sections 4 (modules), 5 (rigs), 8 (MS schema and curve rules), 10, 11, 13.

Synthesis: the ladder and the arena set are part 1's (eight objective types, one new mechanic each, a player anti-cavalry tool before any cavalry); star-3 tests, set-pieces, three-voice copy, teaching beats and the Dennis arc are this document's (drawing on proposal A's spectacle and proposal B's "test the mechanic you were taught" chain).

Medieval needs only modules #1..#13 (E-FREEZE prefix: M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e). It never touches M8 vehicles, M9 cover, M11 mines, M4 shields, M5 cloak, M6b EMP, hitscan, blink or hover.

## 0. Conventions used in every block

### 0.1 Differences from the ladder and the roster files (each with its reason)

1. **Mission ids** are the ladder's: `med_dress_rehearsal`, `med_tourney_trouble`, `med_ford_dithering`, `med_mizzlemoor_beacons`, `med_castle_dour`, `med_bell_tolls_lunch`, `med_pennywhistle_blaze`, `med_toll_bridge`, `med_grand_pageant`. None collides with a puzzle id (`puzzles.md` ids are different; mission and puzzle ids share the flat `progress.stars` map).
2. **Star-3 tests** use the ladder's "may test" column, chosen as follows: M1 thrift, M2 brace, M3 banner, M4 banner, M5 reload, M6 gates, M7 heal, M8 fire, M9 artillery. Every one is a mechanic taught in an earlier mission.
3. **M3 roster adds `longbowman`** to the ladder's list (the blind foil "arrows against plate" needs an archer type) and **M4 roster adds `knight_afoot`** (the player meets the bailout product on his own side). Types stay <= 13.
4. **M5 adds a scripted postern sortie** at t = 80 s (pavise_bearer x6, crossbowman x6) so a siege is never silent; **M6 adds one `great_hog`** to the third raid ("hired as security") because the finale must combine brace with gates and banner and no Mostly Paid Company unit charges; **M8 W3 uses `trebuchet` x1 plus `mangonel` x2** so enemy crater makers stay at two (the Lady is the second).
5. **`med_pageant_float`, `med_dragon_perch`, `med_bell_wreck`, `med_standard_pole`** (proposal props) are NOT used because `props.md` has no such rows. The Float is the `pageant_dragon` unit; the Cinderwyrm starts perched on `med_keep`; the bell drop leaves a crater only.
6. **Display names** follow `factions.md` after its rename pass: "Bellfount Abbey" (not "Chapter", a franchise term) and "The Mostly Paid Company" (id `free_company`; "Free Company" is another game's feature name). This document says "Bellfount" and "the Mostly Paid Company" in prose and uses the ids in data.
7. **First-mission codes in `rosters.md`** that differ from this ladder: `trebuchet` first appears in M4 as a parked, disarmed enemy engine (roster: M8 P); `great_hog` also appears in M6 E; `bridge_troll`, `coin_golem`, `lady_counterweight`, `hoardling` first appear in M8 as the roster says; `wyvern` first appears in M9 as the roster says; `springald` M5 E as the roster says; `knight_afoot` appears on the player side in M4. All 34 units appear (section 1.3).
8. **Currency** is groats (`fmtCost`, symbol "gr").

### 0.2 Schema choices (MS fields this document defines once)

- **par**: `{type:'cost'|'time'|'none', value}`. `cost` = the spend ceiling of the thrift star (briefing shows "Spend at most X"); `time` = median clear time of the `reference` army, shown on briefing and results as "Par 150 s"; `none` where the mission is a fixed-duration hold or a wave count. Money is always in `fmtCost` units.
- **Star 1** = win. **Star 2** = `{id:'half', helper:'aliveCostFrac', args:[0.5]}` (the Ancient generic test: at least half the army by cost alive at the end; summoned and bailed-out units do not count in start or end cost). **Star 3** = the mission's own test, a helper from the closed vocabulary.
- **Closed vocabulary used** (from the brief): `usedMechanic(id,n)`, `thrift(par)`, `keptAlive(def,n)`. Available but not needed by any Medieval star: `noLoss`, `underTime`, `vipSurvived`, `gateBrokenBy`, `killedFirst`, `shieldsBroken`, `suppressed`. (`vipSurvived` is the implicit loss condition of M7; `keptAlive('pageant_dragon',1)` is the optional "Dennis lives" flourish in M9, shown on the results screen but not a star.)
- **Mechanic ids for `usedMechanic`** (one per mission, each with a tracker counter; these are the generic `MissionTracker` additions of CU gap 3):

| mechanic id | taught in | counter that `n` counts |
|---|---|---|
| `brace` | M1 | cavalry or beast charges broken by a braced block (`brace_break`: the charger loses its momentum on a braced pike) |
| `colours` | M2 | enemy banner falls caused by the player's side (`banner_fall`, enemy team) |
| `bolts` | M3 | armour-piercing hits (weapon ap >= 0.5) on a target with armor >= 0.4 |
| `charge` | M4 | `charge.hit` = charge-boosted hits; `charge.unhorse` = enemy `bailout` events |
| `gates` | M5 | structure damage dealt to team-owned props (hit points) |
| `healers` | M6 | hit points healed (`unit_heal` sum); `healers.poison` = poison ticks applied |
| `fire` | M7 | kills by fire, oil or burning props |
| `arc` | M8 | `arc.shell_hit` = indirect-fire shells landing within 4 u of an enemy; `arc.crater` = craters made |
| `air` | M9 | kills of air-layer units |

- **Six more helpers proposed (the allowed maximum)**: `aliveCostFrac(f)` (star 2), `propStanding(type)` (the named prop type still has hit points at the end), `burnKills(tag,n)` (fire kills restricted to a unit tag), `shellsOnTarget(def,n)` (arc shells landed on a unit def), `hitsDuringReload(n)` (hits dealt to a unit in its reload state), `bannerDownBy(def,s)` (the first banner of that def falls before s seconds).
- **Set-piece package** = `{id, sim event, camera shot {from,to,hold,ease}, announcer slot, three sample lines, stinger kind, sfx[]}`. Announcer slot is always category `campaign_<missionId>` sub `setpiece`, priority 5, `bypassAlternation`. Shots run in real time while the sim runs at 0.5x; possession, aim, photo mode and cinematic mode defer the shot; Esc/click skips it; Reduce Motion turns every dolly into a cut. Camera anchors are named (`player_line`, `enemy_centroid`, markers); heights are in units above ground.
- **Stinger kinds** (AUDIO taxonomy): `comic` (brass or woodwind gag), `hit` (single heavy accent), `swell` (rising build), `dread` (low sustained), `fanfare` (resolved brass). Each ducks music by 6 dB for 700 ms; only the dragon and the finale bypass the limiter.
- **Voice rules for every line below**: Brutus = one ALL-CAPS word per line (a name may add another), exclamation marks; Plato = ends on a question or a measured understatement; Cassandra = short flat sentences, "I said". Briefing lines are the three-voice opener; set-piece lines are the live announcer lines for the moment.
- **Teaching beats** use CU5 fields; `basics:true` beats belong to the once-ever layer (`seen.basics`) and are skipped for a returning player; every other beat is an era beat (`seen.beats[id]`, once per era). Medieval beat ids are `med_*`.
- **Group overrides requested** (section 6): `override.disarm:true` (parked and harmless) and `override.disableAbilities:[ids]` on enemy `groups[]`; mission-data only.
- **Marker coordinates** are in units (arena medium = 96 u square, large = 128 u; markers must satisfy |x|,|z| <= 48 / 64).

## 1. The ladder at a glance

| # | id | title | act | objective | arena (size) | player vs enemy | teaches | star-3 test (taught in) | requiresModules |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `med_dress_rehearsal` | Dress Rehearsal (Swords Are Foam) | I | eliminate | `med_pageant_green` (M) | yeomen vs marrowby | BRACE and HOLD | `thrift(2250)` (nothing precedes) | M0 M2b |
| 2 | `med_tourney_trouble` | Lances, Allegedly Blunted | I | kill_general | `med_tourney_field` (M) | yeomen vs marrowby | BANNER and ROUT (colours) | `usedMechanic('brace',4)` (M1) | M0 M13 |
| 3 | `med_ford_dithering` | The Ford at Dithering (Please Hold Still II) | I (finale) | hold_hill | `med_ford_of_dithering` (M) | yeomen+gatehouse vs marrowby column | ARMOUR and RELOAD (bolts) | `usedMechanic('colours',3)` (M2) | M1 M2 M13 |
| 4 | `med_mizzlemoor_beacons` | Beacons of Mild Concern | II | capture (3) | `med_mizzlemoor` (M) | marrowby vs free_company | CHARGE and UNHORSE | `bannerDownBy('standard_bearer',75)` (M2) | M2b M13 M14 |
| 5 | `med_castle_dour` | Please Knock (We Did) | II | destroy (gate + portcullis) | `med_castle_dour` (L) | free_company+yeomen vs gatehouse garrison | GATES and RAMS | `hitsDuringReload(10)` (M3) | M2 M12 M14 (M13 soft) |
| 6 | `med_bell_tolls_lunch` | The Bell Tolls For Lunch | II (finale) | defend_core (bell tower, 150 s) | `med_bellfount_abbey` (M) | bellfount+yeomen vs free_company | HEALERS and POISON | `propStanding('med_castle_gate')` (M5) | M6a M12 M13 M14 |
| 7 | `med_pennywhistle_blaze` | Pennywhistle Is Not On Fire (Yet) | III | protect_vip (escort the Float) | `med_pennywhistle` (M) | yeomen+bellfount vs free_company+gatehouse | FIRE and OIL | `usedMechanic('healers',1000)` (M6) | M6a M12 M14 |
| 8 | `med_toll_bridge` | The Toll Bridge Is Currently Closed (For You) | III | survive_waves (4) | `med_long_bridge` (M) | mixed vs "the rival guild hired everybody" | ARTILLERY (arc fire) | `burnKills('siege',2)` (M7) | M10 M12 M14 |
| 9 | `med_grand_pageant` | The Grand Pageant (Real Dragon Edition) | III (finale) | kill_general (the Cinderwyrm) | `med_dour_courtyard` (M) | allied pageant vs wyrmkin | AIR and ANTI-AIR | `shellsOnTarget('cinderwyrm',1)` (M8) | M7 M10 M13 M14 M15 |

Objective types: eliminate, kill_general (x2), hold_hill, capture, destroy, defend_core, protect_vip, survive_waves = 8 distinct (rule: >= 5).

### 1.1 Curve audit

| rule (plan s8) | result |
|---|---|
| at most one new mechanic taught per mission | M1 brace, M2 colours, M3 bolts, M4 charge (with the horse as a separate pool), M5 gates, M6 healers/poison, M7 fire/oil, M8 arc, M9 air. Enemy units carrying an untaught mechanic are absent or inert: M1 to M3 use `lancer` (no bailout), `knight_errant` appears first in M4 (player); the M4 enemy trebuchets are parked and disarmed; M5 oil cauldrons are the inert "pending" variant and the castellan's oil call is disabled; M6 has no fire (no mangonel, no oil); M7 is the first mission with mangonels and armed oil barrels; M8 is the first with live trebuchets; the M7 flyby is passive and untargetable |
| star 3 tests only earlier mechanics | thrift (M1), brace (M2), colours (M3), colours (M4), bolts (M5), gates (M6), healers (M7), fire (M8), arc (M9) |
| act finales combine >= 2 earlier mechanics | M3: brace + colours (+ new bolts). M6: gates + brace (hog) + colours (+ new healers). M9: bolts (anti-air) + healers + colours + fire + arc (+ new air) |
| set-piece package | 9 of 9 (M7, M8 and M9 carry a second, smaller package) |
| real reward | primaries: 2 mutators (M1, M6), 4 parts (M2, M3, M4, M9), 2 Quick unlocks (M5, M7), 1 codex write (M8); plus-items: 4 more parts (M5, M6, M7, M8), 2 more Quick unlocks (M4 style, M9 preset), codex pages in every mission, 9 titles; ledger in section 3 |
| headline coverage (plan s13) | siege/gates M5, charge/brace M1 and M4, banners/morale M2, healers/poison M6, dragon M9; fire/oil M7 and arc M8 extra |
| landing order | latest HARD module per mission never exceeds #13; see 1.2 |

### 1.2 Module landing check (E-FREEZE prefix #1..#13)

Landing numbers: M0 #1, M1 #2, M3 #3, M2 #4, M2b #5, M10 #6, M6a #7, M7 #8, M12 #9, M14 #10, M13 #11, M15 #12, M17e #13.

| mission | modules needed (landing #) | latest | note |
|---|---|---|---|
| 1 | M0 (1), M2b (5); mission uses only existing brace, hold, charge | #5 | **plumbing slice** (end of P1 = #1..#5) can run mission 1 through the real UI |
| 2 | M0, M13 banner (11) | #11 | headline mechanic (banner) first appears here; margin to E-FREEZE = M15 and M17e (2 modules). Part 1 asks SIM to pull M13 earlier (it depends only on M0); fallback "Colours-lite": existing `aura rally` plus the `officer` death shock x1.5, tell rendered by RENDER only |
| 3 | M1 (2), M2 mag/reload (4), M13 (11) | #11 | `hold_hill` is existing |
| 4 | M2b (5), M14 capture and script events (10), M13 bailout (11) | #11 | `override.disarm` needed (request 6.2) |
| 5 | M2 (4), M12 gates and structDmg (9), M14 destroy props and script (10); M13 only for the Rolling Keep's bailout (soft: the keep still plays without it) | #10 hard / #11 soft | `override.disableAbilities` needed |
| 6 | M6a (7), M12 (9), M14 defend_core (10), M13 gas (11) | #11 | |
| 7 | M6a (7), M12 explosive and flammable props (9), M14 escort and scripted strikes (10) | #10 | |
| 8 | M10 arc and craters (6), M12 structDmg and `editTerrain` (9), M14 waves (10) | #10 | enemy crater makers capped at 2; player trebuchets capped at 2 |
| 9 | M10 (6), M7 air layer (8), M14 binding kill_general and script events (10), M13 auras (11), M15 set-piece dispatcher (12) | #12 | dragon first appears (passive cameo) in M7 and actively in M9: margin 4 modules |

### 1.3 Roster coverage check (every unit in a campaign mission)

| faction | units and where they first appear |
|---|---|
| marrowby | squire M1 E, lancer M1 E, pageant_dragon M1 E (also M7 VIP, M9 P), standard_bearer M2 E, ser_valiant M2 E (general), knight_afoot M3 E, knight_errant M4 P |
| yeomen | billman, pikeman, longbowman, peasant_levy M1 P; reeve M2 P; great_hog M2 E |
| gatehouse | crossbowman M3 P, pavise_bearer M3 P, trebuchet M4 E (parked), rolling_keep M5 P, castellan M5 E, springald M5 E |
| bellfount | bellringer, physician, apothecary, abbess M6 P, plague_cart M6 (arrives at 100 s) |
| free_company | sellsword M4 E, poacher M4 E, battering_ram M5 P, mangonel M7 E, lady_counterweight M8 E |
| wyrmkin | cinderwyrm M7 E (flyby cameo), hoardling M8 E, coin_golem M8 E, bridge_troll M8 E, wyvern M9 E |

## 2. Per-mission blocks

Notation: `[B]` Brutus, `[P]` Plato, `[C]` Cassandra. Money is groats. "Reference sketch" is indicative only; CAMPAIGN-MED fixes numbers against the stat table in `rosters.md` section 2 (85 to 100 percent of budget, <= 16 types).

### ACT I: PAGEANT SEASON ("Bunting, lances and a rota nobody follows")

#### Mission 1: `med_dress_rehearsal`, "Dress Rehearsal (Swords Are Foam)"

- **Act / mood**: I / `festive`.
- **Objective**: `eliminate {}`. **Arena**: `med_pageant_green`, medium, seed 21; marker `bugle` (waypoint, x 0, z 24, r 3; camera anchor). Recipe dressing: two grandstands full of crowd props, maypole, bunting, decorative tilt barrier, haystacks, pavilions.
- **Player**: `yeomen`; roster `pikeman`, `longbowman`, `billman`, `peasant_levy` (4 types; no caps). **Budget** 3,000. **Par** `{type:'cost', value:2250}`. **Core** pikeman x8.
- **Reference sketch**: pikeman 12, longbowman 8, billman 5, peasant_levy 20 (about 2,900).
- **Enemy**: `marrowby`, style "hired actors", difficulty normal, no general, no waves, no boss. Groups: `lancer` x6 (two squads of three, order `hold` until the bugle script), `squire` x14 (advance, trailing the lancers), `pageant_dragon` x1 (mascot, follows the squires; its fire panic is neither taught nor tested). **Time limit** 240 s.
- **Teaches**: BRACE and HOLD. A pikeman standing still on Hold braces: pole butt in the ground, tip dipping with a glint, chevron decal under the block; a charge into it loses its momentum and the charger takes the bonus damage (counter row R1). **Tests**: nothing (first mission).
- **Star 2**: half the army by cost alive. **Star 3**: `thrift(2250)`: win while spending at most 2,250 of the 3,000.
- **Set-piece** `med_sp_wrong_cue`
  - Sim event: script `beat {id:'wrong_cue'}` at t = 16 s: the bugle sounds four seconds early and the lancer squads are released from `hold` to `advance`.
  - Camera: from `player_line` centroid, 7 u behind, 1.4 u high, looking forward; to the lancer squads' centroid, 1 u high (a low dolly toward the charge); hold 4.0 s; ease in-out; ends early on the first `brace_break` if it comes sooner.
  - Slot `campaign_med_dress_rehearsal` / `setpiece`. [B] "THE BUGLE WENT OFF EARLY! Four seconds early! The horses have HEARD it and the horses are COMMITTED!" [P] "A bugle keeps its own timetable. Does a cavalry charge keep any?" [C] "The bugle was early. I said so at the rehearsal. This is the rehearsal."
  - Stinger `med_sting_wrong_cue`, kind `comic`: a flat trumpet crack falling into snare and tom hits, 2.2 s.
  - Sfx: `med_trumpet_crack`, `med_hoof_thunder` (swell), `med_lance_shatter` x3, `med_crowd_ooh`.
- **Reward** `med_r1_foam_swords`, type **mutator**: unlocks `med_foam_swords` ("Pageant Rules": every weapon is foam). Also: title "Extra With Lines"; codex pages `pikeman`, `lancer`, `squire`, `pageant_dragon`. Text: "Foam swords for Quick Battle. Damage down, knockback up, and a bonk on every hit. The foam was supplied by the production."
- **Teaching beats**
  - basics: `b_place_line` (placement_start, [P]: "Pick a card, then drag across the field to draw a line. It looks simple because it is."), `b_fight` (battle_start, [B]: "FIGHT! Press the button, watch the line, and try not to narrate it."), `b_speed` (battle_start + 8 s, [C]: "Space pauses. The speed keys change the pace. Nobody asked me, so I am telling you."), `b_powers` (first_contact + 4 s, [C]: "Keys 1 to 6 are your god powers. Press 1."), `b_done` (battle_end, [B]: "THAT is how you win a battle! Do it again, smarter, for the stars!").
  - era: `med_brace_place` (placement_start, after `b_place_line`, [P]: "Points toward the horses, please. A pike braces only if it is standing still."), `med_hold_order` (battle_start + 3 s, [C]: "Keep the pikes on Hold. They brace while they wait. The horses will not wait for you to decide."), `med_brace_win` (first `brace_break`, [P]: "The poles held and the horses reconsidered. Is a pike a weapon, or a very firm opinion on a stick?").
- **requiresModules**: M0, M2b. **Expected attempts** star 1: 1.2, star 3: 2.5.
- **Briefing** [B] "WELCOME to the Grand Pageant of Marrowby! Bunting! A crowd! And a cavalry charge that is, I am assured, TRADITIONAL!" [P] "The Yeomen have been cast as the peasants who get charged. Is a part still a part if you are paid in pikes?" [C] "The foam lances were swapped for real ones at the interval. I wrote 'interval' on the form. Nobody reads the form."
- **Victory** [B] "THE POLES HELD! The horses are reviewing their decisions and the grandstand wants to know if that was in the programme!" **Defeat** [C] "The pikes were crooked. The horses were not."
- **Star lines** 1 "Win the rehearsal. The grandstand will hold its applause until the end." 2 "Win with at least half your army (by cost) still standing. The crowd does not count as army." 3 "Win while spending 2,250 groats or less. Frugal is the new fearless."
- **Mission rules text** "Pikemen brace only while standing still: keep them on Hold, points toward the horses." / "Lancers charge from twelve units out and hit like a tree. A braced pike turns that around." / "Star 3: spend at most 2,250 of your 3,000 groats."

#### Mission 2: `med_tourney_trouble`, "Lances, Allegedly Blunted"

- **Act / mood**: I / `tense`.
- **Objective**: `kill_general {}`, `binding:true`; marker `valiant_start` (general_spawn, x 40, z 0, r 3, at the far pavilion). **Arena**: `med_tourney_field`, medium, seed 22 (two lists divided by a tilt barrier, pavilions at both ends, grandstands on both flanks, a 52 u charge run-up on `lists_sand`).
- **Player**: `yeomen`; roster `pikeman`, `billman`, `longbowman`, `peasant_levy`, `reeve` (5 types). **Budget** 5,200. **Par** `{type:'time', value:150}` (to the general). **Core** pikeman x10.
- **Reference sketch**: pikeman 14, billman 6, longbowman 12, peasant_levy 16, reeve 1 (about 5,000).
- **Enemy**: `marrowby`, style "guarded banner", normal, generals [`ser_valiant`]. Groups: `ser_valiant` x1 at the marker (hold; he carries a banner aura), `standard_bearer` x3 (one beside Valiant, one on each flank, hold), `great_hog` x1 (his "bodyguard": a prize hog in a ribbon, advances with the lancers), `lancer` x4 (advance on the bugle), `squire` x16 (advance). **Time limit** 270 s.
- **Teaches**: COLOURS (banner and rout). Standard bearers and Ser Valiant raise standards: friends inside the ring hit harder and lose morale slower; kill the bearer and the pole snaps, the ring shatters into voxel confetti, a grey pulse sweeps out, the men under it flinch, drop morale and the weak run. The Colours strip in the HUD shows one pennant per live banner. **Tests**: BRACE (M1): four lancers and the hog charge the lists.
- **Star 2** half. **Star 3**: `usedMechanic('brace',4)`: break four charges on braced pikes.
- **Set-piece** `med_sp_colours_down`
  - Sim event: `banner_fall` (first enemy banner to fall while >= 6 allies stand inside its ring).
  - Camera: from low behind the falling pole (0.8 u), rising to a high wide over the fleeing line (9 u), 4 s, ease-out.
  - Slot `campaign_med_tourney_trouble` / `setpiece`. [B] "THE FLAG IS DOWN! They are running! They have DROPPED THE BUNTING!" [P] "The banner fell and the army discovered it had other places to be. Was it ever an army, or only a very tidy crowd?" [C] "That is what a flag is for. Falling. I wrote it down."
  - Stinger `med_sting_colours_down`, kind `hit`: one bronze bell clang under a falling low-brass note, 1.8 s.
  - Sfx: `med_banner_fall` (cloth rip, pole snap), `med_bell` (single clang), `med_crowd_gasp`, `med_hoof_thunder` (fading).
- **Reward** `med_r2_plumed_great_helm`, type **part** (Workshop helm "Plumed Great Helm": a fan plume the size of a hay bale). Also: title "Vexillophobe"; codex pages `standard_bearer`, `ser_valiant`, `great_hog`, `reeve`, and the heraldry page "Heraldry For The Hopeless".
- **Teaching beats** (all era)
  - `med_colours_first` (first sight of an enemy banner, [B]: "Kill the BANNER! Everything under it fights harder and breaks later."), `med_colours_ring` (hover on a banner, hint: "The ring is the banner's reach. Inside it, friends hit harder and keep their nerve."), `med_colours_fall` (first `banner_fall`, [C]: "When the banner falls they run. I said so about the last banner."), `med_tilt_lane` (first charge in the lists, [P]: "The fence keeps the charge in its lane. Horses are not consulted about lanes.").
- **requiresModules**: M0, M13 (banner). **Expected attempts** 1.5 / 3.0.
- **Briefing** [B] "THE TOURNEY! Lances! Plumes! And a peasant uprising in the cheap seats, which is a first for the PROGRAMME!" [P] "Ser Valiant has won every tournament he entered, having entered only the ones nobody else knew about. Is a victory still a victory if the other entrants were not told?" [C] "Cut the banner and the army forgets why it came. I said so about the last banner. They were polite about it."
- **Victory** [P] "The standard fell, the plumes followed and a hog went to find the judges. Whose idea was the ribbon?" **Defeat** [C] "His plume was bigger than your plan. I mentioned the plume."
- **Star lines** 1 "Kill Ser Valiant. He is the one under three plumes." 2 "Win with at least half your army (by cost) alive." 3 "Break four cavalry charges on your braced pikes. The horses will want to talk."
- **Rules text** "Banner bearers (standard bearers and Ser Valiant) strengthen friends inside their ring; drop one and the men under it flinch and run." / "Kill Ser Valiant. He waits at the far pavilion behind his standard." / "Star 3: break four charges on braced pikes."

#### Mission 3 (ACT I FINALE): `med_ford_dithering`, "The Ford at Dithering (Please Hold Still II)"

- **Act / mood**: I (finale) / `epic`.
- **Objective**: `hold_hill {time:150}`; marker `ford` (hill, x -8, z 0, r 7, on the west lip of the ford; the clock stops while an enemy stands on it). **Arena**: `med_ford_of_dithering`, medium, seed 23 (14 u shallow ford at x 0, cost x1.7; stone bridge 18 u upstream; the west bank 2 u higher with hedge, willows and a row of spike stakes; the east bank flat meadow with a 30 u run-up; windmill on the north rise).
- **Player**: `mixed` (gatehouse + yeomen, "allied"); roster `crossbowman`, `pavise_bearer`, `pikeman`, `billman`, `longbowman`, `reeve` (6 types). **Budget** 7,000. **Par** `{type:'none'}` (fixed 150 s hold). **Core** crossbowman x8, pikeman x8.
- **Reference sketch**: crossbowman 14, pavise_bearer 8, pikeman 14, reeve 1, billman 6 (about 6,800); a longbow-only army is the blind foil (arrows bounce).
- **Enemy**: `marrowby` column, style "marching column", normal, three waves 30 s apart (first at 15 s): W1 `lancer` x8, `squire` x14, `standard_bearer` x1; W2 `knight_afoot` x8, `lancer` x6, `squire` x8, `standard_bearer` x1; W3 `knight_afoot` x10, `lancer` x4, `standard_bearer` x2. No boss, no general. **Time limit** 240 s.
- **Teaches**: ARMOUR and RELOAD. Plate (armor about 0.55) turns arrows; crossbow bolts (ap .55) go through it; but a crossbowman is helpless while winding up (magazine 1, reload about 2.6 s): the reload tell is a visible crank and ratchet clicks. **Combines (finale)**: BRACE (lancers into pikes and stakes) and COLOURS (four standard bearers). **Tests**: COLOURS (M2).
- **Star 2** half. **Star 3**: `usedMechanic('colours',3)`: topple three banners.
- **Set-piece** `med_sp_brace_break`
  - Sim event: >= 6 cavalry `brace_break` events within 10 s (the pike line stops a charge wave).
  - Camera: high and wide over the pike line looking toward the ford (10 u), a slow push forward, dust and splashes, 5 s, ease-out.
  - Slot `campaign_med_ford_dithering` / `setpiece`. [B] "THE FORD HELD! Six horses, ONE river and a very firm line of opinions!" [P] "Is a ford a place, or a decision the horses had already made?" [C] "Plant the butts in the ground. The horse will not stop. The horse will not be consulted."
  - Stinger `med_sting_brace`, kind `hit`: a single enormous drum hit and a timber creak, 2 s.
  - Sfx: `med_brace_thunk` x4, `med_splash_big`, `med_horse_neigh_chorus`, `med_crowd_ooh`.
- **Reward** `med_r3_long_pike`, type **part** (Workshop polearm "Long Pike": 4.8 u of pole, the longest the grid allows). Also: title "Ford Keeper"; codex pages `knight_afoot`, `crossbowman`, `pavise_bearer`.
- **Teaching beats**: `med_bolts_clink` (first arrow bounces off plate, [P]: "Plate stops arrows beautifully. Has anyone consulted the arrows?"), `med_bolts_reload` (first crossbow reload, [C]: "Nine seconds. Well, two and a half. It feels like nine."), `med_bolts_ap` (first bolt that pierces plate, hint: "Bolts pierce armour that arrows only polish."), `med_hold_how` (placement_start, hint: "Hold the marked ground until the clock runs out. An enemy standing on it stops the clock."), `med_ford_slow` (first unit in the ford, [P]: "The ford slows everyone. It is nothing personal. It is water."), `med_blind_foil` (placement, when the army is 100 percent longbows, scout code `no_anti_armor`, [C]: "Arrows. Against plate. I will say nothing.").
- **requiresModules**: M1, M2, M13. **Expected attempts** 1.8 / 3.5.
- **Briefing** [B] "THE FORD AT DITHERING! A river, a bridge, and nobody can decide which one to use! HUZZAH! ...is that right yet?" [P] "Plate stops arrows beautifully. Has anyone consulted the arrows?" [C] "The arrows will bounce. I said so before the arrows were bought. The receipts are still in the quiver."
- **Victory** [B] "THE FORD HELD! Three waves, four banners, and the horses are still ARGUING with the river!" **Defeat** [P] "We paid in arrows. They had asked for bolts. Both parties were unmoved."
- **Star lines** 1 "Hold the ford for 150 seconds." 2 "Win with at least half your army (by cost) alive." 3 "Topple three banners. Standard bearers hate this one trick."
- **Rules text** "Hold the marked ground on the west lip of the ford for 150 seconds; an enemy standing on it stops the clock." / "Bolts pierce plate; arrows do not. A crossbowman is helpless while it reloads." / "Three waves, 30 seconds apart. Pikes and stakes stop the horses; the bearers keep the rest steady."

### ACT II: SIEGE SEASON ("Fire, plague and a gate with a clause")

#### Mission 4: `med_mizzlemoor_beacons`, "Beacons of Mild Concern"

- **Act / mood**: II / `ominous` with comic turns.
- **Objective**: `capture {points:3, holdAll:true, hold:20}`: hold all three beacons at once for 20 cumulative seconds. Markers (hill, r 5): `beacon_a` x 0 z -18, `beacon_b` x -14 z 8, `beacon_c` x 14 z 8. **Arena**: `med_mizzlemoor`, medium, seed 24 (three low hills in a triangle about 30 u apart, each crowned with a `med_beacon_brazier`; heather ridgelines 6 u wide are the cavalry roads, mud bogs between slow foot to 0.72; standing stones; default fog 0.25).
- **Player**: `marrowby`; roster `squire`, `lancer`, `knight_errant`, `knight_afoot`, `standard_bearer` (5 types). **Budget** 8,500. **Par** `{type:'time', value:150}`. **Core** knight_errant x8.
- **Reference sketch**: knight_errant 8, lancer 6, knight_afoot 6, squire 8, standard_bearer 2 (about 8,300).
- **Enemy**: `free_company` (the Mostly Paid Company) "hired defenders", normal. Groups: `sellsword` x16 (hold on the beacons), `poacher` x12 (their nets are the anti-cavalry tool; hold behind the sellswords), `standard_bearer` x1 (**borrowed**: the Company has no banner of its own). **Time limit** 270 s.
- **Teaches**: CHARGE and UNHORSE. A run-up of about twelve units gives momentum (gold speed streaks, rising hoof thunder); fog and bogs punish a bad route, ridgelines reward a good one; a poacher's net roots a horse; and the horse is a separate pool: kill the horse of a `knight_errant` and the knight gets up as a `knight_afoot` after a 1.2 s get-up ("Ahem."). **Tests**: COLOURS (M2): the borrowed bearer.
- **Star 2** half. **Star 3**: `bannerDownBy('standard_bearer',75)`: drop the borrowed banner within 75 seconds.
- **Set-piece** `med_sp_lance_chorus`
  - Sim event: >= 5 `charge.hit` events within 1.5 s (a lance chorus).
  - Camera: low side-on tilt track (0.8 u) parallel to the charge, then a pull-back to show the beacons through the fog; 4 s, ease-out; sim 0.5x.
  - Slot `campaign_med_mizzlemoor_beacons` / `setpiece`. [B] "FIVE LANCES! One CHORUS! The beacons have never been so well attended!" [P] "A lance is a tree that has been given a purpose, and will be given a second one in a moment." [C] "Hooves in fog. I said fog. I said hooves. I did not say in what order."
  - Stinger `med_sting_charge`, kind `swell`: galloping snare and a horn that arrives a bar late, 3 s.
  - Sfx: `med_lance_shatter` x5, `med_hoof_thunder`, `med_horn_charge`, `med_sheep_bleat_far`.
- **Reward** `med_r4_lance_used`, type **part** (Workshop weapon class "Lance (Used)", couched, long reach). Also: Quick unlock enemy style "Charge of the Wobbly Brigade" (cavalry in a loose rank); title "Tilt Enthusiast"; codex pages `knight_errant`, `sellsword`, `poacher`, `trebuchet`.
- **Teaching beats**: `med_charge_runup` (placement_start, hint: "A charge needs room. Place cavalry far back, on the ridgeline, and aim them at open ground."), `med_charge_hit` (first charge hit, [B]: "That is what a run-up buys you! Twelve units of RUN and one unit of apology!"), `med_unhorse` (first knight rises as a knight afoot, [B]: "He stood up! He brushed himself off! He said AHEM!"), `med_net_root` (first horse netted, hint: "Nets root horses. Kill the poacher or go around."), `med_fog_range` (battle_start, hint: "Fog shortens everyone's sight. Ranged units hit less often at a distance.").
- **requiresModules**: M2b, M13 (bailout), M14 (capture). **Expected attempts** 1.6 / 3.2.
- **Briefing** [B] "BEACONS! Three braziers, a great deal of FOG and a cavalry charge with absolutely no sense of direction!" [P] "Heavy cavalry are unstoppable until they stop. Who tells the horse?" [C] "Your knights will fall off. Knights on foot are still knights. They are simply upset ones."
- **Victory** [C] "All three beacons lit. Mildly. I said mildly." **Defeat** [P] "The fog won the argument. Nobody had thought to bring a second opinion."
- **Star lines** 1 "Hold all three beacons at once for twenty seconds." 2 "Win with at least half your army (by cost) alive." 3 "Drop the borrowed banner within 75 seconds. It was on loan, after all."
- **Rules text** "Capture the three beacons and hold them together for twenty seconds." / "A knight whose horse dies stands up and fights on foot. Nets root horses." / "Star 3: drop the Company's borrowed banner within 75 seconds."

#### Mission 5: `med_castle_dour`, "Please Knock (We Did)"

- **Act / mood**: II / `tense`.
- **Objective**: `destroy {props:[{type:'med_castle_gate',count:1},{type:'med_portcullis',count:1}], eliminate:false}`. Marker `gate` (waypoint, x 22, z 0, r 4, camera). **Arena**: `med_castle_dour`, large, seed 26 (curtain-wall square with four round towers, moat with drawbridge, gatehouse with gate and portcullis behind it, hoardings, six oil cauldrons in the **inert "pending" variant**, keep on a motte, attacker camp 44 u from the gate, four `med_mantlet` pre-placed on the approach; corridors >= 6 u).
- **Player**: `mixed` (free_company + yeomen); roster `battering_ram`, `rolling_keep` (cap 1), `sellsword`, `poacher`, `pikeman`, `billman`, `longbowman` (7 types). **Budget** 10,500. **Par** `{type:'time', value:270}`. **Core** battering_ram x2.
- **Reference sketch**: battering_ram 3, rolling_keep 1, sellsword 8, pikeman 10, longbowman 10, billman 6, poacher 4 (about 10,300).
- **Enemy**: castle Dour's `gatehouse` garrison (the castle that locked itself against its own league), style "defenders", normal. Groups: `crossbowman` x16 (hold on the towers and wall), `pavise_bearer` x12 (hold on the wall), `springald` x2 (hold), `castellan` x1 (hold; **`call_strike` disabled**: "the oil is on back-order"). Script: postern sortie at t = 80 s (`pavise_bearer` x6, `crossbowman` x6). **Time limit** 420 s. Bots: `turtle [0.1, 1.0]` ("the garrison holds behind the walls and never attacks: a patient army wins however it stands, as at Troy").
- **Teaches**: GATES and RAMS. A gate belongs to its defenders (passable to them, solid to you); hover shows its hit-point bar and "owner: defenders"; rams and heavy melee do about 6x to structures, arrows next to nothing; the portcullis behind it is fireproof and wants rams; mantlets shelter the crews. **Tests**: RELOAD (M3): the wall crossbowmen.
- **Star 2** half. **Star 3**: `hitsDuringReload(10)`: hit ten wall crossbowmen while they reload.
- **Set-piece** `med_sp_gate_falls`
  - Sim event: `prop_destroyed {type:'med_castle_gate'}` (the oak gate falls).
  - Camera: from inside the bailey looking out through the gateway (1.6 u) toward the dust and the roofed ram appearing; 5 s, ease-in. If the gate fell to the Rolling Keep's drawbridge slam, the shot instead cranes over the wall.
  - Slot `campaign_med_castle_dour` / `setpiece`. [B] "THE DOOR HAS BEEN OPENED! There was a knock! There was definitely a KNOCK!" [P] "The portcullis asks that you remove your shoes. Is a siege merely a conversation conducted at volume?" [C] "Thursday came early. The oil is still on back-order. Count that as luck."
  - Stinger `med_sting_breach`, kind `hit`: a timpani hit and a woodwind fall, with a trumpet repeating the wrong cue, 2.4 s.
  - Sfx: `med_ram_gate_boom`, `med_wood_split`, `med_chain_rattle`, `med_wall_collapse`, `med_dust_whump`.
- **Reward** `med_r5_siege_season`, type **quick unlock**: the "Siege Season" preset (castle map plus garrison). Also: part `med_mantlet_shield` (Workshop offhand); title "Door Handler"; codex pages `battering_ram`, `rolling_keep`, `castellan`, `springald`.
- **Teaching beats**: `med_gate_owner` (first hover over a gate, hint: "Gates belong to the defenders. Arrows scratch them; rams and boulders break them."), `med_ram_roof` (first ram contact, [B]: "Knock knock! Structurally!"), `med_portcullis` (oak gate down, portcullis exposed, [P]: "A second door behind the first door. Who designed this, a committee?"), `med_oil_pending` (first look at a cauldron, [C]: "Oil pending. It arrives Thursday. Do not be here on Thursday."), `med_keep_bailout` (the Rolling Keep falls apart, [B]: "The castle is OPEN! Everyone inside is leaving, in a line, politely!").
- **requiresModules**: M2, M12, M14 (hard); M13 (soft, the Keep's bailout). **Expected attempts** 2.2 / 4.0.
- **Briefing** [B] "CASTLE DOUR! A gate! A SECOND gate behind the first gate! HUZZAH for gate-based INFRASTRUCTURE!" [P] "The castle has locked its gate against its own league. Is a siege merely a conversation conducted at volume?" [C] "The oil is on back-order. It arrives Thursday. Do not be here on Thursday."
- **Victory** [B] "THE DOOR HAS GIVEN NOTICE! The garrison has been asked to take its coats and leave!" **Defeat** [C] "Thursday came early. It always does."
- **Star lines** 1 "Destroy the gate and the portcullis." 2 "Win with at least half your army (by cost) alive." 3 "Hit ten wall crossbowmen while they reload. Their cranks are slower than your ram."
- **Rules text** "Destroy the oak gate and the portcullis behind it." / "Rams and heavy blows break structures; arrows barely mark them. Mantlets shield the crews; the Rolling Keep is one allowed." / "A sortie comes out of the postern at 80 seconds."

#### Mission 6 (ACT II FINALE): `med_bell_tolls_lunch`, "The Bell Tolls For Lunch"

- **Act / mood**: II (finale) / `ominous` with comic turns.
- **Objective**: `defend_core {prop:'med_bell_tower', hp:1500, time:150}`; marker `bell` (hill, x 24, z 0, r 4). **Arena**: `med_bellfount_abbey`, medium, seed 25 (walled cloister, bell tower in the north-east corner, herb beds, fish pond, abbey gate = a team-owned `med_castle_gate` in the west wall, a postern in the east wall).
- **Player**: `mixed` (bellfount + yeomen pikes); roster `physician`, `bellringer`, `apothecary`, `abbess`, `pikeman`, `longbowman` (6 types). **Budget** 8,500. **Par** `{type:'none'}` (fixed 150 s hold). **Core** physician x3, pikeman x8. **Reinforcement**: `plague_cart` x1 arrives free through the postern at t = 100 s.
- **Reference sketch**: physician 4, bellringer 3, apothecary 4, abbess 1, pikeman 14, longbowman 8 (about 8,200).
- **Enemy**: `free_company` raiders, style "hired raids", normal, waves. W1 t = 10 s: `sellsword` x12, `poacher` x8. W2 t = 55 s: `sellsword` x8, `poacher` x6, `battering_ram` x1 (goes for the abbey gate, then the tower). W3 t = 100 s: `sellsword` x12, `poacher` x6, `great_hog` x1 ("hired as security; the ribbon is part of the contract"), which charges the gate lane. No boss; no fire. **Time limit** 180 s.
- **Teaches**: HEALERS and POISON. A physician's pulse heals organic units only (gold motes; machines and structures are not healed); the apothecary's flask and the plague cart's gas trail tick through armour and block healing (mint-green cloud, "sneezing" bubbles); gas drifts and hurts both sides. **Combines (finale)**: GATES (hold the abbey gate; M5), BRACE (the hog; M1), COLOURS (the abbess banner; M2). **Tests**: GATES (M5).
- **Star 2** half. **Star 3**: `propStanding('med_castle_gate')`: the abbey gate is still standing when the bell tolls at noon (150 s).
- **Set-piece** `med_sp_great_sniffle`
  - Sim event: script `strike {kind:'gas', n:3}` at t = 70 s ("three barrels in the cellar have burst"): three green clouds drift over the cloister; neutral, hurts both sides.
  - Camera: from the top of the bell tower (11 u) craning slowly down and across the cloister, 5 s, ease-in-out; sim 0.5x.
  - Slot `campaign_med_bell_tolls_lunch` / `setpiece`. [B] "THE SNIFFLE! Green clouds! Polite sneezes! Everybody is sitting down and apologising!" [P] "The abbey heals anyone who asks. Do we count the healed as guests, or as inventory?" [C] "Plague. I said plague. Tuesday. It is Thursday. For once I am early."
  - Stinger `med_sting_plague`, kind `comic`: one bell toll and a wobbling oboe, 2.6 s.
  - Sfx: `med_bell` (toll), `med_gas_hiss`, `med_sneeze_chorus` (polite), `med_cart_squeak`.
- **Reward** `med_r6_plague_season`, type **mutator**: unlocks `med_plague_season` ("Plague Season": healing halved, a mint cloud drifts across the field every 40 s, units sneeze politely). Also: part `med_beak_mask` (Workshop helm "Beak Mask": a mint beak, 3 voxels across); codex page `med_codex_infirmary` ("The Infirmary: Rules of Etiquette"); title "Soup du Jour"; codex pages `physician`, `bellringer`, `apothecary`, `plague_cart`, `abbess`.
- **Teaching beats**: `med_heal_first` (first heal numbers, [P]: "Heals everyone in range. Does it ask who is on whose side?"), `med_poison_first` (first poison tick, [C]: "Poison goes through armour and past the healer. I said so about the apothecary."), `med_gas_drift` (first cloud, hint: "Gas drifts with the wind and hurts both sides. Stand upwind."), `med_noheal` (first NOHEAL icon, hint: "Poisoned units cannot be healed until it wears off."), `med_bell_stun` (first Dong, hint: "The bell stuns a charge in progress. Time it for the hog.").
- **requiresModules**: M6a, M12, M13 (gas), M14. **Expected attempts** 2.0 / 4.0.
- **Briefing** [B] "BELLFOUNT ABBEY! Seventeen bells, one cellar and an alarming number of HERBS!" [P] "The medicine cupboard and the poison cupboard are the same cupboard. Which arrangement is more honest?" [C] "There will be a plague. Green. Sneezing. I said so in Act One. I did not expect it to be ours."
- **Victory** [C] "Told you. I do not enjoy it. The soup is excellent." **Defeat** [P] "The bell tolled for lunch. Lunch was unavailable."
- **Star lines** 1 "Keep the bell tower standing until noon." 2 "Win with at least half your army (by cost) alive." 3 "The abbey gate is still on its hinges at noon. The abbess takes it personally."
- **Rules text** "Keep the bell tower alive for 150 seconds." / "Physicians heal flesh, not wood. Poison and gas ignore armour and block healing." / "Three raids, at 10, 55 and 100 seconds. The gate is yours: hold it."

### ACT III: DRAGON SEASON ("It was in the programme, in small print")

#### Mission 7: `med_pennywhistle_blaze`, "Pennywhistle Is Not On Fire (Yet)"

- **Act / mood**: III / `tense`.
- **Objective**: `protect_vip {vip:'pageant_dragon', exit:'green', reachOnly:true}`; markers `float_start` (vip_start, x -40, z -10, r 3), `green` (exit, x 42, z 8, r 7). **Arena**: `med_pennywhistle`, medium, seed 27 (fourteen thatched cottages, barn, windmill with animated sails, market square with well and stalls, haystacks, hedges; cobble lanes do not burn; eight `med_pitch_barrel` scattered as armed oil).
- **Player**: `mixed` (yeomen + bellfount); roster `billman`, `pikeman`, `longbowman`, `peasant_levy`, `reeve`, `physician` (6 types). **Budget** 7,500. **Par** `{type:'time', value:120}` (the march). **Core** physician x2. **Fixed**: `pageant_dragon` (name "The Float (Wilfred and Dennis)"; `vip:true`, hp override 260, speed 1.6, free).
- **Reference sketch**: physician 4, pikeman 8, billman 6, longbowman 8, peasant_levy 12, reeve 1 (about 7,300).
- **Enemy**: `free_company` raiders with hired `gatehouse` shooters, style "arson", normal. Groups: `mangonel` x3 (on the hill, 45 u; pitch pots ignite thatch and ground for 5 s), `crossbowman` x12, `pavise_bearer` x8, `sellsword` x8 (a second group flanks at t = 70 s), `poacher` x6. Script: arson `strike {kind:'fire'}` at t = 55 and 85 s on cottage clusters; VIP march `vipMarch {to:'green', delay:8, clear:6, patience:20}`; at t = 150 s the Cinderwyrm passes overhead as a **passive flyby cameo** (a script `spawn` that crosses the map and exits; it never attacks, is not targetable, and does not count toward the objective; second package `med_sp_dragon_shadow`). **Time limit** 210 s.
- **Teaches**: FIRE and OIL. Pitch pots and scripted arson ignite thatch (it glows orange before it burns); flames spread along flammable props and ground for a few seconds, stone lanes are safe, fire panics levies; barrels explode in a chain; rain douses. **Tests**: HEALERS (M6): the physician keeps the Float alive.
- **Star 2** half. **Star 3**: `usedMechanic('healers',1000)`: heal 1,000 hit points.
- **Set-piece** `med_sp_windmill_blaze`
  - Sim event: the first pitch pot to hit `med_windmill` (`prop_ignited {type:'med_windmill'}`).
  - Camera: orbit the burning sails (2 u off, 9 u high) for 2.5 s, then pan to the Float trotting past, 4 s total, ease-in-out. Reduce Motion = cut.
  - Slot `campaign_med_pennywhistle_blaze` / `setpiece`. [B] "THE WINDMILL IS DOING A BIT! The sails are ON FIRE and still going round!" [P] "The village consents to its own burning. Is it arson if everyone has signed?" [C] "The windmill burns first. Then the barn. Then Dennis's feelings. Keep the soup close."
  - Stinger `med_sting_fire`, kind `comic`: a rising brass swell and a cymbal that arrives late, 2.2 s.
  - Sfx: `med_fire_whoomph`, `med_fire_crackle`, `med_wood_crack`, `med_crowd_gasp`.
  - **Second package** `med_sp_dragon_shadow` (t = 150 s, passive): shot from the green looking up, the shadow sweeping across the thatch, 3 s; [C] "Lovely day for it."; stinger `med_sting_dragon_shadow`, kind `dread`, short (1.8 s); sfx `med_dragon_roar_far`, `med_wing_whomp`. Skipped if a beat is active.
- **Reward** `med_r7_dry_summer`, type **quick unlock**: arena variant "Pennywhistle, Dry Summer" (dry weather, wind, extra hay). Also: part `med_cauldron_helm` (Workshop helm "Cauldron Helm"); title "Smoke Detector"; codex pages `mangonel`, `pageant_dragon` (the Dennis page), `med_pitch_barrel`.
- **Teaching beats**: `med_fire_thatch` (first thatch ignites, [P]: "Thatch is a roof that has made a decision."), `med_fire_stone` (first unit uses a cobble lane, hint: "Cobble lanes do not burn. Roofs, hay and wood do."), `med_oil_boom` (first barrel explodes, [B]: "OIL! BOOM! Somebody label the barrels!"), `med_fire_panic` (first panicking levy, [C]: "Levies and fire. I wrote it down. In water, ideally.").
- **requiresModules**: M6a, M12, M14. **Expected attempts** 2.2 / 4.0.
- **Briefing** [B] "PENNYWHISTLE! Thirty roofs, a windmill and a costume dragon that is VERY flammable!" [P] "We must walk a costume dragon through a village that wishes to be on fire. Is the dragon the cargo, or the plan?" [C] "Fire follows thatch. Thatch follows fire. Take the cobble lane and watch the roofs."
- **Victory** [P] "He arrived with his costume and an interesting hairstyle. Both are charred." **Defeat** [B] "THE FLOAT IS TOAST! Literally! Look at the toast!"
- **Star lines** 1 "Walk the Float to the green." 2 "Win with at least half your army (by cost) alive." 3 "Ladle 1,000 hit points back into your escort. Receipts available."
- **Rules text** "The Float must reach the green. If it falls, the mission is lost." / "Fire spreads along thatch, hay and wood. Cobble lanes are safe. Barrels explode." / "Mangonels shell from the hill; a second group flanks at 70 seconds."

#### Mission 8: `med_toll_bridge`, "The Toll Bridge Is Currently Closed (For You)"

- **Act / mood**: III / `epic`.
- **Objective**: `survive_waves {waves:4}`. Marker `battery` (waypoint, x -34, z 0, r 4). **Arena**: `med_long_bridge`, medium, seed 28 (a 40 u stone bridge 6 u wide over a 14 u deep impassable river, toll booth at mid-span, a bridgehead fort on each bank, two shallow fords 40 u up and downstream = a 25 s flank detour, willows). The deck section under the toll booth is the `editTerrain` target of the bridge drop.
- **Player**: `mixed` (the Allied Truce); roster `trebuchet` (cap 2), `mangonel`, `springald` (a ground bolt thrower here), `pikeman`, `billman`, `longbowman`, `crossbowman`, `pavise_bearer`, `physician`, `reeve`, `standard_bearer` (11 types). **Budget** 12,000. **Par** `{type:'time', value:330}`. **Core** trebuchet x2.
- **Reference sketch**: trebuchet 2, mangonel 2, pavise_bearer 10, crossbowman 12, springald 2, pikeman 10, physician 3, reeve 1 (about 11,700).
- **Enemy**: faction `mixed` ("the rival guild has hired everybody"), style "hired everybody", normal, waves (first at 6 s, interval 40 s, breather 5 s). W1: `sellsword` x14, `poacher` x10. W2: `hoardling` x40, `coin_golem` x1 (dies into hoardlings). W3: `trebuchet` x1 and `mangonel` x2 **live** on the far bank (hold), `sellsword` x10. W4: **boss** `lady_counterweight` on the far bank (hold), `bridge_troll` x1 under the bridge (rises with the wave; aura "Toll Demand"), `hoardling` x20. Enemy crater makers are capped at 2 (the trebuchet plus the Lady). **Time limit** 480 s.
- **Teaches**: ARTILLERY (arc fire). A trebuchet fires an arc over walls and friends, cannot hit anything inside its minimum range (HUD ring on selection), leaves craters (rate-capped), does structure damage, and is made of wood: counter-battery works both ways. **Tests**: FIRE (M7): the enemy's engines are flammable.
- **Star 2** half. **Star 3**: `burnKills('siege',2)`: burn two enemy engines (a mangonel pot, oil or a fire patch all count).
- **Set-piece (primary)** `med_sp_lady_arrives`
  - Sim event: `unit_spawn {def:'lady_counterweight'}` at the start of wave 4 (with the troll rising under the bridge in the last second).
  - Camera: a long-lens push from the player's battery (1.8 u) across the river to her silhouette on the far bank, 5 s, ease-in; in the last second the frame drops to the bridge as the troll climbs out; sim 0.5x.
  - Slot `campaign_med_toll_bridge` / `setpiece`. [B] "LADY COUNTERWEIGHT! A three-storey FRAME and a hat the size of a BARN! And under the bridge, A TROLL!" [P] "Leverage in the physical sense is simple. In the commercial sense it is how we got here." [C] "Her trebuchet is bigger. I said bigger. I used the word."
  - Stinger `med_sting_lady`, kind `dread`: a low counterweight groan, a whistle, a rolling crash, 3 s.
  - Sfx: `med_trebuchet_groan`, `med_counterweight_whump`, `med_shell_whistle`, `med_wood_groan`.
- **Set-piece (conditional)** `med_sp_bridge_drop`
  - Sim event: a crater lands within 3 u of the troll while he stands on the deck (`editTerrain` removes the deck section).
  - Camera: side-on along the deck (1.5 u), the span folds, the troll hangs for a beat and drops into the river, 5 s, ease-in-out.
  - Slot as above. [P] "He asked for exact change. We gave him the river." [B] "THE BRIDGE IS GONE! He paid the toll in FULL!" [C] "The toll was always going to be the bridge."
  - Stinger `med_sting_troll`, kind `comic` (a tuba "wah"); sfx `med_boulder_impact`, `med_wall_collapse`, `med_splash_big`, `med_troll_groan`.
- **Reward** `med_r8_siegecraft`, type **codex page** ("Siege Engines: A Guide For The Late"; a real `locked` write). Also: part `med_toll_club` (Workshop weapon "Toll Club": a toll gate on a stick); title "Counterweight of Evidence"; codex pages `lady_counterweight`, `bridge_troll`, `hoardling`, `coin_golem`.
- **Teaching beats**: `med_arc_minrange` (first trebuchet selected, hint: "The ring is the minimum range. Nothing inside it can be hit."), `med_arc_crater` (first crater, [P]: "A crater is a decision that is too late to reverse."), `med_counter_battery` (enemy engines fire, [C]: "They are shooting back. Their engines are wooden. Fire exists."), `med_pavise_screen` (trebuchet with an enemy inside minRange, hint: "Screen the engines with pavises. Anything close is invisible to them.").
- **requiresModules**: M10, M12, M14. **Expected attempts** 2.5 / 4.5.
- **Briefing** [B] "THE TOLL BRIDGE! A troll with a TILL! Bring exact change and a very long pole!" [P] "Leverage in the physical sense is simple. Is the commercial sense not the same sense, with paperwork?" [C] "He will say the bridge is closed. The bridge is open. Neither of us will be consulted."
- **Victory** [P] "The rival guild has withdrawn its claim and some of its bridge." **Defeat** [C] "She was bigger. I said bigger."
- **Star lines** 1 "Survive four waves." 2 "Win with at least half your army (by cost) alive." 3 "Burn two enemy engines. Wood is a lifestyle choice."
- **Rules text** "Survive four waves; a wave counts when every one of its units is down or running." / "Trebuchets cannot hit anything inside their minimum range. Screen them." / "Craters and wood: engines burn, and so do the people who built them."

#### Mission 9 (ACT III FINALE): `med_grand_pageant`, "The Grand Pageant (Real Dragon Edition)"

- **Act / mood**: III (finale) / `epic`.
- **Objective**: `kill_general {}`, `binding:true`; marker `perch` (general_spawn on the keep roof, x 0, z 40, r 3). **Arena**: `med_dour_courtyard`, medium, seed 29 (enclosed cobble bailey 70 x 60 u with a keep at the north end, bell tower, grandstand on the east side, market stalls on the west, maypole and bunting around a central dais; two 6 u gate gaps; open sky; crowd props that panic).
- **Player**: `mixed` ("the Allied Pageant", all factions but wyrmkin); roster `squire`, `lancer`, `knight_errant`, `standard_bearer`, `longbowman`, `pikeman`, `crossbowman`, `pavise_bearer`, `springald` (cap 6), `trebuchet` (cap 2), `physician`, `abbess`, `bellringer`, `castellan` (14 types) plus the fixed free `pageant_dragon` ("Dennis", 15 total). **Budget** 14,000. **Par** `{type:'time', value:300}`. **Core** springald x4 and Dennis x1.
- **Reference sketch**: springald 5, crossbowman 10, longbowman 10, pikeman 10, pavise_bearer 8, physician 4, standard_bearer 2, abbess 1, trebuchet 2, castellan 1 (about 13,600).
- **Enemy**: `wyrmkin`, style "dragon and hoard", normal. `cinderwyrm` x1 (**general**, binding, perched on the keep), waves: t = 20 s `hoardling` x50 and `wyvern` x6 arriving by air; t = 60 s `coin_golem` x2; t = 100 s `bridge_troll` x1 ("soaked and cross" from the bridge). **Boss** the Cinderwyrm. Phases: perched and waking (0 to 20 s), air strafing with a volley of fireballs (down to 40 percent hp), lands at 40 percent hp or after 30 s with no anti-air within 30 u, then melee, claw and tail sweep on the ground. **Time limit** 420 s.
- **Teaches**: AIR. Wyverns and the dragon live in the air layer: melee cannot reach them; crossbows, longbows and springalds can (a visible AA ring on selection, ground shadow blobs show altitude); dragon fire ignites; her scare aura shakes nerve. **Combines (finale)**: BOLTS (the anti-air is bolt-fired), HEALERS (physicians and the abbess), COLOURS (standard bearers, abbess), FIRE (her breath ignites bunting and the grandstand), ARC (once she lands). **Tests**: ARC (M8).
- **Star 2** half. **Star 3**: `shellsOnTarget('cinderwyrm',1)`: land a trebuchet shell on the grounded dragon.
- **Set-piece (primary)** `med_sp_dragon_wakes`
  - Sim event: script `beat {id:'dragon_wakes'}` at t = 20 s (the Cinderwyrm leaves the keep and banks over the army); a second `beat {id:'dragon_falls'}` on her death (crash into the keep, coin shower, one spoon that clinks).
  - Camera: low angle (0.6 u) at the base of the keep tracking up the wall and across the sun as she banks over the army, 5.5 s, ease-in-out; sim 0.5x. The death beat is a 3 s side-on cut.
  - Slot `campaign_med_grand_pageant` / `setpiece`. [B] "A DRAGON! On a KEEP! This is the best day of my life and it is also on FIRE!" [P] "The insurers have classed this as a weather event. I find the class generous, and the dragon more so." [C] "I said dragon in the first briefing. You said boring. Bring the bolts."
  - Stinger `med_sting_dragon`, kind `dread` (limiter bypass): a low brass note and a distant roar, 3.5 s.
  - Sfx: `med_dragon_roar`, `med_wing_whomp`, `med_masonry_fall`, `med_fire_whoosh`.
- **Set-piece (coda)** `med_sp_dennis_meets_dragon`
  - Sim event: `air_landed {def:'cinderwyrm'}` (first landing). Dennis (the fixed costume dragon) is scripted to step toward her; the real dragon plays its `sniff` clip (the 2 s pause is visual unless M14 `strike` accepts a status payload; request 6.3).
  - Camera: low two-shot (0.9 u) of the costume and the real dragon, nose to nose; slow push in over 6 s; sim 0.5x.
  - Slot as above. [B] "DENNIS IS WALKING UP TO THE DRAGON! Nobody TOLD him! Somebody tell Wilfred!" [P] "Two dragons meet. One is real. Is the other less real, or merely less certain?" [C] "That is not Dennis."
  - Stinger `med_sting_finale`, kind `fanfare` (limiter bypass): a kazoo against full brass, 3 s.
  - Sfx: `med_dragon_sniff`, `med_kazoo_blat`, `med_crowd_gasp`.
- **Reward** `med_r9_gilded_spoon`, type **part** (Workshop weapon "Gilded Spoon": the largest spoon ever issued as a weapon). Also: Quick unlock "Dragon Day" preset (Cinderwyrm flyby event); all remaining codex pages; title "Dragon-Adjacent Person"; sets the `medieval_complete` flag that feeds the era-independent finale surfaces (`humour.md` section 3).
- **Teaching beats**: `med_air_first` (first wyvern, [C]: "Bring bolts. I said bolts."), `med_air_aa` (select a ranged unit, hint: "Crossbows, longbows and springalds can hit the sky. Swords cannot."), `med_air_shadow` (first dive, hint: "The shadow shows where she is going to land."), `med_air_land` (the Cinderwyrm lands, [P]: "She has come down. Is she tired, or curious?"), `med_air_dennis` (Dennis approaches, [B]: "NO, DENNIS!").
- **requiresModules**: M7, M10, M13, M14, M15. **Expected attempts** 3.0 / 5.0.
- **Briefing** [B] "THE GRAND PAGEANT! FINALLY! Bunting! A crowd! A REAL dragon! I bought a better tabard for this one!" [P] "We have rehearsed for nine battles. Is a rehearsal still a rehearsal when the dragon is real?" [C] "That is not Dennis. Nobody listen to me. I will sit here with the tonic."
- **Victory** [C] "Told you. Twice. I am retiring from being right." **Defeat** [B] "THE KEEP IS GONE! Also the roof! Also the hoard! Also my TABARD!"
- **Star lines** 1 "Kill the Cinderwyrm." 2 "Win with at least half your army (by cost) alive." 3 "Land a trebuchet shell on the grounded dragon. She will want a word with the guild."
- **Rules text** "Kill the Cinderwyrm. She wakes at 20 seconds and burns what she can reach." / "Only crossbows, longbows and springalds can hit what flies. Everything else waits for her to land." / "Dennis is free and cannot be controlled. Keep an eye on him."

## 3. Reward ledger (CU11 rows for Medieval)

| # | mission | primary reward (type, id) | plus | substitution if a ladder rung removes the primary |
|---|---|---|---|---|
| 1 | M1 | mutator `med_foam_swords` | title "Extra With Lines"; 4 codex pages | a Workshop part `med_foam_sword` |
| 2 | M2 | part `med_plumed_great_helm` | title "Vexillophobe"; heraldry codex page | a codex page "Heraldry" with a `locked` write |
| 3 | M3 | part `med_long_pike` | title "Ford Keeper"; 3 codex pages | a codex page "Armour" with a `locked` write |
| 4 | M4 | part `med_lance_used` (weapon class) | Quick style "Charge of the Wobbly Brigade"; title "Tilt Enthusiast" | the Quick style alone |
| 5 | M5 | Quick unlock "Siege Season" preset | part `med_mantlet_shield`; title "Door Handler" | the part alone |
| 6 | M6 | mutator `med_plague_season` | part `med_beak_mask`; codex page "The Infirmary"; title "Soup du Jour" | the part alone |
| 7 | M7 | Quick unlock "Pennywhistle, Dry Summer" | part `med_cauldron_helm`; title "Smoke Detector" | the part alone |
| 8 | M8 | codex page "Siege Engines: A Guide For The Late" | part `med_toll_club`; title "Counterweight of Evidence" | the part alone |
| 9 | M9 | part `med_gilded_spoon` | Quick preset "Dragon Day"; all codex pages; title "Dragon-Adjacent Person" | the preset alone |

Every row is real (a part usable now, a Quick unlock, a mutator, a codex write or a chooser title). Parts are Workshop items with `meta.era = medieval`; mutators are the two era mutators of `mutators_achievements.md`.

## 4. Difficulty and bot expectations

| mission | reference wins | autofill bot | mechanic-blind foil (must lose >= 70 percent) | bots note |
|---|---|---|---|---|
| 1 | 85 to 95 percent | <= 60 | pikes in a blob on Advance | |
| 2 | 85 to 95 | <= 60 | hits nearest, ignores banners | |
| 3 | 80 to 90 | <= 60 | longbow-only army | |
| 4 | 75 to 90 | <= 40 | cavalry straight at the sellswords through the bog | |
| 5 | 70 to 85 | <= 40 | spreads arrows at the wall, ignores the gate | `turtle [0.1,1.0]` |
| 6 | 70 to 85 | <= 40 | no physician, no gas answer | |
| 7 | 65 to 80 | <= 40 | fights on thatch | |
| 8 | 65 to 80 | <= 40 | trebuchets at the front line | |
| 9 | 60 to 75 | <= 40 | no anti-air in the army | `greedy [0.0,0.4]` (random armies lack bolts) |

Mission length targets: 100 to 130 s in Act I, rising to 150 to 210 s in Act III; no dead air above 8 s; first contact 12 to 20 s after Fight per `arenas.md` (medium zone gap 52 u, large 74 u).

## 5. Learning-beat budget for missions 1 to 3

See `first_three_minutes.md` for mission 1 beat by beat and the first-sight toast queue for missions 1 to 3.

## 6. Requests and open items for other owners

1. **SIM** (parameters to bless, all with the fallbacks that keep every mission playable): `aura effect:'banner'` {dmg, lossMul, fall:{r, shock}} (fallback: `aura rally` + officer shock); `summon_on_death mode:'bailout'` get-up delay 1.2 s (fallback: instant spawn, no get-up clip); `dot_cloud` gas for the plague cart and apothecary; script `strike {kind:'gas'|'fire'}` events; `pavise` stance (fallback: shield block .90). No mission relies on `call_strike kind:'oil'` (the castellan's oil is disabled in M5, optional elsewhere). Part 1 already asks SIM to pull M13 earlier.
2. **CAMPAIGN WP**: add `override.disarm` and `override.disableAbilities` to enemy `groups[]` (M4 parked trebuchets, M5 castellan); `fixed[].def` overrides for the VIP in M7 (hp, speed) already exist in Ancient; `reinforcements[]` (a scripted free arrival, M6 plague cart) is an M14 `spawn` event.
3. **SIM / M14**: `strike` may carry a status payload (M9 coda 2 s pause); otherwise the pause is a render-only clip.
4. **Part 1 / COORD**: update the `rosters.md` first-mission column per section 0.1 item 7 (trebuchet M4 E, great_hog also M6 E, knight_afoot also M4 P).
5. **UI**: the HUD Colours strip (one pennant per live banner with a resolve fill) is requested for M2. Banner Cam is not promised.
6. **PROPS**: no `med_pageant_float`, `med_dragon_perch` or `med_bell_wreck` are needed; none of the nine missions needs a prop that `props.md` lacks.
