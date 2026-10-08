# q1_disposition.md: disposition of every round-1 question against plan v2

Auditor: DISPOSITION AUDIT, 2026-10-08. Inputs read in full: `plan.md` (v2), `e.md`, `q1_scope.md`, `q1_engine.md`, `q1_product.md`, `q1_verify.md`, `q1_content.md`. Spot checks against the repo: `battleview.js` lodK2, `game.js` TYPE_CAP, `docs/verification.md` ids, `docs/spec/` file names, grep of plan v2 for absent terms (mockctx, warmup, prewarm, rubric, token, rollback). No repo file other than this one was touched.

Legend: ACCEPTED = v2 contains the change (section cited as S<n>; "DEF" = the detail table is deferred to the named section-14 spec deliverable). MODIFIED = v2 answers differently or only in part; the reason says what is missing. REJECTED = v2 explicitly says no. UNADDRESSED = v2 does not answer. Plan sections: S0 non-negotiables, S1 scope, S2 architecture (A1..A7), S3 phase-0 nets (G1..G10), S4 mechanics (M0..M17), S5 models/rigs, S6 render (R1..R17), S7 world (W1..W9), S8 campaign/UI (C1..C21), S9 verification (ER1..ER24), S10 audio (AU0..AU8), S11 humour, S12 WBS/schedule, S13 cut ladder, S14 spec deliverables, S15 decisions.

## Totals

| file | questions | blockers | ACCEPTED | MODIFIED | REJECTED | UNADDRESSED |
|---|---|---|---|---|---|---|
| SCOPE | 30 | 7 | 18 | 12 | 0 | 0 |
| ENGINE | 38 | 5 | 36 | 1 | 0 | 1 |
| PRODUCT | 33 | 5 | 23 | 9 | 0 | 1 |
| VERIFY | 37 | 8 | 33 | 4 | 0 | 0 |
| CONTENT | 36 | 3 | 33 | 3 | 0 | 0 |
| **all** | **174** | **28** | **143** | **29** | **0** | **2** |

Plan v2 line 3 claims "about 190 questions, 27 blockers; every one is answered in q1_disposition.md". The five files contain 174 numbered questions and 28 blockers (see contradiction C1). v2 contains no explicit REJECTED answer: where it declines a sub-request it does so silently (listed under "Silently dropped sub-requests").

## SCOPE

| id | severity | question | disposition | plan v2 section or reason |
|---|---|---|---|---|
| SCOPE-Q1 | BLOCKER | No capacity model: durations, agent counts, token envelope, burn-rate trigger for the cut ladder | MODIFIED | S12 gives sessions and wall-clock per phase (340-430 sessions, 19-26 d, sums check), a calibration gate at end of P1 and cut triggers (+30% projection or 50% slip). Missing: token envelope, owner per phase row. |
| SCOPE-Q2 | BLOCKER | Serial 16-module SIM chain is the critical path; M7 (air) scheduled after the Medieval dragon | MODIFIED | S4 "needed by" column and M0 schema-first; S12 P2 chain ordered by earliest consumer with M7 first. The two-lane SIM split was NOT adopted (S4: one agent at a time) and v2 never says why; chain duration is not estimated separately. |
| SCOPE-Q3 | BLOCKER | Tracer-bullet rule cannot run in P1; 5 of 12 rigs have no tracer; no wrapper, audio, perf or campaign tracer | MODIFIED | S5 one tracer per rig; S12 P1 vertical slice (mission 1 of each era through the real UI); S10 AU2 dress rehearsal; S0.4 perf at worst army. Not resolved: tank, heli, drone, dragon, shield, cloak mechanics land in P2 (see contradiction C3). |
| SCOPE-Q4 | BLOCKER | No merge or isolation model in a shared tree where agents may not run git | MODIFIED | S12 Isolation: single editor per hot file, patch requests in docs/requests, private --dist, untracked generated registry, hourly WIP commits by COORD, green commits. Per-workstream worktrees/branches rejected silently; no hot-file owner table; INTEGRATION x3 contradicts single-editor rule (C4). |
| SCOPE-Q5 | BLOCKER | G1 vs extended stateHash and Ancient-visible bug fixes | ACCEPTED | S0.3 legacy stateHash frozen + stateHashFull; S3 G1 frozen copy inside test, result tuple, two signatures in golden_log; S4 Ancient-policy table (spec A1). |
| SCOPE-Q6 | BLOCKER | No S-FREEZE; simHash blind to new eras; stale records skipped | ACCEPTED | S4 S-FREEZE definition + sim fix window; S3 G6 simHash recursive over sim/world/core/registry/every era, stale = red. Per-mission fingerprints not adopted (optimisation only). |
| SCOPE-Q7 | BLOCKER | Only ~40% of work items are placed in a phase; foundation (factories, validator, UI era layer) not before content | MODIFIED | S12 P1 contains REGISTRY wrapper (registry, factories, chooser skeleton, currency, uiBattle, router, save) before content; WP model with owner/predecessors/acceptance. Not done: per-item WBS table; R2-R5, R8-R11, R13, R16, W5-W9, C2-C5, C10-C15, C17-C21 and AU4-AU8 still not named in any phase row; mission/puzzle/survival/daily authoring absent from the P2 row (C9). |
| SCOPE-Q8 | MAJOR | Heavy-job queue (balance, fuzz, modes, gate) not added up | ACCEPTED | S12 heavy-job budget "tabulated in the spec", reserved balance windows, agent gates under nice. DEF spec/V-verification.md. |
| SCOPE-Q9 | MAJOR | COORD is SPOF and throughput bottleneck | ACCEPTED | S12 roles: INTEGRATION per era for game.js/meta.js/content.js glue, REVIEWER that does not build, COORD limited to decisions/merges/STATUS/commits/publishing. |
| SCOPE-Q10 | MAJOR | Context loss mitigated only at phase granularity; non-git state (assets/raw, .cache) unrecoverable | MODIFIED | S0.10, S12: ledger/<WP>.md per package, hourly WIP commits pushed, STATUS.md, resumable workflows write outputs to files. Not adopted: backup/provenance list for non-re-fetchable assets/raw. |
| SCOPE-Q11 | MAJOR | Targets shrink product below Ancient parity and below e.md D4 while claiming no MVP | MODIFIED | S1 raised: units 34 (=D4 low end), arenas 12, props 38, parts ~120, tips 40, announcer 220+27, sfx 290, achievements 15. Still below Ancient (parts 47%, tips 63%, announcer ~51%, sfx avg 97/era = 26%) under a "parity first" header; no plain statement to the user and no cuts.md entry for the baseline shortfall; human read of 306 reusable lines moved to P0 (S11). |
| SCOPE-Q12 | MAJOR | Cut ladder has no trigger, owner or value ordering; first rungs delete user-named things | ACCEPTED | S13 ordered by user value per cost, COORD only on a measured trigger (S12), a cut removes a whole mechanic with dependants, NEVER-cut list. No rung for a slipping rig (units drop with it) is stated. |
| SCOPE-Q13 | MAJOR | Hidden work in tests, tools and mocks (65 test files, 13 tools, mockctx, hard-coded paths, applyTune) under-counted | MODIFIED | S2 A7 (--era, tests/_eras.mjs eachEra, exact manifest counts), S3 gate engineering; map 08 now exists. Not in v2: mockctx era mode, central paths config (/home/user, Chromium paths), balance applyTune generalisation, per-file migration table. |
| SCOPE-Q14 | MAJOR | Sequential gate grows 4x; no per-event gate rules | ACCEPTED | S3 gate engineering: lane scheduler, --era, --steps, --dist, closure cache; targets T-fast <= 4, T-era <= 8, T-full <= 15 min on 4 idle CPUs (contents of T-full unreconciled, C12). |
| SCOPE-Q15 | MAJOR | Missions authored before units are balanced; no campaign tuning loop | ACCEPTED | S12 P3 per-era: balance run, then campaign tuning <= 3 iterations, stats frozen after. |
| SCOPE-Q16 | MAJOR | Page-size projection optimistic; music lever undecided | MODIFIED | S0.4 hard 5,000,000 B minified, S2 A6 and ER14 per-family byte report, S10 AU6 + D17 un-core decision at P1 size checkpoint (4.6 MB trigger), D13 cap fixed. D17 decided in P1 not P0; no per-family byte budgets and no +300 KB auto-stop. |
| SCOPE-Q17 | MAJOR | Sim budget +0.5 ms does not add up against line items | MODIFIED | S4 per-mechanic budget line in perf_log.md with worst co-occurring scenario per era, A/B protocol, perf_assert; M16 dissolved into per-module. Line-item derivation of the +0.5 ms envelope absent (map 02: 0.37 + 0.55 + 0.19 ms). DEF spec/M-mechanics.md. |
| SCOPE-Q18 | MAJOR | Render CPU and memory hazards (per-part trig, skin eviction) missing | ACCEPTED | S6 R14 per-part cost, R15 memory; ER13 view.update CPU and heap soak. |
| SCOPE-Q19 | MAJOR | Release is all-or-nothing at P9; no per-era private staging | ACCEPTED | S12 Releases: private staging artifact per era, unfinished eras hidden (A4), D18; S10 AU2 real-file rehearsal. Documented rollback to previous version not stated. |
| SCOPE-Q20 | MAJOR | Blocking decisions D8, D9, D11, D12 parked with no deadline | ACCEPTED | S15 closes D8 (P0 spike), D9 (M7), D10, D11 (per mission in design bibles), D12 (lite crew), D15, D16; S5 P0 spikes. |
| SCOPE-Q21 | MAJOR | Audio hunt scheduled on day 1, independent of roster; unreachable sources; pack format unproven | ACCEPTED | S10 AU1 hunt driven by frozen taxonomy after M2 with source matrix and fallbacks, AU2 format fixed by P0 rehearsal. DEF spec/AU-audio.md. |
| SCOPE-Q22 | MAJOR | No work-package size rule for 16-module / 12-rig tasks | ACCEPTED | S12 WP <= 90 min, <= ~10 files, acceptance script, ledger entry; units are WPs of 4. |
| SCOPE-Q23 | MAJOR | QA deferred to P7/P8; defect latency days | ACCEPTED | S12 P3 QA-lite per era (fresh agent, one day, scripted); S9 Era DoD. Image-token budget not stated. |
| SCOPE-Q24 | MAJOR | Ancient UI and pixels guarded by no golden | ACCEPTED | S3 G4 (UI strings), G8 render PNGs, G9 audio routing, G10 DOM text and control inventory. |
| SCOPE-Q25 | MAJOR | Set-pieces, camera/music treatment and cross-era gag have no work item | ACCEPTED | S8 C3 setpiece event, S6 R17 CameraRig.shot, S14 design/<era>.md set-piece package, ER20, S11 arc and callback ledger. |
| SCOPE-Q26 | MINOR | Look-dev has no stopping rule | ACCEPTED | S5 iteration caps (infantry 2, vehicle 3, boss/hero 4) and acceptance checklist. |
| SCOPE-Q27 | MINOR | Spec, rigs.md tables, per-era reports and audio_coverage unscheduled | MODIFIED | S14 spec deliverables in P0 incl. errata table. Not adopted: per-phase doc WP, doc drift test, per-era balance/campaign report files, audio_coverage regeneration. |
| SCOPE-Q28 | MINOR | G5 save fixtures: only v1 blobs exist | ACCEPTED | S3 step 0 + G5: real v2 save and export code generated by driving the tagged build in Chromium; v1 blobs; both directions. |
| SCOPE-Q29 | MINOR | Naming collisions (S1) and M15/M16 plumbing | ACCEPTED | S4 M15a/M15b split, M16 folded into per-module perf, Time Warp no longer "S1" (S13). New label collisions introduced (C10). |
| SCOPE-Q30 | MINOR | Boot and first-sight costs scale with eras | MODIFIED | S2 A6 lazy per-era build, S5 clips baked lazily per rig, ER13 boot and first-sight hitch. View prewarm on placement not stated. |

## ENGINE

| id | severity | question | disposition | plan v2 section or reason |
|---|---|---|---|---|
| ENGINE-Q1 | BLOCKER | Phase order: tracer needs M4/M5/M7/M8 outside P1; dragon needs M7 after Medieval | MODIFIED | S4 "needed by" column, M14 de-duplicated, S12 P2 chain M7 first; S5 tracer per rig. Reviewer ask (pull M7/M8/M4/M5 into P1 or drop mechanic-dependent tracers) not done and v2 does not say what a rig tracer proves without its mechanic (C3). |
| ENGINE-Q2 | BLOCKER | pickTarget scoring makes "counters" impossible (AA vs heli, AT vs tank) | ACCEPTED | S4 M2b targeting and role model: per-def target masks, role-weighted scores beat distance in range, 8.5 u ring off, branch only when new fields set, explicit table rows. |
| ENGINE-Q3 | BLOCKER | stateHash extension breaks G1; rng2 not in hash | ACCEPTED | S0.3, S3 G1: legacy stateHash byte-identical, stateHashFull for new state + rng2, rng2 = rng.fork("era") in constructor. |
| ENGINE-Q4 | BLOCKER | "Ancient does not change" vs five default-on behaviour fixes | ACCEPTED | S0.1 and S4 Ancient-policy table (spec A1), opt-in gating, two-signature re-record. The sentence "Two deliberate Ancient deltas are allowed ...: none unless the table says so" contradicts itself (C8). DEF spec/A-architecture.md (table does not exist yet). |
| ENGINE-Q5 | BLOCKER | Merged defs leak other eras into Ancient quick/survival/counters | ACCEPTED | S2 A1 era argument on generateArmy/WaveSystem/counterTable/scoutReport, default ancient, unknown faction throws; S3 G7. |
| ENGINE-Q6 | MAJOR | Ten silently-defaulting role tables unlisted | ACCEPTED | S4 M2b names the ten tables with a test that fails on default and squad speed coupling. |
| ENGINE-Q7 | MAJOR | Per-move-class flow fields blow the envelope | ACCEPTED | S4 M7 lazy per-(team,class) fields, shared arrays when equal, coarse 2 u nav; per-mechanic budget. 12-tick freshness number not restated. |
| ENGINE-Q8 | MAJOR | Air/hover layer touches 21 hash.query sites and hazards | ACCEPTED | S4 M7 layer audit of all 21 sites, hazards, _integrate altitude. DEF spec/M-mechanics.md (the table itself). |
| ENGINE-Q9 | MAJOR | Air-unit behaviour unspecified (dragon, unarmed dropship, melee from air, remnant) | ACCEPTED | S4 M7 air AI state machine, melee-from-air rule, unarmed units, AA guarantee in armygen and campaign validation, hard termination rule. |
| ENGINE-Q10 | MAJOR | Shield rule disables stalemate watchdog | ACCEPTED | S4 M4 progress-based watchdog lastProgressT; lastDamageT kept for old consumers. |
| ENGINE-Q11 | MAJOR | Pacing constants global and Ancient-tuned | ACCEPTED | S2 A5 pacing record in era kit (stalemate*, dry ladder, time limits), M15; ER7 dead-air metric per era. |
| ENGINE-Q12 | MAJOR | Armour 0.9 + floor does not bounce rifles | ACCEPTED | S4 M1 penetration model (pen vs armorFace, ricochet event, chip floor 0.1); Ancient types keep floor and cap bit-identical. |
| ENGINE-Q13 | MAJOR | Stuck-projectile policy exhausts pool/renderer | ACCEPTED | S4 M2 stick per kind (bullets/energy 0 s, arrows 2.5 s), pool policy with 3000-shot test. Render cap 1500 change not stated. |
| ENGINE-Q14 | MAJOR | Flat-trajectory weapons never lead; hitscan semantics | ACCEPTED | S4 M2 lead default true for finite speed, hitscan flags proj and no backstab. |
| ENGINE-Q15 | MAJOR | Independent turret cosmetic: AI re-faces hull | ACCEPTED | S4 M8 hull faces movement, turret slews (rate/arc), firing gate uses aim, present-front, reverse rule. |
| ENGINE-Q16 | MAJOR | Take Command breaks on vehicles, air, reload, cloak | ACCEPTED | S4 M8 possession rules per class; S8 C16. |
| ENGINE-Q17 | MAJOR | G1 six fixed battles miss changed paths | ACCEPTED | S3 G1 matrix >= 40 digests (arenas x difficulties x rule flags x mutators x input log with god power/order/possession). |
| ENGINE-Q18 | MAJOR | Sim timing depends on mutable ClipLib state | ACCEPTED | S5 hit-agreement tolerances for every attack clip (+-5% for rate-limiting), baked-vs-DEFAULT_META divergence test, reload_gun and new-id test. |
| ENGINE-Q19 | MAJOR | Sim budget gate allows 5 ms | ACCEPTED | S0.4, S4: perf_assert with real relative thresholds, in-process A/B baseline replaces the 5 ms smoke. |
| ENGINE-Q20 | MAJOR | Draw-call budget verified at unrepresentative type count | ACCEPTED | S0.4 and ER13: <= 160 draws at 16+16 types; S6 R12 buy-back first. No means beyond R12 and no TYPE_CAP fallback (map 04 arithmetic ~177, C12). |
| ENGINE-Q21 | MAJOR | View CPU at 600 units with 30-48 part models ungated | ACCEPTED | S6 R14 per-part cost; ER13 view.update CPU at heaviest legal composition. |
| ENGINE-Q22 | MAJOR | Model memory unbounded | ACCEPTED | S6 R15 shared geometry, skin eviction on setWorld, preview cap, heap budget; ER13 40-battle soak. |
| ENGINE-Q23 | MAJOR | Prop-death and crater invalidation storms | ACCEPTED | S4 M10 lazy rect rebuild, M12 coalescing + dirty-rect + <= 1 refresh per 6 ticks; S6 R12 sub-chunk edits; city+artillery scenario. |
| ENGINE-Q24 | MAJOR | Vehicle radius breaks _separate, nav clearance missing | ACCEPTED | S4 M7 vehicle radius margins and clear map in canStep/_canMove/steer; S7 W9 corridor >= 6 cells + 6-tank column test. |
| ENGINE-Q25 | MAJOR | Crew bailout accounting (startCount, stars, objectives) | ACCEPTED | S4 M13 accounting: spawned units excluded from startCount/startCost, bailout event. |
| ENGINE-Q26 | MAJOR | Cover/LOS: blocked units stand still; smoke does not occlude | ACCEPTED | S4 M9 repositioning with timeout and fire-through fallback, smoke occluder, <= 4 us/shot. |
| ENGINE-Q27 | MAJOR | Cloak/shield render decisions incomplete | ACCEPTED | S6 R3 (near dome <= 64, far via aFx2 lane), R6 cloak compile variant, depth discard, own-team floor, attribute/varying logging with Potato fallback. |
| ENGINE-Q28 | MAJOR | Big-radius queries truncate silently at 512 | ACCEPTED | S4 M10 buffer sized from world capacity with dev assertion. |
| ENGINE-Q29 | MAJOR | Registry architecture: merge rules, ordering, import DAG | ACCEPTED | S2 A1 four merge kinds, explicit era order, stats.js Ancient-only, recipes register into gencore (no cycle); A2 ids. |
| ENGINE-Q30 | MAJOR | env.gravity "3 sites" does not change projectile arcs | ACCEPTED | S2 A5 gravity multiplier on every use incl. per-def projectile gravity; S7 W6 low-gravity aim test. |
| ENGINE-Q31 | MINOR | Tread scroll and rotor aliasing | ACCEPTED | S5 treads prototyped before rig frozen (scroll vs wheels vs short period), rotors blur. |
| ENGINE-Q32 | MINOR | Warm-up and hidden-class pollution across eras unmeasured | UNADDRESSED | v2 mentions warm only for audio (AU3). Missing: per-era sim warmup ROSTER and a perf test bounding deopt when warmed with another era. |
| ENGINE-Q33 | MINOR | Spec errata table missing | ACCEPTED | S14 spec/A-architecture.md errata (rigs.md part counts, aFx.w, brace 2.4, units.md drift). DEF. |
| ENGINE-Q34 | MINOR | Mechanics no module owns (wrecks, transports, high ground, smoke) | ACCEPTED | S4 "Mechanics not built" list; wrecks (M17) and smoke occlusion (M9) built; ladder position in S13. |
| ENGINE-Q35 | MINOR | Status tint table not extended | ACCEPTED | S6 R6 SE-to-tint table with test that every status has a row. |
| ENGINE-Q36 | MINOR | Muzzle point / friendly-fire geometry for large bodies | ACCEPTED | S4 M2 muzzle[], M10 friendly-fire spawn exclusion for large bodies. |
| ENGINE-Q37 | MINOR | World scale: ranges vs arena size per era | ACCEPTED | S14 spec/W-world.md scale/tempo table, S7 W9 first-contact 6-20 s policy, ER7 first-contact metric. |
| ENGINE-Q38 | MINOR | Hard-coded Ancient ids (goat, chicken, hoplite) in era-neutral engine | ACCEPTED | S2 A2 lint (no Ancient id literal in src/sim outside kit), A5 kit mascot/intervention; literal list in spec/A-architecture.md. |

## PRODUCT

| id | severity | question | disposition | plan v2 section or reason |
|---|---|---|---|---|
| PRODUCT-Q1 | BLOCKER | No campaign design: 27 missions, objectives, mechanic assignments, curve | MODIFIED | S14 design/<era>.md 9-row table (teach/test mechanic, star-3 test, set-piece, reward, par, attempts); S9 Era DoD mechanic-to-mission coverage; S8 C18. Not adopted: >= 5 of 7 objective types rule, difficulty-curve numbers, validator rejecting missions not in the signed table. DEF design/<era>.md. |
| PRODUCT-Q2 | BLOCKER | Set-piece moments have no work item | ACCEPTED | S14 five-channel set-piece package per mission, S6 R17 CameraRig.shot, S8 C3 setpiece event, ER20 filmstrip. M14 setpiece event lands late in P2 (C3). |
| PRODUCT-Q3 | BLOCKER | Era identity defined as lists, not feel | ACCEPTED | S14 feel sheet in design/<era>.md, S0.8, ER21 blind era-classification test. |
| PRODUCT-Q4 | BLOCKER | No vertical-slice playtest before volume | MODIFIED | S12 P1 vertical slice mission 1 of each era through real UI, "reviewed against the rubric". The rubric is not defined anywhere in v2; no act-level slices; not stated that P2 volume waits for a pass; slice needs C6/M14/HUD that land in P2 (C3). |
| PRODUCT-Q5 | BLOCKER | Onboarding exists only for Ancient mission 1 | ACCEPTED | S8 C6 teaching system (ordered beats, first-sight toasts, Help pages, first-run path, Codex Mechanics tab); ER19. |
| PRODUCT-Q6 | MAJOR | Tone: modern/sci-fi violence levers unchosen | ACCEPTED | S0.6, S6 R10 per-era fxClass tone defaults, S11 death-line rubric, bibles with banned lists; ER11. |
| PRODUCT-Q7 | MAJOR | e.md clauses not traceable to plan items | MODIFIED | S14 traceability.md (clause to item to phase to evidence). Table is a P0 deliverable, not appended to v2 and "clause without row blocks the plan" is not stated. DEF traceability.md. |
| PRODUCT-Q8 | MAJOR | HUD/Take Command/orders/selection card are Ancient-shaped | ACCEPTED | S8 C16 (Take Command per class, selection card with shield/ammo/status/cloak, new status icons, world-label tags, orders only if M9 supports), S4 M8. |
| PRODUCT-Q9 | MAJOR | God powers hard-coded Zeus; ladder reduces them to reskins | ACCEPTED | S8 C15 three sets of six with stable slot semantics, intern as caster; S13 has no god-power rung. |
| PRODUCT-Q10 | MAJOR | Time Warp is default behaviour yet planned as work to prevent | MODIFIED | S15 D19 stretch with design (separate card, neutral currency, cost normalisation, curated arenas) and clean cut; D14; S2 A1 scoping stops accidental mixing. Still rung 1 of the ladder (reviewer asked to move it off). |
| PRODUCT-Q11 | MAJOR | Neutral announcer categories are not neutral | ACCEPTED | S11 classify templates neutral/ancient/convertible by read in P0, pools as template-id lists enforced by test. |
| PRODUCT-Q12 | MAJOR | Time-travel gag is three premises, not an arc | ACCEPTED | S11 arc per era (arrival card, per-mission line, >= 30 callbacks with ids, finale payoff, any entry order). Intern portrait/voice undecided. |
| PRODUCT-Q13 | MAJOR | Pacing and scale: ranges, speeds, contact time per era | ACCEPTED | S14 spec/W-world.md scale/tempo table, S7 W9 first contact 6-20 s, ER7 dead-air metric. |
| PRODUCT-Q14 | MAJOR | Readability of 600 units has no acceptance test | ACCEPTED | S9 ER17 CIEDE2000 unit-vs-ring, team separation, tracer coverage, CVD, canonical 600-unit battle per era. |
| PRODUCT-Q15 | MAJOR | Flash limiter dead in battle; new effects multiply flashes | ACCEPTED | S6 R16 limiter and Reduce Motion wired to muzzle, orbital, EMP, rotors, shields, shots; luminance-variance test; ER18. |
| PRODUCT-Q16 | MAJOR | 300-rifle fight sounds like a sparse tick | ACCEPTED | S10 AU4 aggregate beds driven by shooters in frustum, AU3 per-screen era music, ER12 mixtest per era. Monotone-loudness and voice-steal thresholds not stated. |
| PRODUCT-Q17 | MAJOR | First-minute chrome still Ancient | ACCEPTED | S8 C20 chrome census test, splash/title/diorama rotation, C18 neutral names. |
| PRODUCT-Q18 | MAJOR | Era chooser underspecified | ACCEPTED | S8 C7 wireframes for states, static stills, 1.2 s portal, lastEra + switch control, [data-era] tokens, phone layout; S2 A4 router stores {id, params}. |
| PRODUCT-Q19 | MAJOR | Reward economy hollow | ACCEPTED | S8 C14 reward ledger of 27 real rewards, codex locked write, D15 per-era mutators. |
| PRODUCT-Q20 | MAJOR | Counters not surfaced to player | ACCEPTED | S8 C17 weakTo/counters in hover and Codex, bounce/clang feedback, scout codes per era. |
| PRODUCT-Q21 | MAJOR | Human difficulty, failure loop, difficulty settings | ACCEPTED | S8 C18 attempts policy, star-3 tests that use the mechanic, assist ladder, neutral difficulty names. |
| PRODUCT-Q22 | MAJOR | Mutators x new mechanics untested; Moon Gravity collision | ACCEPTED | S8 C19 matrix with disable-with-reason, rename Moon Gravity. |
| PRODUCT-Q23 | MAJOR | Workshop with rifles/lasers: classes, abilities, pricing, balance | MODIFIED | S8 C11 new weapon classes, cost refit validated by random/hill-climb search, customs bounded by U8, C5 customs in their classes, ER22. Not specified: abilities per class, body/armour tiers; no section-14 file holds a Workshop spec. |
| PRODUCT-Q24 | MAJOR | Arena Builder moon/era experience | ACCEPTED | S7 W6 preview uses THEME_LOOK, theme preset sets sky/gravity/weather/music, aim test at low gravity, unknown-prop import message. |
| PRODUCT-Q25 | MAJOR | Survival/Daily/Puzzles/Quick across eras underspecified | ACCEPTED | S8 C11 modes table, C12 separate daily stream, D14, D16 title x/108 plus per-era chips. |
| PRODUCT-Q26 | MAJOR | Returning Ancient player and share-code edge cases | ACCEPTED | S8 C13 what's-new card, explicit era-mismatch import errors; S2 A3; ER16 both directions. |
| PRODUCT-Q27 | MAJOR | Phone and touch unplanned | ACCEPTED | S8 C16 touch scheme 390x844 and per-era touch quality defaults; ER15 at 390x844 touch; S9 real touch devices listed unverified. No named platform matrix. |
| PRODUCT-Q28 | MINOR | Three hand-made campaign maps underspecified | MODIFIED | S8 C7 per-era ERA_MAPS art direction, ER21. Decor animations, pin/route style and reduced-motion behaviour not listed. DEF spec/C-campaign-ui.md. |
| PRODUCT-Q29 | MINOR | Ancient humour formula will be cloned | ACCEPTED | S11 three engines per era, ER11 similarity caps, one mechanic-naming line per unit. |
| PRODUCT-Q30 | MINOR | Achievements, Stats, Credits at four eras | MODIFIED | S8 C10 filter, fixed overachiever/ancient_history/tourist semantics, hidden achievement per era; S10 AU7 credits by era. Stats screen not addressed. |
| PRODUCT-Q31 | MINOR | Codex doubles; mechanics have no pages | MODIFIED | S8 C6 Mechanics tab, C11 era filter, C17 counters row. Global search not adopted. |
| PRODUCT-Q32 | MINOR | Loading and first-sight hitches are a first-impression issue | MODIFIED | S1 loading lines, S2 A6 lazy build, ER13 first-sight hitch metric. Pre-building mission-roster models during briefing not adopted. |
| PRODUCT-Q33 | MINOR | No triage of likely next asks | UNADDRESSED | Nothing in v2; photo frames/extra mutators appear only on ladder rung 2. |

## VERIFY

| id | severity | question | disposition | plan v2 section or reason |
|---|---|---|---|---|
| VERIFY-Q1 | BLOCKER | G1 stateHash blind and changing | ACCEPTED | S0.3, S3 G1: frozen legacy copy; stateHashFull covers props, craters, projectiles, statuses, rng2, event stream; golden_log. NaN-aware hashing / throw on non-finite not stated. |
| VERIFY-Q2 | BLOCKER | Ancient-frozen vs planned Ancient-path fixes; no change control | ACCEPTED | S0.1, S3 G1 (two signatures, author cannot sign), S4 Ancient-policy table, G6 replay of 9 missions + 6 puzzles. Policy table itself is deferred (spec/A-architecture.md). |
| VERIFY-Q3 | BLOCKER | No verified Ancient reference build | ACCEPTED | S3 step 0: read back hosted v8, hash, rebuild same flags, tag ancient-v8 only on byte match, baseline worktree; G5 from tagged build; G7; A1 unknown faction throws. Tag/worktree need git (C5). |
| VERIFY-Q4 | BLOCKER | No render/audio/UI goldens | ACCEPTED | S3 G8 (SwiftShader PNGs of 16 arenas, 43-unit lineup, title, map), G9 (audio routing), G10 (DOM + controls). |
| VERIFY-Q5 | BLOCKER | modes.mjs does not play missions to the end | ACCEPTED | S9 ER8 campaign_play through real UI to ended, stars, unlock, NEXT, Back keeps era; tool listed in S3. |
| VERIFY-Q6 | BLOCKER | Counter claims at n=20 are noise | ACCEPTED | S9 ER7 >= 200 battles per pair, Wilson lower bound >= 55% and point >= 65%, direction written before measuring, mechanic-off control. |
| VERIFY-Q7 | BLOCKER | Release provenance unchecked | ACCEPTED | S9 release_check: commit/treeHash/simHash embedded and shown in Diagnostics, minified build tested, QA quotes sha, post-publish read-back by hash. |
| VERIFY-Q8 | BLOCKER | Verification infrastructure has no owner | ACCEPTED | S12 TOOLS role; S2 A7 content agents cannot edit thresholds/bands/goldens, exact per-era counts. DEF owners table G1..G10/V1..V10 in spec/V-verification.md. |
| VERIFY-Q9 | MAJOR | Ancient campaign regression deferred; simHash non-recursive | ACCEPTED | S3 G6 recursive simHash, replay after every SIM module (<= 30 s), 450-battle record at S-FREEZE and release. |
| VERIFY-Q10 | MAJOR | Contracts check presence, not content; not strict | ACCEPTED | S0.5 + S9 ER3 unit contract matrix, recolour detection by silhouette hash; negcontrols. "--strict on by default in gate" not stated. |
| VERIFY-Q11 | MAJOR | Text/safety scans are lists Medieval collides with and Modern slips past | ACCEPTED | S9 ER11 sweep of every registered string, REAL_WORLD list, near-duplicate Jaccard, signed allowlist, blind comedy CSV with bottom 30% deleted. |
| VERIFY-Q12 | MAJOR | Copy-in-context bugs (lessons, verbs, nouns) | ACCEPTED | S9 ER11 copy-in-context property test over 150 battles. verb rows per damageType x projectile kind and a vipNoun field not named. |
| VERIFY-Q13 | MAJOR | Campaign bots verify designer's own answer | ACCEPTED | S9 ER8: autofill bot <= 40%/60%, mechanic-blind variant loses >= 70%, monotone skill ladder, no harness-only workaround. |
| VERIFY-Q14 | MAJOR | Balance harness cannot exercise new mechanics | MODIFIED | S9 ER6 ablation (feature off shifts win rates) + mechanic-coverage metric. Not listed: harness scenario fields props/script, TUNE_ROLES registration, per-mechanic indicators. |
| VERIFY-Q15 | MAJOR | Dropped criteria S5-S9, U8, share fuzz per era | ACCEPTED | S9 ER7 includes S5-S9, U8 soldier fuzz, share fuzz per era. |
| VERIFY-Q16 | MAJOR | Balance has no floor | MODIFIED | S0.5 + ER7 U5c field win rate [30%, 62%]. Applied to every unit with no exemption for bosses/support (C7); pick-rate proxy >= 1% not adopted. |
| VERIFY-Q17 | MAJOR | Sim budget protocol and 2.5x slack | ACCEPTED | S4 A/B protocol (one process, interleaved, thread-CPU, median of N, tagged baseline worktree); ER13. Quiet-box load check not stated. |
| VERIFY-Q18 | MAJOR | Triangle/draw budgets contradict model budgets | ACCEPTED | S0.4 tris <= Ancient measured x 1.25, S6 R11 triangle-counted near budget, S5 far tri budgets; ER13. Near-LOD per-class budgets of v1 not re-derived. |
| VERIFY-Q19 | MAJOR | Size budget self-moving; wrong build gated | ACCEPTED | S0.4 + ER14: 5,000,000 B of the MINIFIED fragment hard fail, per-family bytes, raising it is the user's decision in the final message. Warn level (4.5 MB) and "gate builds both" not stated. |
| VERIFY-Q20 | MAJOR | File-count arithmetic and pack test | ACCEPTED | S0.4/S10 AU6 <= 500 files guard, AU2 packs + Chromium cross-correlation <= 1 ms (ER12), rehearsal publish with real files. |
| VERIFY-Q21 | MAJOR | Headless audio checks beyond loudness | ACCEPTED | S9 ER12 audit_sfx descriptors, cue trace per unit/ability/projectile/death/step/voice, mixtest per era, repetition test; S0.7 "nobody listened". |
| VERIFY-Q22 | MAJOR | Hosted-viewer check promised and unverifiable | ACCEPTED | S9 Hosted honesty: CSP-wrapped local page, read-back by hash, 10-line user checklist, extended Diagnostics. |
| VERIFY-Q23 | MAJOR | Two QA rounds not independent | MODIFIED | S0.9 + S12 P5: fresh black-box agents, round 2 does not see round 1, fix windows, QA quotes sha. Not stated: coverage matrix to fill, separate regression-verifier step, frozen-commit diff review. |
| VERIFY-Q24 | MAJOR | Bug classes QA found by hand have no scanner | ACCEPTED | S9 ER15 uiscan: hit-test, 44 px, contrast, Esc/Back keep era, 60 random keys, overflow at 1280x720, 960x540, 390x844 touch. |
| VERIFY-Q25 | MAJOR | Readability via unscored screenshots | ACCEPTED | S9 ER17 CIEDE2000, CVD separation, tracer coverage for every arena x time x weather. |
| VERIFY-Q26 | MAJOR | Gate time not in plan | ACCEPTED | S3 gate engineering lanes, --era, --steps, --dist, cache, gate_log.jsonl, targets. |
| VERIFY-Q27 | MAJOR | Criterion ids collide; report maps by comment | ACCEPTED | S0.9/S9 ER1..ER24 registered in code, criteria.json, zero assertions = UNVERIFIED; one S-id per module S28..S45 (internal S44/S45 mismatch, C2). |
| VERIFY-Q28 | MAJOR | Definition of done not written per tier | ACCEPTED | S9 DoD tiers (unit, mission, era, release). |
| VERIFY-Q29 | MAJOR | Era loops pass vacuously; no negative controls | ACCEPTED | S2 A7 eachEra asserts era list equals registry and counts assertions; S9 negcontrols (10 mutations, QA samples >= 8). |
| VERIFY-Q30 | MAJOR | Plan already shrank e.md targets; sound volume fraction of Ancient | MODIFIED | S1 units 34, sfx 290 by named families, hot-family >= 6 sources, repetition test. The baseline shortfall vs Ancient and vs D4 on non-unit rows is not logged in cuts.md at plan time. |
| VERIFY-Q31 | MINOR | Puzzle checks prove the stored solution, not the puzzle | ACCEPTED | S9 ER9 100 random legal armies win <= 15%, star 3 <= 5%, stored solution in 3 seeds and fires taught mechanic. |
| VERIFY-Q32 | MINOR | Cross-version save/share both directions untested | ACCEPTED | S9 ER16 save compat both directions against tagged v8 build. |
| VERIFY-Q33 | MINOR | Determinism verified in one engine only | ACCEPTED | S9 ER13 Node-vs-Chromium stateHashFull parity; non-Chromium listed unverified. Integer-friendly-math rule not stated. |
| VERIFY-Q34 | MINOR | Memory and boot do not scale with eras | ACCEPTED | S2 A6 lazy per-era build, boot builds active era only; ER13 boot proxy and 40-battle heap plateau. |
| VERIFY-Q35 | MINOR | Licence truth checked by field presence | ACCEPTED | S9 ER12/ER23 snapshots re-verified (100% CC BY, 20% CC0), credits parse test; S10 chosen licence per row. |
| VERIFY-Q36 | MINOR | Non-Chromium, touch, screen-reader coverage | ACCEPTED | S9 ER15 touch emulation, ER17 CVD, ER18 flash limiter and accessibility; S9 unverified list names touch devices and non-Chromium. |
| VERIFY-Q37 | MINOR | "Named, owned red" lets reds accumulate | ACCEPTED | S9: at most 3 open reds per phase, none older than a phase, QA only on fully green gate. |

## CONTENT

| id | severity | question | disposition | plan v2 section or reason |
|---|---|---|---|---|
| CONTENT-Q1 | BLOCKER | No roster / faction identity / boss list; 96 reskins cannot be checked | ACCEPTED | S5 rosters per era (34 rows with discriminators) + distinctness contract + boss table of 15; S1. File mismatch: S5 rosters.md vs S14 design/<era>.md. DEF. |
| CONTENT-Q2 | BLOCKER | Far mesh is what the player sees; look-dev tests near mesh | ACCEPTED | S5 far-mesh-first: render far at 40/80 u, >= 60% pixels, features >= 3x3 or even-aligned, downsample2 lint, rotor rule, far tri budgets. |
| CONTENT-Q3 | BLOCKER | "Animation worth watching" is a clip count; no death/hit variety by cause | ACCEPTED | S4 M17 reactions from (cause, fxClass, rig) with per-rig table; S5 about 3 deaths + 2 hits per rig; filmstrips read by non-builder. |
| CONTENT-Q4 | MAJOR | Audio supply stated as hope; single-source families | ACCEPTED | S10 AU1 source matrix, hot families >= 6 sources, heavy singles >= 3, single-source families processed/synth and declared. DEF spec/AU-audio.md. |
| CONTENT-Q5 | MAJOR | Best sci-fi source (Kenney sci-fi-sounds) missed | ACCEPTED | S10 AU1 adds Kenney sci-fi-sounds (73 CC0 oggs) plus impact/interface packs on disk. |
| CONTENT-Q6 | MAJOR | No sound direction per era | ACCEPTED | S10 AU0 sound bible per era (3 adjectives, forbidden timbres, realism processing 0.15-0.35 s pops). |
| CONTENT-Q7 | MAJOR | Per-unit weapon sound impossible with sim payloads | ACCEPTED | S4 M2 projectile_launch carries defId; S10 AU4 PROJ_AUDIO, AUDIO_PROFILES; ER12 cue trace. |
| CONTENT-Q8 | MAJOR | Loudness acceptance is one Ancient-only integrated number | ACCEPTED | S9 ER12 + S10 AU8 mixtest per era scenario, per-family loudness classes, stem report. LRA/voice-steal/duck thresholds not named. |
| CONTENT-Q9 | MAJOR | No objective audio checks beyond loudness | ACCEPTED | S9 ER12 audit_sfx descriptors per family. Spectrogram sheet read by an agent not stated. |
| CONTENT-Q10 | MAJOR | Sprite-pack decode memory and timing traps | ACCEPTED | S10 AU2 packs <= 1 MB, source.start(when, offset, dur) from shared buffer, Chromium cross-correlation <= 1 ms, format fixed by P0 rehearsal. |
| CONTENT-Q11 | MAJOR | Music: Modern is orchestral epic; loops and slots ungated | ACCEPTED | S10 AU3 slot per era with loop:true or passing loop check, RandomMind loops, synth/groove for Modern, CC BY-SA rejected, per-screen era music. DEF slot table in spec/AU-audio.md. |
| CONTENT-Q12 | MAJOR | Licence gate trusts the page tag; provenance unchecked | MODIFIED | S10 chosen licence per row (never "any"), multi-licence pages only with licence stated, snapshots committed; ER12/ER23 re-verification. Provenance score (author history) not adopted. |
| CONTENT-Q13 | MAJOR | reload collides with catapult1 plain id | ACCEPTED | S5 gun reload is reload_gun; test that new ids exist in no registered rig and no DEFAULT_META. |
| CONTENT-Q14 | MAJOR | Fire-rate and anticipation are set by the clip | ACCEPTED | S4 M2 burst animation contract (one windup clip per burst, per-round recoil pulses); S5 +-5% timing for rate-limiting clips. |
| CONTENT-Q15 | MAJOR | Two-handed gun poses unproven | ACCEPTED | S5 P0 spike: rifle pose on 3 body types x helmets x power armour, clipping metric, fallbacks. |
| CONTENT-Q16 | MAJOR | No reference acquisition for hardest models | ACCEPTED | S5 References: 3-5 CC0 silhouettes per hero model in docs/eras/ref, CC0 voxelisation for proportions, iteration caps incl. 4 for boss/hero. |
| CONTENT-Q17 | MAJOR | 5 bosses per era have no models | ACCEPTED | S5 boss table of 15 with one non-scaled-hum1 silhouette per era boss; S1 bespoke silhouettes. |
| CONTENT-Q18 | MAJOR | Mech as hum1 x2.6 reads as a big man | ACCEPTED | S5 at most one suited giant, other mechs own rig with reverse-knee gait; S15 D21; M17 topple death. |
| CONTENT-Q19 | MAJOR | Airborne look unowned (altitude, shadow, rotor, banking) | ACCEPTED | S5 airborne look spec: altitude by class, shadow blob, banking from vx, rotor representation, dragon wing >= 3 voxels; S6 R4 blobs. |
| CONTENT-Q20 | MAJOR | Text volume 130% of Ancient; review is author's own rubric | ACCEPTED | S11 three comedic engines, ER11 similarity caps, independent reviewer pass with different prompt, 20 random lines per era quoted in QA. |
| CONTENT-Q21 | MAJOR | Announcer 150 lines vs need of ~25 new categories | ACCEPTED | S1 220 era + 27 campaign lines; S11 target by arithmetic (categories x 9 + 3/mission + 30% neutral rewritten), repetition measure in humor-sim. |
| CONTENT-Q22 | MAJOR | Banned-term sweep bans words Medieval needs | ACCEPTED | S11 per-era banned/allowed lists (abbey, church bell, plague as setting); ER11 signed allowlist. |
| CONTENT-Q23 | MAJOR | Fictional factions enforced by text only; visual coding enters real-world references | MODIFIED | S0.6 visual bible per era with banned lists and a checker (spec V1); no franchise units. No section-14 file holds the visual bible (label V1 collides, C10); emblem rotation/hook lint and human-read of faction contact sheets not stated. |
| CONTENT-Q24 | MAJOR | sfx floor 70 cannot cover Modern/Sci-Fi | ACCEPTED | S1 named family lists: Modern 120 rows, Sci-Fi 110, Medieval 60; floor = every named family has a real row or approved synth. |
| CONTENT-Q25 | MAJOR | Ambience and material foley mostly synth | ACCEPTED | S10 AU1 real CC0 ambience loops per arena family (>= 3 per era). Surface-footstep mapping for new materials not stated. |
| CONTENT-Q26 | MAJOR | Preview framing for long/flying models | ACCEPTED | S5 meta.bounds drives cull, previews and Codex framing. |
| CONTENT-Q27 | MINOR | Props at 0.2-0.25 voxel next to 0.1 soldiers | ACCEPTED | S5 P0 spike (mixed voxel size, keep 0.1 vs 0.2) and S7 W2 per-spec voxel size from the spike. |
| CONTENT-Q28 | MINOR | Crew on guns costs the 48-part cap | ACCEPTED | S5 + S15 D12 lite crew of 6 parts for guns and trebuchets. |
| CONTENT-Q29 | MINOR | Dragon cost (wings, breath, shadow) not costed | ACCEPTED | S5 far tri budget boss <= 15 K, wing >= 3 voxels, per-model acceptance checklist with near/far tris. |
| CONTENT-Q30 | MINOR | Clip count and bake cost | ACCEPTED | S5 clips baked lazily per rig; S2 A6; ER13 boot. |
| CONTENT-Q31 | MINOR | Audio telegraph for new statuses/mechanics | ACCEPTED | S10 AU4 mechanic-to-cue table (suppress whiz, shield hum/break, cloak, EMP, reload). Cue ids in spec/AU-audio.md. |
| CONTENT-Q32 | MINOR | Medieval has best asset coverage and weakest model plan | MODIFIED | Covered only by the generic roster distinctness contract (S5). Not stated: Medieval-vs-Ancient silhouette discriminators, about 30 new helm/armour/weapon parts. DEF design/medieval.md. |
| CONTENT-Q33 | MINOR | Voice for vehicles, drones, mechs, aliens silent | ACCEPTED | S5 rosters row includes audio profile and bark roles per unit. |
| CONTENT-Q34 | MINOR | Credits growth and modification notices | ACCEPTED | S10 AU7 credits grouped by era with modification notices, credit test; ER23. |
| CONTENT-Q35 | MINOR | Tracer list covers 12 units, not 12 rigs | ACCEPTED | S5 one tracer per rig. |
| CONTENT-Q36 | MINOR | Minimum strings per unit not fixed | ACCEPTED | S0.5 >= 11 strings per unit, >= 15 for heroes and bosses. |

## Themes

Blocker answers that are solid: G1 decoupled from stateHash and Ancient-policy change control (SCOPE-Q5, ENGINE-Q3/Q4, VERIFY-Q1/Q2), S-FREEZE (SCOPE-Q6), targeting and role model (ENGINE-Q2), merged-defs leak (ENGINE-Q5), campaign_play (VERIFY-Q5), counter statistics (VERIFY-Q6), release_check (VERIFY-Q7), TOOLS ownership (VERIFY-Q8), roster/far-mesh/reactions (CONTENT-Q1..Q3), feel sheets/set-pieces/onboarding (PRODUCT-Q2/Q3/Q5).

Blockers answered only partly (MODIFIED): SCOPE-Q1, Q2, Q3, Q4, Q7; ENGINE-Q1; PRODUCT-Q1, Q4. All of them are the sequencing, tracer, WBS and vertical-slice cluster: v2 states the intent but leaves the phase table inconsistent with the mechanic order (C3, C7, C9).

Theme groups:

- **Safety nets and Ancient identity.** SCOPE-Q5/Q6/Q24/Q28, ENGINE-Q3/Q4/Q5/Q17, VERIFY-Q1/Q2/Q3/Q4/Q9/Q32: all ACCEPTED; residual: policy table not yet written, NaN guard, git tag ownership (C5).
- **Sequencing, tracers, WBS, capacity.** SCOPE-Q1/Q2/Q3/Q7/Q10/Q13/Q27, ENGINE-Q1, PRODUCT-Q4: MODIFIED; the weakest cluster of v2.
- **Isolation, ownership, tooling.** SCOPE-Q4/Q9/Q14, VERIFY-Q8/Q26: accepted in principle; hot-file owner table and spec owners missing (C4, C6).
- **Sim mechanics and performance.** ENGINE-Q2, Q6..Q16, Q19..Q31, SCOPE-Q17/Q18: ACCEPTED; budgets are asserted not derived (C12); ENGINE-Q32 UNADDRESSED.
- **Models, rigs, animation.** CONTENT-Q1..Q3, Q13..Q19, Q26..Q30, Q35: ACCEPTED (spikes in P0); CONTENT-Q32 MODIFIED.
- **Audio and music.** CONTENT-Q4..Q12, Q24, Q25, Q31, Q34, VERIFY-Q20/Q21/Q35, PRODUCT-Q16: ACCEPTED; provenance score and footstep map missing; all measurable proxies, nobody listens (S0.7).
- **Text, humour, safety.** CONTENT-Q20..Q23, Q36, PRODUCT-Q6/Q11/Q12/Q29, VERIFY-Q11/Q12: ACCEPTED; "human read" is an agent read (C15).
- **Campaign design, teaching, reward, modes, UI.** PRODUCT-Q1..Q3, Q5, Q7..Q9, Q13, Q17..Q22, Q24..Q32: ACCEPTED or MODIFIED; all detail lives in spec/C-campaign-ui.md and design/<era>.md, none exists yet.
- **Verification and release.** VERIFY-Q5..Q7, Q10..Q19, Q21..Q29, Q31..Q37: ACCEPTED; DoD tiers, criteria in code, negcontrols, uiscan, release_check.
- **Scope numbers.** SCOPE-Q11, VERIFY-Q30, PRODUCT-Q33: MODIFIED/UNADDRESSED; targets raised but the Ancient-parity gap is not stated to the user or logged.

## Items answered only by deferring to a spec deliverable (plan S14)

Each is ACCEPTED in the table above because v2 states the decision, but the actual content (table, numbers, list) does not exist yet and must be checked when the named file is written. S14 says "each has an owner and acceptance" but names neither (C6).

- **spec/A-architecture.md**: Ancient-policy table incl. the lazy-crater, structDmg, gate-ownership, buffer-aliasing, bug-fix decisions (ENGINE-Q4, VERIFY-Q2, SCOPE-Q5); errata table (ENGINE-Q33, SCOPE-Q27); hard-coded Ancient literal list and kit replacements (ENGINE-Q38); registry DAG and merge kinds (ENGINE-Q29).
- **spec/M-mechanics.md**: layer audit of 21 hash.query sites (ENGINE-Q8); air AI state machine (ENGINE-Q9); vehicle/turret model (ENGINE-Q15); target score table (ENGINE-Q2); penetration numbers (ENGINE-Q12); accounting rules (ENGINE-Q25); per-mechanic budget lines and worst scenarios (SCOPE-Q17, ENGINE-Q7, Q19); per-era pacing thresholds (ENGINE-Q11); burst/fire-rate contract (CONTENT-Q14).
- **spec/R-render-anim.md**: per-rig clip and reaction lists (CONTENT-Q3); far-mesh numbers (CONTENT-Q2); airborne look (CONTENT-Q19); fxClass tone table (PRODUCT-Q6); SE tint table (ENGINE-Q35); shader v2 (ENGINE-Q27); preview framing (CONTENT-Q26).
- **spec/W-world.md**: scale/tempo table (PRODUCT-Q13, ENGINE-Q37); vehicle widths and corridor rule (ENGINE-Q24); first-contact policy; voxel-size decision (CONTENT-Q27); theme vocabulary.
- **spec/C-campaign-ui.md**: chooser wireframes (PRODUCT-Q18); teaching system (PRODUCT-Q5); HUD and Take Command (PRODUCT-Q8, ENGINE-Q16); modes table (PRODUCT-Q25); reward ledger (PRODUCT-Q19); difficulty policy (PRODUCT-Q21); god powers (PRODUCT-Q9); scout codes (PRODUCT-Q20); what is new (PRODUCT-Q26); map art direction (PRODUCT-Q28); mutator matrix (PRODUCT-Q22); chrome census (PRODUCT-Q17); achievements/codex (PRODUCT-Q30/Q31).
- **spec/AU-audio.md**: sound bible (CONTENT-Q6); source matrix (CONTENT-Q4, SCOPE-Q21); packs (CONTENT-Q10); router tables and mechanic cue table (CONTENT-Q7, Q31); music slot table (CONTENT-Q11); ambience (CONTENT-Q25); loudness classes (CONTENT-Q8).
- **spec/H-humour.md**: comedic engines and arc, callback ledger (PRODUCT-Q12, Q29, CONTENT-Q20); death-line rubric (PRODUCT-Q6); banned/allowed lists (CONTENT-Q22); announcer arithmetic and template classification table (PRODUCT-Q11, CONTENT-Q21).
- **spec/V-verification.md**: ER thresholds, DoD tiers, release_check, negcontrols (VERIFY-Q5..Q7, Q28, Q29); heavy-job budget (SCOPE-Q8); owner table G1..G10 and V1..V10 (VERIFY-Q8); gate time budget (SCOPE-Q14).
- **design/<era>.md (x3)**: feel sheet (PRODUCT-Q3); rosters, boss table, bark roles, silhouette discriminators (CONTENT-Q1, Q17, Q32, Q33); 9-row mission table with set-piece package, teach/test mechanic, star-3 test, reward, par, attempts (PRODUCT-Q1, Q2); mechanic-to-mission matrix; tutorial beats.
- **traceability.md**: e.md clause to plan item to phase to evidence (PRODUCT-Q7).

Deliverables v2 relies on but S14 does not list (no home, so the answer is a promise with no file): Workshop spec (PRODUCT-Q23), vertical-slice rubric (PRODUCT-Q4), visual bible "spec V1" (CONTENT-Q23), WBS / work-package list (SCOPE-Q7, Q22), capacity and token envelope (SCOPE-Q1), tests/tools/mocks migration inventory (SCOPE-Q13), sim warm-up spec (ENGINE-Q32), "next asks" triage (PRODUCT-Q33).

## Silently dropped sub-requests (inside ACCEPTED/MODIFIED rows; v2 neither adopts nor rejects them)

- SCOPE-Q1 token envelope per phase; SCOPE-Q2 two-lane SIM split; SCOPE-Q4 per-workstream worktrees/branches and amended AGENTS.md; SCOPE-Q6(3) per-mission fingerprints; SCOPE-Q10(3) non-re-fetchable assets/raw list; SCOPE-Q13 mockctx era mode, central paths config, applyTune generalisation; SCOPE-Q16 per-family byte budget and +300 KB auto-stop; SCOPE-Q19 documented rollback; SCOPE-Q30 view prewarm.
- ENGINE-Q1 pulling M7/M8/M4/M5 into P1; ENGINE-Q13 render cap 1500; ENGINE-Q20 TYPE_CAP or shared-far-mesh fallback if 160 draws at 16+16 types is missed; ENGINE-Q32 warm-up.
- PRODUCT-Q1 >= 5 of 7 objective types per era, difficulty-curve targets, validator tied to the signed table; PRODUCT-Q4 act-level lighter slices and "no volume before pass"; PRODUCT-Q10 move Time Warp off the first ladder rung; PRODUCT-Q23 abilities per class and body/armour tiers; PRODUCT-Q30 Stats screen; PRODUCT-Q31 global Codex search; PRODUCT-Q32 briefing-time prebuild; PRODUCT-Q33 next-asks list.
- VERIFY-Q1 NaN-aware hash / non-finite guard; VERIFY-Q10 --strict by default in gate; VERIFY-Q14 harness props/script scenarios and TUNE_ROLES; VERIFY-Q16 role exemptions and pick-rate proxy; VERIFY-Q19 4.5 MB warn level and building both flavours; VERIFY-Q23 coverage matrix and separate regression verifier; VERIFY-Q30 cuts.md log of the baseline shortfall.
- CONTENT-Q9 spectrogram sheet reviewed by an agent; CONTENT-Q12 provenance score; CONTENT-Q23 emblem lint and faction contact-sheet read; CONTENT-Q25 surface-footstep map; CONTENT-Q32 Medieval helm/armour part budget.

## CONTRADICTIONS and gaps inside plan v2

- **C1 Header counts.** Line 3: "about 190 questions, 27 blockers". The five files hold 174 numbered questions (30+38+33+37+36) and 28 blockers (7+5+5+8+3).
- **C2 Criterion numbering.** S4 rules paragraph says each module has an "S-criterion S28..S44"; the same table ends at M17 = S45 and ER6 says "S28..S45". S14 lists "M0..M17" but there is no M16 (18 modules, 18 ids, so the count works only if M16 is acknowledged as dissolved).
- **C3 Phase uses something before it exists.** S12 P1 requires "tracer per rig" and a vertical slice (mission 1 of each era, reviewed against a rubric), but P1 contains only M0 M1 M2 M2b M3 M15a M17-basic. tank1 needs M8, heli1/drone1/hover1/dragon1 need M7, shields M4, cloak M5, trebuchet M10/M12, all in the P2 chain. The slice also needs C6 teaching beats and HUD ("tutorial and HUD packages" are P2), the M14 `setpiece` script event (third in the P2 chain) and R17 shots. The rubric the slice is judged against is defined nowhere. v2 never says what a rig tracer proves without its mechanic.
- **C4 Single editor per hot file vs three INTEGRATION agents.** S12: "single editor per hot file (animator.js, battleview.js, cues.js, game.js, meta.js, content.js, world.js, strings.js)" yet "INTEGRATION per era owning game.js/meta.js/content.js glue" gives three agents the same three files. world.js is ambiguous (src/sim/world.js is SIM, src/world/* is WORLD). No owner is named for strings.js, animator.js, battleview.js, cues.js (no ownership table, which SCOPE-Q4 asked for).
- **C5 Git actions owned by an agent that may not run git.** S3 (owner TOOLS) requires the ancient-v8 tag and a long-lived git worktree; S12 says "Agents may not run git" and only COORD commits. Nobody is named to create the tag, the worktree or the hourly pushed WIP commits.
- **C6 S14 claims owners and acceptance that it does not give.** S14 heading: "each has an owner and acceptance"; none of the ten deliverables names an owner or an acceptance script. Same for the WP list (S12) whose WPs "have an owner" but no WP list exists.
- **C7 Unit "done" cannot be reached in the phase that builds units.** S0.5/S9 define a unit as done only with a balance row in [30%, 62%] and membership in a campaign mission, survival pool and Quick faction; balance and campaign tuning run in P3 after S-FREEZE, and no phase row (P1, P2) names the authoring of the 27 missions, 18 puzzles, survival, daily, god powers, achievements, Codex, Workshop parts. The [30%, 62%] band is applied to all units including 15 bosses, support and siege units (q1_verify exempted bosses and support).
- **C8 Ancient-delta sentence contradicts itself.** S4: "Two deliberate Ancient deltas are allowed and reviewed with golden re-records: none unless the table says so." S0.1 says nothing else may change. The table (spec A1) does not exist yet, so the number of allowed deltas is undefined.
- **C9 Unplaced work items.** P1 names R1 R6 R7 R12 R14 R15 R17 and W1..W4; R2..R5, R8..R11, R13, R16 (flash limiter, a shipped defect), W5..W9, C2..C5, C10..C15, C17..C21 and AU4..AU8 appear in no phase row, although ER criteria depend on them.
- **C10 Identifier collisions.** "A1" is both the Registry item (S2) and the Ancient-policy table "spec A1" (S0.1). "V1" is the visual/verbal bible (S0.6) and also the verification owners V1..V10 (S14). "U1" is the unit contract matrix while docs/verification.md already defines U1 as the UnitDef schema check. S11 puts death-line examples in docs/spec/humor.md (an existing Ancient file) while S14 lists spec/H-humour.md. S5 puts rosters in rosters.md, S14 in design/<era>.md.
- **C11 Numbers that differ.** Music: S1 says 6 tracks plus a map/chooser bed (7 per era) but totals say 18 tracks. S13 rung 4 "Generic workshop parts to 90" while S1 makes generic parts 40 (the floor of 90 is for total parts). S1 title "parity first" vs targets below Ancient (units 79%, arenas 75%, parts 47%, tips 63%, achievements 63%, announcer ~51%); average sfx per era (290/3 = 97) equals v1's "about 100" that three reviewers called too low. Size thresholds: 4.6 MB (AU6/D17) vs 5.0 MB hard cap, no warn level.
- **C12 Budgets asserted, not reconciled with the maps.** S4 "+0.5 ms at 300 units" per worst scenario vs map 02 line items (0.37 per extra flow class + 0.55 craters at 4/s + 0.19 snipers); S0.4 "<= 160 draws at 16+16 types" vs map 04 arithmetic (~177 after R12) with no fallback; S3 "T-full <= 15 min" while campaign_play of 27 missions was estimated at 15-30 min alone (q1_verify Q5) and release_check also runs uiscan, negcontrols, G8 renders; the plan does not say which steps are in T-full.
- **C13 Cut ladder vs NEVER-cut and user-named mechanics.** S13 rung 6 may cut mines, smoke occlusion, teleport pads, wrecks; e.md names mines (Modern) and teleporting (Sci-Fi); NEVER-cut lists "hover/teleport" and "guns/suppression/cover" (smoke is part of M9 cover/LOS, listed as built in S4). It is unclear which of these survive a cut.
- **C14 Dress-rehearsal publish in P0 uses files that do not exist yet.** S10 AU2: packs are built after "the real-file dress-rehearsal publish (P0)"; the hunt and slicing happen in P2 after the M2 taxonomy, so the final bytes cannot exist in P0; S12 P0 row does not list the rehearsal and publishing is COORD's job.
- **C15 "Human read" is an agent read.** S11 (announcer classification "by a human read in P0"), ER11 blind comedy scores and S0.9 are all performed by agents; no human reviews text, audio or visuals before the user, but the S9 unverified list names only sound, GPU, hosted viewer, non-Chromium, touch devices and human play of every mission.
- **C16 Owner gaps.** No owner for: tag/worktree (C5), vertical-slice rubric, visual bible, Workshop spec, WP list, capacity envelope, callback ledger across three COMEDY agents (only the reviewer pass), Credits (AUDIO licences vs COMEDY jokes), sim warm-up.

## Verdict

Plan v2 answers 143 of 174 round-1 questions fully (ACCEPTED), 29 partly or differently (MODIFIED), 0 by explicit rejection and 2 not at all. Its claim that every question is answered is not true as stated (C1, 2 UNADDRESSED, many silently dropped sub-requests). The remaining risk is concentrated in sequencing (C3, C7, C9), ownership (C4, C5, C6, C16) and in deliverables that exist only as names in S14.
