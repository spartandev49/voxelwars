# Sci-Fi era, proposal A: "spectacle and silhouettes first" (CREATIVE DIRECTOR, Sci-Fi, 2026-10-08)

Read first and obeyed: `e.md`, `plan.md` v3.1 (sections 1, 4, 5, 7, 8, 10, 11, 13), `traceability.md`, maps 02/03/05/06/07; tone, density and structure copied from the Ancient `stats.js`, `arenas.js`, `props/catalog.js`, `campaign.js`/`campaign_text.js`, `humor/units_text.js` (read 12+ units), `announcer.js` (categories), `ui_text.js`, `puzzles.js`, `survival.js`, `wave_names.js`, `comedy_report.md`, `spec/humor.md`. Method (angle A): everything below was designed from what the player SEES at the default camera (yaw -0.7, pitch 0.65, units ~40 px tall), then the numbers were fitted to the picture, not the other way round. Ids are `lower_snake`, <= 24 chars, unique against the Ancient 43 and prefixed `sf_` wherever a noun could collide. Currency is the **erg** (a very small amount of energy and a very large amount of paperwork); `fmtCost` shows "ergs". Everything is fictional and toy-box: no marines, no xenos, no sabres, no walkers by name, no real brands, no hull numbers, no flags.

## 1. Conceit, tempo, camera, chrome, sound, signature, never

**Conceit (one sentence).** A drive-in-movie future where six factions of glowing toy-box hardware fight over a repossessed Moon, every weapon has a hum, a colour and a warranty, and the three commentators, delivered here by Zeus's intern holding the time remote upside down, call it like a trailer for a film nobody greenlit.

**Tempo: "bubble, then body".** Every fight is two beats. Beat one: bullets, beams and acid pop the shield bubble (a satisfying visible event). Beat two: a 3-second window in which the unit is a normal squishy unit. Then it hides and the bubble regrows. So fights have a pulse (pop, punish, retreat, regrow) where Ancient fights have a shove. Numbers for the feel sheet and ER27: first contact 8-12 s after deployment (arena zones 40-60 u apart), full battle 70-105 s, median engagement distance 18-26 u (rifle 22, MG 24, hover cannon 28, beam 44, artillery 58 with min range 12), infantry speed 2.6-3.6 u/s (Ancient hoplite 2.6), hover 4.5-6.0, mechs 1.6-2.2, blink 12 u in 0.15 s, air layer 3-8 u above ground. Kill rate is bursty: shield pops produce kill clusters 1-3 s later. Speed distribution is bimodal (blink/hover/buggy vs mech/artillery) and vertical spread is the highest of all four eras: that is the fingerprint that separates Sci-Fi from Modern (Modern owns cover, suppression, mines; Sci-Fi owns bubbles, hover, air, blink, cloak, EMP, orbital).

**Scale and tempo table (W11, feeds the feel sheet and ER27).**

| class | engagement range (u) | speed (u/s) | height / altitude (u) | feel |
|---|---|---|---|---|
| infantry (hum1) | 20-26 | 2.6-3.6 | 2.4-3.4 | bubble, burst, reload gap |
| snipers and beams | 44 | 2.6 | 3.0 | visible lock line, one decisive shot |
| hover tanks and bikes | 28 | 4.5-6.0 | 2.0-3.0 | flank over liquid, EMP-fragile |
| air (drones, wyverns, manta) | 14-20 | 4.0-5.5 | altitude 3-8 | shadow blobs, flak bait |
| mechs and monsters | 6-30 | 1.6-2.2 | 5-9 (boss cap < 9.0) | ring-shakes, topple deaths |
| artillery | 58, min 12 | 1.8 | 2.0 | craters on causeways |
| blink | 12 hop | 12 u in 0.15 s | | both ends telegraphed |

Arena scale: medium 96 u, large 128 u; deployment zones 40-60 u apart; first contact 8-12 s after Deploy; no armies start in range.

**Camera.** Default camera unchanged; no tall building inside the fight corridor (W8 rule, towers on the edges). Air units sit at 3-8 u with a shadow blob that shrinks and fades with altitude (R4) so they never pop off-frame at the screen edge (`meta.bounds` cull). Set-piece shots (`CameraRig.shot`) go low and wide: crane, pull-back, orbit, boots-to-face, looking up from a pit. Reduce Motion = cut, not dolly.

**Money shots (the picture the whole design serves; each has a tell the screenshot will contain).**
1. Twenty tidy troopers under rivet fire; their bubbles pop in a ripple, hex shards glowing in the team tint, the survivors' domes crack-lit orange at < 25%.
2. Hover tanks skating over a lava lake with orange underglow and soft shadow discs, ground armies stuck on the causeway.
3. Orbital strike: thin cyan telegraph ring, a pencil beam, a white column, a crater with a shock ring, knocked-out troopers in neat piles of stars.
4. EMP: twelve robots freeze mid-sentence with blue arcs crawling over them and little "Please hold" bubbles.
5. A ten-storey friendly mech stepping out of a shopping atrium, the ground ring-shaking under it.
6. Cloak reveal: violet outlines dissolving into units on the first lamp-lit frame.
7. A hive queen on a space station as the window pane goes; the brood puffs out into the stars.

**UI chrome vocabulary (`[data-era="scifi"]`).** "Drive-in cinema mission control": chamfered 8 px panel corners, 1 px neon rim (cyan #35E0FF primary, pink #FF3DA5 secondary, amber #FFC83D warnings), dark glass panels (#0E1424 on #141B33) with a soft projector-cone vignette on the HUD frame, Bungee headings with wide tracking over Rubik body (no new fonts), tabular erg counters, a loading bar that sprints to 99% and then waits politely, radial scan-sweep cooldown rings, selection card with a shield arc above the hp bar plus ammo pips. Campaign map = **star chart projected on a drive-in screen**: cardboard-cutout planets and stations as pins, dashed hyperlanes between them, a tiny car silhouette in the corner (no brand). Briefing = **B-movie poster**: tagline in Bungee, three commentator speech bubbles as cast list. Results = film-credits roll with rating stamps ("Rated G for Glowing"). Chooser caption names the intern; stills are baked at build.

**Sound palette (3 adjectives): humming, crackling, squelchy.** Hum = shields, hover, machines; crackle = beams, EMP, sparks; squelch = goo, acid, spores. Never realistic gunfire; Sci-Fi guns are chunky toy-box "pew" with a body thump.

**Signature mechanic and its on-screen tell: the regenerating shield bubble (M4).** Tell: a hex-ripple dome hugging every shielded unit in the team tint (thin film at 100%, cracked amber hexes below 25%), a bright expanding **pop ring** plus three falling hex shards on break, then a **clockwise recharge sweep** along the base ring while it regrows (delay 3 s, then ~9 points/s). It reads at 40 px and at the far LOD (the dome is an instanced layer, not unit geometry; R3 near dome <= 64, far from `aFx2`). Secondary tells: cloak = dithered shimmer plus a violet rim line; EMP = blue arcs and a stuck spark bubble; blink = afterimage streak and pop ring at both ends; hover = four glow pads, downward glow disc, bob and bank; orbital = cyan ring then white column.

**Gore and knockouts (CU4, `gore: auto`).** Humans are knocked out: a tidy flop, circling stars, an "I'm fine, just horizontal" line, body fades after 6 s. Machines take the violence: sparks, oil puffs, a "powering down" jingle and a topple for mechs. Aliens take goo: lime-green splat, no pain, no screaming (a happy "splorp").

**What this era must NEVER feel like.** (a) Ancient with beams: if the default view is two blobs shoving, the shield economy has failed. (b) Grim, gritty or militaristic: no grey corridors, no camo, no "mission failed" gravitas; the lighting is a toy shop at night. (c) A pastiche of any film franchise: no chin-guard helmeted troopers, no chest-bursting anything, no humming swords, no long-necked quad walkers, no cargo-lift exoskeleton in yellow, no lantern-ring cops. (d) A spreadsheet: every number must have a tell you can see (bubble, rim light, ring, glow). (e) Laser tag in the dark: glow never replaces silhouette; every faction reads in greyscale first.

## 2. Six factions (name, colours, emblem, silhouette, army identity, lore joke)

Colour pairs are chosen for hue AND luminance separation (CVD-safe in greyscale); the team tint is always a glow strip on armour/hull, never the faction base colour. Emblems pass the VB allow-list (no star/cross/crescent, no letters, no three-band layouts).

1. **Tidy Concord** (humans, shield line). Ivory #EEF1EA + lagoon blue #2C8FD8. Emblem: a ring with one dot in it (an orbit being tidy). Silhouette: ROUND: fishbowl helmets, spherical bubble domes, soap-bubble hover hulls, backpack tanks. Army: disciplined shield-and-burst line infantry, hover tanks, orbital strike. Lore joke: "The Tidy Concord owns most of the Moon and all of its opinions about footprints. Officially it is a cleaning service with a very large budget. Its motto is 'Leave no trace' and it means it about trees, rivals and weekends."
2. **Rummage Armada** (human scrap pirates, kinetic). Rust orange #E8601C + soot #2D2A28. Emblem: a sprocket with one bent tooth. Silhouette: ASYMMETRIC: one oversized shoulder, exhaust stacks, exposed pipes, mismatched patch panels, a cart with rockets. Army: cheap, fast, loud; rivets, rocket salvos, EMP gadgets, buggies. Lore joke: "The Rummage Armada is every ship ever sold for parts, reassembled by the parts. Nobody has the manual; everybody has the cover. Its flag is a bent sprocket because the straight one was sold."
3. **Courtesy Systems** (cheerful machines, EMP-vulnerable). Brushed steel #AAB4C0 + signal magenta #F0287F. Emblem: a lens inside a square. Silhouette: BOXY: stacked-box bodies, one big lens or TV-face, bellhop caps, single wheel or hover base, trays. Army: polite swarm of melee greeters, tray-drones, return-cannon tanks, repair techs, one enormous concierge. Lore joke: "Courtesy Systems makes helpful appliances. A firmware update decided customer satisfaction was a number and set about measuring it. Every robot is cheerful, polite and in the process of closing your account."
4. **Skitter Hive** (aliens, swarm and acid). Acid lime #B4E61F glow + maroon chitin #4A1A2A. Emblem: a cluster of three hex cells. Silhouette: LOW and MANY-LEGGED: beetle domes, ant-runners, bloated spitters, a wyvern-winged glider, one vast queen with an egg sac. Army: numbers, speed, acid that ignores bubbles, splash-vulnerable. Lore joke: "The Skitter Hive thinks as one, which makes it superb at agreeing and hopeless at deciding. The translator says they come in peace, at a confidence rating the translator will not discuss. The Queen has nine thousand children and one very large bedroom."
5. **Glowmoss Reach** (gentle jungle aliens, healing and poison). Moss teal #1E7A66 + gold glow #F4C430. Emblem: a light-bulb drop (a drop with a stalk). Silhouette: HILLS WITH LAMPS: huge round furry quadrupeds, tall stalk-lamps, petal backs, slender stalk-people with long staffs. Army: herd beasts, poison darts, healers, one walking flower bed, one walking hill. Lore joke: "The Glowmoss Reach are the polite landlords of a jungle that glows when it is annoyed. They never wanted a war, only for everyone to stop standing on the moss. Their army is a herd, most of which is standing on the moss."
6. **Quiet Hour** (human guild, cloak and blink). Void black #15131F + electric violet #9B5CFF rim. Emblem: a hollow rectangle (a door left ajar). Silhouette: THIN VERTICAL SLIVERS with a single violet rim line; hover bikes like blades; a manta that is mostly shadow. Army: cloaked cutters, blinking adepts, one flying leviathan with a noise complaint. Lore joke: "The Quiet Hour is a guild that bills by the second of silence. Members cloak, blink and say nothing, which clients find restful and neighbours find suspicious. They have never lost an argument because they have never started one."

**Silhouette test at 40 px in greyscale (the VB rule that decides the palettes).**

| faction | greyscale read | closest confusable | why it still separates |
|---|---|---|---|
| Tidy Concord | bright round dome plus a tall rod | Courtesy Systems | ivory is the brightest army on the field and all its forms are round; Courtesy is mid-grey and boxy with a dark face (luminance gap above 25%) |
| Rummage Armada | dark lump with one bright orange stack | Quiet Hour | Rummage always carries a hard orange fill and an asymmetric shoulder; Quiet Hour is almost pure black with only a thin rim line |
| Courtesy Systems | mid-grey square with one magenta lens | Concord | box against sphere; the magenta lens is the only saturated pixel on the unit |
| Skitter Hive | low, wide, dark carpet with lime tips at mouth and feet | Glowmoss Reach | Skitter is maroon-dark with hard hex shells; Glowmoss is a big mid-teal fluffy round with a gold point always above it on a stalk |
| Glowmoss Reach | huge round fluff with a gold point | Skitter beetle | soft fluff against hard shell; gold stalk lamp above the body |
| Quiet Hour | thin vertical black sliver, violet edge | Rummage | see Rummage; also nothing else in the game is that thin |

## 3. The 34-unit roster

Legend. Role from the existing set (melee ranged cavalry siege support hero monster beast swarm); tags: `vehicle air hover mech shielded cloaked energy machine organic detector officer`. **`machine` = anything not made of meat or goo (robots, drones, vehicles, mechs, emplacements)**; EMP stuns and shield-wipes `machine` only; acid/poison are damage-over-time and ignore bubbles; all non-artillery shooters can hit air. Stat intent in `hp (+shield) / speed u/s / cost ergs`, Ancient hoplite = 150 hp / 2.6 / 100; shield = `sh X (delay s, regen/s)`. Numbers are design intent for BALANCE, not frozen. Body types: S standard, L lean (0.92), B broad (1.12). BOSS = survival boss (5). SIL = bespoke silhouette (20 of 34; 4 more hum1 units carry a unique back/head hook).

### 3a. Mechanics table

| id | name | faction | role + tags | rig | weapon / projectile | ability | hp (+shield) / speed / cost | strong vs / weak to |
|---|---|---|---|---|---|---|---|---|
| tidy_trooper | Tidy Trooper | tidy_concord | ranged; organic shielded energy | hum1 S, style `rifle` | pulse rifle, kind `pulse` (energy), burst 3 / 0.09 s, mag 12, reload 2.0 s, range 22, hits air | personal bubble | 100 (+40, 3 s, 9/s) / 3.0 / 110 | strong: lone shooters, swarms in lanes; weak: acid and poison (bypass bubble), beam snipers, anything inside its reload |
| bubble_warden | Bubble Warden | tidy_concord | support; organic shielded | hum1 L, `pistol` + back projector rod | holdout pistol (energy 6) | `shield_projector` aura r8: allies' regen x2, +30 overshield on cast (cd 12) | 90 (+60) / 2.6 / 150 | strong: keeps 6-10 shooters bubbled; weak: priority target for beams, acid, rushers |
| lens_marksman | Lens Marksman | tidy_concord | ranged; organic energy sniper | hum1 S, `beamrifle` | hitscan beam `lens_beam` (energy 52, ap 0.5), 1.1 s visible laser-line lock, cd 3.4, range 44, hits air | ground telegraph line | 85 (+20) / 2.6 / 170 | strong: officers, heroes, drones, anything with a fat bubble (one shot pops a trooper); weak: cloak, rush, flank |
| dustpan_hover | Dustpan Hover Tank | tidy_concord | cavalry; vehicle hover machine shielded **SIL** | hover1 | twin plasma lobber, kind `plasma` (energy, aoe r1.6, 26), cd 1.5, range 28 | `hover`: crosses lava, water, acid | 240 (+120, 4 s, 14/s) / 5.0 / 270 | strong: islands, flanks, infantry; weak: EMP (stun plus shield wipe), rockets, return cannons |
| spritz_medic | Spritz Medic | tidy_concord | support; machine air(low) detector **SIL** | drone1 | none (mist nozzle) | heals organics 18 hp/s r6; `detect` cloak r12 | 60 (+30) / 4.0 / 140 | strong: sustain, reveals cloak; weak: any hit, flak, EMP, a cold |
| grand_housekeeper | Grand Housekeeper | tidy_concord | hero; organic shielded officer | hum1 B x1.4 power armour, `staff` | broom-antenna baton (blunt 18) + sidearm | `call_strike` "Deep Clean": 2 s telegraph, r4, 90 energy, crater, cd 28; aura `tidy` +regen r9 | 330 (+150) / 2.8 / 420 | strong: clumps, bosses (needs a long look); weak: beams, flanking, his own hubris (ring is friendly-fire) |
| wrench_runner | Wrench Runner | rummage_armada | melee; organic | hum1 L, `wrench` (bash) | arc wrench: blunt 9 + energy zap 6 | `lunge` dash 6 u, charge x1.5, cd 7 | 120 / 3.6 / 80 | strong: reload windows, squishy casters; weak: kiting, MG, bubbles (zap chip is weak vs shield) |
| rivet_gunner | Rivet Gunner | rummage_armada | ranged; organic | hum1 S, `mg` (hip) | rivet gun, kind `rivet` (bullet 5), burst 6, mag 30, reload 2.6 s, range 24, `suppress` | suppression slows and widens spread | 105 / 2.8 / 120 | strong: chip-popping many bubbles at once; weak: one-shot beams, armour (ap 0), splash |
| zapper_tinker | Zapper Tinker | rummage_armada | support; organic | hum1 L, `staff` | none | `cc_field emp` r7, channel 1.0 s, cd 14: machines stunned 3 s, shields zeroed | 95 / 3.0 / 160 | strong: robots, drones, hover, vehicles; weak: everything else, interrupted by any hit |
| junk_buggy | Junk Buggy | rummage_armada | cavalry; vehicle machine **SIL** | car1 | roof rocket pods, kind `rocket` (explosive, aoe r2.4, 34), cd 2.4, range 26, hits air | `bailout`: driver hops out as a wrench_runner | 210 / 5.2 / 190 | strong: clumps, flanking at speed; weak: EMP, beams, lone snipers |
| salvo_cart | Salvo Cart | rummage_armada | siege; machine **SIL** | gun1 (crew 2) | rocket salvo, kind `salvo` (explosive, 6 x aoe r3.0 x 20), cd 7, range 58, min 12, crater, ground only | `setup` 1.5 s | 150 / 1.8 / 230 | strong: massed lines, craters on causeways; weak: flank, hover, EMP, min range |
| loader_suit | Loader Suit | rummage_armada | monster; mech machine **SIL** (suited giant) | hum1 x2.4 | bin-slam blunt 34 + shoulder rivet cannon (bullet) | `stomp` ground shake r4 stagger, cd 10 | 700, armor .45 / 2.2 / 520 | strong: infantry lines, cover; weak: EMP, hover kiting, beams |
| rustbucket_rex | Rustbucket Rex | rummage_armada | monster; mech machine **BOSS SIL** | mech4 (quad rigid legs) | scrap cannon, kind `junk_shell` (explosive, aoe r5, 70, crater), cd 4; chest rocket racks | `stomp`; at 50% hp `overclock` speed x1.4; topple death | 2600, armor .5 / 1.6 / 1500 | strong: masses; weak: EMP (2 s cap), rear plate (armorFace .2), hover flankers |
| greeter_unit | Greeter Unit | courtesy_systems | melee; machine | hum1 S, `bash` | welcome baton, energy 8 + zap, cd 1.1 | `greet` taunt: pulls nearest foes r4 for 1 s | 140, armor .3 / 2.8 / 95 | strong: cheap blocker for the line; weak: EMP, wrench, anything blunt |
| valet_drone | Valet Drone | courtesy_systems | ranged; machine air detector **SIL** | drone1 | tray laser, kind `valet_beam` (energy 9), burst 4, range 20, hits ground and air | `detect` r10 | 55 / 4.5 / 110 | strong: squishies, casters; weak: rifles, flak, EMP |
| refund_crawler | Refund Crawler | courtesy_systems | cavalry; vehicle machine shielded **SIL** | tank1 | return cannon, kind `slip_shell` (explosive, aoe r1.6, 46), cd 3.2, range 30, ground only | turret slews; `armorFace` front .6 / side .35 / rear .15 | 420 (+80) / 2.4 / 300 | strong: hover, buggies, blobs; weak: EMP, flank rocket, infantry swarms from behind |
| warranty_tech | Warranty Tech | courtesy_systems | support; machine | hum1 L, six tool arms | none | `repair` r5: machines +18 hp/s and shield delay halved | 100 / 2.6 / 150 | strong: keeps mech and crawlers alive; weak: first target, EMP |
| maitre_prime | Maitre D'Prime | courtesy_systems | hero; machine shielded officer | hum1 B x1.5 | serving laser, kind `serve_beam` (hitscan energy 24), cd 1.8 | `please_wait` cc_field SLOW + DISARM r8, channel 1.5, cd 18 | 360 (+160) / 2.9 / 400 | strong: squads in a bunch; weak: EMP, wrench rush, cloak stab |
| grand_concierge | Grand Concierge | courtesy_systems | monster; mech machine shielded **BOSS SIL** | mech1 (biped reverse knee) | twin service lasers (hitscan sweep, 30/tick), `lost_luggage` mortar (explosive arc aoe r4, 60, cd 6) | `please_wait`; topple death | 2200 (+600, 6 s) / 1.8 / 1400 | strong: any crowd; weak: EMP (2.5 s cap), back plate, cloak stab during stun |
| skitterling | Skitterling | skitter_hive | swarm; organic alien **SIL** | insect1 (gnat) | bite pierce 5 | goo puddle on death (tiny slow) | 28 / 4.2 / 25 (squads of 8) | strong: numbers vs lone shooters; weak: splash, hover cannon, orbital |
| mandible_runner | Mandible Runner | skitter_hive | cavalry; organic alien **SIL** | insect1 (ant-runner) | mandible snip pierce 14 | `charge` x1.8 | 130 / 5.2 / 100 | strong: reload windows, casters; weak: shield (bubble eats the bite), brace, wrench |
| acid_spitter | Acid Spitter | skitter_hive | ranged; organic alien **SIL** | insect1 (bloat-spitter) | acid glob, kind `acid_glob` (arc, aoe r1.8, poison 6 dps x 5 s, bypasses shields), range 26 | leaves a 4 s acid patch | 80 / 2.6 / 120 | strong: bubble troops, bunched anything; weak: fast units, beams, blink |
| plate_beetle | Plate Beetle | skitter_hive | melee; organic alien shielded **SIL** | insect1 (beetle) | ram bash blunt 18, knockback | `carapace` regen shield (80, 5 s, 10/s) | 320, armor .55 / 2.0 / 220 | strong: bullets, chip; weak: explosives, orbital, acid |
| glidewing | Glidewing | skitter_hive | ranged; organic alien air **SIL** | dragon1 (wyvern variant) | acid spray, kind `acid_spray` (strafing line, poison), range 14 | `strafe` runs, air layer 6 u | 150 / 5.5 / 200 | strong: bubbles, backlines; weak: rifles, flak, beams |
| hive_queen | Hive Queen | skitter_hive | monster; organic alien **BOSS SIL** | insect1 queen scale x3 | acid cone, kind `acid_cone` | `brood`: 8 skitterlings every 12 s; `screech` scare r10; rear sac armorFace .1 (assumption A1) | 3000, armor .35 / 1.4 / 1600 | strong: swarming; weak: orbital, splash on the sac, blink flankers |
| glow_grazer | Glow Grazer | glowmoss_reach | beast; organic alien detector **SIL** (era mascot) | quad1 alien species (round grazer) | headbutt blunt 11 | `charge` x2; lamp stalk reveals cloak r10 | 190 / 3.4 / 70 | strong: cheap blocker, cloak finder; weak: ranged kiting; also the real hero |
| thorn_slinger | Thorn Slinger | glowmoss_reach | ranged; organic alien | hum1 S tall, `blowgun` (throw) | thorn dart, kind `thorn` (pierce + poison 4 dps x 4 s), range 24 | poison ignores bubbles | 90 / 3.2 / 115 | strong: Concord bubbles, armour; weak: fast flankers, beams |
| spore_shepherd | Spore Shepherd | glowmoss_reach | support; organic alien | hum1 L, `staff` | none | `heal_pulse` organics r6 14 hp/s; `spore_cloud` gas (slow + poison) r4, cd 16 | 100 / 2.6 / 150 | strong: sustain, area denial; weak: dive, beams |
| bloom_stomper | Bloom Stomper | glowmoss_reach | monster; organic alien **SIL** | quad1 alien species (giant, petal back) | stomp blunt 40 + trample | `bloom` death burst heals allies r6 | 650, armor .35 / 2.2 / 400 | strong: skirmishers in its path; weak: kiting beams, EMP does nothing |
| eldertusk | Eldertusk | glowmoss_reach | monster; organic alien **BOSS SIL** | quad1 alien species (titan, mossy hill + lamp) | tusk gore 60 + earth stomp aoe r7 stagger | `bloom_aura` allies +10 hp/s r12; trample charge | 3400, armor .4 / 1.8 / 1700 | strong: everything it walks over; weak: orbital, sustained beams |
| veil_cutter | Veil Cutter | quiet_hour | melee; organic cloaked | hum1 L, `shiv` | hush shiv (short folded-light dagger, energy 16, backstab x1.35) | `cloak` (cd 8; attack breaks it; 2 s opener bonus) | 85 / 3.6 / 140 | strong: backlines, casters, snipers; weak: lamps and drones, splash, brace |
| hop_adept | Hop Adept | quiet_hour | ranged; organic | hum1 S, `pistol` + ring staff | blink pistol (energy 12), range 20 | `blink` 12 u, cd 5, both ends telegraphed | 80 / 3.0 / 160 | strong: crossing liquid or walls to kill spitters; weak: fragile, no cover |
| shush_bike | Shush Bike | quiet_hour | cavalry; vehicle hover machine shielded **SIL** | hover1 (small blade bike) | stun lance, kind `lance` (energy melee, charge x2) | hover; charge | 150 (+60) / 6.0 / 180 | strong: flank, casters; weak: EMP, brace, rifles |
| void_manta | Void Manta | quiet_hour | monster; organic air cloaked shielded **BOSS SIL** | dragon1 (manta; flat wings >= 2 voxels thick) | `shush_cone` sonic (suppress + stagger), dive bomb aoe r4 | periodic `cloak` (6 s on / 10 s off), air layer 8 u | 2400 (+400) / 4.2 / 1500 | strong: ground-only armies; weak: rifles, beams, flak, detectors |

Boss survival cycle (waves 5, 10, 15, 20, 25): `rustbucket_rex` "Wave {n}: Rust In Pieces", `hive_queen` "Wave {n}: Nine Thousand Reasons", `grand_concierge` "Wave {n}: Your Call Is Important", `eldertusk` "Wave {n}: The Hill Has Opinions", `void_manta` "Wave {n}: Noise Complaint, Extended". Sample ordinary survival waves: "The Welcome Committee", "Unsolicited Samples", "Terms and Conditions", "The Recall", "Firmware Update, Armed".
Counter web (asserted in ER7, designed direction written before measuring): bubble beats bullet chip; acid, poison and burst beams beat bubble; splash beats swarm; EMP beats machine; lamps, drones and splash beat cloak; rifles and flak beat air; flank beats frontal armour; hover and blink beat ground-locked shooters across liquid.

### 3b. Look and text table (silhouette hook + animation joy, joke, first mission)

| id | silhouette hook and animation joy | one-line joke (codex or death line) | first |
|---|---|---|---|
| tidy_trooper | fishbowl helmet with a visor glare, white backpack tank, round shoulder pods, teal knee stripes; reloads by slapping the rifle like a vending machine | "Fishbowl helmet rated for vacuum, rain, and hearing 'sir, you are on mute'." | sf_lunch_break |
| bubble_warden | tall projector rod with a spinning halo dish over the shoulder; pats allies' shoulders and a bubble pops on | "Professional bubble. Certified for personal space." | sf_lunch_break |
| lens_marksman | rifle with a 2x2 barrel and a huge round lens like a dinner plate; kneels, breathes out, red line draws on the ground | "Has a laser sight on a laser. For the other laser's sake." | sf_lunch_break |
| dustpan_hover | wide bowl hull, scoop nose, four glow pads, tilts into turns; shield dome swells when firing | "Named Dustpan because it sweeps up what the infantry swept." | sf_floor_lava |
| spritz_medic | spherical drone with a squeezy-bottle nozzle and a white cross-free blue ring light; sprays a mist with a tiny "fsst" and bobs happily | "Dispenses hand sanitiser and field medicine. Mostly hand sanitiser." | sf_overclock_oops |
| grand_housekeeper | broad power armour, white and blue, a tall feather-duster antenna; salutes a satellite by pointing a baton at the sky | "Has never lost a battle, having never allowed one to get messy." | sf_noise_complaint |
| wrench_runner | oversized left shoulder, a wrench taller than his torso with a sparking jaw, trailing sparks; sprints with elbows out | "Rule one: if it hums, hit it. Rule two: see rule one." | sf_lunch_break |
| rivet_gunner | belt-fed hip gun, ammo drum on the back, smoke from a stovepipe on the helmet; braces the gun on his hip and sways | "Fires rivets because bullets cost extra. Structural integrity of enemy: not our concern." | sf_lunch_break |
| zapper_tinker | goggles, bandolier of spare fuses, a rod topped with a sparking colander; hits the rod on the ground to start it | "Fixes things by hitting them. Breaks things by hitting them. Same hit." | sf_turn_it_off |
| junk_buggy | lopsided cab, a bouquet of rocket pods, one mismatched wheel, a spoiler that is a door; bounces on every bump | "Held together by optimism, tape, and one load-bearing sticker." | sf_lunch_break |
| salvo_cart | a shopping cart with 24 rocket tubes, two crew pushing it, recoil rolls it backward; crew chase it | "It is a shopping cart. It has always been a shopping cart. It now has 24 tubes." | sf_floor_lava |
| loader_suit | orange suit with stump shoulders, a fishbowl cab, cardboard-box fists; each step rings the ground and shakes the camera 1% | "Certified for lifting 40 tons. Occasionally lifts the wrong 40 tons." | sf_overclock_oops |
| rustbucket_rex | squat dumpster body, crane-arm tail, radiator "teeth" cannon mouth, four stilt legs; steam vents when it overclocks, topples sideways in sparks | "Was a crane, a truck, three vending machines and somebody's ambition." | sf_overclock_oops |
| greeter_unit | stacked-box body, flat-screen face showing a smile that changes to a frown on hit, bellhop cap; bows before every swing | "Greets you warmly, then reclassifies you as 'out of stock'." | sf_turn_it_off |
| valet_drone | round tray on rotor arms with a laser on the tray, a tiny bow-tie light; wobbles when carrying a "drink" | "Delivers your drink, your bill and a seven-joule hello." | sf_turn_it_off |
| refund_crawler | wide boxy tracks, a turret shaped like a cash drawer, a receipt ribbon streaming from the barrel; turret pops open on death | "Processes returns by returning fire. Receipt printed on impact." | sf_turn_it_off |
| warranty_tech | six folded tool arms like a mechanical spider backpack, hard-hat dome; waves a tiny clipboard | "Out of warranty? Fixed. In warranty? Fixed. Yours? Void on arrival." | sf_turn_it_off |
| maitre_prime | large tailcoat-shaped chassis, bow-tie antennae, a serving tray shield; gestures "this way, please" while pushing foes with a slow aura | "Seats you. Seats everyone. Seats the battle at table four." | sf_grand_reopening |
| grand_concierge | ten-storey desk-and-kiosk torso, giant TV face, reverse-knee legs, luggage cart on its back, tray-lasers; ground ring on each step; topples like a falling hotel | "Welcome to the Violence Desk. Your number is: now." | sf_grand_reopening |
| skitterling | knee-high lime-glow gnat, hovering hop; moves in a boiling carpet; pops into a puddle | "Thinks as one. Gets lost as one." | sf_hop_on_pop |
| mandible_runner | long thin ant legs, huge mandibles, maroon plates with lime tips; sprints in straight lines and skids on stops | "Arrives before the sentence announcing it." | sf_hop_on_pop |
| acid_spitter | swollen lime sac on a thin body; inflates, tilts back, spits with a squelch | "Translator: 'We spit with love.' Floor: dissolving." | sf_hop_on_pop |
| plate_beetle | sofa-sized domed shell with hex shimmer, tiny head; rams, rocks, flips back up | "A beetle the size of a sofa with the temperament of a sofa. Do not sit on it." | sf_hop_on_pop |
| glidewing | thin dragonfly-wyvern with a long tail, leaf-membrane wings; dips, sprays, banks | "Dives, spits, leaves a stain on your dignity." | sf_noise_complaint |
| hive_queen | tank-sized abdomen sac with glowing egg clusters, crown of antlers, six huge legs; heaves out a brood with a satisfied sigh | "Majestic. Tired. Nine thousand children, none of which called." | sf_queen_size |
| glow_grazer | round woolly body, short legs, a gold lamp on a stalk, a ring-light "helmet"; hops when charging, lamp swings | "Wears a tiny helmet because someone insisted. The helmet is a ring light." | sf_express_delivery |
| thorn_slinger | tall stalk-person with a long blowgun, moss cloak and gold eyes; puffs cheeks, spits a dart | "Blowgun with a doctorate." | sf_hop_on_pop |
| spore_shepherd | slender figure with a lamp staff, drifting spores around; sweeps the staff to herd a spore cloud | "Herds clouds. Clouds herd back." | sf_hop_on_pop |
| bloom_stomper | a walking flower bed on four mossy legs, petals open on every stomp; spores puff from its back | "A walking flower bed. Do not mention the lawnmower." | sf_hop_on_pop |
| eldertusk | a hill with legs, a golden lamp as big as a hut, mossy tusks; each step pulses a ring of spores | "Hills were named after it. It disagrees with their coordinates." | sf_hop_on_pop |
| veil_cutter | thin hooded sliver with a single violet rim line, a short folded-light dagger; fades in with a shimmer, bows, backs away | "Hushes the battlefield. Library fines may apply." | sf_express_delivery |
| hop_adept | long coat, ring staff, a halo of afterimages; blinks with a bow, reappears with a polite cough | "Is there. Then there. Then wherever you were not looking." | sf_hop_on_pop |
| shush_bike | blade-thin hover bike, rider lying flat, violet underglow; leans hard into turns | "Silent engine. Loud opinions about wheels." | sf_express_delivery |
| void_manta | a flat black manta with glowing violet edge-lines, five-storey span, fin ripples; shadow blob covers half the screen; cloak shimmers its outline | "Files noise complaints with its entire body." | sf_noise_complaint |

Roster contract notes: 20 SIL units (non-hum1 rigs or the suited giant) beat the 15 floor; every faction has a unit no other faction could be mistaken for (dustpan, salvo cart, crawler/concierge, queen, eldertusk, manta); hum1 body-type sharing is at most 2 per faction (Concord: trooper S and marksman S; warden L; housekeeper B). Insect1 needs five distinct builders (gnat, ant-runner, bloat-spitter, beetle, queen), not five recolours: the ER3 silhouette hash must see them as different.

## 4. The 12 arenas

All recipes use `g.rng`/`g.nz` only, symmetric where fair (S22). `env.era = scifi`, themes feed `THEME_LOOK`; new weather rows needed: `spores` (jungle, hive), `neon_rain` (city), `ember_ion` (lava, reactor). New materials appended (16+): regolith, basalt, ice, neon_pad (emissive), hull_plate, resin, goo, alien_moss.

| id | name | size | theme / biome | signature features | objective fit | set-piece fit |
|---|---|---|---|---|---|---|
| sf_moonbase | Dome Sweet Dome | medium | moon / regolith; black sky with a big blue home planet, gravity x0.4 (long arcs) | three domes (hab, mess hall, hangar), crater ring, solar arrays, antenna masts, an airlock lane | eliminate, hold_hill, protect_vip | dome breach and decompression puff (M1) |
| sf_lavaworld | Magma Lounge | medium | lava world / basalt; orange sky, ember weather | lava lake with 3 basalt islets and one 6 u causeway, three geyser vents, obsidian shards | capture, hold_hill, eliminate | lava surge (geysers), hover skating shot (M2) |
| sf_reactor | Core Meltdown Cafe | medium | industrial / hull_plate; teal strip lights | central reactor core and 3 shield pylons, catwalks over coolant pools, explosive tanks | destroy, defend_core | meltdown chain-pop shockwave (M3) |
| sf_crashsite | Hull Down | medium | crashed ship / metal and sand; dusk, smoke | a cruiser split in two as a cover maze, burning engine, escape pods, tilted corridors | protect_vip, eliminate, survive_waves | rolling blackout, engines flare (M4) |
| sf_megamall | Courtesy Plaza | large | machine retail park / neon_pad and tile | kiosk rows, a fountain atrium, wide lanes (vehicle-safe >= 6 cells), conveyors as decor | hold_hill, kill_general | mech emerges from the atrium (M5, M6) |
| sf_neoncity | Gridlock Boulevard | large | neon city / asphalt, neon_pad; night, neon drizzle | skyline on the edges only, wide main street, tram stops, hover cars, billboard stacks | kill_general, protect_vip, capture | boss stomp, signs fall (M6) |
| sf_jungle | Spore Hollow | large | alien jungle / alien_moss, goo; bioluminescent dusk, spores | an acid river splitting the grove, the Heart tree on one bank, canopy ring on the edges (readability pattern), spore pods | defend_core, survive_waves | the hill wakes (M7) |
| sf_hive | Sinkhole Nest | medium | hive cavern / resin; open-top crater so the sky reaches the floor | resin walls, 3 hive spires, egg clusters, goo pools, queen dais | survive_waves, destroy, kill_general | orbital strike down the open ceiling, manta shadow (M8) |
| sf_orbital | Spin Cycle Station | medium | orbital station / hull_plate; stars and a spinning planet through windows, gravity x0.8 | ring deck of panels, bulkheads, cargo containers, airlocks, one huge window | kill_general, survive_waves | hull breach and brood puffing into space (M9) |
| sf_iceworld | Frostbite Flats | medium | ice world / ice, snow; aurora sky, snow weather | ice spires, cryo vents (geyser hazard), frozen wreck, wide white lanes | eliminate, protect_vip, hold_hill | aurora flare (puzzles, survival, Quick) |
| sf_scrapyard | Rummage Row | medium | junk canyon / dirt, hull_plate; rust haze | twin lanes through junk heaps, a crane, a car crusher | eliminate, capture, destroy | crane drops a wreck (puzzles, survival, Quick) |
| sf_chasm | Gap Year Canyon | medium | crystal canyon / basalt, ice; violet sky | a 6-8 u chasm with two light bridges (soft props a script can remove), crystal spires | capture, protect_vip, survive_waves | bridges collapse, blink crossing (puzzles, Quick) |

## 5. The 38 props (all new, `sf_`; voxel 0.1 for small, 0.2 for buildings; `crate`-class nouns prefixed to avoid Ancient collisions)

`blocks`: full/none; `cover`: solid, low (M9 low cover), no; `hp` INF = indestructible; role = destructible role.

| id | cat | blocks | cover | hp | flam | role |
|---|---|---|---|---|---|---|
| sf_regolith_boulder | nature | full | solid | INF | no | hard obstacle, moon |
| sf_basalt_pillar | nature | full | solid | INF | no | hard obstacle, lava lake |
| sf_obsidian_shard | nature | full | solid | 160 | no | shatters into glassy chunks, soft cover |
| sf_ice_spire | nature | full | solid | INF | no | tall hard cover, ice |
| sf_ice_block | nature | full | solid | 220 | no | soft cover, breaks into shards |
| sf_glow_tree | nature | full | solid | 160 | yes | jungle soft cover, burns |
| sf_giant_fern | nature | none | no | 30 | yes | decor, hides cloak shimmer |
| sf_spore_pod | nature | full | low | 40 | yes | explodes into a poison cloud (explosive prop) |
| sf_crystal_spire | nature | full | solid | INF | no | hard cover, violet glow |
| sf_dome_panel | architecture | full | solid | 400 | no | breaches on script (M1 set-piece) |
| sf_airlock_door | architecture | full | solid | 600 | no | gate-class soft prop, destroy objective |
| sf_blast_door | architecture | full | solid | 1000 | no | team gate: owner passes, enemy must breach |
| sf_shop_front | architecture | full | solid | 450 | no | soft cover wall, shatters |
| sf_neon_tower | architecture | full | solid | INF | no | edge skyline, readability rule, tall |
| sf_hull_plate | architecture | full | solid | 900 | no | big soft cover section, sparks |
| sf_resin_wall | architecture | full | solid | 500 | no | hive wall, melts under acid |
| sf_station_bulkhead | architecture | full | solid | 800 | no | station cover wall |
| sf_barrier_low | architecture | full | low | 200 | no | waist-high cover that actually covers (M9) |
| sf_light_bridge | architecture | none | no | 300 | no | walkable energy bridge; removable by script (gap-year set-piece) |
| sf_cargo_crate | props | full | low | 60 | no | cheap low cover, splinters into confetti |
| sf_cargo_container | props | full | solid | 350 | no | stackable cover, rattles |
| sf_coolant_tank | props | full | solid | 140 | no | explodes in a frosty blast (explosive prop, knockback) |
| sf_solar_array | props | full | low | 120 | no | low cover, tilts on hit |
| sf_antenna_mast | props | full | no | 90 | no | thin decor, spinning dish |
| sf_street_lamp | props | none | no | 60 | no | neon pole, knocked out to darken lanes |
| sf_billboard | props | full | solid | 300 | no | glowing sign, flickers, falls over |
| sf_holo_ad | props | none | no | INF | no | flickering hologram decor with icons only |
| sf_parked_hovercar | props | full | solid | 200 | yes | cover, burns, small blast on death |
| sf_help_kiosk | props | full | solid | 200 | no | mall cover that smiles, sparks when hit |
| sf_junk_heap | props | full | solid | 400 | yes | scrapyard cover, collapses into rubble |
| sf_reactor_core | monuments | full | solid | 2000 | no | destroy objective; chain explosion on death |
| sf_shield_pylon | monuments | full | solid | 700 | no | destroy objective; small blast, pops nearby bubbles |
| sf_heart_tree | monuments | full | solid | 2400 | yes | defend_core prop, glows brighter when healthy |
| sf_hive_spire | monuments | full | solid | 1400 | no | destroy objective, spits goo on damage |
| sf_egg_cluster | monuments | full | low | 260 | no | hatch point; bursts into skitterlings |
| sf_wreck_engine | monuments | full | solid | INF | no | burning decor, smoke and fire emitters |
| sf_escape_pod | monuments | full | solid | 300 | no | soft cover, spawn marker, open hatch |
| sf_crane | monuments | full | solid | INF | no | tall hard silhouette for the scrapyard, swings a chain |

## 6. The 9 missions (3 acts)

Format per mission. Schema fields follow `MS` (id, act, arena, player faction and roster, budget, par, enemy, objective, timeLimit, teaching, starTests, rewards, setpiece, attempts). Closed helper vocabulary used: `thrift(par) underTime(s) aliveAtLeast(def,n) noLoss(def) shieldsPoppedAtMost(side,n) shieldsPopped(side,n) vipShieldNeverBroken() vipDamageAtMost(n) cloakKills(n) strikeKills(n) coreHpAtLeast(f) blinkCasts(n) empHits(n) noFriendlyFire()`. Star 1 is always win; star 2 is the generic `half army by cost alive` unless stated. Attempts = 1/p of the median-human proxy bot for star 1 and star 3. Curve rules checked: eight distinct objective types; one new mechanic at most per mission; finales (M3, M6, M9) teach nothing new and combine >= 2 earlier mechanics; every star 3 tests only mechanics taught in an earlier mission.

**Act I "Landlords and Squatters"** (blurb: the Moon has been repossessed; both parties are confident about it).

1. **`sf_lunch_break` "Moon Base Lunch Break"** (Act I, `eliminate`)
   - Arena and limit: `sf_moonbase` medium, seed 7, timeLimit 300.
   - Player: Tidy Concord; roster tidy_trooper, bubble_warden, lens_marksman; budget 3000, par 2250. Reference army: 14 tidy_trooper, 4 bubble_warden, 5 lens_marksman (2990 ergs).
   - Enemy: Rummage Armada raiders, 10 wrench_runner, 8 rivet_gunner, 2 junk_buggy; no boss; style "rush".
   - Teaches: **regenerating shields** (pop, 3 s regen delay, retreat to recharge, the warden extends). Tests: nothing (the whole map is a tutorial).
   - Stars: 2 = half army alive; 3 = `thrift(2250)` "Win spending under 2,250 ergs: big bubbles, small bills."
   - Set-piece "Lunch Is Served": at 45 s a buggy rams a dome panel, the dome cracks and a decompression puff staggers six units nearby (knocked out, not hurt). Camera: 4 s crane from outside the dome pushing in through the breach. Announcer slot `campaign_sf_lunch_break/mid`. Stinger `sting_klaxon` (brass plus siren). Sfx `dome_crack`, `airlock_hiss`, `siren_short`.
   - First three minutes: place troopers behind a warden, hold, watch the first pop, pull back, watch the regrow, win.
   - Reward: Workshop part `sf_helm_fishbowl` and title "Probationary Tenant". Attempts star 1 / star 3: 1.2 / 3. Bots: greedy 0.3-0.8, counter 0.7-1.0, turtle 0.3-0.9 (the raiders rush in a clump, so a patient bubble line wins).
   - Briefing: Brutus "WELCOME to the FUTURE! Same wars, bigger bubbles, no sandals!" Plato "The Moon has been repossessed. Can one evict a rock?" Cassandra "The squatters bring buggies. I drew a diagram. The diagram is also ignored."
2. **`sf_floor_lava` "The Floor Is Lava (Medium Rare)"** (Act I, `capture`: three relay pylons, hold all three for 10 s)
   - Arena and limit: `sf_lavaworld` medium, seed 3, timeLimit 300.
   - Player: Concord; roster dustpan_hover, tidy_trooper, lens_marksman, bubble_warden; budget 4500, par 3400. Reference: 4 dustpan_hover, 17 tidy_trooper, 4 lens_marksman, 4 bubble_warden (4230).
   - Enemy: Rummage defenders, 12 rivet_gunner, 6 wrench_runner, 3 junk_buggy, 2 salvo_cart on the far shore; style "dig in".
   - Teaches: **hover** (hover tanks cross lava; ground troops hold the causeway). Tests: shields.
   - Stars: 2 = half army alive; 3 = `shieldsPoppedAtMost(mine, 30)` "Fewer than 30 of your bubbles pop: use the causeway and the warden."
   - Set-piece "Magma Hiccup": at 100 s three vents erupt in telegraphed red rings and rock the causeway (geyser hazard). Camera: 5 s tracking shot following a hover tank over the lake. Announcer `campaign_sf_floor_lava/mid`. Stinger `sting_magma`. Sfx `lava_bloop`, `hover_whine`, `geyser_roar`.
   - Reward: Quick unlock (arena preset "Magma Lounge: Night Shift", ember weather, time 22) and codex page "Hover Tanks". Attempts 1.5 / 4. Bots: greedy 0.2-0.6, counter 0.6-1.0, turtle 0.1-0.5 (ground-only armies cannot reach the islands).
   - Briefing: Brutus "THE FLOOR IS LAVA! This is not a metaphor! It is GEOLOGY!" Plato "If the floor is lava, what is the ceiling? We have not been told." Cassandra "Hover tanks cost less than bridges. I priced both. Nobody asked."
3. **`sf_overclock_oops` "Overclock Oops"** (Act I finale, `destroy`: reactor core x1 and shield pylons x3)
   - Arena and limit: `sf_reactor` medium, seed 12, timeLimit 420.
   - Player: Concord; roster tidy_trooper, bubble_warden, lens_marksman, dustpan_hover, spritz_medic; budget 7000, par 5600. Reference: 6 dustpan_hover, 22 tidy_trooper, 6 lens_marksman, 6 bubble_warden, 4 spritz_medic (6520).
   - Enemy: Rummage, 14 rivet_gunner, 10 wrench_runner, 4 junk_buggy, 3 salvo_cart, 2 loader_suit, **boss rustbucket_rex** (wakes when the first pylon falls).
   - Teaches nothing new; combines **shields + hover** (hover tanks flank over the coolant; bubbles survive the Rex's splash).
   - Stars: 2 = half army alive; 3 = `aliveAtLeast(dustpan_hover, 2)` "Finish with two hover tanks still hovering."
   - Set-piece "Meltdown Cafe": when the core dies the sim slows to 0.5x, a white flash, a shock ring pops every bubble within 14 u in a chain ripple, craters stamp, the Rex slumps and topples. Camera: 5 s overhead orbit pulling back as the ripple spreads. Announcer `campaign_sf_overclock_oops/win`. Stinger `sting_meltdown`. Sfx `reactor_overload`, `shield_chain_pop`, `mech_topple`.
   - Reward: title "Overclocker" and Workshop part `sf_back_hoverpack`. Attempts 2.2 / 5. Bots: greedy 0.15-0.5, counter 0.5-0.9, turtle 0.2-0.7.
   - Briefing: Brutus "An OVERCLOCKED reactor! What could possibly go... BOOM?" Plato "The core is hot, the pylons are many. Is a reactor a thing, or merely a reason?" Cassandra "I said do not overclock it. I said it in capital letters. Nobody reads capital letters in the future either."

**Act II "The Help Is Here"** (blurb: the appliances are very pleased to assist; the guild would like a word, quietly).

4. **`sf_express_delivery` "Express Delivery (Fragile, Diplomatic)"** (Act II, `protect_vip`: walk the Envoy to the exit marker)
   - Arena and limit: `sf_crashsite` medium, seed 5, timeLimit 300.
   - Player: mixed; roster tidy_trooper, spritz_medic, glow_grazer, veil_cutter (hired); fixed VIP bubble_warden named "Envoy Plumbly"; budget 4200, par 3200. Reference: 14 tidy_trooper, 4 spritz_medic, 12 glow_grazer, 8 veil_cutter (4060).
   - Enemy: Quiet Hour renegades, 10 veil_cutter in cloaked ambush clusters, 4 shush_bike, plus 8 rivet_gunner posted on the wreck.
   - Teaches: **cloak** (shimmer, attack breaks it, grazer lamps and the medic reveal at r10-12, splash reveals). Tests: shields.
   - Stars: 2 = VIP alive and half army alive; 3 = `vipShieldNeverBroken()` "The Envoy's bubble never pops."
   - Set-piece "Rolling Blackout": at 70 s the wreck's power fails, sky to night, lights die, cloaked units appear only as violet outlines. Camera: 4 s over-the-shoulder behind the Envoy, rotating to reveal six shimmers. Announcer `campaign_sf_express_delivery/mid`. Stinger `sting_blackout`. Sfx `power_down_hum`, `cloak_shimmer`, `shush_whisper`.
   - Reward: Workshop part `sf_cape_shimmer` and codex page "Quiet Hour". Attempts 1.8 / 4.5. Bots: greedy 0.25-0.65, counter 0.6-1.0, turtle 0.2-0.6.
   - Briefing: Brutus "A DIPLOMAT! In a BUBBLE! Delivered EXPRESS to an address nobody can pronounce!" Plato "The cloaked cannot be seen. Does an unseen assassin exist, or merely lurk?" Cassandra "They are here already. I can hear them not breathing. Light the lamps."
5. **`sf_turn_it_off` "Have You Tried Turning It Off?"** (Act II, `hold_hill`: the Help Desk hill, 120 s)
   - Arena and limit: `sf_megamall` large, seed 9, timeLimit 240.
   - Player: Rummage Armada; roster wrench_runner, rivet_gunner, zapper_tinker, junk_buggy, salvo_cart; budget 6000, par 4500. Reference: 14 wrench_runner, 12 rivet_gunner, 6 zapper_tinker, 6 junk_buggy, 5 salvo_cart (5810).
   - Enemy: Courtesy Systems in waves, 14 greeter_unit, 8 valet_drone, 3 refund_crawler, 3 warranty_tech.
   - Teaches: **EMP** (3 s stun, shields zeroed, machines only; repair techs undo the damage, not the stun). Tests: nothing (tempo).
   - Stars: 2 = half army alive; 3 = `underTime(170)` "Clear the hill defenders in under 170 s."
   - Set-piece "Please Hold": the first EMP that hits at least 8 machines freezes them mid-wave, blue arcs crawl, "Please hold" bubbles pop. Camera: 4 s slow push-in on a frozen greeter mid-bow. Announcer `campaign_sf_turn_it_off/emp`. Stinger `sting_buzzkill`. Sfx `emp_burst`, `robot_powerdown`, `hold_music_snippet`.
   - Reward: era mutator "Static Cling" and title "IT Department". Attempts 1.4 / 3. Bots: greedy 0.2-0.6, counter 0.6-1.0, turtle 0.1-0.5; a mechanic-blind bot with no tinkers loses at least 70% (greeters outlast chip).
   - Briefing: Brutus "ROBOTS! Smiling, polite, deadly, and with a SURVEY at the end!" Plato "A robot has no soul, so who is being polite, and who is paying for it?" Cassandra "I predicted the robots. Nobody listened. Again."
6. **`sf_grand_reopening` "The Concierge's Grand Reopening"** (Act II finale, `kill_general`: grand_concierge, binding)
   - Arena and limit: `sf_neoncity` large, seed 21, timeLimit 360.
   - Player: mixed; roster wrench_runner, rivet_gunner, zapper_tinker, junk_buggy, veil_cutter, shush_bike; budget 9000, par 7200. Reference: 10 wrench_runner, 12 rivet_gunner, 8 zapper_tinker, 8 junk_buggy, 10 veil_cutter, 12 shush_bike (8600).
   - Enemy: Courtesy Systems, 16 greeter_unit, 10 valet_drone, 4 refund_crawler, 4 warranty_tech, 1 maitre_prime; **boss grand_concierge**.
   - Teaches nothing new; combines **cloak + EMP** (stun the mech, stab its back while it is on hold).
   - Stars: 2 = half army alive; 3 = `cloakKills(6)` "Six kills made from cloak."
   - Set-piece "Mech Stomp Reveal": at 25 s the atrium sign collapses and the Concierge strides out, ring-shaking the street. Camera: 5 s low boots-to-face. Announcer `campaign_sf_grand_reopening/boss`. Stinger `sting_mech_steps`. Sfx `mech_step_boom`, `servo_whine`, `welcome_chime`. Its death is a slow topple with a hotel bell.
   - Reward: Quick unlock (Concierge boss-rush preset) and title "Complaints Department". Attempts 3 / 6. Bots: greedy 0.1-0.5, counter 0.5-0.9, turtle 0.1-0.4.
   - Briefing: Brutus "THE GRAND CONCIERGE! Ten stories of friendly! Bring a HAT, he will want to hold it!" Plato "He is a hotel that learned to walk. Is hospitality a kind of aggression?" Cassandra "He reaches the neon sign first. I said so. The sign fell on my diagram."

**Act III "Queen Size"** (blurb: the bugs have a plan, the jungle has a hill, and the sky has a noise complaint).

7. **`sf_hop_on_pop` "Blink And You'll Miss The Jungle"** (Act III, `defend_core`: the Heart tree, 2400 hp, five waves)
   - Arena and limit: `sf_jungle` large, seed 17, timeLimit 420.
   - Player: mixed (Glowmoss Reach, Quiet Hour, Concord); roster glow_grazer, thorn_slinger, spore_shepherd, bloom_stomper, hop_adept, tidy_trooper; budget 8000, par 6400. Reference: 16 glow_grazer, 14 thorn_slinger, 6 spore_shepherd, 4 bloom_stomper, 8 hop_adept, 12 tidy_trooper (7830).
   - Enemy: Skitter Hive, waves of 30 skitterling, 8 mandible_runner, 3 plate_beetle and 10 acid_spitter shelling the Heart from the far bank of the acid river.
   - Teaches: **blink** (12 u hop across the river to knock out the spitters; hop home again). Tests: nothing.
   - Stars: 2 = half army alive and the Heart standing; 3 = `coreHpAtLeast(0.6)` "The Heart finishes above 60%."
   - Set-piece "The Hill Wakes": when the Heart drops under 50% the ground humps and the **Eldertusk** rises as a fixed ally, spore burst, moss shower. Camera: 6 s rising crane from roots to lamp. Announcer `campaign_sf_hop_on_pop/boss`. Stinger `sting_awaken`. Sfx `earth_rumble`, `spore_burst`, `titan_roar_soft`.
   - Reward: Workshop part `sf_staff_glow`, codex page "Eldertusk", title "Grove Keeper". Attempts 2 / 5. Bots: greedy 0.2-0.6, counter 0.6-1.0, turtle 0.1-0.5; poison dots ignore bubbles, so the hill's own healers matter.
   - Briefing: Brutus "THE JUNGLE! Glowing! Humid! Full of bugs the size of FOOTSTOOLS!" Plato "The Heart tree must live. Is a tree a person, or a very patient neighbour?" Cassandra "The river is acid. I wrote 'acid' on the map in green. The map is now also a hazard."
8. **`sf_noise_complaint` "Noise Complaint"** (Act III, `survive_waves`: five waves)
   - Arena and limit: `sf_hive` medium, seed 8, timeLimit 420.
   - Player: Concord; roster grand_housekeeper, tidy_trooper, bubble_warden, lens_marksman, dustpan_hover, spritz_medic; budget 10000, par 8000. Reference: 1 grand_housekeeper, 30 tidy_trooper, 6 bubble_warden, 12 lens_marksman, 8 dustpan_hover, 6 spritz_medic (9660).
   - Enemy: Skitter Hive in five waves (40 skitterlings; plus 10 mandible_runner; 12 acid_spitter and 4 plate_beetle; 8 glidewing and beetles; wave 5 **boss void_manta** "the noise complaint" and 6 glidewing, the Quiet Hour's pet leviathan reacting to the racket).
   - Teaches: **orbital strike** (Deep Clean via the hero and god power 2: red ring, 2 s, crater; friendly fire exists). Tests: shields.
   - Stars: 2 = half army alive; 3 = `shieldsPoppedAtMost(mine, 40)` "Keep the bubbles up while the sky falls."
   - Set-piece "Noise Complaint": wave 5, the manta glides over the open sinkhole and its shadow covers the screen, cloak shimmer along its edges, a Deep Clean beam answers. Camera: 6 s looking up from the pit. Announcer `campaign_sf_noise_complaint/boss`. Stinger `sting_manta`. Sfx `manta_hum`, `orbital_charge`, `sonic_shush`.
   - Reward: codex pages "The Hive" and "Void Manta", Quick unlock (Sinkhole Nest, night) and title "Complaint Resolved". Attempts 2.5 / 5.5. Bots: greedy 0.1-0.5, counter 0.5-0.9, turtle 0.2-0.7 (waves come to you).
   - Briefing: Brutus "ORBITAL STRIKE! From SPACE! At a rate of one per... please wait!" Plato "A beam from the sky. Is it justice, or merely geometry?" Cassandra "A noise complaint is coming. The Quiet Hour sends it personally. Stay quiet. You will not."
9. **`sf_queen_size` "Queen Size Bed (Hull Breach Edition)"** (campaign finale, `kill_general`: hive_queen, binding, brood waves)
   - Arena and limit: `sf_orbital` medium, seed 31, timeLimit 480.
   - Player: mixed, any roster; budget 14000, par 11000. Reference: 1 grand_housekeeper, 20 tidy_trooper, 6 bubble_warden, 8 lens_marksman, 8 dustpan_hover, 8 hop_adept, 6 spore_shepherd, 4 spritz_medic, 4 bloom_stomper, 10 glow_grazer (12080).
   - Enemy: Skitter Hive, 16 mandible_runner, 6 plate_beetle, 14 acid_spitter, 6 glidewing, 60 skitterlings in brood pulses; **boss hive_queen**.
   - Teaches nothing new; combines **blink + orbital strike + shields**.
   - Stars: 2 = half army alive; 3 = `strikeKills(25)` "Orbital strikes account for 25 kills."
   - Set-piece "Hull Breach": at queen 50% the window shatters, decompression drags the brood into space in a comic whoosh, emergency lights go red, the queen topples with a goo splat. Camera: 6 s pull-back from outside the station. Announcer `campaign_sf_queen_size/finale`. Stinger `sting_finale`. Sfx `hull_breach`, `alarm_red`, `queen_screech`.
   - Reward: era mutator "Warranty Void", title "Exterminator Emeritus", and the Credits time-travel sting (section 10). Attempts 3.5 / 7. Bots: greedy 0.1-0.4, counter 0.5-0.9, turtle 0.1-0.5.
   - Briefing: Brutus "THE QUEEN! Nine thousand children, one very large bedroom, zero doors!" Plato "A queen with no court but a hive. Who does she answer to, if everyone is her?" Cassandra "The station will lose its air. I said the windows were cosmetic. The windows were not cosmetic."

**Curve check (the MS lint, restated).**

| mission | objective | teaches | star 3 tests (taught in) | finale combines |
|---|---|---|---|---|
| 1 sf_lunch_break | eliminate | shields | none (thrift) | |
| 2 sf_floor_lava | capture | hover | shields (M1) | |
| 3 sf_overclock_oops | destroy | none | hover (M2) | shields + hover |
| 4 sf_express_delivery | protect_vip | cloak | shields (M1) | |
| 5 sf_turn_it_off | hold_hill | EMP | none (tempo) | |
| 6 sf_grand_reopening | kill_general | none | cloak (M4) | cloak + EMP |
| 7 sf_hop_on_pop | defend_core | blink | none (core hp) | |
| 8 sf_noise_complaint | survive_waves | orbital strike | shields (M1) | |
| 9 sf_queen_size | kill_general | none | orbital strike (M8) | blink + orbital + shields |

Eight distinct objective types (eliminate, capture, destroy, protect_vip, hold_hill, kill_general, defend_core, survive_waves); six mechanics taught one per non-finale mission; air layer, acid and poison, repair and mech topple are first-sight beats (CU5 toasts), not taught mechanics. Every headline mechanic (energy weapons with regenerating shields, cloak, EMP, hover, blink, orbital strike) is the taught mechanic of one mission and a star or a beat later.

Rewards ledger sanity (CU11): parts (helm, hover pack, cape, glow staff) usable now; Quick unlocks (Magma night, Concierge boss rush, Sinkhole night); mutators (Static Cling, Warranty Void); codex pages (Hover, Quiet Hour, Eldertusk, Hive, Manta); titles on every mission. Substitution rule if a ladder rung removes a part: swap for a title plus a codex page of the same mission.

## 7. The 6 puzzles (placement only, god powers off; 100 random legal armies win <= 15%, star 3 <= 5%)

1. **`sf_pz_pop_then_hide` "Pop, Then Hide"**: arena sf_moonbase; Concord, roster tidy_trooper and bubble_warden, budget 1100, par 880; six rivet_gunners on Hold. Taught: shield regen. Trick: staggered ranks let the front rank pop while the rear rank covers it and the bubbles regrow; a flat line loses every bubble in the same second. Bonus: lose nobody.
2. **`sf_pz_causeway` "Light Bridge Etiquette"**: arena sf_lavaworld; Concord, roster dustpan_hover, tidy_trooper, bubble_warden, budget 1800, par 1450; two junk_buggy, five rivet_gunners and a salvo_cart across the lake. Taught: hover. Trick: the hover tanks start on the flank island so the Rummage line turns the wrong way, the infantry hold the causeway on a tight line. Bonus: no hover tank bubble pops.
3. **`sf_pz_lamplight` "Do Not Disturb"**: arena sf_crashsite; Concord with glow_grazer and spritz_medic, budget 1000, par 800; six veil_cutters arriving cloaked. Taught: cloak. Trick: two grazers on the approach and one medic reveal them in time, troopers sit behind the lamps. Bonus: kill all six before any strikes.
4. **`sf_pz_reboot` "Have You Tried Turning It Off? (Puzzle Edition)"**: arena sf_megamall; Rummage, roster zapper_tinker, rivet_gunner, wrench_runner, budget 1100, par 880; four refund_crawlers in a tight column. Taught: EMP. Trick: one tinker placed so its EMP radius catches all four, rivet gunners behind it, wrench runners wait for the stun. Bonus: one EMP catches all four.
5. **`sf_pz_gap_year` "Gap Year"**: arena sf_chasm; Quiet Hour with Concord troopers, roster hop_adept, tidy_trooper, budget 900, par 720; five acid_spitters across the chasm. Taught: blink. Trick: the hop adepts stand on the lip (not at the bridge), jump over and cut the spitters down before they volley. Bonus: lose nobody.
6. **`sf_pz_bait_and_clean` "Bait And Clean"**: arena sf_hive; Concord, fixed grand_housekeeper plus a glow_grazer bait, budget 1300, par 1000; a skitterling column funnelling through a gap. Taught: orbital strike. Trick: bait spacing makes the column clump at the ring edge so one Deep Clean lands on the clump; wrong spacing wastes the strike. Bonus: the bait survives.

## 8. The 6 god powers (stable slots; mapped to existing effect families; icons and cues owned by UI/AUDIO)

| id | name | slot | maps to | telegraph | cooldown class | tooltip joke |
|---|---|---|---|---|---|---|
| sf_arc_tickle | Arc Tickle | 1 quick strike | `zeus_lightning` family: bolt plus chain to 4 more, energy | 0.35 s blue spark ring | quick (6 s) | "Chains between up to five enemies. Zeus's intern found it in the lost-property box. The label said 'Do Not Pet'." |
| sf_orbital_clean | Orbital Deep Clean | 2 big strike | `meteor` family: delay, big aoe, crater | 2 s red ring plus a falling pencil beam | heavy (22 s) | "Requested through Zeus's intern, who asked the satellite nicely. Stand outside the ring. The ring is not a suggestion." |
| sf_gravity_burp | Gravity Burp | 3 area control | `earthquake` family: stagger and fall in r14, props damaged, 5 s | circle of floating dust, no delay | long (30 s) | "Zeus's intern pressed a button labelled 'g'. Everything is briefly lighter and slightly offended." |
| sf_nano_spritz | Nano Spritz | 4 heal / repair | `heal_wave` family: hp to organics, repair to machines, shields refilled in r12 | green mist ring | medium (25 s) | "Fixes soldiers, robots and the occasional feeling. Contains 40% hand sanitiser." |
| sf_off_switch | Big Red Off Switch | 5 status | `wine_rain` family: 8 s field in r12: machines stunned in pulses, shields dropped | blue static ring | long (32 s) | "Zeus's intern labelled it 'DO NOT PRESS'. Therefore it lives in slot five." |
| sf_grazer_drop | Grazer Drop | 6 summon / reinforce | `raise_chickens` family: six glow_grazers in drop pods, pods stagger on landing | six small yellow rings | quick-medium (18 s) | "Delivered by Zeus's intern. Signed for by nobody. The grazers are thrilled." |

**The intern gag (rule D22).** The intern is offstage: named only in arrival cards, god-power tooltips and chooser captions (as above); no portrait, no `who`. The stalemate intervention is attributed to "the sky" ("A satellite you did not order fires.", then "The satellite files a complaint and leaves.", ragequit: "Mission Control has gone to lunch. Draw.").

## 9. Two era mutators; twelve achievements

**Mutators (CU16 matrix: both greyed with a reason in modes that fix the mechanic).**
- `sf_static_cling` "Static Cling": every 10 s, 6% of all units (random, either side) get their shield dropped and a 1 s stun. "Everyone is a little charged. Nobody is happy about the hair." Disabled in the EMP puzzle ("the puzzle already has a static opinion").
- `sf_warranty_void` "Warranty Void": shields never regenerate for anyone, and hp regen is off; damage +10%. "Sticker removed. Warranty void. Please do not read the other stickers." Disabled in the shields tutorial mission (teaches regen).
- (Rename note: the shared `moon_gravity` becomes "Low Gravity Fiesta" on this era's strings, purely cosmetic.)

**Achievements (12; `sf_*` ids; one hidden).**
1. `sf_bubble_wrap` "Bubble Wrap": pop 200 enemy shields (lifetime).
2. `sf_turn_it_off` "Have You Tried Turning It Off?": one EMP pulse stuns >= 12 machines.
3. `sf_peekaboo` "Peekaboo": kill 6 enemies in a won battle that were cloaked when the fight started.
4. `sf_hover_derby` "Hover Derby": hover units get 10 kills while above lava, water or acid.
5. `sf_hop_along` "Hop Along": 40 blinks in one battle.
6. `sf_deep_clean` "Deep Clean": one orbital strike kills >= 12 units.
7. `sf_timber` "Timber (Metallic)": topple a mech boss while it is EMP-stunned.
8. `sf_grazer_syndrome` "Space Goat Syndrome": win a battle whose last survivor is a glow_grazer.
9. `sf_ask_manager` "Ask For The Manager" (hidden): kill the Grand Concierge with a single orbital strike.
10. `sf_tourist` "Galaxy Tourist": play all 12 Sci-Fi arenas.
11. `sf_history` "The Future Is Now (Sort Of)": finish the Sci-Fi campaign.
12. `sf_overachiever` "Overachiever, But In Space": 27 Sci-Fi stars.

## 10. Humour: three comedic engines, the time-travel arc, eight callback pairs

Engines (Ancient's bureaucratic understatement is NOT primary; it survives only as Plato's colour).
- **E1 Deadpan Technobabble** (units, codex, Plato, Cassandra, tips): precise, specific, mechanic-linked, delivered flat. No "reverse the polarity" filler; every joke names a number or a tell. Hosts the alien translator-subtitle gag with a visible confidence rating.
- **E2 Drive-In Trailer Voice** (Brutus, mission posters, loading lines): trailer hyperbole applied to trivial stakes ("IN A GALAXY FAR FROM THE SNACK BAR"). Brutus keeps one ALL-CAPS word per line.
- **E3 Cheerful Menace** (machines, results screens, UI errors): customer-service positivity applied to destruction, never to pain; machines are polite about being switched off.

Five sample lines each:
- E1: (1) Codex, tidy_trooper: "Shield: 40 points. Regrows after three seconds of not being rude to it." (2) Plato, bubble pop: "A shield is a promise made of light. This one has just been broken, and it regrows in three seconds, unlike most promises." (3) Cassandra, EMP: "The machines are off for three seconds. I said so. Nobody asked how long." (4) Tip: "A popped bubble regrows after three quiet seconds. Quiet is the hard part." (5) Skitter subtitle: "[Translator: 'We come in peace.' Confidence: 11%. Alternate reading: 'We come in pieces.']".
- E2: (1) Brutus, battle start: "IN A GALAXY FAR FROM THE SNACK BAR, two armies fight over a parking space on the Moon! RATED G, FOR GLOWING!" (2) Brutus, shield pop: "POP! That was a BUBBLE and now it is a MEMORY! Recharging in three, two, one, rude!" (3) Poster tagline, M1: "HE CAME FOR THE MOON. HE STAYED FOR THE LEASE." (4) Brutus, kill streak: "FIVE in a row! Somebody call the trailer guy, we need a deeper voice!" (5) Brutus to Plato: "Are lasers just very LOUD javelins?" / Plato: "They are quiet, Brutus. The shouting is yours."
- E3: (1) greeter_unit taunt: "Welcome! Please remain calm and within range." (2) refund_crawler death: "Your return has been accepted. Please rate your explosion." (3) valet_drone: "May I take your shield? Thank you. It is now my shield." (4) Loading line: "Calibrating the cheerfulness of the robots. Currently: too high." (5) Defeat screen, Courtesy voice: "Thank you for your defeat. Your satisfaction is important to us. Please take a survey. The survey is another battle."

**Signature announcer categories (nine, three lines each in each voice; the effective pool reuses the neutral Ancient templates and reaches >= 300).** `shield_pop`, `shield_chain`, `cloak_reveal`, `emp_freeze`, `blink_hop`, `hover_over_lava`, `orbital_call`, `mech_step`, `alien_goo`. One sample each:
- `shield_pop`, Plato: "The bubble has gone. Observe the soldier within: exactly as before, only with fewer excuses."
- `shield_chain`, Brutus: "TWELVE bubbles in a row! That is not a battle, that is a bubble bath!"
- `cloak_reveal`, Cassandra: "He was there the whole time. I said so. Look, a violet outline, a very polite one."
- `emp_freeze`, Plato: "Does a machine that has stopped know that it has stopped? Does the grazer?"
- `blink_hop`, Brutus: "He was HERE! Now he is THERE! The distance between is a rumour!"
- `hover_over_lava`, Cassandra: "The floor is lava. Their tanks are not on the floor. I noted the loophole."
- `orbital_call`, Brutus: "FROM ORBIT! A very long way for one very small ring!"
- `mech_step`, Cassandra: "Each step is a seismic event. Nobody is surprised. I am, again, unheard."
- `alien_goo`, Plato: "The Skitter falls. It leaves a puddle and no regret. Is that peace?"

**Kill-feed verbs for the new causes (each cause >= 6 `by` verbs in the final file; samples).** `energy`: zapped, buzzed, toasted, sparked out. `bullet`: riveted, pinged, stapled, hole-punched. `explosive`: rocketed, launched, kaboomed, bounced. `emp`: powered down, switched off, put on hold, rebooted (permanently). `acid`: dissolved, spat on, de-glazed, hosed. `orbital`: deep-cleaned, rinsed, tidied, filed under sky. `crush`: stomped, flattened, parked on, stepped over. Solo phrases: "stood on a geyser vent", "fell into the acid river", "walked into the lava lake", "was vented into space".

**Survival wave names (20; boss waves use the boss names from section 3).** 1 Unsolicited Samples; 2 Neighbours, Zero Gravity; 3 Terms and Conditions; 4 The Recall; 5 Firmware Update, Armed; 6 Delivery Drones, Unamused; 7 The Orbital Audit; 8 People With Antennae; 9 The Long Queue, Hovering; 10 Cousins, Several, Glowing; 11 Surprise Inspection (Laser Edition); 12 Unpaid Overtime, Mechanical; 13 A Committee, Plasma-Powered; 14 Seasonal Staff, Extra Legs; 15 Eleven Aunts In A Pod; 16 The Complaint Department, Armed; 17 Late But Charged; 18 The Final Notice, Holographic; 19 Reasonably Sized Swarm; 20 The Reunion Nobody Warped To.

**Loading lines (8 of 20).** "Calibrating the cheerfulness of the robots. Currently: too high." / "Polishing the shield bubbles. Please do not poke." / "Asking Plato to define loading. He says 'later'." / "Teaching Brutus to whisper near the Quiet Hour. Retrying..." / "Charging the orbital strike. Estimated: when you least expect it." / "Counting hover tanks. One is missing. It is hovering." / "Defrosting the grazer. It is fine. It was always fine." / "Moving the Moon back. Please stand clear of the Moon."

**Tips (samples; every number true of the rules above).** Hint: "Pull a popped trooper back: its bubble regrows after three quiet seconds." Hint: "Acid and poison ignore bubbles. Shielded armies hate spitters." Hint: "EMP stuns machines for three seconds and wipes their bubbles." Hint: "A grazer's lamp reveals cloaked units within ten units." Hint: "Blink covers twelve units; both ends are shown before it fires." Hint: "Orbital strikes hurt your own side too. Aim past your friends." Joke: "Hover tanks cross lava. Your feelings do not." Joke: "The Moon is not made of cheese. It is made of regolith and a lease."

**Time-travel arc.** Arrival card (first entry, skippable, the only place the intern is named at length): "ARRIVAL: THE FUTURE. Zeus's intern pressed the third button on the time remote. Button one said 'Past'. Button two said 'Present'. Button three said 'Do Not'. The booth now has cup holders, a hologram and no manual." Chooser caption: "THE FUTURE. Selected by Zeus's intern, who held the remote upside down." Per-act progression: Act I (after M3) Brutus finally has a headset that fits a toga; Act II (after M6) Plato asks the booth AI to define "battle" and it replies with a survey; Act III (after M9) the booth has seatbelts and Cassandra has stopped saying "I said". Finale payoff on an era-independent surface (the Ancient finale is frozen): after clearing the Sci-Fi campaign the Credits screen gains a **time-remote sting** and the "all four eras cleared" card: "The commentators return to the booth. The booth is now a drive-in. The remote has been confiscated. Somebody has been promoted; we will not say who. Cassandra: 'I said it would end like this.' Everyone agrees, for once." plus one new studio role in the Credits: "Time travel logistics: unpaid, as foretold" (no name, by rule D22: the Credits stay intern-free).

**Eight callback pairs** (each pair: a setup-free line, funny cold; and a gated line that renders only if the one boolean for its source id is true; ids resolve in the callback ledger of spec/H; the other eras' source flags are named here and must be reconciled by COMEDY-EDITOR).
1. `cb_sf_goat` (source `anc.goat_hero`): free, Brutus: "Is a grazer a goat? Everything is a goat if you squint!" / gated: "THE GOAT'S GREAT-GREAT-GRANDGRAZER! Same helmet! Better lighting!"
2. `cb_sf_gift` (source `anc.trojan_reveal`): free, Plato: "A pod arrives unsolicited, smiling. Should one open it?" / gated, Cassandra: "It is a gift again. I said open it never. I said it in the other era too."
3. `cb_sf_pizza` (source `anc.sponsor`): free, Brutus: "Brought to you by Pompeii Pizza, now delivering by orbital strike!" / gated: "Pompeii Pizza returns! Same ash, new zero gravity!"
4. `cb_sf_define` (source `anc.plato_define`): free, Plato: "Define 'laser'." Brutus: "Zap!" / gated, Plato: "I have defined 'battle' in three eras. I accept 'noise'."
5. `cb_sf_said` (source `anc.cassandra_said`): free, Cassandra: "I predicted the robots. Nobody listened. Again." / gated: "I said it in the Bronze Age. I said it in armour. I am now saying it in glow."
6. `cb_sf_terms` (source `anc.terms`): free, Brutus: "The Terms of Conquest are now holographic. Still laminated, in spirit." / gated: "Page nine has been updated to include 'gravity'."
7. `cb_sf_headset` (source `med.headset`, "Brutus has bought a headset"): free, Brutus: "Is this thing on? It is on? IT IS ON." / gated: "The headset finally has BARS! Four! Five! I can hear MYSELF!"
8. `cb_sf_tank` (source `mod.tank_question`, "Plato asks what a tank is for"): free, Plato: "What is a hover tank for, if not hovering?" / gated: "I now know what a tank is for. A hover tank is for the same, with worse manners."

## 11. Music and sound direction

**Seven tracks (menu, battle low / mid / high, victory, defeat, map bed).** Sources: OGA CC0 synth picks (cyberpunk and space beds), Kevin MacLeod unused CC BY pieces, always with `loop:true` or a passing loop check; synthesized beds `battle_scifi`, `menu_scifi` as fallbacks; CC BY-SA rejected.
1. **Drive-In Overture** (menu): dreamy, warm, wobbly; 96 bpm; analog arps, theremin-like lead, soft kick, tape flutter.
2. **Hover Patrol** (battle low): tense-curious, sparse, bouncy; 108 bpm; pulsing bass, bleeps, muted clap, a lone vocoder-free pad.
3. **Shields Up** (battle mid): driving, bright, heroic; 128 bpm; saw arps, gated snare, synth-brass stabs.
4. **Overclock** (battle high): frantic, distorted, glorious; 146 bpm; fat saw bass, double-time hats, laser-zap percussion, a siren riser.
5. **Credits Roll** (victory, ~18 s): triumphant, glittering, brief; major key, synth brass, a final big chord that rings.
6. **Power Down** (defeat, ~14 s): comic-sad, decaying, slow; tape-stop pitch bend, descending theremin, one sad beep.
7. **Star Chart Lounge** (map and chooser bed): lazy, shimmering, spacious; 74 bpm; vibraphone, soft pad, distant radar pings.

**Twelve hot sound families and how they should feel.**
1. `pulse_burst` (tidy_trooper, hot): three tight "pew-pew-pew" with a soft thump under it; 0.25 s; pitch jitter; far cull 70 u. Source: Kenney digital laser set (CC0) layered with a short synthesised body.
2. `lens_beam` (marksman): rising 1 s whine, a crisp "thk-ZZT", a 1.2 s ringing tail; heavy and rare. Source: CC0 doomsday-laser slice plus energy-drain.
3. `shield_absorb` (hottest): a soft glassy "bloop-tink" per hit, pitch rising as the bubble drops; maxVoices capped, thinned at long range.
4. `shield_pop` plus `shield_recharge`: pop is a fat satisfying "bwoop-shatter" with three hex-glass tinkles; recharge is a 3-note ascending swell over the regen window ("dun-dun-DEEN"). Source: Kenney phaser down/up.
5. `emp_burst` plus `robot_powerdown`: a low "thoom", electric fizz, then a descending whirr and one sad "pdddt".
6. `cloak_shimmer`: airy sparkle swish up on cloak, down on reveal, a papery snap when the attack breaks it, a faint "shush".
7. `blink_pop`: tight "fwip" at origin and a rounder "pop" at the target, stereo-spread; very short. Source: Kenney phase-jump set.
8. `hover_hum` (aggregate bed, not per unit): warm 90-140 Hz hum with flutter whose level scales with the number of hover units in frame; never more than 2 voices.
9. `mech_step`: weighty "BOOM-clank", sub-40 Hz thump, a servo whine, linked to the camera shake; sources: CC0 mech-stomp plus CC BY robotic steps.
10. `orbital_strike`: a 2 s charge (rising synth drone with countdown ticks), 0.15 s of silence, then a deep "KRAAA-THOOM" with a cyan zap; duck music by 6 dB.
11. `rivet_rocket` (kinetic family): clacky "tk-tk-tk-tk" with a rattly tail for the rivet gun; "fsssh-BOOM" for rockets and salvos; cut short, no realistic gunfire.
12. `alien_goo`: wet clicks, trills and a happy "splorp" for deaths; chitter chorus for swarms. Source: OGA monster packs plus synth.
Hot-family repetition target: at least 6 sources for 1, 3, 4, 7, 11; heavy singles at least 3; synth fallback declared for 6, 8, 10.

## 12. Risks I see, and how the design avoids them

1. **Shield stalls and slow battles.** Regeneration vs low dps can end battles late (S11/S12). Avoid: delay 3 s (4-6 s on beetles, mech, boss), regen 9/s on 40-80 pools, shield pool capped at about 45% of effective hp, acid and poison bypass bubbles, EMP and Warranty Void exist, M4's progress-based watchdog measures damage dealt to hp or shield, not only hp.
2. **Cloak is unfair or annoying.** Avoid: the player always SEES cloaked units (a violet rim and shimmer); cloak only blinds the targeting AI; detectors are common (grazer lamps, medic, valet drone, splash); attacking breaks it; no cloaked unit for the first 6 s of a battle.
3. **Air and hover create unhittable remnants.** Avoid: all non-artillery shooters hit air; AA guarantee in armygen and in `campaign_validate`; air bosses descend to attack altitude; remnants rule from M7.
4. **Recolour risk across five insect1 and four hum1 humans.** Avoid: five distinct insect1 builders; hum1 silhouette hooks (back rod, lens barrel, stalk lamp, hooded sliver); ER3 recolour detection by silhouette hash is the gate.
5. **Readability of glow on dark.** Avoid: faction base colours separated by luminance; team tint always a glow strip; towers on arena edges; emissive tiles capped; shield pop flashes limited to 3 Hz per unit and a global cap; Reduce Motion cuts dollies and dims flash.
6. **Draw calls (16-type cap, domes).** Avoid: shields are an instanced layer (near dome <= 64, far via `aFx2`), hover shadows are blobs, drones and swarm members share geometry; the first draw-call buy-back rung is (a) shadow draws for the N nearest-populated types.
7. **Audio storm.** Avoid: burst template (cooldown 60-90 ms, maxVoices 5-6, cull 70 u), shield absorb is the thinned family, hover is an aggregate bed.
8. **IP and tone safety.** Avoid: no helmeted chin-guard troopers (fishbowls instead), no chest-bursting or acid-blood aliens (spit acid, lime goo, a bloated sac queen with antlers), no humming swords (the cutter's shiv is short and silent), no long-necked quad walkers (Rex is a squat dumpster with a crane tail), no cargo-lift exoskeleton in yellow (the Loader Suit is orange with cardboard fists and a fishbowl cab), no lantern-ring branding (faction is Glowmoss, not Lantern), no "droid" or "marine" or "walker" in any visible string (the quad rig is internally `mech4`).
9. **Comedy that is only technobabble.** Avoid: every joke names a number, a tell or a mechanic; no stock "reverse the polarity"; the ER11 panel calibrates on Ancient; the three engines are separated so one tone is not worn out.
10. **Ancient with lasers (tempo).** Avoid: kill clusters after pops, hover and blink flanks, 18-26 u engagement, vertical spread, wrench rushers who punish reload windows; ER27 fingerprint vs Ancient and vs Modern must pass or the feel sheet is rewritten.
11. **Overlap with Modern.** Avoid: Sci-Fi uses cover only for low barrier props, no mines, no suppression except the rivet gunner's; it owns shields, hover, air, blink, cloak, EMP and orbital.
12. **Boss feel.** Avoid: bosses carry caps on EMP (2-2.5 s), shields with long delays, readable phases (Rex overclocks at 50%, Concierge's stomp ring, Queen's brood timer, Eldertusk's bloom aura, Manta's cloak cycle); each ends in a toppling or splat set-piece.
13. **Part and triangle budgets.** Avoid: mech4 and mech1 at <= 30 parts, drone1 <= 8, hover1 <= 10, dragon1 manta flat with wings >= 2 voxels thick so the far mesh survives `downsample2`; crew on gun1 limited to 2.
14. **Assumptions to confirm with SIM/RA before E-FREEZE (A1-A6).** A1 `armorFace` reused on a non-vehicle (the queen's rear sac); A2 EMP boss cap values are data; A3 `machine` is a free-string tag read by EMP and repair; A4 `heal_pulse` can filter organic vs machine for the medic and the techs; A5 `call_strike` accepts a crater and a 2 s telegraph from a unit; A6 rig names `mech1` (biped reverse-knee), `mech4` (quad rigid legs, internal id only) and `hover1` small-bike variant are agreed with ANIM-RIGS.
15. **Unmeasured.** Shield-pop pacing, blink cooldown feel, the cloak shimmer shader at the far LOD, and the real mix of 40 simultaneous pops cannot be judged here; they are listed for ER17/ER12 and the unverified section.
