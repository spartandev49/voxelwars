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

## 2026-10-08 T4 first recordings of G2, G3, G4, G7 from the baseline (TOOLS-GOLDEN; second signer pending: COORD or REVIEWER, author excluded)
- All files recorded by `node tools/golden/g<N>_record.mjs` from `.cache/baseline/ancient-v8` (HEAD verified = 4aafd2e3..., tag ancient-v8, clean checkout), regime baked, each after two identical collections in fresh processes; `--check` reproduces every file from the baseline.
- G2 `tests/world/gen_golden.json` (Node 22.22.0, sha256 9f0ed156934ac80f..., 112 cases) and `tests/world/gen_golden_chromium.json` (Chromium 141.0.7390.37, sha256 7d65b04d4f0d8a1c...): 16 recipes x 3 sizes x seeds {1, 7} + 16 preset defaults, five FNV hashes each. The full hash of the 46 cases measured earlier for W F1 is equal. Node and Chromium agree on 109 of 112; the 3 exceptions (alpine/small/1, alpine/small/7, random/small/1) are one-ulp zone-z differences of `Math.sin` (docs/requests/tools_golden_access_layer.md), frozen in the Chromium test.
- G3 `tests/fixtures/shipped_ids.json` (sha256 6ba3668205e42878...) and `tests/golden/g3_defs.json` (2c86350fda02bc42...): 21 id kinds (43 units, 7 factions, 16 arenas, 16 recipes, 41 props, 4 prop categories, 254 parts, 9 missions, 6 puzzles, 24 achievements, 9 mutators, 27 abilities, 10 projectile kinds, 6 god powers, 8 rigs, 93+157 clip ids, 8 music, 374 sfx, 116 cues, 3 unlock keys), 7 tombstone kinds, sha256(JSON.stringify(def)) of the 43 defs.
- G4 `tests/golden/g4_text.json` (70ec0d2b4f7d2327...): 19 text entries, 1,592 key hashes, 486 announcer templates in order.
- G7 `tests/golden/g7_armygen.json` (e12a244841b0b56f...): 48 generateArmy tuples, counterTable (41 rows), 20 scout cases (all 9 codes), 20 seeds x 12 waves, 400 daily plans (+40 daily enemies).
- Negative controls proven red-as-expected with `node tools/lib/negctl_lite.mjs`: VF-G0, VF-G0g2, VF-G2, VF-G2c, VF-G3, VF-G4 (NC-VF-63), VF-G7 (NC-VF-66); every fault also run alone.

## 2026-10-08 T3 first recordings of G1, the sim matrix (TOOLS-GOLDEN; second signer pending: COORD or REVIEWER, author excluded)
- Recorded by `node tools/golden/g1_record.mjs` (Node 22.22.0) and `node tools/golden/g1_chromium.mjs` (Chromium 141.0.7390.37) from `.cache/baseline/ancient-v8` (HEAD verified = 4aafd2e3..., tag ancient-v8, clean checkout). Every case ran twice (with and without the hook counters) and agreed before anything was written; the baked record was produced twice in separate sessions and is byte-identical; `g1_record.mjs --check` reproduces fixtures and both digest records from the baseline (80 s).
- Fixtures: `tests/golden/g1_matrix.json` (sha256 ee74a43d2bcd64ed...), `g1_placements.json` (c9b02814e6be46c9...), `g1_kinds.json` (46a2827b5c9e1925...), `g1_abilities.json` (736bec93a48dfa52...), `g1_inputs.json` (e65f7bf585e2efa7...).
- Digests: `g1_digests.node.baked.json` (77579a45f4c8a18f..., 83 cases, 2,205 values), `g1_digests.node.default_meta.json` (75efe127a0bf5b93..., 83 cases; all 83 differ from baked: the timing regimes are not interchangeable), `g1_digests.chromium.baked.json` (64631fd89f628b18..., core 12, page = release/v8/index.html, sha256 4f707d27...). Chromium digests differ from Node digests (walk and evHash in 12 of 12 cases, whole trajectory in 3), as VF-D5 predicts; they are never compared across engines.
- Deviations from the text of VF 3.6.1 (reasons in `docs/eras/spec/VF-impl.md` T3): frozen event field lists for evHash; one frozen strategos added for the possession logs (the generated armies contain no hero); mummies for the stalemate case; survival objective shape for the waves case; sorted-id carrier order; NaN-only finiteness rule.
- Negative controls (21 files `tests/negctl/VF-T03*.mjs`) proven red-as-expected with `node tools/lib/negctl_lite.mjs`.
