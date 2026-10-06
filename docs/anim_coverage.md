# anim_coverage.md — what plays on screen and where it comes from (owner ANIM)

Every clip the sim can publish has a clip for every rig it can appear on, and every clip is either **authored** (`src/anim/clips/*.js`, keyframes through `anim/dsl.js`, IK gaits through `anim/gait.js`) or **retargeted** from the free Universal Animation Library packs (`assets/anim/humanoid_clips.json`, adapter `anim/ual.js`, selection table `anim/ual_adopt.js`). A retargeted clip is adopted only when it passes the A3 review (no limb flips, joint ranges, near-neutral ends, a usable timing) AND the boot-time hinge check (`clampHinges`: a knee or elbow pushed past its stop in more than 6 % of its samples is a bad retarget and the clip is dropped). Rejected clips are replaced by authored ones, so the sim never plays something that failed the review.

`registerAllClips(ClipLib, {humanoid})` (anim/boot.js) registers 146 authored clips and 17 adopted UAL clips (19 candidates in `ual_adopt.js`, 2 rejected at boot; 6 of the adopted ones replace an authored twin). Evidence: `tests/anim/clips.test.mjs` (A1, A2), `ranges.test.mjs` (A3 joint ranges, A7), `gait.test.mjs` (A3/A4 foot slide), `timing.test.mjs` (A5), `blend.test.mjs` (A6), `ride.test.mjs` (A8), `perf.test.mjs` (A9), `dsl.test.mjs`, `roster.test.mjs` (every shipped unit def with its real model: every clip the sim publishes for it, A4 at its own speed and scale, A7).

## 1. Humanoid (hum1 / hum_lite) sim slots

| clip | plays | source | note |
|---|---|---|---|
| idle | UAL `Idle_Loop` | retargeted (replaces authored) | overlay adds breath / sway; authored twin kept as `authored_idle` for tools |
| idle_combat | UAL `Sword_Idle` | retargeted (replaces authored) | deep knee bend ready stance; weapon aim (AIM table) keeps the shaft upright |
| walk / jog / run | authored IK roll-over gaits, speedRef 2.4 / 3.8 / 5.6 u/s | authored | distance driven (`extra.gait`); UAL `walk` and `run` rejected (see 3) |
| rout | authored, speedRef 5.0 | authored | arms thrown up, head whipping back |
| strike_slash_1 / 2 | authored two-beat slashes with weapon `aim` tracks, hit 0.30 s | authored | UAL slashes rejected (pelvis spin) |
| strike_thrust | authored spear lunge, hit 0.28 s | authored | UAL thrust is a one-handed sword dash |
| strike_overhead | authored two-beat chop, hit 0.46 s | authored | UAL chop has no wind-up |
| strike_bash | authored shield bash, hit 0.28 s | authored | |
| kick | authored push-kick (Spartan), hit 0.30 s | authored | weapon stays at the ready |
| shoot_bow / throw / cast / launch | authored, hit 0.60 / 0.40 / 0.50 / 0.50 s | authored | release is a one-frame snap on the tip-speed peak |
| block_hold | UAL `Idle_Shield_Loop` | retargeted (replaces authored) | |
| block_hit | authored shield jolt, 0.30 s | authored | |
| hit_front | UAL `Hit_Chest` | retargeted (replaces authored) | |
| hit_back, stagger, stun, dizzy, cower | authored | authored | stun / dizzy / cower loop |
| sleep, flail, tumble | authored | authored | extras the sim should publish (docs/requests/anim.md) |
| death_back | authored (UAL `Death_Back` is rejected at boot) | authored | UAL retarget hyperextends both elbows in 41 samples; fall direction follows `anim.dir` (`meta.fall`) |
| death_front, death_spin | authored | authored | no death in the free packs |
| getup | UAL `LayToIdle`, retimed to 1.1 s | retargeted (replaces authored) | `meta.enter = 'lying'` |
| cheer, taunt | authored | authored | |
| sit | UAL seated idle | retargeted (replaces authored) | hip 0.45 u below standing (throne gag) |
| ride_idle / walk / trot / gallop / strike / shoot / death | authored seated clips | authored | the animator derives them from the published clip id (RIDER_OF); `r_` hips stay inside 0.04 u of the saddle (A8) |
| crew_idle / crank / push / shoot / react / launch | authored | authored | siege and elephant crews (`hum_lite`) |

Extras registered under their own id (no authored twin; reachable through `model.meta.clipMap` or direct requests): `zombie_idle`, `zombie_walk` (mummy), `dance`, `point_order`, `talk`, `walk_formal`, `roll`, `crouch`, `knockdown`, `hit_head`, `sit_enter`. `smug` is a candidate too but fails the hinge check (150 samples) and is not registered.

## 2. Non-humanoid rigs (all authored)

| rig | clips |
|---|---|
| quad1 (horse; camel, hound, goat via `<species>_<clip>` variants) | walk, trot, gallop, idle, idle_combat, rear, taunt, cheer, strike_bite, strike_headbutt, hit_front, hit_back, block_hit, stagger, stun, dizzy, cower, sleep, death_back/front/spin (+ species variants), getup. `strike_ram`, `strike_thrust`, `strike_slash_*`, `strike_gore`, `strike_stomp` map to the nearest clip (`mountClip`, `model.meta.clipMap`) |
| elephant1 | walk, run (charge), idle, idle_combat, strike_gore, strike_stomp, trumpet, hit_front, stagger, stun, dizzy, cower, death_back (death_front / spin fall back to it) |
| chariot1 | trot, gallop (wheels roll with `extra.gait`), idle, idle_combat, strike_ram, shoot_bow, hit_front, death_back; the horses play quad1 gaits, driver and archer play `ride_*` |
| catapult1 / ballista1 | idle, idle_combat, walk (pushed), launch (arm / string / bolt / stone), reload, hit_front, death_back; the crews play `crew_*` |
| trojan1 | idle, idle_combat, walk, strike_ram, reveal (hatch ramp), death_back |
| chicken1 | walk, trot, gallop (scurry), idle, idle_combat, strike_peck, flap, tantrum, hit_front, hit_back, stagger, stun, dizzy, cower, death_back |

Rigs that lack a clip the sim may still publish use a documented substitute (`FALLBACK` in animator.js; the animator warns once per missing clip in tests, never in production): machines and the trojan horse do not stagger, stun, cower, get dizzy, cheer, taunt or get up (they stand: `idle` / `idle_combat`, `hit_front` for a hit); `death_front` / `death_spin` fall back to `death_back` on every non-quad rig; `rout` plays the fastest gait; `shoot_bow`, `throw` and `cast` on an animal or machine are the crew's job and the base plays `idle_combat` (the crew sub-rigs play `crew_shoot` / `crew_launch`).

## 3. Retargeted clips reviewed and rejected (measured reasons)

| UAL clip | slot | reason |
|---|---|---|
| walk | walk | speedRef 1.1 u/s: the roster walks at 1.9-4.2 u/s, so it would play at 2-3.8x (frantic shuffle); the authored gait is distance driven |
| run | run | speedRef 6.3 u/s, 2.9 leg lengths per step: floaty slow motion at 3-5.6 u/s |
| sprint | rout | unreliable speed estimate and a flight phase that digs the rigid foot in |
| strike_slash_1 / 2 | melee | export a 120 / 122 degree pelvis spin (rootYaw): the unit turns away from its target mid-swing |
| strike_overhead | melee | starts and ends with the weapon raised, the chop is 3 frames: no wind-up or recovery |
| strike_thrust | melee | one-handed sword dash with 0.5 leg length of root drift, no spear grip |
| strike_combo | melee | four strikes and a 390 degree spin: not a single attack |
| strike_bash | melee | a 26 frame shove with the shield already forward |
| throw | ranged | drops the body to the ground (rootPitch 60 degrees), two-handed grip |
| cast | ranged | bare hands, no staff |
| block_enter, shield_break | reactions | end in a parry pose / 1.1 s long and start in the shield stance |
| death_back | death | convincing fall but hyperextended elbows (41 samples): rejected at boot by the hinge check |
| smug | extra | hyperextended elbows (150 samples): rejected at boot |

## 4. What the Animator reads from a model (`ModelDef.meta`)

- `rig` ('hum1', 'hum_lite', 'quad1', ...) and `subrigs: [{prefix, rig, parts, kind}]` for composed units: every sub-rig is posed with its own clip family (`clipRig`; `hum_lite` uses the hum1 clips and ignores missing parts). Roles come from the prefix: `r_` rider, `d_` driver, `a_`/`a1_`/`a2_` archers, `c1_`..`c3_` siege crew.
- `species` ('camel', 'hound', 'goat'): tries `<species>_<clip>` first. `clipMap` {sim id -> rig clip} re-targets ids (`strike_thrust -> strike_bite`, `cast -> launch`, ...); the fallback chain is `clipMap`, `<species>_<id>`, the id, its FALLBACK list (e.g. `hit_back -> hit_front -> idle_combat`), `idle`, always with a warn-once.
- `weaponStyle` ('slash' | 'thrust' | 'pike' | 'overhead' | 'bash' | 'shoot' | 'throw' | 'cast' | 'none'): selects the aim table. Without it the animator guesses from the weapon part's shape (long thin shaft = thrust, tall and wide = bow, ...). `compileSoldier` returns the style next to the model but does not put it in `model.meta` (request in docs/requests/anim.md).
- `gait` ({hipH, walk|trot|gallop|run: {amp, duty, stride}}) is documentation of the BEASTS recipe; the clips are generated from the same numbers. `pivotY` overrides the root-rotation pivot (default: origin of `body` / `frame` / `base`).
- Part ids used by the humanoid overlays: `body head crest armUL armLL armUR armLR weapon offhand legUL legLL legUR legLR back cape cape2`.

What the sim publishes (`u.anim = {clip, t, rate, flinch, dir, prev, blend}` plus `extra = {speed, gait, dead, t, id, hp, state, team, root, heading, scale, lod}` from BattleView): ONE clip id; the animator derives mount, rider and crew clips, picks walk / jog / run (or trot / gallop) from `speed`, advances the gait phase from `gait` (distance travelled; stride and speed bands scale with `extra.scale`), and sets cadence so steps per second stay inside 1.5-3.5 for every infantry def.

## 5. Weapon, shield and other conventions

- **Weapon aim** (`aimPass`): the blade axis is steered to a target direction (elevation, azimuth) in the heading-aligned upright unit frame, from the clip's `aim` track (`[t, elevation, azimuth, weight, twist]`) or, for clips without one, from the style table (thrust / pike / throw / cast / shoot only; blades follow the forearm). The wanted direction is a spherical interpolation from where the axis points when following the forearm to the target by the weight; the pose is the shortest arc from the model's rest axis (`p.rest`: `R_UPRIGHT` 0.3 for polearms, `R_CARRY` 2.44 for blades) plus an optional twist about the axis (bow belly). It is a pure function of the blended arm pose, so crossfades cannot pop. Rotationally symmetric shafts (thrust, pike, throw, cast) may flip through half a turn (a spear held backward and thrust forward); blades and bows fade the aim out as the demanded turn approaches half a turn (their edge would spin), which is why overhead wind-ups keep the axe following the forearm near the top.
- **Shield**: counter-rotates the arm relative to the torso (pitch sum of arm and forearm, yaw, roll; soft-saturated, gain <= 1) while the guard is raised, so the face stays square; relaxed for arms thrown right up (cheer, cower).
- **Crossfade**: the sim advances `blend` by dt / 0.14; the animator weights the previous clip by `x^3 (4 - 3x)`, so the first frame after a switch moves poses by 4.4 % of the gap (A6) and the previous clip keeps advancing during the blend. Channels are blended along the authored path (a gap beyond 4.7 rad is a wrap).
- **Ground contact**: death, getup, knockdown, tumble, sleep and sit clips are floor-fitted at runtime (once per model and clip: lowest solid point of every frame by forward kinematics, held items and capes ignored): corpses never sink, rest on the ground and are never left floating.
- **Locomotion**: hum1 gaits are roll-overs (heel or mid-foot strike, flat, toe pivot) with the contact vertex planted at exactly the clip speed; quadruped, elephant and bird legs are rigid, so the sole is planted by turning the leg and sliding its buried pivot (`gait.js plantRigidLeg`). Foot slide at the design speed: hum1 0.4-1.0 % (rout 4 %), non-hum rigs 2-12 % of the stride (limit 15 %).
- **LOD** (`extra.lod`): 0 full, 1 no secondary motion (crest, cape, idle overlays), 2 frozen pose (no overlays, no root finishing); BattleView skips units beyond the far plane. 500 mixed units cost 0.7 ms per frame (limit 4 ms), a pose allocates about 17 bytes.
