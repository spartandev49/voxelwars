# spec/humor.md — Comedy bible, announcers, copy quotas, systemic gags (owner HUMOR)

## 1. Tone rules
- Joke at: institutions, bureaucracy, myth, military absurdity, battlefield physics, game UI, the player's questionable tactics, the soldiers' regrets, anachronisms (a Roman complaining about taxes while being hit by a boulder).
- NEVER joke at: ethnicity, religion (as belief), nationality stereotypes, real tragedies, slurs. The "barbarians" are a faction name; the joke is that they are very polite/well-organised/surprisingly into pottery, not that they are savages. Persians/Egyptians/Carthaginians are as competent and as silly as everyone else. Gore stays cartoon (confetti, wine, puffs).
- Specific beats generic. Surprise beats puns. Short beats long (bubbles <= 12 words, announcer lines <= 22 words, tips <= 18 words). No "LOL random". No meme references that age. No fourth-wall overload; one wink per screen at most.
- Running gags (callbacks across systems): (1) the goat is always the real hero; (2) Cassandra is always right and always ignored; (3) Plato keeps trying to define "battle" and gets interrupted; (4) Brutus's fake sponsors ("brought to you by Pompeii Pizza — now with 20% more ash"); (5) a laminated "Terms of Conquest"; (6) someone, somewhere, is "just here for the free grapes"; (7) the Immortals are not; (8) Zeus has a bad day.

## 2. Voice sheets
- **Brutus Maximus** (play-by-play): bombastic, always at 11, mangles Greek names ("Sparta-cus!"), adores a good flank, tragic over a lost shield, sponsor reads. Tags: `hype`, `sponsor`. Tell: ALL CAPS on one word per line.
- **Plato the Dry** (colour): deadpan philosopher, asks rhetorical questions, footnotes violence as metaphysics ("Is the shield defending the man or the man the shield?"), undercuts Brutus in 6 words. Tell: ends lines with a question or a measured understatement.
- **Cassandra** (analyst): weary prophetess; her predictions are correct and ignored; speaks in short flat sentences, past-tense "I said." Tell: "As foretold." / "Nobody listens." Triggers off `big_swing`, `army_low`, `lead_change`, `stalemate_warning` (she states the prediction *after* the fact: "I said the left flank would fold. Twice.").

## 3. Announcer system (src/content/era_ancient/humor/announcer.js + src/ui/hud/announcer.js)
Line = `{id, cat, who:'brutus|plato|cassandra', text, cond?:{def?, faction?, minCount?, team?}, chain?:[lineId...], weight:1, once?:boolean}`; templating `{unit}` `{unit2}` `{team}` `{n}` `{faction}` `{killer}` `{arena}`.
Categories (>= 90 sharp lines total, >= 3 per category unless noted; priority 1-5): `battle_start(6)`, `first_blood(6)`, `kill_streak(5)`, `hero_down(6)`, `friendly_fire(6)`, `rout(5)`, `charge(4)`, `brace(4)`, `volley(4)`, `boulder(5)`, `chicken(6)`, `goat(4)`, `philosopher(4)`, `senator(4)`, `trojan(4)`, `medusa(4)`, `elephant(4)`, `lead_change(5)`, `comeback(4)`, `stalemate(5)`, `zeus(5)`, `victory(6)`, `defeat(6)`, `timeout(3)`, `mass_death(4)`, `prop_destroyed(4)`, `god_power(5)`, `idle_filler(8)`, `campaign_*` (per mission 3 each).
Selection rules: global min gap 3.5 s (1.5 s for priority 5), average one line per 8 s; per-category cooldown 20 s (45 s for filler); recency memory of the last 14 line ids (never repeat) and per-battle `once` lines; per-announcer alternation (the same voice never speaks twice in a row unless chain); chains play as a 2-3 beat exchange with a 1.1 s beat; at speed > 2x only priority >= 4 lines; subtitles (always on unless disabled); optional TTS per audio.md. A Node script `tools/humor-sim.mjs` replays recorded event logs for 20 simulated minutes and reports repetition rates (target: < 8% repeat within 5 minutes; every category used; no announcer > 45% of lines).

## 4. Other copy quotas (all pass the rubric)
- **Unit text** for all 43 units (see units.md): `blurb` (<= 14 words, the codex card), `lore` (<= 35 words, deadpan history), `deaths[3+]` (<= 12 words each, last words, shown as bubbles at low frequency: max 1 bubble per 1.2 s globally, hero/boss always), `taunts[2+]`, `codexJoke` (the stat-block footnote).
- **Loading tips** (40): half real gameplay hints (counters, controls), half jokes that also teach.
- **Achievements** (24): below. Each has `id, name, desc (funny), icon, test(stats)`.
- **Campaign**: per mission `blurb`, `briefing[3-5 lines with the three voices]`, `victory`, `defeat`, star descriptions, titles.
- **Name generator**: titles (`Sir`, `Dame`, `Lord`, `Lady`, `Citizen`, `Admiral`, `Doctor`, `Probably`), first names (Latin/Greek/Egyptian/Persian/Celtic mixes), epithets ("the Mildly Concerned", "of the Second Lunch", "Who Forgot His Shield", "the Unbothered", "Slayer of Chickens (Allegedly)", ...) >= 60 epithets.
- **Setting/quality/label jokes**: graphics names Potato/Papyrus/Marble/Olympian; "Corpses: Stay / Fade / Pretend They're Napping"; gore style labels; difficulty "Easy: Peasant Mode / Normal: Citizen / Hard: Consul"; "Rematch" button "Again, but smarter".
- **Kill-feed verbs** (per cause): "bonked", "perforated", "yeeted", "philosophised at", "gored", "trampled", "mildly inconvenienced", "turned to stone", "tax-audited", ...

## 5. Achievements (24)
`first_victory` "First Blood (Technically Second)" win a battle; `goat_herder` "Goat Herder" win protect_vip with goat unhurt; `chicken_dinner` "Winner Winner Chicken Dinner" chickens kill >= 10 in a won battle; `sparta` "THIS IS... A LOT OF KICKS" 25 kicks lifetime; `et_tu` "Et Tu, Brute?" kill 5 allies in one battle; `trunk_show` "Trunk Show" elephant tramples 20 in one battle; `depth_perception` "Depth Perception Optional" cyclops misses 5 throws; `cogito` "Cogito, Ergo Won" win with only philosophers alive; `not_so_immortal` "Not So Immortal" kill a revived immortal; `gift_shop` "Gift Shop Manager" trojan reveal then win; `stone_cold` "Stone Cold" stone 15 in one battle; `dino_retirement` "Dinosaur Retirement Plan" 30 kills with one meteor; `tipsy` "Wine Not?" win during Wine Rain; `perfect_phalanx` "Perfect Phalanx" win losing no unit (>= 20 units); `underpaid` "Underpaid, Overperforming" win vs 5x cost; `blitz` "Blitzkrieg (Anachronistic)" win < 30 s; `zeus_left` "Zeus Has Left The Chat" trigger ragequit; `landscaper` "Landscaper" save an arena; `soldier_smith` "Soldier Smith" save a custom soldier; `tourist` "Tourist Trap" fight on all arenas; `ancient_history` "Ancient History" finish campaign; `overachiever` "Overachiever" 27 stars; `body_count` "Body Count Is Not A Hobby" 1000 lifetime kills; `main_character` "Main Character Energy" 20 kills in Take Command.

## 6. Systemic gags (>= 10; each = sim rule + clip + sound + announcer hook; listed with owners)
1. **Sacred Chicken tantrum** (sim: `tantrum`; clip: ruffle + flap; sound: `chicken_rage`; announcer `chicken`).
2. **Philosopher monologue** (cc_field confuse; speech bubble lines about the meaning of swords; announcer `philosopher`).
3. **Senator filibuster** (cc_field sleep: Zzz bubbles; "bribe" converts an enemy briefly; announcer `senator`).
4. **Trojan Horse reveal** (summon_on_death/reach; hatch opens, 6 hoplites tumble out; stinger).
5. **Battle Goat charge** (dash; ragdoll-ish knockback with comedic "baaah"; announcer `goat`).
6. **Medusa gaze** (units turn into grey stone voxels; shatter on kill; announcer `medusa`).
7. **Catapult misfire** (4%: launches a crew member; flailing arms clip; announcer `boulder`).
8. **Zeus ragequit** (stalemate watchdog: lightning, then Zeus storms off, sky flashes, "draw").
9. **Wine rain** (tipsy sway, hiccup particles, confetti, damage x0.6).
10. **Spartan kick** ("THIS IS SPARTA" echo; the victim flies 8 u with a spin clip and lands in a heap).
11. **Immortals aren't** (revive once; Plato: "Ten thousand. Give or take ten thousand.").
12. **Xerxes' throne** (sits to watch, shouts "Retreat!" if attacked).
13. **Cyclops depth perception** (misaimed boulders; he looks confused; announcer).
14. **Elephant panics at fire** (flees through own lines, trampling allies; announcer `elephant`).

## 7. Editor rubric (every line is graded; rewrite or delete below 3/4)
1. Is it specific to this unit/moment? 2. Does it surprise? 3. Is it short enough to read in 2 seconds? 4. Could it be funnier by cutting a word? Delete anything that is only "random". Cut at least 30% of first-draft lines. Run the sensitivity sweep (no ethnic/religious punchlines) before final.
