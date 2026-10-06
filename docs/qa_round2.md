# QA round 2 (independent, read-only; last check before release)

Reviewer: QA2. Date 2026-10-06. Branch `claude/cool-babbage-g7oakv`. Tested: `dist/voxelwars.html` and `dist/artifact/index.html`, both built **14:18**, served under the Artifact CSP with `assets/` as published files, headless Chromium + SwiftShader (software GL), 1280x720 unless stated (390x844 touch for phone). **Nothing was heard and no frame rate is judged** (section 11). Machine was shared with another agent's 4-8 balance jobs for most of the session, so every CPU number below is an upper bound.
Method: real UI clicks (Playwright mouse/touch/keyboard on the real DOM) for every flow in A-C; `window.__vw` only to read state, to step the sim faster than software GL can render, or to skip animations. Scratch scripts in `/tmp/qa2` (not committed). Screenshots in `docs/qa2/` (key ones named below).

**Release note first (process, MAJOR):** HEAD is `6d4b9ff`; commit `15f50c0` ("Campaign retune: missions 3, 4, 6, 9 ...", `src/content/era_ancient/campaign.js` + `tests/campaign/feasibility.json`) landed at 15:53, **after** both `dist/` files were built (14:18). The page I tested therefore has the OLD mission 3/4/6/9 armies (mission 4 had 38 enemy units); the retuned data is not in `dist/` until `node tools/build.mjs` is run again. Also, commit `6d4b9ff`/earlier ones added ~190 screenshot files (~115 MB) from `docs/qa2/`; I pruned that folder to 50 curated JPEGs (11 MB) at the end (section 12); the 189 deleted PNGs show up as deletions and the git history still holds the big files.

## 0. Summary

| severity | count | ids |
|---|---|---|
| BLOCKING | 0 | none (round-1 B1 is fixed) |
| MAJOR | 2 | R2-M1 My-arena selection throws and leaves a stale objective; R2-M2 `dist/` is older than the committed campaign retune |
| MINOR | 16 | R2-m1 ... R2-m16 (section 8) |

Round-1 status (section 1), 29 findings re-tested: **20 fixed, 5 partly fixed** (phone mute, Workshop/Painter tap targets, thumbnails, Styx/arena look, title diorama), **2 still open** (countdown digit ghosting, first Tab on Quick), **2 UNVERIFIABLE here** (M6 triangle load on a real GPU, music choice). Evidence table of criterion ids in section 9.

The game is in much better shape than round 1: every flow I could reach with real clicks works end to end (Quick, Campaign 1 -> 2, Puzzles, Survival with intermission and game over, Daily x2, three editors, custom soldier in battle with its paint, custom arena in Quick Battle), console was **clean for 15 minutes of mixed use** (151 loops, 0 errors) apart from the one real exception found (R2-M1).

## 1. A. Round-1 findings re-tested on the current build

| # | round-1 finding | verdict | proof |
|---|---|---|---|
| B1 | Daily / Survival BACK and Esc dead, stack overflow | **FIXED** | real clicks: title -> DAILY/SURVIVAL/CAMPAIGN, BACK button -> `title`, Esc -> `title`, 0 page errors (`a1.log`); `tools/modes.mjs --only=nav,camera,daily` PASSED; `Router.back` now guards re-entry (`src/app/router.js:41`) |
| M1 | Tutorial card not clickable | **FIXED** | `elementFromPoint` on NEXT returns the button, `pointer-events:auto`; NEXT -> step 2, tick "Do not show this again" + GOT IT/DISMISS closes it, `seenHints.placementTutorial=true`, second placement shows no card, `?` button reopens it (`a8.log`) [a_hint_step2.jpg] |
| M2 | No deployment zone, camera hides it | **FIXED** | blue dotted zone with flag posts and a red enemy zone on every placement, whole board framed; hover on zone centre + click placed 1 unit (0 -> 1) [a_placement_nohint.jpg, b_m2_placement.jpg]. Small blemish: on Nile the left panel clips the zone corner [m4_placement.jpg] |
| M3 | Tweak -> Back ping-pong | **FIXED** | results `T` -> placement; Esc -> Quick (not the battle HUD); title behind has a live diorama (`state diorama`, tick advancing) (`a2.log`, `modes.log`). First Esc after Tweak is swallowed by the re-shown tutorial card (by design) |
| M4 | Battle framing weak / not re-fitted | **FIXED** | 37-unit skirmish: at FIGHT the armies fill 32% of the width, auto-frame pulls in to 50-61% x 48-53% of the screen with **0 units off-screen**, dist 65 -> 52.7 as lines meet, stops fighting the player after a wheel (d 64.4 -> 64.4 over 6 s) [a2b_cam_t0.jpg, a2b_cam_late.jpg]. Phone (untouched camera): 94 units inside 390 px, rotating to landscape and back keeps them on screen (`a4.log`). If the player already zoomed, a resize does not re-fit (9 units off-screen) - acceptable |
| M5 | No mute in battle HUD | **FIXED desktop / PARTIAL phone** | `#hud-mute` present, hit-testable, toggles `settings.muted` both ways (`a2.log`). It is 35x32 px, and the phone HUD hides it on purpose (`a4.log`: not rendered) -> R2-m4 |
| M6 | Triangle load | **UNVERIFIABLE (no GPU)** | Marble: 1.06 M / 1.30 M / 2.04 M tris at 151 / 299 / 584 units, 123 / 132 / 132 draw calls (terrain 0.25 M of it); above the PF2 reference 1.2 M@500. Real cost needs a mid laptop |
| 1 | Quick Fight label vs arena | FIXED | label now "Random arena (not the one shown), balanced armies, straight to the fight." [a3_quick_3s.jpg] |
| 2 | Scout strip huge, "one kind of unit" | FIXED | strip 574x74 (was 574x206), clicks on it do not place (20 -> 20); text "Place a few more soldiers (three or more) and the scouts will report." |
| 3 | Countdown digit nearly invisible | **STILL OPEN** | digit renders pale/ghosted on grass in both captures [a6_countdown_5.jpg]; keyframes end at opacity .15 with `fill:'forwards'` (`src/ui/screens/countdown.js:~33`) -> R2-m1 |
| 4 | FIGHT while paused freezes | FIXED | paused flag set, click FIGHT: `paused` -> false, countdown 2.9 -> 2.47 (`src/app/game.js:435`) |
| 5 | Lessons mis-slotted (archers, "a quarter") | FIXED | read 10 results cards (loss, win, duel, mission, puzzle, survival, daily): no archers/fractions named that do not exist; 1v1 now says "The Scout report said what they brought. I read it. It was short." (but see R2-m10) |
| 6 | Campaign enemy budget "4,420 / 3,000" red | FIXED | campaign placement shows only the player's bar [m4_placement.jpg, b_m2_placement.jpg] |
| 7 | Photo toast over SNAPSHOT | FIXED (photo) | `--toast-bottom:7rem` in photo mode (`src/ui/hud/photo.js:78`); outside photo a toast still covers the god-power bar -> R2-m7 |
| 8 | Diagnostics "Muted: PROBLEM", 5,166 ms frame | FIXED | "Muted NO", frame time 33.4 ms next to 39 FPS [a3_diagnostics.jpg] |
| 9 | Tap targets < 44 px | **PARTIAL** | scanner over 16 screens: Quick, Campaign, Settings, Credits, Codex 0 offenders (was 7+); **Workshop 10** (slot chips, search, right tabs 38 px), **Painter 41** (part list 210x38) -> R2-m3 |
| 10 | Contrast (slider ticks 1.64, Daily 3.35) | FIXED | tick labels now white on the dark panel [a5_settings_graphics.jpg]; scanner: 0 low-contrast nodes on Daily/Quick/Settings. Tiny text remains (9.9-10.9 px in Workshop/Settings/Codex clip tabs) |
| 11 | Phone objective "Defeat the ene..." | FIXED | chip 159 px, `scrollWidth == clientWidth`, reads "Defeat the enemy army" / "Hold the hill" on 390x844 [a4_battle_phone_a.jpg, a4_m2_battle_phone.jpg] |
| 12 | First Tab lands on `body` | **STILL OPEN** | Quick: first Tab -> `BODY`, second -> `qb-back` (`a5.log`); `tests/ui/ui4_keyboard.test.mjs` is **red** on exactly this ("first Tab on quick lands on a control inside the page") -> R2-m2 |
| 13 | Arena thumbnails blank 2-3 s | PARTIAL | under SwiftShader 8/17 thumbs after 9.8 s, 16/17 after 18 s; first five visible at 3.5 s; hero thumbnail is blurry (192 px upscaled). Real GPU unmeasurable |
| 14 | Codex crops Minotaur | FIXED | horns and body inside the stage in idle and attack [a5_codex_minotaur.jpg] |
| 15 | Workshop Hoplite spear across face | FIXED | spear upright beside the body in the turntable [c_pt2_back_workshop.jpg] |
| 16 | Styx dark / Alpine horses / Persepolis / Arena Lab / Cyclops | **PARTIAL** | Styx still near black with pure-black voids at close range [look_styx_close.jpg]; Alpine/Teutoburg/Giza/Troy/Colosseum read fine; **Persepolis, Cyclops, Arena Lab not re-rendered (UNVERIFIED)** |
| 17 | Title diorama half hidden | PARTIAL | red army, rider, trees and tip now sit right of the menu, but the blue army is still behind the menu column, so the clash never shows whole [a5_title_1280.jpg] |
| 18 | Music choice | UNVERIFIABLE | state read: title `menu_heroic_age`; placement mood `editor`; battle `battle_high_clenched_teeth` at intensity 0.18 -> 0.79 after 20 s (`a7.log`). Ears needed |
| 19 | Repeated asset fetches (1,101 req) | FIXED | 350 requests / 350 unique visiting 16 screens; 3 battles + 3 results: 357 requests, 353 unique (4 re-fetched music files) |
| 20 | B10 artifact 3.27 MB | FIXED | 3,309,817 B <= 5 MB (verification.md B10 was relaxed to 5 MB); 382 audio files, 10.98 MB, 0 missing -> needs 2 publish calls (<= 255 each) |
| 21 | `campaign/puzzles.test` red | FIXED | puzzles 8/8; `feasibility` was red at 14:57 (in-flight edit), green 5/5 after commit 15f50c0 |
| 22 | Fast `goto` stacks modal; `--no-assets` 404s | FIXED / unchanged | arena builder -> workshop within 0.2 s: no stacked dialog (`a5.log`); `smoke --no-assets` still exits FAILED on 55 console 404s (expected with a deliberately empty asset host; the game boots and fights) |

## 2. B. Game modes through real clicks

| flow | verdict | evidence |
|---|---|---|
| Quick Battle | PASS | title -> QUICK BATTLE -> SKIRMISH chip -> PLACE ARMIES -> hint -> auto-fill both -> FIGHT -> countdown -> battle -> results (DEFEAT "Your army has been politely removed", MVP, 3 lessons) -> T Tweak -> placement. `tools/flow.mjs` PASSED incl. rematch |
| Campaign map, locked mission | PASS | locked pin click -> toast "Locked. Win "Marathon (Sort Of)" first. One star is plenty." |
| Mission 1 | PASS | briefing (Brutus/Plato/Cassandra + stars + par) -> DEPLOY -> placement (no Suggested button on m1, enemy locked: 24 -> 24) -> placed 21 hoplites + 9 archers by clicks -> fight -> VICTORY, 1 star, rewards "NEW TITLE: MARATHONER", codex unlocks, **NEXT MISSION button** [b_m1_results.jpg] |
| Unlock mission 2 | PASS | NEXT MISSION opens mission 2 briefing; progress `{marathon_sort_of:1, thermopylae_snack:3}` after clearing m2 |
| Mission 2 (hold the hill) | PASS | Suggested army button works; **hill is visible in 3D** (yellow ring + white beam at the pass) and the HUD says "Hold the hill 0% [HILL]" (+ rules in briefing: clock stops while an enemy stands on it) [b_m2_battle_framed.jpg]; cleared with 3 stars |
| Mission 4 (goat across the Nile) | PASS with notes | old data (38 enemies). Exit flag column + VIP-start obelisk are visible, HUD chip "Protect the VIP [VIP START] [EXIT] 0%", Cassandra: "The goat must cross the Nile." But the goat itself is lost inside the army blob and the HUD never says "goat" -> R2-m11 [m4_battle_default_cam.jpg] |
| Mission 9 Suggested army | PASS | 59 units / 14,666 of 15,000 dr, FIGHT enabled (enemy arrives by script) |
| `tools/modes.mjs` (campaign, suggest, missions, puzzle, survival, daily, nav, camera) | PASS | "MODES PASSED" twice; all 9 missions and 6 puzzles deploy, accept an army and run 20 s of sim (e.g. cyclops_meet 111 enemies vs 65, zeus_bad_day survive_waves, knock_knock `destroy`); on the stale 14:18 data |
| Puzzles | PASS | CAMPAIGN -> PUZZLES (6, 0/18 stars) -> pick -> PLAY -> briefing -> deploy: roster limited to 3 cards, search "elephant" -> "No soldier matches", budget bar with PAR 800 tick and "Spend this much or less", RESET clears (no confirm), won with 2 stars saved `{gaze_avoidance:{stars:2,spent:765}}` [b2_puzzle_placed.jpg] |
| Survival | PASS | setup (arena, faction, difficulty, mutators, local top 5) -> placement (6,000 dr) -> wave 1 -> **intermission overlay** "WAVE 1: THE WELCOME COMMITTEE, Next up..., +1,840 DR, reinforcement palette, ONE/LINE/BLOCK, UNDO, SEND IN WAVE 2 [Space]" -> placed reinforcements by click -> wave 2 -> intermission 2 -> game over: score, NEW PERSONAL BEST, local top 5 [b3_intermission.jpg, b2_survival_over.jpg]. Inconsistency R2-m6 |
| Daily | PASS | same enemy twice (9 chickens, 11 centaur archers, 1 Trojan horse on Styx), locked enemy; result string "VOXELWARS Daily 2026-10-06 \| The River Styx \| Carthaginians vs Mythic \| WIN in 1:06 \| 13% of the army left \| seed 20261006"; COPY RESULT with clipboard denied opens a "YOUR DAILY RESULT" dialog with the text selected (Ctrl+C hint) [b3_daily_copy_denied.jpg]. Clipboard-granted path UNVERIFIED (headless refused `grantPermissions`) |

## 3. C. Editors (hostile tester)

| item | verdict | evidence |
|---|---|---|
| Arena Builder: sculpt, paint, props, zones | PASS | real mouse strokes with raise/smooth/flatten/noise/water/paint; 6 prop clicks -> "Props 6 / 1,500, Prop types 1/41"; zone drag + numeric fields; undo enabled, dirty dot [c_ab_after_props.jpg] |
| Checks panel + Fix | PASS / minor | zone W/D = 1 and X = 9999 -> clamped to 48, "3 problems" with 3 Fix buttons (FIT IT INSIDE, LEVEL IT, CARVE A RAMP); PLAYTEST soft-disables while problems exist; FIT works, LEVEL IT cannot rescue a 2x2 zone (4 cells, needs 30) -> R2-m12 [c6_checks_error2.jpg] |
| Playtest and back | PASS | PLAYTEST -> placement with "Back to the Arena Builder" chip -> back: name, edits intact [c_ab_playtest_placement.jpg] |
| Save, share, import | PASS | save modal -> "Saved "QA Thunderdome"" + achievement toast; share dialog 1,686 chars (SIZE S), COPY/DOWNLOAD/SELECT; import of own code "Looks good" and loads |
| Hostile import | PASS | 10 inputs (empty, text, `{}`, `null`, bogus code, `<img onerror>`, 200 KB, `__proto__`, binary, 5,000-deep) each rejected with a human sentence; `window.__pwn` unset, `({}).polluted` undefined. `tests/editors/arena/share.fuzz` OK (1000 arenas, 100 bit flips rejected, 0 over 38,000 chars), `soldier/share_fuzz` (792 clamped / 708 rejected) OK |
| Saved arena under "My arenas" in Quick | **PASS but see R2-M1** | separator "MY ARENAS" + thumbnail + "Built by you in the Arena Builder." [c4_quick_my_arena_selected.jpg]; selecting it throws (R2-M1) |
| Soldier Workshop | PASS | 8 part categories (55+22+12+13+9+14+56+24 parts) each switch the turntable and the live cost (133 -> 127 dr); stat sliders capped (all-max stops at 100/100 points, DOM write of 9999 ignored); 2 abilities max enforced "2 OF 2 CHOSEN"; palette; name `<img onerror>` + 80 chars -> 40 chars of inert text; 25x RANDOMISE and 10x MUTATE/UNDO: no error |
| Use in battle | PASS | SAVE -> USE IN BATTLE -> placement with 8 of the soldier vs a matched army; fought (1 kill, 6/6 alive at tick 740); the unit def carries the soldier's name "Gregor the Unreasonable"; whether the announcer says it was not observed |
| Save to roster -> Quick palette | PASS | "MY SOLDIERS" tab appears after the 7 factions with the card "SIR PALETTE TEST 133 MELEE BEATS CAVALRY"; placed by click; survives a page reload |
| Voxel Painter | PASS | 3D/slice views, ten tools, paint tool swept over 4 layers -> "120 / 1,500 painted", undo/redo x20 stable; DONE -> Workshop shows the **magenta chest** on the turntable and in the placement close-up [c_pt2_back_workshop.jpg, c_pt2_placement_closeup.jpg] |
| Fuzz / budget | PASS | `soldier/u8_fuzz`: 5,000 soldiers, worst 1.211x (< 1.35x), 42 sim battles OK |

## 4. D. Visual and animation quality (picky art director)

Rendered with `tools/look.mjs` at battle and close cameras: Colosseum, Troy, Styx, Giza, Alpine, Teutoburg; plus my own bursts in the real build: infantry mass clash, 1v1 hoplite/legionary, cavalry charge, 1v1 cavalry, elephant, catapult+archers, minotaur+chickens, and a lineup of all 43 units for both teams [look_*.jpg, d_*.jpg, d3_*.jpg, d2_factions_A/B.jpg].

What works: palette and prop language consistent; **all 7 factions render with correct team colours** (A blue, B red) and read apart by silhouette (hoplite crest, legionary scutum, mummy wrappings, immortal, elephant with howdah crew, berserker horns, goat/chicken tiny but legible); poses: strike, shield-block ("BLOCKED!"), crit text, knockback, death-then-debris all play; elephant trunk swing and trample are convincing; telegraph rings are visible (blue dotted circle, red cone/line, green heal ring via `look.mjs --tele=1`, though the red cone is faint on sand [look_tele_colosseum_battle.jpg]) and hit cubes show in every battle shot; mounted riders stay on the saddle; no T-pose, no floating weapon, no z-fighting, no units sunk into terrain in ~60 captured frames.

Concrete defects:
1. **Hit flash turns white horses and the elephant into white ghosts** for the whole flash (voxskin flash mix .8, `src/render/voxskin.js:86`); Companion Cavalry on grass/snow vanishes mid-charge [d3_duel_cav.jpg rows 3-4, d_cavalry.jpg] -> R2-m8.
2. Styx: ground is almost black with black voids; red troops on dark floor are readable only by the lava glow [look_styx_close.jpg] -> R2-m9.
3. Foliage occludes the fight when the camera is low (my manual 0.3 pitch inside trees); default pitch is fine. Not filed.
4. Arena Builder terrain shows black contour-hatch lines around a raise/noise stroke at overview [c_ab_after_props.jpg]; cosmetic.
5. Mission HUD uses "Protect the VIP" while the briefing says goat (R2-m11).
UNVERIFIED art: Persepolis checker floor, Cyclops slab, Arena Lab far-LOD horse (not rendered), crowd reactions, Troy wall collapse (not triggered), siege recoil.

## 5. E. Humor and copy in context

Played 3 battles (Romans v Carthaginians in the Colosseum, Mythic v Barbarians at Troy, a 1v1 duel at the Oasis), plus 2 campaign missions, a puzzle, survival, daily; read announcer bubbles, speech bubbles, kill feed, toasts, briefings, results, pause, tips, codex.
**Three funniest:** (1) mission 1 blurb "The original marathon, with fewer marathons."; (2) Brutus on the Trojan horse: "THE HORSE HAS OPENED! Six hoplites! And I am told a small gift shop!"; (3) a hoplite's bubble "Come closer. The spear is longer than your plans." (runner-ups: "BAAAH! (Not a threat. A review.)", the results stat "Kills credited to a hen 5 / The goat did this 7 / Soldiers turned to art 13", Plato's duel defeat "One lost to one. No flank, no formation, no excuse. Is that clarifying?").
**Misfires / fall flat** (all MINOR, R2-m10): the idle announcer line "Brutus is warming up his voice. It is already too loud." is the first thing seen in every one of ~12 battles (funny once); only 4 pause sub-lines ("Pause: the only time anyone has a good idea." etc.); in the 1v1 duel lessons 1 and 3 carry the same fix sentence "Check the Scout report before you place..."; kill-feed "Ballista gifted a javelin to Berserker" (a ballista fires bolts); Survival says "Fell at Wave 2" and "WAVES SURVIVED 1" while the board row says waves 0 (R2-m6); the 1-second case of "{secs} seconds" would read "1 seconds" (first_blood template, `announcer.js:146`; only possible when first blood is within 1.5 s). No repeated line inside a battle, no stereotype, and no tip in `humor/tips.js` (55, skimmed, not simulated) contradicted anything I saw. Announcer frequency (8-15 lines per battle, S23) UNVERIFIED: my harness stepped the sim off-frame, which starves the frame-driven announcer.

## 6. F. Performance proxies (software GL, shared machine)

| units (total) | draw calls | triangles | tick ms (browser) | BattleView.update ms | JS heap |
|---|---|---|---|---|---|
| 151 | 123 | 1.06 M | 1.47 | 1.3 | 108 MB |
| 299 | 132 | 1.30 M | 2.53 | 5.1 | 176 MB |
| 584 | 132 | 2.04 M | 4.06 | 9.6 | 177 MB |

(`tools/perf.mjs`, Marble, quiet moment; with the other agent's jobs running, 237 units gave tick 2.42 + update 10.0 ms.) Frame CPU (tick + update) at 300 units is about 7.6 ms (<= 12, PF1) but excludes upload/HUD; `tools/simperf.mjs` in Node measured 2.7-3.7 / 4.3-6.2 / 6-7.6 ms per tick at 162 / 297 / 527 units **while 4 balance jobs ran** (S3 target 1.2 / 2 / 3 ms): FAIL as measured, UNVERIFIABLE as a verdict.
Memory: 6 different arenas: geometries 70 -> 125, textures 21, programs 17; 6 more battles on one arena: geometries 125, textures 21 (no leak), heap 193 -> 216 MB (+12%, GC noise). **15-minute mixed session (151 loops: ~50 battles, every screen, editors, codex, quality switching): 0 console errors/warnings/CSP violations**; JS heap climbed 284 -> 399 MB, geometries 178 -> 291, textures flat at 33, programs 27 - cached per-arena/per-editor geometry, still rising when I stopped: watch it on a low-RAM device (R2-m14).
Cannot be judged here: real frame rate, GPU time, thermal, mobile memory, audio CPU.

## 7. G. Hosted-page conditions

| check | verdict | evidence |
|---|---|---|
| `smoke --page=dist/artifact/index.html` | PASS | "SMOKE PASSED (0 console lines, 0 errors/warnings)", 41-44 units, 115 draws |
| standalone `smoke` | PASS | same, 119 draws |
| `smoke --block-cdn` (fragment) | PASS | all 3 CDNs aborted -> fatal panel "The legion tripped over a cable ... failed to load from every CDN" |
| `--disable-webgl --disable-webgl2` | PASS | fatal panel "The legion tripped over a cable. WebGL2 is not available. VOXELWARS needs a browser with WebGL2 ... hardware acceleration enabled." + Copy diagnostics, Safe mode (low graphics), Reload |
| No request outside allowed hosts | PASS | hosts seen: `vw.test` (assets), `fonts.googleapis.com`, `cdnjs.cloudflare.com` (three fallback chain never needed beyond cdnjs); fragment text mentions only cdnjs, jsdelivr, unpkg, fonts.googleapis/gstatic; no `alert/confirm/prompt/eval/innerHTML=` in `src` |
| Fragment form | PASS | starts `<title>VOXELWARS</title>`, 0 doctype/html/head/body tags |
| Downloads standalone (`window.claude` absent) | PASS | anchor download fires: `Untitled_Arena.vwarena`, `...vwsoldier`, `voxelwars-save-2026-10-06.json` ("Export ready.") |
| Downloads hosted stub (`claude.use('downloads').save`) | PASS | `save({filename,data})` called with `Untitled_Arena.vwarena.txt` (353 chars), `*.vwsoldier.txt`, `voxelwars-save-2026-10-06.json`; no anchor download |
| Downloads declined / throws | FAIL (minor) | declined (`code:'declined'`): arena says "Downloaded Untitled_Arena.vwarena", soldier says "Saved ... .vwsoldier." although nothing was saved; arena shows the raw exception text ("boom"); toasts show the name without the `.txt` that was really saved (`src/editors/arena/dialogs.js:118`, `src/editors/soldier/dialogs.js:~23`) -> R2-m5. Soldier throw path is good: "Downloads are not available here, so the code is shown to copy..." |

## 8. Remaining issues, ranked (exact repro; file/line where the cause is visible)

**MAJOR**
- **R2-M1 Selecting a saved arena in Quick Battle throws and leaves a stale objective.** Repro: build/save any arena (Arena Builder -> SAVE) -> Quick Battle -> click the thumbnail under "MY ARENAS": console `TypeError: Cannot read properties of undefined (reading 'b')` at `src/ui/kit.js:486` (`btns.find((x) => !x.b.disabled).b.tabIndex = 0` when every segment is disabled), called from `src/ui/screens/quick.js:103` `sizeSeg.set(...)` right after `quick.js:116` disables all size buttons for `a.mine`. The throw aborts `setArena` before `loadObjectives(true)`. Visible consequence: ADVANCED -> pick THE HOT GATES -> objective "Hold the hill" -> pick the saved arena -> objective stays Hold the hill; PLACE ARMIES -> battle HUD "Hold the hill 0%" on an arena with no hill marker (unwinnable; ends on the time limit) (`c7.log`). Same root cause: footer reads "Hot Gates Copy · · Battle 8,000" (empty size slot) and "Recommended budget 8,000" is the same for every saved arena because `item.size` is 192 (cells, `src/editors/arena/library.js:36`) while `quick.js:16-17` keys on small/medium/large. Fix: guard the `find`, map cells -> size class in `arenaFromItem`.
- **R2-M2 `dist/` is older than HEAD's campaign retune** (see release note). Rebuild (`node tools/build.mjs`) and re-run smoke before publishing; until then the shipped missions 3/4/6/9 differ from `docs/campaign_report.md` and the green `feasibility` record.

**MINOR**
- R2-m1 Countdown digit is a pale ghost on bright grass (`src/ui/screens/countdown.js:~33` ends at opacity .15, fill forwards) [a6_countdown_5.jpg].
- R2-m2 First Tab on Quick lands on `body` (`tests/ui/ui4_keyboard.test.mjs` red).
- R2-m3 Workshop (10) and Painter (41) controls are 38 px high; labels 9.9-10.9 px (Workshop category captions, Codex clip tabs, Settings sub-labels); HUD mute 35x32.
- R2-m4 Phone battle HUD hides the mute button (AU9 "visible mute state on every screen").
- R2-m5 Download decline/failure toasts (section 7).
- R2-m6 Survival results contradict themselves ("WAVES SURVIVED 1" at `src/ui/screens/survival.js:39` = wave-1; board row `waves: cleared` = 0 at `src/app/meta.js:579`), board shows the raw arena id "marathon".
- R2-m7 Bottom toasts ("Following a volunteer...") cover god powers 1-5 outside photo mode [a6_photo_follow_toast.jpg].
- R2-m8 Hit flash ghosts white horses/elephant (section 4).
- R2-m9 Styx near black (unchanged); Persepolis/Cyclops/Arena Lab unverified.
- R2-m10 Copy: same idle opener in every battle, 4 pause lines, duplicate fix text in one results card, "gifted a javelin" for a ballista.
- R2-m11 Protect-VIP HUD never says "goat", goat hidden in the blob, Nile zone clipped by the left panel [m4_placement.jpg].
- R2-m12 Zone Fix "LEVEL IT" cannot repair a tiny zone; no minimum zone size at draw time.
- R2-m13 Thumbnails 10-18 s under software GL; blurry hero thumbnail (real GPU unverified).
- R2-m14 JS heap and geometry cache keep rising over 15 min (284 -> 399 MB).
- R2-m15 `--no-assets`: 55 console 404s (offline-embedded fallback is otherwise fine).
- R2-m16 Title diorama: blue army still behind the menu.

## 9. Evidence table (criterion ids touched)

| id | verdict | evidence |
|---|---|---|
| B1, B2, B9 | PASS | fragment head/tags; hosts; grep; 10 hostile imports + `<img onerror>` names inert |
| B3 | PASS | smoke standalone + fragment: 0 console lines; 15-min session 0 errors |
| B4 | PASS (software GL) | Diagnostics "Time to title screen 2,508 ms" |
| B5 | PASS | `smoke --block-cdn` fatal panel |
| B6 | PASS | WebGL disabled -> named fatal panel with Safe mode button |
| B8 | PARTIAL | live getters work (`state` diorama -> placement -> running) |
| B10 | PASS | 3.31 MB; 382 files, 10.98 MB |
| R2 | PASS | 123-132 draw calls at 151-584 units |
| R9 | PARTIAL | 12 battles stable geo/tex; heap +12%; 20 battles not run; mixed session +40% heap |
| R11, PF2 | PARTIAL | tiers not re-measured; 1.06-2.04 M tris vs 1.2 M@500 reference (FAIL above ~300 units, GPU unknown) |
| PF1 | PASS (CPU proxy) | tick + update 7.6 ms at 299 units |
| S1, S2, S10, S16, S17, S20, W1, A1, A2, A4, A7, AU1, AU2, AU3 | PASS | 91 of 93 non-slow `tests/**/*.test.mjs` pass (`tests.log`); the 2 reds: `campaign/feasibility` (stale record at 14:57, green after 15f50c0) and `ui/ui4_keyboard` (R2-m2) |
| S3 | UNVERIFIABLE | contended machine (section 6) |
| AU4 | PARTIAL | `--no-assets`: boots and fights, 55 console 404s |
| AU9 | PARTIAL | desktop yes, phone no |
| W6 | PASS | `campaign.test` 12/12, `missions.sim` 13/13, `puzzles` 8/8, `feasibility` 5/5 on HEAD |
| W7 | PASS | survival intermission, reinforcements, SEND IN WAVE, game over, leaderboard persisted |
| UI1 | PASS | `tools/tour.mjs` 1280x720 PASSED, 960x540 PASSED, 390x844: only arena_builder/workshop/painter "missing" = the designed phone notice |
| UI2 | PASS | overflow scan 390x844: 0 horizontal overflow except decorative clouds and one 4 px node on results |
| UI3 | PARTIAL | section 1 #9/#10 |
| UI4 | PARTIAL | R2-m2 |
| UI5 | PASS | Quick Fight = 2 clicks; tutorial dismissible permanently |
| UI6 | PASS | HUD verified 1280 and 390 |
| UI7 | PARTIAL | R rematch, pause, hover, Tweak, Reset, undo; save-army not exercised |
| UI10 | PASS | phone: editors notice; Quick, Campaign, Survival, Codex, battle playable by touch |
| UI15 | PASS | Diagnostics correct |
| UI16 | PASS | 3 lessons on every results card |
| UI18 | PASS | mission 1 "SKIP TUTORIAL" visible in HUD |
| UI19 | PASS | daily deterministic + copyable string; 6 puzzles load/complete |
| E1-E3, E5, E6 | PASS | section 3 (E2 minor R2-m12) |
| E7, E8, U8 | PASS | fuzz tests OK |
| E10, P4 | PASS | file/anchor/hosted paths; settings export |
| P1 | PASS | soldier survives reload; seenHints saved |
| Q1 | UNVERIFIABLE | did not run `gate.mjs` (rule); lint exit 0, `contracts.mjs` "contracts OK (43 units, 16 arena presets)" |
| Q5 | PASS | grep: only HTML `placeholder` attributes and `toDoc` |
| A3, A5, A6, A8-A10, R3-R8, R10, R12-R16, S4-S9, S11-S15, S18, S19, S21-S27, AU5-AU8, AU10-AU12, U1-U7, U9, H1-H8, UI8, UI9, UI11-UI14, UI17, X1-X4, B7, B11 | NOT RE-RUN | covered by unit tests that pass or out of scope this round (see unverified) |

## 10. What the user would say after 30 minutes (H)

**Best 3:** (1) "It finally plays like a game: the blue zone, the tutorial, the camera that follows the fight and a campaign that tells me why I lost." (2) "I made my own soldier, painted a pink chest on him and he fought for me, and my own arena shows up next to the Colosseum." (3) "It is actually funny in context: the briefings, Cassandra's post-mortem, the kill feed verbs, the goat."
**Worst 3:** (1) "I picked my own arena in Quick Battle and it threw an error and kept the old objective" (R2-M1). (2) "The cavalry vanish when they get hit, Styx is a black cave, and the 3-2-1 is a ghost." (3) "On my phone I cannot mute in a fight, and the Workshop/Painter buttons are small; the first Tab does nothing."
**Next they would ask for:** a one-click "Auto-fill my side" prominent on placement (it exists, hidden in the tools column), a replay/kill-cam highlight reel to share, 1,000-unit battles with a clear perf indicator, more than 8 music tracks and per-faction themes, and "Medieval era, please".

## 11. UNVERIFIED (be explicit)

Audio of any kind (heard nothing; music choices, ducking, loudness, TTS); frame rate, GPU time, thermals, real-GPU thumbnail latency; clipboard-granted copy path; rendering of Persepolis, Cyclops, Arena Lab, Olympus, Oasis, Nile at close range, Troy wall collapse, crowd reactions, weather and time-of-day variants; announcer cadence at real frame rates (S23, H2, H8); win-rate/balance criteria (S5-S8, S11, S12, S14, S21-S23, U5, U6, 20-battle R9); full `gate.mjs` (not allowed); touch pinch/drag and Take Command joystick; per-quality-tier measurements (R11); screen readers; high-contrast and colour-blind palettes; missions 3, 5-9 played by hand (only deployed and stepped by `modes.mjs`); everything about missions 3/4/6/9 is on the pre-retune data.

## 12. Files

Report `docs/qa_round2.md`. Screenshots in `docs/qa2/` (curated): placement/zone `a_hint_step2`, `a_placement_nohint`; framing `a2b_cam_t0`, `a2b_cam_late`; phone `a4_*`; countdown `a6_countdown_5`; diagnostics `a3_diagnostics`; campaign `b_m1_results`, `b_m2_placement`, `b_m2_battle_framed`, `m4_*`; modes `b2_puzzle_placed`, `b3_intermission`, `b2_survival_over`, `b3_daily_copy_denied`; editors `c_ab_after_props`, `c6_checks_error2`, `c4_quick_my_arena_selected`, `c_pt2_*`; art `look_*`, `d_cavalry`, `d_elephant`, `d3_duel_*`, `d2_factions_A/B`.
