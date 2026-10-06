# q.md — Socratic review of plan.md v1 against e.md (no politeness)

Reviewer stance: the user's definition of done is KING. "Looks like a studio shipped it" is judged by a human opening ONE link, hearing audio, watching motion, and trying to break the editors. Everything below is aimed at the gap between "the plan lists it" and "a picky player / art director would sign off on it".

Verdict in one sentence: plan.md is an excellent *feature inventory* and a weak *program*. It has no tiers, no contracts, no budgets, no spikes, no way to see motion or hear sound, and an animation strategy whose "internet" component is a UI tween library.

---

## VERIFIED FACTS (I checked these; the plan should use them)

- three@0.128.0 `examples/js/postprocessing/{EffectComposer,UnrealBloomPass,...}.js`, `examples/js/shaders/{CopyShader,LuminosityHighPassShader,FXAAShader}.js`, `examples/js/controls/OrbitControls.js`, `examples/js/utils/BufferGeometryUtils.js` all return HTTP 200 on cdn.jsdelivr.net/npm. The cdnjs path `.../three.js/r128/examples/js/postprocessing/EffectComposer.js` returns 404 (cdnjs serves `build/` files; do not plan on cdnjs for examples). Bloom needs ~8 separate script requests in dependency order.
- three r128 UMD is byte-identical (603,445 B) on cdnjs, jsDelivr and unpkg. cdnjs's current three.js is 0.186.1, so r128 is a choice, not a constraint. The plan never says why r128.
- r128 source (read from the downloaded build): `InstancedMesh` constructor sets `frustumCulled = false` (so r128 does NO culling of any instance; in r151+ this flips to true and requires `computeBoundingSphere()` after moving instances: https://github.com/mrdoob/three.js/pull/18464 and https://discourse.threejs.org/t/solved-instancedmesh-dissapeared-because-of-frustum/53651). `Material.customProgramCacheKey()` defaults to `this.onBeforeCompile.toString()`, so two `onBeforeCompile` closures with identical source but different injected strings SHARE one compiled program. `outputEncoding` is taken from `renderTarget.texture.encoding` (Linear by default) whenever you render into a render target, while `toneMapping` is baked into each material's shader regardless of target: EffectComposer in r128 therefore gives you tone-mapped-then-linear-unencoded output unless you add your own sRGB pass.
- Safari decodes Ogg Vorbis/Opus only from 18.4 (https://caniuse.com/ogg-vorbis, https://github.com/bricedupuy/Songverse/issues/185). The raw assets collected so far are all `.ogg`.
- Environment: Chromium 1194 + headless shell only in /opt/pw-browsers (no Firefox, no WebKit). Playwright 1.56.1. ffmpeg has libvorbis, libopus, libmp3lame, aac. npm registry is reachable (esbuild 0.28.2). Hosts reachable through the proxy: quaternius.com, opengameart.org, incompetech.com, archive.org. freesound.org returns 403.
- Repo state: `git log` fails ("no commits yet"). `assets/audio/` and `assets/vfx/` are empty. `assets/raw/` holds 1,740 Kenney files only (RPG audio foley, impact sounds, UI/digital sounds, short jingles, casino, a voiceover pack of numbers/"mission failed", particle PNGs). There is no horn, crowd, catapult, arrow whoosh, elephant, chicken, goat, thunder or battle music in it. docs/spec.md and docs/verification.md are referenced by plan.md but do not exist.
- The Artifact tool contract visible in this session says: the file is wrapped in a doctype skeleton at publish time (write a fragment: `<title>`, `<style>`, scripts); supporting files can be published alongside the page via `files` (binary <=15MB each, <=511 files / 256MB per version) and `fetch()` of those files by relative URL works; Web Workers work from own files or `blob:` URLs; fullscreen and pointer lock are desktop-click-only and optional; clipboard may reject; `downloads`, `db`, `assets` runtime capabilities exist; `claude.hot.snapshot` exists so open viewers survive a republish. This directly conflicts with the "everything must be a data: URI inside <=16MB" premise the plan treats as law. Either the premise is wrong (huge win) or the viewer CSP is stricter than the tool text says (then it must be proven by a probe publish, not assumed). See Q7, Q8.
- Real "animations from the internet" that fit a voxel rig do exist and are CC0: Quaternius Universal Animation Library 1 (45 free clips: locomotion, death, combat) and 2 (130+ clips incl. melee/armed combos), on OpenGameArt: https://opengameart.org/content/universal-animation-library , https://opengameart.org/content/universal-animation-library-2 , https://quaternius.com/packs/universalanimationlibrary2.html . GLB format; parseable in Node with no dependencies. The plan does not mention them.

---

## TOP 10 DANGERS (ranked by probability x damage to "closest to perfect")

1. **"ALL ship, none are stretch" with no tiers, no ship gates, no early publish, zero commits.** If the session ends at 70%, the user gets nothing playable. (Q1, Q2, Q3, Q6)
2. **Eight parallel agents start with no contracts (spec.md does not exist), a shared working tree, and no style bible.** Result: drifted APIs, a build that one agent can break for all, and a game that looks like eight studios. (Q72, Q73, Q74)
3. **The headline request, "animations are cool", has no authoring method, no way to see motion, and its "animations from the internet" is GSAP.** Procedural sine-wave rigs read as wind-up toys; real CC0 mocap (Quaternius UAL) is sitting unused. (Q32, Q33, Q34)
4. **Verification is blind to motion, sound, real-GPU performance and feel.** SwiftShader screenshots + "zero console errors" can pass a game that stutters, sounds like mush and plays like a screensaver. (Q67, Q68, Q69, Q71)
5. **Performance architecture is unbudgeted and the "1000 units" claim is untestable here.** Per-type x per-part InstancedMesh draw-call explosion (worse with custom soldiers), r128 does zero instance culling, double cost for shadows, no CPU/draw-call/memory budgets. (Q14, Q15, Q16, Q29)
6. **Crowd AI will produce blobs, idle back ranks, jitter at flow-field boundaries, and unterminating stalemates.** "Flow field to nearest enemy + separation" is the start of an AI, not the AI; formations, flanks, spear walls and shield walls are each separate geometry problems. (Q23, Q24, Q25, Q26)
7. **Audio pipeline will fail in the places you cannot test: Safari codec support, 300MB of decoded PCM, unrelated-track "intensity" crossfades, missing asset categories, voice-spam clipping.** (Q37, Q38, Q39, Q41, Q42, Q43)
8. **No core-loop / pacing / humor-as-systems design.** The plan lists features, not what the player does for 90 seconds, why they replay, or how 700 AI-written jokes stay funny past battle three. (Q59, Q60, Q61, Q62, Q63)
9. **The packaging premise is unverified and the first-load experience is unbudgeted.** Fragment-vs-document wrapper, 12MB inline base64 before first paint, CDN or WebGL failure = white screen (a stated anti-goal), and the possible `files` hosting path that would remove the whole audio budget problem. (Q7, Q8, Q9, Q10)
10. **Three editors (arena, workshop, 3D voxel painter) plus custom soldiers are each a product, with undo, validation, share codes, cost-model exploits, rig attachment rules and persistence across republished builds, all described in one line each.** (Q51-Q58)

---

## QUESTIONS

### A. Scope, process, feasibility

1. You say all of §3 ships and none of it is stretch. If you run out of budget at 70%, which 70%? Which feature is the first to be cut, and who decided?
   Pill: A flat list with no priority order produces a broken everything, not a smaller perfect thing; "no MVP" cannot mean "no sequencing".
   Demand: Add ranked tiers T0 (title -> quick battle -> results, real renderer, real sim, real audio, published), T1 (roster/arenas/campaign), T2 (editors), T3 (extras), each with a written ship gate and a republish of the SAME artifact URL at every gate.

2. `git log` says there are no commits and nothing has been published. When does the first commit happen, when does the first hosted build happen, and what does the user see if the sandbox dies tomorrow?
   Pill: §9 puts publish and push at the very end; every gate before that is invisible and unrecoverable.
   Demand: Commit+push after every gate (and daily), publish a T0 build to the artifact URL as soon as the renderer boots, and keep `assets/raw` out of git (already ignored) while committing curated assets and a license ledger.

3. Do the arithmetic: 50+ units x (model, rig tuning, 3 death quotes, blurb, abilities, sound identity, codex turntable), 14 arenas, 12 missions, 30+ abilities, 30+ achievements, 150+ announcer lines, 60+ tips, 18 screens, 3 editors. What is the per-item "done" checklist and how many screenshot iterations does a voxel model need to stop looking like a lump?
   Pill: The real critical path is ~50 hand-tuned models and ~700 pieces of copy at 3-5 visual iterations each, not the engine.
   Demand: A per-unit Definition of Done (silhouette passes at 3 zoom levels, 8 clips filmstrip-checked, audio identity, copy, codex entry) and a unit count sized to what that checklist can really absorb (see CUT list).

4. Where are the acceptance criteria? plan.md and e.md say "verified by running it" and "no TODO", and list spec.md and verification.md that do not exist.
   Pill: "Verified by playing it" is a slogan, not a criterion; without a numbered checklist the builder grades its own homework leniently.
   Demand: Write docs/verification.md BEFORE building: ~150 checkable criteria (feature, screen, state, measurable threshold, how verified, who verifies) and make every gate reference it.

5. What are the five riskiest unknowns, and what is the Day-0 spike and kill criterion for each?
   Pill: The plan front-loads architecture and back-loads discovery; the first time you learn that instanced voxel soldiers, audio decode, or the hosted wrapper misbehave is after 20k lines exist.
   Demand: Spikes with pass/fail numbers: (a) hosted probe artifact (Q7/Q8), (b) 500 instanced voxel soldiers with rigs, CPU ms/frame and draw calls, (c) 300-unit crowd sim with the real AI loop, overlap and idle metrics, (d) audio decode + memory + loop seam on the real tracks, (e) retarget one Quaternius clip to the voxel rig and compare to the procedural walk.

6. The builder is one agent that personally owns WP1 (engine/voxel/render), WP2 (sim) and WP10 (build/test/QA) while supervising 8 sub-agents. Where does the review bandwidth come from?
   Pill: The single point of failure is the coordinator's context window; reviewing ~40k lines of other agents' output is the real job and nobody has budgeted it.
   Demand: Make ownership explicit, hand WP1 or WP2 to a sub-agent behind a contract, and add a standing independent reviewer role per gate (reads diffs, runs the criteria, reports; does not build).

### B. Packaging, CSP, boot, sandbox

7. The Artifact tool says the published file is wrapped in a doctype skeleton and you write the content only (title, style, scripts). plan.md §8 builds a full HTML document with a template, CDN tags and a fonts `<link>`. Have you ever published one page through the real wrapper to see what actually works?
   Pill: Every assumption in §0 (CSP, sandbox flags, WebGL, AudioContext, localStorage, pointer lock, clipboard, workers, relative fetch) is un-probed; a single wrong one invalidates a subsystem.
   Demand: Today, publish a ~5KB probe artifact that tests: three r128 from cdnjs + WebGL2 context, AudioContext start after click, localStorage, `new Worker(blobURL)`, `fetch('./probe.bin')` of a published file, `<audio src=data:>` and `blob:`, pointer lock, fullscreen, clipboard, `document.fonts`, `claude.use('db')`/`downloads` availability; record the results in docs and make the build emit a FRAGMENT (title in first 8KB, no html/head/body).

8. The given constraint is "all audio/images embedded as data, <=16MB". The tool contract says supporting files can be published alongside the page and fetched by relative URL (binary 15MB each, 256MB per version). Which is true for THIS viewer?
   Pill: If `files` works, the 11MB budget, the +33% base64 inflation, the 12MB inline string and the "pick 6 tracks" tradeoff are self-inflicted wounds; if it does not, the plan is correct but must prove it.
   Demand: Decide by the probe in Q7; implement the audio/image loader behind one interface (`loadBlob(id)` from either data URI or relative fetch) so the choice is a build flag, not a rewrite.

9. How long until the user sees the first pixel on a 20 Mbps connection with a ~12MB HTML file? What is on screen while it downloads, parses a multi-megabyte string literal, base64-decodes audio and compiles shaders?
   Pill: A white or blank page for 5-10 seconds followed by a frozen tab during shader compile is how a "studio" game gets closed.
   Demand: Staged boot: a <20KB inline loader (CSS + logo + progress) first in the file, CDN scripts in a defined order, audio data in non-blocking script blocks at the END, decode only after the first gesture, `renderer.compile()` warm-up behind the loading screen, and a measured time-to-title and time-to-interactive budget (e.g. <=4s / <=8s on throttled Chromium).

10. What does the player see if cdnjs is blocked, the user is behind an ad-blocker, WebGL2 is disabled, or a shader fails to compile on their GPU? §0 says "degrade gracefully if an optional CDN script fails" but THREE itself is not optional.
    Pill: White screen is an explicit anti-goal in e.md, and the plan has no fatal-error path.
    Demand: Script `onerror` fallback chain (cdnjs -> jsDelivr -> unpkg for the same pinned version), a visible full-screen error panel with cause and a copyable diagnostic, `webglcontextcreationfailed` handling, a capability check (WebGL2, float textures, instancing) before boot, and a 'safe mode' (lower quality, no post) retry button.

11. Why r128, and why bloom through the examples chain? Do you know what EffectComposer does to your colors in r128?
    Pill: In r128 the composer renders into Linear RTs with no sRGB encoding while tone mapping is baked per material, so adding bloom silently changes the whole palette (washed or dark) and costs 8 extra blocking requests, a mip chain of full-screen RTs and no MSAA; r128 also lacks later InstancedMesh and RT improvements.
    Demand: Either justify r128 in writing (e.g. stability with examples/js UMD) or pick a version deliberately; write ~150 lines of in-house bloom + final sRGB/tone-map + optional FXAA inside the bundle (zero CDN dependency for post), and add a color-match test (palette swatch must read identical with post on and off).

12. Which input paths survive the sandbox? Pointer lock/fullscreen are desktop-click-only and optional; the wheel can scroll the host page; keys go nowhere until the iframe has focus; Esc exits pointer lock; touch drags trigger pull-to-refresh.
    Pill: "Possess mode: WASD + mouse" and the orbit camera assume pointer lock and a captured wheel; both degrade in the hosted frame.
    Demand: An input layer spec: pointer-lock-optional (drag-look fallback), `wheel`/`keydown` `preventDefault` when focused, `touch-action:none` + `overscroll-behavior:none` on the canvas, a visible "click to focus" state, Esc/pause behaviour that survives pointer-lock exit, and Cmd vs Ctrl handling for Undo.

13. The build bundles ES modules with esbuild but three comes from a CDN global. What stops any module (or a sub-agent) from `import * as THREE from 'three'` and bundling a second 600KB copy?
    Pill: Two THREE copies = `instanceof` failures, duplicate shader chunks, and bloat that only shows up at runtime.
    Demand: esbuild alias/plugin mapping `'three'` to `window.THREE` (build fails on any real import), a bundle check that greps for three's signature, and the same for GSAP; `three@0.128.0` as a devDependency only for types/tests.

### C. Rendering (Three.js r128, instancing, shaders)

14. Count draw calls for a normal battle: 12 unit types x ~10 parts = 120 instanced meshes, x2 for the shadow pass, plus terrain chunks, props, FX, debris, UI quads. Now let the user field 10 custom soldiers.
    Pill: Draw calls become a function of user creativity; custom soldiers (each a unique part set) break the entire "instancing makes it cheap" story on phones and integrated GPUs.
    Demand: A draw-call and triangle budget table per quality tier; architecture that merges a unit type into ONE instanced mesh (bone index per vertex + per-instance pose in a DataTexture or packed attributes) or caps distinct unit types per battle with a clear UI message; custom soldiers compile to the same one-mesh form.

15. What is your per-frame instance-management plan in r128? `InstancedMesh.frustumCulled` is false (no culling at all), `instanceMatrix` is a plain `BufferAttribute` that defaults to static usage, `count` is fixed at construction, and a 1000-unit x 12-part battle uploads ~190k floats every frame.
    Pill: Without compaction, dynamic usage and partial updates you pay vertex cost for every off-screen and dead instance twice (main + shadow) and re-upload everything.
    Demand: Spec: `setUsage(DynamicDrawUsage)`, pooled capacity with growth rules, swap-remove on death, per-frame compaction of visible instances into `mesh.count`, CPU frustum/distance culling before upload, zero-allocation matrix composition (shared scratch objects), and a measured CPU ms for animation + upload at 500 and 1000 units.

16. What happens to your `onBeforeCompile` patches when: two materials use the same patch function with different injected code (r128 caches programs by `onBeforeCompile.toString()`), the shadow pass uses the stock depth material (so per-instance dissolve/pose is ignored in shadows), a unit type first appears mid-battle (shader compile hitch), or a real GPU rejects a shader SwiftShader accepted?
    Pill: These are all silent in a headless test and loud on a real machine: wrong colors from a cache collision, shadows that do not match the model, a 300ms freeze when the first elephant spawns.
    Demand: One material factory with explicit `customProgramCacheKey`, matching `customDepthMaterial`, a `renderer.compile()` warm-up for every material variant at load, an on-screen shader error reporter, and a unit test that builds every variant on every quality tier.

17. Where is the look-dev gate? What is the lighting model, sRGB/linear policy, AO strength, rim light, ambient color, fog and sky that make a 12-voxel-tall soldier look like Teardown-quality art instead of Minecraft-with-fog?
    Pill: Default three lighting on vertex-colored cubes looks flat and cheap, and "studio feel" is mostly lighting/color; nothing in the plan lets an art director approve the look before 50 units are modeled.
    Demand: A look-dev milestone: one hero soldier + one terrain patch under three lighting setups, approved from screenshots against written criteria BEFORE content production; then freeze `render/style.js` (palette, light rig, AO, outline) as the single source of truth.

18. A single directional shadow map over a 256-voxel arena: what is the texel size, how do you stop shimmer when the camera moves, how do you avoid acne on voxel faces, and what does it cost with 12k shadow-casting instances?
    Pill: "Shadow cascade-ish (single moving shadow map)" is how you get blurry, crawling shadows that make the whole scene look amateur, or an 8ms shadow pass.
    Demand: Spec: fit the shadow frustum to the visible region, texel snapping, `normalBias`, shadow-distance LOD (only near units cast), blob-shadow fallback for far/low tiers, and a quality-tier table of what casts.

19. What is the terrain model exactly: heightfield columns or 3D voxels, max dimensions, step height, slope rules, how units get their Y without popping across voxel steps, how a crater rebuilds a chunk AND the nav grid AND the flow fields, and how AO behaves across chunk borders?
    Pill: The plan says "16x16 chunk meshes, top+side quads" and "2-cell nav grid" but not how walkability, ramps, props and destruction stay consistent; this is where units clip through walls and float.
    Demand: A terrain/nav spec: integer heightfield with defined `maxStep`, unit ground-follow smoothing, nav cell derivation from terrain+props+hazards, incremental nav/flow invalidation, chunk-seam AO test, max arena size tied to a memory/draw budget.

20. At gameplay camera distance, will 300 soldiers read as units or as colored confetti? How do I tell teams apart, find my archers, see who is winning, and what do colorblind players see?
    Pill: Voxel soldiers at battlefield scale are tiny; without silhouette design, big team-colored surfaces, optional outlines, LOD and strategic icons the screenshot looks busy and the game is unreadable.
    Demand: A readability spec: per-role silhouette rules (height, shield/banner shapes), >=30% of visible surface team-colored, optional outline pass, 3-tier model LOD (full -> merged -> billboard/icon), health-bar/army-bar policy, colorblind palettes verified by simulation.

21. Debris, particles, damage numbers, corpses: what are the caps and data structures? A 1000-voxel soldier dying at 100 deaths/second is 100k cubes; "damage numbers" at 300 hits/second is either a DOM disaster or a texture-atlas problem (and your Google Font may not be loaded when the atlas is baked).
    Pill: "Units burst into physical voxel debris" is a promise that needs a budget or it either melts the GPU or looks sparse.
    Demand: Ring-buffered instanced pools (e.g. 6k debris cubes, 2k particles, 400 number glyph quads), debris sampled from the dead model's real palette (~20-40 cubes per death, scaled by distance), `document.fonts.load()` before atlas bake, an explicit corpse policy (persist N bodies then fade/sink), and a battle-end cleanup.

22. What happens on resize/DPR change, tab blur, WebGL context loss, 20 consecutive battles, and a laptop that does 18 fps on the first run? Does the autoscaler flap between tiers?
    Pill: Games die of leaks, flapping quality and black screens after background/foreground, none of which appear in a 3-minute smoke test.
    Demand: Lifecycle spec and tests: dispose discipline, `webglcontextlost/restored` rebuild, battle->results->battle x20 asserting `renderer.info.memory`/heap stable, scaler with hysteresis (e.g. 3s sample window, step down fast/up slowly, never up twice per minute), and a first-run micro-benchmark that picks the starting tier.

### D. Simulation and AI

23. "Per-team multi-source BFS flow field to the nearest enemy at 4 Hz": what does a unit do with that? Who decides targets, how are ties at the field's Voronoi boundaries broken, and how do archers keep distance, cavalry flank, and a phalanx hold shape?
    Pill: A nearest-enemy gradient sends every unit straight at the closest body; it cannot express formation, flanking or kiting, and recomputing at 4 Hz makes units flip direction at cell boundaries (jitter).
    Demand: A layered AI spec with pseudocode: strategic layer (orders/objectives/regions), tactical layer (target selection with persistence/hysteresis and role rules), movement layer (flow field + local avoidance + formation slots), and test metrics (heading flips per unit per second, time-in-formation, flank success).

24. What stops 40 melee units from piling on one enemy while the back 200 stand idle, soldiers overlapping each other, or walking through props the 2-cell nav grid cannot see?
    Pill: Separation-steering-only produces the classic blob: overlapping bodies, z-fighting, and a back rank that looks dead; in a battle sim that is the first thing every player notices.
    Demand: Engagement slots/attack tokens around each target, reach rules (spears over the front rank), push-through and rotation for the front line, hard-collision fallback for props, and headless metrics gated in tests: overlap ratio, fraction of in-contact units that are idle, stuck-unit count, wall-penetration count.

25. Does every battle terminate? Thermopylae choke with healers left alive, archers out of ammo, a unit stranded on an island, a routed unit running to the map edge, two catapults that cannot reach each other.
    Pill: The most embarrassing bug in a battle sim is two armies staring at each other forever; a headless-only test with fixed seeds will not find the pathological ones.
    Demand: Stalemate watchdog with escalating (and funny) interventions (Zeus intervenes, "Reinforcements: 1 goat", forced advance), per-battle max duration, and a fuzz test: 2,000 random matchups x random arenas must all terminate within N sim-minutes.

26. Spear walls beating cavalry, shield walls blocking arrows, elephant trample, charge bonuses, friendly fire: what is the geometry and rule for each, and how does the player SEE that a counter worked?
    Pill: Each is a separate rule set (facing arcs, reach, momentum, projectile-vs-shield resolution); listed as one bullet they will be half-implemented and invisible.
    Demand: A rules table with formulas and a unit test per mechanic, plus mandatory feedback for each (blocked spark + sound + floating "BLOCKED", brace pose, trample ragdoll, announcer hook).

27. What exactly does "deterministic" promise? Replays? Share codes for "full battles"? Cross-browser?
    Pill: Same-engine determinism is achievable; JS `Math.sin/cos/pow/exp` can differ in the last bit between V8, SpiderMonkey and JavaScriptCore, so a battle shared to a friend on Safari can diverge, and any use of `Math.random` in FX or UI that touches sim state breaks it silently.
    Demand: State the promise precisely (same-browser reproducible; shares carry setup+seed, not a guaranteed identical outcome), separate RNG streams (sim, fx, ui), forbid transcendentals in the sim path or wrap them with a deterministic implementation, and test sim hash equality across 3 runs.

28. What is the time model? 30 Hz fixed step with a 60/120/144 Hz display needs interpolation; 4x speed is a 120 Hz sim; hit-stop and slow-mo need to be render-time effects or sim-time effects but not both; tab blur must not cause a spiral of catch-up ticks.
    Pill: Without interpolation, 30 Hz motion judders on every modern monitor, and without a clamp 4x speed on a slow frame freezes the page.
    Demand: Time spec: previous/current state interpolation, max catch-up ticks per frame, hit-stop as a local time-scale on involved entities + camera only, global slow-mo as a sim-speed ramp, pause on blur, single injectable clock for tests.

29. What is the per-tick CPU budget at 300, 500 and 1000 units (including 4x speed), and how do you guarantee no GC hitches? "Strong GPUs" do nothing for CPU-bound AI.
    Pill: JS GC pauses from per-tick allocations are the usual cause of "it stutters every few seconds"; the plan's SoA mention is good, but there is no budget, no allocation rule and no profile gate.
    Demand: Budget table (e.g. <=3 ms/tick @ 500 units on a mid laptop), a no-allocation lint/test (heap growth over 10k ticks ~0), staggered AI updates, and an explicit decision on moving the sim into a Worker (allowed from blob URLs) with transferable snapshot buffers, or a written reason not to.

30. The balance harness: how long does "thousands of duels and mass battles" take at 1,800 ticks per battle x 300 units, what does it optimize, and what protects the game from user-built soldiers that the harness never saw?
    Pill: Cost-efficiency matrices tune shipped units against the AI's quirks, not against fun, and custom soldiers (free-form stats + abilities) will find any hole in the cost model within an hour of play.
    Demand: Harness on `worker_threads` with a runtime budget, matrix across 5 composition styles, rock-paper-scissors checks (each unit has a counter and a prey), and a blueprint FUZZER that generates thousands of random legal custom soldiers and flags outliers; cost model clamped so no stat combo is >X x cost-efficient.

31. Thirty abilities, status effects, morale, healers, drummers, hero ultimates, god powers: who casts each and when (AI), what does the player learn, and how do you keep a 300-unit battle comprehensible?
    Pill: Every added mechanic dilutes readability and multiplies QA; the plan has a cost model for units but no complexity budget for rules.
    Demand: A cap (e.g. <=20 abilities at launch), per-ability spec (trigger, AI cast rule, telegraph VFX, sound cue, announcer hook, test) and a rule that anything without a visible telegraph is cut.

### E. Animation

32. "Procedural clips: idle, walk, run, attack styles, block, hit, stun, death, cheer, taunt, cast" across humanoid, quadruped, siege, flyer and mounts: who tunes them, in what authoring format, and how will anyone see whether they are good?
    Pill: Procedural sinusoids look like wind-up toys; anticipation, overshoot, weight shift and follow-through are exactly what the user asked for ("animations are cool") and are the hardest thing to get right blind.
    Demand: A keyframe/curve DSL with easing and per-bone offsets (not pure sine), a clip catalogue with per-clip metadata, auto-generated filmstrip contact sheets (8-12 frames per clip) read by a reviewer, and measurable proxies (foot-slide px/s, joint-range limits, peak-to-peak timing of anticipation vs strike).

33. When the user said "animations from the internet", what exactly will you be able to point at? GSAP is a tween library for UI and camera; it is not unit animation.
    Pill: Interpreting the request as "GSAP + animation principles" is a bluff the user will detect the first time they ask "which animations came from the internet?".
    Demand: Run the retarget spike: parse Quaternius UAL 1/2 GLB (CC0) in Node, map ~12 bones (hips/spine/head/upper-lower arms/legs) onto the voxel skeleton, bake to compact quaternion keyframe JSON (death, walk, run, sword swing, block, hit react, cheer), compare to procedural clips on filmstrips, ship the winners with credits; also use Kenney's CC0 particle sprites (already downloaded) for VFX textures; say plainly in credits and the final message what came from where.

34. Who owns the timing contract between animation and combat: the frame at which damage lands, recover time, attack speed scaling, hit-stop duration?
    Pill: If clip timings live in `anim/` and combat in `sim/`, the sim cannot run headless for balance, or the hits will not match the swing and everything will look "floaty".
    Demand: Clip metadata as pure data (duration, hitFrames, recoverStart, loop) consumed by both; the sim never imports render/anim code; a test that damage events fire within one tick of the clip's hit frame.

35. Mounted units, chariots, elephants with archers, Trojan Horse, Minotaur, Cyclops: each is bespoke geometry, a rig, a gait, attachments and sounds, and they are the "wow" content. Why are they one agent's work package (WP4)?
    Pill: The most visible content gets the least review and the most integration risk (rider pose on a moving mount, wheel rotation, multi-part collisions).
    Demand: Per-hero-asset quality gate with its own look-dev sheet and animation filmstrip, reuse of one quadruped rig for horse/camel/centaur/warhound with proportion parameters, and a hard cap on bespoke rigs.

36. What is the animation CPU cost and LOD? 1000 units x 12 parts x hierarchical transforms every frame.
    Pill: Animating off-screen and distant units at full rate is the cheapest-to-fix performance sink and the plan is silent.
    Demand: Animation LOD tiers (full / half rate / frozen pose / static), culled units skip animation, measured ms at 500 and 1000.

### F. Audio and music

37. Your collected assets are `.ogg`. Safari decodes Ogg only from 18.4; older iOS/macOS reject `decodeAudioData`. What does an iPhone user hear?
    Pill: A silent game on a large share of Apple devices, falling back to synthesized "tinny" sound that e.md lists as an anti-goal.
    Demand: Choose an encode matrix deliberately (AAC/M4A or MP3 as the universal format, Opus/Vorbis only if sniffed with `canPlayType` + try/catch decode), build step encodes from the ledger masters, and runtime codec detection with a clear in-game notice instead of silence.

38. What is the memory footprint after decode? One 150-second stereo 44.1 kHz track is ~50 MB of float PCM; six tracks ~300 MB; plus base64 string + ArrayBuffer copies at load.
    Pill: iOS Safari and low-end Chromebooks kill tabs well below 1 GB; "music for every mood preloaded" is a crash on mobile.
    Demand: Decode only the current + next track (release the rest), stream via `<audio>` + `MediaElementSource` if `blob:`/data media is permitted (probe in Q7), or decode at 22-32 kHz for ambience layers; measure `performance.memory` and set a hard ceiling per quality tier.

39. The "dynamic intensity director" will switch between low/mid/high music. From where do you get low/mid/high versions of the same piece, in the same key and tempo, from incompetech/OGA/archive.org?
    Pill: You will not find stems; crossfading between unrelated tracks at arbitrary phase sounds like a radio changing stations and is worse than one good loop.
    Demand: One track per battle (chosen by arena/faction), intensity expressed by lowpass sweep + gain + a tempo-matched war-drum/percussion layer scheduled on the WebAudio clock (BPM stored in the ledger), bar-quantized transitions, Kenney jingles/stingers for events, and a pre-listen spec for loop points.

40. How do you know the loop seam is clean? MP3 encoder padding creates gaps; trimming and `loopStart/loopEnd` need verification.
    Pill: A 40 ms click or gap every 2 minutes is the sort of defect only a player notices.
    Demand: Build-time loop validator (ffmpeg `astats`/`silencedetect` over the wrap region, zero-crossing/RMS continuity check), loop points stored per track, and crossfade-loop fallback for tracks that fail.

41. Where is the asset coverage matrix? What plays for: horn, crowd cheer/gasp, catapult launch/impact, arrow release/whoosh/thud, shield block, sword on flesh vs armor, elephant, camel, horse gallop, chicken, goat, Minotaur roar, Zeus thunder, Trojan horse creak, wine pour, UI hover/press/confirm/error?
    Pill: The 1,740 raw files hold foley and UI but none of the battle/animal/crowd/horn/thunder categories; the humor sounds (chicken, goat) are exactly what synth fallbacks fake worst; freesound is unreachable (403).
    Demand: A machine-readable event -> asset matrix with >=3 variants per core event, per-file license (CC0/CC-BY only, no NC, no unclear SA/GPL), author, URL, edit notes; in-game credits generated from that ledger with exact attribution wording; list every event that falls back to synth and justify it.

42. What does the mix look like at 300 units? Hundreds of potential hits per second: voice limiter priority rules, per-voice distance filtering, master compressor/limiter, loudness targets per bus, ducking from horns/announcer, music/SFX balance.
    Pill: Unlimited SFX voices clip the master and turn a battle into white noise; the plan lists a "voice limiter" and "ducking" but no loudness targets and no way to verify them.
    Demand: Bus topology with master compressor + limiter, voice budget (e.g. 32) with priority (heroes/ultimates > near > far), target loudness (e.g. SFX -20 LUFS, music -18, master peak < -1 dBFS), and an automated offline mix test: render a scripted 300-unit battle through `OfflineAudioContext` in headless Chromium to WAV and measure LUFS/peaks/clip counts with ffmpeg.

43. How does the audio start, resume and behave in the real world? First load is silent until a gesture; the AudioContext is `suspended`/`interrupted` after tab blur or an iOS call; the iOS mute switch silences WebAudio; test runs often use `--autoplay-policy=no-user-gesture-required`, which hides every one of these bugs.
    Pill: "Music that starts on first click" is easy to claim and easy to break; the first impression (title screen) is silent unless you design the gate.
    Demand: A designed gate ("PRESS ANY KEY TO ENTER THE ARENA" splash that is the gesture), resume-on-focus/visibility logic, a visible mute state, an `<audio>` unlock trick for iOS mute switch, and tests run with default autoplay policy that assert `audioContext.state` transitions.

44. TTS announcer: voices differ per OS, load asynchronously (`voiceschanged`), may be absent, cut off long utterances, cannot be routed through the WebAudio graph (so no real ducking or bus volume), and a robotic voice reading jokes at 4x speed is cringe.
    Pill: The 'optional speech-synthesis announcer' risks making the funniest feature the most annoying one.
    Demand: Default OFF, rate-limited and priority-gated, text speech bubbles are the primary channel, a voice picker with a test button, and a clear statement that its volume/ducking is approximate.

### G. UI/UX

45. Which of the 18 screens work with touch, keyboard-only, and mouse, and is the answer written down? The arena builder and 3D voxel painter on a phone?
    Pill: "Responsive layout" in e.md becomes "the title screen fits and the editors are unusable"; pointer-event unification and 44px targets are not in the plan.
    Demand: An input/device matrix per screen (phone / tablet / desktop x touch / mouse / keyboard) with explicit decisions (see CUT list: phone gets battles, campaign, codex; editors from tablet width), pointer events everywhere, hover alternatives for tooltips, safe-area insets.

46. What happens in the user's first 90 seconds? Title -> click -> ? How many taps to see a battle? How does a new player learn placement, brushes, formations, orders, mirror, undo, speed, camera modes?
    Pill: The plan has ~60 features and one line about a tutorial; a wall of buttons is the opposite of "studio polish", and time-to-first-fun decides whether the user reads any of the rest.
    Demand: A designed FTUE: one-tap "Quick Fight" (auto armies) within 30 seconds of the gesture, guided placement tutorial on first Sandbox, progressive disclosure (Simple/Advanced toggle), contextual hints with a "don't show again" state, a controls overlay on `?`/`H`.

47. Where is the spectator HUD? Army strength bars, unit counts per type, kill feed, timer, objective tracker, speed controls, minimap or radar, selection/hover info, rally/order commands during the battle, a "who's winning" indicator.
    Pill: For a game whose core activity is watching 300 units, the plan describes the camera but not the information design; without it the player cannot tell what is happening.
    Demand: HUD spec and wireframes for desktop and phone; defaults, collapse behavior, throttled updates (<=10 Hz textContent writes), and hit areas that do not block the canvas.

48. How is the DOM HUD kept off the critical path? Updating 100+ elements per frame, tooltips, toasts, tweened panels over a WebGL canvas.
    Pill: Layout thrash and forced style recalcs over a canvas show up as stutter at exactly the moments the battle is busiest.
    Demand: Rules: transform/opacity-only tweens, batched DOM writes, no layout reads in the frame loop, pooled elements for floating text or move it to GPU quads, and a perf test with the HUD fully populated.

49. Accessibility and ergonomics: key rebinding, gamepad, subtitles for announcer lines, photosensitivity (lightning flashes, bloom, strobe VFX), text scaling, high-contrast UI?
    Pill: The plan covers reduce-motion, shake %, colorblind palettes and UI scale, but silently omits rebinding, gamepad, and a flash limiter; a picky reviewer notices.
    Demand: Decide each explicitly (in or out, with reason): rebinding, Gamepad API on desktop, flash-intensity cap for lightning/muzzle/bloom, subtitle toggle, focus-visible states and ARIA on menus.

50. Camera system: how is the cinematic auto-director specified? What are the shot types, cut rules, minimum shot lengths, smoothing, terrain/prop collision, and how do you test it without watching video?
    Pill: Auto-directors usually produce jerky, boring or nauseating shots; "follow-a-soldier" in a melee jitters, and the plan allots it one bullet and six camera modes.
    Demand: Shot grammar (establishing, follow, orbit hero, kill-cam, reaction), cut cooldowns, spring-damped smoothing with jerk limits, terrain/prop collision, FOV/shake tied to the juice table, and a filmstrip + jerk-metric test of a scripted 20-second path.

### H. Editors and custom content

51. Arena builder: what are the brushes, size limits, symmetry, prop placement/rotation, spawn zones, validity rules (reachable paths between spawns, objectives inside bounds), undo/redo depth and memory, and a Playtest button?
    Pill: A "full terrain editor" without undo, validation and playtest produces arenas that crash the nav grid or cannot be fought in, and users lose work to one stray click.
    Demand: Spec: command-pattern undo with delta compression (e.g. 100 steps), brush set (raise/lower/smooth/flatten/paint/stamp), hard size caps, validators with friendly fix-it messages, instant "Playtest" that returns to the editor with state intact.

52. How big is a share code for an arena or soldier, and does it survive being pasted into chat? A 128x128 heightmap + biome paint + props is tens of KB raw; a painted soldier has ~10 parts with palette-indexed voxels. `CompressionStream` is async and not universal.
    Pill: A 40k-character code that breaks in Slack or truncates in an `<input>` is a feature that looks done and fails the first time it is shared.
    Demand: Format spec: magic + version + CRC, palette-indexed RLE + deflate-raw (with a pure-JS fallback if `CompressionStream` is missing) + base64url, hard size caps and a displayed length, chunked textarea UI with copy and paste-box fallback, round-trip tests across 1000 random arenas/soldiers.

53. What does the importer do with hostile or corrupt input: NaN/Infinity stats, 100000x100000 dimensions, unknown unit ids, `__proto__` keys, names with `<img onerror>`, budgets above the point cap?
    Pill: Share codes are untrusted data from the internet; one `innerHTML` of a soldier name is XSS in the artifact origin, and one oversized grid is a tab-killing DoS.
    Demand: A schema validator that clamps/rejects (with a human message), `Object.create(null)` parsing, `textContent` for every user string, length limits, and a fuzz test of 1000 mutated codes in CI.

54. Soldier Workshop: how is the cost model protected, what abilities are legal on which body, how is the voxel painting tied to the rig (pivots, grip anchor, hit radius, nav radius, height), and what happens when someone makes a 3x tall soldier with a 5x spear?
    Pill: Free-form parts + point buy + abilities is a combinatorial exploit machine and a physics/nav/animation edge-case machine; custom units are first-class in the plan but nothing says how a painted voxel part keeps the rig and weapons attached.
    Demand: Spec: fixed grids per part with declared anchors/pivots, auto-derived collider from voxel bounds with caps, size/reach limits, ability legality by weapon/body class, stat caps and diminishing returns, and the fuzzer from Q30.

55. 3D voxel painting is a product in itself. Which tools (pencil, erase, fill, line/box, eyedropper, symmetry, slice view, palette, undo), how do orbit and paint coexist on mouse and touch, and how is it tested?
    Pill: Shipping "paint the actual voxels" with only a pencil and orbit looks like a demo to anyone who has used MagicaVoxel or Goxel.
    Demand: Minimal-complete toolset list, a 2D slice view alongside the 3D view (far easier on touch and trackpads), mirror-axis toggles, undo/redo, palette management, import/export of palette, Playwright tests that synthesize pointer sequences, and a hard rule that painting is on fixed grids.

### I. Persistence, versioning

56. Which components are persistence-critical and what happens if nothing persists (private window, thumbnail capture, blocked storage)? The artifact has `db` and `downloads` runtime capabilities and the plan ignores both.
    Pill: In a private window every custom arena/soldier/campaign star silently vanishes; `localStorage` is per-origin per-browser and never reaches other devices.
    Demand: Layered persistence: localStorage -> `db` capability (when signed in) -> memory, a persistent but unobtrusive "Not saving (storage blocked)" indicator, share-code export as the universal backup, and `downloads.save` for "Export file" where granted (with graceful absence).

57. The artifact will be republished repeatedly while the user plays (the build is iterative). What happens to saves, custom arenas/soldiers and an in-progress battle across versions? Open viewers auto-reload at a quiet moment.
    Pill: Content ids (unit ids, prop ids, palette indexes, stat schemas) will change as balance and content evolve; the first republish will invalidate an earlier save unless migrations exist, and a reload mid-battle destroys state.
    Demand: Stable immutable ids with tombstones ("Mystery Goat" replaces a removed unit), schema `version` + migration functions tested against fixtures from every published build, `claude.hot.snapshot/ready` wiring or an autosave of battle setup, and a rule to not republish during a user session without telling them.

58. What is the quota story? localStorage is ~5 MB; if you store a PNG thumbnail data URL (20-60 KB) for every arena/soldier plus campaign state plus settings, when do writes start throwing, and what does the UI do?
    Pill: Quota errors will be swallowed by the try/catch the plan promised, producing silent loss.
    Demand: Size accounting per key, thumbnail size cap/JPEG-or-tiny-canvas, quota-exceeded UX ("Storage full: delete or export arenas"), and tests that fill storage.

### J. Fun, pacing, humor, game design

59. What is the core loop? Place units, press Fight, watch ~90 seconds, see result: where are the decisions, the tension arcs and the reasons to replay? What is the target battle length and how is it enforced?
    Pill: Spectating a flow-field brawl is not a game; Totally Accurate Battle Simulator is fun because of placement puzzles, absurd unit interactions and physical comedy, none of which is guaranteed here by "50+ unit types".
    Demand: A game design section: target battle length (60-120s) with a pacing governor, mid-battle agency (god powers on cooldown, rally/order commands, reinforcements), objective variety that changes placement decisions, rematch/tweak/retry loop with one key, "epic moment" capture and highlight camera.

60. Campaign: what is the progression and reward economy (stars -> unlocks -> what exactly), the difficulty curve, and how are 8 objective types verified? "AI-vs-AI solvable" is not "player-solvable and fun".
    Pill: A scripted solver is not a player, and objectives that cannot be failed or are trivially won turn the campaign into a slideshow of jokes.
    Demand: Mission template with par budget/composition, scripted bot-players (greedy, counter-pick, turtle) that must win at least once and lose at least once on the target difficulty, star criteria that require different strategies, and human-persona playtest notes recorded per mission.

61. Juice discipline: hit-stop, shake, FOV kick, slow-mo on every kill in a 300-unit melee is a permanent stutter. What is the significance system?
    Pill: Juice without hierarchy is noise; the screen shakes constantly so nothing feels impactful.
    Demand: A juice priority table: only player-relevant, hero, kill-of-note or near-camera events trigger hit-stop/shake/slow-mo, global caps and cooldowns, shake as damped spring with max amplitude, reduce-motion honored, and screenshots/filmstrips of a busy scene showing the rules in action.

62. Humor at scale: ~700 pieces of copy (units x blurbs x 3 quotes, 150+ announcer lines, 60+ tips, 30+ achievements, briefings) written by AI. What is the quality bar, the process that cuts ~40%, and how do you avoid repetition within three battles?
    Pill: AI-written jokes cluster into the same puns and cadences, and an announcer that repeats the same 5 lines is funny once; the plan says "written, not generic" but supplies no editorial process.
    Demand: A comedy bible (voice sheets for Brutus/Plato/Cassandra, running gags with callbacks across missions and the Codex, forbidden clichés), an editor pass with a rubric (specific, surprising, <=12 words for bubbles), recency-memory line selection with per-type cooldowns, a quota of 90 sharp announcer lines instead of 150 so-so ones, and a Node script that reports repetition rates in a simulated 20-minute session.

63. How many of the jokes are SYSTEMIC (physics, AI behavior, animation, sound) versus text? Text gets read once; a goat that headbutts a general, a philosopher whose monologue stuns enemies, a catapult that launches the wrong unit, ragdoll flops: those get shared.
    Pill: The plan's humor is mostly a writing layer; the user will compare it to TABS-style physical comedy.
    Demand: At least 10 designed systemic gags with sim rules, animation, sound and an announcer hook each (Sacred Chicken tantrum, Philosopher filibuster as crowd-control, Trojan Horse reveal, Senator filibuster, Battle Goat charge, Medusa gaze statues, catapult misfires, Zeus ragequit on stalemate, wine rain).

64. The announcer is "event-aware": which sim events does the sim actually emit (first blood, friendly fire, chicken kills a general, last man standing, comeback, Cassandra's accurate prediction)? Who defines the event catalog?
    Pill: Humor module (WP7) and sim (WP2) are built by different agents; if the event catalog is not a contract, half the jokes have no trigger and the rest fire wrongly.
    Demand: An event catalog in spec.md with payloads and rate limits (including a power-ratio predictor for Cassandra), tests that replay a recorded event log through the announcer and assert line selection, priority and cooldown behavior at 1x and 4x speed.

65. Tone and sensitivity: Persians, Egyptians, "Barbarians", Carthaginians in a comedy game. Is there a rule about what is being punched at?
    Pill: AI humor drifts to ethnic stereotypes when it runs out of ideas, and a studio-quality game would be reviewed for that.
    Demand: Style rule: joke at institutions, myths, bureaucracy and battlefield physics, never ethnicity/religion; a sweep pass over all copy for stereotypes before final.

66. What does "AI difficulty" mean? Stat multipliers (cheap, fake) or smarter behaviors (expensive, real)? What about "difficulty" for the enemy army generator's composition style?
    Pill: Multipliers feel like cheating, and Easy/Hard sliders that do not change decisions are a classic tell of an unfinished game.
    Demand: Define each tier by behavior (target selection quality, formation discipline, ability use, reaction delay, composition quality) with measurable win-rate bands vs a fixed bot.

### K. Verification blind spots

67. List five defects the plan's tests would pass while the game is bad. Here are mine: (1) every unit animates and dies but the walk looks like a wind-up toy; (2) all audio decodes but the mix clips and the music crossfades mid-bar; (3) 60 fps in the sim but 12 fps on an integrated GPU; (4) every screen renders but the first 90 seconds are confusing; (5) all missions are AI-winnable but boring.
    Pill: "Zero console errors, screenshots look fine, battles end" is a floor for a prototype, not a ceiling for a studio game.
    Demand: Add objective proxies per axis: motion (foot-slide, jerk, filmstrips), audio (LUFS/peak/clip counts, loop seams), perf (CPU ms p50/p95, draw calls, triangles, heap), UX (time-to-first-battle, tap-target sizes, contrast ratios), game (battle length distribution, win-rate matrices, stalemate rate).

68. What can SwiftShader headless Chromium NOT tell you? GPU performance and frame pacing (software raster gives meaningless fps), real shader compile behavior, audio output, autoplay policy (if the flag is used), and any engine other than Chromium (no Firefox/WebKit installed).
    Pill: "Test at 800 units" in SwiftShader measures the CPU rasterizer, not the game; and rAF at 3 fps makes the sim, tween and audio timelines all behave differently from a real machine.
    Demand: Test harness with an injectable clock and a `window.__vw` hook (step N ticks, render frame, set seed, dump metrics) so tests are deterministic; report only CPU-side budgets, draw calls, triangle counts and `renderer.info`; run WITHOUT the autoplay flag; document the Chromium-only limitation and add feature-detect fallbacks for Safari/Firefox-specific gaps; write the honest "unverified" list in the final message.

69. How will "I read the screenshots myself" scale to 18 screens x 3 viewports x states x 2 themes of art, plus 50 unit sheets, plus arenas? What catches regressions after a sub-agent merge?
    Pill: Manual screenshot review fatigues and misses regressions; it is also the only visual QA proposed.
    Demand: A review protocol (contact sheets per category with a written checklist), golden-image pixel diffs for deterministic scenes (seeded battle at tick N), DOM overflow/contrast/tap-size scanners, and a regression run on every merge.

70. Is "zero console errors" a real gate? Does it include `console.warn`, WebGL warnings, `securitypolicyviolation` events, failed requests, unhandled rejections, and a CSP identical to production?
    Pill: The plan promises a "CSP-emulating server" but does not say its headers come from the real hosted wrapper; an emulation based on the tool description can be wrong in exactly the way that white-screens you.
    Demand: Copy actual headers from the probe publish (Q7), fail tests on any error, warn, CSP violation event, 4xx/5xx, or unhandled rejection, and also load the page with network throttling and CDN blocked once to verify the fatal-error screen.

71. How do you verify audio you cannot hear? Is it only "files decoded"?
    Pill: Wrong-polarity pan, silent buses, clipping and music that never starts are invisible in screenshots.
    Demand: Instrument the audio graph (`window.__vw.audio` exposes bus gains/voice counts/analyser RMS), assert nonzero RMS after the first gesture on the correct buses, run the offline mix render (Q42), and log per-event cue firing counts in a scripted battle.

### L. Integration of parallel sub-agents

72. docs/spec.md is the precondition for parallel work in §10, but it does not exist. What are its contents and who signs it?
    Pill: Contracts written after the code are rewrites; eight agents will invent eight slightly different `VoxModel`, `Blueprint`, rig, event, audio-cue and UI-kit APIs.
    Demand: Write spec.md first and freeze v1 before any sub-agent starts: Blueprint JSON schema, VoxModel/rig interface, clip metadata, sim<->render snapshot format, event catalog with payloads, audio cue ids, save schema, UI kit tokens/components, file ownership map, and contract tests (schema validators every agent's output must pass).

73. Eight agents editing one tree: who owns `main.js`, `ui/kit.css`, registries/barrels (`units.js`, `arenas.js`), and what happens when one agent's syntax error breaks the esbuild bundle for everyone? The repo has no commits to isolate changes.
    Pill: Merge hotspots and shared-build fragility will burn more time than any individual feature.
    Demand: Per-agent directories with a written ownership map, auto-generated registries (build globs content files; no hand-edited barrels), git worktrees or branches per agent, a gate script (`node --check`, lint, esbuild, boot smoke, contract tests) that an agent must pass before handing back, and a scheduled integration pass.

74. Who is the art director? Which single document and owner keep eight agents' unit models, UI screens, FX and copy in one visual and tonal voice?
    Pill: Parallel production without a style owner yields eight dialects: different voxel density, outline style, color saturation, button shapes and joke registers.
    Demand: A style bible (voxel size per body class, palette, outline/AO rules, UI kit, motion language, tone sheet), an art-direction review gate that looks at contact sheets of all units, all screens, and all copy side by side, and one agent whose only job is to reject inconsistency.

75. What stops an agent from reading the 12MB dist file into its context, or the build from silently shipping a debug flag? And what does the `Artifact` publish do with a file that large?
    Pill: Tooling hazards, not logic bugs, will end sessions: a `Read` of a 12MB single line, or republishing an artifact after reading it back.
    Demand: Tell every agent never to cat/read dist or base64 blobs (use `stat`, `head -c`, size reports), the build prints a size/budget report and refuses on regressions, a `DEBUG` flag is stripped and asserted off in dist, and the publish step is one scripted command.

### M. Picky player / art director

76. The brand is "bronze/terracotta/lapis, chunky display type". Is that a point of view or the default AI-generated look (terracotta accent on warm neutral, serif or chunky display)?
    Pill: Studio feel is a distinctive identity; "ancient = bronze and terracotta" is the first thing anyone would think of.
    Demand: One bold, specific art-direction choice (e.g. black-figure vase-painting UI with voxel diorama, or Saturday-morning-cartoon Olympus) with reference descriptions, a typography plan with real fallbacks (Google Fonts may not load), and a title-screen composition approved from a screenshot before UI is built.

77. Picky-player checklist: can I rematch with the same armies in one key? Undo a placement? Pause and move a unit? Slow to 0.25x and scrub? See unit stats on hover? Click a unit to follow? Save an army preset? Copy a seed? Skip the intro? Reset progress without a `confirm()` dialog? Exit mid-battle without losing the setup?
    Pill: These are the small things whose absence reads "student project", and none is mentioned beyond the headline features.
    Demand: Add them to verification.md as explicit criteria; in-page confirmation modals everywhere `confirm()` would have been used (alert/confirm/prompt are dead in the viewer).

78. What does the first-run user do when the game runs badly on their machine? (They have an unknown GPU, possibly integrated; thumbnail capture also loads the page.)
    Pill: The plan's only defense is the auto-scaler; the user experiences "it lags" before it adapts, and the auto-scaler can't fix a CPU-bound 500-unit sim.
    Demand: First-run benchmark (render + sim micro-benchmark) picking the starting tier and unit-count cap, a visible "Performance" quick toggle in the pause menu, a friendly low-power mode, and a unit-cap warning on the placement screen.

79. Credits and licenses: are the in-game credits legally complete (CC-BY attribution text, CC0 acknowledgements, source URLs, modifications noted) and generated from the ledger rather than typed from memory?
    Pill: e.md promises "correct licenses credited in-game"; hand-typed credits drift from the files actually shipped.
    Demand: The build derives CREDITS from the asset ledger, fails if a shipped asset lacks a ledger row, and the Credits screen shows author, license, link text (links open new tab) and edit notes.

---

## WHERE THE PLAN IS SILENT (a "closest to perfect" version must answer these)

- Tiers/ship gates, early publish cadence, commit cadence, owner of each gate, kill criteria for each spike.
- docs/spec.md and docs/verification.md contents (they do not exist yet).
- Why r128; color pipeline policy (sRGB/linear, tone mapping, post order); in-house vs examples-chain post-processing.
- Budgets: draw calls, triangles, CPU ms (anim, sim, upload), JS heap, decoded-audio memory, time-to-title, time-to-interactive, bundle size per component.
- The hosted wrapper's real behavior (probe), whether `files` hosting is available, and header/CSP replication in tests.
- Fatal-error UX when CDN/WebGL/shader/audio fails; browser support policy (Chrome/Edge/Firefox/Safari versions) and the Safari audio-codec answer.
- Sim: attack slots/surround logic, local avoidance, stalemate breaking, battle-length governor, RNG stream separation, time model and interpolation, snapshot/restore (needed for any replay/killcam/undo-placement).
- Spectator HUD, minimap/radar, kill feed, order/rally commands during battle, mid-battle reinforcement, rematch loop.
- Corpse persistence and battlefield storytelling; debris sampling method; LOD for models; strategic-zoom icons.
- Terrain model details: step height, ramps, seams, nav invalidation on craters.
- Animation authoring format, clip catalogue, retargeting of real CC0 clips, animation LOD, and the sim/anim timing contract.
- Asset coverage matrix and the exact list of events that rely on synthesized sound.
- Music engine (BPM metadata, bar-quantized transitions, stingers), iOS mute switch, AudioContext resume behavior, TTS fallback and voice selection.
- Accessibility: rebinding, gamepad, flash limiter, subtitles, focus management.
- Persistence layering (`db`/`downloads` capabilities unused), quota handling, save migration tests from published builds, hot-update snapshotting.
- Editor specs: undo/redo model, size limits, validators, share-code format/size/CRC/fuzz tests, importer sanitization.
- Custom soldier balance guard (fuzzer, caps), rig anchor rules for painted parts, collider derivation.
- Style bible, tone sheet and the art-direction review gate.
- Difficulty definition by behavior; campaign economy and progression; per-mission scripted-bot verification.
- First-run performance benchmark and unit-count caps; what the user is told when their machine is weak.
- A named list of what the final message will declare unverified (real GPU perf, audio audibility, non-Chromium browsers).

---

## THINGS THE PLAN SHOULD CUT OR DEFER HONESTLY (each with the nearest high-quality substitute, never a demo)

1. **50+ unit types across 7 factions with bespoke blurbs/quotes/abilities.** Fantasy at studio quality in one session. Substitute: ~32 fully finished units (about 5 per ancient faction + 1 hero each + ~6 mythic), every one passing the per-unit Definition of Done (Q3); variety beyond that comes from the Workshop and from skins/banners/helmet variants of shared humanoid bases. Keep Gladiator, Hoplite, Legionary, Archer, Cavalry, Elephant, Catapult, Minotaur, Sacred Chicken, Zeus because they carry the humor and silhouette variety.
2. **14 arena presets.** Substitute: 8 hand-tuned presets that each pose a different tactical problem (open plain, choke pass, arena with crowd, river crossing, forest, hill with objective, harbor/siege, underworld hazard) + Arena Lab + seeded Random. A tuned arena is worth three generic ones.
3. **12 campaign missions with 8 objective types.** Substitute: 9 missions (3 acts x 3), objective types limited to those that reuse systems (Eliminate, Kill the General, Hold the Hill, Protect the VIP goat, Survive waves), each with scripted-bot verification and distinct par strategies; the other three types go to the Medieval roadmap teaser only if they are genuinely complete (otherwise omit).
4. **"1000 units possible on strong GPUs".** Cannot be verified in this environment. Substitute: a unit cap per quality tier (e.g. Potato 150 / Papyrus 300 / Marble 500 / Olympian 800), a CPU-budget-driven cap, a first-run benchmark, and honest labeling in Settings; test the sim headlessly at 1000 but do not market the render claim.
5. **Possess mode with mouse-look, dodge and full third-person combat.** A second game bolted onto the first; depends on pointer lock that may not exist in the frame. Substitute: "Take Command": choose a hero, WASD/touch-stick move, click/tap to attack the nearest enemy, 1-3 for abilities, over-the-shoulder follow cam with no pointer-lock requirement, ability telegraphs, and a clear exit.
6. **Replay and full-battle share codes.** Cross-browser determinism is not guaranteed (Q27) and replay needs input logging and snapshots. Substitute: share codes carry setup + seed + rules (labeled "same setup, same seed"), plus an in-session "Instant Replay / Kill Cam" built on a snapshot ring buffer (only if the sim is SoA-snapshotable) with a replay camera and slow-mo.
7. **Physical structural collapse of every destructible prop.** Substitute: staged damage models (intact -> cracked -> collapsed rubble pile) authored per prop family, instant debris burst, crater/terrain deform for catapults, nav cells updated once at collapse.
8. **Flying units (Harpy), Cerberus, Hydra-lite.** Each adds a rig, nav layer, targeting rules and rules for ranged vs air. Substitute: ground mythics only (Minotaur, Cyclops, Medusa with a gaze-stun mechanic, Centaur reusing the horse rig, Trojan Horse, Battle Goat, Sacred Chicken) and Zeus as a god-power avatar rather than a unit.
9. **Weather that changes gameplay (rain slows fire, snow slows units, sandstorm hides units).** Substitute: weather as full-quality VFX/lighting/audio plus two simple modifiers (rain extinguishes fire arrows, snow lowers move speed 10%), each visible and tested.
10. **Bloom via the r128 examples chain + FXAA from jsDelivr.** Substitute: in-house bloom/tone-map/FXAA (~150 lines) inside the bundle: faster boot, no CDN dependency, and controlled color pipeline.
11. **TTS announcer as a headline feature.** Substitute: speech bubbles + stylized text announcer (portrait, typewriter, sound blips) as the primary experience; TTS as optional, default off, labeled experimental in Settings.
12. **150+ announcer lines, 60+ loading tips, 30+ achievements.** Substitute: ~90 announcer lines with recency memory and callbacks, ~40 tips, ~24 achievements, every one passing the editor rubric (Q62); fewer, sharper, funnier.
13. **Dynamic multi-state battle music assembled from unrelated tracks.** Substitute: one track per battle + filter/gain intensity + tempo-matched percussion layer + stingers (Q39).
14. **Editors on phones.** A 3D voxel painter on a 400px screen is not a good experience. Substitute: phones get Quick Battle, Campaign, Codex, Settings and read-only gallery of custom content; arena builder and workshop are full-featured from tablet width, with explicit friendly messaging on phones (no dead buttons).
15. **Unlimited distinct unit types per battle (including many custom soldiers).** Substitute: per-battle cap of distinct types (e.g. 16) with a clear counter in placement UI, until the single-mesh-per-type architecture (Q14) is proven.
16. **Dozen-plus custom parts all with free-form painting at arbitrary resolution.** Substitute (scope-limited, not cut): fixed voxel grids per part with declared anchors, 2D slice + 3D view, symmetry, palette, undo; parts library of 12+ fixed, tuned base parts to paint over.

---

## WHAT I WOULD CHANGE IN THE PLAN BEFORE ANY SUB-AGENT STARTS (the shortest path to a plan that can reach "closest to perfect")

1. Run the hosted probe artifact (Q7, Q8) and record what the frame really permits; decide `files` vs data URI.
2. Write spec.md (contracts, event catalog, ownership) and verification.md (150 criteria) and freeze both.
3. Run the five spikes (Q5) with numeric kill criteria; amend the plan with the results (draw-call architecture, audio memory strategy, retargeted animation viability).
4. Do the look-dev + style bible gate (Q17, Q74, Q76) with one hero soldier and the title-screen composition.
5. Replace "ALL ship" with tiers and gates; commit and publish T0 early; republish the same URL at each gate.
6. Cut or defer per the list above and say so in the final message, alongside the honest unverified list (real GPU performance, audibility of audio, Safari/Firefox behavior).
