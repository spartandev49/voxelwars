# spec/AR: architecture of the "three new eras" program (DESIGN-ARCH, final, 2026-10-08)

Binding inputs: `docs/eras/plan.md` v3.1 (sections 2, 3, 12, 14), `maps/01..08`, `q1_*` .. `q3_*` residuals. Where code and a document disagree the code wins; every such case is in section 6. Facts below were verified on HEAD `4fe90f7` (tag `ancient-v8` = `4aafd2e3fb83f20e1b19e0db8465c117032ba3b7`; `git diff --stat ancient-v8 HEAD -- src tools assets` = one file, `tools/build.mjs`, the `VW_BUILD_DATE` override of commit `d9f663a`). Probes: scratchpad only, nothing under `src/` was touched.

Conventions. Paths are repo-relative. "Ancient" = `src/content/era_ancient/` and everything the shipped v8 build executes. Era ids: `ancient medieval modern scifi` (ERA_ORDER, in this order; id prefixes `med_ mod_ sf_`). Roles are the plan section 12 roles only. Policy codes of the AP table: `FZ` frozen (any diff fails), `OI` bit-identical opt-in (Ancient output unchanged by construction, proven by the named golden), `PX` pixel/DOM-identical refactor (golden tolerance, no re-record expected), `NEW` new file with no Ancient importer, `GEN` generated, `TOOL` not shipped, `DA-n` deliberate Ancient-visible delta with a named re-record under two signatures (author cannot sign).

## 1. Purpose and scope

This file binds the architecture every other spec builds on: (a) the era registry (AR1) with merge kinds, seal/freeze/verify, import DAG and lint, pack contracts, how sim imports switch; (b) the Ancient-policy (AP) table and its diff-based lint, deliberate-delta list, release-state parity rule; (c) the id policy (AR2) and the Ancient-literal table of `src/sim`; (d) era precedence (AR3); (e) save details (AR4); (f) campaign/puzzle/survival/daily factories and the facade (AR5) with the 60 seam dispositions of maps 01 and 06; (g) the timing regime (AR6): `ensureEra`, bake filter, entry points, `defsFor` table, comparators, record tags, fingerprints, G11/G12 content; (h) tooling era-awareness (AR8); (i) custom soldiers (AR9); (j) errata and app-layer Ancient imports, hot-file owner table; (k) packaging (AR7), provenance and gate interfaces.

Length: tables carry about 80% of the lines (70 AP rows, 38 owner rows, 60 seam dispositions, 22 caller rows, 35 acceptance rows, about 45 ledger rows, 17 plan corrections, 12 errata); prose is kept to contracts and rationale.

Builders: REGISTRY (registry, packs, factories, save, router, gen-registry), INTEGRATION (`game.js meta.js main.js content.js ensure_era.js`), SIM (only the 7 import lines and the listed deltas, via `docs/requests/coord_era_registry_sim.md`), WORLD (`gencore`), ANIM-CLIPS (bake filter), EDITORS/UI (consumers), TOOLS-GATE/GOLDEN/VERIFY (lint, goldens, `_eras.mjs`, size report). Not in scope: mechanics (spec/M), rigs/render (spec/RA), world content (spec/W), screens and flows (spec/CU), missions (spec/MS), audio (spec/AU), text (spec/H), criteria table (spec/VF). Where this file names an interface another spec fills in, the interface (names, signature, owner) is fixed here.

## 2. Decisions

| # | decision | rationale | plan |
|---|---|---|---|
| AR-D01 | The registry has two stages. **Seal** happens at the end of `registry.js` module evaluation (data kinds merged, containers frozen). **Freeze** happens once at the end of `src/content/packs.js` (logic registered: recipes, prop models, factories). `buildSimDefs`, `defsOr`, `K`, `roleEfficiency`, `propInfo` need only the seal; `content.js`, `ensureEra`, facades need the freeze. | 21 callers call `buildSimDefs()` with only `sim/defs.js` imported (verified list, 3.7.3); a freeze that needs the pack loader would break all of them or create a cycle (`sim/defs -> registry -> pack -> survival -> sim/waves`). Seal-by-evaluation makes use-before-seal impossible by construction; the throw guard stays for isolated test instances (`createRegistry()` returns an open instance). | AR1 |
| AR-D02 | Every public function that gains an era argument defaults to `'ancient'` (legacy default rule): `buildSimDefs(extra, opts)`, `generateArmy`, `counterTable`, `scoutReport`, `WaveSystem`, `dailyPlan`, `randomBlueprint`, `listParts`, `statsToUnitDef`, `lessonText`, `simBarks`, `buildContent()`. Merged "all eras" is explicit (`{era:'all'}`). | Non-negotiable 2; keeps the 21 bare callers, 65 tests and 13 tools byte-identical; map 01 proposed merged-by-default, which would change every `'mixed'` pool (27 test/tool sites) - see PC4. | 0.2, AR1 |
| AR-D03 | There is NO `era` key on defs (agrees with spec/M D-M3). Era is a registry side map: `registry.eraOf(def)` = `customTag.get(def)` (a `WeakMap` set by `customDef()` for non-Ancient customs, 3.9) else `FACTION_ERA[def.faction]` else `'ancient'`. Nobody compares `def.era`. | Plan 0.2 requires `JSON.stringify(def)` of the 43 Ancient defs unchanged and Object.keys consumers untouched (q2_engine Q20); a stamped key changes shapes for every consumer (PC3). | 0.2 |
| AR-D04 | Registry data stays pure and leaf-fed: `era_<id>/data.js` + `manifest.js` + `custom_classes.js` import only leaf files; logic lives in `pack.js` and `src/content/shared/**`. Ancient files keep their paths; Ancient G files (compiler, parts kit, campaign engine) are reached by new eras only through `src/content/shared/ancient_g.js` shims. | Verified: the 7 data files have 0 imports (`sim_text.js` only `humor/barks.js`); G files import sim (`campaign_run.js`, `survival.js`) and would close a cycle. | AR1 |
| AR-D05 | `sim/stats.js` stops reading the Ancient table: `ANCIENT_K = 8.708228289932388` and the six role efficiencies are frozen constants (3.1.7); the recomputation exists only in a test. | Saved customs are re-costed on every load (`clampedCost`); a stronger Medieval unit would raise every saved custom's price. Constants equal the live computation to the last bit (probe 3.1.7). | AR1, AR9 |
| AR-D06 | Id policy (3.3). **Pack data** ids carry the era prefix: props, parts, cues, achievements, missions, puzzles, god powers, set-pieces, pack ability presets, **and arenas, recipes, themes, unlock keys, era mutators**. Units, factions and rigs are unprefixed but globally unique by the registry collision throw. **Engine vocabularies** (projectile kinds, ability implementation ids, damage types, causes, roles, tags, statuses, clip ids, event ids) are SIM/ANIM code, unprefixed in one global namespace, with their own definition-site duplicate throws (spec/M 3.3 owns them). Tombstone kinds `part faction mission era projectile` are added first. | Plan AR2 lists some kinds; arenas/recipes are single global namespaces (`R` in `gen.js`) where a bare name from a hidden era would leak or collide. An ability implementation such as `call_strike` is shared by Modern and Sci-Fi, so a prefix would pin it to one hidden era (PC12). | AR2 |
| AR-D07 | The Ancient-literal lint (3.3) bans Ancient unit/faction/arena/prop ids in `src/sim/**` outside an allowlist table that is itself tested; allowlist = 2 utility units + 3 legacy sites + sites with a scheduled data replacement. | q3_engine residual 23 corrected the list (15 lines found by grep, 3.3). | AR2 |
| AR-D08 | The AP lint is a diff against `ancient-v8` over `src tools assets package.json`, fed by the table in 3.2 (parsed from this file between `AP-TABLE` markers). | q3_engine residual 8; `package.json` added because `version` feeds `__VW_VERSION__` (PC10). | 0.1, 3 |
| AR-D09 | Release-state parity (R-PARITY): with `released = {ancient}` every Ancient screen is DOM/pixel-identical to v8 except DA rows; era UI (chooser, chips, tabs, what's-new) appears only when `registry.releasedEras().length > 1`. | Makes G8/G10 baselines meaningful for staged releases (D18) and gives the hidden-era leak check a definition. | 0.1, D18 |
| AR-D10 | Era precedence (3.4): `World.era` is explicit and the only kit selector; `arena.env.era` is visual/audio only; the app layer rejects mixed-era setups, the sim tolerates them. | q2_engine Q15. | AR3 |
| AR-D11 | Save changes are additive; no `CURRENT` bump, no new top-level doc, `SAVE_FORMAT` stays 1. `settings.gore` keeps its legacy enum; "Auto" is `goreAuto:true` (+`goreChosen`). Keys a v8 build would drop are derived caches or documented losses (3.5). | v8 `validateSettingsData` throws on an unknown `gore` value and v8 `normalizeStats` drops unknown keys (verified, 3.5): a literal `gore:'auto'` would make a rollback export un-importable (PC8, PC9). | AR4 |
| AR-D12 | Router history stores `{id, params}`. | `router.js:37,56`: Back calls `goto(prev, undefined)`; params lost. | AR5 |
| AR-D13 | Ancient `campaign.js`, `puzzles.js`, `survival.js`, `daily.js` are not edited. `era_ancient/pack.js` wraps their module singletons into the same facade shape new eras get from factories. | Ancient stays FZ; the Ancient mission data is the exemplar the MS lint back-fills. | AR5 |
| AR-D14 | `ensureEra(era, opts)` lives in `src/content/ensure_era.js`; it bakes clips (synchronous, idempotent, canonical order) and builds lookup tables only. The roster warm-up battle stays the existing time-sliced `createWarmup`. | `warmup.js`: 420-tick battle, `step(budgetMs)` slices; synchronous would break the ceiling (PC14). | AR6 |
| AR-D15 | `buildSimDefs()` bare stays Ancient-only; `registry.defsFor(era)` = that era plus the utility units; the real game's `World` receives `registry.defsFor('all')` over released eras; `tools/lib/harness.mjs DEFS` stays Ancient. | `World` never enumerates defs (only `armygen.js` does: pool/counter table), so merged defs in `World` are safe once pools are era-scoped. | AR1, AR6 |
| AR-D16 | Comparator classes and engine tag (3.7.5): records carry `engine`, `engineVersion`, `engineHash`, `eraHash`; bit equality only inside one engine. | q3_engine B1: Node 22 and Chromium 141 differ by 1 ulp in `sin cos pow`; unmodified Ancient 300-unit battles diverge by tick 1500-2500. | AR6 |
| AR-D17 | `engineHash` is a pair `{simCore, shared}` and `renderHash` is separate; sim records compare `simCore`, render goldens compare `shared + renderHash`. | Plan's single `engineHash` would amber every sim record on any render edit. | 3 |
| AR-D18 | Per-era manifests (`manifest.js`) carry exact counts and a `phase`; only COORD edits `expect`, every shortfall needs a `cuts.md` id in `manifest.cuts`. | AR8, plan section 1. | AR8 |
| AR-D19 | Custom soldiers: era from the main weapon part (`meta.era`), per-era rows `custom_classes.js`, Ancient rows stay in `sim/stats.js` untouched, new-era unknown style throws, `randomBlueprint/listParts` filter by era (default `ancient`). | PC5: both enumerate the global `PART_REGISTRY`; new parts would change every seeded Ancient random soldier. | AR9 |
| AR-D20 | `unitinfo.dpsOf` (Codex bars) is a display formula and keeps its Ancient numbers; it may delegate to `power.js dpsDisplay` (spec/M D-M26) once that is bit-equal on the 43 Ancient defs. `power.js dpsOf/power` are extended behind `def._nf` guards. | 20 of 43 Ancient defs differ between the two formulas (PC1). | M1 |
| AR-D21 | Materials are index-addressed saved bytes; index ranges are reserved per era: ancient 0-15, medieval 16-31, modern 32-47, scifi 48-63, 64-255 spare (padding rows keep indices stable). | `Arena` stores `m` as Uint8 indices; hidden or sparse eras must not shift later eras. | W3 |
| AR-D22 | Generated files: committed, deterministic, sorted; `gen-registry.mjs --check` (no write) is a gate step; builds in a snapshot never write the shared tree. | Verified: regeneration is byte-identical today (probe 3.11.1); q1_scope Q4 isolation. | AR1, AR7 |
| AR-D23 | Cross-era meta achievements (3) live in a non-era data pack `src/content/meta/` (owner id `meta`, not in ERA_ORDER); its content is visible only when two or more eras are released (R-PARITY), so the Ancient-only state still shows 24 achievements. | Ancient is frozen (24 achievements pinned); a hidden era must not own an always-visible achievement. | CU9 |
| AR-D24 | `registry.verify()` is a pure function of registry + injected vocabularies (`{roles, damageTypes, causes, abilityIds, cueIds, clipIds}`), never importing sim. | Keeps `registry.js` a leaf; vocabularies come from `packs.js` (which may import sim). | AR1 |

## 3. Detailed specification

### 3.1 Registry (AR1)

#### 3.1.1 File list (owner REGISTRY unless stated)

| path | layer | content | status |
|---|---|---|---|
| `src/content/registry.js` | L1 pure | `createRegistry`, merge kinds, `seal/freeze/verify/fingerprint/use`, singleton `registry`, named bindings `DEFAULTS propInfo simBarks lessonText waveTables` (delegate to the current singleton). Imports ONLY `../_generated/registry.eras.js` and `./eras.config.js`. | NEW |
| `src/content/eras.config.js` | L0 leaf (COORD) | `ERA_CONFIG = [{id:'ancient',status:'released'},{id:'medieval',status:'hidden'},{id:'modern',status:'hidden'},{id:'scifi',status:'hidden'}]`; order = ERA_ORDER. Status flips only at an era release (D18) and is an AP row. | NEW |
| `src/content/stat_helpers.js` | L0 leaf | `M(dmg,cd,range,type,style,extra)`, `R(proj,dmg,cd,range,extra)`, `S(arc,block,proj)` - byte-equivalent to the local helpers of `era_ancient/stats.js:6-8` (test AR-T06b evaluates both on every Ancient row); new `stats.js` files MUST keep the one-line-per-unit `id: { faction` format (`balance.mjs applyTune` regex `^  ([a-z_]+): \{ faction`). | NEW |
| `src/content/era_<id>/manifest.js` | L0 leaf | default export, schema 3.8.2. | NEW x4 |
| `src/content/era_<id>/data.js` | L0 leaf | default export `{STAT_TABLE, FACTIONS, ...}`; allowed keys = KIND_TABLE 3.1.2. Ancient: ~15 lines re-exporting the EXISTING `stats.js, arenas.js, props/catalog.js, sim_text.js, lesson_text.js, wave_names.js, humor/units_text.js, humor/achievements.js (MISSION_IDS, ARENA_IDS)` plus an overlay `PROP_FLAGS` (id -> `{tiny, noShadow, thin, float}`) replacing the `TINY NO_SHADOW THIN FLOAT` id lists of `render/props.js:43-48` without editing `catalog.js` (FZ). | NEW x4 |
| `src/content/era_<id>/custom_classes.js` | L0 leaf | per-era custom-soldier rows (3.9). Ancient rows stay in `src/sim/stats.js`; no `era_ancient/custom_classes.js` exists. | NEW x3 |
| `src/content/era_<id>/pack.js` | L3 glue | default export `PACK` (3.1.5): recipes, prop models, factories, announcer, teaching, set-pieces. | NEW x4 |
| `src/content/packs.js` | L3 glue | pack loader: imports `_generated/registry.packs.js`, calls `registerLogic` per era in ERA_ORDER, then `registry.freeze()` and `registry.verify({logic:true, vocab})`. First import of `app/main.js` and of `tests/_eras.mjs`. | NEW |
| `src/content/ensure_era.js` | L3 glue (INTEGRATION + ANIM-CLIPS for the bake filter) | `ensureEra` (3.7.1). | NEW |
| `src/content/content.js` | L3 glue (INTEGRATION) | `buildContent({eras})` (3.1.9). `era_ancient/content.js` becomes `export { buildContent } from '../content.js'` (AP-C01). | NEW |
| `src/content/shared/ancient_g.js` | L3 | re-exports of Ancient G files for new-era packs: `blueprints.js compileSoldier validateBlueprint PART_REGISTRY`, `parts/{_registry,_kit,_base}`, `beasts/{common,quad1,mounted,hum_lite}`, `props/models/{index,kit}`, `campaign_run.js`, `campaign_validate.js`. The ONLY path by which `era_X` (X new) reaches Ancient code. | NEW |
| `src/content/shared/{campaign,puzzle,survival,daily}_factory.js` | L3 | factories (3.6.1). Daily reuses `era_ancient/daily.js` functions (they already take `content` lists) through `ancient_g.js`. | NEW |
| `src/content/shared/leaf/` | L0 leaf | `mutator_stars.js` (the 9 thresholds; a test asserts it equals `campaign.js:17` and `content.js:22`), `reserved_ids.js`, `id_rules.js` (regexes of 3.3). | NEW |
| `src/content/meta/{manifest,data,pack}.js` | pack id `meta` | cross-era achievements (AR-D23); `phase:'complete'` means exact count 3. | NEW |
| `src/_generated/registry.eras.js` | GEN | static imports of every `era_*/manifest.js`, `data.js`, `custom_classes.js` (+ `meta`) in ERA_ORDER; exports `ERA_PACKS`. | GEN |
| `src/_generated/registry.packs.js` | GEN | static imports of every `era_*/pack.js`; exports `ERA_LOGIC`. | GEN |
| `src/_generated/registry.era_<id>.js` x4, `registry.modules.js` | GEN | per-era module groups (`UNIT_MODEL_MODULES PART_MODULES BEAST_MODULES PROP_MODEL_MODULES HUMOR_MODULES`) globbed from `era_<id>/{units,parts,beasts,props/models,humor}`; `registry.modules.js` exports `ERA_MODULES = {ancient:{...}, ...}`. `registry.content.js`, `registry.optional.js`, `registry.ui.js` stay (Ancient flat names, compatibility; `registry.content.js` byte-identical for Ancient groups). | GEN |
| `src/world/gencore.js` | WORLD (W1) | `registerRecipes(eraId, map)`, `RECIPE_IDS` (the same array object `gen.js` exports as `RECIPES`), helpers (`Gen distPoly curve inZone`) exported for era recipe files. | NEW |
| `tools/gen-registry.mjs` | REGISTRY | discovers `src/content/era_*`; writes the files above; `--check` writes to a temp dir and exits 1 on any diff; skips the write when content is identical. | edit |

#### 3.1.2 Merge kinds and exact API

Four merge kinds. `KIND_TABLE` (a constant in `registry.js`) maps every allowed `data.js` key to `{kind, merge, scope, rule}`; an unknown key throws `RegistryError('BAD_KEY')` (a typo cannot silently vanish).

| merge kind | rule | throws | accessors |
|---|---|---|---|
| `idmap` | id -> row; eras processed in ERA_ORDER, file order inside an era; the table object is plain with insertion order (Ancient first). | `RegistryError('COLLISION', 'era id collision: <kind> "<id>" in <a> and <b>')` naming both eras; also on a malformed id (3.3). | `table(kind, era='all')`, `get(kind,id)`, `ids(kind,era)`, `owner(kind,id)` |
| `list` | ordered list, concatenation in ERA_ORDER; duplicate element throws. | `COLLISION` | `list(kind, era='all')` |
| `single` | exactly one provider (Ancient); a second provider throws. Per-era values that are NOT merged (`SIM_BARKS LESSON_TEXT WAVES KIT WARM CUSTOM_CLASSES TEXT`) are `byEra` singletons: at most one per era, no cross-era fallback except the field-level fallback of barks and lessons to Ancient. | `SINGLETON` | `single(kind)`, `byEra(kind, era)` |
| `append` | array that only grows: `materials metals emblems palettes skinTones hairColors eyeColors weathers`; each era declares `base` (the length before its append); a mismatch throws, padding rows `{reserved:true}` keep indices stable (AR-D21). Consumers that INDEX by a random draw must use the era view. | `ORDER` | `appended(kind, era)` (era view; `'ancient'` = the Ancient prefix only), `all(kind)` |

`KIND_TABLE` rows (data.js key -> kind; scope):
`STAT_TABLE`->unit (idmap); `FACTIONS`->faction (idmap); `ARENAS` (array of presets)->arena (idmap + ordered view); `RECIPE_IDS`->recipe (idmap of ids; functions come from gencore); `PROP_CATALOG`->prop (idmap); `PROP_FLAGS`->prop_flags (idmap, overlay); `PROP_CATEGORIES`->prop_category (list); `UNIT_TEXT`->unit_text (idmap, key must be a unit id); `RIG_BY_ID`->rig_by_id (idmap unit id -> rig id; Ancient pack supplies the 6 entries now in `combat.js:46`); `RIGS` (ids owned by the era, also `manifest.rigs`)->rig (idmap); `DEFAULTS`->defaults (single); `MATERIALS METALS EMBLEMS PALETTES SKIN_TONES HAIR_COLORS EYE_COLORS WEATHERS`->append; `THEMES`->theme (idmap with `aliases`); `UNLOCKS`->unlock (idmap); `MISSION_IDS PUZZLE_IDS ACHIEVEMENT_IDS ARENA_IDS (stat/tourist set) MUTATOR_IDS`->mission/puzzle/achievement/arena_stat/mutator (idmap of ids; bodies live in pack.js and text modules); `GOD_POWERS SETPIECES`->god_power/setpiece (idmap, row schema spec/CU CU12 and CU3), `ABILITIES`->ability (idmap of pack ability presets, spec/M); `AUDIO_PROFILES PROJ_AUDIO EXPLOSION_AUDIO ABILITY_CUES`->audio rows (idmap keyed by unit/projectile/ability id); `PROJ_FX FX_CLASS REACTIONS`->render/anim rows (idmap keyed by projectile kind, def id, rig id); `SIM_BARKS LESSON_TEXT WAVES KIT WARM CUSTOM_CLASSES TEACHING_BEATS TEXT`->byEra.

Registry API (all synchronous and pure; no accessor reads a clock or `window`):

```js
// src/content/registry.js
export class RegistryError extends Error { code; kind; id; eras }       // codes: COLLISION ORDER BAD_KEY BAD_ID SINGLETON NOT_SEALED NOT_FROZEN FROZEN UNKNOWN_ERA
export function createRegistry(packs, opts = {}) -> Registry             // packs = [{id, manifest, data, customClasses}] in ERA_ORDER; returns an OPEN instance
export const registry                                                    // = createRegistry(ERA_PACKS).seal()  (frozen later by packs.js)
Registry: seal(), registerLogic(eraId, kind, table), freeze(), verify({logic, vocab, strictCounts}) -> {ok, problems:[{code,kind,id,era,msg}]},
          eras({includeHidden}) / releasedEras() -> ids / era(id) -> {id,name,short,order,status,prefix,requires,phase,accent,currency,expect,rigs},
          eraOf(x) (def, faction id, unit id, arena id, prop id, mission id, puzzle id, ...) -> era id; for a def: custom tag, else faction map, else 'ancient'; tagCustom(def, era) (called by customDef for non-Ancient customs),
          statTable(era='ancient'), defsFor(era='ancient') (era def table + utility units; 'all' = released eras), factions(era), arenas(era), propCatalog(), propInfo(type),
          simBarks(era), lessonText(era), waveTables(era), kitFor(era), warmRoster(era), customClasses(era), costFit(era), version, sealed, frozen, fingerprint(), use(instance)
```

`registry.use(instance)` exists only when `globalThis.__VW_TEST__ === true` (negative controls and the both-orders test swap the singleton and bump `version`). Named bindings (`propInfo`, `simBarks`, ...) call through the current singleton so ESM named imports in `sim/*` stay valid after `use()`.

#### 3.1.3 Seal, freeze, verify, version-keyed caches

- Seal: containers frozen (`Object.freeze` on the merged maps/arrays, NOT on rows: Ancient rows are shared object literals; `registry.verify({deepFreezeRows:true})` freezes rows in test mode and `tests/arch/rows_not_mutated.test.mjs` runs one full Ancient battle to prove nothing mutates them). After seal `registerLogic` is the only mutator; after freeze it throws `FROZEN`. Era views (`statTable('ancient')`, `defsFor`, ...) are NEW objects sharing the rows; the exports of the Ancient leaf files are never frozen, copied-over or mutated.
- `version` = 1 for the singleton (counter for isolated instances). Every memo in the engine is keyed `version + '|' + era`: `armygen.defsOr` (replaces the module-level `_defs`), `simBarks(era)`, `customClasses(era)`, `roleEfficiency(role, era)`, `content.counters` (cache per defs object already). A test swaps instances and asserts no stale memo (NC-AR-02).
- `verify()` problem codes (each has a fixture in AR-T03): V01 arena->recipe (data: id in `RECIPE_IDS`; logic: id registered in gencore); V02 mission/puzzle id lists equal the pack factories' lists; V03 unit->faction exists and faction->era unique; V04 `role`, `tags`, damage `type`, `cause` inside the injected vocabularies; V05 unit has `UNIT_TEXT` and a model entry (logic), and `def.model.rig` is mandatory for non-hum1/quad1 defs (q3_engine residual 22, 38); V06 `rig_by_id`/`model.rig` names a rig declared by the unit's era or an era in `requires`; V07 every `ranged.proj` is in the injected `vocab.projKinds` (spec/M 3.3: 10 legacy + era kinds, rows in `sim/projkinds.js`) and has a `PROJ_FX` row, a `PROJ_VIS` entry and a `PROJ_AUDIO` row (residual 38); V08 every `abilities[].id` is registered in `sim/abilities` and every `cause` an ability emits is in the closed cause vocabulary (residual 38); V09 every cue id in audio rows resolves to a manifest row or a synth recipe; V10 no id is both live and tombstoned, every tombstone `by` is live; V11 prefix and reserved-word rules (3.3); V12 `manifest.expect` counts (exact when `phase:'complete'`, `<=` when `building`, shortfalls need `cuts`); V13 `summon_on_death` has `spawn`; V14 every unit has the text fields spec/H demands (existence only); V15 `requires` closure is acyclic and a rig has exactly one owner; V16 material `base` indices; V17 hidden-era leak: no released-era row references an id owned by a hidden era (rigs via `requires` excepted); V18 kit completeness: every non-Ancient era has barks, lessons, waves, god powers, intervention, mascot, pacing and warm roster/arena (spec/M D-M19; `kitFor(era)` is the raw data record, `src/sim/kit.js` assembles the runtime kit from it and from `simBarks lessonText waveTables warmRoster`); V19 `ranged.clip` and every requestable clip id is registered by exactly one rig (logic stage after `ensureEra`, run by `verifyClips(era)` for ER5); V20 no def, mission or puzzle references a mechanic on the cut ladder (`vocab.cutMechanics` parsed from `cuts.md`, spec/M `E_CUT`).
- `verify()` runs in `tests/arch/registry_verify.test.mjs`, `tools/contracts.mjs` (per era), `tests/_eras.mjs` (`ERA_IDS` suite setup) and in dev builds of `main.js` (`window.__vw.registry`); never in production boot.

#### 3.1.4 Import DAG: explicit edge list and lint rules

Measured baseline (esbuild metafile of `src/app/main.js`, 313 files; directory edges `importer -> imported : file-level edges`): `sim->core 3, anim 1, world 2, content 7`; `world->core 1, content 1`; `anim->voxel 1`; `save->core 7, world 2, content 5`; `content->core 6, sim 16, voxel 17, world 4`; `render->core 4, voxel 7, world 3, content 3`; `audio->content 1`; `ui->content 16, render 2, save 2, sim 4, world 4`; `editors->anim 3, content 25, core 9, render 5, save 8, ui 7, voxel 5, world 16`; `app->anim 1, content 9, core 5, render 16, save 6, sim 8, world 3`. There is a directory-level cycle `sim <-> content` (file level acyclic) that the registry removes.

Target edges (the DAG test asserts exactly these; anything else fails):

| importer | may import |
|---|---|
| `core` | `core` |
| `voxel` | `core voxel` |
| `anim` | `core voxel anim` |
| `content/era_*/{manifest,data,custom_classes}.js`, `content/shared/leaf/**`, `eras.config.js`, `stat_helpers.js` (L0) | files of the SAME `era_<id>/` directory that are themselves L0, `shared/leaf/**`, `stat_helpers.js`. Nothing else. |
| `content/registry.js` (L1) | `_generated/registry.eras.js`, `./eras.config.js` |
| `sim` | `sim`, `core`, `anim/clips.js` only, `world/{nav,gen,gencore,arena}.js`, `content/registry.js` only |
| `world` | `world`, `core`, `content/registry.js` |
| `save` | `save`, `core`, `world/arena.js`, `content/registry.js`, `content/shared/*`; ratchet-listed exceptions: `era_ancient/{blueprints,custom,custom_text}.js` (3 imports in `validate.js`) until they move behind `shared/` |
| `render`, `audio` | own dir, `core voxel world anim`, `content/registry.js`, `content/shared/*` (render/props.js reaches the prop-model builder through `shared/ancient_g.js`) |
| `content/era_*/pack.js`, `content/{packs,ensure_era,content}.js`, `content/shared/**`, `content/meta/**` (L3) | everything below plus `sim anim voxel world core`, the same era directory, `shared/*`; NEVER another `era_*`; a new era never imports `era_ancient/` directly |
| `ui`, `editors`, `app` | all pure layers via `registry.js` / `shared/*` / `content.js`; ratchet-listed `era_ancient/**` imports (today 41 files, 3.10.3) that only decrease |
| `_generated` | anything (generated) |

Lint rules (`tools/lint.mjs`, TOOLS-GATE implements; each has a fixture pair in `tests/arch/lint_arch.test.mjs`):
LR1 `era-leaf`: `era_*/{manifest,data,custom_classes}.js`, `shared/leaf/**`, `eras.config.js`, `stat_helpers.js` import only per the L0 row (direct imports by line regex; the closure is checked by the DAG test, which also asserts the closure equals `manifest.leaf` so additions are visible).
LR2 `era-cross`: no file under `era_X/**` imports a path containing `/era_Y/` (Y != X); no file under any `era_*/` other than `era_ancient/` imports `era_ancient/`.
LR3 `engine-no-era-path`: `src/{sim,world,render,audio,save,anim,core,voxel}/**` may not import `/content/era_`; baseline counts committed in `tests/baseline/era_imports.json` (today: sim 6 files/7 lines, world 1, save 3, audio 1, render 2, ui 4+, editors 17, app 4, per map 01 2.4), the ratchet only decreases; sim/world/audio/render must reach 0 by the end of P1.
LR4 `sim-import-allowlist`: the sim row above.
LR5 `registry-leaf`: `registry.js` imports only its two files.
LR6 `era-branch`: no `era <op> 'ancient'|'medieval'|'modern'|'scifi'` comparison (regex `\bera\w*\s*[!=]==?\s*['"](ancient|medieval|modern|scifi)['"]` and the reversed form) outside `src/content/**` and `tests/**`; zero today. Data lookups only.
LR7 `ancient-literal`: 3.3, scope `src/sim/**` (stage 1) and ratchets for `world render audio` (stage 2).
LR8 `era-manifest`: every `era_*` directory has `manifest.js`, `data.js`, `pack.js`; the set of directories equals the ids of `eras.config.js` and the generated `ERA_ORDER`.
LR9 `pure-dom` (existing) keeps covering `src/content/` (PURE prefix). Known traps for era writers: the identifiers `window document navigator localStorage` (a Sci-Fi `navigator` role key fails it - rename or `lint-allow:pure-dom`), the words `todo fixme xxx lorem ipsum coming soon` anywhere including jokes (`dilution` rule scans comments and strings).

#### 3.1.5 Pack contracts

`manifest.js` default export: schema in 3.8.2. `data.js` default export: an object whose keys are a subset of `KIND_TABLE` (3.1.2); Ancient exports exactly: `STAT_TABLE FACTIONS DEFAULTS ARENAS PROP_CATALOG PROP_CATEGORIES PROP_FLAGS SIM_BARKS LESSON_TEXT WAVES{names,bossNames,bossCycle} UNIT_TEXT RIG_BY_ID WARM{roster,arena} MISSION_IDS ARENA_IDS RECIPE_IDS UNLOCKS` (values read from the existing leaf files, no copies).

`pack.js` default export `PACK`:

```js
export default {
  era: 'medieval',
  recipes:   { med_keep: (g) => {...} },                 // -> gencore.registerRecipes('medieval', map)
  propModels: <module namespace or {SPECS,BUILD}>,       // -> props/models registerPropModels('medieval', m) (throws on duplicate type)
  modules:   null,                                       // unit/part/beast/humor module groups come from registry.era_<id>.js (generated)
  campaign:  createCampaign({...}),  puzzles: createPuzzles({...}),  survival: createSurvival({...}),  daily: createDaily({...}),
  announcer: {templates, arenaNames, missionTitles, propNames, heroes, abilitySub, eventCases, categoryPriority},   // CU18
  teaching:  [...], setpieces: {...}, godPowers: {...},   // rows live in data.js; pack.js only wires logic
  vocab:     { cues: [...] }                              // contributes to verify()
};
```

`packs.js` order: for each era in ERA_ORDER: `gencore.registerRecipes`, `registerPropModels`, `registry.registerLogic(era, 'campaign'|'puzzles'|'survival'|'daily'|'announcer'|..., value)`; then `registry.freeze()`; then `registry.verify({logic:true, vocab: collectVocab()})` throws `RegistryError` in tests and dev, logs `diag.error('registry', ...)` in production and refuses to leave the splash (a broken registry is a fatal screen, not a degraded game).

#### 3.1.6 Recipes into gencore

`gen.js` keeps its 16 Ancient recipes (registered into `gencore` at its own import so `generateArena('marathon')` works in every bare test; G2 is the net) and exports `RECIPES = gencore.RECIPE_IDS` (the same mutated-in-place array, so `RECIPES.includes/map` in `campaign_validate.js:21` and `editors/arena/panels.js:253` see era recipes). `registerRecipes(eraId, map)` asserts `registry.owner('recipe', id) === eraId` (data and function agree), throws on a duplicate naming both eras, and is allowed only before `freeze`. `generateArena` throws `Unknown arena recipe` exactly as today. The Ancient `random` recipe keeps its 8 Ancient picks (an era-specific `med_random` would be a new recipe).

#### 3.1.7 The sim import switch (7 lines, 6 files) and the Ancient-only constants

| # | file:line | today | after | Ancient effect |
|---|---|---|---|---|
| 1 | `sim/defs.js:2` | `import { STAT_TABLE, DEFAULTS } from '../content/era_ancient/stats.js'` | `import { registry } from '../content/registry.js'`; `const DEFAULTS = registry.single('defaults')`; `buildSimDefs(extra, opts)`: `table = registry.statTable(opts && opts.era \|\| 'ancient')` (`'all'` = released eras merged); `normalizeDef` is unchanged apart from the `DEFAULTS` binding; `TOP_KEYS/SUB` gain new keys APPENDED after `_ai` / `kb` (spec/M 3.4, all `undefined` on Ancient; NO `era` key) | key order of the 43 defs identical |
| 2 | `sim/stats.js:5` | `import { STAT_TABLE, DEFAULTS } ...` | `import { DEFAULTS, registry } from '../content/registry.js'`; `K()` and `_eff` computed from the Ancient table are replaced by constants below; `export { DEFAULTS }` kept | costs of all customs identical (G5) |
| 3 | `sim/unit.js:3` | `import { DEFAULTS } ...era_ancient/stats.js` | `import { DEFAULTS } from '../content/registry.js'` | same values |
| 4 | `sim/world.js:14` | `import { propInfo } ...catalog.js` | `import { propInfo } from '../content/registry.js'` (merged catalog; Ancient entries are the same objects) | same |
| 5 | `sim/world.js:24` | `import { SIM_BARKS } ...sim_text.js` | `import { simBarks } from '../content/registry.js'`; `this._barks = simBarks(this.era)` once in the constructor; `simBarks('ancient')` returns the original object | bark picks `hash(tickN,id) % list.length` unchanged |
| 6 | `sim/lessons.js:5` | `import { LESSON_TEXT } ...` | `import { lessonText } from '../content/registry.js'`; `lessonText(ctx.era \|\| 'ancient')[c.id]` | same |
| 7 | `sim/waves.js:8` | `import { WAVE_NAMES, BOSS_NAMES, BOSS_CYCLE } ...` | `import { waveTables } from '../content/registry.js'`; `bossOf(n, era='ancient')`, `waveName(n, era='ancient')`, `WaveSystem` takes `opts.era` | same |

New-era lookups: `simBarks(era)` = frozen object `Object.assign(Object.create(null), ancientBarks, eraBarks)` (era keys win); `lessonText(era)` likewise; `waveTables(era)` has no fallback (required for new eras). All three are `memo(version|era)`. `World` reads `new World({arena, seed, rules, defs, era})`; `this.era = opts.era \|\| 'ancient'`.

Frozen Ancient constants in `sim/stats.js` (verified to the last bit against the live computation by probe `scratchpad/p1.mjs`; hoplite `power` 45.32728207161775, cost 100):

```js
export const ANCIENT_K = 8.708228289932388;                       // 100 / rawCost(normalizeDef('hoplite', STAT_TABLE.hoplite))
export const ANCIENT_ROLE_EFF = { melee: 0.5715998600419703, ranged: 0.48880946582237034, cavalry: 0.5840434149728577,
  support: 0.18053418676968802, hero: 0.4755321641070623, siege: 0.3088334707651018 };   // monster, swarm, beast fall back to melee (as _eff[role] || _eff.melee does today)
```

`tests/arch/frozen_constants.test.mjs` recomputes both from `registry.statTable('ancient')` and asserts `===`; this is the only place the recomputation exists. Changing a constant is an AP re-record (two signatures); an Ancient balance edit is forbidden by non-negotiable 1 anyway.

#### 3.1.8 Era order

ERA_ORDER is `['ancient','medieval','modern','scifi']`, written once in `eras.config.js` and mirrored (generated) into `registry.eras.js`; LR8 and a registry self-check fail if the two differ. Order decides: idmap iteration order, `append` bases, plain-clip-slot registration (3.7.1), UI chip order. Reordering after the first release is forbidden (it would move append indices); `status` is the only field that changes over time.

#### 3.1.9 `buildContent({eras})` and the content object

`buildContent(o = {})` (path `src/content/content.js`; `era_ancient/content.js` re-exports it): `o.eras` defaults to `['ancient']` (legacy: the 6 existing call sites get today's object); `'released'` (main.js) and `'all'` (tests, tools) are accepted. It replaces `collect()` by `collectUnique(mods, name, eraId)` (throws on a duplicate id naming both modules), moves the inline `CREWS`/`RIDERS` tables into each pack (`def.model.crew`), takes `MUTATOR_STARS` from `shared/leaf/mutator_stars.js`, and returns every key of today's 18-key object plus `eras` (released only), `byEra[eraId]`, `eraOf(def)`, `campaigns`, `campaignApi` facade, `puzzleApi` facade, `survival`, `daily` (3.6). Hidden eras contribute nothing to `defs/factions/arenas/props/humor/mutators`. `counters` stays a lazy getter (cost: 5.6 ms at 43 defs, 24.6 ms at about 160; map 01).

#### 3.1.10 Loading in Node, in esbuild, in tests

- Node: all imports are relative with explicit `.js`; `registry.js` has no top-level browser access. Bare tests import `sim/*` and get a sealed registry. Suites that need logic import `tests/_eras.mjs`, whose first line imports `packs.js`.
- esbuild: one IIFE (CSP forbids splitting). Evaluation order is the import DFS; `main.js` imports `packs.js` before `content.js`/`game.js`. Eras are always in the bundle (hidden eras too, AR-D22/3.11).
- Equality check (AR-T04): the same `registry.fingerprint()` (sha256 over ordered `kind\0id\0era` triples) must be produced by (i) Node ESM load, (ii) Node ESM load under a window stub (`globalThis.window = new Proxy({}, {get(){throw ...}})`, same for `document`, `navigator`), (iii) an esbuild IIFE bundle of `tests/arch/entry_registry.js` run in `node:vm` with an empty global. A difference means an order or purity bug.

### 3.2 Ancient policy (AP) table and lint (plan 0.1, section 3, q3_engine residual 8)

#### 3.2.1 Mechanism

`tools/ap_lint.mjs` (TOOLS-GATE; gate step `ap`, tier T-fast) does, in this order:
1. Resolve the base: `git rev-parse ancient-v8` must equal `4aafd2e3fb83f20e1b19e0db8465c117032ba3b7` (the tag is local-only: pushes of tags fail through the sandbox proxy, `release/v8/PROVENANCE.md`); if the tag is missing it falls back to that sha, and fails if the sha is unreachable.
2. `git diff --name-status --no-renames ancient-v8 -- src tools assets package.json package-lock.json` plus untracked files (`git ls-files -o --exclude-standard` over the same paths). A rename is a delete plus an add: both paths need rows. Today the result is exactly one line, `M tools/build.mjs` (row AP-T01).
3. Every changed path must match at least one row of the table below (parsed from this file between the `AP-TABLE` markers: rows whose first cell starts with `AP-`; column 2 = comma-separated globs in backticks; dialect: `*` = any characters except `/`, `**` = any depth, `{a,b}` = brace expansion, `<id>` `<x>` `<era>` `<X>` = `*`; the row with the longest literal prefix wins, ties are broken by fewer `*` characters, a remaining tie fails as ambiguous). No row: FAIL `no AP row for <path>`.
4. Status rules by policy: `FZ` fails on ANY status (A, M, D); `NEW` allows only `A`; `GEN` and `TOOL` allow `A M D`; `OI` and `PX` allow `A M` and fail on `D`; a `D` on an OI/PX/FZ path needs a `DA-n` row. A `+DA-n` suffix in the policy cell means the DA row must have a signed log entry (rule 6).
5. Every `OI`/`PX` row must name at least one of G1..G12 or an AR test id; `NEW`/`GEN`/`TOOL` rows say `n/a`. Append-only JSON files are compared structurally against the base (`assets/manifest.json`: arrays `sfx music vfx` must keep the base entries unchanged and in order; `assets/anim/humanoid_clips.json`: object `clips` keeps every base key and value; new keys must not be in `DEFAULT_META` or any existing rig).
6. For each `DA-n` that has landed (its paths changed) `docs/eras/golden_log.md` must contain a heading `DA-n` with two signer lines, neither equal to the commit author recorded in the entry. Any change under `tests/golden/**` or `tests/baseline/**` needs a golden_log entry in the same range (plan section 3 "no re-record without two entries"); content roles are not signers.
7. Rows with no matching change are listed as `pending` (normal for `FZ` rows and for rows of plan items not yet landed); at `--release` the `OI`/`PX` rows that are still pending are printed in the release report as `not landed` and COORD signs that list (a pending row means the plan item did not land or its row is wrong); `cuts.md` ids may justify a row.
Negative controls (AR-T10): a new file in a new top-level directory (`src/foo/x.js`, no row), a new file under `src/content/era_ancient/` (FZ catch-all), a modified `FZ` file, a `D` on an OI path, an OI row without a golden, a DA change without a log entry, a mutated `assets/manifest.json` Ancient row, an ambiguous glob pair - each must turn the lint red with its own message.

#### 3.2.2 The table

Derivation: for each plan item the files named by the SEAMS of maps 01-08 and the grep of the Ancient literals (3.3.2) were listed, each path was checked to exist, and the table was dry-run against every tracked file in scope (70 rows, 824 files, 0 unmatched, 0 ambiguous at `4fe90f7`; `scratchpad/aplint_dry.mjs`). Columns: id, path globs, plan items, change summary, policy, golden or proof, owner. Goldens: G1 sim matrix, G2 arena hashes, G3 ids and def shape, G4 text hashes, G5 saves and costs, G6 campaign replay, G7 armygen/waves/daily, G8 render PNGs, G9 audio routing, G10 DOM, G11 clip data and power, G12 BattleView decisions.

<!-- AP-TABLE:BEGIN -->
| id | path globs | plan items | change | policy | golden / proof | owner |
|---|---|---|---|---|---|---|
| AP-S01 | `src/sim/defs.js` | M0, AR1 | registry import (3.1.7 row 1); `buildSimDefs(extra, opts)` era arg default ancient; `TOP_KEYS/SUB` appended keys (all undefined on Ancient) | OI | G1, G3 (defs shape), G7; AR-T06, AR-T08 | SIM |
| AP-S02 | `src/sim/stats.js` | AR1, AR9, M1 | frozen `ANCIENT_K`/`ANCIENT_ROLE_EFF`; `statsToUnitDef(cs,{era})`, `legalAbilities(style, era)`, `roleEfficiency(role, era)`, per-era `costFormula`; Ancient rows untouched, same objects | OI | G5 (200 customs), G11; AR-T07, AR-T27 | SIM |
| AP-S03 | `src/sim/unit.js`, `src/sim/consts.js` | M0, M3 | `DEFAULTS` import; new Unit fields; `N_SE` 20->24, `SE` appended (SUPPRESS 20, EMP 21, CLOAK 22, SHIELDDOWN 23) | OI | G1 (Ancient perf A/B includes the longer status loop) | SIM |
| AP-S04 | `src/sim/world.js` | M0, M10, M12, M14, M15, AR3 | imports (rows 4-5); `era` option and kit read once; `stateHashFull` (legacy `stateHash` byte-identical); forks; `Prop.team`, `info.gate`; `strike`, `markNavDirty`, `editTerrain`; mascot/intervention from kit; `addPlacements` keeps vip/general only when the placement sets them; all guarded by "def/prop/mission uses it" | OI | G1, G6 | SIM |
| AP-S05 | `src/sim/combat.js` | M1, M2, M8, M17e, AR2 | `RIG_BY_ID` read from the registry (same 6 entries); fire-weakness literal replaced by the role rule of 3.3; new damage types after the legacy branch; death/hit clip table only when a reaction row exists | OI | G1, G11 | SIM |
| AP-S06 | `src/sim/projectiles.js` | M2, M10, M12 | per-kind rows (`projkinds.js`) reproduce legacy numbers (stick 2.5 s unit, 4 s ground arrow/javelin/pilum, 3 s prop, bolt 1.0 s, life 6); `lead` default legacy; `structDmg`, lazy crater, private buffer only for new defs | OI | G1 (one battle per Ancient projectile kind and per `onAim/onFire` ability), G9 | SIM |
| AP-S07 | `src/sim/ai.js`, `src/sim/squads.js`, `src/sim/spatial.js`, `src/sim/formations.js`, `src/sim/possession.js`, `src/sim/objectives.js`, `src/sim/hazards.js` | M2b, M7, M8, M9, M11, M14 | branches only when new def fields are set; hazards: lava literal `m[i] === 7` replaced by `MATERIALS[m[i]].hazard === 'lava'` (index 7 stays lava); Ancient `protect_vip reachOnly` progress display NOT fixed (no DA) | OI | G1, G2, G6 | SIM |
| AP-S08 | `src/sim/armygen.js` | AR1, M2b | `opts.era` default ancient (pool and `counterTable` filtered); unknown faction throws; role rows appended; `defsOr` memo keyed `version\|era` | OI | G7 (12-wave dumps, 20 survival seeds, 400 daily dates), G1 | SIM |
| AP-S09 | `src/sim/waves.js`, `src/sim/lessons.js`, `src/sim/godpowers.js`, `src/sim/mutators.js`, `src/sim/warmup.js`, `src/sim/power.js` | M15, M1, AR2 | tables via registry/kit; god-power interpreter keeps the Ancient `rng.next()` order in the earthquake pulse; warm roster/arena from era data; `power()` extended behind `_nf` | OI | G1, G7, G11 (`power(def)` of the 43) | SIM |
| AP-S10 | `src/sim/abilities/summon_on_death.js`, `src/sim/abilities/index.js`, `src/sim/abilities/registry.js`, `src/sim/abilities/poison.js`, `src/sim/abilities/heal_pulse.js`, `src/sim/abilities/cc_field.js`, `src/sim/abilities/dash.js`, `src/sim/abilities/dot_cloud.js`, `src/sim/abilities/aura.js` | AR2, M6a, M6b, M13 | new params only on poison, heal_pulse, cc_field, dash, dot_cloud, aura (spec/M 3.16 row 28); `p.spawn` required (throws; the only Ancient user, `trojan_horse`, supplies it); import lines for new ability files; `reg(id, impl)` throws on a duplicate id (today it overwrites silently; the 27 shipped `reg(` calls are all distinct, verified) | OI | G1, AR-T09 | SIM |
| AP-S11 | `src/sim/abilities/**` | M5, M11, M13 | new ability files only (`cloak lay_mine call_strike` per spec/M D-M18) | NEW | n/a | SIM |
| AP-S12 | `src/sim/vocab.js`, `src/sim/schema.js`, `src/sim/rngforks.js`, `src/sim/hashfull.js`, `src/sim/kit.js`, `src/sim/armor.js`, `src/sim/projkinds.js`, `src/sim/ray.js`, `src/sim/suppress.js`, `src/sim/strikes.js`, `src/sim/script.js`, `src/sim/react.js`, `src/sim/shield.js`, `src/sim/cloak.js`, `src/sim/mines.js`, `src/sim/layers.js`, `src/sim/turret.js`, `src/sim/cover.js` | spec/M 3.1 | new modules | NEW | n/a | SIM |
| AP-S13 | `src/core/events.js` | M-events | new event ids appended, payload pools extended | OI | G1 (event stream), G9 | SIM |
| AP-S14 | `src/core/base64url.js`, `src/core/crc32.js`, `src/core/deflate.js`, `src/core/rng.js`, `src/core/tween.js`, `src/core/undo.js` | M0 | `RNG.fork` already exists and does not advance the parent (`rng.js:26`); no change planned | FZ | G1 | SIM |
| AP-W01 | `src/world/gen.js` | W1 | helpers move to `gencore.js`; Ancient recipes registered at import; `RECIPES` is the gencore array | PX | G2 (16 FNV hashes, byte-identical arenas) | WORLD |
| AP-W02 | `src/world/gencore.js` | W1 | new | NEW | n/a | WORLD |
| AP-W03 | `src/world/arena.js` | W3, W4 | `MATERIALS` appended from index 16 (0-15 untouched); `sanitizeEnv` whitelist gains `sky gravity era`; `WEATHERS` appended | OI | G2, G5 (arena JSON and share codes) | WORLD |
| AP-W04 | `src/world/nav.js` | M7 | move-class maps; ground path unchanged | OI | G1, G2 | WORLD |
| AP-A01 | `src/anim/boot.js`, `src/anim/dsl.js`, `src/anim/clips.js` | AR6 | `define()` records `spec.era` (default ancient); `bakeAll(filter)`; `registerAllClips(ClipLib,{humanoid, eras})`; `DEFAULT_META` rows APPENDED for new plain ids only | OI | G11 | ANIM-CLIPS |
| AP-A02 | `src/anim/animator.js`, `src/anim/gait.js`, `src/anim/kin.js` | RA | weapon `AIM` rows, `CREW_GUN`, `driven`, `aim`, `hover`, `plantRigidLeg`; Ancient branches unchanged | OI | G11 (pose samples), G8 | ANIM-CLIPS |
| AP-A03 | `src/anim/clips/eras.js`, `src/anim/clips/**` | RA | new rig/era clip files and the aggregator imported by `boot.js` | NEW | n/a | ANIM-RIGS |
| AP-A04 | `src/anim/clips/index.js`, `src/anim/clips/hum1_*.js`, `src/anim/clips/quad1.js`, `src/anim/clips/elephant1.js`, `src/anim/clips/siege.js`, `src/anim/clips/chicken1.js`, `src/anim/clips/poses.js`, `src/anim/ual.js`, `src/anim/ual_adopt.js`, `src/anim/analysis.js` | RA | shipped clip data and UAL adoption | FZ | G11 | ANIM-CLIPS |
| AP-V01 | `src/voxel/**` | R6, RA | new flag bits `F_PULSE F_GLASS F_HEAT`, per-part `thin` option; defaults unchanged | PX | G8, `tests/mesher.test.mjs` golden | RENDER |
| AP-R01 | `src/render/voxskin.js` | R6, R14, R15 | shader v2 (`aFx2`, `uTime`), new program key; per-part static bit and sin/cos cache; shared geometry arrays; `aFx2 = 0` path must equal v1 maths | PX | G8, G12 | RENDER |
| AP-R02 | `src/render/battleview.js` | R1, R9, R10, R11 | `PROJ_FX` (Ancient rows verbatim from `PROJ_VIS`), subscriptions, `fxClass`, cull sphere from `meta.bounds` only when the model declares it, triangle budget only when EVERY skin has bounds, else the frozen `nearBudget = 140` branch (`battleview.js:43,147`); R16 wiring | OI+DA-2 | G8, G12 | RENDER |
| AP-R03 | `src/render/engine.js` | R7, R8 | `THEME_LOOK`; Ancient themes map to today's literals | PX | G8 | RENDER |
| AP-R04 | `src/render/fx.js`, `src/render/labels.js`, `src/render/weather.js`, `src/render/markers.js`, `src/render/cameras.js`, `src/render/post.js`, `src/render/style.js`, `src/render/instancing.js`, `src/render/preview.js`, `src/render/tempanimator.js` | R2-R5, R12, R16, R17 | new layers behind data; marker merge (R12); camera follows `u.y` (0 for ground units); per-theme grade default identical; R16 in `fx.js`/`cameras.js` | PX+DA-2 | G8 (+ added case `campaign_markers`: missions 3 and 6 with hill/exit markers), G12 | RENDER |
| AP-R05 | `src/render/terrain.js`, `src/render/terrainMesh.js`, `src/render/props.js`, `src/render/minimap.js` | R12, W2, W3 | chunking, liquid kinds, emissive > 1; prop id lists replaced by `PROP_FLAGS` data (Ancient overlay identical) | PX | G8, G2 | RENDER |
| AP-U01 | `src/audio/cues.js` | AU4 | `AUDIO_PROFILES`, `PROJ_AUDIO`, `EXPLOSION_AUDIO`, `ABILITY_CUES` read from the registry; Ancient rows moved verbatim from `SPECIES_BY_ID` etc.; unmapped ability stays silent for Ancient | OI | G9 | AUDIO |
| AP-U02 | `src/audio/engine.js`, `src/audio/manifest.js`, `src/audio/sfx.js`, `src/audio/music.js`, `src/audio/synth.js`, `src/audio/index.js`, `src/audio/spatial.js`, `src/audio/voices.js`, `src/audio/speech.js`, `src/audio/unlock.js`, `src/audio/util.js` | AU2, AU3, AU6 | `engine.js:15` `STAT_TABLE` import removed (fallback only, `engine.js:474`); `era` ledger field (absent = all), sprite packs, `setEra`, `warm(groups, era)` | OI | G9 | AUDIO |
| AP-D01 | `src/save/docs.js`, `src/save/migrate.js`, `src/save/validate.js`, `src/save/transfer.js`, `src/save/stats.js`, `src/save/store.js`, `src/save/tombstones.js`, `src/save/share.js` | AR4, AR9 | 3.5: shape guards, id sets from the registry, `eraStats`, `goreAuto` migration and export transform, tombstone kinds, era-aware soldier validation; NO `CURRENT` bump | OI | G5 (both directions), AR-T13 | REGISTRY |
| AP-P01 | `src/app/main.js` | AR1, AR5, AR6 | `packs.js` first import; `buildContent({eras:'released'})`; facades; `ensureEra`; `window.__vw.registry` (dev) | PX | G10, G5 | INTEGRATION |
| AP-P02 | `src/app/game.js` | AR3, AR6, CU | `newSetup` era, `begin` safety `ensureEra` and era check, per-era default armies and diorama `SETS`, `scoutText` by era, `TYPE_CAP` text from the constant | PX | G10, G6 | INTEGRATION |
| AP-P03 | `src/app/meta.js` | CU3, CU5, CU18, AR5 | six Ancient imports (3.10.3) through the registry/content object; `recordCampaign` by registry; set-piece dispatcher; teaching data | PX | G10, G4, G6 (mission 1 flow) | INTEGRATION |
| AP-P04 | `src/app/modes.js`, `src/app/router.js`, `src/app/diagnostics.js`, `src/app/editorhost.js`, `src/app/input.js`, `src/app/loop.js`, `src/app/boot.js`, `src/app/debugui.js`, `src/app/nullaudio.js` | AR5 | `modes.js` uses `content.survival`; router `{id, params}` (3.6.3); diagnostics shows fingerprints | PX | G10; AR-T16 | INTEGRATION |
| AP-I01 | `src/ui/strings.js` | CU6, CU7, CU8 | roadmap string removed (`strings.js:38,313`); `typesFull` built from the cap constant (renders "16" unchanged); era overlays through `getT/getTB` | PX+DA-1 | G4, G10 | UI |
| AP-I02 | `src/ui/unitinfo.js` | CU14, M1 | `FACTION_ORDER` from the registry (Ancient 7 first); `ABILITY_INFO` from the glossary; display dps keeps Ancient numbers (PC1) | PX | G10 (Codex), G11 | UI |
| AP-I03 | `src/ui/screens/title.js` | CU6 | roadmap chip removed; era strip only when more than one era is released | PX+DA-1 | G10, G8 (title) | UI |
| AP-I04 | `src/ui/screens/**` | CU1-CU18 | all other screens: era params, chooser, chips, tabs, per-era map data; with `released = {ancient}` DOM equals v8 (AR-D09) | PX | G10 (4 release states), G8 (title, map) | UI |
| AP-I05 | `src/ui/hud/**` | CU5, CU12, CU13 | teaching data, god-power schema readers, Take Command, selection card; Ancient DOM unchanged | PX | G10 | UI |
| AP-I06 | `src/ui/mockctx.js`, `src/ui/kit.js`, `src/ui/icons.js`, `src/ui/keymap.js` | CU, tests | mock content takes `era`; new icons appended | PX | G10 | UI |
| AP-I07 | `src/ui/boot.css`, `src/ui/kit.css`, `src/ui/screens.css`, `src/ui/hud.css`, `src/ui/editors_arena.css`, `src/ui/editors_soldier.css` | CU6, CU17 | `[data-era]` token blocks appended; `.vw-title__roadmap` rule removed (`screens.css:53`) | PX+DA-1 | G8, G10 | UI |
| AP-E01 | `src/editors/arena/**`, `src/editors/arena.js` | W6 | merged catalog, era chips, `THEMES`, `PROP_TYPES` built from the registry; `LIMITS.propTypes` stays 41 per arena for Ancient content | PX | G10, G5, `tests/editors/arena/entry.test.mjs` | EDITORS |
| AP-E02 | `src/editors/soldier/**`, `src/editors/workshop.js` | AR9, CU10 | `listParts(cat, unlocked, {era})`, era chips, per-era palettes/metals views, foe list by era | PX | G10, G5 | EDITORS |
| AP-E03 | `src/editors/painter/**`, `src/editors/painter.js` | AR9 | palette/part views by era (default ancient) | PX | G10 | EDITORS |
| AP-C01 | `src/content/era_ancient/content.js` | AR1 | becomes `export { buildContent } from '../content.js'`; `buildContent()` with no args returns today's object | PX | G3, G7, G10 | INTEGRATION |
| AP-C02 | `src/content/era_ancient/manifest.js`, `src/content/era_ancient/data.js`, `src/content/era_ancient/pack.js` | AR1 | new, wrap existing modules | NEW | n/a | REGISTRY |
| AP-C03 | `src/content/era_ancient/blueprints.js`, `src/content/era_ancient/custom.js`, `src/content/era_ancient/fallback_model.js`, `src/content/era_ancient/campaign_validate.js`, `src/content/era_ancient/parts/_registry.js`, `src/content/era_ancient/parts/_kit.js`, `src/content/era_ancient/props/models/index.js`, `src/content/era_ancient/props/models/kit.js` | AR9, W2, CU4 | `randomBlueprint/listParts/defaultBlueprint` take `{era}` (default ancient filters entries without `meta.era`, registration order kept); `registerParts(set,{era})`; palettes/metals/emblems as era views; `customDef` calls `tagCustom`; `UNLOCK_MISSIONS`/`UNLOCKS` extensible; `fallbackHumanoid(def, factions)`; `validateMission(m,{era})`; `registerPropModels`; `finishModel` honours `spec.voxel` (default 0.1) | OI | G5 (200 customs, seeded random blueprints), G3, G8, G11, `tests/props/models.test.mjs` | REGISTRY |
| AP-C04 | `src/content/era_ancient/humor/announcer.js` | CU18 | `createAnnouncer({era, pool})`; default config reproduces today's pool and order | OI | G4 (announcer pool/order), `tools/humor-sim.mjs` | COMEDY-EDITOR |
| AP-C05 | `src/content/era_ancient/humor/ui_text.js` | CU6 | delete `ROADMAP_TAG` (line 79) only | PX+DA-1 | G4, G10 | UI |
| AP-C06 | `src/content/era_ancient/**` | frozen content | every other Ancient content file: `stats.js arenas.js campaign*.js puzzles*.js survival.js daily.js sim_text.js lesson_text.js wave_names.js props/catalog.js units/** beasts/** parts/** humor/** (except the two above) custom_text.js` | FZ | G1-G12 | COORD |
| AP-C07 | `src/content/registry.js`, `src/content/stat_helpers.js`, `src/content/packs.js`, `src/content/ensure_era.js`, `src/content/content.js`, `src/content/shared/**`, `src/content/meta/**`, `src/content/era_medieval/**`, `src/content/era_modern/**`, `src/content/era_scifi/**` | AR1, all eras | new | NEW | n/a | REGISTRY |
| AP-C08 | `src/content/eras.config.js` | D18 | new file; later `status` flips at an era release (only COORD) | PX | G10/G8 per release state (3.2.4); a flip without the matching log entry fails the lint | COORD |
| AP-N01 | `src/sim/**`, `src/world/**`, `src/render/**`, `src/audio/**`, `src/ui/**`, `src/editors/**`, `src/app/**`, `src/save/**`, `src/core/**` | all | catch-all for NEW files in an existing area (every existing file has a more specific row above); a new file needs no table amendment but must be owned (OWNER-TABLE) and tested | NEW | n/a | the area owner |
| AP-T08 | `tools/**` | all | any other tool or helper (new tools, `tools/lib/**` additions) | TOOL | n/a | TOOLS-GATE |
| AP-G01 | `src/_generated/*.js` | AR1 | regenerated files | GEN | `gen-registry.mjs --check` | REGISTRY |
| AP-T01 | `tools/build.mjs` | provenance, AR7 | `VW_BUILD_DATE` override (landed, commit d9f663a); `--out`, `--report`, size gates, `files.manifest.json`, hidden-era asset filter | TOOL | default `build.mjs --minify` with `VW_BUILD_DATE=2026-10-08` on the Ancient-only released state must keep every Ancient asset row, CSS and manifest identical (sha256 of CSS text and `__VW_MANIFEST__` Ancient rows) | TOOLS-GATE |
| AP-T02 | `tools/gen-registry.mjs` | AR1 | era discovery, `--check` | TOOL | AR-T32 | REGISTRY |
| AP-T03 | `tools/lint.mjs`, `tools/gate.mjs`, `tools/contracts.mjs` | AR1, AR8, section 3 | new rules LR1-LR8, lanes, per-era contracts | TOOL | negative fixtures AR-T05 | TOOLS-GATE |
| AP-T04 | `tools/balance.mjs`, `tools/perf_sim.mjs`, `tools/simperf.mjs`, `tools/perf.mjs`, `tools/ai_dev.mjs`, `tools/mixtest.mjs`, `tools/humor-sim.mjs`, `tools/lib/**` | AR8 | `--era`, `defsFor`, bands to `lib/bands.mjs`; Ancient output reproduces `docs/balance_data.json` numbers | TOOL | G7, ER7 Ancient section | TOOLS-VERIFY |
| AP-T05 | `tools/smoke.mjs`, `tools/tour.mjs`, `tools/flow.mjs`, `tools/modes.mjs`, `tools/look*.mjs`, `tools/shot*.mjs`, `tools/contact*.mjs`, `tools/tintcheck.mjs`, `tools/filmstrip.mjs`, `tools/props_sheet.mjs`, `tools/arena_sheet.mjs`, `tools/anim_page.js`, `tools/contact_*.js`, `tools/shot_*.js`, `tools/smoke_meta.mjs`, `tools/zoomshot.mjs`, `tools/fetch_kenney.sh` | AR8 | `--era`, chooser, params | TOOL | n/a | TOOLS-GATE |
| AP-T06 | `tools/*.py`, `tools/*.txt`, `tools/build_all.sh`, `tools/anim/**`, `tools/__pycache__/**` | AU1, AU2 | asset pipeline era/pack columns | TOOL | `verify_assets.py` | HUNTER |
| AP-T07 | `tools/ap_lint.mjs`, `tools/own_check.mjs`, `tools/hotfiles.mjs`, `tools/size_report.mjs`, `tools/provenance.mjs`, `tools/campaign_play.mjs`, `tools/uiscan.mjs`, `tools/negcontrols.mjs`, `tools/readability.mjs`, `tools/audit_sfx.mjs`, `tools/release_check.mjs`, `tools/plan_lint.mjs`, `tools/wbs.mjs`, `tools/perf_assert.mjs`, `tools/p0_exit.mjs`, `tools/spikes/**` | section 3, 9, 12 | new tools | NEW | n/a | TOOLS-GATE |
| AP-X01 | `assets/manifest.json` | AU2, AU3 | append rows only; Ancient rows byte-identical and WITHOUT an `era` key (absent = ancient/all); new rows carry `era` | OI | G9; append-only rule of 3.2.1 step 5 | AUDIO |
| AP-X02 | `assets/CREDITS.md` | AU7 | append-only sections per era | OI | G10 (Credits) | AUDIO |
| AP-X03 | `assets/audio/**`, `assets/vfx/**`, `assets/anim/**` | AU2 | new files only (packs, loops); existing files cannot change (a modified file is `M`, rejected by NEW) | NEW | n/a | HUNTER |
| AP-X04 | `assets/anim/humanoid_clips.json` | RA | new adopted clips with new ids only | OI | G11 | ANIM-CLIPS |
| AP-X05 | `assets/_music_build.json`, `assets/_sfx_build.json`, `assets/_vfx_build.json` | AU1 | pipeline ledgers regenerated by `build_all.sh` (not shipped; `build.mjs` reads only `manifest.json`) | GEN | n/a | HUNTER |
| AP-Z02 | `package-lock.json` | AGENTS.md | no npm installs: the lock file never changes | FZ | n/a | COORD |
| AP-Z01 | `package.json` | D17 release | version 1.0.0 -> 2.0.0 and description at the FINAL release only (feeds `__VW_VERSION__`, Diagnostics, About) | TOOL+DA-3 | G10 (About, Diagnostics) | COORD |
<!-- AP-TABLE:END -->

Reconciliation with spec/M 3.16: its 33 rows are the symbol/line-level projection of the sim rows here (AP-S01..S14); the AP lint works on paths and policy, spec/M owns the finer `change` and proof text of those paths. `plan_lint` asserts that every Ancient path named in spec/M 3.16 matches an AP row of policy OI or FZ and that spec/M declares no deliberate delta (it declares none: its rows 12 and 16 keep the latent aliasing bug and the `addPlacements` quirk for Ancient, which is why DA-6 stays conditional).

Note on ambiguity: `AP-A03` (`src/anim/clips/**`, NEW) and `AP-A04` (explicit FZ file names) never tie because explicit paths are more specific. `AP-C06` (`src/content/era_ancient/**`, FZ) is the catch-all; the explicit AP-C01..C05 paths are more specific. Rows AP-A03/AP-X03 are NEW-only: a modified or deleted existing file under those globs fails.

#### 3.2.3 Deliberate deltas (the complete list; everything else is bit-identical opt-in)

| id | what | why | visible to | goldens re-recorded (two signers, author excluded) |
|---|---|---|---|---|
| DA-1 | the title tablet "Roadmap: Medieval Era. Not in this build." is removed (`humor/ui_text.js:79`, `strings.js:38,313`, `title.js:61-64`, `screens.css:53`) | e.md 8 and CU6: no shipped string may contradict availability | every player, even with only Ancient released | G4 (UI strings), G10 (title), G8 (title PNG) |
| DA-2 | R16: Reduce Motion and the flash limiter are wired to battle effects (muzzle flash, orbital, EMP, rotors, shield flicker, scripted shots) - the settings were dead in battle in v8 | shipped-defect fix (plan section 6 R16) | only profiles with `reduceMotion` or `flashLimiter` on; default settings render identically | new baselines `G8-RM` (reduceMotion on) recorded AFTER the fix; the v8 behaviour is documented in the log entry |
| DA-3 | version/build strings at the final release (`package.json` 2.0.0, Diagnostics, About) | release identity | every player | G10 (About, Diagnostics) |
| DA-4 (conditional) | `TYPE_CAP` lowered by draw-call ladder rung (c): copy at `strings.js:111`, `ui_text.js:178`, `tips.js:24` changes from 16 | R12 ladder | every player | G4, G10; not planned |
| DA-5 (conditional) | the shared mutator "Moon Gravity" renamed in Ancient text (CU16) | only if spec/CU decides Ancient must change; default is an era-scoped display name via `getTB` with the Ancient string untouched (`mutators_text.js` is FZ) | every player | G4, G10; not planned |
| DA-6 (conditional) | any Ancient sim fix the user elects (escort `reachOnly` progress display for `protect_vip`; ballista bolts hurting walls) | q1_engine Q4 recommended opt-in for all; none elected | Ancient campaign | G1, G6 with a named full re-record; not planned |

#### 3.2.4 Release-state parity (R-PARITY, AR-D09)

`registry.releasedEras()` is the release state. The release-state matrix is `[ancient]`, `[ancient, medieval]`, `[ancient, medieval, modern]`, `[all]` (q3_program residual 7). Rules: with exactly `[ancient]`, (a) campaign opens the Ancient map directly (no chooser), Quick has no era chips, Survival/Daily/Puzzles/Codex/Achievements/Stats show Ancient only, title stars read `x/27`, no what's-new card; (b) the G10 DOM/control inventory and the G8 title/map PNGs equal the v8 baselines except DA-1; (c) no string, DOM node, audio row, asset file, daily/survival draw, share-code field or achievement total mentions a hidden era (hidden-era leak check, ER21b, run over all four states). G10 baselines are recorded per release state; the Ancient-only state is recorded from the baseline worktree FIRST. Flipping a `status` in `eras.config.js` re-runs G10/G8 for the new state under two signatures (the new state's baseline is created at that moment; the earlier states must still pass).

### 3.3 Id policy (AR2), utility units and the Ancient literals in `src/sim`

#### 3.3.1 Id table

Rule zero: Ancient ids never change (G3 ledger `tests/fixtures/shipped_ids.json`: 43 units, 7 factions, 16 arenas, 16 recipes, 41 props, 4 prop categories, 254 parts, 9 missions, 6 puzzles, 24 achievements, 9 mutators, 27 ability ids, 10 projectile kinds, 8 rigs, 374 sfx + 8 music ids, 6 god powers, 3 unlock keys). Duplicate detection: pack data by the registry throw (3.1.2); engine vocabularies by their own definition-site throw. Prefixes: `med_ mod_ sf_`; total length limits come from the narrowest consumer shown.

| kind | form (regex) | prefix | unique by | tombstone kind and resolution |
|---|---|---|---|---|
| era | `^[a-z][a-z0-9]{2,11}$`; the four ids | n/a | `eras.config.js` + LR8 | `era` -> `ancient` |
| unit | `^[a-z][a-z0-9_]{0,31}$` (blueprint rule); never `cs_*`; army `defId` <= 40 | none | registry idmap throw | `unit` -> `battle_goat` "Mystery Goat" (exists) |
| faction | `^[a-z][a-z0-9_]{0,23}$`; reserved `custom mixed neutral any meta all` | none | idmap | `faction` -> `mixed` |
| rig | `^[a-z][a-z0-9]*[0-9]$` (hum1, quad1 ...) | none | idmap; exactly ONE owner era; cross-era use only through `manifest.requires` | n/a (rigs are code) |
| arena preset = recipe id (`Game._arenaFor` presetId==recipe) | `^(med\|mod\|sf)_[a-z0-9_]{1,27}$`; Ancient 16 legacy | yes | idmap + gencore throw | `arena` -> the era's first arena |
| prop | `^(med\|mod\|sf)_[a-z0-9_]{1,27}$`; Ancient 41 legacy; generic nouns Ancient already owns are REUSED, never redefined (`tree_oak tree_pine tree_dead bush rock_small rock_big log crate barrel tent torch banner_post campfire fire_pit wall_stone ruin_wall tower gate_door arch_gate ship`) | yes | idmap | `prop` -> dropped from saved arenas with a toast |
| prop category | not in the Ancient 4 (`nature props architecture monuments`) | yes | list throw | n/a |
| part (per category, unique across ALL categories for new ones) | `^(med\|mod\|sf)_[a-z][a-z0-9_]*$`; reused Ancient generics: `spear short_spear javelin axe double_axe greataxe mace hammer club bow longbow composite_bow sling staff torch standard scepter buckler boulder round_shield quiver backpack banner_pole wings`; an era lists the Ancient parts it shows in `manifest.sharedParts` | yes | `registerParts` throw (exists, `_registry.js:54`) + idmap | `part` -> the category's default part (`none`/first) |
| mission | Ancient 9 legacy; new `med_m01..m09`, `mod_m01..m09`, `sf_m01..m09`; reward id = `<mission id>_reward` | yes | idmap | `mission` -> star entry ignored, mission list shrinks |
| puzzle | new `med_p01..p06` etc. | yes | idmap | n/a |
| achievement | `^(med\|mod\|sf)_[a-z0-9_]{1,40}$` (progress key `^[a-z0-9_]{1,48}$`); the 3 cross-era meta ones use prefix `meta_` and owner `meta` | yes | idmap | `achievement` (exists) |
| mutator (era-specific, 2 per era) | prefixed; the 9 shared are Ancient legacy | yes | idmap | `mutator` (exists) |
| god power | Ancient 6 legacy; new 18 prefixed | yes | idmap | n/a |
| set-piece | `<mission id>_sp` | yes | idmap | n/a |
| unlock key | prefixed (`med_silly_helms`); Ancient 3 legacy | yes | idmap | n/a |
| theme (`env.theme`, <= 16 chars through `sanitizeEnv`) | `med_` + <= 12 chars; Ancient spellings (`greek roman egyptian persian punic barbarian alpine mythic`, `egypt carthage`) become aliases of one vocabulary in the `THEMES` kind | yes | idmap with `aliases` | n/a |
| sfx / music / cue / ambience id | prefixed; reuse of an Ancient family is by id (Medieval reuses swords, shields, bows, horses) | yes | `assets/manifest.json` loader (`ids unique today`) + V09 | `cue` (exists) |
| material | index (Uint8) in the saved arena `m` array; ranges ancient 0-15, medieval 16-31, modern 32-47, scifi 48-63 | n/a | `append` kind with `base` | n/a |
| projectile kind, ability implementation id, damage type, kill cause, status, role, tag, event id, explosion kind | engine vocabularies of spec/M 3.3 | none | `sim/vocab.js` + definition-site throws | `projectile` -> the `arrow` look (render fallback only; kinds are code, so a tombstone is a documentation entry) |
| clip id | new plain ids must exist in no rig and not in `DEFAULT_META`; a new `hum1` id must not equal ANY existing plain id (it would overwrite the plain slot, `clips.js:108-115`) | none | `define()` throw on `id\|rig` + RA test | `clip` (exists) |
| custom soldier | `cs_` + hex | n/a | `registerCustom` refuses to overwrite an enumerable def | n/a |

Tombstone kinds after AR1: `unit prop achievement arena cue clip mutator` (exist, empty) + `part faction mission era projectile` (added in P1 before any id moves; `TOMBSTONES`, `KINDS` in `src/save/tombstones.js`). `tests/save/tombstones.test.mjs` (does not exist today although the header comment promises it) is created: no id both live and tombstoned, every `by` live, every kind present.

#### 3.3.2 The Ancient literals in `src/sim` (q3_engine residual 23; found by scanning unit/faction/arena/prop/mission/mutator ids as word tokens, comments excluded: 15 lines + 3 `throne` lines + the mutator definition site)

<!-- LIT-ALLOW:BEGIN -->
| file | site | ids | kind | disposition | expires |
|---|---|---|---|---|---|
| `src/sim/armygen.js` | `:27` `def.id === 'battle_goat'` (squad size 3) | battle_goat | unit | ALLOW utility unit | never |
| `src/sim/godpowers.js` | `:96` `addSquad('sacred_chicken', ...)` | sacred_chicken | unit | ALLOW utility unit (M15 may turn it into a GodPower effect param `unit` whose Ancient default is this id) | never |
| `src/sim/mutators.js` | `:47` `addUnit('sacred_chicken', ...)` | sacred_chicken | unit | ALLOW utility unit | never |
| `src/sim/world.js` | `:871` `addUnit('battle_goat', ...)` (VIP goat) | battle_goat | unit | ALLOW utility unit; `kit.mascot` default | never |
| `src/sim/world.js` | `:865` `e.kind = 'zeus'` | zeus | intervention kind | REPLACE by `kit.intervention.kind` (Ancient kit value `zeus`) | M15 step 1 |
| `src/sim/godpowers.js` | `:40` `'zeus_lightning' ? 'zeus' : power` | zeus_lightning, zeus | power id, telegraph kind | REPLACE by the GodPower schema field `telegraph.kind` | M15 step 2 |
| `src/sim/abilities/summon_on_death.js` | `:17` `p.spawn \|\| 'hoplite'` | hoplite | unit | REPLACE: `p.spawn` required, throws `summon_on_death needs spawn`; the only Ancient user (`trojan_horse`) supplies `spawn:'hoplite'` | M0 |
| `src/sim/combat.js` | `:125` `dst.def.id === 'trojan_horse' ? 1.6 : 1.8` | trojan_horse | unit | REPLACE by the rule `def.fireMul ?? (role siege ? 1.6 : 1.8)`; Ancient has exactly two `fire_weak` defs (`trojan_horse` siege -> 1.6, `mummy` undead -> 2): a test enumerates `fire_weak` and asserts both multipliers and that there is no third | M1 |
| `src/sim/combat.js` | `:46` `RIG_BY_ID = { war_elephant, sacred_chicken, catapult, ballista, trojan_horse, chariot_archer }` | those 6 | unit | REPLACE: the same 6 rows become Ancient `data.js RIG_BY_ID`; `defRig` reads `registry.get('rig_by_id', id)`; new defs declare `model.rig` (V05) | M0 |
| `src/sim/stats.js` | `:69` `STAT_TABLE.hoplite` | hoplite | unit | REPLACE by `ANCIENT_K` (3.1.7) | M0 |
| `src/sim/warmup.js` | `:16-19` `ROSTER` (about 70 ids in 3 arrays) and `:33` `'marathon'` | many | unit, arena | REPLACE by era data `WARM {roster, arena}`; Ancient `WARM` = today's arrays verbatim; new eras' rosters are generated by `tools/gen_warm.mjs` (spec/M D-M25) | M0 |
| `src/sim/abilities/throne.js` | `:17` `spawnProp('throne', ...)` (prop type), `:29` `reg('throne', ...)` and `src/sim/world.js:261` `a.id === 'throne'` (ability id, engine vocabulary) | throne | prop, ability | ALLOW: the `throne` ability owns its prop type; new eras use another ability | never |
| `src/sim/mutators.js` | `:8-16` | the 9 shared mutator ids | mutator | ALLOW: definition site of the shared mutators | never |
<!-- LIT-ALLOW:END -->

Utility units: exactly `battle_goat` and `sacred_chicken` (global, shipped by every build, referenced by `MYSTERY_GOAT`); `registry.UTILITY_UNITS` lists them, `defsFor(era)` always includes them, and `tests/arch/utility_units.test.mjs` asserts the list equals the four ALLOW unit rows above. World therefore never throws on a missing goat whatever the era. Lint LR7: build the Ancient id list from the G3 ledger kinds `unit faction arena prop mission puzzle mutator achievement`, scan `src/sim/**` code (comments stripped) for each as a word token; the multiset of hits must equal the LIT-ALLOW rows (file, line within +-3 lines of the stated line, id); an unexpected hit and a missing hit both fail. Stage 2 (after the data-in-pack moves land): ratchet counts for `src/world src/render src/audio` in `tests/baseline/ancient_literals.json` (render: `props.js` id lists and `PROJ_VIS` keys; audio: `SPECIES_BY_ID`, `CC_BY_SPECIES`, theme tables) that may only decrease.

### 3.4 Era precedence (AR3)

Rule: `World.era` is the only kit selector. It is explicit, set at construction (`new World({arena, seed, rules, defs, era})`, default `'ancient'`), read once (kit, barks, lessons, waves, weather mods, gravity, pacing are bound there) and never derived from the arena or the armies. `arena.env.era` (new whitelisted env key, W4) selects visuals and audio only (`THEME_LOOK`, music, ambience). The sim tolerates any mismatch (no throw; the World's kit applies); the app layer prevents mismatches: `Game.newSetup/begin` raise `EraMismatch` (toast text in spec/CU) when an army contains a non-utility, non-custom def whose `registry.eraOf(def)` differs from `setup.era`. A custom soldier takes the era of its main weapon part; its army record is allowed in a battle of that era only. Cross-era battles (Time Warp) are out (D19): the check is the guard.

| entry point (file) | era source | check | note |
|---|---|---|---|
| Quick Battle (`ui/screens/quick.js` -> `Game.newSetup('quick',{era})`) | era chip, remembered in `progress.lastEra` | factions and arenas offered are era-pure | default chip = `lastEra` |
| Campaign mission (`briefing.js` -> `newSetup('campaign',{mission, era: registry.eraOf(mission)})`) | the mission's owner | n/a (impossible) | |
| Puzzle (`puzzles.js`) | `registry.eraOf(puzzle)` | n/a | |
| Survival (`survival.js`) | tile or chip | `'mixed'` pool = that era (`generateArmy({faction:'mixed', era})`) | `WaveSystem({era})` |
| Daily (`daily.js`, `_daily_plan.js`) | `dailyPlan.era` | n/a | 3.6.2 |
| Arena Builder test fight (`editors/arena/controller.js`) | builder era chip, default `arena.env.era`, else `lastEra` | armies filtered to the chip's era | `env.era` stays visual |
| Workshop test fight / duel (`editors/soldier/*`) | `eraOfBlueprint(cs)` (main weapon part) | foe list = that era | |
| Army import / share code (`save/transfer.js`, `save/validate.js`) | none | unit ids resolve against `content.defs` (released eras); a unit of a hidden era is "unknown unit ... newer game version"; a released unit of another era than the Quick chip gives `This army uses units from the <Era> era. Switch Quick Battle to <Era> to use it.` | PRODUCT-Q26 |
| Arena import | `env.era` read for the look only | none | v8 drops `env.era`: opens with the Ancient look |
| Title diorama (`game.js` `SETS` ~646) | each tuple is `[arena, factionA, factionB, seed, era]`, released eras only | n/a | `ensureEra(era)` before `begin(...,{diorama:true})` |
| Tools and tests (`buildWorld`, `balance --era`, `campaign_play`) | explicit argument | n/a | `tests/_eras.mjs buildWorld({era})` |

Tests (AR-T12): (1) a world built with `era:'modern'` on an Ancient-env arena and an Ancient army runs without throwing and reads the Modern kit (barks table identity, wave table identity); (2) the same battle with `era` omitted equals the v8 `stateHash` (G1); (3) `Game.begin` with a mixed-era army throws `EraMismatch`; (4) `arena.env.era` alone never changes `World.era` (assert on a Sci-Fi arena with `era` omitted); (5) hidden eras: `newSetup({era:'medieval'})` while hidden throws `UNKNOWN_ERA`. Negative control: derive `World.era` from the arena in `new World` -> check (4) red.

### 3.5 Save (AR4)

#### 3.5.1 Facts verified in code (they decide the design)

- `Doc._load` keeps unknown keys (`sanitize` strips only functions/`__proto__`/non-finite numbers); `validateProgress/Survival/Daily` touch only known keys; `seen` has NO validator (flat `{id: true\|ms}` today); `replaceAll` fills missing defaults. So additive keys inside `progress survival daily seen` survive a v8 load and re-save.
- A document whose version is NEWER than `CURRENT` turns read-only in v8 (`docs.js` `r.future`), and `transfer.js stage` rejects it ("saved by a newer version"). Therefore this program NEVER bumps `CURRENT = {progress:2, survival:2, daily:2, seen:2, stats:1}`, `SAVE_FORMAT = 1`, `EXPORT_KEYS` (9 keys) or the share-code format (`VW1.*`).
- `normalizeStats` (`stats.js:30-52`) whitelists `NUM_KEYS`, four maps and `campaign:{stars, completed}`; everything else is dropped on every load/import (v8 included). `byDef`/`arenasPlayed`/`stars` ids must match `^[a-z0-9_:\-]{1,48}$`.
- v8 `validateSettingsData` (`transfer.js:51-71`) THROWS `Setting 'gore' has an unknown value '<v>'` for a `gore` outside `red wine confetti off`, keeps unknown plain scalar keys (boolean, finite number, string <= 80 chars) and drops unknown object keys with a warning. v8 `Settings` itself (live) merges any stored keys without validation.
- `sanitizeEnv` (arena.js) drops unknown env keys; `validateArmy` rejects unknown `defId` with "may come from a newer game version".

#### 3.5.2 New keys

| key | doc | shape | validator (file) | written by | v8 behaviour on a new-build save |
|---|---|---|---|---|---|
| `progress.eras` | progress | `{[eraId]: {opened:bool, last:missionId or '', cleared:bool}}`, <= 8 eras, era key `^[a-z][a-z0-9]{2,11}$` | `validateProgress` (+4 lines, `docs.js:188`) | `meta.recordMission`, chooser | preserved |
| `progress.lastEra` | progress | era id or absent | same | chooser, Quick chip, mission end | preserved |
| `progress.stars` (existing flat map) | progress | new mission/puzzle ids with prefixes; values 0..3 | unchanged | `recordCampaign` | preserved; v8 shows only its own 9+6 |
| `progress.titles` (existing, today never written) | progress | `string[]` written on first clear (`rw.title`) | unchanged | `recordMission` | preserved |
| `survival.eras` | survival | `{[era != ancient]: {best, bestWave, board:[<=5]}}`; root stays Ancient (`survivalBest` alias and title tile keep working) | `validateSurvival` | `recordRun(era)` | preserved |
| daily `history[].era` | daily | string, absent = ancient | `validateDaily` keeps `isObj` rows | `recordDailyRun` | preserved; the streak is one streak (rows keyed by date) |
| `stats.campaign.completedEras` | stats | sorted `string[]`, DERIVED cache of "every mission of the era has >= 1 star" | `normalizeStats` whitelist (+1 line) and `LifetimeStats.reconcile(registry, progress)` on load | stats | DROPPED by v8; recomputed from `progress.stars` on the next new-build load (test asserts equality after a round trip) |
| `stats.eraStats` | stats | `{[era]: {[key]: n}}`, key `^[a-z][a-zA-Z0-9]{0,31}$`, <= 64 keys per era, finite n >= 0 | `normalizeStats` (+8 lines) | `HANDLERS` for era counters (shield breaks, mines ...) | DROPPED by v8: the one documented loss of a rollback (era counters feeding not-yet-awarded counter achievements restart; awarded achievements live in `progress.achievements` and survive) |
| `seen.basics` | seen | `true` or ms; derived on first load from `seen.teaching \|\| settings.seenHints.teaching` | none (seen has no validator; an `isObj`/size guard is added to the Doc `seen` options: <= 1000 keys) | teaching (CU5) | preserved |
| `seen.beats` | seen | `{[beatId]: true\|ms}`, <= 200 keys | same | teaching | preserved |
| `seen.whatsnew` | seen | `{[era]: ms}` per released era, replaces the never-written `seen.whatsnew_v2` | same | what's-new card | preserved |
| `seen.callbacks` | seen | `{[sourceId]: true}`, <= 400 keys; ledger columns (id, source id, target id, kind setup-free or gated, era pair, surface, text, flag key) are spec/H's | same | callback ledger (q3_product residual 14) | preserved |
| settings `goreAuto` (bool, default true), `goreChosen` (bool, default false) | settings | see 3.5.3 | `validateSettingsData` (unknown scalar keys are kept in v8: OK) | `Settings.set` | kept |
| settings `eraQuality` | settings | `{[era]: quality enum}` (CU9 "era quality override") | `validateSettingsData` (+object case) | Settings screen | live: kept; v8 IMPORT drops it with a warning (benign) |

New-era unlocks: `progress.unlocks`/`progress.parts` stay flat arrays (prefixed keys). Mutator unlock thresholds stay `MUTATOR_STARS` 3..27 over the GLOBAL star count (any 27 stars unlock all nine shared mutators; confirmed: `campaign.js:17` equals `content.js:22`, one export in `shared/leaf/mutator_stars.js`, test asserts the triple equality). The 2 era mutators unlock by mission reward.

#### 3.5.3 Gore (CU4) - storage encoding amendment

`settings.gore` ALWAYS holds a legacy enum value (`red wine confetti off`); "Auto" is `goreAuto === true` and resolves per era through `resolveGore(settings, era, unitClass)` (one function, spec/CU CU4 lists the 13 consumers `store.js:66, transfer.js ENUMS, game.js:63/95/132/650, main.js:129, modes.js KEEP, quick.js:40/159, settings.js:46, battleview.js:40/275/333, fx.js:67`). Migration is a pure function `migrateSettings(raw)` run in the `Settings` constructor and in `validateSettingsData` output: `if (raw.goreChosen === undefined) { if (raw.gore && raw.gore !== 'red') { goreAuto = false; goreChosen = true; } else { goreAuto = true; goreChosen = false; } }` (a stored `'red'` without marker cannot be told from the default, so it becomes Auto; Red in Ancient and Medieval, so the Ancient look is unchanged). `Settings.set('gore', v)` writes `goreAuto=false, goreChosen=true`; `Settings.set('goreAuto', b)` writes `goreChosen=true`. Exports write `gore` as stored (legacy enum) plus the two booleans, so a v8 import accepts the code (unknown scalar booleans are kept). Tests: v8 export with gore `'wine'` loads as `goreAuto=false`; fresh profile `goreAuto=true`; new export imported by the baseline build is accepted; the baseline's own gore value survives a round trip (AR-T15). Consequence for spec/CU: the visible "Auto" option is a control over `goreAuto`, not a 5th enum value (PC8, open item OI-2).

#### 3.5.4 Both-direction compatibility tests (G5 content; fixtures from the baseline build)

| test | what | pass condition |
|---|---|---|
| `save_v8_to_new` | `tests/save/fixtures/ancient_release_v8.mjs` (a real v8 profile produced by driving `.cache/baseline/ancient-v8` in Chromium: progress with stars/puzzles/unlocks, survival, daily with streak, seen, stats, settings, 3 customs, 3 arenas, 2 armies) loaded and flushed by the new build | every v8 key deep-equal; added keys only the ones of 3.5.2 (`goreAuto`, `goreChosen`); custom soldier costs equal (200 random customs from G5) |
| `save_new_to_v8` | drive the new build (all four eras released) to a state with every key of 3.5.2 set; export; import into the baseline worktree's `createTransfer` and load via its `createDocs` | import ok; all v8-known keys equal; new keys survive except exactly `stats.campaign.completedEras`, `stats.eraStats` and the import of `settings.eraQuality`; the baseline then flushes and re-exports without error |
| `save_roundtrip` | new -> v8 flush -> new | survivors equal; `completedEras` recomputed equal; `eraStats` empty (documented) |
| `save_codes` | v8 `VW1.army`, `VW1.arena`, `VW1.soldier` fixtures import in the new build; new-era army code in v8 is rejected with the exact `Unknown unit` message and no crash; arena code with `env.era` opens in v8 with the Ancient look | exact messages |
| `save_v1_chain` | existing `tests/save/fixtures/v1_blobs.mjs` migrate chain | unchanged |
| `save_ids` | G3 ledger: every Ancient id still owned by `ancient` | exact |
| `save_hidden` | states `[ancient]` vs `[all]`: no hidden-era key is written by any code path with `[ancient]` released (`progress.eras` has only `ancient`) | exact |

#### 3.5.5 Migration steps (all pure, idempotent, none bumps a version; run at load by the owner named)

1. `Settings` constructor and `validateSettingsData` output: `migrateSettings(raw)` (3.5.3) - REGISTRY (`store.js`, `transfer.js`).
2. `Doc('progress')` load: if `lastEra` is absent set it to the era with the most stars (a v8 profile has stars only in Ancient, so `ancient`); if `eras` is absent create `{ancient:{opened:true, last:'', cleared:<all 9 missions >= 1 star>}}` - REGISTRY (`docs.js` `validateProgress`).
3. `Doc('seen')` load: `basics` = `true` if `seen.teaching` or `settings.seenHints.teaching` is set (so a returning Ancient skipper never sees the basics layer again, CU5) - REGISTRY.
4. `LifetimeStats.load`: `reconcile(registry, progress)` rebuilds `campaign.completedEras` and `campaignStars` from `progress.stars` - REGISTRY (`stats.js`).
5. Nothing is written to `survival.eras`, daily rows or `seen.whatsnew` until the player uses them. Export keys stay the nine of `EXPORT_KEYS`; the share-code framing stays `VW1.<type>.<payload>.<crc32>`; `MAX_CODE` 38,000 and `MAX_SAVE_CODE` 6,000,000 unchanged.

Hosted honesty: a staging artifact has another origin and an empty save, so the upgrade of a real v8 save is proven only by these local tests and the user checklist item "open the link on the device that has the v8 save" (plan section 9).

### 3.6 Campaign, puzzle, survival, daily factories and the facade (AR5)

#### 3.6.1 Factories (`src/content/shared/*_factory.js`, owner REGISTRY; Ancient is wrapped, not rebuilt: AR-D13)

```js
createCampaign(cfg) -> Campaign
  cfg = { era, raw: MS[],                              // machine-readable missions (spec/MS: full Ancient schema + setpiece, teaches, tests, starTests[{id,helper,args}], rewardId, requiresModules, attempts); generated JS from design/<era>/missions.json
          text: { acts:{1,2,3:{title,blurb}}, byId:{[id]:{title,blurb,briefing[],victory,defeat,stars[3],reward{title,blurb}}}, order:[ids], teachingBeats, teachingSkip, rewardParts },
          statTable: registry.statTable(era),          // the cost source: replaces the Ancient STAT_TABLE import of campaign.js:27-30 and puzzles.js:15 (a Medieval unit costs 0 there today, which breaks star 2 and heroesAlive)
          helpers, mutatorStars, validate: {unlocks, recipes, objectiveTypes, markerTypes, acts} }   // validateMission(m, {era}) options, default = Ancient (existing negative controls stay green)
  Campaign = { era, acts:[{id,title,blurb,missions:[ids]}], missions, order, byId, text, api }
  api  = { missions, missionById, nextMission(progress), nextAfter(mission), isUnlocked(mission, progress), starsFor, evaluateStars, rewardsFor,
           unlockedMutators(totalStars), newlyUnlocked(before, after), arena, rules, setup, forces, objective, marker, summaryOf, reference, teachingBeats, teachingSkip, hash }   // same names as era_ancient campaignApi, plus nextAfter
createPuzzles({era, raw, text, statTable, solutions}) -> { era, puzzles, byId, api:{puzzles, puzzleById, evaluate, asMission, text, cost} }   // solutions regenerated per era: solve_puzzles.mjs --era=<id> --write
createSurvival({era, config, waves:{names,bossNames,bossCycle}}) -> namespace with the Ancient names: SURVIVAL BOSS_IDS survivalWave(n, seed, o) waveTable playerPotential survivalScore recordRun survivalRules(rules, o) placementBudget; enemy pool = generateArmy({faction:'mixed', era})
createDaily({era}) -> namespace with the Ancient names (dailyPlan(key), dailySetup, dailyEnemy, resultString, streakOf, dailyStars, recordDailyRun, STYLES, DAILY_BUDGET, key helpers): binds the era's {arenas, factions, mutators} lists to the existing Ancient functions, which already take a `content` argument
```

Ancient: `era_ancient/pack.js` builds `Campaign` from the existing singletons (`missions = MISSIONS`, `api = campaignApi`, `order = MISSION_ORDER`) with object identity preserved (test: `content.campaigns.ancient.missions === MISSIONS`). The Ancient files stay FZ. `nextAfter(mission)` for Ancient = `MISSIONS[mission.index + 1] \|\| null` (fixes `meta.js:556,566`, which indexes a merged list).

#### 3.6.2 Facade on the content object

```js
content.eras            // released descriptors: {id,name,short,order,accent,currency,factions[],arenaIds[],missionIds[],puzzleIds[],acts[],status:'released'}  (hidden eras absent)
content.campaigns       // {[era]: Campaign}
content.currentEra / content.setEra(era)         // the era the UI is looking at (chooser, Quick chip); persisted by the caller to progress.lastEra
content.campaign        // legacy shape {acts, missions, puzzles, order, api} of the CURRENT era (screens that read ctx.content.campaign.missions keep working: campaign.js:23, title.js:23, results.js:37, hud/_mutpicker.js:18, briefing.js:82)
content.campaignApi     // facade: every method of `api`; mission-taking methods dispatch by id to the owner era's api; methods without a mission take a trailing era (default currentEra): nextMission(progress, era), totalStars(progress, era?) (no era = global); unknown or hidden id -> null / false, never a throw, and modes.js refuses to start (3.6.4)
content.puzzles / content.puzzleApi              // current-era list (legacy) / facade: puzzleById (global), asMission, evaluate, text, cost, puzzlesOf(era)
content.survival / content.daily                 // facades: legacy function names accept `o.era` (default currentEra); `.forEra(era)` returns the era namespace
```

Daily (verified algorithm, `daily.js:46-60`: mulberry32 draw ORDER arena index, factionA, factionB (+reroll), style, twist coin, twist index): the era is drawn FIRST from a separate stream `rng(seedOf(key) ^ 0xE4A)` among the eras allowed by the mode ("my era only": `lastEra`; "all eras": released eras in order), then the existing algorithm runs unchanged over that era's `{arenas, factions, mutators}`. With era `ancient` the plan of every date is byte-identical to v8 (G7: 400 dates). One streak and one history (rows carry `era`). `_daily_plan.js` (UI copy of the algorithm, 7-id fallback) becomes a re-export of the factory output; the parity test over 400 dates stays and adds 400 dates x 3 eras.

#### 3.6.3 Router (q3_product residual 11, `router.js:37,56`)

`_mount` returns `{id, el, inst, meta, params}`; `base` keeps `params`; `history` entries become `{id, params}`; `goto(id, params, o)` pushes `{id: prev.id, params: prev.params}` under the same conditions (`prev.id !== id`, not `noHistory`, not TRANSIENT = battle/splash); history cap 20 unchanged; `back()` pops until `entry.id !== current` and calls `goto(entry.id, entry.params, {noHistory:true})`; new `router.currentParams()`. Params must be small plain objects (shallow-copied on push). Tests (AR-T16): campaign map `{era:'modern'}` -> quick -> Back lands on the Modern map; from a briefing overlay and from results the Back target keeps the era in each of the three screens; TRANSIENT and cap behaviour unchanged (the existing assertions of `tests/ui/*` stay green). Negative control: push `prev.id` only -> params test red.

#### 3.6.4 Failure behaviour (no silent fallbacks)

`modes.js resolveMode`: an unknown or hidden mission/puzzle id returns `{error:'unknown_mission', id}`; `Game.begin` shows the toast and returns to the chooser (today it logs a warning and plays a plain battle, which would fail the console-clean gate and hides content bugs). `meta.recordCampaign` (`meta.js:620`): the early `if (MISSION_ORDER.indexOf(id) < 0) return []`, which today silently drops the stars of every non-Ancient mission, is replaced by `registry.owner('mission', id)`, and the stars are written BEFORE any side effect; a mission unknown to the registry throws in tests and logs `diag.error('save','unknown mission')` in production, so stars are never dropped silently (map 06 R5).

#### 3.6.5 The 30 seams of map 01 and the 30 of map 06 - disposition

Map 01 (content layer): D = designed here (section), O = owned by another spec or role named, X = done by the Ancient pack wrapper (no Ancient edit).

| seam | disposition |
|---|---|
| 1 `defs.js:2,42-43` | D 3.1.7 row 1; `buildSimDefs(extra, opts)`, no `era` key (PC3) |
| 2 `stats.js:69,78` K/roleEfficiency | D 3.1.7 frozen constants |
| 3 `unit.js:3` DEFAULTS | D 3.1.7 row 3 |
| 4 `world.js` propInfo, SIM_BARKS | D 3.1.7 rows 4-5; barks by `World.era` (not by def era) |
| 5 `lessons.js:5` | D row 6; detectors O spec/M |
| 6 `waves.js` | D row 7; `WaveSystem({era})` O spec/M |
| 7 `armygen` mixed/pool/unknown faction | D AR-D02 + AP-S08; mechanics O spec/M M0 |
| 8 Ancient ids in sim | D 3.3.2 |
| 9 `gen.js` recipes | D 3.1.6; split O spec/W W1 |
| 10 `props/models/index.js` | D `registerPropModels(eraId, mod)` in packs.js, throws on duplicate type; voxel size O spec/W |
| 11 editors `PROP_TYPES`, `PLACEABLE`, `LIMITS.propTypes` | O spec/W W6 + EDITORS; AP-E01 |
| 12 `content.js collect()` | D 3.1.9 `collectUnique` |
| 13 `gen-registry.mjs` | D 3.1.1 |
| 14 `main.js` single-instance modules | D 3.6.2 |
| 15 `meta.js` Ancient imports | D 3.10.3 list; O spec/CU CU18 for the announcer |
| 16 `announcer.js` STAT_TABLE/HEROES | O spec/H + CU18; AP-C04 |
| 17 `units_text.js` module-local map | D kind `unit_text`; Ancient file FZ, `unitText` helpers are re-implemented over `registry.table('unit_text')` in `shared/` (O spec/H for fields) |
| 18 `save/stats.js`, `migrate.js` closed id lists | D 3.5.2 / AP-D01: ids from `registry.ids('mission')`, `ids('arena_stat')` |
| 19 `NUM_KEYS` drops unknown | D `eraStats` + `completedEras` (3.5.2) |
| 20 unlock key space | D `UNLOCKS` kind, prefixed keys; `UNLOCK_MISSIONS` extensible (AP-C03) |
| 21 metals/emblems/palettes computed once | D `append` kind + era views; `randomBlueprint` era filter (PC5) |
| 22 `registerParts`/`listParts` era | D 3.9, AP-C03 |
| 23 `WEAPON_CLASSES` etc. | D 3.9 |
| 24 UI literals (`FACTION_ORDER`, `ABILITY_INFO`, `FACTION_IDS`, defaults) | D 3.10.3 policy per file; O spec/CU |
| 25 audio/FX keyed by Ancient ids | O spec/AU, spec/RA (data-in-pack rows `AUDIO_PROFILES PROJ_AUDIO PROJ_FX`); V07 here |
| 26 `ROADMAP_TAG`, currency word | D DA-1; currency `fmtCost` O spec/CU CU7 |
| 27 `fallback_model.js` | D AP-C03 (`fallbackHumanoid(def, factions)`) |
| 28 `daily.js` era | D 3.6.2 |
| 29 tools contracts/balance | D 3.8 |
| 30 campaign engine inside the Ancient folder | D `shared/ancient_g.js` shims (3.1.1); no move |

Map 06 (campaign, meta, UI, save):

| seam | disposition |
|---|---|
| 1 `campaign.js` singletons | D 3.6.1 `createCampaign`; Ancient wrapped |
| 2 `costOf` Ancient STAT_TABLE | D `cfg.statTable`; `battleSummary` takes costs from `world.defs` for new eras (O spec/MS) |
| 3 `objectiveText` | O spec/MS (`objective.text` authored) |
| 4 duplicate `MUTATOR_STARS` | D `shared/leaf/mutator_stars.js` + equality test |
| 5 per-era `campaign_text` | D `cfg.text`; `MISSION_ORDER` consumers via `api`/`order` |
| 6 `MissionRuntime` script keys | O spec/M M14 + spec/CU CU3 |
| 7 `missionArena`/recipes | D 3.1.6 |
| 8 `validateMission` signature | D `validate:{...}` option, default Ancient (AP-C03) |
| 9 puzzles factory | D 3.6.1 |
| 10 survival | D 3.6.1; `WaveSystem({era})` O spec/M |
| 11 daily | D 3.6.2 |
| 12 `gen-registry` OPTIONAL map | D 3.1.1; Ancient entries kept |
| 13 `resolveMode` totality | D 3.6.4 |
| 14 `game.js` scout, defaults, `SETS` | D AP-P02 + 3.4 table; scout packs O spec/CU CU14 |
| 15 `recordCampaign` and `nextAfter` | D 3.6.1, 3.6.4 |
| 16 router params | D 3.6.3 |
| 17 `PROGRESS_DEFAULTS` shape | D 3.5.2 (no version bump) |
| 18 `migrate.js` v3 | D rejected: no bump (3.5.1) |
| 19 `stats.js` id sets | D 3.5.2 |
| 20 achievements per era | O spec/CU CU9; ids D 3.3.1, meta pack AR-D23 |
| 21 `EXPORT_KEYS` | D unchanged (3.5.1) |
| 22 `custom.js UNLOCK_MISSIONS` | D `UNLOCKS` kind (AP-C03) |
| 23 `title.js` star badge | O spec/CU CU6 (denominator over released eras: `x/27 .. x/108`); DA-1 here |
| 24 chrome strings | O spec/CU CU17 via `getT/getTB`; R-PARITY D 3.2.4 |
| 25 `campaign.js` screen constants | O spec/CU (`ERA_MAPS`) |
| 26 `_map.js` | O spec/CU CU6 |
| 27 briefing/results/puzzles fallbacks | O spec/CU; era default from `content.eras[era].factions[0]` |
| 28 survival/quick UI | O spec/CU CU10 |
| 29 codex/placement faction tabs | O spec/CU; `FACTION_ORDER` from the registry (AP-I02) |
| 30 `tools/modes.mjs` | D 3.8 |

### 3.7 Timing regime, `ensureEra`, harness, comparators (AR6)

#### 3.7.1 `ensureEra`

```js
// src/content/ensure_era.js   owner INTEGRATION; bake filter in anim/{dsl,boot}.js owned by ANIM-CLIPS
export function ensureEra(era, opts = {}) -> { era, version, ms, baked, already }
   opts = { humanoid: parsed assets/anim/humanoid_clips.json or null, onReport(msg), allowHidden: false, clock: () => number }
export async function ensureEraAsync(era, opts)    // yields two animation frames first (browser) so a loading overlay paints, then calls ensureEra
ensureEra.done() -> sorted list of ensured eras;  ensureEra.__reset() exists only when globalThis.__VW_TEST__ and never touches ClipLib
```

Injection (q3_engine residual 3): `ensure_era.js` is in `src/content/` (PURE), so it cannot read `window`; the browser caller passes `window.__VW_UAL_CLIPS__` (as `main.js:53` does today), Node tools pass `JSON.parse(fs.readFileSync('assets/anim/humanoid_clips.json'))` through `tests/_eras.mjs loadHumanoid()`. It lives outside `src/sim/**` because sim may import only `anim/clips.js` (LR4).

Algorithm: (1) `era` must be a registry era; a hidden era throws `UNKNOWN_ERA` unless `allowHidden` (tests, tools). (2) `closure` = `[era] + manifest.requires` (default `['ancient']`), sorted by ERA_ORDER, so entering Sci-Fi first still bakes `ancient` then `scifi`. (3) For each era in the closure not yet done: `registerAllClips(ClipLib, {humanoid, eras:[e]})`. (4) Build the era's lookup tables (module maps collected by `collectUnique`; no mesh or model compile - model compile stays lazy per unit and is prewarmed by the time-sliced `content.prewarm(ids, budgetMs)` during briefing/placement). (5) Return `{era, version: ClipLib.version, ms (work done by THIS call), baked: {authored, adopted}, already}`. A second call returns `already:true, ms:0` and leaves `ClipLib.version` unchanged. The roster warm-up battle (`warmup.js`, 420 ticks, `step(budgetMs)`) is NOT part of `ensureEra` (PC14); it stays the existing time-sliced task, now fed by `registry.warmRoster(era)`.

Canonical registration order, independent of the order eras were entered: ERA_ORDER across eras; inside an era the import order of its clip modules (`clips/index.js` for Ancient; the fixed array in `clips/eras.js` for the others); UAL adoption only inside `ancient`. Plain-slot ownership (`clips.js:108-115`: first registering rig owns a plain id, except `hum1` always overwrites) is therefore the same in every entry order PROVIDED no two eras' rigs define the same plain id: a test over all packs enforces "each windup/launch/fire clip id requestable by a def is registered by exactly one rig" and "a new hum1 id equals no existing plain id" (q3_engine residual 5, spec/RA owns the rule, this file owns the order test).

Bake filter (ANIM-CLIPS): `dsl.js define(id, spec)` stores `spec.era` (default `'ancient'`; none of the 146 shipped definitions changes) and `bake` copies it onto the baked clip; `bakeAll(filter)` = `definedClips().filter(filter).map(bake)` (default filter keeps all, today's behaviour); `registerAllClips(ClipLib, opts)` gains `opts.eras` (absent = all defined clips, today's behaviour, used by the existing anim tests; G11 and `ensureEra` pass explicit era lists); `boot.js` imports `./clips/eras.js` after `./clips/index.js`.

Measured anchors (Node 22.22, this box, `scratchpad/bake.mjs`): Ancient cold `registerAllClips` 86.9 ms (second call after `ClipLib.reset()` 34.7 ms); 146 authored clips (hum1 47, quad1 43, elephant1 13, chariot1 8, catapult1 7, ballista1 7, trojan1 6, chicken1 15) + 17 adopted UAL clips, 6 replaced twins; resulting `ClipLib.version` 157, 93 plain ids, 157 qualified ids. Ceilings (owner TOOLS-VERIFY, ER13): `ensureEra` per era cold <= 150 ms in Node and <= 300 ms in Chromium (SwiftShader box); a first-sight hitch above 100 ms must show the loading affordance; over the ceiling the era is baked at boot (plan AR6 fallback, cost is time not bytes). Changing a ceiling needs REVIEWER + COORD.

World guard: `new World` records `ClipLib.version`; `tick` compares it with one integer compare; mismatch throws in tests (`__VW_TEST__`) and emits one `diag.error('clips', ...)` in production (spec/M M0 owns the code, this file fixes the contract).

#### 3.7.2 Entry points that call `ensureEra` (q3_engine residual 4)

| entry point | file | when | affordance |
|---|---|---|---|
| boot | `app/main.js` | `ensureEra('ancient')` before the first screen (replaces the inline `registerAllClips` at `main.js:53`) | splash progress |
| Quick era chip | `ui/screens/quick.js` | on chip select | inline spinner on the chip when `ms` estimate > 100 |
| chooser card hover/focus and the 1.2 s time portal | `ui/screens/campaign.js` (chooser) | prefetch after 150 ms dwell; portal waits for it (max 3 s, skip on any key) | portal animation |
| campaign briefing and Deploy | `briefing.js`, `Game.begin` | briefing mount; `Game.begin` repeats the call (cost 0) as the safety net | briefing "preparing" line |
| survival, daily, puzzles | their screens | screen mount | spinner |
| Codex era tab and turntable | `codex.js`, `render/preview.js` users | tab select | skeleton cards |
| Workshop era parts and preview | `editors/soldier/*` | era chip select | spinner |
| share-code import | `save/transfer.js` caller in `settings.js` | after validation, before preview | toast |
| Arena Builder preview and test fight | `editors/arena/*` | theme/era chip, "Test" | spinner |
| title diorama rotation | `game.js` | before `begin(...,{diorama:true})` for each tuple's era | none (attract mode) |
| tools and tests | `tests/_eras.mjs`, `tools/*` | explicit, once per era per process | n/a |

`ensureEraAsync` is the only call UI code uses; the synchronous `ensureEra` is for tests, tools and `Game.begin`.

#### 3.7.3 `defsFor(era)` and the 22 `buildSimDefs` callers (q3_engine residual 4)

`registry.defsFor(era)` returns a frozen map: the era's defs in registry order followed by the utility units when they belong to another era; `'ancient'` equals today's `buildSimDefs()` key for key; `'all'` = released eras. `buildSimDefs(extra, {era})` wraps it with the `extra` overlay (models/text) exactly as today. `tools/lib/harness.mjs` keeps `export const DEFS = buildSimDefs()` (Ancient, so its 11 importers - 8 tests and `ai_dev.mjs balance.mjs perf_sim.mjs` - do not move) and adds `defsFor(era)` + `buildWorld({era})` that calls `ensureEra(era, {humanoid, allowHidden:true})` first.

| # | file:line | today | era it passes after the change | replacement |
|---|---|---|---|---|
| 1 | `sim/armygen.js:21` `defsOr` | module `_defs = buildSimDefs()` memo | `opts.era` default ancient | memo keyed `version\|era`, `registry.defsFor(era)` |
| 2 | `content/era_ancient/survival.js:20` | own `_defs` memo | ancient (file FZ, wrapped) | `createSurvival` uses `defsFor(era)` |
| 3 | `content/era_ancient/daily.js:68` | `defs \|\| buildSimDefs()` | ancient (FZ) | `createDaily` always passes `defs` |
| 4 | `content/era_ancient/content.js:30` | `buildSimDefs(extra)` | `eras` option | moved into `src/content/content.js` |
| 5 | `ui/mockctx.js:165` | `buildSimDefs(extra)` | `era` option, default ancient | scenarios `campaign_<era>` pass the era |
| 6 | `tools/mixtest.mjs:26` | bare | `--era`, default ancient | `defsFor(era)` + `ensureEra` |
| 7 | `tools/lib/harness.mjs:9` | `DEFS = buildSimDefs()` | ancient (kept) | plus `defsFor(era)` |
| 8 | `tests/editors/soldier/u8_fuzz.test.mjs:16` | bare | `eachEra` (U8 per era) | `defsFor(era)` |
| 9 | `tests/campaign/campaign.test.mjs:18` | bare | `eachEra` | `defsFor(era)` |
| 10 | `tests/campaign/_lib.mjs:10` | bare `defs` | `era` argument of every helper | exported `defsFor` |
| 11 | `tests/campaign/survival.slow.test.mjs:12` | bare | `eachEra` | |
| 12 | `tests/campaign/survival.test.mjs:13` | bare | `eachEra` | |
| 13 | `tests/campaign/missions.sim.test.mjs:13` | bare | `eachEra` | |
| 14 | `tests/campaign/daily.test.mjs:60` | bare | ancient (400-date parity) + `eachEra` | |
| 15 | `tests/sim.test.mjs:8` | bare | ancient (stays) | |
| 16 | `tests/visual/battle_demo.js:14` | bare | ancient | |
| 17 | `tests/app/_harness.mjs:11` | bare | ancient | |
| 18 | `tests/audio/battle.test.mjs:10` | bare | `eachEra` (routing per era) | |
| 19 | `tests/sim/_util.mjs:7` | bare `defs` | ancient (stays; exports `defsFor`) | |
| 20 | `tests/save/docs.test.mjs:132` | bare | ancient | |
| 21 | `tests/save/transfer.test.mjs:19,103,122` | bare | `'all'` (cross-era army validation) | `defsFor('all')` |
| 22 | `sim/defs.js` (definition) | `buildSimDefs(extra)` | adds `opts.era` | AP-S01 |

(Callers 1-21 + the definition = 22 files, as counted by `grep -rln buildSimDefs src tools tests`.) A test (AR-T22) asserts that no file outside this table calls `buildSimDefs(` and that every `eachEra` suite builds its world through `buildWorld({era})`.

#### 3.7.4 One timing regime

Today (verified): `registerAllClips` is called only by `app/main.js` and the anim tests; `tools/lib/harness.mjs`, `balance.mjs`, `perf_sim.mjs` never bake, so every Node number (G1, G6, balance) runs on `DEFAULT_META` timing while the shipped game runs baked timing. Decision: the canonical regime is BAKED. `buildWorld`, `campaign_play`, goldens, balance and the browser all call `ensureEra(era)` before `new World`. `DEFAULT_META` stays as the fallback table; a test (AR-T19c) proves no registered def requests a clip id whose plain owner is `''` after `ensureEra`. G1 and G6 are recorded under BOTH regimes from the baseline worktree (`regime:'default_meta'` records keep the provenance and refactor checks; `regime:'baked'` records become the golden going forward); this file states that the shipped game matches `regime:'baked'`, and that the two regimes differ by the statistical bound of class (b) below (200 battles: win rate within 3 points, median end tick within 2%).

#### 3.7.5 Comparator classes and the stored-record tag

Every stored artefact (goldens G1..G12, `feasibility.<era>.json`, `docs/balance/<era>.json`, campaign `reference` and puzzle-solution records, perf records) is written by `tools/lib/records.mjs makeRecord(kind, data, ctx)` with these fields: `schema:1, kind, engine:'node'\|'chromium', engineVersion (process.version or the Chromium UA version), regime:'baked'\|'default_meta', engineHash:{simCore, shared}, renderHash (render goldens only), eraHash:{[era]: hex}, tag (ancient-v8 or sha), data`.

| class | when | rule | tool |
|---|---|---|---|
| (a) bit equality | Node vs Node, Chromium vs Chromium, baseline build vs candidate build in the SAME engine and regime | `stateHash`/`stateHashFull`/PNG digests identical | `assertComparable(a, b, 'a')` throws `CrossEngineError` when `engine`, `regime` or the engine major differ |
| (b) cross-engine | Node record vs Chromium record of the same build | report the first-divergence tick (hashes sampled every 100 ticks) and require 200 battles: win rate within 3 points and median end tick within 2% | `compareStats(a, b, {n:200, winRateTol:0.03, endTickTol:0.02})` and `firstDivergence(ha, hb)` |
| (c) outcome-critical | campaign `reference` armies, puzzle solutions, star thresholds | win in >= 8 of 10 seeds in Node AND >= 8 of 10 in Chromium | `marginCheck(results)` |

Evidence for (a)/(b) (q3_engine B1, probes `q3math*.mjs`, `q3run*.mjs`): the same code gives different doubles for `Math.sin` on 634 of 19,999 inputs, `cos` 660, `pow` 2,002 between Node 22.22.0 and Chromium 141; an unmodified Ancient 300-unit battle is bit-identical at ticks 100, 400, 900 and diverges by tick 1500-2500 in all 3 seeds tried; Chromium twice is identical to itself. Consequences stated here: no Node record is bit-comparable to the shipped game after about 1,000 ticks; G1/G6 are Node-engine records; `release_check` refuses any cross-engine comparison through `assertComparable`; the provenance fallback compares the hosted fragment run in Chromium with the candidate build run in the same Chromium (never with Node digests).

#### 3.7.6 Fingerprints (plan section 3; AR-D17)

A record carries `engineHash = {simCore, shared}` (and `renderHash` for G8/G12) and `eraHash`. Each is `sha256` over the sorted list of `path\0sha256(content)` of the files below.

| hash | files |
|---|---|
| `simCore` | `src/sim/**` (RECURSIVE - the old `simHash()` of `tests/campaign/_lib.mjs:155` reads only direct children and misses `src/sim/abilities/*.js`), `src/world/**`, `src/core/**`, `src/content/{registry,eras.config,stat_helpers}.js`, `src/content/shared/**`, `src/_generated/registry.eras.js`, `src/anim/{clips,dsl,boot,kin,gait,ual,ual_adopt}.js`, `src/anim/clips/{hum1_*,poses,index}.js`, `assets/anim/humanoid_clips.json` |
| `shared` | `src/voxel/**`, `src/anim/animator.js`, `src/content/era_ancient/{blueprints.js,parts/_kit.js,parts/_base.js,parts/_registry.js,beasts/common.js,beasts/quad1.js,props/models/kit.js}` (shared kits that produce pixels for every era) |
| `renderHash` | `src/render/**` |
| `eraHash(e)` | `src/content/era_<e>/**` EXCEPT presentation-only subtrees `humor/** units/** beasts/** parts/** props/models/** *_text.js` (text and models do not move sim records; they are covered by G4/G8/G10); PLUS the era's clip files (`src/anim/clips/<e>/**`, the rig files named in `manifest.rigs`), `src/sim/abilities/` files named in `manifest.abilities` (recipes live in `era_<e>/recipes.js`, inside the first term). For `ancient`: `stats.js arenas.js campaign*.js puzzles*.js survival.js daily.js sim_text.js lesson_text.js wave_names.js props/catalog.js data.js manifest.js pack.js` + the 4 non-hum1 rig clip files (`quad1.js elephant1.js siege.js chicken1.js`) |

Sim records (G1, G6, G7, G9, balance, feasibility) compare `simCore` and `eraHash(e)`; render goldens (G8, G12) compare `shared` and `renderHash`; G11 compares `simCore` and `shared`; staleness rules (amber STALE-ENGINE, red when `eraHash` differs) are spec/VF's. The Ancient records are re-taken once, immediately after the hash redefinition, with the old records kept for replay equality (plan section 3).

#### 3.7.7 G11 and G12 content (q3_engine residuals 9, 10)

G11 (`tests/golden/g11_clips.test.mjs`, TOOLS-GOLDEN, one engine only because baking uses trig): (1) `registerAllClips(ClipLib, {humanoid, eras:['ancient']})` (on the baseline worktree the option is absent and the call is the shipped one), then sha256 over the raw bytes of every `Float32Array` channel of `bakeAll()` per `rig:id` in sorted key order (frames x bones; keys `q t s root aim`), recording the anchors 146 authored, 17 adopted, 6 replaced, `ClipLib.version` 157, 93 plain ids, 157 qualified ids; (2) the `ClipLib` `meta` table and `owner` table serialised with sorted keys; (3) `power(def)` of the 43 Ancient defs as `Number.toString()`; (4) animator pose samples: for every Ancient unit, `modelFor(def)` model, and every requestable clip (its `meleeClip`, `rangedClip`, `death_back death_front death_spin`, `hit_*`, locomotion `walk jog run trot gallop` per rig, `idle`), `Animator.pose(model, state, extra, out)` with `state = {clip, t: phase * dur, rate:1, flinch:0, dir:0, prev: clip, blend: 1}`, `phase` in {0, 0.25, 0.5, 0.75, 1.0}, `extra = {speed: S, gait: phase * 2, dead: false, team: 0, t: 0, id: 1, hp: 1, state: 0, heading: 0, scale: 1, lod: 0, root: zeroed}` with `S` = 1.5/3/5 for walk/jog/run (trot/gallop 2.5/4.5/7), 0 otherwise; each `out` value quantised to `Math.round(v / 1e-5)` and hashed per (unit, clip, phase). `Animator.pose` is pure (no random, no clock; verified: caches live on the model/state).
G12 (`tools/golden/g12_view.mjs`, Chromium only: BattleView needs THREE, a frustum and `engine.focus`): seeded `World` (Ancient Marathon, fixed seed, 300 units) stepped N = 600 ticks; fixed camera and focus; `view.update(alpha, dt, camera)` driven with a fixed `dt = 1/60` (the `lodScale` smoothing uses `dt * 2.5`, `battleview.js:147`); a spy wraps every `skin.add(x,y,z,h,sx,sy,sz,pose,team,flash,stone,glow,pitch,roll,lod)` call and logs `(defId, round(x,2), round(z,2), lod)` (the LAST argument is the far flag, `battleview.js:133`), plus per skin `nNear/nFar` after `end()`, plus `view.lodScale` and `view.drawn` per frame, at frames 1, 30, 120, 300. Recorded from the baseline worktree BEFORE any extraction of a pure LOD function from `battleview.js`; compared in Chromium only (class (a)).

### 3.8 Tooling is era-aware and strict (AR8)

#### 3.8.1 `tests/_eras.mjs` (owner TOOLS-GATE; its first import is `src/content/packs.js`)

```js
export const ERA_IDS                        // registry.eras({includeHidden:true}) ids, filtered by env VW_ERA (comma list or 'all'; an unknown id throws)
export const ERAS                           // manifests of ERA_IDS
export function expected(era)               // frozen manifest.expect
export function defsFor(era) / contentFor(era)   // registry.defsFor / buildContent({eras:[era]}) cached per era (hidden eras allowed in tests)
export function loadHumanoid()              // parsed assets/anim/humanoid_clips.json
export function ensure(era)                 // ensureEra(era, {humanoid: loadHumanoid(), allowHidden: true})
export function buildWorld(opts)            // tools/lib/harness buildWorld with era (ensure + defsFor + World({era}))
export function eachEra(name, fn, opts)     // one test per era, label "[era] name", fn(ctx) with ctx = {era, defs, content, expected, assert (counted wrapper of node:assert/strict), ensure, count(label, n, key)}
export const finish                         // prints the per-era summary; exit code 1 when any era ran zero assertions
```

`eachEra` rules: (1) with `VW_ERA` unset the era list in use must equal the registry list, else it fails with "era list drift"; (2) a test body that makes zero assertions for an era FAILS ("zero assertions for era <id>"); with `opts.only` the other eras are reported `SKIPPED` in the summary, never silently; (3) count assertions read `expected(era)[key]` instead of literals; tests that must stay Ancient (golden hashes, `feasibility.json` v1) pass `{only:['ancient']}`; (4) the summary line prints assertions per era. Tests that pin Ancient counts and must change (map 08 2C): `humor/text.test.mjs:26,40,67,75,111,117,161,190`, `sim/armygen.test.mjs:81`, `ui/ui5_flows_slow.test.mjs:245,257`, `editors/arena/entry.test.mjs:13,20,26`, `campaign/campaign.test.mjs:25,157`, `ui_battle/screens.test.mjs:153,328`, `humor/achievements.test.mjs:55`, `save/stats.test.mjs:197`, `campaign/survival.test.mjs:34`, `anim/roster.test.mjs`, `tools/contracts.mjs:49`.

#### 3.8.2 Per-era manifest (`src/content/era_<id>/manifest.js`, exact counts)

Schema: `{id, name, short, order, prefix, requires:[eraIds], phase:'building'|'complete', leaf:[file names of the L0 closure], rigs:[rig ids the era owns], abilities:[sim ability file names it contributes], sharedParts:[Ancient part ids it shows], hiddenCategories:[part categories with no parts], anchor:'<unit id costing 100>', expect:{...}, cuts:{<expect key>: '<cuts.md id>'}}`. `phase:'complete'` = every `expect` count is an equality; `building` = `count <= expect` and the fixed floors of plan section 1 still hold at E-FREEZE. `expect` below the plan target needs a `cuts` id (V12). `meta` has `phase:'complete'` from the start.

| expect key | Ancient (measured, exact) | Medieval / Modern / Sci-Fi target (floor), plan section 1 | counted by |
|---|---|---|---|
| `factions` | 7 | 6 (5) | `registry.ids('faction', era)` |
| `units` | 43 (roles: melee 10, ranged 7, cavalry 6, hero 6, support 4, monster 4, siege 3, beast 2, swarm 1) | 34 (30) | `ids('unit', era)` |
| `survivalBosses` | 5 (`BOSS_CYCLE`); `tags:boss` is 2 (`war_elephant`, `cyclops`) so do not count the tag | 5 | `waveTables(era).bossCycle.length` |
| `silhouettes` | n/a | >= 15 bespoke (units not scaled hum1) | spec/UC lint |
| `arenas` | 16 presets (incl. `arenalab`, `random`) | 12 (11) | `ids('arena', era)` |
| `recipes` | 16 | 12 (11) | `ids('recipe', era)` |
| `props` | 41 (categories 4) | 38 (34) | `ids('prop', era)` |
| `materials` | 16 | rows within the reserved range (AR-D21) | `appended('material', era).length` |
| `missions` / `acts` | 9 / 3 | 9 / 3 | `ids('mission', era)` |
| `puzzles` | 6 | 6 | `ids('puzzle', era)` |
| `waveNames` / `bossNames` | 20 / 5 | 20 / 5 | `waveTables(era)` |
| `workshopParts` | 254 (helms 55, hair 13, faces 15, tunics 22, armors 18, shoulders 12, legs 13, skirts 3, capes 9, backs 14, mains 56, offs 24) | about 120 (floor 90), of which generic 40 - per-slot split in 3.9.4 | `PART_REGISTRY` entries with `meta.era` |
| `achievements` | 24 | 12 per era (+3 `meta` in total) | `ids('achievement', era)` |
| `mutatorsEra` | 9 shared | 2 per era | `ids('mutator', era)` |
| `tips` | 63 | 40 (30) | `TEXT.tips` |
| `loadingLines` | 20 | 20 | `TEXT.loading` |
| `scoutCodes` | 9 | 9 + the era codes of spec/CU CU14 (the count is filled by CU14; `null` is rejected at `phase:'complete'`) | `TEXT.scout` |
| `godPowers` | 6 | 6 (5) | `ids('god_power', era)` |
| `announcerEffective` | 486 lines | >= 300 effective (250) per spec/H table | spec/H counter |
| `sfxRows` / `music` | 374 / 8 | 60 / 120 / 110 rows; 7 tracks (6) | `assets/manifest.json` rows with `era` |
| `rigs` | 8 | per spec/RA | `manifest.rigs` |
| `abilitiesUsed` | 27 distinct ids in defs | <= 32 ability files in total (spec/M D-M18: 30) | defs scan |

Ancient numbers were measured on HEAD by probes (`scratchpad/counts.mjs`, `c2.mjs`, `parts.mjs`): tips 63, achievements 24, `ARENA_IDS` 14, `MISSION_IDS` 9, loading lines 20, scout codes 9, god powers 6, props 41, categories 4, materials 16, recipes 16, mutators 9, missions 9, puzzles 6, wave names 20, boss names 5, arenas 16, announcer `TEMPLATES` 486, parts 172 core + 82 unit-specific = 254. The text-layer numbers for new eras must equal the spec/H and spec/CU tables (open item OI-1); until those are final the manifests carry the plan section 1 numbers.

#### 3.8.3 Who may edit what (enforcement)

| protected paths | only | everyone else |
|---|---|---|
| `tests/golden/**`, `tests/baseline/**`, `tests/fixtures/shipped_ids.json` | TOOLS-GOLDEN, with a `golden_log.md` entry (two signers, author excluded) | `docs/requests/<agent>_threshold_<topic>.md` |
| thresholds, bands, floors: `tools/lib/bands.mjs`, `tests/negctl/**`, the criteria registry, ceilings of 3.7.1 | TOOLS-VERIFY | request file |
| gate, lint, `_eras.mjs`, `ap_lint`, `own_check` | TOOLS-GATE | request file |
| `src/content/era_*/manifest.js` `expect`/`cuts`, `eras.config.js` | COORD (with a `cuts.md` row for any shortfall) | request file |
| `docs/eras/spec/*`, `design/<era>/*` | the DESIGN-x role of the file, by logged amendment that re-runs the lints | request file |

`tools/own_check.mjs --role=<ROLE> [--since=<sha>]` (TOOLS-GATE) lists changed paths (`git status --porcelain` plus `git diff --name-only <since>`), maps each through the OWNER-TABLE of 3.10.4 and fails when a path belongs to another role (paths under `docs/requests/` are always allowed). Agents run it before hand-back (an amendment of `docs/AGENTS.md`, COORD); the snapshot gate runs `own_check --any` which fails on a changed path with no owner row.

#### 3.8.4 Tool changes (map 08 seams 1-26; owner TOOLS-GATE unless stated)

| tool | change |
|---|---|
| `gate.mjs` | lanes, `--era`, `--steps`, `--dist=.cache/dist/<id>`, `--snapshot`, `gate_log.jsonl`, in-process esbuild syntax step with a negative-control file (spec/VF); passes `--strict` to contracts (`node tools/contracts.mjs --strict` already prints `contracts OK (43 units, 16 arena presets, 0 soft finding(s))` on HEAD, so strict is free for Ancient) and adds `ap`, `lint-arch`, `gen-registry --check`, `own_check --any` steps |
| `contracts.mjs` | `--era=<id\|all>`; counts from `manifest.expect`; per-unit matrix (model non-fallback, <= 48 parts, tint floor per rig, clip ids resolve per rig, text limits, sound row, abilities registered, role/tag vocabularies); `validateMission/validatePuzzle` for every mission and puzzle; `generateArena` for every recipe x 3 sizes; prop models x 3 stages; calls `registry.verify` |
| `lint.mjs` | LR1-LR8 (3.1.4); keeps the 10 existing rules; `PURE` already covers `src/content/era_*` |
| `build.mjs` | `--out=<dir>`, `--report`, `--minify` size gate, `files.manifest.json`, hidden-era asset filter, CSS list fails on a missing file instead of `.filter(exists)`, dead `--no-sourcemap` removed (3.11) |
| `gen-registry.mjs` | 3.1.1 (REGISTRY) |
| `smoke.mjs`, `tour.mjs`, `flow.mjs`, `modes.mjs` | `--era=<id\|all>` (one browser session per tool, loop eras inside); smoke steps the sim until >= N kills, projectiles and one death clip; tour takes `id@{json}` params and the chooser id; flow `--path=quick\|campaign`; modes loops `content.eras` and drops hard ids `marathon_sort_of zeus_bad_day spear_wall hoplite cretan_archer peltast` in favour of `campaignApi.reference(m)` |
| `balance.mjs` (TOOLS-VERIFY; run by BALANCE) | `--era`; per-era module `src/content/era_<id>/balance.js` (pure, test-only import: `ANCHOR`, `FACTIONS`, `ARENAS{symmetric, asymmetric}`, `DUELS`, `GAGS`, `ARMY_150`, `COUNTERS`, `BANDS` overrides with a mandatory `why`); results `docs/balance/<era>.json` (Ancient keeps `docs/balance_data.json`); `applyTune` writes the era's `statsFile` (same one-line-per-unit format); each section stores `{engineHash, eraHash, era, quick, seconds}`; bands move to `tools/lib/bands.mjs` |
| `lib/harness.mjs` | `DEFS` stays Ancient; `defsFor(era)`; `buildWorld({era})` runs `ensureEra` first; `ARMY_150` per era |
| `perf_sim.mjs`, `simperf.mjs`, `perf.mjs`, `look.mjs` | `--era`, `--scenario=era150`, `--units=` for the heaviest-triangle composition, `--cold` |
| `tests/campaign/_lib.mjs`, `run_feasibility.mjs`, `feasibility*.test.mjs` | take `era`; files keyed `<era>_m{i}_{bot}`; `feasibility.<era>.json`; `simHash()` replaced by the 3.7.6 fingerprints (the old one reads only direct children of `sim`/`world`: verified, `_lib.mjs:155-160`) |
| `tests/humor/text.test.mjs` | strings from every registered era module list; shared banned lists plus `REAL_WORLD` and a signed per-era allowlist (spec/H); Medieval vocabulary (church, crusade, pope, pagan) is in the existing banned lists and needs the allowlist |
| `tests/save/fixtures/` | `ancient_release_v8.mjs` (3.5.4) and `tests/fixtures/shipped_ids.json` |

### 3.9 Custom soldiers in the new eras (AR9)

#### 3.9.1 Contract of `statsToUnitDef(cs, opts)` (owner SIM for `sim/stats.js`; REGISTRY for the pieces below)

`opts = {weaponStyle, shield, radius, armorBase, era = 'ancient'}`. Callers derive `era` from the main weapon part: `eraOfBlueprint(bp) = (PART_REGISTRY.mains[bp.main].meta.era) \|\| 'ancient'`, where `registerParts(set, {era})` writes `meta.era` for non-Ancient parts only (Ancient parts keep `meta` byte-identical). Rows: `era === 'ancient'` uses the module constants of `sim/stats.js` (`WEAPON_CLASSES WEAPON_ID_STYLE SHIELDS BODY ABILITY_PRESETS COST_ROLE ABILITY_COST_FACTOR`, the SAME objects, untouched, with the legacy silent default `\|\| WEAPON_CLASSES.slash` retained for Ancient). Any other era uses `registry.customClasses(era)` = Ancient rows overlaid by the era's rows; an unknown style in a new-era call THROWS `statsToUnitDef: unknown weapon class "<style>" for era <era>`; `legalAbilities(style, era)`, `legalAbilityIds(bp)`, `abilityReason`, `checkSoldier` and the AI default (`isRangedStyle(era, style)` instead of `'shoot'\|'throw'`) all read the same view. `statsToUnitDef` ends with `registry.tagCustom(def, era)` for a non-Ancient era (AR-D03). The stat point-buy (`STAT_CAPS` 7 stats, `STAT_POINTS` 100, `MAX_ABILITIES` 2, `EFFICIENCY_CAP` 1.35, `HP_SCALE` 1.84) is shared by every era.

#### 3.9.2 Per-era `custom_classes.js` row schema (leaf, default export)

```js
export default {
  WEAPON_CLASSES: { rifle: { role:'ranged', dmg, cd, range, type:'bullet', style:'rifle', kb, tags:[...], proj:'rifle', speed, gravity:0, spread, meleeDmg, meleeRange,
                             burst?, burstGap?, mag?, reload?, pen?, ... } },   // base fields = the Ancient rows; new weapon fields are exactly the `ranged` SUB keys of spec/M 3.4 (validated by validateDef)
  WEAPON_ID_STYLE: { mod_rifle_a: 'rifle', ... },                              // fallback id -> style when compileSoldier did not supply weaponStyle
  SHIELDS: { ... }, ABILITY_PRESETS: { <abilityId>: { classes:[styles], p:{id, ...params} } },   // ability ids are engine ids (spec/M D-M18); preset keys of the pack may be prefixed
  ABILITY_COST_FACTOR: { ... },
  COST_ROLE: { vehicle: ..., air: ... },     // terms only for roles ABSENT from the Ancient COST_ROLE; redefining an Ancient role throws at registration
  COST_FIT: { pExp?, speedExp?, abilityTerm?, cavalryTerm?, fearlessTerm?, anchor: '<unit id>' },   // per-era refit; K_era = 100 / rawCost_era(anchor)
  CLASS_LABEL: { rifle: 'Rifle', ... }, ABILITY_TEXT: { ... },              // labels (custom_text layer; spec/H owns wording)
};
```
Customs may only be `melee ranged support hero` roles (spec/M D-M13); vehicles and air units are never custom.

#### 3.9.3 Costing, `power.js`, validators

`costFormula(def, {era})`, `clampedCost(def, {era})`, `roleEfficiency(role, era)`: Ancient reads `ANCIENT_K`/`ANCIENT_ROLE_EFF` (3.1.7), a new era computes `K_era` and the per-role best `power/cost` lazily from `registry.statTable(era)` (same exclusions as Ancient: boss tag, monster, swarm, beast; `cavalry` falls back to `melee`), memoised by `version\|era`. The U8 bound (custom cost >= `power / (1.35 x roleEfficiency)`) therefore holds per era. `power.js` (SIM, M1/M2/M4) extends `dpsOf/hpEff` for burst, magazine, hitscan, armour and shield behind `def._nf` (spec/M D-M26); `power(def)` of the 43 Ancient defs is bit-identical (G11). `ui/unitinfo.js` keeps its display formula (PC1). Files and owners: `src/sim/stats.js` SIM; `src/content/era_ancient/custom.js` and `blueprints.js` REGISTRY (AP-C03); `src/save/validate.js` REGISTRY (AP-D01); `src/content/era_<id>/custom_classes.js` the era's UNITS-x (rows) with BALANCE (fit); `src/editors/soldier/*` EDITORS; `parts/_registry.js` `STYLE_K` and `src/anim/animator.js` `AIM/STYLE_CODE` rows for new weapon styles ANIM-CLIPS.

Era-aware enumerators (PC5): `listParts(cat, unlocked, {era})` returns the era's own entries plus `manifest.sharedParts`; the default `era = 'ancient'` returns exactly the entries without `meta.era`, in registration order. `randomBlueprint(rng, {unlocked, name, era})` picks `ids` from that view and `PALETTES/SKIN_TONES/HAIR_COLORS/EYE_COLORS/METAL_KEYS/EMBLEM_IDS` from `appended(kind, era)` views (`'ancient'` = the original arrays, so `rng.next()` draws map to the same entries). `validateBlueprint` accepts ANY registered part id (a share code from another era validates; era is never enforced there). `UNLOCK_MISSIONS` and `UNLOCKS` are extensible objects (prefixed keys, e.g. `med_silly_helms`).

Golden (G5, AR-T27): the first 200 customs of the generator in `tests/editors/soldier/u8_fuzz.test.mjs` (`new RNG(8008)`, `randomBlueprint`, random stats/abilities/ai/height/radius, then `C.customDef`) recorded from the baseline as `[{i, main, role, cost, power}]` in `tests/golden/g5_customs.json`; the candidate must reproduce every `cost` and `power` exactly, in the SAME test that recomputes `roleEfficiency` per era. U8 per era: 5,000 random legal soldiers, 0 crashes, efficiency <= 1.35 (`U8_N` env as today).

#### 3.9.4 Workshop parts: floor rule and per-slot split (shared with spec/CU, q3_product residual 26)

Rule (registry V12 + `contracts`): total >= 90 per era; every part category shown in the Workshop for an era has >= 3 selectable parts (own + `sharedParts`); `mains` >= 20 and `helms` >= 10; a category with no parts is listed in `hiddenCategories` and the UI hides the tab. Proposed targets summing to 120 (generic 40 + unit-specific 80); CU may amend by a logged amendment before E-FREEZE:

| category | Ancient (shipped) | Medieval | Modern | Sci-Fi |
|---|---|---|---|---|
| helms | 55 | 16 | 14 | 14 |
| hair | 13 | 4 | 4 | 4 |
| faces | 15 | 4 | 6 | 6 |
| tunics (torso) | 22 | 8 | 12 | 10 |
| armors | 18 | 10 | 10 | 12 |
| shoulders | 12 | 6 | 4 | 8 |
| legs | 13 | 6 | 10 | 8 |
| skirts | 3 | 2 | 0 (hidden) | 0 (hidden) |
| capes | 9 | 8 | 2 | 4 |
| backs | 14 | 8 | 14 | 12 |
| mains | 56 | 30 | 32 | 28 |
| offs | 24 | 18 | 12 | 14 |
| total | 254 | 120 | 120 | 120 |

### 3.10 Errata, app-layer Ancient imports, owner table

#### 3.10.1 Errata (each row has a machine check in `tests/arch/errata.test.mjs`, so the table cannot rot)

| # | document says | code says (evidence) | rule for builders |
|---|---|---|---|
| E1 | `docs/spec/rigs.md` sections 2-5 and table rows 208-211: chariot 32, elephant 25, catapult 24, ballista 18 parts | probe `modelFor` on the 43 defs: `chariot_archer` 43, `war_elephant` 36, `catapult` 36, `ballista` 26; max 43, cap `MAX_PARTS = 48` (`voxskin.js:112`); 28 humanoids are hum1 | crew budgets are computed from shipped counts |
| E2 | `docs/spec.md` section 9 / line 15: `aFx.w` "reserved, always 0" | `aFx.w` = the instance's row in the part texture (`voxskin.js:34,45`) | shader v2 adds `aFx2`, never reuses `aFx.w` |
| E3 | `docs/spec.md:257`: brace deals the charger 1.6x | `G.braceMul = 2.4` (`consts.js:28`) | 2.4 |
| E4 | `docs/spec/units.md` hp/damage columns (hoplite 110 hp, 14 dmg, line 16) | `stats.js:12`: hoplite hp 150, `M(10, ...)` | `stats.js` wins; `units.md` is design history |
| E5 | `src/audio/cues.js:1` "Cue families (113)" | `CUE_COUNT = 116` | 116 |
| E6 | `src/save/migrate.js:12` daily history "<= 14" | `validateDaily` and `DAILY_HISTORY_CAP` keep 60 | 60 |
| E7 | plan q3_engine residual 8 seed `assets/files.json` | no such tracked file: `dist/artifact/files.json` is generated and gitignored; `release/v8/files.json` is rollback material (outside the AP scope by design) | AP scope is `src tools assets package.json package-lock.json` |
| E8 | `tests/campaign/_lib.mjs:155` `simHash()` "hashes src/sim + src/world" | `readdirSync` is non-recursive: `src/sim/abilities/*.js` (heal, poison, bribe, ...) are not hashed | replaced by the recursive fingerprints of 3.7.6 |
| E9 | `src/save/tombstones.js` header: "a test fails when an id is both live and tombstoned" | `tests/save/tombstones.test.mjs` does not exist | created (3.3.1) |
| E10 | plan/map: "unitinfo imports `dpsOf` from `power.js` (one definition)" | the two `dpsOf` differ on 20 of 43 Ancient defs (`peltast` 8.67 vs 7.00, `cretan_archer` 9.93 vs 8.13, `companion_cavalry` 18.15 vs 16.50, `pilum_thrower` 12.00 vs 10.00 ...) | PC1: display formula stays |
| E11 | `docs/eras/maps/01` section 1.13: gate pins to Ancient counts (43 units, 41 props, 16 materials, 24 achievements ...) | `tools/contracts.mjs:49` `ids.length !== 43` and the test literals listed in 3.8.1 | per-era manifest counts |
| E12 | q2_engine Q1 / q3_engine r5 cite the plain-clip-slot code at `clips.js:76-91` | `ClipLib.register` and the ownership test are at `clips.js:108-115` (`o === undefined \|\| o === '' \|\| o === rig \|\| rig === 'hum1'`) | use the shipped line numbers |

#### 3.10.2 `tools/lint.mjs` traps (verified in `lint.mjs`)

`PURE` covers `src/content/`; the `pure-dom` rule rejects the identifiers `window document navigator localStorage AudioContext requestAnimationFrame` in code (strings and comments are stripped first, so jokes are safe except through `dilution`); `dilution` rejects `TODO FIXME XXX lorem ipsum`, `your-value-here`, `coming soon` in raw lines including strings and comments; `math-random` bans `Math.random(` in `src/sim` and `src/content`. `lint.mjs` scans `src/` only and skips `_generated`.

#### 3.10.3 App-layer Ancient imports (q3_product residual 33; each with its policy)

| file:line | Ancient dependency | policy |
|---|---|---|
| `app/meta.js:16-21` | `createAnnouncer`, `checkAchievements/ACHIEVEMENTS/getAchievement`, `killVerb/killSolo`, `resultLabel`, `unitText/pickDeath`, `TEACHING_BEATS/MISSION_ORDER` | R: read through `content.text` (merged helpers over `registry` tables) and `content.eras[era]`; `MISSION_ORDER` from `content.campaigns[era].order`; `:380` tutorial test becomes `mission === order[0] of its era` (CU5) |
| `app/meta.js:23,103-108,121` | `GOD_POWERS` (sim), `GOOD` set, aim-ring colours, `info(id)` | R: GodPower schema from the kit (CU12) |
| `app/meta.js:38` | `FUNNY_ORDER` Ancient stat keys | C: per-era Stats labels (CU9) |
| `app/meta.js:620` | `MISSION_ORDER.indexOf(id) < 0` before the stars write | R: 3.6.4 |
| `app/modes.js:6` | `survivalRules` | R: `content.survival.forEra(era).survivalRules` |
| `app/game.js:26,36,96,646,33` | `scoutText`, `DEFAULT_SCOUT`, default armies hellenes/persians, diorama `SETS`, `TYPE_CAP` | R/K: per-era scout pack, first faction of the era, tuples with era, constant drives the copy |
| `app/main.js:6,14,44-59` | `buildContent`, optional modules | R: 3.1.9, 3.6.2 |
| `ui/screens/title.js:23,61-64` | `missions.length * 3`, `T.roadmap` | C+DA-1: denominator over released eras; chip removed |
| `ui/strings.js:6-7,38,313` | `humor/ui_text`, `credits_text`, `roadmap` | R+DA-1 |
| `ui/screens/campaign.js` | `PINS`, `VIEWS` (Mediterranean), `ACTS`, `OBJ`, sub line | C: `ERA_MAPS` data (CU6) |
| `ui/screens/{briefing,results,puzzles,survival,quick,codex,achievements}.js` | `'hellenes'/'persians'` fallbacks, act names, `TX`, `ARENA_IDS/MISSION_IDS` imports (`achievements.js:5`) | C: era defaults from `content.eras`; ids from the registry |
| `ui/unitinfo.js:4,10,87,118` | `FACTIONS`, `FACTION_ORDER`, `ABILITY_INFO` (20 of 27), `attackClip` | R: registry factions; glossary; one projectile->clip table |
| `ui/screens/_daily_plan.js:4` | `FACTION_IDS` | R: re-export of the factory output |
| `ui/hud/{mutators,_mutpicker,powers}.js` | mutator names ("Moon Gravity"), `DEFAULTS`, `POWER_ICON` | C: CU12/CU16, DA-5 rule |
| `editors/soldier/drafts.js:63-67` | foe list | R: by era |
| `ui/mockctx.js` | 13 Ancient refs (shipped tree) | R: `era` parameter (AP-I06) |

R = read through the registry/content object; K = keep with an era argument defaulting to Ancient; C = specified by spec/CU.

#### 3.10.4 Owner table and hot-file touch budget (plan section 12)

Parsed by `own_check` and `hotfiles` from the markers (same glob dialect as the AP table; the same specificity rule; a path with no row fails `own_check --any`). `budget` = max integrated touches per file after the tag `p1-done` (COORD tags the P1 exit); `tools/hotfiles.mjs --check` counts `git log p1-done..HEAD -- <file>` per hot file, amber over budget, red at `--release` unless a logged design review exists in `docs/eras/ledger/hotfiles.md`. `src/sim/**` is exempt (module order; spec/M lists the touches per module).

<!-- OWNER-TABLE:BEGIN -->
| id | globs | role | cadence | extension point created in P1 (so content roles do not edit the file) | budget |
|---|---|---|---|---|---|
| OW-01 | `src/sim/**`, `src/core/**` | SIM | one agent at a time, module landing order; requests as `docs/requests/<agent>_<topic>.md` | `kit`, `projkinds`, `vocab`, registry tables | n/a |
| OW-02 | `src/world/**` | WORLD | per W item | `gencore.registerRecipes`, `MATERIALS` append | 3 |
| OW-03 | `src/anim/animator.js` | ANIM-CLIPS (sole editor) | per clip batch | `AIM`/`STYLE_CODE` rows are the only style hooks | 3 |
| OW-04 | `src/anim/**` (all files except `animator.js`), `assets/anim/**` | ANIM-CLIPS (clip files of a new rig: ANIM-RIGS) | per clip batch | `spec.era` filter, `clips/eras.js` | 3 |
| OW-05 | `src/voxel/**`, `src/render/battleview.js`, `src/render/voxskin.js` | RENDER (sole editor) | per R item | `PROJ_FX`, `FX_CLASS`, `THEME_LOOK`, `SE->tint` tables read from the registry | 3 |
| OW-06 | `src/render/**` (other files) | RENDER | per R item | | 3 |
| OW-07 | `src/audio/cues.js` | AUDIO (sole editor) | per AU item | `AUDIO_PROFILES`, `PROJ_AUDIO`, `EXPLOSION_AUDIO`, `ABILITY_CUES` rows live in `era_<id>/data.js` | 3 |
| OW-08 | `src/audio/**` (other), `assets/manifest.json`, `assets/CREDITS.md` | AUDIO | per AU item | `era` ledger column | 3 |
| OW-09 | `assets/audio/**`, `assets/vfx/**`, `tools/*.py`, `tools/build_all.sh`, `assets/_*_build.json` | HUNTER | per hunt batch | | n/a |
| OW-10 | `src/app/**` (all files except `router.js`), `src/content/content.js`, `src/content/ensure_era.js`, `src/content/era_ancient/content.js` | INTEGRATION (single owner) | request queue drained once per 24 h; era leads file requests | era kit, `SETPIECES`, teaching beats, god powers, announcer routes, factories | 3 each |
| OW-11 | `src/app/router.js`, `src/save/**`, `src/content/registry.js`, `src/content/packs.js`, `src/content/eras.config.js` (edits by COORD), `src/content/shared/**`, `src/content/meta/**`, `src/_generated/**`, `tools/gen-registry.mjs`, `src/content/era_*/{manifest,data,pack}.js` skeletons | REGISTRY | P1; afterwards by DESIGN-ARCH amendment | | 3 |
| OW-12 | `src/ui/strings.js` | UI (sole editor) | per CU item | era strings through `getT/getTB` overlays, `ui_text` of the era | 3 |
| OW-13 | `src/ui/**` (other) | UI | per CU item | | 3 |
| OW-14 | `src/editors/**` | EDITORS | per CU item | merged catalog, era chips | 3 |
| OW-15 | `src/content/era_<id>/stats.js`, `custom_classes.js` (rows) | SIM (numbers) with BALANCE (tuning) and UNITS-x (new rows) | per balance window | | n/a |
| OW-16 | `src/content/era_<id>/{units,parts,beasts}/**` | UNITS-<x> (rigs: ANIM-RIGS) | per UC unit | | n/a |
| OW-17 | `src/content/era_<id>/{arenas.js,props/**}`, recipes | WORLD with PROPS-<x> | per W item | | n/a |
| OW-18 | `src/content/era_<id>/{campaign*,puzzles*,survival,daily}.js`, `design/<era>/missions.json` | CAMPAIGN-<x> | per MS item | | n/a |
| OW-19 | `src/content/era_<id>/humor/**`, `*_text.js` | COMEDY-<x> (cross-era: COMEDY-EDITOR) | per H item | | n/a |
| OW-20 | `tools/{gate,lint,build,contracts}.mjs`, `tests/_eras.mjs`, `tools/ap_lint.mjs`, `tools/own_check.mjs`, `tools/lib/harness.mjs` | TOOLS-GATE | per gate WP | | n/a |
| OW-21 | `tests/golden/**`, `tests/baseline/**`, `tools/lib/records.mjs`, `docs/eras/golden_log.md` | TOOLS-GOLDEN | on re-record only | | n/a |
| OW-22 | `tools/lib/bands.mjs`, `tests/negctl/**`, `tools/{balance,perf_assert,campaign_play,uiscan,readability,release_check,negcontrols,audit_sfx}.mjs` | TOOLS-VERIFY | per VF WP | | n/a |
| OW-23 | `docs/eras/spec/<X>.md`, `docs/eras/design/<era>/**` | the DESIGN-x of that file | logged amendment | | n/a |
| OW-24 | `docs/eras/*.md` (plan, status, cuts, traceability, wbs), `package.json`, `package-lock.json` | COORD | phase boundaries | | n/a |
| OW-25 | `tests/arch/**`, `tests/save/**`, `tests/app/**` | REGISTRY | with its subject | | n/a |
| OW-26 | `tests/sim/**`, `tests/events.test.mjs`, `tests/core.test.mjs`, `tests/sim.test.mjs` | SIM | with its subject | | n/a |
| OW-27 | `tests/anim/**` | ANIM-CLIPS | with its subject | | n/a |
| OW-28 | `tests/beasts/**`, `tests/units/**` | UNITS-<x> with ANIM-RIGS | with its subject | | n/a |
| OW-29 | `tests/props/**`, `tests/arena.test.mjs`, `tests/gen.test.mjs`, `tests/nav.test.mjs`, `tests/terrainmesh.test.mjs`, `tests/mesher.test.mjs` | WORLD | with its subject | | n/a |
| OW-30 | `tests/audio/**` | AUDIO | with its subject | | n/a |
| OW-31 | `tests/ui/**`, `tests/ui_battle/**` | UI | with its subject | | n/a |
| OW-32 | `tests/editors/**` | EDITORS | with its subject | | n/a |
| OW-33 | `tests/campaign/**` | CAMPAIGN-<x> | with its subject | | n/a |
| OW-34 | `tests/humor/**` | COMEDY-EDITOR | with its subject | | n/a |
| OW-35 | `tests/visual/**`, `tests/fixtures/**`, `tools/**` (any tool not named above), `.github/**`, `docs/requests/**`, `docs/ledger/**` | TOOLS-GATE (requests: their author) | per WP | | n/a |
| OW-37 | `src/content/era_ancient/{blueprints,custom,fallback_model,campaign_validate}.js`, `src/content/era_ancient/parts/{_registry,_kit}.js`, `src/content/era_ancient/props/models/{index,kit}.js` | REGISTRY (the AP-C03 edits) | P1; afterwards by DESIGN-ARCH amendment | | 3 |
| OW-38 | `src/content/era_ancient/humor/announcer.js`, `src/content/era_ancient/humor/ui_text.js` | COMEDY-EDITOR (announcer), UI (`ui_text.js`, DA-1 only) | per CU18 / DA-1 | | 3 |
| OW-36 | `src/content/era_ancient/**` (all other files), `README.md`, `docs/**` (all other files), `release/**`, `.gitignore` | COORD | frozen / phase boundaries | | n/a |
<!-- OWNER-TABLE:END -->

### 3.11 Packaging, generated files, provenance and gate interfaces (AR7, plan section 3)

#### 3.11.1 Generated-file policy

Tracked, deterministic, sorted, no clock: `src/_generated/registry.{content,optional,ui,eras,packs,modules}.js` and `registry.era_<id>.js` x4 (10 files). Verified today: running `tools/gen-registry.mjs` on a copy of the tree reproduces the three existing files byte for byte (`cmp`). Rules: (1) `node tools/gen-registry.mjs --check` writes to a temp directory and exits 1 on any difference with the tracked files; it is a gate step and a test (AR-T32). (2) A write run skips files whose content is identical (no mtime churn). (3) The only agent that regenerates a per-era file is the one who added or removed a module in that era, so parallel era teams never edit the same generated file (the ancient flat files change only for shared groups). (4) `build.mjs --out=<dir>` generates into `<dir>/_generated` through an esbuild resolve plugin, so builds inside a gate snapshot (`.cache/snap/<treeHash>`) never write the shared tree; a plain `build.mjs` in the shared tree is idempotent. (5) A fresh worktree (the baseline, a `--dist` lane) needs no generation step because the files are tracked; `--check` fails if they are stale.

#### 3.11.2 Per-family byte report (`node tools/build.mjs --minify --report`, TOOLS-GATE; writes `dist/report/bytes.json|md`, and `.cache/gate/bytes.json` when run by the gate)

Method: esbuild `metafile` `bytesInOutput` per input, mapped to families by path (below); `deflated` = `zlib.deflateRawSync(level 9)` of the family's minified sources; `packed` = `deflated x 4/3` (base64); the report prints `calibration = measured JS pack / sum of families` once so the estimate error is visible. Non-JS parts are listed separately. Columns per row: `raw`, `deflated`, `packed`, `delta vs tests/baseline/bytes_ancient_v8.json`, and for era families `status` (released or hidden).

Baseline anchors measured on HEAD (minified bundle 1,874,692 B, `scratchpad/fam.mjs`): `ui/screens` 168,350; `editors/arena` 154,927; `era_ancient/humor` 154,817; `era_ancient/parts` 135,478; `era_ancient/top` 126,232; `sim/root` 114,970; `audio` 113,879; `render` 105,357; `app` 103,138; `ui/hud` 85,565; `ui/root` 85,055; `editors/soldier` 72,083; `era_ancient/beasts` 67,598; `anim/clips` 65,779; `era_ancient/props` 60,617; `editors/painter` 57,042; `save` 48,913; `anim/root` 48,151; `world` 47,648; `sim/abilities` 20,763; `era_ancient/units` 17,498; `core` 10,387; `voxel` 9,249; `_generated` 1,064. Packed page (minified fragment) 3,106,540 B (`release/v8/index.html`, sha256 `4f707d27...ea885`): core audio base64 1,870,216 (60%), JS 871,240, UAL clips 108,444, manifest 33,668, credits 5,612, html+css+loaders 212,152 (map 08 table 2D).

Family map: `src/ui/**` -> `ui/{screens,hud,root}`; `src/editors/{arena,soldier,painter}` -> same; `src/content/era_<id>/{humor,parts,beasts,props,units}` -> `era_<id>/<dir>`, rest of `era_<id>` -> `era_<id>/top`; `src/content/{registry,packs,ensure_era,content,shared,meta,eras.config,stat_helpers}` -> `content`; `src/{sim,render,audio,app,save,world,core,voxel,_generated}` -> own name (`sim/abilities`, `anim/clips` split as above).

Gates: FAIL when the packed minified fragment exceeds 5,000,000 B (plan D13; raising it is the user's decision and goes in the final message); WARN at 4,500,000; WARN when one commit adds more than 300,000 B to the fragment relative to the previous record in `.cache/gate/bytes.json` (SCOPE-Q16 auto-stop, advisory); the gate builds and measures the MINIFIED flavour (today the gate builds unminified: 3,312,977 B) - one extra `--minify` build, about 1.2 s. Expected growth at plan targets (map 08 risk 2): 4.1-4.3 MB minified; the un-core decision for the 1.2 MB battle track is taken at the P1 size checkpoint if the projection exceeds 4.6 MB (D17).

Hidden eras are IN the byte count: the single IIFE contains every pack (CSP forbids splitting; the inline `vw-pack` loader is the only delivery). `tests/arch/size_report.test.mjs` builds a fixture bundle with `scifi` hidden and asserts the report's total includes the scifi families and `status:'hidden'`; negative control: drop a hidden era's `data.js` import from the generated `registry.eras.js` and the total must fall (proving hidden code is counted, and that the check is not vacuous).

#### 3.11.3 Hidden-era assets and the published file set (q3_program residual 21, q2_schedule Q17)

`build.mjs` reads `src/content/eras.config.js` and, for every manifest row whose `era` is a hidden era, omits the row from `__VW_MANIFEST__`, from `dist/artifact/files.json`, from `files.manifest.json` and from the Credits text; the JS bundle and the data stay (counted). A row without an `era` key belongs to `ancient`. Rules for the published set: `files.json` stays the plain `{published path: source path}` map the Artifact tool accepts; the sibling `files.manifest.json` carries `{path: {sha256, bytes}}` (exists for v8: 382 files, 10,979,932 B); the file guard counts the SERVER-SIDE set = previous published version's paths + delta - nulls and must stay <= 500 including the page (budget for three eras: 500 - 383 = 117 files, about 39 each; the manifest key `publishedFiles` per era carries it and the sum is asserted); a file once published stays served and counted until a publish passes `null` for it, so an era is released with exactly its final file set; rollback material is `release/<tag>/` (page, `files.json`, `files.manifest.json`, `PAGE.sha256`; `release/v8/` exists) and every era release writes `release/<era>-<n>/` BEFORE publishing. Tests (AR-T31): state `[ancient]` built from the full tree has zero rows and zero files of other eras; state `[all]` has all; flipping a status in a copy of `eras.config.js` flips them (negative control: ignore the status and the `[ancient]` build must fail).

#### 3.11.4 Provenance, baseline and interface names (all exist or are fixed here)

Done (COORD, `docs/eras/golden_log.md`, `release/v8/PROVENANCE.md`): the hosted v8 payload (537-char skeleton + the local fragment + closing tags) matches a local `node tools/build.mjs --minify` of HEAD with `VW_BUILD_DATE=2026-10-08` byte for byte (`cmp`; fragment 3,106,540 B, inflated pack 4,388,731 B, payload sha256 prefix `812e57ae8125d420`); tag `ancient-v8` = `4aafd2e`; baseline worktree `.cache/baseline/ancient-v8` (`git worktree add -f .cache/baseline/ancient-v8 4aafd2e`, `node_modules` and `.cache/cdn` symlinked). Because the byte match succeeded, no terminal fallback branch is needed: every Node and Chromium golden is recorded from this worktree; the Chromium goldens are produced by the worktree's own build, never compared with Node digests (class (a)). The tag is local-only; consumers use the sha constant of 3.2.1 step 1.

| name | meaning | owner |
|---|---|---|
| `AP_BASE` env, `ancient-v8` | AP lint base (3.2.1) | TOOLS-GATE |
| `VW_BUILD_DATE`, `build.mjs --minify --out --report` | deterministic builds, private output dirs, byte report | TOOLS-GATE |
| `VW_ERA`, `--era=<id\|all>`, `tests/_eras.mjs` | era scoping everywhere (3.8.1); spec/VF fixes `--steps --dist --snapshot` | TOOLS-GATE |
| `tools/lib/fingerprint.mjs` | `engineHash(root)` -> `{simCore, shared}`, `renderHash(root)`, `eraHash(era, root)` (3.7.6) | TOOLS-GOLDEN |
| `tools/lib/records.mjs` | `makeRecord`, `assertComparable`, `compareStats`, `firstDivergence`, `marginCheck` (3.7.5) | TOOLS-GOLDEN |
| `tools/lib/paths.mjs` | `ROOT`, `CHROMIUM` (today `/opt/pw-browsers/chromium-1194` is hard-coded in 28 files; central constant, adopted) | TOOLS-GATE |
| `registry.fingerprint()` | order-and-content digest of the sealed registry (3.1.10) | REGISTRY |
| `window.__vw.registry`, `window.__vw.app.ensureEra` | dev/test handles for browser tools (`__vw` accessors stay live getters defined with `Object.defineProperties`) | INTEGRATION |

## 4. Acceptance

Tiers (plan section 3): T-fast <= 4 min, T-era <= 8 min per era, T-full <= 15 min, release-only. All tests are plain `node:assert` files run by the gate; each registers a criterion id (`criterion('AR-Txx', {er, owner, tier, negctl})`) and has a mutation in `tests/negctl/AR-Txx.mjs` that must make exactly the named check fail. "ER" is the plan criterion the row feeds (ER1 Ancient identity, ER2 registry integrity, ER13 perf/timing, ER14 size, ER15 uiscan, ER16 save, ER21 chooser/chrome/release states, ER22 editors).

| id | ER | deliverable | script / test name | inputs | thresholds | owner | tier | negative control (mutation -> red check) |
|---|---|---|---|---|---|---|---|---|
| AR-T01 | ER2 | merge kinds | `tests/arch/registry_merge.test.mjs` | `createRegistry` with synthetic packs (overlapping ids per kind, duplicate list element, two `single` providers, bad `base`) + the real four packs | behaviour of 3.1.2; message matches `^era id collision: unit "[a-z_]+" in ancient and medieval$`; real unit order = 43 Ancient keys in file order then eras in ERA_ORDER | REGISTRY | T-fast | `idmap` overwrites instead of throwing -> `merge.dup` |
| AR-T02 | ER2 | seal, freeze, version | `tests/arch/registry_freeze.test.mjs` | open instance, singleton in a child process that imports only `sim/defs.js`, `registry.use` swap under `__VW_TEST__` | open accessors throw `NOT_SEALED/NOT_FROZEN`; `registerLogic` after freeze throws `FROZEN`; bare `buildSimDefs()` works with a sealed registry; swap bumps `version` and `defsOr`/`simBarks`/`roleEfficiency('ranged','x')` re-resolve | REGISTRY | T-fast | memo key without `version` -> `freeze.stale_memo` |
| AR-T03 | ER2 | `verify()` | `tests/arch/registry_verify.test.mjs` | the real registry (Ancient, logic stage) and 20 fixtures, one per V01..V20 | real: 0 problems; each fixture yields exactly its code | REGISTRY | T-fast | delete the V07 projectile-row check -> fixture `V07` green-where-red-expected, i.e. `verify.V07` red |
| AR-T04 | ER2 | import DAG and loading | `tests/arch/dag.test.mjs` | esbuild metafile of `tests/arch/entry_full.js`; Node ESM load; load under a throwing `window/document/navigator` proxy; IIFE bundle of `entry_registry.js` run in `node:vm` | 0 edges outside the 3.1.4 table; closure of each `data.js` equals `manifest.leaf`; `registry.fingerprint()` identical in the three loads; runs < 20 s | REGISTRY | T-fast | `import '../../sim/world.js'` appended to a fixture `data.js` -> `dag.edge` |
| AR-T05 | ER2 | lint rules LR1-LR8 | `tests/arch/lint_arch.test.mjs` | 16 fixture files (pass/fail pair per rule) fed to `tools/lint.mjs --stdin <path>` | each fail fixture reports its rule id once; each pass fixture 0 | TOOLS-GATE | T-fast | a rule's test function returns false -> its fail fixture green -> `lint.<rule>` red |
| AR-T06 | ER1 | def shape and no `era` key | `tests/arch/defs_shape.test.mjs` (+ `stat_helpers` equality) | `buildSimDefs()` (43 defs) vs `tests/golden/g3_defs.json` recorded from the baseline worktree; `M/R/S` from `stat_helpers.js` evaluated on all 43 rows | `JSON.stringify(def)` sha256 equal for all 43; `Object.keys(def)` first 27 keys equal in order; every appended key `undefined`; no `era` key; helper outputs deep-equal | REGISTRY | T-fast | stamp `era:'ancient'` in `normalizeDef` -> `defs.shape` |
| AR-T07 | ER1 | frozen constants | `tests/arch/frozen_constants.test.mjs` | Ancient table via `registry.statTable('ancient')` | recomputed `K` and six efficiencies `===` the constants of 3.1.7; `roleEfficiency('monster'/'beast'/'swarm') === melee` | SIM | T-fast | change `ANCIENT_K` by 1e-12 -> `frozen.k` |
| AR-T08 | ER1 | sim import switch | `tests/arch/sim_imports.test.mjs` | `src/sim/**` import list; baseline worktree `src/sim/defs.js` | imports equal the LR4 allowlist and the 7 rows of 3.1.7; `JSON.stringify(buildSimDefs())` equals the baseline worktree's | SIM | T-fast | restore `import ... era_ancient/stats.js` in `unit.js` -> `sim.imports` |
| AR-T09 | ER1 | Ancient literals | `tests/arch/ancient_literals.test.mjs` + `utility_units.test.mjs` | G3 id list; `src/sim/**`; LIT-ALLOW table | hits == allowlist (13 table rows -> 15 code lines + 3 throne lines + 9 mutator ids); utility units == `{battle_goat, sacred_chicken}` == `registry.UTILITY_UNITS`; expired rows fail | SIM | T-fast | add `'hoplite'` in `ai.js` -> `literal.new` |
| AR-T10 | ER1 | AP lint | `tools/ap_lint.mjs`, `tests/arch/ap_lint.test.mjs` | the real diff at HEAD; fixture repos for the 8 negative controls of 3.2.1; the table | HEAD: exactly `M tools/build.mjs` -> AP-T01, exit 0; the table covers every tracked in-scope file (824 at `4fe90f7`, recomputed) with 0 unmatched and 0 ambiguous | TOOLS-GATE | T-fast | each of the 8 fixtures must exit 1 with its message; deleting a table row -> `ap.unlisted` |
| AR-T11 | ER2 | id policy and tombstones | `tests/arch/registry_ids.test.mjs`, `tests/save/tombstones.test.mjs` | registry ids per kind; `TOMBSTONES` | regexes and prefixes of 3.3.1; reserved words rejected; 12 tombstone kinds present; no id live and tombstoned; G3 counts (43/7/16/16/41/4/254/9/6/24/9/27/10/8) | REGISTRY | T-fast | unprefixed new prop id -> `ids.prefix`; rename an Ancient unit -> `ids.ledger` |
| AR-T12 | ER2 | era precedence | `tests/arch/era_precedence.test.mjs` | worlds and setups per 3.4 | the five checks of 3.4; `World({era})` omitted -> v8 `stateHash` on a G1 case | INTEGRATION | T-era | derive `World.era` from the arena in the constructor -> `era.precedence` |
| AR-T13 | ER16 | save both directions | `tests/save/compat_both_ways.test.mjs` | fixtures `ancient_release_v8.mjs`, v1 blobs, share codes from the baseline; baseline `src/save/*` imported from the worktree | the seven rows of 3.5.4 | REGISTRY | T-full (fixture regeneration release-only) | bump `CURRENT.progress` to 3 -> baseline goes read-only -> `save.future`; add `gore:'auto'` enum -> `save.gore_import` |
| AR-T14 | ER16 | new-key guards | `tests/save/era_keys.test.mjs` | malformed `progress.eras`, `survival.eras`, daily rows, `seen.*`, `stats.eraStats` | caps of 3.5.2 (<= 8 eras, <= 200 beats, <= 400 callbacks, <= 64 stat keys per era) enforced; bad ids dropped; unknown keys survive a load | REGISTRY | T-fast | remove the `eras` clamp -> `keys.cap` |
| AR-T15 | ER16 | gore encoding | `tests/save/settings_gore.test.mjs` | settings blobs: fresh, `gore:'red'`, `'wine'`, exports | migration table of 3.5.3 exact; a new export imports in the baseline `validateSettingsData` | REGISTRY | T-fast | store `gore:'auto'` -> baseline import throws -> `gore.rollback` |
| AR-T16 | ER15 | router params | `tests/arch/router_params.test.mjs` | fake screens; briefing/results/map flows | 3.6.3 behaviours; history cap 20; TRANSIENT never pushed; existing `tests/ui` router assertions unchanged | REGISTRY | T-fast | push `prev.id` only -> `router.params` |
| AR-T17 | ER2 | facade | `tests/arch/facade.test.mjs` | `buildContent({eras:'all'})` with a fixture 2-mission era; `released=[ancient]` | `content.campaigns.ancient.missions === MISSIONS`; `campaign.missions.length === 9` when only Ancient is released; unknown/hidden id -> null; `nextAfter(ancient m9)` is null; stars write for a fixture era mission; unknown mission throws | INTEGRATION | T-fast | merge both mission lists into one -> `facade.next` |
| AR-T18 | ER2 | factories | `tests/campaign/factory_equiv.test.mjs` | fixture era raw data; Ancient daily lists | `validateMission` ok; `missionHash` equals the JSON hash; star 2 uses the era cost table (cost > 0); `createDaily('ancient').dailyPlan` equals v8 over 400 dates; fixture era plan stable over 400 dates | REGISTRY | T-fast | pass the Ancient table to the fixture era -> star 2 cost 0 -> `factory.cost` |
| AR-T19 | ER13 | `ensureEra` | `tests/arch/ensure_era.test.mjs` | 6 permutations of [medieval, modern, scifi] after ancient (fixture clip files for the new eras until real ones exist); G1 subset of 6 digests | idempotent (`already`, version unchanged); closure order canonical; `slotDigest` (sorted `ClipLib.ids/meta/owner/qualifiedIds`) equal across permutations; Ancient G1 digests identical with 0..3 other eras ensured in every order; Modern `stateHashFull` independent of the order; cost <= 150 ms Node per era; `ensure_era.js` contains no `.reset(`; after ensure no def requests a clip whose plain owner is `''` | INTEGRATION | T-era (ceiling re-measured release-only in Chromium: <= 300 ms) | register eras in entry order -> `ensure.order`; call `ClipLib.reset()` -> `ensure.reset` |
| AR-T20 | ER1 | G11 | `tests/golden/g11_clips.test.mjs` | baseline worktree | 3.7.7 digests equal; anchors 146/17/6/157/93/157 | TOOLS-GOLDEN | T-fast | reorder two `define()` calls -> `g11.owner` |
| AR-T21 | ER1 | G12 | `tools/golden/g12_view.mjs` (Chromium) | 3.7.7 scene | decision log equal in the same Chromium | TOOLS-GOLDEN | release-only | change `nearBudget` 140 -> 120 -> `g12.lod` |
| AR-T22 | ER2 | harness and `defsFor` | `tests/arch/harness_defs.test.mjs` | the 22 files of 3.7.3 | `DEFS` deep-equals baseline `buildSimDefs()`; `defsFor('ancient')` same keys in order; `defsFor(era)` always contains the two utility units; no file outside the table calls `buildSimDefs(`; `eachEra` suites build worlds via `buildWorld({era})` | TOOLS-GATE | T-fast | call `buildSimDefs()` in a new test file -> `harness.caller` |
| AR-T23 | ER13 | records and comparators | `tests/arch/records.test.mjs`, `tools/measure_divergence.mjs` | synthetic records; one Node and one Chromium run of 3 Ancient seeds | `assertComparable` throws across `engine`/`regime`; `compareStats` fails at 3.1 points / 2.1%; `firstDivergence` exact; measured first-divergence tick in [900, 2500] (q3_engine B1: seeds 1 and 3 by tick 1500, seed 2 by 2500) | TOOLS-GOLDEN | T-fast (synthetic), release-only (measurement) | compare a Node and a Chromium record as class (a) -> `records.cross_engine` |
| AR-T24 | ER2 | `_eras.mjs` | `tests/arch/eras_helper.test.mjs` | registry with a fixture era; `VW_ERA` values | zero-assertion era fails; list drift fails; `only` reports SKIPPED; unknown `VW_ERA` throws | TOOLS-GATE | T-fast | remove the counter -> `eras.zero_assert` |
| AR-T25 | ER2 | manifests and counts | `tests/arch/manifests.test.mjs` | 4 manifests + live data; constant `TARGETS` (plan section 1) owned by TOOLS-VERIFY | Ancient equals the exact numbers of 3.8.2; `building`: count <= expect; `complete`: equality; `expect` < target needs a `cuts` id present in `cuts.md` | TOOLS-VERIFY | T-fast | add a 44th Ancient unit -> `manifest.ancient` |
| AR-T26 | ER2 | ownership | `tests/arch/own_check.test.mjs` | OWNER-TABLE; fixture diffs | every tracked non-doc file has exactly one owner row (997 at `4fe90f7`, recomputed); a content role touching `tests/golden/**` fails; `docs/requests/**` always allowed | TOOLS-GATE | T-fast | delete OW-21 -> `own.orphan` |
| AR-T27 | ER22 | custom soldiers | `tests/editors/soldier/custom_era.test.mjs`, `u8_fuzz_era.test.mjs`, `tests/golden/g5_customs.json` | 200 baseline customs (`RNG(8008)`); 1,000 seeded `randomBlueprint`; per-era U8 (`U8_N`=5000) | all 200 `cost`/`power` equal; seeded random blueprints equal baseline; `listParts(cat)` default returns the 254 Ancient entries; unknown style throws in a new era and falls back to `slash` in Ancient; U8 efficiency <= 1.35 per era, 0 crashes | EDITORS | T-fast (200/1,000), T-era (U8) | filter `randomBlueprint` by all eras -> `custom.random` |
| AR-T28 | ER2 | errata | `tests/arch/errata.test.mjs` | code facts E1-E11 | each fact holds (e.g. 43/36/36/26 parts, `braceMul === 2.4`, `CUE_COUNT === 116`, 20 of 43 dps differ) | REGISTRY | T-fast | change `braceMul` -> errata test red (forces an errata update) |
| AR-T29 | ER2 | hot-file budget | `tools/hotfiles.mjs --check`, `tests/arch/hotfiles.test.mjs` | fixture git history | counts per hot file after `p1-done`; > 3 amber, `--release` red without a review entry | TOOLS-GATE | T-fast | 4th touch -> amber `hotfile.budget` |
| AR-T30 | ER14 | byte report | `tests/arch/size_report.test.mjs`, `build.mjs --report` | minified build of HEAD; fixture bundle | family sums within 0.5% of the 3.11.2 baseline on the Ancient-only tree; total includes hidden eras; FAIL > 5,000,000, WARN >= 4,500,000, WARN +300,000 per commit | TOOLS-GATE | T-full | strip a hidden era's import -> total must drop -> `size.hidden_counted` |
| AR-T31 | ER14 | hidden assets and file set | `tests/arch/hidden_assets.test.mjs` | full tree + fixture `eras.config.js` states | `[ancient]` build has 0 foreign rows/files; `[all]` has all; sum of `publishedFiles` + 383 <= 500 | AUDIO | T-full | ignore `status` in `build.mjs` -> `assets.hidden` |
| AR-T32 | ER2 | generated files | `tests/arch/gen_registry_check.test.mjs` | tree; tree plus a new fixture module file | `gen-registry.mjs --check` exit 0 on HEAD; exit 1 with a stale or missing file; second write run leaves mtimes unchanged | REGISTRY | T-fast | skip a group in the generator -> `gen.diff` |
| AR-T33 | ER1 | provenance | `tests/arch/provenance.test.mjs` | git, `release/v8/` | `ancient-v8` (or the sha) resolves to `4aafd2e3...`; `sha256sum release/v8/index.html` equals `PAGE.sha256` (3,106,540 B); `files.manifest.json` 382 entries, 10,979,932 B; before the first engine edit `git diff --stat ancient-v8 HEAD -- src` is empty | TOOLS-GOLDEN | T-fast | edit a byte of `release/v8/index.html` -> `prov.page` |
| AR-T34 | ER1 | fingerprints | `tests/arch/fingerprint.test.mjs` | temp copies of files | a new `src/sim/abilities/x.js` changes `simCore` (the old `simHash()` did not); a `src/render` edit changes only `renderHash`; an era text edit changes no `eraHash`; `era_ancient/stats.js` changes `eraHash(ancient)` only | TOOLS-GOLDEN | T-fast | list `src/sim/*.js` non-recursively -> `fp.abilities` |
| AR-T35 | ER21 | release-state matrix | `tests/arch/release_state.test.mjs` | fixture `eras.config.js` for the four states of 3.2.4 | `[ancient]`: 43/7/16/41/24 defs/factions/arenas/props/achievements and 0 foreign ids anywhere in the serialised content; each added state adds exactly that era; G10/G8 per state run by their own criteria | REGISTRY | T-era | read hidden eras in `buildContent` -> `state.leak` |

## 5. Residual ledger

Every residual or review item assigned to `spec/AR` (explicitly, or by the "answered only by deferring to a spec deliverable" list of `q1_disposition.md`). "Where" = section of this file. Items that are shared with another spec say which part is answered here.

| source id | requirement (short) | where | state |
|---|---|---|---|
| q3_engine r3 | `ensureEra(era,{humanoid})`: file, owner, injection, return, idempotence, canonical order, `bakeAll(filter)`/`registerAllClips({era})` change in `boot.js`+`dsl.js` | 3.7.1, AP-A01 | answered |
| q3_engine r4 | every entry point that calls `ensureEra` with the loading affordance; `harness.mjs:9` `DEFS` -> `defsFor(era)`; table of the callers with the era each passes | 3.7.2, 3.7.3 (22 rows, counted: 21 callers + definition) | answered |
| q3_engine r8 | AP lint as `git diff --name-status ancient-v8..HEAD` over `src tools assets`, seed list, strings (Moon Gravity, typeCap copy) | 3.2.1-3.2.3: every seed file has a row (dry run: 70 rows, 824 tracked in-scope files, 0 unmatched, 0 ambiguous); `assets/files.json` does not exist (PC11); "Moon Gravity" -> DA-5/`mutators_text.js` FZ; typeCap copy -> DA-4 and `strings.js:111` built from the constant (AP-I01) | answered |
| q3_engine r9 | what G11 hashes | 3.7.7 | answered |
| q3_engine r10 | G12: Chromium-only, fixed camera/focus/`dt`, spy on `VoxSkin.add`, recorded before any LOD extraction | 3.7.7 | answered |
| q3_engine r23 | corrected utility-unit allowlist and the Ancient literals with kit replacements; id policy for unit, faction, arena/recipe, projectile, clip, rig | 3.3.1, 3.3.2 | answered |
| q3_engine r24 | `statsToUnitDef(cs,{era})` contract, throw on unknown style, `legalAbilities`, `validate.js`/`custom.js` read per-era rows, golden of 200 Ancient costs in the same test as per-era calibration | 3.9.1-3.9.3 | answered |
| q3_engine r38 | `registry.verify()` checks `def.model.rig`, `PROJ_FX/PROJ_VIS/audio` rows per `ranged.proj`, ability `cause` in the closed vocabulary | 3.1.3 (V05, V07, V08) | answered |
| q3_engine r5 (RA/M, shares an AR test) | plain clip slot ownership, both-orders registration test | 3.7.1 order test, AR-T19 | answered here; rule text owned by spec/RA |
| q3_engine r33 (RA) | `ClipLib.reset()` must not be called by `ensureEra` | 3.7.1, AR-T19 | answered |
| q3_engine r39 (M) | `World({era})` read once, kit tables bound there, `env.era` visual only, with a test | 3.4, AR-T12 | answered here; sim code is spec/M |
| q3_engine B1/r1/r2 (VF) | comparator classes, engine tag on records, 8-of-10 seeds in both engines | 3.7.5, AR-T23 | interface answered; criteria rows are spec/VF |
| q3_program r13 | `seen.whatsnew_v2` replaced by the per-release key; migration for a profile that dismissed an earlier card | 3.5.2 (`seen.whatsnew`), PC7: no code ever wrote `whatsnew_v2` (grep of `src` is empty), so there is nothing to migrate; unseen = released eras without a key | answered |
| q3_program r21 | build omits hidden-era audio rows from `__VW_MANIFEST__` and `files`; hidden code and data stay in the bundle and byte count | 3.11.2, 3.11.3, AR-T30, AR-T31 | answered |
| q3_program r3, r4 (VF) | provenance terminal branch; literal file lists of `engineHash`/`eraHash` | 3.11.4 (byte match achieved, no fallback needed), 3.7.6 | answered here; record schema/criteria rows spec/VF |
| q3_program r10, r11 (VF) | `files.json` map vs `files.manifest.json`; G5 rollback round trip with the new keys | 3.11.3, 3.5.4 | answered here |
| q3_program r12 (CU) | aggregates over RELEASED eras only | 3.2.4 (R-PARITY, release-state matrix), AR-T35 | rule answered; per-surface rows are spec/CU |
| q3_program r20 (M) | `ensureEra` order-independence test: Ancient G1 digests with 0..3 other eras in every order | AR-T19 | answered |
| q3_product r11 | router `{id, params}` change precisely, with a test per screen | 3.6.3, AR-T16 | answered |
| q3_product r14 | `seen.callbacks[sourceId]` key and ledger columns | 3.5.2 | answered (counts and per-era split are spec/H) |
| q3_product r26 | per-slot decomposition of "about 120 workshop parts" next to Ancient 254, floor 90 rule | 3.9.4 | answered as a proposal; CU may amend by logged amendment before E-FREEZE |
| q3_product r33 | app-layer Ancient imports (`meta.js`, `title.js`, `ui/strings.js:38,313`, `campaign.js` screen) with a policy each | 3.10.3 | answered |
| q3_product r4, r5, r6, r13 (CU) | gore consumers, down-level policy, flow-table deep link = router params, Daily default | 3.5.3, 3.6.3, 3.6.2 | storage and mechanism answered; UI texts spec/CU |
| q2_engine Q3 | era-aware custom soldiers, per-era rows via the registry, Ancient byte-identical | 3.9 | answered |
| q2_engine Q6 | `power.js` ownership and files | 3.9.3, AP-S09, AR-D20 | answered (rating terms are spec/M) |
| q2_engine Q11 | freeze/verify, version-keyed caches, DAG test in Node/esbuild, committed generated files, hidden eras in the byte count | 3.1.3, 3.1.4, 3.1.10, 3.11.1, 3.11.2 | answered |
| q2_engine Q12 | shared files in the AP table with G11/G12; R11 keeps the unit-count rule on the Ancient path | AP-A02, AP-R02, AP-C03, 3.7.7 | answered |
| q2_engine Q14 | `ensureEra` mechanism, cost and ceiling, alternating-era soak | 3.7.1 (ceilings 150/300 ms); soak is spec/VF ER13 | answered |
| q2_engine Q15 | one era-precedence rule, utility units allowlisted and tested | 3.4, 3.3.2 | answered |
| q2_engine Q18 | per-era warm rosters as data | 3.3.2 (`WARM`), AR-D14 | answered (generation rules spec/M D-M25) |
| q2_engine Q19, Q20 | `N_SE` in the Ancient A/B; defs shape test | AP-S03, AR-T06 | answered |
| q2_schedule Q15 | owner table (file -> role -> cadence), one INTEGRATION owner, data-in-packs, touch budget | 3.10.4 | answered |
| q2_schedule Q16 | ratchet policy: Ancient fixes optional and in the AP table | 3.2.3 (only DA-1..DA-6), baselines for uiscan/readability are spec/VF | answered |
| q2_schedule Q17 | staging/rollback, server-side file count, hidden-era leftovers | 3.11.3 | answered (runbook is spec/VF) |
| q2_schedule Q6, Q2 | two fingerprints; provenance | 3.7.6, 3.11.4 | answered here; amber/red policy spec/VF |
| q2_schedule Q9 | E-FREEZE sets, inertness | not assigned to AR; `eraHash` of 3.7.6 is the input to spec/M and spec/VF | n/a |
| q1_disposition (spec A list): ENGINE-Q4, VERIFY-Q2, SCOPE-Q5 | Ancient-policy table incl. lazy-crater, `structDmg`, gate ownership, buffer aliasing, bug-fix decisions | 3.2.2 (AP-S04, S06, S07: all opt-in), 3.2.3 DA-6 (none elected) | answered; the C8 contradiction is closed: the number of deliberate deltas is the six rows of 3.2.3 (DA-1..DA-3 planned, DA-4..DA-6 conditional) |
| q1_disposition: ENGINE-Q33, SCOPE-Q27 | errata table | 3.10.1 (E1-E11) | answered |
| q1_disposition: ENGINE-Q38 | hard-coded Ancient literal list and kit replacements | 3.3.2 | answered |
| q1_disposition: ENGINE-Q29 | registry DAG, merge kinds, ordering | 3.1 | answered |
| q1_disposition rows naming A1..A7: ENGINE-Q5, ENGINE-Q11, ENGINE-Q30, PRODUCT-Q10, PRODUCT-Q18, PRODUCT-Q26, VERIFY-Q3, VERIFY-Q8, VERIFY-Q29, VERIFY-Q34, SCOPE-Q13, SCOPE-Q16, SCOPE-Q19, SCOPE-Q30, PRODUCT-Q32, CONTENT-Q30 | era argument default ancient; kit holds pacing and gravity; scoping stops mixing; router; share-code edges; provenance; ownership of thresholds; `eachEra`; memory per era; hidden test work (`mockctx` era mode, central paths); per-family bytes and the +300 KB advisory; documented rollback; boot and first-sight cost | AR-D02, `kit` rows in 3.1.2 (`KIT` byEra), 3.4, 3.6.3, 3.5.4, 3.11.4, 3.8.3, 3.8.1, 3.7.1 + soak (VF), AP-I06 and `tools/lib/paths.mjs`, 3.11.2, 3.11.3, 3.7.1 | answered |
| q1_scope Q4 | isolation model, generated files, one editor per hot file, patch-request path | 3.11.1, 3.10.4, 3.8.3 (`own_check`) | answered |
| q1_scope Q5, Q24 | Ancient identity vs fixes; Ancient UI/pixels goldens | 3.2 (AP, DA, R-PARITY), G8/G10 per release state | answered |
| q1_scope Q7 | foundation (factories, validator, era layer) placed before content | 3.6 defines the factories as P1 REGISTRY deliverables (owner table OW-11); scheduling is `wbs.csv` | answered here |
| q1_scope Q13, Q16, Q28, Q29, Q30 | hidden work in tests/tools, page size, G5 fixtures, id-name collisions, startup cost | 3.7.3 + 3.8.1, 3.11.2, 3.5.4, section 1 (this file uses AR1..AR9 and AP; `A1` is not used), 3.7.1 | answered |

## 6. Plan corrections (the plan or a map disagreed with the code; the code and the stated resolution win)

| # | plan or map text | evidence | resolution |
|---|---|---|---|
| PC1 | M1 / `spec/M`: `unitinfo` imports `dpsOf` from `power.js` (one definition) | `ui/unitinfo.js:60` is `max(melee dmg/cd, ranged dmg/cd)`; `sim/power.js:8-12` is `(hi + 0.3 lo) x (1 + 0.25 sizeFactor)` with `volley`. Probe `scratchpad/dps.mjs`: they differ on 20 of the 43 Ancient defs (`peltast` 8.67 vs 7.00, `cretan_archer` 9.93 vs 8.13, `companion_cavalry` 18.15 vs 16.50, `pilum_thrower` 12.00 vs 10.00). Importing would change the Codex numbers of 20 units (G10) | display formula kept (AR-D20); spec/M D-M26 already agrees (`dpsDisplay`) |
| PC2 | AR1: "`buildSimDefs`, `defsOr`, `K`, `roleEfficiency` throw if used before freeze" | 21 callers call `buildSimDefs()` with only `sim/defs.js` imported (3.7.3); a freeze owned by the pack loader (which imports sim) would be a cycle | seal at registry evaluation, freeze in `packs.js` (AR-D01) |
| PC3 | map 01 seam 1: `normalizeDef` stamps `era` and `TOP_KEYS` gains `era` | plan 0.2 requires `JSON.stringify(def)` unchanged and q2_engine Q20 warns about `Object.keys(def)` consumers; spec/M D-M3 chose "no era key" | no `era` key; side map `registry.eraOf` (AR-D03) |
| PC4 | map 01 4D: merge defs, "Ancient entries first so key order is unchanged" as the default of `buildSimDefs` | `'mixed'` pool is used by 27 test/tool sites and 24 src files; plan 0.2 says every new behaviour defaults to legacy | legacy default `ancient`; merged only on request (AR-D02) |
| PC5 | AR9: era-aware `listParts` for the Workshop | `blueprints.js:171-176` `randomBlueprint` picks from `Object.keys(PART_REGISTRY[cat])` and `PALETTES[Math.floor(rng.next()*len)]`: adding parts or palettes changes every seeded Ancient random soldier (U8 fuzz, G5) | `randomBlueprint`, `listParts`, `defaultBlueprint` take `{era}`, default ancient filters to the original entries (3.9.3, AP-C03) |
| PC6 | section 3: a single `engineHash` that includes shared render-affecting data | any render edit would amber every sim record | `{simCore, shared}` plus `renderHash` (AR-D17, 3.7.6) |
| PC7 | AR4 / q3_program r13: `seen.whatsnew_v2` | `grep -rni whatsnew src` is empty: the key never existed | `seen.whatsnew.<era>` only |
| PC8 | AR4 / CU4: `settings.gore` gains the value `auto` | `transfer.js:51-71` throws on an unknown `gore`; a rolled-back v8 build would reject its own export | `goreAuto` boolean beside the legacy enum (3.5.3); open item OI-2 |
| PC9 | AR4: `stats.campaign.completedEras` and new stats keys are saved | `stats.js:30-52` `normalizeStats` drops unknown keys in v8 on every load/import | `completedEras` is a derived cache; `eraStats` is the one documented rollback loss (3.5.2) |
| PC10 | section 3 AP lint scope `src/ tools/ assets/` | `package.json` `version` feeds `__VW_VERSION__` (`build.mjs:32`) and the Diagnostics line; `package-lock.json` must not change; golden edits need log entries | scope `src tools assets package.json package-lock.json` plus the golden-hygiene rule (3.2.1) |
| PC11 | q3_engine r8 seed list includes `assets/files.json` | `git ls-files assets` shows no such file; `dist/artifact/files.json` is generated (dist ignored); `release/v8/files.json` is rollback material | not in the AP table by design (E7) |
| PC12 | AR2: abilities and projectile kinds carry era prefixes | `call_strike` is shared by Modern (artillery) and Sci-Fi (orbital); spec/M D-M18 and 3.3 define 3 engine ability ids and unprefixed projectile kinds as SIM vocabulary | prefix applies to pack data, not to engine vocabularies (AR-D06) |
| PC13 | map 08 seam 16 `defsFor(era)` "filtered by `def.era`" vs map 01 seam 8 "never filter defs" | there is no `def.era` (PC3); `World` needs `battle_goat`/`sacred_chicken` in every era | `defsFor(era)` = era defs plus utility units (3.7.3) |
| PC14 | AR6: `ensureEra` "warms its roster" synchronously | `warmup.js` runs a 420-tick battle in `step(budgetMs)` slices; synchronous would exceed any ceiling | tables and clips only; warm-up stays time-sliced (3.7.1) |
| PC15 | map 08: contracts `--strict` is not in the gate | `node tools/contracts.mjs --strict` prints `contracts OK (43 units, 16 arena presets, 0 soft finding(s))` on HEAD | the gate passes `--strict` from the first gate edit (3.8.4) |
| PC16 | `save/tombstones.js` header: a test fails when an id is both live and tombstoned | `tests/save/tombstones.test.mjs` does not exist | created (3.3.1, AR-T11) |
| PC17 | plan section 12 / q2_schedule C4: `world.js` owner is ambiguous | `src/sim/world.js` (SIM) vs `src/world/*` (WORLD) | disambiguated by path in the owner table (OW-01, OW-02) |

## 7. Open items

Each has an owner and a deadline phase; none blocks the first engine edit.

| # | item | owner | deadline |
|---|---|---|---|
| OI-1 | the `manifest.expect` text-layer numbers (`tips`, `announcerEffective`, `scoutCodes`, briefings/victory/defeat/star-line counts, `workshopParts` per slot) must equal the final tables of spec/H and spec/CU; until then the manifests carry the plan section 1 numbers and `plan_lint` compares them | COMEDY-EDITOR and DESIGN-UX | P0 exit (spec/H and spec/CU final) |
| OI-2 | spec/CU CU4 wording "gore gains `auto`" is implemented as the `goreAuto` boolean (PC8); CU must adopt the control wording (an "Auto" option over `goreAuto`) and the share-code field encoding | DESIGN-UX | P0 exit (spec/CU final) |
| OI-3 | spec/CU CU16 must confirm that the "Moon Gravity" rename is an era-scoped display name (Ancient string untouched, `mutators_text.js` FZ) or invoke DA-5 with its re-record | DESIGN-UX | P0 exit (spec/CU final) |
