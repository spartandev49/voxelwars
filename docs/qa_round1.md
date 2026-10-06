# QA round 1 (independent reviewer, read-only)

Reviewer: QA. Date: 2026-10-06 (build 1.0.0, working tree of branch `claude/cool-babbage-g7oakv`, other agents still editing).
Everything below was observed in headless Chromium (SwiftShader software WebGL, machine load average 40-60 the whole session): **no fps judgement is made, nothing was heard**. All page loads used the Artifact CSP header, the real `dist/` page and `assets/` served as published files.

**Builds tested.** `dist1` = `dist/voxelwars.html` as of 05:24 (the novice playtest and the 16-arena look pass ran on it) and `dist3` = the 06:41 build (everything marked "dist3"). The tree moved a lot between them (campaign wiring `src/app/modes.js`, 32-cell terrain chunks, perf work). Findings I could not re-confirm on dist3 are marked **(dist1)**. One finding I first logged ("campaign enemy army is never placed", `run=false`) was a stale-build artefact and is **withdrawn**: on dist3 the 29-unit Persian army is placed and the star tracker runs.

Screenshots are in `docs/qa/` (names in brackets below). Scratch scripts and raw notes are not committed.

## 0. Summary

| severity | count |
|---|---|
| BLOCKING | 1 |
| MAJOR | 6 |
| MINOR | 22 |

The game is, honestly, impressive: title, Quick Battle setup, 16 arenas, results screen, pause menu, codex, campaign briefing, three editors and the audio library are all real and look like a studio shipped them. The first 90 seconds of a *novice* are where it leaks (placement), plus two dead BACK buttons that throw a stack overflow.

Verification: 63 criterion ids checked from outside: 35 PASS, 13 PARTIAL, 3 FAIL (B10, UI1, UI3), 12 UNVERIFIABLE here (section 4).

## 1. Persona A "Novice" (never saw the game)

Path (real UI only; splash key, Quick Battle, SKIRMISH chip, PLACE ARMIES, hand placement, FIGHT, 2 battles, results, Tweak, Rematch, Codex, Settings, rebind, Controls). Build: dist1 unless marked.

| step | what happened | verdict |
|---|---|---|
| Splash, any key | Logo, "PRESS ANY KEY TO ENTER THE ARENA", music starts, AudioContext `running` | great |
| Title | Logo legible, live diorama, tablets aligned, tip, version tag, "ROADMAP: MEDIEVAL ERA. NOT IN THIS BUILD." [menus_1280_960.png] | great. At 1280x720 the menu column hides about half of the diorama; the fight is tiny and far away |
| Quick Battle | Arena carousel, army chips, budget chips, difficulty, big gold QUICK FIGHT and PLACE ARMIES. SIMPLE/ADVANCED toggle gives weather, time, seed, size, friendly fire, morale, formation, mutators... [quick_advanced.png] | great. Arena thumbnails are blank grey for the first 2-3 s (lazy queue) |
| QUICK FIGHT label | Says "Random arena, balanced armies" while the footer says "Marathon Plain...". It does pick a random arena (it went to Carthage) | confusing, MINOR |
| PLACE ARMIES | **A "Quick tour" card (Step 1 of 3) opens in the middle. Its NEXT, DISMISS and "Do not show this again" cannot be clicked** (mouse or touch). Only Esc dismisses it, and it comes back on every new placement | **MAJOR M1** |
| Finding the deployment zone | There is no zone overlay in the 3D view (dist3 campaign placement shows none either). The default camera puts my zone behind the Soldiers panel. My first 7 hover attempts all said "Outside the blue deployment zone"; I only found the valid sliver by projecting world coordinates. A novice would quit here | **MAJOR M2** |
| Placing | SINGLE/LINE/BLOCK work, ghost goes green/red, budget bars update, Spartan block of 9 placed. [novice_placement_hint.png] | good once you find the zone |
| Scout report | After the first soldier the Scout strip grows to 574x206 px, sits over the middle of the field, eats clicks, and says "mostly one kind of unit" after one soldier [novice_scout_strip.png] **(dist1)** | MINOR |
| Orders ADVANCE/HOLD | Buttons work (brush order changes) but nothing visibly says what they did | MINOR |
| FIGHT | Countdown (digit "3" is pale yellow on bright green, almost invisible [novice_countdown_3_faint.png] **(dist1)**), then a nice HUD: army meter, timer, objective, announcer ("Brutus is warming up his voice. It is already too loud."), minimap, god powers 1-6, orders bar, speed buttons | good |
| Selecting a soldier | Click shows a card (HOPLITE, hp, kills, flavour text) and a ring | great |
| Pause (Space / Esc) | "PAUSED: Pause: the only time anyone has a good idea." with Resume, Again, Controls, All settings, Quit, and quick settings (quality, volume, subtitles, reduce motion) [novice_pause_menu.png] | great |
| FIGHT pressed while paused | Countdown stays frozen at 3 with no hint why (pressed Space in placement earlier, so paused) | MINOR |
| Results | "VICTORY!" laurel, confetti, Battle report, MVP with last words, "Cassandra: she said so. Several times." post-mortem, AGAIN BUT SMARTER (R), TWEAK ARMY (T), MENU (Esc) [novice_results_victory.png] | excellent |
| Results copy | Lesson 3 said "The archers carried it: 0% of the damage" with no archers on my side. In a 1 vs 1 duel it said "only a quarter of us stood" and "bring fewer lonely archers" [results_defeat_1v1.png] | MINOR (slot filling) |
| Rematch (R) | Restarts correctly | ok |
| Tweak army then Esc (dist3) | Esc goes to a *battle HUD* screen while `game.state` is still `placement`; Esc again goes back to placement. The BACK button then lands on the title, whose diorama is the frozen leftover placement world [title_after_tweak_back.png] | **MAJOR M3** |
| Codex | Faction tabs, search, cards with jokes, 3D turntable with clip picker, stats bars. All 7 factions and all 43 units reachable (7+7+8+5+4+5+7) [codex_hellenes.png, codex_carthaginians.png, codex_mythic.png] | great. Tall models are cropped by the turntable (Minotaur horns) |
| Settings | Quality presets apply instantly (Papyrus: cap 200 units), volume sliders and TEST buttons, accessibility, controls. Rebind "Pan back" to J: toast "Pan back is now J.", "(custom)" tag and DEFAULT button [novice_settings_rebind.png, settings_graphics.png] | great |
| Settings > Data | Export, Import, Paste, Reset progress with a confirm modal | ok |

Moments of confusion, in order: (1) tutorial card that does not react, (2) where do I put soldiers, (3) what "mostly one kind of unit" means after one soldier, (4) "Quick Fight" ignoring the arena I was looking at, (5) the Tweak/Back ping-pong, (6) no mute anywhere in the battle HUD (only inside Pause).

## 2. Persona B "Picky art director"

Method: all 16 presets x 4 cameras (battle, wide, close, top) at 1280x720 Marble, HUD hidden, 94 ticks in, 45 units. [arenas_battle_0..3.jpg, arenas_close_0.jpg, arenas_close_2.jpg, arenas_top_1.jpg, arenas_top_2.jpg]. Zero console problems during the 64 renders.

What works: palette and chunky voxel language are consistent; arena set-dressing is the best thing in the game (Colosseum crowd and gate, Thermopylae towers and sea, Troy walls with gate, Styx lava and bridges, Carthage harbour, Oasis, Giza, Nile ford). Team colours (blue vs red) read on every arena. Looked for and did **not** find: z-fighting, floating props, props inside terrain, units under terrain.

Defects, most visible first:
1. **Default battle camera framing** (`Game.frameArmies`): armies are small and sit at opposite corners, big empty ground between, blue half-cropped at the lower-left on most arenas; in an Epic 591-unit fight the red army is cropped bottom-right [epic_591_units.png]. A studio would frame the clash, not the bounding box.
2. **Styx** is almost black; red army dark on dark, close camera nearly unreadable [styx_close.png]. **Alpine**: white Companion Cavalry horses vanish on snow [alpine_battle.png]. **Persepolis/Olympus**: high-contrast checker floors fight with the units; Persepolis floor is blown out. **Arena Lab**: the far-LOD white horse reads as a flat white ghost.
3. **Cyclops cave** sits on a hard-edged flat grey slab that does not blend into the grass [cyclops_close.png].
4. Teutoburg: dense canopy partly hides a lone unit at the wide camera; acceptable, armies stay visible.
5. Menus at 1280x720, 960x540, 390x844: no horizontal scroll and no clipped text on any of the 16 screens (overflow scanner). Phone title and menus are excellent [phone_menus.png, phone_flow.png]. Editors show the friendly "Built for bigger screens" notice with BACK TO MENU and PLAY A QUICK BATTLE INSTEAD.
6. Phone battle HUD is well done, but after rotating/resizing mid-battle the camera is not re-fitted (units fill the whole phone screen) and the objective reads "Defeat the ene..." [phone_battle.png].
7. Photo mode: the toast "Following a volunteer..." overlaps the SNAPSHOT button [photo_mode_toast_overlap.png].
8. Campaign placement shows the enemy budget bar as "4,420 / 3,000" in alarm red (it is the mission's fixed enemy army, but it reads like an error) [campaign_placement_budget_B.png].
9. Workshop turntable: Hoplite idle has the spear crossing the face [workshop.png]; otherwise good (100+ parts, point-buy bars, live cost, funny names).
10. Thin or tiny text: slider tick labels (10.9 px, contrast 1.64:1) in Settings, QUICK FIGHT sub-line (about 8 px), faction names on Daily (CARTHAGINIANS 3.35:1).

Scale consistency between humanoids is fine (Hoplite vs Legionary vs Spartan read as one family); elephant, minotaur and horses are properly big; Sacred Chicken and goat are tiny but legible.

## 3. Persona C "Speed-runner / breaker"

| attack | result |
|---|---|
| 60 random key presses on every screen (and Esc x2) | **Daily Skirmish and Survival: Esc and the BACK button do nothing and throw `RangeError: Maximum call stack size exceeded`** (BLOCKING B1). Other screens survive |
| 0 units, FIGHT | FIGHT is soft-disabled, toast "Place at least one soldier on each side first." Good |
| 1 vs 1 | Plays and ends (966 ticks, result correct) |
| Max units (Epic, 591 units) | Starts in about 11 s in SwiftShader, no errors; 299/300 cap respected with a message "Marble caps each side at 300 units" |
| Quality switch mid-battle (potato/papyrus/marble/olympian, shadows off) | Applies immediately, no errors; draw calls dist1: 174/356/371/373 |
| Pause / 0.25x..4x / camera keys F T C P | All work; paused sim advances 0 ticks in 2 s; Esc leaves photo mode |
| Resize 1920x1080 -> 800x600 -> 390x844 -> 1280x720 mid-battle | Canvas, aspect and HUD follow; no scroll bars; camera not re-fitted on phone |
| Reload mid-battle | Back to splash, no error; settings (volume .42, quality) persisted |
| Garbage into Settings > Data > Paste text (13 inputs: empty, text, `null`, `[]`, `{}`, XSS names, `__proto__`, NaN/1e308, wrong version, bogus `VW1.` codes, 200 KB code, binary, 5,000-deep nesting) | Every one rejected with a human message ("not a VOXELWARS save", "forbidden key"...), `window.__pwn` never set, no prototype pollution, no console errors |
| Editors | Arena Builder (sculpt works, Playtest returns to placement with a "Back to the arena builder" pill [arena_builder_sculpt_playtest.png]), Workshop (parts, stats, "Unfinished business" resume modal [workshop.png]) and Voxel Painter (paint 4 voxels on Head [painter_real.png]) all exist and run; none unfinished. Phone: notice instead |
| Fast screen hopping (`goto('arena_builder')` then `goto('workshop')` within 1.5 s) | The arena "Start a new arena" modal (opened asynchronously) stacks over the workshop, once per hop (MINOR; hard to reach by hand) |
| First Tab press | Lands on `body`; afterwards a 3 px focus ring is visible on every element |
| Memory over repeated battles (dist3, same arena x6) | `renderer.info.memory.geometries` 193 -> 193, textures 25 -> 25, programs 32 -> 32, JS heap 222 -> 213 MB: **no leak**. Across 6 *different* arenas geometries grow 135 -> 187 (per-arena prop/terrain geometry cached, expected) |
| Determinism | The same setup replayed 6 times ended on the identical tick (1074) |

## 4. Verification pass (criteria checkable from outside, now)

Evidence key: `smoke` = `node tools/smoke.mjs` (CSP header, real page); `T:` = Node test I ran; `S:` = my Playwright script (scratch).

| id | verdict | evidence |
|---|---|---|
| B1 | PASS | `dist/artifact/index.html` starts `<title>VOXELWARS</title>`; `grep -c "<!doctype\|<html\|<head\|<body"` = 0 |
| B2 | PASS | external hosts in the fragment: fonts.googleapis/gstatic, cdnjs, jsdelivr, unpkg only; `node tools/lint.mjs --quiet` exit 0; no `alert/confirm/prompt/eval/innerHTML` in `src` (grep) |
| B3 | PASS | `smoke` standalone and artifact fragment: "SMOKE PASSED (0 console lines, 0 errors/warnings)"; my `S:` sessions saw 0 console problems except the findings below |
| B4 | UNVERIFIABLE | Diagnostics shows "Time to title 8,374 ms" under SwiftShader at load 50+ |
| B5 | PASS | `smoke --block-cdn`: all 3 CDNs aborted, fatal panel "The legion tripped over a cable" with Copy diagnostics, Safe mode, Reload [fatal_cdn_blocked.png] |
| B6 | PASS | Chromium `--disable-webgl --disable-webgl2`: panel text "WebGL2 is not available. VOXELWARS needs..." plus Safe mode button |
| B8 | PARTIAL | `world/engine/game/state` are live getters (`state` went diorama -> placement -> countdown). But `quick()+fight()+step(30)` leaves `world.tickN` at 0 because the 3 s countdown only elapses in real frames (tools set `world.countdown=0` first). Test-ability only |
| B9 | PASS | grep (above); 13 hostile imports rendered as text |
| B10 | FAIL | `dist/artifact/index.html` = 3,268,995 B (budget 3 MB = 3,145,728 B). Page limit 16 MB is fine |
| R2 | PASS | dist3, 600 units Marble: 158 draw calls (<=160). dist1 (stale) was 359-371 |
| R9 | PASS | 6 battles same arena: geometries 193 stable, textures 25 stable, heap +/-4% (20 battles not run) |
| R11 | PARTIAL | tiers differ (dist3 600 units: potato 71 calls/1.29 M tris, papyrus 141/1.65 M, marble 158/3.86 M, olympian 175/4.50 M; pixel ratio 0.7 at potato) but marble 3.86 M tris is above the PF2 reference (1.2 M for ~500 units; the reading includes terrain and shadow passes) |
| R14 | PARTIAL | blue/red readable on all 16 arenas by eye; no CVD metric run; Styx weakest |
| S1 | PASS | T: `tests/sim.test.mjs` ok, `tests/sim/core.test.mjs` 7/7; same-seed replay x6 identical end tick |
| S2 | PASS | `grep Math.random src/sim src/content ...` only comments |
| S5-S8, S11-S12, S14, S21-S23 | UNVERIFIABLE | slow metric suites not run (machine load) |
| S10, W1 | PASS | T: `tests/nav.test.mjs`, `tests/props/arenas.test.mjs` (96 recipe x size x seed), `tests/arena.test.mjs` |
| S16, S17, S20 | PASS | T: abilities 35/35, objectives 8/8, armygen 6/6 |
| S19 | PARTIAL | pause = 0 ticks in 2 s; 4x/2x/0.5x/0.25x keys work; catch-up clamp not measured |
| A1, A2, A4, A7 | PASS | T: `anim/clips`, `anim/roster`, `anim/gait` (slide 6.7-8.1%), `anim/ranges` (54 death clips, no T-pose) |
| AU1, AU3 | PASS | T: `audio/assets`, `audio/coverage` (116 families, 8 synth-only, doc generated), `audio/cues` |
| AU2 | PASS | T: `audio/au2.test.mjs` OK (negative control not re-run by me) |
| AU5 | PASS | S: Epic 591 units: `voicePeak` 32 (budget 32), 389 steals, 5,136 drops |
| AU9 | PARTIAL | master 0.8 -> 0.3 click moves the bus (`getVolume('master')` 0.3); 0.42 survives reload; **no mute button in the battle HUD** (only in Pause) |
| AU4 | PARTIAL | `smoke --no-assets`: boots and the battle starts, but 55 console errors "Failed to load resource 404" (one per missing file); embedded-pack playback not measurable |
| W2 | PARTIAL | 16 arenas x 4 views reviewed (section 2): no floating props or z-fighting seen; look defects listed |
| W3 | PASS | T: `props/models` 41 ids x 3 stages |
| W6 | PARTIAL | T: `campaign/campaign.test.mjs` 12/12; bot win-rate bands not run. **`campaign/puzzles.test.mjs` is RED (2 failures: `knock_knock recorded cost`, `spear_wall solution wins`)**, coinciding with the uncommitted `src/sim/stats.js` edit |
| UI1 | FAIL | all 16 tour screens mount; Daily/Survival BACK dead (B1) |
| UI2 | PASS | 1280x720, 960x540, 390x844: `scrollWidth <= innerWidth` and no clipped text on all 16 screens (820x1180, 1920x1080 not run) |
| UI3 | FAIL | targets under 44 px: Quick (arena prev/next 41x46, chips 41-42 px), Workshop (slot chips and search 38 px), Painter (part list 38 px), Credits links 22 px; contrast: Settings slider ticks 1.64:1, Daily faction names 3.35:1 and 4.2:1 |
| UI4 | PARTIAL | T: `ui/ui4_keyboard.test.mjs` all passed; S: 3 px focus ring visible on every Quick Battle control; Esc/back work except B1; first Tab press lands on `body` |
| X1 | PASS | T: `ui/x1_motion.test.mjs` all passed; S: Reduce Motion toggle sets the `vw-reduce-motion` class |
| UI5 | PASS | splash key, QUICK BATTLE, QUICK FIGHT = battle. **But the hint cannot be dismissed permanently with the mouse (M1)** |
| UI6 | PASS | HUD shows meter, counts, objective, timer, speed, kill feed, announcer, selection card, minimap, powers, orders (1280, 390) |
| UI7 | PARTIAL | R rematch, pause, hover/select, exit keeps setup (modal text), Tweak work; undo/save-army not exercised |
| UI8 | PARTIAL | quality, volume, rebinding (22 rebind rows) apply at once and persist; Reduce Motion sets `vw-reduce-motion` class; the rest not exercised |
| UI10 | PASS | phone: editors notice, Quick, Campaign, Codex playable (touch context) |
| UI11 | PASS | 43 units, turntable + clip picker (props/arenas tabs only glanced at) |
| UI12 | PASS | title screenshot [menus_1280_960.png] (diorama half hidden by the menu: minor) |
| UI13 | PASS | HUD covers 16.8% at 1280x720 (union of HUD backgrounds); Tab hides it (3 visible nodes), Tab shows it |
| UI15 | PARTIAL | Diagnostics shows WebGL2, tier, FPS, 126 draw calls, storage, audio paths [diagnostics_screen.png]; but "Muted: PROBLEM" when sound is not muted, and "Frame time median 5,166 ms" next to "29 FPS" |
| UI16 | PASS | results show 3 lessons (content issue noted) |
| P1 | PASS | volume and quality survive reload |
| P4 | PARTIAL | hostile pastes rejected; export file download not exercised |
| Q1 | UNVERIFIABLE | did not run `gate.mjs` (it rebuilds `dist/` under other agents); ran lint (exit 0), `contracts.mjs` ("contracts OK (43 units, 16 arena presets, 0 soft findings)") and 41 individual tests: 39 pass, `campaign/puzzles` fails, `ui/x2_a11y` timed out at 280 s (load) |
| Q5 | PASS | grep TODO/FIXME/lorem/stub/coming soon in `src`: only code comments |

## 5. Audio sanity (from outside; I cannot hear)

- `assets` requested by the real page: 1,101 requests in one session, **all HTTP 200**; `dist/artifact/files.json` lists 382 mp3 (10.98 MB), 0 missing on disk; `diagnostics().loaded`: embedded 27, fetched 348, synth 0, failed 0, `failedAssets []`, `errors []`.
- AudioContext: `suspended` until a key; after the splash key `state() === 'running'`, `unlocked true`. Music bus RMS 0.035 (> 0.001) on the title, master RMS 0.033.
- Music: menu -> `menu_heroic_age`; battle on a Roman arena -> `editor_desert_city` at `intensity 0.18`, then `battle_high_clenched_teeth` still at 0.18 during the countdown; victory -> `victory_dark_star`. A *high* tier track at the *lowest* intensity and an "editor" track for a battle both look odd on paper: please listen (AUDIO).
- Cues on battle events (30 vs 30, Colosseum): 37 distinct cue ids fired (steps, shield blocks, armour/flesh/pierce hits, javelin, bow, arrow hits, deaths, horse gallop/neigh, camel, war horn, drum, battle cry, stinger_epic, jingle_start, ui_countdown_beep, ui_go). Announcer bus RMS 0 (TTS default off, per spec).
- Waste: the same files are fetched repeatedly (menu track 3x, editor track 8x, victory 5x, 1,084 sfx requests) because the decode cache evicts (125 evictions at 114 MB decoded of a 251 MB ceiling). On a CDN this is cheap; on the artifact host it is 11 MB of avoidable traffic per session.
- `drops.unknown` = 1 (one cue id nobody registered); cooldown drops 3,688 at 591 units (expected).

## 6. Prioritised findings

Owners: UI-A (menus/placement), UI-B (HUD/battle screens/router), SIM, ANIM, AUDIO, PROPS, UNITS-A/B, BEASTS, EDITORS-A/B, CAMPAIGN, META, HUMOR, COORD.

### BLOCKING
**B1. Daily Skirmish and Survival setup are dead ends and throw a stack overflow.** Repro (dist1 and dist3): splash, any key, DAILY SKIRMISH (or SURVIVAL), press Esc or click BACK: nothing happens, console `Uncaught RangeError: Maximum call stack size exceeded` (recursion `Router.back` -> `base.inst.onBack` -> `ctx.nav.back()`). Cause: `src/ui/screens/daily.js:78` and `src/ui/screens/survival.js:157` return `{ onBack() { ctx.nav.back(); return true; } }`, and `src/app/router.js:41-45` calls the screen's `onBack` from `back()`. Fix: delete those `onBack` hooks (the page frame already navigates) or return `false`. Owner: UI-B/CAMPAIGN, COORD to guard `Router.back` against re-entry. [daily_back_stuck.png]

### MAJOR
**M1. Placement tutorial card cannot be clicked** (mouse or touch). Repro: Quick Battle, PLACE ARMIES, click NEXT / DISMISS / the checkbox: nothing; `document.elementFromPoint` returns the canvas; computed `pointer-events: none` on the card (appended to `.vw-screen`, which is `none`; `.vw-pl__hint` in `src/ui/screens.css:205` has no `pointer-events:auto`). Esc works, so "dismiss permanently" is unreachable. Owner: UI-A. [novice_placement_hint.png]
**M2. No visible deployment zone; the default placement camera hides it.** Repro: Quick Battle, PLACE ARMIES, hover the field: "Outside the blue deployment zone" almost everywhere. Add a zone overlay (the arena builder already draws A/B zones) and frame the camera on the player's zone. Owner: UI-A + COORD (`game.js` `frameArmies` / placement camera).
**M3. Back-stack ping-pong after Tweak.** Repro (dist3): finish a battle, press T, press Esc: you are on the battle HUD while `game.state === 'placement'`; Esc again returns to placement; BACK goes to a title with a frozen leftover placement world behind the menu. Owner: COORD (router history) + UI-B. [title_after_tweak_back.png]
**M4. Default battle framing** is weak on every arena (small armies, cropped corners, big empty ground) and is not re-fitted after a viewport resize on phone. Owner: UI-B/COORD (camera rig).
**M5. No mute / volume control in the battle HUD** (AU9 "visible mute state on every screen"); only Pause > quick settings. Owner: UI-B.
**M6. Triangle load**: dist3 Marble at 600 units draws 3.86 M triangles (Olympian 4.50 M; reference 1.2 M for about 500 units). Real GPU cost unknown; needs a human on a mid laptop. Owner: COORD/PROPS (LOD).

### MINOR
1. Quick Fight sub-label says "Random arena" while the footer shows the chosen arena (UI-A).
2. Scout strip grows to 574x206 px over the field and says "mostly one kind of unit" after one soldier (dist1) (UI-A).
3. Countdown digit "3" nearly invisible: pale yellow on bright grass (dist1) (UI-B).
4. FIGHT pressed while paused leaves a frozen countdown with no hint (UI-B).
5. Results lessons mis-slot: archers named in battles with none, "a quarter of us stood" after a 0-of-1 loss (SIM lessons/HUMOR). [results_defeat_1v1.png]
6. Campaign placement shows the mission enemy as "4,420 / 3,000" in red (UI-A/CAMPAIGN).
7. Photo-mode toast overlaps the SNAPSHOT button (UI-B).
8. Diagnostics: "Muted: PROBLEM" when audio is not muted (boolean row semantics inverted); "Frame time median 5,166 ms" beside "29 FPS" (UI-A).
9. Tap targets under 44 px: Quick arena prev/next 41x46 and chips 41-42, Workshop slot chips/search 38, Painter part list 38, Credits links 22 (UI-A, EDITORS-A/B).
10. Contrast: Settings slider tick labels 1.64:1 at 10.9 px; Daily faction labels 3.35:1/4.2:1 (UI-A).
11. Phone: objective chip truncated to "Defeat the ene..." (UI-B).
12. First Tab press lands on `body` (UI-A).
13. Arena thumbnails blank for 2-3 s on first open of Quick Battle (UI-A).
14. Codex turntable crops tall models (Minotaur horns) (UI-A).
15. Workshop turntable Hoplite idle: spear crosses the face (ANIM/UNITS-A).
16. Styx too dark, Alpine hides white horses, Persepolis floor blown out, Arena Lab far-LOD horse is a flat white ghost, Cyclops cave on a hard slab (PROPS/BEASTS).
17. Title diorama: menu column hides half of it; fight is tiny (UI-A/COORD).
18. Music choice: editor track for a battle and a high-intensity track at intensity 0.18 (AUDIO; needs ears).
19. Repeated asset fetches after decode-cache eviction (about 1,100 requests in a session) (AUDIO).
20. B10: artifact fragment 3.27 MB over the 3 MB budget (COORD).
21. `tests/campaign/puzzles.test.mjs` red (2 failures) alongside the in-flight `src/sim/stats.js` edit; re-record stored puzzle solutions after balance settles (SIM/CAMPAIGN).
22. Fast `goto` hopping stacks the async "Start a new arena" modal over the next screen; `--no-assets` run emits 55 console 404s (EDITORS-A, AUDIO).

## 7. What the user would say after 15 minutes

Three best things:
1. "It looks like a real game." Logo, toy-box UI, the 16 arenas (Colosseum crowd, Troy walls, Styx lava, Carthage harbour), the voxel soldiers with proper teams colours and the results screen with confetti.
2. "It is actually funny." Brutus and Cassandra in the HUD and post-mortem, the pause quips, the briefings ("WELCOME to your first battle! Spears in a line..."), codex jokes, achievement toasts ("Tourist Trap").
3. "There is a lot of game." 43 units with turntables, 7 factions, Advanced options, campaign with briefings and a teaching tutorial with Skip, and three real editors (sculpt, parts and point-buy, voxel painter) plus a library of 374 sounds and 8 tracks.

Three worst:
1. "I could not figure out where to put my guys." Un-clickable tutorial card, no zone marker, awkward camera; then BACK on Daily/Survival does nothing.
2. "The battle itself looks small." Tiny, cropped armies at the default camera and a title diorama half hidden; the 30-unit skirmishes feel thin compared to the promise of "hundreds".
3. "Little things are off." Tweak/Back ping-pong, lessons that talk about archers I do not have, "Muted: PROBLEM", tiny text and tap targets, no mute button in battle.

What they would ask for next: a cinematic auto-director that frames the fight and cuts to hero moments by default; visible deployment zones and a one-click "Auto-fill my side"; a bigger default battle size with a reassuring performance indicator; replays/clips to share; a mute/volume pill in the HUD; then "Medieval era, please".

## 8. Files

Report `docs/qa_round1.md`; screenshots `docs/qa/*` (key ones: `arenas_battle_0..3.jpg`, `daily_back_stuck.png`, `novice_placement_hint.png`, `title_after_tweak_back.png`, `epic_591_units.png`, `results_defeat_1v1.png`, `diagnostics_screen.png`, `phone_menus.png`, `phone_battle.png`, `arena_builder_sculpt_playtest.png`, `painter_real.png`, `fatal_cdn_blocked.png`).
