// Optional TTS announcer (default OFF, experimental). speechSynthesis output cannot be routed through WebAudio, so ducking the
// music while a line is spoken is approximate (estimated from text length). Rate-limited, priority-gated, skipped at speed > 2x.
export class Speech {
  /** @param {object} o {synth?, Utterance?, now?()->s, duck?(bus,db,ms), rate?} */
  constructor(o = {}) {
    const g = typeof window !== 'undefined' ? window : {};
    this.synth = o.synth !== undefined ? o.synth : (g.speechSynthesis || null);
    this.Utterance = o.Utterance || g.SpeechSynthesisUtterance || null;
    this.now = o.now || (() => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000));
    this.duck = o.duck || null;
    this.enabled = false; this.voiceName = ''; this.rate = o.rate || 1.05; this.volume = 1;
    this.last = -1e9; this.minGap = 6; this.minPriority = 2; this.spoken = 0; this.skipped = 0; this.speed = 1;
  }
  get supported() { return !!(this.synth && this.Utterance); }
  setEnabled(b) { this.enabled = !!b && this.supported; if (!this.enabled && this.synth) { try { this.synth.cancel(); } catch (e) { /* none */ } } return this.enabled; }
  setVoice(name) { this.voiceName = String(name || ''); }
  setSpeed(s) { this.speed = s; }
  voices() { try { return this.synth ? this.synth.getVoices().map((v) => ({ name: v.name, lang: v.lang, default: !!v.default })) : []; } catch (e) { return []; } }
  /** Speak a line if enabled, important enough (priority >= 2), not too soon after the last one, and the game is not fast-forwarding. */
  speak(text, o = {}) {
    if (!this.enabled || !this.supported || !text) { this.skipped++; return false; }
    const pr = o.priority === undefined ? 1 : o.priority, t = this.now();
    if (pr < this.minPriority && !o.force) { this.skipped++; return false; }
    if (this.speed > 2 && !o.force) { this.skipped++; return false; }
    if (t - this.last < this.minGap && !o.force) { this.skipped++; return false; }
    return this._say(String(text).slice(0, 160), t);
  }
  /** the Settings "Test voice" button */
  test(text = 'Spartans, what is your profession?') { if (!this.supported) return false; return this._say(text, this.now(), true); }
  _say(text, t, force) {
    try {
      const u = new this.Utterance(text); u.rate = this.rate; u.volume = this.volume;
      if (this.voiceName) { const v = this.synth.getVoices().find((x) => x.name === this.voiceName); if (v) u.voice = v; }
      this.synth.cancel(); this.synth.speak(u); this.last = t; this.spoken++;
      if (this.duck) this.duck('music', -6, Math.min(6000, 600 + text.length * 65));
      return true;
    } catch (e) { return false; }
  }
}
