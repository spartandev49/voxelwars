// Mock WebAudio for Node tests: a small but real graph (nodes, connections, parameter automation evaluated over time), a gated
// AudioContext that starts "suspended" and resumes only while a synthetic user gesture is active (autoplay policy), fake
// window/document objects and a WAV-backed decodeAudioData + fetch. Used by the engine/bank/music/AU tests.
import { readWav, writeWav, noiseBurst, sine } from './wav.mjs';

export class MockParam {
  constructor(ctx, v) { this.ctx = ctx; this._v = v; this.ev = []; this.defaultValue = v; }
  get value() { return this.valueAt(this.ctx.currentTime); }
  set value(x) { this._v = x; this.ev = []; }
  _push(e) { this.ev.push(e); this.ev.sort((a, b) => a.t - b.t); return this; }
  setValueAtTime(v, t) { return this._push({ k: 'set', v, t }); }
  linearRampToValueAtTime(v, t) { return this._push({ k: 'lin', v, t }); }
  exponentialRampToValueAtTime(v, t) { return this._push({ k: 'exp', v, t }); }
  setTargetAtTime(v, t, tau) { return this._push({ k: 'tgt', v, t, tau }); }
  setValueCurveAtTime(c, t, d) {
    for (const e of this.ev) if (e.k !== 'curve' && e.t > t && e.t < t + d) throw new Error('setValueCurveAtTime overlaps an event');
    return this._push({ k: 'curve', c, t, d });
  }
  cancelScheduledValues(t) { this.ev = this.ev.filter((e) => e.t < t); return this; }
  valueAt(t) {
    let v = this._v, tt = -Infinity, tgt = null, tau = 1, vPrev = v, tPrev = -Infinity;
    const decay = (to) => { if (tgt !== null && to > tt) v = tgt + (v - tgt) * Math.exp(-(to - tt) / tau); };
    for (const e of this.ev) {
      if (e.t > t) {
        if (e.k === 'lin' || e.k === 'exp') { decay(t); const w = (t - tPrev) / (e.t - tPrev || 1); return tgt !== null ? v : vPrev + (e.v - vPrev) * Math.min(1, Math.max(0, w)); }
        break;
      }
      decay(e.t); tt = e.t;
      if (e.k === 'set' || e.k === 'lin' || e.k === 'exp') { v = e.v; tgt = null; vPrev = v; tPrev = e.t; }
      else if (e.k === 'tgt') { tgt = e.v; tau = Math.max(1e-6, e.tau); tPrev = e.t; vPrev = v; }
      else if (e.k === 'curve') { if (t >= e.t + e.d) { v = e.c[e.c.length - 1]; tgt = null; } else { const u = (t - e.t) / e.d * (e.c.length - 1), i = Math.floor(u); return e.c[i] + (e.c[Math.min(i + 1, e.c.length - 1)] - e.c[i]) * (u - i); } }
    }
    decay(t);
    return v;
  }
}

export class MockNode {
  constructor(ctx, type) { this.ctx = ctx; this.type = type; this.out = new Set(); this.inp = new Set(); this.disconnected = false; ctx.nodes.push(this); }
  connect(d) { this.out.add(d); if (d.inp) d.inp.add(this); return d; }
  disconnect() { for (const d of this.out) if (d.inp) d.inp.delete(this); this.out.clear(); this.disconnected = true; }
}
const P = (ctx, v) => new MockParam(ctx, v);

export class MockBuffer {
  constructor(n, nc, sr, chans) { this.length = n; this.numberOfChannels = nc; this.sampleRate = sr; this.duration = n / sr; this.ch = chans || Array.from({ length: nc }, () => new Float32Array(n)); }
  getChannelData(i) { return this.ch[i]; }
  copyToChannel(d, i) { this.ch[i].set(d); }
  get rms() { let s = 0, n = 0; const c = this.ch[0]; for (let i = 0; i < c.length; i += 7) { s += c[i] * c[i]; n++; } return Math.sqrt(s / Math.max(1, n)); }
}

export class MockContext {
  /** opts: {sampleRate, gate:{active:boolean}|null (autoplay policy: resume only while gate.active), startState} */
  constructor(opts = {}) {
    this.sampleRate = opts.sampleRate || 44100; this.nodes = []; this.sources = []; this._t = 0; this.baseLatency = 0.01; this.outputLatency = 0;
    this.gate = opts.gate === undefined ? null : opts.gate;
    this.state = opts.startState || (this.gate ? 'suspended' : 'running');
    this.destination = new MockNode(this, 'destination'); this.onstatechange = null; this.resumeCalls = 0; this.pendingResumes = [];
  }
  get currentTime() { return this._t; }
  advance(dt) { if (this.state === 'running') this._t += dt; return this._t; }
  _set(s) { if (this.state !== s) { this.state = s; if (this.onstatechange) this.onstatechange(); } }
  resume() {
    this.resumeCalls++;
    if (this.gate && !this.gate.active && !this.gate.sticky && this.state !== 'running') return new Promise((r) => this.pendingResumes.push(r));   // blocked by the autoplay policy
    this._set('running'); return Promise.resolve();
  }
  suspend() { this._set('suspended'); return Promise.resolve(); }
  close() { this._set('closed'); return Promise.resolve(); }
  createGain() { const n = new MockNode(this, 'gain'); n.gain = P(this, 1); return n; }
  createBiquadFilter() { const n = new MockNode(this, 'biquad'); n.type = 'lowpass'; n.frequency = P(this, 350); n.Q = P(this, 1); n.gain = P(this, 0); return n; }
  createStereoPanner() { const n = new MockNode(this, 'panner'); n.pan = P(this, 0); return n; }
  createDynamicsCompressor() { const n = new MockNode(this, 'compressor'); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = P(this, 0); n.reduction = 0; return n; }
  createWaveShaper() { const n = new MockNode(this, 'shaper'); n.curve = null; n.oversample = 'none'; return n; }
  createConvolver() { const n = new MockNode(this, 'convolver'); n.buffer = null; n.normalize = true; return n; }
  createAnalyser() {
    const n = new MockNode(this, 'analyser'); n.fftSize = 2048;
    n.getFloatTimeDomainData = (a) => { const lvl = this.levelOf(n, this._t) * Math.SQRT2; for (let i = 0; i < a.length; i++) a[i] = lvl * Math.sin(i * 0.3); };
    return n;
  }
  createBuffer(nc, n, sr) { return new MockBuffer(n, nc, sr); }
  createBufferSource() {
    const n = new MockNode(this, 'source'); n.buffer = null; n.loop = false; n.loopStart = 0; n.loopEnd = 0; n.playbackRate = P(this, 1); n.onended = null;
    n.startT = null; n.stopT = null;
    n.start = (t = 0) => { if (n.startT !== null) throw new Error('start twice'); n.startT = t; };
    n.stop = (t = 0) => { n.stopT = n.stopT === null ? t : Math.min(n.stopT, t); };
    this.sources.push(n); return n;
  }
  decodeAudioData(ab, ok, err) {
    const p = new Promise((res, rej) => {
      try {
        const w = readWav(ab);
        if (!w) throw new Error('EncodingError: unsupported (mock decodes WAV only)');
        const b = new MockBuffer(w.channels[0].length, w.channels.length, w.sr, w.channels);
        res(b);
      } catch (e) { rej(e); }
    });
    if (ok) p.then(ok, err || (() => {}));
    return p;
  }
  /** signal level (rms) arriving at/through `node` at time t */
  levelOf(node, t) {
    if (node.type === 'source') {
      if (this.state !== 'running' || node.startT === null || t < node.startT || (node.stopT !== null && t >= node.stopT)) return 0;
      const d = node.buffer ? node.buffer.duration / Math.max(0.01, node.playbackRate.valueAt(t)) : 0;
      if (!node.loop && t >= node.startT + d) return 0;
      return node.buffer ? node.buffer.rms : 0;
    }
    let s = 0; for (const i of node.inp) { const l = this.levelOf(i, t); s += l * l; }
    let l = Math.sqrt(s);
    if (node.type === 'gain') l *= Math.abs(node.gain.valueAt(t));
    return l;
  }
  /** one-shot sources audible at t (independent check of the engine's voice accounting) */
  // a source being released by a forced stop within `release` seconds is not counted (steal fades are ~10 ms)
  activeSources(t, release = 0.015, skip = null) { let n = 0; for (const s of this.sources) { if (skip && skip(s)) continue; if (s.startT === null || s.startT > t || s.loop || !s.buffer) continue; const nat = s.startT + s.buffer.duration / Math.max(0.01, s.playbackRate.valueAt(t)); if (t >= nat) continue; if (s.stopT !== null && s.stopT < nat && s.stopT - t <= release) continue; if (s.stopT !== null && t >= s.stopT) continue; n++; } return n; }
}

/** Fake window + document with an event dispatcher; `gesture(type)` dispatches while the autoplay gate is open. */
export function makeEnv(opts = {}) {
  const listeners = new Map();
  const gate = { active: false, sticky: false };
  const win = {
    __vw: opts.vw === undefined ? {} : opts.vw,
    addEventListener(t, fn, o) { (listeners.get(t) || listeners.set(t, []).get(t)).push(fn); },
    removeEventListener(t, fn) { const a = listeners.get(t); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    count(t) { return (listeners.get(t) || []).length; },
    dispatch(type, init = {}) { for (const f of (listeners.get(type) || []).slice()) f(Object.assign({ type, isTrusted: true }, init)); },
    gesture(type = 'pointerdown', init) { gate.active = true; try { win.dispatch(type, init); } finally { gate.active = false; gate.sticky = true; } },   // sticky activation: later resume() calls are allowed
    Audio: class { constructor() { this.src = ''; } play() { return Promise.resolve(); } setAttribute() {} },
  };
  const dlisteners = new Map();
  const doc = {
    hidden: false,
    addEventListener(t, fn) { (dlisteners.get(t) || dlisteners.set(t, []).get(t)).push(fn); },
    removeEventListener() {},
    dispatch(t) { for (const f of (dlisteners.get(t) || [])) f({ type: t }); },
    createElement() { return { canPlayType: () => 'probably' }; },
  };
  const ctxs = [];
  class GatedContext extends MockContext { constructor(o) { super(Object.assign({}, o, { gate: opts.ungated ? null : gate })); ctxs.push(this); } }
  return { win, doc, gate, ctxs, AudioContext: opts.noAudio ? null : GatedContext, hide(b) { doc.hidden = b; doc.dispatch('visibilitychange'); } };
}

/** fetch() mock: serves WAV fixtures for any asset URL (duration from `durOf(url)`), counts requests, can fail on demand */
export function makeFetch(opts = {}) {
  const f = async (url) => {
    f.calls.push(url);
    if (opts.block) throw new Error('fetch blocked');
    const fail = opts.fail && opts.fail(url, f.calls.filter((u) => u === url).length);
    if (fail) return { ok: false, status: opts.failStatus || 404, arrayBuffer: async () => new ArrayBuffer(0) };
    const dur = (opts.durOf && opts.durOf(url)) || 0.5;
    const seed = [...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const buf = writeWav([noiseBurst(dur, 22050, 0.5, seed)], 22050);
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) };
  };
  f.calls = [];
  return f;
}
export const wavB64 = (sec = 0.3, f = 440) => writeWav([sine(f, sec)], 22050).toString('base64');
