# Sci-Fi: six puzzles (binding, synthesizer part 1)

Format follows `src/content/era_ancient/puzzles.js`: hand-placed enemy, restricted roster, small budget, no mutators, no god powers, free retries, a stored solution found by the headless sim (`tests/campaign/solve_puzzles.mjs --era=scifi --write`) and replayed in Chromium (ER9). Stars follow `evaluatePuzzleStars`: star 1 = win, star 2 = spend at most `par`, star 3 = the bonus. Acceptance numbers are the plan's: 100 random legal armies from the restricted roster win <= 15 % and reach star 3 <= 5 %; the stored solution wins in 3 seeds and fires the taught mechanic (`usedMechanic`). Each puzzle teaches one mechanic, the six are six different mechanics (bubbles, hover, cloak, EMP, blink, orbital strike: the six headline mechanics of the era, one per puzzle), and each needs only modules inside Sci-Fi's E-FREEZE prefix (#1-#19). Twelve candidates came from the two proposals (A: pop then hide, light bridge etiquette, do not disturb, reboot, gap year, bait and clean; B: bubble math, lava taxi, blink once, the off switch, flak you, one big ask): they pair up on five mechanics and the six that ship take the stronger trick of each pair; B's air-and-flak puzzle is kept as reserve (section 8). Reload, repair and air are taught by missions and left out of puzzles on purpose. Ids are `sf_pz_*`, globally unique (puzzles share `progress.stars`). Budgets are in ergs and the par is the cost of the intended solution; the solver sets the final numbers, the intent below is binding. Both era mutators are disabled in puzzles (they would break the intended solution).

| # | id | title | teaches (mission) | arena | roster | budget / par | requires |
|---|---|---|---|---|---|---|---|
| 1 | `sf_pz_pop_then_hide` | Pop, Then Hide | the bubble cycle (M1) | `sf_biodome`, small, seed 41 | `tidy_trooper`, `bulwark_warden`, `bubble_tender` | 1,500 / 1,200 | M4 shields (#17), M2 burst |
| 2 | `sf_pz_light_bridge` | Light Bridge Etiquette | hover (M2) | `sf_lavaworld`, medium, seed 42 | `dustpan_hover`, `tidy_trooper`, `bulwark_warden` | 1,800 / 1,450 | M7 layers (#8), M8 setup (#14), M10 |
| 3 | `sf_pz_do_not_disturb` | Do Not Disturb | cloak and detection (M4) | `sf_crashsite`, medium, seed 43 | `tidy_trooper`, `spritz_medic`, `glow_grazer` | 1,000 / 800 | M5 cloak (#18), M7 |
| 4 | `sf_pz_off_switch` | Have You Tried Turning It Off? (Puzzle Edition) | EMP (M5) | `sf_megamall` run at medium, seed 44 | `zapper_tinker`, `rivet_gunner`, `wrench_runner` | 1,100 / 880 | M6b EMP (#19), M4 shields |
| 5 | `sf_pz_gap_year` | Gap Year | blink (M7) | `sf_chasm`, medium, seed 45 | `hop_notary`, `tidy_trooper` | 900 / 720 | M13 blink (#11), M12 `editTerrain` |
| 6 | `sf_pz_bait_and_clean` | Bait And Clean | orbital strike (M8) | `sf_hive`, medium, seed 46 | `glow_grazer`, `bulwark_warden`, `tidy_trooper` plus the fixed `grand_housekeeper` | 1,300 / 1,000 | M13 `call_strike` (#11), M10 craters |

Puzzles are open from the first launch of the era (decision D2); because a player may meet a puzzle before the mission that teaches its mechanic, each puzzle opens with a one-line first-sight beat that names the mechanic (the CU5 beat of the teaching mission, shortened).

## 1. Pop, Then Hide (the bubble cycle)

- **Enemy (rummage, hand-placed, hold):** ten `rivet_gunner` in two clumps of five on the east half of the garden, 20-26 u from the player's edge, facing west (chip fire: every rivet resets a bubble's regeneration delay).
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no unit".
- **The trick:** a flat line loses every bubble in the same second and the chip keeps them from ever recharging. A `bubble_tender` placed **directly behind two Wardens** cuts the regeneration delay from 3.0 s to 0.6 s, so the Wardens pop, the Troopers behind them step out and shoot, and the bubbles are back before the next rivet volley. Rotating (pop, step back, regrow, step forward) is the whole puzzle.
- **Why random armies fail:** Troopers alone are out-chipped (no bubble survives the first volley); Wardens alone walk 20 u into ten rivet guns with no Tender; a Tender in front of the line dies first.
- **Mechanic fired:** completed bubble recharges >= 6 and bubble breaks on your side <= 10 (`usedMechanic('shield', 6)`).
- **Blurb seed:** ten rivet guns, one garden and a pop-up reminder that bubbles are not bulletproof, only forgiving.

## 2. Light Bridge Etiquette (hover)

- **Enemy (rummage, hold on the far shore):** five `rivet_gunner`, two `junk_buggy` and one `salvo_cart` (min range 12) across the lava lake, the cart at the back with its crew.
- **Goal / limit / bonus:** eliminate; 150 s; bonus "No Dustpan bubble pops".
- **The trick:** the Dustpans are placed at the far end of the player's zone, away from the causeway, so the cart's first salvo is spent on the infantry line holding the causeway tight; the Dustpans then skate across the open lava **to inside the cart's 12 u minimum range**, where the salvo cannot fire, and shoot the crew first. Sending everything down the causeway feeds the cart; sending only hover leaves the causeway line to die to the buggies.
- **Why random armies fail:** an all-foot army is shelled on the causeway (craters, six 20-damage rockets a volley); an all-hover army has no one to pin the gunners; a hover tank that stops at 13 u from the cart is the one target the salvo can hit.
- **Mechanic fired:** hover units with kills while over lava >= 3 (`usedMechanic('hover', 3)`).
- **Blurb seed:** one lake of lava, one 6 u road that everyone has seen, and three tanks that have never needed a road.

## 3. Do Not Disturb (cloak and detection)

- **Enemy (quiet_hour, advance after 10 s):** six `veil_cutter`, cloaked from the start, arriving from the hull on the east side of the crash site.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Kill all six before any of them strikes" (no player unit takes a hit from a cutter).
- **The trick:** two `glow_grazer` on the approach (lamps reveal within 10 u) and one `spritz_medic` (detect r12) put every cutter inside a revealed zone before it reaches the line; the Troopers stand **behind the lamps**, not beside them, so a revealed cutter is shot while it is still walking in. A cutter that strikes first loses its cloak but kills a Trooper from behind (backstab x1.35).
- **Why random armies fail:** a Trooper line with no detector cannot target what it cannot see and is stabbed from the back; a lamp-heavy army with no shooters cannot kill what it reveals; the medic alone is the first thing the cutters reach.
- **Mechanic fired:** cutters revealed by a detector before their first strike >= 5 (`usedMechanic('cloak', 5)`).
- **Blurb seed:** six assassins, zero visible assassins, and a herd of woolly lamps that nobody asked to be on the front line.

## 4. Have You Tried Turning It Off? (Puzzle Edition) (EMP)

- **Enemy (courtesy, advance):** four `refund_crawler` in a tight column down the middle lane, shielded and armoured at the front.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "One EMP stuns all four" (`empHits(4)` in a single cast).
- **The trick:** the Tinker's EMP is r7 with a 1.0 s channel and a 14 s cooldown, so there is exactly one shot in the time limit. It must land when the whole column is inside the radius (wait until the head of the column is 10 u away and the tail is inside r7 of the Tinker), the Rivet Gunners stand behind it, and the Wrench Runners wait for the stun (blunt beats the stunned hull and a stunned crawler has no bubble). Firing early wastes the cooldown; a second Tinker doubles the window but also doubles the bill.
- **Why random armies fail:** rivets do nothing to .6 front armour and a bubble of 80; runners alone are shelled by four return cannons; an army with no Tinker never switches them off.
- **Mechanic fired:** machines stunned in one cast >= 4 (`usedMechanic('emp', 4)`).
- **Blurb seed:** four polite tanks in a very neat queue and one gentleman with a colander on a stick.

## 5. Gap Year (blink)

- **Enemy (skitter, hold across the rift):** five `acid_spitter` on the far rim, 8-10 u behind the deep rift, with the two bridges closed at the far end by force gates.
- **Goal / limit / bonus:** eliminate; 90 s; bonus "Lose nobody".
- **The trick:** the `hop_notary` stand **on the lip, not at the bridge**, blink 12 u over the rift and cut the spitters down before the first volley lands (acid ignores bubbles, so a slow crossing costs units); the Troopers cover from the near rim at 22 u and kill whatever turns to face the notaries. Both ends of a blink are telegraphed, so the spitters turn late.
- **Why random armies fail:** a bridge walk is shelled by five spitters (30 poison a glob) behind closed gates; an all-Trooper army cannot reach the far rim; a notary that blinks too early (a spitter volley is still loaded) dies to poison.
- **Mechanic fired:** blink casts >= 4 and spitter kills within 5 s of a landing >= 3 (`usedMechanic('blink', 4)`).
- **Blurb seed:** five acid spitters, one canyon and a fresh batch of people who have just taken a gap year.

## 6. Bait And Clean (orbital strike)

- **Enemy (skitter, advance):** forty `skitterling` in one column funnelling through a 6 u gap in the resin wall, 28 u from the player's edge.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "The bait survives" (no `glow_grazer` lost).
- **The trick:** the fixed `grand_housekeeper` (free, behind a Warden line) casts Deep Clean (1.2 s channel, 2.0 s red ring, r4, 90 energy, crater): the ring must land on the column where it clumps against the bait, so two Grazers are placed as bait at the gap's exit and the Wardens hold the line behind them out of the ring. A badly spaced bait lets the carpet spread and the strike kills five; a well-spaced one clumps the column and the strike kills thirty. The Housekeeper must stay alive through the channel (killing him cancels it).
- **Why random armies fail:** forty gnats overrun any Trooper line through chip and numbers, and a swarm that is never clumped never meets splash; an army that spends the budget on a front line without bait has no way to aim the one strike.
- **Mechanic fired:** `call_strike` kills >= 25 in one cast (`usedMechanic('strike', 1)` plus `strikeKills(25)`).
- **Blurb seed:** forty bugs, one housekeeper with a very large dustpan, and two woolly decoys that did not read the contract.

## 7. Acceptance and artefacts

Per puzzle: `tests/campaign/solve_puzzles.mjs --era=scifi --write` stores the winning placement in `era_scifi/puzzle_solutions.js`; the stored solution wins in 3 seeds in Node and in Chromium (comparator class (c) of AR6: wins with margin in both engines); 100 random legal armies from the restricted roster win <= 15 % and reach star 3 <= 5 %; the taught mechanic fires in the stored solution (the counters above); every puzzle has a registered negative control (a mechanic-off run must fail the stored solution: shields off for 1, `layer hover` off for 2, `cloak` detect off for 3, EMP off for 4, `blink` off for 5, `call_strike` off for 6). Text per puzzle (part 2): title, blurb, hint, goal text, star lines, first-sight beat. The solutions are re-recorded at S-FREEZE and after every sim fix window (plan E-FREEZE rules); the intent here does not change.

## 8. Reserve (not shipped)

`sf_pz_flak_you` (B's "Flak You": two Flak Pylons, a Tinker and a Scrapper against twelve Picket Eyes in a stream, defend a pad for 60 s; the pylon unit is not in this roster, and air and anti-air are taught by M8; if the cut ladder frees a slot, the same puzzle can be built from Tidy Troopers and a Dustpan against ten Glidewings); `sf_pz_blink_once` (B's blink-over-the-wall puzzle, merged into Gap Year); `sf_pz_lava_taxi` and `sf_pz_bubble_math` (B's hover and bubble puzzles, merged into puzzles 2 and 1); `sf_pz_one_big_ask` (B's strike-and-spawner puzzle, merged into puzzle 6).
