# CAMPAIGN -> SIM: bugs and missing hooks found while running the nine missions headless

Owner of the files: SIM (`src/sim/**` is read-only for CAMPAIGN). Items are ordered by how badly they hurt a shipped mission.

## 1. CRASH: `breachBehaviour` throws for a siege unit without a ranged weapon (trojan_horse)
`src/sim/ai.js` line ~269, inside `breachBehaviour`:

```js
if (info.siege || (def.ranged && !def.melee)) {
  if (!info.siege) { u.breach = null; return false; }
  if (t && t.alive) { u.breach = null; return false; }
  const r = def.ranged;                       // <- undefined for trojan_horse (role 'siege', melee ram only)
  if (gap > r.range * 0.95) ...               // TypeError: Cannot read properties of undefined (reading 'range')
```
`trojan_horse` has role `siege` (so `aiInfo().siege` is true) but only a melee ram. The first time it is blocked by a destructible prop (a Troy gate door, an Olympus column, a tree) the whole World.tick throws. Mission 7 (Siege of Troy: the horse is the point of the mission) and mission 9 (mythic wave 3 brings a horse) hit it in the first minute.
Fix: take the siege branch only when `def.ranged` exists: `if (def.ranged && (info.siege || !def.melee))`, otherwise fall through to the melee breach below (the horse rams the door, which is what the mission text promises). Test: a trojan_horse spawned next to a `gate_door` destroys it with melee hits and the tick never throws.
Until it lands, `tests/campaign/_lib.mjs` sets `aiInfo(defs.trojan_horse).siege = false` in the harness only so the missions can be measured; the shipped game still crashes.

## 2. `protect_vip` with `reachOnly` never reports progress
`ProtectVip.step`: `if (this.params.reachOnly) p = 0;` so the objective ring stays at 0% for the whole escort. Suggest progress = 1 - (distance of the VIP to the exit marker) / (its start distance), clamped to 0..1. Mission 4 and the Goat Logistics puzzle use `reachOnly:true`.

## 3. VIP behaviour: a VIP unit still fights
`u.vip` only adds +5 to enemy target scores. A VIP goat with a melee weapon charges the first enemy within 17 u (it is a `charge` unit). CAMPAIGN works around it with a def override (no melee, no abilities) for the mission VIP, so it follows its squad and never attacks. A native `vip` behaviour would be cleaner: a VIP follows its squad order (move to the exit marker), never starts a fight, flees from enemies within 6 u when it has no order. Not blocking.

## 4. WaveSystem leaves the stalemate watchdog running during an intermission
During `state === 'intermission'` nobody deals damage, so `World.lastDamageT` ages: at 12 s `stalemate_warning`, 18 s `forceAdvance`, 30 s Zeus lightning + a goat for the weaker side, 44 s `intervention: ragequit` (a DRAW). A Survival intermission that the player takes their time with (the Game pauses the loop, so sim time stands still, but headless runs and a Game that does not pause) can end the run. Suggest `WaveSystem.spawn()` and the transition into `intermission` set `w.lastDamageT = w.time`, and `_checkEnd` skip the watchdog while `w.waves && w.waves.state === 'intermission'`.

## 5. `World.addPlacements` ignores `vip` / `general`
`addPlacements` forwards only `{heading, squad, def, name, custom}` to `addUnit`; `vip` and `general` flags exist on `addUnit` but cannot be set from a placement record. CAMPAIGN sets `u.general = true` / `u.vip = true` on the unit objects after placement (fine for the mission setup, but a `Setup.armies[...].placements` record that carries `general:true` would let a share code / rematch keep the flag). Optional.

## 6. `ST.DOWN` units count for `hold_hill` as absent but not for `Eliminate` progress
Not a bug, noted for the objective HUD: `Eliminate.progress` uses `stats.alive`, which includes routed units far from the field. Fine as is.

## 7. generateArmy at the unit cap leaves budget unspent (survival waves 38+)
`generateArmy(..., cap: 300)`: when the first buy already exceeds the cap, `while (total() > cap)` drops the cheapest units and the top-up loop never refills (the swap branch only runs while `total() >= cap` inside the top-up). Wave 38 of a seed-7 run costs 31,185 of a 36,600 budget (wave 37: 35,685), wave 43: 34,145 of 41,100. Harmless below wave 37 and nobody reaches it, but the ramp stops being monotone there. Suggest: after trimming, run the same "swap the cheapest for the most expensive that fits" loop. Also: a boss wave of the chaos style has 17 unit types (16 + the boss), over the 16-type cap of spec 2 for a single army; fix by passing `maxTypes: 15` to generateArmy when a boss is appended.

## 8. `rules.waves` alone ends a Survival run after the first cleared wave
`World` creates the `WaveSystem` from `rules.waves`, but nothing tells `_checkEnd` that more waves are coming: when the field empties between waves, `a <= 0 || b <= 0` -> `end(0, 'elimination')` and the run finishes as a VICTORY after wave 1 (the score screen would show "Fell at ..." for a win). Only the `survive_waves` objective (`blocksElimination`) prevents it, so Survival must also carry `rules.objective = {type:'survive_waves', params:{waves: 1e9}}`. CAMPAIGN's `survivalRules()` does exactly that (tests/campaign/survival.test.mjs has the negative control), but the trap is the sim's: suggest `WaveSystem` exposes `blocksElimination` (true while `maxWaves === 0 || n < maxWaves`) and `_checkEnd` ORs it in, so `rules.waves` is self-sufficient.
