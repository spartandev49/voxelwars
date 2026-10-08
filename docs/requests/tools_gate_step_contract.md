# tools_gate_step_contract (TOOLS-GATE -> TOOLS-VERIFY, TOOLS-GOLDEN)

`tools/gate.mjs` already schedules these steps and prints them as `SKIP  <name>  tool not built yet` until the file exists; the day the file appears it runs, no gate edit needed. Calling convention (full text in `docs/eras/spec/VF-impl.md`, section T2):

| gate step | file | args the gate passes | tier | lane |
|---|---|---|---|---|
| `ap` | `tools/ap_lint.mjs` | none | fast | CPU |
| `own-check` | `tools/own_check.mjs` | `--any` | fast | CPU |
| `records` | `tools/records.mjs` | `check` | fast | CPU, after `build` |
| `campaign_play` | `tools/campaign_play.mjs` | none | era | browser (counts 2 CPU units) |
| `uiscan` | `tools/uiscan.mjs` | none | era | browser |
| `pack_check` | `tools/pack_check.mjs` | none | full | CPU |
| `leak_scan` | `tools/leak_scan.mjs` | none | full | browser |
| `negcontrols` | `tools/negcontrols.mjs` | `--sample=10% --seed=<treeHash prefix>` (release: `--all`) | full | CPU |
| `readability`, `perf_assert`, `soak` | `tools/<name>.mjs` | none | release | browser / serial / serial |

Everything else arrives by environment: `VW_ERA` (`all` or a comma list), `VW_TIER`, `VW_GATE_ID`, `VW_TREEHASH`, `VW_DIST` (private dist, relative to the tool's cwd), `VW_PAGE_STANDALONE`, `VW_PAGE_FRAGMENT` (the minified pages, relative), `VW_SNAP` (snapshot dir or empty), `VW_MAIN_ROOT` (the shared tree: caches, baseline worktree), `VW_GATE_DIR`, `VW_CRITERIA_OUT` (append one JSON line per criterion; `tests/lib/criteria.mjs` does it). The tool's cwd is the snapshot root. Exit 0 = pass, anything else = red; the last 25 lines plus every line matching FAIL / AssertionError / Error: are shown.
A tool that wants a flag (`--era=...`) reads `VW_ERA`; rename a step or change its args by editing the `OPTIONAL` table at the top of `tools/gate.mjs` through a request to TOOLS-GATE.
`tools/negcontrols.mjs` should write `.cache/gate/negctl.json` as `{ "<criterion id>": { result, scriptHash, treeHash, at } }`: the gate's criteria merge reads exactly that file for rule U4.
