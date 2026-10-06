// Diagnostics: collects the facts the Diagnostics screen, the fatal panel and the owner-only beacon report.
export class Diagnostics {
  constructor() { this.log = []; this.csp = []; this.errors = []; this.caps = null; this.t0 = performance.now(); this.timeToTitle = null; this.extra = {}; this._install(); }
  _install() {
    window.addEventListener('error', (e) => this.error('error', e.message + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')));
    window.addEventListener('unhandledrejection', (e) => this.error('rejection', String((e.reason && (e.reason.stack || e.reason.message)) || e.reason)));
    document.addEventListener('securitypolicyviolation', (e) => { this.csp.push({ blocked: e.blockedURI, directive: e.violatedDirective, t: Math.round(performance.now()) }); this.error('csp', e.violatedDirective + ' blocked ' + e.blockedURI); });
  }
  error(kind, msg) { this.errors.push({ kind, msg: String(msg).slice(0, 300), t: Math.round(performance.now()) }); if (this.errors.length > 40) this.errors.shift(); }
  note(msg) { this.log.push({ t: Math.round(performance.now()), msg: String(msg).slice(0, 200) }); if (this.log.length > 80) this.log.shift(); }
  markTitle() { if (this.timeToTitle === null) this.timeToTitle = Math.round(performance.now() - this.t0); }
  snapshot(app) {
    const e = app && app.engine, r = e && e.renderer, info = r && r.info;
    const o = { build: typeof __VW_VERSION__ !== 'undefined' ? __VW_VERSION__ : 'dev', buildDate: typeof __VW_BUILD__ !== 'undefined' ? __VW_BUILD__ : '', caps: this.caps && this.caps.info, timeToTitleMs: this.timeToTitle, errors: this.errors.slice(-10), csp: this.csp.slice(-10) };
    if (e) { o.quality = e.qualityKey; o.autoScale = +e.autoScale.toFixed(2); o.pixelRatio = r.getPixelRatio(); }
    if (info) { o.drawCalls = info.render.calls; o.triangles = info.render.triangles; o.geometries = info.memory.geometries; o.textures = info.memory.textures; o.programs = info.programs ? info.programs.length : 0; }
    if (app && app.loop) { o.fps = Math.round(app.loop.fps); o.frameP50 = +app.loop.percentile(0.5).toFixed(1); o.frameP95 = +app.loop.percentile(0.95).toFixed(1); o.cpuMs = +(app.loop.cpuMs || 0).toFixed(2); }
    if (app && app.game && app.game.world) { o.units = app.game.world.units.length; o.projectiles = app.game.world.proj.live; o.fxLive = app.game.fx.liveCount; o.tick = app.game.world.tickN; }
    try { if (performance.memory) o.heapMB = Math.round(performance.memory.usedJSHeapSize / 1048576); } catch (err) { /* ignore */ }
    if (app && app.store) { o.storage = app.store.status(); o.storageBytes = app.store.bytes(); }
    if (app && app.audio && app.audio.diagnostics) { try { o.audio = app.audio.diagnostics(); } catch (err) { o.audio = { error: String(err) }; } }
    o.manifest = { sfx: (window.__VW_MANIFEST__ && window.__VW_MANIFEST__.sfx || []).length, music: (window.__VW_MANIFEST__ && window.__VW_MANIFEST__.music || []).length, coreAudio: Object.keys(window.__VW_CORE_AUDIO__ || {}).length };
    Object.assign(o, this.extra);
    return o;
  }
}
