# e.md — EXPOSITION: what the user actually expects

## The literal ask
"Use all skills and plan out and create a full artifact game called **voxelwars** where it is a Voxel 3d battle simulator that is REALLY cool, the animations are cool. Start with ancient era. Make it very detailed, lots of options, custom arenas, custom soldiers. Make it really fun and add humor to it. Host the artifact so I can play it. Use sound effects and animations from the internet, as well as music too. Make it feel like a game studio made it."

## What the user will do at the end of my turn
1. Click ONE link, a hosted claude.ai artifact, and a game loads. No install, no build, no "run npm". It must boot on first try with zero console errors under the artifact CSP (scripts only from cdnjs/jsdelivr/unpkg, no external media/fetch, fonts only from Google Fonts).
2. They see a **title screen that looks like a studio shipped it**: logo, animated 3D voxel diorama behind the menu (a tiny live battle playing out), music that starts on first click, polished buttons with hover/press sounds, a version tag, credits.
3. They hit Play and get *real choices*, not one mode:
   - **Quick Battle / Sandbox**: pick arena, pick armies, place units, press FIGHT.
   - **Campaign ("The Ancient Era")**: a sequence of funny, escalating battles with objectives, briefings, stars, unlocks.
   - **Custom Arena Builder**: sculpt voxel terrain, paint biomes, place props/buildings/hazards, set weather/time of day, save/load/share.
   - **Soldier Workshop (custom soldiers)**: build soldiers from a dozen-plus parts and colors, set stats with a point-buy budget, pick abilities, name them, write their last words, and *paint the actual voxels* of the model in a 3D voxel editor. They then field those soldiers in battle.
   - Settings, Codex/Armory (every unit with stats, lore, jokes), Credits.
4. In a battle they see **hundreds of voxel soldiers** (target 300+ comfortable, 1000 possible on strong GPUs) fight with AI that is competent: formations, flanking cavalry, archers volleying with ballistic arrows, spear walls beating cavalry, shield walls blocking arrows, elephants trampling, catapults cratering the terrain, healers healing, drummers buffing, heroes with ultimates. Units that die burst into physical voxel debris. Cool camera: free orbit, follow-a-soldier, cinematic auto-director, top-down tactical, slow-mo on epic moments, screen shake, hit-stop, damage numbers, blood/wine/confetti toggle.
5. They **laugh**: unit names, flavor text, loading tips, death quotes, an announcer duo commenting on the battle with real jokes tied to what is happening (e.g. first blood, friendly fire, a chicken kills a general), achievements with funny names, funny campaign briefings. Optional speech-synthesis announcer voice.
6. They **hear** a game: real sound effects from the internet (swords, shields, arrows, hits, horns, crowd, catapults, UI) and real music from the internet (menu, battle, victory, defeat, ancient flavor) with correct licenses credited in-game, plus synthesized fallbacks, plus a dynamic mixer (volume sliders for Master/Music/SFX/Announcer, mute, music intensity follows battle state).
7. It must **feel** like a game studio made it: juice everywhere (screen shake, particles, easing, tween-in panels), consistent art direction, loading/transition screens, tutorials/tooltips, pause menu, keybind hints, responsive layout, persistence (settings, custom arenas, custom soldiers, campaign progress), 60fps target with quality presets and an FPS/perf auto-scaler, no dead buttons, no placeholder text, no "coming soon" except a tasteful "Next era" teaser that is clearly the roadmap (Medieval etc.), NOT a half feature.

## What "done" means (definition of done is KING)
- Everything listed above exists, works, and is verified by running it in a real browser (headless Chromium + WebGL) with screenshots I read myself.
- No demo/MVP framing. No TODO. No lorem ipsum. No stub menu items. No fake data.
- Hosted artifact URL delivered, and code committed/pushed to the repo on branch `claude/cool-babbage-g7oakv` (source + build + docs).
- Honest gap statement for anything the environment truly cannot deliver (e.g. I cannot play on a real GPU or hear audio here).

## Interpretation of fuzzy phrases (decisions, not questions)
- "animations from the internet": a voxel game's animations are procedural skeletal rigs; I will ALSO pull in real internet animation tech: GSAP (cdnjs) for UI/camera tweens, three.js (cdnjs) for rendering/skinned math, and use well-known animation principles (anticipation, follow-through, squash and stretch, hit-stop, smear arcs). If real CC0 animation/VFX assets exist (sprite sheets for fire/explosion/slash) I will use them for particle textures. I will say plainly in the summary what came from the internet.
- "Start with ancient era": ship Ancient fully (Greek, Roman, Egyptian, Persian, Carthaginian, Celtic/Barbarian, plus Mythic), architecture built so a Medieval era slots in.
- "lots of options": arena size/biome/seed/weather/time/hazards, army budget, team count, AI difficulty, battle speed, camera, graphics quality, gore style, rules (friendly fire, morale on/off, fog of war off), sandbox cheats (spawn, heal, lightning from Zeus, meteor, earthquake).
- "feel like a game studio made it": cohesive brand ("VOXELWARS", bronze/terracotta/lapis palette, chunky display type), consistent UI kit, audio on every interaction, motion design, onboarding.

## Going above and beyond
- Destructible props (towers/walls/columns collapse into voxel rubble), catapult craters that deform terrain.
- Replay/photo mode: free camera, slow-mo, screenshot to clipboard-friendly data.
- Procedural arena generator with seeds + named presets (Marathon Plain, Nile Delta, Thermopylae Pass, Colosseum, Carthage Harbor, Teutoburg Forest, Persian Palace, Mount Olympus...).
- Unit "Codex" with 3D turntable of each model.
- Achievements and a stats screen with absurd stats.
- Share codes (copy/paste) for arenas, soldiers, full battles.
- Mythic wildcard roster: Minotaur, Cyclops, Medusa, Hydra-lite, Centaur, Sphinx, Zeus smite, Trojan Horse that spawns soldiers, Sacred Chicken.

## What would disappoint the user (my anti-goals)
- A pretty title screen that leads to a thin sandbox.
- Soldiers that stand still, jitter, clump, or walk through walls.
- Silent or tinny audio; audio not from the internet; no credits.
- An artifact that white-screens because of CSP, a CDN path, or a JS error.
- Slideshow framerate with 200 units.
- Humor that is generic or absent from gameplay.
- "Custom soldiers" that are only color swaps.
- Code only in the repo but no playable link.
