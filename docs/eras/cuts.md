# cuts.md: shortfalls, decisions to not build, and the cut ladder log (COORD)

Rule: anything that is less than e.md or less than Ancient is written here with the reason and what would restore it; the final message carries this table. Nothing is cut silently.

## Decided at plan time
| id | what | reason | restore by |
|---|---|---|---|
| X1 | Time Warp (cross-era battles) is not in this delivery (D19) | not requested by the user; cost normalisation across four currencies needs its own harness work; engine stays ready (World takes any defs) | write `spec/TW`, add ER and a WP budget |
| X2 | units 34 per era (e.md D4 said 34-38), floor 30 | volume vs quality of models/animation; each unit needs a model, clips, reactions, audio, text | add units to the roster after release |
| X3 | arenas 12 per era vs Ancient 16 | e.md D4 11-12 | add recipes |
| X4 | workshop parts about 120 per era vs Ancient 254 | Ancient's 254 includes faction-specific parts; new eras get unit-specific parts + 40 generic | add part modules |
| X5 | announcer effective pool per era vs Ancient 486 total | neutral Ancient lines are reused after an agent read; new eras add era and signature lines | write more |
| X6 | sfx rows per era: Medieval 60, Modern 120, Sci-Fi 110 vs Ancient 374 total | source availability (hot families >= 6 sources), 511-file cap (sprite packs), decoded-PCM ceilings | hunt more |
| X7 | tips 40 and achievements 12 per era vs Ancient 63 and 24 | volume | write more |
| X8 | mechanics not built: transports/dismount, supply limits beyond magazines, high-ground bonus, fog of war, rubble as cover | outside e.md list; sim cost | later module |

## Ladder (section 13 of plan.md); capacity in sessions (estimate)
| rung | what | sessions saved (est.) |
|---|---|---|
| 1 | Quick-only arenas beyond 11 and Quick-only units beyond 30 per era | 3 x (2 + 3) = 15 |
| 2 | photo frames, hidden achievements, star-milestone track | 3 x 2 = 6 |
| 3 | generic workshop parts 40 -> 25, props 38 -> 34 | 3 x 2 = 6 |
| 4 | music 7 -> 6 (third battle tier) | 3 x 1 = 3 |
| 5 | teleport pads, smoke occlusion, wall-walk archers, wrecks | about 5 |
| 6 | announcer/tips/sfx to floor | about 6 |
| total | | about 35-41 (5-6% of 640-700) |

## Invoked
(none)
