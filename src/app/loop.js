// Main loop: rAF with dt clamp, FPS meter, hidden-tab pause, and the perf auto-scaler (hysteresis, never flaps).
export class Loop {
  constructor({ game, engine, settings, onFrame }) {
    this.game = game; this.engine = engine; this.settings = settings; this.onFrame = onFrame || null;
    this.running = false; this.last = 0; this.fps = 60; this.ft = []; this.hidden = false; this.clock = { now: () => performance.now() };
    this.scaler = { lastChange: 0, lowFor: 0, highFor: 0, changes: [] };
    this.stepHook = null;
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; if (!document.hidden) this.last = 0; if (document.hidden && this.settings.get('autoPauseBlur') && this.game.state === 'running') this.game.pause(true); });
  }
  start() { if (this.running) return; this.running = true; this.last = 0; const tick = (t) => { if (!this.running) return; requestAnimationFrame(tick); this._frame(t); }; requestAnimationFrame(tick); }
  stop() { this.running = false; }
  _frame(t) {
    if (this.hidden) return;
    if (!this.last) { this.last = t; return; }
    const dtRaw = (t - this.last) / 1000; this.last = t;
    const dt = Math.min(0.1, Math.max(0.0005, dtRaw));
    const t0 = performance.now();
    this.game.frame(dt);
    if (this.onFrame) this.onFrame(dt);
    const ms = performance.now() - t0;
    this.ft.push(dtRaw * 1000); if (this.ft.length > 90) this.ft.shift();
    this.fps = this.fps * 0.9 + (1 / Math.max(0.001, dtRaw)) * 0.1; this.game.fps = Math.round(this.fps);
    this.cpuMs = ms;
    this._autoScale(dtRaw, t);
  }
  _autoScale(dt, t) {
    if (!this.settings.get('autoScale')) return;
    const s = this.scaler; const ms = dt * 1000;
    // warm-up: shader compiles and first-battle allocations hitch; ignore the first 6 s of the page, of every battle and after any change, and single huge frames
    if (!s.t0) s.t0 = t;
    const g = this.game, key = g.state + ':' + (g.world ? g.world.arena.name : '');
    if (key !== s.key) { s.key = key; s.warmUntil = t + 5000; }
    if (t - s.t0 < 6000 || t < (s.warmUntil || 0) || dt > 0.25 || g.canvasMode === 'none' || g.canvasMode === 'preview' || g.paused) return;
    if (ms > 28) { s.lowFor += dt; s.highFor = 0; } else if (ms < 15) { s.highFor += dt; s.lowFor = Math.max(0, s.lowFor - dt); } else { s.lowFor = Math.max(0, s.lowFor - dt * 0.5); }
    const eng = this.engine;
    if (s.lowFor > 4 && t - s.lastChange > 5000) { // step down quickly
      s.lowFor = 0; s.lastChange = t; s.warmUntil = t + 3000; s.changes.push(t);
      if (eng.autoScale > 0.62) eng.setAutoScale(eng.autoScale - 0.12);
      else { const order = ['olympian', 'marble', 'papyrus', 'potato']; const i = order.indexOf(eng.qualityKey); if (i >= 0 && i < order.length - 1) { eng.setQuality(order[i + 1]); this.game.setTier(order[i + 1]); this.game.emit('toast', { text: 'Auto-quality lowered the graphics to keep things smooth', kind: 'info' }); } }
    } else if (s.highFor > 20 && t - s.lastChange > 60000 && eng.autoScale < 1) { s.highFor = 0; s.lastChange = t; eng.setAutoScale(Math.min(1, eng.autoScale + 0.1)); }
  }
  percentile(p) { if (!this.ft.length) return 0; const a = this.ft.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }
}
