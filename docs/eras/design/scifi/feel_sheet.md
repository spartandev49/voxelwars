# Sci-Fi: feel sheet and judgement of the two proposals (binding, synthesizer part 1)

Era id `scifi`, id prefix `sf_`, currency **ergs** (`fmtCost` prints "1,200 ergs"; Ancient hoplite = 100; an erg is "a very small amount of energy and a very large amount of paperwork"), HUD tag `[data-era=scifi]`. Written against plan.md v3.1 (s1, s4, s5, s7, s8, s10, s11, s13) and checked against the code (section 13). It is the only era that needs the full module chain: SIM #1..#19, i.e. S-FREEZE (M4 shields #17, M5 cloak #18, M6b EMP #19 are Sci-Fi's own; the rest it shares with Medieval and Modern). Companion files in this folder: factions.md, rosters.md (34 units, contract checks, counter web, flagged sim parameters), boss_table.md, arenas.md (12 arenas plus the **binding nine-mission ladder**), props.md (38), puzzles.md (6). Part 2 (missions.json, humour, god-power text, mutators, achievements, sound, chrome, visual bible) builds on these rows; where this folder says "binding" part 2 amends only through a logged change.

## 1. One-line conceit

A toy-shop-at-night space war over a repossessed Moon, where every soldier wears a rechargeable bubble, every machine politely closes your account, and the three commentators, delivered by Zeus's intern holding the time remote upside down, call it like the trailer for a film nobody greenlit.

## 2. Judgement of the two proposals

Both proposals read the plan and the code; they disagree on angle (A: spectacle and silhouettes first; B: systems and learning curve first) and the merge is clean because the angles are complementary. Scores are 1 (unusable) to 5 (ship as written), by the criteria the brief names.

| criterion | A "spectacle and silhouettes" | B "systems and learning curve" | reason in one line |
|---|---|---|---|
| readability and silhouette | **5** | 4 | both claim 20 bespoke silhouettes and both give each faction a shape word; A adds a greyscale 40 px test per faction, five distinct insect builders and an animation hook per unit, while B has no greyscale discipline and its Array faction is two boxy hum1 robots that differ mainly by the arm (`rivet_bot`, `tally_bot`) |
| mechanic teaching | 4 | **5** | A gives every headline mechanic its own mission and a clean ladder; B adds a counter matrix with numbers, scout codes, the Four Questions chips, blind-bot expectations and a first-three-minutes script |
| distinctness from other eras and from Ancient | 4 | 4 | both build on the same signature (the bubble); A's 18-26 u engagement and B's 24 u / 70 % ranged sit on top of Modern (24-30 u, 85 %), so both are corrected in section 3; B's "state changes" fingerprint is the better ER27 sentence |
| humour | **5** | 3 | A has a voice per engine, a translator-with-confidence-rating running gag, unit jokes that name a number or a tell and a drive-in trailer frame; B's engine 1 is generic technobabble, its best material (literal machines, genre bingo) is folded into A's engines |
| feasibility against plan mechanics, rigs and budgets | 3 | 3.5 | A leans on suppression (Modern's headline), low cover, a periodic brood, a suited-giant loader and a cloaked air boss; B leans on mines, two-threshold summons, an "Overheat" status, a harpoon yank, flak multipliers and a flamethrower cone; neither is blocked, both need the flags in rosters.md section 6 |
| **total** | **21** | **19.5** | merge: A's factions, silhouettes, voice and ladder; B's counter matrix, scout codes, chips, the break-window tell and the first-three-minutes script |

### 2.1 What was taken, dropped and fixed (each is a decision, in the order a reviewer would ask)

1. **Six factions are A's six** (Tidy Concord, Rummage Armada, Courtesy Systems, Skitter Hive, Glowmoss Reach, Quiet Hour). B's Kilnworks (heavy industry, mortars, flamers) was dropped because its niches are already inside the six: the orbital caller became the Housekeeper's cancellable channel, the mortar is the Salvo Cart, the flamethrower belongs to Medieval fire. B's Hush, Array, Brood, Scrapwake and Concord map one-to-one onto A's Quiet Hour, Courtesy, Skitter, Rummage and Concord.
2. **All colours were re-measured and A's and B's primaries all failed.** CIEDE2000 against the nineteen primaries that already exist (7 Ancient, 6 Medieval, 6 Modern) put A's Rummage orange 3.7 from Marrowby, B's Scrapwake teal on the Egyptian teal, A's Courtesy magenta 5.9 from Bellfount and A's lime 13.8 from Yeomen. The free region is saturated neon and deep ink, so the art direction is **neon on ink**: toy-shop signage at night (factions.md has the numbers and the sweep).
3. **Suppression is gone from Sci-Fi.** A gave the Rivet Gunner a `suppress` row; the Pin is Modern's headline and its ER27 separator. The rivet gun's identity is now B's insight, **chip fire resets a bubble's regeneration delay**, which is the same lesson with no new status.
4. **No low cover, no cover-seeking AI, no mines.** A's `sf_barrier_low` and B's junk mine are dropped; cover in Sci-Fi is full-height blocking (it stops beams and bolts), which keeps Modern's M9/M11 ownership clean even though S-FREEZE contains the modules.
5. **No suited giant.** A's Loader Suit and B's Hauler Suit were both cargo-lift exoskeletons; D21 allows at most one, nothing requires it, and the silhouette sits next to a famous one. The roster has no hum1 x2.4 mech; the two mechs are own-rig (mech1 biped, mech4 quad) and are both bosses.
6. **The sniper moved to Quiet Hour.** A's Lens Marksman collided in name and silhouette with Modern's `long_lens_sharpshooter`; B's Silent Signer (cloak after standing still, rail shot, 58 u) gives Quiet Hour a ranged cloak unit and the cloak headline a second user. Concord keeps its range from the Dustpan and the Housekeeper's strike.
7. **Renamed for safety:** `eldertusk` is `elder_hummock` (tusks read as the Ancient war elephant); `maitre_prime` is `maitre_deluxe` ("Prime" is a franchise leader word); `hop_adept` is `hop_notary` ("Adept" is a franchise unit); the mission id `sf_hop_on_pop` is `sf_blink_jungle` (a children's-book title). `bubble_warden` and B's `shield_tender` merge into `bubble_tender`.
8. **Brood is once, not periodic.** A's "8 skitterlings every 12 s" and B's 75/50/25 percent thresholds are not in M0..M19 (Modern's sheet reached the same verdict on two-threshold summons). The existing `summon_on_death` already does "once, at under 50 percent hp or with three foes within 5 u, or on death"; mission scripts add pulses (M14 `spawn`).
9. **B's Overheat and the 1.2x break multiplier are out.** The break window (a visible `SHIELDDOWN` for 2.0 s: no regeneration, grey wireframe, "SHIELD DOWN" pip) is kept as the tell; a damage-taken multiplier stays a BALANCE knob defaulting to 1.0. Boss EMP is a stun cap (2.0-2.5 s), not a new status.
10. **Camera is unchanged.** B's pitch 0.70 and +8 percent FOV and A's pull-back are dropped (plan s6 gives the camera only `CameraRig.shot`; Ancient pixels stay identical, same call as Medieval and Modern).
11. **Engagement distance was pulled apart from Modern.** Median 15-19 u (A 18-26, B about 24 against Modern's 24-30), indirect share 6-10 percent (Modern 26-34), plus three Sci-Fi-only dimensions (section 11).
12. **Heli, tank and gun rigs are used sparingly** so the Modern pack keeps them: one `tank1` unit (the Refund Crawler), one `gun1` (Salvo Cart), one `car1` (Junk Buggy), no `heli1`. Sci-Fi's own rigs carry the era: hover1, drone1, insect1, quad1 alien, mech1, mech4, dragon1 (wyvern and manta).
13. **Mission 1 had to be playable at the end of P1** (plumbing slice: modules #1..#5 only). Both proposals' M1 needed car1 buggies and the shield module #17. The M1 enemy is now hum1-only and the `eshield` key is declared by M0 but inert until #17 lands, so the slice plays (arenas.md section 3 states the consequence for the teaching beats).
14. **Taken from B:** the Four Questions placement chips, the numeric counter matrix, scout codes, blind-bot expectations, the lull-between-two-waves M1 shape, the break-window tell, the hover-skimmer-over-the-shelled-bridge idea (now the causeway), the "Overheat kneel" as a set-piece shot for the Concierge's EMP stun, and B's weather/time of day rows.
15. **Taken from A:** all faction lore and silhouettes, the drive-in frame, the translator confidence gag, the ladder (one headline mechanic per non-finale mission), the set-piece list, the god-power set, the callback pairs, the arenas that carry personality (Spore Hollow, Sinkhole Nest, Spin Cycle Station).

## 3. Tempo targets (the "Pulse": fast, vertical, bubble-paced; fights are decided by who is rotating, who is inside the window and who is standing in the wrong layer)

| metric | target | notes |
|---|---|---|
| seconds to first contact | first damage **7-14 s** at default placement on medium and large (median 9-11), hard ceiling 20 s; small arenas 5-9 s (declared exception, the enemy `holds`) | zone gap edge to edge: small **40 u**, medium **56 u**, large **80 u** (zones 10 / 14 / 16 u wide, centres at +-25 / +-35 / +-48 u, all inside the 0.5 W bound). With rifles at 22 u and both sides at 3.0 u/s the walk is (gap - 22) / 6 = 3 / 5.7 / 9.7 s plus 2-3 s of squad formation. Snipers (rail 58 u) and the Salvo Cart (58 u, min 12) start >= 14 u behind their front edge so nothing starts in range (W11) |
| kills per minute (contact phase, both sides, per 100 starting units) | 50-65, and 1.2-1.5 x the Ancient value measured in P0 | between Medieval (32-42) and Modern (70-95); the shape is the fingerprint: **bursty**, >= 35 percent of kills land in the 3 s after three or more bubble breaks |
| battle length | median **70-105 s**, p90 <= 160 s; campaign missions 180-480 s with a beat or wave every 30-50 s | harness band is 60-120 s median (S12); regeneration must never push a mirror past it (risk 1 in rosters.md section 7) |
| median engagement distance (damage events) | **15-19 u**, >= 1.4 x the Ancient value measured in P0 (B's estimate for Ancient: 10-14 u) and <= 0.75 x Modern's lower bound (24 u) | ranges (u): melee 1.4-2.4; Warden dome fight 2-6; valet beam 20; rifle 22; rivet gun 24; thorn dart 24; acid glob 26; serving laser 26; Dustpan lobber 28; Refund Crawler 30; Concierge mortar 38; manta bomb 12; Signer rail 58; Salvo Cart 58 (min 12); Deep Clean 40. A quarter of all damage is contact range on purpose (swarm, wrench, greeter, beetle, cutter, bike) so the median does not climb to Modern's |
| share of damage by range class (shields count as damage dealt) | contact (<= 4 u) **22-28 %**; short (4-20 u) **29-35 %**; long (20-45 u) **23-29 %**; very long (> 45 u: rail, salvo, orbital) **3-5 %**; indirect and area (lobber, salvo, mortar, orbital, craters, explosive props) **6-10 %**; dots and hazards (acid, poison, gas, geysers, lava) **4-7 %** | ranged share (everything but contact) **72-78 %** (Ancient about 35 %, Modern >= 85 %); **indirect 6-10 % against Modern's 26-34 %** is the second separator after shield events |
| shield economy | **>= 40 shield events (breaks plus completed recharges) per 100 s at 300 units**; shields absorb **28-38 %** of all damage in mixed Quick battles; 12 of 34 roster units carry an `eshield` | no other era has a shield event at all; this is the first ER27 dimension and the reason Sci-Fi cannot be confused with a laser-skinned Ancient |
| speed distribution | **bimodal with a fast tail**: infantry 2.4-3.6 (median 3.0); mechs, siege and crawlers 1.4-2.4; hover, bikes, buggies, drones 4.0-6.0; air 4.2-5.5; blink hops 12 u in 0.15 s | Ancient 2.4-3.6 with a cavalry tail; Modern trimodal 1.2 / 2.4-3.6 / 4.4-6.5 |
| vertical spread | ground 0-3 u, hover pads and drones 2-3 u, **air layer 3-8 u**, bosses to 8.9 u, gravity x0.4 (Dome Sweet Dome) and x0.6 (Spin Cycle Station); buildings at map edges <= 12 u | **>= 18 percent of unit-seconds off the ground layer** in mixed Quick armies (Modern about 8 percent, Ancient 0) |

The Ancient feel is a fast javelin ballet, Medieval a slow moshpit with a flag on it, Modern a firefight with a clock in it; **Sci-Fi is a rhythm of state changes**: bubble up, bubble popped, bubble regrown, cloaked, revealed, machine on, machine off, here, there. A Sci-Fi recording that cannot be told from Ancient by shield events per minute fails ER27 and the roster is rewritten, never the metric.

## 4. Camera defaults

The default camera rig is **unchanged** (yaw -0.7, pitch 0.65, `worldSize x 0.55` framing; Ancient pixels stay bit-identical, G8). What changes is what the camera is aimed at: the bubble (a 2.6 u dome over every shielded unit), the pop ring and the hover pads all read from the default distance; air units sit at 3-8 u with a shadow blob that shrinks and fades with altitude (R4) so nothing pops off-frame (`meta.bounds` cull, R11); towers stand on map edges (W8) so no building hides the fight. Era shot vocabulary for `CameraRig.shot` (real time, sim at 0.5x, Esc or click skips, Reduce Motion = cut, 3-6 s, never over the first volley): **crane** (outside to inside, pull-back to wide), **low orbit** (round a dome or a mech), **boots-to-face** (a stride from the ankle up the legs), **look-up-from-the-pit** (a shadow crossing the lens), **top-down drop** (y 60, orbital strike), **chase** (behind a hover van or tank), **tracking** (alongside a hover tank over lava), **push-in** (a frozen greeter mid-bow). The orbital strike and EMP flashes obey the R16 flash limiter.

## 5. Signature mechanic and its on-screen tell: THE BUBBLE CYCLE (regenerating shield, M4)

Twelve of the 34 units carry an `eshield {cap, delay, regen}`. Damage drains the bubble before hp (not damage-over-time: acid, poison, gas and lava bypass it); any hit resets a `delay` of 3.0-6.0 s; after the delay the bubble regrows at 9-40 points per second; **hit points never come back without a medic, bubbles always do**. When a bubble breaks the unit enters `SHIELDDOWN` for 2.0 s (regeneration blocked, the delay doubles), the **break window**. So the central decision is who stands in front, who rotates out to recharge, and who wastes the window.

**The tell, readable from 60 u in a 600-unit battle** (R3 ShieldLayer: near dome <= 64 instances, far from `aFx2`, an instanced layer and never unit geometry):

1. a **hex-ripple dome** hugs every shielded unit in the team tint (thin film at 100 percent, cracked amber hexes below 25 percent, a ripple at each impact);
2. on break a bright **pop ring** expands, three hex shards fall, the dome flashes to a grey wireframe for the 2.0 s window and a "SHIELD DOWN" pip sits over the head;
3. while it regrows a **clockwise sweep ring** runs along the base and a soft rising tick sounds; when full the dome fades back in with a small "ting";
4. the selection card shows a **segmented shield arc above the hp bar** (four arcs) and ammo pips under shooters;
5. the whole battlefield pulses with it, so army health is readable at a glance (cyan above 50 percent, amber below 30 percent).

**Secondary tells**, one per mechanic, each with a sound and each shown before it is explained (CU5): cloak = dithered shimmer plus a team-tint rim (friend and foe stay readable; the violet is decoration), every detector draws a faint scan ring every 4 s; EMP = blue arcs crawling over machines, a power-down droop and a "please hold" bubble; blink = a ring at both ends 0.3 s before and an afterimage streak; hover = four glow pads, a soft underglow disc and a bob; orbital strike = a rotating red ring with a descending pencil beam for 2.0 s; air = a shadow blob far below; mech step = ground-ring shake with a 1 percent camera nudge; poison = green ticks that ignore the bubble.

**The Four Questions** (placement-panel chips, from B, CU14): *what soaks, what cracks, what reaches, what answers.* Soak = bubbles and plates (Warden, Tender, Beetle, Crawler, Stomper, Greeter); Crack = rail, salvo, orbital, poison (Signer, Housekeeper, Salvo Cart, Spitter, Thorn Slinger); Reach = hover, blink, air, bikes (Dustpan, Bike, Notary, Glidewing, Buggy, Runner); Answer = detector, EMP, anti-air, splash (Medic and Valet and Grazer, Tinker, any rifle, Lobber and Salvo). A chip is grey when the army has no unit of that kind. They double as the scout-report vocabulary (rosters.md section 4).

**Why it cannot stall (risk 1, rosters.md section 7):** delay 3.0 s (4-6 s on bosses and beetles), regen 9/s on 40-90 pools, shield pool <= 45 percent of effective hp, poison and acid bypass, chip fire denies regeneration, the M4 watchdog is progress-based (`lastProgressT`, damage to hp **or** shield counts), and `sf_warranty_void` removes regeneration for the hard mode.

## 6. Sound palette: glassy, humming, squelchy

Shields are **glassy** (bloop-tink per hit with the pitch falling as the bubble empties, a shatter on break, a rising tick while it recharges); machines and hover are **humming** (turbine whine over a sub, servo, the "pdddt" of a power-down); goo, acid and spores are **squelchy** (wet clicks, a happy "splorp", a chitter chorus). Mechs and the orbital strike add a fourth colour, a heavy **thump**, but never a boom. Sci-Fi guns are chunky toy-box "pew" with a body thump, 0.15-0.30 s, never a real gunshot. Forbidden timbres: orchestral trailer brass, real gunshot recordings, any swung-blade hum (no humming swords), real sirens. Hot families (full list with sources and licences is AU's, part 2): `pulse_burst`, `rivet_chatter`, `rail_crack`, `plasma_lob`, `shield_hit`, `shield_pop` plus `shield_recharge`, `emp_burst` plus `robot_powerdown`, `cloak_shimmer`, `blink_pop`, `hover_hum` (an aggregate bed, never per unit), `mech_step`, `orbital_strike`, `alien_goo`. Music: synth and groove, never orchestra (menu "Drive-In Overture", three battle tiers, victory "Credits Roll", defeat "Power Down", map bed "Star Chart Lounge"; part 2 holds the slot table).

## 7. Silhouette language

Each faction has one adjective that survives a 40 px greyscale thumbnail (factions.md has the table): **Tidy Concord ROUND** (fishbowl helmets, domes, soap-bubble hulls, a rod with a dish), **Rummage Armada LOPSIDED** (one oversized shoulder, exhaust stacks, mismatched panels, a cart of rocket tubes), **Courtesy Systems BOXY** (stacked boxes, one lens or TV face, bellhop caps, trays), **Skitter Hive LOW AND MANY-LEGGED** (a boiling carpet, beetle domes, a bloated sac, a wyvern, one vast queen), **Glowmoss Reach HILLS WITH LAMPS** (huge round fluff and a gold lamp on a stalk above it), **Quiet Hour THIN VERTICAL SLIVERS** (a black sliver with one rim line, a blade-thin bike, a manta that is mostly shadow). Rules from the plan apply: every unit carries a team-tint zone of >= 15 percent (non-hum1) or >= 30 percent (hum1) of the model as a glow strip, panel or lamp ring; the faction base colour never replaces it; the defining feature of each model survives `downsample2` (>= 2x2 cross-sections, wings >= 2 voxels thick); no letters or numbers on any model; 19 of 34 units are non-hum1 rigs and the five insect1 builders are five different outlines (ER3's silhouette hash must see it).

## 8. Humour engines (three; Ancient's bureaucratic understatement survives only as Plato's colour)

**E1 Deadpan Technobabble With Numbers** (units, Codex, Plato, Cassandra, tips, the alien translator): precise, specific, linked to a mechanic, delivered flat; every joke names a number, a tell or a rule. Examples: Codex, `tidy_trooper`: "Shield: 40 points. Regrows after three seconds of not being rude to it." / Plato at a pop: "A shield is a promise made of light. This one has just been broken, and it regrows in three seconds, unlike most promises." / the translator subtitle: "[Translator: 'We come in peace.' Confidence: 11 percent. Alternate reading: 'We come in pieces.']".

**E2 Drive-In Trailer Voice** (Brutus, mission posters, loading lines, genre bingo from B): trailer hyperbole applied to trivial stakes, one ALL-CAPS word per Brutus line, every cliche named the moment it happens. Examples: "IN A GALAXY FAR FROM THE SNACK BAR, two armies fight over a parking space on the Moon! RATED G, FOR GLOWING!" / poster tagline, M1: "HE CAME FOR THE MOON. HE STAYED FOR THE LEASE." / Cassandra: "In the original script, the quiet one lives. This is not the original script."

**E3 Cheerful Menace** (machines, results screens, UI errors, over-helpful prompts that narrate themselves): customer-service positivity applied to destruction, never to pain; devices read their own status out loud and take instructions personally. Examples: greeter taunt "Welcome! Please remain calm and within range." / refund crawler death "Your return has been accepted. Please rate your explosion." / shield bark "Shield at twelve percent. Please enjoy the remaining twelve percent." / defeat screen in the Courtesy voice "Thank you for your defeat. Your satisfaction is important to us. Please take a survey. The survey is another battle."

Every unit has a mechanic joke (rosters.md column "joke engine" and section 5 of units text in part 2). Targets: situations, hubris, equipment, paperwork and the three commentators, never people; deaths are comic (knocked out, powered down, splorp), no pleading, no pain, no family. The **intern** is offstage: named only in arrival cards, god-power tooltips and chooser captions (D22). The time-travel arc, the arrival card, the finale payoff on an era-independent surface and the callback ledger belong to part 2; the eight A callbacks and B's gated ones are the seed set (every source id must resolve against code that exists: `unit:peltast` and `unit:philosopher` do, `ach:zeus_left` and `stat:zeusRagequits` must be checked by COMEDY-EDITOR).

**Violence tone (CU4 gore `auto`):** organic non-alien units (Concord, Rummage, Quiet Hour humans) are **knocked out**: a tidy flop, circling stars, "I'm fine, just horizontal", fade after 6 s; machines spark, smoke and puff oil, mechs topple with a bell or a clang; aliens splat lime goo with a happy "splorp". No wound, no blood, no plea. B's stretcher drone that carries the body off is optional garnish (first thing cut under render pressure).

## 9. HUD chrome tokens (`[data-era=scifi]`)

| token | value | use |
|---|---|---|
| accent | **`#35e0ff`** ion cyan | primary buttons, focus ring, progress, bubble ripple in the HUD key |
| secondary | `#ff3da5` neon pink | secondary actions, kill-feed highlights, Quiet Hour/Courtesy chips |
| warning / alarm | `#ffb02e` amber / `#ff3d5a` | low bubble, cooldown ending, defeat stamp |
| panel | `#0e1424` on `#141b33` at 82 percent | dark-glass panels with a soft projector-cone vignette on the HUD frame |
| text | `#e8f6ff` primary, `#9fb4d0` dim | tabular numerals for ergs, mono-caps labels |
| frame ornament | **chamfered 8 px corners, 1 px neon inner rim, hex-notch corner brackets**, a faint hex-grid backdrop | every panel; the corner notch doubles as the focus bracket |
| button sound | glassy "bwip" blip on press, a soft "tick" on hover, a rising two-note "ting" on confirm (Kenney interface/sci-fi packs, CC0, plus synth fallback) | UI cue family `ui_*` |
| fonts | **Bungee** headings with wide tracking (`letter-spacing .08em`), **Rubik 500** body, tabular numerals; no new font (Google Fonts only) | Reduce Motion replaces the scan-sweep progress with static ticks |
| map | a **star chart projected on a drive-in screen**: cardboard-cutout planets and stations as pins, dashed hyperlanes, a tiny car silhouette (no brand); three nebula clouds for the acts | `ERA_MAPS` |
| briefing / results | briefing = B-movie poster (tagline in Bungee, three commentator bubbles as the cast list); results = film-credits roll with rating stamps ("Rated G for Glowing") | CU6 |
| transition | 1.2 s warp tunnel (the time portal in Sci-Fi dress); chooser caption names the intern | CU6 |
| selection card | shield arc above the hp bar, ammo pips, status icons (SHIELD DOWN, EMP, CLOAK, BLINK ready), world-label tags | CU13 |
| difficulty names | Cadet / Operative / Director (via `getTB`) | CU15 |

Collision check (CIEDE2000, script `pal.mjs`): cyan `#35e0ff` is at least 29.0 from every existing chrome token (nearest: Modern's `#12a37f`; the Ancient navy, night, gold, olive and lapis tokens and the Medieval rust, wax and gilt are further) and 10.7 from the Modern sky `#98d8ff` primary (a faction chip, not chrome); pink `#ff3da5` is 33.8 from Medieval wax. Amber `#ffb02e` sits 8.7 from the Ancient gold chrome, which is acceptable because it is a warning colour inside Sci-Fi screens and the era accent is cyan.

## 10. What this era must NEVER feel like

1. **Ancient with beams.** If the default view is two blobs shoving, the bubble has failed: a battle without shield events is a bug (ER27).
2. **Grim, gritty, militaristic.** No grey corridors, no camo, no "mission failed" gravitas; the lighting is a toy shop at night and the violence is sparks and goo.
3. **A pastiche of anything.** No chin-guard troopers, no chest-bursting, no humming swords, no long-necked quad walkers, no cargo-lift exoskeleton, no lantern rings, no masked chosen ones, no "droid", "marine", "xeno", "walker" in any visible string.
4. **A cover shooter.** That is Modern: Sci-Fi has no pins, no mines, no low cover and no cover-seeking AI; cover is a wall that stops a beam.
5. **A spreadsheet.** Every number has a tell you can see: a bubble, a rim, a ring, a glow, a sweep.
6. **Laser tag in the dark.** Glow never replaces silhouette; every faction reads in greyscale first.
7. **Hit-point inflation.** Bubbles add rhythm, not sponge: effective hp per erg of an ordinary unit stays within 1.3 x of an Ancient unit of equal cost (rosters.md section 3).

## 11. ER27 fingerprint: how Sci-Fi differs from the other three (the minimum pairwise distance is measured, never tuned)

| dimension | Ancient | Medieval (its sheet) | Modern (its sheet) | **Sci-Fi** |
|---|---|---|---|---|
| first damage | about 15-25 s (B's estimate, P0 measures) | 6-10 s (melee contact 12-20 s) | 6-12 s | **7-14 s** |
| kills per minute per 100 units | baseline | <= 0.85 x | >= 1.8 x | **1.2-1.5 x, bursty** |
| median engagement | about 10-14 u | 3.5-5.5 u | 24-30 u | **15-19 u** |
| ranged share | about 35 % | about 36-42 % | >= 85 % | **72-78 %** |
| indirect and area share | small | 8-12 % | 26-34 % | **6-10 %** |
| shield events / 100 s at 300 units | 0 | 0 | 0 | **>= 40** |
| speed distribution | 2.4-3.6 plus tail | narrow bimodal 1.9-3.5 | trimodal 1.2 / 2.4-3.6 / 4.4-6.5 | **bimodal plus fast tail 1.4-2.4 / 2.4-3.6 / 4.0-6.0** |
| vertical spread | 0-2 u | 0-9 u (walls, one dragon) | 0-3 plus air 3-9 | **ground 0-3, off-ground unit-seconds >= 18 %** |
| in-cover share | 0 | 0 | >= 40 % | **0** |

Sci-Fi vs Modern is the stress case (Modern's sheet names it too): five lines separate them (median engagement, indirect share, shield events, off-ground unit-seconds, cover occupancy). Fail = rewrite the feel sheet or the roster, never the metric.

## 12. Decisions handed to part 2 (so the text layers do not contradict the roster)

- **God powers** (stable slots, A's set, B's cooldown classes): 1 quick strike `sf_arc_tickle` (chain to 4, energy, 6 s); 2 big strike `sf_orbital_clean` "Orbital Deep Clean" (2.0 s red ring, crater, 20 s); 3 area control `sf_gravity_burp` (r14, 5 s stagger, props damaged, 30 s); 4 heal and repair `sf_nano_spritz` (organics healed, machines repaired, shields refilled in r12, 25 s); 5 status `sf_off_switch` (8 s field, machines stunned in pulses, shields dropped, 30 s); 6 summon `sf_grazer_drop` (six `glow_grazer` in pods, 15-18 s). Mascot unit for the era kit and the stalemate gift: `glow_grazer`; stalemate intervention kind `button` (an orbital ping on both armies, then a gift-wrapped pod delivers one grazer), attributed to "the sky", never to the intern.
- **Mutators:** `sf_warranty_void` (no shield regeneration for anyone, damage +10 percent; disabled in M1 and puzzle 1 because they teach regeneration) and `sf_overcharge` (B: shield caps x1.6, delay x0.6, every break emits a friend-or-foe shock ring r3, one chain per tick). A's `sf_static_cling` and B's `sf_blackout` stay as reserve. The shared `moon_gravity` is renamed "Low Gravity Fiesta" on Sci-Fi strings.
- **Achievements, loading lines, tips, wave names, survival names:** A's lists and B's lists are both usable; the 12 achievements must cover bubbles, EMP, cloak, hover, blink, orbital, a mech topple, the mascot, a hidden one, tourist, campaign and 27 stars.
- **Scout codes (CU14):** `all_shield`, `chip_heavy`, `no_detector`, `no_answer_air`, `machine_heavy`, `swarm_clump`, `dot_heavy`, `artillery_line`, `single_boss` (B), each with a counter hint; lesson detectors use the same codes.
- **Currency and names:** ergs; Cadet / Operative / Director; arrival card heading "THE FUTURE" in Brutus's voice; chooser caption names the intern.

## 13. Checks run for this deliverable

34 ids vs the 43 `STAT_TABLE` ids and vs the Medieval and Modern rosters (no collision, output quoted in rosters.md section 2); CIEDE2000 of the six primaries and the chrome accent against the seven Ancient, six Medieval and six Modern primaries (numbers in factions.md); effective-hp-per-erg audit for all 34 units (rosters.md section 3); mission cost audit (rosters.md section 8, used by arenas.md section 3). The scripts that produced these numbers ran in the session scratchpad and are not committed; the outputs are quoted, so a reviewer can re-derive them from the tables. Code facts relied on and re-read: `summon_on_death` params (`count spawn hpFrac onContact`, once), `dash` goat-charge kind (8 u, damage x2, cd 7, data-only reuse for the Runner's lunge), `cc_field` effect table (`confuse` reused for "Please wait"), `SE.TAUNT` exists, `heal_pulse` and `aura` effect lists, zone and size constants in `world/arena.js`, the hum1 grid table and the 48-part cap. Not verifiable here and said plainly: every number in this folder is design intent for BALANCE and ER7; the feel, the comedy and the readability were judged by reasoning, not by a person or a panel; the CIEDE2000 fallback for Concord's azure (`#1288da`, 16.8 from the Hellenes blue against a benchmark of 17) is stated in factions.md.

## 14. Open questions for COORD and the next phase (none blocks the design; each has a stated fallback)

1. **EMP lands last (#19 = E-FREEZE).** Mission 5 teaches EMP and so has zero module margin against the plan's "requiresModules landed >= 1 week-equivalent before E-FREEZE" rule; tuning is P3 either way. COORD may waive the margin for M5 or reorder #18/#19 only if EMP can land before cloak (cloak does not need EMP).
2. **Liquid tint through `THEME_LOOK` (R7).** The acid river, coolant, bile, void and rift are one water plane each; if R7 cannot tint the plane, the arenas keep their mechanics and lose their colour (arenas.md section 1).
3. **Concord azure is 16.8 from the Hellenes blue against a benchmark of 17.** If spec/VB fixes the threshold above 16.8 the fallback is ivory-primary (factions.md).
4. **mech4 (quad rigid-leg) hangs on the P0 gait spike.** Fallback: Rustbucket Rex becomes a tank1 variant (rosters.md section 5); nothing else changes.
5. **Footprint and bounds.** Rex, Concierge, Hummock and Manta exceed the old footprint test (x < 6 u) and need `meta.bounds` (R11) plus the same exemption as the Medieval dragon.
6. **M14 trigger vocabulary.** The Egg Cluster hatch and the Hummock wake need a prop-destroyed trigger and a Heart-under-50-percent trigger for script `spawn`; fallbacks are timer-based spawns.
7. **Hover-layer targeting (F17).** Drones, bikes and hover tanks must be attackable by melee and ground shooters; only the air layer is excluded from melee targeting.
8. **Unit-ability numbers that exceed the existing module params** are listed as F1-F18 in rosters.md section 6 with fallbacks; SIM reviews them before E-FREEZE.
