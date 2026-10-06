# Requests from AUDIO to other owners

## COORD (src/app, tools/build.mjs)
1. **Wiring** (all optional-safe; every method is a no-op before `unlock()` and when `AudioContext` is missing):
   ```js
   import { createAudio } from '../audio/index.js';
   const audio = createAudio({ settings, getListener: () => ({ x, y, z, yaw }), quality: () => settings.get('quality') });   // ctx.audio
   audio.installTestHook(window.__vw);            // fills window.__vw.audio (spec section 6)
   // per battle:
   const off = audio.attach(world.events, { arena: world.arena, world, defs: world.defs });   // pass world+defs: heroes/armour/positions of events without x,z
   audio.setPlayerTeam(0);                         // campaign/quick: lets battle_end pick victory vs defeat jingle (null = always victory unless draw)
   // on exit: audio.detach();  screens: audio.music.setMood(meta.music)  ('menu'|'editor'|'battle'|'none'; battle is started by battle_start itself)
   ```
   `createAudio` already installs the autoplay gesture gate on `window` (first pointer/key/touch resumes the context inside the gesture) and schedules the core-pack preload ~30 ms after creation, so no extra work is needed; `audio.unlock()` may also be called from the splash.
   `getListener` should return the camera **focus** point (ground target) with the camera yaw (heading convention of spec section 1: forward = (sin yaw, cos yaw)); y is the eye height (only 35 % of the height above a sound counts as distance).
2. **`tools/build.mjs` manifest paths**: the ledger stores `path` relative to `assets/` (`audio/sfx/x.mp3`). The runtime resolves it to `assets/audio/sfx/x.mp3`; build.mjs currently prefixes `assets/audio/<kind>/` again for non-`assets/` paths and warns "manifest file missing". Treat a leading `audio/` or `vfx/` as relative to `assets/`.
3. **Core pack** (`window.__VW_CORE_AUDIO__ = {id: base64}`): the runtime accepts SFX **and music** ids (the ledger flags `battle_mid_epic_boss` as `core:true`, ~1.2 MB mp3 = ~1.6 MB base64; spec section 10/B10 budgets <= 450 KB raw SFX only). If that track stays core the page budget (B10 3 MB) is at risk; either clear the flag (music then comes from fetch with the synth bed as the offline fallback) or accept the size. The runtime works either way (`tests/audio/browser.test.mjs` AU4 measures the embedded bytes).
4. Settings keys read by audio: `vol.master|music|sfx|ui|announcer` (0..1), `muted`, `tts`, `quality`, and NEW `announcerVoice` (bool, default false: opt-in spoken "Ready / Fight / Winner" clips on the Announcer bus). `settings.on(fn)` is subscribed once; the handler only reads.
5. `window.__vw.audio` is installed by `audio.installTestHook(window.__vw)`; it is a live object (getters) with `state, ctxState, masterRMS, busRMS{music,sfx,ui,announcer,ambience}, voices, voicePeak, voiceDrops, loaded{embedded,fetched,synth,failed}, cueCounts, music{track,mood,intensity}` and `diagnostics()` (full report incl. per-asset load paths, decoded memory vs tier ceiling) for the Diagnostics screen.

## UI
- Mute button: `audio.setMuted(b)` / `audio.isMuted()`; `audio.on('state'|'mute'|'volume'|'load'|'music', fn)` returns an unsubscribe function; `audio.state()` is `'unavailable'|'locked'|'running'|'suspended'|'muted'|'closed'`.
- UI sounds: `audio.ui('click'|'hover'|'confirm'|'back'|'error'|'toggle'|'tick'|'panel_open'|'panel_close'|'achievement'|'countdown_beep'|'go'|'place'|'erase')`; `audio.ui('place', {mass})` pitch-shifts +/- 4 % by mass.
- Settings > Audio TTS: `audio.speech.supported()`, `setEnabled(b)`, `voices()`, `setVoice(name)`, `test()`; Humor/HUD announcer: `audio.speech.speak(text, {priority})` (priority >= 2 only, 1 line per 6 s, skipped above 2x speed).

## SIM (optional improvements, nothing is blocking)
- A `unit_swing{id,x,y,z,style}` event at the start of an attack clip would let audio place swing whooshes before the hit instead of probabilistic texture on `unit_hit`.
- `trample`, `charge_hit`, `unit_brace`, `bark`, `status_apply` carry only unit ids; audio resolves positions via `world.units` (pass `world` to `attach`) or the last position seen in `unit_spawn/unit_hit/ability_cast`.

## ASSET HUNTER (ledger)
- Still synth-only (see `docs/audio_coverage.md`): `philosopher_mumble`, `senator_blah`, `crowd_boo`, `wine_pour`, `amb_birds`, `amb_desert`, `amb_forest`, `amb_water`. Real files named `<family>_<n>.mp3` (or any id starting with the family name) in the ledger are picked up automatically.
- Music rows: add `fade_out`/`loop_check` notes as now (the runtime reads "end-vs-start RMS dB" from `notes` to avoid fading an already faded tail twice).
