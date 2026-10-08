# Medieval UI chrome (binding for UI, INTEGRATION and RENDER of the chooser, map and title)

Owner: DESIGN-ERA-MEDIEVAL part 2. Consumers: UI (screens, `[data-era=medieval]` tokens, `ERA_MAPS.medieval`), INTEGRATION (title rotation, loading screen), RENDER (static chooser stills, diorama scenes). Inputs: `feel_sheet.md` s8 (the chrome tokens, final), `visual_bible.md`, `humour.md` (loading lines, captions), `missions_outline.md` (mission order, pins). Ancient chrome is navy ink `#14163a`, gold `#ffc93c`, marble `#f3f6fb`; no Medieval token reuses those.

## 1. Accent colour tokens

All Medieval chrome is scoped by `[data-era="medieval"]` on the briefing, placement, results and HUD roots, on the era map and on the era chooser card. Tokens (CSS custom properties):

| token | value | use | contrast |
|---|---|---|---|
| `--era-accent` | `#c8501e` rust | fills, rules, active tabs, the map's active route | 3.5:1 on parchment: large or bold only |
| `--era-accent-text` | `#a8321f` wax | text and icons on parchment, rubric initials, primary buttons | 5.2:1 on parchment |
| `--era-paper` | `#efe2c0` parchment | panels, cards, tooltips (deckled edges) | |
| `--era-paper-shade` | `#e0d0a8` | panel inner shadow, pressed state | |
| `--era-ink` | `#2b2118` | body text | 12.2:1 on parchment |
| `--era-iron` | `#4a4f57` | HUD frame, nails, battle bars | 6.4:1 with parchment text |
| `--era-gilt` | `#c9a227` | stars, ribbons, completed route thread, focus ring on iron | 6.5:1 on ink; 3.4:1 on iron: large only |
| `--era-heal` | `#6fa86a` | heal motes, soup, gas label | 5.6:1 on ink |
| `--era-focus` | `#2b2118` + a 2 px `--era-accent-text` outer ring on parchment; `#c9a227` on iron | focus-visible | |

Faction chips use the `factions.md` primaries (rust-orange, hedge-lime, pale steel, rose, tobacco, oxblood) with the accent as a 2 px border. Buttons: iron-nail primary (wax fill, parchment text, 4 nail dots), secondary (parchment fill, ink text, iron border). Tap targets >= 44 px everywhere (390 x 844 touch). Reduce Motion removes the stamp bounce and the portal.

Typography: existing Google Fonts only. Cinzel 700 uppercase for titles with a wax-red rubric initial letter; Cinzel 600 for sub-heads; Rubik 500 for body on parchment (never 300); Bungee only for big numerals and stamps.

Components: parchment panels with a rope-and-stud border; escutcheon (shield-shaped) portrait frames for the three commentators; pennant-shaped hp and morale bars; ribbon act headers; wax-seal cooldown icons that STAMP when ready (a 0.2 s thump); optional Colours strip (one pennant per live banner with a resolve fill; first thing cut if HUD time is short); stamp overlays on star rows (APPROVED in wax on earned stars, PENDING in ink on the rest; a defeat stamps DENIED across the results header, which is a joke about paperwork, never about the player); marginalia doodles (a knight losing an argument to a snail) in panel corners.

Sound for chrome: hover = quill scratch, click = wax-stamp thump, Deploy and confirm = stamp plus a short brass blip, cooldown ready = a stamp, overlays = page rustle (`sound_music.md` s1).

## 2. Era chooser card art direction

The campaign opens on the era chooser (CU6): four cards; the last era's card is pre-focused with a "Continue Medieval" primary. The Medieval card:

- **Image**: a static pre-rendered still (baked at build, not live WebGL) in a **woven tapestry style**: visible thread texture, slightly raised, muted edges. Composition, left to right: a braced pike line (a comb of poles) at a ford, a charging lancer pennon frozen mid-splash, bunting strung across the top third, a squat castle gate with a very small cat flap on the right horizon, and a small dragon shadow crossing the hill behind. Colours from the six faction primaries on a cream ground; no red-white-blue, no cross, no lion.
- **Frame**: rope-and-stud border, a wax-seal "MEDIEVAL" stamp bottom-left, a gilt ribbon with the earned **title** (the latest reward title, for example "Ford Keeper") and the star count "x / 27".
- **Caption** (intern gag, once per screen): "MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'."
- **States**: NEW ribbon until the first mission is cleared; hover ripples the tapestry (a 0.4 s cloth wave); focus ring per tokens; locked is never shown (all eras open); finished shows the PAGEANT COMPLETE stamp and the sticky-note tooltip (finale payoff, `humour.md` 3.3); phone: card stack, 16:9 crop, caption under the image.
- **Transition**: 1.2 s time-portal: the card flips to parchment with a page-turn and a bell; the music crossfades to the map bed.

## 3. Campaign map art direction (`ERA_MAPS.medieval`)

"The Disputed Hedges of Marrowby": an illuminated parchment map. Uses the Ancient map engine unchanged (SVG built at runtime from `LAND`, `ZONES`, rivers, `COLORS`, `PINS`, `VIEWS`, `decor`; land rasterised to 1.6-unit cubes in a 160 x 100 unit sheet) with the Medieval data below.

**Land shapes.** No coastline: the sheet is vellum, with a deckled border and hand-stained edges. The land is a **patchwork of hedged fields** (nine to eleven polygons) separated by hedge lines drawn as one-cell dark-green rows; each polygon is one mission's place. Acts form three regions:

| act | region | zone fill | character |
|---|---|---|---|
| I Pageant Season | south-west | cream-lime `#d7e0a0` fields, `#e0c98f` lists sand | green fields, bunting poles, maypole, grandstand rectangles |
| II Siege Season | centre | ochre `#d6b36a`, moor `#a58aa6` (muted), flagstone `#b9bcc0` | heather moor with beacon dots, the walled square of Castle Dour, the abbey cloister |
| III Dragon Season | north-east | ash `#9a8478`, oxblood wash `#a86a5a`, lava creek `#e2661f` | village thatch, the long bridge, Mount Perpetual with a lava creek |

**Rivers.** One river, "the Dither", winds from the north-west corner to the south-east, drawn as a double ink line with blue-grey wash (`#8fa6b3`), crossing the ford (pin 3) and the long bridge (pin 8) with small bridge ticks. It is a polyline in `rivers`.

**Pins.** Nine wax seals, 7 map-units wide, positions on the 160 x 100 sheet:

| pin | mission | place | position (x, y) |
|---|---|---|---|
| 1 | `med_dress_rehearsal` | Pageant Green | 18, 78 |
| 2 | `med_tourney_trouble` | Tourney Field | 40, 62 |
| 3 | `med_ford_dithering` | Ford of Dithering (Act I finale: gilded rim) | 62, 74 |
| 4 | `med_mizzlemoor_beacons` | Mizzlemoor | 50, 42 |
| 5 | `med_castle_dour` | Castle Dour | 78, 30 |
| 6 | `med_bell_tolls_lunch` | Bellfount Abbey (Act II finale: gilded rim) | 100, 46 |
| 7 | `med_pennywhistle_blaze` | Pennywhistle | 112, 74 |
| 8 | `med_toll_bridge` | The Long Bridge | 136, 56 |
| 9 | `med_grand_pageant` | Dour Courtyard, the Grand Pageant stage, with Mount Perpetual looming behind (finale: gilded rim and a tiny dragon) | 140, 20 |

Each seal carries an impression glyph (no letters, no cross): a pike comb (1), a swallow-tail pennon (2), a crossbow wheel (3), a lance and fog swirl (4), a gate (5), a handbell (6), a flame (7), a trebuchet (8), a claw and a spoon (9). Seal colours by act (lime, ochre, oxblood). A completed pin shows 0 to 3 small gilt pips under the seal and a stamped APPROVED half-moon; the next unlocked pin pulses (1 Hz glow); locked pins are dim vellum blanks.

**Route.** A dotted ink line in quadratic curves between consecutive pins (a stitched look). Locked legs are faint; the active leg is ink; **completed legs are sewn in gold thread** (`--era-gilt`) with a small needle that travels along the leg once when a mission is first cleared.

**Decor and animation.** Everything animated is cosmetic and stops under Reduce Motion.

| element | where | animation |
|---|---|---|
| small dragon doodle in the top-right margin | grows with the act: Act I curled and asleep, Act II one eye open, Act III wings half raised, a puff of smoke | blink every 8 s (Act II), puff every 12 s (Act III) |
| the snail | crawls along the bottom border | one crossing per 90 s; a tiny knight stands beside it, losing an argument |
| windmill | beside pin 7 | sails turn once per 12 s |
| smoke | cottage chimneys at pin 7, Castle Dour flag at pin 5 | slow rising wisps; the flag ripples |
| beacons | Mizzlemoor | each lit beacon flickers |
| bell | Abbey | a tiny swing every 10 s |
| bunting | across the top of Act I | gentle sway |
| manicule (pointing hand) | beside the next pin | taps twice every 6 s |
| clouds | quill-sketched swirls instead of Ancient clouds and boats | drift left |
| ribbons | place names in Cinzel italic small caps on ribbons | none |

**Legend** (acts): I "Pageant Season" (Bunting, lances and a rota nobody follows), II "Siege Season" (Fire, plague and a gate with a clause), III "Dragon Season" (It was in the programme, in small print). Phones: a mission list (the map is hidden), pins replaced by seal rows.

## 4. Diorama scenes for title rotation

The title rotates era dioramas (CU17): the Ancient `SETS` stay; Medieval adds six scenes (arena, factionA, factionB, seed, camera). Each scene runs about 12 s on a slow orbit; Reduce Motion freezes on the first frame. Scenes are picked by the last-played era first, then round-robin over released eras.

| # | arena | factionA vs factionB | seed | what the frame shows |
|---|---|---|---|---|
| 1 | `med_ford_of_dithering` | yeomen vs marrowby | 7 | a braced pike line at the ford, a lance wave breaking in a splash, banners snapping |
| 2 | `med_castle_dour` | free_company vs gatehouse | 12 | a roofed ram at the gate, oil cauldrons on the wall ("pending"), crossbows on the towers |
| 3 | `med_bellfount_abbey` | bellfount vs free_company | 5 | the cloister, a rose-coated physician leaning toward a soldier, a mint cloud drifting |
| 4 | `med_pennywhistle` | yeomen vs free_company | 9 | the windmill alight with its sails still turning, Dennis trotting past, thatch glowing |
| 5 | `med_tourney_field` | marrowby vs yeomen | 3 | the lists and tilt barrier, lances in a line, grandstands full, bunting |
| 6 | `med_mount_perpetual` | wyrmkin vs gatehouse | 11 | a dragon's shadow crossing the besieging camp, springalds tracking, hoard glints on the slope |

## 5. Loading-screen style

- **Frame**: a parchment scroll unfurling from the bottom of the screen; rope-and-stud border; the faction emblems of the six factions drift as small wax seals in the corners.
- **Progress**: a **needle pulling gold thread** along a dotted seam (the bar is the stitch line; the needle is the head), a wax-seal drip fills at 100 percent and a stamp thump says READY. Under Reduce Motion the seam fills without the needle.
- **Text**: one loading line (`humour.md` s5) in Cinzel italic, centred; one tip below in Rubik 500 (hint or joke, `humour.md` s7); both change every 4 s.
- **Marginalia**: the snail crawls along the bottom edge; a knight stands beside it with a speech bubble that never resolves (the recurring gag, `med_snail` callback counter).
- **Sound**: a quill-scratch loop at -30 LUFS, stopped by the stamp.
- **Era switch**: the 1.2 s page-turn portal replaces the loading screen when assets are already warm.
- **Phone**: the same scroll, narrower; the snail and seals are hidden below 360 px width.
