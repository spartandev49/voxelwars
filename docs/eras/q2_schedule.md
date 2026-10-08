# q2_schedule.md: round-2 hostile review of plan v2, lens PROGRAM / SCHEDULE / TOOLING / VERIFICATION COHERENCE (2026-10-08)

Method. Read `e.md`, `plan.md` v2, `maps/08`, `q1_scope.md`, `q1_disposition.md` (the round-1 audit), then checked claims against the repo: `tools/build.mjs:32`, `tests/campaign/_lib.mjs:155` and `feasibility.test.mjs:48`, `src/audio/cues.js:180`, `src/world/arena.js:33`, `src/sim/abilities/`, `git log` (first project: 10-06 02:28 to 17:56 = 15.5 h, 45 commits; this program: 10-08 03:34 e.md to 04:49 plan v2 = 75 min), `docs/qa_round1.md:5`. Numbers marked (est.) are my arithmetic, assumptions stated. Nothing but this file was written.

Round-1 items that v2 genuinely answers (WBS exists as a section, WP size rule, TOOLS role, ER1..ER24 registered in code, calibration gate named, ladder with triggers, S-FREEZE defined) are not repeated. What follows attacks places where the answer is nominal, wrong or contradictory, and things v2 introduced. Items already listed as C1..C16 in `q1_disposition.md` are only cited where I add new evidence or a different required change.

Severity count: 4 BLOCKER, 16 MAJOR, 2 MINOR (22 items).

---

## BLOCKER

### Q1. BLOCKER. The session estimate equals the number of line items in the plan; there is no WP table, "day" and concurrency are undefined, so 340-430 sessions and 19-26 days are neither derived nor auditable.

**Question.** Which work packages add up to 343-427 sessions, how long is a "session", how many run concurrently, and what is a "day"?

**Evidence.**
- Section 12 promises "work packages (WP) have an owner, predecessors, an acceptance script, <= 90 minutes and <= ~10 files". No WP list exists; the table is by phase only. The sums are arithmetic-correct (343-427 sessions, 18.5-25.5 d) but the phase wall-clocks are added end to end, although P2 is "parallel" and P3 "overlapped".
- Count one WP per enumerated item in the plan: M0..M17 incl. M2b/M15a/M15b/M17 basic+full = 20; R1..R17 = 17; W1..W9 = 9; C1..C21 = 21; AU0..AU8 = 9; A1..A7 = 7; G1..G10 = 10; new tools = 8; gate-engineering lines = 7; spec deliverables = 13; rigs = 13; spikes = 5; units 102/4 (plan: "units are WPs of 4") = 26; props 114/4 = 29; arenas 36/2 = 18; missions 27/2 = 14; puzzles 18/3 = 6; COMEDY 3 x 4 = 12; survival/daily 3 x 2 = 6; INTEGRATION 3 x 3 = 9. Sum P0..P2 = 259; plus the plan's own P3..P6 rows (128-169) = **387-431**. The plan says 343-427. The estimate is "one WP per item, no splitting, no rework, no integration of patch requests, no tracer per rig (13 more)". Items that cannot be one 90-minute, 10-file WP: M7 (21 `hash.query` sites + nav classes + hazards + `_integrate` + air AI + armygen + validator), M8, M2b (ten tables), M10, M12, M14, M17; R3, R6, R12; C6, C7, C11, C16; A1 (q1_scope: the registry refactor touches 121 files).
- Implied throughput: P0 11-18, P1 15-23, P2 16-26, P3 10-19, P5 15-33 sessions/day. At 1.5 h per session that is 0.9-1.3 concurrent agents if the box runs 24 h/day, or 2.8-3.8 if a day is 8 h. Section 12 lists about 31 role slots (COORD, TOOLS, DESIGN, SPIKE, REGISTRY, SIM, ANIM, UNITS x3, RENDER, WORLD, PROPS x3, EDITORS, CAMPAIGN x3, INTEGRATION x3, UI, AUDIO+HUNTER, COMEDY x3, BALANCE, QA, REVIEWER) and STATUS.md says "workflow cap 2 agents each".
- "At the observed pace": no pace is observed anywhere in the plan. q1_scope estimated 250-330 sessions in 6-12 days (assuming 4-6 concurrent); v2 raised sessions 30% and wall-clock more than 2x with no stated cause.

**Failure scenario.** On day 6 the calibration gate divides actual sessions by an estimate that has no rows, so any number can be called "on track"; the user asks "when" and the answer is 19-26 of an undefined unit.

**Required plan change.** (1) Generate `docs/eras/wbs.csv` (WP id, owner, predecessors, phase, hot files, size class S/M/L = 1/2/4 sessions, acceptance script) and compute the phase sums from it by script; section 12 quotes the script output. (2) Define: session = one agent run <= 90 min including its gate; day = 24 h continuous operation, or state working hours; concurrency per phase (agents, lanes, workflows). (3) Present the estimate as `N x s / (c x u)` with stated c (3-5) and u (0.5-0.7) and show the sensitivity (Appendix A: 7-22 continuous days for 430-600 sessions). (4) Split every item named above into >= 2 WPs in the WBS before the estimate is accepted.

### Q2. BLOCKER. Step 0 (provenance) cannot be executed as written, has no timebox and no fallback, and every golden hangs on it.

**Question.** How does "read the hosted v8 fragment back, hash it, build the candidate commit with the same flags, tag `ancient-v8` only when the bytes match" produce a match?

**Evidence.**
- `tools/build.mjs:32`: `__VW_BUILD__ = new Date().toISOString().slice(0, 10)`. The build date is baked into the bundle and shown in Diagnostics (`src/app/diagnostics.js:14`). A rebuild on 2026-10-08 differs from a build of 2026-10-06 unless the date is injected. "Same flags" does not cover it.
- The shipped page records only `1.0.0` and a date, no commit. `git tag` is empty; `dist/` is untracked since 04:03. The candidate set is small (last code commit `4aafd2e`, 10-06 17:56, then 5372e74, 35d2f7a) but the plan names no procedure to pick it.
- The Artifact tool wraps the page in a document skeleton at publish time and `read` returns the stored page; whole-page bytes can never equal `dist/artifact/index.html`. Only the inflated `vw-pack` payload can be compared, and the plan does not say so. `files.json` today is `{path: path}` (map 08 section 1.8): it holds no hash or size, yet ER24 compares "by hash and size".
- C5 in the disposition: tag and worktree need git; nobody who may run git is assigned.
- "If not, find out why first" has no limit; G1..G10, perf A/B baseline and the cross-version save tests are all recorded "from that tag".

**Failure scenario.** The hash differs by the date string; an agent spends a day bisecting, or loosens the check silently and the baseline is "approximately v8".

**Required plan change.** Specify the procedure: extract and inflate the `vw-pack` from the read-back page; build candidates `4aafd2e` and its two predecessors with `--minify` and `__VW_BUILD__` overridable (`VW_BUILD_DATE`, a TOOLS change to build.mjs); compare the inflated JS bundle, CSS, manifest and clips JSON by sha256. Timebox 3 sessions. **Fallback that needs no byte match**: run the G1 matrix and G6 replays inside the hosted v8 fragment in Chromium (`window.__vw.world`) and require identical digests to the Node run of the candidate commit (this is also the Node-vs-Chromium parity of ER13). Assign tag/worktree/commit creation to COORD explicitly. Extend `files.json` with `{sha256, bytes}` in the same change.

### Q3. BLOCKER. The calibration gate has no teeth: biased sample, undefined baseline, a trigger larger than the ladder can absorb, and no stop-and-ask.

**Question.** What exactly happens on the day the calibrated projection says +35%?

**Evidence.**
- Sample bias. The gate measures "sessions per tracer unit, per sim module and per rig" at the end of P1, but P1 holds only the cheap modules M0 M1 M2 M2b M3 M15a M17-basic. The expensive ones (M7 layers/air AI, M8 vehicles, M10 craters, M12 props-as-structures, M14 objectives) are all P2. A tracer unit cannot meet the plan's own unit contract in P1: of the 10 U1 clauses (section 0.5) six are impossible then: death/hit reactions per cause (M17-full), projectile sound (AU4, placed in no phase), audio profile (AU4/AU1), codex counters row (C17, unplaced), balance row in [30%, 62%] (needs the era-ised balance harness and S-FREEZE), membership in a mission, survival pool and Quick faction (C-items). So "cost per tracer unit" is roughly 40% of a real unit.
- Baseline. "Exceeds the estimate by 30%" is against a range (343-427) with no rows (Q1); 30% of the high end is 555, of the low end 446.
- Capacity of the ladder (est., WPs under the plan's own sizes): rung 1 Time Warp 5-8 (note it sits inside the P4 row 15-20 as a "stretch"; if it is in the estimate it is not a stretch), rung 2 mutators/photo frames 3-4, rung 3 arenas 12 to 11 and units 34 to 30 = 2 + 3, rung 4 parts 120 to 90 per era and props 38 to 34 = 9 + 3, rung 5 one music tier 1-2, rung 6 mines/smoke/wall-walk/teleport pads/wrecks 8, rung 7 floors 6. Total about 40-45 sessions = 10-12% of 385. The trigger is +30% = about 115 sessions. Everything else is on the NEVER-cut list (headline mechanics, 9 missions + 6 puzzles per era).
- The gate's output is "written to STATUS.md"; no decision owner other than COORD, no message to the user.

**Failure scenario.** Calibration says +40%; the ladder can recover 12%; COORD either breaks the NEVER-cut list silently or lets the schedule slip without telling anyone.

**Required plan change.** Make the calibration gate a decision table agreed now: projection within +15% continue; +15% to +30% pre-approved rungs 1-3 executed and logged; above +30% (or if the ladder's remaining capacity is less than the overrun) STOP: message to the user with the calibrated schedule and the choice (extend, or name which NEVER-cut item to drop). Move the calibration to a second checkpoint in P2 after M7+M12+M14 have landed (the first real expensive modules) and calibrate on at least one full-contract unit per rig class, not on tracers. State the ladder capacity in sessions in `cuts.md` at plan time.

### Q4. BLOCKER. TOOLS is a single point of failure: roughly 115 sessions of work, 8 new tools without owner/phase/size, inside a P0 that is budgeted 45-55 sessions for everything.

**Question.** Who builds, sizes and sequences the verification stack, and in which phase does each tool become usable?

**Evidence.** Section 3: "Tools that do not exist yet and are written in P0/P1: campaign_play, release_check, uiscan, negcontrols, audit_sfx, readability, perf_assert, criteria registry". Neither the P0 nor the P1 row of section 12 lists them. One `TOOLS` role (section 12 roles list, no multiplicity; contrast UNITS x3, COMEDY x3). Content agents "may not edit thresholds, bands, floors or goldens (they file requests to TOOLS)" (A7), so every threshold change also funnels through TOOLS. Count (est., 90-min WPs; derivation in Appendix B): provenance 2, G1..G10 24, gate engineering 18, era-ising existing tools (balance.mjs seam 18, contracts + U1 matrix, tour/flow/modes/smoke, feasibility per era, lint rules, text sweep; map 08 seams 5-22) 28, new tools incl. the ones ER needs but section 3 does not name (far-mesh readability ER4, ablation ER6, parity/soak ER13) 44 = **about 115**. Even at 40% less, 70 sessions exceed all of P0. The tools are also needed at different times: `perf_assert` scenarios exist only when the mechanic exists (P2), `audit_sfx` needs the M2 taxonomy, `campaign_play` needs the chooser (P1) and mission data (P2), `readability` needs arenas.

**Failure scenario.** Day 4: goldens are done, gate engineering is half done, none of the 8 tools exists. Either P1 engine edits start without the gate the plan promised ("before anything else lands"), or P1 stalls behind TOOLS; and at P3 `campaign_play` does not exist and the first era is declared done on `modes.mjs`.

**Required plan change.** TOOLS becomes a team (TOOLS-GOLDEN, TOOLS-GATE, TOOLS-VERIFY, each its own directory ownership) with an explicit table: tool, owner, first usable phase ("skeleton on Ancient in P1, extended per module in P2"), size in WPs, consumer ER, negative control. Put the table in `spec/V-verification.md` and add the rows to section 12. Order: provenance, G1/G6/G7, minimal gate (`--dist`, lanes, `--era`) before the first engine edit; the rest in parallel with REGISTRY.

---

## MAJOR

### Q5. MAJOR. ER1..ER24 are not each checkable by a script that exists in the WBS: 7 of 24 have a named tool; the rest depend on "tests" with no author or phase.

**Question.** For every ER, which script produces the pass/fail, who writes it, in which phase?

**Evidence (my reading of section 9 against section 3 and 12).**

| ER | script that must exist | named in WBS? | gap |
|---|---|---|---|
| ER1 | G1..G10 tests | yes (P0) | G8/G9/G10 need a browser driver and tolerance, not sized |
| ER2 | registry/DAG lint + collisions | A7/lint only | no owner; lint rules of map 08 seam 6 are not listed |
| ER3 | U1 matrix in contracts + silhouette-hash recolour check | no | not a tool in section 3; silhouette hash needs voxel projections |
| ER4 | far-mesh render at 40/80 u + pixel metric (>= 60%) | **no** | `downsample2` lint is in the builder, the 60% metric needs a renderer tool; not among the 8 |
| ER5 | tests/anim extended | partly (roster.test exists) | per-rig reaction tables unowned |
| ER6 | ablation harness (feature off shifts win rate) + coverage metric | **no** | no scenario type in balance.mjs (map 08 section 5) |
| ER7 | balance.mjs era-ised, Wilson counters, first-contact, mechanic-off | **no** | map 08 seam 18/19: a rewrite of an 811-line tool, owner BALANCE vs TOOLS undefined |
| ER8 | campaign_play | yes | see Q13 |
| ER9 | 100 random legal armies per puzzle | no | needs a legal-army generator; 18 puzzles x 100 x 1.25 s = about 40 CPU-min |
| ER10 | modes.mjs `--era` | seam 14 only | +107 s per era (map 08) |
| ER11 | text sweep, REAL_WORLD, Jaccard, copy-in-context over 150 battles, blind scores | no | see Q20 |
| ER12 | audit_sfx, mixtest, pack cross-correlation in Chromium, cue trace, licence re-verification | audit_sfx only | cue-trace and pack tests unowned |
| ER13 | perf_assert, parity, soak | perf_assert only | parity and 40-battle soak unowned |
| ER14 | `build --report`, minified size gate, file count | map 08 seam 10, not in section 3 list | gate builds unminified today (3,312,977 vs 3,106,540 B) |
| ER15 | uiscan | yes | see Q16 |
| ER16 | save tests vs tagged build | G5 | ok |
| ER17 | readability | yes | combinatorics, Q12 |
| ER18 | flash limiter luminance-variance test | no | needs frame capture |
| ER19 | beats fired | C6 test | **only mission 1 of each era**; beats for later mechanics live in missions 2-9 |
| ER20 | set-piece fired + 4-frame filmstrip | via campaign_play | ok if Q13 solved |
| ER21 | chooser stills, census, blind classification | agent step | fine, but an agent read |
| ER22 | Workshop and Builder era flows | no | `editors/browser_all.slow` is 163 s for one era |
| ER23 | credits/licence test | exists | extend |
| ER24 | release_check | yes | needs hashes in files.json (Q2) |

**Failure scenario.** At release, 14 criteria read UNVERIFIED because nobody was ever assigned the script, or they are "verified" by an agent's prose.

**Required plan change.** Add a column to the ER table in `spec/V-verification.md`: script path, owner, first phase, runtime class (T-fast/T-era/T-full/release, Q12), negative control id. A criterion without a script row blocks the plan, not the release. Extend ER19 to every mission (beat list per mission from design/<era>.md).

### Q6. MAJOR. "stale = red" plus a recursive `simHash` contradicts "450-battle record at S-FREEZE and at release": the gate is red from the first sim edit until S-FREEZE, and one era's edit stales all eras.

**Question.** What do the stored Ancient records do while 18 SIM modules land?

**Evidence.** Today `simHash()` hashes `src/sim` and `src/world` non-recursively plus `era_ancient/stats.js` (`tests/campaign/_lib.mjs:155-160`), and a stale record only logs "STALE" and skips the replay (`feasibility.test.mjs:48-51`). Plan G6 changes this to recursive over sim, world, core, registry and every era's stats/arenas, "stale = red", records re-taken only "at S-FREEZE and at release", with a 30 s replay of 9 missions + 6 puzzles after each module. Redefining the hash makes every stored Ancient fingerprint stale on day one of P1. Every module (S28..S45) and every bug fix changes the hash, so the record check is red for the whole of P1-P2 (about 10 days), contradicting "at most 3 open reds per phase, none older than a phase" (section 9). A full re-record is 450 battles x 1.25 s = about 9.4 CPU-min per era (about 2.5 min on 4 CPUs), cheap, but 18 times x 3 eras is serialised behind the heavy lock. Because the hash covers "every era's stats/arenas", a Sci-Fi arena edit in P3 invalidates Medieval's finished records, which breaks the "Medieval, then Modern, then Sci-Fi (overlapped)" pipeline.

**Failure scenario.** Either the red check is waived ("known stale") and the reds rule is fiction, or each module hand-back re-records and the box is saturated; in P3 a late Sci-Fi tune makes the finished Medieval balance stale and nobody notices until release_check.

**Required plan change.** Two fingerprints: `engineHash` (sim, world, core, registry, shared render-affecting data) and `eraHash(era)` (that era's stats, arenas, missions, kit). A record carries both. After a module: replay check (30 s) must be green, record check reports STALE-ENGINE as a tracked amber (not red) until the scheduled re-record points; red only when `eraHash` differs for the era under test or at S-FREEZE/release_check. Define the re-record points (S-FREEZE, after each sim fix window, release) and re-take the Ancient records once, right after the hash redefinition, as a named P1 step with the old records kept for replay equality.

### Q7. MAJOR. Gates and "green commits" run against a shared working tree that other agents are editing; release_check's "clean tree" cannot hold; WIP commits push red states.

**Question.** What tree is the T-full result about?

**Evidence.** Section 12: "one shared working tree", "private `--dist` per gate run", "COORD makes a WIP commit at least hourly and a green commit at each green gate; both pushed". A T-full is 12-15 min (target) and longer with ER8/ER15 (Q12); agents keep writing meanwhile. The first project hit exactly this: qa_round1.md says the tree "moved a lot" between builds, with a machine load of 40-60, and map 08 saw `dist/` rewritten mid-session. release_check requires "clean tree, HEAD recorded"; in a shared tree with live agents it is never clean except in a freeze that the plan never schedules. Hourly commits over 19-26 days are 450-620 commits on the work branch, many red.

**Failure scenario.** COORD commits "green" a tree whose tests ran against a tree that changed twice during the run; a later bisect lands on a commit that never was green; P6's "clean tree" is satisfied by an agent that stopped for the moment.

**Required plan change.** Gates run on a snapshot: `git worktree add .cache/snap/<sha>` (COORD creates it) or `git archive` of the tree state at gate start, with node_modules symlinked; the gate result is stored with the snapshot sha and "green" is only ever applied to that sha. WIP commits go to a `wip/` branch; only snapshot-green shas are tagged `green-N` and pushed to the work branch. Add a freeze protocol for P5/P6: agents stopped, tree clean, release_check on the frozen sha, no builder runs during the 2 QA rounds.

### Q8. MAJOR. The P1 vertical slice cannot show what it is meant to prove, and "tracer per rig" is undefined for six rigs whose mechanics are in P2.

**Question.** Which modules and C-items does "mission 1 of each era through the real UI" need, and what does the review judge?

**Evidence.** P1 SIM scope: M0 M1 M2 M2b M3 M15a M17-basic. Not in P1: M4 shields, M5 cloak, M6, M7 air/hover, M8 vehicles/turrets, M9 cover, M10 craters/artillery, M12 gates/structures, M13 banner/blink/bailout, M14 objectives and `beat`/`setpiece` script events, C6 teaching, C15 god powers, C16 HUD and Take Command, C17 counters. Section 9's mission DoD requires "mechanic-blind variant loses >= 70%, beats fired, setpiece fired" for every mission: mission 1 of each era can satisfy none of the last two in P1. Tracer rigs: tank1 (M8), heli1/drone1/hover1/dragon1 (M7), trebuchet1/ram1 (M10/M12) have no mechanic in P1; a tracer there is a model plus clips in a look-dev harness. The rubric "reviewed against the rubric" is defined nowhere (disposition C3/PRODUCT-Q4). The only mechanics a P1 mission 1 can teach are bullets/burst/magazine (Modern), hitscan energy without shields (Sci-Fi), existing Ancient mechanics (Medieval): the slice proves plumbing (registry, chooser, campaign_play) and not the feel of any headline mechanic.

**Failure scenario.** The slice review passes ("it plays"), volume starts, and the first time anyone sees cover, shields, vehicles or the dragon in a mission is day 10-12, after 100+ content sessions were spent against an unproven look and unit-feel.

**Required plan change.** (1) Rename the P1 slice "plumbing slice" and list its exact module/C-item set; its acceptance is campaign_play green on the three mission-1s plus the rubric items that need only those. (2) Add a "mechanic slice" gate per era in P2, not P1: Medieval after M7+M10+M12 (dragon over a keep with a trebuchet and a gate), Modern after M8+M9 (tank column with infantry in cover), Sci-Fi after M4+M5+M7 (shielded hover tanks vs a cloaked squad). Content volume for an era (units beyond the tracers, props beyond 10, arenas beyond 3) starts only when its mechanic slice passes the written rubric. (3) Define tracer = U1 matrix minus the six P1-impossible clauses, and calibrate on that definition (Q3). (4) Write the rubric into `spec/C-campaign-ui.md` with 8-10 observable items (time to first contact, readability of the mechanic at default camera, teach beat visible, set-piece fires, announcer line, etc.).

### Q9. MAJOR. S-FREEZE is placed by the wrong coupling: M6 is mis-ordered against its first consumer, M15b/M17-full tie the freeze to content readiness, and nothing says when P3 may start.

**Question.** What is the start condition of P3-Medieval, and what exactly blocks S-FREEZE?

**Evidence.**
- Section 12 chain: "M7 M12 M14 M13 M10 -> M8 M9 M11 -> M4 M5 M6 -> M15b M17-full -> S-FREEZE", "ordered by earliest consumer". Section 4 gives M6 "needed by S, Med healer". M4 and M5 are Sci-Fi only, so by the plan's own rule M6 precedes them. The repo already ships `src/sim/abilities/heal_pulse.js` and `poison.js` (Ancient support units such as `priest_of_ra`, `stats.js:36`), so the Medieval healer needs only the organic/machine filter; the EMP/repair half is Sci-Fi. M6 should be split M6a (heal filter, Medieval, early) and M6b (EMP/repair, Sci-Fi).
- M17-full is a table of reactions "per (cause, fxClass, rig)": it cannot be finished before the ANIM reaction clips of all 13 rigs exist; M15b needs the lesson/bark lines of each mechanic from COMEDY. S-FREEZE therefore = max(SIM chain, ANIM reactions for every rig, COMEDY barks for 18 modules). The plan treats it as a pure SIM milestone.
- Records are tied to the global `simHash` (Q6), so any later module stales Medieval's balance. P3 "for Medieval, then Modern, then Sci-Fi (overlapped)" is therefore only valid after S-FREEZE, but nowhere says so; the Medieval content (modules M7 M12 M14 M13 M10 + M6a) is complete roughly at the middle of P2 and would idle.

**Failure scenario.** Medieval is content-complete on day 8 and waits to day 11-12 for Sci-Fi's cloak and EMP; or it is balanced early, a Sci-Fi change to the shared damage path in M4 shifts Medieval win rates, and Medieval is re-tuned twice.

**Required plan change.** Split M6; move M6a into the first group. Split M17 into M17-engine (selection mechanism, default table, in the SIM chain) and M17-tables (per-rig data, pure data in rig packs, may land after the freeze because it cannot change sim state; test: tables change no `stateHashFull`). Define P3 start per era: "all modules that era's mechanic matrix needs are merged, Ancient goldens green, and every later module is declared era-neutral by a test (`eraHash` unchanged for that era under the remaining modules)". With the two-fingerprint scheme of Q6 Medieval balance can start mid-P2 and be re-verified, not re-tuned, at the global freeze.

### Q10. MAJOR. The real critical path is not named: five serial chains (TOOLS, REGISTRY, SIM, ANIM, RENDER), the P3 "box-bound" label is wrong, and the re-record cycles after the freeze are the true tail.

**Question.** What is the critical path in elapsed hours, and which items sit on it?

**Evidence (est., derivation in Appendix B).**
- SIM: about 15 WPs in P1 and 33 in P2 (M7 5, M12 3, M14 3, M13 2, M10 3, M8 4, M9 2, M11 1, M4 2, M5 2, M6 1, M15b 2, M17 3). Single agent in `src/sim/**`, 1.7 h per WP including gate and golden replay: P1 26 h, P2 56 h.
- REGISTRY touches `game.js`, `meta.js`, `content.js`, router, uiBattle, save: about 14 WPs serial on hot files = 24 h, and P1 cannot end before it does.
- ANIM owns `animator.js` (867 lines) and 13 rigs x (tracer, clips, reactions): about 50 WPs = 85 h, longer than the SIM chain. The plan puts it in "P2 ANIM rigs + clips" as if it were parallel filler.
- RENDER owns `battleview.js`/`voxskin` for R1..R17 (14 of 17 touch them): about 22 WPs = 37 h, with R12 draw-call buy-back required "BEFORE content" in P1.
- After the freeze the tail is: balance (25 min idle, 33 loaded per era) -> campaign tuning (3 iterations x (16 min record + edit)) -> QA-lite (one day) -> staging per era, then P5 QA r1 -> sim fix window -> full re-record of 3 eras -> r2 -> fix window -> re-record -> release_check. Exclusive box time for all of P3-P6 is about 25-30 h (balance 3 passes x 3 eras, records, ER7 controls, campaign_play, release_check x3). Over 8-10 days that is 12-15% of the box, so "(box-bound)" in the P3 row is wrong: P3 is bound by sequential agent loops.

**Failure scenario.** The plan's attention goes to the SIM chain (shown in the table), ANIM runs out of capacity on day 9, S-FREEZE waits for reactions (Q9), and nobody had it on a critical-path list.

**Required plan change.** Add a critical-path section computed from `wbs.csv` (Q1): longest dependency chain in hours, with the five chains above as named lanes and a weekly float report in STATUS.md. Split ANIM into ANIM-RIGS and ANIM-CLIPS only if `animator.js` edits are funnelled to one integrator; drop "box-bound" or justify it with the heavy-job table.

### Q11. MAJOR. P0 cannot be completed in the order given: several S14 deliverables depend on facts that exist only after P1, and the session budget is about half of the content.

**Question.** Which P0 deliverables are blocked by later work?

**Evidence.**
- `spec/AU-audio.md` is a P0 deliverable with a "source matrix", but section 10 AU1 says the hunt is "driven by the frozen weapon/projectile/event taxonomy (after M2)" and AU2 packs wait for a "dress-rehearsal publish (P0)" whose real files exist only after the hunt (C14). `spec/M-mechanics.md` is to contain "per-mechanic budget" and perf numbers, but map 08 unknown 2 says per-battle CPU of new mechanics is measurable "once SIM lands two projectile kinds". The mechanics-to-mission matrix in `design/<era>.md` depends on the final module list and cut positions in `spec/M-mechanics.md`; `spec/C-campaign-ui.md` (rubric, wireframes, HUD, god powers, reward ledger, modes table, teaching) is the largest of the ten.
- P0 content, session count (est.): provenance and goldens 26, gate engineering 18, spikes 8 (rifle pose on 3 bodies x helmets x power armour, tread/rotor far LOD, voxel size, tank crew budget, mech gait, plus D8 prototype), spec and design documents 37 (13 deliverables, of which M-mechanics 4, C-campaign-ui 4, three design bibles 9, announcer template classification 2, reference gathering 3-4), new tools started 15 = about 100-105 versus the plan's 45-55.
- Dependency depth of the P0 documents: A-architecture -> M-mechanics -> mission matrix -> design/<era> -> traceability -> spec.md: five levels. At 1 h draft + 1 h review wave (this session: e.md to plan v2 in 75 min) the floor is 10-12 h; the 3-4 d wall-clock is credible, the session count is not.

**Failure scenario.** The AU matrix is written from guesses, the perf budget numbers are invented, P1 inherits "frozen" specs that are wrong, and the first erratum lands in P2 when it is expensive.

**Required plan change.** Mark each S14 deliverable with `P0-final` or `P0-draft, final at <gate>` (AU matrix at M2 freeze; mechanic budgets at P1 end with measured numbers; C-campaign-ui rubric before the P1 slice). Re-size P0 from `wbs.csv`; the wall-clock can stay 3-4 d only with >= 5 concurrent agents. Put the real-file publish rehearsal after the first pack exists (P1 end) and say so.

### Q12. MAJOR. T-full <= 15 min is inconsistent with the ER set, and no ER is assigned to a runtime tier; several ER definitions are combinatorial.

**Question.** Which ER scripts run in T-fast, T-era, T-full and release, and what does each cost?

**Evidence.** Section 3 targets T-fast <= 4, T-era <= 8, T-full <= 15 min on 4 idle CPUs. Map 08's own plan reaches 12-15 min for the old step list only (tests in 3 lanes, smoke/tour/flow/modes at 2 concurrent browsers) and lists the full gate at 24 min today, about 48 min with 4 eras sequentially. Section 9 adds on top: campaign_play of 27 missions through the UI, uiscan at 3 viewports for every screen with era params (tour today: 16 screens, 35 s at one viewport), negcontrols (10 mutations each running a gate subset), perf_assert A/B at 300/500 units x 3 eras, G8 renders, readability "for every arena x time x weather": 52 arenas x 7 weathers (`WEATHERS`, `src/world/arena.js:33`) x time-of-day (a continuous hour) = 1,456 renders at only 4 sampled hours, at SwiftShader 2-4 s each = 50-100 min, plus a 600-unit battle per era. ER9 (18 puzzles x 100 armies) and ER13's 40-battle soak add more. `Math.random` seeds in tools (map 08 end of 5b) make reruns non-reproducible.

**Failure scenario.** COORD runs "T-full" and it takes 1.5-2 h, so agents skip it, or the gate silently drops steps to hit 15 min and the dropped steps are exactly the new ER tools.

**Required plan change.** A runtime-tier column for every ER (Q5). Rule: T-fast = lint, syntax, unit tests, contracts, replay of 9+6 Ancient missions; T-era = plus that era's smoke(fight), modes(era), feasibility quick, uiscan on that era's screens at 1 viewport, ER3/ER5; T-full = everything except the release-only set; release-only = negcontrols full, readability full, soak, perf_assert full A/B, uiscan 3 viewports, campaign_play with bot ladder, G8. Define sampling for ER17 now (e.g. per arena: 2 times x 3 weathers sampled by a seeded rule plus the worst contrast pair found by a cheap pre-pass; 600-unit battle per era) and state the budget in minutes.

### Q13. MAJOR. ER8 "no harness-only workaround allowed" contradicts the only way a real-UI mission can be finished on this box, and "winner equals the recorded bot result" has no equivalence definition.

**Question.** What is allowed to differ between the bot run and the UI run?

**Evidence.** Map 08 section 1.10: `smoke --battle=6` reached tick 7 (standalone) and 15 (fragment) in 6-7 s at 4x on SwiftShader, i.e. 2.3 ticks/s. A mission of 90 sim-seconds is 2,700 ticks = 19.5 min of real time, 27 missions = 8.8 h. The shipped `flow.mjs` therefore fast-forwards with `world.step(90)` slices (commit 5372e74, 10-06 17:28), which is a harness workaround by the ER8 wording. Bot results are recorded from `runMission` at seed 1 with an authored `reference` army; the UI path places units by Deploy clicks (grid cell and snap), uses `Game.newSetup` (`Math.random` for non-daily seeds, game.js:92 per map 08) and the god-power/order input log. A close mission flips with a one-cell placement difference.

**Failure scenario.** Either campaign_play uses `step()` and violates its own rule, or it runs in real time and one tool run takes 9 hours; "winner equals recorded" flakes on close missions and gets waived.

**Required plan change.** Define "real UI" as every state change by clicks and keys; time may be advanced by `world.step()` slices because the 30 Hz loop is the same code (and ER13 proves Node-vs-Chromium parity). Define equivalence: campaign_play replays the same placement list and input log as the bot (the Deploy click helper converts cell centres exactly), fixes the arena seed, and asserts identical `stateHashFull` at the end tick, not only the winner. Time budget per mission in the tool spec.

### Q14. MAJOR. negcontrols have teeth only for 10 checks; the plan requires one "per new check", and QA samples 8.

**Question.** How many new checks are there, and how is "this check can fail" proven for each?

**Evidence.** Section 9: "a scripted mutation per new check in a temp copy (duplicate id, 5-char blurb, fallback model, missing cue, over-triangle prop, +1 KB over the cap, extra file, real-world word, edited golden, fixture with 0 eras) must turn it red; QA samples >= 8 per round". Ten mutations are listed; the new checks are the 24 ER (many of which hold five or more assertions each: ER7 alone has counters, mechanic-off, mirror, termination, first-contact, dead-air, S5-S9, U8, share fuzz), the 18 module tests, the 10 goldens, uiscan's six detectors and the lint rules. That is well over 100 checks. Missing from the ten: perf regression (+10% sim), nondeterminism (second RNG draw in sim), stale record, zero-assertion test, hidden-era leak, missing teaching beat, a unit recoloured (silhouette hash), a pack slice with two onsets. Each mutation costs a build plus a gate subset (1-3 min).

**Failure scenario.** A check silently never executes (the very class q1_verify Q29 found: era loops passing vacuously) and no mutation covers it; QA's sample of 8 happens to be among the original ten.

**Required plan change.** Make the negative control part of each check's definition of done: `tests/negctl/<criterion-id>.mjs` (mutation + expected failing check id) is required by the criteria registry (a check without a registered negative control is UNVERIFIED). `negcontrols` runs the manifest in parallel on temp copies; release runs all, T-full runs a seeded 10% sample. QA's >= 8 samples are drawn from the manifest by a seed QA chooses.

### Q15. MAJOR. The single-editor-per-hot-file rule fits only if per-unit and per-projectile rows live in era-pack data; the plan does not say where they live, has no owner table, and INTEGRATION x3 contradicts it.

**Question.** Which role edits which hot file, and how many requests per file does the work generate?

**Evidence.**
- Per-unit audio rows are code today: `SPECIES_BY_ID` is a literal at `src/audio/cues.js:180`, ability and role tables at :238. The unit contract (section 0.5) requires an audio profile, a projectile row with look and sound, a reaction set and a codex counters row for each of 102 units; AU4 introduces `PROJ_AUDIO`, `EXPLOSION_AUDIO`, `AUDIO_PROFILES`; R1 introduces `PROJ_FX`; M17 a per-rig reaction table; M13 allows 32 abilities per pack (about 96 cue rows). If those tables sit in `cues.js`, `battleview.js`, `animator.js`, every unit WP (26 of them under the plan's rule) emits 2-3 patch requests, roughly 60-80 requests into three owners, each integrated "in order" by an owner session; each WP's acceptance waits for the integration.
- `game.js` (714 lines), `meta.js`, `content.js` receive era in `newSetup`, Take Command per class, six-slot god-power sets, difficulty/assist ladder, daily/survival by era, what's-new, first-run path, mutator matrix, achievement semantics: C6, C11-C16, C18, C19 and A3/A4 are about 14 items on three files. Section 12 gives them to "INTEGRATION per era" (three agents) while the same paragraph forbids two editors per hot file (C4). `world.js` is ambiguous (`src/sim/world.js` is SIM, `src/world/*` is WORLD). `content.js` is an `era_ancient` file (Ancient must not change).
- The disposition (C4, SCOPE-Q4) asked for an owner table; v2 did not add one.

**Failure scenario.** The audio owner queue becomes the throughput limit of the unit pipeline; two INTEGRATION agents edit `game.js` in parallel because their era's task needs it, and one overwrites the other's change.

**Required plan change.** Add the principle "code in hot files, data in era packs": per-unit audio profile, projectile fx/audio rows, reaction tables, cue rows, strings live in `era_<id>/` data files that the hot file reads through the registry (A1). Create all extension points once in P1 (REGISTRY, with the hot-file owner) and then budget hot-file touches per file in the ledger (target: <= 3 per file after P1; more triggers a design review). Publish the owner table (file -> role -> integration cadence) and replace INTEGRATION x3 by one INTEGRATION owner for `game.js/meta.js/content.js` with era leads filing requests, or give each era a separate `era_<id>/glue.js` that the registry loads.

### Q16. MAJOR. New strict scanners and fixes (uiscan, readability, flash limiter, R12) run over Ancient screens and arenas, contradicting "Ancient does not change" unless a baseline policy exists.

**Question.** What happens when uiscan or readability goes red on a shipped Ancient screen?

**Evidence.** ER15 covers "every screen" at 3 viewports with 44 px, contrast and overflow rules; the Ancient QA found hit-target and phone-layout defects in the shipped build (qa_round1: Workshop/Painter tap targets, phone mute, title diorama hidden behind the menu at 1280x720; round 2 left several partly fixed). ER17 applies CIEDE2000 and "tracer coverage <= Y%" (Y not stated) to the 16 Ancient arenas. R16 "fixes a shipped dead setting" (Reduce Motion/flash limiter in battle), R12 changes terrain chunking, R6 changes the skin shader. P4 lists "uiscan fixes". Each fix changes DOM or pixels that G8/G10 freeze. The Ancient-policy table (spec A1) is described only for sim modules.

**Failure scenario.** uiscan reports 30 findings on Ancient screens in P4; fixing them re-records G8/G10 under two signatures and changes the shipped look, or they are waived one by one with no record.

**Required plan change.** Ratchet policy: Ancient screens/arenas get a committed baseline (`tests/baseline/uiscan_ancient.json`, `readability_ancient.json`) recorded in P0 from the tagged build; the check fails only on new or worse findings; Ancient fixes are optional, listed in spec A1 and re-recorded with two signatures. New/changed screens and all era screens are strict. Extend the Ancient-policy table to render, UI and audio changes (R6, R12, R16, AU3, THEME_LOOK default), not only to SIM modules.

### Q17. MAJOR. The staging-publish scheme does not match how the Artifact tool behaves: a new origin, no real save upgrade test, no hashes to compare, hidden-era leftovers, and no tested rollback.

**Question.** What does a "private staging artifact, updated in place" actually prove about the release on the user's URL?

**Evidence (Artifact tool contract).**
- Publishing without `url` creates a new artifact: the staging URL differs from `5mVZ2YHzQjHzP5rxtptuZ8` and each artifact has its own origin; `localStorage` does not cross. A rehearsal on staging therefore starts with an empty save and can never prove "a v8 save loads in v9 on the hosted origin"; only G5 locally and the user's first open do. The plan's hosted honesty list does not say this.
- Updating the user's artifact in place is allowed only after reading it in the same conversation; the plan never schedules that read or the edit-access check.
- Limits: <= 255 files and 64 MB per publish, <= 511 files and 256 MB per version, files left out are kept. Ancient is 382 files (10.98 MB); a first staging upload is two calls. A removed or renamed file stays served and counts toward 511 unless passed as `null`, and "hidden eras leave no placeholder" is only about the UI: their assets remain reachable. The `<= 500 files` guard (AU6) must count the server-side set (previous version plus delta), not the build output.
- ER24 reads back "by hash and size" against `files.json`, which has neither (Q2). A 500-file read-back is 2+ `paths` calls (256 each) of about 11-25 MB.
- No rollback path is written (disposition dropped it). The tool states no version restore.

**Failure scenario.** Staging looks perfect, the update to the user's URL has a different origin of state, the v8 save fails to load for the one user who has one, and v9 cannot be withdrawn because the old bytes were never kept.

**Required plan change.** In the rehearsal on staging publish v9, then re-publish the v8 fragment and files to the same staging URL, and record the exact calls: that is the rollback procedure. Keep `release/v8/` (page + files.json) on disk. Add to the hosted checklist for the user: "open the link on the device that has the v8 save and check progress". Extend `files.json` with sha256/bytes; the guard counts previous-version files. Document the update-in-place preconditions in the P6 task.

### Q18. MAJOR. Sim fix windows after QA conflict with "stats frozen", and the re-record cost after each window is not in the P5 estimate.

**Question.** What is the protocol when a QA fix in `src/sim` moves a unit outside [30%, 62%]?

**Evidence.** P3 freezes stats after <= 3 tuning iterations; section 4 batches QA sim fixes in a "sim fix window followed by one re-record"; release_check demands every stored balance/feasibility `sim` fingerprint equals current. Each window re-records 3 eras: balance (about 19-33 min per era idle-to-loaded), 450-battle records (2.5 min per era on 4 CPUs), ER7 counters/ablation, campaign_play, then QA must retest the touched behaviour. About 2.5 h of exclusive box time plus agent verification per window, up to four windows (S-FREEZE, after QA 1, after QA 2, release). P5 is 45-65 sessions / 2-3 d for two QA rounds plus fixes plus those cycles. The Ancient precedent: QA round 1 found 29 findings (1 blocking, 6 major, 22 minor), and 10.5 of the 15.5 project hours came after the QA-1 fix commit (q1_scope Q1). Three eras and a larger surface scale that, not 2-3 days.

**Failure scenario.** A QA sim fix shifts a Sci-Fi unit to 63%; stats are frozen, so either the band is edited by the fixer (forbidden) or the release waits an undefined time.

**Required plan change.** Define the unfreeze protocol: a sim fix that moves any era record outside bands triggers a BALANCE WP for that era with a cap of 1 iteration, logged; the fix window is scheduled with the box reserved. Re-estimate P5 from the Ancient QA ratios (findings per screen/mission x new surface) and size the fix windows in `wbs.csv`.

### Q19. MAJOR. `perf_assert`'s A/B protocol has no noise analysis, and the per-mechanic budgets do not add up.

**Question.** What is the measured noise of an in-process interleaved thread-CPU A/B at 300 units on this box, and what do per-module budgets sum to?

**Evidence.** Section 0.4 "Ancient within +5% of an in-process baseline" at 300 units; Ancient measures 0.84-1.09 ms/tick at about 300 units (verification_report S3, map 08), so 5% is 0.04-0.05 ms. Load averages seen: 10-15 (balance.mjs header) and 40-60 during QA1. The measurement uses two module graphs (baseline worktree and current) in one Node process, with JIT, GC and hidden-class interactions across them (ENGINE-Q32 warm-up is unaddressed). The first deployment also needs the baseline worktree from Q2. Section 4: "Budget = Ancient baseline + <= 0.5 ms at 300 units" per module line and per era scenario; with 13+ modules each given "its own budget line" the plan does not say whether 0.5 ms is the era total (then it must be allocated across modules, e.g. layers 0.15, craters 0.1) or per module (then total 6.5 ms against the 2 ms hard ceiling).

**Failure scenario.** The gate flakes at +5% on an idle noise of +8%, so the threshold is loosened by an agent, or it never fires and a 0.3 ms regression ships.

**Required plan change.** P0 step: an A/A run (baseline vs baseline) at 150/300/500 units, 15 interleaved repetitions, to fix the noise floor; threshold = max(5%, 3 x measured sigma) written in the criteria registry; the era total is 0.5 ms at 300 units and is allocated across modules in `spec/M-mechanics.md` with the sum checked by script. State load conditions (gate only when 1-min load < 2 or use `taskset` on one core).

### Q20. MAJOR. Two verification procedures conflict with fixed counts: the 30%-deletion in ER11 and the exact per-era manifests; and beats/set-pieces are tested only where cheap.

**Question.** How can counts be exact if the bottom 30% of scored lines is deleted?

**Evidence.** ER11: "blind comedy scores CSV with the bottom 30% deleted (list committed)". A7/section 9 DoD: "per-era manifests state EXACT counts", era DoD = "exact counts", announcer 220 era lines + 27 campaign, tips 40, 11 strings per unit (>= 15 for heroes/bosses; 102 units), achievements 15. Deleting 30% of what was written requires writing 1/0.7 = 1.43x. For units text that is about 1,570 strings written to keep about 1,120; announcer 350 to keep 247; tips 57 to keep 40. COMEDY sessions are sized to the targets, not the 1.43x. The deleted lines also change ER11 near-duplicate statistics and the callback ledger ids (>= 30 callbacks reference line ids). The scorer is an agent grading an agent (C15 in the disposition says "human read" is an agent read).

**Failure scenario.** Deletion leaves the manifest 30% short; the writers pad with filler to reach exact counts, and the metric is gamed.

**Required plan change.** Either write 1.43x and delete (state it in the COMEDY WPs and in `wbs.csv`) or replace deletion by rewrite-until-pass with a cap. Fix the order: score, then delete, then count against the manifest, then callbacks. Keep the scorer's prompt different from the writer's (already planned) and report the score distribution in QA.

---

## MINOR

### Q21. MINOR. The ledger cannot feed the calibration gate, and the token/rate envelope is still absent.

**Evidence.** Section 12: ledger entry = "status, owner, last gate, outputs". Calibration needs per-WP start/finish time, number of gate runs, retries, patch requests filed and integrated, and tokens; none are fields. The token/rate envelope (SCOPE-Q1) was silently dropped (disposition "silently dropped").
**Required plan change.** Add `started, finished, gate_runs, retries, requests_out, requests_in, tokens_in/out` to the ledger and a `ledger_stats` script that STATUS.md quotes; state the expected token burn per phase and what happens when a rate limit stops the fleet.

### Q22. MINOR. Several numbers and labels differ between sections or documents.

**Evidence.** (a) Section 1 gives 6 tracks plus a map/chooser bed (21 over three eras), totals say 18. (b) Section 4 rules say `S28..S44`, the table ends at S45 (C2). (c) STATUS.md still lists "P2 Medieval, P3 Modern, P4 Sci-Fi, P5 integration, P6 balance, P7/P8 QA, P9 release" while plan v2 has P0..P6 with different meanings; plan line 3 says 190 questions/27 blockers where the files hold 174/28 (C1). (d) Time Warp is a "stretch" (D19), inside the P4 estimate (15-20 sessions) and rung 1 of the ladder; if it is in the estimate it is not a stretch. (e) D16 "x/108" vs A3 "mutator thresholds stay 3..27": a returning player unlocks every mutator after a quarter of the stars; intended? (f) section 3 refers to "spec A1" (Ancient-policy table) and A1 Registry; V1 for the visual bible and for verification owners (C10).
**Required plan change.** One pass that fixes the labels, and a script (`plan_lint`) that checks numeric cross-references (counts in section 1 vs totals vs manifests; S ids vs modules; phase labels in STATUS.md vs section 12).

---

## Appendix A. Re-derivation of sessions and wall-clock

Evidence used: first project 15.5 h wall (02:28 to 17:56 on 10-06, 45 commits, two idle gaps of 2.7 h and 1.9 h; about 18 named roles plus QA, q1_scope Q1; machine load 10-15, 40-60 in QA); this session 75 min for e.md, 8 maps, plan v1, 5 critics, audit and v2, with 4-agent waves of 30-50 min; gate times from map 08 (fast gate 5.3 min, full 24 min, both at load 1.2-6).

Top-down. If the new program is 3-4x the agent-hours of the Ancient one (3x content, 18 mechanics, registry refactor over 121 files, 24 ER tools) and Ancient was about 90-110 agent-hours (est.; no log exists), that is 270-440 agent-hours = 225-370 sessions of 1.2 h. The plan's 343-427 is at the top of that bracket.

Bottom-up under the plan's own WP rule (<= 90 min, <= 10 files; units 4/WP only for humanoids, 1/WP for vehicles, mechs, bosses, siege, aliens), my count by phase: P0 about 100, P1 about 108 (REGISTRY 14, SIM 15, RENDER 11, WORLD/AUDIO skeleton 9, tracers 26, slice 6, remaining tools 25, calibration 2), P2 about 300 (SIM 33, rigs/clips 26, units 50, props 24, arenas 16, remaining RENDER/WORLD/EDITORS 21, remaining C-items 45, campaign authoring 35, audio 28, comedy 29), P3-P6 130-190. Total **550-700** (+-25%). The plan sits between the two brackets, so it is neither derived nor reconciled (Q1).

Wall-clock = N x s / (c x u), s = 1.3 h elapsed per session (60-90 min plus gate 5-8 min plus queue), c = 3-5 effective concurrent agents (cap 2 per workflow, 2-3 workflows, 4 CPUs), u = 0.5-0.7 utilisation (serial chains):

| N | c x u = 1.5 | c x u = 2.5 | c x u = 3.5 |
|---|---|---|---|
| 430 | 373 h = 15.5 d | 224 h = 9.3 d | 160 h = 6.7 d |
| 600 | 520 h = 21.7 d | 312 h = 13 d | 223 h = 9.3 d |

Dependency-chain floor (24 h/day continuous, est.): P0 tools chain to first engine edit 2 d; P1 REGISTRY + SIM-P1 + slice 2.5 d; P2 SIM chain 33 x 1.7 h = 56 h plus ANIM/COMEDY coupling to freeze 3.5 d; P3 per era 2.5 d with a 1 d offset = 4.5 d; P4 1 d; P5 two QA rounds with two fix windows and re-records 3.5-4 d; P6 0.5 d. Sum about **17-19 days**.

Verdict on 19-26 days: credible as calendar days of continuous operation, because the dependency chain alone is about 17-19 days and the volume (550-700 sessions at c x u of 2.5-3.5) fits inside it. It is not credible as working days (8 h): that would be 50-65. The risks lean upward: P2 content volume against the concurrency cap, QA fix cycles (Ancient: 29 findings in round 1), and any failure of Q2/Q6/Q7. The plan is right for the wrong reason, and it must say so with the derivation.

## Appendix B. Critical-path and TOOLS size notes (est.)

TOOLS WPs: provenance/tag/parity 2; G1 4, G2 1, G3 1, G4 2, G5 3, G6 3, G7 3, G8 3, G9 2, G10 2; gate engineering: lane scheduler 3, `--era` + `tests/_eras.mjs` + about 20 test edits 6, `--steps`/`--dist`/`build --out` 2, in-process syntax with negative control 1, closure cache 3, gate log 1, build report + minified size + file count 2; era-ising existing tools: smoke with combat 2, tour/flow/modes 5, look/perf/perf_sim/simperf 2, balance.mjs era parameter + `bands.mjs` + Wilson/counters/ablation/first-contact 8, feasibility per era 3, contracts + U1 + silhouette hash 4, lint rules 1, text sweep 3; new tools: campaign_play 7, release_check 5, uiscan 6, negcontrols 4, audit_sfx 3, readability 4, perf_assert 5, criteria + report generator 3, far-mesh metric 3, parity/soak 2, ablation 2. Total about 116.

Serial lanes and per-WP elapsed (1.7 h incl. gate and replay): SIM P1 15 WPs 26 h, P2 33 WPs 56 h; REGISTRY 14 WPs 24 h; ANIM about 50 WPs 85 h; RENDER about 22 WPs 37 h.

---

## What v2 got right

- Goldens recorded from a tagged baseline before any engine edit, with frozen legacy `stateHash` copy and two-signature re-records (G1..G10), and the idea of `stateHashFull` for new state.
- TOOLS independent of content agents, thresholds not editable by content, criteria registered in code with zero-assertion = UNVERIFIED, DoD tiers per unit/mission/era/release.
- The calibration gate exists, with a measured re-estimate and a rule that only COORD cuts, logged, whole mechanic with dependants (needs teeth, Q3).
- Single editor per hot file and patch-request flow is the right instinct (needs data-in-pack, Q15); private `--dist`, generated registry untracked.
- Hidden-era status so unfinished eras cannot leak; release_check running against the exact built file with sha printed.
- Honest "hosted honesty" list of what cannot be verified on this box.

## Verdict

**converged = no.** The remaining defects are structural to the program (estimate, tooling ownership, gate coherence), not spec-level details, so they cannot be handed to spec deliverables as they stand.

What must change for yes (exact list):
1. Q1: generate `wbs.csv` with owner/predecessors/size per WP, define session, day and concurrency, compute phase sums and the critical path by script; recompute the estimate (expect 550-700 sessions under the stated WP rule) and quote the output in section 12.
2. Q2: replace step 0 by an executable provenance procedure (inflated-payload compare, `VW_BUILD_DATE`, candidate commits, timebox, Chromium parity fallback, COORD owns tag/worktree, `files.json` with hashes).
3. Q3: calibration gate as a decision table with ladder capacity in sessions, a stop-and-ask above +30%, and a second calibration after M7+M12+M14 on full-contract units.
4. Q4: split TOOLS into three owned teams and add a tool table (owner, phase, size, ER, negative control) to section 12; re-size P0/P1.
5. Q5: add script/owner/phase/runtime-tier column for all 24 ER; extend ER19 to all missions.
6. Q6: two fingerprints (`engineHash`, `eraHash`), amber-until-scheduled stale policy, named re-record points, one-time re-take of Ancient records.
7. Q7: gates on snapshots, `wip/` branch, `green-N` tags, freeze protocol for P5/P6.
8. Q8: rename the P1 slice, add per-era mechanic slices with a written rubric gating content volume, define tracer = U1 minus the six P1-impossible clauses.
9. Q9: split M6 and M17, define the P3 start condition per era.
10. Q10: critical-path section with the five named lanes; drop "box-bound".
11. Q11: label S14 deliverables `final` or `draft until <gate>`, re-size P0.
12. Q12: runtime tiers for every ER, sampling rules for ER17 and ER9, minute budgets.
13. Q13: define "real UI" as clicks plus stepped time, and equivalence by `stateHashFull` with identical placements and seed.
14. Q14: negative control per check in the criteria registry.
15. Q15: data-in-pack principle, hot-file owner table, replace INTEGRATION x3.
16. Q16: Ancient baselines for uiscan/readability, extend the Ancient-policy table beyond SIM.
17. Q17: staging/rollback/origin facts and procedure, count server-side files.
18. Q18: unfreeze protocol and P5 re-estimate from Ancient QA ratios.
19. Q19: A/A noise run, threshold from sigma, allocated per-module budgets that sum to the era total.
20. Q20: resolve the 1.43x writing volume against exact counts.
Q21 and Q22 are cleanup that the same edit pass can absorb.

I would flip to converged=true once items 1-8 are in v3 as text with owners, and items 9-20 are assigned to spec deliverables with named owner and acceptance script (they are then spec-level).
