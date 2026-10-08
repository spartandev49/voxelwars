# Modern visual bible (binding; `spec/VB` row for DESIGN-ERA-MODERN)

Owner: DESIGN-ERA-MODERN part 2. Consumers: UNITS-MOD, PROPS-MOD, RENDER, UI, the VB palette distance test, the reviewer rubric. Inputs (all binding, read before this file): `factions.md` (the six measured primaries and accents, the banned-reference note, the retro-appliance art direction), `rosters.md` (tint carriers, silhouette discriminators, model recipe notes), `boss_table.md` (five outlines), `feel_sheet.md` s6 (silhouette language) and s9 (never-feel-like). The look is a **retro-appliance showroom**: mint refrigerator, butter-yellow teapot, powder-blue toaster, over charcoal trim, in plastic-toy lighting. It is the only one of the four eras whose faction primaries are pastels and near-blacks, and that is deliberate: the sweep in `factions.md` showed those are the only regions of the wheel at least 17 CIEDE2000 away from the thirteen Ancient and Medieval primaries, and it is also what makes a Modern screenshot readable as Modern at 40 px. Never grim, never khaki, never a real army.

## 1. Palette tables per faction

Primaries and accents are `factions.md` values (measured: min 20.0 to any Ancient primary, 18.9 to any Medieval primary, 24.9 inside the era). The other columns are this document's additions; trim, metal and prop colours are design values and are tested with the same script (`de.mjs` in the scratchpad, re-run by the VB test). The battle shader paints the TEAM tint (blue or red), not the faction colour; the tint floors are 15 % of visible pixels for non-hum1 and 30 % for hum1, which pastel hulls miss unless the carrier is a saturated panel in the team colour on the named part. The carrier is therefore designed in from the first sketch, and the pastel hull around it stays untinted.

| faction | primary | accent | trim | metal and glass | emblem field (where it is painted) | tint carrier (saturated team-colour panel) | forbidden adjacencies |
|---|---|---|---|---|---|---|---|
| `marmalade` Marmalade Motor Pool | `#f7b08c` peach | `#2e3036` charcoal | `#d98a63` toast | aluminium `#cfd3da`, enamel cream `#f1e6d6` for lid rims | citrus wedge with a bite, 6 x 6 voxels, charcoal on the turret lid and the helmet band | turret ring (vehicles), helmet band (troopers), lunchbox side latches | peach beside olive, khaki, tan or any mottle; peach + white + green as three fields; peach + charcoal + red |
| `directorate` Directorate of Convenient Logistics | `#2b2f36` cabinet charcoal | `#e9e4d4` paper cream | `#59616b` slate | pale steel `#c4c9d2`, drawer-pull brass `#d9c27a` (6 voxels at most per unit) | paperclip loop, 6 x 8, cream on charcoal on drawer fronts and the paper-pack tabs | tab dividers on the paper backpack, the cabinet's drawer fronts, the Deputy's in-trays | charcoal + cream as a two-field split, band or check at any size over 3 voxels (measured 12.9 from black-and-white); charcoal + red; charcoal beside field grey `#6b7266` as a uniform |
| `skyclub` Paper Plane Flying Club | `#98d8ff` sky | `#f7fbff` white | `#5aa8e0` deeper sky | white metal `#eef3f8`, bowl glass `#cfeeff` at 60 % | folded paper plane, 8 x 6, white on sky on the rotor rim and the pilot cap | rotor disc rim, the balloon's polka dots, the parasol canopy segments | sky + white as stripes, bands or a split (measured 12.3 from pale-blue-and-white banded flags): dots, discs and diagonals only; any ring on a wing; sky beside butter as a flag-sized pair (the blue-and-yellow reference is tested too) |
| `caution` Caution Tape Company | `#fbeb8f` butter | `#1b1b1b` black | `#e0c84a` deep butter | galvanised steel `#9aa0a8`, beacon lamp amber `#ffb300` | stacked upward chevrons, 6 x 8, black on butter on hard-hat front and blade face | beacon lamp, hard-hat brim | butter + black as three horizontal bands or as a flag-sized split (measured 10.8 from black-yellow); butter + black + red; butter + blue as a flag pair |
| `briefing` Briefing Room Brigade | `#f2a8d2` candy pink | `#f6f3ec` warm white | `#d878b0` deep pink | silver `#c9ced6`, copper ammo belt `#d98a5a` | megaphone cone with three arcs, 8 x 8, white on pink on the dish rim and the lectern front | dish rim, lectern front, ammo-belt clip | an equilateral pink triangle at emblem size (the cone is a trapezoid, mouth wider than base by at least 2:1, never an inverted triangle); pink + black + white as bands |
| `shed` Garden Shed Auxiliary | `#8ff0c0` mint | `#4a2a55` aubergine | `#4fbf92` deep mint; terracotta `#d9835f` on the pot helmets only | galvanised `#b8c0c8`, hose-green `#2f8f6a` | seedling in a pot (two leaves, never a cross), 6 x 8, aubergine on mint on the pot front and the barrow side | hose coil, mower deck skirt, trolley handle | mint + red + white; mint + orange + white as three fields; terracotta beside olive (reads as a uniform) |

Neutrals shared by all props and terrain: concrete `#c9cbc6`, asphalt `#4a4d52`, paving `#b9b4ac`, lino tile `#d8e0d4`, felt green `#7fb089` (desaturated so it never reads as a faction), ballast `#8d8a85`, rust-free steel `#8e969f`, brick-red is NOT used for buildings (it reads as a national flag field beside white); houses and shops use butter, mint, powder blue, peach and grey in the same pastel set at lower saturation. Pin red `#e2483d` is reserved for the pushpin and nothing else in the world. Pin ring: amber `#ffb300` and black `#1b1b1b` segments (plain chevrons, never three bands). Cover brackets: cyan `#35c8e8`. Mine tape ring: `#fbeb8f` with black chevrons.

Measured pair near-misses the VB test will flag (all pass because the layouts are not flag layouts, and each has a stated fallback):

| pair | nearest reference (max element dE00) | rule that keeps it safe | fallback if the plan threshold rises |
|---|---|---|---|
| Directorate charcoal + cream | black-and-white 12.9 | never a split, band or check wider than 3 voxels; the cream is used for drawer fronts, tabs and trim lines on a charcoal hull | cream `#e0d8c0` (warmer, 16.9 from white), or swap the hull to slate |
| Skyclub sky + white | pale-blue-and-white banded flags 12.3 | white appears as dots, a disc, a rim and a bowl; the balloon is a sky body with white polka dots; the parasol canopy is six diagonal wedges (not stripes) | primary `#a3dcff` as in `factions.md`, or add a third pastel (peach) to the canopy |
| Caution butter + black | black-yellow 10.8 | the only black-on-butter layout is the upward chevron (a diagonal pattern, 45 degrees), the hard-hat front and the tape; plywood hoardings are butter with a black chevron, never horizontal bands | butter `#f5f2a6` as in `factions.md` |
| Briefing, Marmalade, Shed pairs | 25.6 and above | none needed | none |

## 2. Banned reference palettes and shapes (VB test list; extended only by signed append)

A faction primary+accent pair, a body colour set, a decal or a prop is rejected if its two or three dominant colours sit within CIEDE2000 20 of a reference below (pair or triple, either order) AND the layout is a band, split, check or plain charge. For the military references the test is on the whole palette plus the pattern.

| reference (do not approach) | sample colours or shape |
|---|---|
| national flag sets: red-white-blue; red-white; black-white; black-red-gold; blue-yellow; green-white-red; orange-white-green; red-yellow; pale blue and white banded | `#b22234 #ffffff #3c3b6e`; `#d62828 #ffffff`; `#000000 #ffffff`; `#000000 #dd0000 #ffce00`; `#0057b8 #ffd700`; `#008c45 #f4f5f0 #cd212a`; `#ff9933 #ffffff #138808`; `#da291c #ffc72c`; `#75aadb #ffffff` |
| any three-band flag layout, regardless of colour | layout rule, not a colour rule |
| camouflage of any kind (woodland, desert, urban, digital or pixel blotch, splinter, tiger-stripe) | any mottled, blotched or pixelated multi-colour surface on a unit, vehicle or prop; the only stripes in the game are the mower's lawn trail (two mint tones) and hazard chevrons |
| olive-drab, khaki and desert-tan uniform sets | `#4b5320 #c3b091 #c2b280 #3a4a2c #5b4636` |
| field grey / dark grey with a bird emblem | `#6b7266 #2b2f36` with an eagle or any bird of prey |
| tactical markings: white or black numbers and letters on a hull or turret, white star on a hull, invasion stripes (alternating black and white wing bands) | shape and glyph rule |
| air-force roundel: concentric rings on wing or fuselage in any colours; tail flash; shark mouth; sun disc with rays | shape rule: the Skyclub plane emblem is the only mark on aircraft |
| red cross, white cross on red, red crescent, any protected medical emblem | the first-aider has a green box, a bandage roll and a lollipop; one diagonal plaster, never two crossing |
| hooked or bent-arm cross shapes (any four-arm turning figure whose arms end in right-angle hooks) | applies to radar-dish struts, ventilator fans, rotor hubs, the drone frame and any spinning decor: arms are straight with symmetric paddles |
| paired zigzag runes, skull and crossbones, fasces, hammer and sickle, clenched fist, laurel wreath with a bird | shapes; none appears on any model, decal, prop or UI chrome |
| a pink or black triangle at emblem size | the Briefing megaphone is a trapezoid cone with three arcs |

Two near-misses to watch in this era (flagged in `factions.md` as the soft spots): Caution butter beside the Mythic gold accent family (accents are tested as pairs, not one by one); Marmalade peach beside Marrowby orange (the charcoal accent carries the pair).

## 3. Emblem allow-list ideas

Emblems are canting jokes (a pun on the name) and enter by signed append to the emblem registry. Modern has no flags, banners or pennants: emblems live on hulls, lids, rims and caps.

| faction | emblem | voxel size and where |
|---|---|---|
| `marmalade` | a citrus wedge with a bite out of it | 6 x 6, charcoal on peach, turret lid and helmet band |
| `directorate` | a paperclip loop | 6 x 8, cream on charcoal, drawer fronts and tab dividers |
| `skyclub` | a folded paper plane | 8 x 6, white on sky, rotor rim, cap and the Chandelier's centre plate |
| `caution` | stacked upward chevrons | 6 x 8, black on butter, hat front, blade face, plywood hoarding |
| `briefing` | a megaphone cone with three sound arcs | 8 x 8, white on pink, dish rim, lectern front, belt clip |
| `shed` | a seedling in a pot (two leaves) | 6 x 8, aubergine on mint, pot front, barrow side, mower deck skirt |

Gag decor allowed on models and props (objects, never beasts-on-shields): biscuit, teapot, goldfish, sandwich, clipboard, stapler, paperclip, sticky note (blank), lollipop, lemon, tape roll, hose reel, plug, mug, thermos, umbrella, cog, cassette, filing drawer, hard-hat, traffic cone, cow (the roadworks cow, as a prop-sized cameo only). Banned emblem classes: any star at any size, cross or plus-shaped charge, crescent; eagle, hawk or any bird of prey; laurel wreath; roundel or target rings on aircraft (a bullseye dummy is a prop, not an emblem); lightning bolts used in pairs; letters and numbers; anything that reads as a real unit patch, pennant or squadron badge; a helmet-and-crown arrangement; an anchor-and-wings arrangement.

## 4. Model rules

1. **No letters or numbers** on any model, decal, prop or sign. The "ON AIR" lamp is a red lamp; signs in the world are pictograms; the loudspeaker post and the picnic blanket carry no text; vehicle tactical numbers are banned. (Text appears only in the UI layer.)
2. **No cross, star or crescent at flag size** (a face or panel of at least 3 x 3 voxels), including a contrasting plus formed by a horizontal bar and a vertical rib spanning at least 60 percent of the face. The first-aider's satchel, the satchel flap and the hospital-style prop use a leaf or a heart-free plain tab; hatch bars on boxcars and lids avoid a centred plus.
3. **No three-band flag layouts** and no flag-sized two-colour splits in the pairs named in section 1; hazard chevrons are diagonal and upward.
4. **No camouflage, no olive-drab or khaki uniform, no field grey with a bird, no steel-helmet silhouette of a real army.** The Tin Hat is a biscuit-tin lid: a shallow dome with a ridged rim of constant width and a knob, no flat wide brim, no neck guard, no net. Soldiers wear plastic-toy colours; hum1 skin tones come from the shared `SKIN_TONES` set in `blueprints.js`, unchanged (no era re-weights it, and no skin tone is ever the joke).
5. **Weapon silhouettes copy no famous model.** The rifle is a slab stock with a straight round barrel and a straight box magazine; the SMG is a box with a pipe; the MG is a tripod with a long copper belt; the lens is a telephoto with a hood; the drainpipe is a gutter with a funnel; the umbrella tube is a furled umbrella. No curved banana magazine, no wooden-and-black furniture pairing, no bullpup layout.
6. **Vehicles are household objects, not scale models.** No real hull or turret profile is traced: teapot, lunchbox, biscuit tin, toast rack, lawn tractor, filing cabinet, tea trolley, broadcast truck with a dish. Tracks hide under skirts; no road-wheel count that spells a known tank; no gun-mantlet shape from a known vehicle.
7. **Aircraft** carry only the Skyclub paper-plane emblem. No roundel, no tail flash, no invasion stripes, no shark mouth, no nose art with a person. Rotor hubs have symmetric paddles; the drone's four ring discs are discs, not crosses (the arms are drawn as a rounded square frame, not a plus, from above).
8. **Spinners and wheels**: radar dish struts, ventilator fans, rotor hubs and any spinning decor use straight arms with symmetric paddles; no arm ends in a right-angle hook.
9. **Silhouette and far mesh** (plan s5): barrels, antennas, lens hoods, drainpipes and umbrella tubes >= 2 x 2 voxels; antenna bulbs and dynamite sparks >= 2 x 2; belts and cloth >= 3 wide; rotor discs dense or a far blur part; the goldfish bowl >= 2 voxels thick; balloon envelope solid; satellite dish disc >= 3 voxels wide on its rim with a solid back; the Final Notice barrel >= 3 x 3. The defining feature keeps >= 60 percent of its near silhouette pixels at the model's own switch distance and at 80 u; the `downsample2` lint is the arbiter.
10. **Pastel readability.** Every hull has a one-voxel charcoal ink edge on its lower silhouette (the 'toy outline'), and the charcoal trim share is darkened before the primary is touched when a hull fails against `concrete`, `asphalt`, `paving` or `lino_tile`. Look-dev renders every unit at the default camera on all four floors and records the worst contrast pair.
11. **Tint** (UC): the carrier panel in the team colour sits where the eye goes and meets the share floor; the faction pastel never replaces the carrier.
12. **Budgets**: <= 48 parts (gun1 lite crew = 6 parts per member), voxel 0.1 for units and small props, 0.2 for buildings and anything over 6 u, <= 35 visible (type, variant) prop batches per recipe; vehicles <= 22 K near triangles, bosses <= 55 K, boss far mesh <= 15 K.
13. **Tone**: no wound detail, no blood, no gore, no scorched corpse. Knock-out is a hat pop, a dazed star ring (rendered as a ring of round dots, never a five-point star), a sit and a fade; machines pop a lid, sigh steam and leave a wreck prop; confetti and toy debris replace fragments. Muzzle flashes are round puffs and tracer dashes are pea-coloured pellets, not star bursts. The colour grade of every arena theme stays saturated and light (no desaturated mud-and-despair look).
14. **The goldfish** (Fishbowl Chopper): an orange fish voxel cluster 3 x 2 x 2 in a bowl 6 voxels wide; it survives every crash (a wreck-prop gag) and floats upside down in a tumble. Never a real animal harmed on screen.

## 5. Three named reject examples (the reviewer rubric quotes these)

1. **"The Army Surplus Special."** A `tin_hat_trooper` painted in olive drab with a mottled brown-and-green camouflage jacket, a flat-brim dish helmet with a chin net and a white shoulder number. Rejected: camouflage, an olive-drab uniform set, the steel-helmet silhouette of a real army and a number on a model, all banned independently. Fix: peach jacket with charcoal trim, the biscuit-tin lid hat with a knob and ridged rim, a biscuit-tin pack with a hinged lid, and a team-colour helmet band.
2. **"The Roundel Flypast."** A `fishbowl_chopper` with concentric red, white and blue rings on the tail boom, a white star on the cabin door and black-and-white stripes under the stub wings. Rejected: an air-force roundel, a star, a tail flash and invasion stripes. Fix: the sky-and-white paper-plane emblem on the rotor rim and the cap only; the tail boom is plain sky with a charcoal ink edge.
3. **"The Red Cross Satchel."** A `site_first_aider` whose satchel flap carries a white cross on a red field and whose helmet has a red cross decal. Rejected: a protected medical emblem, a cross at flag size and a red-and-white pair. Fix: a mint-green first-aid box with a single diagonal plaster, a bandage roll round the helmet and a lollipop in the mouth.

Watch list (not rejected on sight, flagged for the reviewer): a `deputy_director` with a bird on his stamp; the Behemoth's dish painted with radiating rays from a centre disc (a rising-sun reading); a `hobby_drone` seen from above with a plus-shaped frame; a spinning decor piece whose arms are bent at the tips; a Caution hoarding with three horizontal black stripes; a Briefing lectern with a pink triangle; a Skyclub balloon in horizontal blue and white bands; the Grand Mower's lawn trail stripes in three tones; a `hoarding_bearer` panel with a plus-shaped brace; a pastel hull that vanishes on `concrete`.

## 6. Reviewer rubric (applied to every model, decal and prop; answers recorded in the model checklist)

1. Does the silhouette read as the unit's role at 40 px (a teapot is a lidded dome with a spout, a hoarding bearer is a door on legs, a howitzer is a cabinet)?
2. Does the defining feature survive at the switch distance and at 80 u?
3. Is the tint carrier where the eye goes, at or above the floor, and does the pastel hull still read against all four floors?
4. Do all colours pass the palette distance test and avoid every banned pair and layout?
5. Is there any letter, number, star, cross, crescent, roundel, bird of prey, hooked arm, camouflage, three-band layout or real helmet in the model?
6. Is it funny without a caption (could the blurb be guessed from the model: the Toast-Rack Runabout, the biscuit tin on the Tin Hat's back)?
7. Is the knock-out readable and kind (hat pop, dazed ring, sit and fade), and does the machine version sigh steam rather than burn?
