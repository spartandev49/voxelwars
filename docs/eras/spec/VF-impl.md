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
