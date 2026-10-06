# plan.md (v1) — VOXELWARS

Guiding question: *"How would an AGI-grade game studio, with one shot and a single-file hosting constraint, ship this?"*
Answer: **data-driven everything, one shared pipeline for all content, a deterministic testable sim, and verification by playing it.**

## 0. Non-negotiable constraints discovered in the environment
- Hosted as a claude.ai Artifact. CSP: scripts only from cdnjs / cdn.jsdelivr.net/npm / unpkg / tailwind / jquery; styles/fonts only Google Fonts; NO external images/media/fetch. So **all audio/images are embedded as data** inside the page (<= 16 MB total; budget ~11 MB).
- Three.js (UMD, cdnjs) + GSAP (cdnjs) are loaded from CDN; the game must degrade gracefully if an optional CDN script (postprocessing from jsDelivr, GSAP) fails.
- No `alert/confirm/prompt`, no downloads/print, sound only after a user gesture, localStorage may throw (wrap + memory fallback), clipboard may reject (fallback to select-text box).
- I cannot hear or see a real GPU here. I CAN run headless Chromium with SwiftShader WebGL, take screenshots and read them, run Node sim tests, run ffmpeg analysis of audio.

## 1. Architecture (ES modules -> esbuild -> single HTML)
```
src/
  core/     util.js rng.js events.js store.js (localStorage+memory) math.js tween.js (GSAP wrapper+fallback) i18n-less
  voxel/    grid.js (VoxelGrid, palette), mesher.js (face-culled + per-vertex AO + team mask), dsl.js (box/sphere/cyl/line/carve/mirror helpers), text3d.js (voxel title lettering)
  render/   engine.js (renderer/scene/lights/sky/fog/post/quality), terrain.js (chunk meshes, water, lava, craters), instancing.js (InstancedMesh groups per model-part, team color, flash), fx.js (particles, debris physics, trails, decals, damage numbers), cameras.js (orbit/follow/possess/cinematic/photo/touch), props.js (static prop instancing, destruction)
  sim/      world.js (entities, fixed-step loop), spatial.js (hash grid), nav.js (cost grid + flow fields), ai.js, combat.js, projectiles.js, abilities.js, status.js, morale.js, objectives.js, godpowers.js, rules.js, stats.js (cost model)
  content/  era_ancient/ {factions.js, units.js (blueprints), parts_humanoid.js, parts_beasts.js, parts_siege.js, props.js, arenas.js, campaign.js, humor.js, announcer.js, achievements.js}
  anim/     rig_humanoid.js rig_quadruped.js rig_siege.js rig_flyer.js mounts.js (procedural clips: idle, walk, run, attack styles, block, hit, stun, death, cheer, taunt, cast)
  audio/    engine.js (WebAudio graph, buses, voice limiter, spatial pan/attenuation, ducking), sfx.js (bank + synth fallback), music.js (mood director, crossfade, loop), speech.js (TTS announcer), data.js (generated base64)
  ui/       kit.css, kit.js (buttons, panels, tooltips, toasts, modals, sliders, tabs), screens: title, main menu, battle setup/placement, hud, pause, results, codex, armory, settings, credits, campaign map, arena editor, soldier workshop, voxel paint editor, achievements, stats, loading
  app/      main.js (state machine: boot -> title -> menus -> setup -> battle -> results), save.js (schemas, versioning, share codes), perf.js (autoscale), input.js, achievements runtime
tools/      build.mjs, balance.mjs (headless sim matrix), smoke.mjs (Playwright), audio tools
assets/     audio/ vfx/ manifest.json CREDITS.md (from the asset hunter agent)
dist/       voxelwars.html (the artifact)
docs/       e.md plan.md q.md spec.md verification.md
```

## 2. The unifying idea: ONE content pipeline
Every humanoid in the game (hoplite, pharaoh, minotaur, **and the user's custom soldier**) is a *Blueprint* (JSON) compiled by the same `compileSoldier()`:
`Blueprint -> part builders (head/torso/legs/arms/weapon/offhand/back/cape) -> VoxModel (named parts + pivots + palette + team mask) -> mesher -> InstancedMesh group`.
Beasts/siege/monsters use the same VoxModel + rig interface with bespoke builders. Mounted units compose `mount + rider blueprint(s)`.
Consequences: Workshop = a UI over the shipped data; custom units are first-class; adding the Medieval era later = adding a content folder.

## 3. Feature inventory (ALL ship; none are "stretch")
### Modes
1. Quick Battle / Sandbox (setup -> place -> fight), all units unlocked.
2. Campaign "The Ancient Era": 12 missions in 3 acts, briefings w/ humor, objectives, 3 stars each, progress saved.
3. Survival (endless waves vs escalating, silly waves) with leaderboard-of-self.
4. Arena Builder (full terrain editor) + Arena library (presets + user saves + share codes).
5. Soldier Workshop (blueprint editor + 3D voxel part painter) + roster library + share codes.
6. Codex (every unit/faction/prop with 3D turntable, stats, lore, jokes), Achievements (30+), Stats, Settings, Credits.

### Battle experience
- 50+ unit types over 7 factions (see §4). Placement: palette, budget, brush modes (single/line/block/scatter), formations, orders (Charge/Hold/Defend/Flank/Skirmish), mirror, auto-generate enemy with difficulty & composition style, undo/redo, save/load army presets, countdown, horns.
- Sim: 30 Hz fixed step, 0.25x-4x speed, pause, step. AI targeting + steering + flow-field navigation around water/cliffs/props, separation, formation hold, projectile ballistics with lead, melee windup/hit/recover synced to anim, shield arcs, knockback + mass, charge bonuses, anti-cavalry spear walls, status effects, morale/rout, abilities (30+), heroes w/ ultimates, god powers (Zeus Lightning, Meteor, Earthquake, Heal Wave, Raise Chickens, Wine Rain...), destructible props, craters, hazards, weather effects (rain slows fire, snow slows units).
- Possess mode ("Take Command"): WASD + mouse third-person control of any soldier, attack/dodge/ability.
- Camera: RTS orbit, follow, possess, cinematic auto-director, top-down, photo mode; touch support.
- Juice: hit-stop, screen shake, FOV kick, slow-mo on epic kills, voxel debris, dust, sparks, blood/wine/confetti/off, damage numbers, speech bubbles with last words, banners, crowd cheering in colosseum.
- Win conditions & objectives: Eliminate, Kill the General, Hold the Hill (timer), Protect the VIP (a goat), Destroy the Catapults, Survive N waves, Time limit, Gold-limited.

### Audio/Music
- Real internet SFX (variants, pitch jitter, positional pan, voice limiter) and real music (menu/editor/battle low-mid-high/victory/defeat) via embedded data; synth fallback per category; dynamic intensity director; ducking; 4 volume sliders; credits in game.

### Humor layer (written, not generic)
- Unit blurbs + death quotes (3+ each), loading tips (60+), tooltips, two-and-a-half announcers (Brutus excitable Roman, Plato dry philosopher, Cassandra who is always right and always ignored), 150+ event-aware lines w/ templating, achievements, campaign briefings, funny stats, funny quality names (Potato/Papyrus/Marble/Olympian), random name generator, TTS optional.

### Studio feel
- Voxel 3D logo, live battle diorama behind the menu, consistent UI kit, panel tweens, button sounds, loading transitions, pause menu, tutorial (first-run guided placement), contextual hints, settings (graphics preset + individual toggles, UI scale, reduce motion, screen-shake %, colorblind team palettes, volumes, speech), persistence, FPS/auto-quality, tab-blur pause, versioned saves with migration.

## 4. Roster (data-driven blueprints; every unit has stats, role, abilities, 3 death quotes, blurb, cost)
- **Hellenes**: Hoplite, Spartan, Peltast, Cretan Archer, Companion Cavalry, Philosopher, Greek-Fire Chucker, Strategos (hero), Achilles (hero, heel joke).
- **Romans**: Legionary, Pilum Thrower, Centurion, Gladiator (net+trident), Praetorian, Equites, Ballista, Senator (filibuster).
- **Egyptians**: Medjay Spearman, Nubian Archer, Khopesh Warrior, Chariot Archer, Mummy, Anubis Guard, Priest of Ra, Scarab Swarm, Pharaoh (hero), Sphinx.
- **Persians**: Immortal (revives once), Sparabara Archer, Cataphract, Camel Rider, Satrap (bribes), King Xerxes (hero, sits on throne).
- **Carthaginians**: War Elephant, Numidian Skirmisher, Sacred Band, Catapult, Hannibal (hero, eyepatch).
- **Barbarians**: Berserker, Axe Thrower, Druid, Warhound, Brute, Chieftain (hero).
- **Mythic**: Minotaur, Cyclops, Medusa, Centaur Archer, Harpy (flying), Cerberus, Trojan Horse (spawns troops on death), Sacred Chicken, Battle Goat, Zeus (hero).
Balance harness (`tools/balance.mjs`) runs thousands of headless duels/mass battles and prints cost-efficiency matrices; stats tuned until no unit is a degenerate pick.

## 5. Arenas (presets, all parametric generators + hand-placed props)
Marathon Plain, Thermopylae Pass, Colosseum (with voxel crowd), Nile Delta, Giza Plateau, Persepolis Courtyard, Carthage Harbor, Teutoburg Forest, Alpine Pass, Mount Olympus, Siege of Troy, Underworld (Styx), Cyclops Isle, Oasis Duel + blank Arena Lab + Random(seed). Weather: clear/rain/snow/sandstorm/fog/thunder. Time of day: slider + torches.

## 6. Rendering plan
- Three r128 WebGL. InstancedMesh per (model-part); custom `onBeforeCompile` for team tint mask + hit flash + per-instance dissolve. Meshes are greedy-less face-culled with vertex AO; palette jitter for texture feel.
- Terrain: 16x16 chunk meshes, top+side quads with layered strata colors, AO; water shader plane; lava emissive; craters rebuild chunk.
- Sky gradient dome + sun + voxel clouds; hemisphere + directional with shadow cascade-ish (single moving shadow map); fog; bloom + FXAA via jsDelivr examples (optional, tiered).
- Quality tiers (Potato/Papyrus/Marble/Olympian) + auto-scaler (pixel ratio, shadows, debris cap, post).

## 7. Sim plan
SoA-ish entity arrays; spatial hash; 2-cell nav grid with per-team multi-source BFS flow field (to nearest enemy) at 4 Hz; steering = seek + separation + obstacle avoid; target selection by role w/ stagger; attack state machine (idle/move/windup/strike/recover/stun/dead/rout); projectiles with ballistic solve; AoE; knockback; morale; abilities with cooldown & AI auto-cast; objectives; wave director; deterministic RNG seeded (replays & tests).

## 8. Build / Test / Verify
- `tools/build.mjs`: esbuild bundle -> inline into HTML template w/ CDN tags + base64 audio + fonts link -> `dist/voxelwars.html`; size report; CSP lint (no non-allowlisted URLs).
- Node: sim tests + balance harness + terrain determinism + save/load roundtrip + share-code roundtrip.
- Playwright (Chromium SwiftShader) with CSP-emulating server: boot with zero console errors; walk every screen with screenshots; run battles at 4x for a few minutes; check units die/projectiles/fx; measure frame time; place units, paint voxels, edit terrain, save/reload; run every campaign mission AI-vs-AI to verify solvable/not-broken; mobile viewport check.
- I read the screenshots myself and fix what looks off (the user's "simulate what the user would say").

## 9. Delivery
- Publish `dist/voxelwars.html` as an Artifact (private by default; user gets link).
- Commit all source, assets, docs, tools to `claude/cool-babbage-g7oakv`, push.
- Final message: link, how to play (controls), what is from the internet (with credits), honest gaps.

## 10. Work packages (parallelizable once spec.md contracts exist)
WP1 engine+voxel+render (me) | WP2 sim core (me) | WP3 humanoid parts + rigs + animation (agent) | WP4 beasts/siege/monsters + rigs (agent) | WP5 units/factions data + balance (agent+me) | WP6 audio engine + music director + integration of assets (agent) | WP7 humor corpus + announcer + achievements + campaign writing (agent) | WP8 UI kit + screens (agents) | WP9 editors: arena, workshop, voxel paint (agents) | WP10 build/test/QA (me)

## 11. Risks
R1 CSP/CDN breaks boot -> CSP-emulating local test + graceful degradation. R2 perf -> instancing, quality scaler, test at 800 units. R3 audio licensing -> only CC0/CC-BY, credits screen. R4 module integration drift -> spec.md interface contracts + integration smoke tests per merge. R5 scope -> everything data-driven so more content costs little. R6 size > 16 MB -> budgets and report in build.
