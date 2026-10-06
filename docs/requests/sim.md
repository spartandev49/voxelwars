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
