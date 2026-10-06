# Requests from EDITORS-B to COORD (and notes on the edits I made outside my directories)

## Done by me (please keep / review)
- `src/app/main.js`: ONE added line after the `collections` are built: `if (CUSTOM && CUSTOM.bindContent) CUSTOM.bindContent(content, collections.soldiers);` It overrides `content.customDef` (so every call registers the def
  as a non-enumerable entry of `content.defs`), registers the saved soldiers up front and wraps `content.modelFor` for custom defs (own compile with the derived range/radius, cached per id + revision). Without it
  custom soldiers cannot be placed: `Game.placeAt/_applyRecord` look the def up in `content.defs[id]`.
- `src/save/validate.js` (`validateSoldier`, new `checkSoldier`) and `src/save/share.js` (`packSoldier` / `unpackSoldier`, palette-indexed paint layers in soldier codes): soldier schema parts only.
- Entry files `src/editors/workshop.js` and `src/editors/painter.js` (re-exports): the generated registry globs `src/editors/*.js` NON-recursively, so the implementation in `src/editors/soldier/**`
  and `src/editors/painter/**` is reached through them. If you make the editors glob recursive, delete nothing: the entries then simply register twice under the same `meta.id`.
- `src/ui/editors_soldier.css` is in `tools/build.mjs` (already listed).

## Requests
1. `BattleView.forget(key)` (dispose + delete `skins.get(key)`): an edited custom soldier keeps its def id, and BattleView caches one skin per def id for the whole session. `editors/soldier/drafts.js purgeSkin`
   calls `view.forget(id)` when it exists and otherwise reaches into `view.skins` itself. Same for the Codex/preview caches if they ever show custom soldiers.
2. Placement: `ctx.nav.goto('placement', {tab:'custom'})` (or selecting the "My Soldiers" tab when the brush's def is custom) so "Use in battle" can land on the palette tab that lists the soldier.
   Today the squad is pre-placed by `editors/soldier/drafts.js testInBattle` (brush -> `game.placeAt` in zone A, `autoFill(1)`), so nothing is lost, the tab just is not preselected.
3. Progress contract for part unlocks: the Workshop reads `ctx.save.progress.get('unlocks')` (array, object or Set of the keys of `parts/_registry.js UNLOCKS`: `silly_helms`, `silly_weapons`, `wings`)
   and falls back to "mission cleared" via `progress.get('stars')` (`pyramid_scheme` -> silly_helms, `alps_elephant` -> silly_weapons, `zeus_bad_day` -> wings). CAMPAIGN/META should write the first form when a
   mission with `rewards.unlockParts` is cleared.
4. `ctx.content.parts` etc. are not needed by my screens (they import the registry directly); `ctx.editorHost` is not used by the painter: its 3D view is a small own WebGL view (`painter/view3d.js`) because
   the host is terrain/props-centred. If you prefer one GL context, `PartView` has a 12-method surface (setPart, rebuild, setCursor, setPreview, setSelection, setMirror, pickAt, ...) that an EditorHost adapter can implement.
5. Auto-quality (`Loop._autoScale`) shows its toast over the editors' bottom bars on slow machines; the editors do not need it (canvas mode `none`). Consider suppressing the toast when `canvasMode` is `none`.
