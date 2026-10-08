# Medieval: six puzzles (binding, synthesizer part 1)

Format follows `src/content/era_ancient/puzzles.js`: hand-placed enemy, restricted roster, small budget, no mutators, no god powers, free retries, a stored solution found by the headless sim (`tests/campaign/solve_puzzles.mjs`) and replayed in Chromium (ER9). Stars follow `evaluatePuzzleStars`: star 1 = win, star 2 = spend at most `par`, star 3 = the bonus. Acceptance numbers are the plan's: 100 random legal armies win <= 15 percent and reach star 3 <= 5 percent; the stored solution wins in 3 seeds and fires the taught mechanic (`usedMechanic`). Each puzzle teaches one mechanic and every one needs a module inside Medieval's E-FREEZE prefix (#1-#13). Nine candidates came from the two proposals; six ship (the ones that did not make the cut are kept as reserve in section 7).

| # | id | title | teaches (mission) | arena | roster | budget / par | requires |
|---|---|---|---|---|---|---|---|
| 1 | `med_stake_your_claim` | Stake Your Claim | brace and hold (M1) | `med_ford_of_dithering`, medium, seed 23 | pikeman, longbowman, billman (yeomen) | 1,400 / 1,100 | M2b |
| 2 | `med_standard_deviation` | Standard Deviation | banner and rout (M2) | `med_tourney_field`, medium, seed 22 | longbowman, pikeman, peasant_levy (yeomen) | 1,500 / 1,300 | M13 banner |
| 3 | `med_oil_you_need` | Oil You Need | fire and explosive props (M7) | `med_siege_camp`, medium, seed 24 | mangonel, longbowman, pikeman, pavise_bearer | 900 / 750 | M12 explosive props |
| 4 | `med_physician_heal_thyself` | Physician, Heal Thyself | healers and poison (M6) | `med_bellfount_abbey`, medium, seed 25 | apothecary, crossbowman, longbowman, bellringer | 1,300 / 1,100 | M6a |
| 5 | `med_counterweight_calculus` | Counterweight Calculus | artillery: arc, minRange, structure damage (M8) | `med_siege_camp`, medium, seed 26 | trebuchet, pavise_bearer, crossbowman | 1,450 / 1,350 | M10, M12 gates |
| 6 | `med_mind_the_gap` | Mind the Gap | air layer and anti-air (M9) | `med_moat_keep`, small, seed 27 | springald, longbowman, pikeman, pavise_bearer | 1,300 / 1,150 | M7 |

Puzzles are open from the first launch of the era (decision D2); because a player may meet a puzzle before the mission that teaches its mechanic, each puzzle opens with a one-line first-sight beat that names the mechanic.

## 1. Stake Your Claim (brace and hold)

- **Enemy (marrowby, hand-placed, advance):** lancer x5 in a line 40 u east of the ford, squire x4 behind them.
- **Goal / limit / bonus:** eliminate; 150 s; bonus "Lose at most 2 units".
- **The trick:** the lancers' run-up is the weapon, so the answer is to be standing, ready and facing east before the first hoof touches the water: six pikemen in two offset ranks on Hold at the ford's west lip, three longbowmen behind them, two billmen on the flank to finish the dismounted. The fatal mistakes are Advance orders (the pikes walk into the charge) and one straight rank (the second lancer wave flanks it).
- **Why random armies fail:** an army that is mostly billmen and longbowmen loses to five charges before the second volley; a pike block left on the default order advances off the lip and loses its brace.
- **Mechanic fired:** `brace` kills (chargeBreak events) >= 3.
- **Blurb seed:** five horses and one line of sticks; only one side has read the programme.

## 2. Standard Deviation (banner and rout)

- **Enemy (marrowby, hold):** squire x14 in a close block with one standard_bearer in the middle rank, block centred 22 u from the player's edge.
- **Goal / limit / bonus:** eliminate; 150 s; bonus "Win with all three longbowmen alive".
- **The trick:** the block is strong with its banner and weak without it, so spend the budget on reach, not weight: three longbowmen (preferTargets officer) with a clear line to the pennant drop the bearer; the fall shock and the officer-death shock rout the block; a few levies finish the runners. Marching a melee army into the block loses to banner-buffed squires.
- **Why random armies fail:** a melee-heavy army runs into 14 shielded squires with +10 percent damage and low morale loss; an archer-heavy army aims at the nearest squire, not the pennant, unless it uses the prefer-officer rule on the bearer.
- **Mechanic fired:** `bannerFall` event >= 1, `rout` events >= 8.
- **Blurb seed:** fourteen brave volunteers and one flag; the flag is the only one who knows the plan.

## 3. Oil You Need (fire and explosive props)

- **Enemy (free_company, advance along the lane to the gate stub):** battering_ram x2 in a column with sellsword x6 escort, walking a lane lined with pitch_barrel x8 and oil_cauldron x2 (props placed by the puzzle).
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no unit".
- **The trick:** shoot the barrels, not the rams. A single mangonel pot (aoe 3, fire, minRange 12, groundOnly) on the barrel at the head of the column chains the rest; the wooden rams (fire x1.8) burn and the escort breaks. Timing is the puzzle: the pot has one shot before the column reaches the minimum range, so the pavise screen buys the second.
- **Why random armies fail:** direct-fire damage cannot kill two 480 hp rams and six sellswords in 120 s; a mangonel placed inside its minimum range or aimed at the nearest ram wastes its single shot.
- **Mechanic fired:** `prop_explosion` events >= 3, kills by fire >= 4.
- **Blurb seed:** a lane of fireworks with a hat shop; the mangonel is the hat shop.

## 4. Physician, Heal Thyself (healers and poison)

- **Enemy (mixed, hold):** abbess + physician x3 behind a front of knight_afoot x6 (the healers keep the knights topped up).
- **Goal / limit / bonus:** eliminate; 150 s; bonus "Win in under 90 s".
- **The trick:** damage alone is out-healed (abbess 40 hp pulse, physicians 28 hp x5 per pulse), so apply NOHEAL first: an apothecary flask (aoe 2.2, 5 dps for 5 s, applies NOHEAL) on the healer cluster, then crossbow bolts (ap .55) on the plate while the healers are silenced; the bellringer's stun covers the knights' charge at the apothecaries. Poison ignores plate, which is why the knights are not the target of the flasks.
- **Why random armies fail:** an army of archers and bellringers cannot out-damage five healers; an army that targets the front line first spends 60 s feeding the healers.
- **Mechanic fired:** `status_apply NOHEAL` >= 3, healer kills >= 4 before knight kills >= 3.
- **Blurb seed:** a clinic that treats everyone, including the visitors; the label fell off the cupboard.

## 5. Counterweight Calculus (artillery)

- **Enemy (marrowby garrison):** a `med_castle_gate` stub (hp 2400) on a wall segment; squire x10 and lancer x2 behind it; a script event sends them out when the first boulder lands.
- **Goal / limit / bonus:** destroy the gate; 180 s; bonus "The trebuchet survives".
- **The trick:** one trebuchet (min range 26, max 72, 90 damage x4 on structures, cd 11) needs about seven hits on the gate, so it must stand between 26 and 72 u away, behind a pavise screen, with crossbowmen covering the screen. Firing early wastes the first shell on an empty field; placing it inside 26 u makes it a decoration. The sally arrives at the screen and meets pavises and bolts.
- **Why random armies fail:** an unscreened trebuchet dies to the sally; a trebuchet inside the minimum range cannot fire; a pavise-only army cannot hurt the gate at all.
- **Mechanic fired:** `structure damage` from a boulder >= 1800 on the gate; no `minRange` refusal events.
- **Blurb seed:** one gate, one catapult with opinions, and a clause about minimum distances nobody read.

## 6. Mind the Gap (air layer and anti-air)

- **Enemy (wyrmkin, advance):** wyvern x4 in two flights (t = 0 and t = 20 s) from the east edge, hoardling x10 as ground bait.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no springald".
- **The trick:** melee cannot touch the sky, so the army is a net: springalds (range 50, pierceN 3) spaced 6 u apart so a dive cannot hit two, longbowmen behind a pavise board, and the pikemen as deliberate bait in front, because a wyvern dives on the nearest ground unit and stays low enough to be hit while it does. The hoardlings are a test of whether the player noticed the bait is also the target.
- **Why random armies fail:** an all-melee army cannot hit a wyvern; a stacked AA block loses a springald to every dive; no pavise screen means the longbows die first.
- **Mechanic fired:** `air kill` events >= 4, `dive` events logged.
- **Blurb seed:** four flying cousins and a small stairwell; mind the gap, mind the dive.

## 7. Reserve puzzles (not shipped; kept for the cut ladder or a later patch)

- **Mind the Step** (bailout): three knight_errants charge; the horses fall but the knights stand up after 1.2 s; crossbowmen placed behind the horses hit the stand-up window.
- **Tin Opener** (armour and reload): six knight_afoot; two crossbow squads staggered 4 u apart so one is always loaded, pavises cover the reload.
- **Doorstep Delivery** (gates): battering rams reach a gate from the side the tower cannot see; bonus gate down in 60 s.
- **Dose Response** (poison): one apothecary cloud on a stationary block beats a plate bridge guard; a second cloud is a trap for your own queue.

## 8. Checklist for the puzzle designer / solver

Every puzzle has: a unique id (`med_` prefix, never reused), arena + seed from arenas.md, a roster of 3-4 unit ids from rosters.md, no mutators, no god powers, a hand-placed enemy of at most 20 units and 3 types, a `par` in groats, a stored solution, and an ER9 row (random 100 armies <= 15 percent wins, star 3 <= 5 percent). Numbers in this file are design intent; the solver may adjust counts by up to 30 percent to reach the ER9 band without changing the taught mechanic.
