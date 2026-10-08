# Modern campaign data: every derived and amended item of `missions.json`

Owner: CAMPAIGN-MOD (conversion of `missions_outline.md`, `puzzles.md`, `arenas.md`, `rosters.md` into the MS schema). Generated together with `missions.json`; the numbers below are the counts at generation time (**208 derived, 19 amended**, pointers are RFC 6901 JSON pointers into `docs/eras/design/modern/missions.json`).

## 0. How the marks are carried

The task asked for `"_derived": true` and `"_amend"` keys inside the JSON. `docs/eras/spec/ms.schema.json` is closed (`additionalProperties: false` on every object) and `tools/ms_lint.mjs` has no rule that strips `_` keys: a `_derived` key anywhere is rule MS-S01 "unknown property" (proved by mutation: `/missions/0/enemy/groups/0/_derived` -> 1 error, see section 5). The lint passing has priority, so the marks live **here**, keyed by JSON pointer, and the in-schema carrier is the mission field `designAmendment` (set on missions 2 to 7 with an `AM-n` tag that points to section 2 of this file). `designAmendment` downgrades an MS-I06 outline difference to a warning; no outline number differs, so none is raised.

Lint (read-only): `node tools/ms_lint.mjs --era=modern` -> **0 errors, 3 warnings (MS-B11), 2 infos (MS-V01)**, exit 0. `node tools/ms_context.mjs --era=modern --check` -> current. `node tests/campaign/ms.test.mjs` -> 175/175.

Verbatim check: every briefing, victory, defeat, star, rule, beat text, beat hint and announcer line of `missions.json` was searched in `missions_outline.md` + `first_three_minutes.md`; the only strings not found verbatim are the four amended ones (M3 rule 1, M5 star 3, the two Pellmell lines).

## 1. Spec amendments applied (spec/MS.md section 6; the lint accepts the amended form and rejects the original)

| id | applied at | what |
|---|---|---|
| A1 | /missions/2/arena/markers/0..2 | the three capture posts are marker type `capture` (outline: `hill`) |
| A2 | /missions/5/arena/markers/0, /missions/5/objective | `tower` is a `core` marker; params `{core:'tower', prop:'mod_switchboard_tower'}`; the four waves are `script.waves` (outline: `{core, waves:4}`, waypoint) |
| A3 | /missions/2/objective/params, /missions/2/rules/0 | `{points, need:3, hold:0, flip:12}` (outline `hold:12, holdAll:false`); rule 1 gains "Own all three at once to win." |
| A4 | /missions/3/objective/params | `escort` with `vip:'lunchbox_apc'`, `exit:'far_bank'`, `mode:'path'`; `reachOnly` dropped (outline: `protect_vip` + `reachOnly`) |
| A5 | set-piece triggers | event names became counters or script events as in spec 3.6.4: `captures` (M3), `wave_spawns` (M2 hamper, M8 barge), `projectile_launches` (M1) |
| A8 | /missions/3/script/events/0 | "the script beat releases the dozer" = two `order` ops, one `beat` op and the `setpiece` op in one event |
| A10 | M8 star 3 | `usedMechanic('mines', 8)` needs M11, not in the outline hard list: information MS-V01, not an error |
| A12 | every `teaching.exceptions` | typed `{kind, id, mechanic, why}` |
| A13 | M7 `mission_start`, `kill_general`; M5, M8, M9 `boss_enters`; M9 `finale` | announcer categories without `sub` |

## 2. Design amendments and inconsistencies (the `designAmendments` of the hand-back; exact row and proposed fix)

| id | file and row | finding | local choice (JSON) | proposed fix and owner |
|---|---|---|---|---|
| DA-01 | `missions_outline.md` M5 "Star lines" 3 | "You have two, and both have already filed the paperwork." fails MS-K05: the number word *two* is not a helper arg, budget, par or timeLimit | text reads "You have a pair, ..." (/missions/4/text/stars/2, AM-5) | adopt the wording in the outline (DESIGN-ERA-MODERN) or put `{core}` placeholders in the copy-truth rule (DESIGN-CAMPAIGN) |
| DA-02 | `missions_outline.md` M5 Enemy: "the script `beat 'reporters_go'` releases them ... when the first player gun finishes `setup`, or at 75 s" | M14 has no gun-setup trigger kind and no canonical counter for it | event `reporters_go` at 75 s only (/missions/4/script/events/0, AM-5) | SIM adds a `unit_setup` event or counter, or the outline keeps 75 s (SIM, DESIGN-ERA-MODERN) |
| DA-03 | `missions_outline.md` 0.3 (field sets) against `rosters.md` | `shells` = `arc:'high'`, `minRange`, `crater`, `call_strike`. `long_lens_sharpshooter` (minRange 10) is in the M3 roster; `dynamite_thrower` (minRange 5) and `drainpipe_launcher` (minRange 6) are M4 enemies; the outline declares only the M3 thrower | three exceptions added: /missions/2/teaching/exceptions/1, /missions/3/teaching/exceptions/0..1 (AM-3, AM-4). Verified with a hand-built `carries` context: 0 MS-C08 errors with them, exactly those 3 without | add them to the outline 0.3 and the M3/M4 `Exceptions` lines, or drop `minRange` from the shells field set (DESIGN-ERA-MODERN, DESIGN-CAMPAIGN) |
| DA-04 | `missions_outline.md` section 4 row M2 | the roster has one unit type (`clerk_rifleman`), so a mechanic-blind composition does not exist; the blind bot differs by placement | identity swap `clerk_rifleman -> clerk_rifleman` (/missions/1/blind, AM-2) | a placement-policy field on `blind` (DESIGN-CAMPAIGN, TOOLS-VERIFY) |
| DA-05 | `missions_outline.md` section 4 row M7 | "builds artillery and rifles into the sky" is impossible: the M7 roster is air-only | swap `spotter_balloon -> hobby_drone` (/missions/6/blind, AM-7) | DESIGN-ERA-MODERN defines the M7 blind army |
| DA-06 | MS-B11 on M1, M4, M7 blind swaps | no swap within 35 percent exists in those rosters: M1 runabout 170 -> trooper 110 = 35.3 %, M4 APC 270 -> runabout 170 = 37 %, M7 balloon 140 -> drone 55 = 61 % | three MS-B11 **warnings** remain (the lint exits 0) | raise the threshold to 40 percent, or allow several swaps summing to the same cost (DESIGN-CAMPAIGN) |
| DA-07 | `missions_outline.md` M7 "Second package `mod_sp_pellmell_falls`" | only Brutus's line exists; the schema needs three voices (MS-P03) | Plato and Cassandra lines authored in voice (/missions/6/extraSetpieces/0/announcer/lines/1..2, AM-7) | COMEDY-MOD confirms or rewrites |
| DA-08 | `puzzles.md` puzzle 3 bonus "Win within 20 s of the first drainpipe shot" | no helper counts from the first shot of a def | `underTime(50)`, text "Win within 50 seconds" (/puzzles/2/bonus) | a helper `withinOfFirstShot(def, secs)` or accept the absolute time (DESIGN-CAMPAIGN, BALANCE sets the number) |
| DA-09 | `puzzles.md` puzzle 4 bonus "A single shell kills three or more" | `shellsOnTarget` counts shell hits on a def, not kills per shell | `shellsOnTarget('cub_reporter', 3)`, text "Land shells on at least three reporters" (/puzzles/3/bonus) | a helper over the per-shell kill count (DESIGN-CAMPAIGN) |
| DA-10 | `puzzles.md` "Mechanic fired" of puzzles 2, 4, 5 | each lists two conditions; `mechanicFired` carries one counter | `pin_applied >= 6`, `shell_hit >= 3`, `mine_hit >= 3` (the second conditions are kills of pinned units, craters, armour flank hits) | allow `mechanicFired[]` (DESIGN-CAMPAIGN) |
| DA-11 | `missions_outline.md` M6 "four pre-laid friendly mines" (request R5) | `ms.schema.json` has no `arena.hazards`; the mines are not machine-readable | four `mod_tape_ring` props at (2,-3), (2,3), (14,-3), (14,3) (/missions/5/arena/props/1..4, AM-6) | add `arena.hazards[{kind,x,z,r,team}]` to the schema and the WORLD sanitizer (DESIGN-CAMPAIGN, WORLD; OI-MS8) |
| DA-12 | `missions_outline.md` M3 against `arenas.md` 1 and 2.3 | the enemy trench is at x 14..22 and the posts at x 18, but the medium enemy zone starts at x 32 (64 u edge to edge) and the arena text puts the trenches 20 u apart; "first contact 64 u, 8-12 s" cannot hold with both | outline coordinates used as written | reconcile in `arenas.md` 2.3 (DESIGN-WORLD, DESIGN-ERA-MODERN) |
| DA-13 | `puzzles.md` puzzle 3 "hull facing east (toward the player's start edge)" and puzzle 1 "east end ... facing west" | puzzle 3 puts the player on the east, every other puzzle and the Ancient puzzles on the west | tank at (-20, 0) facing +x as written (/puzzles/2/enemy/placements) | WORLD confirms which side `mod_desert_outpost` deploys the player on; flip x otherwise |
| DA-14 | `missions_outline.md` 3.6.4 row "Mod 5" in `spec/MS.md` | the spec says the second package `mod_sp_behemoth_dish` fires from the `reporters_go` event; the outline says "when the Behemoth first advances" (the second boxcar falls) | the outline is followed: event `behemoth_advances` (/missions/4/script/events/1) | correct the spec row (DESIGN-CAMPAIGN) |
| DA-15 | `ms.schema.json` closed objects | `_derived` / `_amend` keys cannot live in the JSON | this file plus `designAmendment` | strip `_*` keys in the lint, or add a `marks` block to the schema (DESIGN-CAMPAIGN) |
| DA-16 | `tools/ms_context.mjs` | the unit `tags` cell is kept as one string (`["organic line cover_ai"]`), so tag lookups (`destroy` tags, `unit_kill` tag, `burnKills`) would never match; not used by Modern | none | split the cell on spaces (DESIGN-CAMPAIGN) |
| DA-17 | `missions_outline.md` R4 (`powers.disable`) | no text for the greyed Minefield slot (`powers.reasons`) | `reasons` omitted (optional field) | COMEDY-MOD writes the reason (OI) |

## 3. Amended items (`_amend`), by pointer

### M2 mod_hedgerow_picnic (1)

| pointer | note |
|---|---|
| `/missions/1/blind` | identity swap: the roster has one unit type, so a composition swap is impossible; proposal: the blind variant carries a placement policy field |

### M3 mod_trench_pardon (3)

| pointer | note |
|---|---|
| `/missions/2/objective/params` | A3: outline capture {points:3, hold:12, holdAll:false} becomes {need:3, hold:0, flip:12} (live ownership); A1: the three markers are type capture, not hill |
| `/missions/2/rules/0` | A3 (spec/MS section 6): ownership is live, so rule 1 gains the sentence "Own all three at once to win." |
| `/missions/2/teaching/exceptions/1` | rosters.md gives the sharpshooter minRange 10, a shells field by outline 0.3 / carriesOf, and he is in the M3 roster; the outline declares only the dynamite thrower as the M3 exception. MS-C08 would fire once stats.js exists |

### M4 mod_bridge_too_far (4)

| pointer | note |
|---|---|
| `/missions/3/fixed/0/override` | outline override {ranged:null, melee:null, abilities:[], hp:700, name} (request R8) in the closed override form of D-MS-13: disarm, disableAbilities [bailout], hp, name |
| `/missions/3/objective/params` | A4: escort params.vip is a def id (lunchbox_apc), not parcel_van; reachOnly dropped |
| `/missions/3/teaching/exceptions/0` | the enemy of M4 fields 14 dynamite throwers (minRange 5, a shells field) and 8 drainpipe launchers (minRange 6); outline 0.3 declares exceptions only for M3, M6 |
| `/missions/3/teaching/exceptions/1` | see the dynamite_thrower exception of this mission |

### M5 mod_rail_yard_fireworks (2)

| pointer | note |
|---|---|
| `/missions/4/text/stars/2/text` | MS-K05 copy truth: the outline star 3 line says "You have two, and both ..."; the number word two is neither a helper arg, budget, par nor timeLimit. Minimal fix: "a pair" |
| `/missions/4/script/events/0` | the outline releases the reporters "when the first player gun finishes setup, or at 75 s"; M14 has no gun-setup trigger kind, so only the 75 s fallback is expressible |

### M6 mod_switchboard_hold (1)

| pointer | note |
|---|---|
| `/missions/5/objective` | A2: outline {core:"mod_switchboard_tower", waves:4} becomes {core: markerId, prop: propType}; the four waves are script.waves; the marker type is core, not waypoint |

### M7 mod_airfield_open_day (3)

| pointer | note |
|---|---|
| `/missions/6/blind` | outline section 4 says the blind bot "builds artillery and rifles into the sky", but the roster is air-only; swap chosen: spotter_balloon -> hobby_drone (MS-B11 warns, 140 -> 55 is 61 percent). Proposal: DESIGN-ERA-MODERN defines a blind swap for the air-only roster |
| `/missions/6/extraSetpieces/0/announcer/lines/1` | the outline gives only Brutus's line for this package; the schema needs the three voices (MS-P03). Plato line authored here in voice (ends on a question); COMEDY-MOD to confirm |
| `/missions/6/extraSetpieces/0/announcer/lines/2` | Cassandra line authored here in voice (short flat sentences, "I said"); COMEDY-MOD to confirm |

### P2 mod_pz_pin_cushion (1)

| pointer | note |
|---|---|
| `/puzzles/1/mechanicFired` | puzzles.md fires "pin_applied >= 6 and kills of pinned units >= 4"; mechanicFired carries one counter, so only pin_applied >= 6 is machine-readable (no canonical counter for kills of pinned units) |

### P3 mod_pz_plink_crunch (1)

| pointer | note |
|---|---|
| `/puzzles/2/bonus` | puzzles.md bonus "Win within 20 s of the first drainpipe shot" has no helper in the closed vocabulary (underTime counts from battle start); approximated by underTime(50) = the walk round (about 30 s) + the 20 s. Proposal: a helper that counts from the first shot of a def, or accept the absolute time |

### P4 mod_pz_too_close (2)

| pointer | note |
|---|---|
| `/puzzles/3/bonus` | puzzles.md bonus "A single shell kills three or more" has no helper (shellsOnTarget counts shell hits on a def, not kills per shell); approximated by shellsOnTarget(cub_reporter, 3) |
| `/puzzles/3/mechanicFired` | puzzles.md fires "shells kills >= 3 and a howitzer crater event >= 1"; one counter only: shell_hit >= 3 (no canonical crater counter) |

### P5 mod_pz_mind_the_gaps (1)

| pointer | note |
|---|---|
| `/puzzles/4/mechanicFired` | puzzles.md fires "mines triggers >= 3 and armour side or rear hits >= 3"; one counter only: mine_hit >= 3 |

## 4. Derived items (`_derived`), by pointer

Rules used everywhere: shot points are the outline's absolute (x, height, z) converted to `{anchor, offset:[dx, h, dz]}` against the nearest marker of the mission (schema `shotPoint`); sfx counts ("x3", "x9") are not representable and sit in the set-piece `notes`; a beat trigger written as prose became a snake_case machine name with the prose kept in `when`; hint-only beats copy the hint into `text` with Cassandra as `who`; enemy ranges ("x 25 and 28, z -18..18") became several groups on a line because a `line` formation is only about 1.15 u per unit wide; `inputs` is `[]` and `caps` is `{}` in every mission (the outline names neither).

### file (2)

| pointer | note |
|---|---|
| `/acts/0` | act titles and blurbs: the outline gives the act names and their taglines ("BASIC FORMS (\"Guns, hedges and the first pushpin\")"); the "Act I: " prefix follows the Ancient format |
| `/rewardParts/mod_aviator_goggles/blurb` | blurb: the outline names the part (+ item of mission 7) without text |

### M1 mod_boot_camp_dropout (24)

| pointer | note |
|---|---|
| `/missions/0/arena/props/0` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/1` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/2` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/3` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/4` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/5` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/6` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/7` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/8` | dummy position: z every 4 u from -16 to 16 as stated, x alternates between -6 and 6 ("x -6..6") |
| `/missions/0/arena/props/9` | loudspeaker post (variant 2) at the loudspeaker marker |
| `/missions/0/enemy/groups/0` | row of ten at x 25, z -18..18, split into four groups (a 10-unit line is only 11.5 u wide) |
| `/missions/0/enemy/groups/1` | row of ten at x 25, z -18..18, split into four groups (a 10-unit line is only 11.5 u wide) |
| `/missions/0/enemy/groups/2` | row of ten at x 25, z -18..18, split into four groups (a 10-unit line is only 11.5 u wide) |
| `/missions/0/enemy/groups/3` | row of ten at x 25, z -18..18, split into four groups (a 10-unit line is only 11.5 u wide) |
| `/missions/0/enemy/groups/4` | row of ten at x 28, z -18..18, split into four groups |
| `/missions/0/enemy/groups/5` | row of ten at x 28, z -18..18, split into four groups |
| `/missions/0/enemy/groups/6` | row of ten at x 28, z -18..18, split into four groups |
| `/missions/0/enemy/groups/7` | row of ten at x 28, z -18..18, split into four groups |
| `/missions/0/teaching/beats/9/trigger` | trigger name own_reload_cluster is a machine name for the prose condition (CU5 publishes the list) |
| `/missions/0/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/0/blind` | swap derived from the outline section 4 sentence; MS-B11 warns (runabout 170 -> trooper 110 is 35.3 percent) |
| `/missions/0/objective/text` | objective text: the outline gives the objective type; the line is built from its enemy name "open-day volunteers" |
| `/missions/0/rewards/substitution` | substitution id: the outline says "a generic helm of the same slot"; the key is a placeholder id for CU11 |
| `/missions/0/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |

### M2 mod_hedgerow_picnic (6)

| pointer | note |
|---|---|
| `/missions/1/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/1/teaching/beats/3/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra (the rules voice) |
| `/missions/1/arena/props/0` | hamper at the blanket centre (the picnic marker) |
| `/missions/1/objective/text` | objective text built from the outline objective sentence |
| `/missions/1/rewards/substitution` | substitution id: "a generic face part" in the outline; the key is a placeholder id for CU11 |
| `/missions/1/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |

### M3 mod_trench_pardon (17)

| pointer | note |
|---|---|
| `/missions/2/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/2/teaching/beats/1/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/2/teaching/beats/2/trigger` | trigger name pin_released is a machine name for the prose condition |
| `/missions/2/teaching/beats/3/trigger` | trigger name pinned_kill_by_flanker is a machine name for the prose condition |
| `/missions/2/teaching/beats/4/trigger` | trigger name red_dot is a machine name for the prose condition |
| `/missions/2/teaching/beats/5/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/2/enemy/groups/0` | three squads along the trench: the 32 clerks split 11 / 11 / 10 at z -20 / 0 / 20, x 18 (inside the stated x 14..22; the capture posts sit at x 18) |
| `/missions/2/enemy/groups/1` | second squad of the 32 clerks |
| `/missions/2/enemy/groups/2` | third squad of the 32 clerks |
| `/missions/2/enemy/groups/3` | six hired throwers split 3 + 3 behind the lip at x 22, z -10 / 10 |
| `/missions/2/enemy/groups/4` | second half of the hired throwers |
| `/missions/2/arena/props/0` | signal post at the post_mid marker |
| `/missions/2/arena/props/1` | signal post at the post_n marker |
| `/missions/2/arena/props/2` | signal post at the post_s marker |
| `/missions/2/blind` | swap derived from the outline section 4 sentence (the sharpshooter has no pin amount) |
| `/missions/2/objective/text` | objective text built from the outline objective sentence |
| `/missions/2/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |

### M4 mod_bridge_too_far (23)

| pointer | note |
|---|---|
| `/missions/3/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/3/teaching/beats/1/trigger` | trigger name armour_bonk is a machine name for the prose condition |
| `/missions/3/teaching/beats/2/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/3/teaching/beats/3/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/3/teaching/beats/4/trigger` | trigger name apc_bailout is a machine name for the prose condition; the callback gate is carried in `when` |
| `/missions/3/teaching/beats/5` | the outline gives a gated variant of mod_bailout_lunch; carried as its own beat id so each beat has one text (the gate is in `when`) |
| `/missions/3/teaching/beats/6/trigger` | trigger name dozer_blade_hit is a machine name for the prose condition |
| `/missions/3/enemy/groups/1` | three remaining ploughs on the far bank, x 36, z -6..6 |
| `/missions/3/enemy/groups/2` | three remaining ploughs on the far bank, x 36, z -6..6 |
| `/missions/3/enemy/groups/3` | three remaining ploughs on the far bank, x 36, z -6..6 |
| `/missions/3/enemy/groups/4` | ten bearers on the far half of the deck and the apron (x 14..30): two lines of five at x 18 and x 26, 8 u wide deck |
| `/missions/3/enemy/groups/5` | second line of bearers |
| `/missions/3/enemy/groups/6` | fourteen throwers on the cliffs on both sides of the far bank (x 26..40, z +-10..16): two groups of seven at z -12 / 12... x 33 |
| `/missions/3/enemy/groups/7` | fourteen throwers on the cliffs on both sides of the far bank (x 26..40, z +-10..16): two groups of seven at z -12 / 12... x 33 |
| `/missions/3/enemy/groups/8` | four ambush launchers at the far-bank sides (x 36, z +-14): two groups of two |
| `/missions/3/enemy/groups/9` | ambush launchers, south side |
| `/missions/3/enemy/groups/10` | four launchers behind the bearers (x 30) |
| `/missions/3/enemy/groups/11` | screen at the exit (x 38, in front of the far_bank marker); advances when the van passes the midpoint |
| `/missions/3/blind` | swap derived from the outline section 4 sentence; MS-B11 warns (APC 270 -> runabout 170 is 37 percent) |
| `/missions/3/objective/text` | objective text built from the outline objective sentence |
| `/missions/3/script/events/0/do/2` | beat id for the "script beat releases the lead dozer" (A8: an order op plus a beat op in one event) |
| `/missions/3/rewards/substitution` | substitution id: "a generic face part" in the outline; the key is a placeholder id for CU11 |
| `/missions/3/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |

### M5 mod_rail_yard_fireworks (20)

| pointer | note |
|---|---|
| `/missions/4/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/4/teaching/beats/1/trigger` | trigger name target_inside_min_range is a machine name for the prose condition |
| `/missions/4/teaching/beats/3/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/4/teaching/beats/4/trigger` | trigger name friendly_splash is a machine name for the prose condition |
| `/missions/4/teaching/beats/5/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/4/enemy/groups/0` | MG line at x 34..44 in the sandbag nests: ten tripods as five groups of two at x 40, z -20..20 |
| `/missions/4/enemy/groups/1` | MG line at x 34..44 in the sandbag nests: ten tripods as five groups of two at x 40, z -20..20 |
| `/missions/4/enemy/groups/2` | MG line at x 34..44 in the sandbag nests: ten tripods as five groups of two at x 40, z -20..20 |
| `/missions/4/enemy/groups/3` | MG line at x 34..44 in the sandbag nests: ten tripods as five groups of two at x 40, z -20..20 |
| `/missions/4/enemy/groups/4` | MG line at x 34..44 in the sandbag nests: ten tripods as five groups of two at x 40, z -20..20 |
| `/missions/4/enemy/groups/5` | four sharpshooters at x 46..52, at least 14 u behind the front: two groups of two at x 48 |
| `/missions/4/enemy/groups/6` | four sharpshooters at x 46..52, at least 14 u behind the front: two groups of two at x 48 |
| `/missions/4/enemy/groups/7` | fourteen reporters in the wagon rows at x 30..36: one group (the script orders it by id), loose skirmish formation, x 33 |
| `/missions/4/blind` | swap derived from the outline section 4 sentence (cost 210 -> 190) |
| `/missions/4/objective/text` | objective text built from the outline objective sentence |
| `/missions/4/rewards/substitution` | substitution id: "a generic back part" in the outline; the key is a placeholder id for CU11 |
| `/missions/4/extraSetpieces/0/sfx` | the outline names the sfx in words only (radio squelch, dish motor, door clang); ids follow the mod_<name> convention |
| `/missions/4/botsWhy` | botsWhy: the outline gives the band greedy [0.15, 0.6] without a reason; the text restates its section 4 sentence |
| `/missions/4/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |
| `/missions/4/extraSetpieces/0/shot/ease` | ease is not stated in the outline for this package; inout assumed |

### M6 mod_switchboard_hold (13)

| pointer | note |
|---|---|
| `/missions/5/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/5/teaching/beats/1/trigger` | trigger name tape_ring_seen is a machine name for the prose condition |
| `/missions/5/teaching/beats/3/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/5/teaching/beats/4/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/5/arena/props/1` | tape ring on one of the four pre-laid friendly mines (outline positions); the mines themselves have no MS field (R5 arena.hazards[].team) |
| `/missions/5/arena/props/2` | tape ring on one of the four pre-laid friendly mines (outline positions); the mines themselves have no MS field (R5 arena.hazards[].team) |
| `/missions/5/arena/props/3` | tape ring on one of the four pre-laid friendly mines (outline positions); the mines themselves have no MS field (R5 arena.hazards[].team) |
| `/missions/5/arena/props/4` | tape ring on one of the four pre-laid friendly mines (outline positions); the mines themselves have no MS field (R5 arena.hazards[].team) |
| `/missions/5/setpiece/shot/to` | orbit end point: radius 16 round the tower centre through 120 degrees, at 6 u height: (16 cos 120, 16 sin 120) = (-8, 13.86) |
| `/missions/5/blind` | swap derived from the outline section 4 sentence (cost 140 -> 130) |
| `/missions/5/objective/text` | objective text built from the outline objective sentence |
| `/missions/5/rewards/substitution` | substitution id: "a generic helm" in the outline; the key is a placeholder id for CU11 |
| `/missions/5/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |

### M7 mod_airfield_open_day (25)

| pointer | note |
|---|---|
| `/missions/6/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/6/teaching/beats/1/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/6/teaching/beats/2/trigger` | trigger name ground_only_idle is a machine name for the prose condition |
| `/missions/6/teaching/beats/3/trigger` | trigger name homing_line is a machine name for the prose condition |
| `/missions/6/teaching/beats/4/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra; trigger name spot_ring_seen is a machine name |
| `/missions/6/teaching/beats/5/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/6/enemy/groups/1` | sixteen clerks around the tower (x 40..52): four groups of four, west / north / south / east of the general |
| `/missions/6/enemy/groups/2` | second group of clerks around the tower |
| `/missions/6/enemy/groups/3` | third group of clerks around the tower |
| `/missions/6/enemy/groups/4` | fourth group of clerks around the tower |
| `/missions/6/enemy/groups/5` | four hired tripods on the hangar line (x 36..44); the hangar line z -34 is assumed (hangars on the north edge) |
| `/missions/6/enemy/groups/6` | second pair of hired tripods on the hangar line |
| `/missions/6/enemy/groups/7` | four hired parasols on the hangar line: two groups of two behind the tripods |
| `/missions/6/enemy/groups/8` | second pair of hired parasols |
| `/missions/6/enemy/groups/9` | two howitzers behind the tower (x 46..56): one each at x 48 and x 54 |
| `/missions/6/enemy/groups/10` | second howitzer behind the tower |
| `/missions/6/enemy/groups/11` | three mortar pairs behind the tower (x 46..56): 2 at x 46 and 1 at x 56 |
| `/missions/6/enemy/groups/12` | third mortar pair behind the tower |
| `/missions/6/objective/text` | objective text built from the outline objective sentence |
| `/missions/6/extraSetpieces/0/shot/from` | low-up on the tower: start and end heights are assumed (the outline says "a 3.0 s low-up on the tower") |
| `/missions/6/extraSetpieces/0/shot/to` | low-up end point (assumed height 8 u, the control tower is 9 u) |
| `/missions/6/extraSetpieces/0/sfx` | the outline lists no sfx for this package; the airfield PA chime is reused |
| `/missions/6/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |
| `/missions/6/extraSetpieces/0/shot/ease` | ease is not stated in the outline for this package; inout assumed |
| `/missions/6/extraSetpieces/0/stinger/secs` | secs: not stated; the length of mod_stg_bigband_sting in mission 7 (2.8 s) is reused |

### M8 mod_harbour_tour (12)

| pointer | note |
|---|---|
| `/missions/7/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/7/teaching/beats/1/trigger` | trigger name heal_first is a machine name for the prose condition |
| `/missions/7/teaching/beats/2/trigger` | trigger name repair_pulse is a machine name for the prose condition |
| `/missions/7/teaching/beats/3/trigger` | hint-only beat with no trigger in the outline: text copies the hint, who defaults to cassandra, trigger pulse_cast is assumed |
| `/missions/7/teaching/beats/4/trigger` | trigger name wave_cleared is a machine name for the prose condition "wave 3 cleared" |
| `/missions/7/teaching/beats/5/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/7/script/waves/list/0` | after values are the gaps between the outline wave times 15 / 75 / 140 / 215 s: 60, 65, 75 |
| `/missions/7/blind` | swap derived from the outline section 4 sentence (cost 140 -> 130) |
| `/missions/7/objective/text` | objective text built from the outline objective sentence |
| `/missions/7/rewards/substitution` | substitution id: "a generic weapon part" in the outline; the key is a placeholder id for CU11 |
| `/missions/7/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |
| `/missions/7/botsWhy` | botsWhy: the outline gives the band turtle [0.15, 0.8] without a reason; the text restates the design intent of its section 4 |

### M9 mod_dam_finale (35)

| pointer | note |
|---|---|
| `/missions/8/text/blurb` | blurb = the star 1 line (the outline has no separate card blurb) |
| `/missions/8/teaching/beats/1/trigger` | trigger name notice_ring is a machine name for the prose condition |
| `/missions/8/teaching/beats/2/text` | hint-only beat in the outline: text copies the hint, who defaults to cassandra |
| `/missions/8/teaching/beats/3/trigger` | trigger name teapot_front_hit is a machine name for the prose condition |
| `/missions/8/roster` | the outline says "the 29 non-boss Modern units, heroes included": every unit of the roster table that is not in boss_table.md (alphabetical) |
| `/missions/8/requiresModules` | the outline says "all (latest #16)": every module of the Modern E-FREEZE prefix, in landing order |
| `/missions/8/enemy/groups/1` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/2` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/3` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/4` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/5` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/6` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/7` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/8` | six tripods on the crest line (x 42..50, z -24..24): single units at z -23 / -18 / -13 / 13 / 18 / 23, x 42, clear of the Teapot and its two escorts |
| `/missions/8/enemy/groups/9` | six parasols behind the crest (x 50..56): three groups of two at x 53 |
| `/missions/8/enemy/groups/10` | six parasols behind the crest (x 50..56): three groups of two at x 53 |
| `/missions/8/enemy/groups/11` | six parasols behind the crest (x 50..56): three groups of two at x 53 |
| `/missions/8/enemy/groups/12` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/13` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/14` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/15` | placement inside the stated range (see the outline enemy list) |
| `/missions/8/enemy/groups/16` | ten peashooters advance down the ramps: two groups of five at the service ramps |
| `/missions/8/enemy/groups/17` | second group of peashooters |
| `/missions/8/blind` | swaps derived from the outline section 4 sentence "ignores half the tools"; the three support units become clerks (costs 140 / 140 / 130 -> 120) |
| `/missions/8/enemy/bosses` | boss_table.md section 6 lists the Final Notice and the Chandelier as campaign bosses of mission 9 |
| `/missions/8/objective/text` | objective text built from the outline objective sentence |
| `/missions/8/script/events/1/do/0` | strike numbers r 7 / dmg 180 / delay 2 s are the Final Notice shell of boss_table.md section 5 (aoe 7, 180, 2 s telegraph); the outline says only "script strike at left_gate" |
| `/missions/8/extraSetpieces/0/shot/from` | low-up from the basin floor (height 1 u assumed) |
| `/missions/8/extraSetpieces/0/shot/to` | low-up to the rotor (rotor at about 9 u, boss_table.md) |
| `/missions/8/extraSetpieces/0/sfx` | the outline lists no sfx for this package; the rotor flyby of mission 7 is reused |
| `/missions/8/friendlyFire` | friendlyFire is not in the outline: set from the mechanic text (shells, mines and area throwers hurt friends in missions 5, 6, 8, 9; false elsewhere) |
| `/missions/8/enemy/hired` | hired list: the outline says "marmalade plus a mixed final stand"; the non-marmalade groups are flagged hired |
| `/missions/8/rewards/codex` | codex page id everything_else: the outline names the page "Everything Else"; rewards.primary.id must be snake_case and equal the codex entry |
| `/missions/8/extraSetpieces/0/shot/ease` | ease is not stated in the outline for this package; inout assumed |
| `/missions/8/extraSetpieces/0/stinger/secs` | secs: not stated; the length of mod_stg_bigband_sting in mission 7 (2.8 s) is reused |

### P1 mod_pz_duck_cover (6)

| pointer | note |
|---|---|
| `/puzzles/0/arena/props` | three sandbag chains at 8, 15 and 22 u from the west arena edge (x -32), staggered north-south (z -6 / 6 / -6), five wall pieces per chain; the outline measures "the player's edge" without defining it |
| `/puzzles/0/enemy/placements` | six troopers 24..27 u from the west edge (outline: 22-28 u), facing west; z -4 / 0 / 4 |
| `/puzzles/0/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/0/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/0/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/0/player/faction` | faction: mixed when the roster spans several factions |

### P2 mod_pz_pin_cushion (5)

| pointer | note |
|---|---|
| `/puzzles/1/enemy/placements` | ten peashooters on the near trench lip (x -6, the trench_lip x of mission 3), z -9..9 every 2 u, facing west |
| `/puzzles/1/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/1/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/1/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/1/player/faction` | faction: mixed when the roster spans several factions |

### P3 mod_pz_plink_crunch (5)

| pointer | note |
|---|---|
| `/puzzles/2/enemy/placements` | tank at (-20, 0) facing east (heading +pi/2) as the outline says, "toward the player's start edge": the puzzle therefore assumes the player deploys on the EAST side of mod_desert_outpost (OPEN: WORLD to confirm the zone side); escort troopers on the north flank at (-14, 14 / 16), the flank "furthest from the compound gates" being assumed (gate positions are recipe data) |
| `/puzzles/2/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/2/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/2/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/2/player/faction` | faction: mixed when the roster spans several factions |

### P4 mod_pz_too_close (5)

| pointer | note |
|---|---|
| `/puzzles/3/enemy/placements` | eight reporters 46 u from the player's front edge (x -32) = x 14 in the main aisle (6 u wide, z 0): two columns of four; the "advance after 3 s" delay has no field and is dropped (they advance from tick 0) |
| `/puzzles/3/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/3/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/3/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/3/player/faction` | faction: mixed when the roster spans several factions |

### P5 mod_pz_mind_the_gaps (5)

| pointer | note |
|---|---|
| `/puzzles/4/enemy/placements` | three tanks in a column along the road at x 30 / 36 / 42, facing west; "entering the far-bank choke from 30 u out" fixes no coordinate |
| `/puzzles/4/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/4/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/4/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/4/player/faction` | faction: mixed when the roster spans several factions |

### P6 mod_pz_cassandra_helicopter (5)

| pointer | note |
|---|---|
| `/puzzles/5/enemy/placements` | the air group arrives from the sea edge (north, z -40..-42), facing the quay (heading 0 = +z); x -4 / 0 / 4 |
| `/puzzles/5/hint` | hint and goalText are derived from "The trick" and the enemy line of puzzles.md (the per-puzzle text promised for "part 2" does not exist); blurb is the "Blurb seed" sentence capitalised |
| `/puzzles/5/firstSightBeat` | first-sight beat: id mod_pz_fs_<mechanic>, text = the hint of the teaching mission beat (the outline says "the CU5 beat of the teaching mission, shortened"), trigger placement_start assumed |
| `/puzzles/5/bonus/id` | bonus id is invented (the table gives only the bonus sentence) |
| `/puzzles/5/player/faction` | faction: mixed when the roster spans several factions |

## 5. Mutation proofs run while converting (scratch copies, nothing committed)

| mutation | result |
|---|---|
| `_derived: true` on one enemy group | MS-S01 unknown property (1 error) |
| the original M5 star 3 text ("You have two") | MS-K05 number 2 not a helper arg / budget / par / timeLimit |
| M3 and M4 exceptions removed with a hand-built `carries` context | MS-C08 for long_lens_sharpshooter (M3), dynamite_thrower and drainpipe_launcher (M4) |

## 6. Open items

| id | item | owner | phase |
|---|---|---|---|
| OI-MOD-1 | confirm or rewrite the derived copy: the puzzle hints and goal texts, the mission card blurbs (= star 1 lines), the Pellmell lines | COMEDY-MOD | P2 |
| OI-MOD-2 | fix the reference armies and the placements against `stats.js` after BALANCE; every derived coordinate is a design-intent position | CAMPAIGN-MOD, BALANCE | P3 |
| OI-MOD-3 | re-run `node tools/ms_lint.mjs --era=modern` once `src/content/era_modern/stats.js` exists: `carries` activates MS-C08 for the 97 unit uses (DA-03 predicts the result) | CAMPAIGN-MOD | with stats.js |
| OI-MOD-4 | DA-01 to DA-17 above | owners in the table | before OI-MS5 closes |
| OI-MOD-5 | `rewardParts` keys (`mod_helm_tin_hat`, `mod_visor_eyeshade`, `mod_goggles`, `mod_back_radio`, `mod_hard_hat`, `mod_wrench_big`, `mod_aviator_goggles`) follow the ladder of `arenas.md` 3.1; the substitution ids (`mod_generic_helm`, `mod_generic_face`, `mod_generic_back`, `mod_generic_weapon`) are placeholders for CU11 | UI (CU11) | P1 |

