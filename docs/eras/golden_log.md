# golden_log.md: record of baselines and every golden re-record (COORD / TOOLS). No re-record without two entries; the author of the change is not a signer.

## 2026-10-08 P0 step 0: provenance of the Ancient baseline (COORD)
- Hosted artifact 5mVZ2YHzQjHzP5rxtptuZ8, version 1791430157-249b (v8 as shown in the viewer): read back with the Artifact `read` (path index.html, saved to disk, never inlined). The hosted page = a 537-char skeleton + the local fragment + `\n</body></html>`. The inflated `vw-pack` payload is 4,388,731 bytes, sha256 prefix 812e57ae8125d420, identical to the locally rebuilt payload; the base64 strings are byte-identical.
- Local rebuild of HEAD (`node tools/build.mjs --minify`, build date 2026-10-08) is `cmp`-identical to the published fragment (3,106,540 bytes, sha256 4f707d27...ea885). No code under src/ tools/ assets/ package.json changed after commit 4aafd2e.
- Baseline commit: 4aafd2e (local tag `ancient-v8`; pushing tags fails through the sandbox proxy). Baseline worktree: `.cache/baseline/ancient-v8`. Rollback material: `release/v8/` (page, files.json, files.manifest.json with sha256+bytes of the 382 audio files, PAGE.sha256).
- Hosted supporting files: 383 listed (index.html + 382 audio/mpeg), 3 spot-checked sizes match.
- Signers: COORD (procedure), subagent a240b84e (read-back); second signature for any later re-record required from TOOLS-VERIFY or REVIEWER.

## Goldens (G1..G12)
(not recorded yet; owner TOOLS-GOLDEN)

## 2026-10-08 T1 first recordings from the baseline (TOOLS-GOLDEN; second signer pending: COORD or REVIEWER, author excluded)
- `tests/golden/v8_fields.json` (kind `v8_fields`, engine node, regime baked, tag ancient-v8, sha 4aafd2e): the frozen field lists of the statwalk witness (Unit 125, Projectile 32, effect 9, Prop 18 fields; 27 ability state key lists). Recorded by `node tools/golden/v8_fields.mjs` from `.cache/baseline/ancient-v8` (HEAD verified = 4aafd2e3...); the battery of 7 battles ran twice and agreed before writing; `--check` reproduces the file.
- `tests/golden/fp_ancient_v8.json` (kind `fingerprint_pin`): the AR 3.7.6 fingerprint definition applied to the baseline (simCore 78 files, shared 13, render 17, eraHash(ancient) 17); `node tools/golden/fp_record.mjs --check` reproduces it.
- `tests/golden/legacy_hash.mjs`: the verbatim `World.stateHash()` body (no data, a frozen method).
- `build.mjs` now emits `files.manifest.json`; the Ancient-only build of the baseline sources with `VW_BUILD_DATE=2026-10-08` is byte-identical to `release/v8/` for the fragment, `files.json` and `files.manifest.json` (test `VF-L04`, `VF-L03`).
