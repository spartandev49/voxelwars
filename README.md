# VOXELWARS

A 3D voxel battle simulator set in the ancient world. Place two armies, press FIGHT, and watch a few hundred cube-built soldiers argue about history. Seven factions, 43 units, 16 arenas, a nine-mission campaign, survival, a daily skirmish, six puzzle battles, an arena builder, a soldier workshop and a voxel painter, three announcers with opinions, and a game that is aware it is a game.

It ships as **one hosted web page** (a claude.ai Artifact): no install, no account, no server. Saves live in the browser (`localStorage`) with share codes and export/import for moving them around.

## Play

Open the hosted link (or `dist/voxelwars.html` after a build). Press any key on the splash screen (the browser needs a click or key before it plays sound), then **Quick Battle**, pick an arena, **Auto-fill** both armies or place your own, and **FIGHT**.

Needs a current desktop browser with WebGL2 (Chrome, Edge, Firefox, Safari 16.4+). Phones can play battles; the editors want a bigger screen.

| Camera | |
|---|---|
| Orbit | right-drag (touch: one finger) |
| Pan | WASD / arrow keys / middle-drag (two fingers); Shift = faster |
| Zoom | wheel (pinch) |
| Rotate / tilt | Q E / Z X |
| Modes | F follow, T top-down, C cinematic, P photo, Tab hide HUD, H help |

During battle: `Space` pause, `[` `]` speed, `1`-`6` god powers, `O` advance, `L` hold, `Enter` take command of a soldier (WASD moves, mouse attacks).

## Build, test, publish

```bash
npm install                 # esbuild + playwright-core (dev only)
node tools/build.mjs        # dist/voxelwars.html (standalone) + dist/artifact/index.html (packed fragment) + files.json
node tools/build.mjs --minify
node tools/gate.mjs --fast  # lint, syntax, unit tests, contract validators, build
node tools/gate.mjs         # + browser smoke tests of the standalone page and the artifact fragment under the Artifact CSP
node tools/look.mjs --arenas=marathon,olympus   # screenshots of the real game (look-dev)
node tools/perf.mjs --budget=40000 --profile    # CPU profile of a 600-unit battle
node tools/simperf.mjs 40000                    # headless sim cost per tick
```

The browser tools use the Chromium bundled in `/opt/pw-browsers` with SwiftShader (software WebGL): good for correctness, screenshots and CPU hotspots, meaningless for GPU frame rates.

## How it is built

- **Three.js r128** from a CDN (pinned, with a cdnjs, jsDelivr, unpkg fallback chain); everything else is in-house and bundled by esbuild into one inline script. The Artifact build ships its code deflated and inflates it at load.
- `src/voxel/` voxel grids, meshing with per-vertex AO, part-tree models. `src/render/` skinned **instanced** rendering (one draw call per model: part transforms live in a float texture), HDR post (bloom, ACES, vignette), terrain chunks, GPU-friendly far LOD, hit-stop, camera rig, preview renderer.
- `src/sim/` a deterministic 30 Hz simulation (flow-field pathing, squads and formations, scored targeting, melee/ranged state machines tied to animation timing, projectiles, morale, abilities, objectives, god powers, mutators). Pure JS: it runs in Node for tests and balance runs.
- `src/anim/` animation: retargeted CC0 motion-capture clips plus authored clips, composed per rig (humanoid, horse, camel, elephant, chariot, siege, ...).
- `src/content/era_ancient/` stats, the part library and unit blueprints, beasts and siege models, props, arenas, campaign, and all the jokes.
- `src/ui/` the "Toy-box Olympus" UI kit, screens and HUD. `src/editors/` the arena builder, soldier workshop and voxel painter. `src/audio/` the audio engine, cues, music director and synth fallbacks. `src/save/` storage, share codes (`VW1.<type>.<deflate+base64url>.<crc>`), lifetime stats.
- `docs/` the spec, per-area specs, verification criteria, review rounds and decisions. `docs/spec.md` is the contract; `docs/verification.md` lists what "done" means.

## Credits and licences

- **three.js** (MIT). **Fonts**: Bungee, Rubik, Cinzel (SIL OFL) via Google Fonts.
- **Animation**: retargeted clips from the Quaternius *Universal Animation Library* (CC0).
- **Audio**: sound effects and music from OpenGameArt, Kenney, incompetech and others under CC0 / CC BY; every attribution is in `assets/CREDITS.md` and in the in-game Credits screen. Audio was trimmed, loudness-normalised and re-encoded; anything missing falls back to synthesized sound.
- Everything else (code, models, UI, writing) is original to this project.
