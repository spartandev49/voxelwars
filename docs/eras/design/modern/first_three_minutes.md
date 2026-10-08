# Modern: the first three minutes of mission 1 (`mod_boot_camp_dropout`), plus the first-sight toast queue for missions 1 to 3

Binding for UI (CU5 teaching data), CAMPAIGN-MOD (mission 1 data), COMEDY-MOD (copy) and ER19 (every beat fires, once, in order). Beat ids, triggers and who/text are exactly what goes into `era_modern/teaching.js`. Mission data is in `missions_outline.md` (unit, arena and prop ids are final per `rosters.md`, `arenas.md` and `props.md`); god-power names are in `god_powers.md`; the arrival card is the one of `feel_sheet.md` s7 (a boarding pass in the briefing-room frame).

## 0. Rules this script obeys

1. **Two layers, two keys.** `basics:true` beats are the once-ever layer (`seen.basics[id]`): placing, Fight, pause and speed, god powers, results; the five ids are identical in every era (`b_place_line b_fight b_speed b_powers b_done`). Every other beat is an era beat (`seen.beats[id]`, once per era). A returning player who has seen the basics in ANY era never sees them again; a returning player who skipped a tutorial (`Skip tutorial`) is treated as having seen basics (the skip sets all basics).
2. **Mission 1 needs only modules #1..#5** (M0 M1 M3 M2 M2b) so the end-of-P1 plumbing slice can run this exact script through the real UI. Its set-piece trigger is the existing first `projectile_launch`; its second wave is an existing `ScriptedWaves` entry; its cover props are previews that are inert before M9 lands. Nothing below needs vehicles, pins, shells, mines, air, cover or any script-event kind.
3. **Arbitration** (CU5): a set-piece shot beats a beat, a beat beats a first-sight toast, a god-power aim cursor beats all three. A deferred beat re-queues 3 s after the blocking element ends. One beat or toast is visible at once; beats show 6 s, toasts 4 s; at least 5 s of nothing between two visible items in battle. The 0.5 s reload freeze (below) is not a beat; it is a one-time engine pause tied to `mod_b_reload`.
4. **Esc or click** skips the arrival card, the set-piece shot and any beat. "Skip tutorial" (Settings or the corner button on a beat) sets `seen.basics`; "Skip era tips" sets all `mod_*` beats and first-sight toasts for this era. Reduce Motion cuts instead of dollying and swaps the photocopier portal for a fade.
5. **Timing model.** t0 = the click on the Modern chooser card. Battle time t is measured from Fight. The numbers are authored targets for a median player; ER19 checks ORDER and ONCE, not seconds.
6. **The intern is offstage.** He appears in the arrival card, the chooser caption and the god-power tooltips. He has no portrait and no voice.
7. **Plato is muted.** Every line Plato speaks in this mission, in the briefing, the booth and the beats, carries the muted-speaker glyph and the label "PLATO (MUTED)". The text is fully legible; nothing explains the label.

## 1. (i) Fresh player: never launched the game, picks Modern first

Preconditions: empty save, no `seen.*`. Title screen to Campaign to the era chooser (four cards; with no history the Ancient card would be pre-focused, here the player clicks Modern).

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | Click on the Modern card (a dossier photograph of a toy tank column on a felt table, caption "MODERN. The intern says this is the right century. He has pressed 'hold' on the next one."). The card flips like a manila folder, a 1.2 s photocopier portal (a white bar sweeps, a thunk, a rubber-stamp thud). Music crossfades to the map bed "On Hold". | | |
| 0:02 | arrival card | Full-screen skippable boarding pass, 8 s, three portraits with headsets. | "ARRIVAL: MODERN. Passengers Brutus, Plato and Cassandra were re-routed by Zeus's intern, who selected NEXT ERA instead of NEXT MATCH. Headsets issued. Brutus has also been issued a clipboard. Plato has been issued nothing and is at peace with this. Cassandra has noticed a helicopter. It has not noticed her. Please hold." Button: "Take Your Seat". | era (own key `seen.arrival.modern`, not a beat) |
| 0:10 | campaign map | The corkboard under a gooseneck lamp. Pin 1 (a red pushpin) pulses; pins 2 to 9 are dim; the red string to pin 2 is slack and faint; a toy helicopter on a thread hangs over the Act II sheet. The map bed plays hold music. | no text | |
| 0:13 | map | Click pin 1. The manila briefing folder opens: title, the three voice lines type in with a radio squelch tick before each (about 3 s each). | [B] "BOOT CAMP! I have a headset! It has a little arm for the mouth! Can you hear me? Over!" [P] (PLATO (MUTED)) "They hand us a rifle and call it a lesson. A rifle is a spear that has given up on being brave. Is that progress?" [C] "Eight rounds in the magazine. The ninth click is the one that gets you. It is in the manual. Nobody has the manual." | era |
| 0:28 | briefing | Rules, "Spend at most 2,250 rq" for star 3, three star lines, the reward preview (the Tin Hat helm). "Skip tutorial" button bottom-left. | rules text of mission 1 | |
| 0:32 | briefing | Click Deploy. Cut to placement. | | |
| 0:33 | placement | The small parade yard from above: a yellow firing line on the south end, hay rows and silhouettes of twenty peashooters on the north end, nine cardboard dummies in the middle. Two unit cards: tin_hat_trooper, toast_rack_runabout. Budget 3,000 rq. | | |
| 0:34 | placement | Beat **`b_place_line`**, trigger `placement_start`, [P] (muted): "Pick a card, then drag across the field to draw a line. It looks simple because it is." Hint: "Choose the line brush, then drag along the yellow line." Pointer on the trooper card. | Plato | basics |
| 0:46 | placement | After the first placement, the first-sight toasts for the cards the player clicks (`fs_tin_hat_trooper`, `fs_toast_rack_runabout`). The scout line (code `no_cavalry`, re-worded in `humour.md` 8) appears once three soldiers are down if the player has no runabout: [C] "They shoot from range and you have no wheels. A runabout crosses the gap before the peas can punish it." | Cassandra | era |
| 1:10 | placement | The Fight button pulses once the army is above 25 percent of budget. A returning player is never nagged; a fresh player gets this one pulse. | | |
| 1:20 | placement | Player presses Fight. (Authored median: 47 s of placement. The Suggested-army button is hidden until two defeats, CU15.) | | |
| 1:20 + t0 | battle | **t = 0** Fight. Battle music (low tier). Announcer (slot `campaign_mod_boot_camp_dropout` / `start`, radio squelch first): [B] "This is BRUTUS, call sign Brutus! I picked it myself! Over! Is it over? Over!" Beat **`b_fight`**, trigger `battle_start`, [B]: "FIGHT! Press the button, watch the line, and try not to narrate it." | Brutus | basics |
| t = 2 | battle | Beat **`mod_ammo_pips`**, trigger `battle_start + 2 s`, [B]: "Those little dots under a soldier are BULLETS! Eight dots, eight bullets! Dots gone, confidence gone!" Hint: "Ammo pips under each shooter show the magazine." The pips under every trooper pulse once. | Brutus | era |
| t = 8 | battle | First shot of the battle: **set-piece `mod_sp_live_fire`**: the loudspeaker squeals, a low dolly along the firing line rises to the default camera, the nine dummies spring up and are shredded to confetti; stinger `mod_stg_whistle_snare`; announcer lines (see `missions_outline.md`). The shot blocks every beat until it ends (3.5 s real, 1.75 s of sim). | [B] "Live fire! The dummies are UP! The dummies are down! Nobody was consulted!" | set-piece |
| t = 12 | battle | Shot ends. The first rifle pops land on the front peashooters (range 28 against their 18). Toast **`fs_flowerpot_peashooter`** (see section 3). First-contact event fires. | | |
| t = 14 | battle | Beat **`b_speed`**, trigger `battle_start + 8 s`, deferred by the shot, [C]: "Space pauses. The speed keys change the pace. Nobody asked me, so I am telling you." | Cassandra | basics |
| t = 18 | battle | Beat **`b_powers`**, trigger `first_contact + 4 s`, [C]: "Keys 1 to 6 are your god powers. Press 1." Hint: "Number keys 1 to 6 cast god powers. Each has a cooldown." The power bar slot 1 pulses; the tooltip reads "Ricochet Request: One round that has been through a lot. Authorised by Zeus's intern." | Cassandra | basics |
| t = 20 | battle | First player `reload_start`: the game **freezes for 0.5 s**, the RELOAD ring under the kneeling trooper brightens and a caption reads "shoot, step back, reload". Beat **`mod_b_reload`** follows, [P] (muted): "The rifle is empty. Is it still a rifle, or merely a stick with opinions?" Hint: "Ammo pips under a soldier show the magazine. Empty: kneel and reload." | Plato | era |
| t = 22 | battle | Player presses 1 and clicks a peashooter clump: a thin red laser dot for 0.35 s, a round ricochets between four targets. The `tutorialLine` shows once as a caption: "Press 1. Aim at a clump. The intern sent one very well-travelled round." | | era |
| t = 26 | battle | First time a player shot lands on an enemy mid-reload: beat **`mod_punish_click`**, trigger `reload_hit`, [B]: "He RELOADED in the open! We have punished the click!" Hint: "Hit enemies while they reload: they cannot answer." | Brutus | era |
| t = 30 | battle | The scripted second wave: four trolleys roll out of the north edge, one wheel wobbling. Toast **`fs_trolley_rammer`** (4 s). | | era |
| t = 33 | battle | First trolley starts its run: beat **`mod_b_window`**, trigger `first_charge`, [B]: "A TROLLEY! Fast and wobbly! Bring a runabout and do not stand in a row!" Hint: "Trolleys outrun bullets. Shoot the front rank, or meet them with wheels." The runabouts the player placed peel off the flank. | Brutus | era |
| t = 40 | battle | Three or more troopers reload inside one second: beat **`mod_stagger_reloads`**, [C]: "Four of them are reloading at once. I counted. They were counting too, in a different order." Hint: "Reloading together leaves a gap. Let one rank fire while another reloads." (Skipped silently if the player staggered their ranks.) | Cassandra | era |
| t = 45 | battle | Trolleys meet the runabouts and the troopers; a wobbling wheel flies off; the pusher and the plank fly in a heap (animation joy). | | |
| t = 70 | battle | The last peashooter row breaks; helmets pop, dazed rings, the peasprouts fall over. | [B] (announcer, `kill_streak`) | |
| t = 88 | battle | Last enemy down. Victory. Stinger `victory` (the typewriter ding). Beat **`b_done`**, trigger `battle_end`, [B]: "THAT is how you win a battle! Do it again, smarter, for the stars!" | Brutus | basics |
| +0:05 | results | Results screen: three star slots light one after another with a rubber stamp landing with a thud (APPROVED in stamp red). Funny stats ("Reloads: 31, windows exploited: 6"). Lesson line from the `reload_in_open` detector in Cassandra's voice (see `humour.md`). Star 3 lights if spend <= 2,250. | | |
| +0:20 | results | Reward reveal: the Tin Hat helm card with a bonk. Title "Reluctant Recruit" on the chooser card. Codex page `tin_hat_trooper` unlocked. | | |
| +0:35 | results | "Next: The Hedgerow Picnic (Unscheduled)" is highlighted. Click returns to the map; the pin-2 string pulls taut and the helicopter on the Act II sheet swings. | | |

Totals for the authored median: chooser 0:00, briefing deployed 0:32, Fight 1:20, set-piece 1:28, first reload 1:40, trolleys 1:50, victory about 2:48, stars shown by 2:55, next-mission prompt at 3:00. The script shows the player has not been told about cover, pins, armour, shells, mines, air or heal; the toy helicopter on the map thread and the arrival card are the only foreshadowing.

### 1.1 Fresh-player beat order for ER19 (ids, in order)

`arrival.modern` (own key), `b_place_line`, [toasts `fs_tin_hat_trooper`, `fs_toast_rack_runabout`], `b_fight`, `mod_ammo_pips`, `mod_sp_live_fire` (set-piece), [toast `fs_flowerpot_peashooter`], `b_speed`, `b_powers`, `mod_b_reload` (with the freeze), [caption `mod_power_1`], `mod_punish_click`, [toast `fs_trolley_rammer`], `mod_b_window`, `mod_stagger_reloads` (conditional), `b_done`.

## 2. (ii) Returning Ancient player: has finished Ancient (or skipped its tutorial), opens Modern for the first time

Preconditions: `seen.basics` set (a returning skipper also counts), `progress.stars` for Ancient present, `settings.lastEra = ancient`. The player has met the what's-new card once after the splash (or finds the Modern card with a NEW ribbon).

Expectations of this player: they know placing and Fight, they know the god-power bar and morale, they will try to draw a hoplite line, they will press 1 expecting lightning, they will march the whole army up to the peashooters and let eight rounds run out together. The script respects that and teaches only what is new: the magazine, the reload window, the Modern power names.

| time | surface | what happens | who / text | layer |
|---|---|---|---|---|
| 0:00 | chooser | The chooser opens with the Ancient card pre-focused and "Continue Ancient" as the primary. The Modern card wears a NEW ribbon and a dossier still; caption: "MODERN. The intern says this is the right century. He has pressed 'hold' on the next one." Player clicks Modern. 1.2 s photocopier portal. | | |
| 0:02 | arrival card | Same boarding pass as fresh (8 s, skippable). The footer is gated: if Medieval is also finished (`cb.med_done`): "Last time he sent a pageant. This time he sent a boarding pass."; else if Ancient is finished (`cb.ancient_done`): "Zeus's intern said two minutes. The gate agent has checked. It has been twenty-five centuries." Only one footer line is shown. | | era |
| 0:10 | map | Pin 1 pulses. | | |
| 0:12 | briefing | Click pin 1; briefing as fresh. "Skip tutorial" is NOT shown (basics already seen); "Skip era tips" is shown instead. | | |
| 0:28 | briefing | Deploy. | | |
| 0:29 | placement | **No basics beats.** The first-sight toasts for the two cards. A one-off era note on the deploy strip when the player draws a tight single line (Ancient habit): [C] "Shooters do not need a line. They need something to stand behind, and a friend who is not reloading." (own key `seen.beats.mod_line_habit`, shown only if the line brush is used for 8 or more units in one stroke). | Cassandra | era |
| 0:45 | placement | Player presses Fight (authored median: 25 s of placement). | | |
| t = 0 | battle | Announcer line only (Brutus's headset debut, the same as fresh); **no `b_fight`**. Beat `mod_ammo_pips` at t = 2. | Brutus | era |
| t = 8 | battle | Set-piece `mod_sp_live_fire`, identical. | | set-piece |
| t = 12 | battle | Toast `fs_flowerpot_peashooter`. No `b_speed`, no `b_powers`. | | era |
| t = 20 | battle | First reload: the 0.5 s freeze and `mod_b_reload`, identical (reload is new to everyone). | Plato | era |
| t = 22 | battle | The first time the player presses 1 (any time), a one-off era caption: "Modern powers differ from the Ancient set. This one is the Ricochet Request: the intern sent one very well-travelled round." (`tutorialLine`, own key `seen.beats.mod_power_1`.) Pressing 2 through 6 for the first time shows the same style of caption with that power's `tutorialLine` (`god_powers.md`). | caption | era |
| t = 26 | battle | `mod_punish_click`. | Brutus | era |
| t = 30 to 40 | battle | Toast `fs_trolley_rammer`; `mod_b_window`; `mod_stagger_reloads` (a veteran who marched an Ancient phalanx forward reloads together, so this one usually fires). | | era |
| t = 88 | battle | Victory. No `b_done`. | | |
| +0:05 | results | Results as fresh. | | |
| +0:35 | results | Next prompt. | | |

Totals: Fight at about 0:45, set-piece at about 0:53, victory at about 2:15, next-mission prompt at about 2:50. A returning player sees 5 era beats and 8 first-sight toasts; a fresh player sees 5 basics beats, 5 era beats and 8 toasts (toasts are unordered and once per profile, so a veteran's earlier toasts of other ids do not suppress these).

### 2.1 Returning-player beat order for ER19

`arrival.modern` (footer gated line), [toasts], `mod_ammo_pips`, `mod_sp_live_fire`, [toast `fs_flowerpot_peashooter`], `mod_b_reload` (with the freeze), [caption `mod_power_1` on first press], `mod_punish_click`, [toast `fs_trolley_rammer`], `mod_b_window`, `mod_stagger_reloads` (conditional).

### 2.2 Edge cases the test matrix must cover

1. Returning Ancient skipper plays Modern mission 1: gets every era beat, no basics (test required by plan CU5).
2. A Modern-first player later opens Ancient or Medieval: the Ancient mission-1 flow is bit-identical to today (G10); Modern's basics were already seen, so only that era's beats fire.
3. A Medieval veteran (basics seen, Medieval finished) opens Modern: the same as (ii) with the Medieval footer line.
4. Out-of-order: the player presses Fight before `mod_ammo_pips` fires: the beat is dropped, not queued; `seen.beats` is marked so it never reappears.
5. The player never reloads (finishes before the first magazine empties, or draws only runabouts): `mod_b_reload` and the freeze never fire; the results lesson is the generic `reload_in_open` or `no_reload_seen` fallback line; `mod_stagger_reloads` is silent.
6. The player is defeated twice: the briefing offers the Suggested army (CU15); the beats do not repeat (once per era).
7. Reduce Motion on: the set-piece is a cut, the portal is a fade, the beat text still shows, the 0.5 s freeze becomes a 0.5 s highlight with no pause.
8. The god-power aim cursor is active when a beat is due: the beat waits 3 s after the cursor is released.
9. The player skips the arrival card with Esc: the card never shows again (`seen.arrival.modern`), and the chooser caption still carries the intern gag.
10. A player who deploys nothing but runabouts: the toasts and `mod_b_window` still fire; `mod_ammo_pips` fires at t = 2 even though the runabout's pintle has no visible pip row (the pips show one tick per burst for the runabout).

## 3. First-sight toast queue, missions 1 to 3

Toasts are unordered (they fire when the thing is first seen), keyed `seen.firstsight[id]` once per profile (a veteran's Ancient toasts for shared concepts, such as rout, are keyed separately). One line each, <= 16 words, a name in capitals, then the rule. Toasts never interrupt a set-piece or a beat; they queue and expire after 12 s if not shown.

### Mission 1

| id | trigger | text |
|---|---|---|
| `fs_tin_hat_trooper` | first trooper card clicked or placed | "TIN-HAT TROOPER. Two-round bursts, eight rounds, a biscuit tin on his back." |
| `fs_toast_rack_runabout` | first runabout card clicked or placed | "TOAST-RACK RUNABOUT. Fast, open and fragile. It runs down trolleys and crews." |
| `fs_flowerpot_peashooter` | first peashooter in view | "FLOWERPOT PEASHOOTER. Cheap, numerous, short-ranged. Outshoot it from 28 units." |
| `fs_trolley_rammer` | first trolley in view | "TROLLEY RAMMER. A plank on wheels. It outruns bullets; one wheel always pulls left." |
| `fs_target_dummy` | first dummy springs up | "POP-UP DUMMY. Cardboard, brave, and folds when looked at." |
| `fs_firing_line` | placement starts | "FIRING LINE. The yellow line marks where your side may deploy." |
| `fs_reload_ring` | first reload ring seen | "The ring under a kneeling soldier is a reload. He cannot shoot until it closes." |
| `fs_pips_empty` | first magazine reaches zero on an enemy | "An empty magazine means a kneeling enemy. Now is a good time to shoot him." |

### Mission 2

| id | trigger | text |
|---|---|---|
| `fs_clerk_rifleman` | first clerk card clicked or placed | "CLERK RIFLEMAN. Long range, six rounds, and a stamp before every reload." |
| `fs_hedge_row` | first hedge in view | "HEDGE. Cover from the front. It burns." |
| `fs_hay_bale` | first hay bale in view | "HAY BALE. Cover that burns. Keep it away from fire." |
| `fs_sandbag_wall` | first sandbag wall in view | "SANDBAG WALL. Cover that shells chew through." |
| `fs_picnic_blanket` | placement starts | "PICNIC BLANKET. Hold it for 90 seconds. An enemy standing on it stops the clock." |
| `fs_picnic_hamper` | first hamper in view | "PICNIC HAMPER. Do not put it in the open. Somebody did." |
| `fs_cover_brackets` | first cover brackets seen | "Four cyan corners mean cover. Hits from the front do half damage." |
| `fs_flanked_tick` | first red flanked tick | "A red tick means the cover no longer faces the shooter. Move behind it." |

### Mission 3

| id | trigger | text |
|---|---|---|
| `fs_tripod_mg_team` | first tripod card clicked or placed | "TRIPOD MG TEAM. Pins whatever it fires near. Sets up in 1.2 seconds, covers 100 degrees." |
| `fs_long_lens_sharpshooter` | first sharpshooter card clicked or placed | "LONG-LENS SHARPSHOOTER. Prefers officers. A red dot means the shot is one second away." |
| `fs_cub_reporter` | first reporter card clicked or placed | "CUB REPORTER. Fast, fragile, and happiest inside a gun's minimum range." |
| `fs_dynamite_thrower` | first dynamite thrower in view | "DYNAMITE THROWER. Hired. Cracks clumps. Do not stand in a row." |
| `fs_signal_post` | placement starts | "SIGNAL POST. Stand in its ring for 12 seconds to capture it." |
| `fs_pin_meter` | first amber pin ring seen | "A winding amber ring is the pin meter. When it closes, that unit is pinned." |
| `fs_trench_step` | first unit enters a trench | "TRENCH. Cover on three sides. Ladders every six units." |
| `fs_barbed_coil` | first barbed coil in view | "BARBED COIL. It slows boots and does nothing to wheels." |
| `fs_dugout_roof` | first dugout in view | "DUGOUT ROOF. Strong cover until a mortar finds it." |

### 3.1 Expected fresh-player exposure across missions 1 to 3

| mission | basics beats | era beats | toasts | set-piece |
|---|---|---|---|---|
| 1 | 5 (`b_place_line`, `b_fight`, `b_speed`, `b_powers`, `b_done`) | 5 (`mod_ammo_pips`, `mod_b_reload`, `mod_punish_click`, `mod_b_window`, `mod_stagger_reloads`) | 8 | 1 |
| 2 | 0 | 4 (`mod_cover_brackets`, `mod_b_cover`, `mod_flanked_tick`, `mod_hold_picnic`) | 8 | 1 |
| 3 | 0 | 6 (`mod_b_pin`, `mod_pin_snap`, `mod_pin_ends`, `mod_pin_flank`, `mod_red_dot`, `mod_capture_how`) | 9 | 1 |

A veteran sees the same eras without the 5 basics beats. The pushpin that drops on a full pin (M3) is the same object as the campaign map's pin and the Codex bookmark; the toast `fs_pin_meter` says "pin meter" and never explains the pushpin joke.
