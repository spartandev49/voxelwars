// No-op audio with the same surface as the real runtime (used until it loads, if it fails, or in tests).
const noop = () => {};
export function createNullAudio() {
  return { play: noop, ui: noop, duck: noop, unlock: noop, attach: noop, detach: noop, setListener: noop, setVolume: noop, getVolume: () => 0, setMuted: noop, isMuted: () => true, state: () => 'null', diagnostics: () => ({ state: 'null' }), installTestHook: noop,
    music: { setMood: noop, setIntensity: noop, intensityFromWorld: () => 0 } };
}
