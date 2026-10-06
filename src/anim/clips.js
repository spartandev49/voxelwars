// Clip library: PURE DATA. The sim reads timing (duration, hit frame) from here without touching rendering code.
//
// A Clip (see spec.md §6) = {id, fps, frames, loop, rig, parts:{partId:[rx,ry,rz per frame...]}, rootY?, pitch?, meta:{hitFrame, recoverFrame, speedRef}}
// Real clip data (retargeted mocap + authored) is registered at boot via ClipLib.register(); until then the DEFAULT_META
// below keeps the sim fully functional (headless tests, balance harness). Timings here are the design targets the authored
// and retargeted clips must meet; registering a real clip replaces the entry, so durations always agree with what is on screen.

/** seconds: dur = full clip length, hit = time of the damage/release moment, loop = repeats */
export const DEFAULT_META = {
  // humanoid
  idle:            { dur: 2.4, loop: true },
  idle_combat:     { dur: 1.6, loop: true },
  walk:            { dur: 1.0, loop: true, speedRef: 2.6 },
  run:             { dur: 0.7, loop: true, speedRef: 4.6 },
  strike_slash_1:  { dur: 0.62, hit: 0.30 },
  strike_slash_2:  { dur: 0.62, hit: 0.30 },
  strike_overhead: { dur: 0.95, hit: 0.46 },
  strike_thrust:   { dur: 0.72, hit: 0.28 },
  strike_bash:     { dur: 0.60, hit: 0.28 },
  shoot_bow:       { dur: 0.95, hit: 0.60 },
  throw:           { dur: 0.80, hit: 0.40 },
  cast:            { dur: 1.00, hit: 0.50 },
  kick:            { dur: 0.70, hit: 0.30 },
  block_hold:      { dur: 1.0, loop: true },
  block_hit:       { dur: 0.30 },
  hit_front:       { dur: 0.40 },
  hit_back:        { dur: 0.40 },
  stagger:         { dur: 0.80 },
  stun:            { dur: 1.2, loop: true },
  dizzy:           { dur: 1.2, loop: true },
  death_back:      { dur: 1.10 },
  death_front:     { dur: 1.10 },
  death_spin:      { dur: 1.40 },
  getup:           { dur: 0.90 },
  cheer:           { dur: 1.2, loop: true },
  taunt:           { dur: 1.6 },
  rout:            { dur: 0.6, loop: true, speedRef: 5.0 },
  cower:           { dur: 1.0, loop: true },
  sit:             { dur: 1.5, loop: true },
  // beasts / mounts / siege (quad1 & bespoke)
  gallop:          { dur: 0.55, loop: true, speedRef: 7.5 },
  trot:            { dur: 0.8, loop: true, speedRef: 4.0 },
  rear:            { dur: 1.0 },
  strike_bite:     { dur: 0.55, hit: 0.22 },
  strike_gore:     { dur: 0.95, hit: 0.45 },
  strike_stomp:    { dur: 1.0, hit: 0.5 },
  strike_ram:      { dur: 0.9, hit: 0.4 },
  strike_headbutt: { dur: 0.7, hit: 0.3 },
  strike_peck:     { dur: 0.3, hit: 0.12 },
  trumpet:         { dur: 1.4, hit: 0.5 },
  launch:          { dur: 1.2, hit: 0.5 },      // catapult / ballista / cyclops boulder
  reload:          { dur: 2.0 },
  flap:            { dur: 0.8 },
  tantrum:         { dur: 1.0, loop: true },
  reveal:          { dur: 1.6, hit: 0.8 },
};

const meta = Object.create(null);
const clips = Object.create(null);
for (const k of Object.keys(DEFAULT_META)) meta[k] = Object.assign({ loop: false }, DEFAULT_META[k]);

export const ClipLib = {
  has(id) { return !!meta[id]; },
  /** timing record {dur, hit?, loop, speedRef?} (never null; unknown clips fall back to idle timing) */
  meta(id) { return meta[id] || meta.idle; },
  dur(id) { return (meta[id] || meta.idle).dur; },
  hit(id) { const m = meta[id] || meta.idle; return m.hit === undefined ? m.dur * 0.5 : m.hit; },
  get(id) { return clips[id] || null; },
  /** Register baked clip data; replaces timing meta so sim and visuals agree. */
  register(clip) {
    if (!clip || !clip.id || !(clip.frames > 0)) throw new Error('bad clip');
    const fps = clip.fps || 30;
    const m = { dur: clip.frames / fps, loop: !!clip.loop };
    if (clip.meta) {
      if (clip.meta.hitFrame !== undefined) m.hit = clip.meta.hitFrame / fps;
      if (clip.meta.recoverFrame !== undefined) m.recover = clip.meta.recoverFrame / fps;
      if (clip.meta.speedRef !== undefined) m.speedRef = clip.meta.speedRef;
    }
    // keep default hit time when the baked clip carries none (e.g. non-attack clips)
    const d = DEFAULT_META[clip.id];
    if (m.hit === undefined && d && d.hit !== undefined) m.hit = Math.min(d.hit, m.dur * 0.9);
    meta[clip.id] = m;
    clips[clip.id] = clip;
  },
  ids() { return Object.keys(meta); },
};
