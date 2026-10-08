# spec/M-layers: mechanics specification, part 2 (DESIGN-SIM; plan v3.1 section 4 rows M7, M8, M9; companion `M.md`)

Status: final for algorithms, tables, audit rows, tests and negative controls; the numeric tunables in 3.13 are draft until the Medieval (after M13/M17e) and Modern (after M11) mechanic slices fit them (OI-L4); budget sub-allocations (3.12) are draft until the end of P1 like `M.md` 3.13. Written against the code at commit `b2200f5` (`git diff b2200f5..HEAD -- src tests` is empty, so every `file:line` below is current at HEAD `4fe90f7`). All line references were read or grepped, not recalled; where the plan, a map or a sibling spec disagrees with the code, the code won (section 6). Probes behind the measured numbers are scratchpad-only (`p1_fields p1b_clear p1c_edt p2b_los_dda p4_sched p5_hazards p6_margin p7_chamfer`); every "measured" number can be reproduced from the formula or the algorithm stated next to it.

## 1. Purpose and scope

**Binds.** The three modules that `M.md` 3.10 only points at: **M7 layers, air AI, move classes and flow-field freshness (S35, landing #8)**, **M8 vehicles, turret, armour faces, crew and possession (S39, #14)**, **M9 cover and line of fire (S40, #15)**; plus the cross-cutting pieces the charter assigns here: the complete layer audit, vehicle clearance, crew bailout and wreck rules for vehicles, setup time in the firing gate, squad cohesion for air and vehicles, the AA guarantee and the unhittable-remnant termination rule, and the M7/M8 seam (gunship "face and fire" vs aim-gated air weapons).

**Builders.** SIM (one agent at a time in `src/sim/**`; work packages in 3.14: M7 5 WPs, M8 4, M9 2), WORLD (the `src/world/nav.js` additions of 3.5.3, requests `docs/requests/world_nav_views.md`), INTEGRATION/UI (the `possess` command extension and key table of 3.9.8), RENDER and ANIM-CLIPS (reads `u.altitude u.plane u.aim u.setupT u.inCover`, events of 3.12), COMEDY (bark keys of 3.12), TOOLS-VERIFY (perf probes 3.12), BALANCE (class tunables 3.13), REVIEWER, QA.

**How this file relates to its siblings.** `M.md` owns names (`TOP_KEYS/SUB`, `EVENTS`, forks, validator codes, `LAYER_ID`, `CLS.AIR` as a name, `markNavDirty` as a name, `rangedReady`, `unit_air_state` as a name); this file owns the M7/M8/M9 internals. `spec/W` 3.6 owns the nav instances (`NAV_CLASS`, `CLEAR_NEED`, `kind`/`cell`, `stampProp`, corridor recipes); this file owns how the sim uses them (classes, clearance semantics, lanes, dirty marks). Every place where the two disagree is a row in section 6 with evidence and a named fix; no sibling text is silently overridden.

**Rule zero (plan non-negotiable 1-3).** Every branch below is guarded by a new-field condition (`u.layer !== 0`, `u.mc !== 0`, `def.turret`, `def.armorFace`, `info.los`, `w.nAloft > 0`, `w.layerFlags !== 0`) or by a world-level flag that is false for every Ancient world; Ancient defs leave every new key `undefined`; the Ancient tick executes the same floating-point operations in the same order (policy rows AP-L1..AP-L24 in 3.13, golden G1/G6/G7/G11 plus the frozen-expression tests of section 4). The only deliberate deltas are none.

## 2. Decisions

| # | decision | rationale (evidence) | plan |
|---|---|---|---|
| D-L1 | Two spatial hashes. `w.hash` holds every unit on the **ground plane** (`u.plane === 0`: layers ground and hover, and air units below `ALT_PLANE = 2.0` u); `w.ahash` (null in worlds without air defs) holds **aloft** units (`u.plane === 1`). Both index into `w.units`. | q1 ENGINE-Q8 asked for "two hashes or a layer byte"; with two hashes the 14 ground-only consumers need no code at all and Ancient pays nothing (`ahash` is null). A landed dragon must be in the ground hash or ground melee can never hit it (D-L13). Supersedes the sentence "air units inserted too, queries filter by layer" of `M.md` 3.6 (PC-L1) | 4 M7 |
| D-L2 | `ALT_PLANE = 2.0`; `u.plane` is written at the end of `_integrate` and read by the next tick's hash rebuild (one-tick latency, deterministic). Hover units are plane 0 with `u.altitude = 0` (spec/RA D24: hover1's 0.45 float is a model property). `u.altitude` = `u.y - arena.heightAt(x,z)` for air, 0 for ground and hover. | RA-PC10 needs `altitude` exactly 0 on the ground; hazards, melee reach and projectiles already work in `u.y` | 4 M7 |
| D-L3 | Five move classes, ids 0..2 aligned with `spec/W` 3.6.1: `MC = {GROUND:0, HOVER:1, CLEAR:2, AIR:3, CLEARB:4}` (`u.mc`; `CLEARB` = the `BOSS_NEED` clear view for ground vehicles with `clearReq > 3.0`). `CLEAR` = role `vehicle` or tag `wide` with `radius*scale > 0.9` and layer ground; `HOVER` = layer hover; `AIR` = layer air; everything else `GROUND` (all 43 Ancient defs, elephants included). | Ancient elephants (r 1.5) already squeeze through the 1 u nav; changing them would move G1 | 4 M7 |
| D-L4 | Clearance is an **exact Euclidean** map in nav cells, centre to blocked-cell centre, `Float32Array`, exact for values <= 6.0 (`I-clear`); full build by Felzenszwalb EDT, dirty-window update by EDT on rect+6+6. `CLEAR_NEED 3.0` / `BOSS_NEED 3.75` (`spec/W`); per-unit `clearReq = ceil4(radius*scale + 0.65)`. | probe p7: the chamfer of `spec/W` 3.6.2 overestimates by up to 0.443 cells (58-141 cells disagree at 3.75 on nile/styx/thermopylae); probe p1c: EDT full 1.0-1.3 ms for any map, capped splat 11-27 ms on dense maps; window 48-286 us, 0 mismatches over 200 edits | 4 M7 |
| D-L5 | Field lanes. The **ground lane is the legacy code untouched** (`navRefresh = 6`, teams alternate, each field every 12 ticks, first job at tick 1). A new **coarse lane** (HOVER, CLEAR, CLEARB; cell 2 u) runs one job per 6 ticks (per 4 ticks when more than 4 fields exist, i.e. a ground boss is present) in a rotation over the non-empty (team, class) fields, never in a tick where the ground lane ran. At most **one Dijkstra per tick**; `start()` computes every needed field once. | probe p4: ground max age 11, coarse 23 (4 fields) or 11 (2 fields), 1 job/tick, Ancient job ticks 1,7,13,19 identical to legacy | 4 M7 |
| D-L6 | `markNavDirty` never touches `valid`, never adds a job. Mask bit0 = ground, bit1 = the coarse pair (HOVER and CLEAR). A dirty bit only reorders the next slot of its lane (invalid first, dirty second, round robin third). Latency after an edit: ground <= 12 ticks, coarse <= 24. | q3_engine 7 "a coalesced dirty event refreshes only the affected (team, class) fields"; M.md S33/S36 count recomputes | 4 M7/M12 |
| D-L7 | Air units use **no field**: analytic steer (3.6.5). Coarse fields get the cells of enemy ground-plane units as sources; enemy aloft units are sources only when no ground-plane enemy exists (so AA ground units converge on an air-only remnant). | q2_engine Q10 "air may use a cheaper analytic steer"; cost 0 | 4 M7 |
| D-L8 | Altitude model (3.4): ground block verbatim; hover follows `max(cellHeight, waterY)` at <= 14 u/s, no gravity; air follows `heightAt(x,z)` max with a 4 u look-ahead plus `u.altGoal`, climb/descend by class, no gravity, `ky` ignored; dying units fall under the existing gravity branch and crash (3.4.3). | q1 ENGINE-Q8 | 4 M7 |
| D-L9 | Hover is immune to deep water and lava (spec/W hover view ignores both) and skims quicksand and spikes; fire, geyser and boulders affect hover; aloft units ignore every ground hazard; landed air follows ground rules (3.3.6). Fix of the verified bug: a unit at `ch + 0.8` over a 1.63 u lake drowns in 3.03 s (probe p5). | q1 ENGINE-Q8 | 4 M7 |
| D-L10 | Targeting masks use three booleans per def, `hitGround`, `hitAloft`, `hitLanded` (3.6.2), not the two-bit mask of `M.md` 3.9, so a landed dragon is shootable by `air:false` weapons (PC-L2). | `M.md` mask `(c.layer === 2 ? 2 : 1) & mask` makes a landed dragon immune to tank shells | 4 M2b/M7 |
| D-L11 | Melee-from-air: melee candidates come from `w.hash` only (ground plane); an air attacker needs `u.altitude <= MELEE_ALT = 2.5` to start a melee and `<= 3.0` at the hit moment. A swoop (wyvern) or landing (dragon) puts it on the ground plane, where ground melee can hit it back. | q1 ENGINE-Q9 | 4 M7 |
| D-L12 | Air AI is an 11-state machine with six class rows (3.6.3-3.6.4); gunship fire is "face target and fire" (heading decoupled from velocity for `hdg:'face'` classes). | q3_engine 31 | 4 M7 |
| D-L13 | The dragon lands (a) when hp crosses 66% and 33% of `hpMax`, (b) every 25 s of being aloft while >= 3 enemy ground units that cannot hit aloft stand within 20 u, (c) when the unhittable rule orders it. Landed 8 s (or until it lost 15% hpMax since landing, or 3 s without an enemy within 14 u), then takes off. | q1 ENGINE-Q9 "landing phase so ground melee can finally hit it" | 4 M7 |
| D-L14 | Unarmed air units (no melee, no ranged) hover as escorts 12 u behind the own centroid, flee AA, and withdraw when no armed ally lives for 4 s. | q1 ENGINE-Q9 | 4 M7 |
| D-L15 | Unhittable-remnant rule (3.6.7): detection sample 1 Hz; `T0` = first sample with no side able to hit anything; stage 1 at `T0+6 s` forced landing, stage 2 at `T0+18 s` withdraw order, hard stop `T0+30 s`; the legacy `idle` clock restarts at `T0` and Zeus is suppressed while a stage is active. Worst case battle end 31 s after the last hittable contact. | `M.md` S35 row asks <= 62 s; this is stricter (PC-L10) | 4 M7 |
| D-L16 | AA guarantee in one pure module `src/sim/airrules.js`, called by `generateArmy` and by `validateMission` (3.6.8). | `M.md` 3.9 rule text, made executable | 4 M7 |
| D-L17 | Squads stay single-def (so single-layer, single-class) by construction; `CLS.AIR = 6`; `sumD` code is unchanged (`sq.cls === CLS.LINE`), so air never enters the line metric and vehicles and hover squads do; air formations are `vee` and `spread`; `squadSize` vehicle 3, air 2 (3.7). | q3_engine 6 | 4 M7 |
| D-L18 | Large-body margins: `w.maxRadius` = max `radius*scale*max(1, mut.scale)` over defs that carry `_nf` (0 in Ancient worlds); every query margin becomes `max(legacy, w.maxRadius [+ projectile radius])` (table 3.3.8). Ancient margins are the legacy constants. | probe p6: margin 1.8 misses 0.25% of tank/infantry overlaps (q1 measured 2% in dense blobs); margin 2.2 misses 0 | 4 M7 |
| D-L19 | Vehicle movement (3.8.1): `tags` carry exactly one drive tag (`wheeled tread hover walker`); the hull faces its movement direction with a turn-rate limit and a speed coupling per drive; reverse for short back-ups; present-front when engaged and stationary. Branch taken only for `def.turret` (or a drive tag). | q1 ENGINE-Q15 | 4 M8 |
| D-L20 | `turret.arc` is the **traverse half-angle** (0.2 .. 3.14), tolerance is `G.aimTol 0.08` rad; `u.aim` slews at `turret.rate`; `aimOk` is recomputed after the hull moved (one-tick latency). The sentence "aimOk = angleDiff(aim, want) < turret.arc" of `M.md` is replaced (PC-L3). | with `arc` up to 3.14 that sentence would let every tank fire unaimed | 4 M8 |
| D-L21 | `resolveFace` bins by hull-relative azimuth: front < 45 deg, side 45..135, rear > 135; `top` for area damage and for shots arriving above 34 deg elevation. `Hit.fy` carries the source height. | M1 reads `o.face` only (`M.md` D-M6) | 4 M8 |
| D-L22 | Crew bailout (3.8.6): only when the killing blow overkilled by < 35% of `hpMax` and the cause is in the bail table; ring spawn from the rear; never into water or off-nav cells; accounting by `M.md` M13/M14. | q1 ENGINE-Q25 | 4 M8/M13 |
| D-L23 | Wrecks are non-blocking decor props (cap 24, ttl 25 s, `M.md` M17e); the 20-wreck corridor test proves the nav arrays are unchanged. | q3_engine 18 | 4 M17e |
| D-L24 | Crew weapons: `setup` is a stationary-time gate in `rangedReady` (`M.md` 3.8); this file adds the AI rule (stand still to deploy), the published phase and the possession rule. | q3_engine 19 | 4 M2/M8 |
| D-L25 | Possession per class (3.9.8): the `possess` command gains optional `aim`, `drive`, `alt`; absent fields keep today's behaviour bit for bit (S26 replay). | q1 ENGINE-Q16 | 4 M8 |
| D-L26 | Friendly-fire spawn exclusion for large bodies: `muzzle fwd = radius + 0.4` and `p.grace = clamp((2*radius + 0.6)/speed, 0.1, 0.4)` s in which same-team units are ignored. | q1 ENGINE-Q36 | 4 M10/M8 |
| D-L27 | Low cover: prop `cover:'low'` is **not** `cover:true` (`Prop.cover` stays boolean for `propBlocks`); `inCover` is computed every 12 ticks for defs with `ai.cover`; damage x0.5 for `o.proj` hits from the covered side. | q1 ENGINE-Q26 | 4 M9 |
| D-L28 | `lineOfFire` is analytic: terrain sampled every 2 u, props found by walking the 4 u prop grid, smoke by circle tests; measured 0.46-1.30 us per call (limit 4). | probe p2 | 4 M9 |
| D-L29 | Blocked shooters search 24 candidate spots (3 rings x 8 azimuths), **one search per tick world-wide**, move there, and after `LOS_TIMEOUT = 4.0 s` fire through the obstacle and retarget. | q1 ENGINE-Q26; cost 24 x 1.2 us < 30 us per tick | 4 M9 |
| D-L30 | Smoke is a world array of <= 16 occluder cylinders mirrored from `kind:'smoke'` effects. | `M.md` M13/M10 | 4 M9 |
| D-L31 | Layer state is folded into `stateHashFull` as block (L) only when `w.layerFlags !== 0`, so the Ancient full digest recorded at the M0 landing never moves. | `M.md` D-M12 | 0.3 |
| D-L32 | The only new RNG use is fork `era:air` (exactly 2 draws per air attack cycle) and `era:spawn` (bailout, owned by `M.md`); LOS search, landing spots and orbit direction are RNG-free (`u.id`, `u.sideSign`). | `M.md` 3.11 rule | 0.3 |

## 3. Detailed specification

### 3.1 Files, constants, fixtures

* **New files** (pure JS, `src/sim/`): `layers.js` (ids, `moveClassOf`, `canTarget`, `hashOf`, plane update, the 1 Hz unhittable detector), `fields.js` (lane scheduler, `fieldFor`, coarse jobs, the class extension of `markNavDirty`), `air.js` (`AIR_CLASS`, `airThink`, landing spots, withdraw), `airrules.js` (`isAirDef`, `canHitAir`, `airGuarantee`, `missionAirProblems`), `vehicle.js` (`DRIVE`, `vehicleDrive`, `turretSlew`, crew/setup helpers, possession class table), `cover.js` (`lineOfFire`, `refreshCover`, `coverFactor`, `repositionStep`, smoke list), plus `armor.js` `resolveFace` (M.md ships the stub). WORLD adds the nav API of 3.5.3 to `src/world/nav.js` (additive). `world.js`, `ai.js`, `squads.js`, `combat.js`, `hazards.js`, `projectiles.js`, `possession.js`, `abilities/util.js`, `armygen.js`, `formations.js`, `objectives.js` receive the guarded edits of the audit (3.3). Modules in these files are pointer-registered by `M.md` 3.1 (`layers.js turret.js cover.js`); `turret.js` = `vehicle.js` here (rename at the M8 landing, one `git mv`, no content impact).
* **Constants (`consts.js` `G`, appended; values draft until OI-L4)**: `altPlane 2.0`, `meleeAlt 2.5`, `meleeAltHit 3.0`, `hoverFollow 14` (u/s), `coarseRefresh 6` (ticks; 4 when more than 4 coarse fields are needed), `aimTol 0.08`, `aimTolPlayer 0.15` (rad), `reverseK 0.5`, `reverseMax 8` (u), `graceMin 0.1`, `graceMax 0.4` (s), `bailOverkill 0.35`, `coverMul 0.5`, `coverRange 1.6` (u gap to a low prop), `coverCos 0.5`, `losRings [2, 4, 6.5]`, `losAz 8`, `losTimeout 4.0` (s), `losSearchTimeout 3.0`, `smokeMax 16`, `unhitSample 1.0`, `unhitLand 6`, `unhitWithdraw 18`, `unhitStop 30` (s), `unarmedGrace 4` (s), `crashMin 3` (u altitude), `clearPad 0.65`, `clearCap 6.0`. `LAYER_ID = {ground:0, hover:1, air:2}` (M.md), `MC = {GROUND:0, HOVER:1, CLEAR:2, AIR:3}`, `PL_GROUND = 1, PL_AIR = 2, PL_ALL = 3`.
* **Test naming.** `tests/sim/m08_layers.test.mjs` (names `L:<row id>`), `layers_audit`, `m08_fields`, `m08_clear`, `m08_alt`, `m08_air`, `m08_remnant`, `m08_aa_guarantee`, `m08_squads`, `m14_vehicles`, `m15_cover` (M.md S35/S39/S40 names), negative controls `tests/negctl/L-*.mjs`, `V-*.mjs`, `C-*.mjs` (section 4).
* **Fixtures** (numbers used by tests; `fx_*` ids live in `tests/fixtures/layer_defs.mjs`, independent of rosters; those already in `M.md` 3.1 are reused: `fx_rifleman fx_mg fx_sniper fx_tank fx_at fx_aa fx_heli fx_howitzer fx_trebuchet fx_knight fx_pike fx_healer`):

| id | role / layer / tags | key numbers |
|---|---|---|
| `fx_apc` | vehicle / ground / `wheeled machine` | hp 900 armorFace .5/.35/.2/.2, radius 1.6, speed 3.6, turnRate 1.1, accel 3.5, no turret, bailout 4 crew |
| `fx_tank` (extends M.md) | vehicle / ground / `tread machine` | radius 2.2, speed 2.6, turnRate 1.4, accel 3, `turret {rate 1.2, arc 3.14, hullTurn 1.0}`, bailout 3 crew, `wreck mod_wreck_tank` |
| `fx_td` | vehicle / ground / `tread machine` | casemate gun: `turret {rate 0.8, arc 0.35, hullTurn 1.2}` (traverse test), radius 2.0 |
| `fx_hover_tank` | vehicle / hover / `hover machine` | radius 1.6, speed 5.5, turnRate 2.0, `turret {rate 2.0, arc 3.14, hullTurn 2.0}`, hitscan laser, no bailout |
| `fx_mech` | vehicle / ground / `walker machine mech` | radius 1.5 (`wide`), speed 2.4, turnRate 3.0, `turret {rate 3.0, arc 2.2, hullTurn 3.0}` |
| `fx_gunship` | air / `gunship machine` | cruiseAlt 10, speed 7.0, range 30, whileMoving, hp 700 |
| `fx_drone` | air / `drone machine` | cruiseAlt 4.5, speed 7.5, hitscan range 22, hp 90 |
| `fx_dropship` | air / `dropship machine` | cruiseAlt 12, speed 6.5, unarmed, hp 600 |
| `fx_dragon` | air / `dragon boss` | cruiseAlt 12, speed 5.0, hp 1800 armor .3, breath range 26 (whileMoving) + claws melee dmg 60 range 3.2, radius 2.0 `wide` |
| `fx_wyvern` | air / `wyvern` | cruiseAlt 9, speed 5.5, hp 300, spit range 18 + bite 25 |
| `fx_sandbag` / `fx_wall` | props | sandbag `cover:'low'` r 0.9 h 0.9 hp 60; wall `cover:true` r 1.0 h 3 hp Infinity |

### 3.2 Vocabulary, fields, events

**Planes and classes.** `plane` 0 = ground plane (in `w.hash`), 1 = aloft (in `w.ahash`). `moveClassOf(def)`: `layer air -> 3`; `layer hover -> 1`; `(role vehicle || tag wide) && radius*scale > 0.9 -> 2`, or `4` when its `clearReq > 3.0`; else `0`. A landed air unit keeps `mc = 3` (it never paths on the ground; 3.6.4 GROUNDED holds position and fights what is in reach).

**Closed tag vocabularies (validator, codes appended to the list of `M.md` 3.4; OI-L1).** Role `vehicle` needs exactly one of `wheeled tread hover walker` (`E_TAG_DRIVE`); `layer hover` needs `hover`; `layer air` needs exactly one of `heli gunship drone dropship dragon wyvern` (`E_TAG_AIRCLASS`) and `cruiseAlt` inside the class range of 3.6.3 (`E_RANGE`); an air def with a ranged weapon whose class pattern is `orbit` or `run` needs `ranged.whileMoving` (`E_AIR_WM`); `turret.arc` below `0.2` or above `3.14` is `E_RANGE`; a `radius*scale` above 3.0 on any def of class HOVER/CLEAR/CLEARB (above 2.35 on HOVER) is `E_RANGE` (ground bosses with 2.35 < r <= 3.0 use the `BOSS_NEED` view, 3.5.1); `cruiseAlt * atk` below 3.0 is `E_RANGE`. Air defs and vehicles carry `machine` (M.md M6a).

**Unit fields appended after `M.md` 3.5 (all plain numbers, set in the constructor, monomorphic).** `plane=0 mc=0 clearReq=0 altGoal=0 airState=0 airT=0 airPass=0 orbX=0 orbZ=0 landT=0 landMark=0 unarmedT=0 aimWant=0 hullRate=0 revT=0 revD=0 overkill=0 coverX=0 coverZ=0 spotX=0 spotZ=0 spotT=0 losT=0 losN=0 wasteN=0 shunId=0 shunT=0 spawnKind=0 invulnT=0 blockedT=0 flankEvT=0` (`altitude`, `aim`, `aimOk`, `inCover`, `setupT`, `layer` are M.md's). **World fields**: `ahash` (null or `Spatial`), `aloft` (Int32Array(units cap), indices of aloft units this tick), `nAloft`, `layerFlags` (bit0 any hover, bit1 any clear, bit2 any air, bit3 any turret, bit4 any cover def; set in `addUnit`, never cleared), `maxRadius`, `mR = max(1.8, maxRadius)`, `mR12 = max(1.2, maxRadius)`, `mProj = max(1.6, maxRadius + 0.6)`, `navs` ({ground, hover, clear} NavGrid instances), `cf` (FlowField per [mc 1,2,4][team], HOVER may alias CLEAR, 3.5.5), `nCls[team][mc]` (mc 0..4), `coarseTimer coarseCursor dirtyG[2] dirtyC[3][2] fieldSeq fieldLast[...]`, `unhitT0 unhitStage`, `smoke[]`, `losBudget`, `airCentroid[2]`. **Hit fields**: `fy` (source height, NaN = unknown). **Events** (appended to `EVENTS`, OI-L1): `unit_air_state {id state prev alt}` (rate: on change), `unit_withdraw {id def team why}` (`why`: `orphaned`, `stage2`, `timeout`), `air_remnant {team stage t}` (stage 1, 2, 3).

### 3.3 LAYER AUDIT

Legend: columns G ground, H hover, A aloft air (`plane 1`), L landed air (`plane 0`, rule of G unless a cell says otherwise). Cell values: `=` legacy rule unchanged, `+` seen or affected, `-` not seen or ignored, `3D` 3D distance. Every row has a test named `L:<ID>` in `m08_layers.test.mjs` whose assertion is given as `t:`; `layers_audit.test.mjs` parses these tables (rows start with `| <ID> |`; a first column may list several ids, `P04, P05`), greps the anchor text of column 2 in the named file, and fails when `grep -c` of the pattern in `src/sim` differs from the row count (21 `hash.query`, 6 `fields[`, 21 nav method calls + 2 `nav.hs[`, 9 `heightAt(` + 2 `propBlocks`, 9 `cellHeight(`).

**3.3.1 `hash.query` sites (21; all in `src/sim`, verified by `grep -rn "hash.query" src`).** Consumers named in the charter are marked: effects, morale shock, abilities, Zeus.

| ID | site | today | G | H | A | rule and change | t: |
|---|---|---|---|---|---|---|---|
| H01 | world.js:199 `igniteAt` units (effects) | burn every unit within r, 2D | = | + | - | `hash` only; props loop unchanged | aloft dragon above a fire patch 10 s: no `burn`; hover tank: burns |
| H02 | world.js:224 `areaDamage` r+1.8 (effects) | falloff `1-0.6*dd/r` on 2D distance | = | + | 3D | margin `r + w.mR`; after the ground pass, if `w.nAloft>0` a second pass over `ahash` into private `qbufA` with `dd = hypot3(dx,dz,dy) - radius`, `dy = u.y + height/2 - burstY`; new optional arg `y` (burst height, default `heightAt+0.5`) | shell r 5 at the ground hurts a heli 3 u up, not at 8 u; flak burst at heli altitude hurts the heli and nothing 4 u below |
| H03 | world.js:357 `moraleShock` (morale) | allies within 6 lose morale | = | + | + | query the hash of the dead unit's plane: plane 0 -> `hash`, plane 1 -> `ahash` | dead infantry does not shock a drone squad 4 u above; dead drone shocks the squad |
| H04 | world.js:677 `_separate` | pair push, lower index | = | + | own plane | see Z02 | tank/infantry overlap probe: 0 missed pairs |
| H05 | world.js:721 `_tickEffects` fire/cloud (effects) | burn/poison units inside | = | + | - | `hash` only (qbuf2 aliasing: AP row 12 of M.md, unchanged) | gas cloud under a heli: heli unaffected |
| H06 | world.js:864 `zeusIntervene` (Zeus) | densest 5 u cluster over every 3rd unit | = | + | - | candidates skip `plane 1`; counts from `hash`; `best` null -> no bolt, goat and events unchanged | air-only remnant: no throw, no NaN |
| H07 | possession.js:82 `_aim` | nearest enemy in a 60 deg cone | = | + | + if `hitAloft` | query `hash`, plus `ahash` when the possessed def can hit aloft; 3.9.8 | possessed AA trooper snaps to a heli; possessed pikeman does not |
| H08 | projectiles.js:118 `_collide` | y-aware cylinder test, radius 1.6 | = | + | + | margin `w.mProj`; if `nAloft>0 && p.y - heightAt >= 1.5 && opts.air !== false` also query `ahash`; `air:'only'` shots skip plane-0 units whose `layer !== 2`; `air:false` skip aloft | arrow at y 7 hits a heli at altitude 6; bullet at y 1 passes under it; AA rocket ignores infantry in its path |
| H09 | combat.js:306 `cleave` | hit up to 3 neighbours within 2.2 | = | + | - | `hash` only, attacker plane 0 only | an aloft attacker never reaches `cleave` (no melee start above 2.5 u); a ground monster cleaves as before |
| H10 | abilities/util.js:51 `collect` (abilities) | alive non-DOWN units in r, want enemy/ally/all | = | + | opt-in | new arg `planes` default `PL_GROUND`; `PL_ALL` for `cc_field` emp, `heal_pulse` machine, `aura`/`war_horn` allies; aloft by 2D distance | EMP radius 9 disables a drone 6 u up; plain `collect` never returns it |
| H11 | util.js:82 `chainLightning` (abilities) | next enemy within 8 | = | + | 3D | `PL_ALL`, 3D distance <= 8 | arc jumps to a heli 5 u up, not 9 u up |
| H12 | pack_bonus.js:11 (abilities) | same-def neighbours in r | = | + | own plane | `w.hashOf(u)` | two aloft drones count each other |
| H13 | stance.js:18 (abilities) | allies within 2 u | = | + | own plane | `w.hashOf(u)` | a drone under a phalanx does not add `testudo` |
| H14 | crowd_favorite.js:13 (abilities) | enemies in r | = | + | - | `hash` only | aloft enemies do not feed the roar |
| H15 | ai.js:60 `pickTarget` | scored scan | = | + | + | `hash` pass as today; second pass over `ahash` iff `info.hitAloft && w.nAloft>0` (candidate loop shared); `canTarget(info,c)` (3.6.2) rejects before scoring | pikeman never targets an aloft dragon; archer does; both target it when landed |
| H16 | ai.js:91 `clusterBonus` | allies within 3 of target | = | + | own plane | hash of `c`'s plane | siege shells prefer a ground cluster, not drones |
| H17 | ai.js:121 `crowdAhead` | friends within 1 u, slow | = | + | - | `hash` only (a friendly heli aloft is in `ahash`, so it can no longer freeze a battalion, q1 Q8); a landed friendly dragon is still an obstacle | 30 infantry march under a hovering friendly heli: 0 `waitT` stalls |
| H18 | ai.js:235 `guardBehaviour` | flee vector from enemies in 9 | = | + | - | `hash` only | general ignores a strafing heli in the flee vector |
| H19 | ai.js:339 `nearestInReach` | opportunity melee target | = | + | - | `hash` only; attacker must satisfy the melee altitude rule | wyvern at altitude 6 starts no melee; at 2.4 it does |
| H20 | ai.js:450 `supportMove` | friends/enemies in 9 | = | + | - | ground-plane supporters use `hash`; air support units use `airEscort` (3.6.6) with `ahash` | medic walks away from ground enemies only |
| H21 | ai.js:465 `flee` | enemy push vector in 14 | = | + | + w0.5 | `hash`, plus `ahash` enemies with weight 0.5 | routing infantry flees from a heli within 14 |

**3.3.2 `w.fields` sites (6 `fields[` lines + the constructor line; the plan's "5 sites" counts world.js:217/593 as one).**

| ID | site | today | rule and change | t: |
|---|---|---|---|---|
| F01 | world.js:64 `this.fields = [...]` | two ground `FlowField` on one `NavGrid` | unchanged; adds `this.cf = [null, [F,F], [F,F], null, [F,F]]` filled lazily by `ensureField(team, mc)` when `nCls[team][mc] > 0` | Ancient world: `cf` all null, heap equal |
| F02 | world.js:217 `invalidateFields` | ground fields `valid=false`, `fieldTimer=0`, both recomputed next tick | unchanged for the ground fields (legacy callers); also `markNavDirty(whole arena, bit1)` (coarse never invalidated) | legacy `spawnProp` in a Sci-Fi world: coarse `valid` stays true |
| F03 | world.js:593 `refreshFields` compute | per team: sources = enemy cells, `crowd` extra, Dijkstra | ground branch verbatim; new `refreshField(team, mc)` for coarse (3.5.5) | ground branch digest equal on Ancient (G1) |
| F04 | squads.js:63 `f = w.fields[sq.team]` | squad distance for the line metric | `w.fieldFor(sq.team, sq.mc)`; AIR squads: `sq.d = hypot(anchor, airObjective)` | tank squad `sq.d` comes from the CLEAR field |
| F05 | squads.js:72 pass B | anchor march via `f.dir` | same accessor; AIR analytic (3.7.2) | |
| F06 | ai.js:98 `enemyDir` | gradient of the team field | `fieldFor(u.team, u.mc)`; AIR -> `airDir` | hover unit steers on the HOVER field across a lake |
| F07 | ai.js:204 retarget skip (`f.distAt > scan*1.7+6`) | skip scans far from any enemy | skip uses the unit's class field; AIR never skips; `info.hitAloft && w.nAloft>0` never skips | AA trooper 40 u from the ground enemy still finds the heli at 20 u |

Every other use of `f.dir`/`f.distAt` (`squads.js:64,65,97,107,114,115,119`; `ai.js:99,206`) goes through the same accessor in the same edit.

**3.3.3 Nav sites (23 = 21 method calls + 2 `nav.hs[` reads; 5 `clearLine` calls are listed as C01-C05 because they walk `canStep`).** Class accessors (3.5.4): `walkableC(mc, req, x, z)`, `canMoveC(u, ocx, ocz, px, pz)`, `clearLineC(mc, req, ...)`. Fast path: `mc === 0` executes the legacy expression. Columns: G legacy; C (CLEAR) = fine ground arrays + `clear >= u.clearReq`; H (HOVER) = fine arrays `walkH`/`clearH`, `soft` impassable; A (AIR) = `nav.inside` only.

| ID | site | today | rule for C, H, A | t: |
|---|---|---|---|---|
| N01 | world.js:660 `_deflect` end: `nav.inside` + `nav.soft[..]` | breach candidate counter | C/H use their `soft`; A never calls `_deflect` | tank pressing a gate gets `blockSoft` |
| N02 | world.js:663 `_canMove` `nav.inside` | arena bounds | all classes; A: the only nav test | air unit stops at the arena rim |
| N03 | world.js:666 `_canMove` `nav.canStep` | walk+height+corner rule | C: `canStep && clear[j] >= req`; H: `canStepH`; A: skipped | tank refuses a 4-cell gap, passes 5 (one lane) and 6 (two lanes) |
| N04 | world.js:668 `nav.hs[j]` | step <= 1.0 | H relaxed to 1.5; C = 1.0 | hover climbs a 1.3 u ledge, tank cannot |
| N05 | world.js:668 `nav.hs[ocx+..]` | same expression | same | |
| N06 | world.js:698 `_separate` push a | `walkable(ax,az)` | `walkableC(a.mc, a.clearReq, ..)`; A: `inside` | tank pushed by APC stays off blocked cells |
| N07 | world.js:699 `_separate` push b | same | same | |
| N08 | world.js:791 corpse slide | `walkable` | unchanged (corpses are bodies on the ground) | |
| N09 | projectiles.js:91 `nav.inside` | projectile bounds | unchanged | |
| N10 | mutators.js:46 chicken rain | spawn point walkable | unchanged (ground defs) | |
| N11 | squads.js:115 `lineOk` probe | straight march ok? | `walkableC(sq.mc, sq.clearReq, px, pz)` and class `distAt` | |
| N12 | squads.js:147 anchor step | `walkable(nx,nz)` | class accessor; A: `inside` | tank squad anchor never enters a 4-cell gap |
| N13 | squads.js:148 | slide x | same | |
| N14 | squads.js:149 | slide z | same | |
| N15 | squads.js:166 anchor snap to group | `walkable(sq.ax,sq.az)` | same | |
| N16 | ai.js:247 guard flee | `walkable(u.x+dx*.9,..)` | class accessor with `look = max(0.9, radius+0.6)` | |
| N17 | ai.js:393 kiteAway | same | same | |
| N18 | ai.js:396 | perpendicular escape | same | |
| N19 | ai.js:397 | other perpendicular | same | |
| N20 | ai.js:444 retreatMove | `walkable(u.x+dv*.3)` | class accessor; A: `airRetreat` | |
| N21 | ai.js:474 flee probe 1 | `walkable(u.x+dv*.4)` | class accessor; A: `airRetreat` | |
| N22 | ai.js:474 flee probe 2 | perpendicular | same | |
| N23 | ai.js:474 flee probe 3 | other perpendicular | same | |
| C01 | abilities/dash.js:62 `clearLine` | blink/dash path check | `clearLineC(u.mc, u.clearReq, ..)` | |
| C02 | ai.js:106 `steer` | `u.lineOk` | class variant; A -> `airSteer` | |
| C03 | ai.js:422 `followFormation` | slot line ok | class variant | |
| C04 | squads.js:96 `order move` | straight to `moveTo` | class variant | |
| C05 | squads.js:107 flank | straight to flank point | class variant (cavalry only, ground) | |

Group proofs (the `L:N..` tests are generated from this table): scenario A = tank (`fx_tank`) and infantry in a gate of `w` cells for `w = 3..7`: tank passes iff `w >= 5`, centre-lane width 1 cell at `w = 5`, 2 cells at `w = 6`, infantry passes for all `w >= 1` (rows N02, N03, N06, N12, N16-N23, C02-C05 exercise their own function with the same fixture). Scenario B = hover tank over a 6 u lake: crosses in `<= pathLen/5.5 + 6 s`, tank takes the bridge (rows N03-N05, F06).

**3.3.4 `propBlocks`, `heightAt`, `cellHeight` (11 + 9 sites).**

| ID | site | rule and change |
|---|---|---|
| P01 | world.js:130 `propBlocks(p)` | tests `o.cover \|\| o.low` (both booleans, `Prop.low` from catalog `cover:'low'`, `Prop.cover === (info.cover === true)`); height rule unchanged. Aloft projectiles pass over because `p.y >= top` |
| P02 | projectiles.js:112 call | unchanged; hitscan `_resolveRay` reuses `propHit` |
| P03 | world.js:137 `heightAt(o.x,o.z)+o.height` | unchanged |
| P04, P05 | world.js:153, :156 event `y` | unchanged |
| P06 | world.js:375 breach shot target y | unchanged; aloft shooters aim at it like anyone |
| P07 | world.js:878 lightning event y | unchanged |
| P08 | projectiles.js:99 terrain collision | unchanged for every class |
| P09 | hazards.js:106 boulder y | unchanged |
| P10, P11 | godpowers.js:68, :79 event y | unchanged |
| V01 | world.js:246 `addUnit` y | ground `cellHeight` (legacy); hover `max(cellHeight, waterY)`; air `heightAt + def.cruiseAlt`, `plane=1`, `altGoal = cruiseAlt`, `airState = CRUISE` |
| V02 | world.js:610 material and shallow-water speed | hover and air: `k = 1` |
| V03 | world.js:632-636 vertical follow | 3.4 |
| V04, V05 | world.js:794-795 `_tickDying` gravity | unchanged; adds the crash hook for dying air units (3.4.3) |
| V06 | mutators.js:48 chicken rain `cellHeight+14` | unchanged (ground defs fall under gravity) |
| V07 | hazards.js:42 quicksand y guard (0.3) | adds `u.layer === 1` skip (hover skims); aloft already skipped by the guard |
| V08 | hazards.js:63 spikes y guard (0.4) | adds `u.layer === 1` skip |
| V09 | hazards.js:127 `_liquid` | 3.3.6 |

Tests `L:P01..V09`: bullet at 0.9 u height is stopped by `fx_sandbag` (top 0.9) and by `fx_wall`, passes the sandbag at 1.4; `V01` spawn heights and planes for the five fixtures; `V02` hover speed over mud equals base; the rest are "result unchanged" checks (G1 digest and the named event payloads).

**3.3.5 Centroids, separation, squads.**

| ID | site | rule and change | t: |
|---|---|---|---|
| Z01 | world.js:558-578 `recomputeCentroids` | skip `u.layer === 2` in `cen`, `back` and the lateral-extent loop (ground-only centroids, q3_engine 6); new `airCentroid[team]` (x, z, n over layer-2 units) feeds `airObjective`; vehicles and hover are included, roles `vehicle air` are not rear | 6 drones do not move the ground centroid; `enemyBack` unchanged |
| Z02 | world.js:671-706 `_separate` | ground-plane pass: `a.plane === 0`, query margin `a.radius + w.mR` (D-L18), `nav.walkable` -> `walkableC`; trample only if `a.layer === 0` (hover floats over infantry) and mass rule unchanged; aloft pass: iterate `w.aloft`, query `ahash` with `a.radius + w.mR`, `nav.inside` test, no trample, no `press`; both passes keep the two relaxation passes and `f` | tank (r 2.2) vs 200 infantry probe: missed overlapping pairs 0 (legacy margin: 83/32 773 = 0.25%); two drones never overlap > 0.3 u |
| Z03 | squads.js:100-160 anchor march | `walkableC`/class field per N11-N15; AIR squads use the analytic march of 3.7.2 | |
| Z04 | squads.js:66 `sumD` | **line unchanged** (`sq.cls === CLS.LINE && sq.d < 1e8`): CLS.AIR is not LINE, vehicles and hover squads are LINE, so the metric counts ground-plane LINE squads of every non-air class (their `sq.d` is a path distance in the same units for all fields: fine steps and coarse steps of 2 u x cost) | air squad does not change `D`; a tank squad ahead of the infantry line slows to `clamp(1 - 0.16*ahead, .45, 1.2)` |
| Z05 | squads.js:10 `squadClass` | `air -> CLS.AIR (6)`; `vehicle -> LINE`; `squadSize` vehicle 3, air 2; `GROUP_MAXTYPES` per M.md | |
| Z06 | formations.js `formationOffsets` | new kinds `armor` (two ranks, spacing `2.05*radius` min 3.0, `spec/W` 3.6.5), `vee` and `spread` (3.7.3); existing kinds unchanged | |
| Z07 | world.js:244 `addUnit` bounds clamp | for `mc !== 0` the limit shrinks by `radius - 0.55` so a large body never spawns half outside | tank placed at the rim is inside by its radius |
| Z08 | objectives.js:78 `HoldHill.step` | units with `plane === 1` neither hold nor contest | heli hovering over the hill: `contested` stays false |

**3.3.6 Hazards, liquids, crash (the six hazard sites; `hazards.js` iterates `w.units`, not the hash).**

| ID | site | G | H | A aloft | L | rule and change | t: |
|---|---|---|---|---|---|---|---|
| HZ1 | hazards.js:42 `_quicksand` | sinks | - | - | = | explicit `u.layer === 1` skip; existing guard `u.y > cellHeight+0.3` already skips aloft | hover over quicksand 6 s: `sink 0` |
| HZ2 | hazards.js:63 `_spikes` | dmg | - | - | = | same | hover over up-spikes: no damage |
| HZ3 | hazards.js:70 `_fire` | burn | + | - | = | new guard `u.layer === 2 && u.altitude >= ALT_PLANE` skip (probe p5: unmodified rule burns a unit 8 u up) | dragon aloft: `burn 0`; landed: burns |
| HZ4 | hazards.js:89 `_geyser` | launch | + | - | = | same guard (probe p5: unmodified rule flings it) | |
| HZ5 | hazards.js:109 `_boulders` | hit | + | - | = | same guard | |
| HZ6 | hazards.js:126 `_liquid` | drown/burn | - | - | = | first line of the unit loop: `if (u.layer === 1 \|\| (u.layer === 2 && u.altitude >= ALT_PLANE)) continue;` hover is immune to deep water and lava. Probe p5: a unit at bed+0.8 in a 1.63 u lake drowns after 3.03 s under the legacy rule; hover `u.y = max(cellHeight, waterY)` (3.4.1) would drown too without this line, so both are required | hover tank 12 s over a 3 u lake and over the Styx lava plane: alive, hp unchanged; infantry knocked into the same lake: dead at 3.0 s |

**3.3.7 Abilities, effects, morale, Zeus: where they live.** `collect`, `chainLightning`, `stance`, `pack_bonus`, `crowd_favorite` = H10-H14; `_tickEffects`, `igniteAt`, `areaDamage` = H05, H01, H02 (the `addEffect` bookkeeping and effect expiry never read a unit); morale shock = H03 (plus `_tickMorale` loops over `units` and needs no rule: aloft units have morale like anyone, `fearless` air machines carry the tag); Zeus = H06 and the unhittable rule 3.6.7 (Zeus is suppressed while a stage is active).

**3.3.8 Radius margins (D-L18; `w.maxRadius` = 0 in every Ancient world, so every legacy constant is returned).**

| site | legacy | new | covers |
|---|---|---|---|
| world.js:224 `areaDamage` | `r + 1.8` | `r + w.mR` | blast centre outside a large hull |
| world.js:677 `_separate` | `a.radius + 1.8` | `a.radius + w.mR` | probe p6: 0.25% -> 0 missed |
| projectiles.js:118 `_collide` | `1.6` | `w.mProj` (`max(1.6, maxRadius + 0.6)`) | bullets and arrows enter a 2.2 u hull on time |
| ai.js:339 `nearestInReach` | `reach + u.radius + 1.2` | `reach + u.radius + w.mR12` | melee vs a tank |
| ray.js (M.md 3.8) | `qr = 1.6 + max(0, maxRadius - 1.0)` | unchanged | hitscan |
| ai.js:60 `pickTarget` | `scan` | `scan + w.maxRadius` for `info.m2b` units only | long-range scans |

### 3.4 The `_integrate` altitude model (M7)

**3.4.1 Vertical block.** Replaces `world.js:631-636` only for `u.layer !== 0` (`heightAt` is the bilinear smoothing of `cellHeight`, so the air target is `cellHeight + alt` smoothed over terrain steps and hover keeps the hard `cellHeight` like ground units); the layer-0 branch is the legacy block verbatim (same operations, same order).
```
// world.js tick(), hash rebuild (replaces 462-463)
hash.clear(); if (ahash) { ahash.clear(); nAloft = 0 }
for i: u = units[i]; if (!u.alive) continue;
   if (u.plane === 0) hash.insert(i, u.x, u.z); else { ahash.insert(i, u.x, u.z); aloft[nAloft++] = i }
// _integrate, vertical part
gy = arena.cellHeight(u.x, u.z)
if (u.layer === 0) { legacy: if (u.ky > 0 || u.y > gy + 0.02) {gravity} else {follow at <= G.groundFollow} }
else if (u.layer === 1) {                       // hover: no gravity, support surface = ground or liquid surface
   sup = arena.water > 0 ? max(gy, arena.waterY()) : gy
   if (u.ky > 0) { u.ky -= G.gravity*dt; u.y += u.ky*dt; if (u.y <= sup) { u.y = sup; impact = -u.ky; u.ky = 0; if (impact > 3) abilityHook('onLand', u, impact); if (u.state === ST.FLY) u.state = ST.IDLE } }
   else { dy = sup - u.y; st = G.hoverFollow*dt; u.y += clamp(dy, -st, st); u.ky = 0 }
   u.altitude = 0
} else {                                        // air: no gravity, ky ignored
   hh = arena.heightAt(u.x, u.z); n = hypot(u.vx, u.vz)
   look = n > 0.3 ? max(hh, arena.heightAt(u.x + u.vx/n*4, u.z + u.vz/n*4)) : hh          // cliff look-ahead
   goal = look + u.altGoal; c = def._ai.airc
   rate = (goal > u.y ? c.clm : c.dsc) * (disabled ? 1.5 : 1)                              // disabled = STUN/SLEEP/STONE/EMP/DOWN: controlled descent
   u.y += clamp(goal - u.y, -rate*dt, rate*dt); u.ky = 0
   u.altitude = max(0, u.y - hh); u.plane = u.altitude >= G.altPlane ? 1 : 0
}
```
Knockback (`kx kz`) acts on hover and air units horizontally like on anyone; `weather.speedMul` (via `mSpeed`) applies; the material speed factor does not (V02). Hover over water therefore floats at the water surface: `u.y = waterY`, `altitude = 0`, plane 0, immune (HZ6). An air unit spawned by `addUnit` (V01) starts at `heightAt + cruiseAlt` in state CRUISE, so placement needs no takeoff.

**3.4.2 Plane bookkeeping.** `plane` is written only here (end of the air branch) and by `addUnit`; hover and ground never change it. The hash rebuild reads it, so a landing unit joins `hash` on the tick after its altitude drops below 2.0 and a take-off unit leaves it the tick after it reaches 2.0. `w.nAloft` (count) and `w.aloft` (indices) are rebuilt every tick; both are 0 and untouched in Ancient worlds (`ahash === null`).

**3.4.3 Death and crash.** `_tickDying` keeps its gravity branch (`world.js:794-798`), so a dying air unit falls from its altitude (`sqrt(2*alt/22)` = 1.04 s from 12 u; validator: `sqrt(2*cruiseAlt/G.gravity) + 0.2 <= rigLinger`, `M.md` M17e). `killUnit` stores `u.altFall = u.altitude` for layer-2 units (guarded). At the first impact (`u.y <= gy`, once, flag `crashed`) with `altFall >= G.crashMin (3)`: event `explosion {kind:'crash'}`, `areaDamage(null, x, z, r = 2.5 + 0.2*radius, dmg = clamp(0.12*hpMax, 40, 160), h{type blunt, kb 6, cause 'crash', aoe, noBlock}, protect -1, y = gy+0.5)` (hurts both teams), `damageProps(x, z, r, 0.8*dmg)`, wreck prop per `def.wreck` (M17e). Corpses of hover units sink with the existing gravity branch (decor wreck on the support surface).

**3.4.4 Tick positions added by this file (normative; order of `M.md` 3.6 otherwise unchanged).** (1) hash rebuild: `hash` and `ahash`, `aloft`, `nAloft`, before the lanes; (2) ground lane, then coarse lane (never both Dijkstra in one tick); (3) `updateSquads` (class-aware, AIR march); (4) per unit: `refreshCover` (staggered), `think` (`airThink`, `rangedBehaviour` LOS gate), abilities; (5) `_integrate`: `_deflect`, `vehicleDrive`, accelerate, move, facing, `turretSlew`, vertical block (3.4.1), plane write; (6) `_separate`: ground-plane passes, then the aloft pass; (7) projectiles, `_tickEffects` (smoke mirror expiry); (8) `_tickDying` with the crash hook; (9) `_checkEnd`: unhittable sample (1 Hz) before the watchdog lines. Bookkeeping order inside a tick never depends on unit array order except where stated (`losBudget` is first come, with the id rotation of 3.10.4).

### 3.5 Nav move classes, clearance, field lanes (M7; WORLD supplies the arrays)

**3.5.1 Instances.** One ground `NavGrid` (cell 1 u, today's) carries, additionally, `walkH` (Uint8, hover medium at 1 u: slope <= 6 steps over the 2 x 2 terrain block, deep water and lava allowed, `walk:false` materials allowed, same prop `block`/`soft` arrays), `clear` and `clearH` (Float32, 3.5.2). Derived coarse instances (`kind 'hover'`, `kind 'clear'`, and the second clear instance with `need 3.75` that `spec/W` builds only when a ground def of radius > 2.35 exists; cell 2 u, `spec/W` 3.6.1) feed only the flow fields: coarse `walk` follows the `spec/W` table with `clear` sampled as the maximum of the 4 fine cells (the coarse centre is their common corner), i.e. `medium walk && !block && clearMedium >= need` for at least one of them; `block = max`, `soft = max` (hover: `soft` impassable; clear: passable at cost 30 as today's `compute`), `cost` = 2 x mean, `hs` = mean, `hazard = max`. `need` of a view: clear `CLEAR_NEED 3.0`, boss `BOSS_NEED 3.75`, hover `ceil4(max hover radius + 0.65)` with floor 1.5, all fixed at world construction from the defs. **Local movement never uses the coarse arrays**: `canMoveC` tests the fine arrays with the unit's own `clearReq`. When `navs.hover` and `navs.clear` are array-equal (no deep water, no lava, no `walk:false` materials, equal `need`) the HOVER class aliases the CLEAR field objects (`cf[1] = cf[2]`), the rotation lists them once, and coarse freshness doubles (12 ticks).

**3.5.2 Clearance map.** `clear[i]` = Euclidean distance in nav cells from the centre of cell `i` to the nearest blocked-cell centre, where blocked = `!walk[j] || block[j]` (soft ignored, pathing semantics, as `spec/W`) and the ring just outside the arena is blocked (so border cells read 1.0); `clearH` the same with `walkH`. Invariant **I-clear**: `min(clear, 6) == min(trueDistance, 6)` for every cell after any sequence of edits (values above 6 may read 6 after a window update; a full build writes the true value). `buildClear()` = exact EDT (Felzenszwalb, two 1-D passes over a (n+2)^2 padded grid): large arena **1.0-1.3 ms** on every map tried (marathon 1.03, styx 1.14, troy 1.22, thermopylae 1.26), within the 1.5 ms of `spec/W`. `updateClear(rect)` = EDT on the dirty rect expanded by 12, written back on the rect expanded by 6 (cells outside the EDT rect but inside the arena are `INF` = unknown, outside the arena blocked): **48 us** for a 6 x 6 dirty rect, **286 us** for 32 x 32, 0 mismatching cells against a fresh full build after 200 random edits (probe p1c). Per-unit `clearReq = ceil4(radius*scale + 0.65)` (nearest 0.25 up): r 1.6 -> 2.25, r 2.2 -> 3.0, r 3.0 -> 3.75. Worked corridor (centre-line `clear` per cell, probe p1b, expressed in these units): width 3: 1.0 / 2.0 / 1.0; width 4: 1.0 / 2.0 / 2.0 / 1.0; width 5: 1, 2, **3**, 2, 1; width 6: 1, 2, **3, 3**, 2, 1; width 7: 1, 2, 3, **4**, 3, 2, 1. So `fx_tank` (need 3.0) passes a 5-cell corridor on one lane and a 6-cell corridor on two lanes, which is why the corridor rule is >= 6 (`spec/W` R-V1). Chamfer is rejected: it overestimates by up to 0.443 cells and disagrees with the exact map on 58-141 cells at the boss threshold (probe p7, PC-L4).

**3.5.3 WORLD API (additive, `docs/requests/world_nav_views.md`).** `NavGrid`: `walkH`, `clear`, `clearH` allocated lazily by `ensureLayers()` (called by `World` when `layerFlags & 3`); `rebuild(rect)` also writes `walkH`; `buildClear()`; `updateClear(rect)`; `deriveCoarse(fine, rect)`; `walkableC(mc, req, x, z)` (`mc` 0: today's `walkable`); `canStepC(mc, req, ax, az, bx, bz)` (`canStep` with the medium arrays, step 1.5 for hover, plus `clear[j] >= req`); `clearLineC(mc, req, x0, z0, x1, z1)`; `sameAs(other)` for the alias test. No allocation after construction; `FlowField` is untouched.

**3.5.4 Use in the movement code.** `_canMove` becomes `if (u.mc === 0) <legacy lines 662-669> else canMoveC(u, ...)` where `canMoveC` = `inside && (same cell || canStepC(...) || (walkMedium[j] && !block[j] && !soft[j] && clearMedium[j] >= u.clearReq && |hs diff| <= step))`; the same `mc` switch is applied at N01-N23/C01-C05. `_deflect` uses `look = max(0.9, radius + 0.6)` for `mc !== 0`. `steer` falls back to `fieldFor(u.team, u.mc)`; AIR units call `airSteer` (3.6.5) and never enter `_canMove` (they skip `_deflect` and the `_canMove` block in `_integrate`; only `nav.inside`). Invariant **S9v** (checked every tick by the test harness): no live non-air unit's centre lies in a cell with `clearMedium < u.clearReq`, except units placed there by knockback or `editTerrain` displacement (M.md M12 rule).

**3.5.5 Field lanes (D-L5, D-L6).** Reference algorithm (the p4 model is promoted to `tests/fixtures/field_sched_model.mjs`; the real scheduler must produce the same job trace):
```
// tick(), replaces world.js:465-466
fieldTimer = (fieldTimer || 0) - 1; ranGround = false
if (fieldTimer <= 0) {
  recomputeCentroids(); t = _fieldTeam
  if (layerFlags && dirtyG[1-t] && !dirtyG[t]) t = 1 - t                  // dirty-first: new-era worlds only
  refreshFields(_fieldAll ? undefined : t); dirtyG[t] = false
  _fieldAll = false; _fieldTeam = t ^ 1; fieldTimer = G.navRefresh; ranGround = true
}
if (layerFlags & 3 && --coarseTimer <= 0 && !ranGround) { coarseJob(); coarseTimer = nFields > 4 ? 4 : G.coarseRefresh }   // coarseTimer starts at 3
coarseJob(): rot = [(HOVER,0),(CLEAR,0),(CLEARB,0),(HOVER,1),(CLEAR,1),(CLEARB,1)] minus empty (nCls[team][mc] == 0) minus aliased duplicates
   pick = first entry with !field.valid ; else first dirtyC entry from `coarseCursor` ; else rot[coarseCursor % len]
   coarseCursor = pick + 1 ; refreshField(team, mc)                         // 1 Dijkstra
refreshField(team, mc): sources = cells (in the class instance) of enemy plane-0 units (dedup by stamp); if none, enemy aloft units; compute(src, n, 1e9, null)  // no crowd term
start(): refreshFields() as today + refreshField for every non-empty (team, class)     // one-time spike, during the countdown
```
`markNavDirty(x0, z0, x1, z1, mask = 1)` (the M10 signature; world units): clip to a nav rect; `if (mask & 2 && layerFlags & 3) { nav.updateClear(r); for each existing coarse instance (hover, clear, clearB) deriveCoarse(nav, r); re-test the alias }`; `if (mask & 1) dirtyG = [true, true]`; `if (mask & 2) dirtyC[*] = true`; it never clears `valid`, never sets `fieldTimer`. The caller has already run `nav.rebuild(rect)` and the prop un/stamp (M10, M12). Consequences: (1) **ground**: unchanged cadence, a dirty team is taken first, both teams are fresh within 12 ticks of the mark; (2) **coarse**: refreshed within one rotation (<= 24 ticks, <= 12 when aliased or only two fields exist); (3) **<= 1 Dijkstra per tick** after `start()` (the coarse job is deferred one tick when the ground lane ran; the deferral shifts the coarse phase for good, so it is paid once); (4) 40 coalesced prop deaths in one tick = 1 `markNavDirty`, 1 `updateClear` (<= 0.3 ms), 0 extra jobs. Ancient (`layerFlags === 0`): the ground lane executes today's statements; the first ground job is at tick 1, then 7, 13, ... alternating teams (fixture `tests/fixtures/field_trace_ancient.json`, 40 entries, recorded from the baseline worktree).

**3.5.6 Measured costs (this box, thread CPU, noise about 10%; reference box = measured / k with k = 1.9, `M.md` 3.13).** One Dijkstra on the 128 x 128 nav: marathon 3.36 ms, styx 3.81, troy 4.26 (with `crowd` 3.9-4.1); 96 x 96: 2.15; 64 x 64: 0.93. Coarse field (64 x 64, large): **0.82-0.83 ms** (0.46 on 48 x 48, 0.19 on 32 x 32) = 0.44 reference ms, which is the "2.0 ms / 4" of `M.md` 3.13. Coarse view derive (full): 0.26-0.32 ms. Per-tick amortised at large: ground (Ancient, existing) 2 x 3.4 / 12 = 0.57-0.7 ms here; coarse 4 x 0.83 / 24 = **0.138 ms here = 0.073 reference ms**; two fields (Modern, CLEAR only) 0.07 here. The M7 share therefore needs the coarse lane at 24 ticks and cannot afford a second fine field pair (0.31 ms).

**3.5.7 Max-age test.** `m08_fields` runs the Sci-Fi-like fixture (marathon large, 600 units: 300 + 300 each with 60 hover tanks, 60 CLEAR vehicles, 20 drones, rest infantry) for 1800 ticks, with 1.5 random `markNavDirty` calls per second and one legacy `invalidateFields()` at tick 1000, and records at the end of every tick the age `tickN - fieldLast` of every needed field. Pass: ground max <= 12 (model: 11), coarse max <= 24 (model: 23), `jobsPerTick <= 1` after the first tick, `valid` true for every needed field at every tick after the first coarse slot, and the job trace equals the model's. A second run adds one ground boss (`clearReq` 3.75, class 4): 6 coarse fields at cadence 4, coarse max <= 24 still holds.

### 3.6 Air AI (M7)

**3.6.1 Hook.** `think()` (`ai.js:142`): after the hard-disable and timed-state blocks and the `u.controlled` return (line 181), `if (u.mc === 3) { airThink(w, u, dt, sq, speedBase, info); return; }`. A hard-disabled aloft air unit (STUN, SLEEP, STONE, DOWN, EMP) gets `altGoal = 0` and zero velocity in the existing block (controlled descent at 1.5 x `dsc`, plane 0 below 2.0 u so it can be hit by melee); on recovery it re-enters through TAKEOFF. `airThink` sets `dvx dvz face altGoal state` and calls `startRanged` / `startMelee` with the same gates as ground units (`rangedReady`, M8 `aimOk` for aim-gated weapons), so reload, burst, ammo and statuses work unchanged.

**3.6.2 Target masks (D-L10; precomputed in `aiInfo`, never `tags.includes` in a loop).** Per def: `hitGround` (any melee, or ranged with `air !== 'only'`), `hitAloft` (ranged with `air !== false`), `hitLanded` (any weapon). `canTarget(info, c) = c.layer !== 2 ? info.hitGround : (c.plane === 1 ? info.hitAloft : info.hitLanded)`; `air:'only'` weapons additionally skip plane-0 targets whose `layer !== 2` in projectile collision (H08). Range checks against an aloft target use `gap3 = hypot(2D gap + radii, dy)`; the projectile solver already pitches. Hitscan rays query `ahash` when `nAloft>0 && air !== false` (cross-module requirement R-M2: `ray.js` second window).

**3.6.3 Class table (`AIR_CLASS`, code constants in `air.js`; speeds and ranges come from the def and obey `spec/W` 3.7.1: air cruise <= 8.0, dragon 4..6, helicopter 6..8).**

| class | cruiseAlt range (u) | attack alt | pattern | standoff / orbit | climb / descend (u/s) | heading | landing | melee |
|---|---|---|---|---|---|---|---|---|
| `heli` | 6..9 | 0.75 x cruise | `hover` | 0.85 x range | 4 / 5 | `face` | forced only | none |
| `gunship` | 8..12 | 0.70 | `orbit` | R = clamp(0.70 x range, 6, 0.9 x range) | 4 / 5 | `face` | forced only | none |
| `drone` | 3.5..5 | 0.80 | `orbit` | R = max(6, 0.55 x range) | 6 / 7 | `face` | forced only | none |
| `dropship` | 10..14 | 1.0 | `none` (door gun: `hover`) | - | 3 / 4 | `face` (nose on the course when it has no target) | forced only | none |
| `dragon` | 8..14 | 0.60 | `run` | overshoot 0.6 x range | 3.5 / 5 | `vel` | hp 66%, 33%; every 25 s; forced; dur 8 s | landed only |
| `wyvern` | 7..11 | 0.50 | `run` + `dive` | overshoot 0.5 x range | 4 / 6 | `vel` | forced only | dive (altitude 1.5) |

`turnRate` (0.8..4.0) and `accel` (2..8) are mandatory on air defs (`E_RANGE`); `hdg:'face'` classes keep `face` on the target while the velocity is independent (strafing), `hdg:'vel'` classes set `dv = heading-direction x speed` and `face` to the desired course, so they fly arcs limited by `turnRate`. Attack altitude = cruise x factor and must be >= 3.0 (`E_RANGE`), above `ALT_PLANE`, so attackers stay out of the ground hash.

**3.6.4 State machine (`u.airState`; event `unit_air_state` on every change).**

| state | altGoal | behaviour | exits (first match) |
|---|---|---|---|
| 0 CRUISE | cruise | follow the squad slot / `airObjective`, no target | target within `aggro` -> APPROACH; unarmed -> ESCORT; order retreat, ROUT, or hp < 25% (not boss) -> RETREAT; land trigger -> LAND |
| 1 APPROACH | attack alt | fly to the attack point (3.6.5); entry draws `rf.air` once (approach jitter +-0.35 rad) | point reached -> ATTACK; target lost -> CRUISE; 12 s -> CRUISE (re-pick); wyvern and gap <= 12 and melee ready -> DIVE |
| 2 ATTACK | attack alt | pattern fire: `hover` hold at 0.85 x range facing the target, fire when `fdiff < 0.4` (or `aimOk`); `orbit` circle and fire while moving (broadside gate, 1.2 rad); `run` fly through and fire while `gap <= 0.98 x range` and `fdiff < 0.4` | `hover`: gap > 1.15 x range or target dead -> APPROACH/CRUISE; `orbit`: target dead -> CRUISE, new target -> APPROACH; `run`: passed the target by overshoot or 6 s -> BREAK |
| 3 BREAK | cruise | straight on 0.5 s, then turn at `turnRate` toward the next approach point (1 draw of `rf.air` for the turn side) | distance from the target >= 0.9 x range + 15 or 8 s -> APPROACH (target alive) or CRUISE |
| 4 DIVE | 1.5 | descend at `dsc` toward the target; `startMelee` when `altitude <= 2.5` and `gap <= reach` | strike done (WINDUP ended) or 4 s -> BREAK (climbs at `clm`) |
| 5 LAND | 0 | fly to the landing spot, descend inside 10 u; spot = first free of 8 positions around the target at `t.radius + radius + 0.8 x melee.range`, 45 deg steps from the bearing target-to-self, accepted by `walkableC(CLEAR, req)`; none -> abort, cooldown 10 s; a forced landing has no target: the search runs around the nearest enemy ground-plane unit at 6 u, else below the unit | altitude <= 0.2 and within 1.0 u -> GROUNDED |
| 6 GROUNDED | 0 | plane 0, `hold`; legacy `meleeBehaviour` (and `rangedBehaviour` for the breath) with speed x0.5 inside a 5 u leash of the spot; `landT` counts down from `dur` | `landT <= 0`, or hp lost since landing >= 15% of `hpMax`, or no enemy within 14 u for 3 s -> TAKEOFF (unless `forceLand`) |
| 7 TAKEOFF | cruise | climb at `clm`, no target | altitude >= 0.8 x cruise -> CRUISE |
| 8 RETREAT | cruise | fly from `centroid[enemy]` toward the own zone centre at 1.3 x speed; holds an orbit there | order `advance` and not ROUT -> CRUISE |
| 9 WITHDRAW | cruise | fly to the nearest arena edge at 1.5 x speed | `nav.inside` false by 2 u -> `withdrawUnit` |
| 10 ESCORT | cruise | unarmed: hold 12 u behind the own `centroid` along the axis, flee any enemy `hitAloft` unit within 30 u at 1.3 x speed | no armed ally for `unarmedGrace` 4 s -> WITHDRAW |

Land triggers of the dragon (D-L13): `hp` crossing 0.66 and 0.33 of `hpMax` (once each, `u.landMark` bits), or `time since last landing >= 25 s` while >= 3 enemy ground-plane units that cannot hit aloft stand within 20 u of the dragon (counted from `hash` with the precomputed `info.hitAloft`), or `forceLand`. Barks `air_land` on LAND entry, `air_withdraw` on WITHDRAW entry (3.12).

**3.6.5 Geometry and the analytic steer.**
* **hover**: attack point = target + 0.85 x range along the bearing target-to-self; hold with a velocity law `v = k (P - u)` clamped to speed, `k = 1.2`; `face` = bearing to the target; inside [0.7, 0.95] x range the desired velocity is 0.
* **orbit**: centre = target position sampled every 6 ticks (`orbX orbZ`); angle `th = atan2(u.x - cx, u.z - cz)`, direction `s = u.sideSign`; look-ahead point `P = C + R (sin(th + s * 3 * v * dt / R), cos(...))`; `dv = norm(P - u) * speed + 0.8 (R - d) * radial`; period `2 pi R / v` (gunship R 21, v 7: 18.8 s); fire when `|angleDiff(heading, bearing)| < 1.2` (broadside) because `hdg:'face'` keeps the nose on the target.
* **run**: course `a = norm(T - u)` fixed at APPROACH entry plus the jitter; start point `T - a x 1.1 x range`; velocity along the heading, `face` = course; firing from `gap <= 0.98 x range`; BREAK when the signed distance past the target exceeds `overshoot x range` or after 6 s.
* **airSteer(u, tx, tz, speed)**: `dv = norm(T - u) x speed`; if `!nav.inside(u + dv x 3)` slide along the boundary tangent; nothing else (props and terrain are flown over; altitude is `altGoal` above the look-ahead terrain). **airDir(u, out)**: unit vector to `airObjective(team)` = nearest enemy of any plane to the squad anchor, else `centroid[enemy]`, else `airCentroid[enemy]`.
* Friends are kept apart by the aloft `_separate` pass (Z02).

**3.6.6 Unarmed, retreat, withdraw.** An air def with neither `melee` nor `ranged` enters ESCORT at spawn; with an armed ally alive it behaves as a hovering observer (its death is a normal kill). `withdrawUnit(u)`: `alive = false`, `stats[team].alive--`, `dead++`, `deadCost += cost`, `aliveCost -= cost`, no `unit_kill`, no kill credit, no morale shock, no bark, `deadT = 99` so `_tickDying` drops it at once, event `unit_withdraw`.

**3.6.7 Termination rule for unhittable remnants (D-L15).** Run in `_checkEnd` before the watchdog lines, when `tickN % 30 == 0` and `layerFlags & 4` (never in Ancient). Per team count once: `gAtk` (units that can hit a layer-0/1 target: any melee, or ranged with `air !== 'only'`), `aAtk` (ranged, `air !== false`), `mAtk` (any melee), and for targets `gT` (layer < 2 alive), `aloftT`, `landedT` (layer 2 by plane). `canHit[t] = (gAtk[t] && gT[o]) || (aAtk[t] && (aloftT[o] || landedT[o])) || (mAtk[t] && landedT[o])`. `stuck = both teams alive && !canHit[0] && !canHit[1]`. `T0` = the time of the first stuck sample (`unhitT0 = -1` otherwise; two consecutive unstuck samples reset it).

| stage | when | action | event |
|---|---|---|---|
| 0 | `T0` | start the clock; the legacy idle clock becomes `time - max(lastDamageT, T0)`; `zeusIntervene` is suppressed while stage > 0 | - |
| 1 | `T0 + 6 s` | every aloft air unit of every team gets `forceLand` (state LAND); bark `air_land` | `air_remnant {team, 1, t}` |
| 2 | `T0 + 18 s` | air units still alive (landed or not) go to WITHDRAW; ground-plane stuck units hold | `air_remnant {team, 2, t}` |
| 3 | `T0 + 30 s` | `withdrawUnit` for every remaining unit of every team that cannot be hit | `unit_withdraw`, `air_remnant {team, 3, t}` |

Both teams are processed in a stuck state (by definition neither can hit the other); a team that can hit is never processed, because then the state is not stuck and it simply grinds the other side down. Worst case from the last hittable contact to `battle_end`: 1 s sampling + 30 s + 1 tick = **31.1 s** (strictly under `M.md`'s 62 s). Examples: unarmed dropship vs melee army: landing at +6 s, melee kills it on the ground (hittable again, `unhitT0` resets) or it withdraws by +30; dragon vs pikes: never stuck (the dragon is armed, `canHit[dragon side]` true) and its landing triggers (D-L13) make it killable; gunship vs `air:false` army: not stuck (the gunship hits ground), ends by elimination.

**3.6.8 AA guarantee (D-L16; `airrules.js`, pure, no RNG).** `isAirDef(d) = d.layer === 'air'`; `canHitAir(d) = !!d.ranged && d.ranged.air !== false`; `aaDedicated(d) = canHitAir(d) && d.ranged.range >= 25`. `generateOnce` calls `airGuarantee(counts, ctx)` after the top-up loop and before the cap trim (`armygen.js:347-367`), only when the pool contains an air def (`ctx.eraHasAir`; Ancient: no call, no draw, G7 unchanged): need15 = `ceil(0.15 x total)` units with `canHitAir`; needA = `max(1, ceil(airN / 8))` units with `aaDedicated` when `against` contains `airN > 0` air units; while short, swap the cheapest non-hero non-boss unit that does not satisfy the missing requirement for the cheapest affordable pool unit that does (ties by id), merging two removals when the budget requires; stop when nothing affordable. `validateMission` (era-aware, `campaign_validate.js:15`) gains `V-AIR`: enemy groups, placements, `script.waves` or script `spawn` ops contain an air def, and the roster is an array with no `canHitAir` def (or `null` and the era has no `aaDedicated` def), or the stored `reference` fields fewer than `ceil(airN/8)` `aaDedicated` units. Both consumers call `missionAirProblems(m, defs)` / `airGuarantee` from the same module.

**3.6.9 Fuzz cases added to S11/S12/S23 (`metrics.slow.test.mjs`, `tools/balance.mjs fuzz`; 200 seeds each, marathon large and the era's own arenas).** `F-DRAGON-MELEE`: 60 pike/knight vs `fx_dragon` alone (nobody can hit it aloft); `F-DRAGON-ARCH`: 24 archers vs `fx_dragon`; `F-DROPSHIP`: 40 infantry without AA vs 2 `fx_dropship` + 10 infantry; `F-GUNSHIP-NOAA`: tanks and howitzers (`air:false`) vs 4 `fx_gunship`; `F-DRONES`: 12 drones vs 12 drones (every pair can hit); `F-EMPTYSKY`: drones only vs unarmed infantry. Thresholds in section 4 (`L-REM`).

### 3.7 Squads: single class, air cohesion, vehicle cohesion (M7; q3_engine 6, 28)

**3.7.1 Single-class rule and rows.** A `Squad` is built from one `defId` (`addSquad(defId, ..)`, `addPlacements` keys groups by `squadId + ':' + defId`, `world.js:297-318`), so every member has one `layer`, one `mc`, one `clearReq`; `Squad` gains `mc` and `clearReq` (from the first member, asserted equal in dev worlds: `addUnit(.., {squad})` throws if `squad.defId !== def.id`). Placement arrays from editors and share codes that reuse a `squadId` for two defs are already split into two squads by `addPlacements`; the contract validator rejects them anyway (`E_SQUAD_MIX`) so the stored army shows what will happen. Rows: `squadSize` vehicle 3, air 2 (`def.squad` overrides, M.md 3.9), `GROUP_MAXTYPES` vehicle 3, air 2, layout lines `armor` (after `front`) and `air` (after `rear`; placed on the ground, spawned at altitude by V01).

**3.7.2 Air squad march (pass B of `updateSquads`, `sq.cls === CLS.AIR`).** `T = centroid[enemy].n ? centroid[enemy] : airCentroid[enemy]`; `dir = norm(T - anchor)`; `sp = sq.minSpeed * lagF`, then `sp *= sq.engF > 0.2 ? 0 : 0.5` when any member is engaged; `anchor += dir * sp * dt` if `nav.inside`; no `walkable` test, no breach target, no line alignment, `sq.d = hypot(anchor - T)` (information only); facing slews at `clamp(2.8/halfW, .3, 1.6)` as today. Members follow `followFormation` with the slot's altitude offset `altSlot = ((slotIndex % 3) - 1) * 0.8` added to `altGoal`, catch-up cap 1.35 x speed. A member that chases a target farther than 25 u from the anchor is released from the slot (existing `engaged` logic) and rejoins when its target dies.

**3.7.3 Formations and vehicle cohesion.** New offsets in `formations.js` (squad frame, lx left, lz forward, centred): `armor` = two ranks, `ceil(n/2)` wide, spacing `max(3.0, 2.05 * radius)` (`spec/W` 3.6.5); `vee`: leader (0,0), member `i >= 1` at `(side * k * s, -0.8 * k * s)`, `side = i odd ? +1 : -1`, `k = ceil(i/2)`, `s = max(3.0, 2.5 * radius)`; `spread`: line abreast at spacing `1.2 * s`. Defaults: vehicles `armor`, air `vee` for n >= 3 else `spread`. Cohesion rules for `mc !== 0` squads: lag throttle `lagF` unchanged; jog factor 1.0 (`sq.jog`, ground squads keep `G.jogMul`); catch-up cap of members 1.2 x speed when 5 u or more behind its slot, 1.1 otherwise (ground: 1.7 / 1.35); `sumD` participation by Z04; `engF` slow-down unchanged (x0.28 when >= 25% engaged), so a column waits for the infantry line and the infantry line waits for the column.

### 3.8 M8: vehicles, turret, armour faces, crew, wrecks (S39, #14)

**3.8.1 Drive classes and the hull rule (D-L19).** `info.drive` from the tag (`aiInfo`). `vehicleDrive(u, dt)` runs in `_integrate` after `_deflect` and before the acceleration step, for units with `info.drive`; AI code sets `u.dvx/dvz` and (for turret defs) `u.aimWant` instead of re-facing the hull: `rangedBehaviour` line 355 `u.face = want` becomes `if (def.turret) u.aimWant = want; else u.face = want;` (the `steer()` hull facing from the movement vector stays).

| drive | speed factor `f(d)`, `d = abs(angleDiff(heading, moveDir))` | hull turn rate (rad/s) | pivot | reverse |
|---|---|---|---|---|
| `wheeled` | `max(0, cos d)`; `d > 1.2` -> 0.15 (three-point crawl) | `turnRate * (0.6 + 0.4 * speedNow / speed)` | no | yes |
| `tread` | `d <= 1.2`: `sqrt(max(0, cos d))`; `d > 1.2`: 0 | `turnRate`; pivot in place at `1.5 * turnRate` when `d > 1.2` | yes | yes |
| `hover` | `0.55 + 0.45 * max(0, cos d)` | `1.5 * turnRate` | strafes | no |
| `walker` | 1 | `turnRate` | n/a | no |

```
vehicleDrive(u, dt):
  sp = hypot(dvx, dvz); eng = u.engaged && u.target
  moveDir = sp > 0.05 ? atan2(dvx, dvz) : heading ; d = angleDiff(heading, moveDir)
  if (info.rev && eng && abs(d) > 2.3 && sp <= speedBase*mSpeed*1.01 && (u.revT > 0 || u.revD < G.reverseMax)):   // enemy ahead, desired motion straight back
       dv = -forward(heading) * sp * G.reverseK ; face = heading ; revT = 0.5 ; revD += |v|*dt          // reverse: do not turn
  else { if (u.revT > 0) u.revT -= dt ; if (u.revT <= 0) u.revD = 0
         dv *= f(d) ; face = sp > 0.05 ? moveDir : (eng ? u.aimWant : heading) }                           // present front when standing and engaged
  hullRate = (sp <= 0.05 && eng) ? (def.turret ? def.turret.hullTurn : turnRate) : (hover ? 1.5 : 1) * turnRate                          // `_integrate` uses u.hullRate || def.turnRate
```
Reverse is limited to 8 u per manoeuvre (`reverseMax`) at 0.5 x speed, entered only while the enemy is ahead and the AI wants to move backwards (kite gap, `minRange` back-off, standoff correction); `retreat` orders and rout turn the hull instead. **Present-front**: a stationary engaged vehicle rotates its hull toward the target at `turret.hullTurn` (default `turnRate`) until `abs(angleDiff(heading, want)) < 0.15`, so the strongest armour (`front`) meets the threat; a moving vehicle keeps the hull on its course and relies on the turret. Examples (tests): `fx_tank` ordered east with a target north: after 3 s heading within 0.3 rad of east, `aim` within `aimTol` of north (hull did not follow the target); stopped, the hull reaches north in `(pi/2)/1.0 = 1.6 s`; tread U-turn `pi/(1.5*1.4) = 1.5 s` with speed 0; `fx_apc` U-turn 4.3 s with crawl 0.15; `fx_hover_tank` strafes at >= 0.55 x speed with the nose on the target.

**3.8.2 Turret slew model (D-L20).**
```
turretSlew(u, dt)           // end of _integrate, after the heading update; def.turret only
  t = def.turret ; want = u.aimWant (target bearing; the AI/possession sets it; idle: heading)
  rel = angleDiff(heading, u.aim) ; goal = clamp(angleDiff(heading, want), -t.arc, t.arc)
  rel += clamp(angleDiff(rel, goal), -t.rate*dt, t.rate*dt) ; u.aim = wrap(heading + rel)
  u.aimOk = (abs(angleDiff(u.aim, want)) < G.aimTol && abs(angleDiff(heading, want)) <= t.arc + G.aimTol) ? 1 : 0
```
`arc` is the traverse half-angle: `3.14` = full circle, `fx_td` 0.35 = fixed casemate (hull must turn). Times: `fx_tank` (rate 1.2) 90 deg 1.31 s, 180 deg 2.62 s; `fx_mech` (rate 3.0, arc 2.2) 180 deg is outside the arc, so the legs turn. `aimOk` uses this tick's heading, the gate in the next tick's `think` (one-tick latency, deterministic). `u.aim` is published for `meta.aimParts` (RENDER), and recoil is a render pulse per `projectile_launch`.

**3.8.3 Firing gate and setup time (D-L24).** `rangedReady(u) = u.cdR <= 0 && u.ammo !== 0 && u.setupT <= 0 && (def.turret ? u.aimOk : true)`; non-turret units keep the heading test `fdiff < 0.4` in their callers (Ancient unchanged), turret units drop it. Call sites to edit (`grep` pinned by M.md): `ai.js:275` (breach shot), `ai.js:333` (melee side-arm, `fdiffOk`), `ai.js:373` (`rangedBehaviour`), `possession.js:67`, plus `airThink`. **Setup** (`ranged.setup` 0.5..8 s, M.md 3.8): `setupT = moving ? r.setup : max(0, setupT - dt)` where moving = `speedNow > 0.3 || |dv| > 0.1`; fixtures: mortar 2.0, AT gun 1.5, HMG tripod 1.2, howitzer 4.0. Added here: (1) an engaged crew weapon in range stands still (the existing hold branch), a siege unit that stops with its squad starts deploying at once; (2) `u.setupT` and `r.setup` are published, deploy phase = `1 - setupT/setup` (RA/ANIM derive the clip; the sim requests no extra clip); (3) stagger and stun do not reset `setupT`, any displacement above the moving threshold does; (4) possessed crew weapons obey the same gate and the HUD ring shows the phase; (5) test: first shot no earlier than `setup` s after the unit halts, and a second march resets it.

**3.8.4 Armour face resolution and the M1 hand-off (D-L21).** `armor.js` `resolveFace(dst, o, ax, az)`, called by the M1 pen step when `dst.def.armorFace` and `o.face < 0`:
```
if (o.aoe) return 3
bx,bz = o.hasDir ? (-o.dx, -o.dz) : (ax - dst.x, az - dst.z) ; l = hypot(bx, bz) ; if (l < 1e-6) return 0
sy = isNaN(o.fy) ? (src ? src.y + src.height*0.7 : dst.y + dst.height*0.5) : o.fy
if (atan2(sy - (dst.y + dst.height*0.5), l) > 0.6) return 3                       // above 34.4 deg: top
rel = abs(angleDiff(dst.heading, atan2(bx, bz))) ; return rel < PI/4 ? 0 : rel < 3*PI/4 ? 1 : 2
```
Bins: azimuth from the hull front 0..44.99 deg front, 45..134.99 side, 135..180 rear; a helicopter at altitude 6 (shot origin y = 6 + 0.7 x 2.5 = 7.75, tank centre 1.1) shooting from 12 u horizontal arrives at 29 deg (front, side or rear by azimuth), from 8 u at 39.7 deg (top). `projectiles._hitUnit` sets `o.fy = p.py`; melee and beams use `src`. Event `unit_flanked {id, src, face}` for faces side and rear on vehicles, at most one per 2 s per unit (`u.flankEvT`). Worked examples with `fx_tank` (front .9, side .6, rear .3, top .3) are `M.md` 3.7; the M8 test adds the geometry: rifle shots from 24 azimuths x 4 elevations land in the bins above, and shots to kill the 2000 hp tank: rifle front 3572, rear 250 (ratio 14.3); sniper front 115, rear 36 (ratio 3.25).

**3.8.5 Friendly fire and large bodies (D-L26).** `muzzle` default for `mc !== 0` is `[radius + 0.4, 0.72*height, 0]`; `p.grace = clamp((2*radius + 0.6)/max(speed,1), 0.1, 0.4)` s set in `fire()`, decremented per sub-step; `_collide` skips same-team units while `p.grace > 0` (the shooter itself is already skipped). Test: 6 `fx_tank` abreast at spacing 4.5 u with `rules.friendlyFire` and 100 volleys: 0 same-team hits during the first 0.4 s of flight (legacy muzzle 0.5 u: neighbours' circles contain the spawn point).

**3.8.6 Crew bailout (D-L22; mechanics `M.md` M13, accounting M14).** Def: `abilities:[{id:'summon_on_death', mode:'bailout', spawn:<crew def>, count, hpFrac:0.6, spread:2.2, invuln:0.6}]`; counts: tank 3, APC 4, runabout 2, mech 1, hover tank 0 (no hatch), air 0. `applyDamage` stores `dst.overkill = -dst.hp / dst.hpMax` right after `dst.hp -= fin` (one store). In `onKilled`: bail out iff `u.overkill < G.bailOverkill (0.35)` and `cause` not in `{strike, crash, fall, drown, lava, stone, emp}` (`emp` never kills; `mine` and `bullet explosion energy ranged aoe melee fire crush` may). Positions: ring radius `radius + 0.9`, angles from the rear (`heading + pi`) `[0, +0.7, -0.7, +1.4, -1.4]` rad; each position must satisfy `nav.walkable` (ground fine arrays); try `radius + 1.2` once; otherwise that crew member does not exist (a hover tank over a lake, a tank on a bridge edge). Spawn via `w.addSquad(spawn, team, n, cx, cz, {formation:'circle', rng: w.rf.spawn, reinforce:true})`; each member: `ST.GETUP` 0.9 s, `hp = hpFrac * hpMax`, `invulnT = 0.6` (honoured by one compare at the top of `applyDamage`), `spawnKind = 1`, loose squad order `advance`. **Accounting** (restating M14): `startCount`, `startCost` unchanged, `stats[t].spawned++`, `spawnedAlive++` (decremented on death), eliminate progress uses `alive - spawnedAlive`, `_tickMorale` fractions the same, the star "half the army alive" uses the roster only. Events: one `unit_bailout {id, def, n, x, z}`, plus each crew member's ordinary `unit_spawn`. Test fixture: `fx_tank` dies at overkill 0.1 with 3 free cells: 3 crew, `startCount` equal before and after, `spawnedAlive == 3`, progress never decreases over the next 10 s; at overkill 0.5: 0 crew; on a lake: 0 crew.

**3.8.7 Wrecks (D-L23; `M.md` M17e).** `def.wreck` -> `spawnProp(type, x, z, {decor:true})` on death (vehicles at the hull position, air units at the crash impact): `blocks:'none'`, `cover:false`, `low:false`, ttl 25 s, world cap 24 (oldest removed), smoke emitter is render-only, not in `_indexProps`, not in `propCells`, never stamped in any nav array. Test `V-WRK` (extends `spec/W` 3.6.5): 20 wrecks on the centre-line of the narrowest 6-cell corridor of three recipes; assert (a) `block`, `soft`, `walk`, `clear` arrays bit-equal before and after, (b) six `fx_tank` pass within the same `T`, (c) `markNavDirty` is not called by wreck spawn (spy count 0); negative control: spawn them without `decor` -> (a) fails.

**3.8.8 The M7/M8 seam (q3_engine 31, q2_engine Q9d).** M7 delivers gunship fire as **face and fire**: `hdg:'face'` classes keep the nose on the target, the gate is the legacy `fdiff < 0.4` (hover) or the broadside gate 1.2 rad (orbit), no turret. M8 re-opens air units **only** for defs with `turret`: such an air def (Sci-Fi gunship with a chin gun) uses `turretSlew`/`aimOk` while its hull flies a tangent course, and `rangedReady` consults `aimOk` as for ground vehicles. Test lists: M7 (`m08_air`): hover heli fires only after the nose is within 0.4 rad of the target; orbiting gunship fires with the target off the nose by up to 1.2 rad and not beyond; heading stays within 0.4 rad of the target bearing for the whole orbit (face-and-fire); drone orbit radius within 1.0 u. M8 (`m14_vehicles/seam`): a turreted gunship with `arc 3.14` holds `abs(angleDiff(heading, bearing)) > 1.0` while `aimOk` is true and fires; with `arc 0.35` it fires only when the hull points within 0.35 + `aimTol`; an unturreted gunship is unchanged by the M8 landing (digest equal across the M8 landing, `inert` test).

### 3.9 Possession per class (M8; q1 ENGINE-Q16, PRODUCT-Q8)

**3.9.1 Classes.** `pclass(def)`: `air` (mc 3), `vehicle` (turret and drive wheeled/tread/hover), `mech` (turret and drive walker), else `ground`. Controlled units skip the AI (`ai.js:181`); `Possession.tick` writes `dv face aimWant altGoal` itself and releases on death, stun, sleep or stone (EMP counts as stun, M6b).

**3.9.2 Ground ranged and melee.** Without `aim`: today's behaviour bit for bit. With `aim` (cursor ground point): target = nearest enemy to the cursor within 4 u (not cloaked beyond its detect range, `canTarget`), inside weapon range + 1; the unit faces the cursor while `attack` is held and may strafe (movement independent of facing); with no enemy near the cursor, `attack` fires at the cursor point clamped to range (`proj.fire(u, null, ax, az, ground + 0.9)`); gate `rangedReady && fdiff < 0.4`. Melee units: legacy cone aim, cursor only picks the target.

**3.9.3 Vehicle (tank controls).** `drive.thr` moves along the hull heading (`thr < 0` at `reverseK`), `drive.turn` rotates the hull (`face = heading + 0.5 * turn`; `turn +1` increases `heading`, so `_integrate` turns at the drive's hull rate; tread pivots when `thr = 0`), the turret slews to the cursor bearing (`aimWant`) at `turret.rate`, the main gun fires on `attack` when `rangedReady && abs(angleDiff(aim, aimWant)) < G.aimTolPlayer (0.15)`; a cursor outside the arc clamps the turret and the gun is silent until the player turns the hull. The projectile aims at the cursor point (3D: ground + 0.9) unless a target snapped.

**3.9.4 Mech.** Legs follow `move` like infantry (world-space direction, camera-relative by the app), the torso (`turret`) follows the cursor, `attack` as 3.9.3, abilities 1..3 call the unit's active abilities in order (`stomp`, `jump`, `shield` per roster).

**3.9.5 Air.** `move` is a world-space velocity request limited by `accel` and speed; `hdg:'face'` classes (heli, gunship, drone, dropship) hover when idle and turn the nose to the cursor while `attack` is held (strafing); `hdg:'vel'` classes (dragon, wyvern) cannot stop: idle input keeps 0.5 x speed on the current heading. **Altitude hold**: `alt` in {-1, 0, +1}; `altGoal += alt * clm * dt` (or `dsc`), clamped to `[max(3.0, 0.6 * attack alt), 1.4 * cruise]` (dragon may descend to 0, becoming plane 0 and a melee unit); `alt = 0` holds the current `altGoal`; it never returns to cruise by itself. Fire: needs the nose within 0.4 rad of the cursor bearing (or `aimOk` for turreted weapons); the shot is solved at the cursor ground point.

**3.9.6 Reload, burst, cloak, setup.** (1) Reload: for controlled units `startReload` does not enter `ST.CAST`; it sets `reloadT` and leaves movement free; ammo refills in `_tickCooldowns` when `reloadT` reaches 0 (AI units keep the M.md behaviour); the HUD shows the ring from `reloadT`. (2) Burst: holding `attack` re-triggers `startRanged` when ready; releasing mid-burst lets the burst finish (the WINDUP state owns it). (3) Cloak: the cloak ability is a normal slot; cursor snapping skips cloaked enemies beyond detect range; attacking breaks cloak as for the AI. (4) Setup: a possessed howitzer fires only after `setupT` reaches 0; moving packs it. (5) Statuses: stun, sleep, stone, EMP, stagger return early as today.

**3.9.7 Entering and leaving.** Entering an aloft unit sets `controlled`; `airThink` is not called; leaving restores `airState = CRUISE` and keeps `altGoal`, which the AI then replaces. The camera follows `u.y` and adds `altitude` (`spec/RA` R17).

**3.9.8 Command schema and keys (requests to INTEGRATION/UI; absent fields = legacy).**
```
{ type:'possess', unit, move:{x,z}, attack, ability,
  aim:{x,z}|null,            // cursor ground point (world); finite numbers or ignored
  drive:{thr:-1..1, turn:-1..1},   // vehicle class only; turn +1 increases `heading` (atan2(x, z))
  alt:-1|0|1 }               // air class only
```
`Possession.apply` copies `aim drive alt` (non-finite -> ignored), the sim keeps the last values until the next command, `_release` clears them.

| class | W / S | A / D | cursor | click or J | Shift | digits 1-3 | E / Q |
|---|---|---|---|---|---|---|---|
| ground | move forward/back (camera-relative `move`) | strafe | aim point, snap 4 u | fire / swing | sprint (stick to full) | abilities | - |
| vehicle | `thr +1 / -1` | `turn -1 / +1` | turret bearing | main gun | - | abilities | - |
| mech | move | move | torso aim | weapon | sprint | abilities | - |
| air (face classes) | move forward/back | strafe | nose aim | fire | boost x1.3 | abilities | climb / descend |
| air (vel classes) | course | course | aim | fire | boost x1.3 | abilities | climb / descend |

Touch: the left stick is `move` (ground, mech, air) or `drive {thr: -y, turn: x}` (vehicle); the HUD adds Up/Down buttons for air units and sends `hud.possess.cls`. App edits: `Game.sendPossess(dx, dz, attack, ability, extra)` with `extra = {aim, drive, alt}`, `app/input.js` command branch (cursor via `groundAt`), `FIXED_KEYS.command` gains `{label:'Altitude (air)', keys:['KeyE','KeyQ']}` (camera rotation is inactive in the command context, so the codes are free), `PossessController` merges `extra`. Tests in section 4 (`V-POS`).

### 3.10 M9: cover and line of fire (S40, #15)

**3.10.1 Low-cover geometry (D-L27).** Catalog `cover:'low'` props (fixtures `fx_sandbag` r 0.9 h 0.9 hp 60; wall segments are `cover:true`): `Prop.low = (info.cover === 'low')`, `Prop.cover = (info.cover === true)`; `propBlocks` tests `o.cover || o.low` with the same height rule, so a low prop stops only shots that fly below its top (chest-high muzzles at `0.72 x height` pass over); `_indexProps` indexes `low` props like cover props. The prop still blocks walking (`blocks:'full'`, finite hp = `soft`, breachable).

**3.10.2 `inCover` and the damage multiplier.** `refreshCover(u)` for defs with `ai.cover` only (`info.cover`), every 12 ticks staggered `(tickN + u.id) % 12 === 0`: scan the 3 x 3 prop cells (4 u) around `u` for live `low` props with `gap = dist - u.radius - prop.radius <= G.coverRange (1.6)`, nearest wins; store the unit vector to it in `coverX/coverZ`, set `inCover`, emit `unit_cover {id, on}` on change. In `applyDamage`, next to `raw *= dst.mDmgTaken`: `if (dst.inCover && o.proj) { bearing to attacker (ax, az); if (dot(norm(bearing), (coverX, coverZ)) >= G.coverCos 0.5) raw *= G.coverMul 0.5 }` (melee, area and dot damage ignore cover). Cost 30 ns per hit, 0.3 us per refresh. Test: 4000 rifle hits from the covered side average 0.50 +- 0.02 of the open-side damage, 90 deg off to the side 1.0.

**3.10.3 `lineOfFire(w, x0, y0, z0, x1, y1, z1)` (D-L28), pure, returns 0 clear / 1 terrain / 2 prop / 3 smoke.** Terrain: every 2 u from 2 u to `L - 0.6`, blocked if the segment height `<= heightAt + 0.05`. Props: walk the 4 u `propCells` grid along the segment (Amanatides-Woo traversal, every visited cell once), for each live `cover || low` prop solve the segment/circle intersection analytically (`t` along the segment, half chord `h = sqrt(r^2 - d^2)`), blocked if the lower of the two end heights over `[t-h, t+h]` is below `heightAt(prop) + prop.height`. Smoke: for each of <= 16 cylinders `{x, z, r, top}` the same 2D test with the height window `[ground, top]`. The gate samples at the moment a shot is about to start (`u.cdR <= 0` and aimed) and is cached for 6 ticks per (shooter, target). Measured with exactly this traversal (probe p2b, three large arenas with up to 72 cover props, 6 smoke cylinders, 4000 random enemy pairs, mean range 30-34 u): median **0.46-0.85 us**, worst case (clear line, range >= 40 u) **1.15-1.30 us** (limit 4 us per shot). Cost per tick at 300 units, about 100 shots per second: 3.3 x 1.3 us = 4.3 us.

**3.10.4 Who is gated and the repositioning algorithm (D-L29).** `info.los = !!ranged && ranged.arc !== 'high' && info._nf && layer !== air` (precomputed; Ancient false: no LOS code, shots into walls as today). In `rangedBehaviour`'s hold-and-shoot branch, before `startRanged`:
```
blk = losCached(u, t)                           // 0 clear
if (blk === 0 && u.wasteN < 3) { u.blockedT = 0; fire }
else {
  u.blockedT += dt
  if (u.blockedT >= G.losTimeout (4.0 s)) { fire through (the existing stuck-shot behaviour); u.shunId = t.id; u.shunT = 3; u.targetT = 0; u.blockedT = 0; return }
  if (u.spotT > 0) { steer(u, spotX, spotZ); u.spotT -= dt; if (arrived <= 0.8 || u.spotT <= 0) u.spotT = 0; return busy }
  if (w.losBudget > 0 && ((u.id + tickN) % 4 === 0 || u.blockedT > 1.0)) { w.losBudget--; spot = findSpot(w, u, t); if (spot) { spotX,Z = spot; spotT = G.losSearchTimeout (3.0) } }
  hold (busy)
}
findSpot: angles = bearing(u->t) + [0, +45, -45, +90, -90, +135, -135, 180] deg ; rings = [2, 4, 6.5] u ; for ring in rings, for angle in angles:
   P = u + ring*(sin a, cos a) ; accept the first P with walkableC(u.mc, u.clearReq, P) && minRange <= dist(P,t) <= 0.95*range && lineOfFire(P muzzle, aim point of t) === 0
```
24 candidates, <= 24 x 1.2 us = 29 us and **one search per tick world-wide** (`w.losBudget = 1` at tick start; round-robin by `(id + tick) % 4`, or a unit blocked more than 1 s). `pickTarget` subtracts 30 from `shunId` while `shunT > 0` (new-era units only). No RNG. **Waste detector**: `Projectile.d0` (launch distance to target) and a terrain/prop impact before `0.5 x d0` without a unit hit increments the shooter's `wasteN` (reset by a unit hit); `wasteN >= 3` forces `blk = 1` for 3 s (covers the sampling gaps of the 2 u terrain step). Barks `reposition`, `cover` (M.md). Aloft shooters and `arc:'high'` weapons are not gated.

**3.10.5 Smoke occluder (D-L30).** `w.smoke = [{x, z, r, top, t}]`, `top = 3.5`, cap `G.smokeMax 16` (oldest dropped); `addEffect(kind === 'smoke', ..)` mirrors into it, `_tickEffects` expiry removes both. Smoke is an **AI occluder only** (it blinds the line-of-fire gate and so forces repositioning or the 4 s fire-through timeout); projectiles are not stopped by it and `propBlocks` does not read it (a deliberate narrowing of q1 ENGINE-Q26's "and propBlocks": smoke is a sight screen, not a wall; PC-L9). The cut-ladder rung 5 removes `payload.effect:'smoke'` and `dot_cloud smoke` through `E_CUT` without touching 3.10.1-3.10.4.

### 3.11 Cross-owner interface (requests go to `docs/requests/<owner>_<topic>.md`)

| owner | needs | module |
|---|---|---|
| WORLD | `NavGrid` additions of 3.5.3 (`walkH clear clearH`, `buildClear updateClear deriveCoarse walkableC canStepC clearLineC sameAs`); catalog flag `cover:'low'` and the `fx`-style low props; `Arena.edit` and `stampProp` as in `spec/W` 3.6.6; amend `spec/W` 3.6.1/3.6.2 (PC-L4) | M7, M9 |
| INTEGRATION, UI | `possess` extension, `Game.sendPossess(.., extra)`, `input.js` command branch (aim cursor, `drive`, `alt`), `FIXED_KEYS.command`, `hud.possess.cls`, Up/Down touch buttons, deploy/reload/ammo rings from `setupT reloadT ammo` (`spec/CU` HUD) | M8 |
| RENDER | reads `u.altitude u.plane u.aim u.aimOk u.setupT u.inCover u.airState`; selection ring on `heightAt`; hover floats on the water surface (sim `u.y`), model float is `meta.hover`; event `explosion kind 'crash'`; blobs from `altitude` | M7-M9 |
| ANIM-CLIPS | `fly`, `fly_fast`, `deploy` phase from `1 - setupT/setup`, `reload_gun` (not requested for controlled units), air death clips <= `rigLinger - 0.2` | M7, M8 |
| AUDIO | `unit_air_state`, `unit_withdraw`, `air_remnant`, `explosion crash`, cause rows `crash crush` (M.md 3.3) | M7 |
| COMEDY | barks `air_land air_withdraw reposition deploy` (>= 3 lines per used role family per era), lessons reuse `air_unanswered rear_armor open_ground` (M.md 3.12) | M7-M9 |
| module M2 | `ray.js` second window over `ahash` (R-M2), `fire()` sets `muzzle`, `grace`, `Hit.fy`, `Projectile.d0`; `startReload` has a `u.controlled` branch (M8 edits it) | M2, M8 |
| module M2b | `canTarget` booleans replace the two-bit mask (PC-L2) | M2b |
| modules M10, M12, M13, M17e | `markNavDirty` mask semantics (bit0 ground, bit1 coarse pair), `areaDamage(.., y)`, `qbufA`, `invulnT` check, wreck `decor` | M10-M17e |
| TOOLS-GOLDEN | hash block (L) off for Ancient, `field_trace_ancient.json`, G1 matrix gains battles with fire/geyser/boulder hazards under units and a possession log without `aim`; G7 unchanged | M7 |
| CAMPAIGN (CU2) | `validateMission(m, {defs, era})` calls `missionAirProblems` | M7 |

### 3.12 Events, barks, state hash, forks, performance

**Events (payload fields in order; appended to `EVENTS`, OI-L1).** `unit_air_state {id state prev alt}`; `unit_withdraw {id def team why}` (`why`: `orphaned`, `stage2`, `timeout`); `air_remnant {team stage t}`. The string field `why` is already in the `makePayloads` set (M.md 3.12). Rate limits: `unit_air_state` only on change (dragon: about 6 per cycle). Existing events reused: `explosion kind:'crash'`, `unit_cover`, `unit_flanked`, `unit_bailout`, `unit_wreck`, `terrain_edit`. `LOG_FIELDS` (INTEGRATION): `unit_air_state: [id,state]`, `unit_withdraw: [id,team]`, `air_remnant: [team,stage]`.

**Bark keys (COMEDY, >= 3 lines per used role family per era kit).** `air_land` (dragon starts LAND; the commentators' joke: it has decided to take this personally, on foot), `air_withdraw` (an orphaned or stage-2 unit leaves), `reposition` (blocked shooter moves to a firing spot), `deploy` (crew weapon ready). Deterministic selection `(tickN*17 + id*5) % n`, no RNG.

**State hash block (L)** (`stateHashFull`, D-L31; mixed only when `w.layerFlags !== 0`): per live unit `plane altitude(fround*1000) airState airT altGoal aim revT spotT blockedT inCover shunT`; world `nAloft unhitT0 unhitStage fieldSeq fieldLast[class][team] dirtyG dirtyC smoke(x z r t)`. Sensitivity test: 20 single-field mutators each change the digest (`m08_layers/hash`).

**RNG.** `rf.air` (label `era:air`, `M.md` 3.11): exactly 1 draw at each APPROACH entry (approach jitter) and 1 at each BREAK exit (turn side); `rf.spawn` for bailout positions' `addUnit` draws (`M.md`). No other draws: the orbit direction is `u.sideSign`, LOS candidates and landing spots are enumerated in fixed order, the unhittable rule and the lane scheduler are deterministic. Tests: `grep -n "rng\." src/sim/{layers,fields,air,airrules,vehicle,cover}.js` is empty except `rf.air`.

**Budget sub-allocations** (reference-box ms, scaled by `k` like `M.md` 3.13; `tools/perf_budget.mjs` parses this block and fails unless every module's rows sum exactly to the `M.md` `budget` row of the same id and no row is negative):

```budget_layers
[{"id":"M7","part":"coarse_fields","ms300":0.073,"ms500":0.073,"driver":"4 coarse Dijkstra per 24 ticks, 0.44 ref ms each (measured 0.83 ms here / k 1.9)"},
{"id":"M7","part":"air","ms300":0.014,"ms500":0.040,"driver":"airThink ~0.6 us per air unit-tick, aloft separation pass, ahash insert"},
{"id":"M7","part":"layer_checks","ms300":0.012,"ms500":0.035,"driver":"plane tests, class accessors, second queries behind nAloft, hazard guards"},
{"id":"M7","part":"sched_clear","ms300":0.011,"ms500":0.022,"driver":"lane bookkeeping, updateClear windows 48-286 us per edit, deriveCoarse, unhittable sample 1 Hz"},
{"id":"M8","part":"drive_turret","ms300":0.012,"ms500":0.020,"driver":"vehicleDrive + turretSlew ~0.25 us per vehicle-tick"},
{"id":"M8","part":"faces","ms300":0.008,"ms500":0.014,"driver":"resolveFace per hit on armorFace units ~0.3 us"},
{"id":"M8","part":"crew_wreck","ms300":0.004,"ms500":0.006,"driver":"bailout spawn, wreck props"},
{"id":"M8","part":"gate","ms300":0.016,"ms500":0.030,"driver":"aimOk / setup checks on every ranged unit think"},
{"id":"M9","part":"los","ms300":0.006,"ms500":0.010,"driver":"lineOfFire 0.5-1.3 us per shot, ~100-170 shots/s"},
{"id":"M9","part":"reposition","ms300":0.029,"ms500":0.029,"driver":"one findSpot per tick world-wide, 24 candidates x 1.2 us"},
{"id":"M9","part":"cover","ms300":0.005,"ms500":0.008,"driver":"refreshCover 0.3 us per unit per 12 ticks, coverFactor 30 ns per hit"},
{"id":"M9","part":"smoke_waste","ms300":0.000,"ms500":0.013,"driver":"smoke cylinders in LOS, waste detector"}]
```
Sums: M7 0.110 / 0.170, M8 0.040 / 0.070, M9 0.040 / 0.060 (equal to `M.md`). **Probes (`tools/perf_layers.mjs`, TOOLS-VERIFY runs it in the serial lane):** micro-limits in this-box ms (divide by `k` for reference): fine field large <= 4.6 (measured 3.4-4.3), coarse field large <= 1.05 (0.82-0.83), full clearance <= 1.5 (1.0-1.3, `spec/W`), `updateClear` 32 x 32 <= 0.4 (0.29), LOS p99 <= 4 us (measured median 0.5-0.85, worst clear 1.3, limits absolute), `resolveFace` <= 0.4 us, `vehicleDrive + turretSlew` <= 0.5 us, `airThink` <= 1.2 us, `findSpot` <= 40 us (the last four are limits set from operation counts at 1.9 x; they become measurements at the module's landing). Scenario ablation keys `layer`, `turret`, `cover` on MOD-W and SF-W (`M.md` 3.13); the M7 ablation must also run on a medium arena (coarse field 0.46 ms) and a small one. A world with a ground boss has 6 coarse fields at cadence 4: 6 x 0.44 / 24 = 0.11 reference ms for the coarse lane alone (+0.037 over the allocation); that is the one declared excess of the M7 row, reported per mission in `perf_log` (scenario `BOSS-W` = MOD-W plus one r 3.0 boss), and it stays inside gate (ii) (<= 2.0 ms at 300 units).

### 3.13 Tunables (draft, BALANCE fits at E-FREEZE) and Ancient-policy rows

Tunables fitted only by logged amendment: every `G` constant of 3.1, the `AIR_CLASS` rows (attack factors, climb/descend, standoff), the `DRIVE` factors, bailout counts, `coverMul`. Fixed by this spec (not tunable): the plane threshold 2.0, the unhittable timers 6 / 18 / 30 s, the corridor and clearance definitions, one Dijkstra per tick, the AA guarantee numbers 15% and `ceil(n/8)`.

| AP | Ancient path | change | policy and proof |
|---|---|---|---|
| AP-L1 | `world.js:462-463` hash rebuild | `plane` branch, `ahash` null | identical insert order; G1 |
| AP-L2 | `world.js:465-466` field block | coarse lane behind `layerFlags & 3`; dirty-first behind `layerFlags` | ground statements unchanged; `field_trace_ancient.json` (40 jobs) |
| AP-L3 | `world.js:558-578` `recomputeCentroids` | `if (u.layer === 2) continue` | no layer-2 unit exists; G1 |
| AP-L4 | `world.js:598-669` `_integrate` head, `_deflect`, `_canMove` | `u.mc === 0` fast path = legacy lines; `hullRate \|\|` | G1 + S26 |
| AP-L5 | `world.js:631-636` vertical follow | layer-0 branch verbatim | G1 |
| AP-L6 | `world.js:671-706` `_separate` | margin `w.mR = 1.8` (`maxRadius` 0); trample `a.layer === 0` | probe p6: 0.25% missed pairs stay missed in Ancient by policy (no delta); G1 |
| AP-L7 | `world.js:194-237` `igniteAt`, `areaDamage` | optional `y`, aloft pass behind `nAloft`, margin `w.mR` | G1 |
| AP-L8 | `world.js:354-360` `moraleShock` | plane branch | G1 |
| AP-L9 | `world.js:715-732` `_tickEffects` | none (hash only) | G1 |
| AP-L10 | `world.js:807-876` `_checkEnd`, `zeusIntervene` | `idle` uses `unhitT0` (-1 in Ancient), detector behind `layerFlags & 4`, candidates skip plane 1 | G1 stalemate battles |
| AP-L11 | `world.js:784-805` `_tickDying` | crash hook behind `layer === 2` | G1 |
| AP-L12 | `ai.js:49-88` `pickTarget` | second pass behind `info.hitAloft && nAloft > 0`; shun penalty behind `shunT` | frozen-copy test (M.md S32) + G1 |
| AP-L13 | `ai.js:98-131,204,235,339,450,465` | class accessors, `hashOf`, both-hash flee | G1 |
| AP-L14 | `ai.js:142-230` `think` | `mc === 3` branch and hard-disable line | G1 |
| AP-L15 | `squads.js` | accessors, `sq.jog` (= `G.jogMul` for mc 0), `CLS.AIR`; `sumD` line unchanged | G1 |
| AP-L16 | `hazards.js:42-134` | `u.layer` guards short-circuit first | G1 hazard battles (added) |
| AP-L17 | `projectiles.js:96-135` `_collide` | margin `w.mProj` (1.6 in Ancient), second query behind `nAloft`, `grace` behind new fields | G1 |
| AP-L18 | `combat.js:87-173` `applyDamage` | `invulnT`, `overkill`, cover and face branches guarded | frozen-expression test (M.md S29) + G1 |
| AP-L19 | `combat.js:304-320` `cleave` | none | G1 |
| AP-L20 | `possession.js` | new command fields absent = legacy | S26 input-log replay |
| AP-L21 | `armygen.js:273-367`, `formations.js` | `airGuarantee` only with air defs in the pool; new formation kinds | G7 + G1 |
| AP-L22 | `abilities/util.js` `collect` | default `PL_GROUND` | S16 tests |
| AP-L23 | `content/era_ancient/campaign_validate.js:15` | `V-AIR` only when the defs contain air | G6 |
| AP-L24 | `objectives.js:78` `HoldHill` | `plane === 1` skip | G6 |

### 3.14 Work packages (for `wbs.csv`; sizes S/M/L = 1/2/4 sessions; hot-file budget <= 3 touches of `world.js` after P1)

| WP | module | content | files | size | predecessors |
|---|---|---|---|---|---|
| WP-L1 | M7 | planes, `ahash`, altitude, hazard guards, dispatch skeleton (hooks `vehicleDrive turretSlew refreshCover crash` and the smoke mirror in `addEffect`/`_tickEffects`, so M8/M9 never touch `world.js` again) | `world.js hazards.js layers.js` | M | M2, M2b, M3, M10 |
| WP-L2 | M7 | nav classes: WORLD arrays (3.5.3), SIM accessors, `canMoveC`, clearance tests | `nav.js` (WORLD), `world.js ai.js squads.js` | L | WP-L1 |
| WP-L3 | M7 | lane scheduler, `markNavDirty` classes, reference model, max-age and trace tests | `fields.js world.js` | M | WP-L2 |
| WP-L4 | M7 | air AI, class table, squads AIR, formations, unarmed/escort | `air.js ai.js squads.js formations.js` | L | WP-L1 |
| WP-L5 | M7 | unhittable rule, AA guarantee, validator `V-AIR`, fuzz cases, audit test | `layers.js airrules.js armygen.js campaign_validate.js` | M | WP-L4 |
| WP-V1 | M8 | drive, turret, firing gate, setup | `vehicle.js ai.js combat.js` | M | M7, M2 |
| WP-V2 | M8 | `resolveFace`, grace/muzzle, bailout, wrecks, seam tests | `armor.js projectiles.js vehicle.js` | M | WP-V1, M13, M17e |
| WP-V3 | M8 | possession, sim side | `possession.js vehicle.js` | M | WP-V1 |
| WP-V4 | M8 | possession, app side (request) | `app/input.js game.js meta.js ui/hud/takecommand.js ui/keymap.js` | M | WP-V3 |
| WP-C1 | M9 | low cover, `inCover`, `lineOfFire`, smoke | `cover.js combat.js` | M | WP-V1, M12, M13 |
| WP-C2 | M9 | reposition, waste detector, fire-through, tests | `cover.js ai.js` | M | WP-C1 |

Counts (M7 5, M8 4, M9 2) equal the SIM allocation of `q2_schedule` Q9; WP-L2 is the only L-sized item (it spans WORLD and SIM, so two owners and two sessions in parallel).

## 4. Acceptance

Tiers as `M.md` section 4 (T-fast <= 4 min; T-era adds the era's inert/slice runs; serial lane for timing; release-only for full negcontrols and 15-rep perf). All scripts are plain `node:assert` files under `tests/sim/` unless noted; each registers `criterion(id, ..)` with a negative control file `tests/negctl/<id>.mjs` (mutation plus the check id that must turn red; QA draws >= 8 by its own seed). Owner = author role; REVIEWER signs every row; TOOLS-VERIFY runs the registry. Criteria S35, S39, S40 of `M.md` are decomposed below (each row id is also a check id inside the S-criterion).

| id | script / test (name prefix) | inputs | thresholds | owner | tier | negative control (mutation -> red check) |
|---|---|---|---|---|---|---|
| L-AUD (S35) | `layers_audit` | tables of 3.3 (90 rows) against `grep` of `src/sim` and `src/world` | site counts equal the rows: `hash.query` 21, `fields[` 6, nav method calls 21 + `nav.hs[` 2, `heightAt(` 9 + `propBlocks` 2, `cellHeight(` 9; every anchor text found in its file; every row has `L:<ID>` in `m08_layers`; an unlisted site fails | SIM | T-fast | NC-L1: add a 22nd `hash.query(` to `ai.js` (or delete row H17) -> `layers_audit/count` red |
| L-ROW (S35) | `m08_layers` | every `t:` of 3.3; fixtures 3.1; hash block sensitivity | all rows pass; block (L) sensitive to 20/20 single-field mutators and absent for Ancient worlds | SIM | T-era | NC-S35 (`M.md`): remove the plane filter in `crowdAhead` -> `L:H17` red; NC-L2: drop the `layer === 1` line in `_liquid` -> `L:HZ6` red |
| L-ALT (S35) | `m08_alt` | air 20 s at cruise, over a 6 u ridge, hover over a 3 u lake and the Styx lava plane, geyser under a hover tank, EMP on a drone at 8 u, crash of a dying heli | air altitude +-0.05 for 20 s; climb/descend rate +-5%; never `altitude < 1.0` crossing the ridge at speed 7 (look-ahead); hover `y == waterY` +-0.05, alive and hp unchanged after 12 s; infantry knocked into the same lake dies at 3.0 +-0.1 s; EMP'd drone reaches the ground in `alt/(1.5*dsc)` +-0.3 s then is plane 0; crash `r`/`dmg` per 3.4.3; corpse on the ground within `rigLinger - 0.2` | SIM | T-era | NC-L3: delete `u.ky = 0` and apply gravity in the air branch -> altitude hold red |
| L-FLD (S35) | `m08_fields`, `field_sched_model` | 3.5.7; Ancient trace fixture | ground age <= 12, coarse <= 24, <= 1 Dijkstra per tick after tick 1, job trace equals the model, Ancient trace equals the 40-entry fixture (T-fast), `valid` never false, 40 coalesced deaths = 1 mark and 0 extra jobs, 20 deaths over 20 ticks <= 4 ground jobs | SIM | T-fast (Ancient trace), T-era | NC-L4: `coarseRefresh` 6 -> 9 (age 36) or `invalidateFields()` inside `markNavDirty` -> red |
| L-CLR (S35) | `m08_clear` | EDT vs brute force on 5 arenas; 200 random edits; corridors 3..7; `fx_tank` column per recipe corridor | full build equals brute force (1e-4); window equals full after every edit (0 mismatches, `I-clear`); corridor values of 3.5.2; `fx_tank` passes `w >= 5` (one lane) and `w >= 6` (two lanes), never `w = 4`; S9v violations 0; full <= 1.5 ms, 32 x 32 window <= 0.4 ms (this box) | SIM + WORLD | T-era | NC-L5: remove the `clear >= req` term from `canMoveC` -> S9v red |
| L-AIR (S35) | `m08_air` | the six classes of 3.6.3 vs fixtures | transitions of 3.6.4 exactly; altitude settles within +-0.3 in 3 s; orbit radius error <= 1.0 u over 2 periods; nose within 0.4 rad of the bearing during orbit and hover; `run` overshoot and BREAK distance; melee starts only at altitude <= 2.5 and lands at <= 3.0; pikes never target an aloft dragon and do target it landed; landing at hp 66% and 33% within 1 s, the 25 s rule, GROUNDED exits; unarmed unit withdraws 4 +-0.1 s after the last armed ally dies; `rf.air` draws exactly 1 + 1 per cycle | SIM | T-era | NC-L6: let melee scans query `ahash` -> "pikes never target aloft" red |
| L-REM (S35) | `m08_remnant` + fuzz `F-*` | stuck fixtures; 200 seeds per fuzz case on marathon large and the era's arenas | timeline exact: sample <= 1 s, stage 1 at T0 + 6, stage 2 at T0 + 18, stage 3 at T0 + 30 (+-1 tick); `battle_end` <= 31.1 s after the last hittable contact in 100%; `F-DROPSHIP`, `F-DRAGON-MELEE`, `F-EMPTYSKY`: >= 99% end with reason != `time` inside 6 sim-minutes (S11 definition); `F-GUNSHIP-NOAA` ends by elimination in 100%; default era armies with air (200 per era): length median 60-120 s, p90 <= 180 s (S12); no kill gap >= 20 s excluding the tail (S23) in any F case; Ancient `unhitT0 == -1` always | SIM | T-era (F cases scheduled-heavy) | NC-L7: disable stage 3 -> `F-DROPSHIP` ends `intervention` at 44 s idle -> red |
| L-AAG (S35) | `m08_aa_guarantee` | 2000 seeds per air era x 6 styles x 4 budgets; 8 fixture missions | `canHitAir` units >= `ceil(0.15 N)` in 100%; `aaDedicated` >= `ceil(airN/8)` in 100% when an affordable one exists; S20 invariants hold (cost <= budget, < cheapest unit left over, <= 16 types, <= cap); Ancient G7 dumps equal; `V-AIR` rejects 4 and accepts 4 fixtures | SIM + CAMPAIGN | T-fast | NC-L8: skip `airGuarantee` -> share 0 for `rush` -> red |
| L-SQD (S35) | `m08_squads` | mixed placements; air march; offsets; line fixture | `E_SQUAD_MIX` on mixed squadId; vee/armor/spread offsets equal 3.7.3; adding an air squad leaves `D` unchanged; a tank squad ahead of the infantry line slows (position lag to the line <= 6 u at contact over 20 seeds); air anchor stays in the arena | SIM | T-era | NC-L9: let `CLS.AIR` into `sumD` -> `D` changes -> red |
| L-PRF (S35, S39, S40) | `perf_layers` (+ X3 ablation keys `layer turret cover`) | 3.12 | micro-limits of 3.12; ablation delta <= allocation x k + 3 sigma (M.md gate iii) | TOOLS-VERIFY | serial lane in T-full, release-only full | NC-L10: `coarseRefresh` 3 (double jobs) -> ablation over budget -> red |
| V-DRV (S39) | `m14_vehicles/drive` | `fx_tank fx_apc fx_td fx_hover_tank fx_mech` | 3.8.1 numbers: hull/turret independence (heading within 0.3 of course, aim within `aimTol` of the target after 3 s), tread U-turn 1.5 +-0.15 s at speed 0, `fx_apc` U-turn 4.3 +-0.5 s, hover speed factor >= 0.55 while strafing, reverse <= 8 u at 0.5 x speed, present-front 1.6 +-0.2 s, no reverse under a retreat order | SIM | T-era (Modern) | NC-S39 (`M.md`): `u.face = want` for turret defs in `rangedBehaviour` -> independence red |
| V-TUR (S39) | `m14_vehicles/turret` | slew 90 and 180 deg, `fx_td` arc 0.35, 100-tick gate trace | times +-0.1 s of `angle/rate`; `fx_td` fires only when the hull is within 0.35 + `aimTol`; no shot in any tick with `aimOk == 0` | SIM | T-era | NC-V1: gate turret defs on `fdiff < 0.4` -> "shot with misaligned turret" red |
| V-ARM (S39) | `m14_vehicles/faces` | 24 azimuths x 4 elevations x rifle/sniper/AT; helicopter geometry | bins exactly as 3.8.4; rear/front shots-to-kill ratio: rifle 14.3, sniper 3.25 (>= 4 for rifle as `M.md` S39); `unit_flanked` <= 1 per 2 s per unit | SIM | T-era | NC-V2: swap the side and rear thresholds -> bins red |
| V-SET (S39) | `m14_vehicles/setup` | howitzer march-stop-march | first shot >= `setup` after the halt (+1 tick), none while packed, a second march resets, stagger does not | SIM | T-era | NC-V3: reset `setupT` on stagger -> red |
| V-CRW (S39) | `m14_vehicles/crew` | tank killed at overkill 0.1 and 0.5, on a lake, at a bridge edge; accounting fixture | 3.8.6 numbers: 3 crew / 0 / 0 / fewer; `startCount` unchanged; `spawnedAlive == 3`; eliminate progress never decreases for 10 s; one `unit_bailout`; star "half alive" uses the roster | SIM | T-era | NC-V4: count crew in `startCount` (also `M.md` NC-S37) -> red |
| V-WRK (S39) | `m14_vehicles/wreck` | 20 wrecks in the narrowest 6-cell corridor of 3 recipes, six tanks | nav arrays bit-equal, six tanks arrive within `T` of `spec/W` 3.6.5, `markNavDirty` calls 0, cap 24 holds | SIM | T-era | NC-V5: spawn wrecks without `decor` -> arrays differ -> red |
| V-FF (S39) | `m14_vehicles/ff` | 6 `fx_tank` abreast at 4.5 u, friendly fire on, 100 volleys | 0 same-team hits in the first 0.4 s of flight | SIM | T-era | NC-V6: legacy muzzle 0.5 u and no `grace` -> hits > 0 red |
| V-POS (S39) | `m14_vehicles/possession` | 600-tick input logs for the four classes; every fixture def; the Ancient input log | 3.9 numbers: hull turn `turnRate * t` +-5%, turret on the cursor in `angle/rate` +-0.1 s, no shot before `aimTol 0.15`, air `alt` hold +-0.2 over 10 s, ground cursor snap 4 u, reload does not freeze movement, replay `stateHashFull` equal on two runs, Ancient log digest equals the baseline (S26), every def: no exception, released on death | SIM + INTEGRATION | T-era | NC-V7: ignore `drive.turn` -> hull test red |
| V-SEAM (S39, S35) | `m14_vehicles/seam`, `m08_air` | lists of 3.8.8 | as listed; the unturreted gunship digest is equal across the M8 landing (`inert_M8_gunship`) | SIM | T-era | NC-V8: make the unturreted gunship consult `aimOk` -> digest moves -> red |
| C-GEO (S40) | `m15_cover/geometry` | `fx_sandbag`; 4000 hits per side; bullets at 1.4 and 0.5 u | covered side mean 0.50 +-0.02 of open side; 90 deg off 1.0; bullet at 1.4 passes, at 0.5 is stopped; `inCover` events on change only | SIM | T-era | NC-C0: `coverMul` 1.0 -> red |
| C-LOS (S40) | `m15_cover/los` | 20 000 random pairs on 3 arenas vs a 0.25 u brute-force ray; 6000 timed calls | agreement >= 99.5% (every disagreement involves a feature thinner than 1 u); median <= 1.5 us, p99 <= 4 us | SIM | T-era | NC-C1: drop the prop walk -> agreement < 99.5% red |
| C-REP (S40) | `m15_cover/ai` | wall between two squads, 100 fixtures; 200 battles with walls | spot found within 8 u in >= 90%, first shot <= 3 s after the block; with no spot the unit fires through at 4.0 +-0.1 s and retargets; <= 1 `findSpot` per tick (spy); no unit blocked > 6 s in 200 battles; same input -> same spots | SIM | T-era | NC-S40 (`M.md`): remove the timeout fallback -> unit stands forever -> red |
| C-SMK (S40) | `m15_cover/smoke` | two smokes, 17 smokes | LOS blocked through, clear beside; expiry; the 17th drops the oldest; projectiles pass through unchanged | SIM | T-era | NC-C2: ignore `w.smoke` -> red |
| C-ANC (S40) | `m15_cover/ancient` | frozen `rangedBehaviour` copy on 2000 scenes; 43 defs | decisions equal; `info.los` false for all 43; no `w.smoke` array allocated | SIM | T-fast | NC-C3: `info.los = true` for all -> red |

## 5. Residual ledger

Every residual or review item whose target is this file (verbatim ids from `q3_engine.md`, `q3_program.md`, `q3_product.md`, `q2_engine.md`, `q2_schedule.md`, `q2_product.md`, `q1_*.md` and the "answered only by deferring" section of `q1_disposition.md`).

| item | asks | answered in |
|---|---|---|
| q3_engine 6 | layer audit: 21 `hash.query`, 5 `fields[` sites, 23 nav sites, `propBlocks`/`heightAt`, `recomputeCentroids`, `_separate`, anchor march, rule per site; single-class squads; air squads steer analytically with air slots; LINE metric counts ground LINE only | 3.3.1-3.3.5 (21 / 7 lines / 23 + 5 / 11 / Z01-Z08), D-L17, 3.7; counts reconciled in PC-L5; tests `L-AUD`, `L-ROW`, `L-SQD` |
| q3_engine 7 | refresh-slot schedule per 24 ticks (Ancient bit-identical), ms per field at the large arena, max field age at 600 units (ground <= 12, hover/air <= 24), dirty event refreshes only affected fields | 3.5.5 (lanes, trace fixture), 3.5.6 (3.36-4.26 ms fine, 0.82 coarse), 3.5.7 (600-unit test), D-L5/L6; `L-FLD` |
| q3_engine 31 | M7 delivers gunship "face and fire", M8 re-opens air only for turret/aim-gated weapons, test lists in both | 3.8.8 (both lists), 3.6.4/3.6.5; `V-SEAM`, `L-AIR` |
| q3_engine 27 (labelled spec/RA, chartered here) | vehicle clearance: inflated-obstacle map per radius class, tested by a six-tank column per recipe | D-L4, 3.5.1-3.5.4 (per-unit `clearReq` replaces per-class copies), corridor table 3.5.2, `L-CLR`; the recipe columns are `spec/W` 3.6.5 (PC-L6) |
| q3_engine 28 (W10 part) | vehicle squad formation, `squadSize` rows for vehicles and air, wreck density | 3.7.1, 3.7.3 (`armor` formation), 3.8.7; `V-WRK`, `L-SQD` |
| q3_engine 18 (wreck half; displacement half is `M.md` M12) | wrecks non-blocking or capped with decay, 20-wreck corridor test | D-L23, 3.8.7, `V-WRK` |
| q3_engine 19 | deploy/pack-up is a `setup` time in the firing gate of M2/M8 | D-L24, 3.8.3, `V-SET` |
| q3_engine 14 (resolver half) | M8 resolves `armorFace` from hull heading and hit direction, M1 reads `o.face` | D-L21, 3.8.4, `V-ARM` |
| q3_engine 16 | `air/groundOnly` enforced with `u.layer` in target masks; projectile-vs-air through the y test | D-L10, 3.6.2, H08, PC-L2 |
| q3_engine 30 (vehicle half; mechanics are `M.md` M13) | bailout spawn rules, squad rule, accounting, randomness | D-L22, 3.8.6, `V-CRW` |
| q3_engine 15 (spawn half) / q1 ENGINE-Q36 | friendly-fire spawn exclusion for large bodies | D-L26, 3.8.5, `V-FF` |
| q2_engine Q9(d) | M7 air AI needs the M8 firing gate on `u.aim` | 3.8.8 (seam), D-L12 |
| q2_engine Q10 | per-(team, class) fields break the cadence arithmetic; freshness per class; air analytic steer; event-driven dirty path | D-L5/L6/L7, 3.5.5-3.5.7 (arithmetic: ground 2 jobs / 12 ticks, coarse 4 jobs / 24 ticks, never two in one tick) |
| q1 ENGINE-Q7 | per-class fields blow the envelope; lazy fields, shared arrays, coarse nav, tested freshness number | D-L5, 3.5.1 (alias rule), 3.5.6 (cost 0.138 ms here), `L-FLD`, `L-PRF` |
| q1 ENGINE-Q8 | layer audit table of every hash site and hazard, `_integrate` altitude branch, per-layer insert | 3.3 (all tables), 3.4, D-L1 |
| q1 ENGINE-Q9 | air AI state machine, melee-from-air, unarmed units, AA guarantee in armygen and campaign validation, hard termination, dragon and dropship in the fuzz | D-L11-D-L16, 3.6.1-3.6.9, `L-AIR`, `L-REM`, `L-AAG` |
| q1 ENGINE-Q15 | hull faces movement, turret slews, firing gate on aim, present-front, reverse rule | D-L19/L20, 3.8.1-3.8.3, `V-DRV`, `V-TUR` |
| q1 ENGINE-Q16, PRODUCT-Q8 (sim half) | possession per class, reload/burst/cloak interplay, camera follows `y`, every `canPossess` unit passes a script | D-L25, 3.9.1-3.9.8, `V-POS` (HUD/touch layout is `spec/CU`; interface 3.11) |
| q1 ENGINE-Q24 | vehicle radius margins, `clear` map in `canStep/_canMove/steer`, corridors >= 6 cells, six-tank column | D-L4, D-L18, 3.3.3, 3.3.8, 3.5, `L-CLR`; corridor recipes `spec/W` R-V1 |
| q1 ENGINE-Q25 (vehicle half) | bailout accounting, stars, objectives | 3.8.6 (restates `M.md` M14), `V-CRW` |
| q1 ENGINE-Q26 | blocked units reposition, timeout, fire-through, smoke occluder, <= 4 us per shot | D-L27-D-L30, 3.10, `C-*`; smoke narrowed (PC-L9) |
| q1 ENGINE-Q8/Q9/Q15 "deferred to spec/M-mechanics" (disposition list) | layer audit, air AI state machine, vehicle/turret model | this file (3.3, 3.6, 3.8) |
| q1 CONTENT-Q19 (sim side) | altitude per class for the airborne look | 3.6.3 (`cruiseAlt` ranges and attack factors; RA derives blob/bank/rotor from `u.altitude`) |
| q2_schedule Q9 and q1_scope Q7 (M7/M8/M9 share) | M7 5 WPs, M8 4, M9 2 placed in a phase with predecessors and hot-file budget | 3.14 |
| q2_engine "vehicle clearance" (named in the charter) | `q2_engine.md` has no separate clearance question (grep: no hit); its Q10 and the q1 ENGINE-Q24 / q3_engine 27 pair above carry the requirement | rows q2_engine Q10, q1 ENGINE-Q24, q3_engine 27 |
| `M.md` OI-2 (names shared with this file) | `unit_air_state`, `CLS.AIR`, `markNavDirty` class bits, `layer` ids, `rangedReady`/`aimOk` | 3.2 (payload), D-L17 (`CLS.AIR = 6`), 3.5.5 (bits), 3.1 (`LAYER_ID`), 3.8.2/3.8.3; mismatches are PC-L1..PC-L4 |

Items that this file cannot close alone: the UI/INTEGRATION half of Take Command (3.11, OI-L3, owner DESIGN-UX/INTEGRATION), the WORLD half of the clearance arrays (3.5.3, OI-L2, DESIGN-WORLD), the tunable values (OI-L4, BALANCE).

## 6. Plan corrections

| # | statement | evidence | correction |
|---|---|---|---|
| PC-L1 | `M.md` 3.6: "M7: air units inserted too, queries filter by layer" (single hash) | a landed dragon must be hittable by ground melee, which only scans the ground hash; 14 of 21 sites then need no edit; Ancient `ahash` is null | two hashes keyed by plane (D-L1); `M.md` sentence to be amended (OI-L1); counts of sites in `M.md` S35 unchanged |
| PC-L2 | `M.md` 3.9 mask `skip c if info.mask !== 3 && !((c.layer === 2 ? 2 : 1) & info.mask)` | with `air:false` (mask 1) a landed dragon (`layer 2`) is immune to tank shells and howitzers although it stands on the ground | `canTarget` with `hitGround/hitAloft/hitLanded` (3.6.2) |
| PC-L3 | `M.md` M8 pointer: `aimOk = abs(angleDiff(u.aim, want)) < turret.arc` | `turret.arc` is validated 0.2..3.14 (a traverse limit): with arc 3.14 every shot would pass | `arc` = traverse half-angle, tolerance `G.aimTol 0.08` (D-L20, 3.8.2) |
| PC-L4 | `spec/W` 3.6.1-3.6.2: (a) `classMask` "1 << class" (HOVER bit 1, CLEAR bit 2) vs `M.md` "bit0 ground, bit1 hover/clear" and `0b11` in M10/M12; (b) clearance by chamfer; (c) hover view only at cell 2; (d) baseline F8 numbers by chamfer | (b) probe p7: chamfer overestimates by up to 0.443 cells; at the boss threshold 3.75 it disagrees with the exact map on 58 (nile), 91 (styx), 141 (thermopylae) cells, 0 at 3.0 on four maps; exact EDT costs 1.0-1.3 ms (probe p1c) against chamfer's budget 1.5 ms; (c) local movement is tested at 1 u, so the hover medium needs fine `walkH`/`clearH` | (a) mask semantics fixed as `M.md` (3.5.5); `NAV_CLASS` ids kept; (b) `buildClear` = exact EDT, `I-clear`; (c) fine arrays added to the ground instance (3.5.1); (d) baselines recomputed (differences <= 0.443); `spec/W` amendments OI-L2 |
| PC-L5 | plan/q3: "5 `w.fields` sites", "23 nav call sites", "11 propBlocks/heightAt sites", `_separate` misses (q1 measured 2%) | grep at `b2200f5`: `fields[` on 6 lines (+ constructor); nav = 21 method calls (canStep 1, inside 3, walkable 17) + 2 `nav.hs[` reads = 23, plus 5 `clearLine`; `heightAt(` 9 + `propBlocks` 2 = 11; `cellHeight(` 9; probe p6 (uniform 200 + 12 tanks): margin 1.8 misses 83 of 32 773 overlapping pairs (0.25%), margin 2.2 misses 0 | the counts are the audit's row sets; margin policy D-L18 |
| PC-L6 | q3_engine 27 targets `spec/RA`; `spec/W` 3.6.5 also claims residuals 28, 18, 27 | clearance semantics and use are sim concerns, the recipe column test is W's | split: semantics and per-unit rules here (3.5), recipe test `spec/W` 3.6.5, wreck assertions `V-WRK` |
| PC-L7 | plan 4 M7: "hover/air <= 24 ticks" | air has no field; hover and clear share the coarse lane; 4 fields -> 23 ticks, aliased pair or two fields -> 11 | wording: ground <= 12, coarse (hover, clear) <= 24, air n/a (3.5.5, probe p4) |
| PC-L8 | q1 ENGINE-Q8 hazard claims | verified, not corrected: probe p5 on an unmodified engine: bed+0.8 in a 1.63 u lake drowns at 3.03 s; fire hazard burns a unit 8 u up; geyser flings it; quicksand ignores +0.8 (existing guard 0.3) | HZ1-HZ6 |
| PC-L9 | q1 ENGINE-Q26: smoke tested "in `lineOfFire` and `propBlocks`" | if projectiles died in smoke it would be a wall, not a screen; the AI gate alone makes units reposition or fire through after 4 s | smoke blinds the AI gate only (3.10.5) |
| PC-L10 | `M.md` S35: "remnant terminates <= 62 s" | the legacy watchdog needs 44 s idle; the rule of 3.6.7 ends in <= 31.1 s | `L-REM` asserts 31.1 s (stricter, `M.md` row remains true) |
| PC-L11 | q1 ENGINE-Q24: query margin `a.radius + maxRadius(world)` | for Ancient (elephant radius 1.5 and scaled mutator bodies) a margin below or above 1.8 changes which pairs are pushed, i.e. G1 | `max(legacy constant, maxRadius over `_nf` defs)`, 0 for Ancient (D-L18, 3.3.8) |

## 7. Open items

| # | item | owner | deadline |
|---|---|---|---|
| OI-L1 | amend `M.md`: events `unit_withdraw air_remnant` and the `unit_air_state` payload (3.2), validator codes `E_TAG_DRIVE E_TAG_AIRCLASS E_AIR_WM E_SQUAD_MIX`, Unit fields of 3.2, bark keys of 3.12, hash block (L), sentences of PC-L1, PC-L2, PC-L3, S35 row text | DESIGN-SIM with REVIEWER | P0 exit (spec index, `M.md` OI-2) |
| OI-L2 | amend `spec/W` 3.6.1-3.6.2 per PC-L4 (mask comment, exact EDT, fine `walkH/clearH`, baseline recompute) and confirm that hover units cross lava (HZ6, `spec/W` hover view) with the Sci-Fi feel sheet | DESIGN-WORLD, DESIGN-ERA-SF | P0 exit |
| OI-L3 | `possess` command extension, key table, HUD class field and touch buttons (3.9.8) in `spec/CU` and as requests | DESIGN-UX, INTEGRATION | before WP-V4 (P2, before M8 lands) |
| OI-L4 | fit the draft tunables of 3.13 (`AIR_CLASS`, `DRIVE`, bailout counts, cover) against the Medieval dragon slice (after WP-L4) and the Modern tank slice (after WP-V1) | BALANCE with SIM | E-FREEZE of each era (P3 start) |
| OI-L5 | create `tools/perf_layers.mjs`, `tests/fixtures/field_sched_model.mjs`, `field_trace_ancient.json` (recorded from the baseline worktree), `tests/fixtures/layer_defs.mjs`; the four "limit" micro-probes become measurements | SIM, TOOLS-VERIFY, TOOLS-GOLDEN | WP-L3 landing (P2) |
