# Sci-Fi: the first three minutes of mission 1 (`sf_lunch_break`), plus the first-sight toast queue for missions 1 to 3

Binding for UI (CU5 teaching data), CAMPAIGN-SF (mission 1 data), COMEDY-SF (copy) and ER19 (every beat fires, once, in order). Beat ids, triggers and who/text are exactly what goes into `era_scifi/teaching.js`. Mission data is in `missions_outline.md` (unit, arena and prop ids are final per `rosters.md`, `arenas.md` and `props.md`); god-power names are in `god_powers.md`; the arrival card is the ticket stub of `humour.md` s3.1; the ladder script this file expands is `arenas.md` s3.5.

## 0. Rules this script obeys

1. **Two layers, two keys.** `basics:true` beats are the once-ever layer (`seen.basics[id]`): placing, Fight, pause and speed, god powers, results; the five ids are identical in every era (`b_place_line b_fight b_speed b_powers b_done`). Every other beat is an era beat (`seen.beats[id]`, once per era). A returning player who has seen the basics in ANY era never sees them again; a returning player who skipped a tutorial (`Skip tutorial`) is treated as having seen basics (the skip sets all basics).
2. **Mission 1 needs only modules #1..#5** (M0 M1 M3 M2 M2b) so the end-of-P1 plumbing slice can run this exact script through the real UI. Its set-piece trigger is a content-layer timer (`MissionRuntime`, 30 s), its second wave is an existing `ScriptedWaves` entry (`breather: 25`), and its enemy is hum1 only. **The bubble is the exception that needs #17 (M4):** `eshield` is predeclared by M0 and inert until the module lands. In the slice build no `shield_hit`, `shield_break` or `shield_recover` event exists, so the beats `sf_b_bubble`, `sf_b_pop`, `sf_b_lull` and `sf_tender_ring` and the toasts `fs_shield_pip`, `fs_sweep_ring` simply never fire (their triggers are sim events, not timers), the Warden's dome block (an existing offhand shield arc) still works, and the mission plays as a plain chip fight. ER19's shield assertions for M1 run after #17; the slice asserts the path: chooser, arrival, map, briefing, placement, Fight, set-piece, wave 2, victory, stars, reward, next pin.
3. **Arbitration** (CU5): a set-piece shot beats a beat, a beat beats a first-sight toast, a god-power aim cursor beats all three. **Within beats, an era mechanic beat outranks a basics beat** (except `b_fight` at t = 0 and `b_done` at the end), so the bubble lesson is never pushed behind `b_speed`. A deferred beat re-queues 3 s after the blocking element ends. One beat or toast is visible at once; beats show 6 s, toasts 4 s; at least 5 s of nothing between two visible items in battle. A queued basics beat that is still waiting when the battle ends is shown on the results screen instead.
4. **Esc or click** skips the arrival card, the set-piece shot and any beat. "Skip tutorial" (Settings or the corner button on a beat) sets `seen.basics`; "Skip era tips" sets all `sf_*` beats and first-sight toasts for this era. Reduce Motion cuts instead of dollying, swaps the warp tunnel for a fade and keeps the bubble recharge sweep (a functional tell) without the flash.
5. **Timing model.** t0 = the click on the Sci-Fi chooser card. Battle time t is measured from Fight. The numbers are authored targets for a median player; ER19 checks ORDER and ONCE, not seconds.
6. **The intern is offstage.** He appears in the arrival card, the chooser caption and the god-power tooltips. He has no portrait and no voice.
7. **Plato is on the air.** Modern ended with Plato unmuted; his microphone light is simply on, no label. His lines in this mission are ordinary.

## 1. (i) Fresh player: never launched the game, picks Sci-Fi first

Preconditions: empty save, no `seen.*`. Title screen to Campaign to the era chooser (four cards; with no history the Ancient card would be pre-focused, here the player clicks the Sci-Fi card).

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | Click on the Sci-Fi card (a night-time toy-shop window: a hover tank on a stand, a Warden with a hex dome, a Glow Grazer plush, a popcorn bucket; caption "THE FUTURE. Selected by Zeus's intern, who held the remote upside down."). The card zooms into the pane: a 1.2 s warp tunnel of hexagonal streaks, a soft whump and a chime. Music crossfades to the map bed "Star Chart Lounge". | | |
| 0:02 | arrival card | Full-screen skippable ticket stub, 8 s, three portraits (a headset over a toga, a lit microphone, a seatbelt). Heading in Brutus's voice: "THE FUTURE!" Body: "ARRIVAL: THE FUTURE. The fax from the last century was forwarded here. It said 'Please hold.' Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual. Brutus has been issued a headset that fits a toga. Plato's microphone light is on. Cassandra has a seatbelt and a feeling." Button: "Press Button Three". | | era (own key `seen.arrival.scifi`, not a beat) |
| 0:10 | campaign map | The drive-in star chart. Pin 1, the Moon, pulses; pins 2 to 9 are dim; the dashed lane to pin 2 is dotted and faint; the projector cone flickers once; the upside-down time remote sits in the corner. The map bed plays. | no text | |
| 0:13 | map | Click pin 1. The B-movie poster briefing opens: the tagline "HE CAME FOR THE MOON. HE STAYED FOR THE LEASE." in Bungee, the title "Moon Base Lunch Break", then the three voice lines type in with a booth chirp before each (about 3 s each). | [B] "WELCOME to the future! Same wars, bigger bubbles, no sandals!" [P] "The Moon has been repossessed. Can one evict a rock?" [C] "They have rivet guns first and runners second. Between the two, the bubbles come back. Use the gap. I said use the gap." | era |
| 0:28 | briefing | Rules, "Spend at most 2,250 ergs" for star 3, three star lines, the reward preview (the Fishbowl Helmet). "Skip tutorial" button bottom-left. | rules text of mission 1 | |
| 0:32 | briefing | Click Deploy. Cut to placement. | | |
| 0:33 | placement | The Moon base from above: three domes on a black sky with a big blue planet, a 12 u airlock lane, solar arrays, the Concord zone at the west edge and the faint silhouettes of eight rivet gunners at the east edge. Three unit cards: `tidy_trooper`, `bulwark_warden`, `bubble_tender`. Budget 3,000 ergs. | | |
| 0:34 | placement | Beat **`b_place_line`**, trigger `placement_start`, [P]: "Pick a card, then drag across the field to draw a line. It looks simple because it is." Hint: "Choose the line brush, then drag along the Concord edge." Pointer on the Warden card. | Plato | basics |
| 0:46 | placement | On entering placement the two arena toasts (`fs_dome_panel`, `fs_low_gravity`); after the first placement, the first-sight toasts for the cards the player clicks (`fs_tidy_trooper`, `fs_bulwark_warden`, `fs_bubble_tender`). The scout line appears once the army is at 25 percent of budget: [C] "Claim jumpers: no shields. Yet." (the ladder's scripted scout text for mission 1). | Cassandra | era |
| 1:10 | placement | The Fight button pulses once when the army is above 25 percent of budget. A returning player is never nagged; a fresh player gets this one pulse. | | |
| 1:20 | placement | Player presses Fight. (Authored median: 47 s of placement. The Suggested-army button is hidden until two defeats, CU15.) | | |
| 1:20 + t0 | battle | **t = 0** Fight. Battle music (low tier). Announcer (slot `campaign_sf_lunch_break` / `start`, the booth chirp first): [B] "In a galaxy far from the snack bar, two armies fight over a parking space on the Moon! Rated G, for glowing!" Beat **`b_fight`**, trigger `battle_start`, [B]: "FIGHT! Press the button, watch the line, and try not to narrate it." | Brutus | basics |
| t = 9 | battle | First contact: the Wardens' domes close on the rivet line; the first volley lands; first `shield_hit`: hex ripples on the Troopers' bubbles. First-sight toast `fs_rivet_gunner` queues. | | |
| t = 11 | battle | Beat **`sf_b_bubble`**, trigger first `shield_hit`, [B]: "Watch the BUBBLES flash when they are hit! They come back! Hit points do not!" Hint: "A bubble soaks damage first. It regrows after 3 quiet seconds; hit points do not regrow." (queued 2 s behind `b_fight`'s gap.) | Brutus | era |
| t = 14 | battle | Toast **`fs_rivet_gunner`** (4 s). | | |
| t = 20 | battle | The first Trooper bubble breaks: a bright pop ring, three falling hex shards, a grey wireframe and a SHIELD DOWN pip for 2.0 s. Beat **`sf_b_pop`**, trigger first `shield_break`, [P] (t = 22): "A broken bubble stays broken until nobody hits it. Rotate a fresh Warden forward." Hint: "Pull a popped unit back; its bubble regrows after three seconds without a hit." | Plato | era |
| t = 30 | battle | **Set-piece `sf_sp_lunch_served`**: a klaxon, the flank dome panel cracks with a puff of steam; the camera cranes in from outside the dome through the breach (4 s real, 2 s of sim). Stinger `sf_stg_klaxon`. Every beat and toast defers behind the shot. | [B] "Lunch is SERVED! A dome panel has cracked and the atmosphere has left for a snack!" | set-piece |
| t = 35 | battle | Shot ends. Toast **`fs_shield_pip`** (a SHIELD DOWN pip seen). | | |
| t = 39 | battle | Beat **`b_speed`**, trigger `battle_start + 8 s`, deferred by the higher-priority era beats and the shot, [C]: "Space pauses. The speed keys change the pace. Nobody asked me, so I am telling you." | Cassandra | basics |
| t = 45 | battle | The last rivet gunner of wave 1 falls. The lull begins: a 25 s timer to wave 2 and the bubbles visibly sweep back to full (clockwise sweep ring along the base, a soft tick, a small "ting" when full). | | |
| t = 50 | battle | Beat **`sf_b_lull`**, trigger wave 1 cleared, [C]: "Look. The bubbles are full. The bodies are not. That is the whole game." Hint: "Chip fire keeps resetting the delay; a Tender behind a Warden cuts it to 0.6 s." (queued behind `b_speed`.) Toast **`fs_sweep_ring`** follows at t = 57. | Cassandra | era |
| t = 58 | battle | Beat **`b_powers`**, trigger `first_contact + 4 s`, deferred, [C]: "Keys 1 to 6 are your god powers. Press 1." Hint: "Number keys 1 to 6 cast god powers. Each has a cooldown." Slot 1 pulses; the tooltip reads "Arc Tickle: Chains between up to five enemies. Zeus's intern found it in the lost-property box. The label said 'Do Not Pet'." | Cassandra | basics |
| t = 66 | battle | Beat **`sf_tender_ring`**, trigger first Tender aura active on a bubble that is regrowing, [P]: "The ring turns a slow bubble into a quick one. Is that medicine, or merely manners?" Hint: "A Tender shortens the recharge delay of nearby allies. It mends bubbles, not bodies." | Plato | era |
| t = 70 | battle | Player presses 1 and clicks a clump of wave 2 spawn tiles (or just practises on the empty field): a thin cyan spark ring for 0.35 s, an arc that hops. The `tutorialLine` shows once as a caption: "Press 1. Aim at a clump. The arc pops the first bubble and hops on four times." | | era |
| t = 75 | battle | Wave 2 spawns (25 s after the clear): eight Wrench Runners rush from the east edge, sparks trailing. Toast **`fs_wrench_runner`** (4 s). Announcer (category `campaign_sf_lunch_break`, [B] short line from the pool). | | era |
| t = 82 | battle | The first runner lunges (6 u) into a Warden's dome and bounces off: beat **`sf_dome_block`**, trigger first block by a dome, [B]: "The dome CATCHES it! A door that is also a shield! The future is a hardware store!" Hint: "A Warden's dome blocks beams and bolts from the front, not from the side." | Brutus | era |
| t = 95 | battle | The runners reach the line; popped bubbles flash and regrow behind the Wardens as the Tenders' rings pulse; the first reload ring appears under a kneeling Trooper: toast **`fs_ammo_pips`** (4 s). | | |
| t = 118 | battle | Last enemy down. Victory. Stinger `victory`. Beat **`b_done`**, trigger `battle_end`, [B]: "THAT is how you win a battle! Do it again, smarter, for the stars!" | Brutus | basics |
| +0:05 | results | Results screen: three bubbles fill with light one after another, a "ting" each; a RATED G, FOR GLOWING stamp lands. Funny stats ("Bubbles popped: 31, regrown: 27, excuses: 0"). Lesson line from the first applicable detector in Cassandra's voice: "Your shields refilled 9 times. Your hit points, zero. Rotate." Star 3 lights if spend <= 2,250. | | |
| +0:20 | results | Reward reveal: the Fishbowl Helmet card with a bonk. Title "Probationary Tenant" on the chooser card. Codex page `tidy_trooper` unlocked. | | |
| +0:35 | results | "Next: The Floor Is Lava (Medium Rare)" is highlighted. Click returns to the map; the dashed lane to pin 2 turns bright and a tiny hover-car silhouette drives along it once. | | |

Totals for the authored median: chooser 0:00, briefing deployed 0:32, Fight 1:20, set-piece 1:50, bubble beat 1:31, wave 1 cleared 2:05, wave 2 2:35, victory about 3:18, stars shown by 3:25, next-mission prompt at 3:40. (The ladder's own 2:50 victory is the same script for a faster player with 25 s of placement and no reading pauses.) The script shows the player has not been told about hover, cloak, EMP, blink or the orbital strike; the booth's upside-down time remote on the map and the arrival card are the only foreshadowing.

### 1.1 Fresh-player beat order for ER19 (ids, in order)

`arrival.scifi` (own key), `b_place_line`, [toasts `fs_dome_panel`, `fs_low_gravity`, `fs_tidy_trooper`, `fs_bulwark_warden`, `fs_bubble_tender`], `b_fight`, `sf_b_bubble`, [toast `fs_rivet_gunner`], `sf_b_pop`, `sf_sp_lunch_served` (set-piece), [toast `fs_shield_pip`], `b_speed`, `sf_b_lull`, [toast `fs_sweep_ring`], `b_powers`, `sf_tender_ring`, [caption `sf_power_1`], [toast `fs_wrench_runner`], `sf_dome_block`, [toast `fs_ammo_pips`], `b_done`.

## 2. (ii) Returning Ancient player: has finished Ancient (or skipped its tutorial), opens Sci-Fi for the first time

Preconditions: `seen.basics` set (a returning skipper also counts), `progress.stars` for Ancient present, `settings.lastEra = ancient`. The player has met the what's-new card once after the splash (or finds the Sci-Fi card with a NEW ribbon).

Expectations of this player: they know placing and Fight, the god-power bar and morale; they will try to draw a hoplite line, they will press 1 expecting lightning and 2 expecting a meteor, and they will march the whole army up to the rivet guns in one block. The script respects that and teaches only what is new: the bubble, the break window, the lull, the Tender ring, the dome block and the Sci-Fi power names.

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | The chooser opens with the Ancient card pre-focused and "Continue Ancient" as the primary. The Sci-Fi card wears a NEW ribbon and the toy-shop still; caption: "THE FUTURE. Selected by Zeus's intern, who held the remote upside down." Player clicks it. 1.2 s warp tunnel. | | |
| 0:02 | arrival card | Same ticket stub as fresh (8 s, skippable). The footer is gated: if Modern is also finished (`cb.mod_done`): "Last time he sent a boarding pass. This time he pressed button three."; else if Medieval is finished (`cb.med_done`): "He skipped a few centuries. The remote says that is allowed."; else if Ancient is finished (`cb.ancient_done`): "Zeus's intern said two minutes. The remote now reads 'several thousand years, approximately.'" Only one footer line is shown. | | era |
| 0:10 | map | Pin 1 pulses. | | |
| 0:12 | briefing | Click pin 1; briefing as fresh. "Skip tutorial" is NOT shown (basics already seen); "Skip era tips" is shown instead. | | |
| 0:28 | briefing | Deploy. | | |
| 0:29 | placement | **No basics beats.** The first-sight toasts for the three cards. A one-off era note on the deploy strip when the player draws a tight single line (Ancient habit): [C] "Shooters do not need a line. They need a Warden in front and a Tender behind." (own key `seen.beats.sf_line_habit`, shown only if the line brush is used for 8 or more units in one stroke). | Cassandra | era |
| 0:45 | placement | Player presses Fight (authored median: 25 s of placement). | | |
| t = 0 | battle | Announcer line only (the title card); **no `b_fight`**. | Brutus | era |
| t = 9 to 11 | battle | First contact; first `shield_hit`; beat `sf_b_bubble` at t = 9 (no basics ahead of it, so no queue). | Brutus | era |
| t = 14 | battle | Toast `fs_rivet_gunner`. | | era |
| t = 18 | battle | First bubble break; beat `sf_b_pop`. | Plato | era |
| t = 30 | battle | Set-piece `sf_sp_lunch_served`, identical. | | set-piece |
| t = 35 to 45 | battle | Toast `fs_shield_pip`; no `b_speed`, no `b_powers`. | | era |
| t = 45 | battle | Wave 1 cleared; beat `sf_b_lull` at t = 46 (a veteran's army is often a block, so wave 1 may end a little later, around t = 60; the beat waits for the event). Toast `fs_sweep_ring`. | Cassandra | era |
| t = 58 | battle | Beat `sf_tender_ring`. | Plato | era |
| t = 62 | battle | The first time the player presses 1 (any time), a one-off era caption: "Sci-Fi powers differ from the Ancient set. This one is the Arc Tickle: the intern found it in the lost-property box." (`tutorialLine`, own key `seen.beats.sf_power_1`.) Pressing 2 through 6 for the first time shows the same style of caption with that power's `tutorialLine` (`god_powers.md`); key 2 is the Orbital Deep Clean, not a meteor, and says so. | caption | era |
| t = 75 to 85 | battle | Wave 2; toast `fs_wrench_runner`; beat `sf_dome_block`. | | era |
| t = 95 | battle | Toast `fs_ammo_pips`. | | era |
| t = 118 | battle | Victory. No `b_done`. | | |
| +0:05 | results | Results as fresh. | | |
| +0:35 | results | Next prompt. | | |

Totals: Fight at about 0:45, set-piece at about 1:15, victory at about 2:45, next-mission prompt at 3:20. A returning player sees 6 era beats (`sf_b_bubble`, `sf_b_pop`, `sf_b_lull`, `sf_tender_ring`, `sf_dome_block`, plus the line-habit note when it applies) and 10 first-sight toasts; a fresh player sees 5 basics beats, 5 era beats and 10 toasts (toasts are unordered and once per profile, so a veteran's earlier toasts of other ids do not suppress these).

### 2.1 Returning-player beat order for ER19

`arrival.scifi` (footer gated line), [toasts `fs_dome_panel`, `fs_low_gravity`, the three card toasts], `sf_b_bubble`, [toast `fs_rivet_gunner`], `sf_b_pop`, `sf_sp_lunch_served`, [toast `fs_shield_pip`], `sf_b_lull`, [toast `fs_sweep_ring`], `sf_tender_ring`, [caption `sf_power_1` on first press], [toast `fs_wrench_runner`], `sf_dome_block`, [toast `fs_ammo_pips`].

### 2.2 Edge cases the test matrix must cover

1. Returning Ancient skipper plays Sci-Fi mission 1: gets every era beat, no basics (test required by plan CU5).
2. A Sci-Fi-first player later opens Ancient or Medieval: the Ancient mission-1 flow is bit-identical to today (G10); Sci-Fi's basics were already seen, so only that era's beats fire.
3. A Medieval or Modern veteran (basics seen, era finished) opens Sci-Fi: the same as (ii) with the corresponding footer line.
4. Out-of-order: the first `shield_hit` happens while `b_fight` is visible: the era beat waits, then shows; if the battle ends before it can show, it is dropped and marked, never shown on results as a beat.
5. The player's army is never hit before the end (an early ranged kill): `sf_b_bubble` and `sf_b_pop` never fire; `sf_b_lull` still fires at the end of wave 1 (its text is true with full bubbles); the results lesson is the generic `shield_overload` negative or a padding line (never printing `{n}`).
6. The player places no Tender: `sf_tender_ring` never fires; the `sf_b_lull` hint still names the Tender (true of the rules).
7. The player is defeated twice: the briefing offers the reference army (CU15); the beats do not repeat (once per era).
8. Reduce Motion on: the set-piece is a cut, the warp tunnel is a fade, the beat text still shows, the bubble sweep ring stays (functional), the pop flash is dimmed by the R16 limiter.
9. The god-power aim cursor is active when a beat is due: the beat waits 3 s after the cursor is released.
10. The player skips the arrival card with Esc: the card never shows again (`seen.arrival.scifi`), and the chooser caption still carries the intern gag.
11. **The plumbing slice (no M4 yet):** every shield beat and toast is silent, no error is logged, the Warden's dome block (`sf_dome_block`) and the Wrench Runner lunge still fire, and the path assertions of rule 2 pass.
12. Phone layout (390 x 844, touch): the set-piece shot is shortened to 3 s, toasts are anchored to the top, the Fight pulse is a bottom-bar glow, and every beat can be dismissed with a tap.
13. A player who deploys nothing but Wardens: `sf_dome_block` fires early; `sf_tender_ring` never fires; `sf_b_pop` fires late or not at all (Wardens have 90-point bubbles); the toast `fs_bubble_tender` was clicked or not as the player chose.

## 3. First-sight toast queue, missions 1 to 3

Toasts are unordered (they fire when the thing is first seen), keyed `seen.firstsight[id]` once per profile (a veteran's Ancient toasts for shared concepts, such as rout, are keyed separately). One line each, <= 16 words, a name in capitals, then the rule. Toasts never interrupt a set-piece or a beat; they queue and expire after 12 s if not shown.

### Mission 1

| id | trigger | text |
|---|---|---|
| `fs_tidy_trooper` | first trooper card clicked or placed | "TIDY TROOPER. Three-round bursts, a 40-point bubble, a fishbowl on the head." |
| `fs_bulwark_warden` | first warden card clicked or placed | "BULWARK WARDEN. A dome like a door: it blocks beams from the front only." |
| `fs_bubble_tender` | first tender card clicked or placed | "BUBBLE TENDER. Its ring speeds up the bubbles of friends. It mends no bodies." |
| `fs_rivet_gunner` | first rivet gunner in view | "RIVET GUNNER. Thirty rounds of chip fire. Every rivet resets a bubble's timer." |
| `fs_wrench_runner` | first wrench runner in view | "WRENCH RUNNER. Lunges six units and punishes anyone reloading. Bubbles blunt it." |
| `fs_dome_panel` | placement starts | "DOME PANEL. The base is a window with opinions. Do not stand near one." |
| `fs_low_gravity` | placement starts | "LOW GRAVITY. Everything arcs further on the Moon. Shots, jumps and gossip." |
| `fs_shield_pip` | first SHIELD DOWN pip seen | "A SHIELD DOWN pip means a broken bubble for two seconds. Do not hit it twice." |
| `fs_sweep_ring` | first recharge sweep seen | "A sweeping ring means a regrowing bubble. A small ting means it is full." |
| `fs_ammo_pips` | first magazine reaches zero | "Dots under a shooter are its magazine. Empty means two seconds of reloading." |

### Mission 2

| id | trigger | text |
|---|---|---|
| `fs_dustpan_hover` | first dustpan card clicked or placed | "DUSTPAN HOVER TANK. Skates over lava and lakes; lobs plasma at 28 units." |
| `fs_junk_buggy` | first buggy in view | "JUNK BUGGY. A fast cart of rockets. A destroyed one drops a cross driver." |
| `fs_salvo_cart` | first salvo cart in view | "SALVO CART. Rockets land in rings, 58 units away, but nothing inside 12." |
| `fs_relay_post` | placement starts | "RELAY POST. Hold all three together for ten seconds. Losing one restarts the clock." |
| `fs_lava_lake` | placement starts | "LAVA. Ground units cannot cross it. Hover tanks can. Your feelings cannot." |
| `fs_causeway` | placement starts | "CAUSEWAY. The only dry road: six units wide and shelled by the carts." |
| `fs_geyser_vent` | first vent in view | "GEYSER VENT. A red ring means an eruption in one and a half seconds." |
| `fs_basalt_islet` | first islet in view | "BASALT ISLET. A rock in the lava with a relay post on top. The third has no road." |
| `fs_bailout` | first driver hop-out | "BAILOUT. A destroyed buggy drops a wrench runner. He is not pleased." |
| `fs_hover_pads` | first hover unit placed | "Four glowing pads and a soft disc under a unit mean hover. It floats over liquid." |

### Mission 3

| id | trigger | text |
|---|---|---|
| `fs_spritz_medic` | first medic card clicked or placed | "SPRITZ MEDIC. A hover drone: heals bodies, never bubbles, and its lamp reveals cloaks." |
| `fs_rustbucket_rex` | first rex in view | "RUSTBUCKET REX. A scrap cannon, rocket racks, a stomp ring. Its back plate is soft." |
| `fs_reactor_core` | placement starts | "REACTOR CORE. 2,000 points. It blows up when it falls. Stand off." |
| `fs_shield_pylon` | placement starts | "SHIELD PYLON. When it falls it pops bubbles nearby, yours as well." |
| `fs_coolant_tank` | first coolant tank in view | "COOLANT TANK. A frost-white blast that knocks back. Do not stack troops beside it." |
| `fs_coolant_pool` | first coolant pool crossed | "COOLANT. Shallow: ground units wade slowly. Hover units glide." |
| `fs_catwalk` | first catwalk crossed | "CATWALK. Ten units wide: the Rex's lane, and yours." |
| `fs_blast_door` | first blast door in view | "BLAST DOOR. It opens for its owner. The enemy must break it." |
| `fs_overclock` | the Rex reaches 50 percent | "OVERCLOCK. Steam from both stacks means the Rex is faster and crosser." |

### 3.1 Expected fresh-player exposure across missions 1 to 3

| mission | basics beats | era beats | toasts | set-piece |
|---|---|---|---|---|
| 1 | 5 (`b_place_line`, `b_fight`, `b_speed`, `b_powers`, `b_done`) | 5 (`sf_b_bubble`, `sf_b_pop`, `sf_b_lull`, `sf_tender_ring`, `sf_dome_block`) | 10 | 1 |
| 2 | 0 | 5 (`sf_b_hover`, `sf_third_islet`, `sf_capture_how`, `sf_geyser_tell`, `sf_salvo_ring`) | 10 | 1 |
| 3 | 0 | 5 (`sf_b_medic`, `sf_destroy_list`, `sf_pylon_pop`, `sf_rear_plate`, `sf_coolant_tank`) | 9 | 2 (the meltdown and the Rex's entrance) |

A veteran sees the same eras without the 5 basics beats. The bubble that pops in M1 is the same object the Codex, the selection card and the Time Passport draw; the toast `fs_shield_pip` says "SHIELD DOWN pip" and never explains the SHIELD DOWN stamp on the defeat screen, which is a joke the player finds later.
