# CAMPAIGN -> COORD: how to wire the campaign, survival, puzzles and the daily (everything below is pure data/functions, already tested)

`src/content/era_ancient/campaign.js` is picked up by `tools/gen-registry.mjs` as `CAMPAIGN` (registry.optional.js). Wiring in `content.js buildContent()` (COORD-owned):

```js
import { CAMPAIGN } from '../../_generated/registry.optional.js';      // null until the file exists, then the namespace
campaign: CAMPAIGN ? { acts: CAMPAIGN.CAMPAIGN.acts, missions: CAMPAIGN.CAMPAIGN.missions, puzzles: CAMPAIGN.PUZZLES?, api: CAMPAIGN.campaignApi } : { missions: [] }
```
(The registry exports the module NAMESPACE: `CAMPAIGN.CAMPAIGN` is the object `{acts, missions, order, api}`, `CAMPAIGN.campaignApi` the API, `CAMPAIGN.MISSIONS` the array. `puzzles.js`, `survival.js`, `daily.js` are plain imports, not registry entries.) The screens only read `campaign.missions` today (ui/screens/campaign.js normMission): it renders as-is.

## 1. Starting a mission (Game.begin for kind 'campaign', setup.mission = id)
```js
import { campaignApi } from '../content/era_ancient/campaign.js';
const m = campaignApi.missionById(setup.mission);
const arena = campaignApi.arena(m);                       // generator arena + env overrides + markers + decor props   (setup.arena.data = arena works too)
const rules = campaignApi.rules(m);                       // spec 8.4 Rules: objective spec, timeLimit, difficulty {A,B}, friendlyFire, godPowers, budget; mutators []
const world = new World({ arena, seed: setup.arena.seed, rules, defs });
const run = campaignApi.setup(world, m, { seed });        // enemy army placed in zone B, free units (VIP goat) added, generals flagged, scripts installed on world.onTick
// placement phase: the player places up to m.budget drachmae of m.roster (null = every shipped unit) inside zone A; m.core = suggested units the mission is about
world.start(...)                                           // run.tracker listens from here on
// battle_end -> const summary = Object.assign(yourBattleSummary, run.tracker.extras());  const r = campaignApi.rewardsFor(m, progress, summary);
```
`campaignApi.summaryOf(world, m, run.tracker)` builds the whole BattleSummary (docs/lifetime_stats.md section 3 + extras) from a finished World, if you prefer to use it as is.
Note `setup.rules.timeLimit`: `campaignApi.rules(m).timeLimit` already carries the mission limit (objective missions lose at their own timeout, plain elimination is decided by remaining cost).

## 2. BattleSummary extras the star tests read (all optional keys, produced by `run.tracker.extras()`)
`startDefs {defId:n}` (player units alive at battle_start), `lostDefs {defId:n}`, `heroesLost`, `friendlyHits`, `friendlyDmg`, `friendlyKills`, `propDownT {propType:[sim seconds]}` (gate_door times), `enemyDownT {defId:[t]}`, `stonedUnits`, `vipDamage` (hpMax - hp of the VIP), `spent` (placed cost without free units).
If you build the summary yourself, these keys must be present for stars 3 of missions 2, 4, 7, 8, 9 (Spartans lost, goat damage, gate time, friendly hits, heroes lost). Everything else needed (win, t, aliveDefs, playerCostStart) is in the base summary.

## 3. Stars, progress, unlocks
`campaignApi.starsFor(summary, mission)` (0..3, independent achievements of a won battle), `evaluateStars` (with `earned[3]`), `rewardsFor(mission, progress, summary)` ->
`{stars, best, improved, totalBefore, totalAfter, mutators:[ids newly unlocked], parts:[unlock keys on a first clear], title, firstClear}` (results screen: "Unlocked: Big Heads", "Workshop: Silly Helms"),
`isUnlocked(mission, progress)`, `nextMission(progress)`, `unlockedMutators(totalStars)`. Progress shapes accepted: `{stars:{id:n}}`, `{missions:{id:{stars}}}` or the bare map (what `ui/hud/_progress.js starsMap` returns).
Unlock keys (`rewards.unlockParts`): `silly_helms` (mission 3), `silly_weapons` (mission 5), `wings` (mission 9); grant them in whatever set `listParts(cat, unlocked)` / `isPartUnlocked` receives. `rewards.partNames` holds HUMOR's display names (the briefing chip prints the raw key today: see "UI findings" below).

## 4. Teaching beats (mission 1)
`campaignApi.teachingBeats('marathon_sort_of')` returns HUMOR's TEACHING_BEATS; the run object records the moments the beats trigger on (`run.beats`: battle_start, first_contact = first unit_hit, cavalry_brace = first unit_brace, battle_end). The placement_start beat is the app's (first placement frame).

## 5. Survival (src/content/era_ancient/survival.js)
`survivalRules(rules)` -> the Rules for `new World` of kind 'survival' (`rules.waves` switches sim/waves.js on, `timeLimit: 0`, an endless `survive_waves` objective (without it the first cleared wave ends the run as a victory, see campaign_sim_bugs.md #8), start budget 6,000). The UI sets `rules.survival: true` and nothing in the sim reads it: please map it through `survivalRules`.
`placementBudget(nextWave)` = what the intermission may place (start budget before wave 1, then `1,600 + 240*clearedWave`). NOTE ui/screens/survival.js `mountIntermission` computes `bonus = 1600 + 240 * (sv.wave || 1)` where `sv.wave` is the NEXT wave: the sim's `wave_intermission.budget` is `reinforceBudget(clearedWave)` = one step lower. Pass `bonus: e.budget` in `hud.survival` so both agree.
Leaderboard: `recordRun(prev, {score, waves, date, arena}) -> {state:{best, board}, rank, newBest}`; persist `state` under `vw.survival`. Score: `survivalScore({waves: cleared, kills, remainingCost})`.

## 6. Puzzles (src/content/era_ancient/puzzles.js)
`PUZZLES[i]` = `{id, kind:'puzzle', title, blurb, hint, goalText, arena, player:{faction, roster, budget}, par, enemy:{placements}, goal, timeLimit, godPowers:false, stars[3], solution}`; `puzzleAsMission(p)` feeds `campaignApi.setup/rules/arena` (enemy is hand-placed, `Game.autoFill(1)` must NOT run). `evaluatePuzzleStars(p, summary)`. Free VIP (goat_logistics) = `p.fixed`.

## 7. Daily (src/content/era_ancient/daily.js)
`dailyKey(date)`, `dailyPlan(key)`, `dailySetup(plan)`, `dailyEnemy(plan)` (the army of the day: identical generateArmy call everywhere). The Daily screen's own `_daily_plan.js` agrees with it for 400 dates (tests/campaign/daily.test.mjs).

## 8a. Contract validators for the gate (Q1 "Mission" step)
`import { validateMission, validatePuzzle, MUTATOR_STARS, MISSIONS } from 'src/content/era_ancient/campaign.js'` and `PUZZLES, puzzleAsMission` from puzzles.js: `validateMission(m, {mutatorStars: MUTATOR_STARS})` and `validatePuzzle(p, puzzleAsMission)` return a list of plain-English problems (empty = valid); each of their ~25 rules has a negative control in tests/campaign/campaign.test.mjs and puzzles.test.mjs.

## 8. Daily: what is data and what differs between the specs and the screen
`daily.js` follows the CODE (ui/screens/_daily_plan.js, proven equal for 400 dates): fixed 3,000 dr budget (spec.md 14 "Skirmish 3,000"), a seeded twist mutator on 67% of days, result string `VOXELWARS Daily <date> | <arena> | A vs B | WIN in m:ss | n% of the army left | seed n`.
ui.md 4a.1 says Battle 8,000, no mutators and the string `... | WIN | 62% alive | 1:34 | 2/3 stars`: one of the two documents is stale (the screen and spec.md 14 agree with the code). Also pure and ready: `dailyStars(results)` (1 win, 2 >= 50% alive, 3 >= 75% alive), `recordDailyRun(prev, rec)` (first run of a date counts, streak, best streak, history capped at **60** as ui.md says; `ui/screens/daily.js recordDaily` slices to 14 today).

## UI findings (data was fixed where possible; these need the UI/COORD owner)
1. `briefing.js` prints `'Workshop: ' + x` for every `rewards.unlockParts` entry, i.e. "Workshop: silly_helms". Use `m.rewards.partNames[i]` ("Silly Helms").
2. `campaign.js normMission` takes `units` as `{A, B}` and the briefing prints `~A units`; the data now carries both (A = what the reference army fields, B = the enemy's whole force incl. later waves).
3. Briefing "Deploy" passes `preset.arena = {presetId, size, seed, env}` but not `markers`, `rules.objective`, `armies.B` forces or the script: it must call `campaignApi.setup(world, mission)` after `new World` (section 1) or the mission has no objective and no enemy.
