# spec/audio.md — Audio engine, cue families, music, mix (owner AUDIO)

## 1. Sources and delivery
- Real assets from the internet, CC0 or CC-BY only, ledger in `assets/manifest.json` (+ `assets/CREDITS.md`), runtime format **MP3** (Safari-safe). The asset hunter owns acquisition; AUDIO owns runtime.
- Hybrid delivery: assets with `core:true` are base64-embedded into the bundle (`window.__VW_CORE_AUDIO__`, decoded from `atob` into ArrayBuffers; no fetch needed); all other assets are published beside the page (`assets/audio/...`) and fetched lazily with `fetch()` relative URLs + `decodeAudioData`; anything that fails to load falls back to `synth.js` and is flagged in diagnostics (`embedded | fetched | synth | failed`).
- Memory: decode music one track at a time (current + next); SFX decoded lazily in groups (ui+combat first, then siege/animals/etc.) with a decoded-PCM budget (Potato 40 MB / Papyrus 80 / Marble 160 / Olympian 240).
- The AudioContext is created/resumed on the first user gesture (the splash). Resume on `visibilitychange` and `focus`, suspend when hidden. A visible mute button reflects state. Run `ctx.resume()` inside the gesture; for iOS silent-switch unlock play a 1-sample silent `<audio>` element once. Tests run without the autoplay flag.

## 2. Graph
```
voices -> [per-voice: gain -> (lowpass by distance) -> panner(StereoPanner)] -> bus(sfx|ui|announcer|ambience) -> masterIn
music -> musicGain -> lowpass(intensity) -> musicBus -> masterIn
masterIn -> DynamicsCompressor(thr -16, knee 10, ratio 5, att .003, rel .2) -> limiter (second compressor thr -3 ratio 20 att .001) -> gain(master) -> destination
```
Buses have independent user volumes (Master, Music, SFX, UI, Announcer) persisted in settings. Ducking: `audio.duck('music', -6 dB, 400 ms)` on announcer lines and horn stingers; `duck('sfx', -3 dB)` on victory jingle. Spatialisation: pan = clamp(dx/ 25), gain by `1 / (1 + (d/ref)^1.4)` with `ref` per family; sounds beyond `maxDist` are dropped; far sounds low-passed (cutoff 18 k -> 2.5 k with distance). Voice budget 32 (priority queue: heroes/ultimates 100 > near hits 50 > ambient 30 > far hits 10; steal the lowest). Per-family cooldown and max concurrent (table below). Pitch jitter via `playbackRate` (+/- per family). Targets: SFX bus typical peak -6 dBFS, music about -18 LUFS, master peak < -1 dBFS; verified by the offline mix test (§6).

## 3. Cue families (`src/audio/cues.js`): id -> {pick:[manifest category/tags], vol, pitch:[lo,hi], cooldownMs, maxVoices, priority, bus, spatial, ref, maxDist, duck?}
Combat: `hit_blade, hit_pierce, hit_blunt, hit_flesh_light, hit_flesh_heavy, hit_armor, block_shield, block_parry, crit, swing_light, swing_heavy, bow_shoot, arrow_whoosh, arrow_hit_flesh, arrow_hit_wood, arrow_hit_shield, javelin_throw, spear_thrust, axe_chop, kick_whoomp, net_throw`
Death/voice: `death_male, death_scream, death_oof (comic), death_big, death_animal, battle_cry, taunt, cheer_small, philosopher_mumble, senator_blah, chicken_cluck, chicken_rage, goat_bleat, hound_bark, horse_neigh, horse_gallop, camel_groan, elephant_trumpet, elephant_step, minotaur_roar, cyclops_roar, medusa_hiss`
Crowd: `crowd_cheer_small, crowd_cheer_big, crowd_gasp, crowd_boo, crowd_loop`
Instruments: `horn_war, horn_charge, horn_victory, drum_boom, drum_roll, gong`
Siege/destruction: `catapult_creak, catapult_launch, ballista_twang, boulder_whoosh, boulder_impact, wall_crumble, wood_crack, rubble, voxel_break`
FX: `fire_ignite, fire_loop, thunder_crack, lightning_zap, heal_chime, buff_power, curse_whoosh, coin_clink, stone_freeze, wine_pour, confetti_pop, voxel_pop, debris_clatter, revive_chime`
UI: `ui_hover, ui_click, ui_confirm, ui_back, ui_error, ui_toggle, ui_tick, ui_panel_open, ui_panel_close, ui_achievement, ui_countdown_beep, ui_go, ui_place, ui_erase`
Jingles/stingers: `jingle_victory, jingle_defeat, jingle_start, stinger_hero_down, stinger_epic, stinger_funny`
Foley: `step_dirt, step_grass, step_stone, step_sand, step_snow, step_mud, step_wood, step_water, armor_rustle`
Ambience loops: `amb_wind, amb_birds, amb_desert, amb_forest, amb_water, amb_fire, amb_crowd` (low volume; chosen by arena env).
Each family resolves to >=3 variants where the asset set allows; where a family has no real asset it uses `synth.js` (list kept in `docs/audio_coverage.md` with the justification). Variants are chosen by shuffle-bag (no immediate repeats).

## 4. Event -> cue map (`cues.js`), rate limits are per family
| event | cue(s) | notes |
|---|---|---|
| unit_hit (type, blocked, crit) | `hit_blade/pierce/blunt` + `hit_flesh_*` or `hit_armor` by target armor; crit adds `crit` | max 10 voices, cooldown 20 ms, distance cull 90 u |
| unit_block | `block_shield` (melee) / `arrow_hit_shield` (proj) | |
| projectile_launch | `bow_shoot`, `javelin_throw`, `catapult_launch`, `ballista_twang` | |
| projectile_hit | `arrow_hit_flesh/wood/shield`, `boulder_impact` | |
| unit_kill | `death_*` by def (`death_oof` 15% comic; big units `death_big`; animals `death_animal`) | max 6 voices; hero kills duck music 3 dB |
| battle_start | `jingle_start` + `horn_war` + `drum_boom` | crowd_loop on colosseum |
| battle_end | `jingle_victory` or `jingle_defeat` (music stops/ducks) | |
| explosion/crater/prop_destroyed | `boulder_impact`, `wall_crumble`, `rubble`, `voxel_break` | |
| god_power | `thunder_crack`+`lightning_zap` (zeus), `fire_ignite` (meteor), `rubble` (quake), `heal_chime`, `wine_pour`, `chicken_cluck` x N | |
| ability_cast | by ability: `kick_whoomp`, `philosopher_mumble`, `senator_blah`, `heal_chime`, `buff_power`, `curse_whoosh`, `stone_freeze`, `net_throw`, `elephant_trumpet`, `horn_war`, `minotaur_roar` | |
| first_blood / hero_down / lead_change | `stinger_*` (rate: 1 per 15 s) | |
| chicken_tantrum, trojan_reveal, throne_sit | `chicken_rage`, `horn_charge`+`wood_crack`, `stinger_funny` | humor |
| crowd reactions (colosseum) | `crowd_cheer_*`, `crowd_gasp` on kill clusters (rate 1 per 3 s) | |
| UI events | UI cues; `ui_place` on unit place with +/-4% pitch jitter by unit mass | |

## 5. Music
- Moods: `menu`, `editor`, `battle` (per theme: greek/roman -> heroic orchestral; egypt/persian -> eastern; barbarian/alpine/styx -> dark drums; mythic/olympus -> choir epic; carthage -> brass), `victory`, `defeat`, `comedy` (silly track when a battle is mostly chickens/goats or `chaos` rules).
- One track per battle chosen by arena theme + shuffle; **intensity** (0..1 from alive ratio, kills/s, hero events, time) maps to lowpass cutoff 1.8 kHz -> 18 kHz and gain -6 -> 0 dB (smoothed 1.5 s). No stem switching. Stingers (`stinger_*`) overlay with ducking. Tracks with `loop:true` use `loopStart/loopEnd`; others loop by scheduling the next playback to start 3 s before the end with an equal-power crossfade. Menu <-> battle transitions crossfade 1.5 s.
- Build-time loop validator reports seams (RMS and zero-crossing continuity over the wrap); failing tracks are flagged `loop:false` (crossfade-looped).

## 6. Verification hooks
`window.__vw.audio = { state, ctxState, masterRMS, busRMS:{music,sfx,ui,announcer}, voices, voiceDrops, loaded:{embedded,fetched,synth,failed}, cueCounts, music:{track,mood,intensity} }`. Tests: after the first gesture `ctxState==='running'` and `busRMS.music > 0.001`; scripted 300-unit battle through an `OfflineAudioContext` renders to WAV; ffmpeg `ebur128`/`astats` assert master true-peak < -1 dBFS, zero clipped samples, loudness within -18 +/- 3 LUFS; per-event cue firing counts logged; asset ledger check (every shipped file has a ledger row with author/licence/source).

## 7. Speech (TTS announcer)
Optional, default OFF, labelled experimental. Rate-limited (max 1 utterance per 6 s, priority events only, skipped at speed > 2x), voice picker + test button, `speechSynthesis` volume cannot be routed through WebAudio so ducking is approximate (stated in the setting's tooltip). The text announcer UI is the primary channel.

## 8. Synth fallback (`synth.js`)
Short procedural recipes (noise bursts with filters, FM clicks, saw/square brass for horns, sine sweeps) for every family so a failed fetch is not silence; flagged as synth in diagnostics; never used where a real asset loaded.
