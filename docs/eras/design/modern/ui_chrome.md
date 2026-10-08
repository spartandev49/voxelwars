# Modern UI chrome (binding for UI, INTEGRATION and RENDER of the chooser, map and title)

Owner: DESIGN-ERA-MODERN part 2. Consumers: UI (screens, `[data-era=modern]` tokens, `ERA_MAPS.modern`), INTEGRATION (title rotation, loading screen), RENDER (static chooser stills, diorama scenes). Inputs: `feel_sheet.md` s8 (the chrome tokens, final and measured against the Ancient, Medieval and Sci-Fi chrome), `visual_bible.md`, `humour.md` (loading lines, captions), `missions_outline.md` (mission order, pins), `arenas.md` (arena names). Ancient chrome is navy ink `#14163a`, gold `#ffc93c`, marble `#f3f6fb`; Medieval chrome is rust `#c8501e`, wax `#a8321f`, parchment, gilt `#c9a227`; no Modern token reuses those. The briefing-room idea of `proposal_A` (manila, navy ink, highlighter yellow) was dropped by part 1 because it sat inside the Ancient and Medieval neighbourhoods (CIEDE2000 5.2 to 8.3 from parchment and navy); this file is built on the final tokens.

## 1. Accent colour tokens

All Modern chrome is scoped by `[data-era="modern"]` on the briefing, placement, results and HUD roots, on the era map and on the era chooser card. Tokens (CSS custom properties) with WCAG contrast measured by script (`mmod_cr.mjs` in the scratchpad):

| token | value | use | contrast |
|---|---|---|---|
| `--era-accent` | `#12a37f` cleared green | fills, rules, active tabs, primary button fill, the map's completed marks | 2.8:1 on paper (large or bold only); 4.9:1 against ink, so button text on it is ink; 22.3 CIEDE2000 from the nearest Ancient chrome token (olive `#8bc34a`), 29.0 from the nearest Sci-Fi token |
| `--era-accent-text` | `#0b7a5e` | text and icons on paper, links, rubric headings | 4.65:1 on paper |
| `--era-paper` | `#eef1ec` cool graph paper with an 8 px grid `#d5dbd3` (not parchment) | panels, cards, tooltips (sticky notes), the briefing folder inside | ink on paper 13.74:1 |
| `--era-ink` | `#1b2430` | body text | 13.74:1 on paper |
| `--era-slate` | `#3a4a4c` | frames, the battle HUD frame, the campaign board edge, the Codex tab dividers | paper on slate 8.14:1; tape on slate 7.68:1 |
| `--era-tape` / `--era-tape-ink` | `#fbeb8f` / `#1b1b1b` | hazard-tape dividers drawn as plain upward chevrons (never three horizontal bands), warning ribbons, selection highlights on slate | 14.26:1 between them |
| `--era-pin` | `#e2483d` pin red | the pushpin and nothing else (the pin tell, the map pins, the Codex bookmark, the achievement icon); never a button colour | 3.52:1 on paper (icon, never text) |
| `--era-cork` | `#b98b5e` | the campaign map backing only | ink on cork 5.16:1; paper on cork 2.66:1, so no paper text sits on cork without its own card |
| `--era-cover` | `#35c8e8` cyan | the in-world cover brackets only (not chrome) | 4.67:1 on slate |
| `--era-focus` | 2 px `#1b2430` inner + 2 px `#0b7a5e` outer ring on paper; `#fbeb8f` on slate | `:focus-visible` | |

Faction chips use the `factions.md` primaries (peach, charcoal, sky, butter, candy pink, mint) with the accent as a 2 px border. Buttons: stamp primary (accent fill, ink text, a rubber-stamp press animation), secondary (paper fill, ink text, slate border), destructive (paper fill, pin-red DENIED stamp text in Bungee). Tap targets >= 44 px everywhere (390 x 844 touch). Reduce Motion removes the stamp bounce, the photocopier portal and the string sway.

Typography: existing Google Fonts only. Bungee for stamps, titles and big numerals; Rubik 500 body on paper (never 300); Rubik 700 uppercase for stamp labels; no Cinzel (Ancient and Medieval own it).

Components: clipboard panels with a binder clip and punched-hole margins; ID-badge unit cards on lanyards; sticky-note tooltips (one visible at a time); rubber-stamp stars (a stamp lands with a thud when stars are awarded: APPROVED in accent for earned stars, PENDING in ink on the rest; a defeat stamps DENIED in pin red across the results header, which is a joke about paperwork, never about the player); tab dividers in the Codex; a headset glyph as the announcer icon; subtitles styled as a radio transcript with a squelch tick (and the muted-speaker glyph and "PLATO (MUTED)" label for Plato in M1 to M8); hazard-tape dividers; the PIN meter and AMMO pips on the selection card; the loading spinner is a radar sweep; the arrival card is a boarding pass; hazard-tape borders on the "Skip tutorial" corner.

Sound for chrome: hover = stapler tick, click = rubber-stamp thud, Deploy and confirm = stamp plus a typewriter ding, cooldown ready = a pen click, overlays = paper rustle, star awarded = three stamps each a little higher (`sound_music.md` s1).

## 2. Era chooser card art direction

The campaign opens on the era chooser (CU6): four cards; the last era's card is pre-focused with a "Continue Modern" primary. The Modern card:

- **Image**: a static pre-rendered still (baked at build, not live WebGL) in a **tilt-shift tabletop photograph** style: a toy tank column (four Biscuit-Tin Tanks and a Lunchbox APC) crossing a cardboard bridge on a felt-green table, lit by a gooseneck lamp (warm key, a soft pool of light), push pins as bridge markers, a paper plane gliding through the top third, a Teapot Heavy on the horizon puffing steam, a ruler along the bottom edge with tick marks but no numerals, a coffee ring in the corner. Colours from the six pastel faction primaries on a felt and cork ground; no red-white-blue, no flag, no cross, no star, no number.
- **Frame**: a clipboard with a binder clip, a rubber stamp "MODERN" bottom-left, a tape-yellow ribbon with the earned **title** (the latest reward title, for example "Pinned and Proud") and the star count "x / 27".
- **Caption** (intern gag, once per screen, verbatim): "MODERN. The intern says this is the right century. He has pressed 'hold' on the next one."
- **States**: NEW ribbon until the first mission is cleared; hover lifts the card like a manila folder and flickers the lamp (0.4 s); focus ring per tokens; locked is never shown (all eras open); finished shows the PARCEL DELIVERED stamp and the card of `humour.md` 3.3; phone: card stack, 16:9 crop, caption under the image.
- **Transition**: 1.2 s photocopier portal: the card flips like a folder, a white bar sweeps across, a thunk and a rubber-stamp thud; the music crossfades to the map bed "On Hold". Reduce Motion: a fade.

## 3. Campaign map art direction (`ERA_MAPS.modern`)

"The Corkboard": a desk map under a gooseneck lamp. Uses the Ancient map engine unchanged (SVG built at runtime from `LAND`, `ZONES`, rivers, `COLORS`, `PINS`, `VIEWS`, `decor`; land rasterised to 1.6-unit cubes in a 160 x 100 unit sheet) with the Modern data below.

**Land shapes.** There is no coastline. The backing is `--era-cork`; three paper sheets, clipped on with binder clips, are the three acts; on each sheet the land is a **hand-cut paper patchwork** (nine to eleven polygons with torn edges), one place per mission. The sheets are tinted pastel tracing paper:

| act | sheet | fill | land character |
|---|---|---|---|
| I Basic Forms | left, mint graph paper `#dff0e6` | felt green `#7fb089`, concrete `#c9cbc6` | a drill square with a firing line, a meadow of hedge strips, a trench with duckboards and a barbed coil |
| II Combined Arms | centre, butter legal pad `#fbf3c4` | asphalt `#4a4d52` (lightened to `#6b6f75` on the map), ballast `#8d8a85`, water `#9ec9e8` | a bridge over a gorge, a rail yard with five tracks and tiny boxcars, a downtown block grid with a tower |
| III Full Spectrum | right, sky tracing paper `#d9eefc` | concrete, lino `#d8e0d4`, water, grass | an airfield with a runway, a harbour with a crane and a barge, a dam wall with a spillway |

**Rivers.** One river, drawn as a double pencil line with a pale-blue wash (`#9ec9e8`), runs from the Act II sheet's top edge to the Act III sheet's harbour, passing under the bridge (pin 4) and over the dam (pin 9) with small bridge ticks. It is a polyline in `rivers`.

**Pins.** Nine red pushpins (`--era-pin`) with a paper tag in the act colour, 7 map-units wide; positions on the 160 x 100 sheet:

| pin | mission | place | position (x, y) | tag glyph (no letters, no cross, no star) |
|---|---|---|---|---|
| 1 | `mod_boot_camp_dropout` | Parade Yard | 16, 70 | a bullseye cardboard dummy |
| 2 | `mod_hedgerow_picnic` | Hedgerow Meadow | 34, 52 | a picnic hamper |
| 3 | `mod_trench_pardon` | The Long Trench (Act I finale: gilded tape rim) | 52, 72 | a zigzag trench line with a tiny pushpin |
| 4 | `mod_bridge_too_far` | Bridge Gorge | 68, 40 | an arch with a van |
| 5 | `mod_rail_yard_fireworks` | Rail Yard | 86, 60 | a boxcar |
| 6 | `mod_switchboard_hold` | Downtown (Act II finale: gilded tape rim) | 104, 38 | a tower with a bulb antenna |
| 7 | `mod_airfield_open_day` | Airfield | 118, 70 | a folded paper plane |
| 8 | `mod_harbour_tour` | Harbour | 136, 48 | a crane hook over a barge |
| 9 | `mod_dam_finale` | The Dam (finale: gilded rim and a tiny teapot) | 146, 22 | a dam arch with a lidded teapot |

A completed pin shows 0 to 3 small rubber-stamp stars under the tag (accent green, APPROVED half-moon); the next unlocked pin pulses (1 Hz glow); locked pins are blank paper tags with an empty pin hole.

**Route.** A red string between consecutive pins: **taut** on the active leg, **slack** (a drooping sag) on locked legs, and a **yellow highlighter swipe** over every completed leg (`--era-tape`); a small paper clip travels along the leg once when a mission is first cleared. Acts II and III start on new sheets, joined by a stapled string.

**Decor and animation.** Everything animated is cosmetic and stops under Reduce Motion.

| element | where | animation |
|---|---|---|
| gooseneck lamp light cone | top-right corner | a slow sway of the light pool, 14 s |
| toy helicopter on a thread (Cassandra's helicopter) | circling the Act II sheet | one orbit per 20 s; after M6 a note "APPROVED" sticks to it (no animation change); after M9 it sits landed on pin 9 |
| the Parcel (a small kraft box with a tied string) | appears on pin 4's tag after the first clear of M4, moves to pin 9 after M8 | a hop when it moves |
| clock | desk edge | the minute hand ticks once a minute (tick marks, no numerals) |
| coffee mug with steam | bottom-left | a slow steam wisp |
| stapler | bottom-right | a single click when a mission is stamped |
| goldfish bowl | near the Act III sheet | the fish turns upside down when the player is idle for 20 s |
| sticky notes with doodles (a cow, a teapot, a smiling lunchbox; no text) | scattered | static |
| manicule (pointing hand) | beside the next pin | taps twice every 6 s |
| paper plane | sails across the Act III sheet | one pass per 40 s |
| cow | a cow-patterned hay bale drawn at the roadworks corner of the Act II sheet | static |

**Legend** (acts): I "Basic Forms" (Guns, hedges and the first pushpin), II "Combined Arms" (Faces, whistles and tape), III "Full Spectrum" (Look up, look after, look out). Phones: a mission list (the map is hidden), pins replaced by stamped rows. The map bed is "On Hold" (`sound_music.md`).

## 4. Diorama scenes for title rotation

The title rotates era dioramas (CU17): the Ancient `SETS` stay; Medieval adds six; Modern adds six scenes (arena, factionA, factionB, seed, camera). Each scene runs about 12 s on a slow orbit; Reduce Motion freezes on the first frame. Scenes are picked by the last-played era first, then round-robin over released eras.

| # | arena | factionA vs factionB | seed | what the frame shows |
|---|---|---|---|---|
| 1 | `mod_trench_line` | briefing vs directorate | 7 | two tripod teams firing, amber pin rings winding, red pushpins dropping on helmets, dust puffs on the duckboards |
| 2 | `mod_downtown` | directorate vs shed | 4 | a mortar pair with fingers in their ears, red shell rings on the asphalt, the Switchboard Tower blinking, craters forming |
| 3 | `mod_bridge_gorge` | marmalade vs caution | 9 | a column of Biscuit-Tin Tanks on the deck, the Dozer Plough at the far barricade, tink sparks on a front plate |
| 4 | `mod_airfield` | skyclub vs directorate | 3 | a Fishbowl Chopper banking with the goldfish at the glass, toy planes parked, a Parasol Missileer lighting a lock-on line |
| 5 | `mod_harbour` | shed vs marmalade | 12 | Trolley Rammers on the quay, a ride-on mower striping the planks, a crane gantry and a barge |
| 6 | `mod_rail_yard` | directorate vs briefing | 5 | a Filing-Cabinet Howitzer with all four drawers open mid-recoil, boxcars, a signal post changing colour |

## 5. Loading-screen style

- **Frame**: a clipboard hung on a hook on slate, with a binder clip; punched-hole margins; the six faction emblems drift as small stickers in the corners.
- **Progress**: a **hazard-tape bar** (plain upward chevrons marching to the right) with a rubber stamp as the head; at 100 percent the stamp lands and a thud says READY. The radar sweep is the spinner for unknown-length steps (asset warm). Under Reduce Motion the bar fills without the marching and the sweep is a static ring.
- **Text**: one loading line (`humour.md` s5) in Rubik 500, centred; one tip below (hint or joke, `humour.md` s7); both change every 4 s.
- **Marginalia**: the toy helicopter circles the clipboard on a thread; a goldfish in a small bowl blinks in the bottom-left corner; a speech bubble from Brutus that always reads "Over?" and never resolves (the callback counter `mod_cb_over`).
- **Sound**: the map-bed "On Hold" at -30 LUFS, stopped by the stamp.
- **Era switch**: the 1.2 s photocopier portal replaces the loading screen when assets are already warm.
- **Phone**: the same clipboard, narrower; the goldfish and the stickers are hidden below 360 px width.
