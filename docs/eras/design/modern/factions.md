# Modern: factions (binding, synthesizer part 1)

Era id `modern`, id prefix `mod_` (factions keep bare ids like the Ancient ones: `marmalade directorate skyclub caution briefing shed`, checked against the 7 Ancient ids, the 6 Medieval ids and both Sci-Fi proposals: no hit), currency **requisitions** (`rq`). Six factions, 34 units (rosters.md). Display colours were re-measured with CIEDE2000 against the seven Ancient primaries (`0x2a5db0 0xb3262e 0x1f8f8a 0x6a3fb0 0x7a2a8a 0x2f7a3a 0xd4a017`, from `FACTIONS` in `era_ancient/stats.js`) and the six Medieval primaries (`#d9661c #8bb12e #8c9aa8 #d9577f #7d5434 #6e2438`). **None of the twelve primaries in the two proposals survives that test** (eleven sit 5.6-13.4 away from an Ancient or Medieval primary, the twelfth is the Sci-Fi cyan family); an exhaustive sweep of the colour wheel (hue every 10 degrees, lightness 18-95, chroma 15-110) shows that the only regions at least 17 away from all thirteen existing primaries are **pastels (lightness >= 80) and near-blacks (lightness 18-25)**. That constraint became the art direction: Modern is a **retro-appliance showroom**, mint refrigerator and butter-yellow teapot and powder-blue toaster over charcoal trim, which also separates it from the mid-tone heraldic colours of the first two eras at a glance. Script: scratchpad `de.mjs`, `t2.mjs`, `pal.mjs`, re-run by the VB `palette distance test`.

## Palette table

| id | name | primary | accent | nearest Ancient primary (dE00) | nearest Medieval primary (dE00) | nearest in-era primary (dE00) | doctrine in one line |
|---|---|---|---|---|---|---|---|
| `marmalade` | Marmalade Motor Pool | `#f7b08c` peach | `#2e3036` charcoal | Mythic 21.4 | Marrowby 20.0 | Caution 25.7 | armour and wheels: tanks, lunchboxes, runabouts, one very large teapot |
| `directorate` | Directorate of Convenient Logistics | `#2b2f36` cabinet charcoal | `#e9e4d4` paper cream | Carthaginians 23.2 | Wyrmkin 25.0 | Briefing 61.3 | indirect fire and call-ins: mortars, a howitzer, a radio, a Deputy Director |
| `skyclub` | Paper Plane Flying Club | `#98d8ff` sky | `#f7fbff` white | Egyptians 29.2 | Gatehouse 18.9 | Shed 30.6 | the air layer: drones, a goldfish bowl, a balloon, the only people who carry an umbrella |
| `caution` | Caution Tape Company | `#fbeb8f` butter | `#1b1b1b` black | Mythic 20.0 | Yeomen 21.3 | Shed 24.9 | engineers: mines, plough, plywood, dynamite, repair, first aid |
| `briefing` | Briefing Room Brigade | `#f2a8d2` candy pink | `#f6f3ec` warm white | Romans 39.8 | Bellfount 20.7 | Marmalade 26.6 | suppression and information: tripod MG, long lens, reporters, a podium |
| `shed` | Garden Shed Auxiliary | `#8ff0c0` mint | `#4a2a55` aubergine (terracotta only on the pot helmets) | Egyptians 29.2 | Yeomen 24.2 | Caution 24.9 | cheap, numerous and improvised: peas, drainpipes, trolleys, a mower, a barrow |

Minimum primary distance to any Ancient primary 20.0, to any Medieval primary 18.9, inside the era 24.9 (Caution / Shed). Soft spots the VB test must confirm or the fallback applies: Skyclub sky vs Gatehouse steel 18.9 (fallback `#a3dcff` if the plan's threshold is set above 18.9); **Caution butter vs the Ancient gold accent family 5.4** (accents are tested as pairs, not one by one: butter + black against gold + white is far apart as a pair; fallback butter `#f5f2a6`: 23.5 from Mythic gold, 21.0 from Shed mint); Marmalade peach vs Marrowby 20.0 (nearest Medieval primary; both are orange-ish: the peach is pastel and the charcoal accent carries the pair). Primaries drive faction chips, chooser art, Codex headers, emblem fields and the painted bodies of units; in battle the TEAM tint (blue / red), not the faction colour, is what the shader paints, and each faction names its **team-tint carrier** below because the tint floors (15 % non-hum, 30 % hum) are hard to meet on pastel toy hulls: the carrier is designed in from the first sketch (a saturated panel in the team colour on the part named). **Readability risk, named:** pastel hulls on pale concrete; look-dev checks each hull against `concrete`, `asphalt`, `paving` and `lino_tile` and darkens the charcoal trim share, not the primary.

Chrome accent: `#12a37f` (feel_sheet.md section 8), 22.3 from the nearest Ancient chrome token (olive `#8bc34a`) and 29.0 from the nearest Sci-Fi token.

## Banned-reference note (VB, binding for every faction)

Invented ranks only (Under-Colonel, Provisional Sub-Captain, Acting Everything, Deputy Director; nobody is promoted past "Acting"). No real nation, force, order, flag, anthem, camouflage pattern, olive-drab or desert-tan uniform, national colour set (no red-white-blue, no black-red-gold, no three-band layout of any kind: the hazard chevrons are plain upward chevrons, never three horizontal bands), no star, cross or crescent at flag size (the first-aider has a bandage roll and a lollipop, no cross anywhere; the tin hat is a biscuit tin, not a steel helmet of a real army), no pennant on an antenna (a bulb), no letters or numbers painted on any model (the "ON AIR" lamp is a red lamp), no real weapon or vehicle designation, no other company's franchise term ("Brigade", "Directorate", "Company", "Club" and "Auxiliary" are generic words; "Bureau of ..." and "Chapter" were avoided; "Cirrus", "Hollowell" and "Grommet" from proposal B were dropped because "Cirrus" is an aircraft maker, and the sky faction is named for the paper plane and the flying club, not a brand). "Howitzer", "mortar", "flak" and "gunship" are plain nouns; every chassis name is a household object (toast rack, lunchbox, teapot, mower, trolley, filing cabinet). Emblems come from a signed allow-list: citrus wedge with a bite, paperclip loop, folded paper plane, stacked chevrons, megaphone with three arcs, seedling in a pot (two leaves, no cross).

## 1. `marmalade`: Marmalade Motor Pool (peach `#f7b08c` + charcoal `#2e3036`)

- **Emblem:** a citrus wedge with a bite out of it. **Tint carrier:** the turret ring and the helmet band. **Silhouette language:** boxy, rounded kitchenware, big round turrets, lids, handles, slatted frames. **Doctrine:** armour and wheels; slow, hard to dent from the front, soft at the back, with infantry who ride in lunchboxes; the most forgiving faction to learn and the most punished by mines and by anyone who walks round the side.
- **Lore:** Founded when somebody noticed the cars were already parked. They hold the record for the longest convoy that never left the car park. Their motto, "Always Acting", is on every rank badge; nobody has ever been promoted past Acting.
- **Units (6):** `tin_hat_trooper`, `toast_rack_runabout`, `lunchbox_apc`, `biscuit_tank`, `teapot_heavy`, boss `grand_teapot`. Silhouette-unique unit: the Teapot Heavy.

## 2. `directorate`: Directorate of Convenient Logistics (charcoal `#2b2f36` + cream `#e9e4d4`)

- **Emblem:** a paperclip loop. **Tint carrier:** the tab dividers on the paper backpack and the cabinet's drawer fronts. **Silhouette language:** tall antennas, paper stacks, drawers, boxes on wheels. **Doctrine:** indirect fire and call-ins; weak up close, terrifying from three streets away; slow reloads and scheduled strikes; the faction that rewards screening and punishes being found.
- **Lore:** It exists to supply the war and has since come to believe it is the war. Every shell is filed before it is fired and archived after it lands. The Director has not been seen since the reorganisation; the Deputy says this is "a feature".
- **Units (6):** `clerk_rifleman`, `signal_officer`, `mortar_pair`, `filing_howitzer`, hero `deputy_director`, boss `final_notice`. Silhouette-unique unit: the Filing-Cabinet Howitzer.

## 3. `skyclub`: Paper Plane Flying Club (sky `#98d8ff` + white `#f7fbff`)

- **Emblem:** a folded paper plane. **Tint carrier:** the rotor disc rim and the balloon's alternate segments. **Silhouette language:** discs, long thin tails, hanging things, balloons. **Doctrine:** the air layer; fragile, unreachable by ground-only guns, ruinous to armour and artillery, helpless against anything that points upward; the faction that makes the player look up.
- **Lore:** A flying club that took out a loan and a helicopter and discovered both can be used on other people. Members are called "cadets" regardless of age or flight hours. The goldfish has more.
- **Units (5):** `hobby_drone`, `fishbowl_chopper`, `parasol_missileer`, `spotter_balloon`, boss `chandelier_gunship`. Silhouette-unique unit: the Fishbowl Chopper.

## 4. `caution`: Caution Tape Company (butter `#fbeb8f` + black `#1b1b1b`)

- **Emblem:** stacked upward chevrons (plain chevrons, never three horizontal bands). **Tint carrier:** the beacon lamp and the hard-hat brim. **Silhouette language:** wide hard hats, big blades, slabs of plywood, beacons, tape spools. **Doctrine:** engineers; mines, plough, plywood walls, dynamite, repair and first aid; slow and sturdy; wins by making the ground argue for it.
- **Lore:** Contracted to build a dam and kept being asked to knock things down. Every site is clearly signposted, every sign says "Caution", every sign is ignored. Their insurance policy is the single most feared object on the field.
- **Units (6):** `caution_sapper`, `dozer_plough`, `hoarding_bearer`, `dynamite_thrower`, `spanner_mechanic`, `site_first_aider`. No boss. Silhouette-unique units: the Hoarding Bearer and the Dozer Plough.

## 5. `briefing`: Briefing Room Brigade (candy pink `#f2a8d2` + warm white `#f6f3ec`)

- **Emblem:** a megaphone cone with three sound arcs. **Tint carrier:** the dish rim, the lectern front and the ammo-belt clip. **Silhouette language:** booms, lenses, lecterns, dishes, belts. **Doctrine:** suppression and information; machine guns, long-lens snipers, loud auras; fragile when flanked; the faction that teaches the Pin.
- **Lore:** Formed after somebody decided the best way to win a war was to describe it first. Their weapons are loud, their briefings are louder, and their spokesperson will take one question and answer a different one. Casualties are called "unplanned rapid redeployments".
- **Units (5):** `tripod_mg_team`, `long_lens_sharpshooter`, `cub_reporter`, hero `chief_spokesperson`, boss `broadcast_behemoth`. Silhouette-unique unit: the Tripod MG Team (the Behemoth is the boss).

## 6. `shed`: Garden Shed Auxiliary (mint `#8ff0c0` + aubergine `#4a2a55`)

- **Emblem:** a seedling in a pot (two leaves, no cross). **Tint carrier:** the hose coil and the mower deck skirt. **Silhouette language:** terracotta, wire baskets, tubes, tractors, hoses. **Doctrine:** cheap, numerous and improvised; swarm pressure and strange machines (a trolley ram, a ride-on mower, a barrow that fires pumpkins); every unit is a bad idea that works anyway.
- **Lore:** Assembled from whatever was in the shed after the real army forgot to collect it. Nothing is the right size for its job and everything works anyway. They apologise to the lawn first.
- **Units (6):** `flowerpot_peashooter`, `drainpipe_launcher`, `trolley_rammer`, `ride_on_mower`, `wheelbarrow_cannon`, boss `grand_mower`. Silhouette-unique unit: the Trolley Rammer.

## 7. Quick Battle doctrines (armygen styles; Mixed armies are the point of "combined arms")

| style | built from | the weakness it teaches |
|---|---|---|
| Armoured Fist | Marmalade: 2 tanks, lunchbox, troopers behind | a tank column with no AT escort loses to 4 drainpipes on the flank and to a mine at a choke |
| Dig and Shell | Directorate with Caution sappers: mortars, howitzer, signal officer, sappers | the guns die to anything that reaches their minimum range; screen them |
| Pin and Flank | Briefing MG plus reporters and Marmalade runabouts | the MG has a 3 s reload and a 100 degree arc |
| Air Umbrella | Skyclub with Directorate AA-free artillery | one parasol pair ruins it; the artillery cannot look up |
| Garden Blitz | Shed swarm: peas, trolleys, mowers, barrows | mass dies to one shell and to a hoarding wall |
| Red Tape | Caution bearers, thrower, plough, first-aider | splash and flank |

Mixed (`mixed`) draws from the Modern pool only (waves.js takes the pool from the era kit). The AA guarantee holds for every style: each pool contains weapons that hit air (rifles, SMGs, MGs, parasols).
