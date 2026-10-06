// Command-pattern undo/redo shared by the editors. A command = {label, do(), undo(), merge?(next)->bool}.
// Commands with merge() coalesce (e.g. a brush drag becomes one undo step). Depth-limited; memory-friendly (commands hold deltas).
export class UndoStack {
  constructor(limit = 100) { this.limit = limit; this.done = []; this.undone = []; this.listeners = []; }
  exec(cmd) {
    cmd.do();
    const top = this.done[this.done.length - 1];
    if (top && top.merge && top.merge(cmd)) { /* merged into previous step */ }
    else { this.done.push(cmd); if (this.done.length > this.limit) this.done.shift(); }
    this.undone.length = 0; this._emit();
  }
  /** Record a command that has already been applied (live brush strokes). */
  push(cmd) { const top = this.done[this.done.length - 1]; if (!(top && top.merge && top.merge(cmd))) { this.done.push(cmd); if (this.done.length > this.limit) this.done.shift(); } this.undone.length = 0; this._emit(); }
  undo() { const c = this.done.pop(); if (!c) return false; c.undo(); this.undone.push(c); this._emit(); return true; }
  redo() { const c = this.undone.pop(); if (!c) return false; c.do(); this.done.push(c); this._emit(); return true; }
  canUndo() { return this.done.length > 0; } canRedo() { return this.undone.length > 0; }
  clear() { this.done.length = 0; this.undone.length = 0; this._emit(); }
  onChange(fn) { this.listeners.push(fn); return () => { const i = this.listeners.indexOf(fn); if (i >= 0) this.listeners.splice(i, 1); }; }
  _emit() { for (const f of this.listeners) f(this); }
  get depth() { return this.done.length; }
}
