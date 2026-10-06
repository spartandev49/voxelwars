# requests/humor.md: integration asks from HUMOR to other owners (HUMOR keeps working with local workarounds; nothing here blocks tests)

Contract details live in `docs/lifetime_stats.md` (stats keys, BattleSummary, announcer ctx and event assumptions) and `docs/humor_writer_log.md` (evidence).

## COORD (registry, save, app wiring)
1. **Registry**: the generated registry globs `humor/*.js`. Every module there is a plain ES module with **named exports only** (no default export). If the generator needs one export per file, say so and I will add `export default` aggregates. `src/content/era_ancient/campaign_text.js` sits outside the glob (spec 3) and exports `CAMPAIGN_TEXT, ACTS, MISSION_ORDER, TEACHING_BEATS, TEACHING_SKIP, REWARD_PARTS, missionText`.
2. **`content.humor` mapping** (app_contract.md): `tips` = `TIPS` (tips.js); `names` = `{randomName, randomNameParts, TITLES, FIRST_NAMES, EPITHETS}` (names.js); `achievements` = `{ACHIEVEMENTS, checkAchievements, getAchievement, totalStars, ARENA_IDS, MISSION_IDS}` (achievements.js); `announcer` = `{createAnnouncer, TEMPLATES, CATEGORIES}` (announcer.js); `killVerbs` = `{KILL_VERBS, killVerb, killSolo, killFeedText}` (killverbs.js, also re-exported by achievements.js); `settingsJokes` = the exports of `ui_text.js` (`QUALITY, GORE, CORPSES, DIFFICULTY, SPEED_LABELS, SETTINGS_TIPS, RULES_TIPS, BUDGET_PRESETS, TITLE_MENU, BUTTONS, MODALS, LOADING_LINES, EMPTY_STATES, ERRORS, PLACEMENT_REASONS, WAVE_NAMES, SURVIVAL, DAILY, TOASTS, ABOUT, SPLASH, ROADMAP_TAG, loadingLine, waveName`); `scout` = `SCOUT_TEXT` (scout_text.js, already read by `game._scout`); plus `unitText` = `UNIT_TEXT` (units_text.js), `mutatorsText` = `MUTATORS_TEXT`, `barks`, `results` (results_text.js), `credits` (credits_text.js).
3. **`src/save/stats.js`** should accumulate exactly the keys in `docs/lifetime_stats.md` section 2 and build the BattleSummary of section 3. **Dispatch order on `battle_end`**: stats first, then `checkAchievements(stats, battleSummary, unlocked)`, then the announcer (its callbacks read the already-updated stats). Give the announcer the live stats object (`createAnnouncer({rng, stats})` or `setStats`).
4. **Announcer ctx**: pass `{speed, arena, factions, teamNames, playerTeam, mission, unitName?, nameOf?}` with any event (it is cached; omit what you do not know). `nameOf(unitId)` should return a custom soldier's name (`names.js`) so the `{killer}` slot reads "Sir Chadius the Unbothered".
5. **RNG**: give the announcer a `ui`-stream RNG (`rng.next()` or a function). The module never touches `Math.random`.

## UI (src/ui/hud/announcer.js, results, codex)
- Loop each frame: `ann.tick(realDt); let l; while ((l = ann.nextLine())) show(l);` `tick` takes REAL seconds. Line = `{id, cat, sub, who, text, pri, at, dur, head, chain:{key,i,n}|null}`.
- **Chains** arrive as separate lines 1.1 s apart (`chain.i` 0..n-1): show them as one stacked exchange (portrait changes per `who`), hold the stack for about `dur` of the last beat.
- Bubbles: `humor/barks.js` (class barks <= 10 words, status bubbles, monologue), unit deaths and taunts from `units_text.js` (all <= 12 words). Funny result labels: `results_text.js` `resultLabel(key, rng)`; scout text: `scoutText(code, rng)` or `SCOUT_TEXT[code].text`.
- Errors: show `body` always; show `joke` for at most one error per screen.
- Roadmap tag text is `ROADMAP_TAG` ("Roadmap: Medieval Era. Not in this build."), honest and clearly not a feature.

## SIM (events the announcer consumes; please keep these names and fields)
`battle_start, battle_end{winner,reason,t,perDef}, first_blood (adjacent to its unit_kill, either order), unit_kill{srcDef,dstDef,srcTeam,dstTeam,friendly,cause,revived}, kill_streak{id,count,def}, hero_down{def,team}, friendly_fire, unit_rout{team}, army_low{team,frac}, lead_change{team,ratio}, big_swing{team,ratio,flank,cluster}, stalemate_warning{t}, intervention{kind: zeus|goat|ragequit}, god_power{kind,team}, wave_spawn{n}, chicken_tantrum, philosopher_monologue, trojan_reveal, stone_gaze{count}, throne_sit, unit_revive, unit_convert, trample{count}, charge_hit{mul}, unit_brace, projectile_launch{kind}, explosion{kind}, catapult_misfire, cyclops_misaim, prop_destroyed{type}, ability_cast{ability}, status_apply{status}`.
- `status_apply.status` values the announcer reacts to: `sleep` (senator), `fire_panic` or `panic` (elephant).
- `ability_cast{ability:'kick'}` is used for the Spartan kick line and for the lifetime `kicks` stat.
- `big_swing.team` = the team that gained; `ratio` = **team 0's power over team 1's** (what `sim/power.js` really sends; corrected in the comedy editor pass, see `comedy_sim_events.md`); `lead_change.team` = new leader.
- `prop_destroyed.type` ids the announcer words: `wall_stone, tower, arch_gate, gate_door, column_marble, ruin_wall, tent, statue_lion, ship, temple, throne, obelisk`.
- `battle_end.perDef` is `{team: {defId: alive}}`; the announcer reads the winner's entry (survivors, top unit, whether chickens are still alive).

## CAMPAIGN
- Star ids per mission in `campaign_text.js` are `win`, `half` and one mission-specific id (`thrift, no_spartan_lost, quick, untouched, elephant_alive, fast, gate_fast, no_ff, heroes_alive`); rename freely, the text is keyed by position.
- Teaching-beat `trigger` names (`placement_start, battle_start, first_contact, cavalry_brace, battle_end`) and cosmetic part ids (`REWARD_PARTS`) are suggestions; map them to your own.

## AUDIO
- `line.who` is `brutus|plato|cassandra` for portraits (and TTS voice selection if ever enabled); `line.pri` (1-5) is the ducking priority (duck on >= 4).
