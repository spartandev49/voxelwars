// Voice budget with priority stealing + per-family cooldown / concurrency (pure; time is whatever clock the caller uses, seconds).
export class VoiceManager {
  /** @param {number} max voice budget (spec: 32)  @param {(h:object)=>void} onSteal called when a running voice is evicted */
  constructor(max = 32, onSteal = null) {
    this.max = max; this.reserved = 0; this.onSteal = onSteal;
    this.v = []; this.famLast = new Map();
    this.steals = 0; this.peak = 0; this.started = 0; this.nextId = 1;
    this.drops = { cooldown: 0, family: 0, budget: 0 };
  }
  get budget() { return this.max - this.reserved; }
  /** Remove voices whose end time has passed. */
  prune(t) {
    const v = this.v;
    for (let i = v.length - 1; i >= 0; i--) if (v[i].end <= t) { v[i] = v[v.length - 1]; v.pop(); }
  }
  active(t) { this.prune(t); return this.v.length; }
  famActive(fam) { let n = 0; for (let i = 0; i < this.v.length; i++) if (this.v[i].fam === fam) n++; return n; }
  lastStart(fam) { const l = this.famLast.get(fam); return l === undefined ? -1e9 : l; }
  /** Cheap pre-check used before any expensive work (buffer pick, spatial maths): is this family in cooldown at time t? */
  inCooldown(fam, t, cooldown) { return cooldown > 0 && t - this.lastStart(fam) < cooldown; }
  _weakest(pred) {
    let w = null;
    for (let i = 0; i < this.v.length; i++) {
      const c = this.v[i]; if (pred && !pred(c)) continue;
      if (!w || c.prio < w.prio || (c.prio === w.prio && c.end < w.end)) w = c;
    }
    return w;
  }
  _evict(h, t) {
    const i = this.v.indexOf(h); if (i >= 0) { this.v[i] = this.v[this.v.length - 1]; this.v.pop(); }
    this.steals++; h.stolenAt = t;
    if (this.onSteal) this.onSteal(h, t);
  }
  /**
   * Try to start a voice. Returns the voice handle {id,fam,prio,start,end,node} or null (reason in this.lastDrop).
   * Rules: cooldown (per family), family max (steal the family's weakest if the new voice outranks it), global budget
   * (steal the globally weakest if the new voice outranks it). `t` is the time of the request (pruning, cooldown); `start` is when
   * the sound actually begins (>= t for delayed layers): a delayed voice holds its slot from the request time, which is conservative.
   */
  acquire(fam, prio, t, end, cooldown = 0, maxFam = 99, start = t) {
    this.prune(t);
    if (cooldown > 0 && t - this.lastStart(fam) < cooldown) { this.drops.cooldown++; this.lastDrop = 'cooldown'; return null; }
    if (maxFam < 99 && this.famActive(fam) >= maxFam) {
      const w = this._weakest((c) => c.fam === fam);
      if (w && prio > w.prio) this._evict(w, t); else { this.drops.family++; this.lastDrop = 'family'; return null; }
    }
    if (this.v.length >= this.budget) {
      const w = this._weakest(null);
      if (w && prio > w.prio) this._evict(w, t); else { this.drops.budget++; this.lastDrop = 'budget'; return null; }
    }
    const h = { id: this.nextId++, fam, prio, start, end, node: null };
    this.v.push(h); this.famLast.set(fam, t); this.started++;
    if (this.v.length + this.reserved > this.peak) this.peak = this.v.length + this.reserved;
    return h;
  }
  totalDrops() { return this.drops.cooldown + this.drops.family + this.drops.budget; }
  clear() { this.v.length = 0; }
}
