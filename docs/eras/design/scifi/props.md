# Sci-Fi: thirty-eight props (binding, synthesizer part 1)

Format follows `src/content/era_ancient/props/catalog.js`: `P(cat, r, h, hp, {blocks, cover, flam, place, scale, name})` where `r` is the blocking circle radius in u (before scale), `h` the projectile-cover height, `hp = INF` indestructible. Every prop id carries `sf_`; no shared Ancient `any` ids are used (the moon, the ice and the jungle have none of the Ancient trees or rocks), and nothing here duplicates a Medieval or Modern prop (`sf_` ids only). Categories reuse the four editor categories (`nature architecture monuments props`): 9 / 10 / 7 / 12. The merge of the two proposals: A and B each listed 38 props; eight ids are identical (ice spire, egg cluster, blast door, neon tower, solar array, cargo container, shield pylon, reactor core) and about fourteen more are the same idea under two names (A's glow tree and B's spore tree, A's resin wall and B's hive wall, A's coolant tank and B's fuel tank, A's junk heap and B's scrap heap, A's regolith boulder and B's moon rock, and so on); this list takes the better-named one in each pair. It keeps A's low-cover barrier **out** (Sci-Fi has no low cover, no cover-seeking AI and no mines: those are Modern's, feel_sheet.md s2.1 item 4), takes B's `sf_hab_dome`, `sf_force_gate`, `sf_holo_beacon`, `sf_teleport_pad` and `sf_drop_pod`, and drops A's walkable `sf_light_bridge` (a prop cannot make a cell walkable; bridges are terrain deck cells removed by `editTerrain`, arenas.md), A's holographic ad, street lamp and crane (billboards and towers carry the glow and the height), B's fungus stalk, vine curtain, hive sac (the egg cluster and the spire carry the objective roles), dish array, station strut, comm tower, gantry crane, lava vent (the geyser hazard has its own art), conduit cable and drone dock.

Conventions. **blocks** F = full and hard (indestructible, `nav.block`), S = soft (blocks until destroyed, `nav.soft`, +30 path cost), N = none. **cover** Y = stops projectiles and hitscan beams below `h` (the existing flag), N = does not; there is no `cover:'low'` row in this era. **flam** Y = burns and spreads (18 hp/s, `igniteAt`). **Footprint** is always the circle `r`; long walls and lane edges are chains of touching circles on a levelled strip (the Troy pattern); oriented rectangles are not requested (the W2 spike decides; this set is built so circles suffice). **Size class** from `h`: S under 2 u, M 2-5, L 5-9, XL over 9. **Voxel hint**: 0.1 for anything under about 4 u or 5 u, 0.2 for buildings and anything over about 5 u (a 0.1 voxel dome would be millions of cells; plan s7 and map 05 cap a model at about 100 k voxels; 14 of 38 are 0.2). Emitter kinds: `fire smoke ember` exist; `spark steam plasma` are new rows in the render emitter table (map 05 seam 4). The **destructible role** column is what the sim and the scripts may do with the prop.

## 1. Nature and terrain features (9)

| id | name | cat | footprint r / h (u) | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `sf_regolith_boulder` | Regolith Boulder | nature | 1.4 / 1.8 | F / Y | INF | N | hard obstacle; shapes the moon lanes and the chasm lip; never destructible | S / 0.1 | - | sf_moonbase, sf_chasm |
| `sf_basalt_pillar` | Basalt Pillar | nature | 1 / 4 | F / Y | INF | N | hard obstacle; marks the islets and the causeway edge of the lava lake | M / 0.1 | - | sf_lavaworld, sf_chasm |
| `sf_obsidian_shard` | Obsidian Shard | nature | 0.9 / 2.6 | S / Y | 160 | N | soft cover; shatters into violet-black glassy chunks (debris palette) | M / 0.1 | - | sf_lavaworld, sf_chasm |
| `sf_ice_spire` | Ice Spire | nature | 1.1 / 6 | F / Y | INF | N | tall hard cover on the lane margins (never inside the fight corridor above 4.5 u, W8) | L / 0.1 | spark (frost glints) | sf_iceworld |
| `sf_ice_block` | Ice Block | nature | 1.2 / 2 | S / Y | 220 | N | soft cover; breaks into ice shards that leave a pale decal | M / 0.1 | - | sf_iceworld |
| `sf_crystal_cluster` | Crystal Cluster | nature | 1 / 3 | S / Y | 220 | N | soft cover; glows violet and shatters into glow shards (glow voxels) | M / 0.1 | plasma (slow pulse) | sf_chasm, sf_iceworld, sf_hive |
| `sf_glow_tree` | Glow Tree | nature | 0.9 / 5 | S / Y | 160 | Y | soft cover; burns and spreads; canopy kept <= 4.5 u inside fight corridors (W8) | L / 0.1 | ember (spore drift) | sf_jungle, sf_biodome |
| `sf_giant_fern` | Giant Fern | nature | 0 / 2.2 | N / N | 30 | Y | decor; hides a cloak shimmer from the eye (not from detectors) | M / 0.1 | - | sf_jungle, sf_biodome |
| `sf_spore_pod` | Spore Pod | nature | 0.6 / 1.4 | S / N | 40 | Y | explosive prop: bursts into a gas cloud (r3, 4 s, slow 30 % + poison 3 dps) when destroyed | S / 0.1 | ember (spore puffs) | sf_jungle, sf_hive |

## 2. Architecture (10)

| id | name | cat | footprint r / h (u) | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `sf_hab_dome` | Hab Dome | architecture | 3.2 / 5.5 | S / Y | 900 | N | moon-base building; collapses to a rubble mound; the biodome uses a small variant | L / 0.2 | - | sf_moonbase, sf_biodome |
| `sf_dome_panel` | Dome Panel | architecture | 1.4 / 3.2 | S / Y | 400 | N | a section of dome wall; breaches on script (M1 set-piece) or to splash | M / 0.2 | steam (breach puff) | sf_moonbase, sf_biodome |
| `sf_airlock_door` | Airlock Door | architecture | 2 / 3.6 | S / Y | 600 | N | gate-class soft prop; destroy objective; three in a row make a bulkhead door | M / 0.2 | steam (hiss on hit) | sf_moonbase, sf_reactor, sf_orbital |
| `sf_blast_door` | Blast Door | architecture | 2.2 / 4 | S / Y | 1000 | N | team gate (`info.gate`): the owner passes, the enemy must breach; destroy target | M / 0.2 | spark (on hit) | sf_reactor, sf_orbital, sf_megamall |
| `sf_shop_front` | Shop Front | architecture | 1.6 / 3.4 | S / Y | 450 | N | a 3 u storefront; chains form the mall edges; shatters into glass confetti | M / 0.2 | plasma (neon flicker) | sf_megamall, sf_neoncity |
| `sf_neon_tower` | Neon Tower | architecture | 2.5 / 12 | F / Y | INF | N | skyline at map edges only (W8); hard so the nav never shifts | XL / 0.2 | plasma (sign glow) | sf_neoncity, sf_megamall |
| `sf_hull_plate` | Hull Plate | architecture | 1.8 / 3 | S / Y | 900 | N | large soft cover section (a wall segment); sparks and a dent stage | M / 0.2 | spark (on hit) | sf_crashsite, sf_reactor, sf_orbital, sf_lavaworld |
| `sf_bulkhead` | Bulkhead Wall | architecture | 1.2 / 3.6 | S / Y | 800 | N | station cover wall; a chain of touching circles on a strip makes a lane wall (Troy pattern) | M / 0.2 | spark (on hit) | sf_orbital, sf_reactor, sf_crashsite |
| `sf_resin_wall` | Resin Wall | architecture | 1.4 / 3 | S / Y | 500 | N | hive wall; a destroyed segment opens a new passage | M / 0.1 | steam (slow drip) | sf_hive |
| `sf_force_gate` | Force Gate | architecture | 1.8 / 3 | F / Y | INF | N | script-removable energy wall (`world.removeProp` on a switch or an EMP beat); decor if the effect is cut | M / 0.1 | plasma (shimmer) | sf_orbital, sf_chasm |

## 3. Props, gadgets and set dressing (12)

| id | name | cat | footprint r / h (u) | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `sf_cargo_crate` | Cargo Crate | props | 0.7 / 1 | S / N | 60 | N | waist-high movement obstacle that does not stop a beam; splinters into confetti | S / 0.1 | - | sf_moonbase, sf_crashsite, sf_megamall, sf_biodome |
| `sf_cargo_container` | Cargo Container | props | 1.4 / 2.6 | S / Y | 260 | N | stackable cover that rattles; two stack variants | M / 0.1 | - | sf_lavaworld, sf_reactor, sf_orbital, sf_crashsite |
| `sf_coolant_tank` | Coolant Tank | props | 0.9 / 2.2 | S / Y | 120 | N | explosive prop: r4 damage 90 and a frost-white blast with knock-back | M / 0.1 | steam (frost leak) | sf_reactor, sf_iceworld, sf_orbital |
| `sf_solar_array` | Solar Array | props | 1.2 / 1.4 | S / N | 120 | N | knee-high obstacle; tilts on hit; does not stop a beam | S / 0.1 | - | sf_moonbase, sf_crashsite, sf_iceworld |
| `sf_antenna_mast` | Antenna Mast | props | 0.3 / 6 | S / N | 90 | N | thin decor; the dish spins (render `spin`) | L / 0.1 | - | sf_moonbase, sf_neoncity, sf_orbital, sf_lavaworld |
| `sf_billboard` | Billboard | props | 1.6 / 5 | S / Y | 300 | N | glowing sign; flickers; falls over on script (the Concierge set-piece) | L / 0.2 | plasma (sign glow) | sf_neoncity, sf_megamall |
| `sf_parked_hovercar` | Parked Hovercar | props | 1.3 / 1.5 | S / Y | 200 | Y | cover; burns; a small blast on death | S / 0.1 | smoke (on death) | sf_neoncity, sf_megamall |
| `sf_help_kiosk` | Help Kiosk | props | 0.9 / 2.2 | S / Y | 200 | N | mall cover that smiles; sparks when hit; the hill marker in the megamall | M / 0.1 | spark (on hit) | sf_megamall |
| `sf_junk_heap` | Junk Heap | props | 1.3 / 2.2 | S / Y | 400 | Y | scrap cover; collapses into rubble; burns | M / 0.1 | smoke (smoulder) | sf_crashsite |
| `sf_holo_beacon` | Holo Beacon | props | 0.4 / 3 | N / N | INF | N | capture-post visual: marks hills and capture points, colour-coded by owner (no collision) | M / 0.1 | plasma (ring pulse) | sf_lavaworld, sf_neoncity, sf_chasm, sf_biodome, sf_megamall |
| `sf_teleport_pad` | Teleport Pad | props | 1 / 0.1 | N / N | INF | N | paired pads: a unit standing on one hops to its pair (cuttable: plan rung 5 turns it into decor) | S / 0.1 | plasma (ring) | sf_orbital, sf_biodome |
| `sf_drop_pod` | Drop Pod | props | 0.9 / 2 | S / Y | 120 | N | landing prop for the Grazer Drop and reinforcement beats; soft cover; the hatch opens | M / 0.1 | smoke (landing puff) | sf_iceworld, sf_hive, sf_jungle |

## 4. Monuments and objectives (7)

| id | name | cat | footprint r / h (u) | blocks / cover | hp | flam | destructible role | size / voxel | emitters | arenas |
|---|---|---|---|---|---|---|---|---|---|---|
| `sf_reactor_core` | Reactor Core | monuments | 2.5 / 5 | S / Y | 2000 | N | destroy objective (M3) and defend_core in Quick; chain explosion on death (explosive r8 damage 160) | L / 0.2 | steam + plasma pulse | sf_reactor |
| `sf_shield_pylon` | Shield Pylon | monuments | 0.9 / 4 | S / Y | 700 | N | destroy objective; a small blast on death (explosive r4 damage 70) that pops nearby bubbles | M / 0.2 | plasma (glow) | sf_reactor, sf_neoncity |
| `sf_heart_tree` | Heart Tree | monuments | 2.6 / 9 | S / Y | 2400 | Y | defend_core prop (M7); team-owned; glows brighter when healthy | XL / 0.2 | ember (spore drift) | sf_jungle |
| `sf_hive_spire` | Hive Spire | monuments | 1.8 / 7 | S / Y | 1400 | N | destroy objective; spits a goo decal on damage | L / 0.2 | steam (drip) | sf_hive |
| `sf_egg_cluster` | Egg Cluster | monuments | 1 / 1.4 | S / N | 260 | N | hatch point: on death a script `spawn` releases skitterlings (M14 prop-destroyed trigger) | S / 0.1 | plasma (pulse) | sf_hive, sf_jungle |
| `sf_wreck_engine` | Wreck Engine | monuments | 2.6 / 4.5 | F / Y | INF | N | burning decor and hard cover; the crash site's landmark | M / 0.2 | fire + smoke | sf_crashsite |
| `sf_escape_pod` | Escape Pod | monuments | 1.1 / 2.4 | S / Y | 300 | N | soft cover; the VIP spawn marker in M4 (open hatch) | M / 0.1 | - | sf_crashsite |

## 5. Census, budgets, requests

- **Counts:** 38 props: 6 hard (indestructible, blocking), 29 soft (blocking until destroyed), 3 non-blocking decor/marker. Categories nature 9, architecture 10, props 12, monuments 7. Explosive props (M12 `explosive {r, dmg}`): `sf_spore_pod` (gas), `sf_coolant_tank`, `sf_reactor_core`, `sf_shield_pylon`, `sf_parked_hovercar` (small). Gate-class (M12 `info.gate`): `sf_blast_door` (team gate), `sf_airlock_door`. Script-driven: `sf_dome_panel` (breach), `sf_billboard` (falls), `sf_force_gate` (`world.removeProp`), `sf_egg_cluster` (prop-destroyed trigger spawns skitterlings), `sf_teleport_pad` (paired hop). Team-owned (`Prop.team`): `sf_blast_door`, `sf_reactor_core`, `sf_heart_tree`, `sf_shield_pylon` in missions.
- **Draw-call discipline (W9):** no recipe uses more than 9 prop types, so at most 18 (type, variant) batches against the limit of 35, plus damage-stage batches that share rubble; the per-arena table follows. Terrain is 36 (medium) or 64 (large) chunk draws; with units the Marble reference stays near 123-132 draws, and the Sci-Fi worst case (orbital: 9 types) adds no more than the Ancient Troy arena (45 batches).
- **Readability (W8):** towers (`sf_neon_tower` 12 u, `sf_billboard` 5 u, `sf_heart_tree` 9 u, `sf_ice_spire` 6 u, `sf_hive_spire` 7 u, `sf_antenna_mast` 6 u) stand on map edges or at objective sites; inside the fight corridor no prop exceeds 4.5 u and every recipe keeps >= 75 percent of 200 head-height points visible from the default camera (`tests/props/readability.test.mjs` over seeds 1, 3, 7 and both sizes). The jungle canopy follows the Teutoburg "wall around a glade" pattern.
- **Perf of destruction:** deaths are coalesced per tick and re-stamped by dirty rect (M12); coolant tanks and reactor chains are capped at 2 explosions per tick; craters at <= 2 per second (M10).
- **Requests (each with a fallback; none blocks a mission):** (1) emitter rows `spark`, `steam`, `plasma` in `props.js` (fallback: `smoke` and `ember`); (2) a `spin` flag in the float matrix loop for the antenna dish (fallback: static); (3) `explosive` with a status payload for the Spore Pod gas (fallback: plain explosion r3, damage 20); (4) a prop-destroyed trigger for script `spawn` (M14) for the Egg Cluster (fallback: the mission script spawns on a timer); (5) `sf_teleport_pad` pair trigger (rung 5 cuttable: decor if cut; no mission or puzzle depends on it); (6) `Prop.team` and `info.gate` (M12); (7) `world.removeProp` already exists for the Force Gate. The `audio/cues.js` `PROP_WALL` and `PROP_WOOD` regexes need rows for hull, glass, crystal and ice (hull and bulkhead = metal clang, shop front and dome = glass, crystal and ice = shatter) or the destroy sounds fall to silence.
- **Materials appended** (REGISTRY assigns the ids after Modern's 16-22; frozen once shipped; each row `{top[3], strata[2], speed, foot, flammable, emissive?, hazard?, era:'scifi'}`): `regolith` (moon, 0.95), `basalt` (lava shore, 1.0), `ice` (0.80), `hull_plate` (decks, 1.05), `neon_pad` (emissive tile and bridges, 1.05), `resin` (hive floor, 0.90), `goo` (hive pools, 0.70), `glow_moss` (jungle floor, 0.95, emissive-lite), `tile_floor` (mall and biodome, 1.08). Nine rows, inside the "16+" budget; `ice` slipperiness is not modelled (no sim change).

## 6. Prop use by arena (the W9 table and the coverage check: every prop appears in at least one arena)

| arena | prop types used | visible (type, variant) batches at <= 2 variants | prop list |
|---|---|---|---|
| `sf_moonbase` | 7 | <= 14 (limit 35, W9) | `sf_regolith_boulder`, `sf_hab_dome`, `sf_dome_panel`, `sf_airlock_door`, `sf_cargo_crate`, `sf_solar_array`, `sf_antenna_mast` |
| `sf_lavaworld` | 6 | <= 12 (limit 35, W9) | `sf_basalt_pillar`, `sf_obsidian_shard`, `sf_hull_plate`, `sf_cargo_container`, `sf_antenna_mast`, `sf_holo_beacon` |
| `sf_reactor` | 8 | <= 16 (limit 35, W9) | `sf_airlock_door`, `sf_blast_door`, `sf_hull_plate`, `sf_bulkhead`, `sf_cargo_container`, `sf_coolant_tank`, `sf_reactor_core`, `sf_shield_pylon` |
| `sf_crashsite` | 8 | <= 16 (limit 35, W9) | `sf_hull_plate`, `sf_bulkhead`, `sf_cargo_crate`, `sf_cargo_container`, `sf_solar_array`, `sf_junk_heap`, `sf_wreck_engine`, `sf_escape_pod` |
| `sf_megamall` | 8 | <= 16 (limit 35, W9) | `sf_blast_door`, `sf_shop_front`, `sf_neon_tower`, `sf_cargo_crate`, `sf_billboard`, `sf_parked_hovercar`, `sf_help_kiosk`, `sf_holo_beacon` |
| `sf_neoncity` | 7 | <= 14 (limit 35, W9) | `sf_shop_front`, `sf_neon_tower`, `sf_antenna_mast`, `sf_billboard`, `sf_parked_hovercar`, `sf_holo_beacon`, `sf_shield_pylon` |
| `sf_jungle` | 6 | <= 12 (limit 35, W9) | `sf_glow_tree`, `sf_giant_fern`, `sf_spore_pod`, `sf_drop_pod`, `sf_heart_tree`, `sf_egg_cluster` |
| `sf_hive` | 6 | <= 12 (limit 35, W9) | `sf_crystal_cluster`, `sf_spore_pod`, `sf_resin_wall`, `sf_drop_pod`, `sf_hive_spire`, `sf_egg_cluster` |
| `sf_orbital` | 9 | <= 18 (limit 35, W9) | `sf_airlock_door`, `sf_blast_door`, `sf_hull_plate`, `sf_bulkhead`, `sf_force_gate`, `sf_cargo_container`, `sf_coolant_tank`, `sf_antenna_mast`, `sf_teleport_pad` |
| `sf_iceworld` | 6 | <= 12 (limit 35, W9) | `sf_ice_spire`, `sf_ice_block`, `sf_crystal_cluster`, `sf_coolant_tank`, `sf_solar_array`, `sf_drop_pod` |
| `sf_chasm` | 6 | <= 12 (limit 35, W9) | `sf_regolith_boulder`, `sf_basalt_pillar`, `sf_obsidian_shard`, `sf_crystal_cluster`, `sf_force_gate`, `sf_holo_beacon` |
| `sf_biodome` | 7 | <= 14 (limit 35, W9) | `sf_glow_tree`, `sf_giant_fern`, `sf_hab_dome`, `sf_dome_panel`, `sf_cargo_crate`, `sf_holo_beacon`, `sf_teleport_pad` |

