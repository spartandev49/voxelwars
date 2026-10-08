# traceability.md v0: every e.md clause -> plan item -> owner -> phase -> evidence (COORD, 2026-10-08)

Rule: a clause without a row, an owner and a test blocks leaving P0. Strength: S = strong, M = medium, W = weak (needs spec text). Evidence names the criterion (ER) or script that decides it.

| e.md clause | plan item(s) | owner | phase | evidence | now |
|---|---|---|---|---|---|
| 2.1 Campaign opens an era chooser (Ancient, Medieval, Modern, Sci-Fi) | AR5, CU6 (chooser always opens, Continue primary) | UI + INTEGRATION | P1 | ER8 (chooser path), ER15, ER21 | S |
| 2.1 Each era: map with nine pins in three acts | CU6 ERA_MAPS, MS | CAMPAIGN-x3, UI | P1 skeleton, P3 art | ER8, tour screenshots, ER21 | M (art direction per era in `design/<era>`) |
| 2.1 Briefing by the three commentators | MS, H, spec/H text-layer row (27 x 3 voices) | COMEDY-x3 | P2-P3 | ER11, ER8 | M until `spec/H` counts it |
| 2.1 Rules, par, three stars, rewards, unlocks | MS (star helpers, par definition), CU11 reward ledger | CAMPAIGN-x3 | P2-P3 | ER8, MS lint | S |
| 2.1 Results screen with next mission, era-correct | CU7, CU8, AR5 (next from own era list) | UI, INTEGRATION | P1 | ER8 (NEXT), ER15 | S |
| 2.2 Real voxel model per unit | UC, RA, rosters | UNITS-x3, ANIM | P2 | ER3, ER4 | S |
| 2.2 Animations: strike, shoot, reload, throw, hit, death, locomotion | RA clips, M17e/M17t, M2 burst contract | ANIM-CLIPS | P1-P2 | ER5 | S |
| 2.2 Blurb, lore, jokes, death quotes, taunts, cost, stats, role | UC, spec/H, ER11 | COMEDY-x3 | P2 | ER3, ER11 | S |
| 2.2 Behaves in the sim the way its role says | M2b, M-docs, ER7 | SIM, BALANCE | P2-P3 | ER6, ER7 | S |
| 2.3 Arenas of the era with markers; same places in Quick and Builder | W1-W11, CU10 Quick, W6 editors | WORLD, PROPS-x3, EDITORS | P1-P2 | recipe contracts, G2 net, ER10, ER22 | S |
| 2.3 Era props and materials in the Arena Builder | W2, W3, W6 | PROPS-x3, EDITORS | P2 | ER22 | S |
| 2.4 Medieval: sieges, gates, heavy charges, spear walls, banners, morale, poison, healers | M12, M10, M13, M6a, M7 (dragon); spear wall = existing brace (rows in ER7); charge existing | SIM | P2 | ER6, ER7 | M ("spear walls vs knights" is a counter row, not a module: stated in `spec/M`) |
| 2.4 Modern: guns, range, suppression, cover, explosives, artillery, vehicles with armour, helicopters, mines | M1, M2, M2b, M3, M9, M10, M8, M7, M11 | SIM | P2 | ER6, ER7 | S |
| 2.4 Sci-Fi: energy weapons, regenerating shields, cloaking, EMP vs machines, teleporting, hover, orbital strike | M2 (beam), M4 (regen), M5, M6b, M13 (blink), M7, M15 (orbital in god powers) | SIM | P2 | ER6, ER7 | S |
| 2.4 Missions teach and exploit the mechanics | MS curve rules, CU5 teaching, ER19 (every mission) | DESIGN-CAMPAIGN, UI | P0 design, P2 | ER19, ER8 | S |
| 2.5 Sound and music of the era from the internet | AU0-AU8, ER12, ER23 | AUDIO, HUNTER | P0 start, P2 | ER12, ER23 | S |
| 2.5 Licensed, credited, trimmed, normalised, synth fallbacks | AU1, AU7, licence snapshots | AUDIO, TOOLS-VERIFY | P2 | ER12, ER23 | S |
| 2.6 Humour in every layer; three commentators dragged through time | H arc, spec/H, CU18 | COMEDY-x3 | P0 spec, P2-P3 | ER11, ER21 | M (arc mechanism now in plan section 11) |
| 2.6 Unit jokes, tips, achievements, briefings, lessons, wave names | section 1 text-layer rows, spec/H counts | COMEDY-x3 | P2 | ER11 | M until counts exist |
| 2.6 No real nations, wars, extremists, stereotypes | VB, REAL_WORLD list, banned/allowed lists | DESIGN-ERA, TOOLS-VERIFY | P0, always | ER11, VB palette test | S |
| 2.7 Quick Battle with era factions and arenas | CU10, AR5 | UI | P1-P2 | ER10 | S |
| 2.7 Survival with era waves and bosses; Daily; Puzzles | M15 waves, CU10, MS, ER9 | CAMPAIGN-x3 | P2-P3 | ER9, ER10 | S |
| 2.7 Codex with every unit | CU10 Codex era filter, counters row, Mechanics tab | UI | P2 | ER3, ER15 | S |
| 2.7 Achievements, per-era Stats | CU9 | UI | P2 | ER25 | S |
| 2.7 Soldier Workshop with era parts | AR9, CU10 Workshop | EDITORS, SIM | P2 | ER22, U8 | S |
| 2.7 Arena Builder with era props | W6 | EDITORS | P2 | ER22 | S |
| 2.7 Share codes, save, export/import; Ancient save untouched | AR4, G5, ER16 | TOOLS-GOLDEN | P0 | ER16 | S |
| 2.8 Title and menus show the eras; each era its own look | CU6, CU17 chrome census, THEME_LOOK | UI, RENDER | P1, P4 | ER21 | S |
| 2.8 Nothing placeholder; every button works; console clean | UC, ER15 (uiscan), ER26, QA matrix | TOOLS-VERIFY, QA | always | ER15, ER26 | S |
| 2.8 Roadmap tablet gone / not contradicting availability | CU6 | UI | P1 | chrome census test | S |
| 2.8 Budgets: 600 units on Marble, draw calls, size | section 9 thresholds, R12, ER13, ER14 | RENDER, TOOLS | P0 measure | ER13, ER14 | S |
| 2.8 Verified by tests, green gate, two QA rounds, honest report | section 9, ER1..ER26, QA independence | TOOLS, QA | P5 | criteria.json, release_check | S |
| 3 Campaign = map, 9 pins, 3 acts, briefing, arena, scripted enemy, objective, limit, 3 stars, rewards, results | MS | DESIGN-CAMPAIGN | P0 | MS lint | S |
| 5 Each mechanic visible and teachable | CU5, CU13, R9, spec/CU | UI, RENDER | P2 | ER19 | S |
| 5 Counters are real, measured | CU14, ER7 (Wilson rule) | BALANCE | P3 | ER7 | S |
| 5 Set-piece per mission (camera, announcer, music) | CU3 SETPIECES, R17, AU stingers, ER20 | INTEGRATION, RENDER, AUDIO | P1 dispatcher, P2-P3 per mission | ER20 | M (dispatcher specified in CU3) |
| 5 Running time-travel gag with callbacks | H arc, callback ledger | COMEDY-x3 + EDITOR | P2-P3 | ER11 callback tests | M |
| 5 Time Warp | D19: OUT of this delivery | n/a | n/a | final message states it | S (decided) |
| 8.1 Each campaign playable 1-9 via the real UI; puzzles, survival, daily work | `campaign_play`, `modes --era` | TOOLS-VERIFY | P1 skeleton, P3 | ER8, ER9, ER10 | S |
| 8.2 No unit falls back to the placeholder model | `UC`, contracts `--strict` default | TOOLS | P0 | ER3 | S |
| 8.3 Gate passes with tests for every system; contract validators cover content | negctl per check, ER registry | TOOLS | P0+ | criteria.json | S |
| 8.4 Two QA rounds, fixes, report with era criteria and unverified section | section 9 QA independence, VF | QA, COORD | P5 | release_check | S |
| 8.5 Performance and size budgets hold | section 9 | TOOLS, RENDER | P0+ | ER13, ER14 | S |
| 8.6 Credits list every asset; final message honest | AU7, ER23, final message template | AUDIO, COORD | P6 | ER23 | S |
| O1 cross-era mixing | D19 (OUT) | n/a | n/a | n/a | closed |
| O4 Ancient not rewritten | non-negotiable 1, AP table, G1..G12 | TOOLS-GOLDEN | P0 | ER1 | S |
