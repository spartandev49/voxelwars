# MODERN ERA, proposal A: "Spectacle and Silhouettes First" (independent creative director, 2026-10-08)

Working title of the era: **The Briefing Era**. Chooser caption: "MODERN: Zeus's intern called it 'the one with the chairs that spin'. It has helicopters." Currency: **requisitions (rq)**, shown through `fmtCost`. All ids below are final proposals; every noun is invented, every gag punches at paperwork, equipment, hubris or the three commentators. Design rule A: if it does not read at the default camera (yaw -0.7, pitch 0.65, 40 px silhouette, 80 u far mesh) it is not designed yet.

## 1. Feel sheet

**Conceit (one sentence).** A toy-box combined-arms war fought on a tabletop diorama by the Department of Convenient Logistics, where every engagement is a form in triplicate, every gun is a stylised pop, every tank is a piece of kitchenware, and the three commentators have been handed headsets nobody trained them to use.

**Tempo.** Fast, short, loud. Battle median 60-85 s (Ancient 60-120), time-to-kill on bare infantry 2-4 s under focused fire, first contact 5-9 s on small and medium maps (13 s max on large, because ranges are long and nobody starts inside them). Median engagement distance >= 24 u (Ancient about 8), ranged damage share >= 70% (this is the ER27 fingerprint: Ancient is a melee game that has archers; Modern is a ranged game that has a few brave people with plywood). Squads do not clump and charge; they leapfrog from cover to cover, get pinned, get shelled, flank. A decision window is 2-3 s, not 10.

**Camera.** Same rig, default framing widened about 12% (ranges are 3x Ancient) with a slight lead toward the front line. Vertical content is the new spectacle: air units get long dark shadow blobs that shrink as they climb, helicopters bank on `vx`, and the set-piece shots (`CameraRig.shot`) are written for tall things: crane-down on a bridge, low-up on a giant wrecking ball, orbit around a tower. Buildings never exceed 4-5 u in the fight corridor (W8); skyscraper-class props live on map edges only.

**UI chrome vocabulary (`[data-era=modern]`).** The briefing room: manila dossier folders (mission cards open like folders), rubber-stamp stars (APPROVED / DENIED ink-pad stamps land with a thud when stars are awarded), paperclips, sticky-note tips, a clipboard HUD frame, punched-hole margins, tab dividers in the Codex, a headset glyph as the announcer icon, subtitles styled as a radio transcript with a squelch tick ("CH BRUTUS"). Campaign map = a corkboard desk map under a gooseneck lamp: pushpins are mission pins, red string joins them, acts are three sheets of paper clipped on. Tokens: manila #E6D3A3, ink #1D2A44, stamp red #C9302C, highlighter #FFF176, desk teal-grey #3A5A5E. Fonts stay Bungee (stamps and titles) and Rubik (body).

**Sound palette (3 adjectives): poppy, clacky, crackly.** Poppy: guns are 0.15-0.35 s cap-gun pops with a cork-and-tin edge, explosions are balloon-pops with a cymbal tail, never a movie boom. Clacky: UI and reloads are typewriter, rubber stamp, stapler, bolt-clack; the reload clack is a gameplay tell. Crackly: everything the commentators say arrives through a radio squelch; the music has a worn-vinyl office-lounge jazz groove, not trailer orchestra.

**Signature mechanic: THE PIN (suppression against cover).** Bullets that land near a unit fill an invisible meter; a full meter pins it: speed x0.5, spread x1.8, no advancing, morale drain, fire rate halved. Cover (low walls, hedges, sandbags) halves bullet damage and makes pinned units crouch behind the right side. On-screen tell, readable from 60 u: (1) an amber hazard-stripe ring decal at the unit's feet that winds like a clock as the meter fills; (2) the unit drops to a hunched crouch clip (`pinned_crouch`) with the helmet jolting down; (3) near-miss "snap" streaks plus dust puffs at its boots; (4) the kill feed verb "pinned"; (5) the selection card shows a PIN meter beside AMMO pips. Pins last 2.5 s after the last near-miss, so the answer to a pin is a flanker or a shell, never "wait it out". Cover tell: four small cyan corner brackets on the prop and a cyan helmet pip. Armour tell: a bounced shot is a grey "tink" with a white spark, a rear-plate hit is an orange "BONK" flash with a rear-arc wedge on the damage ring. Mine tell: a blinking amber light on a yellow tape ring (visible to its owner only until it fires; the enemy sees the ring for 0.4 s as it springs). Air tell: shadow blob, banking, and a thin dotted lock-on line from every homing missile.

**Counter wheel (every edge is a measured ER7 row, Wilson lower bound >= 55%):**
- Rifle volume beats open-field melee and skirmishers. MG pins rifle volume. Mortars and the Filing-Cabinet Howitzer crack cover and pins.
- Runabouts, Cub Reporters and trolleys flank crews. Snipers delete officers and support (role-weighted targeting). Smoke breaks sniper and MG lines.
- Armour shrugs rifles and MG. Side/rear shots, dynamite, mines and helicopter rockets beat armour. Hoarding Bearers walk through bullets but not through splash.
- AA and MG beat air. Air beats tanks and artillery (groundOnly guns cannot shoot up). Leaf-Blowers shove light units off bridges into water and onto mines.

**Scale/tempo table.** Ranges (u): pistol 12, SMG 18, dynamite 20, hoarding crowbar 1.4, rifle 26-32, tripod MG 38, tank cannon 44-50, parasol 46, mortar 52, sniper 70, howitzer 80 (a medium map is 96 u). Speeds: tank 1.9-2.6, infantry 2.4-3.2, runabout 5.4, drone 5.8. Vehicle corridors >= 6 cells everywhere (W10).

**This era must NEVER feel like:** Ancient with arrows renamed to bullets (a firefight where nobody ducks and everybody trades); a grim realistic war game (no camo, no national palettes, no flags, no real kit, no screaming: units are *knocked out*, helmets pop, machines pop their lids and smoke); a grey-brown palette (this is a saturated plastic toy box); a sniper-and-camping game (every long-range killer has a visible red-dot tell and a reload window); a list of vehicle skins (every vehicle has a silhouette you can name at 40 px: teapot, lunchbox, filing cabinet, goldfish bowl).

## 2. Six factions

Palette rule (VB): six hues spread around the wheel (28, 174, 224, 52, 325, 80 degrees), none a national colour set; emblems are invented shapes, never stars, crosses, crescents, three-band layouts or letters; no camo, no flags, no pennants. Ranks are invented (Under-Colonel, Provisional Sub-Captain, Acting Everything). Every faction names one **team-tint carrier**, because tint floors (15% non-hum, 30% hum) are hard to meet on toy hulls: it is designed in from the first sketch.

**1. Marmalade Motor Pool** (`marmalade`)
- Colours: #E8761C marmalade orange + #2E3036 charcoal. Emblem: a citrus wedge with a bite out of it. Tint carrier: the turret ring and the helmet band.
- Silhouette language: boxy, rounded kitchenware, big round turrets, slatted frames. Army identity: armour and wheels; slow, hard to dent from the front, soft at the back, plus infantry who ride in lunchboxes.
- Lore: founded when somebody noticed the cars were already parked. They hold the record for the longest convoy that never left the car park. Their motto, "Always Acting", is on every rank badge: nobody has ever been promoted past Acting.

**2. Directorate of Convenient Logistics** (`directorate`)
- Colours: #17A398 teal + #F2E9D0 cream. Emblem: a paperclip loop. Tint carrier: the tab dividers on the paper backpack and the cabinet's drawer fronts.
- Silhouette language: tall antennas, paper stacks, drawers, boxes on wheels. Army identity: indirect fire and call-ins; weak up close, terrifying from three streets away; reloads are slow and strikes are scheduled.
- Lore: it exists to supply the war, and has since come to believe it is the war. Every shell is filed before it is fired and archived after it lands. The Director has not been seen since the reorganisation; the Deputy says this is "a feature".

**3. Cobalt Skyclub** (`skyclub`)
- Colours: #2F5FE0 cobalt + #F4F7FF off-white. Emblem: a folded paper plane. Tint carrier: the rotor disc rim and the balloon's alternate segments.
- Silhouette language: discs, long thin tails, hanging things, balloons. Army identity: the air layer; fragile, unreachable by ground-only guns, ruinous to armour, helpless against anything that points upward.
- Lore: a flying club that took out a loan and a helicopter and discovered both can be used on other people. Members are called "cadets" regardless of age or flight hours. The goldfish has more.

**4. Caution Tape Company** (`caution`)
- Colours: #F7D117 hazard yellow + #1B1B1B black, as plain chevrons (never three horizontal bands). Emblem: stacked upward chevrons. Tint carrier: the beacon lamp and the hard-hat brim.
- Silhouette language: wide hard hats, big blades, slabs of plywood, beacons. Army identity: engineers; mines, plough, repair, plywood walls, demolition; slow and sturdy.
- Lore: contracted to build a dam and kept being asked to knock things down. Every site is clearly signposted; every sign says "Caution"; every sign is ignored. Their insurance policy is the single most feared object on the field.

**5. Briefing Room Brigade** (`briefing`)
- Colours: #D6338F magenta + #C9CED6 silver. Emblem: a megaphone cone with three sound arcs. Tint carrier: the dish rim, the lectern front and the ammo belt clip.
- Silhouette language: booms, lenses, lecterns, dishes, belts. Army identity: suppression and information; machine guns, long-lens snipers, loud auras; fragile when flanked.
- Lore: formed after somebody decided the best way to win a war was to describe it first. Their weapons are loud, their briefings are louder, and their spokesperson will take one question and answer a different one. Casualties are called "unplanned rapid redeployments".

**6. Garden Shed Auxiliary** (`shed`)
- Colours: #8FD13F lime + #5B2A86 aubergine (terracotta only on the flowerpot helmets). Emblem: a seedling in a pot (two leaves, no cross). Tint carrier: the hose coil and the mower deck skirt.
- Silhouette language: terracotta, wire baskets, tubes, tractors, hoses. Army identity: cheap, numerous, improvised; swarm pressure and strange machines (a trolley ram, a mower, a hover craft with a leaf blower).
- Lore: assembled from whatever was in the shed after the real army forgot to collect it. Nothing is the right size for its job and everything works anyway. They apologise to the lawn first.

## 3. The 34-unit roster

Legend: `*` = bespoke silhouette (non-hum1 rig or silhouette-defining part module; 21 total, floor is 15); BOSS = survival boss (5). Rigs: hum1 with new gun styles `rifle pistol smg mg rocket lens throw`; gun1 (+ lite crew); tank1; car1; heli1; drone1 (balloon is a drone1 variant with an envelope part); hover1; ram1; one suited giant (hum1 x2.4). No quad1, trebuchet1, dragon1, insect1 (Medieval/Sci-Fi rigs). Stats: hp / armour (front/side/rear for `armorFace`) / speed / cost class in Ancient-calibrated units (hoplite = 100). Damage types: `bullet`, `explosive` (+ `fire` where noted). "1st" = first mission it appears in.

| id | name | faction | role; tags | rig | weapon / projectile | ability | stat intent | counters / weak to | silhouette hook | joke | 1st |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tin_hat_trooper | Tin-Hat Trooper | marmalade | ranged; line | hum1 rifle | `rifle` bullet 9, 2-round burst, mag 8, reload 1.6 s, range 30 | takes cover (AI) | hp 105 / 0.05 / 3.0 / ~90 | beats melee at range; loses to MG pins, mortars, runabouts in the back | round tin dome with brim, hinged biscuit-tin backpack (8x8x6 box) | The backpack is a biscuit tin and it does contain biscuits; morale is a function of biscuits. | M1 |
| toast_rack_runabout * | Toast-Rack Runabout | marmalade | cavalry; vehicle light | car1 | `mg` bullet 4, burst 5, whileMoving, range 24 | trample crews | hp 220 / 0.15 / 5.4 / ~160 | runs down mortar, MG, sniper crews; dies to dynamite, mines, any armour | open slatted body: see-through ladder gaps (2x2 slats) and one standing gunner | Top speed: brisk. Seat belts: a suggestion. Toast: not included. | M1 |
| lunchbox_apc * | Lunchbox APC | marmalade | cavalry; vehicle medium | car1 | `mg` bullet 4, burst 4, range 26 | `bailout`: 3 Tin-Hat Troopers pop out dazed on death | hp 420 / .55 .40 .25 / 3.6 / ~260 | shrugs rifles, escorts; weak to rear shots, dynamite, mines | boxy lunchbox, fold-down roof handle, side latches, thermos turret | The crew bails out holding sandwiches. No sandwich has ever been dropped. | M5 |
| biscuit_tank * | Biscuit-Tin Tank | marmalade | cavalry; vehicle tank | tank1 | `shell` explosive 38, aoe 1.5, ap .7, cd 3.0, range 44 + coax `mg` | turret slews (2.2 rad/s), fire gate on aim | hp 560 / .75 .45 .20 / 2.6 / ~420 | beats clumps and light vehicles; dies to side/rear dynamite, mines, helicopter rockets | round lidded-tin turret with ridged rim and hinge, skirted tracks | The good biscuits are at the back. So is the weak armour. | M5 |
| teapot_heavy * | Teapot Heavy | marmalade | monster; vehicle heavy | tank1 | `shell` explosive 55, aoe 2.2, small crater, cd 4.5, range 50 | rear vent: fire cone 6 u when hit from behind | hp 1150 / .88 .60 .30 / 1.9 / ~720 | front wall; dies to flank, mines, air | bulbous teapot turret, spout barrel, rear handle loop, lid knob puffing steam while reloading | Tea at four. Shells at four-oh-one. | M8 |
| grand_teapot * BOSS | Grand Teapot | marmalade | monster; vehicle boss | tank1 x1.6 | `shell` explosive 80, aoe 3.2, crater, twin side-spout `mg` bursts | lid pop at 50%: 4 troopers bail out, steam jets | hp 3600 / .90 .70 .35 / 1.6 / ~1,500 | frontally immune to rifles; rear plate, mines, massed AT | teapot the size of a bandstand, lid knob = hatch, tea-cosy bumps | Whistles when ready. Is always ready. | M9 |
| clerk_rifleman | Clerk Rifleman | directorate | ranged; line | hum1 rifle | `rifle` bullet 8, mag 6, reload 2.4 s (stamps the form first), range 32 | none | hp 95 / 0 / 2.9 / ~85 | cheap volume; punished in the reload window | green eyeshade visor, sleeve garters, backpack of paper with coloured tab dividers | Reloads in triplicate. | M2 |
| signal_officer | Signal Officer | directorate | support; officer | hum1 pistol | `pistol` bullet 5, range 12 | `call_strike`: 3 shells, 34 dmg each, aoe 3.0, 2.2 s whistle ring, cd 24 | hp 90 / 0 / 3.0 / ~180 | wrecks clumps and cover; first target of every sniper | antenna whip with a glowing bulb tip (no pennant), huge headset ear-cups, radio backpack | Holds the line. Holds the line. Please continue to hold. | M4 |
| field_medic | Field Medic | directorate | support; organic heal | hum1 pistol | `pistol` bullet 4 | `heal_pulse` organic only: +20 hp x3 targets, radius 7, cd 5 | hp 100 / 0 / 3.0 / ~130 | keeps lines alive; cannot heal machines; dies to splash | huge satchel, bandage roll across the helmet, lollipop (no cross anywhere) | Treats everything with a plaster and a lollipop. Success rate: higher than expected. | M8 |
| mortar_pair * | Mortar Pair | directorate | siege; crew | gun1 mortar + 2 crew | `shell` arc high explosive 34, aoe 3.0, cd 3.4, range 52, minRange 14, groundOnly | setup 1.5 s | hp 120 / 0 / 2.0 / ~210 | punishes clumps and pins; helpless vs air, runabouts | stubby tube on a round baseplate, two crew with fingers in ears, ammo crate | Aims by vibes and one wet finger. | M4 |
| filing_howitzer * | Filing-Cabinet Howitzer | directorate | siege; crew | gun1 heavy + 3 crew | `shell` explosive 70, aoe 4.5, crater, structDmg x2, cd 7.5, range 80, minRange 24, groundOnly | setup 2.5 s; drawers slide open on recoil | hp 260 / .2 / 1.2 / ~480 | cracks cover and buildings from afar; dies to air, flankers, snipers | four-drawer grey cabinet on wheels, barrel from the top drawer, drawers open in sequence | Files a shell for every form fired. | M6 |
| deputy_director | Deputy Director Pellmell | directorate | hero; officer | hum1 stamp | giant rubber `stamp` bash 20 + `pistol` | `banner` Efficiency r12 (reload x0.8, dmg +10%); `call_strike` 1 shell cd 40 | hp 380 / .30 / 2.9 / ~420 | force multiplier; weak to snipers | tower of in-trays on the back, necktie, headset, club-sized stamp | Approval rating: 100% among those who must approve. | M7 |
| hobby_drone * | Hobby Drone | skyclub | swarm; air machine | drone1 | `pea` bullet 3, burst 3, range 18 | low-altitude air layer | hp 36 / 0 / 5.8 / ~55 | harasses crews, snipers; dies to any rifle | quad-rotor with four glowing ring discs, one eye lens | Piloted by somebody's nephew. He is "getting really good". | M7 |
| fishbowl_chopper * | Fishbowl Chopper | skyclub | ranged; air vehicle | heli1 | nose `mg` burst + 2 homing `rocket` pods (36, aoe 2) | strafe passes, banks | hp 540 / .35 / 4.4 / ~520 | kills tanks (rear/top), crews, artillery; dies to parasols, MG, rifle mass | goldfish-bowl bubble canopy with a visible orange fish, skinny tail boom, 4-blade rotor disc | Co-pilot is a goldfish. Has more flight hours than the pilot. | M7 |
| parasol_missileer | Parasol Missileer | skyclub | ranged; AA | hum1 rocket | `homing` rocket, air-only, 60, mag 1, reload 2.2 s, range 46 | none | hp 100 / 0 / 2.8 / ~150 | only reliable answer to helis and balloons; useless on the ground | furled-umbrella launch tube, open canopy backpack in cobalt/white diagonals | Learned about airspace the hard way. Wet. | M7 |
| spotter_balloon * | Spotter Balloon | skyclub | support; air unarmed | drone1 variant | none | `spot` aura r16: allied spread x0.6, range +10% | hp 140 / 0 / 1.4 / ~140 | huge buff, huge target; pops into confetti | beach-ball striped balloon, wicker basket, dangling sandbag | Sees everything. Says nothing. Weighs less than the paperwork. | M7 |
| chandelier_gunship * BOSS | Chandelier Gunship | skyclub | ranged; air vehicle boss | heli1 x2.0 | 4 rocket pods volley + `mg` sweep | `summon_on_death`-style spawn at 66% and 33% hp: 4 Hobby Drones each ("shakes the mobile") | hp 3200 / .40 / 3.0 / ~1,400 | strafes armour; dies to massed AA | six cardboard toy planes hanging below like a baby mobile, glowing crystals | Hangs from the ceiling of the sky. Nobody dusts it. | M9 |
| caution_sapper | Caution Sapper | caution | support; engineer | hum1 shovel | shovel bash 8 | `lay_mine` (up to 4, armed after 1.5 s, cd 7); defuses enemy mines in 3 u | hp 100 / .05 / 2.8 / ~130 | zone denial; folds to anything | oversized yellow hard hat with chin strap, chevron vest, tape spool unrolling behind | Marks every mine with tape. The tape is 50% accurate. | M6 |
| dozer_plough * | Dozer Plough | caution | cavalry; vehicle heavy | tank1 blade variant | melee `ram` blunt 40, structDmg x3, kb | immune to mines and clears them in front | hp 700 / .85 blade .40 .20 / 2.2 / ~380 | opens barricades and minefields; dies to flank, rear, air | wide yellow blade (a wall on tracks), cab with orange beacon | Its reversing beep gives the enemy a full day's notice. | M5 |
| hoarding_bearer * | Hoarding Bearer | caution | melee; shielded | hum1 + panel | crowbar bash 14 | `shield` arc 110, block .80 vs bullets | hp 160 / .25 / 2.4 / ~120 | strolls through MG fire; dies to splash and flank | a plywood wall with legs: yellow-black chevron panel twice his width | Hides behind plywood. Plywood hides behind "Authorised Personnel Only". | M5 |
| dynamite_thrower | Dynamite Thrower | caution | ranged; explosive | hum1 throw | `dynamite` arc explosive 28, aoe 2.4, cd 2.6, range 20, friendly fire | fuse bubble | hp 100 / 0 / 3.2 / ~115 | cracks clumps and cover, scares armour from the side; dies when kited | bundle of red sticks with a cartoon spark, soot smudges, bandolier | Fuse length: legally optimistic. | M3 |
| spanner_mechanic | Spanner Mechanic | caution | support; repair | hum1 | wrench bash 9 | `heal_pulse` machine only: +35 hp, radius 6, cd 4 | hp 110 / .05 / 3.0 / ~140 | keeps tanks and helis alive; cannot heal people | oversized wrench, welding mask on the forehead, toolbox backpack with a coil | Fixes anything by hitting it. Success rate: tight. | M8 |
| site_foreman * BOSS | Site Foreman | caution | monster; mech boss | hum1 x2.4 loader suit | wrecking-ball arm: melee overhead blunt 60, aoe 3.2, structDmg x4, crater; claw | ground-shake on stomp; topple death | hp 3000 / .55 (back hatch .20) / 2.2 / ~1,100 | levels buildings and bridges; dies to back hatch, mines, air | yellow loader frame, hard-hat cab, swinging ball on a chain, beacon | Wrecking ball sold separately. He bought it anyway. | M5 |
| tripod_mg_team * | Tripod MG Team | briefing | ranged; crew | gun1 HMG + 2 crew | `mg` bullet 5, burst x6, cd 0.9, mag 40, reload 3.0 s, range 38, suppress r2.2 | setup 1.2 s, 100 degree arc | hp 190 / .10 / 1.8 / ~260 | pins any advance, hits air; dies to flank, mortars, snipers, smoke | splayed tripod, long copper ammo belt curling, gunner behind a shield plate | Fires four hundred rounds a minute and a four-thousand-word pamphlet. | M3 |
| long_lens_sniper | Long-Lens Sharpshooter | briefing | ranged; sniper | hum1 lens | `hitscan` bullet 70, ap .4, cd 5.5, mag 5, reload 3.0 s, range 70 | red-dot tell 1.0 s before the shot; prefers officers and support | hp 80 / 0 / 2.6 / ~240 | deletes signal officers, medics, heroes; dies to anything that reaches him, smoke | barrel is a telephoto lens with a hood (>= 2x2), camera strap, kneeling | Takes the shot. Then another, for the archive. | M3 |
| cub_reporter | Cub Reporter | briefing | ranged; skirmisher | hum1 smg | `smg` bullet 3, burst 3, range 18, whileMoving | `scoop` (existing dash/HASTE params: +40% speed 3 s, cd 12) | hp 80 / 0 / 4.4 / ~75 | flanks crews and snipers; dies to anything | flat press hat with a plain card, notebook, huge flash-bulb backpack | Chases a deadline at 4.4 u/s and still misses it. | M3 |
| chief_spokesperson | Chief Spokesperson Vale | briefing | hero; officer | hum1 + lectern | lectern shield arc 70 block .6; microphone | aura On the Record r12 (+0.08 pin/s to enemies, morale to allies); `taunt` No Comment r9, cd 20 | hp 420 / .25 / 2.4 / ~400 | pins everyone near, tanky; dies to flank and splash | rolling lectern shield, microphone boom above the head | Will take one question. Answers a different one. | M4 |
| broadcast_behemoth * BOSS | Outside-Broadcast Behemoth | briefing | monster; vehicle boss | car1 x2.2 | four `mg` turrets + `sound blast` cone | aura Live Feed r16 pulsing every 6 s (+0.5 pin); at 50% hp 4 Cub Reporters drop out of the back doors | hp 2800 / .80 .50 .30 / 2.0 / ~1,300 | a suppression engine; dies to rear/dish side, mines, air | truck with a satellite dish the size of a roof, mast, light bar, cable reel | Goes live in five. Four. Technical difficulties. | M6 |
| flowerpot_rifleman | Flowerpot Rifleman | shed | ranged; line cheap | hum1 rifle | `rifle` bullet 7, mag 8, range 26 | none | hp 90 / 0 / 3.2 / ~65 | cheap volume; dies to everything | terracotta pot helmet with a sprouting sprig, hose coil on the back | Watered daily. Helmet blooms in spring. | M1 |
| trolley_rammer * | Trolley Rammer | shed | cavalry; ram charge | ram1 + pusher | melee `ram` blunt 26, big kb; charge factor | one wheel wobbles | hp 250 / .10 / 4.6 / ~140 | breaks lines and crews; dies to pins and rifles at range | wire-basket trolley with a plank poking forward, one wobbling wheel, pusher bent double | One wheel always pulls left. Nobody knows which. | M1 |
| mower_tank * | Ride-On Mower | shed | cavalry; vehicle | car1 | `pot` shell explosive 22, aoe 1.4 + melee `mow` slash 14, 160 degree arc | cosmetic stripe trail | hp 340 / .30 / 3.6 / ~290 | mows swarms; dies to AT, mines, rear | lawn tractor with seat, steering wheel, tall exhaust puffing | Leaves lovely stripes. And gaps in the line. | M4 |
| wheelbarrow_cannon * | Wheelbarrow Cannon | shed | siege; crew | gun1 improvised + 1 crew | `pot` pumpkin arc high explosive 26, aoe 2.8, range 44, minRange 12, groundOnly | `misfire` 6% | hp 140 / 0 / 2.4 / ~170 | cheap artillery; dies to flankers | single-wheel barrow, drainpipe barrel, pile of pumpkins | Misfires 6% of the time. Gardeners call that composting. | M4 |
| leafblower_hover * | Leaf-Blower Hover | shed | ranged; hover | hover1 | `gust` bullet 4 + kb 7, cone range 12 | hover layer crosses water; shoves units into water, off bridges, onto mines | hp 210 / 0 / 4.0 / ~220 | herds light infantry; dies to rifles, low damage | round inflatable skirt, tall blower pole, seated driver | Blows away leaves, smoke and occasionally the point. | M8 |
| grand_mower * BOSS | Grand Mower | shed | monster; vehicle boss | car1 x2.4 | `mow` melee sweep 36, aoe arc 160 degrees; `mulch` shotgun cone | `rev` (existing HASTE self-status): speed x1.6 for 4 s | hp 3400 / .50 / 2.4 / ~1,500 | carves lanes through swarms; dies to AT, mines, rear | house-sized ride-on with a three-blade deck, striped lawn behind | Cuts a swathe. Then another, for symmetry. | M8 |

**Rig census:** car1 5 (runabout, APC, mower, behemoth, grand mower), tank1 4, gun1 4, heli1 2, drone1 2, hover1 1, ram1 1, suited giant 1, hum1 14 = 34. Humanoid silhouettes never repeat (headgear + backpack + weapon silhouette are the discriminator; <= 2 units per faction share a body type). Faction silhouette-unique units: Motor Pool Teapot, Directorate Filing Cabinet, Skyclub Goldfish Bowl, Caution Hoarding Bearer, Brigade Tripod, Shed Trolley.

**Survival (5 bosses, in cycle order):** `site_foreman` "Wave {n}: Hard Hat Area", `grand_teapot` "Wave {n}: Tea Is Served", `chandelier_gunship` "Wave {n}: Mind The Mobile", `broadcast_behemoth` "Wave {n}: We Interrupt This Battle", `grand_mower` "Wave {n}: Mow Or Never". Regular wave names (20 total, samples): The Welcome Pack, Standing Orders (Seated), Reasonable Adjustments, The Quarterly Review, Unscheduled Visitors, Out Of Office, A Meeting That Could Have Been A Battle, Please Find Attached, Per My Last Shell, The Final Reminder.

### 3b. Animation joys (what is a pleasure to watch)

New hum1 gun kit (new clip ids only; timing meta rows in `DEFAULT_META` equal to the baked clip, so Ancient timing never drifts): `shoot_rifle` (shoulder, recoil, chamber tail, hit .45), `shoot_mg`, `shoot_pistol`, `shoot_smg`, `shoot_rocket`, `shoot_lens` (the sniper's slow breath and red-dot hold), `reload_gun` (mag slap, the readable clack), `pinned_crouch`, `idle_gun`, `walk_gun/jog_gun/run_gun` (both hands on the gun, small arm swing), `kneel_aim`, `crew_load/crew_fire/crew_aim` for gun1 crews. Reactions per cause (M17e table): bullet hit = helmet jolt and a stagger; explosive = fly-back tumble and a dazed stars ring; fire = hat-hop; pinned = hunch; knock-out = hat pops off, unit sits, dazed ring, fades (gore `auto` = non-graphic).
- **Tin-Hat Trooper:** the helmet visibly jumps when he is hit and he re-seats it before the next shot; the biscuit-tin backpack rattles when he runs.
- **Clerk Rifleman:** reload is a tiny stamp-and-initial mime: slap, stamp, initial, rack.
- **Signal Officer:** the call-in is a two-handed headset press, one finger up, a pause, a shrug at the sky; the whistle ring starts on the shrug.
- **Mortar Pair:** loader drops the shell, both crew cover their ears, the tube hops, the baseplate puffs dust; they check where it landed with one thumb up.
- **Filing-Cabinet Howitzer:** on each shot drawers fly open top to bottom like a typewriter carriage, then clack shut in order.
- **Toast-Rack Runabout:** hops over kerbs; the gunner leans into corners and loses his hat on the first sharp turn.
- **Biscuit-Tin Tank:** the turret slews independently; the hull rocks back on recoil; the lid rattles when idling.
- **Teapot Heavy:** steam builds in puffs as the shell loads, whistles at ready, spout recoils, lid knob bounces; the death is the lid shooting off and a long sigh of steam.
- **Fishbowl Chopper:** banks into strafe passes, the goldfish presses its face to the glass on every rocket and floats upside down if the chopper tumbles.
- **Hoarding Bearer:** advances under his panel like a slow door; when bullets hit it the panel rattles and he bobs; when it breaks he looks at the camera.
- **Trolley Rammer:** the pusher sprints bent double, the wonky wheel flutters, the crash sends the plank up and both fly off in a heap.
- **Site Foreman:** wind-up of the wrecking ball takes a full beat (a readable telegraph), ground-shake on each stomp, the topple death takes three steps to fall like a crane.
- **Spotter Balloon:** drifts up and down like a thought; pops into confetti and the basket plummets two metres and bounces.

### 3c. Ten screenshots this era must be able to produce (the look-dev acceptance list)

1. A tank column (4 Biscuit-Tin Tanks and a Lunchbox APC) crossing the bridge at dusk with the Foreman's wrecking ball overhead (M5).
2. A Fishbowl Chopper banking with the goldfish visible against the airfield sky, toy planes taxiing below (M7).
3. A Teapot Heavy in the open, steam plume lit by the low sun, spout aimed at the camera.
4. A trench line mid-pin: twelve units under amber stripe rings, tracer snaps, dust puffs, the MG team's copper belt in the foreground (M3).
5. A Filing-Cabinet Howitzer with all four drawers open mid-recoil, crew covering their ears.
6. The Grand Mower coming off its barge with a lime stripe trailing across the quay (M8).
7. The boxcar firework chain in the rail yard, toys and confetti raining over the gantry (M6).
8. The Switchboard Tower at night with every window blinking to hold music, mortar craters around it (M4).
9. The dam from upstream: Grand Teapot on the crest, Chandelier Gunship hanging overhead, a sluice gate bursting (M9).
10. A 600-unit Downtown battle at the default camera that still reads as six armies by colour and shape.

## 4. Twelve arenas

New materials (append ids >= 16, frozen once shipped): `asphalt, concrete, paving, ballast, steel_deck, duckboard, trench_mud, stubble, felt_green, lino_tile` (speeds .95-1.1, trench_mud .75, ballast .9). Env themes for audio: `modern_city modern_field modern_industrial modern_water modern_air modern_desert`. Draw rule: <= 35 visible (type, variant) batches per recipe (W9).

| id | name | size | theme / biome | signature features | objective fit | set-piece fit |
|---|---|---|---|---|---|---|
| mod_parade_yard | Parade Yard | small | felt-green and concrete, `modern_field` | flat drill square, tyre course, 9 pop-up target dummies, loudspeaker post, flag-free pole with a windsock | eliminate, puzzles | live-fire siren, crane-up reveal |
| mod_hedgerow_meadow | Hedgerow Meadow | medium | stubble and grass, `modern_field` | field patchwork split by hedgerow lines (low cover lattice), hay bales, windmill, the picnic hill with a blanket | hold_hill, capture | hamper pop, push-in behind a hedge |
| mod_trench_line | The Long Trench | medium | trench_mud and duckboard, `modern_field` | two carved trench systems (steps <= 1 u, ladders), no-man's land of old craters and coil wire, 3 signal posts | capture, destroy | smoke bank over the top, tracking shot along the lip |
| mod_downtown | Downtown | large | asphalt and paving, `modern_city` | 5x4 block grid, streets >= 6 u (tank column passes), shop rows and offices on edges only, the Switchboard Tower centre-left, parked cars | defend_core, eliminate, survive | hold-music orbit around the tower |
| mod_bridge_gorge | Bridge Gorge | medium | steel_deck over a river gap, `modern_water` | one 44 u bridge deck (planks cells) with piers and guard rails, shallow ford downstream as the flank route, cliffs | escort, kill_general | the wrecking toll, crane-down |
| mod_rail_yard | Rail Yard | large | ballast and gravel, `modern_industrial` | five parallel tracks, wagon rows (cover), signal gantry, turntable, loco shed, 4 cargo boxcars | destroy, capture | boxcar firework chain, high pull-back |
| mod_airfield | Airfield Open Day | large | grass and asphalt runway, `modern_air` | 70 u runway, 3 hangars, control tower, parked toy planes, 6 explosive fuel tanks, windsock | kill_general, destroy | flypast, low-up on the goldfish |
| mod_harbour | Harbour | medium | planks and concrete quay, water, `modern_water` | quay plus 3 piers, 2 gantry cranes, container stacks, shallow and deep water (hover route), landing ramp for barges | survive_waves, defend_core | barge ramp slam, crane-view down |
| mod_dam | The Dam | large | concrete, rock and reservoir, `modern_industrial` | dam wall across a valley with a crest road, reservoir upstream (water plane), dry spillway channel below, 2 sluice gates (destroyable) | kill_general, destroy | gate burst, upstream sweep over the crest |
| mod_desert_outpost | Desert Outpost | medium | sand and tin roofs, `modern_desert` | walled compound, spinning radar dish, water tower, slow dunes, 2 gates | defend_core, capture, hold_hill | radar sweep reveal |
| mod_building_site | Building Site | medium | trench_mud and concrete, `modern_industrial` | foundation pits, tower cranes, scaffold gantries, container offices, mud slows | hold_hill, escort | crane swing |
| mod_garden_centre | Garden Centre | medium | lino_tile and grass, `modern_field` | greenhouse grid (glass cover that breaks), hedges, flower beds, a potting shed, sprinkler rings (slow hazard, reuses the quicksand kind) | survive_waves, eliminate | sprinkler burst |

## 5. Thirty-eight props (`mod_` prefix; shared `any` trees, bushes, rocks and campfires are reused)

Fields: blocks (full / soft = full + finite hp / none), cover (low = `cover:'low'` halves bullets for units behind it, high = stops projectiles), hp, flam, destructible role. Buildings use voxel 0.2 (W2); nothing over ~100k voxels.

| id | cat | blocks | cover | hp | flam | destructible role |
|---|---|---|---|---|---|---|
| mod_sandbag_wall | cover | soft | low | 140 | no | splash chews it; the first thing every unit hides behind |
| mod_sandbag_nest | cover | soft | low | 220 | no | ring for an MG team, shells open it |
| mod_hay_bale | cover | soft | low | 80 | yes | burns, tells the player what fire does |
| mod_hedge_row | cover | soft | low | 90 | yes | the meadow's cover lattice; burns |
| mod_dugout_roof | cover | soft | high | 300 | yes | trench roofing, caves in under howitzers |
| mod_girder_cross | obstacle | soft | high | 400 | no | three crossed girders; blocks vehicles, infantry squeeze past |
| mod_road_barrier | obstacle | soft | high | 500 | no | street chokepoints; dozer eats it |
| mod_barbed_coil | obstacle | none | none | 40 | no | slows (stubble-like), burned or driven through |
| mod_crate_stack | cover | soft | high | 120 | yes | stackable cover, 2 variants |
| mod_shipping_container | cover | soft | high | 700 | no | harbour and rail walls; a stack of two reads as a building |
| mod_barrel_oil | hazard | soft | none | 30 | yes | explosive r3 dmg 60; the chain-reaction toy |
| mod_fuel_tank | hazard | soft | high | 200 | yes | explosive r6 dmg 120; airfield and desert |
| mod_parked_car | cover | soft | high | 240 | yes | wreck damage stage; crushed by tanks |
| mod_house_small | building | soft | high | 520 | yes | rubble pile, shells flatten it |
| mod_shop_row | building | soft | high | 700 | yes | street wall, windows pop |
| mod_apartment_block | building | soft | high | 1100 | yes | edge-of-map height, stage-2 rubble |
| mod_office_block | building | soft | high | 1400 | no | tallest prop, map edges only (W8) |
| mod_warehouse | building | soft | high | 1000 | no | rail yard and harbour backdrops; roof caves in |
| mod_hangar | building | soft | high | 1500 | no | airfield, doors open in the set-piece |
| mod_control_tower | building | soft | high | 900 | no | airfield landmark; kill_general stands under it |
| mod_switchboard_tower | core | soft | high | 2500 | no | the defend_core object (M4); blinks, hold-music speakers |
| mod_bridge_pier | structure | hard | high | inf | no | holds the deck; only script events remove it |
| mod_guard_rail | decor | none | none | 60 | no | bridge edge, snaps when a Leaf-Blower shoves someone through |
| mod_lamp_post | decor | soft | none | 60 | no | night-light emitter, topples |
| mod_crane_gantry | structure | soft | high | 900 | no | harbour and site skyline, swings in the set-piece |
| mod_water_tower | structure | soft | high | 600 | no | desert landmark; bursts and wets the ground |
| mod_radar_dish | decor | soft | none | 300 | no | spins (animated prop), hit makes it wobble |
| mod_boxcar_cargo | target | soft | high | 900 | yes | the m6 destroy objective; pops in fireworks |
| mod_rail_track | decor | none | none | inf | no | flat ballast strip, vehicles roll along it |
| mod_signal_post | marker | none | none | inf | no | capture-point lamp, changes colour to the holder |
| mod_dam_gate | structure | soft | high | 1800 | no | m9 destroyable sluice gate |
| mod_pylon | decor | soft | none | 300 | no | edge skyline, tall |
| mod_parked_plane | decor | soft | none | 150 | yes | toy-box airliner and glider, wing snaps |
| mod_windsock_pole | decor | none | none | 40 | no | the flag-free pole; sock points where the weather goes |
| mod_target_dummy | decor | none | none | 40 | no | pop-up silhouette cutouts (no letters), fold flat when hit |
| mod_picnic_hamper | decor | none | none | 60 | yes | m2 hill object, bursts into confetti sandwiches |
| mod_greenhouse | building | soft | none | 220 | no | glass panes pop, no cover, huge visual |
| mod_tape_ring | marker | none | none | 1 | no | the mine tell: a yellow tape ring with a blinking light |

Census (38): cover 8, obstacle 3, hazard 2, building 8, core 1, structure 4, decor 9, target 1, marker 2. Explosive props (barrel, fuel tank, boxcar) use M12 `explosive`; `cover:'low'` is the M9 field; `mod_target_dummy`, `mod_picnic_hamper` and `mod_tape_ring` are non-blocking so they never clog nav. Audio ids to add to the destroy-sound table (it matches by id substring): `sandbag`, `container`, `girder`, `glass` (greenhouse), `concrete`.

## 6. The nine missions (3 acts)

Acts: **I "Basic Forms"** (guns, cover, pins), **II "Combined Arms"** (shells, armour, mines), **III "Full Spectrum"** (air, repair, everything).

Curve facts: objective types used = eliminate, hold_hill, capture, defend_core, escort, destroy, kill_general (twice), survive_waves = 8 distinct (floor 5). One headline mechanic taught per mission; M9 teaches none. **Star 1 = win; star 2 = win with >= 50% of the army cost alive (generic, as Ancient)**; star 3 is listed per mission and names only mechanics taught in strictly earlier missions, or none. Par is in rq (`fmtCost`). Each mission has an authored reference army at 85-100% of budget (<= 16 types). Set-piece package = `{event, shot{from,to,hold,ease}, announcer slot, stinger, sfx}`; shots run 3-6 s in real time with the sim at 0.5x, skippable, Reduce Motion = cut.

Closed star-helper vocabulary (each reads sim events, no new state):
- `thrift(par)`: start cost <= par. `underTime(s)`. `noLoss(defs)`: none of those defs lost. `heroesAlive`. `noFriendlyFire`.
- `coreHpAtLeast(f)`. `hitsWhileReloadingAtMost(n)`: damage events on a unit in its reload state.
- `coverFracAtLeast(f)`: share of own unit-seconds with `inCover`. `suppressedAtLeast(n)`: distinct enemy units that reached a full pin.
- `minesTriggeredAtLeast(n)`. `usedMechanics(set,k)`: at least k distinct of {pin, cover, call_strike, mine, repair, air}, each used >= 3 times.

---
**M1 `mod_boot_camp_dropout` "Boot Camp Dropout"** (Act I)
- Objective: **eliminate**, limit 240 s. Arena `mod_parade_yard` (small). Player: Marmalade, roster [tin_hat_trooper, toast_rack_runabout], budget 3,000, par 2,250.
- Enemy (Shed, advance): 14 flowerpot_rifleman, 3 trolley_rammer. No boss.
- Teaches **firefight** (range, burst, magazine, reload; ammo pips and the reload clack). Tests none. S3: `thrift(2,250)`.
- Set-piece `mod_sp_live_fire`: event first shot, the loudspeaker squeals and all 9 pop-up dummies spring up and are shredded to confetti. Shot: low dolly along the firing line rising to the default camera, 3.5 s. Announcer `campaign_mod_boot_camp_dropout/start` (Brutus's headset debut). Stinger `mod_stg_whistle_snare`. Sfx: loudspeaker squelch, whistle, pop-up clacks.
- Reward: Workshop helmet `mod_helm_tin_hat` (usable now) + codex page tin_hat_trooper + title "Reluctant Recruit". Attempts: star1 1.2, star3 2.0.
- First three minutes: 0:00 Brutus's headset squeals (tip: ammo pips); 0:20 first volley, beat "Reload behind your friends"; 0:45 trolleys charge, beat "Wheels outrun bullets"; 1:30 win card with the first rubber stamp.
- Brutus: "BOOT CAMP! I have a HEADSET! It has a little arm for the mouth! Can you hear me? CAN YOU HEAR ME? Over!"
- Plato: "They hand us a rifle and call it a lesson. A rifle is a spear that has given up on being brave. Is that progress?"
- Cassandra: "Eight rounds in the magazine. The ninth click is the one that gets you. It is in the manual. Nobody has the manual."

**M2 `mod_hedgerow_picnic` "The Hedgerow Picnic (Unscheduled)"** (Act I)
- Objective: **hold_hill** 90 s on the picnic blanket (clock pauses while an enemy stands on it), limit 300 s. Arena `mod_hedgerow_meadow` (medium). Player: Directorate, roster [clerk_rifleman], budget 4,200, par 3,200.
- Enemy (Marmalade, 3 waves 28 s apart): 10 tin_hat_trooper; 12 + 2 toast_rack_runabout; 12 + 3 runabouts.
- Teaches **cover** (hedge and sandbag `lowCover` halve bullet damage, units reposition to unblocked spots, cyan corner brackets). S3: `hitsWhileReloadingAtMost(6)` (the M1 lesson: reload behind the hedge).
- Set-piece `mod_sp_picnic_hamper`: event wave 2 arrives and a stray round bursts the hamper into confetti sandwiches. Shot: slow push-in from behind a hedge to the blanket, 3 s. Announcer `hold_hill/mid`. Stinger `mod_stg_clarinet_sting`. Sfx: cork pop, paper rustle.
- Reward: Workshop `mod_visor_eyeshade` + codex page "Cover (Hedges Are Not Walls)" + title "Hedge Trimmer". Attempts 1.6 / 2.6.
- Brutus: "A PICNIC! On a HILL! With HEDGES! The sandwiches have been tactically placed!"
- Plato: "The hedge does not stop the bullet. It persuades it to reconsider. Is that not the whole of diplomacy?"
- Cassandra: "Stand behind the hedge. In front of the hedge is where it happens. I drew a diagram. Brutus ate the diagram."

**M3 `mod_trench_pardon` "The Long Trench (Pardon Our Mud)"** (Act I finale)
- Objective: **capture** 3 signal posts (12 s each, any order), limit 330 s. Arena `mod_trench_line` (medium). Player: Briefing, roster [tripod_mg_team, cub_reporter, long_lens_sniper], budget 6,000, par 4,500.
- Enemy (Directorate, hold, in trench cover): 22 clerk_rifleman, 4 dynamite_thrower (grenades punish the clumping you will want to do).
- Teaches **the Pin**. Finale combines two earlier mechanics: firefight (defenders reload on a schedule, your gunners punish the clack) and cover (the trench lip). S3: `coverFracAtLeast(0.35)`.
- Set-piece `mod_sp_over_the_top`: event first post captured, the enemy pops smoke canisters and a haze bank rolls across no-man's-land (weather row, visual only, no gameplay change) as the whistle goes. Shot: tracking along the trench lip, 4 s. Announcer `capture/first`. Stinger `mod_stg_whistle_drumroll`. Sfx: whistles, smoke pops.
- Reward: **mutator `mod_red_tape`** + codex page tripod_mg_team + title "Pinned and Proud" + Quick weather chip "Smoke Bank". Attempts 1.9 / 3.2.
- Brutus: "THE LONG TRENCH! Mud! Wire! And a brand-new feature called PINNING, which is when they cannot lift their heads, and also when I cannot lift mine!"
- Plato: "The machine gun does not kill the man. It persuades him to stay still. Is persuasion the weapon, and the bullet the footnote?"
- Cassandra: "They pop up the moment you stop firing. Keep firing. I did not write that for fun."

**M4 `mod_switchboard_hold` "Please Hold (The Switchboard)"** (Act II)
- Objective: **defend_core**: keep the Switchboard Tower (hp 2,500) alive through 4 waves (about 150 s). Arena `mod_downtown` (large). Player: Directorate, roster [clerk_rifleman, signal_officer, mortar_pair], budget 7,000, par 5,600.
- Enemy (Shed swarm): W1 20 flowerpot_rifleman; W2 12 pots + 6 trolley_rammer; W3 24 pots + 2 mower_tank + 2 wheelbarrow_cannon; W4 40 pots + 8 trolleys + 3 mowers.
- Teaches **shells and craters** (call_strike whistle ring, mortar arc, minRange, craters, groundOnly, friendly splash). S3: `suppressedAtLeast(30)` (the Pin, M3: a pinned swarm is shell food).
- Set-piece `mod_sp_hold_music`: event core below 50%, the city PA switches to hold music, tower windows blink in time and a Fishbowl Chopper makes a scripted unarmed flyover. Shot: orbit around the tower, 4.5 s. Announcer `defend_core/low` (Cassandra's helicopter risk assessment). Stinger `mod_stg_hold_music`. Sfx: phone ring, rotor flyby.
- Reward: Workshop `mod_back_radio` + codex pages signal_officer, mortar_pair + title "Switchboard Operator". Attempts 2.2 / 3.6.
- Brutus: "THE SWITCHBOARD! If it falls, NO MORE CALLS! Hold the tower! And please hold the line!"
- Plato: "One person speaks, and a shell arrives from three streets away. Distance has been invited to the argument. It brought a crater."
- Cassandra: "There is a helicopter circling the tower. I filed a risk assessment. It came back stamped APPROVED. By the helicopter."

**M5 `mod_bridge_too_far` "A Bridge Slightly Too Far"** (Act II)
- Objective: **escort** the Parcel Van (VIP: a lunchbox_apc override, unarmed, hp 700) over the 44 u bridge to the far-bank exit marker; it drives when the lane is clear. Limit 270 s. Arena `mod_bridge_gorge` (medium). Player: Marmalade, roster [tin_hat_trooper, toast_rack_runabout, biscuit_tank, lunchbox_apc], budget 8,000, par 6,400.
- Enemy (Caution): 3 dozer_plough, 8 hoarding_bearer, 10 dynamite_thrower, mini-boss `site_foreman` at the far end; the ford flank is open.
- Teaches **vehicles and armour facing** (front tink, rear BONK, turret slew, bailout). S3: `suppressedAtLeast(20)` (runabout guns pin the throwers while tanks flank).
- Set-piece `mod_sp_wrecking_toll`: event the van passes the midpoint, the Foreman steps onto the deck and wrecks the guard rails and lamp posts (ground-shake event). Shot: low behind the van, tilting up to the giant, 3.5 s. Announcer `boss_enters` (Cassandra: "I filed a risk assessment on 'giant'"). Stinger `mod_stg_brass_stab_boom`. Sfx: wrecking-ball whoosh, girder clang, stomp.
- Reward: codex pages biscuit_tank, lunchbox_apc + title "Bridge Burner (Not Literally)" + Workshop `mod_goggles`. Attempts 2.5 / 3.8.
- Brutus: "A BRIDGE! The van must cross it! The van is ARMOURED! The van is also the VIP! The van has not been told!"
- Plato: "What is a tank for? It is a house that wants to be a gun, and a gun that wants to stay home."
- Cassandra: "Armour has a front and a back. The Foreman has a wrecking ball. He will pick the back. People always do."

**M6 `mod_rail_yard_mines` "Mind the Gaps"** (Act II finale)
- Objective: **destroy** 4 cargo boxcars (`mod_boxcar_cargo`, hp 900 each), limit 360 s. Arena `mod_rail_yard` (large). Player: Caution, roster [caution_sapper, dozer_plough, hoarding_bearer, dynamite_thrower], budget 9,000, par 7,200.
- Enemy (Briefing + Directorate): 6 tripod_mg_team, 3 long_lens_sniper, 3 mortar_pair, 1 filing_howitzer, mini-boss `broadcast_behemoth`; two pre-laid enemy minefields at the wagon rows (team-owned, rings visible only to their owner).
- Teaches **mines** (lay, arm delay, defuse, plough immunity). Finale combines >= 2 earlier mechanics: armour facing (dozer vs MG), pins (the Behemoth aura pins your line), cover (hoarding wall, wagons), shells (the howitzer). S3: `noLoss([dozer_plough])`.
- Set-piece `mod_sp_boxcar_chain`: event the fourth boxcar blows and every wagon pops open into seasonal fireworks and toys. Shot: high wide pull-back over the yard, 5 s. Announcer `destroy/complete`. Stinger `mod_stg_fireworks`. Sfx: rockets, party horns, wagon pop.
- Reward: **mutator `mod_loud_pops`** + Workshop `mod_hard_hat` + codex page "Mines (Tape Is a Suggestion)" + title "Mine Host". Attempts 3.0 / 4.5.
- Brutus: "THE RAIL YARD! Four wagons of surprise! And MINES, which are like landlords: you only notice them when you step on them!"
- Plato: "A mine is a decision made earlier by somebody who is no longer present. Is that not what most laws are?"
- Cassandra: "The sappers ring every mine with tape. The tape says Caution. Nobody reads the tape. I read the tape."

**M7 `mod_airfield_open_day` "Airfield Open Day"** (Act III)
- Objective: **kill_general**: bring down Deputy Director Pellmell (hold order at the control tower), limit 270 s. Arena `mod_airfield` (large). Player: Skyclub, roster [hobby_drone, fishbowl_chopper, spotter_balloon], budget 7,500, par 6,000.
- Enemy (Directorate + Brigade): deputy_director (general), 16 clerk_rifleman, 4 tripod_mg_team and 4 parasol_missileer (the only things that can hurt you), 2 filing_howitzer and 3 mortar_pair (groundOnly: cannot shoot up).
- Teaches **the air layer** (altitude, groundOnly vs AA, shadow tell, lock-on lines). S3: `noLoss([spotter_balloon])` (protect the buff).
- Set-piece `mod_sp_flypast`: event deploy, the airfield PA announces the air display, toy planes taxi and the Fishbowl Chopper lifts off past the camera with the goldfish visible. Shot: low rise following the bubble canopy, 3.5 s. Announcer `mission_start` (Cassandra's risk assessment on the helicopter already overhead). Stinger `mod_stg_bigband_sting`. Sfx: rotor flyby, runway horn.
- Reward: Workshop `mod_aviator_goggles` + codex page "Air Layer (Please Look Up)" + title "Frequent Flyer". Attempts 2.4 / 3.4.
- Brutus: "AIRFIELD OPEN DAY! The FLYPAST! Please keep all arms inside the helicopter!"
- Plato: "Their cannons cannot shoot upwards. A cannon that cannot look up is a cannon with excellent manners."
- Cassandra: "I filed a risk assessment on the helicopter currently overhead. It was approved. By the helicopter. Over."

**M8 `mod_harbour_hover_tour` "Harbour Tour (Hover Class)"** (Act III)
- Objective: **survive_waves** 4 waves, limit 420 s. Arena `mod_harbour` (medium). Player: mixed, roster [tin_hat_trooper, biscuit_tank, teapot_heavy, dozer_plough, caution_sapper, field_medic, spanner_mechanic], budget 10,000, par 8,000.
- Enemy (Shed, from the sea): W1 6 leafblower_hover + 16 flowerpot; W2 10 trolley_rammer + 3 mower_tank; W3 8 leafblower_hover + 4 wheelbarrow_cannon + 20 pots; W4 boss `grand_mower` off a landing barge + 4 mowers.
- Teaches **heal vs repair** (medic fixes people, mechanic fixes machines, neither fixes the other; a lunchbox bailout is seen). S3: `minesTriggeredAtLeast(8)` (mines, M6: mine the pier ramps; hovers cross water but the quay is mined).
- Set-piece `mod_sp_landing_barge`: event wave 4, the barge ramp slams, the pull-cord roars, the Grand Mower mows its first stripe across the quay. Shot: from a gantry crane looking down at the ramp, 4 s. Announcer `boss_enters`. Stinger `mod_stg_engine_rev_brass`. Sfx: ramp slam, pull-cord, engine roar.
- Reward: Workshop `mod_wrench_big` + codex pages field_medic, spanner_mechanic, grand_mower + title "Harbour Master (Provisional)". Attempts 2.8 / 4.2.
- Brutus: "THE HARBOUR! Hovering things! A GRAND MOWER on a BARGE! You heard that correctly! GRAND! MOWER!"
- Plato: "The medic mends the man, the mechanic mends the machine. Neither mends the argument. That remains my department."
- Cassandra: "The mower arrives on the fourth wave. It will cut a path. I wrote 'path'. 'Lane' sounded optimistic."

**M9 `mod_dam_finale` "The Dam Finale"** (Act III finale)
- Objective: **kill_general**: the Grand Teapot (general, hold on the dam crest), limit 480 s. Arena `mod_dam` (large). Player: mixed, roster open (all non-boss Modern units), budget 15,000, par n/a (reference only).
- Enemy (mixed final stand): grand_teapot, 2 teapot_heavy, 6 tripod_mg_team, 6 parasol_missileer, 20 clerk_rifleman, 10 flowerpot. Scripted spawns: 90 s `chandelier_gunship` arrives from upstream; 150 s `site_foreman` smashes the left sluice gate.
- Teaches nothing; combines pin, cover, shells, armour facing, mines, air and repair. S3: `usedMechanics({pin,cover,call_strike,mine,repair,air}, 3)`.
- Set-piece `mod_sp_dam_gate`: event the Foreman's ball bursts the sluice gate (a white-water particle sheet down the spillway, visual only) and the Grand Teapot whistles. Shot: long sweep upstream to downstream over the crest, 6 s. Announcer `finale` with Plato's unmute. Stinger `mod_stg_full_fanfare`. Sfx: gate groan, water rush, teapot whistle.
- Reward: title "Chief of Staples" + codex "Everything Else" + the finale payoff on the era-independent surfaces (section 10). Attempts 4.0 / 6.5.
- Brutus: "THE DAM! The GRAND TEAPOT! The CHANDELIER! A FOREMAN! I have run out of capital letters and am borrowing Plato's!"
- Plato (label now simply "PLATO", first time): "I have been speaking for nine missions. I now learn I was heard. This is unsettling."
- Cassandra: "The dam holds. Then it does not. I am so tired of being right about concrete."

**Curve audit.** Mechanics taught once each: firefight M1, cover M2, pin M3, shells M4, armour M5, mines M6, air M7, heal/repair M8. Finales: M3 (firefight + cover), M6 (armour + pin + cover + shells), M9 (six). Every star 3 uses only earlier mechanics or none. Each NEVER-cut headline mechanic owns a mission (guns/suppression/cover M1-M3, explosives/artillery M4, vehicles/armour M5, mines M6, helicopters/AA M7), so none can be cut without removing a mission.

## 7. Six puzzles (`mod_pz_`; hand-placed enemy, fixed roster, free retries, no god powers)

1. `mod_pz_duck_cover` "Duck, Duck, Cover": cover. Six enemy riflemen on a ridge fire across a flat yard; you have 8 Clerk Riflemen and the map has three sandbag walls. Trick: the walls are not where the fight is; creeping from wall to wall cuts incoming damage in half and the ridge cannot afford the reloads.
2. `mod_pz_pin_cushion` "Pin Cushion": pin. One Tripod MG Team and 3 Cub Reporters against 10 entrenched Flowerpots. Trick: the MG's setup takes 1.2 s, so it must start before the reporters run; reporters go only after the first pin ring fills.
3. `mod_pz_armour_back` "Armour Has A Back": armour facing. A Teapot Heavy rolls at your 4 Dynamite Throwers and 2 Hoarding Bearers. Trick: bait the front plate with the bearers while the throwers walk the long way round to its rear vent (the vent burns them if they stop within 6 u).
4. `mod_pz_incoming` "Incoming (Please Hold)": shells. 12 enemies hide behind a wall at 40 u; you have one Signal Officer and 2 Mortar Pairs. Trick: the call-in takes 2.2 s and the whistle ring is visible to them too; stagger the strikes so the second lands where they run from the first.
5. `mod_pz_mind_gaps` "Mind The Gaps": mines. A convoy of 6 Toast-Rack Runabouts must pass a 7 u gap; you have 2 Sappers. Trick: mines arm after 1.5 s and the AI avoids none, so place them early and wait at the gap's far side; a Sapper standing in the road defuses your own mine and wastes it.
6. `mod_pz_umbrella` "Umbrella Policy": air. Five Hobby Drones and a Fishbowl Chopper swarm 4 Parasol Missileers and 6 Clerks. Trick: parasols have a 2.2 s reload, so fire in a rolling pair and keep the clerks as bait for the helicopter's rockets.

## 8. Six god powers (the intern's department)

Slot semantics are stable: 1 quick strike, 2 big strike, 3 area control, 4 heal/repair, 5 status, 6 summon/reinforce. Each maps to an existing effect family of `GodPowers` (the `GodPower` data schema, CU12). The intern is offstage: named only in tooltips; the HUD shows a slim, nervous pen-clicking icon on the cooldown ring.

| id | name | slot | effect (existing family) | telegraph | cooldown | tooltip joke |
|---|---|---|---|---|---|---|
| mod_gp_spot_fire | Spot Fire (Approximately) | 1 | one `areaDamage` (the lightning/meteor single hit), r 3.2, 90 dmg, 0.9 s delay | falling whistle ring and red dot | short (8 s) | "Fires one shell at the point you point at. Reads 'point' loosely. Authorised by Zeus's intern." |
| mod_gp_strafing_run | Strafing Run (Pending Approval) | 2 | meteor template `pending[]` x5 along a 24 u line, each r 2.4 dmg 70 + `makeCrater`, then a flyover shadow | dashed arrow with an ETA clock | long (45 s) | "Please allow 3-5 working seconds. The intern has stapled the request to the wrong aircraft." |
| mod_gp_minefield_gift | Minefield, Gift Wrapped | 3 | M11: 14 team-owned mines in a r 7 disc, armed 1.5 s, hidden from the enemy | orange tape ring unrolling | long (40 s) | "Contents: surprise. Recipient: whoever steps first. Gift receipt: none." |
| mod_gp_tea_break | Tea Break and Spanner | 4 | `heal_pulse` organic +45 and machine +60 hp, r 9, over 4 s | green steam ring | medium (30 s) | "Heals people and machines. Not the argument. The intern made the tea. It is orange. Do not ask." |
| mod_gp_please_hold | Please Hold | 5 | status: enemies in r 9 get CONFUSE + a full SUPPRESS meter for 4 s (they stop and listen) | pulsing soundwave rings | medium (35 s) | "Your enemy is important to us. Their call will be answered in the order it was received. Which is never." |
| mod_gp_reinforcements | Reinforcements (Allegedly) | 6 | summon: 6 of your army's cheapest line unit, 2.5 s after the cursor, drifting down | umbrella-dot ring | very long (60 s) | "They are on their way. They have been on their way since the intern pressed 'Send'." |

**The intern gag:** the intern is never seen. The chooser caption and arrival card name them, tooltips carry their sign-off, and every power has the same defect in a different department. The voice-over of the first use per session is a distant, apologetic "sorry, wrong button".

## 9. Two era mutators, twelve achievements

**Mutators** (shared 9 stay; both gated by campaign rewards; `disable-with-reason` against the mechanic matrix):
- `mod_red_tape` "Red Tape" (unlocked by M3): every reload takes twice as long but every magazine holds twice as much; announcer is told to say "in triplicate". Disabled-with-reason in Puzzles ("Puzzle weapons are pre-stamped").
- `mod_loud_pops` "Everything Is Loud" (unlocked by M6): every bullet suppresses with x2.5 radius, damage x0.75 (the whole field is permanently pinned; the war becomes a negotiation with ear plugs).

**Achievements** (ids `mod_`; names with conditions; one hidden; the last three are the per-era semantics of `ancient_history`, `overachiever`, `tourist`):
1. `mod_first_pin` "Pinned It": reach a full pin on 25 distinct enemies in one battle.
2. `mod_cover_artist` "Duck, Duck, Cover": win a battle spending >= 70% of your unit-seconds in cover.
3. `mod_empty_click` "Empty Click": be hit 15 times while reloading in one battle (an achievement for failing, which is the best kind).
4. `mod_mine_host` "Mine Host": 10 enemies knocked out by your mines in one battle.
5. `mod_rear_view` "Rear View Mirror": knock out 5 vehicles with rear-arc hits in one battle.
6. `mod_tea_break` "Tea Break": heal or repair 5,000 hp lifetime.
7. `mod_crater_face` "Crater Face": 30 craters made in one battle.
8. `mod_umbrella_policy` "Umbrella Policy": shoot down 15 air units in one battle with Parasol Missileers.
9. `mod_goldfish_hours` "Goldfish Flight Hours" (HIDDEN): win a battle in which a Fishbowl Chopper never took damage.
10. `mod_modern_history` "Stamped, Filed, Archived": finish the Modern campaign.
11. `mod_triplicate` "In Triplicate": three stars on all nine Modern missions (27 stars).
12. `mod_site_visit` "Site Visit": play all twelve Modern arenas.

## 10. Humour: three engines, the time-travel arc, callbacks

Ancient's engine is bureaucratic understatement (mortgages, committees, quiet disaster). Modern's engines are different in kind: overt chaos, overstated spin and objects taken literally. Every unit has a mechanic joke (see the roster column).

**Engine 1, Comms Failure** (radio and headset slapstick: call signs, wrong channels, hold music, squelch, being on mute).
1. Brutus: "THIS IS BRUTUS, CALL SIGN BRUTUS! I picked it MYSELF! It is on the clipboard! Over! Is it over? OVER!"
2. Plato (muted): "(Plato is saying something about channels. Nobody can hear Plato. Plato continues.)"
3. Cassandra: "Channel four is the enemy's. I said channel four. Brutus has been on channel four since noon."
4. Brutus: "I am receiving you LOUD AND... I am receiving MYSELF. Hello, myself! LOUD AND CLEAR!"
5. Plato: "Over. Out. Roger. Three ways of saying nothing in a hurry."

**Engine 2, Spin Cycle** (press-briefing euphemism and overstatement).
1. Brutus: "A bold new RETREAT strategy! The briefing calls it 'proactive relocation'! The troops call it RUNNING!"
2. Cassandra: "Official statement: the position held. Unofficial: the position, the road and the briefing room."
3. Plato: "'A minor setback.' The setback has a crater and a name. Is it still minor if it has a name?"
4. Brutus: "That tank has been 'temporarily disassembled'! Pieces EVERYWHERE! Temporarily!"
5. Cassandra: "'Mission accomplished.' It was not. I have the form for it."

**Engine 3, Toy-Box Literalism** (a war fought with household objects, narrated with total seriousness).
1. Plato: "The Teapot Heavy has not poured. It has only aimed. I find that more menacing."
2. Brutus: "FLOWERPOT HELMET takes a hit! It is a LIGHT hit! The sprig is fine! THE SPRIG IS FINE!"
3. Cassandra: "The sandbags are sand and bag. Bag was the weak link. I said bag."
4. Brutus: "The Filing-Cabinet Howitzer opens DRAWER THREE! A SHELL! Of course it is! Drawer four is LUNCH!"
5. Plato: "A trolley with a plank. We have reinvented the ram, with a wobblier wheel and fewer principles."

**Time-travel arc.** *Arrival card (first entry, skippable):* "ARRIVAL: THE BRIEFING ERA. Zeus's intern has misfiled the commentators again. They have been delivered to a tabletop in a briefing room. Brutus has been issued a headset and a clipboard. Plato has been issued nothing and is at peace with this. Cassandra has noticed a helicopter. It has not noticed her." *Act I:* the headset does not work (Brutus receives himself; Plato's briefing and booth lines stay fully legible but carry a muted-speaker glyph and the label "PLATO (MUTED)", which never explains itself). *Act II:* call signs and the corkboard map; Cassandra files risk assessments (a helicopter flies over M4's tower; she calls it "approved"). *Act III:* everyone is fluent and worse for it; the risk assessments are stamped; the Foreman, the Teapot and the Mobile arrive in a row. *Finale payoff on an era-independent surface (the Ancient finale is frozen):* the **Credits** screen gains a "Radio discipline" line, "Plato: muted since Act I, by choice" with a small stamp, and the **What's New / all-four-eras card** gains a "Risk Assessment: Helicopter (overhead). Status: landed. Cause: unknown. Filed by Cassandra. Approved by: nobody." sheet; the M9 victory line is Plato unmuted: "I was heard. I would like it noted that I mostly said that this was a bad idea."

**Eight callbacks** (SF = setup-free: funny cold, funnier warm; GATED = renders only if one boolean for the source id is set):

| id | source | callback | type / gate |
|---|---|---|---|
| mod_cb_headset | arrival card (headset issued) | M5 Brutus: "BRUTUS ACTUAL! No, that is not a rank, I checked! Over! No, wait, it is, and I have just promoted myself!" | SF |
| mod_cb_plato_muted | M1 briefing label "PLATO (MUTED)" | M9 Plato unmuted line (above) | GATED on `seen.beats.mod_boot_camp_dropout` |
| mod_cb_helicopter | M4 helicopter flyover bubble | M7 Cassandra: "Same helicopter. Different Tuesday. Still approved by the helicopter." | GATED on `seen.beats.mod_switchboard_hold` |
| mod_cb_goat_van | Ancient `nile_crossing` goat | M5 Parcel Van label "LIVESTOCK: DO NOT ASK"; Cassandra: "The goat. Yes. Always the goat." | GATED on Ancient `progress.stars.nile_crossing > 0` |
| mod_cb_terms | Ancient laminated Terms of Conquest | M3 Brutus: "Terms of Conquest, Revision Nine, now in a plastic sleeve!" | SF |
| mod_cb_trojan_box | Ancient Trojan Horse reveal | Lunchbox APC bailout: Plato: "A horse of men in a box. We keep returning to this shape." | GATED on `seen.units.trojan_horse` |
| mod_cb_pizza | Brutus's fake sponsor line | M7 Brutus: "Brought to you by Pompeii Pizza, now delivered by helicopter, which Cassandra has reported!" | SF |
| mod_cb_chicken_cargo | Ancient sacred chicken | M6 boxcar pop: one wagon contains a single chicken, Brutus: "CARGO: MISC! The misc is CHICKEN!" | GATED on lifetime `chickenKills >= 1` |

### 10b. Other text surfaces the engines must reach (samples; counts are `spec/H`'s job)

- **Kill-feed verbs for the new causes** (<killer> verb <victim>, kind and cartoon): `bullet` popped, tin-hatted, clipboarded; `explosive` shelled, filed under craters, cratered; `crush` rolled over, flattened politely; `mow` mowed, trimmed, edged; `gust` leaf-blew, tidied away; `mine` surprised with tape, mined; `hitscan` developed, framed, enlarged; `pin` is not a kill, it is the verb "pinned" shown on a full meter (units are never harmed by it).
- **Class barks for roles that are silent today** (vehicle, air, drone, mech, crew, officer): vehicle: "Engine noises!", "Is that my rear?"; air: "Rotor, rotor, rotor!", "Altitude is a state of mind."; drone: "Piloted remotely. Panicking locally."; crew: "Loading! Loading! Hold your ears!"; officer: "Reading my notes!". Status barks: pinned "Not lifting my head!", reloading "Click! Hold on! Click!", mine "Was that tape?".
- **Lesson detectors landing with their mechanics** (results screen, all true in context): "Your riflemen spent 62% of the fight in the open; the other army spent 70% behind hedges" (cover); "Eleven of yours were pinned before they fired" (pin); "Four tanks fell to rear hits; armour has a back" (armour); "Your howitzers could not look up; their helicopters could" (air); "Two mines, nobody noticed, ten knocked out" (mines).
- **Loading lines (20 in the final set; samples):** "Teaching Brutus the difference between over and out. Retrying..."; "Laminating Revision Nine of the Terms of Conquest..."; "Asking the helicopter to confirm it has been approved..."; "Sorting the sandbags by weight, then by feeling..."; "Convincing the goldfish to sign the flight log..."; "Looking for a lunchbox big enough for a tank..."; "Plato is still on mute. He has noticed. He is fine."
- **Tips (40; samples):** hint "A pinned unit is a free kill for a flanker; keep one fast unit out of the arc."; joke "Sandbags: bags of sand, but with ambition."; hint "Tanks have a rear. So does everything that thinks it does not."
- **Results/Stats labels** for new stat keys: shots fired, rounds reloaded, pins landed, cover seconds, shells called, mines triggered, hp repaired, air kills, vehicles bailed out.
- **Survival and Daily:** the Modern boss cycle above; Daily draws the era from its own stream and shows "Modern" on the tile; share strings carry an era marker; boss waves fall on 5, 10, 15, 20 and 25 in cycle order (Foreman, Teapot, Chandelier, Behemoth, Mower), and the intermission banner names the next boss in a stamped memo ("Next: Wave 10, Tea Is Served. Bring biscuits.").

## 11. Music and sound direction

**Seven tracks** (hunt candidates are unverified by ear; licence gate CC0 / CC BY 3.0 / CC BY 4.0 / PD; synth bed `battle_modern` fallback; battle tracks `loop:true` or a passing seam check):
1. `menu` "Briefing Room Lounge": 96 bpm, cool, wry, relaxed; vibraphone, upright bass, brushed kit, organ swells. Chooser rollover plays a 6 s excerpt.
2. `battle_low` "The Quiet Before the Memo": 108 bpm, tense, stealthy; muted pizzicato, rim-clicks, finger snaps, bass clarinet.
3. `battle_mid` "Combined Arms Swing": 126 bpm, driving, swaggering; marching snare, electric organ, brass stabs, baritone sax riff.
4. `battle_high` "Danger Close (Respectfully)": 150 bpm, frantic, funky; breakbeat snare, fuzz guitar, brass blasts, rising strings.
5. `victory` "Stamp of Approval": 100 bpm, brassy, smug; big-band fanfare ending on a typewriter ding.
6. `defeat` "Request Denied": 72 bpm, deflated, deadpan; muted trombone and a slow typewriter.
7. `map_bed` "On Hold": 84 bpm, bland, cheerful; elevator-lounge vibes with phone clicks and a polite synth voice-less melody. This is the corkboard bed, and the best joke in the sound list.
Hunt list: office-groove and spy-caper pieces in the unused incompetech set (`killers`, `hitman`, `full-on`, `movement-proposition`, `exciting-trailer`, `finding-the-balance`), OpenGameArt CC0 funk/jazz loops; none is a trailer orchestra. Stingers (3 existing reused plus new `mod_stg_*`): whistle-snare, clarinet sting, drumroll, hold-music, brass stab, fireworks, big-band, rev-brass, full fanfare.

**Twelve hot sound families** (each 6+ sources, short tails, far-thinned):
1. `rifle_pop`: a cap-gun with a cork in it, 0.15-0.25 s, no low end; eight variants; pitch jitter; the most heard sound in the game must not tire the ear.
2. `mg_stutter`: a 3-round typewriter-rattle sample (0.3 s), cooldown 60-90 ms, max 5 voices; dry, ratchety, never a roar.
3. `sniper_crack`: one bright crack plus a 0.5 s tail and a bolt clack; the red-dot tell is silent so the crack is the surprise.
4. `bullet_snap`: the near-miss zip and ricochet ping that drives the Pin; rising pitch, 0.1 s, loud near the camera; this family teaches suppression by ear.
5. `reload_clack`: magazine slap plus bolt clack, readable at 35 u; the *tell* that a unit is vulnerable.
6. `cannon_bonk`: tank and howitzer fire as a round tin bonk with a low thump underneath; heavier for the Teapot.
7. `shell_whistle`: the falling whistle of mortar, howitzer and call-in; it is the telegraph, so it is clear and rising, then a hush before the blast.
8. `blast_sml`: balloon-pop plus cymbal tail (small), a fuller whoomp (medium), a cartoon boom with a crater thud (large); never a film explosion.
9. `engine_tread_bed`: aggregate vehicle bed (like the footstep bed) with a clattery sewing-machine feel; heavier when a Teapot is near.
10. `rotor_bed`: chopping rotor loop with a pitched flyby and Doppler; the helicopter is *audible overhead* before it is visible.
11. `mine_blip_boing`: a patient amber blip while armed, a cartoon "boing" then a muffled pop on trigger.
12. `helmet_bonk`: the knock-out: tin-hat ring, a small dazed "ding", no scream; machines get a lid-pop and a sigh of steam.
Bus sounds counted in the AU matrix, not hot: `radio_squelch` (before every commentator line, the headset gag's audio), `stamp_thud` and `typewriter_ding` (UI). Realism processing: 0.15-0.35 s pops, shortened tails, less low end (AU0); `mixtest` per era scenario.

## 12. Risks and how this design avoids them

1. **Reads as Ancient with guns.** Avoided by the engagement distance (>= 24 u median), the Pin as the central verb, cover seeking, and silhouettes you can name at 40 px; the ER27 fingerprint vector (engagement distance, ranged share, first contact, vertical spread) is the gate.
2. **Ranged-fight dead air** (everyone stands and trades). Every ranged unit has a flank answer (runabout, reporter, trolley), a cover-cracker (mortar, dynamite) and a window (reload, setup); pins end after 2.5 s so the clock keeps moving.
3. **Pin stalemate** (the field fully pinned). Pins have diminishing returns (a second pin within 5 s fills at half rate), pinned units still fire at half rate, and `mod_loud_pops` is the opt-in for chaos; the stalemate watchdog still applies.
4. **Silhouette collisions.** 21 star-marked units are non-hum1 or part-module bespoke; humanoids differ in head, pack and weapon; recolour detection by silhouette hash (ER3); `downsample2` lint on every thin feature (lens, antenna, belt, blade >= 2x2).
5. **Draw calls and the 16-type cap.** 34 units, many with turret/hull parts; mitigations: far-mesh-first design, crew parts collapsed at LOD1, the lever ladder; vehicles <= 22 K near tris, bosses <= 55 K, bosses reuse tank1/car1/heli1 scaled rather than new rigs.
6. **Termination with unhittable units** (air, groundOnly guns). Rule: default weapons hit air; only artillery is groundOnly; the AA guarantee is in `armygen` and in campaign validation (every mission with air has a Parasol, a Tripod or rifles on the enemy side); remnants of drones fall to the 'chase' rule.
7. **Real-world likeness.** Invented ranks and kit, toy colours, no camo, no flags (the windsock is a sock, the antenna tip a bulb), hazard chevrons used as plain chevrons, banned-reference palette test, emblem allow-list, a cross-free medic (bandage and lollipop), no letters or numbers on any model.
8. **Tone.** Units are knocked out: helmet pops, confetti, a dazed star ring, fade; machines pop lids and bail crews; gore `auto` = non-graphic; a bullet is a "pop". Jokes land on kit, forms and commentators, never on people.
9. **Performance.** Tank columns plus craters: crater rate cap and lazy nav rect rebuild; sniper `hitscan` capped at 60 us a shot; MG bursts capped by magazine; scan radius capped for 70-80 u weapons; per-module budget share checked by ablation.
10. **Overlap with Ancient's humour.** The three engines are overt chaos, overstatement and literalism, not understatement; the Ancient templates classified `ancient` are not reused here.
11. **Mines feel unfair.** Friendly mines show a tape ring and a light to their owner, the enemy sees a 0.4 s ring on trigger, sappers and the plough defuse, there is a lesson line ("Tape means mines"), and no map pre-lays mines before M6.
12. **Volume.** 34 units x >= 11 strings, 9 missions x 3 voices, 12 arenas, 38 props: Modern is cut last on the cut ladder in this order: Quick-only arenas beyond 11, generic workshop parts, music tier 3, the Spotter Balloon's aura (not the unit), smoke occlusion, wrecks. Never cut: guns/suppression/cover, shells and craters, mines, vehicles/armour, helicopters/AA, Quick era chips, tone safety.

**Unverified (honest):** the gags and set-piece quality were judged by reading, not by playing; the balance numbers are intent classes to be measured by the harness (Wilson bound on every counter row); sound candidates have not been heard; draw-call, `view.update` and sim costs of the vehicle-heavy scenes are estimates until the P0 spikes.
