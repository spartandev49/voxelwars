# AGENTS.md — briefing for every VOXELWARS sub-agent (read this first, then your companion spec)

## The product
VOXELWARS: a 3D voxel battle simulator (Ancient era) that ships as ONE hosted web page (a claude.ai Artifact). The user's bar is "feels like a game studio made it", with humor, real internet sound/animation assets, custom arenas, custom soldiers. **No demos, no MVPs, no placeholders, no TODOs, no stubbed buttons.** Every deliverable is finished, tested and looked at. If you cannot finish something, say exactly what and why in your hand-back; never fake it.

## What to read
1. `docs/spec.md` (frozen contracts v1.1) and ONLY the companion spec files your task names (`docs/spec/*.md`). `docs/verification.md` lists the numbered acceptance criteria your work must satisfy (find your ids). `docs/plan.md` has tiers and cut ladder. `docs/q.md`/`docs/q2.md` are the review history (skim only).
2. The existing code you build on (small, read it fully): `src/voxel/*`, `src/render/voxskin.js`, `src/render/fx.js`, `src/sim/*`, `src/anim/clips.js`, `src/content/era_ancient/stats.js`.

## Hard rules (the gate enforces most of them: `node tools/gate.mjs --fast`)
- Respect directory ownership (spec §3). Edit only your own directories. If you need a change elsewhere, write it in `docs/requests/<your-agent>.md` (what, why, exact API) and keep going with a local workaround; the coordinator integrates.
- `sim/ content/ voxel/ anim/clips.js anim/animator.js core/ world/ save/` are PURE JS (no `window`, `document`, `THREE`, no `Math.random` in sim/content). They must run in Node.
- `THREE` is the CDN global `window.THREE` r128 (never import it). No other runtime libraries. Fonts only via the existing Google Fonts link (Bungee, Rubik, Cinzel).
- No `alert/confirm/prompt`, no `innerHTML` with user data (use `textContent`), no `eval`, no non-relative `fetch`.
- Ids are `lower_snake_case`, immutable once shipped (rig part ids like `armUL` are fixed by spec §4).
- Never `cat`/`Read` `dist/*`, audio files or base64 blobs; use `stat`, `ls -la`, `head -c 300`, ffprobe.
- Do NOT run `git commit`, `git push`, `git add`, `git checkout`, `git stash` or anything that changes git state; the coordinator commits. `git status`/`git diff` are fine. Do not install npm packages (esbuild and playwright-core are installed; ask via requests file if you really need another).
- Keep large outputs out of your context: pipe test output through `tail`, never print whole data files.

## Tooling you can use
- Node 22 tests: `node tests/<area>/<name>.test.mjs` (plain `node:assert`). Put your tests in `tests/<your-area>/`. `node tools/gate.mjs --fast` runs lint + syntax + all tests.
- **Seeing your work (WebGL screenshots)**: `node tools/shot.mjs <entry.js> <out.png> [waitMs] [width] [height]` bundles an ES-module entry with esbuild, loads it in headless Chromium (SwiftShader WebGL2) with three r128 served from `.cache/cdn`, and saves a PNG. Env `QS='?a=b'` adds a query string. Look at the PNG with the Read tool; look critically (silhouette, colour, proportion, intersections) and iterate. Copy and adapt `tools/shot.mjs` to `tools/shot_<you>.mjs` if you need different behaviour (do not edit the shared one). Use `tests/visual/skin_demo.js` as the template for rendering a ModelDef with `VoxSkin` + `Engine`.
- SwiftShader is slow: small viewports (960x540), few frames, `waitMs` 1200-2500. Frame rate numbers from it are meaningless; only correctness/looks/CPU-side costs matter.
- Chromium path (for custom Playwright): `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with args `--use-angle=swiftshader --use-gl=angle --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox`.
- Audio assets and the ledger live in `assets/` (being produced by the asset hunter); animation data in `assets/anim/` (retarget spike).
- Other agents are working in parallel in the same working tree: do not touch their files, and re-read a file before editing if it may have changed.

## Quality bar (self-check before hand-back)
- Reread your acceptance criteria from `verification.md` and state PASS/FAIL with evidence for each (command output, screenshot paths).
- Humor/tone rules in `docs/spec/humor.md` apply to every user-visible string. No stereotypes. Specific beats generic.
- Visual work: contact sheets at several zoom levels read by you; fix what looks off. Take at least 2 iterations on anything the user will look at.
- Performance: no per-frame allocation in render/sim loops; no layout thrash in UI.
- Accessibility: focus-visible, aria roles, >= 44 px tap targets, Reduce Motion, subtitles where relevant.

## Hand-back format (your final reply, <= 60 lines)
1. Files created/changed (paths only, grouped). 2. Gate/test output summary. 3. Criteria table (id -> PASS/FAIL/PARTIAL + evidence). 4. Screenshots/sheets produced (paths). 5. Known gaps (honest) and what would close them. 6. Requests for other owners (also in `docs/requests/<you>.md`).
