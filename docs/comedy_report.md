# comedy_report.md: independent COMEDY-EDITOR pass (H6 / H7), VOXELWARS ancient era

Scope: everything the player reads in the live game, judged in context, not as a list of strings. Owned files edited: `src/content/era_ancient/humor/*.js`, `lesson_text.js`, `campaign_text.js`, `wave_names.js`, `custom_text.js`, `sim_text.js`. Nothing under `src/sim`, `src/ui`, `src/app`, `src/render` was touched; asks for those are in `docs/requests/comedy_*.md`.

## 1. How it was judged (and what that exposed)
The previous writer log says plainly: "nothing here was exercised in the real game". So this pass did exactly that:
- **Real sim, real announcer, real lessons** (scratch tools, not committed): 66 battles (11 setups x 6 seeds, Node, `tools/lib/harness.mjs`) fed event-for-event through `createAnnouncer` and `generateLessons` the way `app/meta.js` feeds them, and four 10-battle "first sessions" with ONE persistent announcer (rematches, a duel, a loss streak). Transcripts read line by line.
- **Real build**: private build of the page, Quick Battle played through the real UI, announcer subtitles, kill feed, bubbles and the results screen captured (text dumps + screenshots), every menu screen dumped as text.
- **Code reading** of every consumer (`meta.js`, `game.js`, `sim/lessons.js`, `world.bark()`, `render/labels.js`, `ui/screens/results.js`, `ui/strings.js`).

What that found (all fixed in my files unless marked REQUEST):
1. **The lesson bugs QA found, and the root cause.** `sim/lessons.js` pads the list to three with generic ids and made-up numbers (`pct: 0, n: 0, role: 'infantry'`), so winners read "Shields and spears: 0% of the damage", losers "They brought 0% infantry", "0 soldiers ran away. They were right to." and, after a 0-of-1 loss, "only a quarter of us stood". Every template was audited against its detector: the seven padding-capable ids are now true after any battle (they never print `{n}/{pct}/{role}`); the others no longer name units that may not exist (`cavalry_charge` said "horses" but `charge_hit` also comes from warhounds, goats, giants; `trample` said "the elephant" but Cyclopes and the Trojan Horse trample; `brace_win` claimed kills; `hero_down` said "the Hannibal"). The one-line SIM fix (dedicated `pad_win_*`, `pad_loss_*`, `pad_draw_*` entries are already in `lesson_text.js`) is in `docs/requests/comedy_lessons.md`. Tests: `tests/humor/lessons.test.mjs` (495 checks) replays the QA cases.
2. **"The center flank folded."** 72% of real `big_swing` events are `center` (`left` 20%, `right` 8%) and four announcer lines and one lesson printed "the center flank". Flank lines are now restricted to left/right by test; there are proper centre lines in all three voices.
3. **A first-blood line spoken after the defeat line** (1v1: the first death ends the battle; the candidate queued 0.25 s earlier still fired). The announcer now drops everything not about the ending at `battle_end`.
4. **Grammar bugs the player sees every battle**: "a Immortal", "a Eques", "a Axe Thrower", "the Hannibal", "He will not survive it" (about a Catapult). New `|a`/`|the`/`|The`/`|A`/`|cap` filters are proper-name aware; a test forbids typing an article before a unit slot by hand.
5. **One dead line, one line that could never speak** (`lead_change_ratio` needed a flank the sim never sends), **two wrong numbers** (Pharaoh "8 dps" is 6; Goat "Knockback 12" is a charge of 8 u, double damage; Peltast "kites at 85% of range" is every shooter's standoff, the real peltast rule is 5 u), **a wrong fact in a tip** (Cataphract "use blunt": blunt has less armour piercing than a spear; fire and magic ignore armour), **a stalemate line with the wrong clock** ("in eighteen seconds someone moves" is six seconds after the warning), **a timeout line that said six minutes** whatever the time limit, **"It struck three"** for a bolt that chains four times, **a campaign line (Troy) about wood burning that no enemy in that mission can light**.
6. **`big_swing.ratio` is team 0 over team 1, not the gaining team's** (the docs said otherwise): comeback detection was wrong whenever the player was team 1. Fixed in the announcer; documented in `docs/lifetime_stats.md` and `comedy_sim_events.md`.
7. **Xerxes "sits down!" when he leaps up shouting Retreat** (`throne_sit` fires for both; `sitting` was ignored). Now two sub-moments.
8. **Dead content (REQUEST).** Only 13 ability moments ever make a bubble, so 129 death quotes, 86 taunts, the whole of `barks.js`, the 9 mission victory/defeat lines and 18 of 27 Scout variants never reach the screen (except the MVP quote). Content side done (`SIM_BARKS` table, per-unit moment barks that already work in the build: the Immortal's "I did say once." appears); wiring is `docs/requests/comedy_bubbles.md` and `comedy_ui_copy.md`.
9. **The kill feed is the most-read text in the game** (hundreds of rows a session, 15 rem wide). `melee` and `ranged` had 8 and 7 verbs; now 14 and 12, short enough to leave the names visible, gender-neutral (chickens and goats die too), and the formula "<killer> <verb> <victim>" holds for every verb (the misfire verb "was accidentally launched into" made the *catapult* the thing launched).
10. **Repetition within a session.** The recency memory was 14 lines and 5 minutes, i.e. one battle: across ten battles the same first-blood, victory and lead lines came back. Frequent triggers had 3 to 11 live lines (`lead_change` 3, `army_low` 3, `charge` 3). Memory is now 14 minutes (silence beats a repeat), and the categories the player hears every battle now have 8 to 15 generic variants each (battle_start 15, first_blood 10, defeat 11, victory 8) plus the contextual ones that only speak when they are true (lead_change 16, big_swing 13, army_low 9 in total). Same four real-sim sessions of ten battles (about 85 spoken lines each), old announcer vs new: 12 to 17 different lines were heard twice or three times per session before (`lead_change_momentum x3`, `big_swing_arith x3`, `lead_change_again x3`, `army_low_gathering x2`...), 0 after.

## 2. The missing humor, added (the brief's list)
| moment | now |
|---|---|
| first blood | early (<= 6 s) and late (>= 25 s) variants quoting the time; a chicken, a goat or a hero as killer/victim have their own lines |
| last survivor | `victory/last_man`, exclusive so it can never say "1 survivors" |
| goat / chicken | goat or chickens among the survivors; kill streaks by either; first blood by either (kills by them already existed) |
| a hero falling | different lines for YOUR hero and THEIR hero |
| the army fleeing | player vs enemy rout lines, plus the runners returning (`unit_rally`) |
| draw / timeout | the timeout line now says the real time limit |
| 1v1 | a duel in three voices at the start and at the end; swings, leads, rout and low-army talk are muted |
| rematch of the same arena | `rematch`, `loyal` (third in a row), and an opener for each of the 14 arenas plus the Arena Lab, in all three voices, each built on a fact of that arena (Thermopylae's goat path, the Colosseum's ninety spectators, the Styx's 30 damage a second) |
| 10th battle / 3 losses / 3 wins | `tenth`, `losing`, `winning`, `third_loss`; career callbacks for the first ever battle, victory and defeat |
| winning with a tiny army | `outnumbered 3 to one` at the start, `won with half their army` at the end; also `flawless`, `so close`, `crush`, `quick`, `long` |
| abilities nobody commented on | locusts, war horn, Anubis execute, Gladiator net and crowd roar, Druid chain: lines written for exactly one ability each |

## 3. Counts
| file | before | after |
|---|---|---|
| announcer templates | 245 (Brutus 92, Plato 70, Cassandra 83) | 486 (184 / 153 / 149), 47 categories, 88 sub-moments; 9 cut, 48 rewritten, 250 added |
| tips | 40 | 63 (31 hints, 32 jokes), each number checked against `stats.js` / `sim/consts.js`; 4 rewritten as false or imprecise |
| kill verbs | 151 | 163 (melee 14, ranged 12); 4 cut or fixed for grammar |
| unit text | 344 strings, already the strongest file | 14 changed: 6 codex jokes (Pharaoh, Goat and Peltast quoted numbers the rules do not have; Cretan, Khopesh and Numidian recast away from the "Stat: x. Stat: y." form), 7 "Tell the ..." last words recast (14 of 129 began that way; 7 remain), 1 death that repeated its own taunt; 70 per-unit bubble lines added for the moments the sim emits |
| lessons | 62 strings; 7 of 15 ids false whenever the padder chose them, 3 more naming units the player may not have | 102 strings: all true in context; 9 dedicated pad entries for SIM |
| sim barks (`sim_text.js`) | 13 moment lists | 13 moment lists (Gary became Gaius, "plunder" became "procedure") plus the class and status tables the sim can already use |
| results labels | one label for a count of soldiers that said "drachmae", one for arrows that said "found someone" | fixed; dead banner/subline/MVP copy removed |
| wave names | two lists (one dead) | one list (the one `sim/waves.js` uses); 2 names fixed ("Titans" waves that are not; a pop-culture name that has aged) |
| mutators, campaign, loading lines, custom soldiers | | Moon Gravity no longer claims slow landings; Troy briefing (see above); loading lines de-duplicated (3 grape lines, 2 elephant, 2 chicken); one repeated bark; the announcer's 9 mission win/lose lines no longer repeat the briefing/results text |

Tests: `node tests/humor/announcer.test.mjs` 885 checks (was 266), `text.test.mjs` 9,358 (was 6,307), `lessons.test.mjs` 495 (new), `sim.test.mjs` 71, `achievements.test.mjs` 70. Lint and contracts green. New tests pin the bugs above (articles, centre flank, 1v1 exclusivity, stale first blood, session memory, career lines, ability lines, throne, pad-safe lessons, gender-neutral kill verbs, true tips and codex numbers).

## 4. The 20 best new or rewritten lines (in context)
1. Cassandra, duel start: "One of them wins. I checked. It was not hard to check."
2. Plato, first blood: "The first death is a surprise. The second is a statistic. We are now in statistics."
3. Brutus, outnumbered: "OUTNUMBERED 3 to one! That is not a problem, that is a CHARACTER ARC!"
4. Brutus, your centre folds: "YOUR line is buckling in the MIDDLE! Hold it! Hold it with SPEARS!"
5. Cassandra, flawless win: "Nobody fell. I never noted that outcome. Please do it again so I can write it down."
6. Plato, your army runs: "6 of yours have left in good order. Is that discipline, or panic with posture?"
7. Cassandra, Thermopylae: "There is a goat path round the side. There is always a goat path. Nobody listens."
8. Brutus, Marathon: "MARATHON! Where a man ran twenty-six miles with the news and was never TIPPED!"
9. Brutus, Cyclops Isle: "CYCLOPS ISLE! One cave, a few goats and a very large LANDLORD!"
10. Cassandra, Alpine Pass: "Somebody will fall off that cliff. Look for the one in sandals."
11. Cassandra, Cyclops misses: "A quarter of his throws go wide. That was one. The other three were aimed at you."
12. Plato, goat on a streak: "A goat on 5 kills. Nobody asked it to. Nobody could have stopped it."
13. Brutus, philosopher: "The Philosopher has hit NOBODY! And the enemy is still LOSING! Explain THAT, Plato!"
14. Cassandra, their lead: "They lead now. I wrote it on the first page. Nobody turned the page."
15. Lesson, friendly fire: "Our side hit itself 7 times. The enemy barely had to take part."
16. Brutus, third battle on the same map: "The third battle on Marathon Plain in a row! The locals are charging you RENT!"
17. Ballista, last words: "Oil the winch. It was the winch. It is always the winch."
18. Chariot Archer, last words: "The horses were excellent. The brakes were fictional."
19. Tip (and a useful one): "While Xerxes sits, allies within twelve units hit 20% harder. Do not touch the chair."
20. Loading line: "Hiring six hoplites to sit very quietly..."

## 5. Cut, and why
Announcer (9): `first_blood_invite` ("Nobody asked who sent the invitations": flat), `first_blood_sooner` (claimed "sooner than expected" with no time), `hero_down_flank` (claimed "left flank first"), `charge_spears` ("ends on the spears": the charge may have hit anything), `charge_left` (claimed a direction nobody sent), `misaim_nine` (replaced by the true quarter), `lead_change_ratio` (could never speak), `lead_change_again` (the weakest generic line once team-aware ones existed), `victory_left` (claimed a left flank that was not on screen). Rewritten for truth or rhythm (48): the gendered ("He will not survive it"), the hand-typed articles, the hard-coded six minutes, the wrong clock, "struck three", the elephant that was a number, the nine mission win/lose lines that repeated the briefing. After reading my own additions in context I cut five more (`stalemate_senate`, `boulder_politics`, `first_blood_list`, `brace_always`, and a second "Camera, row ten" that read like the first). Kill verbs: `tax-audited` as a ranged verb (it belongs to bribes), `held under` (broke the sentence), `was accidentally launched into` (wrong subject). Barks: "Gary", "plunder", a Plato line that was also a bubble that was also an announcer line. Dead copy: results banners, sublines, MVP titles (no importer), a second wave list. Roughly a quarter of the old announcer was cut or rewritten (57 of 245); most of the rest is good and was left alone on purpose (the Spartan "If.", the Immortal's asterisk, Hoplite "mortgage rating 70%", Senator "Et tu... subcommittee?").

## 6. Bugs in code I do not own (all have request files)
- `docs/requests/comedy_lessons.md` (SIM): padding lessons and made-up numbers; trample counts the enemy flattening itself; draws read as losses.
- `docs/requests/comedy_bubbles.md` (SIM, RENDER): 13 of ~20 bubble moments exist; last words, taunts, class and status barks are never emitted; a bubble dies with its unit after 1.6 s.
- `docs/requests/comedy_sim_events.md` (SIM): `big_swing.ratio` semantics, `flank` is mostly `center`, `trample.count` is always 1, `unit_rally` has no team, `throne_sit.sitting`, kill-streak thresholds.
- `docs/requests/comedy_ui_copy.md` (UI, META, COORD): the Fog tooltip is false (fog widens ranged spread 20%); a time-limit draw says Zeus left; mission victory/defeat lines and Scout variants are never shown; kill-feed width (15 rem) truncates names when a verb is long.

## 7. Still weak (honest)
- **Win lessons are generic until SIM pads properly.** A won battle with no detected pattern shows three flavour lessons ("The wall had it first. The wall is now insufferable.") that are true and in voice but teach nothing. The specific wordings are written and waiting in `comedy_lessons.md`.
- **The bubbles are quiet** until the sim emits last words and engage barks. The per-unit moment lines already work.
- **Voice texture**: Plato ends 40% of his lines on a question (the voice sheet's tell, but it is a lot); Cassandra's "I said / I wrote / I noted" tells carry 53% of her lines (the test floor is 50%). If either grates, cut tells before cutting jokes.
- **Several arena openers and session lines are a 3.5 rather than a 5** (they are specific and true, and they only speak in their context, but a human editor with a stopwatch could still cut 15 of the 486). I left them because each one is the only thing that makes a rematch, a duel or a losing streak feel noticed.
- **Not heard**: nothing here was listened to. TTS and audio ducking are untouched; the longest announcer line is 20 words.
- **Faction names in `{team}` lines** read "Blue" and "Red" (the HUD colours); correct but flat. See `comedy_ui_copy.md` item 4.
