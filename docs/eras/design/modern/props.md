# Modern: thirty-eight props (binding, synthesizer part 1)

Format follows `src/content/era_ancient/props/catalog.js`: `P(cat, r, h, hp, {blocks, cover, flam, place, scale, name})` where `r` is the blocking circle radius in u (before scale), `h` the projectile-cover height, `hp = INF` indestructible. Every prop id carries `mod_`; shared generic props keep their `any` ids and are not counted: `tree_oak tree_pine bush rock_small rock_big cactus palm reeds wheat campfire log crate barrel`. Categories reuse the four editor categories (`nature architecture monuments props`); the **role** column below is the design category (cover, obstacle, hazard, building, core, structure, decor, target, marker). Proposal A listed 38 and B 38; the merge keeps 35 of A's, takes `mod_traffic_cone` and `mod_wreck` from B, adds `mod_barge` (the harbour needs a floating vessel and the Ancient `ship` is a trireme), and drops `mod_house_small`, `mod_water_tower`, `mod_pylon`, `mod_lawn_gnome` (edge skyline and gags the arenas can do without).

Conventions. **blocks** F = full (hard, indestructible, `nav.block`), S = soft (blocks until destroyed, `nav.soft`, +30 path cost), N = none. **cover** `high` = the existing flag (stops projectiles below `h`), `low` = the new `cover:'low'` field (plan M9/W2: a unit within 1.2 u on the shooter's side takes x0.5 from bullets and gains `inCover`; it does not stop the shot), `-` = none. **flam** Y = burns and spreads (18 hp/s, `igniteAt`). **Footprint** is always the circle `r`: long walls, rail strips and street fronts are chains of touching circles on a levelled strip (the Troy pattern); oriented rectangles are not requested (the W2 spike decides; this set is built so that circles suffice). **Voxel hint**: 0.1 for anything under about 4 u, 0.2 for buildings and anything over about 6 u (a 0.1 voxel hangar would be millions of cells; plan s7 and map 05 cap a model at about 100 k voxels). **Size class**: S (under 2 u tall), M (2-5), L (5-9), XL (over 9). **Emitters** are ambient or reactive particle sources (WORLD maps the names to emitter kinds; the new kinds `spark`, `steam`, `confetti`, `glow` extend the `fire / smoke / ember` table, map 05 seam 4). `explosive {r, dmg}` is the M12 field. Hit points were chosen against Modern damage (mortar 48, howitzer 90 with structDmg x2, tank shell 60-120, dozer blade 40 x3): a sandbag wall falls to two shells, a shop front to eight, a sluice gate to the Final Notice's shell plus a howitzer, and BALANCE retunes, the targets are what is binding.

## 1. Cover and obstacles (9)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_sandbag_wall` | Sandbag Wall | props | cover | 0.9 / 1.0 | S / low | 140 | N | splash chews it; the first thing every unit hides behind; laid as a chain along a lip | S / 0.1 | sand puff on hit | parade_yard, hedgerow_meadow, trench_line, desert_outpost, downtown, dam |
| `mod_sandbag_nest` | Sandbag Nest | props | cover | 1.6 / 1.1 | N / low | 220 | N | a ring for an MG team (units inside are covered all round); shells open it, a crater breaks it | S / 0.1 | sand puff | trench_line, rail_yard, desert_outpost |
| `mod_hay_bale` | Hay Bale | props | cover | 0.9 / 1.0 | S / low | 80 | Y | burns and tells the player what fire does; variant 3 is the roadworks cow | S / 0.1 | straw puff, smoke when burning | parade_yard, hedgerow_meadow, roadworks |
| `mod_hedge_row` | Hedge Row | nature | cover | 1.0 / 1.2 | S / low | 90 | Y | the meadow's cover lattice and the garden centre's flower-bed borders; burns | S / 0.1 | leaf puff | hedgerow_meadow, garden_centre |
| `mod_crate_stack` | Crate Stack | props | cover | 0.9 / 1.6 | S / high | 120 | Y | stackable cover, 3 variants; variant 3 is "the Parcel" on the dam crest | S / 0.1 | splinter puff | parade_yard, harbour, rail_yard, downtown, dam |
| `mod_dugout_roof` | Dugout Roof | props | cover | 2.2 / 1.4 | S / high | 300 | Y | trench roofing; caves in under a mortar and exposes whoever is under it | M / 0.1 | dust, ember when burning | trench_line |
| `mod_road_barrier` | Road Barrier | architecture | obstacle | 1.1 / 1.0 | S / low | 500 | N | street chokepoints; blocks vehicles; the Dozer Plough eats it (structDmg x3) | S / 0.1 | dust | bridge_gorge, downtown, roadworks, desert_outpost |
| `mod_girder_cross` | Girder Cross | props | obstacle | 1.0 / 1.6 | S / - | 420 | N | three crossed girders (bullets pass the lattice); blocks vehicles, infantry squeeze past | S / 0.1 | spark on hit | bridge_gorge, rail_yard, harbour |
| `mod_barbed_coil` | Barbed Coil | props | obstacle | 1.0 / 0.6 | N / - | 40 | N | an AI lane hint and no-man's-land decor; vehicles crush it for free | S / 0.1 | none | trench_line, desert_outpost |

## 2. Hazards, cargo and vehicles (7)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_barrel_oil` | Oil Barrel | props | hazard | 0.5 / 1.0 | S / - | 30 | Y | `explosive` r 3, dmg 60; the chain-reaction toy | S / 0.1 | smoke trail when burning, fireball | rail_yard, harbour, desert_outpost, airfield |
| `mod_fuel_tank` | Fuel Tank | architecture | hazard | 2.0 / 3.0 | S / high | 200 | Y | `explosive` r 6, dmg 120; airfield, desert, rail throat; chains with barrels | M / 0.1 | fire, smoke | airfield, rail_yard, desert_outpost |
| `mod_shipping_container` | Shipping Container | architecture | cover | 2.2 / 2.6 | S / high | 700 | N | harbour and compound walls; a stack of two (variant 2) reads as a building; variant 3 is the garden centre's potting shed | M / 0.1 | clang spark | harbour, rail_yard, desert_outpost, garden_centre |
| `mod_parked_car` | Parked Car | props | cover | 1.2 / 1.4 | S / low | 240 | Y | burns, then pops (`explosive` r 2.5, dmg 35); vehicles shove it; leaves a wreck | S / 0.1 | smoke, fire | downtown, roadworks, bridge_gorge |
| `mod_barge` | Landing Barge | architecture | structure | 3.0 / 2.5 | S / high | 600 | N | a floating prop (FLOAT table row `kind:'water'`); the M8 ramp slam spawns beside it | M / 0.1 | wake foam | harbour |
| `mod_boxcar_cargo` | Boxcar | architecture | target | 2.4 / 2.8 | S / high | 900 | Y | the M5 destroy target (4 of them); on death every wagon pops open into confetti and fireworks (cosmetic); variant 3 is a fuel car (`explosive` r 5, dmg 120) | M / 0.1 | confetti, spark | rail_yard |
| `mod_wreck` | Vehicle Wreck | props | decor | 1.5 / 1.0 | S / low | INF | N | spawned by M17e on a vehicle death (not placeable); smokes, capped decay; under the cut ladder (rung 5) it becomes a decal | S / 0.1 | smoke | any battle |

## 3. Buildings (7, voxel 0.2, edges of the map)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_shop_row` | Shop Row | architecture | building | 3.6 / 4.5 | S / high | 700 | Y | the street wall; windows pop, stage 1 cracked, stage 2 rubble; chains along block fronts | L / 0.2 | smoke, glass sparkle | downtown, roadworks |
| `mod_apartment_block` | Apartment Block | architecture | building | 4.5 / 8.0 | S / high | 1100 | Y | block filler and edge-of-map height (W8); rubble stage 2 | L / 0.2 | smoke | downtown, roadworks |
| `mod_office_block` | Office Block | architecture | building | 5.0 / 10.0 | S / high | 1400 | N | the tallest prop, map edges only (W8); glass facade pops | XL / 0.2 | glass sparkle | downtown, roadworks |
| `mod_warehouse` | Warehouse | architecture | building | 5.5 / 5.0 | S / high | 1000 | N | rail yard, harbour and desert backdrops; the roof caves in at stage 2 | L / 0.2 | dust | rail_yard, harbour, desert_outpost |
| `mod_hangar` | Hangar | architecture | building | 6.0 / 7.0 | S / high | 1500 | N | airfield; the doors open in the flypast set-piece | XL / 0.2 | dust | airfield |
| `mod_control_tower` | Control Tower | monuments | building | 2.2 / 9.0 | S / high | 900 | N | airfield landmark; the kill_general stands under it | XL / 0.2 | light blink | airfield |
| `mod_greenhouse` | Greenhouse | architecture | building | 3.0 / 3.0 | S / - | 220 | N | glass panes pop into voxel confetti; no cover; a huge visual | M / 0.2 | glass sparkle | garden_centre |

## 4. Core and structures (5)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_switchboard_tower` | Switchboard Tower | monuments | core | 2.6 / 10.0 | S / high | 2500 | N | the M6 `defend_core` object (`Prop.team`), 3 damage stages (60 %, 30 %); windows are glow voxels that blink in time to the hold music below 50 % | XL / 0.2 | glow blink, speaker pulse, smoke | downtown (added by the mission) |
| `mod_bridge_pier` | Bridge Pier | architecture | structure | 1.0 / 3.0 | F / high | INF | N | holds the deck; only script events remove it | M / 0.1 | none | bridge_gorge, dam |
| `mod_crane_gantry` | Crane Gantry | architecture | structure | 1.8 / 12.0 | S / high | 900 | N | harbour and rail skyline; the boom swings in the crane-down set-piece | XL / 0.2 | spark | harbour, rail_yard |
| `mod_dam_gate` | Sluice Gate | architecture | structure | 1.6 / 5.0 | S / high | 1800 | N | the M9 destroyable sluice (`Prop.team`, `info.gate`); death releases a white-water particle sheet down the spillway | L / 0.2 | water spray | dam |
| `mod_radar_dish` | Radar Dish | monuments | decor | 1.5 / 4.5 | S / - | 300 | N | spins (animated prop row, static otherwise); a hit makes it wobble | L / 0.1 | spark | desert_outpost |

## 5. Street and decor (7)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_guard_rail` | Guard Rail | architecture | decor | 0.5 / 0.9 | N / - | 60 | N | bridge and quay edge; snaps in the wrecking-toll set-piece | S / 0.1 | spark | bridge_gorge, dam, harbour |
| `mod_lamp_post` | Lamp Post | props | decor | 0.3 / 4.0 | N / - | 60 | N | a night-light emitter; topples; variant 2 is the parade yard's loudspeaker post | M / 0.1 | glow | downtown, bridge_gorge, roadworks, parade_yard |
| `mod_rail_track` | Rail Track | props | decor | 0.6 / 0.1 | N / - | INF | N | a flat ballast strip laid in chains; vehicles roll along it | S / 0.1 | none | rail_yard |
| `mod_parked_plane` | Parked Plane | props | decor | 2.6 / 2.4 | S / low | 150 | Y | a toy-box airliner and glider; a wing snaps | M / 0.1 | smoke when burning | airfield |
| `mod_windsock_pole` | Windsock Pole | props | decor | 0.3 / 4.0 | N / - | 40 | N | the flag-free pole; the sock points where the weather goes | M / 0.1 | none | airfield, parade_yard |
| `mod_traffic_cone` | Traffic Cone | props | decor | 0.3 / 0.7 | N / - | 5 | N | the roadworks gag; scatters with a confetti puff | S / 0.1 | confetti | roadworks |
| `mod_target_dummy` | Target Dummy | props | target | 0.4 / 1.8 | N / - | 40 | N | pop-up silhouette cutouts (no letters or numbers), they fold flat when hit; the M1 set-piece | S / 0.1 | confetti | parade_yard |

## 6. Markers and gameplay objects (3)

| id | name | cat | role | r / h | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `mod_picnic_hamper` | Picnic Hamper | props | marker | 0.6 / 0.8 | N / - | 60 | Y | the M2 hill object; bursts into confetti sandwiches in the set-piece | S / 0.1 | confetti | hedgerow_meadow |
| `mod_signal_post` | Signal Post | props | marker | 0.3 / 3.0 | N / - | INF | N | the capture-point lamp; takes the holder's team tint; the M3 objective | M / 0.1 | glow | trench_line, rail_yard |
| `mod_tape_ring` | Tape Ring | props | marker | 1.0 / 0.1 | N / - | 1 | N | the mine tell: a yellow tape ring with a blinking light, spawned by `lay_mine` and also placed as minefield signage (the visible half of "tape means mines") | S / 0.1 | glow blink | any battle with mines |

## 7. Census, budgets, cuts

- **Census (38):** by group 9 cover and obstacles, 7 hazards cargo and vehicles, 7 buildings, 5 core and structures, 7 street and decor, 3 markers; by design role cover 8, decor 8, building 7, structure 4, obstacle 3, marker 3, hazard 2, target 2, core 1; by editor category `props` 19, `architecture` 15, `monuments` 3, `nature` 1 (counted from the tables above by script).
- **Draw budget (W9):** at most 35 visible (type, variant) batches per recipe; the largest recipe (`mod_downtown`) uses about 22 types x 1.5 variants; the stage-1 and stage-2 damage models of buildings are separate batches, so building variants per arena are capped at 2 and rubble is shared.
- **Explosive props (M12):** barrel, fuel tank, fuel boxcar and the burning car use `explosive`; each death is coalesced per tick and cascades at most one chain step per tick. The four are the Modern perf worst case together with craters (plan s4 perf scenario).
- **Audio ids for the destroy-sound table (matched by id substring):** `sandbag`, `container`, `girder`, `glass` (greenhouse, shop row facade), `concrete` (barrier, dam gate), `hay`; each needs a real row or an approved synth in the AU matrix.
- **Cut ladder (plan s13 rung 3, props 38 → 34):** `mod_traffic_cone`, `mod_windsock_pole`, `mod_lamp_post`, `mod_apartment_block` go first (office block and shop row carry the skyline); `mod_wreck` degrades to a decal under rung 5; nothing a mission names is cut.
- **Unknown-prop import message:** ids are immutable, tombstone kinds exist before the first publish (plan AR2).
