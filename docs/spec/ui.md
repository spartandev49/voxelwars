# spec/ui.md — Art direction, tokens, components, screens, HUD, input

## 1. Art direction: "Toy-box Olympus"
A playful, saturated, high-contrast cartoon world. The 3D scene is bright daylight Mediterranean with chunky voxel soldiers; the UI is a set of **sticker-like stone tablets**: deep-indigo panels with thick ink outlines, hard offset shadows and gold buttons that physically press. Humour is in the micro-copy and small motion (buttons squash, tablets wobble in). NOT parchment, NOT bronze/terracotta.
- Title composition: huge 3D voxel logo VOXELWARS (built from voxel letters, gold with ink outline, slightly tilted, floating with a slow bob + sun glint sweep) over a live diorama of a tiny battle on a floating island with clouds; menu tablets on the left; version tag bottom-left; "Press any key" splash first.
- Everything one `100%` height app. Single dark-first look (deliberate: game UI), `color-scheme: dark`. Tokens defined on `:root` first (no theme blocks needed because the page commits to one look), `body` background explicit.

## 2. Tokens (`ui/kit.css`, frozen names)
```
--ink:#14163a; --night:#1d2150; --night-2:#2a2f6b; --night-3:#383e86;
--marble:#f3f6fb; --marble-dim:#b9c2e0; --gold:#ffc93c; --gold-deep:#d9951a;
--sky:#6ec6ff; --lapis:#3b6cf0; --crimson:#ee4b4b; --olive:#8bc34a; --pink:#ff7eb6; --lava:#ff7a2f; --danger:#ff5d5d;
--font-display:'Bungee','Arial Black',Impact,sans-serif; --font-body:'Rubik',system-ui,'Segoe UI',Roboto,sans-serif; --font-epigraph:'Cinzel',Georgia,serif;
--r-sm:8px; --r-md:12px; --r-lg:18px; --outline:3px solid var(--ink); --shadow-hard:0 5px 0 var(--ink);
--ease-spring:cubic-bezier(.34,1.56,.64,1); --ease-out:cubic-bezier(.16,1,.3,1);
--space-1:4px;…--space-8:48px; --tap:44px; --gutter:16px
```
Type scale (rem on a 16px root, user UI-scale 80-130% via `html{font-size}`): display 2.6/1.8/1.3, title 1.1 (Bungee), body 1.0 (Rubik 400/500), small 0.85, micro 0.75; tabular-nums for numbers. Uppercase labels letter-spacing .06em.

## 3. Components (`ui/kit.js`; pure DOM builders, all `textContent`)
`button(label,{variant:'primary|secondary|ghost|danger', icon, onClick, sound})`, `tablet(title, content)`, `tabs`, `chip`, `slider(min,max,step,value,onInput)` (tick sound), `toggle`, `select`, `segmented`, `card(unit)`, `tooltip(el,text)` (hover + long-press, never the only way to learn a thing), `toast(text,{kind})`, `modal({title,body,buttons})` (replaces confirm; Esc closes; focus trap), `banner(text)` (round-start ribbon), `progress`, `meter(teamA,teamB)`, `kbd(key)`, `toolbar`, `emptyState`. Rules: focus-visible outline 3px gold; hit area >= 44 px; hover = lift 2px; active = sink 3px; transitions transform/opacity only; `prefers-reduced-motion` and the in-game Reduce Motion disable springs/wobbles; every control has an `id` and `aria-label` when icon-only; roles for tablist/menu/dialog; sound on hover (soft), click, confirm, back, error, toggle, tick.

## 4. Screens (each: layout, content, empty/error states, back/Esc, keyboard order)
1. **Boot/Loader**: inline CSS logo + progress bar + rotating funny loading line; fatal-error panel (cause, copy diagnostics, "Safe mode" retry button).
2. **Splash**: "PRESS ANY KEY TO ENTER THE ARENA" (the audio gesture), blinking, diorama behind.
3. **Title / Main menu** tablets: Quick Battle, Campaign, Survival, Arena Builder, Soldier Workshop, Codex, Achievements, Settings, Credits; footer: version, Diagnostics link, mute button, "Roadmap: Medieval Era (coming later)" tag that is honest and clearly not a feature.
4. **Quick Battle setup**: arena carousel (3D thumbnails rendered from the arena at small size), size, weather/time, rules tablet (§8 of world.md), army A / army B panels (faction chips, budget, "Auto-fill", "Mirror"), difficulty, "Quick Fight" (one tap: random arena + balanced armies + fight) and "Place armies" (to placement).
5. **Placement**: left palette (faction tabs + search + role filter; unit cards with cost, role, mini turntable on hover); right panel (team A/B toggle, budget bars, brush: single / line / block (formation) / scatter / erase / select; formation preset; order for squad; mirror toggle; undo/redo; clear; save/load army preset; auto-fill enemy); bottom: unit count vs cap, distinct types counter (16 max), FIGHT button; top: back, arena name. Ghost preview follows cursor snapped to terrain; invalid positions tint red with reason tooltip ("In the enemy's zone", "Underwater").
6. **Battle HUD** (see §5). **Pause** overlay (resume, restart, settings, quit-to-menu confirm modal, Performance quick toggle, controls). **Results**: victory/defeat banner, stats tablet (kills, losses, damage, MVP unit with its death quote?, funny stats), "Rematch" (R), "Tweak army", "Next mission", "Menu"; confetti/laurel animation.
7. **Campaign map**: a stylised voxel map of the Mediterranean with 9 mission pins in 3 acts, stars, locks, hover = briefing blurb; **Briefing** modal with announcer lines, objectives, rules, par budget, "Deploy".
8. **Survival** setup + intermission screen + results/leaderboard.
9. **Codex**: faction tabs; unit grid; detail pane: 3D turntable (drag to rotate, clip picker for idle/attack/death), stats with bars, abilities with icons + descriptions, lore, joke, counters/countered-by, unlock status; Props and Arenas tabs.
10. **Achievements** (24, progress bars, silly icons) and **Stats** (lifetime totals incl. absurd stats).
11. **Settings** tabs: Graphics (preset Potato/Papyrus/Marble/Olympian, resolution scale, shadows, bloom, clouds, debris cap, auto-scale on/off, FPS counter), Gameplay (gore style, corpses, camera sensitivity, edge scroll, auto-pause on blur), Audio (Master/Music/SFX/UI/Announcer, mute, announcer voice (TTS) experimental off by default, subtitles), Accessibility (reduce motion, shake %, flash limiter, UI scale, colour-blind team palette, high-contrast UI), Controls (rebind camera/speed/pause, list), Data (storage status, export/import all, reset progress with in-page modal), About.
12. **Credits**: generated from the asset ledger + libraries (three.js MIT, GSAP standard licence note, fonts OFL, audio authors with licences and links that open in a new tab) + the fake "studio" credits joke list.
13. **Diagnostics**: WebGL2/renderer/GPU strings, quality tier, FPS/ms, draw calls, triangles, units, JS heap (if available), audio state + per-asset load path (embedded/fetched/synth) + codec support, storage status, CSP violations log, copy-to-clipboard.
14. **Arena Builder** and **Soldier Workshop** + **Voxel Painter**: see `spec/editors.md` (EDITORS owns; follows this kit).
15. Phones: single-column layouts; editors show a friendly "Built for bigger screens — try a tablet or desktop" tablet with a link to the gallery; battle HUD collapses.

## 5. Battle HUD
- Top-centre: **army meter** (A vs B bars with unit counts, cost remaining), objective tracker, timer.
- Top-right: speed controls (0.25 / 0.5 / 1 / 2 / 4, pause), camera mode buttons (Orbit, Follow, Command, Top-down, Cinematic, Photo), kill-feed (last 5, funny verbs), settings gear.
- Bottom-left: **announcer** (portrait of Brutus/Plato/Cassandra, name, typewriter text with blips, subtitle toggle respected) + selection card (hover/selected unit: name, role, hp bar, kills, status, blurb joke).
- Bottom-centre: god-power bar (6 icons with cooldown sweep, hotkeys 1-6) and order buttons (Advance, Hold, Retreat, Focus) for the selected squad or all.
- Bottom-right: **minimap/radar** (terrain colour map + team dots + camera frustum, click to jump), type counts list (collapsible).
- In-world: unit health bars only for damaged/hovered/selected units and heroes (instanced quads), team-coloured selection ring, speech bubbles (<= 12 pooled), damage numbers (glyph quads), floating "BLOCKED!/CRIT!/BRACE!" tags, objective markers.
- Rules: DOM text updates <= 10 Hz via batched `textContent`; no layout reads in the frame loop; HUD hit areas never cover more than needed (`pointer-events:none` on containers); `Tab` hides HUD; `H`/`?` shows the controls overlay.

## 6. Input map (rebindable subset marked *) — per-context binding table; a rebinding may not collide inside its context
| context | keys |
|---|---|
| Battle camera | WASD/arrows pan*, Q/E rotate*, Z/X tilt*, Shift fast, wheel zoom, F follow selected*, T top-down*, C cinematic*, P photo*, M minimap, Tab hide HUD, H help |
| Battle control | Space pause*, [ ] slower/faster*, 1-6 god powers, O/L order buttons (advance/hold), Enter = Take Command on selected, Esc pause |
| Take Command | WASD move, click/tap attack nearest in aim cone, 1-3 abilities, Shift sprint, Esc exit (god powers disabled) |
| Placement | LMB place/paint, RMB orbit, Ctrl/Cmd+Z / +Shift+Z undo/redo, Delete erase, B brush cycle, Q/E rotate formation, Space = FIGHT confirm focus |
| Results | R rematch, T tweak army, K kill-cam, Esc menu |
| Arena Builder | R rotate prop, Alt+wheel scale, Shift lower/scatter, Ctrl+Z undo, B brush cycle |
| Painter | P pencil, E eraser, G fill, L line, B box, I eyedropper, X/Y/Z mirror axes, [ ] brush size |
Legacy list follows for reference.

### 6.0 Legacy list
Mouse: LMB select/place/paint/attack (Command mode), RMB drag orbit, MMB drag pan, wheel zoom, double-click focus unit. Keys: WASD/arrows pan*, Q/E rotate*, R/F tilt, Shift fast, Space pause*, [ ] slower/faster*, 1-6 god powers, F follow selected*, T top-down*, C cinematic*, P photo*, M minimap toggle, Tab hide HUD, H help, Esc pause/back/cancel, Enter confirm, Ctrl/Cmd+Z / Shift+Z undo/redo, Delete erase, B brush cycle. Take Command (`Enter` on selected unit or button): WASD/left stick move, click/tap attack nearest in aim cone, 1-3 abilities, Shift sprint, Esc exit.
Touch: one-finger drag orbit, two-finger pan + pinch zoom, tap select/place, long-press = unit info, on-screen joystick + 3 buttons in Take Command; `touch-action:none; overscroll-behavior:none` on the canvas.
Focus: the canvas takes keyboard focus on first pointer-down; a visible "Click the arena to give it keyboard focus" chip shows when focus is lost. Pointer lock is **optional** (only requested if the player enables "Mouse look" in Take Command; failure silently falls back to drag-look).
