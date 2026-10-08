# Modern: six puzzles (binding, synthesizer part 1)

Format follows `src/content/era_ancient/puzzles.js`: hand-placed enemy, restricted roster, small budget, no mutators, no god powers, free retries, a stored solution found by the headless sim (`tests/campaign/solve_puzzles.mjs`) and replayed in Chromium (ER9). Stars follow `evaluatePuzzleStars`: star 1 = win, star 2 = spend at most `par`, star 3 = the bonus. Acceptance numbers are the plan's: 100 random legal armies win <= 15 % and reach star 3 <= 5 %; the stored solution wins in 3 seeds and fires the taught mechanic (`usedMechanic`). Each puzzle teaches one mechanic, the six are six different mechanics (cover, pin, armour faces, artillery minimum range, mines, air), and every one needs a module inside Modern's E-FREEZE prefix (#1-#16). Eleven candidates came from the two proposals (A: duck cover, pin cushion, armour has a back, incoming, mind the gaps, umbrella policy; B: hold still dear, plink plink crunch, too close for comfort, mind the gap, Cassandra was right, smoke signal); six ship, the rest are kept as reserve (section 8). Reload and heal-versus-repair are taught by missions (M1, M8) and left out of puzzles on purpose: reload is one idea best seen in a live battle and repair needs a long fight to show. Ids are `mod_pz_*`, globally unique (puzzles share `progress.stars`). Budgets are in rq and the par is the cost of the intended solution; the solver sets the final numbers, the intent below is binding.

| # | id | title | teaches (mission) | arena | roster | budget / par | requires |
|---|---|---|---|---|---|---|---|
| 1 | `mod_pz_duck_cover` | Duck, Duck, Cover | cover (M2) | `mod_parade_yard`, small, seed 31 | `clerk_rifleman` | 1,000 / 960 | M9 cover |
| 2 | `mod_pz_pin_cushion` | Pin Cushion | pin (M3) | `mod_trench_line`, medium, seed 32 | `tripod_mg_team`, `cub_reporter` | 800 / 700 | M3 statuses, M2 suppress |
| 3 | `mod_pz_plink_crunch` | Plink, Plink, Crunch | armour faces (M4) | `mod_desert_outpost`, medium, seed 33 | `drainpipe_launcher`, `clerk_rifleman` | 900 / 800 | M8 armorFace and turret |
| 4 | `mod_pz_too_close` | Too Close For Comfort | artillery and minimum range (M5) | `mod_garden_centre`, medium, seed 34 | `filing_howitzer`, `clerk_rifleman`, `tripod_mg_team` | 1,200 / 1,100 | M10, M8 setup |
| 5 | `mod_pz_mind_the_gaps` | Mind The Gaps | mines (M6) | `mod_bridge_gorge`, medium, seed 35 | `caution_sapper`, `dynamite_thrower`, `hoarding_bearer` | 1,000 / 920 | M11 |
| 6 | `mod_pz_cassandra_helicopter` | Cassandra Was Right About The Helicopter | air layer (M7) | `mod_harbour`, medium, seed 36 | `parasol_missileer`, `clerk_rifleman`, `mortar_pair` | 1,000 / 900 | M7, M10 |

Puzzles are open from the first launch of the era (decision D2); because a player may meet a puzzle before the mission that teaches its mechanic, each puzzle opens with a one-line first-sight beat that names the mechanic (the CU5 beat of the teaching mission, shortened).

## 1. Duck, Duck, Cover (cover)

- **Enemy (marmalade, hand-placed, hold):** six `tin_hat_trooper` on the east end of the yard, 22-28 u from the player's edge, facing west. Three `mod_sandbag_wall` chains are added by the puzzle at 8, 15 and 22 u from the player's edge, staggered north-south.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no unit".
- **The trick:** the fight is not where the walls are. A line standing at the start edge takes burst fire at 28 u and loses a man every volley; creeping wall to wall halves the incoming damage at every step, and the troopers cannot afford the reload windows (1.6 s each, mag 8). The clerks' longer range (32 u vs 28 u) lets them open fire from behind the second wall before the troopers can answer at all.
- **Why random armies fail:** an army that deploys in the open and advances loses six units to the first two bursts; an army that holds at the start edge is out-ranged by nothing and shot at by six; only stepping behind the walls and firing from them wins with margin.
- **Mechanic fired:** `cover` hits absorbed >= 20 (`usedMechanic('cover', 20)`).
- **Blurb seed:** six tin hats, three sandbag walls and one very small yard; the walls are not where the fight is.

## 2. Pin Cushion (pin)

- **Enemy (shed, hold in the trench):** ten `flowerpot_peashooter` in the near trench, on the lip in cover.
- **Goal / limit / bonus:** eliminate; 150 s; bonus "Lose no reporter".
- **The trick:** the Tripod MG Team's setup takes 1.2 s and its arc is 100 degrees, so it must be set up before the reporters move, and the reporters go only after the first pin ring fills (the pushpin thunk is the "go"). A pinned peashooter cannot advance and shoots wide, so four reporters walk down the trench on its flank; reporters sent early are burst down by ten peas, and an MG with no reporters is flanked outside its arc.
- **Why random armies fail:** rifles alone are halved by the trench cover; reporters alone die in seconds to ten peas; an MG placed facing the wrong way never pins anyone.
- **Mechanic fired:** `pin_applied` >= 6 and kills of pinned units >= 4.
- **Blurb seed:** ten peas, one machine gun and four reporters with a deadline.

## 3. Plink, Plink, Crunch (armour faces)

- **Enemy (marmalade, hold):** one `biscuit_tank` with its hull facing east (toward the player's start edge), its turret free to slew; two `tin_hat_trooper` as escort on the flank furthest from the compound gates.
- **Goal / limit / bonus:** eliminate; 90 s; bonus "Win within 20 s of the first drainpipe shot".
- **The trick:** the rifles are bait, not damage: they keep the turret turning to the front while the three drainpipes walk the long way round to the tank's side and rear and fire from there (the front plate is armour .75, the rear .20; a drainpipe does about 77 to the front and about 101 to the rear). The hull does not turn while the tank holds, so the side is open for 8 s. A launcher that fires from the front wastes its single shot and then sits helpless for 5 s.
- **Why random armies fail:** six clerks firing at the front do 2 damage a hit (the "plink"); three launchers deployed together on the front edge lose two to the first shells; only the flanking route gets the tank down before the escort and the shells take the army apart.
- **Mechanic fired:** `armour` side or rear hits >= 3 (`usedMechanic('armour', 3)`).
- **Blurb seed:** one tank facing east, six rifles that cannot hurt it and three gutters that can.

## 4. Too Close For Comfort (artillery and minimum range)

- **Enemy (briefing, advance after 3 s):** eight `cub_reporter` starting 46 u from the player's edge in the garden centre's main aisle.
- **Goal / limit / bonus:** eliminate; 100 s; bonus "A single shell kills three or more".
- **The trick:** the Filing-Cabinet Howitzer cannot hit inside 26 u and needs 2.5 s of setup, and the reporters cross the gap at 4.4 u/s, so the gun gets one shot at the clump while they are bunched in the main aisle: place it deep, set it up at once, and screen it with the Tripod MG (it pins the survivors) and three clerks. A howitzer placed forward is overrun before the first shell lands.
- **Why random armies fail:** an army without a screen loses the gun to the first reporter inside 26 u; an army without the gun cannot break eight reporters in the aisle fast enough; the glass greenhouses give no cover.
- **Mechanic fired:** `shells` kills >= 3 and a howitzer `crater` event >= 1.
- **Blurb seed:** one very large filing cabinet, eight small reporters and the rule that the cabinet cannot see anything near it.

## 5. Mind The Gaps (mines)

- **Enemy (marmalade, advance along the road):** three `biscuit_tank` in a column, entering the far-bank choke (a 7 u gap between `mod_road_barrier` chains) from 30 u out.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no unit".
- **The trick:** mines arm after 3 s and a Sapper lays one every 7 s (at most four live), so the two Sappers must start laying the moment the column appears, in the choke, and then get out of the road; the lead tank stops on a mine in the field and the dynamite throwers finish it from the side while the Bearers soak the cannon shells. Mines laid after contact do nothing (the arming delay is the puzzle).
- **Why random armies fail:** three tanks beat any army of throwers and bearers in a straight fight (cannon 60 aoe 2.0 shells, 560 hp, armour front .75); a Sapper who lays when the column is on top of him is dead before the mine arms.
- **Mechanic fired:** `mines` triggers >= 3 and `armour` side or rear hits >= 3.
- **Blurb seed:** three tanks, one narrow gap and a small amount of tape.

## 6. Cassandra Was Right About The Helicopter (air layer)

- **Enemy (skyclub, advance):** one `fishbowl_chopper` and two `hobby_drone`, arriving from the sea edge and strafing the quay.
- **Goal / limit / bonus:** eliminate; 120 s; bonus "Lose no parasol".
- **The trick:** the Mortar Pair is a trap: it is ground-only and cannot fire at the air. The answer is two Parasol Missileers (air-only, homing) kept behind the clerks, who are bait for the helicopter's rockets and also shoot up with their rifles; the parasols fire in a rolling pair (reload 2.2 s) so one is always loaded when the chopper banks in.
- **Why random armies fail:** an army with the mortar and no parasol cannot hurt the air at all (the termination rule ends the battle only by the watchdog); an army of parasols alone is strafed to death; an army of clerks alone loses to the rocket volley.
- **Mechanic fired:** `air` kills >= 3 (`usedMechanic('air', 3)`), and the AA guarantee in campaign validation covers the puzzle (the roster contains air-capable weapons by construction).
- **Blurb seed:** a gunship, two drones and a mortar that has never once looked up.

## 7. Acceptance and artefacts

Per puzzle: `tests/campaign/solve_puzzles.mjs --era=modern --write` stores the winning placement in `era_modern/puzzle_solutions.js`; the stored solution wins in 3 seeds in Node and in Chromium (comparator class (c) of AR6: wins with margin in both engines); 100 random legal armies from the restricted roster win <= 15 % and reach star 3 <= 5 %; the taught mechanic fires in the stored solution (the counters above); every puzzle has a registered negative control (a mechanic-off run must fail the stored solution). Text per puzzle (part 2): title, blurb, hint, goal text, star lines, first-sight beat.

## 8. Reserve (not shipped)

`mod_pz_incoming` (A's "Incoming (Please Hold)": twelve enemies behind a wall at 40 u, one Signal Officer and two Mortar Pairs, the call-in takes 2.2 s and the ring is visible to them too, stagger the strikes so the second lands where they run from the first; taught mechanic: `call_strike` timing, needs M13); `mod_pz_hold_still_dear` (B's pin puzzle, merged into Pin Cushion); `mod_pz_smoke_signal` (B's "Please Hold, Your Call Is Important": six `hoarding_bearer` in a wall, one strike plus grenades break it, smoke covers the crossing; kept out because smoke is a rung-5 cuttable); `mod_pz_armour_back` (A's Teapot Heavy rear-vent puzzle, merged into Plink, Plink, Crunch since the vent is cosmetic); `mod_pz_reload_roulette` (a reload-timing puzzle, unwritten).
