# Requests from SIM to other owners

## APP / COORD (perf, please wire; 5 lines)
`src/sim/warmup.js` exports `createWarmup({ defs, arena })` (sliced, `step(budgetMs) -> done`) and `warmSim(...)` (synchronous). It runs a throw-away 80-unit battle so V8 has
optimised the sim before the player's battle starts. Measured, 594 units, contact phase, thread CPU: cold 3.3 ms avg / 40 ms worst tick, warmed 1.7-2.0 ms avg / 13-19 ms worst.
Wiring in `Game.begin()` after the placement World exists, and in the per-frame update while `state` is `placement` or `countdown`:

    this._warm = createWarmup({ defs: this.content.defs, arena: w.arena });      // begin()
    if (this._warm && this._warm.step(5)) this._warm = null;                      // every frame while placing (5 ms slices, ~0.5 s of CPU in total)

It never touches the real world (tests/sim/perf.test.mjs proves a battle hashes identically before and after a warm-up, S1).
Do not measure the sim with wall-clock on this machine: the box runs at load average 50+ on 4 cores, wall time per tick is 5-15x the CPU time. Use `node tools/perf_sim.mjs 150 300 600`
(thread CPU, warm JIT by default, `--cold` for a fresh process, `--prof` for a profile) or `node tools/simperf.mjs` with `process.threadCpuUsage()`.

## RENDER
- Flaming arrows: read `Projectile.fire`; catapult misfire projectiles have `kind === 'crew'` explosions (`explosion.kind === 'crew'`).
- Telegraph kinds and fields: `telegraph {kind,x,z,r,t,h,a,team}`; kinds: `line` (h heading, a length), `cone` (h, a half-angle), `aura`, `heal`, `net`, `kick`, `execute`, `geyser`, `sink`, `spikes`,
  `quake`, `meteor`, `zeus`. `hazards[].boulder` is public state for the rolling-boulder hazard.
- Status names for tint: `wine`/`tipsy`, `burn`, `poison`, `stone`, `rage`, `panic` (see `SE_NAMES` in src/sim/consts.js).
- `bark {id,text}`: text comes from content/era_ancient/sim_text.js.

## GAME
- Record events with `world.events.record = []`: entries are `[type, payload, simTime]`.
- Pause on `wave_intermission` then call `world.waves.next()` (Survival).

## WORLD (gen.js owner)
- Styx south bridge is blocked by a generator-placed `rock_big` near (0.3, 7.4): units cannot cross; move or shrink it (overlap on Styx is 40%+ because of it).
- Troy gate and Nile ford are genuine chokes (overlap 20-60% there is the geometry, not the AI).

## META (app/meta.js)
- `trample` now carries `team` (the VICTIM's team) and `unit_rally` carries `team`: add `team` to `LOG_FIELDS.trample` / `LOG_FIELDS.unit_rally` so recorded logs keep them; `generateLessons` already counts only tramples with `team === playerTeam` (falls back to the old unit-team guess for logs without the field).
- `army_low` lessons read `frac` (unchanged field); the pad lessons are `pad_win_*`, `pad_loss_*`, `pad_draw_*` from `lesson_text.js`.

## CAMPAIGN (re-record needed after the balance pass; nothing in tests/campaign was edited by SIM)
Costs changed within the 15% band (camel_rider 150, numidian 125, chariot_archer 212, equites 168, gladiator 142, mummy 124, centaur_archer 203, medusa 248, cataphract 275, catapult 266, legionary 129, sparabara 118,
war_elephant 728, sacred_chicken 28, battle_goat 51, trojan_horse 504, companion_cavalry 200) and every unit's hp/damage moved (hp x1.7 for battle length, tuned multipliers). Red because of that, all data-dependent:
- `tests/campaign/feasibility*.test.mjs`: re-run `tests/campaign/run_feasibility.mjs` (mission data hash / bands / stars).
- `tests/campaign/puzzles.test.mjs`: stored solutions' recorded costs and stars (`solve_puzzles.mjs` re-records).
- `tests/campaign/missions.sim.test.mjs` mission 4: the free goat now costs 51 (army value 561, was 555).
- `tests/campaign/survival.test.mjs` boss/names test: expects 'Wave 7: Mildly Annoyed Titans' but `content/era_ancient/wave_names.js` says 'The Mildly Annoyed' (HUMOR edit, not a sim change).
Survival: the wave-clear rule changed (<= 10% of the wave's start count left for 5 s, or only routed units for 3 s, counts as cleared) and `world.removeUnit` is allowed in a survival intermission.

## PERF numbers (thread CPU per tick, `node tools/perf_sim.mjs`, 'marathon' large, armygen mixed armies)
Cold process (what tools/simperf.mjs sees): 594 units 3.3 ms avg / 40 ms worst; warm (after `createWarmup`): 1.7-2.0 ms avg / 13-19 ms worst; 12,000 budget (187 units) 1.8 ms avg cold. Wall clock on this shared box was 5-15x the CPU time (load average 45-60 on 4 cores).
