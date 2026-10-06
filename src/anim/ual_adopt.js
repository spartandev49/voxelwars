// Which retargeted UAL clips the game uses, and how they are tuned (docs/anim_coverage.md is generated from this table).
// A clip is adopted only when it passes the review criteria (A3): no limb flips, sane joint ranges, ends near a neutral pose so crossfades
// stay subtle, and a hit/contact moment that can be retimed to the sim's design numbers. Rejected UAL clips are replaced by authored ones.
//
// ops:  warp   [[srcSeconds, dstSeconds], ...]  piecewise time warp (hit and recover frames follow)
//       yaw    k  scale of the removed pelvis heading (rootYaw) that the retarget exports (0 = ignore it)
//       meta   extra clip meta (fall direction, cls, ...)
//       hit / recover  seconds after warping (replaces the detected frame)
// `as` renames the clip. `use: 'extra'` registers a UAL clip under its own id with no authored twin.
export const UAL_ADOPT = [
  // ---- replaces the authored fallback (authored stays registered as 'authored_<id>' for the tools and as the safety net) ----
  { id: 'idle', src: 'idle', why: 'relaxed contrapposto idle (UAL Idle_Loop), natural weight shift and breathing; overlays add sway' },
  { id: 'idle_combat', src: 'idle_combat', why: 'one-handed sword ready stance with a deep knee bend (UAL Sword_Idle)' },
  { id: 'sit', src: 'sit', why: 'seated idle for the throne gag (hip pivot 0.45 u below standing: the throne seat must match)' },
  { id: 'block_hold', src: 'block_hold', why: 'shield-raised stance (UAL Idle_Shield_Loop)' },
  { id: 'hit_front', src: 'hit_front', why: 'chest hit flinch (UAL Hit_Chest), 0.37 s' },
  { id: 'death_back', src: 'death_back', warp: [[0, 0], [1.35, 0.95], [2.43, 1.7]], meta: { fall: Math.PI, fallBlend: 0.4 }, why: 'the only real death in the free packs: a convincing backwards fall; the lying hold is shortened (2.43 s -> 1.7 s)' },
  { id: 'getup', src: 'getup', warp: [[0, 0], [0.5, 0.35], [1.57, 1.1]], why: 'lying -> standing (UAL LayToIdle), retimed to 1.1 s' },
  // ---- extras: no authored twin; reachable through model.meta.clipMap / direct requests ----
  { id: 'zombie_idle', src: 'zombie_idle', use: 'extra', why: 'mummy stooped idle (clipMap idle -> zombie_idle)' },
  { id: 'zombie_walk', src: 'zombie_walk', use: 'extra', why: 'mummy shuffle, speedRef 1.03 u/s (clipMap walk -> zombie_walk)' },
  { id: 'dance', src: 'dance', use: 'extra', why: 'silly dance loop (victory / throne gag)' },
  { id: 'point_order', src: 'point_order', use: 'extra', why: 'officer pointing / command gesture (hero taunt candidate)' },
  { id: 'talk', src: 'talk', use: 'extra', why: 'gesticulating idle (philosopher monologue)' },
  { id: 'smug', src: 'smug', use: 'extra', why: 'arms folded (senator idle)' },
  { id: 'walk_formal', src: 'walk_formal', use: 'extra', why: 'upright officer walk, speedRef 1.06 u/s (clipMap for senators / officers at low speed)' },
  { id: 'roll', src: 'roll', use: 'extra', why: 'forward roll (dodge / gladiator net escape)' },
  { id: 'crouch', src: 'crouch', use: 'extra', why: 'low crouch loop' },
  { id: 'knockdown', src: 'knockdown', use: 'extra', why: 'thrown backwards (Hit_Knockback), starts mid-stumble: short blend only' },
  { id: 'hit_head', src: 'hit_head', use: 'extra', why: 'head snap flinch' },
  { id: 'sit_enter', src: 'sit_enter', use: 'extra', why: 'sitting down transition' },
];
// UAL clips that were reviewed and REJECTED for the sim's attack/locomotion slots, with the measured reason (shown in docs/anim_coverage.md)
export const UAL_REJECT = {
  walk: 'speedRef 1.1 u/s: the roster walks at 1.9-4.2 u/s; played at 2-3.8x the stride is a frantic shuffle (authored IK gait is distance driven)',
  run: 'speedRef 6.3 u/s, 2.9 leg lengths per step: at 3-5.6 u/s it plays as floaty slow motion (authored IK jog/run, distance driven)',
  sprint: 'speed estimate unreliable (5.0-6.4 u/s) and a flight phase that digs the rigid foot in; authored rout clip used',
  strike_slash_1: 'exports a 120 deg pelvis spin (rootYaw) and ends in a 90 deg forward fold: the unit turns away from its target mid-swing (authored slash_1 kept)',
  strike_slash_2: 'exports a 122 deg pelvis spin (rootYaw): the unit turns its back on the target (authored slash_2 kept)',
  strike_overhead: 'starts and ends with the weapon raised (136 deg from idle) and the chop is only 3 frames: no usable wind-up or recovery',
  strike_thrust: 'one-handed sword dash: 0.5 leg-length root drift, no spear grip; authored two-handed-style spear lunge used',
  strike_combo: 'four strikes and a 390 deg spin: not a single attack slot',
  strike_bash: 'only a shield shove of 26 frames with the shield already forward; authored bash adds wind-up and drive',
  throw: 'drops the body to the ground (rootPitch up to 60 deg) with a two-handed grip our javelin carriers do not have',
  cast: 'bare-hand cast: no staff; authored cast keeps the staff upright',
  block_enter: 'ends 38 frames later in a parry pose; authored block_hit is a short shield jolt',
  shield_break: 'good stumble but 1.1 s long and starts in the shield stance',
};
