# Medieval: factions (binding, synthesizer part 1)

Era id `medieval`, id prefix `med_`, currency **groats**. Six factions, 34 units (rosters.md). Colours were re-measured with CIEDE2000 against the seven Ancient primaries (`0x2a5db0 0xb3262e 0x1f8f8a 0x6a3fb0 0x7a2a8a 0x2f7a3a 0xd4a017`); three of proposal A's colours failed or sat on the line and were changed (Gatehouse slate was 10.9 from the Hellenes blue; Wyrmkin sulphur as a primary was 14.1 from the Mythic gold; Marrowby rust-orange was 15.5 from the Roman red). All primaries below are >= 17.4 from every Ancient primary and >= 21.6 from each other (script: scratchpad `de.mjs`, re-run by VB `palette distance test`).

## Palette table

| id | name | primary | accent | min dE00 to Ancient primaries (nearest) | min dE00 inside the era | doctrine in one line |
|---|---|---|---|---|---|---|
| `marrowby` | Crown of Marrowby | `#d9661c` pumpkin-orange | `#f1e4c0` cream | 23.8 (Mythic) | 21.6 (Mostly Paid Company) | shock cavalry and banners |
| `yeomen` | Long Hedge Yeomanry | `#8bb12e` hedge-lime | `#5a3b22` walnut | 23.5 (Mythic) | 37.2 (Gatehouse) | pike wall, longbow, endless levies |
| `gatehouse` | Gatehouse League | `#8c9aa8` pale steel | `#cfe0ee` frost (replaces proposal A's lemon, which sat 9.8 from Wyrmkin sulphur) | 21.6 (Egyptians) | 32.0 (Bellfount) | fortification and artillery |
| `bellfount` | Bellfount Abbey | `#d9577f` rose | `#bfe3cf` mint | 20.4 (Romans) | 26.5 (Wyrmkin) | sustain, stun, poison cloud |
| `free_company` | The Mostly Paid Company | `#7d5434` tobacco | `#2db5c9` sky-cyan patches | 20.0 (Romans); accent cyan 15.3 from Egyptian teal, VB to confirm or shift to `#3fb8e0` | 21.6 (Marrowby) | hired breakers: nets, rams, fire, one very large gun |
| `wyrmkin` | Hoard of Mount Perpetual | `#6e2438` oxblood | `#dccb2c` sulphur (accent only; pair test vs Mythic gold) | 17.4 (Romans) | 23.9 (Mostly Paid Company) | swarm, monsters, the sky layer |

Notes for the palette test: primaries drive faction chips, banner cloth, chooser art and emblem fields. In battle the TEAM tint (not the faction colour) is what the shader paints, and each unit's tint zone is listed in rosters.md (surcoat, sash, patch, sack). Accent colours are tested as PAIRS against the seven Ancient pairs (the plan's test), not one by one. Two accents are known soft spots: cyan (`free_company`) and sulphur (`wyrmkin`); the fallback values are `#3fb8e0` and `#e3d34a`.

## Banned-reference note (VB, binding for every faction)

Names: no faction, unit or rank name may be another company's franchise term. Proposal A's "Bellfount Chapter" was renamed "Bellfount Abbey" for that reason ("Chapter" is the proprietary organisational term of a well-known miniatures franchise); Proposal A's "Free Company" is also the name of a guild feature in a large online game, so the display name is "The Mostly Paid Company" (the faction id `free_company` is internal and unchanged, so nothing downstream breaks). "Crown", "League", "Yeomanry" and "Hoard" are generic English and stay.

No red/white/blue combination and no black/white combination; no three-band flag layout; no cross, saltire, star, crescent, fleur-de-lis, lion, eagle, double-headed anything, no letters or numbers on any model or emblem; no tabard that matches a real order, a real royal house, a real city arms or a real regiment; no white mantle with a dark cross; no red cross on white; no crowned-and-sworded monarch emblem; no real saint, pope, crusade or holy-war language. Emblems are canting jokes (a stool, a hedgehog, a cat flap, a bell, a bitten coin, a spoon) and enter by signed allow-list append. The beaked-mask physician is a costume gag: mint beak, no real-world plague iconography beyond the beak silhouette, no suffering text ever. The "plague" is a mint-green sneezing cloud and the people in it sit down politely.

## The six factions

### 1. Crown of Marrowby (`marrowby`, 7 units)
- **Emblem:** a three-legged stool wearing a crown that does not fit (alt, cut: gauntlet holding a turnip).
- **Silhouette language:** TALL and VERTICAL. Plumes, lances twice the rider's height, pennons, long chequered caparison skirts down to the horse's knees. The widest, showiest army on any field.
- **Identity:** shock cavalry, banners, heralded charges. Expensive, brittle, devastating on open ground, helpless against a planted pike. Win: land the charge on a prepared target and keep the standard standing. Weak: a braced block, nets, crossbows, a falling banner.
- **Lore joke:** Marrowby has a king, a queen and a stool and nobody is sure which of them is in charge. The rule book of chivalry is posted on a board nobody can reach. Every battle is officially a tournament until someone is hurt, and then it is a tournament with a waiver.
- **Tint zones:** surcoat, caparison chequers, plume. **Units:** squire, lancer, knight_errant, knight_afoot, standard_bearer, ser_valiant, pageant_dragon.
- **Quick doctrine ("Hammer on the Pikes"):** a banner in the middle, lancers timed to the enemy's reload, a decoy dragon in front to eat the first volley.

### 2. Long Hedge Yeomanry (`yeomen`, 6 units)
- **Emblem:** a hedgehog sitting very still in a hedge (alt, cut: a haystack flying a very small flag).
- **Silhouette language:** LEAN and LONG. Bows taller than the archers, pikes as combs of poles across the field, leaf-wide hats, one hog the size of a cottage.
- **Identity:** the people's army: spear wall, longbow volleys, bills that wreck armour, endless cheap levies. Win: hold the shape. Weak: plate in contact, flank charges once the block breaks, trebuchets, the dragon.
- **Lore joke:** tenant farmers with extremely long bows, extremely long pikes and an extremely long list of grievances, filed in triplicate and then sharpened. They have lived behind the same hedge for nine hundred years and have opinions about people who trample it. The hedge has never lost a battle, mostly because it has never moved.
- **Tint zones:** sash, hat band, banner cloth. **Units:** billman, pikeman, longbowman, peasant_levy, reeve, great_hog.
- **Quick doctrine ("Hedgehog"):** 60 percent pikes in two offset ranks, longbows behind on Hold, the reeve in the middle, levies as the mortar.

### 3. Gatehouse League (`gatehouse`, 6 units)
- **Emblem:** a castle gate with a very small cat flap in it.
- **Silhouette language:** SQUARE and BOXY. Crenellated kettle-hat brims, door-sized pavise boards, flat-roofed machines, one walking castle.
- **Identity:** fortification and out-ranging artillery: slow, armoured, dies when you reach it. Win: out-range and out-spend. Weak: anything that closes inside a reload window, fire, flankers, the League's own paperwork.
- **Lore joke:** eleven castles agreed to defend each other and then each locked its gate to see how the others would cope. Everything is run by committee, so every wall has a clause and every drawbridge a quorum. Their siege engines are superb, their post is slow, and the motto is "Please Knock".
- **Tint zones:** pavise face, kettle brim, machine pennants. **Units:** crossbowman, pavise_bearer, springald, trebuchet, rolling_keep, castellan.
- **Quick doctrine ("Paid Distance"):** two crossbows to one pavise, trebuchet behind, springald on the flank for anything with wings.

### 4. Bellfount Abbey (`bellfount`, 5 units)
- **Emblem:** a handbell with its clapper on the outside (alt, cut: a bell with a mouse inside).
- **Silhouette language:** ROUND and SOFT. Bell-shaped skirts, big round hoods, beaked masks (mint beak, at least 2x2 voxels), a barrel-sized bell on a pole.
- **Identity:** attrition and control: healers, stunning bells, mint-green poison clouds. Wins long fights, loses short ones. Win: outlast. Weak: flanks on the healers, fast cavalry, fearless units.
- **Lore joke:** an abbey-state run by bell: one for dinner, one for danger, and one for dinner during danger. The medicine cupboard and the poison cupboard are the same cupboard and the label fell off in the spring. Everyone is very kind about it.
- **Tint zones:** bell-skirt hem, bell, beak trim. **Units:** bellringer, physician, apothecary, plague_cart, abbess.
- **Quick doctrine ("Slow Soup"):** stocky front, one physician per eight bodies, bells on the flanks, a cart rolling through the middle.

### 5. The Mostly Paid Company (`free_company`, 5 units)
- **Emblem:** a coin with a bite taken out.
- **Silhouette language:** ASYMMETRIC and PATCHED. One huge pauldron, mismatched leather, a cyan patch on everything, a feather in a hat, a ram under a roof, a siege engine with a smug hat.
- **Identity:** hired breakers and versatile skirmishers: nets for horses, rams for gates, pitch for thatch, one very large counterweight. No banner of their own (they borrow whatever the cheque bought). Win: break one specific thing (gate, horse, wooden engine). Weak: massed pikes, healers they cannot reach, the invoice running out.
- **Lore joke:** excellent kit, a terrible payroll and total loyalty to whichever cheque cleared this morning. The contract has a clause for everything except loyalty. They fight anyone, provided the invoice is attached.
- **Tint zones:** the cyan patches (patch = team colour). **Units:** sellsword, poacher, mangonel, battering_ram, lady_counterweight.
- **Quick doctrine ("Cheque Cleared"):** sellswords screening, poachers netting the horses, mangonels on the thatch, the ram and the Lady on a second invoice.

### 6. Hoard of Mount Perpetual (`wyrmkin`, 5 units)
- **Emblem:** three coins and a spoon (dragons value spoons) (alt, cut: a mountain in a small hat).
- **Silhouette language:** SPIKY and WINGED. Bat wings, barbed tails, knee-high coin-sack goblins, a walking pile of coins, a bridge troll with a tiny hat.
- **Identity:** monsters and swarms: the air layer, fire, a threat that cannot be out-tanked but can be out-ranged. Win: terror from above and a wall of hit points. Weak: massed bolts, spacing, pike-and-poison attrition on the ground units.
- **Lore joke:** a mountain full of coins, a dragon who sleeps on them, and a great many small tidy creatures who count them. The dragon has not been awake in four hundred years, which is the problem with calling a mountain "Perpetual". Somebody took the spoon.
- **Tint zones:** coin sack, belly glow, wing-membrane edge. **Units:** hoardling, coin_golem, wyvern, bridge_troll, cinderwyrm.
- **Quick doctrine ("Weather Event"):** hoardlings and wyverns first to bait the anti-air, golem and troll second, dragon last.

## Cross-checks

- Six factions, five to seven units each, total 34 (7+6+6+5+5+5). Every faction has a unit with a silhouette no other unit in the era shares: pageant_dragon, great_hog, rolling_keep, plague_cart, lady_counterweight (Mostly Paid Company; battering_ram is the second), cinderwyrm.
- Mixed rosters ("Allied Truce", "Allied Pageant") are campaign-only, not factions; they are drawn from these six.
- Faction text lengths and the chooser "intern caption" are written in part 3 (humour); this file fixes ids, colours, emblems and silhouettes only.
