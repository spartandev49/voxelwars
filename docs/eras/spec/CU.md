# spec/CU: campaign, meta, UI, HUD and save-facing screens of the "three new eras" program (DESIGN-UX, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (0.1, 0.8, 8 CU1..CU18, 9 ER8/ER15/ER19/ER20/ER21/ER25, 11, 13, 14 row `spec/CU`), `traceability.md` (rows 2.1, 2.7, 2.8, 5), `maps/06_campaign_meta_ui_save.md` (the 30 seams, every file read), `maps/07_audio_humor_assets.md` (announcer, stingers), `q3_product.md` (SPEC RESIDUALS 1, 4-8, 12, 13, 23-26, 29, 30, 32, 34, 35), `q3_program.md` (12, 14), `q3_engine.md` (34), `q2_product.md` (Q14, Q15, Q19), the final specs `AR` (3.2.3 DA-1..DA-6, 3.4, 3.5 save, 3.6 factories and facade, 3.9 customs, 3.10.3 app-layer imports, OI-1..OI-3), `M` and `M-layers` (3.9.8 possess table, M14 script ops, M15 kit and GodPower schema), `RA` (3.7 gore matrix, 3.11 `CameraRig.shot`, 3.16 flash limiter), `UC` (R-UC5), `W`, `VF` (3.9 `campaign_play`, 3.17 `uiscan`, 3.23.6 walks, OI-5), and the design bibles `design/{medieval,modern,scifi}/{feel_sheet,rosters,missions_outline,first_three_minutes,god_powers,humour,mutators_achievements,sound_music,visual_bible,ui_chrome,arenas,props,puzzles,boss_table}.md` (BINDING design). Where this file and an older document disagree, the real source wins; every claim marked (m) below was measured by reading or running the shipped code (read-only probes in the scratchpad, nothing written to the repo).

Vocabulary used throughout: **released** = `registry.releasedEras()` (AR 3.2.4); **R1** = exactly `[ancient]` released; **era UI row** = `registry.byEra('UI', era)` (section 3.1.3); "FZ" = frozen Ancient file (AP-C06); "PX" = bit-identical opt-in (AR 3.2.1); a number in `[brackets]` after a path is a line in the shipped tree.

## 1. Purpose and scope

This file specifies, for builders who have not seen the planning conversation, everything the player SEES and TOUCHES that is not the simulation, the renderer or the audio mix: how an era is chosen, mapped, entered and left; how missions are validated, taught, staged (set-pieces), scored, rewarded and assisted; how settings, gore, corpses, currency and strings become era-aware; how god powers, Take Command, the selection card and the world labels show the new mechanics; and how the menu modes (Quick, Survival, Daily, Puzzles, Codex, Workshop, Arena Builder, Achievements, Stats, Settings, Title, Credits) behave when four eras exist. It answers plan items **CU1..CU18**, the residuals assigned to `spec/CU` in `q3_product.md`/`q3_program.md`/`q3_engine.md`/`q2_product.md`, and every request, open question or "R<n>" that the design bibles address to the UI, INTEGRATION or DESIGN-UX.

| in this file | owned elsewhere (interface fixed here) |
|---|---|
| CU1 factories facade as the UI sees it, CU2 validator, CU3 set-piece dispatcher, CU4 gore and corpses, CU5 teaching, CU6 chooser/maps/transitions/cards, CU7 currency, CU8 `getTB` sections, CU9 achievements/Stats/Settings, CU10 modes table, CU11 reward ledger (27 rows), CU12 god-power readers, CU13 player control and HUD, CU14 counters and scout codes, CU15 assist ladder, CU16 mutator matrix, CU17 chrome census, CU18 announcer era-ization | mission JSON schema and star helpers (`spec/MS`), text counts and wording (`spec/H`), audio rows and stingers (`spec/AU`), `CameraRig.shot` internals (`spec/RA` 3.11), the GodPower interpreter and `rules.powers` handling (`spec/M` M15), registry mechanics (`spec/AR`), harness tools (`spec/VF`) |

Non-goals (stated so nobody builds them): Time Warp / cross-era battles (D19; the `EraMismatch` guard of AR 3.4 is the only cross-era code), a fourth commentator or an intern portrait (D22), new fonts (CU-D31), URL or hash routing (there is none; "deep link" means router params, CU-D02), orders `hold_fire` / `take_cover` (rejected, 3.13.7), editors on phones (the friendly notice stays, 3.19.4).

Ancient policy for this file (AR 3.2): every Ancient path touched below is listed in section 3.20 with its AP row; the default is **bit-identical opt-in**: with `released = {ancient}` (state R1) the DOM, strings, saves, pixels and flows of every screen equal the v8 baseline except DA-1 (the roadmap tablet is gone) and the two additive settings rows of 3.4.2. Behaviour that only exists for a non-Ancient era is selected by DATA (`registry.byEra('UI', era)` rows, `era.ui.assist`, `rewards`), never by an `if (era === 'ancient')` (lint LR6, AR 3.1.4).

## 2. Decisions

Each decision has an id, the rule, and its rationale. Later sections cite them as `CU-Dnn`.

| id | decision | rationale |
|---|---|---|
| CU-D01 | **Release-state rule.** Every aggregate (title stars `x/N`, Achievements total and tabs, mutator thresholds, Daily "all eras", Survival combined tile, Codex era chips, Quick era chips, Stats sections, chooser cards, the "all eras cleared" card, Credits lines) is computed over `releasedEras()` only. With R1 there are no chips, no chooser, no era strip, no what's-new card, no meta achievements, and the title reads `x/27`. A string, DOM node, file or share-code field that names a hidden era is a leak (ER21b). | AR 3.2.4 (R-PARITY) and q3_program 12: eras ship one at a time (D18); a half era is never visible. |
| CU-D02 | **Screens and navigation.** The chooser is a NEW router screen `eras`; the campaign map stays screen `campaign` and takes `params.era`; two NEW overlay screens `whatsnew` and `eracard` (kinds `arrival`, `cleared`, `passport`). Title "Campaign" tile -> `eras` when `released >= 2`, else `campaign` (the Ancient map directly, as v8). Map Back -> `eras` with `focus: era` when `released >= 2`, else `title`. "Deep link" = router params only (`goto('campaign', {era})`, `goto('quick', {era})`, `goto('codex', {era, tab, unit})`); params are kept in history (AR 3.6.3). | AR 3.6.3 `{id, params}` history; q3_product 6, 11; "the chooser always opens" (D24) while R1 keeps v8's flow. |
| CU-D03 | **One set-piece dispatcher.** The sim emits only `setpiece {piece, x, z}`; ONE `SetpieceDirector` (class in `src/app/setpiece.js`, instantiated and wired only by `src/app/meta.js` as `M.setpiece`) fans it out to five channels. `audio/cues.js` and `render/battleview.js` have NO `setpiece` handler (lint LR-CU1, CU-T07). | plan CU3; a second listener would double-fire stingers and lines. |
| CU-D04 | **Time scale is not speed.** The director never calls `Game.setSpeed`. `Game` gains `pushTimeScale(owner, k)` / `popTimeScale(owner)`; the effective factor is `min` over owners (1 when none) and multiplies `speed` in `Game.frame`. `getSpeed()` and the `speed` event stay the player's setting. | q3_product 7: `setSpeed` emits the `speed` event the HUD displays and persists; the announcer's `fastSpeed` gate reads `getSpeed()`. Ticks stay 30 Hz, so determinism is untouched (q3_engine 34). |
| CU-D05 | **Gore and corpses encoding.** `settings.gore` and `settings.corpses` ALWAYS hold a legacy enum value. "Auto" is the booleans `goreAuto` / `corpsesAuto` (default true), with markers `goreChosen` / `corpsesChosen` and the one-shot `goreMigrated` for the what's-new line. One pure function `resolveGore` / `resolveCorpses` in `src/content/shared/gore.js`. | AR PC8 and OI-2: the v8 `validateSettingsData` throws on `gore: 'auto'` (m, `transfer.js:51-71`); the same holds for `corpses` (m, `ENUMS.corpses` has three values), which PC8 did not name: PC-CU1. |
| CU-D06 | **Teaching = data + a closed trigger grammar.** Beats `{id, layer, slot?, trigger, action?, who, text, hint, target, ack, ...}` live in `era_<id>/teaching.js`; two persistence layers (`seen.basics` keyed by SLOT so cross-era basics work, `seen.beats[id]`), an unordered first-sight toast queue (`seen.firstsight[id]`), no global dismissal. The shipped five Ancient beats are re-expressed as data with identical ids, texts and order (basics = `place_spears fight god_power done`, era = `counter`). | q3_product 1, 19; Medieval/Modern/Sci-Fi `first_three_minutes.md` rules 1-4. |
| CU-D07 | **Skip buttons.** "Skip tutorial" sets the whole basics layer (and the v8 keys `seen.teaching` + `settings.seenHints.teaching` so a rollback never replays it); "Skip era tips" sets `seen.skipTips[era]` (every beat and toast of that era, including ones added later). The HUD never touches `settings.seenHints` (`hud/teaching.js` lines 25, 65 removed). | q3_product 1; v8 rollback safety (AR 3.5.1). |
| CU-D08 | **Reward ledger is the single source of reward truth.** 27 rows (section 3.11) live in the registry kind `REWARD` (idmap, ids `<prefix>_r<n>_...`); `missions.json` `rewards` is derived from `rewardId` by the MS lint. Five classes, each with one implementation and one substitution rule. | q2_product Q15; the ladder (plan 13 rung 2-3) can never create a hollow reward. |
| CU-D09 | **A star-milestone track EXISTS** (5 milestones at 36, 54, 72, 90, 108 mission stars, visible only when reachable by the released eras); it is cut-ladder rung 2 and cutting it removes the whole feature, never a promised mission reward. | q2_product Q15 required "exists or plainly none"; cheap, additive, `progress.titles`. |
| CU-D10 | **Mutator unlock rule is unchanged and global**: `MUTATOR_STARS` 3..27 over the sum of ALL stars in `progress.stars` (missions and puzzles, every era), one export in `shared/leaf/mutator_stars.js`. Both v8 places (`quick.js _shared.totalStars`, `_mutpicker`) switch to this one function. The two era mutators unlock by mission reward (`progress.unlockedMutators`). | AR 3.5.2; unifying on the larger of the two v8 sums (m: Quick sums every star incl. puzzles, `_mutpicker` sums Ancient missions only) can only unlock more, never re-lock (map 06 R4). |
| CU-D11 | **Daily default = "my era only" with era `lastEra`; the era draw uses the separate stream** `rng(seedOf(key) ^ 0xE4A)` (AR 3.6.2). One streak, one history, one counted run per DATE in either mode. The share string appends ` | era <id>` only for non-Ancient plans. | q3_product 13: the first Daily after the update is the v8 plan for that date (G7: 400 dates). |
| CU-D12 | **Assist ladder is data-gated and cost-free**: `era.ui.assist = {nudgeAt: 2, revealAt: 4}` for the three new eras, absent for Ancient (Ancient flows unchanged). After 2 defeats of a mission the briefing and placement offer "Deploy the suggested army"; after 4 the briefing also lists the enemy composition. Stars, par and tests are never touched. The existing `#pl-suggest` button stays visible from the first attempt in every era (rejects the "hidden until two defeats" remark of the `first_three_minutes` files, 3.15). | q2_product Q19; VF 3.9 step 4 needs `#pl-suggest` without a harness workaround. |
| CU-D13 | **Currency through `fmtCost(ctx, n, opts)`** reading `era.ui.currency {one, many, short}`; Ancient strings render byte-identically (`dr` short, `drachmae` long). | map 06 seam 24: 47 sites in 26 files (m, section 3.7). |
| CU-D14 | **Statuses on the selection card become real.** v8 fills `selection.status` with `[]` always (m, `game.js` hud(): `status: []`); the new builder fills it from `unit.se` and the new fields ONLY when `world.era !== 'ancient'`, so the Ancient card is unchanged. | Ancient does not change; new statuses (suppress, emp, cloak, shielddown) need a real data path. |
| CU-D15 | **The three new eras reuse the chooser/map engine** (`buildMapSvg(eraMap)`) with data, not new code: `ERA_MAPS` is a registry byEra row; backdrop kinds `sea`, `vellum`, `cork`, `screen` are four values of one field. | ui_chrome.md of all three eras: "uses the Ancient map engine unchanged". |
| CU-D16 | **Chooser stills are committed files** produced by `tools/era_stills.mjs` (headless Chromium, the real BattleView plus a 2D style pass), shipped as `assets/era/chooser_<era>.webp` (1280x720, quality 80, budget 100 KB each); a `--check` gate step compares an input hash. Hidden eras publish no still. | q3_product 12: `build.mjs` has no browser step; AR-T31 counts published files (4 files, 383 + 4 <= 500). |
| CU-D17 | **Achievements: 24 + 36 + 3 = 63.** Three cross-era meta achievements live in the `meta` pack (AR-D23) with `minReleased`; each era's generated trio (`*_history`, `*_overachiever`, `*_tourist`) is produced by one helper over registry ids. Ancient's frozen `ancient_history` keeps its shipped semantics (3.9.6 records the defect). | q3_product 23; AR-D23. |
| CU-D18 | **New lifetime counters live in `stats.eraStats[era][key]`** (AR 3.5.2) with the design key names kept as display aliases (`medBraceBreaks` = `eraStats.medieval.braceBreaks`); per-battle fields join `BattleSummary` additively; the ONE read helper `statOf(stats, 'medBraceBreaks')` hides the path. | the design bibles say "add to NUM_KEYS"; AR chose `eraStats` so `NUM_KEYS` (fixed in v8) stays Ancient. Both lose on rollback identically (AR PC9). |
| CU-D19 | **Era chrome is tokens, patterns, icons and shapes only**, scoped by `[data-era="<id>"]` on the roots of briefing, placement, results, HUD, the era map and the chooser card; the only fonts are Bungee, Rubik, Cinzel (`uiscan` rule `fonts`). | q3_product 30; ui_chrome.md section 1 of each era. |
| CU-D20 | **Locks gate pickers, never the shared Daily.** Quick and Survival pickers show locked arenas/presets/styles with a lock and the unlock hint; the Daily draw uses the full era lists (everyone plays the same day). | Daily is "the same battle for everyone". |
| CU-D21 | **Take Command table, key half.** Cursor-aim, drive and altitude commands follow `M-layers` 3.9.8 exactly; this file adds only the UI half (class chip, rings, touch scheme at 390x844). | OI-L3. |
| CU-D22 | **Orders `hold_fire` / `take_cover` are rejected.** M9 is an AI repositioning rule (`ai.cover`), not a command; the existing `Hold` order already stops advance and M9's hold-and-shoot branch uses it. | plan CU13 "only if M9 supports them"; spec/M(-layers) define no command type. |
| CU-D23 | **The announcer engine is parameterised, not forked**: `createAnnouncer({era, pool, routes})` (CU18); `bypassAlternation` is a new optional field of `offer(..., extra)` with default false (Ancient byte-identical). | AP-C04. |
| CU-D24 | **Plato "MUTED" is a mission-level voice state** (`voices: {plato: 'muted'}` in the mission rules), decorated onto every line of that voice by one function (3.19.1); it is data, not text. | Modern R10; the label must be on briefing, booth, beats and set-piece bubbles. |
| CU-D25 | **Fresh-profile detection** = `stats.battles == 0` and no key in `progress.stars` and no collection item. A fresh profile gets NO what's-new card and every released era is written into `seen.whatsnew` silently; its chooser pre-focuses Ancient (first in ERA_ORDER). | q3_product walks (a)(b); flow table 3.6.4. |
| CU-D26 | **`lastEra` derivation** for a profile without it: the era with the most stars, Ancient on a tie (VF A3). | AR 3.5.5 step 2 (all v8 stars are Ancient -> `ancient`). |
| CU-D27 | **Set-piece camera authority.** A set-piece shot overrides recent user camera input (`priority 2`) but is deferred or dropped by possession, photo mode, the kill-cam and an armed god-power aim; in `cinematic` camera mode it becomes a director hint. A click or Esc skips it and is consumed. | 3.3.5; users orbit constantly, so `userInput` must not drop authored moments (RA's `canShot` is called with the priority override, request R-CU-R1). |
| CU-D28 | **Quick presets are a registry kind** (`QUICK_PRESET`, idmap): arena variants, Quick-only arenas, enemy styles and battle bundles; each may carry `unlock: <key in progress.unlocks>`. Ancient has none. | CU11 "Quick unlock is real". |
| CU-D29 | **Codex dossiers.** Unit stats, model, counters stay visible; the lore/joke "dossier" of a NEW-era unit is locked until `progress.codex.open[unitId]` (written by a mission reward) or until the unit has been fielded 5 times (`stats.byDef[id].spawned >= 5`). Ancient entries are never locked. | makes the "Codex: X" reward chips a real read AND write without blocking Quick players. |
| CU-D30 | **Phone**: campaign, chooser, quick, survival, daily, puzzles, codex, achievements, stats, settings are playable at 390x844; the two editors keep the friendly notice. Shots are capped at 3 s on phone. | v8 UI10 + Sci-Fi first_three_minutes edge case 12. |
| CU-D31 | **Hot-file budget**: `meta.js` <= 3 integrated touches after P1 (AR 3.10.4): the three touches are named in 3.20 (registry reads + `recordCampaign`; director wiring + `timeScale`; announcer and teaching adapters). Everything bulky is in new files owned by INTEGRATION or UI. | OW-10. |

## 3. Detailed specification

### 3.1 CU1: factories, facade and the era UI row

Factories are AR 3.6.1 (`createCampaign`, `createPuzzles`, `createSurvival`, `createDaily`; Ancient wrapped, identity preserved: `content.campaigns.ancient.missions === MISSIONS`). This section fixes what the UI may call and what it may assume.

#### 3.1.1 The facade the UI sees (`src/content/shared/campaign_facade.js`, owner REGISTRY; installed by `buildContent` as `content.campaignApi`)

| member | signature | behaviour (unknown or hidden id: `null` / `false` / `[]`, never a throw; `modes.js` refuses to start, AR 3.6.4) |
|---|---|---|
| `missions` | getter -> `Mission[]` | the missions of `content.currentEra` (legacy shape; the same array object as `campaigns[era].missions`) |
| `missionById(id)` | -> `Mission \| null` | any released era |
| `eraOf(id)` | -> era id \| `null` | `registry.eraOf` for mission and puzzle ids |
| `nextMission(progress, era = currentEra)` | -> `Mission \| null` | first unlocked mission of that era with 0 stars; `null` when the era is complete |
| `nextAfter(mission)` | -> `Mission \| null` | `campaigns[eraOf(mission.id)].missions[mission.index + 1] \|\| null`: the own-era list only (fixes `meta.js:556,566`, which indexes a merged list) |
| `isUnlocked(mission, progress)` | -> boolean | index 0 always open; otherwise >= 1 star on the predecessor IN THE SAME ERA |
| `starsFor(mission, progress)` | -> 0..3 | `progress.stars[mission.id]` clamped |
| `totalStars(progress, era?)` | -> number | MISSION ids only (puzzle ids excluded); no `era` = sum over released eras |
| `maxStars(era?)` | -> number | 27 per era; no `era` = `27 * released.length` |
| `evaluateStars(mission, summary)` | -> `{stars, earned:[b,b,b]}` | era statTable for costs (AR 3.6.1 `cfg.statTable`) |
| `rewardsFor(mission, before, summary)` | -> `{title, titleId, firstClear, improved, parts[], quick[], mutators[], codex[], milestones[]}` | ledger-backed (3.11.3); `parts` keys go to `progress.unlocks/parts`, `quick` keys to `progress.unlocks`, `mutators` ids to `progress.unlockedMutators`, `codex` ids to `progress.codex.open`, `titleId` to `progress.titles`, `milestones` from the star track (3.11.6) |
| `unlockedMutators(totalStars)` / `newlyUnlocked(before, after)` | -> ids | the shared nine by `MUTATOR_STARS` (CU-D10); era mutators come from `progress.unlockedMutators` |
| `arena setup rules forces objective marker summaryOf reference teachingBeats teachingSkip hash` | as `era_ancient/campaign.js campaignApi` | dispatched by the mission's era |

`content.eras[]` descriptors (AR 3.6.2) gain **no** UI fields; the UI reads `content.eraUI(era)` = `registry.byEra('UI', era)` (below). `content.setEra(era)` also persists `progress.lastEra` and creates `progress.eras[era]` (`opened: true`, `last: ''`, `cleared: false`) on first call: the single writer of those fields besides `meta.recordMission` (`last`, `cleared`).

#### 3.1.2 Progress helpers (`src/ui/hud/_progress.js`, owner UI; the only reader of progress for screens)

```js
releasedEras(ctx)        -> content.eras                         // [{id,name,short,accent,...}] in ERA_ORDER, released only
eraMissions(ctx, era)    -> content.campaigns[era].missions
eraProgress(ctx, era)    -> { era, stars, max: 27, cleared, opened, next /*mission id|null*/, titleId /*latest earned in this era|null*/, puzzleStars, puzzleMax: 18|6 }
lastEra(ctx)             -> progress.lastEra if released, else deriveLastEra()   // CU-D26: most stars, ancient on a tie
setLastEra(ctx, era)     -> writes progress.lastEra and progress.eras[era].opened
globalStarSum(ctx)       -> sum of every value in progress.stars (missions AND puzzles, all eras): the mutator rule (CU-D10)
totalStars(ctx, missions) -> existing signature; sums those missions only
titleDenominator(ctx)    -> 27 * releasedEras(ctx).length          // title badge "x / N"
isFreshProfile(ctx)      -> stats.battles == 0 && no key in progress.stars && no saved arena/soldier/army   // CU-D25
```
`isUnlocked(ctx, missions, i)` keeps its shape (m, `_progress.js:isUnlocked`); callers pass the era's own list.

#### 3.1.3 The era UI row (`src/content/era_<id>/ui.js`, leaf, default export; `data.js` key `UI`, byEra; owner UI with DESIGN-ERA-x for content)

| field | type | consumer | Ancient value (the v8 literal, so R1 is unchanged) |
|---|---|---|---|
| `id name short` | string | chooser, chips, Codex/Quick era tabs | `ancient`, `Ancient`, `Ancient` |
| `chooserName` | string | chooser card heading (Bungee) | `ANCIENT` |
| `accent` | `#rrggbb` | `--era-accent` fallback, chip dots, the title era strip | `#ffc93c` (the v8 gold) |
| `currency` | `{one, many, short}` | `fmtCost` (3.7) | `{ one: 'drachma', many: 'drachmae', short: 'dr' }` |
| `acts` | 3 x `{id, numeral, name, blurb}` | map legend, briefing/results act chip, pin cards | `[I Dawn of Bronze] [II Empires] [III Mythology Class]` (`campaign.js:12`) |
| `sub` | `{ campaign, map }` strings | campaign page subtitle, title tile sub when released >= 2 | `map: 'The Ancient Era: nine battles, three acts, one goat'` (`campaign.js:48`) |
| `chooser` | `{ still, caption, begin, continue, replay, newRibbon, clearedStamp }` | chooser card | `begin: 'Begin Ancient'`, `continue: 'Continue Ancient'`, `replay: 'Replay Ancient'`, `still: 'assets/era/chooser_ancient.webp'`, `clearedStamp: ''` (no stamp: the Ancient finale is frozen) |
| `portal` | `{ kind: 'pageturn'\|'copier'\|'warp'\|'scroll', ms: 1200, cue }` | time-portal (3.6.6) | `{ kind: 'scroll', ms: 1200, cue: 'ui_portal_ancient' }` |
| `arrival` | `{ heading, body, button, footers: [{ when /* callback flag */, text }] }` | `eracard kind=arrival` | `null` (no Ancient arrival card; R1 shows none) |
| `cleared` | `{ heading, body, stamp, footerNote }` | `eracard kind=cleared` | `null` |
| `passport` | `{ stamp: 'a goat' }` | Time Passport line | `{ stamp: 'a goat' }` |
| `whatsnew` | `{ title, body }` | what's-new card (3.6.10) | `null` (Ancient is never "new") |
| `map` | `ERA_MAP` (3.6.8) | `_map.js` | the v8 Mediterranean, moved verbatim into data (G8 equal) |
| `dioramas` | list of `[arena, factionA, factionB, seed, camera?]` | title diorama rotation (3.17.3) | the 7 v8 tuples of `game.js:646`, in order |
| `funny` | list of `{ key, fmt }` | Results funny stats (replaces `FUNNY_ORDER`, `meta.js:38`) | the 19 v8 keys, in order |
| `absurd` | list of `{ label, formula, sub }` | Stats tiles (3.9.7) | the 7 v8 tiles of `stats.js:44-52` |
| `difficulty` | `{ easy, normal, hard }` labels | Quick, Survival, Daily chip | `Peasant Mode`, `Citizen`, `Consul` |
| `assist` | `{ nudgeAt, revealAt }` or absent | CU15 | absent |
| `powerBlocked` | string or absent | disabled-power tooltip | absent (no Ancient mission disables a power) |
| `mechanics` | list of `{ id, name, icon, rule, tell, counter, taughtIn }` | Codex Mechanics tab | `[]` (the tab is absent for Ancient) |
| `questions` | `{ soak, crack, reach, answer }` unit-id lists or `null` | placement "Four Questions" chips | `null` |
| `loading` | `{ lines[20], frame: 'scroll'\|'folder'\|'ticket'\|'stub', marginalia }` | loading screen (3.17.4) | the 20 v8 lines (`ui_text.js LOADING_LINES`) |
| `tokens` | `{ cssClass }` | `[data-era]` block names | `''` (Ancient has no `[data-era]` block: its chrome is the v8 CSS) |

The Ancient row is a NEW file `src/content/era_ancient/ui.js` (AP-C02 pattern, REGISTRY) that re-exports existing literals; it adds no behaviour. A test (CU-T01) asserts that every v8 literal it reproduces equals the string still found in the FZ source by reading that source.

Medieval, Modern and Sci-Fi rows are authored from the design bibles: `accent` `#c8501e` / `#12a37f` / `#35e0ff` (m, `ui_chrome.md` section 1 of each era), currency `groat gr` / `requisition rq` / `erg erg`, chooser captions verbatim from `ui_chrome.md` section 2, acts and legend lines verbatim from section 3, dioramas from section 4, `loading.frame` `scroll` / `folder` / `stub`. Difficulty labels (provisional, `spec/H` final): Medieval `Page / Squire / Knight`, Modern `Probation / Permanent / Management`, Sci-Fi `Cadet / Operative / Director` (Sci-Fi from `feel_sheet.md` s9).

#### 3.1.4 Registry kinds this file adds (amendment AM-AR-CU1 to AR 3.1.2 `KIND_TABLE`)

| `data.js` key | kind | merge | row |
|---|---|---|---|
| `UI` | `ui` | byEra | the era UI row above |
| `SCOUT_TEXT` | `scout_text` | byEra | code -> `{ who, text, variants: [{ who, text }] }` (3.14.3); Ancient = `humor/scout_text.js` re-exported |
| `REWARD` | `reward` | idmap | the ledger row (3.11.2); id prefix = the era prefix + `_r<n>_` (`med_r1_foam_swords`, `mod_r1_tin_hat`, `sf_r1_fishbowl`) |
| `QUICK_PRESET` | `quick_preset` | idmap | 3.10.2 |
| `MILESTONES` | `milestone` | idmap | 3.11.6 (meta pack only) |

`SETPIECES`, `GOD_POWERS`, `TEACHING_BEATS`, `UNLOCKS`, `THEMES` already exist in AR's table; their ROW schemas are this file's (3.3.1, 3.12.1, 3.5.1).

#### 3.1.5 Save keys introduced or extended by this file (amendment AM-AR-CU2 to AR 3.5.2; no version bump, nothing new in `EXPORT_KEYS`)

| key | doc | shape and cap | writer | note |
|---|---|---|---|---|
| `seen.basics` | seen | `true` (all slots seen) OR `{ place, fight, speed, powers, done: ms }` | teaching, Skip tutorial | extends AR's `true\|ms`; derived `true` when `seen.teaching` or `settings.seenHints.teaching` (AR 3.5.5 step 3) |
| `seen.beats` | seen | `{ [beatId]: ms }` <= 200 | teaching | AR |
| `seen.firstsight` | seen | `{ [toastId]: ms }` <= 200 | first-sight toasts | NEW |
| `seen.skipTips` | seen | `{ [era]: ms }` <= 8 | Skip era tips | NEW |
| `seen.arrival` | seen | `{ [era]: ms }` <= 8 | arrival card | NEW (design: own key `seen.arrival.<era>`) |
| `seen.cleared` | seen | `{ [era]: ms }` <= 8 | "<Era> cleared" card, Time Passport (key `passport`) | NEW |
| `seen.whatsnew` | seen | `{ [era]: ms }` <= 8 | what's-new card | AR |
| `seen.callbacks` | seen | `{ [sourceId]: true }` <= 400 | spec/H | AR |
| `progress.assist` | progress | `{ [missionId]: { d: defeats since the last win } }` <= 150 | `meta.recordMission` | NEW; the ladder (CU15) |
| `progress.codex.open` | progress | `{ [unitOrPageId]: ms }` <= 400 | `meta.recordMission` | NEW (CU-D29); `codex.locked[]` (v8, never written) is untouched |
| `progress.titles` | progress | `string[]` of reward and milestone ids, <= 200, order = earned | `meta.recordMission`, milestones | existing key, never written in v8 (map 06) |
| `progress.unlockedMutators` | progress | `string[]` era mutator ids | `meta.recordMission` | existing key, never written in v8 |
| `settings.corpsesAuto` / `corpsesChosen` / `goreMigrated` / `setpieceShots` / `assistLadder` | settings | booleans; defaults `true / false / false / true / true` | Settings | with `goreAuto` / `goreChosen` of AR 3.5.3; unknown scalar booleans are kept by the v8 import |
| `settings.seenHints.<era>_power_<slot>` | settings | NOT used: power captions use `seen.beats` (3.12.5) | | |

Validators: `validateProgress` (+4 lines for `assist`, `codex.open`, `titles`, `unlockedMutators` shape guards, `docs.js:188`), the `seen` Doc option `{ isObj: true, maxKeys: 1000 }` (AR 3.5.2), `validateSettingsData` (new scalar booleans pass the existing unknown-scalar branch; they are also listed in `DEFAULT_SETTINGS` so the new build validates them as booleans).

### 3.2 CU2: the mission validator with an era argument

`src/content/era_ancient/campaign_validate.js` is edited under AP-C03 (OW-37) and keeps its default behaviour: `validateMission(m, o = {})` and `validatePuzzle(p, asMission, o = {})`; all 40-odd existing checks and their message strings are unchanged (the existing negative controls in `tests/campaign/*` stay green). New option keys:

```js
validateMission(m, o = {})
  o = { mutatorStars, puzzle,                // existing
        era: 'ancient',                      // NEW: selects eraRules(era); default = the module constants, bit-identical
        defs,                                // NEW: the era's sim defs (for missionAirProblems and layer checks); default buildSimDefs()
        kit }                                // NEW: registry.kitFor(era) (powers, mutators, weather kinds)
eraRules(era) -> { statTable, unlocks, recipes, objectiveTypes, markerTypes, markerFor, acts: [1,2,3],
                   maxMarkers: 8, budget: [500, 40000], typeCap: 16, mechanics, helpers, moduleNames, setpieces, powers, utilityUnits }   // src/content/shared/mission_rules.js, REGISTRY
```

**Objective types** (closed; `OBJECTIVE_TYPES` of the era): Ancient `eliminate kill_general hold_hill protect_vip survive_waves destroy` (6, unchanged); the three new eras add `capture defend_core escort` (9; M14 `createObjective`). `destroy` entries gain `{def}` and `{tag}` beside `{props}`.

**Marker types**: Ancient `hill exit vip_start general_spawn waypoint` (5); the new eras add `capture` and `core` (7). The cap of 8 markers and the radius rule 1..30 stay; the coordinate rule is `|x|,|z| <= SIZES[size] * 0.25` (m: small 32, medium 48, large 64), matching the `missions_outline.md` marker ranges.

| objective | required markers | required params and data | new problem strings (each has a fixture in CU-T02) |
|---|---|---|---|
| `eliminate` | none | none | (unchanged) |
| `kill_general` | `general_spawn` | `enemy.generals` non-empty, each in the enemy army | (unchanged) |
| `hold_hill` | `hill` | `params.time > 0` | (unchanged) |
| `protect_vip` | `vip_start` and `exit` | a free VIP in `fixed` | (unchanged) |
| `survive_waves` | none | `script.waves.list.length >= params.waves` | (unchanged) |
| `destroy` | none | exactly one of `params.props[]`, `params.def`, `params.tag` | `destroy needs props, def or tag`; `destroy def <id> is not in the enemy army` |
| `capture` | `n` markers of type `capture`, `need <= n <= 8` | `params.need` 1..n, `params.hold` seconds > 0 (default 20) | `capture needs <need> capture markers, found <n>`; `capture.need out of range` |
| `defend_core` | one `core` marker | `params.time > 0` and a destructible prop of `params.coreProp` in `arena.props` within the marker radius | `defend_core needs a core marker`; `defend_core: no <coreProp> inside the marker` |
| `escort` | `vip_start` and `exit` | a VIP in `fixed`; `params.mode == 'path'`; a vehicle VIP also passes `missionAirProblems` and the corridor check of `spec/W` W10 | `escort needs a VIP`; `escort exit unreachable for move class <c>` |

**Additional checks for non-Ancient eras** (all skipped when `o.era` is `ancient` or absent, so Ancient behaviour is unchanged):

1. every unit id (`roster`, `core`, `reference`, `fixed`, enemy `groups`/`placements`/`generals`, wave groups) has `registry.eraOf(id) === o.era` or is in `utilityUnits` (AR 3.3.2); message `<kind> unit <id> belongs to era <e>, not <era>`;
2. `missionAirProblems(m, {defs, era})` (M-layers 3.11: the AA guarantee in `reference` and in the enemy-air missions);
3. `setpiece.id` resolves in `registry.table('setpiece')`, is owned by `o.era`, and the mission script emits it: `script.events[].do[]` contains `{op:'setpiece', piece: <id>}` (M14 op); a mission without exactly one reachable set-piece, or a set-piece no mission references, is a problem (every mission has exactly one, plan section 8);
4. `teaches[]` ids exist in `era.ui.mechanics` or the era mechanic list; at most one new mechanic per mission and the curve rules (`>= 5` objective types per era, star-3 mechanics taught earlier, act finales combine >= 2 earlier mechanics) are checked by `validateEra(list, o)` (new export; MS owns the rule text, this file owns the call);
5. `starTests[].helper` is in the closed vocabulary and its args type-check (`validateStarTests`, `spec/MS`); `rewardId` resolves in `REWARD` and `REWARD[rewardId].mission === m.id`; every `rewards.unlockParts` key is in `UNLOCKS`; every mutator id is a shared mutator or an era mutator of the same era;
6. `voices` (3.19.1): keys among `brutus plato cassandra`, values `'muted'` only;
7. `rules.powers.disable[]` ids exist in the era's six GodPowers; `rules.powers.override[id]` keys are within `{cd, delay, r, dur, effect.params.<key>}` where `<key>` is a param of that power's effect (3.12.4); `override` on `id`, `slot`, `kind`, `cue`, `icon` is a problem; a puzzle with `godPowers: true` and a `disable` list is a problem (puzzles turn all six off);
8. `par` is `{type:'cost'|'time'|'none', value}`; for `cost` `value < budget`; briefing/star texts contain only placeholders (`{par}`, `{secs}`, `{n}`, `{unit}`) or literals equal to the helper argument (`copyTruthProblems`, `spec/MS`);
9. `roster`: `null` means "every unit of the era plus utility units" and is legal for the new eras; `core`, `reference` are subsets of the effective roster; the enemy type cap is 16 per team (existing rule) and the reference cap is 16 (existing rule);
10. `requiresModules[]` are known module NAMES (M0..M17e; `moduleNames`), each present in the era's E-FREEZE prefix (AR/M 3.2); a mission requiring a module outside its era's prefix is a problem;
11. `firstThreeMinutes` exists on mission 1 only and each of its `beats[]` ids resolves in the era's `TEACHING_BEATS`.

`validatePuzzle(p, asMission, o)` passes `o` through (so puzzle ids, rosters and arenas are checked against the era). `tools/contracts.mjs` gains a per-era campaign section (`--era`): all missions through `validateMission(m, {era, defs, kit})`, all puzzles through `validatePuzzle`, then `validateEra`. The 9 Ancient missions must pass with `o.era` omitted AND with `o.era = 'ancient'` (CU-T02).

### 3.3 CU3: script events, the `SETPIECES` registry kind and the ONE dispatcher

Facts verified in the shipped tree (m): `meta.js onEvent` [393-418] is the only world-event pump of the meta layer and already forwards `battle_start`, `unit_brace`, `god_power` to teaching and every event to the announcer; `CameraRig` [cameras.js] has no `shot` (RA 3.11 adds it); `KillCam` [meta.js:224] saves/restores the rig and calls `game.setSpeed(0.25)`; `cues.js` has exactly three generic stingers (`stinger_epic`, `stinger_funny`, `stinger_hero_down`) behind `stingerOk(t, gap = 15)` [cues.js:286]; the audio router subscribes to world events itself (`bus.onAny -> router.handle`, `engine.js:476-485`), so any event name it has a handler for is played from there as well. Hence the dispatcher rules below.

#### 3.3.1 `SETPIECES` row (registry kind `setpiece`, idmap, data file `era_<id>/setpieces.js`; ids `med_sp_*`, `mod_sp_*`, `sf_sp_*`; 9 per era, one per mission)

```js
{ id: 'sf_sp_lunch_served', mission: 'sf_lunch_break',
  shot:   { from: Look | null,            // null = the current camera
            to:   Look,
            dur: 2.0, hold: 2.0,          // seconds, real time; dur + hold = the 3-6 s of the design tables
            ease: 'lin'|'io'|'in'|'out'|'spring',
            fov?: deg, shake?: 0..1, kick?: 0..10,
            priority: 2,                  // set-pieces are 2; scripted tutorial pans are 1; RA canShot treats >= 2 as overriding userInput (R-CU-R1)
            defer: 'drop' }               // or 'wait' (aim only, <= 1.5 s, 3.3.4)
        | null,                           // a moment without a camera channel is legal only in the finale cards, never in a mission
  slow:   0.5,                            // time-scale factor while the shot runs (1 = none)
  announcer: { cat: 'campaign_sf_lunch_break', sub: 'mid', pri: 5, bypassAlternation: true, delay: 0.5, slots?: {} },
  stinger:   { cue: 'sf_stg_klaxon', kind: 'comic'|'hit'|'swell'|'dread'|'fanfare', bypassLimiter: false, duckDb: -6, duckMs: 700 },
  sfx:       [ { cue: 'dome_crack', at: 'event'|'camera'|[x, z], delay: 0 }, ... up to 4 ],
  hint:      3,                           // weight of the cinematic-director hint when the camera is in cinematic mode
  filmstrip: [0, 1.2, 2.4, 3.6] }         // seconds after shot start at which ER20 captures its 4 frames
Look = { at: [x, z] | { anchor: 'event'|'player_line'|'enemy_centroid'|'player_centroid'|'arena_centre' } | { marker: '<id>' } | { unit: '<defId>' /* lowest-id live enemy of that def */ },
         y?: u /* above ground */, dist: u, yaw: rad | yawRel: rad, pitch: rad }
```
`Look` is `RA 3.11`'s with one extension: `anchor` and `unit: '<defId>'` are resolved by the dispatcher to `at:[x,z]` / `unit:<id>` BEFORE `rig.shot` is called (the rig never learns anchors). The design tables name camera anchors in prose (`player_line`, `enemy_centroid`, markers); CAMPAIGN-x converts them into this form in `setpieces.js`. Validation (CU2 rule 3, CU-T07): every `cue` resolves to a manifest row or a synth recipe (V09), `announcer.cat` is `campaign_<missionId>` of the row's mission, `dur + hold` in [3, 6], `sfx.length <= 4`, `slow` in {0.5, 1}.

The sim emits only the id. M14's script op `{op: 'setpiece', piece, x?, z?}` produces `setpiece {piece, x, z}` (m, spec/M 3.12); when `x, z` are omitted the sim fills the mission centroid.

#### 3.3.2 Fan-out table (the ONE dispatcher: `class SetpieceDirector` in `src/app/setpiece.js`, owner INTEGRATION, wired only in `meta.js`)

`createMeta` builds `M.setpiece = new SetpieceDirector({ game, announcer, audio, settings, registry })`; `meta.js onEvent` gains one line: `case 'setpiece': M.setpiece.fire(p, w); break; case 'script_beat': M.setpiece.beat(p, w); break;`. The five channels of ER20, in firing order:

| # | channel | what `fire(p)` does | owner of the other side | when it cannot fire |
|---|---|---|---|---|
| 1 | **event** | records `trace[]` entry `{piece, tick, t, channels}`; resolves the row (`registry.get('setpiece', p.piece)`); unknown id -> `diag.error('setpiece', ...)`, `channels.event = 'unknown'`, nothing else fires | sim (M14) | battle already finished |
| 2 | **stinger** (t = 0) | `audio.stinger(row.stinger.cue, { bypassLimiter, duckDb, duckMs })` (R-CU-A1); the engine plays on the `sfx` bus at priority 100 and calls `duck('music', duckDb, duckMs)`; the generic limiter `stingerOk` is bypassed only when `bypassLimiter`, but `lastStinger` is always updated so a generic stinger cannot stack within 15 s | AUDIO | audio not unlocked (returns false, trace `'locked'`) |
| 3 | **shot** (t = 0) | resolves `Look`s, builds the RA spec (below), calls `game.rig.shot(spec)`; on a handle: `game.pushTimeScale('setpiece', row.slow)`, `handle.done.then(() => game.popTimeScale('setpiece'))` | RENDER (`rig.shot`) | the policy of 3.3.4 |
| 4 | **announcer** (t = `delay`) | `announcer.offer(cat, sub, slots, { pri: 5, bypassAlternation: true, delay })`, then the normal `nextLine()` pump publishes it; `bypassAlternation` lets the line be spoken by the same voice as the previous line (CU18) | COMEDY (templates with `cond.sub`) | speed above `fastSpeed` never blocks pri 5; category cooldown 20 s per `cat:sub` is respected (each set-piece has its own `sub`) |
| 5 | **sfx** (each at its `delay`) | `audio.play(cue, { x, y, z })` for each row entry; `at: 'camera'` uses the listener position | AUDIO | audio locked |

`RA` spec built from the row: `{ id: row.id, from, to, dur, hold, ease, fov, shake, kick, speed: row.slow, priority: row.shot.priority, defer: row.shot.defer, rm: 'cut' }`. On phone layout (`layoutOf(ctx) === 'phone'`) `dur` and `hold` are scaled by `min(1, 3 / (dur + hold))` (CU-D30).

Other events consumed by the same director (no channels beyond those named):

| sim event | handler | effect |
|---|---|---|
| `script_beat {beat}` | `beat` | teaching trigger `beat:<id>` (3.5.3) and, if the era announcer has a template with `cond.sub === 'beat:<id>'`, `offer('campaign_' + mission, 'beat:' + id, {}, { pri: 4 })`; never a shot or stinger |
| `battle_end` | `end` | cancel a running shot (`cancel('end')`, the rig restores), pop the time scale, close the trace, publish it as `game.run.setpieces` |
| `stalemate_warning`, `intervention`, `battle_end` with `reason: 'intervention'` | `interlude` | era overlay (3.3.7) |

Static guarantees (CU-T07): (a) `grep -rn "'setpiece'" src` finds a handler only in `src/app/meta.js` (the subscription) and `src/app/setpiece.js`; (b) `audio/cues.js createRouter().handle('setpiece', ...)` has no `H.setpiece` entry (m: `handle` returns at once for a type without an `H` entry, `cues.js:524`); (c) `render/battleview.js` has none.

#### 3.3.3 Time scale and speed policy (CU-D04)

`Game` gains (INTEGRATION, `game.js`, AP-P02): `this.ts = 1` (effective factor, exactly `1` when no owner), `pushTimeScale(owner, k)` (stores `k` clamped to [0.25, 1] under `owner`, recomputes `ts = min(all)`), `popTimeScale(owner)`. `Game.frame` changes two expressions: `this.acc += Math.min(dt, 0.1) * this.speed * this.ts` and `const rdt = this.paused ? 0 : dt * this.speed * this.ts` (multiplying by exactly 1 is bit-exact: Ancient unchanged). `setSpeed`, `getSpeed` and the `speed` event are untouched; the announcer's `fastSpeed` gate reads `getSpeed()`.

| situation | rule |
|---|---|
| shot running, player at 1x | sim runs at 0.5x for the shot (`dur + hold` real seconds = half that in sim seconds) |
| player at 2x or 4x | the factors multiply (4x * 0.5 = 2x); shots are NOT dropped by speed; the announcer line (pri 5) passes `fastP5Need` |
| paused (Space, pause menu) while a shot runs | the shot is cancelled with reason `pause` and the rig restores; the time-scale entry is popped |
| kill-cam | mutually exclusive: the kill-cam starts only in `ended`, where `battle_end` has already cancelled any shot; `KillCam` is unchanged and keeps `setSpeed(0.25)` |
| determinism | ticks stay 30 Hz; only wall-clock pacing changes; the replay/input log is untouched; the director records `{tick, piece, shot: 'ran'\|'cut'\|'dropped:<why>'}` in `game.run.setpieces` (q3_engine 34) |
| two set-pieces close together | the second shot waits (RA: equal priority waits <= 6 s) and is dropped after that; its other four channels fire at once |

#### 3.3.4 Input policy (what defers, drops or hints the shot)

| state at fire time | shot | other four channels | note |
|---|---|---|---|
| Take Command active (`game.possessId`) | dropped, `dropped:possess` | fire | the player steers the camera; a takeover would be hostile |
| god-power aim armed (`meta.aim.active`) | waits <= 1.5 s for the aim to end, then `dropped:aim` | fire | the cursor must not slide under the player's hand |
| photo mode (`rig.mode === 'photo'`) | dropped, `dropped:photo` | fire | |
| cinematic camera mode (`rig.mode === 'cinematic'`) | no `rig.shot`; `rig.hint(x, z, 'event', row.hint)` (weight 3 bypasses the director lock) | fire | the cinematic director frames the moment itself; trace `shot: 'hint'` |
| kill-cam or battle ended | dropped | not fired (battle over) | |
| user touched the camera in the last 4 s | **runs** (set-piece priority 2 overrides `userInput`, R-CU-R1) | fire | authored moments beat idle drift; Esc/click skips |
| `settings.setpieceShots === false` | no shot channel (`shot: 'off'`) | fire | Cinematics group in Settings > Gameplay (3.9.8) |
| Reduce Motion | `rm: 'cut'`: jumps to `to`, holds `min(hold, 1.5)` s, no dolly, no shake, no kick; the 0.5x slow still applies for that hold | fire | RA 3.16 |

**Skip.** While `meta.setpiece.active` (a shot is running), `Esc`, any key, a pointer press on the canvas or the HUD cancels the shot (`cancel('skip')`, rig restores, time scale pops) and the event is **consumed**: `app/input.js` and `Game.pointerDown` test `meta.setpiece.active` first and return, so the Esc does not open the pause menu and the click neither selects nor casts. After the shot (finished or skipped) input behaves normally on the next event.

**Arbitration with teaching** (3.5.5): a running shot hides any visible beat or toast (hidden, not skipped; re-queued 3 s after the shot ends). The set-piece beats the beat.

#### 3.3.5 Camera authority and requests

`RA 3.11` defines `rig.shot`, `rig.canShot()` and the reasons `command|userInput|killcam|photo|shot`. This file requires two small additions (RENDER, request R-CU-R1): `rig.canShot(spec)` ignores the reason `userInput` when `spec.priority >= 2`; `rig.shotActive()` returns the running handle or null (used by the skip rule above). Everything else is RA's. Test `RA-T14` plus CU-T08 cover the combination.

#### 3.3.6 Stinger kinds and the limiter

Kinds (AUDIO taxonomy of `missions_outline.md` 0.2): `comic` (brass/woodwind gag), `hit` (single accent), `swell`, `dread`, `fanfare`. All duck music `-6 dB` for `700 ms`. `bypassLimiter: true` is allowed on at most TWO set-pieces per era (the dragon / boss and the finale); a third is a CU2 problem. Three generic stingers are reused per era (`stinger_epic`, `stinger_funny`, `stinger_hero_down`, m); the per-set-piece stinger cues are new rows counted in the `spec/AU` matrix (`*_stg_*`, 9 per era = 27).

#### 3.3.7 Stalemate interludes (the UI half of the era interventions)

The stalemate watchdog (`world.js _checkEnd`; times from the era kit) emits `stalemate_warning {t}`, `intervention {kind}` and ends the battle with `reason: 'intervention'`. The design bibles stage each era's watchdog with a UI element; `era.ui.interlude` carries them:

| era | warn | draw | component |
|---|---|---|---|
| Ancient | none (v8 behaviour: announcer + Zeus) | none | none (R1 unchanged) |
| Medieval | trumpet (audio only) | curtain drops from the top edge, 1.2 s | `curtain` |
| Modern | PA click (audio only) | rubber-stamp tick overlay, 0.6 s thud | `stamp` |
| Sci-Fi | "STANDBY" pictogram badge on the minimap | banner "RATED G, FOR GLOWING" letterbox | `standby`, `banner` |

Implemented by one HUD module `src/ui/hud/interlude.js` (`slot: 'overlay'`, `keepHidden`), driven by `game.on('interlude', {kind})` that the director emits. Reduce Motion: static (no thud animation, curtain appears at rest). Strings from `spec/H`.

#### 3.3.8 Harness hook and trace (ER20, `campaign_play`)

`world.step()` slices do not run `Game.frame`, so a shot would never progress in the harness (q3_product 7). `Game.pump(seconds, dt = 1/30)` (INTEGRATION; request R-CU-I1) calls `frame(dt)` that many times with `engine.render` skipped (`this.headless = true`); the same World advances by the same deterministic ticks as in play (at `speed * ts`). `campaign_play` calls `game.pump(0.25)` in a loop whenever `meta.setpiece.active` or an expected set-piece id is armed, and takes the 4 filmstrip frames at `row.filmstrip` offsets with `game.shot()` (canvas PNG). Final state equality is asserted on `stateHashFull` at the end tick, which `pump` cannot change (ticks are ticks). `M.setpiece.trace[]` is the ER20 evidence: for the reference run every entry must show channels `event, stinger, shot ('ran'|'cut'), announcer ('offered'), sfx (n >= 1)`; a legitimately deferred entry is reported, never counted as pass.

#### 3.3.9 Tests (rows in section 4: CU-T07, CU-T08)

Five channels fire for each of the 27 set-pieces in `campaign_play` (reference run); a fake rig/audio/announcer unit test proves each channel, the drop reasons of 3.3.4, the skip-consumes-the-click rule, `pushTimeScale` min semantics and that `Game.getSpeed()` never changes; negative control: make the director call `game.setSpeed(0.5)` -> the `speed`-event test goes red.

### 3.4 CU4: gore `auto`, corpses `auto`, tone

#### 3.4.1 Facts verified in the shipped tree (m)

`store.js DEFAULT_SETTINGS` has `gore: 'red'`, `corpses: 'stay'`; `Settings` constructor is `Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}))` and `set()` writes the WHOLE object, so every v8 profile that ever changed any setting stores `gore: 'red'` (and `corpses`) explicitly; a profile that never saved settings stores nothing. `transfer.js ENUMS` = `{ gore: ['red','wine','confetti','off'], corpses: ['stay','fade','none'], ... }` and `validateSettingsData` THROWS `Setting 'gore' has an unknown value` for anything else (and the same for `corpses`): a v8 build cannot import a code carrying `auto`. `quick.js:40` defaults `corpses` to `'fade'` when settings are unreadable; `BattleView` treats `fade` like `none` (only `stay` keeps a corpse, `battleview.js:343`). No share code other than the whole-save export carries gore (m: `share.js`, `validate.js` contain no `gore`).

The 15 consumers (AR 3.5.3 lists 13 for gore; corpses adds the last two): `save/store.js:66` (defaults), `save/transfer.js:49` (ENUMS), `app/game.js:63` (BattleView ctor), `:95` (`newSetup` rules), `:132` (`view.gore/corpseMode` at `begin`), `:650` (diorama rules `gore: 'red'`), `app/main.js:129` (live `settings.on`), `app/modes.js:8` (`KEEP`), `ui/screens/quick.js:40` (defaults), `:159-160` (segmented controls), `:280` (setup rules), `ui/screens/settings.js:46-47`, `render/battleview.js:40,275,333,343`, `render/fx.js:67` (`splat`), and `ui/mockctx.js:104,399` (test data).

#### 3.4.2 Settings design (amends AR 3.5.3 for corpses; the gore text of AR stands)

`settings.gore` and `settings.corpses` ALWAYS hold a legacy enum value. New booleans: `goreAuto` (default `true`), `goreChosen` (default `false`), `corpsesAuto` (`true`), `corpsesChosen` (`false`), `goreMigrated` (`false`; true only for the what's-new line, 3.6.10). They are added to `DEFAULT_SETTINGS` and to the `validateSettingsData` boolean path (unknown scalar booleans were already kept by v8, so a rollback keeps them). The pure migration runs in the `Settings` constructor on the STORED blob **before** the defaults merge (otherwise the merged defaults would hide whether a marker existed) and on the output of `validateSettingsData`:

```js
// src/save/settings_migrate.js (REGISTRY; pure)
export function migrateSettings(raw) {
  const o = Object.assign({}, raw);
  const stored = Object.keys(o).length > 0;                         // false for a profile that never saved settings
  if (o.goreChosen === undefined) {
    if (typeof o.gore === 'string' && o.gore !== 'red') { o.goreAuto = false; o.goreChosen = true; }     // an explicit non-default choice stays
    else { o.goreAuto = true; o.goreChosen = false; o.goreMigrated = stored && o.gore === 'red'; }       // stored 'red' without a marker cannot be told from the default -> Auto
  }
  if (o.corpsesChosen === undefined) {
    if (typeof o.corpses === 'string' && o.corpses !== 'stay') { o.corpsesAuto = false; o.corpsesChosen = true; }
    else { o.corpsesAuto = true; o.corpsesChosen = false; }
  }
  return o;
}
```
`Settings.set('gore', v)` (any UI) writes `goreAuto = false, goreChosen = true`; `Settings.set('goreAuto', b)` writes `goreChosen = true`; the same for corpses. The constructor writes the migrated object back ONCE (`flush()`) only when a stored blob existed, so markers are frozen and a later default change can never re-migrate. Down-level: an export writes the stored legacy enum plus the booleans; a v8 import accepts it; a v8 export imported by the new build is migrated by the same function (G5 cases, 3.4.6).

A Red-by-choice v8 player is migrated to Auto, which is Red in Ancient and Medieval (matrix below), so their Ancient and Medieval looks are unchanged; only Modern and Sci-Fi render gentler, and the what's-new card names the setting (VF A8).

#### 3.4.3 `resolveGore` / `resolveCorpses` and the matrix (`src/content/shared/gore.js`, pure, owner REGISTRY; the ONE resolver used by all 15 consumers)

```js
resolveGore(s /* { gore, goreAuto } */, era, fxClass /* 'organic'|'armoured'|'machine'|'alien'|undefined */)
   -> { style: 'red'|'wine'|'confetti'|'puff'|'oil'|'goo'|'off'|null, palette: null|'violet' }
resolveCorpses(s /* { corpses, corpsesAuto } */, era, fxClass) -> { mode: 'stay'|'fade'|'none'|'ko'|'wreck', ttl: seconds }
```
Rules (RA 3.7 owns the particle numbers; this file owns the choice):

1. no `fxClass` (every Ancient def: `FX_CLASS` has no Ancient rows) -> `style = s.goreAuto ? 'red' : s.gore`; corpses `s.corpsesAuto ? 'stay' : s.corpses` with the v8 meaning of `fade`/`none`: **exactly the shipped code path** (AP: bit-identical).
2. `fxClass === 'machine'` -> `style` is the recipe's `gore.auto` (`oil`, or `null` for Medieval siege engines) in EVERY setting, including `off` (sparks and oil are not gore); corpses `wreck`.
3. `s.goreAuto` -> the recipe's `gore.auto`.
4. else `s.gore === 'off'` -> `off` (no blood, no goo, no puff-blood).
5. else `fxClass === 'alien'` -> `red` -> `goo`, `wine` -> `goo` with `palette: 'violet'`, `confetti` -> `confetti`.
6. else (organic, armoured) -> `s.gore` as stored.

| era : class | auto gore | `red` | `wine` | `confetti` | `off` | auto corpse | explicit `stay` | explicit `fade` | explicit `none` |
|---|---|---|---|---|---|---|---|---|---|
| ancient (any def) | red | red | wine | confetti | off | stay | stay | v8 (= none) | none |
| medieval : organic, armoured | red | red | wine | confetti | off | stay | stay | fade (last 1.5 s of ttl 10 s) | none |
| medieval : machine (siege, ram) | null (rubble, sparks, dust) | same | same | same | same | wreck | wreck | wreck | wreck |
| modern : organic, armoured | puff | red | wine | confetti | off | ko (fades after 8 s) | ko | fade | none |
| modern : machine | oil | oil | oil | oil | oil | wreck | wreck | wreck | wreck |
| scifi : organic, armoured | puff | red | wine | confetti | off | ko | ko | fade | none |
| scifi : machine | oil (+ sparks, arcs) | oil | oil | oil | oil | wreck | wreck | wreck | wreck |
| scifi : alien | goo (lime) | goo | goo violet | confetti | off | fade 10 s (sinks) | stay | fade | none |
| modern / scifi : shield | `shield_hit` / `shield_break` rings, no blood | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

Particle sets (definitions in RA 3.7): `red` the v8 splat; `puff` = 3 cream dust cubes `0xefe6d0` + 2 star cubes `0xffe27a`, size .09, life .35; `goo` = `0x7aff5a/0x2f8f3a`; `oil` = `0x1a1a1a/0xb8860b`; `ko` poses the static corpse from `REACTIONS[key].ko` (last frame of `death_ko`, a "tidy flop"). **Explicit corpse `none` removes corpses only: wreck props are sim props (M17e: non-blocking, cap 24, ttl 25 s) and stay.** The tone rule (feel sheets of Modern and Sci-Fi): organic non-alien units are knocked out ("I'm fine, just horizontal"), never wounded; no blood in Auto; the setting only ever changes what is drawn, never a rule or a score.

`BattleView` caches `{organic, armoured, machine, alien}` styles on `setWorld` and on a `settings.on` change of `gore|goreAuto|corpses|corpsesAuto`; `view.gore` / `view.corpseMode` stay strings (resolved for the Ancient path) for the tests that read them. `Game.newSetup` writes `rules.gore`, `rules.goreAuto`, `rules.corpses`, `rules.corpsesAuto` (legacy enum plus booleans); `modes.js KEEP` gains the two booleans; the diorama keeps `gore: 'red'` with `goreAuto: false` so title scenes never depend on the player's setting.

#### 3.4.4 Controls (labels, ids, text)

| surface | control | change |
|---|---|---|
| Settings > Gameplay | `#set-gore` segmented | with `released >= 2` a fifth segment `Auto` is added first: label `Auto`, tip "Each era draws its own style: classic red in Ancient and Medieval, puffs in Modern and Sci-Fi, oil for machines, goo for aliens. Cartoon either way." Selected = `goreAuto ? 'auto' : gore`. Choosing a legacy value writes `gore` + `goreAuto=false` + `goreChosen=true`; choosing `Auto` writes `goreAuto=true, goreChosen=true`. With R1 the control is the v8 four-segment control (G10 equal) and `goreAuto=true` behaves as Red in Ancient. |
| Settings > Gameplay | `#set-corpses` | same pattern; the `Auto` tip: "Auto: corpses stay in Ancient and Medieval, knocked-out soldiers fade in Modern and Sci-Fi, machines leave wrecks." |
| Quick Battle | `#qb-gore`, `#qb-corpses` | same five segments; `S.gore = settings.goreAuto ? 'auto' : settings.gore`; the setup rule is the resolved legacy enum plus `goreAuto` |
| What's-new card | one line | shown when `settings.goreMigrated` and `released >= 2`: "Gore style is now Auto: classic red in Ancient and Medieval, gentler in Modern and Sci-Fi. Change it in Settings > Gameplay." (wording final in `spec/H`) |

#### 3.4.5 Share-code field

No share code other than the whole-save export carries gore (3.4.1). The export's `settings` object carries `gore` (legacy enum as stored), `goreAuto`, `goreChosen`, `corpses`, `corpsesAuto`, `corpsesChosen`, `goreMigrated`; the code format `VW1.save.<...>` and `EXPORT_KEYS` are unchanged. The Daily result string carries no gore.

#### 3.4.6 Tests (CU-T09, CU-T10; G5 cases)

(1) v8 fixtures: `{}` (no blob) -> Auto, `goreMigrated` false; `{gore:'red'}` -> Auto, `goreMigrated` true; `{gore:'wine'}` -> `goreAuto false, goreChosen true`; `{gore:'red', goreChosen:true}` -> unchanged; the same four for corpses. (2) the fresh profile renders an Ancient kill red and a Modern kill with puffs (RA-T10) and exports `gore:'red', goreAuto:true`. (3) the new export imported by the baseline build is accepted and its `gore` survives a round trip. (4) a v8 export with `gore:'wine'` imported by the new build keeps Wine in every era. (5) matrix test: for the 9 era:class rows x 4 settings x 3 corpse settings `resolveGore/resolveCorpses` equals the table above; `off` never removes machine oil. (6) `Settings.set('gore')` from `settings.js` and `quick.js` writes the marker (negative control: drop the marker write -> the migration test goes red). (7) Ancient: `resolveGore(s, 'ancient', undefined)` equals the pre-change expression `s.gore` for all four values with `goreAuto=false`.

### 3.5 CU5: the teaching system

#### 3.5.1 Facts verified (m)

`TeachingGuide` [meta.js:54-92] is index-sequential (`trigger(name)` rejects `k <= idx`), has the hard-coded completion rules `place_spears` (>= 6 placed) and `god_power` (a cast), a static target map for the five Ancient ids, one global dismissal (`seen.teaching` / `settings.seenHints.teaching`), and is started only when `mission === MISSION_ORDER[0]` or `setup.teaching` [meta.js:380]. Triggers fed by `onEvent`: `placement_start` (at `start()`), `battle_start`, `first_contact` (first cross-team `unit_hit`), `cavalry_brace` (`unit_brace`), `battle_end`. `hud/teaching.js` renders `hud.teaching = {id, index, total, title, text, target, who, canSkip, ack}` and itself reads and writes `settings.seenHints.teaching` (lines 25, 65). The five Ancient beats are `place_spears, fight, god_power, counter, done` (m, `campaign_text.js:185-191`).

#### 3.5.2 Beat and toast schema (`src/content/era_<id>/teaching.js`, leaf; `data.js` key `TEACHING_BEATS`, byEra)

```js
export default {
  beats: [ Beat, ... ],       // mission beats: basics and era layers
  toasts: [ Toast, ... ],     // first-sight toast queue (unordered)
  triggers: { <name>: Grammar },   // era-specific trigger NAMES (3.5.3); merged over the shared table
};
Beat = { id: 'med_brace_place',
         layer: 'basics' | 'era',           // basics = the once-ever layer (CU-D06)
         slot: 'place'|'fight'|'speed'|'powers'|'done' | [slots]   // basics only: the persistence key (3.5.4)
         mission: 'med_dress_rehearsal' | null,   // null = any mission of the era
         trigger: Grammar | '<name>',
         after: 0,                          // seconds after the trigger (battle time in battle, real seconds in placement)
         phase: 'placement' | 'battle' | 'any',  // a pending 'placement' beat is dropped and marked when the battle starts
         who: 'brutus'|'plato'|'cassandra', text: '', hint: '', title?: '',
         target: 'powers'|'army'|'objective'|'minimap'|'speed'|'orders'|'announcer'|'selection'|'camera' | cssSelector | null,
         action?: { kind: 'placed', min: 6 } | { kind: 'power_cast', slot?: n } | { kind: 'ack' },   // what completes it; absent = timed (holdMs)
         show: true,                        // false = counts as seen without a card (the v8 `done` beat: `_finish()` fires inside `trigger`, the card never renders)
         ack: false,                        // show a "Got it" button
         holdMs: 6000,                      // battle display time when neither ack nor action completes it; placement beats are sticky
         prio?: 1..3 }                      // default: basics 1, era 2, slot fight/done 3
Toast = { id: 'fs_lancer', trigger: Grammar | '<name>', text: '<= 16 words', era scope implicit, ttlMs: 4000, queueMs: 12000 }
```
Medieval/Modern/Sci-Fi author these from their `first_three_minutes.md` files verbatim (ids, triggers, who, text, hint); the hint field is the "hint under the bubble"; `title` is `b.hint` of the legacy HUD (`title: b.hint` in the v8 `hud()`), kept for G10.

#### 3.5.3 Trigger grammar (closed) and the name table

`Grammar` is one of:

| form | meaning | evaluated by |
|---|---|---|
| `'placement_start'`, `'battle_start'`, `'first_contact'`, `'battle_end'` | lifecycle names (v8 semantics: first_contact = first cross-team `unit_hit`) | `meta.js onEvent` / `Game.begin` |
| `{ ev: '<eventType>', where?: { team?: 'player'\|'enemy', dstTeam?, def?, dstDef?, tag?, kind?, cause?, status?, outcome?, on?, n? } }` | the FIRST matching sim event; `where` keys are matched against the payload plus the def table (`tag`/`dstTag` come from the def of `id/src/dst`); an unknown `ev` or `where` key is a CU2 problem | `TeachingDirector.onEvent` |
| `{ sight: { def?, tag?, prop?, status?, layer?, team? } }` | the first matching unit or prop enters view (polled at 2 Hz; headless: within 70 u of the camera target); <= 0.2 ms per scan at 600 units (CU-T11) | `FirstSight` |
| `{ ui: 'select'\|'hover'\|'placed'\|'card', def?, role?, tag?, prop? }` | the player selects, hovers, places or clicks a card of that kind | `Game` select/hover/place hooks |
| `{ count: { id, gte } }` | `world.counters` (M14 fixed ids) reached `gte` | polled at 2 Hz |
| `{ scout: '<code>' }` | the placement scout report contains that code (3.14) | placement refresh |
| `{ wave_cleared: n }` | `world.waves.cleared >= n` (polled; `w.waves` is the shipped public field) | polled |
| `{ after: 'setpiece_end', piece }` | 0 s after a set-piece shot ends | director |
| `'beat:<id>'` | a `script_beat` with that id | director |

Shared name table (era `triggers` entries override). "Gap" = a fact no spec/M event carries; each gap has a request in section 3.21.

| name | grammar | source in spec/M | gap |
|---|---|---|---|
| `cavalry_brace`, `brace_break` | `{ev:'unit_brace'}` | existing `unit_brace {id, dst}` (m, `meta.js:411`) | none |
| `charge_first` | `{ev:'charge_hit'}` | existing | none |
| `banner_fall` | `{ev:'unit_kill', where:{tag:'banner', team:'enemy'}}` | `unit_kill` + the banner carrier def tag (M13) | none |
| `structure_hit` | `{ev:'prop_damaged', where:{team:'enemy'}}` | existing | none |
| `reload_start` | `{ev:'unit_reload', where:{team:'player'}}` | M2 | none |
| `reload_hit` | `{ev:'unit_hit', where:{dstReloading:true}}` | needs `unit_hit.dstReloading` | R-CU-S1 |
| `cover_hit` | `{ev:'unit_hit', where:{cover:true}}` | needs `unit_hit.cover` (M9 halving applied) | R-CU-S1; fallback: `unit_cover on:1` then any `unit_hit` on that id within 3 s |
| `pin_applied` | `{ev:'unit_suppressed', where:{team:'enemy'}}` | M2 | none |
| `armour_plink` | `{ev:'unit_deflect', where:{outcome:'bounce'}}` | M1 | none |
| `first_indirect` | `{ev:'projectile_launch', where:{kind:['shell','mortar','rocket']}}` or `{ev:'strike_call'}` | M2 / M10 | none |
| `mine_armed` | `{ev:'mine_laid'}` with `after: 3` | M11 (arming delay 3 s) | none |
| `air_spawn` | `{sight:{layer:'air'}}` | M7 | none |
| `repair_first` | `{ev:'unit_heal', where:{dstTag:'machine'}}` | existing `unit_heal` + def tag | none |
| `shield_hit`, `shield_break`, `shield_recover` | `{ev:<same>, where:{team:'player'}}` (rate-limited by the sim) | M4 | none |
| `cloak_on` | `{ev:'unit_cloak', where:{on:1}}` | M5 | none |
| `emp_cast` | `{ev:'emp_pulse'}` | M6b | none |
| `blink_cast` | `{ev:'unit_blink'}` | M13 | none |
| `strike_call` | `{ev:'strike_call', where:{src:'unit'}}` (a unit or station, never the player's god power; Sci-Fi R9) | M10 payload `src` | none |
| `mech_step` | `{ev:'mech_step'}` | NOT in spec/M | R-CU-S2: footfall event for `walker1`, <= 2 per second per unit; fallback `{sight:{tag:'mech'}}` |
| `hover_cross` | `{poll:'hover_over_liquid'}` | none needed: the director polls `unit.layer === hover` and the material under it every 0.5 s | none |
| `heal_first` | `{ev:'unit_heal'}` | existing | none |
| `wave_1_cleared` | `{wave_cleared: 1}` | polled | none |
| `capture_first` | `{ev:'capture_update'}` | M14 | none |

Each era's `triggers` table maps the names its designs use that are not in the shared table (Medieval: `fs_*` sight triggers, `med_*` beats such as "first hover over a gate" = `{ui:'hover', prop:'med_castle_gate'}`, "first trebuchet selected" = `{ui:'select', def:'trebuchet'}`, "select a ranged unit" = `{ui:'select', role:'ranged'}`).

#### 3.5.4 State, keys and the two layers

Three persistence keys inside `seen` (3.1.5): `basics` (keyed by SLOT: `place fight speed powers done`, so a Sci-Fi-first player's basics are "seen" for Ancient even though the ids differ), `beats` (keyed by beat id, once per profile; an era beat belongs to one era by id prefix and registry ownership), `firstsight` (toast ids). `seen.skipTips[era]` suppresses every beat and toast of that era. A beat is **seen** when `layer === 'basics' ? every slot of it is in seen.basics : seen.beats[id]`, or `seen.skipTips[era]`, or `seen.basics === true`. `isDismissed` of the v8 class is gone: no code outside `TeachingDirector` and the Settings screen reads or writes these keys.

Migration (load): `seen.basics = true` if `seen.teaching || settings.seenHints.teaching` (AR 3.5.5 step 3). Writes: when the five slots are all seen or Skip tutorial is used, the director ALSO writes the v8 keys `seen.teaching = true` and `settings.seenHints.teaching = true` (a rollback to v8 never replays the tutorial).

The Ancient beats are re-expressed as data by `src/content/shared/teaching_ancient.js` (REGISTRY; reads the FZ `campaign_text.js TEACHING_BEATS`, adds layers; the FZ file is untouched):

| Ancient id | layer | slots | trigger | action | note |
|---|---|---|---|---|---|
| `place_spears` | basics | `place` | `placement_start` | `{placed, min 6}` | text and hint verbatim |
| `fight` | basics | `fight`, `speed` | `battle_start` | none (timed 6 s) | the v8 hint already says "Space pauses. The speed keys change the pace" |
| `god_power` | basics | `powers` | `first_contact` | `{power_cast}` | |
| `counter` | era | | `cavalry_brace` | none, `ack: true` | the only Ancient era beat |
| `done` | basics | `done` | `battle_end` | `ack: true`, `show: false` | v8 marks it seen inside `trigger` (m, `meta.js:67`), so it never renders; kept silent for G10 |

Consequences, stated as test expectations (CU-T11): (a) a FRESH Ancient-first profile sees these cards in this order with the v8 DOM (G10 mission-1 flow: four visible cards, `done` silent; the step dots show 1..5 of 5); (b) a profile with `seen.basics` set (for example Sci-Fi first) opening Ancient mission 1 sees only `counter` (a documented G10 exception: the golden for that profile state is recorded at the same time, two signatures); (c) a returning Ancient skipper plays Sci-Fi mission 1: every Sci-Fi era beat fires, no basics; (d) a Sci-Fi-first profile sees the Sci-Fi basics once, then Ancient mission 1 shows `counter` only; (e) out-of-order beats fire once each; (f) a pending placement beat is dropped and marked when Fight is pressed (Medieval edge case 3); (g) a beat still queued at battle end is dropped and marked, except a queued BASICS beat, which is shown on the results screen as a compact tip (Sci-Fi rule 3).

Step dots: `index`/`total` are the position of the beat among the beats of the mission list not yet seen at battle start (equal to the v8 1..5 for a fresh Ancient profile).

#### 3.5.5 Delivery and arbitration (`TeachingDirector`, `src/app/teaching.js`, INTEGRATION; replaces `TeachingGuide` in `createMeta`; the v8 class stays exported for `tests/app/meta.test.mjs`)

A beat moves `idle -> pending (trigger matched) -> shown -> seen`, or `pending -> dropped (marked seen)`. One item (beat or toast) is visible at a time, with at least 5 s of nothing between two visible items in battle (placement: no gap). Beats whose trigger is `battle_end` (`b_done`, `*_b_done`) are rendered by the results overlay as a compact tip, never by the battle HUD. Display: beats with `action` or in placement are sticky; battle beats show `holdMs` (6 s); `ack` beats in battle auto-dismiss after 12 s (counted as seen); toasts show 4 s; a toast not shown within 12 s of detection expires unseen (it can match again later). The visible item is chosen by `prio` (era beats outrank basics; `fight` at t = 0 and `done` outrank all), then by detection order.

| blocker (highest first) | beat | toast | power caption | recovers |
|---|---|---|---|---|
| god-power aim cursor armed | hidden/wait | hidden/wait | n/a (it IS the aim hint) | 3 s after the cursor is released |
| set-piece shot running | hidden, re-queued | hidden | | 3 s after the shot ends |
| photo mode / kill-cam / results | hidden | hidden | | beats re-queue after photo; at results see 3.5.4 (g) |
| Take Command | shown unless its `target` is a HUD part hidden in command (`powers`, `orders`): those wait | shown | | on exit |
| pause | the card stays, timers stop | same | | |
| another beat or toast visible | queued (FIFO within `prio`) | queued, max 3, oldest expires first | | when it closes + gap |

Test CU-T12 builds one fake clock and overlaps a beat, a shot and an aim in every order; the invariant is "never two visible, never lost silently, aim > shot > beat > toast".

#### 3.5.6 HUD contract (`hud.teaching`, `ui/hud/teaching.js`)

`hud.teaching = { id, index, total, title, text, target, who, canSkip, ack, layer, skip: 'tutorial'|'era'|null, era }`. The HUD no longer touches `settings`: `Skip tutorial` calls `game.skipTeaching('basics')`, `Skip era tips` calls `game.skipTeaching('era')`; the card shows the button that matches the beat's layer (basics beat -> `#hud-teach-skip` "Skip tutorial"; era beat -> `#hud-teach-skip-era` "Skip era tips"); both are 44 px high. A visible beat targets a HUD part by `data-hud` id or a CSS selector (unchanged). Power captions: the first time each slot is armed in an era, the aim hint (`.hud-aim`) shows a second line with the power's `tutorialLine`; stored in `seen.beats['<prefix>_power_<slot>']` (`med_power_1`, `mod_power_1`, `sf_power_1`; Ancient has none).

The briefing shows the corner button (Medieval doc): "Skip tutorial" when the basics layer is incomplete, otherwise "Skip era tips" when the era has unseen beats, otherwise nothing. Settings > Gameplay gains "Replay tutorial" (clears `seen.basics`, `seen.teaching`, `seenHints.teaching`) and, per released era with tips, "Replay <Era> tips" (clears that era's `seen.beats`, `seen.firstsight`, `seen.skipTips[era]`, power captions); control ids `set-replay-tutorial`, `set-replay-tips-<era>`.

#### 3.5.7 Coverage (ER19)

`campaign_play --beats` reads the beat ids of each mission from `design/<era>/missions.json` and asserts every beat of every one of the 27 missions fires once (reference run) in the order the first-three-minutes files list, for the two populations of CU-T11 on mission 1 of each new era. First-sight toasts are asserted for missions 1..3 only (the designs list them); later missions' toasts are asserted by id when present.

### 3.6 CU6: the era chooser, era maps, transitions, cards and the title

#### 3.6.1 Facts verified (m)

`title.js` sums EVERY value of `progress.stars` (missions and puzzle ids alike, `title.js:22`) against `campaign.missions.length * 3` (27) for the Campaign badge, and draws a `vw-title__roadmap` chip from `T.roadmap` (`strings.js:38`, set from `H.ROADMAP_TAG` at `strings.js:313`, defined at `ui_text.js:79`; CSS `screens.css:53`). `campaign.js` is the Mediterranean map: `ACTS` [12], `OBJ` [13], sub line [48], `missionsOf(ctx)` = `content.campaign.missions` [23], pins from `_map.js PINS/VIEWS` [154-156], a Continue button that opens the briefing of the first open mission, phones get a mission list. `router.js` pushes only the previous id and `back()` re-enters with `undefined` params (fixed by AR 3.6.3). No URL or hash routing exists.

#### 3.6.2 Screens and states

| id | kind | params | notes |
|---|---|---|---|
| `eras` | NEW menu screen (chooser), `music: 'menu'`, `canvas: 'none'` | `{ focus?: era }` | only reachable when `released >= 2` (title tile, map Back); R1 never routes here |
| `campaign` | existing; the map of ONE era | `{ era?: id, focus?: missionId }`; absent `era` = `lastEra` | `missionsOf(ctx, era)`; `ERA_MAPS` renderer (3.6.8); legend and subtitle from `era.ui.acts/sub` |
| `whatsnew` | NEW overlay | `{ eras?: [ids], reopen?: true }` | 3.6.10 |
| `eracard` | NEW overlay | `{ kind: 'arrival'\|'cleared'\|'passport', era? }` | 3.6.10 |

The chooser always opens when `released >= 2` (D24); with R1 the title tile routes straight to the Ancient map as in v8.

#### 3.6.3 Wireframes (1280x720 pointer layout; ASCII, not to scale)

**A. EMPTY: fresh profile, four eras released.** Ancient is pre-focused (first in ERA_ORDER), no history, no passport button, NEW ribbons on three cards.
```
+------------------------------------------------------------------------------------------------+
| [< Title]   CAMPAIGN  /  choose an era                                                         |
+------------------------------------------------------------------------------------------------+
|  +--------------+  +--------------+  +--------------+  +--------------+                         |
|  |   still      |  |   still      |  |   still      |  |   still      |   each 16:9, 296 x 167  |
|  |   ANCIENT    |  |   MEDIEVAL   |  |   MODERN     |  |   THE FUTURE |   heading on the frame  |
|  |              |  |      [NEW]   |  |      [NEW]   |  |      [NEW]   |                         |
|  +==============+  +--------------+  +--------------+  +--------------+                         |
|  | 0 / 27  ooo  |  | 0 / 27  ooo  |  | 0 / 27  ooo  |  | 0 / 27  ooo  |   3 pips = star tiers  |
|  | caption      |  | caption (the |  | caption (the |  | caption (the |   intern gag, once per |
|  |              |  |  intern...)  |  |  intern...)  |  |  intern...)  |   screen               |
|  +==============+  +--------------+  +--------------+  +--------------+                         |
|   ^ focus ring (roving tabindex; Left/Right/Home/End move it)                                  |
|                                                                                                |
|  [ Begin Ancient ]                                  <- #era-primary, label follows the focus   |
+------------------------------------------------------------------------------------------------+
```
**B. PARTIAL: returning player, `lastEra` = medieval; Ancient 14/27 with a title ribbon, Medieval 3/27, two NEW.** Primary resolves to the next open mission of the focused era.
```
|  +--------------+  +==============+  +--------------+  +--------------+                         |
|  |   ANCIENT    |  |   MEDIEVAL   |  |   MODERN     |  |   THE FUTURE |                         |
|  | ribbon: "Hot |  | ribbon: "Ford|  |      [NEW]   |  |      [NEW]   |                         |
|  |  Gates Host" |  |  Keeper"     |  |              |  |              |                         |
|  | 14 / 27  *** |  |  3 / 27  *oo |  |  0 / 27  ooo |  |  0 / 27  ooo |                         |
|  [ Continue Medieval  >  Mission 4: Beacons of Mild Concern ]       [ Time Passport ] (hidden)  |
```
**C. COMPLETE: Ancient and Medieval cleared (stamps), Modern started, Sci-Fi NEW.** The cleared card shows its stamp and a click on the stamp reopens the era's "cleared" card; the passport button appears once one non-Ancient era is cleared.
```
|  +--------------+  +--------------+  +==============+  +--------------+                         |
|  | ANCIENT      |  | MEDIEVAL     |  | MODERN       |  | THE FUTURE   |                         |
|  | [stamp: -]   |  | [PAGEANT     |  | ribbon:      |  |      [NEW]   |                         |
|  |              |  |  COMPLETE]   |  |  "Reluctant  |  |              |                         |
|  | 27 / 27 sss  |  | 27 / 27 sss  |  |   Recruit"   |  |  0 / 27  ooo |                         |
|  |              |  |              |  |  6 / 27 sso  |  |              |                         |
|  [ Continue Modern  >  Mission 3 ]    (a cleared focused card reads [ Replay Medieval ])        |
|                                                          [ Time Passport: 2 stamps ] (top right)|
```
**D. PHONE 390 x 844, touch.** One column; each card is one button (target = the whole 358 x 201 image block + caption >= 44 px); the primary is a sticky bottom bar padded for the safe area; Back is the top-left 44 px control.
```
+-------------------------------+
| [<]   CHOOSE YOUR ERA         |  56
+-------------------------------+
| +---------------------------+ |
| | still 16:9 (358 x 201)    | |
| | ANCIENT          14 / 27  | |
| +---------------------------+ |
| | caption                   | |
| +---------------------------+ |
| +===========================+ |  <- focused (lastEra), scrolled into view on open
| | MEDIEVAL  [ribbon]  3/27  | |
| +---------------------------+ |
| ...                           |
+-------------------------------+
| [   Continue Medieval   ]     |  64 + safe-area
+-------------------------------+
```
The campaign map on a phone is the v8 compact header plus a mission list (the SVG map is hidden below 700 px, `layoutOf(ctx) === 'phone'`); pins become rows (`seal rows`, `stamped rows`, `ticket rows` per era). Status of every screen on phones: 3.19.4.

#### 3.6.4 The FLOW TABLE (rule: the chooser always opens when `released >= 2`, the last era's card pre-focused, a "Continue <era>" primary; with R1 the v8 flow)

Definitions: **lastEra** = `progress.lastEra` if released, else the era with most stars, Ancient on a tie (CU-D26); **primary label** = `chooser.begin` if the era was never opened, `chooser.continue` if opened and not cleared, `chooser.replay` if cleared; **primary target** = the era map (`campaign {era, focus: nextMissionId}`) with the Continue button focused and the next pin pulsing (the briefing is NOT skipped).

| row \ column | first launch (after the update) | Campaign click | NEXT after mission 9 | Back from the map | deep link `goto('campaign', {era})` |
|---|---|---|---|---|---|
| **fresh** (empty save) | splash, title; NO what's-new card (nothing is new to them); all released eras are written silently to `seen.whatsnew`; Campaign badge absent; era strip shows the released dots | chooser, Ancient focused, primary "Begin Ancient"; every other card wears NEW; clicking a card plays the portal, then the arrival card (once), then the map | the M9 results show "Era cleared" instead of Next; first clear opens the era's cleared card once; then the chooser with that card focused, its ribbon showing the latest title and its stamp | chooser with that era's card focused | opens that era's map directly; a hidden or unknown era -> toast "That era is not open yet" and the chooser |
| **ancient_mid** (v8 save, e.g. 12 stars) | splash, title (Campaign badge `n / (27 x released)`, see the defaults table), then the what's-new card once, listing the unseen released eras; the gore line if `goreMigrated` | chooser, Ancient focused (derived `lastEra`), primary "Continue Ancient" -> Ancient map, Continue button focused | M9 results of Ancient (frozen): "Map" button -> chooser (Ancient focused, ribbon = its latest title); NO cleared card (the Ancient finale is frozen) | chooser, Ancient focused | as above |
| **ancient_done** (v8 save, 27 stars or the 9 missions cleared) | as `ancient_mid` | chooser, Ancient focused, primary "Replay Ancient" (the NEW ribbons on the other cards do the inviting) | n/a (already past) | chooser, Ancient focused | as above |
| **new_era** (e.g. Sci-Fi mid) | splash, title; what's-new only if a released era is unseen | chooser, that era focused, primary "Continue The Future" -> its map | M9 results -> cleared card -> chooser; with all four cleared the Time Passport card opens first (once) | chooser, that era focused | as above |
| R1 variant (any row) | no card, no strip | Ancient map directly; Back -> title | the v8 results "Map" | title | `goto('campaign')` is the Ancient map |

Defaults by row (columns of VF walks A and B):

| default | fresh | ancient_mid / ancient_done | new_era |
|---|---|---|---|
| title Campaign badge | none | `n / (27 x released)` with `n` = MISSION stars of released eras (R1: the v8 sum of all `progress.stars`, PC-CU3) | same |
| what's-new card | suppressed | once per unseen released era, after the splash | once per unseen released era |
| Quick era chip | `lastEra` = Ancient | `lastEra` | `lastEra` |
| Survival tab, Puzzles tab, Codex era filter | `lastEra` | `lastEra` | `lastEra` |
| Daily | "my era only", era `lastEra`; the first Daily after the update is the v8 plan of that date (G7), streak intact | same | same, era = `lastEra` |
| gore / corpses | Auto | migrated (3.4.2) | migrated |
| tutorial | basics once, then era beats | basics already seen: era beats only | per CU5 |

The machine-readable block below is the contract that `tools/walks.mjs` (VF-T27, walks A and B) reads. Keys are exact; `released` values are the release-state matrix of AR 3.2.4 (`all` = four eras).

```flowtable
{
  "version": 1,
  "states": ["[ancient]", "[ancient,medieval]", "[ancient,medieval,modern]", "[all]"],
  "lastEra": { "fresh": "ancient", "derive": "most_stars_ancient_on_tie" },
  "rows": {
    "fresh":        { "campaign_click": { "screen": "eras", "focus": "ancient", "primary": "Begin Ancient", "badges_new": ["medieval", "modern", "scifi"] },
                      "back_from_map": { "screen": "eras", "focus": "<era>" },
                      "next_after_m9": { "screen": "eracard", "kind": "cleared", "then": { "screen": "eras", "focus": "<era>" } },
                      "deep_link":     { "param": "era", "ok": "campaign", "hidden_or_unknown": { "toast": "That era is not open yet", "screen": "eras" } },
                      "defaults":      { "whatsnew": "suppressed", "title_badge": "none", "quick_era": "ancient", "survival_tab": "ancient", "puzzles_tab": "ancient", "codex_era": "ancient", "daily_mode": "mine", "daily_era": "ancient" } },
    "ancient_mid":  { "campaign_click": { "screen": "eras", "focus": "ancient", "primary": "Continue Ancient", "target": { "screen": "campaign", "era": "ancient", "focus": "<next_open_mission>" } },
                      "back_from_map": { "screen": "eras", "focus": "ancient" },
                      "next_after_m9": { "screen": "eras", "focus": "ancient", "cleared_card": false },
                      "defaults":      { "whatsnew": "once_per_unseen_era", "title_badge": "n/(27*released)", "quick_era": "ancient", "survival_tab": "ancient", "puzzles_tab": "ancient", "codex_era": "ancient", "daily_mode": "mine", "daily_era": "ancient", "daily_plan": "v8_for_date" } },
    "ancient_done": { "campaign_click": { "screen": "eras", "focus": "ancient", "primary": "Replay Ancient" },
                      "back_from_map": { "screen": "eras", "focus": "ancient" },
                      "defaults":      { "whatsnew": "once_per_unseen_era", "title_badge": "n/(27*released)", "quick_era": "ancient", "daily_mode": "mine", "daily_era": "ancient" } },
    "new_era":      { "campaign_click": { "screen": "eras", "focus": "<lastEra>", "primary": "Continue <era>" },
                      "back_from_map": { "screen": "eras", "focus": "<era>" },
                      "next_after_m9": { "screen": "eracard", "kind": "cleared", "then": { "screen": "eras", "focus": "<era>" }, "passport_when": "all_four_released_and_cleared" },
                      "defaults":      { "whatsnew": "once_per_unseen_era", "title_badge": "n/(27*released)", "quick_era": "<lastEra>", "daily_mode": "mine", "daily_era": "<lastEra>" } },
    "R1":           { "campaign_click": { "screen": "campaign", "era": "ancient" }, "back_from_map": { "screen": "title" }, "whatsnew": "absent", "era_strip": "absent", "title_badge": "v8_sum_over_27" }
  },
  "portal": { "ms": 1200, "max_wait_ms": 4000, "skip_keys": "any", "reduce_motion": "fade_200ms", "ensureEra_behind": true },
  "walks": {
    "A1": { "title_badge_denominator": "27*released", "era_chips": "released", "roadmap_tablet": "absent" },
    "A2": { "whatsnew": { "shown": "once_after_splash_when_released>=2", "keys": ["Enter", "Escape"], "touch": true, "focus_returns_to": "#menu-quick" } },
    "A3": { "screen": "eras", "focus": "derived_lastEra", "primary": "Continue <era>|Replay <era>" },
    "A6": { "portal_max_ms": 1200, "arrival_card": "skippable_once", "mission1": { "basics_beats": 0, "era_beats": "all" } },
    "A7": { "daily": { "mode": "mine", "era": "ancient", "plan": "v8_for_date", "streak": "intact" } },
    "A8": { "gore": { "stored": "red", "resolved": "auto" }, "whatsnew_names_gore": true },
    "B1": { "whatsnew": "suppressed" },
    "B2": { "screen": "eras", "focus": "ancient", "primary": "Begin Ancient" },
    "B4": { "basics_layer": "once", "banned_words": ["hoplite", "Zeus"] },
    "B8": { "quick_era": "ancient_until_entered", "survival_tab": "ancient", "puzzles_tab": "ancient", "codex_era": "ancient" }
  }
}
```
(The B-walk is "Sci-Fi first": after the player enters Sci-Fi, `lastEra` becomes `scifi`; B8 therefore reads the defaults at the START of the walk, before the first chooser click.)

#### 3.6.5 Chooser stills (CU-D16)

`tools/era_stills.mjs` (owner RENDER with UI; the same Chromium/SwiftShader stack as `tools/shot.mjs`) renders, for each era, a fixed voxel composition from the real `BattleView` at 1280x720 and then a 2D style pass drawn on a canvas: `tapestry` (thread weave normal map at 3 px, raised edges, palette clamp to the six faction primaries on cream), `tilt-shift` (a vertical gaussian blur ramp, lamp vignette, felt noise), `toyshop` (neon edge-light, window glass reflection), `marble` (the Ancient still: the v8 title diorama framing with a marble frame). Composition lists (units, props, camera) come from `ui_chrome.md` section 2 of each era and are data in `tools/era_stills.json`. Output: `assets/era/chooser_<era>.webp`, 1280x720, quality 80, **budget 100 KB each** (a hard failure above 140 KB), no alpha. `node tools/era_stills.mjs --check` hashes (tool version, `tools/era_stills.json`, roster/prop ids, palette tokens) against `assets/era/stills.hash` and fails the gate on a mismatch ("stills stale"); regeneration is manual and deterministic (fixed seed, fixed frame). The page loads a still with `<img loading="lazy" decoding="async" width="1280" height="720" alt="">` inside a 16:9 box with the era accent as a placeholder fill, only when the chooser opens; the byte cost is outside the 5 MB fragment (published files: 4, AR-T31 sum 383 + 4 <= 500). A hidden era's still is not published (AR 3.11.3). Honest limit: WebP decoding on non-Chromium engines and real devices is unverified.

#### 3.6.6 The time-portal (1.2 s)

Click or Enter on a card (or the primary): (1) `ensureEraAsync(era)` starts immediately (AR 3.7.1: it yields two frames first so the portal paints); (2) the portal animation of `era.ui.portal.kind` plays for `ms` = 1200 (page-turn, photocopier bar, warp tunnel, scroll unroll; the cue `portal.cue`; the music crossfades to the era map bed via `audio.music.setMood('map', {era})`, AU3); (3) the map mounts when BOTH the animation and `ensureEra` are done; if `ensureEra` is still running at 1.2 s the portal holds its last frame with the era's loading seam (3.17.4) up to `max_wait` 4000 ms, after which a toast "That took longer than the time machine allows. Try again." returns to the chooser with nothing changed; (4) ANY key or pointer press skips the animation to its last frame (never the `ensureEra` wait); (5) Reduce Motion: a 200 ms cross-fade, no sweep; (6) under the flash limiter the copier bar and warp streaks are scaled through `flashguard.allow('portal', area, lum)` (RA 3.16); (7) a warm era (already ensured) reaches the map in <= 1.25 s wall time (CU-T15, fake clock). The portal is a CSS/Web Animations overlay (`z-index` above the chooser), cosmetic only; the router change happens once, after the wait.

#### 3.6.7 `[data-era]` tokens

Blocks appended to `boot.css`, `kit.css`, `screens.css`, `hud.css` under `[data-era="medieval"]`, `[data-era="modern"]`, `[data-era="scifi"]` (AP-I07; Ancient has no block: its chrome is the v8 CSS). `applyEra(root, era)` (`src/ui/hud/_era.js`) sets the attribute on: the briefing, placement, results and HUD roots, the era map root and the chooser card. The token sets are the binding tables of `ui_chrome.md` section 1 of each era; the names every era defines are:

`--era-accent`, `--era-accent-text`, `--era-paper` (panel fill), `--era-ink` (body text), `--era-frame` (HUD frame: iron / slate / panel), `--era-gilt` or `--era-tape` or `--era-secondary` (reward highlight), `--era-heal`, `--era-warn`, `--era-focus` (ring spec), `--era-pin` (map pin), `--era-rim`.

| token | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| `--era-accent` | `#c8501e` | `#12a37f` | `#35e0ff` |
| `--era-accent-text` | `#a8321f` | `#0b7a5e` | `#35e0ff` (on dark) |
| `--era-paper` / panel | `#efe2c0` | `#eef1ec` | `#0e1424` at 82% over `#141b33` |
| `--era-ink` / text | `#2b2118` | `#1b2430` | `#e8f6ff` (dim `#9fb4d0`) |
| frame | iron `#4a4f57` | slate `#3a4a4c` | panel + 1 px rim |
| reward | gilt `#c9a227` | tape `#fbeb8f` | pink `#ff3da5` |
| pin | wax seal (act colour) | `#e2483d` | planet disc + tag |

Rules (tests CU-T38/uiscan): contrast of every text/background pair in these blocks >= 4.5:1 (large/bold >= 3:1) by script; the only fonts are Bungee, Rubik, Cinzel (Medieval: Cinzel titles with a wax rubric initial, Bungee for stamps; Modern: Bungee + Rubik, no Cinzel; Sci-Fi: Bungee with `.08em` tracking + Rubik); no token reuses an Ancient chrome colour (CIEDE2000 recorded in `ui_chrome.md`). Reduce Motion removes stamp bounces, the portal sweep and map animation.

#### 3.6.8 `ERA_MAPS` (the `map` field of the era UI row; `_map.js` becomes a renderer fed by data)

```js
map = { w: 160, h: 100, cell: 1.6,                                   // MAP_W, MAP_H, CELL (m, _map.js:6)
        backdrop: { kind: 'sea'|'vellum'|'cork'|'screen', stops?: [...], edge?: 'none'|'deckle'|'clips'|'bezel' },
        land:   [ { id, poly: [[x,y], ...], fill: '<colour key>', shape?: 'land'|'cutout'|'sheet' } ],     // LAND: Ancient 10 polygons
        zones:  [ { act: 1|2|3, poly, fills: ['<colour key>', ...], alpha?: 0..1, kind?: 'recolour'|'sheet'|'nebula' } ],   // ZONES: Ancient 9
        rivers: [ { id, pts: [[x,y], ...], style: 'river'|'double-ink'|'pencil'|'lane', colour: '<key>' } ],               // NILE / the Dither / hyperlanes
        colors: { '<key>': '#rrggbb' },                              // COLORS
        decor:  [ { id, kind, at: [x, y], anim?: { type: 'sway'|'drift'|'blink'|'orbit'|'tick'|'puff', periodS }, unlockedBy?: { mission, stars } } ],
        pins:   [ { mission: '<id>', at: [x, y], glyph: '<glyph id>', finale?: true } ],                  // exactly 9, order = campaign order
        route:  { style: 'q-curve'|'stitched'|'string'|'dashed', todo: '<key>', done: '<key>', walker?: 'needle'|'clip'|'car'|null },
        views:  { wide: { x, y, w, h }, tall: { x, y, w, h } },      // VIEWS (v8 wide 0,6,160,90; tall 58,2,90,90)
        pinSize: 7 }
```
`buildMapSvg(map)` and `buildMapDecor(map)` replace the module constants; `raster(map)` stays exported for tests; the Ancient row is the v8 data moved verbatim, and the G8 map PNG must equal the baseline (CU-T16). Per-era content comes from `ui_chrome.md` section 3 (pin tables with positions, glyphs, act regions, rivers, decor with animation periods and `unlockedBy` conditions such as the Parcel moving to pin 9 after M8). Everything animated is cosmetic, driven by `performance.now()` through CSS animations declared once, and stops under Reduce Motion. A pin shows 0-3 pips, the next unlocked pin pulses at 1 Hz, locked pins are blank; completed legs use `route.done` and a one-shot walker (needle / paper clip) when a mission is first cleared (`progress.eras[era].last` records which leg already animated). Phones show the mission list (rows styled per era) and no SVG.

#### 3.6.9 The title screen

R1: v8 minus the roadmap chip (DA-1). With `released >= 2`: (1) the Campaign tile routes to `eras`; its sub-line is "<N> eras, <9N> battles. Zero historical accuracy." (N spelled out, provisional wording, `spec/H` final) instead of "Nine battles..."; (2) the badge is `n / (27 x released)` where `n` sums MISSION ids of released eras (R1 keeps the v8 sum over every `progress.stars` entry, which includes puzzle stars and can exceed 27: PC-CU3, optional DA-7); (3) the roadmap chip is replaced by the **era strip** `<div class="vw-title__eras" role="img" aria-label="Eras open: Ancient, Medieval, Modern, The Future">` with one accent dot per released era (nothing at all in R1); (4) diorama rotation (3.17.3); (5) the what's-new overlay is opened from `title.mount` once per session when it applies.

**Roadmap string test (CU-T17, and the CU17 census):** a scan of every string of the built fragment's content and UI modules fails on `/roadmap/i`, `/not in this build/i`, `/coming (later|soon)/i`, `/Medieval Era/` appearing in any string of the R1 content, and, per release state, on any string that names an era which is not released (ER21b). Negative control: restore `ROADMAP_TAG` -> red.

#### 3.6.10 Cards: what's-new, arrival, cleared, passport

| card | when | content | keys | dismissal |
|---|---|---|---|---|
| **What's new** (`whatsnew`) | once per session after the splash, when `!fresh` and some released era has no `seen.whatsnew[era]`; reopenable | heading; one panel per listed era with `era.ui.whatsnew.title/body` (copy: `humour.md` s3.3 of each era; Sci-Fi: "THE FUTURE IS OPEN. Nine missions, six puzzles, one bubble that comes back..."); the gore line when `goreMigrated`; a footer "Your Ancient save is exactly where you left it." | writes `seen.whatsnew[era]` for every listed era on ANY dismissal | `Take me there` (primary, Enter) -> chooser focus on the first listed era; `Not now` (Esc); focus trap; focus returns to the element focused before (`#menu-quick`); touch: two 44 px buttons; reopen: Settings > About `#set-open-whatsnew` lists every released non-Ancient era read-only (`Close` only, writes nothing) |
| **Arrival** (`eracard arrival`) | first entry to an era, after the portal | `era.ui.arrival.heading/body/button`, gated footers (first footer whose `when` flag is in `seen.callbacks`, at most one line) | `seen.arrival[era]` | button / Esc / click outside, all equal; never auto-advances (reading time); the chooser caption keeps the intern gag |
| **Cleared** (`eracard cleared`) | after the M9 results of the first clear of a non-Ancient era (`progress.eras[era].cleared` flips) | `era.ui.cleared` (stamp, note, e.g. PAGEANT COMPLETE + the sticky note) | `seen.cleared[era]` | button / Esc; reopenable from the chooser card's stamp and the Passport |
| **Time Passport** (`eracard passport`) | auto: once, when all FOUR eras are released and cleared (`seen.cleared.passport`); manual: the chooser's `#era-passport` button once a non-Ancient era is cleared | one stamp per released era (`era.ui.passport.stamp`: a goat, a groat, a boarding pass, a ticket stub), empty dashed squares for uncleared released eras; the closing speech is the Sci-Fi pack's | `seen.cleared.passport` | button / Esc |

All cards are `K.tablet` modals with a focus trap, `role="dialog"`, `aria-modal`, Reduce-Motion-safe entrances, and a `uiscan` entry at the three viewports. The intern is named only where the design allows (arrival card, chooser caption, god-power tooltips, cleared card note); the "at most one Intern's note visible" rule holds because the tooltip element is single.

### 3.7 CU7: currency (`fmtCost`) and its inventory

#### 3.7.1 API

```js
// src/content/shared/currency.js (pure, REGISTRY)
formatCost(cur /* { one, many, short } */, n, o = {}) -> string
   o = { long: false, fmt: 'int' | 'num' | 'locale' }     // 'int' = hud/_dom.js fmtInt, 'num' = kit fmtNum, 'locale' = n.toLocaleString('en-US'): the call site's v8 formatter, so Ancient output is byte-identical
   short (default): "1,200 dr"  "2,250 gr"  "900 rq"  "1,200 ergs"       long: "1,200 drachmae"  (n === 1 -> cur.one)
// src/ui/hud/_currency.js (UI)
fmtCost(ctx, n, o = {}) -> formatCost(ctx.content.eraUI(o.era || ctx.content.currentEra).currency, n, o)
currencyWord(ctx, o = {}) -> the bare word ("drachmae" | "dr" | "groats" ...), o.era as above, o.long default true
```
`o.era` is passed by every site that prints a MISSION, PUZZLE, UNIT or ARMY value (`briefing` passes `eraOf(mission)`, `codex` the unit's era, `placement` the setup's era, `survival` the tab's era); `currentEra` is only a default. Costs are comparable across eras by calibration (hoplite = 100; AR 3.9.3 `K_era`), so no conversion is ever done. Sci-Fi's `short` equals `many` ("ergs") because the design prints "1,200 ergs" in chips.

#### 3.7.2 Inventory (grep `drachm|' dr|"dr"`, excluding `_generated`: 47 matches in 26 files, 2026-10-08, m). Policy per site

"fmtCost" = route through the API with the stated options; "Ancient literal" = a string inside a frozen Ancient file that stays byte-identical (the era overlay supplies the era's own wording through `getT`/`getTB`, 3.8); "comment/key" = no runtime string.

| # | site | prints | policy |
|---|---|---|---|
| 1 | `app/meta.js:41` (x2) | funny stats `survivorsCost`, `wasted`: `fmtNum(n) + ' dr'` | fmtCost short, `fmt: 'num'`, era = battle era |
| 2 | `ui/screens/briefing.js:47` | "Budget" fact `fmtInt(m.budget) + ' dr'` | fmtCost short, `era: eraOf(m)` |
| 3 | `ui/screens/briefing.js:48` | "Par for the 3rd star" `fmtInt(m.par) + ' dr'` | by `par.type`: `cost` -> fmtCost; `time` -> `fmtTime`; `none` -> the fact is omitted (Ancient `par` is a number -> cost) |
| 4 | `ui/screens/briefing.js:119` | puzzle briefing "Par is N drachmae." (long) | fmtCost long, era of the puzzle |
| 5 | `ui/screens/campaign.js:83` | pin-card chip `m.budget.toLocaleString('en-US') + ' dr'` | fmtCost short, `fmt: 'locale'` |
| 6 | `ui/screens/puzzles.js:22` | **puzzle chip** `bestLine`: `fmtInt(spent) + ' dr spent'` | fmtCost short + " spent" from `getTB('puzzles')` |
| 7-12 | `ui/screens/survival.js:17,19,39,62,90,93` | start budget, per-wave income, remaining/placed, "dr left" | fmtCost short, `fmt: 'int'`, era = the tab's era |
| 13 | `ui/screens/daily.js:62` | `fmtInt(DAILY_BUDGET) + ' dr each'` | fmtCost short, era = the plan's era |
| 14 | `ui/hud/armymeter.js:37` | `fmtInt(t.cost) + ' dr'` (battle HUD) | fmtCost short, era from `hud.era` (new HudData field) |
| 15 | `ui/screens/codex.js:100` | unit cost chip `K.fmtNum(d.cost) + ' ' + T0.common.drachmae` | fmtCost long, `fmt: 'num'`, `era: eraOf(unit)` |
| 16 | `ui/screens/placement.js:302` | saved-army chip `${K.fmtNum(a.cost)} ${T0.common.drachmae}` | fmtCost long, `fmt: 'num'`, era = the army's era (`registry.eraOf` of its main faction) |
| 17 | `ui/strings.js:13` `common.drachmae` | the word | stays as the Ancient default; non-Ancient screens call `currencyWord` instead of reading it |
| 18 | `ui/strings.js:48` `quick.recommended(n)` | "Recommended budget: N drachmae" | becomes `(n, cur = 'drachmae')`; quick passes `currencyWord(ctx, {era})` |
| 19 | `ui/strings.js:102` `placement.presetOverBudget(cost, cap)` | "...costs N drachmae..." | becomes `(cost, cap, cur = 'drachmae')` |
| 20 | `ui/strings.js:258` stats label `drachmaeSpent: 'Drachmae spent'` | label | stays for the legacy key in R1; era sections use `era.ui.stats` labels ("Groats spent"...) |
| 21 | `ui/screens/stats.js:38,48` | `spent`, the tile "Drachmae per defeated soldier" | the tile moves into `era.ui.absurd` per era (3.9.7); Ancient's text is identical |
| 22 | `save/stats.js:17,176` | stat KEY `drachmaeSpent`, incremented by every battle's cost | key frozen; ALSO `eraStats[era].spent` (generic rule); never printed raw |
| 23-24 | `editors/soldier/text.js:24,45`; `panels.js:111` | "next point +N drachmae", cost, ability cost | functions take `cur`; the Workshop passes `currencyWord(ctx, {era: eraOfBlueprint(cs)})` |
| 25 | `editors/soldier/state.js:203` | "...how much power one drachma may buy..." | uses `currency.one` of the soldier's era |
| 26 | `content/era_ancient/humor/ui_text.js:65,179,190` | budget tip, placement errors | Ancient literals; each new era's `UI_TEXT` overlay re-words the same keys |
| 27 | `content/era_ancient/humor/tips.js:39`, `results_text.js:115` | a tip, a stat label | Ancient literals; tips and result labels are per-era pools (spec/H) |
| 28 | `content/era_ancient/{campaign.js:55,campaign_text.js:31,puzzles.js:94}` | star/rules text "2,250 drachmae" | Ancient literals (FZ); new eras use placeholders `{par}` rendered by `fmtCost` (MS copy-truth rule) |
| 29 | `content/era_ancient/campaign_validate.js:52` | problem strings "reference costs N dr" | developer messages: for non-Ancient eras the validator says "cost units" (no era word) |
| 30 | `ui/mockctx.js:248,267`; comments in `sim/stats.js:2,70`, `sim/armygen.js:258`, `campaign.js:221`, `arenas.js:4` | test data / comments | no change |

**Acceptance (CU-T18).** `tests/ui/cu/currency_census.test.mjs` recomputes this inventory with the same grep and fails when a runtime match is neither routed (an `fmtCost`/`currencyWord` call on that line or the preceding statement) nor listed in `tests/ui/cu/currency_ancient_literals.json`. Per era, mounting briefing, campaign, survival, daily, puzzles, codex, placement and the HUD army meter with a mock ctx of that era produces no `/drachm|\bdr\b/i` match; with the Ancient mock ctx every screen's text equals the v8 baseline (G10). Negative control: replace the `armymeter.js:37` call by the literal -> red.

### 3.8 CU8: battle-side strings through `getTB`

Facts (m): `getTB(ctx, section, defaults)` [`ui/hud/_strings.js`] merges `ctx.content.humor.uiBattle[section]` over `defaults`; only `puzzles.js` uses it; campaign, briefing, results, survival and daily hold string literals; `getT(ctx)` deep-merges `ctx.content.humor.ui` (unset today). No producer of either override exists in v8 (map 06 unknown 1).

**Design.** `getTB(ctx, section, defaults, era?)` gains an optional 4th argument; absent = `ctx.content.currentEra`. `ctx.content.humor.ui` and `.uiBattle` become getters that return `registry.byEra('UI_TEXT', era)` pieces for the era asked (`UI_TEXT` is the `humor/ui_text.js` data of each era; for Ancient the getter returns `undefined`, so Ancient screens render their literal defaults exactly as in v8). Screens that belong to one mission, puzzle or setup pass its era (`briefing`, `results`, `placement`, the HUD); menu screens use the tab/chip era.

| section | owner screen | keys that become `defaults` objects (Ancient literals moved verbatim) |
|---|---|---|
| `campaign` | `campaign.js`, `eras.js` | page title/sub, lock toast, Continue/Start, Puzzles label, legend aria, chooser heading/captions/ribbons/stamps/passport button, empty-state texts |
| `briefing` | `briefing.js` | section headings (Briefing, Stars, Rules of this fight, Rewards, Your roster), fact labels (Budget, Par..., Your army, Enemy army, Time limit, Objective, Goal), Deploy / Back labels, "Skip tutorial/era tips", assist offers, puzzle rule lines |
| `results` | `results.js` | `WIN_SUB`, `LOSE_SUB`, `DRAW_SUB` (by `reason`, including `intervention`), `NO_QUOTE`, action labels (Again, but smarter / Next mission / Tweak army / Kill-cam / Map / Puzzles / Menu / One more wave / Retry), "Era cleared" primary, star stamp words (APPROVED / PENDING / DENIED per era chrome) |
| `survival` | `survival.js` | RULES lines, DIFFS names/tips, "Begin the siege" label, intermission and boss headings |
| `daily` | `daily.js` | headings, chips ("Enemy: ", difficulty label from `era.ui.difficulty`), Play/Practice labels, no-twist line, history empty state |
| `puzzles` | `puzzles.js` | existing TX and `GOAL_TEXT` (+ the three new objective types) |
| `hud` | `ui/hud/*.js` | status and tag labels of 3.13 (`STATUS_LABEL` additions, world-tag texts), power blocked line, speed/pause labels unchanged |
| `teaching` | `hud/teaching.js`, briefing | "Skip tutorial", "Skip era tips", "Got it", step labels |
| `interlude` | `hud/interlude.js` | the era's stalemate overlay texts (3.3.7) |
| `eracard`, `whatsnew` | the two overlays | button labels (Take me there, Not now, Close), headings |

Rules: (1) Ancient `defaults` are byte-identical to the v8 literals (CU-T19 compares them with the baseline DOM text). (2) A non-Ancient era must override every key whose default contains an Ancient token (the CU17 census list: `Zeus`, `goat`, `hoplite`, `drachm`, `Citizen`, `Peasant`, `Consul`, `siege` in "Begin the siege", `Olymp`, `Spartan`, `Persian`, `Greek`, `Roman`, `Egypt`); the test iterates the defaults and fails on a missing override. (3) `getTB` never mutates `defaults`; function-valued keys keep their argument lists. (4) Strings that embed a number or currency use `fmtCost`. (5) Words for the stalemate/intervention reasons come from the era kit, not from the result reason code.

### 3.9 CU9: achievements, Stats and Settings per era

#### 3.9.1 The 63 achievements (R-PARITY: counts over released eras)

| set | ids | count | gate |
|---|---|---|---|
| Ancient | the 24 of `era_ancient/humor/achievements.js` (frozen; ids immutable) | 24 | always |
| Medieval | `med_history med_overachiever med_tourist med_pointy_end med_vexillologist med_tin_opener med_unhorsed med_door_prize med_soup med_oil_painting med_dragon_slayer` + hidden `med_dennis` | 12 | era released |
| Modern | `mod_history mod_overachiever mod_tourist mod_pinned_it mod_cover_artist mod_empty_click mod_mine_host mod_rear_view mod_tea_break mod_crater_face mod_umbrella_policy` + hidden `mod_goldfish_hours` | 12 | era released |
| Sci-Fi | `sf_history sf_overachiever sf_tourist sf_bubble_wrap sf_turn_it_off sf_peekaboo sf_hover_derby sf_hop_along sf_deep_clean sf_timber sf_space_goat` + hidden `sf_soul_search` | 12 | era released |
| cross-era meta (pack `meta`, AR-D23) | `meta_time_hop`, `meta_double_feature`, `meta_triple_feature` | 3 | `minReleased` 2 / 2 / 3 |
| total | | **63** | the Achievements total is the sum over RELEASED sets (R1: 24) |

Achievement row (all eras): `{ id, icon, name, desc, hidden?: true, minReleased?: n, era, test(stats, ev) }`; `name`/`desc` of designed ones are in `design/<era>/mutators_achievements.md` section 3 (verbatim); the test pseudo-code there is translated with the real field names (PC-CU4).

The generated trio comes from ONE helper, `eraAchievements(era, {missionIds, arenaIds, names, icons})` (`src/content/shared/ach_helpers.js`): `*_history` = `statOf(stats, 'completedEras').includes(era)`; `*_overachiever` = the sum over the era's mission ids of `min(3, stats.campaign.stars[id])` equals 27; `*_tourist` = every id of the era's `arena_stat` set has `stats.arenasPlayed[id] > 0` (12 per era; Quick-only arenas count; puzzles, Survival, Daily, the Arena Builder count as playing, the existing rule).

#### 3.9.2 The three meta achievements (provisional names, `spec/H` final)

| id | desc (provisional) | test | `minReleased` |
|---|---|---|---|
| `meta_time_hop` | "Win a campaign mission in two different eras. The commentators have had a lot of luggage." | at least 2 eras have a mission with >= 1 star in `stats.campaign.stars` | 2 |
| `meta_double_feature` | "Finish two campaigns. Intermission not included." | `completedEras.length >= 2` | 2 |
| `meta_triple_feature` | "Finish three campaigns. The popcorn has been refilled twice." | `completedEras.length >= 3` | 3 |

An achievement whose `minReleased` exceeds the released count is absent from lists, totals, toasts and checks (no leak, no hollow target). A fourth "all eras" milestone is the Time Passport card (3.6.10), not an achievement.

#### 3.9.3 Lifetime counters (`stats.eraStats[era][key]`, CU-D18) and the read helper

`statOf(stats, 'medBraceBreaks')` = `stats.eraStats?.medieval?.braceBreaks || 0`; the design name's prefix (`med`, `mod`, `sf`) selects the era (table below). `normalizeStats` whitelists `eraStats` (AR 3.5.2: key regex `^[a-z][a-zA-Z0-9]{0,31}$`, <= 64 keys per era, finite n >= 0); a v8 build drops it (the documented rollback loss). Keys (lifetime counters the designs list; only three are read by an achievement test: `braceBreaks`, `healedHp` (Modern), `shieldBreaks`):

| era | keys (suffix after the design prefix, lower-first) |
|---|---|
| medieval (`med*`) | `braceBreaks bannersDown boltHeavyKills unhorsed gatesBroken healedHp fireKills dragonKills huzzahs` (`soupCasts` is the existing `godPowers.med_soup_cart`) |
| modern (`mod*`) | `pins coverHits reloadHits mineKills rearKills healedHp craters airKills shells` |
| scifi (`sf*`) | `shieldBreaks ownBreaks empHits cloakKills hoverLiquidKills blinks strikeKills stunnedBossKills healedHp airKills` |
| every era (generic rule) | `battles wins kills playSeconds spent` (feeds the Stats sections) |

#### 3.9.4 `BattleSummary` additions (per battle, additive; the v8 fields and the 3 Ancient-only constants stay) and their producers

The design pseudo-code uses `ev.won` and `ev.byCause`; the shipped summary has `win`/`draw` and `killsByCause`/`killsByDef` (m, `save/stats.js battle_end`): the achievement files use the real names (PC-CU4). New fields, all numbers or small maps:

| field | feeds | producer rule (type: events) | sim fact needed |
|---|---|---|---|
| `braceBreaks` | med_pointy_end | count: `unit_brace` where the brace holder is the player's | none |
| `bannersDown` | med_vexillologist | count: `unit_kill` of an enemy def listed in the era's `bannerDefs` | none |
| `heavyKilledByBolts` | med_tin_opener | count: `unit_kill` where `defs[srcDef].ranged.ap >= 0.5` and `defs[dstDef].armor >= 0.4` | none |
| `unhorsed` | med_unhorsed | count: `unit_bailout` of an enemy mounted def | none |
| `gateFallSecs` | med_door_prize | interval: first `prop_damaged` of a gate-type prop by a siege def -> its `prop_destroyed` (min over gates) | verify `prop_damaged/prop_destroyed` carry a prop index and `src` (R-CU-S1) |
| `healedHp` | med_soup, mod_tea_break, sf (lifetime) | sum: `unit_heal.amount` on the player's side | none |
| `pinsDistinct` | mod_pinned_it | distinct: `unit_suppressed.id` of enemy units | none |
| `coverHits`, `coverFrac` | mod_cover_artist | count `unit_hit` with `cover`; unit-seconds `inCover` from `unit_cover {id,on}` toggles | `unit_hit.cover` (R-CU-S1) |
| `reloadHits`, `hitsWhileReloading` | mod_empty_click | count `unit_hit` with `dstReloading` by dealt/taken | `unit_hit.dstReloading` (R-CU-S1) |
| `vehicleRearKills` | mod_rear_view | count: `unit_kill` with `face == rear` on a vehicle | `unit_kill.face` (R-CU-S1) |
| `craters` | mod_crater_face | count: `crater` | none |
| `airKillsByDef`, `airKills` | mod_umbrella_policy, sf lifetime | map/count: `unit_kill` where `defs[dstDef].layer == 'air'`, keyed by `srcDef` | none |
| `shellHits` | (Stats) | count: `unit_hit` where the projectile kind is a shell/mortar | `unit_hit.projKind` (R-CU-S1) |
| `damageTakenByDef`, `startDefs` | mod_goldfish_hours | sum of `unit_hit.dmg` by `dstDef` for the player; `battle_start` roster counts | verify `unit_hit.dstDef` (R-CU-S1) |
| `shieldBreaksDealt`, `ownBreaks` | sf_bubble_wrap (lifetime), star helpers | count: `shield_break` by victim team | none |
| `empMachinesMax`, `empHits` | sf_turn_it_off | groupMax: `emp_hit` of enemy ids per tick; distinct ids | none |
| `cloakKills` | sf_peekaboo | join: `unit_cloak{why:'attack'}` then `unit_kill` by the same attacker within 1.2 s | none |
| `hoverLiquidKills` | sf_hover_derby | count: `unit_kill` whose attacker (looked up in the world at event time) is hover-layer over a liquid/lava/rift material | none (W3 material flags) |
| `blinks` | sf_hop_along | count: `unit_blink` of the player's units | none |
| `strikeKills`, `strikeKillsMax` | sf_deep_clean | window: `strike_call` then `unit_kill cause strike` within 0.6 s of its explosion; max per strike | none |
| `stunnedBossKills` | sf_timber | join: `unit_kill` of a boss def within the EMP duration of its last `emp_hit` | none |
| `lastSurvivorDef`, `survivorCount`, `survivorsAllMachine` | sf_space_goat, sf_soul_search | endSnapshot: `battle_end.perDef` plus the `machine` tag | none |

**Producer.** Per-field rules are DATA in `era_<id>/stat_rules.js` (`STAT_RULES`, byEra), interpreted by `LifetimeStats.registerRules(rules)` (types `count sum distinct max groupMax join window interval endSnapshot`; each rule `{key, summary?, lifetime?, type, event, where, ...}`; unknown types or events are `registry.verify` problems). Mission trackers (`MissionTracker.extras`) read the same fields, so a star helper and an achievement can never disagree. Tests: each rule fires on a constructed event log and not on its negative twin; unknown keys survive `normalizeStats` only under `eraStats`.

#### 3.9.5 Achievements screen

Tabs (`K.tabs`, ids `ach-tab-all`, `ach-tab-<era>`, `ach-tab-meta`) over the existing summary meter and filter; tabs for released eras only (`meta` only when it has a visible achievement); counters `got/total` per tab; `PROGRESS` becomes data (`ach.progress(stats)` on the row) and gains the generated trio and the three lifetime bars. A `hidden` row renders as a locked card with the question-mark icon, name `???`, description `???`, no progress, until unlocked (then the real card); hidden rows are also invisible to Codex and Stats until unlocked. The `unlock` toast uses the achievement's own name. At boot `M.achievements.recheck()` runs after `LifetimeStats.reconcile` (AR 3.5.5 step 4), so a profile that already cleared Ancient and a new era earns the meta rows retroactively and silently into the toast queue (max one toast per 2.2 s, existing).

#### 3.9.6 `ancient_history` semantics and the shipped defect (m)

`meta.js recordMission` calls `M.recordCampaign(id, ev.stars, win)`; `LifetimeStats.setCampaign(mission, stars, completed)` sets `campaign.completed = true` when `completed || every Ancient mission has a star`; so the FIRST campaign WIN sets `campaign.completed` and `ancient_history` ("Finish the campaign") unlocks after one victory (probe 2026-10-08: `ui('campaign', {mission:'marathon_sort_of', stars:1, completed:true})` -> `completed true`, `['ancient_history']`; with `completed:false` -> `[]`). Policy: **pinned** (Ancient does not change); `campaign.completed` and `ancient_history` keep their shipped semantics; the new eras do NOT use that flag: their `*_history` reads the derived `completedEras` (every one of the era's nine missions has >= 1 star), and `setCampaign` ignores the `completed` argument for missions of eras that do not set `manifest.flags.legacyCampaignCompleted` (true on the Ancient manifest only; data, not an `if (era === ...)`; request R-CU-V1 to REGISTRY). Optional deliberate delta DA-7 (not elected): pass `completed = false` from `recordMission` so Ancient behaves as its description says; it would need G4/G5 and a named re-record.

#### 3.9.7 Stats screen

R1: unchanged. With `released >= 2`: a tab row `All | <Era>...`; `All` is today's screen (headline tiles, serious list, absurd tiles, hall of fame) restricted to released content; an era tab shows the era's headline tiles (`eraStats[era]` battles, wins, kills, time), "Spent: N <currency>" via `fmtCost`, the era's counter list with labels from `era.ui.stats.labels` (fallback `humanize(key)`), its `absurd` tiles (formulas over `eraStats`/lifetime; labels from the design `humour.md`), the finale tile once the era is cleared ("Predictions confirmed: 1" / "Surveys declined: 1 (offered: 1)" / the Modern equivalent; derived from `completedEras`, no counter), and a hall of fame restricted to the era's units/arenas. The legacy `absurd` tile "Times the goat was the real hero" stays Ancient-only (it is in the Ancient `absurd` row). Control ids: `st-tab-all`, `st-tab-<era>`.

#### 3.9.8 Settings (new and changed controls; every one has a `uiscan` entry)

| tab | control id | what | default |
|---|---|---|---|
| Gameplay | `set-gore`, `set-corpses` | Auto segment (3.4.4) | Auto |
| Gameplay | `set-setpiece-shots` | toggle "Camera takes over for big moments" (Cinematics group) | on |
| Gameplay | `set-assist-ladder` | toggle "Offer help after repeated defeats" (only when a released era has `assist`) | on |
| Gameplay | `set-replay-tutorial`, `set-replay-tips-<era>` | buttons (3.5.6) | |
| Graphics | `set-era-quality-<era>` (group "Per-era quality", only when `released >= 2`) | segmented Auto / Potato / Papyrus / Marble / Olympian; the effective tier at `Game.begin` is `settings.eraQuality[setup.era] \|\| settings.quality` | Auto |
| About | `set-open-whatsnew` | button, only when `released >= 2` | |

Quality names (Papyrus, Marble, Olympian) are shared graphics presets and stay; the CU17 census lists them as an accepted Ancient-flavoured exception (renaming would change G4/G10 for no gameplay gain).

### 3.10 CU10: the MODES TABLE

Facts (m): `quick.js` lists `ctx.content.arenas` (the carousel is `loading="lazy"` with a thumbnail queue that draws one arena per idle slice of 50-150 ms and answers the selected arena first, `setThumb`/`arenaThumb`), offers `factionIds(ctx).concat(['mixed'])` as chips (so merged content would offer "Hellenes vs Sci-Fi"), locks mutators by `_shared.totalStars` (sum of every star incl. puzzles); `title.js` warms every arena thumbnail 1.2 s after mount; `survival.js` has one board per profile (`survival.best/bestWave/board[5]`), fixes `'hellenes'` and `Mixed`; Daily keeps one streak over `history[]` rows (cap 60) and `recordDailyRun` counts the FIRST completed run of a DATE only; `puzzles.js` shows `ctx.content.puzzles` (all); Codex tabs are `units | props | arenas` with faction tabs from `FACTION_ORDER` (7 ids) and a `LAST` module variable.

#### 3.10.1 Table

| mode | era selector | board / progress key | streak rule | share-code fields | title tile text | example share string |
|---|---|---|---|---|---|---|
| **Quick Battle** | era chip row `#qb-era` (released >= 2), default `lastEra`, remembered in `LAST` and written to `progress.lastEra` when a battle starts | none (no board) | none | none (armies/arenas use their own codes; an army code from another era imports with the message of AR 3.4) | "Pick a fight" | n/a |
| **Survival** | era tabs `#surv-era-<id>` (released >= 2), default `lastEra` | Ancient: `survival.best/bestWave/board[5]` (root, v8); other eras: `survival.eras[era] = {best, bestWave, board[5]}`; combined tile = max over released eras | none | none | badge "Best: wave N" with N = max over released eras (R1: v8) | n/a |
| **Daily Skirmish** | `#daily-mode` segmented: "My era only (<Era>)" (default) / "All eras" (released >= 2); persisted as `settings.dailyMode` | one `daily` doc: `{last, streak, best, history[<=60]}`; rows gain `era` (absent = ancient) | ONE streak across eras and modes; the first completed run of a DATE counts, in either mode; a second run that day (even in the other mode) is practice | the result string (3.10.4) | badge "New today" until today's run | below |
| **Puzzles** | era tabs `#pz-era-<id>`, default `lastEra`; reached from the campaign map's Puzzles button with `{era}` | flat `progress.puzzles[id]` and `progress.stars[id]` (ids are globally unique) | none | none | (inside Campaign) | n/a |
| **Codex** | era chips `#cx-era` above the faction tabs (released >= 2), default `lastEra`; params `{era, tab, unit}` | `progress.codex.open` (dossiers/pages) | none | none | "Codex" | n/a |
| **Soldier Workshop** | era chip row in the parts palette (default = the soldier's main-weapon era) + "Show every era's cosmetics" toggle | `soldiers` collection (cap 24, unchanged) | none | `VW1.soldier` (unchanged format; era is derived from the main weapon) | "Workshop" | n/a |
| **Arena Builder** | era chip on the builder toolbar (default `arena.env.era` of the loaded arena, else `lastEra`) | `arenas` collection (cap 48) | none | `VW1.arena` (carries `env.era`; a v8 build opens it with the Ancient look) | "Arena Builder" | n/a |

All editors stay desktop-only; phones keep the friendly notice (CU-D30, 3.19.4). R1 shows none of the chips/tabs/toggles in this table.

#### 3.10.2 Quick Battle in detail

1. **Era chips.** `K.segmented` (`#qb-era`) of released eras, above the arena carousel; changing the chip: filters the arena strip to that era's presets (+ "My arenas" whose `env.era` equals the chip, v8 arenas without it count as Ancient), the faction chips of both armies (era factions + `mixed` meaning `mixed:<era>`, i.e. `generateArmy({faction:'mixed', era})`), the mutator chips (the shared nine + that era's two), the difficulty labels (`era.ui.difficulty`), the objective choices the arenas support, the currency labels, and re-rolls the two armies when their factions belong to another era (two random non-mythic factions of the era). A saved Quick `LAST` that points to an arena or faction of a hidden era is repaired to the defaults of `lastEra`. Era purity is the only mode: Quick never offers a cross-era pair (D19; `Game.newSetup/begin` raise `EraMismatch`, AR 3.4).
2. **Lazy thumbnails.** `title.js` warms only the arenas of `lastEra` (<= 16 thumbnails, one per idle slice) instead of every arena; `quick.js` requests the selected arena first, then the rest of the chip's era, then nothing else; a chip change re-prioritises the new era's selected arena. Budget: <= 120 ms of main-thread time per slice (the existing queue), and the number of distinct thumbnails drawn after opening Quick and visiting every chip is at most the sum of the released arena counts (16 + 3 x 12 = 52 with four eras), asserted by CU-T23 with a fake `arenaThumb` counter.
3. **Arena lock UI.** An arena or variant with `unlock` renders its strip button with the lock icon, `aria-disabled="true"`, a dimmed thumbnail (thumbnails of released content are never hidden) and the tooltip "Locked. <unlockHint>" (hint = "Win <mission title>."). Click or Enter toasts the hint and does not select it; arrow keys still move focus over it. A deep link `params.arena` that is locked toasts and falls back to the era default. Mutator chips follow the same pattern (existing). Unlock source: `progress.unlocks` contains the preset's `unlock` key (written by `rewardsFor`, 3.11).
4. **Presets row** `#qb-presets` ("Featured battles"): shown when the era has `QUICK_PRESET` entries of kind `battle`; a preset fills the whole form (arena, factions, style, budget, mutators, time limit); the player edits freely before Fight. Locked presets show the lock and hint.
5. **Enemy styles.** The style segmented gains era styles (`kind: 'style'`, e.g. Medieval "Charge of the Wobbly Brigade", locked until its reward); an era style is data: `{ style: 'rush', ids: [defIds], formation: 'loose' }` passed to `generateArmy` (no new SIM style, no engine change).

`QUICK_PRESET` row (registry kind, idmap; file `era_<id>/quick_presets.js`; ids `<prefix>_qp_*`):

```js
{ id: 'med_qp_dragon_day', era: 'medieval', kind: 'arena'|'variant'|'style'|'battle', name, blurb,
  unlock: 'med_r9_gilded_spoon_preset' | null,            // key in progress.unlocks; null = open
  arena?: { id, variantOf?: <arena id>, size?, seed?, env?: { time, weather } },    // a variant is a NEW ARENAS entry with the same recipe and an env override
  armies?: { A?: { faction, style }, B?: { faction, style, ids?: [], extra?: [{ defId, n, at: 'rear_center'|... }] } },
  budget?: n, timeLimit?: s, mutators?: [],
  script?: [ M14 events ],                                 // Dragon Day: a setpiece at t = 45 s; run by PresetRuntime (R-CU-I2); absent = no script
  survival?: { bossCycle?: [defIds], bossEvery?: n } }     // Boss Rush in Survival (3.10.3)
```
The ten Quick unlocks of the ledger are: Medieval `med_qp_wobbly` (style, M4), `med_qp_siege_season` (battle: `med_castle_dour`, Mostly Paid Company vs the Gatehouse garrison, M5), `med_qp_dry_summer` (variant of `med_pennywhistle`: dry weather, wind; M7), `med_qp_dragon_day` (battle: the Cinderwyrm over a mixed field, flyby set-piece; M9); Modern `mod_qp_desert_outpost`, `mod_qp_roadworks`, `mod_qp_garden_centre` (Quick-only arenas of the Modern arena set, M5/M6/M8); Sci-Fi `sf_qp_magma_night` (variant of `sf_lavaworld`: time 22, `ember_ion`, M2), `sf_qp_boss_rush` (battle + Survival, M6), `sf_qp_sinkhole_night` (variant of `sf_hive`: time 0, `spores`, M8).

#### 3.10.3 Survival

The setup screen gets era tabs; arena `select` lists the tab's era arenas (locked ones disabled with the hint); faction segmented lists the era's factions + `Mixed` (= `mixed:<era>`); difficulty names from `era.ui.difficulty`; the "Begin the siege" label and RULES lines come from `getTB('survival')`. `recordSurvival(w, ws, pt)` takes the battle's era: Ancient writes the root keys as v8; other eras write `survival.eras[era]` (board of 5, `best`, `bestWave`, entries `{score, waves, date, arena}`). The title tile and the screen's "Best" chip show the max over released eras; each tab shows its own top-5 and the "NEW BEST" mark compares within the tab. **Boss Rush** (`sf_qp_boss_rush`): selecting it in Survival passes `waves: {bossCycle: [...], bossEvery: 1}` to `createSurvival`/`WaveSystem` (request R-CU-S3 to SIM M15; if declined, Boss Rush is Quick-only and its Survival half is dropped without touching the Quick half, which stays a real reward).

#### 3.10.4 Daily

`_daily_plan.js` becomes a re-export of the factory output (AR 3.6.2); `planFor(ctx, key, {mode, era})`: mode `mine` -> the existing algorithm over the lists of `era = lastEra`; mode `all` -> the era is drawn first from `rng(seedOf(key) ^ 0xE4A)` among released eras, then the same algorithm runs over that era's lists; with era `ancient` the plan of any date is byte-identical to v8 (G7: 400 dates; plus 400 x 3 new-era dates parity between `daily.js` and `_daily_plan.js`). The Daily locks never apply (CU-D20). The screen shows the mode segmented (hidden in R1), the era chip next to the date, "Streak: N days" (one streak), and, when the other mode's plan differs, a hint "Today's other plan is <arena> (practice)". `recordDailyRun(prev, rec)` is unchanged; `rec.era` is added; history rows show an era chip for non-Ancient rows; "practice" (second run of the date) explains itself ("Today's battle is already counted. This one is practice.").

Result string: v8 string, then ` | era <id>` ONLY when `plan.era !== 'ancient'`; no parser of this string exists in v8 or in the new build (m: grep), so the appended marker cannot be rejected by anything; the first six fields never move.

| era | example result string |
|---|---|
| Ancient (byte-identical to v8) | `VOXELWARS Daily 2026-10-08 \| Marathon Plain \| Hellenes vs Persians \| WIN in 2:14 \| 64% of the army left \| seed 20261008` |
| Medieval | `VOXELWARS Daily 2026-10-08 \| Ford of Dithering \| Long Hedge Yeomanry vs Crown of Marrowby \| WIN in 2:14 \| 64% of the army left \| seed 20261008 \| era medieval` |
| Modern | `VOXELWARS Daily 2026-10-08 \| Parade Yard \| Marmalade Motor Pool vs Caution Tape Company \| LOSS in 3:02 \| 0% of the army left \| seed 20261008 \| era modern` |
| Sci-Fi | `VOXELWARS Daily 2026-10-08 \| Magma Lounge \| Tidy Concord vs Rummage Armada \| DRAW in 4:10 \| 12% of the army left \| seed 20261008 \| era scifi` |

(Faction and arena display names are the registry names at release; the examples use the names of `factions.md`/`arenas.md`; the test builds the string from the registry and compares it with this shape by regex.)

#### 3.10.5 Puzzles

`puzzlesOf(ctx, era)`; era tabs; "Puzzles (n)" on the map counts the map's era; `GOAL_TEXT`/`GOAL_ICON` gain `capture`, `defend_core`, `escort`, `destroy` by def/tag; `papi.nextAfter(puzzle)` (own-era list) replaces `papi.puzzles[index + 1]` (`meta.js:566`); the puzzle chip prints `fmtCost`. Puzzles turn all six god powers off and allow no mutators (the Ancient rule, unchanged); the one-line first-sight beat of `puzzles.md` for a puzzle met before its teaching mission is a toast with id `fs_pz_<puzzleId>` (3.5.2).

#### 3.10.6 Codex

Top tabs: `units | props | arenas | mechanics` (`mechanics` only for released eras that have `ui.mechanics` rows; absent in R1). Era chips `#cx-era` above the faction tabs filter factions (`factionIds` = the era's factions in registry order; `FACTION_ORDER` becomes the Ancient prefix of the registry order, AP-I02), props by `era` + `any`, arenas by era. **Counters row** in every unit detail: "Beats" (`counters.counters` top 3 by cost), "Weak to" (`counterHints(def).weak`, or the designed `text.weak` when present), "Hard counters" for bosses (`row.codex.weakTo`); the same chips appear on the placement hover card (3.14.1). **Mechanics tab**: one card per `ui.mechanics` row (icon, name, rule, "What you see" tell, "Answered by" unit chips, "Taught in" link to the pin); rows with `unlock` are locked until `progress.codex.open[id]` (the four codex pages per era of the ledger) and show "Clear <mission title> to read this page". **Dossiers** (CU-D29): a new-era unit's lore and joke paragraph is locked behind `codex.open[unitId]` or `stats.byDef[id].spawned >= 5`; stats, model, matchups and counters are never locked. **Roles** (R-UC5): `ROLE_ICON/ROLE_LABEL/ROLE_CHIP` gain `vehicle` (icon `wheel`, "Vehicle", chip `steel`) and `air` (icon `wings`, "Air", chip `cloud`); two chip variants are added to `kit.css`. The attack-clip source is the shared `meleeClip/rangedClip` (UC-27; the Ancient `strike_slash` defect PC-UC6 stays pinned).

#### 3.10.7 Workshop and Arena Builder

**Workshop** (EDITORS; U8 bound by AR 3.9.3): the parts palette has an era chip row (`Ancient | Medieval | Modern | Sci-Fi`, released only); `listParts(cat, unlocked, {era})` returns the era's parts plus `manifest.sharedParts` (AR 3.9.3); a toggle "Show every era's cosmetics" lists all (cosmetic parts of different eras may be mixed in one soldier: `validateBlueprint` accepts any registered part). The soldier's era is `eraOfBlueprint(bp)` (main weapon); changing the main weapon to another era's weapon switches the weapon-class list (`registry.customClasses(era)` with `CLASS_LABEL`), the cost currency and the foe list of the test fight, and shows an info toast "Now a <Era> soldier: it fights in <Era> battles." The placement `custom` tab lists only customs whose era equals the battle's era. Locked parts show the lock and the `UNLOCKS` hint ("Unlocked by finishing <mission title>"). Per-slot part counts are AR 3.9.4's table, accepted unchanged (no amendment): the reward parts of the ledger (8 Medieval, 7 Modern, 5 Sci-Fi incl. substitutes) are counted INSIDE those totals as locked entries. **Arena Builder** (W6): an era chip on the toolbar sets `env.era`, the theme presets (`THEMES`), the prop palette (era props + `any`) and the test-fight armies; the saved arena carries `env.era`; the aim test at low gravity is W's; the flow is: chip -> theme preset -> size -> props -> markers/objective -> test fight (armies of the chip's era) -> save/share. Both are desktop-only; on a phone the friendly notice lists the player's creations (v8).

### 3.11 CU11: the reward ledger

#### 3.11.1 Classes, implementation, substitution (the five classes; every reward is real, plan 8 CU11)

| class | what the player gets | implementation (write -> read) | usable-now evidence | substitution if a cut-ladder rung removes the primary |
|---|---|---|---|---|
| **part** | a Workshop part (helm, face, back, cape, offhand, main weapon or weapon class) | `rewardsFor().parts` -> `progress.unlocks`+`parts` (`meta.recordMission` writes both flat arrays); part `unlock.key` = the reward key, `UNLOCK_MISSIONS[key] = missionId` (the stars fallback of `drafts.js unlockedKeys` then also works); read by `listParts(.., unlocked)` | `workshop.test`: the part is selectable after the reward and absent before | a generic part of the same slot, same name in the text; the title and page remain |
| **quick_unlock** | a locked arena, variant, enemy style or battle preset | `rewardsFor().quick` -> `progress.unlocks`; read by the Quick strip/presets row (3.10.2) | `quick.test`: locked before, selectable after, deep link refused before | a Workshop part (named per row below) |
| **mutator** | an era mutator | `rewardsFor().mutators` -> `progress.unlockedMutators`; read by `mutatorList` (`m.unlockKey`) in Quick/Survival/Daily pickers (never in campaign: rules force `[]`) | `mutpicker.test` | none needed: a mutator is data, never cut |
| **codex_write** | a Codex page / dossier | `rewardsFor().codex` -> `progress.codex.open[id] = ms`; read by the Mechanics tab and dossiers (CU-D29) | `codex.test`: locked text before, readable after | the page text stays; only the lock disappears |
| **title** | a title on the chooser ribbon | `rewardsFor().titleId` -> `progress.titles` (order = earned); read by `eraProgress().titleId` | `eras.test`: ribbon shows the latest title | none: titles are text |

A mission's primary is one class; "plus" items are the other classes. The ladder (plan 13) can remove: rung 1 Quick-only arenas beyond the 11th (Modern's three Quick-only arenas are the first to go: their substitution is the generic part named in the ledger), rung 2 hidden achievements, photo frames and the milestone track, rung 3 generic workshop parts (the ledger's parts are NOT generic: they stay). Each row below names its substitution; the MS lint rejects a mission whose reward references a cut mechanic, and a lint rule `reward_substitution` requires a substitution for every row whose primary is `quick_unlock` or a part.

#### 3.11.2 The ledger (27 rows; `REWARD` registry rows; sources: the three `missions_outline.md` section 3 tables, ids and names verbatim)

Distribution by class of the PRIMARY reward: **14 parts** (Medieval 4: M2, M3, M4, M9; Modern 6: M1, M2, M4, M5, M6, M8; Sci-Fi 4: M1, M4, M5, M7), **5 Quick unlocks** (Medieval 2: M5, M7; Sci-Fi 3: M2, M6, M8), **6 mutators** (Medieval M1, M6; Modern M3, M7; Sci-Fi M3, M9) and **2 codex writes** (Medieval M8, Modern M9) = 27; every row also carries a title (27 titles) and "plus" items (extra parts, codex pages and dossiers, and 5 more Quick unlocks: Medieval M4 style and M9 preset, Modern M5/M6/M8 arenas).

| # | mission | reward id | primary (class: item) | plus | substitution | evidence test |
|---|---|---|---|---|---|---|
| 1 | `med_dress_rehearsal` | `med_r1_foam_swords` | mutator: `med_foam_swords` "Pageant Rules" | title "Extra With Lines"; codex `pikeman lancer squire pageant_dragon` | Workshop part `med_foam_sword` | CU-T28/1 |
| 2 | `med_tourney_trouble` | `med_r2_plumed_great_helm` | part: helm "Plumed Great Helm" | title "Vexillophobe"; codex `standard_bearer ser_valiant great_hog reeve` + page "Heraldry For The Hopeless" | codex page "Heraldry" (a `codex.open` write) | 2 |
| 3 | `med_ford_dithering` | `med_r3_long_pike` | part: polearm "Long Pike" | title "Ford Keeper"; codex `knight_afoot crossbowman pavise_bearer` | codex page "Armour" | 3 |
| 4 | `med_mizzlemoor_beacons` | `med_r4_lance_used` | part: weapon class "Lance (Used)" | Quick style "Charge of the Wobbly Brigade"; title "Tilt Enthusiast"; codex `knight_errant sellsword poacher trebuchet` | the Quick style alone | 4 |
| 5 | `med_castle_dour` | `med_r5_siege_season` | quick_unlock: "Siege Season" preset | part `med_mantlet_shield`; title "Door Handler"; codex `battering_ram rolling_keep castellan springald` | the part alone | 5 |
| 6 | `med_bell_tolls_lunch` | `med_r6_plague_season` | mutator: `med_plague_season` "Plague Season" | part `med_beak_mask`; page "The Infirmary"; title "Soup du Jour"; codex `physician bellringer apothecary plague_cart abbess` | the part alone | 6 |
| 7 | `med_pennywhistle_blaze` | `med_r7_dry_summer` | quick_unlock: variant "Pennywhistle, Dry Summer" | part `med_cauldron_helm`; title "Smoke Detector"; codex `mangonel pageant_dragon med_pitch_barrel` | the part alone | 7 |
| 8 | `med_toll_bridge` | `med_r8_siegecraft` | codex_write: page "Siege Engines: A Guide For The Late" | part `med_toll_club`; title "Counterweight of Evidence"; codex `lady_counterweight bridge_troll hoardling coin_golem` | the part alone | 8 |
| 9 | `med_grand_pageant` | `med_r9_gilded_spoon` | part: weapon "Gilded Spoon" | Quick preset "Dragon Day"; all remaining codex pages; title "Dragon-Adjacent Person"; sets `medieval_complete` | the preset alone | 9 |
| 10 | `mod_boot_camp_dropout` | `mod_r1_tin_hat` | part: helm "Tin Hat" | title "Reluctant Recruit"; codex `tin_hat_trooper` | a generic helm | 10 |
| 11 | `mod_hedgerow_picnic` | `mod_r2_eyeshade` | part: face "Eyeshade Visor" | title "Hedge Trimmer"; page "Cover (Hedges Are Not Walls)"; codex `clerk_rifleman` | a generic face part | 11 |
| 12 | `mod_trench_pardon` | `mod_r3_red_tape` | mutator: `mod_red_tape` "Red Tape" | title "Pinned and Proud"; codex `tripod_mg_team` | none (data; never cut) | 12 |
| 13 | `mod_bridge_too_far` | `mod_r4_goggles` | part: face "Goggles" | title "Bridge Burner (Not Literally)"; codex `biscuit_tank lunchbox_apc` | a generic face part | 13 |
| 14 | `mod_rail_yard_fireworks` | `mod_r5_back_radio` | part: back "Back Radio" | title "Wagon Master"; codex `signal_officer mortar_pair filing_howitzer`; Quick arena `mod_desert_outpost` | a generic back part; the arena unlock is dropped if rung 1 removes the arena | 14 |
| 15 | `mod_switchboard_hold` | `mod_r6_hard_hat` | part: helm "Hard Hat" | title "Mine Host"; page "Mines (Tape Is a Suggestion)"; Quick arena `mod_roadworks` | a generic helm | 15 |
| 16 | `mod_airfield_open_day` | `mod_r7_airmail` | mutator: `mod_airmail` | face `mod_aviator_goggles`; title "Frequent Flyer"; page "Air Layer (Please Look Up)" | none (data; never cut) | 16 |
| 17 | `mod_harbour_tour` | `mod_r8_wrench_big` | part: weapon "Big Wrench" | title "Harbour Master (Provisional)"; codex `site_first_aider spanner_mechanic grand_mower`; Quick arena `mod_garden_centre` | a generic weapon part | 17 |
| 18 | `mod_dam_finale` | `mod_r9_everything_else` | codex_write: page "Everything Else" | title "Chief of Staples"; sets `modern_complete` | none (page text stays) | 18 |
| 19 | `sf_lunch_break` | `sf_r1_fishbowl` | part: helm "Fishbowl Helmet" | title "Probationary Tenant"; codex `tidy_trooper` | a generic helm | 19 |
| 20 | `sf_floor_lava` | `sf_r2_magma_night` | quick_unlock: variant "Magma Lounge: Night Shift" | page "Hover Tanks"; title "Hover Hustler" | Workshop back `sf_back_glowpads` | 20 |
| 21 | `sf_overclock_oops` | `sf_r3_overcharge` | mutator: `sf_overcharge` "Overcharge" | back `sf_back_hoverpack`; title "Overclocker"; codex `rustbucket_rex spritz_medic` | none (data) | 21 |
| 22 | `sf_express_delivery` | `sf_r4_cape_shimmer` | part: cape "Shimmer Cape" | title "Diplomatic Courier"; page "Quiet Hour" | a generic back part | 22 |
| 23 | `sf_turn_it_off` | `sf_r5_fuses` | part: back "Fuse Bandolier" | title "IT Department"; page "Courtesy Systems" | a generic back part | 23 |
| 24 | `sf_grand_reopening` | `sf_r6_boss_rush` | quick_unlock: "Concierge Boss Rush" (Quick + Survival) | title "Complaints Department"; codex `grand_concierge` | Workshop helm `sf_helm_bowtie` | 24 |
| 25 | `sf_blink_jungle` | `sf_r7_staff_glow` | part: weapon "Glow Staff" | title "Grove Keeper"; codex `elder_hummock` | a generic staff | 25 |
| 26 | `sf_noise_complaint` | `sf_r8_sinkhole_night` | quick_unlock: variant "Sinkhole Nest: Night" | pages "The Hive", `void_manta`; title "Complaint Resolved" | Workshop back `sf_back_antenna` | 26 |
| 27 | `sf_queen_size` | `sf_r9_warranty_void` | mutator: `sf_warranty_void` "Warranty Void" | title "Exterminator Emeritus"; the finale cards; sets `scifi_complete` | none (data) | 27 |

`REWARD` row: `{ id, era, mission, class, primary: {type, id, key?}, plus: [{type, id}], titleText, substitution: {type, id} | null, text }`. The `*_complete` flags (`medieval_complete`, `modern_complete`, `scifi_complete`) are DERIVED (`completedEras`), not stored.

#### 3.11.3 `rewardsFor` and the writers

`rewardsFor(m, before, summary)` (facade, 3.1.1) reads `REWARD[m.rewardId]`: `firstClear` = no stars on the mission before; the primary and plus items are granted on a WIN (first clear grants everything; later wins grant only items not yet owned, like v8); the writer in `meta.recordMission` (INTEGRATION) executes, in this order and before any announcer/UI side effect, the stars write (3.1.3 of AR: stars first), then: `progress.unlocks`+`parts` (parts and Quick keys, deduped), `progress.unlockedMutators`, `progress.codex.open`, `progress.titles`, `progress.eras[era].last/cleared`, then milestones (3.11.6). The Results screen's reward chips read the same object, so a chip can never appear without its write (CU-T28 asserts chip == write == read for all 27 rows).

#### 3.11.4 Reward chips on briefing and results

Briefing: a chip per reward (Title, Mutator badge via `mutatorBadge`, Part, Quick unlock, Codex page) with the same icons as results; results: the existing "Rewards" block shows each earned item with a short "Usable now in <Workshop | Quick Battle | Codex>" link (`ctx.nav.goto`), and the first-clear reward reveal for the title (stamp animation, Reduce-Motion safe).

#### 3.11.5 Quick unlock design

Covered in 3.10.2 (presets, strip lock, deep link, hint, tests CU-T29). The unlock KEY is `REWARD.primary.key` (for example `med_qp_siege_season`); it is added to `progress.unlocks` by `rewardsFor().quick`.

#### 3.11.6 Star milestone track (CU-D09: it exists)

`MILESTONES` rows (meta pack): `ms_036`, `ms_054`, `ms_072`, `ms_090`, `ms_108` at 36 / 54 / 72 / 90 / 108 MISSION stars over released eras; a milestone is listed only if `threshold <= 27 x released`. Reward: a title (provisional texts, `spec/H` final: "Window Seat", "Aisle Seat", "Frequent Traveller", "Platinum Passenger", "Time Lord (Honorary)") written to `progress.titles` when the total reaches it, plus (rung 2 only) a photo frame for Snap. The chooser header shows the next milestone as a thin progress strip; the Stats "All" tab lists earned milestones. Cutting the track (rung 2) removes the strip, the five titles and the frames together; no mission reward references it. Mission-star accounting for the track is `globalMissionStars` (missions only; puzzle ids excluded), unlike the mutator rule (CU-D10).

### 3.12 CU12: GodPower schema consumers (the UI half of M15)

Facts (m): `sim/godpowers.js` holds `GOD_POWERS` (6 rows: `id name key cd delay r dur`), `IDX`, per-world `cd = Float32Array(2N)` and `casts = Int32Array(N)`, `list(team)` -> `{id, name, key, cd, cdMax, ready}`; its `_pulse` draws `w.rng.next() < 0.3` in `collect` order for the earthquake. `ui/hud/powers.js` hard-codes `DEFAULTS` (id, name, blurb), builds six slots, re-keys slot icons by `p.id` on every update, and its aim mode calls `game.aim(id)`. `_icons.js POWER_ICON` is the identity map of the six ids. `meta.js createAimRing` hard-codes the ring colours: `GOOD = {heal_wave, raise_chickens}` -> `0x7dff9a`, `wine_rain` -> `0xc779ff`, otherwise `0xffb23c`; `AimController.info(id)` reads the module constant. `save/stats.js` special-cases `meteor` (3 s kill window, `maxMeteorKills`) and `wine_rain` (`B.wineRain`) by id. `audio/cues.js` maps power ids to cues (lines 429-434).

#### 3.12.1 Row schema (spec/M M15 + two UI-only keys; data file `era_<id>/godpowers.js`, `GOD_POWERS` idmap, ids prefixed `med_ mod_gp_ sf_`)

```js
{ id, slot: 1..6, name, icon, blurb, joke, altJoke, tutorialLine, kind: 'harm'|'help'|'neutral', tags: [], cd, delay, r, dur,
  effect: { type, params }, telegraph: {...}, cue: '<audio cue id>',
  aim: { color: '#rrggbb', shape: 'ring'|'line', len?: u, from?: 'army_centroid' } }       // UI-only: the interpreter ignores aim and altJoke (R-CU-S4 allows both in validateGodPower)
```
`kind` drives the HUD tint and the ally rule (M15); `tags` carry `nuke`, `debuff_zone`, `summon`, `heal` (M15) and feed `save/stats.js`; `aim.color` is the design's ring colour; `shape: 'line'` is used only by the Modern Strafing Run (a dashed arrow from the caster team's centroid to the cursor, length `len` 24 u, with an impact disc of radius `r` per impact). The Ancient rows keep ids, numbers and the draw order of the earthquake pulse bit-identically through the interpreter (M15, G1); their UI fields come from a NEW file `era_ancient/godpower_ui.js` (AP-C02 pattern) merged by the registry at kit assembly:

| Ancient id | slot | kind | tags | icon | `aim.color` | blurb (the v8 `DEFAULTS` text) | joke / altJoke / tutorialLine |
|---|---|---|---|---|---|---|---|
| `zeus_lightning` | 1 | harm | | `zeus_lightning` | `#ffb23c` | Smite a cluster. Zeus bills later. | none |
| `meteor` | 2 | neutral | `nuke` | `meteor` | `#ffb23c` | Dinosaur Retirement Plan. Big crater, bigger apology. | none |
| `earthquake` | 3 | neutral | | `earthquake` | `#ffb23c` | Shake the formation. Rubble is free. | none |
| `heal_wave` | 4 | help | `heal` | `heal_wave` | `#7dff9a` | A very nice wave. Heals your units in the circle. | none |
| `wine_rain` | 5 | neutral | `debuff_zone` | `wine_rain` | `#c779ff` | Everyone gets tipsy and slower. Damage x0.6. | none |
| `raise_chickens` | 6 | help | `summon` | `raise_chickens` | `#7dff9a` | A flock of furious, feathered volunteers. | none |

The 18 new rows are the design tables (`god_powers.md` of each era; blurb, joke, alt joke, tutorialLine, ring colour, cd/delay/r/dur and cue ids verbatim):

| era | slot 1..6 ids (icon name = id) | aim colours | cue ids (AUDIO) |
|---|---|---|---|
| Medieval | `med_royal_volley`, `med_bell_drop`, `med_mud_season`, `med_soup_cart`, `med_precedence_dispute`, `med_audience_joins` | `#c8501e #b07a2c #6b4a2b #6fa86a #c9a227 #8bb12e` | `med_cue_volley med_cue_bell_drop med_cue_mud med_cue_soup med_cue_precedence med_cue_audience` |
| Modern | `mod_gp_ricochet_request`, `mod_gp_strafing_run`, `mod_gp_minefield_gift`, `mod_gp_tea_break`, `mod_gp_please_hold`, `mod_gp_express_delivery` | `#e2483d #ffb300 #fbeb8f #8ff0c0 #f2a8d2 #8ff0c0` (slot 3 over black tape, slot 6 aubergine edge) | `mod_cue_ricochet mod_cue_strafe mod_cue_gift mod_cue_tea mod_cue_hold mod_cue_delivery` |
| Sci-Fi | `sf_arc_tickle`, `sf_orbital_clean`, `sf_gravity_burp`, `sf_nano_spritz`, `sf_off_switch`, `sf_grazer_drop` | `#35e0ff #ff3d5a #c9b8ff #5be8a8 #5fa8ff #ffb02e` | `sf_cue_arc sf_cue_orbital sf_cue_burp sf_cue_spritz sf_cue_offswitch sf_cue_grazer_drop` |

(Design family names `strike_point strike_area_delayed zone_status heal_area summon_units zone_quake spawn_hazards` are the designers' words for M15's effect types `bolt_chain meteor/strike status_zone heal_zone spawn_squad/airdrop quake` + the new `spawn_hazards`; the UI never reads `effect.type`, so the naming reconciliation is spec/M's: PC-CU5.)

#### 3.12.2 Readers to migrate (the complete list; each one reads the row, none reads an Ancient id)

| reader | change | owner |
|---|---|---|
| `app/meta.js:23,121` `GOD_POWERS`, `AimController.info` | `info(id)` = `world.godpowers.info(id)` (the kit rows) | INTEGRATION |
| `app/meta.js:103-108` `GOOD` set and ring colours | colour = `power.aim.color`; shape from `power.aim.shape` (line aim draws a dashed arrow from `from` to the cursor) | INTEGRATION |
| `app/game.js:528` `godPowers()` | unchanged: `gp.list(team)`, which now also returns `blurb kind icon slot tags joke altJoke tutorialLine aim disabled` | SIM (list) / INTEGRATION |
| `ui/hud/powers.js` `DEFAULTS` + `POWER_ICON` | slots built from `hud.powers`; icon = `p.icon`; tooltip = `name: blurb`, second line `joke` (every third hover of a slot shows `altJoke`; one tooltip element => at most one "Intern's note" line on screen); key label `p.key \|\| slot` | UI |
| `ui/hud/_icons.js POWER_ICON` | generated from the registry rows (identity for Ancient) | UI |
| `save/stats.js` meteor window and `wineRain` | by `tags`: `nuke` replaces `kind === 'meteor'`, `debuff_zone` replaces `kind === 'wine_rain'`; tags arrive through `LifetimeStats.setPowerTags(map)` at `beginBattle` (Ancient map = the table above, so behaviour is identical) | REGISTRY |
| `audio/cues.js:429-434` | power cue = `row.cue` through router dep `powerCue(kind)`; Ancient rows keep their existing cue ids | AUDIO |
| `sim/mutators.js` `wine_rain_always`, `chicken_rain` | independent of the power rows (they apply a status / spawn a utility unit); see 3.16 | SIM |

#### 3.12.3 The 18 icons (UI, `_icons.js`, appended; each a 24x24 path set of at most 6 paths using the existing colour prefixes `s: a: r: o: w: b: k:`)

Names = power ids. Motifs (from the designs): `med_royal_volley` seven thin arrows converging on a rust ring (one late); `med_bell_drop` a bronze handbell with a motion streak over a shadow ring; `med_mud_season` a puddle, one sinking boot, three rain lines; `med_soup_cart` a cart with a steaming cauldron and ladle; `med_precedence_dispute` two figures bowing beside a scroll; `med_audience_joins` a crowd row with pitchforks and one small green dragon head; `mod_gp_ricochet_request` a tagged round bouncing off four cardboard targets; `mod_gp_strafing_run` a paper plane dragging a dashed line over five craters; `mod_gp_minefield_gift` a taped gift box with an amber light; `mod_gp_tea_break` a mug on a saucer beside a spanner; `mod_gp_please_hold` a handset with arcs and a pin; `mod_gp_express_delivery` a box with a wrong-way arrow under an umbrella canopy; `sf_arc_tickle` a cyan zig-zag hopping five hexagons; `sf_orbital_clean` a satellite beam onto a red ring with a duster in the crater; `sf_gravity_burp` a down-arrow in a bubble with three rocks rising; `sf_nano_spritz` a spray bottle with a mint mist ring and a bubble; `sf_off_switch` a red toggle in a hex bezel; `sf_grazer_drop` a fluffy creature with a lamp under a pod parachute. No letters, numbers, flags, crosses or stars at flag size (VB).

Acceptance (CU-T31): `ICON_NAMES` contains the 18 ids; `MISSING` stays empty after mounting the HUD for each era; each icon renders non-blank at 24 px and 48 px (>= 12% of pixels painted) and passes the greyscale-distinctness check (pairwise pixel distance >= a threshold fixed by the first build and recorded); `icon('zzz')` still falls back to `diamond` and records the miss.

#### 3.12.4 Mission rules `powers.disable` and `powers.override` (COORD decision: needed; Modern R4, Sci-Fi R3/R4)

Mission rules carry `rules.powers = { disable: [ids], override: { <id>: { cd?, delay?, r?, dur?, 'effect.params.<key>'?: value } } }`. `applyModeRules` copies it into `world.rules.powers`; **SIM (M15, request R-CU-S4)**: `GodPowers` merges `override` into per-world copies of the rows at construction (the shared kit rows are never mutated) and marks the `disable` ids: `cast()` returns false for them, `ready()` is false, `list()` reports `disabled: true`. CU2 rule 7 validates ids and override keys; `id slot kind cue icon tags` can never be overridden. **UI**: a disabled slot gets `.is-blocked` (lock glyph, dimmed icon, `aria-disabled`), activating it (click, digit key) shakes it and toasts `era.ui.powerBlocked` ("The intern has not been told about this one yet." for Modern and Sci-Fi); the tooltip's first line is the same sentence; an overridden power shows its patched numbers (cooldown text) and no extra marker. Puzzles run `rules.godPowers = false`: the six slots render `.is-blocked` with the line "Puzzles are about arithmetic, not miracles." (Ancient puzzles keep the v8 behaviour: `AimController.set` toast "God powers are off in this battle."; the HUD slots are unchanged in R1). The AI never casts powers. Availability tables of the designs (disable slot 3 in Modern M1-M6, slot 5 in Sci-Fi M1-M4, override slot 3 `propDmg` 0 in Sci-Fi M3) are mission data (spec/MS).

#### 3.12.5 Slot semantics and captions

Slots 1..6 keep their meaning in every era (1 quick strike, 2 big delayed strike, 3 area control, 4 heal/repair, 5 status, 6 summon); the keys `Digit1..Digit6` map to slots, not ids. The first time a slot is armed in an era the aim hint shows the power's `tutorialLine` as a second line (3.5.6; key `seen.beats['<prefix>_power_<slot>']`). The cooldown-ready cue stays `ui_tick`; a Modern power that becomes ready also shows a pen-click glyph on its ring and the toast "The line is open again." (provisional, `spec/H`).

### 3.13 CU13: player control and HUD for the new mechanics

#### 3.13.1 The selection card (`hud.selection`, built by `src/app/hudcard.js`, INTEGRATION; read by `ui/hud/selection.js`)

v8 builds `selection = { id, defId, name, hp, hpMax, kills, status: [], blurb }` and the status list is ALWAYS empty (m, `game.js hud()`), which is why no Ancient card ever shows a status icon. The new builder fills the existing fields identically for Ancient (empty status, no new fields: CU-D14) and, when `world.era !== 'ancient'`, adds:

```js
status: [ { id, t? } ... up to 8 ],     // from u.se (SUPPRESS->'pin', EMP->'emp', CLOAK->'cloak', SHIELDDOWN->'shield_down') and the derived ones below
shield: { v, max, down, regen } | null, // u.sh, u.shMax, SE.SHIELDDOWN > 0, shT >= delay
ammo:   { n, max, reloading, t, tMax } | null,   // u.ammo, def.ranged.mag, reloadT
setup:  { t, max } | null,              // u.setupT (crew weapons)
face:   { hull, turret } | null,        // radians, vehicles
layer:  'ground'|'hover'|'air', altitude: u.altitude, inCover: bool, cloak: bool, canPossess: bool, cls: 'ground'|'vehicle'|'mech'|'air'
```
Derived status ids (not statuses in the sim): `cover` (inCover), `reload` (reloadT > 0), `deploy` (setupT > 0), `blink` (a blink/dash ability with cd <= 0).

Layout (`ui/hud/selection.js`, tokens per era): name/type row; **shield arc above the HP bar** when `shield` is present: in `[data-era="scifi"]` a segmented arc of 8 segments (filled by `v/max`, `--era-alarm` when `down`, a sweeping ring animation while `regen`; static under Reduce Motion), in the other eras a 3 px bar above the HP bar; **ammo pips** under the HP row: one pip per round up to 8, filled by `n`, a reload ring over the pips while `reloading` (magazines larger than 8 show `n/max` text instead); status icons: `MAX_STATUS` 6 -> 8; vehicles show hull and turret arrows (two small rotated glyphs); air units show an altitude chip ("ALT 12"); a unit in cover shows the cyan bracket glyph. Hover cards (no buttons) show the same data. Accessibility: every added element has an `aria-label` ("Shield 40 of 90, down", "Ammo 3 of 8, reloading"), the card is a `role="region"` (existing) and updates only on change (no per-frame DOM writes; <= 10 Hz).

#### 3.13.2 New icons (UI; appended to `_icons.js`, 24x24, same rules as 3.12.3)

| group | ids |
|---|---|
| statuses (STATUS_ICON / STATUS_LABEL) | `pin` "Pinned", `emp` "Switched off", `cloak` "Cloaked", `shield_down` "Shield down", `cover` "In cover", `reload` "Reloading", `deploy` "Setting up", `blink` "Blink ready" |
| roles | `wheel` (vehicle), `wings` (air) |
| objectives | `capture` (flag on a circle), `core` (a tower heart), `escort` (a van with an arrow) |
| voice | `mute` (speaker with a slash; the Plato glyph) |
| interlude | `standby` (dish), `tick` (a plain check pictogram for the stamp) |

Total new icons: 18 powers + 8 + 2 + 3 + 1 + 2 = **34**.

#### 3.13.3 World-label tags (`render/labels.js` emits, `ui/hud/bubbles.js` draws; R-CU-R2 to RENDER)

Existing tag kinds: `blocked backstab crit charge rout stone heal` (budget: <= 8 live, 7 per second globally, within 70 u of the camera). New kinds (all subject to the same caps):

| kind | event (spec/M) | text | token | class |
|---|---|---|---|---|
| `plink` | `unit_deflect` outcome bounce, face front | "1" with a white spark | grey | minor |
| `bonk` | `unit_deflect` outcome glance, or face side/rear | "BONK" | orange | minor |
| `halved` | `unit_hit` with `cover` (R-CU-S1) | "x0.5" | cyan | minor |
| `flanked` | `unit_flanked` (side/rear) | "flanked" | red | major |
| `pinned` | `unit_suppressed` | "PINNED" | amber | major |
| `shield_down` | `shield_break` of a player unit or the selected unit | "SHIELD DOWN" | `--era-alarm` | major |

Budget classes: **major** tags use the v8 radius (70 u) and are never dropped for minor ones; **minor** tags need the victim within 35 u of the camera focus OR be the selected/hovered unit, and fire at most once per source unit per 1.5 s, so a 600-unit gun battle cannot starve the majors (CU-T33 floods 600 deflects/s and asserts majors still appear). Speech-bubble barks (`emp_hit` "please hold", `cloak_found`, `blink`, `banner_down`, `reload`) are the M bark keys and use the existing bubble path (<= 5 bubbles).

#### 3.13.4 Take Command: the UI half (CU-D21; sim half = `M-layers` 3.9)

`hud.possess = { id, name, hp, hpMax, cls, abilities[3], shield, ammo, setup, alt, cloak, aimOk, face }`. The banner shows a class chip ("On foot", "Driving", "Walking tall", "Flying" by `cls`), the HP bar with the shield bar (if any), ammo pips with the reload ring, the deploy ring (`setup`), altitude for air, and a cloak glyph. A **reticle** `#hud-tc-reticle` follows the cursor in command mode on pointer devices: green = aimed and in range (`aimOk`), amber = the turret/nose is slewing, red = out of arc or range; hidden on touch. Keys (the table of `M-layers` 3.9.8 restated for the Help overlay; `FIXED_KEYS.command` gains `{label: 'Altitude (air)', keys: ['KeyE', 'KeyQ']}` and the movement label becomes class-aware):

| class | W / S | A / D | cursor | click or J | Shift | digits 1-3 | E / Q |
|---|---|---|---|---|---|---|---|
| ground | move fwd/back (camera-relative) | strafe | aim point, snaps within 4 u | fire / swing | sprint | abilities | - |
| vehicle | throttle +1 / -1 | turn | turret bearing | main gun | - | abilities | - |
| mech | move | move | torso aim | weapon | sprint | abilities | - |
| air (face) | forward / back | strafe | nose aim | fire | boost x1.3 | abilities | climb / descend |
| air (velocity) | course | course | aim | fire | boost x1.3 | abilities | climb / descend |

Plumbing (requests to INTEGRATION, OI-L3): `Game.sendPossess(dx, dz, attack, ability, extra)` with `extra = { aim, drive, alt }`; `app/input.js` command branch reads the cursor via `groundAt`; `PossessController` merges `extra`; `hud.possess.cls` selects the touch layout; the Help overlay (`H`) in command context lists the possessed class's row only.

#### 3.13.5 Touch scheme at 390 x 844 (portrait phone; targets >= 44 px)

| element | spec |
|---|---|
| left stick | 132 px base, 64 px thumb, `left: max(16px, safe-left)`, `bottom: calc(24px + safe-bottom)`; ground/mech: `move`; vehicle: `drive {thr: -y, turn: x}`; air: `move` |
| Attack | 88 px circle, `right: 20px`, `bottom: calc(36px + safe-bottom)`; hold = fire (burst re-trigger, M-layers 3.9.6) |
| abilities 1-3 | 56 px circles stacked vertically on the right edge above Attack (gap 8 px), only the abilities the unit has; cooldown sweep as v8 |
| air Up / Down | two 52 px buttons at `left: 156px`, `bottom: 96px` / `36px` (next to the stick), only for `cls === 'air'`; hold = climb/descend |
| banner | top-left, max width 62%, two lines (name + class chip, bars) |
| Exit | top-right 44 x 44 |
| coverage | the command HUD covers <= 45% of the viewport (the v8 measured figure for the normal HUD, `verification_report`), asserted by a layout test |
| aim | no cursor on touch: `extra.aim` is omitted; ground units use the v8 nearest-target aim; **vehicles, mechs and air units on touch require the unit to aim itself** (R-CU-S5 to SIM, M8/M7: without `aim` the turret/nose follows the unit's own best target in the front arc). If SIM declines, Take Command for non-ground classes is keyboard+mouse only and the Command button is hidden on touch for those classes (`canPossess: false` when `isTouch`). |

#### 3.13.6 Requests of the design bibles answered here

| request | answer |
|---|---|
| Medieval "Colours strip" (one pennant per live banner with a resolve fill; M2; first thing cut) | **Accepted, cut-first** (`ui/hud/colours.js`, slot `top-left`, `keepHidden`): `hud.banners = [{ id, team, def, resolve }]` built every 0.5 s from live banner carriers (defs listed in `bannerDefs`), at most 3 per team; `resolve` = the carrier's hp fraction (the sim has no separate banner resolve; honest simplification); a pennant flashes when its carrier is below 30% and is struck through when it falls. Reduce Motion: no flash. Cut first if HUD time is short (ladder rung 5 neighbour); M2's beats work without it. |
| Medieval "Banner Cam" | **Rejected** (not promised by the design): a camera follow of a banner is `rig.setMode('follow', {unit})` already (key F on a selected carrier). |
| Modern R10 "muted-speaker glyph + PLATO (MUTED)" | **Accepted**, 3.19.1. |
| Sci-Fi R9 "beat trigger names mapped from sim events through the era pack" | **Accepted**, 3.5.3 (name table; `mech_step` gap R-CU-S2). |
| Modern/Sci-Fi R4 / R3+R4 `powers.disable` / `powers.override` | **Accepted** (COORD decision), 3.12.4. |
| Medieval/Modern/Sci-Fi "Suggested army hidden until two defeats" remark | **Rejected as worded**, 3.15 (button stays visible; the ladder adds an offer after 2 and a reveal after 4). |
| Sci-Fi "Four Questions" chips | **Accepted for Sci-Fi** (`ui.questions`), 3.14.1; Medieval and Modern provide none (a grey bar is not shown). |
| ui_chrome components (stamp overlays APPROVED/PENDING/DENIED on star rows, wax-seal cooldown icons that stamp when ready, escutcheon portrait frames, pennant bars, clipboard panels, ticket stubs, chamfered corners) | **Accepted as `[data-era]` component styles** (CSS only, no new DOM except the stamp text node), 3.6.7; stamp words come from `getTB('results')`. |

#### 3.13.7 Orders: `hold_fire` and `take_cover` are rejected (CU-D22)

`ui/hud/orders.js` keeps its four orders (`advance hold retreat focus`; keys `O`, `L`). M9 (`spec/M-layers` 3.10) is an AI rule (`ai.cover`, `findSpot`, `lineOfFire`), defines no command type and no order vocabulary change; adding `hold_fire` / `take_cover` would need new `command` orders in `sim/world.js`, AI support in M9 and tests that no spec owns. Fallback that already exists: **Hold** is the cover order for ranged units (M9's hold-and-shoot branch repositions to an unblocked firing spot when the line is blocked). The scout text may say "put them on Hold behind the hedge". If SIM later adds the orders, this section becomes an amendment.

### 3.14 CU14: counters, bounce feedback and scout codes

#### 3.14.1 What the player sees (UI half; the numbers are `spec/M`/`spec/M-layers`)

| surface | spec | Ancient (R1 and after) |
|---|---|---|
| placement hover chips | hovering a palette card or a placed squad shows up to 3 chips from `unitinfo.counterChips(def, defs)` (the v8 heuristic of `ui/unitinfo.js`): "Strong against" and "Weak against" role/tag chips; the new eras add the tag vocabulary of their mechanics (`armoured`, `shielded`, `air`, `vehicle`, `fortified`, `mounted`, `swarm`, `boss`, `machine`) as chip labels read from `era.ui.mechanics[].name`; a chip names a MECHANIC, never a unit id (units are named in Codex counters) | unchanged in R1: the v8 chip set is the output of the same function when `era.ui.mechanics` is `[]` |
| Codex unit page | the v8 "counters / prey" row (`counterTable(defs)`, `armygen.js`) stays; for a non-Ancient unit it gains a "Counter mechanic" line = the `counter` field of the `era.ui.mechanics` row whose `id` is in `def.tags` (first match) | unchanged |
| Codex Mechanics tab | NEW, only when `era.ui.mechanics.length > 0`; a list of mechanic cards `{ icon, name, rule, tell, counter, taughtIn }` (3.1.3); `taughtIn` links to the mission through `goto('campaign', { era, focus: missionId })`; the tab is absent for Ancient and absent in R1 | absent |
| bounce / clang / block feedback | purely the existing `unit_hit` fields: `blocked`, `reflected`, `bounced` (cavalry vs spear, charge break), `armour` and, new in the sim, `cover`, `dstReloading`, `projKind` (R-CU-S1). The HUD flashes a 0.4 s world label from the label table (3.13.3, minor class): `BLOCKED`, `BOUNCED`, `CLANG`, `IN COVER`, `SHIELD BREAK`, `NO EFFECT`; the words come from `getTB(ctx, 'hit')` (3.8) so each era says them in its own voice. The labels obey the flood cap of 3.13.3 | Ancient shows only the v8 `BLOCKED` pop that already exists (`game.js` `unit_hit` handler); nothing is added in Ancient |
| "Four Questions" chips (Sci-Fi only) | the placement bar shows four tiny chips `Soak? Crack? Reach? Answer?` (`era.ui.questions`), each lit when the placed army contains at least one unit of the listed ids (`soak`: shield/armour tanks; `crack`: shield breakers; `reach`: ranged/air; `answer`: detectors/anti-air/EMP); a dark chip is not an error, it is the question the army cannot answer; tapping a chip filters the palette to its units. Medieval and Modern ship `questions: null`: no chips and no grey bar | absent (`questions: null`) |
| chips under the scout strip | each scout advice keeps `counters: ids` (up to 3 unit ids) as unit chips exactly as v8 (`placement.js:368-380`) | unchanged |

Chips and labels are CSS/DOM only, read data through `era.ui`, and add no event.

#### 3.14.2 Scout codes per era (25 distinct ids, 27 declarations)

`armygen.scoutReport(defs, counts, enemyCounts)` returns `[{ code, severity, share, ids }]`. v8 has nine codes. The report becomes **registry data per era**: `ARMYGEN.scoutReport(defs, counts, enemyCounts, { era })` (request R-CU-S6 to SIM) runs the detector set `registry.byEra('SCOUT_DETECTORS', era)` (a list of `{ code, test(mine, theirs, helpers) -> {severity, share, ids} | null }`) and falls back to the nine v8 detectors when the era has none (so Ancient is byte-identical: same expressions, same order, same tie-break `severity desc, code asc`).

| era | codes (cumulative per era; shared ids keep their meaning) | count |
|---|---|---|
| Ancient | `no_anti_cav exposed_archers no_ranged no_cavalry siege_exposed blob_vs_ranged monster_incoming no_support one_note` | 9 |
| Medieval | the nine, reworded for the era (same ids, same detectors), plus `no_anti_armor no_anti_air banner_exposed fire_risk` | 9 + 4 = 13 |
| Modern | the nine, plus `no_anti_armor no_anti_air unscreened_guns no_flank_answer vehicles_no_repair` | 9 + 5 = 14 |
| Sci-Fi | the nine, plus `all_shield chip_heavy no_detector no_answer_air machine_heavy swarm_clump dot_heavy artillery_line single_boss` | 9 + 9 = 18 |

Counting rule (plan correction PC-CU6): the plan's "27" is the sum of per-era declarations 9 (v8) + 4 (Medieval) + 5 (Modern) + 9 (Sci-Fi) = 27 code slots on the era tables. `no_anti_armor` and `no_anti_air` are declared by both Medieval and Modern with one meaning, so the number of DISTINCT ids is **25** (9 + 4 + 3 + 9). CU-T35 asserts the exact id sets above, not a count, and asserts that a shared id has one detector and one `LESSON_OF_SCOUT` row.

Detector definitions (each is a pure function of the two `threatProfile`s plus the era helper set; thresholds are SIM's tuning in `spec/M-layers` and are NOT restated here; this table fixes WHEN a code exists and WHAT it points at):

| code | fires when | `ids` (chips) | lesson (3.14.4) |
|---|---|---|---|
| `no_anti_armor` | the enemy armoured share is above the era threshold and the player has no armour-piercing unit (tag `ap` or `antiarmor`) | the 3 cheapest AP units | the armour mechanic's mission |
| `no_anti_air` | the enemy has air units and the player has no unit with `canHitAir` | the 3 cheapest anti-air units | the air mechanic's mission |
| `banner_exposed` | (Medieval) the player's banner carriers are in the front rank and the enemy has cavalry or archers | spear/shield units | the Banner mission |
| `fire_risk` | (Medieval) the enemy fields fire sources and the player is clumped on flammable props | water/shield/cavalry chips | the fire mission |
| `unscreened_guns` | (Modern) the player's MG/mortar share is high and no infantry line is in front | rifle/riot chips | cover mission |
| `no_flank_answer` | (Modern) the enemy pins and the player has no unit that out-ranges or out-flanks | flankers | the flank mission |
| `vehicles_no_repair` | (Modern) vehicles are above a cost share and the army has no repair unit | engineer chips | vehicle mission |
| `all_shield` | (Sci-Fi) the player's `eshield` share is above 0.6 (chip fire and EMP both beat it) | non-shield bruisers | shield mission |
| `chip_heavy` | (Sci-Fi) the player's chip/dot damage share is above 0.6 against a shielded enemy (chip does not break bubbles) | shield breakers | shield mission |
| `no_detector` | (Sci-Fi) the enemy fields cloakers and the player has no detector | detector chips | cloak mission |
| `no_answer_air` | (Sci-Fi) the enemy has air/hover units and the player has no unit that can hit them | anti-air chips | air mission |
| `machine_heavy` | (Sci-Fi) the enemy is mostly `machine` and the player has no EMP/arc unit | EMP chips | EMP mission |
| `swarm_clump` | (Sci-Fi) the enemy fields swarm units and the player is clumped | splash/AoE chips | swarm mission |
| `dot_heavy` | (Sci-Fi) the player's damage is mostly damage-over-time against enemies with regeneration | burst chips | regen mission |
| `artillery_line` | (Sci-Fi) the enemy has an artillery line and the player has no fast flanker | flankers | artillery mission |
| `single_boss` | (Sci-Fi) one unit exceeds 40% of the enemy cost and the player has no focus-fire answer | boss killers | boss mission |
| (v8 nine) | unchanged expressions (`armygen.js:229-247`) | unchanged | unchanged |

Each era's `SCOUT_DETECTORS` row set is owned by SIM (the profile helpers need roster knowledge); this file owns the codes, the texts, the chip rules and the tests. If SIM declines `{era}`, the UI falls back to the nine v8 detectors for all eras and the era-only codes are simply never produced (the texts still ship; CU-T35 reports "detector missing" as a skip, not a pass).

#### 3.14.3 `SCOUT_TEXT` (registry kind `scout_text`, byEra)

Schema (the v8 shape of `humor/scout_text.js`): `SCOUT_TEXT[code] = { who, text, variants: [{ who, text }] }`, `who` in the era's commentators (Medieval/Modern/Sci-Fi keep the three-voice cast of `spec/H`; the 9 shared ids are RE-WORDED per era because the v8 text names spears, horses and drachmae). Rules:

1. Every code of an era's detector set has a row in that era's table (exact set equality, both directions; CU-T35). A missing row falls back to `DEFAULT_SCOUT[code]` (`game.js`), which is English-neutral, never to another era's text.
2. `text` must be TRUE advice (the humor bibles' rule, `scout_text.js` header): the CU test cross-checks each text's noun against the counter table (`counterTable`): a text for `no_anti_cav` that names a unit absent from the era roster fails (unit ids and unit names in a text are scanned against the era's `UNIT_TEXT` names).
3. Selection: the v8 `pick(code)` hash (`game.js` `_scout`) is unchanged; Ancient therefore shows the same line for the same army.
4. Counts are `spec/H`'s; this file requires 1 default + 2 variants per code, and the Sci-Fi `single_boss`, `no_detector`, `no_answer_air` texts must name the mechanic, not a unit.

#### 3.14.4 Lesson detectors tied to the same codes

`sim/lessons.js` (v8) maps battle outcomes to "lessons" shown on the Results screen. Rule: **every lesson detector id equals a scout code or a mechanic id**, via the data row `LESSON_OF_SCOUT = { [scoutCode]: lessonId }` (registry kind `lesson_of_scout`, byEra, authored beside `SCOUT_TEXT`). The Results screen shows the lesson when the SAME code was in the placement report for that player army and the battle was lost (or star 3 missed because of it); one "You were warned" line (`getTB(ctx, 'results').warned`) links the two. Ancient's mapping is the identity on its nine v8 codes where a lesson of that name exists in `lessons.js`, otherwise absent (no new Ancient behaviour; the "You were warned" line is not shown in Ancient, AP row `results.js`, PX opt-in `era.ui.lessonLink`, default absent).

#### 3.14.5 `spec/UC` request R-UC5 (UI role and ability rows, one attack-clip source): ACCEPTED

AP-U05 / AP-I02, owner UI. (1) **Role rows.** `ui/unitinfo.js` `ROLE_LABEL`, `ROLE_ICON`, `ROLE_CHIP` gain rows for the roles `vehicle` and `air` (labels "Vehicle", "Air"; icons `wheel` and `wing`, two of the 34 new icons, 3.13.2; chip variants `steel` and `sky`); Ancient roles keep their rows verbatim; a def whose role has no row is a UC-60 failure (UC owns the test), and the Codex falls back to a neutral chip and logs `diag.warn` rather than crashing. (2) **Ability rows.** `abilityInfo(ab, glossary)` reads the ability glossary of the registry (`registry.table('ability_info')`, AR 3.1.2; Ancient rows moved verbatim, the 7 generic Ancient texts stay pinned); no new-era ability may render the generic `'A special ability.'`. (3) **One attack-clip source.** `unitinfo.attackClip(def)` and `clipOptions(def)` import `meleeClip` / `rangedClip` from the sim helpers (UC-D18) for every def of a NON-Ancient era. For Ancient defs the shipped function stays as it is (it returns the non-existent id `strike_slash` for `strategos legionary centurion khopesh_warrior xerxes`; the Codex turntable shows the idle pose and a console warning): **pinned, not fixed** (PC-UC6; fixing it is an optional deliberate delta that this file does NOT elect, so G10 for the Codex is unchanged). Selection is by data (`def.era !== 'ancient'`), a lint-allowed registry read, not an `if` on the era id in screen code. (4) Tests: UC-T18 and UC-27/60 (UC owns), plus CU-T26 (Codex renders for every unit of the four eras without a console warning for non-Ancient defs).

---

### 3.15 CU15: difficulty names and the assist ladder

#### 3.15.1 Difficulty

Difficulty is `easy | normal | hard` everywhere in data; only the LABEL is era-flavoured, read from `era.ui.difficulty` (3.1.3). Star-3 tests use the era mechanic (that is `spec/MS`'s rule); this file asserts nothing about star conditions.

#### 3.15.2 The ladder (data-gated, free of charge)

Active only when `era.ui.assist = { nudgeAt: 2, revealAt: 4 }` exists (Medieval, Modern, Sci-Fi); **Ancient has no `assist` row, so every Ancient flow is unchanged** (AP row `briefing.js`/`placement.js`, PX).

| step | rule |
|---|---|
| counting | `progress.assist[missionId] = { d }` = defeats of THAT mission since its last win. `meta.recordMission` (touch 1 of `meta.js`, CU-D31) does `d += 1` on a lost campaign battle (not a quit, not a restart before the end, not a Daily or Quick battle) and deletes the key on a win. Capped at 99. Settings `assistLadder` (default true) can switch the offers off; the counter still counts. |
| rung 1, at `d >= nudgeAt` (2) | the briefing shows a second button `Deploy the suggested army` (`id="brief-deploy-suggested"`, secondary variant, wand icon) beside `Deploy`. It runs the normal deploy and sets `goto('placement', { autoSuggest: true })`; the placement screen then calls `G.suggestArmy()` once before first render. The suggestion is the mission's `reference` deployment (`campaignApi.reference(m)`; the MS lint requires one for every non-puzzle mission of a new era). Placement also shows a one-line banner chip `We tried the suggested army. It was tested.` (`getTB(ctx,'assist').offered`). Nothing is removed from the player's own options. |
| rung 2, at `d >= revealAt` (4) | additionally, the briefing "Forces" block lists the enemy composition: `<Enemy army> : 6 x Pikeman, 2 x Crossbow...` as unit chips (`id="brief-enemy"`), taken from `campaignApi.forces(m, arena, defs, seed).groups`. Missions whose enemy is a surprise wave (`script` spawns) list only the opening groups and end with `and more`. Puzzles are excluded (their enemy is always shown). |
| cost | none: the three-star par, the stars, the rewards and the tests are untouched; no coin, no star is taken. A mission won with the suggested army still earns its stars by the usual rules (the reference army is tested to reach at least two stars and, for missions where `spec/MS` can prove it, three). |
| `#pl-suggest` | the v8 "Suggested army" button on the placement screen stays VISIBLE from the first attempt in every era. The `first_three_minutes` remark "Suggested army hidden until two defeats" is **rejected as worded** (CU-D12): it contradicts `VF` 3.9 step 4 and the Modern M1 script, which press `#pl-suggest` on the first attempt. What the designs wanted, a gentle offer after trouble, is the brief button of rung 1 plus the banner chip. |
| reset | a win deletes the counter; leaving the mission without finishing it does not count; `Replay` of an already-won mission starts at 0. |
| phone | the two briefing buttons stack at 390 px (Deploy primary 56 px tall, suggested army secondary 48 px, full width). |
| Reduce Motion | the offered button appears without the pulse. |

`getTB(ctx, 'assist')` rows: `offered`, `suggestedBtn`, `enemyHeader`, `andMore` (era voice; `spec/H` finals).

Tests: CU-T36 (the ladder walk: 2 losses show `#brief-deploy-suggested`, 4 show `#brief-enemy`, a win clears it, stars unchanged, the Ancient mission M1 shows neither after 6 losses, a quit does not count).

---

### 3.16 CU16: mutator x mechanic matrix and the Moon Gravity rename

#### 3.16.1 Thresholds (confirms q3_product residual 24)

The nine shared mutators unlock by TOTAL stars over ALL released eras (CU-D10): `MUTATOR_STARS` 3..27 are unchanged. One cleared era (36 mission stars) therefore unlocks all nine shared mutators; **this is intended** (the era mutators are the per-era reward, rewarded by missions through `progress.unlockedMutators`). Per-era thresholds are rejected: they would re-lock v8 players. The picker shows the unlock hint "N more stars" counted over released eras.

#### 3.16.2 Per-era behaviour of the nine shared mutators

`mutatorMods` stays era-neutral (mods are multipliers). Where a mutator spawns or names content, the content comes from the era pack (the sim-side change is SIM's; requests R-CU-S7/S8).

| mutator | Ancient | Medieval | Modern | Sci-Fi |
|---|---|---|---|---|
| `big_heads` | unchanged | same effect, same text | same | same (helmets and visors scale with the head) |
| `tiny_titans` | unchanged | same | same | same (vehicles, mechs, air units and bosses are exempt from `scale`: see below) |
| `moon_gravity` | `kb x3`, name "Moon Gravity" | `kb x3`, "Moon Gravity" | `kb x3`, "Moon Gravity" | `kb x3`, shown as **"Low Gravity Fiesta"** (3.16.3) |
| `chicken_rain` | spawns `sacred_chicken` for the weaker side (v8, `mutators.js` `MutatorRuntime`) | spawns the era kit's `utilityUnit` (a harmless roster row the unit specs declare; provisional: a chicken in a tabard) | same, era kit (provisional: a hi-vis chicken) | same, era kit (provisional: a robot chicken with the `machine` tag) |
| `wine_rain_always` | applies TIPSY every 2 s to 25% for 4 s | wine is also medieval: unchanged, text unchanged | provisional text "It is permanently raining coffee. Everyone is a little jittery." (same TIPSY status, era label) | provisional text "It is permanently raining coolant. Everyone is a little glitchy." (same status; `machine` units are exempt, below) |
| `friendly_fire_fiesta` | unchanged | unchanged | unchanged (cover and explosives hurt friends: allowed) | unchanged (beams hurt friends) |
| `speedy_soldiers` | unchanged | unchanged | unchanged (vehicles and aircraft are exempt from `speed` to keep the movement contracts) | same exemption |
| `ragdoll_frenzy` | unchanged | unchanged | `vehicle`, `air` and fortified units are EXEMPT from the stagger (a tank must not ragdoll) | same exemption; `mech` units are exempt |
| `glass_cannons` | unchanged | unchanged | unchanged | `hp x0.5` applies to hit points only; shield pools are scaled by the same factor (so "very short battles" holds and shields do not make the mutator a no-op) |

Exemption rule (one sentence for SIM, request R-CU-S8): a mutator multiplier of kind `scale`, `speed` or the ragdoll stagger is skipped for any unit whose def has `cls` in `{ vehicle, air, mech }` or tag `fortified`. In Ancient there are none of those classes, so Ancient is byte-identical. The `glass_cannons` shield interplay: `shield.cap` is multiplied by the same `hp` factor (SIM, M15).

`chicken_rain` (R-CU-S7): `MutatorRuntime` spawns `kit.utilityUnit(era)` instead of the literal `'sacred_chicken'` (Ancient kit returns `sacred_chicken`, byte-identical). If an era kit declares no utility unit, `chicken_rain` is **disabled with reason** in that era ("The chickens are not cleared for this century.") and CU-T37 accepts that outcome. `wine_rain_always` applies the same TIPSY status in every era; `machine` units are exempt (a robot cannot be tipsy: SIM skip tag, R-CU-S7). The per-era texts above are PROVISIONAL and are final only when `spec/H` lands them (open item OI-CU2).

#### 3.16.3 Era display overlay and the Moon Gravity rename

The id `moon_gravity` never changes (shares, saves, daily plans). The LABEL is looked up with the era: `mutatorText(id, era)` reads `registry.byEra('MUTATOR_TEXT', era)[id]` and falls back to the shared text. Sci-Fi overlay rows: `moon_gravity: { name: 'Low Gravity Fiesta', desc: 'The Moon is already low gravity. Now so is everything else: knockback is tripled. Please do not look up.', short: 'Triple knockback', joke: <spec/H> }`. **The Ancient string is untouched** ("Moon Gravity", `mutators.js:15`; OI-3: no DA-5 amendment is taken, AR OI-3 answered here). The picker, the briefing rule list, the results summary and the share-code decoder show the overlay for the era of the battle; a mixed list (Daily) uses the plan era's overlay.

`getTB(ctx, 'mutators')` returns the overlay rows; era texts of the nine (wine/chicken variants above) are `spec/H` finals, provisional wording is listed in 3.16.2.

#### 3.16.4 Disabled-with-reason pairs

The picker (`_mutpicker`, `quick.js`, `survival.js`, `daily` display) takes a matrix from the registry kind `MUTATOR_RULES` (byEra, single row per era): `{ disabledPairs: [[a, b, reason]], disabledModes: [[id, mode, reason]] }`. A disabled option is `aria-disabled="true"`, is not selectable, shows the reason as its tooltip and as a visible subtitle on touch (no hover on phones), and a conflicting selection already present (a stale draft, a share code) is dropped on load with a toast of the reason. `sanitizeMutators(ids, { era, mode })` (request R-CU-S9 to SIM/INTEGRATION) applies the same rules in `Game.newSetup` and the share-code decoder, so nothing the picker forbids can enter through a shared string.

| era | pair or mode | reason (verbatim from the bible; `spec/H` may reword) |
|---|---|---|
| Medieval | `med_foam_swords` + `glass_cannons` | Foam cannot be a glass cannon. The committee is confused. |
| Medieval | `med_plague_season` + `wine_rain_always` | Both of these are about what goes in the cup. The abbey declines to choose. |
| Modern | `mod_airmail` + `friendly_fire_fiesta` | Two kinds of everyone gets hit. The post office refuses to choose |
| Modern | `mod_red_tape` in Puzzles | Puzzle weapons are pre-stamped |
| Modern | `mod_airmail` in Puzzles | A puzzle has no mail |
| Sci-Fi | `sf_overcharge` + `sf_warranty_void` | The warranty and the overcharge disagree about bubbles |
| Sci-Fi | `sf_warranty_void` in M1 and Puzzle 1 | forced by the mission rule (`rules.mutators` is `[]`), not a picker rule: the Sci-Fi bible says the two era mutators never appear in `campaignApi.rules` |
| all eras | any era mutator in a mission battle | mission `rules.mutators` is forced `[]` by `missionRules` (v8), the picker is not shown in campaign |
| all eras | an era mutator not yet earned | locked with its `locked` text (e.g. "Locked. Win the Dress Rehearsal. The foam is on order.") |

Ancient's matrix is empty (`MUTATOR_RULES` Ancient row `{ disabledPairs: [], disabledModes: [] }`): the Ancient picker is unchanged.

Rules the Sci-Fi bible adds (carried verbatim to the SIM side, no UI work): with `moon_gravity` the Overcharge shock stagger becomes a knock-up (allowed); EMP does not emit the Overcharge shock; Warranty Void is allowed in Survival; `med_foam_swords` x `moon_gravity` knockback caps at 4 (SIM). The matrix test (CU-T37) iterates every pair of the mutator ids available in each era (Ancient 9 ids = 36 pairs; each new era 9 + 2 = 11 ids = 55 pairs) in Quick, Survival and Daily modes and asserts: a pair that is enabled runs a 30 s deterministic battle without error and with no NaN; a pair that is disabled is not selectable and is dropped by `sanitizeMutators`.

#### 3.16.5 `mutatorsOf(era)` and Ancient Daily parity

`mutatorsOf(era)` (in `shared/leaf/mutator_stars.js`, 3.1.2) returns the shared nine plus that era's two, in table order; for `ancient` it returns exactly `MUTATORS.map(id)` of v8 (nine). The Daily draws mutators from `mutatorsOf(planEra)`; with R1 and ANY date the plan equals the v8 plan (G7, 400 dates). The mutator thresholds `MUTATOR_STARS` pair with `mutatorsOf('ancient')` only for the nine; the era mutators are not in the threshold table (they unlock by reward), so `unlockedMutators(totalStars)` still returns at most nine ids.

---

### 3.17 CU17: the chrome census, splash/title/diorama rotation, loading, Help and photo

#### 3.17.1 Method (what "no Ancient-only token in a shared string" means and how it is checked)

A **shared surface** is any string or DOM node that can render while a non-Ancient era is the current era. A string is **Ancient-only** when it contains a token of the Ancient token set `ANCIENT_TOKENS`, built at run time by `tools/chrome_census.mjs` (VF 3.23.5, owner TOOLS-VERIFY) from three sources: (1) the seed list `drachma drachmae hoplite hoplites Zeus Olympus Olympian Spartan Persian Roman Egypt Greek Hellen sandal toga laurel papyrus Papyrus Marble Brutus Plato Cassandra goat chicken elephant philosopher siege`; (2) every display name in the Ancient pack (`UNIT_TEXT`, factions, arenas, god powers, props) read through the registry; (3) minus the "shared by design" ids (the three commentator names appear in every era by design, D22; the word `chicken` stays because the `chicken_rain` mutator is shared; both are listed in `tests/ui/cu/census_shared.json`).

| pass | what is scanned | when | rule |
|---|---|---|---|
| static | the string tables of `src/ui/strings.js` (`getT` defaults), `ui/hud/_strings.js` (`getTB` defaults), `src/ui/screens/*.js`, `src/ui/hud/*.js`, `src/app/*.js` | every PR touching them (T-fast) | a literal with an Ancient token must be (a) behind `getT`/`getTB` with a REQUIRED override per released non-Ancient era (rule 2 of 3.8), or (b) in `tests/ui/cu/census_allow.json` with a one-line reason (table 3.17.2, rows marked EXCEPT) |
| dynamic | the visible text, `aria-label`, `title`, `placeholder` and `alt` of every screen reached by the flow table walk (3.6.4) for each released non-Ancient era, in R2, R3 and R4 states | T-era | zero hits outside the allowlist; the Ancient era itself is not scanned (its own words are its own) |
| fonts | computed `font-family` of every element on those screens | T-era | only `Bungee`, `Rubik`, `Cinzel` (CU-D19) |
| copy | a scan for `/roadmap/i`, `/not in this build/i`, `/coming (later|soon)/i` (3.6.9) | T-fast | zero hits |

#### 3.17.2 The shared-surface census (grep-built on HEAD; every hit has a disposition)

Disposition: **MOVE** = becomes data in `era_ancient/ui.js` / `ui_text.js` and gets a required override per new era; **FMT** = goes through `fmtCost` (3.7); **EXCEPT** = accepted and allow-listed; **KEEP** = not an Ancient token in context.

| file:line | text (shortened) | disposition |
|---|---|---|
| `ui/strings.js:13` | `drachmae: 'drachmae'` | FMT (`currencyWord`) |
| `ui/strings.js:19` | splash note "Sound plays after this click. Zeus apologises in advance." | MOVE to `era.ui.splash.sound`; Ancient literal unchanged |
| `ui/strings.js:48`, `:102` | "Recommended budget ... drachmae", "That army costs ... drachmae" | FMT |
| `ui/strings.js:132-133` | quality tiers Potato / Papyrus / Marble / Olympian and their subtitles | EXCEPT E-01: they are the saved values of `settings.quality` (an enum in `transfer.js`) and a settings vocabulary, not world content; the new eras add `eraQuality` copy (3.9.8) but the four names stay |
| `ui/strings.js:145` | `choreoIntroHint` names Brutus | MOVE (`{lead}` token = the era's first commentator display name; Ancient renders "Brutus", identical) |
| `ui/strings.js:204` | credits "Minister of Dramatic Pauses / Plato the Dry ..." | EXCEPT E-02: credits are the studio's, shown in every era (Credits page is era-neutral) |
| `ui/strings.js:257-262` | Stats labels `shieldBlocks kicks chickenKills goatsSaved elephantTramples arenasSaved drachmaeSpent thronesSat zeusInterventions stoned heroKills` | MOVE: Stats tiles come from `era.ui.absurd` (3.9.7); the Ancient section keeps these labels, the other sections use their own |
| `ui/screens/pause.js:9` | TIERS array (quality names again) | EXCEPT E-01 |
| `ui/screens/pause.js:10-15` | 15 pause quips naming Brutus, Cassandra, hoplite, sandals, elephant, Spartans, Plato | MOVE to `getTB(ctx,'pause').subs`; the Ancient 15 stay verbatim; each new era supplies its own list (>= 12; `spec/H`); the "never the same quip twice" logic is unchanged |
| `ui/screens/results.js:16-18` | `WIN_SUB`, `LOSE_SUB`, `DRAW_SUB` ("Zeus stormed off") | MOVE (`getTB(ctx,'results')`, 3.8) |
| `ui/screens/results.js:72`, `ui/hud/_art.js` | `laurelSvg()` win hero art | MOVE: `era.ui.heroArt = { win, lose, draw }` names an art function; Ancient = the three v8 ones; new eras: `rosette`, `stamp`, `hologram` (CSS/SVG, `[data-era]`) |
| `ui/screens/results.js:124-131` | lessons in "Cassandra's voice" | KEEP (commentator names are shared by design) |
| `ui/screens/results.js:87`, `briefing.js:52`, `title.js:47`, `settings.js:248` | `laurel` icon for titles/credits | KEEP (icon id, not a word); new eras may map the title chip icon through `era.ui.titleIcon`, default `laurel` |
| `ui/screens/briefing.js:119` | puzzle briefing lines for Brutus/Plato | KEEP |
| `ui/screens/stats.js:38` | `drachmaeSpent` | FMT / MOVE with the tiles |
| `ui/screens/_map.js:24` | the Olympus polygon in the Ancient map | KEEP (Ancient map data; replaced per era by `ERA_MAPS`, 3.6.8) |
| `ui/screens/_daily_plan.js:27` | fallback arena `marathon` | MOVE: fallback = the first arena of the plan era (`registry.ids('arena', era)[0]`); Ancient result identical |
| `ui/screens/codex.js:12` | `PROP_ICON` nature: `laurel` | KEEP (icon id) |
| `ui/hud/powers.js:9` | the six Ancient power captions ("Zeus' Lightning...") | MOVE: replaced by the `GodPower` rows (3.12) |
| `ui/hud/announcer.js:12` | `IDLE_LINE` per commentator | KEEP per voice (neutral), the Ancient lines mention no era-specific noun after review; any that does moves to `getTB(ctx,'hud').idle[era]` |
| `ui/hud/_portraits.js` | commentator portraits and names | EXCEPT E-03: shared cast (D22) |
| `app/meta.js:369` | `a.presetId || 'marathon'` fallback arena id | MOVE: `|| firstArena(era)`; Ancient identical |
| `app/game.js:68` | brush default `defId: 'hoplite'` | MOVE: default brush = `kit.defaultBrush(era)`; Ancient `hoplite` |
| `app/game.js:646` | the 7 diorama SETS | MOVE to `era.ui.dioramas` (3.17.3) |
| `tools/build.mjs:89` | boot shell "Polishing helmets..." | EXCEPT E-04 (3.17.4) |
| `content/era_ancient/humor/ui_text.js` (`ABOUT.tagline`, the 20 loading lines, mutator and rules humor) | read through `getT`/`getTB` | MOVE rules: the About tagline for `released >= 2` is the meta line (3.17.3); the loading lines belong to `era.ui.loading` |

The census table is data: `tests/ui/cu/census_allow.json` = the EXCEPT rows (E-01..E-04) with `file`, `pattern`, `reason`; any NEW hit fails the pass. A scan of `src/ui/mockctx.js` (27 hits) is excluded (a test double).

#### 3.17.3 Splash, title and diorama rotation

| surface | R1 (only Ancient) | `released >= 2` |
|---|---|---|
| splash tagline and sound note | v8 literals (`ui_text.js SPLASH`, `strings.js:19`) | the CURRENT era's `era.ui.splash.{tag, sound}` where current era = `progress.lastEra` (CU-D26); a fresh profile = Ancient |
| About tagline (`ui_text.js ABOUT.tagline`) | "A voxel battle simulator in the ancient world, with a goat." | the meta line `UI_TEXT.meta.aboutTagline` ("A voxel battle simulator across the ages, with a goat." provisional, `spec/H`) |
| title diorama (`Game.startDiorama`) | the 7 v8 SETS and the v8 index logic: random start, `+1` per restart (AP-P02, PX) | `dioramaRotation(released, lastEra)`: `for k in 0 .. maxLen-1: for era in [lastEra, ...rest in ERA_ORDER]: push era.ui.dioramas[k % len]`, so the first diorama is the last-played era and eras alternate; same random start and `+1` logic over the longer list; a diorama is an ordinary Quick setup of that era (the world carries `era`, `ensureEra(era)` already done because `released` eras are loaded lazily: the diorama of an era whose pack is not yet loaded is skipped, never awaited) |
| title mood | v8 | the era strip (3.6.9) and the `[data-era]` accent of the CURRENT era on the Campaign tile only; the rest of the title keeps the shared chrome |
| diorama camera | v8 | `dioramas[i][4]` optional camera `{yaw, pitch, fit}`, default the v8 values |

Tests: CU-T39 (with the census; rotation determinism with a seeded random start; R1 equals the 7-tuple list byte for byte).

#### 3.17.4 Loading screen

Two loading surfaces exist. (1) The **boot shell** (`tools/build.mjs:89`, `#vw-boot .boot-msg` "Polishing helmets...") is static HTML that renders before any JavaScript, so it cannot know an era; it stays unchanged for every release state (EXCEPT E-04; it is also the `PACK_LOADER` failure line). (2) The **era loading screen**, which v8 never needed because Ancient is always loaded, is the body of the time-portal (3.6.6) while `ensureEraAsync(era)` runs: `era.ui.loading = { lines[20], frame: 'scroll'|'folder'|'ticket'|'stub', marginalia }` (3.1.3). A line is chosen with the v8 `loadingLine(rng)` algorithm (the rng is the session rng), a progress element per `ui_chrome.md` section 5 of each era (a "Please hold" hex bar for Sci-Fi: the bar sprints to 99% and waits; folder tab for Modern; unrolling scroll for Medieval) and finishes at the portal's fixed 1.2 s or the real load, whichever is later, capped at 4 s ("max_wait_ms"); a load that takes longer than 4 s keeps the line and bar visible with a "Still loading..." second line (`getTB(ctx,'portal').slow`). Under Reduce Motion the bar is a static fill. The Ancient `LOADING_LINES` (20) stay in `ui_text.js`, are not shown by any v8 flow, and are not shown in R1 (unchanged).

#### 3.17.5 Help overlay and photo mode per era

| surface | rule |
|---|---|
| placement "Quick tour" (the `?` button `#pl-help`, three steps, `strings.js:114`) | the three v8 steps stay; each non-Ancient era may APPEND one era step (`getT(ctx).placement.hints.list` overlay by era: Medieval "Hold behind a hedge", Modern "Cover", Sci-Fi "Shields") taken from `era.ui.help`; the tour is a settings hint (`settings.seenHints.placementTutorial`), independent of the teaching layers; Ancient has no appended step |
| key help (`keymap.js` contexts) | the Take Command context rows (3.13.4) show only the keys valid for the controlled class; no other context changes |
| battle "Hints" in Pause | unchanged |
| photo mode (`photo.js`) | the toolbar is unchanged; the SNAP result gets an era frame when `era.ui.photoFrame` is set (a thin border, a corner caption "VOXELWARS - <era name> - <date>", drawn on the 2D copy of the canvas before `toBlob`); Ancient: `null`, the PNG is the v8 pixels; the frame is cut-ladder rung 2 (CU-D09 neighbour) and its absence changes nothing else |
| `Esc` in photo mode | unchanged |

---

### 3.18 CU18: announcer era-ization

#### 3.18.1 What is wrong today (verified)

`src/content/era_ancient/humor/announcer.js` is one module whose engine and Ancient data are fused: module-level `TEMPLATES`, `ARENA_NAMES`, `MISSION_TITLES`, `PROP_NAMES`, `CATEGORY_PRIORITY`, `HEROES` [23], the `ABILITY_SUB` map [~716] and the 40-case `onEvent` switch [1055-1170], which names Ancient events and defs (`trample` for `war_elephant`, `throne_sit`, `cyclops_misaim`, `trojan_reveal`). `createAnnouncer(opts)` [735] already takes `rng`, `stats`, `templates` and `config`. `meta.js` imports it directly [16] and builds one instance per session [322], reset on every `battle_start` [372].

#### 3.18.2 The factory

```js
createAnnouncer({ rng, stats, era = 'ancient', pool = null, config = {} })
// pool = the era's `announcer` pack object (AR 3.1.5), absent for Ancient:
//   { templates, arenaNames, missionTitles, propNames, heroes, abilitySub, eventCases, categoryPriority, statTable }
// returns the v8 interface plus:  setEra(era, pool)   offer(cat, sub, slots, extra)   debug()
```

Rules:

1. **Defaults reproduce today.** Every `pool` key defaults to the module constant (`templates -> TEMPLATES`, `heroes -> HEROES`, `abilitySub -> ABILITY_SUB`, `categoryPriority -> CATEGORY_PRIORITY`, `statTable -> STAT_TABLE`, `eventCases -> {}`). With no `pool` the instance is the v8 one; `tools/humor-sim.mjs` output for Ancient is byte-identical (G4, AP-C04). The existing `templates` option stays as an alias of `pool.templates`.
2. **`setEra(era, pool)`** swaps the six references and rebuilds the `byId` / `byCat` maps (memoised per era in a `Map`; `st.sess` per-session facts and the `used` / `recent` memories survive, line ids are era-prefixed `med_`, `mod_`, `sf_` so they cannot collide). `meta.js` calls it in the `battle_start` handler right after `announcer.reset()` with `registry.logic(world.era, 'announcer')`; the era is the battle's world era (precedence of AR 3.4).
3. **`eventCases`** is the era's event routes as DATA, replacing the Ancient `switch` for the era:

```js
eventCases = {
  <eventType>: [ { if?: { <payloadField>: <value> | { gte|lte|eq|in: <v> } },   // all clauses must hold
                   cat: '<category>', sub?: '<literal>' | { from: '<payloadField>' },
                   slots?: { <slot>: { unit: '<payloadField>' } | { n: '<payloadField>' } | { team: true } | { prop: '<payloadField>' } },
                   pri?: 1..5, delay?: seconds, bypassAlternation?: boolean,
                   once?: '<key>', everyNth?: n } ]
}
```

   Dispatch: for an event type present in `eventCases` the rows are evaluated in order and each producing row calls `offer`; for the CORE types `battle_start battle_end unit_kill first_blood kill_streak army_low lead_change big_swing stalemate_warning wave_spawn god_power` the built-in switch ALWAYS runs first (it maintains the per-battle statistics `bs`), then the era rows are added; for every other type the era rows REPLACE the built-in case (so a Modern pool never reacts to `trample` with an elephant line even if a stray payload matched). With no `eventCases` (Ancient) the switch is the only path. The new sim events the cases read (`reload_start`, `shield_break`, `cloak_on`, `emp_cast`, `mech_step`, `strike_call`, `suppress`, `bailout`, `vehicle_kill`...) are those of `spec/M` M-events; payload field names are checked against the M-events table by a unit test (CU-T40: every `if`/`slots` field exists in the event's payload schema).
4. **`bypassAlternation`.** `offer(cat, sub, slots, extra)` accepts `extra.bypassAlternation` (default false) and stores it on the candidate. `choosePool` skips the rule `if (L.who === st.lastWho) continue;` [line ~881] only for a candidate with the flag, so a set-piece or beat line may be spoken by the same voice as the previous line (set-pieces fire after a line of the same voice often). All other filters (recency, cooldown, `once`, cond score, resolvable slots) still apply, and a line that was just spoken is still never repeated. Ancient: no caller passes the flag, so Ancient behaviour is unchanged.
5. **Condition additions** in `condScore` (all optional, absent in Ancient templates): `cond.muted: true|false` (matches when `ctx.voices[L.who]` is `'muted'`, 3.19.1), `cond.cb: '<id>'` (matches when `seen.callbacks[id]` is true, 3.19.5), `cond.era: '<id>'` (rarely needed; ids are era-prefixed). A template with an unknown `cond` key makes `tools/humor-sim.mjs --era` fail (cond vocabulary check).
6. **Emitted lines carry** `muted: boolean` (from `ctx.voices[L.who] === 'muted'`) and `cbSet: '<id>'` (the template's `cbSet`), so the HUD and `meta.js` do not need the template.
7. **Data the announcer needs from the registry** (AR 3.1.5): `announcer.arenaNames` and `missionTitles` of the era (used for `{arena}` / `{mission}` slots), `propNames`, `heroes` (the big-unit ids for `cond.def2` hero lines), `abilitySub` (ability id -> sub-moment), `statTable` (def id -> `{faction, cost}` for `cond.faction` and "big" chicken-style checks; built from the era `defs`).
8. **Priorities.** `categoryPriority(cat)` takes the table of the pool: the `campaign_<missionId>` rule stays (priority 5); every era table must keep priority 5 for the categories `campaign_*`, `setpiece_*` and the mutator hooks, priority 4 for `beat:*`; `fastSpeed` and `need` of `DEFAULT_CONFIG` are unchanged and an era may override only `catCooldown`, `fillerCooldown`, `avgGap` through `pool.config` (never `need`, never `tokenCap`).

#### 3.18.3 `meta.js` through the registry

The six Ancient imports of `meta.js:16-21` become reads from the content object (`content.text`, `content.eras[era]`, AR 3.10.3); the announcer is one of the three touches (CU-D31, touch 3): `createAnnouncer` is read from the content object (`content.humor.createAnnouncer`, set by `buildContent` from the Ancient humor module under AP-C01/AP-C04; the factory has ONE implementation, in the Ancient file, edited only for the options above, and no `shared/**` module re-exports it, which keeps the rule that `shared/**` imports no era directory); the instance is still created once per session, `setEra` is called per battle, and `announcer.setVoices(voices)` is called with the mission voices (3.19.1) in the same `battle_start` block that builds `annCtx`.

#### 3.18.4 Tests (CU-T40)

(1) **Ancient parity**: `tools/humor-sim.mjs` over 200 seeded synthetic battles produces the same line sequence as the baseline (G4). (2) **Era pools**: for each new era, `createAnnouncer({era, pool})` emits for every category of the pool within 300 synthetic events with no template left un-offered over the pool of the pack (coverage >= 90% of categories; the others are `once`/mission-bound and listed). (3) **Routes**: every `eventCases` row names an existing category and every `if`/`slots` field exists in the M-events payload schema. (4) **bypassAlternation**: two consecutive offers with the same `who` are spoken back to back only when the second carries the flag. (5) **No Ancient leak**: a Medieval pool never emits a line with an Ancient noun (the census token set, 3.17.1, minus the shared cast). Negative control: drop `bypassAlternation` from the set-piece offer and (4) fails.

---

### 3.19 CU additions that cross several sections

#### 3.19.1 The "MUTED" glyph (Plato muted in Modern M1..M8)

**Data.** A mission may carry `voices: { <brutus|plato|cassandra>: 'muted' }` (validator check 6, 3.2). Modern M1..M8 carry `{ plato: 'muted' }`; M9 carries none (the design: "PLATO from M9"). `missionRules` copies it onto `setup.voices`; `newSetup` passes it through; `meta.js` copies it to `annCtx.voices` and calls `announcer.setVoices(voices)`. No other era mission carries it. The mechanism is generic (any commentator), the COORD decision names only Plato.

**One decoration function** `voiceLabel(ctx, who, voices) -> { name, muted, glyph }` in `src/ui/hud/_voices.js`:

| output | rule |
|---|---|
| `name` | the commentator display name; when muted: `<NAME> (MUTED)` upper-cased from `getTB(ctx,'hud').mutedName(name)` (`PLATO (MUTED)`) |
| `muted` | true when `voices[who] === 'muted'` |
| `glyph` | icon id `mute` (a speaker with a slash; one of the 34 new icons, 3.13.2); 14 px at the portrait's lower right, `--muted-ink` colour |

**Surfaces** (all four of the design, plus two): (1) the briefing chat bubbles (`briefing.js` `.bs-brief-name` and `.bs-brief-face`): the `<b>` name reads `PLATO (MUTED)`, the avatar gets class `is-muted` (greyscale 60%, the glyph) and the bubble text is fully legible; (2) the announcer booth (`hud/announcer.js` `.hud-ann-name`), portrait and line; (3) teaching beats whose `who` is the muted voice (`hud/teaching.js` card header); (4) set-piece bubbles (the announcer channel of 3.3.2 uses the same HUD path); plus (5) the Results lessons when the lesson voice is muted, (6) `aria-label` of each: "Plato, muted". The label NEVER explains itself: no tooltip, no help text (the design's joke: it "never explains itself"). Audio: a muted line's voice blip is replaced by one paper-tick (AU decides the cue; the flag is `line.muted`; request R-CU-A2). Reduce Motion: no pulse on the glyph. The text of a muted line is the same template text as any other; only its templates written for it carry `cond.muted: true` (the 8 `[P, ..., muted]` lines of `modern/humour.md`).

**Ancient and other eras**: `voices` absent -> `voiceLabel` returns the plain name, the DOM is byte-identical to v8. Tests: CU-T41 (M1 and M8 show the label on all four surfaces; M9 does not; the Ancient briefing DOM is unchanged; negative control: remove the mission flag and the label disappears everywhere at once).

#### 3.19.2 The "first launch after update" card (cross-reference to 3.6.10)

Specified in 3.6.10 (`whatsnew` overlay). The contract restated: a RETURNING profile (not fresh, CU-D25) sees one card per newly released era not yet in `seen.whatsnew`, in `ERA_ORDER`, at most one per launch, after the splash and before the title; "Take me there" = `goto('eras', { focus: era })`, "Not now" writes `seen.whatsnew[era]`; R1: never shown (nothing is new); fresh profiles: silently marked. Test CU-T05 (the card in the walks (a) returning Ancient player, (b) fresh).

#### 3.19.3 Loading

See 3.17.4.

#### 3.19.4 Phone STATUS (390 x 844, touch, portrait; `uiscan --viewport 390x844`, rules: no horizontal page scroll, every target >= 44 px, text >= 12 px, no overlap of two interactive elements)

| screen | status | rule |
|---|---|---|
| splash, title | WORKS (v8) | the era strip wraps to 2 rows under 420 px |
| `eras` chooser | NEW, WORKS | one card per row, still 16:9 above the text, the primary button pinned to the bottom sheet; passport and "mutator" row collapse into a "Details" disclosure |
| `campaign` map | WORKS (v8 compact): the SVG is hidden below 700 px and the mission list shows; each row >= 56 px; the era header is a sticky bar | |
| briefing | WORKS (v8) + the two assist buttons stack (3.15.2) | |
| placement | WORKS (v8 mobile layout); Four Questions chips scroll horizontally inside their own row (the page itself does not scroll) | |
| HUD / battle | WORKS (v8 touch HUD); selection card collapses to the name + shield/ammo row; world labels cap at 6 on screen; Take Command touch scheme 3.13.5 | |
| results | WORKS (v8) + era stamps as images, never as text over text | |
| quick, survival, daily, puzzles | WORKS (v8 stacked) + era chips wrap, locked presets show the hint as visible text (no hover) | |
| codex | WORKS (v8) + the Mechanics tab joins the tab strip (scrolls) | |
| achievements, stats, settings | WORKS (v8) + tabs scroll; Settings new rows (3.9.8) stack | |
| `whatsnew`, `eracard`, portal | NEW, WORKS: bottom-sheet card, 56 px buttons, portal full-bleed | |
| Workshop, Arena Builder, soldier painter | NOTICE (v8): the friendly desktop notice `phone_notice.js`; the notice text names the editor, never an era | |
| Take Command for vehicles/mechs/air on touch | CONDITIONAL: needs R-CU-S5, otherwise hidden (3.13.5) | |

Era `uiscan` budgets (VF 3.17): 3 viewports (1280x720, 768x1024, 390x844) for each of the 14 new screens/overlays; findings are ratcheted against `tests/baseline/uiscan_ancient.json` for Ancient.

#### 3.19.5 Callbacks (`seen.callbacks`) writer

`seen.callbacks[sourceId] = true` (<= 400 keys). Writer: ONE function `callbacks.mark(id)` in `src/ui/hud/_progress.js`, called (a) by `meta.js` when the announcer emits a line with `cbSet` (3.18.2 rule 6), (b) by the briefing/teaching renderers for lines with `cbSet`, (c) by `recordMission` for stat-met gates (for example `godPowers.wine_rain >= 1` is evaluated at read time from lifetime stats with `statOf`, never stored). Reader: `callbacks.has(id)` for `cond.cb`, for the arrival/cleared card footers (first footer whose `when` flag holds, at most one) and for what's-new. Cross-era: the keys are plain ids, so an Ancient-first player's callbacks fire in later eras. `spec/H` owns the ids and texts; this file owns writer, reader, cap and the rule that a gated line renders at most once per profile.

---

### 3.20 Files, AP rows, the `meta.js` budget and work packages

#### 3.20.1 New files (all NEW under AP-N01/AP-C02/AP-T08; none changes an Ancient file)

| path | owner | what |
|---|---|---|
| `src/app/setpiece.js` | INTEGRATION | `SetpieceDirector` (3.3), instantiated only by `meta.js` |
| `src/app/teaching.js` | INTEGRATION | `TeachingDirector` (3.5.5) |
| `src/app/hudcard.js` | INTEGRATION | selection card, status and tag builders (3.13.1) |
| `src/save/settings_migrate.js` | REGISTRY | `migrateSettings` (3.4.2) |
| `src/content/shared/gore.js` | REGISTRY | `resolveGore`, `resolveCorpses` (3.4.3) |
| `src/content/shared/currency.js` | REGISTRY | `formatCost`, `currencyWord` (3.7.1) |
| `src/content/shared/campaign_facade.js`, `mission_rules.js`, `ach_helpers.js`, `teaching_ancient.js` | REGISTRY | facade, mission rules incl. `powers`/`voices`, the generated achievement trios, the Ancient beats as data |
| `src/content/shared/leaf/mutator_stars.js` | REGISTRY | the one `MUTATOR_STARS` + `mutatorsOf(era)` |
| `src/content/era_ancient/ui.js` | REGISTRY | the Ancient era UI row (v8 literals, no behaviour) |
| `src/content/era_<id>/{ui,teaching,setpieces,godpowers,quick_presets,stat_rules}.js` | per era (CAMPAIGN-x, COMEDY-x, DESIGN-ERA-x) | rows authored from the design bibles |
| `src/ui/hud/{_currency,_era,_progress,_voices,interlude,colours}.js` | UI | `fmtCost`, era helpers, reward writers/readers, `voiceLabel`, stalemate overlay, Colours strip |
| `src/ui/screens/{eras,whatsnew,eracard}.js` | UI | chooser and cards (3.6) |
| `tools/era_stills.mjs`, `tools/era_stills.json`, `assets/era/chooser_<era>.webp` | RENDER with UI | stills (3.6.5) |
| `tests/ui/cu/*.test.mjs`, `tests/ui/cu/{census_allow,census_shared,currency_ancient_literals}.json` | UI | acceptance of section 4 |

#### 3.20.2 AP rows touched (Ancient paths; policy `PX` = bit-identical opt-in)

| Ancient path | AP row | change by this file | policy and golden |
|---|---|---|---|
| `src/app/meta.js` | AP-P03 | three touches (3.20.3) | PX; G10, G4, G6 |
| `src/app/game.js` | AP-P02 | `pushTimeScale`/`popTimeScale`, `pump`, `newSetup` era/voices/powers, diorama SETS read from the era row, `scoutText` by era, brush default, `suggestArmy` autoSuggest | PX; G10, G7 |
| `src/app/router.js`, `modes.js` | AP-P04 | `{id, params}` history; mode rules via registry | PX; G10 |
| `src/ui/strings.js` | AP-I01 | roadmap string removed (DA-1); `getT` era overlays; `{lead}` token | PX+DA-1; G4, G10 |
| `src/content/era_ancient/humor/ui_text.js` | AP-C05 | `ROADMAP_TAG` deleted only | PX+DA-1 |
| `src/ui/screens/title.js` | AP-I03 | roadmap chip removed; era strip when `released >= 2`; badge sum | PX+DA-1; G8 (title) |
| `src/ui/screens/**` (all others) | AP-I04 | era params, chips, tabs, `fmtCost` calls, assist buttons, Mechanics tab, MUTED label | PX; G10 across the 4 release states |
| `src/ui/hud/**` | AP-I05 | teaching data, god-power readers, selection card, tags, Take Command | PX; G10 |
| `src/ui/unitinfo.js` | AP-I02 / AP-U05 | counter chips by mechanic; `vehicle`/`air` role rows; one attack-clip source for non-Ancient defs (3.14.5) | PX; G10 (Codex), UC-T18 |
| `src/ui/{mockctx,kit,icons,keymap}.js` | AP-I06 | 34 icons appended; mock takes `era` | PX |
| `src/ui/{kit,screens,hud,boot}.css` | AP-I07 | `[data-era]` blocks appended | PX; G8 |
| `src/content/era_ancient/humor/announcer.js` | AP-C04 | factory options, `bypassAlternation`, `cond.muted/cb`, `setEra` | OI; G4 (`humor-sim`) |
| `src/content/era_ancient/campaign_validate.js` | AP-C03 | `validateMission(m, {era, defs, kit})` default unchanged | OI; G6, CU-T02 |
| `src/save/{docs,transfer,stats,store,migrate}.js` | AP-D01 | keys and whitelists of 3.1.5/3.4/3.9.3 | OI; G5 |
| `src/sim/armygen.js`, `lessons.js`, `mutators.js`, `godpowers.js` | AP-S08/S09 | requests R-CU-S6..S9 (SIM's rows) | OI; G7, G1 |
| `src/render/labels.js`, `cameras.js` | AP-R04 | R-CU-R1, R-CU-R2 (RENDER's rows) | OI; G8 |
| `src/audio/cues.js`, `engine.js` | AP-U01/U02 | R-CU-A1 (`stinger` options) | OI; G9 |
| `tools/build.mjs` | AP-T01 | hidden-era still filter only (AR 3.11) | TOOL |

Every other Ancient file is untouched by this file (AP-C06 frozen content).

#### 3.20.3 The three `meta.js` touches (CU-D31, AP-P03)

| touch | content | lines (v8) |
|---|---|---|
| 1 registry reads and progress writes | the six Ancient imports become content-object reads; `MISSION_ORDER` from `content.campaigns[era].order`; `recordMission`: `rewardsFor`, `progress.assist`, `eraStats` summary hand-off, `progress.titles`; `recordCampaign` by registry and `legacyCampaignCompleted` (3.9.6) | 16-21, 38, 535-570, 620 |
| 2 set-piece director | `M.setpiece = new SetpieceDirector(...)`, `case 'setpiece'` / `case 'script_beat'` in `onEvent`, `timeScale` reset on `battle_end` | 393-418 |
| 3 announcer and teaching | `announcer.setEra/setVoices` in the `battle_start` block, `TeachingDirector` replacing `TeachingGuide` | 54-92, 322, 372 |

`tools/hotfiles.mjs` (VF) counts these as 3 integrated touches; a fourth fails the budget.

#### 3.20.4 Work packages (phase = when the package must be green)

| WP | content | owner | phase | depends on |
|---|---|---|---|---|
| WP-CU1 | era UI row, facade, `_progress` helpers, `getT/getTB` era argument, `fmtCost`, currency census test | REGISTRY + UI | P1 | AR 3.6 |
| WP-CU2 | `eras` chooser, `campaign` per-era map, router params, flow table walk, roadmap removal, stills tool (Ancient still only) | UI | P1 | WP-CU1 |
| WP-CU3 | `migrateSettings`, `resolveGore/Corpses`, Settings controls, share-code field | REGISTRY + UI | P1 | AR 3.5 |
| WP-CU4 | `validateMission` era argument and 11 checks | CAMPAIGN | P1 | M14 |
| WP-CU5 | `TeachingDirector`, Ancient beats as data, skip buttons, first-sight toasts | INTEGRATION + UI | P2 | WP-CU1 |
| WP-CU6 | `SetpieceDirector`, `pushTimeScale`, `pump`, stalemate interlude | INTEGRATION | P2 | RA 3.11, M14 |
| WP-CU7 | god-power schema readers, 18+34 icons, `powers.disable/override`, selection card, label tags, Take Command UI and touch scheme | UI + INTEGRATION | P2 | M15, M-layers 3.9 |
| WP-CU8 | reward ledger, Quick presets and locks, milestones, achievements 63, eraStats, Stats | UI + CAMPAIGN | P2 | WP-CU1, AR 3.5 |
| WP-CU9 | scout codes, assist ladder, mutator matrix and overlays | UI + SIM | P2 | R-CU-S6..S9 |
| WP-CU10 | announcer era-ization, Plato MUTED, callbacks | COMEDY-EDITOR + UI | P2 | WP-CU6 |
| WP-CU11 | per-era data: `ui.js`, `teaching.js`, `setpieces.js`, presets, rewards | DESIGN-ERA-x with CAMPAIGN-x | P3 per era | WP-CU1..10 |
| WP-CU12 | what's-new, arrival/cleared/passport cards, portal, chooser stills of each era | UI + RENDER | P4 | WP-CU2 |
| WP-CU13 | chrome census, `uiscan` per screen, leak scan states, walks | TOOLS-VERIFY | P4 | all |

#### 3.20.5 Lint rules this file adds (AP-T03 `tools/lint.mjs`, owner TOOLS-GATE; negative fixtures in `tests/lint/`)

| rule | check |
|---|---|
| LR-CU1 | a `'setpiece'` event handler and `new SetpieceDirector` exist only in `src/app/meta.js` / `src/app/setpiece.js`; `audio/cues.js` and `render/battleview.js` contain neither |
| LR-CU2 | `src/app/setpiece.js` and `src/app/teaching.js` never call `setSpeed` (time goes through `pushTimeScale`) |
| LR-CU3 | `src/ui/hud/teaching.js` never reads or writes `settings.seenHints` (CU-D07) |
| LR-CU4 | no `if (era === '<id>')` or `world.era ===` comparison in `src/ui/**` and `src/app/**` except the allow-listed registry reads of `src/content/shared/**` (AR LR6 applied to this file's code) |

---

### 3.21 Requests

#### 3.21.1 Requests this file makes to other owners (each with a fallback; none is silent)

| id | to | request | fallback if declined | needed by |
|---|---|---|---|---|
| R-CU-R1 | RENDER (RA 3.11) | `rig.canShot(spec)` ignores reason `userInput` when `spec.priority >= 2`; `rig.shotActive()` returns the running handle or null | the director cancels the user-input guard itself by calling `rig.releaseInput()` before `shot` (INTEGRATION shim); set-pieces still run | P2 |
| R-CU-R2 | RENDER | `labels.js` emits the tag classes `major`/`minor` with the 14 tag kinds of 3.13.3 and the per-source 1.5 s throttle | UI draws the tags from raw events in `bubbles.js` (more cost, same look) | P2 |
| R-CU-A1 | AUDIO | `audio.stinger(cue, { bypassLimiter, duckDb, duckMs })` returning false when locked | the director plays the cue as an sfx and ducks music with `duck('music', ...)`; limiter applies | P2 |
| R-CU-A2 | AUDIO | a muted-line cue (paper tick) for `line.muted` | no blip for muted lines (silence) | P3 |
| R-CU-S1 | SIM | event payloads: `unit_hit.cover`, `unit_hit.dstReloading`, `unit_hit.projKind`, verify `unit_hit.dstDef`; `unit_kill.face` (hit from front/back); prop ids on `prop_damaged` and `prop_destroyed` | the beats using them (`reload_hit`, `cover_hit`) fall back to the proxies in 3.5.3; world-label tags `IN COVER` are dropped | P2 |
| R-CU-S2 | SIM | `mech_step` footfall event for `walker1`, <= 2 per second per unit | trigger `{sight:{tag:'mech'}}` | P2 |
| R-CU-S3 | SIM (M15) | Survival waves accept `{ bossCycle: [...], bossEvery: n }` | Boss Rush is Quick-only (3.10.2) | P2 |
| R-CU-S4 | SIM (M15) | `GodPowers` reads `world.rules.powers.disable/override` (3.12.4) and marks `blocked` | UI greys the slot and the sim ignores casts of a disabled power; `override` is dropped and the validator rejects it | P2 |
| R-CU-S5 | SIM (M7/M8) | vehicles, mechs and air units aim themselves when `extra.aim` is absent | Take Command for those classes is keyboard+mouse only; hidden on touch (3.13.5) | P2 |
| R-CU-S6 | SIM (armygen) | `scoutReport(defs, counts, enemy, { era })` with registry kind `SCOUT_DETECTORS` (3.14.2) | era-only scout codes never fire; texts ship | P2 |
| R-CU-S7 | SIM (mutators) | `chicken_rain` spawns `kit.utilityUnit(era)`; `wine_rain_always` skips `machine` units | `chicken_rain` disabled with reason in eras without a utility unit (3.16.2) | P2 |
| R-CU-S8 | SIM (mutators) | exemptions for `scale`/`speed`/ragdoll on `vehicle`/`air`/`mech`/`fortified`; `glass_cannons` scales shield pools | none needed in Ancient; for new eras the mutators are applied as written (a tank may ragdoll) and the design flags it | P2 |
| R-CU-S9 | SIM / INTEGRATION | `sanitizeMutators(ids, { era, mode })` used by `Game.newSetup` and the share decoder | the picker alone enforces the matrix; a hand-edited share code can break it (no crash) | P2 |
| R-CU-I1 | INTEGRATION | `Game.pump(seconds, dt)` harness hook (3.3.8) | none (ER20 needs it) | P2 |
| R-CU-I2 | INTEGRATION | `PresetRuntime`: run a Quick preset `script` (Dragon Day) through the M14 runtime | the preset is a plain setup without the scripted beat | P3 |
| R-CU-V1 | REGISTRY | `manifest.flags.legacyCampaignCompleted` (true on Ancient only) | `recordCampaign` branches on a constant list (lint-allowed in `registry`) | P1 |
| R-CU-V2 | TOOLS-VERIFY | `tools/chrome_census.mjs` consumes `census_allow.json`/`census_shared.json`; `uiscan` entries for the 14 new screens/overlays and the Settings rows; `walks.mjs` states (a)-(e) of 3.6.4 | the UI owner ships the allow-lists and screen ids; the gate step is TOOLS-VERIFY's | P4 |
| R-CU-H1 | COMEDY-EDITOR / spec/H | finals for every text marked provisional (chooser captions, difficulty names, mutator overlays, scout texts, basics beats per era, pause quips, `getTB` sections, what's-new/arrival/cleared copy) | provisional text ships; counts of OI-1 stay unfinal | P3 |

#### 3.21.2 Requests of the design bibles addressed to UI, INTEGRATION or DESIGN-UX, and their answers

| source | request | answer | where |
|---|---|---|---|
| Medieval `missions_outline` 6.5 | HUD Colours strip for M2 | ACCEPT, cut-first, `hud/colours.js` | 3.13.6 |
| Medieval 6.5 | Banner Cam | REJECT (not promised by the design); `F` follow exists | 3.13.6 |
| Modern R4, Sci-Fi R3 | `powers.disable` | ACCEPT (COORD) | 3.12.4 |
| Sci-Fi R4 | `powers.override` | ACCEPT (COORD) | 3.12.4 |
| Modern R10 | muted-speaker glyph, "PLATO (MUTED)" on briefing, booth, set-piece bubbles M1..M8 | ACCEPT | 3.19.1 |
| Sci-Fi R9 | beat trigger names mapped from sim events through the era pack | ACCEPT with `mech_step` gap | 3.5.3, R-CU-S2 |
| Modern R6 / Sci-Fi R2 | script event kinds and ops | not UI; the UI half is the dispatcher | 3.3 |
| each era `first_three_minutes` | "Suggested army hidden until two defeats" | REJECT as worded; offer after 2, reveal after 4 | 3.15.2 |
| each era `first_three_minutes` | arrival card (boarding pass / ticket stub / tapestry) skippable once | ACCEPT | 3.6.10 |
| each era `first_three_minutes` | one-off era notes (power caption `mod_power_1`, deploy strip note) | ACCEPT as toasts `seen.firstsight`/`seen.beats` | 3.5.2, 3.12.5 |
| each era `ui_chrome` | chooser captions, acts, legend, map pins, dioramas, loading, progress, stamps, wax seals, escutcheons, pennants, clipboards, ticket stubs | ACCEPT as data and `[data-era]` component styles | 3.6.7, 3.6.8, 3.13.6 |
| each era `ui_chrome` | HUD shield arc, ammo pips, status icons, scan-sweep cooldown rings | ACCEPT | 3.13.1 |
| Sci-Fi `ui_chrome` | "Four Questions" chips | ACCEPT for Sci-Fi; none for the other two | 3.14.1 |
| each era `mutators_achievements` | CU16 matrix, picker lock text, Moon Gravity as "Low Gravity Fiesta" | ACCEPT | 3.16 |
| each era `mutators_achievements` | achievements grouped by era with filter tabs; locked card with a question mark for the secret | ACCEPT | 3.9.5 |
| each era `mutators_achievements` | new lifetime stat keys | ACCEPT as `eraStats[era][key]` with design aliases | 3.9.3 |
| each era `missions_outline` | CU11 ledger rows M1..M9 (27) | ACCEPT with the 5-class substitutions | 3.11 |
| Modern `god_powers` / Medieval / Sci-Fi | GodPower rows, 18 icons, aim ring colours, the intern offstage (tooltips only) | ACCEPT | 3.12 |
| Sci-Fi `feel_sheet` 14 | open questions 1-8 (landing order, tint, colour, mech4, bounds, triggers, hover, F1-F18) | not UI; COORD/SIM | not in scope |
| Sci-Fi `props` 5 | emitter rows, spin flag | not UI | not in scope |
| `spec/UC` R-UC5 | UI role/ability rows (`vehicle`, `air`) and the shared attack-clip source | ACCEPT; the Ancient `strike_slash` defect stays pinned | 3.14.5 |
| plan CU13 | orders `hold_fire`, `take_cover` "only if M9 supports them" | REJECT (M9 is an AI rule); `Hold` is the cover order | 3.13.7 |

---

## 4. Acceptance

Convention: every test is registered with `criterion(id, {er, owner, tier, negctl, text})` (VF-D1), ships under `tests/ui/cu/` unless it is a tool run, and has a NEGATIVE CONTROL that breaks the thing under test and must make the test fail (`tools/negcontrols.mjs` re-runs them). Tier letters are VF's: F = T-fast, E = T-era, U = T-full, R = release. "Owner" is the owner of the test script. Ancient parity (`G*`) cases are the VF goldens; this section adds the CU-specific ones.

| id | what is proved | script and inputs | thresholds | owner | tier | negative control |
|---|---|---|---|---|---|---|
| CU-T01 | facade totality and the Ancient UI row equals the v8 literals (CU1) | `facade.test.mjs`: for every method of 3.1.2 and every released era, no call returns `undefined` for a valid id; `currency_ancient_literals.json` compared with the string found by reading the FZ source | 0 undefined; 100% literals equal | REGISTRY | F | rename a literal in `era_ancient/ui.js`; the test fails |
| CU-T02 | validator: 9 Ancient missions pass with `o.era` omitted and `'ancient'`; the 11 extra checks each reject their fixture (CU2) | `validator.test.mjs`: 9 missions x 2, then 11 bad fixtures from `design/<era>/missions.json` mutated one field each | 18 pass, 11 reject with the listed message | CAMPAIGN | F | delete check 3 (set-piece op); the fixture passes and the test fails |
| CU-T03 | R-PARITY: with `released = {ancient}` the DOM of title, campaign, briefing, placement, battle HUD, results, quick, survival, daily, puzzles, codex, achievements, stats, settings, credits equals v8 except DA-1 | `walks.mjs --state R1` DOM hash per screen vs ``tests/golden/g10_dom.*` (VF G10)` | 15/15 equal | TOOLS-VERIFY | E | add `.vw-era-strip` in R1; the hash differs |
| CU-T04 | hidden-era leak (ER21b) over `[ancient]`, `+medieval`, `+modern`, `all` | `leak_scan.mjs` over DOM text, string tables, share codes, what's-new, totals, achievements count | 0 hits in 4 states | TOOLS-VERIFY | U | put "Sci-Fi" in a Medieval-state string; found |
| CU-T05 | flow table: all rows of the machine-readable `flowtable` block execute with the stated outcomes, including what's-new for returning and fresh profiles, `lastEra` derivation and Continue targets (CU6) | `flowtable.test.mjs` parses the JSON block of 3.6.4 and drives `walks.mjs`; five profile fixtures | every row passes; each defaults-table entry is read by a row | UI | E | change `lastEra` rule to first era; row 3 fails |
| CU-T06 | router params: Back from briefing, results and map returns to the same era; deep links `goto('codex', {era, tab, unit})` | `router.test.mjs` | 3 screens x 4 eras equal | UI | F | drop `params` on Back; fails |
| CU-T07 | single owner and five channels (CU3) | (a) `grep -rn "'setpiece'" src` finds a handler only in `meta.js`; (b) every `cue` resolves; (c) a fake rig/audio/announcer unit proves each of the five channels fires once per piece | 1 handler; 5/5 channels per piece; 27 pieces | INTEGRATION | F | add a `setpiece` handler in `cues.js`; the grep fails and the stinger double-fires |
| CU-T08 | time scale and input policy | fake clock: `pushTimeScale` min semantics, `getSpeed()` never changes, possession/photo/kill-cam drop, aim waits 1.5 s, Esc/click consumed, Reduce Motion cuts | 12 cases | INTEGRATION | F | make the director call `setSpeed`; `speed` events appear and the test fails |
| CU-T09 | gore/corpses migration and import (CU4): v8 profile `gore:'red'` without marker -> `goreAuto` true; with `goreChosen` -> kept; export/import to and from the v8 validator | `settings_migrate.test.mjs` + the v8 `validateSettingsData` loaded from the baseline worktree | 8 migration cases; v8 import accepts the new export (no throw) | REGISTRY | F | write `gore:'auto'` into the export; the v8 validator throws |
| CU-T10 | resolver matrix: era x class x setting for `resolveGore`, `resolveCorpses` equals the table of 3.4.3 | table test (4 eras x 4 classes x 4 settings) | 64/64 cells | REGISTRY | F | swap two cells; fails |
| CU-T11 | teaching populations: (a) fresh Ancient-first sees the v8 five-beat sequence (4 visible cards, `done` silent), (b) `seen.basics` set sees era beats only, (c) Sci-Fi-first then Ancient, (d) skip tutorial / skip era tips | `teaching.test.mjs` + `campaign_play --beats` on mission 1 of each era | exact order; 0 repeats | UI | E | mark `seen.basics` per slot wrongly; (b) fails |
| CU-T12 | arbitration: a beat, a shot and an aim in every order; never two visible, never lost, aim > shot > beat > toast | fake clock, 6 permutations | 6/6 | INTEGRATION | F | remove the aim rule; fails |
| CU-T13 | beats for every mission fire once (ER19) and set-pieces fire all five channels (ER20) | `campaign_play --beats --setpieces` over 27 missions (reference run) | 27/27 | TOOLS-VERIFY | R (mission 1: E) | delete one beat id from a pack; that mission fails |
| CU-T14 | stills tool: `--check` input hash matches committed files; each still <= 100 KB, 1280x720; hidden eras publish none | `era_stills.mjs --check`; `build.mjs` file list | 4 files <= 100 KB; hidden = 0 | RENDER | E | edit the tool input; hash mismatch |
| CU-T15 | portal timing: warm era <= 1.25 s; cold <= 4 s with a loading line; skip by any key | fake clock | thresholds as stated | UI | F | make `ensureEra` synchronous-blocking; the paint-before-load check fails |
| CU-T16 | `ERA_MAPS`: schema of 3.6.8 for 4 eras; the Ancient map raster equals the v8 PNG (G8) | schema test + G8 map capture | schema valid; pixel diff 0 | UI | E | change one polygon point; G8 fails |
| CU-T17 | roadmap string test (CU6/CU17): no `/roadmap/i`, `/not in this build/i`, `/coming (later|soon)/i`, no name of an unreleased era per release state | scan of the built fragment | 0 hits x 4 states | UI | F | re-add `ROADMAP_TAG`; fails |
| CU-T18 | currency census: the 47-site inventory of 3.7.2 recomputed by grep; every site uses `fmtCost`/`currencyWord`; Ancient output byte-identical | `currency_census.test.mjs` | 47/47 sites; 0 literal `drachm` outside `era_ancient` | UI | F | add a literal `dr`; fails |
| CU-T19 | `getTB` defaults: Ancient defaults equal v8 DOM text; every default with an Ancient token has an override per released new era | iterate sections of 3.8 | 0 missing overrides | UI | F | remove one Sci-Fi override; fails |
| CU-T20 | achievements: 63 over `all`, 24 in R1, 24+12 per added era, meta trio gated by `minReleased`; `ancient_history` pinned | `achievements.test.mjs` | counts exact | UI | F | remove `minReleased` from a meta achievement; R1 count 25 |
| CU-T21 | `eraStats` whitelist and round trip: write via `STAT_RULES`, export, import, read by `statOf` | `stats_roundtrip.test.mjs` | all keys of 3.9.3 | REGISTRY | F | drop one key from the whitelist; import loses it |
| CU-T22 | Stats screen tiles and Settings controls: each control id present, labelled, keyboard reachable, `uiscan` entry (residual 35) | `uiscan --screens settings,stats` | 0 findings above baseline | UI | E | remove a label; finding appears |
| CU-T23 | Quick: era chips, era-pure factions and arenas, last-era memory, lazy thumbnails (<= 120 ms main-thread slice, <= 16 on the title) | `quick.test.mjs` with a fake `arenaThumb` counter | thresholds as stated | UI | E | request all arenas at once; counter exceeds |
| CU-T24 | Daily: v8 plan identity for 400 dates in R1 (G7); era stream `rng(seedOf(key) ^ 0xE4A)`; one streak; share-string suffix only for non-Ancient plans; v8 parser ignores the suffix | `daily.test.mjs` | 400/400 identical; suffix cases 4 | UI | F | draw the era from the main stream; G7 fails |
| CU-T25 | Survival: era tab, `survival.<era>` keys, Boss Rush half present only with R-CU-S3 | `survival.test.mjs` | per era 1 run to wave 3 | UI | E | write non-Ancient into root keys; v8 keys change |
| CU-T26 | Puzzles and Codex: per-era puzzle lists, Mechanics tab, dossier lock and unlock (5 fielded or reward), roles `vehicle`/`air` | `codex.test.mjs` | all assertions | UI | E | unlock without the write; fails |
| CU-T27 | Workshop and Arena Builder: era chips, part lists by era, unlock key of each of the 14 part rewards usable | `workshop_rewards.test.mjs` | 14/14 | EDITORS | U | grant a key no part reads; fails |
| CU-T28 | reward ledger: for every row chip == write == read (27 rows) | `ledger.test.mjs` | 27/27 | UI | F | break one `rewardsFor` writer; that row fails |
| CU-T29 | Quick unlock is real: 5 unlock keys gate their presets; Daily ignores locks | `quick_unlock.test.mjs` | 5/5; Daily 0 locked | UI | E | ignore the lock in the picker; fails |
| CU-T30 | star milestones 36/54/72/90/108 visible only when reachable by released eras; titles written once | `milestones.test.mjs` | R1 shows none | UI | F | show 108 in R1; fails |
| CU-T31 | god-power readers and icons: every reader of 3.12.2 uses the row; `ICON_NAMES` has the 18 + 16 new ids; `MISSING` empty | `godpower_ui.test.mjs`, mount HUD per era | 34/34 icons; 6 slots per era | UI | F | restore the Ancient id in `powers.js`; the Medieval HUD shows the wrong caption |
| CU-T32 | `powers.disable/override`: blocked slot state, tooltip, validator rejections | `powers_rules.test.mjs` | 7 cases | UI | E | ignore `disable`; the slot stays castable |
| CU-T33 | HUD status and tags: status fills only for non-Ancient; Ancient card DOM unchanged; flood of 600 deflects/s keeps majors | `hudcard.test.mjs` | majors shown; Ancient hash equal | UI | E | remove the minor throttle; majors starve |
| CU-T34 | Take Command classes and touch layout at 390x844: rings, key table, target sizes >= 44, HUD coverage <= 45% | `uiscan --viewport 390x844` + `command_ui.test.mjs` | 0 findings | UI | E | shrink Attack to 36 px; fails |
| CU-T35 | scout codes: exact id sets per era; one detector and one text row per id; `LESSON_OF_SCOUT` links | `scout.test.mjs` | 9/13/14/18; 25 distinct | UI | F | delete a text row; fails |
| CU-T36 | assist ladder walk (3.15.2) | `assist.test.mjs` | as 3.15.2 | UI | E | count a quit as a defeat; fails |
| CU-T37 | mutator matrix: every enabled pair runs a 30 s deterministic battle with no NaN; every disabled pair is unselectable and sanitised; Ancient picker unchanged | `mutator_matrix.test.mjs` | 36 + 3 x 55 pairs | UI | U | enable a disabled pair; fails |
| CU-T38 | tokens: contrast >= 4.5:1 (large >= 3:1) in every `[data-era]` block; fonts only Bungee/Rubik/Cinzel | `tokens.test.mjs` + `chrome_census --fonts` | 0 violations | UI | F | set a Papyrus font; fails |
| CU-T39 | chrome census (3.17.1) and rotation: 0 hits outside the allow-list; R1 diorama list equals the 7 tuples; rotation deterministic | `chrome_census.mjs`; `rotation.test.mjs` | 0 hits | TOOLS-VERIFY | U | add "drachma" to a shared string; found |
| CU-T40 | announcer (3.18.4): Ancient parity, era pools, routes, bypass, no Ancient leak | `humor-sim.mjs --era`, `announcer_era.test.mjs` | 5 groups | COMEDY-EDITOR | E | drop the flag; fails |
| CU-T41 | Plato MUTED (3.19.1) | `muted.test.mjs`: M1 and M8 show it on four surfaces, M9 none, Ancient DOM equal | 4 surfaces x 8 missions | UI | E | remove the mission flag |
| CU-T42 | phone `uiscan` at 390x844 for the screens of 3.19.4 and the cards | `uiscan --viewport 390x844 --era all` | no horizontal scroll; targets >= 44; 0 new findings | TOOLS-VERIFY | U | add a 600 px wide table; fails |

Coverage statement: CU1 T01; CU2 T02; CU3 T07, T08, T13; CU4 T09, T10; CU5 T11, T12, T13; CU6 T03-T06, T14-T17; CU7 T18; CU8 T19; CU9 T20-T22; CU10 T23-T27; CU11 T28-T30; CU12 T31, T32; CU13 T33, T34; CU14 T35; CU15 T36; CU16 T37; CU17 T38, T39; CU18 T40; additions T41 (Plato), T42 (phone), T05 (what's-new).

---

## 5. Residual ledger

Every assigned residual and its home. "Answered" means the spec text exists; "tested" names the CU-T row.

| residual | summary | answered in | tested |
|---|---|---|---|
| q3_product 1 | basics layer vs era layer, the identical Ancient sequence, mission 1 for a profile with `seen.basics` set | 3.5.2, 3.5.4, 3.5.7 | T11 |
| q3_product 4 | every consumer of the gore value | 3.4.1 (list), 3.4.2 | T09 |
| q3_product 5 | down-level policy: export code and rollback to v8 | 3.4.2 (booleans), 3.4.5 | T09 |
| q3_product 6 (shared) | flow table concrete outcomes | 3.6.4 | T05 |
| q3_product 7 | dispatcher must not call `setSpeed`; time-scale multiplier | 3.3.3 | T08 |
| q3_product 8 | GodPower interpreter, readers to migrate | 3.12.1, 3.12.2 | T31 |
| q3_product 11 (shared, AR) | router `{id, params}` | 3.6.2; AR 3.6.3 | T06 |
| q3_product 12 | `ERA_MAPS` schema | 3.6.8 | T16 |
| q3_product 13 | Daily default and share-string marker | 3.10.4 | T24 |
| q3_product 19 (shared, spec/H) | era-neutral basics text | 3.5.2 (slots), text in OI-CU2 | T11 |
| q3_product 23 | achievements 45 vs per era: 24 + 36 + 3 = 63 | 3.9.1, 3.9.2 | T20 |
| q3_product 24 | per-era text of the nine shared mutators; thresholds global | 3.16.1, 3.16.2 | T37 |
| q3_product 25 | 27-row ledger by class, substitutions, milestone decision | 3.11.1, 3.11.2, 3.11.6 | T28, T30 |
| q3_product 26 | workshop parts per slot; which rewards are parts | 3.11.2 (14 parts), 3.10.7 | T27 |
| q3_product 29 | the file must contain CU7, CU8, CU9, CU14, CU16, CU17 and acceptance covers them | 3.7, 3.8, 3.9, 3.14, 3.16, 3.17; section 4 coverage statement | all |
| q3_product 30 | era chrome uses only shipped fonts | 3.6.7, CU-D19 | T38 |
| q3_product 32 | Quick era chip default, lazy thumbnails, era-pure lists | 3.10.2 | T23 |
| q3_product 34 | arbitration table | 3.5.5 | T12 |
| q3_product 35 | Replay teaching, Reopen What's New, era quality, per-era Stats labels, controls with ids | 3.9.8, 3.9.7, 3.6.10 | T22 |
| q3_program 12 | what's-new per release; aggregates over released eras | CU-D01, 3.6.10 | T03, T04 |
| q3_program 14 | MS split (not CU) | n/a: `validateMission` call (3.2) is the interface | T02 |
| q3_engine 34 | shot slow-down is render pacing only, ticks unchanged, replay records shot start | 3.3.3 (time scale multiplies `speed`; the record is `game.run.setpieces`); PC-CU7 | T08 |
| q2_product Q14 | chooser for a returning player, roadmap lie | 3.6.4, 3.6.9 | T05, T17 |
| q2_product Q15 | ledger vs mutator thresholds, ladder | 3.11, 3.16.1, CU-D10 | T28, T37 |
| q2_product Q19 | assist ladder concrete | 3.15 | T36 |
| AR OI-1 | text-layer counts (`scoutCodes` 9/13/14/18, loading 20, tips) | 3.14.2, 3.17.4; final numbers wait for spec/H (OI-CU2) | T35 |
| AR OI-2 | gore control wording | 3.4.4 | T09 |
| AR OI-3 | Moon Gravity | 3.16.3 (overlay, no DA-5) | T37 |
| VF OI-5 | machine-readable flowtable | 3.6.4 (JSON block) | T05 |
| M-layers OI-L3 | Take Command UI half | 3.13.4 | T34 |
| UC R-UC5 | UI role/ability rows, shared attack-clip source | 3.14.5 | T26, UC-T18 |
| design requests | every request addressed to UI/INTEGRATION/DESIGN-UX | 3.21.2 | per row |

---

## 6. Plan corrections

| id | the plan or a spec says | what this file does and why |
|---|---|---|
| PC-CU1 | AR PC8 encodes gore `auto` with booleans | `corpses` needs the same encoding: the v8 `ENUMS.corpses` import throws on an unknown value as `gore` does (3.4.2) |
| PC-CU2 | AR 3.5.2: `seen.basics: true\|ms` | `seen.basics` is a map keyed by slot (`place fight speed powers done`) so a cross-era player skips only what he has seen; plus new `seen.firstsight`, `seen.skipTips`, `seen.arrival`, `seen.cleared` (3.1.5) |
| PC-CU3 | title badge `x/N` over released eras | the v8 badge also counts puzzle stars (`title.js:22` sums all `progress.stars`); R1 keeps the v8 sum (bit-identical), `released >= 2` shows mission stars only over `27 x released` |
| PC-CU4 | design pseudo-code `ev.won`, `ev.byCause` | the shipped summary has `win`, `draw`, `killsByCause`, `killsByDef`; achievement files use the real names (3.9.4) |
| PC-CU5 | design effect family names (`strike_point`, `zone_status`, ...) | they are the designers' words for M15 effect types; the mapping table is in 3.12.1 |
| PC-CU6 | "27 scout codes" | 27 declarations, 25 distinct ids (3.14.2) |
| PC-CU7 | q3_engine 34: slow-down "uses the existing `rules.speed`" | `rules.speed` is a setup value that the HUD shows; the director multiplies `Game.speed` by a separate `ts` (CU-D04). Same effect on ticks (none), no HUD side effect |
| PC-CU8 | plan CU3 "ONE dispatcher in `meta.js`" | read as "owned and wired by `meta.js`": the class lives in `src/app/setpiece.js` to honour the hot-file budget; lint LR-CU1 enforces the single wiring |
| PC-CU9 | `ancient_history` description | the shipped unlock fires on the FIRST campaign win (`setCampaign` completed flag); kept for Ancient (frozen), the new eras use derived `completedEras` (3.9.6) |
| PC-CU10 | `first_three_minutes`: "Suggested army hidden until two defeats" | rejected as worded; ladder offers at 2 and reveals at 4 (3.15.2) |
| PC-CU11 | plan CU15 "difficulty names neutral with era flavour via `getTB`" | via `era.ui.difficulty` (data) which `getTB` reads; same effect |
| PC-CU12 | plan CU3 "sim slowed to 0.5x during a shot" | the factor is the shot's own `timeScale` in [0.25, 1], default 0.5; stacked owners take the min |
| PC-CU13 | q3_product 23 "45 achievement ids" | 63 = 24 + 36 + 3 meta (3.9.1) |

---

## 7. Open items

| id | item | owner | deadline phase |
|---|---|---|---|
| OI-CU1 | SIM answers to R-CU-S1..S9 (accept or decline with the stated fallbacks) | SIM | P1 end (before the first dependent WP) |
| OI-CU2 | spec/H finals for all provisional text: chooser captions, difficulty names, mutator overlays and per-era mutator texts, scout texts (1 + 2 variants per code), basics beats per era, pause quips (>= 12 per era), `getTB` sections, card copy, meta About tagline, the 3 meta achievement names; final counts into `manifest.expect` | COMEDY-EDITOR | P2 end |
| OI-CU3 | optional DA-7: stop the first campaign win unlocking `ancient_history` in Ancient; NOT elected here | COORD | P4 |
| OI-CU4 | `UI.questions` for Medieval and Modern (shipped `null`): add if the designers want the chips | DESIGN-ERA-x | P3 |
| OI-CU5 | Boss Rush Survival half depends on R-CU-S3; Quick half ships regardless | SIM | P2 |
| OI-CU6 | R-CU-S5 (self-aim for vehicles/mechs/air on touch) decides whether Take Command for those classes exists on phones | SIM | P2 |
| OI-CU7 | visual review of chooser stills and the 4 `[data-era]` chromes (agent step ER21) | TOOLS-VERIFY | P4 |
| OI-CU8 | detector rows (`SCOUT_DETECTORS`) thresholds | SIM with BALANCE | P3 |
| OI-CU9 | reconcile `utilityUnit` per era with the unit specs | DESIGN-ERA-x | P2 |
| OI-CU10 | `LOADING_LINES` of Ancient are not shown by any v8 flow; whether Ancient should show them in the portal back to Ancient is not decided (this file: no, Ancient has no portal) | COORD | P4 |
