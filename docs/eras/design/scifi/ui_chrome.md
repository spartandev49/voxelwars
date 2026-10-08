# Sci-Fi UI chrome (binding for UI, INTEGRATION and RENDER of the chooser, map and title)

Owner: DESIGN-ERA-SCI-FI part 2. Consumers: UI (screens, `[data-era=scifi]` tokens, `ERA_MAPS.scifi`), INTEGRATION (title rotation, loading screen), RENDER (static chooser stills, diorama scenes). Inputs: `feel_sheet.md` s9 (the chrome tokens, measured), `visual_bible.md`, `humour.md` (loading lines, captions), `missions_outline.md` (mission order, pins), `arenas.md` (arena names). Ancient chrome is navy ink `#14163a`, night `#1d2150`, gold `#ffc93c`, olive `#8bc34a`, lapis `#3b6cf0`; Medieval chrome is rust `#c8501e`, wax `#a8321f`, parchment and gilt `#c9a227`; Modern chrome is cleared green `#12a37f` on graph paper and slate. Sci-Fi is the only **dark-glass** chrome of the four: the others are paper, parchment or slate; Sci-Fi is a night-time toy-shop window with a drive-in screen in it.

## 1. Accent colour tokens

All Sci-Fi chrome is scoped by `[data-era="scifi"]` on the briefing, placement, results and HUD roots, on the era map and on the era chooser card. Tokens (CSS custom properties) with WCAG contrast measured by script (`cr.py`, scratchpad):

| token | value | use | contrast |
|---|---|---|---|
| `--era-accent` | `#35e0ff` ion cyan | primary buttons, the focus bracket, progress, the HUD shield key, the map's completed legs and the active route | 11.59:1 on the panel `#0e1424`, so text and icons in cyan are fine on dark; the button text on a cyan fill is ink `#0e1424` (11.59:1); nearest existing primary 10.7 CIEDE2000 (the Modern sky `#98d8ff`, a faction chip, not chrome), nearest existing chrome token 29.0 |
| `--era-secondary` | `#ff3da5` neon pink | secondary actions, kill-feed highlights, Quiet Hour and Courtesy chips accents, the map's act II nebula edge | 5.65:1 on the panel; ink text on a pink fill 5.65:1; 33.8 from the Medieval wax |
| `--era-warn` | `#ffb02e` amber | low bubble, cooldown ending, caution banners, the Rummage exhaust glow | 10.05:1 on the panel; ink on amber 10.05:1; 8.7 from the Ancient gold chrome, acceptable because it is a warning colour inside dark Sci-Fi screens |
| `--era-alarm` | `#ff3d5a` | the defeat stamp "SHIELD DOWN", the orbital ring, the SHIELD DOWN pip | 5.30:1 on the panel as text or icon; **light text on alarm is only 3.14:1, so text on an alarm fill is ink** |
| `--era-panel` | `#0e1424` over `#141b33` at 82 percent | dark-glass panels with a soft projector-cone vignette on the HUD frame | text `#e8f6ff` on panel 16.66:1; on `#141b33` 15.44:1 |
| `--era-text` / `--era-dim` | `#e8f6ff` / `#9fb4d0` | primary text / secondary text and captions | dim on panel 8.66:1, on `#141b33` 8.03:1 |
| `--era-rim` | `1px #35e0ff at 60 percent` | the neon inner rim of every panel; the corner notch doubles as the focus bracket | decorative; focus uses the full-strength rim |
| `--era-focus` | 2 px `#35e0ff` outer + 2 px `#0e1424` inner ring, with the hex-notch bracket on the four corners of the target | `:focus-visible` on every interactive element | 11.59:1 against the panel |
| `--era-grid` | `#1c2340` hex-grid backdrop at 40 percent | the faint hex pattern behind panels | decorative |

Faction chips use the `factions.md` primaries (azure, brass, fuchsia, lime, jade, ink) with the accent as a 2 px border; the Quiet Hour ink chip gets a violet `#a25ffd` border (4.89:1) so it does not vanish on the dark panel, and the Skitter chip uses its lime (14.20:1). Buttons: primary (cyan fill, ink text, a short scan-sweep on press), secondary (panel fill, cyan text, cyan rim), destructive (panel fill, alarm text and rim, "SHIELD DOWN" stamp in Bungee on a confirmed loss). Tap targets >= 44 px everywhere (390 x 844 touch). Reduce Motion removes the scan-sweep, the warp tunnel and the drifting hex grid; the progress bar becomes static ticks.

Typography: existing Google Fonts only. **Bungee** for headings, stamps and big numerals with wide tracking (`letter-spacing .08em`); **Rubik 500** body (never 300) with tabular numerals for ergs; Rubik 700 uppercase mono-style labels for panels and status pips; no Cinzel (Ancient and Medieval own it); no new font.

Components: chamfered 8 px panel corners and hex-notch corner brackets on every panel; unit cards as **ticket stubs** with a perforated edge and a faction chip; a **segmented shield arc above the hp bar** and ammo pips under shooters on the selection card (CU13); status icons for SHIELD DOWN, EMP, CLOAK and BLINK READY; radial scan-sweep cooldown rings on the power bar; briefing = a **B-movie poster** (the tagline in Bungee, the three commentators as a cast list, a "NOW SHOWING" tag); results = a **film-credits roll** with a rating stamp ("RATED G, FOR GLOWING") and three bubbles that fill with light one by one for the stars (a `ting` each; an unearned star is an empty hex outline); a defeat stamps SHIELD DOWN across the header (a joke about bubbles, never about the player); the arrival card is a **ticket stub** with a tear-off; subtitles are styled as a drive-in speaker transcript with the booth chirp tick, and alien lines carry the translator brackets; the loading spinner is a sweeping hex; the Codex tabs are projector slides.

Sound for chrome: hover = a soft tick, click = a glassy bwip, Deploy and confirm = a rising two-note ting, cooldown ready = a soft chime, overlays = a hex whoosh, star awarded = three rising tings (`sound_music.md` s1).

## 2. Era chooser card art direction

The campaign opens on the era chooser (CU6): four cards; the last era's card is pre-focused with a "Continue The Future" primary (before the first mission: "Step Through"). The Sci-Fi card:

- **Image**: a static pre-rendered still (baked at build, not live WebGL) in a **night-time toy-shop window** style: a shelf of glowing toys behind a pane with neon edge-lighting. On the shelf: a toy Dustpan Hover Tank on a stand with four glow pads and an orange underglow, a Bulwark Warden figure holding a hex dome that catches a pink neon reflection, a Glow Grazer plush with a lamp on a stalk, a tiny Grand Concierge on a hotel-desk base, a Hive Queen egg set, a popcorn bucket and a drive-in speaker post; behind the glass a black sky with a big blue home planet, a small round moon with no sparkle flares and a bubble mid-pop with three falling hex shards. Palette: ink background `#0e1424`, cyan and pink neon, faction accents (azure, brass, fuchsia, lime, jade, violet) only as small objects. No letters, numbers, flags, stars at flag size or crosses; the neon "sign" in the window is a pictogram (a smiling bubble).
- **Frame**: a ticket stub with a perforated edge, a hex-notch bracket on each corner, a **ribbon with the earned title** (the latest reward title, for example "Hover Hustler") and the star count "x / 27" with three small bubble icons.
- **Caption** (intern gag, once per screen, verbatim): "THE FUTURE. Selected by Zeus's intern, who held the remote upside down."
- **States**: NEW ribbon until the first mission is cleared; hover lifts the card like a tray and the neon flickers once (0.4 s); focus ring per tokens; locked is never shown (all eras open); finished shows a RATED G, FOR GLOWING stamp and the finale card of `humour.md` s3.3; phone: card stack, 16:9 crop, caption under the image.
- **Transition**: a 1.2 s **warp tunnel** (the time portal in Sci-Fi dress): the card zooms into the pane, hexagonal streaks rush past, a soft "whump" and a chime; the music crossfades to the map bed "Star Chart Lounge". Reduce Motion: a fade.

## 3. Campaign map art direction (`ERA_MAPS.scifi`)

"The Drive-In Star Chart": a star chart **projected on a drive-in screen**. Uses the Ancient map engine unchanged (SVG built at runtime from `LAND`, `ZONES`, rivers, `COLORS`, `PINS`, `VIEWS`, `decor`; land rasterised to 1.6-unit cubes in a 160 x 100 unit sheet) with the Sci-Fi data below.

**Land shapes.** There is no coastline. The sheet is the white projection screen seen in perspective, lit from below by a projector cone; on it the three acts are **nebula clouds** (the `ZONES`: soft polygons filled with a low-opacity gradient) and the places are **cardboard-cutout planets and stations** (the `LAND`: clusters of cubes forming discs, rings and small silhouettes, with a drop shadow on the screen). Fourteen filler cutouts (asteroids, tiny moons, satellites) fill the empty areas.

| act | nebula | fill | land character |
|---|---|---|---|
| I Landlords and Squatters | left, a cyan-blue cloud `#1d3a6e` to `#0e1424` with pale stars | cyan stars on ink | the Moon (a grey disc with a dome), a lava moon with a ring of sparks, a reactor station |
| II The Help Is Here | centre, a pink-violet cloud `#4a1f5e` to `#0e1424` | pink and violet stars | a split wreck, a mall station with a smiling dish, a neon city planet with a tall sign |
| III Queen Size | right, a lime-green cloud `#1f4a3a` to `#0e1424` | lime and jade stars | a jungle moon with a glowing tree, a cratered asteroid with a hole, a ring station with a broken window |

**Hyperlanes** (the engine's `rivers` polyline repurposed as a lane): one dashed lane runs from pin 1 to pin 9 through all pins, drawn as three short dash segments per leg in `--era-accent`; there is no river or sea.

**Pins.** Nine cardboard pins (a planet disc with a small tag in the act colour, 7 map-units wide); positions on the 160 x 100 sheet:

| pin | mission | place | position (x, y) | tag glyph (no letters, no cross, no star) |
|---|---|---|---|---|
| 1 | `sf_lunch_break` | The Moon (Dome Sweet Dome) | 16, 70 | a dome with a crack |
| 2 | `sf_floor_lava` | Magma Lounge | 34, 48 | a hover pad over a flame |
| 3 | `sf_overclock_oops` | Core Meltdown Cafe (Act I finale: gilded notch rim) | 54, 66 | a reactor ring with a bubble |
| 4 | `sf_express_delivery` | Hull Down | 68, 36 | a split hull with a lamp |
| 5 | `sf_turn_it_off` | Courtesy Plaza | 86, 58 | a smiling dish |
| 6 | `sf_grand_reopening` | Gridlock Boulevard (Act II finale: gilded notch rim) | 102, 32 | a bellhop cap on a tower |
| 7 | `sf_blink_jungle` | Spore Hollow | 118, 66 | a tree with a lamp |
| 8 | `sf_noise_complaint` | Sinkhole Nest | 134, 44 | a hole with a manta shadow |
| 9 | `sf_queen_size` | Spin Cycle Station (finale: gilded rim and a tiny antler crown) | 148, 20 | a ring with a cracked window |

A completed pin shows 0 to 3 small lit bubbles under the tag (cyan filled for earned stars, empty hex outlines for the rest); the next unlocked pin pulses (1 Hz glow); locked pins are dim dark cutouts with an empty tag.

**Route.** The dashed lane is **dim and dotted** on locked legs, **bright with moving dashes** on the active leg, and **solid cyan** over every completed leg; a **tiny hover-car silhouette** (a drive-in car with fins, no brand) travels once along a leg when a mission is first cleared. Acts II and III begin where the previous nebula ends, joined by a short beam.

**Decor and animation.** Everything animated is cosmetic and stops under Reduce Motion.

| element | where | animation |
|---|---|---|
| projector cone | from the bottom edge up through the sheet | a slow dust-mote drift, a faint film flicker every 12 s |
| booth window | top-left | three tiny cutout silhouettes (a headset, a robe, a seatbelt) bob in time with the map bed; after M9 a fourth tiny shape stands beside them (the promoted one, unlabeled) |
| the time remote | bottom-right, upside down | a button glows red once a minute and nothing happens |
| drive-in speaker posts | along the bottom | a cup holder with a cup; one has a popcorn bucket that tips over when the map is idle for 20 s |
| satellites | orbiting two planets | a slow circle; one follows the cursor for a second and files a "complaint" (a red hex blink) |
| planets | each pin | a slow texture drift (the lava glows, the jungle lamps pulse); Frostbite and the Chasm are unpinned filler planets |
| cloaked ship | Act II nebula | a faint violet outline crosses once per 60 s and vanishes |
| pointer | beside the next pin | a hologram hand taps twice every 6 s |
| stamp | on a cleared finale | RATED G, FOR GLOWING lands with a thud and a ting |

**Legend** (acts): I "Landlords and Squatters" (The Moon has been repossessed; both parties are confident about it), II "The Help Is Here" (The appliances are very pleased to assist; the guild would like a word, quietly), III "Queen Size" (The bugs have a plan, the jungle has a hill and the sky has a noise complaint). Phones: a mission list (the map is hidden), pins replaced by ticket-stub rows with the planet glyph. The map bed is "Star Chart Lounge" (`sound_music.md`).

## 4. Diorama scenes for title rotation

The title rotates era dioramas (CU17): the Ancient `SETS` stay; Medieval adds six; Modern adds six; Sci-Fi adds six scenes (arena, factionA, factionB, seed, camera). Each scene runs about 12 s on a slow orbit; Reduce Motion freezes on the first frame. Scenes are picked by the last-played era first, then round-robin over released eras.

| # | arena | factionA vs factionB | seed | what the frame shows |
|---|---|---|---|---|
| 1 | `sf_moonbase` | tidy_concord vs rummage | 7 | a Warden line under hex domes, rivet gunners chipping, a ripple of bubble pops, the big blue planet in a black sky, low-gravity dust |
| 2 | `sf_lavaworld` | tidy_concord vs rummage | 3 | Dustpan Hover Tanks skating over the lake with orange underglow, a Salvo Cart cratering the causeway, three geysers on a red telegraph |
| 3 | `sf_megamall` | rummage vs courtesy | 9 | a Tinker's EMP freezing a line of Greeters mid-bow, blue arcs crawling, "please hold" bubbles, the fountain atrium, a smiling kiosk |
| 4 | `sf_neoncity` | courtesy vs quiet_hour | 21 | the Concierge striding down the boulevard in neon rain, violet cloaked outlines on the side streets, a billboard flickering |
| 5 | `sf_jungle` | skitter vs glowmoss | 17 | Grazer lamps lighting a spore-lit glade, Hop Notaries blinking over the acid river with afterimages, the Heart tree glowing |
| 6 | `sf_orbital` | skitter vs tidy_concord | 31 | the Queen's dais, a brood pulse tumbling in, a Deep Clean ring on the deck, the great window with stars and a spinning planet beyond |

## 5. Loading-screen style

- **Frame**: a drive-in screen in perspective with a projector cone from the bottom edge and a hex grid backdrop; the six faction emblems drift as small stickers in the corners; a speaker post stands at each bottom corner.
- **Progress**: a **segmented hex bar** that sprints to 99 percent and then waits politely, with a small "Please hold" tag, and a bubble at the head that pops with a ting at 100 percent. The sweeping hex is the spinner for unknown-length steps (asset warm). Under Reduce Motion the bar fills without the sprint and the sweep is a static ring.
- **Text**: one loading line (`humour.md` s5) in Rubik 500, centred; one tip below (hint or joke, `humour.md` s7); both change every 4 s.
- **Marginalia**: a hover-car silhouette crosses the bottom edge once per load; a popcorn bucket in the bottom-left; a translator caption at the bottom ("[Translator: 'Loading.' Confidence: 52 percent. Alternate reading: 'Lurking.']") that appears on at most one load in three (the translator gag cooldown); a speech bubble from Brutus that always reads "Is this thing on?" and never resolves.
- **Sound**: the map bed "Star Chart Lounge" at -30 LUFS, stopped by the ting.
- **Era switch**: the 1.2 s warp tunnel replaces the loading screen when assets are already warm.
- **Phone**: the same screen, narrower; the stickers and the speaker posts are hidden below 360 px width.
