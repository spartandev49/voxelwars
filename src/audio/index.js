// Public entry of the audio runtime (imported by the app through the generated optional registry).
//   import { createAudio } from '../audio/index.js';
//   const audio = createAudio({ settings, getListener, quality });     // ctx.audio
//   audio.unlock()  (first gesture; the built-in gesture gate also does it)   audio.attach(world.events, { arena, world, defs })
// Every method is safe to call before unlock() (no-ops) and when AudioContext does not exist.
import { AudioEngine, listenerFromCamera, BUSES, MIX } from './engine.js';
import { CUES, CUE_IDS, UI_CUES } from './cues.js';

const METHODS = ['play', 'ui', 'duck', 'setVolume', 'getVolume', 'setMuted', 'isMuted', 'state', 'diagnostics', 'unlock', 'attach', 'detach', 'setListener',
  'installTestHook', 'applySettings', 'setQuality', 'setPlayerTeam', 'stopAll', 'stopVoice', 'startLoop', 'stopLoop', 'stopLoops', 'preload', 'boot', 'on',
  'suspend', 'resume', 'masterRMS', 'busRMS', 'destroy'];

/**
 * @param {object} opts {settings:{get(key)}, getListener:()=>({x,y,z,yaw}), quality:()=>'potato|papyrus|marble|olympian', env?:test overrides}
 * @returns the Ctx.audio object (all methods pre-bound) + `engine` (the AudioEngine, for tools and tests)
 */
export function createAudio(opts = {}) {
  const eng = new AudioEngine({ settings: opts.settings, getListener: opts.getListener, quality: opts.quality, env: opts.env });
  const a = { engine: eng };
  for (const m of METHODS) a[m] = eng[m].bind(eng);
  a.music = {
    setMood: (mood, o) => eng.music.setMood(mood, o),
    setIntensity: (x, o) => eng.music.setIntensity(x, o),
    getIntensity: () => eng.music.getIntensity(),
    intensityFromWorld: (world) => eng.music.intensityFromWorld(world),
    stop: (fade) => eng.music.stop(fade),
    state: () => eng.music.getState(),
  };
  a.speech = {
    speak: (text, o) => eng.speech.speak(text, o), test: (t) => eng.speech.test(t), setEnabled: (b) => eng.speech.setEnabled(b), isEnabled: () => eng.speech.enabled,
    setVoice: (n) => eng.speech.setVoice(n), voices: () => eng.speech.voices(), supported: () => eng.speech.supported, setSpeed: (s) => eng.speech.setSpeed(s),
  };
  Object.defineProperty(a, 'stateName', { get: () => eng.state() });
  eng.boot();
  return a;
}
export { AudioEngine, listenerFromCamera, BUSES, MIX, CUES, CUE_IDS, UI_CUES };
