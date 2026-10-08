# Medieval visual bible (binding; `spec/VB` row for DESIGN-ERA-MEDIEVAL)

Owner: DESIGN-ERA-MEDIEVAL part 2. Consumers: UNITS-MED, PROPS-MED, RENDER, UI, the VB palette distance test, the reviewer rubric. Inputs: `factions.md` (final primaries and accents, already measured with CIEDE2000 against the seven Ancient primaries), `rosters.md` (tint zones, silhouettes), `feel_sheet.md` (silhouette language, banner tell, never-feel-like list), `props.md` (voxel sizes). The look is a **saturated heraldic toy box with bunting**: warm, clean colour fields, readable at 40 px, never grim, never a real army.

## 1. Palette tables per faction

Colours are design values; the VB test (`palette distance test`) is the arbiter. Primaries and accents are those of `factions.md` (the ones below the line are the extra trim, metal and banner values this document adds). The battle shader paints the TEAM tint, not the faction colour; the tint zone for each unit is in `rosters.md` and is repeated per faction here.

| faction | primary | accent | trim (leather, cloth) | metal | banner and ground ring | tint zones | forbidden adjacencies |
|---|---|---|---|---|---|---|---|
| `marrowby` Crown of Marrowby | `#d9661c` pumpkin-orange | `#f1e4c0` cream | `#7a3b12` umber | bright steel `#b9c2cc`, brass `#c9a227` | swallow-tail cloth in orange with a cream stool-and-crown glyph; ring orange over cream | surcoat, caparison lozenges, plume | orange never beside white as a flag pair; no red |
| `yeomen` Long Hedge Yeomanry | `#8bb12e` hedge-lime | `#5a3b22` walnut | `#d9c9a0` undyed wool | dull iron `#6b6f76` | lime cloth with a walnut hedgehog-in-hedge glyph; ring lime over walnut | sash, hat band, banner cloth | lime beside red; no green-white-red |
| `gatehouse` Gatehouse League | `#8c9aa8` pale steel | `#cfe0ee` frost | `#5d6a78` gunmetal | polished steel `#c9d3dc` | pale-steel cloth with a frost castle-gate-with-cat-flap glyph; ring steel over frost | pavise face, kettle brim, machine pennants | steel and sky-blue beside white and red |
| `bellfount` Bellfount Abbey | `#d9577f` rose | `#bfe3cf` mint | `#8e3a55` berry | bronze bell `#b07a2c` | rose cloth with a mint handbell (clapper outside) glyph; ring rose over mint | bell-skirt hem, bell, beak trim | rose with white and a cross-shaped charge; no black cloak with the beak |
| `free_company` The Mostly Paid Company | `#7d5434` tobacco | `#2db5c9` sky-cyan patches (fallback `#3fb8e0`) | `#c9a97a` leather tan | dull iron | no banner of its own (borrows the buyer's); ring tobacco over cyan | the cyan patches | cyan beside white and red |
| `wyrmkin` Hoard of Mount Perpetual | `#6e2438` oxblood | `#dccb2c` sulphur (fallback `#e3d34a`) | `#2b1a22` ink-plum | coin gold `#e3d34a` (emissive glints) | oxblood cloth with three sulphur coins and a spoon glyph; ring oxblood over sulphur | coin sack, belly glow, wing-membrane edge | oxblood with white and black; gold and black as a pair |

Neutrals used by all factions and props: cream `#f1e4c0`, parchment `#efe2c0`, walnut `#5a3b22`, thatch `#c9a45c`, flagstone `#9aa0a6`, cobble `#8a8f94`, moss `#6b8f47`, mud `#6b4a2b`, lists sand `#e0c98f`, heather `#8a5a8c` (a muted purple: kept desaturated so it never reads as a Persian or Carthaginian faction), scree `#7a6f66`, ash `#4a4540`, lava `#e2661f`, water (existing plane colours).

Team tints (red/blue-like team colours chosen by the engine) are not touched here; the tint share floor (UC) is met by placing the tint zone where the eye goes: Marrowby surcoat, Yeomen sash, Gatehouse pavise face, Bellfount hem and beak trim, Mostly Paid cyan patch, Wyrmkin sack and belly.

## 2. Banned reference palettes (VB test list)

A faction primary+accent pair, a banner cloth, a tabard, a shield face or a surcoat is rejected if its two or three dominant colours sit within CIEDE2000 20 of any reference below (pair or triple, in either order, either as stripes, a check or a plain split) AND the layout is one of: bands, bicolour split, check, or a charge on a plain field. The list is the VB test's data; it is extended only by signed append.

| reference (do not approach) | sample colours |
|---|---|
| red, white and blue (any order) | `#b22234` `#ffffff` `#3c3b6e` |
| red and white (stripes, check or split) | `#d62828` `#ffffff` |
| black and white | `#000000` `#ffffff` |
| black, red and gold | `#000000` `#dd0000` `#ffce00` |
| blue and yellow | `#0057b8` `#ffd700` |
| green, white and red | `#008c45` `#f4f5f0` `#cd212a` |
| orange, white and green | `#ff9933` `#ffffff` `#138808` |
| red and yellow / gold | `#da291c` `#ffc72c` |
| white with a dark cross, black with a white cross | `#ffffff` `#1b1b1b` |
| red on white with a cross, white on red | `#ffffff` `#c8102e` |
| purple and gold as imperial robes | `#4b1a7a` `#d4a017` (the Ancient Persian/Mythic pairs; held by the Ancient palette test) |
| any three-band flag layout, regardless of colour | layout rule, not a colour rule |

Two near-misses to watch in this era (flagged in `factions.md` as the soft spots): Marrowby orange with cream (keep cream, never white; a flag-sized orange/white pair is banned); the Mostly Paid Company cyan beside white; Wyrmkin sulphur beside oxblood and black.

## 3. Emblem allow-list ideas

Emblems are canting jokes (a pun on the name) and enter by signed append to the emblem registry.

| faction | emblem | voxel size on cloth |
|---|---|---|
| `marrowby` | a three-legged stool wearing a crown that does not fit | 8 x 8 voxels, cream on orange |
| `yeomen` | a hedgehog sitting very still in a hedge | 8 x 6, walnut on lime |
| `gatehouse` | a castle gate with a very small cat flap in it | 8 x 8, frost on pale steel |
| `bellfount` | a handbell with its clapper on the outside | 6 x 8, mint on rose |
| `free_company` | a coin with a bite taken out | 6 x 6, cyan on tobacco (patches only) |
| `wyrmkin` | three coins and a spoon | 8 x 6, sulphur on oxblood |

Extra gag ideas allowed as small decor (never as a faction emblem, never at flag size on a banner): a snail (the recurring marginalia), a turnip, a ladle, a pie, a kazoo, a pigeon, a sheep, a hay bale, a teacup, a tiny hat. All are objects, not beasts-on-shields.

Banned emblem classes: any cross, saltire or plus-shaped charge; star, crescent, sun-in-splendour; fleur-de-lis; lion, eagle, double-headed anything, griffin, unicorn; a dragon on a flag (the dragon is a creature in the game, not a standard); the Tudor-style rose, thistle, shamrock, oak-leaf wreath; any letter or number; any helm-and-crown arrangement that matches a real royal arms; the Rolling Keep's banner must be a plain frost pennant, never a flag with a charge.

## 4. Model rules

1. **No letters or numbers** on any model, cloth, shield, prop or decal. Rune-like or alphabet-like glyphs count.
2. **No cross, star or crescent at flag size** (cloth, tabard, shield face or board >= 3 x 3 voxels). A contrasting plus shape formed by a horizontal bar and a vertical rib spanning >= 60 percent of the face counts: pavise boards and surcoats use diagonals, lozenges, plain fields or a single glyph. Sword crossguards and polearm blades at unit scale are exempt (they are part of the weapon silhouette).
3. **No three-band flag layouts**; banner cloth is a field plus at most one glyph and one edge colour (two-colour rule plus the swallow-tail cut).
4. **Chequers and stripes.** Marrowby caparisons use orange/cream lozenges (diamonds), squares >= 3 voxels; a red/white chequer or red/white stripe is banned. Striped pavilions are rust-orange and cream only.
5. **No real-army uniforms or camouflage.** No tabard that matches a real order, regiment or house; no white mantle with a dark cross; no black cloak with a wide-brim hat and a beak (the plague-doctor image): the physician wears a knee-length rose coat, no hat, a mint beak 3 x 3 voxels across. No all-black plate with a white charge.
6. **Silhouette and far mesh** (plan s5): poles, tusks, bills and lance shafts >= 2 x 2 voxels; cloth >= 3 wide; the beak 3 x 3; dragon wing membranes >= 2 voxels thick; a bell >= 6 x 6; banners 3.6 u on a 2 x 2 pole. The defining feature keeps >= 60 percent of its near silhouette pixels at the model's own switch distance and at 80 u; the `downsample2` lint is the arbiter.
7. **Tint** (UC): the team tint sits on the listed zone and meets the share floor; heraldic colour never replaces the tint zone.
8. **Part and voxel budgets**: <= 48 parts (crew 6 parts, lite); buildings, walls and anything over 6 u use voxel 0.2, everything else 0.1; at most 35 visible (type, variant) prop batches per recipe.
9. **Tone**: no wound detail, no blood on any model; deaths are a stagger and a sit-down, a clatter of armour, a tumble, a poof of voxel confetti; fire and gas are bright and toy-like, never smoky-grim; the colour grade of the arena themes stays saturated (no desaturated mud-and-despair look).
10. **Dennis** (the pageant dragon): felt-green body, two pairs of mismatched boots, a hand waving from the tail; never a real dragon silhouette, so it can never be mistaken for the Cinderwyrm at 40 px.

## 5. Three named reject examples (the reviewer rubric quotes these)

1. **"The Crusader Special."** A `knight_errant` painted with a white tabard and a red cross on the chest and shield. Rejected: a cross at flag size on a white-and-red field is a real order and holy-war reference; the rule bans the layout whatever the unit. Fix: orange/cream lozenges and the stool glyph.
2. **"The Tricolour Herald."** A `standard_bearer` whose banner cloth is three horizontal bands in red, white and blue (or any three bands in any colours). Rejected: a three-band layout and a red/white/blue reading, both banned on their own. Fix: a two-colour swallow-tail in the faction primary with one glyph.
3. **"Lion Rampant Pavise."** A `pavise_bearer` board painted with a golden lion rampant on red. Rejected: real heraldry (a lion), a red and gold pair, and a charge that matches real arms. Fix: pale steel board with the cat-flap gate in frost.

Watch list (not rejected on sight, flagged for the reviewer): a `physician` in a dark coat with a hat (plague-doctor image); a `cinderwyrm` with a red-and-white banner on its keep; a `plague_cart` ox with a white cross-shaped patch; a map pin that draws a cross by accident (two lines crossing).

## 6. Reviewer rubric (applied to every model and cloth, answers recorded in the model checklist)

1. Does the silhouette read as the unit's role at 40 px (a lancer is tall and pennoned, a pavise bearer is a door on legs)?
2. Does the defining feature survive at the switch distance and at 80 u?
3. Is the tint zone where the eye goes, at or above the floor?
4. Do all colours pass the palette distance test and avoid every banned pair?
5. Is there any letter, number, cross, star, crescent, lion, eagle, three-band layout or real uniform in the model?
6. Is it funny without a caption (the Dennis test: could this unit's blurb be guessed from the model)?
