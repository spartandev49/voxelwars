// Tiny tween helper: uses window.gsap when present, otherwise a minimal built-in timeline so UI never breaks if the CDN is blocked.
const ease = { out: (t) => 1 - Math.pow(1 - t, 3), inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), spring: (t) => { const c = 1.70158 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; }, linear: (t) => t };
const active = new Set();
let raf = 0;
function tickAll(now) {
  raf = 0;
  for (const tw of Array.from(active)) {
    const t = Math.min(1, (now - tw.start) / tw.dur);
    tw.onUpdate(ease[tw.ease](t), t);
    if (t >= 1) { active.delete(tw); if (tw.onDone) tw.onDone(); }
  }
  if (active.size && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tickAll);
}
/** tween(durSeconds, fn(eased, raw), {ease:'out|inOut|spring|linear', onDone, reduce}) returns {cancel()}. */
export function tween(dur, onUpdate, opts = {}) {
  if (opts.reduce || typeof requestAnimationFrame !== 'function') { onUpdate(1, 1); if (opts.onDone) opts.onDone(); return { cancel() {} }; }
  const tw = { start: performance.now(), dur: Math.max(1, dur * 1000), onUpdate, onDone: opts.onDone, ease: opts.ease || 'out' };
  active.add(tw);
  if (!raf) raf = requestAnimationFrame(tickAll);
  return { cancel() { active.delete(tw); } };
}
export const gsap = () => (typeof window !== 'undefined' && window.gsap) || null;
