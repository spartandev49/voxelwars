# Modern mutators and achievements (binding)

Owner: DESIGN-ERA-MODERN part 2. Consumers: SIM (`sim/mutators.js` rows), UI (`_mutpicker`, achievements screen, CU16 matrix), `save/stats.js` (new lifetime keys, whitelist), COMEDY-MOD (copy), BALANCE (mutator-off controls). Campaign missions force `mutators: []` (`applyModeRules`), so neither mutator touches a mission or a star test; they live in Quick Battle, Survival and Daily.

## 1. Two era mutators (shared nine + these two)

The shared nine (`big_heads tiny_titans moon_gravity chicken_rain wine_rain_always friendly_fire_fiesta speedy_soldiers ragdoll_frenzy glass_cannons`) unlock by TOTAL stars across all eras (thresholds 3..27, never raised). The two below unlock by mission reward (CU11 ledger rows M3 and M7). Text shape follows `mutators_text.js`: `{id, name, desc, short (<= 6 words), locked}` plus the new `joke` and `mods`. `feel_sheet.md` s12 excluded proposal A's `mod_loud_pops` (a permanently pinned field is the stalemate the sheet forbids); it stays in reserve (section 4).

### 1.1 `mod_red_tape`, "Red Tape"

| field | value |
|---|---|
| unlock | mission reward of `mod_trench_pardon` (M3) |
| name | Red Tape |
| desc | Every reload takes twice as long and every magazine holds twice as much. Soldiers fire longer, then stand around reloading even longer. The announcer insists on triplicate. |
| short | Double magazines, double reloads |
| joke | "Everything is in triplicate. Including the waiting." |
| locked | "Locked. Take the Long Trench. The paperwork is in the mud." |
| mods (design keys; SIM maps them to the mutator table) | `reloadMul: 2.0` and `magMul: 2.0` on every def with a magazine (rifle, SMG, pea, MG, sharpshooter, rocket, drainpipe; the Tripod's 40 becomes 80 and its reload 3 s becomes 6 s); burst structure, cooldowns and damage are unchanged; crew weapons keep their `setup`; melee, shells and ability cooldowns are NOT scaled; `announcerFlag: 'triplicate'` (a text-only flag read by the announcer pool: replaces "reload" lines with "in triplicate" variants) |
| mutator x mechanic matrix | DISABLED with reason in Puzzles ("Puzzle weapons are pre-stamped"); allowed with every shared mutator, including `moon_gravity` and `glass_cannons`; independent of `mod_airmail` |
| design check (ER7 control) | mutator-off vs on: damage per minute within +-15 percent of baseline on the Modern ring rows; the number of `reload_hit` events per battle rises by at least 30 percent (the windows are twice as long); the ring rows 1, 2 and 11 keep their direction (cover beats open, the pin beats the charge, a flank beats a pin) |
| announcer hook | category `mutator_mod_red_tape` x3: [B] "RED TAPE! Everyone reloads in triplicate! There is a form for the form!" [P] "A magazine twice as large is twice as long to refill. Is that progress, or a longer pause?" [C] "The reload now takes as long as the briefing. I said it would take as long as the briefing." |

### 1.2 `mod_airmail`, "Airmail Is Not Insured"

| field | value |
|---|---|
| unlock | mission reward of `mod_airfield_open_day` (M7) |
| name | Airmail Is Not Insured |
| desc | Every twenty seconds a parcel falls from a passing aircraft onto a random spot, friend or foe. A red ring gives two seconds' warning. It does forty damage. The aircraft is not sorry. |
| short | A random parcel every twenty seconds |
| joke | "Delivered to the wrong address, on purpose. Signature: whoever is underneath." |
| locked | "Locked. Win Airfield Open Day. The parcel is in the post." |
| mods | `periodicStrike {first:12, every:20, telegraph:2, r:6, dmg:40, type:'explosive', ap:0, point:'random_on_field', friendly:true, noSpawnZoneFirst:10, fork:'era:airmail'}`: a script `strike` event (M14) using its own RNG fork so battles stay deterministic; the point is never inside a deployment zone before 10 s; it counts as environmental damage (no kill credit; the kill feed prints "was under the parcel") |
| mutator x mechanic matrix | DISABLED with reason in Puzzles ("A puzzle has no mail"); disabled with reason together with `friendly_fire_fiesta` ("Two kinds of everyone gets hit. The post office refuses to choose"); allowed with `moon_gravity` (the parcel falls slowly; the telegraph is unchanged) |
| design check | mutator-off vs on: median battle length unchanged (+-10 percent); the strike hits friends and foes in a ratio inside 40 to 60 percent over 200 battles; no unit dies to the strike alone in a fresh army (40 damage against a trooper's 105 hp); the telegraph is visible at 60 u |
| announcer hook | category `mutator_mod_airmail` x3: [B] "A PARCEL from the sky! It is not for anyone! It is for everyone!" [P] "The parcel does not choose between friend and foe. Is that justice, or merely the post?" [C] "Every twenty seconds. I put it in the diary. I put it in the diary twice." |

### 1.3 Reserve (not shipped)

`mod_loud_pops` (every bullet suppresses with x2.5 radius, damage x0.75) from proposal A: excluded by `feel_sheet.md` because it makes a permanent pin stalemate. `mod_jam_session` (6 percent misfire on every unit, magazines x1.5) from proposal B overlaps `mod_red_tape` and the Wheelbarrow Cannon's misfire gag. Both stay as possible patches.

## 2. New lifetime stat keys and BattleSummary fields

`normalizeStats` drops unknown keys on every load, so these MUST be added to `NUM_KEYS` (and to the Doc/`transfer.js` whitelist) or the achievements below silently never unlock. All are non-negative counters. The `mod` prefix keeps them era-scoped. Sources are the same `MissionTracker` counters as `usedMechanic` (`missions_outline.md` 0.2), now also produced in plain battles.

| stat key (lifetime, `stats.`) | summary field (per battle, `ev.`) | counts | source event |
|---|---|---|---|
| `modPins` | `ev.pinsDistinct` | distinct enemy units that reached a full pin (first time per unit) | `pin_applied` |
| `modCoverHits` | `ev.coverHits`, `ev.coverFrac` | hits on the player's units that cover halved; the share of the player's unit-seconds with `inCover` | `cover_hit`, per-tick `inCover` |
| `modReloadHits` | `ev.reloadHits`, `ev.hitsWhileReloading` | hits the player dealt to reloading enemies; hits the player took while reloading | `reload_hit` (dealt), `reload_hit_taken` (taken) |
| `modMineKills` | `ev.byCause.mine` (existing map) | enemy units knocked out by mines | `unit_kill` cause `mine` |
| `modRearKills` | `ev.vehicleRearKills` | enemy vehicles knocked out by a killing hit resolved to the rear arc | `unit_kill` with `face:'rear'` |
| `modHealedHp` | `ev.healedHp` | hit points healed or repaired on the player's side | `unit_heal` sum |
| `modCraters` | `ev.craters` | craters made in the battle | `crater` |
| `modAirKills` | `ev.airKillsByDef` (map by killer def) | air-layer units killed, by the killing def | `unit_kill` with target layer `air` |
| `modShells` | `ev.shellHits` | indirect-fire damage events that hurt an enemy | `shell_hit` |
| (per battle only, no lifetime key) | `ev.damageTakenByDef` (map by def) | damage taken per player def in the battle | `unit_hit` |

The existing `godPowers` map (`godPowers.mod_gp_tea_break`, ...) already counts casts.

## 3. Twelve achievements

Three are generated per era by the shared helper (`ancient_history`, `overachiever`, `tourist` semantics); eight are designed; one is hidden. Ids carry `mod_`; icons are existing icon-set words or new simple glyphs (UI picks). `desc` is funny and states the condition; the hidden one is "???" until unlocked. Tests are written against the lifetime object `stats` (already updated with the battle) and the per-battle summary `ev`, like `humor/achievements.js`.

| # | id | name | desc (shown) | icon | test |
|---|---|---|---|---|---|
| 1 | `mod_history` | Briefing Complete (Please Hold) | Finish the Modern campaign. A teapot, a mobile and a dam, in that order. | clipboard | `stats.campaign.completedEras` includes `'modern'` (generated: all nine `mod_*` missions have >= 1 star) |
| 2 | `mod_overachiever` | In Triplicate | Earn all 27 stars in the Modern campaign. The stamp pad has run dry. | stamp | `totalCampaignStars(modMissions) === 27` |
| 3 | `mod_tourist` | Site Visit (Hard Hat Required) | Fight on all 12 Modern arenas. The cow was on the roundabout. | map | `Object.keys(stats.arenasPlayed)` contains every `mod_*` arena id (12) |
| 4 | `mod_pinned_it` | Pinned It | Pin 25 different enemies in one battle. The pushpin supply is a national concern. | pushpin | `ev.pinsDistinct >= 25` |
| 5 | `mod_cover_artist` | Duck, Duck, Cover | Win a battle spending at least 70 percent of your unit-seconds in cover. Hedges have been tipped. | hedge | `ev.won && ev.coverFrac >= 0.70` |
| 6 | `mod_empty_click` | Empty Click | Be hit 15 times while reloading in one battle. An achievement for failing, which is the best kind. | bullet | `ev.hitsWhileReloading >= 15` |
| 7 | `mod_mine_host` | Mine Host | Knock out 10 enemies with your mines in one battle. The tape was, once again, accurate. | tape | `(ev.byCause.mine \|\| 0) >= 10` |
| 8 | `mod_rear_view` | Rear View Mirror | Knock out 5 vehicles with rear hits in one battle. Armour has a back; you read the label. | mirror | `ev.vehicleRearKills >= 5` |
| 9 | `mod_tea_break` | Tea Break | Heal or repair 5,000 hit points, lifetime. It was orange. Nobody asked. | mug | `stats.modHealedHp >= 5000` |
| 10 | `mod_crater_face` | Crater Face | Make 30 craters in one battle. The ground has filed a complaint. | crater | `ev.craters >= 30` |
| 11 | `mod_umbrella_policy` | Umbrella Policy | Shoot down 15 air units with Parasol Missileers in one battle. It rained upward. | umbrella | `(ev.airKillsByDef.parasol_missileer \|\| 0) >= 15` |
| 12 | HIDDEN `mod_goldfish_hours` | Goldfish Flight Hours | `???` (unlocked text: "Win a battle in which a Fishbowl Chopper never took a single point of damage. The goldfish has logged the hours.") | fish | `ev.won && (ev.startDefs.fishbowl_chopper \|\| 0) >= 1 && (ev.damageTakenByDef.fishbowl_chopper \|\| 0) === 0` |

Notes: (1) `mod_history` fires from the same campaign event as `ancient_history` (CU9) and must not fire for Ancient or Medieval. (2) Achievement ids are immutable once shipped. (3) The achievements screen groups by era with filter tabs (CU9); `mod_goldfish_hours` shows as a locked card with a question mark. (4) **Mechanic coverage:** reload #6, cover #5, pin #4, shells and craters #10, armour #8, mines #7, air #11, repair #9: all eight lessons have an achievement, which is the reverse of the Medieval gap (arc fire there). (5) Reserve (not shipped): proposal B's `mod_plink` (50 rounds bounce off armour in one battle) and `mod_return_to_sender` (kill 5 of your own with your own strikes in one battle; `friendly_splash` counter), kept for a patch.

## 4. Mutator and achievement checks for the gate

1. Every achievement id above exists in the achievements screen test and in `NUM_KEYS` where it reads a lifetime key (only `mod_tea_break` and the generated three do; the per-battle fields `pinsDistinct`, `coverFrac`, `hitsWhileReloading`, `vehicleRearKills`, `craters`, `airKillsByDef` and `damageTakenByDef` are added to the `BattleSummary` contract).
2. The two mutator ids resolve in `_mutpicker`, in the CU16 matrix and in `transfer.js` enums; a share code carrying either validates only when the reward is earned or the code is imported with the mutator unlocked (the Ancient rule).
3. The hidden achievement is invisible to the Codex and to the Stats screen until unlocked.
4. `mod_red_tape` and `mod_airmail` never appear in `campaignApi.rules` (mutators forced `[]`).
