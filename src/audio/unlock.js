// Autoplay gate: the AudioContext is only created/resumed inside a trusted user gesture. Listeners stay armed until the context
// is actually running (iOS needs touchend; Safari may report "interrupted" later and need another gesture).
const EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'click', 'keydown'];

/**
 * Install the gesture gate on `target` (window). `onGesture()` must call ctx.resume() synchronously and return a boolean/promise
 * saying whether audio is now running; the gate removes itself once it is.
 * @returns {() => void} uninstall function
 */
export function installGate(target, onGesture, isRunning, onDone) {
  if (!target || !target.addEventListener) return () => {};
  let done = false;
  const handler = (e) => {
    if (done) return;
    if (e && e.type === 'keydown' && (e.key === 'Escape')) return;      // Escape is not an activating key
    let r; try { r = onGesture(e); } catch (err) { return; }
    Promise.resolve(r).then(() => { if (isRunning()) { done = true; remove(); if (onDone) onDone(); } }, () => {});
  };
  const remove = () => { for (const t of EVENTS) target.removeEventListener(t, handler, true); };
  for (const t of EVENTS) target.addEventListener(t, handler, { capture: true, passive: true });
  return () => { done = true; remove(); };
}

/** 1-sample silent WAV (data URI) for the iOS silent-switch unlock; only ever used on iOS-like platforms. */
export function silentWavDataUri() {
  const bytes = [0x52, 0x49, 0x46, 0x46, 37, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0, 1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x40, 0x1f, 0, 0, 1, 0, 8, 0, 0x64, 0x61, 0x74, 0x61, 1, 0, 0, 0, 128];
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return 'data:audio/wav;base64,' + (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'));
}
export function isIOSLike(nav) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
}
