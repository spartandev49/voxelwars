// Audio engine: lazy AudioContext + gesture unlock, the bus graph (music/sfx/ui/announcer/ambience -> compressor -> limiter ->
// soft clip -> master), per-voice gain/low-pass/pan, 32-voice budget with priority stealing, per-family cooldown/maxVoices,
// pitch jitter, distance attenuation + far low-pass relative to the listener, ducking, per-bus volumes, sim event routing,
// diagnostics and the window.__vw.audio metrics block. Browser APIs are only touched through `env`, so the whole thing runs
// against a mock AudioContext in Node and against an OfflineAudioContext in tools/mixtest.mjs.
import { Catalog } from './manifest.js';
import { CUES, UI_CUES, createRouter, arenaInfo } from './cues.js';
import { SfxBank } from './sfx.js';
import { MusicDirector, LoopPlayer } from './music.js';
import { VoiceManager } from './voices.js';
import { Listener, spatialize } from './spatial.js';
import { clamp, db2lin, mulberry32 } from './util.js';
import { installGate, silentWavDataUri, isIOSLike } from './unlock.js';
import { Speech } from './speech.js';
import { STAT_TABLE } from '../content/era_ancient/stats.js';

export const BUSES = ['music', 'sfx', 'ui', 'announcer', 'ambience'];
const BUS_TRIM = { music: 0.85, sfx: 0.85, ui: 0.9, announcer: 1.0, ambience: 0.8 };   // balance from tools/mixtest.mjs --stems: music alone was -28.7 LUFS vs sfx -18.0 (too far under)
const VOL_DEFAULT = { master: 0.85, music: 0.7, sfx: 0.9, ui: 0.8, announcer: 0.9, ambience: 1 };
export const MIX = { compThreshold: -16, compKnee: 10, compRatio: 5, compAttack: 0.003, compRelease: 0.2, limThreshold: -3, limKnee: 0, limRatio: 20, limAttack: 0.001, limRelease: 0.08, clipCeil: 0.84, clipKnee: 0.6, preGain: 0.631, outTrim: 0.708 };   // preGain: before the compressor; outTrim: linear gain after the soft clip (calibrated by tools/mixtest.mjs)

function softClipCurve(n, knee, ceil) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    const y = a <= knee ? a : knee + (ceil - knee) * Math.tanh((a - knee) / (ceil - knee));
    c[i] = x < 0 ? -y : y;
  }
  return c;
}

export class AudioEngine {
  /**
   * @param {object} o {settings?:{get(key), on?(fn)}, getListener?:()=>({x,y,z,yaw}), quality?:()=>tier, env?:{AudioContext, OfflineAudioContext, fetch,
   *   window, document, navigator, rng, manifest, coreAudio, offlineCtx, makeBuffer, yieldFn, setInterval, clearInterval, setTimeout, clearTimeout}}
   */
  constructor(o = {}) {
    const env = o.env || {};
    this.env = env;
    const win = env.window !== undefined ? env.window : (typeof window !== 'undefined' ? window : null);
    this.win = win; this.doc = env.document !== undefined ? env.document : (typeof document !== 'undefined' ? document : null);
    this.nav = env.navigator !== undefined ? env.navigator : (typeof navigator !== 'undefined' ? navigator : null);
    this.AC = env.AudioContext !== undefined ? env.AudioContext : (win ? (win.AudioContext || win.webkitAudioContext) : null) || null;
    this.OAC = env.OfflineAudioContext !== undefined ? env.OfflineAudioContext : (win ? (win.OfflineAudioContext || win.webkitOfflineAudioContext) : null) || null;
    this.fetchFn = env.fetch !== undefined ? env.fetch : (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.settings = o.settings || null; this.getListener = o.getListener || null; this.qualityFn = o.quality || (() => 'marble');
    this.rng = env.rng || mulberry32((Math.random() * 4294967296) >>> 0);
    this.setInt = env.setInterval || ((f, ms) => setInterval(f, ms)); this.clrInt = env.clearInterval || ((h) => clearInterval(h));
    this.setTmo = env.setTimeout || ((f, ms) => setTimeout(f, ms)); this.clrTmo = env.clearTimeout || ((h) => clearTimeout(h));
    const manifest = env.manifest !== undefined ? env.manifest : (win && win.__VW_MANIFEST__) || null;
    this.core = env.coreAudio !== undefined ? env.coreAudio : (win && win.__VW_CORE_AUDIO__) || {};
    const published = env.publishedFiles !== undefined ? env.publishedFiles : (win && win.__VW_FILES__) || null;
    this.catalog = new Catalog(manifest, published);
    this.listener = new Listener(); this._lt = -1e9; this._sp = { dist: 0, gain: 1, pan: 0, cutoff: 18000, near: 1, cull: false };
    this.ctx = null; this.offline = false; this.unlocked = false; this.unlocking = false; this.hidden = false; this.muted = false;
    this.buses = null; this.masterIn = null; this.masterGain = null; this.masterAn = null; this.reverb = null; this.hasPanner = false;
    this.vol = Object.assign({}, VOL_DEFAULT);
    this.vm = new VoiceManager(32, (h) => this._stopVoice(h));
    this.cueCounts = Object.create(null);
    this.dropped = { locked: 0, muted: 0, culled: 0, unknown: 0, pending: 0, thin: 0 };
    this.loops = new Map(); this.errors = []; this.ev = Object.create(null);
    this.router = null; this.unsub = null; this.world = null; this.arena = null; this.arenaFn = null; this.timer = null; this._n = 0; this.playerTeam = null;
    this.nextThunder = 0; this.hook = null; this.gateOff = null; this.visHandlers = null; this.tier = 'marble';
    this.bank = new SfxBank({
      catalog: this.catalog, core: this.core, fetch: this.fetchFn, quality: () => this.tier, rng: this.rng, yieldFn: env.yieldFn, sleep: env.retryMs === undefined ? undefined : (ms) => new Promise((r) => setTimeout(r, env.retryMs)),
      decode: (ab) => this._decode(ab), makeBuffer: (d, sr) => this._makeBuffer(d, sr),
    });
    this.music = new MusicDirector({
      catalog: this.catalog, fetch: this.fetchFn, core: this.core, rng: this.rng, quality: () => this.tier, now: () => this.now(),
      decode: (ab) => this._decode(ab), makeStereo: (L, R, sr) => this._makeStereo(L, R, sr), makeMono: (d, sr) => this._makeBuffer(d, sr),
      setTimeout: this.setTmo, clearTimeout: this.clrTmo, yieldFn: env.yieldFn, bridgeMs: env.bridgeMs, retryMs: env.retryMs, onChange: () => this._emit('music'),
    });
    this.speech = new Speech({ synth: env.speechSynthesis, Utterance: env.SpeechSynthesisUtterance, duck: (b, db, ms) => this.duck(b, db, ms) });
    this.bank.onChange(() => this._emit('load'));
    this._readSettings(); this._subscribeSettings();
    if (env.offlineCtx) this._adoptOffline(env.offlineCtx);
  }

  // ---------------------------------------------------------------- settings / volumes
  /** READ-ONLY: pull volumes / mute / tts / quality out of settings. Never subscribes (see _subscribeSettings). */
  _readSettings() {
    const s = this.settings; if (!s || typeof s.get !== 'function') return;
    const num = (k, d) => { try { const v = s.get(k); return typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, 1) : d; } catch (e) { return d; } };
    for (const b of ['master', 'music', 'sfx', 'ui', 'announcer']) this.vol[b] = num('vol.' + b, this.vol[b]);
    try { if (typeof s.get('muted') === 'boolean') this.muted = s.get('muted'); if (typeof s.get('tts') === 'boolean') this.speech.setEnabled(s.get('tts')); } catch (e) { /* settings unavailable */ }
    try { const q = this.qualityFn(); if (q && q !== this.tier) this.setQuality(q); } catch (e) { /* default tier */ }
  }
  /** subscribe to settings changes exactly ONCE (called from the constructor); the handler only reads, so it can never re-enter set() */
  _subscribeSettings() {
    const s = this.settings;
    if (this._offSettings || !s || typeof s.on !== 'function') return;
    try { const off = s.on(() => this.applySettings()); this._offSettings = typeof off === 'function' ? off : () => {}; } catch (e) { this._err('settings.on: ' + (e && e.message)); }
  }
  /** re-read volumes / mute / tts / quality from settings (the app may also call setVolume directly) */
  applySettings() {
    this._readSettings();
    this._applyVolumes();
  }
  /** release listeners (tests, hot reload) */
  destroy() {
    this.detach(); if (this._offSettings) { try { this._offSettings(); } catch (e) { /* ignore */ } this._offSettings = null; }
    if (this.gateOff) { this.gateOff(); this.gateOff = null; }
    if (this.timer) { this.clrInt(this.timer); this.timer = null; }
    this.music.suspendTimers();
  }
  _announcerVoice() { try { return !!(this.settings && this.settings.get('announcerVoice')); } catch (e) { return false; } }
  setVolume(bus, v) {
    if (!(bus in this.vol)) return;
    this.vol[bus] = clamp(Number.isFinite(v) ? v : this.vol[bus], 0, 1);
    this._applyVolumes(); this._emit('volume', bus);
  }
  getVolume(bus) { return this.vol[bus] === undefined ? 0 : this.vol[bus]; }
  setMuted(b) { this.muted = !!b; this._applyVolumes(); this._emit('mute'); this._emit('state'); }
  isMuted() { return this.muted; }
  _applyVolumes() {
    if (!this.ctx || !this.buses) return;
    const t = this.now();
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.015);
    for (const b of BUSES) {
      const u = b === 'ambience' ? this.vol.ambience * this.vol.sfx : this.vol[b];
      this.buses[b].vol.gain.setTargetAtTime(u * BUS_TRIM[b], t, 0.02);
    }
  }
  setQuality(tier) { if (!tier || tier === this.tier && this.vm.max === (tier === 'potato' ? 24 : 32)) return; this.tier = tier; this.vm.max = tier === 'potato' ? 24 : 32; this.bank.enforce(); if (this.reverb) this.reverb.ret.gain.value = tier === 'potato' ? 0 : 0.45; }
  setPlayerTeam(t) { this.playerTeam = t; }

  /** audio clock in seconds: the context clock, or a scripted clock (offline renders drive time themselves) */
  now() { return this._clock ? this._clock() : (this.ctx ? this.ctx.currentTime : 0); }
  setClock(fn) { this._clock = fn || null; }

  // ---------------------------------------------------------------- events
  on(evt, fn) { (this.ev[evt] || (this.ev[evt] = [])).push(fn); return () => { const a = this.ev[evt]; const i = a ? a.indexOf(fn) : -1; if (i >= 0) a.splice(i, 1); }; }
  _emit(evt, a) { const l = this.ev[evt]; if (l) for (const f of l.slice()) { try { f(a); } catch (e) { /* subscriber errors never break audio */ } } }
  _err(msg) { if (this.errors.length < 20) this.errors.push(String(msg)); }

  // ---------------------------------------------------------------- context lifecycle
  get available() { return !!(this.AC || this.offline); }
  /** 'unavailable' | 'locked' (no gesture yet) | 'running' | 'suspended' (hidden / interrupted) | 'muted' | 'closed' */
  state() {
    if (!this.available) return 'unavailable';
    if (!this.ctx) return 'locked';
    if (this.ctx.state === 'closed') return 'closed';
    if (!this.offline && this.ctx.state !== 'running') return this.unlocked ? 'suspended' : 'locked';
    return this.muted ? 'muted' : 'running';
  }
  get running() { return !!this.ctx && (this.offline || this.ctx.state === 'running'); }

  /**
   * Create + resume the AudioContext. MUST be called synchronously from inside a user gesture (the gesture gate does this
   * automatically; the splash may also call it). Safe to call repeatedly and when AudioContext does not exist.
   */
  unlock() {
    if (!this.AC) return Promise.resolve(false);
    if (this.offline) return Promise.resolve(true);
    try {
      if (!this.ctx) this._createContext();
      if (!this.ctx) return Promise.resolve(false);
      this.unlocking = true; this._unlockT = this.setTmo(() => { this.unlocking = false; }, 1500); if (this._unlockT && this._unlockT.unref) this._unlockT.unref();
      const p = this.ctx.resume();
      this._iosUnlock();
      return Promise.resolve(p).then(() => { this.unlocking = false; if (this.ctx.state === 'running') this._onRunning(); return this.running; }, (e) => { this.unlocking = false; this._err('resume: ' + (e && e.message)); return false; });
    } catch (e) { this.unlocking = false; this._err('unlock: ' + (e && e.message)); return Promise.resolve(false); }
  }
  _iosUnlock() {
    if (this._ios || !this.nav || !this.win) return;
    if (!(this.env.forceIosUnlock || isIOSLike(this.nav))) return;
    this._ios = true;
    try { const a = new this.win.Audio(); a.src = silentWavDataUri(); a.setAttribute && a.setAttribute('playsinline', ''); const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* silent-switch unlock is best effort */ }
  }
  _createContext() {
    let ctx = null;
    try { ctx = new this.AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new this.AC(); } catch (e2) { this._err('AudioContext: ' + (e2 && e2.message)); return; } }
    this._bindContext(ctx);
    ctx.onstatechange = () => { this._emit('state'); if (ctx.state === 'running' && this.unlocked === false) this._onRunning(); else if (ctx.state === 'interrupted') this._armGate(); };
  }
  _adoptOffline(ctx) { this.offline = true; this.unlocked = true; this._bindContext(ctx); }
  _bindContext(ctx) {
    this.ctx = ctx; this.hasPanner = typeof ctx.createStereoPanner === 'function';
    this._buildGraph();
    this.music.attach(ctx, this.buses.music.in);
    this._applyVolumes();
    this._installVisibility();
  }
  _onRunning() {
    if (this.unlocked && this._warmed) { this._emit('state'); return; }
    this.unlocked = true; this._emit('state');
    this._warm();
    if (this.router && this.arenaInfo) this._startAmbience();
    this._startTimer();
  }
  _warm() {
    this._warmed = true;
    this.preload();                                         // embedded core first (idempotent; usually already done before the gesture)
    const t = this.tier;
    this.bank.warm(t === 'potato' ? ['ui', 'combat'] : t === 'papyrus' ? ['ui', 'combat', 'voice'] : ['ui', 'combat', 'voice', 'siege', 'misc']);
  }
  /** pre-gesture work: decode embedded core assets with an offline decoder and fetch/prefetch the likely first assets */
  preload() {
    if (this._preloaded) return this._preloaded;
    this._readSettings();
    this._preloaded = (async () => {
      try { await this.bank.loadCore(); } catch (e) { this._err('core: ' + (e && e.message)); }
      try { this.bank.warm(['ui']); } catch (e) { this._err('warm: ' + (e && e.message)); }
      // the first music of the game is the menu bed: have it decoded before the first gesture so the title screen is never silent
      try { await this.music.prefetch(this.music.mood !== 'none' ? this.music.mood : 'menu', this.music.theme); } catch (e) { /* music prefetch is optional */ }
    })();
    return this._preloaded;
  }
  /** wire everything the page needs: gesture gate, visibility, test hook, background preload (never blocks first render) */
  boot() {
    if (this._booted) return this; this._booted = true;
    if (this.win && !this.offline) this._armGate();
    if (this.win && this.win.__vw) this.installTestHook(this.win.__vw);
    this.setTmo(() => { this.preload(); }, 30);
    return this;
  }
  _armGate() {
    if (this.gateOff || !this.win) return;
    this.gateOff = installGate(this.win, () => this.unlock(), () => this.running, () => { this.gateOff = null; });   // re-armed if Safari later reports 'interrupted'
  }
  _installVisibility() {
    if (this.visHandlers || this.offline || !this.win) return;
    const d = this.doc, w = this.win, self = this;
    const onVis = () => { if (d && d.hidden) self._hide(); else self._show(); };
    const onFocus = () => { if (!(d && d.hidden)) self._show(); };
    if (d && d.addEventListener) d.addEventListener('visibilitychange', onVis);
    if (w.addEventListener) w.addEventListener('focus', onFocus);
    if (w.addEventListener) w.addEventListener('pagehide', () => self._hide());
    this.visHandlers = { onVis, onFocus };
  }
  _hide() {
    if (this.hidden || !this.ctx) return; this.hidden = true;
    this.stopAll(0.03);
    this.music.suspendTimers(); if (this.timer) { this.clrInt(this.timer); this.timer = null; }
    try { const p = this.ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    this._emit('state');
  }
  _show() {
    if (!this.ctx) return;
    const was = this.hidden; this.hidden = false;
    if (this.unlocked && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      try { const p = this.ctx.resume(); if (p && p.then) p.then(() => this._emit('state'), () => this._armGate()); } catch (e) { this._armGate(); }
    }
    if (was) { this.music.resumeTimers(); this._startTimer(); this._emit('state'); }
  }
  suspend() { this._hide(); }
  resume() { this._show(); }

  // ---------------------------------------------------------------- decoding / buffers (work before and after unlock)
  _decoder() {
    if (this.ctx) return this.ctx;
    if (!this._od) { if (!this.OAC) throw new Error('no AudioContext available for decoding'); this._od = new this.OAC(1, 1, this.tier === 'potato' ? 24000 : 44100); }
    return this._od;
  }
  _decode(ab) { const c = this._decoder(); return new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }
  _makeBuffer(data, sr) {
    if (this.env.makeBuffer) return this.env.makeBuffer(data, sr);
    const c = this._decoder(), b = c.createBuffer(1, data.length, sr); if (b.copyToChannel) b.copyToChannel(data, 0); else b.getChannelData(0).set(data); return b;
  }
  _makeStereo(L, R, sr) {
    if (this.env.makeStereo) return this.env.makeStereo(L, R, sr);
    const c = this._decoder(), b = c.createBuffer(2, L.length, sr);
    if (b.copyToChannel) { b.copyToChannel(L, 0); b.copyToChannel(R, 1); } else { b.getChannelData(0).set(L); b.getChannelData(1).set(R); }
    return b;
  }

  // ---------------------------------------------------------------- graph
  _buildGraph() {
    const ctx = this.ctx, M = MIX;
    const masterIn = ctx.createGain(); masterIn.gain.value = M.preGain;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = M.compThreshold; comp.knee.value = M.compKnee; comp.ratio.value = M.compRatio; comp.attack.value = M.compAttack; comp.release.value = M.compRelease;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = M.limThreshold; lim.knee.value = M.limKnee; lim.ratio.value = M.limRatio; lim.attack.value = M.limAttack; lim.release.value = M.limRelease;
    const clip = ctx.createWaveShaper(); clip.curve = softClipCurve(2049, M.clipKnee, M.clipCeil); try { clip.oversample = '4x'; } catch (e) { /* optional */ }
    const mg = ctx.createGain(); mg.gain.value = this.muted ? 0 : this.vol.master;
    const trim = ctx.createGain(); trim.gain.value = M.outTrim;
    masterIn.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(trim); trim.connect(mg); mg.connect(ctx.destination);
    const an = ctx.createAnalyser(); an.fftSize = 1024; mg.connect(an);
    this.masterIn = masterIn; this.masterGain = mg; this.masterAn = an; this.comp = comp; this.limiter = lim;
    this.buses = {};
    for (const b of BUSES) {
      const inn = ctx.createGain(), duck = ctx.createGain(), vol = ctx.createGain(), a = ctx.createAnalyser(); a.fftSize = 1024;
      inn.connect(duck); duck.connect(vol); vol.connect(masterIn); vol.connect(a);
      this.buses[b] = { name: b, in: inn, duck, vol, an: a, duckDb: 0, duckUntil: 0, buf: new Float32Array(1024) };
    }
    // the 1.5 s impulse response is generated right after the click handler returns (keeps the gesture task short); sends skip it until then
    this.setTmo(() => { if (this.ctx === ctx && !this.reverb) this._buildReverb(); }, 20);
  }
  _buildReverb() {
    const ctx = this.ctx;
    try {
      const sr = ctx.sampleRate, n = Math.floor(sr * 1.5), ir = ctx.createBuffer(2, n, sr), r = mulberry32(777);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c); let lp = 0;
        for (let i = 0; i < n; i++) { const t = i / sr, k = 0.18 + 0.7 * Math.exp(-t / 0.5); lp += ((r() * 2 - 1) - lp) * k; d[i] = lp * Math.exp(-t / 0.33) * (i < 80 ? i / 80 : 1); }
      }
      const conv = ctx.createConvolver(); conv.buffer = ir; conv.normalize = true;
      const send = ctx.createGain(), ret = ctx.createGain(); ret.gain.value = this.tier === 'potato' ? 0 : 0.45;
      send.connect(conv); conv.connect(ret); ret.connect(this.masterIn);
      this.reverb = { in: send, ret };
    } catch (e) { this.reverb = null; this._err('reverb: ' + (e && e.message)); }
  }

  // ---------------------------------------------------------------- ducking
  /** duck `bus` by `db` for `ms` (attack 20 ms; after the hold the gain is back above 97 % within ~250 ms, so a 400 ms duck is over within 800 ms): audio.duck('music', -6, 400) */
  duck(bus, db = -6, ms = 400) {
    if (!this.ctx || !this.buses) return;
    const b = this.buses[bus]; if (!b) return;
    const t = this.now(), until = t + ms / 1000;
    const target = Math.min(db, b.duckUntil > t ? b.duckDb : 0);
    b.duckDb = target; b.duckUntil = Math.max(b.duckUntil, until);
    const g = b.duck.gain; g.cancelScheduledValues(t); g.setTargetAtTime(db2lin(target), t, 0.02); g.setTargetAtTime(1, b.duckUntil, 0.07);
  }

  // ---------------------------------------------------------------- listener
  setListener(x, y, z, yaw) { this.listener.set(x, y, z, yaw); }
  _refreshListener(t) {
    const g = this.getListener; if (!g) return;
    if (t - this._lt < 0.03) return; this._lt = t;
    try { const l = g(); if (l) this.listener.set(l.x, l.y, l.z, l.yaw); } catch (e) { /* camera not ready */ }
  }

  // ---------------------------------------------------------------- playing
  /**
   * Play a cue family. opts: {x,y,z (world position -> spatial), vol, pitch (multiplier), priority, delay (s), at (absolute ctx time, for
   * offline renders)}. Returns the voice handle or null when the cue was dropped (locked, culled, cooldown, budget, no buffer yet).
   */
  play(cue, o) {
    const def = CUES[cue];
    if (!def) { this.dropped.unknown++; return null; }
    const ctx = this.ctx;
    if (!ctx) { this.dropped.locked++; return null; }
    if (this.muted || this.hidden) { this.dropped.muted++; return null; }
    if (!this.offline && ctx.state !== 'running' && !(this.unlocking && def.bus === 'ui')) { this.dropped.locked++; return null; }
    const t0 = o && o.at !== undefined ? o.at : this.now();
    const cdSec = def.cooldownMs * 0.001;
    if (cdSec > 0 && this.vm.inCooldown(cue, t0, cdSec)) { this.vm.drops.cooldown++; return null; }
    const t = t0 + (o && o.delay ? o.delay : 0);
    let sp = null;
    if (def.spatial && o && o.x !== undefined) {
      this._refreshListener(t0);
      sp = spatialize(this.listener, o.x, o.y, o.z, def.ref, def.maxDist, this._sp);
      if (sp.cull) { this.dropped.culled++; return null; }
    }
    const load = this.vm.v.length / this.vm.budget;
    if (sp && load > 0.65 && sp.near < 0.4 && this.rng() < (load - 0.6) * 1.6) { this.dropped.thin++; return null; }   // thin out far sounds under load
    let prio = o && o.priority !== undefined ? o.priority : def.priority;
    if (sp) prio *= 0.2 + 0.8 * sp.near;
    const layers = def.layers; let main = null;
    if (!layers || !this._anyReal(cue)) {
      const pk = this.bank.pick(cue, -1, def.bus === 'ui');
      if (!pk) { this.dropped.pending++; return null; }
      main = this._startVoice(def, cue, 0, null, pk, t, prio, sp, o, null);
    } else {
      for (let li = 0; li < layers.length; li++) {
        const ly = layers[li];
        if (ly.prob < 1 && this.rng() > ly.prob) continue;
        if (!this.bank.slot(cue, li).entries.length) continue;
        const pk = this.bank.pick(cue, li, def.bus === 'ui');
        if (!pk) continue;
        const h = this._startVoice(def, cue, li, ly, pk, t, prio, sp, o, main);
        if (!main) { if (!h) return null; main = h; }
      }
      if (!main) this.dropped.pending++;
    }
    if (main) this.cueCounts[cue] = (this.cueCounts[cue] || 0) + 1;
    return main;
  }
  _anyReal(cue) {
    let v = this._realCache && this._realCache.get(cue);
    if (v === undefined) { if (!this._realCache) this._realCache = new Map(); const r = this.bank.resolve(cue); v = !!r && r.real.length > 0; this._realCache.set(cue, v); }
    return v;
  }
  _startVoice(def, cue, li, ly, pk, t, prio, sp, o, main) {
    const ctx = this.ctx, buf = pk.buf, t0 = o && o.at !== undefined ? o.at : this.now();
    // pitch: layer override, else family range, times caller multiplier
    let lo = def.pitch[0], hi = def.pitch[1];
    if (ly && ly.pitch) { if (typeof ly.pitch === 'number') lo = hi = ly.pitch; else { lo = ly.pitch[0]; hi = ly.pitch[1]; } }
    let rate = (lo + (hi - lo) * this.rng()) * (o && o.pitch ? o.pitch : 1);
    rate = clamp(rate, 0.25, 4);
    const lyDelay = ly && ly.delay ? ly.delay : 0, ts = t + lyDelay;
    const full = buf.duration / rate, cap = def.dur > 0 ? Math.min(full, def.dur) : full;
    const capped = cap < full - 0.001;
    const end = ts + cap + (capped ? 0.14 : 0.03);        // a capped voice rings out through its 35 ms release before the slot is free
    const load = this.vm.v.length / this.vm.budget;
    const cd = def.cooldownMs * 0.001 * (sp ? 1 + (1 - sp.near) : 1);
    const fam = main ? cue + '#' + li : cue;
    const h = main ? this.vm.acquire(fam, prio - 5, t0, end, 0, 99, ts) : this.vm.acquire(fam, prio, t0, end, cd, def.maxVoices, ts);
    if (!h) return null;
    let vol = def.vol * (ly ? ly.vol : 1) * (o && o.vol !== undefined ? o.vol : 1) / (1 + 0.3 * load);
    if (sp) vol *= sp.gain;
    const bus = this.buses[def.bus];
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol; src.connect(g);
    let last = g, lp = null, pan = null, snd = null;
    if (sp && sp.cutoff < 10000) { lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = sp.cutoff; lp.Q.value = 0.5; last.connect(lp); last = lp; }
    if (sp && this.hasPanner && Math.abs(sp.pan) > 0.03) { pan = ctx.createStereoPanner(); pan.pan.value = sp.pan; last.connect(pan); last = pan; }
    last.connect(bus.in);
    if (def.send > 0 && this.reverb && this.tier !== 'potato') { snd = ctx.createGain(); snd.gain.value = def.send * (sp ? 0.5 + 0.5 * (1 - sp.near) : 1); last.connect(snd); snd.connect(this.reverb.in); }
    src.start(ts);
    if (capped) { g.gain.setTargetAtTime(0, ts + cap, 0.035); src.stop(ts + cap + 0.14); }
    h.node = { src, g };
    src.onended = () => { try { src.disconnect(); g.disconnect(); if (lp) lp.disconnect(); if (pan) pan.disconnect(); if (snd) snd.disconnect(); } catch (e) { /* already gone */ } };
    if (def.duck && !main && (!o || o.duck !== false)) this.duck(def.duck.bus, def.duck.db, def.duck.ms);
    return h;
  }
  _stopVoice(h) {
    const n = h.node; if (!n || !this.ctx) return;
    // a stolen voice is released in ~10 ms (3 ms time constant): short enough to be inaudible next to the voice that replaces it
    try { const t = h.stolenAt !== undefined ? h.stolenAt : this.now(); n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.003); n.src.stop(t + 0.012); } catch (e) { /* already stopped */ }
  }
  stopVoice(h) { if (h) { this._stopVoice(h); const i = this.vm.v.indexOf(h); if (i >= 0) { this.vm.v[i] = this.vm.v[this.vm.v.length - 1]; this.vm.v.pop(); } } }
  /** stop every one-shot voice (tab hidden, scene change) */
  stopAll(fade = 0.05) {
    if (!this.ctx) return;
    const t = this.now();
    for (const h of this.vm.v) { const n = h.node; if (n) { try { n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, Math.max(0.005, fade / 4)); n.src.stop(t + fade + 0.05); } catch (e) { /* ok */ } } }
    this.vm.clear();
  }
  /** UI cue helper: audio.ui('click'), audio.ui('place', {mass}) */
  ui(name, o) {
    const cue = UI_CUES[name] || (CUES['ui_' + name] ? 'ui_' + name : null);
    if (!cue) return null;
    const opts = o || {};
    if (name === 'place' && typeof opts.mass === 'number') return this.play(cue, Object.assign({}, opts, { pitch: (opts.pitch || 1) * (1.04 - 0.08 * clamp(Math.log2(opts.mass + 1) / 4, 0, 1)) }));
    return this.play(cue, opts);
  }

  /** foley helper: audio.footstep('grass'|'dirt'|'stone'|'sand'|'snow'|'mud'|'wood'|'water', x, y, z) */
  footstep(material, x, y, z, o) {
    const cue = 'step_' + material; if (!CUES[cue]) return null;
    return this.play(cue, Object.assign({ x, y, z }, o || {}));
  }

  // ---------------------------------------------------------------- loops (ambience beds)
  /** start a looping bed (ambience_*, crowd_loop, fire_loop). Returns true if started. */
  startLoop(cue, o = {}) {
    const def = CUES[cue]; if (!def || !this.ctx || !this.running) return false;
    if (this.loops.has(cue)) return true;
    const pk = this.bank.pick(cue, -1, true); if (!pk) return false;
    const bus = this.buses[def.bus];
    const native = pk.loop || (pk.entry && (pk.entry.loop || /_loop$/.test(pk.entry.id)));
    const gain = def.vol * (o.vol === undefined ? 1 : o.vol);
    const p = new LoopPlayer({ ctx: this.ctx, buf: pk.buf, out: bus.in, loop: !!native, loopStart: pk.entry && pk.entry.loopStart, loopEnd: pk.entry && pk.entry.loopEnd, xf: 2, gain });
    const t = o.at !== undefined ? o.at : this.now();
    p.start(t, o.fadeIn === undefined ? 2.5 : o.fadeIn);
    this.loops.set(cue, { p, def, src: pk.src });
    this.vm.reserved = Math.min(8, this.loops.size);
    if (pk.src === 'synth') this.bank.synthUsed.add(cue);
    return true;
  }
  stopLoop(cue, fade = 2) {
    const l = this.loops.get(cue); if (!l) return;
    l.p.stop(this.now(), fade); this.loops.delete(cue); this.vm.reserved = Math.min(8, this.loops.size);
    this.setTmo(() => l.p.dispose(), (fade + 0.5) * 1000);
  }
  stopLoops(fade = 2) { for (const k of [...this.loops.keys()]) this.stopLoop(k, fade); }
  setLoopLevel(cue, v, tau = 0.5) { const l = this.loops.get(cue); if (l) l.p.setGain(l.def.vol * v, this.now(), tau); }

  // ---------------------------------------------------------------- sim integration
  /**
   * Subscribe to the sim event bus: audio.attach(world.events, {arena, world, defs, getCamera, getListener}) (an options object) or the
   * legacy audio.attach(bus, getCamera, getArena). Returns detach().
   */
  attach(bus, a, b) {
    this.detach();
    if (!bus) return () => {};
    let opt = {};
    if (typeof a === 'function') { opt.getCamera = a; if (typeof b === 'function') opt.getArena = b; else if (b) opt.arena = b; } else if (a && typeof a === 'object') opt = a;
    this.world = opt.world || null;
    this.arenaFn = opt.getArena || null; this.arena = opt.arena || (this.arenaFn ? this.arenaFn() : null) || (this.world && this.world.arena) || null;
    this.arenaInfo = arenaInfo(this.arena); this.music.theme = this.arenaInfo.theme;   // a later setMood('battle') picks the track for this arena
    if (opt.getListener) this.getListener = opt.getListener;
    else if (opt.getCamera && !this.getListener) this.getListener = () => listenerFromCamera(opt.getCamera());
    const defs = opt.defs || (this.world && this.world.defs) || STAT_TABLE;
    const self = this;
    this.router = createRouter({
      play: (cue, x, y, z, po) => { if (po === undefined) po = {}; if (x !== undefined) { po.x = x; po.y = y; po.z = z; } return this.play(cue, po); },
      duck: (bus2, db, ms) => this.duck(bus2, db, ms), now: () => this.now(), rng: this.rng,
      listener: () => { if (this.getListener) this._refreshListener(this.now()); return this.listener; },
      defs, world: this.world, arena: this.arenaInfo, get playerTeam() { return self.playerTeam; }, announcerVoice: () => this._announcerVoice(),
      groundY: this.arena && this.arena.cellHeight ? (x, z) => this.arena.cellHeight(x, z) : null,
      hooks: { battleStart: () => this._onBattleStart(), battleEnd: (w, lost) => this._onBattleEnd(w, lost), note: (ty, p, t) => this.music.note(ty, p, t) },
    });
    const r = this.router;
    if (typeof bus.onAny === 'function') this.unsub = bus.onAny((type, p) => r.handle(type, p));
    else if (typeof bus.on === 'function') {
      const offs = []; for (const t of ['prop_spawned', 'unit_hit', 'unit_block', 'unit_kill', 'projectile_launch', 'projectile_hit', 'battle_start', 'battle_end', 'battle_countdown', 'explosion', 'crater', 'prop_destroyed', 'prop_damaged', 'god_power', 'ability_cast', 'first_blood', 'hero_down', 'lead_change', 'kill_streak', 'big_swing', 'army_low', 'chicken_tantrum', 'trojan_reveal', 'throne_sit', 'philosopher_monologue', 'stone_gaze', 'intervention', 'stalemate_warning', 'wave_spawn', 'lightning_arc', 'catapult_misfire', 'cyclops_misaim', 'friendly_fire', 'unit_convert', 'unit_revive', 'unit_heal', 'unit_rally', 'status_apply', 'trample', 'charge_hit', 'unit_brace', 'bark', 'unit_spawn']) offs.push(bus.on(t, (p) => r.handle(t, p)));
      this.unsub = () => { for (const f of offs) if (typeof f === 'function') f(); };
    }
    this._startTimer();
    if (this.running && this.arenaInfo) this._startAmbience();
    return () => this.detach();
  }
  detach() {
    if (this.unsub) { try { this.unsub(); } catch (e) { /* bus gone */ } this.unsub = null; }
    if (this.router) { this.router = null; if (this.ctx && this.loops.size) this.stopLoops(1.5); }
    this.world = null;
  }
  _comedyBattle() {
    const w = this.world; if (!w || !w.units || !w.units.length) return false;
    let n = 0; for (const u of w.units) { const id = u.def && u.def.id; if (id === 'sacred_chicken' || id === 'battle_goat') n++; }
    return n / w.units.length >= 0.5 || !!(w.rules && w.rules.mutators && w.rules.mutators.includes && (w.rules.mutators.includes('chaos') || w.rules.mutators.includes('chicken_rain')));
  }
  _onBattleStart() {
    const info = this.arenaInfo || arenaInfo(null);
    this.music.tracker.reset();
    // one track per battle: if the placement screen already runs this battle's mood/theme the track simply keeps playing
    this.music.setMood(this._comedyBattle() ? 'comedy' : 'battle', { theme: info.theme });
    this._startAmbience();
    this.nextThunder = this.now() + 6 + this.rng() * 10;
  }
  _onBattleEnd(winner, lost) {
    this.music.setMood(winner === -1 ? 'comedy' : lost ? 'defeat' : 'victory', { force: true });
    this.stopLoops(2.5);
  }
  _startAmbience() {
    const info = this.arenaInfo; if (!info || !this.running) return;
    for (const cue of info.ambience) {
      const scale = cue === 'amb_wind' ? 0.35 + 0.65 * info.wind : 1;
      if (!this.startLoop(cue, { vol: scale })) this.setTmo(() => { if (this.router && this.running) this.startLoop(cue, { vol: scale }); }, 1200);
    }
    if (info.rain && !this.loops.has('amb_water')) this.startLoop('amb_water', { vol: 0.7 });
  }
  _startTimer() {
    if (this.timer || this.offline || !this.ctx || this.hidden) return;
    this.timer = this.setInt(() => this._tick(), 250); if (this.timer && this.timer.unref) this.timer.unref();
  }
  _tick() {
    if (!this.running) return;
    this._n++;
    const r = this.router;
    if (r && this.world) {
      r.tick(0.25);
      if (this.music.mood === 'battle' || this.music.mood === 'comedy') this.music.setIntensity(this.music.intensityFromWorld(this.world));
      const info = this.arenaInfo, t = this.now();
      if (info && info.storm && t > this.nextThunder && this.world.state === 'running') { this.nextThunder = t + 9 + this.rng() * 16; this.play('thunder_crack', { vol: 0.45, pitch: 0.8 + this.rng() * 0.3 }); }
      if (this.loops.has('crowd_loop')) this.setLoopLevel('crowd_loop', 0.6 + 0.8 * this.music.intensity, 1.0);
    }
    if ((this._n & 3) === 0) { this.music.pump(); for (const l of this.loops.values()) l.p.pump(this.now(), 4); }
  }

  // ---------------------------------------------------------------- diagnostics
  _rms(an, buf) {
    if (!an || !this.running) return 0;
    try { an.getFloatTimeDomainData(buf); } catch (e) { return 0; }
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }
  masterRMS() { return this._rms(this.masterAn, this._mbuf || (this._mbuf = new Float32Array(1024))); }
  busRMS() { const o = {}; if (!this.buses) { for (const b of BUSES) o[b] = 0; return o; } for (const b of BUSES) o[b] = this._rms(this.buses[b].an, this.buses[b].buf); return o; }
  loaded() { const s = this.bank.stats(); const ms = this.music.source; return { embedded: s.embedded + (ms === 'embedded' ? 1 : 0), fetched: s.fetched + (ms === 'fetched' ? 1 : 0), synth: s.synth + (ms === 'synth' ? 1 : 0), failed: s.failed + this.music.loadErrors }; }
  diagnostics() {
    const ctx = this.ctx, s = this.bank.stats(), t = this.now();
    let mp3 = null; try { mp3 = this.doc && this.doc.createElement ? !!this.doc.createElement('audio').canPlayType('audio/mpeg') : null; } catch (e) { mp3 = null; }
    return {
      state: this.state(), ctxState: ctx ? ctx.state : 'none', available: this.available, sampleRate: ctx ? ctx.sampleRate : 0, baseLatency: ctx ? ctx.baseLatency : 0, outputLatency: ctx ? ctx.outputLatency || 0 : 0,
      unlocked: this.unlocked, muted: this.muted, hidden: this.hidden, quality: this.tier,
      voices: this.vm.active(t) + this.loops.size, voiceBudget: this.vm.budget, voicePeak: this.vm.peak, voiceSteals: this.vm.steals, voiceDrops: this.vm.totalDrops(), drops: Object.assign({}, this.vm.drops, this.dropped), loops: this.loops.size,
      loaded: this.loaded(), decoded: { bytes: s.decodedBytes + this.music.decodedBytes, sfxBytes: s.decodedBytes, musicBytes: this.music.decodedBytes, ceiling: s.ceiling, evictions: s.evictions, ready: s.ready, total: s.total, pending: s.loading },
      paths: this.bank.paths(), cueCounts: Object.assign({}, this.cueCounts),
      music: Object.assign(this.music.getState(), { decodedBytes: this.music.decodedBytes, loadErrors: this.music.loadErrors }),
      manifest: { sfx: this.catalog.sfx.length, music: this.catalog.music.length, has: this.catalog.hasManifest, core: Object.keys(this.core).length, notPublished: this.catalog.missing.length, notPublishedIds: this.catalog.missing.slice(0, 20).map((m) => m.id) },
      failedAssets: this.bank.failures(),
      masterRMS: this.masterRMS(), busRMS: this.busRMS(), volumes: Object.assign({}, this.vol), tts: { supported: this.speech.supported, enabled: this.speech.enabled, spoken: this.speech.spoken },
      codecs: { mp3 }, router: this.router ? this.router.stats : null, errors: this.errors.slice(),
    };
  }
  /** fill window.__vw.audio (spec section 6): live getters so tests can poll without calling anything */
  installTestHook(vw) {
    if (!vw) return null;
    const self = this, h = {};
    Object.defineProperties(h, {
      state: { get: () => self.state(), enumerable: true },
      ctxState: { get: () => (self.ctx ? self.ctx.state : 'none'), enumerable: true },
      masterRMS: { get: () => self.masterRMS(), enumerable: true },
      busRMS: { get: () => self.busRMS(), enumerable: true },
      voices: { get: () => self.vm.active(self.now()) + self.loops.size, enumerable: true },
      voicePeak: { get: () => self.vm.peak, enumerable: true },
      voiceDrops: { get: () => self.vm.totalDrops(), enumerable: true },
      loaded: { get: () => self.loaded(), enumerable: true },
      cueCounts: { get: () => Object.assign({}, self.cueCounts), enumerable: true },
      music: { get: () => ({ track: self.music.track, mood: self.music.mood, intensity: self.music.intensity }), enumerable: true },
      diagnostics: { value: () => self.diagnostics(), enumerable: false },
    });
    vw.audio = h; this.hook = h;
    return h;
  }
}

/** Derive a listener {x,y,z,yaw} from a THREE-like camera ({position, matrixWorld.elements | rotation.y | yaw}). */
export function listenerFromCamera(cam) {
  if (!cam) return { x: 0, y: 0, z: 0, yaw: 0 };
  if (typeof cam.x === 'number' && typeof cam.yaw === 'number') return cam;
  const p = cam.position || { x: 0, y: 0, z: 0 };
  let yaw = typeof cam.yaw === 'number' ? cam.yaw : 0;
  const e = cam.matrixWorld && cam.matrixWorld.elements;
  if (e) { const fx = -e[8], fz = -e[10]; if (Math.abs(fx) + Math.abs(fz) > 1e-6) yaw = Math.atan2(fx, fz); }
  else if (cam.rotation && typeof cam.rotation.y === 'number') yaw = cam.rotation.y + Math.PI;
  return { x: p.x, y: p.y, z: p.z, yaw };
}
