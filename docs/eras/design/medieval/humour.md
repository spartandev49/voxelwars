# Medieval humour bible (binding for COMEDY-MED and the COMEDY-EDITOR)

Owner: DESIGN-ERA-MEDIEVAL part 2. Companion files: `feel_sheet.md` s7 (engines named there), `rosters.md` (unit jokes, bark roles), `missions_outline.md` (briefings, set-piece lines, star text, rewards), `god_powers.md` (tooltips and the intern gag). The Ancient bureaucratic understatement is NOT primary here: this era's comedy is stagecraft, rules enforced with loud sincerity, and heavy things arriving late.

Voices (unchanged across eras, spec/humor.md s2): **Brutus** (play-by-play; bombastic; one ALL-CAPS word per line; the HUZZAH gag), **Plato** (colour; rhetorical questions; undercuts Brutus in six words; ends on a question or a measured understatement), **Cassandra** (analyst; short flat sentences; "I said"; right and ignored). The commentators have been dragged through time by Zeus's intern, who stays offstage.

Tone law: jokes punch at situations, hubris, equipment, paperwork, hats, horses, spoons and the three commentators; never at people. Deaths are comic: no pleading, no family, no pain. "Plague" and "abbey" are setting only (a sneeze and a sit-down).

## 1. Three comedic engines

### E1 The Pageant Goes Wrong (stage management: cues, props, understudies, the interval, the programme)

Rules: (1) the war is a production and everything that goes wrong is logistical, never cruel; (2) Brutus is front of house and treats every disaster as a feature, Plato asks whether the script or the stage is real, Cassandra has read the running order; (3) one stage-management image per line, no theatre-jargon pile; (4) crowd props react (ooh, aww, gasp, pie sellers); (5) the failure is a missed cue, a wrong prop or an understudy, not a death.

1. [B, battle_start] "WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war! We are skipping to the THIRD!"
2. [B, charge] "CHARGE! The bugle said wait! The horses said NO!"
3. [P, stalemate] "Both armies have stopped. Is that an interval, or has the cast gone on strike?"
4. [C, battle_start] "The programme says 'mock combat'. The programme was printed before the swap. I kept a copy."
5. [B, first_blood] "FIRST BLOOD! Also first interval! The grandstand is selling PIES!"
6. [B, hero_down] "SER VALIANT IS DOWN! His understudy is a hay bale, and it is doing FINE!"
7. [P, rout] "The cast has left the stage in a hurry. Is that an exit, or a review?"
8. [C, prop_destroyed grandstand] "The grandstand will collapse in the second act. It is the second act."
9. [B, kill_streak] "FIVE in a row! That is a standing ovation, and the ovation is also STANDING in the way!"
10. [P, victory] "The final scene went as planned. Nobody had planned it. Is that direction, or luck in costume?"

### E2 The Rule Book Taken Literally (chivalry, oaths, precedence, tolls, contracts; sincere and loud, never deadpan memo-speak)

Rules: (1) a rule is enforced with enthusiasm and hubris, to the letter and past the point (that is the difference from Ancient's silent form-filing); (2) titles are absurdly long and the horses are small; (3) soldiers and commentators find the loophole and are proud of it; (4) the target is the rule book and the cleverness of the loophole, never any real code, faith or order; (5) Plato leads, Brutus mangles the titles, Cassandra quotes the rule number.

1. [P, battle_start] "The contract says to the death. Of whom? The clause is silent. The clause is usually silent."
2. [P, battle_start] "Ser Valiant will not strike a kneeling man. The man, aware of this, has been kneeling since Tuesday."
3. [B, hero_enters] "SIR Wobbleton, Second Chair of the Stool, Keeper of the Lesser Pennant! Big name! Small horse!"
4. [C, stalemate] "Rule 114: no attacking until the herald has finished reading. The herald has found a second scroll."
5. [sellsword, death] "I swore to hold the line. Nobody said which line. I picked a short one."
6. [pikeman, taunt] "My oath says forty days. This is day forty. Please hurry."
7. [reeve, death] "I declare myself dead, pending review."
8. [P, rout] "He has fulfilled the contract to the letter and left by the letter. Is that cowardice, or typography?"
9. [B, retreat] "HUZZAH! ...was that a retreat? It looked like a retreat. Also HUZZAH."
10. [knight_afoot, taunt] "I was mounted when I signed this. The horse is not bound."

### E3 Heavy Things Arrive Late (weight, mud, siege logistics, bad news by pigeon, Cassandra's plague)

Rules: (1) heavy things (knights, engines, boulders, ladders, counterweights) arrive after the moment they were needed, or fall over slowly; (2) news travels by pigeon and the pigeon is missing; (3) Cassandra predicts and, this era, is for once right and does not enjoy it; (4) numbers are small and specific (eleven seconds, day nine, eight weeks); (5) wave names, lessons and Cassandra's lines carry this engine.

1. [C, stalemate] "The siege is on schedule. The schedule is eight weeks. You have four minutes. Nobody told the schedule."
2. [C, misfire] "The counterweight was back-ordered. A smaller counterweight was substituted. Observe the substitution."
3. [P, oil] "The oil is delayed in transit. It is the only thing in this siege behaving as intended."
4. [B, dragon] "A DRAGON! The pigeon was supposed to warn us! The pigeon has not been seen since Tuesday!"
5. [P, knight falls] "A knight in plate falls over. It takes eleven seconds. The suspense is the sentence."
6. [C, plague] "Plague. I said plague. Tuesday. It is Thursday. I take no pleasure in it. A small pleasure."
7. [B, siege day] "DAY NINE of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH!"
8. [C, results lesson] "Messages sent: three. Pigeons arrived: none. The battle was lost on information."
9. [P, trebuchet] "Leverage in the physical sense is simple. In the commercial sense it is how we got here."
10. [B, ram arrives] "The ram has arrived LATE! The wall has been waiting, and it is a little disappointed!"

### 1.1 Running gags (cooldowns so none overstays)

| gag | rule | cooldown |
|---|---|---|
| Brutus's tabard | says KING (later: gains a feather, a sponsor patch, is traded for a pigeon); at most one tabard line per battle | 1 per battle |
| Brutus's HUZZAH at the wrong moment | the line ends in HUZZAH; fired after retreats and falls | cd 480 s, max 3 per battle; lifetime stat `huzzahs` counts them (`huzzahs >= 11` unlocks a gated callback) |
| Plato: is a feudal contract a dialogue? | asked in setup-free form, answered in gated form later | 1 per battle |
| Cassandra predicts the plague and is for once right | arrives in M6 | persistent callback, cd 480 s |
| Dennis and Wilfred (the pageant dragon) | front half Wilfred, back half Dennis; Dennis has notes | unit text, codex, M7 and M9 |
| The spoon | the dragon's hoard is missing a spoon; the gilded spoon is the last reward | hoardling, coin_golem, cinderwyrm texts; M9 |
| The pigeon | bad news by pigeon; it is missing; it returns (gated) | wave names, lessons, M7 callback |
| The dragon-insurance sponsor ("Perpetual Mutual: cover for everything except dragons") | a Brutus sponsor read from M3, withdrawn in M8 | 1 per battle |

## 2. Per-surface style guides

Every guide gives the rule, the limit, a good example and one thing to avoid. Limits match spec/humor.md (bubbles <= 12 words, announcer <= 22 words, tips <= 18 words).

| surface | rule | limit | example | avoid |
|---|---|---|---|---|
| **unit blurb** (codex, hover) | what the unit DOES in the rules, then one joke that names the mechanic; present tense | <= 14 words | Pikeman: "Holds a fourteen-foot pole perfectly still and calls it a career." (names brace) | adjectives with no mechanic ("brave, noble") |
| **unit lore** (codex) | the faction joke, one real number allowed | <= 35 words | Gatehouse: "Eleven castles agreed to defend each other and then each locked its gate to see how the others would cope." | real places, real orders |
| **death line** (last words) | 3 or more per unit; paperwork, hubris, equipment, hats, horses, spoons; the unit never begs | <= 12 words | Knight errant: "Ahem." (then stands up) / Squire: "Somebody tell the knight his lunch is safe." | pleading, family, pain, "tell my wife" |
| **taunt** | an in-character brag or complaint, 2 or more | <= 10 words | Pikeman: "My oath says forty days. This is day forty." | insults aimed at the player's real traits |
| **announcer line** | one beat, caps on exactly one word for Brutus; slots allowed ({unit}, {n}, {arena}); once-per-battle where it is a set piece | <= 22 words | [P] "A crater is a decision that is too late to reverse." | meta jokes about the interface; two jokes in one line |
| **tip** | half true hints (counters, controls, rules), half jokes that also teach; every claim must be true of the rules at tuning | <= 18 words | "Pikemen brace only while standing still. Keep them on Hold, points toward the horses." | numbers that BALANCE may change (use only design-stable ones) |
| **briefing line** | three voices, one line each; Brutus names the setting, Plato asks, Cassandra warns | <= 30 words | see `missions_outline.md` | spoilers for the star condition |
| **results lesson** (Cassandra) | a true statement of what happened, with {n}; the fix is a plain second line | <= 20 words + fix <= 14 | "Our pikes took {n} charges head-on. I said horses are bad at poles." / fix: "Keep doing that. Poles forward, standing still." | claims that can be false (padding lessons never print {n}) |
| **kill verb** | transitive phrase that takes the victim; 6 or more per cause; environmental causes also get 3 `solo` phrases | 1 to 4 words | charge: "lanced", "ran down" | gore; anything that sounds painful |
| **wave name** | a social event or nuisance, plural or "of", Title Case, no jokes about real people | <= 5 words | "The Sheep Went That Way" | the Ancient names (The Tax Collectors, Eleven Uncles) |
| **loading line** | present participle ending in "...", an offstage task for a ridiculous object | <= 10 words | "Teaching the hedgehog to hold still..." | full sentences, questions |

### 2.1 Kill verbs for the new causes (6 `by` verbs each; `solo` where environmental)

| cause (`unit_kill.cause`) | by | solo |
|---|---|---|
| `charge` (lance or charge-boosted hit) | lanced, ran down, couched at, introduced a lance to, tilted at, rode over | |
| `bolt` (ap >= .5 ranged) | bolted, perforated politely, stapled, punctured the paperwork of, drilled, reasoned with | |
| `boulder` (trebuchet, Lady) | leveraged, counterweighted, dropped a point on, flattened, delivered a verdict to, re-landscaped | "was in the crater's way" |
| `fire` (pitch, oil, thatch, breath) | toasted, kindled, flambeed, singed the plans of, made a warm point to, lit up | "stood in the thatch", "fell for the oil", "took the hay route" |
| `poison` (flask, gas) | dosed, tonic-ed, sneezed at, medicated, put to bed, seasoned | "sat down in the green" |
| `bell` (stun then kill) | tolled, rang for, gave notice to, dinged, belled, called time on | |
| `breath` (Cinderwyrm) | invoiced, scorched with feeling, claimed against, dragon-insured, cleared the stalls of, warmed | |
| `gate` / `crush` (ram, keep slam, collapse) | knocked on, closed the account of, re-hung on, crumpled the case of, answered the door on, signed for | "was behind the gate" |

## 3. The time-travel arc

### 3.1 Arrival card (first entry, skippable; own key `seen.arrival.medieval`)

"MEDIEVAL. Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' by his sticky note. Brutus has acquired a tabard. Plato has acquired questions. Cassandra has acquired a cold and a bad feeling about the buffet."

Footer, gated on the Ancient campaign being finished (`cb.ancient_done`): "Zeus's intern said two minutes. That was four centuries ago." Chooser caption: "MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'." Button: "Begin the Pageant".

### 3.2 Progression lines, one per mission (results-card footer or next-briefing tag, [voice])

| mission | progression beat | line |
|---|---|---|
| M1 `med_dress_rehearsal` | the booth is hay bales; Brutus's tabard says KING | [B] "My tabard says I'M WITH THE KING. I have not asked which king." |
| M2 `med_tourney_trouble` | the tabard gains a feather; Plato first asks about contracts | [P] "A feudal contract: one party speaks, the other kneels. Is that a dialogue?" |
| M3 `med_ford_dithering` | the first sponsor read | [B] "Brought to you by Perpetual Mutual: dragon cover for everything except DRAGONS!" |
| M4 `med_mizzlemoor_beacons` | Brutus's HUZZAH lands at the right moment once | [P] "Brutus has shouted huzzah at the correct moment. I am unsettled. Is the world well?" |
| M5 `med_castle_dour` | the contract question is answered | [P] "I have read the contract. It is a monologue with witnesses." |
| M6 `med_bell_tolls_lunch` | the plague arrives and is acknowledged | [B] "CASSANDRA WAS RIGHT? I have sent a pie. It is a good pie." [C] "I do not want the pie." |
| M7 `med_pennywhistle_blaze` | the tabard is traded for a pigeon; Dennis | [B] "I traded the tabard for a PIGEON! The pigeon is a better listener!" |
| M8 `med_toll_bridge` | the sponsor withdraws | [B] "Our sponsor has withdrawn. They cited the dragon. They have not yet SEEN the dragon." |
| M9 `med_grand_pageant` | the dragon; Cassandra retires from being right; Plato signs | [C] "I am retiring from prophecy. It is too accurate." [P] "A dialogue needs two parties. I am now both." |

### 3.3 Finale payoff (era-independent surfaces, because the Ancient finale is frozen)

Fires once, when `medieval_complete` is set by the M9 reward.

1. **Credits** gain a line: "Cassandra: Chief Prophet (Now Verified)". Credits tail: "Plague: predicted. Dragon: predicted. Tabard: never predicted. Cassandra regrets nothing, except the tabard."
2. **Stats screen** shows a new tile in the Medieval section: "Predictions confirmed: 1".
3. **"Medieval cleared" card** (shown once after the M9 results, reopenable from the chooser card): a wax-seal stamp PAGEANT COMPLETE and the sticky note found under the gilded spoon: "Wrong century? Try the one with the engines. They will love it. - Intern". This hands the baton to the Modern era (and is the only place the intern's handwriting appears; still no portrait).
4. **Time Passport** (the shared "all eras cleared" card) stamps a groat for Medieval.

## 4. Callback ledger seed (>= 12 for this era; 15 given)

Type `setup-free` = funny cold, funnier warm; `gated` = renders only if its flag shows the source was seen. Every gated line has exactly one boolean flag, `cb.<id>`, set when the source line rendered (or the stated stat is met). Setup-free lines must pass the context-free comprehension check. Cross-era targets (Modern, Sci-Fi) are marked X.

| id | source (setup-free, surface) | target (gated, voice, surface) | type | gate flag |
|---|---|---|---|---|
| `med_tabard` | [B] battle_start: "My tabard says I'M WITH THE KING. I have not asked which king." | [B] "The tabard survived the rehearsal. The rehearsal did not survive the tabard." | gated | `cb.med_tabard` |
| `med_stool` | [P] banter: "The kingdom is ruled from a stool. The stool has not commented." | [C] "The stool sat in the stands. Nothing hit it. Yet." | gated | `cb.med_stool` |
| `med_huzzah` | [B] retreat: "HUZZAH! ...was that a retreat? It looked like a retreat." | [P] "Brutus has said huzzah eleven times. Three were correct. I counted for the record." | gated | stat `huzzahs >= 11` |
| `med_contract` | [P] "A feudal contract: one party speaks, the other kneels. Is that a dialogue?" | [P] "I have read it. It is a monologue with witnesses." (X: Modern "In the Middle Ages a contract was a monologue. Today it is a form.") | gated | `cb.med_contract` |
| `med_plague` | [C] "Something is coming that smells of onions and doom." | [C] "I predicted a plague once. It was green. Nobody apologised. Brutus sent a pie." (X: Modern, Sci-Fi) | gated | `cb.med_plague` (set by the M6 set-piece) |
| `med_spoon` | hoardling and coin_golem codex: "A spoon is missing from the hoard." | [B] M9 end: "THE SPOON! Will someone RETURN the spoon!" | gated | `cb.med_spoon` |
| `med_dennis` | pageant_dragon codex: "Front half Wilfred, back half Dennis. Dennis has notes." | [C] M9 set-piece: "That is not Dennis." | gated | `cb.med_dennis` (set when the codex page opens or M7 is won) |
| `med_intern` | arrival card footer: "Zeus's intern said two minutes. That was four centuries ago." | [P] chooser, post-clear: "Last time he asked for lightning. This time he brought a pageant." (X) | gated | `cb.ancient_done` |
| `med_goat` | [B] battle_start (setup-free): "Where is the goat? Somebody fetch the goat." | [P] "The goat stayed in the Ancient era. He is fine. He is always fine." (X) | gated | `cb.ancient_done` |
| `med_sponsor` | [B] sponsor read: "Perpetual Mutual: dragon cover for everything except dragons!" | [B] "Our sponsor has withdrawn. They cited the dragon." | gated | `cb.med_sponsor` |
| `med_soup` | god-power tooltip: "Soup Cart of Plenty. The soup is, medically speaking, soup." | [C] victory: "Soup was served. It recovered nothing. Morale, however, was restored." | gated | stat `godPowers.med_soup_cart >= 1` |
| `med_pigeon` | [B] dragon line: "The pigeon was supposed to warn us!" | [B] "THE PIGEON! It has returned with news from Tuesday!" | gated | `cb.med_pigeon` (set after M7) |
| `med_hedge` | yeomen lore: "The hedge has never lost a battle, mostly because it has never moved." | [P] "The Yeomen's hedge has been out-flanked by a fire. It declines to move." | gated | `cb.med_hedge` (set after M7) |
| `med_snail` | loading-screen marginalia: a snail wins an argument with a knight (art, no text) | [B] battle_start: "THE SNAIL! It has won AGAIN, and in the last mission, and in the one before!" | gated | UI counter `loadingSnail >= 3` |
| `med_plume` | M2 defeat: "His plume was bigger than your plan. I mentioned the plume." | [C] M9 briefing tail: "Ser Valiant's plume is on the hoard. The dragon wears it badly." | gated | `cb.med_plume` |

## 5. Loading lines (20)

1. "Polishing the tournament lances..."
2. "Teaching the herald to read the room..."
3. "Re-attaching the drawbridge..."
4. "Counting groats. Twice. Different totals..."
5. "Asking Plato if the contract is a dialogue..."
6. "Explaining the plague to Brutus. He said boring..."
7. "Waking the dragon. It filed a complaint..."
8. "Back-ordering the oil..."
9. "Ironing the bunting..."
10. "Ringing for lunch, for danger, and for lunch during danger..."
11. "Teaching the hedgehog to hold still..."
12. "Fitting Dennis into the back half..."
13. "Stuffing the dragon costume. Wilfred is in. Dennis is negotiating..."
14. "Looking for the third leg of the stool..."
15. "Sending a pigeon. It went the other way..."
16. "Tightening the trebuchet. It is mostly counterweight..."
17. "Checking the moat for moat..."
18. "Sharpening the pikes to a reasonable point..."
19. "Asking Cassandra how this goes. She mentioned a pie..."
20. "Rehearsing the siege. It ran long..."

## 6. Wave names (20) and boss names (5)

Wave names (Survival; index by (wave - 1) mod 20; none repeats an Ancient wave name):

1. The Parish Council (Armed)  2. A Wedding Party, Unconvinced  3. The Lord's Nephews  4. Delegation From The Next Village  5. The Sheep Went That Way  6. Minstrels, Armed  7. The Guild Of Tiny Hats  8. Mildly Offended Barons  9. The Mud Delegation  10. A Fete Gone Wrong  11. The Archery Club Outing  12. Pie Thieves  13. A Very Long Procession  14. Mismatched Armour Day  15. Heralds, Heralds, Heralds  16. Reinforcements (Unapproved)  17. The Wrong Cue  18. Late Harvest, Early Arrows  19. The Subsidy Is Late  20. The Final Demand (Third Reminder)

Boss names (cycle in `boss_table.md` order; waves 5, 10, 15, 20, 25, then repeat):

| wave | unit | name |
|---|---|---|
| 5 | `great_hog` | Wave {n}: Best In Show |
| 10 | `bridge_troll` | Wave {n}: Toll Free (Not) |
| 15 | `lady_counterweight` | Wave {n}: Leverage Buyout |
| 20 | `rolling_keep` | Wave {n}: Mobile Home |
| 25 | `cinderwyrm` | Wave {n}: Dragon Insurance Claim |

## 7. Tips (12: six hints, six jokes that also teach)

Tips contain no balance numbers; BALANCE re-verifies the claims at tuning.

Hints:
1. `tip_brace` (counter): "Pikemen brace only while standing still. Keep them on Hold, points toward the horses."
2. `tip_banner` (morale): "Standard bearers and heroes carry banners. Drop one and the men under it flinch and run."
3. `tip_xbow` (counter): "Crossbow bolts pierce plate; arrows do not. A crossbowman is helpless while it reloads."
4. `tip_gate` (siege): "Gates belong to their defenders. Rams and boulders break them; arrows barely scratch them."
5. `tip_fire` (counter): "Thatch, hay and wooden engines burn. Cobble does not. Rain puts fire out."
6. `tip_air` (counter): "Only crossbows, longbows and springalds can hit what flies. Bring some for wyverns and dragons."

Jokes that also teach:
7. `tip_net` (counter): "Poachers net horses. The horse takes it personally and stands still."
8. `tip_healer` (support): "Physicians heal flesh, not wood. Poison stops the healing; do not stand in your own cloud."
9. `tip_trebuchet` (siege): "A trebuchet cannot hit anything close. Put a pavise in front and let it think."
10. `tip_bearer` (morale): "Standard bearers are cheap, loud and first to die. That is also their job description."
11. `tip_dragon` (units): "A pageant dragon has two men inside. Neither is paid for the fire panic."
12. `tip_unhorse` (charge): "Kill a knight's horse and he gets up. He is cross, but he is shorter."

## 8. Scout-code texts (per `sim/armygen.js scoutReport` codes; new codes marked NEW need SIM to add the detector)

Shape per code: default `{who, text}` plus variants in the other voices. Advice is true of the rules (pikes standing still stop charges; cavalry catches archers; bolts pierce plate; fire beats wood; only bows, bolts and springalds hit air).

| code | default | variants |
|---|---|---|
| `no_anti_cav` | [C] "They have horses and you have almost no pikes. Pikes standing still stop a charge, so add some and keep them on Hold." | [B] "HORSES incoming and not a pole in sight! Pikes planted in the ground make a charge think twice. So should you." [P] "A horse will not run onto a pole it can see. Is that wisdom or only sense? Either way, bring pikes." |
| `exposed_archers` | [B] "Your bows are in the open and they have cavalry! Put pikes in front and keep the bows behind them!" | [P] "Archers are brave only at a distance. Put pikemen between them and the horses, and the distance will hold." [C] "Horses reach archers faster than archers reach horses. Pikes in front fix that." |
| `no_ranged` | [P] "You have no ranged units and this enemy has few boards to hide behind. Bows and bolts hurt anyone out in the open." | [B] "Not a BOW in the army! They will walk up and shake your hand, then the rest of you!" [C] "Nothing in your army can reach anyone. I wrote that down at the start." |
| `no_cavalry` | [C] "They have shooters and crews, and you have no horses. Cavalry reaches archers before archers reach a decision." | [B] "Their bows are lonely! Send HORSES and say hello!" [P] "A shooter is only brave at a distance. Who closes the distance for you?" |
| `siege_exposed` | [B] "Their engines stand alone! Cavalry catches crews before the crews finish winding up!" | [P] "A trebuchet cannot see what stands beside it. Is that blindness or confidence?" [C] "The crews have no guard. They will not keep it for long." |
| `blob_vs_ranged` | [P] "Your soldiers stand in one block and they have bows, bolts and boulders. Is a block a wall, or a target?" | [C] "One block. Three kinds of things that hit blocks. I counted." [B] "BIG BLOCK! Big target! Spread the army, or it will spread for you!" |
| `monster_incoming` | [C] "Something very large is coming. Pikes and bolts hurt big things; swords mostly annoy them." | [B] "A MONSTER! Put bolts in the front and pikes where it will run!" [P] "A large thing is not a crowd. Do you need more soldiers, or better ones?" |
| `no_support` | [P] "No physician, no bell, no banner. Is an army without nerve a brave crowd, or merely a crowd?" | [C] "Nobody will keep them standing. I said so before the first wound." [B] "A banner is a morale you can SEE! Bring one!" |
| `one_note` | [C] "Your army is all one kind of soldier. The enemy will find the one answer to it." | [B] "ALL pikes! ALL horses! ALL bows! The enemy has ONE answer and a BIG smile!" [P] "A single note is not music. Is it still a battle?" |
| `no_anti_armor` NEW | [C] "They wear plate and you carry arrows. Arrows polish plate. Bring bolts, bills or poison." | [B] "CLINK! That is the sound of arrows! Bring BOLTS!" [P] "Plate is patient. Which of your soldiers is more patient?" |
| `no_anti_air` NEW | [C] "They have wings and you have swords. Only bows, bolts and springalds reach the sky. I said sky." | [B] "WINGS! Bring things that go UP!" [P] "Does a sword not reach? Is that its shortcoming, or yours?" |
| `banner_exposed` NEW | [B] "Their banner is out in the open! Drop the pole and the men beneath it run! Bring a long bow!" | [P] "A flag is an army's memory. Who among you can reach a memory?" [C] "Cut the banner and they leave. I have said so. It keeps being true." |
| `fire_risk` NEW | [P] "You brought wooden engines and thatch is close, and they have fire. Is wood a lifestyle or a mistake?" | [C] "Fire follows wood. Wood follows fire. Keep the engines on stone." [B] "BURN! Do not stand your catapults in the hay!" |

## 9. Banned and allowed word notes for this era (feeds the text sweep, ER11, with a signed allowlist)

Banned in any player-visible string (case-insensitive, whole word unless stated): real nations and peoples (England, English as a nation, France, Scotland, Wales, Spain, Germany, Saxon, Norman, Viking, Celtic as a people, Moor as a people; "moor" as terrain is allowed); real wars, battles and people (Hastings, Agincourt, Crecy, Bannockburn, Crusade, Crusader, Richard, Arthur, Excalibur, Camelot, Robin Hood, Joan, Lancelot, Merlin); real orders and religious terms (Templar, Hospitaller, Teutonic, Inquisition, Jihad, Holy War, Pope, Saint, Heathen, Pagan, Infidel, Blessing used as a religious act, Prayer, Confession); real heraldry (lion rampant, fleur-de-lis, double-headed anything, saltire, red cross); real disease beyond the setting words (Black Death, bubonic, leprosy, smallpox); firearms and gunpowder words (cannon, musket, gunpowder, bombard: they are Modern's); other companies' franchise terms (Chapter as an organisation, Space Marine, Warhammer, Dragonborn, Free Company as a faction name); slurs, ethnicity and religion as a punchline; "serf" and "slave" (they invite a real-oppression joke); "Dark Ages" (use "the Middle Ages" or no era word).

Allowed (the sweep must not flag these; each is setting or generic English): abbey, abbess, church bell, bell tower, cloister, bell, herbs, tonic, apothecary, physician, beaked mask (as a costume), plague (as a prediction or a sneezing cloud, never with suffering), sneeze, cough, sit down, pageant, tourney, tournament, joust, lance, banner, standard, herald, bugle, castle, keep, moat, drawbridge, portcullis, gate, siege, trebuchet, mangonel, ram, peasant (a class word; never the butt of the joke), knight, squire, yeoman, reeve, groat, turnip, hedge, hog, troll, dragon, wyvern, hoard, spoon, intern (offstage). Heraldic colour words (gules, azure) are allowed as jokes about heraldry only when no real arms is described.

Tone checks the reviewer pass applies to every line: (1) does it punch at a situation or an object, not a person; (2) could a nation, order or faith recognise itself; (3) is any death line asking for sympathy; (4) is "plague" attached to suffering; (5) is the line copied from the Ancient pool (Jaccard >= 0.6 is a near-duplicate); (6) does Brutus have exactly one ALL-CAPS word besides names.
