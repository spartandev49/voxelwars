# META -> COORD (and UI-A): `ctx.save.importAll` failure contract

`docs/app_contract.md` §2 says `importAll(file|text): Promise<{ok, errors[]}>`. `src/ui/screens/settings.js` (doImportFile / doImportPaste) instead treats a **resolved** promise as success (`await ctx.save.importAll(t); toast(importOk)`) and a **thrown** error as failure (`importFail(e.message)`, and the paste modal keeps its box open with the message).

What is implemented (so the shipped Settings > Data works today without a UI change):
- `src/save/transfer.js createTransfer().importAll(x)` is the pure function from the contract: it never throws and always resolves `{ok, errors[], warnings[], applied[], counts}`; nothing is applied when `ok` is false (all-or-nothing, rollback on a refused write).
- `ctx.save.importAll` in `src/app/main.js` wraps it: resolves the same object when `ok`, and when not `ok` it **rejects** with `new Error(errors[0])` carrying `.result = {ok:false, errors[], ...}`.

Decision needed from COORD: either (a) keep this and patch app_contract §2 to "resolves {ok:true,...} or rejects with Error(.result)", or (b) have UI-A check `res.ok` / `res.errors[0]` in settings.js (two places) and then main.js should return the object instead of rejecting (delete the `if (!r.ok) throw` lines). Option (b) matches the contract text; (a) needs no UI change.

Note: `docs/requests/ui-a.md` item 8 (UI-A's own ask) already says `save.importAll(fileOrText)` "throws an Error with a plain-English message on bad input", so option (a) is what the UI was written against; only app_contract §2's `Promise<{ok, errors[]}>` wording disagrees.
