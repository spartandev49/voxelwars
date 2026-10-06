// Music director: moods menu/editor/battle(theme)/victory/defeat/comedy, one track per battle chosen by arena theme + shuffle,
// intensity (0..1) -> low-pass 1.8k..18k + gain -6..0 dB smoothed 1.5 s, loop handling (loopStart/loopEnd, or equal-power cross-fade
// loop starting 3 s before the end), 1.5 s mood cross-fades, decode only current + next track, synthesized fallback bed.
// Pure maths (intensity mapping, track choice, intensity-from-world) is exported separately for Node tests.
import { clamp, db2lin, ShuffleBag, mulberry32, equalPowerCurve, makeYield, nowMs } from './util.js';
import { renderMusicGen, synthMusicSpecFor, SYNTH_SR } from './synth.js';

export const MOODS = ['menu', 'editor', 'battle', 'victory', 'defeat', 'comedy'];
export const XFADE_MOOD = 1.5;      // seconds, mood <-> mood
export const XFADE_LOOP = 3;        // seconds, equal-power loop seam
export const INTENSITY_TAU = 0.5;   // setTargetAtTime constant: 95% in 1.5 s

/** intensity -> {cutoff Hz (1.8k..18k, log), gainDb (-6..0)} */
export function intensityParams(x) {
  const i = clamp(Number.isFinite(x) ? x : 0, 0, 1);
  return { cutoff: 1800 * Math.pow(10, i), gainDb: -6 + 6 * i };
}
/** pure intensity model: attrition, kill rate, hero events, time -> 0..1 */
export function intensityFromState(s) {
  const attr = clamp(1 - s.aliveFrac, 0, 1);
  const kr = clamp(s.killRate / (0.6 + 0.008 * Math.max(0, s.start)), 0, 1);
  return clamp(0.18 + 0.34 * kr + 0.2 * attr + 0.2 * clamp(s.heroBump, 0, 1) + 0.08 * clamp(s.time / 120, 0, 1), 0, 1);
}
export const MOOD_INTENSITY = { menu: 0.7, editor: 0.62, battle: 0.3, victory: 1, defeat: 0.6, comedy: 0.8 };

/** Event-driven state behind intensityFromWorld: exponential kill rate (kills/s) and a decaying hero bump. */
export class IntensityTracker {
  constructor() { this.reset(); }
  reset() { this.kr = 0; this.t = 0; this.bump = 0; this.bumpT = 0; this.kills = 0; }
  _decay(t) { const dt = Math.max(0, t - this.t); this.kr *= Math.exp(-dt / 6); this.t = t; this.bump *= Math.exp(-Math.max(0, t - this.bumpT) / 10); this.bumpT = t; }
  note(type, p, t) {
    if (type === 'unit_kill') { this._decay(t); this.kr += 1 / 6; this.kills++; }
    else if (type === 'hero_down' || type === 'first_blood' || type === 'big_swing' || type === 'lead_change') { this._decay(t); this.bump = Math.min(1, this.bump + (type === 'hero_down' ? 1 : 0.6)); }
    else if (type === 'kill_streak') { this._decay(t); this.bump = Math.min(1, this.bump + (p.count >= 10 ? 0.8 : 0.4)); }
    else if (type === 'battle_start') this.reset();
  }
  rate(t) { return this.kr * Math.exp(-Math.max(0, t - this.t) / 6); }
  heroBump(t) { return this.bump * Math.exp(-Math.max(0, t - this.bumpT) / 10); }
}

// ---------------------------------------------------------------- track choice
const THEME_STYLE = {
  greek: ['heroic', 'orchestral', 'epic', 'fanfare'], roman: ['heroic', 'orchestral', 'epic', 'fanfare'],
  egypt: ['eastern', 'middle eastern', 'desert', 'exotic', 'dulcimer'], persian: ['eastern', 'middle eastern', 'desert', 'exotic', 'dulcimer'],
  barbarian: ['dark', 'drums', 'war drums', 'tribal', 'percussion', 'somber'], alpine: ['dark', 'drums', 'war drums', 'tribal', 'percussion', 'somber'], styx: ['dark', 'drums', 'war drums', 'tribal', 'percussion', 'somber'],
  mythic: ['choir', 'epic', 'mythic', 'boss', 'driving'], olympus: ['choir', 'epic', 'mythic', 'boss', 'driving'], carthage: ['brass', 'timpani', 'intense', 'military', 'march'],
};
const THEME_ENERGY = { greek: ['mid', 'high'], roman: ['mid', 'high'], egypt: ['low', 'mid'], persian: ['low', 'mid'], barbarian: ['low', 'high'], alpine: ['low'], styx: ['low'], mythic: ['mid'], olympus: ['mid'], carthage: ['high', 'mid'] };
export function normMood(m) {
  m = String(m || '').toLowerCase();
  if (m === 'title' || m === 'main' || m === 'splash') return 'menu';
  if (/^battle/.test(m)) return 'battle';
  return m;
}
/** candidate scoring: explicit theme match > style tags > preferred energy tier; returns candidates sorted best-first */
export function rankTracks(catalog, mood, theme) {
  const cands = catalog.music.filter((e) => e.moods.includes(mood) || e.tagSet.has(mood));
  const style = THEME_STYLE[theme] || [], pref = THEME_ENERGY[theme] || [];
  return cands.map((e) => {
    let s = 0;
    if (e.themes.includes(theme)) s += 3;
    for (const t of style) if (e.tagSet.has(t)) s += 1;
    if (e.energy) { const i = pref.indexOf(e.energy); if (i === 0) s += 1.5; else if (i > 0) s += 0.75; }
    return { e, s };
  }).sort((a, b) => b.s - a.s);
}
/** pick one track: the top-scoring group (within 2.0 of the best) is shuffled through a per-mood bag (no immediate repeat) */
export function pickTrack(catalog, mood, theme, bags, rng) {
  const r = rankTracks(catalog, mood, theme);
  if (!r.length) return null;
  const top = r.filter((x) => x.s >= r[0].s - 2.0).map((x) => x.e);
  const key = mood + ':' + (theme || '');
  let bag = bags.get(key); if (!bag) { bag = new ShuffleBag(top, rng); bags.set(key, bag); } else bag.setItems(top);
  return bag.next();
}

// ---------------------------------------------------------------- loop player (ctx bound)
const CURVE_IN = equalPowerCurve(64, false), CURVE_OUT = equalPowerCurve(64, true);
export class LoopPlayer {
  /** @param {object} o {ctx, buf, out, loop?, loopStart?, loopEnd?, xf?, baked?, gain?} */
  constructor(o) {
    this.ctx = o.ctx; this.buf = o.buf; this.baked = !!o.baked;
    // the cross-fade can never exceed 40% of the track, so a short file still advances (period >= 0.6 * duration) instead of looping forever
    this.xf = Math.min(o.xf || XFADE_LOOP, Math.max(0.02, o.buf.duration * 0.4));
    this.loop = !!o.loop; this.loopStart = o.loopStart; this.loopEnd = o.loopEnd;
    this.g = o.ctx.createGain(); this.g.gain.value = 0; this.g.connect(o.out);
    this.base = o.gain === undefined ? 1 : o.gain;
    this.iters = []; this.next = 0; this.t0 = 0; this.dead = false; this.started = false; this.n = 0;
  }
  get dur() { return this.buf.duration; }
  start(when, fadeIn) {
    const g = this.g.gain;
    g.cancelScheduledValues(when); g.setValueAtTime(0, when);
    if (fadeIn > 0) g.linearRampToValueAtTime(this.base, when + fadeIn); else g.setValueAtTime(this.base, when);
    this.t0 = when; this.started = true;
    if (this.loop) this._single(when);
    else { this.next = when; this._iter(when, false); }
  }
  _single(when) {
    const s = this.ctx.createBufferSource(); s.buffer = this.buf; s.loop = true;
    const ls = this.loopStart || 0, le = this.loopEnd && this.loopEnd > ls ? Math.min(this.loopEnd, this.buf.duration) : this.buf.duration;
    s.loopStart = ls; s.loopEnd = le; s.connect(this.g); s.start(when); this.iters.push({ s, g: null, end: Infinity });
  }
  _iter(when, fade) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.buf;
    const ig = ctx.createGain();
    if (fade) { ig.gain.value = 0; ig.gain.setValueCurveAtTime(CURVE_IN, when, this.xf); } else ig.gain.value = 1;
    s.connect(ig); ig.connect(this.g); s.start(when);
    const end = when + this.buf.duration, it = { s, g: ig, end };
    // the previous iteration leaves with the matching equal-power curve unless its tail is already faded out in the file
    const prev = this.iters[this.iters.length - 1];
    if (prev && fade && !this.baked) prev.g.gain.setValueCurveAtTime(CURVE_OUT, when, this.xf);
    this.iters.push(it); this.n++;
    this.next = end - this.xf;
  }
  /** schedule upcoming loop iterations that start within `ahead` seconds of `now`; returns true if it scheduled any */
  pump(now, ahead = 4) {
    if (this.dead || !this.started || this.loop) return false;
    // drop iterations that have fully played (never ones that are only scheduled for later)
    while (this.iters.length > 2 && this.iters[0].end + 0.2 < now) { const old = this.iters.shift(); try { old.s.disconnect(); old.g && old.g.disconnect(); } catch (e) { /* already gone */ } }
    let any = false;
    // after a long stall the next seam is already in the past: restart a fresh iteration instead of stacking late ones
    if (this.next < now - 0.05) { this.next = now + 0.05; this._iter(this.next, true); any = true; }
    for (let guard = 0; this.next - now < ahead && guard < 24; guard++) { this._iter(this.next, true); any = true; }
    return any;
  }
  setGain(v, when, tau = 0.2) { this.base = v; this.g.gain.setTargetAtTime(v, when, tau); }
  stop(when, fadeOut) {
    if (this.dead) return;
    this.dead = true;
    const g = this.g.gain; g.cancelScheduledValues(when); g.setValueAtTime(g.value === undefined ? this.base : g.value, when);
    g.linearRampToValueAtTime(0, when + Math.max(0.02, fadeOut));
    const end = when + fadeOut + 0.1;
    for (const it of this.iters) { try { it.s.stop(end); } catch (e) { /* not started yet */ } }
    this.endAt = end;
  }
  dispose() { try { this.g.disconnect(); } catch (e) { /* ok */ } for (const it of this.iters) { try { it.s.disconnect(); } catch (e) { /* ok */ } } this.iters.length = 0; }
}

// ---------------------------------------------------------------- director
export class MusicDirector {
  /**
   * deps: {catalog, decode(ab)->Promise<AudioBuffer>, makeStereo(L,R,sr)->AudioBuffer, fetch?, now()->s, rng?, quality?:()=>tier,
   *        makeMono?(Float32Array,sr)->AudioBuffer, setTimeout?, clearTimeout?, yieldFn?, onChange?()}
   */
  constructor(deps) {
    this.d = deps; this.rng = deps.rng || mulberry32(0x5eed);
    this.ctx = null; this.out = null; this.filter = null; this.ig = null;
    this.mood = 'none'; this.theme = ''; this.track = null; this.source = 'none'; this.intensity = 0.3; this.pending = null;
    this.player = null; this.fading = []; this.token = 0; this.bags = new Map(); this.cache = new Map(); this.synthCache = new Map();
    this.tracker = new IntensityTracker(); this.lastTrackId = ''; this.timer = null; this.bridgeMs = deps.bridgeMs === undefined ? 900 : deps.bridgeMs;
    this.world = null; this.startCount = 0; this.synthFlag = false; this.loadErrors = 0; this.history = [];
    this.setT = deps.setTimeout || ((f, ms) => setTimeout(f, ms)); this.clrT = deps.clearTimeout || ((h) => clearTimeout(h));
    this.yieldFn = deps.yieldFn || makeYield(); this.sliceMs = deps.sliceMs === undefined ? 10 : deps.sliceMs;
    this.decodedBytes = 0;
  }
  // ---------------------------------------------------------------- wiring
  /** bind to a live context once it exists (after the first gesture): builds filter -> gain -> out */
  attach(ctx, out) {
    this.ctx = ctx; this.out = out;
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = 0.5;
    this.ig = ctx.createGain();
    this.filter.connect(this.ig); this.ig.connect(out);
    this._applyIntensity(this.intensity, ctx.currentTime, 0.001);
    if (this.pending) { const p = this.pending; this.pending = null; this.setMood(p.mood, p.o); }
    this._arm();
  }
  _now() { return this.d.now ? this.d.now() : (this.ctx ? this.ctx.currentTime : 0); }
  _arm() { if (this.timer || !this.ctx) return; this.timer = this.setT(() => { this.timer = null; this.pump(); this._arm(); }, 1000); if (this.timer && this.timer.unref) this.timer.unref(); }
  /** keep cross-fade loop iterations scheduled (timer in the browser, called explicitly by the offline renderer) */
  pump(until) { if (this.player && this.ctx) this.player.pump(until === undefined ? this._now() : 0, until === undefined ? 4 : until - 0); for (const f of this.fading.slice()) if (f.endAt && this._now() > f.endAt) { f.dispose(); this.fading.splice(this.fading.indexOf(f), 1); } }
  suspendTimers() { if (this.timer) { this.clrT(this.timer); this.timer = null; } }
  resumeTimers() { this._arm(); }

  // ---------------------------------------------------------------- intensity
  _applyIntensity(x, t, tau) {
    const p = intensityParams(x);
    this.filter.frequency.setTargetAtTime(p.cutoff, t, tau);
    this.ig.gain.setTargetAtTime(db2lin(p.gainDb), t, tau);
  }
  setIntensity(x, o) {
    this.intensity = clamp(Number.isFinite(x) ? x : this.intensity, 0, 1);
    if (this.ctx) this._applyIntensity(this.intensity, (o && o.at !== undefined) ? o.at : this._now(), INTENSITY_TAU);
  }
  getIntensity() { return this.intensity; }
  note(type, p, t) { this.tracker.note(type, p, t); }
  /** 0..1 from the world: attrition (alive/start), kills per second, hero events, battle time */
  intensityFromWorld(world, t) {
    const w = world || this.world; if (!w || !w.stats) return this.intensity;
    const s0 = w.stats[0] || {}, s1 = w.stats[1] || {};
    const start = (s0.startCount || 0) + (s1.startCount || 0), alive = (s0.alive || 0) + (s1.alive || 0);
    const now = t === undefined ? this._now() : t;
    return intensityFromState({ aliveFrac: start ? alive / start : 1, start, killRate: this.tracker.rate(now), heroBump: this.tracker.heroBump(now), time: w.time || 0 });
  }

  // ---------------------------------------------------------------- moods
  getState() { return { track: this.track, mood: this.mood, theme: this.theme, intensity: this.intensity, source: this.source, synth: this.source === 'synth' }; }
  stop(fade = 1) { this.token++; this.mood = 'none'; this.track = null; this.source = 'none'; this.pending = null; if (this.ctx) this._retire(fade); }
  setMood(mood, o = {}) {
    mood = normMood(mood);
    if (mood === 'none' || mood === '') { this.stop(o.fade === undefined ? 1.2 : o.fade); return; }
    if (!MOODS.includes(mood)) return;
    const theme = String(o.theme || this.theme || '').toLowerCase();
    if (!this.ctx) { this.pending = { mood, o }; this.mood = mood; this.theme = theme; this.prefetch(mood, theme); return; }
    if (mood === this.mood && (mood !== 'battle' || theme === this.theme) && this.player && !o.force) return;
    this.mood = mood; this.theme = theme;
    const token = ++this.token;
    if (o.intensity !== undefined) this.setIntensity(o.intensity);
    else if (mood !== 'battle') this.setIntensity(MOOD_INTENSITY[mood]);
    else if (this.intensity > 0.75 || this.intensity < 0.2) this.setIntensity(MOOD_INTENSITY.battle);
    this._enter(token, mood, theme, o).catch(() => { this.loadErrors++; });
  }
  /** pick the track that WOULD play for (mood, theme) without side effects other than the bag advancing */
  choose(mood, theme) { return pickTrack(this.d.catalog, normMood(mood), theme, this.bags, this.rng); }
  async _enter(token, mood, theme, o) {
    let entry = o.entry || this.choose(mood, theme);
    let bridged = false, bridgeT = null;
    const startSynth = async () => {
      const res = await this._synthBed(mood, theme);
      if (!res || token !== this.token) return false;
      this._crossTo({ buf: res, loop: true, baked: false, gain: 1 }, token, 'synth', 'synth:' + mood, o);
      bridged = true; return true;
    };
    if (!entry) { await startSynth(); this.d.onChange && this.d.onChange(); return; }
    // bridge: if the real track is slow (fetch/decode), start the synthesized bed so the menu is never silent
    if (!this.cache.has(entry.id) && this.bridgeMs >= 0) bridgeT = this.setT(() => { if (token === this.token && !this.player) startSynth(); }, this.bridgeMs);
    let buf = null;
    try { buf = await this._load(entry); } catch (e) { buf = null; this.loadErrors++; }
    if (bridgeT) this.clrT(bridgeT);
    if (token !== this.token) return;
    if (!buf) { if (!bridged && !this.player) await startSynth(); this.d.onChange && this.d.onChange(); return; }
    const looped = entry.loop && entry.loopStart !== undefined ? true : !!entry.loop;
    const via = this.cache.get(entry.id) ? this.cache.get(entry.id).via : 'fetched';
    this._crossTo({ buf, loop: looped, loopStart: entry.loopStart, loopEnd: entry.loopEnd, baked: entry.bakedFade, gain: db2lin(entry.gainDb || 0) }, token, via, entry.id, o);
    this._evictCache(entry.id);
    this.d.onChange && this.d.onChange();
  }
  _crossTo(spec, token, source, trackId, o) {
    if (token !== this.token) return;
    const ctx = this.ctx, t = (o && o.at !== undefined) ? o.at : this._now(), fade = o && o.fade !== undefined ? o.fade : XFADE_MOOD;
    const old = this.player;
    const p = new LoopPlayer({ ctx, buf: spec.buf, out: this.filter, loop: spec.loop, loopStart: spec.loopStart, loopEnd: spec.loopEnd, baked: spec.baked, gain: spec.gain });
    p.start(t, old ? fade : Math.min(fade, 1.0));
    this.player = p; this.track = trackId; this.source = source; this.synthFlag = source === 'synth'; this.lastTrackId = trackId;
    this.history.push(trackId); if (this.history.length > 20) this.history.shift();
    if (old) this._retire(fade, t, old);
    this.pump();
  }
  _retire(fade, t, which) {
    const ctx = this.ctx, w = which || this.player; if (!w) return;
    if (!which) this.player = null;
    w.stop(t === undefined ? ctx.currentTime : t, fade); this.fading.push(w);
  }
  // ---------------------------------------------------------------- loading
  async _load(entry) {
    const hit = this.cache.get(entry.id); if (hit) { hit.last = ++this.cacheTick || (this.cacheTick = 1); return hit.buf; }
    let ab = null, via = 'fetched';
    const emb = this.d.core && this.d.core[entry.id];
    if (emb) { try { const bin = (typeof atob === 'function' ? atob : (x) => Buffer.from(x, 'base64').toString('binary'))(String(emb).replace(/^data:[^,]*,/, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); ab = u.buffer; via = 'embedded'; } catch (e) { ab = null; } }
    if (!ab && !this.d.fetch) throw new Error('no fetch');
    for (let a = 0; a < 2 && !ab; a++) {
      try { const r = await this.d.fetch(entry.url); if (!r.ok) { const er = new Error('http ' + r.status); er.permanent = r.status === 404 || r.status === 403 || r.status === 410; throw er; } ab = await r.arrayBuffer(); }
      catch (e) { if (a === 1 || e.permanent) throw e; await new Promise((r) => this.setT(r, this.d.retryMs === undefined ? 400 : this.d.retryMs)); }
    }
    let buf = await this.d.decode(ab);
    const tier = this.d.quality ? this.d.quality() : 'marble';
    if (buf.numberOfChannels > 1 && (tier === 'potato' || tier === 'papyrus') && this.d.makeMono) {
      // halve decoded memory on the low tiers: downmix to mono
      const n = buf.length, a = buf.getChannelData(0), b = buf.getChannelData(1), m = new Float32Array(n);
      for (let i = 0; i < n; i++) m[i] = (a[i] + b[i]) * 0.5;
      buf = this.d.makeMono(m, buf.sampleRate);
    }
    this.cacheTick = (this.cacheTick || 0) + 1;
    this.cache.set(entry.id, { buf, last: this.cacheTick, bytes: buf.length * buf.numberOfChannels * 4, via });
    this._recount();
    return buf;
  }
  _recount() { let b = 0; for (const v of this.cache.values()) b += v.bytes; this.decodedBytes = b; }
  /** keep only the playing track and (at most) one other decoded: spec "current + next" */
  _evictCache(keepId) {
    if (this.cache.size <= 2) return;
    const arr = [...this.cache.entries()].filter(([id]) => id !== keepId).sort((a, b) => a[1].last - b[1].last);
    while (this.cache.size > 2 && arr.length) this.cache.delete(arr.shift()[0]);
    this._recount();
  }
  /** decode the track that would play for (mood, theme) ahead of time (pre-gesture menu track, next battle track) */
  async prefetch(mood, theme) {
    const e = this.choose(mood, theme); if (!e) return null;
    try { await this._load(e); this._evictCache(e.id); } catch (err) { this.loadErrors++; }
    return e;
  }
  async _synthBed(mood, theme) {
    const key = synthMusicSpecFor(mood, theme) && (mood + ':' + (mood === 'battle' ? theme : ''));
    if (this.synthCache.has(key)) return this.synthCache.get(key);
    const g = renderMusicGen(mood, theme, SYNTH_SR); let r;
    // render in slices: the generator yields often, the main thread is only given back after ~10 ms of work (fast to first sound, never a long task)
    let t0 = nowMs();
    for (;;) { r = g.next(); if (r.done) break; if (nowMs() - t0 >= this.sliceMs) { await this.yieldFn(); t0 = nowMs(); } }
    const buf = this.d.makeStereo(r.value.L, r.value.R, r.value.sr);
    this.synthCache.set(key, buf);
    return buf;
  }
}
