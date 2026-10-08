# spec/UC: the unit contract of the "three new eras" program (DESIGN-ARCH, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (0.2 defaults, 0.5 "a unit is done", 5 rosters and rigs, 9 ER3/ER4/ER5, 12 calibration 2 / `UC-B`, 14 row `spec/UC`), `q3_program.md` residuals 15 and 18, `q3_engine.md` residuals 5, 20, 21, 22, 38, `q1_disposition.md` (VERIFY-Q10, CONTENT-Q1/Q17/Q33/Q35/Q36, SCOPE-Q3, C7, C10), `q2_schedule.md` Q3/Q5/Q8/Q15, maps 01, 03, 07, 08. Companions already final: `spec/AR` (registry, manifests, owner table, `ensureEra`), `spec/M` (vocabularies, def schema, causes), `spec/RA` (rigs, clip ids, `farLint`, look-dev U-R1..U-R10), `spec/W`. Written later, interface fixed here: `spec/AU` (audio rows), `spec/CU` (codex and role rows), `spec/H` (text sweep), `spec/VF` (criteria registry, tiers).

All code facts were read on HEAD `4fe90f7` (= tag `ancient-v8` + the `VW_BUILD_DATE` line). Numbers marked **(m)** were measured by read-only Node probes on the 43 Ancient units (scratchpad only; every algorithm they use is reproduced in 3.3, 3.4, 3.8 and 3.10, so the tools of section 4 re-derive them). Where this file and a map or an older doc disagree, the code won; each case is in section 6. Paths are repo-relative; `design/<era>/` means `docs/eras/design/<era>/`. Tier letters follow AR: **F** = T-fast (Node, every hand-back gate), **E** = T-era (Chromium or era-wide), **R** = release-only.

## 1. Purpose and scope

**This file binds** (builders build from it and need nothing else for their part): (a) the clause matrix `UC-01..UC-99` (3.2): what is checked, by which function, on which input, with which threshold, in which tier, and the mutation that must turn it red; (b) the derived definitions the clauses need: the requestable clip set and its grading (3.3), the silhouette hash, metric and thresholds measured on the 43 Ancient units (3.4), tint floors per rig class (3.5), role/tag vocabularies and derived classes (3.6), text limits (3.7), audio dry-run (3.8), balance modes and bands (3.9), pool sweeps (3.10), roster-level and boss checks (3.11); (c) the `UNIT_SPEC` row schema with two worked examples (3.12); (d) the exact per-era manifest block `expect.uc` (3.13); (e) the tracer sets `TRACER`, `UC-B`, `WP-A`, `DONE` (3.14); (f) the exact `tools/contracts.mjs` and `tools/gate.mjs` changes, `--strict` as the default and the end of the soft fallback finding (3.15); (g) how a unit work package (4 humanoids or 1 bespoke) is accepted (3.16); (h) a worked matrix output for three Ancient units (3.17).

**Builders:** TOOLS-VERIFY (owner of `tools/uc/**`, `tools/lib/silhouette.mjs`, `tools/lib/uc_*.mjs`, `tests/uc/**`, ER3), TOOLS-GATE (`tools/contracts.mjs`, `tools/gate.mjs`), DESIGN-ERA-MED/MOD/SF (`design/<era>/units.json`), UNITS-MED/MOD/SF and ANIM-RIGS (rows and models of a unit WP), ANIM-CLIPS, RENDER, AUDIO, COMEDY-x, SIM, REGISTRY (requests of 3.18), REVIEWER. **Not in scope:** balance numbers (BALANCE, spec/VF ER7), the prose of unit text (spec/H), custom soldiers (`cs_*` ids are non-enumerable defs outside every clause; AR9/U8 own them), props, arenas, missions and puzzles (spec/W, spec/MS), the clip data itself (spec/RA).

**Ancient policy (plan 0.1).** The Ancient era runs the same matrix in `legacy` mode on the same code: no Ancient file changes. Every clause that needs a new-era table (reaction tables, `AUDIO_PROFILES`, `PROJ_AUDIO`, descriptive tags, the 11/15 string floors, the mechanic line, the roster-level contract, `UNIT_SPEC` beyond id/faction/role) is evaluated against the legacy equivalent named in the clause or is graded against the Ancient floor recorded in `tests/fixtures/uc_ancient_baseline.json`. That file is a golden (OW-21: two signers, author not a signer) and is compared for equality both ways, so any drift of an Ancient result is a red, never a silent change. Findings the Ancient has today (clauses UC-13, 15, 20, 23, 24, 26, 27, 41, 42, 50, 60, 90, 91, 94; 3.17) are **not fixed**; they are pinned. Touches of Ancient-path files are listed in 3.18 (all are additive exports or tool edits; policy bit-identical opt-in, G1..G12 unchanged).

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| UC-D01 | One matrix: clause ids `UC-nn` (tens = group: 0x schema, 1x model, 2x clips and reactions, 3x projectile, 4x audio, 5x text, 6x codex, 7x balance, 8x pools, 9x roster-level), implemented in `tools/uc/clauses/<group>.mjs`, driven by `tools/uc/matrix.mjs`, printed by `contracts.mjs`. The set names of the plan keep their letters: `UC-B` = set B (3.14). | q1_verify Q10 asked for "a matrix printed in the gate output"; clause ids are not sets, so "UC-B" and a balance clause can never be confused. | 0.5, 9 ER3 |
| UC-D02 | `--strict` is the default of `contracts.mjs` and `gate.mjs` passes it explicitly; the soft channel for "fallback model" disappears (UC-10 is a hard clause); the only non-failing output is `AMBER`, and an AMBER without a row in `tests/fixtures/uc_amber.json` (owner, deadline phase) fails. | HEAD: `gate.mjs:28` runs contracts WITHOUT `--strict` and `contracts.mjs` turns fallback models into soft findings (`S()`); `contracts.mjs --strict` already prints `contracts OK (43 units, 16 arena presets, 0 soft finding(s))` (m), so strict costs the Ancient nothing. | 0.5, VERIFY-Q10 |
| UC-D03 | The Ancient 43 run the same clauses in `legacy` mode against a pinned baseline; the baseline is a ratchet in both directions (3.17). | 30 of 43 units have 10 strings, 0 of 10 heroes/bosses reach 15 (m): the new floors cannot hold for Ancient, and Ancient must not change. | 0.1 |
| UC-D04 | Recolour detection is a **silhouette hash of the rest-pose 3-view raster** (32x32 per view, area-coverage threshold 0.5) with pooled-IoU distance `SD`. Thresholds: `SD < 0.08` FAIL, `[0.08,0.12)` AMBER unless a named variant, "silhouette-unique" `SD >= 0.35`. | Pairwise distribution of the 903 Ancient pairs (m): min 0.110, p1 0.224, p5 0.316, median 0.608, max 0.785; min is 0.094/0.101/0.110 at N=48/24/32, so 0.08 clears every resolution; 0.35 is the largest value at which all 7 Ancient factions still own a unique unit (hellenes' best is `strategos` 0.36). | 5, ER3 |
| UC-D05 | The set of clips the sim can request is **derived from code** (`meleeClip`, `rangedClip`, `killUnit`, `setAnim` and `beginChannel` literals, ability tables), guarded by a drift test, and each request is resolved through the real Animator path (`Animator.trace`, request R-UC1). | The sim publishes 25 literal clip ids plus `meleeClip`/`rangedClip` at HEAD (m: scan of `src/sim/**`); a hand list rots. A first probe that read only `groups[0].cache` reported false MISSING for every mounted unit because mount/rider/crew ids are derived (`mountClip`, `RIDER_OF`, `CREW_*`). | 5, ER5 |
| UC-D06 | Resolution is graded by request class and rig class (3.3): attacks, channels and deaths must be exact or mapped and never idle; locomotion needs a gait set; status clips may be idle only for machine rigs. | Ancient machines (catapult1, ballista1, trojan1, chariot1) resolve stun/dizzy/sleep/flail/cheer/getup to idle by design (m); organic units never do except the pinned `minotaur rear`. | 5 |
| UC-D07 | Tint floors are the shipped ones (hum1: pooled 0.30 in rest AND ready pose, every view 0.15; non-hum1: mean 0.15, every projection 0.03) plus one measured tightening for classes seen from above: `top >= 0.08` for vehicle, air, mech, boss, siege. Exceptions only through the signed ledger with absolute minima. | Ancient non-hum1 minima (m): mean 0.162, any projection 0.045, top 0.094 (`chariot_archer`); the camera looks down, and a grey hull is the failure plan 5 predicts. | 5, VB |
| UC-D08 | Text: 10 base strings (name, plural, blurb, lore, codexJoke, 3 deaths, 2 taunts) + 1 mechanic string = **11**; heroes and bosses **15**; word limits are the ones `tests/humor/text.test.mjs` enforces plus floors measured on Ancient. | The note "U1 requires >= 11 strings (name, plural, blurb, lore, 3 deaths, 2 taunts, codexJoke = 11)" (q2_product Q12) is arithmetically 10; Ancient min is 10 and max 21 (m). The plan sentence "(>= 11 strings ... one naming its mechanic)" is consistent only as 10 + 1. | 0.5 |
| UC-D09 | Roles come from `spec/M` 3.3 (`ERA_ROLES`); tags are `ENGINE_TAGS` (with machine-checked predicates) plus `manifest.uc.tags` (descriptive, closed per era). The tag `air` means "airborne unit" only; anti-air capability is `ranged.air`. | `spec/M` 3.9: `tc = AIR if tag air or role air`; `design/medieval/rosters.md` puts `air` on longbowman, crossbowman, springald, poacher (anti-air) and role `monster` on wyvern and cinderwyrm: both contradict M (section 6, PC-UC2/3). The 18 Ancient tags satisfy their predicates (m: 0 violations). | 5, M |
| UC-D10 | Height class is **measured** (`modelBounds` height x scale) with boundaries in the gaps of the Ancient distribution: S < 2.2, M < 3.9, T < 5.3, L < 7.2, XL; `A` suffix for layer air. | Ancient heights (m) fall in five clusters: 1.71-1.76; 2.60-3.72; 4.06-5.06; 5.51-6.64; 7.74; the roster legend (M 2.0-3.0, T 3.0-4.5) cuts through the dense hum1 cluster 2.6..3.7 (PC-UC4). | 5 |
| UC-D11 | Balance modes: **field** (all roles but support; U5a statistic, band [0.30, 0.62]), **boss** (same statistic, opponents of cost >= 120, band [0.30, 0.62]), **escort** (support and siege; the `escortPair` statistic, band [0.10, 0.90] plus the U5b counter/prey rule). | Ancient field (m, from the stored `docs/balance_data.json`): 39 non-support units in [0.316, 0.592]; escort means of the 7 support/siege units in [0.143, 0.833]. A swap-lift statistic was measured and rejected: win rates 0%..100% on the same units at 30% share (druid 0, philosopher 15, priest 95, senator 90, trojan 0, ballista 0, catapult 85; n=20 each). | 0.5, 9 ER7 |
| UC-D12 | Pool membership is a **reachability sweep**, not a list lookup: Quick = 6 styles x 6 seeds x 3 budgets per faction, Survival = 60 waves x 3 seeds, Campaign = the unit id occurs in the roster, enemy, fixed or script of >= 1 mission. | `generateArmy` pools by `faction` and `cost > 0` but shares by role (`SHARES`, `GROUP_MAXTYPES`): a role without a row is never picked. Ancient: 43/43 reachable in all three sweeps (m; sweeps cost 69 ms). | 0.5 |
| UC-D13 | Roster-level contract (3.11): key = (role, rig+species, weapon style, height class, tag set); body type = (rig, species, build, scale bucket); unique = nearest `SD >= 0.35`; named variants are a ledger in the manifest. | q1_content Q1. Ancient has 3 collision groups (8 units) and 4 factions above 2 per body type (m): the contract is new-era only and the Ancient result is pinned. | 5 |
| UC-D14 | `UNIT_SPEC` rows live in `design/<era>/units.json`, one per unit; the row holds **intent and classes**, never the numbers of `stats.js` (single source). Rows are seeded from `design/<era>/rosters.md` by `tools/uc/spec_seed.mjs` and then owned by the unit WP. | q1_scope "Data-driven UNIT_SPEC rows rejected by contracts when incomplete"; Medieval's master table already has the columns. | 5 |
| UC-D15 | Four sets: `TRACER` (P1), `UC-B` (calibration 2), `WP-A` (work-package hand-back), `DONE` (all). `UC-B` = DONE minus the reaction-per-cause, audio and balance clauses, as the plan says. No scaling factor is needed: the clauses outside UC-B are executed by other roles' WPs that `wbs.csv` already counts. | q3_program 18, q2_schedule Q8. | 12 |
| UC-D16 | Unit data that hot files would otherwise need stay in the pack and are written by the unit WP itself: `era_<id>/audio_profiles.js` and `reactions.js` rows (amendment AM-UC2 to the owner table). | q2_schedule Q15: otherwise 2-3 patch requests per unit WP (60-80 requests into three owners). | 12 |
| UC-D17 | Audio is checked by **dry-running the real router** (`createRouter` with a recording `play`) for every slot, for Ancient and new eras alike. | The router is pure and testable in Node (`tests/audio/router.test.mjs`); it hides the profile-vs-legacy difference. On HEAD 7 of 27 abilities are silent on `ability_cast` (m). | 10 AU4 |
| UC-D18 | The attack clip has one source: the Codex and Workshop copies of the projectile-to-clip map must equal the sim's (UC-27). | Probe (m): `unitinfo.attackClip` returns the non-existent id `strike_slash` for 5 Ancient units (`strategos legionary centurion khopesh_warrior xerxes`); the Codex turntable "attack" button plays idle with a missing-clip warning. | 5 |
| UC-D19 | Cost: Node clauses of the whole matrix <= 10 s per era (Ancient 43 units: 3.1 s total incl. module load, m); Chromium-bound parts (triangles, far pixels, preview) are tier E and come from the look-dev JSON. | tier budgets of plan 3. | 3 |

## 3. Detailed specification

### 3.1 Definitions, records, modes

* **Unit scope.** Every enumerable def of `registry.defsFor(era)` whose `registry.eraOf(def) === era`; the utility units (`battle_goat`, `sacred_chicken`) belong to Ancient; `custom` defs and `cs_*` ids are never scope. Models come from `content.modelFor(def, null)` of `buildContent({eras:[era]})` after `ensureEra(era, {allowHidden:true})` (AR 3.7.1); hidden eras are checked like released ones.
* **Result record** `{clause, unit, status, value, threshold, note}`; `status`: `PASS`; `FAIL`; `AMBER` (soft: needs a row in `tests/fixtures/uc_amber.json`, 3.15); `LEGACY` (Ancient only: evaluated through the named legacy equivalent and equal to the baseline); `PIN` (Ancient only: a finding the Ancient has today, equal to its baseline entry; counts as pass in `legacy` mode); `PEND` (the clause's input is owned by another role and the unit's `spec.status` is `planned` or `wp`; never allowed in set `DONE`, never allowed once the era passed its E-FREEZE); `NA` (the clause does not apply; the rule that makes it NA is printed, e.g. "no ranged block").
* **Modes.** `legacy` for `era === 'ancient'` (baseline-pinned, 3.17), `strict` for every other era. In `strict` a clause that cannot find its input is FAIL, never skipped (this removes the silent defaults of spec/M 3.9 from the unit level).
* **Sets** (3.14): `T` tracer, `B` = `UC-B`, `A` = `WP-A`, `F` = `DONE`. `--set` selects the clauses; the `sets` column below lists the sets a clause belongs to (`F` is every clause).
* **Matrix API** (`tools/uc/matrix.mjs`, owner TOOLS-VERIFY): `runMatrix(era, {units, set, ctx}) -> {rows:[Record], byUnit, byClause, summary}`; `ctx` is built once per era by `tools/uc/context.mjs` (content, defs, spec rows, manifest, baseline, amber ledger, silhouette hashes, look-dev JSON index, balance data, cue ledger). Each group file exports `check(ctx, def, model) -> Record[]` and `checkEra(ctx) -> Record[]` (roster-level, 3.11).

### 3.2 The clause matrix

Columns: `fn` = exact function (file `tools/uc/clauses/<group>.mjs` unless a path is given); `tier` F/E/R; `sets` T B A F; negative control = the mutation `tests/negctl/UC-nn.mjs` applies to a temp copy (AR 3.8.3 rules) and the check that must turn red. Cross-references: RA-Txx = `spec/RA` section 4, AR-Txx = `spec/AR` section 4, M S-ids = module criteria. Criterion mapping (q3_program inconsistency 13): UC-13 and UC-16 feed ER4, UC-20..27 feed ER5, UC-70..73 ER7, UC-80..82 ER10, UC-50..54 ER11, UC-31 and UC-40..42 ER12, every other clause ER3; the matrix as a whole is registered as ER3.

| id | what is checked | fn / script | input | threshold | tier | sets | negative control |
|---|---|---|---|---|---|---|---|
| UC-01 | def schema and registry facts | `validateDef(def,{era})` (`src/sim/schema.js`, M 3.4) + `registry.verify` V03 V04 V05 V06 for the unit | `registry.defsFor(era)` | 0 problems (codes `E_UNKNOWN_KEY E_TYPE E_ROLE E_ERA_ROLE E_PROJ E_PEN_MISSING E_AP_ON_NEW_TYPE E_RIG E_ABILITY E_ABILITY_PARAM E_RANGE E_BURST E_CLIP E_LAYER E_CUT`); Ancient: the first 27 `TOP_KEYS` only, every appended key `undefined` | F | TBAF | add key `sneaky` to a def: `E_UNKNOWN_KEY` |
| UC-02 | role, tag, ability, damage type, projectile and style vocabularies | `schema.mjs checkVocab` | def, `ERA_ROLES`, `ERA_TAGS` (3.6) | role in `ERA_ROLES[era]`; tags in `ENGINE_TAGS` plus `manifest.uc.tags`; every engine-tag predicate of 3.6 true; abilities registered, at most 32 distinct per pack; `melee.type`/`ranged.type` in `DAMAGE_TYPES`; `ranged.proj` in `PROJ_KINDS`; weapon style in the style list; non-hum1/quad1 defs declare `model.rig` | F | TBAF | role `tank`: `vocab.role`; tag `air` on a ground unit: `vocab.tag.air` |
| UC-03 | identity | `schema.mjs checkIdentity` | def, registry | id `^[a-z][a-z0-9_]{0,31}$`, unique over all eras, not `cs_*`; faction in the era's factions; `cost hp speed radius` > 0; display name 3..24 chars and unique over the registry; utility ids only in Ancient | F | TBAF | duplicate unit id in a fixture pack: collision throw |
| UC-04 | `UNIT_SPEC` row exists, is valid and agrees with the shipped def | `tools/lib/uc_spec.mjs validateRow` and `agree(row, def, measured)` | `design/<era>/units.json` (3.12) | schema valid; equal: role, faction, layer, tag set, ability ids in order, `ai.style`, weapon style/proj/clip, rig, species, recipe kind, derived classes (hp, speed, cost, height of 3.6), `react`, `firstMission`; no orphan row | F | TBAF | change `tags` in `stats.js` only: `S_MISMATCH tags` |
| UC-10 | the model builds and is not the fallback | `model.mjs checkModel` | `content.modelFor(def, null)` under a `console.warn` spy | no throw; `meta.fallback` falsy; 0 warnings; `def.model.kind` declared or `BUILDERS[id]` registered by the owning era | F | TBAF | make a builder throw: fallback model, `model.fallback` (today this is a SOFT finding, `contracts.mjs:35,41`) |
| UC-11 | hard model limits | `model.mjs checkLimits` (`tests/beasts/builders.test.mjs` rules) | model | parts 5..48 (hum1 <= 16, <= 20 with era pad modules); voxels 250..140000; height < 9.0 u; footprint x < 6, z < 10 u; lowest voxel y in (-0.051, 0.11) unless `meta.hover`; F_TEAM voxels > 0 | F | TBAF | add a 49th part |
| UC-12 | declared metas and radius | `model.mjs checkMetas` | model, manifest | `meta.rig` in the era's `requires` closure; new eras: `meta.bounds` within 5% of recomputed `modelBounds`, `meta.hover` iff floating, `def.radius` within +-25% of `0.5*bounds.wid*1.05` (RA-T22), crew total <= 48 for every crew count (RA-T04); preview inside 92% of the frame (RA-T21, tier E) | F (E) | TBAF | tank radius 0.7 |
| UC-13 | far mesh keeps the defining features | `farLint(model,{era})` (`src/voxel/farlint.js`, RA 3.1) + look-dev JSON | model, `docs/eras/lookdev/<rig>/<unit>.json` | 0 findings `FAR_LOSS FAR_FEATURE FAR_TINT FAR_FAT FAR_TRIS`; `meta.farKeep` has exactly the entries of `row.recipe.farKeep`; pixel record (RA-T03): each entry >= 0.60 of near pixels at `D`, `0.35 D`, 80 u; Ancient: findings equal `tests/fixtures/farlint_ancient.json` | F (pixels E) | TBAF | 2x2 barrel at odd origin parity: `FAR_FEATURE` |
| UC-14 | team tint floors per rig class | `model.mjs checkTint` (3.5) | model, blueprint | table 3.5 | F | TBAF | strip F_TEAM voxels (control of `tests/units/tint.test.mjs`) |
| UC-15 | silhouette distinct from every other unit (recolour detection) | `tools/lib/silhouette.mjs silhouetteHash, silhouetteDistance` (3.4) via `model.mjs checkSilhouette` | model; hashes of all built eras (`tests/fixtures/uc_silhouettes_<era>.json`) | `SD >= 0.12` PASS; `[0.08,0.12)` AMBER unless `variantOf` is named and ledgered; `< 0.08` FAIL; occupancy hash equal FAIL even for a variant | F | TBAF | copy a model under a new id with only colours changed: `SD = 0` |
| UC-16 | triangles within the class budget | `tools/lookdev.mjs --check` JSON | `skin.triangles`, `trianglesFar`, class (RA 3.2) | near <= class budget; far <= class budget and <= 0.33 x near | E | TBAF | add voxels over the budget |
| UC-17 | look-dev verdict | `tools/lookdev.mjs --check` (RA-T25) | JSON | numeric items true; judged items `pass` signed by a reviewer id different from `author`; `rounds` <= cap (infantry 2, vehicle/siege/air/alien 3, boss/hero 4) | E | TBAF | builder signs its own judged item |
| UC-20 | every requestable clip resolves, graded, and is not idle | `tools/lib/uc_clips.mjs requestableClips, gradeRequest` + `Animator.trace` (3.3) | def, model | every request meets its grade; the grade table is the allow-list of the Animator's documented fallback warnings (machine status clips to idle, the quiet crew fallback): any other `missing clip` warning fails | F | TBAF | delete `fire_tank` from `tank1`: resolves to idle |
| UC-21 | attack fit, hit window, burst legality | `clips.mjs checkAttackFit` | `ClipLib.meta(clip, defRig(def))`, `melee.cd`, `ranged.cd/burst/burstGap/mag` | `need = dur/(cd*0.92) <= 2.4` (engine cap `combat.js startMelee/startRanged`; Ancient max 1.17 (m)), AMBER > 1.8; `hit` in [0.15 dur, 0.9 dur]; single shot `cd >= 0.8`; `E_BURST` holds with baked meta; `mag` implies `reload_gun` registered | F | TBAF | `cd 0.3` on a 1.0 s clip: need 3.6 |
| UC-22 | baked timing equals the design row | `clips.mjs checkTiming` (RA-T05, RA-T09 at unit scope) | `ClipLib`, `DEFAULT_META` | new attack ids: dur +-5%, hit +-0.03 s; Ancient ids keep +-25% / +-0.06 s; every new plain id has a `DEFAULT_META` row; no def uses an owner-'' slot after `ensureEra` | F | TBAF | `shoot_rifle` hit frame 0.40 |
| UC-23 | clip ownership | `clips.mjs checkOwnership` (RA-T06) | `ClipLib.owner`, eras registered in all orders | every NEW requested attack/channel id has exactly one registrant; new hum1 ids equal no Ancient plain id; shared Ancient ids (`strike_ram launch shoot_bow`) equal `tests/fixtures/ancient_clip_ids.json` | F | TBAF | register a hum1 `reload` |
| UC-24 | reaction set present (static) | `clips.mjs checkReactions` (RA-T08) | `REACTIONS[def.react]`, `RIG_LINGER` | key exists (Medieval hum1/quad1+hum1 units may declare `react:null` = legacy block, nobody else); `default` exists; each cause class of M `CAUSE_CLASS` resolves to ids registered for the rig; `dur + 0.2 <= RIG_LINGER[rig]`; rig has >= 3 distinct death clips; Ancient: LEGACY = UC-20 deaths | F | TBAF | delete class `blast` of `mod_tank` or `RIG_LINGER.tank1 = 1.0` |
| UC-25 | reaction per cause (dynamic) | `tests/sim/react_matrix.test.mjs` via `clips.mjs checkReactDynamic` | world, unit at 1 hp, `killUnit(w,u,src,cause,o)` for each of the 27 `KILL_CAUSES` | chosen clip in `deaths[class(cause)]` or `default`; `deathLinger >= dur + 0.2`; each cause has KILL_VERBS, CAUSE_SCREAM and lesson rows (M S46) | F | F | revert `killUnit` to the plain block |
| UC-26 | hit reactions and flinch scale | `clips.mjs checkHitSet` | rig clips, `meta.flinchK` | rig has `hit_front` and `hit_back`; `flinchK` in [0,1] declared for vehicle, air, mech, boss; Ancient: baseline (5 rigs lack `hit_back`, 1 lacks `hit_front`, m) | F | TBAF | remove `hit_back` |
| UC-27 | one attack-clip source | `clips.mjs checkAttackClipAgreement` | `unitinfo.attackClip(def)`, `clipOptions(def)`, sim `meleeClip(def,0)` / `def.ranged.clip or rangedClip(def)` | equal for every def; every `clipOptions` id registered and non-idle; Ancient: baseline pins the 5 slash units (`strike_slash` is no clip id, m) | F | TBAF | return `'strike_' + style` for slash |
| UC-30 | projectile row: look, clip, radius, kb, stick | `projectile.mjs checkProjectile` | `def.ranged.proj`, `projkinds.js`, `PROJ_FX`, `PROJ_VIS`, registry V07 | rows in all three; radius in [0.1, 1.0], kb in [0, 12], `stick {unit,ground,prop}` >= 0, life in [0.2, 8]; hitscan kinds have a `beam` row; aoe/crater defs have `EXPLOSION_FX`; clip resolves (UC-20); Ancient: legacy numbers (radius 0.6 boulder else 0.3; kb 6 bolt else 1.5, `projectiles.js:62-63`) equal the AR verbatim rows | F | TBAF | delete the `rifle` row |
| UC-31 | projectile sound | `projectile.mjs checkProjectileAudio` + router dry-run (3.8) | `PROJ_AUDIO[kind]`, `EXPLOSION_AUDIO[kind]` | launch, hit-unit, hit-world and block cues resolve to an asset or an approved synth | F | F | delete the row: router falls to `bow_shoot` |
| UC-32 | launch geometry | `projectile.mjs checkMuzzle` | `ranged.muzzle`, `meta.bounds`, `turret` | non-hum1 with ranged: muzzle declared and inside bounds + 1.0 u; role vehicle with ranged has `turret` (M8) | F | TBAF | muzzle 9 u off the model |
| UC-40 | audio profile resolves | `tools/lib/uc_audio.mjs traceUnitCues` (3.8) | router dry-run, `AUDIO_PROFILES`, cue ledger | slots hit (3 damage types), swing/shoot, death (3 causes), voice, step each give >= 1 cue in `CUE_IDS` backed by a ledger row of the era (or a family in `manifest.sharedAudio`) or a `SYNTH_REASONS` entry; `dropped.unknown == 0`; new eras need an `AUDIO_PROFILES[def.id]` row (no tag/role fallback) | F | F | point `hit` at a non-existent cue |
| UC-41 | ability audio route | `audio.mjs checkAbilityRoutes` | each ability: `route` | `cast`: >= 1 cue; `event:<name>`: handler and cue; `passive`: id in `PASSIVE_ABILITIES`; Ancient: 7 silent-on-cast pinned (m) | F | F | an ability with no route |
| UC-42 | voice and class barks | `audio.mjs checkVoice` | class barks of the unit's bark role (Ancient `humor/barks.js BARKS[role][state]`; kit key `'<state>:<role>'`, M 3.12), `voice` cue | states `engage hurt rout cheer` each >= 1 line for the role (new roles `vehicle`, `air` included); voice cue resolves | F | F | delete the role row |
| UC-50 | string count | `text.mjs checkCount` | `def.text` | scalars (5) + deaths + taunts + moment lists >= 11 (new eras), >= 15 for role hero, role monster, tag boss and `bossCycle` ids; Ancient floor 10 | F | TBF | drop a death quote |
| UC-51 | word and size limits | `text.mjs checkLimits` | `def.text` | blurb 6..14 words; lore 18..35; deaths >= 3, unique, 3..12 words; taunts >= 2, 1..12; codexJoke 5..25; moment lines 1..12; name 3..24 chars | F | TBF | 15-word blurb |
| UC-52 | one string names the mechanic | `text.mjs checkMechanic` (3.7) | `row.text.mechanic {key, words}` | the string at `key` contains (case-insensitive, whole word or stem) >= 1 word of `mechanicWords(def)` | F | TBF | remove the word |
| UC-53 | moment keys | `text.mjs checkMoments` | `def.text` keys | every non-scalar key in `BARK_KEYS` (M 3.12) or the era kit; every list >= 2 lines | F | TBF | typo a key |
| UC-54 | text sweep and placeholders | `textSweep.unit(def)` (spec/H, ER11) + local rules | `def.text` | 0 banned/`REAL_WORLD` hits; no string equal to id or name; no `{` `}`; lint `dilution` clean | F | TBF | a `REAL_WORLD` word in a death quote |
| UC-60 | Codex entry renders | `codex.mjs checkCodex` | `statRows`, `ROLE_LABEL/ICON/CHIP[role]`, `abilityInfo(ab, glossary)`, `clipOptions` | finite rows; role rows exist; no ability text equals the generic `'A special ability.'`; Ancient: 7 units pinned (m) | F | TBF | new role without a `ROLE_LABEL` row |
| UC-61 | counters row | `codex.mjs checkCounters` | `unitinfo.matchups(def)`, `row.codex` | non-boss: `beatIds >= 1` and `weakIds >= 1`; boss: `row.codex.weakTo >= 1` and `counterHints(def)` non-empty; when `docs/balance/<era>.json` exists, `row.codex.counters` shares >= 1 id with the measured counters | F | BF | empty counter table |
| UC-70 | balance row present | `balance.mjs checkBalanceRow` (3.9) | `docs/balance/<era>.json` (Ancient `docs/balance_data.json`) | unit has a full matrix row for its mode with current `engineHash/eraHash` (STALE-ENGINE amber per VF age cap) | F | F | drop the unit from `pairs.ids` |
| UC-71 | band by mode | `balance.mjs checkBand` | same | field and boss [0.30, 0.62]; escort [0.10, 0.90] plus >= 1 prey and >= 1 counter row | R | F | hp x3 on the unit |
| UC-72 | cost agreement | `balance.mjs checkCost` (U7) | `era_<id>/balance.js DESIGN_COSTS`, `costFormula` | `abs(cost/designCost - 1) <= 0.15` (U7; Ancient worst drift 13.3% `battle_goat`, m); the formula residual is reported, not gated (Ancient worst 41.9% `axe_thrower`); vehicle and air have no formula (M 3.9): `designCost` is the only anchor | F | F | cost x1.2 |
| UC-73 | designed direction was written first | `balance.mjs checkClaims` (ER7) | `row.codex.counters`, `row.balance.directionCommit` | each claimed counter: >= 200 battles, Wilson 95% lower bound >= 0.55 and point >= 0.65; the row's commit precedes the data's | R | F | claim a pair that contains 0.50 |
| UC-80 | campaign membership | `pools.mjs checkMission` | `design/<era>/missions.json`, `validateMission` | id occurs in `roster`, `units`, `enemy.groups`, `generals`, `fixed` or `script` of >= 1 mission; `row.pools.firstMission` is the earliest by `MISSION_ORDER` | F | BF | remove the id from every mission |
| UC-81 | survival pool | `pools.mjs checkSurvival` (3.10) | 60 waves x 3 seeds | >= 2 appearances (Ancient min 4 of 180, m); bosses: id in `bossCycle` and present at its boss wave | F | BF | give the role no `SHARES` row |
| UC-82 | Quick faction | `pools.mjs checkQuick` (3.10) | faction chip, 6 styles x 6 seeds x 3 budgets | faction has a chip; unit in >= 25% of its faction's sweep armies (Ancient min 39%, m) | F | BF | unit with `cost 0` |
| UC-90 | roster key uniqueness | `roster.mjs checkKeys` (3.11) | era scope | no two units share (role, rig+species, melee style / proj, height class, sorted tag set) unless each names the other in `manifest.uc.variants` | F | TBAF | clone a row with a new id |
| UC-91 | body-type sharing | `roster.mjs checkBodyTypes` | era scope | <= 2 units per faction share (rig, species, build, scale bucket) | F | TBAF | third stocky hum1 in a faction |
| UC-92 | silhouette-unique unit per faction | `roster.mjs checkUnique` | hashes | every faction has a unit whose nearest `SD >= 0.35` (Ancient: 7 of 7, m) | F | BF | recolour a faction's only bespoke unit |
| UC-93 | counts equal the manifest | `roster.mjs checkCounts` | `manifest.expect`, `expect.uc` (3.13) | `building`: counts <= expect; `complete`: equal; bespoke >= 15 (floor) | F | TBF | add a 44th Ancient unit |
| UC-94 | boss table | `roster.mjs checkBosses` (3.11) | `bossCycle(era)` | 5 unique ids; tag `boss` set equals the cycle (new eras); <= 1 boss is hum1 (the suited giant, D21); each boss: bespoke, `react` set, text >= 15, nearest non-boss `SD >= 0.35` | F | BF | make a boss a scaled hum1 |
| UC-98 | row and def bijection | `roster.mjs checkRows` | `units.json`, defs | every def has one row, every row one def, ids unique; `tracer` flags equal the RA 3.17 tracer matrix | F | TBAF | delete a row |
| UC-99 | ledgers are healthy | `roster.mjs checkLedgers` | `uc_amber.json`, `uc_exceptions.json`, `manifest.uc.variants` | each entry: owner, deadline phase, signatures; none expired; <= 12 entries per era; variants <= 6 | F | TBAF | expired deadline |

### 3.3 The requestable clip set and its grading (UC-20..UC-27)

**Derivation (`tools/lib/uc_clips.mjs requestableClips(def, {era}) -> Map<id, {cls, why}>`).** Verified by a scan of `src/sim/**` at HEAD: the sim publishes **25 literal clip ids** plus the two functions. Ids that a def requests:

| ids | class | published by (file:line at HEAD) | requested when |
|---|---|---|---|
| `idle`, `idle_combat` | IDLE | `ai.js:140`, `possession.js:68,76` | always |
| `walk` | MOVE | `ai.js:139`, `dash.js:23`, `possession.js:75` | always |
| `rout` | MOVE | `ai.js:476` | always |
| `stagger` | REACT | `combat.js:187` | always |
| `stun`, `sleep`, `dizzy`, `flail`, `cheer` | STATUS | `combat.js:204` (stone death), `ai.js:152,191,177`, `hazards.js:92`, `world.js:894` (every living winner) | always |
| `death_back`, `death_front`, `death_spin` | DEATH | `combat.js:200-209 killUnit`, `revive.js:15` | always (legacy block); if `def.react` is set: every id of `REACTIONS[def.react]` (`deaths.*`, `default`) as DEATH and `hits.front/back` as REACT |
| `getup` | STATUS | `revive.js:25`, `summon_on_death.js:23` | only if the def has `revive` or `row.pools.spawnedBy` names it |
| `meleeClip(def,0)`, `meleeClip(def,1)` | ATTACK | `combat.js:33-37` (`strike_<style>`; `slash` alternates `_1/_2`) | `def.melee` |
| `def.ranged.clip or rangedClip(def)` | ATTACK | `combat.js:38-44`, M 3.8 | `def.ranged` |
| `reload_gun` | ATTACK | M `startReload` | `ranged.mag` |
| ability clips | CHANNEL (`beginChannel`) or STATUS (`setAnim`) | `abilities/*.js` | per table below |

Ancient ability clips (frozen table `ABILITY_CLIPS` in `uc_clips.mjs`, read from `abilities/*.js`): `kick: kick`; `dash: rear, walk`; `cc_field: effect confuse/sleep/stone -> cast, scare -> trumpet, panic_cav -> idle` (`cc_field.js:13-17`); `dot_cloud: cast`; `heal_pulse: cast`; `war_horn: taunt`; `net: throw`; `execute: meleeClip(def, atkN)`; `cluck: flap`; `summon_on_death: reveal`; `revive: death_back, getup`; `tantrum: tantrum`; `throne: sit, cower`; the other 14 implementations request none. New implementations (M13, M4, M5, M6b, M11) export `clips(ab) -> [ids]` on their registry entry (request R-UC2); `abilityClips(ab)` reads the entry first, the frozen table second.

**Drift test (`tests/uc/clips_drift.test.mjs`).** Every quoted literal inside the argument list of `setAnim(`/`beginChannel(` and every `clip: '...'` in `src/sim/**` must be in `BASE ids ∪ values of ABILITY_CLIPS ∪ clips() of new entries ∪ rangedClip/meleeClip outputs`; an unknown literal fails with `file:line`. Negative control: add `setAnim(u, 'wave', 1)` to an ability file.

**Resolution (`Animator.trace(model, id) -> {groups:[{gi, role, rig, asked, got, how}], gaits:[{id, sr}]}`, request R-UC1, ANIM-CLIPS, ~25 lines, read-only, no Ancient pose changes).** Until it lands, `uc_clips.mjs` reproduces it exactly: `Animator.invalidate(model)`, one `Animator.pose` with `clip = id`, then read `Animator.info(model).groups[g].cache` (keys are the derived ids `mountClip`, `RIDER_OF`, `CREW_*` ask for; values the resolved clip). `how` = `exact` (`got === asked`), `mapped` (`clipMap[asked]` or `species_asked`), `fallback` (FALLBACK chain), `none`. Reading only group 0 is wrong for mounted and crewed models (a first probe that read only group 0 reported 60 false MISSING requests on the 7 mounted units, m).

Example (m, HEAD): `trace(catapult, 'launch')` = `g0 base catapult1 launch->launch exact; g1..g3 crew hum1 crew_launch->crew_launch exact`; `trace(war_elephant, 'shoot_bow')` = `g0 base elephant1 shoot_bow->idle_combat fallback (the documented quiet one); g1,g2 crew hum1 crew_shoot->crew_shoot exact`; `trace(cataphract, 'strike_thrust')` = `g0 mount quad1 idle->idle; g1 rider hum1 ride_strike->ride_strike exact`. The attack is carried by the crew or rider group, which is why ATTACK looks at every group.

**Grades.** Rig classes: ORGANIC = hum1, hum_lite, quad1 (+species), elephant1, chicken1, insect1, dragon1; MACHINE = catapult1, ballista1, trojan1, chariot1, trebuchet1, ram1, gun1, tank1, car1, heli1, drone1, hover1, walker1. A composed model takes the class of group 0. Idle family = `idle` and `*_idle`.

| class | PASS iff |
|---|---|
| IDLE | `idle` exact in group 0; `idle_combat` exact (ORGANIC) or `idle` allowed (MACHINE) |
| MOVE | `trace.gaits` non-empty (>= 1 looped clip with `speedRef > 0`; hum1 walk/jog/run, quad1 walk/trot/gallop, chariot1 trot/gallop...) and `rout` resolves to the move family (`rout run gallop trot walk`) |
| ATTACK, CHANNEL | in some group `how` is `exact` or `mapped` and `got` is outside the idle family; timing present (UC-21). The documented quiet fallback of non-hum bases (`shoot_bow throw cast -> idle_combat`) passes only when a crew group (`r_ d_ a_ c*_`) resolves the same request exactly (elephant: `a1_` archers via `crew_shoot`) |
| REACT | `got` outside the idle family (`stagger` may land on `hit_front`) |
| STATUS | ORGANIC: outside the idle family unless listed in `FALLBACK_OK[rig]` (Ancient: empty); MACHINE: idle allowed |
| DEATH | `death_back` exact or mapped; `death_front`, `death_spin` may fall back to `death_back`; never idle; with `def.react`: every id of the table exact |

```js
// tools/lib/uc_clips.mjs
export function gradeRequest(def, model, id, cls, tr /* Animator.trace(model, id) */) {
  const idleFam = (g) => g === 'idle' || /_idle$/.test(g || '');
  const good = tr.groups.filter((r) => (r.how === 'exact' || r.how === 'mapped') && r.got && !idleFam(r.got));
  const base = tr.groups[0], machine = MACHINE.has(model.meta.rig);
  switch (cls) {
    case 'IDLE':   return id === 'idle' ? base.how === 'exact' : base.how === 'exact' || machine;
    case 'MOVE':   return tr.gaits.length > 0 && (id !== 'rout' || MOVE_FAMILY.has(base.got));
    case 'ATTACK': case 'CHANNEL': return good.length > 0 && timingOk(def, id);          // crew group counts; quiet fallback alone does not
    case 'REACT':  return !!base.got && !idleFam(base.got);
    case 'STATUS': return machine || !idleFam(base.got) || FALLBACK_OK[model.meta.rig]?.includes(id);
    case 'DEATH':  return id === 'death_back' ? good.length > 0 : !!base.got && !idleFam(base.got);
  }
}
```

**Ancient result (m, 43 units):** UC-20 has 1 finding, `minotaur rear -> idle` (hum1 `dash` wind-up; pinned); UC-26: `elephant1 chariot1 catapult1 ballista1 trojan1` lack `hit_back`, `trojan1` also `hit_front`; UC-24 legacy: those five rigs have a single death clip; UC-27: 5 units (PC-UC6). Timing example (m): `hoplite strike_thrust` baked 0.733/0.267 vs design 0.72/0.28 (+1.9%, -0.013 s); `catapult launch` 1.20/0.50 (0.0%); `war_elephant strike_gore` 0.967/0.467 (+1.8%, +0.017 s).

### 3.4 Silhouette hash, metric and thresholds (UC-15, UC-92, UC-94)

**Algorithm (`tools/lib/silhouette.mjs`, pure, Node; imports `rasterizeRest` from `era_ancient/beasts/common.js`, an era-neutral G file, AR map 01 note 30).**

```js
export const N = 32;
export function silhouetteHash(model) {                // -> {occ: sha1 hex of sorted rest cells, bits: Uint8Array(3*N*N), hex: 768 chars}
  const { cells } = rasterizeRest(model);              // rest pose, integer voxel cells (a,b,c), part rotations applied
  const V = [new Map(), new Map(), new Map()];         // views: front (a,b), side (c,b), top (a,c); distinct 2D cells only
  for (const c of cells.values()) { V[0].set(c.a+','+c.b,[c.a,c.b]); V[1].set(c.c+','+c.b,[c.c,c.b]); V[2].set(c.a+','+c.c,[c.a,c.c]); }
  return V.map(v => raster([...v.values()], N));      // concatenated
}
function raster(pts, n) {                              // crop to bbox, uniform scale s = n/max(w,h), centred in x, bottom-anchored
  /* x0,x1,y0,y1 = bbox; w = x1-x0+1; h = y1-y0+1; s = n/max(w,h); ox = (n - w*s)/2
     every source cell covers [ox+(x-x0)*s, +s) x [(y-y0)*s, +s); acc[ix,iy] += overlap area; bit = acc >= 0.5 */
}
export function silhouetteDistance(A, B) {             // pooled IoU over the 3 views
  let i = 0, u = 0; for (let k = 0; k < 3*N*N; k++) { const p = A[k], q = B[k]; if (p & q) i++; if (p | q) u++; } return 1 - i / u;
}
```

The raster is scale-invariant (a scaled copy of a model is the same silhouette: that is the point for "scaled hum1" bosses), aspect-preserving (a tank is not a square), and left-right sensitive. Cells come from `Math.sin/cos` rest rotations (`rotXYZ`), so the hash is **not** bit-compared across engines: fixtures store the hex per unit and the test requires `SD(stored, recomputed) <= 0.01` (cross-engine drift is a boundary cell or two). Cost (m): 43 models hashed in 0.23 s, all 903 pairs in 24 ms; 102 units (5,151 pairs) take about 0.15 s.

**Measurements on the 43 Ancient units (m, N=32).** 903 pairs: min 0.110 (`equites`/`hannibal`: same horse, different rider), then 0.115 (`companion_cavalry`/`cataphract`), 0.135 (`pilum_thrower`/`medjay`), 0.138, 0.152 (`hoplite`/`immortal`); quantiles 1% 0.224, 5% 0.316, 25% 0.461, median 0.608, 75% 0.673, max 0.785. Stability: min pair 0.101 at N=24, 0.110 at N=32, 0.094 at N=48. Sensitivity (hoplite with one slot swapped over all registry parts): helm swaps min 0, p10 0.080, median 0.194, max 0.283; weapon swaps p10 0.079, median 0.226, max 0.730; cape swaps median 0.037; torso-armour (18 parts) and leg-armour (13 parts) swaps give exactly 0.000 because their voxels stay inside the body block, so a unit that differs from a sibling only by armour parts fails UC-15; a colour-only change (palette, skin, metal) gives exactly 0.000. Nearest-neighbour `SD` per faction, best unit: hellenes `strategos` 0.36, romans `ballista` 0.46, egyptians `chariot_archer` 0.46, persians `camel_rider` 0.38, carthage `catapult` 0.50, barbarians `berserker` 0.46, mythic `sacred_chicken` 0.54.

**Thresholds (decision UC-D04).** FAIL `< 0.08`: below the Ancient minimum at every resolution (0.094), above the p10 of a one-helm swap, i.e. a unit that differs from a sibling by one cosmetic slot is rejected, a colour-only copy is rejected with certainty. AMBER `[0.08, 0.12)`: allowed only for a pair that names each other in `manifest.uc.variants` and the row's `recipe.variantOf` with a reason (the Ancient has 4 such units, pinned). PASS `>= 0.12`. Silhouette-unique `>= 0.35` (largest value at which all 7 Ancient factions have one). Bespoke (manifest `silhouettes`, plan "at least 15 bespoke silhouettes"): `meta.rig !== 'hum1'` (composed bases count) or (hum1 and nearest `SD >= 0.30`). Cross-era: the unit is compared with every unit of every built era (hashes of finished eras are fixtures), so a Medieval unit cannot be an Ancient recolour either.

### 3.5 Tint floors per rig class (UC-14)

| rig class | method | floor | Ancient (m) |
|---|---|---|---|
| hum1 humanoid (any `def.scale`, power armour, the suited giant, and the `rider_*`/`crew_*` blueprints inside composed units) | `tools/tintcheck.mjs tintReport(bp, optsFor(id))` (z-buffer projections front/back/side in the rest AND the READY pose) | pooled >= 0.30 in both poses; every projection >= 0.15 in both poses | 44 blueprints (28 units + 16 rider/crew) all pass; lowest pooled 30.7% (`rider_cataphract`, ready pose), lowest view 16.0% (`cyclops`, rest-pose side) |
| non-hum1, single rig | `beasts/common.js teamShare(model)` (rest-pose cells) | mean >= 0.15; min of front, side, top >= 0.03 | 15 models; lowest mean 0.162 (`chariot_archer`), lowest projection 0.045 (`battle_goat`) |
| composed (mounted, crewed) | `teamShare` of the whole model AND `tintReport` of each hum1 sub-blueprint | both rules above | passes |
| classes seen from above: RA 3.2 classes vehicle, air, mech (`tag mech`), boss, siege | `teamShare(model).top` | `top >= 0.08` (tightening, UC-D07) | lowest top 0.094 (`chariot_archer`); hum1 `medjay` 0.032 is hum1, not in this class |
| far mesh | `farLint` `FAR_TINT` (RA 3.1) | far share >= 0.7 x near share and the absolute floors above on the far mesh | RA-T03 |

`tintcheck.mjs` loads `era_ancient/units` and `STAT_TABLE` directly (`loadUnits`, `optsFor`): TOOLS-GATE adds `--era` (the unit blueprints of the era from the registry) without changing the Ancient output (request R-UC8). **Exceptions** (`tests/fixtures/uc_exceptions.json`): rows `{unit, clause:'UC-14', view, floor, measured, why, owner, deadline, signedBy:[REVIEWER, COORD]}`; absolute minima that no exception may go below: hum1 pooled 0.20 and view 0.10; non-hum1 mean 0.10, projection 0.02, top 0.05; a reason must name a design cause (for example cloak carries identity through the shader, plan M5) and a mitigation (tinted panels, trim, pennants, `F_TEAM` glow). The Ancient has no exception (m), and the per-rig exceptions list at P0 exit is empty for all 19 rigs (8 Ancient, 11 new); a rig where one is plausible (a cloak-capable unit whose identity is carried by the shader, a helicopter whose top view is rotor, a tank whose top view is turret deck) needs a measured failure first. Content roles cannot lower a floor or write the ledger (AR 3.8.3: TOOLS-VERIFY + request file).

### 3.6 Vocabularies and derived classes (UC-02, UC-04, UC-90, UC-91)

**Roles** are `spec/M` 3.3 `ERA_ROLES`: Ancient = `melee ranged cavalry hero siege support monster beast swarm` (frozen); Medieval = those nine + `air` (wyvern, cinderwyrm); Modern = `melee ranged hero siege support beast vehicle air`; Sci-Fi = `melee ranged hero siege support monster beast swarm vehicle air`. Role rows for every table (COST_ROLE, ROLE_GROUP, LINE_OF, squadSize, squadClass, GROUP_MAXTYPES, `ROLE_LABEL/ICON/CHIP`, `BARKS`) are checked by `tests/sim/roles.test.mjs` (M) and, at the unit level, by UC-60 and UC-42.

**Tags.** `ERA_TAGS[era] = ENGINE_TAGS ∪ manifest.uc.tags`. Ancient: the 18 tags in use (`spear elite fearless skirmisher archer cavalry lance support officer siege undead fire_weak general heavy large boss fire_panic animal`, m) plus `pike` and `discipline` (read by code, unused by defs). `ENGINE_TAGS` (file `src/sim/vocab.js`, SIM, request R-UC6) = those 20 + `air mech machine detector` (spec/M 3.9, 3.10). A **descriptive tag** (`manifest.uc.tags`: lower_snake, <= 64 per era, not an engine-tag name, one comment per tag naming the roster or counter row that uses it) is any other word; the Medieval master table uses 51 distinct tags (m), 18 of them engine tags and 33 descriptive (`organic` alone is on 22 of 34 rows). Predicates of the engine tags (UC-02 evaluates them on def and model; all hold for the 43 Ancient units, m: 0 violations):

| tag | meaning for the engine | predicate |
|---|---|---|
| `boss` | survival boss, armygen cost cap, balance `BOSS()` | id in `bossCycle(era)`; new eras: the tagged set equals the cycle |
| `cavalry`, `lance` | charge, anti-cavalry, mounted audio | `cavalry`: model base or sub rig is `quad1` or `chariot1`; `lance`: role cavalry or hero |
| `large` | knockback and size rules | measured height class >= L |
| `spear`, `pike` | brace, anti-cavalry counters | `melee.style` in `thrust pike` |
| `archer`, `skirmisher` | counters, scout, line | `def.ranged` exists |
| `officer`, `general` | death shock, kill-general objective | `general`: role hero; `officer`: role hero or support, or an `aura` ability |
| `animal` | audio, counters | role beast or swarm, or tag `cavalry` |
| `support`, `siege` | scout and counters | equal to the role |
| `air` | AIR target class (M 3.9) | `layer === 'air'`, and every `layer: 'air'` def carries it (its role is limited by M `E_LAYER`). **It does not mean "can shoot air"**; that is `ranged.air` |
| `mech` | MECH target class | role `vehicle` |
| `machine` | heal/repair/EMP filters | role vehicle, air or siege machines; every vehicle, drone, walker and engine carries it |
| `detector` | detect radius (M5) | `ai.detect` set |
| `fearless elite undead fire_weak fire_panic heavy discipline` | morale, armour, fire rules | no structural predicate, except `fire_panic`, which needs the ability `fire_panic` |

**Derived classes** (computed by `uc_spec.mjs derive(def, model)`; the row must equal them, UC-04): HP class `XS <= 70, S 71-140, M 141-250, L 251-450, XL 451-900, XXL > 900`; speed class `crawl <= 1.5, slow 1.6-2.2, mid 2.3-2.9, fast 3.0-4.2, air` (layer air); cost class `S <= 100, M 101-180, L 181-300, XL > 300` (the legend of `design/medieval/rosters.md`, unchanged); **height class** from `modelBounds(model).size[1] * def.scale * modelFor.scale[1]`: `S < 2.2, M < 3.9, T < 5.3, L < 7.2, XL` with `A` for layer air. The height boundaries sit in gaps of the Ancient distribution (m: S 2, M 26, T 11, L 3, XL 1); the roster legend (M 2.0-3.0, T 3.0-4.5) would cut the dense hum1 cluster 2.6-3.7 in two (PC-UC4). Weapon style key = `melee.style` and `ranged.proj` joined by `/`. Body type = `rig / species / build / scale bucket` where build is the blueprint `body.type` (`average slim stocky`, hum1 only) and the bucket is `round(scale*4)/4`.

### 3.7 Text clauses (UC-50..UC-54)

* **Count** `S(def) = 5 scalars (name plural blurb lore codexJoke) + len(deaths) + len(taunts) + sum of len(list) over every other array key`. Floor 11 for new eras = the 10 base strings (3 deaths, 2 taunts) + 1 mechanic string; floor 15 for role hero, role monster, tag boss and `bossCycle` ids. Ancient (m): min 10 (30 of 43 units), max 21 (`battle_goat`), mean 11.6, 10 heroes/bosses at 10-14 (max 14); the Ancient floor in the baseline is 10 and the 30 + 10 findings are pinned.
* **Limits.** Taken from `tests/humor/text.test.mjs` (blurb <= 14 words, lore <= 35, deaths/taunts <= 12, deaths >= 3 and unique, taunts >= 2, codexJoke > 8 chars) plus floors from the Ancient minima so that "A knight." cannot pass: blurb 6..14 (Ancient 8..14), lore 18..35 (24..35), deaths 3..12 words (3..12), taunts 1..12 (1..12), codexJoke 5..25 (6..17), moment lines 1..12 (1..11), name 3..24 chars (5..14). Counted words = whitespace-separated tokens.
* **Mechanic line (UC-52).** `row.text.mechanic = {key, words}`; `key` is `blurb`, `lore`, `codexJoke` or a moment key. `mechanicWords(def)` = tokens (split on `_` and space, lowercase) of: the unit's ability ids, `abilityInfo(ab).name`, the ability `kind`/`effect`/`shape` values, `melee.style`, `ranged.proj`, the unit's engine tags (`pike`, `lance`, `machine`...), `ai.doctrine`, `ranged.burst/mag/hitscan/arc/air` names (`burst`, `reload`, `beam`, `lob`, `anti-air`), `eshield` (`shield`), `cloak`, plus `kit.mechanicSynonyms` (era kit data). Both `row.text.mechanic.words` and the text must hit that set; matching is whole word, or the first 5 letters when the word has >= 6. A plain melee unit's mechanic is its weapon or tag word.
* **Moment keys (UC-53).** `BARK_KEYS` = union of the keys the sim barks (`w.bark(u, key)` literals and the event-derived keys; M 3.12 lists them; a drift test scans `src/sim/**` for `bark(` literals like 3.3).
* **Sweep (UC-54).** Calls `textSweep.unit(def)` of `spec/H`/ER11 (banned lists, `REAL_WORLD`, signed per-era allowlist); the local rules are: no string equals the id or the display name, no template braces, and the repo `dilution` lint passes. Cross-unit near-duplicates (Jaccard >= 0.6) are ER11's, over every registered string.

### 3.8 Audio clauses by router dry-run (UC-31, UC-40..UC-42)

`tools/lib/uc_audio.mjs traceUnitCues(def, ctx) -> {slots:{name:[cue...]}, status:{cue:'asset'|'synth'|'unjustified'|'unknown'}}` builds the real router (`createRouter` of `src/audio/cues.js`) with the era's merged defs, `rng = mulberry32(1)`, a recording `play` that throws on a cue id outside `CUES` (the engine's `dropped.unknown`), a stub world holding the unit, and the clock advanced 5 s per event so rate limits never hide a cue. Events (payload fields as in `tests/audio/router.test.mjs`; 30 repetitions per slot, 5 for abilities):

| slot | event | notes |
|---|---|---|
| `hit:<type>` for every type in the era's `DAMAGE_TYPES` that can hit the unit | `unit_hit {dst:2, dstDef:id, dmg:14, type, proj:false, aoe:false}` | no `srcDef`, so no attacker swing cue leaks in |
| `swing` (melee defs) | `unit_hit {src:2, srcDef:id, dstDef:<era anchor>}` | |
| `shoot` (ranged defs) | `projectile_launch {kind, srcDef:id, team:0}` | `srcDef` is added to the payload by M2 |
| `death:<cause>` for `melee ranged fire` plus every era cause the unit's weapons produce | `unit_kill {dstDef:id, cause}` | |
| `voice` | `bark {id, text}` with the stub world | |
| `ability:<id>` | per route (`cast`: `ability_cast {ability}`; `event:<name>`: that event) | |

A cue is `asset` when `tests/audio/gen_coverage.mjs coverage()` lists >= 1 real ledger row for it with `row.era` in `{era, 'all'}` (the `era` ledger column of AU3; request R-UC4), `synth` when it has none and `SYNTH_REASONS[cue]` exists, `unjustified` otherwise (FAIL). Thresholds: every slot the unit has is non-empty (the profile may reuse a family: a shared Ancient family must be named in `manifest.sharedAudio`); `AUDIO_PROFILES[def.id]` exists for new eras and every cue of every slot is reachable through it (a router change that makes the unit fall to the default family fails UC-40); Quick-look: the union of `hit:*` cues for armoured defs (`armor >= 0.3`) includes an armour cue and for machines a hull/metal cue (`mat` of the profile). UC-31 adds: `PROJ_AUDIO[kind]` and `EXPLOSION_AUDIO[kind]` rows exist and `shoot` is not the default `bow_shoot` for a non-arrow kind (HEAD: any unknown kind plays `bow_shoot` + `arrow_whoosh`, map 07). UC-41: each ability has `route` in {`cast`, `event:<name>`, `passive`}; `PASSIVE_ABILITIES` is exported by the ability registry meta (M13). UC-42: the class bark table has the 4 states (`engage hurt rout cheer`) for the unit's bark role (Ancient `BARKS[role][state]`, 9 roles x 4 states; era kits `'<state>:<role>'`, M 3.12) and the voice slot is not the shared generic `taunt` for hero, monster, boss, vehicle, air, mech (q1_content Q33).

**Ancient (m, 43 units, legacy resolver).** `hoplite`: `hit:slash -> hit_blade hit_flesh_light block_shield hit_armor`, `swing -> spear_thrust`, `death:fire -> death_scream`, `voice -> taunt`, `stance` silent (passive). `catapult`: `shoot -> catapult_launch boulder_whoosh`, `death -> wood_crack death_male`, `misfire` silent on `ability_cast` (its sound is the event `catapult_misfire`, `cues.js:480`). `war_elephant`: `shoot -> bow_shoot arrow_whoosh` (the archer crew), `death -> elephant_trumpet death_big`, `cc_field -> curse_whoosh`, `fire_panic` silent. Seven of 27 ability ids are silent on `ability_cast` (`stance hook breaks_shield fire_every misfire misaim fire_panic`); `voice` is the generic `taunt` for all 43. All pinned in the baseline.

### 3.9 Balance modes and bands (UC-70..UC-73)

Source of the modes: `tools/balance.mjs` (`analysePairs` lines 563-573, `BOSS` line 41, the `escortPair` job, verdicts U5a/U5b/U7, lines 583-600). Mode is derived, never chosen: `escort` if role is `support` or `siege`; `boss` if `BOSS(def)` (tag boss or role monster); else `field`; `row.balance.mode` must equal it (UC-04).

| mode | statistic | band | opponents / rule | Ancient (m, stored `docs/balance_data.json`, 1,806 pair battles + 546 escort pairs x2) |
|---|---|---|---|---|
| field (32 Ancient units) | mean win rate vs every other unit except support (`pairs`, equal cost, both orientations, draw 0.5) | [0.30, 0.62] (upper = U5a in code; lower = plan section 0.5) | all non-support units | 31.6% (`sparabara`) .. 59.2% (`sacred_chicken`) |
| boss (4) | same, opponents of cost >= 120 or boss only (the code's by-design rule) | [0.30, 0.62] | `analysePairs` filter | 50.0% (`minotaur`) .. 57.7% (`cyclops`, `medusa`); `war_elephant` 53.8% |
| escort (7) | mean over the other units of the `escortPair` score (unit at 30% of the budget + 70% anchor vs the other unit at 30% + the same anchor; both orientations; new eras: >= 4 battles per cell) | [0.10, 0.90] AND >= 1 prey row (score >= 0.60) and >= 1 counter row (<= 0.40) (U5b) | support and siege roles | 14.3% (`druid`), 23.8%, 32.1%, 34.5%, 40.5%, 77.4% (`catapult`), 83.3% (`priest_of_ra`) |

The escort band is deliberately wide: the same statistic spans 0.14..0.83 on the shipped Ancient units, and the rejected alternative (swap 30% of an anchor army for the unit and fight the pure anchor army) is bimodal (m, n=20 per unit: druid 0%, philosopher 15%, priest_of_ra 95%, senator 90%, trojan_horse 0%, ballista 0%, catapult 85%; at role-share 10-20%: druid 15%, philosopher 100%, senator 50%, centurion 40%, xerxes 100%), so no tight band exists for escorted roles; their tight judgement is the designed-direction pairs of ER7 (UC-73). Bands live in `tools/lib/bands.mjs` (AR 3.8.4) as `UC_FIELD [0.30,0.62]`, `UC_ESCORT [0.10,0.90]`, an era `balance.js` may override only with a mandatory `why`; content roles cannot edit them. **Presence (UC-70):** the unit has a complete row in the era's data (`docs/balance/<era>.json`; Ancient `docs/balance_data.json`), whose `meta` carries `engineHash`/`eraHash` and the `engine` tag; a stale record is amber (age cap in VF), a missing unit is FAIL. U5a also stays as is for Ancient (`> 0.62` fails).

### 3.10 Pool sweeps (UC-80..UC-82)

* **Campaign (UC-80):** the unit id occurs in `roster`, `units`, `enemy.groups[].defId`, `enemy.generals`, `fixed[]`, `reference` or `script` of >= 1 mission (JSON of `design/<era>/missions.json` and the shipped campaign); `row.pools.firstMission` is the first by `MISSION_ORDER` and `side` P (player) or E (enemy). Ancient (m): 43 of 43 appear (`hoplite` in 6 missions, `catapult` in `alps_elephant` and `troy_giftshop`, `war_elephant` in `alps_elephant`).
* **Survival (UC-81):** `survivalWave(n, seed, {era})` for n = 1..60 and seeds 1..3 (180 waves): the unit occurs in >= 2 waves; a `bossCycle` id occurs at its boss waves. Ancient: min 4 of 180 (`sacred_chicken`), then `senator druid philosopher` 10, `ballista` 12; `hoplite` 50, `catapult` 26, `war_elephant` 44.
* **Quick (UC-82):** the faction has a chip in `content.factions` and for each of the 6 `STYLES` x seeds 1..6 x budgets 3000, 8000, 20000 (108 armies per faction) `generateArmy({faction, style, budget, seed, defs, era})` contains the unit in >= 25% of them. Ancient: all 43 reachable; lowest `cyclops` 39%, `medusa` 54%, `minotaur` 55%; `hoplite` 108/108, `catapult` 72/108, `war_elephant` 84/108. A role without a `SHARES`/`GROUP_MAXTYPES` row is never drawn, which is exactly what this sweep catches for `vehicle` and `air`.

### 3.11 Roster-level checks and the boss table (UC-90..UC-94, UC-98, UC-99)

* **UC-90 key.** `key(u) = role / rig+species / meleeStyle+proj / heightClass / sorted(tags)`. Two units with the same key fail unless each lists the other in `manifest.uc.variants = [[a, b, 'reason']]` (<= 6 per era; both rows carry `recipe.variantOf`; the pair still needs `SD >= 0.08`). The Medieval audit (`design/medieval/rosters.md` section 4) already names its near pairs (`ram1` tower, `trebuchet1` x1.6): they become the first ledger rows.
* **UC-91.** Per faction at most 2 units share a body type (3.6). **UC-92.** Per faction at least 1 unit has nearest `SD >= 0.35`; checked only when the manifest is `complete`, reported as a count while `building`.
* **UC-93.** Counts from `manifest.expect` (AR 3.8.2) and the block of 3.13: `building` is `<=`, `complete` is `==`; bespoke silhouettes >= 15 (floor, plan 1).
* **UC-94 boss table (5 per era).** `bossCycle(era)` has 5 unique registered ids; the set of units tagged `boss` equals it (new eras); at most 1 boss is hum1 (the single suited giant, plan D21); each boss: bespoke, `react` set, text floor 15, nearest non-boss `SD >= 0.35`, mode `boss`, and appears in >= 1 mission as an enemy (`boss` side E) or in the survival cycle. Plan 5: "boss table of 15 with one non-scaled-hum1 silhouette per era boss" = this clause.
* **UC-98.** `design/<era>/units.json` and the defs are in bijection; `tracer: true` rows equal the RA 3.17 tracer matrix units of the era.
* **UC-99.** Ledgers: every amber, exception and variant has owner, deadline phase, signatures; none past its deadline phase; at most 12 amber+exception entries per era.
* **Ancient result (m), pinned:** UC-90: 3 groups, 8 units (`cretan_archer nubian_archer`; `khopesh_warrior legionary`; `medjay immortal gladiator hoplite`); UC-91: hellenes 3, romans 3, egyptians 4, persians 3 (4 factions); UC-92: 7 of 7 pass; UC-94: 4 of 5 bosses are hum1 (`minotaur cyclops medusa pharaoh`; only `war_elephant` is bespoke) and the `boss` tag marks 2 of the 5 cycle ids.

### 3.12 `UNIT_SPEC` rows (`design/<era>/units.json`)

File: `{"era": "<id>", "version": 1, "units": [Row, ...]}`; one row per unit, written first (the roster), completed by the unit WP, never duplicating a number of `stats.js` (single source: the row holds intent and classes, the clause compares). `tools/uc/spec_seed.mjs --era=medieval` seeds rows from the master table of `design/medieval/rosters.md` (columns id, name, faction, role, tags, rig, weapon style/projectile kind, ability ids, ai style, hp/speed/cost class, counters, weakTo, silhouette discriminator, height class, joke engine, bark role, first mission, model recipe note, tracer) and writes `"unset"` into every field it cannot parse; `validateRow` rejects an `unset` at `status !== 'planned'`. `tools/lib/uc_spec.mjs validateRow(row, ctx)` returns `[{code, path, msg}]`: `S_SCHEMA S_UNKNOWN_KEY S_ENUM S_ID S_UNSET S_MISMATCH:<field> S_ORPHAN S_MISSING_ROW`.

| field | type and rule | compared with (UC-04) |
|---|---|---|
| `id` `name` `era` `faction` | `id` = STAT_TABLE key; `name` = `UNIT_TEXT.name`; faction in the era | def, text |
| `role` `layer` | in `ERA_ROLES[era]`; `ground hover air` | def |
| `tags` | sorted, in `ERA_TAGS[era]` | def.tags (set equality) |
| `status` | `planned` (roster only), `wp` (WP-A accepted, text/audio/balance pending: `PEND` allowed), `done` (set `DONE` green) | clause statuses |
| `classes` | `{hp, speed, cost, height}` letters of 3.6 | `derive(def, model)` |
| `weapon` | `{melee: {style}\|null, ranged: {proj, clip\|null, burst\|null, mag\|null, hitscan\|null, air\|null}\|null}` | def.melee, def.ranged |
| `abilities` | ability ids in def order | def.abilities |
| `ai` | `{style, doctrine\|null}` | def.ai |
| `recipe` | `{kind: BP\|BM\|BB\|BS, rig, species\|null, build\|null, scale, blueprintId\|null, builder\|null, crew: int\|null, variantOf: id\|null, farKeep: [partId or feature name], discriminator: 12..160 chars, bespoke: bool}`; BP = hum1 blueprint through `compileSoldier`, BM = `buildMounted`, BB = bespoke builder, BS = hum1 with a bespoke part module | model.meta.rig, species, farKeep ids, measured bespoke (3.4) |
| `react` | key of `REACTIONS` or `null` (legacy block, Ancient and Medieval infantry/mounted) | def.react |
| `audio` | `{profile\|null, shared: [families], voiceRole}`; `profile` = key of `AUDIO_PROFILES` | UC-40, UC-42 |
| `text` | `{engine: E0\|E1\|E2\|E3 (humour engine of the era; E0 = the Ancient), barkRole, mechanic: {key, words[]}\|null, momentKeys[]}` | UC-50..53 |
| `codex` | `{counters[], prey[], weakTo[]}` ids or descriptive tags (the Ancient back-fill takes `counterTable` rows and the plain-language `counterHints(def).weak` strings); designed direction, written before measuring | UC-61, UC-73 |
| `balance` | `{mode, designCost, designDirection, directionCommit}`; mode is derived (3.9) | UC-70..73 |
| `pools` | `{firstMission, side: P\|E, spawnedBy\|null}` | UC-80 |
| `tracer` `wp` | bool; WP id (`UNITS-MED/3`) | UC-98 |

`spec_seed.mjs` parse rules (table columns of `rosters.md` section 1): `tags` split on `, `; `rig` first token (`hum1`, `quad1`, `tank1`...) plus `species` after the word `species`; `recipe.kind` from the leading code of the "model recipe note" (`BP BM BB BS`) with `crew` from "+ N lite crew"; `weapon.melee.style` / `weapon.ranged.proj` from the first backticked word of "weapon style / projectile kind"; `abilities` = backticked ids of "ability ids" (`none` -> `[]`); `ai` from "ai style"; `classes` letters copied then checked against `derive()` (a mismatch is reported once, then the measured letter wins); `codex.counters` / `weakTo` split on `, `; `pools.firstMission` / `side` from "first mission" (`M3 P` -> `med_m03`, `P`); `tracer` from `T` / `-`. Unparsable cells become `"unset"`. The seed is run once per era after the roster is final (OI-UC1) and never overwrites a row whose `status` is not `planned`.

**Worked example A, Ancient back-filled (real values, m).** `hoplite`, in `design/ancient/units.json` (written by `tools/uc/spec_seed.mjs --era=ancient --backfill`, which reads the shipped defs; the Ancient rows are generated, not authored, and checked in as a fixture):

```json
{ "id": "hoplite", "name": "Hoplite", "era": "ancient", "faction": "hellenes", "role": "melee", "layer": "ground",
  "tags": ["spear"], "status": "done", "classes": { "hp": "M", "speed": "mid", "cost": "S", "height": "M" },
  "weapon": { "melee": { "style": "thrust" }, "ranged": null }, "abilities": ["stance"], "ai": { "style": "hold", "doctrine": null },
  "recipe": { "kind": "BP", "rig": "hum1", "species": null, "build": "average", "scale": 1, "blueprintId": "hoplite", "builder": null,
              "crew": null, "variantOf": null, "farKeep": [], "discriminator": "Corinthian helm, tall round shield, spear", "bespoke": false },
  "react": null, "audio": { "profile": null, "shared": [], "voiceRole": "melee" },
  "text": { "engine": "E0", "barkRole": "melee", "mechanic": null, "momentKeys": [] },
  "codex": { "counters": ["khopesh_warrior", "mummy", "berserker"], "prey": ["senator", "druid", "pharaoh"], "weakTo": [] },
  "balance": { "mode": "field", "designCost": 100, "designDirection": null, "directionCommit": null },
  "pools": { "firstMission": "marathon_sort_of", "side": "P", "spawnedBy": null }, "tracer": false, "wp": "ancient-backfill" }
```
(`hp 150`, `speed 2.6`, `cost 100`, model height 3.30 u -> class M; `counters/prey` = `counterTable` heuristic rows, `engine E0` = the Ancient engine, `mechanic: null` = the Ancient floor.)

**Worked example B, hypothetical new-era unit (illustrative; id `ex_tank`, not a roster entry).** A Modern main tank, to show every field a bespoke unit fills:

```json
{ "id": "ex_tank", "name": "Brass Hornet", "era": "modern", "faction": "ex_corps", "role": "vehicle", "layer": "ground",
  "tags": ["armoured", "heavy", "machine"], "status": "wp", "classes": { "hp": "XL", "speed": "mid", "cost": "XL", "height": "M" },
  "weapon": { "melee": null, "ranged": { "proj": "shell", "clip": "fire_tank", "burst": null, "mag": null, "hitscan": null, "air": false } },
  "abilities": [], "ai": { "style": "charge", "doctrine": "tank" },
  "recipe": { "kind": "BB", "rig": "tank1", "species": null, "build": null, "scale": 1, "blueprintId": null, "builder": "ex_tank", "crew": 0,
              "variantOf": null, "farKeep": ["gun", "cleatL", "cleatR"], "discriminator": "long barrel with a muzzle brake, wide tread skirts, turret set back", "bespoke": true },
  "react": "mod_tank", "audio": { "profile": "mod_tank", "shared": [], "voiceRole": "vehicle" },
  "text": { "engine": "E2", "barkRole": "vehicle", "mechanic": { "key": "blurb", "words": ["turret", "armour"] }, "momentKeys": ["reload", "engage", "hurt"] },
  "codex": { "counters": ["ex_at_gun", "ex_gunship"], "prey": ["ex_rifleman"], "weakTo": ["mine", "ex_at_gun"] },
  "balance": { "mode": "field", "designCost": 380, "designDirection": "wins in the open against infantry masses; loses to anti-tank guns and to a flank on the rear armour", "directionCommit": "<sha of the commit that added this row>" },
  "pools": { "firstMission": "mod_m04", "side": "E", "spawnedBy": null }, "tracer": true, "wp": "UNITS-MOD/7" }
```
Files this one row implies (the unit WP's list, 3.16): `stats.js` row (SIM numbers: role `vehicle`, `turret {rate, arc}`, `armorFace`, `ranged {proj shell, clip fire_tank, minRange}`), `beasts/<file>.js` builder `ex_tank` on `tank1` with `meta.farKeep`, `meta.aimParts`, `meta.driven`, `meta.bounds`, `meta.flinchK`, `reactions.js` key `mod_tank` (exists or is added by ANIM-RIGS), `audio_profiles.js` row, `humor/units_text.js` row (COMEDY-MOD, from `text.engine` and `mechanic`), look-dev JSON, filmstrips CSV, and this row.

### 3.13 Per-era manifest block `expect.uc` (extends AR 3.8.2)

```js
// src/content/era_<id>/manifest.js  expect.uc   (equalities at phase 'complete', <= at 'building')
uc: { roles:      { melee: 10, ranged: 7, cavalry: 6, hero: 6, support: 4, monster: 4, siege: 3, beast: 2, swarm: 1 },   // Ancient exact, sum 43
      perFaction: { hellenes: 7, romans: 7, egyptians: 8, persians: 5, carthage: 4, barbarians: 5, mythic: 7 },           // Ancient exact, sum 43
      bosses: 5, heroes: 6, bespokeMin: null,                                      // new eras: bosses 5, bespokeMin 15
      heightClasses: { S: 2, M: 26, T: 11, L: 3, XL: 1 },                          // Ancient exact (measured); new eras: informational, equality at complete
      textFloor: { unit: 10, heroBoss: 10 },                                        // Ancient; new eras { unit: 11, heroBoss: 15 }
      set: 'done', tags: [], variants: [], tintExceptions: [], legacy: true,                     // new eras: set starts 'tracer' (COORD raises it, 3.15), legacy false, tags = descriptive list, variants [[a,b,why]]
      tracers: [] }                                                                  // new eras: the unit ids with tracer:true (== RA 3.17 matrix)
```
New-era targets: `roles` sums to `expect.units` (34, floor 30) with every key in `ERA_ROLES[era]` and none outside; `perFaction` sums to the same total over 5-6 factions with a per-faction count of 4..8; `bosses` 5; `bespokeMin` 15; `silhouettes` of AR 3.8.2 is evaluated by 3.4's bespoke rule; a count below plan section 1 needs a `cuts` id (V12). `tests/arch/manifests.test.mjs` (AR-T25) gains these keys; `tools/uc/manifest_fill.mjs --era=ancient` prints the Ancient block from the shipped defs (m: roles 10/7/6/6/4/4/3/2/1, factions 7/7/8/5/4/5/7).

### 3.14 Sets: tracer subset `UC-B`, tracer, work package, done

| set | purpose and when it runs | clauses |
|---|---|---|
| `TRACER` (letter T) | one tracer per rig in P1 (RA 3.17 matrix, q2_schedule Q8: the full contract minus the six clauses impossible in P1) | UC-01..04, 10..17, 20..24, 26, 27, 30, 32, 50..54, 60, 90, 91, 93, 98, 99 |
| `UC-B` (letter B) | calibration checkpoint 2 (after M7 + M12 + M14, plan 12): the plan's "UC minus reactions per cause, audio profile and the balance band"; the projectile sound row (AU4) leaves with the audio clauses | everything except UC-25, 31, 40, 41, 42, 70..73 |
| `WP-A` (letter A) | hand-back of a unit WP (3.16): the clauses UNITS/ANIM/RENDER own | UC-01..04, 10..17, 20..24, 26, 27, 30, 32, 90, 91, 98, 99 |
| `DONE` (letter F) | "a unit is done" (plan 0.5) | all 47 clauses |

**Unlock tags (q3_program 15; "needs later phase" per clause).** UC-01/02: M0 (#1, P1: `validateDef`, `vocab.js`); UC-03: registry (P1); UC-04: rosters seeded in P0 + `uc_spec.mjs` (P1); UC-10..12: RA builders (P1); UC-13: `farLint` (RENDER, P1); UC-14: `tintcheck --era` (P1); UC-15, 92: `silhouette.mjs` (P1); UC-16, 17: `lookdev.mjs` (RA, P1); UC-20: `Animator.trace` (P1) + RA clips; UC-21: M2 (#4) for burst/mag legality, otherwise P1; UC-22/23/26: RA clips (P1); UC-24: reaction tables as data of the rig (RA U-R5, P1); **UC-25: M17e (#13)**; UC-27: UI request R-UC5 (P1); UC-30: M2 (#4) + R1 `PROJ_FX` (P1); **UC-31, 40-42: AU4 (P2; draft until the M2 taxonomy freeze)**; UC-32: M2 (#4) for `muzzle`, M8 (#14) for `turret` data (schema is M0); UC-50..54: COMEDY rows (a tracer's text is written in P1); UC-60: ROLE rows (CU, P1); UC-61: CU14 (P2); **UC-70..73: BALANCE after S-FREEZE of the era (E-FREEZE for Medieval)**; UC-80: `missions.json` (P0 design) in B, `validateMission` in F; UC-81/82: M0 era argument on armygen/waves (P1); UC-90..99: rosters (P0).

**Tracer checklist (P1, per tracer unit, printed by `tools/uc/tracer_check.mjs --unit=<id>`):** the T-set table with PASS or `PEND(owner, unlock)`; `PEND` is legal only for the unlock tags above that are later than P1 (UC-25, 31, 40-42, 61, 70-73, 80-82) and for UC-92/94 while `building`; the filmstrip CSV exists for every clip of the rig; `lookdev/<rig>/<unit>.json` exists with `rounds` within the cap; the tracer's `status` is `wp`. **Calibration 2 (S-slice):** the clauses are data and Node level except UC-25 and the router dry-run, so every rig class (tank, heli, drone, hover, dragon, trebuchet, ...) is measurable on set B before M8/M4/M5/M6b land; what is not measurable there is behaviour (turret gating, shield regeneration, cloak, EMP), which the mechanic slices judge and UC does not. No projection scale factor is needed: the clause groups outside B belong to other roles' WPs that `wbs.csv` counts as their own rows (AU4 rows, BALANCE windows, M17e); cost per UC-B unit is the measured `ledger_stats` of the unit WP.

### 3.15 `tools/contracts.mjs`, `tools/gate.mjs`, `--strict` as the default, the end of the soft finding

HEAD facts: `contracts.mjs` is 90 lines; the per-unit loop (lines 27-48) checks `cost hp speed radius > 0`, text length >= 6 and >= 3 deaths / >= 2 taunts, `modelFor`, parts <= 48 and abilities; the model channel is SOFT (`S(...)` at lines 35 and 41: "fallback model"); `ids.length !== 43` (line 49); `gate.mjs:28` runs `step('contracts', 'node', ['tools/contracts.mjs'])` with no flag; `--strict` on HEAD is green (m).

**CLI.** `node tools/contracts.mjs [--era=<id|all>] [--units=a,b] [--set=tracer|b|wp|done] [--tier=F|E|R] [--clauses=UC-10,UC-14] [--matrix] [--json[=path]] [--no-strict]`. Defaults: `--era=all` (the registry list including hidden eras, `tests/_eras.mjs`), `--set` = the era's `expect.uc.set` (below), `--tier=F`, strict on. `--strict` is accepted and does nothing. `--no-strict` is for local debugging only: it downgrades AMBER and PEND to prints and exits 2 when `CI`, `VW_GATE` or `VW_SNAPSHOT` is set. Exit 0 = no FAIL, no unledgered AMBER, no illegal PEND; 1 otherwise; 2 = usage.

**What "strict" means (UC-D02).** (1) A clause that cannot find its input FAILS (no silent default; this is the unit-level twin of spec/M 3.9). (2) The soft channel `S()` is deleted: fallback model is UC-10, hard for every era including Ancient. (3) `AMBER` is allowed only with an entry in `tests/fixtures/uc_amber.json` (`{clause, unit, value, owner, deadlinePhase, reason, signedBy: [REVIEWER, COORD]}`; checked by UC-99); an unledgered AMBER fails. (4) `PEND` is legal only where 3.14's unlock tags say the owner has not delivered AND the unit's `status` is not `done`; in the era's `DONE` run it never is. (5) Ancient `LEGACY`/`PIN` results must equal `tests/fixtures/uc_ancient_baseline.json` both ways.

**Set per era and per unit (ratchet).** `manifest.expect.uc.set` (`tracer` -> `b` -> `done`) is raised by COORD at the P1 exit, at calibration 2 and at the era's E-FREEZE and never lowered; a unit whose row says `status: 'done'` is always held to `done`.

**Baseline file (`tests/fixtures/uc_ancient_baseline.json`, written by `tools/uc/record_ancient.mjs`, golden rules).** `{engine: 'node22', head: '<sha>', cells: {PASS, LEGACY, PIN, NA}, pins: {'UC-13': [...farlint fixture ids], 'UC-15': [{unit, vs, value, status: 'AMBER'} x4], 'UC-20': [{unit: 'minotaur', request: 'rear', got: 'idle'}], 'UC-23': [shared ids], 'UC-24': [{rig, deaths: 1} x5], 'UC-26': [{rig, missing: ['hit_back'] ...} x5 rigs], 'UC-27': [5 units], 'UC-41': [7 abilities], 'UC-42': [43 units], 'UC-50': {floor: 10, below11: 30, heroBossBelow15: 10}, 'UC-60': [7 units / 7 abilities], 'UC-90': [3 groups], 'UC-91': [{faction, n} x4], 'UC-94': {hum1Bosses: 4, taggedBoss: 2}}}`. The silhouette hex strings are in `uc_silhouettes_ancient.json` (43 x 768 chars). `record_ancient.mjs` refuses to run unless `git diff ancient-v8 HEAD -- src/content/era_ancient` is empty.

**Edits to `contracts.mjs` (TOOLS-GATE, request file `docs/requests/uc_contracts.md`):**
1. Lines 4-12 (`buildContent`, `BP`, `ARENAS`, `MUTATORS_TEXT`, `ACHIEVEMENTS`, `PROP_CATALOG` from `era_ancient`) become `import { ERA_IDS, contentFor, expected, ensure } from '../tests/_eras.mjs'` and loop `for (const era of ERA_IDS)`; arena, mutator, achievement, asset and doc sections keep their rules, made era-parametric as AR 3.8.4 lists.
2. Lines 27-48 are replaced by `runMatrix(era, {units, set, tier})`; the old hard rules survive as UC-03 (stats > 0), UC-11 (parts <= 48), UC-02 (abilities) and become stricter in UC-50/51 (text); lines 35 and 41 are deleted (UC-10).
3. Line 49 becomes UC-93 (`expect.units`/`expect.uc`); the literal 43 disappears.
4. Lines 86-90: `bad = hard.length + unledgeredAmber + illegalPend`; the matrix is printed (`--matrix` always in the gate log, summary line otherwise) and written to `.cache/gate/uc_matrix.<era>.json`; `criterion('ER3', {script: 'tools/contracts.mjs', tier, negctl: 'tests/negctl/UC-*.mjs'})` registers.
5. `process.exit` code table above.

**Edits to `gate.mjs` (OW-20):** line 28 becomes `step('contracts', 'node', ['tools/contracts.mjs', '--era=all', '--strict'])` in T-fast (Node tier F clauses of each era's current set; budget 10 s per era, UC-D19); T-era adds `--era=X --tier=E` (UC-12 preview, UC-13 pixels, UC-16, UC-17); the release set adds `--set=done --tier=R` (UC-71, UC-73). A test (`tests/uc/contracts_cli.test.mjs`) fails if `gate.mjs` lacks `--strict` or passes `--no-strict`.

### 3.16 Accepting a unit work package

A WP is **4 humanoid units** (hum1 BP or BS) **or 1 unit of any other class** (vehicle, mech, boss, siege, alien, mounted knight, bespoke). Inputs: the units' rows at `status: 'planned'`. Deliverables per WP: for each unit the row completed (`recipe`, `farKeep`, `react`, `audio`, `text.mechanic`...), the `stats.js` row (OW-15 lets UNITS-x add NEW rows), the blueprint or builder (OW-16), `reactions.js` / `audio_profiles.js` rows when the key is new (AM-UC2), the look-dev JSON and filmstrip CSV (RA 3.17), and `UNIT_TEXT` rows by COMEDY-x in parallel. Procedure and command: `node tools/uc/wp_accept.mjs --era=<id> --wp=<WP id> --units=a,b,c,d`:

1. `contracts --era --units --set=wp --tier=F` and `--tier=E` all green (AMBER only if ledgered).
2. `tools/own_check.mjs --role=<ROLE>` (AR 3.8.3): the diff touches only the WP's files.
3. `lookdev/<rig>/<unit>.json` exists for every unit, `rounds` within the cap (infantry 2, vehicle/siege/air/alien 3, boss/hero 4; a hit cap is a COORD `cuts.md` entry), and every judged item is signed by a REVIEWER id different from the builder (the reviewer runs `tools/lookdev.mjs --review`, not the builder).
4. A snapshot T-fast run of the closure (`gate.mjs --snapshot --era=<id>`) is green, or each red step is shown not to be the WP's.
5. The script prints the hand-back table of `AGENTS.md` ("criteria table") from the matrix rows, writes `docs/eras/ledger/wp/<WP id>.json` (`{units, sha, set, results, rounds, sessions}`; feeds `ledger_stats` for calibration) and exits 0.

Exit 0 = **WP accepted** (`status: 'wp'`; text, audio, mission, balance clauses may be `PEND(owner, unlock)`). The unit becomes `done` only when `contracts --era --units=<id> --set=done` is green; `tools/uc/promote.mjs` (COORD only) flips the status, and from then on the unit is held to `done` (ratchet). A WP of a boss or hero adds UC-94 for its row; a bespoke WP that needs a new rig is blocked until the rig tracer of RA 3.17 is accepted.

### 3.17 Worked example: the matrix for three Ancient units

Command: `node tools/contracts.mjs --era=ancient --units=hoplite,catapult,war_elephant --set=done --matrix`. Values are the real ones measured on HEAD by the prototype that reproduces 3.3-3.10 (`LEGACY` = evaluated through the legacy equivalent and equal to the baseline; `PIN` = a finding the Ancient has today, pinned, not fixed; `NA` = the rule that makes the clause not apply is printed in the full output). Per-unit clauses only (40 rows); the 7 era-level clauses follow.

```
UC matrix  era=ancient (legacy)  set=DONE  units=3  per-unit clauses=40  baseline=tests/fixtures/uc_ancient_baseline.json
clause hoplite                      catapult                     war_elephant
UC-01  LEGACY 27 TOP_KEYS           LEGACY 27 TOP_KEYS           LEGACY 27 TOP_KEYS
UC-02  PASS melee spear             PASS siege siege             PASS monster large boss
UC-03  PASS                         PASS                         PASS
UC-04  PASS row=backfill            PASS row=backfill            PASS row=backfill
UC-10  PASS                         PASS                         PASS
UC-11  PASS 13p 1919v 3.30u         PASS 36p 10979v 4.75u        PASS 36p 56448v 7.74u
UC-12  LEGACY hum1                  LEGACY catapult1             LEGACY elephant1
UC-13  LEGACY farlint fixture       LEGACY farlint fixture       LEGACY farlint fixture
UC-14  PASS 45/44% view>=33%        PASS 24.2% min14.8 top14.8   PASS 20.9% min15.9 top21.9
UC-15  PASS immortal .152           PASS ballista .500           PASS numidian .315
UC-16  LEGACY (tier E)              LEGACY 26.1K/7.4K (E)        LEGACY 55.0K/14.2K (E)
UC-17  NA Ancient                   NA Ancient                   NA Ancient
UC-20  PASS 14 requests             PASS 14 requests             PASS 16 requests
UC-21  PASS need .66                PASS need .17                PASS need .75
UC-22  PASS +1.9% -0.013s           PASS 0.0% 0.000s             PASS +1.8% +0.017s
UC-23  PASS hum1                    LEGACY launch shared         LEGACY shoot_bow shared
UC-24  PASS 3 deaths                PIN 1 death clip             PIN 1 death clip
UC-25  NA legacy killUnit           NA legacy killUnit           NA legacy killUnit
UC-26  PASS                         PIN no hit_back              PIN no hit_back
UC-27  PASS strike_thrust           PASS launch                  PASS shoot_bow
UC-30  NA no ranged                 LEGACY r.6 kb1.5             LEGACY r.3 kb1.5 stick4s
UC-31  NA no ranged                 LEGACY catapult_launch       LEGACY bow_shoot (crew)
UC-32  NA no ranged                 LEGACY default muzzle        LEGACY default muzzle
UC-40  LEGACY 4 slots               LEGACY 4 slots               LEGACY 5 slots
UC-41  LEGACY stance passive        LEGACY misfire event         PIN fire_panic silent
UC-42  PIN voice=taunt              PIN voice=taunt              PIN voice=taunt
UC-50  LEGACY 10 (floor 10)         LEGACY 14 (floor 10)         LEGACY 13 (floor 10)
UC-51  PASS b13 l31                 PASS b9 l27                  PASS b10 l32
UC-52  NA Ancient                   NA Ancient                   NA Ancient
UC-53  PASS no moments              PASS misfire:4               PASS elephant_panic:3
UC-54  PASS H4 sweep                PASS H4 sweep                PASS H4 sweep
UC-60  PASS stance                  PIN misfire generic          PIN fire_panic generic
UC-61  PASS 3 weak 3 prey           PASS 3 weak 3 prey           PASS boss weakTo
UC-70  PASS field row               PASS escort row              PASS boss row
UC-71  PASS 50.0% field             PASS 77.4% escort            PASS 53.8% boss
UC-72  PASS 0.0%                    PASS -11.3%                  PASS +12.0%
UC-73  NA Ancient                   NA Ancient                   NA Ancient
UC-80  PASS 6 missions P            PASS 2 missions P            PASS 1 mission P
UC-81  PASS 50/180                  PASS 26/180                  PASS 44/180 boss
UC-82  PASS 108/108                 PASS 72/108                  PASS 84/108
summary: 120 cells = PASS 67, LEGACY 28, PIN 10, NA 15, FAIL 0, AMBER 0   exit 0
era rows: UC-90 PIN 3 groups/8 units  UC-91 PIN 4 factions  UC-92 PASS 7/7  UC-93 PASS 43/43 units, roles 10/7/6/6/4/4/3/2/1  UC-94 PIN 4 hum1 bosses  UC-98 PASS 43 rows  UC-99 PASS 0 entries
```
Reading it: `hoplite` is the cleanest unit (its nearest silhouette is `immortal` at 0.152, tint 45%/44% pooled with every view >= 33%, all 14 requests graded PASS, baked `strike_thrust` +1.9% on the design row, field win rate 50.0%). `catapult` is judged in **escort** mode (siege): 77.4% escort mean, inside [0.10, 0.90], its field mean 52.6% is informational; its rig `catapult1` has one death clip and no `hit_back` (PIN), and its ability `misfire` has the generic Codex text (PIN). `war_elephant` is judged in **boss** mode (53.8%), is the only bespoke boss of the Ancient five (UC-94 PIN), shoots through its crew (`shoot_bow` resolves exactly in the `a1_` archer group, the base group takes the documented quiet fallback), and `fire_panic` is silent on cast (PIN). A new-era unit prints the same rows with `PASS` where the Ancient has `LEGACY`/`PIN`.

### 3.18 Files, owners, Ancient-path touches, requests

**New files (all NEW; owner TOOLS-VERIFY unless stated).** `tools/uc/{matrix,context,print,wp_accept,tracer_check,spec_seed,manifest_fill,promote,record_ancient}.mjs`, `tools/uc/clauses/{schema,model,clips,projectile,audio,text,codex,balance,pools,roster}.mjs`, `tools/lib/{silhouette,uc_clips,uc_spec,uc_audio}.mjs`, `tests/uc/*.test.mjs` (section 4), `tests/negctl/UC-01..UC-99.mjs` (47 files), fixtures `tests/fixtures/{uc_ancient_baseline,uc_silhouettes_ancient,uc_silhouettes_<era>,uc_amber,uc_exceptions}.json` (the baseline and the Ancient hashes follow the golden re-record rule, OW-21), `docs/eras/design/ancient/units.json` (generated back-fill), `docs/eras/design/<era>/units.json` (DESIGN-ERA-x), `docs/eras/ledger/wp/*.json` (written by `wp_accept`).

**Touches of Ancient-path files (AP rows for `spec/AR` 3.2; policy bit-identical opt-in; no Ancient byte of `src/content/era_ancient/**` changes).**

| id | path | change | policy and golden |
|---|---|---|---|
| AP-U01 | `tools/contracts.mjs` | matrix, strict default, era loop (3.15) | tool only, no shipped bytes; Ancient results equal the baseline (UC-T12) |
| AP-U02 | `tools/gate.mjs` | `--strict --era=all` on the contracts step | tool only |
| AP-U03 | `tools/tintcheck.mjs` | `--era` loads the era's blueprints; Ancient output byte-identical | tool only; `tests/units/tint.test.mjs` unchanged |
| AP-U04 | `src/anim/animator.js` | additive export `Animator.trace` (R-UC1) | opt-in; G11 pose samples equal (RA-T07) |
| AP-U05 | `src/ui/unitinfo.js`, `src/editors/soldier/workshop.js` | single attack-clip source (import `meleeClip/rangedClip`), rows for new roles/abilities (R-UC5) | existing ids bit-identical; **fixing the Ancient `strike_slash` defect (PC-UC6) is an optional deliberate delta** needing G10 re-record under two signatures; default: pinned |
| AP-U06 | `src/sim/abilities/registry.js` + NEW implementations | `clips(ab)`, `route`, `passive` meta for new entries only (R-UC2) | the 27 Ancient implementations are untouched; their data is the frozen tools table |
| AP-U07 | `src/sim/vocab.js` (M0) | `ENGINE_TAGS`, tag predicates data | new file |

**Requests (filed by COORD as `docs/requests/uc_<topic>.md` when this spec is accepted; each has exact API above):** R-UC1 ANIM-CLIPS `Animator.trace`; R-UC2 SIM ability meta; R-UC3 RENDER `farLint`, look-dev JSON fields `{author, reviewer, rounds, near, far, farKeep[]}` and a `tools/lookdev.mjs --review` mode that writes the judged items with the reviewer id (RA owns, UC consumes); R-UC4 AUDIO `era` ledger column, `coverage(era)`, `manifest.sharedAudio`, `AUDIO_PROFILES` slots `hit swing shoot death voice step mat`, bark rows for the roles `vehicle` and `air`; R-UC5 UI role/ability rows and the shared attack-clip source; R-UC6 REGISTRY `registry.eraOf`, `ids('unit', era)`, `manifest.expect.uc`, SIM `ENGINE_TAGS`; R-UC7 DESIGN-ERA-x roster amendments (PC-UC2..4); R-UC8 TOOLS-GATE `contracts`/`gate`/`tintcheck`. **Amendments to final specs (logged, re-run their lints):** AM-UC1 `spec/AR` 3.8.2 gains `expect.uc` (3.13) and the `silhouettes` rule (3.4); AM-UC2 `spec/AR` OWNER-TABLE: `tools/uc/**`, `tools/lib/{silhouette,uc_*}.mjs`, `tests/uc/**`, `tests/fixtures/uc_*.json` to TOOLS-VERIFY (extends OW-22), `src/content/era_<id>/{audio_profiles,reactions}.js` to UNITS-<x> (reactions: ANIM-RIGS), `docs/eras/ledger/wp/**` to TOOLS-GATE; AM-UC3 `spec/M` 3.3 gains `ENGINE_TAGS` and the ability meta; AM-UC4 `spec/RA` 3.17 look-dev JSON fields (R-UC3).

## 4. Acceptance

Tests are plain `node:assert` files run by the gate; each registers `criterion('UC-Txx', {er, owner, tier, negctl})` and has `tests/negctl/UC-Txx.mjs` (a mutation of the code or data under test that must turn the named check red; QA draws >= 8 by its own seed). Clause-level negative controls are the last column of 3.2 (47 files `tests/negctl/UC-nn.mjs`); `tools/negcontrols.mjs` runs them all at release and a seeded 10% in T-full. Tiers: F = T-fast, E = T-era, R = release-only.

| id | ER | deliverable | script / test | inputs | thresholds | owner | tier | negative control (mutation -> red) |
|---|---|---|---|---|---|---|---|---|
| UC-T01 | ER3 | silhouette hash and metric | `tests/uc/silhouette.test.mjs` | 43 Ancient models, `uc_silhouettes_ancient.json`, synthetic clones | recomputed vs stored `SD <= 0.01`; 903-pair minimum in [0.094, 0.13], median in [0.55, 0.66]; nearest `SD >= 0.35` for 7 of 7 factions; colour-only clone `SD = 0`; hoplite helm-swap p10 in [0.06, 0.10]; 43 hashes in < 2 s | TOOLS-VERIFY | F | threshold 0.08 -> 0.30: Ancient AMBER set changes, baseline red; clone passes -> `UC-15` red |
| UC-T02 | ER5 | requestable set and grading | `tests/uc/clips_derive.test.mjs` | 43 defs, `Animator.trace` (or interim reader) | request counts hoplite 14, catapult 14, war_elephant 16; Ancient UC-20 = {`minotaur rear`}; every mounted/crewed model has >= 1 exact group per ATTACK request | TOOLS-VERIFY | F | read only group 0: 6 mounted units false-MISSING -> red |
| UC-T03 | ER5 | drift guard | `tests/uc/clips_drift.test.mjs` | `src/sim/**` | quoted literals in `setAnim(`/`beginChannel(`/`clip:` = the 25 base ids + table values, no other | TOOLS-VERIFY | F | add `setAnim(u, 'wave', 1)` to an ability -> red with file:line |
| UC-T04 | ER3 | `UNIT_SPEC` schema, seed, agreement | `tests/uc/unit_spec.test.mjs`, `tests/fixtures/uc_spec_bad/*.json` | 43 back-filled rows; example A and B of 3.12; one bad fixture per code | all 43 valid and equal to the defs; `hoplite` row equals the 3.12 text; each bad fixture yields exactly its code | TOOLS-VERIFY | F | change `tags` in `stats.js` only -> `S_MISMATCH:tags` |
| UC-T05 | ER3 | roster-level clauses | `tests/uc/roster_level.test.mjs` | Ancient; synthetic era `tests/fixtures/uc_fixture_era/` (12 units, 2 factions) | Ancient equals baseline (3 groups / 8 units, 4 factions, 7 of 7, 4 hum1 bosses); fixture era green; six mutated fixtures trip UC-90, 91, 92, 93, 94, 98 respectively | TOOLS-VERIFY | F | each mutation |
| UC-T06 | ER11 | text clauses | `tests/uc/text_limits.test.mjs` | Ancient `UNIT_TEXT`, synthetic units | Ancient: 0 limit violations, 30 + 10 floor findings pinned; `mechanicWords` derivation table; a 10-string new-era unit fails UC-50 | TOOLS-VERIFY | F | drop a death quote -> UC-50 |
| UC-T07 | ER12 | audio dry-run | `tests/uc/audio_trace.test.mjs` | router + `assets/manifest.json`, 27 abilities, 3 worked units | slots of 3.8; exactly 7 abilities silent on `ability_cast`; a profile cue missing from `CUES` -> FAIL; `voice = taunt` pinned for 43 | TOOLS-VERIFY | F | point a profile slot at a non-existent cue -> UC-40 |
| UC-T08 | ER7 | balance modes and bands | `tests/uc/balance_rows.test.mjs` | `docs/balance_data.json`, synthetic matrices | mode counts 32 / 4 / 7; ranges field [31.6, 59.2], boss [50.0, 57.7], escort [14.3, 83.3]; absent unit FAIL; hp x3 matrix breaks the field band | TOOLS-VERIFY | F | edit a matrix row |
| UC-T09 | ER10 | pool sweeps | `tests/uc/pools.test.mjs` | 43 defs, `generateArmy`, `survivalWave`, missions | 43 of 43 reachable; minima Quick 39%, Survival 4 of 180, Campaign 43 of 43; a role with no `SHARES` row fails UC-82 | TOOLS-VERIFY | F | give a unit `cost 0` |
| UC-T10 | ER3 | tint classes and exceptions | `tests/uc/tint_classes.test.mjs` | 44 blueprints, 15 builders, synthetic grey tank (team share 4%) | Ancient: min pooled 30.7%, min view 16.0%, non-hum1 min mean 0.162 / projection 0.045 / top 0.094; grey tank FAILS; ledger minima enforced | TOOLS-VERIFY | F | strip F_TEAM voxels |
| UC-T11 | ER3 | contracts CLI and strict | `tests/uc/contracts_cli.test.mjs` | spawns `contracts.mjs` on temp copies | HEAD exit 0 and `contracts OK`; fallback-model mutant exit 1 (HEAD non-strict: exit 0); unledgered AMBER exit 1; `--no-strict` under `CI=1` exit 2; `gate.mjs` contains `--strict` | TOOLS-GATE | F | delete `--strict` from `gate.mjs` |
| UC-T12 | ER3 | **the plan's acceptance script**: matrix on the Ancient 43 and exemplar rows | `tests/uc/matrix_ancient.test.mjs` | 43 Ancient units + the 3 exemplar units of the fixture era | 0 FAIL, 0 unledgered AMBER; status counts equal `uc_ancient_baseline.json`; 3.17 grid equals the output cell for cell; Node time <= 10 s | TOOLS-VERIFY | F | change one baseline entry |
| UC-T13 | ER3 | sets | `tests/uc/sets.test.mjs` | clause table of 3.2 | memberships equal 3.14 (T 32, B 38, A 25, F 47 clauses, computed from the table); `UC-B` = all minus {25, 31, 40, 41, 42, 70..73}; each clause has a negctl file | TOOLS-VERIFY | F | move a clause between sets |
| UC-T14 | ER2 | manifest block | `tests/arch/manifests.test.mjs` (AR-T25 extension) | 4 manifests | Ancient `expect.uc` exact (3.13); `building` <=, `complete` == on a fixture | TOOLS-VERIFY | F | add a 44th Ancient unit |
| UC-T15 | ER3 | WP acceptance | `tests/uc/wp_accept.test.mjs` | fixture WP: 4 synthetic hum1 + 1 synthetic tank | exit 0 when complete; exit 1 on: reviewer = builder, rounds over cap, `own_check` violation, illegal PEND | TOOLS-VERIFY | F | each |
| UC-T16 | ER3 | tracer checklist | `tests/uc/tracer_check.test.mjs` | fixture tracer | `PEND` accepted only for the later-phase tags of 3.14 | TOOLS-VERIFY | F | PEND on UC-10 -> red |
| UC-T17 | ER3 | **new-era exemplar rows** | `tests/uc/exemplars.test.mjs` | fixture era `fixture`: rifleman (hum1), tank (box rig), boss (bespoke), complete in every clause | strict + set `done`: 0 FAIL; 47 mutations (one per clause) each turn exactly their clause red | TOOLS-VERIFY | F | the 47 mutations are the test |
| UC-T18 | ER3 | Codex agreement | `tests/uc/codex_agree.test.mjs` | `unitinfo`, sim clip functions | Ancient: the 5 slash units pinned; 7 generic ability texts pinned; synthetic new role without rows FAILS UC-60 | UI / TOOLS-VERIFY | F | return `'strike_' + style` |
| UC-T19 | ER4, ER17 | Chromium parts (UC-12 preview, UC-13 pixels, UC-16, UC-17) | `contracts.mjs --tier=E` consuming RA-T03, RA-T21, RA-T25 outputs | look-dev JSON of every unit | as UC-12, 13, 16, 17 | TOOLS-VERIFY | E | strip `farKeep` from a model |
| UC-T20 | ER7 | band and claims | `contracts.mjs --tier=R` consuming ER7 data | `docs/balance/<era>.json` | UC-71 and UC-73 | BALANCE / TOOLS-VERIFY | R | hp x3 |

Runtime: all F tests are table, pure-geometry or router tests; `tests/uc/*` together <= 40 s on the reference box; the matrix itself <= 10 s per era (Ancient 3.1 s including module load, m).

## 5. Residual ledger

Every residual or review item assigned to this file or consumed by it. "Answered" = the section that decides it; a residual that only touches another spec is listed with that spec's owner.

| item (id) | text (short) | answered in | status |
|---|---|---|---|
| q3_program residual 15 | `spec/UC` must hold numbered clauses, the tracer subset, a "needs later phase" tag per clause, and an acceptance script = the ER3 matrix lint on Ancient exemplars | 3.2 (47 clauses UC-01..UC-99), 3.14 (sets T/B/A/F and the unlock-tag paragraph), 4 UC-T12 (Ancient 43 + exemplar rows), UC-T17 | answered |
| q3_program residual 18 | S-slice and calibration 2: which rig classes are measurable with which UC clauses | 3.14 last paragraph: UC is data/Node level except UC-25 and the router dry-run, so all rig classes are measurable on set B before M8/M4/M5/M6b; behaviour is the mechanic slices' | answered (S-slice cites 3.14) |
| q3_program inconsistency 9 | section 14 has no row for `UC` | the plan v3.1 row exists; owner there is DESIGN-ARCH (q3_program residual 15 says DESIGN-SIM): PC-UC1 | answered |
| q3_program inconsistency 13 | "UC/ER5" in T-era vs UC = ER3 | 3.2 criterion mapping sentence; PC-UC8 | answered |
| q3_engine residual 5 | every requestable windup/launch/fire clip registered by exactly one rig; new hum1 ids equal no existing plain id; both-order registration test | UC-23, 3.3 drift test; the order test itself is RA-T06 / AR-T19 (this file consumes them at unit scope) | answered |
| q3_engine residual 20 | `killUnit` causes in the closed vocabulary with kill verb, scream, reaction and lesson rows | UC-25 (27 causes per unit) | answered (rows themselves: M, COMEDY, AUDIO) |
| q3_engine residual 21 | silent-default tables get explicit rows and a throw path | strict mode of 3.1 (input missing = FAIL) plus UC-20, 27, 30, 31, 42, 60 at unit level; the table list is spec/M 3.9 | answered at unit level |
| q3_engine residual 22 | closed role vocabulary per era; `def.model.rig` mandatory for non-hum1 | 3.6 roles (M 3.3 verbatim), UC-02 | answered |
| q3_engine residual 33 | rifle poses register new ids only; `ClipLib.reset` not in `ensureEra` | UC-23 (R-OWN-1/5 at unit scope) | answered |
| q3_engine residual 38 | `registry.verify` checks `model.rig`, `PROJ_FX`/`PROJ_VIS`/audio row per `ranged.proj`, causes | UC-01 (V05), UC-30, UC-31, UC-25 | answered |
| q1_disposition VERIFY-Q10 | contracts check presence not content; `--strict` default in the gate | 3.2 (content clauses), 3.15 (strict default, soft channel removed), D02 | answered |
| q1_verify Q10 | matrix in gate output; silhouette hash; text uniqueness across the registry; strict; negative controls | 3.15 print, 3.4, UC-54 (+ ER11 cross-unit duplicates, spec/H), every clause has a mutation | answered (cross-unit text duplicates: ER11) |
| q1_disposition "answered only by deferring": `design/<era>` rosters, boss table, bark roles, silhouette discriminators (CONTENT-Q1, Q17, Q32, Q33) | the lints for them | UC-90..94 (3.11), UC-42 and 3.8 (bark/voice), `recipe.discriminator` + UC-04, UC-15 (cross-era comparison covers Q32's Medieval-vs-Ancient) | answered |
| CONTENT-Q1 | distinctness contract: no two units share (role, rig, weapon style, height class, tag set); <= 2 per faction share a body type; each faction has a silhouette-unique unit | UC-90, UC-91, UC-92, 3.6 definitions, 3.4 threshold 0.35 | answered |
| CONTENT-Q17 | boss table, one non-scaled-hum1 silhouette per era boss | UC-94, 3.4 bespoke rule | answered |
| CONTENT-Q35 | one tracer per rig | 3.14 `TRACER`, UC-98 (flags equal RA 3.17) | answered |
| CONTENT-Q36 | minimum strings per unit | UC-50/51, D08, PC-UC5 | answered |
| CONTENT-Q3 | death and hit variety by cause | UC-24 (static table), UC-25 (dynamic), UC-26 (hit set) | answered (tables: RA; engine: M17e) |
| CONTENT-Q13 | `reload` id collision | UC-23 (`reload_gun`), UC-21 (`mag` implies it) | answered |
| CONTENT-Q2 | far mesh at the switch distance, not the near mesh | UC-13 consumes `farLint` and RA-T03 pixels at `D`, `0.35 D`, 80 u | answered (numbers: RA) |
| SCOPE-Q3 / disposition C3 | tracer cannot meet the contract in P1 | 3.14 (sets; PEND legal only for named later tags) | answered |
| q2_schedule Q8 | tracer = U1 minus six P1-impossible clauses | `TRACER` set; the six map to UC-25, 31, 40-42, 61, 70-73, 80-82 | answered |
| q2_schedule Q3 | calibration 2 on full-contract units per rig class | 3.14 (`UC-B`), no scaling factor needed | answered |
| q2_schedule Q5 (ER3 row) | silhouette hash needs voxel projections, "not a tool" | `tools/lib/silhouette.mjs` (3.4), UC-T01 | answered |
| q2_schedule Q15 | unit rows in packs so unit WPs do not file 60-80 requests | D16 / AM-UC2 (`audio_profiles.js`, `reactions.js` written by the unit WP) | answered |
| disposition C7 | unit "done" unreachable when balance is P3; band applied to bosses, support, siege | 3.9 modes, 3.14 `WP-A` vs `DONE`, `status` ratchet | answered |
| disposition C10 | `U1` collides with `docs/verification.md` U1 | clause ids are `UC-nn` (D01) | answered |
| q1_scope (kept) | `UNIT_SPEC` rows rejected by contracts when incomplete; `--strict` no-fallback rule | 3.12 `S_UNSET`, UC-04, UC-10 | answered |
| map 03 seam 15 | fallback model is soft; gate runs contracts non-strict | UC-10, 3.15 | answered |
| map 08 seams 5, 23 and section 5 | per-unit coverage matrix; tint floor by rig | 3.2, 3.5 | answered |
| plan 0.5 "projectile row (look + sound)" | | UC-30 (look, clip, radius, kb, stick), UC-31 (sound); PC-UC7 | answered |
| plan 14 acceptance for `spec/UC` | "contracts --strict runs the matrix on the Ancient 43 and on exemplar rows" | UC-T12, UC-T17 | answered |
| task charter items | tracer subset UC-B and checklist; per-era manifest with exact counts; `--strict` default and the soft finding; `UNIT_SPEC` formats with two worked examples; unit WP acceptance; exact `contracts.mjs` changes; worked matrix for 3 Ancient units | 3.14; 3.13; 3.15; 3.12; 3.16; 3.15; 3.17 | answered |
| q3_program residual 16 (wbs WP table) | humanoid units 4 per WP, others 1 | 3.16 states the WP unit used by acceptance; the table itself is `wbs.csv` (COORD) | consumed |
| q3_engine residual 25 / 26 (RA) | truth table generated; draw protocol | not UC; UC-13 consumes the lint | n/a (RA) |

## 6. Plan corrections (the plan, a map, a roster or an older doc disagreed with the code; the stated resolution wins)

* **PC-UC1 Owner.** `q3_program.md` residual 15 names DESIGN-SIM as owner of `spec/UC`; plan section 14 and the task charter say DESIGN-ARCH. This file follows the plan row; DESIGN-SIM reviews the SIM-facing clauses (UC-01, 02, 21, 25, 32) through REVIEWER.
* **PC-UC2 The tag `air` has two meanings.** `spec/M` 3.9: `tc = AIR if tag air or role air`, so a unit tagged `air` is an air target. `design/medieval/rosters.md` puts `air` on `longbowman`, `crossbowman`, `springald`, `poacher` (can shoot air) and on `wyvern`, `cinderwyrm` (airborne): 6 of 34 rows (m). With `preferTargets air` (longbowman's row) the archers would target each other. Resolution: engine tag `air` = airborne only (predicate in 3.6, `layer === 'air'`); anti-air capability is `ranged.air` and the descriptive tag `aa`. Rosters amend (R-UC7).
* **PC-UC3 Role of air units.** `rosters.md` gives `wyvern` and `cinderwyrm` role `monster` with the air layer; `spec/M` 3.4 states for `layer`: "air/hover need `role` vehicle/air/support/hero" (`E_LAYER`) and 3.3 gives Medieval the extra role `air` for "dragon, wyvern". As written the two rows fail UC-01 with `E_LAYER`. Resolution: M is final and binding on vocabulary: role `air` for both (tag `boss` stays on `cinderwyrm`); the roster amends (R-UC7), which also changes their cost/squad/line rows to the `air` rows of M 3.9.
* **PC-UC4 Height classes.** The roster legend (S < 2.0, M 2.0-3.0, T 3.0-4.5, L 4.5-7, XL) assumes "a hum1 soldier is about 2.3 u"; measured model heights of the 28 Ancient hum1 units are 2.60-3.72 u (m, `modelBounds` x scale), so the legend's 3.0 boundary cuts the cluster. Resolution: measured classes with boundaries in the gaps of the Ancient distribution (3.6: 2.2, 3.9, 5.3, 7.2); `spec_seed` re-derives the letters.
* **PC-UC5 "11 strings".** `q2_product.md` Q12 counts 11 for name, plural, blurb, lore, 3 deaths, 2 taunts, codexJoke; that is 10. Resolution: 10 base + 1 mechanic string = 11. Measured Ancient (m): minimum 10, 30 of 43 units at 10, no hero or boss above 14: the 11/15 floors are new-era only (UC-D03).
* **PC-UC6 Shipped Ancient defect found by UC-27.** `src/ui/unitinfo.js:118-127 attackClip` returns `'strike_' + style`, i.e. the non-existent id `strike_slash` for `strategos legionary centurion khopesh_warrior xerxes`; `clipOptions` hands it to the Codex turntable and the Animator answers `missing clip 'strike_slash' for rig hum1 (using idle)` (m: probe with `collectWarnings`). The sim uses `strike_slash_1/_2`. Pinned, not fixed (Ancient does not change); fixing it is an optional AP-U05 delta needing a G10 re-record. New eras import the sim function (R-UC5).
* **PC-UC7 Projectile row.** Plan 0.5 lists "projectile row (look + sound)" as one item; the sound half is AU4 (P2). Two clauses: UC-30 (T) and UC-31 (F).
* **PC-UC8 Criterion mapping.** The plan (section 9) puts the unit matrix in ER3 and the clip clauses in ER5; plan section 3 writes "UC/ER5" for T-era. Mapping per clause is in 3.2; T-era runs tier-E clauses plus the ER5 clip clauses (which are tier F and already in T-fast).
* **PC-UC9 Tracer vs `UC-B`.** q2_schedule Q8 defines the tracer as "UC minus six clauses"; plan section 12 defines `UC-B` as "UC minus reactions per cause, audio profile and balance". They are different sets with different dates (P1 and calibration 2); both are kept (3.14).
* **PC-UC10 Escorted roles.** The plan wants support and siege "judged in their own modes"; `tools/balance.mjs` only has the escort section for U5b and no escort band. A band at 30% swap share would be bimodal on the shipped Ancient (3.9), so the escort band is wide and the tight judgement is the designed-direction pairs (UC-73).
* **PC-UC11 Verified, no correction.** AR 3.8.4's statement that `contracts.mjs --strict` already prints `contracts OK (43 units, 16 arena presets, 0 soft finding(s))` on HEAD holds (run during this review, exit 0, 1.1 s).

## 7. Open items

| id | item | owner | deadline phase |
|---|---|---|---|
| OI-UC1 | `design/medieval/rosters.md` amendments of PC-UC2, PC-UC3, PC-UC4 (tag `aa`, role `air`, regenerated height letters) before `spec_seed.mjs` writes `units.json` | DESIGN-ERA-MED | P0 exit |
| OI-UC2 | `spec/AU` adopts the slots and the `era` ledger column of R-UC4 (UC-40..42 are written against them) | AUDIO | when `spec/AU` leaves "draft until M2 freeze" (end of P1) |
| OI-UC3 | `src/sim/vocab.js ENGINE_TAGS` and the ability meta (`clips`, `route`, `passive`) land with M0 and M13 | SIM | P1 (M0, #1) and M13 (#11) |
| OI-UC4 | `Animator.trace` (R-UC1) replaces the interim cache reader of `uc_clips.mjs` | ANIM-CLIPS | P1 |
