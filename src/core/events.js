// Tiny synchronous event bus. Payload objects may be reused by the emitter: consumers must read, never retain.
export class EventBus {
  constructor() { this.h = Object.create(null); this.any = []; this.counts = Object.create(null); this.record = null; }
  on(type, fn) { (this.h[type] || (this.h[type] = [])).push(fn); return () => this.off(type, fn); }
  /** Listen to every event: fn(type, payload). */
  onAny(fn) { this.any.push(fn); return () => { const i = this.any.indexOf(fn); if (i >= 0) this.any.splice(i, 1); }; }
  off(type, fn) { const a = this.h[type]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
  emit(type, p) {
    this.counts[type] = (this.counts[type] || 0) + 1;
    const a = this.h[type];
    if (a) for (let i = 0; i < a.length; i++) a[i](p);
    const any = this.any;
    for (let i = 0; i < any.length; i++) any[i](type, p);
    if (this.record) this.record.push([type, JSON.parse(JSON.stringify(p))]);
  }
  has(type) { return !!(this.h[type] && this.h[type].length) || this.any.length > 0; }
  clear() { this.h = Object.create(null); this.any.length = 0; }
}
