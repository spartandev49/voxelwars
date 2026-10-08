# perf_log: measured performance of the program's tools and mechanics (append-only; newest section last)

Rules of this file: every number is a real run, with the date, the exact command, the box state (`uptime` load average before and after) and what else was running. A projection is labelled as one. Sim/render budgets (plan section 9, `spec/M` 3.13, `tools/perf_assert.mjs`) will be appended here by their owners; this file starts with the gate.

## G1. T-fast gate wall time on this box (TOOLS-GATE, 2026-10-08)

Box: 4 CPUs (shared with other agents running ffmpeg, python asset scripts, golden and provenance tests, negctl runs), Node 22.22.0, Chromium 1194 + SwiftShader. **The box was never idle**: load average 2.3-5.4 during every run below, so every wall time is an upper bound of what 4 idle CPUs would do. Session rule: at most 2 worker processes and `nice -n 10`, so the default of 3 lanes + 1 serial worker could not be measured; `--jobs=2 --serial=after` (2 processes at any moment, browser tests count as 2 units) was.

What T-fast runs (107 test files: 93 fast tests of the old gate + 14 new ones from other roles and the 9 gate tests): lint, syntax-nc (6 fixtures), syntax (603 files), gen-check, contracts --strict, private minified build + byte report + size budget, `records check`, 75 cacheable + 32 uncacheable test files (5 of them in the serial lane). Steps `ap` and `own-check` are SKIP (tools not built yet).

| run (gate id) | command | wall | CPU s (children) | load before -> after | tests | result |
|---|---|---|---|---|---|---|
| g-20261008094223-31119 | `nice -n 10 node tools/gate.mjs --fast --jobs=2 --serial=after --no-cache` (COLD: no cache hit) | 754.9 s | 379.5 | 4.50 -> 3.39 | 107 run | 105 pass; 2 red = the two flaky browser tests of `docs/requests/tools_flaky_browser_tests.md` (x2_a11y hung to its time limit twice: 182.6 s + the alone re-run; ui4_keyboard fails alone) |
| g-20261008100725-14965 | `nice -n 10 node tools/gate.mjs --fast --jobs=2 --serial=after` (WARM: closure cache) | **258.9 s** | 155.3 | 4.59 -> 2.93 | 71 cache hits, 36 run (32 are uncacheable by rule: browser tests naming `.cache/ui`, `.cache/audio_test`, dynamic imports) | 106 pass; 1 red = ui4_keyboard |
| g-20261008085652-11222 | same flags with 3 processes (`--jobs=2`, serial lane beside the pool), `--no-cache`, before the fonts link of the snapshot existed | 355.4 s | 330.3 | 0.73 -> 3.98 | 93 run | 91 pass; hud (snapshot lacked `.cache/fonts_uib`, fixed) and ui4_keyboard red |

Reading the table:
* The warm figure (258.9 s on a loaded 2-process box, 71 of 107 tests answered by the closure cache) is the number to compare with the 240 s budget: the budget is for 4 idle CPUs with 3 lanes, this run had 2 processes and 3-5 other busy processes, and still lands 8% over it. With one flaky test absent it would be under.
* The cold figure is dominated by the hung test (182.6 s + a second attempt) and by `tests/ui_battle/hud.test.mjs` (73 s, serial lane) and `screens.test.mjs` (55 s).
* Sum of per-test seconds in the cold run without the hung attempt: about 500 s of test CPU time plus about 8 s of steps. **Projection (not measured)** for 3 lanes plus the serial worker on 4 idle CPUs: 508 / 3 = 170 s for the pool, the serial lane (hud 73 s + ui4_keyboard 22 s + browser 14 s + synth 7 s) runs beside it, so T-fast cold ~ 175-185 s and warm ~ 100-130 s (the 32 uncacheable tests are mostly the browser ones: about 330 s of work, a third of it in the serial lane). Both are inside the 240 s budget; `tools/tier_budget.mjs` (TOOLS-VERIFY) replaces this projection with the median of three `gate_log.jsonl` runs on a quiet box.
* The old sequential gate on the same tree and box is in section G2.

How to reproduce: `uptime; nice -n 10 node tools/gate.mjs --fast --jobs=2 --serial=after [--no-cache]; tail -1 .cache/gate/gate_log.jsonl`. Every gate run appends one line to `.cache/gate/gate_log.jsonl` (`wallS`, `cpuS`, `load1Start`, `load1End`, `jobs`, `peak`, per-step seconds, cache hits, red and amber lists) and writes the full detail to `.cache/gate/last.json`.

Other gate timings on this box (same load conditions): `--tier=era --steps=build,size,smoke-standalone,smoke-fragment --browsers=1`: 105.8 s (smoke 49.0 s standalone, 53.7 s fragment, minified pages under the artifact CSP, console clean); `--tier=full --steps=tour,flow --browsers=1`: 115.0 s (flow 69.3 s, tour 42.8 s); `--tier=full --steps=modes --browsers=1`: 268.4 s. Private minified build with byte report: 2.7-3.4 s. In-process syntax step over 603 files: 1.1-1.4 s (the 315-file `node --check` spawn loop it replaces took 8.9 s in map 08). Snapshot of the include set (1,229 files, 26.6 MB): 0.14-0.20 s to create, reused when the tree hash is unchanged. Tree hash of the working tree: 0.17-0.25 s. Closure analysis of 107 tests: 2.0 s cold, 30-80 ms with the per-file fact memo.

Flakiness found while measuring (so the next reader does not re-investigate): `tests/ui/ui4_keyboard.test.mjs` first-Tab check failed in 11 of 12 direct runs (shared tree, snapshot and the v8 baseline worktree); `tests/ui/x2_a11y.test.mjs` hung in 2 of 5 direct runs of the v8 baseline worktree (0 of 5 in the working tree) and in 2 of 4 gate runs. Details and the requested test fixes: `docs/requests/tools_flaky_browser_tests.md`.
