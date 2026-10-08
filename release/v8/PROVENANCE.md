# Ancient release v8 provenance (COORD, 2026-10-08)

- Baseline commit: `4aafd2e` ("Weather particles ..."), local tag `ancient-v8` (tags could not be pushed through the sandbox proxy; the commit sha is the reference). No code under src/, tools/ (except the optional VW_BUILD_DATE override added afterwards), assets/ or package.json changed after it (`git diff 4aafd2e..HEAD -- src tools assets package.json` was empty when checked).
- Procedure: the published minified fragment kept in the session scratchpad (3,106,540 bytes) was compared with a fresh `node tools/build.mjs --minify` of HEAD: **cmp reports identical bytes** (fragment sha256 `4f707d27...ea885`, inflated vw-pack payload 4,388,731 bytes, payload sha256 prefix `812e57ae8125d420`, build date baked in: 2026-10-08).
- The artifact host wraps the page in a skeleton, so hosted-vs-local equality is checked on the inflated vw-pack payload (read-back by a subagent; result recorded in docs/eras/golden_log.md).
- Rollback material: `index.html` (the exact v8 fragment), `files.json` (path map, 382 audio files), `files.manifest.json` (sha256 + bytes per file), `PAGE.sha256`.
- Baseline worktree for A/B and goldens: `.cache/baseline/ancient-v8` (git worktree at the tag; node_modules and .cache/cdn symlinked). Recreate with: `git worktree add -f .cache/baseline/ancient-v8 4aafd2e`.
