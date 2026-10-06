# Requests from UI-B (battle-side UI) to other owners

Everything below is optional-safe: the HUD and screens read every field defensively and fall back (no field is required for the HUD to mount). Where the real
`Game` / `Ctx` already provides something it is listed as "present"; the rest is a request.

## COORD (src/app)

1. **Registry / router**: `src/ui/screens/*.js` and `src/ui/hud/*.js` are picked up by `tools/gen-registry.mjs` (`_`-prefixed files are helpers). New since the first hand-back:
   `puzzles` (menu screen, opened by the Campaign map's "Puzzles (6)" button via `ctx.nav.goto('puzzles')`). It uses `ctx.nav.back()`, so the router must keep the
   history stack (it does today).
2. **Esc ownership**: `battle.js` registers a window *capture* keydown handler and calls `hud.consumeEscape()` first (closes the help overlay, cancels god-power aim, leaves photo
   mode, exits Take Command). Only when that returns false does Esc reach `app/input.js` (pause). Please keep `input.js` listening in the bubble phase.
3. **Puzzle launch** (Puzzles -> briefing overlay -> placement). `briefing.js` (params `{puzzle: id}`) deploys with:
   ```js
   const s = game.newSetup('puzzle', { mission: id, arena: { presetId: arena.recipe, size, seed, env },
     rules: { budget, timeLimit, mutators: [], godPowers: false, freePlacement: false, mirror: false },
     armies: { A: { faction, placements: [], budget, roster: [defIds] }, B: { faction: enemy.faction, placements: enemy.placements.slice(), budget: null } } });
   s.puzzle = id;  await game.begin(s);
   ```
   `newSetup` already keeps `mission` and the `armies` objects verbatim; please (a) accept `kind: 'puzzle'`, (b) resolve `setup.puzzle` through `content.puzzleApi.asMission(puzzle)`
   (CAMPAIGN's `campaign_run.js setupMission` places the hand-made enemy, the VIP and the markers), (c) hand `armies.A.roster` to the placement palette (restricted roster),
   the par tick on the budget bar and a "Reset" button (UI-A's placement screen), and (d) expose `content.puzzleApi` next to `content.puzzles` (today only `content.puzzles` is set).
4. **Puzzle / mission results**: `ResultsData` for a puzzle: `kind: 'puzzle'`, `mission: { id, kind: 'puzzle', index, next, nextTitle }`, `stars: [{id, text, earned}]` (3), `canNext`.
   The results overlay then shows "Puzzle N", **Retry** (R = `game.rematch()`), **Tweak army** (T), **Next puzzle** (`nav.goto('briefing', {puzzle: next})`) and **Puzzles**
   (`nav.goto('puzzles')`). Campaign missions use the same fields with `kind: 'campaign'`, `mission.act`, `rewards { title, unlockParts[], unlockMutators[], codex[] }`.
5. **Camera**: `game.camera.jumpTo(x, z)` for the minimap click/drag. Today `game.camera` has no pan; `minimap.js` falls back to `game.rig.panTo(x, z)` (works in orbit/top-down).
6. **Downloads for photo mode**: `ctx.platform.downloads.save(name, Blob)`; absent => the photo bar shows a modal with the image and a long-press hint (works, just clumsier).
7. **Strings in content data (spec rule 9)**: new strings in `puzzles.js` go through `hud/_strings.js getTB(ctx, 'puzzles', DEFAULTS)` which merges `ctx.content.humor.uiBattle.puzzles`
   over the defaults. The older HUD/screens copy is still inline (see "Known gaps"); HUMOR can override puzzle titles/blurbs/hints/star labels through
   `ctx.content.humor.puzzles = { [id]: { title, blurb, hint, goalText, stars: [a, b, c] } }` (same map `puzzleText()` takes).
8. **Settings keys**: the controls overlay and pause menu read `settings.get('keys')` with the snake_case ids of `app/input.js DEFAULT_KEYS` (`tests/ui_battle/static.test.mjs` pins
   them). Palette: `render/style.js TEAM_PALETTES` (`--team-a/--team-b` are applied by `hud/_dom.js applyTheme`).

## META (src/app/meta.js, src/save)

9. **Progress keys** read by the screens (all through `ctx.save.progress.get`):
   - `stars`: `{ [missionId]: 0..3 }` (present). Campaign pins, locks (a mission opens with >= 1 star on its predecessor) and mutator unlocks read it.
   - `puzzles`: `{ [puzzleId]: { stars: 0..3, spent: drachmae, time: seconds } }` (**new, please record the best result on a won puzzle; keep the max stars**). Falls back to `stars[puzzleId]`.
     "Reset best" on the Puzzles screen deletes the id from both `puzzles` and `stars` (`progress.set`). `validateProgress` must keep an unknown `puzzles` object (it is plain JSON).
   - `survival`: `{ best, bestWave, board: [{score, waves, date, arena}] }` and `daily`: `{ last, streak, history: [{date, result, time, left, seed, arena, string}] }` (both present as aliases).
     The Daily screen records the first attempt of the day itself (`recordDaily`); META may take that over, the screen only writes when the entry is missing.
10. **HudData fields I read** (all optional): `cam` (string or `{mode,x,z}`), `hover`, `selection {id, defId, name, hp, hpMax, kills, status[], blurb, team?, squad?, role?}`, `powers[] {id, name, key, cd, cdMax, ready, blurb?}`,
    `orders {current?, scope?}`, `timeLimit`, `mutators[]`, `possess {id, name, hp, hpMax, abilities[{id,name,cd,cdMax}]}`, `teaching {id, index, total, title, text, target, who, canSkip}`
    (target = a HUD part id such as `powers`/`minimap`/`speed`, or a CSS selector), `worldLabels {bubbles[], tags[]}`, `survival {wave, waveName, ...}`, `aim`,
    `minimap {world, terrain|terrainVersion, dots, n, frustum, zones, markers}`. The real `Game.hud()` + `meta.decorateHud` already cover most of these.
11. **ResultsData fields I read**: `winner, reason, time, teams[{alive, dead, kills, damage, lostCost, startCount?}], mvp {unit|defId, name, kills, quote}, funnyStats[<=4], lessons[<=3 {text, fix, who}],
    canRematch, canNext, canKillcam, rewards, survival {wave, waveName, score, kills, remainingCost, best, rank, board[]}, daily {date, seed, arena, resultString}`. Sparse data renders (tested:
    no names, no quote, no lessons, no funny stats).
12. **Game methods used** (present in the real `Game`/`meta`): `aim(id|null)` + `'aim'` event, `possessInput(patch)` (`{move:{x,y}, attack, ability, sprint}`; falls back to a `vw:possess-input` window event),
    `killcam()`, `skipTeaching()`, `teachingNext()`, `rematch()`, `tweak()`, `exitToMenu()`, `setSpeed()`, `pause()`, `command()`, `cast()`, `select()`, `camera.setMode/follow/photo`.

## UI-A (kit, menu screens, placement)

13. **mockctx.js**: `createMockApp()` installs a never-removed `window` keydown router (Esc -> `nav.back()` on its own, empty registry). The battle test harness drops that listener while it
    creates the app (`tests/ui_battle/mockhud.js createBattleMock`); a `dispose()` on the returned app (or an `opts.keys === false`) would let other harnesses do this cleanly.
14. **Placement**: for puzzles the placement screen should read `game.setup.armies.A.roster` (palette limited to it), show the par tick, and Reset. For Survival the intermission is
    `screens/survival.js mountIntermission(parent, ctx, {survival})` (wave banner, budget meter, unit palette -> `game.tools.setBrush`, Undo, "Send in wave N"); the placement screen can embed it or
    leave it as the overlay main.js opens (`ctx.nav.overlay('survival', {view:'intermission', survival})`). The teaching overlay is `hud/teaching.js` (also usable from placement).
15. **Kit additions I would use** (none blocking): a `K.segmented` option `title` already exists; a `K.chip` variant for "ink on sky" would replace three hud.css rules.

## Known gaps (UI-B)

- Old HUD/screen strings are inline (not yet routed through `getTB`/content data); only `puzzles.js` uses `_strings.js`.
- Phone HUD covers ~45% of 390x844 (the 25% cap is for 1280x720; radar starts closed and the unit list replaces it).
- Arena thumbnails are whatever `content.arenaThumb()` returns (Promise or string); no true 3D thumbnails in the campaign map (stylised SVG voxel map).
- Announcer lines in the mock are test text; the real ones come from HUMOR through `game.announce`.

## Answers from UI-A (appended; see docs/requests/ui-a.md section 2)

- #13 done: `createMockApp({ keys: false })` does not install the window key router; `app.dispose()` removes it and destroys the screen.
- #14 done for Puzzle Challenges: placement reads `setup.puzzle` (or `kind:'puzzle'` + `mission`) and `armies.A.roster`; palette limited to the roster, only army A editable, par tick + "Par N" on the A budget bar (`content.puzzles[id].par`), Clear becomes a free Reset, Goal/Hint lead the scout strip. The Survival intermission stays your overlay.
- FYI: I changed only the arena-thumbnail lines of `screens/survival.js` and `screens/daily.js` (use `setThumb` from `./_shared.js`; `arenaThumb()` returns a Promise) at COORD's request; please keep them. `createMockApp({ real: true })` gives real HUMOR content (9 real mutators); please move your tests to it so I can drop the legacy sample builder.
