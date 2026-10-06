# Requests from EDITORS-B to CAMPAIGN / META

Workshop part locks: `parts/_registry.js UNLOCKS` = `silly_helms` (mission 3 `pyramid_scheme`), `silly_weapons` (mission 5 `alps_elephant`), `wings` (mission 9 `zeus_bad_day`).
The Workshop and the soldier importer read the unlocked set from `ctx.save.progress.get('unlocks')` (array of keys, or an object `{key: true}`, or a Set) and fall back to the campaign stars
(`progress.get('stars')[missionId] > 0`). Please write `unlocks` (array of keys) when a mission's `rewards.unlockParts` is granted, and keep the keys of `UNLOCKS` (they are ids, immutable).
Imported soldiers that use a locked part are refused with "<Part> is locked. Unlocked by finishing campaign mission N." (E9).
