# verification.md — acceptance criteria (written BEFORE building; every gate cites these)

Legend: **How** = `N` Node test, `B` browser smoke (Playwright/headless Chromium, no autoplay flag), `V` visual (screenshot/contact sheet read by a human-equivalent reviewer against a written checklist), `M` metric script, `R` manual review of code/docs, `H` honest limitation (cannot be verified here; declared in the final message).
Gate tags: T0, T1, T2, T3 (the tier by which the criterion must pass). Evidence is recorded in `docs/verification_report.md`.

## B. Boot, packaging, resilience
| id | criterion | how | gate |
|---|---|---|---|
| B1 | Build emits `dist/artifact/index.html` as a fragment: starts with `<title>VOXELWARS</title>`, contains no `<!doctype`, `<html`, `<head`, `<body` tags | N | T0 |
| B2 | CSP lint: every `src/href` external URL is on the Artifact allowlist; no `url(http…)` in CSS; no `fetch`/XHR to non-relative URLs in the bundle | N | T0 |
| B3 | Loading the page from a local server that sends the artifact CSP header: zero console errors, zero console warnings (excluding the enumerated known three.js deprecation list), zero `securitypolicyviolation` events, zero failed requests | B | T0 |
| B4 | Time-to-title <= 4 s and time-to-interactive <= 8 s on Chromium WITH GPU-less compile excluded: measured as time from navigation to the first title frame minus shader-compile tasks, with CSS-only loader animation; software-GL absolute times are reported (`H`) | B | T1 |
| B5 | With `three.min.js` blocked on cdnjs the loader falls back to jsDelivr then unpkg; with all three blocked a full-screen fatal panel appears with cause text and a working Copy button (no white screen) | B | T0 |
| B6 | With WebGL2 disabled the fatal panel names WebGL2 as the cause and offers Safe mode instructions | B | T0 |
| B7 | A shader/compile error is reported in Diagnostics (not swallowed) — verified by an injected bad material in a test build; compile warm-up yields per material (no single task > 600 ms excluding GPU compile) | B | T1 |
| B8 | `window.__vw` exists with `step/seed/metrics/goto/state/audio/clock` | B | T0 |
| B9 | Page never calls `alert/confirm/prompt` (grep) and never writes user strings with `innerHTML` (grep + fuzz) | N | T0 |
| B10 | Artifact page (fragment) <= 3 MB (budget: JS + CSS + embedded core SFX <= 450 KB raw + inline manifest); supporting files (audio/vfx) published separately, <= 255 files per publish call, total <= 40 MB; page itself well under the 16 MB limit | N | T0 |
| B11 | A republish keeps saves: save fixtures from build N load in build N+1 (migration test) | N | T2 |
| B12 | `claude.hot.snapshot/ready` wiring: battle setup survives a hot reload (simulated by calling the snapshot/ready path) | B | T3 |

## R. Rendering
| id | criterion | how | gate |
|---|---|---|---|
| R1 | Voxel mesher: face-culled, correct CCW winding, AO per vertex; unit tests incl. seams | N | T0 |
| R2 | Draw calls at Marble with 12 unit types on screen: unit skins <= 24 (near+far LOD pairs) + terrain chunks visible (32-cell chunks: <= 64 on large) + prop batches <= 60 + fx <= 6 <= 160 total; shadow pass counted separately (<= 100) | B/M | T1 |
| R3 | Team tint: a unit with F_TEAM voxels renders in team A and team B colours; flash and glow flags work | V | T0 |
| R4 | Colour pipeline: swatch card identical (±2/255) with post on and off | B/M | T1 |
| R5 | Shadows: texel-snapped (camera pan of 1 u changes shadow pixels by < 1% of edge pixels), no acne on voxel faces at 3 sun angles | V | T1 |
| R6 | Units follow `cellHeight` smoothly (max rise 12 u/s) and never sink below it over a 60 s AI battle on 3 arenas (clearance >= 0) | M | T0 |
| R7 | Crater: boulder impact deforms terrain, mesh rebuilds for dirty chunks only (<= 4 chunks), nav updates within one second | N/B | T1 |
| R8 | Debris/particle/number pools never exceed caps; cap values per tier match spec (6000 default at Marble); battle end cleans up | M | T1 |
| R9 | 20 consecutive battles: `renderer.info.memory.geometries/textures` stable (±5%), JS heap growth < 15% | B/M | T3 |
| R10 | Context loss/restore rebuilds scene without exception | B | T3 |
| R11 | Quality tiers produce different settings (pixel ratio, shadow res, post, clouds, debris cap) and auto-scale hysteresis never changes tier twice within 60 s | M | T1 |
| R12 | Sky/time-of-day: arena at 6, 12, 18, 23 h produces visibly different but readable scenes (contact sheet) | V | T1 |
| R13 | Weather visuals for rain/snow/sandstorm/fog/storm exist and are capped by tier | V | T1 |
| R14 | Readability: at default battle zoom with 300 units, teams distinguishable by colour in all 3 palettes (CVD simulation ΔE >= 20) | M/V | T1 |
| R15 | Camera never clips inside terrain/props in the 6 modes over a scripted path (collision test) | M | T1 |
| R16 | Camera jerk metric (3rd derivative) below threshold in cinematic mode; cut cooldown >= 3 s | M | T1 |

## S. Simulation and AI
| id | criterion | how | gate |
|---|---|---|---|
| S1 | Sim runs headless in Node; `world.tick()` deterministic: 3 runs with the same seed produce identical hash after 2000 ticks | N | T0 |
| S2 | RNG streams separate; `Math.random` absent in `sim/` and `content/` (lint) | N | T0 |
| S3 | Per-tick CPU at 150/300/500/1000 units: <= 1.2 / 2 / 3 / 6 ms (Node proxy), heap growth over 10k ticks < 1 MB | M | T1 |
| S4 | Damage/armor/shield/charge/brace/backstab/knockback/trample/friendly-fire formulas each have a unit test matching spec §7.1 | N | T1 |
| S5 | Overlap ratio (units closer than 0.8*(r1+r2)) < 3% averaged over a 60 s 150v150 battle (War preset ≈ 15,000 per team) | M | T0 |
| S6 | In-contact idle fraction (melee unit within range of an enemy but not attacking/moving) < 3% | M | T1 |
| S7 | Heading flips (>90° reversal within 0.5 s) < 0.15 per unit-second | M | T1 |
| S8 | Stuck units (displacement < 0.5 u over 6 s while having a target and not engaged) < 1% | M | T1 |
| S9 | No grounded, non-knockback unit stands inside a blocking prop footprint, deep water or lava at the end of any tick (airborne units from geyser/launch excluded) over 20 battles; knockback never moves a unit onto a non-walkable cell | M | T1 |
| S10 | Flow field routes around the Thermopylae wall, the Nile river (via the ford) and Styx lava (via bridges): both armies reach each other in each | N | T1 |
| S11 | Termination fuzz: 2,000 random matchups x random arenas end within 6 sim-minutes (stalemate watchdog + governor) | M | T1 |
| S12 | Battle length distribution for default armies: median 60-120 s at 1x, 90th percentile <= 180 s | M | T1 |
| S13 | Archers hold at 0.85*range and kite when enemies are inside `minRange`; cavalry prefer archers/siege; spears prefer cavalry (target-score unit tests + behaviour test) | N | T1 |
| S14 | Spear wall beats cavalry charge: 20 hoplites (holding) vs 10 companion cavalry (charge): cavalry loses >= 70% in 20 seeds; shield wall blocks >= 60% of frontal arrows | N | T1 |
| S15 | Morale/rout: army collapse below 20% triggers rout events; routed units flee and do not attack | N | T1 |
| S16 | Abilities (18 classes): each has a unit test of effect + cooldown + AI cast rule + telegraph event emitted | N | T1 |
| S17 | Objectives: eliminate, kill_general, hold_hill, protect_vip, survive_waves, destroy each complete and fail correctly (unit tests with scripted worlds) | N | T1 |
| S18 | God powers: each applies its effect, telegraphs, respects cooldown | N | T1 |
| S19 | Time model: 4x speed, pause, hit-stop, catch-up clamp (<= 5 ticks/frame), injectable clock | N | T0 |
| S20 | Army generator respects budget (±1 cheapest unit), zone bounds, legality, 16-type cap; all 6 styles produce different compositions | N | T1 |
| S21 | Difficulty tiers differ by behaviour metrics (reaction delay, focus-fire rate, ability use) and by win-rate bands of `normal` army-gen vs the fixed reference bot `counter`: easy-AI < 35%, normal-AI 45-55%, hard-AI > 65% for equal-cost armies, n >= 200 | M | T3 |
| S22 | Mirror fairness on each SYMMETRIC arena (marathon, colosseum, persepolis, arenalab, oasis, olympus, cyclops): equal armies, n >= 400 battles with sides swapped, both sides' win rate within 45-55%; ASYMMETRIC arenas (troy, thermopylae, nile, carthage, styx, alpine, giza, teutoburg) are exempt but must stay within 35-65% | M | T1 |
| S23 | **Fun metrics** over 200 default battles per setup: lead changes >= 1 in >= 40% of battles; steamroll (winner keeps > 80% of cost) <= 20%; close finish (winner keeps < 40%) >= 25%; no 20 s window without a kill (dead air); announcer lines 8-15 per battle; gag events >= 1 in >= 60% of 'chaos' battles; distributions reported | M | T3 |
| S24 | Sim identity: unit ids are never reused over a 10-minute battle with 400 spawns/deaths; `world.dying` units keep rendering their death clip for 1.6 s; arena is cloned on construction (mutating the world's arena never changes the source) | N | T0 |
| S25 | Knockback: a normal hoplite hit moves a hoplite <= 0.7 u; a charge hit 1.5-3 u; the Spartan kick 8 ± 1 u; clamp at 8 u for any hit (unit tests) | N | T1 |
| S26 | Input log determinism: replaying the same tick-stamped `world.input` list produces the identical state hash; unstamped calls are rejected in tests | N | T1 |
| S27 | Breach: when the only route to the enemy passes a destructible wall/gate, armies attack it and the battle still ends (Troy test with gate_door x2) | N | T1 |

## A. Animation
| id | criterion | how | gate |
|---|---|---|---|
| A1 | Clip format validator: all clips have `frames`, `parts` for valid part ids, finite numbers, meta hit/recover inside range | N | T0 |
| A2 | Humanoid minimum clip set (spec §6) exists and plays on every humanoid; missing-clip fallback logs an error in tests (never in production) | N | T0 |
| A3 | Retargeted clips adopted only if the filmstrip review passes: no limb flips, joint ranges sane; foot slide <= 15% of stride (single threshold with A4); rejected clips replaced by authored ones | V/M | T0 |
| A4 | Walk/run playback rate matches speed: foot slide <= 15% of stride at the unit's walk/run speed (same metric as A3) | M | T1 |
| A5 | Damage lands within 1 tick of the clip's `hitFrame` (test per attack style) | N | T1 |
| A6 | Crossfade: no pose popping > 0.35 rad per frame at clip switches (test over a random switch sequence) | M | T1 |
| A7 | Death: all unit kinds play a death clip then burst into debris sampled from their own palette (20-40 cubes by size); no body left T-posed | V/B | T0 |
| A8 | Beast/siege/mount rigs: gallop/walk/trample/throw clips authored; rider stays on the saddle (attach error < 0.05 u) | V/M | T1 |
| A9 | Animation LOD tiers (full/half/frozen/skip) engaged by distance; CPU ms per frame for animation at 500 units <= 4 ms | M | T1 |
| A10 | Contact sheets (idle/walk/run/attack/block/hit/death/cast) for all units generated and reviewed; no unit fails silhouette at 3 zoom levels | V | T1 |

## U. Units, content, balance
| id | criterion | how | gate |
|---|---|---|---|
| U1 | 43 UnitDefs validate against the schema; ids unique snake_case; every field in spec/units.md present | N | T1 |
| U2 | Every humanoid compiles via `compileSoldier` to a ModelDef <= 48 parts (<= 24 for non-mounted), bounds within the canonical grids, height 2.4-3.4 u including crest (giants excepted), voxel count 600-6000, no part penetrates the ground at idle (offhand bottom >= ground) | N | T1 |
| U3 | >=30% team-tinted visible surface per soldier (script on 3 projections); team-tint voxels exist on every unit | M | T1 |
| U4 | Each unit has blurb, lore, >=3 death quotes, >=2 taunts, codex joke, sfx families that exist in the cue map | N | T1 |
| U5 | Equal-cost mass battles: no unit has a win-rate above 62% vs the field (excluding bosses vs low-tier by design); every non-boss unit has a counter (≥1 unit beats it at 60%+ at equal cost) and a prey | M | T3 |
| U6 | Duels sanity: hoplite beats peltast and archer in melee; cavalry beats archers; spear beats cavalry; elephant loses to massed spears + fire but beats equal-cost infantry blobs in open; catapult kills clusters | M | T3 |
| U7 | Cost formula monotonic in stats; hoplite = 100 ± 5; costs within 15% of the spec table after tuning (diff reported) | N | T3 |
| U8 | Custom-soldier fuzzer: 5,000 random legal blueprints; none exceeds 1.35x the best shipped unit's cost-efficiency in its role; all compile; none crashes the sim | M | T2 |
| U9 | Silhouette/readability reviewed on contact sheets: each faction recognisable by helmet/colour; the 5 heroes recognisable at 40 px | V | T1 |

## W. World, arenas, props, campaign
| id | criterion | how | gate |
|---|---|---|---|
| W1 | 14 arena presets generate deterministically for 3 sizes; zones never underwater; path A->B exists with radius 0.45 | N | T1 |
| W2 | Each preset passes the look gate: top-down + 2 oblique screenshots reviewed; no floating props, no z-fighting, props on ground | V | T1 |
| W3 | Props: 40 catalog entries with models, radius, hp stages; destroyed props leave rubble and update nav once; destruction emits events | N/V | T1 |
| W4 | Hazards (6 kinds) each telegraph + effect + AI avoidance verified | N | T1 |
| W5 | Weather modifiers: rain halves burn, snow -10% speed, sandstorm spread x1.5 (unit tests) | N | T1 |
| W6 | Campaign: 9 missions load, objectives work, stars computed; scripted bots over 40 seeds each land in win-rate bands (greedy 25-75%, counter 50-90%, turtle 10-60%) per mission (report in verification_report.md) | M | T1 |
| W7 | Survival: wave composition budgets match spec, intermission placement works, boss waves every 5, leaderboard persists | N/B | T1 |
| W8 | Colosseum crowd reacts to kills; Troy walls/towers collapse to rubble; Styx lava damages and is avoided | V/B | T1 |

## AU. Audio
| id | criterion | how | gate |
|---|---|---|---|
| AU1 | Manifest ledger: every shipped file has author, title, source URL, licence (CC0/CC-BY only), edit notes; CREDITS generated; build fails on a missing row | N | T0 |
| AU2 | With a stubbed `AudioContext` that starts `suspended` and resumes only on a synthetic user gesture: music bus RMS stays 0 before the gesture and > 0.001 within 3 s after it; **negative control**: remove the gesture gate => the test fails | B | T0 |
| AU3 | Every cue family resolves to ≥1 real asset or a flagged synth; coverage matrix doc lists synth-only families with justification | N | T1 |
| AU4 | Core pack embedded works with fetch blocked (offline test): hits, UI, horns, death sounds, one music track play | B | T0 |
| AU5 | Voice budget 32 enforced; scripted 150v150 battle: no more than 32 voices, voice-steal logic prefers heroes/near; rate limits hold | B/M | T1 |
| AU6 | Offline mix render of a scripted battle: master true-peak < -1 dBFS, 0 clipped samples, loudness -18 ± 3 LUFS (ffmpeg ebur128) | M | T1 |
| AU7 | Music: one track per battle chosen by arena theme; intensity changes lowpass/gain smoothly; crossfade loop with no gap > 20 ms (validator) | M | T1 |
| AU8 | Ducking engages on announcer line and horn; restores within 800 ms | B | T1 |
| AU9 | Mute/volume sliders persist and take effect on the right buses; visible mute state on every screen | B | T0 |
| AU10 | Visibility/focus handling: audio suspends when hidden and resumes on focus without stuck notes | B | T3 |
| AU11 | TTS announcer default off; enabling it speaks only priority lines at speed <= 2x with rate limit | B | T3 |
| AU12 | Music and SFX loading never blocks first render; decoded memory under the tier ceiling (measured) | M | T1 |

## H. Humor and copy
| id | criterion | how | gate |
|---|---|---|---|
| H1 | ≥90 announcer lines across all categories (≥3 per category), three voices each used 25-45% | N | T1 |
| H2 | Repetition sim (20 simulated minutes, 10 recorded event logs): <8% repeats within 5 min, all categories hit | M | T3 |
| H3 | All units have complete text (U4); ≥40 tips; 24 achievements implemented with working tests; ≥60 epithets | N | T1 |
| H4 | Sensitivity sweep: grep list + manual review: no ethnic/religious/stereotype punchlines; recorded | R | T3 |
| H5 | 14 systemic gags each demonstrably fire in a scripted scenario (event emitted + clip + cue + announcer line) | N/B | T1 |
| H6 | Editor rubric pass logged: first-draft lines cut ≥30%; every line ≤ length limits | R/N | T3 |
| H7 | Independent COMEDY-EDITOR pass: a fresh agent scores every line 1-5 blind on the rubric, deletes the bottom 30%, flags the top 10; cuts logged in `docs/humor_edit_log.md`; H6 cites that log | R | T3 |
| H8 | Announcer lines are slotted templates (>= 120 templates with >= 3 slot kinds) with persistent callbacks from lifetime stats; repetition horizon 60 simulated minutes with a per-line frequency histogram (no line > 4% of lines) | M | T3 |

## UI. Screens and UX
| id | criterion | how | gate |
|---|---|---|---|
| UI1 | Every screen in spec/ui.md exists and is reachable; no dead buttons (click-through test visits every button, asserts a visible effect or modal) | B | T1 |
| UI2 | Screens fit 1280x720, 1920x1080, 820x1180 (tablet), 390x844 (phone) without horizontal scroll or clipped text (overflow scanner) | B | T1 |
| UI3 | Tap targets >= 44 px and text contrast >= 4.5:1 on panel/button backgrounds (scanner restricted to DOM panels; HUD over the 3D scene is judged by contact sheets) | B | T1 |
| UI4 | Keyboard-only: title, quick battle setup, placement, pause, results, settings fully operable; visible focus ring; Esc/back works | B | T1 |
| UI5 | FTUE: "Quick Fight" reaches a running battle in ≤ 2 clicks after the splash; first-run placement tutorial shows hints that can be dismissed permanently | B | T1 |
| UI6 | Battle HUD shows army meter, per-type counts, objective, timer, speed, kill feed, announcer, selection card, minimap, god powers, orders; DOM text updates ≤ 10 Hz (instrumented) | B/M | T1 |
| UI7 | Picky-player checklist works: rematch with one key (R), undo placement, pause, 0.25x slow-mo, hover stats, click-to-follow, save army preset, copy arena seed, skip intro, reset progress via modal, exit mid-battle keeps the setup | B | T1 |
| UI8 | Settings: all options apply immediately and persist; Reduce Motion, shake %, flash limiter, UI scale, colour-blind palette, subtitles, key rebinding for ≥ 8 actions | B | T1 |
| UI9 | Touch: simulated touch drag/pinch controls camera; placement by tap; Take Command joystick works | B | T1 |
| UI10 | Phone: editors show the friendly notice (no dead UI); campaign/quick/survival/codex playable | B | T1 |
| UI11 | Codex: 43 units + props + arenas pages; turntable renders each model with clip picker | B/V | T1 |
| UI12 | Title composition reviewed from a screenshot: logo legible, diorama alive (units moving), menu tablets aligned, no overlap | V | T0 |
| UI13 | HUD never covers > 25% of the viewport at 1280x720; `Tab` hides it | B | T1 |
| UI14 | Credits screen lists every author/licence from the ledger plus library licences | B | T1 |
| UI15 | Diagnostics screen reports WebGL2, tier, FPS, draw calls, audio load paths, storage, CSP violations; Copy works or falls back to select | B | T0 |
| UI16 | Results screen shows 3 generated lessons per defeat/victory from the event log (`sim/lessons.js` unit-tested on recorded logs); placement shows the Scout report with counter chips | B/N | T1 |
| UI17 | Battle choreography: pre-battle stand-off (camera establishing shot, banners, Brutus intro), finish (winners cheer, losers rout/sit, slow-mo on the last kill), results orbit; reduce-motion variants; filmstrip reviewed | V | T1 |
| UI18 | Mission 1 teaching beats run with a visible Skip; persona run reaches a deliberate counter-pick within 3 minutes | B | T1 |
| UI19 | Mutators (>= 8) apply as data-only rule multipliers, unlock by stars, show in the rules tablet; Daily Skirmish is deterministic per date and shows a copyable result string | N/B | T1 |

## E. Editors
| id | criterion | how | gate |
|---|---|---|---|
| E1 | Arena Builder: all 15 tools work (pointer-synthesised tests change data as expected); undo/redo restores exact heightmap/material/props (hash equal) over 100 random operations | B/N | T2 |
| E2 | Arena validators block/warn per spec; each "Fix" button resolves its error; Playtest returns to the editor with state intact | B | T2 |
| E3 | Symmetry modes apply to terrain/paint/props (hash symmetric) | N | T2 |
| E4 | Workshop: every part category switches the turntable model; stats point-buy enforces caps; cost shown live equals `costFormula`; abilities legality enforced | B/N | T2 |
| E5 | Voxel painter: pencil/erase/paint/fill/line/box/eyedropper/mirror/undo/redo/slice view/3D view via pointer sequences; painted data persists through save/load and appears on the battlefield model | B | T2 |
| E6 | Custom soldier fields in battle: appears in palette, spawns, fights, dies with debris from its painted palette, announcer uses its name/quotes | B | T2 |
| E7 | Hostile imports: 1,000 mutated/corrupt share codes never crash, never produce XSS (`<img onerror>` names rendered as text), clamp or reject with a human message | N | T2 |
| E8 | Share-code round trip for 1,000 random arenas/soldiers; code length ≤ 60 KB; CRC detects single-bit corruption; pure-JS fallback works without `CompressionStream` | N | T2 |
| E9 | Unlockable silly parts remain locked until the campaign reward and then appear | N/B | T2 |
| E10 | Three share channels (text code, file via `downloads.save`/file input, PNG card) parse through one validator; round-trip fuzz on all three | N | T2 |

## P. Persistence
| id | criterion | how | gate |
|---|---|---|---|
| P1 | Settings, progress, arenas, soldiers, armies persist across reload; with storage blocked the game runs and shows the "Not saving" indicator | B | T1 |
| P2 | Quota test: fill storage, saving shows the quota-exceeded modal with export/delete options and loses nothing | B | T2 |
| P3 | Schema versions + migrations tested with fixtures; tombstoned ids map to "Mystery Goat" | N | T2 |
| P4 | Settings > Data: Export all / Import all works via file and text fallback; 'Not saving' indicator appears with storage blocked (device-local-by-design decision recorded) | B | T1 |

## PF. Performance (CPU-side, as measured here; GPU frame rate is `H`)
| id | criterion | how | gate |
|---|---|---|---|
| PF1 | Frame CPU (sim ticks + anim + upload + HUD) <= 12 ms at 300 units **at 1x speed** (at 4x the budget is 4 ticks: state the measured value, `H` for real devices) | M | T1 |
| PF2 | Triangles per frame at Marble, 300 near + 200 far units: near units use full mesh, far units the 2x-downsampled LOD (<= 30% of quads); units <= 1.2 M, terrain <= 0.6 M (chunk culling + LOD) | M | T1 |
| PF3 | Boot work staged: no single JS task > 200 ms before the title other than shader compile tasks (<= 600 ms each, yielded between materials) | B | T1 |
| PF4 | Unit-cap per tier enforced in placement UI with a message; first-run benchmark chooses the tier | B | T3 |
| PF5 | Real-GPU frame rate and thermal behaviour: cannot be verified here | H | — |

## X. Accessibility and ergonomics
| id | criterion | how | gate |
|---|---|---|---|
| X1 | Reduce Motion disables springs, wobble, shake, parallax; Flash limiter caps lightning/bloom pulses; shake % scales | B | T1 |
| X2 | Menus have ARIA roles; focus trap in modals; Esc closes modals | B | T1 |
| X3 | Colour-blind palettes verified by simulation (see R14) | M | T1 |
| X4 | Subtitles for announcer on by default and toggleable | B | T1 |

## Q. Process and QA
| id | criterion | how | gate |
|---|---|---|---|
| Q1 | `npm run gate` passes (lint, check, tests, contracts, build, smoke) before every commit to the branch | N/B | all |
| Q2 | Each tier published to the same artifact URL; commit + push at every gate | R | all |
| Q3 | Independent QA agent reviews each gate diff and runs these criteria; findings tracked | R | all |
| Q4 | `docs/verification_report.md` lists each criterion with evidence (command, output, screenshot path) and an explicit "unverified" section | R | T3 |
| Q5 | Dilution audit: grep for TODO/FIXME/placeholder/lorem/mock/stub/"coming soon" (roadmap tag excepted) returns only reviewed legitimate matches | N | T3 |
| Q6 | Repo contains source, build output, tools, assets ledger, docs; README with controls and how to rebuild | R | T3 |
| Q7 | **Negative controls** (NC): QA runs and records pass-then-fail for: remove the audio gesture gate (AU2), break a share-code CRC (E8), delete a team-tint voxel from a unit (U3), widen a unit past radius 0.7 (U8), drop a cue file (AU3), shrink a nav gap (S10), reuse a unit id (S24), drop the CSP header (B3) | N/B | T3 |
| Q8 | Persona playtests at T1a, T1b and T3 (novice, picky art director, speed-runner) from screenshots + DOM + `__vw` only; findings in `docs/persona_notes.md`, each becoming a fix or a criterion | R | T1 |
| Q9 | T0 publish rehearsal: the real Artifact publish of the T0 build including >= 100 asset files in batches, confirming relative-fetch of published files in the hosted page via the in-game Diagnostics (owner-visible) before the audio pipeline is finalised | R | T0 |

## S-criteria (surpass the conventional version of this game)
| id | baseline (K1) | gold |
|---|---|---|
| SG1 | Procedural sine-wave animation | Retargeted real CC0 mocap + authored overshoot/anticipation clips, crossfaded, hit-frame synced, filmstrip-reviewed |
| SG2 | Colour swaps as "custom soldiers" | Full parts + stats + abilities + 3D/slice voxel painter, rig-safe, cost-clamped, fuzzed |
| SG3 | Static scenery | Staged destructible props, craters that rebuild terrain and nav, collapsing Troy walls |
| SG4 | Text jokes | 14 systemic gags + 3-voice announcer with callbacks + bubbles + achievements |
| SG5 | Looping music | Per-theme track choice, intensity filtering, ducking, stingers, loudness-verified mix |
| SG6 | "It works on my machine" | Diagnostics screen, fatal-error path, CDN fallback chain, hybrid audio embed, fuzzed importers |
| SG7 | Eyeball balance | Headless balance harness: duels, counters, cost-efficiency matrix, fuzzer, termination fuzz |
| SG8 | One AI that rushes | Layered AI with slots, formations, flank, kiting, difficulty by behaviour, stalemate comedy interventions |
