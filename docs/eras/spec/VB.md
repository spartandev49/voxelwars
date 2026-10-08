# spec/VB: the visual bible of the "three new eras" program (DESIGN-ERA, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (0.6 "fictional, toy-box, kind", 5 far-mesh and tint, 9 ER3 / ER3b / ER17 / ER21, 14 row `spec/VB`), `traceability.md` row 2.6, `q1_content.md` Q23, `q2_product.md` Q21, `q3_product.md` residuals 20 and 30, `q3_program.md` residuals 7 and 28, the three `design/<era>/{factions,visual_bible,feel_sheet,ui_chrome}.md`, the final specs `RA` (3.10 `THEME_LOOK`, 3.14 hooks, 3.17 look-dev), `W` (3.4.2 materials), `UC` (UC-D07 tint floors), `VF` (3.16 readability, 3.23.3 `vbscan`) and `CU` (3.6.7 chrome tokens). Written in parallel by others, interface fixed here: `MS`, `S-slice` (their `vbscan --era` calls are answered by 3.12).

Everything numeric in this file is produced by `node tools/vb_distance.mjs report` from `docs/eras/spec/vb_data.json` plus the Ancient sources in `src/`; the tool is part of this deliverable and re-derives every table (commands in section 4). Where the three bibles and the measurement disagree, the measurement wins and the difference is an amendment (VB-A1..A6, section 2) or a plan correction (section 6). Paths are repo-relative. Tier letters follow AR: **F** = T-fast, **E** = T-era, **R** = release-only.

## 1. Purpose and scope

**This file binds** (UNITS-x, PROPS-x, RENDER, UI, TOOLS-VERIFY, REVIEWER build and judge from it): (a) the colour metric, the CVD simulation and the lighting pre-pass (3.1); (b) the schema of `vb_data.json`, the single data file `tools/vbscan.mjs` consumes (3.2); (c) the palette separation tests with their fixed thresholds and the evidence behind them: faction primaries inside an era, against Ancient and against the other eras, the pair/accent test, the body-colour test, the lighting sensitivity (3.3); (d) the answers to every open colour question of the three bibles (3.4); (e) the per-era palette tables (3.5); (f) the banned reference palette as data, its semantics (BLOCK / RESTRICT / CLEAR), the plain-uniform singles and the audit of the Ancient sources against it (3.6); (g) the emblem registry, signing rule, the rasterised shape / symmetry check, 18 emblem rows and the registered patterns (3.7); (h) team tint, glow trim and colour-vision separation, the per-era readability constraints (3.8); (i) the model rules, which are mechanical and which are judged, with the flag-size face algorithm and its fixtures (3.9); (j) arena palettes per time of day (3.10); (k) chrome tokens and fonts (3.11); (l) the `tools/vbscan.mjs` specification (3.12); (m) the reviewer rubric, three named reject examples per era and the planted-reject calibration (3.13); (n) the file and ownership list (3.14).

**Not in scope:** sound, text and name sweeps (`REAL_WORLD`, spec/H and VF ER11 own them; this file only fixes that nothing in `src/` carries a real organisation's name), far-mesh geometry rules (spec/RA `farLint`), tint floors themselves (spec/UC UC-D07; 3.8 only adds the colour side), balance, mission content. Chrome layout is spec/CU; 3.11 fixes only its colour distances and fonts.

**Ancient policy (plan 0.1).** Nothing Ancient changes. The Ancient colours are MEASURED by the same tool (3.3, 3.6, 3.7, 3.8), the numbers are recorded once in `tests/baseline/vb_ancient.json` (two signatures, author cannot sign) and `vbscan` fails an Ancient value only if it is worse than that baseline. The Ancient has findings today (its palettes sit 7.1 to 7.8 from real flag colour sets; two faction pairs are 8.3 and 9.3 apart; one emblem would fail the new star rule): they are pinned, not fixed (open item OI-7 names who may decide to change them).

## 2. Decisions

| id | decision | evidence / reason | section |
|---|---|---|---|
| VB-D01 | One metric: CIEDE2000 (kL = kC = kH = 1) on Lab from 8-bit sRGB via linear sRGB, XYZ D65. Validated against the 34 published Sharma, Wu, Dalal pairs (max error 4.95e-5, the published values carry 4 decimals). | the three design agents' independent scripts reproduce to one decimal | 3.1 |
| VB-D02 | One data file: `docs/eras/spec/vb_data.json`. `tests/fixtures/vb_banned.json` and `emblems_allow.json` (named in VF 3.23.3) are GENERATED from it by `vbscan --emit-fixtures`, never edited. | one source of truth; two hand files drift | 3.2 |
| VB-D03 | Faction display primaries: inside an era >= **20.0**; against Ancient and against another new era >= **16.5**. | Ancient shipped: 9.3 (one outlier), then 16.8, then 21.1; new eras measure 22.6 / 24.9 / 28.9 in-era and 16.8 cross-era; 16.5 is "no worse than the second-weakest shipped Ancient pair" (the 17 benchmark the three bibles used is that pair, 16.8, rounded; the bibles do not say where 17 came from, so this file derives it instead of inheriting it) | 3.3.2 |
| VB-D04 | Accent / pair test: a primary pair under its bar passes only by the cross-era accent escape (primary >= 12.0 and role-fixed accent distance >= 25.0); inside an era there is no escape. Each faction's own primary / accent contrast >= 12.0. No new pair needs the escape today. | accents are small area; the bibles' pair claims are re-measured | 3.3.4 |
| VB-D05 | Body-colour test: the colour that covers the unit (`body` role) in-era >= **8.0** (Ancient unit paint shipped 8.3) and >= **4.5** in every CVD view (Ancient shipped 5.0); a pair under 20 needs a body clause (L* gap >= 20 or edge colours >= 20 apart). | Sci-Fi Skitter plum and Quiet Hour ink are 8.5 apart; Ancient Hellene / Roman unit paint 8.3 | 3.3.5 |
| VB-D06 | Lighting sensitivity pre-pass: in-era primary pairs, graded by the era's own `THEME_LOOK` rows, stay >= **12.0**. | worst graded 13.4 (Medieval, castle dusk) against 22.6 nominal; ratio 0.59 | 3.3.3 |
| VB-D07 | Banned reference semantics: statistic = max-element dE00 of the best assignment of the reference tuple onto the palette set; **BLOCK < 8.0** (any layout), **RESTRICT 8.0 to 20.0** (no stripe, split, check or lozenge; a charge on a plain field is held to BLOCK only), **CLEAR >= 20.0**. Replaces the mean-12 rule of VF 3.23.3 (PC-1) and the "within 20 and layout" sentence of the three bibles (VB-A4). | mean-12 fails 15 rows over 7 of the 18 new factions the bibles accepted; max-element is the number the bibles measured | 3.6 |
| VB-D08 | Plain uniform singles (olive drab, khaki, coyote, field grey, army green, desert tan): faction primary **BLOCK < 10.0**, RESTRICT < 20.0 (cap on pixel share). Applies to all three new eras. | one design colour (Mostly Paid Company tobacco) was 5.7 from coyote brown: amended VB-A1 | 3.6.3 |
| VB-D09 | The reference list is data: 44 tuples in 5 classes, every colour verified against a cited public page or file (retrieved 2026-10-08) or marked `bible` where the only source is a design document; extended by signed append only. | no guessing | 3.6.1 |
| VB-D10 | Emblems enter ONLY as registry rows `{id, rows, hash, signatures}`; a row is allowed when the bitmap passes the check AND two signatures exist (author, REVIEWER; the author cannot be the reviewer). A changed bitmap is a new row; the old row is tombstoned. 18 rows proposed (6 per era), author-signed, reviewer countersign pending (OI-1). | plan 0.6 | 3.7 |
| VB-D11 | Shape rules are mechanical: rasterised templates (cross, saltire, star, crescent, hooked, rank chevrons), a thin-bar cross rule, a pinwheel rule (4-fold rotation without mirror symmetry), a stripe rule, a 5 x 7 letter / digit font match; every rule is evaluated on all 8 dihedral variants. | 18 of 18 constructed negatives caught; 2 hand-drawn irregular shapes are known gaps held by the reviewer | 3.7.3 |
| VB-D12 | Models carry markings only through registry emblems and registered patterns, declared in `meta.vb`; any undeclared connected region of 4 to 64 voxels on a face is a free decal and fails. | q3_product residual 20 | 3.9.2 |
| VB-D13 | Flag-role surfaces (cloth, banner, tabard, caparison, shield face, pavise, hoarding) are checked by `faceVerdict`; hull and body faces are not flag surfaces. | the Directorate paperclip and the Marrowby banner stool are accepted by the same rule that rejects the Crusader cross | 3.9.3 |
| VB-D14 | Team readability: carrier pair >= 15.0 under all four views (min 26.9, passes); carrier-vs-body cells fail when dE00 < 12.0 and the absolute dL* is < 20.0; failing cells oblige the faction's `tint.edge` rule (1-voxel ink edge, dL* >= 35 on >= 60 percent of the carrier perimeter). Failure rate per era (Medieval 9.7, Modern 4.2, Sci-Fi 19.4 percent) is at or under Ancient's shipped 25.0. | Ancient calibrates the bar | 3.8 |
| VB-D15 | ER17 `dE_team` is taken on CARRIER pixels (each unit is rendered once as team 0 and once as team 1 in the same pose; the carrier mask is where the two copies differ), threshold 15 in every CVD view; the whole-unit number is reported and ratcheted (it is 6.1 for Ancient at 15 percent tint share, so 15 is unreachable on it). | PC-2 | 3.8.4 |
| VB-D16 | Arena palettes are tested per time of day with the same bands on three-material triples; a flagged triple additionally needs the layout test on the material grid; a short blocked-triple list goes to W. | q3_program residual 28 | 3.10 |
| VB-D17 | Chrome: each era `accent` token >= 15.0 from the other era accents and every Ancient token; only Bungee, Rubik, Cinzel (q3_product residual 30). | measured 22.3 minimum | 3.11 |
| VB-D18 | Agent-judged residue is named: resemblance of silhouettes to real uniforms or franchises, "funny without a caption", knock-out kindness. A fresh agent, 12 units per era seeded plus heroes and bosses plus 3 planted rejects per era; a miss of any planted reject voids the panel. | q3_product residual 20 | 3.13 |
| VB-A1 | **Amendment.** Mostly Paid Company primary `#7d5434` -> `#72421d` (design value 5.7 from coyote brown; amended 11.0; in-era minimum 21.6 -> 22.6; nearest Ancient 20.0 -> 19.8). | 3.4 Q-tobacco | 3.4 |
| VB-A2 | **Amendment.** Caution emblem: stacked upward chevrons -> one upward chevron over a tape-end block (`mod_chevron`). Two or more chevrons stacked on one axis read as rank stripes. | rank templates; 3.7.3 | 3.7 |
| VB-A3 | **Amendment.** Marrowby caparison lattice orange + cream -> orange + umber (registered pattern `med_lozenge`); cream is a plain field, glyph, 1-voxel piping or plume. | orange + cream is 14.5 from red/white sub-pairs | 3.4 |
| VB-A4 | **Amendment.** Section 2 of the three bibles: the banned-reference sentence is replaced by VB-D07 and VB-D08. | consistency | 3.6 |
| VB-A5 | **Amendment.** Sci-Fi bible near-miss table: Glowmoss jade + amber is 11.8 from the orange-green sub-pair (the bible measured the full triple, 18.9); jade and amber never form a stripe, split or check. | 3.6.2 | 3.6 |
| VB-A6 | **Amendment.** VF 3.23.3 / 3.16.1 metric text: see PC-1, PC-2. | section 6 | 6 |

## 3. Detailed specification

### 3.1 Measurement

**Colour.** `tools/vb_distance.mjs` exports `hexToLab`, `ciede2000`, `dE`. Lab path: 8-bit sRGB -> linear -> XYZ (D65, matrix 0.4124564 / 0.3575761 / 0.1804375 ...) -> Lab with white (0.95047, 1, 1.08883) and the CIE epsilon 216/24389, kappa 24389/27. CIEDE2000 is the Sharma, Wu, Dalal (2005) formulation including the hue-rotation term, kL = kC = kH = 1. `node tools/vb_distance.mjs selftest` checks it against the 34 published pairs (`ciede2000testdata.txt`, fetched 2026-10-08 from the authors' page; embedded in the tool; max abs error 4.95e-5, limit 6e-5) and the Lab of white and pure red. Cross-check against the design agents' independent scripts: of the 42 primary-to-primary distances printed in the three `factions.md` tables (nearest Ancient, nearest other era, nearest in-era), 38 reproduce to the printed decimal and 4 move only because of amendment VB-A1 (the Mostly Paid Company primary: Marrowby 21.6 -> 24.7, Mostly Paid 20.0 / 21.6 -> 19.8 / 22.6, Wyrmkin 23.9 -> 22.6). Near-miss numbers measured against a different variant of a reference differ by up to 1.2 (Skyclub 12.3 against the bible, 11.8 here; Caution 10.8 and 11.2) and are marked in 3.6.2.

**Colour-vision deficiency.** Machado, Oliveira, Fernandes (2009), severity 1.0, applied in LINEAR sRGB, clamped to 0..1, back to sRGB (`cvdRgb`, `cvdLab`, `dECvd`); matrices (protan `0.152286 1.052583 -0.204868 / 0.114503 0.786281 0.099216 / -0.003882 -0.048116 1.051998`, deutan, tritan) are in the tool and were compared digit for digit with the table in the `daltonlens` 0.1.5 wheel (PyPI, MIT; its `simulate.py` tabulates the authors' page, retrieved 2026-10-08). The authors' own page could not be fetched from this host (connection reset); the digit-for-digit comparison against the published wheel is the evidence. Invariants are in the selftest (rows sum to 1, mid grey stays grey, protan red is darker).

**Set matching.** `setVsRef(set, ref)` assigns the reference tuple (1 to 3 colours) onto distinct elements of the palette set in the best way (subset and order free) and returns `max` (the "max element dE00" every bible quotes), `mean` and the assignment. A set approaches a reference only if EVERY reference element has a close partner. `expandRefs` adds the three sub-pairs of every triple (`/ab`, `/ac`, `/bc`) because a two-colour layout can show only two colours of a tricolour.

**Lighting model (pre-pass only).** `gradeLab(hex, look)`: light = 0.6 sun + 0.4 hemisphere (sun colour x multiplier, hemisphere multiplier), exposure, saturation about luma, contrast about mid grey. It takes the rows of spec/RA 3.10 (`vb_data.looks`, 22 rows) and the four times of day (`vb_data.times`: dawn, noon, dusk, night, derived from the `med_castle` dusk and `sf_neon_night` rows). It is a sensitivity analysis; ER17 on rendered frames stays the arbiter (VF 3.16).

### 3.2 `vb_data.json`

| key | content | consumer |
|---|---|---|
| `metric`, `thresholds` | every number of this file, grouped (`primary`, `accent`, `body`, `graded`, `banned`, `team`, `emblem`, `model`, `arena`, `chrome`) | all tools |
| `team` | the three `TEAM_PALETTES` of `src/render/style.js`, scopes per palette, carrier base colour, tint share floors of UC-D07 | `sectionTeam`, `vbscan` lineup |
| `looks`, `times` | 22 `THEME_LOOK` rows reduced to the grade model inputs plus the sky pair (zenith, horizon); four times of day | graded, arena and looks stages |
| `eras.<era>.factions.<id>` | `name`, `primary`, `accent`, `trim`, `metal[]`, `glass[]`, `glow[]`, `body` role, `emblem` id, `silhouette` adjective, `tint {carriers[], kind, edge, failing_cells}`, `patterns[]`, `forbidden[]` (the bibles' text), `adjacency_bans[]` (machine form), `caps`, and for four Sci-Fi factions `edge` + `body_clause` | palette, model, lineup stages |
| `eras.<era>.neutrals` | the shared neutral colours of the era (allowed as `cloth` and in props) | palette membership |
| `banned.refs[]` | 44 tuples: `id`, `class`, `colours[]`, `src`, `why`; `banned.uniform_eras` | banned scan |
| `templates[]`, `glyphs` | banned shape rasters with `window` and `whole` limits; the 5 x 7 font for 0-9 A-Z (Adafruit-GFX `glcdfont.c`, BSD-3, retrieved 2026-10-08, test data only) | emblem and face checks |
| `emblems[]` | the registry rows (3.7) | emblem stage, fixture emission |
| `patterns[]` | the registered pattern tiles (3.7.5) | face verdict |
| `fixtures` | `emblem_negatives` (18), `emblem_known_gaps` (2), `layouts` (14), `markings` (7), `reject` (12), `accept` (6) | selftest, negative controls |
| `chrome` | era chrome tokens (from the three `ui_chrome.md` and the Modern feel sheet's Ancient list) | chrome check |
| `decisions_probe` | the eight open-question probes and their verdicts | `report --section decisions` |
| `amendments`, `rubric`, `reject_examples`, `era_constraints`, `vbscan`, `ownership` | the prose rows of this file in machine form | tools, REVIEWER |

Change control: banned refs, emblems and patterns change by **signed append** (a new row with `src`, author and REVIEWER signature in the commit message of the wip branch); thresholds and faction colours change by a logged amendment (a numbered row in section 2 of this file) which re-runs `check` and `selftest`.

### 3.3 Palette separation

#### 3.3.1 Sources measured

The tool measures four Ancient sources and the new rows: `FACTIONS[id].colors` of `src/content/era_ancient/stats.js` (7 display primaries and accents, the colours of chips, banners and chooser art), `PALETTES` of `blueprints.js` (8 workshop rows with primary, secondary, trim, cloth), the unit paint constants of `units/t0.js`, `units_a.js`, `units_b.js` (`HELLENE ROMAN EGYPT PERSIAN BARB MYTH PUNIC`: the colours the Ancient battle models really wear, not the FACTIONS colours), and the nine `EMBLEMS` of `parts/_kit.js`. New eras: 18 rows of `vb_data.eras`.

| source | id | primary | accent | trim | cloth | nearest banned row (max element) |
|---|---|---|---|---|---|---|
| stats.js FACTIONS | hellenes | `#2a5db0` | `#f2d36b` | - | - | flag_by_03 7.5 |
| stats.js FACTIONS | romans | `#b3262e` | `#e8c15a` | - | - | flag_ry_01 7.1 |
| stats.js FACTIONS | egyptians | `#1f8f8a` | `#e8c15a` | - | - | flag_owg_03/ac 24.1 |
| stats.js FACTIONS | persians | `#6a3fb0` | `#f0d57a` | - | - | flag_by_01 16.9 |
| stats.js FACTIONS | carthage | `#7a2a8a` | `#dcdcdc` | - | - | flag_rwb_02/bc 15.7 |
| stats.js FACTIONS | barbarians | `#2f7a3a` | `#d9a05a` | - | - | flag_owg_02/ac 9.2 |
| stats.js FACTIONS | mythic | `#d4a017` | `#ffffff` | - | - | flag_owg_02/ab 14.3 |
| blueprints.js PALETTES | ws0 | `#c8453c` | `#f2d36b` | `#4a2f1c` | `#e8e2d0` | flag_ry_02 7.6 |
| blueprints.js PALETTES | ws1 | `#2a5db0` | `#f2d36b` | `#2b2f5a` | `#ece8dc` | flag_by_03 7.5 |
| blueprints.js PALETTES | ws2 | `#1f8f8a` | `#e8c15a` | `#3a2a1a` | `#f0ead8` | courier_02 9.1 |
| blueprints.js PALETTES | ws3 | `#6a3fb0` | `#f0d57a` | `#2a1a4a` | `#ece6f0` | flag_by_01 16.9 |
| blueprints.js PALETTES | ws4 | `#2f7a3a` | `#d9a05a` | `#3a2a14` | `#e6e2cc` | flag_owg_02/ac 9.2 |
| blueprints.js PALETTES | ws5 | `#7a2a8a` | `#dcdcdc` | `#2a1a30` | `#ece6ee` | flag_rwb_02/bc 15.0 |
| blueprints.js PALETTES | ws6 | `#b3262e` | `#e8c15a` | `#3a1a14` | `#f0e8dc` | flag_ry_01 7.1 |
| blueprints.js PALETTES | ws7 | `#d4a017` | `#ffffff` | `#4a3410` | `#f4eedc` | courier_02 14.3 |
| units/*.js unit paint | HELLENE | `#c8453c` | `#f2d36b` | `#4a2f1c` | `#ece6d4` | flag_ry_02 7.6 |
| units/*.js unit paint | ROMAN | `#a8322a` | `#e8c15a` | `#3a2418` | `#ece4d4` | flag_ry_01 7.1 |
| units/*.js unit paint | EGYPT | `#1f8f8a` | `#e8c15a` | `#3a2a1a` | `#f0ead8` | courier_02 9.1 |
| units/*.js unit paint | PERSIAN | `#6a3fb0` | `#f0d57a` | `#2a3a7a` | `#f0ece4` | flag_by_03 12.6 |
| units/*.js unit paint | BARB | `#2f7a3a` | `#d9a05a` | `#4a3418` | `#e6e2cc` | flag_owg_02/ac 9.2 |
| units/*.js unit paint | MYTH | `#d4a017` | `#f6d850` | `#4a3418` | `#e8e0cc` | courier_02 12.6 |
| units/*.js unit paint | PUNIC | `#7a2a8a` | `#dcdcdc` | `#2a1a30` | `#ece6ee` | flag_rwb_02/bc 15.0 |

Reading: the Ancient display colours (Hellenes blue + gold, Romans crimson + gold) sit 7.1 to 7.8 from real flag colour sets and the Ancient unit paint repeats it. They are shipped and frozen (plan 0.1); the new bands below are set so that no new faction is worse than that, and strictly better in practice (minimum 11.2).

#### 3.3.2 Primaries: the fixed bars and why

All 25 display primaries, pairwise. Full matrix in Appendix B; the weakest pairs:

| dE00 | pair |
|---|---|
| 9.3 | ancient:persians / ancient:carthage (in-era) |
| 16.8 | ancient:hellenes / ancient:persians (in-era) |
| 16.8 | ancient:hellenes / scifi:tidy_concord (cross-era) |
| 17.0 | medieval:gatehouse / scifi:tidy_concord (cross-era) |
| 17.2 | ancient:egyptians / scifi:glowmoss (cross-era) |
| 17.3 | modern:shed / scifi:glowmoss (cross-era) |
| 17.4 | ancient:romans / medieval:wyrmkin (cross-era) |
| 17.4 | medieval:yeomen / scifi:skitter (cross-era) |
| 18.0 | modern:caution / scifi:skitter (cross-era) |
| 18.1 | modern:directorate / scifi:quiet_hour (cross-era) |
| 18.9 | medieval:gatehouse / modern:skyclub (cross-era) |
| 19.1 | ancient:mythic / scifi:rummage (cross-era) |

Scope minima against the bars:

| scope | weakest pair | dE00 | bar |
|---|---|---|---|
| Ancient in-era (shipped, grandfathered) | ancient:persians / ancient:carthage | 9.3 | none (ratchet) |
| medieval in-era | medieval:free_company / medieval:wyrmkin | 22.6 | 20 |
| modern in-era | modern:caution / modern:shed | 24.9 | 20 |
| scifi in-era | scifi:skitter / scifi:glowmoss | 28.9 | 20 |
| medieval vs Ancient | ancient:romans / medieval:wyrmkin | 17.4 | 16.5 |
| modern vs Ancient | ancient:mythic / modern:caution | 20.0 | 16.5 |
| scifi vs Ancient | ancient:hellenes / scifi:tidy_concord | 16.8 | 16.5 |
| medieval-modern | medieval:gatehouse / modern:skyclub | 18.9 | 16.5 |
| medieval-scifi | medieval:gatehouse / scifi:tidy_concord | 17.0 | 16.5 |
| modern-scifi | modern:shed / scifi:glowmoss | 17.3 | 16.5 |

*In-era bar 20.0.* Factions of one era meet on one battlefield. The Ancient shipped one outlier (Persians / Carthaginians, purple against purple, 9.3) and otherwise 16.8 or more. The new eras measure 22.6 / 24.9 / 28.9, so 20.0 (also the CLEAR bar of the banned scan, so the file uses two numbers, 8 and 20) loses no design. The lighting pre-pass (3.3.3) shows 20.0 nominal survives the harshest look.
*Cross-era bar 16.5 (Ancient and other new eras).* Cross-era pairs never share a battlefield (D14: Quick shows one era at a time; D19: Time Warp is out); they share a screen only on the chooser, the Codex header and share-code chips, where the faction name always accompanies the chip. The bar is therefore set by the shipped Ancient, not by a perceptual law: the second-weakest shipped pair is Hellenes / Persians at 16.8, and the "17" the three bibles used as a benchmark is that pair rounded (origin not documented there). 16.5 means "no new pair is worse than the worst accepted shipped pair outside the one known outlier". It admits Concord azure (16.8 from the Hellenes blue, 17.0 from the Gatehouse steel) with 0.3 margin; both neighbours are frozen or fixed, so the margin cannot erode. Note the explicit statement the bibles did not make: raising the bar above 16.8 would not be neutral, it would force the ivory-primary fallback for Concord (3.4, Q-concord), which loses the chip on pale chrome.
*Why two bars.* The 45 new in-era pairs and the 234 new cross-era pairs have different jobs. One bar of 20.0 applied cross-era would reject 17 of the 234 cross-era pairs (Concord, Skitter, Glowmoss, Wyrmkin and others) although none of them ever shares a battlefield; one bar of 16.5 applied in-era would let a future army sit 17 from its neighbour on the same field, which is the Persians / Carthaginians outlier again.

#### 3.3.3 Lighting sensitivity (VB-D06)

In-era primary pairs, graded by every `THEME_LOOK` row of their own era (Ancient: the one default look), model of 3.1:

| era | looks | cases | below 12 | worst graded dE00 (look, pair, nominal) | min graded/nominal |
|---|---|---|---|---|---|
| ancient | 1 | 21 | 1 | 9.3 (default, persians/carthage, 9.3) | 1.00 |
| medieval | 8 | 120 | 0 | 13.4 (med_castle, free_company/wyrmkin, 22.6) | 0.59 |
| modern | 6 | 90 | 0 | 22.3 (mod_industrial, marmalade/briefing, 26.6) | 0.80 |
| scifi | 7 | 105 | 0 | 24.1 (sf_jungle, skitter/glowmoss, 28.9) | 0.74 |

No new in-era pair falls under 12.0 in any look; the worst cases are warm dusk looks (Medieval `med_castle`, ratio 0.59). Ancient's outlier pair stays at 9.3. The 12.0 floor sits between Ancient's outlier (9.3) and its next pair (16.8): a new pair may not land in the region the shipped outlier occupies. It is an engineering line, not a perceptual constant; ER17 (rendered `dE_ring`, `dE_team`) is the arbiter.

#### 3.3.4 The pair / accent test

Accents are small area trim; identity is carried by the primary and the body. The pair test therefore has three parts (all in `sectionPairs`):

1. **Internal contrast:** a faction's accent differs from its own primary by >= 12.0 (measured minimum 18.3, Skyclub sky / white).
2. **Escape:** a primary pair under its bar passes only cross-era, with primaries >= 12.0 apart AND the role-fixed accent distance >= 25.0 (accent against accent, never crossed). Crossed assignment is NOT used: Directorate (charcoal + cream) and Caution (butter + black) are 17.2 apart on a crossed assignment and 74.6 apart on the primary, and they are different armies. Today no pair needs the escape (all 18 clear 16.5 directly); the rule exists so a future faction in the crowded blue region can use it.
3. **Accent against other primaries (informational, not a bar):** minimum 1.2 (Marmalade charcoal accent / Directorate charcoal primary), Ancient shipped 9.2 (Romans gold accent / Mythic gold primary). Accents may equal another faction's primary colour; the body does not (3.3.5).

#### 3.3.5 The body-colour test (new)

The display primary is a chip; the **body** (the `body` role of each faction: the colour that covers the unit) is what the player sees on the field. Concord's body is ivory, Courtesy's steel, Skitter's plum, Quiet Hour's ink; elsewhere the primary. In-era body distances:

| era | pair | body dE00 | dL* | edge dE00 | clause |
|---|---|---|---|---|---|
| scifi | skitter / quiet_hour | 8.5 | 0.2 | 94.9 | present, separates |
| scifi | tidy_concord / courtesy | 17.4 | 21.9 | 44.3 | present, separates |
| medieval | free_company / wyrmkin | 22.6 | 6.7 | - | not needed |
| medieval | marrowby / free_company | 24.7 | 23.4 | - | not needed |
| modern | caution / shed | 24.9 | 4.6 | - | not needed |
| modern | marmalade / caution | 25.7 | 14.8 | - | not needed |

Bar 8.0 (Ancient shipped unit paint: HELLENE/ROMAN 8.3, PERSIAN/PUNIC 9.3, EGYPT/BARB 21.1). Pairs under 20 carry a **body clause** in both rows: an L* gap >= 20 or edge colours >= 20 apart. Skitter plum and Quiet Hour ink are the same darkness (L* 9.2 and 9.0, dE 8.5): their clause is the lime glow tips on a low wide carpet against one violet rim line on a thin sliver (edge colours 94.9 apart). Concord and Courtesy: L* 95 against 73 (21.9) plus round against boxy. This is the bibles' greyscale table made checkable; it was missing as a number.

**The same bodies under colour-vision deficiency** (the "CVD separation between the two teams of any battle" for the two armies, as opposed to the two team tints of 3.8). In-era body colours seen through protan, deutan and tritan, weakest six:

| era | pair | worst view | body dE00 in that view |
|---|---|---|---|
| modern | marmalade / briefing | tritan | 4.7 |
| medieval | marrowby / bellfount | tritan | 4.7 |
| medieval | marrowby / yeomen | deutan | 6.0 |
| modern | skyclub / shed | tritan | 6.1 |
| scifi | skitter / quiet_hour | protan | 6.4 |
| medieval | free_company / wyrmkin | tritan | 6.7 |

Ancient unit paint shipped at: ROMAN/BARB 5.0 (deutan), PERSIAN/PUNIC 5.9 (deutan), HELLENE/ROMAN 7.1 (protan). Bar **4.5** in every view (Ancient shipped floor 5.0 minus rounding); every new era passes (minimum 4.7). Pairs under 8.0 in a view (Marrowby / Bellfount and Marmalade / Briefing under tritanopia, Marrowby / Yeomen under deuteranopia, Skyclub / Shed, Skitter / Quiet Hour, Free Company / Wyrmkin) rely on what the bibles already give them: a different silhouette adjective (`silhouette` in the data, one per faction), a different tint carrier and the CVD-safe team palette (`cvd`, blue against orange, carrier pair 57.6 to 66.6 in all four views). That is deliberate: colour alone separates no pair of armies for a colour-blind player in the Ancient either (display primaries Hellenes / Persians are 0.9 apart under deuteranopia).

### 3.4 The open colour questions, answered with numbers

All numbers are `node tools/vb_distance.mjs report --section decisions`.

**Q-cyan** Mostly Paid Company accent: #2db5c9 or the fallback #3fb8e0

| candidate | numbers (dE00) |
|---|---|
| `#2db5c9` kept | nearest primaries: ancient:egyptians 15.3, modern:skyclub 15.5, medieval:gatehouse 18.1; nearest accents: scifi:courtesy 19.4, medieval:gatehouse 22.1; pair clearance (max element, nearest banned row): 29.5 (flag_gwr_01/bc); dE to the classic team blue: 32.3; dE to the cvd team blue: 25.1; against egyptian teal 15.3, skyclub sky 15.5, scifi chrome cyan 11.1, modern cover cyan 6.2 |
| `#3fb8e0` fallback | nearest primaries: modern:skyclub 11.2, medieval:gatehouse 16.7, scifi:tidy_concord 17.9; nearest accents: scifi:courtesy 17.5, medieval:gatehouse 19.6; pair clearance (max element, nearest banned row): 28.8 (flag_gwr_01/bc); dE to the classic team blue: 27.5; dE to the cvd team blue: 19.0; against egyptian teal 20.8, skyclub sky 11.2, scifi chrome cyan 10.7, modern cover cyan 5.3 |

Verdict: KEEP #2db5c9. It is an accent, so the primary bars do not apply; as a pair (tobacco, cyan) it clears every banned tuple (29.5); it is 32.3 / 25.1 from the classic / cvd team blue where the fallback is 27.5 / 19.0; its 15.3 (Egyptian teal) and 15.5 (Skyclub sky) are against primaries of other eras that never share a battlefield or a chip with it. The fallback #3fb8e0 leaves the teal (20.8) but lands 11.2 from Skyclub sky and 5.3 from the Modern cover cyan: a worse trade.

**Q-sulphur** Hoard accent: #dccb2c or the fallback #e3d34a

| candidate | numbers (dE00) |
|---|---|
| `#dccb2c` kept | nearest primaries: modern:caution 10.6, ancient:mythic 14.1, medieval:yeomen 16.5; nearest accents: ancient:hellenes 7.3, ancient:persians 8.5; pair clearance (max element, nearest banned row): 18.7 (courier_02); against mythic gold 14.1, caution butter 10.6, safety yellow 4.0 |
| `#e3d34a` fallback | nearest primaries: modern:caution 8.1, ancient:mythic 15.4, scifi:skitter 16.6; nearest accents: ancient:hellenes 5.7, ancient:persians 6.7; pair clearance (max element, nearest banned row): 18.7 (courier_02); against mythic gold 15.4, caution butter 8.1, safety yellow 4.8 |

Verdict: KEEP #dccb2c as the accent. The pair clearance is identical (18.7, RESTRICT against a brown-gold courier livery: no band, split or check; the Hoard cloth is a plain oxblood field with a glyph). It is 2.5 farther from Caution butter (10.6 against 8.1); the fallback #e3d34a is only 2.6 from it and is already the coin-metal glint, so using it as the accent would add nothing.

**Q-concord** Concord: azure #1288da as primary (ivory as accent) or ivory #eef1ea as primary

| candidate | numbers (dE00) |
|---|---|
| `#1288da` azure primary (kept) | nearest primaries: ancient:hellenes 16.8, medieval:gatehouse 17.0, modern:skyclub 23.6; pair clearance (max element, nearest banned row): 12.1 (flag_pbw_02) |
| `#eef1ea` ivory primary (fallback) | nearest primaries: modern:caution 20.8, modern:skyclub 21.5, modern:shed 21.6; pair clearance (max element, nearest banned row): 12.1 (flag_pbw_02); against chip paper modern 0.9, chip paper medieval 11.1 |

Verdict: KEEP azure #1288da as primary with ivory #eef1ea as accent. Azure is 16.8 from the Hellenes blue and 17.0 from the Gatehouse steel, above the 16.5 cross-era bar (both neighbours are frozen or fixed, so the margin cannot move). The ivory-primary fallback puts an ivory chip on Modern paper (0.9) and Medieval parchment (11.1): invisible; and the pair clearance stays 12.1 (RESTRICT against pale-blue-and-white) either way.

**Q-sky** Skyclub primary: #98d8ff or #a3dcff

| candidate | numbers (dE00) |
|---|---|
| `#98d8ff` kept | nearest primaries: medieval:gatehouse 18.9, scifi:tidy_concord 23.6, ancient:egyptians 29.2; pair clearance (max element, nearest banned row): 11.8 (flag_pbw_01) |
| `#a3dcff` alternative | nearest primaries: medieval:gatehouse 19.2, scifi:tidy_concord 24.8, modern:shed 29.6; pair clearance (max element, nearest banned row): 12.9 (flag_pbw_01) |

Verdict: KEEP #98d8ff. #a3dcff buys 0.3 on the nearest primary (19.2 against 18.9) and 1.1 on the pale-blue-and-white pair (12.9 against 11.8); both stay inside the same bands, no verdict changes.

**Q-butter** Caution primary: butter #fbeb8f or #f5f2a6

| candidate | numbers (dE00) |
|---|---|
| `#fbeb8f` kept | nearest primaries: scifi:skitter 18.0, ancient:mythic 20.0, medieval:yeomen 21.3; pair clearance (max element, nearest banned row): 11.2 (haz_yb_01); against mythic gold 20.0, safety yellow 11.2 |
| `#f5f2a6` alternative | nearest primaries: scifi:skitter 17.1, modern:shed 21.0, medieval:yeomen 21.2; pair clearance (max element, nearest banned row): 15.2 (haz_yb_01); against mythic gold 23.5, safety yellow 15.2 |

Verdict: KEEP #fbeb8f. 20.0 from the Mythic gold clears 16.5 with 3.5 to spare. The fallback #f5f2a6 lifts the hazard-yellow pair from 11.2 to 15.2, still RESTRICT, so the registered tape-chevron pattern is the only black-on-butter layout either way.

**Q-chequer** Marrowby caparison: which partner for orange in a lattice or chequer

| candidate | numbers (dE00) |
|---|---|
| `#f1e4c0` cream (design) | pair clearance (max element, nearest banned row): 14.5 (flag_rwb_04/ab) |
| `#7a3b12` umber | pair clearance (max element, nearest banned row): 27.7 (courier_02) |
| `#5a3b22` walnut | pair clearance (max element, nearest banned row): 24.5 (flag_brg_01/ab) |
| `#e9c27a` custard | pair clearance (max element, nearest banned row): 15.4 (flag_ry_02) |

Verdict: RULE: a lattice, chequer, lozenge, stripe or split whose dominant pair is within 20 (max element, best assignment) of a banned tuple is rejected. Orange + cream is 14.5, so Marrowby never tiles cream against orange: the caparison lattice is orange + umber (27.7) or orange + walnut (24.5); cream stays as a plain field, a glyph, piping or the plume (charge-on-field is only held to the BLOCK band, 14.5 passes). Custard #e9c27a is no way out (15.4 from red-yellow).

**Q-tobacco** Mostly Paid Company primary: tobacco #7d5434 sits 5.7 from a plain uniform brown

| candidate | numbers (dE00) |
|---|---|
| `#7d5434` design value | nearest primaries: ancient:romans 20.0, medieval:marrowby 21.6, scifi:rummage 21.9; against coyote brown 5.7, olive drab fs595 15.9, khaki 32.5 |
| `#72421d` amended (VB-A1) | nearest primaries: ancient:romans 19.8, medieval:wyrmkin 22.6, medieval:marrowby 24.7; against coyote brown 11.0, olive drab fs595 17.2, khaki 40.6 |

Verdict: AMEND (VB-A1) #7d5434 -> #72421d. The design value is 5.7 from coyote brown (BLOCK < 10); the amended value is 11.0 from it, 17.2 from the FS595 olive drab, 22.6 from the nearest in-era primary (Wyrmkin, was 21.6) and 19.8 from the nearest cross-era one (Romans, was 20.0).

**Q-brass** Rummage primary brass #867a14 against plain olive drab

| candidate | numbers (dE00) |
|---|---|
| `#867a14` kept (restricted single) | nearest primaries: ancient:mythic 19.1, medieval:yeomen 19.6, ancient:barbarians 22.2; against olive drab web 13.2, olive drab fs595 22.9, army green 18.8, coyote brown 16.5 |

Verdict: KEEP #867a14 as a RESTRICTED single: 13.2 from plain olive drab is above BLOCK (10) and below CLEAR (20), so the model arm caps the share of a humanoid's non-tint pixels within 12 of one uniform reference at 60 percent; the Rummage design is patchwork by construction (one brass shoulder, mismatched panels).


**Q-chequer, the rule form (plan 0.6 "any chequer within CIEDE2000 20 of red/white is flagged").** Implemented as: a face whose layout is a lattice, chequer, lozenge, stripe or split, whose dominant colours (classes with >= 12 percent of the face) lie within 20 (max element, best assignment) of any banned tuple or sub-pair, is rejected unless the face is a registered pattern (3.7.5). Fixture `MED-X1` (orange + cream chequer, 14.5) is rejected, fixture `MED-A2` (orange + umber lozenge pattern) is accepted.

### 3.5 Per-era palette tables

Values are `vb_data.eras`. `body` is the colour role covering the unit. `edge` says whether the failing carrier cells of 3.8 oblige the ink-edge rule. "Tightest banned pair row" is the smallest max-element distance to a banned tuple (the row that restricts the faction's layouts; the derived table is in 3.6.2).

**Medieval** (saturated heraldic toy box with bunting; shared neutrals: cream `#f1e4c0`, parchment `#efe2c0`, walnut `#5a3b22`, thatch `#c9a45c`, flagstone `#9aa0a6`, cobble `#8a8f94`, moss `#6b8f47`, mud `#6b4a2b`, lists sand `#e0c98f`, heather `#8a5a8c`, scree `#7a6f66`, ash `#4a4540`, lava `#e2661f`):

| faction | primary | accent | trim | metal / glass / glow | body | tint carriers (kind) | edge | nearest primary in era | nearest primary elsewhere | tightest banned pair row |
|---|---|---|---|---|---|---|---|---|---|---|
| `marrowby` Crown of Marrowby | `#d9661c` | `#f1e4c0` | `#7a3b12` | `#b9c2cc` `#c9a227` | primary | surcoat, caparison lozenges, plume (panel) | no | 24.7 free_company | 20.0 modern:marmalade | flag_rwb_04/ab 14.5 |
| `yeomen` Long Hedge Yeomanry | `#8bb12e` | `#5a3b22` | `#d9c9a0` | `#6b6f76` | primary | sash, hat band, banner cloth (panel) | yes (2/12) | 37.2 gatehouse | 17.4 scifi:skitter | none below 20 |
| `gatehouse` Gatehouse League | `#8c9aa8` | `#cfe0ee` | `#5d6a78` | `#c9d3dc` | primary | pavise face, kettle brim, machine pennants (panel) | no | 32.0 bellfount | 17.0 scifi:tidy_concord | flag_pbw_02 11.7 |
| `bellfount` Bellfount Abbey | `#d9577f` | `#bfe3cf` | `#8e3a55` | `#b07a2c` | primary | bell-skirt hem, bell, beak trim (panel) | yes (1/12) | 26.5 wyrmkin | 19.9 scifi:courtesy | flag_rwb_01/ab 17.4 |
| `free_company` The Mostly Paid Company | `#72421d` | `#2db5c9` | `#c9a97a` | `#6b6f76` | primary | the cyan patches (patch = team colour) (patch) | yes (2/12) | 22.6 wyrmkin | 19.8 ancient:romans | none below 20 |
| `wyrmkin` Hoard of Mount Perpetual | `#6e2438` | `#dccb2c` | `#2b1a22` | `#e3d34a` | primary | coin sack, belly glow, wing-membrane edge (glow) | yes (2/12) | 22.6 free_company | 17.4 ancient:romans | courier_02 18.7 |

**Modern** (retro-appliance showroom: pastels over charcoal trim; shared neutrals: concrete `#c9cbc6`, asphalt `#4a4d52`, paving `#b9b4ac`, lino `#d8e0d4`, felt `#7fb089`, ballast `#8d8a85`, steel `#8e969f`, amber `#ffb300`, black `#1b1b1b`, cover cyan `#35c8e8`, tape `#fbeb8f`; pin red `#e2483d` is reserved for the pushpin):

| faction | primary | accent | trim | metal / glass / glow | body | tint carriers (kind) | edge | nearest primary in era | nearest primary elsewhere | tightest banned pair row |
|---|---|---|---|---|---|---|---|---|---|---|
| `marmalade` Marmalade Motor Pool | `#f7b08c` | `#2e3036` | `#d98a63` | `#cfd3da` `#f1e6d6` | primary | turret ring, helmet band, lunchbox side latches (panel) | yes (1/12) | 25.7 caution | 20.0 medieval:marrowby | haz_ob_01 16.5 |
| `directorate` Directorate of Convenient Logistics | `#2b2f36` | `#e9e4d4` | `#59616b` | `#c4c9d2` `#d9c27a` | primary | tab dividers on the paper backpack, cabinet drawer fronts, Deputy's in-trays (panel) | no | 61.3 briefing | 18.1 scifi:quiet_hour | flag_bw_01 12.9 |
| `skyclub` Paper Plane Flying Club | `#98d8ff` | `#f7fbff` | `#5aa8e0` | `#eef3f8` `#cfeeff` | primary | rotor disc rim, balloon alternate segments, parasol canopy segments (panel) | yes (1/12) | 30.6 shed | 18.9 medieval:gatehouse | flag_pbw_01 11.8 |
| `caution` Caution Tape Company | `#fbeb8f` | `#1b1b1b` | `#e0c84a` | `#9aa0a8` `#ffb300` | primary | beacon lamp, hard-hat brim (lamp) | no | 24.9 shed | 18.0 scifi:skitter | haz_yb_01 11.2 |
| `briefing` Briefing Room Brigade | `#f2a8d2` | `#f6f3ec` | `#d878b0` | `#c9ced6` `#d98a5a` | primary | dish rim, lectern front, ammo-belt clip (panel) | yes (1/12) | 26.6 marmalade | 20.7 medieval:bellfount | none below 20 |
| `shed` Garden Shed Auxiliary | `#8ff0c0` | `#4a2a55` | `#4fbf92` | `#d9835f` `#b8c0c8` `#2f8f6a` | primary | hose coil, mower deck skirt, trolley handle (panel) | no | 24.9 caution | 17.3 scifi:glowmoss | none below 20 |

**Sci-Fi** (toy shop at night: neon on ink; shared neutrals: regolith `#8d8a94`, basalt `#3c3a42`, hull `#7a828c`, deck `#c9ced6`, ice `#cfe6f2`, resin `#4a3a4c`, goo `#7bb04a`, alien moss `#3f7d63`, neon pad `#1c2340`, chrome cyan `#35e0ff`, asphalt night `#2a2c36`, solar glass `#243a66`; alarm red `#ff3d5a` is reserved for the orbital ring, the SHIELD DOWN pip and alarm props):

| faction | primary | accent | trim | metal / glass / glow | body | tint carriers (kind) | edge | nearest primary in era | nearest primary elsewhere | tightest banned pair row |
|---|---|---|---|---|---|---|---|---|---|---|
| `tidy_concord` Tidy Concord | `#1288da` | `#eef1ea` | `#0b7fb5` | `#c9d2da` `#1b2b46` `#9fdcff` | accent | shoulder pods, visor trim, dome rim, Dustpan pad ring (panel) | yes (4/12) | 41.9 glowmoss | 16.8 ancient:hellenes | flag_pbw_02 12.1 |
| `rummage` Rummage Armada | `#867a14` | `#2d2a28` | `#8f979e` | `#4a7f84` `#c9b87a` `#8a4b3a` `#ffb02e` | primary | shoulder patch panel, rocket-pod racks, cart push bar (panel) | no | 30.0 glowmoss | 19.1 ancient:mythic | none below 20 |
| `courtesy` Courtesy Systems | `#f21ae8` | `#aab4c0` | `#6b7683` | `#dfe4ea` `#ffc2fb` `#35e0ff` `#f21ae8` | accent | lens ring, bow-tie light, cash-drawer trim (lamp) | yes (2/12) | 43.8 quiet_hour | 19.9 medieval:bellfount | none below 20 |
| `skitter` Skitter Hive | `#aff802` | `#2b0f2a` | `#5b2a5a` | `#4a1f40` `#aff802` `#c8ff4a` | accent | glowing hex dots on the shell, mandible tips, queen's egg clusters (glow) | yes (1/12) | 28.9 glowmoss | 17.4 medieval:yeomen | haz_yb_01 19.4 |
| `glowmoss` Glowmoss Reach | `#2fb07c` | `#ff9f1c` | `#1c7552` | `#cfeedd` `#ffd480` `#ff9f1c` `#ff8fb6` | primary | lamp ring on the Grazer helmet, Shepherd's staff head, Hummock's lamp (lamp) | yes (5/12) | 28.9 skitter | 17.2 ancient:egyptians | flag_owg_03/ac 11.8 |
| `quiet_hour` Quiet Hour | `#200f3e` | `#a25ffd` | `#3b2a7a` | `#e4d6ff` `#a25ffd` | primary | single rim line along hood, lance and wing edges (rim) | yes (2/12) | 43.8 courtesy | 18.1 modern:directorate | none below 20 |

**Workshop palette rows.** The `palettes` append array of each era (AR `append` kind) holds exactly six rows, one per faction, in faction order: `{id: '<era prefix><faction>', primary, secondary: accent, trim, cloth}` with `cloth` chosen from the era neutrals above (lightest neutral that is not within 12 of the primary). `vbscan` P-6 asserts the registry rows equal these values; any further Workshop preset is a signed append (OI-4).

### 3.6 The banned reference palette

#### 3.6.1 The list (44 tuples, data in `vb_data.banned.refs`)

Classes: **flag** (national colour sets: red-white-blue x7, red-white x4, black-white, black-red-gold x2, blue-yellow x3, green-white-red x2, orange-white-green x3, red-yellow x2, pale blue-white x2, blue-white x3), **uniform** (plain colours of real armies, single colours: olive drab x3, khaki, desert tan, coyote brown, field grey x2), **hazard** (hazard yellow-black, hazard orange-black), **agency** (space-agency blue / red / white), **brand** (courier and food liveries x4). Ids are neutral descriptors (`flag_rwb_01`, `uni_olive_02`, `courier_03`); no real organisation or country name appears in an id, a class or a player-facing string. The `src` field of each row names the evidence page or file; 28 rows are verified against a Wikipedia infobox or flag article (raw wikitext, retrieved 2026-10-08 with a descriptive User-Agent and 3 s spacing), 5 against a Wikimedia Commons SVG, 11 are carried from the bibles' own lists where no public page states the value. The emitted test fixtures drop `src` and `why`. `vb_data.json` is a developer file under `docs/`; the text sweep scans shipped strings and `src/` only (open item OI-9 asks VF to state this scope).

Every tuple is a set of sRGB colours; the justification column of the data file says what it stands for in one sentence ("national colour set: bands, split, check, lozenge or a charge on a plain field in these colours reads as a real country"). The tuples:

| id range | class | tuples (colours) |
|---|---|---|
| `flag_rwb_01` .. `flag_rwb_07` | flag | red-white-blue sets: `#b31942` `#ffffff` `#0a3161`; `#b22234` `#ffffff` `#3c3b6e`; `#c8102e` `#ffffff` `#012169`; `#ef4135` `#ffffff` `#0055a4`; `#e1000f` `#ffffff` `#000091`; `#ad1d25` `#ffffff` `#1e4785`; `#da291c` `#ffffff` `#0032a0` |
| `flag_rw_01` .. `flag_rw_04` | flag | red-white sets: `#d4213d` `#ffffff`; `#ff0000` `#ffffff`; `#c8102e` `#ffffff`; `#d62828` `#ffffff` |
| `flag_bw_01` | flag | black-white: `#000000` `#ffffff` |
| `flag_brg_01` .. `flag_brg_02` | flag | black-red-gold sets: `#000000` `#d00000` `#ffce00`; `#000000` `#dd0000` `#ffce00` |
| `flag_by_01` .. `flag_by_03` | flag | blue-yellow sets: `#0057b7` `#ffd700`; `#005583` `#ffc200`; `#0058a3` `#fbd914` |
| `flag_gwr_01` .. `flag_gwr_02` | flag | green-white-red sets: `#008c45` `#f4f5f0` `#cd212a`; `#006847` `#ffffff` `#ce1125` |
| `flag_owg_01` .. `flag_owg_03` | flag | orange-white-green sets: `#ff671f` `#ffffff` `#046a38`; `#ff9933` `#ffffff` `#138808`; `#ff883e` `#ffffff` `#169b62` |
| `flag_ry_01` .. `flag_ry_02` | flag | red-yellow sets: `#ad1519` `#fabd00`; `#da291c` `#ffc72c` |
| `flag_pbw_01` .. `flag_pbw_02` | flag | pale blue-white sets: `#74acdf` `#ffffff`; `#75aadb` `#ffffff` |
| `flag_bwh_01` .. `flag_bwh_03` | flag | blue-white sets: `#014488` `#ffffff`; `#0038b8` `#ffffff`; `#0d5eaf` `#ffffff` |
| `uni_olive_01` .. `uni_olive_03` | uniform | olive drab (3 shades): `#6b8e23`; `#544f3d`; `#4b5320` |
| `uni_khaki_01` | uniform | khaki: `#c3b091` |
| `uni_tan_01` | uniform | desert tan: `#c2b280` |
| `uni_coyote_01` | uniform | coyote brown: `#81613c` |
| `uni_grey_01` .. `uni_grey_02` | uniform | field grey (2 shades): `#4d5d53`; `#6b7266` |
| `haz_yb_01` | hazard | hazard yellow-black: `#eed202` `#000000` |
| `haz_ob_01` | hazard | hazard orange-black: `#ff7900` `#000000` |
| `agency_01` | agency | space-agency set: `#0b3d91` `#fc3d21` `#ffffff` |
| `courier_01` .. `courier_03` | brand | courier liveries: `#fecc00` `#d50029`; `#301506` `#fab80a`; `#2a007c` `#ff5900` |
| `food_01` | brand | food-chain livery: `#ffcc00` `#da291c` |

#### 3.6.2 Semantics and results

For a palette set (pair: primary + accent; triple: primary + accent + trim) and every scan row (the tuples, plus the three sub-pairs of each triple), `max` is the distance of 3.1. Bands:

* **BLOCK (max < 8.0):** the palette is the reference. Forbidden for any layout, for any new faction. Why 8.0: the shipped Ancient has four such rows (Hellenes 7.5 and 7.8 against two blue-yellow sets, Romans 7.1 and 7.6 against a red-yellow set and a courier livery); the new bar is "strictly better than the worst shipped value", and the new minimum is 11.2.
* **RESTRICT (8.0 to 20.0):** legal as a palette, but the pair may not form a stripe, split, check, chequer or lozenge on any face, and on a flag-role face (3.9.3) a charge on a plain field is held only to BLOCK. Why 20.0: the bibles' own stated bar, and the in-era bar of 3.3.2.
* **CLEAR (>= 20.0):** no restriction.

Result for the 18 new factions: **0 BLOCK rows**, 57 RESTRICT rows. The derived restriction table (the bibles' soft spots are now numbers; `none` = no row below 20):

| faction | restricted rows below 20 (nearest banned row, max element). A pair row means those two colours may NOT form a stripe, split, check or lozenge; a (single) row is the uniform share cap M-8 |
|---|---|
| medieval:marrowby | flag_rwb_04/ab 14.5; flag_rw_02 14.5; flag_owg_01/ab 14.5; flag_owg_03/ab 14.5 |
| medieval:yeomen | uni_olive_01 11.3 (single); uni_tan_01 17.5 (single) |
| medieval:gatehouse | flag_pbw_02 11.7; flag_pbw_01 12.3 |
| medieval:bellfount | flag_rwb_01/ab 17.4; flag_rw_01 17.4; flag_rwb_03/ab 19.1; flag_rw_03 19.1 |
| medieval:free_company | uni_coyote_01 11.0 (single); uni_olive_02 17.2 (single) |
| medieval:wyrmkin | courier_02 18.7; flag_ry_01 18.7 |
| modern:marmalade | haz_ob_01 16.5; uni_khaki_01 15.0 (single); uni_tan_01 18.5 (single) |
| modern:directorate | flag_bw_01 12.9; flag_rwb_01/bc 14.6; flag_rwb_02/bc 16.3; flag_rwb_03/bc 16.9; uni_olive_02 17.9 (single); uni_grey_01 18.9 (single) |
| modern:skyclub | flag_pbw_01 11.8; flag_pbw_02 12.3 |
| modern:caution | haz_yb_01 11.2; flag_brg_01/ac 12.9; flag_brg_02/ac 12.9; courier_02 17.0; uni_tan_01 15.3 (single); uni_khaki_01 18.6 (single) |
| modern:briefing | none |
| modern:shed | none |
| scifi:tidy_concord | flag_pbw_02 12.1; flag_pbw_01 12.4; flag_bwh_03 16.0; flag_rwb_04/bc 19.1 |
| scifi:rummage | uni_olive_01 13.2 (single); uni_coyote_01 16.5 (single) |
| scifi:courtesy | none |
| scifi:skitter | haz_yb_01 19.4 |
| scifi:glowmoss | flag_owg_03/ac 11.8; flag_owg_02/ac 18.9; uni_olive_01 19.7 (single) |
| scifi:quiet_hour | none |

Findings relative to the bibles: Directorate 12.9 (bible 12.9, confirmed); Skyclub 11.8 (bible 12.3: the reference variant differs); Caution 11.2 (bible 10.8); Concord 12.1 (confirmed); **Glowmoss 11.8 against the orange-green sub-pair** (bible 18.9 measured the full triple; VB-A5); Marmalade 16.5 against hazard orange-black (not in the bibles); Marrowby 14.5 (the chequer rule); Bellfount 17.4 against red-white. None changes a colour; each is a layout rule enforced by `faceVerdict` (3.9.3) without any per-faction hand list.

#### 3.6.3 Plain uniform singles

A single-colour reference matters only for a body field. Faction primaries against the 8 singles: BLOCK < 10.0, RESTRICT < 20.0 (VB-D08). One design value failed BLOCK: Mostly Paid Company tobacco `#7d5434` is **5.7** from coyote brown `#81613c`; amended (VB-A1) to `#72421d` (11.0). RESTRICT rows: Yeomen 11.3 (hedge-lime against the web olive drab), Marmalade 15.0 (peach against khaki), Caution 15.3 (butter against desert tan), Rummage 13.2 (brass against the web olive drab), Directorate 17.9, Glowmoss 19.7, Free Company 11.0 (coyote). The restriction is a model-arm cap: no humanoid has more than `uniform_share_cap` = 60 percent of its non-tint pixels within 12 of one uniform single (M-8). Ancient audit: the lowest Ancient primary against a single is 14.4 (Barbarians, olive drab); Ancient is not touched.

#### 3.6.4 Evidence the mean-12 rule of VF 3.23.3 cannot stand

Run on the same 18 factions and the same tuples: statistic "mean of the best assignment >= 12" rejects 15 rows over 7 factions (Marrowby, Gatehouse, Directorate, Skyclub, Caution, Concord, Glowmoss), i.e. every soft spot the bibles accepted and kept; statistic "max element < 8" rejects 0 rows. The mean lets one far element rescue a tuple and punishes a tuple whose both elements are a little close, which is the opposite of what a flag reading needs. PC-1.

### 3.7 Emblems

#### 3.7.1 Registry and signing

An emblem is a bitmap `rows` (strings of `#` and `.`, <= 10 x 10) stored in the `emblems` append array of the era (AR `append` kind; Ancient prefix = the nine `EMBLEMS` of `_kit.js`, grandfathered, unchanged) and in `vb_data.emblems` with `hash` (FNV-1a 32 over `w,h:` + rows joined by `/`, 8 hex digits). Row fields: `id` (`med_*`, `mod_*`, `sf_*`, immutable once signed), `kind: 'faction'`, `era`, `faction`, `name` (the canting joke), `w`, `h`, `rows`, `hash`, `fg_role`, `bg_role`, `surfaces[]` (where it may be stamped), `status`, `flag_size_allowed: false`, `signatures[]` (`{role, by, date, spec}`), `reviewer_signature_required: true`. **Allowed** = bitmap passes 3.7.3 AND an `author` signature AND a `reviewer` signature by a different agent. `vbscan` admits author-only rows with `--allow-pending` in dev lanes (T-fast hand-backs of an emblem WP) and never in T-full or release. A bitmap edit is a new `id`/`hash`; the old row stays as a tombstone so saved Workshop soldiers keep loading (AR tombstone rule).

**Placement.** An emblem is stamped 1:1 (voxel = pixel), optionally mirrored left-right, never rotated, never scaled: a scaled or rotated emblem is a different bitmap and needs its own row (this is the answer to "what stops an emblem rotated into a hooked cross"). Emblems are never flag size: the largest stamp is 10 x 10 voxels, and a face of >= 3 x 3 voxels carrying a registered emblem is still a flag-role face if its part is cloth (3.9.3).

**Workshop.** `appended('emblems', era)` for a new era returns its 6 faction rows plus `none` (Ancient: 9 + `none`). The Ancient parity gap (6 against 9) is open item OI-4 (three decor stamps per era: Medieval snail / turnip / ladle, Modern teapot / traffic cone / hard hat, Sci-Fi bow tie / bell / shopping cart; each a signed row).

#### 3.7.2 The 18 proposed rows

Bitmaps at 1:1 (`#` = foreground role, space = background):

**Medieval**

```
med_stool   med_hedgehog   med_gate   med_bell   med_coin   med_coins   
 # # #        # # #          ####       ##        ####      ## ## ##
 #####       ######         ######     ####      #####      ## ## ##
########    ########       ########    ####      ####
 ######      ######        ########    ####      #####        ####
 # ## #     # #  # #       ########   ######     ######        ##
 # ## #     ########       ###  ###   ######      ####         #
 # ## #                    ###  ###       ##                   #
## ## ##                   ########       ##                   #
```

| id | faction | cant | size | voxels | hash | author | reviewer |
|---|---|---|---|---|---|---|---|
| `med_stool` | marrowby | three-legged stool wearing a crown that does not fit | 8 x 8 | 40 | `6abbc448` | signed | pending |
| `med_hedgehog` | yeomen | a hedgehog sitting very still in a hedge | 8 x 6 | 35 | `36b0609d` | signed | pending |
| `med_gate` | gatehouse | a castle gate with a very small cat flap | 8 x 8 | 54 | `01cc8c78` | signed | pending |
| `med_bell` | bellfount | a handbell with its clapper on the outside | 6 x 8 | 30 | `c79b7622` | signed | pending |
| `med_coin` | free_company | a coin with a bite taken out | 6 x 6 | 28 | `184b9d8a` | signed | pending |
| `med_coins` | wyrmkin | three coins and a spoon | 8 x 8 | 21 | `fd7b7099` | signed | pending |

**Modern**

```
mod_wedge   mod_clip   mod_plane   mod_chevron   mod_megaphone   mod_seedling   
######       ####                    ##                 #           ##
#####       #    #            #     ####            #  ##          ###
 ###        # ## #         ####    ##  ##        #### ###        ## #
 ####       # #  #       ######                  #### ###         ##
  ##        # #  #     ########      ##             #  ##           #
            # #  #       ##          ##                 #        ######
            # ####                                                ####
             #                                                    ####
```

| id | faction | cant | size | voxels | hash | author | reviewer |
|---|---|---|---|---|---|---|---|
| `mod_wedge` | marmalade | a citrus wedge with a bite out of it | 6 x 5 | 20 | `88d439ce` | signed | pending |
| `mod_clip` | directorate | a paperclip loop | 6 x 8 | 25 | `a7617273` | signed | pending |
| `mod_plane` | skyclub | a folded paper plane | 8 x 6 | 21 | `c1bed2e5` | signed | pending |
| `mod_chevron` | caution | one upward chevron over a tape-end block (VB-A2: was stacked chevrons) | 6 x 6 | 14 | `41247d52` | signed | pending |
| `mod_megaphone` | briefing | a megaphone cone with three sound arcs | 8 x 6 | 22 | `de29c43c` | signed | pending |
| `mod_seedling` | shed | a seedling in a pot (two leaves, offset, never a cross) | 6 x 8 | 25 | `48c873c7` | signed | pending |

**Sci-Fi**

```
sf_orbit   sf_sprocket   sf_lens    sf_hex     sf_drop   sf_door   
      ##    # ##  #       ######     ##  ##        ##    ######
      ##   ########      #      #   ########       ##    #    #
  ####      ##  ##       # #### #    ##  ##       #      #    #
 #    #    ##    ##      # #### #     ####       #            #
 #    #    ##    ##      # #### #    ######      ##           #
 #    #     ##  ##       # #### #     ####      ####     #    #
 #    #    ########      #      #              ######    #    #
  ####      # ## #        ######               ######    ######
                                                ####
                                                 ##
```

| id | faction | cant | size | voxels | hash | author | reviewer |
|---|---|---|---|---|---|---|---|
| `sf_orbit` | tidy_concord | an orbit ring with one small moon off-centre | 8 x 8 | 20 | `c089381e` | signed | pending |
| `sf_sprocket` | rummage | a sprocket with one bent tooth | 8 x 8 | 40 | `b46ccf9c` | signed | pending |
| `sf_lens` | courtesy | a lens inside a rounded square (never a triangle) | 8 x 8 | 40 | `d312a4c6` | signed | pending |
| `sf_hex` | skitter | a cluster of three hex cells | 8 x 6 | 30 | `1aca5a14` | signed | pending |
| `sf_drop` | glowmoss | a drop with a stalk and a small lamp | 6 x 10 | 30 | `b0bf54ad` | signed | pending |
| `sf_door` | quiet_hour | a hollow rectangle with a gap in one side (a door left ajar) | 6 x 8 | 22 | `248083b6` | signed | pending |

All 18 pass the check below; the rows are author-signed (DESIGN-ERA, 2026-10-08); the REVIEWER countersign is OI-1 (P0 exit). The art is v1 pixel art at the sizes the bibles gave; UNITS may refine a bitmap at look-dev, which is a new row (VB-D10).

#### 3.7.3 The rasterised shape and symmetry check (`evalEmblem`)

Input: the `rows` of one emblem, padded with a 2-cell margin for window scans. A bitmap is rejected when ANY of the following fires; every template and glyph comparison is taken over the 8 dihedral variants (4 rotations x mirror), so rotating or mirroring an emblem cannot create a banned shape that was not tested.

| id | rule | threshold (`thresholds.emblem`, template `window` / `whole`) |
|---|---|---|
| E-size | bounding canvas <= 10 x 10, >= 8 set pixels | `max_w`, `max_h`, `min_n` |
| E-tpl | template hit: Jaccard of the set pixels between a banned raster and (a) every native-scale window of the bitmap (`window`) or (b) the bounding box resampled to the template size (`whole`) | per template, table below |
| E-cross | cross bars: share of set pixels explained by the best thin (<= 2 and <= 40 percent of the extent) horizontal bar and thin vertical bar crossing in the middle half, each spanning >= 75 percent of the extent | >= 0.80 |
| E-pin | pinwheel: 4-fold rotation score >= 0.80 AND best mirror score (left-right, top-bottom, diagonal) <= 0.80 (any hooked cross, however its arms are drawn) | 0.80 / 0.80 |
| E-stripe | stripe pattern: all rows (or all columns) full or empty, no partial line, >= 3 alternating runs (a three-band layout, an equals sign) | 3 |
| E-glyph | letter or digit: bounding box resampled to 5 x 7 against the 36-glyph font over the 8 variants | Jaccard >= 0.90 |

Templates (`vb_data.templates`):

| id | kind | size | window limit | whole limit |
|---|---|---|---|---|
| `cross3` | cross | 3 x 3 | 0.99 | - |
| `cross5` | cross | 5 x 5 | 0.8 | 0.8 |
| `cross6_arm2` | cross | 6 x 6 | 0.92 | - |
| `cross7` | cross | 7 x 7 | 0.8 | 0.8 |
| `latin5x7` | cross | 5 x 7 | 0.8 | - |
| `saltire3` | saltire | 3 x 3 | 0.99 | - |
| `saltire5` | saltire | 5 x 5 | 0.8 | 0.8 |
| `saltire7` | saltire | 7 x 7 | 0.8 | 0.8 |
| `star5` | star | 5 x 5 | 0.85 | 0.8 |
| `star7` | star | 7 x 7 | 0.85 | 0.8 |
| `star9` | star | 9 x 9 | 0.85 | 0.8 |
| `hexagram7` | star | 7 x 7 | 0.85 | 0.8 |
| `crescent5` | crescent | 5 x 5 | 0.85 | 0.8 |
| `crescent7` | crescent | 7 x 7 | 0.85 | 0.8 |
| `hooked5` | hooked | 5 x 5 | 0.85 | 0.8 |
| `rank2` | rank_chevrons | 5 x 6 | 0.75 | - |
| `rank2_thick` | rank_chevrons | 6 x 7 | 0.75 | - |
| `rank3` | rank_chevrons | 5 x 9 | 0.75 | - |

**Calibration and recall.** Fixtures (`fixtures.emblem_negatives`, 18): plus_thick: caught; plus_thin: caught; latin_cross: caught; saltire: caught; star_5pt: caught; hexagram: caught; crescent: caught; hooked_5: caught; hooked_8: caught; pinwheel: caught; letter_A: caught; letter_K: caught; digit_4: caught; three_band: caught; equals: caught; rank_chevrons_2: caught; rank_chevrons_3: caught; tricolour_vertical: caught. Recall on constructed clean shapes is 18 of 18. Two hand-drawn irregular shapes are known gaps (`fixtures.emblem_known_gaps`: an irregular 8 x 8 star, a thin-arc crescent): a Jaccard rule at 8 x 8 cannot separate an irregular star from a blob (best separating margin 0.69 against 0.65), and pretending otherwise would be a hollow check; they are held by reviewer rubric item 5 and by the free-decal ban. False positives found while tuning (and fixed by the rule above, not by tuning to the fixtures): a hollow rectangle with a gap read as the letter D or L at 0.85 (limit raised to 0.90; a window match is not enough, the whole bitmap must be glyph-like), and a coin or a paperclip read as a star or a hooked cross under native windows at 0.75 (limits raised to 0.85 and the rank / hook / cross windows padded).

**Ancient audit (informational, grandfathered):** lambda pass; eye pass; sun pass; boar pass; eagle would fail (template:star5(whole)@0.8); star pass; skull pass; wave pass; bolt pass. The Ancient `eagle` would fail the new star template; it ships in the Ancient Workshop and stays (plan 0.1). New eras cannot reuse it: their emblem lists are their own rows.

**VB-A2 rationale.** The Caution bible's "stacked upward chevrons" is rejected by `rank2`, `rank2_thick` and `rank3` (two or more chevrons stacked on one axis is the visual grammar of rank stripes). The emblem becomes one upward chevron over a tape-end block (`mod_chevron`, passes). The hazard-tape chevron REPEAT stays legal as the registered pattern `mod_tape_chevron` (3.7.5): a horizontal repetition of chevrons is tape, a vertical stack is rank.

#### 3.7.4 What cannot be a machine check

Lion, eagle, griffin, fleur-de-lis, laurel, bird of prey, roundel rings, skull-and-crossbones, hammer-and-sickle-like pairs, a clenched fist: no template (rasters at 8 x 8 do not separate them reliably; see the known gaps). They are banned by the bibles' emblem classes and enforced by (a) the registry (nothing outside the 18 rows can be stamped), (b) the free-decal rule (3.9.2) and (c) rubric item 5 on the lineup render.

#### 3.7.5 Registered patterns

A pattern is a tile (`rows`, `#` = class B) with a registered colour pair. A face whose two classes tile it (>= 95 percent of cells equal under some phase and class assignment) with class colours within 12 of the pair is accepted as that pattern and exempt from the layout bans of 3.6.2 (the pair itself must not be BLOCK). Rows: `med_lozenge` (Marrowby, orange + umber, 27.7), `mod_tape_chevron` (Caution, butter + black; the only black-on-butter layout), `mod_dots` (Skyclub, sky + white dots), `sf_diag_chevron` (Rummage, brass + soot, diagonal chevron only). New patterns are signed appends.

### 3.8 Team tint, glow trim and colour-vision separation

The battle shader multiplies the voxel colour of `F_TEAM` voxels by the team colour (`voxskin.js`: `vColor *= instanceColor`), so a tint carrier shows `base x team`; the three team palettes are `classic` (`#2f6bff` / `#e23b3b`), `cvd` (`#1b8cff` / `#ffa31a`), `contrast` (`#00e0ff` / `#ff2d95`).

#### 3.8.1 Team against team (the engine constant)

Carrier colour pair, dE00, per palette and view (rule: >= 15.0 everywhere):

| palette | normal | protan | deutan | tritan |
|---|---|---|---|---|
| classic | 44.5 | 50.7 | 60.9 | 67.6 |
| cvd | 57.6 | 60.6 | 66.6 | 63.4 |
| contrast | 78.5 | 31.0 | 26.9 | 75.7 |

All 12 cells pass (minimum 26.9, `contrast` under deuteranopia). A palette change in `style.js` re-runs this in T-fast (`NC-VB-06` mutates it).

#### 3.8.2 Carrier against its own faction's paint

A cell is (palette, team, view) with the palette's scope (`classic` and `contrast`: normal vision; `cvd`: all four views, because a colour-blind player chooses it). A cell **separates** when the carrier differs from its nearest body colour (primary or accent) by dE00 >= 12.0 or |dL*| >= 20.0 in that view. Failing cells oblige the faction's `tint.edge` rule: the carrier panel has a 1-voxel ink edge (dL* >= 35 against both neighbours on >= 60 percent of its perimeter), checked on the model (M-7) and on the lineup. The flag is derived and re-checked: `tint.edge` must be true wherever a cell fails (`NC-VB-05` removes it).

New eras:

| faction | failing carrier cells (palette c/v/k + team 0/1 + view n/p/d/t) | edge rule required |
|---|---|---|
| medieval:marrowby | 0/12  | no |
| medieval:yeomen | 2/12 c1p c1d | yes |
| medieval:gatehouse | 0/12  | no |
| medieval:bellfount | 1/12 c1n | yes |
| medieval:free_company | 2/12 c0t c0n | yes |
| medieval:wyrmkin | 2/12 c1p c1d | yes |
| modern:marmalade | 1/12 c1t | yes |
| modern:directorate | 0/12  | no |
| modern:skyclub | 1/12 c0n | yes |
| modern:caution | 0/12  | no |
| modern:briefing | 1/12 c1t | yes |
| modern:shed | 0/12  | no |
| scifi:tidy_concord | 4/12 c0n c0p c0d c0t | yes |
| scifi:rummage | 0/12  | no |
| scifi:courtesy | 2/12 c0p c0d | yes |
| scifi:skitter | 1/12 c1d | yes |
| scifi:glowmoss | 5/12 c0t c1n c1p c1d c1t | yes |
| scifi:quiet_hour | 2/12 c0p c0d | yes |

Ancient, shipped (no edge rule exists there):

| Ancient faction | failing cells |
|---|---|
| ancient:hellenes | 3/12 c0n c1p c1d |
| ancient:romans | 4/12 c1n c1p c1d c1t |
| ancient:egyptians | 4/12 c0t c1p c1d c1t |
| ancient:persians | 2/12 c1p c1d |
| ancient:carthage | 0/12  |
| ancient:barbarians | 4/12 c1n c1p c1d c1t |
| ancient:mythic | 4/12 c1n c1p c1d c1t |

Failure rate of the 12 cells per faction: Ancient 21 of 84 = 25.0 percent, Medieval 7 of 72 = 9.7, Modern 3 of 72 = 4.2, Sci-Fi 14 of 72 = 19.4. The rule "a new era's rate is not above Ancient's" holds with margin; the default-palette normal-vision cell fails for Bellfount (rose against the red team), Mostly Paid Company (cyan patch against the blue team: the patch IS the team colour in battle, so the only visible cyan is on chips), Skyclub, Concord and Glowmoss (jade against the red team), against Ancient's Hellenes, Romans, Barbarians, Mythic.

#### 3.8.3 Glow trim

Emissive voxels (`F_GLOW`, faction glow, lamps, lens, rim, tint glow) are capped per model: Sci-Fi 12 percent (the bible), Medieval 6, Modern 4 (initial values; recalibrate OI-6). Calibration: the Ancient 44 humanoid blueprints measure glow share min 0, median 0, max 3.3 percent (priest of Ra). The cap is checked per model (M-2) and the canonical 600-unit battle (ER17) judges the bloom. Dark bodies (Skitter plum, Quiet Hour ink) carry a 1-voxel highlight edge on the upper silhouette (lime tips, violet rim line); a cloaked unit keeps a 1-voxel team-colour rim (violet is additional decoration).

#### 3.8.4 Whole-unit team separation: why the VF threshold moves to the carrier (PC-2)

VF 3.16.1 defines `dE_team` as the mean-Lab difference of team 0 and team 1 pixels of the same type with a threshold of 15 in every CVD view. On the whole unit that cannot be met even by the shipped Ancient, because the body (the same on both teams) dominates the mean. Static prediction with the tint-share floors of UC-D07 (mirror = the same faction on both teams, minimum over factions and the four views, `classic` palette):

| tint share | era | mirror min (same faction both teams) | cross min (two factions) |
|---|---|---|---|
| 0.15 | ancient | 6.1 (romans, tritan) | 0.1 (persians/carthage, protan) |
| 0.15 | medieval | 5.8 (marrowby, tritan) | 1.8 (marrowby/bellfount, tritan) |
| 0.15 | modern | 4.7 (skyclub, protan) | 1.3 (caution/shed, protan) |
| 0.15 | scifi | 3.1 (quiet_hour, protan) | 4.2 (skitter/glowmoss, protan) |
| 0.3 | ancient | 13.2 (romans, tritan) | 4.1 (romans/carthage, tritan) |
| 0.3 | medieval | 12.4 (marrowby, tritan) | 2.3 (marrowby/gatehouse, tritan) |
| 0.3 | modern | 9.3 (skyclub, protan) | 4.4 (briefing/skyclub, tritan) |
| 0.3 | scifi | 6.4 (quiet_hour, protan) | 4.3 (rummage/quiet_hour, deutan) |

Ancient mirror is 6.1 at 15 percent share and 13.2 at 30 percent; cross-faction pairs (different armies, teams swapped) go down to 0.1. **Resolution:** `dE_team` is taken on carrier pixels only: the lineup renders every unit twice in the same pose, once as team 0 and once as team 1 (the sim spawns both; no new hook is needed beyond `capture` and `unitRects` of spec/RA 3.14), and the pixels whose colours differ between the two copies (dE00 > 4) are the carrier mask; threshold 15 in each CVD view (the static model predicts >= 26.9). The whole-unit number is reported and ratcheted against `tests/baseline/readability_ancient.json` as VF already does for Ancient.

#### 3.8.5 Per-era readability constraints

**medieval**

| id | constraint | check |
|---|---|---|
| MED-RC1 | heraldic colour never replaces the tint zone; the zone is where the eye goes (surcoat, sash, pavise face, bell hem, cyan patch, coin sack) at or above the UC floor | model M-7 |
| MED-RC2 | banner and cloth parts are flag-role faces: field + at most one glyph + one edge colour, cloth >= 3 voxels wide; faceVerdict applies | model M-3 |
| MED-RC3 | Mostly Paid Company: the cyan patch IS the team colour in battle; cyan as paint exists on chips, borders and Codex only | lineup L-4 |
| MED-RC4 | saturated grade: arena looks keep sat >= 0.85 (med_moor is the floor); no desaturated mud look | THEME_LOOK row test (RA-T13) |
| MED-RC5 | no blood or wound detail; glow <= 6 percent of voxels except the Cinderwyrm belly (declared in meta.vb.glowAllow) | model M-2 |

**modern**

| id | constraint | check |
|---|---|---|
| MOD-RC1 | the tint carrier is a saturated panel in the team colour on the named part; the pastel hull around it stays untinted | model M-7 |
| MOD-RC2 | every hull has a one-voxel charcoal ink edge on its lower silhouette; the charcoal share is darkened before the primary when a hull fails against concrete, asphalt, paving or lino | lineup L-5 |
| MOD-RC3 | no brick-red buildings; pin red #e2483d only on the pushpin; houses use the pastel set at lower saturation | props palette membership |
| MOD-RC4 | muzzle flashes are round puffs and tracers pea-coloured dashes; knock-out is a hat pop and a ring of round dots | judged (rubric 7) |
| MOD-RC5 | no camouflage anywhere; the only stripes in the game are the Grand Mower lawn trail (two mint tones) and registered tape chevrons | model M-3 mottle + pattern registry |

**scifi**

| id | constraint | check |
|---|---|---|
| SF-RC1 | glow budget: emissive voxels (faction glow, tint carrier, lamps, pads, lens, rim) < 12 percent of a model; the 600-unit canonical battle (ER17) judges the bloom | model M-2 |
| SF-RC2 | team tint is a glow strip, panel or lamp ring in the TEAM colour, never the faction colour; a cloaked unit keeps a 1-voxel team rim | model M-7 |
| SF-RC3 | dark bodies (Skitter plum, Quiet Hour ink) carry a 1-voxel highlight edge on the upper silhouette; look-dev records the worst contrast against regolith, basalt, neon_pad and asphalt night | lineup L-5 |
| SF-RC4 | greyscale read at 40 px matches the factions.md table (brightest = Concord, thin vertical sliver = Quiet Hour, ...) | lineup L-3 + judged |
| SF-RC5 | the bubble is the instanced R3 layer in the TEAM colour, never unit geometry and never the faction colour | model M-6 + judged |


Faction colour against its own era's floor materials (spec/W 3.4.2 `top` colours), the 8 of 432 (faction colour, material) pairs under 8.0, where the unit needs its ink edge in that arena (feeds ER17 `dE_ring`):

| dE00 | faction colour | on material |
|---|---|---|
| 4.4 | scifi:skitter primary | sf_acid |
| 4.5 | scifi:rummage accent | sf_ember_basalt |
| 4.7 | scifi:courtesy accent | sf_hull |
| 5.0 | scifi:quiet_hour accent | sf_crystal |
| 5.0 | scifi:tidy_concord accent | sf_lab_tile |
| 7.4 | modern:directorate accent | mod_lino |
| 7.5 | modern:marmalade accent | mod_asphalt |
| 8.0 | medieval:marrowby accent | med_lists_sand |

### 3.9 Model rules

#### 3.9.1 The rules and who checks them

| rule | eras | check | mechanical? |
|---|---|---|---|
| no letters or numbers on any model, cloth, decal, prop or sign | all | M-3 glyph windows (5 x 7 font, 0.88), M-4 free-decal ban, emblem E-glyph | yes |
| no cross, star or crescent at flag size (a face >= 3 x 3; plus-shaped bars spanning >= 60 percent of the face) | all | M-3 `faceShapes` (window + whole templates, cross bars at span 0.60) | yes; irregular hand-painted stars are the known gap |
| no three-band flag layout, no flag-sized two-colour split in a RESTRICT pair | all | M-3 `faceLayout` + banned bands | yes |
| no chequer / lozenge / stripe in a RESTRICT pair | Medieval (orange + cream), Modern, Sci-Fi | M-3 + pattern registry | yes |
| no camouflage, mottle, olive-drab or khaki uniform | all | M-3 `mottle`, M-8 uniform cap, banned singles | yes |
| no flags, pennants or banners at all in Modern and Sci-Fi (emblems live on hulls, lids, rims, caps, pods, bezels); Medieval cloth is one field + at most one registered glyph + one edge colour (swallow-tail or pennant cut), the Rolling Keep banner is a plain frost pennant | all (rule differs) | Modern / Sci-Fi: `meta.vb.flag` must be empty on unit models and the era prop catalogue has no cloth prop; Medieval: M-3 on every `meta.vb.flag` part | yes |
| no white mantle with a dark cross, no all-black plate with a white charge, no black cloak with wide-brim hat and beak (plague-doctor image) | Medieval | M-3 shapes + adjacency bans + rubric 5 | partly |
| no real helmet, uniform or franchise silhouette (steel helmet, chin-guard, plague-doctor hat and cloak, tabards of real orders) | all | rubric 5 | judged |
| no real insignia: roundel, tail flash, invasion stripes, shark mouth, rank chevrons, protected medical emblems | Modern, Sci-Fi | rank / cross / star templates + rubric 5 | partly |
| weapon silhouettes copy no famous model; vehicles are household objects; mechs are appliances; aliens burst from nothing | Modern, Sci-Fi | rubric 5 and 6 | judged |
| spinners (rotor hubs, fans, dish struts, drone frames) have straight symmetric arms, no right-angle hook | Modern, Sci-Fi | E-pin on the top-view silhouette of the part (silhouette hash tool of spec/RA) + rubric | partly |
| aircraft carry only the faction emblem on the underside; drone frames are discs or rounded squares, never a plus | Modern, Sci-Fi | M-4 markings + E-cross on the top silhouette | yes |
| the bubble is the instanced R3 layer, never unit geometry and never faction-coloured | Sci-Fi | no part with `meta.bubble`; rubric 8 | judged |
| the glowing weapon is short and silent (the shiv is 2 x 2 x 6) | Sci-Fi | M-6 `glowBlade` (>= 90 percent glow, section <= 3 x 3, length >= 12) | yes |
| tone: no wound detail, no blood, no gore, no scorched corpse; knock-outs are comic | all | rubric 7, `CU4` gore matrix | judged |
| silhouette / far-mesh / part budgets | all | spec/RA `farLint`, UC | not VB |

#### 3.9.2 `meta.vb` and the free-decal ban (q3_product residual 20)

Models are built from code, so provenance of a painted region must be declared. Builders add to the ModelDef meta (a free object, like `meta.farKeep`; no engine change):

```js
meta.vb = {
  flag:     ['banner', 'offhand'],                       // part ids whose outer faces are flag-role surfaces (cloth, tabard, shield face, caparison)
  markings: [{ part: 'body', face: '+z', at: [4, 10], emblem: 'mod_clip', mirror: false }],   // registry emblem stamped at (u, v) on a face
  patterns: [{ part: 'offhand', face: '+z', id: 'mod_tape_chevron' }],                       // registered pattern covering a face
  glowAllow: 0.12,                                       // only where an era cap is exceeded by design (Cinderwyrm belly), with a REVIEWER note
};
```

`vbscan` M-4 finds, for every part face, connected regions (4-neighbourhood) of one colour class that differs from its surrounding by dE00 > 15 and covers 4 to 64 voxels; each must equal a declared `markings` entry (bitmap equal to the registry row, identity or mirror) or lie inside a declared pattern face. An undeclared region is a free decal and fails. Regions under 4 voxels (rivets, eyes) and over 64 (panels) are body paint. On the part id `head` (hum1) regions of up to 8 voxels (eyes, brows, mouth) are exempt; larger head regions follow the rule, so a helmet crest or painted mark must be a registered emblem or pattern. This turns "no letters / numbers / crosses / stars" into a check on registry bitmaps plus a ban on free painting, as q3_product residual 20 asked. The finder is implemented and tested in the library (`markingsOf`): registered emblems are located exactly (identity or mirror, clear margin) and removed; what remains is judged by area and contrast.

| fixture | case | registered emblem found | undeclared regions | result |
|---|---|---|---|---|
| MK-1 | registered paperclip on a charcoal field | mod_clip | 0 | as expected |
| MK-2 | the same emblem mirrored left-right | mod_clip | 0 | as expected |
| MK-3 | a free 3 x 3 blob | - | 1 | as expected |
| MK-4 | the emblem with one extra voxel is a free decal | - | 4 | as expected |
| MK-5 | a 2-voxel rivet is body paint | - | 0 | as expected |
| MK-6 | a 10 x 10 panel (100 voxels) is body paint | - | 0 | as expected |
| MK-7 | a low-contrast patch (dE00 under 15) is shading, not a marking | - | 0 | as expected |

#### 3.9.3 The flag-size face algorithm (`faceLayout`, `faceShapes`, `faceVerdict`)

For one outer face of a flag-role part (2-D grid of colour classes, -1 = empty):

1. **Strip registered emblems:** every exact placement (identity or mirror, with a 1-cell clear margin) of a registry bitmap is repainted with the surrounding field class, so a signed emblem is never re-judged as a cross or a letter.
2. **Layout:** bounding box >= 3 x 3 and >= 60 percent filled, else `small` / `sparse`. `plain` (one class). `split` / `bands(k)`: >= 85 percent of rows (or columns) uniform in one class, k runs. `diagonal`: invariant under exactly one unit diagonal shift. `check`: >= 4 shifts (2..12 voxels) with self-similarity >= 0.92, >= 2 half-period shifts with self-similarity <= 0.35, two independent high shifts (a checker or a lozenge lattice; blotches fail it). `charge`: one class >= 60 percent. `mottle`: >= 3 classes of >= 12 percent with none of the above. `mixed`: the rest.
3. **Shapes:** each class mask (share >= 15 percent) against the templates in `window` and `whole` mode and the cross-bar rule at span 0.60; glyph windows (0.88).
4. **Colours:** the classes with >= 12 percent share are the dominant set; for `split`, `bands`, `check` (not a registered pattern) it is scanned against every banned tuple and sub-pair with limit 20; for a `charge`, `mixed`, `mottle` or `diagonal` face of a flag-role part with limit 8. A face with three or more bands is rejected as a three-band layout whatever the colours.
5. **Adjacency bans** of the faction (`adjacency_bans`: colour pairs within 6.0 of each other touching along >= 6 voxel edges).

Fixtures (all in the selftest). Layouts:

| fixture | kind | bands | shapes | expectation |
|---|---|---|---|---|
| plain | plain | - | - | plain ok |
| split_h | split | 2 | - | split ok |
| tri_h | bands | 3 | - | bands ok |
| tri_v | bands | 3 | - | bands ok |
| stripes5 | bands | 5 | - | bands ok |
| check1 | check | - | saltire | check ok |
| check2 | check | - | - | check ok |
| check3 | check | - | - | check ok |
| lozenge | check | - | - | check ok |
| diag_stripes | diagonal | - | - | diagonal ok |
| glyph_on_field | charge | - | - | charge ok |
| camo14 | mottle | - | - | mottle ok |
| cross_flag | mixed | - | cross | cross ok |
| crescent_field | charge | - | crescent | crescent ok |

Reject and accept fixtures (the machine half of the named reject examples, plus the accept controls that prove the rules do not over-reject):

| fixture | era | case | result | reasons fired |
|---|---|---|---|---|
| MED-R1 | medieval | The Crusader Special | as expected | shape:cross:cross5@1; shape:cross:cross6_arm2@1; shape:cross:cross7@1 |
| MED-R2 | medieval | The Tricolour Herald | as expected | layout:three_band(3); ref:flag_rwb_01@8.4(bands) |
| MED-R3 | medieval | Lion Rampant Pavise | as expected | ref:flag_brg_01/bc@5.9(charge) |
| MED-X1 | medieval | orange + cream chequer (Marrowby rule) | as expected | ref:flag_rwb_04/ab@14.5(check) |
| MOD-R1a | modern | The Army Surplus Special (camouflage jacket) | as expected | layout:mottle(camouflage-like) |
| MOD-R1b | modern | The Army Surplus Special (shoulder number) | as expected | glyph:7@1 |
| MOD-R2a | modern | The Roundel Flypast (white star) | as expected | shape:star:star7@0.857; shape:star:star9@1; shape:star:star9@1 |
| MOD-R2b | modern | The Roundel Flypast (invasion stripes) | as expected | layout:three_band(6); ref:flag_bw_01@0.0(bands) |
| MOD-R3 | modern | The Red Cross Satchel | as expected | shape:cross:cross5@1; shape:cross:cross6_arm2@1; shape:cross:cross7@1 |
| MOD-X1 | modern | butter + black horizontal bands (hoarding) | as expected | layout:three_band(4); ref:flag_brg_01/ac@12.9(bands) |
| SF-R1 | scifi | The Plastic Patrol (black joints on ivory) | as expected | shape:hooked:hooked5@0.81; shape:cross:cross3@1; shape:cross:cross5@1 |
| SF-R2 | scifi | The Humming Blade (long single-colour glow blade) | as expected | glow_blade |
| MED-A1 | medieval | Marrowby banner: orange field, one cream stool glyph | as expected | pass |
| MED-A2 | medieval | Marrowby caparison: orange + umber lozenge lattice | as expected | pass |
| MOD-A1 | modern | Directorate hull: charcoal with one cream paperclip | as expected | pass |
| MOD-A2 | modern | Caution hoarding: butter + black tape chevrons | as expected | pass |
| MOD-A3 | modern | Skyclub balloon: sky body with white dots | as expected | pass |
| SF-A1 | scifi | Quiet Hour cape: ink with a violet door-ajar emblem | as expected | pass |

The Marrowby banner (orange field, cream stool glyph, 14.5) is accepted and the orange + cream chequer is rejected by the same code; the Directorate hull with a cream paperclip and the Quiet Hour cape with the door emblem are accepted because hull / cape faces are not flag-role and their emblems are registered.

#### 3.9.4 Palette membership and caps, calibrated on the Ancient corpus (M-1, M-2)

M-1 off-palette share: voxels (not tint, not glow) whose nearest allowed colour (faction primary, accent, trim, cloth, metal ramps, skin, hair, eye, era neutrals) is further than 12.0 dE00. Measured on the 44 Ancient humanoid blueprints (`report --section corpus`): share min 0, median 0.1 percent, p90 4.4, max 6.9 (worst: pharaoh 6.9%, axe_thrower 6.5%, medusa 6.4%). **Bar for new units: 8.0 percent** (Ancient max 6.9 plus margin for the extra era palette modules). Role caps (initial, recalibrated at the first built units, OI-6): trim <= 20 percent and metal <= 15 percent of the non-tint pixels; glow per era (3.8.3). Tint share is UC's (Ancient humanoid voxel share min 24 percent, median 40).

### 3.10 Arena palettes per time of day (q3_program residual 28, W 3.4.2)

Input: the 36 new material rows of spec/W (`top` colours, `strata`) plus the 16 Ancient ones (parsed by the tool from `docs/eras/spec/W.md` and `src/world/arena.js`; `vbscan` reads the registry `materials` instead) and `materialShare(arena)` from `world/vocab.js`. A material triple can only read as a flag when three materials form parallel bands, so the test has two levels: (1) colour: the three highest-share materials (share >= 10 percent) of an arena, top colours graded by the arena's `THEME_LOOK` row and each of the four times of day (`vb_data.times`), against the 3-colour tuples with the same bands (BLOCK 8, flag 20); (2) layout: only for a flagged triple, `faceLayout` on the arena's material-id grid (cell 2 x 2) reduced to those three classes; `bands(3)` fails the arena. Static pre-pass over all triples of each era (own block + the 16 Ancient ids), noon (the section takes about 10 s, 9 million CIEDE2000 evaluations, so it runs in T-era, not T-fast):

| era | material rows (own + Ancient 16) | 3-material triples | flagged < 20 | blocked < 8 |
|---|---|---|---|---|
| medieval | 28 | 3276 | 106 (3.2%) | 2 |
| modern | 28 | 3276 | 84 (2.6%) | 2 |
| scifi | 28 | 3276 | 158 (4.8%) | 0 |

By time of day the flagged counts change (Medieval dawn 107, noon 106, dusk 41, night 48; Modern 77 / 84 / 36 / 33; Sci-Fi 126 / 158 / 113 / 45): noon is the worst case and dusk / night shrink the set, so a recipe passes the per-time test whenever it passes at noon, and `vbscan` runs all four anyway because lighting is data. Blocked (< 8) triples, to be listed in W's recipe test as "never paint these three as parallel bands": Medieval `snow + lava + med_bluebell` and `marble + lava + med_bluebell` (7.7 from an orange-white-green set), Modern `snow + lava + mod_felt` and `marble + lava + mod_felt` (7.3), Sci-Fi has no triple under 8 at noon; the closest are `snow + lava + sf_spore_soil`, `marble + lava + sf_spore_soil` and `lava + sf_spore_soil + sf_lab_tile` at 8.6 (flagged, not blocked). Flagged triples are otherwise allowed unless they form bands.

### 3.11 Chrome tokens and fonts (q3_product residual 30)

Era identity is carried by colour tokens, patterns, icons and shapes; the only fonts are Bungee, Rubik, Cinzel from the existing Google Fonts link (AGENTS.md; spec/CU 3.6.7 already states it, the chrome census checks computed fonts). VB adds the colour distance: each era's `--era-accent` against the other eras' accents and every Ancient chrome token >= 15.0:

| token | value | nearest other-era accent or Ancient token | dE00 |
|---|---|---|---|
| medieval.accent | `#c8501e` | ancient.gold | 38.7 |
| modern.accent | `#12a37f` | ancient.olive | 22.3 |
| scifi.accent | `#35e0ff` | modern.accent | 29.0 |

(The Sci-Fi alarm red, the Modern pin red and the Modern cover cyan are reserved single-use tokens, not accents, and are exempt; the Sci-Fi warn amber sits 8.7 from the Ancient gold chrome and is accepted by feel sheet 9 as a warning colour inside dark screens.)

**THEME_LOOK skies (S-slice SLP-9 "palette, THEME_LOOK too close to another era").** `report --section looks` takes the sky pair (zenith, horizon, spec/RA 3.10; the Ancient default day sky is `#3a78c4` / `#bfdcf2` from `engine.js`) of every new look and its nearest look of another era, max element, best assignment. It is informational and ratcheted, not a bar: 8 of 21 new looks have a sky within 8 of a look of another era; the closest: med_meadow ~ mod_water 1.5, mod_water ~ med_meadow 1.5, med_ford ~ mod_water 2.6, mod_field ~ med_ford 2.6. Clear-day skies of Medieval and Modern are near duplicates of each other and of the Ancient sky by design (a blue sky is a blue sky); era identity is carried by materials, props, palette and the Sci-Fi non-Earth looks, and the arbiter is ER21's blind era classification, not this number.

### 3.12 `tools/vbscan.mjs` (ER3b; TOOLS-VERIFY, P1; imports `tools/vb_distance.mjs`)

```
node tools/vbscan.mjs --era=<medieval|modern|scifi|ancient|all> --stage=<palette|emblem|model|lineup|panel|all>
     [--data docs/eras/spec/vb_data.json] [--registry .cache/gate/registry.json] [--baseline tests/baseline/vb_ancient.json]
     [--ids=<unit,prop,...>] [--allow-pending] [--json] [--record-ancient] [--emit-fixtures]
```

`--ids` restricts the model and lineup stages to the named unit / prop ids (the mechanic slices of S-slice G0-M6 scan "the additions" this way; the palette and emblem stages are always whole-era).

**Stages and checks** (tiers: palette and emblem T-fast, model T-era, lineup R, panel agent):

| stage | inputs | checks (threshold keys of `vb_data.thresholds`) |
|---|---|---|
| palette | `vb_data.json`; registry `palettes` append arrays and `FACTIONS` rows; Ancient via `loadAncient()` | P-1 primaries in-era >= 20.0; P-2 cross-era >= 16.5 or the accent escape; P-3 internal contrast >= 12.0; P-4 graded pre-pass >= 12.0; P-5 banned scan: zero BLOCK, RESTRICT rows listed; P-6 registry palette rows equal `vb_data` rows (no extra colour); P-7 `tint.edge` equals the derived requirement; P-8 chrome accents >= 15.0; P-9 team carrier pairs >= 15.0 in all four views; P-10 body colours >= 8.0 with body clauses |
| emblem | registry `emblems` append arrays; `vb_data.emblems`, templates, glyphs | E-1 every registry emblem has a row with equal hash and both signatures; E-2 `evalEmblem` passes; E-3 every negative fixture rejected; E-4 no marking outside the registry (M-4); E-5 Ancient rows measured and ratcheted |
| model | compiled `ModelDef` of every unit and prop of the era (voxel grids with `F_TEAM` / `F_GLOW`), `meta.vb` | M-1 off-palette <= 8 percent; M-2 trim, metal, glow caps; M-3 `faceVerdict` on every flag-role face; M-4 free-decal ban; M-5 adjacency bans; M-6 glow blade; M-7 tint carrier parts hold `F_TEAM` at the UC floor and, with `tint.edge`, the edge rule; M-8 uniform share cap |
| lineup | per faction: one PNG of all its units side by side at the default camera plus the control frame with units hidden (`window.__vw.render.capture` and `unitRects`, spec/RA 3.14); the team-0 and team-1 copies of every unit | L-1 dominant clusters (k = 5 in Lab, fixed seed, non-tint non-ring pixels) within 12 of the declared palette, off-palette <= 8 percent; L-2 top-3 clusters (share >= 8 percent) through the banned bands; L-3 greyscale luminance order of the factions against the Sci-Fi table, recorded and ratcheted; L-4 carrier-mask `dE_team` >= 15 in every CVD view, whole-unit value reported and ratcheted; L-5 `dE_ring` and `Lw` against the era floors for pastel and dark bodies (the ER17 definitions); L-6 emissive share |
| panel | lineup PNGs, planted rejects (3.13) | R-1 rubric CSV complete for the sample; 3 of 3 planted rejects rejected |

**Outputs.** `.cache/gate/vbscan/<era>.json` and `.csv` with columns `stage,item,check,value,limit,verdict,reason`; criteria rows for `criterion("ER3b")`; the verdict `RESTRICT` is a pass with the row listed. **Exit codes:** 0 all pass; 1 at least one FAIL; 2 usage or input error; 3 UNVERIFIED (a render stage was requested and could not run; never counted as pass). `--record-ancient` writes `tests/baseline/vb_ancient.json` once (two signatures, author cannot sign); afterwards an Ancient value fails only when worse than the baseline. `--emit-fixtures` writes `tests/fixtures/vb_banned.json` (Lab values and bands per tuple, no `src`) and `tests/fixtures/emblems_allow.json` (id, hash, signatures).

**Negative controls (registered with the check, `NC-VB-01..14`, all run by `selftest` and by `tests/negctl/ER3b/`):**

| id | mutation | rejected by |
|---|---|---|
| NC-VB-01 | a new primary moved to 6 from another primary of its era | modern:skyclub/modern:shed |
| NC-VB-02 | a new primary within 10 of an Ancient display primary | ancient:hellenes/medieval:yeomen |
| NC-VB-03 | a faction pair set to a national red-white pair | BLOCK modern:marmalade vs flag_rwb_03/ab max element 5.9 < 8 |
| NC-VB-04 | a faction primary equal to the uniform olive reference | BLOCK modern:marmalade vs uni_olive_01 max element 0.0 < 10 |
| NC-VB-05 | tint.edge removed from a faction with failing carrier cells | scifi:tidy_concord has 4 failing carrier cells but tint.edge is not declared |
| NC-VB-06 | team palette collapsed to two near colours | team palette classic normal carrier pair 2.3 < 15 |
| NC-VB-07 | an emblem row with a cross bitmap | emblem med_stool: template:cross5(whole)@1; template:cross6_arm2(window)@1; cross_bars@1.0 |
| NC-VB-08 | an emblem row whose bitmap changed without a new hash | emblem med_hedgehog: stored hash 36b0609d != 0bed7cdb |
| NC-VB-09 | an emblem row shaped as a letter | emblem med_gate: glyph:A@1 |
| NC-VB-10 | a layout fixture expectation flipped (three bands expected plain) | layout fixture tri_h: got kind bands shapes [], expected kind plain shape undefined |
| NC-VB-11 | a duplicate emblem id | duplicate emblem id med_stool |
| NC-VB-12 | a faction accent made equal to its primary | internal contrast scifi:tidy_concord 0.0 < 12 |
| NC-VB-13 | the body clause removed from a pair of near-identical dark bodies | body colours scifi:skitter/quiet_hour 8.5 < 20 without a body clause that separates them b |
| NC-VB-14 | a free three-voxel blob expected to be allowed on a face | marking fixture MK-3 (a free 3 x 3 blob): registered [] undeclared 1, expected [] 0 |

NC-VF-42 of VF ("add a banned reference colour to a faction palette") is NC-VB-03.

### 3.13 Reviewer rubric on the lineup render, three named reject examples per era

**Rubric** (applied to every model, decal and prop; answers recorded in the model checklist and in the look-dev JSON `vb` block of RA-T25):

| n | question | kind |
|---|---|---|
| 1 | Does the silhouette read as the unit role (and, for Sci-Fi, the faction adjective in greyscale) at 40 px? | judged |
| 2 | Does the defining feature survive at the switch distance and at 80 u (RA-T25 farKeep recall)? | tool+judged |
| 3 | Is the tint carrier where the eye goes, at or above the UC floor, separable from the body (edge rule when tint.edge)? | tool+judged |
| 4 | Do all colours pass the palette test and every banned pair and layout (vbscan palette, model, lineup)? | tool |
| 5 | Is anything on the banned content list present: letter, number, cross, star, crescent, roundel, bird of prey, lion, hooked arm, camouflage, three-band layout, real uniform, real helmet, franchise silhouette? | tool+judged |
| 6 | Is it funny without a caption (the blurb could be guessed from the model)? | judged |
| 7 | Is the knock-out, power-down or splorp readable and kind (no wound, no blood, no scorch)? | judged |
| 8 | Era item: Medieval = no real arms and no order tabard; Modern = pastel hull reads on all four floors; Sci-Fi = bubble is the R3 layer, glow under 12 percent, dark body has its edge. | tool+judged |

Reject rule: a unit is REJECTED when item 4 or 5 fails, or when any two of the others fail; a single failing 1, 2, 3, 6, 7 or 8 is a FIX with re-review, counted against the iteration cap of spec/RA 3.17 (infantry 2, vehicle 3, boss / hero 4).

**Panel protocol (the agent-judged residue, named).** Reviewer: a named fresh agent that built nothing in the era and has not seen builder notes. Sample: 12 units per era drawn by `RNG(hash(era + ':VB'))` from the lineup, plus every hero and boss, plus the planted rejects. **Planted rejects:** the three named examples below are built as real models under `tests/fixtures/vb_rejects/<era>_<n>.js` (the unit builder with the forbidden paint applied; P2, OI-5) and mixed blind into the sample; the reviewer must reject 3 of 3 or the verdict CSV is void and the panel is rerun by another agent. Output: CSV `unit,item,verdict,reason`; it appears in the PANEL / unverified list of the final message together with the sentence that comedy, feel and readability were judged by model panels (plan section 9).

**Named reject examples** (from the bibles, adopted; `machine` = what `vbscan` already rejects, `judged` = rubric-only; fixtures in 3.9.3):

**medieval**

| id | name | unit | the paint | machine rejects (fixtures, in the selftest) | model arm on the planted model | judged | the fix |
|---|---|---|---|---|---|---|---|
| MED-R1 | The Crusader Special | `knight_errant` | white tabard with a red cross on chest and shield | shape:cross at flag size; ref: red/white sets (BLOCK) (MED-R1) | - | holy-war reference | orange + umber lozenges and the stool glyph |
| MED-R2 | The Tricolour Herald | `standard_bearer` | banner cloth in three horizontal bands red, white, blue | layout:three_band; ref: red-white-blue sets (MED-R2) | - | - | two-colour swallow-tail in the faction primary with one glyph |
| MED-R3 | Lion Rampant Pavise | `pavise_bearer` | golden lion rampant on a red board | ref: red/gold sets (BLOCK band on a charge) (MED-R3) | - | a lion is real heraldry | pale steel board with the frost cat-flap gate |

**modern**

| id | name | unit | the paint | machine rejects (fixtures, in the selftest) | model arm on the planted model | judged | the fix |
|---|---|---|---|---|---|---|---|
| MOD-R1 | The Army Surplus Special | `tin_hat_trooper` | olive drab, mottled camouflage jacket, flat-brim dish helmet with chin net, white shoulder number | layout:mottle; glyph:7 (MOD-R1a, MOD-R1b) | M-8 uniform share cap and the olive single, on the planted model (OI-5) | helmet silhouette of a real army | peach jacket, biscuit-tin lid hat with knob, team-colour helmet band |
| MOD-R2 | The Roundel Flypast | `fishbowl_chopper` | concentric red/white/blue rings on the tail boom, white star on the cabin door, black-and-white stripes under the stub wings | shape:star; layout:three_band with black-white ref (MOD-R2a, MOD-R2b) | M-4 undeclared marking on the tail boom, on the planted model (OI-5) | concentric roundel rings (no ring template) | sky + white paper-plane emblem on the rotor rim and cap only |
| MOD-R3 | The Red Cross Satchel | `site_first_aider` | white cross on a red satchel flap and a red cross decal on the helmet | shape:cross at flag size (MOD-R3) | M-4 undeclared marking on the helmet, on the planted model (OI-5) | protected medical emblem | mint-green first-aid box with one diagonal plaster, bandage roll, lollipop |

**scifi**

| id | name | unit | the paint | machine rejects (fixtures, in the selftest) | model arm on the planted model | judged | the fix |
|---|---|---|---|---|---|---|---|
| SF-R1 | The Plastic Patrol | `tidy_trooper` | glossy white armour with black joints, black chin-guard helmet with T visor, white carbine | adjacency ivory/black (SF-R1) | - | chin-guard helmet and franchise trooper set | fishbowl helmet with azure rim, ivory suit with round azure pods, tank backpack, slab pulse rifle |
| SF-R2 | The Humming Blade | `veil_cutter` | one-metre single-colour glowing blade, hooded black-and-red robe, red-lit chin vent | glow_blade (>= 90 percent glow, section <= 3x3, length >= 12 voxels) (SF-R2) | M-5 adjacency ink/red on the robe, on the planted model (OI-5) | franchise weapon and dark-order robe | hooded ink sliver with violet rim line, 2x2x6 silent shiv with edge glow only, door-ajar cape hem |
| SF-R3 | The Dome with Teeth | `plate_beetle / hive_queen` | glossy black ribbed elongated skull, inner jaw, tail, acid blood, ribs through the chest | none | - | biomechanical creature silhouette: judged only, planted-reject calibration applies | plum shell with hex shimmer and a tiny head (beetle); egg-sac abdomen with antler crown and six legs (queen); lime glow tips; splorp death |


Watch list (flagged for the reviewer, not rejected on sight; unchanged from the bibles, extended by this file): Medieval physician in a dark coat with a hat, Cinderwyrm banner in red and white, plague cart ox patch shaped as a cross, a map pin drawn as two crossing lines; Modern deputy with a bird on the stamp, Behemoth dish with radiating rays, drone from above as a plus, bent-tip spinner arms, hoarding with three horizontal black stripes (rejected by M-3 unless the registered chevron pattern), lectern with a pink triangle, balloon in horizontal blue and white bands, mower trail in three tones, pastel hull vanishing on concrete; Sci-Fi Concord pod drawn as a filled disc, valet drone as a plus, a Concierge face showing anything but a smile or frown glyph, Shepherd staff head as a green ring, Tender dish with more than six beacons, exhaust stack with horizontal black-and-yellow bands, lens inside a triangle at any LOD, manta wing with a swoosh and stars, white hull vanishing on ice, Hummock lamp with radiating rays.

### 3.14 Files and ownership

| path | owner | reviewer | note |
|---|---|---|---|
| `docs/eras/spec/VB.md` | DESIGN-ERA (all three eras) | REVIEWER | this file |
| `docs/eras/spec/vb_data.json` | DESIGN-ERA | REVIEWER | single data source; signed append or logged amendment |
| `tools/vb_distance.mjs` | DESIGN-ERA until P0 exit, then TOOLS-VERIFY | REVIEWER | library and report CLI; any change re-runs `selftest` and `check` |
| `tools/vbscan.mjs` | TOOLS-VERIFY | REVIEWER | ER3b, P1 |
| `tests/verify/vb_distance.test.mjs` | TOOLS-VERIFY | REVIEWER | `selftest` + `check`, T-fast (about 3 s) |
| `tests/negctl/ER3b/NC-VB-01..14.mjs` | TOOLS-VERIFY | REVIEWER | mutation + expected failing check |
| `tests/baseline/vb_ancient.json` | TOOLS-GOLDEN | REVIEWER | recorded once, two signatures |
| `tests/fixtures/vb_banned.json`, `emblems_allow.json` | generated | none | `vbscan --emit-fixtures` |
| `tests/fixtures/vb_rejects/<era>_<n>.js` | DESIGN-ERA + TOOLS-VERIFY | REVIEWER | planted reject models, P2 |
| `src/content/era_<id>/{palettes,emblems}.js` (registry append arrays) | UNITS-<era> (rows), AR (kind) | REVIEWER | rows equal `vb_data.json` |
| `docs/eras/design/<era>/{factions,visual_bible}.md` | DESIGN-ERA-<era> | REVIEWER | inputs; amendments VB-A1..A5 integrated by the era owner |

## 4. Acceptance

All scripts run in Node 22 with no network and no browser unless the tier says otherwise. Owner TOOLS-VERIFY unless stated.

| id | script | inputs | threshold | owner | tier | negative control |
|---|---|---|---|---|---|---|
| VB-T01 | `node tools/vb_distance.mjs selftest` | the 34 Sharma pairs, Lab spot values, CVD matrices | max abs error <= 6e-5; rows sum to 1; grey preserved; band edges | TOOLS-VERIFY | F (about 2 s) | break the hue-rotation term: Sharma rows red |
| VB-T02 | `node tools/vb_distance.mjs check` | `vb_data.json`, Ancient sources | exit 0: primaries (20.0 / 16.5), pairs, bodies (8.0 and CVD 4.5), graded, banned (0 BLOCK), team, emblems, layouts, markings, rejects, chrome | TOOLS-VERIFY | F (about 1 s) | NC-VB-01, 02, 03, 04, 05, 06, 07, 12, 13, 14 |
| VB-T03 | `selftest` negative controls | `vb_data.json` | NC-VB-01..14 each rejected by the check they target | TOOLS-VERIFY | F | the controls are the negative controls |
| VB-T04 | emblem fixtures in `selftest` | 18 negatives, 18 proposed rows | 18 of 18 negatives rejected, 18 of 18 rows pass, hashes equal | TOOLS-VERIFY | F | NC-VB-07, 08, 09, 11 |
| VB-T05 | layout / marking / reject / accept fixtures in `selftest` | 14 + 7 + 12 + 6 fixtures | 39 of 39 as expected | TOOLS-VERIFY | F | NC-VB-10, NC-VB-14 |
| VB-T06 | `vbscan --stage=palette --era=all` | registry palette rows | P-1..P-10 pass; registry rows equal `vb_data` | TOOLS-VERIFY | F | NC-VF-42 (= NC-VB-03) |
| VB-T07 | `vbscan --stage=emblem --era=all` | registry emblems | E-1..E-5; no `--allow-pending` in T-full | TOOLS-VERIFY | F | NC-VB-07, 08 |
| VB-T08 | `vbscan --stage=model --era=<e>` | compiled models, `meta.vb` | M-1..M-8 on every unit and prop of the era; Ancient ratchet | TOOLS-VERIFY | E | paint a unit with an olive mottle; stamp an undeclared region |
| VB-T09 | `vbscan --stage=lineup --era=<e>` | lineup PNGs, control frames, team-0 / team-1 copies | L-1..L-6 | TOOLS-VERIFY | R (Chromium) | render a faction with a banned band |
| VB-T10 | reviewer panel | lineup PNGs, planted rejects | rubric CSV complete; 3 of 3 planted rejects rejected; 0 failures of items 4 and 5 | REVIEWER (fresh agent) | R (agent) | a missed planted reject voids the panel |
| VB-T11 | `node tools/vb_distance.mjs report --section corpus` | Ancient 44 blueprints | off-palette p90 and max recorded into `tests/baseline/vb_ancient.json`; new bar 8 percent | TOOLS-GOLDEN | E | n/a (measurement) |
| VB-T12 | `tests/verify/vb_distance.test.mjs` | the above | VB-T01..T05 inside the gate | TOOLS-VERIFY | F | delete a fixture: count test red |

Measured now (this session, `node tools/vb_distance.mjs selftest` then `check`): selftest ok (34/34 Sharma, 18/18 emblem negatives, 18/18 proposed emblems, 14/14 layouts, 18/18 reject-accept fixtures, 14/14 negative controls rejected), check ok (0 violations), runtime about 1.6 s and 1.0 s.

## 5. Residual ledger

| source | item | where answered |
|---|---|---|
| plan 0.6 / q1_content Q23 | per-era palette tables with a banned reference list and a CIEDE2000 minimum distance test for every faction palette | 3.3, 3.5, 3.6, vb_data |
| q1_content Q23 / q2_product Q21 | emblem allow-list, rotation / hook check, "no letters / numbers", "no star / cross / crescent at flag size", "no three-band layout" | 3.7.3, 3.9.1, 3.9.3 |
| q1_content Q23 | IP-avoid list for Sci-Fi and Medieval fantasy names (marine, xeno, walker ...) | stays in the bibles' banned-note (text sweep, `REAL_WORLD`); the shape / silhouette side (chin-guard helmet, humming blade, long-necked walker, inner-jaw skull) is rubric 5, planted rejects SF-R1..R3 |
| q1_content Q23 | human-read step on each faction contact sheet | 3.13 panel protocol |
| q2_product Q21 (a) | palettes + banned list + CIEDE2000 minimum | 3.3, 3.6 |
| q2_product Q21 (b) | emblem and banner allow-list by signed append | 3.7.1 |
| q2_product Q21 (c) | model rules: no letters / numbers, no star / cross / crescent shapes at flag size, no flag-like three-band layouts | 3.9 |
| q2_product Q21 (d) | reviewer rubric on the lineup render with three named reject examples | 3.13 |
| q3_product residual 20 | mechanical vs agent-judged split; markings only through registry decals; judged part named | 3.9.1, 3.9.2, 3.13 (VB-D12, VB-D18) |
| q3_product residual 30 | era chrome uses only shipped fonts | 3.11 |
| q3_program residual 7 (VB half) | conformance criterion with emblem allow-list, palette minimum, banned list, no letters, no star / cross / crescent, no three-band, with a negative control | 3.12, 4 (VB-T01..T12, NC-VB) |
| q3_program residual 28 | W as dependency; palette test per time of day on arena palettes | 3.10 |
| plan section 14 row spec/VB | palettes + banned list, emblems, model rules, reviewer rubric; acceptance "palette distance test" | 3.5, 3.6, 3.7, 3.9, 3.13, 4 |
| traceability row 2.6 | no real nations, uniforms, camo; VB palette test | 3.6, 3.9 |
| medieval factions.md | cyan `#2db5c9` vs `#3fb8e0` "VB to confirm" | 3.4 Q-cyan: keep `#2db5c9` |
| medieval factions.md | sulphur `#dccb2c` vs `#e3d34a`, pair test vs Mythic gold | 3.4 Q-sulphur: keep `#dccb2c` |
| medieval visual_bible.md 2 | Marrowby orange + cream flag-size pair; chequer rule | 3.4 Q-chequer, VB-A3, fixtures MED-X1 / MED-A2 |
| medieval visual_bible.md 2 | "VB test list ... extended only by signed append" | 3.2 change control, 3.6.1 |
| medieval visual_bible.md 5 | three reject examples (Crusader Special, Tricolour Herald, Lion Rampant Pavise) | 3.13, fixtures MED-R1..R3 |
| medieval visual_bible.md 6 | six rubric questions | 3.13 (merged into 8 items) |
| modern factions.md | Skyclub sky `#98d8ff` vs `#a3dcff` (18.9 against Gatehouse) | 3.4 Q-sky: keep `#98d8ff` |
| modern factions.md | Caution butter `#fbeb8f` vs `#f5f2a6` (accents as pairs) | 3.4 Q-butter: keep `#fbeb8f` |
| modern factions.md | Marmalade peach vs Marrowby orange (20.0) | 3.3.2 (cross-era 20.0 passes 16.5); restriction 16.5 against hazard orange-black in 3.6.2 |
| modern visual_bible.md 1 | near-miss table (Directorate 12.9, Skyclub 12.3, Caution 10.8) with fallbacks | 3.6.2 re-measured; fallbacks not needed, patterns registered (3.7.5) |
| modern visual_bible.md 3 | Caution emblem "stacked upward chevrons" vs tape | VB-A2, 3.7.3 |
| modern visual_bible.md 5 | three reject examples (Army Surplus, Roundel Flypast, Red Cross Satchel) | 3.13, fixtures MOD-R1..R3 |
| modern visual_bible.md 4.10 | pastel readability against concrete, asphalt, paving, lino | 3.8.5 floor table, MOD-RC2, lineup L-5 |
| scifi factions.md / feel_sheet 14.3 | Concord azure 16.8 against benchmark 17; fallback ivory primary | 3.4 Q-concord: keep azure, bar 16.5 |
| scifi visual_bible.md 1 | near-miss table; fallbacks (Glowmoss `#ff7a1c`, Skitter `#86fe3a`) | 3.6.2 (fallbacks not needed; Glowmoss sub-pair VB-A5) |
| scifi visual_bible.md 2 | banned shapes list (chin-guard helmet, humming blade, ...) | 3.9.1, rubric 5, SF-R1 / SF-R2 / SF-R3 |
| scifi visual_bible.md 4.12-13 | glow under 12 percent; dark bodies need an edge | 3.8.3 |
| scifi visual_bible.md 5 | three reject examples (Plastic Patrol, Humming Blade, Dome with Teeth) | 3.13, fixtures SF-R1, SF-R2; SF-R3 judged only |
| scifi factions.md | greyscale test at 40 px as a VB rule | 3.3.5 body clause, lineup L-3 |
| design ui_chrome (all) | chrome accent collision distances | 3.11 |
| CU 3.6.7 | "no token reuses an Ancient chrome colour" | 3.11 numeric form (>= 15.0) |
| VF 3.23.3 | `vbscan` inputs, palette statistic, emblem and decal checks, agent residue | 3.12, PC-1, PC-3 |
| VF 3.16.1 | `dE_team` and CVD thresholds | 3.8.4, PC-2 |
| VF-D19 | ER17 sampling | 3.10 uses it for time of day |
| RA 3.10 | `THEME_LOOK` rows | `vb_data.looks`, 3.3.3, 3.10 |
| RA-T25 | look-dev J items | 3.13 (`vb` block of the look-dev JSON) |
| W 3.4.2 | `top` / `strata` rows, `materialShare` | 3.10 |
| UC-D07 | tint floors | `vb_data.team.tint_share`, 3.8 |
| S-slice G0-5, G0-M6, SLP-4, SLP-9 | `vbscan --era` on roster palettes and additions; THEME_LOOK too close to another era | 3.12 CLI (`--era`, `--ids` for additions), 3.11 looks table |

## 6. Plan corrections

* **PC-1 (VF 3.23.3, plan ER3b).** The palette statistic is the **max element dE00 of the best assignment** with bands BLOCK 8.0 / RESTRICT 20.0 (singles 10.0 / 20.0), not "mean CIEDE2000 (best assignment) >= initial 12". Evidence 3.6.4: mean-12 fails 15 rows over 7 of the 18 new factions the bibles accepted; max < 8 fails none. VF 3.23.3 should read: "palette triples ... have max-element dE00 >= `thresholds.banned.block` of `vb_data.json` from every banned tuple; pairs under `clear` are restricted by layout".
* **PC-2 (VF 3.16.1 `dE_team`).** The 15 threshold applies to the CARRIER mask (each unit rendered as team 0 and as team 1, carrier mask = where the copies differ), not to the whole unit; the whole-unit value is ratcheted against Ancient. Evidence 3.8.4 (Ancient mirror 6.1 / 13.2).
* **PC-3 (VF 3.23.3 inputs).** `tests/fixtures/vb_banned.json` and `emblems_allow.json` are generated from `docs/eras/spec/vb_data.json`; the data file, not the fixtures, is the signed artefact.
* **PC-4 (spec/RA, spec/UC).** `ModelDef.meta` gains an optional `vb` object (3.9.2). No engine change; UC-B tracers for the new eras declare it; look-dev JSON gains a `vb` block (rubric answers).
* **PC-5 (design/medieval/factions.md, visual_bible.md).** VB-A1 (`free_company` primary) and VB-A3 (Marrowby caparison); the table row "min dE00 inside the era" 21.6 -> 22.6 and the Romans neighbour 20.0 -> 19.8.
* **PC-6 (design/modern/visual_bible.md, factions.md).** VB-A2 (Caution emblem).
* **PC-7 (all three visual_bible.md section 2).** VB-A4: the banned-list sentence becomes VB-D07 / VB-D08. Sci-Fi near-miss table: VB-A5.
* **PC-8 (AR `append` kinds).** `emblems` and `palettes` rows carry the schema of 3.2 / 3.7.1 (`hash`, `signatures`); the Workshop emblem list of a new era is its own rows plus `none`; the Ancient nine stay the Ancient view.
* **PC-9 (design bibles: what the tool verified).** Confirmed to the printed decimal: 38 of the 42 primary distances of the three `factions.md` tables, Sci-Fi 16.8 / 28.9, Modern 20.0 / 18.9 / 24.9, Directorate 12.9, Concord 12.1, the L* table of the Sci-Fi bodies (95 / 51 / 73 / 9 / 64 / 9). Moved by amendment: the four Medieval values of VB-A1. Corrected: Glowmoss pair (11.8 against the sub-pair), Skyclub 11.8 and Caution 11.2 (reference variants differ by under 1.2).
* **PC-10 (plan 14, q3_program 28).** VB depends on W (materials, `materialShare`), RA (`THEME_LOOK`, hooks) and UC (tint floors) in addition to `design/<era>`; this file is final against their final specs and `draft until` none.

## 7. Open items

| id | item | owner | phase |
|---|---|---|---|
| OI-1 | REVIEWER countersign of the 18 emblem rows (reviewer signature is required for E-1; author signatures exist) | REVIEWER | P0 exit |
| OI-2 | implement `tools/vbscan.mjs` (stages of 3.12), `--emit-fixtures`, `--record-ancient`; record `tests/baseline/vb_ancient.json` from the `ancient-v8` baseline with two signatures | TOOLS-VERIFY, TOOLS-GOLDEN | P1 |
| OI-3 | `meta.vb` in every new unit and prop builder and in the UC-B tracers; `meta.vb` accepted by `ModelDef.meta` consumers (it is a free object, a test pins that the engine ignores it) | UNITS-x, ANIM-RIGS | P1 |
| OI-4 | Workshop emblem parity: three decor stamps per era (6 faction + 3 = 9 like Ancient), each a signed row, plus any extra Workshop palette preset beyond the six faction rows | DESIGN-ERA, EDITORS | P2 |
| OI-5 | planted reject models `tests/fixtures/vb_rejects/<era>_<n>.js` (3 per era from 3.13) for the panel calibration; SF-R3 is judged-only so its model is the one that tests the reviewer | DESIGN-ERA, TOOLS-VERIFY | P2 |
| OI-6 | recalibrate the model-arm caps (trim 20, metal 15, glow 6 / 4 / 12 percent, off-palette 8 percent) on the first built units of each era; an amendment row if a number moves | DESIGN-ERA, TOOLS-VERIFY | P2, calibration checkpoint 2 |
| OI-7 | the Ancient inherited findings (display and unit colours within 7.1 to 7.8 of real flag sets; Hellene / Roman unit paint 8.3 apart; Persian / Punic 9.3; one star-like emblem): changing any of them is an Ancient delta (AP row, G8 re-record under two signatures). Not planned; the user decides | user, COORD | none |
| OI-8 | the `meta.vb` markings / patterns need the voxel-face extractor of `vbscan` M-4 on `hum1` part modules (`head` regions up to 8 voxels exempt); the first run on the Ancient corpus decides whether the 4..64 voxel window needs a per-part exemption list beyond that | TOOLS-VERIFY | P1 |
| OI-9 | VF/H state the `REAL_WORLD` text-sweep scope (shipped strings and `src/`; `docs/` and `tests/` excluded) so that the `src` evidence column of `vb_data.json` is not swept | TOOLS-VERIFY, COMEDY-EDITOR | P1 |
| OI-10 | VF integrates PC-1 and PC-2 into 3.23.3 and 3.16.1 and the carrier mask (team-0 and team-1 copies of each unit in the same pose) into `readability.mjs` | TOOLS-VERIFY | P1 |
| OI-11 | W recipe tests call `vb_distance` `sectionArenas` for the blocked-triple list and the layout test of 3.10 | WORLD | P1 |
| OI-12 | derive the `palettes` append rows' `cloth` per faction (lightest era neutral not within 12 of the primary) when UNITS write the rows; `vbscan` P-6 then pins them | UNITS-x | P1 |

## Appendix A: nearest other colour of every colour of the new factions

Every primary, accent and trim of the 18 new factions against the colours of the other factions (in the same era; anywhere including the 14 Ancient display colours). Small values here are normal for trims, accents and neutrals (a cream accent sits near a parchment trim); they are the inputs of the pair and layout rules, not bars. Two worth knowing: Marrowby's umber trim is 3.9 from the Mostly Paid Company primary (both brown; different layouts, different silhouettes), and the Yeomen walnut accent is 6.6 from that primary.

| faction | role | colour | nearest other colour in the era (dE00) | nearest other colour anywhere, new factions and Ancient display colours (dE00) |
|---|---|---|---|---|
| medieval:marrowby | primary | `#d9661c` | 22.5 free_company.trim | 11.1 modern:marmalade.trim |
| medieval:marrowby | accent | `#f1e4c0` | 6.4 yeomen.trim | 6.4 medieval:yeomen.trim |
| medieval:marrowby | trim | `#7a3b12` | 3.9 free_company.primary | 3.9 medieval:free_company.primary |
| medieval:yeomen | primary | `#8bb12e` | 16.5 wyrmkin.accent | 16.5 medieval:wyrmkin.accent |
| medieval:yeomen | accent | `#5a3b22` | 6.6 free_company.primary | 6.6 medieval:free_company.primary |
| medieval:yeomen | trim | `#d9c9a0` | 6.4 marrowby.accent | 6.4 medieval:marrowby.accent |
| medieval:gatehouse | primary | `#8c9aa8` | 18.1 free_company.accent | 3.4 scifi:rummage.trim |
| medieval:gatehouse | accent | `#cfe0ee` | 16.9 bellfount.accent | 8.0 ancient:carthage.accent |
| medieval:gatehouse | trim | `#5d6a78` | 27.9 yeomen.accent | 3.8 modern:directorate.trim |
| medieval:bellfount | primary | `#d9577f` | 26.5 wyrmkin.primary | 11.4 modern:briefing.trim |
| medieval:bellfount | accent | `#bfe3cf` | 16.9 gatehouse.accent | 11.1 modern:shed.primary |
| medieval:bellfount | trim | `#8e3a55` | 8.6 wyrmkin.primary | 8.6 medieval:wyrmkin.primary |
| medieval:free_company | primary | `#72421d` | 3.9 marrowby.trim | 3.9 medieval:marrowby.trim |
| medieval:free_company | accent | `#2db5c9` | 18.1 gatehouse.primary | 14.1 modern:skyclub.trim |
| medieval:free_company | trim | `#c9a97a` | 9.4 yeomen.trim | 7.3 ancient:barbarians.accent |
| medieval:wyrmkin | primary | `#6e2438` | 8.6 bellfount.trim | 8.6 medieval:bellfount.trim |
| medieval:wyrmkin | accent | `#dccb2c` | 16.5 yeomen.primary | 3.3 modern:caution.trim |
| medieval:wyrmkin | trim | `#2b1a22` | 20.2 yeomen.accent | 8.7 scifi:skitter.accent |
| modern:marmalade | primary | `#f7b08c` | 21.5 directorate.accent | 12.4 ancient:barbarians.accent |
| modern:marmalade | accent | `#2e3036` | 1.2 directorate.primary | 1.2 modern:directorate.primary |
| modern:marmalade | trim | `#d98a63` | 27.9 directorate.accent | 11.1 medieval:marrowby.primary |
| modern:directorate | primary | `#2b2f36` | 1.2 marmalade.accent | 1.2 modern:marmalade.accent |
| modern:directorate | accent | `#e9e4d4` | 5.0 briefing.accent | 5.0 modern:briefing.accent |
| modern:directorate | trim | `#59616b` | 16.5 marmalade.accent | 3.8 medieval:gatehouse.trim |
| modern:skyclub | primary | `#98d8ff` | 22.8 briefing.accent | 11.0 medieval:gatehouse.accent |
| modern:skyclub | accent | `#f7fbff` | 6.0 briefing.accent | 2.6 ancient:mythic.accent |
| modern:skyclub | trim | `#5aa8e0` | 29.1 directorate.trim | 10.6 scifi:tidy_concord.primary |
| modern:caution | primary | `#fbeb8f` | 17.2 directorate.accent | 5.4 ancient:persians.accent |
| modern:caution | accent | `#1b1b1b` | 7.7 marmalade.accent | 5.3 scifi:rummage.accent |
| modern:caution | trim | `#e0c84a` | 22.1 directorate.accent | 3.3 medieval:wyrmkin.accent |
| modern:briefing | primary | `#f2a8d2` | 25.6 skyclub.accent | 20.7 medieval:bellfount.primary |
| modern:briefing | accent | `#f6f3ec` | 5.0 directorate.accent | 3.0 scifi:tidy_concord.accent |
| modern:briefing | trim | `#d878b0` | 30.0 marmalade.trim | 11.4 medieval:bellfount.primary |
| modern:shed | primary | `#8ff0c0` | 22.1 directorate.accent | 11.1 medieval:bellfount.accent |
| modern:shed | accent | `#4a2a55` | 18.3 directorate.primary | 4.2 scifi:skitter.trim |
| modern:shed | trim | `#4fbf92` | 26.8 directorate.accent | 5.1 scifi:glowmoss.primary |
| scifi:tidy_concord | primary | `#1288da` | 17.4 courtesy.trim | 10.6 modern:skyclub.trim |
| scifi:tidy_concord | accent | `#eef1ea` | 17.4 courtesy.accent | 3.0 modern:briefing.accent |
| scifi:tidy_concord | trim | `#0b7fb5` | 15.0 courtesy.trim | 14.5 modern:skyclub.trim |
| scifi:rummage | primary | `#867a14` | 26.6 glowmoss.trim | 19.1 ancient:mythic.primary |
| scifi:rummage | accent | `#2d2a28` | 18.9 skitter.accent | 5.3 modern:caution.accent |
| scifi:rummage | trim | `#8f979e` | 8.9 courtesy.accent | 3.4 medieval:gatehouse.primary |
| scifi:courtesy | primary | `#f21ae8` | 14.0 quiet_hour.accent | 14.0 scifi:quiet_hour.accent |
| scifi:courtesy | accent | `#aab4c0` | 8.9 rummage.trim | 8.1 medieval:gatehouse.primary |
| scifi:courtesy | trim | `#6b7683` | 12.5 rummage.trim | 4.9 medieval:gatehouse.trim |
| scifi:skitter | primary | `#aff802` | 28.9 glowmoss.primary | 17.4 medieval:yeomen.primary |
| scifi:skitter | accent | `#2b0f2a` | 8.5 quiet_hour.primary | 8.5 scifi:quiet_hour.primary |
| scifi:skitter | trim | `#5b2a5a` | 12.7 quiet_hour.trim | 4.2 modern:shed.accent |
| scifi:glowmoss | primary | `#2fb07c` | 26.1 rummage.trim | 5.1 modern:shed.trim |
| scifi:glowmoss | accent | `#ff9f1c` | 28.2 rummage.primary | 9.2 ancient:barbarians.accent |
| scifi:glowmoss | trim | `#1c7552` | 25.8 courtesy.trim | 7.9 ancient:barbarians.primary |
| scifi:quiet_hour | primary | `#200f3e` | 8.5 skitter.accent | 8.5 scifi:skitter.accent |
| scifi:quiet_hour | accent | `#a25ffd` | 14.0 courtesy.primary | 14.0 scifi:courtesy.primary |
| scifi:quiet_hour | trim | `#3b2a7a` | 12.7 skitter.trim | 10.8 modern:shed.accent |

## Appendix B: pairwise display-primary distances (dE00, 25 x 25)

Rows and columns in this order: 1-7 Ancient (hellenes, romans, egyptians, persians, carthage, barbarians, mythic), 8-13 Medieval (marrowby, yeomen, gatehouse, bellfount, free_company, wyrmkin), 14-19 Modern (marmalade, directorate, skyclub, caution, briefing, shed), 20-25 Sci-Fi (tidy_concord, rummage, courtesy, skitter, glowmoss, quiet_hour).

| # | faction | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
|---|---|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|
| 1 | ancient:hellenes | . | 41 | 33 | 17 | 25 | 47 | 61 | 50 | 66 | 26 | 39 | 42 | 34 | 52 | 24 | 39 | 68 | 43 | 57 | 17 | 56 | 37 | 77 | 48 | 29 |
| 2 | ancient:romans | 41 | . | 57 | 35 | 31 | 62 | 46 | 24 | 64 | 41 | 20 | 20 | 17 | 37 | 34 | 62 | 60 | 40 | 74 | 49 | 43 | 36 | 78 | 70 | 38 |
| 3 | ancient:egyptians | 33 | 57 | . | 40 | 44 | 21 | 41 | 48 | 32 | 22 | 56 | 43 | 59 | 45 | 36 | 29 | 42 | 49 | 29 | 26 | 33 | 42 | 43 | 17 | 49 |
| 4 | ancient:persians | 17 | 35 | 40 | . | 9 | 49 | 69 | 51 | 81 | 29 | 31 | 43 | 27 | 54 | 24 | 46 | 77 | 41 | 62 | 31 | 65 | 25 | 95 | 54 | 23 |
| 5 | ancient:carthage | 25 | 31 | 44 | 9 | . | 48 | 70 | 49 | 82 | 34 | 28 | 40 | 20 | 56 | 23 | 55 | 79 | 43 | 66 | 41 | 64 | 25 | 97 | 57 | 20 |
| 6 | ancient:barbarians | 47 | 62 | 21 | 49 | 48 | . | 39 | 51 | 24 | 34 | 67 | 39 | 58 | 50 | 35 | 49 | 42 | 65 | 35 | 48 | 22 | 84 | 39 | 19 | 50 |
| 7 | ancient:mythic | 61 | 46 | 41 | 69 | 70 | 39 | . | 24 | 23 | 38 | 49 | 39 | 58 | 21 | 56 | 50 | 20 | 49 | 38 | 54 | 19 | 68 | 31 | 37 | 73 |
| 8 | medieval:marrowby | 50 | 24 | 48 | 51 | 49 | 51 | 24 | . | 46 | 36 | 30 | 25 | 38 | 20 | 45 | 51 | 40 | 38 | 57 | 50 | 30 | 48 | 57 | 55 | 56 |
| 9 | medieval:yeomen | 66 | 64 | 32 | 81 | 82 | 24 | 23 | 46 | . | 37 | 66 | 48 | 68 | 38 | 55 | 49 | 21 | 61 | 24 | 62 | 20 | 86 | 17 | 20 | 79 |
| 10 | medieval:gatehouse | 26 | 41 | 22 | 29 | 34 | 34 | 38 | 36 | 37 | . | 32 | 41 | 45 | 31 | 39 | 19 | 39 | 27 | 32 | 17 | 36 | 26 | 46 | 28 | 48 |
| 11 | medieval:bellfount | 39 | 20 | 56 | 31 | 28 | 67 | 49 | 30 | 66 | 32 | . | 35 | 27 | 30 | 41 | 53 | 57 | 21 | 70 | 45 | 51 | 20 | 78 | 71 | 43 |
| 12 | medieval:free_company | 42 | 20 | 43 | 43 | 40 | 39 | 39 | 25 | 48 | 41 | 35 | . | 23 | 42 | 27 | 60 | 54 | 51 | 62 | 47 | 26 | 50 | 63 | 52 | 39 |
| 13 | medieval:wyrmkin | 34 | 17 | 59 | 27 | 20 | 58 | 58 | 38 | 68 | 45 | 27 | 23 | . | 54 | 25 | 69 | 72 | 51 | 79 | 47 | 47 | 36 | 85 | 69 | 23 |
| 14 | modern:marmalade | 52 | 37 | 45 | 54 | 56 | 50 | 21 | 20 | 38 | 31 | 30 | 42 | 54 | . | 63 | 40 | 26 | 27 | 43 | 46 | 33 | 44 | 45 | 46 | 71 |
| 15 | modern:directorate | 24 | 34 | 36 | 24 | 23 | 35 | 56 | 45 | 55 | 39 | 41 | 27 | 25 | 63 | . | 66 | 75 | 61 | 71 | 36 | 40 | 43 | 77 | 49 | 18 |
| 16 | modern:skyclub | 39 | 62 | 29 | 46 | 55 | 49 | 50 | 51 | 49 | 19 | 53 | 60 | 69 | 40 | 66 | . | 44 | 39 | 31 | 24 | 52 | 45 | 53 | 35 | 76 |
| 17 | modern:caution | 68 | 60 | 42 | 77 | 79 | 42 | 20 | 40 | 21 | 39 | 57 | 54 | 72 | 26 | 75 | 44 | . | 49 | 25 | 64 | 32 | 74 | 18 | 33 | 97 |
| 18 | modern:briefing | 43 | 40 | 49 | 41 | 43 | 65 | 49 | 38 | 61 | 27 | 21 | 51 | 51 | 27 | 61 | 39 | 49 | . | 58 | 41 | 54 | 24 | 69 | 62 | 64 |
| 19 | modern:shed | 57 | 74 | 29 | 62 | 66 | 35 | 38 | 57 | 24 | 32 | 70 | 62 | 79 | 43 | 71 | 31 | 25 | 58 | . | 47 | 39 | 54 | 23 | 17 | 88 |
| 20 | scifi:tidy_concord | 17 | 49 | 26 | 31 | 41 | 48 | 54 | 50 | 62 | 17 | 45 | 47 | 47 | 46 | 36 | 24 | 64 | 41 | 47 | . | 59 | 44 | 71 | 42 | 45 |
| 21 | scifi:rummage | 56 | 43 | 33 | 65 | 64 | 22 | 19 | 30 | 20 | 36 | 51 | 26 | 47 | 33 | 40 | 52 | 32 | 54 | 39 | 59 | . | 71 | 35 | 30 | 61 |
| 22 | scifi:courtesy | 37 | 36 | 42 | 25 | 25 | 84 | 68 | 48 | 86 | 26 | 20 | 50 | 36 | 44 | 43 | 45 | 74 | 24 | 54 | 44 | 71 | . | 100 | 52 | 44 |
| 23 | scifi:skitter | 77 | 78 | 43 | 95 | 97 | 39 | 31 | 57 | 17 | 46 | 78 | 63 | 85 | 45 | 77 | 53 | 18 | 69 | 23 | 71 | 35 | 100 | . | 29 | 106 |
| 24 | scifi:glowmoss | 48 | 70 | 17 | 54 | 57 | 19 | 37 | 55 | 20 | 28 | 71 | 52 | 69 | 46 | 49 | 35 | 33 | 62 | 17 | 42 | 30 | 52 | 29 | . | 62 |
| 25 | scifi:quiet_hour | 29 | 38 | 49 | 23 | 20 | 50 | 73 | 56 | 79 | 48 | 43 | 39 | 23 | 71 | 18 | 76 | 97 | 64 | 88 | 45 | 61 | 44 | 106 | 62 | . |
