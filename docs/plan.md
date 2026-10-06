# plan.md (v2) — VOXELWARS

v1 was a feature inventory. The Socratic review (docs/q.md, 79 questions) was right: it lacked sequencing, contracts, budgets and a way to see motion. v2 is a program. Every decision below cites the question it answers (Qn).

## 0. Facts that shape everything
- Hosted as a claude.ai Artifact. The tool contract says: scripts only from cdnjs / cdn.jsdelivr.net/npm / unpkg; fonts only from Google Fonts; supporting `files` published beside the page can be `fetch`ed by relative URL; the page is a FRAGMENT that the platform wraps (Q7). No `alert/confirm/prompt`, no downloads, sound after gesture, storage may throw, clipboard may reject.
- I cannot run the hosted page myself (it runs in the user's browser), but the Artifact `db` capability lets an owner's visit write documents that I read back with `ArtifactData`. So: the game ships an in-game **Diagnostics panel** (WebGL2, audio state, storage, fetch of published assets, codec support, CSP violations, FPS, draw calls) with a copy button, an **owner-only diagnostics beacon** (opt-out) that writes one capped `diag/*` document per visit, and every optional subsystem has a fallback so a wrong assumption degrades instead of white-screening. A T0 publish rehearsal (real artifact + >=100 asset files) validates the hosted fetch path early.
- Tooling here: headless Chromium (SwiftShader WebGL2 works, screenshots readable), Node 22, ffmpeg (libmp3lame, libvorbis, libopus), esbuild + playwright-core installed. No Firefox/WebKit. SwiftShader fps is meaningless; only CPU budgets, draw calls, triangle counts and correctness are measured (Q68).

## 1. Delivery tiers and gates (Q1, Q2, Q6)
Each gate: all of its verification.md criteria pass -> commit + push -> publish/republish the SAME artifact URL.
- **T0 "It's a game" gate**: title (voxel logo + live diorama) -> Quick Battle (pick arena, pick armies from the core roster, place, fight) -> results. Real renderer, real sim (formation, targeting, melee/ranged, projectiles, death debris), real audio (SFX + music), diagnostics, fatal-error path. PUBLISH #1.
- **T1 "Content"**: full roster (§3), 12 arenas, props + staged destruction, all abilities, god powers, Take Command, camera modes, juice system, HUD, announcers + humor, Survival, Campaign (9 missions), Codex, achievements/stats/settings/credits, in-house bloom. PUBLISH #2.
- **T2 "Creators"**: Arena Builder, Soldier Workshop (blueprint editor + 3D/slice voxel painter), save/load/share codes, undo, validation. PUBLISH #3.
- **T3 "Polish"**: balance harness + fuzzer, FTUE/tutorial, perf pass, a11y, humor editor pass, final QA. FINAL PUBLISH.
Commit and push at every gate and at least after each major merge.

## 2. Architecture decisions that answer the review

### Rendering (Q11, Q14-Q22)
- **VoxSkin instancing** (replaces per-part meshes): one merged geometry per unit TYPE with a per-vertex `aPart` index; one `InstancedMesh` per type; per-instance part matrices (3x4 affine, 3 RGBA32F texels per part) in a DataTexture fetched with `texelFetch` (WebGL2 required, checked at boot). Draw calls = unit types (+ same for the shadow pass with a matching `customDepthMaterial`). Custom soldiers compile to the same form. Per-battle cap of 16 distinct types, shown in the placement UI.
- Explicit `customProgramCacheKey` per material variant; `renderer.compile()` warm-up of all variants behind the loading screen; shader-error reporter in Diagnostics (Q16).
- Zero-allocation matrix composition; `DynamicDrawUsage`; swap-remove on death; CPU distance/frustum culling and compaction before upload since r128 does no instance culling (Q15). Animation LOD: full / half-rate / frozen / skip when culled (Q36).
- **Colour pipeline**: linear vertex colours, sRGB output, tone mapping done once. In-house post (`render/post.js`, ~200 lines: HDR RT -> bright-pass -> blur chain -> composite with ACES, bloom, vignette, FXAA-ish edge smoothing, optional outline-by-depth off) replaces the jsDelivr examples chain (Q11); zero CDN dependency for post. Colour-match test: palette swatch identical with post on and off.
- Shadows: one directional map fitted to the camera focus region, texel snapped, normalBias, shadow distance LOD, blob-shadow fallback on Potato (Q18).
- Terrain: integer heightfield, 0.5u cubes, max step for walking 1.0u, ground-follow smoothing for units, nav rebuilt incrementally in the affected region after craters/collapse, chunk-seam AO test (Q19).
- Readability (Q20): per-faction silhouette rules (helmet crests, shield shapes, banners), >=30% of visible soldier surface team-coloured via tint-mask voxels, optional outline, strategic zoom icons beyond a distance, health bar policy, colour-blind palettes.
- FX budgets (Q21): ring-buffered instanced pools: debris 6k (tier-scaled), particles 2k, damage-number glyph quads 400 (texture atlas baked after `document.fonts.load`), corpse policy (N bodies then sink/fade), cleanup at battle end.
- Lifecycle (Q22): dispose discipline, context lost/restored rebuild, battle x20 memory-stability test, autoscaler with hysteresis, first-run micro-benchmark choosing starting tier and unit cap.

### Look-dev gate (Q17, Q74, Q76)
Before any content is mass-produced: one hero soldier + terrain under three lighting rigs, approved from screenshots against written criteria; then freeze `render/style.js` (light rig, AO, palette), `docs/style.md` (voxel density per body class, silhouette rules, UI kit, motion language, tone sheet).
Art direction: **"Toy-box Olympus"**: playful, saturated, high-contrast cartoon: sky gradients, cool marble white, lapis/cobalt vs crimson teams, gold trim, thick indigo outlines and hard offset shadows on chunky sticker-like UI panels (not the default bronze/terracotta look). Display face Bungee, body Rubik, epigraph Cinzel; real fallbacks; text announcer UI with portraits and blips.

### Animation (Q32-Q36) — "from the internet"
- **Clip system**: baked keyframe clips (30 fps Euler per part, root offset, meta: hit frame, recover frame, loop) shared by the sim (pure data, no render imports) and renderer. Crossfade blending (0.12-0.2 s), playback-rate scaling to move speed, additive hit-flinch overlay.
- **Real clips**: retarget Quaternius Universal Animation Library 1/2 (CC0) onto the voxel humanoid rig by direction-based retargeting (spike running now; verdict gates adoption). Filmstrips are read by me before adoption.
- **Authored clips**: for beasts, siege, quadrupeds, special attacks and anything UAL lacks, a keyframe/curve DSL (`anim/dsl.js`) with eases, anticipation/overshoot/follow-through. Contact sheets (filmstrips) auto-generated for review; foot-slide and joint-range metrics.
- Rig: humanoid has thigh/shin and upper/forearm segments (11 body parts + weapon/offhand/back/cape/crest). One quadruped rig with proportion parameters serves horse, camel, centaur body, warhound, goat, Sphinx, Trojan Horse. Bespoke rigs capped at: elephant, chariot, catapult, ballista, chicken, scarab swarm.
- GSAP/CDN tweens drive UI and camera moves only; claimed honestly.

### Simulation (Q23-Q31)
- Fixed 30 Hz step, previous/current snapshots for interpolation, max 5 catch-up ticks, pause on blur, hit-stop as local time-scale on involved entities + camera, global slow-mo as sim-speed ramp, injectable clock for tests (Q28). Sim never imports render/anim code; clip timing is data (Q34).
- **AI in layers** (Q23): strategic (squad orders/objectives), tactical (target scoring with persistence/hysteresis, role rules, engagement slots/attack tokens so back ranks participate, reach rules for spears) and movement (per-team flow field + local avoidance + formation slots). Hard-collision fallback vs props. Metrics in tests: heading flips per unit-second, overlap ratio, idle-in-contact fraction, stuck units, wall penetration (Q24).
- **Termination** (Q25): stalemate watchdog with escalating funny interventions; fuzz test of 2,000 random matchups x arenas must end.
- **Mechanics table** with formulas and a unit test + visible feedback each (Q26): spear wall vs cavalry, shield block arcs, charge momentum, elephant trample, friendly fire, backstab, armor types.
- Determinism promise (Q27): same-browser reproducible given setup+seed; share codes carry setup+seed+rules only; separate RNG streams (sim/fx/ui); sim avoids transcendental calls (LUT sin/cos).
- Budget (Q29): <=3 ms/tick at 500 units on a mid laptop-class CPU (measured in Node as a proxy), staggered AI, no per-tick allocation (heap growth test); sim stays on the main thread (written reason: snapshot interpolation + determinism simpler; revisit if budget fails).
- Unit caps per tier: Potato 150 / Papyrus 300 / Marble 500 / Olympian 800; headless sim tested at 1000.
- Complexity budget (Q31): <=20 abilities, each with trigger, AI cast rule, telegraph VFX, sound cue, announcer hook, test; anything without a visible telegraph is cut. Difficulty tiers defined by behaviour (target quality, formation discipline, ability use, reaction delay, composition quality), not stat multipliers (Q66).

### Audio (Q37-Q44)
- Single runtime format **MP3** (Safari-safe). Hybrid delivery (Q8): a **core pack** (~30 essential SFX + 1 music track) embedded in the bundle as base64 (guaranteed), the rest published as files beside the page and fetched lazily; a synth fallback covers anything missing, and Diagnostics shows exactly which path each asset took.
- Decode only current + next music track; SFX decoded lazily in groups; ceiling on decoded memory per tier.
- Music director: one track per battle (chosen by arena/faction) + low-pass/gain intensity + stingers; bar-quantised only where BPM is known; crossfade loop at track end (no reliance on encoder gapless); build-time loop-seam validator (Q39, Q40).
- Mix: master compressor + limiter, buses (music/sfx/ui/announcer), voice budget 32 with priority, distance attenuation + pan, ducking; offline mix test rendering a scripted battle through OfflineAudioContext to WAV then LUFS/peak/clip counts via ffmpeg (Q42, Q71).
- Gate: "PRESS ANY KEY TO ENTER THE ARENA" splash is the user gesture; resume on focus; visible mute state; iOS-mute-switch unlock trick; tests run WITHOUT the autoplay flag (Q43).
- TTS announcer: default OFF, experimental label; text bubbles + portrait announcer are the primary channel (Q44).
- Coverage matrix event -> asset(s) with >=3 variants for core events; synth only where a category is truly empty and listed in docs (Q41). In-game credits generated from the asset ledger; build fails if a shipped asset lacks a ledger row (Q79).

### Boot, packaging, errors (Q7-Q10, Q13, Q75)
- Build emits a FRAGMENT for the Artifact tool (title, style, scripts) plus a standalone HTML for local/other hosting.
- Staged boot: tiny inline loader (logo + progress) first; inline loader script loads three with CDN fallback chain cdnjs -> jsDelivr -> unpkg (same pinned version); capability check (WebGL2, float textures, instancing); full-screen fatal-error panel with copyable diagnostics and a "safe mode" retry; `renderer.compile()` warm-up behind the loading screen; budgets: time-to-title <=4 s, time-to-interactive <=8 s on throttled Chromium.
- esbuild alias maps `three` to `window.THREE`; build fails on a real three import; DEBUG flags stripped and asserted off; agents never read dist/base64 blobs (use size reports).

### Input, UI, accessibility (Q12, Q45-Q49)
- Pointer events everywhere; pointer lock optional (drag-look fallback); wheel/keys `preventDefault` when canvas focused; `touch-action:none`; visible "click to focus" state; Esc and pause survive pointer-lock exit; Ctrl/Cmd for undo.
- Device matrix: phone = Quick Battle, Survival, Campaign, Codex, Settings, gallery of custom content (read-only); tablet+ = Arena Builder, Workshop (explicit friendly notice on phones, no dead buttons).
- Designed FTUE: "Quick Fight" in 2 taps within 30 s of the gesture, guided placement tutorial on first Sandbox, Simple/Advanced toggle, contextual hints with "don't show again", controls overlay on `?`/`H`.
- Spectator HUD spec: army strength bars, per-type counts, kill feed, timer, objective tracker, speed, minimap/radar, hover/selection card, rally/orders, who's-winning meter; <=10 Hz text writes; transform/opacity-only tweens; pooled floating text.
- Accessibility decisions: IN = reduce motion, shake %, flash limiter, subtitles for announcer, UI scale, colour-blind palettes, focus-visible + ARIA on menus, key rebinding for camera/speed/pause; OUT (documented) = gamepad.
- Camera: shot grammar (establishing, follow, orbit hero, kill-cam), cut cooldowns, spring-damped smoothing with jerk limits, terrain/prop collision, filmstrip + jerk-metric test of a scripted path (Q50).
- Take Command: choose a unit, WASD/touch-stick move, click/tap attacks nearest/aimed enemy, 1-3 abilities, over-the-shoulder follow cam without pointer lock (Q cut 5).

### Editors & persistence (Q51-Q58)
- Persistence layers: localStorage -> `db`-less memory fallback with a visible "Not saving" indicator, share-code export as universal backup, `downloads.save` where available. Size accounting per key, quota-exceeded UX, tiny thumbnails (<=6 KB).
- Versioning: immutable ids with tombstones, schema `version` + migrations tested on fixtures, in-battle setup autosave, `claude.hot.snapshot` wiring.
- Share codes: magic + version + CRC32, RLE + deflate-raw via `CompressionStream` with a pure-JS fallback, base64url, size caps and displayed length, chunked textarea with copy + paste-box fallback. Importer = strict schema validator that clamps/rejects with human messages, `Object.create(null)` parsing, `textContent` only, length limits; fuzzed (1000 mutated codes) in tests (Q52, Q53).
- Arena Builder: brushes (raise/lower/smooth/flatten/paint/stamp), symmetry, props with rotate/scale, spawn zones, hazards, water/lava level, weather/time, command-pattern undo (100 steps, delta-compressed), validators (zones reachable, objectives in bounds) with fix-it messages, instant Playtest returning to the editor with state intact.
- Soldier Workshop: blueprint editor over fixed part grids with declared anchors; stat caps with diminishing returns + cost model clamp; ability legality by weapon/body class; collider derived from voxel bounds with caps; **voxel painter** with pencil/erase/fill/line/box/eyedropper, mirror axes, palette management, 3D view + 2D slice view, undo/redo, pointer-event tests. Custom-soldier fuzzer flags outliers (Q54, Q55, Q30).

### Design: core loop, pacing, humor-as-systems (Q59-Q66)
- Battle target length 60-120 s with a pacing governor; mid-battle agency (god powers on cooldown, rally/order commands, reinforcements, Take Command); objective variety changes placement decisions; one-key Rematch/Tweak/Retry; epic-moment kill-cam.
- Juice significance system (Q61): only hero / kill-of-note / near-camera / player-relevant events trigger hit-stop, shake, slow-mo, with global caps and cooldowns; shake = damped spring; reduce-motion honoured.
- **Systemic gags (>=10, each with sim rule + animation + sound + announcer hook)** (Q63): Sacred Chicken tantrum, Philosopher filibuster (stuns crowds with a monologue), Senator filibuster, Trojan Horse reveal, Battle Goat charge, Medusa gaze statues (units turn to stone voxels), catapult misfires launching the wrong thing, Zeus ragequit on stalemate, wine rain, Spartan "THIS IS SPARTA" kick punting units (knockback ragdoll), the Immortals who are not, Pharaoh's throne sit, Hannibal's elephant gets scared by a mouse (cut if time).
- Comedy bible (voice sheets: Brutus excitable Roman, Plato dry philosopher, Cassandra always right/always ignored; running gags and callbacks; forbidden clichés), tone rule: joke at institutions, myths, bureaucracy and battlefield physics, never ethnicity or religion (Q65); editor rubric (specific, surprising, <=12 words for bubbles); recency-memory line selection with per-category cooldowns; a Node script reports repetition in a simulated 20-minute session; ~90 sharp announcer lines, ~40 tips, ~24 achievements (Q62).
- Event catalog with payloads and rate limits is part of spec.md (the contract between sim and humor/audio) (Q64).
- Campaign: 9 missions (3 acts x 3), objective types limited to Eliminate / Kill the General / Hold the Hill / Protect the VIP (goat) / Survive waves; par budgets, scripted bots (greedy, counter-pick, turtle) must win at least once and lose at least once; stars require different strategies (Q60).

## 3. Scope after the review (accepted cuts are honest roadmap items, not stubs)
Kept: 38 units, 7 factions, 12 arenas, Sandbox/Quick Battle, Survival, 9-mission Campaign, Arena Builder, Soldier Workshop + voxel painter, Codex, Achievements, Stats, Settings, Credits, Diagnostics, Take Command, god powers.
Roster (all humanoids are Blueprints; bespoke models listed in plan §2 rigs): Hellenes — Hoplite, Spartan, Peltast, Cretan Archer, Companion Cavalry, Philosopher, Strategos (hero). Romans — Legionary, Pilum Thrower, Centurion, Gladiator, Equites, Ballista, Senator. Egyptians — Medjay Spearman, Nubian Archer, Khopesh Warrior, Chariot Archer, Mummy, Anubis Guard, Priest of Ra, Pharaoh (hero). Persians — Immortal, Sparabara Archer, Cataphract, Camel Rider, King Xerxes (hero). Carthaginians — War Elephant, Numidian Skirmisher, Catapult, Hannibal (hero). Barbarians — Berserker, Axe Thrower, Druid, Warhound, Chieftain (hero). Mythic — Minotaur, Cyclops, Medusa, Centaur Archer, Trojan Horse, Sacred Chicken, Battle Goat. God powers: Zeus Lightning, Meteor, Earthquake, Heal Wave, Wine Rain.
Deferred (said so in the final message, on the roadmap screen): flying units (Harpy), Cerberus/Hydra, full-battle replay (kill-cam kept), phone editors, gamepad, weather-driven gameplay beyond 2 modifiers (rain douses fire, snow -10% speed), unlimited unit types per battle (cap 16).

## 4. Process and ownership (Q72-Q75)
- `docs/spec.md` = frozen contracts v1 BEFORE any agent starts: Blueprint JSON schema, ModelDef/Rig/Clip interfaces, snapshot format, event catalog + payloads, audio cue ids, save schema, UI kit tokens/components, registries (auto-globbed), file ownership map, contract-test validators.
- `docs/verification.md` = ~150 numbered checkable criteria written BEFORE building; every gate references it (Q4).
- Ownership: coordinator (me) = engine, sim core, app shell, integration, gates; Agent-Units = humanoid parts + blueprints + unit roster data; Agent-Beasts = quadruped/elephant/chariot/siege/bespoke models + clips; Agent-Anim = clip DSL + authored clips + retarget integration; Agent-Audio = audio engine + music director + cue map; Agent-Humor = comedy bible + announcer + tips + achievements + briefings; Agent-UI = UI kit + screens + HUD; Agent-Editors = arena builder + workshop + painter; Agent-QA (independent reviewer, reads diffs, runs criteria, does not build).
- Registries are generated by the build from globs; no hand-edited barrels. Each agent works in its own directory; a gate script (`node --check`, tests, esbuild, boot smoke, contract validators) must pass before hand-back. Sub-agents work in git worktrees where they touch shared files.

## 5. Verification (Q67-Q71)
- Objective proxies per axis: motion (foot-slide, joint range, filmstrips, camera jerk), audio (LUFS, peak, clip count, loop seams, per-event cue counts via `window.__vw.audio`), perf (CPU ms p50/p95, draw calls, triangles, heap, `renderer.info`), UX (time-to-first-battle, tap sizes, contrast, overflow scanner), game (battle length distribution, win-rate matrices, stalemate rate, fuzz termination).
- Test hook `window.__vw` (step N ticks, render frame, set seed, dump metrics, inject clock). Golden-image diffs for seeded scenes. Fail on any console error/warn, CSP violation event, 4xx/5xx, unhandled rejection; one run with CDN blocked to verify the fatal-error screen; one run with default autoplay policy.
- Review protocol: contact sheets per category (all units, all arenas, all screens x 3 viewports) read against a written checklist.
- Honest "unverified" list for the final message: real-GPU frame rate, audibility of audio, non-Chromium browsers, hosted-wrapper behaviour beyond the documented contract.

## 6. Risks (updated)
R1 CSP/wrapper behaviour differs from docs -> Diagnostics + fallbacks + hybrid audio. R2 perf -> VoxSkin, budgets, tiers, caps. R3 animation quality -> retarget spike + filmstrips + authored fallbacks. R4 integration drift -> spec first, contract tests, ownership, gate script. R5 comedy quality -> bible + rubric + repetition script. R6 sub-agent context/budget -> small, contract-bound packages with explicit acceptance tests. R7 session death -> tiers + commits + early publishes.


---
# v2.1 amendments (after review round 2; these override earlier sections of this file)

## A. Tiers, re-cut (T0 is genuinely small; T1 split)
- **T0 "Boots and fights"**: loader/fatal panel + diagnostics; splash gate; title with voxel logo and live diorama; Quick Battle on 3 arenas (marathon, thermopylae, nile) with ~12 units (hoplite, spartan, cretan_archer, companion_cavalry, legionary, equites, medjay, nubian_archer, war_elephant, berserker, minotaur, sacred_chicken) using the real renderer, sim, death debris, core SFX + 1 music (fetched, synth fallback), placement (basic brushes), results. Real publish #1 (rehearsal of the files path). Retargeted locomotion/sword clips adopted only if they pass A3; otherwise authored fallbacks ship at T0.
- **T1a "The roster game"**: all 43 units, 14 arenas + props/destruction, abilities, god powers, HUD, juice, cameras, announcers, quick battle complete, in-house post, LOD, results lessons, scout report. Publish #2.
- **T1b "The wrapper"**: campaign (9), survival, daily, puzzles, mutators, codex, achievements, stats, settings, credits, choreography. Publish #3.
- **T2 "Creators"**: Arena Builder, Workshop + Voxel Painter, share/files, undo, validation. Publish #4.
- **T3 "Polish"**: balance harness runs + fuzzers, fun metrics, FTUE, perf pass, a11y, COMEDY-EDITOR pass, persona playtests, negative controls, final QA. FINAL publish.

## B. Agent roster and order
Phase 0 (now): COORD (render/app/save/gates), AUDIO-HUNTER (running), ANIM spike (running).
Phase 1 (parallel, contract-bound): **SIM** (abilities, objectives, god powers, hazards, armygen, waves, power, lessons, mutators, balance harness), **UNITS-LIB** (humanoid parts library + compileSoldier + contact-sheet tool), **BEASTS** (quad1, elephant, chariot, siege, chicken, trojan + crews), **PROPS** (40 prop models, staged damage, crowd), **ANIM** (animator + clip DSL + authored clips + UAL integration), **AUDIO** (runtime engine, music director, cues, synth), **HUMOR** (comedy bible, announcer templates, units text, tips, achievements, names), **UI** (kit + screens + HUD).
Phase 2: **UNITS-A / UNITS-B** (faction blueprints once the parts library is frozen), **CAMPAIGN** (missions data + teaching beats), **EDITORS-A / EDITORS-B**, **COMEDY-EDITOR** (fresh context), **QA** (read-only gate reviewer + persona playtests).

## C. Cut ladder (what goes first if time runs out, with the honest roadmap wording)
After T1a: 1 Puzzle Challenges, 2 Daily Skirmish, 3 achievements 24 -> 16, 4 mythic roster 7 -> 4 (keep minotaur, chicken, goat, trojan horse), 5 arenas 14 -> 10 (drop oasis, cyclops, carthage, persepolis), 6 Survival boss waves, 7 Codex props/arenas tabs. After T2: 8 arena-builder symmetry modes, 9 painter onion skin, 10 `.vwarmy` files. Never cut: audio/credits, diagnostics, fatal-error path, saves, the 12 T0 units, Take Command, announcers (reduced), campaign missions 1-6.
The final message names every cut as "deferred (roadmap)", never as shipped.

## D. Decisions recorded
Saves device-local by design (+ Export all). Hit-stop render-only. No neutral team. Economy: cost scale unchanged; budgets/caps rescaled (spec §2). Soldier 2.9 u tall, voxel 0.1, radius 0.55. Post HDR path at every tier (post.js before the look-dev freeze). Audio: SFX core embedded (<= 450 KB), music fetched. UNITS split in two after the library freeze. Fairness test: symmetric arenas only, n >= 400.
