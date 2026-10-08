# MODERN ERA, proposal B: "systems and learning curve first" (independent creative director B, 2026-10-08)

Working title of the era: **Modern: Live From The Front (Please Hold)**. Currency: **req** (requisition points; `fmtCost` unit). Everything is fictional, toy-box and kind: helmets pop and units are "knocked out", no realism, no real forces, no flags, no camo, invented ranks and brands. Mechanics used are only plan section 4 (M0..M19 as frozen for Modern at E-FREEZE #1..#16: M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e M8 M9 M11). Items that need a SIM yes/no are tagged `[SIM?]` and collected in section 12.

Design spine (what "systems first" means here), five rules every row below obeys:
1. **One tell per mechanic, drawn on screen before it is explained in words** (the pushpin, the ammo pips, the PLINK, the red ring, the blinking cone).
2. **Every unit is an answer to a question another unit asks** (nothing is "just a stronger rifleman"); the roster table has a "decision it changes" flavour in its counters column.
3. **The Modern fight is a four-beat loop: PIN (suppress) -> FLANK (cover and armour faces) -> FINISH (AoE, AT, strike) -> RESET (reload, repair, setup).** Players read the clock off magazines, not off health bars.
4. **Windows, not stats**: every strong thing has a visible, countable window (belt reload 4.5 s, howitzer setup 3 s + minimum range 28 u, mine arming 4 s, strike telegraph 2 s, tube reload 5 s). A counter is "be there during the window".
5. **Mechanic ladder, one new tell per mission** (table at the top of section 6), star 3 only ever tests something already taught, and every mission asks a composition question with a right answer and a tempting wrong one.

---

## 1. Conceit, tempo, camera, chrome, sound, signature, never-feel-like

**Conceit (one sentence).** Modern is a tabletop war played with toy-box combined arms (pop-gun infantry, tank columns, helicopters, mortar craters, mines under bridges) and administered over cheap radios, so three commentators who were handed headsets and a clipboard by mistake treat every firefight as a logistics problem that is also a live broadcast.

- **Tempo.** Fast lethality, long reach, short fights. Infantry time-to-kill 1.5-3 s (Ancient 4+ s); median engagement distance about 28 u (Ancient about 10); ranged share of damage >= 75% (Ancient about 35%); first contact 10-14 s at default placement; median battle 60-90 s. Fights are shaped by windows (reload, setup, arming), not by formations holding still. Pace is 1.3x Ancient: knock-outs come in bursts, then a lull while magazines refill, then the next burst.
- **Camera.** "Tabletop 3/4": default pitch 0.75 (Ancient 0.65), +12% pull-back and a wider FOV so 30-55 u sight lines fit; a faint tilt-shift vignette and a 1-frame "shutter" on set-pieces. Shot vocabulary for `CameraRig.shot`: shell-cam (follows an arc to the crater), heli-cam (side follow at altitude), column dolly (low tracking along a convoy), drone-top (straight-down pan), radio push-in (slow punch on a commentator caption). Reduce Motion = cuts.
- **UI chrome vocabulary** (`[data-era="modern"]` tokens): manila folders and clipboards with a binder clip; rubber-stamp buttons (APPROVED/DENIED red, Bungee); unit cards as ID badges on lanyards; tooltips as sticky notes; a SITREP ticker under the HUD; a coffee ring on the briefing paper; hazard-tape dividers; the campaign map is a **war-room paper map with pushpins and red string** (pins are literally pushpins; route legs are string); loading spinner is a radar sweep; accent = highlighter yellow `#E8E04A`, paper `#E9D9A8`, ink `#1D2A44`, stamp red `#C93A32`. Arrival card is a boarding pass.
- **Sound palette (3 adjectives): poppy, clacky, crackly.** Gunfire is stylised pops with short tails (0.15-0.35 s), clacks for reloads and clips, crackle for radios and rotor/engine beds. No orchestral trailer. Music is spy-jazz and funk-march groove.
- **Signature mechanic and on-screen tell: PINNED (suppression).** Bullets that land near a unit do not just hurt, they *pin*: a red **pushpin drops onto the unit's head with a small "thunk"**, the unit ducks into a crouch, its helmet dips, dust puffs at its feet, it cannot advance and its shots go wide. The pin is visible at any zoom (an 8-px red tack icon in the world-label layer) and on the selection card as a draining ring. Everything else in the era hangs off it: MGs pin so riflemen can flank, cover and banners resist pins, mortars pin dug-in lines, drones are hard to pin, tanks ignore pins (rifle PLINK) but rockets and mines are the answer. Secondary tells: ammo pips under every shooter (3-8 ticks) and the RELOAD ring; green "cover" chevron vs red "flanked" tick; yellow PLINK with a "1"; red telegraph ring plus whistle for indirect fire; amber blinking cone for an armed mine; shadow blob plus altitude for air.
- **What Modern must NEVER feel like.** (a) Ancient with guns: infantry standing in a line trading volleys. (b) A realistic or grim war game: no blood, no pain, no real forces, no stoic pathos, nobody pleads. (c) A trailer: no orchestra, no slow-mo for its own sake. (d) A twitch aim-test: sniper and artillery have windows and telegraphs. (e) A stat race: a tank is not "a hoplite with more hit points", it has faces. (f) Sci-Fi-lite: no energy, no shields, no cloak, no hover, no EMP; gadgets are mundane (radios, drones that drop parcels, smoke).
- **Fingerprint vs Ancient/Medieval (ER27 vector I commit to):** engagement distance 25-32 u; ranged damage share 75-85%; kill rate 2.5x Ancient; first contact 10-14 s; vertical spread > 0 (air layer in 5 of 9 missions); speed distribution bimodal (infantry 3 u/s, wheels 4-6.5, tanks 2.4).

## 2. Six factions

| id | name | colour pair | emblem (no real symbol) | silhouette language | army identity |
|---|---|---|---|---|---|
| `hollowell` | Hollowell Rifle Union | lime `#8BC63F` + charcoal `#2B2F36` | pushpin in a ring | round helmets, loop lanyards, rectangular rifles | Infantry doctrine: cover, pin, flank. Cheap, accurate, fragile, great with a banner. 6 units, 6 hum1 bodies |
| `grommet` | Grommet Motor Republic | petrol `#2F6F8F` + chrome orange `#FF9F1C` | hex-nut inside a tyre-tread ring | boxy angular hulls, hex hatches, wheel arches | Armour and wheels: faces, AT, repair. Slow to start, brutal to break, dies to flanks and mines |
| `sandbag_mutual` | Sandbag Mutual | terracotta `#C8553D` + sand `#E9D8A6` | stitched sandbag tied with a bow | low, wide, squat; sandbag pads everywhere | Dig, mine, shell: artillery, observers, mines. Wins by making the ground argue for it |
| `cirrus_guild` | Cirrus Aerodrome Guild | cyan `#27B5D9` + white `#F7FBFF` | folded paper plane | slender swept shapes, bubble canopies, dense rotor discs | Air layer: gunships, lift, drones, flak. Fast, vertical, loses to a good AA screen and to a ceiling |
| `parcel_rangers` | Parcel Rangers | violet `#A23BC4` + kraft `#C8A46A` | parcel with a tied-string bow | box backpacks, straps, low crouching runners | Raiders: fast, short-range, flanking, drone bombs. Pins them and they fold; unpinned they are everywhere |
| `bureau` | Bureau of Expensive Ideas | silver `#AEB7C2` + signal red `#E03B3B` | rubber-stamp circle with a tick | tall asymmetrical prototypes, antennae, drawers, stamps | Bosses and clipboards: shielded guards and three one-off machines. The "Mythic" of the era |

Lore (3 sentences each, jokes at the situation, not at people):
- **Hollowell Rifle Union:** "Hollowell is a country shaped like a firing line, which is convenient, because everyone in it already stands in one. Its constitution is a laminated card reading eight rounds per citizen and one lanyard for emergencies. Nobody has found out what the lanyard is for, and it is considered unpatriotic to ask."
- **Grommet Motor Republic:** "Grommet is legally a car dealership that won an election. Its borders are measured in parking spaces and its anthem is an engine trying to start. Every citizen owns a wrench and has used it to settle at least one argument."
- **Sandbag Mutual:** "Sandbag Mutual is an insurance company with a standing army, which it insists is only a very large claim. Its soldiers dig first, shoot second and invoice third. Asked about the craters, it says they were pre-existing conditions."
- **Cirrus Aerodrome Guild:** "The Guild runs every airfield on the continent and has never been on time to one. Its pilots salute with two glowing batons and have landed on at least one thing that was not a runway. Its motto, loosely translated, is 'We will circle back'."
- **Parcel Rangers:** "The Rangers began as a courier firm and kept going after the customer moved. They deliver in all weathers, now with shotguns, because somebody has to sign for it. Every Ranger carries a pen, an attitude and the firm belief that you were out."
- **Bureau of Expensive Ideas:** "The Bureau builds prototypes so costly that they must be used, or someone has to explain. Every machine ships with a ribbon, a form and a launch date that has already slipped. They are not your enemy exactly; they are the people who put the enemy on a budget line."

## 3. The 34-unit roster

Legend: `[B]` = survival boss (5), `[S]` = bespoke silhouette (non-hum1 rig; 20 of 34, floor is 15), `[H]` = hero. Roles use existing roles plus tags (`vehicle air machine organic shielded` ...); stat intent = hp / speed (u/s) / cost in req (Ancient anchor: hoplite 150 / 2.6 / 100). New hum1 gun styles needed: `rifle mg sniper smg shotgun tube pistol` (one AIM row each). `[SIM?]` marks a parameter that the closed M-list may not cover exactly. Armour faces are `front/side/rear` multipliers on `eff`.

| id | name | fac | role / tags | rig / style | weapon / projectile | ability | stat intent | counters / weak to (decision it changes) | silhouette hook | joke | 1st |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `rifle_trooper` | Pop Rifleman | hol | ranged / organic infantry | hum1 / rifle | `bullet` 11 dmg, cd 0.9, rng 30, mag 8, reload 2.2 s | none (AI seeks cover) | 100 / 3.0 / 90 | Beats open infantry at range, doubled in cover. Weak: pins, grenades, tanks, closers. Decision: where to stand | round helmet, shoulder sling, swinging lanyard loop | "Issued eight rounds and a lanyard. Uses the lanyard." | M1 |
| `belt_gunner` | Belt Gunner | hol | ranged / organic mg | hum1 / mg (hip) | `bullet` 4-round burst x6, burst cd 0.8, rng 34, mag 40, reload 4.5 s, `suppress` r2.5 | none | 120 / 2.4 / 140 | Pins infantry and crews, slows chargers. Weak: the 4.5 s reload window, flanks, grenades, mortars. Decision: when to relieve him | huge ammo-box pack, belt draped like a scarf, wide stance | "Fires forty rounds, then reloads for the length of a coffee order." | M1 |
| `quiet_marksman` | Quiet Marksman | hol | ranged / organic sniper | hum1 / sniper | `sniper` hitscan 60 dmg, cd 3.2, rng 55 (min 10), mag 5, reload 3.5 s; prefers officer, crew, medic | none | 70 / 2.6 / 170 | Deletes heroes, crews, medics, observers. Weak: closers, drones, being pinned (spread). Decision: who is the priority target | tall floppy hat, barrel 2 voxels thick and as long as he is, glint voxel | "Asks everyone to keep it down. Says this to the howitzer." | M3 |
| `field_medic` | Field Medic | hol | support / organic | hum1 / pistol | `bullet` 5 dmg, rng 14 | `heal_pulse` organic only, r6, +14 per 4 s | 90 / 3.0 / 120 | Keeps a pinned line alive; heals no machine. Weak: first to die. Decision: medic behind the cover, not in it | giant adhesive-bandage emblem on helmet (no cross), fat satchel | "Carries bandages, a clipboard and the quiet knowledge that it is mostly paperwork." | M2 |
| `pocket_grenadier` | Jam-Jar Grenadier | hol | ranged / organic explosive | hum1 / throw | `grenade` arc high, aoe 3, 30 dmg, rng 20 (min 6), mag 3, reload 3 s | none | 100 / 2.8 / 110 | Cracks cover clumps, trenches, shield lines (aoe ignores arcs). Weak: minimum range, riflemen at range. Decision: lob or advance | bandolier of jars, one mitten | "Throws a small bomb the size of a jam jar and holds firm opinions on jam." | M3 |
| `lanyard_major` [H] | Lanyard-Major Tack | hol | hero / officer organic | hum1 / pistol, banner back | `bullet` 9 dmg, rng 16 | `aura banner` r10: pin gain -50%, fire rate +10%, morale | 260 / 3.0 / 360 | Makes a line stubborn under fire. Weak: marksman priority. Decision: keep the banner inside the cover | tall pole with an oversized pushpin banner | "Believes every problem is a map. Pins it." | M3 |
| `scout_runabout` [S] | Scout Runabout | gro | cavalry / vehicle light | car1 | `bullet` pintle burst 3x5, rng 26, fires on the move | none | 220 (armor .15) / 6.4 / 160 | Flanks crews and mortars, chases drones. Weak: everything with AP, mines, MG lines. Decision: raid or screen | open-top buggy, roll bar, whip pennant in team colour | "Four seats, no roof, and a horn that plays a jingle at the worst possible moment." | M4 |
| `troop_tin` [S] | Troop Tin | gro | cavalry / vehicle armored carrier | car1 six-wheel | `bullet` roof MG burst 3x4, rng 24 | `bailout` on death: 4 `tube_trooper` pop out | 520 (.55/.35/.2) / 4.0 / 310 | Delivers AT troops past rifles. Weak: tube troopers, mines, AT gun. Decision: crack it early or let the troops out | boxy tin with a sunroof hatch, six chunky wheels | "Carries four tube troopers in a tin with a sunroof. They use the sunroof." | M6 |
| `line_tank` [S] | Line Tank | gro | monster / vehicle armored | tank1 | `shell` direct 90 dmg ap .6, cd 4.0, rng 42; coax MG; turret rate 70 deg/s | none | 1100 (.8/.55/.3) / 2.4 / 650 | Beats infantry up to about 10, rifles go PLINK. Weak: tube troopers from the side, mines, gunships, slow turret. Decision: which end faces the problem | boxy hull, hex-nut hatch, barrel >= 2x2 voxel | "Plink. Plink. 'Is it supposed to...' CLUNK. Yes." | M4 |
| `tube_trooper` | Tube Trooper | gro | ranged / organic at | hum1 / tube | `rocket` 95 dmg ap .85 aoe 1.5, rng 26 (min 6), mag 1, reload 5 s | none (kneels to fire) | 85 / 2.8 / 130 | Kills vehicles through any face, best from the side. Weak: one shot then 5 s of helplessness. Decision: bait the hull, strike the flank | long green tube on the shoulder, kneeling stance | "Employed by the Pedestrian Division. One rocket a day, countersigned." | M4 |
| `repair_truck` [S] | Mechanic Truck | gro | support / vehicle machine | car1 | none; `bullet` 4 pistol out the window | `heal_pulse` machine only r7, +30 per 3.5 s | 340 (.3) / 4.0 / 240 | Keeps tanks in the fight. Weak: unarmed, sniper/AP bait. Decision: protect the truck, not the tank | wrench-arm crane, spare wheel on roof | "Fixes tanks with a wrench, a flask of tea and a tone of voice." | M4 |
| `stopper_gun` [S] | Stopper Gun | gro | siege / crew at | gun1 (AT) lite crew | `ap_shell` 125 dmg ap .9, cd 4.5, rng 48; `turret.arc` 50 deg | `setup` 2 s before first fire `[SIM?]` | 190 (.4 front) / 1.2 / 260 | Stops tanks and vans at range. Weak: infantry rush, artillery, anything outside its 50 deg arc. Decision: where it faces | long thin barrel, tall front plate, 2 crew | "Faces forward with total confidence, which is also its only direction." | M4 |
| `land_barge` [B][S] | Land Barge | gro | monster / vehicle armored boss | tank1 x1.8, 3 turrets | bow cannon 110 dmg; twin MGs; rear mortar tube (arc, aoe 4, rng 60, min 15) | `bailout` 2 `troop_tin` at 50% hp | 4200 (.85/.6/.35) / 1.4 / 2400 | Stalls columns; rear and mines hurt. Weak: rear plate, sappers' mines, air. Decision: circle it | stacked deck like a ship hull on treads, funnel | "A ship, on land, who was never informed." | M6 |
| `sandbag_sapper` | Sandbag Sapper | san | support / organic engineer | hum1 / pistol, shovel back | `bullet` 5 dmg | `lay_mine` (cd 12, cap 4, arm 4 s, 150 dmg aoe 2.5, x1.5 vs vehicle); optional `spawnProp` sandbag wall (cd 20, cap 2) `[SIM?]` | 110 / 2.8 / 150 | Turns a road into a decision. Weak: dies fast, mines bite his friends too. Decision: lay early, mark the lanes | wide shovel on back, pockets of cones | "Digs a hole, fills the bag, files the hole." | M6 |
| `mortar_crew` [S] | Mortar Crew | san | siege / crew | gun1 (mortar) lite 2 crew | `mortar_shell` arc high, aoe 3.5, 42 dmg, rng 60 (min 15), cd 3.2; groundOnly | `setup` 1.5 s | 120 / 2.2 / 190 | Pins dug-in lines, ignores cover. Weak: minimum range, air, flankers. Decision: spot or screen | stubby tube on a plate, two crew hugging the dirt | "Posts thoughtful letters over the wall. Return address: regrets." | M3 |
| `heavy_howitzer` [S] | Howitzer | san | siege / crew | gun1 (howitzer) lite crew | `howitzer_shell` arc high, aoe 5, 95 dmg, crater, rng 90 (min 28), cd 7; groundOnly, `structDmg` x2 | `setup` 3 s | 260 / 0.9 / 420 | Kills radars, bunkers, clumps from far away. Weak: minimum range 28, speed, air, being found. Decision: what screens it | long barrel on a sandbag ring, recoil slide | "Hits what it cannot see and cannot hit what it can. Apologises in craters." | M5 |
| `claims_adjuster` | Forward Claims Adjuster | san | support / organic observer | hum1 / pistol, radio back | pistol 5 dmg | `call_strike` (2 s telegraph, aoe 4.5, 80 dmg, cd 18); `smoke` (r5, 8 s, cd 22) | 80 / 3.2 / 180 | Brings a strike to the exact spot, shields cross the street in smoke. Weak: marksmen, drones. Decision: which spot is worth 18 s | clipboard, tall radio whip, hard hat with a pen | "Estimates the damage in advance, then arranges it." | M8 |
| `salvo_truck` [S] | Salvo Truck | san | siege / vehicle | car1 + pod rack | 8-rocket salvo, aoe 2.5, 25 each, rng 55 (min 14), cd 9; groundOnly | none | 380 (.3) / 3.6 / 380 | Erases open infantry and light vehicles. Weak: flanks, AT, mines. Decision: where it parks to fire | slanted pod rack, side-mounted ramp | "Mail-order rockets, delivered eight at a time, none to the right address." | M8 |
| `final_notice` [B][S] | The Final Notice | san | siege / crew boss | gun1 x2.5 giant | `notice_shell` aoe 7, 160 dmg, crater, rng 110 (min 35), cd 9; telegraph ring 2 s | `setup` 4 s | 3000 (.6) / 0.6 / 2100 | Hits everything past 35 u. Weak: minimum range 35, speed, air. Decision: send runners | enormous barrel on a quarry-trolley carriage | "Every shell arrives stamped FINAL NOTICE. There have been fourteen." | M5 |
| `whirly_gunship` [S] | Whirlybird Gunship | cir | ranged / air vehicle | heli1 | rocket pod `rocket` homing 4x30 aoe 2 + chaingun burst, rng 38 | strafe AI, attack altitude | 620 (.45) / 5.0 / 640 | Wrecks tanks and open infantry; ground artillery cannot touch it. Weak: flak, massed rifles and MGs. Decision: AA or die | bubble canopy, dense rotor disc >= 2 voxel blades | "Hovers exactly where Cassandra's paperwork said it would." | M7 |
| `lift_whirly` [S] | Lift Whirly | cir | support / air vehicle | heli1 (twin-seat) | unarmed | `summon_on_death` onContact `bailout`: 5 `rifle_trooper` on arrival `[SIM?]` | 540 (.35) / 4.4 / 360 | Drops a squad behind the line. Weak: everything with air reach. Decision: shoot the taxi | boxy cabin, sliding door, twin skids | "Seats five. Departs when full. Arrives when not expected." | M7 |
| `recon_drone` [S] | Spotter Drone | cir | swarm / air machine | drone1 | `bullet` 4 dmg burst 3, rng 22 | none | 40 / 7.0 / 55 | Hunts medics and marksmen, soaks AA. Weak: anything that shoots up. Decision: bait or ignore | four-arm ring, single big eye voxel | "Streams live video of the battlefield to nobody. Mostly of its own propeller." | M7 |
| `flak_cannon` [S] | Flak Cannon | cir | siege / crew aa | gun1 (AA) lite 2 crew | `flak` aoe 3, 32 dmg, burst 3, cd 1.4, rng 44; prefers air; dmg x0.3 vs ground | `setup` 2 s | 210 (.3) / 1.0 / 280 | Owns the air layer. Weak: ground rush, artillery. Decision: where the umbrella goes | quad barrels on a turntable, upturned | "Hates everything above head height, personally." | M7 |
| `chief_windsock` [H] | Chief Windsock | cir | hero / officer organic | hum1 / pistol, batons | `bullet` 8 dmg | `aura` haste for air r14; `call_strike` flyover (aoe 5, 110 dmg, 2.5 s, cd 25) | 280 / 3.2 / 400 | Turns an air squadron into a clock. Weak: marksman. Decision: keep him under the umbrella | two glowing baton voxels, orange vest | "Directs aircraft with two glowing batons. Twice mistaken for an aircraft." | M8 |
| `courier_runner` | Courier | par | ranged / organic skirmisher | hum1 / smg | `bullet` burst 3x4, rng 18, mag 20, reload 2 s, fires on the move | none | 75 / 4.2 / 80 | Flanks fast, pins crews. Weak: MG lines, grenades, being pinned. Decision: kill them before they cluster | box backpack, strap, forward lean | "Delivers parcels, rumours and fourteen rounds a second. Signature required." | M1 |
| `door_knocker` | Door-to-Door Closer | par | melee / organic shotgun | hum1 / shotgun | `buckshot` volley 8x5, spread wide, rng 8, mag 2, reload 2.4 s | none | 130 / 3.6 / 120 | Wins any close fight, melts cover holders at the corner. Weak: anything at range, MG pins, kiting. Decision: stay out of 8 u | broad flat cap, short stubby barrel | "Knocks twice. The third knock is a shotgun." | M1 |
| `parcel_drone` [S] | Parcel Drone | par | swarm / air machine | drone1 + box | `parcel_bomb` aoe 2.5, 30 dmg, cd 4, overflies target (rng 4) | none | 60 / 5.5 / 70 | Drops on clumps and medics from above. Weak: rifles, flak. Decision: do not clump | cube box slung under four rotors | "Drops a box marked FRAGILE. It is. So is what is underneath." | M7 |
| `delivery_van` [S] | Delivery Van | par | cavalry / vehicle | car1 | ram melee 26 dmg + `charge`; kb high | `bailout`: 4 `courier_runner` on death or contact | 300 (.25) / 5.8 / 190 | Breaks lines, mines kill it. Weak: AT gun, tube trooper, mines, blocked lanes. Decision: lay mines on the taxiway | box van with a ramp, big arrow pictogram | "Promises next-day delivery. Means yesterday, at speed." | M7 |
| `pack_mule` [S] | Pack Mule | par | support / organic beast | quad1 (new `mule` species) | kick 8 dmg | `aura` resupply r6: reload x0.7 `[SIM?]` | 220 / 3.4 / 150 | Makes magazines shorter for everyone near it. Weak: unarmed, slow to turn. Decision: shoot the mule, not the soldier | stacked ammo panniers, long ears, tiny hat | "Carries four hundred kilos of ammunition and one grudge. Declines to discuss either." | M2 |
| `postmaster_corvid` [H] | Postmaster Corvid | par | hero / officer organic | hum1 / smg | `bullet` burst 3x5, rng 18 | `aura` express r10: speed +20%, reload x0.8; `smoke` (cd 20) | 250 / 3.4 / 340 | Leads raids. Weak: marksman, MG. Decision: pin him before he runs | tall peaked cap with a feather voxel, satchel | "Has never lost a parcel. Has lost four armies." | M3 |
| `clipboard_guard` | Compliance Guard | bur | melee / organic shielded | hum1 / shield + baton | baton 12 dmg, shield arc 100 deg block .75 proj .85 | none | 170 (.35) / 2.6 / 140 | Walks through rifle fire front-on. Weak: grenades and strikes (aoe ignores arc), flanks, tank shells. Decision: do not shoot the shield | giant clipboard held as a tower shield, red tape sash | "Shield reads NOT THIS WAY. Bullets comply less often than hoped." | M5 |
| `zoning_dozer` [B][S] | Zoning Board | bur | monster / vehicle armored boss | tank1 variant (blade) | blade melee 45 dmg trample; `structDmg` x4 | `dash` bull-charge dist 12, cd 10 | 3600 (.92 blade/.6/.25) / 2.0 / 2000 | Eats cover and flattens infantry. Weak: rear, mines, flank AT. Decision: never face the blade | low wide wedge, huge blade, tiny cab | "Rezones the battlefield as Open Space (Formerly Cover)." | M9 |
| `mobile_briefing` [B][S] | Mobile Briefing Room | bur | support / vehicle boss | car1 x2.2 | rear loudspeaker pulse (confuse) | `summon` 4 `clipboard_guard` every 25 s; `cc_field` confuse r9 ("Please Hold") | 3000 (.55/.45/.3) / 1.6 / 1900 | Spawns shields and mutes your army. Weak: rear door, strikes, mines. Decision: kill the doors before the guards | bus body, roof of antennae, rear stair | "Contains fourteen chairs, one whiteboard and a slide titled WHY WE ARE WINNING." | M9 |
| `filing_cabinet` [B][S] | Flying Filing Cabinet | bur | ranged / air vehicle boss | heli1 x2.4, 4 rotors | 6-drawer rocket rack 6x35 aoe 2.5 | `cc_field` root r5 (forms rain, "stop-work") | 2600 (.5) / 3.0 / 2200 | Roots and rockets clumps. Weak: flak, massed rifles. Decision: AA first | grey drawer tower with four spinning drawer-rotors | "Contains every form you ever failed to file. Drops them from a height." | M9 |

Counts: Hollowell 6, Grommet 7, Sandbag Mutual 6, Cirrus 5, Parcel Rangers 6, Bureau 4 = 34. hum1: 14 (Hollowell 6, `tube_trooper`, `sandbag_sapper`, `claims_adjuster`, `chief_windsock`, `courier_runner`, `door_knocker`, `postmaster_corvid`, `clipboard_guard`); bespoke rigs: 20 (`tank1` 3, `car1` 6, `gun1` 5, `heli1` 3, `drone1` 2, `quad1` 1). Each faction has a silhouette-unique unit; <= 2 hum1 per body type via the three body scales + helmet/pack sets. No hover, no mech, no insect, no alien in Modern. Survival boss cycle: `land_barge` (w5), `zoning_dozer` (w10), `mobile_briefing` (w15), `filing_cabinet` (w20), `final_notice` (w25); the 20 survival wave names: The Morning Commute, Rush Hour, The Tailgaters, Detour (Armed), Unattended Luggage, Terms And Conditions, The Long Hold, Reply All, Out Of Office, The Fire Drill, Mandatory Fun, Quarterly Review, Overnight Delivery, Signature Required, The Merge Lane, Scheduled Maintenance, Please Take A Number, The Safety Briefing, Roadworks Without End, The Final Reminder. Boss names: "Wave 5: A Ship, On Land", "Wave 10: Open Space (Formerly Cover)", "Wave 15: Please Hold", "Wave 20: Filed Under Flying", "Wave 25: Final Notice".

**Counter matrix (designed direction, written before measuring; ER7 asserted pairs need >= 200 battles, Wilson lower bound >= 55%, point >= 65%).** Archetypes: OPEN inf, COVER inf, SHIELD inf, LIGHT veh, ARMOUR, AIR, CREW guns, HERO.

| attacker \ target | OPEN | COVER | SHIELD | LIGHT veh | ARMOUR | AIR | CREW | HERO |
|---|---|---|---|---|---|---|---|---|
| rifles | ++ | = (halved) | -- front | - | -- (PLINK) | + | + | = |
| belt gunner (pin) | ++ | + (pin ignores the sandbag) | -- | - | -- | = | ++ | = |
| grenadier / mortar | + | ++ (aoe ignores cover) | ++ | - | - | -- | ++ | + |
| tube trooper / stopper | - | - | = | ++ | ++ (side/rear) | -- | = | = |
| tank | ++ | = | + | + | = | -- | + | + |
| gunship | ++ | = | = | + | ++ | = | + | + |
| flak / AA | -- | -- | -- | -- | -- | ++ | -- | -- |
| marksman | = | + | -- | - | -- | - | ++ | ++ |
| mines | = | = | = | ++ | ++ | -- | = | = |

Nine asserted counters to test (designed direction): (1) 6 `rifle_trooper` in cover beat 6 in the open >= 65%. (2) 1 `belt_gunner` + 4 riflemen beat 8 `door_knocker` charging >= 60% (pin). (3) 3 `tube_trooper` on the side beat 1 `line_tank` >= 70%, frontal only <= 35%. (4) 1 `line_tank` beats 10 `rifle_trooper` in the open >= 70%. (5) 1 `flak_cannon` beats 1 `whirly_gunship` >= 65%; 2 `heavy_howitzer` cannot touch it (<= 5%). (6) 1 `heavy_howitzer` + screen beats 12 clumped riflemen >= 70%; 2 couriers that reach its minimum range beat it >= 60%. (7) mines laid >= 5 s before contact in a 7-cell choke cost a 3-tank column at least one tank in >= 60% of battles, and nothing at all when laid after contact (< 15%). (8) `quiet_marksman` beats a `lanyard_major` alone >= 65%, loses to a courier rush. (9) a line of 6 `clipboard_guard` beats 8 riflemen frontal >= 65% and loses to 3 grenadiers >= 70%.

**Composition archetypes the roster supports (Quick Battle and armygen styles):** Pin-and-Flank (Hollowell + Parcel: MG anchors, couriers/closers flank), Armoured Fist (Grommet: tank + tube troopers + repair truck), Dig-and-Shell (Sandbag: sapper + mortar + howitzer + adjuster), Air Umbrella (Cirrus: flak + gunship + drones), Postal Blitz (Parcel: vans, drones, couriers), Red Tape (Bureau: shield wall + one prototype). Mixed armies are the whole point of "combined arms": the best Hollowell army has 2 belt gunners, 1 medic, 1 grenadier; the best Grommet army has no more than 2 tanks per 6 tube troopers; a pure tank army loses to 4 tube troopers on the flank by design.

## 4. Twelve arenas

Scale and tempo table (W11): rifle 30, MG 34, sniper 55, grenade 20, mortar 60/min 15, tank 42, AT 48, howitzer 90/min 28, flak 44, gunship 38; infantry 3.0 u/s, wheels 4-6.5, tanks 2.4, heli 5, drone 7. Medium = 96 u, large = 128 u. Vehicle corridors >= 6 cells everywhere vehicles appear (W10), tall buildings only at edges or <= 4-5 u in the fight corridor (W8). Materials appended (frozen ids, 16+): `asphalt`, `concrete`, `gravel`, `rail_ballast`, `metal_plate`, `paint_yellow`, `tarmac`, `churned_mud`.

| id | name | size | theme / biome | signature features | objective fit | set-piece fit | use |
|---|---|---|---|---|---|---|---|
| `mod_range` | Range Seven | medium | `modern_range` / gravel | yellow firing line, pop-up dummies, sandbag demo bay, cafeteria with a stack of trays; sym mx | eliminate, hold | klaxon pop-up wave | M1 |
| `mod_blocks` | Downtown Blocks | medium | `modern_city` / asphalt | 3x3 city grid, alleys, bank, cafe, parking deck, parked cars; sym mxz | capture, hold, kill_general | facade collapse opens a street | M2 |
| `mod_trench` | The Long Ditch | medium | `modern_trench` / churned mud | two carved trench lines, pre-battle craters, wire, a command dugout; sym mx | kill_general, hold, capture | whistle, mass pin | M3 |
| `mod_bridge` | Bridge Too Narrow | medium | `modern_river` / grass + water | river plane, 8 u bridge deck (planks cells), piers, ruined mill; asymmetrical start | escort, destroy | mortar cuts the span (`editTerrain`) | M4 |
| `mod_desert` | Dustbowl Outpost | medium | `modern_desert` / sand | dunes, 2 bunkers, 4 radar dishes, hidden minefield marked by warning pennants, one huge gun on a hill | destroy, defend_core | shell-cam | M5 |
| `mod_harbour` | Harbour Of Mild Concern | medium | `modern_harbour` / concrete + water | piers (planks), container maze, cranes, floating ships, depot core on the quay | defend_core, destroy | barge arrival through containers | M6 |
| `mod_airfield` | Aerodrome Park | large | `modern_air` / tarmac | runway, taxiways, 2 hangars, parked planes, control tower at the edge; flat | survive_waves, capture | gunship flyover | M7 |
| `mod_railyard` | Switchyard Nine | large | `modern_rail` / ballast | parallel tracks, rows of rail cars as cover, signal gantries, fuel cars (explosive) | protect_vip, escort, destroy | chain-reaction freight | M8 |
| `mod_dam` | Dam Fine View | large | `modern_dam` / concrete + water | reservoir plane, dam wall plateau with a 10 u causeway, 4 gates, pylons, valley below | destroy, kill_general | spillway opens | M9 |
| `mod_roadworks` | Roadworks Without End | large | `modern_road` / asphalt | interchange, cone fields, jersey barriers, a hay-bale cow, lanes >= 8 cells | escort, capture | traffic jam (cosmetic) | Quick, M5 reward |
| `mod_suburb` | Cul-De-Sac Heights | medium | `modern_suburb` / turf | houses, hedges, fences, gnomes, paddling-pool decals; sym mxz | capture, eliminate | none | Quick, M2 reward |
| `mod_campus` | Campus Of Expensive Ideas | large | `modern_campus` / concrete | parade ground, fountains, glass towers at edges, hedge maze, a tall pole with nothing on it | kill_general, destroy | none | Quick, M9 reward |

## 5. Thirty-eight props (`mod_` prefix; shared `any` reused without new ids: `tree_pine`, `tree_oak`, `bush`, `rock_small`, `rock_big`, `cactus`, `reeds`, `wheat`, `palm`, `campfire`, `log`)

Categories (new): `military`, `urban`, `industry`, `misc`. blocks: full / soft (blocks until destroyed) / none. cover: full, low (`cover:'low'`, halves chest-high bullets for a unit standing behind), none.

| id | cat | blocks | cover | hp | flam | destructible role |
|---|---|---|---|---|---|---|
| `mod_sandbag_wall` | military | soft | low | 160 | n | the cover backbone; falls to howitzer/tank, zoning dozer eats it (structDmg x4) |
| `mod_sandbag_ring` | military | none | low | 140 | n | gun emplacement ring, crew inside is covered; a crater breaks it |
| `mod_barbed_wire` | military | none | none | 30 | n | lane decor, vehicles crush it for free, AI lane hint |
| `mod_steel_jacks` | military | soft | none | 420 | n | tank-stopper, AT or sapper only; vehicles path around |
| `mod_bunker` | military | full | full | 900 | n | destroy-objective target; stage 1 cracks at 60% |
| `mod_watch_post` | military | soft | full | 320 | y | tall perch decor; falls to MG fire, fine sniper bait |
| `mod_radar_dish` | military | full | full | 450 | n | destroy objective; spins; dies in sparks, others re-aim in panic |
| `mod_ammo_dump` | military | full | full | 120 | y | explosive r5 dmg 140, chain with drums |
| `mod_fuel_drums` | military | soft | low | 40 | y | explosive r3 dmg 60, chain |
| `mod_field_hq` | military | full | full | 220 | y | kill_general site, tent flap, burns |
| `mod_crate_stack` | military | soft | low | 120 | y | cover; the Parcel sits on one; M1 dummy base |
| `mod_depot_core` | military | full | full | 2500 | n | defend_core structure, team prop, 3 damage stages |
| `mod_office_block` | urban | full | full | 1500 | n | landmark (4-circle rect footprint), rubble stage, edges only |
| `mod_shopfront` | urban | full | full | 700 | n | capture sites (cafe, bank variants), M2 facade collapse |
| `mod_apartment` | urban | full | full | 1000 | n | block filler, 4 variants |
| `mod_parking_deck` | urban | full | full | 1200 | n | capture point, ramp terrain |
| `mod_parked_car` | urban | soft | low | 140 | y | burns then pops (r2.5, 35 dmg); vehicles shove it |
| `mod_jersey_barrier` | urban | soft | low | 300 | n | road control; tanks crush |
| `mod_traffic_cone` | urban | none | none | 5 | n | roadworks gag, scatters with a confetti puff |
| `mod_streetlamp` | urban | none | none | 60 | n | decor, topples |
| `mod_billboard` | urban | soft | full | 250 | y | tall cover, pictogram only (no letters), edge rule |
| `mod_fountain` | urban | full | low | inf | n | campus hard cover |
| `mod_garden_hedge` | urban | soft | low | 40 | y | suburb cover, burns |
| `mod_lawn_gnome` | urban | none | none | 5 | n | pure gag, shatters to confetti |
| `mod_container` | industry | soft | full | 260 | n | stack of two = cover maze; harbour |
| `mod_crane` | industry | full | full | 800 | n | destroy objective, edges only |
| `mod_fuel_tank` | industry | full | full | 500 | y | silo; explosive r8 dmg 200, chains pipeline |
| `mod_pipeline` | industry | soft | low | 200 | n | long low cover, steam leaks cosmetic |
| `mod_hangar` | industry | full | full | 1800 | n | airfield landmark, roof stage |
| `mod_parked_plane` | industry | full | full | 300 | y | static plane, burns |
| `mod_rail_car` | industry | full | full | 400 | n | row cover; variant 2 is a fuel car (explosive r5 dmg 120) |
| `mod_signal_gantry` | industry | none | none | 100 | n | decor, VIP march marker |
| `mod_dam_gate` | industry | full | full | 1200 | n | destroy target (team prop), spillway visuals |
| `mod_pylon` | industry | full | none | 500 | n | destroy target, lattice (bullets pass), sparks |
| `mod_conveyor` | industry | none | low | 150 | n | animated belt, factory decor |
| `mod_wreck` | misc | soft | low | inf | n | spawned by M17e on a vehicle death, smokes, capped decay |
| `mod_bridge_pier` | misc | full | none | inf | n | piers under the deck (deck is terrain) |
| `mod_hay_bale` | misc | soft | low | 60 | y | rural cover, the roadworks cow stands here |

## 6. The nine missions

### 6.0 Mechanic ladder, difficulty curve, helper vocabulary

Eight mechanics, one new tell per mission, M9 teaches nothing and combines everything. Finales (M3, M6, M9) combine >= 2 earlier mechanics. Star 3 tests only mechanics taught earlier (or none for M1). Eight distinct objective types: eliminate, capture, kill_general, escort, destroy (props, then units by tag), defend_core, survive_waves, protect_vip.

| # | id | objective | NEW mechanic and tell (teaching-beat trigger) | star 3 tests (taught in) | enemy : budget | attempts s1 / s3 | the mechanic-blind bot fails because |
|---|---|---|---|---|---|---|---|
| 1 | `mod_range_seven` | eliminate | RELOAD: ammo pips under shooters, kneel + clack, RELOAD ring (`reload_start`) | thrift (none) | 0.6 | 1.1 / 1.6 | it stands in the open and gets caught reloading |
| 2 | `mod_parking_wars` | capture x3 | COVER: green chevron, "x0.5" on first absorbed hit (`cover_hit`) | ammo thrift (reload, M1) | 0.8 | 1.3 / 2.2 | it camps on the road side of the sandbag |
| 3 | `mod_long_ditch` (finale I) | kill_general | PIN: pushpin drops, crouch, red ring drains (`pin_applied`); combines reload + cover | cover x40 (cover, M2) | 0.8 | 1.8 / 2.8 | it charges unpinned across no-man's-land |
| 4 | `mod_bridge_convoy` | escort | ARMOUR FACES: yellow PLINK "1" on the front, red crunch on side/rear, hull + turret arrows (`armour_plink`) | pin x20 (pin, M3) | 0.9 | 1.9 / 3.0 | it lets AT teams hit the column side |
| 5 | `mod_dish_demolition` | destroy (props + 1 unit) | ARTILLERY: red ring + whistle, crater, min-range hatching (`first_indirect`) | pin x25 on raiders (pin, M3) | 1.0 | 2.0 / 3.2 | it sends howitzers forward and leaves no screen |
| 6 | `mod_depot_mild` (finale II) | defend_core | MINES: amber blinking cone after a 4 s arm (`mine_armed`); combines armour + artillery + pin | flank hits x12 (armour, M4) | 1.1 | 2.4 / 3.5 | it lays mines when the column is already on top |
| 7 | `mod_airport_delays` | survive_waves x5 | AIR + AA: shadow blob + altitude, AIR chip, "ground only" icon on arty (`air_spawn`) | mines x3 (mines, M6) | 1.0 | 2.2 / 3.4 | it builds artillery and rifles into the sky for nothing |
| 8 | `mod_switchyard_nine` | protect_vip | FIRE MISSION: laser dot 2 s + smoke canister arc (`strike_telegraph`) | AA kills x5 (air, M7) | 1.2 | 2.4 / 3.6 | it never calls a strike or uses smoke |
| 9 | `mod_decommission` (finale III) | destroy by tag `prototype` | nothing new; BINGO CARD of all 7 earlier tells | bingo (all 7) | 1.2 | 3.0 / 5.0 | it ignores half the tools and runs out of time |

Pressure curve: enemy cost : player budget 0.6 -> 1.2, act 1 about 0.6-0.8, act 2 0.9-1.1, act 3 1.0-1.2; autofill bot <= 60% in act 1, <= 40% in acts 2-3 (ER8); every mission has a counter-bot band and a "reference" army winning >= 60%. Median human first-try win about 80% M1 declining to about 45% M9.

Helper vocabulary (closed set named in the plan: `usedMechanic(id,n)`, `suppressed(n)`, `noLoss(defs)`, `thrift(par)`, `underTime(s)`, `shieldsBroken(n)`; unused here: shieldsBroken). Proposed additions (registry append, each with its tracker counter): `shotsAtMost(n)` (player `projectile_launch` count), `airKills(n)`, `keptAlive(def,n)`, `noFriendlyFire()`, `usedAll(ids,n)` (bingo). `usedMechanic` ids and what they count: `reload` (`reload_start`), `cover` (hits reduced by cover), `suppression` (pins applied), `armour` (hits on a side/rear face), `artillery` (indirect-shell kills + craters), `mines` (mine kills), `air_aa` (air kills by AA), `fire_mission` (strikes that hurt at least one enemy).

Common to every mission: star 1 = win, star 2 = win with >= 50% of the army by cost alive, `requiresModules` listed, `firstThreeMinutes` only for M1. Currency in `req`.

---

### M1 `mod_range_seven`: "Range Seven (Please Stay Behind The Yellow Line)" (Act I: Basic Training And Paperwork)
- Objective eliminate, arena `mod_range` medium seed 4, time limit 240 s, par 1,800 req (budget 2,400), attempts 1.1 / 1.6. requires M0 M1 M2 M3.
- Player: Hollowell, roster `rifle_trooper`, `belt_gunner`; ~16-20 units. Enemy: Parcel Rangers practice detail: `courier_runner` x8, `door_knocker` x3, 6 cut-out dummies (decor), style hold, difficulty easy. No boss.
- **Teaches RELOAD** (pips, kneel, RELOAD ring). Tests nothing. Composition question: "how many belts?" Right: 8 riflemen + 2 belt gunners staggered; wrong: 6 belts reload together and the Rangers walk in (dead-air + window).
- **Stars:** 2 generic; 3 `thrift(1800)`. First three minutes (teaching beats): (1) placement: "stand riflemen behind the yellow line" drag-line brush; (2) battle start: pips light up, radio push-in on Brutus's headset; (3) first reload: freeze 0.5 s, ring highlighted, hint "shoot, step back, reload"; (4) first `door_knocker` closes: "keep 8 u" hint; (5) end: results shows "Reloads: 31, windows exploited: 6".
- **Set-piece `mod_sp_klaxon`:** at t=30 s the range klaxon sounds and 6 cut-outs pop up while couriers sprint in. Camera: low pull-back over the yellow line, 4 s. Announcer: `campaign_mod_range_seven/start`. Stinger: brass-band fanfare in a bucket (new). SFX: klaxon, pneumatic pop-up, hold-music blip.
- **Reward:** Workshop helm `mod_headset` + codex "Field Manual p.1: Magazines And You".
- B: "WELCOME to Range Seven! I have a HEADSET! I have a CLIPBOARD! I have no idea what either one does, over!" P: "Brutus, you are broadcasting on the cafeteria channel. Eight rounds per rifle. When the rifle clicks, is the soldier disarmed, or merely thoughtful?" C: "The magazine runs out at the worst moment. I said so at the last briefing. This was the last briefing."
- Win (B): "TARGETS DOWN! The yellow line was respected! Mostly by us!" Lose (C): "You reloaded in the open. I wrote 'reload' on your hand. The ink ran."

### M2 `mod_parking_wars`: "Parking Structure, Level Three (Is Free)"
- Objective capture 3 points (bank, cafe, parking deck), arena `mod_blocks` medium seed 7, 300 s, par 2,400 (budget 3,000), attempts 1.3 / 2.2. requires M9 (cover/LOS), M14 capture.
- Player: Hollowell, roster `rifle_trooper`, `belt_gunner`, `field_medic`. Enemy: Parcel Rangers holding two points: `courier_runner` x8, `door_knocker` x4, `pack_mule` x2, then two counter-waves of 4 couriers; style hold/guard.
- **Teaches COVER.** Tested: reload (ammo thrift). Composition question: "which side of the sandbag?" Right: medic behind the rifle line, MG on the deck over the bonnet; wrong: everyone beside the cover with their flank open (red flanked tick).
- **Stars:** 3 `shotsAtMost(520)` ("cover makes you patient").
- **Set-piece `mod_sp_shutters`:** at 25 s a script `prop` event drops the shopfront awning and opens a street lane. Camera: drone-top pan down the avenue, 4 s. Announcer: `cover` category line. Stinger: parking-meter chime sting. SFX: shutter rattle, ticket printer.
- **Reward:** Quick unlock arena `mod_suburb` + codex "Cover: A Bag, Filled With Opinion".
- B: "PARKING STRUCTURE! Level three is FREE! Level three is also where the BATTLE is! Take the cafe, the bank and a space!" P: "A sandbag is a bag filled with something the bag is not. We are asked to hide behind it. Is the bag grateful?" C: "They will come at the corners. Hide behind the thing they cannot see through, not the thing you cannot see through. A subtle difference. Fatal."
- Win (P): "Three points taken and one valet ticket. Is this what victory costs?" Lose (B): "THEY TOOK THE CAFE! The coffee was good! It is a tragedy of CAFFEINE!"

### M3 `mod_long_ditch`: "The Long Ditch (Sponsored By Shovels)" (Act I finale)
- Objective kill_general (`postmaster_corvid`, binding), arena `mod_trench` medium seed 3, 360 s, par 3,300 (budget 4,200), attempts 1.8 / 2.8. requires M3 pins, M14.
- Player: Hollowell, roster `rifle_trooper`, `belt_gunner`, `quiet_marksman`, `field_medic`, `pocket_grenadier`; `lanyard_major` fixed. Enemy: Parcel Rangers dug in: `courier_runner` x10, `door_knocker` x4, hired `mortar_crew` x2 (Sandbag Mutual), general `postmaster_corvid` in the dugout; style hold, difficulty normal.
- **Teaches PIN.** Combines reload (belt discipline) + cover (the ditch). Tested: cover. Composition question: "who pins, who flanks?" Right: 2 belt gunners pin the trench lip, grenadiers and riflemen flank through the corner crater, marksman takes the Postmaster; wrong: all-in frontal (pins on you from the mortars, flanks open).
- **Stars:** 3 `usedMechanic('cover', 40)`.
- **Set-piece `mod_sp_whistle`:** at 45 s the whistle blows and the whole trench pops up for a volley, then every pin lands. Camera: lateral track along the trench from above, 5 s. Announcer: `pin` category. Stinger: brass-march sting with a whistle. SFX: whistle, mass pushpin thunk.
- **Reward:** Workshop weapon `mod_belt_gun` (custom soldier mg class unlocked) + title "Pinned Down (Professionally)".
- B: "THE LONG DITCH! Sponsored by SHOVELS! Pin them, flank them, and bring the colonel home for tea!" P: "Lanyard-Major Tack believes every problem is a map. A pin is the map's way of saying stay. What does a soldier feel when he is stuck to a map?" C: "The belt gunner will run dry exactly when the line moves. I counted the belt. It is forty."
- Win (B): "THE POSTMASTER IS DOWN! The mail is delayed! Indefinitely! Which is... normal!" Lose (C): "You advanced while they were not pinned. The pin was on the map. Not on them."

### M4 `mod_bridge_convoy`: "The Bridge Is Narrower Than The Brochure" (Act II: Combined Arms)
- Objective escort (the Parcel truck, a `repair_truck` VIP, reach the far end), arena `mod_bridge` medium seed 6, 270 s, par 3,000 (budget 3,600), attempts 1.9 / 3.0. requires M8 vehicles, M14 escort, M12 `editTerrain`.
- Player: Grommet, roster `line_tank`, `scout_runabout`, `tube_trooper`, `repair_truck` (VIP fixed). Enemy: Hollowell + hired AT: `rifle_trooper` x10, `belt_gunner` x2, `tube_trooper` x5 (4 ambush at the far end sides), `stopper_gun` x2; style hold/guard, difficulty normal.
- **Teaches ARMOUR FACES.** Tested: pin (belt gunners suppress AT teams). Composition question: "which end of the tank?" Right: tanks lead face-on, runabouts bait the ambush teams into the open so the tubes behind the tanks can answer, belt gunners pin the bank; wrong: tanks rush off the bridge and park side-on at the exit, where four tubes are waiting on the flank.
- **Stars:** 3 `suppressed(20)`.
- **Set-piece `mod_sp_span`:** mid-bridge a mortar cuts the centre span to one lane (`editTerrain`). Camera: column dolly, low, 5 s. Announcer: Plato's "what is a tank for" slot. Stinger: slow tuba sting. SFX: tread rumble, PLINK volley, plank crack.
- **Reward:** Era mutator `mod_jam_session` + title "Convoy Commander".
- B: "THE BRIDGE! One lane! One convoy! One enormous truck holding one very small Parcel!" P: "A tank. A box that moves toward the problem so that the problem bounces off. What is it for, if the problem is also a tank?" C: "The front is thick. The side is not. The rear is a polite suggestion. Face the problem. I said face. Nobody says face on a bridge."
- Win (B): "ACROSS! The bridge is narrower than the brochure and wider than the tank! Barely!" Lose (P): "The bridge now has a gap. Does a gap have a purpose? It seems to be a river."

### M5 `mod_dish_demolition`: "Radar Dishes Are Just Large Ears" (Act II)
- Objective destroy: 4 `mod_radar_dish` + `final_notice` (unit), eliminate not required; arena `mod_desert` medium seed 9, 360 s, par 3,600 (budget 4,500), attempts 2.0 / 3.2. requires M10 artillery/craters, M12 structDmg.
- Player: Sandbag Mutual with escort, roster `heavy_howitzer`, `mortar_crew`, `rifle_trooper`, `belt_gunner`. Enemy: Bureau guards and raiders: `clipboard_guard` x6, `courier_runner` x8, `scout_runabout` x3, bunkers x2, boss-lite `final_notice` guarding the dishes (shells the player's artillery from 110 u, cannot hit inside 35 u); style hold, raids on a timer.
- **Teaches ARTILLERY.** Tested: pin (pin the raiders at the guns' minimum range). Composition question: "what stands at minimum range?" Right: riflemen + belt gunners ring the howitzers, mortars forward, runners (a few riflemen on the flank) go for the Final Notice's dead zone; wrong: all artillery, no screen.
- **Stars:** 3 `suppressed(25)`.
- **Set-piece `mod_sp_shellcam`:** when the first dish dies the others swing to face the sky and pulse. Camera: shell-cam from muzzle to crater, 5 s. Announcer: `artillery` category. Stinger: low timpani and a ping. SFX: shell whistle, crater thud, radar blip.
- **Reward:** Workshop offhand `mod_binoculars` + Quick unlock arena `mod_roadworks`.
- B: "RADAR DISHES! Giant ears! We shall be rude and shout into them with a HOWITZER!" P: "The howitzer cannot hit what is near. It can only hit what is far. Is that a weapon, or an opinion?" C: "The Final Notice will answer in kind. Its shells are larger. Its postage is higher. Do not stand where the ring shows."
- Win (C): "The dishes are quiet. The Final Notice goes unsent. Somewhere, a form is pending." Lose (B): "They reached the guns! The guns were CLOSE! That is the whole problem with close!"

### M6 `mod_depot_mild`: "The Depot Of Mild Importance" (Act II finale)
- Objective defend_core (`mod_depot_core`, 2,500 hp), arena `mod_harbour` medium seed 12, 330 s, par 4,200 (budget 5,200), attempts 2.4 / 3.5. requires M11 mines, M8, M10.
- Player: mixed (Sandbag + Grommet), roster `sandbag_sapper`, `stopper_gun`, `tube_trooper`, `rifle_trooper`, `belt_gunner`, `mortar_crew`, `field_medic`; 6 pre-laid mines on the road. Enemy waves of Grommet: W1 `scout_runabout` x4 + `tube_trooper` x4; W2 `line_tank` x2 + `troop_tin` x2; W3 boss `land_barge` + `line_tank` x2; W4 `troop_tin` x3 + `tube_trooper` x6; style advance.
- **Teaches MINES.** Combines armour + artillery + pin (finale). Tested: armour. Composition question: "where do mines go?" Right: lay early at the road choke, stoppers at 45 degrees behind, mortars on the column queue; wrong: lay mines as the column arrives (arm delay 4 s) or on the quay where the barge turns.
- **Stars:** 3 `usedMechanic('armour', 12)`.
- **Set-piece `mod_sp_barge`:** the Land Barge shoulders through a container stack. Camera: slow push-in on the hull, 6 s. Announcer: boss slot. Stinger: tuba swell + ship horn. SFX: ship horn, container crunch, treads.
- **Reward:** Workshop helm `mod_hard_hat` + title "Mine Host".
- B: "THE DEPOT OF MILD IMPORTANCE! Nothing valuable inside! They want it so BADLY! A LAND BARGE is coming! A BOAT! ON LAND!" P: "A mine is a promise: you go no further. Whose promise is it, and does it know it is a promise?" C: "Arming takes four seconds. I told the sapper to lay them early. He laid them the exact moment the column arrived."
- Win (B): "THE BARGE IS AGROUND! ON LAND! It is STILL a boat! It is just a sad boat!" Lose (P): "The depot fell. Its importance was, as stated, mild."

### M7 `mod_airport_delays`: "Airport Delays (All Of Them)" (Act III: The Whole Circus)
- Objective survive_waves x5, arena `mod_airfield` large seed 5, 420 s, par 4,000 (budget 5,000), attempts 2.2 / 3.4. requires M7 air, AA guarantee in armygen and campaign validation.
- Player: Hollowell + Cirrus, roster `rifle_trooper`, `belt_gunner`, `flak_cannon`, `recon_drone`, `sandbag_sapper`, `field_medic`; `chief_windsock` not yet. Enemy waves (Parcel + Cirrus): W1 `parcel_drone` x4 + `courier_runner` x4; W2 `delivery_van` x3; W3 `whirly_gunship` x2; W4 `delivery_van` x3 + `parcel_drone` x8; W5 `whirly_gunship` x3 + `lift_whirly` (5 troopers).
- **Teaches AIR + AA.** Tested: mines (vans on the taxiways). Composition question: "what can your artillery not see?" Right: 2-3 flak under the control tower umbrella, belt gunners for drones, sapper mines on the two taxiways; wrong: mortars and howitzers pointed at the sky ("ground only" icon).
- **Stars:** 3 `usedMechanic('mines', 3)`.
- **Set-piece `mod_sp_flyover`:** W3's lead gunship rakes the camera line across the runway lights. Camera: ground track, tilt up to flak tracer, 4 s. Announcer: `air` category with Cassandra's risk-assessment slot. Stinger: rotor-chop whoosh. SFX: rotor loops, flak pops.
- **Reward:** Era mutator `mod_airmail` + Workshop face `mod_aviators`.
- B: "AIRPORT DELAYS! All flights cancelled! Replaced by GUNSHIPS! Enjoy your layover!" P: "The mortar cannot hit what flies. Why does it keep looking up in hope?" C: "I have filed a risk assessment on the helicopter. It is already overhead. The form has a section for 'already overhead'. I filled it in."
- Win (P): "Fifty-three flights delayed, none landed. A perfect record." Lose (B): "THE TERMINAL FELL! The duty-free survives! Priorities!"

### M8 `mod_switchyard_nine`: "Switchyard Nine (Please Mind The Gap)"
- Objective protect_vip (`claims_adjuster`, walks the yard, reach the signal box, then hold), arena `mod_railyard` large seed 8, 300 s, par 4,600 (budget 5,600), attempts 2.4 / 3.6. requires M13 `call_strike` + smoke, M9 smoke occluder `[smoke is cuttable: no star depends on it]`.
- Player: Sandbag + Hollowell + Cirrus AA, roster `mortar_crew`, `salvo_truck`, `rifle_trooper`, `belt_gunner`, `flak_cannon`, `field_medic`; `chief_windsock` fixed escort. Enemy: Bureau and Parcel: `clipboard_guard` x8, `courier_runner` x10, `door_knocker` x6, `parcel_drone` x8 (waves 2-3), `scout_runabout` x2.
- **Teaches FIRE MISSION.** Tested: air (drones swarm the observer). Composition question: "how much of the plan is smoke?" Right: strikes on the shield wall (aoe ignores arcs), smoke to cross the open sidings, flak on the observer's flank; wrong: strikes on your own line (friendly hits) or no smoke.
- **Stars:** 3 `airKills(5)`.
- **Set-piece `mod_sp_freight`:** the first strike ignites fuel car 3 and the chain runs down the siding. Camera: wide pull-back following the chain, 5 s. Announcer: `fire_mission` category. Stinger: percussion roll. SFX: chain explosions, steam.
- **Reward:** Workshop back `mod_radio_pack` + codex "Fire Missions And Other Opinions".
- B: "SWITCHYARD NINE! Mind the gap! Mind the trains! Mind the OBSERVER, who has the radio and no armour!" P: "A strike is a sentence delivered from a distance. It arrives after the speaker has stopped being certain. Is the observer certain?" C: "Smoke hides you from the guns. It also hides you from your own people. I have seen both outcomes. The same afternoon."
- Win (C): "The observer is intact. The freight is not. The ledger balances, loosely." Lose (B): "THEY LOST THE OBSERVER! The man with the radio! Now nobody knows where anybody is! Which was already true!"

### M9 `mod_decommission`: "Decommissioning Day (Please Hold For The Prototype)" (Act III finale)
- Objective destroy by tag `prototype` (`zoning_dozer`, `mobile_briefing`, `filing_cabinet`), arena `mod_dam` large seed 2, 480 s, par 6,500 (budget 8,000), attempts 3.0 / 5.0. requires every module of the era.
- Player: any non-Bureau units, 16 types max; `lanyard_major` and `chief_windsock` free. Enemy: phase 1 (0 s) `zoning_dozer` + `clipboard_guard` x6; phase 2 (60 s) `mobile_briefing` (summons 4 guards every 25 s); phase 3 (120 s) `filing_cabinet`; 4 pylons feed it.
- **Teaches nothing**; the finale of Act III combines all seven. Composition question: "which prototype dies to which tool?" Right: dozer to mines and rear shots, briefing room to strikes and the rear door, cabinet to flak; wrong: one all-purpose blob.
- **Stars:** 3 `usedAll(['cover','suppression','armour','artillery','mines','air_aa','fire_mission'],1)` (the Bingo Card). 
- **Set-piece `mod_sp_spillway`:** the third prototype falls and the dam's 4 gates open, the Parcel is revealed on the top pylon. Camera: crane rise up the dam face, 6 s. Announcer: unique finale slot. Stinger: big victory funk. SFX: spillway roar, rubber-stamp STAMP.
- **Reward:** Quick unlock faction `bureau` + arena `mod_campus` + title "Decommissioned" + the era-independent payoff card (section 10).
- B: "DECOMMISSIONING DAY! Three prototypes! One dam! A PARCEL on the pylon! I have NO idea! I LOVE it!" P: "The Bureau built these machines, then funded their destruction, then billed us for the cleanup. Is that circular, or merely accounting?" C: "The briefing room has fourteen chairs. Do not accept the invitation. I have seen the slides. They say we are winning."
- Win (P): "The Parcel is open. Inside: one ticket, one note, one sandwich. We sit with that." Lose (C): "You were put on hold. The hold was indefinite. I said so."

### 6.10 Teaching beats (CU5: first-sight, one per mechanic; `seen.beats[id]` per era; skippable)

| mission | beat id / trigger | voice | text (<= 22 words) | hint under the bubble |
|---|---|---|---|---|
| M1 | `mod_b_reload` / `reload_start` | Plato | "The rifle is empty. Is it still a rifle, or merely a stick with opinions?" | "Ammo pips under a soldier show the magazine. Empty: kneel and reload." |
| M1 | `mod_b_window` / `first_contact` | Brutus | "A CLOSER! Eight units or less and he wins! Keep your DISTANCE!" | "Door-to-Door Closers are deadly inside 8 units. Back off and shoot." |
| M2 | `mod_b_cover` / `cover_hit` | Cassandra | "That hit was halved. The bag took half. I mention it because the bag deserves credit." | "A green chevron means cover: hits from the front do half damage. Flanked units lose it." |
| M3 | `mod_b_pin` / `pin_applied` | Brutus | "A PUSHPIN! He is STUCK to the map! He cannot advance! He cannot aim!" | "Suppressed units duck, cannot advance and shoot wide. Pin first, then flank." |
| M4 | `mod_b_plink` / `armour_plink` | Plato | "Plink. The rifle did one point. Is that damage, or a compliment?" | "Tank fronts shrug off rifles. Hit the side or rear, or bring tube troopers." |
| M5 | `mod_b_arc` / `first_indirect` | Cassandra | "That shell is in the air. In four seconds it will be on something. Not on anything close." | "Artillery cannot hit inside its minimum range. Screen it. Craters change the ground." |
| M6 | `mod_b_mine` / `mine_armed` | Plato | "The cone is blinking. It has decided. Do not stand where it has decided." | "Mines arm after 4 seconds. Lay them early, off the lane your own units use." |
| M7 | `mod_b_air` / `air_spawn` | Brutus | "AIRCRAFT! Overhead! Your mortars cannot see them, which is unfortunate for the mortars!" | "Air units fly over artillery. Flak, machine guns and rifles can hit them." |
| M8 | `mod_b_strike` / `strike_telegraph` | Cassandra | "A laser dot. In two seconds, everything under it files a complaint. Do not stand under it." | "The adjuster calls a strike on a spot. Smoke hides units from direct fire." |

### 6.11 Replay value, assists and difficulty knobs

- **Star 3 is a different question every mission** (thrift, ammo discipline, cover soak, pin count, flank hits, mines, AA kills, bingo), so a second run is a different army, not a faster run of the first.
- **Two valid answers per mission**: each mission's `reference` army and its `counter` bot use different recipes (M2: cover-heavy vs grenade-aggressive; M6: mine-heavy vs gun-line), both win >= 60% so neither is "the" solution.
- **Assist ladder (CU15, no star cost):** after 2 defeats the briefing offers the `reference` army; after 4 it also reveals the enemy composition and the failing detector from section 6.12; difficulty names are neutral (Rookie / Regular / Veteran) with era flavour via `getTB`.
- **Bingo Card:** results show seven stamps (cover, pin, armour, artillery, mines, AA, fire mission) lit by use across the campaign; lifetime fill is shown on the map; M9 star 3 asks for a full card in one battle.
- **Mutators change the question:** `mod_jam_session` makes reload discipline matter in M1-M3 replays; `mod_airmail` turns M7 into a dodge puzzle; shared Moon Gravity becomes a Rolling Barrage joke.
- **Modes:** Survival uses the five bosses; Daily draws Modern from a separate era stream with tactics-chips ("pin, flank, finish") in the daily share string; Puzzles are the lowest-friction replay.

### 6.12 Results lessons (detectors tied to scout codes; every template true in context)

| detector / scout code | lesson shown (<= 22 words) |
|---|---|
| `reloaded_in_open` | "7 riflemen were caught reloading with no cover within 5 units. A magazine is a promise. Keep it behind something." |
| `flanked_in_cover` | "Your cover held for 40 seconds and then they walked round it. A wall has a back." |
| `no_pins` | "You never pinned anyone. They advanced at full speed the whole way. Belt gunners exist for this." |
| `frontal_tank` | "Rifles bounced off the tank 61 times. The tank noticed 0 times. Try the side." |
| `no_anti_armor` (scout) | "Scouts report armour and your army owns no way through the front. Bring tube troopers or an AT gun." |
| `minrange_loss` | "Your howitzer lost to 3 couriers who ran under its minimum range. The gun was fine. The gun was alone." |
| `late_mines` | "Your mines armed after the column rolled over them. Arming takes 4 seconds. Time is a mine too." |
| `no_anti_air` (scout) | "They brought aircraft and you brought mortars. Mortars cannot see up. Flak can." |
| `friendly_strike` | "3 of your own fell to your own strike. The adjuster says the map was right and the people moved." |

## 7. Six puzzles (hand-placed enemy, restricted roster, small budget, free retries; stored solution wins in 3 seeds)

| id | title | taught mechanic | setup | the trick |
|---|---|---|---|---|
| `mod_hold_still_dear` | Hold Still, Dear | pin | 6 `door_knocker` charge across open ground; roster `belt_gunner` x1, `rifle_trooper` x4; arena `mod_range`; budget 800 | the belt gunner must open fire first and pin the lead pair; riflemen behind the sandbag line fire on pinned targets; bonus: lose no unit |
| `mod_plink_plink_crunch` | Plink, Plink, Crunch | armour faces | 1 `line_tank` facing east; roster `tube_trooper` x3, `rifle_trooper` x6; arena `mod_desert`; budget 900 | the rifles are bait that keep the hull facing; the tubes go to the far side and fire from 90 degrees; bonus: tank down in 20 s |
| `mod_too_close_for_comfort` | Too Close For Comfort | artillery minimum range | 8 `courier_runner` rush a gun; roster `heavy_howitzer` x1, `rifle_trooper` x4, `belt_gunner` x1; arena `mod_blocks`; budget 1100 | the howitzer must be deep and screened; the screen kills them before 28 u; bonus: a crater kills 3 at once |
| `mod_mind_the_gap` | Mind The Gap | mines | 3 `line_tank` column through a 7-cell choke; roster `sandbag_sapper` x2, `stopper_gun` x1, `tube_trooper` x2; arena `mod_bridge`; budget 1000 | lay mines early, the first tank stops in the field, the stopper gun finishes the trapped tank; bonus: lose no unit |
| `mod_cassandra_was_right` | Cassandra Was Right About The Helicopter | air + AA | 1 `whirly_gunship` + 2 `parcel_drone`; roster `flak_cannon` x1, `rifle_trooper` x6, `mortar_crew` x2; arena `mod_airfield`; budget 1000 | the mortars cannot fire at air (a trap); flak behind rifle bait; bonus: lose no gun |
| `mod_smoke_signal` | Please Hold, Your Call Is Important | fire mission | 6 `clipboard_guard` in a wall; roster `claims_adjuster` x1, `pocket_grenadier` x3, `rifle_trooper` x4; arena `mod_trench`; budget 1100 | shields block rifles front-on; one strike plus three grenades break the wall; smoke covers the crossing; bonus: no friendly hits |

Random legal armies win <= 15%, star 3 <= 5% (ER9); every puzzle fires its taught mechanic in the stored solution.

## 8. Six god powers (slots fixed: 1 quick, 2 big, 3 area control, 4 heal/repair, 5 status, 6 summon)

| slot | id | name | effect family | telegraph | cooldown class | tooltip joke |
|---|---|---|---|---|---|---|
| 1 | `mod_ricochet_request` | Ricochet Request | lightning bolt + chain (aoe 3, chain 4) | thin red laser dot, 0.35 s | short (6 s) | "A single round that has been through a lot. Authorised by the Intern." |
| 2 | `mod_wrong_coordinates` | Wrong Coordinates | meteor (2 s telegraph, aoe 5, crater) | coloured smoke flare column, 2 s | long (20 s) | "Airstrike called in by Zeus's intern. Accuracy: within the postcode." |
| 3 | `mod_rolling_barrage` | Rolling Barrage | earthquake (5 s shake, aoe 14, staggers, damages props) | whistling shell shadows spreading | very long (30 s) | "Artillery that arrives in instalments, each with an apology." |
| 4 | `mod_field_hospital` | Field Hospital | heal wave (organics +60, machines repaired) | green smoke ring, 0.6 s | medium (25 s) | "One medic, forty bandages and the same pen for everyone." |
| 5 | `mod_please_hold` | Please Hold | wine rain (tipsy: random move 40%, damage x0.6, 8 s) | ringing telephone pictogram | long (30 s) | "Plays a pan-flute rendition of something enemy soldiers cannot name but will not stop humming." |
| 6 | `mod_express_delivery` | Express Delivery | raise chickens (6 `courier_runner` for the caster) | parachute shadow, 0.6 s | short (15 s) | "Arrives in a box marked THIS WAY UP. It was not up." |

**The intern gag.** The intern is offstage and never appears as a unit, portrait or `who`. Power tooltips are signed in a small footer ("Requisition approved by: the Intern (Zeus's)."); a cooldown that finishes reads "Intern has reopened the line"; the unavailable-power toast reads "The Intern is on his break. Please hold." Arrival card and chooser caption name him once each.

## 9. Two era mutators and twelve achievements

**Mutators** (mapped to existing params):
- `mod_jam_session` **Jam Session**: every unit gains the `misfire` ability at 6% ("the gun jams for 1 s and the crew looks at it"); magazine size x1.5 to compensate. Unlock: M4 reward.
- `mod_airmail` **Airmail Is Not Insured**: every 20 s a random parcel strike (2 s telegraph, aoe 6, 40 dmg) lands on a random spot, friend or foe (script `strike` event). Unlock: M7 reward.

**Achievements** (12; all conditions use summary or lifetime stats; ids immutable):
| id | name | condition |
|---|---|---|
| `mod_decommissioned` | Decommissioned | finish the Modern campaign |
| `mod_gold_star_employee` | Gold Star Employee | 27 stars across the nine missions |
| `mod_tourist_class` | Tourist Class | play all 12 Modern arenas |
| `mod_signature_required` (hidden) | Signature Required | win M4 and M8 without the VIP taking any damage in either |
| `mod_pushpin_cushion` | Pushpin Cushion | apply 100 pins, lifetime |
| `mod_plink` | Plink | 50 rounds bounce off armour (damage floor hits) in one battle |
| `mod_please_face_the_other_way` | Please Face The Other Way | 10 side-or-rear hits on vehicles in one battle |
| `mod_mine_host` | Mine Host | 5 vehicles destroyed by mines in one battle |
| `mod_crater_tourism` | Crater Tourism | 25 craters on the field at once |
| `mod_frequent_flyer_down` | Frequent Flyer Down | shoot down 20 air units, lifetime |
| `mod_return_to_sender` | Return To Sender | kill 5 of your own with your own strikes in one battle |
| `mod_quiet_please` | Quiet Please | `quiet_marksman` kills 3 officers or heroes in one battle |

## 10. Comedic engines, the time-travel arc, callbacks

Three engines (Ancient's bureaucratic understatement is NOT primary; forms appear as chrome only):
1. **Comms chaos (headsets, hold music, callsigns, mute buttons).**
   - Brutus: "BRUTUS HERE, over! Over! Is 'over' the one where I stop talking? ...Over!"
   - Plato: "Brutus, you are on speaker. The enemy can hear you. I mention it because they have started to wave."
   - Cassandra: "I have the headset on mute. This was a decision."
   - Brutus: "Say again? I SAID: SAY AGAIN? Copy! Copy WHAT? Nobody has told me what to copy!"
   - Plato: "Callsign Falcon Two requests permission to be called something else. Granted. It is now Beige."
2. **What is it for? (the philosophy of equipment and warning labels).**
   - Plato: "The sandbag. A bag, filled with the thing the bag is not. Discuss."
   - Cassandra: "Risk assessment, helicopter, already overhead. Hazard: gravity. Mitigation: none. Filed."
   - Brutus: "The manual says NOT to use it as a bridge! It is a BRIDGE! Look at it GO!"
   - Plato: "A mine is an argument that has decided to wait."
   - Codex joke style: "Warning: contents under pressure. So is the crew."
3. **Logistics slapstick (traffic, parking, fuel, detours).**
   - Brutus: "A TANK COLUMN stuck behind a COW! The cow has right of way! The cow has always had right of way!"
   - Plato: "Four hundred req of ordnance, and the delay is a roundabout."
   - Cassandra: "The convoy will take the wrong exit. The third time. I drew them a map. They used it as a coaster."
   - Brutus: "PARKING STRUCTURE! Level three is FREE! Level three is also the BATTLE!"
   - Plato: "The fuel truck is late. The war is therefore postponed, or wins by default."

**Time-travel arc.**
- **Arrival card (boarding pass, skippable):** "ARRIVAL: MODERN ERA. Passengers Brutus, Plato and Cassandra were re-routed by Zeus's intern, who selected NEXT ERA instead of NEXT MATCH. Headsets issued. Please hold."
- **Act I (Basic Training And Paperwork):** Brutus gets the headset and clipboard and cannot work either; Plato is on speaker by accident; Cassandra mutes herself. Briefing text is radio-flavoured.
- **Act II (Combined Arms):** Plato's "what is a tank for" run, Cassandra files risk assessments on things already overhead, the traffic gag starts, the Parcel is running through every mission ("the Parcel has been signed for by someone who is not here").
- **Act III (The Whole Circus):** the commentators finally work their headsets and all three go on hold at once; the Bureau's slides appear in Cassandra's briefings; the Parcel is on a pylon in M9.
- **Finale payoff on an era-independent surface (Credits plus the "Eras Cleared" card):** "PARCEL DELIVERED. Recipient: Zeus (on leave). Contents: one return ticket, one sandwich (initialled 'I.'), one note reading 'Sorry about the routing.' Signature: Cassandra, reluctantly." (The intern is never named on this card, only implied.) The same card sits in Credits with a stamped DELIVERED seal and a sticker "Signature required".

**Eight callback pairs** (setup-free is funny cold; gated renders only if its single boolean flag is true).
| id | setup-free line | gated line (flag) |
|---|---|---|
| `cb_lanyard` | Brutus: "A LANYARD! Around the neck! For holding something up! Nobody knows what!" | Plato: "The Terms of Conquest have been laminated again. Now with a lanyard." (`seen:ancient_terms_of_conquest`) |
| `cb_parcel_goat` | Cassandra: "The Parcel will be fine. Parcels are always fine." | Plato: "Another escort. Is the Parcel also secretly a goat?" (`cleared:nile_crossing`) |
| `cb_on_leave` | Brutus: "SOMEONE IS ON LEAVE! The out-of-office reply is THUNDER!" | Cassandra: "Zeus is on leave. Whoever is covering is worse." (`seen:zeus_intervene`) |
| `cb_sponsor` | Brutus: "Today's battle is brought to you by the Parking Structure! Level three is free!" | Brutus: "Pompeii Pizza now delivers by PARCEL DRONE! Still with 20% more ash! Signature required!" (`seen:pompeii_pizza`) |
| `cb_immortal_staff` | Plato: "The Bureau employs ten thousand, give or take." | Plato: "The Immortals would nod." (`seen:immortals_revive`) |
| `cb_chicken_runway` | Plato: "A chicken on the runway. It has right of way." | Cassandra: "I recognise the chicken." (`stat:chickenKills>=1`) |
| `cb_robots` | Cassandra: "I predicted the drones. Someone must have predicted the drones." | Cassandra: "The drones are not the robots. The robots come later. I filed it under later." (`seen:era_scifi`) |
| `cb_gate_dam` | Plato: "A dam gate. A door for water. Who knocks?" | Brutus: "A GATE with no HORSE! No TREBUCHET! Only a SPILLWAY and a sad man with a clipboard!" (`seen:era_medieval`) |

**Loading lines (12 of 20 drafted):** "Issuing headsets. Brutus has one on each ear..." / "Teaching a tank which end is the front..." / "Laminating the Terms of Conquest, again, in a lanyard..." / "Asking the howitzer to look both ways..." / "Calibrating the pushpins to four percent regret..." / "Rerouting the convoy around a cow..." / "Filing a risk assessment on the loading screen..." / "Explaining sandbags to Plato. Retrying..." / "Waiting for a signature..." / "Refuelling the helicopter that is already overhead..." / "Counting rounds. Eight. Always eight..." / "Placing the Parcel gently on a pylon..."

**Kill-feed causes to add (humour in results):** `bullet` (shot, plinked, pinged, popped, tagged), `explosive` (whumped, cratered, mailed a shell, rezoned), `crush` (parked on, rolled over, merged into), `mine` (stepped on a cone, clicked), `air` (overflown, aerial-mailed), `smoke` (lost in smoke), `fall` (bridge too narrow).

## 11. Music and sound direction

Seven tracks (menu, map bed, battle low/mid/high, victory, defeat). Spy-jazz and funk-march groove; synth/groove picks, not a trailer orchestra; every battle track passes the loop check; sources searched on the allowed hosts under CC0 / CC BY with synth beds as fallback.
| track | mood / tempo | instrumentation adjectives |
|---|---|---|
| menu: "Tabletop Briefing" | jaunty, conspiratorial, 108 bpm | brushed snare, upright bass, vibraphone, muted trumpet, a typewriter hit on the bar |
| map bed: "Hold Music (Extended Cut)" | lounge, plinky, 92 bpm | rhodes, light bossa drums, flute, a phone-line click |
| battle low: "Recon By Fax" | tense-light, 100 bpm | pulse synth, rim clicks, pizzicato strings, bass walk |
| battle mid: "Combined Arms Boogie" | swaggering, 124 bpm | funk drums, brass stabs, wah guitar, slap bass |
| battle high: "Everyone Has A Radio" | driving, frantic, 146 bpm | snare rolls, brass-band sections, tremolo guitar, siren synth |
| victory: "Stamp Of Approval" | triumphant, 112 bpm | brass fanfare, rubber-stamp percussion, cymbal swell |
| defeat: "Please Take A Number" | deflating, 70 bpm | tuba, bassoon, elevator vibes, trombone wah-wah slide |

Stingers (per mission, 9 + 3 shared): bucket fanfare, meter chime, whistle march, tuba, timpani ping, tuba+horn, rotor chop, percussion roll, victory funk.

Twelve hot sound families (what they should feel like):
1. **Rifle pop**: short, dry, toy-box pop, 0.15-0.25 s, six variants with pitch jitter, never a roar.
2. **MG stutter**: tight 4-round burst, "ratatat" with a clack on the last round; mass fire stacks into a crackle bed, never a wall.
3. **Sniper crack**: single sharp crack with a 0.3 s thin tail and a silly "ping" return; distinct from rifle at a glance.
4. **Shotgun thump**: fat, short, bass-heavy double thump; reads as "danger close".
5. **Grenade / mortar whump**: soft whump with a rising whistle before it lands; comic, not a boom.
6. **Howitzer boom + crater**: deep boom, long whistle, a satisfying "thud" and a rolling dirt sprinkle; the biggest sound in the era, ducks music.
7. **Tank cannon and hull rock**: clunk-boom plus a hull creak; PLINK for the bounce.
8. **Engine and tread bed**: a bed (not per-unit loops) that rises with vehicles near the listener; wheels hum, treads clatter, no roar.
9. **Rotor loop and flyby**: chopper whump with a doppler flyby; dense, steady, threatening in a friendly way.
10. **Plink / ricochet**: bright metallic ping with a tiny "boing", the era's laugh sound; always louder than rifle pops on armour.
11. **Reload clacks**: three-part clack-clack-click per shooter; the audio clock players learn.
12. **Pushpin thunk and mine click**: a stationery "thunk" for each pin; a single click, then a three-beep arming tone for each mine.
Plus radio squelch chirps for commentator captions (UI sound, short, never in the gunfire bed).

## 12. Risks and how the design avoids them

1. **Hitscan sniper spam and snipe-duel stalemates.** Marksman has a 3.2 s cycle, mag 5, minimum range 10, and spread jumps when pinned; two snipers cannot see each other past smoke/cover. Fuzz S11/S23 per era.
2. **Suppression stalemate (both sides pinned).** Pins decay over 3 s, banner halves gain, tanks ignore pins, and the stalemate watchdog's "advance" phase unpins units that have not fired in 12 s. ER7 asserts a pinned line loses to a flank >= 60%.
3. **Dead-air from synchronised reloads.** AI staggers reload using per-unit seeded delay; belt gunners reload alone; first-contact and dead-air metrics gated.
4. **Vehicle clog on bridges, gates, harbours.** Vehicle corridors >= 6 cells everywhere vehicles appear, a 6-tank column pass test per arena (W10), `mod_bridge` deck 8 u, `mod_steel_jacks` never on a corridor.
5. **Air units that cannot be killed.** AA guarantee in armygen AND campaign validation (M7); Modern air units are fragile, ground-only weapons carry the "ground only" icon; the termination rule for unhittable remnants is tested in M7's mission by an all-ground player army that must still be able to end the battle.
6. **Artillery craters changing nav every second.** Lazy crater rect rebuild with the rate cap (M10); `final_notice` 9 s and `heavy_howitzer` 7 s cycles; perf scenario "tank column in a city with artillery" is the Modern worst case.
7. **Mines are invisible to the enemy, silent to players.** Amber cone + beep for the owner, "?" blip when a mine is revealed by a trigger, mines never hurt their own team's units at lay time, arm delay 4 s is on screen; the mechanic-blind bot proves it matters.
8. **Armour faces without a readable tell.** Selection card shows hull wedge + turret arrow; PLINK with "1" is the primary tell; ER5 reaction tables per cause (plink vs crunch).
9. **Tone: guns.** Pops, not bangs; no blood; knocked-out pose (spiral eyes, helmet rolls); vehicles hatch-pop with a smoke ring and crew waddling out; gore `auto` = non-graphic; humour at equipment and paperwork, never at people; no real forces, no camo, no flags, no real brands (generic nouns only: howitzer, mortar, flak are plain nouns; "Whirlybird", "Runabout", "Land Barge" are invented).
10. **Palette collisions with real forces.** Lime/charcoal, petrol/orange, terracotta/sand, cyan/white, violet/kraft, silver/red are checked by the VB CIEDE2000 test against the banned list; no three-band layouts; fallbacks: shift Grommet orange to amber `#FFB300`, Hollowell lime to `#A7D129`.
11. **Silhouette budget and part cap.** 20 bespoke of 34 (floor 15); gun1 uses a lite crew of 6 parts, boss `final_notice` has 2 crew; tank1 treads far-LOD prototype before freeze; hum1 gun styles are one AIM row each (7 rows).
12. **Mod-specific unknowns for SIM `[SIM?]`:** `setup` time in the firing gate for gun1, `spawnProp` sandbag via ability (Xerxes' throne precedent; cut to mines-only if declined), `aura resupply` (reload multiplier) as a banner-family param, `summon_on_death` onContact landing for `lift_whirly` (fallback: bail out in hover), `cc_field root` effect on `filing_cabinet`.
13. **Teaching overload.** One new tell per mission, CU5 beats fire on the first sight; mission 1 is truly one idea (reload); star 3 never asks for the mechanic being taught.
14. **Comedy repetition.** Three engines with 15 sample lines, callbacks flagged setup-free vs gated, results lines per mission, announcer categories for each tell; ER11 near-duplicate caps.
15. **Cut ladder friendliness.** If smoke is cut: M8 loses its smoke tooltip, no star depends on it. If `spawnProp` sandbags are cut: sapper keeps mines. If Quick-only arenas shrink: `mod_suburb`, `mod_roadworks`, `mod_campus` drop first, mission arenas never. Props to 34 drops `mod_conveyor`, `mod_streetlamp`, `mod_lawn_gnome`, `mod_hay_bale`.
