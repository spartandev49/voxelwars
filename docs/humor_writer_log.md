# humor_writer_log.md: HUMOR hand-back evidence, cut log and favourites

Owner: HUMOR. Everything below was produced against `docs/spec/humor.md`, `docs/spec/units.md`, `docs/spec/world.md` s6, `docs/spec.md` s8.2/s14 and `docs/verification.md` (H1-H8, U4).
Run the checks: `node tools/gate.mjs --only=humor` (lint + syntax + 4 test files) and `node tools/humor-sim.mjs --minutes 60 --speed both`.

## 1. What exists (files)

| area | file | contents |
|---|---|---|
| unit text | `src/content/era_ancient/humor/units_text.js` | all 43 units: `name/plural`, `blurb` (<= 14 words), `lore` (<= 35), 3 `deaths` each (129), `taunts` (86, 2-3 each), `codexJoke`; helpers `unitName`, `pickDeath`, `pickTaunt` |
| announcer | `humor/announcer.js` | 245 slotted templates (232 standalone + 13 chain beats, 8 chain exchanges) in 46 categories, plus the pure selector `createAnnouncer({rng, stats})` -> `{onEvent, tick, nextLine, reset, setStats, setSpeed, debug}` |
| tips | `humor/tips.js` | 40 loading tips: 20 real hints, 20 jokes that teach (every one true of the current rules) |
| achievements | `humor/achievements.js` | the 24 achievements with `test(stats, ev)`, `checkAchievements`, `totalStars`; re-exports the kill verbs |
| kill verbs | `humor/killverbs.js` | 19 causes, 118 `by` verbs (>= 6 each, all transitive so "Killer verb Victim" composes) + 33 `solo` phrases for environment deaths; `killFeedText()` |
| names | `humor/names.js` | 8 titles, 5 name cultures (Greek/Latin/Egyptian/Persian/Celtic, m+f), 66 epithets, `randomName(rng)`, `randomNameParts` |
| UI text | `humor/ui_text.js` | Potato/Papyrus/Marble/Olympian, gore and corpse labels, difficulty names, rematch "Again, but smarter", rule/settings tooltips, 20 loading lines, empty states, errors (plain body first, one optional joke), placement reasons, wave names, modals |
| mutators | `humor/mutators_text.js` | all 9 mutators in `sim/mutators.js` (incl. `glass_cannons`): name, desc, short chip label, locked hint |
| barks | `humor/barks.js` | 73 class barks (9 roles x 4 states, <= 10 words), 24 status bubbles, 8 philosopher monologue bubbles, generic death/taunt fallbacks for custom soldiers |
| results | `humor/results_text.js` | banners, sublines, 22 funny stat labels (3 wordings each), MVP wording |
| credits | `humor/credits_text.js` | 16 in-universe studio credits + footer |
| scout | `humor/scout_text.js` | `SCOUT_TEXT` for the 9 `armygen.scoutReport` codes: `{who, text, variants[2]}`, true counter advice (requested by COORD) |
| campaign | `src/content/era_ancient/campaign_text.js` | 9 missions: blurb, 4-line briefing (all three voices), victory, defeat, 3 star texts, reward title + blurb; mission 1 teaching beats; 10 silly reward-part blurbs; act titles |
| tool | `tools/humor-sim.mjs` | battle-script generator (10 archetypes + 9 campaign variants), lifetime-stats accumulator, 60-minute replay at any speed, metrics report |
| tests | `tests/humor/{text,announcer,achievements,sim}.test.mjs` | 6,300+ checks; run in the gate |
| docs | `docs/lifetime_stats.md`, `docs/requests/humor.md`, this file | stats and BattleSummary contract; integration asks for other owners |

## 2. Method and honest numbers

1. **First draft**: every module was first written as a draft with deliberately more lines than needed (for units: 5 death quotes and 3 taunts per unit candidate; for the announcer: ~370 lines; for kill verbs 2-3 extra verbs per cause; epithets 109; tips 61).
2. **Rubric pass** (spec 7): each line scored on specific / surprising / short / could-it-lose-a-word. Anything that was only "random", a stock phrase, a duplicate of a better line, or a line that explains its own joke was cut with a reason. The cut was done with a script over `//CUT: reason` markers, so the log below is the literal list of removed lines, not a reconstruction.
3. **Rules pass**: after reading `sim/mutators.js` and `sim/armygen.js` I corrected copy that over-claimed or misdescribed rules (Tiny Titans shrinks everyone, not only giants; the chicken tantrum is "when hurt", not a 30% health rule; Philosophers confuse a radius, not a count).
4. **Tests drive the limits**: bubbles <= 12 words, announcer <= 22, tips <= 18, blurbs <= 14, lore <= 35 are asserted; the failures they found (6 lines at 13 words) were shortened, not exempted.

Counted copy lines (jokes and flavour; plain functional UI strings such as error bodies, modal text, button labels, settings tooltips, placement reasons and toasts are excluded because they must exist in plain words and cannot be "cut"):

| file | first-draft lines | cut | cut % |
|---|---|---|---|
| humor/units_text.js | 513 | 170 | 33% |
| humor/announcer.js | 374 | 112 | 30% |
| humor/killverbs.js | 184 | 67 | 36% |
| humor/barks.js | 149 | 45 | 30% |
| humor/names.js | 109 | 35 | 32% |
| humor/tips.js | 61 | 21 | 34% |
| humor/achievements.js | 44 | 19 | 43% |
| humor/ui_text.js | 74 | 20 | 27% |
| humor/results_text.js | 102 | 23 | 23% |
| humor/mutators_text.js | 16 | 7 | 44% |
| humor/credits_text.js | 28 | 9 | 32% |
| humor/scout_text.js | 31 | 4 | 13% |
| campaign_text.js | 136 | 19 | 14% |
| **total** | **1,821** | **551** | **30.3%** |

Shortfalls, stated plainly: `campaign_text.js`, `scout_text.js`, `results_text.js` and `ui_text.js` are under 30% individually. In the campaign text most lines are briefing and star copy that the mission needs; I kept them and made up the total elsewhere. The comedy editor is welcome to cut deeper there (see section 6).

## 3. Acceptance criteria

| id | result | evidence |
|---|---|---|
| H1 | PASS | 245 templates (>= 90) across 46 categories: all 28 spec categories have >= 3 lines (`idle_filler` has 17 incl. chains); 9 `campaign_*` categories (3 lines each: start, win, lose); 9 extra categories for systemic gags (`kick, immortal, throne, misfire, misaim, hazard, big_swing, army_low, wave`). Voice share of templates: Brutus 37.6%, Plato 28.6%, Cassandra 33.9%. Voice share when actually spoken in the 60-minute sims: 33/32/35% (1x) and 34/30/36% (4x). `tests/humor/announcer.test.mjs` |
| H2 | PASS | `tools/humor-sim.mjs`, 10 recorded logs replayed in random order plus a campaign battle every third battle. 1x, 60 min, seeds 7/11/23/42: repeats within 5 min 0.3-1.0% (target < 8%); every category hit (45/45); 20 simulated minutes: 0.0% repeats. 4x (seed 7): repeats 0.4%, 38 of 40 reachable categories (only priority >= 4 may speak; the 4x runs miss 1-3 rare ones per hour by design). Rule violations in every run: 0. `tests/humor/sim.test.mjs` |
| H3 | PASS | 43 units complete (U4 text part), 40 tips, 24 achievements each with a working pure test (70 checks incl. negatives and junk input), 66 epithets (>= 60). `tests/humor/text.test.mjs`, `achievements.test.mjs` |
| H4 | PASS (R) | `tests/humor/text.test.mjs` sweeps 3,454 strings from every humor module against 27 slur entries (stored ROT13 so the file does not spread them), 26 stereotype terms and 22 modern-religion terms: 0 hits. Manual review: jokes are at institutions (Senate, assemblies, accountants), myth (Zeus, Medusa, the Trojan horse), physics and the player's tactics. Anubis and the Priest of Ra are jokes about their jobs (finishing wounded, a sun beam), not belief. The Barbarians are polite and into pottery (berserker lore, a mission briefing, an epithet, a credit). No nationality is the punchline; Persians, Egyptians and Carthaginians are as competent and as silly as the Romans |
| H5 | PARTIAL | HUMOR's part (announcer hook + bubbles for the 14 systemic gags) is done: chicken tantrum `chicken_tantrum`->`chicken`; philosopher `philosopher_monologue`->`philosopher` + monologue bubbles; senator `status_apply{sleep}`/`unit_convert`/`unit_kill{bribe}`->`senator`; Trojan `trojan_reveal`->`trojan`; goat `intervention{goat}`/goat kills->`goat`; Medusa `stone_gaze`->`medusa`; catapult `catapult_misfire`/`unit_kill{misfire}`->`misfire`; Zeus `intervention{zeus,ragequit}`/draw->`zeus`; wine rain `god_power{wine_rain}`->`god_power`; Spartan kick `ability_cast{kick}`/`unit_kill{kick}`->`kick`; Immortals `unit_revive`/`unit_kill{revived}`->`immortal`; Xerxes `throne_sit`->`throne`; Cyclops `cyclops_misaim`->`misaim`; elephant `status_apply{fire_panic}`/`trample`->`elephant`. The sim event emission, clip and cue halves belong to SIM, ANIM and AUDIO; the humor-sim generator emits all 14 and every category speaks |
| H6 | PASS | 30.3% of first-draft copy lines cut (section 2), all limits asserted by tests; full list in section 5 |
| H7 | N/A to this agent | the independent COMEDY-EDITOR pass is a separate agent; sections 4 and 6 are written for it |
| H8 | PASS | 245 templates (>= 120); 15 slot kinds (`unit unit2 killer team faction faction2 arena mission n streak ratio flank pct prop lifetime`); 12 persistent callbacks reading 8 lifetime stats (`kills wins friendlyKills chickenKills chickenDefeats goatKills kicks zeusRagequits`); 60-minute histogram at 1x: busiest line 2.2-2.8% of lines (target <= 4%), at 4x <= 3.5% |
| U4 | PASS (text) | blurb, lore, >= 3 death quotes, >= 2 taunts, codex joke for all 43. The "sfx families exist in the cue map" half belongs to AUDIO |

Simulation output (seed 7, veteran profile):

```
humor-sim  60 min at 1x  seed 7  stats veteran  recorded logs  battles 24
  lines 313  (5.22/min, one per 11.5 s overall, one per 6.9 s in battle)  distinct 158 of 245 templates  chains 14
  repeats within 5 min   0.6%   (target < 8%)
  top line share         2.24%   (target <= 4%)   big_swing_flank 2.24%, kill_streak_brave 1.92%, kill_streak_pattern 1.92%, big_swing_arith 1.60%, kill_streak_name 1.60%, big_swing_cluster 1.60%
  categories hit         45/45   all
  voice share            brutus 33.5%  plato 30.4%  cassandra 36.1%   (target 25-45% each)
  lines per battle       mean 13.0  p10 9  p90 17  min 8  max 20
  gap between speakers   min 1.50 s  p5 1.69  mean 12.1  p95 60.0
  rule violations        gap 0  same-voice 0  chain-beat 0  recency 0  low-priority-at-fast 0

humor-sim  60 min at 4x  seed 7  stats veteran  recorded logs  battles 44
  lines 241  (4.02/min, one per 14.9 s overall, one per 4.2 s in battle)  distinct 119 of 245 templates  chains 8
  repeats within 5 min   0.4%   (target < 8%)
  top line share         2.49%   (target <= 4%)   hero_down_flank 2.49%, big_swing_arith 2.07%, defeat_teaching 2.07%, hero_down_army 2.07%, battle_start_define 2.07%, battle_start_define_b 2.07%
  categories hit         38/40   missing: rout, misaim
  voice share            brutus 35.3%  plato 30.3%  cassandra 34.4%   (target 25-45% each)
  lines per battle       mean 5.9  p10 5  p90 7  min 5  max 8
  gap between speakers   min 1.54 s  p5 1.69  mean 15.8  p95 59.8
  rule violations        gap 0  same-voice 0  chain-beat 0  recency 0  low-priority-at-fast 0
```

Seeds 11 / 23 / 42 at 1x: repeats 0.6% / 0.3% / 0.3%; busiest line 2.27% / 2.24% / 2.30%; 45/45 categories each; voices within 33-36% each.

## 4. The ten lines I am proudest of

1. Spartan blurb: "Speaks in single words. Kicks in full sentences." and his taunt: "If."
2. Immortal lore: "...so the number always looked right. Marketing called it immortality. Recruitment called it Tuesday."
3. Hoplite codex: "Armour rating 30%. Mortgage rating 70%."
4. Plato, hero down: "The commander falls. The army becomes a crowd with equipment."
5. Cassandra, defeat: "I said left flank. I said left flank. I said left flank."
6. Senator last words: "Et tu... subcommittee?"
7. Brutus, catapult misfire: "The catapult has launched a WORKER! His union will have words!"
8. Equites last words: "Someone really should invent stirrups."
9. Legionary codex: "Digs a camp every night. Camp not included in the cost."
10. The booth chain: Brutus "And now, back to PLATYPUS!" / Plato "Plato." / Brutus "That is what I said!"

Near misses worth a look: Gladiator "Was that a thumbs up or just a thumb?", Philosopher "I think, therefore... oh.", Chieftain lore "a vote that was ninety-four percent clapping", Minotaur "Left turn. Finally.", Medusa "Finally, someone made eye contact back."

## 5. Cut log (the literal lines removed from the first draft, with the reason)

Entries read: speaker and id for announcer lines, otherwise the line itself. Rewrites that replaced a first version appear here as the removed first version.

### announcer.js (112 cuts)

- Brutus `battle_start_sponsor`: "Today's fight is sponsored by Corinth Column Co.: our pillars are seventy percent PILLAR!" (pillar sponsor is stronger in the filler pool; same joke twice in one booth)
- Plato `battle_start_arena`: "{arena}. A fine place to ask whether anyone present truly wishes to be here." (wordy, setup without a turn)
- Plato `battle_start_armies`: "Two armies, one {arena}, no one asking permission. A very Greek arrangement, or a very human one?" ("very Greek" leans on a national stereotype; also limp)
- Brutus `battle_start_return`: "Battle number {lifetime:battles}, folks! At this point you should be on the payroll!" (payroll joke is stock; the ledger callback is sharper)
- Plato `battle_start_welcome_back`: "Welcome back. You have fought {lifetime:battles} battles. Has any of them answered the question?" (second battle-count callback; Cassandra's ledger does it better)
- Brutus `battle_start_trumpet`: "Let the trumpets sound! The trumpeter is on break, so please enjoy this announcement!" (not tied to anything on screen; generic stalling)
- Brutus `battle_start_sky`: "WELCOME to {arena}! {faction} on one side, {faction2} on the other, and a great deal of sky in between!" (twin of the welcome line)
- Brutus `battle_start_poured`: "The crowd is seated! The wine is poured! The ARMIES are, regrettably, armed!" (regrettably armed is a hedge)
- Plato `first_blood_educate`: "One {unit2} is dead. The rest now understand the word. Educational, in its way." (wordy, 'educational' is a hedge)
- Brutus `first_blood_scoreboard`: "And the SCOREBOARD moves! {unit} one, everybody else a polite zero!" (stock sports-caster phrasing)
- Brutus `first_blood_oil`: "FIRST blood of the day! Presented by Athenian Olive Oil: slippery since 600 BC!" (same sponsor joke lives in idle_filler)
- Brutus `first_blood_wine`: "Blood has been drawn! Or wine! The management refuses to say which!" (gore-setting joke, no reaction to what actually happened)
- Brutus `first_blood_ceremony`: "FIRST blood! A {unit} has removed a {unit2} from the opening ceremony!" (twin of the opinion line)
- Plato `first_blood_teaches`: "The first to fall teaches the rest how. Thank you, {unit2}." (sentimental, not funny)
- Brutus `kill_streak_pension`: "{streak} KILLS for the {unit}! Somebody get this warrior a pension, or a nap!" (pension or a nap is mild)
- Brutus `kill_streak_recruit`: "{streak} down! Somewhere a recruiter is updating a POSTER!" (poster gag has no image of why)
- Brutus `kill_streak_admin`: "{streak} down! The {unit} is performing ADMIN on the battlefield!" ("admin" has no image; the joke is only the word)
- Brutus `kill_streak_mothers`: "{streak} kills! Mothers, hide your sons! Sons, hide your SPARE helmets!" (stock "hide your sons" phrasing)
- Plato `kill_streak_cruel`: "At {streak}, the counting itself begins to feel cruel." (sombre note on a comic moment)
- Plato `kill_streak_statistic`: "At {streak} kills, a soldier stops being a person and becomes a statistic." (grim and generic; the best line here is the pattern/personality one)
- Cassandra `kill_streak_count`: "{streak}. He has not stopped to ask how many are left. Nobody does." (flat)
- Cassandra `kill_streak_tally`: "The records will say {streak}. They will not say who held his shield." (the shield jab is slight)
- Brutus `kill_streak_cemetery`: "{streak} KILLS! The {unit} is single-handedly keeping the cemetery in business!" (Brutus already has four kill-streak lines)
- Plato `kill_streak_stop`: "The {unit} has {streak} kills. Will he stop, or has he forgotten how?" (weaker twin of the brave/uninterrupted line)
- Cassandra `kill_streak_soon`: "The {unit} will fall soon. I will not say when. I never say when." (Cassandra gag with no content ('I never say when'))
- Plato `hero_down_lunch`: "Now we learn whether they fought for the {unit} or for the free lunch." (overlaps the army/crowd line)
- Cassandra `hero_down_hour`: "The {unit} fell in the second hour of the second prophecy. Nobody read it." (duplicates the parade_c joke (second prophecy))
- Brutus `hero_down_mourn`: "The {team} {unit} is gone! He will be MOURNED! After the battle! For a bit!" ("for a bit" is a weak button)
- Plato `friendly_fire_aim`: "He aimed at an enemy and found a friend. Which was the larger surprise?" (Plato filler; the question line does it better)
- Cassandra `friendly_fire_expected`: "The {unit} learned where his allies stand. They were standing there." (the joke depends on no image; reads as a setup with no punchline)
- Cassandra `friendly_fire_solo`: "A {unit2} fell to a {unit}. Friendly, as in the fire. Nobody else." (confusing)
- Brutus `rout_morale`: "MORALE has left the building! And the car park! And possibly the city-state!" (left-the-building is a stock phrase)
- Cassandra `rout_fast`: "Running is the one drill everyone passes." (fine but redundant with Plato's flight line)
- Plato `rout_general`: "When one runs, ten run. When ten run, the general discovers he was also running." (runs long)
- Brutus `charge_cinematic`: "A CHARGE! Brace! Or do not! Both look great on camera!" (talks about the camera, breaks the booth fiction)
- Brutus `charge_hooves`: "Hooves! Lances! Dust! I am feeling SOMETHING!" ("I am feeling something" is a filler beat)
- Brutus `brace_points`: "Fence one, horse nothing! The FENCE is winning on points!" (pun on fence is thin)
- Plato `volley_one`: "Is a volley one attack or {n}? Does the arrow care?" (answers its own question weakly)
- Brutus `volley_dienekes_b`: "Then we fight in the SHADE! Somebody said that here once, and I wish I had billed them!" (overlaps with Plato's version and runs long)
- Cassandra `volley_regret`: "{n} arrows. {n} regrets. Nobody ducks in time." (number-as-joke without a turn)
- Brutus `boulder_physics`: "Catapult! Pure engineering! Also pure arithmetic! Also pure OUCH!" (engineering/arithmetic/ouch is a rule-of-three template)
- Brutus `boulder_boom`: "BOOM! That was not a boulder, that was a conversation ender!" (no specific image)
- Brutus `misaim_vibe`: "Cyclops! Depth perception: more of a VIBE!" ('vibe' ages badly)
- Plato `chicken_hero`: "A hen has felled a {unit}. Which of them was truly sacred?" (sacred-chicken pun is in the unit name already)
- Cassandra `chicken_tantrum`: "It is angry now. It will not be less angry. Nobody listens." (weak: says the chicken is angry, which the screen shows)
- Brutus `chicken_division`: "Your poultry division now has {lifetime:chickenKills} kills! Rome has nothing like it!" (weaker than the ledger and general callbacks)
- Brutus `chicken_cluck`: "BAWK! That is the sound of a chicken entering negotiations!" (describes a sound, no turn)
- Cassandra `chicken_general_c`: "The chicken is the real general. I said it would be." (duplicates the general callback)
- Brutus `goat_career`: "The goat's career: {lifetime:goatKills} kills. Unpaid. UNPAID!" (duplicates the rank callback)
- Plato `goat_hat`: "A tiny helmet, a large horn. Is that not the whole of military doctrine?" (thin; "whole of military doctrine" is a stock closer)
- Brutus `philosopher_speaking`: "The philosopher is SPEAKING! The enemy is confused! So are we, but we are paid to be!" (the monologue line is the same beat, sharper)
- Brutus `philosopher_argument`: "An ARGUMENT has broken out and no sword is involved! Absurd!" ('Absurd!' is a hedge)
- Plato `philosopher_why`: "Each soldier now wonders why he is swinging a sword. An excellent question. Let them ask it later." (long; lecture line is sharper)
- Plato `philosopher_rival`: "He is not wrong. About what, I could not say. Is that not the best kind of rhetoric?" (ends on a hedge instead of a punchline)
- Plato `senator_bought_p`: "Bought, turned, and used. The Senate calls it democracy." (cheap shot at the Senate with no specifics)
- Cassandra `senator_spoken`: "The Senate has spoken. It took four hours. It said nothing." (duplicates the hours line)
- Brutus `trojan_twist`: "A horse! A gift! A plot TWIST!" (plot twist is a cliche)
- Plato `medusa_dead`: "{n} men turned to stone. Statues of the dead, or the dead as statues? An old question." (long and abstract)
- Brutus `medusa_rules`: "Never make EYE CONTACT with a gorgon! It is in the Terms of Conquest, clause two!" (third clause-number gag in a few minutes of play)
- Plato `elephant_size`: "Fire frightens the elephant. Is size merely a larger surface for fear?" (weaker than the torch line)
- Brutus `elephant_torch`: "The elephant is on FIRE! Terms of Conquest, clause three: elephants shall not be lit!" (a chain this near the other panic lines crowds the sub-category; the stampede line is the better button)
- Cassandra `elephant_torch_c`: "Somebody lit it. I said they would." (orphaned by the cut of its head)
- Brutus `elephant_shade`: "The elephant is blocking the sun, the road and the horizon! Brought to you by SHADE!" (shade sponsor gag is already in volley)
- Brutus `kick_boot`: "KICKED! The {unit2} has left the building! Also the zip code!" (zip code gag is a rule-of-two of the building gag)
- Plato `kick_flight`: "The {unit2} flew eight units. Is this a defeat or merely an unscheduled flight?" (wordy, 'unscheduled flight' not strong enough)
- Cassandra `kick_sparta`: "This is Sparta. It was always going to be Sparta." (quotes the meme without adding anything)
- Plato `kick_boot_p`: "The boot is the oldest weapon, after the grudge. And a good deal more reliable." (reuses Plato's "oldest weapon" frame from the chicken line)
- Cassandra `kick_count`: "The Spartan will kick again in eight seconds. I have counted. Nobody else counted." (duplicates the eight-units line)
- Cassandra `immortal_asterisk`: "There was an asterisk. Nobody reads the asterisk." (the asterisk joke is made in the unit text and in the revive line)
- Brutus `immortal_hydra`: "ANOTHER one! It is like fighting a very angry HYDRA, but with spears!" (hydra reference adds nothing the Immortal does not already do)
- Plato `hazard_lava_p`: "The river was on fire. He walked in anyway. Is curiosity a virtue?" (Plato filler)
- Plato `hazard_spikes_p`: "The trap was visible, and so was the man, briefly." (grim)
- Cassandra `hazard_fall`: "Gravity again. I said gravity." (flat)
- Brutus `lead_change_hands`: "The LEAD changes hands! {team} takes it! Place your bets again, you fickle creatures!" (fickle creatures is a stock insult)
- Plato `lead_change_who`: "Who is winning? Nobody knows. May we revise the question in ten minutes?" (hedge instead of a joke)
- Brutus `lead_change_seesaw`: "Back and forth! It is a SEESAW with swords!" (stock sports metaphor)
- Cassandra `big_swing_nobody`: "It swung {flank}. It always swings {flank}. Nobody listens." (duplicates fold)
- Brutus `big_swing_momentum`: "MOMENTUM swing on the {flank}! That is a {ratio}-to-one situation, folks!" (stock sports phrase)
- Plato `big_swing_flank`: "The {flank} flank has made a decision. Is it theirs?" (mush; "is it theirs" has no referent)
- Brutus `army_low_support`: "{team} is down to {pct} percent! That is not an army, that is a SUPPORT GROUP!" (support group is slightly stock; hats is sharper)
- Cassandra `army_low_few`: "{team} is at {pct} percent. I said it would be a number. This is the number." (the number joke is not a joke)
- Brutus `stalemate_refund`: "Please resume the KILLING! The audience paid for killing! And sandwiches!" (the refund joke is in the Plato contemplation line)
- Brutus `stalemate_wine`: "Is somebody going to hit somebody?! The wine is going WARM!" (warm wine has no punch)
- Plato `zeus_boredom`: "Zeus acts. Is a god's boredom the origin of all weather?" (abstract)
- Plato `zeus_tantrum`: "The king of the gods has thrown a tantrum. The mortals, for once, were patient." (shows the setup twice in a row with the ragequit chain)
- Plato `victory_defeated`: "{team} wins. The others, one assumes, lose. Is that a conclusion or a footnote?" (hedges its own joke)
- Cassandra `victory_streak`: "The cheering will stop. The ledger will not." (portentous and empty)
- Brutus `victory_nap`: "{n} survivors! The Terms of Conquest grant them a nap and a sandwich! CLAUSE five!" (clause numbers are already over-used)
- Brutus `victory_inform`: "THAT is how you do it! Somebody tell the other side, in writing!" (in writing is a limp button)
- Brutus `defeat_exit`: "Please remain SEATED while the defeated are escorted out by their embarrassed relatives!" (wordy)
- Plato `defeat_loss`: "{team} loses. The reasons are many. The outcome is one. Shall we define loss?" ('shall we define loss' is a weaker echo of Plato's battle gag)
- Brutus `defeat_again`: "Never mind! There is always the REMATCH! It is the only button that loves you!" (points at UI, breaks the booth fiction)
- Brutus `defeat_hero`: "Defeat! But did you SEE that one {unit} on the left? A hero! Briefly!" (no specific image)
- Brutus `defeat_educational`: "DEFEAT! Not a disaster! A very detailed, educational disaster!" (detailed educational disaster is a template of the defeat line)
- Plato `timeout_coins`: "Time ends the battle, not the argument. The one with more coins wins. Sad, yes?" (sad, yes? is a weak button)
- Plato `timeout_draw_p`: "A draw: two answers, neither of them right. Shall we call it a question?" (weak)
- Plato `mass_death_moment`: "{n} gone in a moment. We call it a bad moment, never a tragedy." (bad moment / tragedy is a cliche)
- Cassandra `mass_death_pattern`: "{n} at once. I call this a pattern. Everyone else calls it a bad day." (duplicates cluster)
- Cassandra `prop_destroyed_weak`: "The {prop} was the weak point. I said it was the weak point." (I said it was the weak point is a Cassandra tic with no content)
- Plato `god_power_meteor_p`: "The sky delivered a rock. Complaints should be addressed to the sky." (complaints to the sky is only ok)
- Plato `god_power_quake_p`: "When the earth moves under a soldier, is he still marching? Is he still anywhere?" (long)
- Plato `god_power_heal_p`: "A wave of healing. Somewhere, a physician has just lost his livelihood." (physician gag is thin)
- Cassandra `god_power_chickens_c`: "I said chickens. Last time too. Nobody gave the chickens a chance." (weaker than Plato's chicken line)
- Plato `god_power_bolt_p`: "A bolt from the blue. Which side is blue? Both, today." (which side is blue is a joke about UI colours, not the scene)
- Brutus `idle_filler_column`: "Corinth Column Co. reminds you: our pillars are seventy percent PILLAR!" (pillar sponsor gag is only half a joke without the setup)
- Brutus `idle_filler_clause`: "Reminder: Terms of Conquest, clause seven: nobody stabs the grape seller. Laminated and everything." (duplicates the battle_start terms line almost word for word)
- Plato `idle_filler_necessary`: "No one has asked whether this war is necessary. Perhaps that is the answer." (preachy)
- Cassandra `idle_filler_boring`: "I predicted this part. It was boring. It came true." (nothing specific)
- Cassandra `idle_filler_weather`: "It will be bad. Then slightly worse. Then it will be Thursday." ("Thursday" button is a stock gag by now)
- Plato `idle_filler_grapes_p`: "The man with the grapes has not looked up once. Is he the only wise person here?" (grape guy better owned by Brutus)
- Brutus `idle_filler_booth`: "The BOOTH wishes to remind you that the booth is not responsible for anything." (broken fourth wall for nothing)
- Brutus `idle_filler_hydrate`: "Hydrate, citizens! Water, wine, or whatever is in the sponsor's cup!" (sponsor cup has no punch)

### units_text.js (170 cuts)

- `blurb: 'Spear, shield, and a lifetime of paying off both.'` (weaker twin: the mortgage joke lands harder in the other blurb)
- `'Not the helmet! I am still paying for the helmet!'` (fourth-best of four hoplite quotes; mortgage already made twice)
- `'My spear was longer. It was on the account.'` (explains its own joke)
- `'I should have stayed with the olives.'` (quiet but not a turn; four death quotes already beat it)
- `'My neighbour\'s shield was very nice. Tell him.'` (sweet, not funny; the Nikias line owns the phalanx joke)
- `'Shields up, opinions down.'` (generic soldier talk, nothing hoplite-specific)
- `'Hold the line. Preferably mine.'` (filler, no image)
- `codexJoke: 'Spear length: adequate. Wage: theoretical.'` (reads like a template, no specific image)
- `blurb: 'Trained from age seven to say less and kick more.'` (duplicates the lore, softer than the twin)
- `'Nothing to add.'` (the taunt If. already carries the laconic gag)
- `'Tell Sparta I held the line. Briefly. Horizontally.'` (too long for a laconic man)
- `'Spartans do not die. We are rearranged.'` (boast with no surprise)
- `'Come back with more friends. Fewer would also work.'` (filler insult, any unit could say it)
- `'Our patience is large. Our boots are larger.'` (same shape as the kick codex joke)
- `codexJoke: 'Launches enemies 8 u. Apologises 0 u.'` (same structure as the keeper, near duplicate)
- `'I was running. I swear I was running.'` (generic next to the fox and javelin quotes)
- `'They caught me. How rude.'` (generic, no image)
- `'That was not the plan. The plan was away.'` (no image; the running quote does it better)
- `'Not it! Not it! Not it!'` (tag reference confuses more than it amuses)
- `'Javelin delivery! No signature required.'` (third peltast taunt; Over here is sharper)
- `blurb: 'Mercenary archer. Paid per contract, not per hit. Visible in the results.'` (too long, explains the joke)
- `'Contract unfinished. Refunds are not my department.'` (third contract joke; widow and forty arrows are sharper)
- `'That one was aimed. Sort of.'` (placeholder-grade, no surprise)
- `'Aim for the one with the nice hat.'` (hat joke is better on the peltast)
- `'Look up. No, higher.'` (third archer taunt; the exploring line is the keeper)
- `'Incoming! Probably not at you.'` (duplicates the exploring taunt idea)
- `codexJoke: 'Spread 0.045. Excuses: unlimited.'` (number-in-a-joke is a template, not a joke)
- `'I was supposed to be flanking!'` (generic, any cavalry)
- `'I was ahead of the plan!'` (generic cavalry)
- `'My horse had a cavalry career before mine.'` (setup without a punchline)
- `'A king, a lance, a horse. The horse is the brains.'` (restates the blurb)
- `codexJoke: 'Bonus damage when charging. Bonus embarrassment when braced.'` (second joke on the same fact, weaker)
- `'That was not a valid counter-argument!'` (I think, therefore... oh beats it)
- `'I regret nothing. I examined it.'` (smug but not funny)
- `'Is this death, or merely a very sharp question?'` (pun that explains itself)
- `'Define your terms, warrior.'` (duplicates the first taunt idea)
- `'Your sword asks: why do you carry it?'` (good, but the forest line is stronger and one per unit is enough)
- `codexJoke: 'Confuse radius 7 u. Clarity radius: 0.'` (same joke shape as the keeper; one per card)
- `blurb: 'Leads from slightly further forward than everyone else. Carries a baton.'` (describes a costume, not a joke)
- `'Tell the assembly I vote against this.'` (abstain is the cleaner gag)
- `'Rally on someone taller.'` (unclear, no punchline)
- `'Plan B was to survive. Plan C: also survive.'` (list-of-plans is a stock structure)
- `'We will hold. Or we will strategically not hold.'` (generic general talk)
- `codexJoke: 'Cost: 380. Baton: decorative.'` (flat)
- `'Tell Rome the road was crooked, not me.'` (reads like a thought, no turn)
- `'Roads! Why did I build roads?!'` (complaint, no turn)
- `'Tell my centurion the camp was already dug.'` (pays off a joke the unit has already made)
- `'Square up. Then square up again.'` (filler)
- `'Reinforcements arrive in a straight line.'` (needs the lore to land)
- `codexJoke: 'Testudo needs four adjacent friends. Rome calls this a committee.'` (joke does not follow from the mechanic)
- `'I had one more pilum. It was bent.'` (obvious follow-on)
- `'Tell the legion: aim for the shield.'` (advice, not a joke)
- `'Your shield was nice. It is now a doorstop.'` (the shield accessory taunts cover it)
- `'Who will do the paperwork on this?'` (paperwork joke is spent on the legionary)
- `'Dismissed? No. Not dismissed. Dead.'` (stage business, not funny)
- `'My vine stick has seen worse. It has seen my men.'` (mean without an image)
- `'I am retiring. Permanently.'` (stock death pun)
- `'Tell the crowd I was almost great.'` (sad rather than funny)
- `'Louder! I cannot hear you losing!'` (overlaps the entertained taunt)
- `codexJoke: 'Net: roots 2.5 s. Trident: good for fish jokes.'` (the fish joke is not even made)
- `'I have no stirrups to fall out of!'` (second stirrup joke dilutes the first)
- `'At least I fell gracefully. Without stirrups it was mostly accidental.'` (too long, repeats the joke)
- `'We ride! Without stirrups! With attitude!'` (repeats blurb)
- `'I had it in my sights. Both of them.'` (unclear)
- `'Reload! Reload! Why is nobody reloading?!'` (duplicates the just-reloaded quote)
- `'Fall in a line, gentlemen. It is lunchtime for the bolt.'` (strained)
- `'I demand a recount.'` (stock senate joke)
- `'I yield the remainder of my time.'` (stock senate gag)
- `'This is not how democracy ends!'` (slogan)
- `'Let the record show you are losing.'` (record joke is stock)
- `'A donation to my campaign, or to your funeral?'` (clever but cruel; the one coin line is cleaner)
- `'Whoever did this will be fined.'` (weaker police beat)
- `'I will need to file a report on this wound.'` (duplicates the legionary paperwork joke)
- `'You are under arrest. By spear. Immediately.'` (obvious)
- `'The other five arrows were not even lit.'` (restates the blurb)
- `'My fire arrows were the best. All one of them.'` (arithmetic joke too slight)
- `'Seventh arrow, ninth attempt. Where was I?'` (muddled)
- `'Here comes number six!'` (too short to carry the gag alone)
- `'Next time, a bigger hook.'` (weaker than the laughing-at-the-hook quote)
- `'At least my sword is a good shape.'` (weak)
- `'Harvest time!'` (flat, no image)
- `'Cut. Pull. Repeat.'` (slogan)
- `'Left! LEFT! The OTHER left!'` (duplicates the first quote)
- `'The archer says it was the driver.'` (blame joke already made by Who was driving)
- `'Out of the way! Please!'` (weak: no mechanic, no surprise)
- `'At least the nap will be longer.'` (nap joke is in the taunt)
- `'Unwrapping was not consent.'` (dark and strains the tone rule)
- `'Do you know how long this took to wrap?'` (same line works better as a taunt, not both)
- `'I have been waiting. For some time. Thousands of years.'` (stretched joke)
- `'File this under unexpected.'` (forgettable)
- `'Mercy is not my department. Neither is dying.'` (duplicates the execute codex joke)
- `'You look tired. Allow me to help.'` (third Anubis taunt, a shade too menacing for the tone)
- `'Sunbeam jammed. Of course.'` (weak setup)
- `'The sun is going down. How convenient.'` (no turn)
- `'Stay in the light. Everything is better in the light.'` (greeting-card voice)
- `'Tell the vizier the taxes were a joke.'` (obscure setup)
- `'One more sarcophagus upgrade, that was all I wanted!'` (runs long, punchline buried)
- `'Who will complain now?'` (ok but dilutes the pyramid quote)
- `'Kneel. Or be kneeled upon.'` (clumsy grammar joke)
- `'I was told it was unlimited.'` (third terms-and-conditions variation)
- `'Immortal, they said. Pro rata.'` (pro rata is too accountant-only)
- `'My brother died too. Then he took my place.'` (confusing family setup)
- `'We never die! (Asterisk.)'` (asterisk gag spent in the death quotes)
- `'My wall! Where is my wall?'` (plain)
- `'Behind the wicker, I felt so brave.'` (slight)
- `'Everyone behind me is safe. Everyone in front is annoyed.'` (set-up shape without a snap)
- `'Please help me turn around.'` (restates the lore)
- `'The horse fell first. Very sensible.'` (restates horse armour)
- `'Step aside or become a footnote.'` (generic menace)
- `'The camel will take it from here.'` (weaker than camel does not look sorry)
- `'Spit first. Ask later.'` (stock camel gag)
- `'Smells like victory. And camel.'` (stock phrase)
- `'Tell the architects the view was excellent.'` (the throne-on-fire quote is stronger)
- `'Somebody hold the cushion. I am the King of Kings.'` (the cushion is better in the taunt)
- `'Kneel before the King of Kings. Mind the cushion.'` (cushion joke is in the death quote)
- `codexJoke: 'Sits after 4 s idle. Shouts Retreat when attacked. Cowers 2 s. Plan: flexible.'` (a spec dump, not a joke)
- `'Pah-ROO! (Please tell the driver I was a good elephant.)'` (duplicates howdah-crew quote)
- `'Trumpet! (I told them about the mice.)'` (mouse myth is unconfirmed and cut from the plan)
- `'Remember me. I am the large one.'` (generic)
- `'Steering was always optional.'` (restates the blurb and codex)
- `'Which way is the exit? Ask the horse.'` (dupe of Horse, which way did you go)
- `'No saddle! No bridle! No problem! Mostly problems!'` (restates the blurb)
- `'We measured twice. We did not measure Gaius.'` (funny, but Gaius appears in the projectile quote)
- `'Arm. Arm. Who has seen my arm?'` (gore-adjacent, no turn)
- `'Mind your heads. And your cousins\' heads.'` (third catapult taunt)
- `'I almost had them. The elephants were so close.'` (generic hero regret)
- `'Tell the Senate I said hello.'` (cheap)
- `'Look left. Now right. Now everywhere.'` (third Hannibal taunt, vaguer than Rome built roads)
- `'Sorry about the mess.'` (generic apology)
- `'Please accept my apologies and my axe.'` (second apology joke dilutes the first)
- `'I apologise for the language. And the axe.'` (duplicates the second apology)
- `'I am furious, but happy to chat afterwards.'` (weaker than the AAARGH taunt)
- `'Please label them for next time.'` (second axes-return gag)
- `'Please send my axes to the family. Politely.'` (dark with no turn)
- `'Axes away! Mind the horns!'` (generic)
- `blurb: 'Lightning that jumps between three enemies like gossip.'` (gossip is better used in the lore)
- `'I should have stayed in the grove.'` (generic regret)
- `'My hedge. Someone tend my hedge.'` (dupes the hedges quote)
- `'Please stand a little closer to your friend.'` (dupe of 'stand close together')
- `'Woof? (Was that a stick? Was it a stick?)'` (duplicates the sausage gag)
- `'Whimper. (Briefly. Then a stick joke.)'` (not a joke, just sad)
- `'Whimper? (Was that a squirrel?)'` (needs the sausage gag, which is stronger)
- `'GRRR! (Also: can I have that stick?)'` (stick gag is in the death quote)
- `'This meeting is adjourned. Permanently.'` (stock meeting gag)
- `'Honk the horn for me. Just once.'` (duplicates the horn quote)
- `'We have voted. You are outnumbered.'` (weaker than by a show of hands)
- `'Tell Theseus I let him win.'` (fourth minotaur death, least tied to the mechanic)
- `'The maze was easier.'` (tells instead of showing)
- `'MOO. (Translation: do not.)'` (cheap, and the bull is not that kind of joke)
- `'Corners! Corners! I hate corners!'` (duplicates the left-turn gag)
- `blurb: 'One eye, no depth perception, excellent throwing arm. Do the maths.'` (tells the joke instead of showing it)
- `'Was that closer than I thought?'` (overlaps the where-are-you quote)
- `'Is that the sun? Or the other eye?'` (confusing)
- `'That one was on purpose.'` (third Cyclops taunt; the come-out one is funnier)
- `'My snakes will want a word.'` (no payoff)
- `'You looked. I told you not to. Actually, I wanted that.'` (muddled)
- `'It is rude not to make eye contact.'` (third Medusa taunt)
- `'Four legs and I still tripped.'` (does not follow from the unit)
- `'Two lunches. I should have eaten the second.'` (duplicates the codex joke)
- `'Hooves for running, hands for arrows.'` (describes, does not joke)
- `'Wait, the hatch is stuck! Push!'` (overlaps the not-ready quote)
- `'Gifts come with a receipt, you know.'` (receipt is in the codex joke)
- `'Do not count the horse\'s legs.'` (no payoff)
- `'It is a very nice horse. Take it.'` (duplicates 'It is a gift')
- `'Bawk! (Warn the others: it is the big ones.)'` (unclear)
- `'Squawk. (My corn!)'` (duplicates the corn quote)
- `'BAWK BAWK. (Do you have corn?)'` (corn is a death-quote joke)
- `'Baa-aa-aah. (Tell them I did the thing.)'` (vague)
- `'Maaa. (Remember the hay.)'` (weaker twin of the hat quote)
- `'MAAAH! (I am the plan.)'` (claims the plan; the goat gag is stronger as a review)

### killverbs.js (67 cuts)

- `'retired'` (plain)
- `'concluded a debate with'` (twin of ended a long argument with)
- `'dealt with'` (says nothing)
- `'defeated'` (the one verb every game already has)
- `'relieved of command'` (does not compose with a victim as its object)
- `'ended the career of'` (generic)
- `'pelted'` (plain)
- `'delivered a pointy letter to'` (twin of the strongly-worded arrow)
- `'shot'` (generic)
- `'volleyed at'` (plain)
- `'perforated at range'` (does not compose with a victim as its object)
- `'rearranged'` (vague)
- `'renovated'` (vague)
- `'landscaped'` (vague)
- `'blasted'` (generic)
- `'flattened by committee'` (does not compose; the committee joke is better in senator text)
- `'barbecued'` (tonal edge, reads as gore-adjacent)
- `'lit up'` (plain)
- `'set alight'` (plain)
- `'walked through'` (plain)
- `'rolled over'` (duplicates steamrolled)
- `'flattened with feet'` (does not compose and is clumsy)
- `'pressed'` (vague)
- `'enchanted'` (plain)
- `'miracled'` (not a word)
- `'gave a very long glare to'` (no kill in it)
- `'statue-ified'` (clumsy)
- `'fossilised'` (wrong period)
- `'turned into garden art'` (does not compose with a victim as its object)
- `'drop-kicked'` (plain)
- `'gave a boot-shaped surprise to'` (clumsy)
- `'footballed'` (anachronism that does not read)
- `'sent to the horizon'` (does not compose with a victim as its object)
- `'butted'` (plain)
- `'horned'` (reads as a different joke)
- `'prodded firmly'` (too gentle for a gore)
- `'let go of'` (plain)
- `'waved goodbye to'` (cute, no image)
- `'snake-bit'` (clumsy)
- `'nibbled to death with serpents'` (awkward, does not compose)
- `'gave a nasty bite to'` (plain)
- `'finished'` (plain)
- `'filed'` (plain)
- `'ended'` (generic)
- `'stamped'` (one word, no image)
- `'sent an employee through the air at'` (long)
- `'got the wrong projectile onto'` (clumsy)
- `'threw the wrong thing at'` (plain)
- `'closed a deal with'` (plain)
- `'turned a coin into a casualty with'` (does not compose)
- `'cashed in on'` (plain)
- `'smote'` (duplicates magic)
- `'illuminated'` (plain)
- `'struck'` (bland)
- `'electrified'` (plain)
- `'sank'` (plain)
- `'took for a swim'` (does not compose with a victim as its object)
- `'soaked permanently'` (plain)
- `'overheated'` (plain)
- `'kicked into the lava'` (does not compose with a victim as its object)
- `'gave a hot tub to'` (duplicates the very hot bath)
- `'pinned'` (plain)
- `'enrolled in acupuncture'` (does not compose)
- `'prickled'` (too gentle)
- `'orbited'` (does not compose)
- `'shot into the sky'` (does not compose with a victim as its object)
- `'popped'` (plain)

### barks.js (45 cuts)

- `'Advance! Slowly. With feeling.'` (weakest of three melee engage barks)
- `'For whoever is paying!'` (generic)
- `'Ow. Noted.'` (generic grunt)
- `'Is that blood or wine?'` (depends on the gore setting)
- `'Lunch!'` (one word, no turn)
- `'Hooray for the sticks!'` (random)
- `'Raining arrows, as requested!'` (stock phrase)
- `'Who let them near the archers?'` (reads as a complaint, not a joke)
- `'Fall back! Further back! Further!'` (duplicate of the first idea)
- `'Hit something! I think.'` (duplicates I counted three)
- `'Gallop first, think later!'` (generic cavalry)
- `'Keep your balance! Both of us!'` (filler)
- `'Whoa! Whoa! Wrong way!'` (weaker than the horse-decides gag)
- `'Boulder away! Probably!'` (lives better as the catapult taunt)
- `'It is only a splinter!'` (weaker)
- `'Please write that down!'` (filler)
- `'Nobody stand near the sharp end of me.'` (unclear)
- `'Ow! I am the healing!'` (weaker twin of the first)
- `'Behold! Me!'` (flat)
- `'I have had worse. Tuesday.'` (stock "I have had worse")
- `'You will do nicely.'` (generic monster menace)
- `'I did not sign up for this!'` (generic)
- `'Peck peck peck peck!'` (duplicates the BAWK bark)
- `'Grrr! (Good boy.)'` (duplicates the warhound taunts)
- `'Wait, which side was I on?'` (confusion gag is stock)
- `'Define enemy.'` (too thin)
- `'What is a battle, but a very loud question?'` (Plato's gag stays in the booth)
- `'Do my feet belong to me?'` (no battlefield image)
- `'Zzz... a very long speech...'` (weakest of the sleep bubbles)
- `'Zzzz...'` (not a joke)
- `'Is the ground supposed to move?'` (stock drunk line)
- `'I am not drunk. The hill is.'` (stock drunk line)
- `'Do not look at the statue.'` (unclear who is speaking)
- `'The coin was shiny!'` (flat after the better bribed lines)
- `'RUN! I mean: flee!'` (duplicates the heroes rout joke)
- `'Aaaaah! Elephant! Wrong elephant! Our elephant!'` (overlong)
- `'I am a torch!'` (obvious)
- `'Is this the warm welcome?'` (reuses the warm-reception verb)
- `'A spear is only a very long finger.'` (does not turn)
- `'Let us agree to disagree. Then disagree.'` (stock phrase)
- `'Everything flows. Mostly toward the exit.'` (pun on a stock slogan)
- `'Is the pen mightier than the sword? Let us try.'` (stock phrase)
- `'Bury me with my snack.'` (duplicates the snack jokes elsewhere)
- `'Not like this! Not here! Ow.'` (whiny, not specific)
- `'I am much braver than I look.'` (generic)

### names.js (35 cuts)

- `'the Tolerably Brave'` (adjective with no scene)
- `'the Moderately Famous'` (weaker than the Mildly Concerned family)
- `'the Well-Rested'` (flat)
- `'the Hat Enthusiast'` (hats are everywhere in the copy)
- `'the Reluctant'` (one word, no turn)
- `'Keeper of Opinions'` (no image)
- `'the Excessively Hydrated'` (priest joke already owns hydration)
- `'the Unfazed'` (duplicates the Unbothered)
- `'the Ill-Advised'` (flat)
- `'the Remarkably Average'` (duplicates the Medium cut)
- `'the Dazed'` (flat)
- `'the Occasionally Right'` (Cassandra owns this joke)
- `'the Self-Appointed'` (abstract)
- `'the Barely Adequate'` (duplicate of the Underqualified)
- `'the Pre-Owned'` (reads as a used-car joke with no soldier image)
- `'the Walking Shield Rack'` (crude silhouette gag, not a character)
- `'the Rumour'` (unclear)
- `'the Medium'` (no punchline)
- `'of the Tax Office'` (institution joke but flat; no soldier hook)
- `'the Meticulous'` (a plain adjective, not funny)
- `'the Tax Dodger'` (crime joke is stock)
- `'Wearer of the Slightly Wrong Helmet'` (too long for a name tag)
- `'Fear of Goats'` (ungrammatical and the goat is already honoured above)
- `'the Persistent Misunderstanding'` (abstract)
- `'Who Is Not a Poet'` (reads as setup without punchline)
- `'the Sparingly Cheerful'` (same joke shape as Quietly Terrified, weaker)
- `'Who Was Voted Into This'` (Chieftain text already owns the voting joke)
- `'the Uninsured'` (anachronism lands soft)
- `'the Prematurely Retired'` (dark)
- `'Keeper of the Spare Spear'` (nothing funny)
- `'Who Cannot Read the Map'` (duplicates 'Who Lost the Map')
- `'the Moderately Concerned'` (duplicates the flagship Mildly Concerned)
- `'Whose Horse Is Smarter'` (the horse joke is in the cavalry text)
- `'the Mostly Harmless'` (borrowed cadence, not ours)
- `'Who Is Still Looking for His Sandal'` (long; the sandal is a one-note image)

### tips.js (21 cuts)

- `H('ff_boulders', 'rules', 'Arrows only hurt friends when friendly fire is on. Boulders and meteors always do.')` (settings tooltip already explains friendly fire)
- `H('elephant_panic', 'counter', 'Three fire hits make an elephant panic and flee through its own army. Plan accordingly.')` (covered by fire_targets and the elephant joke)
- `H('zones', 'rules', 'Armies can only be placed inside your zone, unless you turn on free placement.')` (obvious; the placement UI already tells you)
- `H('testudo', 'tactics', 'Legionaries with four neighbours in testudo block extra arrows. Keep them packed.')` (duplicates phalanx hint; legionary text covers it)
- `H('follow', 'controls', 'Press F to follow a selected unit. Press Tab to hide the HUD for a clean screenshot.')` (controls overlay covers it)
- `H('powers', 'controls', 'Keys 1 to 6 cast god powers. Each has a cooldown, and Zeus will notice.')` (controls overlay covers it)
- `H('brushes', 'controls', 'Line brush for spearmen, scatter brush for chickens. Pick the brush that fits the unit.')` (hint is thin, and the joke is forced)
- `H('undo', 'controls', 'Placed a unit in the wrong spot? Ctrl+Z undoes it. History is not as forgiving.')` (a control hint every editor gives; weak joke)
- `H('orders', 'controls', 'Select a squad and press Hold or Advance. Soldiers do better when someone tells them what to do.')` ("Soldiers do better" is a tautology joke)
- `H('camera', 'controls', 'Hold the right mouse button to orbit, wheel to zoom, and WASD to pan. T gives top-down.')` (duplicates what the controls overlay (H) already says; weak value as a tip)
- `J('cav_spears', 'counter', 'If your cavalry is losing, check what is pointing at it. It is usually a spear.')` (duplicates spears_cav hint)
- `J('gladiator', 'units', 'Gladiators fight better when surrounded. Surround them with more enemies than they have fans.')` (reads as advice to do the opposite; muddled)
- `J('loading', 'meta', 'This is a loading screen. It is also an opportunity to count your drachmae.')` (describes the loading screen with no teaching and no turn)
- `J('zeus_timer', 'rules', 'Zeus intervenes after thirty seconds of stalemate. Start the fight before he does it for you.')` (duplicates the stalemate hint, which is funnier)
- `J('archers_cover', 'tactics', 'Columns block arrows. Hide behind one, and the archers will have a very quiet afternoon.')` (generic cover advice, joke lands softly)
- `J('terms', 'meta', 'The Terms of Conquest are laminated. Nothing in them is binding. Nothing in them is false either.')` (no gameplay content and not funny enough on its own)
- `J('tax', 'meta', 'Ancient armies run on logistics. Yours runs on a slider labelled Budget.')` (forced; budget tip already exists)
- `J('hounds', 'units', 'Warhounds grow stronger in packs. Keep them together and keep the sausages away.')` (sausage callback needs the lore to land; tip alone is flat)
- `J('chieftain_horn', 'units', 'The Chieftain blows his horn once per battle. Wait for the moment, not for the applause.')` (advice with no image)
- `J('minotaur', 'units', 'The Minotaur charges in a straight line. Step aside, then he forgets where he is.')` (the "forgets" claim is not in the rules)
- `J('xerxes_throne', 'units', 'Xerxes sits after four idle seconds and shouts Retreat when attacked. Plan around the cushion.')` (duplicates the units text codex line)

### achievements.js (19 cuts)

- `desc: 'Win a battle. The bleeding started without you, but you get the credit.'` (longer, loses the "we checked" deadpan)
- `desc: 'Win a Protect-the-Goat mission with the goat unharmed. It will not thank you. It is a goat.'` (longer; the unharmed-goat joke needs fewer words)
- `desc: 'Win while chickens do the killing: ten kills. Garnish with humility.'` (funny but the original names the serving suggestion more clearly)
- `desc: 'Kick 25 enemies in total. Each kick is eight units. That is a lot of travel.'` (explains a number instead of joking)
- `desc: 'Kick 25 enemies, lifetime. Your Spartans do not call it anything. They are busy.'` (longer, the doctors line is crisper)
- `desc: 'Kill five of your own in one battle. Caesar would have noticed.'` (Caesar hint explains the title instead of adding to it)
- `desc: 'Let an elephant trample 20 soldiers in one battle. The elephant calls it a stroll.'` (the first version is wordier for the same gag)
- `desc: 'Watch a Cyclops miss five throws. Total, not at once. He is trying.'` ("total, not at once" is a clarification that kills the rhythm)
- `desc: 'Win with only philosophers left standing. They would like to discuss what that means.'` (the new version has a sharper image (writing it up))
- `desc: 'Turn 15 soldiers to stone in one battle. Your garden is now complete.'` (Medusa's text already owns the garden joke)
- `desc: 'Win with 20 or more units and lose none. The shields are insufferable about it.'` (the new phrasing keeps the shields as characters without calling them insufferable)
- `desc: 'Win in under 30 seconds. History calls it a blitz. History calls it 2,400 years early.'` (over-explains the anachronism)
- `desc: 'Save an arena. It has no weather yet. Neither did Greece in an argument.'` (the second joke makes no sense)
- `desc: 'Save an arena. The grass has opinions about your terrain.'` (nothing behind the opinions)
- `desc: 'Fight on every arena. Fourteen places, no souvenirs, one tan.'` (the tan makes no sense on a battlefield)
- `desc: 'Finish the campaign. It is old, so are you, and we are very proud.'` (insults the player with no wit)
- `desc: 'Earn all 27 campaign stars. Please see a doctor, or a hobby.'` (all-27 phrase fits better in the new one, and 'seek help' was heavy-handed)
- `desc: 'Reach 1,000 kills lifetime. It has become a hobby, and we are not judging.'` (same joke, flatter)
- `desc: 'Get 20 kills in one battle in Take Command. The camera adores you. It is a camera.'` (longer; the camera punchline repeats)

### ui_text.js (20 cuts)

- `beacon: 'Anonymous diagnostics sent only to the game\'s owner when this page loads. Off by choice, on by default for debugging.'` (unclear; the beacon text needs the owner/UI agent's wording, and the wink fights the privacy tone)
- `settings: { label: 'Settings', sub: 'Make it prettier, or faster' }` (states the function with no wink)
- `credits: { label: 'Credits', sub: 'Everybody who helped, and some goats' }` (goats are the running gag, but this has no setup)
- `'Polishing helmets that nobody will see...'` (no turn)
- `'Counting drachmae twice...'` (flat)
- `'Bribing the weather...'` (no turn)
- `'Writing a plan Hannibal can improvise from...'` (long and obscure)
- `'Finding the other sandal...'` (stock lost-sandal gag)
- `'Reading Cassandra\'s warnings. Again...'` (Cassandra gag is better in the booth)
- `'Painting the pyramids a little more triangular...'` (nonsense without a hook)
- `'Filing the paperwork for the battle...'` (paperwork joke is spent elsewhere)
- `'Marching an army of loading bars...'` (describes the loading bar, not a joke)
- `'Mopping the Colosseum floor...'` (too tame, no turn)
- `'Inspecting the hay...'` (random)
- `'Polishing the crown of a king who is not coming...'` (obscure)
- `'Checking the horse for hoplites...'` (duplicate of the Trojan horse line)
- `'Waiting for the oracle to call back...'` (reads as an oracle-booking joke, not specific)
- `results: { title: 'Nothing to report', body: 'No stats were recorded for this battle. The booth was too busy.' }` (stat-less result cannot happen, and "booth was busy" explains nothing)
- `nameLong: { title: 'That name is too long', body: 'Arena names are limited to 32 characters. Even Alexander the Great was just Alexander.' }` (the joke is mine, but it duplicates the pattern of a few above and the fact is shaky)
- `'Wave of Mild Panic', 'The Ones With the Elephants', 'The Wait for the Real Wave', 'The Gift Shop Staff'` (only the second half of the joke exists)

### results_text.js (23 cuts)

- `'Heads removed from the debate'` (new weak)
- `'Your soldiers who will not be at dinner'` (mirrors the kills label)
- `'Hit points moved elsewhere'` (new weak)
- `'Colleagues reorganised'` (new weak)
- `'Chicken casualties inflicted'` (clumsy)
- `'Goat did all this'` (new weak)
- `'Calves sacrificed to the cause'` (new weak)
- `'Trampled, politely'` (flat)
- `'Soldiers who stopped moving for good'` (new, grim)
- `'Unplanned flights'` (new weak)
- `'Boulders aimed at the sun'` (new weak)
- `'Best streak of being busy'` (new weak)
- `'Shields that earned their keep'` (duplicate of the old line)
- `'Arrows launched at the sky and sometimes people'` (too long)
- `'Landscaping, delivered by air'` (new weak)
- `'Tactical walks'` (plain)
- `'Immortals exactly as immortal as advertised'` (too long)
- `'Commanders sent to the back'` (plain)
- `'Votes bought'` (new weak)
- `'Time wasted on glory'` (new weak)
- `'Surviving army value'` (dull)
- `'Unspent savings'` (plain)
- `quoteFallback: 'No comment.'` (not funny and the MVP quote fallback should come from units_text)

### mutators_text.js (7 cuts)

- `desc: 'Heads grow to twice their size. Hats must be very confident.'` ("very confident" has no image and ignores the crit change)
- `desc: 'Giant monsters shrink to soldier size. They are still furious, just easier to hug.'` (wrong: the mutator shrinks every unit, not only the giants)
- `desc: 'Everyone floats a little. Knockback is tripled, and landings are taken very seriously.'` (floating is not in the rule; the first version tells the truth)
- `desc: 'Sacred chickens fall from the sky now and then. Nobody ordered them. Everybody is pecked.'` (misses that the chickens help the losing side, which is the actual rule)
- `desc: 'Friendly fire is on for everyone. Your own archers are now a gamble.'` (plain, no surprise)
- `desc: 'Everyone is made of spaghetti.'` (random for its own sake, "spaghetti" is out of period and not about the mechanic)
- `desc: 'Armies shatter on contact. The armourers have gone on holiday.'` (no numbers or meaning; the mechanic is trade-offs, not breakage)

### scout_text.js (4 cuts)

- `who: 'cassandra', text: 'The cavalry will find the gap in your line. It is where the spears should be.' }` (poetic but gives no advice)
- `who: 'brutus', text: 'The archers are the juicy part of your army! Guard them, or the cavalry will have lunch!' }` (cartoon-hungry cavalry duplicates the Brutus main line)
- `who: 'plato', text: 'A fight is mostly decided before the swords meet. Have something to say from a distance.' }` (abstract; no counter named)
- `who: 'plato', text: 'Close ranks give strength against swords and none against stones. Is that not true of most things?' }` (aphorism with a vague moral, not the specific counter)

### credits_text.js (9 cuts)

- `role: 'Wine Consultant', name: 'Everyone, briefly' }` (weakest of the in-universe roles)
- `role: 'Throne Maintenance', name: 'Xerxes, from a seat' }` (Xerxes joke reused from the unit text)
- `role: 'Stirrup Research', name: 'Pending' }` (the stirrup joke belongs to the equites)
- `role: 'Director of Departments', name: 'Not found' }` (bureaucratic non-joke)
- `role: 'Head of Spears', name: 'Lengthy' }` (single-word gag, no image)
- `role: 'Assistant to the Assistant', name: 'Also an assistant' }` (stock office humour)
- `role: 'Colosseum Crowd', name: 'Ninety voxels, all enthusiastic' }` (describes a prop, not a joke)
- `role: 'Chief Hat Officer', name: 'The Peltast\'s fox' }` (obscure without the unit text)
- `role: 'Emergency Shields', name: 'Ordered in the wrong size' }` (no hook)

### campaign_text.js (19 cuts)

- `blurb: 'Persians have landed at Marathon. Please fight them in the field and not in the history books.'` (asks something, jokes about nothing)
- `P('And do tell the messenger it was not a marathon. It was merely far.')` (the messenger gag is stronger in victory/defeat; this line sits on top of Brutus's ending)
- `victory: P('Persia retreats. Athens survives. The messenger collapses.')` (the collapse repeats the messenger joke without adding a new angle)
- `id: 'half', text: 'Win with at least half your army still standing. Plato will count.' }` (the Plato-counts tail is a hedge)
- `blurb: 'Three hundred Spartans. A narrow pass. Four waves. One long afternoon.'` (a movie tagline, not our voice)
- `P('The pass is eight units wide. Eight. Is that a gate or a hallway?')` (the hallway gag is thin; the chokepoint tip already covers the fact)
- `B('Pyramids! Built by people who could not find a bigger triangle!')` (mocks the builders with no hook and no mechanic)
- `id: 'half', text: 'Win with at least half your army alive. The rest were doing their best.' }` (the rest were doing their best: soft)
- `P('Every river has a ford, and every ford has a goat. This is the law.')` (an invented law does not land)
- `victory: B('NOT the elephants! They had mittens on order!')` (the mittens joke does not connect to anything on screen)
- `C('It will snow. Then it will snow more. Then you will say you were not warned.')` (generic doom line any mission could use)
- `victory: B('NOT the elephants! They had mittens on order!')` (the mittens joke does not connect to anything on screen)
- `P('Politeness is the sharpest weapon in the forest.')` (a slogan, not a joke)
- `id: 'half', text: 'Win with at least half your army alive. Hide better, next time.' }` (advice-as-joke, no image)
- `B('This is the longest unboxing in history! Somebody check for receipts!')` (unboxing is a modern meme that ages fast)
- `C('He is lonely. Be gentle. Then be violent.')` (tonal wobble; the Cyclops is a boss, and the blurb already makes him sympathetic)
- `id: 'half', text: 'Win with at least half your army alive. The goats stay out of the count.' }` (the goats gag has no setup here)
- `P('Four waves. Four temperaments. One god who cannot be reasoned with.')` (neutral exposition with no turn)
- `id: 'half', text: 'Win with at least half your army alive. Zeus took the rest in the settlement.' }` (settlement is a legal joke with no payoff)

## 6. Notes for the comedy editor (where I would cut next)

- **Cassandra's "I said" tell**: 27 of her 83 templates still lean on "I said/I told"; I cut it from 13 lines because it had reached 46%. If it still grates, trim more; her other tells ("As foretold", "Nobody listens") are used 5 and 10 times.
- **Plato's question endings**: 26 of 70 Plato lines end in a question (the voice-sheet tell). The weakest are the abstract ones ("Is size merely...", "Is a record an achievement...").
- **Running-gag density**: Terms of Conquest clauses (2, 3, 7, 9, 12) and sponsors (Pompeii Pizza, Corinth Column, Athenian Olive Oil, Delphi Insurance) recur by design; if they feel heavy, drop `battle_start_terms` and `comeback_clause` first.
- **Contrived verbs**: the `by` kill verbs for environment causes (lava, drown, spikes, geyser, fall) are forced by the "killer + hazard" frame; the `solo` phrases are the real jokes there.
- **Campaign text** is the least edited file (briefings are 4 lines each and carry the star hints); missions 7 to 9 are the weakest.
- **UI micro-copy**: tooltips for settings are plain-first; jokes are sparse on purpose. Error bodies never joke; at most one optional `joke` per error and the UI shows one per screen.
- **Cut-ratio shortfalls**: campaign 14%, scout 13%, results 23%, UI 27% (section 2).

## 7. Limits and honesty

- Nothing here was exercised in the real game: the sim feeds synthetic event logs that follow spec 8.2. Payload semantics I had to assume (`big_swing.team` is the gaining side; `lead_change.team` the new leader; `battle_end.perDef` alive counts) are written in `docs/lifetime_stats.md` section 4.
- TTS is untouched (default off per audio.md); the announcer returns `dur` for display time.
- Priority numbers in spec 3 are line quotas (the "(6)" after a category), not priorities; priorities are mine and live in `CATEGORY_PRIORITY`.
- Achievements and the announcer depend on COORD's `save/stats.js` following `docs/lifetime_stats.md`; until it exists the tests use fixtures.
