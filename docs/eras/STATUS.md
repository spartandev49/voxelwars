# docs/eras/STATUS.md: living status of the "Medieval, Modern, Sci-Fi" project (COORD rewrites this at every phase boundary)

Request (user, latest genuine message): "Add more campaigns, medieval, modern and scifi."
Process (user preference): e.md -> plan.md -> Socratic q.md (subagents) -> regenerate plan -> loop until dry -> spec.md -> DO IT -> check and simulate the user.

## Where we are (plan.md phases P0..P6)
- Planning loop: e.md, maps 01..08, plan v1 -> r1 (174 q, 28 blockers) -> v2 -> r2 (75 new, 14 blockers) -> v3 -> r3 (program and product converged, engine 2 blockers) -> **v3.1 (this tree): zero known plan blockers**. Residual lists in `q3_*.md` go verbatim to the spec writers.
- NEXT: P0 = spec writing (workflow: spec writers per deliverable, each reviewed), then TOOLS first (provenance, goldens G1..G12, gate lanes) before the first engine edit.
- Phase table: P0 truth and design -> P1 foundation + plumbing slice -> P2 mechanics, content, mechanic slices -> P3 per-era pipeline and era releases -> P4 integration -> P5 QA x2 -> P6 release.

## Live facts
- Published Ancient build: https://claude.ai/artifact/5mVZ2YHzQjHzP5rxtptuZ8 (version 8, private). Work branch claude/cool-babbage-g7oakv (no PR requested).
- Machine: 4 CPUs, 15 GB; workflows cap 2 agents each; heavy jobs one at a time. The container restarted once; disk persisted; running workflows are lost on restart (relaunch from the saved script).
- Budgets: packed page 3.11 MB of 5 MB; 160 draws at 600 units Marble (159 measured); sim 0.91 ms/tick at 308 units of 2 ms; 382 published files of 511.
- Honest estimate: about 640-700 sessions, 17-26 continuous days (plan section 12; wbs.csv will replace it).

## Reds / open items
(none yet; engine edits have not started)

## Decisions log
See plan.md section 15 (D2..D24) and `cuts.md`.
