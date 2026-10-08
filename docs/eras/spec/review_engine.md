# spec/review_engine: hostile review of the ENGINE spec set (AR, M, M-layers, RA, W, UC, landing_order) against each other, the plan, the designs and the code

Reviewer lens: ENGINE SPECS (task of 2026-10-08). Tree state: HEAD `7aa767c` (+ uncommitted WIP of other reviewers is ignored). Method: section reading plus node scripts (scratchpad only) that parse `design/<era>/context.json`, `rosters.md`, `missions.json`, the `AP-TABLE` and `OWNER-TABLE` of AR, the `modules`/`budget` blocks of M, and the vocabularies of M/M-layers/UC/W/RA; claims about the code were checked against `src/` (27 `TOP_KEYS`, 27 ability ids, 21 `hash.query` sites, `N_SE = 20`, 16 materials with lava at index 7, line numbers `ai.js:142`, `combat.js:38,46`, `consts.js:17`, `armygen.js:15` all hold, so the specs are accurate about the code; the defects below are between documents). Items already listed as an explicit Open item with a correct owner and phase are not repeated (M OI-2 on `aimOk`/`markNavDirty` bits = M-layers PC-L3/PC-L4 + OI-L1/OI-L2; W OI-W3 AM-W1..AM-W4 incl. `era_ancient/materials.js`; RA OI-RA2 theme id set; OI-LO3, OI-LO7, OI-LO8; H OI-H4 event routes; AU OI-AU2/OI-AU5).

Totals: 4 BLOCKER, 24 MAJOR, 9 MINOR (37 findings). Every fix names the file, the section and the replacement text; where a decision is needed the recommended decision and its reason are given.

Short key: M = `spec/M.md`, ML = `spec/M-layers.md`, LO = `spec/landing_order.md`, "rosters" = `design/<era>/rosters.md` (+ `context.json`, generated from them).

---

## BLOCKER

### F1. BLOCKER: the rosters cannot pass `validateDef`/UC-01 because their role, layer and tag model is not the engine's

**Documents.**
* M 3.3 (M.md:106): "Modern = `melee ranged hero siege support beast vehicle air`; Sci-Fi = `melee ranged hero siege support monster beast swarm vehicle air`; Medieval = nine + `air` (dragon, wyvern; roster amendment needed for anything else)"; M 3.4 `layer` row (M.md:122): "air/hover need `role` vehicle/air/support/hero; `E_LAYER`"; M.md:283 `tc = AIR if tag air or role air; MECH if role vehicle and tag mech; VEH if role vehicle`; UC.md:200-212: roles are `ERA_ROLES`, tag `air` "means `layer === 'air'` ... **does not mean can shoot air**", `mech` = "role vehicle", `support`/`siege` = "equal to the role", `cavalry` = "model base or sub rig is quad1 or chariot1"; UC.md:337: `roles` of a new era "sum to `expect.units` with every key in `ERA_ROLES[era]` and none outside".
* versus `design/modern/rosters.md:5`: "vehicles are the role plus the tag `vehicle` (map 02 seam 16), air is `ranged`/`swarm`/`support` plus the tag `air`"; `scifi/rosters.md:5` (same); `medieval/rosters.md:5` lists only the nine Ancient roles; OI-4 of M (M.md:747) says ERA_ROLES "may be amended by rosters v1 (P0)": rosters v1 are final and nobody amended anything.

**Evidence.** `node` over `design/*/context.json` against the M role lists (script `scratchpad/roles.mjs`):
* Modern: 12 of 34 units have a role outside `ERA_ROLES[modern]`: `cavalry` x6 (biscuit_tank, dozer_plough, lunchbox_apc, ride_on_mower, toast_rack_runabout, trolley_rammer), `monster` x4 (broadcast_behemoth, grand_mower, grand_teapot, teapot_heavy), `swarm` x2 (flowerpot_peashooter, hobby_drone). Two more fail `E_LAYER` (layer air with role `ranged`): fishbowl_chopper, chandelier_gunship. Role `vehicle` and role `air` occur 0 times.
* Sci-Fi: 5 units are role `cavalry` (dustpan_hover, junk_buggy, mandible_runner, refund_crawler, shush_bike), not in `ERA_ROLES[scifi]`; `E_LAYER` fails for valet_drone (ranged, hover), glidewing (ranged, air), void_manta (monster, air); grand_concierge and rustbucket_rex are role `monster` + tag `mech` (UC: mech = role vehicle).
* Medieval: cinderwyrm and wyvern are role `monster` with air layer (M: role `air`, `E_LAYER`).
* Medieval longbowman, crossbowman, poacher, springald carry the tag `air` meaning "hits air" (rosters line "archer, air, organic"). With M.md:283 these archers become AIR target class units: enemy AA preferences and `canTarget` treat them as flyers.
Total: about 30 of 102 rosters rows fail the first validator the program runs (UC-01 -> `validateDef`), before any mechanic exists.

**Fix (decision: keep the engine model; it carries behaviour: squad size, line, target class VEH/MECH/AIR, cost efficiency, bark role).** Edit the roster rows (and regenerate `context.json` with `tools/ms_context.mjs`):
* Modern: role -> `vehicle` for biscuit_tank, dozer_plough, lunchbox_apc, ride_on_mower, toast_rack_runabout, trolley_rammer, broadcast_behemoth, grand_mower, grand_teapot, teapot_heavy; role -> `air` for chandelier_gunship, fishbowl_chopper, hobby_drone, spotter_balloon; flowerpot_peashooter stays `swarm`, therefore M.md:106 becomes "Modern = `melee ranged hero siege support swarm beast vehicle air`".
* Sci-Fi: role `vehicle` for dustpan_hover, shush_bike, junk_buggy, refund_crawler, valet_drone (hover layer, tag `hover`), grand_concierge, rustbucket_rex (tag `mech`); role `air` for glidewing, void_manta; mandible_runner -> `beast` and drop the tag `cavalry`.
* Medieval: cinderwyrm, wyvern -> role `air`; remove the tag `air` from longbowman, crossbowman, poacher, springald (their capability is `ranged.air`, not a tag).
* `rosters.md` legend line 5 of all three: replace the sentence about vehicles/air with "Role is one of `ERA_ROLES[era]` of spec/M 3.3; vehicles are role `vehicle`, aircraft role `air`".
**Owner doc.** DESIGN-ERA-MED/MOD/SF (rosters, context), DESIGN-SIM (M.md:106 Modern list; close M OI-4).

### F2. BLOCKER: AR's `KIND_TABLE` has absorbed none of the amendments the other specs depend on; the first `data.js` carrying them throws `BAD_KEY`

**Documents.** AR.md:74/84: "`KIND_TABLE` maps every allowed `data.js` key ...; an unknown key throws `RegistryError('BAD_KEY')`"; the row lists `AUDIO_PROFILES PROJ_AUDIO EXPLOSION_AUDIO ABILITY_CUES`, `PROJ_FX FX_CLASS REACTIONS`, `THEMES UNLOCKS GOD_POWERS SETPIECES` and nothing else; AR open items (AR.md:1042+) contain no kind amendment. Against: AU.md:64 ("`src/content/era_<id>/data.js` | `AUDIO_PROFILES`, `PROJ_AUDIO`, `PROJ_ALIAS`, `EXPLOSION_AUDIO`, `ABILITY_CUES`, `CC_BY_SPECIES`, `ERA_STEP`, `ERA_HEAVY`, `UI_BY_ERA`, `GOD_CUES`, `SETPIECE`, `BOSS_STINGER`, `EVENT_DIRECT`, `PROP_BREAK` (AR OW-07)"), where AR OW-07 (AR.md:855) names only four; CU.md:130-137 (AM-AR-CU1: `UI SCOUT_TEXT REWARD QUICK_PRESET MILESTONES`); RA.md:1039 (RA-PC4: `REACTIONS` keyed by `def.react`, new idmap kind `fx_recipe` keyed `<era>:<class>`; RA.md:607 "rows from `era_<id>/fxdata.js`"); S-slice.md:171 (AM-AR-SL1: kind `slice_mission`, file `era_<id>/slice.js`); VB.md:884 (`era_<id>/{palettes,emblems}.js`, "AR (kind)"); W.md:305 (theme row fields).

**Evidence.** Script `scratchpad/kt.mjs`: all-caps keys named next to `data.js` in RA/AU/VB that are not in the AR row: `PROJ_VIS`(RA), `FX_RECIPE`(RA), 10 AU keys (`PROJ_ALIAS CC_BY_SPECIES ERA_STEP ERA_HEAVY UI_BY_ERA GOD_CUES SETPIECE BOSS_STINGER EVENT_DIRECT PROP_BREAK`), `REAL_WORLD`(VB, a text-sweep input, not a kind). `SETPIECE` (AU) vs `SETPIECES` (AR/CU) is a near-collision of two different tables. Layering rule (AR 3.1.4 edge table): `era_<id>/data.js` may import only same-directory L0 files; `fxdata.js`, `reactions.js`, `materials.js`, `palettes.js`, `emblems.js`, `ui.js`, `slice.js` are not in the AR 3.1.1 file list and not in `registry.eras.js` generation.

**Fix.** AR 3.1.1 file list: add `era_<id>/{fxdata,reactions,materials,themes,arenas,palettes,emblems,ui,slice}.js` (L0, re-exported by `data.js`, globbed by `gen-registry.mjs`). AR 3.1.2 `KIND_TABLE` row: append
`PROJ_ALIAS`->proj_alias (idmap token -> kind); `CC_BY_SPECIES`->cc_species (idmap); `ERA_STEP ERA_HEAVY UI_BY_ERA EVENT_DIRECT`->byEra singletons; `GOD_CUES`->god_cue (idmap by power id); `SETPIECE`->setpiece_audio (idmap by set-piece id; rename in AU to `SETPIECE_AUDIO` to stop the collision with `SETPIECES`); `BOSS_STINGER`->boss_stinger (idmap by boss id); `PROP_BREAK`->prop_break (idmap by prop id); `UI`->ui, `SCOUT_TEXT`->scout_text (byEra); `REWARD QUICK_PRESET MILESTONES`->reward quick_preset milestone (idmap); `FX_RECIPE`->fx_recipe (idmap `<era>:<class>`); `REACTIONS` key = `def.react`; `SLICE_MISSIONS`->slice_mission (idmap, only when `__VW_SLICE__`). Add to AR 3 section 7 an open item OI-4 "AR absorbs AM-AR-CU1/CU2/SL1, RA-PC4, AU 3.1 key list" owner DESIGN-ARCH deadline P0 exit, and AT-AR-03 negative control "a data.js with an unlisted key -> BAD_KEY".
**Owner doc.** AR (DESIGN-ARCH), with AU/CU/RA/S-slice confirming the merge kinds.

### F3. BLOCKER: the OWNER-TABLE has no row for files the specs require, one row can never match, and JSON specs are owned by COORD

**Documents.** AR.md:844: "a path with no row fails `own_check --any`"; AR-T26 (AR.md:957) "every tracked non-doc file has exactly one owner row". Rows OW-01..OW-38 (AR.md:849-884).

**Evidence.** Script `scratchpad/ow.mjs` (same glob dialect and specificity rule as AR 3.2.1) over the 582 `src|tools|tests` paths named in the specs:
* NO owner row: `tests/uc/**` (17 named files, UC), `tests/slice/**` (15, S-slice), `tests/world/**` (11, W WC01..WC24), `tests/render/**` (9, RA), `tests/voxel/**` (2, RA far-mesh), `tests/verify/**`, `tests/gate/**`, `tests/lib/**` (exist in the tree today), `src/content/stat_helpers.js` (AR's own file), and `src/content/era_<id>/{fxdata,reactions,materials,palettes,emblems,slice,ui}.js` for all four eras.
* OW-18 lists `design/<era>/missions.json`; the real path is `docs/eras/design/<era>/missions.json`, which falls to OW-23 ("the DESIGN-x of that file"): `ownerof(docs/eras/design/medieval/missions.json) = OW-23`, so the CAMPAIGN role that LO 3.11 E2 and MS tell to rewrite `requiresModules` fails `own_check --role`.
* `docs/eras/spec/*.json` (`ms.schema.json`, `au_matrix.json`, `h_callbacks.json`, `vb_data.json`, `real_world_seed.json`) match only OW-36 (COORD, "frozen"); OW-23 lists `docs/eras/spec/<X>.md` only.
* `src/content/era_ancient/{data,pack}.js`: OW-11 and OW-36 tie on specificity ("AMBIGUOUS" in the script), which AR-T10 defines as a failure.

**Fix.** AR.md OWNER-TABLE: add rows
`| OW-39 | tests/uc/**, tests/slice/** | DESIGN-ARCH roles UC (tests/uc) / DESIGN-UX (tests/slice) via TOOLS-VERIFY | with its subject | | n/a |`
`| OW-40 | tests/world/**, tests/props/** (already OW-29) | WORLD | with its subject | | n/a |`
`| OW-41 | tests/render/**, tests/voxel/** | RENDER | with its subject | | n/a |`
`| OW-42 | tests/verify/**, tests/gate/**, tests/lib/** | TOOLS-VERIFY (verify), TOOLS-GATE (gate, lib) | with its subject | | n/a |`
`| OW-43 | src/content/stat_helpers.js | REGISTRY | P1 | | 3 |`
and extend OW-15..OW-19: `src/content/era_<id>/{fxdata,reactions}.js` -> ANIM-RIGS/RENDER (rows) with REGISTRY wiring; `{materials,themes,arenas}.js` -> WORLD; `{palettes,emblems}.js` -> UNITS-<x>; `ui.js` -> UI; `slice.js` -> GENERATED (TOOLS-VERIFY). Replace in OW-18 `design/<era>/missions.json` by `docs/eras/design/<era>/missions.json` and in OW-23 add `docs/eras/spec/*.json` -> "the DESIGN-x of that spec". Make OW-11 `src/content/era_*/{manifest,data,pack}.js` explicitly `src/content/era_{medieval,modern,scifi}/...` and `era_ancient/{manifest,data,pack}.js` REGISTRY (so OW-36 never ties).
**Owner doc.** AR 3.10.4 (DESIGN-ARCH); TOOLS-GATE implements.

### F4. BLOCKER: W and RA both define the field `look` of the registry `theme` row, with incompatible schemas, and both are P1 work

**Documents.** W.md:305 (3.5.3): "Row: `{id, era, label, aliases[], biome, look: {sky, gravity, weather, time, fog}, music, amb}`; `look` is the Builder preset (W-D29) and RENDER's `THEME_LOOK` key", with `SKY_IDS` = `earth space violet green neon ember pale` (strings) and `fog` a number (0.20). RA.md:35 (RA-D17) and RA.md:705-715: "`THEME_LOOK` is a field of the theme row (registry kind `theme`)": `look = { sky:{zenith,horizon,ground,night,nightMin,starsMin,stars,atmos,band,bodies}, sun:{...}, hemi, fog:{col,nearMul,farMul,add}, grade:{...}, clouds, cloudTint, liquid, preset:{time,weather,fog,wind,gravity} }`.

**Evidence.** Same registry row, same name, `look.sky` is a string in W and an object in RA, `look.fog` a number in W and an object in RA; the Builder preset values (time/weather/gravity) are in `look` in W and in `look.preset` in RA. The id sets also differ (W 18 ids incl. `med_crag sf_moon sf_station sf_neon sf_ember`; RA 21 incl. `med_ford med_abbey med_mountain sf_neon_night sf_lunar sf_lava sf_wreck sf_redplanet`): that part is RA OI-RA2; the schema collision is not listed anywhere. WP-W03 (W, P1) and R7 (RA, P1) would write the same field.

**Fix (decision: RA's `look` is the render look, W's is the Builder preset; give them different keys).** W.md 3.5.3 row becomes `{id, era, label, aliases[], biome, preset: {sky, gravity, weather, time, fog}, music, amb}`; every mention of "`look` is the Builder preset" in W (W-D29, 3.10) becomes `preset`; RA keeps `look` and drops its inner `preset:{time,weather,fog,wind,gravity}` in favour of a reference "the Builder preset is `theme.preset` (spec/W 3.5.3)", with `sky` ids of W (`SKY_IDS`) mapped to RA's sky objects by id (`look.sky` object keyed by the same ids; `earth` = literals). AR 3.3.1 `THEMES` row schema: `{id, era, label, aliases, biome, preset, look, music, amb}`. Test: `RA-T13` already compares ids; add "`THEMES[*].preset.sky` in `SKY_IDS` and `look.sky` defined for each".
**Owner doc.** W (DESIGN-WORLD) and RA (DESIGN-RENDER); AR 3.3.1 row.

---

## MAJOR

### F5. MAJOR: the 26-landing order is "final" but every consumer still states the 19-module facts, and its decision is scheduled after the artefacts that depend on it

**Documents.** LO OI-LO1 (landing_order.md:501): "decide LO-D1..D12 ... this gates 3.11 B2 and the rewrite E2 ... | COORD | before the end of P1". M.md:68-76 still has the 19-row `modules` block, E-FREEZE = prefixes #13/#16/#19, X1 "the block has the 19 ids"; MS.md:409 "(Medieval 13, Modern 16, Sci-Fi 19)"; every `context.json` has `"eFreeze":{"medieval":13,"modern":16,"scifi":19}` and `modules[]` of 19; `requiresModules` tokens in the three `missions.json` are 19-model names (`M13`, `M6b`, `M15`, `M17e`); S-slice.md:234; VF.md:249 RED-AGE "6 module landings", M.md:655 "X6 x 9"; ML.md headings "M8 (S39, #14)", "M9 (S40, #15)"; plan_lint PL10 prints `PASS ... Medieval #1..#13, Modern #1..#16, Sci-Fi #1..#19 equal the prefixes of spec/M`.

**Evidence.** `node tools/landing_order.mjs --check` is green only against its own internal 26-node constants (it reports P1 = 14 sessions, freezes #14/#20/#26); `node tools/plan_lint.mjs` is green on PL10 against the 19-model and has no row for `landing_order` (PL08 FAIL: "docs/eras/spec/landing_order.md has no row in plan section 14"). So today two incompatible "truths" are both lint-green. P1 builds `tests/sim/dag.test.mjs` (X1), `tools/perf_budget.mjs` (X2) and `ms_context` against M.md; OI-LO1 is decided after those exist, and the plumbing slice (#6 = M15c) is a landing that does not exist in the M.md block.

**Fix.** (1) LO 7 OI-LO1 row: deadline "P0 exit (before the first engine edit and before X1/X2 are written)"; OI-LO4, OI-LO5, OI-LO6 deadline "same commit as OI-LO1". (2) LO 3.11 gets a new first line "**Application order (one atomic commit by COORD):** B2/B4/B6 (M.md blocks) -> E2 (three `missions.json`) -> `ms_context` regenerates the three `context.json` (`eFreeze` {medieval:14, modern:20, scifi:26}) -> A1..A7 (plan) -> F2 (`plan_lint` PL01/PL10/PL15 rewritten) -> D (S-slice 234, 239) -> C (M-layers headings #14/#15 -> M8 #17 / M9 #15). The tree is not accepted between these steps." (3) plan section 14: add the `spec/landing_order` row (A6) now, so PL08 passes. (4) STATUS.md "Reds / open items": "OI-LO1 decision pending".
**Owner doc.** landing_order (DESIGN-SIM/COORD), M, M-layers, MS, S-slice, plan.

### F6. MAJOR: landing M13a is defined by parameters that no engine spec specifies; LO B5 says "keep" where there is nothing to keep

**Documents.** LO 3.2 row 8 / LO-D6: M13a = "`ABILITY_SCHEMA`, banner/pinfield/recharge `aura`, bailout + spawn accounting, gas/smoke/trail, `call_strike`, `cc_field` stun/taunt, `dash` lunge/lance/bull_charge, `stance` pavise"; LO 3.10 blessings F1, F5, F6, F10, F11, MED-1..MED-6, MED-9, MOD-4..MOD-7, MOD-10, F8 (armorFace on non-vehicle defs); LO B5 (landing_order.md:375): "M13 block becomes M13a (... keep `ABILITY_SCHEMA`, bailout, banner, gas/smoke, `call_strike`, stun/taunt, lunge/lance/bull_charge, pavise ...)". M.md:390 (the M13 block) defines only `aura{effect:'banner',...}`, `dash{kind:'blink'}`, `dot_cloud{effect:'gas'|'smoke'}`, `summon_on_death{mode:'bailout', spawn REQUIRED (single def)}`, `call_strike{kind,r,dmg,delay,range,cd,charges,minTargets}`; M.md:125 restricts `armorFace` to "role vehicle/air/hero".

**Evidence.** `grep -c` over M.md, ML.md, MS.md, UC.md for `pavise lunge bull_charge pinfield recharge trail`: 0 in all four (only `taunt` 5x in UC as a tag). So `ABILITY_SCHEMA` (cap 30 <= 32) and `E_ABILITY_PARAM` cannot be written for 10 of the 13 listed params, and the Sci-Fi/Medieval/Modern units that use them (bubble_tender, chief_spokesperson, wrench_runner, greeter_unit, ser_valiant, great_hog, pavise_bearer, plague_cart, grand_housekeeper, castellan, rolling_keep, rustbucket_rex, grand_concierge, hive_queen) have no schema to validate against.

**Fix.** M.md 3.10 M13 block: replace the "Params:" list by this table (values are the roster numbers; SIM may refine ranges at the M13a landing) and make LO B5 say "add" instead of "keep":
`aura.effect` in {`banner` (radius, dmg 1.1, moraleRate, lossMul, fall:{r, shock}), `pinfield` (radius 12, enemyPinGain +0.08/s, allyMorale), `recharge` (radius 8, delayMul 0.2, regenMul 3, no hp heal), `rally`}; `cc_field.effect` adds `stun` {r, dur} and `taunt` {r 4, dur 1.0}; `dash.kind` in {`blink`,`lunge` {dist 6, speedMul 1.5, cd 7},`lance` {dist 14},`bull_charge` {dist 12, dmg 34, stun 1.0}}; `stance.kind` `pavise` {block .90}; `dot_cloud` adds `trail:bool` and gas params {slow .30, poison dps 3, r 4, dur 4}; `summon_on_death.spawn` may be `[ {def, n} ]`; `call_strike` adds `kind:'oil'` and unit channel {channel 1.2, ring 2.0, cancelOnCasterDeath, range 40, telegraph 2.2}; `armorFace` and `eshield` are allowed on any `_nf` def (relax the "role vehicle/air/hero" restriction of M.md:125 to "any role, but `top` only for air/vehicle"). Also add `spawn_hazards` to the M15 effect-interpreter list (M.md:394, "new `strike`, `emp_pulse`, `smoke_zone`, `shield_zone`, `airdrop`") because LO row 20 assigns it to M15g.mod.
**Owner doc.** M (DESIGN-SIM); LO B5 text.

### F7. MAJOR: events and counters that three specs require have no accepting section in M, M-layers or MS

**Documents.** M.md 3.12 event table (M.md:458-480) vs: LO 3.10 MS-H5b/MS-H6 and landing_order.md:89 (3.2 row 8) "events `banner_fall`, `unit_bailout`" for M13a, `prop_ignited` for M12 (row 10) (M.md lacks `banner_fall`, `prop_ignited`); MS.md:572-573 (H5: `banner_fall {id def team x z allies}`, `unit_hit += ap armor face`; H6: `prop_ignited {id type x z}`); AU.md:1720-1760 (`air_landed` "MS A5 (NEW event requested)", `beam_lock_telegraph`, `ground_shake`); MS.md:671 (A5: `air_landed` is "a counter/event as listed in 3.6.4 and 3.7.4" but neither table contains it; MS uses `unit_air_state where state 6` instead, MS.md:243); CU.md:472/1606 (R-CU-S2 `mech_step`), H.md:764 (`ground_shake`), RA.md:916/927 ("ground-shake event"), LO F16 (`ground_shake`), AU.md:1762 (rejects any new event; derives from step cadence); LO F15 (landing_order.md:304) "hitscan lock-line telegraph event for the rail | M2"; CU.md:1187/1605 (R-CU-S1: `unit_hit.cover`, `.dstReloading`, `.projKind`); MS H4 world counters `cover_unit_ticks unit_ticks` blessed to M9 (LO MS-H4) with 0 mentions in M.md and ML.md.

**Evidence.** `grep -l` of each name: `air_landed` AU, MS only; `beam_lock_telegraph` AU only; `mech_step` CU, H (as `ground_shake`); `cover_unit_ticks` MS, LO only. One footfall event has three names (`mech_step` CU, `ground_shake` H/RA/LO, none AU) and two owners (SIM, ANIM/RENDER).

**Fix (recommended decision: add only the two events a counter needs; derive the rest).** M.md 3.12 table add rows
`| banner_fall | id def team x z allies | M13a |`, `| prop_ignited | id type x z | M12 |`, `| unit_hit (+fields) | ... ap armor face cover dstReloading projKind | M1 (ap armor face), M9 (cover), M2 (dstReloading projKind) |`, and `telegraph` gains `kind:'lock'` (`x0 z0 x1 z1 t`) for the rail lock-line instead of a new `beam_lock_telegraph` (M2). Do NOT add `air_landed` and `mech_step`/`ground_shake`: AU.md:1760 and MS A5 derive `air_landed` from `unit_air_state` with `state 6, prev 5` (ML 3.6.4 GROUNDED); the walker footfall is a RENDER/AUDIO gait event (RA SP-4 measures steps/s). Edit CU.md:472 and R-CU-S2 (trigger `{sight:{tag:'mech'}}` becomes the primary), H.md:764 (route "derived by INTEGRATION from the walker1 gait"), RA.md:916 ("ground-shake" -> "footfall cue from the gait phase"), LO F16 wording, AU.md:1760. ML 3.10/3.12: add the M9 counters `cover_unit_ticks`, `unit_ticks` (per-tick sums over player units) to the M9 block.
**Owner doc.** M, M-layers (DESIGN-SIM); MS, CU, H, AU, RA, LO wording.

### F8. MAJOR: the explosion kind `crash` is emitted by the sim and has no row in any of the three tables that require one

**Documents.** ML.md:252 (3.4.3) and ML.md:480/490: "event `explosion kind:'crash'`" for air-unit wrecks; M.md:111: closed `EXPLOSION_KINDS` = "`crew boulder fire magic lightning meteor` + `shell rocket orbital prop mine emp grenade smoke`; each needs `EXPLOSION_AUDIO`/render rows"; RA.md:590-602 `EXPLOSION_FX` rows (crew boulder fire magic lightning shell rocket grenade mine orbital emp smoke prop); AU.md:1443-1462 `EXPLOSION_AUDIO` (Medieval fire, boulder; Modern shell rocket prop mine grenade orbital smoke emp; Sci-Fi the same) and AU.md:2276 "AUDIO consumes ... `explosion crash` | Adopted".

**Evidence.** `crash` appears as an explosion kind only in ML; AU "adopts" it but its table has no row; RA has no recipe. The M rule "each needs rows" is therefore not satisfied by the spec set, and AU-T02/UC-31 ("`EXPLOSION_AUDIO[kind]` for every kind", over M's list) will pass vacuously while a crashing gunship is silent and renders with the default formula. `meteor` (in M's list) is also missing from RA's recipe table.
**Fix.** M.md:111 append `crash` (and keep `meteor`); RA.md:592 table add `| crash | 0.6 x legacy | 1.0 x (+ trail smoke) | 0.8 x | 1.0 x | 3 cubes | min(1, r/3) | ground ring of 12 dust cubes |` and `| meteor | legacy | legacy | legacy | legacy | 0 | min(1, r/5) | none |`; AU.md 3.11.4 add `| Medieval | crash | med_dust_whump | med_dust_whump | med_dust_whump |`, `| Modern | crash | mod_blast#s | mod_blast#m | mod_blast#m |`, `| Sci-Fi | crash | sf_blast#s | sf_blast#m | sf_blast#m |`.
**Owner doc.** M, RA, AU.

### F9. MAJOR: `w.maxRadius` over "defs" contradicts AR-D15 and can change Ancient battles in a multi-era build

**Documents.** AR.md:33 (AR-D15): "the real game's `World` receives `registry.defsFor('all')` over released eras ... `World` never enumerates defs (only `armygen.js` does), so merged defs in `World` are safe once pools are era-scoped"; ML.md:36 (D-L18): "`w.maxRadius` = max `radius*scale*max(1, mut.scale)` over defs that carry `_nf` (0 in Ancient worlds); every query margin becomes `max(legacy, w.maxRadius)`"; ML.md:527 AP-L6 "margin `w.mR = 1.8` (`maxRadius` 0); ... G1".

**Evidence.** In the shipped game, an Ancient battle is built with `defs = registry.defsFor('all')`. If `maxRadius` is computed over the table, a build with Modern released has `maxRadius > 0` (tank radius 2.0), so `mR`, `mR12`, `mProj` change and `_separate`/`pickTarget` margins change for pure Ancient battles: daily/survival/campaign results differ between a build with and without Modern released, while G1 (Node harness, Ancient-only defs) stays green and R-PARITY only checks screens.
**Fix.** ML.md D-L18: "`w.maxRadius` is computed in `addUnit` over the units actually placed (and spawned), never over the def table; it is monotone, 0 until the first `_nf` def is added". Add test to AR-T? and M X1: "stateHashFull of a 3000-tick Ancient battle is identical with `defs = defsFor('ancient')` and `defs = defsFor('all')`" (`tests/arch/multi_era_world.test.mjs`, REGISTRY, T-fast).
**Owner doc.** M-layers (D-L18, 3.3.8), AR (3.7.3 test list).

### F10. MAJOR: the sim routes only `role vehicle`/tag `wide` units through the clearance fields, while W guarantees corridors for every unit above radius 0.9

**Documents.** ML.md:21 (D-L3): "`CLEAR` = role `vehicle` or tag `wide` with `radius*scale > 0.9` and layer ground ... everything else `GROUND`"; W.md:354 table row `clear` "used by: vehicles with radius > 0.9, bosses" and W.md:362 R-V1: "every route between the zones has >= 6 free nav cells wherever the era's roster has a unit of radius > 0.9".
**Evidence.** `wide` is in no vocabulary (UC ENGINE_TAGS 24 tags, UC.md:202) and in no roster tag list; the only `wide` in the rosters is the hum1 body variant "hum1 (wide)". Non-vehicle large ground units (Medieval great_hog quad1 boar x2.2, bridge_troll, rolling_keep; Sci-Fi elder_hummock, bloom_stomper, hive_queen; any Modern/Sci-Fi mech authored as `monster`) therefore use `mc 0` and the 1 u fine field, exactly the squeeze that D-L3 accepts for Ancient elephants, but W's recipe test only proves vehicle corridors, so the case is untested and unspecified.
**Fix.** ML.md D-L3: "`CLEAR` = layer ground and `radius*scale > 0.9` and (role `vehicle` or tag `wide`); the validator adds `E_WIDE`: a ground def of a new era with `radius*scale > 0.9` and neither role `vehicle` nor tag `wide` is rejected (Ancient defs are exempt: `_nf` absent)". UC.md:202 `ENGINE_TAGS` add `wide`; rosters: add `wide` to the units above once radii are fixed in `stats.js` (UC-04). W R-V1 text: "wherever the roster has a unit of class CLEAR/CLEARB".
**Owner doc.** M-layers (D-L3, validator codes), UC (ENGINE_TAGS), W (R-V1).

### F11. MAJOR: W and RA specify opposite semantics and mechanisms for material `emissive`

**Documents.** W.md:48 (W-D15) and 3.4.4 (W.md:288): "`emissive` (>= 1) multiplies the terrain vertex colour; values above 1.25 lift the mesher clamp"; rows use `emissive 1.15 .. 1.6` (W.md:265-272); RA.md:763: "`MATERIALS[i].emissive` (0..4, absent = 0) ... chunks containing an emissive cell use the second terrain material `terrain-emit` ... `outgoingLight += diffuseColor.rgb * vEmit`; vertex colours keep their `Math.min(1, ...)` clamp; bloom picks up emissive >= 0.6".

**Evidence.** Under RA's reading W's `sf_crystal` (emissive 1.25) and `sf_spore_soil` (1.15) are additive emission of 125 % and 115 % of the albedo (blown out); under W's reading RA's 0.6 threshold never triggers (values are >= 1). RA's second material also changes the terrain draw count (one more draw per emissive chunk group), which RA's own draw model (`T <= 32/45`, RA.md:785) does not include.
**Fix (decision: W's multiplier; one terrain material, no extra draws, Ancient bytes identical by construction).** RA.md:763 replace by: "**Emissive terrain.** `MATERIALS[i].emissive` is W's brightness multiplier (>= 1, absent = 1, lava 1.25); `terrainMesh.js` applies W 3.4.4 (`cap = em > 1.25 ? em : 1`, vertex colours may exceed 1); there is no `terrain-emit` material and no `emit` array; bloom (threshold 1.0) picks up cells with `em > 1.2`." RA-T13 "2-material emissive arena" test keeps W's numbers. Remove `terrain-emit` from RA AP-R05 text.
**Owner doc.** RA (3.10), W (no change).

### F12. MAJOR: RA selects the liquid through `env.liquid` "(W4 whitelist)" but W's `sanitizeEnv` has no such key

**Documents.** RA.md:752: "selection: legacy `arena.lava` => `lava`, else `env.liquid` (W4 whitelist) ?? `look.liquid` ?? `water`", liquids `water lava acid coolant plasma oil`; W.md:294-301 (3.5.1): `sanitizeEnv` adds exactly `sky`, `gravity`, `era`; key order "`time weather fog theme wind mood sky gravity era`"; AP-W03 (AR.md:241) "sanitizeEnv whitelist gains `sky gravity era`".
**Evidence.** An `env.liquid` stored by the Builder/recipe is dropped by `sanitizeEnv` on every load/import/clone, so only the theme default can set a liquid; a recipe that wants acid under a water theme cannot. W additionally defines an `acid` MATERIAL hazard (W.md:271/283) distinct from RA's `acid` LIQUID; neither mentions the other.
**Fix.** W.md 3.5.1 add after `era`: `if (typeof e.liquid === 'string' && LIQUID_IDS.includes(e.liquid) && e.liquid !== 'water') out.liquid = e.liquid;` with `LIQUID_IDS = water lava acid coolant plasma oil` in `world/vocab.js`, key order "... sky gravity era liquid", Builder chip "Liquid"; AR AP-W03 text "gains `sky gravity era liquid`"; W 3.4.2 note "the material hazard `acid` is a cell effect; the liquid `acid` is the arena plane (RA 3.10); a recipe may use either". Test WC08 hostile values include `liquid`.
**Owner doc.** W (3.5.1), AR (AP-W03).

### F13. MAJOR: three different weather vocabularies for the same arenas

**Documents.** M.md:111/3.3 and 3.12: `WEATHER_KINDS` additions `smog ion_storm ash`; W.md:51/303 (W-D18): `WEATHERS` = 7 + `smog ion_storm ash spores`; MS.md:61 (D-MS-26): accepts `smog ion_storm ash` and the Sci-Fi outline's `ember_ion`, `neon_rain`, `spores` "with warning MS-R14, mapping `ash`, `rain`, `fog`"; LO 3.10 SF-R7 (landing_order.md:337): "WEATHER_KINDS `ember_ion`, `neon_rain`, `spores` with rows | M15c (#6)"; RA.md:744-750 rows for `smog ash ion_storm`.
**Evidence.** `node tools/ms_lint.mjs`: "scifi warning MS-R14 /missions/5/arena/env/weather: neon_rain is not in WEATHER_KINDS yet; fallback rain", spores at missions 6 and 7; `design/scifi/missions.json` uses `ember_ion` x2, `neon_rain` x1, `spores` x2. W makes `spores` a first-class kind, MS says it is a warning, LO says M15c adds three kinds that M and RA define no row for, RA has no `spores`/`ember_ion`/`neon_rain` row, M has no `spores`.
**Fix (decision: 4 new kinds total, none of the outline names).** Vocabulary = `clear cloudy rain storm snow sandstorm fog smog ion_storm ash spores`. M.md 3.12 weather rows add `spores {speed 1, spread 1.0, vis 0.9}` (W AM-W2); RA.md:744 table add a `spores` row (slow green motes, n 600, vel -0.2, alpha .5, sky tint +.1, fog add +.1); MS D-MS-26 and ms.schema `x-vocab.weather`: accept `spores`, map `ember_ion` -> `ion_storm` and `neon_rain` -> `rain` with warning MS-R14 until the three Sci-Fi missions are edited (`design/scifi/missions.json` lines 696, 1167, 2644: `ion_storm`, `ion_storm`, `rain`); LO SF-R7: "M15c adds the `spores` row; `ember_ion` -> `ion_storm`, `neon_rain` -> `rain` (data edit)"; MS H14 row.
**Owner doc.** M, RA, MS (schema + lint), CAMPAIGN-SF (missions), LO.

### F14. MAJOR: W defines 36 new materials; the three arena designs deliberately define 19, with different names and ids

**Documents.** W.md:222-275 (3.4.2 "The 36 new materials": 12 real + 4 reserved per era, e.g. `med_flagstone`, `med_old_cobble`, `mod_duckboard`, `mod_trench_mud`, `mod_stubble`, `mod_felt`, `mod_gravel`, `sf_regolith`, `sf_neon_cyan`, ...); AR-D21 (AR.md:39) ranges 16-31 / 32-47 / 48-63. `design/medieval/arenas.md:8`: "Three appended (ids 16-18): `lists_sand`, `heather`, `scree`. Proposal A asked for five; `flagstone`, `mud_deep` and `ash_scree` duplicate the shipped `cobble`, `mud` and `ash` and are not added"; `modern/arenas.md:8`: "Seven appended (ids 16-22): `asphalt concrete paving ballast steel_deck lino_tile road_stripe`; `duckboard`, `trench_mud`, `stubble`, `felt_green`, `gravel`, ... duplicate shipped materials and are not added"; `scifi/arenas.md:8`: "Nine appended (after Modern's 16-22): `regolith basalt ice hull_plate neon_pad resin goo glow_moss tile_floor`".

**Evidence.** Script `scratchpad/mats.mjs`/`arenas.mjs`: of W's 36 keys the designs accept 3 + 7 + 9 = 19 and explicitly reject 6 of W's by name (med_flagstone, mod_duckboard, mod_trench_mud, mod_stubble, mod_felt, mod_gravel). The designs' id statements (16-22, "after Modern") contradict AR-D21 block addressing (Modern starts at 32).
**Fix.** W.md 3.4.2: replace the three tables by the designs' 19 rows (names as above, colours/speeds/foot from `props.md` section 5 of each era; Sci-Fi emissive 1.15..1.6 as W already has for the neon rows); title "The 19 new materials (3 + 7 + 9)"; padding rows per block become 13 (ids 19-31), 9 (39-47), 7 (57-63); `manifest.expect.materials` stays "within the reserved range". Design files: replace "ids 16-18 / 16-22 / after Modern's 16-22, REGISTRY assigns" by "ids 16-18 (Medieval), 32-38 (Modern), 48-56 (Sci-Fi), AR-D21". W-D13 text "12 real + 4 reserved" -> "k real + (16-k) reserved". Tests WC07 count 19.
**Owner doc.** W (DESIGN-WORLD) with the three design arenas files (DESIGN-ERA-x).

### F15. MAJOR: W's prop categories, class mix and footprint model do not match the three props designs

**Documents.** W.md:138 (3.2.2): categories `med_castle med_folk`, `mod_city mod_cover mod_works`, `sf_base sf_flora sf_tech` ("registry `prop_category` list, ids prefixed") and "Class mix per era (counts add to 38): T 8, S 12, M 11, L 6, XL 1"; W.md:130 `foot {w,d}` rectangles for class `building`. `design/<era>/props.md`: Format "follows `catalog.js`: `P(cat, r, h, hp, ...)`", "Footprint is always the circle `r`: walls are chains of touching circles (the Troy pattern)"; categories used = the four Ancient ones (`context.json`: architecture 12 / props 17 / monuments 5 / nature 4 for Medieval).
**Evidence.** Script `scratchpad/pcls.mjs` over the `size / voxel` column: Medieval S10 M18 L7 XL3, Modern S17 M11 L5 XL5, Sci-Fi S7 M22 L7 XL2; no `T` at all. W.md:183-184 limits per recipe: XL <= 2 types, <= 3 instances; L <= 6 types; the designs' XL counts (3, 5, 2) per era exceed the "XL 1" of W and Modern's 5 XL types need a per-arena distribution check that neither document makes (castle_dour and moat_keep use 3 XL types in the Medieval table).
**Fix.** W.md:138 replace the category and class sentences by: "Categories: the four Ancient categories (`architecture props monuments nature`) are used by the three designs; W's eight new categories are dropped. Class mix = the measured design mix (Medieval S10 M18 L7 XL3, Modern S17 M11 L5 XL5, Sci-Fi S7 M22 L7 XL2); the per-recipe XL/L caps of 3.3.3 are checked by `prop_budget.mjs` against `design/<era>/arenas.md` (prop lists per arena); a recipe needing more than 2 XL types is split or its props reclassified L". W.md 3.2.1: add "`foot` rectangles are optional; designs that say 'chain of circles' keep circles". AR 3.1.2 `PROP_CATEGORIES` remains Ancient's 4 for all eras.
**Owner doc.** W (DESIGN-WORLD), design props files (DESIGN-ERA-x) for the XL caps.

### F16. MAJOR: W 3.9 recipe ids and names differ from the designs for 33 of 36 arenas and no open item replaces them

**Documents.** W.md:432: "Arena families (first draft; `design/<era>` finalises names, features and objectives by logged amendment)"; W Open items (W.md:696-702) list OI-W1..OI-W3 only. Designs: `context.json recipes`.

**Evidence.** Script `scratchpad/arenas.mjs`: sizes of the matching ids agree, ids do not. In W not in design / in design not in W: Medieval 9 / 9 (W `med_ford med_village med_abbey med_greenwood med_castle_siege med_beacon_moor med_dragon_pass med_toll_bridge med_winter_fair` vs design `med_bellfount_abbey med_castle_dour med_dour_courtyard med_ford_of_dithering med_long_bridge med_mizzlemoor med_mount_perpetual med_pageant_green med_pennywhistle`), Modern 3 / 3 (`mod_hedgerow mod_trench mod_building_site` vs `mod_hedgerow_meadow mod_trench_line mod_roadworks`), Sci-Fi 12 / 12 (every W id differs: `sf_moon_base` vs `sf_moonbase`, `sf_neon_city` vs `sf_neoncity`, `sf_glacier` vs `sf_iceworld`, ...). The 112-hash golden WC01, `RECIPE_IDS` (AR `recipes` 12), MS `arena` ids, S-slice WP-W09 ("first 3 per era in the plumbing slice") all key on ids; two sets cannot both be right.
**Fix.** W.md 3.9: replace the three recipe tables' `id` and `family` columns by the design ids (list above, 12 per era; 36 ids) and keep W's feature/objective columns only where the design agrees; add W Open item `OI-W4 | replace the 3.9 tables by the design ids; re-run WC01 inputs | DESIGN-WORLD with DESIGN-ERA-x | P0 exit`. AR 3.8.2 `arenas`/`recipes` unchanged (12).
**Owner doc.** W.

### F17. MAJOR: the rigs named in the rosters are not RA's rig list, and RA-D04's "no cross-era rigs" is contradicted by 11 units

**Documents.** RA.md:22 (RA-D04): "11 new rigs ... `walker4` is dropped (walker1 `heavy` variant is the boss), drones of Sci-Fi are `hover1` builders"; RA.md:226: "`catapult1`/`ballista1` part ids are NOT reused for Medieval siege (trebuchet1 replaces the throw geometry)"; AR.md:327 (rig kind): "exactly ONE owner era; cross-era use only through `manifest.requires`" with default `['ancient']` (AR.md:575); RA.md:442: `ensureEra('scifi')` "closure ancient+modern+scifi ... about 77 ms".
**Evidence.** Script `scratchpad/rigs.mjs` over `rig` columns: Sci-Fi `grand_concierge` = `mech1 (biped)`, `rustbucket_rex` = `mech4 (quad rigid)` (ids that exist nowhere; RA's rig is `walker1`); Sci-Fi drones `spritz_medic`, `valet_drone` = `drone1` (Modern-owned, RA-D04 says hover1 builders); Sci-Fi `refund_crawler` tank1, `junk_buggy` car1, `salvo_cart` gun1 (Modern-owned), `glidewing` and `void_manta` dragon1 (Medieval-owned); Modern `trolley_rammer` = `ram1 + pusher` (Medieval-owned); Medieval `mangonel` = `catapult1`, `springald` = `ballista1`, `plague_cart` = `chariot1 + ox` (Ancient rigs RA says are not reused; RA lists mangonel as a trebuchet1 builder). V05/V06 (AR.md:106) reject unknown rig ids and cross-era rigs outside `requires`. The 77 ms closure omits Medieval (needed by dragon1/ram1): 28 + 45 + 32 = 105 ms.
**Fix (decision: allow reuse along the release chain; it is cheaper than 7 new builders and consistent with the release order).** (1) Rosters: `mech1`, `mech4` -> `walker1` (boss = heavy variant; `rustbucket_rex` walker1 heavy, `grand_concierge` walker1 biped); `spritz_medic`/`valet_drone` keep `drone1` only if Modern is in `requires`, else `hover1` builder (recommended: `hover1` drone builder, as RA-D04 says). (2) RA.md:226 replace the sentence on `catapult1`/`ballista1` by "Medieval `mangonel` is a `trebuchet1` builder (arm shortened); `springald` reuses the Ancient `ballista1` builder and `plague_cart` the Ancient `chariot1` builder through `shared/ancient_g.js` (AR 3.1.1); their Ancient clips are used unchanged (UC-26 findings apply)". (3) AR 3.8.2: Modern `requires: ['ancient','medieval']` (ram1), Sci-Fi `requires: ['ancient','medieval','modern']` (dragon1, tank1, car1, gun1). (4) RA.md:442: `ensureEra('scifi')` closure ancient+medieval+modern+scifi = about 105 ms against the 150 ms Node ceiling; RA-D04 sentence "no cross-era rigs" -> "cross-era rigs follow `manifest.requires`".
**Owner doc.** RA, AR (3.8.2), rosters (DESIGN-ERA-SF/MOD/MED).

### F18. MAJOR: UC grades `stun/sleep/dizzy/cheer` as STATUS on ORGANIC rigs, but RA gives `dragon1` and `insect1` no such clips

**Documents.** UC.md:113 (STATUS ids `stun sleep dizzy flail cheer` requested "always"), UC.md:137/151 (ORGANIC: "outside the idle family unless listed in `FALLBACK_OK[rig]` (Ancient: empty)"; ORGANIC = hum1, hum_lite, quad1, elephant1, chicken1, insect1, dragon1); RA.md:471-479 per-rig clip sets: dragon1 `idle idle_combat walk run hover fly fly_fast strike_bite strike_claw strike_tail breathe taunt hit_front hit_back stagger death_fall death_burn death_blast`, insect1 `idle idle_combat walk run strike_bite strike_pincer hit_front hit_back stagger death_back death_melt death_burn`.
**Evidence.** `src/anim/animator.js:119-125` FALLBACK: `stun -> [dizzy, idle]`, `dizzy -> [stun, idle]`, `sleep -> [cower, idle]`, `cheer -> [idle]`: all end in the idle family. Quad1 defines `stun` (`src/anim/clips/quad1.js:173`), which is why the Ancient grade has one finding only. So UC-20 is red for dragon1 (cinderwyrm, wyvern, glidewing, void_manta) and insect1 (5 Sci-Fi units) on four ids each, and the Animator logs `missing clip` warnings.
**Fix.** RA.md 3.5 per-rig table: dragon1 and insect1 gain `stun sleep dizzy cheer` (4 short clips each: stun/dizzy = head-shake loop 1.2 s, sleep = curled idle loop 2.0 s, cheer = flap/rear 1.0 s; DEFAULT_META rows `~` hit); counts 18 -> 22 and 12 -> 16; RA.md:442 "166 new baked clips" -> "174 (Medieval 49, Modern 71, Sci-Fi 54)", bake +5 ms. Alternative if ANIM refuses: UC `FALLBACK_OK = {dragon1:[stun,sleep,dizzy,cheer], insect1:[...]}` with a design reason (UC.md:137).
**Owner doc.** RA (3.5), UC (3.3 fallback list).

### F19. MAJOR: five roster tag assignments violate UC's machine-checked tag predicates

**Documents.** UC.md:204-212 predicates: `support`/`siege` "equal to the role"; `cavalry` "model base or sub rig is quad1 or chariot1"; `mech` "role vehicle"; `air` "layer air" (see F1).
**Evidence.** Script over `context.json`: Medieval `abbess` (role hero) and `apothecary` (role ranged) carry tag `support`; Sci-Fi `mandible_runner` carries tag `cavalry` with rig `insect1`; `grand_concierge`, `rustbucket_rex` carry `mech` with role `monster`; four Medieval archers carry `air` (F1). UC-02 fails for each; additionally, M.md:283 would classify them wrongly. (`officer`, `lance`, `animal`, `archer`, `skirmisher`, `boss` all hold.)
**Fix.** Rosters: remove `support` from abbess and apothecary (their healing is the `heal_pulse` ability and role/`preferTargets`), remove `cavalry` from mandible_runner, roles per F1, remove `air` from the four archers. UC.md:202: add one sentence "a tag in `ENGINE_TAGS` is checked at roster review by `uc_spec.mjs`; the roster tables are regenerated, not hand-edited".
**Owner doc.** rosters (DESIGN-ERA-x); UC (verification only).

### F20. MAJOR: the closed drive and air-class tags of M-layers are absent from the rosters

**Documents.** ML.md:79 (E_TAG_DRIVE, E_TAG_AIRCLASS): "Role `vehicle` needs exactly one of `wheeled tread hover walker`; `layer air` needs exactly one of `heli gunship drone dropship dragon wyvern`".
**Evidence.** Roster tags: Modern tanks carry `tank` not `tread`; cars/mowers/APC carry none of `wheeled`; only `trolley_rammer` carries `wheeled`; mechs carry `mech` not `walker`; `fishbowl_chopper` / `chandelier_gunship` / `spotter_balloon` lack `heli`/`gunship`/`drone`; Medieval dragons lack `dragon`/`wyvern`; Sci-Fi `glidewing`, `void_manta` lack any class tag. 25 units fail validation once F1 is fixed.
**Fix (mapping for the roster edit).** `tread`: biscuit_tank, dozer_plough, grand_teapot, teapot_heavy, refund_crawler; `wheeled`: lunchbox_apc, ride_on_mower, toast_rack_runabout, broadcast_behemoth, grand_mower, junk_buggy, trolley_rammer; `hover`: dustpan_hover, shush_bike, valet_drone, spritz_medic (keep); `walker`: grand_concierge, rustbucket_rex; `heli`: fishbowl_chopper; `gunship`: chandelier_gunship; `drone`: hobby_drone, spotter_balloon; `dragon`: cinderwyrm, void_manta; `wyvern`: wyvern, glidewing (DESIGN-ERA-SF to confirm the class of the two Sci-Fi flyers against the ML 3.6.3 patterns: `run` bombing runs). These are engine tags: add them to UC `ENGINE_TAGS` (F28).
**Owner doc.** rosters (DESIGN-ERA-x), UC.

### F21. MAJOR: four roster weapons exceed the W 3.7.1 ceilings that "rosters, spec/M kind rows and design/<era> must obey"

**Documents.** W.md:370-390: global caps "direct-fire range <= 40 (foot) and <= 52 (vehicle); precision <= 72; indirect <= 80; every unit weapon range <= 0.65 x the largest legal arena (128 u -> 83)", Modern MG 24..30, Modern foot direct 28..34 (rifle).
**Evidence.** `design/modern/rosters.md:24,86` `final_notice` range 110 (minR 35); `design/medieval/rosters.md:41,82` `lady_counterweight` boulder range 90; `modern/rosters.md:27,89` `parasol_missileer` homing rocket range 46 (foot); `modern/rosters.md:42,104` `tripod_mg_team` mg range 36 (MG band 24..30). Script `scratchpad/spd.mjs` found no other violation (speeds all within caps; Sci-Fi none).
**Fix (decision: lower the four rows; W's caps protect first-contact bands F6/F7 and the size policy).** Rosters: `final_notice` range 110 -> 80, minR 35 -> 30; `lady_counterweight` 90 -> 80; `parasol_missileer` 46 -> 40; `tripod_mg_team` 36 -> 30 (stat tables and weapon cells). If the designers insist on the boss ranges, the "Global caps" paragraph of W 3.7.1 (W.md:384) gains a boss exception "boss artillery <= 110 on `large` arenas flagged `bossSafe`" and `tempo.mjs` excludes them from `R_first`.
**Owner doc.** rosters (DESIGN-ERA-MOD/MED), W (only if the exception is chosen).

### F22. MAJOR: W requires `campaign_validate` and `generateArmy` to enforce a range rule that neither AR, CU nor MS accepts

**Documents.** W.md:396: "Enforced by `campaign_validate` (`range` rule V-RANGE: `R_first(both rosters) <= cap(size)`), by `generateArmy` when it is given an arena, and by `tools/tempo.mjs`"; AR AP-C03 (AR.md:272) allows `campaign_validate.js` edits only for era args with default behaviour unchanged; CU.md:165 `validateMission(m, {era, defs, kit})` "all 40-odd existing checks unchanged"; MS lint code list (MS.md:500-550) has no range/first-contact rule; `generateArmy` has no `arena` parameter in AR 3.7/M 3.9.
**Evidence.** `grep -n 'V-RANGE\|rangeClass'` over the specs: W only (S-slice references `tools/tempo.mjs`). The rule has no code owner, no AP row and no test id.
**Fix.** W.md:396 replace by: "Enforced by `ms_lint` rule `MS-R15` (R_first of both rosters from `context.json` ranges <= cap(size); error), by `tools/tempo.mjs` for Quick Battle presets (a preset declares `rangeClass`), and by `generateArmy` only through the `rangeClass` filter of the pool (`opts.rangeClass`, default undefined = Ancient behaviour)". MS.md lint table add `MS-R15`; AR AP-S08 text add "`opts.rangeClass`"; no runtime `validateMission` change (Ancient unchanged).
**Owner doc.** W, MS, AR (AP-S08).

### F23. MAJOR: two P0 spikes decide the same voxel-size question with opposite defaults and different verdict files

**Documents.** W.md:174 (3.3.2, S-VOX): "0.2 stays [for L/XL] unless the panel median < 3.5; then L props shrink to <= 8 x 8 x 9 u at 0.1 and the XL class is dropped"; verdict `docs/eras/spikes/s_vox.md`; RA.md:926 (SP-3): "uniform 0.1 unless the 0.1 keep exceeds 60 K near triangles or 100 K voxels (then 0.2 for buildings > 10 u only); tank1 stays 0.15 iff the panel ties or prefers it and ratio <= 1.6, else 0.1"; verdict `SP-3_voxel_size.md`; both use "one scene: castle keep + hum1 + tank" and a 3-agent panel; WP-W06 (S-D8, S-VOX) and RA P0 spikes are both P0 exit items.
**Evidence.** Default 0.2 (W) vs default 0.1 (RA) for the same keep; thresholds (panel median 3.5 vs triangles 60 K) differ; the W budget table (3.3.3) and `kit.js finishModel(id, pen, extra)` are built for 0.2, RA's rig tables assume 0.1/0.15; if the spikes disagree both specs are red.
**Fix.** One spike: S-VOX (W) decides the building/prop voxel size with W's rule; RA SP-3 is reduced to the rig question "tank1/heli1/drone1/hover1 at 0.15 or 0.1" and its building rows are deleted ("building voxel size: see spec/W S-VOX verdict"); both verdicts are inputs of `p0_exit.mjs`, with a shared line "S-VOX verdict precedes SP-3 (SP-3 uses its voxel size for the keep)". Update RA.md:926 and W.md:174.
**Owner doc.** RA (3.17), W (3.3.2).

### F24. MAJOR: four different numbers for the props share of the 160-draw budget

**Documents.** RA.md:785 (3.12): "`P = 39` (governor cap 52)" in `D = T + M + P + U + X + L` (expected `F = 92`); RA ladder: "lower the props governor `DRAW_BUDGET` 52 -> 30"; W.md:202 (3.3.5 `drawsProps`): "<= 60 after the 52-draw governor", WC06 (W.md:620) the same; W-D09 (W.md:42): "prop draws <= 60 at the default camera" with "at most 35 stage-0 batches".
**Evidence.** The RA table (all near T=32: 156; mixed 188) uses P = 39. With W's accepted worst case P = 60 the same rows become 177 and 209 (T=32); with the governor cap 52 they are 169 and 201. RA-PC7 then states the draw gate is reachable only through the ladder, so the real P is the ladder's 30, which W's `<= 60` assertion would not catch (a recipe with 52 prop draws passes WC06 and fails RA-T18).
**Fix.** RA.md:785 model: "`P` = `min(governor, measured)`; table columns use P = 52 (the governor cap) for the design verdict and the measured P of the worst recipe per era for the gate"; recompute the three rows (all far 137, all near 169, mixed 201 at T=32). W.md:202/620/42: "`drawsProps` <= the governor `DRAW_BUDGET` in force (52 default, 30 after rung (b)); `B0` <= 35 batches is the authoring budget".
**Owner doc.** RA (3.12), W (3.3.5, WC06).

### F25. MAJOR: the kit record of M lacks fields that CU, UC and M17e itself use, and CU's per-era "utility unit" contradicts AR's exactly-two utility units

**Documents.** M.md:392-394 kit record `{era, barks, lessons, waves, godPowers, intervention, mascot, pacing, gravity, weather, armygen, warm, roles, currency}`; M.md:400 uses `kit.reactions[def.react]`; CU.md:1300/1375/1291: `kit.utilityUnit(era)`, `kit.defaultBrush(era)`; UC.md:226 `kit.mechanicSynonyms`; AR.md:368: "Utility units: exactly `battle_goat` and `sacred_chicken` ... `registry.UTILITY_UNITS` lists them"; CU.md:1291: new-era chicken_rain spawns "a harmless roster row the unit specs declare; provisional: a chicken in a tabard".
**Evidence.** Script `scratchpad/kit.mjs`: `utilityUnit`, `defaultBrush`, `reactions`, `mechanicSynonyms` used, undeclared in M. A per-era utility unit is a 35th unit per era (AR `expect.units` 34, UC `roles` sum to 34) or a unit outside the counts.
**Fix.** M.md kit record add `reactions:{key: table}`, `defaultBrush: unitId`, `utilityUnit: unitId|null`, `mechanicSynonyms: {word:[words]}`; Ancient values `{reactions: {}, defaultBrush:'hoplite', utilityUnit:'sacred_chicken', mechanicSynonyms: {}}`. Decision for the contradiction: new eras set `utilityUnit: null` (CU already specifies "disabled with reason" for chicken_rain, CU.md:1300) until a roster row exists; delete the "provisional chicken in a tabard" sentences in CU.md:1291 and OI-CU9 becomes "optional".
**Owner doc.** M (M15 block), CU (3.16.2), UC (3.7).

### F26. MAJOR: CU's new Ancient file `era_ancient/ui.js` has no Ancient-policy row and would fail `ap_lint` at its first commit

**Documents.** CU.md:126: "The Ancient row is a NEW file `src/content/era_ancient/ui.js` (AP-C02 pattern, REGISTRY)"; AR AP-C02 (AR.md:271): `src/content/era_ancient/manifest.js`, `data.js`, `pack.js` only; AP-C06 FZ catch-all: "`src/content/era_ancient/**` every other Ancient content file" (FZ fails on any status incl. `A`, AR 3.2.1 step 4). W's `era_ancient/materials.js` has the same defect but is already listed (W AM-W4 / OI-W3).
**Evidence.** Script `scratchpad/anc.txt`: new `src/content/era_ancient/` files named in the specs: `data.js manifest.js pack.js` (AR, covered), `materials.js` (W, AM-W4 pending), `ui.js` (CU, no row). Also needed by VB (`era_ancient` palettes/emblems arrays stay in `blueprints.js`, so no new file).
**Fix.** AR AP-C02 globs: `src/content/era_ancient/{manifest,data,pack,ui,materials}.js` (NEW) and the OW row for them (REGISTRY); delete AM-W4's separate AP-W05 once AP-C02 carries `materials.js`.
**Owner doc.** AR (3.2.2), CU 3.1 sentence.

### F27. MAJOR: CU's nine SIM requests R-CU-S1..S9 have no accepting section in M or M-layers

**Documents.** CU.md:1605-1613 (R-CU-S1 event fields and prop ids, S2 footfall, S3 `bossCycle/bossEvery`, S4 `rules.powers.disable/override`, S5 self-aim for vehicles/mechs/air, S6 `scoutReport(..., {era})` + `SCOUT_DETECTORS`, S7 `chicken_rain` / `wine_rain_always`, S8 mutator exemptions, S9 `sanitizeMutators`), all "SIM, P2". M.md 3.15 (M.md:557-570) cross-owner table has no row for UI/CU requests beyond "UI: ammo/shield/status/cloak on the selection card"; `grep R-CU-S` over M.md, M-layers.md, LO: 0 hits, except LO ALL-R3/R4 (S4 -> M15c) and ML 3.9.5 (aim).
**Evidence.** Only S4 is accepted. S1, S3, S6-S9 touch `projectiles.js/combat.js` (events), `waves.js`, `armygen.js`, `mutators.js` (AP-S08/S09 files) with no module, landing or session; CU's own WP-CU9 is "UI + SIM P2".
**Fix.** M.md 3.15 add rows: `| CU requests R-CU-S1 | unit_hit.cover/dstReloading/projKind, unit_kill.face, prop ids on prop_damaged/destroyed | M1 (face), M2 (dstReloading projKind), M9 (cover), M12 (prop ids) |`, `| R-CU-S3 | waves.bossCycle/bossEvery | M15r |`, `| R-CU-S6 | scoutReport era + SCOUT_DETECTORS | M15r (armygen rows) |`, `| R-CU-S7/S8/S9 | mutators: kit.utilityUnit, machine skip, vehicle/air exemptions, sanitizeMutators | M15r |`, `| R-CU-S5 | extra.aim absent -> self-aim | M8c |` and the same ids in LO 3.10 as blessings with landing ids.
**Owner doc.** M (3.15), LO (3.10), CU (7 table owners).

### F28. MAJOR: UC's closed `ENGINE_TAGS` list omits tags that M, M-layers and LO make the engine read

**Documents.** UC.md:202: `ENGINE_TAGS` = the 20 Ancient tags + `air mech machine detector`; "a descriptive tag ... is any other word" (<= 64 per era, one comment each). ML.md:21/79: `wide`, `wheeled tread hover walker`, `heli gunship drone dropship dragon wyvern`; M.md:283/ML.md: `officer boss machine mech detector unarmed carrier cloaked`; LO 3.2 row 18 and MOD-8 (landing_order.md:99, 328): `mine_immune` "owned by M11"; rosters: `mine_immune`, `pin_immune`, `ground_only`, `indirect`, `aa`, `open_top`, `cheap`.
**Evidence.** `grep mine_immune` in M.md/ML.md: 0; the M11 block (M.md:406) has no immunity rule ("friendly units never trigger", "hover/air do not trigger", AT mine mass rule), so the `dozer_plough` tag is cosmetic. `pin_immune` is redundant (suppression skips `machine`, M.md:259).
**Fix.** UC.md:202 `ENGINE_TAGS` = Ancient 20 + `air mech machine detector wide wheeled tread hover walker heli gunship drone dropship dragon wyvern unarmed mine_immune`; M.md:406 M11 add "a unit with tag `mine_immune` never triggers a mine and takes 0 mine damage"; drop `pin_immune` from the rosters (or define it as `machine`).
**Owner doc.** UC (3.6), M (M11), rosters.

---

## MINOR

### F29. MINOR: UC's derived speed and HP classes cannot express the rosters' `rush` and `+sh`

UC.md:220: speed class `crawl <= 1.5, slow 1.6-2.2, mid 2.3-2.9, fast 3.0-4.2, air`; rosters use `rush` (Modern x3, Sci-Fi x5: runabout 5.4, scout bikes 5.0-6.0, W 3.7.1 "fast ground 4.5..6.0") and hp classes `S+sh`, `M+sh`, `XS+sh`, `L+sh`, `XXL+sh` (Sci-Fi, 12 rows). UC-04 requires the row to equal the derived class. **Fix:** UC.md:220 speed `fast 3.0-4.2, rush > 4.2`; HP class unchanged, shield becomes a separate `shield: 'sh'|'-'` column derived from `eshield`; `spec_seed` rewrites the roster letters. **Owner doc:** UC.

### F30. MINOR: AR's `registry.verify` V07 requires a `PROJ_VIS` entry that RA removes

AR.md:106 V07: "every `ranged.proj` ... has a `PROJ_FX` row, a `PROJ_VIS` entry and a `PROJ_AUDIO` row"; M.md:110/335 row 7 "PROJ_VIS row per kind (verify)"; RA.md:607: "engine defaults replace `PROJ_VIS`" and AR AP-R02: "`PROJ_FX` (Ancient rows verbatim from `PROJ_VIS`)". After R1 there is no `PROJ_VIS` table to check. **Fix:** AR V07 and M.md:110, 335: "has a `PROJ_FX` row (RA 3.8) and a `PROJ_AUDIO` row"; `PROJ_VIS` remains only as the frozen Ancient source until R1 lands. **Owner doc:** AR, M.

### F31. MINOR: marker and hazard vocabularies differ across MS, W and RA

MS.md:148 marker types `hill exit vip_start general_spawn waypoint capture core`; W.md:509 `MARKER_TYPES_EX` = `capture core spawn`; RA.md:811 (3.12 Markers) `STYLE` rows `hill exit capture beacon extraction objective` (no `core`; `beacon extraction objective` exist in no sanitizer); RA.md:648 HazardLayer draws "radiation pools, laser-grid posts, neon light pools" from `arena.hazards` while M.md:110 HAZARD_KINDS and W `HAZARDS_EX` are `quicksand spikes fire boulders geyser lava mine_ap mine_at` only. **Fix:** RA markers.js `STYLE` keys = `hill exit capture core spawn` + invisible `vip_start general_spawn waypoint`; delete `beacon extraction objective`; HazardLayer: "radiation pools, laser-grid posts and neon light pools are PROP/decal models of spec/W, not hazards". **Owner doc:** RA.

### F32. MINOR: H counts 17 sim bark keys, M and M-layers define 16

H.md:819: "one of the 17 keys of spec/M 3.12"; M.md:487 lists 12 (`deflect reload status:suppress shell_incoming healed air_in breach capture banner_down blink bailout wreck`) and ML.md:492 adds 4 (`air_land air_withdraw reposition deploy`). The 108-line planning value (36 pairs x 3, H.md:574) inherits the miscount. **Fix:** H.md:819 "16 keys (12 + 4)" or name the 17th; recompute B2 by `text_matrix.mjs`. **Owner doc:** H.

### F33. MINOR: the `rf.air` draw in BREAK is placed at two different moments

ML.md:315 (3.6.4 row 3): "straight on 0.5 s, then turn ... (1 draw of `rf.air` for the turn side)"; ML.md:496: "exactly 1 draw at each APPROACH entry and 1 at each BREAK exit". Two builders produce different fork streams (hash block L). **Fix:** ML.md:496 -> "1 at the turn that ends the 0.5 s straight segment of BREAK". **Owner doc:** M-layers.

### F34. MINOR: the drone class range violates its own `E_RANGE`

ML.md:301 drone: `cruiseAlt 3.5..5`, attack altitude factor `0.80`; ML.md:79/302: "`cruiseAlt * atk` below 3.0 is `E_RANGE`" (attack altitude >= 3.0). 3.5 x 0.8 = 2.8. **Fix:** ML.md:301 drone range `3.75..5` (RA.md:853 uses 4). **Owner doc:** M-layers.

### F35. MINOR: LO states the P1 chain as 15 sessions and as 14, and gives the `setup` gate to two landings

LO 3.3 row (landing_order.md:131): "P1: M0 3, M1 2, M3 1, M2 4, M2b 2.5, M15c 1.5, M17e.eng 1 (= 15)" but M17e.eng is landing #13 (P2) and the tool prints "P1 14" (landings #1-#6 sum 14). LO row 4 (M2) contains the "`setup` gate" while MOD-2 (landing_order.md:322) says the `setup` firing gate is owned by M8 (#17), and Modern `tripod_mg_team` (first mission 3, closure ends at M9 #15) uses `setup 1.2 s`. **Fix:** 3.3 row "(= 14; M17e.eng 1 session is counted in P2)"; MOD-2 owning landing M2 (#4) and "enforced for turret defs at M8"; `LO-UNIT-COVER` info rows add `tripod_mg_team` if M8 stays the owner. **Owner doc:** landing_order.

### F36. MINOR: ML's "hot-file budget <= 3 touches of `world.js` after P1" is unverifiable under AR's exemption

ML.md:547 header vs AR.md:844: "`src/sim/**` is exempt (module order; spec/M lists the touches per module)". M.md AP-S04 lists M0, M10, M12, M14, M15 as `world.js` editors and ML WP-L1..L3 are three more (M7). After P1 that is at least seven touches (M10, M7 x3, M12, M14, M15r). Nothing checks the "3". **Fix:** ML.md:547 -> "M7 uses at most 3 `world.js` touches (WP-L1..L3); M8 and M9 none (hooks in WP-L1); the per-file total after P1 is listed in M.md 3.16 and exempt under AR 3.10.4". **Owner doc:** M-layers.

### F37. MINOR: RA lists RENDER as editor of tools owned by other roles, and AU names a state that does not exist

RA.md:938-950 work map ("files (owner RENDER unless noted)"): R1 `tools/contracts.mjs` (OW-20 TOOLS-GATE), R12 `tools/perf_assert.mjs` (OW-22 TOOLS-VERIFY) are not marked as requests, so `own_check --role=RENDER` fails. AU.md:1732: `unit_air_state` "on state cruise->strafe", while ML.md:308-320 has states 0 CRUISE .. 10 ESCORT with no `strafe` (ATTACK = 2). **Fix:** RA R1/R12 rows "(TOOLS-GATE/TOOLS-VERIFY request)"; AU.md:1732/1777 "on state 0 -> 2 (CRUISE -> ATTACK) and 6 GROUNDED -> 7 TAKEOFF". **Owner doc:** RA, AU.

---

## Verdict

The spec set is NOT internally consistent enough to start P1 as written. The construction of the engine specs themselves is careful and accurate about the code (counts, line numbers and the budget/modules blocks all re-derive), and most cross-spec seams were already logged as amendments (M-layers PC-L1..L4, W AM-W1..W4, RA OI-RA2, OI-LO*). The remaining defects are concentrated where the rosters, the registry/owner tables and the amended landing order meet.

Blockers to patch before P1 (all text-only, no code needed):
1. F1: re-role/re-tag the 102 roster rows to the engine's `ERA_ROLES` / layer / tag model (about 30 rows fail `validateDef` today) and add `swarm` to Modern ERA_ROLES.
2. F2: absorb into AR `KIND_TABLE` the kinds already requested by AU (10 keys), CU (5), RA (`fx_recipe`, `REACTIONS` key), S-slice (`slice_mission`) and the new per-era file names.
3. F3: add the missing OWNER-TABLE rows (`tests/uc|slice|world|render|voxel|verify|gate|lib`, era files `fxdata reactions materials palettes emblems slice ui`), fix OW-18's path, own the `spec/*.json` files.
4. F4: split the `theme` row field into `preset` (W) and `look` (RA).

Majors that must be closed at P0 exit because P1 work packages depend on them: F5 (apply the 26-landing amendments atomically at P0 exit, not at the end of P1), F6 (M13a parameter schema), F11/F12 (emissive and `env.liquid` before R6/R7 and WP-W03), F13 (weather vocabulary before the M15c kit and ms_lint), F14-F16 (materials, props, recipe ids before WP-W03/W09 and the 112-hash golden), F17-F20 (rigs, clips, tags before the first tracer rig and UC-01), F9 (multi-era Ancient invariance test before M7). The rest (F7, F8, F10, F21-F28) can be patched in the same amendment pass; F29-F37 are cleanup.

Total: 4 BLOCKER, 24 MAJOR, 9 MINOR.
