# Animation retarget spike: Quaternius Universal Animation Library -> voxel rig `hum1`

Status: spike finished. Verdict: **GO WITH FIXES** (section 1). All numbers below come from `docs/anim_spike/metrics.json`, produced by `tools/anim/bake.mjs`, and every claim about motion quality was checked by looking at the filmstrips in `docs/anim_spike/` (each has a third row showing the *source* mannequin skeleton for comparison).

## 1. Summary and verdict

* 39 clips shipped in `assets/anim/humanoid_clips.json` (332 KB, 30 fps, 3-decimal Euler angles). They come from the free "Standard" zips of UAL 1 (45 clips) and UAL 2 (42 clips); we used 43 of those 87 source clips (several are concatenated attack + recovery, so 39 shipped clips).
* The retarget is **direction-exact**: for every limb segment, the end-to-end direction error of the *rounded* shipped data (through our own rig FK) versus the source skeleton is <= 0.13 deg for 34 of 39 clips; the other five are 0.46 to 1.05 deg (`point_order`, `cast`, `idle_combat`, `shield_break`, `zombie_idle`: arms pointing almost exactly sideways, where one swing angle becomes ill-conditioned). Loops close (the wrap step is comparable to or smaller than the mean frame step; worst case idle 0.6 deg vs 0.4 deg mean), angles are continuous (no 2*pi jumps, no limb flips), and the only Euler-pole flags in the whole library are 4 head frames in `roll`.
* The motion is real animator quality: run, walk, slash, lunge, throw, death, get-up and roll are immediately recognisable on the blocky figure and match the source skeleton frame for frame.
* What it is **not**: it is not a drop-in fix for the game's locomotion speeds (UAL walk is a 1.1 u/s stroll, UAL run is a 6.3 u/s sprint-jog, the roster walks at 2.5 to 3.4 u/s), it has no feet (our rigid boot digs 1.4 to 3.3 voxels into the ground), and about a dozen of the clips on our wish list do not exist in the free packs (section 8).
* Reasons for "with fixes": (1) locomotion cadence gap, (2) toe/foot penetration, (3) a few clips start or end in poses far from idle (blend rules, section 12), (4) fast strike frames need quaternion slerp or accept a few frames of 25 to 50 deg mid-frame error, (5) missing clips must be authored procedurally.

Licence: CC0 1.0, no attribution required; section 9.

## 2. What was downloaded (provenance)

All downloads are untrusted data: parsed by a pure-Node glTF reader, never executed. Only the `.glb`, `License.txt` and the README were extracted; the FBX/Blend/PNG files in the zips were left unextracted.

| item | URL | size | sha256 |
|---|---|---|---|
| UAL 1 Standard zip | https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip | 14,541,205 B | see section 10 |
| UAL 2 Standard zip | https://opengameart.org/sites/default/files/universal_animation_library_2standard.zip | 10,257,419 B | see section 10 |
| `AnimationLibrary_Godot_Standard.glb` (UAL1) | inside zip 1, `Godot/` | 6,671,104 B | see section 10 |
| `UAL2_Standard.glb` | inside zip 2, `Unreal-Godot/` | 8,061,600 B | see section 10 |

Stored under `assets/raw/quaternius-ual1/{dl,files}/` and `assets/raw/quaternius-ual2/{dl,files}/` (git-ignored). Pages: https://opengameart.org/content/universal-animation-library , https://opengameart.org/content/universal-animation-library-2 , https://quaternius.com/packs/universalanimationlibrary.html (and `...2.html`).

Honest note on counts: the marketing pages say "45 animations / 120+" and "130+". The free Standard zips contain **45 usable clips (UAL1, plus A_TPose)** and **42 (UAL2, plus A_TPose)**. The 120+/130+ numbers refer to the paid Source pack, which we did not use. The free packs have one death clip, no strafing, no bow, no kick, no cheer.

## 3. The UAL rig (both libraries)

Both libraries use the same mannequin and the same skeleton; only the bone names differ. glTF Y-up, metres, character faces +Z, character LEFT bones are at +X. Rest pose is a **T-pose**: arms straight along +/-X with palms down (thumbs toward +Z), legs straight down (shin tilted back 4.7 deg), body upright. Hip joints are at y = 0.932 m, hip-to-ankle 0.830 m (thigh 0.400 + shin 0.430), ankle 0.104 m above the floor, shoulders 0.19 m off the centre line, arm (shoulder to wrist) 0.547 m.

Hierarchy (UAL1 / UAL2 names; 53 / 65 joints including fingers):

```
Rig|Armature            (scene root; Mannequin skinned mesh is a sibling)
 root                   static rotation -90 deg about X (Blender export); translated only in the *_RM clips
  DEF-hips | pelvis
   DEF-spine.001 | spine_01 -> .002 | spine_02 -> .003 | spine_03
     DEF-neck | neck_01 -> DEF-head | Head
     DEF-shoulder.L | clavicle_l -> DEF-upper_arm.L | upperarm_l -> DEF-forearm.L | lowerarm_l -> DEF-hand.L | hand_l
         -> index/middle/ring/pinky 01..03 (+ _04_leaf in UAL2), thumb 01..03 (UAL1 only)      (same for .R / _r)
   DEF-thigh.L | thigh_l -> DEF-shin.L | calf_l -> DEF-foot.L | foot_l -> DEF-toe.L | ball_l (+ ball_leaf_l)   (same for .R / _r)
```

Facts that mattered for the retarget: every clip animates translation, rotation *and* scale channels for every bone (baked, 30 fps, durations are exact multiples of 1/30 s); the `root` bone never rotates in either library (checked for every clip), so the character always faces +Z; the clips named `*_RM` are the same animation as their plain twin plus root translation (`Roll`/`Roll_RM`, `Sword_Attack`/`_RM`, `Hit_Knockback`/`_RM`; `Sword_Dash_RM`, `Shield_Dash_RM`, `ClimbUp_1m_RM` have no in-place twin), so root motion is simply dropped; the pelvis hip line is yawed -13 deg in most standing clips (the animator's relaxed stance), which is why heading removal (section 4) matters.

Mapping table: `tools/anim/mapping_ual.json` (`rigs` section: role -> bone name for each library, `clips` section: our clip -> source clip(s)).

## 4. Conventions of the baked data

Right-handed, +Y up, character faces +Z, character LEFT = +X (matches `docs/spec.md` section 1). Part ids `...L` are the +X side. Source bones `.L` / `_l` are +X too, so there is **no mirroring and no axis conversion**.

* **Euler**: `localRot = Ry(ry) * Rx(rx) * Rz(rz)`, radians, about the part's own pivot, in the parent's local frame. This is exactly three.js `Euler(rx, ry, rz, 'YXZ')`. `q[part]` is a flat array `[rx,ry,rz, rx,ry,rz, ...]`, one triple per frame. Positive `rx` swings the limb's -Y axis toward -Z (forward raise of an arm is **negative** rx, knee flexion is **positive** rx on `legLL/legLR`).
* **Limbs** (`armUL armLL armUR armLR legUL legLL legUR legLR`) are *swing only*: `ry` is always 0, `local = Rx(rx)*Rz(rz)`. This is the direction-based retarget the brief asked for (no twist), and it was also necessary for numerical reasons (section 5).
* **body**: direction pelvis-to-neck (hip-joint midpoint to neck bone), plus a twist about that axis taken from the chest bone (so `body.ry` carries spine twist, gain 1.0, clamp +/-1.3 rad = 74.5 deg; the clamp is active in only 8 frames of the library: `strike_slash_1` f15-f21, where the chest twists 78 to 81 deg against the pelvis, and one inverted frame of `roll`; arms and head keep their exact world directions regardless). **head**: full orientation relative to the body.
* **root**: `root[i]` = vertical offset of the hip pivot, `rootX[i]`, `rootZ[i]` = horizontal offset, all in **leg lengths** (1.0 = 10 voxels = 1.0 world unit), relative to the rest pose. `rootPitch`, `rootRoll` and (optional) `rootYaw` are Euler angles of the whole rig about the **hip pivot** `(0, 10 voxels, 0)`: `Ry(rootYaw)*Rx(rootPitch)*Rz(rootRoll)`. Missing optional arrays mean 0. `rootPitch` is unwrapped (`roll` runs 13 to 356 deg).
  `rootWorld = T(rootX*L, root*L, rootZ*L) * T(hip) * R(yaw,pitch,roll) * T(-hip)` with `L = 10 voxels`, `hip = (0,10,0)` in root space. Reference implementation: `tools/anim/fk.mjs` (used by the renderer and metrics).
* **Heading removal ("remove source root yaw")**: the pelvis heading (yaw of the hip line, unwrapped per frame) is removed from the whole pose, so legs face forward and only genuine spine twist is left in `body.ry`. The removed heading is exported as `rootYaw` only if it varies by more than 20 deg in the clip (slash_1, slash_2, overhead, thrust, combo, punch_3, shield_dash, throw, death, getup, cast, dance). The game may ignore it (character then swings the weapon in pelvis-relative space) or play it as a visual-only turn of the model; for the 390 deg spin inside `strike_combo` playing it is what makes the spin visible.
* **Root translation** is in-place: the source hips motion (bob, lunge, crouch) is kept relative to the rest pose, scaled by 1/0.830 m so that the hip-to-ankle length equals our 10-voxel leg. Source root translation is discarded. `rootX/rootZ` are visual lunge offsets; the game can scale them or ignore them (clips whose net displacement is non-zero, e.g. thrust and combo, do not loop back to 0 and must be treated as local offsets).
* **Ground**: clips flagged `snap` (idles, locomotion) have a constant shift in `root[]` so that the lowest sole point of the whole clip rests on y = 0 (`meta.groundShiftVox`, at most 0.55 voxel). Clips flagged `floor` (knockdown, death_back, getup, roll) have a raise-only per-frame correction so that no body box goes below the ground while lying or rolling (`meta.floorRaiseMaxVox`, up to 8 voxels, which is just the body thickness).
* **Loops**: for looping clips the duplicated closing frame of the source was dropped, so playback wraps `N-1 -> 0`. Frame counts are exact (`walk` 40 frames = 1.333 s).

JSON layout:

```json
{ "rig":"hum1", "fps":30, "parts":["body","head","armUL","armLL","armUR","armLR","legUL","legLL","legUR","legLR"],
  "conventions":{...}, "license":"...",
  "clips": { "walk": { "frames":40, "loop":true,
      "meta": { "durationFrames":40, "src":"Walk_Loop", "groundShiftVox":0.06, "speedRef":1.1, "strideVox":14.7 },
      "root":[...40], "rootPitch":[...40], "rootRoll":[...], "rootX":[...],        // optional ones omitted when ~0
      "q": { "body":[...120], "head":[...120], "armUL":[...], ... } } } }
```

Attack meta (all frame numbers are 30 fps indices): `hitFrame` = weapon contact (see section 6), `peakSpeedFrame`, `recoverFrame` = swing finished (strike-direction tip speed below 20 % of its peak: earliest cancel window), `hand` (`L`/`R`), `peakSpeed` (tip speed in m/s of the source mannequin), `hitFrames[]` / `recoverFrames[]` for combos, `segments` (start frames of concatenated source clips), `cuts` (a trimmed hold, the pose jumps slightly there).

## 5. Method, and the problem that shaped it

1. Parse GLB (`tools/anim/glb.mjs`), sample every clip at 30 fps through full FK (root translation zeroed).
2. Measure the world direction of every segment (thigh hip->knee, shin knee->ankle, upper arm shoulder->elbow, forearm elbow->wrist, spine hip-midpoint->neck) and the pelvis heading; rotate by -heading.
3. Root swing from the pelvis up axis (pitch/roll), body chord + chest twist, head orientation.
4. Express every limb direction in the *realised* parent frame (chain is solved parents first, so rounding cannot drift) and solve `Rx(rx)*Rz(rz)` so that our rest direction (0,-1,0) maps onto it.
5. Choose between the two equivalent solutions per frame with a Viterbi pass over the whole clip, unwrap, fill the single undefined angle where a limb points exactly sideways, round to 3 decimals.

**What went wrong first, and why it is documented here.** The first version preserved each bone's source twist (so a held sword would keep a plausible grip) and converted full local rotations to Y*X*Z Euler. That produced 180 deg yaw flips on the loop wrap (`crouch_walk`) and 90 deg flips in `run`, `slash_1`, `roll`: whenever a knee or elbow flexes past 90 deg the rotation passes the Y*X*Z gimbal pole (`rx = +/-90`) and `ry`/`rz` swap wildly. Preserving twist and having a gimbal-safe Euler representation are incompatible in this rotation order. Swing-only limbs (`ry = 0`) have no pole for hinge motion, which removed every flip: after the change the only remaining pole artefacts are the head in `roll` (4 frames). The price is that **twist is lost**: see artefacts 3 and 4.

Verification performed (all in `metrics.json`):

* direction error of the rounded data through our FK: max 1.05 deg, typical clip 0.08 to 0.10 deg;
* loop closure: wrap step vs mean step, e.g. run 7.0 vs 18.3 deg, walk 6.5 vs 7.2, idle 0.6 vs 0.4;
* Euler step vs true rotation step (flags a pole when Euler moves >25 deg *and* >2x the real rotation): 4 flags, all `head` in `roll`;
* all large per-frame rotation steps (>60 deg) are genuine fast motion in strikes (the throw arm turns 126 deg in one frame at the release, 15 m/s hand speed); none are flips.

## 6. Hit frames and recovery

Detector (`retarget.mjs: attackMeta`): tip = wrist + 0.9 m along the wrist->middle-finger direction (0.1 m for punches/shield/throw), in the heading-relative frame; strike speed = velocity projected on forward+down (wind-ups and recoveries ignored); `hitFrame` = first frame in `[peak-1, peak+6]` whose forward reach is within 4 cm of its maximum (so the chop hits at its impact frame, one after peak speed); `recoverFrame` = first later frame where strike speed < 20 % of the peak, or the start of a concatenated recovery segment, whichever comes first.

| clip | frames (s) | hitFrame (s) | peak speed frame | recoverFrame | hand | notes |
|---|---|---|---|---|---|---|
| strike_slash_1 | 47 (1.57) | 13 (0.43) | 12 | 15 | R | wind-up f0-f9, strike f10-f15, hold to f23, return f24-f40; checked against the hand trajectory dump (tip passes the median plane at f13) |
| strike_slash_2 | 43 (1.43) | 7 (0.23) | 7 | 9 | R | fast turning slash (A) f0-f13, slow recovery (A_Rec) f14-f42 |
| strike_overhead | 30 (1.00) | 5 (0.17) | 4 | 6 | R | the chop is only 3 frames long (f3-f5) then the axe is held to f11 |
| strike_thrust | 34 (1.13) | 9 (0.30) | 9 | 11 | R | extension held f13-f19 (hold trimmed from 22 frames), return f19-f33 |
| strike_combo | 91 (3.03) | 7, 21, 36, 47 | 7 | 9, 23, 37, 49 | R | four strikes, includes a 390 deg `rootYaw` spin |
| strike_punch_1 | 27 (0.90) | 6 (0.20) | 5 | 7 | L (jab) | |
| strike_punch_2 | 31 (1.03) | 8 (0.27) | 6 | 9 | R (cross) | |
| strike_punch_3 | 34 (1.13) | 8 (0.27) | 8 | 10 | R | a heavy swing that drops the whole body low, not a classic hook |
| strike_bash | 26 (0.87) | 3 (0.10) | 2 | 4 | L | |
| shield_dash | 34 (1.13) | 1 (0.03) | 2 | 4 | L | shield is already forward at f0 |
| throw | 41 (1.37) | 12 (0.40) | 11 | 14 | R | release moment |

Caveat: the detectors measure the *hand*, not a weapon, because the mannequin holds none. For long weapons (spear, 2.5 m) the real contact moment is a few frames earlier than the hand extension; apply a per-weapon offset in the unit def.

## 7. Clip inventory, mapping and quality

Grades: A = ship as is; B = good, caveat noted; C = usable only in a limited role. "u/s" = world units per second (leg length 10 voxels = 1 u).

### 7.1 Everything the free packs contain

UAL1 (46 incl. A_TPose): A_TPose, Crouch_Fwd_Loop, Crouch_Idle_Loop, Dance_Loop, Death01, Driving_Loop, Fixing_Kneeling, Hit_Chest, Hit_Head, Idle_Loop, Idle_Talking_Loop, Idle_Torch_Loop, Interact, Jog_Fwd_Loop, Jump_Land, Jump_Loop, Jump_Start, PickUp_Table, Pistol_Aim_Down/Neutral/Up, Pistol_Idle_Loop, Pistol_Reload, Pistol_Shoot, Punch_Cross, Punch_Enter, Punch_Jab, Push_Loop, Roll, Roll_RM, Sitting_Enter, Sitting_Exit, Sitting_Idle_Loop, Sitting_Talking_Loop, Spell_Simple_Enter/Exit/Idle_Loop/Shoot, Sprint_Loop, Swim_Fwd_Loop, Swim_Idle_Loop, Sword_Attack, Sword_Attack_RM, Sword_Idle, Walk_Formal_Loop, Walk_Loop.

UAL2 (43 incl. A_TPose): A_TPose, Chest_Open, ClimbUp_1m_RM, Consume, Farm_Harvest, Farm_PlantSeed, Farm_Watering, Hit_Knockback, Hit_Knockback_RM, Idle_FoldArms_Loop, Idle_Lantern_Loop, Idle_No_Loop, Idle_Rail_Call, Idle_Rail_Loop, Idle_Shield_Break, Idle_Shield_Loop, Idle_TalkingPhone_Loop, LayToIdle, Melee_Hook, Melee_Hook_Rec, NinjaJump_Idle_Loop/Land/Start, OverhandThrow, Shield_Dash_RM, Shield_OneShot, Slide_Exit/Loop/Start, Sword_Block, Sword_Dash_RM, Sword_Regular_A, _A_Rec, _B, _B_Rec, _C, _Combo, TreeChopping_Loop, Walk_Carry_Loop, Yes, Zombie_Idle_Loop, Zombie_Scratch, Zombie_Walk_Fwd_Loop.

Retargeted and looked at but **not shipped**: `Sword_Regular_B`, `_C` (they begin in the lunge pose that ends A, so they pop when started from idle; they are inside `strike_combo`), `Pistol_Aim_Neutral/Idle/Shoot` (two-handed gun grip folds our longer arms against the face; not a bow), `Jump_Start/Loop/Land`, `Slide_Loop`, `Push_Loop`, `Idle_Torch/Lantern`, `Walk_Carry_Loop`, `Zombie_Scratch`, `Consume`, `Interact`, `Idle_Rail_*`, `Fixing_Kneeling`, `Crouch_Fwd_Loop`, `Sitting_Talking_Loop` (size or no role). Never retargeted (no role): the `*_RM` twins of shipped clips, Driving, Farm_*, Swim_*, PickUp_Table, Chest_Open, ClimbUp_1m, Idle_TalkingPhone, NinjaJump_*, Slide_Start/Exit, Pistol_Aim_Up/Down/Reload, Jump/Sitting_Exit, Sitting_Talking (first-round `sit_talk` was dropped for size). `TreeChopping_Loop` is used as the overhead strike. These are one entry away in `mapping_ual.json` if wanted.

### 7.2 Shipped clips (our id, source, assessment)

| our id | source | frames | loop | grade | assessment |
|---|---|---|---|---|---|
| idle | UAL1 Idle_Loop | 75 | yes | A- | relaxed contrapposto, asymmetric stance, slight knee bend; a bit casual for a soldier |
| idle_combat | UAL1 Sword_Idle | 50 | yes | A | one-handed sword ready stance, deep knee bend; starts/ends 4 deg from `strike_slash_1` |
| walk | UAL1 Walk_Loop | 40 | yes | B+ | convincing stroll, short step (0.74 leg lengths), 1.1 u/s |
| walk_formal | UAL1 Walk_Formal_Loop | 41 | yes | B+ | upright officer walk, 1.06 u/s |
| run | UAL1 Jog_Fwd_Loop | 28 | yes | A- | excellent, but 6.3 u/s (a fast run): 2.9 leg lengths per step |
| sprint | UAL1 Sprint_Loop | 20 | yes | B | long flight phase, forward lean 23 deg; speed estimate unreliable (5 to 6.4 u/s); usable as rout/charge |
| crouch | UAL1 Crouch_Idle_Loop | 88 | yes | B | very low hunched crouch (hip -0.54 leg lengths); works as crouch/cower |
| zombie_idle / zombie_walk | UAL2 | 40 / 40 | yes | A- | stooped zombie shuffle: ideal for the mummy; 1.03 u/s |
| strike_slash_1 | UAL1 Sword_Attack | 47 | no | A- | lunging diagonal slash, clear anticipation / strike / follow-through; returns to idle_combat |
| strike_slash_2 | UAL2 Sword_Regular_A + A_Rec | 43 | no | B+ | quick turning slash; the turn is in `rootYaw` (122 deg); starts/ends in `idle` pose |
| strike_overhead | UAL2 TreeChopping_Loop | 30 | no | B | heavy chop, readable; starts and ends with the weapon raised (136 deg from idle), so the blend-in is the wind-up; only 3 frames of downswing |
| strike_thrust | UAL2 Sword_Dash_RM, hold trimmed | 34 | no | B+ | genuine one-handed lunge thrust, arm extended along the body line; one cut at f18->19 |
| strike_combo | UAL2 Sword_Regular_Combo | 91 | no | B | four strikes incl. a low sweep and a 390 deg spin; the most dynamic clip, also the one with the worst interpolation error (52 deg at one mid-frame) |
| strike_punch_1/2 | UAL1 Punch_Jab / Punch_Cross | 27 / 31 | no | B+ | boxing stance, clean extension; both start/end in the boxing stance (142 deg from idle) |
| strike_punch_3 | UAL2 Melee_Hook + Rec | 34 | no | B- | a heavy low swing, body drops almost to the ground; reads as "big wind-up swing", not a hook |
| punch_ready | UAL1 Punch_Enter | 27 | no | B+ | idle -> boxing stance; hold the last frame as the brawler idle |
| strike_bash | UAL2 Shield_OneShot | 26 | no | B | short shove with the left arm/shield |
| shield_dash | UAL2 Shield_Dash_RM | 34 | no | B | crouched charge with the shield forward, in place |
| throw | UAL2 OverhandThrow | 41 | no | A- | very readable windup, release, follow-through; hand turns 126 deg/frame at release |
| block_enter | UAL2 Sword_Block | 38 | no | B+ | sword parry; start/end 3 deg from idle |
| block_hold | UAL2 Idle_Shield_Loop | 75 | yes | B | shield-raised stance (left arm bent up) |
| shield_break | UAL2 Idle_Shield_Break | 33 | no | B | recoil, usable as stagger/stun reaction |
| hit_front | UAL1 Hit_Chest | 11 | no | B+ | 0.37 s flinch back; no hit_back exists |
| hit_head | UAL1 Hit_Head | 14 | no | B | small head snap |
| knockdown | UAL2 Hit_Knockback | 26 | no | B | thrown backwards, lands on the back; **starts mid-stumble** (93 deg from idle), needs a fast blend; ends lying |
| death_back | UAL1 Death01 | 73 | no | A- | falls backwards and lies flat in the final 30 frames; the only death clip in the free packs |
| getup | UAL2 LayToIdle | 47 | no | B+ | lying -> standing; starts lying (110 deg from idle), ends at idle |
| roll | UAL1 Roll | 45 | no | B+ | forward roll; 4 head pole frames (still looks right); `rootPitch` 13 to 356 deg |
| cast / cast_idle | UAL1 Spell_Simple_* | 47 / 63 | no / yes | B+ / B | raise hand, cast, lower; channel hold |
| point_order | UAL2 Yes | 75 | yes | B+ | left arm points sideways: officer/command gesture, not a "yes" |
| talk | UAL1 Idle_Talking_Loop | 88 | yes | B | gesticulating idle: taunt/announcer |
| smug | UAL2 Idle_FoldArms_Loop | 75 | yes | B- | arms folded; our long arms cross higher on the chest than the source |
| shake_no | UAL2 Idle_No_Loop | 75 | yes | B- | head shake: refuse/dizzy at a push |
| dance | UAL1 Dance_Loop | 30 | yes | B | silly dance, loops cleanly |
| sit / sit_enter | UAL1 | 50 / 40 | yes / no | A- / B+ | seated idle: hip pivot at 5.5 voxels (`root` = -0.45), thighs horizontal; `sit_enter` ends seated. Prop seat height must match |

## 8. Wanted clips that do not exist in the free packs

Not found: `death_front` / `death_spin` (only one death, falling backwards), `hit_back`, `stagger` as such (use `shield_break` or the first 10 frames of `knockdown`), `stun` / `dizzy` (nearest is `shake_no`), **spear thrust two-handed** (only a one-handed sword lunge), spear brace/guard, **bow draw / shoot**, crossbow, **kick** (the Spartan kick), **cheer / victory**, laugh, **wave**, rout/cower (use `sprint` and `crouch`), mid-speed jog, strafe/back-pedal, kneel (exists as `Fixing_Kneeling` but not retargeted), climb (not needed), anything mounted, beasts, siege crews.

Recommended to author with the planned keyframe DSL: death_front, death_spin, hit_back (can be an additive overlay: the negative of `hit_front` body pitch), stun/dizzy, spear thrust + brace, bow draw/shoot/reload, kick, cheer, laugh, wave, cower, a 2 to 3 u/s jog, strafe. Also all quadruped, siege and bespoke rigs. Style authored clips on the same hum1 data layout so the Animator treats them identically.

## 9. Licence and attribution

Both zips contain `License.txt`, verbatim:

```
License:
CC0 1.0 Universal (CC0 1.0)
Public Domain Dedication
https://creativecommons.org/publicdomain/zero/1.0/
Models by @Quaternius
Consider supporting me on Patreon!  https://www.patreon.com/quaternius
```

The Quaternius pack pages say "Free to use in personal, educational and commercial projects. (CC0 License)" and the OpenGameArt pages list CC0 with author `quaternius`. CC0 has no attribution requirement and permits derivatives (a retargeted, re-baked JSON is a derivative and is fine). Credit anyway (in the credits ledger, as required by the plan's asset-ledger rule):

> Character animations: "Universal Animation Library" and "Universal Animation Library 2" (Standard) by Quaternius, CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/), https://quaternius.com/packs/universalanimationlibrary.html and .../universalanimationlibrary2.html, retargeted to the VOXELWARS voxel rig.

Caveats: (1) CC0 covers the files we downloaded; the free zips are explicitly the "Standard" subset ("60-70 % of the pack"), we did not touch the paid Source packs. (2) We rely on the author's CC0 declaration for the provenance of the motions; the pages do not say whether they were hand-keyed or derived from capture data. (3) The Quaternius site also advertises Patreon support; nothing in the licence requires it.

## 10. Hashes

```
18ff1a7215f4852b320203e8aaf02a1578b5c8eef9027fbaedfcedc7b85a3ac2  universal_animation_librarystandard.zip
ec0e40d6d78fe9aaad59e322f40865a8675c22f0745e291622e54520391a9217  universal_animation_library_2standard.zip
1b7bf67866360665426bb99e4c71bd619f19b408453c24e30f0c3071601eee5c  AnimationLibrary_Godot_Standard.glb
0815dd05531cae9bc313fc9c0ba81330bc72f8e19ec45f73738e74ddc5796a43  UAL2_Standard.glb
```

## 11. Measured quality: foot, ground, interpolation

### 11.1 Foot sliding and playback speed (`meta.speedRef`)

Method: our rig's ankle (sole) point is tracked through FK; while a foot is planted (ankle within 0.9 voxel of its lowest point) its z moves backwards at the ground speed; a straight line is fitted per stance. `speedRef` = mean stance speed in u/s (10 voxels = 1 u). Cross-checked against the *source* skeleton in metres (walk 1.02 m/s = 1.23 leg lengths/s vs 1.1 u/s ours, jog 5.2 m/s = 6.3 u/s vs 6.31 ours).

| clip | cycle | stride per cycle | speedRef | sensitivity (stance threshold 0.6 to 1.5 voxel) | slide inside a stance | note |
|---|---|---|---|---|---|---|
| walk | 1.333 s | 14.7 voxels | **1.1 u/s** | 1.0 to 1.2 | max 1.1 voxel, mismatch 0.3 voxel per stride | |
| walk_formal | 1.367 s | 14.5 | **1.06** | 1.0 to 1.2 | max 1.2 voxel, 0.15 | |
| zombie_walk | 1.333 s | 13.8 | **1.03** | 0.9 to 1.1 | max 1.1 voxel | right foot never plants cleanly (dragged) |
| run | 0.933 s | 58.9 | **6.3 u/s** | 5.6 to 6.3 | max 0.13 voxel | stance only 6 frames (0.2 s) |
| sprint | 0.667 s | 38.2 | **5.7 u/s** (low confidence) | 5.0 to 6.4 | 2.1 voxels, feet disagree 64 vs 50 voxel/s | stance 4 to 5 frames, foot rolls; use run's value or measure in-game |

If a clip is played at `rate = unitSpeed / speedRef`, planted feet stay put apart from the intra-stance variation in the table (about one voxel for walks, none for the run). Step cadence at rate 1 is 1.5 steps/s (walks), 2.14 (run), 3.0 (sprint).

### 11.2 Playback rates for the roster speeds (2.5 to 3.4 u/s walk, run x1.5 to x2.5)

The gap: at 2.6 u/s the walk would need rate 2.36 (3.5 steps/s: frantic shuffle) and the run rate 0.41 (0.9 steps/s: floaty slow motion). Natural cadence for a given speed needs a stride of about 1.2 leg lengths per step; UAL walk has 0.74, UAL run 2.9. Recommendations:

* `walk` for 0.7 to 2.0 u/s (rate 0.65 to 1.8), `run` for >= 3.3 u/s (rate >= 0.52), crossfade over 2.0 to 3.3 u/s while blending *cadence*, i.e. play both clips at the rate that matches the speed and blend by speed, accepting small foot slide in the blend zone;
* or give soldiers walk speeds near 1.5 to 2.0 u/s and let `run` carry the 4+ u/s charge speeds (rate 0.65 to 1.0);
* or author the missing 2 to 3 u/s jog procedurally (section 8). Scaling the leg swing amplitude of `walk` should scale the stride, and with it `speedRef`, roughly proportionally (untested).

Idle/loop clips: rate 1.0, randomised phase per unit. Attacks: choose `rate = (hitFrame / 30) / desiredWindup`, e.g. slash_1 hit at 0.43 s, throw at 0.40 s.

### 11.3 Ground contact

Body boxes and the lower-leg column rest correctly on the ground in all grounded clips (ankle minimum is exactly 0 after the snap). **Toe tip and heel are the problem**: the rigid foot (4 voxels forward, spec 3.1) cannot dorsiflex, so whenever the shin tilts the toe dips below the ground:

| clip | lowest toe tip (voxels below ground) | lowest heel (voxels below ground, `-` = stays above) |
|---|---|---|
| idle | 1.4 | 0.0 |
| idle_combat | 2.3 | - (0.6 above) |
| walk | 1.7 | 0.5 |
| run | 3.3 | 0.8 |
| sprint | 2.6 | 0.8 |
| zombie_walk | 3.0 | 0.2 |
| strike_slash_1 | 3.2 | - (0.4 above) |

Mitigations (recommendations, not implemented): (a) use the ankle point for ground height and accept the toe clipping (a terrain step is 5 voxels, the clipping is at most 3.3); (b) the proper fix is a separate `foot` part in hum1 v2 with an ankle track: the data exists in the source (foot and toe bones) and `retarget.mjs` can emit it.

### 11.4 Interpolation error at 30 fps

Truth = the same retarget run at 60 fps. Mid-frame poses reconstructed from the 30 fps data by linear Euler interpolation versus quaternion slerp (direction error in degrees over all limbs, body and head):

* 25 of 39 clips: max error below 2 degrees both ways; all idles and locomotion below 0.5 degrees.
* strikes: `strike_slash_1` 27.5 (slerp 26), `strike_combo` 52 (45), `throw` 34 (33), `strike_punch_3` 24 (14), `cast` 13 (13), `block_enter` 13 (12), `strike_thrust` 10.8 (10.3), `death_back` 7.7 (6.6). Only 1 to 5 frames per clip exceed 10 degrees, always the fast strike frames; the mean error of every clip is below 1.7 degrees.
* Slerp is slightly better than Euler lerp (the punch_3 case: 14 vs 24); for reasonable cost use slerp for strikes and Euler lerp elsewhere. `tools/anim/fk.mjs: sampleClipSlerp` shows how. Baking attack clips at 60 fps is possible (`retargetFile(..., fps=60)`) but would break the "hitFrame / 30" contract in spec 6, so it was not done.

### 11.5 Joint ranges (all clips, degrees, local Euler)

body rx -5..41, ry -59..76, rz -13..20; head rx -39..82, ry -113..63, rz -126..22 (the 126 is the head in `roll`); arms use ranges up to +/-390 because angles are unwrapped (a windmill is continuous, e.g. 245 deg equals -115 deg); `legLL/legLR` knee flexion rx 0..145 (the lunge in `strike_slash_2` reaches -51 on the rear leg because its thigh frame is rotated 70 deg, not a real hyperextension); no limb flips, no 2*pi jumps.

## 12. Known artefacts

1. **Rigid feet dig in** (section 11.3), most visible in run, sprint, lunges.
2. **Proportions**: our arms are 1.0 leg length, the source arm is 0.66; shoulders sit 0.65 leg lengths off the centre line against 0.23; the torso is longer and the head larger. Directions are exact, positions are not: hands overshoot or fall short of where the animator put them (folded arms, hands to the face, two-handed holds, the pistol aim poses folded the arms against the face). Anything that must touch (hand on hilt, hand on chest) needs a per-weapon/per-pose fix.
3. **Weapon orientation is arbitrary**: with no twist, the rotation of a held weapon about the forearm axis is whatever the swing-only chain gives, not the animator's wrist roll. The sword in the filmstrips is a *demo grip* (blade 40 deg forward of straight down when the arm hangs) and is not authoritative. Define each weapon's `rest` against this convention, then check slashes; edge orientation is not preserved. Same for shield facing in `block_hold`.
4. **Twist, wrist flexion and ankle flexion are lost** (no hands, no feet in hum1).
5. **Fast strike frames** (section 11.4): up to 25 to 50 deg off mid-frame; use slerp.
6. **`strike_combo`, `strike_punch_3`, `death_back`** rotate the whole body a lot; `rootYaw` for the spin is optional; without it the spin is only the arms and torso.
7. **`knockdown` starts mid-stumble**, `getup` starts lying, `strike_overhead` starts raised: not blendable from idle without a visible pop unless the blend is 0.1 s or less (knockdown is 93 deg away, getup 110, overhead 136).
8. **Blend map** (largest limb/body/head direction difference between a clip's end pose and our `idle` / `idle_combat` frame 0, degrees; table computed from the shipped data). Within 6 deg of `idle` at **both** ends: strike_slash_2, strike_thrust, strike_combo, strike_bash, throw, block_enter, cast, point_order, shake_no. Within 6 deg of `idle_combat` at both ends: strike_slash_1. At **one** end only: death_back (starts 6 deg, ends lying), getup (ends 5 deg), hit_front (ends 2, starts 41), hit_head (ends 2, starts 27), sit_enter (starts 1, ends seated), shield_dash (ends 5, starts 109), roll (ends 11, starts 66), knockdown (93 / 116), punch_ready (starts 2, ends 142 in the boxing stance). Boxing clips live in the boxing stance, 142 deg from idle: enter via `punch_ready`. Shield clips live in the shield stance (86 deg from idle): enter via `block_enter` or accept a 0.15 s blend.
9. **Head in `roll`** passes the Euler pole for 4 frames (Euler step 63 deg vs true rotation step 23): visible only as a 1-frame twitch at 60 fps.
10. **`rootX/rootZ`** offsets are not zero-sum for lunges (thrust ends 0.5 leg lengths forward): treat them as visual offsets.
11. The pelvis `rootZ` of idle clips differs by up to 0.2 leg lengths between clips (stance differences), so a blend from `idle` to `idle_combat` slides the hips 2 voxels.

## 13. Reproduce

```
node tools/anim/bake.mjs                         # both GLBs -> assets/anim/humanoid_clips.json + docs/anim_spike/metrics.json
node tools/anim/retarget.mjs <glb> <out.json>    # one library, mapping tools/anim/mapping_ual.json (optionally --only a,b --verbose --sticks f.json)
node tools/anim/render.mjs assets/anim/humanoid_clips.json docs/anim_spike --sticks <sticks.json> --sheets
                                                 # filmstrips + contact sheets; sticks.json is written by bake.mjs (--sticks <path>)
node tools/anim/inspect.mjs <glb>                # skeleton hierarchy + clip list;  restdump.mjs <glb> <bone...> prints rest positions
```

Files: `tools/anim/glb.mjs` (pure-Node GLB/glTF reader: nodes, skins, animations, accessors incl. stride, normalised ints and sparse), `math.mjs` (quaternions, Euler Y*X*Z, continuity), `fk.mjs` (hum1 rig FK, reference for the game), `retarget.mjs` (retargeter and CLI), `bake.mjs` (merge + metrics), `render.mjs` (headless Chromium canvas renderer, blocky boxes from the baked JSON using our FK, plus the source skeleton row), `mapping_ual.json`.

Filmstrips (`docs/anim_spike/filmstrip_<clip>.png`): row 1 = three-quarter view from front-right, row 2 = side view (character faces right), row 3 = **source skeleton** (red spine, green = right side, blue = left side) at the same frames; red border = `hitFrame`, yellow = `recoverFrame`. Contact sheets per category: `sheet_locomotion_and_idles.png`, `sheet_melee_attacks.png`, `sheet_defence_and_reactions.png`, `sheet_magic_social_and_seated.png`.
