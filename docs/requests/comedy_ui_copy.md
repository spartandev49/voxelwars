# requests/comedy_ui_copy.md: copy that lives in `src/ui` / `src/app` and is wrong or can be better (COMEDY-EDITOR -> UI-A, UI-B, META)

Everything else in the UI was read in the live build (every menu screen via `tools/tour.mjs`-style text dumps, a real battle, the results screen) and is good; these are the exceptions. Exact replacement text is given so nobody has to write anything.

## 1. False tooltip (UI-A, `src/ui/strings.js` `quick.weatherTip.fog`)
Current: `fog: 'Moody. Cosmetic only.'` The sim says otherwise: `world.js` weather table has `fog: sprdMul 1.2` (ranged spread +20%), and the Teutoburg arena card already says "Fog hurts aim".
Replace with: `fog: 'Ranged attacks spread out 20% more. Archers squint, then guess.'`
(Same table: `rain`/`storm` halve burn time and fire damage, `snow` slows everyone 10%, `sandstorm` widens ranged spread by half: the other tips are right.)

## 2. A draw is not always Zeus (UI-B, `src/ui/screens/results.js` `DRAW_SUB`)
`DRAW_SUB = 'Zeus stormed off. Nobody wins. Everyone is cross.'` is shown for every draw, but a draw also comes from the time limit with level armies (`reason: 'time'`, `winner: -1`). Make it reason-aware:
```js
const DRAW_SUB = { intervention: 'Zeus stormed off. Nobody wins. Everyone is cross.', time: 'The clock ran out with both armies level. Nobody won. Both claim moral victory.' };
// banner(): const sub = draw ? (DRAW_SUB[r.reason] || DRAW_SUB.intervention) : ...
```
The announcer already tells the two apart (`zeus/draw` vs `timeout/draw`).

## 3. Dead copy removed from `humor/results_text.js`
`BANNERS`, `SUBLINES`, `MVP`, `banner()`, `subline()` and `mvpTitle()` had no importer anywhere (the results screen words its own banner, which is fine and funny), so they were deleted rather than left to drift. Only `RESULT_LABELS` / `resultLabel` (the funny stat rows, used by `meta.js buildFunnyStats`) remain. `humor/ui_text.js` no longer carries a second wave-name list either: `WAVE_NAMES` is re-exported from `content/era_ancient/wave_names.js`, the one `sim/waves.js` actually uses.

## 3b. Mission victory / defeat lines are never shown (UI-B, `results.js`; CAMPAIGN, `campaign.js`)
`CAMPAIGN_TEXT[id].victory` and `.defeat` (9 x 2 voiced lines, `{ who, text }`) are copied onto each mission (`campaign.js:186`) but no screen reads them. On a mission's results screen show the matching line under the VICTORY / DEFEAT ribbon instead of the generic `WIN_SUB` / `LOSE_SUB` (keep the generic ones for Quick Battle), with the speaker's portrait (`avatar(who)` is already imported). The in-battle announcer's `campaign_*` win/lose lines were rewritten in this pass so they never repeat these texts, so the two can be heard back to back.

## 3c. The Scout report only ever shows its first wording (COORD, `src/app/game.js _scout`)
`humor/scout_text.js` carries, for each of the 9 codes, a voiced default plus 2 variants in the other two voices (27 lines, all checked true against the rules); `Game._scout` reads only `words[code].text`, so 18 of them and every `who` are dead, and the report always sounds like the same one narrator. Pick among `[{ who: e.who, text: e.text }, ...e.variants]` (the helper `scoutText(code, rng)` in `scout_text.js` does exactly this; `content.js` exposes only the data object as `humor.scout`, so import the helper or use the arrays), seeded from the setup seed so the line does not change while the player drags soldiers, and pass `who` to the strip so the speaker's portrait can show.

## 4. Nice to have (META, `src/app/meta.js` `annCtx`)
`teamNames: ['Blue', 'Red']` means the booth says "Blue falls!" and "VICTORY for Blue!". That matches the HUD's team colours, so it is correct; if you ever want it to say "The Hellenes fall!" pass `teamNames: [factionName(A.faction), factionName(B.faction)]` when the two factions differ. Every line that uses `{team}` reads fine with either.

## 5. For the bubble system see `comedy_bubbles.md`; for event payloads see `comedy_sim_events.md`; for lessons see `comedy_lessons.md`.
