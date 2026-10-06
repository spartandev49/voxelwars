# ANIM -> SIM / RENDER / UNITS-LIB / CONTENT : requests (all small, none blocks the animation tests)

Everything below is a change in a file ANIM does not own. Each item says what is observed today, what to change, and what it buys. File and line numbers are as read on 2026-10-06.

## SIM (src/sim)
1. **Dying units blend over 0.1 s, live units over 0.14 s** (`world.js:769`, `_tickDying`: `u.anim.blend + dt / 0.1`; spec.md 7 says dt / 0.14). The animator's crossfade ease (`x^3 (4 - 3x)`) weighs the first frame after a switch at 4.4 % for a 0.14 s blend (A6: largest joint change at a switch frame 0.29 rad over 12 666 random transitions and 10 weapon / shield kits) but at 10.8 % for 0.1 s: a unit that is hit mid-swing then pops up to 0.9 rad at the moment of death (measured with the A6 harness at 0.1 s: strike_overhead -> death_spin, weapon / arm). Use `dt / 0.14` there too.
2. **Sleeping units should publish `sleep`** (`ai.js:152`: `setAnim(u, se[SE.SLEEP] > 0 ? 'cower' : 'stun', 1)`). A `sleep` clip exists for hum1 and quad1 (lying, breathing); `cower` stays for fear / scare.
3. **Units thrown by a launch** (`hazards.js:87`, knock-up abilities that set `ST.FLY`) keep whatever clip they had (an attack swing in the air). Publish `setAnim(u, 'flail', 1)` when entering `ST.FLY` (looping, arms and legs windmilling); `tumble` (looping roll) is available for big launches. Both exist for hum1; other rigs fall back to `stagger`.
4. Nothing else is needed from the sim: `ClipLib.dur(clip, rig)` is already used for `deathLinger` (`combat.js:208`), `u.gait`, `anim.dir` (`combat.js:204`) and `anim.pt` (optional) are read as documented.

## RENDER (src/render/battleview.js)
5. **Static corpses are posed with the previous unit's heading and scale** (`_onCorpse`, `battleview.js` around line 270): `this.extra` still holds `heading`, `scale` and `lod` of the last unit drawn, and the animator converts the root offsets (fall translation, floor fit, hip-pivot compensation) to world units with them. Set `ex.heading = u.heading; ex.scale = u.scale * r.scaleVec[1]; ex.lod = 0;` before `this.animator.pose(...)` there.
6. Nothing else: `ex.heading`, `ex.scale`, `ex.gait`, `ex.lod` are passed as the animator expects. The animator now floor-fits death / getup / sit / sleep clips, so `rt.y` can be larger than the clip's own root track (it is part of the returned root: keep adding `rt.y` to the unit's y, as `draw` does).

## UNITS-LIB (src/content/era_ancient/blueprints.js)
7. **`compileSoldier` should set `model.meta.weaponStyle = style` and `model.meta.twoHanded`** (it returns them next to the model, `blueprints.js:403`, and `custom.js:170` copies them, but built-in soldiers do not get them). Without the meta the animator guesses the style from the weapon part's shape (long thin shaft = thrust, tall and wide = bow, otherwise slash / bash): right for spears and bows, wrong for staffs (`cast`) and javelins (`throw`), which would aim like a spear.

## CONTENT (units)
8. Optional polish: mummy `model.meta.clipMap = {idle: 'zombie_idle', idle_combat: 'zombie_idle'}` plays the stooped UAL idle (`zombie_walk` has speedRef 1.03 u/s, the mummy walks at 1.9: leave walking to the authored gait).

## What ANIM changed in code owned by others
Nothing outside `src/anim/`, `tests/anim/`, `tests/fixtures/{index,rigs}.js` (fixtures used only by the animation tests and tools), `tools/filmstrip.mjs`, `tools/anim_page.js`, `tools/shot_anim.mjs`, `docs/anim_coverage.md`, `docs/filmstrips/`. `src/anim/clips.js` was extended API-compatibly (`meta/dur/duration/hit/get` take an optional rig argument; `getQualified`, `owner`, `qualifiedIds`, `reset`, `version` are new).
