# spec/landing_order: the SIM landing order reconciled with what the three eras need (DESIGN-SIM with COORD; plan v3.1 section 4; tool `tools/landing_order.mjs`)

Status: final for the machine model, the rule, the recommended order, the amendments and the acceptance; session sizes are planning values (assumptions A-S1..A-S3 in 3.3) that `--robust` and `--sizes=layers` stress. Every number in this file was printed by `node tools/landing_order.mjs` (flags in 3.13) on the tree at this date; `--check` re-derives them from `docs/eras/design/*/missions.json`, `context.json`, `docs/eras/spec/ms.schema.json` and the `modules` block of `docs/eras/spec/M.md`. Binding inputs read: `docs/AGENTS.md`, `docs/eras/{e,plan,traceability}.md`, `spec/{M,M-layers,MS,S-slice,VF,CU}.md`, `design/{medieval,modern,scifi}/{missions_outline,missions_notes,missions.json,context.json,rosters,god_powers,puzzles,boss_table,arenas,feel_sheet}.md`, `q2_schedule.md`, `q3_program.md`, `q3_product.md`.

## 1. Purpose and scope

**Binds.** (a) The machine model of the landing order: landing nodes, DAG edges with reasons, per-mission required sets, the mission order per era, the E-FREEZE rule and the margin rule (3.1, 3.2). (b) ONE recommended landing order of 26 landings (the 19 modules of plan section 4, five of them split into 12 landings, seven extra landings) with the E-FREEZE landing of each era, the per-mission margin table and the waiver list (3.4 to 3.7). (c) The answer to every request about module order in the design files and the placement of every parameter blessing (F1..F18, the Medieval/Modern/Sci-Fi M13-style requests, the SIM-addressed MS requests) (3.8, 3.10). (d) The exact amendments (patch text) COORD applies to `plan.md` sections 4, 8, 12, 14, to `spec/M.md`, `spec/M-layers.md`, `spec/S-slice.md`, `spec/MS.md`, `spec/CU.md`, `spec/VF.md`, the three `missions.json` and the outlines (3.11). (e) `tools/landing_order.mjs` (search, scoring, checks, 12 negative controls).

**Does not bind.** The internal algorithms of the modules (`M.md`, `M-layers.md` own them); the content of any mission; session sizes beyond the planning values; the order of non-SIM work.

**Builders.** DESIGN-SIM (this file, the tool), COORD (applies 3.11, decides OI-LO1), SIM (lands in this order, confirms sizes at the end of P1), CAMPAIGN-x (missions.json rewrite), TOOLS-VERIFY (`dag.test`, `perf_budget`, `plan_lint`, `ms_lint`, `records refresh`), DESIGN-UX (S-slice), REVIEWER.

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| LO-D1 | The unit of the order is a **landing**: one SIM hand-back (one WP chain, one gate run, one `landings.jsonl` row, one set of inert tests per frozen era). The 19 modules become **26 landings**: five modules are split (M13, M6b, M8, M17e into two landings each, M15 into four; seven extra landings), the other 14 stay whole. | `VF.md` 3.7 counts landings for the record age cap; `M.md` D-M20/3.2 already split M15 and M17e into steps; M-layers 3.14 already has WP-V1..V4 and WP-C1..C2 | 4 |
| LO-D2 | **Margin rule R-M.** For a headline-first mission m of era E: `margin_landings(m) = F(E) - H(m)` and `margin_sessions(m) = sum of sessions of the landings at positions H(m)+1..F(E)`, where H(m) is the position of the last landing in the DAG closure of m's hard modules and F(E) the E-FREEZE landing (LO-D3). Required: `margin_landings >= 2` AND `margin_sessions >= 1.0`. Count is the binding, lintable quantity (positions of the `landings` block); the sessions guard stops two tiny landings from counting as margin. A mission that cannot meet it carries `marginWaiver {ref, reason}` (MS C07). | plan section 8 ("landed >= 1 week-equivalent") is not a unit (q3_product 31, MS PC-2); MS C07 uses position difference >= 1; this file's charter asks 2 landings; module sizes differ by 10x (M12 = 3 sessions, M6b2 = 0.5), so a count alone is blind; sessions alone move +-30 percent (3.9) | 8 |
| LO-D3 | **E-FREEZE(era) = the landing of the last member of the era's required set R(E)**; the E-FREEZE prefix is every landing up to it (so prefixes of one order are nested). R(E) = DAG closure of the hard and soft modules of the era's 9 missions and 6 puzzles, plus the era extras of 3.1. A landing inside a prefix that the era does not need is reported (`waits for`), not forbidden. | `M.md` D-M2 ("E-FREEZE is a prefix") stays true; the sets stop being a fixed list copied from the plan | 4 |
| LO-D4 | **The plumbing slice is #1..#6: M0 M1 M3 M2 M2b + M15c.** M15c (the kit core of `M.md` 3.2 "movable windows") is the one early addition: plan section 4 row 12 already puts the plumbing part of M15 in P1, D-M20 says so, S-slice 3.2.2 lists "M15 core" as slice scope. Nothing else is added (`--check` code `LO-P1`). | plan 4 row 12; `M.md` D-M20; `S-slice.md` 3.2.2 | 4, 12 |
| LO-D5 | **Era order Medieval, Modern, Sci-Fi** (block search, 3.7): zero waivers, Medieval freeze at 32.0 cumulative SIM sessions, Modern 42.75, Sci-Fi 49.25. The order Medieval, Sci-Fi, Modern is worse (1 waiver, weighted freeze key 236.75 against 230.75) and is not recommended. | `landing_order --search --era-order=...` | 4 |
| LO-D6 | **M13 splits into M13a and M13b, and `call_strike` stays in M13a.** M13a = ability-param infrastructure (`ABILITY_SCHEMA`, cap 30 <= 32), `aura` banner/pinfield, `summon_on_death` bailout, `dot_cloud` gas/smoke/trail, `call_strike`, `cc_field` stun/taunt, `dash` lunge/lance/bull_charge, `stance` pavise. M13b = `dash kind:'blink'` only. | `call_strike` is needed by Medieval (castellan oil), Modern (signal officer, mission 5 shells = headline) and Sci-Fi (Housekeeper, mission 8); blink only by Sci-Fi mission 7; so the charter's example split (blink AND call_strike in M13b) would pull Modern mission 5 and the Medieval castellan behind the Medieval freeze | 4 |
| LO-D7 | **M6b splits into M6b1 (EMP stun and shield wipe) and M6b2 (cloak cancel, air-machine descent, possession release, repair-filter cross checks); the Sci-Fi swap of #18/#19 is rejected.** | Sci-Fi request R1; the swap moves the zero margin from EMP (mission 5) to cloak (mission 4) and EMP keeps 1 landing (variant V6) | 4 |
| LO-D8 | **M9 (cover) lands at #15, the first landing after the Medieval freeze; its edge to M8 becomes soft.** Modern R1 ("right after M2b") is rejected as written (its premise is false: `cover:'low'` is an M12 prop field and the smoke occluder is M13a) and accepted in the corrected form. | `M-layers.md` 3.10.1-3.10.4 (the gate is in `rangedBehaviour` before `startRanged`, `aimOk` only for turret defs, 3.8.3) | 4 |
| LO-D9 | **M11 (mines) lands at #18 after M8 and before the two Modern tail landings; Modern R2 ("M11 before M8") is rejected.** Mission 6 needs M8 and M9 as hard modules (missions.json), so moving M11 earlier leaves M6 at 0 margin (variant V4); margin comes from landings after M11 that mission 6 does not need (M8c, M15g.mod). | `design/modern/missions.json` mod_switchboard_hold | 4 |
| LO-D10 | **M17e splits into M17e.eng (engine, cause vocabulary) and M17e.wreck (wreck props); the Medieval freeze excludes M17e.wreck.** Medieval props.md says wrecks are not used by this era and the plan lists wrecks on cut-ladder rung 5. (Conflict with the rolling-keep "crumble prop" of `boss_table.md`: OI-LO3.) | `design/medieval/props.md` line 80; `plan.md` 13 rung 5 | 4 |
| LO-D11 | **The spawn accounting (`reinforce`, `spawnedAlive`, `aliveRoster`, `lostDefs` exclusion) moves from the M14 block to M13a** and M14 gains the edge M13a -> M14. Without it M13a (bailout) could not land before M14. | `M.md` 3.10 M14 "Accounting" and M13 "Bailout"; MS H10 | 4 |
| LO-D12 | **Tail landings are real hand-backs, named, with edge reasons** (3.2): M17e.eng and M15r (Medieval), M8c and M15g.mod (Modern), M6b2 and M15g.sf (Sci-Fi). The rule R-M can only hold if the last two landings of an era are not needed by any headline-first mission; the tool computes that set per era (`tailNodes`). If COORD refuses the splits the waivers of 3.9 come back. | 3.6 | 4 |
| LO-D13 | **Session table** = `q2_schedule.md` Q9 SIM allocation (33 P2 WPs at 1.7 h, P1 chain of 15) apportioned over the split landings; +0.25 per extra landing as overhead (A-S1, A-S2). `--sizes=layers` replaces M7/M8/M9 by the M-layers 3.14 WP sizes (S/M/L = 1/2/4): the order is unchanged. | 3.3 | 12 |
| LO-D14 | **Every post-freeze landing needs a witness refresh.** The recommended order leaves 12 landings after the Medieval freeze and 6 after the Modern freeze (plan: 6 and 3). `VF.md` 3.7 turns a STALE-ENGINE record red after 6 landings without refresh; the SIM hand-back therefore runs `records.mjs refresh --scope=frozen` (automatic, 30 stored battles per record). | VF-D6, 3.7 RED-AGE | 9 |
| LO-D15 | **`requiresModules` names landings, not split module names.** The five split module names stop being valid tokens in `missions.json` (MS-R08); the rewrite table of 3.11 E is generated by `--rewrite`. | no lint heuristics: a mission names exactly the landings it needs | 8 |
| LO-D16 | The margin rule is applied to **headline-first** missions only (a mission whose `teaches` holds a mechanic with `headline:true, firstSightOnly:false` in `ms.schema.json` x-vocab). Finales and combination missions are reported, not waived; two Sci-Fi ones are thin (3.9). | plan 8 curve rules; MS C04 | 8 |

## 3. Detailed specification

### 3.1 The machine model (what `tools/landing_order.mjs` computes)

**Inputs, read at run time:** `M.md` `modules` block (the 19-module plan model, for `--baseline`), the 26-row model of 3.2 (constants in the tool, replaced by the amended `modules` block once COORD applies 3.11 B), `design/<era>/missions.json` (`requiresModules`, `softModules`, `teaches`, puzzles), `design/<era>/context.json` (unit abilities, tags, rigs, first missions), `spec/ms.schema.json` `x-vocab.mechanics` (headline flags).

**Objects.** `node` = `{id, mod, S, deps[], sess, p1}`; `order` = a permutation of the 26 ids; `position` = 1-based index; `cum[i]` = cumulative sessions.

**Token expansion** (`requiresModules` module names to landings; unsplit names map to themselves):

| token | landings | rule |
|---|---|---|
| `M13` | `M13a`, plus `M13b` when a unit of the mission has ability `blink` | blink is the only M13b feature |
| `M8` | `M8` | possession (`M8c`) is not a mission prerequisite |
| `M15` | `M15c` | missions need the kit and the interpreter shell, not the closing step `M15r` (assumption A-M15, 3.12) |
| `M17e` | `M17e.eng`, `M17e.wreck` | every listing mission uses wrecks or topple |
| `M6b` | `M6b1`, plus `M6b2` when the mission also requires `M5` | cloak cancel only matters with cloakers |

**Era extras** (required by units, god powers or kit completeness, named by no mission): all eras `M15c M15r M17e.eng`; Modern `M8c M15g.mod`; Sci-Fi `M8c M15g.sf`. R(E) = closure(hard and soft modules of 9 missions, puzzles, extras).

**Quantities.** `F(E) = max position over R(E)`; `H(m) = max position over closure(hard(m))`; `margin_landings`, `margin_sessions` as LO-D2; `first runnable(m) = cum[H(m)]`; `post-freeze landings(E) = 26 - F(E)` (= number of `inert_<landing>_<E>` tests, X6).

**Hard checks (`--check` exits 1 on any):**

| code | meaning |
|---|---|
| `LO-COMPLETE` | the order is a permutation of the model's ids |
| `LO-DAG` | every dep lands before its dependant |
| `LO-P1` | the first six landings are exactly the plumbing-slice set of LO-D4 |
| `LO-AFTER-FREEZE` | no mission closure contains a landing after its era's F(E) (check 5 of the charter) |
| `LO-ERA-SCOPE` | no mission closure contains a module (by name) outside the plan's E-FREEZE set of its era (Medieval never needs M8 M9 M11 M4 M5 M6b; Modern never M4 M5 M6b) |
| `LO-MED-FIRST` | F(Medieval) is strictly the earliest freeze (check 5b: Medieval can start P3 first) |
| `LO-WAIVER` / `LO-WAIVER-STALE` | every headline-first mission meets R-M, or its waiver is on file in the tool's `WAIVERS_ON_FILE` (empty); a listed waiver that is no longer needed is also red |
| `LO-UNIT-COVER` | no unit of an era carries an ability or tag whose landing is outside R(E) |
| `LO-BLESSING` | every parameter blessing names existing landings and none lands after the freeze of its era |
| `LO-BUDGET` | the cost shares sum to 0.50 / 0.80 |
| `LO-STALE-RECOMMENDATION` | a fresh exhaustive block search finds a strictly better key than the literal order (so a data change forces a re-decision) |

**Score key** (lexicographic, smaller is better): hard-check count, waivers, `3*F1 + 2*F2 + F3` of the sorted freeze sessions, sum of `cum[H]` over headline-first missions, number of inert tests.

**Search.** `--search` enumerates all topological orders **block by block** (block 1 = R(first era) minus the slice, block 2 = R(second era) minus block 1, block 3 = the rest), exhaustively inside a block, keeping the best 60 prefixes between blocks (beam 60); `--free` adds a seeded hill climb over the whole order (16 climbs of 6000 moves from the block-search results) to catch solutions that put an unneeded landing inside an earlier prefix. `--windows` reports, per landing, the positions it may take without a waiver, a DAG break or a changed freeze.

### 3.2 The 26 landings: contents, edges and reasons

Sessions are SIM sessions (A-S1). "Needed by" names the headline-first missions that put the landing in their closure first.

| # | landing | S | module | contents of the hand-back | deps | sess | needed by |
|---|---|---|---|---|---|---|---|
| 1 | M0 | S28 | M0 | schema, forks, `stateHashFull`, `ensureEra`, era arguments, registry imports | none | 3 | all (slice) |
| 2 | M1 | S29 | M1 | damage vocabulary, pen pipeline, `power.js` terms | M0 | 2 | slice; Modern 1, Sci-Fi 1 |
| 3 | M3 | S30 | M3 | statuses (`N_SE` 24), unit fields, tint rows | M0 | 1 | all |
| 4 | M2 | S31 | M2 | burst, mag/reload, suppress, hitscan, homing, lead, `setup` gate, projectile kinds | M0 M1 M3 | 4 | slice; Modern 1 (reload) |
| 5 | M2b | S32 | M2b | targeting masks, role model, silent-default tables | M1 M2 M3 | 2.5 | slice; Medieval 1, Modern 1 |
| 6 | M15c | S45 | M15 | kit schema and lookup, `World({era})`, pacing record, mascot/intervention, GodPower interpreter with the six Ancient families, `rules.powers.disable/override`, WEATHER_KINDS rows, gravity multiplier | M0 | 1.5 | slice (P1); Medieval 9, Modern 4, Sci-Fi 1 (via M4) |
| 7 | M10 | S33 | M10 | lazy craters, `strike`, `bigQuery`, `markNavDirty`; STRIKE_KINDS rows `fire`, `gas`, `oil` added | M1 M2 | 3 | Medieval 2, Modern 2, Sci-Fi 2 (via M13a); Modern 5 (shells) |
| 8 | M13a | S38 | M13 | `ABILITY_SCHEMA`, banner/pinfield/recharge `aura`, bailout + spawn accounting (moved from M14), gas/smoke/trail, `call_strike`, `cc_field` stun/taunt, `dash` lunge/lance/bull_charge, `stance` pavise; events `banner_fall`, `unit_bailout` | M2b M3 M10 | 1.5 | Medieval 2 (colours), Modern 2 (via M9), Sci-Fi 2 (via M14) |
| 9 | M7 | S35 | M7 | layers, air AI, nav move classes, flow-field lanes | M2 M2b M3 M10 | 5 | Medieval 4 (via M12), Modern 2 (via M12), Sci-Fi 2 (hover); the air missions Medieval 9, Modern 7 |
| 10 | M12 | S36 | M12 | props as structures, gates, coalesced deaths, `editTerrain`, `prop_ignited` | M7 M10 | 3 | Medieval 4 (via M14), Medieval 5 (gates), Modern 2 (via M9) |
| 11 | M14 | S37 | M14 | objectives, `ScriptRunner`, counter engine, `passive` | M10 M12 **M13a** | 3 | Medieval 4 (charge), Modern 2 (cover) |
| 12 | M6a | S34 | M6a | heal/repair filters, `poison.proj` | M2b | 0.5 | Medieval 6 (healers) |
| 13 | M17e.eng | S46 | M17e | `react.js` selection, default table, `deathLinger` per rig, 27 causes closed | M1 M3 | 1 | Medieval: none (tail); Modern 4 and Sci-Fi 2 via M8 |
| 14 | M15r | S45 | M15 | strike family on the interpreter, lessons/barks completeness (`registry.verify` kit tables), arc/gravity test | M15c M2 M10 M14 | 1 | none (tail) = **E-FREEZE(Medieval)** |
| 15 | M9 | S40 | M9 | low cover, `inCover`, `lineOfFire`, reposition, smoke occluder | M2 M2b M12 M13a (M8 soft) | 2 | Modern 2/3 (cover, pin) |
| 16 | M17e.wreck | S46 | M17e | wreck props, `unit_wreck`, ttl/cap 24, reaction rows of the 8 new causes | M17e.eng M12 | 3 | Modern 4 (armour) |
| 17 | M8 | S39 | M8 | hull/turret/aim gate, `setup` AI rule, `resolveFace`, crew bailout, wreck seams, LOS-for-turret seam test | M1 M2 M7 M13a M17e.wreck | 3 | Modern 4, Sci-Fi 2 |
| 18 | M11 | S41 | M11 | `mine_*` hazards, `lay_mine`, `mine_immune` | M10 M12 M13a | 1 | Modern 6 (mines) |
| 19 | M8c | S39 | M8 | possession per class (sim side, WP-V3) | M8 | 1.25 | none (tail) |
| 20 | M15g.mod | S45 | M15 | god-power family `spawn_hazards` | M15r M11 | 0.5 | none (tail) = **E-FREEZE(Modern)** |
| 21 | M4 | S42 | M4 | regenerating shields, `lastProgressT` watchdog, `power.js` shield pool | M1 M3 M15c | 2 | Sci-Fi 1 (shield), 8 |
| 22 | M6b1 | S44 | M6b | EMP core: `cc_field emp`, EMP hard-disable, shield wipe | M3 M4 M6a M13a | 0.5 | Sci-Fi 5 (EMP) |
| 23 | M13b | S38 | M13 | `dash kind:'blink'` | M13a M12 | 0.75 | Sci-Fi 7 (blink) |
| 24 | M5 | S43 | M5 | cloak, detection, `visMul` | M2b M3 M13a | 2 | Sci-Fi 4 (cloak) |
| 25 | M6b2 | S44 | M6b | EMP x cloak cancel, air-machine descent, possession release, repair-filter cross tests | M6b1 M5 M8c | 0.5 | none (tail) |
| 26 | M15g.sf | S45 | M15 | god-power families EMP zone, shield refill | M15r M4 M6b1 M5 | 0.75 | none (tail) = **E-FREEZE(Sci-Fi) = S-FREEZE** |

**Edge reasons added or changed against `M.md` 3.2** (all others stay as written there, with M13 read as M13a, M8 as M8, M6b as M6b1):

| edge | reason (where it bites) |
|---|---|
| M0 -> M15c; M15c -> M4 | kit lookup needs the schema; the shield watchdog reads `kit.pacing` (core only) |
| M15c M2 M10 M14 -> M15r | gravity arc test uses a shell (M2); the strike family calls `w.strike` (M10); lessons for objectives (M14) |
| M15r M11 -> M15g.mod | `spawn_hazards` reuses the M11 trigger rule |
| M15r M4 M6b1 M5 -> M15g.sf | shield refill (M4), EMP pulse (M6b1), `cancelCloak` (M5) |
| M1 M3 -> M17e.eng; M17e.eng M12 -> M17e.wreck | `M.md` 3.2 "movable windows"; wrecks use `spawnProp` decor (M12) |
| M2b M3 M10 -> M13a | squad/AI rule of bailout, statuses of gas, private effect buffer `qbufFx` and `strike` |
| M13a M12 -> M13b | `ABILITY_SCHEMA` and cap; blink needs `nav.walkable` and shares `unit_blink` with pads (M12) |
| **M13a -> M14** (new) | the spawn accounting moved to M13a (LO-D11); the script `spawn` op reuses it |
| M2 M2b M12 M13a -> M9; **M8 -> M9 removed (soft)** | M2 `rangedReady`, `o.proj`; M2b `ai.cover`; M12 `cover:'low'`; M13a smoke. `M-layers.md` 3.10.4 puts the gate in `rangedBehaviour` before `startRanged`, 3.8.3 makes `aimOk` apply to turret defs only: the turret-LOS seam test lands with M8 |
| M1 M2 M7 M13a M17e.wreck -> M8 | `M-layers.md` 3.14: WP-V2 predecessors are WP-V1, M13, M17e |
| M8 -> M8c | WP-V3 predecessor is WP-V1 only |
| M3 M4 M6a M13a -> M6b1; M6b1 M5 M8c -> M6b2 | `M.md` M6b algorithm; cloak cancel needs M5; possession release on EMP needs per-class possession (`M-layers.md` 3.9.1) |

### 3.3 Session table and assumptions

| source | rows |
|---|---|
| `q2_schedule.md` Q9 SIM allocation (WPs of 1.7 h incl. gate and golden replay) | M7 5, M12 3, M14 3, M13 2, M10 3, M8 4, M9 2, M11 1, M4 2, M5 2, M6 1, M15b 2, M17 3 (33) plus the P1 chain of 15 (M0 M1 M2 M2b M3 M15a M17-basic) |
| this file (apportioning) | P1: M0 3, M1 2, M3 1, M2 4, M2b 2.5, M15c 1.5, M17e.eng 1 (= 15). M13a 1.5 + M13b 0.75. M6a 0.5, M6b1 0.5, M6b2 0.5. M8 3 + M8c 1.25. M15r 1 + M15g.mod 0.5 + M15g.sf 0.75. M17e.wreck 3 |

* **A-S1** The sub-sizes of the P1 chain and of every split are this document's apportioning of the quoted totals; SIM confirms or replaces them at the end of P1 (OI-1 of `M.md` 7) and `--check` is re-run (LO-STALE-RECOMMENDATION).
* **A-S2** Each extra landing costs +0.25 session over the proportional share (inert tests, refresh, ledger row). Total 49.25 against 48.0 in the plan: the cost of the splits is 1.25 sessions (about 2.1 h of serial SIM time).
* **A-S3** One session = 1.7 h serial SIM time; the order is invariant under `--sizes=layers` (M7 14, M8 4+2, M9 4; freezes 41.0 / 55.5 / 62.0, still green) and under +-30 percent jitter in 94.8 percent of 4000 samples (3.9).
* **A-M15** Missions need `M15c` only: god powers whose family is not yet implemented are greyed through `rules.powers.disable` (COORD accepted, MS H13), the closing step `M15r` (strike family, lessons/barks completeness) is not a playability prerequisite.

### 3.4 The recommended landing order

```
node tools/landing_order.mjs --md
```

| # | landing | S | sessions | cumulative |
|---|---|---|---|---|
| 1 | M0 | S28 | 3 | 3 |
| 2 | M1 | S29 | 2 | 5 |
| 3 | M3 | S30 | 1 | 6 |
| 4 | M2 | S31 | 4 | 10 |
| 5 | M2b | S32 | 2.5 | 12.5 |
| 6 | M15c | S45 | 1.5 | 14 |
| 7 | M10 | S33 | 3 | 17 |
| 8 | M13a | S38 | 1.5 | 18.5 |
| 9 | M7 | S35 | 5 | 23.5 |
| 10 | M12 | S36 | 3 | 26.5 |
| 11 | M14 | S37 | 3 | 29.5 |
| 12 | M6a | S34 | 0.5 | 30 |
| 13 | M17e.eng | S46 | 1 | 31 |
| 14 | M15r | S45 | 1 | 32 |
| 15 | M9 | S40 | 2 | 34 |
| 16 | M17e.wreck | S46 | 3 | 37 |
| 17 | M8 | S39 | 3 | 40 |
| 18 | M11 | S41 | 1 | 41 |
| 19 | M8c | S39 | 1.25 | 42.25 |
| 20 | M15g.mod | S45 | 0.5 | 42.75 |
| 21 | M4 | S42 | 2 | 44.75 |
| 22 | M6b1 | S44 | 0.5 | 45.25 |
| 23 | M13b | S38 | 0.75 | 46 |
| 24 | M5 | S43 | 2 | 48 |
| 25 | M6b2 | S44 | 0.5 | 48.5 |
| 26 | M15g.sf | S45 | 0.75 | 49.25 |

**Plumbing slice = #1..#6** (P1). **Windows** (`--windows`, one landing moved at a time; positions it may take with zero waivers, no DAG break, unchanged freezes): M10 7 (pinned), M13a 8..10, M7 8..9, M12 10 (pinned), M14 11..12, M6a 7..12, M17e.eng 13..14, M15r 13..14, M9 15..18, M17e.wreck 15..16, M8 17..18, M11 15..18, M8c 19..20, M15g.mod 19..20, M4 21 (pinned), M6b1 22..24, M13b 21..24, M5 21..24, M6b2 25..26, M15g.sf 25..26. COORD may reorder inside these windows without a re-decision; anything else needs `--check`.

**E-FREEZE definitions (replace plan 4 "Freezes" and `M.md` 3.2):**

| era | E-FREEZE landing | prefix | cumulative sessions (hours at 1.7 h) | plan v3.1 | landings after (inert tests) |
|---|---|---|---|---|---|
| Medieval | #14 M15r | #1..#14: M0 M1 M3 M2 M2b M15c M10 M13a M7 M12 M14 M6a M17e.eng M15r | 32.0 (54.4 h) | #13, 36.5 (62.1 h) | 12 (plan 6) |
| Modern | #20 M15g.mod | Medieval + M9 M17e.wreck M8 M11 M8c M15g.mod | 42.75 (72.7 h) | #16, 43.5 (74.0 h) | 6 (plan 3) |
| Sci-Fi | #26 M15g.sf = **S-FREEZE** | Modern + M4 M6b1 M13b M5 M6b2 M15g.sf | 49.25 (83.7 h) | #19, 48.0 (81.6 h) | 0 |

Sci-Fi's prefix contains three Modern-only landings it does not need (M9, M11, M15g.mod = 3.5 sessions): it waits for them because Modern freezes first (LO-D5). Medieval's required set is exactly its prefix (no unneeded landing). P3 of an era starts at its E-FREEZE landing; every later landing is declared inert for that era by `inert_<landing>_<era>` (18 tests, plan: 9). Cost of the order against the plan: Medieval 4.5 sessions earlier (7.7 h), Modern 0.75 earlier, Sci-Fi 1.25 later.

### 3.5 Margin table of the recommended order (R-M: >= 2 landings and >= 1.0 session)

`node tools/landing_order.mjs --md` (headline-first missions are the rows with a headline mechanic).

| era | mission | headline | last hard landing | cumulative sessions at it | margin landings | margin sessions | verdict |
|---|---|---|---|---|---|---|---|
| Medieval | 1 med_dress_rehearsal | brace | #5 M2b | 12.5 | 9 | 19.5 | PASS |
| Medieval | 2 med_tourney_trouble | colours | #8 M13a | 18.5 | 6 | 13.5 | PASS |
| Medieval | 3 med_ford_dithering | - | #8 M13a | 18.5 | 6 | 13.5 | (not headline-first) |
| Medieval | 4 med_mizzlemoor_beacons | charge | #11 M14 | 29.5 | 3 | 2.5 | PASS |
| Medieval | 5 med_castle_dour | gates | #11 M14 | 29.5 | 3 | 2.5 | PASS |
| Medieval | 6 med_bell_tolls_lunch | healers | #12 M6a | 30 | 2 | 2 | PASS |
| Medieval | 7 med_pennywhistle_blaze | - | #12 M6a | 30 | 2 | 2 | (not headline-first) |
| Medieval | 8 med_toll_bridge | - | #11 M14 | 29.5 | 3 | 2.5 | (not headline-first) |
| Medieval | 9 med_grand_pageant | air | #11 M14 | 29.5 | 3 | 2.5 | PASS |
| Modern | 1 mod_boot_camp_dropout | reload | #5 M2b | 12.5 | 15 | 30.25 | PASS |
| Modern | 2 mod_hedgerow_picnic | cover | #15 M9 | 34 | 5 | 8.75 | PASS |
| Modern | 3 mod_trench_pardon | pin | #15 M9 | 34 | 5 | 8.75 | PASS |
| Modern | 4 mod_bridge_too_far | armour | #17 M8 | 40 | 3 | 2.75 | PASS |
| Modern | 5 mod_rail_yard_fireworks | shells | #11 M14 | 29.5 | 9 | 13.25 | PASS |
| Modern | 6 mod_switchboard_hold | mines | #18 M11 | 41 | 2 | 1.75 | PASS |
| Modern | 7 mod_airfield_open_day | air | #11 M14 | 29.5 | 9 | 13.25 | PASS |
| Modern | 8 mod_harbour_tour | - | #17 M8 | 40 | 3 | 2.75 | (not headline-first) |
| Modern | 9 mod_dam_finale | - | #18 M11 | 41 | 2 | 1.75 | (not headline-first) |
| Sci-Fi | 1 sf_lunch_break | shield | #21 M4 | 44.75 | 5 | 4.5 | PASS |
| Sci-Fi | 2 sf_floor_lava | hover | #21 M4 | 44.75 | 5 | 4.5 | PASS |
| Sci-Fi | 3 sf_overclock_oops | - | #21 M4 | 44.75 | 5 | 4.5 | (not headline-first) |
| Sci-Fi | 4 sf_express_delivery | cloak | #24 M5 | 48 | 2 | 1.25 | PASS |
| Sci-Fi | 5 sf_turn_it_off | emp | #22 M6b1 | 45.25 | 4 | 4 | PASS |
| Sci-Fi | 6 sf_grand_reopening | - | #25 M6b2 | 48.5 | 1 | 0.75 | (not headline-first) |
| Sci-Fi | 7 sf_blink_jungle | blink | #23 M13b | 46 | 3 | 3.25 | PASS |
| Sci-Fi | 8 sf_noise_complaint | strike | #21 M4 | 44.75 | 5 | 4.5 | PASS |
| Sci-Fi | 9 sf_queen_size | - | #25 M6b2 | 48.5 | 1 | 0.75 | (not headline-first) |

**Baseline, same rule, plan v3.1 order** (`--baseline`): **6 waivers**: Medieval 9 air (1 landing / 4 sessions: M15 at #12), Modern 2 cover and 3 pin (1 / 1: M9 at #15), Modern 6 mines (0 / 0), Sci-Fi 4 cloak (1 / 0.5), Sci-Fi 5 EMP (0 / 0). Under MS C07 as written (>= 1 landing) the baseline has the two waivers MS predicted (Modern 6, Sci-Fi 5). The recommended order has **0 waivers**; the tail construction is visible in the table: the mission that owns the last headline landing of an era has exactly the tail as its margin (Medieval healers 2 / 2.0, Modern mines 2 / 1.75, Sci-Fi cloak 2 / 1.25).

**Honest differences against the plan:** Sci-Fi cloak lands at cumulative 48.0 (plan 47.5, 0.5 session later) but with margin 2 / 1.25 instead of 1 / 0.5; Sci-Fi as a whole freezes 1.25 sessions later (split overhead); the Sci-Fi shield missions run at cumulative 44.75 (plan 45.5), EMP at 45.25 (plan 48.0), blink at 46.0 (plan 29.0, 17 sessions later because M13b leaves the Medieval and Modern prefixes; margin 3 / 3.25 still holds).

### 3.6 Why these five splits (seven extra landings) are real (edge evidence)

1. **M13a / M13b.** `M.md` 3.10 M13 lists independent parameter groups; blink (`dash kind:'blink'`) needs only nav walkability and has one consumer family (Sci-Fi Notary, mission 7, puzzle `sf_pz_gap_year`); `call_strike` has four (castellan, signal officer, Deputy Director, Housekeeper). The Medieval request to "pull M13 earlier because it depends only on M0" has a false premise (edges `M2b M3 M10 -> M13`), but M13a does not depend on M7 M12 M14, which is what the request needs.
2. **M6b1 / M6b2.** `M.md` 3.10 M6b: "cancel CLOAK" needs M5, "air machines descend" needs M7, possession release needs per-class possession (`M-layers.md` 3.9.1); stun, shield wipe and the machine filter (already in M6a) do not.
3. **M8 / M8c.** `M-layers.md` 3.14: WP-V3 (possession, sim side) has predecessor WP-V1 only; no mission needs possession.
4. **M15c / M15r / M15g.mod / M15g.sf.** `M.md` D-M20 (two steps) plus the god-power sets: Modern slot 3 `spawn_hazards` needs M11, Sci-Fi slot 5 needs EMP and `cancelCloak` (M6b1, M5), slot 4 `u.sh = shMax` needs M4 (`design/*/god_powers.md`).
5. **M17e.eng / M17e.wreck.** `M.md` 3.2: the engine depends only on M1 and M3; wrecks use the `spawnProp` decor path (M12).

### 3.7 Search evidence

| search | result |
|---|---|
| exhaustive blocks, era order Medieval < Modern < Sci-Fi, beam 60 | block 1: 8 landings, 168 legal orders; block 2: 6 landings, 3600 legal extensions scored over the 60 kept prefixes; block 3: 6 landings, 2160; best key `[0 hard, 0 waivers, 230.75, 380.5, 18]` = the literal order of 3.4 |
| exhaustive blocks, Medieval < Sci-Fi < Modern | block 2: 9 landings, 89 100 legal extensions scored over the kept prefixes; best key `[0, 1 waiver (Modern mines 1 / 0.5), 236.75, 370.5, 15]`: Sci-Fi freezes at 45.75 (3.5 earlier), Modern at 49.25 (6.5 later), Modern has no tail |
| free hill climb (16 climbs x 6000 moves, seeded, from both block results and the literal) | best key equals the literal key; no strictly better order found |
| plan v3.1 order, same scorer | 6 waivers (3.5) |
| the design requests, scored on the 19-module DAG (`--variants`) | below |
| `--margin-sess=2.0` (stricter floor) | 2 waivers: Modern 6 mines (1.75), Sci-Fi 4 cloak (1.25) |
| `--margin-land=3` | 3 waivers: Medieval 6 healers, Modern 6 mines, Sci-Fi 4 cloak (each has exactly 2 landings of tail) |
| `--robust=4000` (every session estimate x U(0.7, 1.3)) | R-M holds for all headline-first missions in 94.8 percent of samples; the only mission that ever fails is Sci-Fi 4 cloak (its tail is 1.25 sessions) |

| variant (plan v3.1 DAG, 19 modules) | DAG | waivers (landings / sessions) | Medieval freeze | Modern freeze | Sci-Fi freeze |
|---|---|---|---|---|---|
| V0 plan as written | green | 6: Med 9 (1/4), Mod 2 (1/1), Mod 3 (1/1), Mod 6 (0/0), SF 4 (1/0.5), SF 5 (0/0) | #13 (36.5) | #16 (43.5) | #19 (48) |
| V1 Medieval request: M13 right after M10 | green | same 6 | #13 | #16 | #19 |
| V2 Modern R1 as asked: M9 right after M2b | **RED x3** (M9 needs M2 M8 M12 M13) | 7 | #14 | #16 | #19 |
| V3 Modern R1 earliest legal (M8 M9 right after M13) | green | 5 (Med 9, Mod 4, Mod 6, SF 4, SF 5) | #15 (42.5, +6 sessions) | #16 | #19 |
| V4 Modern R2 literally (M11 immediately before M8) | green | 7: Mod 2 and 3 fall to 0/0, Mod 4 to 1/2, Mod 6 stays 0/0 | #13 | #16 | #19 |
| V5 R1 legal + R2 ahead of M15 M17e | green | 7 | #16 (43.5, +7) | #16 | #19 |
| V6 Sci-Fi swap (M6b before M5) | green | 6: SF 4 cloak 0/0, SF 5 EMP 1/2.0 | #13 | #16 | #19 |
| V8 recommended (26 landings) | green | **0** | #14 (32.0) | #20 (42.75) | #26 (49.25) |

Reading: no reordering of the 19 modules removes more than one waiver; every request that helps one era either breaks the DAG or hurts the Medieval freeze by 6 to 7 sessions. What removes the waivers is the **split plus the tail**: the last two landings of every era are landings that no headline-first mission needs.

### 3.8 Answers to every request about module order (decision per request)

| request (source) | decision | where / why |
|---|---|---|
| Medieval: pull M13 earlier, "depends only on M0" (`arenas.md` note (a), `missions_outline.md` 1.2 row 2 and 6.1, `rosters.md` 5) | **ACCEPT, premise corrected** | M13a lands #8, directly after M10 (earliest legal: edges M2b M3 M10); missions 2 and 3 become runnable at cumulative 18.5 (plan 29.0, 10.5 sessions earlier), mission 4 at 29.5 (needs M14); the accounting moves from M14 to M13a (LO-D11) so bailout does not wait for M14 |
| Medieval: "the plumbing slice only has the first five modules" | **ACCEPT as is** | the plumbing slice stays #1..#6 (mission 1 only, needs M0 M2b); missions 2 to 4 run through `campaign_play` as preview runs from #8 and #11 (S-slice SL-D15 preview reviews) |
| Medieval: `call_strike kind:'oil'`, `cc_field stun`, `stance pavise`, `dot_cloud trail`, `dash lance/bull_charge` (`rosters.md` 5) | **ACCEPT** in M13a (oil: STRIKE_KINDS row added to M10 with `fire`, `gas`, MS H7) | 3.10 MED-1..MED-9 |
| Medieval: M9 (air) margin 1 in the plan | fixed | margin 3 / 2.5 (M15 token = M15c, A-M15) |
| Modern R1: M9 right after M2b, "needs only M0 M1 M3 M2 M2b and the cover field" | **REJECT as written, ACCEPT corrected** | `cover:'low'` and `propBlocks` are M12, smoke is M13a, LOS needs `info.los` of M2b: M9 lands #15, the first landing after the Medieval freeze, 8.5 sessions earlier than the plan (cumulative 34 against 42.5); margin 5 / 8.75 (plan 1 / 1) |
| Modern R2: M11 before M8 | **REJECT** | mission 6 needs M8 and M9 as hard modules, so M6 stays at 0 margin and armour (mission 4) loses margin (V4); replaced by the tail: M11 #18, then M8c and M15g.mod; margin 2 / 1.75 |
| Modern: "M6 content is written against the mine contract and first runs at the mechanic slice" (fallback) | **no longer needed** | mission 6 runs at cumulative 41.0, 1.75 sessions before the Modern freeze |
| Sci-Fi R1: split M6b so stun and bubble wipe land after M4 | **ACCEPT** | M6b1 #22 directly after M4 #21; M6b2 #25; EMP mission 5 margin 4 / 4.0 (plan 0 / 0) |
| Sci-Fi alternative: swap #18 and #19 (`feel_sheet.md` 14.1) | **REJECT** | V6: zero margin moves to cloak, EMP keeps 1 landing |
| Sci-Fi open question 1 / MS A16 / OI-MS6 / `S-slice` OI-SL4 (log the three waivers, decide R1/R2, decide the Sci-Fi-last schedule risk) | **closed** | no waiver needs logging in `cuts.md` under R-M; the reorder was requested and done; Sci-Fi volume is still last (mechanic slice request at #26, cumulative 49.25) |
| Sci-Fi: shield mission 1 and 7 of 9 missions list M4 (#17 in the plan) | note | M4 #21; Sci-Fi mission 1 runnable at cumulative 44.75 (plan 45.5), margin 5 / 4.5; the plumbing slice still runs it with inert bubbles (S-slice 3.2.2) |
| `q3_program` residual 1: M15 and M17e core before #6 | **PARTLY** | M15c is #6 (P1); M17e.eng is #13, not earlier: pulling it to #7 costs a Medieval waiver (healers 1 / 1.0, NC-LO10) because it is half of the Medieval tail; ANIM-CLIPS builds the reaction tables against the `M.md` 3.10 contract and verifies them from #13 (OI-LO11) |
| `q3_product` 31 / MS PC-2: unit of the margin | **answered** | LO-D2 |

### 3.9 Waivers

**None are required** by R-M for the recommended order (`WAIVERS_ON_FILE` is empty; `--check` fails if one appears).

**Conditional (decided now, not silently):**
1. *Estimate risk.* Sci-Fi 4 cloak is the only margin that is thin (2 landings, 1.25 sessions; 94.8 percent robust). If SIM's end-of-P1 sizes shrink `M6b2 + M15g.sf` below 1.0 session, the tool turns red (`LO-WAIVER`) and COORD either moves M5 earlier inside its window (21..24, which hands the thin margin to the next headline landing) or files `marginWaiver` for sf_express_delivery in `cuts.md` with the fallback "cloak first runs at the mechanic slice".
2. *Finales.* Sci-Fi 6 and 9 have 1 landing / 0.75 session (they teach nothing new and run when M6b2 lands). They are outside R-M (LO-D16). If COORD extends R-M to every mission, those two need waivers (OI-LO10).
3. *If COORD refuses the splits* (stays on the 19-module plan), the six waivers of 3.5 stand; with MS C07 at >= 1 landing the two predicted ones (Modern 6 mines, Sci-Fi 5 EMP) stand.

### 3.10 Parameter blessings: which landing owns each request

Generated by `node tools/landing_order.mjs --blessings --md`; "owning landing" is the hand-back whose tests prove the semantics, "declared by" a landing that only declares the key. Every request lands at or before the E-FREEZE of the era that uses it (`LO-BLESSING`). Fallbacks are those of the design files; none is activated by the order.

| id | era | request | owning landing (position) | declared by | units | fallback |
|---|---|---|---|---|---|---|
| F1 | scifi | aura effect recharge (ally shield delay x0.2, regen x3) | M4 (#21) | M13a | bubble_tender | heal_pulse variant refilling shields 8/s |
| F2 | scifi | SHIELDDOWN break window 2.0 s, optional breakWindow.dmgTakenMul | M4 (#21) | M3 | all shields | plain delay doubling, wireframe tell kept |
| F3 | scifi | boss EMP stun cap 2.0-2.5 s as cc_field emp data | M6b1 (#22) | M13a | rustbucket_rex, grand_concierge | uniform 3.0 s with a boss armour penalty |
| F4 | scifi | detect radius def key, tag detector, no cloaked unit in the first 6 s | M5 (#24) | M2b | spritz_medic, valet_drone, glow_grazer, silent_signer | detector tag with fixed 10 u |
| F5 | scifi | cc_field effect taunt | M13a (#8) | M13a | greeter_unit | plain blocker |
| F6 | scifi | dash lunge params (6 u, x1.5, cd 7) | M13a (#8) | M13a | wrench_runner | charge via the charge AI |
| F7 | scifi | point-blank ranged {hitscan, aoe, groundOnly} as a stomp ring | M10 (#7) | M2 | rustbucket_rex, elder_hummock | melee knock-back only |
| F8 | scifi | armorFace on non-vehicle defs | M8 (#17) | M1 | rustbucket_rex, grand_concierge, hive_queen | plain armour, scripted note |
| F9 | scifi | summon_on_death brood (existing params) | existing code | - | hive_queen | none needed |
| F10 | scifi | dot_cloud gas (slow 30 percent + poison 3 dps, r4, 4 s) | M13a (#8) | M13a | spore_shepherd, spore pod prop | poison only |
| F11 | scifi | call_strike from a unit: 1.2 s channel, 2.0 s ring, cancel on caster death, range 40 | M13a (#8) | M10 | grand_housekeeper | no cancel, ring remains |
| F12 | scifi | poison.proj on arc globs and a strafing-line aoe | M6a (#12) | M10 | acid_spitter, glidewing, hive_queen | single-target poison dart |
| F13 | scifi | air-layer cloak (6 s on, 10 s off) | M5 (#24) | M7 | void_manta | shield and shadow only |
| F14 | scifi | bailout driver spawn excluded from startCount/startCost | M13a (#8) | M13a | junk_buggy | the buggy just dies |
| F15 | scifi | hitscan lock-line telegraph event for the rail | M2 (#4) | M2 | silent_signer, maitre_deluxe | ground ring for 1.1 s |
| F16 | scifi | mech topple death clip, ground_shake event, wreck prop | M17e.wreck (#16) | M17e.eng | rustbucket_rex, grand_concierge | stagger death |
| F17 | scifi | hover-layer drones attackable by melee and ground shooters | M7 (#9) | M2b | spritz_medic, valet_drone, shush_bike, dustpan_hover | none (roster fails S11 otherwise) |
| F18 | scifi | energy ap .5, bullet ap 0, explosive ap .3, structure multiplier rows | M1 (#2) | M12 | all | energy ap .3 |
| MED-1 | medieval | aura banner {dmg, lossMul, radius, fall:{r, shock}} | M13a (#8) | M13a | standard_bearer, ser_valiant, reeve, castellan, abbess | aura rally + officer shock x1.5 |
| MED-2 | medieval | summon_on_death bailout {unit, hpFrac, getup}, multi-spawn list, accounting exclusion | M13a (#8) | M13a | knight_errant, rolling_keep, coin_golem | one unit type x N |
| MED-3 | medieval | call_strike kind oil | M13a (#8) | M10 | castellan | dot_cloud fire |
| MED-4 | medieval | cc_field effect stun | M13a (#8) | M13a | bellringer, abbess | scare |
| MED-5 | medieval | stance kind pavise | M13a (#8) | M13a | pavise_bearer | shield block .90 |
| MED-6 | medieval | dot_cloud trail:true | M13a (#8) | M13a | plague_cart | one cloud every 20 s |
| MED-7 | medieval | heal_pulse organic filter, poison.proj, NOHEAL | M6a (#12) | M6a | physician, abbess, apothecary, plague_cart | none (headline) |
| MED-8 | medieval | mag/reload, arc high, air, groundOnly, structDmg, volley, minRange | M2 (#4) | M10 | crossbowman, trebuchets, springald, mangonel, longbowman | none (headline) |
| MED-9 | medieval | dash kinds lance, bull_charge | M13a (#8) | M13a | ser_valiant, great_hog | existing dash |
| MED-10 | medieval | projectile kind dragonfire (fireball volley of 3, aoe 3.5, ignite) | M2 (#4) | M10 | cinderwyrm | single fireball |
| MED-11 | medieval | air layer and boss landing rule | M7 (#9) | M7 | wyvern, cinderwyrm | hp trigger plus unhittable-remnant rule |
| MED-12 | medieval | gate ownership, structDmg, explosive props, editTerrain | M12 (#10) | M10 | props, arenas | none (headline) |
| MED-13 | medieval | script strike gas/fire and a status payload (M9 coda pause) | M14 (#11) | M10 | med_pennywhistle_blaze, med_bell_tolls_lunch, med_grand_pageant | render-only pause |
| MOD-1 | modern | weapon kit burst, mag/reload, suppress, hitscan, homing, lead, air/groundOnly, muzzle, clip | M2 (#4) | M2 | tin_hat_trooper and the rifle line | none (headline) |
| MOD-2 | modern | setup (crew weapons) in the firing gate | M8 (#17) | M2 | mortar_pair, filing_howitzer, tripod_mg_team | none |
| MOD-3 | modern | turret, armorFace, hull faces movement | M8 (#17) | M8 | biscuit_tank, teapot_heavy, lunchbox_apc | none (mission 4 is the mechanic) |
| MOD-4 | modern | call_strike telegraph 2.2 s, pending list | M13a (#8) | M10 | signal_officer, deputy_director | script strike |
| MOD-5 | modern | aura banner (Spot aura) | M13a (#8) | M13a | spotter_balloon | aura rally |
| MOD-6 | modern | bailout (APC crew) | M13a (#8) | M13a | lunchbox_apc | APC just dies |
| MOD-7 | modern | smoke as a dot_cloud kind | M13a (#8) | M10 | signal_officer | no smoke (cut ladder rung 5) |
| MOD-8 | modern | lay_mine (<= 4 live, arm 3 s, x1.5 vs vehicles), mine_immune | M11 (#18) | M13a | caution_sapper, dozer_plough | none (never cut) |
| MOD-9 | modern | heal_pulse organic / machine filters | M6a (#12) | M6a | site_first_aider, spanner_mechanic | none |
| MOD-10 | modern | aura pinfield (new effect value inside aura) | M13a (#8) | M2 | chief_spokesperson, broadcast_behemoth | confuse pulse alone |
| MOD-11 | modern | god-power family spawn_hazards (R-GP1) | M15g.mod (#20) | M11 | god power slot 3 | zone_quake rolling barrage |
| MOD-12 | modern | R3 group override passive:true | M14 (#11) | M2b | fishbowl_chopper (mission 6 cameo) | armed-off chopper |
| MOD-13 | modern | R5 arena.hazards[].team (pre-laid friendly mines) | M11 (#18) | M12 | mission 6 | lay_mine only |
| MOD-14 | modern | R6 script event kinds; R7 capture with live ownership (MS A3) | M14 (#11) | M14 | missions 2-5, 9 | none |
| SF-R2 | scifi | M14 ops order {group, order} and kill {def or tag, within, cause} | M14 (#11) | M14 | sf_overclock_oops, sf_grand_reopening, sf_queen_size | timer-based fallbacks |
| SF-R6 | scifi | M14 triggers hp_frac on prop/unit, prop_destroyed by type | M14 (#11) | M12 | sf_overclock_oops, sf_blink_jungle, sf_queen_size | timer-based spawns |
| SF-R7 | scifi | WEATHER_KINDS ember_ion, neon_rain, spores with rows | M15c (#6) | M0 | sf_floor_lava, sf_overclock_oops | map to ash, rain, fog |
| MS-H1/H3 | all | ScriptRunner ops order/kill, spawn.free/unique, triggers, counter-rule engine | M14 (#11) | M14 | every mission with events | per-mission tracker |
| MS-H4 | modern | world counters cover_unit_ticks, unit_ticks | M9 (#15) | M9 | mod_trench_pardon star 3 | usedMechanic cover |
| MS-H5a | all | unit_hit payload += ap armor face | M1 (#2) | M1 | armour counters | mechanic cut |
| MS-H5b | all | events banner_fall, unit_bailout | M13a (#8) | M13a | colours, bailout counters | mechanic cut |
| MS-H6 | medieval | event prop_ignited | M12 (#10) | M12 | med_pennywhistle_blaze, med_toll_bridge | set-piece on a timer |
| MS-H7 | medieval | STRIKE_KINDS rows fire, gas (and oil) | M10 (#7) | M10 | med_bell_tolls_lunch, med_pennywhistle_blaze | shell with visual substitution |
| MS-H9 | medieval | burning props and oil kill with cause fire | M12 (#10) | M10 | fire_kill star | burnKills dropped |
| MS-H10 | all | spawn accounting (moved from M14 to M13a, LO-D11) | M13a (#8) | M13a | stars 2/3 of missions with bailout or reinforcements | none |
| MS-H11 | all | passive units | M14 (#11) | M2b | med_pennywhistle_blaze, mod_switchboard_hold | cameo dropped |
| ALL-R3/R4 | all | rules.powers.disable[] and override{} | M15c (#6) | M15c | Modern 1-6, Sci-Fi 1-4, Medieval 4 | none (accepted) |
| GP-EMP | scifi | god power slot 5 EMP zone with shieldZero and cancelCloak | M15g.sf (#26) | M6b1 | slot 5 | slot 5 disabled until landed |
| GP-SHIELD | scifi | god power slot 4 shield refill | M15g.sf (#26) | M4 | slot 4 | heal only |

SIM must still bless F7 (hitscan with `aoe`) and F12 (a line-shaped area for the strafing globs); neither is in `M.md` today. Both have the design fallback above and neither changes the order (OI-LO12).

### 3.11 Amendments (patch text for COORD)

**A. `plan.md`.**
* **A1, section 4 table (lines 75-95)**: replace the 19-row table by the 26 rows of 3.4 with the columns `# | landing | module | content | S | needed by`. Row contents are the "contents" column of 3.2; "needed by" lists the eras whose required set contains the landing (`landing_order --json`, field `required`): all three eras for #1..#14, Modern and Sci-Fi for #16 #17 #19, Modern only for #15 #18 #20 (Sci-Fi waits for them, 3.4), Sci-Fi only for #21..#26; `plan_lint` PL10 compares the table with the `modules` block.
* **A2, section 4 intro (line 73)**: append "The DAG has 26 landing nodes (19 modules, M13 M6b M8 M15 M17e split); `spec/landing_order.md` holds the order, the margin rule and the tool `tools/landing_order.mjs` that checks it."
* **A3, section 4 "Freezes" paragraph (line 99)**: replace "Medieval = #1..#13 (...), Modern = #1..#16 (adds M8 M9 M11), Sci-Fi = #1..#19 (adds M4 M5 M6b) = S-FREEZE" by "E-FREEZE(era) = the landing of the last member of the era's required set; as ordered: Medieval = #1..#14 (M0 M1 M3 M2 M2b M15c M10 M13a M7 M12 M14 M6a M17e.eng M15r), Modern = #1..#20 (adds M9 M17e.wreck M8 M11 M8c M15g.mod), Sci-Fi = #1..#26 (adds M4 M6b1 M13b M5 M6b2 M15g.sf) = S-FREEZE." Keep the rest of the paragraph; the inert-test sentence now yields 18 tests.
* **A4, section 8 curve rule (line 122)**: replace "a headline mechanic's first mission has `requiresModules` landed >= 1 week-equivalent (stated margin) before E-FREEZE" by "a headline mechanic's first mission has its `requiresModules` closure landed at least 2 landings and 1.0 SIM session before E-FREEZE (R-M, `spec/landing_order.md` LO-D2)".
* **A5, section 12 P1 row (line 152)**: "SIM #1-#5 (M0 incl. plumbing part of M15, M1, M3, M2, M2b)" becomes "SIM #1-#6 (M0, M1, M3, M2, M2b, M15c)"; P2 row (line 153): "SIM #6-#19 in landing order" becomes "SIM #7-#26"; "Medieval after M13/M17e = #13" becomes "Medieval after M15r = #14", "Modern after M11 = #16" becomes "after M15g.mod = #20", "Sci-Fi after M6b = #19" becomes "after M15g.sf = #26".
* **A6, section 14 row `spec/M`**: "(19 modules, DAG ...)" becomes "(19 modules in 26 landings, DAG ...)"; add a row `spec/landing_order` (owner DESIGN-SIM with COORD, reviewer REVIEWER, depends on M, M-layers, MS, S-slice, acceptance `node tools/landing_order.mjs --check && --selftest`, final).
* **A7, section 13**: no change (no ladder rung moves). Rung 5 notes: M17e.wreck is now outside the Medieval prefix.

**B. `spec/M.md`.**
* **B1** D-M1: "Landing order is the 26-landing table of `landing_order.md` 3.4; the DAG (3.2) is the truth, the numeric position is a schedule. Acceptance compares landing sets and E-FREEZE sets." D-M2: "E-FREEZE(era) is the landing of the last member of the era's required set; prefixes: Medieval #1..#14, Modern #1..#20, Sci-Fi #1..#26." D-M20: "M15 is one module (S45) with four landings: M15c (P1), M15r, M15g.mod, M15g.sf; there is no `M15a`/`M15b` name." D-M21: add "M17e lands as M17e.eng and M17e.wreck".
* **B2** 3.2 `modules` block: replace by this block (the output of `landing_order --block`; fields `mod`, `sess`, `p1` are new, `id`, `S`, `pos`, `deps` keep their meaning, `pos` is the position in 3.4):

```landings
[{"id":"M0","mod":"M0","S":"S28","pos":1,"deps":[],"sess":3,"p1":true},{"id":"M1","mod":"M1","S":"S29","pos":2,"deps":["M0"],"sess":2,"p1":true},{"id":"M3","mod":"M3","S":"S30","pos":3,"deps":["M0"],"sess":1,"p1":true},{"id":"M2","mod":"M2","S":"S31","pos":4,"deps":["M0","M1","M3"],"sess":4,"p1":true},{"id":"M2b","mod":"M2b","S":"S32","pos":5,"deps":["M1","M2","M3"],"sess":2.5,"p1":true},{"id":"M15c","mod":"M15","S":"S45","pos":6,"deps":["M0"],"sess":1.5,"p1":true},{"id":"M10","mod":"M10","S":"S33","pos":7,"deps":["M1","M2"],"sess":3,"p1":false},{"id":"M13a","mod":"M13","S":"S38","pos":8,"deps":["M2b","M3","M10"],"sess":1.5,"p1":false},{"id":"M7","mod":"M7","S":"S35","pos":9,"deps":["M2","M2b","M3","M10"],"sess":5,"p1":false},{"id":"M12","mod":"M12","S":"S36","pos":10,"deps":["M7","M10"],"sess":3,"p1":false},{"id":"M14","mod":"M14","S":"S37","pos":11,"deps":["M10","M12","M13a"],"sess":3,"p1":false},{"id":"M6a","mod":"M6a","S":"S34","pos":12,"deps":["M2b"],"sess":0.5,"p1":false},{"id":"M17e.eng","mod":"M17e","S":"S46","pos":13,"deps":["M1","M3"],"sess":1,"p1":false},{"id":"M15r","mod":"M15","S":"S45","pos":14,"deps":["M15c","M2","M10","M14"],"sess":1,"p1":false},{"id":"M9","mod":"M9","S":"S40","pos":15,"deps":["M2","M2b","M12","M13a"],"sess":2,"p1":false},{"id":"M17e.wreck","mod":"M17e","S":"S46","pos":16,"deps":["M17e.eng","M12"],"sess":3,"p1":false},{"id":"M8","mod":"M8","S":"S39","pos":17,"deps":["M1","M2","M7","M13a","M17e.wreck"],"sess":3,"p1":false},{"id":"M11","mod":"M11","S":"S41","pos":18,"deps":["M10","M12","M13a"],"sess":1,"p1":false},{"id":"M8c","mod":"M8","S":"S39","pos":19,"deps":["M8"],"sess":1.25,"p1":false},{"id":"M15g.mod","mod":"M15","S":"S45","pos":20,"deps":["M15r","M11"],"sess":0.5,"p1":false},{"id":"M4","mod":"M4","S":"S42","pos":21,"deps":["M1","M3","M15c"],"sess":2,"p1":false},{"id":"M6b1","mod":"M6b","S":"S44","pos":22,"deps":["M3","M4","M6a","M13a"],"sess":0.5,"p1":false},{"id":"M13b","mod":"M13","S":"S38","pos":23,"deps":["M13a","M12"],"sess":0.75,"p1":false},{"id":"M5","mod":"M5","S":"S43","pos":24,"deps":["M2b","M3","M13a"],"sess":2,"p1":false},{"id":"M6b2","mod":"M6b","S":"S44","pos":25,"deps":["M6b1","M5","M8c"],"sess":0.5,"p1":false},{"id":"M15g.sf","mod":"M15","S":"S45","pos":26,"deps":["M15r","M4","M6b1","M5"],"sess":0.75,"p1":false}]
```

  The block keeps the fence tag `modules` in `M.md` (consumers `tools/ms_context.mjs parseModules`, `tests/sim/dag.test.mjs`, `tools/perf_budget.mjs` read that tag).
* **B3** 3.2 E-FREEZE paragraph: the table of 3.4; delete "Movable windows (core steps)" (superseded: M15c and M17e.eng are real landings at #6 and #13).
* **B4** 3.2 edge table: add the rows of 3.2 "Edge reasons added or changed"; rename `M13`->`M13a`, `M6b`->`M6b1` in existing rows; delete the row "M2,M8,M12,M13 -> M9" and add "M2 M2b M12 M13a -> M9 (M8 soft)".
* **B5** 3.10 blocks: M13 block becomes **M13a** (add the "Accounting" paragraph of the M14 block verbatim, keep `ABILITY_SCHEMA`, bailout, banner, gas/smoke, `call_strike`, stun/taunt, lunge/lance/bull_charge, pavise; events `banner_fall`, `unit_bailout`; S38 sub-check `S38/M13a`) and **M13b** (blink only; `S38/M13b`); M14 block: delete the Accounting paragraph, add "consumes the accounting of M13a"; M6b block becomes M6b1 (`cc_field emp`, EMP hard-disable, shield wipe) and M6b2 (cloak cancel, air descent, possession release, repair cross tests); M8 pointer: landings M8 (WP-V1 + WP-V2) and M8c (WP-V3); M15 block: four landings (c: items marked core in 3.2 "movable windows"; r: strike family on the interpreter, lessons/barks completeness, arc test; g.mod; g.sf); M17e block: M17e.eng and M17e.wreck; M10 block: STRIKE_KINDS gains rows `fire` (fire patch), `gas` (gas cloud via `dot_cloud`) and `oil` (MS H7, MED-3). Criterion S ids stay S28..S46; a split S is green when every part sub-check `S38/M13a`, `S38/M13b`, `S39/M8`, `S39/M8c`, `S44/M6b1`, `S44/M6b2`, `S45/M15c`, `S45/M15r`, `S45/M15g.mod`, `S45/M15g.sf`, `S46/M17e.eng`, `S46/M17e.wreck` is green.
* **B6** 3.13 `budget` block: replace by the second line printed by `landing_order --block` (26 rows; sums 0.50 and 0.80); the prefix sums of X2 become **Medieval 0.35 / 0.56, Modern 0.45 / 0.71, Sci-Fi 0.50 / 0.80** (were 0.36/0.45/0.50 and 0.57/0.71/0.80); `node tools/landing_order.mjs --budget` prints them.
* **B7** 3.14 inertness: replace the era lists by "Medieval (12): M9 M17e.wreck M8 M11 M8c M15g.mod M4 M6b1 M13b M5 M6b2 M15g.sf; Modern (6): M4 M6b1 M13b M5 M6b2 M15g.sf".
* **B8** Section 4: X1 "the block has the 26 ids, every `S28..S46` appears and the rows with the same S form its part set; every dep has a smaller pos; the three E-FREEZE sets are the prefixes of 3.4"; X2 prefix sums as B6; X6 "x 18"; add row **X10 `landing_order`**: `node tools/landing_order.mjs --check` (T-fast), negative controls `--selftest`.
* **B9** Section 6: add PC-LO1..PC-LO9 of 6; section 7: OI-LO items that name SIM.

**C. `spec/M-layers.md`.** 3.14 table: WP-V1 and WP-V2 form landing **M8**; WP-V3 is landing **M8c**; WP-V4 (app side) is unchanged. WP-V2 predecessors: `WP-V1, M13a, M17e.wreck`. WP-C1 predecessors: `M12, M13a` (WP-V1 removed); add to WP-V1: "seam test `m15_cover/turret_los`: a turret def is gated by `lineOfFire` at the `aimOk` gate" (runs at the M8 landing); D-L24 and 3.10.4 unchanged. 3.13 "Counts (M7 5, M8 4, M9 2)" unchanged.

**D. `spec/S-slice.md`.** Line 78: "Everything else (M10, M6a, ...)" keep, add "M15c is in the slice (SL-D05, 3.2.2)". Lines 234 and 239: "modules required (names)": Medieval `M0 M1 M3 M2 M2b M15c M10 M13a M7 M12 M14 M6a M17e.eng M15r`; Modern `the Medieval set plus M9 M17e.wreck M8 M11 M8c M15g.mod`; Sci-Fi `the Modern set minus M9 M11 M15g.mod, plus M4 M6b1 M13b M5 M6b2 M15g.sf` (Sci-Fi never needs M9 or M11; the request is still allowed only at #26 because the Sci-Fi prefix contains them). "Medieval: the Medieval prefix through M17e; Modern: through M11; Sci-Fi: through M6b" becomes "through M15r (#14); through M15g.mod (#20); through M15g.sf (#26)". 3.8.6 and OI-SL4: closed by `landing_order.md` 3.8.

**E. `spec/MS.md`, `spec/CU.md`, the three `missions.json`.**
* **E1** MS 3.8 C07: "margin = eFreeze.position - max(position of the closure of the hard landings)" with positions from the `modules` block; required `>= 2` landings and `>= 1.0` session (`sess` column); a headline-first mission below that needs `marginWaiver`. PC-2: add "R-M of `landing_order.md` LO-D2". MS 3.9 `eFreeze` values: `{medieval:14, modern:20, scifi:26}` (written by `ms_context`).
* **E2** `requiresModules`/`softModules` tokens are landing ids. CAMPAIGN-x applies this rewrite in the same commit as B2 (`node tools/landing_order.mjs --rewrite` prints it; 19 of 27 missions change, rows with split tokens only):

| mission | requiresModules | softModules |
|---|---|---|
| med_tourney_trouble | M0 M13a | |
| med_ford_dithering | M1 M2 M13a | |
| med_mizzlemoor_beacons | M2b M13a M14 | |
| med_castle_dour | M2 M12 M14 | M13a |
| med_bell_tolls_lunch | M6a M12 M13a M14 | |
| med_grand_pageant | M7 M10 M13a M14 M15c | |
| mod_bridge_too_far | M8 M7 M14 M12 M13a M17e.eng M17e.wreck M15c | |
| mod_rail_yard_fireworks | M10 M2 M13a M12 M14 M3 M15c | M8 |
| mod_switchboard_hold | M11 M14 M12 M8 M9 M7 M10 M15c | |
| mod_airfield_open_day | M7 M2 M14 M15c | M13a |
| mod_harbour_tour | M6a M14 M12 M8 M15c | |
| mod_dam_finale | M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13a M15c M17e.eng M17e.wreck M8 M9 M11 | |
| sf_overclock_oops | M12 M14 M13a M15c M17e.eng M17e.wreck M4 | M8 |
| sf_express_delivery | M5 M14 M7 M2 M12 M15c M17e.eng M17e.wreck M4 | |
| sf_turn_it_off | M6b1 M6a M7 M8 M4 M15c | |
| sf_grand_reopening | M5 M6b1 M6b2 M8 M15c M17e.eng M17e.wreck M12 M14 M13a | |
| sf_blink_jungle | M13a M13b M14 M12 M7 M6a | M4 |
| sf_noise_complaint | M13a M10 M7 M4 M12 M14 | M5 |
| sf_queen_size | M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13a M13b M15c M17e.eng M17e.wreck M8 M4 M5 M6b1 M6b2 | |

  Puzzles: `med_standard_deviation` M13 -> M13a; `sf_pz_off_switch` M6b -> M6b1; `sf_pz_gap_year` M13 -> M13b; `sf_pz_bait_and_clean` M13 -> M13a; `mod_pz_plink_crunch` and `mod_pz_too_close` keep M8. `ms.schema.json` `x-vocab.mechanics[*].modules`: Medieval colours and charge `M13` -> `M13a`; Sci-Fi blink `M13` -> `M13b`, strike `M10 M13` -> `M10 M13a`, emp `M6b` -> `M6b1`. `context.json` `modules[]` and `eFreeze` are regenerated by `ms_context`.
* **E3** CU 3.x item 10 (line 204): "known module NAMES (M0..M17e) each present in the era's E-FREEZE prefix" becomes "known landing ids of the `modules` block, each at or before the era's E-FREEZE position".
* **E4** The three `missions_outline.md` 1.2 tables are regenerated from `--md` (their "Landing numbers" lines and margin columns change); the Medieval M2 note ("Part 1 asks SIM to pull M13 earlier"), Modern R1/R2 and Sci-Fi R1 rows are closed with the references of 3.8.

**F. `spec/VF.md`, `plan_lint`, tools.**
* **F1** VF 3.7 RED-AGE: "STALE-ENGINE for more than 6 module landings" stays; add "the SIM hand-back runs `node tools/records.mjs refresh --scope=frozen` after every landing following an E-FREEZE, so the age of a refreshed record is 0; a landing whose refresh fails keeps the record amber and counts toward the cap" (LO-D14). `landings.jsonl` rows are landing ids.
* **F2** `plan_lint`: PL01 "the S ids of the plan module table, the `modules` block and `criteria_manifest.json` agree: 26 landing rows partition the 19 ids S28..S46"; PL10 "E-FREEZE sets in the plan equal the prefixes of the `modules` block"; new PL15 "`node tools/landing_order.mjs --check` is green".
* **F3** `tools/ms_context.mjs parseModules`: pass `mod`, `sess`, `p1` through; `tests/sim/dag.test.mjs` and `tools/perf_budget.mjs` as B8/B6; `criteria_manifest.json` gains `parts` for the ten split S ids.

**G. Design files (closing the requests).** `design/medieval/missions_outline.md` 1.2 and 6.1, `arenas.md` note (a), `rosters.md` 5 header: "M13 early" closed (3.8). `design/modern/missions_outline.md` 1.2, 0.4 and 5 R1/R2: closed (3.8). `design/scifi/missions_outline.md` 1.2, 0.4, 5 R1 and `feel_sheet.md` 14.1: closed (3.8). `design/medieval/props.md` or `boss_table.md`: resolve OI-LO3.

### 3.12 Checks 5a and 5b of the charter

* **No mission needs a landing after its era's E-FREEZE:** `LO-AFTER-FREEZE` and `LO-ERA-SCOPE` are green on all 27 missions and 18 puzzles (`--check`); `NC-LO6` and `NC-LO8` prove the checks bite. The unit view (`LO-UNIT-COVER`) is green: no Medieval unit carries an M8 M9 M11 M4 M5 M6b feature, no Modern unit an M4 M5 M6b feature, no Sci-Fi unit an M9 or M11 feature. Information rows (a unit appears in a mission whose closure lacks the unit's landing; design fallbacks exist and the cameo is declared in `teaching.exceptions`): Modern dozer_plough (mine_immune, mission 4), Sci-Fi spritz_medic (detect lamp and heal filter, mission 3), Sci-Fi valet_drone (detect lamp, mission 5).
* **Medieval can start P3 first:** F(Medieval) = #14 at cumulative 32.0 against Modern 42.75 and Sci-Fi 49.25 (10.75 and 17.25 sessions, 18.3 and 29.3 h later); its prefix holds no landing the era does not need; `LO-MED-FIRST` is green and `NC-LO5` proves it bites.

### 3.13 Tool reference

`tools/landing_order.mjs` (Node 22, no dependencies, deterministic, read-only on the tree, runs in under 2 s except `--search --free` about 9 s):

| command | prints / does |
|---|---|
| (none), `--md`, `--json` | recommended order, freezes, margin tables |
| `--check` | every check of 3.1; exit 1 on any red; prints information rows |
| `--selftest` | NC-LO1..NC-LO12 (4.) ; exit 1 if a control stays green |
| `--baseline`, `--variants [--md]`, `--order=A,B,...` | the plan order, the requests V0..V8, an explicit order of 26 landing ids or 19 module ids |
| `--search [--era-order=med,mod,sf;med,sf,mod] [--beam=60] [--free] [--seed=1]` | exhaustive block search, optional hill climb |
| `--windows`, `--robust=N`, `--rewrite`, `--blessings [--md]`, `--budget`, `--block` | 3.4 windows, 3.7 robustness, 3.11 E2, 3.10, 3.11 B6, 3.11 B2 |
| options `--margin-land=2 --margin-sess=1 --sizes=q2` | the rule thresholds and the session table (`layers`) |

## 4. Acceptance

All scripts are plain Node; tiers as `VF.md`: F = T-fast. Owner = who keeps the script green; REVIEWER signs every row.

| id | script | inputs | thresholds | owner | tier | negative control |
|---|---|---|---|---|---|---|
| LO-T01 | `node tools/landing_order.mjs --check` | `M.md` modules block (after 3.11 B2), 3 x `missions.json`, 3 x `context.json`, `ms.schema.json` | exit 0: LO-COMPLETE, LO-DAG, LO-P1, LO-AFTER-FREEZE, LO-ERA-SCOPE, LO-MED-FIRST, LO-WAIVER, LO-WAIVER-STALE, LO-UNIT-COVER, LO-BLESSING, LO-BUDGET, LO-STALE-RECOMMENDATION all green; 0 waivers | DESIGN-SIM, TOOLS-VERIFY | F | LO-T02 |
| LO-T02 | `node tools/landing_order.mjs --selftest` | the same | 12 of 12 controls red as named: NC-LO1 M14 before M12 -> LO-DAG; NC-LO2 M10 into the slice -> LO-P1; NC-LO3 order misses M9 -> LO-COMPLETE; NC-LO4 M13b last -> LO-WAIVER; NC-LO5 M15r after the Modern freeze -> LO-MED-FIRST; NC-LO6 Modern set loses M11 -> LO-AFTER-FREEZE; NC-LO7 plan order shows >= 5 waivers (scorer is not blind); NC-LO8 a Medieval mission needs M8 -> LO-ERA-SCOPE; NC-LO9 Modern freeze set loses M11 -> LO-UNIT-COVER; NC-LO10 M17e.eng pulled forward -> LO-STALE-RECOMMENDATION; NC-LO11 unknown node in a blessing -> LO-BLESSING; NC-LO12 Medieval blessing owned after the freeze -> LO-BLESSING | DESIGN-SIM | F | (this is the control row) |
| LO-T03 | `tests/sim/dag.test.mjs` (X1, amended in 3.11 B8) | `modules` block | 26 ids; S28..S46 each present; rows with one S form its part set; deps have smaller pos; prefixes equal the three E-FREEZE sets of 3.4 | SIM | F | NC-X1: move M14 before M12 |
| LO-T04 | `tools/perf_budget.mjs` (X2) | `budget` block | sums 0.50 / 0.80 (1e-9); prefix sums 0.35 / 0.56, 0.45 / 0.71, 0.50 / 0.80; no row above 0.12 / 0.18 | TOOLS-VERIFY | F | NC-X2: M7 0.11 -> 0.15 |
| LO-T05 | `tools/ms_lint.mjs` MS-C07 and MS-R08 (3.11 E1) | 3 x `missions.json` | every headline-first mission >= 2 landings and >= 1.0 session, or a `marginWaiver`; every token a landing id of the block; the result equals the `--md` table | CAMPAIGN-x, TOOLS-VERIFY | F | MS negctl: reorder `requiresModules` of Sci-Fi 4 to add M6b2 -> margin red |
| LO-T06 | `tests/sim/inert_<landing>_<era>.test.mjs` list generated from the block | the era golden sets | exactly 18 tests exist (12 Medieval, 6 Modern); each `stateHashFull` equal, no tolerance | SIM | E | NC-X6: one extra draw in `applyDamage` added in M4 -> Medieval and Modern red |
| LO-T07 | `node tools/landing_order.mjs --robust=2000` after SIM's end-of-P1 sizes replace the table | measured sessions | R-M holds for all headline-first missions in >= 90 percent of samples (now 94.8) | SIM | R (end of P1) | set `M6b2` and `M15g.sf` to 0.25 each -> below 90 percent, red |
| LO-T08 | `tools/plan_lint.mjs` PL01, PL10, PL15 (3.11 F2) | plan, block, manifest | green | TOOLS-VERIFY | F | PL negctl: change one prefix in plan 4 |
| LO-T09 | `docs/eras/ledger/landings.jsonl` check in `records.mjs` | SIM hand-backs | each row names a landing id of the block in order of the block; a gap or a reorder outside the windows of 3.4 is red; each post-freeze row is followed by a `refresh` entry | SIM, TOOLS-VERIFY | F | append a row for M8 before M11 outside its window |

## 5. Residual ledger

| item (source and what it asks) | answered in |
|---|---|
| charter (1): machine model, DAG edges with reasons, mission sets, E-FREEZE prefix rule, margin rule per count or per session | 3.1, LO-D2/D3 |
| charter (2): tool that enumerates/searches orders, slice constraint, scoring (min margin, prefix length, SIM serial cost) | 3.1, 3.7, 3.13; `tools/landing_order.mjs` |
| charter (3): ONE order with splits, E-FREEZE prefixes, margin table, waivers | 3.4, 3.5, 3.9 |
| charter (4): exact amendments to plan 4/12 and `spec/M` (DAG rows, S ids, E-FREEZE, slice positions, requiresModules names) | 3.11 A to G |
| charter (5): no mission needs a module after its freeze; Medieval can start P3 first | 3.12 |
| charter: table F1..F18 and M13 parameter blessings to modules | 3.10 |
| Medieval `arenas.md` note (a); `missions_outline.md` 1.2 row 2 and 6.1 (pull M13; "colours-lite" fallback) | 3.8 row 1-3 |
| Medieval `rosters.md` 5 parameter table (banner, bailout, oil, stun, pavise, trail, notTag machine, dash kinds, dragonfire) | 3.10 MED-1..MED-13 |
| Medieval `boss_table.md` landing rule 40 percent or 30 s (A14 with M-layers D-L13) | not an order question; OI-LO8 |
| Modern R1 (cover early), R2 (mines before M8), R3, R4, R5, R6, R7, R8 (`missions_outline.md` 0.4, 1.2, 5) | 3.8; MOD-12..MOD-14; ALL-R3/R4; R8 is CAMPAIGN data |
| Modern `rosters.md` 6 (M13 call_strike, banner, bailout, smoke, pinfield; M11 lay_mine) | 3.10 MOD-1..MOD-11 |
| Modern `god_powers.md` R-GP1 (`spawn_hazards`) | M15g.mod, MOD-11 |
| Sci-Fi R1 (split M6b), R2, R3, R4, R6, R7 (`missions_outline.md` 0.4, 5) and `feel_sheet.md` 14 items 1, 6, 7, 8 | 3.8; SF-R2, SF-R6, SF-R7, ALL-R3/R4, F17, F1..F18 |
| Sci-Fi `rosters.md` 6 F1..F18 | 3.10 |
| Sci-Fi `god_powers.md` slot 4 shield refill, slot 5 EMP with cancelCloak | M15g.sf, GP-EMP, GP-SHIELD |
| `puzzles.md` x3 and `boss_table.md` x3 module needs | all puzzle tokens are inside R(E) (`prepare` includes puzzles); Medieval Cinderwyrm landing: OI-LO8 |
| `MS.md` A16, PC-2, OI-MS6, C07; `S-slice.md` OI-SL4, 3.8.6; `q3_product` 31; `q3_program` 1; `q2_schedule` Q9 | 3.8, 3.11 E and D |
| `M.md` D-M1, D-M2, D-M20, D-M21, 3.2 edges, 3.13 budget block, 3.14 inertness, X1, X2, X6 | 3.11 B |
| `M-layers.md` WP-C1 predecessors, WP-V1..V4 | 3.11 C |
| `VF.md` 3.7 RED-AGE and PL01/PL10 | 3.11 F, LO-D14 |

## 6. Plan corrections

| id | plan or spec statement | evidence | correction |
|---|---|---|---|
| PC-LO1 | plan 4 "Landing order = true dependencies (19 modules)"; E-FREEZE = fixed prefixes #13/#16/#19 | `landing_order --baseline`: 6 waivers under the 2-landing rule, M9 and M11 each last for two missions | 26 landings, E-FREEZE = last required landing, prefixes #14/#20/#26 (3.4) |
| PC-LO2 | plan 8 "landed >= 1 week-equivalent"; MS C07 ">= 1 landing" | not a unit (q3_product 31); a count of 1 gives a margin of one tiny landing | R-M: >= 2 landings and >= 1.0 session (LO-D2) |
| PC-LO3 | Medieval design: M13 "depends only on M0" | `M.md` 3.2: M2b M3 M10 -> M13 (squad/AI rule, statuses, `strike`/`qbufFx`) | earliest legal is directly after M10 (#8) |
| PC-LO4 | Modern R1: M9 "needs only M0 M1 M3 M2 M2b and the cover prop field" | `M-layers.md` 3.10.1: `cover:'low'` is an M12 field; 3.10.5 smoke is M13a; `info.los` is M2b | M9 needs M2 M2b M12 M13a; lands #15; the M8 edge is soft |
| PC-LO5 | Modern R2: M11 "needs M0 M1 M12" | `M.md` 3.2: M10 M12 M13 -> M11; and mission 6 needs M8 and M9 as hard modules | R2 rejected (LO-D9) |
| PC-LO6 | plan 4 row 13 / `M.md`: M17e in the Medieval prefix | `design/medieval/props.md` line 80: wrecks not used; plan 13 rung 5 | Medieval needs M17e.eng only; wrecks are Modern/Sci-Fi (OI-LO3 for the rolling keep) |
| PC-LO7 | `M.md` 3.10 M14 block owns the spawn accounting (D-M17 assigns it to M14 and M13 jointly) | `M.md` 3.10 M14 "Accounting" and M13 "Bailout" share `reinforce:true`; M13 has no dep on M14 | accounting moves to M13a (LO-D11); edge M13a -> M14 |
| PC-LO8 | `S-slice.md` 3.5.1: Sci-Fi requires "the Modern set plus M4 M5 M6b" | `design/scifi/missions_outline.md` 1.2: "Sci-Fi never needs #15 or #16" | R(Sci-Fi) has no M9 M11; its prefix still contains them (LO-D5) |
| PC-LO9 | `VF.md` 3.7 / X6: 6 and 3 landings after the Medieval and Modern freezes, 9 inert tests | the order has 12 and 6, 18 tests | automatic witness refresh after each landing (LO-D14), X6 = 18 |
| PC-LO10 | `plan_lint` PL01 "19 ids S28..S46" | 26 rows share 19 S ids | partition rule (3.11 F2) |

## 7. Open items

| # | item | owner | phase |
|---|---|---|---|
| OI-LO1 | decide LO-D1..D12: approve the 26-landing order and the five splits, or stay on the 19-module plan (then 6 waivers, 3.9 item 3); this gates 3.11 B2 and the rewrite E2, not the first engine edit | COORD | before the end of P1 (M13a is the first landing after the slice) |
| OI-LO2 | replace the session table by the measured P1 sizes and the prototype costs of M2/M2b/M10/M7; rerun `--check` and `--robust` (LO-T07) | SIM with TOOLS-VERIFY | end of P1 (`M.md` OI-1) |
| OI-LO3 | Medieval wreck conflict: `props.md` says wrecks unused, `boss_table.md` has the rolling keep fold into a non-blocking crumble prop. Choose: drop the prop (fold clip and fade) or add `M17e.wreck` to the Medieval required set (E-FREEZE then #16, 35.0 sessions, and the Medieval tail shrinks: rerun `--check` with the extra) | DESIGN-ERA-MED, COORD | P0 exit |
| OI-LO4 | apply 3.11 E2 to the three `missions.json` in the same commit as the new block; rerun `ms_lint` | CAMPAIGN-MED/MOD/SF | with 3.11 B2 |
| OI-LO5 | apply 3.11 B (M.md), C (M-layers), F (VF, plan_lint, tools) | DESIGN-SIM (B, C), TOOLS-VERIFY (F) | after OI-LO1 |
| OI-LO6 | apply 3.11 D (S-slice) and E3/E4 (CU, outlines) | DESIGN-UX, DESIGN-CAMPAIGN | after OI-LO1 |
| OI-LO7 | SIM blesses F7 (hitscan with `aoe`) and F12 (line-shaped area) or confirms the design fallbacks | SIM | before M10 starts |
| OI-LO8 | dragon landing trigger of `boss_table.md` (40 percent hp or 30 s without AA) against M-layers D-L13 (hp .66 and .33, 25 s) (MS A14, OI-MS12); no effect on the order | DESIGN-SIM, DESIGN-ERA-MED | before M7 |
| OI-LO9 | does Medieval need per-class possession for its air units (CU13)? Default: no, M8c is not in R(Medieval); if yes, M8c and M8 enter the Medieval prefix and the order is re-decided | COORD with DESIGN-UX | P1 |
| OI-LO10 | extend R-M to finales and combination missions? Then Sci-Fi 6 and 9 (1 landing, 0.75 session) need waivers or M6b2 moves earlier | COORD | P1 |
| OI-LO11 | ANIM-CLIPS builds reaction clips and tables against the `M.md` 3.10 M17e contract; the engine lands at #13 (cumulative 31 sessions); the table acceptance test runs from then. If ANIM becomes the critical path, pull M17e.eng to #7: with M6a left at #12 that costs one Medieval waiver (healers 1 landing / 1.0 session); with M6a pulled to #8 as well it costs four (Medieval 4, 5, 6, 9 at 1 landing / 1.0 session, `--order=` verified) | COORD | P2 |
