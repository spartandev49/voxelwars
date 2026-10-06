# Requests from EDITORS-B to SIM (src/sim/stats.js is read-only for me; everything below has a local workaround)

## 1. Diminishing returns in `statsToUnitDef` (editors.md §2: "per-stat caps and diminishing returns")
Today the seven stats are linear in the points (hp = (90 + 2.5 p) * body, dmg x (1 + 0.012 p), cd / (1 + 0.012 p), speed + 0.04 p, armor + 0.012 p, range + 0.1 p, morale 5 p). The caps (30/30/20/20/20/10/10)
and the 100-point pool give the tension, but a single stat's marginal value never drops. If SIM wants the spec's "diminishing returns", please apply an effective-points curve inside `statsToUnitDef`,
for example `eff(p, cap) = cap * (1 - (1 - p / cap) ** 1.6)` (full effect at the cap, marginal value 1.6 at 0 and 0 at the cap), and keep `validateStats` on the RAW points.
The Workshop needs no change: it derives every number it shows (hp, damage, interval, speed, armour, reach, cost, the "next point +N drachmae" line, the radar) from the def that `statsToUnitDef` returns,
and the share/validate schema keeps raw points (total <= 100).

## 2. Height / scale in the derivation
`customDef(cs)` (content/era_ancient/custom.js) calls `statsToUnitDef(...)`, then sets `def.scale = height` (0.9-1.2) and re-prices with `clampedCost(def)` so a taller soldier costs a little more (`sizeFactor` in `sim/power.js`).
Please accept `opts.scale` (or `cs.height`) natively in `statsToUnitDef` so the cost is computed in one place. The render side already multiplies `def.scale` with the per-axis vector that `content.modelFor`
returns (`effective / height`, the clamp 0.85-1.35 applied AFTER the multiplication: `custom.js effectiveScale`).

## 3. Custom defs are non-enumerable entries of `content.defs`
`custom.js bindContent` registers saved soldiers with `Object.defineProperty(defs, id, {enumerable:false})`: `Game.placeAt`, `World.addUnit`, `PreviewService.setUnit` resolve them by id, while
`Object.keys/values(defs)` (armygen pools, the Codex, `unitList()`, the balance harness, the Daily's seeded armies) never see them, so a player's roster cannot change a seeded battle or an AI army.
Please keep that property: never iterate `defs` expecting custom soldiers, and do not freeze/clone `content.defs`.

## 4. Ability legality
`legalAbilities(weaponStyle)` lets `heal_pulse` through for every `bash` weapon; editors.md says "needs staff/scepter". The Workshop and `checkSoldier` (save/validate.js) therefore apply one extra rule
(`custom.js legalAbilityIds`: heal_pulse only for style `cast`, or the main-hand `staff` / `vine_staff`). If you want it enforced in `statsToUnitDef` too, add `opts.mainId` and the same test.
