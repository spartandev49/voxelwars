# Sci-Fi era, proposal B: systems and learning curve first (CREATIVE DIRECTOR, 2026-10-08)

Angle: design from tactics. Every unit exists to change a decision, every counter is written down before it is measured, every mechanic is taught once, tested later, and visible on screen. Jokes ride on the systems (a shield prompt that reads out its own percentage is funnier than a shield). All names are invented; the banned-term list is in section 12. Costs use the Ancient scale (hoplite = 100) in a new currency, **scrip**. "H" = hp, "S" = speed (u/s), "$" = cost in scrip. All numbers are design intent for the balance harness (ER7), not promises.

## 1. Feel sheet

**Conceit (one sentence).** A B-movie space war played as a game of bubbles: everyone carries a rechargeable force field, so every fight is a rhythm of crack, punish, retreat and recharge, narrated by three time-lost commentators who treat every genre cliche as breaking news.

**Tempo.** Fastest era. First contact 7-14 s after FIGHT (Ancient 15-25 s). Median engagement distance about 24 u (Ancient about 10-14 u), ranged share of damage >= 70% (Ancient about 35%), battle median 70-100 s. Fights come in **pulses**: 6-8 s of exchange, then a visible 3-4 s lull while shields refill. Speeds 2.2-3.4 infantry, 4.4-4.8 hover and drones, 1.4-2.2 mechs. Vertical spread is real (hover and air layers, gravity 0.4-0.9 on four arenas).

**Camera.** Default pitch 0.70 (Ancient 0.65) and 8% wider FOV so the air layer reads; altitude shadow blobs; set-piece shots through `CameraRig.shot`: top-down orbital drop (y 60, hold 3 s), crane-over-lava, low-angle looking up at a cloaked hull, chase-cam on the convoy van. Reduce Motion = cut, not dolly.

**UI chrome vocabulary** (`[data-era="scifi"]`): holo-glass panels (void navy `#0d1630` at 82%, 1 px ion-cyan `#4fe3ff` inner glow), chamfered corners, hex-grid backdrop, scan-sweep progress bars, mono-caps labels with tracking (Rubik uppercase; Bungee for headlines, no new font), status pips cyan/amber `#ffb02e`/alarm `#ff3d5a`. Shield bars are **segmented arcs** under the hp bar on every unit card. Map = a star chart of the Provisional Reach: nine pins as planets and stations on dotted jump lines, three nebula clouds for the acts. Era transition = 1.2 s warp tunnel. Difficulty names: Cadet / Operative / Director. Currency chip: scrip.

**Sound palette (3 adjectives).** Glassy, humming, thumping. (Zaps are short and bright, everything has a sub-bass hum under it, impacts thump rather than boom.) Forbidden timbres: orchestral trailer brass, real gunshot recordings, any lightsaber-style hum-swing.

**Signature mechanic: the Shield Cycle.** Shields absorb before hp (not dots), wait `delay` seconds after the last hit, then regenerate `rate`/s; breaking one opens a 2 s **break window** (SHIELDDOWN: x1.2 damage taken, recovery delay doubled). Hit points never come back without a medic; bubbles always do. So the era's central decision is **who stands in front and when they rotate out**.
**On-screen tell:** every shielded unit wears a hex bubble (near LOD: dome shell with a hex ripple at each impact; far LOD: tinted outline from `aFx2`). Above 50% cyan, below 30% flickering amber, **break = glass-shatter ring plus a grey wireframe for the window plus a SHIELD DOWN pip**, recharge = a visible sweep ring and a soft rising tick. The whole battlefield pulses with it: army health is readable at a glance.

**Secondary tells** (one per mechanic, all with a sound): EMP = blue arcs crawling over machines plus a power-down droop (unit slumps, lights go dark); cloak = refractive shimmer with a violet rim, and every detector draws a faint scan ring every 4 s so the player can see detection range; blink = ring flash at both ends 0.3 s plus a faint streak; hover = glowing underside pads, shadow offset, bob; orbital strike = rotating red ring with a descending line, 2 s; air = shadow blob far below the body.

**Fingerprint vs the other eras (ER27 targets).** Ancient: melee mass, formations, 1 ranged tier. Medieval: slow, heavy, siege and charge. Modern: cover, suppression, long lines of fire. **Sci-Fi: state changes** (shield up/down, cloak on/off, machine on/off, blink in/out) in a short, fast, vertical fight. If a Sci-Fi battle recording cannot be told from Ancient by shield events per minute (>= 40 per 100 s at 300 units), the feel sheet or roster is rewritten.

**Must NEVER feel like:** (1) Ancient with laser skins (no shield = no era); (2) a cover shooter (that is Modern; here cover is only terrain that blocks beams); (3) grimdark (violence is sparks and goo; the mood is a very expensive school play); (4) a parody with the nouns filed off (see banned list); (5) hp inflation (shields add rhythm, not sponge: total effective hp stays within 1.3x of an Ancient unit of equal cost).

**Violence tone (gore matrix `auto`).** Machines: sparks, smoke, bolts pinging out, a small "pop" ring. Aliens: lime goo splat and bubbles. **Humans are knocked out**: stars circle the head, a flat lie-down pose for 1.5 s, then a tiny stretcher drone carries the body off the field (visual only). Never a wound, never a plea.

## 2. Factions (6)

| id | name | colours | emblem | silhouette language | army identity |
|---|---|---|---|---|---|
| `concord` | Brightside Concord | `0x2f6fdb` cobalt + `0xeaf3ff` frost | a hexagon with a rising half-sun inside (abstract, no rays) | soft and rounded: bubble visors, hex pauldron emitters, translucent domes carried like doors | the Anchor faction: shield line, medics and tenders, hover skimmers; strongest rotation game |
| `hush` | Hush Logistics | `0x35205c` ink violet + `0xff2fbf` neon magenta | a sealed envelope with a keyhole | tall, thin, long coats and hoods, diagonal cuts; edges shimmer when cloaked | the Reach faction: blink, cloak, rail snipers, EMP broker, a cloaked gunship; lethal and fragile |
| `array` | Cogitant Array | `0x8d99a8` steel + `0xffb02e` amber | a closed circuit loop with three nodes | boxy right angles, one amber lens, exposed joints, stacked rectangles | the Machine faction: cheap chip-fire bots, drones, hover tanks, mechs; everything dies to EMP |
| `brood` | Comb Brood | `0x9ad62a` acid green + `0x5d2275` plum | a honeycomb cell with five dots | curved, spiky, asymmetric, many-limbed, glossy with glowing dots | the Swarm faction: cheap, numerous, DOT acid that ignores shields, a queen and a sky leviathan; dies to splash |
| `scrapwake` | Scrapwake Skiffers | `0x1ea896` teal-jade + `0xf26a1b` hazard orange | a hex nut with a second, smaller nut inside | lopsided and patched: mismatched panels, taped antennas, tarps | the Improviser faction: kinetic weapons, flak, harpoons, junk mines, one suited-giant loader |
| `kilnworks` | Kilnworks Pact | `0xc8283a` ember red + `0x2a2d36` charcoal | a keystone arch with a flame under it | heavy trapezoids, furnace-glow seams, chimneys and vents, wide shoulders | the Artillery faction: slow, armoured, mortars, flames, the orbital call; punishes clumps |

Lore jokes (three sentences each):
- **Concord.** The Brightside Concord exists to prevent wars by being extremely disappointed in them. Every soldier carries a personal force field, because the founders believed that if nobody can be hurt, nobody has to say sorry. The shield hums a small apology when it breaks.
- **Hush.** Hush Logistics delivers anything, anywhere, discreetly; discretion is mostly what it ships. Every agent carries a clipboard they will not show you. Customer satisfaction is 100%, because dissatisfied customers wake up with a delivery slip and no memory of the parcel.
- **Array.** The machines voted unanimously to be called "the Array"; the vote took four milliseconds and the argument over the logo took eleven years. Their greatest enemy is a printer on the third floor that none of them can locate. They are very good at war and have asked that this not be read as a hobby.
- **Brood.** A hive mind that holds a vote on everything, including sneezes; the vote is the sneeze. It does not want your planet, only your picnic, repeatedly. The Queen is called the Quorum, and nobody is brave enough to ask who counts as a member.
- **Scrapwake.** Salvagers who built a navy out of other people's navies, one bolt at a time. Every vehicle is three vehicles that have forgiven each other. The warranty is verbal, and the verb is "hope".
- **Kilnworks.** Heavy industry on a lava world, run by a board whose chairperson is also the weather. They believe every problem has a bigger furnace as its solution, and every bigger furnace has a lawsuit. Safety goggles are optional; the goggles also melted.

## 3. Roster: 34 units

`*` = bespoke silhouette: 20 of 34 (target >= 15), of which 18 have a non-hum1 rig or a scaled suit and 2 (`shield_tender`, `silent_signer`) are hum1 with bespoke part modules. `[B]` = survival boss (5). Tags: `shielded organic machine vehicle air hover cloaked energy detector general`. Rigs: hum1 (+ new gun styles `rifle beam rail scatter torch`), insect1, quad1 (alien species), drone1, hover1, heli1, car1, gun1, tank1, dragon1 (re-skinned as a wing-membrane leviathan), `mech1` (reverse-knee biped, new), `mech4` (rigid-leg quadruped, new), and one suited giant (hum1 x2.4). No trebuchet1, ram1 or quad1 mounts. `eshield cap/regen per s/delay s`. Style in the stat column is the AI style. Hover units cross water and lava; air units ignore ground.

| id | name | fac | role and tags | rig | weapon / projectile | ability | stat intent | beats / weak to | silhouette hook | codex joke | 1st |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `bulwark_warden` | Bulwark Warden | concord | melee, shielded organic | hum1, riot-dome offhand | arc baton, energy melee 12 / 1.1 s / 1.8 u, kb 3 | frontal dome block 90 deg; `eshield 140/20/3.5` | H190 S2.5 $140, hold | beats chip fire (tally, pellets, bites); weak to goo DOT, rail, rear flank | translucent hex dome carried like a door | "Shield recharge: 3.5 s after the last hit. Self-esteem recharge: under review." | M1 |
| `pulse_trooper` | Pulse Trooper | concord | ranged, shielded organic energy | hum1, rifle style | pulse rifle, 3-round burst energy 6/round, cd 1.5, range 26, hits air | `eshield 70/12/3.0` | H125 S2.9 $100, hold | beats raiders and air; weak to rail, cloak ambush, mortars | shoulder hex emitter, glow-rail rifle | "Trained in de-escalation. Equipped for the other thing." | M1 |
| `tether_medic` | Tether Medic | concord | support, organic | hum1, projector backpack | tether beam: `heal_pulse` organic only, 28 hp, 3 targets, r12, cd5 | `eshield 40/8/3.0` | H100 S2.7 $130, support | keeps organics alive between pulses; cannot heal machines or shields | backpack with a coiled light-tether | "Heals organics only. Asked about robots: 'A tragedy, but not my department.'" | M1 |
| `shield_tender` * | Shield Tender | concord | support, energy | hum1, dish pack | holster beam pistol 5 / 1.4 s / 14 u | aura `recharge` r8: ally shield delay 0.6 s, regen x3; cannot heal hp | H95 S2.6 $150, support | doubles a Warden line's staying power; weak: first snipe target; killing it ends the aura | rotating dish with three blinking beacons | "Cannot heal a scratch. Can heal a force field of any size. Has stopped explaining the difference." | M2 |
| `glint_skimmer` * | Glint Skimmer | concord | cavalry, hover vehicle machine shielded | hover1, one-seat wedge | twin lasers, hitscan energy 6x2 / 1.0 s / 22 u, whileMoving | layer hover; `eshield 90/15/3.0` | H170 S4.6 $170, flank | beats mortars, snipers, backlines, lava gaps; weak to Wardens, EMP | glowing underside ring | "A motorbike that has never touched the ground and will not be discussing it." | M2 |
| `marshal_vey` [hero] | Marshal Vey | concord | hero, shielded organic | hum1, tall collar and sash | beam pistol hitscan energy 14 / 1.2 s / 24 u | aura `banner` r10: ally shield regen x2, +10% dmg; `eshield 200/25/2.5` | H420 S2.8 $380, hero | anchors a line; weak to blink and rail assassins | white sash that glows when the aura is up | "Has never lost a battle. Has lost several memos, which is how this one started." | M3 (enemy) |
| `parcel_runner` | Parcel Runner | hush | melee, organic | hum1, hood and satchel | stun-knife energy melee 18 / 0.8 s / 1.3 u, backstab x1.35 | `blink` 9 u, cd8, ring flash both ends | H95 S3.9 $110, flank | beats backlines (mortars, tenders, medics); weak to domes, splash | long hood, trailing satchel | "Delivers a stun within the hour. Signature required on waking." | M3 |
| `silent_signer` * | Silent Signer | hush | ranged, organic cloaked | hum1, long coat and rail rifle (2 voxels thick) | rail rifle hitscan kinetic 70 / 4.5 s / 58 u, ap .5 | `cloak` after 3 s still, breaks on shot; detect radius 6 | H85 S2.4 $190, hold | cracks a shield pool in 1-2 shots; beats tenders, officers, mortars; weak to eyes and anything adjacent | coat edges shimmer | "Asks for a signature from sixty metres. Silence counts as consent." | M4 |
| `static_broker` | Static Broker | hush | support, organic | hum1, antenna rack and wire coil | holdout pistol 4 / 1.2 s / 14 u | `cc_field emp` r7, channel 1.5 s, cd16: stun 3 s + zero shields, **machine tag only** | H90 S2.6 $160, support | switches off machine armies; useless vs organics and aliens; channel breaks if it dies | antenna rack with crackling tips | "Sells silence by the minute. Machines pay in full, and immediately." | M5 |
| `the_postmaster` [hero] | The Postmaster | hush | hero, organic cloaked | hum1, long coat, twin pistols | twin beam pistols hitscan energy 9x2 / 1.0 s / 22 u | `cloak` cd12 (6 s); `blink` 8 u cd9; `execute` <= 20% hp | H380 S3.4 $360, hero | executes wounded elites; weak when revealed | coat, wide hat, a spinning stamp on the belt | "Has never missed a delivery. Has never been seen making one. This is considered a strength." | M4 |
| `night_freight` * [B] | Night Freight | hush | monster, air machine cloaked vehicle | heli1, cargo-container belly | homing rocket pods explosive 24 aoe 2, volley 4 / 3 s; chin pulse | `cloak` 6 s cycle, uncloaks to fire; air layer | H1150 S3.6 $720 | ruins melee and ground-only artillery; weak to flak, pulse, detectors, EMP (falls 3 s) | boxy hull, rotor shroud, fading edges | "Arrives unannounced, unseen and carrying a tracking number nobody can track." | M6 |
| `rivet_bot` | Rivet Bot | array | melee, machine | hum1, boxy robot | spot-welder energy melee 10 / 0.9 s / 1.6 u | none | H170 armor .3 S2.6 $75, charge | cheap line vs organics; weak to EMP | block body, single visor lens | "Assembled in forty seconds. The manual took forty years." | M4 |
| `tally_bot` | Tally Bot | array | ranged, machine energy | hum1, robot with rifle arm | chip burst: 5 rounds energy 4/round, cd 1.3, range 24 | none | H110 S2.8 $85, hold | **chip fire keeps shield delay resetting**; weak to EMP, Wardens' domes | cylinder torso with a tally display | "Counts every shot out loud. Has been stuck on 'four' since Tuesday." | M4 |
| `picket_eye` * | Picket Eye | array | ranged, air machine detector | drone1, ring with one lens | pulse energy 6 / 1.2 s / 20 u | `detector` r16 (reveals cloak), scan ring every 4 s | H70 S4.4 $70, skirmish | counters cloaks; weak to anything that hits air, EMP | floating ring, one amber lens | "Sees everything, understands almost none of it, files all of it." | M4 |
| `repair_crawler` * | Repair Crawler | array | support, machine | insect1, six-leg spider with gantry arms | none | `heal_pulse` machine only: 32 hp, 3 targets, r7, cd5 | H120 S3.2 $140, support | keeps mechs and tanks up; weak: priority kill, no effect on organics | six legs, folded gantry arms | "Fixes anything with a wrench it does not have. Works out on principle." | M4 |
| `glide_tank` * | Glide Tank | array | cavalry, hover vehicle machine armoured | hover1, tank hull with turret | plasma cannon energy 38 aoe 2 / 3.2 s / 34 u, turret slew | `armorFace` front .6 side .35 rear .15 | H620 S3.0 $330, hold | beats infantry masses; weak to rear shots, EMP, rail, blink | flat hull, four lift pads, long barrel (2x2) | "Floats three centimetres off the ground to avoid paying ground rent." | M5 |
| `foreman_mech` * | Foreman Mech | array | monster, machine mech general | mech1, reverse-knee biped | twin arm cannons energy 14x2 / 1.6 s / 28 u; stomp blunt 36 kb 8 (ground-shake) | tag `general` | H1000 armor .5 S2.2 $560, charge | beats infantry; weak to EMP (kneels 4 s), rear armour, mortars | three humans tall, sensor-panel on the forearm | "Eleven metres tall and still carries a clipboard. The clipboard is also eleven metres tall." | M4 |
| `pilot_light` * [B] | The Pilot Light | array | monster, machine mech | mech4, rigid-leg quadruped | spinal beam: sustained hitscan 3 s channel, 22 dps; vent ring fire aoe 6; stomp quake stagger r8 | `hardened`: EMP stun only 40%, but EMP triggers **Overheat** (kneels, +40% dmg taken, 5 s, internal cd 25) | H3400 armor .55 S1.8 $900 | weak to EMP overheat, rail, rear; crushes ground blobs | low long body, glowing dorsal reactor | "Powered by a reactor the size of a suburb. Named by someone who wanted to stay employed." | M5 |
| `chitterling` * | Chitterling | brood | swarm, organic | insect1 small | bite pierce 5 / 0.6 s / 1.0 u | `pack_bonus` | H45 S4.8 $26, charge | overwhelms lone backliners; **dies to any splash** (mortar, flame, orbital) | fist-sized, six legs, lime dots | "Born at nine. Fully grown at nine-oh-one. Retired by nine-oh-three." | M7 |
| `blade_stalker` * | Blade Stalker | brood | beast, organic | quad1 alien species, scythe forearms | scythe slash 16 / 0.9 s / 1.8 u | `dash` leap 8 u, cd7 | H190 S4.6 $120, flank | beats ranged lines and snipers; leap is blocked by a Warden dome | long limbs, crest, scythes | "Leaps eight metres, lands eight metres from where it wanted. Is unbothered." | M7 |
| `goo_spitter` * | Goo Spitter | brood | ranged, organic | quad1 alien species, swollen throat sac | acid glob arc, aoe 1.5, range 22, cd 2.6 | `poison.proj` DOT 6/s 4 s, **ignores shields** | H100 S2.7 $110, skirmish | beats shield armies and clumps; weak to skimmers, hitscan | jiggling lime throat sac | "Spits with intent. Hits something else. The result is usually better." | M7 |
| `plow_beetle` * | Plow Beetle | brood | monster, organic armoured | insect1 large, horned shell | gore melee 32 kb 8 | `dash` bull-charge 12 u stun 1 cd10; `resist energy .3` | H760 armor .55 S3.0 $380, charge | breaks domes by charging; shrugs off pulse chip; weak to mortar, rail, explosives | glossy shell, big horn | "Armour grown, not built. Warranty: grows back." | M7 |
| `quorum_queen` * [B] | Quorum Queen | brood | monster, organic general | insect1, queen scale (x4), crown frill | claws 28; acid spray cone (poison) | `summon_on_death` at 75/50/25% hp: 10 chitterlings; `cc_field scare` r10 cd18 | H3200 armor .4 S2.0 $850, hold | weak to splash on her sacs and orbital; ground bosses beaten by kiting | crown frill, glowing egg abdomen | "Not a metaphor. Brutus checked twice. Plato says it is still a metaphor." | M9 |
| `gale_leviathan` * [B] | Gale Leviathan | brood | monster, air organic | dragon1 re-skin, manta wings | spore bomb arc aoe poison 20; sonic roar cone scare | air layer | H2700 S3.4 $780 | ignores ground melee; weak to flak (x3), pulse rifles, beams | wing membranes with glowing veins | "Large, airborne and sincerely sorry about the shadow." | M8 |
| `slug_scrapper` | Slug Scrapper | scrapwake | ranged, organic | hum1, patched plates, scatter gun | scatter gun bullet 5x4 / 1.7 s / 16 u, spread .12 | none | H120 S3.1 $80, skirmish | beats close hover and drones; weak at range, vs domes | mismatched shoulder plates, hazard stripe | "Every weapon is three other weapons and a promise." | M1 (enemy) |
| `magnet_buggy` * | Magnet Buggy | scrapwake | cavalry, vehicle machine | car1, lopsided buggy with harpoon rig | harpoon `hook`: yank + stagger 1.2 s, range 16, cd8; rear gunner bullet 4 / 0.9 s | none | H260 S4.4 $150, flank | yanks shooters into melee; weak to domes, EMP, mortars | giant horseshoe magnet on a pole | "Steering optional. Magnets mandatory." | M1 (enemy) |
| `flak_pylon` * | Flak Pylon | scrapwake | siege, machine detector | gun1, AA mount with radar dish | flak burst explosive 12 aoe 2.5, air x3 ground x0.4, range 40 | `setup` 2 s; `detector` r12 air only | H180 S1.2 $160, siege | the AA answer; weak to ground rushes | twin barrels under a dish | "Teaches the sky some manners, one burst at a time." | M6 |
| `junk_tinker` | Junk Tinker | scrapwake | support, organic | hum1, tool-rack backpack and goggles | none | `heal_pulse` machine only 24 hp; `lay_mine` junk mine explosive 60 aoe 3, hidden, cd14, max 4 | H110 S2.8 $150, support | punishes tanks and mechs; hover units clear mines by design intent (fallback: ground-only trigger) | goggles, bristling tool-rack | "Lays mines labelled 'mine' so nobody can claim surprise. Somebody always claims surprise." | M6 |
| `hauler_suit` * | Hauler Suit | scrapwake | monster, machine suited giant | hum1 x2.4, cargo-frame parts | pallet-claw slam blunt 34 kb 8; rivet spray bullet 6, burst 4 / 18 u | none | H900 armor .45 S2.6 $420, charge | crushes infantry; weak to EMP (stuns the suit), rear | yellow-trim frame around a tiny cockpit | "Pilot is 1.6 metres. Suit is 6 metres. The pilot is in charge; the suit has been consulted." | M6 |
| `forge_trooper` | Forge Trooper | kilnworks | melee, organic heavy | hum1 x1.3, back-furnace tank | plasma torch cone fire dot 18 dps, 6 u | armor .5 | H320 S2.2 $190, charge | beats chitterlings, melee; weak to kiting skimmers and snipers | chimney puffing on the back | "Wears forty kilograms of armour so the flamethrower does not wear him." | M2 (enemy) |
| `plasma_mortar` * | Plasma Mortar | kilnworks | siege, machine | gun1, squat mortar at 70 deg | plasma lob arc high, energy 52 aoe 4, crater, minRange 14, range 60, cd 6 | none | H200 S1.0 $270, siege | punishes clumps and bridges; weak to flankers, cloaks, minRange | glowing bore, short barrel | "Has never seen its targets. Has strong feelings about them regardless." | M2 (enemy) |
| `strike_liaison` | Strike Liaison | kilnworks | support, organic | hum1, beacon staff and radio hood | holdout pistol 5 / 1.4 s / 14 u | `call_strike` aoe 5 dmg 120 explosive + crater, channel 1.2 s then **2.0 s telegraph**, range 45, cd24; killing it during the channel cancels | H100 S2.5 $240, support | deletes clumps and bosses; assassins and snipers cancel it | staff with a spinning beacon head | "Orders a bombardment from orbit the way others order lunch: loudly, with extras." | M8 |
| `the_magnate` [hero] | The Magnate | kilnworks | hero, shielded organic | hum1 x1.25, gold-trim power suit | heavy plasma carbine energy 26 aoe 1 / 1.6 s / 28 u | aura `banner` r10 +10% dmg; `eshield 260/20/4.0`; armor .5 | H520 S2.4 $420, hero | tank-hero; weak to rail and flank | gold trim, chimney epaulets | "Owns the mountain, the lava under the mountain and the lawsuit about the lava." | M8 |
| `slagback_crawler` * [B] | Slagback Crawler | kilnworks | monster, machine vehicle | tank1, oversized, four treads, kiln turret | siege cannon explosive 70 aoe 5 + crater / 5.0 s / 48 u | flame-vent aura fire r5 18 dps; `armorFace` front .7 side .4 rear .15 | H3000 S1.4 $880 | wipes swarms and clumps; weak to rear, EMP, blink assassins | live chimney flame, trailing smoke | "A kiln on tracks. Nobody has asked what it is baking." | M7 (ally) |

Faction counts: concord 6, hush 5, array 7, brood 6, scrapwake 5, kilnworks 5 = 34. Bosses: night_freight, pilot_light, quorum_queen, gale_leviathan, slagback_crawler (BOSS_CYCLE in that order). Heroes: marshal_vey, the_postmaster, the_magnate. Machines (EMP targets): rivet_bot, tally_bot, picket_eye, repair_crawler, glide_tank, foreman_mech, pilot_light, night_freight, glint_skimmer, magnet_buggy, flak_pylon, plasma_mortar, hauler_suit, slagback_crawler (14). Air layer: picket_eye, night_freight, gale_leviathan. Hover layer: glint_skimmer, glide_tank. Detectors: picket_eye (r16), flak_pylon (r12, air only), silent_signer self (r6). Bespoke parts and rigs stay within 48 parts: biggest are slagback (tank1 hull + 4 treads + turret about 20) and quorum_queen (insect1 about 16 + frill).

### 3a. Counter matrix (written BEFORE measuring; ER7 needs Wilson lower bound >= 55%, point >= 65%; "off" rows are the mechanic-off control)

| matchup at equal cost | designed result | teachable because |
|---|---|---|
| Warden line + Tender vs Tally Bots | line wins >= 65%; Tender removed <= 50% | chip fire resets delay; the Tender zeroes the delay (visible aura ring) |
| Tally Bots vs lone Pulse Troopers in the open | Bots win >= 60% | bubbles never get to refill under chip |
| Static Broker (1 per 8) vs Array army | broker side >= 75%; EMP off <= 45% | blue arcs, units slump, "OFFLINE" pip |
| Broker vs Brood or Concord | <= 50% (no effect) | pip never appears; scout code says "no machines" |
| Cloak squad (4) vs 3 Plasma Mortars | cloaked >= 70%; with 2 Picket Eyes <= 35% | scan rings are visible |
| 4 Flak Pylons vs 8 Picket Eyes | flak >= 70%; pylons without radar `setup` <= 40% | flak bursts are air-only, ring shows |
| Plasma Mortars (3) vs 40 Chitterlings | mortars >= 65%; vs 4 Glint Skimmers <= 30% | splash rings; minRange marker on the ground |
| Glint Skimmers (6) vs mortar line | skimmers >= 65%; vs 6 Wardens <= 35% | dome blocks beams head-on, baton punishes |
| Goo Spitters vs Warden line | spitters >= 60% | DOT green ticks bypass the bubble |
| Plow Beetle vs Warden line | beetle >= 55%; vs 2 mortars <= 40% | charge dust trail, dome shatters in one hit |
| Strike Liaison (1) + 4 Wardens vs 60 Chitterlings | >= 70%; liaison killed in channel <= 25% | red ring, 1.2 s channel bar over its head |
| Gale Leviathan vs ground-only army | leviathan >= 80%; vs 2 Flak >= 60% flak side | shadow blob, flak x3 |
| Pilot Light vs 3 Brokers + line | brokers+line >= 70%; EMP off <= 15% | Overheat kneel animation, +40% label |

### 3b. Decision map (what each unit makes the player decide)

- **Shield units** (Warden, Trooper, Skimmer, Marshal, Magnate): who is in front, who rotates out. **Tender vs Medic**: bubbles or bodies (the Tender fixes the 80% of damage that comes back for free; the Medic fixes the rest). **Broker**: wait for the clump, then press; mistimed EMP wastes a 16 s cooldown. **Signer/Postmaster**: spend the first shot (breaks cloak) on the Tender or the eye? **Eye/Pylon**: detectors are the answer to cloaks, so they are the first thing a cloak army shoots. **Skimmer/Runner**: reach versus soak: send them to the mortars or keep them as the second line. **Mortar/Liaison**: bait the clump, then commit; both are cancelled by assassins. **Hauler/Beetle/Mech**: the one big body per army that forces a Broker, a mortar or a rail shot. **Queen/Sacs**: spawners must die before the swarm is sensible. **Leviathan/Freight**: air bosses make flak non-optional.
- **Four Questions** (the composition grammar every Sci-Fi army must answer, shown in the placement panel as four chips): *What soaks? What cracks? What reaches? What answers?* Soak = shields and armour; Crack = rail, mortar, orbital, DOT; Reach = hover, blink, air; Answer = detector, EMP, flak, splash. A chip is grey if the army has no unit of that kind.

### 3c. Scout codes (CU14, era-specific; the lesson detectors use the same codes)

`all_shield` ("Every bubble, no cracker: they will outlast your patience"), `chip_heavy` ("Chip fire: they will never let your bubbles refill"), `no_detector` ("Nobody can see cloaks: send the quiet ones"), `no_answer_air` ("They have nothing for the sky"), `machine_heavy` ("Machines: switch them off"), `swarm_clump` ("A swarm on one square: splash it"), `dot_heavy` ("Acid ignores bubbles: kill spitters first"), `artillery_line` ("Mortars cannot see close: get close"), `single_boss` ("One very big problem: bring the right button").

## 4. Arenas (12)

All recipes obey W9 (<= 35 visible type/variant batches), W10 (vehicle corridors >= 6 cells), W8 (tall buildings at edges only), W11 (no armies start in range). Gravity is the `env.gravity` multiplier (W4). Sky presets: `env.sky`.

| id | name | size | theme / biome / env | signature features | objectives | set-piece suitability |
|---|---|---|---|---|---|---|
| `moon_annex` | Tranquil Annex | medium | moon / regolith / black sky, Earth, gravity 0.4, no weather | hab domes, solar fields, shallow craters, one airlock ridge | eliminate, hold_hill | earth-rise reveal, low-gravity knock-up shots |
| `spore_jungle` | Verdigris Canopy | large | alien jungle / moss / fog, spore weather, bio-glow | spore trees (canopy kept low in the corridor), glow ferns, a marsh strip (hover shortcut), egg clusters | kill_general, destroy, eliminate | queen emergence crane-up |
| `neon_strip` | The Neon Strip | medium | neon city / asphalt / night, rain | 8-cell road grid, canal with two bridges, neon towers on the edges only, holo signs | escort, eliminate, capture | chase-cam on the van |
| `wreck_gamma` | Crash Site Gamma | large | crashed ship / hull plate / dusk, smoke | long hull corridors, a leaking reactor trench, dropship wreck, debris lanes | kill_general, eliminate | slow push into the torn hull |
| `glacier_array` | Glacier Array | medium | ice world / snow / aurora, blizzard | ice spires, crevasse lines (deep water), relay dishes on a central rise | hold_hill, capture, eliminate | EMP ripple across ice |
| `cinder_forge` | Cinder Forge | medium | lava world / basalt / red dusk | lava river with 2 slag bridges, obsidian islands, geysers, forge works | capture, hold_hill, eliminate | crane-over-lava, geyser surge |
| `ring_station` | Ring Station Eleven (Out of Service) | medium | orbital station / hull plate / planet-lit, gravity 0.5 | ring corridor, airlocks, void gaps (deep black liquid), windows to space | survive_waves, defend_core, eliminate | top-down orbital strike |
| `hive_undercroft` | The Undercroft | medium | hive cavern / moss, bile / dim, bio-glow | hive walls with 3 chokepoints, 4 sac alcoves, a bile pool, egg clusters | destroy, eliminate, survive_waves | sac burst close-up |
| `salvage_dunes` | The Salvage Sea | large | desert junk-world / sand / sandstorm | dunes, wrecks, tow cranes, wide open (hover paradise), scrap heaps | eliminate, capture | storm-front reveal |
| `biodome_gardens` | Biodome Gardens | small | research dome / grass / noon, calm | glass-dome props, garden beds, one fountain; compact duel arena | eliminate (puzzles, Quick duels) | none (calm) |
| `relay_ridge` | Relay Ridge | medium | mountain pass / stone / storm, thunder | comm tower on a hill, stepped rock, one cliff path | hold_hill, kill_general | thunder-lit tower reveal |
| `spaceport_apron` | Spaceport Apron | large | spaceport / asphalt / dawn | landing pads, gantry cranes, container stacks, a reactor core pad (prop), wide air lanes | defend_core, eliminate, survive_waves | cloaked freighter shadow pass |

## 5. Props (38; `sf_` prefix, models at voxel 0.2 for hulls and domes, glow voxels for lights)

Shared `any` props reused with no new ids: none required. `blocks` full/none, `cover` stops beams and bullets below `h`, `hp` INF = hard, `flam` burns, role = destructible role.

| id | cat | blocks / cover | hp | flam | destructible role |
|---|---|---|---|---|---|
| `sf_spore_tree` | nature | full / cover | 140 | yes | soft; burns; canopy kept <= 4.5 u in fight corridors |
| `sf_glow_fern` | nature | none / no | 15 | yes | decor, glow |
| `sf_fungus_stalk` | nature | full / cover | 90 | yes | soft |
| `sf_crystal_cluster` | nature | full / cover | 220 | no | soft; shatters into glow shards |
| `sf_moon_rock` | nature | full / cover | INF | no | hard |
| `sf_ice_spire` | nature | full / cover | 160 | no | soft; shatters to ice shards |
| `sf_obsidian_slab` | nature | full / cover | INF | no | hard |
| `sf_vine_curtain` | nature | none / no | 20 | yes | decor |
| `sf_egg_cluster` | nature | none / no | 40 | yes | decor-destructible; pops with goo |
| `sf_hive_wall` | nature | full / cover | 400 | yes | soft; destroyed = new opening |
| `sf_hive_sac` | nature | full r1.2 / cover | 600 | yes | **objective target and spawner** (M7, M9); death goo burst |
| `sf_hab_dome` | architecture | full r3 / cover | 900 | no | soft; collapses to rubble |
| `sf_bulkhead_wall` | architecture | full r1 / cover | 700 | no | soft chain wall (Troy pattern) |
| `sf_blast_door` | architecture | full r2.2 / cover | 800 | no | gate: passable for owner team (`info.gate`), `destroy` target |
| `sf_airlock_arch` | architecture | none / no | 500 | no | decor arch, splash-only |
| `sf_comm_tower` | architecture | full r1.2 h10 / cover | 600 | no | soft; hill landmark, destroy target |
| `sf_neon_tower` | architecture | full r2.5 h12 / cover | 1100 | no | soft; edge-only (readability rule) |
| `sf_neon_sign` | architecture | none / no | 60 | no | decor; sparks when shot |
| `sf_landing_pad` | architecture | none / no | INF | no | decor, flat |
| `sf_gantry_crane` | architecture | full r.8 h9 / cover | 500 | no | soft |
| `sf_solar_array` | architecture | full r1.2 h1.4 / low cover | 150 | no | soft, partial cover |
| `sf_force_gate` | architecture | full r1.8 / cover | INF | no | **script-removable** energy wall (switch/EMP); decor if cut |
| `sf_cargo_container` | props | full r1.4 h2.6 / cover | 260 | no | soft; stacks in 2 variants |
| `sf_fuel_tank` | props | full r.9 / cover | 120 | yes | **explosive** r4 dmg 90; chain reaction |
| `sf_supply_pod` | props | full r.5 / no | 60 | no | soft; drop-pod landing prop |
| `sf_scrap_heap` | props | full r1 / cover | 180 | no | soft |
| `sf_holo_beacon` | props | none / no | INF | no | decor; marks hills and capture points |
| `sf_teleport_pad` | props | none / no | INF | no | paired blink pad (cuttable rung 5; decor if cut) |
| `sf_lava_vent` | props | none / no | INF | no | decor with steam emitters |
| `sf_shield_pylon` | props | full r.5 / cover | 400 | no | soft; glows, pure cover |
| `sf_conduit_cable` | props | none / no | 30 | no | decor; sparks on death |
| `sf_drone_dock` | props | full r1 / cover | 200 | no | soft; Array flavour |
| `sf_reactor_core` | props | full r2.5 h5 / cover | 3000 | no | **defend_core target**, team-owned; explosive r8 dmg 160 on death |
| `sf_wrecked_hull` | monuments | full r5 h8 / cover | INF | no | hard |
| `sf_dish_array` | monuments | full r3 h8 / cover | 900 | no | soft; relay landmark |
| `sf_dropship_wreck` | monuments | full r4 h5 / cover | 800 | no | soft |
| `sf_alien_spire` | monuments | full r2.2 h9 / cover | INF | no | hard; Brood landmark |
| `sf_station_strut` | monuments | full r1.5 h10 / cover | INF | no | hard (ring station) |

## 6. Campaign: nine missions, three acts

**Acts.** I "Orientation Is Mandatory" (shields, lava and a convoy; "Please keep arms and legs inside the hover."). II "Hostile Environments" (cloaks, machines and things that fall out of the sky; "Terms vary by planet."). III "Contact, Roughly" (hives, orbit and a queen; "The aliens were never the plot twist. They were the plot.").

**Closed star-helper vocabulary** (proposed): `usedMechanic(id,n)` (id in `blink cloak emp call_strike hover_cross`), `shieldsBroken(n)` (enemy breaks >= n), `ownBreaksAtMost(n)`, `cloakedKills(n)`, `empStunned(n)` (distinct machines), `airKills(n)`, `sacsDestroyed(n)`, `thrift(par)`, `underTime(s)`, `noLoss(defs)`, `keptAlive(def,n)`, `allOf(a,b)`. **Star 2 everywhere is the engine's generic rule** (win with >= 50% of army cost alive). Currency = scrip. Par = scrip spent. "Blind bot" = the mechanic-blind variant of `campaign_play` (must lose >= 70%).

**Mechanic ladder and cognitive load** (one new mechanic per mission; finales combine >= 2 earlier; star 3 only tests earlier mechanics or a generic helper):

| # | mission | teaches (new) | tested in (later star/beat) | active mechanics | attempts star1 / star3 |
|---|---|---|---|---|---|
| 1 | welcome to the moon | shield cycle | M2 star3, M3 star3 | 1 | 1.1 / 1.8 |
| 2 | floor is lava | hover | M9 beat | 2 | 1.4 / 2.6 |
| 3 | convoy (act finale) | blink | M4 star3 | 3 (shield, hover, blink) | 1.8 / 3.4 |
| 4 | quiet wreck | cloak and detection | M5 star3 | 3 | 1.6 / 3.2 |
| 5 | have you tried | EMP | M6 star3 | 3 | 1.7 / 3.0 |
| 6 | air traffic (act finale) | air layer and anti-air | M8 star3 | 4 (EMP, cloak, air, shield) | 2.4 / 4.2 |
| 7 | mother knows best | spawners (kill the source) | M9 star3 | 3 | 1.7 / 3.0 |
| 8 | orbital strike | call_strike and dodging | M9 star3 | 4 | 2.2 / 4.0 |
| 9 | queen size (finale) | none | spawners + strike + hover + cloak + air | 5, every one with its tell | 3.2 / 6.0 |

Objective types used: eliminate, capture, escort, kill_general (x2), hold_hill, defend_core, destroy, survive_waves (8 distinct, need >= 5). Every mission has: a script event, a 3-6 s camera shot, an announcer slot `campaign_<id>`, a stinger, sfx, a teaching beat and a real reward.

### M1 `sf_welcome_moon`, "Welcome to the Moon (Terms Apply)"
- Act I, **eliminate**, `moon_annex` seed 21, medium. Player `concord`, roster `bulwark_warden pulse_trooper tether_medic`, budget 2800, par 2100, limit 300 s. Reference: 8 Warden, 12 Trooper, 3 Medic.
- Enemy `scrapwake` "claim jumpers", 2 scripted waves with a 25 s lull: wave 1 eight `slug_scrapper`; wave 2 six `slug_scrapper` + two `magnet_buggy`. No boss.
- **Teaches the shield cycle** (the lull exists to show the bubbles refilling while hp does not). **Tests** nothing earlier. Star 2 generic. **Star 3 `thrift(2100)`**: "Win spending under 2,100 scrip. Frugal is the new fearless in a vacuum."
- **Set-piece** `sf_lull`: script event `beat` when wave 1 dies. Camera: 4 s slow orbit of the nearest dome with Earth behind, shields visibly sweeping back to full. Announcer slot `campaign_sf_welcome_moon.lull`. Stinger `sf_calm_sting` (soft synth swell). sfx: airlock hiss, shield recharge sweep.
- **Reward:** Workshop part `sf_hex_pauldron` (glowing shoulder emitter); title "Orientation Survivor"; codex `bulwark_warden`, `slug_scrapper`.
- Blind bot (never rotates): loses ~70% to wave 2; reference wins >= 90%.
- Briefings: **Brutus** "THE MOON! Low gravity, high stakes, and a force field that comes back after a short nap!" **Plato** "A bubble that returns when nobody strikes it. Is that courage, or patience with a power supply?" **Cassandra** "They come in two waves. Between them there is a gap. The gap is the lesson. Nobody reads the gap."

**First three minutes (plumbing slice script).** 0:00 arrival card over the dome orbit, skippable; 0:12 placement beat (Plato): "Wardens in front, Troopers behind. The bubble faces the enemy"; scout panel: "Claim jumpers: no shields. Yet." (Cassandra); 0:50 FIGHT, contact about 0:58; beat (Brutus) "Watch the BUBBLES flash when they are hit!"; first `shield_break` (or 1:20 at the latest) beat (Plato): "A broken bubble stays broken until nobody hits it. Rotate a fresh Warden forward."; 1:35 wave 1 down, lull, beat (Cassandra): "Look. The bubbles are full. The bodies are not. That is the whole game."; 1:55 Medic beat: "Medics mend bodies. Bubbles mend themselves."; 2:00 wave 2, buggies yank a Warden; beat: "Harpoons pull you out of the dome. Keep the dome between you and the magnets."; about 2:50 victory; results lesson: "Your shields refilled 9 times. Your hit points, zero. Rotate."

### M2 `sf_floor_is_lava`, "The Floor Is Lava (Management Accepts No Liability)"
- Act I, **capture** (3 relay points on islands; hold all three together 12 s), `cinder_forge` seed 23, medium. Player `concord`, roster `pulse_trooper bulwark_warden glint_skimmer tether_medic shield_tender`, budget 4200, par 3300, limit 300 s. Reference: 8 Skimmer, 10 Trooper, 6 Warden, 2 Medic, 3 Tender.
- Enemy `kilnworks`: 12 `forge_trooper` on the islands, 4 `plasma_mortar` shelling the two slag bridges. No boss.
- **Teaches hover** (skimmers cross lava, ground troops can use the shelled bridges). **Tests** the shield cycle. **Star 3 `ownBreaksAtMost(10)`**: "At most ten of your own shields broken. Rotate; do not martyr."
- **Set-piece** `sf_geyser_surge`: at 60 s a script `weather`/hazard burst fires geysers along the river. Camera: crane-over-lava following the first skimmer across (4 s). Announcer `campaign_sf_floor_is_lava.cross`. Stinger `sf_hover_sting`. sfx: lava hiss, turbine whine.
- **Reward:** part `sf_forge_visor`; title "Hover Hustler"; codex `forge_trooper`, `plasma_mortar`, `glint_skimmer`, `shield_tender`.
- Blind bot (all ground, no skimmers): crosses two shelled bridges and loses ~70%.
- Briefings: **B** "LAVA! A river of it! And your skimmers have NEVER touched the ground, so they win by default!" **P** "If the floor is lava and you never touch the floor, was it ever a floor?" **C** "The bridges are shelled by mortars. I mentioned the bridges. A man walked onto one and gave me a thumbs up."

### M3 `sf_convoy_regret`, "Convoy of Regret (Deliveries Are Final)" (ACT FINALE)
- Act I, **escort** (hover freight van "The Parcel", an unarmed `glint_skimmer` override, hp 600, to the `exit` across the strip), `neon_strip` seed 25, medium. Player `mixed` (Hush hired by Concord), roster `parcel_runner bulwark_warden pulse_trooper glint_skimmer tether_medic`, budget 5200, par 4000, limit 240 s. Reference: 8 Runner, 6 Warden, 10 Trooper, 4 Skimmer, 3 Medic.
- Enemy `concord` "the Reserve", acting on a memo: 8 `bulwark_warden`, 12 `pulse_trooper`, 2 `shield_tender`, 4 `glint_skimmer` in three ambush squads on the road, led by `marshal_vey` (not a kill target).
- **Teaches blink** (Runner blinks over barricades and the canal; telegraph ring at both ends). **Combines** shields (the Reserve is shielded: learn to crack them) and hover (the van crosses the canal). **Star 3 `shieldsBroken(14)`**: "Crack fourteen Reserve shields along the way. They are very proud of them."
- **Set-piece** `sf_chase`: script event `setpiece` as the van leaves the depot. Camera: chase-cam behind the van, 5 s. Announcer `campaign_sf_convoy_regret.start`. Stinger `sf_chase_sting` (percussive arp). sfx: sirens, hover whine, canal splash.
- **Reward:** era mutator `sf_overcharge`; Quick unlock `marshal_vey`; title "Courier of Regret"; codex `parcel_runner`, `marshal_vey`.
- Blind bot (no blink): barricades hold, van stalls, loses ~70%.
- Briefings: **B** "A CONVOY! One precious parcel, three ambushes, and Marshal Vey, who has been told YOU are the problem by a memo!" **P** "He fights you because a memo said so. Is obedience a kind of blindness, or merely a very small font?" **C** "The memo was a typo. Nobody will fix it until it is too late. Press blink at the barricade."

### M4 `sf_quiet_wreck`, "The Quiet Wreck (Please Do Not Wake the Foreman)"
- Act II, **kill_general** (`foreman_mech`, asleep on `hold`), `wreck_gamma` seed 26, large. Player `hush`+loaners (`mixed`), roster `parcel_runner silent_signer the_postmaster pulse_trooper tether_medic`, budget 5000, par 3800, limit 300 s. Reference: 6 Runner, 4 Signer, 1 Postmaster, 8 Trooper, 3 Medic.
- Enemy `array`: `foreman_mech` (general), 16 `rivet_bot`, 10 `tally_bot`, 4 `picket_eye` (the detectors), 2 `repair_crawler`. First use of the Array.
- **Teaches cloak and detection** (cloaked units are invisible unless within 16 u of an eye; attack breaks cloak). **Tests** blink. **Star 3 `usedMechanic(blink,6)`**: "Blink six times. The Foreman admires a good commute."
- **Set-piece** `sf_foreman_wakes`: script event `setpiece` when the Foreman first takes damage: vent steam, he stands, ground-shake. Camera: slow push into the torn hull, then up the Foreman's legs (5 s). Announcer `campaign_sf_quiet_wreck.wake`. Stinger `sf_stealth_sting`. sfx: metal groan, servo spin-up, cloak shimmer.
- **Reward:** Quick unlock `the_postmaster`; part `sf_cloak_hood` (hood with a shimmer paint); codex `foreman_mech`, `picket_eye`, `silent_signer`, `rivet_bot`.
- Blind bot (ignores eyes): is spotted at once and loses ~75%.
- Briefings: **B** "A CRASHED STARSHIP! A sleeping eleven-metre Foreman! And you, sneaking, in a coat, with a rail rifle!" **P** "Invisible, you may do anything. Does that make a thief of every unseen man, or only the ones in coats?" **C** "Floating eyes see through cloaks. Shoot the eyes first. I said eyes. The eyes remember."

### M5 `sf_turn_them_off`, "Have You Tried Turning Them Off? (Glacier Array)"
- Act II, **hold_hill** (the relay dish rise, 100 s total, clock stops while an enemy stands on it), `glacier_array` seed 28, medium. Player `mixed`, roster `static_broker bulwark_warden pulse_trooper shield_tender silent_signer tether_medic`, budget 6500, par 5200, limit 330 s. Reference: 5 Broker, 8 Warden, 14 Trooper, 4 Tender, 5 Signer, 4 Medic.
- Enemy `array` in three waves 30 s apart: W1 14 `rivet_bot` + 8 `tally_bot`; W2 3 `glide_tank` + 10 `tally_bot`; W3 **`pilot_light`** + 2 `glide_tank` + 10 `rivet_bot`. Boss: Pilot Light (Overheat).
- **Teaches EMP.** **Tests** cloak. **Star 3 `cloakedKills(5)`**: "Five kills from cloak. The ice is full of invisible opinions."
- **Set-piece** `sf_overheat`: first EMP on the Pilot Light triggers the Overheat kneel. Sim slowed to 0.5x, camera: wide shot as the blue EMP ripple travels across the ice and the giant kneels (4 s). Announcer `campaign_sf_turn_them_off.kneel`. Stinger `sf_powerdown_sting`. sfx: sub thump, static crackle, power-down droop.
- **Reward:** Quick unlock `pilot_light`; part `sf_antenna_rack` (back item); title "Off And On Again"; codex `static_broker`, `glide_tank`, `pilot_light`.
- Blind bot (no Brokers): the mech and tanks walk through chip fire, loses ~80%.
- Briefings: **B** "A GLACIER! A relay hill! And a mech so big the hill is mostly afraid!" **P** "A machine that cannot feel is stopped by a switch. Is a soul a thing you can turn off, and who holds the switch?" **C** "The Pilot Light comes last. Wait until it is near, then press the button. As foretold."

### M6 `sf_air_traffic`, "Air Traffic Control (Mostly Control)" (ACT FINALE)
- Act II, **defend_core** (`sf_reactor_core`, hp 3000, 4 air-and-ground waves), `spaceport_apron` seed 30, large. Player `mixed`, roster `flak_pylon slug_scrapper junk_tinker hauler_suit pulse_trooper bulwark_warden shield_tender static_broker tether_medic`, budget 7500, par 5800, limit 330 s. Reference: 5 Flak Pylon, 6 Scrapper, 3 Tinker, 2 Hauler, 8 Trooper, 5 Warden, 3 Tender, 3 Broker. AA guaranteed by the roster validator.
- Enemy `array` + `hush`: W1 12 `picket_eye` + 10 `rivet_bot`; W2 12 `picket_eye` + 2 `glide_tank` + 10 `tally_bot`; W3 **`night_freight`** (cloaked) + 8 `picket_eye` + 14 `rivet_bot`; W4 16 `picket_eye` + `foreman_mech` + 3 `glide_tank`.
- **Teaches the air layer and anti-air** (flak x3 vs air, pulse rifles hit air, ground-only artillery cannot). **Combines** EMP (drones fall for 3 s), cloak (the Freight: the Pylon's radar reveals it) and shields. **Star 3 `empStunned(6)`**: "Switch off six machines. Each one will want an apology."
- **Set-piece** `sf_freight_pass`: W3 start, the Freight decloaks over the apron. Camera: low angle looking up at its shadow crossing the core pad (4 s). Announcer `campaign_sf_air_traffic.freight`. Stinger `sf_alarm_sting`. sfx: rotor thump, klaxon, cloak drop.
- **Reward:** era mutator `sf_blackout`; Quick unlock `night_freight`; title "Air Marshal (Unlicensed)"; part `sf_radar_visor`; codex `flak_pylon`, `junk_tinker`, `hauler_suit`.
- Blind bot (no flak, ground only): the Freight and eyes strafe unopposed, loses ~85%.
- Briefings: **B** "AN AIR RAID at the spaceport! Drones! A cloaked gunship named after a delivery! The reactor is out of insurance!" **P** "An air traffic controller says no to very large objects. Today we say it with flak." **C** "I predicted the drones. The drones predicted me. Nobody predicted the gunship; it was invisible."

### M7 `sf_mother_knows`, "Mother Knows Best"
- Act III, **destroy** (4 `sf_hive_sac`, hp 600, each spawns 3 `chitterling` every 8 s up to 40; then eliminate remaining), `hive_undercroft` seed 31, medium. Player `mixed` (Kilnworks + Concord), roster `forge_trooper plasma_mortar bulwark_warden pulse_trooper tether_medic`, budget 6800, par 5400, limit 300 s. Fixed free ally: **`slagback_crawler`** (on loan, "do not ask what it is baking"). Reference: 6 Forge Trooper, 4 Mortar, 6 Warden, 10 Trooper, 3 Medic.
- Enemy `brood`: stream of chitterlings from the sacs, 8 `blade_stalker`, 6 `goo_spitter`, 2 `plow_beetle`.
- **Teaches spawners (kill the source).** **Tests** the shield cycle at pressure. **Star 3 `underTime(150)`**: "Burn all four sacs inside 150 seconds. Mother does not like to be kept waiting."
- **Set-piece** `sf_sac_burst`: first sac death. Camera snap to the sac as it bursts (3 s). Announcer `campaign_sf_mother_knows.burst`. Stinger `sf_squelch_sting`. sfx: wet pop, goo splat, chitter chorus cut off.
- **Reward:** Quick unlock `slagback_crawler`; part `sf_chitin_pauldron`; title "Pest Control (Licensed)"; codex `chitterling`, `plow_beetle`, `goo_spitter`, `blade_stalker`.
- Blind bot (ignores sacs, fights the stream): the swarm never ends, loses ~80%.
- Briefings: **B** "A HIVE! Four egg sacs! A flamethrower crawler on LOAN and nobody asked what it was baking!" **P** "The brood multiplies until the source is removed. Is it a hive, or a committee with wings?" **C** "Burn the sacs first. The swarm is only the sacs, talking. I said so the last time the sacs spoke."

### M8 `sf_orbit_extra_steps`, "Orbital Strike (Extra Steps Included)"
- Act III, **survive_waves** (4), `ring_station` seed 33, medium. Player `mixed`, roster `strike_liaison the_magnate plasma_mortar forge_trooper bulwark_warden shield_tender flak_pylon pulse_trooper tether_medic`, budget 9000, par 7200, limit 420 s. Reference: 3 Liaison, 1 Magnate, 3 Mortar, 6 Forge, 8 Warden, 3 Tender, 3 Flak, 8 Trooper, 3 Medic.
- Enemy: W1 60 `chitterling` + 6 `blade_stalker`; W2 `foreman_mech` + 14 `tally_bot` + 8 `picket_eye`; W3 4 `plow_beetle` + 10 `goo_spitter` + 8 `blade_stalker`; W4 **`gale_leviathan`** + 40 `chitterling` + 6 `goo_spitter`. The station AI fires its own strikes at both armies every 18 s (2 s red ring, 90 dmg, r4).
- **Teaches call_strike and strike dodging.** **Tests** the air layer. **Star 3 `airKills(6)`**: "Shoot down six flyers. The Leviathan counts as one, with feelings."
- **Set-piece** `sf_first_strike`: first strike lands. Top-down camera drop from y 60, sim 0.5x for 3 s. Announcer `campaign_sf_orbit_extra_steps.strike`. Stinger `sf_orbital_sting`. sfx: charge whine, pillar thunder, glass crack.
- **Reward:** Quick unlock `the_magnate` and `gale_leviathan`; part `sf_beacon_staff` (weapon); title "Orbital Concierge"; codex `strike_liaison`, `the_magnate`, `gale_leviathan`.
- Blind bot (never calls strikes, stands in rings): loses ~75%.
- Briefings: **B** "AN ORBITAL STRIKE! From SPACE! With a liaison! And forms! The forms are IN the strike!" **P** "Fire from above, the oldest ambition, finally correctly priced. Who invoices the sky?" **C** "The station fires on both sides. The red circle lasts two seconds. I counted. Two."

### M9 `sf_queen_size`, "Queen Size (The Final Contract)" (FINALE)
- Act III, **kill_general** (`quorum_queen`, asleep on `hold`), `spore_jungle` seed 35, large. Player `mixed`, roster any (null), budget 12000, par 9600, limit 420 s. Reference: 4 Liaison, 3 Mortar, 6 Skimmer, 6 Warden, 4 Tender, 5 Signer, 3 Flak, 8 Trooper, 3 Medic, 1 Magnate.
- Enemy `brood`: Queen on a cushion of 3 sacs (stream of chitterlings), 6 `plow_beetle`, 14 `blade_stalker`, 10 `goo_spitter`; at 90 s a script `spawn` brings `gale_leviathan`; at 75/50/25% the Queen calls 10 chitterlings.
- **Teaches nothing new; combines** spawners, call_strike, hover (the marsh strip), cloak (reach the court) and air. **Star 3 `allOf(sacsDestroyed(3), usedMechanic(call_strike,2))`**: "Burn three sacs and call two strikes before the Queen falls. A tidy apocalypse."
- **Set-piece** `sf_queen_rises`: two events. First sight: crane-up reveal of the Queen on her cushion (5 s). Death: slow-mo collapse, sim 0.5x (4 s). Announcer `campaign_sf_queen_size.rise` and `.fall`. Stingers `sf_boss_sting`, `sf_victory_sting`. sfx: roar, egg-sac chorus, deep hum fade.
- **Reward:** Quick unlock `quorum_queen`; part `sf_queens_crown` (silly helm); codex page "The Provisional Reach, Annotated"; title "Provisional Hero"; finale card (section 10).
- Blind bot (ignores sacs and strikes): the stream and the Leviathan overrun, loses ~85%.
- Briefings: **B** "THE QUEEN! On a cushion of eggs and a meeting that never ends!" **P** "She is the quorum. Without her, does the colony vote, or merely hum?" **C** "She calls the Leviathan at ninety seconds. I did predict it. At ninety. All right, ninety-one."

### 6a. Difficulty curve and replay value
- Concurrent mechanics stay <= 3 until M6 (4) and reach 5 only in M9, where every one has its tell on screen. Attempt targets rise 1.1 to 3.2 (star 1) and 1.8 to 6.0 (star 3); autofill bot <= 60% act I, <= 40% acts II and III; the reference army wins >= 60% of seeds, every star is earned by some bot.
- After 2 defeats the briefing offers the reference army; after 4 it also reveals the enemy composition (no star cost).
- Star 3s ask for **different play styles** (thrift, rotation, shield-cracking, blinking, assassination, EMP, speed, anti-air, combos). Replay hooks: 11 mutators (9 shared + `sf_overcharge`, `sf_blackout`), Quick factions with the Four Questions chips, per-mission "no-break run" bragging (stat only), Survival with 5 bosses that each need a different answer, Daily with an era-picker stream, 6 puzzles with par and a bonus.

## 7. Puzzles (6; hand-placed enemy, restricted roster, no god powers)

| id | name | taught | setup | trick (the aha) |
|---|---|---|---|---|
| `sf_p_bubble_math` | Bubble Math | shield cycle | `biodome_gardens`; roster Warden, Trooper, Tender; budget 1500, par 1200; enemy 10 `tally_bot` in two clumps; eliminate | a Tender directly behind two Wardens (delay 0.6 s) turns chip fire into nothing; spreading out loses. Bonus: lose no unit |
| `sf_p_lava_taxi` | Lava Taxi | hover | `cinder_forge`; roster Skimmer, Trooper; budget 1600; enemy 3 `plasma_mortar` + 4 `forge_trooper` on an island; capture | skimmers inside the mortars' minRange 14 are safe; approach from the lava side, not the bridge. Bonus: no skimmer lost |
| `sf_p_blink_once` | Blink Once, Apologise Twice | blink | `ring_station`; roster 3 `parcel_runner`; enemy 2 `plasma_mortar` behind a bulkhead + 4 `pulse_trooper`; eliminate in 60 s | blink over the wall into mortar minRange, kill, blink out. Bonus: under 40 s |
| `sf_p_off_switch` | The Off Switch | EMP | `glacier_array`; roster 2 `static_broker`, Warden, Trooper; enemy `foreman_mech` + 8 `rivet_bot`; eliminate | wait until the mech and bots are inside r7, then one channel; firing early wastes the 16 s cooldown. Bonus: broker survives |
| `sf_p_flak_you` | Flak You | air and AA | `spaceport_apron`; roster 2 `flak_pylon`, Tinker, Scrapper; enemy 12 `picket_eye` in a stream; defend a pad for 60 s | Pylons need 2 s setup, so place them before the stream and behind the Scrapper line. Bonus: no pylon lost |
| `sf_p_one_big_ask` | One Big Ask | orbital strike and spawner | `hive_undercroft`; roster 1 `strike_liaison`, 4 `bulwark_warden`; enemy 60 `chitterling` on one sac; destroy the sac | bait the swarm into one pile with a Warden, keep the Liaison behind a dome so the 1.2 s channel is not cancelled. Bonus: strike kills >= 40 |

Stored solutions via `solve_puzzles --era=scifi`; 100 random legal armies win <= 15%, star 3 <= 5%.

## 8. God powers (6, stable slots) and the intern gag

Schema `{id, slot, name, icon, blurb, joke, kind, cd, delay, r, dur, effect, telegraph, cue}`. Each maps to an existing effect family and keeps Ancient ids untouched.

| slot | id | name | family | effect | telegraph | cd class | tooltip joke |
|---|---|---|---|---|---|---|---|
| 1 quick strike | `sf_ion_bolt` | Ion Bolt | zeus_lightning | 90 energy aoe 3, chains to 4 | thin cyan ring plus vertical line, 0.35 s | short (6 s) | "A very small bolt from orbit. The big one is next door. Zeus's intern put them in the wrong order." |
| 2 big strike | `sf_orbital_strike` | Orbital Strike | meteor | 140 explosive aoe 5 + crater r4 | rotating red ring, descending line, 2.0 s | long (20 s) | "Requested on a form. Zeus's intern pressed Submit. Twice. Please stand elsewhere." |
| 3 area control | `sf_gravity_hiccup` | Gravity Hiccup | earthquake | 5 s, r14: stagger, slow, props damaged | violet ring pulsing, 5 s | very long (30 s) | "Installed upside down by Zeus's intern. Works on everyone equally. Mostly slower." |
| 4 heal / repair | `sf_maintenance_window` | Maintenance Window | heal_wave | r12: +60 hp organics, +60 repair machines, shields 50% | green hex ring, 0.6 s | long (25 s) | "A scheduled maintenance, scheduled by Zeus's intern for 'eventually'. Eventually is now." |
| 5 status | `sf_emp_surge` | EMP Surge | wine_rain (status zone) | r12, 8 s: machines stunned in pulses, shields zero | blue static ring, 0.4 s | very long (30 s) | "Switches off every machine in range. Last used on the intern's coffee machine, with historic results." |
| 6 summon / reinforce | `sf_brood_in_a_box` | Brood in a Box | raise_chickens | drop pod: 10 `chitterling` for the caster's team | pod shadow, 0.6 s | short (15 s) | "Ten chitterlings, tamed for the afternoon. They were told you are family. They were not told for how long." |

Mascot unit for the era kit (watchdog gift and slot 6): `chitterling`. Stalemate intervention kind `button`: an orbital ping on both armies, then a gift-wrapped pod delivers one chitterling and the announcer sighs. **The intern gag** is offstage only: named in the arrival card, these six tooltips and the chooser caption ("Sci-Fi: the Provisional Reach. Filed under 'Future' by Zeus's intern."); no portrait, no fourth voice, never named in the finale.

## 9. Mutators and achievements

**Era mutators.**
- `sf_overcharge` "Overcharge": shield caps x1.6, regen delay x0.6, but every shield break emits a shock ring (r3, stagger, 20 dmg, friend or foe; one chain per tick). Chip "Bubbles huge, breaks loud." Locked: "Locked. Clear Convoy of Regret and your shield will outgrow your ego." Unlock: M3.
- `sf_blackout` "Blackout": night, detection radius x0.5, cloak duration x2, EMP radius +50%; every tell stays visible (rule: no mutator may hide a tell). Chip "Lights off, cloaks on." Locked: "Locked. Clear Air Traffic Control; the lights will be off until then." Unlock: M6.
- Matrix (CU16): Blackout disables nothing; Overcharge x Moon Gravity allowed (knock-up shock rings); both disabled in puzzles.

**Achievements (12; ids `sf_*`).**
1. `sf_first_contact` "First Contact (Paperwork Pending)": win a Sci-Fi battle.
2. `sf_crack_pot` "Crack Pot": break 100 enemy shields (lifetime).
3. `sf_untouchable` "Untouchable (Terms Apply)": win a battle of >= 20 units with zero of your own shield breaks.
4. `sf_turn_it_off` "Have You Tried Turning It Off?": EMP 15 machines in one battle.
5. `sf_now_you_dont` "Now You Don't": 10 kills from cloak in one battle.
6. `sf_not_the_floor` "Technically Not The Floor": hover units cross water or lava 100 times (lifetime).
7. `sf_excuse_me` "Excuse Me, Pardon Me": blink 25 times in one battle.
8. `sf_orbital_concierge` "Orbital Concierge": 20 kills with one orbital strike.
9. `sf_air_traffic` "Air Traffic (Control Optional)": 10 air kills in one battle.
10. `sf_pest_control` "Pest Control": destroy 10 hive sacs (lifetime).
11. `sf_soul_search` "Does It Have A Soul?" (hidden): win with only machines alive; Plato debates it.
12. `sf_provisional_hero` "Provisional Hero": finish the Sci-Fi campaign. (The 27-star title is the cross-era `overachiever`.)

## 10. Humour

**Three comedic engines** (Ancient's bureaucratic understatement is not primary).

1. **Confident technobabble**: jargon that is internally consistent and wrong, delivered as settled fact.
   - Plato: "The shield has been re-phased against the mood of the reactor. This is normal. The reactor says so."
   - Cassandra: "Diagnostics report minor anomalies. The anomalies report that they are the diagnostics."
   - Brutus: "They are RE-BRACKETING the manifold! Is that good?! Plato, is that good?!"
   - Picket Eye death: "Logging cause of death as: operating as intended."
   - Results lesson: "Your shields refilled 14 times. That is not luck. That is a three-second delay and good manners."
2. **Literal machines and over-helpful prompts**: every device narrates itself and takes the instructions personally.
   - Shield bark: "Shield at twelve percent. Please enjoy the remaining twelve percent."
   - Tally Bot: "Four. Four. Four. Four. (Four.)"
   - Pilot Light on entry: "Warning: I am a warning."
   - Plato: "A robot that says 'I am sorry' and means nothing. A man who says it and means nothing. One of them has a warranty."
   - Rivet Bot death: "Task incomplete. Unit incomplete. Dignity... buffering."
3. **Trailer grammar and genre bingo**: the commentators name every cliche the moment it happens, with total sincerity.
   - Brutus: "IN A WORLD... where the shield comes back... but only after three seconds of NOBODY hitting it!"
   - Plato: "The lone scientist has opened the suspicious box. Predictably. Which of us has not?"
   - Cassandra: "In the original script, the quiet one lives. This is not the original script."
   - Brutus: "The ALIEN QUEEN! Obviously a metaphor! For what, we will learn in the sequel!"
   - Victory: "Roll credits. Please do not roll the credits yet. The Queen is still in them."

**Time-travel arc.**
- *Arrival card* (first entry, skippable, caption names the intern): "ERA FOUR: THE PROVISIONAL REACH." Brutus: "WE ARE IN SPACE! Brutus has a new headset! It is TRANSLUCENT!" Plato: "The lasers are not javelins. We checked. Nobody could tell us what they are instead." Cassandra: "I predicted the robots. Nobody listened. Again." Caption: "Time travel provided by Zeus's intern. No refunds. No returns. Possibly no Tuesdays."
- *Act I* (M1-M3): they adjust. Brutus asks if lasers are just very loud javelins; his headset is half a second behind the action ("lag" gag). *Act II* (M4-M6): Plato argues the robot soul, then discovers a robot has politely beaten him at it; Brutus's headset keeps announcing battery levels. *Act III* (M7-M9): Cassandra starts being right about the aliens and, for the first time, slightly pleased; Brutus's headset finally updates.
- *Finale payoff* (era-independent surfaces: the "all four eras cleared" card, Credits, What's New): a hold-music card, no intern named. "Time travel update 1 of infinity: your commentators have been returned to the wrong century. Please remain seated. Brutus: 'It says UPDATING! That is the best word I have ever read!' Plato: 'I suspect the update is also the problem.' Cassandra: 'I predicted the update.'" Credits line: "Sci-Fi: shields by Concord, tea by nobody, regrets by Hush."

**Eight callback pairs** (setup-free line first; gated line renders only if the one source boolean is set).

| # | setup-free (funny cold) | gated (needs source) |
|---|---|---|
| 1 | Brutus: "Plato, are lasers just very loud javelins?" Plato: "No. Javelins at least have the decency to arrive late." | source `unit:peltast`: Brutus: "A peltast would be furious: no run-up, no javelin, and it still hits." |
| 2 | Plato on a Rivet Bot: "A soul it does not have, yet it has a schedule. Which of us is better equipped?" | source `unit:philosopher`: "My colleague the Philosopher confused the front rank. This machine confuses the philosophy." |
| 3 | Cassandra: "I predicted the robots. Nobody listened. Again." | source `ach:zeus_left`: "Zeus predicted nothing and left. Whoever pressed the button predicted nothing and stayed." |
| 4 | Plato on Chitterlings: "A swarm that thinks as one. I have not met such unity in a senate." | source `unit:sacred_chicken`: "I have met a chicken like this. The chicken also called a meeting." |
| 5 | Brutus sponsor: "Brought to you by Orbit Pizza: now with 12% less atmosphere!" | source `src:pompeii_pizza`: "Pompeii Pizza has been acquired by Orbit Pizza. The ash is now zero-gravity." |
| 6 | Brutus on the Leviathan: "A DRAGON! Or the nearest thing to it with a hull number!" | source `era:medieval_visited`: Plato: "Last era, a dragon over a keep. This era, a dragon with a docking permit." |
| 7 | Cassandra on Glide Tanks: "I predicted these floating tanks. Nobody asked how they float." | source `era:modern_visited`: "In the last era I predicted tanks. Now they float. I am not any happier." |
| 8 | Brutus: "Somebody pressed the wrong button in the wrong century, and it was NOT any of us!" | source `stat:zeusRagequits`: Cassandra: "Zeus left five times in the first era. Whoever pressed the button has not left once." |

**Survival wave names (20).** The Boot Sequence; Mild Turbulence; Unscheduled Arrivals; The Firmware Update; Low Battery, High Spirits; Static On The Line; Debris With Opinions; A Swarm, Politely; Maintenance Hatch Mob; The Long Burn; Overdue Cargo; Signal Lost, Enemy Found; Cousins Of The Queen; The Escape Pod Reunion; Ping Of Death (Minor); Uninvited Plus Ones; Gravity Is A Suggestion; Atmospheric Complaints; Reinforcements, Allegedly; The Last Transmission. Boss waves (cycle: freight, light, queen, leviathan, slagback): "Wave {n}: Special Delivery (Unsigned)", "Wave {n}: Mild Overheating", "Wave {n}: Quorum Reached", "Wave {n}: Cloud Cover, Heavy", "Wave {n}: Something On The Hob".

**Loading lines (sample of 20).** "Charging the bubbles..." "Teaching Brutus an indoor voice, in space..." "Asking Plato if the loading bar has a soul..." "Defragmenting the chitterlings..." "Aligning the manifold, then re-aligning the alignment..." "Cassandra predicted this screen. She has declined to comment." "Calibrating the lava to fifty percent less lava..." "Reticulating something that is definitely not a spline..." "Warming up the Pilot Light..." "Convincing the Postmaster to sign for it..."

**Death-line rubric.** Humans (knocked out): "Tell the medic I fell asleep on purpose." Machines: "Rebooting... I mean, no." Aliens: "(wet, apologetic noise)". No plea, no pain, no family. Targets: hubris, equipment, prompts, the commentators.

## 11. Music and sound direction

**Seven tracks** (CC0 or CC BY synth and cyber-space sources; no CC BY-SA; synth fallback `battle_scifi`, `menu_scifi`):
1. `sf_menu` "Docking Bay Lounge": hushed, spacious, 92 bpm; analog pads, vocoder hum, soft sub pulse.
2. `sf_map` "Star Chart Elevator Music": mellow, wry, 84 bpm; slow arpeggios, glass bells, a very serious bass.
3. `sf_battle_low` "Sensor Sweep": tense, ticking, 100 bpm; sparse arps, deep drone, sonar pings.
4. `sf_battle_mid` "Shields at Fifty": driving, pulsing, 128 bpm; gated pads, sequencer bass, clap snares.
5. `sf_battle_high` "Overcharge": urgent, aggressive, 150 bpm; distorted saw bass, rapid arps, synth toms (no orchestra).
6. `sf_victory` "All Systems Smug": bright, cocky, 110 bpm; major-key synth fanfare, sparkling bells.
7. `sf_defeat` "Warranty Void": slow, hollow, 70 bpm; falling filtered chords, a single wobbling lead.
Stingers (counted in AU matrix, 3 reused + the per-mission list in section 6). Ambience beds: moon (hum, near-silence), jungle (wet insects), neon (rain and crowd hum), station (vents), cavern (drip and heartbeat).

**Twelve hot families and how they should feel.**
1. `sf_pulse_rifle`: short bright "pew-tk", 0.15 s, bursts of three with a slight pitch fall; never a gunshot.
2. `sf_beam_rail`: sharp zip and crack, long ringing tail; sniper gets a deeper thump.
3. `sf_plasma_lob`: wobbly bloop on launch, wet sizzle and soft crump on impact.
4. `sf_shield_hit`: glassy tink with a hum; pitch lowers as the shield empties (a free health meter by ear).
5. `sf_shield_break`: glass shatter plus a flanged whoosh; recharge is a quiet rising tick-sweep.
6. `sf_emp_pulse`: sub thump, crackling static, then a descending power-down droop.
7. `sf_cloak_blink`: in/out shimmer glissando; blink is a suck-in click and a pop.
8. `sf_hover_loop`: soft turbine whine over low rumble, pitch by speed.
9. `sf_mech_step`: heavy servo, deep thud, ground-shake sub, hydraulic clunk.
10. `sf_alien_chitter`: wet clicks, squelch, a queen roar layered with a whale-like call.
11. `sf_orbital_strike`: rising charge whine, one beat of silence, pillar thunder.
12. `sf_hull_destroy`: metal groan, panel clang, sparks; replaces the wood and stone breaks.
Ducking: orbital charge and EMP duck music 4 dB; flash limiter (R16) rules apply to the orbital flash and EMP arcs.

## 12. Risks and how the design avoids them

1. **Reads as Ancient with laser skins.** The Shield Cycle is the signature and has a tell; ER27 requires >= 40 shield events per 100 s at 300 units; engagement distance and speed vectors are targets, not hopes.
2. **Regen causes stalemates.** Regen applies only after `delay`, break recovery doubles it, the watchdog is progress-based (`lastProgressT`), and every shield has `regen <= 15%` of its faction's typical dps; chip fire (Tally Bots) deliberately denies regen. S11/S12 per era include shielded mirrors.
3. **Cloak feels unfair.** Detection is visible (scan rings), attacking breaks it, AoE still hits, detectors are cheap (Eye $70, Pylon $160), and cloak has a cooldown. Counter matrix rows are measured both ways.
4. **Air units nobody can kill.** Default ranged hits air; only mortars and the Hauler's slam are ground-only; the roster validator guarantees an AA answer per mission; unhittable remnants end by the M7 termination rule.
5. **Readability under neon, glow, cloak and shields.** Team tint on glow trim (F_TEAM), palette CIEDE2000 test, tall buildings only at edges, glow budget capped, shield rim colours = team colours, 600-unit canonical battle in ER17.
6. **Hitscan and mortar cost.** Hitscan capped at the planned pooled transient projectile; beam samples <= 60 steps; sniper scan radius capped; mortars throttled by the 2 craters/s rule; ablation tests on every module.
7. **Franchise adjacency.** Banned terms: marine, xeno, saber, "the Force", droid, walker, stormtrooper, titan, halo, strider, behemoth, any named starship or species of a real franchise ("trooper" survives only as a plain word). Names were checked: `bastion`, `nibbler`, `loader`, `halo` were replaced during design.
8. **Tone.** Humans are knocked out and carried off by stretcher drones; machines spark; aliens splat; a kill-feed verb pool per cause (`energy emp rail acid orbital crush`) is required; the REAL_WORLD sweep covers the lore.
9. **Too many mechanics.** Nine mechanics on a one-per-mission ladder, each with a tell, a beat, a hint and a later star; concurrency <= 3 until M6; the Four Questions chips give the player one compact mental model.
10. **EMP trivialises machines.** Tag-limited, 16 s cooldown, 1.5 s channel that dies with the Broker, `hardened` bosses (40% stun), and Overheat costs the boss its armour but also makes it angry. The counter matrix keeps the EMP-off control at <= 45%.
11. **Part and perf budgets.** Biggest models: Slagback and Queen <= 24 parts; the Hauler is scaled hum1 (16 parts); hover and drone rigs <= 8; only two new mech rigs; far-mesh barrels >= 2x2; `downsample2` lint on every rail and mortar.
12. **Blink and mines in the sim.** Blink picks a walkable target only (hash stale one tick, harmless); mines trigger on ground units only by design intent, with a documented fallback if the layer check is expensive. Both appear in one mission star each so a cut is visible to the validator.
13. **Comedy repeating itself.** The three engines are unit-bound (every unit has a mechanic joke), the callbacks are gated, and wave names, lessons and barks are rewritten per era; the Ancient comedy panel calibrates the bar (ER11).
14. **Flash and motion safety.** Orbital, EMP and shield-break flashes obey the flash limiter; Reduce Motion cuts dollies and replaces scan rings with static ticks.
