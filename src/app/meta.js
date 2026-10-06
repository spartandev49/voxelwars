// meta.js: the meta layer. It connects a running battle to persistent progress (lifetime stats, achievements, survival board) and to the humor systems
// (announcer, kill feed, results funny stats, lessons), and owns the small player-input controllers Game delegates to (god-power aim, Take Command input,
// teaching beats, kill-cam). Everything here is plain JS over the objects it is given, so tests/app/meta.test.mjs drives it headlessly with a real World.
//
//   const meta = createMeta({ game, content, settings, store, audio, rng? });   // main.js: game.meta = meta
//   meta.attach(world, setup)      Game.begin: a new World exists (placement phase). Subscribes to world.events; resets announcer, kill feed, per-battle stats
//   meta.detach()                  Game.dispose
//   meta.onFrame(dt)               Game.frame, REAL seconds: ticks the announcer, toast queue, kill-cam, Take Command input
//   meta.decorateResults(res)      Game.results(): funnyStats, lessons, MVP quote, survival/daily blocks (computed once per battle)
//   meta.decorateHud(hud)          Game.hud(): possess, teaching, aim
//   meta.aim / meta.possess / meta.teaching / meta.killcam    the controllers behind Game.aim / possessInput / teachingNext / skipTeaching / killcam
//
// Dispatch order on battle_end (docs/lifetime_stats.md §1), run once per battle by _finish():  1. stats accumulate  ->  2. checkAchievements(stats, summary, unlocked)
// ->  3. announcer.onEvent('battle_end')  (so "chicken defeat number 3" already reads the updated stats). Game's own battle_end handler asks for results()
// BEFORE this module's bus listener runs, so decorateResults() triggers _finish() itself; the bus listener is then a no-op.
import { createAnnouncer } from '../content/era_ancient/humor/announcer.js';
import { checkAchievements, ACHIEVEMENTS, getAchievement } from '../content/era_ancient/humor/achievements.js';
import { killVerb, killSolo } from '../content/era_ancient/humor/killverbs.js';
import { resultLabel } from '../content/era_ancient/humor/results_text.js';
import { unitText, pickDeath } from '../content/era_ancient/humor/units_text.js';
import { TEACHING_BEATS, MISSION_ORDER } from '../content/era_ancient/campaign_text.js';
import { generateLessons } from '../sim/lessons.js';
import { GOD_POWERS } from '../sim/godpowers.js';
import { waveName } from '../sim/waves.js';
import { LifetimeStats, storeAdapter } from '../save/stats.js';
import { createDocs } from '../save/docs.js';
import { RNG } from '../core/rng.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pretty = (id) => String(id || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const localDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTime = (t) => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const fmtNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const safe = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };

// ====================================================================================================== funny stats
/** Optional stats worth showing first (rarest/funniest first). `always` ones (results_text.js) close the list. The Results screen shows the first four. */
const FUNNY_ORDER = ['friendlyKills', 'chickenKills', 'goatKills', 'kicks', 'trampleKills', 'stoned', 'misfires', 'cyclopsMisses', 'bribes', 'revives', 'heroKills', 'routs', 'longestStreak', 'boulders', 'arrowsFired', 'shieldBlocks', 'damage', 'survivorsCost', 'wasted'];
/** v: { kills, losses, damage, friendlyKills, chickenKills, goatKills, kicks, trampleKills, stoned, misfires, cyclopsMisses, longestStreak, shieldBlocks, arrowsFired, boulders, routs, revives, heroKills, bribes, duration, survivorsCost, wasted } */
export function buildFunnyStats(v, rng) {
  const fmt = { duration: fmtTime, survivorsCost: (n) => fmtNum(n) + ' dr', wasted: (n) => fmtNum(n) + ' dr', damage: fmtNum };
  const row = (key) => { const label = resultLabel(key, rng); if (!label) return null; const f = fmt[key] || ((n) => String(Math.round(n))); return { label, value: f(v[key] || 0) }; };
  const out = [];
  for (const k of FUNNY_ORDER) { if ((v[k] || 0) > 0 && out.length < 3) { const r = row(k); if (r) out.push(r); } }
  for (const k of ['duration', 'kills', 'losses']) { if (out.length >= 4) break; const r = row(k); if (r) out.push(r); }
  return out;
}

// ====================================================================================================== teaching beats
/**
 * Mission-1 teaching beats (campaign_text.js TEACHING_BEATS). A beat is SHOWN when its trigger fires, and completes when the player does the thing
 * (place a line, cast a god power) or presses "Got it"; a trigger for a later beat skips what is still open. Skip stops everything and persists.
 */
export class TeachingGuide {
  constructor(o = {}) {
    this.beats = o.beats || TEACHING_BEATS; this.isDismissed = o.isDismissed || (() => false); this.onFinish = o.onFinish || (() => {});
    this.enabled = false; this.done = false; this.idx = -1; this.waiting = true; this.log = [];
  }
  /** Begin a guided battle (mission 1). Does nothing when the player already finished or skipped the tutorial. */
  start() { this.done = false; this.idx = -1; this.waiting = true; this.enabled = !this.isDismissed(); if (this.enabled) this.trigger('placement_start'); return this.enabled; }
  stop() { this.enabled = false; this.idx = -1; this.waiting = true; }
  trigger(name) {
    if (!this.enabled || this.done) return false;
    const k = this.beats.findIndex((b) => b.trigger === name);
    if (k < 0 || k <= this.idx) return false;
    this.idx = k; this.waiting = false; this.log.push('show:' + this.beats[k].id);
    if (this.beats[k].id === 'done') this._finish();                       // the results overlay covers the last card: count it as seen
    return true;
  }
  /** A player action: 'placed' (n = soldiers on the field) or 'power_cast'. */
  action(name, n = 0) {
    if (!this.enabled || this.done || this.waiting || this.idx < 0) return false;
    const id = this.beats[this.idx].id;
    if ((id === 'place_spears' && name === 'placed' && n >= 6) || (id === 'god_power' && name === 'power_cast')) { this.waiting = true; this.log.push('done:' + id); return true; }
    return false;
  }
  /** "Got it": completes the open beat; on the last beat it finishes the tutorial. */
  next() {
    if (!this.enabled || this.done) return false;
    if (this.idx >= this.beats.length - 1) { this._finish(); return true; }
    this.waiting = true; return true;
  }
  skip() { if (!this.enabled && this.done) return false; this._finish(); return true; }
  _finish() { this.done = true; this.enabled = false; this.waiting = true; this.log.push('finish'); try { this.onFinish(); } catch (e) { /* persistence is best effort */ } }
  /** The HudData.teaching object, or null. */
  hud() {
    if (!this.enabled || this.done || this.waiting || this.idx < 0) return null;
    const b = this.beats[this.idx];
    const target = { place_spears: null, fight: 'speed', god_power: 'powers', counter: null, done: null }[b.id];
    return { id: b.id, index: this.idx, total: this.beats.length, title: b.hint || '', text: b.text, target: target || undefined, who: b.who || 'brutus', canSkip: true, ack: b.id !== 'place_spears' && b.id !== 'god_power' };
  }
}

// ====================================================================================================== god-power aim
/** Aim ring drawn on the terrain under the cursor (browser only; THREE is the global window.THREE). Returns {show(x,z,r,kind), hide(), dispose()} or null. */
export function createAimRing(game) {
  const THREE = typeof window !== 'undefined' ? window.THREE : null; if (!THREE || !game || !game.engine || !game.engine.scene) return null;
  const geo = new THREE.RingGeometry(0.9, 1, 56); geo.rotateX(-Math.PI / 2);
  const disc = new THREE.CircleGeometry(0.9, 40); disc.rotateX(-Math.PI / 2);
  const mk = (g, op) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: op, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false }));
  const ring = mk(geo, 0.95), fill = mk(disc, 0.16), grp = new THREE.Group(); grp.add(ring, fill); grp.renderOrder = 22; ring.renderOrder = 22; fill.renderOrder = 21; grp.visible = false; grp.frustumCulled = false;
  game.engine.scene.add(grp);
  const GOOD = new Set(['heal_wave', 'raise_chickens']);
  return {
    show(x, z, r, id) {
      const w = game.world; const y = (w ? w.arena.heightAt(x, z) : 0) + 0.3;
      grp.position.set(x, y, z); grp.scale.set(r, 1, r); grp.visible = true;
      const c = GOOD.has(id) ? 0x7dff9a : id === 'wine_rain' ? 0xc779ff : 0xffb23c; ring.material.color.setHex(c); fill.material.color.setHex(c);
    },
    hide() { grp.visible = false; },
    dispose() { game.engine.scene.remove(grp); geo.dispose(); disc.dispose(); ring.material.dispose(); fill.material.dispose(); },
  };
}

/** God-power target mode: after aim(id) the next click on the terrain casts there; Esc / right-click / a second aim(null) cancels; a ring follows the cursor. */
export class AimController {
  /** @param {{game:object, team:()=>number, ring?:()=>object|null}} o */
  constructor(o) { this.game = o.game; this.team = o.team || (() => 0); this.makeRing = o.ring || (() => null); this.ring = null; this.id = null; this.pos = null; }
  get active() { return !!this.id; }
  _toast(text) { try { this.game.emit('toast', { text, kind: 'info' }); } catch (e) { /* no UI */ } }
  info(id) { return GOD_POWERS.find((p) => p.id === id) || null; }
  /** aim(id) arms a power (returns true), aim(null) cancels (returns false). Safe without a world. */
  set(id) {
    if (!id) { this.cancel(); return false; }
    const g = this.game, w = g.world;
    if (!w) return false;
    const p = this.info(id); if (!p) return false;
    if (w.state !== 'running' && w.state !== 'countdown') { this._toast('The gods wait for the fight to begin.'); return false; }        // arming during the countdown is fine: the cast itself waits for 'running'
    if (!w.godpowers) { this._toast('God powers are off in this battle.'); return false; }
    const team = this.team();
    if (!w.godpowers.ready(id, team)) { const l = w.godpowers.list(team).find((x) => x.id === id); this._toast(p.name + ' needs ' + Math.ceil(l ? l.cd : 0) + ' more seconds. Even gods have cooldowns.'); return false; }
    this.id = id;
    if (this.ring === null) this.ring = this.makeRing() || false;
    if (this.pos && this.ring) this.ring.show(this.pos.x, this.pos.z, p.r, id);
    try { g.emit('aim', { id }); } catch (e) { /* no UI */ }
    return true;
  }
  /** Cursor moved over the terrain at (x, z). */
  hover(x, z) { this.pos = { x, z }; if (this.id && this.ring) { const p = this.info(this.id); if (p) this.ring.show(x, z, p.r, this.id); } }
  /** A click on the terrain at (x, z): casts when armed. Returns true when the click was consumed. */
  click(x, z) {
    if (!this.id) return false;
    const w = this.game.world;
    if (!w || w.state !== 'running') { this._toast('Hold on: the fight has not started yet.'); return true; }          // stay armed, swallow the click
    const id = this.id; this.cancel(true);
    try { this.game.cast(id, x, z, this.team()); } catch (e) { return true; }
    return true;
  }
  cancel(silent) {
    if (!this.id) return false;
    this.id = null; if (this.ring) this.ring.hide();
    if (!silent) { try { this.game.emit('aim', { id: null }); } catch (e) { /* no UI */ } }
    return true;
  }
  dispose() { this.id = null; if (this.ring) { this.ring.dispose(); } this.ring = null; }
}

// ====================================================================================================== Take Command input
/**
 * Merges the two input paths of Take Command into one tick-stamped `possess` command stream:
 *   keyboard / mouse: app/input.js calls Game.sendPossess(dx, dz, attack, ability) at 30 Hz with a world-space direction  -> fromKeyboard()
 *   touch HUD: ui/hud/takecommand.js calls Game.possessInput({move:{x,y}, attack, ability, sprint}) with a SCREEN-space stick (y < 0 = forward) -> input()
 * The stick is turned camera-relative with the rig's smoothed yaw; sprint pushes the stick to full speed (the sim has no run bonus, see docs/requests/meta_possess_sprint.md);
 * a tapped Attack holds for 0.5 s (the touch HUD sends no release); abilities are edge-triggered once.
 */
export class PossessController {
  constructor(o) { this.game = o.game; this.stick = { x: 0, y: 0, sprint: false }; this.hold = 0; this.ability = 0; this.kbdAge = 99; this.acc = 0; this.lastSent = 0; this.sent = 0; }
  get active() { const g = this.game; return !!(g.world && g.possessId && g.world.state === 'running'); }
  _yaw() { const r = this.game.rig; return r && typeof r.syaw === 'number' ? r.syaw : 0; }
  _world(mx, my) {         // screen stick -> world direction (forward = -my)
    const yaw = this._yaw(), fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mz = -my; return [fx * mz + rx * mx, fz * mz + rz * mx];
  }
  _stickVec() {
    let { x, y } = this.stick; const m = Math.hypot(x, y);
    if (m < 0.12) return [0, 0];
    if (this.stick.sprint || m > 1) { x /= m; y /= m; }
    return this._world(x, y);
  }
  _emit(wx, wz, attack, ability) {
    const g = this.game, w = g.world; if (!w || !g.possessId) return false;
    w.input(w.tickN + 1, { type: 'possess', unit: g.possessId, move: { x: wx, z: wz }, attack: !!attack, ability: ability | 0 });
    this.sent++; this.lastSent = wx * wx + wz * wz > 0 ? 1 : 0; return true;
  }
  /** The touch-HUD patch. Returns false when nobody is possessed. */
  input(patch) {
    if (!this.active || !patch || typeof patch !== 'object') return false;
    if (patch.move && typeof patch.move === 'object') { const x = +patch.move.x, y = +patch.move.y; this.stick.x = Number.isFinite(x) ? clamp(x, -1, 1) : 0; this.stick.y = Number.isFinite(y) ? clamp(y, -1, 1) : 0; }
    if (patch.sprint !== undefined) this.stick.sprint = !!patch.sprint;
    if (patch.attack === true) this.hold = 0.5; else if (patch.attack === false) this.hold = 0;
    const a = patch.ability | 0; if (a >= 1 && a <= 3) this.ability = a;
    this.kbdAge = 99; this.acc = 0; this._flush();
    return true;
  }
  _flush() { const [wx, wz] = this._stickVec(); const ab = this.ability; this.ability = 0; return this._emit(wx, wz, this.hold > 0, ab); }
  /** app/input.js path (Game.sendPossess): the keyboard wins while a movement key is held, the stick fills in otherwise. */
  fromKeyboard(dx, dz, attack, ability) {
    if (!this.active) return false;
    this.kbdAge = 0;
    let wx = +dx || 0, wz = +dz || 0;
    if (wx * wx + wz * wz < 1e-6) { const s = this._stickVec(); wx = s[0]; wz = s[1]; }
    const ab = (ability | 0) || this.ability; this.ability = 0;
    return this._emit(wx, wz, !!attack || this.hold > 0, ab);
  }
  /** Per frame: repeat the stick at 30 Hz when the keyboard path is silent; stop a released attack. */
  tick(dt) {
    if (!this.active) { this.stick.x = this.stick.y = 0; this.hold = 0; this.ability = 0; return; }
    this.kbdAge += dt; const wasHold = this.hold > 0; this.hold = Math.max(0, this.hold - dt);
    if (this.kbdAge < 0.2) return;
    this.acc += dt; if (this.acc < 1 / 30) return; this.acc = 0;
    const [wx, wz] = this._stickVec();
    if (wx !== 0 || wz !== 0 || this.hold > 0 || wasHold || this.ability || this.lastSent) this._flush();
  }
  reset() { this.stick.x = this.stick.y = 0; this.stick.sprint = false; this.hold = 0; this.ability = 0; this.kbdAge = 99; this.lastSent = 0; }
}

// ====================================================================================================== kill-cam
/**
 * Kill-cam: after the battle, a 4 s real-time slow-mo (0.25x) dolly on the final kill, then the camera and speed return. It re-plays nothing and mutates
 * nothing: the world is already 'ended' (only corpses, projectiles and effects keep animating), the results object is cached, and every touched value
 * (camera state, speed, pause) is restored. Faithful part: the camera really is where the last kill happened, framed on the corpse while it is still
 * lying there. Not faithful: the fight itself is not rewound (a deterministic re-simulation of the last 4 s is on the cut ladder).
 */
export class KillCam {
  constructor(o) { this.game = o.game; this.target = o.target || (() => null); this.duration = o.duration || 4; this.t = 0; this.p = null; this.saved = null; this.resolve = null; }
  get active() { return !!this.p; }
  /** Returns a Promise<boolean>: true when the cinematic played, false when there was nothing to play. Calling it while it plays returns the same promise. */
  start() {
    if (this.p) return this.p;
    const g = this.game, w = g.world;
    if (!w || g.state !== 'ended' || !g.rig) return Promise.resolve(false);
    const tg = this.target(); if (!tg) return Promise.resolve(false);
    const r = g.rig;
    this.saved = { mode: r.mode, tx: r.tx, ty: r.ty, tz: r.tz, yaw: r.yaw, pitch: r.pitch, dist: r.dist, speed: g.getSpeed ? g.getSpeed() : 1, paused: g.isPaused ? g.isPaused() : false };
    this.t = 0; this.tg = tg; this.yaw0 = r.yaw;
    r.mode = 'killcam';
    if (g.isPaused && g.isPaused()) g.pause(false);
    if (g.setSpeed) g.setSpeed(0.25);
    try { g.emit('camera', { mode: 'killcam' }); } catch (e) { /* no UI */ }
    this.p = new Promise((res) => { this.resolve = res; });
    this.update(0);
    return this.p;
  }
  /** Real seconds. Drives the camera targets; Game.frame's rig.update applies them. */
  update(dt) {
    if (!this.p) return;
    const g = this.game, w = g.world, r = g.rig;
    if (!w || g.state !== 'ended') { this.cancel(false); return; }
    this.t += dt;
    const k = clamp(this.t / this.duration, 0, 1), e = 1 - Math.pow(1 - k, 3);
    const tg = this.tg; let x = tg.x, z = tg.z, y = tg.y;
    const u = tg.id && r._unit ? r._unit(tg.id) : null;                         // the corpse is still animating: keep it in frame
    if (u) { x = u.x; z = u.z; y = u.y; }
    r.tx = x; r.tz = z; r.ty = (w.arena ? w.arena.heightAt(x, z) : y || 0) + 1.3;
    r.dist = 30 - 19 * e; r.pitch = 0.52 - 0.22 * e; r.yaw = this.yaw0 + (g.reduceMotion || r.reduceMotion ? 0.4 : 0.4 + 1.1 * k);
    if (this.t >= this.duration) this.cancel(true);
  }
  cancel(restore = true) {
    if (!this.p) return;
    const g = this.game, r = g.rig, s = this.saved, res = this.resolve;
    this.p = null; this.resolve = null; this.saved = null;
    if (restore && s && r) { r.mode = s.mode; r.tx = s.tx; r.ty = s.ty; r.tz = s.tz; r.yaw = s.yaw; r.pitch = s.pitch; r.dist = s.dist; }
    if (restore && s) { if (g.setSpeed) g.setSpeed(s.speed); if (s.paused && g.pause) g.pause(true); try { g.emit('camera', { mode: s.mode }); } catch (e) { /* no UI */ } }
    if (res) res(!!restore);
  }
}

// ====================================================================================================== storage quota (verification P2)
/**
 * When the browser refuses a write (quota), save/store.js keeps the value in memory (nothing is lost this session) and flips status() to 'full'.
 * This opens ONE modal (at most every 30 s): export the save, or delete the oldest arena / soldier / army to make room; flushPending() then writes the kept values.
 * o: { store, nav:{modal, toast}, transfer, collections:{arenas, soldiers, armies}, platform?:{downloads, clipboard}, now? }
 */
export function watchQuota(o) {
  const { store, nav, transfer, collections = {}, platform = {} } = o; const now = o.now || (() => Date.now());
  let last = -1e9, open = false;
  const toast = (t, kind) => { try { nav.toast(t, { kind: kind || 'info' }); } catch (e) { /* no UI */ } };
  async function exportNow() {
    let code; try { code = await transfer.exportAll(); } catch (e) { toast(String(e && e.message || 'The export failed'), 'error'); return false; }
    try { if (platform.downloads && platform.downloads.save) { const r = await platform.downloads.save('voxelwars-save.json', code); if (r) { toast('Export saved.', 'success'); return true; } } } catch (e) { /* fall through to the clipboard */ }
    try { if (platform.clipboard && await platform.clipboard(code)) { toast('Save code copied to the clipboard. Paste it somewhere safe.', 'success'); return true; } } catch (e) { /* fall through to the text box */ }
    if (typeof document !== 'undefined') { const ta = document.createElement('textarea'); ta.readOnly = true; ta.value = code; ta.rows = 6; ta.style.cssText = 'width:100%;font:12px monospace'; ta.addEventListener('focus', () => ta.select()); await nav.modal({ title: 'Your save code', body: ta, buttons: [{ label: 'Done', value: true }] }); }
    return true;
  }
  async function show() {
    if (open) return false; open = true;
    try {
      const counts = { arena: (collections.arenas && collections.arenas.list().length) || 0, soldier: (collections.soldiers && collections.soldiers.list().length) || 0, army: (collections.armies && collections.armies.list().length) || 0 };
      const buttons = [{ label: 'Export my save', variant: 'primary', value: 'export' }];
      if (counts.arena) buttons.push({ label: 'Delete oldest arena', variant: 'danger', value: 'arena' });
      if (counts.soldier) buttons.push({ label: 'Delete oldest soldier', variant: 'danger', value: 'soldier' });
      if (counts.army) buttons.push({ label: 'Delete oldest army', variant: 'danger', value: 'army' });
      buttons.push({ label: 'Not now', variant: 'secondary', value: null });
      const v = await nav.modal({ title: 'The storage shelf is full', body: 'Your browser says there is no room left. Nothing is lost: your latest changes are kept in memory for this session. Export your save to keep a copy, or delete something you no longer need and I will try again.', buttons });
      if (v === 'export') await exportNow();
      else if (v === 'arena' || v === 'soldier' || v === 'army') {
        const col = collections[v + 's']; const list = col ? col.list() : []; const oldest = list[list.length - 1];
        if (oldest) { col.remove(oldest.id); const left = store.flushPending(); toast(left ? 'Still full. Delete something else, or export your save.' : 'Made some room. Everything is saved.', left ? 'error' : 'success'); }
      }
      return true;
    } finally { open = false; }
  }
  store.onStatus((st) => { if (st === 'full' && now() - last > 30000) { last = now(); show(); } });
  return { show };
}

// ====================================================================================================== the meta object
const LOG_FIELDS = { unit_spawn: ['id', 'team', 'def'], friendly_fire: ['src', 'dst', 'dmg'], charge_hit: ['id', 'dst', 'mul'], unit_brace: ['id', 'dst'], army_low: ['team', 'frac'], big_swing: ['team', 'ratio', 'flank'], hero_down: ['id', 'def', 'team'], unit_rout: ['id', 'team'], stalemate_warning: ['t'], trample: ['id', 'count'] };
const LOG_MAX = 6000;

/**
 * @param {{game:object, content?:object, settings?:object, store?:object, audio?:object, docs?:object, stats?:LifetimeStats, rng?:object, now?:()=>number, ring?:()=>object|null}} o
 *   game: needs emit(name, payload), world, state, rig?, getSpeed?, setSpeed?, isPaused?, pause?, cast?; killfeed (array) and announce are written to it.
 */
export function createMeta(o) {
  const game = o.game, content = o.content || {}, settings = o.settings || { get: () => undefined, set() {} }, audio = o.audio || null;
  const now = o.now || (() => Date.now());
  const rng = o.rng || new RNG((now() ^ 0x5bd1e995) >>> 0);
  const docs = o.docs || (o.store ? createDocs(o.store) : createDocs({ get: () => null, getVersioned: () => null, getRaw: () => null, setRaw: () => true, set: () => true, remove() {}, status: () => 'memory' }));
  if (docs.loadAll) docs.loadAll();
  const stats = o.stats || new LifetimeStats({ adapter: o.store ? storeAdapter(o.store) : null });
  const announcer = createAnnouncer({ rng, stats: stats.get() });
  const achDefs = (content.humor && content.humor.achievements) || ACHIEVEMENTS;

  const M = { game, stats, announcer, docs, active: false, world: null, setup: null, pt: 0, finished: false, summary: null, res: null, battleUnlocked: [], toastQ: [], toastT: 0, clock: 0, lastKill: null, qualKill: null, log: [], agg: [0, 0, 0, 0], off: null, firstContact: false, lineSeq: 0 };

  // ------------------------------------------------------------------ achievements
  const unlockedMap = () => docs.progress.get('achievements') || {};
  M.achievements = {
    list: () => { const u = unlockedMap(); return achDefs.map((a) => Object.assign({}, a, { unlocked: !!u[a.id], at: u[a.id] ? u[a.id].at : 0 })); },
    has: (id) => !!unlockedMap()[id],
    unlocked: unlockedMap,
    /** Test `ev` (a BattleSummary or a UI event; null = plain re-check) and persist + announce what is new. Returns the new ids. */
    check(ev) {
      const have = unlockedMap();
      const ids = checkAchievements(stats.get(), ev || null, have);
      if (!ids.length) return ids;
      const at = now();
      for (const id of ids) { have[id] = { at }; M.battleUnlocked.push(id); const a = getAchievement(id) || achDefs.find((x) => x.id === id); M.toastQ.push({ text: 'Achievement unlocked: ' + (a ? a.name : pretty(id)), kind: 'success', id }); }
      docs.progress.set('achievements', have);
      stats.flush(); docs.flush();
      return ids;
    },
    recheck() { return M.achievements.check(null); },
  };

  // ------------------------------------------------------------------ controllers
  M.aim = new AimController({ game, team: () => M.pt, ring: o.ring || (() => createAimRing(game)) });
  M.possess = new PossessController({ game });
  M.killcam = new KillCam({ game, target: () => finalKillTarget() });
  const seenDoc = docs.seen;
  M.teaching = new TeachingGuide({
    isDismissed: () => !!(seenDoc.get('teaching') || safe(() => (settings.get('seenHints') || {}).teaching, false)),
    onFinish: () => { seenDoc.set('teaching', true); try { settings.set('seenHints', Object.assign({}, settings.get('seenHints') || {}, { teaching: true })); } catch (e) { /* settings optional */ } },
  });

  // ------------------------------------------------------------------ announcer context
  const annCtx = { speed: 1, arena: undefined, factions: undefined, teamNames: ['Blue', 'Red'], playerTeam: 0, mission: null,
    unitName: (id, pl) => { const t = unitText(id); if (t) return pl ? t.plural : t.name; const d = M.world && (M.world.defs[id]); const n = d ? d.name : pretty(id); return pl ? n + 's' : n; },
    nameOf: (uid) => { const w = M.world; const u = w && w.byId.get(uid); return u && u.name ? u.name : null; } };
  const factionName = (id) => { const f = content.factions && content.factions[id]; return f ? f.name : id === 'mixed' ? 'Mixed Forces' : pretty(id); };

  // ------------------------------------------------------------------ attach / detach
  M.attach = function attach(world, setup) {
    M.detach();
    M.world = world; M.setup = setup || null; M.active = true; M.finished = false; M.summary = null; M.res = null; M.battleUnlocked = []; M.lastKill = null; M.qualKill = null; M.firstContact = false;
    M.log = []; M.agg = [0, 0, 0, 0];
    const s = setup || {}, a = s.arena || {}, rules = s.rules || {};
    M.pt = s.playerTeam === 1 ? 1 : 0;
    const arenaId = a.data ? 'custom' : (a.presetId || 'marathon');
    stats.beginBattle({ playerTeam: M.pt, arenaId, mission: s.mission || null, objective: rules.objective && rules.objective.type ? rules.objective.type : null, mutators: rules.mutators || [], getVip: () => (world.objective && world.objective.vip) || null });
    announcer.reset(); announcer.setStats(stats.get());
    annCtx.playerTeam = M.pt; annCtx.mission = s.mission || null; annCtx.speed = game.getSpeed ? game.getSpeed() : 1;
    annCtx.arena = a.data ? { id: null, name: (a.data && a.data.name) || 'a Custom Arena' } : arenaId;
    const A = s.armies && s.armies.A, B = s.armies && s.armies.B;
    annCtx.factions = A && B ? [factionName(A.faction), factionName(B.faction)] : undefined;
    if (game.killfeed) game.killfeed.length = 0;
    game.announce = null;
    M.toastQ.length = Math.min(M.toastQ.length, 6);
    const guided = (s.mission && s.mission === MISSION_ORDER[0]) || s.teaching === true;
    if (guided) { M.teaching.start(); } else M.teaching.stop();
    M.off = world.events.onAny((type, p) => onEvent(type, p));
    return M;
  };
  M.detach = function detach() {
    if (M.off) { M.off(); M.off = null; }
    M.killcam.cancel(false); M.aim.cancel(true); M.possess.reset(); M.teaching.stop();
    M.active = false; M.world = null;
    if (game) game.announce = null;
  };

  // ------------------------------------------------------------------ the event pump
  function onEvent(type, p) {
    if (!M.active) return;
    const w = M.world;
    if (type === 'battle_end') { _finish(endPayload(w, p)); return; }
    if (M.finished) return;
    const t = w.time;
    const lf = LOG_FIELDS[type];
    if (lf && M.log.length < LOG_MAX) { const c = {}; for (const f of lf) c[f] = p[f]; M.log.push([type, c, t]); }
    else if (type === 'unit_hit') { const tm = stats.teamOf.get(p.src); if (tm === 0 || tm === 1) M.agg[tm * 2 + (p.proj ? 1 : 0)] += +p.dmg || 0; if (!M.firstContact && stats.teamOf.get(p.src) !== stats.teamOf.get(p.dst)) { M.firstContact = true; M.teaching.trigger('first_contact'); } }
    // 1. stats  2. achievements (battle_start: arena_played)
    const ev = stats.onEvent(type, p, { t, roster: type === 'battle_start' ? w.units.map((u) => [u.id, u.team, u.def.id]) : undefined });
    if (ev) M.achievements.check(ev);
    // side effects that are not part of the contract order
    switch (type) {
      case 'unit_kill': feed(p, t); trackKill(p, t); break;
      case 'hero_down': if (M.lastKill && M.lastKill.id === p.id) { M.lastKill.why = 'hero'; M.qualKill = M.lastKill; } break;          // the sim emits hero_down and kill_streak right after the unit_kill
      case 'kill_streak': if (M.lastKill) { M.lastKill.why = M.lastKill.why || 'streak'; M.qualKill = M.lastKill; } break;
      case 'battle_start': M.teaching.trigger('battle_start'); break;
      case 'unit_brace': M.teaching.trigger('cavalry_brace'); break;
      case 'god_power': if (p.team === M.pt) M.teaching.action('power_cast'); break;
      default: break;
    }
    // 3. announcer
    annCtx.speed = game.getSpeed ? game.getSpeed() : annCtx.speed;
    announcer.onEvent(type, p, annCtx);
  }

  function endPayload(w, p) {
    if (p && p.perDef) return { winner: p.winner, reason: p.reason, t: p.t, stats: p.stats, perDef: p.perDef };
    const pd = w._perDef || [Object.create(null), Object.create(null)];
    if (!w._perDef) for (const u of w.units) if (u.alive && u.team < 2) pd[u.team][u.def.id] = (pd[u.team][u.def.id] || 0) + 1;
    return { winner: w.winner, reason: w.endReason, t: w.time, stats: w.stats, perDef: pd };
  }

  /** The battle_end pipeline, exactly once per battle, in the documented order. */
  function _finish(pl) {
    if (!M.active || M.finished) return;
    M.finished = true;
    const w = M.world;
    pl = pl || endPayload(w);
    const S = stats.onEvent('battle_end', pl, { t: pl.t });                      // 1. lifetime totals include this battle
    M.summary = S;
    if (S) M.achievements.check(S);                                              // 2. achievements read the updated totals
    annCtx.speed = game.getSpeed ? game.getSpeed() : annCtx.speed;
    announcer.onEvent('battle_end', pl, annCtx);                                 // 3. announcer callbacks read the updated stats
    M.teaching.trigger('battle_end');
    buildResults(pl);
    syncDailyStreak();
    docs.flush();
  }
  docs.daily.onChange(() => syncDailyStreak());                                  // the Daily screen writes the history through progress.set('daily', ...): keep the stat in step
  M.finish = () => { if (M.active && !M.finished && M.world && M.world.state === 'ended') _finish(null); return M.finished; };

  function syncDailyStreak() { const st = docs.daily.get('streak', 0); if ((stats.get().dailyStreak || 0) !== st) stats.setValue('dailyStreak', st); }

  // ------------------------------------------------------------------ kill feed
  const nameOfUnit = (id, defId) => { const w = M.world; const u = id && w ? w.byId.get(id) : null; if (u && u.name) return u.name; const d = w && w.defs[defId]; return d ? d.name : pretty(defId); };
  function feed(p, t) {
    const list = game.killfeed; if (!list) return;
    const victim = nameOfUnit(p.dst, p.dstDef), killer = p.src && p.srcDef ? nameOfUnit(p.src, p.srcDef) : null;
    let verb, text;
    if (killer) { verb = killVerb(p.cause, rng); text = killer + ' ' + verb + ' ' + victim; }
    else { const solo = killSolo(p.cause, rng); if (solo) { verb = solo; text = victim + ' ' + solo; } else { verb = killVerb(p.cause, rng); text = 'Somebody ' + verb + ' ' + victim; } }
    list.push({ t, team: p.srcTeam, verb, text, cause: p.cause, killer, victim: victim, srcDef: p.srcDef, dstDef: p.dstDef, key: 'k' + p.dst });
    if (list.length > 5) list.shift();
  }
  function trackKill(p, t) {
    const d = M.world.defs[p.dstDef];
    const k = { x: p.x, y: p.y, z: p.z, id: p.dst, t, def: p.dstDef, team: p.dstTeam, why: d && (d.role === 'monster' || d.role === 'hero') ? (d.role === 'hero' ? 'hero' : 'boss') : null };
    M.lastKill = k; if (k.why) M.qualKill = k;
  }
  /** Where the kill-cam looks: the last hero / boss / streak kill (spec §14), else the final kill, else the middle of the survivors. */
  function finalKillTarget() {
    const w = M.world; if (!w) return null;
    const k = M.qualKill || M.lastKill;
    if (k) return { x: k.x, y: k.y, z: k.z, id: k.id, why: k.why || 'final' };
    let sx = 0, sz = 0, n = 0; for (const u of w.units) { if (u.alive) { sx += u.x; sz += u.z; n++; } }
    return n ? { x: sx / n, y: 0, z: sz / n, id: 0, why: 'final' } : null;
  }

  // ------------------------------------------------------------------ announcer output
  M.speak = function speak(line) {
    if (!audio || !audio.speech) return false;
    try {
      if (!settings.get('tts') || settings.get('muted') || settings.get('vol.announcer') === 0) return false;
      if (audio.speech.isEnabled && !audio.speech.isEnabled()) return false;
      if (audio.speech.setSpeed && game.getSpeed) audio.speech.setSpeed(game.getSpeed());
      return !!audio.speech.speak(line.text, { priority: line.pri });
    } catch (e) { return false; }
  };
  function publish(line) {
    // the id is unique per spoken line: the HUD de-duplicates by id|who|text over its last 14 lines, which must never swallow a legitimate repeat of the same template in a later battle
    const out = { id: line.id + '@' + (++M.lineSeq), tpl: line.id, cat: line.cat, sub: line.sub, who: line.who, text: line.text, pri: line.pri, dur: line.dur, t: M.world ? M.world.time : 0, beat: line.chain || null };
    game.announce = out;
    try { game.emit('announce', out); } catch (e) { /* no UI */ }
    M.speak(line);
    M.lastLine = out;
  }

  // ------------------------------------------------------------------ frame
  M.onFrame = function onFrame(dt) {
    dt = clamp(+dt || 0, 0, 0.25); M.clock += dt;
    if (M.toastQ.length) {                                       // one achievement toast at a time, 2 s apart (the toast layer overlaps otherwise)
      M.toastT -= dt;
      if (M.toastT <= 0) { const t = M.toastQ.shift(); M.toastT = 2.2; try { game.emit('toast', { text: t.text, kind: t.kind }); } catch (e) { /* no UI */ } if (audio) safe(() => audio.play && audio.play('ui_achievement'), 0); }
    }
    if (!M.active) return;
    M.killcam.update(dt);
    M.possess.tick(dt);
    // Take Command: the possessed soldier fell
    if (game.possessId && M.world && M.world.state === 'running') {         // (not `possession.current`: that is only set once the queued possess command has been applied by a tick)
      const u = M.world.unitById(game.possessId);
      if (!u || !u.alive) { try { game.possess(null); game.emit('toast', { text: 'Your soldier has fallen. Back to godhood.', kind: 'info' }); } catch (e) { /* no UI */ } }
    }
    if (!game.isPaused || !game.isPaused()) {
      if (game.getSpeed) announcer.setSpeed(game.getSpeed());
      announcer.tick(dt);
      let l; while ((l = announcer.nextLine())) publish(l);
    }
  };

  // ------------------------------------------------------------------ results
  function buildResults(pl) {
    const w = M.world, S = M.summary, B = stats.battle(), x = B.x, pt = M.pt;
    const ws = pl.stats || w.stats, mine = ws[pt] || {};
    const budget = (() => { const a = M.setup && M.setup.armies && M.setup.armies[pt === 0 ? 'A' : 'B']; return (a && a.budget) || (M.setup && M.setup.rules && M.setup.rules.budget) || 0; })();
    const frng = new RNG(((w.seed | 0) ^ 0x7f4a7c15) >>> 0);
    const funny = buildFunnyStats({ kills: S.kills, losses: S.unitsLost, damage: mine.damageDealt || 0, friendlyKills: S.friendlyKills, chickenKills: x.chickenKills, goatKills: x.goatKills, kicks: S.kicks, trampleKills: x.trampleKills, stoned: S.stonedUnits, misfires: x.misfires, cyclopsMisses: S.cyclopsMisses, longestStreak: x.longestStreak, shieldBlocks: x.shieldBlocks, arrowsFired: x.arrowsFired, boulders: x.boulders, routs: x.routs, revives: x.revives, heroKills: x.heroKills, bribes: x.bribes, duration: S.t, survivorsCost: mine.aliveCost || 0, wasted: budget ? Math.max(0, budget - (mine.startCost || 0)) : 0 }, frng);
    // lessons: the event log we kept (spawns, friendly fire, charges, ...) + damage totals per team/kind + the end
    const log = M.log.slice();
    const rep = [0, 0]; for (const [type, c] of log) if (type === 'unit_spawn' && !rep[c.team]) rep[c.team] = c.id;      // a stand-in unit per team for the aggregated damage rows
    for (let tm = 0; tm < 2; tm++) for (let pr = 0; pr < 2; pr++) { const d = M.agg[tm * 2 + pr]; if (d > 0 && rep[tm]) log.push(['unit_hit', { src: rep[tm], dst: 0, dmg: d, proj: pr }, pl.t]); }
    log.push(['battle_end', { winner: pl.winner, reason: pl.reason, t: pl.t }, pl.t]);
    const lessons = safe(() => generateLessons(log, { team: pt, defs: w.defs, rng: new RNG(((w.seed | 0) ^ 0x1e55) >>> 0) }), []).map((l) => ({ text: l.text, fix: l.fix, who: l.who, id: l.id }));
    M.res = { funnyStats: funny, lessons, summary: S, achievements: M.battleUnlocked.map((id) => { const a = getAchievement(id); return a ? { id, name: a.name, desc: a.desc, icon: a.icon } : { id, name: pretty(id) }; }) };
    const kind = M.setup && M.setup.kind;
    if (kind === 'survival') M.res.survival = recordSurvival(w, ws, pt);
    if ((kind === 'campaign' || kind === 'puzzle') && game.run) { try { M.res.mission = recordMission(w, kind); } catch (e) { console.warn('mission result failed', e); } }
    if (kind === 'daily') M.res.daily = { date: (M.setup.rules && M.setup.rules.daily) || localDateKey() };
  }

  /** A finished mission or puzzle: BattleSummary (+ the tracker's extras) -> stars, progress (vw.progress stars / puzzles / unlocks), rewards, "next". Runs once per battle (buildResults). */
  function recordMission(w, kind) {
    const capi = content.campaignApi, papi = content.puzzleApi, run = game.run, m = run && run.m; if (!capi || !m) return null;
    const summary = capi.summaryOf(w, m, run.tracker, M.pt);
    const isPuzzle = kind === 'puzzle', id = m.id;
    const pz = isPuzzle && papi ? papi.puzzleById(id) : null;
    const ev = isPuzzle ? (pz ? papi.evaluate(pz, summary) : { stars: 0, earned: [false, false, false] }) : capi.evaluateStars(m, summary);
    const win = summary.win === true && summary.draw !== true;
    const labels = isPuzzle && pz ? (papi.text(id, content.humor && content.humor.puzzles) || {}).stars || m.stars : m.stars;
    const stars = labels.slice(0, 3).map((x, k) => ({ id: x.id, text: x.text, earned: !!ev.earned[k] }));
    const out = { kind, stars, win, mission: { id, kind, index: m.index | 0, act: m.act || 0, title: m.title || id, next: null, nextTitle: null }, rewards: null, canNext: false };
    if (!isPuzzle) {
      const before = JSON.parse(JSON.stringify(docs.progress.get('stars', {}) || {}));
      const rw = capi.rewardsFor(m, before, summary);
      M.recordCampaign(id, ev.stars, win);                                                       // stars (max), lifetime stats, campaign medals
      if (win) {
        const partNames = (m.rewards && m.rewards.partNames) || [], keys = (m.rewards && m.rewards.unlockParts) || [];
        const have = new Set([].concat(docs.progress.get('unlocks', []) || [], docs.progress.get('parts', []) || []));
        for (const k of rw.parts) have.add(k);
        if (rw.parts.length) { docs.progress.set('unlocks', Array.from(have)); docs.progress.set('parts', Array.from(have)); }
        const names = (list) => (list || []).map((d) => { const df = content.defs && content.defs[d]; return df ? df.name : pretty(d); });
        out.rewards = { title: rw.title, firstClear: rw.firstClear, improved: rw.improved, unlockParts: rw.parts.map((k) => partNames[keys.indexOf(k)] || pretty(k)), unlockMutators: rw.mutators.slice(), codex: rw.firstClear ? names(m.rewards && m.rewards.codex) : [] };
        const nx = (capi.missions || [])[(m.index | 0) + 1];
        if (nx) { out.mission.next = nx.id; out.mission.nextTitle = nx.title; out.canNext = true; }
      }
    } else {
      const prev = JSON.parse(JSON.stringify(docs.progress.get('puzzles', {}) || {})), best = prev[id] || { stars: 0 };
      const spent = Math.round(summary.spent !== undefined ? summary.spent : summary.playerCostStart || 0), t = Math.round(summary.t || 0);
      if (win && (ev.stars > (best.stars | 0) || (ev.stars === (best.stars | 0) && (best.spent === undefined || spent < best.spent)))) {
        prev[id] = { stars: ev.stars, spent, time: t }; docs.progress.set('puzzles', prev);
        const st = JSON.parse(JSON.stringify(docs.progress.get('stars', {}) || {})); if (ev.stars > (st[id] | 0)) { st[id] = ev.stars; docs.progress.set('stars', st); }
      }
      const list = (papi && papi.puzzles) || [], nx = list[(m.index | 0) + 1];
      if (win && nx) { out.mission.next = nx.id; out.mission.nextTitle = nx.title; out.canNext = true; }
    }
    return out;
  }

  function recordSurvival(w, ws, pt) {
    const wv = w.waves, sv = docs.survival;
    const prevBest = sv.get('best', 0);
    const score = wv ? wv.score() : 0, cleared = wv ? wv.cleared : 0, n = wv ? wv.n : 1;
    const arena = (annCtx.arena && (typeof annCtx.arena === 'string' ? (M.setup && M.setup.arena && M.setup.arena.presetId) : annCtx.arena.name)) || '';
    let board = sv.get('board', []), rank = 0;
    if (score > 0) {
      const entry = { score, waves: cleared, date: localDateKey(), arena: String(arena).slice(0, 40) };
      board = board.concat([entry]).sort((a, b) => b.score - a.score).slice(0, 5); rank = board.indexOf(entry) + 1;
      sv.set('board', board); if (score > prevBest) sv.set('best', score); if (cleared > sv.get('bestWave', 0)) sv.set('bestWave', cleared);
    }
    return { wave: n, waveName: waveName(n), score, kills: ws[pt] ? ws[pt].kills : 0, remainingCost: Math.round(ws[pt] ? ws[pt].aliveCost : 0), best: prevBest, rank, board };
  }

  /** Game.results(): merges funnyStats, lessons, the MVP's last words and the mode blocks into the base results (cached per battle). */
  M.decorateResults = function decorateResults(base) {
    if (!base || !M.active || !M.world || M.world.state !== 'ended') return base;
    M.finish();
    if (!M.res) return base;
    // the sim keeps ticking corpses, projectiles and effects after battle_end (an arrow in flight can still land): the results are frozen at the first call, which Game
    // makes inside the battle_end event, so the Results screen, the kill-cam and every later results() call agree with the BattleSummary
    const fz = M.res.frozen || (M.res.frozen = { winner: base.winner, reason: base.reason, time: base.time, teams: JSON.parse(JSON.stringify(base.teams || [])), mvp: base.mvp ? JSON.parse(JSON.stringify(base.mvp)) : null });
    base.winner = fz.winner; base.reason = fz.reason; base.time = fz.time; base.teams = JSON.parse(JSON.stringify(fz.teams)); base.mvp = fz.mvp ? JSON.parse(JSON.stringify(fz.mvp)) : null;
    base.funnyStats = M.res.funnyStats.map((r) => Object.assign({}, r)); base.lessons = M.res.lessons.map((l) => Object.assign({}, l));
    base.summary = M.res.summary; base.achievements = M.res.achievements; base.canKillcam = !!M.qualKill;          // the Results button is hidden when no hero / boss / streak kill happened (spec ui.md §4)
    if (base.mvp && !base.mvp.quote) { const q = pickDeath(base.mvp.defId, new RNG(((M.world.seed | 0) ^ 0x3c6ef372) >>> 0)); if (q) base.mvp.quote = q; }
    if (M.res.survival) base.survival = M.res.survival; if (M.res.daily) base.daily = M.res.daily;
    if (M.res.mission) { const x = M.res.mission; base.kind = x.kind; base.mission = Object.assign({}, x.mission); base.stars = x.stars.map((o) => Object.assign({}, o)); base.rewards = x.rewards ? JSON.parse(JSON.stringify(x.rewards)) : null; base.canNext = x.canNext; }
    return base;
  };

  /** Game.hud(): the fields the HUD reads that Game does not know about. */
  M.decorateHud = function decorateHud(hud) {
    if (!hud) return hud;
    hud.teaching = M.teaching.hud();
    hud.aim = M.aim.id;
    const u = M.world && M.world.possession ? M.world.possession.current : null;
    hud.possess = u && game.possessId ? {
      id: u.id, name: u.name || (u.def && u.def.name) || 'Your soldier', hp: Math.max(0, Math.round(u.hp)), hpMax: Math.round(u.hpMax),
      abilities: (u.abil || []).filter((a) => a.impl && a.impl.cast && !a.p.passive && a.p.effect !== 'panic_cav').slice(0, 3).map((a, i) => ({ id: a.p.id, name: a.p.name || pretty(a.p.id), key: i + 1, cd: Math.max(0, a.cd), cdMax: a.p.cd || 0, ready: a.cd <= 0 })),
    } : null;
    return hud;
  };

  // ------------------------------------------------------------------ UI-side events and campaign
  /** 'arena_saved' | 'soldier_saved' | 'arena_played' | 'campaign' (+ payload) from the UI/editors. Returns the ids unlocked. */
  M.ui = function ui(kind, payload) { const ev = stats.ui(kind, payload); return ev ? M.achievements.check(ev) : []; };
  /** The campaign module reports a finished mission: stars into vw.progress and the lifetime stats, then the 'campaign' achievements. */
  M.recordCampaign = function recordCampaign(missionId, stars, completed) {
    if (MISSION_ORDER.indexOf(missionId) < 0) return [];
    const s = clamp(Math.round(+stars) || 0, 0, 3), cur = docs.progress.get('stars', {}) || {};
    if (s > (cur[missionId] | 0)) { cur[missionId] = s; docs.progress.set('stars', cur); }
    return M.ui('campaign', { mission: missionId, stars: s, completed });
  };
  M.debug = () => ({ active: M.active, finished: M.finished, pt: M.pt, unlockedNow: M.battleUnlocked.slice(), toasts: M.toastQ.length, announcer: announcer.debug(), logged: M.log.length, teaching: M.teaching.log.slice(), possessSent: M.possess.sent });
  return M;
}
