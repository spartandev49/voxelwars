// Browser entry for tools/mixtest.mjs: replays a recorded sim event stream through the REAL audio engine (router, bank, voice budget,
// graph with compressor/limiter, music director) on an OfflineAudioContext, with the real decoded assets, and returns the master mix.
import { AudioEngine, MIX } from '../../src/audio/engine.js';
import { STAT_TABLE } from '../../src/content/era_ancient/stats.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

window.runMix = async function runMix(cfg) {
  const { data, manifest, sr = 48000, tail = 8, quality = 'olympian' } = cfg;
  if (cfg.mix) Object.assign(MIX, cfg.mix);
  const T = data.frames.length ? data.frames[data.frames.length - 1].t : 60, total = Math.ceil((T + tail) * sr);
  const ctx = new OfflineAudioContext(2, total, sr);
  let curT = 0;
  const eng = new AudioEngine({ quality: () => quality, env: { offlineCtx: ctx, manifest, coreAudio: {}, fetch: (u) => window.fetch(u), window: null, document: null, OfflineAudioContext, AudioContext: null, rng: mulberry32(1234), yieldFn: () => Promise.resolve(), bridgeMs: -1 } });
  eng.setClock(() => curT);
  const t0 = performance.now();
  eng.bank.warm(['ui', 'combat', 'voice', 'siege', 'misc']); await eng.bank.idle();
  const loadMs = performance.now() - t0, st = eng.bank.stats();
  if (cfg.volumes) for (const [b, v] of Object.entries(cfg.volumes)) eng.setVolume(b, v);
  for (const b of cfg.mute || []) eng.setVolume(b, 0);
  // fake world (the router reads units for the foley bed, the director reads stats for intensity)
  const world = { state: 'running', time: 0, units: [], dying: [], stats: [{ startCount: 0, alive: 0 }, { startCount: 0, alive: 0 }], arena: data.arena, defs: null };
  let handler = null; const bus = { onAny(fn) { handler = fn; return () => { handler = null; }; } };
  const defsList = data.defs;
  eng.attach(bus, { arena: data.arena, world, defs: STAT_TABLE });
  const L = cfg.listener || { h: 30, yaw: Math.PI / 2 };
  const frames = data.frames; let fi = 0, ei = 0, nextTick = 0; const ev = data.events;
  const applyFrame = (f) => {
    world.time = f.t; world.stats[0].alive = f.alive[0]; world.stats[1].alive = f.alive[1]; world.stats[0].startCount = data.start[0]; world.stats[1].startCount = data.start[1];
    const us = world.units; us.length = 0; let cx = 0, cz = 0, n = 0;
    for (const u of f.u) { us.push({ id: u[0], def: { id: defsList[u[1]] }, x: u[2], z: u[3], px: u[4], pz: u[5] }); cx += u[2]; cz += u[3]; n++; }
    if (n) eng.setListener(cx / n, L.h, cz / n, L.yaw);
  };
  let battleStarted = false;
  while (ei < ev.length || fi < frames.length) {
    const e = ei < ev.length ? ev[ei] : null, f = fi < frames.length ? frames[fi] : null;
    if (f && (!e || f.t <= e[0])) {
      curT = f.t + 1.0; applyFrame(f); fi++;
      eng.router.tick(1 / 4);
      if (eng.music.mood === 'battle' || eng.music.mood === 'comedy') eng.music.setIntensity(eng.music.intensityFromWorld(world, curT), { at: curT });
      if (eng.loops.has('crowd_loop')) eng.setLoopLevel('crowd_loop', 0.6 + 0.8 * eng.music.intensity, 1.0);
      continue;
    }
    curT = e[0] + 1.0; ei++;
    handler(e[1], e[2]);
    if (e[1] === 'battle_start' || e[1] === 'battle_end') { for (let i = 0; i < 200 && !(eng.music.player && eng.music.mood !== 'none' && eng.music.lastTrackId); i++) await sleep(10); await sleep(60); }
  }
  curT = T + 1.0;
  eng.music.pump(T + tail);
  for (const l of eng.loops.values()) l.p.pump(0, T + tail);
  const diag = eng.diagnostics();
  const rt0 = performance.now();
  const buf = await ctx.startRendering();
  const renderMs = performance.now() - rt0;
  // stats on the rendered master
  let peak = 0, clipped = 0, ss = 0, n = 0; const ch = [buf.getChannelData(0), buf.getChannelData(1)];
  for (let c = 0; c < 2; c++) { const d = ch[c]; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 0.9999) clipped++; ss += d[i] * d[i]; n++; } }
  window.__mix = buf;
  return { sr, frames: buf.length, duration: buf.duration, samplePeak: peak, clipped, rmsDb: 20 * Math.log10(Math.sqrt(ss / n) + 1e-12), loadMs, renderMs, decoded: st, diag: { voicePeak: diag.voicePeak, voiceSteals: diag.voiceSteals, voiceDrops: diag.voiceDrops, drops: diag.drops, cueCounts: diag.cueCounts, music: diag.music, loaded: diag.loaded, decoded: diag.decoded, errors: diag.errors, loops: diag.loops } };
};
window.getChunk = (i, size) => {
  const b = window.__mix, per = size >> 1, out = new Float32Array(per * 2);
  const a = b.getChannelData(0), c = b.getChannelData(1); const s = i * per;
  for (let k = 0; k < per && s + k < a.length; k++) { out[k * 2] = a[s + k]; out[k * 2 + 1] = c[s + k]; }
  const u8 = new Uint8Array(out.buffer); let bin = ''; for (let k = 0; k < u8.length; k += 8192) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 8192));
  return btoa(bin);
};
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
