# spec/VF-impl: implementation notes of the verification tools (one section per tool package, appended by its builder)

## T1 TOOLS-GOLDEN: provenance, fingerprints, records, statwalk, build manifest (2026-10-08)

Owner: TOOLS-GOLDEN (VO1). Spec: VF 3.1, 3.5, 3.6.1, 3.7, 3.10; AR 3.7.5, 3.7.6, 3.11.3, 3.11.4. Every tool has `--help` where it has a CLI, deterministic output, and exit codes 0 ok / 1 check failed / 2 usage.

### Files

| path | what |
|---|---|
| `tools/lib/fingerprint.mjs` | `engineHash(root) -> {simCore, shared}`, `renderHash(root)`, `eraHash(era, root)`, `fingerprint(root, eras)`, `describe(kind, root, era)` (file list + unmatched patterns), `hashFiles`, glob helpers; CLI `node tools/lib/fingerprint.mjs [--root=dir] [--era=a,b] [--list=simCore\|shared\|render\|era:<id>] [--json]` |
| `tools/lib/records.mjs` | `makeRecord`, `validateRecord`, `writeRecord`, `readRecord`, `canonicalJSON`, `assertComparable`, `CrossEngineError`, `compareStats`, `legacyCompareStats`, `firstDivergence`, `marginCheck`, `classifyRecord`, `markStale`, `landingsCount`, `selectWitnessSample`, `refreshRecord`, `engineMajor` |
| `tools/records.mjs` | `check [--era=] [--scope=ancient,medieval\|all] [--frozen=ids] [--mark] [--strict] [--root=] [--json]`: the gate step `records`. Finds new-style records (`tests/campaign/feasibility.<era>.json`, `docs/balance/<era>.json`, `tests/campaign/era_fingerprint.<era>.json`, `.cache/gate/perf.<engine>.json`), classifies each with `classifyRecord`, ignores legacy files (no `schema`, or `legacy:true`), reports malformed or wrong-kind files as red. The STALE-ENGINE witness is the list of commands in `tests/golden/witness.json` (`{"<era>": [["node","tests/golden/g1_sim.test.mjs","--core"], ...]}`); no file, no entry or a failing command is NOT green (fail closed). `--mark` writes `staleSince` (starts the age clock; the gate runs in a snapshot without it), `--strict` makes amber red (release). `refresh` is not offered yet (see Left) |
| `tools/lib/statwalk_core.mjs`, `tools/lib/statwalk.mjs` | the witness walker (core is import-free, so G1 Chromium/G6 can bundle it into a page); `statwalk(w) -> uint32`, `statwalkDetail(w) -> {hash, nan, inf, units, projectiles, effects, props}`, `createStatwalk(spec)`, `loadSpec()` |
| `tests/golden/v8_fields.json` | the FROZEN field lists (recorded from the baseline by `node tools/golden/v8_fields.mjs`; `--check` re-records into memory and compares) |
| `tests/golden/fp_ancient_v8.json` | the fingerprint DEFINITION applied to the baseline (file lists + hashes; `node tools/golden/fp_record.mjs [--check]`): a change of the pattern tables turns `VF-L01/pin_*` red until re-recorded with two signers |
| `tests/golden/legacy_hash.mjs` | `legacyStateHash(w)`: verbatim body of `World.stateHash()` at 4aafd2e (VF 3.6.1); G1 asserts it equals `w.stateHash()` |
| `tools/golden/baseline.mjs` | `loadBaseline({regime})` imports the baseline's own `harness.mjs`, `World`, `ClipLib`; refuses unless the worktree HEAD is 4aafd2e3...; `baked` calls `registerAllClips` exactly like `app/main.js`; one regime per process; `assertBaseline`, `headOf`, `BASELINE_SHA`, `BASELINE_WORKTREE` (under `MAIN_ROOT`, so it works inside a gate snapshot) |
| `tools/provenance.mjs` | VF 3.5 (below) |
| `tools/lib/pack.mjs` | read the Artifact fragment: `extractPack`, `splitPayload`, `describePack` (also usable by `readback.mjs`) |
| `tools/lib/negctl_lite.mjs` | per-file runner of the VF 3.13 negative-control contract, used to PROVE the negctl files below; `tools/negcontrols.mjs` (TOOLS-VERIFY) supersedes it for sampling, tiers, jobs and the result store |
| `tools/build.mjs` | now also writes `<out>/artifact/files.manifest.json` = `{path: {sha256, bytes}}` in `files.json` key order, compact JSON (the byte format of `release/v8/files.manifest.json`) |

### Fingerprints (AR 3.7.6)

Each hash = sha256 over the sorted lines `path\0sha256(bytes)\n` (repo-relative `/` paths, plain string sort). Tables are exported (`SIM_CORE`, `SHARED`, `RENDER`, `ANCIENT_ERA`, `ERA_PRESENTATION`, `ERA_TEXT_KEEP`). `src/sim/**` is recursive (30 ability files on the baseline). Patterns that match nothing are not errors (the baseline has no `registry.js`); `describe().unmatched` lists them and `tests/golden/fp_ancient_v8.json` pins which ones are unmatched today. Ancient `eraHash` uses the explicit AR list; every other era uses the generic rule: `src/content/era_<e>/**` minus `humor units beasts parts props/models` and `*_text.js` (except `sim_text.js lesson_text.js campaign_text.js`), plus `src/anim/clips/<e>/**`, plus from `manifest.js` (read statically by `manifestList`, string literals of `rigs: [...]` and `abilities: [...]`) the files `src/anim/clips/<rig>.js` and `src/sim/abilities/<name>.js`. Observation for DESIGN-ARCH: `puzzle_solutions.js`, `custom.js`, `content.js` of `era_ancient` are not in the explicit Ancient list (the glob `puzzles*.js` does not match `puzzle_solutions.js`); G6 replays the puzzle solutions, so a change there is still caught by G6, but not flagged as an `eraHash` change.

### Records and states (VF 3.1, 3.7, 3.10)

`makeRecord(kind, data, {engine, regime, engineVersion?, root?, eras?, render?, tag?, fingerprint?})` -> `{schema:1, kind, engine, engineVersion, regime, engineHash, renderHash?, eraHash, tag, sha, dirty, box:{cpus,platform,arch}, data}`. `engine` and `regime` are mandatory (no default), a Chromium record must give its version, `data` may not contain `undefined`/`NaN`/`Infinity`. Files are written canonically by `writeRecord` (sorted keys, short number arrays inline, trailing newline, not rewritten when identical). `classifyRecord(rec, cur, {era, witness, required, frozen})` returns `CURRENT | STALE-ENGINE (amber) | RED-WITNESS | RED-ERA | RED-AGE | MISSING`; `witness` (boolean or function) is required whenever the engine differs; goldens have no stale states (a golden kind throws). Age: `staleSince:{landing, at}` is set once by `markStale`; red when more than 6 landings (`docs/eras/ledger/landings.jsonl` lines, `landingsCount`) or more than 4 calendar days. `refreshRecord(rec, cur, {era, treeHash, witnessSet, rerun, name, now})` implements the witness refresh: needs `rec.data.battles = [{id, tuple:[win,endTick,stars,endDigest]}]`; samples 30 with a shuffle seeded by sha256(eraHash + treeHash); rewrites only `engineHash`, appends `witness`, drops `staleSince`; returns `logLine` for `golden_log.md`; `perf` and `readability` records are never refreshed. Comparators: `assertComparable(a, b, 'a'|'b'|'c')` (class (a) throws `CrossEngineError` on engine / engine major / regime; class (b) needs the same build), `compareStats` (PC-1 amended: fail when the difference exceeds both the floor and 2.58 SE; measured by simulation in the test: identical pairs pass 97.7-98.3% at n = 200, the original 3-point/2% rule passes 21.8-24.1%), `firstDivergence`, `marginCheck` (>= 8 of 10 in every listed engine).

### statwalk (VF 3.6.1 "walk")

Reads only the frozen lists of `v8_fields.json`: every unit of `w.units` (125 fields), active projectiles of `w.proj.list` in pool order (32), `w.effects` (9), props (`hp`, `dead`), `rng.s`, `tickN`, and the FNV of `arena.h`. Values are typed at run time; objects with a primitive `id` hash by id; `unit.anim` and the per-ability state keys (`unit.abil.st[<ability id>]`, 27 abilities) have frozen nested key lists. Numbers hash by exact float64 bits (-0 folded), stricter than the legacy hash; NaN and +-Infinity are tagged and counted (`nan`, `inf`). Fields added by later modules cannot move it (test `VF-L02/extra_field_inert`).

### provenance.mjs (VF 3.5)

`--check [--engine=unchanged|any]`: 16 rows (commit present, tag, page sha256 and size against `PAGE.sha256` and the pinned constants, files.json / files.manifest.json shape, 382 files / 10,979,932 B, every entry equal to `assets/` on disk, payload 4,388,731 B / prefix 812e57ae8125d420 / build date 2026-10-08, baseline worktree HEAD and its two symlinks, and `engine_unchanged`: simCore, shared and eraHash(ancient) of this tree equal the baseline's). `--engine=any` records the comparison but does not fail on it (use it after the first engine edit; `p0_exit --engine-edit` uses the default). `--payload <readback.html>`: component-wise comparison of a hosted read-back (or a fragment) with `release/v8/index.html` (payload, manifest, credits, core audio, UAL clips, files list, bundle, `<style>`, both loaders, build date, verbatim fragment embedding with skeleton length). `--rebuild [--candidates=N] [--rev=sha]`: exports each candidate commit with `git archive` into `.cache/provenance/`, builds it with `VW_BUILD_DATE` read from the v8 payload (for revisions older than `d9f663a` the override is injected into the throwaway copy), and compares with `cmp`, then by component. Measured: `d9f663a` and `4aafd2e` are cmp-identical; `5d61f0e` differs in `bundle` (as expected: it is older). Git history is read from `MAIN_ROOT`.

### Tests and negative controls

| criterion | file | negctl | tier | seconds | red label of the control |
|---|---|---|---|---|---|
| VF-L01 fingerprints | `tests/golden/lib.test.mjs` | `tests/negctl/VF-L01.mjs` | F | 6 (whole file) | `VF-L01/recursion` |
| VF-L02 statwalk | `tests/golden/lib.test.mjs` | `VF-L02.mjs` | F | | `VF-L02/extra_field_inert` |
| VF-T02 records policy (VF names `tests/verify/records_policy.test.mjs`) | `tests/golden/lib.test.mjs` | `VF-T02.mjs` = NC-VF-62 | F | | `VF-T02/compare_stats/identical_pairs` |
| AR-T23 comparators, synthetic part (AR names `tests/arch/records.test.mjs`) | `tests/golden/lib.test.mjs` | `AR-T23.mjs` | F | | `AR-T23/records.cross_engine` |
| VF-L03 files.manifest.json | `tests/golden/lib.test.mjs` | `VF-L03.mjs` | F | | `VF-L03/exists` |
| VF-L04 the build reproduces v8 | `tests/golden/lib.test.mjs` | `VF-L04.mjs` | F | | `VF-L04/fragment_identical` |
| VF-T01 provenance tool | `tests/verify/provenance_tool.test.mjs` | `VF-T01.mjs` = NC-VF-61 | F | 17 | `VF-T01/provenance/page_sha` |
| VF-L05 negctl_lite | `tests/golden/negctl_lite.test.mjs` | `VF-L05.mjs` | T-full | 2 | `VF-L05/stayed_green` |
| VF-L06 `tools/records.mjs check` | `tests/golden/records_cli.test.mjs` | `VF-L06.mjs` | F | 5 | `VF-L06/malformed` |

VF-L03/L04 build the BASELINE sources (`.cache/baseline/ancient-v8/src`) with this tree's `tools/` in a throwaway directory (never `dist/`), `VW_BUILD_DATE=2026-10-08`: the fragment, `files.json` and `files.manifest.json` must be byte-identical to `release/v8/`. They stay red if a later build change alters the bytes of an Ancient-only build; that is intended (ER24). Labels are `<area>/<name>`; the criterion id prefixes them in `expectRed`. Run a control: `node tools/lib/negctl_lite.mjs VF-L01 [more ids] [--json]` (all nine are red-as-expected; they need `.cache/baseline` and `node_modules`).

### Left / for others

`records.mjs refresh <file>` needs a replayer per record kind (`tools/lib/replay_<kind>.mjs`: re-run a stored battle `{id, tuple}` on the current tree); the library function `refreshRecord` is done and tested, the replayers arrive with the feasibility recorder (TOOLS-VERIFY / BALANCE). `tests/golden/witness.json` is created by the G1 and G6 work packages (their test commands are its content; until then a stale record is RED-WITNESS by design). G1..G12 recorders, `lint_records.mjs` (write guard for files that bypass `makeRecord`) and the `golden_log.md` automation are the next TOOLS-GOLDEN work packages. The criteria client is `tests/lib/criteria.mjs` (created by TOOLS-GATE; `c.check` throws, `c.soft` collects, failures are recorded as the bare label).


## T2 TOOLS-GATE: lane scheduler, snapshots, closure cache, in-process syntax, private build (2026-10-08)

Owner: TOOLS-GATE (VO2). Spec: VF 3.8 (gate engineering), 3.4 (criteria merge), 3.13 (negctl files); AR 3.8.4, 3.11.1, 3.11.2; map 08 seams 1-4, 10. Every tool below has `--help`, deterministic output (ordering is by declaration, not completion; only seconds and ids vary), exit codes 0 green / 1 red / 2 usage. Numbers: `docs/eras/perf_log.md` section G1.

### Files

| path | what |
|---|---|
| `tools/gate.mjs` | the gate: flag parsing, plan, snapshot, scheduling, report, `gate_log.jsonl`, `last.json`, `criteria.json`. `--legacy` runs the old sequential gate unchanged |
| `tools/lib/gate_legacy.mjs` | the pre-lane gate of release v8, verbatim (root path and header comment are the only edits). `node tools/gate.mjs --legacy --fast` = the old `--fast` |
| `tools/lib/lanes.mjs` | `runTasks(tasks, {jobs, browsers, serialMode, bail})` (CPU units, weights, serial group, browser cap, deps, longest-first, retry-alone, retry-on-timeout) and `runProc` (process group, timeout kills the group, failure-line capture) |
| `tools/lib/snapshot.mjs`, `tools/treehash.mjs` | `SNAP_INCLUDE`, `treeHash(root)`, `treeHashOfRev(rev)`, `makeSnapshot(root, {rev})`, `pruneSnapshots`; CLI prints the hash, `--snapshot` creates `.cache/snap/<treeHash>/` |
| `tools/lib/gate_cache.mjs` | closure analysis (per-file facts memoised in `.cache/gate/facts.json`), `cacheKey`, `cacheGet/Put/Prune`, `makeExternalHasher`, `seededSample` |
| `tools/lib/syntax.mjs` | `checkSource`, `syntaxStep`, `syntaxNegativeControl`; CLI `node tools/lib/syntax.mjs [--nc]` |
| `tools/lib/criteria_merge.mjs` | gate-side merge of the per-process criteria lines into `.cache/gate/criteria.json` (rules U2-U5; U1 and the ER roll-up wait for `report.mjs --scan`) |
| `tools/lib/size_budget.mjs`, `tools/lib/families.mjs` | `checkBudget` (5,000,000 B fail, 4,500,000 warn, 500 files incl. the page, +300,000 B advisory) and the byte-report family map (AR 3.11.2) |
| `tools/lib/paths.mjs` | `ROOT`, `MAIN_ROOT`, `GATE_DIR`, `SNAP_DIR`, `CHROMIUM`, `CHROMIUM_ARGS`, `eraDirs()` (AR 3.11.4; the other tool packages import it) |
| `tools/build.mjs` | `--out=<dir>` private build, `--report`, `--budget`, `--quiet`, `--help`; strict CSS list; sibling `files.manifest.json` goes to the chosen directory; unknown options exit 2 (the dead `--no-sourcemap` is gone) |
| `tools/gen-registry.mjs` | `--check` (the `gen-check` step), `--out=<dir>`, `--help`; identical files are not rewritten |
| `tests/lib/criteria.mjs` | criteria client with the VF 3.4 API (`criterion`, `check`, `soft`, `assert`, `skip`, `done`); one JSON line per criterion at exit to `$VW_CRITERIA_OUT` |
| `tests/fixtures/syntax_bad/*.js` | the six negative-control files: duplicate `let`, bad regex flag, unclosed brace, duplicate export, `await` in a non-async function, legacy octal |
| `tests/gate/*.test.mjs` (GATE-T01..T09), `tests/negctl/GATE-T0*.mjs` | the tests of the gate itself and one proven negative control each (NC-VF-56, NC-VF-59, NC-VF-06 are among them) |
| `docs/requests/tools_gate_step_contract.md`, `tools_flaky_browser_tests.md` | calling convention for the gate steps other roles own; the two flaky browser tests |
| `tests/{anim/perf,audio/browser,audio/synth,ui_battle/hud,ui/ui4_keyboard}.test.mjs` | one first-line comment `// @serial` each (no rename; see Deviations) |

### CLI (full text: `node tools/gate.mjs --help`)

`--tier=fast|era|full|release` (default `full`, as the old unflagged gate; `--fast` = `--tier=fast`), `--era=<id[,id]|all>` (validated against `src/content/era_*`, exported as `VW_ERA`), `--steps=a,b` (+ transitive dependencies; groups `tests`, `serial`, `browser`), `--only=<substr>` (old meaning: lint + syntax + matching tests), `--dist=<dir>`, `--jobs=N` (default cpus-1), `--browsers=N` (default 2), `--serial=parallel|after`, `--snapshot|--no-snapshot`, `--no-cache`, `--verify-cache`, `--retry-serial|--no-retry-serial`, `--bail`, `--keep-dist`, `--list [--json]` (print the plan, run nothing), `--json` (one object on stdout, progress on stderr), `--verbose`, `--legacy`. Unknown flag, tier, era, `--jobs=0`: exit 2 with the usage text.

### Tiers and steps

| step | kind | fast | era | full | release | notes |
|---|---|---|---|---|---|---|
| `lint`, `syntax-nc`, `syntax`, `gen-check` | in-process / 1 process | x | x | x | x | `syntax` depends on `syntax-nc` |
| `ap`, `own-check`, `records` | optional tools (`tools/ap_lint.mjs`, `tools/own_check.mjs --any`, `tools/records.mjs check`) | x | x | x | x | `SKIP  <name>  tool not built yet` until the file exists; then they run with no gate edit |
| tests | pool + serial worker | fast tests | fast tests | + slow/fuzz/balance paths | same, cache off | slow = path matches `/slow\|fuzz\|balance/` (unchanged rule) |
| `contracts` | process | `--strict` | | | | |
| `build`, `size` | process, in-process | minified, `--out=<private dist>`, `--report` | | | | `size` reads `<dist>/report/bytes.json`, applies `checkBudget`, appends `.cache/gate/bytes.json` |
| `smoke-standalone`, `smoke-fragment`, `modes` | browser lane | | x | x | x | run against the MINIFIED private pages (the old gate ran the unminified build) |
| `tour`, `flow` | browser lane | | | x | x | |
| `campaign_play`, `uiscan`, `pack_check`, `leak_scan`, `negcontrols`, `readability`, `perf_assert`, `soak` | optional tools | | `campaign_play`, `uiscan` | + `pack_check`, `leak_scan`, `negcontrols --sample=10% --seed=<tree prefix>` | + the rest, `negcontrols --all` | convention below |

### Lanes

* CPU budget `--jobs` units; a Chromium test (import graph reaches `playwright-core`) or browser step takes 2 units; a task heavier than the budget runs alone. Ready tasks start longest-estimate-first (median of the last 5 runs from `.cache/gate/test_times.json`, unknown files first at 25 s).
* Serial group = files with `// @serial` or the suffix `.serial.test.mjs`: one at a time on a dedicated worker (`--serial=parallel`, default, costs no CPU units) or alone after the pool drains (`--serial=after`). A failed serial test is re-run alone before it counts (`--no-retry-serial` turns that off); the log says `retried`.
* Every test is also re-run alone once if it hits its time limit. The limit is 6x the median of its last runs (min 90 s, max 600 s; 600 s without history) so a hung Chromium page costs minutes, not ten.
* A failed dependency (`build`) turns its dependents into `SKIP (blocked)`. Children run in their own process group; a timeout and the end of every task kill the whole group; SIGINT/SIGTERM of the gate kills all children and removes the private dist. Peak concurrency is recorded (`peak` in the log line, asserted by GATE-T02).

### Snapshots

`tree hash` = sha256 of `path\0sha256(content)\0exec` for the include set (`src/ tools/ tests/ package.json package-lock.json assets/{audio,anim,vfx,manifest.json,CREDITS.md} release/ docs/*.md docs/*.json docs/eras/ docs/spec/ docs/requests/`, from `git ls-files -co --exclude-standard`, directory walk when there is no git). The gate copies exactly that set (reflink when the filesystem has it, never hard links: a write in a snapshot must not reach the shared tree) to `.cache/snap/<treeHash>/`, symlinks `node_modules`, `.cache/cdn`, `.cache/baseline` and the read-only font caches `.cache/fonts`, `.cache/fonts_uib` (the HUD and UI tests measure layout with the cached webfonts; without them `tests/ui_battle/hud` fails with 45.1% screen share), and runs every step there. 1,229 files, 26.6 MB, 0.15-0.2 s. Reused when the hash is unchanged; the newest 4 are kept, none touched in the last 45 minutes is removed. `node tools/treehash.mjs --rev <sha>` hashes a commit through `git archive` (read-only git) and equals the hash of a clean working tree at that commit (GATE-T04), which is how COORD maps a `wip/` commit to a snapshot result; `git worktree add` is not used because agents may not change git state. Consequence worth knowing: a snapshot is a consistent picture of a tree other agents are editing (the gate run that caught `tests/campaign/ms.test.mjs` failing was a snapshot taken between two edits of its author).

### Closure cache

Key = sha256(test path, node version, `VW_ERA`, sha of `tests/_eras.mjs` when it exists, the sha of every file in the closure, the hash of each external input named). Closure = import graph (static and literal dynamic imports, resolved on disk) plus every repo file, directory and bare file name that a `tests/` or `tools/` source in the graph names by a string literal (directories are hashed whole), plus the graph of named `.js/.mjs` files. External read-only inputs `.cache/cdn`, `.cache/fonts`, `.cache/fonts_uib` are hashed by content and `.cache/baseline` by the commit it has checked out. A stored PASS is served only for the same key; failures are never stored; a PASS run stores the criteria lines it produced and replays them on a hit. **Never cached** (always run): `// @nocache`, `// @serial`, `.serial`/`.browser` suffix, `import(<expression>)`, `eval`/`new Function`/`createRequire`, a file that does not parse, a literal naming any other `.cache/*` path (32 of 107 test files today). A plumbing library whose literals are not inputs says `// @gate-noscan` on its first lines (`tests/lib/criteria.mjs`, `tools/lib/paths.mjs`). Cache off at `--tier=release` and with `--no-cache` (a `--no-cache` run still stores its PASSes). `--verify-cache` (and ~10% of `full` runs, by tree hash) re-runs a seeded 10% of the hits (at least one); a hit that now fails is `FAIL ... cache-poison`. Limit stated plainly: an import-closure key cannot see a test that reads an environment variable or the clock; GATE-T05 demonstrates that exact case (a stale PASS is served without `--verify-cache`, caught with it).

### Syntax step

`esbuild.transform` per file over `src tools tests` (603 files in 1.1-1.4 s). `syntax-nc` runs first through the same `checkSource` and fails when any of the six fixtures is accepted or a fixture is missing. Known gap, as in VF 3.8.4: a top-level `return` parses.

### Private build and the "no diff" check

`node tools/build.mjs --minify --out=<dir>` writes only under `<dir>` (pages, `artifact/files.json`, `artifact/files.manifest.json`, `report/bytes.{json,md}`, `_generated/registry.*.js` redirected into the bundle by a resolve plugin); `dist/` and the tracked `src/_generated/` are not touched (GATE-T06 proves it in a scratch project). With the date pinned (`VW_BUILD_DATE=2026-10-08`) the private fragment, `files.json` and `files.manifest.json` are byte-identical to `release/v8/` (checked by hand on this tree; the test compares private with default instead, because the tree will move on). `--report` adds the per-family table (AR 3.11.2: 25 families today; calibration 0.918 = measured JS pack / sum of family estimates), `--budget` exits 3 on a breach. `src/ui/editors.css` was in the CSS list without existing; the list is now strict and the entry is gone (the output bytes are unchanged). `node tools/gen-registry.mjs --check` writes to a temp dir and exits 1 naming every tracked generated file that differs.

### Calling convention for steps other roles own (also in `docs/requests/tools_gate_step_contract.md`)

cwd = snapshot root; no flags except the ones in the `OPTIONAL` table at the top of `tools/gate.mjs`; environment `VW_ERA VW_TIER VW_GATE_ID VW_TREEHASH VW_DIST VW_PAGE_STANDALONE VW_PAGE_FRAGMENT VW_SNAP VW_MAIN_ROOT VW_GATE_DIR VW_CRITERIA_OUT`; exit 0 = green. Failure output shown: every line matching FAIL / AssertionError / Error: (first 12) plus the last 25 lines.

### Criteria and negative controls

Gate tests register GATE-T01 (syntax), T02 (lanes), T03 (cache), T04 (snapshot), T05 (gate CLI end to end on a scratch project with the real gate copied into it), T06 (private build), T07 (size budget and families, ER14), T08 (criteria client), T09 (gen-registry check, ER2). Each has `tests/negctl/<id>.mjs` proven `red-as-expected` with `node tools/lib/negctl_lite.mjs` (the runner TOOLS-GOLDEN shipped; `tools/negcontrols.mjs` does not exist yet): NC-VF-59 (identity syntax stub -> `rejects_all_six`), NC-GATE-02 (serial exclusion removed), NC-VF-56 (key ignores closure files), NC-GATE-04 (snapshot hard-links), NC-GATE-05 (failing tests do not turn the gate red), NC-GATE-06 (private build creates `dist/`), NC-VF-06 (5,000,001 B passes), NC-GATE-08 (criteria client stops counting), NC-GATE-09 (`--check` stops comparing). The merge reports a gate criterion UNVERIFIED (U4) until `.cache/gate/negctl.json` carries its `red-as-expected` entry; that file is written by `tools/negcontrols.mjs` (TOOLS-VERIFY), which is not built yet.

### Deviations from VF text, each with the reason

1. **`// @serial` comment, not renames** of the four timing tests: renaming would break every command line other owners use; the comment is one line, the gate also honours `.serial.test.mjs`. A fifth file was added by measurement: `tests/ui/ui4_keyboard.test.mjs` (fixed 800 ms wait; fails when the box is busy, also on the v8 baseline).
2. **Snapshot by copy, `git worktree add` not used** (VF 3.8.1 already says so); rev mode uses `git archive`.
3. **No `flavour unminified` build** in the gate: the minified pages are what ships and what the browser steps now test; the unminified path remains available with plain `node tools/build.mjs`.
4. **`cpuS`** in `gate_log.jsonl` is real children CPU seconds (`cutime+cstime` of `/proc/self/stat`), plus `taskS` (sum of step seconds) and `peak`.
5. **Test time limits** follow history (6x median) instead of a flat 600 s, with a re-run alone on timeout; flat 600 s remains the cap.
6. `--jobs` counts pool units; the serial worker is additional in `--serial=parallel` (3 + 1 = 4 processes on the default of a 4-CPU box).
7. `ap`, `own-check` are SKIP until built (14-WP era-ising package, TOOLS-GATE); `tests/_eras.mjs` is part of that package and not delivered here. The cache key already reads it when it appears.
8. Criteria U1 (declared but not executed) and the ER roll-up are `report.mjs`'s; the merge writes `er: {}` and `manifest: null` meanwhile. Runs on the same tree hash accumulate in `criteria.json`.

### Not covered / honest limits

Two gate runs on the same tree hash at the same time share the snapshot directory (tests that write fixed paths under `.cache/` can collide); the `quiet` lock and tier budget enforcement are TOOLS-VERIFY's (3.19, `tier_budget.mjs`); `--era` scoping inside tests/tools waits for the registry (`VW_ERA` is exported and part of the cache key already); the default 3-lane configuration was not measured here (session limit of 2 worker processes), see perf_log G1.


## T4 TOOLS-GOLDEN: G2 arenas, G3 id ledger, G4 text, G7 generators (2026-10-08)

Owner: TOOLS-GOLDEN (VO1). Spec: VF 3.6 (common rules), 3.6.2 (G2, G3, G4, G7), 3.13 (negative controls); AR 3.3.1 (rule zero), AR-T06; W 3.1.3. Recorded from `.cache/baseline/ancient-v8` (HEAD verified = 4aafd2e3...) with `regime baked`, each recording after TWO identical collections in two fresh child processes. All tools: `--help`, exit 0 ok / 1 refused, mismatch or failure / 2 usage; no source under `src/` was touched.

### Files

| path | what |
|---|---|
| `tools/golden/{g2,g3,g4,g7}_record.mjs` | the recorders and checkers: `node tools/golden/g<N>_record.mjs [--worktree=<dir>] [--out=<file>] [--check] [--regime=baked] [--help]` (g2 adds `--engine=node\|chromium`). Default: refuse unless the worktree HEAD is the baseline sha, collect twice, refuse to write unless both runs are byte-identical, write through `makeRecord`/`writeRecord`. `--check`: collect once and compare with the committed file (first differences printed as `path: recorded X \| fresh Y`). `--regime=default_meta` exits 2 (only G1 has that variant) |
| `tools/golden/common.mjs` | `recordCli` (the common CLI above, companions, `--emit` child mode), `deepDiff`, `mapDiff`, `norm` (data-only clone that throws on non-JSON values), `sha256`, `sha12`, `fnv32`, `isMain` |
| `tools/golden/tree.mjs` | `openTree(root, {regime})`: THE path table (`SOURCES`) of the collectors, `T.src(key)`, the baked clip registration, `OWNER_KINDS`, `T.ownerOf()` (uses `registry.owner(kind, id)` as soon as `src/content/registry.js` exists). When a later package moves a source, its owner edits one line here |
| `tools/golden/g2_core.mjs`, `hash_core.mjs` | import-free G2 core (runs in Node and, bundled by esbuild, in Chromium); `g2_collect.mjs` (Node), `g2_chromium.mjs` (esbuild bundle + headless Chromium with the SwiftShader flags of `tools/lib/paths.mjs`) |
| `tools/golden/g3_collect.mjs`, `g4_collect.mjs`, `g7_collect.mjs` | the collectors; the tests import the same functions and run them on this repo instead of the baseline |
| `tests/world/gen_golden.json`, `gen_golden_chromium.json` | G2 records (Node 22.22.0, Chromium 141.0.7390.37) |
| `tests/fixtures/shipped_ids.json`, `tests/golden/g3_defs.json` | G3: the ledger and def digests; per-def key order and JSON text (the file AR-T06 names) |
| `tests/golden/g4_text.json`, `g7_armygen.json` | G4, G7 records |
| `tests/golden/{g2_gen,g2_gen_chromium,g3_ids,g4_text,g7_armygen}.test.mjs`, `golden_tools.test.mjs`, `golden_tools.g2.slow.test.mjs`, `_golden.mjs` | the tests (`_golden.mjs` = helpers, not a test) |
| `tests/negctl/VF-G0.mjs`, `VF-G0g2.mjs`, `VF-G2.mjs`, `VF-G2c.mjs`, `VF-G3.mjs`, `VF-G4.mjs` (NC-VF-63), `VF-G7.mjs` (NC-VF-66) | negative controls, one fault per label |

### What each golden holds

* **G2** (112 cases): `generateArena(recipe, size, seed)` for the 16 recipes x {small, medium, large} x seeds {1, 7} (96) and the 16 `ARENAS` preset defaults. Each case = five FNV-1a-32 hashes `[full arena JSON (the hash of W.md F1), terrain h, materials m, props, meta]`, so a red case names the part that moved (the full hash of 46 cases equals the independent F1 measurement of the W spec). Node and Chromium are recorded separately and never merged. **Finding:** the engines agree on 109 of 112 cases; `alpine/small/1`, `alpine/small/7`, `random/small/1` differ in the full and meta hash by ONE ulp of a zone z coordinate (`zc = Math.sin(x / 23) * 7 + Math.sin(x / 9) * 1.2`, `gen.js:611`; Node 22 vs Chromium 141). The W claim "46 of 46 equal" sampled 5 recipes without alpine. The list is frozen in `g2_gen_chromium.test.mjs` (`cross_engine_known`).
* **G3**: `ids[kind]` for 21 kinds (units 43, factions 7, arenas 16, recipes 16, props 41, propCategories 4, missions 9, puzzles 6, parts 254 as `category/id`, achievements 24, mutators 9, abilities 27, projectileKinds 10, godPowers 6, rigs 8, clips 93 plain + 157 qualified, music 8, sfx 374, cues 116, unlockKeys 3), `cueCount` (recorded, not asserted), tombstone kinds (7 at v8) with their entries, and `sha256(JSON.stringify(def))` of the 43 defs of `buildSimDefs()`. Test semantics: new eras ADD ids, so each ledger id must be live, the live ids that are in the ledger must keep the ledger order (sequence kinds), the digests, the first-27 key order of every def and the literal counts must be exact, ownership must be `ancient` (`registry.owner` once a registry exists; before that the tree must be single-era) and the recorded tombstone kinds and entries must still exist.
* **G4** (19 entries): the 13 modules of `tests/humor/text.test.mjs`, `sim_text` (SIM_BARKS), `lesson_text`, `wave_names`, `custom_text`, `ui/strings`, and the six puzzle texts: `sha256` of the canonical JSON of the data exports, a hash per export, a hash per key (object key, array index, or announcer template id; 1,592 key hashes), function export names and the nested function fields (achievement predicates are dropped from the hash and listed), plus the announcer template id order (486).
* **G7**: the record stores its INPUTS (43 unit ids, 8 factions, 20 scout compositions, the daily content lists, as `[key, value]` pairs where insertion order matters because canonical JSON sorts keys) and the results of 48 `generateArmy` tuples (composition string, composition and placements hashes, cost, units, types), `counterTable` (41 non-boss rows, readable), 20 `scoutReport` cases (codes + hash; the recorder refuses unless all 9 scout codes occur), `survivalWave(n, seed)` for n 1..12 and seeds 1..20, `dailyPlan` for 400 dates from 2026-01-01 (+ `dailyEnemy` every 10th). The test replays the recorded inputs with the defs restricted to the recorded 43 ids.

### Deviations from VF text, each with the reason

1. **48 tuples**: "every 45th of 2160" always lands on the same (difficulty, budget, seed) corner because 45 = 3 x 3 x 5. Each of the 48 (faction, style) pairs gets one (difficulty, budget, seed) cell by the stride-7 walk `j = 7k mod 45` (coprime: all 45 cells are hit once by the first 45 pairs). Styles `counter` and difficulty `hard` carry a frozen `against` army so the counter-pick branch is exercised; placements are laid out on `marathon medium 5`, team = k mod 2.
2. **Criterion ids**: VF-T04 is split into `VF-G3` and `VF-G4` (one criterion per negctl file and per test process: the merge keeps one line per id), VF-T07 = `VF-G7`, WC01 = `VF-G2` (`VF-G2c` in Chromium, tier T-era), plus `VF-G0` / `VF-G0g2` for the recorders themselves. The report's ER1 member table must list these ids (VF-T04 -> VF-G3 + VF-G4, VF-T07 -> VF-G7, WC01 -> VF-G2).
3. **G2 file location**: `tests/world/gen_golden.json` as VF 3.6.2/3.6.6 say; W.md 3.1.3 step 0 says `tests/fixtures/gen_golden.json` + `gen_golden_chromium.json`. One copy only (no drift); WORLD's WC01 may import `tests/golden/g2_gen.test.mjs` logic or read the VF path (request filed). W's "16 + 96 extension" and VF's "112" are the same set.
4. **AR-T06's `tests/golden/g3_defs.json`** is produced by the same collection as the ledger (companion record), so the two cannot drift.
5. **Tests replay recorded inputs**, not live lists (G2 recipes/presets, G7 unit ids/factions/arenas), which is what makes them era-proof; the live lists are checked separately (`recipes_list`, `presets_defaults`, `ids_present`, `ids_order`).

### Criteria and negative controls (all `red-as-expected` with `node tools/lib/negctl_lite.mjs <id>`; each fault was also run alone: every fault turns exactly its own label red)

| criterion | file | labels | negctl | tier | s |
|---|---|---|---|---|---|
| VF-G2 | `g2_gen.test.mjs` | recorded_from_baseline, record_shape, recipes_list, presets_defaults, cases_equal, presets_equal | `VF-G2.mjs` (Gen.put draw swap, W WC01) | F | 7 |
| VF-G2c | `g2_gen_chromium.test.mjs` | recorded_from_baseline, engine_major, replay_equal, cross_engine_known | `VF-G2c.mjs` | T-era (runs in F) | 8 |
| VF-G3 | `g3_ids.test.mjs` | recorded_from_baseline, counts_literal, ids_present, ids_order, ids_owner, owner_selftest, def_digests, def_keys, tombstones | `VF-G3.mjs` (8 faults, NC-X4 among them) | F | 0.5 |
| VF-G4 | `g4_text.test.mjs` | recorded_from_baseline, module_set, module_hash, export_hashes, key_hashes, functions, announcer_order | `VF-G4.mjs` = NC-VF-63 | F | 0.2 |
| VF-G7 | `g7_armygen.test.mjs` | recorded_from_baseline, inputs, compositions, placements, counter_table, scouts, scout_codes, waves, daily_plans, daily_enemies | `VF-G7.mjs` = NC-VF-66 | F | 0.8 |
| VF-G0 | `golden_tools.test.mjs` | baseline_present, help, exit_codes, refuses_non_baseline, determinism_gate, record_roundtrip, checks_reproduce, tamper_detected | `VF-G0.mjs` | F | 7 |
| VF-G0g2 | `golden_tools.g2.slow.test.mjs` | node_reproduces, chromium_reproduces, node_tamper_detected | `VF-G0g2.mjs` | T-full | 22 |

`node tools/gate.mjs --fast --only=golden --jobs=2`: lint, syntax-nc, syntax, 10 of 10 golden tests green in 33 s wall. The criteria merge reports these ids UNVERIFIED (U4) until `tools/negcontrols.mjs` (TOOLS-VERIFY) records the proofs in `.cache/gate/negctl.json`.

### Re-recording (the only way a golden file changes)

`node tools/golden/g<N>_record.mjs` from the repo root with the baseline worktree present, then one `docs/eras/golden_log.md` entry per signer (the author of the change excluded). Never record from a tree other than the baseline: the record carries `sha`, `tag`, `dirty` and the tests refuse anything but `4aafd2e3...`, `ancient-v8`, `dirty:false`.

### Left / limits

* G1, G5, G6, G8..G12 belong to other work packages. G9 (audio) can reuse `tools/golden/tree.mjs`.
* The registry branch of `ids_owner` (`registry.owner(kind, id)` with `OWNER_KINDS`) is exercised through its pure function `ownerProblems` (selftest and negctl) but not against a real registry, which does not exist yet; the kind names in `OWNER_KINDS` are AR 3.1.2's guess to be confirmed by REGISTRY.
* Once AR1 moves `STAT_TABLE`, `PROP_CATALOG`, the humor modules or `buildSimDefs()` signature, the collectors keep working only after the one-line edit of `tools/golden/tree.mjs` (`SOURCES`) or `g4_collect.mjs` `G4_MODULES`; a collector that cannot find its source throws, it never skips (request `docs/requests/tools_golden_access_layer.md`).
* Text hashes cover the data modules; strings hard-coded in `ui/screens/*` are G10's (DOM text), not G4's.

## T3 TOOLS-GOLDEN: G1 sim matrix (83 cases, Node baked and default_meta, Chromium core 12) (2026-10-08)

Owner: TOOLS-GOLDEN (VO1). Spec: VF 3.6 (common rules), 3.6.1 (G1), 3.10 (comparators), 3.13 (negative controls); AR 3.7.4/3.7.5. Exit codes everywhere: 0 ok, 1 differs / refused / failed, 2 usage. Every CLI has `--help`.

### Files

| path | what |
|---|---|
| `tools/golden/g1_core.mjs` | the IMPORT-FREE core: `makeEventHasher(eventFields)`, `simulate(w, spec, params, eventFields, deps, opts)`. Plain script text, so Node imports it and the Chromium column injects the same source into the page: both engines hash with identical code |
| `tools/golden/g1_lib.mjs` | `loadTree(root, regime)`, `loadFixtures(dir)`, `runCase`, `buildCaseWorld`, `compareDigest` (labels), `digestShapeProblems`, `selectCases`, `fixtureHashes`; tree-agnostic: the recorder passes the baseline worktree, the test passes this tree |
| `tools/golden/g1_fixtures.mjs` | `makeFixtures(B)`: the five fixture documents generated FROM THE BASELINE (called twice, must be identical) |
| `tools/golden/g1_pool.mjs`, `g1_worker.mjs` | work queue over 1..N forked workers (one regime per worker process: the clip bake is process-global) |
| `tools/golden/g1_record.mjs` | `[--worktree=] [--regime=baked\|default_meta\|both] [--engine=node\|chromium] [--jobs=2] [--only=ids] [--out-dir=] [--check] [--verbose]` |
| `tools/golden/g1_chromium.mjs` | the Chromium column: `[--check] [--page=<html>] [--rebuild] [--worktree=] [--out-dir=] [--only=] [--timeout-s=]`; exports `checkCandidate` |
| `tests/golden/g1_matrix.json`, `g1_placements.json`, `g1_kinds.json`, `g1_abilities.json`, `g1_inputs.json` | the frozen inputs (records of kind `g1_matrix` ... `g1_inputs`, engine node, tag ancient-v8, clean checkout of 4aafd2e) |
| `tests/golden/g1_digests.node.baked.json`, `g1_digests.node.default_meta.json` | 83 digests each (kind `g1_digests`); `g1_digests.chromium.baked.json`: 12 digests, Chromium 141.0.7390.37, page sha256 `4f707d27...` = release/v8 |
| `tests/golden/g1_suite.mjs` | shared body of the tests (labels below); `g1_sim.test.mjs` (core 12, T-fast), `g1_sim_full.slow.test.mjs` (all 83, T-full), `g1_chromium.slow.test.mjs` (core 12 in the built page, T-full), `g1_record.slow.test.mjs` (the recorder CLI, T-full) |
| `tests/negctl/VF-T03*.mjs` | 21 negative controls (table below) |

Existing, reused unchanged: `tests/golden/legacy_hash.mjs` (the frozen `stateHash` text; the test pins its sha256 `7447c986...` and asserts `legacyStateHash(w) === w.stateHash()` at every sampled tick), `tools/lib/statwalk*.mjs` + `v8_fields.json`, `tools/lib/records.mjs` (`makeRecord`, `firstDivergence`, `assertComparable`), `tests/lib/criteria.mjs`.

### The 83 cases (VF 3.6.1 table, built by `g1_fixtures.mjs`)

A 18 (6 arenas x easy/normal/hard, seeds 1..18), B 9 (mutators, 20+i), C 8 (friendly_fire, morale_off, nokite, rain, storm, snow, sandstorm, fog; 40+i), D 10 (projectile kinds, 60+i), E 8 (hooking abilities, 80+i), F 19 (other abilities, 100+i), G 9 (input logs, 130+i), H 2 (stalemate 150, waves 151). All on `getArena(recipe, 'medium', 5)`, world built through `tools/lib/harness.mjs buildWorld`, `w.start(0)`, ticked to `ended` or 6,000 ticks (D, E, F: 1,500; end reason `cap`, winner -1). Core 12 as in VF.

What is hashed per case (`simulate` in g1_core.mjs): `chain` = legacy stateHash at ticks 100, 200, ... (+ `endHash`); `walk` = statwalk at 300, 600, ... (+ `endWalk`); `evHash` = FNV over every event in registration order observed with `w.ev.onAny`; `result` = the 15-number tuple `[winner, endReason, tick, round(time*1000), alive0, alive1, dead0, dead1, kills0, kills1, round(dmg0), round(dmg1), start0, start1, eventCount]`. 83 cases hold 2,205 values in the baked record (>= 40 digests required).

### Deliberate refinements and deviations from the VF text (each with its reason)

1. **evHash reads frozen per-type field lists** (`g1_matrix.json` `eventFields`, the baseline `EVENTS` table) instead of "the payload's own numeric fields": a field a later module adds to an existing payload, or a new event type emitted by a new mechanic, must not move an Ancient golden. Unknown event types are counted (`exercise.unknownEvents`), not hashed. Numbers are quantised `Math.fround(v)*1000|0` as specified; NaN and +-Infinity get their own words (a NaN in a payload moves the hash).
2. **No hero in the generated armies.** `generateArmy(mixed balanced 6000, seeds 9 and 10, cap 300)` contains no hero on any of the six arenas (measured), so "the first hero of team 0" of `G-possess` and `G-combined` would not exist. The sets `marathon+hero` and `troy+hero` add ONE frozen `strategos` (squad 99) at the army centre; the possessed unit id is frozen in `g1_inputs.json` and the test checks the logs name it.
3. **`H-stalemate` uses two armies of 14 mummies** (speed 1.9) on hold 70 u apart instead of mixed ones: with 2.6+ u/s units the first blow lands at about 26 s, before the zeus stage (30 s), and the case would never show the intervention. With mummies the log contains `stalemate_warning` and two `intervention` events (zeus, goat). The recorder refuses to write unless those events occur.
4. **`H-waves`** uses the rule shape of `survivalRules()` (a `survive_waves` objective keeps the battle alive between waves; `rules.waves` alone ends the run when the first wave dies) with `maxWaves 3` and `timeLimit 0`.
5. "id order" of the carrier choice (D, E, F) is the SORTED id order of the defs (registry order is not a contract): D carriers javelin=numidian, arrow=centaur_archer, pilum=pilum_thrower, bolt=ballista, coin=senator, sunbeam=priest_of_ra, scepter=pharaoh, boulder=catapult, francisca=axe_thrower, thunderbolt=druid; the E and F carriers are in `g1_abilities.json`.
6. **Infinity is legitimate v8 state** (unset distances), so the recorder/test fail on NaN only (`g1/finite`); the count of Infinity values per case is kept in `exercise.inf`. NaN is counted at every walk sample and at the end, not only at the end (a unit that dies and leaves the list would hide it).
7. **Instrumentation** (`opts.hooks`): the recorder wraps `w.abilityHook` to count the ability hooks that reached an implementation (E cases must have `onAim|onFire|onHitDealt` > 0, D cases a `projectile_launch` of their kind, G casts a `god_power`, the possession logs a `possess`, stalemate its interventions, waves >= 2 `wave_spawn`). Pass 1 runs with the wrapper, pass 2 without; the two digests must be identical, which proves the wrapper is inert. The tests run without it.
8. **Files are records.** The fixtures are written through `makeRecord` (kinds `g1_matrix`, `g1_placements`, `g1_kinds`, `g1_abilities`, `g1_inputs`), so `lint_records` cannot flag them and the digest record names the sha256 of every fixture (`data.fixtures`): changing a fixture without re-recording turns `g1/fixtures` red.
9. **Chromium page**: the record uses the shipped v8 fragment `release/v8/index.html` (its sha256 must equal `release/v8/PAGE.sha256`; VF-L04 proves that building the baseline sources reproduces it byte for byte; `--rebuild` repeats that build here). Arenas come from the page itself (`game.begin()` with `presetId = recipe`, `size medium`, `seed 5`, arena kept as a clone), the world from `new (game.world.constructor)({arena, seed, rules, defs: game.content.defs})`. Chromium digests differ from Node digests in `walk` and `evHash` for all 12 cases and in the whole trajectory for 3 (G-combined 6000 vs 5896 ticks): measured, expected (VF-D5), and the reason they are never compared across engines.
10. The `full` column (`stateHashFull`, M spec PC-7) does not exist yet: it is recorded once at the M0 landing from the Ancient worlds (a follow-up of this tool: `g1_record --full-column`, not built because `stateHashFull` does not exist on the baseline).

### Procedure and measured numbers (this box, 4 CPUs shared, `nice -n 10`)

`node tools/golden/g1_record.mjs [--jobs=2]` = regenerate the fixtures (twice), run all 83 cases twice per regime (hooks on, hooks off), audit (legacy hash equal, no NaN, digest shapes, exercise rules), then write. Measured: 77 s (baked) + 82 s (default_meta) with 2 workers; the first baked recording and the final one were byte-identical (a third determinism witness). `--check` (fixtures regenerate equal, digests equal): 80 s for both regimes. Test timings: core 12 = 16-23 s in one process; full 83 = 38-52 s with 2 workers (VF budget 35 s in 3 lanes: `--jobs=3`); Chromium core 12 = 26-30 s (boot 7 s, a private build of this tree adds 8 s); recorder test = 18-28 s. The baked record covers 43 `rout`, 29 `elimination`, 10 `cap`, 1 `intervention` endings.

### Criteria and negative controls (all proven red-as-expected with `node tools/lib/negctl_lite.mjs`)

| criterion | file | tier | labels |
|---|---|---|---|
| `VF-T03` | `g1_sim.test.mjs` (`--core` default, `--full`, `--regime=`, `--case=`, `--jobs=`) | T-fast | `g1/digest_equal g1/chain g1/walk g1/evhash g1/tuple g1/legacy_hash g1/legacy_pin g1/finite g1/coverage g1/matrix_shape g1/fixtures g1/record g1/record_shape g1/exercise` (failure messages name the case and the first diverging tick) |
| `VF-T03-full` | `g1_sim_full.slow.test.mjs` | T-full | same labels, all 83 cases, 2 workers |
| `VF-T03-chromium` | `g1_chromium.slow.test.mjs` | T-full | same labels, engine chromium, `--page=` / `$VW_PAGE_FRAGMENT` / private build |
| `VF-T03R` | `g1_record.slow.test.mjs` | T-full | `g1rec/help usage_errors refuses_wrong_worktree check_passes check_detects_digest check_detects_fixture chromium_delegates only_writes_nothing` |

| negctl file (id) | mutation | must turn red |
|---|---|---|
| `VF-T03.mjs` (NC-VF-09) | flip one chain digest of the baked record | `g1/digest_equal` (+ `g1/chain`) |
| `VF-T03-rng.mjs` (NC-VF-12) | extra `w.rng.next()` in `applyDamage` for ranged hits | `g1/chain` (+ walk, evhash, tuple, digest_equal) |
| `VF-T03-walk.mjs`, `-evhash.mjs`, `-tuple.mjs` | flip a walk digest / an evHash / the winner of a tuple | `g1/walk`, `g1/evhash`, `g1/tuple` |
| `VF-T03-legacy.mjs` | `World.stateHash()` stops hashing `tickN` | `g1/legacy_hash` only (the frozen copy keeps the chain equal) |
| `VF-T03-pin.mjs` | edit the frozen `legacy_hash.mjs` | `g1/legacy_pin` |
| `VF-T03-fixture.mjs`, `-shape.mjs`, `-exercise.mjs` | change a seed in `g1_matrix.json` / delete a chain sample / zero the boulder launches in the record | `g1/fixtures`, `g1/record_shape`, `g1/exercise` |
| `VF-T03-finite.mjs` | NaN in the render-only `gait` of unit 1 | `g1/finite` |
| `VF-T03-coverage.mjs`, `VF-T03-full-coverage.mjs` | the core / full selection silently shrinks (11 / 12 cases) | `g1/coverage` |
| `VF-T03-full.mjs`, `-full-meta.mjs`, `-full-regime.mjs` | flip a digest of a non-core case through the 2-worker pool / of the default_meta record / the baked record claims regime default_meta | `VF-T03-full/g1/digest_equal`, `.../digest_equal`, `.../record` |
| `VF-T03-chromium.mjs`, `-chromium-engine.mjs` | flip a Chromium digest / the engine mutation of NC-VF-12 with the page REBUILT from the mutated tree | `VF-T03-chromium/g1/digest_equal`, `.../g1/chain` |
| `VF-T03R.mjs`, `-worktree.mjs`, `-chromium.mjs` | `--check` filters out chain divergences / `assertBaseline` accepts any checkout / no hand-over to the Chromium column | `g1rec/check_detects_digest`, `g1rec/refuses_wrong_worktree`, `g1rec/chromium_delegates` |

A criterion has one `negctl:` path; further controls of the same criterion are separate files that name it in `criterion:` (the runner indexes by file, VF 3.13). The tests carry `// @nocache`: a golden is never served from the closure cache.

### Left / for others

* The `full` (`stateHashFull`) column, see 10. G9 reuses the 12 core battles (`g1_lib.buildCaseWorld`/`runCase` give it the worlds). The M-spec per-era golden set (X6: 12 digests + 9 missions + 6 puzzles) can reuse `g1_core.simulate`.
* The criteria manifest (`tools/lib/criteria_manifest.json`, `report.mjs --scan`) must list `VF-T03`, `VF-T03-full`, `VF-T03-chromium`, `VF-T03R` (ER1); VF's ER table names `g1_sim.test.mjs` only.
* The gate runs the three slow files in the full tier only; the Chromium one counts as a browser test (2 CPU units).
