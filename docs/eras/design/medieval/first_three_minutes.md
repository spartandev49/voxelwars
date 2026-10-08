# Medieval: the first three minutes of mission 1 (`med_dress_rehearsal`), plus the first-sight toast queue for missions 1 to 3

Binding for UI (CU5 teaching data), CAMPAIGN-MED (mission 1 data), COMEDY-MED (copy) and ER19 (every beat fires, once, in order). Beat ids, triggers and who/text are exactly what goes into `era_medieval/teaching.js`. Mission data is in `missions_outline.md`; unit ids are final per `rosters.md`; arena and prop ids are provisional (see section 0.1 there).

## 0. Rules this script obeys

1. **Two layers, two keys.** `basics:true` beats are the once-ever layer (`seen.basics[id]`): placing, Fight, pause and speed, god powers, results. Every other beat is an era beat (`seen.beats[id]`, once per era). A returning player who has seen the basics in ANY era never sees them again; a returning player who skipped the Ancient tutorial (`Skip tutorial`) is treated as having seen basics (the skip sets all basics).
2. **Mission 1 needs only modules #1..#5** (M0 M1 M3 M2 M2b) so the end-of-P1 plumbing slice can run this exact script through the real UI. Nothing below needs banners, bailout, gates or any later module. Brace and Hold already exist in the engine.
3. **Arbitration** (CU5): a set-piece shot beats a beat, a beat beats a first-sight toast, a god-power aim cursor beats all three. A deferred beat re-queues 3 s after the blocking element ends. Only one beat or toast is visible at once; beats show 6 s, toasts 4 s; at least 5 s of nothing between two visible items in battle.
4. **Esc or click** skips the arrival card, the set-piece shot and any beat. "Skip tutorial" (Settings or the corner button on a beat) sets `seen.basics`; "Skip era tips" sets all `med_*` beats and first-sight toasts for this era. Reduce Motion cuts instead of dollying and swaps the portal for a fade.
5. **Timing model.** t0 = the click on the Medieval chooser card. Battle time t is measured from Fight. The numbers are authored targets for a median player; ER19 checks ORDER and ONCE, not seconds.
6. **The intern is offstage.** He appears only in the arrival card and the chooser caption. He has no portrait and no voice.

## 1. (i) Fresh player: never launched the game, picks Medieval first

Preconditions: empty save, no `seen.*`. Title screen to Campaign to the era chooser (four cards; with no history the Ancient card would be pre-focused, here the player clicks Medieval).

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | Click on the Medieval card. Card flips to parchment, 1.2 s time-portal (bell, page-turn). Music crossfades to the map bed. | | |
| 0:02 | arrival card | Full-screen skippable card, 8 s, three portraits in tabards. | "TIME TRAVEL ADVISORY. Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' according to his sticky note. Brutus has acquired a tabard. Plato has acquired a contract. Cassandra has acquired a cough and a bad feeling about the buffet." Button: "Begin the Pageant". | era (not a beat; own key `seen.arrival.medieval`) |
| 0:10 | campaign map | The Disputed Hedges of Marrowby. Pin 1 (wax seal) pulses; pins 2 to 9 are dim; the dotted ink route to pin 2 is faint; a small dragon doodle sleeps in the margin. | no text | |
| 0:13 | map | Click pin 1. Briefing overlay opens: rubric initial, title, three voice lines type in (about 3 s each). | [B] "WELCOME to the Grand Pageant of Marrowby! Bunting! A crowd! And a cavalry charge that is, I am assured, TRADITIONAL!" [P] "The Yeomen have been cast as the peasants who get charged. Is a part still a part if you are paid in pikes?" [C] "The foam lances were swapped for real ones at the interval. I wrote 'interval' on the form. Nobody reads the form." | era |
| 0:28 | briefing | Rules, par ("Spend at most 2,250 groats"), three star lines, reward preview (the foam-sword mutator card). "Skip tutorial" button visible bottom-left. | rules text of mission 1 | |
| 0:32 | briefing | Click Deploy. Cut to placement. | | |
| 0:33 | placement | Field, blue-grey deploy strip on the Yeomen side, enemy side shows silhouettes of six lancers. Four unit cards: pikeman, billman, longbowman, peasant_levy. Budget 3,000 gr. | | |
| 0:34 | placement | Beat **`b_place_line`**, trigger `placement_start`, [P]: "Pick a card, then drag across the field to draw a line. It looks simple because it is." Hint: "Choose the line brush, then drag." Pointer on the pikeman card. | Plato | basics |
| 0:46 | placement | After the first placement, beat **`med_brace_place`**, trigger `placement_start` (queued behind the basics beat), [P]: "Points toward the horses, please. A pike braces only if it is standing still." Hint: "Pikes brace on Hold. The Hold order is on the squad card." Pointer on the Hold order. | Plato | era |
| 0:48 | placement | Scout line appears (code `no_anti_cav` re-worded) if the player has no pikes yet; otherwise nothing. | [C] "They have cavalry and you have almost no pikes. Pikes standing still stop a charge, so add some and hold them." | era |
| 1:10 | placement | The Fight button pulses once the army is above 25 percent of budget. A returning player is never nagged; a fresh player gets this one pulse. | | |
| 1:20 | placement | Player presses Fight. (Authored median: 47 s of placement. The Suggested-army button is hidden until two defeats.) | | |
| 1:20 + t0 | battle | **t = 0** Fight. Battle music (low tier). Announcer: campaign start line, [B]: "Today's event is Dress Rehearsal (Swords Are Foam)! A very serious title for a very silly afternoon!" (generic `battle_start` mission line). Beat **`b_fight`**, trigger `battle_start`, [B]: "FIGHT! Press the button, watch the line, and try not to narrate it." | Brutus | basics |
| t = 3 | battle | Beat **`med_hold_order`**, trigger `battle_start` + 3 s, [C]: "Keep the pikes on Hold. They brace while they wait. The horses will not wait for you to decide." Hint: "Moving a pike cancels its brace." | Cassandra | era |
| t = 8 | battle | First-sight toast **`fs_lancer`** when the first lancer enters view (see section 3). Beat **`b_speed`**, trigger `battle_start` + 8 s, [C]: "Space pauses. The speed keys change the pace. Nobody asked me, so I am telling you." | Cassandra | basics |
| t = 14 | battle | Hoof thunder starts (audible tell, first-sight toast **`fs_charge_thunder`**, 4 s): "Hooves getting louder means a charge is coming. Count to three." | | era |
| t = 16 | battle | **Set-piece `med_sp_wrong_cue`**: the bugle sounds four seconds early; the lancers are released; a low dolly from behind the pike line toward the charge, 4 s, sim at 0.5x; stinger `med_sting_wrong_cue`; announcer lines (see missions_outline). The shot blocks every beat until it ends. | [B] "THE BUGLE WENT OFF EARLY!..." | set-piece |
| t = 20 | battle | Shot ends. First contact: lancers meet the braced pikes. The first `brace_break` fires: gold streaks vanish, the lance splinters, the horse stops, the grandstand says "ooh". | | |
| t = 21 | battle | Beat **`med_brace_win`**, trigger `brace_break`, [P]: "The poles held and the horses reconsidered. Is a pike a weapon, or a very firm opinion on a stick?" | Plato | era |
| t = 25 | battle | Beat **`b_powers`**, trigger `first_contact` + 4 s, [C]: "Keys 1 to 6 are your god powers. Press 1." Hint: "Number keys 1 to 6 cast god powers. Each has a cooldown." The power bar slot 1 pulses; the tooltip reads "Royal Courtesy Volley: A volley from archers who are not there. The intern was told 'a bit of lightning' and sent an archery club." | Cassandra | basics |
| t = 27 | battle | Player presses 1 and clicks the field: six thin shadows converge on a ring, seven arrows land. `tutorialLine` for the power is shown once as a caption: "Press 1. Aim at a clump. The intern sent an archery club." | | era |
| t = 32 | battle | Squires arrive in two waves; the scrum starts. Longbow volleys arc over the pikes. First-sight toasts **`fs_squire`** (t = 33) and **`fs_pageant_dragon`** (t = 38). | | era |
| t = 48 | battle | First enemy rout (squires losing nerve after the lancers broke). Toast **`fs_rout`**: "Soldiers who lose their nerve run. Officers and banners help them keep it." | | era |
| t = 60 | battle | With no fire in play the pageant dragon simply waddles behind the squires, out of step. The announcer takes a `pageant_dragon` line when it first trades blows. | [B] "Wilfred is in front! Dennis is behind! They disagree about the DIRECTION!" | |
| t = 85 | battle | Last squire down. Victory. Stinger `victory`. Beat **`b_done`**, trigger `battle_end`, [B]: "THAT is how you win a battle! Do it again, smarter, for the stars!" | Brutus | basics |
| +0:05 | results | Results screen: three star slots light one after another with a wax-seal stamp (APPROVED). Funny stats (soldiers inconvenienced, lancers reviewed). Lesson line in Cassandra's voice from the `brace_win` detector: "Our pikes took {n} charges head-on. I said horses are bad at poles." Star 3 lights if spend <= 2,250. | | |
| +0:20 | results | Reward reveal: mutator card "Pageant Rules" with a bonk. Title "Extra With Lines" on the chooser card. Codex pages unlocked. | | |
| +0:35 | results | "Next: Lances, Allegedly Blunted" is highlighted. Click returns to the map; the pin 2 seal is stamped open, the dotted route fills with gold thread. | | |

Totals for the authored median: chooser 0:00, briefing deployed 0:32, Fight 1:20, set-piece 1:36, first brace break 1:40, victory about 2:45, stars shown by 2:55, next-mission prompt at 3:00. The script above shows the player has not been told about banners, gates, healers or the dragon; the dragon doodle on the map margin and the arrival card are the only foreshadowing.


### 1.1 Fresh-player beat order for ER19 (ids, in order)

`arrival.medieval` (own key), `b_place_line`, `med_brace_place`, `b_fight`, `med_hold_order`, `b_speed`, [toast `fs_lancer`], [toast `fs_charge_thunder`], `med_sp_wrong_cue` (set-piece), `med_brace_win`, `b_powers`, [toasts `fs_squire`, `fs_pageant_dragon`, `fs_rout`], `b_done`.

## 2. (ii) Returning Ancient player: has finished Ancient (or skipped its tutorial), opens Medieval for the first time

Preconditions: `seen.basics` set (a returning skipper also counts), `progress.stars` for Ancient present, `settings.lastEra = ancient`. The player has met the `what's new` card once after the splash (or finds the Medieval card with a NEW ribbon).

Expectations of this player: they know placing and Fight, they know the god-power bar and morale, they will try to build a phalanx, they will press 1 expecting lightning, they will try to charge the pikes forward. The script respects that and teaches only what is new: Hold-as-brace, the audible charge tell, the Medieval power names.

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | The chooser opens with the Ancient card pre-focused and "Continue Ancient" as the primary. The Medieval card is wearing a NEW ribbon and a tapestry still; caption: "MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'." Player clicks Medieval. 1.2 s portal. | | |
| 0:02 | arrival card | Same card as fresh (8 s, skippable). Because Ancient was completed, the gated callback applies to the card footer: "Zeus's intern said two minutes. That was four centuries ago." | | era |
| 0:10 | map | Pin 1 pulses. | | |
| 0:12 | briefing | Click pin 1; briefing as fresh. "Skip tutorial" is NOT shown (basics already seen); "Skip era tips" is shown instead. | | |
| 0:28 | briefing | Deploy. | | |
| 0:29 | placement | **No basics beats.** Beat **`med_brace_place`**, [P]: "Points toward the horses, please. A pike braces only if it is standing still." Pointer on the Hold order. If the player draws a hoplite-style tight line the scout code `no_anti_cav` is NOT shown (they have pikes). | Plato | era |
| 0:45 | placement | Player presses Fight (authored median: 25 s of placement). | | |
| t = 0 | battle | Announcer line only; **no `b_fight`**. Beat **`med_hold_order`** at t = 3, [C]: "Keep the pikes on Hold. They brace while they wait. The horses will not wait for you to decide." | Cassandra | era |
| t = 8 | battle | Toast `fs_lancer`. No `b_speed`. | | era |
| t = 14 | battle | Toast `fs_charge_thunder`. | | era |
| t = 16 | battle | Set-piece `med_sp_wrong_cue`, identical. | | set-piece |
| t = 21 | battle | `med_brace_win`. | Plato | era |
| t = 25 | battle | No `b_powers`. Instead, the first time the player presses 1 (any time), a one-off era caption: "Medieval powers differ from the Ancient set. This one is the Royal Courtesy Volley: the intern sent an archery club." (`tutorialLine`, own key `seen.beats.med_power_1`.) Pressing 2 through 6 for the first time shows the same style of caption with that power's `tutorialLine` (see `god_powers.md`). | caption | era |
| t = 32 to 60 | battle | Toasts `fs_squire`, `fs_pageant_dragon`, `fs_rout` (the rout toast is shown only if `seen.firstsight.rout` is absent, which it is not for a veteran: it is silently skipped). | | era |
| t = 85 | battle | Victory. No `b_done`. | | |
| +0:05 | results | Results as fresh. | | |
| +0:35 | results | Next prompt. | | |

Totals: Fight at about 0:45, set-piece at about 1:01, victory at about 2:10, next-mission prompt at about 2:45. A returning player sees 5 era beats and 6 first-sight toasts; a fresh player sees 5 basics beats, 3 era beats and 6 toasts.

### 2.1 Returning-player beat order for ER19

`arrival.medieval` (footer gated line), `med_brace_place`, `med_hold_order`, [toasts `fs_lancer`, `fs_charge_thunder`], `med_sp_wrong_cue`, `med_brace_win`, [caption `med_power_1` on first press], [toasts `fs_squire`, `fs_pageant_dragon`].

### 2.2 Edge cases the test matrix must cover

1. Returning Ancient skipper plays Medieval mission 1: gets every era beat, no basics (test required by plan CU5).
2. A Medieval-first player later opens Ancient: the Ancient mission-1 flow is bit-identical to today (G10): Ancient basics were already seen, so only the Ancient era beats fire.
3. Out-of-order: the player presses Fight before `med_brace_place` fires: the beat is dropped, not queued; `seen.beats` is marked so it never reappears.
4. The player never draws a pike: `med_hold_order` still fires at t = 3; `med_brace_win` never fires; the results lesson is the generic `cavalry_charge` lesson.
5. The player is defeated twice: the briefing offers the Suggested army (CU15); the beats do not repeat (they are once per era).
6. Reduce Motion on: the set-piece is a cut, the beat text still shows.
7. The god-power aim cursor is active when a beat is due: the beat waits 3 s after the cursor is released.

## 3. First-sight toast queue, missions 1 to 3

Toasts are unordered (they fire when the thing is first seen), keyed `seen.firstsight[id]` once per profile (a veteran's Ancient toasts for shared concepts, such as rout, are keyed separately). One line each, <= 16 words, a name in capitals, then the rule. Toasts never interrupt a set-piece or a beat; they queue and expire after 12 s if not shown.

### Mission 1

| id | trigger | text |
|---|---|---|
| `fs_lancer` | first lancer enters view | "LANCER. Charges from a run-up and hits like a tree. Braced pikes stop it." |
| `fs_charge_thunder` | first charge begins (hoof tell) | "Hooves getting louder means a charge is coming. Count to three." |
| `fs_squire` | first squire in view | "SQUIRE. Carries the knight's armour, lance, lunch and blame." |
| `fs_pageant_dragon` | first pageant dragon in view | "PAGEANT DRAGON. Two men and a costume. Cheers loudly, panics easily." |
| `fs_pikeman` | first pikeman placed | "PIKEMAN. Braces while standing still. Face the horses." |
| `fs_billman` | first billman placed | "BILLMAN. A hooked blade that pulls riders off horses. Keep him near the pikes." |
| `fs_longbowman` | first longbowman placed | "LONGBOWMAN. Fires over friends. Weak up close; put him behind the line." |
| `fs_peasant_levy` | first levy placed | "PEASANT LEVY. Cheap, fragile and braver in a crowd." |
| `fs_rout` | first enemy rout | "Soldiers who lose their nerve run. Officers and banners help them keep it." |

### Mission 2

| id | trigger | text |
|---|---|---|
| `fs_standard_bearer` | first standard bearer in view | "STANDARD BEARER. Carries a banner. Friends nearby hit harder and keep their nerve. Kill him first." |
| `fs_ser_valiant` | first Ser Valiant in view | "SER VALIANT. Three plumes, a charge and a banner. Whoever is under it fights on." |
| `fs_banner_ring` | first banner ring seen | "The ring on the ground is the banner's reach. Step out of it or cut the pole." |
| `fs_great_hog` | first great hog in view | "GREAT HOG. Best In Show, and cross about it. A charge with legs; pikes stop it." |
| `fs_reeve` | first reeve placed | "REEVE. Carries the Yeomen banner. Keep him inside the block." |
| `fs_tilt_barrier` | first charge in the lists | "The tilt barrier keeps a charge in its lane. Horses cannot cross it." |

### Mission 3

| id | trigger | text |
|---|---|---|
| `fs_crossbowman` | first crossbowman placed or seen | "CROSSBOWMAN. Bolts pierce plate. Helpless while winding up; strike then." |
| `fs_pavise_bearer` | first pavise bearer placed or seen | "PAVISE BEARER. A door on legs. Stops bolts from the front; go round it." |
| `fs_knight_afoot` | first knight afoot in view | "KNIGHT AFOOT. Plate turns arrows. Bills, bolts and poison do not care." |
| `fs_plate_clink` | first arrow bounces off plate | "Clink. That is plate. Arrows polish it; bolts go through." |
| `fs_reload_tell` | first crossbow wind-up seen | "That cranking is a reload. The shooter is helpless until it stops." |
| `fs_hold_marker` | first hold marker in view | "Hold the marked ground until the clock runs out. An enemy standing on it stops the clock." |
| `fs_ford` | first unit in the ford | "The ford slows everyone who wades in it. Charging through water is a rumour." |
| `fs_stakes` | first spike stakes in view | "STAKES. Horses path around them. Use them to steer a charge." |

### 3.1 Expected fresh-player exposure across missions 1 to 3

| mission | basics beats | era beats | toasts | set-piece |
|---|---|---|---|---|
| 1 | 5 (`b_place_line`, `b_fight`, `b_speed`, `b_powers`, `b_done`) | 3 | 9 | 1 |
| 2 | 0 | 4 (`med_colours_first`, `med_colours_ring`, `med_colours_fall`, `med_tilt_lane`) | 6 | 1 |
| 3 | 0 | 6 (`med_bolts_clink`, `med_bolts_reload`, `med_bolts_ap`, `med_hold_how`, `med_ford_slow`, `med_blind_foil`) | 8 | 1 |

A veteran sees the same eras without the 5 basics beats.
