// Clip library: PURE DATA. The sim reads timing (duration, hit frame) from here without touching rendering code.
//
// A Clip (spec.md §7) = {id, rig, fps, frames, loop, q:{partId:[rx,ry,rz per frame...]}, t?, s?, root?:{y,x,z,pitch,roll,yaw}, meta:{hitFrame, recoverFrame, speedRef, fx}}
// Real clip data (retargeted mocap + authored) is registered at boot via ClipLib.register() (anim/boot.js); until then the
// DEFAULT_META below keeps the sim fully functional (headless tests, balance harness). Timings here are the design targets the
// authored and retargeted clips meet; registering a real clip replaces the entry, so durations always agree with what is on screen.
//
// Rig-qualified clips: the same clip id can exist for several rigs ('walk' for hum1, elephant1, catapult1, ...). Every clip is stored
// under 'rig:id'. The PLAIN id (what the sim asks for) belongs to hum1 when hum1 has the id, otherwise to the first rig that registered
// it. All variants of one id share the timing the sim needs (hit time, speedRef): boot/tests enforce that, so sim and visuals agree.
// ClipLib.meta/dur/hit/get accept an optional rig argument and prefer the rig-qualified entry (the animator always passes it).

/** seconds: dur = full clip length, hit = time of the damage/release moment, loop = repeats */
export const DEFAULT_META = {
  // humanoid
  idle:            { dur: 2.4, loop: true },
  idle_combat:     { dur: 1.6, loop: true },
  walk:            { dur: 0.8, loop: true, speedRef: 2.4 },
  jog:             { dur: 0.68, loop: true, speedRef: 3.8 },
  run:             { dur: 0.64, loop: true, speedRef: 5.6 },
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
  rout:            { dur: 0.5, loop: true, speedRef: 5.0 },
  cower:           { dur: 1.0, loop: true },
  sit:             { dur: 1.5, loop: true },
  // mounted / crew
  ride_idle:       { dur: 2.0, loop: true },
  ride_strike:     { dur: 0.72, hit: 0.28 },
  ride_shoot:      { dur: 0.95, hit: 0.60 },
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
  // extras the sim/render may request (all authored)
  sleep:           { dur: 3.0, loop: true },
  flail:           { dur: 0.8, loop: true },
  tumble:          { dur: 0.9, loop: true },
};

const meta = Object.create(null);       // plain id -> timing record
const clips = Object.create(null);      // plain id -> clip data
const qmeta = Object.create(null);      // 'rig:id' -> timing record
const qclips = Object.create(null);     // 'rig:id' -> clip data
const owner = Object.create(null);      // plain id -> rig that owns the plain slot ('' = DEFAULT_META only)
for (const k of Object.keys(DEFAULT_META)) { meta[k] = Object.assign({ loop: false }, DEFAULT_META[k]); owner[k] = ''; }

function timingOf(clip) {
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
  return m;
}

export const ClipLib = {
  /** bumps on every register(): animator caches key off it */
  version: 0,
  has(id) { return !!meta[id]; },
  /** timing record {dur, hit?, loop, speedRef?} (never null; unknown clips fall back to idle timing). `rig` selects a rig-specific variant. */
  meta(id, rig) { return (rig !== undefined && qmeta[rig + ':' + id]) || meta[id] || meta.idle; },
  dur(id, rig) { return this.meta(id, rig).dur; },
  /** same as dur (name used by decisions_r3 D5: deathLinger = max(1.6, duration + 0.2)) */
  duration(id, rig) { return this.meta(id, rig).dur; },
  hit(id, rig) { const m = this.meta(id, rig); return m.hit === undefined ? m.dur * 0.5 : m.hit; },
  get(id, rig) { return (rig !== undefined && qclips[rig + ':' + id]) || clips[id] || null; },
  /** rig-specific variant only (no fallback to the plain id) */
  getQualified(id, rig) { return qclips[rig + ':' + id] || null; },
  owner(id) { return owner[id]; },
  /** Register baked clip data; replaces timing meta so sim and visuals agree. */
  register(clip) {
    if (!clip || !clip.id || !(clip.frames > 0)) throw new Error('bad clip');
    const rig = clip.rig || 'hum1';
    const m = timingOf(clip);
    const key = rig + ':' + clip.id;
    qmeta[key] = m; qclips[key] = clip;
    const o = owner[clip.id];
    if (o === undefined || o === '' || o === rig || rig === 'hum1') { meta[clip.id] = m; clips[clip.id] = clip; owner[clip.id] = rig; }
    ClipLib.version++;
  },
  /** every plain id (timing known to the sim) */
  ids() { return Object.keys(meta); },
  /** every registered clip, rig-qualified keys 'rig:id' */
  qualifiedIds() { return Object.keys(qclips); },
  /** test helper: drop all registered clip data and restore DEFAULT_META */
  reset() {
    for (const k of Object.keys(clips)) delete clips[k];
    for (const k of Object.keys(qclips)) delete qclips[k];
    for (const k of Object.keys(qmeta)) delete qmeta[k];
    for (const k of Object.keys(meta)) delete meta[k];
    for (const k of Object.keys(owner)) delete owner[k];
    for (const k of Object.keys(DEFAULT_META)) { meta[k] = Object.assign({ loop: false }, DEFAULT_META[k]); owner[k] = ''; }
    ClipLib.version++;
  },
};
