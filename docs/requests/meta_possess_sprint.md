# META -> SIM: a `sprint` flag for Take Command (sim/possession.js)

**What**: `world.input(tick, {type:'possess', unit, move:{x,z}, attack, ability, sprint?:bool})`. While `sprint` is true and the controlled unit is moving, its speed is `speedBase * mSpeed * 1.5` (suggested; no stamina, no cooldown) and its walk/run clip picks the run band as usual (the Animator derives the clip from `speedNow`).

**Why**: `ui/hud/takecommand.js` sends `{move:{x,y}, sprint}` (the touch stick pushed past its rim = sprint) and `Game.possessInput(patch)` forwards it. `app/meta.js PossessController` today turns the stick into a unit vector (sprint = full-magnitude stick), because `possession.js apply()` clamps `|move|` to 1 and has no run bonus, so on the sim side a sprint is indistinguishable from a full walk.

**API**: add `this.sprint = !!cmd.sprint` in `Possession.apply`, and in `tick()` multiply `sp` by `SPRINT_MUL` when `this.sprint && mlen > 0.05`. META will start sending `sprint` as soon as the field exists (the PossessController already carries the flag; the one-line change is in `_emit`).

**Not blocking**: everything else in Take Command (camera-relative movement, attack hold, edge-triggered abilities, auto-exit when the soldier dies, `hud.possess`) works without it.
