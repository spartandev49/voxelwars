# Medieval: thirty-eight props (binding, synthesizer part 1)

Format follows `src/content/era_ancient/props/catalog.js`: `P(cat, r, h, hp, {blocks, cover, flam, place, scale, name})` where `r` is the blocking circle radius in u (before scale), `h` the projectile-cover height, `hp = INF` indestructible. Every prop id carries `med_`; shared generic props keep their Ancient-era `any` ids and are not counted: `tree_oak tree_pine tree_dead bush rock_small rock_big log crate barrel bones reeds wheat campfire torch fire_pit` (large oaks are `tree_oak` at scale 1.5-1.8; the proposal-A `med_old_oak` was dropped for that reason). Categories reuse the four editor categories (`nature architecture monuments props`).

Conventions. **blocks** F = full (units cannot enter), N = none. **cover** Y/N = stops projectiles below `h`. **flam** Y = burns and spreads (fire needs a flammable cell). **Footprint** is always the circle `r`: walls are chains of touching circles on a levelled strip (the Troy pattern), oriented rectangles were not needed (plan W2). **Voxel hint**: 0.1 for anything under about 4 u in plan; 0.2 for buildings, walls and anything over about 6 u (a 0.1 voxel castle would be 7 million cells per building; plan s7 and map 05 s2 cap that). **Size class**: S (under 2 u tall), M (2-5), L (5-9), XL (over 9). **Emitters** are ambient or reactive particle sources (WORLD maps the names to emitter kinds; the first column of each row says when it runs). Gate, portcullis, drawbridge and wall hit points were re-derived for a ram contact damage of about 110 per second (55 x structDmg 6 / 2.4 s x 0.8 uptime): a lone ram opens the gate in 18-30 s of contact, a trebuchet needs 3-4 hits on a wall segment; BALANCE retunes, the targets are what is binding.

## 1. Fortifications (9)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_curtain_wall` | Curtain Wall | architecture | 1.2 / 5 | F / Y | 1200 | N | the breach: ram x6, trebuchet x4; destroyed segment leaves a gap, dust ring and a rubble decal | L / 0.2 | dust on hit and on death | castle_dour, bellfount_abbey, dour_courtyard, siege_camp, moat_keep |
| `med_round_tower` | Round Tower | architecture | 2.0 / 10 | F / Y | 1800 | N | corner anchor; falls with a dust ring; takes trebuchet damage but never rams (no door) | XL / 0.2 | dust, pennon flutter | castle_dour, moat_keep |
| `med_castle_gate` | Castle Gate | architecture | 3.0 / 5 | F / Y; team-owned: passable to its owner | 2400 | N (iron-banded oak) | THE destroy target (M12 gate); ram x6; stages at 66 and 33 percent (cracks, bands twang) | L / 0.2 | splinters and dust | castle_dour, bellfount_abbey, siege_camp (stub) |
| `med_portcullis` | Portcullis | architecture | 3.0 / 5 | F / N (bolts pass; direct-fire damage x0.2) | 1800 | N | second gate layer behind the first; rams and trebuchets only; stays shut after the gate falls | L / 0.2 | dust, chain sparks | castle_dour |
| `med_drawbridge` | Drawbridge | architecture | 3.0 / 3 (raised leaf 4) | F raised, N lowered / Y raised | 600 | Y | a script event lowers it (`editTerrain`); destroyed while raised it falls forward and lays the deck (opens the lane); destroyed while lowered it drops into the moat (closes it) | M / 0.2 | splash on collapse | castle_dour, moat_keep |
| `med_hoarding` | Hoarding | architecture | 1.2 / 3 | N / Y | 300 | Y | wooden wall gallery; burn it to strip the defenders' cover and spill its fire | M / 0.1 | embers and smoke while burning | castle_dour |
| `med_keep` | Keep | architecture | 5.0 / 16 | F / Y | 3500 | N | the defend_core prop (Quick keep hold); crumbles in three stages with smoke | XL / 0.2 | smoke when under 50 percent, dust | castle_dour, dour_courtyard, moat_keep |
| `med_bell_tower` | Bell Tower | monuments | 1.8 / 12 | F / Y | 1500 | N | capture/defend point; the bell swings (animation); rings when destroyed | XL / 0.2 | dust | bellfount_abbey, dour_courtyard |
| `med_palisade` | Palisade | architecture | 0.6 / 2.6 | F / Y | 250 | Y | cheap field fortification and breach practice | M / 0.1 | embers if burning | siege_camp, long_bridge (bridgehead forts) |

## 2. Lane and siege props (5)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_bridge_parapet` | Bridge Parapet | architecture | 0.5 / 1.2 | F / N | 200 | N | low rail on bridges; a crater or boulder knocks a gap | S / 0.1 | dust | long_bridge, ford_of_dithering |
| `med_spike_stakes` | Spike Stakes | props | 0.4 / 1.0 | F / N | 60 | Y | the anti-cavalry obstacle: a row of them is a barrier that horses must path around and that kills a run-up | S / 0.1 | none | ford_of_dithering, long_bridge, siege_camp, moat_keep |
| `med_mantlet` | Mantlet | props | 1.0 / 2.0 | F / Y | 200 | Y | attackers' portable wall; cheap cover for crews | M / 0.1 | embers | castle_dour, siege_camp, mizzlemoor |
| `med_oil_cauldron` | Oil Cauldron | props | 0.8 / 1.6 | F / N | 140 | N | explosive prop (M12): on death or by script it pours burning oil r4, 16 dps for 6 s; inert ("oil pending") until the fire mission | S / 0.1 | steam wisp | castle_dour, dour_courtyard |
| `med_pitch_barrel` | Pitch Barrel | props | 0.4 / 1.0 | F / N | 40 | Y | explosive prop r3, 45 fire damage, chains to neighbours; the trap in puzzle 3 | S / 0.1 | smoke wisp | siege_camp, pennywhistle, castle_dour |

## 3. Village and farm (8)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_cottage` | Cottage | architecture | 1.5 / 3.5 | F / Y | 220 | Y (thatch) | village body; burns and spreads along thatch; collapses to a char decal | M / 0.1 | chimney smoke (ambient); fire when lit | pennywhistle |
| `med_barn` | Barn | architecture | 2.4 / 4.5 | F / Y | 450 | Y | hay fire spreader; the big blaze of the fire mission | M / 0.2 | embers | pennywhistle |
| `med_windmill` | Windmill | monuments | 2.0 / 9 | F / Y | 500 | Y | the animated-sails landmark; burns while its sails keep turning (the burning-windmill frame) | L / 0.2 | embers and smoke while burning | pennywhistle, ford_of_dithering |
| `med_market_stall` | Market Stall | props | 0.9 / 2.5 | F / Y | 80 | Y | striped awning cover; cheap and burnable | M / 0.1 | none | pennywhistle, dour_courtyard |
| `med_well` | Well | props | 0.7 / 1.2 | F / N | INF | N | capture marker and lane dressing | S / 0.1 | none | pennywhistle, bellfount_abbey |
| `med_haystack` | Haystack | props | 1.0 / 2.0 | F / Y | 40 | Y (extreme) | instantly flammable fire starter; hides a crouched hoardling | M / 0.1 | embers when lit | pageant_green, pennywhistle, siege_camp |
| `med_hedge` | Hedge | nature | 0.6 / 1.8 | F / Y | 90 | Y | hedgerow segment: lanes, ambush, Yeomen identity | S / 0.1 | none | pageant_green, tourney_field, ford_of_dithering, pennywhistle |
| `med_supply_cart` | Supply Cart | props | 1.2 / 1.8 | F / Y | 120 | Y | cover; the war-chest core variant (hp overridden to 2400 by a mission) | S / 0.1 | none | mount_perpetual, siege_camp, pennywhistle, long_bridge |

## 4. Camp and pageant (7)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_war_tent` | War Tent | props | 2.0 / 3.2 | F / Y | 160 | Y | commander tent and spawn dressing | M / 0.1 | embers | siege_camp, mizzlemoor |
| `med_pavilion` | Pavilion | props | 2.0 / 4.0 | F / Y | 200 | Y | striped lists tent in the Marrowby colours | M / 0.1 | embers | pageant_green, tourney_field |
| `med_grandstand` | Grandstand | props | 4.0 / 4.0 | F / Y | 400 | Y | holds crowd props; collapses spectacularly (set-piece) and releases the crowd to flee | M / 0.2 | dust cloud on collapse | pageant_green, tourney_field, dour_courtyard |
| `med_tilt_barrier` | Tilt Barrier | props | 0.5 / 1.2 | F / N | 120 | Y | joust fence: funnels the charge into its lane | S / 0.1 | none | tourney_field, pageant_green |
| `med_maypole` | Maypole | props | 0.3 / 6.0 | F / N | 150 | Y | ribbons flutter (animation); falls over when hit (gag) | L / 0.1 | none | pageant_green, dour_courtyard |
| `med_bunting` | Bunting | props | 0 / 4.0 | N / N | 20 | Y | pennant strings: decor that flutters and burns in a visible ripple | M / 0.1 | none | pageant_green, tourney_field, dour_courtyard |
| `med_peasant_crowd` | Peasant Crowd | props | 0 / 2.0 | N / N | INF | N | animated spectators in smocks; recipe-only (`place:false`); panic at fire and dragons | M / 0.1 | none | pageant_green, tourney_field, dour_courtyard |

## 5. Toll and nature (3)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_toll_booth` | Toll Booth | props | 1.2 / 3.0 | F / Y | 300 | Y | the troll's booth; breaking it triggers the troll's rage (script event) | M / 0.1 | none | long_bridge |
| `med_willow` | Willow | nature | 0.5 / 5.0 | F / Y | 90 | Y | river-bank tree; readability screen at fords | M / 0.1 | none | ford_of_dithering, long_bridge, pageant_green |
| `med_standing_stone` | Standing Stone | nature | 0.8 / 3.0 | F / Y | INF | N | moor cover; hard prop | M / 0.1 | none | mizzlemoor |

## 6. Lair and abbey (6)

| id | name | cat | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `med_dragon_skull` | Dragon Skull | monuments | 2.0 / 4.0 | F / Y | INF | N | the previous tenant; hard cover | M / 0.2 | none | mount_perpetual |
| `med_hoard_pile` | Hoard Pile | monuments | 1.5 / 1.5 | N / N | INF | N | glowing coin heap with one spoon; scale 0.6-2.0 | S / 0.1 | glint sparkle (ambient, emissive voxels) | mount_perpetual |
| `med_lair_mouth` | Lair Mouth | monuments | 3.0 / 6.0 | F / Y | INF | N | glowing cave; the wyvern spawn point | L / 0.2 | ember glow, smoke | mount_perpetual |
| `med_beacon_brazier` | Beacon Brazier | props | 0.6 / 5.0 | F / N | INF | N | capture marker; lights (flame emitter, glow voxels) while held | L / 0.1 | flame while lit | mizzlemoor |
| `med_herb_bed` | Herb Bed | nature | 0 / 0.6 | N / N | 30 | Y | colour; dressing for the gas cloud | S / 0.1 | none | bellfount_abbey |
| `med_cloister_arch` | Cloister Arch | architecture | 0 / 5 | N / N | 300 | N | abbey decor; splash damage only | M / 0.1 | dust | bellfount_abbey |

## 7. Counts and checks

- 9 + 5 + 8 + 7 + 3 + 6 = **38** (target 38, floor 34). Hard (blocking and indestructible): well, standing_stone, beacon_brazier, dragon_skull, lair_mouth. Explosive (M12): oil_cauldron, pitch_barrel. Team-owned structures (M12 gate semantics): castle_gate, portcullis, drawbridge. Destroy-objective targets: castle_gate, portcullis, bell_tower (capture), keep (core). Animated (`spin`/`swing`/flutter): windmill sails, bell tower bell, maypole ribbons, bunting, crowd.
- Flammability and fire: 22 of 38 are `flam` (thatch, hay, timber, canvas); stone, iron-banded oak gate, towers, keep and hard props are not. Rain halves ignition chance (plan weather row).
- Ancient props reused through `any`: oak (scaled), pine, dead tree, bush, rocks, log, crate, barrel, bones, reeds, wheat, campfire, torch, fire pit.
- Cut-ladder candidates, in order, if the calibration table demands (props 38 to 34): `med_cloister_arch`, `med_herb_bed`, `med_standing_stone`, `med_bridge_parapet`. Wall-walk archers, smoke occlusion, teleport pads and wrecks are not used by this era.
- Budget guard: castle_dour needs about 90 wall segments plus 4 towers, 6 cauldrons, 6 hoardings and about 60 scatter props, well under 1500; distinct (type, variant) batches stay under 35 by limiting variants to 1-2 per prop outside nature props.
