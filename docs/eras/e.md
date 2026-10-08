# e.md: exposition of the request "Add more campaigns, medieval, modern and scifi" (COORD, 2026-10-08)

## 1. The request, literally and in full

> Add more campaigns, medieval, modern and scifi.

Said by the user while the Ancient-era build was about to be released (all gates green, hosted at https://claude.ai/artifact/5mVZ2YHzQjHzP5rxtptuZ8, version 8). The title screen of that build carries the joke tablet "ROADMAP: MEDIEVAL ERA. NOT IN THIS BUILD." The user's first brief said "Start with ancient era": this request is the "then the rest" the first brief promised.

## 2. What the user actually expects to see

When the user opens the same hosted link after this turn they expect **three more complete campaigns** next to the Ancient one, each as finished and as funny as the first, in this order of obviousness:

1. **A way to choose an era.** Campaign opens an era chooser (Ancient, Medieval, Modern, Sci-Fi). Each era has its own campaign map with nine missions in three acts, each mission with a briefing by the three commentators, three stars, rewards and unlocks, exactly as the Ancient campaign works today.
2. **Soldiers that belong to the era, built of voxels, with animation worth watching.** Knights and pikemen and trebuchets and a dragon; riflemen, machine-gun teams, snipers, tanks, artillery, helicopters; marines, power armour, mechs, hover tanks, drones, aliens. Each unit is a real voxel model with its own animations (strike, shoot, reload, throw, hit, death, locomotion), a blurb, lore, jokes, death quotes, taunts, cost, stats and role, and it behaves in the simulation the way its role says it should.
3. **Arenas and props of the era.** Castles with gates and moats, villages, forests, mountain passes; cities, bridges, airfields, trench lines, harbours; moon bases, alien jungles, neon cities, crashed ships, ice and lava worlds. Each campaign mission has a place that suits it, and the same places are playable in Quick Battle and in the Arena Builder (era props and materials).
4. **Era mechanics that change how you play, not only how things look.** Medieval: sieges, gates, heavy cavalry charges, spear walls against knights, banners and morale, poison, healers. Modern: guns with range and suppression, cover, explosives and artillery, vehicles with armour, helicopters, mines. Sci-Fi: energy weapons, regenerating shields, cloaking, EMP against machines, teleporting, hover units, orbital strikes. Missions teach and exploit these mechanics.
5. **Sound and music of the era from the internet**, like the Ancient era: gunfire, engines, lasers, mech steps, plasma, alien screeches; music that fits each era. Licensed (CC0 / CC BY), credited in the in-game Credits, trimmed and normalised, with synthesised fallbacks.
6. **Humour in every layer.** The same three commentators (Brutus the over-excited play-by-play, Plato the philosopher, Cassandra the doom analyst) have been dragged through time and misunderstand every era. Unit jokes, tips, achievements, mission briefings, results lessons and wave names are rewritten for each era. No real-world nations, wars, extremists or stereotypes: fictional factions, a toy-box tone.
7. **Everything else the game offers works in the new eras**: Quick Battle with era factions and arenas, Survival with era waves and bosses, Daily Skirmish, Puzzles, Codex with every unit, Achievements, Soldier Workshop with era parts (custom soldiers), Arena Builder with era props, share codes, save, export/import. Progress, stars and stats are kept per era and nothing in the Ancient save is lost.
8. **Studio finish.** It must feel as polished as the Ancient release: the title screen and menus show the eras, each era has its own look (colour accent, diorama, map), nothing is a placeholder, every button works, the console is clean, performance stays inside the same budgets (600 units on Marble), the packed page stays within the artifact limits, and the work is verified by tests, a green gate, two independent QA rounds and a verification report that is honest about what was not or could not be verified.

## 3. What "campaign" means here (so nobody builds the wrong thing)

A campaign is the Campaign mode of the game for one era: a map screen with nine mission pins in three acts; for each mission a briefing (three voices, rules, par, star conditions, rewards), an arena with markers and a scripted enemy (waves, VIP, general, gates, boss), an objective (eliminate, kill the general, hold the hill, protect the VIP, destroy, survive waves), a time limit, three stars (win; win with half the army alive; the mission's own test), rewards (title, mutator unlocks, workshop parts, codex entries) and a results screen with the next mission. It is **not** a skin on the Ancient missions: the units, arenas, enemies, objectives and jokes are new. It plays on the same engine, so the same rules (determinism, budgets, caps) apply.

## 4. Why this is hard (the facts of the code that make a naive version fail)

- The simulation and content were built for one era: 121 files reference `era_ancient`; `STAT_TABLE`, the prop catalogue, the part library, `SIM_BARKS`, lesson and wave text are imported from `era_ancient` paths by the sim, the world, the renderer and the editors. A second era cannot be added by copying files: the content layer needs an era registry and merged tables.
- New eras need **new simulation mechanics** the sim does not have: firearms and suppression, explosives and artillery with real area damage and craters, vehicles (hull and independent turret), flying or hovering units, energy shields, cloaking, EMP, beams, teleporting, mines, orbital strikes. These touch the deterministic 30 Hz core, which has 27 criteria and a balance harness; every new rule must keep determinism and the performance budget (300 units <= 2 ms thread CPU per tick).
- New eras need **new rigs and clips**: rifle aim / fire / reload, grenade throw, tank turret and recoil, helicopter rotor, mech walker, drone, hover bob. The animation system derives clips per rig from one clip id per unit.
- **Content volume** is large: the Ancient era is 43 units, 7 factions, 16 arenas, 41 props, 9 missions, 6 puzzles, 486 announcer lines, 63 tips, 374 sound effects and 8 tracks. Matching that for three eras is the real size of this request.
- **Budgets**: the packed page is 3.1 MB of a 5 MB budget; models are built from code at run time, so three eras of builders and text could double it. Triangle and draw-call budgets, the 16-type battle cap, the 48-part model cap and the audio decode ceiling all apply to new content.
- **Save compatibility**: stars, progress, custom soldiers, arenas and armies saved by the Ancient release must keep loading.
- **Taste and safety**: modern and sci-fi war content must stay cartoonish and fictional; the jokes must punch at situations and at the commentators, never at people or at real events.

## 5. How I will go above and beyond (depth, not breadth)

- Each era's mechanics are visible and teachable: a mission exists for each mechanic, with a star that rewards using it; the HUD, telegraphs and announcer explain it when it first appears.
- Counters are real: pikes beat knights who beat archers; armour beats rifles, rockets beat armour, snipers beat officers, helicopters beat tanks, anti-air beats helicopters; EMP beats mechs, shields beat lasers' chip damage, cloaking beats range. Balance is measured by the same harness and bots as the Ancient era (mirror fairness, duels, counters, campaign win-rate bands) rather than by feel.
- Every mission has a set-piece moment (a dragon over the keep, a tank column on the bridge, a mech duel, an alien queen) that the camera, the announcer and the music treat as an event.
- The commentators have a running time-travel gag with callbacks across campaigns ("Brutus has bought a headset", "Plato asks what a tank is for", "Cassandra predicted the robots; nobody listened, again").
- A Time Warp sandbox in Quick Battle (any units of any era fight each other) is the obvious joy of shared engine data and is built if it costs little after the core works; it is an optional extra, not a gate (O1).

## 6. What is explicitly NOT in this request (O codes: not built unless free)

- O1: cross-era mixing ("Time Warp") beyond what falls out of shared data. O2: a fifth era or a tutorial rework. O3: multiplayer, replays, new accessibility systems. O4: rewriting the Ancient era, except where the shared engine needs it (balance of Ancient units must not drift; its campaign records must stay valid or be re-recorded deliberately). O5: real GPU tuning (not measurable here).

## 7. Decisions I am making on the user's behalf (D codes; the user can overrule)

- D1: Each era is a full era pack: its own factions, units, arenas, props, nine-mission campaign, six puzzles, survival waves and bosses, daily seeds, codex pages, achievements, workshop parts, music and sound, humour.
- D2: All eras are open from the first launch (no lock behind the Ancient campaign); inside an era missions unlock in order, as today. Saved progress is per era.
- D3: Same three commentators across eras, now time-travelling; tone stays toy-box and fictional (no real nations or conflicts).
- D4: Target size per era: about 34-38 units in 5-6 fictional factions, 11-12 arenas, 35-40 props, 9 missions, 6 puzzles. If measurement says a count must shrink to hold quality or budget, the shrink is stated and logged, not silent.
- D5: Era content lives in `src/content/era_<id>/`, merged by a new era registry; the Ancient files keep their paths (no churn for churn's sake), the sim reads merged tables.
- D6: The sim gets new mechanics only through data-driven abilities and weapon/projectile kinds, deterministic and budgeted; SIM owns `src/sim/**` as before.
- D7: Era audio is sourced from the internet under CC0 / CC BY and credited, as in the Ancient release; anything missing falls back to synthesis.

## 8. Definition of done (what I must be able to show)

1. The hosted link opens on a title whose Campaign leads to four eras; each of the three new campaigns can be played from mission 1 to mission 9 through the real UI, each mission deploys, accepts an army, runs, ends, awards stars, unlocks the next, and shows era-correct results; puzzles, survival and daily work in every era.
2. Every new unit has a model, animations, text, sounds, stats and a place in the balance harness; no unit falls back to the placeholder model.
3. The gate (`node tools/gate.mjs`) passes with new tests for every new system; `tools/modes.mjs` plays every mission and puzzle of every era; the contract validators cover the new content.
4. Two independent QA rounds, fixes, and `docs/verification_report.md` extended with era criteria and an explicit "unverified" section.
5. Performance and size budgets hold (600 units, draw calls <= 160 at Marble, packed fragment <= 5 MB or the budget change is logged with its reason).
6. Credits list every new third-party asset and licence; the final message states what came from the internet, what is unverified (sound, real GPU speed, hosted-viewer run, non-Chromium browsers) and what was cut.
