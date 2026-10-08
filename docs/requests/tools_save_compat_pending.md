# tools_save_compat_pending (TOOLS-GOLDEN -> REGISTRY, filed 2026-10-08)

`tests/save/compat_both_ways.test.mjs` (AR-T13; labels `save_versions save_v8_to_new save_new_to_v8 save_roundtrip save_codes save_v1_chain save_ids save_hidden`) drives the
baseline's save code (`.cache/baseline/ancient-v8/src/save/*`, imported by path) and the code of this tree on the same real v8 profile
(`tests/save/fixtures/ancient_release_v8.mjs`, made by `tools/golden/g5_make_fixture.mjs`). It needs NO change in `src/**` today and is green on the Ancient-only tree.
Two checks are PENDING (printed as `PENDING (not a failure)`, they turn on by themselves when the code exists); no stub, no skip of a whole criterion:

1. `save_roundtrip` / completedEras: `LifetimeStats.prototype.reconcile(registry, progress)` (AR 3.5.5 step 4, called on load) must rebuild `stats.campaign.completedEras`
   (sorted `string[]`, every mission of the era has >= 1 star) from `progress.stars`. The test activates when `typeof LifetimeStats.prototype.reconcile === 'function'`
   and then demands: after new -> v8 -> new the key is back with the value it had, and `stats.eraStats` is empty or absent (documented loss).
2. `save_v8_to_new` / allowed additions: the test lets a v8 profile gain ONLY these leaf paths on load + flush by the new build:
   `settings.goreAuto`, `settings.goreChosen`, `progress.eras.*`, `progress.lastEra`, `seen.basics`, `stats.campaign.completedEras`, `stats.eraStats.*` (AR 3.5.2 / 3.5.5).
   Anything else added, changed or lost is red (`save_v8_to_new`). If a migration of yours legitimately writes another key, add it to `ADDED_OK` in the test in the same change (two signers).

What the test already proves on the current tree (so you can see what a regression looks like):
* a profile carrying every NEW key of 3.5.2 (`progress.eras/lastEra`, `survival.eras`, daily row `era`, `seen.basics/beats/whatsnew/callbacks`, settings `goreAuto/goreChosen/eraQuality`)
  is exported by the new build, imported by the BASELINE's `createTransfer` (ok), flushed and re-exported by it without error; every v8 key equal; every new key survives
  except exactly `settings.eraQuality` (v8 import drops unknown object keys with the warning `Ignored unknown setting 'eraQuality'`), `stats.campaign.completedEras`, `stats.eraStats`.
* the new-era army code is rejected by v8 with `Unknown unit '<id>' (the code may come from a newer game version)`; an arena code with `env.era` opens in v8 as the Ancient arena.
* NC-VF-41 (`tests/negctl/AR-T13.mjs`): renaming `progress.eras` in the save writer turns `AR-T13/save_new_to_v8` red.
