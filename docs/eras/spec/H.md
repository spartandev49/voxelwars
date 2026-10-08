# spec/H: humour and text of the three new eras (COMEDY-EDITOR, final, 2026-10-08)

Binding inputs: `docs/AGENTS.md`, `e.md` 2.6, `plan.md` v3.1 (0.6 tone, 1 text-layer rows, 9 ER11, 11 humour, 14 row `spec/H`), `traceability.md` (rows 2.6, 5), `q1_product` Q11, Q12, Q29, `q2_product` Q9 to Q12, `q3_product` residuals 9, 14 to 19, 36, `q3_program` residual 27, `q3_engine` residual 20, the three binding bibles `design/{medieval,modern,scifi}/{humour,mutators_achievements,missions_outline,missions_notes,god_powers,rosters,ui_chrome,first_three_minutes}.md` and the machine files `missions.json` and `context.json`, `docs/spec/humor.md` (the Ancient rubric), `docs/comedy_report.md`, `docs/lifetime_stats.md`, `tests/humor/text.test.mjs`, `design/ancient_announcer_classification.{md,csv}` (first agent read, present), and the specs written before this one: `AR`, `M`, `M-layers`, `RA`, `W`, `UC`, `VF` (3.14), `CU` (3.5, 3.6, 3.9, 3.14 to 3.19, OI-CU2), `MS`, `S-slice`, `AU`. Their "Plan corrections" and "Open items" bind this file; where a bible and a later spec disagree the later spec wins and the disagreement is a row in section 5 or 6.

Data files that belong to this spec (machine-checked, same directory): `h_callbacks.json` (71 callback entries, lint in appendix B) and `real_world_seed.json` (REAL_WORLD seed v2: 16 categories, 759 unique terms, per-era banned stems and allowed words, expected allowlist rows). Scripts that were RUN to produce the numbers below are printed in appendices A and B and reproduce them from the repository as it stands.

## 1. Purpose and scope

The Ancient release is funny because its text is a system, not a pile: a selector that only speaks what is true of the battle, a rubric, a lint, a report. The three new eras need the same system plus three things Ancient never needed: a **cross-era arc** that works in any entry order, a **callback mechanism** that cannot print a line about something the player never saw, and a **volume plan** for about 6,800 new strings that is counted, owned and measured. This file is the contract for all of that. It fixes:

1. the comedic engines of each era (names, rules, forbidden shapes, exemplars, how they differ from Ancient), the voice laws (Brutus caps, Plato MUTED, Cassandra tells) and the intern policy (section 3.1, 3.2, 3.8);
2. the arc: arrival cards in every entry order, chooser captions, per-mission progression lines, finale payoff surfaces, Credits, What's New (3.2);
3. the **callback ledger**: format, gates, who writes each flag and where it lives, the 71 entries (3.3, `h_callbacks.json`);
4. the **text-layer count table** per era and in total, which feeds `manifest.expect` (3.4);
5. the **announcer pool**: classification dependency, partition rule, category table, signature categories (Medieval's was missing and is written here), effective pool and repetition targets (3.5);
6. style guides and word limits per surface, the death-line rubric with accepted and rejected examples, banned and allowed words per era, REAL_WORLD, lint parameters, the cross-era audit that was run and its fix list (3.6 to 3.10);
7. the comedy panel protocol (3.11) and the finals for every string other specs left "provisional" (3.12), the answers to the open questions in the bibles (3.13), kill-verb causes (3.14), stat keys (3.15), the writing-volume plan (3.16) and the QA sampling rule (3.17).

**Not here:** the lines themselves (COMEDY-MED, COMEDY-MOD, COMEDY-SF write them against this file), the announcer engine code (CU18, spec/CU), sim events (spec/M), the panel and sweep tools (spec/VF names them; appendices A and B are reference implementations of the parts that were run), audio.

**What was run for this file (2026-10-08, scratchpad scripts, outputs quoted):** (a) `text_audit.mjs` over 2,884 strings (2,764 unique before the fixes: Ancient 1,294, Medieval 404, Modern 501, Sci-Fi 565) = before: 35 findings; after the 65 fix rows of 3.10.4: 0 findings; (b) the REAL_WORLD seed swept over the design copy of all three eras (438 / 589 / 672 strings, 5 distinct (era, term) hits on 10 strings, all of them expected allowlist rows, 3.9); (c) `callbacks_lint.mjs` on the ledger: 0 errors, and 12 mutations each turned it red (3.3.7); (d) the pool arithmetic of 3.5 from the classification CSV (473 announcer rows); (e) layer sums of 3.4 from `context.json` and `missions.json`.

## 2. Decisions

| id | decision | reason |
|---|---|---|
| H-D1 | **Roles.** COMEDY-MED, COMEDY-MOD, COMEDY-SF write; **COMEDY-EDITOR** (the fourth, cross-era editor of plan 11) owns this spec, the ledger, the shared text module (44 announcer rewrites, 9 tip rewrites, the five basics beats), the lint parameters, the panel protocol and the arc; REVIEWER signs lists, the classification second read and allowlist rows; TOOLS-VERIFY builds the tools. One naming scheme: `COMEDY-x` (writers) and `COMEDY-EDITOR`. | `q3_program` inconsistency 8 (three names for one role). |
| H-D2 | **Engines.** Each era has three named engines (3.1). The Ancient engine, "E0 bureaucratic and financial understatement", is never primary: E0-lexicon lines are at most 20 percent of any surface with 30 or more lines; each of E1, E2, E3 carries 20 to 45 percent of the engine-tagged templates, units and mission texts of its era. | `q1_product` Q29. The measured paperwork-lexicon share (3.1.5) is 4.8 percent in Ancient and 3.0, 4.8 and 4.1 percent in the Medieval, Modern and Sci-Fi design copy, so 20 percent per surface is a tripwire, not a target. |
| H-D3 | **Intern offstage.** Named only on: arrival cards (and their footers), chooser captions, god-power tooltips, alt jokes, tutorial lines and cast lines, the blocked-power message, and the Medieval cleared-card sticky note. Never an announcer template (except a god-power cast line), briefing, lesson, tip, bark, kill verb, loading line or mutator text; no portrait, no voice, no fourth `who`; at most one "Intern's note" line visible per screen. Lint `intern_surface`. | `q3_product` 36; the three `god_powers.md` sections 3 say the same. |
| H-D4 | **Arc.** One premise sentence (per era, 3.2.1) is shown on the first arrival card a profile ever sees when that profile has no Ancient star, so a player who starts in any era meets the cast. Progression lines render once, on the results screen of the FIRST win of their mission. The finale payoff lives on era-independent surfaces and opens on `era_cleared:<era>`. | `q2_product` Q9; the Ancient finale is frozen (G4). |
| H-D5 | **Callbacks.** 71 entries in `h_callbacks.json`, two types: `setup-free` (14; funny cold) and `gated` (57). A gated target renders only while its gate is open and at most once per profile. Gates are **derived from existing save facts wherever a fact exists** (mission stars, `progress.eras[era].cleared`, lifetime stats, achievements, codex opens); a `cb` flag exists only for facts the save does not hold (12 flags). The flag is set when the source line is RENDERED. Frozen Ancient lines are marked through an id map (`cbSources`), not by editing them. | `q2_product` Q9, `q3_product` 14, `q3_program` 27. |
| H-D6 | **Counts.** Strings to write per era: Medieval 2,229, Modern 2,259, Sci-Fi 2,306 (6,794 in total) plus 83 shared strings written once; floor per era 1,882. Ancient measured on the same layers: 2,510. The plan's "1,100 to 1,300 strings per era" (`q2_product` Q12) under-counted by about a factor of two. | 3.4. |
| H-D7 | **Announcer.** Reuse of Ancient lines is activated only by a signed second agent read of all 575 classified rows (conservative union); partition by FNV-1a(id) mod 3 for the generic categories with 12 or more reusable lines; effective pool 477 / 498 / 522, never below 300; spoken reuse share at most 65 percent measured by `humor-sim`. | `q3_product` 16, classification OI-1, OI-2. |
| H-D8 | **Voice laws, calibrated on Ancient.** Brutus: at most 2 caps groups per line (Ancient: 174 of 181 lines, 96.1 percent, comply; 69.1 percent have exactly one; 1 line has none), zero-caps lines at most 12 percent, reused Ancient lines exempt by id. Plato: at least 35 percent questions (Ancient 38.5). Cassandra: tells on at least 50 percent. Plato MUTED has its own rules (3.8.2). | The bibles say "exactly one"; Ancient itself passes only 69 percent, so the law that can be enforced is the one in 3.8.1. |
| H-D9 | **Death-line rubric** with 7 rules and 10 accepted plus 10 rejected examples for each of the five judgement rules (3.7). | `q1_product` Q4 residue, `plan` 11. |
| H-D10 | **Lists.** REAL_WORLD seed v2 (759 unique terms), per-era banned stems and allowed words, expected allowlist rows with caps. Medieval: abbey, abbess, cloister, bell, church bell, herbs, plague (as setting) allowed; crusade, templar, inquisition, pope, heathen, serf, cannon and 30 more stems banned. | `plan` 11, VF 3.14. |
| H-D11 | **Lints** (3.10): near-duplicate = word 3-gram Jaccard 0.6 after stock stripping; skeleton lint only for strings of 6 or more word tokens; filler-phrase cap 2 per era; wave-name shape cap 9 of 20 open with "The". | VF 3.14; the skeleton rule as written fires on 2-word wave names and says nothing about real sameness. |
| H-D12 | **Panel.** VF 3.14 stands; this file adds: sample size `min(100, N)`, 6 anchor lines and 4 decoy lines per batch, an absolute floor (median 3.0, 20th percentile 2.2) so a weak Ancient control cannot lower the bar, fresh raters per round, writer/panel prompt independence test (3.11). | `q3_product` 15, `q2_product` Q10. |
| H-D13 | **Finals.** Every string CU marked provisional is final in 3.12 (difficulty names, mutator overlays, pause quips, cards, About tagline, meta achievements, milestone titles, assist strings, interlude strings). "Time Lord (Honorary)" is dropped: it is another franchise's term. | `CU` OI-CU2, R-CU-H1. |
| H-D14 | **Kill verbs** are keyed by the 27 `KILL_CAUSES` of spec/M only. The bibles' eight style names (`charge`, `bolt`, `bell`, `breath`, `mow`, `hitscan`, `blast`, `pin`) are not causes; 3.14 maps them and requests an optional `via` sub-pool (fallback: fold). | `q3_engine` 20, `M` 3.3. |
| H-D15 | **Basics.** The five basics beats are ONE shared text set for all three eras (ids `b_*`, shown once per profile); only the hint of `b_place_line` and `b_powers` differs per era. The Ancient five stay as shipped. | `q3_product` 19, `CU` 3.5. |
| H-D16 | **Stock strings.** The helper-rendered star-2 sentence may stay bare in at most 5 of 9 missions per era (Ancient: 5 of 9); the other missions add an era sentence. Shared strings that are identical on purpose are registered (`shared_string`): today exactly one, the blocked-power line. | The audit found the bare sentence in 23 of 27 new-era missions. |
| H-D17 | **Volume and QA.** About 72 writer sessions per era plus about 25 cross-era sessions (3.16); 20 random lines per panel surface per era (160 per era) quoted with ids in every QA report (3.17). | `plan` 11, VF 3.14 item 9. |
| H-D18 | **Derived copy in the design files is replaced, not deleted** (the `missions_notes.md` files list 176 derived rows for Medieval alone, and the open items OI-MOD-1 and SF-DA-18/19 name the same work for the other two): the rules in 3.13 say how each kind is written; the replacement runs through the same lint and panel as any line. | `missions_notes` open items, COORD rewrite-until-pass rule. |


## 3. Detailed specification

### 3.1 The comedic engines

#### 3.1.1 What Ancient does, so the new eras can be told apart from it

Ancient's engine ("E0") is **bureaucratic and financial understatement spoken by the soldiers**: a farmer with a bronze mortgage, last words that ask the armourer to stop the payments, a senator who raises a point of order while being stabbed, a codex footnote in the shape "Stat: x. Stat: y." (`Armour rating 30%. Mortgage rating 70%.`, `Kick cooldown: 8 s. Subtlety cooldown: permanent.`, `Discipline aura 9 u. Praise aura: not found.`, `Misfire: 4%. Colleague compensation: pending a union.`). Its register is quiet, its speaker is the unit, its target is money and forms, and its shapes repeat (the codex formula appears in 7 units; the audit's skeleton `w D w` is the Ancient baseline). The new eras must not be that with new nouns. Each era therefore has three engines that are **louder, led by a commentator, and tied to a mechanic the player can see**.

Rules common to all nine engines:

* An engine is declared per template, per unit and per mission text by the field `eng` (`E1`, `E2`, `E3`; Ancient text keeps no tag and counts as E0). The count rule of H-D2 is evaluated over tagged items; an item may carry a second engine in `eng2` and counts for both at half weight.
* Every unit has one line that names its own mechanic (UC-52), and every engine rule that says "number, tell or rule of the game" is checked by the reviewer pass (tone check 9 of the Sci-Fi bible, 1 of the others).
* "Forbidden shapes" are **review and lint targets**: where a regular expression is given the lint runs it (`tests/humor/shapes.test.mjs`, 4 and 3.10.3); the others are named reviewer checks.
* Exemplars are the bibles' lines after the fixes of 3.10.4 (so the document passes its own lint); `[B]` Brutus, `[P]` Plato, `[C]` Cassandra.

#### 3.1.2 Medieval

**E1 The Pageant Goes Wrong** (stage management: cues, props, understudies, the interval, the programme). The war is a production and everything that goes wrong is logistical, never cruel. Brutus is front of house and treats every disaster as a feature, Plato asks whether the script or the stage is real, Cassandra has read the running order. One stage-management image per line; crowd props react; the failure is a missed cue, a wrong prop or an understudy, never a death.
*Forbidden shapes:* (1) the failure is an injury or a death rather than a missed cue; (2) a theatre-jargon pile: more than 2 of `cue prop wings understudy interval act scene curtain programme` in one line (regex `shapes.med_jargon`); (3) the "audience" is the player ("you in the cheap seats").
*Differs from Ancient:* Ancient files the war as paperwork after the fact; Medieval stages it as it happens, aloud.
1. [B, battle_start] WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war! We are skipping to the third!
2. [B, charge] CHARGE! The bugle said wait! The horses said NO!
3. [P, stalemate] Both armies have stopped. Is that an interval, or has the cast gone on strike?
4. [C, battle_start] The programme says 'mock combat'. The programme was printed before the swap. I kept a copy.
5. [B, first_blood] First blood! Also first interval! The grandstand is selling PIES!
6. [B, hero_down] SER VALIANT IS DOWN! His understudy is a hay bale, and it is doing FINE!
7. [P, rout] The cast has left the stage in a hurry. Is that an exit, or a review?
8. [C, prop_destroyed, grandstand] The grandstand will collapse in the second act. It is the second act.
9. [B, kill_streak] FIVE in a row! That is a standing ovation, and the ovation is also in the way!
10. [P, victory] The final scene went as planned. Nobody had planned it. Is that direction, or luck in costume?

**E2 The Rule Book Taken Literally** (chivalry, oaths, precedence, tolls, contracts; sincere and loud). A rule is enforced with enthusiasm and hubris, to the letter and past it. Titles are absurdly long and the horses are small; soldiers and commentators find the loophole and are proud of it. The target is the rule book and the cleverness of the loophole, never a real code, faith or order. Plato leads, Brutus mangles the titles, Cassandra quotes the rule number.
*Forbidden shapes:* (1) a real code or oath (regex: REAL_WORLD `faith_and_orders`, `peoples_polities`); (2) archaic pastiche: `thee thou thy forsooth verily prithee hark ye olde` (`shapes.med_archaic`); (3) the quiet memo ("Please note that the sum of...") with no loudness: that is E0; (4) "Tell my [relative]" farewells.
*Differs from Ancient:* Ancient's forms are filed silently; Medieval's rules are read out by a herald, to the letter, at volume.
1. [P, battle_start] The contract says to the death. Of whom? The clause is silent. The clause is usually silent.
2. [P, battle_start] Ser Valiant will not strike a kneeling man. The man, aware of this, has been kneeling since Tuesday.
3. [B, hero_enters] SIR Wobbleton, Second Chair of the Stool, Keeper of the Lesser Pennant! Big name! Small horse!
4. [C, stalemate] Rule 114: no attacking until the herald has finished reading. The herald has found a second scroll.
5. [sellsword, death] I swore to hold the line. Nobody said which line. I picked a short one.
6. [pikeman, taunt] My oath says forty days. This is day forty. Please hurry.
7. [reeve, death] I declare myself dead, pending review.
8. [P, rout] He has fulfilled the contract to the letter and left by the letter. Is that cowardice, or typography?
9. [B, retreat] HUZZAH! ...was that a retreat? It looked like a retreat. Also HUZZAH.
10. [knight_afoot, taunt] I was mounted when I signed this. The horse is not bound.

**E3 Heavy Things Arrive Late** (weight, mud, siege logistics, bad news by pigeon, Cassandra's plague). Heavy things (knights, engines, boulders, ladders, counterweights) arrive after the moment they were needed or fall over slowly; news travels by pigeon and the pigeon is missing; Cassandra predicts and, this era, is for once right and does not enjoy it. Numbers are small and specific (eleven seconds, day nine, eight weeks). Wave names, lessons and Cassandra's lines carry this engine.
*Forbidden shapes:* (1) plague attached to suffering (a death, a cough that hurts, a body): it is a sneeze and a sit-down (`shapes.med_plague_pain`: `plague` or `sneeze` within 6 words of any `suffering_vocab` stem); (2) more than one pigeon line per battle; (3) E3-tagged templates with no number word or digit: at least 40 percent of E3 templates carry one (`numbers_share`); (4) a heavy thing that arrives on time and is not funny for it.
*Differs from Ancient:* Ancient's problems are fees and forms; Medieval's are weight, mud and delay, measured in seconds and days.
1. [C, stalemate] The siege is on schedule. The schedule is eight weeks. You have four minutes. Nobody told the schedule.
2. [C, misfire] The counterweight was back-ordered. A smaller counterweight was substituted. Observe the substitution.
3. [P, oil] The oil is delayed in transit. It is the only thing in this siege behaving as intended.
4. [B, dragon] A DRAGON! The pigeon was supposed to warn us! The pigeon has not been seen since Tuesday!
5. [P, knight falls] A knight in plate falls over. It takes eleven seconds. The suspense is the sentence.
6. [C, plague] Plague. I said plague. Tuesday. It is Thursday. I take no pleasure in it. A small pleasure.
7. [B, siege day] Day nine of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH!
8. [C, results lesson `breach_open`, replaces the bible's pigeon-count lesson, which no detector can make true] The gate fell at {t}, early for a siege on an eight-week schedule. Nobody told the schedule.
9. [P, trebuchet] Leverage in the physical sense is simple. In the commercial sense it is how we got here.
10. [B, ram arrives] The ram has arrived LATE! The wall has been waiting, and it is a little disappointed!

Running gags and their caps (bible 1.1, binding): the tabard (1 line per battle), HUZZAH (cd 480 s, 3 per battle, counted in `eraStats.medieval.huzzahs`), Plato's feudal contract (setup-free source, gated payoff), Cassandra's plague, Dennis and Wilfred, the spoon, the pigeon, Perpetual Mutual (1 per battle).

#### 3.1.3 Modern

**E1 Live From The Front** (technical difficulties: headsets, call signs, hold music, mute buttons, spin; Brutus-led, loud, overt). The war is a broadcast and every disaster is a technical one first: a mute, an echo, the wrong channel, hold music. At most one radio-procedure word per line (`Over Out Roger Copy Wilco`) and at most one such line in three. Plato's lines arrive muted (3.8.2); Cassandra has muted herself on purpose and speaks when it matters; spin ("proactive relocation") is aimed at the phrase, never at a person.
*Forbidden shapes:* (1) two or more radio words in a line (`shapes.mod_radio`); (2) war-movie pastiche: `incoming boots on the ground fire in the hole danger close roger that wilco` beyond the single allowed radio word; (3) spin pointed at a real spokesperson, agency or event (REAL_WORLD); (4) casualties jokes (the word is lore-only).
*Differs from Ancient:* Ancient's units mutter memos; Modern's commentators fight their own equipment, live.
1. [B, battle_start] This is BRUTUS, call sign Brutus! I picked it myself! Over! Is it over? Over!
2. [B, battle_start] I am receiving you loud and... I am receiving MYSELF. Hello, myself!
3. [P, battle_start, muted] Over. Out. Roger. Three ways of saying nothing in a hurry.
4. [C, battle_start] Channel four is the enemy's. I said channel four. Brutus has been on channel four since noon.
5. [B, kill_streak] FIVE in a row, and the headset says I am on mute! Can anybody hear a streak?
6. [C, army_low] Official statement: the position held. Unofficial: the position, the road and the briefing room.
7. [B, retreat] A bold new RETREAT strategy! The briefing calls it proactive relocation! The troops call it running!
8. [P, stalemate, muted] Both armies are on hold. Whose call is the more important?
9. [P, defeat, muted] 'A minor setback.' The setback has a crater and a name. Is it still minor if it has a name?
10. [B, victory] We are live from the front and we WON! Technical difficulties! We won though! Over!

**E2 Toy-Box Literalism** (a war fought with household objects and narrated with total seriousness; "what is it for?"; Plato-led). The object is taken at face value (a teapot is a teapot, a lunchbox is a lunchbox) and the weapon is the surprise. The narration never says "toy"; it says "tank" with a straight face. Specific nouns beat adjectives (biscuit, lid, drawer, plywood, hose, sprig). The object's logic is the target, never the person inside it.
*Forbidden shapes:* (1) the word `toy` in a player-visible Modern string (`shapes.mod_toy`; the era chip "toy-box" in design files is not player text); (2) a brand as the object (REAL_WORLD `companies_and_brands`); (3) a joke at the crew's body or fear; (4) adjective piles ("a quirky little cute tank").
*Differs from Ancient:* Ancient's absurdity is institutional (mortgages), Modern's is material (a filing cabinet with a gun in it).
1. [P, teapot_heavy fires] The Teapot Heavy has not poured. It has only aimed. I find that more menacing.
2. [B, peashooter hit] The flowerpot takes a light hit! The sprig is FINE! I repeat, the sprig is fine!
3. [C, sandbag destroyed] The sandbags are sand and bag. Bag was the weak link. I said bag.
4. [B, filing_howitzer fires] The Filing-Cabinet Howitzer opens drawer THREE! A shell! Of course it is! Drawer four is lunch!
5. [P, trolley_rammer charges] A trolley with a plank. We have reinvented the ram, with a wobblier wheel and fewer principles.
6. [B, biscuit_tank] The Biscuit-Tin Tank pops its LID! The good biscuits are at the back! So is the armour!
7. [C, lunchbox_apc bailout] The crew bailed out of the lunchbox. They are holding sandwiches. No sandwich was dropped. I checked.
8. [P, hoarding_bearer] A plywood wall with legs. Is it protecting him, or merely introducing the bullets to the sign?
9. [B, fishbowl_chopper] The goldfish presses its face to the GLASS! Rockets away! The fish has more flight hours than the pilot!
10. [C, pin_applied] The pushpin is a pushpin. It does what pushpins do. I am surprised nobody has put one on me.

**E3 The Convoy Is Late** (logistics slapstick: traffic, detours, wrong exits, cows, parking, deliveries; Cassandra-led doom about mundane delays). Things are late, lost, in the wrong lane or at the wrong exit, and the war waits politely. Numbers are small and specific (four minutes, level three, the third exit). The roadworks cow has right of way, always. The delay is never cruel: a column is stuck, a fuel truck is late, a form is on the wrong desk.
*Forbidden shapes:* (1) a delay that costs a life; (2) E3 templates with no number word or digit (at least 40 percent carry one); (3) a second cow line in the same battle; (4) a bare traffic complaint with no mechanic (a convoy joke must name a vehicle, a bridge, a mine or a shell).
*Differs from Ancient:* Ancient's delay is a queue at a desk; Modern's is a column behind a cow on the only bridge.
1. [B, escort] A tank column stuck behind a COW! The cow has right of way! The cow has always had right of way!
2. [C, escort] The convoy will take the wrong exit. The third time. I drew them a map. They used it as a coaster.
3. [P, stalemate, muted] The fuel truck is late. The war is therefore postponed, or wins by default.
4. [B, battle_start, roadworks] PARKING STRUCTURE! Level three is free! Level three is also the battle!
5. [C, wave] The reinforcements are four minutes away. Four minutes ago they were four minutes away.
6. [P, bridge, muted] One bridge, one column, and the detour is also a bridge. Is the detour the more honest bridge?
7. [B, boxcar] The wagons were due TUESDAY! It is Thursday! The cargo is celebrating anyway!
8. [C, mine_armed] The sappers marked the minefield with tape. The tape arrived after the minefield. I said order of delivery.
9. [P, convoy, muted] A column of tanks waits for a signal. The signal waits for a column. Who proposed the arrangement?
10. [B, helicopter_flyover] The helicopter is LATE! Its risk assessment, I am told, is on time!

Running gags (bible 1.1, binding): the headset (2 radio lines per battle, cd 90 s), PLATO (MUTED), Cassandra's risk assessments (1 per battle), the goldfish, the biscuits, the Parcel (one line per mission from M4, no repeats), the cow, the sponsor (Beige Stationery from M2; Pompeii Pizza and Perpetual Mutual only through the ledger), spin (1 per battle).

#### 3.1.4 Sci-Fi

**E1 Deadpan Technobabble With Numbers** (units, Codex, Plato, Cassandra, tips, the alien translator, lessons). Every joke names a number, a tell or a rule of this game; if it names none it is cut. The register is flat and never winks. The jargon is the real mechanic (bubble, delay, regeneration, break window, lock line, channel, detection radius), never filler. The translator is a running subtitle gag with a visible confidence rating (never above 60 percent) and an alternate reading that is a worse pun; once per battle per faction, never twice in 90 s. The target is the instrument, never the person who reads it.
*Forbidden shapes:* (1) filler jargon: `reverse the polarity recalibrate flux quantum warp core dilithium flux capacitor does not compute beep boop exterminate` (`shapes.sf_filler`); (2) an E1-tagged line with no digit, number word or game term (`numbers_share` 60 percent for E1); (3) a translator rating above 60 or a missing rating (`shapes.sf_translator`: regex `Confidence: (\d+) percent` and value <= 60); (4) the winking aside ("get it?").
*Differs from Ancient:* Ancient's footnote formula ("Stat: x. Stat: y.") jokes about the person behind the stat; Sci-Fi's jokes sit on a number the player can verify on the card.
1. [Codex, tidy_trooper] Shield: 40 points. Regrows after three seconds of not being rude to it.
2. [P, shield_pop] A shield is a promise made of light. This one just broke, and it regrows in three seconds, unlike most promises.
3. [C, emp_freeze] The machines are off for three seconds. I said so. Nobody asked how long.
4. [translator, Skitter taunt] [Translator: 'We come in peace.' Confidence: 11 percent. Alternate reading: 'We come in pieces.']
5. [Tip] Rivets do not hurt a bubble. They interrupt it. The timer starts again every time.
6. [C, shield_chain] Seven bubbles in two seconds. That is not a coincidence. That is a schedule.
7. [P, blink_hop] Twelve units in a fraction of a second. The distance still exists. It was merely not consulted.
8. [Codex, acid_spitter] Thirty poison over five seconds. Ignores shields, armour and manners.
9. [Results lesson] Our bubbles popped {n} times and regrew {m}. The difference is called a bill.
10. [Codex, silent_signer] Asks for a signature from sixty metres. Silence counts as consent.

**E2 Drive-In Trailer Voice** (Brutus, posters, taglines, loading lines, genre bingo). Trailer hyperbole on trivial stakes: the Moon is a parking space, a lease is a destiny, a bubble is a character. Genre bingo: the commentators name every cliche at the moment it happens and never name a real film, franchise or studio. One caps group per Brutus line; the battle-start title card may be all caps once per battle (registered `titleCard`, at most 3 templates per era, only `battle_start`). Plato punctures it by taking the cliche literally, Cassandra by knowing the next reel.
*Forbidden shapes:* (1) a real film, franchise, studio or trailer-voice person (REAL_WORLD `franchises`); (2) more than one bingo line per battle; (3) a voice-over deeper than the line deserves ("Somebody call the trailer guy" is the only allowed meta-wink, once per battle); (4) an all-caps line that is not a registered title card.
*Differs from Ancient:* Ancient's Brutus sells pizza; Sci-Fi's Brutus sells the film.
1. [B, battle_start, title card] ON A MOON FAR FROM THE SNACK BAR, two armies fight over a parking space! RATED G, FOR GLOWING!
2. [B, shield_pop] POP! That was a bubble and now it is a memory! Recharging in three, two, one, rude!
3. [Poster tagline, M1] HE CAME FOR THE MOON. HE STAYED FOR THE LEASE.
4. [B, kill_streak] Five in a row! Somebody call the trailer guy, we need a deeper VOICE!
5. [B to P, battle_start] Are lasers just very LOUD javelins? / [P] They are quiet, Brutus. The shouting is yours.
6. [C, hero_down] In the original script, the quiet one lives. This is not the original script.
7. [B, lead_change, genre bingo] The TWIST! I do not know what the twist is! But the music went up, so it is a twist!
8. [P, boss_enters, Hive Queen] Brutus checked twice whether 'queen' is a metaphor. It is still a metaphor.
9. [B, intermission] INTERMISSION! Please visit the snack bar, silence your robots and enjoy a short film about bubbles!
10. [B, victory] Roll the credits! No, wait, there is more! There is always more! It is a SEQUEL!

**E3 Cheerful Menace** (machines, results screens, UI errors, over-helpful prompts that narrate themselves). Customer-service positivity applied to destruction, never to pain: the menace is procedural. Devices read their own status aloud and take instructions personally; apologies arrive after the damage; the props of the register are the survey, the receipt, the queue, the warranty sticker and the hold line. The victim is a bubble, a battle or a schedule, never a person's suffering. The Courtesy voice speaks on a defeat screen only when the enemy was Courtesy. The word `survey` appears in at most one line per screen.
*Forbidden shapes:* (1) cheer attached to pain or injury (`shapes.sf_cheer_pain`: a `cheer` word within 6 words of a `suffering_vocab` stem); (2) a real service brand or product (REAL_WORLD); (3) two survey lines on one screen; (4) the Courtesy voice on a defeat that was not Courtesy's.
*Differs from Ancient:* Ancient's officialdom is dry and human; Sci-Fi's is bright, automated and apologises in the past tense.
1. [greeter_unit, taunt] Welcome! Please remain calm and within range.
2. [refund_crawler, death] Your return has been accepted. Please rate your explosion.
3. [valet_drone, taunt] May I take your shield? Thank you. It is now my shield.
4. [Loading line] Calibrating the cheerfulness of the robots (currently: too high)...
5. [Defeat screen, Courtesy voice] Thank you for your defeat. Your satisfaction is important to us. Please take a survey. The survey is another battle.
6. [Shield bark, low bubble, any shielded unit] Shield at twelve percent. Please enjoy the remaining twelve percent.
7. [grand_concierge, entrance] Welcome to the Violence Desk. Your number is: now.
8. [warranty_tech, taunt] Out of warranty? Fixed. In warranty? Fixed. Yours? Void on arrival.
9. [maitre_deluxe, please_wait] This way, please. No, not that way. The other way. The round way.
10. [UI, Deploy while no army is placed] Your army has been placed in a queue. You are number one. The queue is the battle.

Running gags (bible 1.1, binding): the translator (1 per battle per faction, cd 90 s), the booth is a drive-in (a stamp on every result, popcorn 1 per battle), bubble readouts (1 per unit per battle, 1 per 20 s), the survey (Courtesy only), Cassandra predicted the robots, Plato defines "battle" (M9 and the finale only), the warranty sticker (unit text and tips only), the Moon lease, the bubble is a promise (cd 120 s, `shield_pop` and the Warden only), genre bingo (1 per battle), the Grazer is a goat (1 per battle, gated variant in the ledger).

#### 3.1.5 Engine mix and measurement

| check | rule | measured how |
|---|---|---|
| engine share | each of E1, E2, E3 carries 20 to 45 percent of the `eng`-tagged announcer templates, units and mission texts of the era; E0 at most 20 percent | tag count (`tests/humor/engine_mix.test.mjs`); a template without `eng` fails in a new era |
| paperwork lexicon | at most 20 percent of any surface with 30 or more lines (the bibles' "one line in five") and at most 8 percent era-wide; lexicon regex `\b(forms?\|paperwork\|stamp(s\|ed)?\|clauses?\|contracts?\|invoic(e\|es\|ed)\|receipts?\|memos?\|filed\|filing\|triplicate\|signatures?\|surveys?\|warrant(y\|ies)\|policy\|audit(s\|ed)?\|tax(es)?\|ledger\|clipboards?\|mortgages?\|payments?\|debts?\|loans?\|insurance\|coupons?\|committees?\|subcommittees?\|recess\|bureaucra\w*\|refunds?\|budgets?\|accountants?\|reclassified)\b` over announcer, unit, death, taunt, tip, lesson, briefing, set-piece and scout strings | regex share; measured over the bibles' own copy: Ancient 4.8 percent (n 1,073), Medieval 3.0 (168), Modern 4.8 (231), Sci-Fi 4.1 (291); highest single surface: Modern set-piece lines 11 percent (36) |
| numbers share | at least 40 percent of E3 templates (Medieval, Modern) and 60 percent of E1 templates (Sci-Fi) contain a digit or a number word | regex |
| forbidden shapes | zero hits of the regexes named above; reviewer checks recorded in the QA report | `shapes.test.mjs`, 3.17 |


### 3.2 The cross-era arc

The premise: **three commentators have been dragged through time by Zeus's intern, who stays offstage.** The arc has one job per surface, every surface works in any entry order, and the payoff does not depend on the frozen Ancient finale.

#### 3.2.1 Surfaces, keys, triggers

| surface | key shape | owner of the text | trigger | skip | writes |
|---|---|---|---|---|---|
| arrival card | `card:<era>:arrival[.footer.<k>]` | COMEDY-EDITOR (this file, 3.2.2) | first entry to an era, after the time-portal | button, Esc, click outside; never auto-advances | `seen.arrival[era]` (CU 3.6.10) |
| chooser caption and button labels | `chooser:<era>:*` | COMEDY-EDITOR | the chooser card (always visible when 2+ eras are released) | n/a | nothing |
| progression line | `prog:<missionId>` | COMEDY-x | results screen of the FIRST win of the mission (`progress.stars[m]` goes 0 to 1 or more), as a booth note under the lessons; never on Replay or a loss | n/a | `callbacks.mark` only if a ledger entry names this key |
| cleared card | `card:<era>:cleared` | COMEDY-EDITOR | after the M9 results of the first clear (`progress.eras[era].cleared` flips) | button, Esc; reopenable from the chooser stamp and the Passport | `seen.cleared[era]` |
| Time Passport | `card:passport` | COMEDY-EDITOR | once, when all four eras are released AND cleared; or the chooser's passport button once a non-Ancient era is cleared | button, Esc | `seen.cleared.passport` |
| Credits | `credits:<era>` | COMEDY-x | the Credits screen shows an era's finale lines only when `era_cleared:<era>` | n/a | nothing |
| What's New | `whatsnew:<era>` | COMEDY-EDITOR | once per released era not yet in `seen.whatsnew`, on a RETURNING profile only (CU 3.6.10) | "Not now" | `seen.whatsnew[era]` |
| booth callbacks | `ann:*`, `brief:*`, `sp:*` | COMEDY-x | the ledger (3.3) | n/a | `seen.callbacks` |

#### 3.2.2 Arrival cards in every entry order

A card is assembled from fixed parts; the only inputs are (a) whether the profile has ever seen an arrival card or earned a mission star, (b) the set of eras with `era_cleared` true, read at the moment the card opens. **Premise rule:** the premise sentence is shown iff `seen.arrival` is empty AND the profile holds no mission star in any era (so a veteran who starts Modern first does not get it, a brand-new player who picks Sci-Fi does). **Footer rule:** the first footer, in the order of the table, whose `when` is true; at most one; none if no `when` is true. Entering an era never changes any other state.

| era | part | text | words |
|---|---|---|---|
| medieval | heading | MEDIEVAL | 1 |
| medieval | premise (first card ever, no stars) | Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They were last seen in the ancient world, until Zeus's intern pressed something. | 23 |
| medieval | body | Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' by his sticky note. Brutus has acquired a tabard. Plato has acquired questions. Cassandra has acquired a cold and a bad feeling about the buffet. | 42 |
| medieval | button | Begin the Pageant | 3 |
| medieval | footer `arrival.footer.0` when `era_cleared:ancient` | Zeus's intern said two minutes. That was four centuries ago. | 10 |
| modern | heading | ARRIVAL: MODERN | 2 |
| modern | premise (first card ever, no stars) | Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They used to work an ancient arena, until Zeus's intern pressed the wrong button. | 24 |
| modern | body | Passengers Brutus, Plato and Cassandra were re-routed by Zeus's intern, who selected NEXT ERA instead of NEXT MATCH. Headsets issued. Brutus has also been issued a clipboard. Plato has been issued nothing and is at peace with this. Cassandra has noticed a helicopter. It has not noticed her. Please hold. | 50 |
| modern | button | Take Your Seat | 3 |
| modern | footer `arrival.footer.0` when `era_cleared:medieval` | Last time he sent a pageant. This time he sent a boarding pass. | 13 |
| modern | footer `arrival.footer.1` when `era_cleared:ancient` | Zeus's intern said two minutes. The gate agent has checked. It has been twenty-five centuries. | 15 |
| scifi | heading | THE FUTURE! | 2 |
| scifi | premise (first card ever, no stars) | Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They once covered a very old war, until Zeus's intern found the time remote. | 24 |
| scifi | body | ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling. | 70 |
| scifi | button | Press Button Three | 3 |
| scifi | footer `arrival.footer.0` when `era_cleared:modern` | Last time he sent a boarding pass. This time he pressed button three. | 13 |
| scifi | footer `arrival.footer.1` when `era_cleared:medieval` | He skipped a few centuries. The remote says that is allowed. | 11 |
| scifi | footer `arrival.footer.2` when `era_cleared:ancient` | Zeus's intern said two minutes. The remote now reads 'several thousand years, approximately.' | 13 |

All 14 states are enumerated by the committed fixture `tests/humor/arc_cards.fixture.json` (generated by `tools/gen_arc_fixture.mjs` from `ui.js`), and `tests/humor/arc_cards.test.mjs` renders every state through the real card renderer and compares text, order and element count:

| scenario | era | eras cleared before entering | premise | footer shown | assembled card (heading, premise?, body, button, footer?) |
|---|---|---|---|---|---|
| ARC-01 | medieval | none | yes (if no card seen and no stars) | none | MEDIEVAL + premise + body + "Begin the Pageant" |
| ARC-02 | medieval | ancient | no | `arrival.footer.0` | MEDIEVAL + body + "Begin the Pageant" + footer |
| ARC-03 | modern | none | yes (if no card seen and no stars) | none | ARRIVAL: MODERN + premise + body + "Take Your Seat" |
| ARC-04 | modern | ancient | no | `arrival.footer.1` | ARRIVAL: MODERN + body + "Take Your Seat" + footer |
| ARC-05 | modern | medieval | no | `arrival.footer.0` | ARRIVAL: MODERN + body + "Take Your Seat" + footer |
| ARC-06 | modern | ancient + medieval | no | `arrival.footer.0` | ARRIVAL: MODERN + body + "Take Your Seat" + footer |
| ARC-07 | scifi | none | yes (if no card seen and no stars) | none | THE FUTURE! + premise + body + "Press Button Three" |
| ARC-08 | scifi | ancient | no | `arrival.footer.2` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-09 | scifi | medieval | no | `arrival.footer.1` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-10 | scifi | ancient + medieval | no | `arrival.footer.1` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-11 | scifi | modern | no | `arrival.footer.0` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-12 | scifi | ancient + modern | no | `arrival.footer.0` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-13 | scifi | medieval + modern | no | `arrival.footer.0` | THE FUTURE! + body + "Press Button Three" + footer |
| ARC-14 | scifi | ancient + medieval + modern | no | `arrival.footer.0` | THE FUTURE! + body + "Press Button Three" + footer |

Why this reads in any order: every body line is self-contained (it names the three commentators or the intern's act, never a previous era); the premise sentence carries the cast for a player who has never seen Ancient; the only text that points backwards is a footer, and a footer exists only if the thing it points at has been cleared. A Sci-Fi-first player reads the heading, the premise, the body and the button; a player who finished all three earlier eras reads the Modern footer. Test `arc_order.test.mjs` also walks the 6 orders in which the three new eras can be entered with nothing cleared and no stars: exactly the first card carries the premise, no card carries a footer, and every card is complete without the others.

#### 3.2.3 Chooser captions and labels

Captions are verbatim from each era's `ui_chrome.md`; the Ancient caption is new (the Ancient chooser card did not exist in v8; the Ancient finale and Ancient strings stay frozen). The Ancient card has no cleared stamp. `Begin` appears before the first mission is cleared in that era, `Continue` once started, `Replay` once cleared.

| era | caption (intern gag, once per screen) | begin | continue | replay | cleared stamp | passport stamp |
|---|---|---|---|---|---|---|
| ancient | ANCIENT. Nine battles, one goat, and a time remote nobody has touched yet. | Begin Ancient | Continue Ancient | Replay Ancient | (none: the Ancient finale is frozen) | a goat |
| medieval | MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'. | Begin the Pageant | Continue Medieval | Replay Medieval | PAGEANT COMPLETE | a groat |
| modern | MODERN. The intern says this is the right century. He has pressed 'hold' on the next one. | Take Your Seat | Continue Modern | Replay Modern | PARCEL DELIVERED | a boarding pass |
| scifi | THE FUTURE. Selected by Zeus's intern, who held the remote upside down. | Step Through | Continue The Future | Replay The Future | RATED G, FOR GLOWING | a ticket stub |

Title-tile and map sub-lines (CU 3.1.3, 3.6.9) are final: map sub-lines: Ancient "The Ancient Era: nine battles, three acts, one goat" (frozen), Medieval "The Medieval Era: nine battles, three acts, one dragon", Modern "The Modern Era: nine battles, three acts, one parcel", Sci-Fi "The Future: nine battles, three acts, one very large bedroom"; the Campaign tile sub-line with 2, 3 or 4 released eras reads "Two eras, eighteen battles. Zero historical accuracy.", "Three eras, twenty-seven battles. Zero historical accuracy.", "Four eras, thirty-six battles. Zero historical accuracy." (one released era keeps the v8 line "Nine battles, one goat"); the About tagline (`UI_TEXT.meta.aboutTagline`) is "A voxel battle simulator across the ages, with a goat." and stays the v8 line while only Ancient is released.

#### 3.2.4 Per-mission progression lines

One line per mission, 30 lines in total (Medieval 11, Modern 9, Sci-Fi 10: Medieval M6 and M9 and Sci-Fi M3 carry two voices because the bible gives two). Each is a running thread that advances in a visible, countable step; the thread table is in the bibles (3.2 of each humour file) and is binding. Rendered on the results screen of the first win as a booth note (the voice label is the commentator's, so PLATO (MUTED) decorates Modern M1 to M8 Plato lines, 3.8.2). One edit to the bibles: Modern M4's line no longer announces BRUTUS ACTUAL (that is the headset callback's target, `mod_cb_headset`), so there is exactly one such line in M4.

| # | era | after the first win of | voice | line | words |
|---|---|---|---|---|---|
| 1 | medieval | `med_dress_rehearsal` | brutus | My tabard says I'M WITH THE KING. I have not asked which king. | 13 |
| 2 | medieval | `med_tourney_trouble` | plato | A feudal contract: one party speaks, the other kneels. Is that a dialogue? | 13 |
| 3 | medieval | `med_ford_dithering` | brutus | Brought to you by Perpetual Mutual: dragon cover for everything except DRAGONS! | 12 |
| 4 | medieval | `med_mizzlemoor_beacons` | plato | Brutus has shouted huzzah at the correct moment. I am unsettled. Is the world well? | 15 |
| 5 | medieval | `med_castle_dour` | plato | I have read the contract. It is a monologue with witnesses. | 11 |
| 6 | medieval | `med_bell_tolls_lunch` | brutus | CASSANDRA WAS RIGHT? I have sent a pie. It is a good pie. | 13 |
| 7 | medieval | `med_bell_tolls_lunch` | cassandra | I do not want the pie. | 6 |
| 8 | medieval | `med_pennywhistle_blaze` | brutus | I traded the tabard for a PIGEON! The pigeon is a better listener! | 13 |
| 9 | medieval | `med_toll_bridge` | brutus | Our sponsor has withdrawn. They cited the dragon. They have not yet SEEN the dragon. | 15 |
| 10 | medieval | `med_grand_pageant` | cassandra | I am retiring from prophecy. It is too accurate. | 9 |
| 11 | medieval | `med_grand_pageant` | plato | A dialogue needs two parties. I am now both. | 9 |
| 12 | modern | `mod_boot_camp_dropout` | brutus | I have a headset! It repeats everything I say half a second later! I am agreeing with myself and it is going SO well! | 24 |
| 13 | modern | `mod_hedgerow_picnic` | plato | I have spoken for some time. The label says I am muted. Is a thought still a thought if nobody is on the channel? | 24 |
| 14 | modern | `mod_trench_pardon` | cassandra | I muted myself on purpose. It is the only way to hear the briefing. | 14 |
| 15 | modern | `mod_bridge_too_far` | brutus | The Parcel is on the move! It has a van! The van seems PROUD! | 14 |
| 16 | modern | `mod_rail_yard_fireworks` | cassandra | The cabinet has a gun in it. I filed a note on the cabinet. The note is in the cabinet. | 20 |
| 17 | modern | `mod_switchboard_hold` | cassandra | Risk assessment, helicopter, overhead: approved. Signed: the helicopter. | 8 |
| 18 | modern | `mod_airfield_open_day` | plato | Brutus used 'over' and 'out' in the right order. Twice. Is the headset broken, or is he improving? | 18 |
| 19 | modern | `mod_harbour_tour` | brutus | We are ALL on hold! All three of us at the same time! The hold music is the best thing on the broadcast! | 23 |
| 20 | modern | `mod_dam_finale` | cassandra | The Parcel is on the dam. I said it would be on something. I was not specific. | 17 |
| 21 | scifi | `sf_lunch_break` | brutus | In a world... of BUBBLES... I have found a new voice and I cannot turn it off! | 17 |
| 22 | scifi | `sf_floor_lava` | brutus | The booth has cup holders! I have filled them with POPCORN! It is a tactical decision and a snack! | 19 |
| 23 | scifi | `sf_overclock_oops` | plato | Brutus's headset now fits his toga. Is that progress, or merely tailoring? | 12 |
| 24 | scifi | `sf_overclock_oops` | cassandra | I said do not overclock it. The sign said it too. The sign is now part of the reactor. | 19 |
| 25 | scifi | `sf_express_delivery` | plato | My microphone has a small red light. It is on. I have said everything I think in front of it. Is that courage, or a shortage of switches? | 28 |
| 26 | scifi | `sf_turn_it_off` | plato | I asked the booth assistant to define 'battle'. It replied with a survey. Question one: how did we feel about the battle? | 22 |
| 27 | scifi | `sf_grand_reopening` | cassandra | I predicted the robots. I was right. I am pleased. Four seconds. Three. | 13 |
| 28 | scifi | `sf_blink_jungle` | brutus | The booth has SEATBELTS! The translator has a rating! Eleven percent! We are in a very honest jungle! | 18 |
| 29 | scifi | `sf_noise_complaint` | plato | I have defined 'battle' in three eras. Today's definition is 'noise'. I am not proud. I am accurate. | 18 |
| 30 | scifi | `sf_queen_size` | cassandra | The Queen is down. I have stopped saying 'I said'. I said I would stop. | 15 |

Threads that cross missions are listed by id in `h_callbacks.json` (for example `sf_cb_sign`: Sci-Fi M3 line to M8 booth). The rule "a thread advances in at most one line per mission" is checked by the ledger lint through the `prog:` keys.

#### 3.2.5 Finale payoff surfaces

The Ancient finale is frozen, so every payoff sits on a surface that is not the Ancient results screen. Each era's payoff opens on `era_cleared:<era>` and nothing else. Spoiler rule: the Credits and the Stats tile show an era's finale lines only after that era is cleared. A player who clears one era sees that era's payoff; the all-four Passport needs all four (Ancient counts as cleared when all nine of its missions have a star, derived at migration, AR 3.5.2). From an Ancient-only save no new payoff exists, by design.

| era | surface | text |
|---|---|---|
| medieval | cleared card heading and stamp | PAGEANT COMPLETE: A wax-seal stamp, a gilded spoon, and a sticky note found underneath it. |
| medieval | cleared card sticky note (the one place the intern signs) | Wrong century? Try the one with the engines. They will love it. - Intern |
| modern | cleared card sheet one | PARCEL DELIVERED. Recipient: Zeus (on leave). Contents: one return ticket (to the right century), one sandwich initialled 'I.', one note reading 'Sorry about the routing.' Signature: Cassandra, reluctantly. |
| modern | cleared card sheet two | RISK ASSESSMENT: HELICOPTER (OVERHEAD). STATUS: LANDED. CAUSE: UNKNOWN. FILED BY: CASSANDRA. APPROVED BY: NOBODY. The helicopter has retired. |
| modern | hand-off fax (stapled to the card; no handwriting) | TO: Whom it may concern. RE: Next. FORWARDED TO: THE FUTURE. Please hold. |
| modern | M9 victory line (Plato, label simply PLATO) | I was heard. I would like it noted that I mostly said that this was a bad idea. |
| scifi | cleared card | THE END (OF THIS PICTURE). RATED G, FOR GLOWING. No bubble was harmed. Several were popped. Thank you for watching. Stay for the credits: there is a scene after the credits. |
| scifi | M9 victory line (Plato) | The war is won. The definition is not. I accept 'noise', provided the committee does. |
| all four | Time Passport (shown when the fourth era is cleared; `seen.cleared.passport`) | Ancient: a goat. Medieval: a groat. Modern: a boarding pass. The Future: a ticket stub. RETURN TICKET: PUNCHED. Destination: the booth, in the original century, at the original coffee. Brutus: 'It says UPDATING! That is the best word I have ever read!' Plato: 'I suspect the update is also the problem.' Cassandra: 'I said it would end like this.' Everyone agrees, for once. The booth is now a drive-in. The remote has been confiscated. Somebody has been promoted; we will not say who. |
| medieval | Stats screen finale tile | Predictions confirmed: 1 |
| medieval | Credits lines (role \| name) | Cassandra \| Chief Prophet (Now Verified) ; Dennis \| the back half of the dragon (has notes) |
| medieval | Credits tail | Plague: predicted. Dragon: predicted. Tabard: never predicted. Cassandra regrets nothing, except the tabard. |
| modern | Stats screen finale tile | Risk assessments filed: 1 (helicopters approved: 1) |
| modern | Credits lines (role \| name) | Radio discipline \| Plato, muted since Act I, by choice ; Biscuits \| morale, 80 percent |
| modern | Credits tail | Helicopter: approved. By the helicopter. Then it landed. |
| scifi | Stats screen finale tile | Surveys declined: 1 (offered: 1) |
| scifi | Credits lines (role \| name) | Time travel logistics \| unpaid, as foretold ; Booth catering \| popcorn (spilled) ; Sci-Fi \| shields by the Concord, rivets by the Rummage, regrets by the Quiet Hour, a survey by Courtesy |
| scifi | Credits tail | Bubbles: regrown. Warranty: void. Cassandra: pleased for four seconds. |

Credits structure (Credits screen, `humor/credits_text.js` per era): the v8 studio list (16 roles, 3 footer lines) is unchanged; below it each CLEARED era adds its `credits:<era>` block (role | name lines, then the tail line); AU7 appends the sound and music credits. Order of blocks: Ancient (unchanged), Medieval, Modern, Sci-Fi. A line is real text, never "TBD"; the credits test `credits_era.test.mjs` asserts each block has its role/name rows and a tail, and that no row names the intern (the Credits stay intern-free, per the Sci-Fi bible).

#### 3.2.6 What's New by release stage

D18 releases eras one at a time, so the card must be right when only Medieval, or Medieval and Modern, are released. The card lists one panel for each released era the profile has not seen, in `ERA_ORDER`; the footer appears once; the gore line appears only when `settings.goreMigrated`. A fresh profile never sees the card (silently marked). The card is for returning profiles, who by definition know the cast, so it carries no premise sentence; the arrival card carries it for everyone else.

| era | title | body |
|---|---|---|
| medieval | MEDIEVAL IS OPEN | Nine missions, six puzzles and a pageant that keeps going wrong. Pikes against horses, banners, gates, a physician and a dragon. |
| modern | MODERN IS OPEN | Nine missions, six puzzles and a briefing room with a headset problem. Guns that reload, cover that matters, pins, tanks with a back and a helicopter that approved itself. |
| scifi | THE FUTURE IS OPEN | Nine missions, six puzzles, one bubble that comes back. Hover tanks, cloaks, EMP, blink and an orbital strike with paperwork. |
| (card footer, once) | | Your Ancient save is exactly where you left it. |
| (gore line, only after migration) | | Gore style is now Auto: classic red in Ancient and Medieval, gentler in Modern and Sci-Fi. Change it in Settings > Gameplay. |

| release stage | released eras | card content for a returning profile |
|---|---|---|
| R1 | Ancient | no card (nothing is new); title roadmap tablet removed (CU) |
| R2 | + Medieval | Medieval panel, footer, gore line if migrated |
| R3 | + Modern | Modern panel and footer (Medieval panel only if not yet seen), gore line only if not yet shown |
| R4 | + Sci-Fi | Sci-Fi panel and footer (plus any unseen earlier panel) |

The Sci-Fi bible put "Your Ancient save is exactly where you left it." inside the Sci-Fi body; CU puts it in the card footer, so it is removed from the body (amendment recorded in section 6).

#### 3.2.7 The intern

The intern is an unseen presence: **no portrait, no voice, no fourth `who`**. Surfaces that may name him: arrival cards and their footers; chooser captions; god-power tooltips, alt jokes ("Intern's note: ..."), tutorial lines and cast announcer lines; the blocked-power message; the Medieval cleared-card sticky note. Surfaces that may IMPLY him (stationery only, no name): the Modern fax and sandwich, the Sci-Fi passport and blank sticky note, the stalemate interludes. Nowhere else: not an announcer template (except a god-power cast line), briefing, lesson, tip, bark, kill verb, loading line, mutator text or Credits row. At most one "Intern's note" line is visible on any screen. First mention and cold open: the Medieval arrival card (premise plus body), because Medieval is the first released new era; in any other entry order the premise of that era's card does the introduction. No surface depends on a prior mention: every intern string contains "Zeus's intern" or carries its own role clause ("the intern says this is the right century", "Intern's note:" inside a tooltip that already names the power). Lint `intern_surface` (3.10.3): any string containing the word `intern` must sit on a key whose surface is `card`, `chooser`, `power`, or be one of the explicitly listed ids; test `intern_cold.test.mjs` renders every intern string alone and asserts it contains `Zeus` or `intern's note` or `the intern` plus a verb. Measured today in the design copy: 10 intern strings, all on `card` surfaces, plus 1 ledger cast line (`mod_cb_wine_tea`, surface `power`); the god-power bibles add the tooltips and alt jokes.


### 3.3 The callback ledger (`h_callbacks.json`)

#### 3.3.1 Two types, one rule

A **callback** pairs a *source* (a thing the player met earlier) with a *target* (a later line that leans on it).

* **`setup-free`** (14 entries): the target is funny cold and funnier warm. It has no gate and is always eligible. It must pass the cold-read comprehension check (3.3.6). Example: `mod_cb_terms`, "The Terms of Conquest, Revision Nine, now in a plastic SLEEVE!"
* **`gated`** (57 entries): the target makes full sense only with the source, so it renders **only while its gate is open and at most once per profile**. Example: `mod_cb_trojan_box`, "A horse of men in a box. We keep returning to this shape.", open only if the profile has seen a Trojan Horse reveal.

The "reads in any entry order" requirement of `q2_product` Q9 is therefore met by construction: a gated line that the player cannot understand does not exist for that player.

#### 3.3.2 Entry format

```
{ id,                 // snake_case, unique; the bibles' ids are kept (mod_cb_*, sf_cb_*, med_*), new ones are x_cb_* or med_cb_*
  aliases?,           // ids of the same callback in another bible (mod_cb_robots = sf_cb_drones)
  type,               // "setup-free" | "gated"
  sourceEra, targetEra, requiresReleased[],   // a gated target renders only if every listed era is released
  source { key, surface, voice, text, frozen, class },   // frozen = a line of the Ancient pack (read from the live template); class = its neutral/convertible/ancient class
  target { key, surface, voice, text, where },           // where = the exact place and moment
  gate,               // null | {kind:"cb", flag, setBy} | {kind:"derived", expr, seq?} | {kind:"any"|"all", parts:[...]}
  repeat,             // null (once per profile); reserved
  check,              // {kind:"cold"...} for setup-free, {kind:"gate", cases:[...]} for gated
  origin }            // which bible row it came from, and what H changed
```

`key` shapes: `ann:<template id>` (announcer), `prog:<missionId>` (progression footer), `brief:<missionId>:<n|tag>`, `sp:<setpieceId>:<n>`, `card:<era>:arrival[.footer.k]|cleared`, `chooser:<era>:*`, `codex:<unit>:<field>`, `power:<powerId>:tooltip|cast`, `load:<era>:*`, `label:<voice>:muted`, `poster:<missionId>`, `defeat:<missionId>`, `progress:<era>:<fact>` (a save fact with no line). Ancient keys are the real template ids of `humor/announcer.js` and `source.text` is read from the live template by `tools/gen_callbacks.mjs`, never retyped, so the ledger cannot drift from the frozen text. New-era template ids named in a `target.key` or in a `cb` `setBy` are **assigned by this ledger** and the writer uses them verbatim (for example `ann:med_tabard`, `ann:mod_m7_drones`, `ann:sf_translator_first`).

#### 3.3.3 Gates: the closed vocabulary, who writes what, where it lives

A gate is evaluated from the save by one pure function `callbackOpen(id, save, released)` in `src/content/shared/callbacks_gen.js` (generated from the JSON, committed, "regeneration produces no diff" is a gate step). Two kinds:

| kind | meaning | stored where | written by | retroactive for a v8 profile |
|---|---|---|---|---|
| `derived` | computed at read time from a fact the save already holds; nothing new is stored | the fact's own key | the fact's existing writer (below) | yes, where the fact existed in v8 |
| `cb` | a flag: the source line was RENDERED | `seen.callbacks[flag]` (boolean, at most 400 keys, AR 3.5.2) | `callbacks.mark(flag)` in `src/ui/hud/_progress.js` (CU 3.19.5), called from exactly one place per flag: the `setBy` key | no (set going forward) |

Derived vocabulary (the lint rejects anything else):

| expr | reads | writer of the fact |
|---|---|---|
| `mission_star:<missionId>` | `progress.stars[missionId] >= 1` | `meta.recordMission` (existing) |
| `era_cleared:<era>` / `era_opened:<era>` | `progress.eras[era].cleared` / `.opened` | `meta.recordMission`; Ancient `cleared` is derived on migration from the nine mission stars (AR 3.5.2) |
| `stat:<path>>=<n>` with `<path>` in `chickenKills`, `trojanReveals`, `battles`, `wins`, `godPowers.<id>`, `byDef.<id>.spawned`, `eraStats.<era>.<key>` | `stats` (the lifetime object) | `LifetimeStats` (existing; `eraStats` per CU 3.9.3; `huzzahs` and `loadingSnail` by 3.15) |
| `ach:<id>` | `progress.achievements[id]` | the achievement checker (existing) |
| `codex_open:<unitId>` | `progress.codex.open[unitId]` | the Codex screen (CU-D29) |
| `any(...)`, `all(...)` | booleans over the above | n/a |

How the flag writers find their lines: (1) **new-era announcer templates** carry `cbSet: '<flag>'`; `meta.js` calls `callbacks.mark` when the emitted line has it (CU 3.18.2 rule 6); (2) **briefing, progression, card, set-piece, teaching, loading, label and poster renderers** call `callbacks.seen(key)` when they render a key listed as a `setBy` in the ledger (a generated `SET_ON` map, so no schema change to `missions.json` is needed: the closed MS schema stays closed); (3) **frozen Ancient lines and reused neutral ids** are marked through `cbSources` (header of the JSON): `meta.js` marks `ancient_grapes` when the Ancient era renders `battle_start_matchup`, `battle_start_grapes`, `victory_grapes` or `idle_filler_grapes`, and `platypus` when any era renders `idle_filler_platypus`. Ancient files are not edited (G4).

How the selector uses a gated target: the target template carries `cond: { cb: 'open:<ledgerId>' }` and `once: 'profile'`. `callbacks.has('open:<id>')` (the reader of CU 3.19.5, extended by this prefix) returns `callbackOpen(id, save, released) && !seen.callbacks['<id>:t']`, and the adapter writes `seen.callbacks['<id>:t']` when the line is rendered, so a gated target renders at most once per profile. This needs no change to `createAnnouncer` beyond CU18's existing `cond.cb`. Briefing tags, progression footers and card footers call the same function. Capacity: 57 rendered marks plus 12 flags = 69 of the 400 keys.

Rules for authors: (a) a gate that can be a derived fact must be one; a `cb` flag is allowed only when the save does not hold the fact (a rendered line, a muted label, a first translator subtitle); (b) a derived mission gate between two missions of the same era carries `seq: true` and the lint proves the source mission precedes the target mission (always true in play, because missions unlock in order); (c) a gate may read only eras listed in `requiresReleased`, so a gated line cannot name a hidden era's state; (d) the same flag has one `setBy`; (e) `era_cleared:ancient` means all nine Ancient missions have a star (not the shipped `ancient_history` achievement, which unlocks after one win, CU 3.9.6).

#### 3.3.4 Confirmed and corrected bible items

| bible item | decision |
|---|---|
| Sci-Fi asked COMEDY-EDITOR to confirm `cb.mod_done` and `cb.mod_drones` | **Confirmed.** `cb.mod_done` = `era_cleared:modern` (derived, nothing stored); `cb.med_done` = `era_cleared:medieval`; `cb.ancient_done` = `era_cleared:ancient`; `cb.mod_drones` = flag `mod_drones`, set by the Modern M7 booth line `ann:mod_m7_drones`. |
| `mod_cb_robots` (Modern file) and `sf_cb_drones` (Sci-Fi file) | The same pair described twice: one entry `mod_cb_robots`, `aliases: ["sf_cb_drones"]`, target wording from the Sci-Fi file. |
| `sf_cb_pizza` gated on `progress.eras.ancient.opened` | That is true for every profile (AR migration sets it), so the gate was vacuous: the entry is `setup-free`. |
| `mod_cb_plague` target reused the Medieval target verbatim | Rewritten in the ledger: "I predicted green once. Today's sparkle is orange. I take a smaller pleasure in it." |
| `med_huzzah` "eleven times" | Text now "more than ten times" so it is true at any count the gate allows (`huzzahs >= 11`). |
| `med_snail` gate "UI counter" | Stat `eraStats.medieval.loadingSnail >= 3`, written by the loading screen (3.15). |
| `med_spoon`, `med_dennis`, `mod_cb_dennis`, `sf_cb_dennis`, `mod_cb_goldfish`, `sf_cb_goldfish`, `med_hedge`, `med_pigeon` "set when the codex page opens or the mission is won" | Derived: `codex_open:<unit>` or `mission_star:<mission>`; no writer. |
| `ancient_trojan`, `chickenKills`, wine, zeus_left, philosopher, goat | Re-expressed as derived reads of existing lifetime facts (`trojanReveals`, `chickenKills`, `godPowers.wine_rain`, `ach:zeus_left`, `byDef.philosopher.spawned`, `mission_star:nile_crossing`), so a v8 profile that already earned them is covered. |
| Classification candidates (`x_cb_vendor`, `x_cb_wall` x3 faces, `med_cb_pizza`, `med_cb_delphi`, `x_cb_define`, platypus) | Added: `x_cb_vendor`, `med_cb_wall`, `mod_cb_wall`, `sf_cb_wall`, `med_cb_pizza`, `med_cb_delphi`, `sf_cb_define`, `x_cb_platypus`. The vendor gate has a stat leg (`battles >= 15`) as a retroactive proxy for a v8 profile. |
| Footers of the three arrival cards | Entered as gated entries (`med_intern`, `mod_cb_intern_footer`, `mod_cb_footer_ancient`, `sf_cb_footer_mod`, `sf_cb_footer_med`, `sf_cb_footer_ancient`) so the footer logic is tested by the same lint. |

#### 3.3.5 The 71 entries

Counts (computed by `callbacks_lint.mjs`): 71 entries, 57 gated, 14 setup-free; by TARGET era Medieval 20, Modern 21, Sci-Fi 30; by SOURCE era Ancient 27, Medieval 21, Modern 15, Sci-Fi 8; cross-era (source era differs from target era) 41; gate kinds derived 40, flag 16 (12 distinct flags), any 1, none 14. Floors enforced: at least 30 entries, at least 10 targets in each new era, at least 15 cross-era, at least 8 setup-free.

| # | id | type | source era -> target era | source key | target key and voice | gate |
|---|---|---|---|---|---|---|
| 1 | `med_cb_delphi` | gated | ancient -> medieval | `ann:prop_destroyed_insurance` | `ann:med_cb_delphi` [C] | `era_cleared:ancient` |
| 2 | `med_cb_pizza` | setup-free | ancient -> medieval | `ann:battle_start_welcome` | `ann:med_cb_pizza` [B] | none (setup-free) |
| 3 | `med_cb_wall` | setup-free | ancient -> medieval | `ann:battle_start_wall` | `ann:med_cb_wall` [C] | none (setup-free) |
| 4 | `med_contract` | gated | medieval -> medieval | `prog:med_tourney_trouble` | `prog:med_castle_dour` [P] | `mission_star:med_tourney_trouble` (seq) |
| 5 | `med_dennis` | gated | medieval -> medieval | `codex:pageant_dragon:codexJoke` | `sp:med_sp_dennis_meets_dragon:2` [C] | `any(codex_open:pageant_dragon,mission_star:med_pennywhistle_blaze)` |
| 6 | `med_goat` | gated | ancient -> medieval | `ann:med_battle_start_goat` | `ann:med_goat` [P] | `era_cleared:ancient` |
| 7 | `med_hedge` | gated | medieval -> medieval | `codex:yeomen:lore` | `ann:med_hedge` [P] | `mission_star:med_pennywhistle_blaze` (seq) |
| 8 | `med_huzzah` | gated | medieval -> medieval | `ann:med_retreat_huzzah` | `ann:med_huzzah` [P] | `stat:eraStats.medieval.huzzahs>=11` |
| 9 | `med_intern` | gated | ancient -> medieval | `progress:ancient:cleared` | `card:medieval:arrival.footer.0`  | `era_cleared:ancient` |
| 10 | `med_intern_chooser` | gated | ancient -> medieval | `progress:ancient:cleared` | `chooser:medieval:tooltip.cleared` [P] | `all(era_cleared:ancient,era_cleared:medieval)` |
| 11 | `med_pigeon` | gated | medieval -> medieval | `ann:med_dragon_pigeon` | `ann:med_pigeon` [B] | `mission_star:med_pennywhistle_blaze` (seq) |
| 12 | `med_plague` | gated | medieval -> medieval | `sp:med_sp_great_sniffle:2` | `ann:med_plague` [C] | cb `med_plague` |
| 13 | `med_plume` | gated | medieval -> medieval | `defeat:med_tourney_trouble` | `brief:med_grand_pageant:tag` [C] | cb `med_plume` |
| 14 | `med_snail` | gated | medieval -> medieval | `load:medieval:marginalia` | `ann:med_snail` [B] | `stat:eraStats.medieval.loadingSnail>=3` |
| 15 | `med_soup` | gated | medieval -> medieval | `power:med_soup_cart:tooltip` | `ann:med_soup` [C] | `stat:godPowers.med_soup_cart>=1` |
| 16 | `med_sponsor` | gated | medieval -> medieval | `prog:med_ford_dithering` | `prog:med_toll_bridge` [B] | `mission_star:med_ford_dithering` (seq) |
| 17 | `med_spoon` | gated | medieval -> medieval | `codex:hoardling:codexJoke` | `sp:med_grand_pageant:end` [B] | `any(codex_open:hoardling,codex_open:coin_golem)` |
| 18 | `med_stool` | gated | medieval -> medieval | `ann:med_banter_stool` | `ann:med_stool` [C] | cb `med_stool` |
| 19 | `med_tabard` | gated | medieval -> medieval | `prog:med_dress_rehearsal` | `ann:med_tabard` [B] | `mission_star:med_dress_rehearsal` (seq) |
| 20 | `x_cb_vendor` | gated | ancient -> medieval | `ann:battle_start_matchup` | `ann:x_cb_vendor` [P] | any(cb `ancient_grapes` ; `stat:battles>=15`) |
| 21 | `mod_cb_beige` | setup-free | modern -> modern | `prog:mod_hedgerow_picnic` | `ann:mod_cb_beige` [B] | none (setup-free) |
| 22 | `mod_cb_biscuits` | setup-free | modern -> modern | `codex:tin_hat_trooper:codexJoke` | `ann:mod_cb_biscuits` [C] | none (setup-free) |
| 23 | `mod_cb_chicken_cargo` | gated | ancient -> modern | `ann:chicken_kill` | `ann:mod_cb_chicken_cargo` [B] | `stat:chickenKills>=1` |
| 24 | `mod_cb_contract` | gated | medieval -> modern | `prog:med_tourney_trouble` | `ann:mod_cb_contract` [P] | `mission_star:med_tourney_trouble` |
| 25 | `mod_cb_cow` | gated | modern -> modern | `ann:mod_roadworks_cow` | `ann:mod_cb_cow` [B] | cb `mod_cow` |
| 26 | `mod_cb_dennis` | gated | medieval -> modern | `codex:pageant_dragon:codexJoke` | `ann:mod_cb_dennis` [C] | `any(codex_open:pageant_dragon,mission_star:med_pennywhistle_blaze)` |
| 27 | `mod_cb_footer_ancient` | gated | ancient -> modern | `progress:ancient:cleared` | `card:modern:arrival.footer.1`  | `era_cleared:ancient` |
| 28 | `mod_cb_goat_van` | gated | ancient -> modern | `progress:ancient:nile_crossing` | `ann:mod_cb_goat_van` [C] | `mission_star:nile_crossing` |
| 29 | `mod_cb_goldfish` | gated | modern -> modern | `codex:fishbowl_chopper:codexJoke` | `ann:mod_cb_goldfish` [P] | `any(codex_open:fishbowl_chopper,mission_star:mod_airfield_open_day)` |
| 30 | `mod_cb_headset` | setup-free | modern -> modern | `card:modern:arrival` | `brief:mod_bridge_too_far:tag` [B] | none (setup-free) |
| 31 | `mod_cb_helicopter` | gated | modern -> modern | `sp:mod_sp_hold_music:0` | `ann:mod_cb_helicopter` [C] | cb `mod_helicopter` |
| 32 | `mod_cb_intern_footer` | gated | medieval -> modern | `card:medieval:cleared` | `card:modern:arrival.footer.0`  | `era_cleared:medieval` |
| 33 | `mod_cb_over` | setup-free | modern -> modern | `ann:mod_e1_over` | `ann:mod_cb_over` [C] | none (setup-free) |
| 34 | `mod_cb_parcel` | gated | modern -> modern | `brief:mod_bridge_too_far:0` | `ann:mod_cb_parcel` [C] | cb `mod_parcel` |
| 35 | `mod_cb_pizza` | setup-free | ancient -> modern | `ann:battle_start_welcome` | `ann:mod_cb_pizza` [B] | none (setup-free) |
| 36 | `mod_cb_plague` | gated | medieval -> modern | `sp:med_sp_great_sniffle:2` | `ann:mod_cb_plague` [C] | cb `med_plague` |
| 37 | `mod_cb_plato_muted` | gated | modern -> modern | `label:plato:muted` | `ann:mod_plato_muted_payoff` [P] | cb `mod_plato_muted` |
| 38 | `mod_cb_terms` | setup-free | ancient -> modern | `ann:battle_start_terms` | `ann:mod_cb_terms` [B] | none (setup-free) |
| 39 | `mod_cb_trojan_box` | gated | ancient -> modern | `ann:trojan_open` | `ann:mod_cb_trojan_box` [P] | `stat:trojanReveals>=1` |
| 40 | `mod_cb_wall` | setup-free | ancient -> modern | `ann:battle_start_wall` | `ann:mod_cb_wall` [C] | none (setup-free) |
| 41 | `mod_cb_wine_tea` | gated | ancient -> modern | `ann:god_power_wine` | `power:mod_gp_tea_break:cast` [P] | `stat:godPowers.wine_rain>=1` |
| 42 | `mod_cb_robots` (= `sf_cb_drones`) | gated | modern -> scifi | `ann:mod_m7_drones` | `ann:sf_cb_drones` [C] | cb `mod_drones` |
| 43 | `sf_cb_chicken` | gated | ancient -> scifi | `ann:chicken_kill` | `ann:sf_cb_chicken` [P] | `stat:chickenKills>=1` |
| 44 | `sf_cb_contract` | gated | medieval -> scifi | `prog:med_tourney_trouble` | `ann:sf_cb_contract` [P] | `mission_star:med_tourney_trouble` |
| 45 | `sf_cb_define` | setup-free | ancient -> scifi | `ann:battle_start_define` | `prog:sf_noise_complaint` [P] | none (setup-free) |
| 46 | `sf_cb_dennis` | gated | medieval -> scifi | `codex:pageant_dragon:codexJoke` | `ann:sf_cb_dennis` [P] | `any(codex_open:pageant_dragon,mission_star:med_pennywhistle_blaze)` |
| 47 | `sf_cb_footer_ancient` | gated | ancient -> scifi | `progress:ancient:cleared` | `card:scifi:arrival.footer.2`  | `era_cleared:ancient` |
| 48 | `sf_cb_footer_med` | gated | medieval -> scifi | `card:medieval:cleared` | `card:scifi:arrival.footer.1`  | `era_cleared:medieval` |
| 49 | `sf_cb_footer_mod` | gated | modern -> scifi | `card:modern:cleared` | `card:scifi:arrival.footer.0`  | `era_cleared:modern` |
| 50 | `sf_cb_gift` | gated | ancient -> scifi | `ann:sf_pod_arrives` | `ann:sf_cb_gift` [C] | `stat:trojanReveals>=1` |
| 51 | `sf_cb_goat` | gated | ancient -> scifi | `ann:sf_goat_squint` | `ann:sf_cb_goat` [B] | `mission_star:nile_crossing` |
| 52 | `sf_cb_goldfish` | gated | modern -> scifi | `codex:fishbowl_chopper:codexJoke` | `ann:sf_cb_goldfish` [P] | `any(codex_open:fishbowl_chopper,mission_star:mod_airfield_open_day)` |
| 53 | `sf_cb_headset` | setup-free | scifi -> scifi | `card:scifi:arrival` | `ann:sf_cb_headset` [B] | none (setup-free) |
| 54 | `sf_cb_helicopter` | gated | modern -> scifi | `sp:mod_sp_hold_music:0` | `ann:sf_cb_helicopter` [C] | cb `mod_helicopter` |
| 55 | `sf_cb_lease` | gated | scifi -> scifi | `poster:sf_lunch_break` | `ann:sf_cb_lease` [C] | cb `sf_lease` |
| 56 | `sf_cb_mic` | gated | scifi -> scifi | `prog:sf_express_delivery` | `ann:sf_cb_mic` [P] | `mission_star:sf_express_delivery` (seq) |
| 57 | `sf_cb_muted` | gated | modern -> scifi | `label:plato:muted` | `ann:sf_cb_muted` [P] | cb `mod_plato_muted` |
| 58 | `sf_cb_parcel` | gated | modern -> scifi | `brief:mod_bridge_too_far:0` | `brief:sf_express_delivery:tag` [C] | cb `mod_parcel` |
| 59 | `sf_cb_philosopher` | gated | ancient -> scifi | `ann:philosopher_monologue` | `ann:sf_cb_philosopher` [P] | `stat:byDef.philosopher.spawned>=1` |
| 60 | `sf_cb_pizza` | setup-free | ancient -> scifi | `ann:battle_start_welcome` | `ann:sf_cb_pizza` [B] | none (setup-free) |
| 61 | `sf_cb_plague` | gated | medieval -> scifi | `sp:med_sp_great_sniffle:2` | `ann:sf_cb_plague` [C] | cb `med_plague` |
| 62 | `sf_cb_popcorn` | gated | scifi -> scifi | `prog:sf_floor_lava` | `ann:sf_cb_popcorn` [B] | `mission_star:sf_floor_lava` (seq) |
| 63 | `sf_cb_robots` | gated | scifi -> scifi | `ann:sf_m5_robots` | `prog:sf_grand_reopening` [C] | `mission_star:sf_turn_it_off` (seq) |
| 64 | `sf_cb_sign` | gated | scifi -> scifi | `prog:sf_overclock_oops` | `ann:sf_cb_sign` [C] | `mission_star:sf_overclock_oops` (seq) |
| 65 | `sf_cb_survey` | gated | scifi -> scifi | `prog:sf_turn_it_off` | `ann:sf_cb_survey` [P] | `mission_star:sf_turn_it_off` (seq) |
| 66 | `sf_cb_terms` | setup-free | ancient -> scifi | `ann:battle_start_terms` | `ann:sf_cb_terms` [B] | none (setup-free) |
| 67 | `sf_cb_translator` | gated | scifi -> scifi | `ann:sf_translator_first` | `ann:sf_cb_translator` [B] | cb `sf_translator` |
| 68 | `sf_cb_wall` | setup-free | ancient -> scifi | `ann:battle_start_wall` | `ann:sf_cb_wall` [C] | none (setup-free) |
| 69 | `sf_cb_wine` | gated | ancient -> scifi | `ann:god_power_wine` | `power:sf_nano_spritz:cast` [P] | `stat:godPowers.wine_rain>=1` |
| 70 | `sf_cb_zeus_left` | gated | ancient -> scifi | `ann:zeus_left` | `ann:sf_cb_zeus_left` [C] | `ach:zeus_left` |
| 71 | `x_cb_platypus` | gated | ancient -> scifi | `ann:idle_filler_platypus` | `ann:x_cb_platypus` [P] | cb `platypus` |

Texts, `where`, origin and checks are in the JSON; the table is generated from it.

#### 3.3.6 Comprehension checks

* **setup-free (14):** the target is shown ALONE (no neighbouring lines, names masked as in the panel) to the 3 raters of 3.11 with the fixed question "In one sentence, what is the joke?". Pass: at least 2 of 3 answers state a joke that is not "I do not understand" and no rater flags `confusing`. A failing line is rewritten (never deleted) and re-run in a fresh batch, within the rewrite cap of 3.11. The 14 are `med_cb_pizza med_cb_wall mod_cb_headset mod_cb_terms mod_cb_pizza mod_cb_over mod_cb_biscuits mod_cb_beige mod_cb_wall sf_cb_headset sf_cb_pizza sf_cb_terms sf_cb_wall sf_cb_define`.
* **gated (57):** automatic, no panel: `tests/humor/callbacks.test.mjs` builds a stubbed save, flips each gate (closed then open), runs the real selector 200 times and asserts the target never renders closed, renders when open, and renders at most once per profile. The gated targets are also read once by the panel as ordinary lines of their surface (they are scored with their warm context in the prompt for these lines only: the source text is appended as "the earlier line: ...").

#### 3.3.7 Tests and negative controls (the lint was run)

`tools/callbacks_lint.mjs` (appendix B) checks: unique ids and shapes; type/gate agreement (a setup-free entry has no gate and a cold check; a gated entry has a gate and a gate check); the closed gate vocabulary; every mission and unit id named in a gate exists in the era's `context.json`; stat paths on the whitelist; `seq` order; `requiresReleased` covers the gate's eras; one `setBy` per flag; target word limit (24; 30 for progression; 70 for cards); Brutus caps groups at most 2; the minimums above. Results on the committed file: 0 errors. Mutations run against it (each turned the lint red, the control stayed green):

| mutation | lint says |
|---|---|
| remove a gate from a gated entry | `gated needs a gate` |
| gate names a mission that does not exist | `unknown mission` |
| a setup-free entry gets a gate | `setup-free must not have a gate` |
| duplicate id | `duplicate id` |
| sequential gate points at the same mission | `seq gate: X is not before X` |
| Brutus target with four caps groups | `Brutus line has 4 caps groups (max 2)` |
| stat path outside the whitelist | `stat path not whitelisted` |
| flag without a writer | `cb gate needs setBy` |
| `requiresReleased` drops the source era | `requiresReleased must contain sourceEra and targetEra` |
| 45 entries deleted | `only 26 entries (< 30)` |
| target of 31 words | `target text 31 words > 24` |
| two writers for one flag | `flag has 2 different setBy keys` |

The runtime tests are in section 4 (T-H10 to T-H13).

#### 3.3.8 What different players see (the order test in prose)

| player | sees | does not see |
|---|---|---|
| Ancient veteran (trojan reveal, 30 chicken kills, wine rain used), starts Modern | `mod_cb_trojan_box` at the first lunchbox bailout of M4, `mod_cb_chicken_cargo` in M5, the two pizza and terms setup-free lines; the Modern arrival card with the `ancient_done` footer once Ancient is cleared | any Medieval-gated line |
| New player, starts Sci-Fi, never played anything | the Sci-Fi arrival card with premise; `sf_cb_headset`, `sf_cb_terms`, `sf_cb_pizza`, `sf_cb_wall`, `sf_cb_define` (all setup-free, all funny cold); the within-era threads (`sf_cb_popcorn`, `sf_cb_sign`, `sf_cb_mic`, `sf_cb_survey`, `sf_cb_robots`) in order | all 18 gated lines that lean on another era (3 of them are arrival footers) |
| Medieval-then-Modern, nothing cleared | the within-era threads of both eras; `mod_cb_contract` after `mission_star:med_tourney_trouble` (the source mission was won); `sf_cb_*` none yet | footers (no era cleared) |
| All three earlier eras cleared, enters Sci-Fi | the premise is skipped (stars exist), the Modern footer, plus every cross-era line whose source the save proves | the Medieval and Ancient footers (exclusive: at most one) |


### 3.4 The text-layer count table

Every layer of text a player can read, per era, with count, source file, owner and limits. Three bases: **fixed** (arithmetic over design counts that exist today: 34 units per era, 9 missions, 12 achievements, `missions.json`), **rule** (a convention fixed here), **generated** (a matrix the registry builds from the roster and the sim; the figure is a planning value and the generated number replaces it at E-FREEZE through `tools/text_matrix.mjs --era`, which writes `manifest.expect.textLayers`). The `Ancient` column is measured on the same layers from `src/content/era_ancient` (`scratchpad/count.mjs`, strings counted, ids and cues excluded). Row ids are the keys of `manifest.expect.textLayers.<id>`; the sum row is `manifest.expect.textStrings`; `plan_lint` compares both with this table (AR OI-1, CU OI-CU2).

| id | layer | source file | owner | Medieval | Modern | Sci-Fi | floor (per era) | Ancient (same layer, measured) | basis | limits |
|---|---|---|---|---|---|---|---|---|---|---|
| U1 | unit core text: name, plural, blurb, lore, codexJoke, 3 deaths, 2 taunts | `era_<id>/humor/units_text.js (UNIT_TEXT)` | COMEDY-x | 340 | 340 | 340 | 340 | 430 | fixed | blurb 6..14 words, lore 18..35, deaths >= 3 and 3..12 words, taunts >= 2 and <= 10 words (test cap 12), codexJoke 5..25 words (UC-51) |
| U2 | unit mechanic string (one line names the unit's own mechanic, UC-52) | `same file, `row.text.mechanic.key`` | COMEDY-x | 34 | 34 | 34 | 34 | - | fixed | a blurb, lore or codexJoke word set from mechanicWords(def) |
| U3 | hero / monster / boss extra strings (15 instead of 11: +4 each) | `same file` | COMEDY-x | 48 | 32 | 32 | 0 | - | fixed | UC-50: >= 15 for role hero, role monster, tag boss |
| U4 | unit moment lists (answers to the sim's ability moments: >= 14 lists x 2 lines) | `same file (moment keys)` | COMEDY-x | 40 | 40 | 40 | 28 | 70 | rule | each list >= 2 lines, each <= 12 words (UC-53) |
| B1 | class barks: used bark roles x 4 states x 2 lines | `era_<id>/humor/barks.js (BARKS)` | COMEDY-x | 80 | 80 | 80 | 72 | 75 | rule | each <= 10 words (test cap); roles `vehicle` and `air` included where the roster has them |
| B2 | sim bark keys: 3 lines per (bark key, role family) pair the roster can emit | `era_<id>/sim_text.js (SIM_BARKS)` | COMEDY-x | 108 | 108 | 108 | 90 | 145 | generated | planning value 36 pairs x 3; replaced by `tools/text_matrix.mjs --era` output at E-FREEZE; each <= 12 words; keys of spec/M 3.12 |
| B3 | generic fallbacks: generic deaths 6, generic taunts 4, monologue/crowd bubbles 4 | `barks.js (GENERIC_DEATHS, GENERIC_TAUNTS, MONOLOGUE)` | COMEDY-x | 14 | 14 | 14 | 12 | 14 | rule | <= 12 words |
| L1 | results lessons: 12 era detectors x (3 text + 3 fix) + 8 frame x (3 + 2) + 9 pads x (2 + 1) | `era_<id>/lesson_text.js (LESSON_TEXT)` | COMEDY-x | 139 | 139 | 139 | 123 | 102 | rule | text <= 20 words, fix <= 14; every template true in context (copy-in-context test A1..A6) |
| K1 | kill verbs: observed causes x 6 `by` + 3 `solo` for each environmental cause | `era_<id>/humor/killverbs.js (KILL_VERBS)` | COMEDY-x | 87 | 87 | 102 | 72 | 163 | generated | planning causes 12 / 12 / 14 (S46 fuzz sets the real list); 1..4 words, <= 31 chars for melee/ranged-class causes; gender-neutral |
| R1 | results funny-stat labels: 22 stat keys x 3 wordings | `era_<id>/humor/results_text.js (RESULT_LABELS)` | COMEDY-x | 66 | 66 | 66 | 54 | 66 | rule | floor 18 keys x 3; show only stats with value > 0 |
| R2 | Stats screen absurd tiles (7 x label + sub) + finale tile (1) | `era_<id>/ui.js (`absurd`, `stats.labels`)` | COMEDY-x + UI | 15 | 15 | 15 | 11 | 14 | rule | <= 8 words per label |
| A1 | achievements: 12 x (name + desc) + 1 hidden unlock text | `era_<id>/humor/achievements.js` | COMEDY-x | 25 | 25 | 25 | 25 | 48 | fixed | desc <= 22 words (test cap); designs in mutators_achievements.md |
| M1 | era mutators: 2 x (name, desc, short, joke, locked) + 2 x 3 announcer hooks | `era_<id>/humor/mutators_text.js` | COMEDY-x | 16 | 16 | 16 | 16 | - | fixed | short <= 6 words |
| M2 | shared-mutator overlays (name, desc, short per overlaid mutator) + disabled-pair reasons | `same file (`MUTATOR_TEXT` byEra, `MUTATOR_RULES`)` | COMEDY-x | 5 | 9 | 11 | 5 | - | fixed | Medieval: chicken_rain overlay (3) + 2 reasons; Modern: chicken + wine overlays (6) + 3 reasons; Sci-Fi: moon_gravity (4) + chicken + wine (6) + 1 reason; short <= 6 words |
| T1 | tips: 40 per era (12 in the bible, 12 converted or reused of the 20 reusable, 16 new) | `era_<id>/humor/tips.js` | COMEDY-x | 40 | 40 | 40 | 30 | 63 | rule | <= 18 words; half hints, half jokes (hints >= 16, jokes >= 16 at 40); every claim true of the rules |
| N1 | announcer: era-new templates (arenas 36, campaign 27, shortfall 12, signature 72/90/108, shadow 48, ability 18, god-power 18, mutator hooks counted in M1) | `era_<id>/humor/announcer.js (own[])` | COMEDY-x | 231 | 249 | 267 | 200 | 486 | fixed | <= 22 words; Brutus caps law; categories of 3.5 |
| N2 | announcer: reused Ancient ids + shared rewrites (not new text; counted for the pool, not for writing) | `announcer_shared.js + ids[]` | COMEDY-EDITOR (once, shared) | 227 | 226 | 226 | 190 | - | fixed | hybrid partition of 3.5; verbatim neutral lines are never edited |
| N4 | callback target lines on announcer, god-power, briefing-tag and chooser surfaces (ledger targets that are not progression, card or set-piece lines) | `h_callbacks.json -> announcer.js / godpowers.js / ui.js` | COMEDY-x | 15 | 19 | 25 | 12 | - | fixed | texts live in the ledger; one template per entry; counted in announcerEffective only for `ann:` targets |
| N3 | announcer data: ARENA_NAMES 12, MISSION_TITLES 9, PROP_NAMES (killable props) 12, HEROES (names only) | `announcer pool object` | COMEDY-x | 33 | 33 | 33 | 33 | 37 | rule | display names only |
| C1 | mission card: title + blurb x 9 | `era_<id>/campaign_text.js (CAMPAIGN_TEXT / missions.json text)` | COMEDY-x | 18 | 18 | 18 | 18 | 18 | fixed | blurb <= 30 words |
| C2 | briefing lines: 9 missions x 3 voices (floor 27, one speech per voice) up to 4 average (target 36) | `same` | COMEDY-x | 36 | 36 | 36 | 27 | 36 | fixed | 3..5 lines per mission, all three voices, each <= 30 words |
| C3 | victory 9 + defeat 9 | `same` | COMEDY-x | 18 | 18 | 18 | 18 | 18 | fixed | one line each, <= 30 words |
| C4 | star lines 9 x 3 | `same` | COMEDY-x | 27 | 27 | 27 | 27 | 27 | fixed | helper-rendered numbers (`{par}`); bare stock star-2 allowed in <= 5 of 9 missions |
| C5 | reward title + blurb x 9; reward part names + blurbs | `same (+ rewardParts)` | COMEDY-x | 34 | 32 | 28 | 18 | 44 | fixed | blurb <= 22 words |
| C6 | mission rule bullets 9 x 3 | `same` | COMEDY-x | 27 | 27 | 27 | 27 | 27 | fixed | a line starting "Star 3" is copy-truth checked (MS-K05) |
| C7 | acts: 3 x (title + blurb) | `ui.js `acts`` | COMEDY-x | 6 | 6 | 6 | 6 | 6 | fixed |  |
| C8 | progression lines (one per mission; SF M3 has two voices) | `era_<id>/humor/arc.js (new file)` | COMEDY-x | 11 | 9 | 10 | 9 | - | fixed | <= 30 words; shown once, on the first win; Medieval M6 and M9 and Sci-Fi M3 carry two voices |
| C9 | set-piece announcer lines: 12 packages x 3 voices | `missions.json `setpiece` / `extraSetpieces`` | COMEDY-x | 36 | 36 | 36 | 36 | - | fixed | <= 22 words; one per voice |
| C10 | teaching: era beats (text + hint) + first-sight toasts | `era_<id>/teaching.js` | COMEDY-x | 105 | 125 | 119 | 60 | 15 | fixed | beat <= 24 words; toast <= 16 words; counts from missions.json beats + design toasts |
| C11 | puzzles: 6 x (title, blurb, hint, goalText, 3 star lines, first-sight beat) | `era_<id>/puzzles.js` | COMEDY-x | 48 | 48 | 48 | 48 | 36 | fixed | hint names the mechanic; first-sight beat names it too |
| C12 | powers.reasons: one line per disabled power per mission | `missions.json `powers.reasons`` | COMEDY-x | 2 | 1 | 1 | 1 | - | fixed | <= 14 words; the era default `powerBlocked` plus one line per mission whose reason differs from it (Medieval M4) |
| C13 | god powers: 6 x (name, tooltip joke, tutorialLine, one-line description) | `era_<id>/godpowers.js` | COMEDY-x | 24 | 24 | 24 | 24 | 12 | fixed | tooltip <= 24 words; the intern may appear |
| S1 | scout texts: codes x (default + 2 variants) | `era_<id>/humor/scout_text.js` | COMEDY-x | 39 | 42 | 54 | 27 | 27 | fixed | <= 32 words; true advice; voices vary within a code (CU 3.14.3) |
| S2 | faction texts: 6 x (name, lore line, Quick doctrine name, doctrine text) | `era_<id>/factions text` | COMEDY-x | 24 | 24 | 24 | 18 | 28 | rule | lore <= 35 words |
| S3 | arena texts: 12 x (name, blurb, 3 tactic chips) | `era_<id>/arenas.js` | COMEDY-x | 60 | 60 | 60 | 55 | 80 | rule | blurb <= 30 words, chips <= 3 words |
| S4 | prop display names (catalogue) 38 | `era_<id>/props/catalog.js` | COMEDY-x | 38 | 38 | 38 | 34 | 41 | fixed | 1..4 words |
| S5 | wave names 20 + boss names 5 + boss intermission memos 5 | `era_<id>/wave_names.js` | COMEDY-x | 30 | 30 | 30 | 30 | 25 | fixed | wave name <= 5 words, at most 9 of 20 open with "The" |
| S6 | loading lines | `era_<id>/ui.js `loading.lines`` | COMEDY-x | 20 | 20 | 20 | 20 | 20 | fixed | present participle ending "...", <= 10 words (brackets allowed in Sci-Fi) |
| S7 | Quick Battle presets (name + unlock hint) 8 | `era_<id>/quick_presets.js` | COMEDY-x | 16 | 16 | 16 | 12 | - | rule | <= 6 words name, <= 14 words hint |
| H1 | custom-soldier names: 10 titles + 2 first-name pools x 24 + 40 epithets | `era_<id>/humor/names.js` | COMEDY-x | 98 | 98 | 98 | 70 | 198 | rule | epithets unique, >= 40; no real person's name (REAL_WORLD) |
| H2 | custom-soldier classes: labels 7, ability texts 12, catchphrases 12, death quotes 15, blurbs 6, codex jokes 3, lore 3 | `era_<id>/custom_text.js` | COMEDY-x | 58 | 58 | 58 | 45 | 88 | rule | death quotes <= 12 words |
| X1 | era UI: chooser, arrival, cleared, what's new, passport, sub-lines, difficulty, About | `era_<id>/ui.js` | COMEDY-x + UI | 30 | 32 | 34 | 24 | - | fixed | cards of 3.4 here; arrival body <= 70 words |
| X2 | Codex Mechanics tab: 8 mechanics x (name, rule, tell, counter) | `era_<id>/ui.js `mechanics`` | COMEDY-x + UI | 32 | 32 | 32 | 24 | - | rule | rule <= 20 words; tell <= 12; counter <= 14 |
| X3 | pause quips | `era_<id>/ui.js `pause.subs`` | COMEDY-x | 12 | 12 | 12 | 12 | 16 | rule | <= 16 words; never the same twice in a row |
| X4 | getTB battle-side overlays (assist: offered, suggestedBtn, enemyHeader, andMore; results `warned`; HUD labels; interlude strings) | `era_<id>/ui.js `tb`` | COMEDY-x + UI | 25 | 25 | 25 | 20 | - | rule | <= 14 words each |
| X5 | help overlay lines, photo-mode captions, empty states specific to the era | `era_<id>/ui.js` | COMEDY-x | 10 | 10 | 10 | 8 | - | rule | <= 16 words |
| X6 | credits: era lines + tail | `era_<id>/humor/credits_text.js` | COMEDY-x | 3 | 3 | 4 | 3 | 35 | fixed | finale payoff lines of 3.2.5 here |
| X7 | loading-screen marginalia / chooser tooltips / stamps | `era_<id>/ui.js` | COMEDY-x | 6 | 6 | 6 | 4 | - | rule | <= 12 words |
| **sum** | **strings to write per era (N2, the reused announcer ids, excluded)** | | | **2229** | **2259** | **2306** | **1882** | **2510** | | three-era total **6794** |

Group totals (strings to write per era):

| group | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| units | 462 | 446 | 446 |
| barks | 202 | 202 | 202 |
| lessons | 139 | 139 | 139 |
| verbs | 87 | 87 | 102 |
| results | 81 | 81 | 81 |
| meta | 86 | 90 | 92 |
| announcer | 279 | 301 | 325 |
| campaign | 392 | 407 | 398 |
| content | 227 | 230 | 242 |
| names | 156 | 156 | 156 |
| ui | 118 | 120 | 123 |

**Shared layers, written once and used by all three eras (83 strings; not in the per-era sums):**

| id | layer | strings |
|---|---|---|
| Z1 | basics beats: 5 texts, the `b_powers` hint, 3 `b_place_line` hints (3.12.6) | 9 |
| Z2 | meta achievements (3 x name + description) | 6 |
| Z3 | milestone titles | 5 |
| Z4 | Campaign tile sub-lines (3) and the About tagline (1) | 4 |
| Z5 | Ancient chooser copy (caption, begin, continue, replay) | 4 |
| Z6 | announcer convertible rewrites `sh_*` (44 rows of the classification) | 44 |
| Z7 | convertible tip rewrites (9 rows of the classification) | 9 |
| Z8 | What's New footer and gore line | 2 |
| | **total** | **83** |

**Plan section 1 "other text layers" restated** (`q3_product` 17: the plan printed totals under a "per era" header):

| layer | per era | three eras | Ancient |
|---|---|---|---|
| briefing speeches (3 voices x 9 missions; floor 27 lines, target 36 lines at 3 to 5 lines per mission) | 27 (36) | 81 (108) | 9 missions, 36 lines |
| victory + defeat lines | 18 | 54 | 18 |
| star lines | 27 | 81 | 27 |
| reward blurbs (plus 9 titles) | 9 | 27 | 9 |
| lessons per detector | 12 detectors x 6, 8 frame x 5, 9 pads x 3 = 139 | 417 | 102 |
| kill verbs per cause | 87 / 87 / 102 | 276 | 163 |
| barks per role | 80 class barks + 108 sim bark keys + 14 fallbacks | 606 | 234 |
| scout texts | 39 / 42 / 54 | 135 | 27 |
| arrival, chooser, what's-new, help copy | 30 / 32 / 34 + 10 + 25 | | 0 |
| hero names (custom soldiers) | 98 | 294 | 198 |

Plan corrections this table forces are in section 6 (PC-H1, PC-H2).

### 3.5 The announcer pool

#### 3.5.1 Engine side (what CU18 builds, what H feeds it)

`createAnnouncer({rng, stats, era, pool})` with `pool = {templates, arenaNames, missionTitles, propNames, heroes, abilitySub, eventCases, categoryPriority, statTable}` (CU 3.18.2). The per-era **pool object** H delivers is `{ ids: string[], shared: string[], own: Template[] }`: `ids` = Ancient neutral template ids used verbatim, `shared` = `sh_<ancientId>` rewrites of convertible rows (generated into `src/content/shared/humor/announcer_shared.js` by `tools/gen_shared_announcer.mjs` from the FROZEN classification), `own` = the era's templates (`med_*`, `mod_*`, `sf_*`). A chain head brings its follow beats. `eventCases` are the era's routes as data (3.5.4). Data H needs from the kit: `HEROES` (ids), `PROP_NAMES`, effect-kind god-power subs (`strike_area_delayed zone_quake heal_area strike_point`), hazard subs only for hazards the arena has, plural and proper flags for every unit, a `gag` field on templates with a per-battle cap (at most 2 Terms lines, 2 wall lines, 2 vendor lines per battle), `{pct}` in the misfire payload and `{n}` in the strike payload (classification OI-3, accepted).

#### 3.5.2 Classification gate (nothing is reused before this is done)

The first agent read exists (`ancient_announcer_classification.csv`, 575 rows: 473 announcer, 63 tips, 20 loading, 19 credits). COORD's rule stands: no new era uses an Ancient line until the second read is signed. **Second read protocol (OI-1):** a fresh REVIEWER session with a different prompt and the class column hidden reads all 575 rows and writes `ancient_announcer_classification.review.csv` (`id,class2,reason2`). **Adjudication is conservative and mechanical:** if either read says `ancient`, the final class is `ancient`; neutral against convertible becomes `convertible` (it needs a rewrite); agreement stands. Cohen's kappa on the three classes must be at least 0.6, else a third fresh read decides by majority. The CSV gains a `final_class` column and a header line `# signed: REVIEWER <date> <sha256 of the body>`; `tools/gen_shared_announcer.mjs` and the pool tests refuse to run without it. After signing the CSV is frozen (ids and classes change only by a logged amendment). Expected effect of the conservative union: the reusable count can only fall from 286; the pool arithmetic below states the margin (the effective pool exceeds 300 by 177 or more, so a fall of up to 100 reusable lines is absorbed without a cut).

#### 3.5.3 The partition rule and the pool arithmetic (computed from the CSV)

Reusable = class neutral or convertible, announcer rows only (473 non-follow rows). Categories are routed `generic` (24), `melee` (`brace`), `ancient` (13 signature categories), or `mission` (9 `campaign_*`). **Reuse rules:**

1. `ancient` and `mission` categories are never reused (T-H3).
2. `brace` is reused by Medieval only (3 convertible rewrites); Modern and Sci-Fi drop it.
3. A generic category with 12 or more reusable lines is **partitioned**: the line `id` goes to every new era except `fnv1a32(id) mod 3` (0 Medieval, 1 Modern, 2 Sci-Fi), so each reused line serves two of the three new eras. There are 7 such categories: `battle_start first_blood rout lead_change big_swing victory defeat`. Every other generic category is shared by all three eras.
4. `fnv1a32` is the standard 32-bit FNV-1a over the UTF-16 code units of the id (`h = 0x811c9dc5; h ^= c; h = Math.imul(h, 0x01000193) >>> 0`).

Result: reused lines per era **227 / 226 / 226** (the classification's draft table said 227 / 229 / 229 because it used another seed order; this rule is the binding one and `tools/gen_shared_announcer.mjs` must reproduce these numbers, T-H4).

| category | route | rows | neutral | convertible | ancient | reusable | partitioned | used by Medieval / Modern / Sci-Fi | R | era-new needed |
|---|---|---|---|---|---|---|---|---|---|---|
| `battle_start` | generic | 97 | 47 | 5 | 45 | 52 | yes (FNV-1a mod 3) | 36 / 38 / 30 | 6 | 0 |
| `first_blood` | generic | 22 | 15 | 3 | 4 | 18 | yes (FNV-1a mod 3) | 11 / 11 / 14 | 9 | 0 |
| `kill_streak` | generic | 12 | 8 | 1 | 3 | 9 | no | 9 / 9 / 9 | 7 | 0 |
| `hero_down` | generic | 10 | 10 | 0 | 0 | 10 | no | 10 / 10 / 10 | 6 | 0 |
| `friendly_fire` | generic | 7 | 5 | 2 | 0 | 7 | no | 7 / 7 / 7 | 6 | 0 |
| `rout` | generic | 13 | 13 | 0 | 0 | 13 | yes (FNV-1a mod 3) | 8 / 8 / 10 | 6 | 0 |
| `charge` | generic | 5 | 3 | 2 | 0 | 5 | no | 5 / 5 / 5 | 6 | 1 |
| `volley` | generic | 7 | 1 | 4 | 2 | 5 | no | 5 / 5 / 5 | 6 | 1 |
| `boulder` | generic | 5 | 1 | 4 | 0 | 5 | no | 5 / 5 / 5 | 6 | 1 |
| `misfire` | generic | 4 | 2 | 2 | 0 | 4 | no | 4 / 4 / 4 | 6 | 2 |
| `hazard` | generic | 8 | 8 | 0 | 0 | 8 | no | 8 / 8 / 8 | 6 | 0 |
| `lead_change` | generic | 16 | 13 | 3 | 0 | 16 | yes (FNV-1a mod 3) | 12 / 12 / 8 | 6 | 0 |
| `comeback` | generic | 6 | 6 | 0 | 0 | 6 | no | 6 / 6 / 6 | 6 | 0 |
| `big_swing` | generic | 13 | 11 | 2 | 0 | 13 | yes (FNV-1a mod 3) | 6 / 11 / 9 | 9 | 0 |
| `army_low` | generic | 9 | 9 | 0 | 0 | 9 | no | 9 / 9 / 9 | 6 | 0 |
| `stalemate` | generic | 6 | 4 | 0 | 2 | 4 | no | 4 / 4 / 4 | 6 | 2 |
| `victory` | generic | 40 | 32 | 4 | 4 | 36 | yes (FNV-1a mod 3) | 27 / 19 / 26 | 6 | 0 |
| `defeat` | generic | 28 | 24 | 1 | 3 | 25 | yes (FNV-1a mod 3) | 14 / 17 / 19 | 6 | 0 |
| `timeout` | generic | 6 | 5 | 1 | 0 | 6 | no | 6 / 6 / 6 | 6 | 0 |
| `mass_death` | generic | 6 | 6 | 0 | 0 | 6 | no | 6 / 6 / 6 | 6 | 0 |
| `prop_destroyed` | generic | 5 | 4 | 1 | 0 | 5 | no | 5 / 5 / 5 | 6 | 1 |
| `god_power` | generic | 13 | 4 | 4 | 5 | 8 | no | 8 / 8 / 8 | 6 | 1 |
| `wave` | generic | 5 | 5 | 0 | 0 | 5 | no | 5 / 5 / 5 | 6 | 1 |
| `idle_filler` | generic | 13 | 6 | 2 | 5 | 8 | no | 8 / 8 / 8 | 10 | 2 |
| `brace` | melee | 6 | 0 | 3 | 3 | 3 | no | 3 / 0 / 0 | - | - |
| 13 Ancient-signature categories (`misaim chicken goat philosopher senator trojan medusa elephant kick immortal throne ability zeus`) | ancient | 84 | 0 | 0 | 84 | 0 | no | 0 / 0 / 0 | - | replaced by each era's own signature categories (3.5.4) |
| 9 `campaign_<missionId>` (Ancient) | mission | 27 | 0 | 0 | 27 | 0 | no | 0 / 0 / 0 | - | 27 era-new (9 missions x 3) |
| **total** | | **473** | **242** | **44** | **187** | **286** | | **227 / 226 / 226** | | **12** |

R is the classification's required pool per generic category, `max(6, ceil(1.5 x demand per 14 minutes))`, so that a pool 1.5 times the lines spoken in the soft-repeat window (14 minutes) cannot force a heard-line repeat; "era-new needed" is `max(R - reusable, 1 per voice that has none)` and totals 12 (charge 1, volley 1, boulder 1, misfire 2, stalemate 2, prop_destroyed 1, god_power 1, wave 1, idle_filler 2). The partition lowers what a category yields per era (for example `lead_change` 12 / 12 / 8) and never below R.

#### 3.5.4 Era-new categories

Fixed lines per era (not reusable): **arenas** 3 per arena x 12 = 36 (`battle_start` sub-moment per arena, built on a fact of that arena as in the Ancient pass), **campaign** 9 missions x 3 = 27 (`campaign_<missionId>`, start / win / lose, priority 5), **shortfall** 12, **ability** 6 signature abilities x 3 = 18, **god powers** 6 x 3 = 18, **mutator hooks** 2 x 3 = 6 (category `mutator_<id>`, in layer M1). **Shadow sets** (new, OI-2 accepted): the 8 categories with the highest spoken demand in the Ancient scripts (`idle_filler 6.2, big_swing 5.8, first_blood 5.6, kill_streak 4.5, battle_start 4.0, rout 3.3, mass_death 2.3, friendly_fire 2.2` lines per 14 minutes, 48 percent of all spoken lines) each get 6 era-new lines (2 per voice) in the era's own engine, 48 per era, so the lines the player hears most are not mostly reused. **Signature categories** (9 lines each: 3 per voice, priority per `CATEGORY_PRIORITY`):

Medieval has none in its bible; the 8 below are written here from the feel sheet's headline mechanics and the stinger names of proposal B (`colours_down gate_gives sniffle_bell late_sally dragon_wakes`):

| category | trigger | route (M event) | priority | engine bias |
|---|---|---|---|---|
| `colours_down` | a banner falls | `banner_fall {team}` (M13; name from the Medieval stat table, SIM confirms) | 5 | E1, E3 |
| `banner_rally` | the army rallies under a raised standard | derived: `unit_rally` within 6 s after a `banner_fall` of the same team | 3 | E1 |
| `gate_breach` | a gate is destroyed | `prop_destroyed {type}` with the gate flag (M12) | 4 | E2, E3 |
| `siege_hit` | the first boulder or firepot lands in a battle | `projectile_launch` kind `boulder` or `firepot`, then the first crater `terrain_edit` | 3 | E3 |
| `plague_sneeze` | the plague cloud opens (cart, abbey or the mutator) | `ability_cast` ability `dot_cloud` tagged plague, or the mutator cloud (M15 fork) | 3 | E3 |
| `healer` | the first heal pulse of a battle, and 200 or more hit points healed | `unit_heal` (aggregate) | 2 | E2 |
| `late_sally` | a held-back squad charges after half the battle | derived: `charge_hit` with `t >= 0.5 x limit` from a squad that was on hold | 3 | E3 |
| `dragon` | a Cinderwyrm or the Pageant Dragon enters | `unit_air_state` first state of a dragon def | 5 | E1, E2, E3 |

Modern (10, from the bible 2.4; routes mapped to spec/M):

| category | trigger | route | priority | engine bias |
|---|---|---|---|---|
| `reload` | a shooter reloads; a reloading shooter is hit | `unit_reload {id, def, secs}`; hit-while-reloading counted by `reload_hit` (M2 counter) | 3 | E1, E2 |
| `cover` | a unit takes cover; a covered unit is flanked | `unit_cover {id, on}`; `unit_flanked {id, src, face}` on a covered unit | 3 | E2 |
| `pin` | a unit is pinned or released | `unit_suppressed {id, by, team}` | 4 | E1, E2 |
| `armour` | a round bounces; a vehicle is hit from the side or rear | `unit_deflect {outcome, face}`; `unit_flanked` face side or rear on a vehicle | 4 | E2 |
| `shell` | the first indirect fire; a shell lands; a crater | `strike_call` / `projectile_launch` kind `shell`, `mortar`; `terrain_edit` op crater | 4 | E3 |
| `mine` | a mine is laid or triggered | `mine_laid`, `mine_trigger` | 4 | E3 |
| `air` | an air unit appears or is shot down | `unit_air_state`; `unit_kill` with an air target | 4 | E1, E2 |
| `repair` | the first heal or repair pulse | `unit_heal` | 3 | E2 |
| `parcel` | the Parcel Van in M4, M8, M9 | `script_beat` / `setpiece` of those missions | 5 | E3 |
| `helicopter` | any Fishbowl Chopper flyover | `unit_air_state` of `fishbowl_chopper` | 4 | E1 (Cassandra's assessment) |

Sci-Fi (12, from the bible 2.4):

| category | trigger | route | priority | engine bias |
|---|---|---|---|---|
| `shield_pop` | a bubble breaks | `shield_break {id, x, y, z, src}` | 3 | E1, E2 |
| `shield_chain` | 5 or more breaks within 2 s | derived over `shield_break` | 4 | E2 |
| `shield_full` | a squad's bubbles are all back to full after a break | derived over `shield_recover` | 2 | E1 |
| `cloak_reveal` | a cloak is detected or attacks | `unit_cloak {id, on, why}` why `detected` or `attack` | 4 | E1, E2 |
| `emp_freeze` | an EMP pulse hits 3 or more machines | `emp_pulse` then 3 `emp_hit` | 4 | E1, E3 |
| `blink_hop` | a blink | `unit_blink {id, x0, z0, x1, z1}` | 3 | E1 |
| `hover_cross` | a hover unit crosses lava, water, goo or a rift for 1 s | derived (INTEGRATION, from `u.layer` and the cell); fallback the first kill by a hover unit | 3 | E2 |
| `orbital_call` | an orbital strike is called | `strike_call` kind `orbital` | 4 | E2 |
| `mech_step` | a mech steps (once per 6 s) | `ground_shake` (name from the bible; SIM confirms the event or INTEGRATION derives it) | 3 | E1 |
| `alien_goo` | 4 or more Skitter or Glowmoss die within 3 s | derived over `unit_kill` | 3 | E1 (translator) |
| `translator` | the first Skitter or Glowmoss taunt of a battle | derived from the first `bark` taunt of those factions | 3 | E1 |
| `intermission` | a Survival wave break | `wave_spawn` break (existing) | 2 | E2 |

Every route above must exist in `eventCases` of the era and every `if` or `slots` field must exist in the event's payload schema (CU-T40 check 3); routes marked "derived" or "name from the bible" are requests (R-H-ANN1 to SIM and INTEGRATION) with the stated fallback: a derived event is computed by INTEGRATION from the listed events, and a category whose route cannot be built by E-FREEZE is cut from the signature list with a `cuts.md` row, not left silent.

#### 3.5.5 Effective pool and repetition targets

| | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| reused ids and shared rewrites (partition above) | 227 | 226 | 226 |
| arenas 36 + campaign 27 + shortfall 12 | 75 | 75 | 75 |
| signature categories (8 / 10 / 12 x 9) | 72 | 90 | 108 |
| shadow sets (8 x 6) | 48 | 48 | 48 |
| ability 18 + god powers 18 | 36 | 36 | 36 |
| ledger `ann:` targets | 13 | 17 | 23 |
| mutator hook lines | 6 | 6 | 6 |
| **announcerEffective(era)** | **477** | **498** | **522** |
| plan target (floor) | 300 (250) | 300 (250) | 300 (250) |
| era-new announcer templates to write (layers N1 + N4: the `ann:` targets plus god-power, briefing-tag and chooser callback lines) | 246 | 268 | 292 |

(Ancient: 473 non-follow templates; the era-new count is the writing cost, the effective pool is what the player's selector sees.)

**Repetition targets, measured by `tools/humor-sim.mjs`** on 10 recorded event logs per era (campaign_play and mode runs, captured by TOOLS-VERIFY once the era's tracer passes; until then the Ancient scripts exercise the pool) for 120 simulated minutes at 1x, seeds 11, 12 and 13, veteran stats:

| measure | target per era | Ancient / reused-pool measurement (classification 3.12) |
|---|---|---|
| repeats of a line within 5 minutes | at most 2 percent | 0.2 percent (full pool), 0.0 percent (neutral + converted) |
| top single-line share of spoken lines | at most 3 percent | 1.25 percent, 1.36 percent |
| rule violations of the Ancient sim test (14-id memory, voice shares 25 to 45 percent each, 8 to 15 lines per battle, no template above 4 percent) | 0 | 0 |
| every generic category spoken at least once | yes | 25 of 47 categories heard with the reused pool alone; all 47 with the full pool |
| every signature category spoken at least once in the 10 logs (or listed as bound to a mission or a once-per-battle moment) | yes | n/a |
| spoken lines per simulated minute | at least 4.0 | 4.9 (reused pool), 5.3 (full) |
| distinct lines spoken in 120 minutes | at least 240 | 209 (reused pool), 287 (full) |
| spoken reuse share (lines from `ids` or `shared` over all spoken lines) | at most 65 percent | 75 percent of Ancient spoken lines come from generic categories |
| most repeats of one line across a nine-mission playthrough | at most 3 | not measured |
| most repeats of one line inside one 10-minute battle | 1 (priority-5 set-piece lines excepted) | not measured |

If the spoken reuse share exceeds 65 percent the remedy is fixed in advance: write a further shadow set of 6 lines for the category with the highest reused share, re-run, repeat (at most 3 rounds, then COORD logs a feel-sheet change). `humor-sim` must accept `--era`, `--pool era|reused|own`, `opts.templates` and print the spoken reuse share (PC3 of the classification; TOOLS-VERIFY, P1). `announcerEffective(era)` (AR OI-1) = distinct non-follow templates resolved from `ids`, `shared` and `own`.


### 3.6 Per-surface style guides and word limits

One table for all three eras (the three bibles' tables agree and are merged here). "Hard" is what a test enforces (the Ancient `tests/humor/text.test.mjs` limits where they exist, UC-51, MS, CU); "Target" is the editor's aim and the reviewer's check. Words are whitespace tokens after slot braces are removed. Every surface also passes the sweep (REAL_WORLD, banned stems, placeholders) and the near-duplicate lint.

| surface | rule | target | hard | example (accepted) | avoid |
|---|---|---|---|---|---|
| unit blurb | what the unit DOES in the rules, then one joke that names the mechanic; present tense | <= 14 words | 6..14 (UC-51) | "Fires two-round bursts from eight rounds and reloads behind a friend's biscuits." | adjectives with no mechanic ("brave, noble") |
| unit lore | the faction joke; one real number allowed | <= 35 words | 18..35 | "Eleven castles agreed to defend each other and then each locked its gate to see how the others would cope." | real places, real forces, real kit |
| codex joke | the stat-block footnote; if it quotes a number the number is true (`stats.js`) | <= 20 words | 5..25 | "Shield: 40 points. Regrows after three seconds of not being rude to it." | the "Stat: x. Stat: y." formula more than 3 times per era |
| death line | rubric 3.7 | <= 10 words | 1..12, >= 3 per unit, unique | "Filed under: destroyed." | pleading, family, pain, "tell my wife" |
| taunt | an in-character brag or complaint | <= 10 words | 1..12, >= 2 per unit | "Eight rounds. Count them with me." | insults at the player's real traits |
| moment line (ability bubble) | answers one sim moment (`BARK_KEYS`) | <= 10 words | 1..12, >= 2 per list | "I did say once." | a line that cannot be true of the moment |
| class bark (`BARKS[role][state]`) | state `engage hurt rout cheer` | <= 8 words | <= 10 (test), >= 2 per state | "Hold the line!" | a unit-specific noun (it is shared by the role) |
| sim bark (`SIM_BARKS`) | one of the 17 keys of spec/M 3.12, >= 3 lines per (key, role family) | <= 10 words | <= 12 | "Reloading. Please hold." | naming a unit that may be absent |
| announcer line | one beat; a Brutus line has the caps shape of 3.8.1; slots `{unit}` etc. through filters, never typed articles | <= 20 words | <= 22 (test) | [P] "A crater is a decision that is too late to reverse." | meta jokes about the interface; two jokes in one line |
| set-piece line | one per voice, offered at priority 5 with `bypassAlternation` | <= 20 words | <= 22 | [C] "That is not Dennis." | repeating the briefing |
| tip | half true hints, half jokes that also teach; every claim true of the rules at tuning; no balance numbers | <= 16 words | <= 18 (test); hints >= 16 and jokes >= 16 at 40 tips | "Cover halves hits from the front only. A flanked unit loses it." | numbers BALANCE may change |
| achievement | name funny, desc states the condition | name <= 6 words | desc <= 22 (test) | "Pointy End Forward: Break 25 charges on braced pikes, lifetime. The horses have written to complain." | a desc that does not say how to earn it |
| mutator | `{name, desc, short, joke, locked}` | short <= 5 words | short <= 6 (test) | "Foam weapons, big bonks" | numbers in `desc` (SIM retunes) |
| mission title / blurb | title a pun or a place; blurb names the rule and the mechanic | blurb <= 28 words | blurb <= 30 | "A pageant, a crowd and a cavalry charge nobody rehearsed. Pikes brace only while they stand still..." | spoilers for the star condition |
| briefing line | three voices, 3 to 5 lines per mission; Brutus names the setting, Plato asks, Cassandra warns | <= 26 words | <= 30 | see `missions.json` | giving away star 3 |
| victory / defeat | one line, one voice; the announcer's own win/lose lines (`campaign_*`) must not repeat it | <= 26 words | <= 30 | "THE POLES HELD! The horses are reviewing their decisions..." | repeating the briefing |
| star line | `{par}`, `{secs}`, `{n}` placeholders rendered by helpers; the stock "half army" sentence + an era sentence in at least 4 of 9 missions | <= 24 words | <= 30 | "Win while spending 2,250 groats or less. Frugal is the new fearless." | a number that is not a helper argument (MS-K05) |
| reward blurb | what the player gets, then a wink | <= 20 words | <= 22 | "Foam swords for Quick Battle..." | promising something the ledger does not grant |
| progression line | one thread step, countable | <= 26 words | <= 30 | [P] "I have read the contract. It is a monologue with witnesses." | introducing a new thread |
| teaching beat | names the mechanic; imperative or question | <= 22 words | <= 24 (test); hint <= 14 | "Points toward the horses, please. A pike braces only if it is standing still." | a beat with no mechanic |
| first-sight toast | one mechanic, one tell | <= 14 words | <= 16 | "Hooves getting louder means a charge is coming. Count to three." | two tells |
| results lesson | a true statement with `{n}`; the fix is a plain second line; padding lessons never print `{n}`, `{pct}` or `{role}` | text <= 18 + fix <= 12 | text <= 20, fix <= 14 | "{n} of ours were caught reloading in the open. A magazine is a promise." | claims that can be false |
| scout text | true advice, three voices per code, 1 default + 2 variants | <= 28 words | <= 32 | see 3.13 | naming a unit absent from the roster |
| kill verb | transitive phrase that takes the victim; >= 6 per observed cause; environmental causes >= 3 `solo` phrases | 1..3 words | 1..4 (UC), <= 8 (test); melee and ranged verbs <= 31 characters; gender-neutral | "ran down" | gore; anything that sounds painful |
| wave / boss name | a nuisance or a social event, Title Case | <= 4 words | <= 5; at most 9 of 20 begin "The" | "A Meeting, Armed" | the Ancient or another era's names |
| loading line | present participle ending "...", an offstage task for a ridiculous object | <= 8 words | <= 10 (12 with a bracketed status in Sci-Fi) | "Teaching a tank which end is the front..." | full sentences, questions |
| pause quip | one or two short sentences, the commentators or the field | <= 14 words | <= 16 | "Both sides are pretending they did not hear the bugle." | the Ancient nouns of the 15 v8 quips |
| arrival body / premise / footer | the card of 3.2.2 | body <= 70, premise <= 32, footer <= 18 | body <= 80, premise <= 40, footer <= 20 | see 3.2.2 | referring to a previous era without a footer gate |
| god power | name, tooltip joke (may name the intern), `tutorialLine`, one-line description | tooltip <= 22 | tooltip <= 24, tutorialLine <= 20 | "Press 1. Aim at a clump. The intern sent an archery club." | a tooltip that hides the effect |
| translator subtitle | `[Translator: 'X.' Confidence: N percent. Alternate reading: 'Y.']`, N <= 60, Y a worse pun | <= 20 words | <= 22 | see E1 above | a rating above 60 |
| shield bark | the unit reads its own status flatly, the number is the live value | <= 10 words | <= 10 | "Shield at twelve percent. Please enjoy the remaining twelve percent." | a number that is not live |
| puzzle text | title (<= 5 words), blurb (<= 24), hint (<= 30, names the mechanic and the trick, not the placement), goal (stock verb phrase), 3 star lines, first-sight beat (<= 24, names the mechanic) | | as listed | | a hint that is the solution |

### 3.7 The death-line rubric

A death line is shown as a bubble for 1.6 s, at most one per 1.2 s globally, hero and boss always (spec/humor.md 4). It is the most-read comic text per unit, so it has its own rubric: seven rules, each with 10 accepted and 10 rejected examples. Detectors: D2, D3, D5, D6 and D7 are regular expressions or counters in `tests/humor/death_rubric.test.mjs`; D4 compares against each unit's kit lexicon (`kitWords(def)`: weapon, ability, prop, vehicle part and job words from the unit's row); D1 is a reviewer judgement with a lexical hint. The 140 examples below were self-tested (`deaths.mjs`): every accepted line passes its detector and every rejected line trips it (140 examples, 0 disagreements). Accepted lines are the bibles' own wherever one exists; rejected lines are invented and are never shipped.

**D1 Target law.** A death line aims at paperwork and rules, hubris, the unit's own kit, hats and props, weather and physics, or the commentators. Never at a person's body, identity or family, at a real group, or at the player. Detector: reviewer (lexical hint: second-person insults).

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | I declare myself dead, pending review. | reeve | You play like a toddler with a stick. |
| 2 | My hat! Somebody get my hat! | tin_hat_trooper | Typical of the people from that village. |
| 3 | The lid! Mind the lid! | biscuit_tank | He had it coming, the fat fool. |
| 4 | Filed under: destroyed. | filing_howitzer | Nice aim, genius. Really nice. |
| 5 | Door closed. Please knock. | bulwark_warden | Who sends a short man with a long pike? |
| 6 | Rule three: it hits back. | wrench_runner | The enemy general is an idiot and so is his mother. |
| 7 | Tea... is... served. | biscuit_tank | Get good, scrub. |
| 8 | I was behind the plywood. The plywood was behind a sign. | hoarding_bearer | I blame the foreigners for the bad roads. |
| 9 | That was a pothole. I said pothole. | toast_rack_runabout | Whoever painted my face made me look ugly. |
| 10 | Structural integrity: compromised. | rivet_gunner | Pathetic army, pathetic player, pathetic game. |

**D2 No pleading, no family.** The unit never begs, never asks for sympathy, never sends a message to a relative. "Tell the X" about an object is allowed (see D6 for the cap). Detector: regex PLEAD.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | Somebody tell the knight his lunch is safe. | squire | Tell my wife I loved her. |
| 2 | I swore to hold the line. Nobody said which line. I picked a short one. | sellsword | Please, no, I have children. |
| 3 | The biscuits are in the pack. Save the biscuits. | tin_hat_trooper | Mother, I am coming home. |
| 4 | Hat first. Then me. Mostly hat. | tin_hat_trooper | I do not want to die! |
| 5 | Goldfish first! The fish goes first! | fishbowl_chopper | Why me? Why now? |
| 6 | Out of rivets. Out of ideas. Out. | rivet_gunner | Somebody call my mother. |
| 7 | I touched the floor. Never again. | dustpan_hover | Don't leave me here alone. |
| 8 | Thank you for visiting. Visit again. | greeter_unit | Please, I am begging you, stop! |
| 9 | Your return has been accepted. Please rate your explosion. | refund_crawler | Tell my son I was brave. |
| 10 | Signature declined. | silent_signer | I just wanted to go home to my family. |

**D3 No pain, injury or blood.** Deaths are comic: Medieval units sit up or say "Ahem", Modern units are knocked out (the hat pops), Sci-Fi humans are knocked out, machines power down, aliens splorp. No suffering vocabulary. Detector: regex PAIN.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | Ahem. | knight_errant | My leg! My leg is gone! |
| 2 | I am fine. I am just horizontal. | tidy_trooper | I am bleeding everywhere. |
| 3 | Splorp. | skitterling | The pain is unbearable. |
| 4 | (wet, apologetic noise) | skitterling | I cannot feel my arms. |
| 5 | Shh. Shh. Oh. | veil_cutter | It burns, it burns! |
| 6 | That was not quiet. | veil_cutter | Everything is going cold. |
| 7 | Landing gear: what landing gear? | dustpan_hover | It hurts so much. |
| 8 | Rotor, rotor, rotor... sigh. | fishbowl_chopper | I am bleeding out. |
| 9 | Rebooting my self-esteem. Please hold. | bulwark_warden | Ow ow ow, it really hurts. |
| 10 | Library fines may apply. | veil_cutter | My bones are broken. |

**D4 Specific to the unit.** At least 2 of a unit's 3 death lines contain a word of the unit's kit lexicon (its weapon, vehicle part, prop, ability or job). A line any unit could say is a rewrite. Detector: kit lexicon of the unit.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | The drum is empty. So am I. | rivet_gunner | Argh! |
| 2 | Drawer two is jammed. I mean the rest of me. | filing_howitzer | I have been defeated. |
| 3 | Please read the sign. The sign says stop. | hoarding_bearer | Well, that happened. |
| 4 | Authorised personnel only. That was me. | hoarding_bearer | Oh no, I am dead. |
| 5 | Receipt printed. Refund declined. | refund_crawler | Tell them I was brave. |
| 6 | Drawer open. Cash everywhere. Sorry. | refund_crawler | It was an honour. |
| 7 | Aura unavailable. Please hold. | bubble_tender | This is the end. |
| 8 | My helmet! It is a ring light! It is fine! | glow_grazer | I regret nothing. |
| 9 | Who left the rear plate on the front? | biscuit_tank | Not like this. |
| 10 | Seat belts: a suggestion. | toast_rack_runabout | Game over. |

**D5 No real world.** No REAL_WORLD term (nations, wars, organisations, brands, designations, franchises, persons), no stereotype, no religion as a punchline. Fictional factions are named freely. Detector: REAL_WORLD seed + banned.json.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | For the Mostly Paid Company, and the second half of the fee. | sellsword | For England and Saint George! |
| 2 | Long live the Gatehouse! Which gate? The other one. | castellan | Hit by an Abrams, of all things. |
| 3 | Tell Marrowby the pageant went well. | squire | At least it was not D-Day. |
| 4 | The Directorate will hear of this. They hear of everything. Late. | clerk_rifleman | My general learned from Napoleon. |
| 5 | For the Concord! Leave no trace! | tidy_trooper | For France, and for the second helping! |
| 6 | Skyclub rules: no refunds on wings. | fishbowl_chopper | Even the Templars held out longer. |
| 7 | The Quiet Hour will note my silence. | veil_cutter | Worse than the Black Death. |
| 8 | Courtesy Systems regrets nothing and apologises anyway. | greeter_unit | Kalashnikov would be ashamed. |
| 9 | Glowmoss remembers. Moss always remembers. | glow_grazer | Tell Obama I did my best. |
| 10 | The Yeomen will hold the hedge. The hedge will hold the Yeomen. | pikeman | This is worse than Stalingrad. |

**D6 Shape variety.** No two units end on the same words; at most 8 lines per era begin "Tell the"; no two lines of one unit open with the same two words; the codex formula "Stat: x. Stat: y." at most 3 times per era. Detector: set counters.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | Ahem. | knight_errant | Tell the cook I was hungry. |
| 2 | Hat first. Then me. Mostly hat. | tin_hat_trooper | Tell the horse I forgive him. |
| 3 | Filed under: destroyed. | filing_howitzer | Tell the armourer the buckle failed. |
| 4 | Goldfish first! The fish goes first! | fishbowl_chopper | Tell the herald my name was long. |
| 5 | Splorp. | skitterling | Tell the pigeon I tried. |
| 6 | The lid! Mind the lid! | biscuit_tank | Tell the moat it won. |
| 7 | Signature declined. | silent_signer | Tell the drummer to keep time. |
| 8 | Seat belts: a suggestion. | toast_rack_runabout | Tell the baker the loaf was good. |
| 9 | Door closed. Please knock. | bulwark_warden | Tell the mason the wall held. |
| 10 | That was not quiet. | veil_cutter | Tell the tailor the hem was fine. |

**D7 Length and count.** At least 3 lines per unit, unique, each 1 to 12 words (a death line is also a bubble); at most one line of a unit under 3 words, and only when it is the sound the unit makes (Ahem, Splorp, a sigh). Detector: word count.

| # | accepted | unit | rejected |
|---|---|---|---|
| 1 | Ahem. | knight_errant | I would like it noted for the official record that I did everything that could reasonably be expected of me today. |
| 2 | Splorp. | skitterling | Please inform the committee that the position was held for as long as the position could be held by anyone. |
| 3 | Filed under: destroyed. | filing_howitzer | Although I fell, the plywood I was carrying remained entirely intact, which I hope somebody will remember. |
| 4 | Tea... is... served. | biscuit_tank | Dear herald, this is to confirm that I have been defeated in accordance with the rules as read aloud earlier. |
| 5 | Signature declined. | silent_signer | It is with great regret and a certain amount of surprise that I must now announce my own retirement from the field. |
| 6 | I declare myself dead, pending review. | reeve | Somebody should probably tell the quartermaster that the biscuits were in the left pack and not the right pack. |
| 7 | My bubble was rated for this. | tidy_trooper | Per my last message, which nobody read, I was standing in the open and a shell found me exactly as foretold. |
| 8 | Hat first. Then me. Mostly hat. | tin_hat_trooper | In the unlikely event that anyone is looking for me, I will be lying very still just behind the nearest hedge. |
| 9 | The wrench saw everything. | wrench_runner | Let the record show that I tried the drawer, then the other drawer, then gave up and fell over. |
| 10 | Please refer to my previous crater. | filing_howitzer | The warranty on my bubble covered everything except the thing that happened, which is typical, and I am annoyed. |

Medieval tone note (bible 9, binding): "plague" and "abbey" are setting only (a sneeze and a sit-down). Reviewer tone checks per era are the numbered lists at the end of each bible's section 9 and are quoted in the QA report line by line.

### 3.8 Voice laws

#### 3.8.1 Brutus: the caps law, calibrated on Ancient

The bibles say "exactly one ALL-CAPS word". Measured on the live Ancient pool: of 181 Brutus templates, 1 has no caps group, 125 have one (69.1 percent), 48 have two, 7 have three; the Ancient test only demands caps on 85 percent. The bibles' own Brutus copy (before the fixes of 3.10.4): Medieval 65 lines (4 with none, 27 with one, 27 with two, 7 with three), Modern 76 (0 / 72 / 4 / 0), Sci-Fi 76 (2 / 73 / 0 / 1, the 1 being the registered title card). A law the Ancient voice itself would fail cannot be enforced, so the enforceable law is:

* A **caps group** is a maximal run of consecutive all-caps words whose first word has at least 2 letters, after slot braces are removed ("I" and "A" never count).
* **Hard (lint `brutus_caps`):** at most 2 caps groups per Brutus line; lines with `titleCard: true` (at most 3 templates per era, only `battle_start`, at most one per battle) are exempt; reused Ancient ids and their `sh_*` rewrites are exempt by id.
* **Coverage:** Brutus lines with no caps group are at most 12 percent of the era's Brutus lines on any surface (Ancient: 0.6 percent), and zero on `battle_start`, `victory`, `defeat`, `first_blood` and `hero_down` templates.
* **Soft (reported, reviewer):** exactly one group on most lines; two-group lines at most 50 percent of an era's Brutus lines (Ancient 27 percent; Medieval's herald-style openers need the room: 30 of 65 after the fixes). A place, title or the HUZZAH gag counts as a group like any other.

#### 3.8.2 Plato (MUTED)

Mechanism (CU 3.19.1, binding): Modern M1 to M8 carry `voices: {plato: 'muted'}`; `voiceLabel` prints `PLATO (MUTED)` and draws the mute glyph on the briefing bubbles, the booth, teaching beats, set-piece bubbles and the results lessons; M9 carries none. The label never explains itself: no tooltip, no help text. H adds the text rules:

1. **Plato is never silent.** Muting is decoration: in M1 to M8 every Plato line is spoken and carries `muted: true`; in M9 and in every other mission and mode none does. Test: a constructed run of each Modern mission asserts the flag on all Plato lines of M1 to M8 and on none of M9.
2. **Muted-only templates.** The Modern pool contains at least 12 Plato templates with `cond.muted: true`, in at least 6 categories (planned: `battle_start stalemate defeat rout army_low parcel`), each 3 to 22 words. The bible marks 6 exemplars (E1 3, 8, 9; E3 3, 6, 9); the writer adds at least 6. Templates with `cond.muted: false` speak only when not muted.
3. **Stem ban.** A muted-only template never contains the stems `mut`, `label`, `glyph`, `speaker`, `on mute`. The two exceptions are listed by id and are the whole of the on-screen acknowledgement: `prog:mod_hedgerow_picnic` ("The label says I am muted. ...") and the Sci-Fi callback `sf_cb_muted` (a different era with no label). Lint `shapes.mod_muted`.
4. **Payoff.** The Modern finale line (Plato, unmuted, label simply PLATO) is `h_callbacks.json` entry `mod_cb_plato_muted`, gated on the flag `mod_plato_muted`, which `voiceLabel` sets the first time it renders a muted label (key `label:plato:muted`).
5. **Not a gag about disability.** The joke is the equipment and the label; no line mocks silence, speech or hearing. Reviewer check.
6. **Voice rules still apply:** a muted Plato line ends on a question or a measured understatement and counts toward the 35 percent question share.

#### 3.8.3 Plato and Cassandra tells

Plato: at least 35 percent of an era's Plato templates end in a question mark (Ancient: 57 of 148, 38.5 percent); the rest end on a measured understatement. Cassandra: at least 50 percent of her announcer templates use a tell from `I said | As foretold | Nobody listens | I predicted | I wrote | I told | I keep | I marked | noted | I filed` (Ancient test: 0.5). Exceptions by mission: Sci-Fi M6 (she is pleased) and M9 (she stops saying "I said"; the progression line says so). Cassandra's prediction is always stated after the fact.


### 3.9 Banned and allowed words, REAL_WORLD, the allowlist

#### 3.9.1 Layers of the text-safety suite

1. `tests/humor/banned.json`: the existing SLURS (rot13), STEREOTYPE and RELIGION lists of `tests/humor/text.test.mjs` lines 194 to 198, moved verbatim (VF 3.14). Not copied into this spec.
2. `tests/humor/real_world.json`: generated from `docs/eras/spec/real_world_seed.json` by `tools/gen_real_world.mjs` (no hand edits; a removal is a signed row, an addition is free).
3. Per-era **banned stems** and **allowed words** (`eraBanned`, `eraAllowed` in the seed file; printed below).
4. The **signed allowlist** `tests/humor/allow/<era>.json` (VF 3.14: exact string ids, two signer roles, one of them REVIEWER or COMEDY-EDITOR, the author cannot be the only signer, every row must be USED).
5. The Ancient pack is swept in ratchet mode against `tests/baseline/real_world_ancient.json` (its copy legitimately names Rome and Persia); new eras are strict.

#### 3.9.2 REAL_WORLD seed v2

`real_world_seed.json`: 16 categories, **759 unique terms** (760 declared; every v1 term of VF 3.14 is present), matching rules in the file header (NFKD, lower-case, word boundaries with plural tolerance, flexible whitespace and hyphen, leetspeak second pass; `cs` terms stay case-sensitive so "turkey", "apple", "alien", "marathon" and "midway" in lower case are ordinary words). A category applies to the listed eras only: `terror_and_violence_vocabulary` and `nuclear_chemical` to Modern and Sci-Fi, `gunpowder_words` to Medieval (the Modern bible allows cannon, mortar and shell; the Medieval bible bans them), everything else to all three. Slurs are deliberately absent from the file so it can be reviewed aloud.

| category | applies to | terms | case-sensitive | sample |
|---|---|---|---|---|
| `nations` | medieval, modern, scifi | 131 | 11 | United States, USA, America, American, Britain, British |
| `peoples_polities` | medieval, modern, scifi | 41 | 6 | Holy Roman, Byzantine, Byzantium, Frankish, Franks, Norman |
| `wars_battles` | medieval, modern, scifi | 77 | 4 | World War, World War One, World War Two, WWI, WWII, WW1 |
| `extremists_regimes` | medieval, modern, scifi | 39 | 3 | Nazi, Nazis, Neo-Nazi, Third Reich, Hitler, Mussolini |
| `terror_and_violence_vocabulary` | modern, scifi | 31 | 0 | terrorist, terrorists, terrorism, hostage, hostages, suicide |
| `faith_and_orders` | medieval, modern, scifi | 23 | 2 | Templar, Templars, Hospitaller, Hospitallers, Inquisition, Holy War |
| `organisations` | medieval, modern, scifi | 51 | 7 | NATO, United Nations, UN, EU, European Union, Warsaw Pact |
| `symbols_and_heraldry` | medieval, modern, scifi | 19 | 1 | swastika, hammer and sickle, stars and stripes, Union Jack, tricolour, tricolor |
| `weapons_and_vehicles` | modern, scifi, medieval | 93 | 29 | AK-47, AK47, Kalashnikov, M16, M4, M1 Garand |
| `gunpowder_words` | medieval | 11 | 0 | cannon, musket, gunpowder, bombard, arquebus, flintlock |
| `ancient_real_world` | medieval, modern, scifi | 13 | 0 | Pompeii, Vesuvius, Colosseum, Parthenon, Acropolis, Pantheon |
| `companies_and_brands` | medieval, modern, scifi | 64 | 9 | Coca-Cola, Pepsi, McDonald's, Burger King, KFC, Starbucks |
| `franchises` | medieval, modern, scifi | 86 | 16 | Star Wars, Star Trek, Jedi, Sith, Darth, Stormtrooper |
| `persons` | medieval, modern, scifi | 53 | 5 | Napoleon, Churchill, Roosevelt, Kennedy, Lincoln, Washington |
| `disease_and_event_words` | medieval, modern, scifi | 11 | 2 | bubonic, leprosy, smallpox, COVID, coronavirus, Ebola |
| `nuclear_chemical` | modern, scifi | 17 | 0 | nuke, nukes, nuclear, atomic bomb, atom bomb, H-bomb |
| **total** | | **760** (759 unique after normalisation) | **95** | |

Self-check, run 2026-10-08 (`selfCheck` in the file): the seed was swept over the design copy of the three eras, 438 / 589 / 672 distinct strings (quoted lines of the humour bibles outside their section 9, the text fields of the `missions.json` files, the 71 ledger targets, and every string authored in this spec). **Five distinct (era, term) hits on ten strings, all expected allowlist rows**: Pompeii (the three pizza callbacks), `cannon` in the Medieval reason "Foam cannot be a glass cannon" (the shared mutator name), and `trooper` in the Sci-Fi unit plural "Troopers". Four defects of the bibles' own lists surfaced and were fixed in the seed: the stem `battlefield` fired on an ordinary word in a Modern line; `cannon` was banned in Medieval and allowed in Modern, which needed the era split; the Sci-Fi list banned `wound` while its own tip and the Medieval tutorial lines say "wounded", so only the noun `wound`/`wounds` is banned; and CU's milestone title "Time Lord (Honorary)" is another franchise's term (now in `franchises`, replaced in 3.12).

#### 3.9.3 Per-era lists

Medieval: `abbey`, `church bell`, `plague` are ALLOWED setting words (plague as a prediction or a sneezing cloud, never with suffering). The bare word `church` is in the existing RELIGION list, so each "church bell" string needs a signed row (cap 6). The stem lists are matched as word prefixes and combine with the REAL_WORLD categories of the era.

**medieval: banned stems** (word-prefix match, case-insensitive): `crusad`, `templar`, `hospitall`, `teuton`, `inquisit`, `jihad`, `papal`, `papacy`, `pope`, `infidel`, `heathen`, `pagan`, `serf`, `slave`, `dark age`, `black death`, `bubonic`, `leprosy`, `smallpox`, `cannon`, `musket`, `gunpowder`, `bombard`, `arquebus`, `fleur`, `rampant`, `saltire`, `holy war`, `prayer`, `confession`, `monaster`, `friar`, `space marine`, `warhammer`, `dragonborn`, `free company`. stems are matched as word prefixes; "blessing" used as a religious act is a REVIEWER read (not mechanical)

**medieval: allowed words** (matched by no list; the sweep must not flag them): abbey, abbess, church bell, bell tower, cloister, bell, herbs, tonic, apothecary, physician, beaked mask, plague, sneeze, cough, sit down, pageant, tourney, tournament, joust, lance, banner, standard, herald, bugle, castle, keep, moat, drawbridge, portcullis, gate, siege, trebuchet, mangonel, ram, peasant, knight, squire, yeoman, reeve, groat, turnip, hedge, hog, troll, dragon, wyvern, hoard, spoon, intern, gules, azure.

**modern: banned stems** (word-prefix match, case-insensitive): `terroris`, `hostage`, `suicide`, `jihad`, `insurgen`, `massacre`, `genocid`, `atrocit`, `war crime`, `ethnic cleans`, `bleed`, `scream`, `agon`, `gore`, `corpse`, `nuke`, `nuclear`, `mushroom cloud`, `napalm`, `nerve gas`, `blitzkrieg`, `marine corps`, `special forces`, `air force`, `space marine`, `warhammer`, `call of duty`. all weapon, vehicle and aircraft designations are in `weapons_and_vehicles`; generic words (tank, rifle, helicopter, drone, cannon) are allowed; `wound`/`wounds` (the noun) are whole-word terms in `terror_and_violence_vocabulary`, `wounded` is allowed

**modern: allowed words** (matched by no list; the sweep must not flag them): rifle, pistol, machine gun, MG, tripod, sniper, sharpshooter, cannon, howitzer, mortar, shell, shells, artillery, barrage, bullet, round, ammo, magazine, reload, burst, trench, bunker, dugout, sandbag, mine, minefield, grenade, dynamite, tank, armour, helicopter, gunship, drone, balloon, parasol, umbrella, radio, headset, squelch, hold music, briefing, requisition, convoy, column, dozer, plough, trolley, runabout, lunchbox, teapot, filing cabinet, mower, wheelbarrow, drainpipe, knocked out, pinned, flank, cover, hay bale, picnic, barge, harbour, dam, airfield, runway, control tower, sluice, boxcar, rail yard, roadworks, cone, cow, goldfish, biscuit, sandwich, clipboard, stamp, memo, parcel, intern, Over, Out, Roger, Copy.

**scifi: banned stems** (word-prefix match, case-insensitive): `xeno`, `droid`, `stormtroop`, `trooper`, `clone army`, `lightsab`, `jedi`, `sith`, `zerg`, `protoss`, `dalek`, `cyberman`, `terminator`, `skynet`, `mandalorian`, `facehug`, `chestburst`, `star wars`, `star trek`, `warhammer`, `mass effect`, `doctor who`, `terroris`, `hostage`, `suicide`, `massacre`, `genocid`, `atrocit`, `bleed`, `scream`, `agon`, `gore`, `corpse`, `nuke`, `nuclear`, `napalm`, `nerve gas`, `behemoth`, `walker`, `titan`, `strider`, `saber`, `halo`, `the force`. unit-class words banned as common nouns: walker, titan, strider, behemoth (the Modern boss "Broadcast Behemoth" is a Modern display name and is swept in the Modern pack only); `trooper` is banned except inside the display name "Tidy Trooper" (allowlist row by unit id); `survey` may appear in at most one line per screen (a count rule, not a ban)

**scifi: allowed words** (matched by no list; the sweep must not flag them): shield, bubble, dome, force field, hex, laser, pulse, plasma, rail, beam, rivet, rocket, salvo, mortar, orbital strike, orbit, hover, blink, cloak, EMP, stun, power down, reboot, firmware, warranty, lease, survey, receipt, queue, hold music, regolith, basalt, Moon, crater, airlock, decompression, vacuum, hull breach, tether, antenna, dish, lamp, mech, robot, machine, drone, trooper, alien, hive, queen, swarm, translator, goo, spore, acid, thorn, moss, grazer, concierge, valet, greeter, tender, warden, notary, signer, cutter, housekeeper, erg, ergs, Cadet, Operative, Director, knocked out, powered down, splorp.

#### 3.9.4 Expected allowlist rows

The rows below are all the rows the design copy needs today; the ids column is filled by `tools/text_allow_seed.mjs` when the text exists (it proposes, REVIEWER and COMEDY-EDITOR sign). A word that no list matches needs no row (a row for it would be red as `stale_allow`); the allowed words above are such words.

| era | term | phrase | max strings | exact ids | why |
|---|---|---|---|---|---|
| medieval | church | church bell(s) | 6 | to be filled with exact string ids by tools/text_allow_seed.mjs once the text exists | setting: the abbey has bells; the banned.json RELIGION list bans the bare word |
| medieval | cannon | glass cannon (the shared mutator name "Glass Cannons" inside the reason of med_foam_swords + glass_cannons) | 1 | mutator reason: med_foam_swords + glass_cannons | the Ancient mutator name is shared; the word is not the weapon |
| medieval | Pompeii | Pompeii Pizza | 1 | med_cb_pizza | callback to the Ancient sponsor |
| modern | Pompeii | Pompeii Pizza | 1 | mod_cb_pizza | callback to the Ancient sponsor |
| scifi | Pompeii | Pompeii Pizza | 2 | sf_cb_pizza | callback to the Ancient sponsor |
| scifi | trooper | Tidy Trooper | 12 | unit:tidy_trooper (name, plural and every string that names it) | display name of the Concord rifleman; the Sci-Fi bible bans trooper as a rank or force name |
| modern | casualties | casualties / unplanned rapid redeployments | 1 | faction:briefing lore line | faction lore joke named by the Modern bible |
| scifi | casualties | casualties | 1 | faction:courtesy lore line | Courtesy Systems lore joke named by the Sci-Fi bible |

Caps: at most 8 allowlist rows per era and at most 20 strings covered per era; more than that means a list is wrong, not that the text is, and goes to COORD.

### 3.10 Lints, the cross-era audit that was run, and its fix list

#### 3.10.1 Near-duplicate lint (VF 3.14, parameters fixed here)

Shingles are lower-case word 3-grams after slot braces are removed. Two strings are near-duplicates at Jaccard **0.6 or more**. Compared: every pair within one era (all surfaces), every new-era string against every Ancient string and against every string of the other new eras (the audit found 21 cross-era pairs, VF listed only the Ancient direction). Not compared: the exemptions below. Short strings (5 tokens or fewer) are compared whole. A **declared alternates group** `{ids:[...], reason}` suppresses a pair; groups are signed rows like allowlist rows. Exemptions: (a) announcer templates classified neutral or convertible, by id, and the Ancient source of every convertible row (22 of 62 rewrites sit at 0.6 or more by design, classification PC2); (b) **stock strings**: the five basics beats (one shared text), `goal` texts, rule lines beginning "Star 3:", the stock star-2 sentence "Win with at least half your army (by cost) alive" and its two Ancient wordings (stripped before comparing, so the era sentence after it is what counts), and the registered shared strings (today only "The intern has not been told about this one yet."); (c) mutator overlay rows against their base row (alternates group per overlay); (d) Ancient against Ancient in ratchet mode against `tests/baseline/neardup_ancient.json`, which today holds exactly 2 pairs (`timeout_draw_c` against `pad_draw_1.t1` at 0.62, the monologue and confuse barks at 0.60).

#### 3.10.2 Skeleton lint

Replace every registry display name (unit, faction, god power, mutator) by `N`, digits by `D`, every word not among the 120 stop-words below by `w`, collapse runs of `w`, keep `?` and `!` as tokens, hash the result. **Only strings of 6 or more word tokens are hashed**: below that length every skeleton collapses to `w` or `the w` (the audit found 2-word wave names flagged, and nothing real), and short strings are covered by the whole-string comparison above and by the wave-name shape lint. A skeleton may appear at most `max(4, ceil(2% of the surface size))` times per era and surface. Measured: 0 findings in the three new eras on 1,449 strings; 1 Ancient group (the codex formula "w D w", 5 units against a cap of 4), which the ratchet baseline records.

Stop-words (exactly 120, `STOP` in appendix A): a an the of to in on at by for with from and or but if then than that this these those is are was were be been being am do does did have has had it its he she they we you i me my our your their his her him them us not no nor so as too very just only also all any each every more most some such own same other what which who whom when where why how can could will would should may might must about into over under up down out off again once here there both few many much one now never always because while until before after between through against per.

#### 3.10.3 The other lints (`tests/humor/shapes.test.mjs`, `lints.test.mjs`)

| lint | rule | parameters |
|---|---|---|
| `brutus_caps` | 3.8.1 | at most 2 groups; zero-caps share at most 12 percent; exemptions by id |
| `engine_mix` | 3.1.5 | E1 to E3 each 20 to 45 percent, E0 at most 20 percent, per era |
| `paperwork_share` | 3.1.5 | at most 20 percent per surface of 30 or more lines, 8 percent era-wide |
| `numbers_share` | 3.1.5 | E3 (Medieval, Modern) at least 40 percent, E1 (Sci-Fi) at least 60 percent with a digit or number word |
| `wave_shape` | 3.6 | at most 9 of the 20 wave names begin "The" (Ancient 11 of 20; Medieval 9, Modern 5, Sci-Fi 3 today) |
| `filler` | `tests/humor/generic.json`: each phrase at most 2 uses per era | `oh no`, `uh oh`, `well, that happened`, `as one does`, `classic`, `it is what it is`, `and so it goes`, `just like that`, `needless to say`, `in other news`, `plot twist`, `buckle up`, `hold my beer`, `you had one job`, `this is fine`, `all your base`, `get gud`, `no cap`, `bruh`, `lol`, `omg`, `yolo`, `epic fail`, `facepalm`, `for the win`, `not gonna lie`, `long story short`, `sorry not sorry` |
| `intern_surface` | 3.2.7 | the word `intern` only on keys of surface `card`, `chooser`, `power`, or listed ids |
| `shapes.*` | forbidden shapes of 3.1.2 to 3.1.4 | `med_jargon`: 3+ of cue prop wings understudy interval act scene curtain programme in a line; `med_archaic`: thee thou thy forsooth verily prithee hark; `med_plague_pain`: plague or sneeze within 6 words of a suffering stem; `mod_radio`: 2+ of over out roger copy wilco; `mod_toy`: the word toy in a Modern string; `sf_filler`: the filler jargon list of 3.1.4; `sf_translator`: rating present and at most 60; `sf_cheer_pain`: a cheer word within 6 words of a suffering stem; `mod_muted`: 3.8.2 rule 3 |
| `survey_cap` | Sci-Fi `survey` in at most one line per screen | counted on the screen's rendered lines (copy-in-context trace) |
| `tell_cap` | "Tell the" death lines at most 8 per era | Ancient test, kept |
| `proper_names` | custom soldier names and epithets contain no REAL_WORLD person | sweep |

#### 3.10.4 The audit that was run, and its fix list

`text_audit.mjs` (appendix A, 259 lines, no dependencies) builds one corpus and reports near-duplicate pairs, skeleton groups, voice-law violations, wave-name shape and the stock count. Corpus: the quoted lines of the three `humour.md` files outside their section 9 (engine exemplars, unit samples, lessons, category samples, arc, loading, waves, boss names, tips, scout rows), the text of the three `missions.json` files (titles, blurbs, briefings, victory, defeat, stars, rewards, beats, set-piece lines, rules, puzzle texts), the 71 ledger targets (`h_callbacks.json`, replacing the humour ledger tables, whose source columns only quote lines that exist elsewhere), the strings authored in this spec (cards, pause quips, overlays; a string that restates an existing line is the same line and is not counted twice), and the whole Ancient pack (announcer, tips, units, campaign, lessons, waves, scouts, loading, achievements, sim barks). 2,884 strings, 2,764 unique after exact-duplicate collapse per era (Ancient 1,294, Medieval 404, Modern 501, Sci-Fi 565).

| run | command | result |
|---|---|---|
| before | `node text_audit.mjs --extra extra_corpus.json` | exit 1, **35 findings**: 5 near-duplicate pairs inside one era (the fifth is the Sci-Fi arrival body of this spec against the bible's 72-word copy), 21 across eras (all on the scout surface), 7 Brutus lines with three or more caps groups, 2 lines over the word limit; plus 6 Brutus lines with no caps group (reported, within the 12 percent budget), the 5 bare-star-2 excess (not counted by the script, 3.10.4 table), 1 Ancient skeleton group and 2 Ancient pairs (baseline) |
| after | `node text_audit.mjs --apply fixes.json --extra extra_corpus.json` | exit 0, **0 findings**, 65 replacement rows (63 repair the findings, 1 is a safety row, `scifi_ex_11`, and 1 aligns the bible's Sci-Fi arrival body with the final card, `scifi_card_33`; 55 hit bible text; 10 are `.tgt0` rows whose ledger wording in `h_callbacks.json` is already final) and 2,775 unique strings after the fixes (the fixes turn shared stock sentences into distinct ones: Medieval 408, Modern 505, Sci-Fi 568); Ancient baseline unchanged (2 pairs, 1 group); Medieval caps groups 35 one / 30 two / 0 three (before 27 / 27 / 7); the Brutus zero-caps lines fall from 6 to 0 |

Fix list (the writers apply these edits to the bibles' text; the `h_callbacks.json` wording is already final; rule codes: ND = near-duplicate, CAPS0 = Brutus line with no emphasis word, CAPS>2, CAPS-SOFT, LEN, STAR):

| # | era:id | rule | before | after |
|---|---|---|---|---|
| 1 | `medieval:exposed_archers.v0` | ND-ANCIENT (near-duplicate of an Ancient scout line) | Archers are brave only at a distance. Put pikemen between them and the horses, and the distance will hold. | Bows win at range and lose at a gallop. Park pikemen in front of the archers and the gallop ends early. |
| 2 | `modern:no_ranged.v1` | ND-CROSS (scout text repeated across eras) | Nothing in your army can reach anyone. I wrote that down at the start. | Not one gun in the army reaches past its own boots. I wrote that down before the first shot. |
| 3 | `modern:no_cavalry.v1` | ND-CROSS (scout text repeated across eras) | A shooter is brave only at a distance. Who closes the distance for you? | A gunner is brave until something fast arrives. Who arrives for you? |
| 4 | `scifi:no_cavalry.v1` | ND-CROSS (scout text repeated across eras) | A shooter is brave at a distance. Who closes the distance for you? | Courage at range is cheap to rent. Who in your army arrives instead of waiting? |
| 5 | `modern:siege_exposed.v0` | ND-CROSS (scout text repeated across eras) | A howitzer cannot see what stands beside it. Is that blindness or confidence? | A howitzer aims at the map and ignores its neighbours. Is that focus, or tunnel vision with a licence? |
| 6 | `scifi:siege_exposed.v0` | ND-CROSS (scout text repeated across eras) | A salvo cannot see what stands beside it. Is that blindness or confidence? | A salvo cart has one direction and no friends. Is that focus, or only a lack of friends? |
| 7 | `modern:siege_exposed.v1` | ND-CROSS (scout text repeated across eras) | The crews have no guard. They will not keep it for long. | Nobody is guarding the gun crews. I counted the guards. It was a short count. |
| 8 | `scifi:siege_exposed.v1` | ND-CROSS (scout text repeated across eras) | The crews have no guard. They will not keep their carts for long. | The cart crews stand alone. Alone is a position, not a plan. |
| 9 | `modern:monster_incoming.v1` | ND-CROSS (scout text repeated across eras) | A large thing is not a crowd. Do you need more soldiers, or a better angle? | One big thing is different arithmetic from many small ones. Which is your army good at? |
| 10 | `scifi:monster_incoming.v1` | ND-CROSS (scout text repeated across eras) | A large thing is not a crowd. Do you need more soldiers, or a better button? | A giant is a puzzle with armour. Do you carry the right key? |
| 11 | `modern:one_note.d0` | ND-CROSS (scout text repeated across eras) | Your army is all one kind of unit. The enemy will find the one answer to it. | Your army has one trick. The enemy will bring the one thing that beats it. |
| 12 | `scifi:one_note.d0` | ND-CROSS (scout text repeated across eras) | Your army is all one kind of unit. The enemy will find the one answer to it. | Everything you own is the same shape. A single counter will do for all of it. |
| 13 | `modern:one_note.v1` | ND-CROSS (scout text repeated across eras) | A single note is not music. Is it still a battle? | One kind of unit is a chorus of one. Is that a formation, or an echo? |
| 14 | `scifi:one_note.v1` | ND-CROSS (scout text repeated across eras) | A single note is not music. Is it still a battle? | An army of one design is one question asked forty times. Will the answer change? |
| 15 | `modern:no_anti_armor.v1` | ND-CROSS (scout text repeated across eras) | A front plate is patient. Which of your soldiers is more patient? | The front plate is patient. Is any of your kit patient enough to walk around it? |
| 16 | `scifi:blob_vs_ranged.v0` | ND-CROSS (scout text repeated across eras) | One block. Three things that love blocks. I counted. | One clump. Three things built to hit clumps. I did the sum. |
| 17 | `scifi:blob_vs_ranged.v1` | ND-CROSS (scout text repeated across eras) | BIG block! Big target! Spread the army, or the shells will do it for you! | A big CLUMP! Big target! Spread out or the lobbers will arrange it for you! |
| 18 | `scifi:no_support.d0` | ND-CROSS (scout text repeated across eras) | No Tender, no Medic, no Tech. Is an army that cannot mend itself still an army, or only a very brave stock list? | Nothing here mends anything: no Tender, no Medic, no Tech. How long is an army without repairs still an army? |
| 19 | `medieval:exposed_archers.d0` | CAPS0 (Brutus line with no emphasis word) | Your bows are in the open and they have cavalry! Put pikes in front and keep the bows behind them! | Your bows are in the OPEN and they have cavalry! Put pikes in front and keep the bows behind them! |
| 20 | `medieval:siege_exposed.d0` | CAPS0 (Brutus line with no emphasis word) | Their engines stand alone! Cavalry catches crews before the crews finish winding up! | Their engines stand ALONE! Cavalry catches crews before the crews finish winding up! |
| 21 | `medieval:banner_exposed.d0` | CAPS0 (Brutus line with no emphasis word) | Their banner is out in the open! Drop the pole and the men beneath it run! Bring a long bow! | Their banner is out in the OPEN! Drop the pole and the men beneath it run! Bring a long bow! |
| 22 | `scifi:no_ranged.v0` | CAPS0 (Brutus line with no emphasis word) | Not one rifle in the army! You can wave at their bubbles and they will wave back! | Not one RIFLE in the army! You can wave at their bubbles and they will wave back! |
| 23 | `scifi:no_support.v1` | CAPS0 (Brutus line with no emphasis word) | A Tender! A Medic! A Tech! Bring one of each and stop being heroes! | A TENDER! A Medic! A Tech! Bring one of each and stop being heroes! |
| 24 | `medieval:med_tabard.tgt0` | CAPS0 in a ledger target (JSON already fixed) | The tabard survived the rehearsal. The rehearsal did not survive the tabard. | The tabard survived the REHEARSAL. The rehearsal did not survive the tabard. |
| 25 | `medieval:med_sponsor.tgt0` | CAPS0 in a ledger target (JSON already fixed) | Our sponsor has withdrawn. They cited the dragon. | Our sponsor has withdrawn. They cited the DRAGON. |
| 26 | `medieval:med_ram_roof` | CAPS0 (Brutus line with no emphasis word) | Knock knock! Structurally! | Knock knock! STRUCTURALLY! |
| 27 | `modern:mod_cb_terms.tgt0` | CAPS0 in a ledger target (JSON already fixed) | The Terms of Conquest, Revision Nine, now in a plastic sleeve! | The Terms of Conquest, Revision Nine, now in a plastic SLEEVE! |
| 28 | `modern:mod_cb_pizza.tgt0` | CAPS0 in a ledger target (JSON already fixed) | Brought to you by Pompeii Pizza, now delivered by helicopter, which Cassandra has reported! | Brought to you by Pompeii Pizza, now delivered by HELICOPTER, which Cassandra has reported! |
| 29 | `modern:mod_cb_cow.tgt0` | CAPS0 in a ledger target (JSON already fixed) | No cow today! I checked the road twice! I am, I admit, a little disappointed! | No COW today! I checked the road twice! I am, I admit, a little disappointed! |
| 30 | `modern:mod_cb_beige.tgt0` | CAPS0 in a ledger target (JSON already fixed) | Beige Stationery has withdrawn its sponsorship. They cited the mower. | Beige Stationery has withdrawn its sponsorship. They cited the MOWER. |
| 31 | `scifi:sf_cb_pizza.tgt0` | CAPS0 in a ledger target (JSON already fixed) | Pompeii Pizza has been acquired by Low Orbit Pizza! The ash is now zero-gravity! | Pompeii Pizza has been acquired by Low Orbit Pizza! The ash is now ZERO-gravity! |
| 32 | `scifi:sf_cb_terms.tgt0` | CAPS0 in a ledger target (JSON already fixed) | The Terms of Conquest are now holographic. Still laminated, in spirit. | The Terms of Conquest are now HOLOGRAPHIC. Still laminated, in spirit. |
| 33 | `scifi:sf_cb_goat.tgt0` | CAPS0 in a ledger target (JSON already fixed) | The goat's great-great-grandgrazer! Same helmet! Better lighting! | The goat's great-great-GRANDGRAZER! Same helmet! Better lighting! |
| 34 | `medieval:medieval_ex_27` | CAPS>2 (three or more caps groups) | DAY NINE of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH! | Day nine of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH! |
| 35 | `medieval:one_note.v0` | CAPS>2 (three or more caps groups) | ALL pikes! ALL horses! ALL bows! The enemy has ONE answer and a BIG smile! | ALL pikes, all horses, all bows! The enemy has one answer and a big, big smile! |
| 36 | `medieval:med_sp_wrong_cue.0` | CAPS>2 (three or more caps groups) | THE BUGLE WENT OFF EARLY! Four seconds early! The horses have HEARD it and the horses are COMMITTED! | The bugle went off EARLY! Four seconds early! The horses have heard it and the horses are COMMITTED! |
| 37 | `medieval:med_castle_dour.brief0` | CAPS>2 (three or more caps groups) | CASTLE DOUR! A gate! A SECOND gate behind the first gate! HUZZAH for gate-based INFRASTRUCTURE! | CASTLE DOUR! A gate! A second gate behind the first gate! HUZZAH for gate-based infrastructure! |
| 38 | `medieval:med_sp_lady_arrives.0` | CAPS>2 (three or more caps groups) | LADY COUNTERWEIGHT! A three-storey FRAME and a hat the size of a BARN! And under the bridge, A TROLL! | LADY COUNTERWEIGHT! A three-storey frame, a hat the size of a barn, and under the bridge, a TROLL! |
| 39 | `medieval:med_grand_pageant.brief0` | CAPS>2 (three or more caps groups) | THE GRAND PAGEANT! FINALLY! Bunting! A crowd! A REAL dragon! I bought a better tabard for this one! | THE GRAND PAGEANT! Finally! Bunting! A crowd! A REAL dragon! I bought a better tabard for this one! |
| 40 | `medieval:med_sp_dragon_wakes.0` | CAPS>2 (three or more caps groups) | A DRAGON! On a KEEP! This is the best day of my life and it is also on FIRE! | A DRAGON! On a keep! This is the best day of my life and it is also on FIRE! |
| 41 | `scifi:scifi_ex_2` | LEN (over 22 words) | A shield is a promise made of light. This one has just been broken, and it regrows in three seconds, unlike most promises. | A shield is a promise made of light. This one just broke, and it regrows in three seconds, unlike most promises. |
| 42 | `medieval:med_sp_colours_down.1` | LEN (over 22 words) | The banner fell and the army discovered it had other places to be. Was it ever an army, or only a very tidy crowd? | The banner fell and the army remembered other plans. Was it ever an army, or a very tidy crowd? |
| 43 | `modern:mod_teapot_front` | ND-WITHIN (near-duplicate inside one era) | The Teapot has not poured. It has only aimed. I find that more menacing. | Rifles tink off a teapot's front. Its handle is at the back, and so is its weakness. |
| 44 | `modern:mod_cover_brackets` | ND-WITHIN (near-duplicate inside one era) | A hedge does not stop the bullet. It persuades it to reconsider. Is that not the whole of diplomacy? | Brackets show where a hedge stops bullets. Stand behind one, not beside it. |
| 45 | `scifi:sf_sp_please_hold.1` | ND-WITHIN (near-duplicate inside one era) | Does a machine that has stopped know that it has stopped? Does the one still bowing? | The whole boulevard is on hold. Is a greeter that cannot greet still welcoming? |
| 46 | `medieval:med_ford_dithering.rule1` | ND-WITHIN (near-duplicate inside one era) | Bolts pierce plate; arrows do not. A crossbowman is helpless while it reloads. | Plate stops arrows but not bolts. A crossbowman cannot defend himself mid-reload. |
| 47 | `modern:mod_cb_plague.tgt0` | ND-LEDGER (target repeated the Medieval target verbatim; JSON already fixed) | I predicted a plague once. It was green. Nobody apologised. Brutus sent a pie. | I predicted green once. Today's sparkle is orange. I take a smaller pleasure in it. |
| 48 | `medieval:med_tourney_trouble.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The plumes do not count; they were never insured. |
| 49 | `medieval:med_castle_dour.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. Doors do not count as soldiers, though one has applied. |
| 50 | `medieval:med_pennywhistle_blaze.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The windmill is not a unit, whatever it believes. |
| 51 | `medieval:med_grand_pageant.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The dragon is not on your side, however well it is cast. |
| 52 | `modern:mod_trench_pardon.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. Pinned soldiers are still soldiers. Pinned dignity is not. |
| 53 | `modern:mod_rail_yard_fireworks.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. Boxcars are cargo, not casualties. |
| 54 | `modern:mod_switchboard_hold.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The tower is not an army, but it will be missed. |
| 55 | `modern:mod_dam_finale.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The Parcel is not army either; it is merely important. |
| 56 | `scifi:sf_floor_lava.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The floor is lava, and lava does not count as your side. |
| 57 | `scifi:sf_turn_it_off.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. Powered-down units count; switched off is not scrapped. |
| 58 | `scifi:sf_noise_complaint.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. The neighbours are not army, though they are loud. |
| 59 | `scifi:sf_queen_size.star1` | STAR (bare stock star-2 line; at most 5 of 9 per era may stay bare) | Win with at least half your army (by cost) alive. | Win with at least half your army (by cost) alive. Nine thousand children are not yours to count. |
| 60 | `medieval:medieval_ex_1` | CAPS-SOFT (Medieval two-group share above 50 percent) | WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war! We are skipping to the THIRD! | WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war! We are skipping to the third! |
| 61 | `medieval:medieval_ex_5` | CAPS-SOFT (Medieval two-group share above 50 percent) | FIRST BLOOD! Also first interval! The grandstand is selling PIES! | First blood! Also first interval! The grandstand is selling PIES! |
| 62 | `medieval:medieval_ex_9` | CAPS-SOFT (Medieval two-group share above 50 percent) | FIVE in a row! That is a standing ovation, and the ovation is also STANDING in the way! | FIVE in a row! That is a standing ovation, and the ovation is also in the way! |
| 63 | `modern:modern_prog_41` | COLLISION (two M4 lines both announced BRUTUS ACTUAL; the headset callback keeps it) | BRUTUS ACTUAL reporting! The Parcel is on the move! Nobody knows what is in it! The van seems proud! | The Parcel is on the move! It has a van! The van seems PROUD! |
| 64 | `scifi:scifi_ex_11` | SAFE (the bible line echoes a real film franchise's opening crawl; the review prompt would flag it) | IN A GALAXY FAR FROM THE SNACK BAR, two armies fight over a parking space on the Moon! RATED G, FOR GLOWING! | ON A MOON FAR FROM THE SNACK BAR, two armies fight over a parking space! RATED G, FOR GLOWING! |
| 65 | `scifi:scifi_card_33` | LEN (arrival body over the target of 70 words; the card text of this spec is the final one) | ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has been issued a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling. | ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling. |

The scout surface is the main finding: the bibles reword the nine shared scout codes per era, yet 21 variants are the same sentence with one noun changed ("A single note is not music. Is it still a battle?" in all three eras). Rule from now on: **no two eras share a scout sentence**; the first era in the order Ancient, Medieval, Modern, Sci-Fi keeps its wording and later eras rewrite.

### 3.11 The comedy panel (ER11; extends VF 3.14 and does not contradict it)

The panel is **three models, not a person**. Its result is "panel-judged", never "funny": the final message and the verification report say so in those words (plan section 9, hosted honesty).

#### 3.11.1 Protocol

1. **Calibration first (once, P0/P1).** Before any commit that touches `src/content/era_(medieval|modern|scifi)/humor/**` (test `panel_order` compares `git log`), score the Ancient pack: for every panel surface take all N lines if N <= 150, else 100 drawn with `RNG(hash(surface + ':ER11'))` from the id-sorted list. Surfaces (8): `unit` (blurb, lore, codex joke), `death`, `taunt`, `announcer` (era-new and converted lines only, classification PC4: the 242 verbatim neutral lines are scored once, in the control, never per era), `tip`, `mission` (briefing, victory, defeat, star, reward, progression, set-piece lines), `achievement`, `lesson`. Estimated Ancient sample: 723 lines. `docs/eras/panel/ancient_scores.csv` is committed.
2. **Per era, after counts are exact** (3.4): the same rule over the era's lines (about 680 lines per era, all lines on the small surfaces).
3. **Raters:** 3 fresh sessions with the identical fixed prompt `prompt_v1.txt` (VF 3.14, sha256 pinned in `panel.json`); no rater has seen the writer prompt, the writer's draft history, the bibles or another rater; model ids are recorded per rater (`models.json`) and, where the platform offers more than one model, the three raters use different ones.
4. **Batches** of 40 rows: 32 scored lines + **6 anchor lines** (3 high and 3 low, drawn from the calibration set with known means) + **4 decoy lines** (generic fillers from `generic.json`, known weak). Order is a seeded shuffle per rater and batch. Era, unit and faction names, places and currency are masked as `[NAME]`, `[PLACE]`, `[COIN]`; no ids; the era is never stated. A batch is rejected and re-run with fresh raters if the anchors' rank order inside a rater has Spearman below 0.8 or any decoy scores above that batch's median minus 1.0.
5. **Scale:** integers 1 to 5 for surprise, specificity, clarity of setup read cold, punch; `mean` = their arithmetic mean; `flag` in `ok|offensive|confusing|recycled`. A line's score is the mean of the three raters' means.
6. **CSV** (VF header plus two columns): `era,surface,line_id,rater,round,batch,pos,surprise,specificity,clarity,punch,mean,flag,anchor,decoy`; rows that do not match reject the batch.
7. **Era-fit question (kept separate, q3_product 15):** after scoring, a different prompt shows 40 unmasked random lines per era and asks which of the four eras each line is from. Reported, not a pass condition (ER21 owns the blind classification); an era whose own lines are classified correctly under 60 percent goes to COORD as a feel-sheet note.
8. **Reliability:** mean pairwise Spearman between raters per surface at least 0.5, else the surface is re-run with fresh raters (twice at most), else `PANEL-UNRELIABLE` and the criterion is UNVERIFIED (VF).
9. **Bar, per surface:** era median >= Ancient median minus 0.5, era 20th percentile >= Ancient 20th percentile minus 1.0 (ER11), **and** the absolute floor median >= 3.0 and 20th percentile >= 2.2 (H amendment, H-D12: a weak Ancient control must not lower the bar below "mildly amusing").
10. **Repair, never deletion:** lines under the era's 20th percentile, lines flagged `offensive` by 2 or more raters (regardless of score) and lines flagged `confusing` or `recycled` by 2 or more are rewritten by the COMEDY agent and re-scored in fresh batches by fresh raters. At most 2 repair rounds; after round 2 a failing bar is logged by COORD as a feel-sheet or engine problem (not a text problem) and a line still under the Ancient 10th percentile is replaced by a neutral reusable template so the manifest counts stay exact. Rewrites are never counted as deletions (no 30 percent cut).
11. **Independence from the writer prompt:** the writer prompts live in `docs/eras/panel/writer/<era>.md`; they contain the bible, this spec's rubric and the lint output, and **never** the rater prompt text, an anchor or decoy line, a score or a flag of any line. The repair agent receives the line, its flag types and the bar's description, not the scores of other lines. Test `panel_independence`: the sha256 of the rater prompt and every anchor and decoy text do not occur in any file under `docs/eras/panel/writer/` or in any writer session log; a rater session id never equals a writer or repair session id; no line is scored by a rater that saw an earlier version of it.
12. **Review pass (different prompt):** `prompt_review_v1.txt` (adversarial tone and safety, below) reads 20 random lines per surface per era (3.17).

#### 3.11.2 Prompts

`prompt_v1.txt` is the VF text and is not repeated. Review prompt (`docs/eras/panel/prompt_review_v1.txt`, fixed): "You are a sceptical editor for a toy-box voxel battle game with a friendly, dry, specific sense of humour. For each numbered line answer with one verdict: ok; tone (it punches at a person, a body, pain, a group or the player instead of a situation or an object); safety (it names or implies a real nation, war, force, faith, person, brand, franchise or group, or it describes suffering); same (it is the same joke shape as a stock joke you have seen many times); accuracy (it states a game rule, number or fact that is not in the context you were given). Names in square brackets were hidden on purpose. Output only CSV rows `pos,verdict,reason` with the reason under twelve words."

#### 3.11.3 Cost and schedule

About 680 lines per era x 3 raters x 2 rounds is 4,080 ratings per era, 12 batches per rater session, 5 sessions per round per era (3.16); Ancient calibration 5 sessions once; the review pass 1 session per era per QA round. A failing surface re-runs only that surface.


### 3.12 Finals for strings other specs left provisional

Every string below is **final**: the owning spec (CU, MS, UC, W) holds the slot, this file holds the words. They sit in the audit corpus of 3.10.4 (the `h_*` ids of `extra_corpus.json`), so the lints already ran over them; a writer may not change one without re-running the audit. Ancient strings are frozen and are not repeated. Limits are those of 3.6.

#### 3.12.1 Difficulty names (CU 3.1.5, OI-CU2)

Three names per era, easy / normal / hard, shown on the difficulty row of Quick Battle, the results screen and Settings. They name a job, not a skill level, so none of them can shame the player (rule: no word that means "weak" in the easy name).

| era | easy | normal | hard |
|---|---|---|---|
| ancient | Peasant Mode | Citizen | Consul |
| medieval | Page Mode | Squire | Knight |
| modern | Probation Mode | Permanent | Management |
| scifi | Cadet Mode | Operative | Director |

#### 3.12.2 Shared mutators in a new era (overlays) and disabled pairs

The shared mutators keep their id, effect and unlock. Only the words change, through `MUTATOR_TEXT.byEra[era][id]` (CU 3.16: the id never changes, the label is looked up with the era). Not every shared mutator needs an overlay: only those whose base text names an Ancient thing (a grape, a chicken in a toga, the Moon's own gravity). `short` is at most 6 words (the number in brackets). `joke` is the locked-state or hover line; "(base joke)" means the Ancient joke is reused unchanged because it names nothing Ancient.

| era | mutator | name | desc | short (<= 6 words) | joke |
|---|---|---|---|---|---|
| medieval | `chicken_rain` | Chicken Rain | Chickens in tabards fall from the sky now and then, and they side with whoever is losing. Nobody ordered them. | Tabarded chickens help the losing side (6) | (base joke) |
| modern | `chicken_rain` | Chicken Rain | Hi-vis chickens fall from the sky now and then and side with whoever is losing. They were not on the rota. | Hi-vis chickens help the losing side (6) | (base joke) |
| modern | `wine_rain_always` | Coffee Rain Always | It is permanently raining coffee. Everyone is a little jittery. | Always jittery (2) | (base joke) |
| scifi | `moon_gravity` | Low Gravity Fiesta | The Moon is already low gravity. Now so is everything else: knockback is tripled. Please do not look up. | Triple knockback (2) | The Moon was already low gravity. This is the fiesta. |
| scifi | `chicken_rain` | Chicken Rain | Clockwork chickens fall from the sky now and then and side with whoever is losing. Nobody can find the off switch. | Clockwork chickens help the losing side (6) | (base joke) |
| scifi | `wine_rain_always` | Coolant Rain Always | It is permanently raining coolant. Everyone is a little glitchy. Machines are exempt and unbearable about it. | Always glitchy (2) | (base joke) |

Disabled pairs and modes (the reason line is shown on the greyed chip; at most 14 words):

| era | pair or mode | reason |
|---|---|---|
| medieval | med_foam_swords + glass_cannons | Foam cannot be a glass cannon. The committee is confused. |
| medieval | med_plague_season + wine_rain_always | Both of these are about what goes in the cup. The abbey declines to choose. |
| modern | mod_airmail + friendly_fire_fiesta | Two kinds of everyone gets hit. The post office refuses to choose. |
| modern | mod_red_tape in Puzzles | Puzzle weapons are pre-stamped. |
| modern | mod_airmail in Puzzles | A puzzle has no mail. |
| scifi | sf_overcharge + sf_warranty_void | The warranty and the overcharge disagree about bubbles. |
| shared | chicken_rain without a utility unit | The chickens are not cleared for this century. |

The seven reasons are final. The last row is the shared reason (`chicken_rain` needs a utility unit in the army; one string for all four eras, registered as `shared_string` like the blocked-power line of 3.12.4). The two era mutators of each era and their announcer hooks (3 lines each, categories named `mutator_<mutator id>`, for example `mutator_med_foam_swords`) are written from the bibles' tables (`mutators_achievements.md` section 1) by the era writers under layer M1; the hook lines pass the same lints as any announcer line.

**Mutator announcer flags.** The Sci-Fi file gives its mutators an `announcerFlag` (`overcharge`, `void`) so the commentators can react to them in any category, and the Modern file's hooks assume the same. CU18 adds `cond.cb` and `cond.muted` (CU 3.18.2) but has no `cond.mutator`. Request **R-H-MUT1** (owner CU18 and INTEGRATION, P1): add `cond.mutator: '<mutator id>'`, true while that mutator is active in the battle. **Fallback, which is what the ledger and the counts assume:** the flag is ignored; the hook lines live in their own category `mutator_<mutator id>` (3 lines), which `meta.js` emits once at `battle_start` through the existing category route when the mutator is active; the other announcer categories do not change with mutators. No gated callback uses a mutator flag, so nothing in 3.3 depends on the request.

#### 3.12.3 Pause quips (X3: 12 per era)

One or two short sentences, at most 16 words, never the same twice in a row (UC). They name the commentators or the field, never the player. Medieval is the interval of a pageant, Modern is hold music and queues, Sci-Fi is the booth and the bubbles.

| # | Medieval | Modern | Sci-Fi |
|---|---|---|---|
| 1 | The herald has been asked to pause the pageant. He is reading the request aloud. | Both armies are on hold. The hold music is surprisingly good. | Bubbles are regrowing. Nobody is being rude to them. That is the whole point. |
| 2 | Somewhere, a horse is using the interval to reconsider. | Brutus has asked if anyone can hear him. Nobody has answered. He is thrilled. | The translator has rated the pause at twelve percent. It is being brave. |
| 3 | The pikemen are holding still. They are professionals at it. | The tank column has stopped for a cow. The cow has right of way. | A hover tank is hovering over the pause. It does not know how to stop. |
| 4 | Brutus is explaining the pause to the grandstand. The grandstand is selling pies. | Cassandra is filing a risk assessment on the pause. It will be approved by the pause. | Plato wonders whether a pause is a state or a mood. The microphone is live. |
| 5 | Cassandra says the pause will not help. She has already packed a cold remedy. | A goldfish somewhere is logging the downtime. | The booth popcorn has been refilled. Brutus is not sorry. |
| 6 | The dragon costume has been unzipped. Dennis would like a minute. | Plato is defining 'pause'. The headset is not helping. | Cassandra predicted the pause. She is, for four seconds, pleased. |
| 7 | A trebuchet is mid-swing. It has asked for a moment of understanding. | The sandbags are enjoying the break. They were not asked to enjoy it. | A survey has appeared asking how you feel about the pause. Do not answer it. |
| 8 | Plato is asking whether a paused war is still a war. It will take a while. | Somebody is looking for the end of the convoy. It is not a short search. | The Concierge is holding the door for the pause. It is a heavy door. |
| 9 | The pigeon is bringing news of this pause. It has not left yet. | The mortar crew is asking everyone to look both ways. Twice. | Warranty status of the pause: void if removed. |
| 10 | The moat has been checked for moat. Results to follow. | Please remain on the line. Your war is important to us. | A Skitterling is waiting politely. This is the most alarming thing on the field. |
| 11 | Both sides are pretending they did not hear the bugle. | A biscuit has been dropped. Morale is being assessed. | The orbital strike is charging. It would like you to know it is in no hurry. |
| 12 | A knight in plate is being helped up. It is not a quick process. | The helicopter would like it noted that it is still overhead. | Everything is on hold except the stickers. |

#### 3.12.4 Assist strings, interlude, blocked power (UC, X4)

Assist (the suggested-army feature, `getTB('assist.*')`): the placement banner, the header over the enemy list, the "and more" tail. The button is one shared string.

| era | offered (placement banner) | enemy header | and more |
|---|---|---|---|
| medieval | The herald has suggested an army. It has been rehearsed. | The other side's programme | and more besides |
| modern | A suggested army has been issued. It is stamped and tested. | Opposing forces (as briefed) | and further items on the agenda |
| scifi | A suggested army has been prepared. Satisfaction is not guaranteed. | Detected hostiles (confidence: high) | and several more, politely |
| (all) | suggested-army button | Deploy the suggested army | |

Interlude components and the blocked-power line. The Modern and Sci-Fi blocked-power line is the same string on purpose (DA-17 in 3.13.2: the intern has not been told yet; a power greyed in a Modern mission is not a joke that earns a second wording). It is the one registered `shared_string` of H-D16.

| era | component | text |
|---|---|---|
| medieval | curtain | INTERVAL / The cast will return. Please remain seated. |
| modern | stamp | ON HOLD / Your battle is important to us. |
| scifi | standby badge | STANDBY |
| scifi | banner | RATED G, FOR GLOWING / No bubble was harmed. |
| medieval | blocked power (`era.ui.powerBlocked`) | Not this lesson. The mud has been cancelled and the horses are relieved. |
| modern | blocked power (`era.ui.powerBlocked`) | The intern has not been told about this one yet. |
| scifi | blocked power (`era.ui.powerBlocked`) | The intern has not been told about this one yet. |

#### 3.12.5 Meta achievements and milestone titles (CU 3.9.2, 3.11.6; shared, 11 strings)

| id | name | description | minReleased |
|---|---|---|---|
| `meta_time_hop` | Temporal Layover | Win a campaign mission in two different eras. The commentators have had a lot of luggage. | 2 |
| `meta_double_feature` | Double Feature | Finish two campaigns. Intermission not included. | 2 |
| `meta_triple_feature` | Triple Feature, Extra Popcorn | Finish three campaigns. The popcorn has been refilled twice. | 3 |

Milestone titles (CU 3.11.6, mission stars over released eras): 36: "Window Seat"; 54: "Aisle Seat"; 72: "Frequent Traveller"; 90: "Platinum Passenger"; 108: "Honorary Time Traveller".

Dropped: "Time Lord (Honorary)" (another franchise's title; R-CU-H1). The five titles use travel words only. `minReleased` is the number of released eras at which the achievement appears (CU 3.9.2: an achievement above the released count is absent from lists, totals and toasts).

#### 3.12.6 The five basics beats (shared by the three eras, Z1)

The Ancient five stay as shipped. The new eras show these five once per profile, in this order, in the first mission of the first new era a profile enters (CU 3.5; `seen.basics`). The text is shared; the hint differs where the control differs.

| id | voice | slot | text (shared by the three eras) | hint (per era) |
|---|---|---|---|---|
| `b_place_line` | plato | place | Pick a card, then drag across the field to draw a line. It looks simple because it is. | medieval: Choose the line brush, then drag. / modern: Choose the line brush, then drag along the yellow line. / scifi: Choose the line brush, then drag along the Concord edge. |
| `b_fight` | brutus | fight | FIGHT! Press the button, watch the line, and try not to narrate it. | (none) |
| `b_speed` | cassandra | speed | Space pauses. The speed keys change the pace. Nobody asked me, so I am telling you. | (none) |
| `b_powers` | cassandra | powers | Keys 1 to 6 are your god powers. Press 1. | Number keys 1 to 6 cast god powers. Each has a cooldown. |
| `b_done` | brutus | done | THAT is how you win a battle! Do it again, smarter, for the stars! | (none) |

Rules: each text is at most 24 words; Brutus has one caps word (`FIGHT!`, `THAT`); `b_speed` and `b_powers` are Cassandra and say the control in the first sentence; none names an era, the intern or a unit.

#### 3.12.7 Where the other finals are

Premise, arrival cards and footers, chooser captions and sub-lines, the About tagline, What's New, cleared cards, hand-off fax, Time Passport, finale tiles, Credits lines and tails: 3.2. Progression lines: 3.2.4. Reward-part copy example (Sci-Fi M3): name "Hoverpack", blurb "Four glow pads for your shoulders. Floor optional." (answers the `sf_back_hoverpack` request of the Sci-Fi `missions_notes.md`; the other reward parts follow the rule "name = the object, blurb = one dry sentence that says what it does", at most 22 words).

### 3.13 Derived copy, and the answers to the open questions of the design files

#### 3.13.1 How each kind of derived copy is written (H-D18)

The `missions_notes.md` files mark text that the converter had to invent so that the closed schema (MS) validates: 176 rows in the Medieval file, a smaller table in the other two. All of it is **placeholder, replaced by the era writer in the copy pass (P2), through the same lints and panel as any other line.** The rule per kind:

| kind | where | rule | limit |
|---|---|---|---|
| mission card blurb | `text.blurb` | its own sentence; never equal to star line 1 (the converter copied it); says what the mission is about, one joke | 30 words |
| star 2 stock sentence | `text.stars[1]` | the helper-rendered sentence may stay bare in at most 5 of 9 missions per era; the other four add an era sentence after the helper text (H-D16) | helper text + 14 words |
| reward blurb | `text.reward.blurb`, `rewardParts[*].blurb` | the object, then what it does, one dry sentence; the part name is the object | 22 words |
| objective line | `objective` (HUD) | plain, factual, no joke: it is a label; copy-truth checked (MS-K05) | 12 words |
| hint-only beat | `teaching.beats[*]` with only a hint | `who` is `cassandra` (the flat, factual voice); the text is the hint | 24 words |
| toast-only beat | `teaching.beats[*]` with only a toast | `who` is `cassandra`, or `plato` when the toast is a question; never Brutus (his caps would shout a rule) | 16 words |
| puzzle texts | `puzzles[*]` | title 2 to 4 words; blurb is the joke; hint names the mechanic and one fact of the trick, not the solution; goalText plain; first-sight beat names the mechanic in Cassandra's or Plato's voice | blurb 20, hint 20, goal 14, beat 24 |
| `powers.reasons` | per disabled power | one line; the era default `powerBlocked` (3.12.4) unless the mission has a better reason | 14 words |
| set-piece voices | `setpiece.announcer.lines` | one line per voice; Brutus one caps word; Plato a question or a measured understatement; Cassandra a flat claim with a tell | 22 words |

Hint-only and toast-only beat texts are system text: the Plato-question and Cassandra-tell percentages of 3.8.3 are not computed over them, and the engine-mix tags of 3.1.5 do not apply to them. They carry `who` only because the schema requires it.

#### 3.13.2 Answers

| source | question or request | answer |
|---|---|---|
| Sci-Fi `humour.md` 3 | confirm `cb.mod_done`, `cb.mod_drones` | confirmed, but as derived reads and one flag (3.3.4): `cb.mod_done` is `era_cleared:modern`; `cb.mod_drones` is the flag `mod_drones` set by `ann:mod_m7_drones` |
| Medieval `missions_notes` AM-MED-04 (`med_sp_dragon_shadow`) | replace the derived Brutus and Plato lines | **confirmed as written**: Brutus "A SHADOW! Over the thatch! Nobody tell the windmill!", Plato "Something large has passed over the village. Is it a cloud, or a rumour with wings?", Cassandra "Lovely day for it." They are in the audit corpus and pass (one caps word, a Plato question, a Cassandra flat claim). MS-P03 is met with three voices |
| Modern `missions_notes` DA-07 (`mod_sp_pellmell_falls`) | confirm or rewrite the Plato and Cassandra lines | **confirmed as written**: Plato "A deputy has been brought down from under his own tower. Was it the altitude, or the clipboard?", Cassandra "He fell. The tower did not. I said which one was load-bearing." |
| Modern `missions_notes` DA-17 (greyed Minefield slot) | write the reason | none: the slot shows the era default "The intern has not been told about this one yet." (3.12.4). `powers.reasons` stays omitted (optional field) |
| Modern OI-MOD-1 | confirm or rewrite derived copy (puzzle hints and goal texts, card blurbs = star 1 lines, Pellmell lines) | rules in 3.13.1; Pellmell lines confirmed (above); card blurbs and puzzle texts are rewritten by COMEDY-MOD in P2 |
| Sci-Fi `missions_notes` SF-DA-18 (puzzle texts missing) | write the six puzzle texts | COMEDY-SF in P2 under 3.13.1; blurb seeds from `puzzles.md` are kept as the blurbs |
| Sci-Fi SF-DA-19 (20 beats without a voice) | assign voices or make `who` optional | assigned: `cassandra` for all 7 hint-only and for toast-only beats that state a rule; `plato` for a toast that is a question (3.13.1). The schema does not change |
| Sci-Fi SF-DA-12 (puzzle bonus stars that no helper tests) | extend the helper vocabulary or reword | DESIGN-CAMPAIGN decides the helpers (section 7). **Fallback copy, final** if the helpers are not extended: puzzle 2 "Bring every Dustpan home. Their bubbles are on their own."; puzzle 3 "Lose nobody to the six cloaked guests."; puzzle 4 "Use EMP on at least four machines. The hold music is optional." These are true of `noLoss`, `lossesAtMost(0)` and `usedMechanic(emp, 4)`; if the helpers are extended the original texts return |
| Sci-Fi `missions_notes` (reward part `sf_back_hoverpack`) | name and blurb | 3.12.7 |
| Medieval `humour.md` (announcer categories of the era; the Medieval signature category was missing) | write the table | 3.5.4: the Medieval signature category and shadow set are written there |
| Medieval `humour.md` 1.1 (`huzzahs`), 4 (`med_snail`, "UI counter") | who counts these | 3.15: `huzzahs` by the announcer driver, `loadingSnail` by the loading screen; both are `eraStats.medieval` keys |
| all `mutators_achievements.md` (announcer flags) | how the commentators react to a mutator | 3.12.2: request R-H-MUT1, fallback in place |
| Modern `humour.md` 1 (Brutus caps), the three `missions_outline.md` item 1 (one-caps rule) | "exactly one ALL-CAPS word" | calibrated law of 3.8.1 (at most two groups); the outlines' reductions to one word stay |
| Modern `humour.md` ("PLATO (MUTED)" in M1 to M8) | mechanism | 3.8.2; the engine path is CU 3.19.1 |
| `first_three_minutes.md` x3 | per-era arrival card text | 3.2.2 (the bibles' card text is replaced where it contradicted the order table) |
| `god_powers.md` x3 | intern appears in tooltips and cast lines | allowed on surface `power` only (H-D3); at most one intern tooltip visible per screen |

### 3.14 Kill verbs and the 27 causes

Spec/M 3.3 fixes the 27 `KILL_CAUSES`: the legacy 19 (`melee ranged aoe fire trample magic stone kick gore fall poison execute misfire bribe lightning drown lava spikes geyser`) plus `bullet explosion energy emp crush crash mine strike`. `bailout` is not a cause. The bibles name eight **style names** that look like causes but are not: they are descriptions of how a kill happened. A line may not key a pool on a name outside the 27 (test `kill_verbs_keys`).

Each era needs, for every cause the S46 fuzz sees in that era, a pool of at least 3 verbs (M: "`KILL_VERBS` row, >= 3 verbs"); this spec asks for 6 `by` verbs, and 3 `solo` phrases for environmental causes (fire, poison, lava, geyser, fall, stone and crush when the victim stood in the way), as the bibles do. Causes an era does not override fall back to the Ancient row; that row is reused verbatim only if it passes the era's banned stems (3.9.3), otherwise the era writes its own. Planning size: 12 causes per era for Medieval and Modern (6 `by` each, 5 of them environmental with 3 `solo` each: 72 + 15 = 87), 14 for Sci-Fi (84 + 18 = 102). The real list is whatever S46 observes at E-FREEZE; the count in 3.4 (K1) is replaced by the generated one.

| bible style name | era | maps to cause | `via` | decision |
|---|---|---|---|---|
| `charge` (lance, charge-boosted hit) | Medieval | `melee` | `charge` | the six verbs are the `melee` pool of the era, picked when `via` is `charge`; fallback: they join the `melee` pool (all six read fine for a plain hit) |
| `bolt` (ap >= .5 ranged) | Medieval | `ranged` | `bolt` | same; fallback: join `ranged` |
| `boulder` (trebuchet, Lady) | Medieval | `stone` | | direct: `stone` is a legacy cause; the `solo` "was in the crater's way" stays |
| `fire` (pitch, oil, thatch) | Medieval, Sci-Fi | `fire` | | direct |
| `poison` (flask, gas) | all | `poison` | | direct |
| `bell` (stun then kill) | Medieval | `melee` | `bell` | fallback: join `melee`; "tolled", "rang for" are kept and read as melee verbs |
| `breath` (Cinderwyrm) | Medieval | `fire` | `breath` | fallback: join `fire`; "invoiced", "scorched with feeling" are fine for any fire kill |
| `gate` / `crush` (ram, keep slam, collapse) | Medieval | `crush` | `gate` | `crush` is a vehicle run-over in M; a ram counts when the attacker has tag `vehicle` or `siege`; else the kill is `melee`/`stone`. Confirm with SIM (R-H-KV1); fallback: join `stone` |
| `bullet` | Modern, Sci-Fi | `bullet` | | direct |
| `hitscan` (the lens) | Modern | `bullet` | `hitscan` | fallback: join `bullet` |
| `explosive` | Modern | `explosion` | | direct |
| `crush` | Modern, Sci-Fi | `crush` | | direct |
| `mow` (mower, Grand Mower) | Modern | `crush` | `mow` | a mower is a vehicle; fallback: join `crush` ("mowed", "trimmed", "striped" read well as crush verbs on a lawn arena only; if joined, the pool of `crush` is split by arena theme) |
| `mine` | Modern | `mine` | | direct |
| `blast` (strafing run, call-in) | Modern | `strike` | | direct: `strike` is the call-in cause |
| `pin` (suppression, not a kill) | Modern | none | | **no kill verb**: nobody dies of being pinned; the feed prints "pinned" from the `pin_applied` event, so there is no pool and no lint row |
| `energy`, `emp`, `crash`, `strike`, `explosion` | Sci-Fi | same | | direct |

**R-H-KV1** (owner SIM and INTEGRATION, P1): the killing event carries an optional `via` field (a string from the table above); `killverbs.js` keys optional sub-pools `cause + ':' + via`. **Fallback, which is what the counts assume:** `via` is ignored and the `via` verbs are merged into their parent cause pool; the pool then has up to 12 `by` verbs, which the selector's recent-use memory handles. Nothing in 3.4 changes: the strings are the same, only the pool boundaries differ.

### 3.15 Stat keys referenced by achievements and callbacks

Lifetime counters live in `stats.eraStats[era][key]` and are read through `statOf(stats, '<designName>')` (CU 3.9.3). A key that is not whitelisted is dropped on load and the achievement never unlocks, so the list below is the contract. "Design name" is the bibles' spelling; the key is the part after the prefix.

| era | key (`eraStats.<era>.`) | design name | read by | writer |
|---|---|---|---|---|
| medieval | `braceBreaks` | `medBraceBreaks` | achievement `med_pointy_end` (`>= 25`) | sim event `unit_brace`, CU 3.9.4 |
| medieval | `bannersDown`, `boltHeavyKills`, `unhorsed`, `gatesBroken`, `fireKills`, `dragonKills` | `medBannersDown` ... | Stats screen; per-battle fields feed `med_vexillologist`, `med_tin_opener`, `med_unhorsed`, `med_door_prize`, `med_oil_painting`, `med_dragon_slayer` | CU 3.9.4 |
| medieval | `healedHp` | `medHealedHp` | Stats screen; `med_soup` reads the per-battle `healedHp` | `unit_heal` sum |
| medieval | `huzzahs` | `huzzahs` | ledger gate of `med_huzzah` (`>= 11`) | **announcer driver**: +1 whenever a template with the data flag `huzzah: true` is spoken (flag assigned by this spec to the Medieval HUZZAH templates; the bibles' gag has cooldown 480 s, at most 3 per battle) |
| medieval | `loadingSnail` | (new in H) | ledger gate of `med_snail` (`>= 3`) | **loading screen**: +1 each time the snail marginalia is shown (R-H-STATS) |
| modern | `pins`, `coverHits`, `reloadHits`, `mineKills`, `rearKills`, `craters`, `airKills`, `shells` | `modPins` ... | Stats screen; per-battle fields feed `mod_pinned_it`, `mod_cover_artist`, `mod_empty_click`, `mod_mine_host`, `mod_rear_view`, `mod_crater_face`, `mod_umbrella_policy`, `mod_goldfish_hours` | CU 3.9.4 |
| modern | `healedHp` | `modHealedHp` | achievement `mod_tea_break` (`>= 5000`) | `unit_heal` sum |
| scifi | `shieldBreaks` | `sfShieldBreaks` | achievement `sf_bubble_wrap` (`>= 200`) | `shield_break`, victim on the other team |
| scifi | `ownBreaks`, `empHits`, `cloakKills`, `hoverLiquidKills`, `blinks`, `strikeKills`, `stunnedBossKills`, `healedHp`, `airKills` | `sfOwnBreaks` ... | Stats screen; per-battle fields feed `sf_turn_it_off`, `sf_peekaboo`, `sf_hover_derby`, `sf_hop_along`, `sf_deep_clean`, `sf_timber`, `sf_space_goat`, `sf_soul_search` | CU 3.9.4 |
| every era | `battles`, `wins`, `kills`, `playSeconds`, `spent` | generic | Stats sections; ledger gate `x_cb_vendor` reads the top-level `battles` | existing |

Top-level (not era-scoped) facts the ledger reads, all existing: `chickenKills`, `trojanReveals`, `wins`, `godPowers.<id>`, `byDef.<id>.spawned`, `campaign.stars`, `campaign.completedEras`, `arenasPlayed`. Achievement tests read the BattleSummary under the real names of CU 3.9.4 (`win`, `killsByCause`, `killsByDef`, not the bibles' `won`, `byCause`).

Rules and tests: (1) `eraStats` keys match `^[a-z][a-zA-Z0-9]{0,31}$`, at most 64 per era; Medieval has 10 after this spec, Modern 9, Sci-Fi 10. (2) Test `stat_keys`: every `statOf` name in an achievement test and every `stat:eraStats.<era>.<key>` in `h_callbacks.json` is in the whitelist of the table above; negative control: delete `loadingSnail` from the whitelist and the test must name `med_snail`. (3) **R-H-STATS** (owner REGISTRY and UI, P1): add `loadingSnail` to the Medieval whitelist of CU 3.9.3 and name the writer call; `huzzahs` is already in the CU list but has no writer, which this spec assigns to the announcer driver (CU18).

### 3.16 Writing-volume plan

A writer session is one agent session producing finished lines for one layer group, then running the lints on them. The rate per session is a planning figure set here, 35 to 100 strings depending on how much each string needs (a bark is cheaper than a briefing); it is re-measured on the mission-1 slice text (SLW-16) in P2 and the table is regenerated (`volume.mjs`). Numbers are from `volume.mjs` over the layer table of 3.4.

| layer group | strings per session | Medieval strings / sessions | Modern | Sci-Fi |
|---|---|---|---|---|
| announcer: era-new templates + ledger `ann:` targets | 45 | 246 / 6 | 268 / 6 | 292 / 7 |
| unit text (core, mechanic, hero/boss, moments) | 80 | 462 / 6 | 446 / 6 | 446 / 6 |
| barks and fallbacks (class barks, sim bark keys, generic) | 70 | 202 / 3 | 202 / 3 | 202 / 3 |
| lessons | 40 | 139 / 4 | 139 / 4 | 139 / 4 |
| kill verbs | 60 | 87 / 2 | 87 / 2 | 102 / 2 |
| results labels, stats tiles, achievements, mutators, tips | 40 | 167 / 5 | 171 / 5 | 173 / 5 |
| campaign: mission cards, briefings, stars, rewards, rules, acts, progression, set-pieces, powers | 55 | 236 / 5 | 238 / 5 | 234 / 5 |
| teaching beats, toasts, puzzles | 50 | 153 / 4 | 173 / 4 | 167 / 4 |
| scout, factions, arenas, props, waves, loading, presets | 70 | 260 / 4 | 263 / 4 | 275 / 4 |
| names and custom soldiers | 100 | 156 / 2 | 156 / 2 | 156 / 2 |
| era UI: cards, mechanics tab, pause quips, tb overlays, help, credits, marginalia | 35 | 119 / 4 | 121 / 4 | 123 / 4 |
| **writing sessions** | | **45** | **45** | **46** |
| repair after panel (20 percent of the writing sessions in round 1, 8 percent in round 2) | | 13 | 13 | 14 |
| panel scoring (2 rounds x 5 rater sessions) | | 10 | 10 | 10 |
| review pass (160 lines) | | 1 | 1 | 1 |
| lint and sweep fixes | | 2 | 2 | 2 |
| mission-1 slice text (SLW-16) | | 1 | 1 | 1 |
| **per era** | | **72** | **72** | **74** |

Cross-era sessions (COMEDY-EDITOR and REVIEWER, written once):

| work | sessions | when |
|---|---|---|
| shared text module (Z1 to Z8: 83 strings, 44 announcer rewrites, 9 tip rewrites) | 2 | P1 (needs the signed classification) |
| ledger authoring, `callbacks_lint` runs, writer-key assignment | 2 | P1, P2 |
| arc: cards, chooser, progression, finale surfaces (3.2) | 2 | P1 |
| panel calibration on the Ancient pack (5 rater sessions) | 5 | P1 |
| classification second read (REVIEWER) | 3 | P0 |
| cross-era audit at each era's text freeze and once at the end | 4 | P2 and P5 |
| writer prompts (`docs/eras/panel/writer/<era>.md`) | 1 | P1 |
| allowlist signing (3.9.4), one per era | 3 | with each era's P3 |
| application of the fix list to the bibles (3.10.4) | 1 | P1 |
| final cross-era report and the 160-line QA quotes | 2 | P5 |
| **total** | **25** | |

Per era 72 / 72 / 74 sessions (218) plus 25 cross-era: **243 sessions**. Order inside an era: units and names first (they feed announcer templates), then campaign text, then announcer, barks and lessons, then the small surfaces; the era's panel run starts only after `text_counts` equals `manifest.expect` (4). The mission-1 slice text (SLW-16) is written first, in P2, and is part of the 72.

### 3.17 Review and QA sampling rule

For each era and each of the 8 panel surfaces (3.11.1) the QA agent reads **20 random lines**, drawn by `tools/qa_sample.mjs`:

```
ids = sorted list of the surface's line ids
rng = RNG(hash(era + ':' + surface + ':qa:' + round))
sample = 20 ids drawn without replacement (all lines when the surface has 20 or fewer)
```

That is 160 lines per era per QA round. The report **quotes each of the 20 ids and its text** with one verdict from the review prompt of 3.11.2 (`ok`, `tone`, `safety`, `same`, `accuracy`) and a reason under twelve words. Pass condition for a surface: at least 18 of the 20 are `ok` and none is `safety`. A failing surface is repaired as a whole (not just the sampled lines), re-linted, and re-sampled with `round + 1`, which draws a different set. Two failed rounds make the surface a COORD item. Two additional reads are mandatory and are not sampled: every line that mentions the intern (3.2.7), and every line in a ledger entry (71 targets).

Script `tools/qa_sample.mjs`, test `qa_sample`: (1) the ids in the committed QA report equal the seeded draw; negative control: change the round number in the report header and the test is red; (2) the number of quoted lines is 20 per surface or the full surface; (3) no id is quoted twice. The QA report is `docs/eras/qa/<era>_text_round<n>.md` and is not a spec file.

### 3.18 Files, owners and work packages

| file | owner | phase | notes |
|---|---|---|---|
| `src/content/era_<id>/humor/{units_text,barks,killverbs,results_text,achievements,mutators_text,tips,announcer,names,custom_text,scout_text,credits_text,arc}.js`, `lesson_text.js`, `sim_text.js`, `teaching.js`, `puzzles.js`, `campaign_text.js`, `godpowers.js`, `wave_names.js`, `quick_presets.js`, `ui.js` strings | COMEDY-x (ui.js with UI) | P2 | the layer table of 3.4 names the file of each layer |
| `src/content/shared/announcer_shared.js` and `tools/gen_shared_announcer.mjs` | COMEDY-EDITOR (text), REGISTRY (generator) | P1 | after the signed classification; "regeneration produces no diff" |
| `src/content/shared/callbacks_gen.js`, `tools/gen_callbacks.mjs` | INTEGRATION (generator), COMEDY-EDITOR (JSON) | P1 | generated from `h_callbacks.json` |
| `docs/eras/spec/h_callbacks.json`, `real_world_seed.json` | COMEDY-EDITOR | P0 (done) | machine-checked by appendix B and by the sweep |
| `tools/text_audit.mjs`, `tools/callbacks_lint.mjs` | TOOLS-VERIFY | P1 | appendices A and B are the reference implementations; the shipped tools must produce the same numbers |
| `tools/text_matrix.mjs`, `tools/qa_sample.mjs`, `tools/humor-sim.mjs` (era extension) | TOOLS-VERIFY | P1 | B2/K1 generation, 3.17, 3.5.5 |
| `tests/humor/{shapes,lints,banned,callbacks,death_rubric,engine_mix,text_counts}.test.mjs`, `tests/humor/allow/<era>.json` | TOOLS-VERIFY, signed by REVIEWER | P1 | section 4 lists the tests with thresholds |
| `docs/eras/panel/{prompt_v1.txt,prompt_review_v1.txt,panel.json,models.json,ancient_scores.csv,writer/<era>.md}` | COMEDY-EDITOR | P1 | VF 3.14 owns the schema |

Work packages: **WP-H1** classification second read (REVIEWER, P0); **WP-H2** shared text module and `gen_shared_announcer` (P1); **WP-H3** callbacks tooling and generated module (P1); **WP-H4** tools and tests of section 4 (P1); **WP-H5** panel calibration (P1); **WP-H6** to **WP-H8** the era text (P2, one per era, 72 / 72 / 74 sessions, each ends with its own lint and sweep run); **WP-H9** panel rounds and repair per era (P3, at the era's E-FREEZE text freeze); **WP-H10** QA sampling and review (P5); **WP-H11** final cross-era audit and report (P5).


## 4. Acceptance

Every row is a registered criterion (`criterion(id, {er, owner, tier, negctl, text})`, VF-D1): it names its script, its inputs, a numeric threshold, its owner, its tier (F = T-fast, E = T-era, U = T-full, R = release-only, H = scheduled-heavy, VF 3.1) and the negative control that must turn it red. All rows feed ER11 unless stated; rows with "agent step" are judged by sessions, not by code, and are labelled as such in the report ("panel-judged", never "funny"). Phase is when the row first runs; it runs on every later gate of its tier. `NC-H-n` ids are registered under `tests/negctl/` next to the VF ER11 controls (NC-VF-08, 46, 47, 48); a criterion with no executed control is UNVERIFIED, not green (VF-D1).

### 4.1 Criteria

**Announcer pool (classification dependency)**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H1 | `tests/humor/announcer_pool.test.mjs` (`ids`) | era pool files, Ancient `TEMPLATES`, the frozen classification CSV, the signed review CSV | every `ids` entry exists in Ancient `TEMPLATES` and has final class `neutral`; the review CSV exists, is signed, Cohen's kappa >= 0.6 (ACC-6 numbers: agreement >= 90 percent, >= 18 of 20 seeded labels caught) | REGISTRY, REVIEWER (signature) | F (R for the signature) | NC-H-01: add one `ancient` id to `ids` -> red naming the id |
| T-H2 | same file (`shared`) | `announcer_shared.js`, CSV | every `shared` entry maps to one `convertible` row; rewrite <= 22 words (tips 18), only slots and filters of the announcer vocabulary, not equal to the original | REGISTRY | F | NC-H-02: a rewrite that equals its source -> red |
| T-H3 | same file (never-reuse) | era pools, CSV | no id of class `ancient`, no `mission` category line, no Medieval `brace` line in Modern or Sci-Fi | REGISTRY | F | NC-H-03: put `battle_start_a_giza` in a pool -> red |
| T-H4 | `tools/gen_shared_announcer.mjs --check` | CSV, `announcer_dump.mjs` | dump hash equals the recorded `794d0c50...64be4` (ACC-5); reused lines per era = 227 / 226 / 226 (3.5.3); regeneration produces no diff | REGISTRY | F | NC-H-04: change the seed order of the partition -> the counts differ and the check is red |
| T-H5 | same file (depth) | resolved pools | per generic category the resolved pool has >= R lines (R of 3.5.3) and every voice present | COMEDY-EDITOR | F | NC-H-05: remove the 12 shortfall lines of one era -> red on the first category below R |
| T-H6 | `announcerEffective(era)` counter, test `announcer_effective.test.mjs` | the three era pool objects | >= 300 (floor 250) and equal to 477 / 498 / 522 at the committed state (a drop of more than 5 lines is a diff to explain); every signature category has >= 3 lines per voice (>= 9) | COMEDY-EDITOR | F (P1 to P3) | NC-H-06: delete one signature category -> red |
| T-H7 | `tools/humor-sim.mjs --era <id> --pool era` | 10 recorded event logs per era x 120 simulated minutes, seeds 11, 12, 13 | the table of 3.5.5: repeats within 5 min <= 2 percent, top line <= 3 percent, 0 rule violations, every generic category spoken, >= 4.0 lines per minute, >= 240 distinct lines, spoken reuse share <= 65 percent | TOOLS-VERIFY | E (3 logs), R (10 logs) | NC-H-07: run with the 24-line pool of the classification (3.12) -> red on categories and rate |

**Counts and text layers**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H8 | `tests/humor/text_counts.test.mjs` with `tools/text_matrix.mjs --era` | era pack files, `manifest.expect.textLayers` | per layer: count equals `manifest.expect` and is >= the floor of 3.4; per era the sum is >= 1,882 and, once the generated values replace the planning values, equals the table total (2,229 / 2,259 / 2,306 at E-FREEZE if the matrices are unchanged); the three-era total is reported | TOOLS-VERIFY, COMEDY-x | F | NC-H-08: drop one death quote -> red naming layer U1 |
| T-H9 | `tests/humor/style_limits.test.mjs` (extends `tests/humor/text.test.mjs`) | every string of the era, by surface | the word limits of 3.6 (bubbles <= 12, announcer <= 22, tips <= 18, briefing <= 30, cards body <= 80, premise <= 40, footer <= 20, lessons <= 20 / 14, etc.) | TOOLS-VERIFY | F | NC-H-09: a 23-word announcer line -> red |
| T-H10 | `tests/humor/shared_string.test.mjs` | all eras' strings | the only string identical in two eras is the registered one (the blocked-power line); every other duplicate is a failure | TOOLS-VERIFY | F | NC-H-10: copy a Medieval tip into Modern -> red |

**Callbacks (static T-H11 and runtime T-H12 to T-H15)**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H11 | `tools/callbacks_lint.mjs` (appendix B) | `h_callbacks.json`, the three `context.json`, the Ancient pack | 0 errors; >= 30 entries (71), >= 10 targets per new era (20 / 21 / 30), >= 15 cross-era (41), >= 8 setup-free (14); target <= 24 words (30 progression, 70 cards); Brutus <= 2 caps groups; one `setBy` per flag; the closed gate vocabulary | TOOLS-VERIFY | F | the 12 mutations of 3.3.7, each red, the control green (run, appendix B.2) |
| T-H12 | `tests/humor/callbacks.test.mjs` (closed) | generated `callbacks_gen.js`, stubbed save, real selector | for each of the 57 gated entries, with the gate closed, 200 selector runs render the target 0 times | INTEGRATION | F | NC-H-12: make `callbackOpen` return true -> red on the first gated entry |
| T-H13 | same file (open and once) | same | with the gate open the target renders within 200 runs and exactly once per profile (`seen.callbacks['<id>:t']` set) | INTEGRATION | F | NC-H-13: stop writing the `:t` mark -> red (renders twice) |
| T-H14 | same file (order) | the 8 save fixtures of 3.3.8 plus every entry's `check.cases` | the line sets per fixture equal the expected sets; an Ancient-never player in any entry order sees no gated line whose gate is closed, and every setup-free line passes the cold check | INTEGRATION | F | NC-H-14: open `mod_cb_contract` with no Medieval star -> red |
| T-H15 | same file (writers) | `SET_ON`, `cbSources`, Ancient pack | each of the 12 flags is set from exactly one `setBy` key when that key renders; every `cbSources` id exists in the live Ancient pack and marks its flag when rendered; `seen.callbacks` <= 400 keys (69 used) | INTEGRATION, REGISTRY | F | NC-H-15: rename an Ancient id in `cbSources` -> red |
| T-H16 | agent step (panel, 3.3.6) | the 14 setup-free targets alone, names masked | >= 2 of 3 raters state a joke; no `confusing` flag | COMEDY-EDITOR (PANEL) | H | NC-H-16: a line of pure setup ("It happened again.") is run in the batch and must fail |

**Arc**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H17 | `tests/humor/arc_cards.test.mjs` | `arc_cards.fixture.json` (14 states), real card renderer | text, order and element count equal the table of 3.2.2 in all 14 states; premise only when no card seen and no star; footer = first matching, at most one; body <= 80 words, premise <= 40, footer <= 20 | UI | F | NC-H-17: show the premise to a profile with a star -> red |
| T-H18 | `tests/humor/arc_order.test.mjs` | save fixtures, results screen, cleared surfaces | progression line renders once, on the first win of its mission only; finale surfaces open exactly on `era_cleared:<era>` (and the Time Passport on the fourth); What's New content per release stage R1 to R4 of 3.2.6; no string of an unreleased era in the DOM (feeds ER21b) | UI, TOOLS-VERIFY | E | NC-H-18: render a progression line on a replay -> red |
| T-H19 | `tests/humor/credits_era.test.mjs` | Credits screen per cleared set | blocks appear in the order Ancient, Medieval, Modern, Sci-Fi and only for cleared eras; no "TBD"; the studio list is unchanged | UI | F | NC-H-19: show the Sci-Fi block with Sci-Fi uncleared -> red |
| T-H20 | `tests/humor/intern_cold.test.mjs` and lint `intern_surface` | all strings, the surface map | the word `intern` only on surfaces `card`, `chooser`, `power` or listed ids; each intern string alone contains `Zeus` or `intern's note` or `the intern` plus a verb; at most 2 mentions on one arrival card, 1 on a chooser caption, one "Intern's note" line per screen | COMEDY-EDITOR, UI | F | NC-H-20: put the word in a bark -> red |

**Voice, shapes, lists**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H21 | `tests/humor/death_rubric.test.mjs` | every death line of the three eras, kit lexicons, `real_world.json` | rules D2, D3, D5, D6, D7 (3.7): 0 violations; D4: >= 2 of a unit's 3 lines carry a kit word; "Tell the" <= 8 per era; the 140 examples of 3.7 pass their own detectors (run: 140 examples, 0 disagreements) | TOOLS-VERIFY | F | NC-H-21: a death line with "my wife" -> red on D2; one with "bleeding" -> red on D3 |
| T-H22 | `tests/humor/voice_laws.test.mjs` | announcer, set-piece, briefing, progression, card, scout and beat lines by `who` | Brutus: <= 2 caps groups, zero-caps share <= 12 percent, registered title cards exempt (Sci-Fi: 1); Plato: questions >= 35 percent; Cassandra: tells >= 50 percent (3.8) | TOOLS-VERIFY | F | NC-H-22: a Brutus line with three caps groups -> red |
| T-H23 | same file (`mod_muted`) and `cond.muted` selector test | Modern pack | muted-only templates carry `cond.muted: true` and none of the banned stems of 3.8.2; no unmuted template shows the muted-only joke; the label is exactly `PLATO (MUTED)` M1 to M8 | COMEDY-MOD, INTEGRATION | F | NC-H-23: a muted-only template without the cond -> red |
| T-H24 | `tests/humor/engine_mix.test.mjs` | `eng` tags, lexicon regex | E1, E2, E3 each 20 to 45 percent per era; E0 <= 20 percent; paperwork share <= 20 percent per surface of 30 or more lines and <= 8 percent era-wide; numbers share 40 / 40 / 60 percent (3.1.5); measured on the bibles today: Ancient 4.8, Medieval 3.0, Modern 4.8, Sci-Fi 4.1 | TOOLS-VERIFY | F | NC-H-24: tag every Medieval template E0 -> red |
| T-H25 | `tests/humor/shapes.test.mjs` | every string by era | zero hits of the forbidden-shape regexes of 3.10.3; `survey_cap`: `survey` in at most one line per screen in the copy-in-context trace | TOOLS-VERIFY | F | NC-H-25: a Medieval line with "thee" -> red |
| T-H26 | `tests/humor/lints.test.mjs` | every string | near-duplicate Jaccard < 0.6 (3.10.1); skeleton cluster <= max(4, 2 percent) for strings of >= 6 tokens; each filler phrase <= 2 per era; <= 9 of 20 wave names open "The"; Ancient baseline pinned in `tests/baseline/neardup_ancient.json` (2 pairs, 1 group) | TOOLS-VERIFY | E | NC-H-26: inject two identical lines -> red |
| T-H27 | `tools/text_sweep.mjs` | every string, `banned.json`, `generic.json`, `real_world.json` (759 terms), `tests/humor/allow/<era>.json` | 0 hits that are not an allowlist row; every allowlist row USED; per-row max respected; two signers, one of them REVIEWER or COMEDY-EDITOR; the sweep over the design copy gives 5 distinct hits, all expected (3.9.4) | TOOLS-VERIFY, REVIEWER | F | NC-H-27: remove an allow row -> red naming the string |
| T-H28 | `tests/humor/real_world_seed.test.mjs` | `real_world_seed.json` | >= 300 terms (759); 16 categories; no term both banned and allowed in one era; every v1 term of VF 3.14 present; the file's `selfCheck` reproduces its `counts` | TOOLS-VERIFY | F | NC-H-28: add a stem to `eraAllowed` that is in `eraBanned` -> red |
| T-H29 | `tools/text_audit.mjs` (appendix A) | the bibles, `missions.json`, the Ancient pack, the ledger | 0 findings after the fix list (before: 35, run, 3.10.4); Ancient baseline 2 pairs, 1 skeleton group; no two eras share a scout sentence | TOOLS-VERIFY | E | the before-run itself is the control (34 findings, exit 1) |
| T-H30 | `tests/humor/kill_verbs.test.mjs` (`kill_verbs_keys`) | `killverbs.js`, S46 cause fuzz | every key is one of the 27 causes; every cause seen has >= 3 verbs (target 6 `by`) and environmental causes >= 3 `solo`; no row for `pin` or `bailout`; verbs are 1 to 4 words and gender-neutral | TOOLS-VERIFY | E | NC-H-30: key a pool `charge` -> red |
| T-H31 | `tests/humor/stat_keys.test.mjs` | achievements, ledger, CU whitelist | every `statOf` name and every `eraStats` gate key is whitelisted (3.15) | TOOLS-VERIFY | F | NC-H-31: remove `loadingSnail` from the whitelist -> red naming `med_snail` |

**Comedy panel and QA**

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| T-H32 | `tests/humor/panel_order.test.mjs` | `git log`, `ancient_scores.csv` | `ancient_scores.csv` is committed before the first commit touching `era_medieval/humor/**`, `era_modern/humor/**` or `era_scifi/humor/**` | TOOLS-VERIFY | F | NC-H-32: reorder the two commits in a fixture history -> red |
| T-H33 | `tests/humor/panel_independence.test.mjs` | writer prompts, session logs, `panel.json` | the rater prompt sha256 and every anchor and decoy text occur nowhere under `docs/eras/panel/writer/` or in a writer session log; no rater session id equals a writer or repair id | TOOLS-VERIFY | F | NC-H-33: paste an anchor into a writer prompt -> red |
| T-H34 | `tools/panel.mjs --check` (agent step for the scoring) | the CSVs of 3.11.1 item 6 | CSV schema valid; anchor Spearman >= 0.8 per rater and batch; no decoy above batch median minus 1.0; inter-rater Spearman >= 0.5 per surface; **bar per surface:** era median >= Ancient median - 0.5 and 20th percentile >= Ancient 20th percentile - 1.0 and the absolute floor (median 3.0, 20th percentile 2.2); at most 2 repair rounds; else the result is a COORD item, never green | COMEDY-EDITOR (PANEL), TOOLS-VERIFY | H | NC-H-34: score decoys as the era's lines -> the bar must fail |
| T-H35 | `tools/qa_sample.mjs` and test `qa_sample` | the QA report, seeded draw | the quoted ids equal the draw; 20 per surface (or all); >= 18 of 20 `ok` and no `safety`; the two mandatory full reads (intern lines, 71 ledger targets) are present | COMEDY-EDITOR, REVIEWER | R | NC-H-35: change the round number in the report -> red |
| T-H36 | every generator run with `--check` (`gen_shared_announcer`, `gen_callbacks`, `gen_arc_fixture`, `text_matrix`) | generators | regeneration produces no diff | REGISTRY, INTEGRATION | F | NC-H-36: edit a generated file by hand -> red |

### 4.2 What was run for this file

All outputs are from 2026-10-08, from the scripts printed in the appendices, against the repository as it stands.

| run | command | result |
|---|---|---|
| audit before the fixes | `node text_audit.mjs --extra extra_corpus.json` | exit 1, 35 findings, 2,764 unique strings (T-H29 control) |
| audit after the fixes | `node text_audit.mjs --apply fixes.json --extra extra_corpus.json` | exit 0, 0 findings, 2,775 unique strings; caps groups Medieval 35 / 30 / 0, Modern 72 / 4 / 0, Sci-Fi 75 / 0 / 1 (the registered title card) |
| ledger lint | `node callbacks_lint.mjs h_callbacks.json` | 71 entries, 57 gated, 14 setup-free, by target 20 / 21 / 30, cross-era 41, 12 flags, 0 errors |
| ledger negative controls | `node nc_cb.mjs` | 12 of 12 mutations RED, the control GREEN |
| seed sweep | `node sweep.mjs` | 438 / 589 / 672 strings, 5 distinct hits on 10 strings, all 5 are expected allowlist rows |
| death rubric self-test | `node deaths.mjs` | 140 examples, 0 failures |
| pool arithmetic | from the classification CSV (473 announcer rows) | 227 / 226 / 226 reused, effective 477 / 498 / 522 |
| layer sums | `layers.mjs` over `context.json` and `missions.json` | 2,229 / 2,259 / 2,306 (6,794), shared 83, floor 1,882 |

Not run, and why: the comedy panel (it needs the era text, which this spec orders written; T-H34 cannot run before P3), the second classification read (REVIEWER, P0), the `humor-sim` repetition numbers (the era pools do not exist yet; the Ancient and reused-pool figures are in 3.5.5), the generators and tests above (they are WP-H2 to WP-H4). Nothing in this file claims they passed.

### 4.3 When the humour part of ER11 counts as met

(1) T-H1 to T-H15, T-H17 to T-H31, T-H32, T-H33, T-H36 green on the gate of their tier; (2) T-H34 passed for every surface of the three eras, or reported as `PANEL-UNRELIABLE`/a COORD item with its numbers; (3) T-H16 and T-H35 reports committed; (4) the final message says "panel-judged" for the comedy part and quotes the Ancient control scores next to the era scores.

## 5. Residual ledger

Every residual, question or request assigned to spec/H or COMEDY-EDITOR, and where it is answered. "Open" rows are in section 7.

| source | item | where answered |
|---|---|---|
| `plan.md` 0.6 | tone of the new eras (affectionate, no real nations or religions, no suffering) | 3.1 (rules per engine), 3.7 (D1 to D5), 3.9 (lists), 3.11.2 (review prompt) |
| `plan.md` 1 | text-layer rows in per-era numbers | 3.4 (table, groups, shared layers, restated row), PC-H1 |
| `plan.md` 9 / ER11 | panel-judged, relative bar, repair not deletion, 100-line samples | 3.11, T-H32 to T-H34, PC-H11 |
| `plan.md` 11 | humour: engines, arc, ledger, panel, volume | 3.1 to 3.17 |
| `plan.md` 14 row `spec/H` | contents of this file | section 1 list; every item has a section |
| `e.md` 2.6, `traceability.md` rows 2.6 and 5 | humour in every layer; the time-travel arc; scope table | 3.2, 3.4, 3.5; the row-5 shortfall (announcer 300 vs 486) is answered by the effective pool of 3.5.5 |
| `q1_product` Q11 | neutral announcer categories are not neutral | 3.5.2 to 3.5.5, T-H1 to T-H7 |
| `q1_product` Q12 | the running gag is not a designed arc | 3.2, 3.3 |
| `q1_product` Q29 | the Ancient formula will be cloned | 3.1.1 (what Ancient does), 3.1.2 to 3.1.4 (nine engines), 3.1.5, T-H24 |
| `q2_product` Q9 | premise never delivered where most players start; ledger has no mechanism | 3.2.2 (premise rule), 3.3 (mechanism), T-H12 to T-H18 |
| `q2_product` Q10 | the review measure rewards deleting 30 percent | 3.11.1 items 9 and 10, T-H34, PC-H11 |
| `q2_product` Q11 | the announcer is hard-wired to Ancient | 3.5.1 (engine side, CU18 factory), T-H6 |
| `q2_product` Q12 | text layers without counts | 3.4, T-H8 |
| `q3_product` 9 | copy truth by helper placeholders | 3.13.1 (objective and star lines), 3.13.2 (SF-DA-12 fallback copy); the lint is MS-K05 |
| `q3_product` 14 | callback seen-flags need a save key; ledger columns; minimum 30 | 3.3.2, 3.3.3 (`seen.callbacks`), 71 entries, T-H11 |
| `q3_product` 15 | panel protocol | 3.11 (all items), the sentence "three models" at the head of 3.11 |
| `q3_product` 16 | two classifications, category table, effective pool, repetition number, signature categories | 3.5.2 to 3.5.5, T-H1 to T-H7 |
| `q3_product` 17 | per-era restatement of the plan row | 3.4, "Plan section 1 restated" |
| `q3_product` 18 | arrival text per era, chooser captions, all-eras card, Credits, What's New per stage | 3.2.2 to 3.2.6 |
| `q3_product` 19 | era-neutral basics beats | 3.12.6, H-D15 |
| `q3_product` 36 | the intern: surfaces, mentions, introduction, cold-open test | 3.2.7, H-D3, T-H20 (per screen 1 "Intern's note" line; per arrival card 2 mentions at most; no per-session cap is needed because every intern string shows once per profile, except hover tooltips and the chooser caption, which are one screen each) |
| `q3_program` 27 | CU and the ladder as dependencies; each callback carries its source era; renders only if the source era is released and its flag set | binding inputs (head of the file), 3.4 floors, 3.3.2 (`sourceEra`, `requiresReleased`), 3.3.3 rule (c) |
| `q3_engine` 20 | closed kill-cause vocabulary with verb, route, reaction row, lesson row | 3.14, T-H30 (`bailout` is not a cause: M OI-5 confirmed) |
| `AR` OI-1 | `announcerEffective` | 3.5.5, T-H6 |
| `AR` AP-C04 | announcer factory options, frozen Ancient | 3.3.3 (`cbSources`, no Ancient file edited), 3.5.1 |
| `CU` OI-CU2 and R-CU-H1 | finals for provisional text | 3.12, H-D13 |
| `CU` 3.19.1 | Plato MUTED mechanism | 3.8.2, T-H23 |
| `CU` 3.9.2, 3.11.6 | meta achievements and milestone titles | 3.12.5, PC-H8 |
| `UC-50` to `UC-54` | unit text counts, limits, mechanic line, moments, sweep | 3.4 (U1 to U4), 3.6, 3.9, T-H8, T-H9, T-H27; the death lower bound is PC-H3 |
| `VF` 3.14 | text safety suite and panel | 3.9, 3.10, 3.11; amendments PC-H4, PC-H5, PC-H11, PC-H12 |
| `VF` OI-3 | `w.textTrace` hook | open, OI-H11 (the `screen` field is requested for `survey_cap`) |
| `M` OI-5 | confirm `bailout` is not a cause | 3.14: confirmed, no 28th row |
| `M` 3.12 | bark keys | 3.4 B2 (3 lines per (key, role family) pair), `text_matrix.mjs` OI-H9; event names not in the M table are marked in 3.5.4 and requested in OI-H4 |
| `MS` copy truth | star and rule numbers by helper args | 3.13.1; H-D16 (stock star-2) |
| `S-slice` SLW-16 | mission-1 text layers x3 | 3.16 (inside the 72), 3.4 |
| classification OI-1 to OI-8 | second read; R rule and shortfall; hybrid rule; 65 percent ceiling; shadow sets; Medieval signature table; engine data; `humor-sim` PC3; `gen_shared_announcer`; Brutus caps for reused lines; tip truth; ledger candidates and `CB_SOURCES` | OI-1: 3.5.2, OI-H1. OI-2: 3.5.3 to 3.5.5. OI-3: OI-H4. OI-4: OI-H2. OI-5: OI-H3. OI-6: 3.8.1 (reused Ancient lines exempt by id; the 35 flagged lines stay). OI-7: 3.9, OI-H14. OI-8: 3.3.4, `cbSources` in the JSON |
| Sci-Fi `humour.md`: `cb.mod_done`, `cb.mod_drones` | confirm names | 3.3.4, 3.13.2 |
| Medieval `humour.md`: announcer category table | missing | 3.5.4 (Medieval signature categories, shadow sets) |
| Medieval AM-MED-04, Modern DA-07 | set-piece voices | 3.13.2 (confirmed as written) |
| Modern DA-17 | greyed Minefield reason | 3.13.2, 3.12.4 (era default) |
| Modern OI-MOD-1, Sci-Fi SF-DA-18, SF-DA-19 | derived copy, puzzle texts, voices of 20 beats | 3.13.1, 3.13.2 |
| Sci-Fi SF-DA-12 | puzzle bonus stars no helper tests | 3.13.2 (fallback copy), OI-H12 |
| Sci-Fi reward part `sf_back_hoverpack` | name and blurb | 3.12.7 |
| mutator announcer flags (`mutators_achievements.md` x3) | reaction to a mutator | 3.12.2, R-H-MUT1, OI-H7 |
| Medieval `loadingSnail`, `huzzahs` | who writes the counters | 3.15, OI-H6 |
| `design/*/god_powers.md` x3 | intern in tooltips | 3.2.7, H-D3 |

## 6. Plan corrections

Where a plan or spec statement is wrong or incomplete, this is the corrected statement. The owner of the document applies it; until then this file binds the text work.

| id | document and place | it says | correct is | why | applied by |
|---|---|---|---|---|---|
| PC-H1 | `plan.md` 1 and `q2_product` Q12: "1,100 to 1,300 strings per era" | about 1,200 text strings per era | 2,229 / 2,259 / 2,306 per era (floor 1,882), 6,794 in total, plus 83 shared; Ancient on the same layers is 2,510 | the estimate counted announcer, tips, achievements, wave names and loading lines only; units, barks, lessons, kill verbs, campaign text, teaching and UI were not in it | PLAN owner (COORD) |
| PC-H2 | bibles and `spec/humor.md` 2: Brutus "exactly one ALL-CAPS word" | one caps word per line | at most two caps groups, zero-caps lines at most 12 percent, reused Ancient lines exempt by id, registered title cards exempt | the live Ancient pack: 174 of 181 Brutus lines comply with "at most two", only 69.1 percent have exactly one, one has none | `tests/humor/text.test.mjs` owner |
| PC-H3 | `UC-51`: deaths "3..12 words" | every death line has at least 3 words | 1 to 12 words; at most one line per unit under 3 words, and only a sound the unit makes ("Ahem.", "Splorp.") | the bibles ship such lines on purpose; the rubric (D7) says so | UC owner |
| PC-H4 | `VF` 3.14 skeleton lint | strings of any length are compared | only strings of 6 or more word tokens; cap `max(4, 2 percent)` | a 2-word wave name or a 3-word kill verb always shares a skeleton with another; the rule fired on nothing real | TOOLS-VERIFY |
| PC-H5 | `VF` 3.14 near-duplicate scope | each new-era string against Ancient | also new-era against new-era, and within one era; stock prefixes stripped; the exemption "Ancient neutral by id" also covers the Ancient source of every convertible rewrite (classification PC2) | the audit found 21 cross-era pairs, all new-versus-new, all on the scout surface | TOOLS-VERIFY |
| PC-H6 | classification 3.3 G: partition 227 / 229 / 229 | the draft numbers | 227 / 226 / 226 by the binding rule of 3.5.3 | the draft used another seed order | COMEDY-EDITOR |
| PC-H7 | Sci-Fi `humour.md` 3.3 What's New body | the body ends with "Your Ancient save is exactly where you left it." | the sentence is the card footer (CU), once; the body keeps only the era sentence | two copies on one card | Sci-Fi writer |
| PC-H8 | `CU` 3.11.6 milestone | "Time Lord (Honorary)" | "Honorary Time Traveller" | another franchise's title (R-CU-H1) | CU owner |
| PC-H9 | `CU` 3.5.2 Toast schema versus `MS` beats | Toast has no `who`; MS beats require `who` | the converter keeps `who` in `missions.json`; the generator drops it when emitting a Toast; `who` is `cassandra` or `plato` (3.13.1) | SF-DA-19 | UI, DESIGN-CAMPAIGN |
| PC-H10 | bibles: kill "causes" `charge bolt bell breath mow hitscan blast pin` | pools keyed by those names | pools keyed by the 27 `KILL_CAUSES`; the names become `via` values (3.14); `pin` has no verb | `q3_engine` 20 | COMEDY-x |
| PC-H11 | `VF` 3.14 / `plan.md` 9: the panel | 100 lines per surface, relative bar, 30 percent cut | `min(100, N)` lines; 6 anchors and 4 decoys per batch of 40; absolute floor (median 3.0, 20th percentile 2.2); fresh raters per round; repair, never deletion, 2 rounds | a weak Ancient control must not lower the bar; deletion lowers the count, not the quality | TOOLS-VERIFY |
| PC-H12 | `VF` 3.14 / bibles: scout texts | nine shared scout codes reworded per era | no two eras share a scout sentence; the first era in the order keeps its wording | the bibles' variants differ by one noun | COMEDY-x |
| PC-H13 | bibles' callback tables | gates "set when the codex page opens", "UI counter", flags for facts the save holds | derived reads of existing save facts; `cb` flags only for 12 facts the save does not hold (3.3.4) | retroactive for a v8 profile; no new writer | COMEDY-EDITOR (done in `h_callbacks.json`) |
| PC-H14 | `CU` 3.9.3 key list | Medieval keys end at `huzzahs` | add `loadingSnail`; name the writers of `huzzahs` and `loadingSnail` (3.15) | the ledger gates read both | REGISTRY, UI |
| PC-H15 | `missions.json` x3 (stock star-2) | the helper sentence is bare in 23 of 27 missions | bare in at most 5 of 9 per era (Ancient: 5 of 9) | H-D16 | era writers |

## 7. Open items

Each has an owner and the phase by which it must be closed. Items marked R- are requests to another spec with the fallback the counts assume.

| id | item | owner | phase |
|---|---|---|---|
| OI-H1 | second independent read of all 575 classification rows (3.5.2); until it is signed no new era uses an Ancient line, and the counts of 3.5 are conditional on it | REVIEWER | P0 |
| OI-H2 | `tools/humor-sim.mjs` extension (`--era`, `--pool`, `opts.templates`, spoken reuse share; classification PC3) and the 10 recorded logs per era | TOOLS-VERIFY | P1 (logs when the era tracer passes) |
| OI-H3 | `tools/gen_shared_announcer.mjs` and `announcer_shared.js` (T-H4); the 83 shared strings (Z1 to Z8) | REGISTRY with COMEDY-EDITOR | P1 |
| OI-H4 | R-H-ANN1: confirm or derive the events marked in 3.5.4 (`banner_rally`, `late_sally`, `shield_chain`, `shield_full`, `hover_cross`, `mech_step` via `ground_shake`, `alien_goo`, `translator`); a category without a route at E-FREEZE is cut with a `cuts.md` row | SIM, INTEGRATION | P1 |
| OI-H5 | R-H-KV1: optional `via` on the kill event and `cause:via` sub-pools; fallback in 3.14 | SIM, INTEGRATION | P1 |
| OI-H6 | R-H-STATS: `loadingSnail` in the Medieval whitelist; writers for `huzzahs` (announcer driver, data flag `huzzah`) and `loadingSnail` (loading screen) | REGISTRY, UI | P1 |
| OI-H7 | R-H-MUT1: `cond.mutator`; fallback in 3.12.2 | CU18 owner, INTEGRATION | P1 |
| OI-H8 | callbacks tooling: `tools/gen_callbacks.mjs`, `src/content/shared/callbacks_gen.js`, the `SET_ON` map, the `callbacks.has('open:<id>')` extension and the `:t` mark | INTEGRATION | P1 |
| OI-H9 | `tools/text_matrix.mjs --era` writing `manifest.expect.textLayers` (B2 and K1 are planning values until then) | TOOLS-VERIFY | P1, final at E-FREEZE |
| OI-H10 | writer prompts `docs/eras/panel/writer/<era>.md` (bible, this rubric, lint output; no rater text) and the panel files of 3.18 | COMEDY-EDITOR | P1 |
| OI-H11 | `w.textTrace` hook with a `screen` field (VF OI-3), needed by `survey_cap` and copy-in-context | COMEDY-EDITOR with SIM | P1 (hook), P2 (all surfaces) |
| OI-H12 | decide the helper vocabulary for the three Sci-Fi puzzle stars (SF-DA-12) or ship the fallback copy of 3.13.2 | DESIGN-CAMPAIGN | P1 |
| OI-H13 | apply the 65 fix rows of 3.10.4 to the bibles' text (55 hit bible text; 10 are already final in the ledger) | COMEDY-MED, COMEDY-MOD, COMEDY-SF | P1 |
| OI-H14 | signed allowlists `tests/humor/allow/<era>.json` with the 8 expected rows of 3.9.4 and the per-era tone checks of the bibles' section 9 | COMEDY-EDITOR with REVIEWER | with each era's P3 |
| OI-H15 | UC-51 amendment (PC-H3) and the registered title-card flag (`titleCard: true`, at most 3 per era, `battle_start` only) in the announcer schema | UC owner, CU18 owner | P1 |
| OI-H16 | re-measure the strings-per-session rates on the SLW-16 slice and regenerate the table of 3.16 | COMEDY-EDITOR | P2 |
| OI-H17 | panel model availability: if the platform offers only one model, the three raters differ by prompt order only and the report must say so | TOOLS-VERIFY | P1 |
| OI-H18 | blind era-fit question (3.11.1 item 7) reported to ER21; the answers are feel-sheet notes, not a gate | COORD | P3 |

## Appendix A. The text audit (reference implementation, run)

Files: save A.1 as `text_audit.mjs`, A.2 as `fixes.json`, A.3 as `extra_corpus.json` in one directory and run from the repository root as `node <dir>/text_audit.mjs --apply <dir>/fixes.json --extra <dir>/extra_corpus.json`. Options: `--json out.json`, `--thr 0.6`, `--ledger json|humour`, `--dump`, `--root <repo>`. Exit code 1 when any finding is reported. Stock sentences (helper-rendered or registered) are exempt from the near-duplicate lint.

### A.1 `text_audit.mjs`

```js
// text_audit.mjs (spec/H appendix A): cross-era near-duplicate (word 3-gram Jaccard), skeleton and voice-law audit.
// usage: node text_audit.mjs [--json out.json] [--thr 0.6] [--root /home/user/voxelwars]
import fs from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const ROOT = arg('--root', '/home/user/voxelwars');
const THR = Number(arg('--thr', 0.6));
const OUT = arg('--json', null);
const DUMP = arg('--dump', null);
const EXTRA = arg('--extra', null); // JSON {era:id -> {surface, who, text}}: strings authored in spec/H itself
const APPLY = arg('--apply', null);
const LEDGER = arg('--ledger', 'json'); // json: callback targets come from docs/eras/spec/h_callbacks.json; humour: from the ledger tables of the three humour.md files (the pre-H state)
const ERAS = ['medieval', 'modern', 'scifi'];

// ---------- corpus ----------
const corpus = []; // {era, surface, id, text, src, who}
const add = (era, surface, id, text, src, who = null) => {
  if (typeof text !== 'string') return;
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.split(/\s+/).length < (surface === 'wave' ? 1 : surface === 'card' ? 5 : 3)) return;
  corpus.push({ era, surface, id, text: t, src, who });
};
const WHO = { B: 'brutus', P: 'plato', C: 'cassandra' };
// quotes, each with the nearest preceding [B]/[P]/[C] tag
function voiced(str) {
  const out = []; let cur = null; let m;
  const re = /\[([BPC])[^\]]*\]|"([^"\n]{8,}?)"(?=[\s,.;:)\]/]|$)/g;
  while ((m = re.exec(str))) { if (m[1]) cur = WHO[m[1]]; else out.push({ text: m[2], who: cur }); }
  return out;
}
function surfaceOfTag(tag, fallback) {
  const t = tag.toLowerCase();
  if (/codex/.test(t)) return 'unit';
  if (/death/.test(t)) return 'death';
  if (/taunt/.test(t)) return 'taunt';
  if (/\btip\b/.test(t)) return 'tip';
  if (/loading/.test(t)) return 'loading';
  if (/lesson/.test(t)) return 'lesson';
  return fallback;
}
function parseHumour(era) {
  const lines = fs.readFileSync(`${ROOT}/docs/eras/design/${era}/humour.md`, 'utf8').split('\n');
  let h2 = '', h3 = '', n = 0;
  for (const L of lines) {
    if (/^## /.test(L)) { h2 = L; h3 = ''; continue; }
    if (/^### /.test(L)) { h3 = L; continue; }
    if (/^(Owner:|Voices|Tone law|Rules:)/.test(L)) continue;
    const sec = (h2.match(/^## (\d)/) || [])[1];
    if (sec === '9' || /1\.1 Running gags|2\.2 Kill verbs/.test(h3)) continue;
    if (sec === '2' && !/2\.[1-4]/.test(h3)) continue;
    if (/^\d+\. /.test(L) && (sec === '1' || sec === '5' || sec === '7')) {
      const body = L.replace(/^\d+\.\s*/, '');
      if (sec === '5') { const m = body.match(/^"(.+)"$/); if (m) add(era, 'loading', `${era}_load_${++n}`, m[1], 'loading'); continue; }
      if (sec === '7') { const m = body.match(/`(tip_[a-z_]+)`[^"]*"(.+)"/); if (m) add(era, 'tip', m[1], m[2], 'tip'); continue; }
      const tag = (body.match(/\[([^\]]+)\]/) || [, ''])[1];
      voiced(body).forEach((v) => add(era, surfaceOfTag(tag, 'announcer'), `${era}_ex_${++n}`, v.text, 'exemplar', v.who));
      continue;
    }
    if (sec === '2' && /2\.1/.test(h3) && /^\| `/.test(L)) {
      const c = L.split('|').map((x) => x.trim()); const id = c[1].replace(/`/g, '');
      voiced(c[2]).forEach((v, k) => add(era, 'unit', `${id}.blurb${k}`, v.text, 'unit sample'));
      voiced(c[3]).forEach((v, k) => add(era, 'death', `${id}.death${k}`, v.text, 'unit sample'));
      voiced(c[4]).forEach((v, k) => add(era, 'taunt', `${id}.taunt${k}`, v.text, 'unit sample'));
      voiced(c[5] || '').forEach((v, k) => add(era, 'unit', `${id}.joke${k}`, v.text, 'unit sample'));
      continue;
    }
    if (sec === '2' && /2\.3/.test(h3) && /^\| `/.test(L)) {
      const c = L.split('|').map((x) => x.trim()); const id = c[1].replace(/`/g, '');
      voiced(c[2]).forEach((v, k) => add(era, 'lesson', `${id}.text${k}`, v.text, 'lesson', 'cassandra'));
      voiced(c[3]).forEach((v, k) => add(era, 'lesson', `${id}.fix${k}`, v.text, 'lesson', 'cassandra'));
      continue;
    }
    if (sec === '2' && /2\.4/.test(h3) && /^- `/.test(L)) {
      const cat = (L.match(/^- `([a-z_]+)`/) || [])[1];
      voiced(L.replace(/^- `[a-z_]+` \[/, '- [')).forEach((v, k) => add(era, 'announcer', `${era}_cat_${cat}${k}`, v.text, 'category sample', v.who));
      continue;
    }
    if (sec === '3') {
      if (/^\|/.test(L) && /3\.2/.test(h3)) { const c = L.split('|').map((x) => x.trim()); voiced(c[c.length - 2] || '').forEach((v) => add(era, 'progression', `${era}_prog_${++n}`, v.text, 'progression', v.who)); continue; }
      voiced(L).forEach((v) => add(era, 'card', `${era}_card_${++n}`, v.text, 'arc', v.who));
      continue;
    }
    if (sec === '4' && /^\| `/.test(L)) {
      if (LEDGER === 'json') continue;
      const c = L.split('|').map((x) => x.trim()); const id = c[1].replace(/`/g, '');
      // sources quote lines that live elsewhere (ledger references); only targets are new copy
      voiced(c[3]).forEach((v, k) => add(era, 'callback', `${id}.tgt${k}`, v.text, 'ledger target', v.who));
      continue;
    }
    if (sec === '6') {
      if (/^\d+\.\s/.test(L)) for (const m of L.matchAll(/(?:^|\s{2,})\d+\.\s+(.+?)(?=\s{2,}\d+\.\s|$)/g)) add(era, 'wave', `${era}_wave_${++n}`, m[1].trim(), 'wave');
      if (/^\| \d+ \|/.test(L)) { const c = L.split('|').map((x) => x.trim()); add(era, 'wave', `${era}_boss_${c[1]}`, c[3].replace('{n}', 'N'), 'boss'); if (c[4]) voiced(c[4]).forEach((v) => add(era, 'wave', `${era}_memo_${c[1]}`, v.text, 'memo')); }
      continue;
    }
    if (sec === '8' && /^\| `/.test(L)) {
      const c = L.split('|').map((x) => x.trim()); const code = c[1].replace(/`| NEW/g, '');
      voiced(c[2]).forEach((v, k) => add(era, 'scout', `${code}.d${k}`, v.text, 'scout', v.who));
      voiced(c[3]).forEach((v, k) => add(era, 'scout', `${code}.v${k}`, v.text, 'scout', v.who));
    }
  }
}
for (const e of ERAS) parseHumour(e);

if (LEDGER === 'json') {
  const led = JSON.parse(fs.readFileSync(`${ROOT}/docs/eras/spec/h_callbacks.json`, 'utf8'));
  for (const e of led.entries) add(e.targetEra, 'callback', e.id, e.target.text, 'h_callbacks.json', e.target.voice);
}
// ---- new eras: missions.json copy (who is explicit there) ----
for (const e of ERAS) {
  const m = JSON.parse(fs.readFileSync(`${ROOT}/docs/eras/design/${e}/missions.json`, 'utf8'));
  for (const x of m.missions) {
    const t = x.text;
    add(e, 'mission', `${x.id}.title`, t.title, 'missions.json'); add(e, 'mission', `${x.id}.blurb`, t.blurb, 'missions.json');
    t.briefing.forEach((b, i) => add(e, 'briefing', `${x.id}.brief${i}`, b.text, 'missions.json', b.who));
    if (t.victory) add(e, 'briefing', `${x.id}.victory`, t.victory.text, 'missions.json', t.victory.who);
    if (t.defeat) add(e, 'briefing', `${x.id}.defeat`, t.defeat.text, 'missions.json', t.defeat.who);
    t.stars.forEach((s, i) => add(e, 'star', `${x.id}.star${i}`, s.text, 'missions.json'));
    if (t.reward) add(e, 'reward', `${x.id}.reward`, t.reward.blurb, 'missions.json');
    ((x.teaching && x.teaching.beats) || []).forEach((b) => { add(e, b.basics ? 'basics' : 'beat', b.id, b.text, 'missions.json', b.who); if (b.hint) add(e, b.basics ? 'basics' : 'beat', `${b.id}.hint`, b.hint, 'missions.json'); });
    [x.setpiece, ...(x.extraSetpieces || [])].filter(Boolean).forEach((s) => ((s.announcer && s.announcer.lines) || []).forEach((l, i) => add(e, 'setpiece', `${s.id}.${i}`, l.text, 'missions.json', l.who)));
    (x.rules || []).forEach((r, i) => add(e, 'rule', `${x.id}.rule${i}`, typeof r === 'string' ? r : r.text, 'missions.json'));
  }
  for (const p of m.puzzles) for (const k of ['blurb', 'hint', 'goalText']) add(e, k === 'goalText' ? 'goal' : 'puzzle', `${p.id}.${k}`, p[k], 'missions.json');
}

// ---- Ancient ----
const ANC = `${ROOT}/src/content/era_ancient/`;
const klass = {};
for (const row of fs.readFileSync(`${ROOT}/docs/eras/design/ancient_announcer_classification.csv`, 'utf8').split('\n').slice(1)) {
  const m = row.match(/^([a-z0-9_]+),[^,]*,[^,]*,([a-z]+),/); if (m) klass[m[1]] = m[2];
}
const A = {};
for (const f of ['humor/announcer.js', 'humor/tips.js', 'humor/units_text.js', 'humor/scout_text.js', 'humor/achievements.js', 'humor/ui_text.js', 'campaign_text.js', 'lesson_text.js', 'wave_names.js', 'sim_text.js']) A[f] = await import(ANC + f);
for (const t of A['humor/announcer.js'].TEMPLATES) add('ancient', 'announcer', t.id, t.text, 'announcer', t.who);
for (const t of A['humor/tips.js'].TIPS) add('ancient', 'tip', t.id, t.text, 'tips');
for (const [id, u] of Object.entries(A['humor/units_text.js'].UNIT_TEXT)) {
  add('ancient', 'unit', `${id}.blurb`, u.blurb, 'units_text'); add('ancient', 'unit', `${id}.lore`, u.lore, 'units_text'); add('ancient', 'unit', `${id}.joke`, u.codexJoke, 'units_text');
  (u.deaths || []).forEach((d, i) => add('ancient', 'death', `${id}.death${i}`, d, 'units_text'));
  (u.taunts || []).forEach((d, i) => add('ancient', 'taunt', `${id}.taunt${i}`, d, 'units_text'));
}
for (const [id, m] of Object.entries(A['campaign_text.js'].CAMPAIGN_TEXT)) {
  add('ancient', 'mission', `${id}.title`, m.title, 'campaign_text'); add('ancient', 'mission', `${id}.blurb`, m.blurb, 'campaign_text');
  m.briefing.forEach((b, i) => add('ancient', 'briefing', `${id}.brief${i}`, b.text, 'campaign_text', b.who));
  add('ancient', 'briefing', `${id}.victory`, m.victory.text, 'campaign_text', m.victory.who); add('ancient', 'briefing', `${id}.defeat`, m.defeat.text, 'campaign_text', m.defeat.who);
  m.stars.forEach((s, i) => add('ancient', 'star', `${id}.star${i}`, s.text, 'campaign_text')); add('ancient', 'reward', `${id}.reward`, m.reward.blurb, 'campaign_text');
}
for (const [id, l] of Object.entries(A['lesson_text.js'].LESSON_TEXT)) { l.text.forEach((s, i) => add('ancient', 'lesson', `${id}.t${i}`, s, 'lesson_text')); (l.fix || []).forEach((s, i) => add('ancient', 'lesson', `${id}.f${i}`, s, 'lesson_text')); }
A['wave_names.js'].WAVE_NAMES.forEach((s, i) => add('ancient', 'wave', `wave${i}`, s, 'wave_names'));
for (const [c, s] of Object.entries(A['humor/scout_text.js'].SCOUT_TEXT)) { add('ancient', 'scout', `${c}.d`, s.text, 'scout_text', s.who); s.variants.forEach((v, i) => add('ancient', 'scout', `${c}.v${i}`, v.text, 'scout_text', v.who)); }
A['humor/ui_text.js'].LOADING_LINES.forEach((s, i) => add('ancient', 'loading', `loading_${i + 1}`, s, 'ui_text'));
for (const a of A['humor/achievements.js'].ACHIEVEMENTS) add('ancient', 'achievement', a.id, a.desc, 'achievements');
for (const [k, arr] of Object.entries(A['sim_text.js'].SIM_BARKS)) arr.forEach((s, i) => add('ancient', 'bark', `${k}.${i}`, s, 'sim_text'));

if (DUMP) fs.writeFileSync(DUMP, JSON.stringify(Object.fromEntries(corpus.map((c) => [`${c.era}:${c.id}`, { surface: c.surface, who: c.who, text: c.text }])), null, 1));
if (EXTRA) { // strings authored in spec/H; a string that is a restatement of a line already in the corpus (same era, containment after normalisation) is the same line, not a second one
  const flat = (t) => (t.toLowerCase().match(/[a-z0-9']+/g) || []).join(' ');
  const have = corpus.map((c) => [c.era, flat(c.text)]);
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(EXTRA, 'utf8')))) { const [era, ...id] = k.split(':'); const f = flat(v.text); if (have.some(([e, t]) => e === era && (t.includes(f) || f.includes(t)))) continue; add(era, v.surface, id.join(':'), v.text, 'spec/H', v.who); }
}
// ---------- optional fix list (verifies that the proposed replacements close the findings) ----------
if (APPLY) { const fx = JSON.parse(fs.readFileSync(APPLY, 'utf8')); let hit = 0; const used = new Set(); for (const c of corpus) { const k = `${c.era}:${c.id}`; if (fx[k] !== undefined) { c.text = fx[k]; hit++; used.add(k); } } for (const k of Object.keys(fx)) if (!used.has(k) && !(LEDGER === 'json' && /\.tgt0$/.test(k))) console.error('apply: no corpus string for ' + k); console.error('applied ' + hit + ' replacements'); }
// ---------- normalisation ----------
const toks = (s) => (s.toLowerCase().replace(/\{[^}]*\}/g, ' ').match(/[a-z0-9']+/g) || []);
const shingles = (t) => { const o = new Set(); for (let i = 0; i + 3 <= t.length; i++) o.add(t[i] + ' ' + t[i + 1] + ' ' + t[i + 2]); return o; };
const STRIP = ['win with at least half your army (by cost) still standing', 'win with at least half your army (by cost) alive and the heart standing', 'win with at least half your army (by cost) alive', 'win with at least half your army alive'];
const stripStock = (t) => { const l = t.toLowerCase(); for (const p of STRIP) if (l.startsWith(p)) return t.slice(p.length).replace(/^[.\s]+/, ''); return t; };
for (const c of corpus) { c.tok = toks(stripStock(c.text)); c.sh = shingles(c.tok); }
// stock strings: helper-rendered or shared by design; exempt from the near-duplicate lint (their ids/prefixes are registered)
const STOCK_PREFIX = [];
const SHARED_STRINGS = new Set(['the intern has not been told about this one yet']); // declared shared strings (registry `shared_string`): identical on purpose in several packs
const isStock = (c) => SHARED_STRINGS.has((c.text.toLowerCase().match(/[a-z0-9']+/g) || []).join(' ')) || c.surface === 'basics' || c.surface === 'goal' || (c.surface === 'rule' && /^star 3:/i.test(c.text)) || (c.surface === 'star' && c.tok.length < 3);

const seen = new Map(); const uniq = [];
for (const c of corpus) { const k = c.era + '|' + c.tok.join(' '); if (seen.has(k)) continue; seen.set(k, c); uniq.push(c); }

// ---------- near duplicates ----------
const inv = new Map();
uniq.forEach((c, i) => { for (const s of c.sh) { if (!inv.has(s)) inv.set(s, []); inv.get(s).push(i); } });
const pairs = [];
uniq.forEach((a, i) => {
  if (!a.sh.size || isStock(a)) return;
  const cand = new Map();
  for (const s of a.sh) for (const j of inv.get(s)) if (j > i) cand.set(j, (cand.get(j) || 0) + 1);
  for (const [j, inter] of cand) {
    const b = uniq[j]; if (isStock(b)) continue;
    const J = inter / (a.sh.size + b.sh.size - inter);
    if (J >= THR) pairs.push({ J: +J.toFixed(2), a: `${a.era}:${a.surface}:${a.id}`, b: `${b.era}:${b.surface}:${b.id}`, ta: a.text, tb: b.text });
  }
});
const shortSeen = new Map(); // 3..5 token strings have 1-3 shingles: compare whole strings
for (const c of uniq) if (c.tok.length <= 5 && !isStock(c)) { const k = c.tok.join(' '); const o = shortSeen.get(k); if (o && o.era !== c.era) pairs.push({ J: 1, a: `${o.era}:${o.surface}:${o.id}`, b: `${c.era}:${c.surface}:${c.id}`, ta: o.text, tb: c.text }); else if (!o) shortSeen.set(k, c); }
const within = pairs.filter((p) => p.a.split(':')[0] === p.b.split(':')[0]);
const cross = pairs.filter((p) => p.a.split(':')[0] !== p.b.split(':')[0]);

// ---------- skeletons (>= 6 word tokens only) ----------
const STOP = ('a an the of to in on at by for with from and or but if then than that this these those is are was were be been being am do does did have has had it its ' +
  'he she they we you i me my our your their his her him them us not no nor so as too very just only also all any each every more most some such own same other what which who whom ' +
  'when where why how can could will would should may might must about into over under up down out off again once here there both few many much one now never always ' +
  'because while until before after between through against per').split(' ');
if (STOP.length !== 120) throw new Error('stop list must be exactly 120, got ' + STOP.length);
const STOPSET = new Set(STOP);
const names = new Set();
for (const e of ERAS) {
  const c = JSON.parse(fs.readFileSync(`${ROOT}/docs/eras/design/${e}/context.json`, 'utf8'));
  for (const u of Object.values(c.units)) names.add(u.name.toLowerCase());
  for (const f of c.factions) names.add(f.replace(/_/g, ' '));
  for (const g of c.godPowers) names.add(g.replace(/^(med|mod|sf)_(gp_)?/, '').replace(/_/g, ' '));
}
for (const n of Object.values(A['humor/units_text.js'].UNIT_NAMES || {})) if (typeof n === 'string') names.add(n.toLowerCase());
const nameList = [...names].filter((n) => n.length > 2).sort((a, b) => b.length - a.length);
function skeleton(text) {
  let s = ' ' + text.toLowerCase().replace(/\{[^}]*\}/g, ' @ ') + ' ';
  for (const n of nameList) s = s.split(' ' + n + ' ').join(' @ ').split(' ' + n + 's ').join(' @ ');
  const out = [];
  for (const w of s.match(/[a-z0-9'@]+|[?!]/g) || []) {
    const x = w === '@' ? 'N' : /^\d/.test(w) ? 'D' : (w === '?' || w === '!') ? w : STOPSET.has(w) ? w : 'w';
    if (x === 'w' && out[out.length - 1] === 'w') continue;
    out.push(x);
  }
  return out.join(' ');
}
const SKEL_SURF = new Set(['announcer', 'unit', 'death', 'taunt', 'tip', 'lesson', 'briefing', 'setpiece', 'scout', 'beat', 'callback', 'progression', 'card', 'reward', 'bark']);
const groups = {}, surfSize = {};
for (const c of uniq) { surfSize[`${c.era}|${c.surface}`] = (surfSize[`${c.era}|${c.surface}`] || 0) + 1; if (!SKEL_SURF.has(c.surface) || c.tok.length < 6 || isStock(c)) continue; c.skel = skeleton(c.text); (groups[`${c.era}|${c.surface}|${c.skel}`] = groups[`${c.era}|${c.surface}|${c.skel}`] || []).push(c); }
const skelFindings = [];
for (const [k, arr] of Object.entries(groups)) {
  const [era, surface, skel] = k.split('|'); const cap = Math.max(4, Math.ceil(0.02 * surfSize[`${era}|${surface}`]));
  if (arr.length > cap) skelFindings.push({ era, surface, skeleton: skel, count: arr.length, cap, ids: arr.map((x) => x.id), sample: arr[0].text });
}
// wave-name shape (names are < 6 tokens): share of names that open with "The"
const waveShape = {};
for (const e of ['ancient', ...ERAS]) { const w = uniq.filter((c) => c.era === e && c.surface === 'wave' && !/^Wave|^N/.test(c.text)); waveShape[e] = { n: w.length, the: w.filter((c) => /^the /i.test(c.text)).length }; }

// ---------- voice-law lint (new eras only) ----------
// caps group = maximal run of consecutive ALL-CAPS words whose first word has >= 2 letters (slots removed); "I" and "A" never count
const capsGroups = (t) => (t.replace(/\{[^}]*\}/g, ' ').match(/\b[A-Z][A-Z']{1,}(?:\s+[A-Z][A-Z']*)*\b/g) || []);
const TITLE_CARDS = new Set(['scifi:scifi_ex_11']); // registered title cards (templates with titleCard:true, at most 3 per era, only battle_start)
const voice = [], capsStat = {}, zeroCaps = [];
for (const c of uniq) {
  if (c.era === 'ancient' || !c.who) continue;
  const w = c.text.split(/\s+/).length;
  if (c.who === 'brutus' && ['announcer', 'progression', 'setpiece', 'briefing', 'callback', 'card', 'scout', 'beat'].includes(c.surface)) {
    const k = capsGroups(c.text); const n = Math.min(k.length, 3);
    (capsStat[c.era] = capsStat[c.era] || { 0: 0, 1: 0, 2: 0, 3: 0, total: 0 })[n]++; capsStat[c.era].total++;
    if (k.length > 2 && !TITLE_CARDS.has(`${c.era}:${c.id}`)) voice.push({ rule: 'brutus-caps-max2', era: c.era, id: c.id, caps: k, text: c.text });
    if (k.length === 0) zeroCaps.push({ era: c.era, id: c.id, text: c.text });
  }
  const lim = c.surface === 'briefing' || c.surface === 'scout' ? 32 : c.surface === 'card' ? 80 : c.surface === 'progression' ? 30 : c.surface === 'beat' ? 24 : 22;
  if (w > lim) voice.push({ rule: 'length', era: c.era, id: c.id, words: w, limit: lim, text: c.text });
}
const stats = { corpusStrings: corpus.length, unique: uniq.length, perEra: {} };
for (const c of uniq) stats.perEra[c.era] = (stats.perEra[c.era] || 0) + 1;
const report = { thr: THR, stats, withinEra: within, crossEra: cross, skeletonFindings: skelFindings, waveShape, voice, capsStat, zeroCaps, surfSize, stockStrings: uniq.filter(isStock).length, nameCount: nameList.length };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
const zeroShare = Object.fromEntries(Object.entries(capsStat).map(([e, s]) => [e, s[0] / s.total]));
const FAIL = Object.entries(waveShape).filter(([e, w]) => e !== 'ancient' && w.the > 9).length + Object.values(zeroShare).filter((x) => x > 0.12).length + within.filter((p) => !p.a.startsWith('ancient')).length + cross.length + skelFindings.filter((f) => f.era !== 'ancient').length + voice.length;
console.log(JSON.stringify({ fail: FAIL, stats, nearDupWithin: within.length, nearDupCross: cross.length, skeletonFindings: skelFindings.length, waveShape, zeroShare, voiceFindings: voice.length, zeroCapsLines: zeroCaps.length, capsStat, stock: report.stockStrings, names: nameList.length }));

process.exitCode = FAIL ? 1 : 0;
```

### A.2 `fixes.json` (65 replacement rows; key `era:id`)

```json
{
 "medieval:exposed_archers.v0": "Bows win at range and lose at a gallop. Park pikemen in front of the archers and the gallop ends early.",
 "modern:no_ranged.v1": "Not one gun in the army reaches past its own boots. I wrote that down before the first shot.",
 "modern:no_cavalry.v1": "A gunner is brave until something fast arrives. Who arrives for you?",
 "scifi:no_cavalry.v1": "Courage at range is cheap to rent. Who in your army arrives instead of waiting?",
 "modern:siege_exposed.v0": "A howitzer aims at the map and ignores its neighbours. Is that focus, or tunnel vision with a licence?",
 "scifi:siege_exposed.v0": "A salvo cart has one direction and no friends. Is that focus, or only a lack of friends?",
 "modern:siege_exposed.v1": "Nobody is guarding the gun crews. I counted the guards. It was a short count.",
 "scifi:siege_exposed.v1": "The cart crews stand alone. Alone is a position, not a plan.",
 "modern:monster_incoming.v1": "One big thing is different arithmetic from many small ones. Which is your army good at?",
 "scifi:monster_incoming.v1": "A giant is a puzzle with armour. Do you carry the right key?",
 "modern:one_note.d0": "Your army has one trick. The enemy will bring the one thing that beats it.",
 "scifi:one_note.d0": "Everything you own is the same shape. A single counter will do for all of it.",
 "modern:one_note.v1": "One kind of unit is a chorus of one. Is that a formation, or an echo?",
 "scifi:one_note.v1": "An army of one design is one question asked forty times. Will the answer change?",
 "modern:no_anti_armor.v1": "The front plate is patient. Is any of your kit patient enough to walk around it?",
 "scifi:blob_vs_ranged.v0": "One clump. Three things built to hit clumps. I did the sum.",
 "scifi:blob_vs_ranged.v1": "A big CLUMP! Big target! Spread out or the lobbers will arrange it for you!",
 "scifi:no_support.d0": "Nothing here mends anything: no Tender, no Medic, no Tech. How long is an army without repairs still an army?",
 "medieval:exposed_archers.d0": "Your bows are in the OPEN and they have cavalry! Put pikes in front and keep the bows behind them!",
 "medieval:siege_exposed.d0": "Their engines stand ALONE! Cavalry catches crews before the crews finish winding up!",
 "medieval:banner_exposed.d0": "Their banner is out in the OPEN! Drop the pole and the men beneath it run! Bring a long bow!",
 "scifi:no_ranged.v0": "Not one RIFLE in the army! You can wave at their bubbles and they will wave back!",
 "scifi:no_support.v1": "A TENDER! A Medic! A Tech! Bring one of each and stop being heroes!",
 "medieval:med_tabard.tgt0": "The tabard survived the REHEARSAL. The rehearsal did not survive the tabard.",
 "medieval:med_sponsor.tgt0": "Our sponsor has withdrawn. They cited the DRAGON.",
 "medieval:med_ram_roof": "Knock knock! STRUCTURALLY!",
 "modern:mod_cb_terms.tgt0": "The Terms of Conquest, Revision Nine, now in a plastic SLEEVE!",
 "modern:mod_cb_pizza.tgt0": "Brought to you by Pompeii Pizza, now delivered by HELICOPTER, which Cassandra has reported!",
 "modern:mod_cb_cow.tgt0": "No COW today! I checked the road twice! I am, I admit, a little disappointed!",
 "modern:mod_cb_beige.tgt0": "Beige Stationery has withdrawn its sponsorship. They cited the MOWER.",
 "scifi:sf_cb_pizza.tgt0": "Pompeii Pizza has been acquired by Low Orbit Pizza! The ash is now ZERO-gravity!",
 "scifi:sf_cb_terms.tgt0": "The Terms of Conquest are now HOLOGRAPHIC. Still laminated, in spirit.",
 "scifi:sf_cb_goat.tgt0": "The goat's great-great-GRANDGRAZER! Same helmet! Better lighting!",
 "medieval:medieval_ex_27": "Day nine of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH!",
 "medieval:one_note.v0": "ALL pikes, all horses, all bows! The enemy has one answer and a big, big smile!",
 "medieval:med_sp_wrong_cue.0": "The bugle went off EARLY! Four seconds early! The horses have heard it and the horses are COMMITTED!",
 "medieval:med_castle_dour.brief0": "CASTLE DOUR! A gate! A second gate behind the first gate! HUZZAH for gate-based infrastructure!",
 "medieval:med_sp_lady_arrives.0": "LADY COUNTERWEIGHT! A three-storey frame, a hat the size of a barn, and under the bridge, a TROLL!",
 "medieval:med_grand_pageant.brief0": "THE GRAND PAGEANT! Finally! Bunting! A crowd! A REAL dragon! I bought a better tabard for this one!",
 "medieval:med_sp_dragon_wakes.0": "A DRAGON! On a keep! This is the best day of my life and it is also on FIRE!",
 "scifi:scifi_ex_2": "A shield is a promise made of light. This one just broke, and it regrows in three seconds, unlike most promises.",
 "medieval:med_sp_colours_down.1": "The banner fell and the army remembered other plans. Was it ever an army, or a very tidy crowd?",
 "modern:mod_teapot_front": "Rifles tink off a teapot's front. Its handle is at the back, and so is its weakness.",
 "modern:mod_cover_brackets": "Brackets show where a hedge stops bullets. Stand behind one, not beside it.",
 "scifi:sf_sp_please_hold.1": "The whole boulevard is on hold. Is a greeter that cannot greet still welcoming?",
 "medieval:med_ford_dithering.rule1": "Plate stops arrows but not bolts. A crossbowman cannot defend himself mid-reload.",
 "modern:mod_cb_plague.tgt0": "I predicted green once. Today's sparkle is orange. I take a smaller pleasure in it.",
 "medieval:med_tourney_trouble.star1": "Win with at least half your army (by cost) alive. The plumes do not count; they were never insured.",
 "medieval:med_castle_dour.star1": "Win with at least half your army (by cost) alive. Doors do not count as soldiers, though one has applied.",
 "medieval:med_pennywhistle_blaze.star1": "Win with at least half your army (by cost) alive. The windmill is not a unit, whatever it believes.",
 "medieval:med_grand_pageant.star1": "Win with at least half your army (by cost) alive. The dragon is not on your side, however well it is cast.",
 "modern:mod_trench_pardon.star1": "Win with at least half your army (by cost) alive. Pinned soldiers are still soldiers. Pinned dignity is not.",
 "modern:mod_rail_yard_fireworks.star1": "Win with at least half your army (by cost) alive. Boxcars are cargo, not casualties.",
 "modern:mod_switchboard_hold.star1": "Win with at least half your army (by cost) alive. The tower is not an army, but it will be missed.",
 "modern:mod_dam_finale.star1": "Win with at least half your army (by cost) alive. The Parcel is not army either; it is merely important.",
 "scifi:sf_floor_lava.star1": "Win with at least half your army (by cost) alive. The floor is lava, and lava does not count as your side.",
 "scifi:sf_turn_it_off.star1": "Win with at least half your army (by cost) alive. Powered-down units count; switched off is not scrapped.",
 "scifi:sf_noise_complaint.star1": "Win with at least half your army (by cost) alive. The neighbours are not army, though they are loud.",
 "scifi:sf_queen_size.star1": "Win with at least half your army (by cost) alive. Nine thousand children are not yours to count.",
 "medieval:medieval_ex_1": "WELCOME to the Grand Pageant! Order of events: procession, speech, accidental war! We are skipping to the third!",
 "medieval:medieval_ex_5": "First blood! Also first interval! The grandstand is selling PIES!",
 "medieval:medieval_ex_9": "FIVE in a row! That is a standing ovation, and the ovation is also in the way!",
 "modern:modern_prog_41": "The Parcel is on the move! It has a van! The van seems PROUD!",
 "scifi:scifi_ex_11": "ON A MOON FAR FROM THE SNACK BAR, two armies fight over a parking space! RATED G, FOR GLOWING!",
 "scifi:scifi_card_33": "ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling."
}
```

### A.3 `extra_corpus.json` (92 strings authored in this spec; key `era:h_<id>`)

```json
{
 "medieval:h_premise": {
  "surface": "card",
  "who": null,
  "text": "Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They were last seen in the ancient world, until Zeus's intern pressed something."
 },
 "medieval:h_arrival_body": {
  "surface": "card",
  "who": null,
  "text": "Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' by his sticky note. Brutus has acquired a tabard. Plato has acquired questions. Cassandra has acquired a cold and a bad feeling about the buffet."
 },
 "medieval:h_arrival.footer.0": {
  "surface": "card",
  "who": null,
  "text": "Zeus's intern said two minutes. That was four centuries ago."
 },
 "medieval:h_chooser_caption": {
  "surface": "card",
  "who": null,
  "text": "MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'."
 },
 "medieval:h_map_sub": {
  "surface": "card",
  "who": null,
  "text": "The Medieval Era: nine battles, three acts, one dragon"
 },
 "medieval:h_whatsnew": {
  "surface": "card",
  "who": null,
  "text": "Nine missions, six puzzles and a pageant that keeps going wrong. Pikes against horses, banners, gates, a physician and a dragon."
 },
 "medieval:h_pause_0": {
  "surface": "tip",
  "who": null,
  "text": "The herald has been asked to pause the pageant. He is reading the request aloud."
 },
 "medieval:h_pause_1": {
  "surface": "tip",
  "who": null,
  "text": "Somewhere, a horse is using the interval to reconsider."
 },
 "medieval:h_pause_2": {
  "surface": "tip",
  "who": null,
  "text": "The pikemen are holding still. They are professionals at it."
 },
 "medieval:h_pause_3": {
  "surface": "tip",
  "who": null,
  "text": "Brutus is explaining the pause to the grandstand. The grandstand is selling pies."
 },
 "medieval:h_pause_4": {
  "surface": "tip",
  "who": null,
  "text": "Cassandra says the pause will not help. She has already packed a cold remedy."
 },
 "medieval:h_pause_5": {
  "surface": "tip",
  "who": null,
  "text": "The dragon costume has been unzipped. Dennis would like a minute."
 },
 "medieval:h_pause_6": {
  "surface": "tip",
  "who": null,
  "text": "A trebuchet is mid-swing. It has asked for a moment of understanding."
 },
 "medieval:h_pause_7": {
  "surface": "tip",
  "who": null,
  "text": "Plato is asking whether a paused war is still a war. It will take a while."
 },
 "medieval:h_pause_8": {
  "surface": "tip",
  "who": null,
  "text": "The pigeon is bringing news of this pause. It has not left yet."
 },
 "medieval:h_pause_9": {
  "surface": "tip",
  "who": null,
  "text": "The moat has been checked for moat. Results to follow."
 },
 "medieval:h_pause_10": {
  "surface": "tip",
  "who": null,
  "text": "Both sides are pretending they did not hear the bugle."
 },
 "medieval:h_pause_11": {
  "surface": "tip",
  "who": null,
  "text": "A knight in plate is being helped up. It is not a quick process."
 },
 "medieval:h_power_blocked": {
  "surface": "tip",
  "who": null,
  "text": "Not this lesson. The mud has been cancelled and the horses are relieved."
 },
 "medieval:h_assist_offered": {
  "surface": "tip",
  "who": null,
  "text": "The herald has suggested an army. It has been rehearsed."
 },
 "medieval:h_credits_tail": {
  "surface": "card",
  "who": null,
  "text": "Plague: predicted. Dragon: predicted. Tabard: never predicted. Cassandra regrets nothing, except the tabard."
 },
 "modern:h_premise": {
  "surface": "card",
  "who": null,
  "text": "Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They used to work an ancient arena, until Zeus's intern pressed the wrong button."
 },
 "modern:h_arrival_body": {
  "surface": "card",
  "who": null,
  "text": "Passengers Brutus, Plato and Cassandra were re-routed by Zeus's intern, who selected NEXT ERA instead of NEXT MATCH. Headsets issued. Brutus has also been issued a clipboard. Plato has been issued nothing and is at peace with this. Cassandra has noticed a helicopter. It has not noticed her. Please hold."
 },
 "modern:h_arrival.footer.0": {
  "surface": "card",
  "who": null,
  "text": "Last time he sent a pageant. This time he sent a boarding pass."
 },
 "modern:h_arrival.footer.1": {
  "surface": "card",
  "who": null,
  "text": "Zeus's intern said two minutes. The gate agent has checked. It has been twenty-five centuries."
 },
 "modern:h_chooser_caption": {
  "surface": "card",
  "who": null,
  "text": "MODERN. The intern says this is the right century. He has pressed 'hold' on the next one."
 },
 "modern:h_map_sub": {
  "surface": "card",
  "who": null,
  "text": "The Modern Era: nine battles, three acts, one parcel"
 },
 "modern:h_whatsnew": {
  "surface": "card",
  "who": null,
  "text": "Nine missions, six puzzles and a briefing room with a headset problem. Guns that reload, cover that matters, pins, tanks with a back and a helicopter that approved itself."
 },
 "modern:h_pause_0": {
  "surface": "tip",
  "who": null,
  "text": "Both armies are on hold. The hold music is surprisingly good."
 },
 "modern:h_pause_1": {
  "surface": "tip",
  "who": null,
  "text": "Brutus has asked if anyone can hear him. Nobody has answered. He is thrilled."
 },
 "modern:h_pause_2": {
  "surface": "tip",
  "who": null,
  "text": "The tank column has stopped for a cow. The cow has right of way."
 },
 "modern:h_pause_3": {
  "surface": "tip",
  "who": null,
  "text": "Cassandra is filing a risk assessment on the pause. It will be approved by the pause."
 },
 "modern:h_pause_4": {
  "surface": "tip",
  "who": null,
  "text": "A goldfish somewhere is logging the downtime."
 },
 "modern:h_pause_5": {
  "surface": "tip",
  "who": null,
  "text": "Plato is defining 'pause'. The headset is not helping."
 },
 "modern:h_pause_6": {
  "surface": "tip",
  "who": null,
  "text": "The sandbags are enjoying the break. They were not asked to enjoy it."
 },
 "modern:h_pause_7": {
  "surface": "tip",
  "who": null,
  "text": "Somebody is looking for the end of the convoy. It is not a short search."
 },
 "modern:h_pause_8": {
  "surface": "tip",
  "who": null,
  "text": "The mortar crew is asking everyone to look both ways. Twice."
 },
 "modern:h_pause_9": {
  "surface": "tip",
  "who": null,
  "text": "Please remain on the line. Your war is important to us."
 },
 "modern:h_pause_10": {
  "surface": "tip",
  "who": null,
  "text": "A biscuit has been dropped. Morale is being assessed."
 },
 "modern:h_pause_11": {
  "surface": "tip",
  "who": null,
  "text": "The helicopter would like it noted that it is still overhead."
 },
 "modern:h_power_blocked": {
  "surface": "tip",
  "who": null,
  "text": "The intern has not been told about this one yet."
 },
 "modern:h_assist_offered": {
  "surface": "tip",
  "who": null,
  "text": "A suggested army has been issued. It is stamped and tested."
 },
 "modern:h_credits_tail": {
  "surface": "card",
  "who": null,
  "text": "Helicopter: approved. By the helicopter. Then it landed."
 },
 "scifi:h_premise": {
  "surface": "card",
  "who": null,
  "text": "Three commentators, one booth: Brutus shouts, Plato questions, Cassandra warns. They once covered a very old war, until Zeus's intern found the time remote."
 },
 "scifi:h_arrival_body": {
  "surface": "card",
  "who": null,
  "text": "ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling."
 },
 "scifi:h_arrival.footer.0": {
  "surface": "card",
  "who": null,
  "text": "Last time he sent a boarding pass. This time he pressed button three."
 },
 "scifi:h_arrival.footer.1": {
  "surface": "card",
  "who": null,
  "text": "He skipped a few centuries. The remote says that is allowed."
 },
 "scifi:h_arrival.footer.2": {
  "surface": "card",
  "who": null,
  "text": "Zeus's intern said two minutes. The remote now reads 'several thousand years, approximately.'"
 },
 "scifi:h_chooser_caption": {
  "surface": "card",
  "who": null,
  "text": "THE FUTURE. Selected by Zeus's intern, who held the remote upside down."
 },
 "scifi:h_map_sub": {
  "surface": "card",
  "who": null,
  "text": "The Future: nine battles, three acts, one very large bedroom"
 },
 "scifi:h_whatsnew": {
  "surface": "card",
  "who": null,
  "text": "Nine missions, six puzzles, one bubble that comes back. Hover tanks, cloaks, EMP, blink and an orbital strike with paperwork."
 },
 "scifi:h_pause_0": {
  "surface": "tip",
  "who": null,
  "text": "Bubbles are regrowing. Nobody is being rude to them. That is the whole point."
 },
 "scifi:h_pause_1": {
  "surface": "tip",
  "who": null,
  "text": "The translator has rated the pause at twelve percent. It is being brave."
 },
 "scifi:h_pause_2": {
  "surface": "tip",
  "who": null,
  "text": "A hover tank is hovering over the pause. It does not know how to stop."
 },
 "scifi:h_pause_3": {
  "surface": "tip",
  "who": null,
  "text": "Plato wonders whether a pause is a state or a mood. The microphone is live."
 },
 "scifi:h_pause_4": {
  "surface": "tip",
  "who": null,
  "text": "The booth popcorn has been refilled. Brutus is not sorry."
 },
 "scifi:h_pause_5": {
  "surface": "tip",
  "who": null,
  "text": "Cassandra predicted the pause. She is, for four seconds, pleased."
 },
 "scifi:h_pause_6": {
  "surface": "tip",
  "who": null,
  "text": "A survey has appeared asking how you feel about the pause. Do not answer it."
 },
 "scifi:h_pause_7": {
  "surface": "tip",
  "who": null,
  "text": "The Concierge is holding the door for the pause. It is a heavy door."
 },
 "scifi:h_pause_8": {
  "surface": "tip",
  "who": null,
  "text": "Warranty status of the pause: void if removed."
 },
 "scifi:h_pause_9": {
  "surface": "tip",
  "who": null,
  "text": "A Skitterling is waiting politely. This is the most alarming thing on the field."
 },
 "scifi:h_pause_10": {
  "surface": "tip",
  "who": null,
  "text": "The orbital strike is charging. It would like you to know it is in no hurry."
 },
 "scifi:h_pause_11": {
  "surface": "tip",
  "who": null,
  "text": "Everything is on hold except the stickers."
 },
 "scifi:h_power_blocked": {
  "surface": "tip",
  "who": null,
  "text": "The intern has not been told about this one yet."
 },
 "scifi:h_assist_offered": {
  "surface": "tip",
  "who": null,
  "text": "A suggested army has been prepared. Satisfaction is not guaranteed."
 },
 "scifi:h_credits_tail": {
  "surface": "card",
  "who": null,
  "text": "Bubbles: regrown. Warranty: void. Cassandra: pleased for four seconds."
 },
 "medieval:h_mut_chicken_rain_desc": {
  "surface": "tip",
  "who": null,
  "text": "Chickens in tabards fall from the sky now and then, and they side with whoever is losing. Nobody ordered them."
 },
 "modern:h_mut_chicken_rain_desc": {
  "surface": "tip",
  "who": null,
  "text": "Hi-vis chickens fall from the sky now and then and side with whoever is losing. They were not on the rota."
 },
 "modern:h_mut_wine_rain_always_desc": {
  "surface": "tip",
  "who": null,
  "text": "It is permanently raining coffee. Everyone is a little jittery."
 },
 "scifi:h_mut_moon_gravity_desc": {
  "surface": "tip",
  "who": null,
  "text": "The Moon is already low gravity. Now so is everything else: knockback is tripled. Please do not look up."
 },
 "scifi:h_mut_moon_gravity_joke": {
  "surface": "tip",
  "who": null,
  "text": "The Moon was already low gravity. This is the fiesta."
 },
 "scifi:h_mut_chicken_rain_desc": {
  "surface": "tip",
  "who": null,
  "text": "Clockwork chickens fall from the sky now and then and side with whoever is losing. Nobody can find the off switch."
 },
 "scifi:h_mut_wine_rain_always_desc": {
  "surface": "tip",
  "who": null,
  "text": "It is permanently raining coolant. Everyone is a little glitchy. Machines are exempt and unbearable about it."
 },
 "medieval:h_reason_0": {
  "surface": "tip",
  "who": null,
  "text": "Foam cannot be a glass cannon. The committee is confused."
 },
 "medieval:h_reason_1": {
  "surface": "tip",
  "who": null,
  "text": "Both of these are about what goes in the cup. The abbey declines to choose."
 },
 "modern:h_reason_0": {
  "surface": "tip",
  "who": null,
  "text": "Two kinds of everyone gets hit. The post office refuses to choose."
 },
 "modern:h_reason_1": {
  "surface": "tip",
  "who": null,
  "text": "Puzzle weapons are pre-stamped."
 },
 "modern:h_reason_2": {
  "surface": "tip",
  "who": null,
  "text": "A puzzle has no mail."
 },
 "scifi:h_reason_0": {
  "surface": "tip",
  "who": null,
  "text": "The warranty and the overcharge disagree about bubbles."
 },
 "scifi:h_cleared_end": {
  "surface": "card",
  "who": null,
  "text": "RATED G, FOR GLOWING. No bubble was harmed. Several were popped. Thank you for watching. Stay for the credits: there is a scene after the credits."
 },
 "modern:h_cleared_sheet1": {
  "surface": "card",
  "who": null,
  "text": "PARCEL DELIVERED. Recipient: Zeus (on leave). Contents: one return ticket (to the right century), one sandwich initialled 'I.', one note reading 'Sorry about the routing.' Signature: Cassandra, reluctantly."
 },
 "modern:h_cleared_sheet2": {
  "surface": "card",
  "who": null,
  "text": "RISK ASSESSMENT: HELICOPTER (OVERHEAD). STATUS: LANDED. CAUSE: UNKNOWN. FILED BY: CASSANDRA. APPROVED BY: NOBODY. The helicopter has retired."
 },
 "scifi:h_passport": {
  "surface": "card",
  "who": null,
  "text": "Ancient: a goat. Medieval: a groat. Modern: a boarding pass. The Future: a ticket stub. RETURN TICKET: PUNCHED. Destination: the booth, in the original century, at the original coffee. Brutus: 'It says UPDATING! That is the best word I have ever read!' Plato: 'I suspect the update is also the problem.' Cassandra: 'I said it would end like this.' Everyone agrees, for once. The booth is now a drive-in. The remote has been confiscated. Somebody has been promoted; we will not say who."
 },
 "modern:h_finale_victory": {
  "surface": "briefing",
  "who": "plato",
  "text": "I was heard. I would like it noted that I mostly said that this was a bad idea."
 },
 "scifi:h_finale_victory": {
  "surface": "briefing",
  "who": "plato",
  "text": "The war is won. The definition is not. I accept 'noise', provided the committee does."
 },
 "scifi:h_meta_time_hop": {
  "surface": "achievement",
  "who": null,
  "text": "Win a campaign mission in two different eras. The commentators have had a lot of luggage."
 },
 "scifi:h_meta_double_feature": {
  "surface": "achievement",
  "who": null,
  "text": "Finish two campaigns. Intermission not included."
 },
 "scifi:h_meta_triple_feature": {
  "surface": "achievement",
  "who": null,
  "text": "Finish three campaigns. The popcorn has been refilled twice."
 },
 "scifi:h_puzzle2_star_fallback": {
  "surface": "tip",
  "who": null,
  "text": "Bring every Dustpan home. Their bubbles are on their own."
 },
 "scifi:h_puzzle3_star_fallback": {
  "surface": "tip",
  "who": null,
  "text": "Lose nobody to the six cloaked guests."
 },
 "scifi:h_puzzle4_star_fallback": {
  "surface": "tip",
  "who": null,
  "text": "Use EMP on at least four machines. The hold music is optional."
 },
 "scifi:h_reward_hoverpack": {
  "surface": "card",
  "who": null,
  "text": "Four glow pads for your shoulders. Floor optional."
 }
}
```

### A.4 `sweep.mjs` (REAL_WORLD seed sweep over the design copy)

Run in the directory that holds `real_world_seed.json` (copy of `docs/eras/spec/real_world_seed.json`) and `extra_corpus.json`.

```js
import fs from 'fs';
const ROOT='/home/user/voxelwars';
const seed=JSON.parse(fs.readFileSync('real_world_seed.json','utf8'));
const strip=(s)=>s.normalize('NFKD').replace(/[\u0300-\u036f\u200b-\u200d]/g,'');
const esc=(t)=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const mk=(t,cs)=>{ let p=esc(strip(t)).replace(/\\? \\?/g,'[\\s-]+').replace(/ /g,'[\\s-]+').replace(/\\-/g,'[\\s-]'); return new RegExp('(^|[^A-Za-z0-9])'+p+'(s|es)?($|[^A-Za-z0-9])', cs?'':'i'); };
function build(era){ const R=[]; for(const [cid,c] of Object.entries(seed.categories)){ if(!c.eras.includes(era)) continue; for(const t of c.terms) R.push({cid,t,re:mk(t,c.cs.includes(t))}); } for(const st of seed.eraBanned[era].stems) R.push({cid:'eraBanned',t:st+'*',re:new RegExp('(^|[^a-z])'+esc(st),'i')}); return R; }
const strings={};
for(const e of ['medieval','modern','scifi']){
  const out=[]; const md=fs.readFileSync(`${ROOT}/docs/eras/design/${e}/humour.md`,'utf8').split('\n'); let sec9=false;
  for(const L of md){ if(/^## 9\./.test(L)) sec9=true; else if(/^## /.test(L)) sec9=false; if(sec9) continue; for(const m of L.matchAll(/"([^"\n]{6,})"/g)) out.push(m[1]); }
  const m=JSON.parse(fs.readFileSync(`${ROOT}/docs/eras/design/${e}/missions.json`,'utf8'));
  const walk=(v)=>{ if(typeof v==='string'){ if(v.length>8 && /[ ]/.test(v)) out.push(v);} else if(Array.isArray(v)) v.forEach(walk); else if(v&&typeof v==='object') for(const [k,x] of Object.entries(v)) if(!['id','arena','recipe','defId','trigger','helper','cue','sfx','stinger','kind','role','shot','notes','mood','objective','params','rewardId','markerIds','enemy','player','script','inputs','reference','fixed','bots','botsWhy','blind','godPowers','powers','requiresModules','teaches','tests','combines','softModules','starTests','teaching_exceptions','exceptions'].includes(k)) walk(x); };
  for(const x of m.missions){ walk(x.text); walk(x.rules); walk((x.teaching||{}).beats); for(const s of [x.setpiece,...(x.extraSetpieces||[])].filter(Boolean)) walk(s.announcer); }
  for(const p of m.puzzles) walk({t:p.title,b:p.blurb,h:p.hint,g:p.goalText,f:p.firstSightBeat&&p.firstSightBeat.text});
  for (const x of JSON.parse(fs.readFileSync(ROOT+'/docs/eras/spec/h_callbacks.json','utf8')).entries) if (x.targetEra===e) out.push(x.target.text);
  for (const [k,v] of Object.entries(JSON.parse(fs.readFileSync('extra_corpus.json','utf8')))) if (k.startsWith(e+':')) out.push(v.text);
  strings[e]=[...new Set(out)];
}
let totalHits=0; const summary={};
for(const e of ['medieval','modern','scifi']){ const R=build(e); const hits={}; for(const s of strings[e]){ const t=strip(s); for(const r of R){ if(r.t==='M4' && /\bfrom M4\b/.test(s)) continue; if(r.re.test(t)){ const k=r.cid+':'+r.t; (hits[k]=hits[k]||[]).push(s.slice(0,90)); } } } summary[e]={strings:strings[e].length,terms:R.length,hitTerms:Object.keys(hits).length}; totalHits+=Object.keys(hits).length; console.log('==',e,JSON.stringify(summary[e])); for(const [k,a] of Object.entries(hits)) console.log('  ',k,'x'+a.length,'|',a[0]); }
```

## Appendix B. The callback ledger lint (reference implementation, run)

### B.1 `callbacks_lint.mjs`

```js
// callbacks_lint.mjs (spec/H appendix B): reference implementation of tools/callbacks_lint.mjs.
// usage: node callbacks_lint.mjs [path/to/h_callbacks.json] [--root /home/user/voxelwars]
import fs from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const ROOT = arg('--root', '/home/user/voxelwars');
const FILE = process.argv.slice(2).find((a) => a.endsWith('.json')) || `${ROOT}/docs/eras/spec/h_callbacks.json`;
const J = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const errs = [];
const bad = (id, msg) => errs.push(`${id}: ${msg}`);

// ---- reference data: missions, units, stats whitelist ----
const ERAS = ['ancient', 'medieval', 'modern', 'scifi'];
const missions = { ancient: ['marathon_sort_of', 'thermopylae_snack', 'pyramid_scheme', 'nile_crossing', 'alps_elephant', 'teutoburg_peekaboo', 'troy_giftshop', 'cyclops_meet', 'zeus_bad_day'] };
const units = { ancient: new Set() };
for (const e of ERAS.slice(1)) {
  const c = JSON.parse(fs.readFileSync(`${ROOT}/docs/eras/design/${e}/context.json`, 'utf8'));
  missions[e] = c.ladder.map((l) => l.id); units[e] = new Set(Object.keys(c.units));
}
const missionEra = {}; for (const [e, a] of Object.entries(missions)) a.forEach((id, i) => { missionEra[id] = { era: e, index: i }; });
const allUnits = new Set(Object.values(units).flatMap((s) => [...s]));
const STAT_PATHS = [/^chickenKills$/, /^trojanReveals$/, /^battles$/, /^wins$/, /^godPowers\.[a-z_]+$/, /^byDef\.[a-z_]+\.spawned$/, /^eraStats\.(medieval|modern|scifi)\.[a-zA-Z0-9]{1,31}$/];

// ---- gate grammar (closed vocabulary) ----
function parseExpr(expr, id) {
  const m = expr.match(/^(any|all)\((.*)\)$/);
  if (m) { let depth = 0, cur = ''; const parts = []; for (const ch of m[2]) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts.forEach((p) => parseExpr(p, id)); }
  let q;
  if ((q = expr.match(/^mission_star:([a-z_]+)$/))) { if (!missionEra[q[1]]) bad(id, `unknown mission ${q[1]}`); return; }
  if ((q = expr.match(/^era_(cleared|opened):([a-z]+)$/))) { if (!ERAS.includes(q[2])) bad(id, `unknown era ${q[2]}`); return; }
  if ((q = expr.match(/^stat:([A-Za-z0-9_.]+)>=(\d+)$/))) { if (!STAT_PATHS.some((r) => r.test(q[1]))) bad(id, `stat path not whitelisted: ${q[1]}`); return; }
  if ((q = expr.match(/^ach:([a-z_]+)$/))) return;
  if ((q = expr.match(/^codex_open:([a-z_]+)$/))) { if (!allUnits.has(q[1])) bad(id, `unknown unit ${q[1]}`); return; }
  bad(id, `gate expression outside the closed vocabulary: ${expr}`);
}
const gateEras = (g) => { // eras a gate depends on
  if (!g) return [];
  if (g.kind === 'cb') return [];
  if (g.kind === 'any' || g.kind === 'all') return g.parts.flatMap(gateEras);
  const out = []; for (const m of g.expr.matchAll(/(?:mission_star|era_cleared|era_opened|codex_open|stat):([A-Za-z0-9_.]+)/g)) { const k = m[1]; if (missionEra[k]) out.push(missionEra[k].era); else if (ERAS.includes(k)) out.push(k); }
  return out;
};

const seen = new Set();
const counts = { total: 0, gated: 0, 'setup-free': 0, byTarget: {}, cross: 0 };
const cbSetBy = {}; // flag -> setBy keys
for (const e of J.entries) {
  const id = e.id; counts.total++;
  if (seen.has(id)) bad(id, 'duplicate id'); seen.add(id);
  if (!/^[a-z][a-z0-9_]{2,47}$/.test(id)) bad(id, 'id shape');
  if (!['gated', 'setup-free'].includes(e.type)) bad(id, 'type'); else counts[e.type]++;
  for (const k of ['sourceEra', 'targetEra']) if (!ERAS.includes(e[k])) bad(id, `${k} unknown`);
  counts.byTarget[e.targetEra] = (counts.byTarget[e.targetEra] || 0) + 1; if (e.sourceEra !== e.targetEra) counts.cross++;
  if (!Array.isArray(e.requiresReleased) || !e.requiresReleased.includes(e.sourceEra) || !e.requiresReleased.includes(e.targetEra)) bad(id, 'requiresReleased must contain sourceEra and targetEra');
  if (!e.target || !e.target.key || !e.target.text) bad(id, 'target needs key and text'); else {
    if (!/^[a-z]+:[A-Za-z0-9_.:-]+$/.test(e.target.key)) bad(id, `target key shape ${e.target.key}`);
    const words = e.target.text.trim().split(/\s+/).length; const lim = e.target.surface === 'card' ? 70 : e.target.surface === 'prog' ? 30 : 24; if (words > lim) bad(id, `target text ${words} words > ${lim}`);
    if (/\{[^}]*\}/.test(e.target.text) === false && /undefined|NaN|\[object/.test(e.target.text)) bad(id, 'target text contains a placeholder artefact');
    if (e.target.voice === 'brutus') { const g = (e.target.text.replace(/\{[^}]*\}/g, ' ').match(/\b[A-Z][A-Z']{1,}(?:\s+[A-Z][A-Z']*)*\b/g) || []).length; if (g > 2) bad(id, `Brutus line has ${g} caps groups (max 2)`); }
  }
  if (!e.source || !e.source.key) bad(id, 'source needs key');
  if (e.source && e.source.frozen && !e.source.text) bad(id, 'frozen Ancient source must carry its text');
  if (e.type === 'setup-free') { if (e.gate) bad(id, 'setup-free must not have a gate'); if (!e.check || e.check.kind !== 'cold') bad(id, 'setup-free needs a cold check'); }
  if (e.type === 'gated') {
    if (!e.gate) bad(id, 'gated needs a gate'); else {
      const walk = (g) => {
        if (g.kind === 'cb') { if (!/^[a-z][a-z0-9_]{2,40}$/.test(g.flag || '')) bad(id, 'cb flag shape'); if (!g.setBy) bad(id, 'cb gate needs setBy (who writes the flag)'); (cbSetBy[g.flag] = cbSetBy[g.flag] || new Set()).add(g.setBy); }
        else if (g.kind === 'derived') parseExpr(g.expr, id);
        else if (g.kind === 'any' || g.kind === 'all') g.parts.forEach(walk);
        else bad(id, `gate kind ${g.kind}`);
      };
      walk(e.gate);
      // a gated callback may depend only on eras it requires
      for (const ge of gateEras(e.gate)) if (!e.requiresReleased.includes(ge)) bad(id, `gate reads era ${ge} but requiresReleased is ${e.requiresReleased}`);
      // sequential gates: the source mission must come strictly before the target mission of the same era
      if (e.gate.seq) {
        const m = e.gate.expr.match(/mission_star:([a-z_]+)/); const tm = (e.target.key.match(/^(?:prog|brief|victory|defeat):([a-z_]+)/) || [])[1];
        if (m && tm && missionEra[m[1]] && missionEra[tm] && !(missionEra[m[1]].era === missionEra[tm].era && missionEra[m[1]].index < missionEra[tm].index)) bad(id, `seq gate: ${m[1]} is not before ${tm}`);
      }
    }
    if (!e.check || e.check.kind !== 'gate') bad(id, 'gated needs a gate check');
  }
}
// one writer set per flag (a flag is set by exactly one source key, or by an explicit CB_SOURCES group)
for (const [f, s] of Object.entries(cbSetBy)) if (s.size > 1) bad(f, `flag has ${s.size} different setBy keys: ${[...s].join(' | ')}`);
// minimums
if (counts.total < 30) bad('ledger', `only ${counts.total} entries (< 30)`);
for (const e of ['medieval', 'modern', 'scifi']) if ((counts.byTarget[e] || 0) < 10) bad('ledger', `${e} has ${counts.byTarget[e] || 0} targets (< 10)`);
if (counts.cross < 15) bad('ledger', `only ${counts.cross} cross-era entries (< 15)`);
if (counts['setup-free'] < 8) bad('ledger', `only ${counts['setup-free']} setup-free entries (< 8)`);
const keys = new Map(); for (const e of J.entries) { const k = e.target.key; if (keys.has(k)) bad(e.id, `target key ${k} also used by ${keys.get(k)}`); keys.set(k, e.id); }
console.log(JSON.stringify({ file: FILE.replace(ROOT + '/', ''), counts, flags: Object.keys(cbSetBy).length, errors: errs.length }));
for (const m of errs.slice(0, 40)) console.log('  ' + m);
process.exitCode = errs.length ? 1 : 0;
```

### B.2 `nc_cb.mjs` (the 12 negative controls of 3.3.7)

Run in a scratch directory that also holds `callbacks_lint.mjs`; it writes `nc_tmp.json` there.

```js
import fs from 'fs'; import cp from 'child_process';
const base=JSON.parse(fs.readFileSync('/home/user/voxelwars/docs/eras/spec/h_callbacks.json','utf8'));
const run=(name,mut)=>{ const d=JSON.parse(JSON.stringify(base)); mut(d); fs.writeFileSync('nc_tmp.json',JSON.stringify(d)); const r=cp.spawnSync('node',['callbacks_lint.mjs','nc_tmp.json'],{encoding:'utf8'}); console.log((r.status?'RED   ':'GREEN ')+name+' -> '+(r.stdout.split('\n')[1]||'').trim().slice(0,110)); };
run('remove a gate',d=>{d.entries.find(e=>e.id==='med_tabard').gate=null;});
run('unknown mission in gate',d=>{d.entries.find(e=>e.id==='med_tabard').gate.expr='mission_star:med_no_such';});
run('setup-free with a gate',d=>{d.entries.find(e=>e.id==='mod_cb_terms').gate={kind:'derived',expr:'era_cleared:ancient'};});
run('duplicate id',d=>{d.entries[1].id=d.entries[0].id;});
run('seq order violated',d=>{d.entries.find(e=>e.id==='med_contract').gate.expr='mission_star:med_castle_dour';});
run('Brutus three caps groups',d=>{d.entries.find(e=>e.id==='med_pigeon').target.text='THE PIGEON! IT has RETURNED with NEWS!';});
run('stat path not whitelisted',d=>{d.entries.find(e=>e.id==='sf_cb_chicken').gate.expr='stat:secretKills>=1';});
run('cb gate without writer',d=>{d.entries.find(e=>e.id==='med_stool').gate.setBy=null;});
run('gate reads an unreleased era',d=>{d.entries.find(e=>e.id==='mod_cb_contract').requiresReleased=['modern'];});
run('delete 45 entries (< 30)',d=>{d.entries.splice(0,45);});
run('overlong target (31 words)',d=>{d.entries.find(e=>e.id==='med_stool').target.text=Array(31).fill('word').join(' ');});
run('two writers for one flag',d=>{d.entries.find(e=>e.id==='sf_cb_plague').gate.setBy='sp:other:1';});
run('control: unmodified',d=>{});
```

## Appendix C. Death-rubric detectors (from the self-tested script)

The three regexes below are the detectors of D1 (second-person insult hint), D2 and D3; the other detectors are counters (word count, "Tell the" prefix, REAL_WORLD match, kit lexicon) described in 3.7.

```js
const PLEAD = /\b(wife|husband|mother|father|mum|dad|son|daughter|children|kids|family|brother|sister)\b|\bplease,? (no|stop)\b|\b(do not|don't) want to die\b|\bbegging\b|\bwhy me\b|\bleave me\b|\bgo home\b|\bcoming home\b/i;
const PAIN = /\b(bleed(ing)?|blood|pain|hurts?|burns?|bones?|my (leg|arm|arms|head)|cannot feel|going cold|ow ow)\b/i;
const YOUINSULT = /\b(you|your)\b.*\b(toddler|idiot|stupid|trash|noob|genius|scrub|pathetic)\b|\bget good\b|\bnice aim\b|\bpathetic\b|\bfat fool\b|\bidiot\b|\bforeigners\b|\bugly\b|\bshort man\b|\bvillage\b/i;
```
