# EDITORS-A -> COORD (world/arena.js, render/terrain.js): small additions the Arena Builder works around today

## 1. `Arena.objective` and `Arena.tags` (world/arena.js, COORD)
The Builder lets the author pick a default **objective** (`eliminate | kill_general | hold_hill | protect_vip | destroy`, editors.md section 1 tool 16) and up to five **tags**.
`Arena` has no such fields, so `toJSON`/`fromJSON` drop them. Workaround in `src/editors/arena/docs.js`: the extras ride next to `Arena.toJSON()` as
`{objective, tags}` in the share code, library items and drafts (`toDoc` / `readMeta`), and are validated there.
Request: add to `Arena` (default `'eliminate'`, `[]`), serialise them in `toJSON`, validate in `fromJSON` (objective in the five ids, tags: <= 5 strings of <= 16 chars,
control characters stripped). The builder already writes the same keys at the top level of the doc, so the codes stay compatible. Quick Battle can then read `arena.objective`
to pre-select its objective picker (world.md section 8).

## 2. `TerrainRenderer.refreshLiquid()` (render/terrain.js, COORD)
Changing `arena.water` / `arena.lava` (or removing the water) needs the liquid plane rebuilt, but `flush()` only calls `_buildLiquid()` when chunks were rebuilt and `water > 0`
(so removing the water leaves the old plane). `EditorHost.refreshLiquid()` calls `terrain.refreshLiquid()` when it exists and the underscored `_buildLiquid()` otherwise.
Request: a public `refreshLiquid()` that is `_buildLiquid()`.

## 3. Lava hazard circles (sim/hazards.js, SIM)
The Builder's "lava pool" hazard paints `lava` material under its circle and stores `{t:'lava', x, z, r}`. `HazardSystem._liquid` only damages lava cells when a lava plane exists
(`arena.water > 0 && arena.lava`), so a pool in an arena without the plane is non-walkable (nav) but harmless. Request: damage (30 dps) for `mat.hazard === 'lava'` cells and for
`kind === 'lava'` circles regardless of the plane.

## 4. Game.begin for Playtest (app/game.js, COORD) - informational
Playtest calls `game.newSetup('quick', {arena:{data: arena.toJSON(), size, seed}, rules:{objective}})`, `await game.begin(setup)`, `autoFill(0)`, `autoFill(1)`, then
`ctx.nav.goto('placement', {setup, arenaName})` so the placement title shows the arena's own name. A `setup.arena.name` that placement could read would make the last goto unnecessary.

## 5. `platform.isPhone()` flags 960x540 (app/main.js, COORD) - informational
`isPhone: () => Math.min(innerWidth, innerHeight) < 600` classifies the standard small test window (960x540, AGENTS.md) and any short desktop window as a phone, but editors.md section 0
says tablet-and-up means >= 768 px *wide*. The Arena Builder therefore applies its own rule (`innerWidth < 768 || innerHeight < 480` -> `phone_notice`) and ignores `isPhone()`;
EDITORS-B's screens use `isPhone() && innerWidth < 768`. The title menu still routes Create tablets to `phone_notice` when `isPhone()` is true, so at 960x540 the builder is reachable only by
direct navigation. Suggested: `isPhone: () => innerWidth < 768` (landscape phones are caught by the 480 px height rule inside the editors).
