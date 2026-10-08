# spec/S-slice: the slice gates of the "three new eras" program (DESIGN-UX, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (0.4, 0.5, 5, 8 CU3 CU5 CU6, 9 ER8 ER11 ER17 ER19 ER20 ER21 ER27, 12 "P1" and "P2" rows and the calibration table, 13, 14 row `spec/S-slice`), `traceability.md`, `q2_product.md` Q1, `q2_schedule.md` Q8, `q3_program.md` residual 18, `q3_product.md` residual 22, `q1_product.md` Q4 (the first rubric list), `q1_scope.md` Q3, `maps/06` and `maps/07`, the final specs `AR`, `M`, `M-layers`, `RA` (3.11 `CameraRig.shot`, 3.14 hooks, 3.17 tracer matrix), `W` (3.7.5 first contact), `UC` (3.14 sets, 3.15 contracts), `MS` (3.6.4 set-piece triggers, D-MS-12 lite events), `CU` (3.3 set-pieces, 3.5 teaching, 3.6 chooser and flow table, 3.20.4 work packages), `VF` (3.9 `campaign_play`, 3.11 perf protocol, 3.14 panel, 3.16 readability, 3.18 independence, 3.21 DoD, 3.23 ER27 and walks), and the design bibles `design/{medieval,modern,scifi}/{feel_sheet,rosters,missions_outline,first_three_minutes,arenas,props,god_powers,humour,sound_music,visual_bible,ui_chrome}.md`.

Facts were read in the tree at HEAD `e92db81` (code unchanged since `ancient-v8` apart from the provenance and tooling edits listed by `git status`). Where a spec and a design file disagree, section 6 says which one wins. Paths are repo-relative; `design/<era>/` means `docs/eras/design/<era>/`. Tier letters follow `VF`: **F** T-fast, **E** T-era, **U** T-full, **R** release-only, **H** scheduled-heavy. "Agent" always means a model agent; nothing in this file is judged by a person, and the final message says so (plan 9, hosted honesty).

Vocabulary. **Slice** = a review of one era at one of two points: the **plumbing slice** (`<era>_plumbing`, end of P1, mission 1 of the era through the real UI) and the **mechanic slice** (`<era>_mechanic`, after the last module of the era's E-FREEZE prefix has landed, a scripted 20-30 unit scenario that shows the era's headline mechanics). **Item** = one scored rubric line. **Persona** = a fresh agent playing the built page through a closed command set (3.7). **Verdict file** = `docs/eras/slices/<era>_<slice>.md`. **Round** = one full judging of the rubric (round 0, then rework rounds 1 and 2). Modules are named (M7, M13), never by landing number: the landing order is reconciled elsewhere (COORD decision).

## 1. Purpose and scope

**This file binds** (a) what each slice contains: the plumbing slice scope (modules, CU items, world, units, audio, text, harness) in 3.2 and the exact P1 work packages that produce every piece in 3.4; the three mechanic scenarios (arena, 20-30 unit roster by id, script, set-pieces, camera shots, what the reviewer sees) in 3.5; (b) the rubric: 10 scored items per slice with numbers and a named tool or judge, in 3.6 and as a machine-readable block; (c) the judges: persona definitions, the REVIEWER role, the comedy panel, the independence kit, the quiz and strip keys, the verdict file shape, in 3.7; (d) the consequence rules: the volume gate, the rework limit, the COORD decision, staleness, in 3.8; (e) how a failure routes back to design change control, in 3.9; (f) which UC clauses a tracer, a slice unit and a calibration-2 unit must meet, and what calibration 1 and 2 measure, in 3.2.3 and 3.10; (g) the first-10-minutes walks as scripted steps with owner, assertion and screenshot, in 3.11; (h) hooks, tools, files, Ancient-path rows and requests, in 3.12.

**Not in scope:** the content of mission and unit text (spec/H), the audio rows (spec/AU), balance numbers (BALANCE), the full-campaign DoD (VF 3.21 clauses M1..M10 for the 27 missions), puzzles, survival, daily, Quick, Codex, Workshop and Arena Builder flows (they are judged by ER9, ER10, ER22, not here), QA rounds (VF 3.18). The slices do not replace those gates; they decide whether volume work may start.

**Ancient policy (plan 0.1).** Nothing here edits an Ancient file. The slice tooling reads Ancient as a control: the same tools run on Ancient mission 1 (`marathon_sort_of`) and on the Ancient 43 and write `tests/baseline/slice_ancient.json` (3.8.7) so the new-era thresholds that are relative to Ancient (comedy, announcer density, readability ratchet, fingerprint) have a measured base. Every Ancient path touched by the hooks and build flags of 3.12 is listed with its policy (bit-identical opt-in, AP-SL1..AP-SL3); with `released = {ancient}` and no `--slice` flag the built page equals the v8 behaviour (SL-T11).

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| SL-D01 | **Two slices per era, six reviews in total.** `<era>_plumbing` (P1) proves the pipe: registry, chooser, map, briefing, placement, battle, set-piece, teaching, announcer, results, reward, with the era's real mission 1. `<era>_mechanic` (P2) proves the feel of the era's headline mechanics in one scripted scenario. Names of the verdict files: `docs/eras/slices/<era>_plumbing.md`, `<era>_mechanic.md`. | q2_schedule Q8: a slice that "plays" at the end of P1 cannot show shields, cover or the dragon; q2_product Q1 asked for a rubric and a consequence. Plan 12 P1 and P2 rows. | 12, 14 |
| SL-D02 | **Verdict rule.** Exactly 10 scored items per slice, each `PASS`, `WARN` or `FAIL`. The slice passes iff there is no `FAIL`, no `UNVERIFIED` and at most 3 `WARN`; every `WARN` has a ledger row with owner and deadline phase. `WARN` is a PASS inside a written band, recorded as `WARN` so the band is visible (for the gate every item is therefore PASS or FAIL, plus the cap of 3 `WARN`). `UNVERIFIED` (a tool did not run, a hook is missing, a judge was not independent) is a `FAIL`. | q2_product Q1 "numeric pass lines, each backed by a tool or a named judge"; VF-D rule that a check without a negative control is UNVERIFIED. | 9, 14 |
| SL-D03 | **Judges.** Tool, comedy panel (VF 3.14), persona (fresh agent), REVIEWER. Every item names at least one tool or named judge; an item judged only by its builder is invalid. The verdict file is signed by a REVIEWER who authored nothing in the slice's file set (checked by ledger roles, SL-T03). | plan 14 acceptance "rubric items each name a tool or judge". | 14 |
| SL-D04 | **The slice build.** `node tools/build.mjs --minify --state=ancient,<era> --slice --out .cache/dist/slice/<era>_<slice>` produces a page in which the named eras are `released` and the era's `slice_mission` rows are present. Without `--slice` the rows are stripped and no `_slice_` id appears in any file (SL-T12). Fallback if the flags are not delivered: the snapshot worktree edits its own `eras.config.js` status column (never the shared tree). | the real UI path needs a released era (CU-D01: hidden eras appear in no UI); AR 3.11 already omits hidden rows. | 3, AR1 |
| SL-D05 | **Plumbing scope is mission 1 exactly as designed.** The mission is the real `missions.json` object (no slice variant). What cannot run because a module has not landed is declared inert by the design (Sci-Fi bubbles, Modern cover previews) and the beats that depend on it are silent (design/scifi first_three_minutes rule 11). | design/{medieval,modern,scifi} state "mission 1 needs only the first five modules". | 12 |
| SL-D06 | **The mechanic scenario is a mission object, not a variant of the UI.** `design/<era>/slice_mechanic.json` has the MS shape, one mission, `slice: true`, id `<prefix>_slice_mech`, 20-30 units by id, set-pieces and beats REUSED from the campaign missions that teach the mechanics (no new set-piece id), `rewardId: null`. It is excluded from `missions`, from stars, from UC-80 membership and from every count. A persona reaches it through `__vw.slice.open` (the deep link of CU-D02 with a `slice` param), after the plumbing slice has already proven the campaign path. | MS D-MS-03 (one shape for all missions); the mechanics need their missions' set-pieces anyway, so nothing is wasted. | 12, MS |
| SL-D07 | **Unit sets.** Plumbing slice: every unit of mission 1 meets the UC `TRACER` set (UC 3.14) and nothing more; the six P1-impossible clauses stay `PEND`. Mechanic slice: every unit of the scenario meets the set `SL` = `DONE` minus UC-70..73 (the balance band), i.e. `UC-B` plus UC-25, 31, 40, 41, 42. Calibration 2 measures `UC-B` per rig class (3.10). | UC 3.14: B excludes the reaction-per-cause and audio clauses because those modules or tables had not landed at calibration 2; by the mechanic slice M17e and AU4 have landed. | 5, 12 |
| SL-D08 | **Caps before the mechanic slice passes** (plan 12): per era at most 3 arena recipes, at most 10 era-prefixed props (shared `any` props are free), units = the tracer set plus at most 6 named slice additions (3.5). `tools/slice_scope.mjs` counts them from the registry and the recipes; going over is a red. | plan 12 P2: "units beyond tracers, props beyond 10, arenas beyond 3 start only when the slice passes". | 12 |
| SL-D09 | **What "volume" means.** Eight work classes V1..V8 (3.8.1) are blocked per era until `<era>_mechanic` is PASS; the SIM modules, tracers per rig, tools, design, mission JSON authoring and the rework itself are never blocked. The block is a column of `wbs.csv` (`slice_gate`) read by a gate step, not a convention. | q2_product Q1 (d); an unenforced rule is not a gate. | 12 |
| SL-D10 | **P1 exit is not hostage to feel.** `p1-done` (AR 3.10.4) needs the three infrastructure items of every plumbing slice (SLP-1 flow, SLP-2 walks, SLP-10 budgets) PASS; the feel items (SLP-3..SLP-9) may still be in rework at `p1-done`, but they gate the era's mechanic-slice request and its volume. | one failing look in one era must not stop the other two eras or the SIM chain. | 12 |
| SL-D11 | **At most 2 rework rounds, then COORD decides** (3.8.3): a logged cut (ladder rung, never a NEVER-cut item) and/or a feel-sheet or roster amendment, followed by one **closing review** of the affected items. If the closing review fails the era stays hidden, volume stays blocked, the other eras proceed and the final message says so (plan 12 "finish and release one era at a time"). There is no step that waits for a human. | q2_product Q1 (d); plan 12 calibration table ("no step waits for a human answer"). | 12, 13 |
| SL-D12 | **Fresh judges every round.** A persona or panel rater never sees an earlier round of the same slice, builder notes, the plan, the specs, the design bibles or the tests. The kit is a private worktree with those paths physically removed and checked (SL-T04), extending the VF 3.18 independence protocol with a `slice` profile. | VF-D14; q2_product Q1 (c) "a fresh persona agent that has not seen builder notes". | 9 |
| SL-D13 | **First contact uses the W bands, not the plan's single 6-20 s.** Medium and large arenas: [6, 20] s for foot-speed closing, [4, 20] / [5, 24] for fast closing; small arenas [3, 14]; `inRange0 = 0`; dead-air p90 <= 1 (W 3.7.5, PC-W1). A single slice cell may miss by 2 s and then scores `WARN`. | W 3.7.5 shows that 6 s is unreachable on small arenas and that Ancient itself measures 1.5..8.1 s. | 7 |
| SL-D14 | **Mechanic slices reuse the campaign's set-pieces, beats and counters.** The scenario's set-pieces are `med_sp_gate_falls` and `med_sp_dragon_wakes`, `mod_sp_over_the_top`, `sf_sp_please_hold` (3.5); their rows, shots, stingers and lines are written once and reused by missions 5, 9 / 3 / 5. Slice-written assets are not throwaway. | MS 3.6.4 already realises these triggers; the scenarios were chosen so that each trigger fires naturally. | 8, MS |
| SL-D15 | **Preview reviews are allowed and never gate.** Any time after a headline module lands, TOOLS-VERIFY may run `slice_run --preview` (tool items only, one persona) and write `docs/eras/slices/preview/<era>_<slice>_<sha8>.md`. A preview never counts as a round and never unlocks volume. | the plan places the Sci-Fi slice after the last module; findings should not wait for it (risk in 3.8.6). | 12 |
| SL-D16 | **Tool first, persona second.** Persona sessions (the expensive part) start only when the tool items SLx-1 and SLx-2 of that slice are not FAIL in the same round. A persona cannot be asked to judge a build that does not run. | cost: 3 persona sessions per review. | 12 |
| SL-D17 | **Evidence is archived and hashed.** Each round writes `.cache/slice/<era>_<slice>/r<k>/` and copies the committed subset (scorecards, CSVs, strips, <= 30 webp frames of <= 80 KB, persona logs) to `docs/eras/slices/evidence/<era>_<slice>/r<k>/`; the verdict lists sha256 of every committed file. | VF-D rule: reports quote the sha they tested. | 9 |
| SL-D18 | **Staleness never reopens the volume gate.** A PASS verdict records `gate.json` once (append-only). Later changes to the slice's input sets turn items `STALE`; the era DoD clause E4 (VF 3.21) needs every item CURRENT or re-judged at the era's freeze (3.8.5), but running volume work is not stopped. | a retroactive block would waste the work it is meant to protect. | 12 |
| SL-D19 | **A building era renders honestly** (3.2.6): unauthored missions show as locked "In production" pins, the results screen offers the map instead of NEXT when no next mission exists, the HUD lists only god powers whose row is `ready: true`. These rules apply only while the era manifest says `phase: 'building'`; at `complete` the same data must have nine missions and six ready powers (registry verify), so they cannot hide a gap in a release. | VF step 10/11 of `campaign_play` assume a mission 2; a stub button in a slice build would produce false BLOCKED marks. | 8 |
| SL-D20 | **Reviews cost sessions and box time and are in the ledger.** Planning values: a review = 5 sessions (3 personas, 1 REVIEWER, 1 operator for the tool run); a re-review of failed items = 1 to 3 sessions; tool run = 12 CPU-min under `nice` plus a 25-min `quiet` slot for the perf rows (plumbing), and 25 CPU-min under `nice` plus a 30-min `quiet` slot (mechanic). `ledger_stats` reports them as their own class; `wbs.csv` carries rows `SLW-*` (3.4, 3.5.9). | plan 12 sizing rules; VF 3.19 box budget gets a new row (R-SL-V2). | 12 |

## 3. Detailed specification

### 3.1 Lifecycle of a slice

| state | entered by | exit | who |
|---|---|---|---|
| `NOT_READY` | initial | `slice_gate --request` passes the preconditions G0 (3.2.5 for plumbing, 3.5.8 for mechanic) | the era's DESIGN-ERA lead |
| `REQUESTED` | `node tools/slice_gate.mjs --request <era> <slice>` (writes `.cache/slice/<era>_<slice>/pre.json`, freezes a snapshot sha `S` with `git worktree add .cache/snap/<S>`) | tool run starts | COORD or the era lead |
| `TOOLS` | `node tools/slice_run.mjs --era <era> --slice <slice> --round <k>` (tool items, 3.6) | persona gate (SL-D16) | TOOLS-VERIFY |
| `PERSONAS` | three fresh persona sessions on kit worktrees (3.7.2) and the REVIEWER session | verdict compiled | REVIEWER |
| `JUDGED(k)` | `node tools/slice_review.mjs --compile --round <k>` writes the verdict file | PASS: `gate.json` appended (3.8.2). FAIL: `REWORK(k+1)` | REVIEWER signs |
| `REWORK(1..2)` | findings file `docs/eras/slices/<era>_<slice>_rework<k>.md` | owners fix, COORD calls `--request` again with `--round <k>` | owners |
| `COORD_DECISION` | round 2 FAIL | a `cuts.md` row and/or an amendment (3.9), then `CLOSING` | COORD |
| `CLOSING` | one review of failed and invalidated items (not a rework round) | PASS, or the era stays hidden (SL-D11) | REVIEWER |

A round counts only if its `S` equals the sha of the committed verdict (`tested_sha` in the front matter). A precheck failure is not a round. The verdict file is rewritten each round; the previous version is copied to `docs/eras/slices/history/<era>_<slice>_r<k>.md`.

### 3.2 The plumbing slice (P1)

#### 3.2.1 What it is and how a reviewer reaches it

Mission 1 of the era, as authored in `design/<era>/missions.json`, played through the real UI of the slice build: title or chooser, era card, portal, arrival card, map, pin 1, briefing, placement with the suggested army, FIGHT, battle with beats, set-piece, announcer, results, reward, back to the map. The path of every state change is clicks and keys (VF 3.9 closed list of non-UI calls). Nothing is faked: the reference army, the arena recipe, the enemy groups, the stars, the reward and the texts are the ones the finished mission will ship (they may be tuned later by BALANCE inside the allowed bands; the slice records the `eraHash` it was judged on).

The plumbing slices run in the order Medieval (pilot: no new rig, existing brace and charge), Modern, Sci-Fi, because the Medieval run finds the defects in the shared pipe cheapest; they may overlap when WPs finish.

#### 3.2.2 Modules and the P1 simulation scope (by name)

| module | what the slice needs from it | landing note |
|---|---|---|
| M0 | `validateDef`, per-mechanic RNG forks (`era:godpower`, `era:burst`), `stateHashFull`, `ensureEra`, era argument on armygen/waves/counters/scout/daily, registry imports | all eras |
| M1 | damage types `bullet energy` and the pen pipeline; slot 1 powers of Modern and Sci-Fi use them | Modern, Sci-Fi |
| M3 | unit fields `ammo sh cloak sup`, statuses appended (`N_SE` 24), tint rows | Modern: `ammo` pips; Sci-Fi: `eshield` declared and inert |
| M2 | `burst`, `mag/reload`, `whileMoving`, `hitscan` kind registry, projectile contract; Modern reload is the lesson of mission 1 | Modern, Sci-Fi |
| M2b | targeting masks and role scores; Medieval `lancer` flank/charge picks, Modern `trolley_rammer` | all eras |
| M15 core | kit schema, `World({era})`, pacing record, mascot/intervention, GodPower interpreter shell with the `strike_point` family and the data rows of slot 1 (SLW-13) | all eras |

Everything else (M10, M6a, M7, M12, M14 ops beyond lite events, M13, M17e, M8, M9, M11, M4, M5, M6b) is NOT in the plumbing slice. Consequences already designed: Medieval needs none of them (brace, hold, charge exist); Modern mission 1 previews cover props that are inert (no `inCover`, no reposition); Sci-Fi mission 1 runs with inert bubbles: `eshield` is declared by M0 and does nothing, no `shield_*` event fires, every shield beat and toast is silent, and the mission plays as a plain chip fight (design/scifi first_three_minutes rule 11; missions_outline 1.2). The Sci-Fi plumbing slice therefore proves the pipe and not the bubble; the bubble is proved by the Sci-Fi mechanic slice, which also re-runs mission 1 with the full beat list (3.5.7).

#### 3.2.3 UC sets (which clauses a unit must meet, by slice)

Definitions are `UC 3.14`. The sets used here:

| set | who | clauses | PEND allowed |
|---|---|---|---|
| `TRACER` (UC letter T) | every unit of a plumbing mission 1 roster, and every rig tracer at the P1 exit | UC-01..04, 10..17, 20..24, 26, 27, 30, 32, 50..54, 60, 90, 91, 93, 98, 99 | UC-25, 31, 40, 41, 42, 61, 70..73, 80..82 (the six P1-impossible clauses; each `PEND(owner, unlock)` with the unlock tag of UC 3.14); UC-92 and UC-94 while the era is `building` |
| `UC-B` (letter B) | calibration checkpoint 2 sample, per rig class (3.10) | everything except UC-25, 31, 40, 41, 42, 70..73 | UC-70..73 only |
| `SL` (this file) | every unit of a mechanic scenario | `DONE` minus UC-70..73 = UC-B plus UC-25, 31, 40, 41, 42 | none; UC-70..73 are not asked (BALANCE runs after freeze) |
| `WP-A` | hand-back of a unit WP (UC 3.16) | UC-01..04, 10..17, 20..24, 26, 27, 30, 32, 90, 91, 98, 99 | text, audio, mission, balance clauses |

The plumbing rosters are subsets of the tracer sets in `design/<era>/rosters.md` (verified): Medieval `pikeman billman longbowman peasant_levy squire lancer pageant_dragon` (all `T`); Modern `tin_hat_trooper toast_rack_runabout flowerpot_peashooter trolley_rammer` (all `T`); Sci-Fi `tidy_trooper bulwark_warden bubble_tender wrench_runner rivet_gunner` (all `T`). Unit WPs: Medieval 4 (2 humanoid WPs of 4 and 1, `lancer`, `pageant_dragon`), Modern 3 (1 humanoid WP of 2, `toast_rack_runabout`, `trolley_rammer`), Sci-Fi 2 (5 humanoids). Rig tracers that mission 1 does not use (tank1, heli1, drone1, hover1, dragon1, gun1, trebuchet1, ram1 beyond the trolley, insect1, quad alien, mechs) are P1 deliverables of `RA 3.17` and of calibration 1, accepted by `tools/uc/tracer_check.mjs`, and are outside the slice rubric.

#### 3.2.4 Content scope per era (exact)

| | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| mission | `med_dress_rehearsal` "Dress Rehearsal (Swords Are Foam)" | `mod_boot_camp_dropout` "Boot Camp Dropout" | `sf_lunch_break` "Moon Base Lunch Break" |
| arena | `med_pageant_green`, medium, seed 21, marker `bugle` | `mod_parade_yard`, small, seed 4, env `{time:10, weather:'clear', fog:0.1, wind:0.3, theme:'mod_field'}`, markers `firing_line`, `loudspeaker` | `sf_moonbase`, medium, seed 7, env `{time:22, weather:'clear', theme:'sf_moon', sky:'space_planet', gravity:0.4}`, markers `dome_panel`, `crater_ring`, `airlock_lane` |
| era props in the arena (5; counted in the 10-cap) | `med_grandstand med_bunting med_haystack med_tilt_barrier med_peasant_crowd` (maypole and pavilions wait for volume) | `mod_target_dummy mod_lamp_post mod_windsock_pole mod_hay_bale mod_sandbag_wall` (cover preview, inert) | `sf_hab_dome sf_dome_panel sf_airlock_door sf_solar_array sf_regolith_boulder` (antenna mast and cargo crates wait) |
| player roster (reference sketch from the outline) | `pikeman` 12, `longbowman` 8, `billman` 5, `peasant_levy` 20; budget 3,000 groats; par cost 2,250; core `pikeman` x8 | `tin_hat_trooper` 22, `toast_rack_runabout` 3; budget 3,000 rq; par cost 2,250; core `tin_hat_trooper` x10 | `tidy_trooper` 14, `bulwark_warden` 6, `bubble_tender` 4; budget 3,000 ergs; par cost 2,250; core `tidy_trooper` x10 |
| enemy | `marrowby` "hired actors": `lancer` x6 (hold until the bugle), `squire` x14, `pageant_dragon` x1; limit 240 s | `shed` "open-day volunteers": `flowerpot_peashooter` x20 (hold), wave at 30 s `trolley_rammer` x4; limit 240 s | `rummage` "claim jumpers": W1 `rivet_gunner` x8 (hold), W2 `wrench_runner` x8 25 s after W1 is cleared; limit 300 s |
| objective, stars | eliminate; star 3 `thrift(2250)` | eliminate; star 3 `thrift(2250)` | eliminate; star 3 `thrift(2250)` |
| set-piece | `med_sp_wrong_cue`: lite event `{at:16, do:[order lancers advance, beat wrong_cue, setpiece]}`; shot 4 s low dolly behind the pike line; stinger `med_sting_wrong_cue` (comic); sfx `med_trumpet_crack med_hoof_thunder med_lance_shatter med_crowd_ooh` | `mod_sp_live_fire`: trigger `on counter projectile_launches gte 1` (realised by lite events, PC-SL4); shot 3.5 + 3.5 s along the firing line; stinger `mod_stg_whistle_snare`; sfx `mod_loudspeaker_squelch mod_whistle mod_popup_clack mod_confetti_pop` | `sf_sp_lunch_served`: lite event `{at:30, do:[setpiece]}` (the MS value; arenas.md says 45 s, missions_outline item 9 moved it to 30 s); shot 4 s crane through the breach; stinger `sf_stg_klaxon`; sfx `sf_dome_crack sf_airlock_hiss sf_siren_short`; the panel stage swap is presentation only |
| teaching, fresh player (ER19 order) | `arrival.medieval`, `b_place_line`, `med_brace_place`, `b_fight`, `med_hold_order`, `b_speed`, `med_sp_wrong_cue`, `med_brace_win`, `b_powers`, `b_done`; toasts `fs_lancer fs_charge_thunder fs_squire fs_pageant_dragon fs_rout` and the three card toasts; caption `med_power_1` | `arrival.modern`, `b_place_line`, `b_fight`, `mod_ammo_pips`, `mod_sp_live_fire`, `b_speed`, `b_powers`, `mod_b_reload`, `mod_punish_click`, `mod_b_window`, `b_done`, `mod_stagger_reloads` (conditional); toasts `fs_tin_hat_trooper fs_toast_rack_runabout fs_flowerpot_peashooter fs_trolley_rammer`; caption `mod_power_1` | `arrival.scifi`, `b_place_line`, `b_fight`, `sf_sp_lunch_served`, `b_speed`, `b_powers`, `sf_dome_block`, `b_done`; toasts `fs_dome_panel fs_low_gravity fs_tidy_trooper fs_bulwark_warden fs_bubble_tender fs_rivet_gunner fs_wrench_runner fs_ammo_pips`; caption `sf_power_1`; SILENT in this slice: `sf_b_bubble sf_b_pop sf_b_lull sf_tender_ring fs_shield_pip fs_sweep_ring` |
| teaching, returning (basics already seen) | the same minus `b_place_line b_fight b_speed b_powers b_done` | the same minus the five basics | the same minus the five basics |
| god power slot 1 | `med_royal_volley` (`strike_point`, 7 arrows, seeded spread) | `mod_gp_ricochet_request` (`strike_point`, bullet, chain 4) | `sf_arc_tickle` (`strike_point`, energy, chain 4; the bubble pop is inert) |
| era HUD pieces | banner absent; brace chevron decal under a pike block (existing brace) | ammo pips under each shooter, RELOAD ring, kneel pose and clack at zero, "PLATO (MUTED)" label on every Plato line (M1..M8) | Warden dome arc; no bubble |
| music (AU3 skeleton) | era map bed + battle low tier (synth or real) | the same | the same |
| gore at this slice | `auto` = red (as Ancient) | `auto` = puff, corpse fade (R10-lite, SLW-14) | `auto` = puff, corpse fade |
| text layers present | briefing 3 voices, rules (3), star lines (3), victory, defeat, reward blurb, arrival card, chooser caption, what's-new panel, unit text for the 7/4/5 roster units (>= 11 strings each), announcer lines of `campaign_<id>` and the era signature categories that mission 1 can fire, barks for the roles in the roster, the basics layer (era-neutral wording), the scout line of the code mission 1 can raise (Medieval `no_anti_cav`, Modern `no_cavalry`, Sci-Fi the scripted "no shields, yet" text; registry kind `scout_text`) | same | same |
| reward | `med_r1_foam_swords` mutator; title "Extra With Lines" | `mod_r1_tin_hat` Workshop helm; title "Reluctant Recruit" | `sf_r1_fishbowl` Workshop helm `sf_helm_fishbowl`; title "Probationary Tenant" |

Mission 2..9 do not exist in the plumbing build (the manifest says `phase: 'building'`); rules BR1..BR4 (3.2.6) say what the player sees instead.

#### 3.2.5 Entry gate G0 (preconditions of a plumbing review; a failure is not a round)

`node tools/slice_gate.mjs --request <era> plumbing` runs and prints one line each (flags such as `--slice`, `--mission`, `--era` on tools whose VF 3.3 row does not list them are added by SLW-20, request R-SL-V1):

| id | check | command |
|---|---|---|
| G0-1 | snapshot gate green at T-era for the era on the snapshot sha `S` | `node tools/gate.mjs --tier=era --era=<era> --snapshot` |
| G0-2 | tracer checklist green for all mission-1 units and for the era's rig tracers (set `TRACER`; `PEND` only where UC 3.14 allows) | `node tools/uc/tracer_check.mjs --unit=<id>` for every tracer id of the era (the slice runner loops) |
| G0-3 | scope lint: arenas <= 3, era props <= 10, units within the tracer set (plumbing adds none), mission 1 object equals `missions.json[0]`, `phase: 'building'` | `node tools/slice_scope.mjs --era=<era> --slice=plumbing` |
| G0-4 | mission lint: MS lint clean, `requiresModules` of mission 1 within the plumbing module set (3.2.2) | `node tools/ms_lint.mjs --era=<era> --mission=1` |
| G0-5 | text and tone: `text_sweep --era` over every mission-1 layer, `vbscan --era` for the roster palettes (ER3b), zero `REAL_WORLD` hits | `node tools/text_sweep.mjs --era=<era>`; `node tools/vbscan.mjs --era=<era>` |
| G0-6 | audio routing: the mission-1 reference run produces `dropped.unknown == 0`, every set-piece cue resolves to a ledger row or an approved synth (CU2 V09) | `node tests/audio/cue_trace.test.mjs --era=<era> --mission=1` |
| G0-7 | hooks present in the slice page (`__vw.trace`, `__vw.slice`, `__vw.render.layers`, `Game.pump`) | `node tools/slice_gate.mjs --probe-hooks` |
| G0-8 | Ancient identity: G10 mission-1 flow and G6 mission 1 equal their baselines in the slice build | `node tools/campaign_play.mjs --era=ancient --missions=1 --page=<slice page>` |
| G0-9 | `uiscan` on the era's slice screens (chooser, arrival, map, briefing, placement, HUD, results) at 1280x720, console clean | `node tools/uiscan.mjs --era=<era> --viewport=1280x720 --screens=slice` |
| G0-10 | `ensureEra(<era>)` under the ceilings 150 ms Node and 300 ms Chromium | `node tools/perf_assert.mjs --ensure-era --era=<era>` |

#### 3.2.6 Building-era rules (BR1..BR4; apply only while the manifest says `phase: 'building'`)

| rule | text | owner | test |
|---|---|---|---|
| BR1 | A pin whose mission is not in `missions.json` renders locked with the tooltip "In production" and no click handler; the map still shows exactly 9 pins (CU 3.6.8) | UI | `tests/ui/building_era.test.mjs`: pins 2..9 locked |
| BR2 | The results screen of the last authored mission offers "Back to the map" (`#res-map`) instead of NEXT; `progress.eras[era].last` records mission 1 and the unlock of the next id | UI | same test; `campaign_play` steps 10 and 11 report `n/a(building)` |
| BR3 | The HUD power bar lists only god powers whose row carries `ready: true`; a row is `ready` when its effect family runs with the landed modules (slot 1 in the plumbing slice) | UI, DESIGN-ERA-x | test: a `ready:false` row never renders; `complete` eras with any `ready:false` fail `registry.verify` (code V21, new) |
| BR4 | Persona and walk scripts never open Quick, Survival, Daily, Puzzles, Codex, Workshop, Builder, Achievements or Stats of the era under test (their era filters are P2 work, judged by ER9, ER10, ER22) | DESIGN-UX | persona command list (3.7.2) |

These rules are an amendment to CU (AM-CU-S1, request R-SL-U1). They cannot hide a gap in a release: `complete` requires 9 missions, 6 puzzles and six ready powers (AR 3.8.2 counts, `tests/arch/manifests.test.mjs`).

#### 3.2.7 CU items (plan 8, CU1..CU18) in the plumbing slice

| item | in the plumbing slice | work package |
|---|---|---|
| CU1 factories, facade, `_progress`, era UI row | IN | WP-CU1 |
| CU2 validator with an era argument | IN | WP-CU4 |
| CU3 set-piece dispatcher | IN: five channels, time scale, skip, drop reasons; OUT: the stalemate interludes (CU 3.3.7) | SLW-04 |
| CU4 gore `auto` | IN: migration, `resolveGore`, controls, share-code field; the Modern and Sci-Fi human units show `puff` and fade (R10-lite) | WP-CU3, SLW-14 |
| CU5 teaching | IN: both layers, skip buttons, toasts, arbitration | SLW-03 |
| CU6 chooser, maps, transitions, cards | IN: chooser, flow table, nine-pin map rows, portal, arrival card, what's-new card, `[data-era]` tokens, stills v0; OUT (P4): cleared card, Time Passport, stills style pass, map art beyond v0 | WP-CU2, SLW-08..11 |
| CU7 currency | IN (`fmtCost` inventory) | WP-CU1 |
| CU8 `getTB` strings | PARTIAL: campaign, briefing, results; OUT: survival, daily | WP-CU1 |
| CU9 achievements, Stats, Settings | PARTIAL: the gore and corpses controls and "Replay tutorial"; OUT: achievements, Stats | WP-CU3 |
| CU10 modes table | OUT (A7 partial, B8 deferred, 3.11) | WP-CU8/9 (P2) |
| CU11 reward ledger | PARTIAL: the three mission-1 rows and the writers for part, mutator, title, codex | SLW-25 |
| CU12 god powers | PARTIAL: slot 1 data row, interpreter shell, HUD reader and icon for slot 1 | SLW-13 |
| CU13 HUD and Take Command | PARTIAL: ammo pips, RELOAD ring, selection-card ammo row; OUT: status icons, Take Command class UI, touch scheme | SLW-07 |
| CU14 counters and scout codes | PARTIAL: the scout line of the code mission 1 raises | SLW-16 |
| CU15 assist ladder | OUT (the button `#pl-suggest` is visible from the first attempt, CU-D12) | P2 |
| CU16 mutator matrix | PARTIAL: the one Medieval mutator row | SLW-25 |
| CU17 chrome census | PARTIAL: the census runs on the slice screens in G0-9 and SLP-9; the full census is P4 | P4 |
| CU18 announcer era-ization | IN: factory, routes, `campaign_<mission>` categories for mission 1, Plato MUTED | SLW-06 |

### 3.3 The slice build, scenario objects, hooks and the persona kit

| item | specification |
|---|---|
| build flags | `tools/build.mjs --state=<comma list of era ids released> --slice [--out dir]`. `--state` overrides the `status` column of `eras.config.js` for this build only; `--slice` defines `__VW_SLICE__ = true` and keeps registry kind `slice_mission` rows; without `--slice` the kind is stripped (SL-T12). Both flags are no-ops when absent: the default build is byte-identical to the build without this change (SL-T11). Fallback (SL-D04) when TOOLS-GATE has not delivered the flags: the snapshot worktree edits its own `eras.config.js`. |
| registry kind | `slice_mission`, idmap, ids `<prefix>_slice_*`, data file `era_<id>/slice.js` generated by `tools/ms_gen.mjs --slice` from `design/<era>/slice_mechanic.json` (REGISTRY, AM-AR-SL1). Not part of `missions`, `campaignApi.list()`, stars, rewards, `UC-80`, `manifest.expect`, `plan_lint` counts. |
| scenario object | MS shape (all 38 required fields) plus `slice: true`, `rewardId: null`, `blind.swap`, `inputs[]` (the scripted player inputs for the reference run), `slice.shots[]` (3.5 review shots), `slice.tells[]` (3.5 tells with event and fallback tick). `ms_lint --slice` lints it with the count rules switched off and the curve rules off (a slice is not a ladder step). |
| deep link | `__vw.slice.open(era, id)` = `router.goto('briefing', {era, mission: id, slice: true})`; the briefing then proceeds with the normal Deploy button. Present only when `__VW_SLICE__`. |
| trace tap | `__vw.trace` = `{announce: [], setpiece: M.setpiece.trace, teaching: [], shots: []}`, read-only arrays filled by INTEGRATION from the existing `game.emit('announce', out)` (`out = {id, tpl, cat, sub, who, text, pri, dur, t}`, `meta.js publish`), the `SetpieceDirector` trace (CU 3.3.8) and the `TeachingDirector` (`{id, state, tick}`); `t` is `world.time`. |
| render tap | `__vw.render.layers({units, fx, shields, labels, terrain})` dev-only toggles (each default true) so a control frame can hide skins (ER17 control) or hide the FX tells (the tell metric of 3.6); `unitRects`, `capture`, `freeze`, `stats` are RA 3.14. |
| persona kit | `node tools/slice_kit/make_kit.mjs --sha S --era E --slice K --persona <nia, rex or cleo> --round R` builds `.cache/slice/E_K/rR/kit_<persona>/` with: the slice page (`index.html`, files), `tools/slice_kit/persona_cli.mjs` (3.7.2), the persona brief, the task script, the questions file, and NOTHING else. It never contains `docs/`, `design/`, `spec`, `tests/`, `src/`, `tools/` other than the cli, any earlier round, or the keys. `tools/qa_independence.mjs --check <kit> --profile slice` asserts it (SL-T04). |

### 3.4 The exact P1 tasks that produce each piece (work packages `SLW-xx`)

Size S/M/L = 1/2/4 sessions (plan 12). "Counted in" names the spec WP or `wbs.csv` line that already carries the sessions; **moved** means the work was scheduled later in the cited spec and this file pulls it into P1 (a plan correction, 6); **new** means no other spec carries it. `wbs.csv` gets one row per line below with `slice_gate=free` and phase P1; `wbs.mjs` replaces the totals.

| WP | piece | files (owner) | size | counted in | acceptance |
|---|---|---|---|---|---|
| SLW-01 | slice build flags, `slice_mission` kind, strip rule | `tools/build.mjs` (TOOLS-GATE), `src/content/registry.js`, `tools/gen-registry.mjs` (REGISTRY) | M | new | SL-T11, SL-T12 |
| SLW-02 | hooks: `__vw.trace`, `__vw.slice`, `__vw.render.layers`; `Game.pump`, `exportRun`, `advanceClock` | `src/app/main.js installHook`, `game.js`, `meta.js` (INTEGRATION), `render/engine.js` (RENDER) | M | `pump`/`exportRun`/`advanceClock` in R-CU-I1 and `requests/tools_hooks.md`; `trace`, `slice`, `layers` new | G0-7, SL-T10 |
| SLW-03 | `TeachingDirector`, Ancient beats as data, skip buttons, toasts, arbitration | `src/app/teaching.js` (INTEGRATION), `ui/hud/teaching.js` (UI), `era_*/teaching.js` | L | **moved** from WP-CU5 (P2) | CU-T11, CU-T12 pass; G10 mission-1 flow equal |
| SLW-04 | `SetpieceDirector`, time scale, skip, drop reasons; `CameraRig.shot` wiring (R17) | `src/app/setpiece.js` (INTEGRATION), `render/cameras.js` (RENDER) | L | **moved** from WP-CU6 (P2); R17 is P1 | CU-T07, CU-T08, RA-T14 |
| SLW-05 | `MissionRuntime` lite events, `ms_gen`, `ms_helpers`, `createCampaign(raw)` | `era_*/campaign_run.js` ext, `tools/ms_gen.mjs`, `content/shared/ms_helpers.js` (CAMPAIGN, REGISTRY) | L | OI-MS2, OI-MS3 | MS-T04..T06; lite-event test (PC-SL4 form included) |
| SLW-06 | announcer era-ization subset: `createAnnouncer({era,pool,routes})`, `campaign_<mission>` categories for mission 1, signature categories fired by mission 1; Plato MUTED glyph | `humor/announcer.js` factory, `src/app/meta.js` adapter, `ui/hud/bubbles.js` (COMEDY-EDITOR, UI, INTEGRATION) | L | **moved** from WP-CU10 (P2) | CU-T40; Ancient announcer golden G4 equal |
| SLW-07 | ammo pips, RELOAD ring, selection-card ammo row | `render/labels.js` (RENDER), `ui/hud/bubbles.js`, `app/hudcard.js` (UI, INTEGRATION) | M | **moved** from WP-CU7 (P2), subset | uiscan, `readability` tell metric; Ancient card unchanged |
| SLW-08 | arrival card, what's-new card, portal, `seen.arrival`, `seen.whatsnew` | `ui/screens/eracard.js`, `whatsnew.js`, `_portal.js` (UI) | L | **moved** from WP-CU12 (P4), subset | walks A2, A6, B3 |
| SLW-09 | chooser stills v0 for the three eras (real BattleView renders, no style pass) | `tools/era_stills.mjs --era`, `assets/era/chooser_<era>.webp` (RENDER, UI) | M | new (WP-CU2 builds the tool for Ancient only) | `--check` input hash; size <= 100 KB each |
| SLW-10 | `[data-era]` token blocks and `applyEra` | `ui/css/{boot,kit,screens,hud}.css`, `ui/hud/_era.js` (UI) | M | **moved** from the P3 per-era data (WP-CU11) | CU-T38 contrast script |
| SLW-11 | `ERA_MAPS` rows with nine pins each (v0 art from `ui_chrome.md`) | `era_<id>/ui.js` map row, `ui/screens/_map.js` renderer (UI) | M | **moved** (WP-CU11) | CU-T16; G8 Ancient map equal |
| SLW-12 | building-era rules BR1..BR4, `ready` flag, registry code V21 | `ui/screens/{campaign,results}.js`, `ui/hud/powers.js` (UI), `registry.js` (REGISTRY) | S | new (AM-CU-S1) | `tests/ui/building_era.test.mjs` |
| SLW-13 | M15 core (kit, `World({era})`, GodPower interpreter shell with the `strike_point` family), three slot-1 data rows, HUD readers for slot 1 | `sim/kit.js`, `sim/godpowers.js` (SIM), `era_*/godpowers.js`, `ui/hud/powers.js` (UI) | L | **moved**: M15 core is a movable window (M 3.2), CU12 readers P2 | Ancient `godpowers` G1 digests equal; slot-1 cast test per era |
| SLW-14 | gore `auto` resolution (CU4) with R10-lite: style `puff`, `FX_CLASS` rows for the mission-1 units, corpse `fade` fallback when no `death_ko` clip exists | `content/shared/gore.js` (REGISTRY), `render/fx.js`, `render/fxrecipes.js` (RENDER) | M | WP-CU3 (P1) plus a **moved** slice of R10 (P2) | CU-T09, CU-T10; Modern and Sci-Fi M1 show no red splat |
| SLW-15 | mission-1 JSON x3 | `design/<era>/missions.json[0]` (CAMPAIGN-MED/MOD/SF) | M each | OI-MS4 | `ms_lint`; reference wins >= 60% over 30 Node seeds |
| SLW-16 | mission-1 text layers x3 (3.2.4 last rows, including the scout rows) | `era_<id>/humor/**`, `units/**` text, `campaign_text.js`, `scout_text.js`, `ui.js` card copy (COMEDY-MED/MOD/SF) | L each | **moved** from P2/P3 text volume (the first slice of it) | `text_sweep`; UC-50..54 on the roster; panel SLP-8 |
| SLW-17 | mission-1 arena recipe x3 and their 5 props each (3.2.4) | `era_<id>/recipes.js`, `props/**` (WORLD, PROPS-x3) | M + S each | WP-W09 (first of three), WP-W10 (one batch) | WC12, WC15 `tempo`; `prop_budget` |
| SLW-18 | the nine unit WPs of 3.2.3 (rig tracers used by mission 1) | `era_<id>/units/**`, `parts/**`, `anim` clips (UNITS-x, ANIM-RIGS, ANIM-CLIPS) | M x 9 | tracers (q2_schedule 26 sessions) | `uc/wp_accept --set=tracer` |
| SLW-19 | slice audio per era: set-piece stinger and sfx (4 + 1 cues), projectile and impact cues for the mission-1 kinds, the map bed and a low battle bed (real rows or approved synth) | `assets/**`, `era_<id>/audio_profiles.js`, `cues` rows (AUDIO, HUNTER) | S x 3 | AU2/AU3 skeleton | G0-6 cue trace |
| SLW-20 | slice tools: `slice_run`, `slice_review`, `slice_gate`, `slice_scope`, `slice_kit/{make_kit,persona_cli,strips,grade}`, `announcer_trace`; `--slice` modes of `readability`, `tempo`, `era_classify`, `era_fingerprint`, `panel`, `campaign_play` | `tools/slice_*.mjs`, `tools/slice_kit/**`, `tools/lib/slice_*.mjs` (TOOLS-VERIFY) | L + M + M + S + M + S = 12 sessions | new (`walks`, `readability`, `tempo`, `panel`, `campaign_play` themselves are VF WPs) | SL-T01..T08, SL-T13..T15 |
| SLW-21 | Ancient control values (3.8.7) | `tests/baseline/{slice_ancient,announcer_density_ancient,fingerprint_ancient}.json` (TOOLS-VERIFY, TOOLS-GOLDEN) | M | new (readability and tempo Ancient baselines are P0/VF) | two signers; tools finite on Ancient |
| SLW-22 | persona briefs, task scripts, question files, key files | `docs/eras/slice_kit/**` (DESIGN-UX), `docs/eras/slices/keys/**` (REVIEWER) | S | new | SL-T06 |
| SLW-23 | `wbs.csv` column `slice_gate`, `docs/eras/amendments.md`, `docs/eras/slices/gate.json` | COORD | S | new | SL-T05 |
| SLW-24 | three plumbing reviews (5 sessions each) | REVIEWER, TOOLS-VERIFY, personas | 15 | new | verdict files |
| SLW-25 | the three mission-1 rewards made real: `REWARD` rows (`med_r1_foam_swords`, `mod_r1_tin_hat`, `sf_r1_fishbowl`), `rewardsFor` and the writers of `meta.recordMission` for the classes part, mutator, title and codex page, reward chips on briefing and results, the Medieval mutator row `med_foam_swords` (data over the existing `mods` fields `dmg`, `kb`, no new sim code), the two Workshop helm parts `mod_helm_tin_hat` and `sf_helm_fishbowl` on the shared part kit | `content/shared/rewards.js` (REGISTRY), `app/meta.js` writer touch (INTEGRATION), `era_medieval/mutators.js`, `era_modern/parts/helm_tin_hat.js`, `era_scifi/parts/helm_fishbowl.js` (UNITS-x, EDITORS), `ui/screens/{briefing,results}.js` (UI) | M + S | **moved** (M) from WP-CU8 (P2); the two parts and the mutator row are new (S) | `workshop.test` (part selectable after, absent before), `mutpicker.test`, SLP-1 `reward_real` |

Totals (planning values of this file, replaced by `wbs.mjs`): new 38 sessions, moved earlier from P2/P3/P4 41 sessions, already counted in other P1 lines 42 sessions. The q2_schedule P1 estimate carried "slice 6" and "tracers 26"; the net addition to P1 is the 38 new sessions plus the 41 moved sessions, which come off P2/P3/P4 and do not change the program total, and the review sessions of rework rounds (3.8.3).

#### 3.4.1 Harness the slice depends on (owned by VF work packages, not repeated here)

| tool | VF owner row | first usable | slice use |
|---|---|---|---|
| `campaign_play` (mission 1, `--beats`, `--setpieces`, `--rm`, replay) | VF 3.9 | P1 | SLP-1, 5, 6, SLM-1, 3, 4 |
| `walks` | VF 3.23.6 | P1-P2 | SLP-2 |
| `readability` | VF 3.16 | P1 | SLP-4, SLM-2 |
| `tempo` (`tools/tempo.mjs`, WP-W07) | W 3.7.5 | P1 | SLP-3, SLM-5 |
| `panel`, `text_sweep`, `humor-sim` | VF 3.14 | P1 (Ancient) | SLP-7, 8, SLM-6, 7, G0-5 |
| `era_classify`, `chrome_census`, `uiscan`, `vbscan` | VF 3.23 | P1 | SLP-9, SLM-10, G0-5, G0-9 |
| `perf_assert`, `soak`, `build --report` | VF 3.11 | P0 (A/A), P1 | SLP-10, SLM-9 |
| `era_fingerprint` | VF 3.23.1 | P2 | SLM-8 |
| `contracts`, `uc/tracer_check`, `uc/wp_accept` | UC 3.15, 3.16 | P1 | G0-2, G0-M3 |

If a row is late, the dependent item is `UNVERIFIED` (= FAIL) and the review is not requested (G0), so a late tool delays the review, never lowers its bar.

### 3.5 The mechanic slices (P2)

#### 3.5.1 Rule of construction

A mechanic slice is one mission-shaped scenario per era (SL-D06), 20 to 30 units, played once through the real UI by the reference army and by three personas, in which **every headline mechanic of the era's E-FREEZE prefix that has an on-screen tell occurs at least once without the player doing anything unusual**. It is designed so that each decisive moment is an event of the sim that the harness can wait for (`slice.tells[]`: event name, capture offsets, fallback tick), because a review that depends on "something probably happens around t = 40 s" is not a measurement.

The slice requests are allowed only after the **last module of the era's E-FREEZE set has landed** and its tests are green (Medieval: the Medieval prefix through M17e; Modern: through M11; Sci-Fi: through M6b = S-FREEZE; plan 12, modules by name). `slice_gate --request` reads the module landing from `criteria.json` (S28..S46 green for the prefix) and refuses otherwise.

| | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| scenario id, title | `med_slice_keep` "The Keep Has Opinions" | `mod_slice_column` "Tank Column, Trench, Terms and Conditions" | `sf_slice_pulse` "Hull Down, Switched Off" |
| modules required (names) | M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e | the Medieval set plus M8 M9 M11 | the Modern set plus M4 M5 M6b |
| arena (recipe, size, seed) | `med_castle_dour`, large, 26 | `mod_trench_line`, medium, 3 | `sf_crashsite`, medium, 5 |
| env | time 15, clear (as mission 5) | `{time:17, weather:'cloudy', fog:0.3, wind:0.25, theme:'mod_trench'}` (as mission 3) | `{time:18, weather:'fog', fog:0.3, theme:'sf_crash', sky:'dusk_smoke'}` (as mission 4) |
| era props added by this arena (5, the other 5 are mission 1's) | `med_curtain_wall med_round_tower med_castle_gate med_drawbridge med_keep` | `mod_sandbag_nest mod_dugout_roof mod_barbed_coil mod_signal_post mod_wreck` (`mod_sandbag_wall` is shared with mission 1; `mod_wreck` is the M17e wreck prop) | `sf_hull_plate sf_wreck_engine sf_escape_pod sf_junk_heap sf_cargo_container` |
| era props total (cap 10) | 10 | 10 | 10 |
| third arena slot | `med_moat_keep` (small; its props are a subset: drawbridge, keep, round tower) | reserved for a rework round; any recipe whose props are within the 10 | reserved for a rework round; any recipe within the 10 |
| objective, limit | eliminate, 300 s | capture `post_mid` (1 point, hold 8 s), 330 s | eliminate, 300 s |
| slice additions (units beyond the tracers; cap 6) | `cinderwyrm` (boss, dragon1 full, cap 4 look-dev rounds), `physician`, `standard_bearer` | `tripod_mg_team`, `caution_sapper` | `zapper_tinker`, `veil_cutter`, `shush_bike` |
| set-pieces (rows reused from the missions that own them) | primary `med_sp_dragon_wakes` (event `{at:20, do:[order cinderwyrm advance, beat dragon_wakes, setpiece]}`), secondary `med_sp_gate_falls` (`on prop_destroyed type med_castle_gate`) | `mod_sp_over_the_top` (`on counter captures gte 1`: smoke canisters, `weather fog`, whistles) | `sf_sp_please_hold` (`on counter emp_hit_machine gte 8 within 1`: EMP freezes the clump of machines) |
| god powers on | slot 1 `med_royal_volley` only (`ready` flags) | slot 1 `mod_gp_ricochet_request` only | slot 1 `sf_arc_tickle` only |

#### 3.5.2 Medieval: `med_slice_keep` (28 units)

| side | units (id x n) | role in the show |
|---|---|---|
| player (`mixed`, yeomen + free company + bellfount) | `pikeman` x5, `billman` x3, `longbowman` x5, `battering_ram` x1, `trebuchet` x1, `physician` x1 (16) | pikes screen the ram, bills hook, bows are the only anti-air and snipe the banner, the ram breaks the gate, the trebuchet lobs over the wall, the physician heals the pike block |
| enemy (`gatehouse` garrison, hired squires, the wyrmkin dragon) | `crossbowman` x6 (hold on the wall and towers), `squire` x4 (hold in the bailey), `standard_bearer` x1 (in the bailey, ring radius 10), `cinderwyrm` x1 (parked behind the keep, `hold`) (12) | crossbows punish unscreened units, the banner is the snipe target, the dragon is the set-piece |

Budget set by CAMPAIGN-MED to 85-100 percent of the reference cost (MS); the reference army is the 16 above. Blind variant (`blind.swap`, counts re-derived to equal cost within 5 percent): `battering_ram -> sellsword`, `trebuchet -> billman`, `physician -> pikeman`, `longbowman -> billman` (no siege, no heal, no anti-air).

Script (`script.events`, ops from MS 3.6.2): `{at:20, do:[order cinderwyrm advance, beat dragon_wakes, setpiece med_sp_dragon_wakes]}`; `{on:prop_destroyed type:med_castle_gate, do:[beat gate_falls, setpiece med_sp_gate_falls]}`; beats reused from missions 2, 5, 6, 8, 9 (ids as in `design/medieval/missions_outline.md`): `med_colours_first med_colours_fall med_gate_owner med_ram_roof med_heal_first med_arc_crater med_air_first med_air_aa med_air_shadow`; the ER19 list of the slice is the subset that fires in the reference run, recorded in `slice.tells[]`.

Tells (T1..T5) and the sixth strip:

| tell | what the player sees (feel sheet 4) | capture event, offsets (s) | fallback tick |
|---|---|---|---|
| T1 BANNER | the enemy bearer's ring pulses at 1 Hz; when he dies the pole drops, the ring shatters into voxel confetti, a grey rout ripple expands 0.6 s, allies inside 12 u flinch and weak ones run | `banner_fall`, -1.0 .. +2.0 step 0.6 | 1,500 |
| T2 GATE | crack stages at 66 and 33 percent, iron bands twang, then the fall | gate hp fraction first <= 0.66 (read-only poll of `world.props`), -0.5 .. +2.0 | 1,350 |
| T3 HEAL | gold motes from the physician pulse on organic units, none on the ram or trebuchet | `unit_heal` with >= 3 targets, -0.5 .. +2.0 | 1,200 |
| T4 DRAGON | shadow blob far below, wing beats, fire pass igniting units and ground | `unit_air_state` entering strafe, -0.5 .. +2.0 | 900 |
| T5 BOULDER | counterweight swing, arc, shell ring on the ground, crater | first `projectile_launch` with `srcDef trebuchet`, +0 .. +2.5 | 600 |
| SP strip | `med_sp_dragon_wakes`: dragon rises behind the keep, low-angle "dragon up" shot 4 s, sim 0.5x, stinger, line | the `setpiece` event, 0 .. +5.0 step 1.0 | 600 |

What the reviewer sees, in order (authored targets, plus or minus 8 s): 0 s banners and pikes at the camp, crossbow heads on the wall; 6-10 s the trebuchet's first shot (T5); 12-18 s bows duel the wall, the ram advances under its roof across the lowered drawbridge; **20 s the dragon wakes (SP strip)**; 26-34 s the first fire pass over the pike block and the physician's pulses (T4, T3); 36-56 s the ram on the gate: crack stages and the fall, shot through the gateway (T2, `med_sp_gate_falls`); 55-80 s the longbows take the banner, the bailey routs (T1); 80-130 s the dragon lands at 40 percent hp (M7), the last defenders are eliminated.

#### 3.5.3 Modern: `mod_slice_column` (30 units)

| side | units | role in the show |
|---|---|---|
| player (`marmalade` + `briefing`) | `biscuit_tank` x3, `tin_hat_trooper` x8, `tripod_mg_team` x2, `long_lens_sharpshooter` x1, `mortar_pair` x1, `caution_sapper` x1 (16) | the column rolls up the near ramp, troopers hold the lip in cover, tripods pin, the mortar shells the nest, the sapper mines the ramp mouth |
| enemy (`shed` volunteers with hired `briefing` guns) | `flowerpot_peashooter` x8 (hold in the trench), `tripod_mg_team` x2 (hold in nests), `long_lens_sharpshooter` x1 (behind the dugout), `trolley_rammer` x3 (scripted wave at 45 s through the ramp) (14) | pins the troopers, chips the tanks (front tink, side bonk), the trolleys meet the mines |

Blind variant: `biscuit_tank -> toast_rack_runabout`, `tripod_mg_team -> tin_hat_trooper`, `mortar_pair -> tin_hat_trooper`, `caution_sapper -> tin_hat_trooper` (no armour faces, no pin, no shells, no mines; equal cost within 5 percent). Beats reused from missions 2, 3, 4, 5, 6 (ids as in `design/modern/missions_outline.md`): `mod_b_cover mod_cover_brackets mod_b_pin mod_pin_snap mod_b_plink mod_armour_bonk mod_b_arc mod_b_mine mod_mine_boing`; the slice list is the subset that fires.

| tell | on-screen tell (feel sheet 4) | capture event, offsets (s) | fallback tick |
|---|---|---|---|
| T1 PIN | amber-black ground ring winding like a clock, red pushpin drops on the helmet with a thunk, crouch, "pinned" kill-feed verb | `unit_suppressed` (full pin), -1.5 .. +1.5 step 0.6 | 450 |
| T2 COVER | four cyan corner brackets on the prop and a cyan helmet pip, "x0.5" on the first absorbed hit | `unit_cover` on, 0 .. +2.5 step 0.5 | 600 |
| T3 ARMOUR | grey "tink" and "1" on the front face; orange BONK and a rear-arc wedge for side and rear | `unit_deflect` on a `biscuit_tank`, -0.5 .. +1.5 | 750 |
| T4 SHELL | red ground ring and rising whistle 2.2 s, minimum-range hatching, crater | `strike_call` kind shell, -0.5 .. +3.0 | 400 |
| T5 MINE | blinking amber light on a yellow tape ring (owner only), springs 0.4 s | `mine_trigger`, -0.6 .. +1.2 | 1,400 |
| SP strip | `mod_sp_over_the_top`: smoke pops, grey-white fog, whistles, tracking shot along the lip | the `setpiece` event, 0 .. +5.0 step 1.0 | 1,800 |

What the reviewer sees: 0 s the column on the near ramp and the lip; 5-9 s near-miss snaps and the first amber rings (T1); 10-16 s troopers dive into sandbag cover (T2) and the mortar's red ring lands on a nest (T4); 18-30 s MG hits on the lead tank, front tink then a side bonk (T3); 30-40 s the sapper lays mines on the ramp mouth; 45 s the trolleys charge and one springs a mine (T5); 50-80 s the post in the crater flips and the fog/smoke set-piece runs; 80-130 s the trench is cleared.

#### 3.5.4 Sci-Fi: `sf_slice_pulse` (29 units)

| side | units | role in the show |
|---|---|---|
| player (`mixed`: Tidy Concord + a hired Rummage pair) | `dustpan_hover` x3, `bulwark_warden` x3, `tidy_trooper` x4, `bubble_tender` x1, `spritz_medic` x1, `zapper_tinker` x2 (14) | hover tanks carry bubbles on the 7 u lanes, wardens screen, the medic's lamp reveals cloakers, the tinkers' EMP wipes machines |
| enemy (`quiet_hour` cloakers with a hired `courtesy` machine escort) | `veil_cutter` x5 (cloaked ambush clusters), `silent_signer` x2 (wreck ridge), `shush_bike` x2, `valet_drone` x4, `refund_crawler` x2 (the last eight are the machine clump `escort`, formation blob, `hold` in the middle lane) (15) | beams and rails break bubbles, the cloakers stab down the 4 u foot lane, the clump is the EMP target |

Blind variant: `zapper_tinker -> tidy_trooper`, `spritz_medic -> bubble_tender`, `dustpan_hover -> junk_buggy` (no EMP, no detector, no hover-shield). Beats reused from missions 1, 2, 4, 5 (ids as in `design/scifi/missions_outline.md`): `sf_b_bubble sf_b_pop sf_b_lull sf_tender_ring sf_b_hover sf_b_cloak sf_lamp_reveal sf_b_emp sf_stun_pip`; the slice list is the subset that fires.

| tell | on-screen tell (feel sheet 5) | capture event, offsets (s) | fallback tick |
|---|---|---|---|
| T1 BUBBLE POP | hex-ripple dome, on break a pop ring, three hex shards, grey wireframe, "SHIELD DOWN" pip for 2.0 s | `shield_break`, -0.5 .. +2.5 | 600 |
| T2 BUBBLE REGROW | clockwise sweep ring along the base, soft tick, a "ting" and the dome fading back in | `shield_recover`, -3.0 .. +0.6 step 0.9 (the ring runs before the event) | 750 |
| T3 HOVER | four glow pads, underglow disc, bob, shadow blob | tick 90 after FIGHT (always present), 0 .. +2.5 | 90 |
| T4 CLOAK | dithered shimmer plus a team-tint rim; friend and foe stay readable | `unit_cloak` on why ability, -0.5 .. +2.0 | 1,000 |
| T5 REVEAL | the medic's scan ring every 4 s, the shimmer resolving to a solid cutter | `unit_cloak` off why detected, -1.0 .. +1.5 | 1,200 |
| SP strip | `sf_sp_please_hold`: EMP arcs crawl over the clump, power-down droop, "please hold" bubbles, slow push-in on a frozen greeter-like unit | the `setpiece` event, 0 .. +5.0 step 1.0 | 1,500 |

What the reviewer sees: 0 s lanes, pads and wardens; 3 s hover bob (T3); 9-12 s first beams hit domes and ripples run; 14-20 s the first bubble pops and regrows (T1, T2); 24-34 s cutters shimmer into the foot lane (T4); 34-40 s the medic's ring reveals them (T5); 40-60 s the tinkers' EMP freezes the clump (SP strip); 60-100 s lull with bubbles refilling, cleanup. EMP also zeroes bubbles of the frozen machines (M6b), seen as the pop rings of eight units at once.

#### 3.5.5 Review shots (`slice.shots[]`, every slice)

| id | when | camera | purpose |
|---|---|---|---|
| S0 | placement, before FIGHT | default framing (`frameArmies`), yaw -0.7, pitch 0.65 | first look, era classification, team colours |
| S-T<n> | each tell's capture offsets | the default camera in the rig's `orbit` mode, following no unit (the framing `Game.frameArmies` sets) | the strips of SLM-3 and the tell metric of SLM-2 |
| C-T<n> | the first offset of each tell | `dist 14` toward the tell's unit or prop | close readability |
| W-T<n> | the first offset of each tell | `dist 70` | wide readability, "who is winning" |
| SP | the set-piece shot | the row's own `shot` | ER20 filmstrip |

All strips are 3 x 2 montages of six frames (480 x 270 each) written by `tools/slice_kit/strips.mjs` from a deterministic replay (`exportRun` record, `render.freeze({t})`), so the personas see identical pixels for identical strips.

#### 3.5.6 Caps and scope check

`tools/slice_scope.mjs --era E --slice mechanic` asserts: arenas <= 3; era props <= 10 (counted over recipes, mission 1, the scenario); the scenario roster is 20..30 units; every unit id exists; units not in the tracer set equal the declared additions (<= 6); every set-piece row, cue, beat, tell event name and `blind.swap` target resolves; the third arena (when present) adds no prop outside the 10; mission count in `missions.json` is irrelevant (JSON authoring is design and is never blocked).

#### 3.5.7 Regression of mission 1 inside the mechanic slice

The mechanic modules change what mission 1 shows. The slice therefore also runs `campaign_play --era E --missions=1 --beats --setpieces` on the slice build with the **full** ER19 list of mission 1: Sci-Fi mission 1 now fires `sf_b_bubble sf_b_pop sf_b_lull sf_tender_ring fs_shield_pip fs_sweep_ring` (the bubble lesson, silent in the plumbing slice); Modern mission 1's cover props are live but still not used by its fight (declared exception); Medieval unchanged. Pass: the reference army wins >= 8 of 10 Chromium seeds and the beat order equals `first_three_minutes.md` 1.1. This is part of SLM-1.

#### 3.5.8 Entry gate G0-M (preconditions of a mechanic review)

| id | check | command |
|---|---|---|
| G0-M1 | `<era>_plumbing` verdict is PASS, or its infrastructure items are PASS and its feel items are in rework | `node tools/slice_gate.mjs --require plumbing <era>` |
| G0-M2 | every module of the era's E-FREEZE set landed: S-criteria green on the snapshot | `node tools/slice_gate.mjs --require modules <era>` |
| G0-M3 | scenario units meet `SL` (3.2.3) | `node tools/contracts.mjs --era=<era> --units=<scenario ids> --set=sl` (new set name `sl` requested, R-SL-V1) |
| G0-M4 | scope lint (3.5.6) | `node tools/slice_scope.mjs --era=<era> --slice=mechanic` |
| G0-M5 | scenario lint | `node tools/ms_lint.mjs --slice design/<era>/slice_mechanic.json` |
| G0-M6 | text and tone on every layer the scenario fires, vbscan on the additions | `text_sweep --era`, `vbscan --era` |
| G0-M7 | hooks present (G0-7) and gate T-era green on the snapshot sha | as G0-1, G0-7 |
| G0-M8 | reaction test: each of the 27 `KILL_CAUSES` on a scenario unit yields a registered clip (UC-25) | `node tests/sim/react_matrix.test.mjs --era=<era>` |

#### 3.5.9 P2 work packages of the mechanic slice (`SLW-3x`; they run as soon as the module chain allows, before the request)

| WP | piece | owner | size | counted in |
|---|---|---|---|---|
| SLW-31 | `slice_mechanic.json` x3 (reference army, blind swap, inputs, tells, shots) | CAMPAIGN-MED/MOD/SF | M each | new |
| SLW-32 | slice additions: Medieval 2 WPs (`cinderwyrm`; `physician` + `standard_bearer`), Modern 2 (`tripod_mg_team`; `caution_sapper`), Sci-Fi 2 (`zapper_tinker` + `veil_cutter`; `shush_bike`); upgrade of the scenario tracers from `TRACER` to `SL` | UNITS-x, ANIM-RIGS, ANIM-CLIPS | M each, L for `cinderwyrm` | unit WPs (the units are part of the 34) |
| SLW-33 | slice arena recipes (castle, trench, crash site) and their 5 props each | WORLD, PROPS-x3 | M + M each | WP-W09, WP-W10 |
| SLW-34 | set-piece rows used (Medieval 2, Modern 1, Sci-Fi 1) with shots, stingers, sfx, lines | CAMPAIGN-x, AUDIO, COMEDY-x | S each | WP-CU11 (first rows) |
| SLW-35 | text for the scenario's units, barks, lessons and kill verbs | COMEDY-x | M each | spec/H volume (first slice of it) |
| SLW-36 | the tells' render work that has not landed with its module (R3 shields, R4 blobs, R5 hazards, cloak variant, EMP arcs, banner ring) | RENDER | per RA 3.18 | RA R-items |
| SLW-37 | `ensure` of fingerprint inputs: `tests/baseline/fingerprint_ancient.json` current (SLW-21), `perf_assert` scenarios `MED-W MOD-W SF-W` | TOOLS-VERIFY | S | VF |
| SLW-38 | three mechanic reviews (5 sessions each) | REVIEWER, TOOLS-VERIFY, personas | 15 | new |

### 3.6 The rubric

#### 3.6.0 Common rules

Seeds: `seed_k = fnv1a(sliceId + ':SL:' + k)`, `k = 0..n-1`, for every sampled run; strips and renders come from a deterministic replay at the frozen sha. Engines: Node numbers are Node, Chromium numbers are Chromium; nothing mixes (AR6 comparator classes). A tool value with no sample (a tool crashed, a hook is missing, the sample is smaller than stated) is `UNVERIFIED` and scores FAIL. `WARN` is only defined where a WARN band is given. Each item's inputs (file globs hashed into the verdict) are in the JSON block of 3.6.3; they decide staleness (3.8.5). Tier column: the tier the tool runs in when it is also part of a normal gate; slice runs themselves are scheduled-heavy (`nice` except the perf rows, which take the `quiet` slot, VF 3.19).

#### 3.6.1 Plumbing rubric (`<era>_plumbing`; items SLP-1..SLP-10)

SLP-1, SLP-2 and SLP-10 are the **infrastructure items** (SL-D10).

| id | item | judge | tool or procedure | metric and pass line | WARN band | cost |
|---|---|---|---|---|---|---|
| SLP-1 | mission 1 through the real UI, reference army, replay | tool | `node tools/campaign_play.mjs --era=E --missions=1 --mode=both --replay=on --beats --setpieces --page=<slice page>` (VF 3.9) | 15 of 15 applicable per-mission assertions `VF-T15/*` (step 11 is `n/a(building)`, step 10 asserts the unlock record and the "In production" pin, BR1/BR2); `reference` wins >= 8 of 10 Chromium margin seeds and >= 60 percent of 30 Node seeds (MS DoD M2); stars on results equal `evaluateStars`, `progress.stars[id]` >= 1; **the reward is real** (CU 3.11.1 usable-now evidence: the Workshop lists the helm part for Modern and Sci-Fi, the Quick mutator picker lists `med_foam_swords` for Medieval, the title is on the chooser ribbon, the codex page is open); Chromium replay `stateHashFull` equal at `endTick`; console findings 0 (ER26); wall <= 2 min. Recorded, not scored: whether `game.suggestArmy()` equals `buildMissionWorld` placements (VF OI-1, `placements_equal`) | none | 3 CPU-min |
| SLP-2 | the two first-10-minutes walks, by script and by persona | tool + P-NEW + P-RET | `node tools/walks.mjs --walk=A,B --era=E --page=<slice page>` (VF 3.23.6) for the in-scope steps of 3.11; persona sessions per 3.7.2 | 15 of 15 in-scope walk assertions pass and write `.cache/walks/<walk>/<step>.png`; P-RET (walk A) and P-NEW (walk B) each reach the results screen of mission 1 with <= 2 `BLOCKED` marks and 0 `DEAD-END` marks | one extra `BLOCKED` mark in one persona | 2 CPU-min + 2 persona sessions |
| SLP-3 | first contact, pace and the first 10 seconds | tool | `node tools/tempo.mjs --era=E --cell=mission1 --seeds=10 --placement=default` (W 3.7.5; harness metrics `firstDamageTick firstLineDamageTick inRange0 deadAir8`) | `T1` median inside the W band of the cell (Medieval `med_pageant_green` medium, normal closing: [6, 20] s; Modern `mod_parade_yard` small: [3, 14]; Sci-Fi `sf_moonbase` medium: [6, 20]; fast-closing classes per W); `inRange0 = 0`; `T1_any >= 2.5 s`; dead air: median 0 and p90 <= 1 windows of 8 s per battle; **first-10-second hook:** an announcer line within 6 s of FIGHT and >= 1 `projectile_launch` or `unit_hit` within 10 s | `T1` median outside the band by <= 2 s | 1 CPU-min |
| SLP-4 | readability at default camera, colour-blind safe, "who is winning" | tool + P-CVD + P-NEW | `node tools/readability.mjs --era=E --slice=plumbing` (VF 3.16): arena sample 6-7 renders (2 times x 3 weathers, plus the worst pair) and the reference battle at tick 300, default and close cameras = 8-9 renders at 960x540 | no cell with `dE_ring < 8.0` or `Lw < 1.5`; pooled `dE_team >= 15` for team 0 vs team 1 under normal vision and under protan, deutan and tritan (Machado 2009, severity 1.0); persona P-CVD (deutan frames, 3.7.2): team of 27 of 30 boxed units, role of 4 of 5 boxed unit types, who is winning at 3 zoom levels in >= 2 of 3 frames; P-NEW the same "who is winning" in >= 2 of 3 | cells with `dE_ring` 8-12 up to 15 percent of cells | 1 CPU-min + 1-2 persona sessions |
| SLP-5 | the mechanic of mission 1 is taught by its beats | tool + P-NEW + P-RET | `campaign_play --era=E --missions=1 --beats` for the fresh population and the returning population (CU-T11 cases a and c); quiz of 3.7.4 | every beat id of the era's plumbing list (3.2.4, "teaching") fires exactly once and in the order of `first_three_minutes.md` 1.1; returning population: 0 basics beats; the Ancient-skipper case gets every era beat; P-NEW answers >= 2 of 3 quiz questions correctly (REVIEWER grades vs keys); P-RET names >= 1 correct "what is new compared with Ancient" item | none | 1 CPU-min + persona time already spent |
| SLP-6 | the set-piece fires on all five channels and reads | tool + 3 readers | `campaign_play --setpieces` (ER20) and, with Reduce Motion on, `campaign_play --setpieces --rm`; strip reading 3.7.4 by P-NEW, P-RET and the REVIEWER | `setpiece_fired` shows event, stinger, shot (`ran`), announcer (`offered`) and sfx (n >= 1) for the mission's `setpiece.id`; no `dropped:*` in the reference run; `dur + hold` of the shot in [3, 6] s; Reduce Motion run: shot `cut`, hold <= 1.5 s, the other four fire; the 4-frame filmstrip is read correctly (keyword set of 3.7.4) by >= 2 of the 3 readers | none | 1 CPU-min |
| SLP-7 | announcer density and repetition | tool | `node tools/announcer_trace.mjs --era=E --mission=1 --runs=3 --speed=1` (three consecutive reference runs in one session, i.e. a player replaying; reads `__vw.trace.announce`) | in >= 85 percent of the 20 s windows from t = 2 s to battle end - 4 s at least one line is spoken; no window holds more than 5; **zero repeats** of a template id and zero repeats of a text within 300 s of battle time across the three runs; all three voices speak in every run; the median lines per window is within [0.7, 1.4] x the Ancient mission 1 median (`tests/baseline/announcer_density_ancient.json`); >= 1 era-specific (not neutral-reused) line per run | windows with a line 80-85 percent | 2 CPU-min |
| SLP-8 | comedy against the Ancient baseline | panel (3 raters) | `node tools/panel.mjs --era=E --slice=plumbing` (VF 3.14 protocol, prompt v1; the sample is every line of the mission-1 text layers, surfaces with fewer than 20 lines pooled as `misc`; the Ancient sample is drawn from `ancient_scores.csv` on the same surfaces and sizes) | pooled era median >= Ancient median - 0.5; era 20th percentile >= Ancient 20th percentile - 1.0; rater reliability (mean pairwise Spearman) >= 0.5; 0 lines flagged `offensive` by >= 2 raters after repair; <= 2 rewrite rounds (VF repair rule) | median deficit 0.5-0.7 | 3 rater sessions |
| SLP-9 | blind era classification | agent (fresh classifier) | `node tools/era_classify.mjs --era=E --slice=plumbing`: 30 seeded screenshots (15 of the era: chooser card, arrival card, map, briefing, placement x2, battle x4, set-piece frame, results, HUD crops x2, title; 15 matching Ancient screens), era hidden, shuffled; the classifier gets the four one-line conceits | >= 27 of 30 correct, >= 14 of 15 on the era subset, >= 13 of 15 on the Ancient subset | 26 of 30 | 1 agent session |
| SLP-10 | budgets: draws, triangles, CPU, `ensureEra`, size, heap | tool | `node tools/perf_assert.mjs --view --draws --ensure-era --sim-ab --soak=10 --era=E --scenario=slice_E_m1` (VF 3.11 items 3-6) and `node tools/build.mjs --minify --report` | draws <= 160 and <= 1.25 x the Ancient mission-1 value at the same size and camera; triangles <= 1.25 x Ancient; `view.update` median <= max(1.25 x Ancient reference, reference + 3 sigma); `ensureEra` <= 150 ms Node and 300 ms Chromium; the Ancient sim A/B within max(5 percent, 3 sigma); minified fragment <= 4,600,000 B, or a recorded D17 un-core decision with the re-measured size <= 4,600,000 B; heap after 10 battles alternating Ancient and the era <= 1.15 x heap after 2 + 20 MB | size 4.6-5.0 MB with the D17 decision logged | 25 CPU-min `quiet` |

#### 3.6.2 Mechanic rubric (`<era>_mechanic`; items SLM-1..SLM-10)

| id | item | judge | tool or procedure | metric and pass line | WARN band | cost |
|---|---|---|---|---|---|---|
| SLM-1 | the scenario runs through the UI; the mechanic matters; mission 1 still works | tool | `node tools/campaign_play.mjs --slice design/<era>/slice_mechanic.json --mode=both --replay=on --beats --setpieces` (UI path: `__vw.slice.open`, then Deploy, `#pl-suggest`, FIGHT, `inputs[]`, end), the `blind` and `autofill` bots of `tests/campaign/run_feasibility.mjs` (VF 3.9 ladder, n = 30 Node seeds), and the mission-1 regression of 3.5.7 | all UI assertions; `reference` wins >= 8 of 10 Chromium seeds and >= 60 percent of 30 Node seeds; replay hash equal; console 0; **mechanic-blind variant (3.5.2-3.5.4) wins <= 30 percent of 30 Node seeds**; autofill bot (`generateArmy balanced normal` over the roster) wins <= 40 percent; mission 1 regression: reference wins >= 8 of 10 and the full ER19 order holds | blind wins 30-40 percent | 8 CPU-min |
| SLM-2 | readability of the headline tells at the default camera | tool + P-CVD | `node tools/readability.mjs --era=E --slice=mechanic`: arena sample (7 renders), the 5 tell moments (5 renders), the 300-unit scenario mix at tick 400 (1 render), all at 960x540 default camera, each with the control frames of `__vw.render.layers` | no cell with `dE_ring < 8.0` or `Lw < 1.5`; pooled `dE_team >= 15` under normal vision and the three CVD transforms; hit-flash and shield `vis >= 0.5`; cloak `vis` in [0.25, 0.65]; **tell metric** per tell: area of the pixels that differ between FX-on and FX-off frames (within the unit rect grown by 24 px) >= 250 px2 and their mean CIEDE2000 against the pixels beneath >= 12 (>= 8 under each CVD transform) | cells 8-12 up to 15 percent; tell contrast 10-12 | 1 CPU-min |
| SLM-3 | the tells are recognised; the set-piece fires and reads | tool + 3 personas + REVIEWER | strips of 3.5.2-3.5.4 (5 tells + the set-piece strip), `campaign_play --setpieces` | each persona sees the six strips unlabelled in a shuffled order and writes what happened to the unit(s) in the middle; the REVIEWER grades against the keyword sets of 3.7.4; **>= 5 of 6 strips recognised by >= 2 of 3 personas AND by P-CVD (deutan, Reduce Motion on) for >= 5 of 6**; the ER20 trace shows all five channels for every set-piece id of the scenario (Medieval 2, Modern 1, Sci-Fi 1) and no `dropped:*` | 4 of 6 recognised | 1 CPU-min |
| SLM-4 | each mechanic is taught by a beat before its decisive moment | tool + P-NEW + P-RET | `campaign_play --beats` on the scenario; quiz of 3.7.4 | every beat in the scenario's `teaching.beats` fires exactly once, **before** the first event of the mechanic it names (ordering from `__vw.trace.teaching` against the tell events), and none is dropped in the reference run; P-NEW answers >= 2 of 3 mechanic questions, P-RET >= 2 of 3 (a returning player must do at least as well) | one beat fires after its event by <= 3 s | 1 CPU-min |
| SLM-5 | pace: first contact, dead air, a moment at least every 50 s | tool | `node tools/tempo.mjs --era=E --slice=mechanic --seeds=10` | `T1` in the W band of the cell (large foot-closing [6, 20] s; medium as SLP-3); `inRange0 = 0`; dead-air p90 <= 1; the gap between consecutive "moments" (set-piece, script beat, teaching beat, announcer line of priority >= 4, tell event) is <= 50 s everywhere in [0, end - 10 s]; the median battle length of the reference army over 10 seeds is in [90, 240] s | `T1` outside by <= 2 s | 2 CPU-min |
| SLM-6 | announcer density, repetition and mechanic coverage | tool | `announcer_trace --slice=mechanic --runs=3` | all SLP-7 lines, plus: >= 4 of the 5 tell events have a spoken line in at least one run, each such category backed by >= 3 distinct template ids in the era kit (CU18 `routes`); the voices alternate (no two consecutive lines from one voice outside `bypassAlternation`) | windows with a line 80-85 percent | 2 CPU-min |
| SLM-7 | comedy against the Ancient baseline, and "Ancient with new nouns" | panel | `panel.mjs --slice=mechanic`: sample = unit text of the scenario roster, barks and lessons for the five tell events, kill verbs of the causes that fire, set-piece lines, beat texts, mission text | the SLP-8 bars; **and** `recycled` flagged by >= 2 raters on <= 10 percent of the lines (or <= the Ancient rate + 5 points, whichever is larger) | median deficit 0.5-0.7 | 3 rater sessions |
| SLM-8 | tempo fingerprint (ER27, reduced) | tool | `node tools/era_fingerprint.mjs --reduced --slice=E`: 60 battles (slice roster armies `mixed balanced 6000` vs `counter` on the scenario arena and mission-1 arena, 30 each, baked regime, Node) | the six VF 3.23.1 dimensions inside the feel-sheet bands of 3.6.4 (all asserted dimensions when fewer than six apply, floor four); the era-specific extras of 3.6.4; **separation:** versus `tests/baseline/fingerprint_ancient.json`, >= 3 of 6 dimensions with Cohen's d >= 0.8 and the d-vector norm >= 2.0; Medieval versus Ancient also >= 2 of {engagement distance, ranged share, speed} with d >= 0.8; Sci-Fi versus the stored Modern slice vector: >= 3 of the five separating lines (median engagement, indirect share, shield events, off-ground unit-seconds, cover occupancy) separated by more than one band width; a miss means the feel sheet or the roster is rewritten, never the metric | one dimension outside its band by <= 10 percent of the band width | 8 CPU-min |
| SLM-9 | budgets with the mechanics on | tool | `node tools/perf_assert.mjs --view --draws --sim --ablate-landed --soak=20 --hitch --era=E --scenario=<MED-W, MOD-W or SF-W>` (VF 3.11, M 3.13) | at the busiest of the five tell moments: draws <= 160, triangles <= 1.25 x Ancient, `view.update` <= 1.25 x Ancient; sim at 300 units on the era scenario <= 2.0 ms and the era-total delta of the landed modules <= 0.5 ms, each module within its allocated share (M 3.13); Ancient A/B within max(5 percent, 3 sigma); heap after 20 alternating battles <= 1.15 x heap after 5 + 20 MB; first-sight hitch of each slice addition <= 60 ms | sim within 10 percent over a share, logged | 30 CPU-min `quiet` |
| SLM-10 | blind era classification of battle moments | agent (fresh classifier) | `era_classify --era=E --slice=mechanic`: 24 screenshots (12 of the scenario: the six strips' middle frames, close and wide crops; 12 of the other eras' battle frames available at that time, Ancient plus the earlier slices) | >= 22 of 24 correct and >= 11 of 12 on the era subset | 21 of 24 | 1 agent session |

#### 3.6.3 Machine-readable block (read by `tools/slice_review.mjs`; SL-T01 asserts that the ids, the 10-item limit, numeric thresholds and a judge per item match the tables above)

```rubric
{
  "version": 1,
  "slices": {
    "plumbing": { "infra": ["SLP-1", "SLP-2", "SLP-10"], "items": [
      { "id": "SLP-1",  "judges": ["tool"], "tool": "tools/campaign_play.mjs", "tier": "E", "pass": { "steps": 15, "ref_win_chromium_of_10": 8, "ref_win_node_pct": 60, "node_seeds": 30, "reward_real": true, "replay_equal": true, "console_findings": 0, "wall_min": 2 }, "inputs": ["src/**", "design/<era>/missions.json"] },
      { "id": "SLP-2",  "judges": ["tool", "P-NEW", "P-RET"], "tool": "tools/walks.mjs", "tier": "E", "pass": { "walk_assertions": 15, "blocked_max": 2, "deadend_max": 0 }, "warn": { "blocked_max": 3 }, "inputs": ["src/ui/**", "src/app/**", "src/content/era_<era>/ui.js"] },
      { "id": "SLP-3",  "judges": ["tool"], "tool": "tools/tempo.mjs", "tier": "E", "pass": { "t1_band": "W3.7.5", "inrange0": 0, "t1_any_min_s": 2.5, "deadair8_p90_max": 1, "line_by_s": 6, "event_by_s": 10, "seeds": 10 }, "warn": { "t1_outside_s": 2 }, "inputs": ["src/world/**", "src/content/era_<era>/recipes.js", "design/<era>/missions.json"] },
      { "id": "SLP-4",  "judges": ["tool", "P-CVD", "P-NEW"], "tool": "tools/readability.mjs", "tier": "R", "pass": { "dE_ring_min": 8.0, "lw_min": 1.5, "dE_team_min": 15, "cvd": ["protan", "deutan", "tritan"], "team_correct": 27, "team_n": 30, "role_correct": 4, "role_n": 5, "winning_correct": 2, "winning_n": 3 }, "warn": { "ring_warn_cells_pct": 15 }, "inputs": ["src/render/**", "src/content/era_<era>/units/**", "src/content/era_<era>/recipes.js"] },
      { "id": "SLP-5",  "judges": ["tool", "P-NEW", "P-RET"], "tool": "tools/campaign_play.mjs", "tier": "E", "pass": { "beats_once": true, "order": true, "returning_basics": 0, "quiz_new_correct": 2, "quiz_n": 3, "ret_new_items": 1 }, "inputs": ["src/content/era_<era>/teaching.js", "src/app/teaching.js"] },
      { "id": "SLP-6",  "judges": ["tool", "P-NEW", "P-RET", "REVIEWER"], "tool": "tools/campaign_play.mjs", "tier": "E", "pass": { "channels": 5, "dropped": 0, "shot_len_s": [3, 6], "rm_hold_max_s": 1.5, "readers_correct": 2, "readers_n": 3 }, "inputs": ["src/app/setpiece.js", "src/content/era_<era>/setpieces.js"] },
      { "id": "SLP-7",  "judges": ["tool"], "tool": "tools/announcer_trace.mjs", "tier": "H", "pass": { "window_s": 20, "windows_with_line_pct": 85, "max_per_window": 5, "repeat_window_s": 300, "repeats": 0, "voices_min": 3, "density_ratio": [0.7, 1.4], "era_lines_min": 1, "runs": 3 }, "warn": { "windows_with_line_pct": 80 }, "inputs": ["src/content/era_<era>/humor/**", "src/app/meta.js"] },
      { "id": "SLP-8",  "judges": ["panel"], "tool": "tools/panel.mjs", "tier": "H", "pass": { "median_delta_min": -0.5, "p20_delta_min": -1.0, "reliability_min": 0.5, "offensive_ge2_max": 0, "rewrite_rounds_max": 2 }, "warn": { "median_delta_min": -0.7 }, "inputs": ["src/content/era_<era>/humor/**", "src/content/era_<era>/units/**", "design/<era>/missions.json"] },
      { "id": "SLP-9",  "judges": ["agent"], "tool": "tools/era_classify.mjs", "tier": "R", "pass": { "n": 30, "correct_min": 27, "era_subset_min": 14, "ancient_subset_min": 13, "subset_n": 15 }, "warn": { "correct_min": 26 }, "inputs": ["src/ui/**", "src/render/**", "assets/era/**"] },
      { "id": "SLP-10", "judges": ["tool"], "tool": "tools/perf_assert.mjs", "tier": "R", "pass": { "draws_max": 160, "draws_ratio_max": 1.25, "tris_ratio_max": 1.25, "view_ratio_max": 1.25, "ensure_ms_node": 150, "ensure_ms_chromium": 300, "ancient_ab_pct": 5, "size_bytes_max": 4600000, "heap_factor": 1.15, "heap_pad_mb": 20, "soak_battles": 10 }, "warn": { "size_bytes_max": 5000000 }, "inputs": ["src/**"] }
    ] },
    "mechanic": { "infra": [], "items": [
      { "id": "SLM-1",  "judges": ["tool"], "tool": "tools/campaign_play.mjs", "tier": "R", "pass": { "ref_win_chromium_of_10": 8, "ref_win_node_pct": 60, "blind_win_node_pct_max": 30, "autofill_win_node_pct_max": 40, "node_seeds": 30, "replay_equal": true, "console_findings": 0, "m1_win_of_10": 8 }, "warn": { "blind_win_node_pct_max": 40 }, "inputs": ["src/sim/**", "design/<era>/slice_mechanic.json", "design/<era>/missions.json"] },
      { "id": "SLM-2",  "judges": ["tool", "P-CVD"], "tool": "tools/readability.mjs", "tier": "R", "pass": { "dE_ring_min": 8.0, "lw_min": 1.5, "dE_team_min": 15, "tell_area_px_min": 250, "tell_contrast_min": 12, "tell_contrast_cvd_min": 8, "shield_vis_min": 0.5, "cloak_vis": [0.25, 0.65] }, "warn": { "ring_warn_cells_pct": 15, "tell_contrast_min": 10 }, "inputs": ["src/render/**", "src/content/era_<era>/**"] },
      { "id": "SLM-3",  "judges": ["tool", "P-NEW", "P-RET", "P-CVD", "REVIEWER"], "tool": "tools/slice_kit/strips.mjs", "tier": "H", "pass": { "strips_n": 6, "recognised_min": 5, "personas_min": 2, "personas_n": 3, "cvd_recognised_min": 5, "channels": 5, "dropped": 0 }, "warn": { "recognised_min": 4 }, "inputs": ["src/render/**", "src/app/setpiece.js", "src/content/era_<era>/setpieces.js"] },
      { "id": "SLM-4",  "judges": ["tool", "P-NEW", "P-RET"], "tool": "tools/campaign_play.mjs", "tier": "E", "pass": { "beats_once": true, "before_decisive": true, "dropped": 0, "quiz_new_correct": 2, "quiz_ret_correct": 2, "quiz_n": 3 }, "warn": { "late_by_s": 3 }, "inputs": ["src/content/era_<era>/teaching.js", "design/<era>/slice_mechanic.json"] },
      { "id": "SLM-5",  "judges": ["tool"], "tool": "tools/tempo.mjs", "tier": "E", "pass": { "t1_band": "W3.7.5", "inrange0": 0, "deadair8_p90_max": 1, "moment_gap_max_s": 50, "length_median_s": [90, 240], "seeds": 10 }, "warn": { "t1_outside_s": 2 }, "inputs": ["src/world/**", "src/sim/**", "design/<era>/slice_mechanic.json"] },
      { "id": "SLM-6",  "judges": ["tool"], "tool": "tools/announcer_trace.mjs", "tier": "H", "pass": { "window_s": 20, "windows_with_line_pct": 85, "max_per_window": 5, "repeat_window_s": 300, "repeats": 0, "voices_min": 3, "density_ratio": [0.7, 1.4], "categories_spoken_min": 4, "categories_n": 5, "templates_per_category_min": 3, "runs": 3 }, "warn": { "windows_with_line_pct": 80 }, "inputs": ["src/content/era_<era>/humor/**", "src/app/meta.js"] },
      { "id": "SLM-7",  "judges": ["panel"], "tool": "tools/panel.mjs", "tier": "H", "pass": { "median_delta_min": -0.5, "p20_delta_min": -1.0, "reliability_min": 0.5, "offensive_ge2_max": 0, "recycled_ge2_max_pct": 10, "rewrite_rounds_max": 2 }, "warn": { "median_delta_min": -0.7 }, "inputs": ["src/content/era_<era>/humor/**", "src/content/era_<era>/units/**"] },
      { "id": "SLM-8",  "judges": ["tool"], "tool": "tools/era_fingerprint.mjs", "tier": "H", "pass": { "battles": 60, "dims_n": 6, "dims_in_band_min": 5, "d_min": 0.8, "d_dims_min": 3, "norm_min": 2.0, "asserted_floor": 4 }, "warn": { "band_overshoot_pct": 10 }, "inputs": ["src/sim/**", "src/content/era_<era>/stats.js", "design/<era>/feel_sheet.md"] },
      { "id": "SLM-9",  "judges": ["tool"], "tool": "tools/perf_assert.mjs", "tier": "R", "pass": { "draws_max": 160, "tris_ratio_max": 1.25, "view_ratio_max": 1.25, "sim_ms_300": 2.0, "era_delta_ms_300": 0.5, "ancient_ab_pct": 5, "heap_factor": 1.15, "heap_pad_mb": 20, "soak_battles": 20, "hitch_ms": 60 }, "warn": { "share_overrun_pct": 10 }, "inputs": ["src/**"] },
      { "id": "SLM-10", "judges": ["agent"], "tool": "tools/era_classify.mjs", "tier": "R", "pass": { "n": 24, "correct_min": 22, "era_subset_min": 11, "subset_n": 12 }, "warn": { "correct_min": 21 }, "inputs": ["src/render/**", "src/ui/**"] }
    ] }
  }
}
```

#### 3.6.4 Feel-sheet bands used by SLM-8 (binding; from the three feel sheets; ER27 dimensions of VF 3.23.1 in the first six rows)

| dimension | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| first-contact time (s to first damage) | 6-10 (melee contact 12-20) | 6-12 | 7-14 |
| kill rate per 100 starting units per minute (contact phase) | 32-42 and <= 0.85 x Ancient | 70-95 and >= 1.8 x Ancient | 50-65 and 1.2-1.5 x Ancient |
| median engagement distance (u) | 3.5-5.5 and <= 0.8 x Ancient | 24-30 and >= 2.5 x Ancient | 15-19 and >= 1.4 x Ancient |
| ranged damage share | 36-42 percent | >= 85 percent (floor 80) | 72-78 percent |
| speed (median of fielded speeds, u/s) | 2.2-2.8 | 2.4-3.6 | 2.4-3.6 with a tail to 6 |
| vertical spread | sd(y) >= 2 x Ancient (walls, dragon) | not asserted (no air in the scenario) | >= 18 percent of unit-seconds off the ground layer |
| extras | none | cover occupancy >= 40 percent of ranged unit-seconds; indirect and area share >= 25 percent | shield events >= 50 percent of 40 per 100 s per 300 units scaled by roster size (about >= 2 per 100 s at 29 units); indirect and area share 6-10 percent |

Scale correction: the sheets are written for 300-unit battles; at 29 units the count-like extras scale with the roster (shown for Sci-Fi); if the first measurement shows a structural bias of a dimension that is caused by roster size alone, the correction is a logged amendment to this table (3.9), signed by DESIGN-UX and REVIEWER, never a silent tolerance.

### 3.7 Judges

#### 3.7.1 Roles

| role | does | may not |
|---|---|---|
| TOOLS-VERIFY operator | runs `slice_run`, builds the kits, archives evidence | judge, edit thresholds (AR 3.8.3: content agents and operators file `docs/requests/*_threshold_*.md`) |
| persona (3 fresh agents per round) | plays the kit and answers the quiz (3.7.2) | see anything outside the kit; know an earlier round; be an author of any file in the slice set |
| REVIEWER (fresh, did not build) | audits kit independence, grades quiz and strips against keys, reads persona logs for breaches, compiles and signs the verdict | have `author` in the ledger of any WP touching the slice's input globs |
| panel raters (3 fresh agents) | score lines (VF 3.14) | see the era name or any id |
| classifier (1 fresh agent per classification) | labels screenshots (SLP-9, SLM-10) | see the file names or the order |
| COORD | calls `--request`, records `gate.json`, decides after round 2 | sign a PASS (the REVIEWER does) |

#### 3.7.2 Personas

| id | who | profile fixture | viewport and settings | knows | task script (`docs/eras/slice_kit/tasks_<slice>.md`, in the kit) |
|---|---|---|---|---|---|
| **P-NEW** "Nia" | a new player a friend sent the link to | empty profile (`localStorage` empty), fresh-profile rules of CU-D25 | 1280x720, mouse, sound muted, Reduce Motion off, default quality | nothing about the game; reads on-screen text | plumbing: splash -> title -> Campaign -> pick the era under test -> mission 1 through the results screen, then answer the quiz, mark `LAUGH` where a line made her laugh, read the four filmstrip frames; mechanic: open the scenario with `slice.open`, play it with the suggested army at speed 1 or 2, answer the quiz, read the six strips |
| **P-RET** "Rex" | an Ancient player who finished the tutorial and plays for hours | fixture `ancient_release_v8` (G5: a real v8 profile produced by the baseline build, about 12 stars, one non-default of each setting) loaded into `localStorage` before boot | 1280x720, mouse, sound muted | hoplites, Zeus, drachmae, the Ancient campaign | plumbing: title, then **one Ancient mission** (checks it is unchanged: any difference is a `CONFUSED` mark with a note), then Campaign -> chooser -> the era, mission 1, quiz "what is new compared with Ancient", strips; mechanic: scenario, quiz, strips |
| **P-CVD** "Cleo" | a colour-blind player who also asked for less motion | empty profile with Reduce Motion and flash limiter set through the Settings UI as step 1 | 960x540; every screenshot she receives is passed through the deuteranopia transform (Machado 2009, severity 1.0); sound muted | cannot tell red from green; relies on shape, label, position | plumbing: the boxed-unit tests of SLP-4 (30 team questions, 5 role questions, 3 "who is winning" frames), set-piece with Reduce Motion; mechanic: scenario, strips under the transform |

Command set (`tools/slice_kit/persona_cli.mjs`, the only interface; every command is logged to `commands.jsonl` with the page tick):

| command | effect |
|---|---|
| `look` | writes a PNG of the viewport (filtered for P-CVD) and prints its path |
| `text` | prints the visible text of the top screen and HUD as a screen reader would (headings, buttons with ids, HUD lines), never hidden DOM |
| `click <id or "label">`, `press <key>`, `drag x1 y1 x2 y2`, `scroll dy` | real input through Playwright |
| `wait <s>` | advance real time, at most 10 s per command, at the chosen speed |
| `speed <1, 2 or 4>` | the speed control (the real button) |
| `boxes <frameId>` | for the SLP-4 tests: returns a frame with numbered boxes over units; no unit names |
| `strips` | writes the strip PNGs of the finished battle in a shuffled order with neutral names `s1..s6` (mechanic: six strips; plumbing: the one 4-frame set-piece strip `s1`), only after the battle has ended |
| `answer <qid> "<text>"` | records a quiz answer (once; no edit) |
| `mark <BLOCKED, DEAD-END, CONFUSED, LAUGH or DELIGHT> "<note>"` | records a mark; `BLOCKED` = does not know the next action after 10 consecutive commands or 90 s, `DEAD-END` = no way forward through the UI |
| `done` | ends the session |

Limits: 400 commands, 60 minutes of agent time; no JavaScript evaluation, no file or network access, no `__vw`. Outputs: `commands.jsonl`, `marks.csv` (`persona,round,step,cmd_n,marker,text`), `answers.csv`, screenshots, and `report.md` (<= 80 lines, free text). A session that breaches a limit or touches a forbidden command is void and re-run with a new persona (the breach is logged in the verdict).

#### 3.7.3 Independence (SL-D12)

`make_kit.mjs` builds from the frozen sha with `git worktree` and then copies ONLY: the slice page, the cli, `persona_<id>.md`, `tasks_<slice>.md`, `<era>_<slice>.questions.json` (questions without keys). `qa_independence --check <kit> --profile slice` fails if the kit contains any of `docs/`, `design/`, `src/`, `tests/`, `tools/` (other than the cli), `.git`, a previous round, the keys, or a string equal to a builder-note file name; and, after the session, if `report.md` cites a plan section, a spec id, a round or a unit id that the UI never displayed. The keys live in `docs/eras/slices/keys/` which no kit can reach.

#### 3.7.4 Quiz and keys (questions are in the kit, keys only in `docs/eras/slices/keys/<era>_<slice>.keys.json`; a key is a list of keyword groups, an answer is correct when every group has at least one whole-word or stem match, case-insensitive)

Plumbing:

| era | Q1 | Q2 | Q3 |
|---|---|---|---|
| Medieval | "What makes the pikemen stop the horses?" key: [stand, still, hold, brace, planted, point] + [horse, horses, charge, cavalry, rider] | "What does key 1 do?" key: [arrow, arrows, volley, shoot, damage] | "What was the bugle for?" key: [early, wrong, too soon, charge, released, lancers] |
| Modern | "What are the dots under each soldier?" key: [ammo, ammunition, bullets, magazine, rounds] | "What happens when the dots run out?" key: [reload, kneel, crouch, cannot shoot, empty] | "How were the trolleys different from the riflemen?" key: [fast, faster, rush, rushed, wheels, outrun, charge] |
| Sci-Fi | "What does the Warden's dome do?" key: [block, stops, shield, protects] + [front, bolts, beams, shots] | "Where should the Wardens and Troopers stand?" key: [wardens, shield] + [front, ahead, forward] | "What happened to the dome wall at lunch?" key: [crack, cracked, breach, broke, hole, panel] |

Mechanic:

| era | Q1 | Q2 | Q3 |
|---|---|---|---|
| Medieval | "How do you open a closed castle gate?" key: [ram, battering, trebuchet, boulder, siege] | "What happens when the banner carrier falls?" key: [morale, rout, run, panic, flee, flinch, ring, pole] | "What do you bring against the dragon?" key: [archer, archers, bow, bows, longbow, ranged, shoot] |
| Modern | "What stops a machine gun from pinning your soldiers?" key: [flank, shell, mortar, smoke, cover, kill] | "Which side of a tank is the weakest?" key: [rear, back, side, behind] | "What does the amber ring winding over a soldier mean?" key: [pin, pinned, suppress, suppressed, cannot move, pushpin] |
| Sci-Fi | "After a shield breaks, what should you do with the soldier?" key: [pull, back, rotate, retreat, withdraw, wait, recharge] | "How do you find a cloaked unit?" key: [medic, lamp, detector, scan, ring, light, splash, drone] | "What does the tinker's gadget do to machines?" key: [stun, stuns, freeze, disable, off, power, shield, emp] |

P-RET's plumbing extra question ("name one thing that works differently from Ancient") has a per-era key of the era's mission-1 tell: Medieval [brace, pike, hold, charge, bugle, groats], Modern [ammo, reload, magazine, pips, bullets, burst, rq], Sci-Fi [dome, warden, bubble, gravity, moon, ergs].

Strip keys (SLP-6 four-frame set-piece strip; SLM-3 six strips):

| strip | key groups (all must match) |
|---|---|
| `med_sp_wrong_cue` | [bugle, trumpet, horn, charge, cavalry, horses, lancers, riders] + [early, wrong, loud, run, rush, released, gallop] |
| `mod_sp_live_fire` | [dummies, targets, cardboard, confetti, shooting, firing, bullets] + [fall, down, flat, shredded, pop, spring] |
| `sf_sp_lunch_served` | [dome, panel, window, glass, wall] + [crack, cracked, break, broke, steam, breach, hole] |
| Medieval T1..T5, SP | T1 [banner, flag, standard, pole] + [fall, drop, die, shatter, break]; T2 [gate, door] + [crack, break, splinter, fall, damage, ram]; T3 [heal, healing, medic, doctor, sparkle, glow, gold] ; T4 [dragon, flying, wyrm] + [fire, burn, swoop, dive, shadow]; T5 [boulder, rock, catapult, trebuchet] + [land, crash, hit, crater, smash]; SP [dragon] + [rise, wake, appear, fly, emerge] |
| Modern T1..T5, SP | T1 [pin, pinned, pushpin, suppress, crouch, duck, stuck]; T2 [cover, sandbag, behind, hide, bracket, protect]; T3 [armour, armor, tank, tink, bounce, deflect, front, rear, side]; T4 [shell, mortar, artillery, explosion, crater, incoming, ring]; T5 [mine, explode, blast, trap, trolley]; SP [smoke, fog, whistle, capture, post, charge, advance] |
| Sci-Fi T1..T5, SP | T1 [shield, bubble, dome] + [break, pop, crack, down, burst]; T2 [shield, bubble, dome] + [recharge, regrow, refill, return, back, sweep, full]; T3 [hover, float, fly, pad, glow, bob]; T4 [cloak, invisible, shimmer, stealth, hidden, ghost, fade]; T5 [reveal, revealed, appear, scan, light, visible, spotted] ; SP [freeze, frozen, stun, emp, hold, machines, power] |

A strip counts as recognised for a persona when the persona's text matches its key groups; the REVIEWER grades blind to persona identity and may overrule an obvious false negative (a synonym) by adding it to the key file with a note; a key edit after round 0 is allowed only if it widens and is recorded in the verdict.

#### 3.7.5 Verdict file shape (`docs/eras/slices/<era>_<slice>.md`; validated by `tools/slice_review.mjs --check-file`, SL-T03)

```
---
slice: scifi_mechanic
era: scifi
kind: mechanic            # plumbing | mechanic
round: 1                  # 0, 1, 2 or closing
tested_sha: <40 hex>
tested_page_sha256: <64 hex>
eraHash: <hex>
engineHash: <hex>
operator: TOOLS-VERIFY
reviewer: REVIEWER-2
personas: {nia: <agent id>, rex: <agent id>, cleo: <agent id>}
seeds: sl:<fnv>
verdict: PASS             # PASS | FAIL
warns: 1
signed_by: [REVIEWER-2]
date: 2026-10-30
---
| id | item | value | threshold | state | judge | evidence |
|---|---|---|---|---|---|---|
| SLM-1 | scenario run, blind variant | ref 9/10 Chromium, blind 17% | >= 8/10, <= 30% | PASS | tool | evidence/scifi_mechanic/r1/scorecard_tools.json#SLM-1 |
... (exactly 10 rows)
## Findings (FAIL and WARN only): id F-scifi-mechanic-1-3, item, observation, route (3.9), owner
## Breaches and voided sessions
## Evidence sha256 list
```

#### 3.7.6 Cost of one review (planning values; SL-D20)

| part | sessions | CPU-min | notes |
|---|---|---|---|
| operator (kits, tool run, strips, archive) | 1 | 12 `nice` + 25 `quiet` (plumbing) / 25 `nice` + 30 `quiet` (mechanic) | `nice`, perf rows `quiet` (VF 3.19) |
| personas | 3 | 3 | each <= 60 min of agent time inside a 90 min session |
| REVIEWER | 1 | 0 | audit, grading, compile |
| panel raters, classifier | 3 + 1 sessions inside the same days | 0 | already counted as ER11/ER21 panel capacity; the slice sample is smaller |
| total per review | 5 (plus the rater and classifier sessions) | | rework re-review: 1-3 sessions |

### 3.8 Consequences

#### 3.8.1 The volume gate (SL-D09)

Until `<era>_mechanic` is PASS in `docs/eras/slices/gate.json`, these work classes of that era may not be started. A WP of such a class carries `slice_gate = mechanic` in `wbs.csv`.

| class | blocked work | examples (WP kinds) |
|---|---|---|
| V1 units | any unit id outside the tracer set and the declared slice additions: model, clips, reactions, stats rows, UC work packages | UNITS-x WPs for `knight_errant`, `great_hog`, `hobby_drone` ... |
| V2 props | era-prefixed props beyond the 10 of 3.2.4 and 3.5.1 | PROPS-x WPs after the first 10 |
| V3 arenas | recipes beyond 3 per era | WORLD recipes after the three |
| V4 text volume | unit text, barks, lessons, kill verbs, announcer pool, hero names for units outside the slice; tips; wave names; loading lines | COMEDY-x volume WPs |
| V5 audio volume | chosen and packed rows for families outside the slice cue list, music tracks beyond the map bed and the low battle bed, stingers beyond the slice's (hunt *candidates* and licence snapshots stay free) | HUNTER pack WPs |
| V6 meta content | achievements, mutators, Workshop parts beyond the mission-1 reward, Codex dossiers, titles beyond mission 1's | EDITORS, UI data WPs |
| V7 modes data | puzzles, survival waves and bosses, daily and Quick presets, scout texts | CAMPAIGN-x, SIM data WPs |
| V8 art volume | chooser still style pass, map art beyond v0, photo frames | RENDER, UI |

Never blocked: SIM modules and their tests, tracers per rig and their look-dev, tools and gates, spikes, design documents, `missions.json` authoring (JSON is design; the units, props and arenas it names are V1..V3), audio candidate research, the slice scenario's own assets, the rework itself, calibration measurements, QA-lite preparation.

Mechanism: `wbs.csv` gains the column `slice_gate` in {`free`, `plumbing`, `mechanic`}; `tools/slice_gate.mjs --check` is a T-fast gate step (1 s) that reads `wbs.csv`, the ledger front matter (`wp`, `era`, `started`) and `docs/eras/slices/gate.json` (`{era: {plumbing: {state, sha, at}, mechanic: {...}}}`, append-only, written by COORD after a signed PASS). A WP with `slice_gate = mechanic` whose `started` precedes `gate.json[era].mechanic.at` (or whose era has no record) is a red `slice.early_start`; a WP row with no `slice_gate` is a red `slice.unclassified`. `plumbing` means "needs the plumbing infrastructure items PASS" and is used for the P1 content WPs that need the pipe (all SLW-xx content rows). Reds are handled by VF 3.20; there is no waiver, the only exits are 3.8.3 and a COORD reclassification logged in `cuts.md`.

#### 3.8.2 What a PASS does

COORD records `gate.json`, flips `manifest.expect.uc.set` of the era per UC 3.15 where the schedule says so, and removes the block of 3.8.1 for that era. A PASS of `<era>_plumbing` unlocks only the right to request `<era>_mechanic`; it unlocks no volume. `p1-done` (AR 3.10.4) is tagged by COORD when SLP-1, SLP-2 and SLP-10 are PASS in all three plumbing verdicts, whatever the state of SLP-3..SLP-9 (SL-D10).

#### 3.8.3 Rework rounds and the COORD decision (SL-D11)

| step | rule |
|---|---|
| round 0 FAIL | `docs/eras/slices/<era>_<slice>_rework1.md` lists every FAIL and WARN as a finding `F-<era>-<slice>-<round>-<n>` with item, observation, evidence path, `route` (3.9), owner. Owners fix; each finding ends `fixed` (commit sha), `accepted-warn` (ledger row) or `no-change` (evidence that the item was mis-measured, signed by REVIEWER). |
| re-judging | round 1 re-runs the failed items and every item whose `inputs` hash changed since round 0; everything else keeps its value (marked `carried`). Personas and raters are fresh and the kit has no earlier round (SL-D12). A persona item re-runs all three personas only when a persona item changed or failed; otherwise the failing persona's seat only. |
| round 1 FAIL | the same with `_rework2.md`. |
| round 2 FAIL | **COORD decision, same session.** For every item still FAIL, COORD logs in `cuts.md` one of: (a) a ladder rung (plan 13) when the failing thing is on the ladder (secondary mechanics, announcer/tips/sfx to floor, props 38 -> 34, workshop parts, photo frames); (b) a feel-sheet, roster or arena amendment (3.9) rewriting what the item measures; (c) both. NEVER-cut things (determinism, the era's headline mechanics, tone safety, the 9 + 6 counts, Quick era chips, contracts, credits) can only go through (b): the design is rewritten, not removed. The decision names the items to be re-judged. |
| closing review | one review of the failed and invalidated items by fresh judges; not a rework round; PASS records the gate. |
| closing FAIL | the era stays hidden, its volume stays blocked, COORD applies the calibration table of plan 12 (finish and release one era at a time), the other eras proceed, STATUS.md and the final message say which era and which item. There is no further automatic round; a later attempt is a new request with a new COORD decision. |

Rework budget (planning values, measured from the ledger): plumbing 12 sessions per round per era, mechanic 20; exceeding it still counts as the round.

#### 3.8.4 Slices and the calibration table

Review and rework sessions are a ledger class (`slice_review`, `slice_rework`); `ledger_stats` prints them next to the WP classes. A rework round that costs more than its planning value is reported to the calibration table of plan 12 like any overrun (no special rule).

#### 3.8.5 Staleness (SL-D18)

Every verdict item records the sha256 of the files matched by its `inputs` globs (3.6.3). `node tools/slice_review.mjs --stale <era> <slice>` marks an item `STALE` when the hash differs, and the verdict front matter gets `stale: [ids]`. The era DoD clause E4 (VF 3.21, rewritten by PC-SL1) needs, at the era's freeze sha: the mechanic verdict PASS, every tool item re-run at that sha and PASS (`slice_run --rerun-tools`, about 30 CPU-min), every persona or panel item either CURRENT or re-judged (the re-run rule: an item is re-judged if any listed unit model, tell file, set-piece row, beat file or humor file changed). A stale item does not stop running volume work.

#### 3.8.6 Schedule risk the rule creates (stated, not decided here)

The plan places the mechanic slice after the last module of the era's E-FREEZE set. Medieval volume therefore waits for its prefix, Modern for its prefix, and Sci-Fi volume for the whole chain (S-FREEZE) plus the review. The mitigations inside the plan are: tracers and slice additions are free; design, tools, mission JSON, audio candidates and the rework itself are free; preview reviews (SL-D15) can find problems as soon as the first headline module lands. Whether to reorder modules (for example the M6b split of R1 of the Sci-Fi outline) is a COORD/SIM decision recorded in OI-SL4; this file changes nothing about it.

#### 3.8.7 Ancient control values (`tests/baseline/slice_ancient.json`, two signers, golden rules)

`node tools/slice_run.mjs --era ancient --slice plumbing --record` runs the tool items on Ancient mission 1 (`marathon_sort_of`) and on the Ancient 43: `T1` per preset (recorded, not enforced: F6, F7), the readability ratchet file, announcer density and repetition, `ancient_scores.csv` medians and percentiles per surface, draws, triangles, `view.update`, `ensureEra` (Ancient cold bake 86.9 ms), and the 200-battle ER27 vector (`fingerprint_ancient.json`). Every tool must return finite values on Ancient (SL-T13). No Ancient file changes.

### 3.9 Failure routing and design change control

Every FAIL or WARN becomes a finding with a `route`:

| route | meaning | next |
|---|---|---|
| `fix-impl` | the design is right, the build is wrong | owner fixes, no document changes |
| `amend-design` | the design row cannot satisfy the item | an entry in `docs/eras/amendments.md` (COORD, living log, never 'final'): `{id, finding, doc, row, before, after, lints re-run and their result, signers}`; the signers are the document's owner and REVIEWER, plus COORD when the row is **slice-frozen** (below) |
| `cut` | the thing is on the ladder and not NEVER-cut | `cuts.md` row, only after round 2 (3.8.3) |
| `accept-warn` | a WARN inside its band | ledger row with owner and deadline phase |

Slice-frozen rows are the rows the slice measured: the feel-sheet rows of 3.6.4 and the tell rows of the feel sheet section 4/5, the rosters rows of the scenario units, the arena rows of the scenario arenas, the set-piece rows used, the ER19 beats. They are listed in `docs/eras/slices/frozen.json` by `slice_review --freeze` at PASS; "after the slice, COORD approves" (plan 14) means an amendment to a frozen row needs COORD's signature and re-judges the affected items (the `inputs` hashes decide which).

Item routing (owners are plan roles):

| item | usual cause | owner of the fix | document to amend when the design is wrong | lints to re-run |
|---|---|---|---|---|
| SLP-1, SLM-1 | step label tells: navigation/deploy UI -> UI; reference loses -> CAMPAIGN-x (mission data) then BALANCE; hash mismatch -> SIM/INTEGRATION (a red per VF 3.20); blind variant wins > 30 percent -> DESIGN-CAMPAIGN (the mechanic is not decisive: counters row of `rosters.md`) | per label | `missions_outline.md`, `rosters.md` section 3 | `ms_lint`, roster lint, `balance --quick` |
| SLP-2 | persona BLOCKED/DEAD-END -> DESIGN-UX flow (`flowtable`) and UI | UI | `spec/CU` 3.6.4 | `walks`, `uiscan` |
| SLP-3, SLM-5 | zones too close/far, a range, a wave time | WORLD, CAMPAIGN-x | `arenas.md` zone gaps, feel sheet 2 | `tempo`, `ms_lint` |
| SLP-4, SLM-2 | tint, ring, palette, THEME_LOOK, tell size | RENDER, UNITS-x, WORLD | `visual_bible.md` palette (CIEDE2000 rule), feel sheet 4/5 tell | `vbscan`, `readability`, `tintcheck` |
| SLP-5, SLM-4 | beat wording, order, trigger | UI, COMEDY-x, CAMPAIGN-x | `first_three_minutes.md`, `missions_outline.md` teaching rows | ER19 run, `text_sweep` |
| SLP-6, SLM-3 | shot, stinger, line, tell animation | INTEGRATION, RENDER, AUDIO, COMEDY-x | the set-piece row, feel sheet tell | ER20 run |
| SLP-7, SLM-6 | pool size, routes, cooldown | COMEDY-EDITOR, INTEGRATION | `humour.md` category table | `humor-sim`, `announcer_trace` |
| SLP-8, SLM-7 | low-scoring surface | COMEDY-x (rewrite, not delete) | `humour.md` | `text_sweep`, `panel` |
| SLP-9, SLM-10 | chrome, palette, THEME_LOOK too close to another era | UI, RENDER, DESIGN-ERA-x | `ui_chrome.md`, `visual_bible.md` | `chrome_census`, `vbscan` |
| SLM-8 | a dimension outside its band, separation too small | DESIGN-ERA-x and BALANCE | the feel sheet or the roster (never the metric) | `era_fingerprint`, `contracts` |
| SLP-10, SLM-9 | draws, triangles, CPU, size, heap | RENDER (lever ladder), SIM, TOOLS | plan 3 lever ladder, `cuts.md` rungs, D17 | `perf_assert` |

### 3.10 Calibration checkpoints (what each measures)

| checkpoint | when | unit of measure | clauses and sample |
|---|---|---|---|
| 1 | end of P1 (`p1-done`) | `ledger_stats` cost per tracer WP | the `TRACER` set (3.2.3) over all accepted tracers: the nine mission-1 unit WPs of SLW-18 plus every other rig tracer of RA 3.17 |
| 2 | after M7, M12 and M14 have landed (plan 12) | `ledger_stats` cost per unit WP at `UC-B` | one unit per rig class listed below, `tools/contracts.mjs --set=b` |
| mechanic slices | after the last module of each era | review and rework sessions (3.8.4) | not a calibration of unit cost |

Rig classes measurable at checkpoint 2 on `UC-B` (UC 3.14: the clauses are data and Node level, so every class is measurable before M8/M4/M5/M6b land): hum1 gunner and hum1 melee, quad1 mounted and quad1 beast/species, tank1, car1, heli1, drone1, hover1, gun1 with crew, trebuchet1, ram1, dragon1, insect1, walker1/mech, boss variants. Not measurable there, and left to the mechanic slices: behaviour (turret gating, shield regeneration, cloak, EMP, air AI), which UC does not judge. No projection scale factor is needed (UC 3.14, q3_program 18): clauses outside `UC-B` are other roles' WPs that `wbs.csv` already counts, and the slices' own sessions are counted in `slice_review`.

### 3.11 The first-10-minutes walks as scripted steps (q3_product 22)

`tools/walks.mjs` (VF 3.23.6, VF-T27) runs the steps; the expected values marked [CU] are read from the `flowtable` block of `spec/CU` 3.6.4. Fixtures: walk A loads `ancient_release_v8` (G5), walk B starts from an empty profile. Each step has an owner (who builds the thing it asserts), an assertion id `VF-T27/<step>` and a screenshot `.cache/walks/<walk>/<step>.png`. **Scope** says whether the step is asserted in the plumbing slice (SLP-2) or deferred with its owner and deadline.

| step | assertion | owner | scope in the plumbing slice |
|---|---|---|---|
| A1 | splash -> title: stars read `x/(27 x released)`, era chips match the released set, no "ROADMAP" tablet [CU] | UI | in scope (WP-CU2) |
| A2 | what's-new card shows once after the splash when > 1 era is released, dismissible by keyboard and touch, focus returns to `#menu-quick` [CU] | UI | in scope (SLW-08) |
| A3 | Campaign opens the chooser; `lastEra` derived (most stars, Ancient on a tie) pre-focused, primary "Continue Ancient" [CU] | UI | in scope (WP-CU2) |
| A4 | the Ancient map equals G8/G10 | UI, TOOLS-GOLDEN | in scope |
| A5 | one Ancient mission by UI, NEXT uses the era's own list | UI, INTEGRATION | in scope |
| A6 | chooser -> era card: portal <= 1.2 s with `ensureEra` behind it, any key skips, Reduce Motion fades, arrival card skippable, mission 1 shows era beats and NO basics beats (`seen.basics` derived true) | UI, INTEGRATION | in scope (SLW-03, SLW-08) |
| A7 | first Daily after the update is the Ancient plan of G7 for that date and the streak is intact | SIM/CAMPAIGN (G7), UI | **partial**: plan equality and streak counters asserted; the "my era only / all eras" mode label and the era stream are P2 work (`PEND(UI, P2)`, WP-CU8, deadline: before the first mechanic request) |
| A8 | stored `gore:'red'` without a marker resolves to `auto`; the what's-new card names the setting | REGISTRY, UI | in scope (WP-CU3, SLW-08) |
| B1 | fresh profile: title and what's-new suppressed [CU] | UI | in scope |
| B2 | Campaign opens the chooser with Ancient pre-focused, primary "Begin Ancient" [CU] | UI | in scope |
| B3 | era card, portal, arrival card whose copy carries the premise for a player who never saw Ancient | UI, COMEDY-x | in scope (SLW-08, SLW-16) |
| B4 | mission 1 shows the basics layer once, era-neutral wording (no "hoplite", "Zeus") | INTEGRATION, COMEDY-x | in scope (SLW-03) |
| B5 | deploy: the era's tell is readable. Plumbing form: Medieval brace chevron under a held pike block, Modern ammo pips and RELOAD ring, Sci-Fi Warden dome arc and no shield artefact (no `shield_*` event); the full form (shield, cloak, EMP tags) is SLM-2/SLM-3 | RENDER, UI | in scope in the plumbing form |
| B6 | the mission's set-piece fires on five channels | INTEGRATION | in scope (SLP-6) |
| B7 | results grant a real reward and record the unlock of mission 2; the next pin shows "In production" (BR1/BR2) | UI, CAMPAIGN-x | in scope in the building form |
| B8 | Quick default era chip, Survival, Puzzles, Codex default tabs [CU] | UI | **deferred**: the era filters of those screens are P2 (WP-CU8, WP-CU9); `PEND(UI, P2)`, deadline: the first mechanic request; asserted at the latest by ER10/ER22 |

Plumbing-slice walk assertions in scope: 15 (A1..A8 with A7 partial, B1..B7); this is the 15 of SLP-2.

### 3.12 Files, hooks, owners, Ancient-path rows, requests

#### 3.12.1 New files

| path | owner | notes |
|---|---|---|
| `tools/slice_run.mjs`, `tools/slice_review.mjs`, `tools/slice_gate.mjs`, `tools/slice_scope.mjs`, `tools/slice_kit/{make_kit,persona_cli,strips,grade}.mjs`, `tools/lib/slice_*.mjs`, `tools/announcer_trace.mjs` | TOOLS-VERIFY | the tools of SLW-20 |
| `tests/slice/*.test.mjs`, `tests/negctl/SL-T*.mjs`, `tests/fixtures/slice_scope.json`, `tests/baseline/{slice_ancient,announcer_density_ancient,fingerprint_ancient}.json` | TOOLS-VERIFY | acceptance |
| `docs/eras/slices/{<era>_<slice>.md, gate.json, frozen.json, keys/, evidence/, history/, preview/}` | REVIEWER (verdicts, keys), COORD (`gate.json`) | outputs |
| `docs/eras/slice_kit/{persona_nia.md, persona_rex.md, persona_cleo.md, tasks_<slice>.md, <era>_<slice>.questions.json}` | DESIGN-UX | kit inputs, no keys |
| `docs/eras/amendments.md` | COORD | living log |
| `design/<era>/slice_mechanic.json`, `src/content/era_<id>/slice.js` (generated) | CAMPAIGN-x, REGISTRY | scenario |

#### 3.12.2 Ancient-path rows (appended to AR 3.2.3 by TOOLS-GATE; policy bit-identical opt-in)

| id | path | change | policy and proof |
|---|---|---|---|
| AP-SL1 | `src/app/main.js installHook` | adds the getters `trace` and `slice` (read-only, dev-only) | PX; no behaviour change; G10 mission-1 flow and G8 equal (SL-T11) |
| AP-SL2 | `tools/build.mjs` | flags `--state`, `--slice` | PX; without flags the output is byte-identical (SL-T11) |
| AP-SL3 | `src/render/engine.js` (or `battleview.js`) | `__vw.render.layers` toggles, default all true | PX; draws and G8/G12 equal with defaults (RA-T11 style) |

#### 3.12.3 Requests (each with its fallback; none silent)

| id | to | request | fallback |
|---|---|---|---|
| R-SL-I1 | INTEGRATION | `__vw.trace` (`announce setpiece teaching shots`) and `__vw.slice.open`, in `docs/requests/tools_hooks.md` | none for `slice.open` (the scenario cannot be reached through the UI); `trace` fallback: `tools/lib/ui_driver.mjs` subscribes with a read-only `game.on` added to the VF closed list |
| R-SL-R1 | RENDER | `__vw.render.layers({units, fx, shields, labels, terrain})` | none: the tell metric of SLM-2 would be UNVERIFIED (= FAIL), so the hook is a P1 deliverable |
| R-SL-T1 | TOOLS-GATE | `build.mjs --state --slice`; gate step `slice_gate` in T-fast | snapshot edits its own `eras.config.js`; `slice_gate` run by COORD by hand until the step exists |
| R-SL-V1 | TOOLS-VERIFY | `contracts --set=sl`; `qa_independence --profile slice`; `panel`, `readability`, `tempo`, `era_classify`, `era_fingerprint` `--slice` modes; `walks` scope table of 3.11 | none; they are SLW-20 |
| R-SL-V2 | TOOLS-VERIFY (VF owner) | VF 3.19 heavy-job table gets the rows "slice review plumbing" (12 CPU-min `nice` + 25 min `quiet`, x3 eras x up to 3 runs) and "slice review mechanic" (25 CPU-min `nice` + 30 min `quiet`, x3 eras x up to 3 runs); VF 3.21 clause E4 file name | none |
| R-SL-U1 | DESIGN-UX (CU owner) | amendment AM-CU-S1: building-era rules BR1..BR4 and registry code V21; AM-CU-S2: the P1 subset of WP-CU5, CU6, CU7, CU8, CU10, CU12 (3.4) | none: without them the slice cannot run honestly |
| R-SL-W1 | WORLD | recipes start with the slice prop subset and grow; no dual 'slice dressing' mode | none |
| R-SL-A1 | AUDIO | the slice cue list per era (3.4 SLW-19) as ledger rows or approved synth | approved synth recipes (AU1 synth fallback) |
| R-SL-C1 | CAMPAIGN (MS owner) | PC-SL4: lite events also accept the single event-derived counter `projectile_launches`; `ms_lint --slice` | the Modern mission-1 set-piece at a numeric `at` equal to the measured median first-launch tick |
| R-SL-M1 | SIM | `GodPower` rows may carry `needs: [module]` (documentation) and the UI `ready` flag is data only; perf scenarios `MED-W MOD-W SF-W` accept the slice rosters | none |
| R-SL-AR1 | REGISTRY (AR owner) | owner-table rows for the files of 3.12.1, kind `slice_mission`, rules for `slice.js` generation | none |

## 4. Acceptance

Scripts live in `tests/slice/`; each registers `criterion('SL-Txx', {er, owner, tier, negctl})` and has `tests/negctl/SL-Txx.mjs` (a mutation that must turn the named check red; QA draws >= 8 negative controls by its own seed, VF 3.18). Every script runs per era through `tests/_eras.mjs eachEra` (zero assertions for an era fails). Tiers F/E/U/R/H as VF. The slice machinery registers under the existing criteria (ER8 for the campaign-flow family, ER1, ER2, ER13, ER14, ER15 where it overlaps); no new ER id is introduced (`plan_lint` PL02 fixes the ER set), and the rubric items themselves are slice verdict rows, not ER rows.

| id | ER | script | inputs | thresholds | owner | tier | negative control |
|---|---|---|---|---|---|---|---|
| SL-T01 | ER8 | `tests/slice/rubric_shape.test.mjs` | the `rubric` block of 3.6.3 and the tables of 3.6.1/3.6.2 | exactly 10 items per slice; ids equal the tables; every item has >= 1 judge from {tool, P-NEW, P-RET, P-CVD, REVIEWER, panel, agent} and, if tool, a path that exists or is registered with a `first` phase in VF; every `pass` object has numeric thresholds; infra list equals {SLP-1, SLP-2, SLP-10}; every `inputs` glob matches >= 1 file | TOOLS-VERIFY | F | add an 11th item; delete a threshold; judge `human` |
| SL-T02 | ER2 | `tests/slice/scope.test.mjs` (`slice_scope.mjs`) | registry, recipes, mission 1, scenario JSON | arenas <= 3; era props <= 10 (counted as the union over recipes and scenarios; shared `any` free); mission-1 units within the tracer set; scenario roster 20..30 and non-tracer units equal the declared additions (<= 6); every id, cue, beat, tell event, `blind.swap` target resolves; the numbers of 3.2.4 and 3.5.1-3.5.4 equal the data | TOOLS-VERIFY | F | add an 11th prop to a recipe; a 31st unit; an undeclared addition |
| SL-T03 | ER8 | `tests/slice/verdict_file.test.mjs` (`slice_review --check-file`) | fixture verdicts and every committed verdict | front matter keys; exactly 10 rows; state in {PASS, WARN, FAIL}; WARN <= 3 for verdict PASS; evidence paths exist and sha256 match; `signed_by` is a REVIEWER who is not in the ledger of any WP touching the item inputs; `round` <= 2 unless `closing`; `tested_sha` equals the evidence sha | TOOLS-VERIFY | F | an item without evidence; self-signed; 4 WARN with verdict PASS; round 3 |
| SL-T04 | ER8 | `tests/slice/kit_independence.test.mjs` (`make_kit`, `qa_independence --profile slice`) | a kit built from a fixture sha | the kit contains only the allowed files (3.7.3); boots; `persona_cli` rejects `eval`, file and network commands; a kit with `design/` or the keys fails; a report citing a spec id fails | TOOLS-VERIFY | E | copy `design/` into the kit |
| SL-T05 | ER8 | `tests/slice/volume_gate.test.mjs` (`slice_gate --check`) | fixture `wbs.csv`, ledger and `gate.json` | a `mechanic` WP started before the record is red `slice.early_start`; unclassified row red; after a record the same WP is green; the gate step is present in `gate.mjs` T-fast | TOOLS-VERIFY | F | start a V1 WP one day early; delete the column |
| SL-T06 | ER8 | `tests/slice/persona_protocol.test.mjs` | recorded fixture sessions | `commands.jsonl`, `marks.csv`, `answers.csv` schema; session > 400 commands or a forbidden command is void; keys grade the fixture answers exactly as the table says (whole-word and stem match, all groups); a widened key is recorded | TOOLS-VERIFY | F | grade by substring instead of whole word |
| SL-T07 | ER8 | `tests/slice/scenario_lint.test.mjs` (`ms_lint --slice`) | the three `slice_mechanic.json` | MS shape complete; set-piece ids exist in `setpieces.js`; each tell has an event name from the closed event list (M 3.12) and a fallback tick below `timeLimit x 30`; `rewardId` null; `slice: true`; excluded from `missions` and from UC-80; the reference army is a legal army (budget, zone, <= 16 types) | CAMPAIGN | F | a tell with an unknown event |
| SL-T08 | ER13 | `tests/slice/determinism.test.mjs` | `slice_run` twice on the fixture sha | every tool value equal across the two runs (seeds fixed); strips byte-identical | TOOLS-VERIFY | E | seed from the clock |
| SL-T09 | ER8 | `tests/slice/walks_scope.test.mjs` | 3.11 table (machine copy `tests/fixtures/walks_scope.json`), VF `flowtable` | every in-scope step has an assertion id `VF-T27/*`, a screenshot path and an owner; the deferred steps have `PEND(owner, phase)`; the count of in-scope steps is 15 | DESIGN-UX | F | delete an assertion id |
| SL-T10 | ER8 | `tests/slice/hooks.test.mjs` (`slice_gate --probe-hooks`) | the slice page in Chromium | `__vw.trace` has the four arrays, `__vw.slice.open` navigates to a briefing, `__vw.render.layers` toggles change the control frame, `Game.pump` advances `frame` without rendering | INTEGRATION, RENDER | E | remove `layers` |
| SL-T11 | ER1 | `tests/slice/ancient_identity.test.mjs` | the default build and the `--state=ancient --slice` build | default build byte-identical to the build without the AP-SL rows; with `released = {ancient}` the G10 mission-1 flow and G8 map/title equal the baseline; Ancient `ensureEra` unchanged | TOOLS-GOLDEN | E (R for G8) | ship the AP-SL1 hook without its dev guard: the default build differs from the baseline build |
| SL-T12 | ER14 | `tests/slice/release_strip.test.mjs` | `build.mjs --minify` without `--slice` | no `_slice_` id in any file or string table; size equals the build without the slice data | TOOLS-GATE | U | build with `--slice` as the release |
| SL-T13 | ER8 | `tests/slice/ancient_control.test.mjs` | `slice_run --era ancient --record` | every tool returns finite values on Ancient mission 1; `slice_ancient.json` has two signers and equals a re-run within the noise floor | TOOLS-VERIFY | R | inject a NaN |
| SL-T14 | ER8 | `tests/slice/stale.test.mjs` | fixture verdict + changed input file | an item whose input hash changed is `STALE`; the others stay `CURRENT`; E4 refuses a verdict with stale items and no re-run | TOOLS-VERIFY | F | change a humor file, expect red |
| SL-T15 | ER8 | `tests/slice/rework.test.mjs` | fixture round history | a third rework round is refused; the COORD decision file is required after round 2; the closing review runs only the listed items; an inert rework (no fix commits, no `no-change` signature) is refused | TOOLS-VERIFY | F | accept a round 3 |
| SL-T16 | ER15 | `tests/ui/building_era.test.mjs` | a hidden `building` era fixture | BR1..BR4 behave as 3.2.6; a `complete` era with a missing mission, pin or `ready:false` power fails `registry.verify` | UI | E | render a stub NEXT |

Coverage of the charter: scope (3.2, 3.5) is checked by SL-T02 and SL-T07; the rubric by SL-T01; the judges by SL-T03, SL-T04, SL-T06; the consequence by SL-T05, SL-T14, SL-T15; the walks by SL-T09; Ancient by SL-T11, SL-T13.

**Unverified by construction (stated, not hidden):** the rubric thresholds were derived from the feel sheets, the VF/W/RA specs and the Ancient measurements named in them; none of the new-era tools exists yet, so no threshold has been exercised on a new-era build; the Ancient control run (SL-T13) is where the first real calibration happens and it may move a numeric line through a logged amendment of 3.6 (not through a content agent). Persona, panel and classifier verdicts are model-agent judgments, not human ones; the final message says so with the other unverified items of plan 9.

## 5. Residual ledger

| item | text (short) | answered in | status |
|---|---|---|---|
| plan 14 row `spec/S-slice` | plumbing slice and mechanic slices: scope, <= 10 scored items with numbers, judge = fresh persona + REVIEWER, consequence | 3.2, 3.5, 3.6, 3.7, 3.8 | answered |
| plan 12 P1 row | plumbing slice = mission 1 of each era through the real UI, `campaign_play` green, first calibration | 3.2, 3.4, 3.10 | answered |
| plan 12 P2 row | mechanic slices after the last module of the prefix; volume only after a pass; <= 2 rework rounds then COORD logs a cut or a feel-sheet change | 3.5, 3.8.1, 3.8.3 | answered |
| q2_product Q1 (a) | scope: mission 1 and the first act-2 mission, set-piece, arrival card, beats, announcer, music, HUD pieces; P1 tasks listed | 3.2.4 (per-era pieces), 3.4 (tasks); the act-2 mission is replaced by the mechanic scenario (PC-SL5) | answered, modified |
| q2_product Q1 (b) | rubric of <= 10 items with numbers: ER17 readability, blind classification >= 90%, first contact, beats, set-piece, announcer 1 per 20 s and no repeat in 5 min, comedy >= Ancient - 0.5, tempo fingerprint | 3.6 (SLP-3, 4, 5, 6, 7, 8, 9, SLM-8) | answered (first contact per W bands, PC-SL6) |
| q2_product Q1 (c) | judge = fresh persona agent without builder notes + REVIEWER, results in a file | 3.7 (personas, kit, verdict file) | answered |
| q2_product Q1 (d) | P2 volume blocked until a pass; <= 2 rework rounds, then COORD logs a cut or a feel-sheet change | 3.8.1, 3.8.3 | answered |
| q1_product Q4 rubric list | first 10 s hook, time to first contact, readable events, did the player learn, did anything make the reviewer laugh, who is winning at 3 zoom levels | SLP-3 (hook), SLP-5 and SLM-4 (learning), `LAUGH` marks and SLP-8 (laughter), SLP-4 (3 zoom frames) | answered; "readable events per minute" is covered by SLM-5's moment gap |
| q2_schedule Q8 (1) | rename the P1 slice "plumbing slice", list its modules and C-items, acceptance = `campaign_play` green on the three mission-1s plus the rubric items needing only those | 3.2.2, 3.4, SLP-1..SLP-10 | answered |
| q2_schedule Q8 (2) | per-era mechanic slice gate in P2 with a written rubric gating volume | 3.5, 3.6.2, 3.8.1 | answered; the modules are named per the plan's E-FREEZE prefixes (PC-SL5) |
| q2_schedule Q8 (3) | tracer = U1 minus the six P1-impossible clauses, calibrate on that | 3.2.3 (`TRACER`), 3.10 | answered (UC 3.14) |
| q2_schedule Q8 (4) | rubric of 8-10 observable items | 3.6 | answered |
| q3_program residual 18 | which rig classes are measurable at calibration 2 and with which UC clauses | 3.10 (UC-B, rig class list, no scale factor) | answered |
| q3_product residual 22 | the two first-10-minutes walks as scripted scenarios with expected screen, owner, assertion, screenshot; run in Chromium by a fresh persona and by `uiscan` | 3.11 (steps, owners, assertion ids, scope), 3.7.2 (P-RET walk A, P-NEW walk B), G0-9 and SLP-2 | answered; A7 partial and B8 deferred with owner and phase |
| VF OI-1 | measure `suggestArmy` vs `buildMissionWorld` placements | SLP-1 (recorded as `placements_equal`) | answered at P1 |
| VF OI-5 | `flowtable` block for walks A and B | consumed (CU 3.6.4 already has it) | closed |
| UC 3.14 / residual ledger "S-slice cites 3.14" | tracer vs UC-B sets and unlock tags | 3.2.3, 3.10 | answered |
| MS OI-MS3, OI-MS4 | lite events and mission 1 JSON at the end of P1; all nine at the mechanic slice | SLW-05, SLW-15; 3.8.1 says JSON authoring is never blocked | answered |
| W WP-W09 "first 3 recipes per era in the plumbing slice" | the first recipes and props | 3.2.4 (mission-1 arena + 5 props), 3.5.1 (second arena + 5 props, third slot), SL-D08 | answered; the second and third recipes come in P2 (PC-SL7) |
| M-layers OI-L4 | fit the draft tunables against the Medieval dragon slice and the Modern tank slice | the scenarios of 3.5.2/3.5.3 are the fitting context; BALANCE and SIM run the fit on `slice_mechanic.json` armies before the request; SLM-9 and SLM-5 check the result | answered (consumer) |
| design bibles, plumbing statements (medieval first_three_minutes rule 2, modern rule 2, scifi rule 2 and 11, scifi arenas notes, medieval feel_sheet 11, modern missions_outline 1.2) | mission 1 needs only the first five modules; Sci-Fi bubbles inert; set-piece by timer or existing event | 3.2.2, 3.2.4 | honoured; the Modern trigger needs PC-SL4 |
| design requests addressed to DESIGN-UX/UI (CU 3.21.2) | | answered in `spec/CU` | n/a |
| plan 9 "judged by model panels" | comedy, feel, set-pieces and readability are agent judgments | 4 (unverified paragraph), 3.7 | answered |
| e.md 8.1 | each campaign playable from the chooser through the real UI | SLP-1, SLP-2 | answered for mission 1 here; missions 1-9 by ER8 |
| traceability rows 2.8 "studio finish", 5 "set-piece per mission", 5 "mechanic visible and teachable" | | SLP-6, SLM-3, SLM-4 | answered |

## 6. Plan corrections (a plan item, a spec or a design file disagreed with another or with the code; the stated resolution wins)

| id | what disagreed | resolution |
|---|---|---|
| PC-SL1 | `VF` 3.21 clause E4 reads the verdict file `docs/eras/slices/<era>.md`; the charter and plan 14 name `docs/eras/slices/<era>_<slice>.md` for two slices per era | two files per era: `<era>_plumbing.md`, `<era>_mechanic.md`; E4 reads `<era>_mechanic.md` (plus `_plumbing.md` must be PASS); R-SL-V2 asks VF to rewrite E4 |
| PC-SL2 | `CU` 3.20.4 schedules WP-CU5 (teaching), WP-CU6 (set-piece director), WP-CU7 (labels, selection card), WP-CU8 (reward writers), WP-CU10 (announcer era-ization, Plato MUTED), WP-CU12 (cards, portal) in P2/P4, but the plumbing slice runs set-pieces, beats, the Modern ammo pips, the era announcer, the arrival and what's-new cards and the portal | the P1 subsets of those WPs are SLW-03, 04, 06, 07, 08, 25 (3.4); the remainder stays in the CU phase (AM-CU-S2); about 41 sessions move earlier, none added |
| PC-SL3 | `RA` 3.17 names the Cinderwyrm as the dragon1 tracer; `design/medieval/rosters.md` marks `wyvern` as tracer and `cinderwyrm` as not (UC-98 compares the flags with the RA matrix) | the P1 dragon1 tracer is `wyvern` (cheaper variant, SP-style rig proof); `cinderwyrm` is a slice addition built before the Medieval mechanic slice with its 4 look-dev rounds; DESIGN-ARCH aligns RA and UC-98 (OI-SL2) |
| PC-SL4 | `MS` D-MS-12 and MS-E03 allow only numeric `at` events without M14, but MS 3.6.4 realises `mod_sp_live_fire` as `on counter projectile_launches` for a mission whose `requiresModules` has no M14 | the lite `MissionRuntime` also implements this one event-derived counter (`projectile_launches gte 1`, a listener on the existing `projectile_launch` event, the `ZeusStrikes` pattern); MS-E03 is amended (R-SL-C1); fallback: numeric `at` = measured median first-launch tick |
| PC-SL5 | q2_product Q1 asked for a slice of mission 1 and the first act-2 mission; q2_schedule Q8 named module sets for the mechanic slices (M7+M10+M12, M8+M9, M4+M5+M7); plan v3.1 and `q3_engine` B2 moved the slices to the end of each E-FREEZE prefix | this file follows the plan: one scenario per era after the last module of the prefix; the act-2 mission's role (a human-hard opponent) is played by the blind variant and autofill bounds of SLM-1 |
| PC-SL6 | plan 14 "first contact 6-20 s" vs `W` 3.7.5 bands (small arenas cannot reach 6 s) | SL-D13: the W bands |
| PC-SL7 | `W` WP-W09 puts the first three recipes per era in the plumbing slice; the mechanic arenas (castle, trench, crash site) are large builds | only the mission-1 recipe is a plumbing deliverable; recipes 2 and 3 are built in P2 before the mechanic request (they count inside the cap of 3) |
| PC-SL8 | `design/scifi` arenas.md puts `sf_sp_lunch_served` at 45 s, missions_outline item 9 and MS 3.6.4 at 30 s | 30 s (the MS value) |
| PC-SL9 | `design/medieval/first_three_minutes.md` and the Modern file hide the Suggested army until two defeats | rejected by CU PC-CU10 / CU-D12; the slice uses `#pl-suggest` from the first attempt (SLP-1) |
| PC-SL10 | `ER21` "blind classification >= 90% over 30 screenshots" is one number; at the mechanic slice only some eras exist | SLP-9 (30 screenshots, plumbing) and SLM-10 (24 battle screenshots, mechanic), both with per-subset floors |
| PC-SL11 | the plan's calibration 1 says "cost per tracer on the UC subset listed in spec/S-slice" | the subset is the `TRACER` set of UC 3.14, copied in 3.2.3 |

## 7. Open items

| id | item | owner | deadline phase |
|---|---|---|---|
| OI-SL1 | write the persona briefs, task scripts, question files and keys exactly as 3.7 says (SLW-22) and have a REVIEWER dry-run them on Ancient mission 1 | DESIGN-UX, REVIEWER | before the first plumbing review (end of P1) |
| OI-SL2 | align `RA` 3.17 and UC-98 with PC-SL3 (wyvern vs Cinderwyrm tracer) | DESIGN-ARCH | P0 exit |
| OI-SL3 | VF amendments of R-SL-V2 (E4 file name, heavy-job rows, walks scope) and the `contracts --set=sl` name | TOOLS-VERIFY | P0 exit |
| OI-SL4 | decide whether the schedule risk of 3.8.6 (Sci-Fi volume starts last) is accepted as is or a module reorder (the M6b split of the Sci-Fi outline R1, M4/M5 earlier) is requested from SIM; preview reviews are available either way | COORD with SIM | P1 end (calibration 1) |
| OI-SL5 | the first measurement of the Ancient control values (3.8.7) may move a numeric line of 3.6; the change is a logged amendment signed by DESIGN-UX and REVIEWER | DESIGN-UX | before the first plumbing review |
| OI-SL6 | A7 (Daily mode label and era stream) and B8 (default tabs) are deferred with `PEND(UI, P2)` | UI | before the first mechanic request |
| OI-SL7 | feel-sheet bands at slice scale (3.6.4 scale correction) are checked on the first Medieval measurement | DESIGN-ERA-MED with TOOLS-VERIFY | first mechanic review |
| OI-SL8 | the scenario reference armies are tuned by CAMPAIGN-x and BALANCE inside the allowed adjustment (counts +-20 percent, never the roster ids) so that SLM-1 passes without touching a stat | CAMPAIGN-x, BALANCE | before each mechanic request |
| OI-SL9 | the tool `era_classify` needs a seeded screenshot list per slice (names in `tests/fixtures/classify_<slice>.json`) | TOOLS-VERIFY | before the first review |
