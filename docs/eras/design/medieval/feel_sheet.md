# Medieval: feel sheet and judgement of the two proposals (binding, synthesizer part 1)

Era id `medieval`, prefix `med_`, currency **groats**, HUD tag `[data-era=medieval]`. Written against plan.md v3.1 (s1, s4, s5, s7, s8, s10, s11, s13) and the code (checks listed in section 12). Needs only SIM modules #1-#13 (the E-FREEZE prefix); it never touches mines, cover/LOS, regenerating shields, cloak, EMP, hitscan, blink or hover. Companion files: factions.md, rosters.md, boss_table.md, arenas.md (includes the binding mission ladder), props.md, puzzles.md.

## 1. One-line conceit

The Grand Annual Pageant of Marrowby is a village fete that turns into a real war every year because each faction brings the props it actually owns, and this year one of the props is a real dragon; the three commentators, dragged here by Zeus's intern, call it live from a booth made of hay bales.

## 2. Tempo targets (the "Crunch": slow, heavy, readable; the decisive moments are EVENTS you can see, not attrition)

| metric | target | notes |
|---|---|---|
| seconds to first contact | first damage 6-10 s; first melee contact 12-20 s (a held pike line stretches it toward 20, on purpose); small arenas 8-12 s | zone gaps small 28 / medium 52 / large 74 u (arenas.md); no unit starts inside its own weapon range of an enemy except the two giant trebuchets, which are placed >= 20 u behind their front edge |
| kills per minute (contact phase, both sides, per 100 starting units) | 32-42, and <= 0.85 x the Ancient value measured in P0 | heavy armour, longer cooldowns, fewer and heavier hits (hp about 1.3-1.5 x Ancient, damage per blow similar) |
| battle length | median 90-150 s; sieges 150-300 s with a script beat every 40-60 s | "a siege that takes too long" is a joke the commentators make, never a slog the player sits through |
| median engagement distance (damage events) | 3.5-5.5 u, and <= 0.8 x the Ancient value measured in P0 | melee 1.8-3.4 u (pike 3.4); poacher 28, crossbow 30, longbow 44, mangonel 46, springald 50, trebuchet 72 (min 26), Lady Counterweight 90 (min 30) |
| share of damage by range class | melee contact (<= 4 u) 58-64 percent; direct ranged 20-24; indirect/artillery 8-12; dots, fire, poison, hazards 6-8 | ER27 fingerprint: ranged share clearly LOWER than Ancient, first contact LATER, speed distribution NARROWER and BIMODAL |
| speed distribution | foot 1.9-2.9 u/s (median 2.5, 0.85 x Ancient); mounted and beasts 3.2-3.5 (charge run x2.4); siege 0.7-1.5; air 4.2-5 | bimodal on purpose: a slow line and a fast hammer |
| vertical spread | 0-9 u (walls and towers to 10, wyverns at 4-6 u, the dragon at 8) | Ancient is 0-2 |
| the ER27 stress case | Medieval vs Ancient | if the 200-battle vector is closer than the minimum pairwise distance, this sheet or the roster is rewritten, never a metric tweak |

The Ancient feel is a fast skirmish line with javelin ballet; the Medieval feel is a slow moshpit with a flag on top, where a charge, a banner, a gate or a bell decides the fight.

## 3. Camera defaults

The default camera is **unchanged** (yaw -0.7, pitch 0.65): Ancient pixels stay bit-identical (G8) and plan s6 gives the camera only `CameraRig.shot(spec)`. Proposal B's lower pitch and "Banner Cam" are not in the plan and are dropped. What changes is what the camera sees: banner poles (2x2 voxels, 3.6 u) and ground rings read from the default distance, and walls and keeps (0.2 voxel buildings) frame the siege maps. Era shots (real time, sim at 0.5x, skippable with Esc or a click, Reduce Motion = cut): "crane" (low to high wide), "tilt track" (low side-on parallel to a charge), "murder hole" (inside-out through an arch), "dragon up" (low angle, dolly up), "bridge side" (side-on along the deck), "two-shot push" (low, slow push-in). Siege missions open with a 3 s pan camp to gate. Every set-piece shot is 3-6 s.

## 4. Signature mechanic and its on-screen tell: THE BANNER (aura `banner` + morale cascade)

Every banner carrier (standard_bearer, ser_valiant, reeve, castellan, abbess) flies a swallow-tail pennant on a 3.6 u pole (pole 2x2 voxels, cloth at least 3 voxels wide, both survive the far mesh) and stands in a pulsing ground ring in faction and team colours. Aura: allies within the radius deal +8-10 percent damage and lose morale at x0.5-0.6; auras of one kind do not stack (the strongest wins). **The tell:** the ring pulses at 1 Hz while the carrier is healthy and flickers under 50 percent hp; the cloth ripples fast at high resolve and hangs limp under 40. When the carrier dies the pole drops, the ring SHATTERS into voxel confetti, a grey rout ripple expands (0.6 s), every ally inside 12 u flinches, takes a -35 morale shock (the existing officer-death shock x1.5 stacks on top), and the weak ones run. One look at the field answers "who is about to break", and the longbowman's prefer-officer rule makes the pennant the snipe target.

Secondary tells, each a read-at-a-glance event: CHARGE (gold speed streaks, hoof thunder building 2 s before the hit, lance splinters into six voxel chunks); BRACE (the pole butt plants with a visible thunk and the tip dips with a glint, a chevron decal under the block); GATE (crack stages at 66 and 33 percent, iron bands twang); FIRE (thatch glows orange before it burns, bunting burns in a ripple); HEAL (gold motes); POISON (a mint-green cloud and sneezes); BELL (a pressure ring and a DONG). Optional HUD echo: a "Colours strip" of pennants with a resolve fill (CU13; first thing cut if HUD time is short; the world tell is the requirement).

## 5. Sound palette: clanging, creaking, ceremonial

Iron on iron, timber under load, brass and drums that sound like a procession even in a brawl. Forbidden timbres: gunshots, lasers, synth pads, a modern drum kit, cathedral choir or chant (religious reference), any real chant. Hot families (for AU0 and the AU1 hunt): `sword_on_plate` (a short bright clang with a ring, never a clean slice); `mace_crunch` (a thud with a tin rattle, a bucket dropped onto a bucket); `lance_shatter` (wood splinter, metal scrape, a crowd "ooh" a beat later); `hoof_thunder` (a layered gallop that builds 2 s before impact: the audible tell); `pike_brace_thunk` (pole butts into soil with a groan of timber, a row of them sounds like a drum line); `longbow_volley` (a hundred whispers, a flutter, a patter of thuds); `crossbow_thwack` (the only dry sound in the palette) and `crossbow_crank` (ratchet clicks for the 2.6 s reload: the tell); `trebuchet_swing` (winch creak, long whoosh, sling-release thwump); `ram_gate_boom` (a booming wooden knock, a groan, iron bands twanging); `wall_collapse` (rumble, cascade of rocks, a last single stone); `banner_fall` (cloth whip, pole clatter, a short crowd "aww"); `church_bell` (a big round dong with a long decay, shared by the Bellringer, Great Peal, the bell stinger; used as setting only). Hot-adjacent: `dragon_roar`, `wing_flap_big`, `oil_pour_sizzle`, `armour_step`, `hoard_glint`. UI: quill scratch, wax stamp, page rustle. No realism processing; this is the cartoon-heavy palette. Music (seven tracks, CC0 first, CC BY with credit, synth fallback): menu "Pageant Fanfare (Slightly Flat)" 96 bpm shawm, lute, frame drum; map bed "Parchment Wander" 70 bpm lute or recorder with a drone; battle low "Muster In The Mud" 84; battle mid "The Crunch" 100; battle high "Charge Of The Wobbly Brigade" 126 in 6/8; victory "Huzzah (Properly Used)" 110; defeat "Lament Of The Late Mortgage" 56 (solo fiddle, one bell toll).

## 6. Silhouette language

The Medieval skyline is **poles and plumes**: banners, lances, pikes, bills and bell-staffs make a vertical forest (about one in three foot units carries a pole weapon or standard taller than itself), against Ancient's round shields and horizontal spears. Per faction (factions.md): Marrowby TALL and VERTICAL; Yeomen LEAN and LONG; Gatehouse SQUARE and BOXY; Bellfount ROUND and SOFT; Mostly Paid Company ASYMMETRIC and PATCHED; Wyrmkin SPIKY and WINGED. Far-mesh rules that every model respects (lint: `downsample2`): poles, tusks and bills at least 2x2 voxels; cloth at least 3 wide; the physician's beak 3x3; dragon wing membranes at least 2 voxels thick; a bell at least 6x6. Team tint sits where the eye goes: surcoat and caparison chequers, sash and banner cloth, pavise face and machine pennants, bell-skirt hem, the cyan patch, the coin sack and wing edge. 19 of the 34 units are bespoke silhouettes (floor 15); the five bosses are five different outlines.

## 7. Humour engines (three; Ancient's bureaucratic understatement is NOT primary)

**E1 The Pageant Goes Wrong** (stage-management disaster: cues, props, understudies, the interval; Brutus-led, loud). Brutus: "And the dragon enters from STAGE LEFT! Which is, I am told, also the river!" Brutus: "A MISSED CUE! The cavalry were meant to enter on the fanfare! The fanfare was a SNEEZE!" Plato: "The crowd applauds the grandstand collapsing. Is that applause for the play, or the play for the applause?"
**E2 The Rule Book Taken Literally** (chivalry, precedence, oaths, tolls, contracts; Plato-led, sincere and loud, never deadpan memo-speak). Plato: "Ser Valiant will not strike a kneeling man. The man, aware of this, has been kneeling since Tuesday." Brutus: "SIR Wobbleton, Second Chair of the Stool, Keeper of the Lesser Pennant! Big name! Small horse!" Sellsword last words: "I swore to hold the line. Nobody said which line. I picked a short one." The distinction from Ancient: the joke is a rule enforced with enthusiasm and hubris, not a form filed in silence.
**E3 Heavy Things Arrive Late** (weight, mud, siege logistics, bad news by pigeon, Cassandra's plague; Cassandra-led). Brutus: "DAY NINE of the siege! The ladder has arrived! It is for the NEXT siege! HUZZAH!" Cassandra: "Plague. I said plague. Tuesday. It is Thursday. I take no pleasure in it. A small pleasure." Plato: "A knight in plate falls over. It takes eleven seconds. The suspense is the sentence." Brutus: "A DRAGON! The pigeon was supposed to warn us! The pigeon has not been seen since Tuesday!"

Death-line rubric: targets are paperwork, hubris, equipment, hats, horses, spoons and the three commentators; no pleading, family or pain; "plague" and "abbey" are setting only (a sneeze and a sit-down). Running gags with caps: Brutus's tabard (it says KING; he has not asked whose; cooldown), his HUZZAH at the wrong moment (cd 480 s, max 3 per battle), Plato asking whether a feudal contract is a dialogue, Cassandra predicting the plague and, for once, being right, Dennis and the spoon, the dragon-insurance sponsor and the pigeon (B). **The intern** is offstage: named only in the arrival card, god-power tooltips and chooser captions ("MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'."), at most once per screen. **Arrival card (first entry, skippable):** "MEDIEVAL. Zeus's intern has delivered the commentators to the Grand Annual Pageant of Marrowby, 'roughly the right century' by his sticky note. Brutus has acquired a tabard. Plato has acquired questions. Cassandra has acquired a cold and a bad feeling about the buffet." **Arc:** Act I (Pageant Season) the booth is hay bales and every briefing carries one stage-management gag; Act II (Siege Season) the bunting becomes smoke, HUZZAH starts to land at the right moments, which unsettles everyone, and the plague arrives and is, for once, acknowledged; Act III (Dragon Season) the commentators ask to be sent home and the sticky note turns up in the hoard. **Finale payoff on an era-independent surface** (the Ancient finale is frozen): the Credits gain "Cassandra: Chief Prophet (Now Verified)", Stats shows "Predictions confirmed: 1", and the "Medieval cleared" card quotes the sticky note under the spoon: "Wrong century? Try the one with the engines. They will love it. - Intern". Eight setup-free/gated callback pairs are specified in the two proposals (tabard, stool, huzzah, contract, plague, spoon, Dennis, intern) and go to the COMEDY-EDITOR as the starting ledger.

## 8. HUD chrome tokens

| token | value |
|---|---|
| accent (rust) | `#c8501e` (fills, rules, active tabs; for TEXT on parchment use wax `#a8321f`, contrast >= 4.5:1; rust alone is about 3.7:1 and is for large or bold only) |
| parchment | `#efe2c0` (panels), deckled edges |
| ink | `#2b2118` (text) |
| wax | `#a8321f` (seals, rubric initials, primary buttons) |
| iron | `#4a4f57` (frames, nails, battle HUD frame) |
| gilt | `#c9a227` (stars, ribbons) |
| frame ornament | parchment panels with a rope-and-stud border; shield-shaped (escutcheon) portrait frames; pennant-shaped hp and morale bars; ribbon act headers; wax-seal cooldown icons that STAMP when ready; wax-seal map pins on an illuminated parchment map ("The Disputed Hedges of Marrowby", dotted ink routes, a small doodled dragon in the margin that grows each act); marginalia doodles (a knight losing an argument to a snail) |
| button sound | hover: a quill scratch; click: a wax-stamp thump; Deploy/confirm: stamp plus a short brass blip; cooldown ready: a stamp |
| font weight | existing Google Fonts only: Cinzel 700 uppercase for titles with a rubric (wax-red) initial letter, Cinzel 600 for sub-heads, Rubik 500 for body on parchment (never 300), Bungee only for big numerals and stamps |
| Ancient contrast | Ancient chrome is navy ink `#14163a`, gold `#ffc93c`, marble `#f3f6fb`; no Medieval token reuses those |

## 9. What this era must NEVER feel like

1. Ancient with armour: no era-wide fast skirmish line, no open-field javelin ballet, no single stance that wins everything.
2. Grimdark: no mud-and-despair palette, no pain; it is a saturated heraldic toy box with bunting.
3. A real war or religion: no crusade, holy war, real order, pope, saints, crosses, real arms or flags; the abbey and the bell are setting only.
4. A siege simulator that makes you wait: every gate has a ram plan, every wall a reason to hurry, a script beat every 40-60 s.
5. Cavalry as an unstoppable button: every charge has a visible counter (pike, stake, net, bill, bolt, bell, mud).
6. Arrow spam: arrows are a tax on plate, not a plan (ap .1 against armour .5-.58).
7. A zoo of reskins: no two units share a silhouette; the banner is always the loudest object on the field.
8. Bureaucracy: this is the Ancient era's trick; here the humour is stagecraft, rule-literalism and weight.

## 10. Judgement: proposal A (spectacle and silhouettes first) vs proposal B (systems and learning curve first)

Scores 1 (poor) to 5 (excellent), judged against the criteria the plan sets.

| criterion | A | B | reasoning |
|---|---|---|---|
| readability / silhouette | 5 | 3 | A designs from the default-camera screenshot: 18 bespoke silhouettes, a physical banner, a per-faction silhouette word. B has 17 flagged but several hum1 variants share outlines (five Marchmoor and five Fenwarden hum1 bodies), and the Fenwarden faction is a generic skirmisher set |
| mechanic teaching | 3 | 5 | B's ladder teaches nine mechanics in nine missions, each star 3 tests the one before, and gives the first-sight beat and blind foil per mission. A's M1 needs the banner module (#11) so it cannot run in the P1 plumbing slice, M6 teaches gates plus artillery plus fire at once, and M8 teaches nothing |
| distinctness from Ancient and the other eras | 4 | 3 | A's pageant fete, banner, siege and dragon and its chrome are an identity; B's fingerprint targets are the sharper numbers (adopted), but its engines 2-3 lean on forms, back-orders and invoices, which is Ancient's bureaucratic understatement again |
| humour | 4 | 4 | A: stagecraft engine, Dennis, the spoon and the sticky-note payoff are the strongest through-line; B: oath literalism, the pigeon, the tabard-for-a-pigeon arc and the dragon-insurance sponsor are the strongest callbacks. Both write the death lines in the rubric. Merged |
| feasibility against plan mechanics, rigs and budgets | 3 | 4 | A asks for a pavise rear-arc aura, rider-yanking hook, dragonfire cone, five new materials (three duplicate shipped ones), and non-lite crews (trebuchet 39 parts). B mostly stays inside M0-M13 but adds a Banner Cam, a lowered default camera, a sapper that duplicates the ram and several hum1-only silhouettes |
| **total** | **19** | **19** | A's skin and B's skeleton: the binding design is the union |

## 11. Binding decisions (what was taken, dropped, fixed)

**Taken from A:** the six factions (re-coloured), the pageant conceit, the banner as the signature with its ground ring, the dragon and Dennis, 34 of A's units minus two, the 12 hot sound families, the chrome vocabulary, most prop and arena ideas, the humour through-line and the sticky-note payoff, the currency groats.
**Taken from B:** the mission ladder discipline (one new mechanic per mission, nine different mechanics, star 3 tests an earlier one), `mag 1 / reload 2.6` on the crossbowman (the reload window as a teachable tell), armour numbers and the ap economy, the counter ring with mechanic-off controls, faction doctrines for Quick, the fingerprint targets (engagement distance, ranged share), Lady Counterweight as the fifth boss, the hook-as-shield-disarm, the cloister arch and herb bed props, the puzzle ideas (air, reload), oath-literalism and pigeon-news humour, the dragon-insurance sponsor.
**Fixed because infeasible or off-plan (verified against the plan and code):**
1. A's mission 1 teaches the banner; the banner module is #11 of 19 and the P1 plumbing slice needs mission 1 with modules #1-#5 only. The ladder now opens with BRACE and HOLD (M1) and moves the banner to M2.
2. A's M6 taught three mechanics in one mission and M8 none; split into gates (M5), healers (M6), fire (M7), artillery (M8), air (M9).
3. Pavise rear-arc aura: no such module. It is a `stance` kind `pavise` (a param inside an existing ability id, like `phalanx`), fallback shield block .90.
4. Hook that yanks riders and triggers a bailout: the bailout is death-triggered only (M13). The hook stays the existing shield-disarm; the billman earns the anti-knight role with ap .35.
5. Dragonfire cone: no cone projectile in the plan. It is a `fireball` volley of three with an ignite flag; the cone is a render effect (PROJ_FX row).
6. Bell stun: `cc_field` has `confuse sleep stone scare panic_cav` today; `stun` is a new effect VALUE inside the existing id (plan seam 26), fallback `scare`. The troll's slow aura (also not available) became the existing `confuse` ("Toll Demand"). The dragon's wing-gust push was dropped (render only).
7. Crews: the shipped Ancient crews are 10-13 parts each (rigs.md s9 is stale); the plan decided lite crews of 6 parts (D12), so the trebuchet is 27 parts, not 39.
8. Materials: `flagstone`, `mud_deep`, `ash_scree` duplicate shipped `cobble`, `mud`, `ash`; three new ones only (`lists_sand`, `heather`, `scree`).
9. Gate openings: A's gate was 2.4 u radius (4.8 u opening) but plan W10 requires vehicle corridors >= 6 cells; gate, portcullis and drawbridge are now 3.0 u (6 u openings); hit points re-derived from ram damage.
10. Colours: three of A's colours failed or sat on the line against the Ancient primaries (CIEDE2000 10.9, 14.1, 15.5); re-measured values are in factions.md.
11. Zones: the default medium gap is 32.6 u (checked in `arena.js`) and a 44 u longbow would start in range; this era places zones further apart (medium 52 u).
12. Bosses: proposal A had one hum1-scaled boss (the coin golem); all five are now non-hum1 silhouettes (boss_table.md). Roster uniqueness checked against the Ancient ids, the Ancient faction ids and every Modern and Sci-Fi proposal id (no hit).
13. Camera: B's lowered pitch and Banner Cam are not in the plan and would move Ancient pixels; dropped.

**Delegated to part 2 and part 3 with a recommendation** (not in this deliverable list): missions.json and the full MS rows (use the ladder in arenas.md); god powers (recommend A's pageant/bell/soup/etiquette/audience set over B's form-and-audit set, because B's tooltips are the Ancient bureaucratic joke again); mutators (recommend A's Foam Swords and Plague Season with B's Mud Season as a possible third if the mutator-x-mechanic matrix permits); achievements, wave names (merge the two lists of twenty), survival boss titles (in boss_table.md), announcer categories, tips, loading lines, kill verbs, lessons. Every unit's joke must name its mechanic (UC); the rosters.md "joke engine" column is the seed.

## 12. Risks and what was checked

| risk | mitigation |
|---|---|
| banner module lands late (#11) while M2 and M4 need it | ask SIM to pull the `aura banner` and `bailout` params of M13 forward (they depend only on M0); fallback "Colours-lite" = rally aura plus the officer shock, the tell stays render-only |
| three new quad1 species (`boar`, `troll`, `costume`; the ox is a horse-species skin) | each is +7 clips at most; fallbacks borrow the horse/hound/goat gait rows; `costume` reuses horse clips with human legs |
| hum1 grid limits: weapon grid is 9x48x9 voxels (a 4.8 u pole), offhand 16x16x6 | the pole is fine (pike 4.6 u, banner 3.6 u); the pavise board (2.0 x 2.4 u) needs a bespoke `board` part and the banner cloth a `flag` part (child of weapon): both are UNITS/ANIM errata to `docs/spec/rigs.md`, fallback cloth baked into the weapon grid |
| 16-type cap vs mixed campaign rosters | the biggest roster (M9) is 13 types |
| air termination | AA guarantee in armygen and campaign validation; dragon lands at 40 percent hp or 30 s after no AA is near; termination rule for remnants (M7) |
| crater storm and perf | at most 2 trebuchets per army plus the Lady; M10 rate cap; the Medieval perf probe is "siege with 2 trebuchets and 400 foot" |
| gate/bridge clog | 6 u openings everywhere, a 6-ram column pass test per castle and bridge arena |
| tone | the abbey, the bell and the beak are setting only; deaths are comic; banned-reference note in factions.md; text sweep |
| HUZZAH overstaying | cooldown 480 s, max 3 per battle |
| scope (19 bespoke silhouettes, three new species) | cut order from plan s13: Quick-only arenas and units first, then props 38 to 34 (props.md lists the four), then the third battle track; the nine missions, six puzzles, banner, gates, charge/brace, healers/poison, fire and the dragon are never cut |

Checks run for this deliverable: 34 ids vs `src/content/era_ancient/stats.js` and the Modern/Sci-Fi proposals (no collisions); CIEDE2000 of every primary vs the seven Ancient primaries and within the era (script in the scratchpad, numbers in factions.md); arena `SIZES`, zone defaults, material list, weather list and prop catalog format read from `src/world/arena.js` and `src/content/era_ancient/props/catalog.js`; ability and `cc_field` effect vocabulary from `src/sim/abilities/`; hum1 part grids from `docs/eras/maps/03_voxel_rigs_anim.md`; Ancient CSS tokens from `src/ui`. Not verified (and not verifiable in design): every number in stat intent, the ER27 vector, the far-mesh readability of any model, and the comedy.
