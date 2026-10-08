# spec/M: mechanics specification, part 1 (DESIGN-SIM; plan v3.1 section 4; companion `M-layers.md`)

Status: final for fields, algorithms, vocabularies, tests; budget numbers are **draft until the end of P1** (plan section 14). Written against the code at commit `b2200f5` (all `file:line` references were read, not recalled; where a map under `docs/eras/maps/` disagrees, the code won: see section 6). Probes behind the numbers live in the author scratchpad only; every number marked "measured" can be re-run with `node tools/perf_sim.mjs` or the one-page formulas in 3.7.

## 1. Purpose and scope

**Binds.** All 19 SIM modules in landing order (M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e M8 M9 M11 M4 M5 M6b = S28..S46), their def/unit/prop/hazard/projectile fields, tick positions, algorithms, events, RNG forks, budgets, tests, S-criteria, negative controls and Ancient policy. For M7 (layer audit, air AI, flow-field schedule, clearance), M8 (vehicle, turret, possession) and M9 (cover, LOS) this file holds the **pointer sections** (3.10, blocks M7, M8, M9): the contract they must honour, their DAG edges, budget shares, event/field names and criteria ids; the full algorithms are in `docs/eras/spec/M-layers.md` (other author). Where the two files disagree on a name or number listed here, this file wins for names (it owns `TOP_KEYS`/`SUB`, `EVENTS`, forks) and M-layers wins for the M7/M8/M9 internals.

**Builders.** SIM (one agent at a time in `src/sim/**`), TOOLS-GOLDEN (G1/G3/G11 extensions in 3.14, 4), TOOLS-GATE/VERIFY (perf method 3.13, criteria rows in 4), REGISTRY and INTEGRATION (registry/kit plumbing, `LOG_FIELDS`, readers of god powers), RENDER/ANIM-CLIPS/AUDIO (hooks listed per module and in 3.12), COMEDY-x (bark/lesson ids, text slots), UNITS-x and CAMPAIGN-x (closed vocabularies, role rows, fixtures), BALANCE (pacing fit, power fit), REVIEWER, QA. Nobody outside SIM edits `src/sim/**`; everything SIM needs from other owners is listed in 3.15 ("cross-owner interface").

**Rule zero (plan non-negotiable 1-3).** Every new def/unit/prop/hazard/projectile field defaults to legacy behaviour and is `undefined` on all 43 Ancient defs; the Ancient era changes by zero bits; a table row in 3.16 (AP rows owned by this file) states the policy for each touched Ancient path (default: bit-identical opt-in; the only deliberate deltas are none).

## 2. Decisions

| # | decision | rationale | plan |
|---|---|---|---|
| D-M1 | Landing order is the plan table; the DAG (3.2) is the truth, the numeric position is a schedule. Acceptance compares **module sets** and E-FREEZE sets, not positions. M15 and M17e keep slots #12/#13 but have a "core" step that may be pulled forward (earliest legal slots in 3.2) | q3_engine B2, q3_program residual 1; edges are real, positions are not | 4 |
| D-M2 | E-FREEZE is a prefix: Medieval = #1..#13, Modern = #1..#16, Sci-Fi = #1..#19 | q3 B2 | 4 |
| D-M3 | New def keys are **appended** to `TOP_KEYS`/`SUB` (3.4); `undefined` on Ancient so `JSON.stringify(def)` is unchanged (JSON drops `undefined`); no `era` key on defs (era lives in the registry side map) | q2_engine Q20; hidden-class discipline `defs.js:7-12` | 0.2, 4 |
| D-M4 | Closed vocabularies live in `src/sim/vocab.js`; `src/sim/schema.js` `validateDef` rejects anything outside them; every table with a silent default gets explicit rows and a throw path for new-era input (3.9) | q2_engine Q4, q3 residuals 21-22 | 4 (M0) |
| D-M5 | New damage types `bullet explosive energy emp` use a **penetration model** (pen vs armour grade, three outcomes, chip floor 0.1); legacy five types keep `max(1, raw*(1-eff))` with the 0.9 cap bit-identical | q1 ENGINE-Q12: the legacy floor makes rifles kill tanks | 4 (M1) |
| D-M6 | Armour grades and penetration share one scale (`armor` 0..1.5, `pen` 0..2.5); `armorFace {front, side, rear, top}` are grades; `o.face` is pre-resolved (M1 stub = no face, M8 resolver) | q3 residual 14 | 4 (M1, M8) |
| D-M7 | Hitscan is a pooled transient `Projectile` resolved inside `fire()` by a 2.5 u sampled ray (measured 1.2 us per 40 u ray, 3 us worst) | one hook contract (`onAim/onFire/onHitDealt`, `projectile_launch`) | 4 (M2) |
| D-M8 | Rate-of-fire contract is tick-quantised: single shots need `cd >= 0.8 s`; faster weapons use `burst` with `burstGap` in whole ticks; a burst must fit inside `cd`; ammo counts rounds | q1 CONTENT-Q14; `cdR` decrements per tick so a 0.6 s cycle already loses 5.6% (one extra tick) | 4 (M2) |
| D-M9 | Per-kind projectile rows (`projkinds.js`) replace the hard-coded special cases; Ancient kinds reproduce the legacy numbers exactly (stick 2.5 s unit / 4 s ground for arrow, javelin, pilum / 3 s prop / bolt 1.0 s; life 6) | q2_engine Q5 | 4 (M2) |
| D-M10 | Friendly fire: hitscan passes allies unless `rules.friendlyFire`; area attacks always hurt allies; `arc:'high'` shells ignore allies in flight; new kinds use an RNG-free parity rule instead of the legacy 50% draw | q3 residual 15 | 4 (M2) |
| D-M11 | Added randomness only from per-mechanic forks created at World construction (`new RNG(seed ^ hashString(label))`, creation order irrelevant); all legacy draw sites stay on the main stream | q2_engine Q16, q3 residual 12 | 0.3 |
| D-M12 | `stateHashFull` is a separate function; the legacy `stateHash` stays byte-identical; the event stream is folded **at emit time** through `EventBus.fold`; event field lists are append-only and Ancient worlds fold only the frozen v8 prefix | pooled payloads; Ancient `stateHashFull` must survive later modules | 0.3 |
| D-M13 | Roles: add `vehicle` and `air` to the nine legacy roles; closed subset per era (3.3); customs may only be `melee ranged support hero`; `def.model.rig` mandatory for non-hum1 defs | q3 residual 22 | 4 (M2b) |
| D-M14 | Targeting: per-def target class + doctrine weights in a table (3.9); ring rule off and single pass for `m2b` units; futility term for shots that bounce | q1 ENGINE-Q2 | 4 (M2b) |
| D-M15 | One strike primitive `World.strike(...)`, one dirty API `markNavDirty(rect, classMask)`, one big-area buffer `bigQuery`; lazy craters never call `invalidateFields` | q3 residuals 17-18, ENGINE-Q23/28 | 4 (M10) |
| D-M16 | `Prop.team`, `info.gate`, `info.coalesce`, `ranged.structDmg`, `editTerrain` are opt-in per prop/weapon row; Ancient props/weapons never set them | ENGINE-Q4 policy (a) | 4 (M12) |
| D-M17 | Objectives `capture defend_core escort` + destroy-by-def/tag; sim-side `ScriptRunner` (`script.js`) for `strike spawn prop weather beat setpiece`; mid-battle spawns are excluded from `startCount/startCost` and counted in `stats.spawnedAlive` | q1 ENGINE-Q25 | 4 (M14, M13) |
| D-M18 | Abilities as params: only 3 new registry ids (`cloak lay_mine call_strike`), 27+3 = 30 <= cap 32, so no spec amendment is needed; `banner blink gas smoke bailout emp repair` are params of existing ids | map 02 seam 26 | 4 (M13) |
| D-M19 | Era kit = one data record read once at World construction: barks, lessons, waves, god powers, intervention, mascot, pacing, gravity multiplier, weather rows, armygen rows; Ancient kit is assembled from today's constants (bit-identical) | q1 ENGINE-Q11/Q30/Q38 | 4 (M15) |
| D-M20 | M15 is ONE module (S45) with two landing steps: step 1 kit plumbing lands with M0's work packages (P1), step 2 at #12; there is no "M15a"/"M15b" | q3_product residual 11 | 4, 12 |
| D-M21 | M17e picks death/hit clips from data tables (`M17t`) by (cause class, rig); `deathLinger` becomes a per-rig constant so tables cannot change sim state; wrecks are non-blocking props, cap 24, ttl 25 s | q3 residual 19; "tables change no stateHashFull" | 4 (M17e) |
| D-M22 | Watchdog: `lastDamageT` stays the Ancient trigger; `lastProgressT` lands in M4 (eras with shields); Modern before M4 relies on the legacy trigger, which already ignores suppression and healing | q3 residual 32 | 4 (M4) |
| D-M23 | Three independent sim budget gates; thresholds are written in reference-box ms and **normalised by a measured box factor k** (this authoring box runs the Ancient tick at 1.9x the map-02 numbers, so absolute ms are not portable); allocation by module sums by script (3.13) | measured, section 6 PC-1 | 0.4 |
| D-M24 | Per-module ablation is done by **stripping the module's fields from the defs** (`tools/lib/ablate.mjs`), never by runtime flags in the hot path | zero cost for production; same army, same engine | 4, 9 (ER6) |
| D-M25 | Warm-up rosters are generated per era from the roster manifest by slot rules (3.14), with coverage and cold-start ceilings | ENGINE-Q32 (was UNADDRESSED) | 4 |
| D-M26 | `power.js` new terms are guarded by `def._nf` (set only when a new field is present); Ancient `power(def)` is bit-identical (G11); `unitinfo.js` imports a new `dpsDisplay`, not `dpsOf` (section 6 PC-3) | q2_engine Q6 | 4 (M1, M2, M4) |
| D-M27 | Status semantics are assigned to the applying module: SUPPRESS (M2), EMP (M6b), CLOAK (M5), SHIELDDOWN (M4); M3 only allocates slots 20..23, unit fields and tint rows | q3 residual 13 | 4 (M3) |
| D-M28 | `killUnit` causes are a closed list (27 ids) with kill-verb, announcer route, reaction row and lesson row each | q3 residual 20 | 4 (M17e) |
| D-M29 | Every Ancient-path touch is a row in 3.16 with policy and golden; default bit-identical opt-in, no deliberate Ancient delta in this file | plan 0.1 | 0.1 |

## 3. Detailed specification

### 3.1 Conventions, files, fixtures

* **New files** (all pure JS under `src/sim/`, no `window`): `vocab.js schema.js rngforks.js hashfull.js kit.js` (M0), `armor.js` (M1), `projkinds.js ray.js suppress.js` (M2), `strikes.js` (M10), `script.js` (M14), `react.js` (M17e), `shield.js` (M4), `cloak.js` (M5), `mines.js` (M11), `abilities/{cloak,lay_mine,call_strike}.js` (M5/M11/M13); pointer modules `layers.js turret.js cover.js` (M7/M8/M9, owned by M-layers). Tools: `tools/lib/ablate.mjs`, `tools/perf_budget.mjs`, `tools/gen_warm.mjs`, `tools/pacing_fit.mjs`, `tools/power_fit.mjs`. Fixtures: `tests/fixtures/mech_defs.mjs` (synthetic defs `fx_*`, status `test`, never in a pack; numbers frozen by a digest after the first test that uses them), `tests/fixtures/fork_labels.json` (append-only ledger).
* **Test naming.** `tests/sim/m<pos>_<slug>.test.mjs`, tests named `Sxx <slug>/effect|limits|ai|event|ancient`. Criterion registration: `criterion('S29', {owner:'SIM', tier:'T-fast', negctl:'tests/negctl/S29.mjs', text})`. Negative controls: `tests/negctl/S28.mjs..S46.mjs`, each a mutation plus the check id that must turn red.
* **Machine-readable tables** in this file are fenced blocks tagged `modules` and `budget` (3.2, 3.13); `tests/sim/dag.test.mjs` and `tools/perf_budget.mjs` parse them, so edit them only through a logged amendment.
* **Fixture defs** (numbers used by the worked examples and tests; role, then ranged/armour):

| id | role/layer | key numbers |
|---|---|---|
| `fx_rifleman` | ranged | hp 140 armor .15; rifle dmg 14 cd 1.2 range 40 type bullet pen .35 speed 120 spread .045 lead mag 30 reload 2.4 suppress{r2.5,amt.12} life 1.5 |
| `fx_mg` | ranged | dmg 6 burst 8 burstGap .1 cd 1.2 pen .2 range 45 spread .07 mag 120 reload 4 suppress{r3,amt.10} |
| `fx_sniper` | ranged | dmg 70 hitscan cd 3.0 pen .8 range 60 mag 5 reload 3 doctrine sniper |
| `fx_tank` | vehicle | hp 2000 armor .5 armorFace{front .9, side .6, rear .3, top .3}; shell dmg 150 pen 1.2 aoe 2.5 type explosive cd 4 range 55 speed 90 |
| `fx_at` / `fx_aa` | ranged | rocket dmg 120 pen 1.4 aoe 1.5 air:false cd 5 range 45 / dmg 80 pen .9 homing 3.0 rad/s air:'only' range 50 |
| `fx_heli` | air | hp 900 armor .4 armorFace{.5,.4,.3,.3} cruiseAlt 8; gun dmg 9 burst 6 gap .08 cd 1.0 pen .3 range 38 |
| `fx_shield_trooper` | ranged | hp 160 eshield{cap 120, regen 25/s, delay 3, recover 4}; laser hitscan type energy dmg 12 burst 3 gap .1 cd 1.5 pen .5 range 36 |
| `fx_howitzer` | siege | arc high shell dmg 160 aoe 5 crater 'lazy' cd 6 range 90 minRange 25 setup 4 structDmg 1 |
| `fx_trebuchet` / `fx_knight` / `fx_pike` / `fx_healer` | siege / cavalry / melee / support | boulder dmg 90 aoe 4 crater lazy structDmg 2 / hp 420 armor .55 charge{dmg 1.6,kb 2} / reach 3.2 tag pike / heal_pulse filter organic |

### 3.2 DAG, landing order, E-FREEZE sets

```modules
[{"id":"M0","S":"S28","pos":1,"deps":[]},{"id":"M1","S":"S29","pos":2,"deps":["M0"]},{"id":"M3","S":"S30","pos":3,"deps":["M0"]},{"id":"M2","S":"S31","pos":4,"deps":["M0","M1","M3"]},{"id":"M2b","S":"S32","pos":5,"deps":["M1","M2","M3"]},{"id":"M10","S":"S33","pos":6,"deps":["M1","M2"]},{"id":"M6a","S":"S34","pos":7,"deps":["M2b"]},{"id":"M7","S":"S35","pos":8,"deps":["M2","M2b","M3","M10"]},{"id":"M12","S":"S36","pos":9,"deps":["M7","M10"]},{"id":"M14","S":"S37","pos":10,"deps":["M10","M12"]},{"id":"M13","S":"S38","pos":11,"deps":["M2b","M3","M10"]},{"id":"M15","S":"S45","pos":12,"deps":["M0","M2","M10","M14"]},{"id":"M17e","S":"S46","pos":13,"deps":["M1","M3","M12"]},{"id":"M8","S":"S39","pos":14,"deps":["M1","M2","M7"]},{"id":"M9","S":"S40","pos":15,"deps":["M2","M8","M12","M13"]},{"id":"M11","S":"S41","pos":16,"deps":["M10","M12","M13"]},{"id":"M4","S":"S42","pos":17,"deps":["M1","M3","M15"]},{"id":"M5","S":"S43","pos":18,"deps":["M2b","M3","M13"]},{"id":"M6b","S":"S44","pos":19,"deps":["M3","M4","M6a","M13"]}]
```

E-FREEZE sets (prefix of `pos`): **Medieval** = {M0 M1 M3 M2 M2b M10 M6a M7 M12 M14 M13 M15 M17e}; **Modern** = Medieval + {M8 M9 M11}; **Sci-Fi** = Modern + {M4 M5 M6b} = S-FREEZE. M16 is withdrawn (ids skip it). `tests/sim/dag.test.mjs` asserts: the `modules` block has the 19 ids of the plan table and S28..S46 once each; every `deps` entry has a smaller `pos` (acyclic, schedule-consistent) **except** the declared core steps below; the three E-FREEZE sets are prefixes; every later module has an `inert_<module>_<era>` test for each frozen era (3.14, 4).

**Edges and reasons** (from -> to):

| edge | reason (where it bites) |
|---|---|
| M0 -> all | schema validator, forks, `stateHashFull`, kit/`World({era})`, `ensureEra`; nothing else may add a draw or a def key |
| M0 -> M3 | `Unit` fields and `N_SE` are declared inert by M0's schema, activated by M3 |
| M1 -> M2 | `ranged.type` in `{bullet,explosive,energy,emp}` and `ranged.pen` need the pen pipeline; hitscan sets `o.proj` into it |
| M3 -> M2 | `u.ammo u.sup u.layer` and `SE.SUPPRESS` must exist before M2 writes them (q2_engine Q9b) |
| M1,M2,M3 -> M2b | futility term reads `pen`/`armorFace`; masks read `ranged.air` (the plan's air/groundOnly flags) (declared and validated in M2, enforced in M2b) and `u.layer` (M3) |
| M1,M2 -> M10 | `explosive` type, `arc:'high'`, `payload`, `crater:'lazy'`, `structDmg` rows; strike uses the pen model |
| M2b -> M6a | organic/machine flags are `_ai` bits computed in M2b's `aiInfo` extension |
| M2,M2b,M3,M10 -> M7 | air/ground flags, masks, `u.layer`, `markNavDirty` is made class-aware by M7 |
| M7,M10 -> M12 | event-driven dirty path touches only affected (team,class) fields (needs M7's class fields); coalescing uses `markNavDirty` |
| M10,M12 -> M14 | script `strike` uses the primitive; `destroy`/`defend_core` need prop team/tag; `prop` script event |
| M2b,M3,M10 -> M13 | `bailout` needs squads/AI rule and accounting; `call_strike` calls `strike`; statuses |
| M0,M2,M10,M14 -> M15 | kit plumbing (M0); gravity touches projectiles (M2); orbital power calls `strike` (M10); lessons/barks for objectives (M14) |
| M1,M3,M12 -> M17e | cause vocabulary (M1), `u.deathCause` and tint rows (M3), wreck props (M12 `spawnProp` non-blocking path) |
| M1,M2,M7 -> M8 | `o.face`, firing gate `rangedReady`, hover/air layers for per-class possession; M7 delivers gunship "face and fire", M8 re-opens air only for turret/aim-gated weapons |
| M2,M8,M12,M13 -> M9 | LOS is sampled at M8's firing gate; prop `cover:'low'` (M12); smoke is an effect from M13/M10 |
| M10,M12,M13 -> M11 | mine blast uses `areaDamage`/big buffer; hazard sanitizer and `Prop` records (M12); `lay_mine` follows the ability-param pattern (M13) |
| M1,M3,M15 -> M4 | absorb sits in the pen pipeline; `SE.SHIELDDOWN`; progress watchdog reads `kit.pacing` |
| M2b,M3,M13 -> M5 | `pickTarget` skip uses `_ai.detect`; `SE.CLOAK`; ability-param pattern |
| M3,M4,M6a,M13 -> M6b | EMP zeroes shields (M4), uses the machine filter (M6a), `cc_field` effect (M13 cap rule) |

**Movable windows (core steps).** `M15.core` (kit schema, `World({era})`, pacing record, mascot/intervention, gravity multiplier, GodPower interpreter shell) depends only on M0; `M17e.engine` (selection function, default table, `deathLinger` per rig) depends only on M1+M3. COORD may schedule them as early as right after M0 / M3; the **module** remains at #12/#13 and closes only when its per-mechanic lessons, barks and tables (appended by each mechanic's own module) are complete. Reason: q3_program residual 1 (do not make Medieval wait) and q3_engine B2 (keep the table honest) are both satisfied because acceptance compares sets.

### 3.3 Closed vocabularies (`src/sim/vocab.js`; validator rejects anything else)

* **Damage types** (`DAMAGE_TYPES`, 9): `slash pierce blunt fire magic` (legacy model) + `bullet explosive energy emp` (pen model). `AP` gains rows `bullet 0, explosive 0.3, energy 0.5, emp 1.0`, used **only** as NaN-trap protection for code that reads `AP[type]` (no new-type hit reads them). Test iterates every `melee.type`, `ranged.type`, every ability that builds a `Hit`, every `STRIKE_KINDS` row and every hazard kind row: all in the list, all with an `AP` row.
* **Layers** (`LAYER_ID`): `ground 0, hover 1, air 2` (`def.layer` string, `u.layer` int).
* **Roles** (`ROLES`, 11): `melee ranged cavalry hero siege support monster beast swarm vehicle air`. Per era (`ERA_ROLES`): Ancient = the first nine (frozen); Medieval = nine + `air` (dragon, wyvern; roster amendment needed for anything else); Modern = `melee ranged hero siege support beast vehicle air`; Sci-Fi = `melee ranged hero siege support monster beast swarm vehicle air`. Artillery, mortars, howitzers, trebuchets = `siege`; mechs, tanks, hover tanks, APCs, jeeps = `vehicle` (tag `mech` for walkers); helicopters, drones, dropships, dragons = `air`. Role = behaviour class (squad/line/cost); locomotion = `layer`.
* **AI styles** (`AI_STYLES`): `charge hold skirmish flank guard support siege hero`. **Doctrines** (`ai.doctrine`, M2b): `line aa at sniper mg arty gunship tank emp cloaker detector engineer`; absent = legacy scoring.
* **Target classes** (`TCLASS`): `0 INF, 1 VEH, 2 AIR, 3 MECH, 4 ARTY, 5 OFFICER, 6 SUPPORT, 7 MONSTER, 8 CAV, 9 SWARM` (derived in `aiInfo`, rule in 3.9). **Faces**: `-1 none, 0 front, 1 side, 2 rear, 3 top`.
* **Statuses** (`SE`, 24): legacy 0..19 + `SUPPRESS 20, EMP 21, CLOAK 22, SHIELDDOWN 23` (append only; `N_SE = 24`). Legacy hard-coded index literals in `statusMode` (`battleview.js:21-31`): `0,13,5,3,7,4,12,10`; the test "every SE slot has a tint row" fails if a slot has no row in R6's SE->tint table.
* **Projectile kinds** (`PROJ_KINDS`): legacy `arrow javelin pilum francisca boulder bolt coin sunbeam scepter thunderbolt` (+ runtime `crew`); Medieval adds `quarrel firepot`; Modern adds `pistol smg rifle mg sniper shell rocket mortar grenade flame`; Sci-Fi adds `laser plasma rail beam_pulse missile flechette`. Every kind has a row in `projkinds.js`, `PROJ_FX`, `PROJ_VIS`, the audio `PROJ_AUDIO` table (registry.verify, plan AR1/q3 residual 38).
* **Explosion kinds** (`EXPLOSION_KINDS`, free string today): legacy `crew boulder fire magic lightning meteor` + `shell rocket orbital prop mine emp grenade smoke`; each needs `EXPLOSION_AUDIO`/render rows.
* **killUnit causes** (`KILL_CAUSES`, 27): legacy 19 = the `KILL_VERBS` keys (`melee ranged aoe fire trample magic stone kick gore fall poison execute misfire bribe lightning drown lava spikes geyser`) + new `bullet explosion energy emp crush crash mine strike`. `bailout` is **not** a cause (it is a spawn event, nobody dies of bailing out; deviation from q3 residual 20 explained in the ledger). Cause mapping for new types in `killUnit`'s default: `o.cause || (proj ? 'ranged'...)` becomes `CAUSE_OF_TYPE = {bullet:'bullet', explosive:'explosion', energy:'energy', emp:'emp'}` when `o.proj` or `o.aoe` (legacy types keep `ranged/aoe/fire/magic/melee` unchanged); `crush` = vehicle run-over (`_trample` with mass>=8 `vehicle`), `crash` = air unit wreck impact (M7), `mine` (M11), `strike` (M10/M14/god power). Each id needs: `KILL_VERBS` row (COMEDY, >= 3 verbs), `CAUSE_SCREAM` row (AUDIO), reaction row (M17e table), lesson row (3.12). Test `S46 causes/event`: fuzz 40 battles per era, every `unit_kill.cause` in the list, every cause seen has all four rows.
* **Weather kinds** (`WEATHER_KINDS`): legacy `clear rain storm snow sandstorm fog`; draft additions `smog ion_storm ash` (rows in 3.12). `weatherMods` throws on unknown kind in new-era worlds (Ancient keeps the silent default).
* **Objective types**: legacy 7 + `capture defend_core escort`. **Script events**: `strike spawn prop weather beat setpiece`. **Prop flags**: `gate coalesce explosive decor wreck ttl pad` plus `cover: 'low'`. **Hazard kinds**: legacy `quicksand spikes fire boulders geyser lava` + `mine_ap mine_at`.

### 3.4 Def schema additions (appended to `TOP_KEYS`/`SUB` in `defs.js`; all `undefined` on Ancient)

`TOP_KEYS` append (after `'_ai'`): `layer cruiseAlt turret armorFace resist eshield squad charge brace react wreck _nf`. `SUB` additions: `ranged` append after `'kb'`: `burst burstGap mag reload suppress hitscan arc homing lead stick muzzle clip air structDmg pen life setup payload craterMode friendly`; `ai` = `['style','aggro','preferTargets','doctrine','weights','cover','detect']` (today only `style`); `melee` unchanged (plus `pen` appended for plasma blades: `pen` after `ap`); new sub-objects `eshield`, `armorFace`, `turret` get fixed key order via `SUB`.

| key | type, default (undefined) | range / rule (validator code) | module |
|---|---|---|---|
| `layer` | `'ground'\|'hover'\|'air'` | air/hover need `role` vehicle/air/support/hero; `E_LAYER` | M3/M7 |
| `cruiseAlt` | number u | 3..20, required for `air` | M7 |
| `turret` | `{rate rad/s, arc rad, hullTurn rad/s}` | rate .5..6, arc .2..3.14; role vehicle only | M8 |
| `armorFace` | `{front,side,rear,top}` grades | each 0..1.5; role vehicle/air/hero | M1 |
| `resist` | `{bullet,explosive,energy,fire,...}` multiplier 0.2..1.5 | applied after pen/mods, default 1 | M1 |
| `eshield` | `{cap, regen, delay, recover, vs?}` | cap 10..2000, regen 0..100/s, delay 0.5..10, recover 0.5..10 | M4 |
| `squad` | int placement brush | 1..20; overrides `squadSize` role default | M2b |
| `charge` / `brace` | `{dmg,kb}` / `{mul,arc}` | defaults `G.chargeDmg/chargeKb`, `G.braceMul/braceArcCos` | M1 |
| `react` | string key into reaction table | must exist in the era's `M17t` table | M17e |
| `wreck` | prop type id | prop has `wreck:true` | M17e |
| `_nf` | bool, set by `normalizeDef` only when any new key is present | power.js guard | M0 |
| `ranged.burst` | int 2..12 | `cd >= burstSpan` (3.8); `E_BURST` | M2 |
| `ranged.burstGap` | s, rounded to whole ticks | .05..0.5 (2..15 ticks); default .1 | M2 |
| `ranged.mag/reload` | int 2..200 / s .5..8 | `reload` clip `reload_gun` must exist | M2 |
| `ranged.suppress` | `{r, amt}` | r 1..6, amt .02..0.4 | M2 |
| `ranged.hitscan` | bool | the effective gravity must be 0 (kind-row default or stated; an absent value falls back to `G.gravity`, `projectiles.js:37`) and `speed` absent | M2 |
| `ranged.arc` | `'low'\|'high'` | `high` needs `minRange`, `aoe` | M10 |
| `ranged.homing` | rad/s 0.5..8 | rockets/missiles only | M2 |
| `ranged.lead` | bool | default legacy rule (lead iff gravity>0 and proj != bolt) | M2 |
| `ranged.stick` | `{unit,ground,prop}` s | default = kind row | M2 |
| `ranged.muzzle` | `[fwd,up,side]` u | default `[0.5, 0.72*height, 0]` | M2 |
| `ranged.clip` | clip id | registered by exactly one rig (q3 residual 5) | M2 |
| `ranged.air` | `true\|false\|'only'` | `false` = ground only (plan's `groundOnly`), `'only'` = anti-air; default `undefined` = hits both (legacy once air exists); no separate `groundOnly` key | M2/M2b |
| `ranged.structDmg` | multiplier 0.05..4 | presence enables non-aoe prop damage | M12 |
| `ranged.pen` | grade 0..2.5 | required iff `type` in the pen set; `ap` forbidden there (`E_AP_ON_NEW_TYPE`) | M1 |
| `ranged.life` | s 0.2..8 | default 6 (legacy) | M2 |
| `ranged.setup` | s 0.5..8 | crew weapons: stationary time before firing | M2 |
| `ranged.payload` | `{effect:'smoke'\|'gas'\|'flash', r, dur, dps?}` | on impact via `addEffect` | M10 |
| `ranged.craterMode` | `'lazy'` | `crater:true` stays boolean = legacy immediate | M10 |
| `ranged.friendly` | `'pass'\|'hit'` | override of the 3.8 default | M2 |
| `ai.doctrine/weights/detect/cover` | string / `{class:bonus}` / u / bool | doctrine in vocabulary; weights keys in `TCLASS`; `detect` 2..30 | M2b/M5/M9 |

`validateDef(def, {era})` returns `[{code, path, msg}]` with codes `E_UNKNOWN_KEY E_TYPE E_ROLE E_ERA_ROLE E_PROJ E_PEN_MISSING E_AP_ON_NEW_TYPE E_RIG E_ABILITY E_ABILITY_PARAM E_RANGE E_BURST E_CLIP E_LAYER E_CUT` (`E_CUT` = references a mechanic on the cut ladder, plan section 13). `tools/contracts.mjs` and `registry.verify()` call it for every def of every pack; `tests/sim/schema.test.mjs` has one bad fixture per code.

### 3.5 Unit fields and statuses (M3 allocates; initial values)

`Unit` constructor appends: `layer=0 aim=heading ammo=-1 reloadT=0 burstLeft=0 burstT=0 sup=0 sh=0 shMax=0 shT=99 cloak=0 cloakT=0 inCover=0 setupT=0 mSpread=1 flankedT=-99 empSrc=null`. `World.addUnit` sets `layer` from `LAYER_ID[def.layer]`, `ammo` from `ranged.mag`, `sh/shMax` from `eshield.cap`, `setupT = ranged.setup && o.packed ? ranged.setup : 0`. `Unit.altitude` (exists, unused today) becomes the current altitude above ground (M7). All are plain numbers (monomorphic).

| slot | name | applied by | semantics |
|---|---|---|---|
| 20 | SUPPRESS | M2 | refreshed to 0.6 s while `u.sup > 0.25` (icon/tint); the effect is carried by `u.sup` (3.8) |
| 21 | EMP | M6b | machines only; treated like STUN in `think`'s hard-disable branch; zeroes `u.sh`, forces SHIELDDOWN, cancels CLOAK, air machines descend (M7) |
| 22 | CLOAK | M5 | remaining cloak seconds; `u.cloak` ramps 0->1 in 0.5 s |
| 23 | SHIELDDOWN | M4 | remaining seconds with regeneration blocked after a break |

`_updateStatusesAndMods` loop bound becomes `N_SE=24` (+20% iterations of a loop that is a few % of the tick; measured into the Ancient A/B, allocation M3 in 3.13).

### 3.6 Tick order (insertions marked NEW; positions are normative)

`tick()` (`world.js:444`): drain inputs -> `fold` hook active -> clear+insert spatial hash (M7: air units inserted too, queries filter by `layer`) -> flow fields (cadence `G.navRefresh=6`; **NEW** dirty slot per (team,class) from `markNavDirty`, M10/M12/M7) -> `_updateStatusesAndMods` (**NEW** sup decay, shield regen M4, cloak ramp M5, EMP) -> `updateSquads` -> waves, hazards (**NEW** mines M11), god powers, **NEW `_tickStrikes` (M10)**, possession, mutators -> per unit: cooldowns, `think` (**NEW** reload/burst/setup/turret/cover inside `rangedBehaviour`/WINDUP, M2/M8/M9), `_tickAbilities` -> `_integrate` (**NEW** altitude M7) -> `_separate` -> `proj.update` (**NEW** homing M2) -> `_tickEffects` (**NEW** smoke/gas kinds with a private buffer) -> `_tickProps` -> **NEW `flushPropDeaths` (M12)** -> `_tickMorale` -> reap -> dying -> `_checkEnd` (**NEW** reads `kit.pacing`) -> `objective.update` -> **NEW `script.update` (M14)** -> `onTick`.

### 3.7 M1 damage pipeline and penetration model (S29)

**Order of `applyDamage` (unchanged up to the branch):** `raw = base * (0.9 + rng*0.2)` (draw 1) -> shield block (front arc; `o.proj ? sh.proj : sh.block`; draw 2 only if a shield is present) -> crit (`rng < 0.06*mut`, draw: always, x2; **crit multiplies damage only, never penetration**) -> backstab (melee only) -> charge `1 + (src.def.charge ? src.def.charge.dmg : G.chargeDmg) * ch` (identical float for Ancient: same `G.chargeDmg`) -> `src.mDmg`, `mut.dmg`, `dst.mDmgTaken` -> fire/sleep/stone factors -> **branch on `TYPE_MODEL[type]`**:

* model 0 (legacy five types): `apv = o.ap >= 0 ? o.ap : AP[type]; eff = clamp((armor+mArmor)*(1-apv), 0, 0.9); fin = o.fixed ? raw : max(1, raw*(1-eff))` **verbatim** (`combat.js:130-132`). If the defender has `armorFace` the scalar `armor` term is replaced by `armorFace[face]` (face from `o.face`, fallback front); only new-era defs have `armorFace`.
* model 1 (`bullet explosive energy emp`): (a) shield-pool absorb first (M4): `abs = min(dst.sh, raw); dst.sh -= abs; raw -= abs`; if `raw <= 0` return 0 after `shield_hit`; (b) `emp` on a non-`machine` target returns 0 before any draw; (c) grade `T = (face >= 0 && armorFace ? armorFace[face] : dst.def.armor) + dst.mArmor`; `q = pen/T` (`T <= 0` -> PEN, mult 1); (d) outcome: **PEN** `q >= 1`: `mult = 1 - 0.5*min(1, T/pen)`; **GLANCE** `0.75 <= q < 1`: `mult = 0.25`; **BOUNCE** `q < 0.75`: `mult = 0.04`; (e) `fin = o.fixed ? raw : max(0.1, raw*mult*resist[type])` (chip floor 0.1, not 1); (f) BOUNCE/GLANCE emit `unit_deflect` (3.12), zero the knockback (`kb = 0`, no stagger) and do not raise `anim.flinch`; (g) everything after (hp, knockback, events, hooks, `killUnit`) is the legacy tail. `o.pen` comes from the projectile (`p.pen`), `_explode` (`h.pen = p.pen`), strikes/mines (`HIT_PEN` constants in `strikes.js`/`mines.js`); a new-type hit with `o.pen < 0` throws in dev worlds and uses 0.5 in production.
* Faces: aoe hits resolve face `top` (3); projectile hits resolve from the projectile velocity vs `dst.heading` (M8 resolver `armor.js:resolveFace(dst, o, ax, az)`; M1 ships the stub returning `-1` when the def has no `armorFace`, `0` otherwise, and tests pass `o.face` explicitly).

**Worked examples (computed with the rules above; the test asserts them to 1e-9; dmg is the pre-modifier base, no jitter/crit):**

| weapon (dmg, pen) | vs tank front .9 | side .6 | rear .3 | top .3 | vs vest .15 | vs power armour .6 | unarmoured |
|---|---|---|---|---|---|---|---|
| rifle (14, .35) | bounce 0.56 | bounce 0.56 | **pen 8.00** | pen 8.00 | pen 11.00 | bounce 0.56 | 14.00 |
| MG round (6, .20) | bounce 0.24 | bounce 0.24 | bounce 0.24 | bounce 0.24 | pen 3.75 | bounce 0.24 | 6.00 |
| sniper (70, .80) | glance 17.50 | pen 43.75 | pen 56.88 | pen 56.88 | pen 63.44 | pen 43.75 | 70.00 |
| AT rocket (120, 1.4) | **pen 81.43** | pen 94.29 | pen 107.14 | pen 107.14 | pen 113.57 | pen 94.29 | 120.00 |
| tank shell (150, 1.2) | pen 93.75 | pen 112.50 | pen 131.25 | pen 131.25 | pen 140.63 | pen 112.50 | 150.00 |
| laser rifle (16, .5) | bounce 0.64 | glance 4.00 | pen 11.20 | pen 11.20 | pen 13.60 | glance 4.00 | 16.00 |

Hits to kill a 2000 hp tank: rifle front 3572 vs rear 250; MG 8334 (chips at every face); AT rocket 25 front / 19 rear; sniper 115 front, 46 side. For contrast the legacy formula gives a rifle (14, ap .2) 3.92 per hit on armour .9 and a dmg-5 MG a flat 1.0 (the floor), i.e. 120 riflemen killed a 2000 hp tank in 19.1 s (q1 probe); with the pen model 120 riflemen at cd 1.2 (100 shots/s) need 35.7 s from the front but 2.5 s from the rear. These are the design intent: **flank armour, rockets beat armour, MG chips**.

`charge`/`brace` per-def overrides (Medieval heavy cavalry vs spear wall) live here: `resolveMelee` brace uses `t.def.brace ? t.def.brace.mul : G.braceMul` and arc `t.def.brace.arc`; Ancient defs have neither key, so the same constants are read.

**Tests (`tests/sim/m02_damage.test.mjs`).** effect: the table above (42 cells) + crit invariance (a crit doubles `fin` for a PEN, never turns BOUNCE into PEN: 10 000 seeded hits per cell, outcome frequency identical with `critChance` 0 and 1) + chip floor (dmg 1 pen .1 on armor 1.0 gives exactly 0.1). limits: `T=0`, `pen=0`, `armorFace` 1.5, unknown type throws in dev. ai: n/a (M2b futility test covers use). event: `unit_deflect` count equals BOUNCE+GLANCE cells; payload fields declared. ancient: 5 legacy types x 4 armour x 3 `ap` grid equals a frozen copy of the legacy expression bit-for-bit (inside the test file, same pattern as G1's frozen `stateHash`), plus G1/G11.
**S29 text.** "Rifles bounce off armour grade 0.9 at the front and penetrate at the rear, rockets penetrate every face, MG rounds only chip; closed vocabulary has pen and AP rows; legacy types unchanged to the bit." **Negative control NC-S29:** change `BOUNCE` threshold 0.75 -> 0.40 (rifle front becomes a glance) or the chip floor 0.1 -> 1: worked-example check `S29 m02_damage/effect` red.

### 3.8 M2 weapons: burst, magazines, hitscan, projectile policy, friendly fire, suppression (S31)

**Projectile kind rows** (`projkinds.js`; one row per `PROJ_KINDS` id; fields `radius kb lead stick{unit,ground,prop} descent life clip`). Legacy rows are the numbers the code uses today and are frozen by the Ancient identity test:

| kind | radius | kb | lead | stick unit / ground / prop (s) | descent only | life | note |
|---|---|---|---|---|---|---|---|
| `arrow javelin pilum` | .3 | 1.5 | iff g>0 | 2.5 / **4** / 3 | no | 6 | `projectiles.js:106,114,145` |
| `francisca coin sunbeam scepter thunderbolt` | .3 | 1.5 | iff g>0 (sunbeam/scepter/thunderbolt have g 0: **no lead today**) | 2.5 / 0.01 / 3 | no | 6 | stays |
| `bolt` | .3 | **6** | never | **1.0** / 0.01 / 3 | no | 6 | ballista |
| `boulder` | **.6** | 1.5 | iff g>0 | explodes | yes (`vy>0` skipped) | 6 | catapult, cyclops |
| `quarrel` (Medieval) | .3 | 2.5 | yes | 2.5 / 4 / 3 | no | 4 | crossbow; `lead:true` explicit |
| `pistol smg` | .15 | 0.8 | yes | 0.01 / 0.01 / 0.01 | no | 1.2 | |
| `rifle mg sniper` | .15 | 0.8 / 0.8 / 2.0 | yes | 0.01 / 0.01 / 0.01 | no | 1.5 | speed 110-130 u/s |
| `shell` (direct cannon) | .5 | 6 | yes | explodes | no | 4 | `arc:'low'` |
| `rocket missile` | .35 | 5 | yes (+`homing`) | explodes | no | 5 | |
| `mortar grenade` | .5 / .3 | 6 / 3 | no | explodes | yes | 12 / 3 | `arc:'high'` |
| `laser rail beam_pulse` | .1 | 1 / 3 / 0 | n/a (hitscan) | n/a | n/a | 0 | resolved in `fire()` |
| `plasma flechette` | .3 / .12 | 2 / 1 | yes | 0.01 / 0.01 / 0.01 | no | 2 / 1.5 | |
| `firepot flame` | .4 / .5 | 1 / .5 | no | explodes / 0.01 | yes / no | 4 / .6 | fire type, ignite |

Kind rows also carry a default `gravity` used when `ranged.gravity` is absent: 0 for `pistol smg rifle mg sniper laser rail beam_pulse plasma flechette rocket missile flame`, `G.gravity` for the rest (every Ancient def states its gravity explicitly, so Ancient is unaffected; the legacy default `G.gravity` for an absent value would otherwise bend a rifle round). `stick` 0.01 means "gone next tick" (`update` deactivates when `stuck <= 0`). Pool: `ProjectileSystem` cap 600 growing to the hard limit 4000 (`projectiles.js:25-31`); past it `fire()` returns null **and now counts** `w.projDrops++` (folded into `stateHashFull`, printed by `perf_sim`, asserted 0 by the soak). Render cap 1500 (`battleview.js`, R-owned) is raised to the pool size by RENDER. Policy test `S31 pool/limits`: 300 `fx_rifleman`-class shooters at 2 rounds/s for 5 s (3000 shots, life 1.5, stick .01): `projDrops == 0`, peak `proj.live <= 1000`; the same load with legacy sticking arrows (2.5 s) keeps every hit round alive for 2.5 s, which is why bullets do not stick (q1 probe6, 600 units: 858 of 944 live projectiles were stuck ghosts).

**Burst, magazine, reload, setup (algorithm).**
```
// combat.js (M2)
export const rangedReady = (u) => u.cdR <= 0 && u.ammo !== 0 && u.setupT <= 0;   // legacy unit: ammo -1, setupT 0 => cdR <= 0. M8 appends && u.aimOk
startRanged(w,u):  clip = r.clip || rangedClip(d); dur,hit = ClipLib.dur/hit(clip); cdTotal = r.cd/u.mCd; rate = clamp(dur/(cdTotal*0.92),1,2.4)   // legacy lines kept
  u.stateDur = dur/rate; u.hitAt = hit/rate; u.cdR = cdTotal
  if (r.burst) { span = (r.burst-1)*gapTicks/30; u.stateDur = max(u.stateDur, u.hitAt+span+0.1); u.burstLeft = r.burst-1; u.burstT = gapTicks }
// ai.js think() case WINDUP, BEFORE the legacy hitDone block (so the first round, fired by that block, is not counted as a gap tick):
  if (u.burstLeft > 0 && u.hitDone && --u.burstT <= 0) { w.fireRanged(u); u.burstLeft--; u.burstT = gapTicks }
// world.js fireRanged(u): if (u.ammo === 0) { u.burstLeft = 0; return }  ... fire ... if (u.ammo > 0) u.ammo--   (volley = 1 round)
// rangedBehaviour / possession / breach: the four call sites of startRanged test rangedReady(u); if (u.ammo === 0 && u.reloadT <= 0) startReload(w,u)
startReload: u.state=CAST; u.stateDur=r.reload; u.reloadT=r.reload; setAnim(u,'reload_gun',1); emit unit_reload; bark 'reload'
// think() timed CAST end: if (u.reloadT > 0) { u.reloadT = 0; u.ammo = r.mag }        (a stun/stagger/rout mid-reload leaves ammo 0 => startReload again, deterministic)
// setup (crew weapons): each tick in think: u.setupT = (speedNow > 0.3 || moved) ? r.setup : max(0, u.setupT - dt)   (packs instantly, deploys over `setup` s)
```
`gapTicks = max(1, round(burstGap*30))` is stored on `_ai` (not on the def). Stagger/stun/rout/death zero `burstLeft`. `startRanged` call sites (`ai.js:275,333,373`, `possession.js:67`) and `fireRanged` (`ai.js:168`) are the only ones; a grep test pins the count so a fifth site fails the gate.

**Fire-rate contract.** `cdR` decrements once per tick, so a re-trigger happens `ceil(cd*30)` ticks after the start (plus at most one tick of float residue): single shots need `cd >= 0.8 s` (<= 4.2% error); faster weapons are bursts. Validator `E_BURST`: `hitAt(clip) + (burst-1)*gapTicks/30 + 0.1 <= cd` evaluated with the registered clip meta in `registry.verify()`, and the clip's own `dur/rate >= that span` (one windup clip per burst; per-round recoil pulses are render-side, one per `projectile_launch` with the new `src`/`round` fields). Design rate with a magazine = `mag / (mag/burst * cd + reload)` rounds per second. **Test `S31 rate/effect`**: six classes (fixtures: pistol cd .8; rifle cd 1.2 mag 30 reload 2.4 = 0.781 r/s; smg burst 3 gap .08 cd .9; mg burst 8 gap .1 cd 1.2 mag 120 reload 4 = 5.45 r/s; laser burst 3 gap .1 cd 1.5; sniper hitscan cd 3.0 mag 5 reload 3 = 0.30 r/s) shoot a pinned dummy for 120 s in Node with baked **and** `DEFAULT_META` clips: counted `projectile_launch` per shooter within 5% of design (both regimes; clips `shoot_rifle shoot_mg shoot_burst cast_beam crew_fire reload_gun` must be registered by exactly one rig and absent from `DEFAULT_META` plain ids of other rigs: q3 residual 5).

**Hitscan (`ray.js`).** `fire()` with `ranged.hitscan`: allocate `p` from the pool, fill it like any shot (so `onAim`, `onFire` hooks such as `misfire`/`misaim`/`fire_every` and the `projectile_launch` event keep one contract; `o.proj = true`, so shield `proj` roll, no backstab, cause `ranged`/`bullet`), then `_resolveRay(p)` instead of flight:
```
dir = normalize(vx,vy,vz); len = r.range + 4; step = 2.5; qr = 1.6 + max(0, w.maxRadius - 1.0)      // w.maxRadius from defs at construction
for s = 1.0; s <= len; s += step:
   P = S + dir*s;  if P.y <= arena.heightAt(P)+0.05 -> TERRAIN(s);  prop = w.propHit(P) -> PROP(s, prop)   // propBlocks == !!propHit
   hash.query(P.x,P.z,qr,qbufFx): per live non-DOWN unit c (enemy; ally rule below): t = (c-S).xz . dir.xz; lateral^2 < (c.radius+0.1)^2 and |y(t) - c.y..c.y+c.height+0.3|
   keep min t of the window; after the first window with a hit evaluate ONE more window and take the global min t
end: emit beam{kind,team,S,E,onUnit,src}; hit -> _hitUnit(p,u) (damage, projectile_hit, hooks); suppress at E; p.active=false; live--
```
Sampling every 2.5 u with radius 1.6 covers any body radius <= 1.0 (`sqrt(r^2+1.25^2) <= 1.6`); bigger bodies raise `qr` through `w.maxRadius`. Measured on the authoring box with the real `Spatial` at 300 units: **1.2 us per 40 u ray** (cheaper than a finite-speed bullet: 1.8 us per bullet-tick at 120 u/s, about 10 ticks of flight = 18 us). Rays are RNG-free except the muzzle spread (fork `era:fire`).

**Lead and accuracy.** `ranged.lead`: `undefined` = legacy rule (`g > 0 && proj !== 'bolt'`, `projectiles.js:41`); `true` = two-iteration lead for any finite speed; `false` = never. Era data sets `lead:true` on rifle/mg/sniper-flight/plasma/rocket rows. Spread draws: shooters whose def has `_nf` (any new key) use `w.rf.fire` (`gauss()` is 3 uniforms, std 0.3331), Ancient defs keep `w.rng`. `sp = r.spread * w.weather.sprdMul * u.mSpread`. **Hit-rate tests** (bands from a Monte-Carlo of the horizontal error with the real `RNG.gauss`, 400 000 draws; vertical error and body height move the real number by a few points, hence the bands; fixture rifleman, target radius .55 + bullet .15 = .7): static target at 34 u (0.85 x range): spread 0.045 gives **0.821** (0.04 -> 0.871, 0.05 -> 0.771): accept [0.75, 0.88]; target crossing at 2.6 u/s (0.74 u lateral during the 0.283 s flight): with lead within 3 points of static, without lead **0.474** (accept [0.40, 0.55]) and at least 25 points lower than with lead.

**Friendly-fire semantics (new rows; legacy rows keep the 50% draw at `projectiles.js:130`).** Hitscan: ray stops at the first **enemy**; allies are transparent unless `rules.friendlyFire` (campaign data sets it true, `campaign.js:156`), then the first unit of any team except the shooter is hit, allies with parity `((p.id*7 + u.id) & 1) === 0` (RNG-free "often pass over"). Finite-speed new kinds: same parity rule, and same-team units are ignored for the first 0.1 s of flight (`p.grace`) so a shell leaving a 2.2 u hull never hits the neighbour (ENGINE-Q36). Area attacks (`areaDamage(.., protect=-1)`) always hurt allies (UI copy `friendlyFireTip`). `arc:'high'` shells and `descent` kinds ignore all units until they descend, and ignore allies in flight even with friendly fire; the explosion hurts everyone. Test `S31 friendly/effect`: with and without the rule, 100 shots through an ally line.

**Homing and override.** `homing`: per substep the velocity direction rotates toward `p.tgt` (the target at fire time, straight flight once it is dead) by at most `homing*sdt` rad at constant speed, about 10 flops per substep (map 02 estimate 0.30 us per projectile-tick), RNG-free. `ranged.friendly 'pass'|'hit'` overrides the ally rule for a row (flame streams hit allies, sniper rounds pass them). A `Hit` gains `pen=-1`, `face=-1`, `empSecs=0` (reset in `Hit.reset`, so the pooled shape stays monomorphic).

**Muzzle.** `ranged.muzzle=[fwd,up,side]` default `[0.5, 0.72*height, 0]` (= `projectiles.js:35` today); new vehicle rows use `fwd = radius + 0.4`.

**Suppression (`suppress.js`).** `suppressAt(team, x, z, r, amt)` is called at every impact of a row with `ranged.suppress` (unit hit, terrain, prop, hitscan end): for each live unit of another team within `r` (not `machine`; `fearless` x0.4): `c.sup = min(1, c.sup + amt*(1 - d/r)*k)`. Per tick (`_updateStatusesAndMods`): `sup -= G.supDecay*dt` (**0.35/s**), `mS *= 1 - 0.45*sup`, `u.mSpread = 1 + 0.8*sup`, morale `-3*sup/s` while `sup > 0.5`, `SE.SUPPRESS = 0.6` while `sup > 0.25`, `unit_suppressed` on the upward crossing of 0.5. `sup >= 0.85` is "pinned": `rangedBehaviour` does not advance toward a target beyond 0.85 range. A pure-suppression or heal-only standoff still trips the legacy watchdog because neither calls `applyDamage` (test `watchdog_interim`, section 4). Cost: one `hash.query` per impact (~1 us), <= 10 per tick at 100 shooters.

**AI use (M2).** `rangedBehaviour` uses `rangedReady`, reload when empty (walks to the nearest friendly rear while reloading only if M9 landed), `setup` gating, pinned rule. **Events:** `projectile_launch` gains `src srcDef round`; `beam`; `unit_reload`; `unit_suppressed` (3.12). **View/audio/anim:** `PROJ_FX` muzzle/impact rows per kind (R1), StreakLayer from `beam` (R2), recoil pulse per launch, `reload_gun`/`shoot_*` clips (ANIM), `PROJ_AUDIO[kind]` and `AUDIO_PROFILES[srcDef].shoot` through `srcDef` (AUDIO).
**Tests (`tests/sim/m04_weapons.test.mjs`).** effect: rate x6, hitscan hooks fire (`fire_every` on a laser, `misfire` cancels), burst truncation at ammo 0, reload completes, setup gate. limits: pool 3000 shots, `projDrops` counted at the 4000 hard cap (fabricated), `burst 13` rejected. ai: pinned unit does not advance; empty mag reloads before re-engaging. event: `projectile_launch` carries `src srcDef round` and one per round; `beam` once per hitscan. ancient: every Ancient projectile kind fires one battle each (matrix in G1), plus a frozen-expression test of the unchanged `fire()` lead/stick/life branches for the 10 kinds.
**S31 text.** "Burst, magazine, hitscan and suppression weapons fire at their designed rate within 5% under baked and default clip timing, share one hook/event contract with ballistic shots, never exhaust the pool (3000 shots in 5 s, zero drops), obey the friendly-fire table; Ancient kinds are bit-identical." **NC-S31:** make `hitAt` ignore `gapTicks` in `startRanged` (burst truncated by the early `stateDur`): the rate test is red for `mg`.

### 3.9 M2b targeting, role model, silent-default tables (S32)

**Scoring.** Legacy terms stay verbatim (`ai.js:49-92`): `s = 100 - 2.2*dist`, `+25` current target, `-40` over-claimed melee slot, `+40` cav->archers/siege/support, `+24` spear->cav, siege `+12`+cluster (<= 26), ranged-first `+8` for hp < 50%, hard `+14*(1-hp%)`, officer `+10/+6`, stone `-20`, sleep `+6`, focus `+90`, `preferTargets` `+20` per tag, vip `+5`, hysteresis 18. **New (only when `info.m2b`, true iff the def has `ai.doctrine`, `ranged.pen`, `ranged.air`, or `layer`)**: `s += W[doctrine][tclass(c)] + (weights && weights[tclass]) + (doctrine==='emp' && ci.machine ? 90 : 0)`; futility `-40` when `info.pen > 0 && ci.frontGrade > 0 && info.pen < 0.75*ci.frontGrade` (the shot would bounce off the best face); layer mask: skip `c` if `info.mask !== 3 && !((c.layer === 2 ? 2 : 1) & info.mask)`; cloak skip (M5) `c.cloak > 0.5 && d2 > info.detect2`; ring rule off (`ring1 = 0`, single pass over the whole `scan` radius, like `info.cav`). Long-range units (`scan > 36`) retarget at 2x the interval (24 ticks normal) to bound the scan cost. A weight `W` beats a distance gap of `W/2.2` u, so `aa` +90 prefers a helicopter at 25 u (100-55+90 = **135**) over a grunt at 6 u (**86.8**) with margin 48 > hysteresis 18; it still shoots a grunt at 2 u (95.6) over a heli at 45 u (91.0): self-defence, by design.

| doctrine | INF | VEH | AIR | MECH | ARTY | OFFICER | SUPPORT | MONSTER | CAV | SWARM |
|---|---|---|---|---|---|---|---|---|---|---|
| line | 0 | 0 | +15 | 0 | +10 | 0 | 0 | 0 | 0 | 0 |
| aa | 0 | 0 | +90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| at | -25 | +90 | -60 | +80 | +25 | 0 | -10 | +50 | +10 | -30 |
| sniper | 0 | -50 | -30 | -20 | +30 | +80 | +45 | 0 | 0 | -30 |
| mg | +25 | -45 | +10 | -45 | 0 | 0 | +10 | 0 | +15 | +25 |
| arty | +10 | +15 | (mask) | +15 | +30 | +5 | +10 | +10 | +10 | +10 |
| gunship | +15 | +50 | +25 | +40 | +40 | +10 | +10 | +20 | +10 | 0 |
| tank | +10 | +60 | -40 | +50 | +40 | 0 | 0 | +30 | +10 | -20 |
| emp | -30 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (+90 on `machine`) |
| cloaker | 0 | 0 | 0 | 0 | +45 | +40 | +40 | 0 | 0 | 0 |
| detector / engineer (no targeting weights) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Target class rule in `aiInfo`: `tc = AIR if tag air or role air; MECH if role vehicle and tag mech; VEH if role vehicle; ARTY if role siege; OFFICER if role hero or tag officer; SUPPORT if role support; MONSTER if role monster or tag boss; CAV if role cavalry; SWARM if role swarm or beast; else INF`; `ci.machine = tags.includes('machine')`, `ci.frontGrade = armorFace ? armorFace.front : armor`. **Tests (`m05_targeting.test.mjs`):** effect: one test per counter pair in the table (AA vs heli over grunt, AT vs tank over infantry, sniper vs officer over rifleman, EMP vs machine, mg vs infantry, riflemen ignore a tank whose front bounces when infantry is in range, fall back to the tank when alone); limits: `info.mask` for `air:false/'only'`, scan retarget interval for `scan > 36`; ai: ring rule (preferred target at 30 u beats grunt at 6 u only for m2b units, never for Ancient); event: n/a; ancient: for all 43 defs `info.m2b === false` and `pickTarget` equals a frozen copy of the legacy function on 2000 random scenes (bit-identical choice) + G1. **S32 text:** "Counters are real in the target scorer: every row of the doctrine table is exercised, silent-default tables have explicit rows for all 11 roles, Ancient target choice is bit-identical." **NC-S32:** set AA weight to 0: the AA-vs-heli test is red.

**Role rows (explicit in every table; the validator and `tests/sim/roles.test.mjs` fail on a missing row; Ancient rows frozen):**

| role | COST_ROLE | ROLE_GROUP | LINE_OF | squadSize | squadClass | GROUP_MAXTYPES | rear (centroid) | notes |
|---|---|---|---|---|---|---|---|---|
| melee | 0 | line | front | 9 | LINE | 3 | no | |
| ranged | .273 | ranged | skirm if tag skirmisher else second | 8 | RANGED | 3 | yes | |
| cavalry | .144 | cav | flank / second / skirm (legacy rule) | 5 | CAV (RANGED if skirmish) | 2 | no | not in Modern |
| hero | .514 | hero | front | 1 | HERO | 2 | no | |
| siege | 1.226 | siege | rear | 1 | SIEGE | 2 | yes | artillery, trebuchets |
| support | .955 | support | support | 4 | SUPPORT | 2 | yes | |
| monster | .740 | monster | front | 1 | LINE | 2 | no | |
| beast | -.421 | beast | front | 6 | LINE | 1 | no | |
| swarm | -.986 | swarm | front | 8 | LINE | 1 | no | |
| **vehicle** | **none: `costFormula`/`roleEfficiency` throw (not custom-buildable)** | **vehicle** | **`armor`** (new line, placed after `front`, rankMax 2, spacing `2.05*radius`) | **3** (`def.squad` overrides) | **LINE** (aligns with infantry via `sumD`, so tanks do not outrun the line) | 3 | no | `model.rig` mandatory |
| **air** | none (throws) | **air** | **`air`** (new line after `rear`; placed on the ground, spawns at altitude) | **2** | **AIR** (new `CLS`, defined in M-layers; excluded from `sumD`) | 2 | no; **excluded from centroids** (ground-only) | `model.rig` mandatory |

Other tables: `defRig` default hum1 (beast/animal quad1); `normalizeDef` height default (role monster/large 2.6, cavalry 3.2, animal 1.1, else 2.5): vehicle/air require explicit `height`; `supportMove` friend roles stay `melee hero` and add `vehicle` for era kits that have medics following tanks (kit flag); `threatProfile` gains keys `vehicle air` (otherwise `p[g] += w` on an undefined key yields NaN) and `COUNTER_GROUP` maps; `matchup` is era-specific via `kit.armygen.matchup` (Ancient function unchanged).

**SHARES by era** (kit data; every row sums to 1.00 +-1e-9; groups outside the era's `ERA_ROLES` are 0; `counter` style uses `threatProfile`):

| era / style | line | ranged | cav | hero | siege | support | monster | beast | swarm | vehicle | air |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Medieval balanced | .34 | .22 | .14 | .07 | .08 | .06 | .04 | .02 | .01 | 0 | .02 |
| Medieval rush | .36 | .08 | .28 | .05 | 0 | .02 | .05 | .12 | .03 | 0 | .01 |
| Medieval ranged | .26 | .40 | .04 | .06 | .12 | .10 | 0 | 0 | .01 | 0 | .01 |
| Medieval elite | .36 | .06 | .20 | .20 | 0 | .04 | .12 | 0 | 0 | 0 | .02 |
| Medieval chaos | .16 | .14 | .12 | .10 | .08 | .08 | .12 | .08 | .06 | 0 | .06 |
| Modern balanced | .30 | .22 | 0 | .04 | .08 | .06 | 0 | .02 | 0 | .20 | .08 |
| Modern rush | .38 | .12 | 0 | .03 | 0 | .02 | 0 | .05 | 0 | .30 | .10 |
| Modern ranged | .26 | .40 | 0 | .04 | .14 | .08 | 0 | 0 | 0 | .06 | .02 |
| Modern elite | .30 | .10 | 0 | .14 | .04 | .04 | 0 | 0 | 0 | .28 | .10 |
| Modern chaos | .16 | .14 | 0 | .08 | .10 | .08 | 0 | .06 | 0 | .24 | .14 |
| Sci-Fi balanced | .28 | .22 | 0 | .05 | .05 | .06 | .03 | .01 | .02 | .20 | .08 |
| Sci-Fi rush | .34 | .10 | 0 | .03 | 0 | .02 | .05 | .03 | .08 | .27 | .08 |
| Sci-Fi ranged | .24 | .40 | 0 | .04 | .08 | .10 | 0 | 0 | .02 | .08 | .04 |
| Sci-Fi elite | .26 | .10 | 0 | .16 | .02 | .04 | .10 | 0 | 0 | .24 | .08 |
| Sci-Fi chaos | .14 | .12 | 0 | .08 | .06 | .08 | .10 | .04 | .08 | .18 | .12 |

`GROUP_MAXTYPES` = legacy plus `vehicle 3, air 2`. **AA guarantee (armygen and campaign validation):** in an era with air units, `generateArmy` (a) when `against` contains air units, includes at least `ceil(airCount/8)` units whose `ranged.air !== false` and `ranged.range >= 25` (at least one), and (b) every army of any style keeps >= 15% of its unit count in units that can hit air (default ranged units can); `campaign_validate` rejects a mission whose enemy can field air units while no unit in the player's allowed roster can hit air (code `V-AIR`). Air-only remnant termination is in M-layers (acceptance `S35 remnant`). Era `matchup` factors (draft, replace the Ancient RPS in `counterTable`/`scoutReport` only for that era): Medieval spear/pike vs cavalry 2.2, heavy cav vs archer/siege/support 1.7, cav vs pike 0.45, crossbow vs `armor >= .5` 1.6; Modern at vs vehicle/mech 2.0, aa vs air 2.4, sniper vs hero/support 1.6, mg vs infantry 1.3, armoured (front >= .8) vs rifle/mg 2.0, heli vs vehicle 1.6; Sci-Fi emp vs machine 2.0, shielded vs energy chip 1.5, cloaker vs ranged/support 1.6, detector vs cloaker 1.8.

**Silent-default tables (generated by grep at `b2200f5`, kept here; each gets explicit new rows, a throw path for new-era input and a negative control `tests/negctl/silent_<n>.mjs` that deletes a row and expects `tests/sim/silent_defaults.test.mjs` red).** Every name the plan lists (`AP rangedClip RIG_BY_ID weatherMods statusMode PROJ_VIS` cues projectile switch, `warmup ROSTER squadClass ROLE_GROUP LINE_OF squadSize SHARES GROUP_MAXTYPES threatProfile matchup recomputeCentroids COST_ROLE`) is a row; `meleeClip`, the explosion-kind mapping and rows 20-33 are additions (q3 residual 21 and grep).

| # | table | where | silent default today | rule |
|---|---|---|---|---|
| 1 | `AP` | consts.js:17 | unlisted type -> `undefined` -> NaN damage (reproduced) | 4 rows; contracts: every used type in `AP` |
| 2 | `rangedClip` | combat.js:38 | unknown proj -> `'throw'` | new kinds name `ranged.clip` (kind row) or throw |
| 3 | `meleeClip` | combat.js:33 | `'strike_'+style`; unregistered clip -> `ClipLib.meta` idle timing (dur 2.4) | `registry.verify`: clip registered by exactly one rig |
| 4 | `RIG_BY_ID`/`defRig` | combat.js:46-52 | hum1 / quad1 | `model.rig` mandatory (`E_RIG`); `RIG_BY_ID` frozen for the 6 Ancient ids |
| 5 | `weatherMods` | world.js:910 | unknown -> clear | throws for new-era worlds |
| 6 | `statusMode` | battleview.js:21 | 0 | R6 table, every SE slot has a row |
| 7 | `PROJ_VIS` | battleview.js:15,170 | `\|\| PROJ_VIS.arrow` | row per kind (verify) |
| 8 | cues projectile switch | cues.js:328-346 | launch default `bow_shoot`; hit chain silent for non-listed kinds | `PROJ_AUDIO` row per kind (verify) |
| 9 | explosion kind mapping | projectiles.js:152 | crew / boulder / fire / magic | `EXPLOSION_KINDS` + row per projectile kind |
| 10 | `warmup` ROSTER | warmup.js:15 | ids filtered silently by `defs[id]` | generated per era, coverage test (3.14) |
| 11 | `squadClass` | squads.js:10 | LINE | rows above |
| 12 | `ROLE_GROUP` | armygen.js:145 | `line` | rows |
| 13 | `LINE_OF` | armygen.js:36 | `front` | rows, `lines.armor/air` |
| 14 | `squadSize` | armygen.js:24 | 9 | rows + `def.squad` |
| 15 | `SHARES` | armygen.js:152,298 | `\|\| SHARES.balanced` | era tables above |
| 16 | `GROUP_MAXTYPES` | armygen.js:159,333 | `\|\| 2` | rows |
| 17 | `threatProfile` | armygen.js:162 | missing key -> NaN | keys `vehicle air` |
| 18 | `matchup` | armygen.js:179 | Ancient RPS | era rows |
| 19 | `recomputeCentroids` | world.js:558 | rear = ranged/siege/support | air excluded |
| 20 | `COST_ROLE`, `roleEfficiency` | stats.js:60,86 | `\|\| 0`, `\|\| _eff.melee` | vehicle/air throw |
| 21 | `WEAPON_CLASSES`, `WEAPON_ID_STYLE` | stats.js:17,27,117-118 | `\|\| slash`, `\|\| 'slash'` | per-era `custom_classes`; unknown style in a new-era call throws |
| 22 | `SHIELDS` | stats.js:35; custom.js:120 | `\|\| null` | per-era rows |
| 23 | `ABILITY_PRESETS` | stats.js:41 | unknown ignored | per-era presets |
| 24 | `AI_STYLES` / `aiInfo` aggro switch | ai.js:26-34; stats.js:133 | default aggro 17 | closed list, validator |
| 25 | `BODY` | stats.js:39,119 | `average` | per-era rows |
| 26 | `SIM_BARKS` | world.js:391 | no bubble | verify >= 3 lines per used key per era |
| 27 | `LESSON_TEXT` | lessons.js:77 | TypeError on a missing id | verify per kit |
| 28 | `WAVE_NAMES`/`BOSS_NAMES`/`BOSS_CYCLE` | waves.js:15-17 | crash on unknown boss | kit.waves verify |
| 29 | `KILL_VERBS`, `CAUSE_SCREAM` | humor/killverbs.js; cues.js:246 | none / no scream | 27 causes x 4 rows |
| 30 | hazards `switch` | hazards.js:25-30 | unknown kind ignored | `HAZARD_KINDS` closed; arena sanitizer |
| 31 | `normalizeDef` height | defs.js:35 | by role/tags | explicit for vehicle/air |
| 32 | `createObjective` | objectives.js:138-148 | throws | add 3 types |
| 33 | `TIER_CAPS`, `MAX_TYPES` | armygen.js:15-16 | 16 types | unchanged (cap policy is RA/UX) |

### 3.10 Module blocks (landing order; M1, M2, M2b are specified in 3.7-3.9)

Each block: **Fields/files**, **Algorithm** (real function names), **AI**, **Hooks** (events are in 3.12, forks in 3.11, perf share in 3.13), **Tests** (effect / limits / ai / event / ancient), **S text**, **NC** (registered negative control), **Ancient**. Test file `tests/sim/m<pos>_<slug>.test.mjs`.

**M0 schema, forks, hash, era plumbing (S28, #1).** *Files:* `vocab.js schema.js rngforks.js hashfull.js kit.js`; edits `world.js` (constructor, `stateHashFull`), `defs.js` (3.4), `consts.js` (`G.supDecay 0.35, craterMaxPerSec 3, fallKill 9`; the `AP` rows land with M1), `core/events.js` (`EventBus.fold`, `has()`), `armygen.js/waves.js/warmup.js` (era argument). *Algorithm:* `new World({arena, seed, rules, defs, props, era, kit, dev})`: `this.era = o.era || rules.era || 'ancient'` (AR3: the arena's `env.era` is visual/audio only, test: scifi arena + ancient World = Ancient kit); `this.kit = o.kit || kitFor(this.era)` (throws on unknown); `this.rf = makeForks(this.rng)` **before any draw**; `this.gMul`, `this.pace`, `this.weather = weatherMods(rules.weather || arena.env.weather)` bound once; `dev` enables throwing asserts (buffer overflow, `ClipLib.version` constant for the battle, new-type hit without `pen`). Sim import swaps (of the 7 import lines of map 02 section 3 five change; `unit.js:3` `DEFAULTS` is one singleton for all eras because new-era defs state their own radius/mass, and `stats.js:5` stays Ancient-only for the frozen `K`/`roleEfficiency`): `defs.js:2` STAT_TABLE -> registry `defsFor(era)` after `freeze()`; `world.js:14` `propInfo` -> `registry.propInfo` (merged id map, hidden eras included: release gating is a UI concern of editors/share-code import, W/CU); `world.js:24` `SIM_BARKS` -> `kit.barks`; `waves.js:8` -> `kit.waves`; `lessons.js:5` -> `kit.lessons`; the warm-up roster literal `warmup.js:15` -> `kit.warm`. `armygen.generateArmy/layoutArmy/counterTable/scoutReport` and `WaveSystem` take `era` (default `'ancient'` at every existing call site; unknown faction throws). *AI:* none. *Hooks:* `EventBus.emit` calls `this.fold(type, p)` first when set; `has()` is true while `fold` is set. *Tests (`m01_schema.test.mjs`):* effect: one bad def per validator code; forks (3.11); `stateHashFull` (3.11); `ensureEra` order independence: Ancient G1 digests identical after ensuring any of the 16 ordered subsets of {medieval, modern, scifi}, and a new-era battle gives the same `stateHashFull` at tick 600 whichever era was ensured first (q3_program residual 20; `ClipLib` is global); limits: unknown era throws, `rules.era` round-trips through a share code; ai: n/a; event: `EVENTS` field lists are append-only against `tests/fixtures/events_v8.json` (frozen name -> field count of v8); ancient: 43 defs: every new key `undefined`, `sha256(JSON.stringify(def))` equals the frozen digest (G3 extension, handed to TOOLS-GOLDEN), legacy `stateHash` equals the frozen copy (G1). **S28:** "Schema rejects every illegal def, forks are order independent and collision free, `stateHashFull` is deterministic and sensitive, era plumbing leaves Ancient bits unchanged." **NC-S28:** add one `this.rng.next()` before `makeForks`: forks test and G1 red. *Ancient:* constructor reads nothing new for `'ancient'` except `kit` (assembled from today's constants).

**M3 statuses and unit fields (S30, #3).** *Fields:* 3.5. *Algorithm:* `consts.js` appends `SUPPRESS EMP CLOAK SHIELDDOWN` (`N_SE 24`); `Unit` constructor fields; `addUnit` init; `_updateStatusesAndMods` loop bound; `SE_NAMES` follows. Semantics are the applying module's (3.5). *Hooks:* R6 SE->tint rows for slots 20..23 ride `aFx2` (the `glow + 4*statusMode` channel already uses modes 0..7: `battleview.js:21-31,133`), HUD icons (CU13). *Tests:* effect: 24 unique names, all `Float32Array(24)`; limits: slot 24 does not exist; every slot has a tint row and a status icon id; event: `status_apply` fires for each new slot with the lowercase name; ancient: Ancient battles never set slots 20..23 (`se[20..23]` stay 0 over a G1 battle) and the Ancient A/B (with `N_SE 24`) stays inside `max(5%, 3 sigma)`. **S30:** "Four new status slots exist with owners, names, tint rows; unit fields default to legacy; Ancient A/B is inside the noise floor." **NC-S30:** add a 25th `SE` name without a tint row: the tint-row test is red.

**M10 explosives, artillery, strike primitive (S33, #6).** *Fields:* `ranged.arc 'low'|'high'`, `payload`, `craterMode 'lazy'`, `structDmg` (declared here, used by M12), `aoe`, `minRange`; `G.craterMaxPerSec 3`. *API (World):*
```
markNavDirty(x0,z0,x1,z1, classMask = 1)     // sets dirty bits per (team,class); never clears field.valid (units keep steering on the stale field until the scheduled slot); M7 widens classMask
makeCrater(x,z,r,steps, {lazy})              // lazy: arena.crater(...) + nav.rebuild(rect) ONLY (verified: nav.rebuild writes hs/cost/walk, never block/soft/hazard) + markNavDirty; no applyProps, no invalidateFields;
                                             // rate cap: ring of the last 30 tick stamps; the 4th crater within one second still explodes/damages but emits no `crater` event and edits no terrain (w.terrainSkipped++)
strike(x,z,r,dmg,delay,kind,opts)            // pooled pending list; emits `telegraph` kind 'strike' + `strike_call`; at expiry: `explosion`, areaDamage(type/pen per STRIKE_KINDS), lazy crater, damageProps(dmg*1.2), `suppressAt`;
                                             // opts {src, team, protect = -1 (hurts allies), count, spread, interval, depth}; barrage offsets from fork `era:strike`
bigQuery(x,z,r)                              // hash.query into qbufBig = Int32Array(max(4096, hash.cap)); n >= length => bufOverflow++ and dev throw; REQUIRED for any areaDamage with r + 1.8 >= 12
```
`STRIKE_KINDS`: `shell {explosive, pen 1.0, kb 6, crater r*0.45}`, `airstrike {explosive, pen 1.6, kb 8, crater}`, `orbital {energy, pen 2.0, kb 10, crater r*0.5}`, `prop {explosive, pen 0.8, no crater}`; Ancient `lightning`/`meteor` keep their code (`w.lightning`, godpowers `meteor`). `arc:'high'`: `fire()` takes the `+sqrt` root (`pitch = atan2(v2 + sqrt(disc), g*dh)`), the shell ignores props while ascending, units until descending (`descent` row) and allies in flight. `_explode`: `payload` -> `addEffect(effect, x, z, r, dur, dps, team, src)`; `crater:true` stays the immediate legacy path, `craterMode:'lazy'` the new one. Aliasing: new effect kinds (`gas smoke`) iterate through a **private** `qbufFx` copy-out in `_tickEffects`; the Ancient `cloud`/`fire` branches keep `qbuf2` (their latent aliasing bug is recorded as AP row 12, no change). *AI:* siege style as today; `arty` doctrine counter-battery +30 (3.9). *Hooks:* events `strike_call`, `explosion` (kinds in 3.3), `crater`; R12 sub-chunk terrain edit; AUDIO `EXPLOSION_AUDIO`. *Tests (`m06_explosives.test.mjs`):* effect: lazy crater under a wall keeps `nav.soft/block` counts and S9 (nobody inside a blocker) holds, walkability updates inside the rect; a barrage of 12 shells in 4 s: field recomputes <= 1 per 6 ticks (spy on `FlowField.compute`) and `fields[t].valid` never false; strike timeline (delay, telegraph before damage); limits: crater cap (10 shells in 1 s -> 3 `crater` events, 7 `terrainSkipped`), `bigQuery` overflow throws with 5000 fabricated units, strike radius 12 hits all 300 blob members; ai: howitzer picks the cluster (`clusterBonus` unchanged); event: `strike_call` payload; ancient: Troy catapult battle digest (G1) and the immediate crater path untouched. **S33:** "Explosives and artillery deal area damage with real craters without a field storm; one strike primitive and one dirty API exist; large-radius queries cannot truncate silently; Ancient craters are bit-identical." **NC-S33:** call `invalidateFields()` in the lazy branch: the recompute-count test is red.

**M6a heal filters and projectile poison (S34, #7).** *Fields:* `heal_pulse.filter 'organic'|'machine'|'any'` (default any), `poison.proj bool`, `_ai.machine/organic` (tag `machine`; validator: every vehicle, drone, robot and mech carries it; dragon and animals do not). *Algorithm:* `wounded()`/`pulse()` in `heal_pulse.js` skip candidates failing the filter before counting; `poison.onHitDealt`: `(o.proj && !ab.p.proj)` returns early (legacy: `o.proj` always returned) so Ancient medusa is identical; `undead` skip stays. *AI:* healer trigger counts only filtered wounded. *Tests:* effect: organic healer ignores a wounded tank, machine repair ignores a wounded rifleman, poison arrow poisons 3 dps for `secs`; limits: filter on an empty set does not channel; ai: no wasted channel; event: `unit_heal`, `status_apply poison`; ancient: priest_of_ra/druid/medusa duels in G1. **S34:** "Healers heal only their kind; projectiles can poison; Ancient healers and snakes unchanged." **NC-S34:** drop the filter check in `pulse()`: the machine-ignored test is red.

**M7 layers, air AI (S35, #8) - pointer to `M-layers.md`.** M requires from M-layers: the 21 `hash.query` sites (verified count), the 6 `.fields[` lines (world.js:217,593; squads.js:63,72; ai.js:98,204), the 23 `nav.canStep/inside/walkable/height` sites, `propBlocks`/`heightAt` sites (11 in `src/sim`), `recomputeCentroids` (air excluded), the `_separate` pass, `squads.js` anchor march, and the hazards (`_fire` `_geyser` `_boulders` `_liquid` test `u.layer`/`y`) each with a rule and a test; squads are single-class; air squads steer analytically; the LINE metric `sumD` counts ground LINE only; field freshness targets ground <= 12 ticks, hover/air/vehicle-clearance <= 24 (coarse 2 u nav) and a recorded max-age test at 600 units; unarmed air units and the air-only-remnant termination rule; AA guarantee (3.9). *Names fixed here:* `def.layer`, `def.cruiseAlt`, `u.layer`, `u.altitude`, `LAYER_ID`, `markNavDirty(.., classMask)` bit0 ground, bit1 hover/clear, `CLS.AIR`, event `unit_air_state` (M-layers defines the payload; appended to `EVENTS`). *Budget:* 0.11 / 0.17 ms (3.13) including the two extra coarse field pairs. *S35:* "Every ground-assuming site has a layer rule and test, air units behave per the state machine, a battle containing unhittable air remnants terminates." *NC-S35:* remove the `layer` filter in `crowdAhead`: its layer test is red. *Ancient:* all layer branches are guarded by `u.layer !== 0` or a world-level `anyLayer` flag; G1.

**M12 props as structures (S36, #9).** *Fields:* the arena prop array `[t,x,z,r,s,v]` (`arena.js:131` write, `:154` read, 1500 cap) gains optional elements 6 `tm` (team 0|1) and 7 `lk` (pad partner index), written only when set so Ancient arena JSON and the G2 hashes do not change; the WORLD sanitizer must read both; `Prop.team`; catalog `info.gate, coalesce, cover:'low', explosive{r,dmg}, decor, wreck, ttl`; weapon `ranged.structDmg`. *Algorithm:* (1) `propHit(p)` returns the prop (`propBlocks = !!propHit`); `_collide` and `_resolveRay`: `if (prop && opts.structDmg) w.hurtProp(prop, p.dmg*structDmg)` (stick 3 s as today). (2) `hurtProp` death: if `p.info.coalesce` push to `w.propDead`, union `w.propRect`; else the legacy block (index + `applyProps(all)` + `invalidateFields`) verbatim. (3) `flushPropDeaths()` after `_tickProps`: per dead prop `_unindexProp(p)` (remove from its `propCells` lists), `nav.unstampProp(p)` (decrement `block/soft` over its cells; WORLD adds the symmetric `stampProp`), explosive props -> `strike(.., 'prop', delay 0.15, depth+1 <= 3)`, then one `markNavDirty(propRect, 0b11)`; refresh happens in the existing 6-tick slot (<= 1 per 6 ticks per (team,class), only the dirty ones). (4) Gates: `nav.gateTeam` Int8Array (-1 none) filled by `stampProp` for `info.gate`; `canStep/_canMove/steer/FlowField.compute(.., team)` treat `soft[j] && gateTeam[j] === team` as passable (cost 1.5) for the owner; the enemy sees `soft` (breach, +30 cost); `nearestSoftProp` skips props whose `team === u.team`. (5) `spawnProp(type,x,z,{decor})`: when `info.decor` (blocks 'none', no cover) skip `applyProps`/`invalidateFields` (wrecks); `ttl` removal in `_tickProps`. (6) `editTerrain(rect, {dh, mat})`: `arena.edit` (WORLD adds), `nav.rebuild(rect)`, `markNavDirty`, event `terrain_edit`; **displacement rule** (bridge collapse): for every unit (array order) whose cell is no longer `nav.walkable`: search nav rings 1..3 around it (fixed scan order: rows ascending, columns ascending) and move it to the first walkable cell centre; if none, leave it: deep water/lava kills through the existing `_liquid` drowning/burn; a drop `old y - new ground > G.fallKill (9 u)` calls `killUnit(.., 'fall')`; the rule is deterministic and tested with 30 units on a bridge. *AI:* breachers as today; `ai.cover` is M9. *Tests (`m09_structures.test.mjs`):* effect: MG with `structDmg .6` chews a sandbag (30 hp); 40 coalesced deaths in one tick -> 1 index update, 1 `markNavDirty`, field recompute count <= 1 per 6 ticks, 20 deaths over 20 ticks -> <= 4 refreshes; owner passes its gate while the enemy breaches; barrel chain (3 deep) ends; displacement and fall tests; limits: `propDead` queue 1500 props; ai: defenders do not target their own gate; event: `prop_destroyed`, `terrain_edit`; ancient: all 41 Ancient props have `coalesce/gate/explosive` undefined, ballista bolts still do nothing to walls (G1 Troy/Thermopylae). **S36:** "Props are structures: team ownership, gates, weapon-driven damage, coalesced death handling without invalidation storms, deterministic bridge collapse; Ancient props untouched." **NC-S36:** call `invalidateFields()` per coalesced death: the refresh-count test is red.

**M14 objectives and scripting (S37, #10).** *Objective types* (`createObjective` switch, `objectives.js:138-148`): `capture {points: markerIds (type 'capture'), need N, hold s (default 20), rate 0.12/s per unit of surplus}`: each point `{owner -1|0|1, prog 0..1}`, contested -> no change, `progress = ownedProgress/ need`, win when the player owns `need` points for `hold` s, `capture_update` per change; `defend_core {core: markerId, time s}`: binds the nearest prop within the marker `r`, lose when it dies, win when `time` elapses or the enemy is eliminated; `escort {vip, exit, mode 'path'}`: `progress = max(progress, 1 - dist(vip, exit)/dist0)` (monotone; Ancient `protect_vip reachOnly` keeps its 0-progress behaviour: new type, so the shipped quirk is untouched); `destroy` gains `{def: id}` and `{tag}` entries (units alive at start vs now). `addPlacements(team, pl, {keepFlags:true})` honours `vip/general` (default false = Ancient behaviour; the new-era campaign runner passes true). *Script (`script.js`):* `new ScriptRunner(w, events)` with `events = [{id, at: seconds | {on:'unit_kill'|'prop_destroyed'|'objective'|'hp_frac'|'counter', ...}, once:true, do:[{op, ...}]}]`; ops: `strike {x,z,r,dmg,delay,kind,team?}` -> `w.strike`; `spawn {team, groups, at: {x,z}|marker, order, formation, count:'reinforce'|'roster'}` -> `addSquad(.., {rng: w.rf.script, reinforce:true})`; `prop {act:'spawn'|'destroy'|'damage', type, x, z, id?}`; `weather {kind}` -> `w.weather = weatherMods(kind)` + `weather_change`; `beat {beat}` -> `script_beat`; `setpiece {piece, x, z}` -> `setpiece` (the sim emits only the id; the single dispatcher in `meta.js` fans out, CU3). Runner ticks after `objective.update`. *Accounting:* `reinforce` and `bailout` spawns do **not** increment `startCount/startCost`; they increment `stats[t].spawned` and `spawnedAlive`; `Eliminate.progress = 1 - (alive - spawnedAlive)/startCount`, `_tickMorale` fractions use `(alive - spawnedAlive)/startCount`, `battle_end.perDef` and the summary expose `aliveRoster/aliveSpawned` (Ancient `spawnedAlive` is 0: subtracting 0 is exact). *Counters:* `w.counters` (Map id -> n) incremented by data rules `counters:[{id, event, filter}]`; fixed ids and emitting module: `bounces`(M1) `suppressed`(M2) `reloads`(M2) `shield_breaks`(M4) `emp_hits`(M6b) `cloak_kills`(M5) `blinks`(M13) `mines`(M11) `craters`(M10) `strike_kills`(M10) `bailouts`(M13) `captures`(M14) `props_siege`(M12) `heals_machine`(M6a): MS star helpers read them. *Tests (`m10_objectives.test.mjs`):* capture win/lose/contest, defend_core, escort monotone progress, destroy by def/tag, script ops each fire once at the right tick, replay (record/replay with `world.record`) equal `stateHashFull`; limits: 8 points, 64 script events; accounting fixture (tank dies, 3 crew bail out: `startCount` unchanged, eliminate progress never decreases, star "half alive" uses roster only); ai: n/a; event: `capture_update objective_update weather_change script_beat setpiece`; ancient: `protect_vip reachOnly` still pins progress 0 (frozen expectation), `addPlacements` default still drops flags. **S37:** "Capture, defend-core, escort and destroy-by-def objectives work; scripts strike, spawn, edit props, change weather and emit beats/set-pieces deterministically; mid-battle spawns never distort accounting." **NC-S37:** count bailout units in `startCount`: the accounting test is red.

**M13 abilities as params (S38, #11).** *Params:* `aura {effect:'banner', radius, dmg 1.1, moraleRate, lossMul}` (allies: `mDmg *= dmg`, morale +, `mMoraleLoss = lossMul`; the carrier has tag `officer` so its death shocks x1.5); `dash {kind:'blink', dist, minDist, cd}` (instant: target point `dist` toward the target or away (`away:true`), step back 1 u until `nav.walkable`, set `x,z,px,pz`, telegraph both ends, `unit_blink`, never into `hazard`/deep water); `dot_cloud {effect:'gas'|'smoke', radius, duration, dps}` (`gas` = existing cloud kind; `smoke` = occluder effect for M9); `summon_on_death {mode:'bailout', spawn REQUIRED, count, hpFrac, spread, invuln 0.6}`; new ids `cloak` (M5), `lay_mine` (M11), `call_strike {kind, r, dmg, delay, range, cd, charges, minTargets 4}` (AI like `dot_cloud`: >= `minTargets` enemies within r of the target, clear sky, calls `w.strike`). Registry ids 27 + 3 = **30 <= 32**. `ABILITY_SCHEMA[id]` (param names, types, ranges) is enforced by `validateDef` (`E_ABILITY_PARAM`). *Bailout:* `onKilled` (vehicle) -> `w.addSquad(spawn, team, n, cx, cz, {formation:'circle', rng: w.rf.spawn, reinforce:true})` appended to `units` during `killUnit` (append-only, safe for the index loop, absent from this tick's hash), each unit a loose squad with order `advance`, `getup` 0.9 s, hp `hpFrac`; `summon_on_death.js:17` default `'hoplite'` is removed (Ancient `trojan_horse` passes `spawn:'hoplite'` explicitly: identical). *Tests:* effect: banner buffs allies in radius, blink lands walkable and not in water, smoke cloud registers, bailout spawns n crew with accounting rule, call_strike lands after `delay`; limits: blink in a 1-cell alley, `max` charges; ai: call_strike needs >= minTargets; event: `unit_blink unit_bailout strike_call ability_cast`; ancient: abilities of the 43 defs unchanged (S16 tests) and trojan reveal digest. **S38:** "Banner, blink, gas/smoke, bailout and call-strike exist as params of at most three new ids with accounting and AI rules." **NC-S38:** let blink target a non-walkable cell: the blink-limits test is red.

**M15 era kit (S45, #12).** *Kit record (data, read once at construction):*
```
kit = { era, barks:{ 'key[:role]': [lines] }, lessons:{ id: {text:[..],fix:[..]} , detectors:[ids] }, waves:{ budget:[a,b], reinforce:[a,b], names:[20], bosses:{id:name}, cycle:[ids], interval:40 },
  godPowers:[GodPower x6], intervention:{ kind, gift:unitId, effect:{type,dmg,r} }, mascot:unitId, pacing:{...}, gravity:1, weather:{kind:{speedMul,burnMul,fireMul,sprdMul,visMul,shieldMul}},
  armygen:{ shares, lineOf, groupMax, matchup }, warm:[[ [id,n].. ],[..]] , roles:[..], currency:{costScale} }
```
*Ancient kit = today's constants:* `pacing {warn 12, advance 18, intervene 30, quit 44, maxBattle 360, dryAdvance 9, dryIntervene 13, dryEvery 3, collapseAfter 90, collapseRatio [4, 0.25], idleAdvanceAfter 45, idleAdvance 6, idleBand [0.9, 1.1], progress:false}` (the literals in `_checkEnd`, `world.js:807-848`); `intervention {kind:'zeus', gift:'battle_goat', effect:{type:'lightning', dmg: 90*G.godMul*1.4, r: 3.5}}` (`world.js:861-875`); `mascot:'sacred_chicken'`; `waves.budget [2400,900]`, `reinforce [1600,240]`. `_checkEnd`, `zeusIntervene`, `mutators.js:47`, `godpowers.js:96`, `waves.js` read `this.kit`/`this.pace`. **Draft era pacing** (fitted by `tools/pacing_fit.mjs` from the median time-to-first-kill and time-to-kill of 200 harness battles at E-FREEZE, so a data change inside `eraHash`, no sim re-record of other eras): Medieval = Ancient; Modern warn 16 / advance 24 / intervene 40 / quit 60 / maxBattle 420 / dryAdvance 12 / dryIntervene 18 / dryEvery 4 / `progress:false` (until M4); Sci-Fi same numbers with `progress:true`. *Gravity:* `w.gMul = clamp(kit.gravity * (arena.env.gravity ?? 1), 0.2, 1.5)`, read at construction; applied at `world.js:634`, `world.js:796` and `projectiles.js:37` as `(r.gravity !== undefined ? r.gravity : G.gravity) * w.gMul` (multiplying by exactly 1 is bit-exact) and `p.life = (r.life || 6) / w.gMul`; `fx.js GRAV` is RENDER's. **Arc test:** at `gMul 0.4`, a shell (`speed 42`, low arc) aimed at D = 0.3/0.6/1.0 x range lands within 0.8 u of D, flight time grows by 1/0.4, `life` scaling keeps it alive, solved range `v^2/g` is capped by `ranged.range` in the AI gate. *GodPower schema* `{id, slot 1..6, name, icon, blurb, joke, tutorialLine, kind 'harm'|'help'|'neutral', tags[], cd, delay, r, dur, effect:{type, params}, telegraph, cue}`; `GodPowers(w, list = w.kit.godPowers)`; `cd = Float32Array(2N)`, `casts = Int32Array(N)`, `N = list.length` (6); `info(id)/list(team)/ready/cast/tick` API unchanged, `list` also returns `blurb kind icon slot tags`. Effect interpreter types (params are the literals of today's `_strike`/`_pulse`): `bolt_chain` (zeus_lightning: dmg 90 x godMul, r 3, chain n 4, dmg 63 x godMul, collect radius 9, `lightning_arc` from (x+1.5, y+40, z+1.5)), `meteor` (dmg 140 x godMul, r 5, crater r 4 steps 4, ignite 5, propDmg 200, kb 8, type fire ap 1), `quake` (r 14, dur 5, every 1, stagger 0.6, stun {chance 0.3, secs 0.8}, skip mass >= 8, propDmg 130; **the `w.rng.next() < 0.3` draw stays in `collect` order on the main stream**), `heal_zone` (r 12, amount 60 x godMul, `filter`), `status_zone` (r 12, dur 8, every 0.5, status TIPSY, secs 1.2), `spawn_squad` (def `kit.mascot`, n 8, circle 0.9, getup 0.5, ky 6) and new `strike` (calls `w.strike`), `emp_pulse`, `smoke_zone`, `shield_zone`, `airdrop`. New-era powers draw only from fork `era:power`. Tags: `nuke` (meteor, orbital), `debuff_zone`, `summon`, `heal`. Slot semantics (stable across eras): 1 direct damage (bolt_chain / strike beam), 2 big delayed nuke (meteor / strike), 3 area disruption (quake / emp_pulse), 4 heal (heal_zone), 5 debuff zone (status_zone / smoke_zone), 6 summon (spawn_squad / airdrop). **Reader migration list (INTEGRATION/UI/AUDIO; q3_product residual 8):** `app/meta.js` 23, 103-108 (`GOOD` set, aim-ring colours), 121 (`info`); `app/game.js:528`; `ui/hud/powers.js` `DEFAULTS` + `POWER_ICON`; `save/stats.js` 68, 193-223 (meteor/`wineRain` attribution -> `tags`); `audio/cues.js` 429-434; mutators `wine_rain_always`, `chicken_rain`. *Lessons/barks:* `generateLessons(log, {team, defs, rng, kit})`: detectors are generic with ids from 3.12; text from `ctx.kit.lessons`, fallback to the Ancient `LESSON_TEXT` when `ctx.kit` is absent (G4 text hash unchanged). *Tests (`m12_kit.test.mjs`):* effect: Ancient kit equals the literals (deep-equal against a frozen copy), the 6 Ancient powers through the interpreter reproduce `stateHashFull` of the pre-change implementation on a recorded input log (G1 god-power battles), a Sci-Fi power resolves name/blurb/icon/telegraph/cue/effect from data only; limits: `gMul` clamp, kit missing a bark key fails `registry.verify`; ai: n/a; event: `god_power`, `intervention` kind strings come from the kit; ancient: G1 + G4 + the arc test at `gMul 1` equals legacy. **S45:** "Everything era-specific in the sim comes from one kit record; Ancient kit equals today's constants; god powers are data with a generic interpreter that is bit-identical for the six Ancient ids; gravity scales every arc." **NC-S45:** change the Ancient `collapseRatio` literal: kit equality test and G1 red.

**M17e reaction engine (S46, #13).** *Files/fields:* `react.js`, `def.react`, `def.wreck`, tables per rig as data (`M17t`, `src/content/<pack>/reactions.js`, may land after the freeze). *Algorithm:* `killUnit` replaces the plain-clip block (`combat.js:204-214`) by: `clip = def.react ? deathClipFor(u, src, cause, o, kit.reactions[def.react]) : <legacy block verbatim>`. `deathClipFor`: cause class `CAUSE_CLASS = {melee,gore,kick,trample,crush,fall -> impact; execute -> cut; ranged,bullet -> bullet; aoe,explosion,strike,mine,misfire -> blast; fire,lava -> burn; magic,lightning,energy -> zap; emp -> emp; drown,poison,stone,spikes,geyser,crash,bribe -> as named}`; table `deaths[class] = [clipIds]` (>= 3 deaths per rig over the classes, 2 hit reactions `hit_front/hit_back` consumed render-side from `unit_hit` + `dstDef`); variant = `(u.id*7 + tickN) % n` (RNG-free, like barks). `u.deathLinger = rigLinger[rig]` (a per-rig constant in rig meta, default `G.deathLinger 1.6`, test: every death clip `dur + 0.2 <= rigLinger`), so changing a table changes **no** `stateHashFull`; Ancient defs (no `react`) keep `max(G.deathLinger, ClipLib.dur(clip, defRig) + 0.2)`. *Wrecks:* defs with `wreck` spawn the prop via `spawnProp(type, x, z, {decor:true})` on death: non-blocking, `cover:false`, ttl 25 s, world cap 24 (oldest removed first), smoke emitter in the prop model; event `unit_wreck`. Deploy/pack-up is **not** here (M2 `setup` gate). *Hooks:* ANIM-CLIPS death/hit clips per rig, RENDER corpses (CU4/R10), `KILL_VERBS`/`CAUSE_SCREAM` rows for the 8 new causes. *Tests (`m13_reactions.test.mjs`):* effect: every (rig, class) cell resolves to a registered clip; `stateHashFull` identical when a table's clip choice is permuted; limits: 20 wrecks in a 6-cell corridor leave it passable (W10 pass test), cap 24; event: `unit_kill.cause` fuzz (3.3); ai: n/a; ancient: death clip of all 43 defs equals legacy over 40 fuzz battles. **S46:** "Death and hit reactions are chosen from data per (cause, rig) without changing sim state; wrecks are bounded and non-blocking; the cause vocabulary is closed and fully covered." **NC-S46:** make `deathLinger` depend on the chosen clip duration: the permutation-hash test is red.

**M8 vehicles, turret, possession (S39, #14) - pointer.** M requires: `def.turret {rate, arc, hullTurn}`; `u.aim` slewed toward the target each tick (published for render); firing gate `rangedReady(u) && u.aimOk` where `aimOk = |angleDiff(u.aim, want)| < turret.arc` for turret defs and `fdiff < 0.4` otherwise; hull faces its movement direction with a turn-rate limit, present-front when engaged, reverse rule; `resolveFace` in `armor.js` from hull `heading` and hit direction (`o.hasDir`/projectile velocity) filling `o.face` before `applyDamage`'s pen step, events `unit_flanked` (rate-limited 1 per 2 s per unit); possession per class (ground, vehicle, air, mech) including reload/burst/cloak interplay (`Possession.tick` uses `rangedReady`, camera follows `u.y`); the M7/M8 seam test list (gunship "face and fire" in M7, turret-gated air weapons in M8). Budget 0.04 / 0.07. **S39:** "A vehicle's turret and hull are independent, armour is resolved per face, possession works per class." **NC-S39:** let `u.face = want` for turret defs: the rear-shot test is red. **Ancient:** every branch is guarded by `def.turret` or `def.armorFace`; G1 + possession replay.

**M9 cover and LOS (S40, #15) - pointer.** M requires: `lineOfFire(u, t)` pure and <= 4 us per call, sampled at the M8 firing gate; repositioning to an unblocked firing spot (strafe to the nearest within N u, timeout, fire-through fallback); `lowCover` props (`cover:'low'`, M12) giving damage x0.5 to `o.proj` hits from the covered side and `u.inCover` (events `unit_cover`); smoke as an occluder from `w.effects` kind `smoke` (cut-ladder rung 5: removable by `kit.cuts` without touching other modules; the validator then rejects `payload.effect:'smoke'` and `dot_cloud smoke`). Budget 0.04 / 0.06. **S40:** "Units that are blocked reposition or fire through after a timeout; low cover halves projectile damage; LOS costs <= 4 us per shot." **NC-S40:** remove the timeout fallback: a unit behind a wall stands forever, `m15_cover/ai` red. **Ancient:** `def.ai.cover` undefined; `propBlocks` unchanged.

**M11 mines and traps (S41, #16).** *Fields:* hazard kinds `mine_ap {r 1.6, aoe 2.5, dmg 70, pen .6, mass trigger any}`, `mine_at {r 2.0, aoe 3, dmg 260, pen 1.8, mass >= 6}`; record `{t, x, z, r, tm: team, arm: s}` (the hazard sanitizer `arena.js:152` keeps only `{t,x,z,r}`, r clamped 1..30, 60 hazards: WORLD must keep `tm arm`, arena-placed mines share the 60-hazard arena cap; laid mines live only in `w.mines`); ability `lay_mine {kind, max 6, cd 8, radius 1.2}`; `w.mines` (separate array, not `w.hazards`, so the 60-hazard cap and the hazard switch are untouched), created only when the arena has mine hazards or a def has `lay_mine`. *Algorithm:* `MineSystem.tick` (hazards slot, after `hazardSys.tick`): per armed mine (`arm` countdown from lay time) `hash.query(x,z,r+1.4,qbufFx)`, trigger on the first enemy-of-owner unit with `layer 0` within `r + u.radius` and the kind's mass rule; effect: `explosion` kind `mine`, `areaDamage` explosive (`h.pen`, `h.face = 3`), lazy crater r 1.2, removal, `mine_trigger`, cause `mine`; chain: another mine within 3 u triggers 0.1 s later; not stamped in nav (hidden from enemy AI), friendly units never trigger them. *AI:* engineer lays `lay_mine` when no enemy within 20 u, `cd` ready, on a walkable cell 8 u ahead along the enemy axis, >= 4 u from own mines, positions jittered from fork `era:mine`. *Tests (`m16_mines.test.mjs`):* effect, arm delay, chain, friendly safe, hover/air do not trigger, AT mine ignores infantry; limits: 60 mines per team (61st rejected), 10 000-tick soak; ai: engineer lays along the path; event: `mine_laid mine_trigger`; ancient: hazards.js switch untouched, no `w.mines` object in Ancient worlds (heap test). **S41:** "Team-owned hidden mines arm, trigger on enemies by hash query, chain and kill with cause `mine`; engineers lay them." **NC-S41:** trigger on allies: friendly-safe test red.

**M4 regenerating energy shields (S42, #17).** *Fields:* `eshield {cap, regen, delay, recover, vs?}`; unit `sh shMax shT`; `SE.SHIELDDOWN`. *Algorithm:* absorb is step (a) of the pen pipeline (3.7), never for `dot`/`dotDamage`: `abs = min(sh, raw * vs[type])`; if `abs > 0 && sh - abs <= 0` -> break: `sh = 0`, `SE.SHIELDDOWN = recover`, `shield_break`; `shT = 0` on every absorb/hit; regen in `_updateStatusesAndMods`: `if (u.sh < u.shMax && u.shT >= delay && SHIELDDOWN <= 0 && EMP <= 0) u.sh = min(shMax, sh + regen*dt)`; fully absorbed hits emit `shield_hit` (only if `ev.has`), count `stats.shieldAbsorbed`, and do **not** emit `unit_hit`/set `lastDamageT`; overflow continues through pen. *Watchdog:* `lastProgressT` set by hp loss, shield break, kill, `hurtProp`, objective progress >= 2%, capture progress; `_checkEnd` uses `idle = time - (pace.progress ? lastProgressT : lastDamageT)`; Ancient and Modern keep `lastDamageT`. Contract: `regen <= 2.5 * medianLineDps(era)`. `power.js`: `hpEff += 0.9*cap + 0.5*regen*delay`. *AI:* none beyond targeting. *Hooks:* ShieldLayer (R3, near dome <= 64, far from `aFx2`), `shield_*` audio, HUD bar (CU13). *Tests:* effect: absorb-then-overflow numbers, break/recover/regen timeline, EMP blocks regen; limits: `cap 0`, regen > dps stalemate (two shielded squads) ends in `intervention` or victory within 62 s with `stalemate_warning` at the pacing warn; ai: n/a; event: `shield_hit shield_break shield_recover`; ancient: absorb path unreachable (`shMax 0`). **S42:** "Shields absorb before hp with regeneration after a delay, break and recover, do not stall the watchdog, and power rating includes them." **NC-S42:** apply absorb after the pen step: worked-example check red.

**M5 cloak (S43, #18).** *Fields:* ability `cloak {dur 6, cd 14, detectR 6, breakOn 'attack'}`, `u.cloak u.cloakT`, `SE.CLOAK`, `_ai.detect2` (default 36), detector tag units 196, `weather.visMul`. *Algorithm:* AI casts when an enemy is within 40 u and no target within 18 u (`aiAllowed`); `u.cloak` ramps 0 -> 1 in 0.5 s; `pickTarget` skips `c.cloak > 0.5 && d2 > detect2(attacker)` (1 field read per candidate); `startMelee/startRanged` and `onDamaged` call `cloakBreak(u, why)` (sets `cloakT = 1.2` reveal, `SE.CLOAK = 0`, `unit_cloak`); projectiles in flight and area damage ignore cloak; opportunity melee uses the same distance rule. *Tests:* effect: unseen beyond 6 u, seen within, detector reveals at 14 u, attack breaks and reveals 1.2 s; limits: cloak vs rain/ion visMul; ai: assassin cloaks then strikes ARTY/OFFICER; event: `unit_cloak`; ancient: `u.cloak` 0 everywhere, `pickTarget` frozen-copy test. **S43:** "Cloaked units are untargetable beyond detection range until they attack." **NC-S43:** drop the `breakOn` call in `startRanged`: attack-breaks test red.

**M6b EMP and repair (S44, #19).** *Fields:* `cc_field {effect:'emp', radius 9, channel 0.8, duration 3.0, cd 18}`, damage type `emp` (3.7(b)), `heal_pulse filter 'machine'` as repair. *Algorithm:* on land: for each enemy `machine` in radius `applyStatus(EMP, duration)`, `sh = 0`, `SE.SHIELDDOWN = recover`, cancel `CLOAK`; EMP units act like STUN in `think`'s hard-disable branch; air machines descend (M-layers); organic units unaffected (no events); `emp_pulse`, `emp_hit`. *Tests:* effect: mech disabled 3 s and shield zeroed, infantry untouched, repair heals machines only; limits: radius 12 on a 300 blob uses `bigQuery`; ai: needs >= 3 machines; event; ancient: n/a. **S44:** "EMP disables machines and their shields and nothing organic; repair heals machines only." **NC-S44:** apply EMP to organics: effect test red.

**Per-module matrix** (declaration site, tick position, hooks outside `src/sim`, text ids, fork; events are in 3.12, shares in 3.13, tests/S/NC in the blocks above and section 4):

| module | declared in `defs.js` / elsewhere | tick position / hooked functions | view, audio, anim hooks | bark | lesson | fork |
|---|---|---|---|---|---|---|
| M0 | `TOP_KEYS` `_nf`; schema for all | `World` constructor, `EventBus.emit` | none | none | `pad_*` per era | creates all |
| M1 | `armorFace resist charge brace`, `ranged.pen`, `melee.pen` | `applyDamage` model branch, `resolveMelee` brace | deflect spark (RENDER fx), clang cue (AUDIO), no clip | `deflect` | `armor_bounce` | none |
| M3 | `layer` (decl.); `consts.js`, `unit.js` | `_updateStatusesAndMods`, `addUnit` | SE tint rows 20..23, status icons (R6, CU13) | none | `suppressed_pinned` (shared with M2) | none |
| M2 | `SUB.ranged` (3.4) | `startRanged`, `think` WINDUP, `fireRanged`, `Projectile.fire/update/_collide`, `_resolveRay` | `PROJ_FX` muzzle/impact, StreakLayer from `beam`, recoil per launch, clips `shoot_* reload_gun`, `PROJ_AUDIO[kind]`, `AUDIO_PROFILES[srcDef]` | `reload`, `status:suppress` | `reload_window` | `era:fire` |
| M2b | `squad`; `SUB.ai` (`doctrine weights detect cover`); `ranged.air` | `aiInfo`, `pickTarget`, armygen/squads tables | counters row in placement hover and Codex (CU14), scout codes | none | `no_counter` | none |
| M10 | `ranged.arc payload craterMode structDmg` | `_explode`, `makeCrater`, `strike`, `_tickStrikes` (after god powers), `bigQuery` | sub-chunk terrain edit (R12), `EXPLOSION_AUDIO`, strike telegraph | `shell_incoming` | `shelled_cluster` | `era:strike` |
| M6a | `heal_pulse.filter`, `poison.proj` | ability `tick`, `onHitDealt` | heal ring colour per filter | `healed` | `support_down` | none |
| M7 | `layer cruiseAlt` | pointer: 21 query sites, `_integrate`, fields, hazards | altitude look, shadow blobs, banking, rotor LOD (RA) | `air_in` | `air_unanswered` | `era:air` |
| M12 | prop flags (`gate coalesce cover:'low' explosive decor wreck ttl pad`), arena `tm lk`, `ranged.structDmg` | `hurtProp`, `flushPropDeaths` (after `_tickProps`), `editTerrain`, `_resolveRay` prop hit | debris, `terrain_edit` re-mesh (R12) | `breach` | `breach_open` | `era:prop` |
| M14 | objective params, `script` | `createObjective`, `ScriptRunner.update` (after `objective.update`), `addPlacements` | capture markers/HUD, set-piece dispatcher (CU3), weather rows (R8) | `capture` | `objective_neglect` | `era:script` |
| M13 | ability params, `ABILITY_SCHEMA` | `_tickAbilities`, `killUnit` `onKilled` | blink fx, smoke render, banner ring | `banner_down blink bailout` | `banner_lost` | `era:ability`, `era:spawn` |
| M15 | none (kit record) | constructor, `_checkEnd`, `zeusIntervene`, `GodPowers`, gravity sites | god-power icons, cues, aim rings (UI, AUDIO) | none | `pad_*` | `era:power` |
| M17e | `react wreck` | `killUnit` clip block, `spawnProp` decor | death/hit clips (ANIM), wreck model + smoke (RA/R10) | `wreck` | `pad_*` | none |
| M8 | `turret` | pointer: `rangedBehaviour`, `_integrate` heading, `applyDamage` face, `Possession.tick` | turret yaw from `u.aim` (`meta.aimParts`), recoil | none | `rear_armor` | none |
| M9 | `ai.cover`, prop `cover:'low'` | pointer: `rangedBehaviour` LOS step, `applyDamage` cover factor | cover pose clip, smoke render | `cover` | `open_ground` | none |
| M11 | hazard kinds `mine_*`, ability `lay_mine`, arena `tm arm` | `MineSystem.tick` (after `hazardSys.tick`) | mine decal (owner only), blast fx | `mine` | `mine_field` | `era:mine` |
| M4 | `eshield` | `applyDamage` absorb, `_updateStatusesAndMods` regen, `_checkEnd` | ShieldLayer, HUD bar, shield cues | `shield_down` | `shield_overload` | none |
| M5 | ability `cloak`, `ai.detect` | `pickTarget` skip, `startMelee/startRanged`, `onDamaged` | cloak shader variant (R6), cues | `cloak_found` | `cloak_ambush` | none |
| M6b | `cc_field.effect:'emp'`, `heal_pulse.filter:'machine'` | ability `tick`, `think` hard-disable branch | arc fx, EMP cue, tint | `emp_hit` | `emp_vulnerable` | `era:ability` |

### 3.11 RNG forks and `stateHashFull` (M0)

**Forks.** `makeForks(rng)` runs in the `World` constructor before any draw and returns a fixed-shape object `rf` (monomorphic); a fork is `new RNG(parentState ^ hashString(label))` (`rng.js:26`: pure function of the state at fork time, does not advance the parent, creation order irrelevant; verified in a probe: creating `era:fire,era:air` or `era:air,era:fire` from seed 7 gives identical states and an unchanged parent). The registry is **never renamed, only appended** (`tests/fixtures/fork_labels.json` holds label -> hash; the test compares the file to `FORK_LABELS` and fails on rename/removal):

| label | hash | module | what draws from it |
|---|---|---|---|
| `era:fire` | b06e9e01 | M2 | spread yaw/pitch (6 draws per shot) for shooters whose def has `_nf`, burst rounds, hitscan spread |
| `era:strike` | 982f4fa7 | M10 | barrage shell offsets, strike scatter |
| `era:air` | 19795e6f | M7 | strafe phase and approach jitter |
| `era:prop` | 08d535a0 | M12 | topple/debris direction of collapsing props |
| `era:script` | 5994cb12 | M14 | spawn jitter around markers, `formationOffsets` of script squads |
| `era:ability` | 1e480a99 | M13/M5/M6b | blink scatter, `call_strike` aim jitter |
| `era:mine` | 315baffe | M11 | mine placement jitter |
| `era:spawn` | 96788330 | M13/M14 | the three `addUnit` draws (`world.js:247-249`) + 1 per ability, and `formationOffsets`, for bailout/reinforce units (`o.rng`) |
| `era:power` | c4a7161e | M15 | draws of new-era god powers (Ancient ids keep the main stream in `collect` order) |

Collision test (`forks.test.mjs`): hashes distinct and non-zero (a zero hash would alias the main stream), 1000 random seeds give pairwise distinct fork states and distinct from the parent, order independence over all 24 orderings of a 4-label subset, fixtures file equals registry. **Main-stream draw sites (generated by grep, all stay on `w.rng` for Ancient):** `world.js:202` (igniteAt flammable roll; new-era callers pass an `rng` argument), `world.js:247-249,261` (`addUnit`; `o.rng`), `world.addSquad` -> `formationOffsets(.., this.rng)` (`o.rng`), `projectiles.js:58` (spread; new rows -> `rf.fire`), `projectiles.js:130` (friendly pass-over; legacy kinds only), `combat.js:91,100,111` (damage jitter, block roll, crit: shared by all hits, never moved), `abilities/{misaim:7-8, misfire:7, bribe:9, hook:11, cc_field:107}`, `mutators.js:45,56`, `hazards.js:75`, `godpowers.js:112`, `ai.js:189`. **Rule:** a new draw site reachable from an Ancient battle is forbidden unless guarded by a new-field condition **and** drawing from a fork; test: a grep over `src/sim` fails on `rng.` inside a file touched by this spec unless listed above.

**`stateHashFull()`** (`hashfull.js`; FNV-1a 32, quantiser `Math.fround(v)*1000 | 0` like the legacy hash; a non-finite input throws in `dev` worlds and mixes a sentinel while counting `w.nanCount` in production; the legacy `stateHash` stays byte-identical forever and is also kept as a frozen copy inside G1). Inputs, in order: (A) legacy fields per live unit (id x z hp team), `rng.s`, `tickN`; (B) per live unit `y layer state heading aim ammo reloadT burstLeft setupT sup sh cloak` and `se[0..23]`; (C) per dying unit `id deadT`; (D) every fork state `rf.*.s` in registry order; (E) active projectiles in pool order: `id`, kind hash, `x y z`, `team`, `stuck`; (F) props: `dead`, `hp` (Infinity -> -1), `team`; (G) terrain: FNV of `arena.h` cached by `w.terrainRev` (bumped by `makeCrater`/`editTerrain`); (H) mines and hazards (`kind x z armed team`); (I) effects (`kind x z t`); (J) counters: `stats[0..1] alive dead kills spawnedAlive`, `projDrops`, `bufOverflow`, `terrainSkipped`, `nextUnitId`, objective `progress`/`state`, weather kind, `lastProgressT`, god-power `cd[]`, pending strikes count, script cursor; (K) the **event stream accumulator** `w.evHash`. *Event folding at emit time:* `w.enableFullHash()` sets `ev.fold = (type, p) => ...` (pooled payload objects are reused, so a post-hoc hash would be wrong): mix the event id, then each declared field of the payload: numbers quantised, booleans 0/1, strings via a cached `hashString`, `cluster` x/z, objects (`stats`, `perDef`, `teams`) skipped. `EVENTS` field lists are **append-only**; in worlds whose `era` is `'ancient'` the fold covers only the first `V8_LEN[type]` fields of v8 events (frozen in `tests/fixtures/events_v8.json`), so later modules cannot move the Ancient digest. The production tick pays one null check per `emit`. *Tests (`m01_hashfull.test.mjs`):* deterministic x3 per engine at 2000 ticks; sensitive: 30 single-field mutators (flip one `sup`, one prop `hp`, one fork state, one event field, one terrain cell...) each change the hash; insensitive to listeners (same digest with/without a `onAny` consumer); Ancient: the Ancient full digest is recorded **once at the M0 landing** (G1 "full" column, TOOLS-GOLDEN) and must never change; comparator classes per AR6 (same-engine bit equality; cross-engine statistical).

### 3.12 Events, `LOG_FIELDS`, barks, lessons, weather rows

**`EVENTS` additions (append-only; fields in order; `makePayloads` string-field set gains `outcome why op prev beat piece`; `tests/events.test.mjs` checks table vs use):**

| event | fields | module |
|---|---|---|
| `projectile_launch` (+3) | `... id, src, srcDef, round` | M2 |
| `beam` | `kind team x0 y0 z0 x1 y1 z1 onUnit src` | M2 |
| `unit_deflect` | `src dst srcDef dstDef face outcome x y z` (`outcome` bounce/glance) | M1 |
| `unit_suppressed` | `id by team` | M2 |
| `unit_reload` | `id def secs` | M2 |
| `unit_flanked` | `id src face` | M8 |
| `unit_cover` | `id on` | M9 |
| `unit_air_state` | defined by M-layers | M7 |
| `strike_call` | `kind x z r delay team src` | M10 |
| `terrain_edit` | `x0 z0 x1 z1 op` | M12 |
| `capture_update` | `point owner progress team` | M14 |
| `weather_change` | `kind prev` | M14 |
| `script_beat` / `setpiece` | `beat` / `piece x z` | M14 |
| `unit_blink` | `id x0 z0 x1 z1` | M13 |
| `unit_bailout` | `id def n x z` | M13 |
| `unit_wreck` | `id def x z prop` | M17e |
| `mine_laid` / `mine_trigger` | `id x z team` / `x z team victim kind` | M11 |
| `shield_hit` / `shield_break` / `shield_recover` | `id absorbed left` / `id x y z src` / `id` | M4 |
| `unit_cloak` | `id on why` (ability attack hit detected expire emp) | M5 |
| `emp_pulse` / `emp_hit` | `x z r team src` / `id shield` | M6b |

Rate limits (payloads are pooled; consumers cull): `unit_deflect` <= 1 per unit per 0.25 s, `shield_hit` only when `ev.has('shield_hit')` and <= 4 per unit per second, `unit_flanked` 1 per 2 s per unit. New hazard kind `mine`: `hazard_trigger` unchanged. **`LOG_FIELDS`** (`app/meta.js:308`, INTEGRATION lands; recorded logs drop unlisted fields) adds: `unit_deflect: [src,dst,face,outcome]`, `unit_suppressed: [id,team]`, `unit_reload: [id]`, `unit_flanked: [id,face]`, `unit_cover: [id,on]`, `shield_break: [id]`, `unit_cloak: [id,why]`, `emp_hit: [id]`, `mine_trigger: [team,victim]`, `strike_call: [team]`, `unit_bailout: [id]`, `unit_blink: [id]`, `capture_update: [point,owner,progress]`, `unit_wreck: [id]`, `unit_kill: [srcDef,dstDef,srcTeam,dstTeam,cause]`, `prop_destroyed: [type]` (the last two are new for new-era detectors; Ancient detectors ignore them, `LOG_MAX 6000` is not approached: 600 spawns + 600 kills + the rest).

**Bark keys** (`SIM_BARKS[key:role] -> [key]`; deterministic `(tickN*17 + id*5) % n`, RNG-free; every key needs >= 3 lines per used role family in each era kit, COMEDY): `deflect`(M1, shooter whose round bounced) `reload`(M2) `status:suppress`(M2) `shell_incoming`(M10) `healed`(M6a) `air_in`(M7, first air unit within 40 u) `breach`(M12, gate destroyed) `capture`(M14) `banner_down` `blink` `bailout`(M13) `wreck`(M17e) `cover`(M9) `mine`(M11) `shield_down`(M4) `cloak_found`(M5) `emp_hit`(M6b). **Lesson ids** (detectors in `lessons.js`, text slots `text[>=3]`, `fix[>=3]` per era kit; score formula `base + min(cap, k*n)` like the Ancient ones; `kit.lessons.detectors` lists the ids an era may emit, Ancient = today's list):

| id | module | detector over the log (player = `ctx.team`) | score |
|---|---|---|---|
| `armor_bounce` | M1 | >= 12 `unit_deflect` with outcome bounce where `teamOf(src) = player` | 40 + min(40, n/2) |
| `reload_window` | M2 | any 3 s window with >= 6 player `unit_reload` followed by >= 3 player kills against it within 4 s | 42 |
| `no_counter` | M2b | enemy vehicle+air cost share >= 25% and the player roster has no unit with doctrine `at aa gunship tank emp` | 48 |
| `suppressed_pinned` | M3/M2 | >= 8 player `unit_suppressed` and not won | 38 |
| `shelled_cluster` | M10 | >= 3 enemy `strike_call` and player lost >= 20% | 36 |
| `support_down` | M6a | first player `support` unit death (from `unit_kill`) before 25% of the army was lost | 34 |
| `air_unanswered` | M7 | enemy air kills >= 30% of player losses and no player unit of a can-hit-air def survived 60 s | 44 |
| `breach_open` | M12 | a gate `prop_destroyed` before 60% of the battle elapsed | 34 |
| `objective_neglect` | M14 | player owned 0 capture points for > 60% of `capture_update` span | 44 |
| `banner_lost` | M13 | the banner bearer died first among player officers | 36 |
| `rear_armor` | M8 | >= 3 `unit_flanked` face side/rear on player vehicles | 45 |
| `open_ground` | M9 | player ranged units out of cover (`unit_cover on:0`) when >= 8 `unit_suppressed` | 36 |
| `mine_field` | M11 | >= 2 player deaths with cause `mine` | 40 |
| `shield_overload` | M4 | >= 6 player `shield_break` and not won | 38 |
| `cloak_ambush` | M5 | >= 3 enemy `unit_cloak` why `attack` and player lost | 40 |
| `emp_vulnerable` | M6b | >= 3 player machines `emp_hit` | 42 |
| `pad_win_*`, `pad_loss_*`, `pad_draw_*` | M0/M3/M17e/M15 | era variants of the Ancient pads (3 x 3 per era) | 0 |

Test `m12_kit.test.mjs/lessons`: each detector fires on a constructed log and not on its negative twin; `generateLessons` still returns exactly 3, ids distinct; every id resolves text in the era kit.

**Weather rows** (draft, data in the kit; legacy rows unchanged: `rain/storm` burn .5 fire .5, `snow` speed .9, `sandstorm` spread 1.5, `fog` spread 1.2; new fields default 1: `visMul` (cloak detection range), `shieldMul` (regen), `empMul` (EMP duration)): `smog` speed .97 spread 1.1 vis .8; `ion_storm` spread 1.1 vis .7 shield .6 emp 1.5; `ash` spread 1.2 burn 1.3 fire 1.2 vis .75. `weatherMods(kind)` throws on an unknown kind for non-Ancient worlds.

### 3.13 Budgets and the per-module perf probe method

**Three independent gates (q3 residual 29; plan 0.4):** (i) **Ancient regression A/B**: baseline worktree `ancient-v8` vs candidate, Ancient scenarios only, fail if the median of the per-repetition ratio `candidate/baseline - 1` exceeds `max(5%, 3 sigma_AA)`, where `sigma_AA = 1.25 * std(pair ratio) / sqrt(15)` is the standard error of the median of 15 interleaved pair ratios, measured on baseline-vs-baseline pairs first (a single run scatters by 5.5% here and a pair ratio by about 7.8%, so a flat 5% verdict on one run would flake; the median of 15 pairs is expected near 2.5%, giving a threshold near 7.5%); (ii) **new-era absolute ceilings**: scenario MED-W/MOD-W/SF-W `<= 2.0 ms x k` at 300 units and `<= 3.0 ms x k` at 500; (iii) **era delta** by in-process ablation `<= prefix sum x k` (0.36/0.45/0.50 at 300; 0.57/0.71/0.80 at 500; never above the plan's 0.5/0.8) and per module `<= allocation x k + 3 sigma`. `N_SE 24` and the new `Unit` fields are inside (i). **Box factor.** All plan numbers are reference-box ms (the box of `maps/02`: Ancient 0.91 ms at 308 units, 1.41 at 535). This authoring box measured (thread CPU, warm, `node tools/perf_sim.mjs --ticks=300`): 132 u **1.09**, 308 u **1.63 / 1.77 / 1.81** (mean 1.74, sigma 0.10 = 5.5%), 507 u **2.51** ms, i.e. `k = 1.9` at 300 and 1.8 at 500 (section 6 PC-1). Every absolute threshold is multiplied by `k = median(Ancient A300 in the same run)/0.91` (500: `/1.41`), and the raw numbers are logged next to it in `perf_log.md`.

```budget
[{"id":"M0","ablate":"forks","scn":"all","ms300":0.01,"ms500":0.02,"driver":"kit lookup, fork objects, fold null check"},
{"id":"M1","ablate":"pen","scn":"MOD-W","ms300":0.02,"ms500":0.03,"driver":"pen branch per hit"},
{"id":"M3","ablate":"se24","scn":"all","ms300":0.01,"ms500":0.02,"driver":"N_SE loop, unit fields"},
{"id":"M2","ablate":"weapons","scn":"MOD-W","ms300":0.06,"ms500":0.10,"driver":"bullet substeps 1.8us per bullet-tick, rays 1.2us, suppress queries"},
{"id":"M2b","ablate":"m2b","scn":"MOD-W","ms300":0.04,"ms500":0.07,"driver":"long-range scans: <=40 units with scan>36 at 24-tick retarget, 23us per scan"},
{"id":"M10","ablate":"artillery","scn":"MOD-W","ms300":0.03,"ms500":0.05,"driver":"nav.rebuild(rect), strike list, crater cap 3/s"},
{"id":"M6a","ablate":"filter","scn":"MED-W","ms300":0.01,"ms500":0.01,"driver":"filter checks in collect callers"},
{"id":"M7","ablate":"layer","scn":"SF-W","ms300":0.11,"ms500":0.17,"driver":"2 coarse field pairs (2.0 ms/4 per field per 24 ticks) + layer checks"},
{"id":"M12","ablate":"structs","scn":"MED-W","ms300":0.03,"ms500":0.05,"driver":"coalesced restamp, structDmg hits"},
{"id":"M14","ablate":"script","scn":"all","ms300":0.01,"ms500":0.01,"driver":"runner + counters"},
{"id":"M13","ablate":"abilities","scn":"all","ms300":0.01,"ms500":0.01,"driver":"ability ticks"},
{"id":"M15","ablate":"kit","scn":"all","ms300":0.01,"ms500":0.01,"driver":"kit reads, god power interpreter"},
{"id":"M17e","ablate":"react","scn":"all","ms300":0.01,"ms500":0.02,"driver":"death clip choice, wreck props"},
{"id":"M8","ablate":"turret","scn":"MOD-W","ms300":0.04,"ms500":0.07,"driver":"turret slew 50ns/unit, face resolve per vehicle hit"},
{"id":"M9","ablate":"cover","scn":"MOD-W","ms300":0.04,"ms500":0.06,"driver":"LOS <=4us/shot, reposition scans"},
{"id":"M11","ablate":"mines","scn":"MOD-W","ms300":0.01,"ms500":0.01,"driver":"O(mines) cheap hash checks"},
{"id":"M4","ablate":"shield","scn":"SF-W","ms300":0.03,"ms500":0.05,"driver":"regen 20ns/unit, absorb path"},
{"id":"M5","ablate":"cloak","scn":"SF-W","ms300":0.01,"ms500":0.02,"driver":"2ns per candidate"},
{"id":"M6b","ablate":"emp","scn":"SF-W","ms300":0.01,"ms500":0.02,"driver":"one collect per cast"}]
```

`tools/perf_budget.mjs` parses this block and the `modules` block and fails unless: ids match, the 300 column sums to **0.50** and the 500 column to **0.80** (to 1e-9), the prefix sums for the three E-FREEZE sets are 0.36/0.45/0.50 and 0.57/0.71/0.80, and no module exceeds 0.12 / 0.18 (a larger single share needs a design review). Measured anchors behind the shares (this box, large marathon arena, 301 units): one team's flow-field recompute **3.67 ms** (nav 128x128; reference-box 1.92 ms), so one extra full-resolution field pair at 24 ticks costs `2*3.67/24 = 0.31 ms` here (0.16 reference) and a 2 u coarse pair a quarter of that (the M7 share assumes coarse); 300 moving bullets: 1.8 us per bullet-tick at 120 u/s (0.7 at 40 u/s); a 40 u hitscan ray 1.2 us.

**Scenarios (pre-roster fixtures `fx_*`; replaced by roster ids at each E-FREEZE through `tools/lib/perf_scen.mjs`, composition by role/mechanic preserved).** Per team at 300 total (150 each), 500 scales the filler:
* **MOD-W** (Modern: tank column in a city with artillery): 6 `fx_tank`, 3 `fx_apc`, 6 `fx_at`, 56+29 `fx_rifleman`, 12 `fx_mg`, 8 `fx_sniper`, 4 `fx_howitzer`, 4 mortar, 6 `fx_heli`, 6 `fx_aa`, 10 `fx_engineer`; arena = marathon large + 600 cover props until `mod_city` exists; shelling at the 3 craters/s cap; 60 mines; sandbags dying >= 1/s (structDmg MG). Mechanics co-occurring: M1 M2 M2b M7 M8 M9 M10 M11 M12.
* **SF-W** (Sci-Fi: hover tanks + lasers + shields + 2 craters/s): 12 `fx_hover_tank` (layer hover, eshield 300, hitscan), 50+36 `fx_shield_trooper`, 20 `fx_cloaker`, 14 `fx_drone` (air, hitscan), 10 `fx_emp_trooper`, 8 `fx_mech`; script `strike orbital` twice a second from t = 15 s. Mechanics: M2 M2b M4 M5 M6b M7 M10.
* **MED-W** (Medieval: siege with 2 trebuchets and 400 foot): at 500 total, attacker 250 = 2 `fx_trebuchet` + 200 foot (pike/sword) + 24 `fx_knight` + 18 archers + 6 `fx_healer`; defender 250 = 200 foot + 36 archers + 6 ballista + 1 `fx_dragon` + 6 healers + 1 hero, behind 30 `wall_stone` + 2 team-owned `gate_door`. At 300 total: attacker 150 = 2 trebuchets + 120 foot + 14 knights + 10 archers + 4 healers; defender 150 = 120 foot + 18 archers + 4 ballista + 1 dragon + 4 healers + 3 officers. Mechanics: M2b M6a M7 (dragon) M10 M12.
* **ANC-A / ANC-P**: `tools/perf_sim.mjs` mixed marathon 150/300/500 (steady window ticks 90-690) and the new peak window below.
**Windows.** *Steady* = ticks 90-690 (what `perf_sim` measures today: marching and first contact). *Melee peak* = armies placed 30 u apart by fixed placements (inside every weapon range) measured ticks 30-630, where `_separate`, `pickTarget` and `applyDamage` dominate; each gate uses the **max** of the two windows. *Cold* (`--cold`): first 300 ticks <= 2.0x the warmed average (Ancient measured 3.3/1.7 = 1.94).
**Method (in order).** (1) preconditions: `uptime` 1-min load < 2 (else abort and log), `taskset` one core, `process.threadCpuUsage` (clock granularity ~4 ms: only >= 300-tick means count; per-tick p99 is informational). (2) **A/A first**: baseline vs baseline, two module graphs in one process (`import('file://.../src/sim/world.js?g=a')` / `?g=b`), 15 interleaved repetitions at 150/300/500 units, `sigma_AA`, `k`, thresholds written to the criteria registry (`perf.noise.*`). (3) Ancient regression A/B (i). (4) New-era scenarios (ii): 9 interleaved repetitions, median. (5) **Ablation (iii)**: `tools/lib/ablate.mjs ablate(defs, key)` returns defs with the module's fields removed (`pen`: bullet/explosive/energy rows -> legacy types; `weapons`: burst/mag/hitscan/suppress/homing; `m2b`: doctrine/weights/air; `artillery`: arc/payload/craterMode; `layer`: layer/cruiseAlt; `structs`: structDmg/coalesce/gate; `turret`; `cover`; `mines`: lay_mine + hazards; `shield`: eshield; `cloak`; `emp`; `react`; `kit`: Ancient kit; `script`; `abilities`; `filter`; `forks`; `se24`), same army, same engine, same seed; `delta_m = T(full) - T(without m)`, `delta_era = T(full) - T(all stripped)`; a delta below `3 sigma_AA` reports as 0. (6) Cold and warm-deopt (3.14). (7) Log row in `perf_log.md`: date, sha, `engineHash`, scenario, size, window, reps, mean, sigma, k, deltas, verdict. Unit of cost reporting for modules landing in P1-P2 is the **cumulative** one: each landing re-runs the scenarios with all modules present so far and checks the prefix sum up to that module.

### 3.14 Warm-up rosters, `power.js`, inertness tests

**Warm-up per era (ENGINE-Q32, was UNADDRESSED).** `warmSim({defs, arena, era})` and `createWarmup` take their roster from `kit.warm` (Ancient = the two literal arrays at `warmup.js:15-20`, so its warm-up trace is identical). Era rosters are **generated** by `tools/gen_warm.mjs` from `design/<era>/rosters` (not hand listed): each def contributes path tags (`role`, `layer`, `hitscan`, `burst`, `mag`, `aoe-high`, `homing`, `payload`, `suppress`, `armorFace`, `eshield`, `cloak`, `turret`, `setup`, ability ids, status appliers, `lay_mine`, `heal filter`); the generator picks the smallest set covering every tag present in the era, two teams, <= 24 entries each, counts 10 (most numerous line unit), 5 (ranged), 1-4 otherwise; output `src/content/era_<id>/warm.js` (generated, committed, no-diff gate). Slot rules until rosters exist: Medieval = {line melee, pikeman, archer, crossbow, knight (charge), healer (heal_pulse organic), poison unit, banner bearer, trebuchet, ram/siege melee, dragon (air), gate/wall props}; Modern = {rifleman (mag, burst, suppress), mg, sniper (hitscan), AT, AA (homing), tank (armorFace, turret), APC (bailout), howitzer (arc high, setup), mortar, helicopter (air), engineer (lay_mine), medic}; Sci-Fi = {shield trooper (eshield, burst laser), cloaker, emp trooper, hover tank (hover, eshield), drone (air, hitscan), mech, medic-machine (repair), blinker, call_strike observer, alien swarm, alien monster}. **Tests (`m01_warm.test.mjs`):** coverage: a 420-tick warm-up battle emits at least one event of each required kind (Medieval `crater prop_destroyed unit_heal charge_hit unit_brace status_apply(poison) ability_cast(banner)`; Modern `beam unit_deflect unit_suppressed unit_reload explosion(shell) mine_trigger unit_cover unit_flanked crater`; Sci-Fi `beam shield_hit shield_break unit_cloak emp_hit unit_blink strike_call crater`); leaves no trace (a battle before/after hashes identically: existing `perf.test` pattern); cold ceiling `perf_sim --cold --era=X` first 300 ticks <= 2.0x warmed; **deopt bound**: the Ancient 300-unit scenario warmed with the Ancient roster vs with the Sci-Fi roster, 9 interleaved repetitions, means within 10%. Negative control: delete the `homing` unit from the Modern roster -> coverage test red.

**`power.js` extension plan (M1 armour/pen, M2 burst/mag, M4 shield pool; G11 bit-identical).** Today (`power.js:7-15`): `dpsOf = (max(m,r) + 0.3*min(m,r)) * (1 + 0.25*sizeFactor)` with `r = dmg*volley/cd`; `hpEff = hp*(1 + armor*1.4)*(1 + shield.block*0.35)`; `power = sqrt(hpEff*dps)`; it feeds cost (`stats.js` `rawCost`), `matchup`, `PowerTracker` (`big_swing`, `flank_fold`). New terms exist only when `def._nf` is true, so Ancient evaluates the identical expressions: `armorEq = armorFace ? .5*front + .3*side + .15*rear + .05*top : armor`; `hpEff += eshield ? .9*cap + .5*regen*delay : 0`; ranged `r = dmg*(volley||1)*(burst||1)/cd * magFactor * penFactor` with `magFactor = mag ? T/(T + reload) : 1` where `T = mag*cd/(burst||1)`, `penFactor = pen ? 0.7 + 0.3*min(1.5, pen) : 1`. The coefficients are kit data (`kit.power`) fitted by `tools/power_fit.mjs` against 400 duels per era at E-FREEZE; acceptance is the Spearman rank correlation of rating ratio vs duel win rate >= 0.8 per era (ER7 sub-check) and monotonicity unit tests (more dmg/hp/armor/mag, less reload never lowers power). **`unitinfo.js` has its own `dpsOf`** (`ui/unitinfo.js:60`: `max(melee dmg/cd, ranged dmg/cd)`, no volley, no 30%, no size) - importing `power.js`'s would change every Ancient Codex bar (section 6 PC-3). Resolution: `power.js` exports `dpsDisplay(def)` = the exact `unitinfo` expression for defs without `_nf` (extended with burst/mag/volley for `_nf` defs) and `unitinfo.js` imports it (one definition, Ancient text identical, G10). **G11 check:** raw bytes of `Float64Array` of `power(def)` for the 43 defs (and `dpsDisplay`) equal the baseline record.

**Inertness tests.** For every module M at position p and every era whose E-FREEZE set excludes M (Medieval: M8 M9 M11 M4 M5 M6b; Modern: M4 M5 M6b), `tests/sim/inert_<module>_<era>.test.mjs` re-runs the era golden set (recorded at that era's E-FREEZE: the 12-digest matrix, the era's 9 missions at seed 1, the 6 puzzle solutions; `stateHashFull` equality, no tolerance, same engine) with the module present; `eraHash` cannot prove this because it covers data files only (q3_program residual 5). Ancient: G1/G6 after every module.

### 3.15 Cross-owner interface (what M needs from other owners; requests go to `docs/requests/`)

| owner | needs | module |
|---|---|---|
| WORLD (`src/world/**`) | `NavGrid.stampProp/unstampProp`, `gateTeam`, `FlowField.compute(.., team)`; class fields and coarse nav (M-layers); `Arena` sanitizer keeps prop `tm lk`, hazard `tm arm`; `Arena.edit(rect, {dh, mat})`; unknown prop type is a load error, not a silent inert prop | M12 M11 M7 |
| REGISTRY | `kitFor(era)`, `defsFor(era)`, `propInfo`, `freeze()`/`verify()` extended with: kit tables complete (barks/lessons/waves/god powers), every `ranged.proj` has `PROJ_FX`/`PROJ_VIS`/audio rows, every `cause` in the closed list, `ranged.clip` registered by exactly one rig, `model.rig` present, cut-ladder references (`E_CUT`) | M0 |
| INTEGRATION | `LOG_FIELDS` rows, god-power reader migration (3.10 M15), `setpiece`/`script_beat` dispatcher, `ensureEra` | M0 M14 M15 |
| RENDER | `PROJ_FX/PROJ_VIS` rows, StreakLayer from `beam`, ShieldLayer, SE->tint rows 20..23, deflect spark, `pmCap` to pool size, `GRAV` from env gravity | M1 M2 M3 M4 M15 |
| ANIM-CLIPS / ANIM-RIGS | clip ids (`shoot_rifle shoot_mg shoot_burst cast_beam crew_fire reload_gun fire_cannon`), burst recoil pulses, hit/death clips per rig and `rigLinger` meta, death clips <= `rigLinger - 0.2` | M2 M17e |
| AUDIO | `PROJ_AUDIO`, `EXPLOSION_AUDIO`, `CAUSE_SCREAM` rows, `srcDef`/`src` use, new event handlers | M2 M10 M17e |
| COMEDY-x | bark and lesson texts, `KILL_VERBS` for 8 causes, pad lessons | all |
| UI | ammo/shield/status/cloak on the selection card, status icons, `unitinfo` import of `dpsDisplay` | M3 M4 |
| CAMPAIGN/MS | `keepFlags`, counters as helper inputs, `reinforce` accounting fields | M14 |
| TOOLS | G1 matrix includes one battle per Ancient projectile kind and per `onAim/onFire` ability, `defsFor(era)` in `tools/lib/harness.mjs`, perf tools (3.13), criteria registry | M0 |

### 3.16 AP rows owned by this file (every touched Ancient path; default policy bit-identical opt-in; no deliberate delta)

| # | Ancient path | module | change | policy / proof |
|---|---|---|---|---|
| 1 | `combat.js:130-132` armour expression | M1 | wrapped in `TYPE_MODEL[type] === 0` | verbatim; frozen-expression test + G1 |
| 2 | `combat.js` charge/brace constants | M1 | read through `def.charge/brace ? .. : G.*` | same floats; G1 cavalry battles |
| 3 | `consts.js` `SE`, `N_SE`, `AP` | M3 M1 | append only | slots unused by Ancient; G1 + A/B |
| 4 | `unit.js` fields | M3 | appended | G1 |
| 5 | `defs.js` `TOP_KEYS/SUB` | M0 | appended | `JSON.stringify(def)` digest (G3 ext) |
| 6 | `world.js:899` `stateHash` | M0 | untouched | frozen copy in G1 |
| 7 | `core/events.js` `emit/has/EVENTS` | M0 | `fold` null check; fields append-only | events_v8.json |
| 8 | `projectiles.js:33-72` `fire` | M2 | new-key rows branch (fork, lead, life, muzzle); `* u.mSpread` and `/ w.gMul` are exact for 1 | G1 one battle per kind |
| 9 | `projectiles.js` stick/radius/kb kind cases | M2 | moved into `projkinds.js` rows with the same numbers | frozen-expression test |
| 10 | `ai.js` four `startRanged` sites, `world.js:369` | M2 | `rangedReady` (`cdR <= 0 && ammo !== 0 && setupT <= 0`) | G1 + possession replay |
| 11 | `ai.js:49-92` `pickTarget` | M2b | extra terms only when `info.m2b` | frozen copy on 2000 scenes |
| 12 | `world.js:715-731` `_tickEffects` aliasing (latent bug: `dotDamage -> killUnit -> moraleShock` rewrites `qbuf2`) | M10 | **not fixed** for `cloud/fire`; new kinds use `qbufFx` | G1; bug recorded, no delta |
| 13 | `world.js:187` `makeCrater`, `:150` `hurtProp`, `:163` `spawnProp` | M10 M12 | lazy / coalesce / decor are opt-in | G1 Troy + Thermopylae |
| 14 | `world.js:223` `areaDamage` | M10 | `bigQuery` only when `r + 1.8 >= 12`; Ancient earthquake `collect(r 14)` keeps `qbuf3` (silent truncation preserved) | G1 |
| 15 | `objectives.js:138` | M14 | new types only; `protect_vip reachOnly` quirk preserved | G6 |
| 16 | `world.js:297` `addPlacements` | M14 | `keepFlags` opt-in (campaign bug #5 stays for Ancient) | G6 |
| 17 | `waves.js` exports | M15 | default `era='ancient'` | G7 12-wave dumps |
| 18 | `lessons.js` | M15 | `ctx.kit` optional | G4 |
| 19 | `godpowers.js` | M15 | interpreter; same params, same draw order | G1 god-power battles |
| 20 | `world.js:807-848` `_checkEnd`, `:861` `zeusIntervene` | M15 | literals -> `kit.pacing/intervention` (equal values) | G1 stalemate battles |
| 21 | gravity sites `world.js:634,796`, `projectiles.js:37` | M15 | `* w.gMul` (1.0) | G1 |
| 22 | `combat.js:204-214` death clip | M17e | `def.react` gate | G1 + S24 |
| 23 | `power.js` | M1 M2 M4 | `_nf` guard | G11 |
| 24 | `ui/unitinfo.js:60` `dpsOf` | M1 M2 | imports `dpsDisplay` (legacy expression for Ancient) | G10 Codex text |
| 25 | `armygen.js` tables, `squads.js:10` | M2b | explicit new rows; Ancient functions unchanged | G7, G1 |
| 26 | `stats.js` | M2b | throw rows for vehicle/air customs; `K`, `roleEfficiency` Ancient | G5 (cost of 200 customs) |
| 27 | `hazards.js` | M11 | separate `MineSystem` | G1 |
| 28 | `abilities/{poison,heal_pulse,cc_field,summon_on_death,dash,dot_cloud,aura}.js` | M6a M6b M13 | new params only; `spawn` default removed (Ancient passes it) | S16 tests + G1 |
| 29 | `warmup.js:15` | M0 | roster from `kit.warm` (Ancient = literals) | warm-up trace test |
| 30 | `mutators.js:47`, `godpowers.js:96`, `world.js:871` literals | M15 | `kit.mascot`, `kit.intervention.gift` | G1 mutators |
| 31 | `possession.js:67` | M2 M8 | `rangedReady` | S26 input-log replay |
| 32 | `world.js:910` `weatherMods` | M14 | new fields default 1; legacy rows same | G1 weather |
| 33 | `core/events.js:29` string-field set | M0 | + `outcome why op prev beat piece` | events.test |

### 3.17 Mechanics not built (cuts.md X8) and cut-ladder parts

| mechanic | status | what the sim does instead | guard |
|---|---|---|---|
| transports / dismount / passengers | not built | APC is a vehicle; crew appear only via `bailout` on death; no load/unload verbs | `cargo`, `passengers` rejected (`E_UNKNOWN_KEY`) |
| supply limits beyond magazines | not built | ammo is refilled by every reload; no resupply | `mag` only |
| high-ground range/accuracy bonus | not built | ranges and spread are 2D; terrain height only blocks rays and projectiles | no `range*(1+k*dy)` anywhere |
| fog of war | not built | everything within `scan` is seen; cloak is the only concealment | no visibility map |
| rubble as cover | not built | destroyed props leave no obstacle; wrecks are decor | `coalesce` removes cells |
| wrecks (M17e) | built, ladder rung 5 | non-blocking prop, cap 24, ttl 25 s | `kit.cuts` removal -> `E_CUT` on `def.wreck` |
| smoke occlusion (M9, M13 `smoke`) | built, rung 5 | occluder effect in `lineOfFire` | `E_CUT` on `payload.effect:'smoke'` |
| mines | built, **never cut** (e.md names them) | M11 | - |
| blink | built, never cut (ability, `dash kind:'blink'`) | M13 | - |
| teleport pads | built, rung 5, separate from blink | M12 sub-feature: `info.pad`, arena prop `lk` pairs two props; units on `layer 0` within 1 u for 0.5 s are moved to the partner (cooldown 3 s, `unit_blink`) | `E_CUT` on `info.pad` |

## 4. Acceptance

Tiers (plan section 3): T-fast <= 4 min lint+unit+contracts+9+6 Ancient replay; T-era adds the era's inert/slice/UC runs; T-full everything but release-only; **release-only** = full negcontrols, perf A/B at 3 sizes with 15 reps, soak; **scheduled-heavy** = ablation fuzz and balance. All files are plain `node:assert` tests under `tests/sim/` unless noted; each registers `criterion(id, ..)` with a negative control file `tests/negctl/<id>.mjs` (mutation + the check id that must go red; QA draws >= 8 by its own seed). Owner = author role; REVIEWER signs every row; TOOLS-VERIFY runs the registry.

| id | script / test (name prefix) | inputs | thresholds | owner | tier | negative control (mutation -> red check) |
|---|---|---|---|---|---|---|
| S28 | `m01_schema`, `m01_hashfull`, `forks`, `ensure_era_order`, `m01_warm` | 15 bad-def fixtures; 1000 seeds; 2000-tick battle x3; 16 era-ensure orders; 30 hash mutators | each bad def -> its code; forks distinct non-zero order-free; hash deterministic and 30/30 sensitive; Ancient G1 digests equal for all 16 orders; coverage events present | SIM | T-fast (warm cold/deopt: serial lane, T-full) | NC-S28: extra `rng.next()` before `makeForks` -> `forks/ancient`, G1 |
| S29 | `m02_damage` | 6 weapons x 7 targets (3.7), 10 000 crit trials per cell, legacy grid 5x4x3 | 42 cells within 1e-9; crit never flips outcome; chip floor exactly 0.1; legacy grid bit-equal | SIM | T-fast | NC-S29: `BOUNCE` 0.75 -> 0.40 or floor 0.1 -> 1 -> `effect` |
| S30 | `m03_statuses` | 24 slots; Ancient 300-unit A/B | names/tints/icons present; Ancient A/B inside `max(5%, 3 sigma)` | SIM | T-fast (A/B in serial lane) | NC-S30: 25th slot without tint row -> `limits` |
| S31 | `m04_weapons` | six weapon classes x 120 s x {baked, DEFAULT_META}; 3000-shot pool test; friendly-fire ally line x 100; hit-rate MC (static, crossing, no-lead) | rate within 5% of design; `projDrops 0`, peak live <= 1000; hits per 3.8; static in [0.75, 0.88], lead within 3 points, no-lead [0.40, 0.55] | SIM | T-fast | NC-S31: `hitAt` ignores `gapTicks` -> `rate/effect` mg |
| S32 | `m05_targeting`, `silent_defaults`, `roles` | one test per doctrine row (3.9); 2000 random scenes for the Ancient copy; 33 tables x 11 roles x 3 eras | each counter wins by >= its margin (AA 48); Ancient choice identical in 2000/2000; no table row missing | SIM | T-fast | NC-S32: AA weight 0 -> `ai`; delete the `air` row of `LINE_OF` -> `silent_defaults` |
| S33 | `m06_explosives` | lazy crater on a wall; 12-shell barrage; 10 shells in 1 s; 5000 fabricated units; strike timeline | `soft/block` unchanged; field recomputes <= 1 per 6 ticks, `valid` never false; 3 craters + 7 skipped; overflow throws; all blob members hit | SIM | T-fast | NC-S33: `invalidateFields()` in lazy branch -> recompute count |
| S34 | `m07_heal` | organic/machine fixtures, poison arrow, undead | filters respected; poison 3 dps x `secs` | SIM | T-fast | NC-S34: no filter in `pulse` -> `effect` |
| S35 | `m08_layers` (M-layers) + `layers_audit` | 21+6+23+11 sites with a rule row each; air remnant fuzz 200 battles; max field age at 600 units | every site has a row+test; remnant terminates <= 62 s in 100%; age ground <= 12, hover/air/clear <= 24 ticks | SIM | T-era | NC-S35: drop layer filter in `crowdAhead` -> its row |
| S36 | `m09_structures` | 40 coalesced deaths; 20 deaths/20 ticks; gate owner/enemy; barrel chain; 30 units on a collapsing bridge | 1 index update, 1 dirty mark, <= 1 refresh per 6 ticks, <= 4 over 20 ticks; owner passes, enemy breaches; chain <= 3 deep; no unit left on an unwalkable cell | SIM | T-fast | NC-S36: `invalidateFields()` per death -> refresh count |
| S37 | `m10_objectives` | capture/defend_core/escort/destroy fixtures; script ops; crew-bailout accounting fixture; record/replay | wins/loses as specified; ops fire once at their tick; `startCount` unchanged, progress monotone; replay `stateHashFull` equal | SIM | T-fast | NC-S37: count bailouts in `startCount` -> accounting |
| S38 | `m11_abilities` | banner, blink (alley, water edge), smoke, bailout, call_strike | params validated; blink never lands unwalkable; ids <= 32 | SIM | T-fast | NC-S38: blink to non-walkable cell -> `limits` |
| S39 | `m14_vehicles` (M-layers) | rear/side/front shots on `fx_tank`, strafing, reverse, possession per class | hull and turret independent; rear-shot kills 4x faster than front; possession passes per class | SIM | T-era (Modern) | NC-S39: `u.face = want` for turret defs -> rear-shot test |
| S40 | `m15_cover` (M-layers) | wall between squads, smoke, 6000 LOS calls | blocked unit repositions or fires through <= timeout; `x0.5` in cover; <= 4 us/call | SIM | T-era (Modern) | NC-S40: remove timeout fallback -> `ai` |
| S41 | `m16_mines` | arm, trigger, chain, friendly, hover; 61 mines; 10 000-tick soak | per 3.10; cap 60; heap < 1 MB | SIM | T-era (Modern) | NC-S41: trigger on allies -> friendly test |
| S42 | `m17_shields`, `watchdog_interim` | absorb/overflow numbers; break/recover/regen timeline; regen > dps stalemate x 20 seeds | numbers exact; ends <= 62 s with `stalemate_warning` at the pacing warn in 20/20 | SIM | T-era (Sci-Fi) | NC-S42: absorb after pen -> worked example |
| S43 | `m18_cloak` | detect 6 / 14 u, attack break, weather vis | exact thresholds | SIM | T-era (Sci-Fi) | NC-S43: no break in `startRanged` -> `effect` |
| S44 | `m19_emp` | mech/infantry/air-machine fixtures; 300 blob radius 12 | machines disabled 3 s and shields zero; organics untouched; no truncation | SIM | T-era (Sci-Fi) | NC-S44: EMP hits organics -> `effect` |
| S45 | `m12_kit`, `kit_ancient_equal`, `arc_gravity` | Ancient kit vs frozen literals; 6 powers vs recorded input log; arc at `gMul` 0.4, D in {.3,.6,1} x range | deep-equal; `stateHashFull` equal to pre-change record; landing within 0.8 u | SIM | T-fast | NC-S45: change a `pacing` literal -> `kit_ancient_equal`, G1 |
| S46 | `m13_reactions`, `causes` | rig x class table; permuted clips; 20 wrecks in a corridor; 40 fuzz battles/era | all cells resolve; permuted tables -> equal `stateHashFull`; corridor passable; every cause has 4 rows | SIM | T-fast | NC-S46: `deathLinger` from clip duration -> permutation test |
| X1 | `dag` | `modules` block | 19 ids, S28..S46 once, deps earlier except declared cores, three prefix sets | SIM | T-fast | NC-X1: move M14 before M12 -> red |
| X2 | `tools/perf_budget.mjs` | `budget` + `modules` blocks | sums 0.50 / 0.80; prefix sums 0.36/0.45/0.50 and 0.57/0.71/0.80; no share > 0.12/0.18 | TOOLS-VERIFY | T-fast | NC-X2: M7 0.11 -> 0.15 -> red |
| X3 | `tools/perf_assert.mjs --gate=i,ii,iii` | A/A 15 reps x {150,300,500}; ANC-A/P, MED-W, MOD-W, SF-W; ablation keys | per 3.13 | TOOLS-VERIFY | serial lane in T-full (3 reps), full in release-only | NC-X3: 0.3 ms busy-loop per tick in the candidate -> gate (i) |
| X4 | `ancient_identity` | 43 defs; frozen legacy expressions (damage grid, fire lead/stick/life for 10 kinds, `pickTarget`, `stateHash`) | new keys undefined; `JSON.stringify(def)` digest equal; all frozen expressions bit-equal | SIM + TOOLS-GOLDEN | T-fast | NC-X4: set `armorFace = {}` on one Ancient def -> red |
| X5 | `events` (+ `events_v8.json`) | table vs use, field order | append-only; payload shapes | SIM | T-fast | NC-X5: reorder two `unit_hit` fields -> red |
| X6 | `inert_<module>_<era>` x 9 | era golden sets | `stateHashFull` equal, no tolerance | SIM | T-era | NC-X6: one extra draw in `applyDamage` (added in M4) -> Medieval + Modern red |
| X7 | `power` + G11 | 43 defs | `power(def)` and `dpsDisplay` bytes equal; monotonicity; Spearman >= 0.8 per era (BALANCE, ER7) | SIM / TOOLS-GOLDEN / BALANCE | T-fast / E-FREEZE | NC-X7: change the `0.3` low-weapon weight -> G11 |
| X8 | `lessons_barks` | constructed logs; kit text completeness | each detector fires/does not fire; 3 lessons distinct; >= 3 lines per used key | SIM + COMEDY | T-fast | NC-X8: delete one lesson text -> `registry.verify` |
| X9 | `m01_warm` cold/deopt | see 3.14 | cold <= 2.0x; deopt within 10% | SIM | serial lane, T-full | NC-X9: remove the `homing` unit from the Modern roster |

**Ablation controls and minimum shifts (ER6; same army, same engine, same seeds, >= 200 battles per cell, Wilson lower bound; spec/VF consumes this table).** `pen`: 20 tanks vs 120 riflemen, tanks win rate with pen stripped (legacy floor) drops by >= 25 points; `suppress`: infantry crossing 60 u under 4 MGs, casualties before contact differ by >= 20% and time to contact by >= 15%; `shield`: shielded vs unshielded mirror shifts >= 15 points; `cloak`: cloaker squad vs ranged line shifts >= 10 points and `cloak_kills` >= 20 in the fuzz; `emp`: EMP squad vs 6 mechs shifts >= 20; `layer`: heli squad vs infantry without AA shifts >= 30; `m2b`: AA vs heli+grunts, AT vs tank+grunts, sniper vs officers: time-to-kill of the preferred target shortens by >= 40%; `artillery`: howitzer battery vs static clump kills >= 25% more than with arc/aoe stripped; `structs`: siege with trebuchets vs wall opens the breach >= 30% sooner than with structDmg stripped; `mines`: 20 mines on the path kill >= 3 enemies on average; `filter`: organic healer vs machine wounded heals 0. **Mechanic-coverage metric (VERIFY-Q14):** in the era fuzz of 2000 matchups every `ability id`, every projectile kind and every counter `doctrine` fires >= 20 times and per-mechanic indicators are printed (shield uptime, suppression applications, EMP disables, cloak engagements, cover hits, deflects, bounces, mines); a kind with zero use fails.

## 5. Residual ledger

Every item whose target spec file is `M` (verbatim from `q3_engine.md`, `q3_program.md`, `q3_product.md`, `q2_*`, and the `q1_disposition.md` section "answered only by deferring to a spec deliverable"). "Pointer" = the contract is here, the algorithm in `M-layers.md`.

| item (id) | asks | answered in |
|---|---|---|
| q3_engine 5 (with spec/RA) | sim reads clip timing without a rig; every windup clip registered by exactly one rig; new hum1 ids must not collide; both-order digest | 3.8 (rate test under baked + DEFAULT_META; `E_CLIP`), 3.10 M0 (`ensure_era_order`); the plain-slot `meta+owner` digest test itself is RA's, M supplies the rule |
| q3_engine 6 | M7 layer audit: 21 `hash.query`, 5 `fields[` sites, 23 nav sites, `propBlocks`/`heightAt`, `recomputeCentroids`, `_separate`, anchor march; single-class squads; analytic air steer; LINE metric | pointer 3.10 M7 (verified counts 21 / 6 lines in 5 sites / 23 / 11); `recomputeCentroids` row 3.9; acceptance S35 |
| q3_engine 7 | flow-field slot schedule, ms per field, max-age test, dirty events refresh only affected fields | pointer 3.10 M7; targets and anchors 3.13 (3.67 ms per field here, 24-tick coarse); event-driven dirty path 3.10 M12 |
| q3_engine 11 | `stateHashFull` event folding at emit time, test flag, quantisation, field list | 3.11 |
| q3_engine 12 | fork labels registry + collision test; main-stream draw sites; spread from fork; `addUnit` rng parameter | 3.11 (table, draw-site list, `o.rng`) |
| q3_engine 13 | status semantics per applying module; tint encoding already uses 0..7; index literals | 3.5 (table), 3.3 (literals 0,13,5,3,7,4,12,10), D-M27 |
| q3_engine 14 | `armorFace` split (M1 reads `o.face`, M8 resolves); Ancient floor restated; 0.1 only for new types | 3.7, D-M6, 3.10 M8 |
| q3_engine 15 | friendly fire for new weapons, per-kind life, substep cost, `alloc()` null | 3.8 (friendly table, life, `projDrops`, cost 1.8 us/bullet-tick) |
| q3_engine 16 | `air/groundOnly` validated in M2, enforced in M2b masks with `u.layer`; y-test; hitscan reuses `propBlocks` | 3.4 (`ranged.air`), 3.9 (mask), 3.8 (`propHit`) |
| q3_engine 17 | one strike primitive for M13/M14/orbital; `weather` event rebuilds `w.weather` + emits | 3.10 M10 (`strike`), M14 (`weather` op, `weather_change`), M15 |
| q3_engine 18 | `markNavDirty` API + crater cap numbers; displacement rule for `editTerrain`; wreck rule with 20 wrecks | 3.10 M10 (3/s cap, API), M12 (rings 1..3, `fallKill 9`), M17e (cap 24, corridor test) |
| q3_engine 19 | deploy/pack-up is a `setup` gate in M2/M8, not M17e; `killUnit` hard-coded clips | 3.8 (`setupT`), 3.10 M17e (`combat.js:204-214` override), D-M21 |
| q3_engine 20 | `killUnit` cause vocabulary closed, fuzzed, 4 rows each | 3.3; deviation: `bailout` is an event not a cause (below) |
| q3_engine 21 | extend the grep-generated silent-default list | 3.9 rows 20-33 |
| q3_engine 22 | closed role vocabulary per era; row in every table; `model.rig` mandatory | 3.3 (`ERA_ROLES`), 3.9 role matrix |
| q3_engine 29 | three independent sim gates; allocation sums by script; `N_SE`/fields in the A/B | 3.13, X2/X3 |
| q3_engine 30 | `bailout` mechanics (append during `killUnit`, no hash entry, squad rule, accounting, rng) | 3.10 M13 + M14 accounting |
| q3_engine 31 | M7 gunship "face and fire", M8 re-opens air only for turret/aim-gated weapons; test lists in both | 3.2 edge M7->M8, 3.10 M7/M8 pointers |
| q3_engine 32 | `lastProgressT` in M4; interim for suppression/heal standoffs in Modern | 3.10 M4, D-M22, row S42/`watchdog_interim`, 3.8 suppression note |
| q3_engine 37 | `Prop.team`, `info.gate`, `explosive`, per-tick coalescing, Ancient default | 3.10 M12 |
| q3_engine 39 | `World({era})` read once; `weatherMods`/gravity/kit bound; arena `env.era` visuals only | 3.10 M0 |
| q3_engine 35 / 36 / 38 / 28 / 40 (other files) | ablation per module (VF), view CPU (VF), registry verify (AR), vehicle corridor (W), R11 rule (RA) | M supplies: ablation keys + min shifts (3.13, 4), `registry.verify` list (3.15); rest not M |
| q3_program 1 | DAG with edge reasons; M15 core and M17e before #6; E-FREEZE module sets incl. M15+M17e; acceptance by set | 3.2 (edges, windows, `modules` block, X1) |
| q3_program 20 | `ensureEra` order independence (zero..three eras, every order) | 3.10 M0 tests, S28 row |
| q3_program 29 (with spec/W) | staged release and `LIMITS.propTypes`/era chips | 3.10 M0: the sim resolves props from the full registry (hidden included); hiding is UI/import-time (W, CU) |
| q3_product 8 (with CU12) | interpreter keeps earthquake `rng` draw order, `cd` 2xN, `casts`, era-merged ids, reader list, `tags` | 3.10 M15 (quake note, arrays, reader list, tags) |
| q3_product 11 | M15a split or remove the "a" | D-M20 (one module, two steps, no "a") |
| q2_schedule Q9 | M6 split; M17 split; P3 start per era; E-FREEZE | 3.2, 3.10 M6a/M6b, M17e (engine/tables), 3.14 inertness |
| q2_schedule Q19 | A/A noise floor first; per-module allocation that sums; load conditions | 3.13 |
| q2_schedule Q18 (M part) | which records move after a sim fix | 3.10 M15: pacing/weather/power are data inside `eraHash`; engine changes re-record via X6 sets; protocol itself COORD/VF |
| q1_scope Q17, q1_verify Q17, ENGINE-Q7, Q19 | line-item budget, worst scenarios, real thresholds, 5 ms smoke | 3.13, X2, X3 (the 5 ms `perf.test` stays as a smoke) |
| q2_engine Q1 | timing regime, `ClipLib.version` constant per battle | 3.10 M0 (dev assert), 3.8 (both regimes); registry/ensure details AR |
| q2_engine Q4, Q5, Q20 | closed vocabulary + AP rows; "defaults legacy" rule and corrected lead/stick numbers; defs shape | 3.3, 3.7, 3.8 rows, 3.4, X4 |
| q2_engine Q6 | `power.js` blind to new mechanics | 3.14 |
| q2_engine Q7, Q8 | two perf tests (A/B vs ablation), melee-peak window; view CPU | 3.13 (view CPU: VF) |
| q2_engine Q9, Q10 | module order by dependency; field cadence | 3.2; pointer M7 + 3.10 M12 |
| q2_engine Q15, Q16, Q18, Q19 | era precedence; per-mechanic forks; warm-up; `stateHashFull`/`N_SE` | 3.10 M0, 3.11, 3.14, 3.5 |
| q1 ENGINE-Q2 | pickTarget scoring for counters | 3.9 |
| q1 ENGINE-Q3 | `stateHash` vs G1; rng2 in hash | 3.11 |
| q1 ENGINE-Q4, Q5 | Ancient policy table; merged defs leak | 3.16; 3.10 M0 (era argument, unknown faction throws, G7) |
| q1 ENGINE-Q6 | role tables | 3.9 |
| q1 ENGINE-Q8, Q9, Q15, Q16, Q24, Q26 | layer audit, air AI, vehicle/turret, possession, clearance, cover/LOS | pointer sections 3.10 (M7, M8, M9); full text `M-layers.md` |
| q1 ENGINE-Q10 | shield vs watchdog | 3.10 M4, D-M22 |
| q1 ENGINE-Q11 | pacing per era | 3.10 M15 (record, Ancient literals, draft era values) |
| q1 ENGINE-Q12 | penetration numbers | 3.7 worked examples |
| q1 ENGINE-Q13, Q14, Q36, CONTENT-Q14 | stick/pool, lead/hitscan flags, muzzle/friendly spawn, burst contract | 3.8 |
| q1 ENGINE-Q23, Q28 | invalidation storms, big-area buffer | 3.10 M10, M12 |
| q1 ENGINE-Q25 | bailout/spawn accounting | 3.10 M14, M13 |
| q1 ENGINE-Q30 | `env.gravity` on arcs | 3.10 M15 (multiplier, arc test) |
| q1 ENGINE-Q32 (was UNADDRESSED) | per-era warm-up + deopt bound | 3.14 |
| q1 ENGINE-Q34 | mechanics not built | 3.17 |
| q1 ENGINE-Q35 | SE tint table | 3.5, 3.3 |
| q1 ENGINE-Q38 | Ancient literals in the engine | 3.10 M0 (swaps), M15 (`kit.mascot/intervention`), M13 (`spawn` required), `squadSize` allowlist (AR owns the allowlist file) |
| q1 ENGINE-Q1, Q17, Q18, Q27, Q29, Q31, Q33, Q37 | tracer meaning, G1 matrix, ClipLib, cloak render, registry, rotors, errata, scale | not M: S-slice, TOOLS-GOLDEN, RA, AR, W (M supplies the DAG tags and the Ancient-path rows they need) |
| q1 SCOPE-Q17, VERIFY-Q1, VERIFY-Q14 | budget lines; NaN-aware hash; mechanic coverage | 3.13; 3.11 (sentinel + `nanCount`); section 4 coverage metric and ablation shifts |

**Deviations stated verbatim.** (1) q3_engine 20 lists `bailout` among new `killUnit` causes: decided **not a cause** (no death is caused by bailing out; it is the spawn event `unit_bailout`); the vocabulary test therefore covers 27 ids; if COMEDY wants a "crew exits the burning tank" line it keys off `unit_bailout`, who decides: COORD at the humour bible review (phase P0). (2) q3_program 1 asks M15/M17e before #6: kept at #12/#13 with core steps movable (3.2); the sets, which acceptance compares, are identical either way.

## 6. Plan corrections (evidence)

| # | plan statement | evidence | correction |
|---|---|---|---|
| PC-1 | 0.4 gates: "(ii) new-era scenarios <= 2.0 ms at 300 and 3.0 ms at 500 (absolute), (iii) era delta <= 0.5/0.8 ms" and "(i) within max(5%, 3 sigma)" | `node tools/perf_sim.mjs` on this box (4 CPUs Xeon 2.8 GHz, Node 22.22, idle, warm): 132 u 1.09 ms; 308 u 1.63, 1.77, 1.81 (sigma 0.10 = 5.5% of one run); 507 u 2.51; map 02 reports 0.53 / 0.91 / 1.41 (at 132 / 308 / 535 units) for the same method, so the box is 1.8-2.0x slower. Ancient 308 u (1.74) + the Medieval prefix delta (0.36) = 2.10 > 2.0: gates (ii) and (iii) cannot both hold in raw ms here | thresholds are reference-box ms scaled by a measured box factor `k` (3.13); sigma is taken on interleaved A/A pair ratios; raw numbers logged |
| PC-2 | M2: "`projectile_launch` carries `defId`" | `audio/cues.js:330` reads `p.srcDef \|\| p.def`; `unit_hit`/`unit_kill` already use `srcDef` | field is `srcDef` (+ `src`, `round`) |
| PC-3 | M1: "`unitinfo` importing `dpsOf` from `power.js`" | `ui/unitinfo.js:60` = `max(melee dmg/cd, ranged dmg/cd)`; `power.js:8` adds volley, 0.3 low weapon, size factor: importing changes every Ancient Codex damage bar (G10) | `power.js` exports `dpsDisplay` = the unitinfo expression for Ancient defs; `unitinfo` imports that (3.14) |
| PC-4 | M14: "`escort` (fixes `reachOnly`)" and "`addPlacements` keeps `vip/general`" as default behaviour | `objectives.js:ProtectVip` pins progress 0 under `reachOnly`; `world.js:297` drops the flags; both are Ancient behaviour recorded in G6 | `escort` is a new type (the quirk of `protect_vip` stays bit-identical); `keepFlags` is opt-in; no Ancient delta (ENGINE-Q4 policy (a)) |
| PC-5 | 0.3: forks "created in a fixed order" | `rng.js:26`: pure function of the state at fork time | order is irrelevant; labels must be unique and non-zero (3.11) |
| PC-6 | M13: "cap 32 abilities per pack (spec amendment)" | registry has 27 ids; this spec adds 3 (`cloak lay_mine call_strike`) | no amendment needed: 30 <= 32 |
| PC-7 | G1 lists the legacy hash only | the baseline build has no `stateHashFull`, so an Ancient full-hash record can exist only after M0; `JSON.stringify(def)` digest is not in G3 | G1 gains a "full" column recorded once at the M0 landing; G3 gains the def-JSON digest (X4) - TOOLS-GOLDEN |
| PC-8 | map/q3 line references | code wins: `AP` is `consts.js:17` (map: 20); the plain death-clip block is `combat.js:204-209` and the linger at `:214` (q3: 200-206); spread draw `projectiles.js:58` (q3: 56), friendly pass-over `:130` (q3: 127), crit `combat.js:111`; `.fields[` occurs on 6 lines in 5 sites | this file cites the verified lines |
| PC-9 | 4: Modern E-FREEZE #1..#16 omits M4 | consistent, but note: Modern therefore uses the legacy `lastDamageT` watchdog | stated in D-M22 with test `watchdog_interim` |

## 7. Open items (each has an owner and a deadline phase; only OI-3 gates the first engine edit)

| # | item | owner | deadline |
|---|---|---|---|
| OI-1 | budget shares are draft until prototypes of M2/M2b/M10 and the M7 coarse-field cost are measured with `perf_budget.mjs` (plan 14: "budgets draft until end of P1") | SIM with TOOLS-VERIFY | end of P1 |
| OI-2 | consistency check of names shared with `M-layers.md` (`unit_air_state`, `CLS.AIR`, `markNavDirty` class bits, `layer` ids, `rangedReady`/`aimOk`) | REVIEWER | P0 exit |
| OI-3 | Ancient "full" hash record and def-JSON digest (PC-7) recorded before the first engine edit | TOOLS-GOLDEN | P0 (gates the first engine edit) |
| OI-4 | `ERA_ROLES` subsets and the draft pacing/weather/power coefficients may be amended by rosters v1 and the fits (logged amendment, lints re-run) | DESIGN-ERA-MED/MOD/SF, BALANCE | rosters v1 (P0) / E-FREEZE of each era (P3) |
| OI-5 | confirm the deviation "`bailout` is a spawn event, not a `killUnit` cause" (q3_engine 20) so COMEDY does not write a 28th kill-verb row | COORD with COMEDY-EDITOR | humour bible review (P0) |
