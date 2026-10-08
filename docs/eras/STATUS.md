# docs/eras/STATUS.md: living status of the "Medieval, Modern, Sci-Fi" project (COORD rewrites this at every phase boundary)

Request (user, latest): "Add more campaigns, medieval, modern and scifi."
Process (user preference): e.md -> plan.md -> Socratic q.md (subagent) -> regenerate plan -> loop until dry -> spec.md -> DO IT -> check and simulate the user.

## Phase
- [x] e.md (exposition)
- [x] maps 01..07 (code cartography) ; 08 (tests/tools/gate/build) in flight
- [x] plan.md v1
- [x] q1 round (5 critics: ~190 questions, 27 blockers) -> plan v2
- [ ] q2 round (disposition audit + 3 critics) in flight
- [x] plan v2 written (WBS, 19-26 days est., ER1..ER24, M0..M17, G1..G10)
- [ ] plan v3 ... until dry
- [ ] spec.md + per-area specs + era design bibles
- [ ] P0 safety nets G1..G6
- [ ] P1 foundation, P2 Medieval, P3 Modern, P4 Sci-Fi, P5 integration, P6 balance, P7/P8 QA, P9 release

## Live facts
- Published Ancient build: https://claude.ai/artifact/5mVZ2YHzQjHzP5rxtptuZ8 (version 8, private). Branch claude/cool-babbage-g7oakv.
- Machine: 4 CPUs, 15 GB; workflow cap 2 agents each; heavy jobs (gate, balance, modes, browser) one at a time.
- Budgets: packed page 3.11 MB of 5 MB; 160 draw calls at 600 units Marble (159 measured); sim 0.91 ms/tick at 308 units of 2 ms; 383 of 511 published files used.

## Decisions log
(see plan.md section 15 for open ones)
