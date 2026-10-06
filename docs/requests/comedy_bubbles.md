# requests/comedy_bubbles.md: 129 death quotes, 86 taunts and every class bark never reach the screen (COMEDY-EDITOR -> SIM, with one note for RENDER)

## What is wrong (verified in the real build and by grep)
The only thing that makes a speech bubble in the live game is a sim `bark` event, and the sim only emits one from `world.bark(u, key)` for **13 ability moments** (`rage horn cluck tantrum throne_retreat monologue filibuster bribe revive kick misfire taunt(dash) elephant_panic`). Everything else HUMOR wrote for bubbles is dead:

- `UNIT_TEXT[id].deaths` (129 last words) is only used for the MVP quote on the results screen (`meta.js decorateResults` -> `pickDeath`).
- `UNIT_TEXT[id].taunts` (86 lines) is used nowhere (`pickTaunt` has no caller).
- `humor/barks.js`: the class barks (`BARKS[role][engage|hurt|rout|cheer]`, 36 lists) and `STATUS_BARKS` (confuse, sleep, tipsy, stone, bribed, panic, burn) have no importer except a test; spec/humor.md section 4 promises last words "shown as bubbles at low frequency".
- Custom soldiers carry `text.deaths`, `text.engage` and `text.taunts` (`content/era_ancient/custom.js:111`) that nothing ever reads.

HUMOR has done everything on the content side: `content/era_ancient/sim_text.js` now exports one flat table `SIM_BARKS` that already contains every key below, and `units_text.js` gives the 14 units with a unique voice their own answer to the 13 existing moments (Spartan "If.", Immortal "Plot twist.", goat "BAAAH! (Not a threat. A review.)", ...). These already work in the build (the Immortal's "I did say once." appears when it revives). What is missing is the sim calling `bark()` for the moments below.

## The change in `src/sim/world.js`
1. `bark(u, key)` lookup chain (the table is built in `sim_text.js`):
```js
const t = u.def.text;
const lines = (t && t[key]) || SIM_BARKS[key + ':' + u.def.role] || SIM_BARKS[key];
```
   Per-unit text first (`UNIT_TEXT.deaths`, `.taunts`, `.engage`, ... or a custom soldier's own), then the class list (`SIM_BARKS['rout:cavalry']`), then the generic list. Keep the existing rate limits (global 1.2 s, per unit 6 s, heroes and monsters bypass the global one).
2. New call sites (all deterministic: **do not draw from `this.rng`**, use `(this.tickN * 31 + u.id) % 100 < N` so replays and balance data do not change):
   - **last words**: in `killUnit` (combat.js, just before `w.emit('unit_kill', p)`), `if (u.def.role === 'hero' || u.def.role === 'monster' || (w.tickN * 31 + u.id) % 100 < 6) w.bark(u, 'deaths');` Heroes and monsters always speak, the rest about one in seventeen, which with the 1.2 s global limit is one or two quotes in a typical skirmish.
   - **engage**: the first time a unit damages an enemy (`applyDamage`, `src` has no `barkedEngage` flag): `% 100 < 5` -> `w.bark(src, 'engage')`, then set the flag.
   - **hurt**: when a unit first drops below 30% hp (`moraleLowHp`): `% 100 < 12` -> `w.bark(u, 'hurt')`.
   - **rout**: where `unit_rout` is emitted (world.js ~748): `% 100 < 25` -> `w.bark(u, 'rout')`.
   - **cheer**: in `end(winner)`, for winning units set to CHEER: every 9th id -> `w.bark(u, 'cheer')` (at most about four voices).
   - **status**: where `status_apply` is emitted for `confuse sleep tipsy stone panic burn`: `w.bark(u, 'status:' + status)` (the per-unit 6 s limit already stops spam; `SIM_BARKS['status:sleep']` is "Zzz... the aqueduct bill...").
   - **taunts** (optional, the line is for the first meeting): `w.bark(u, 'taunts')` once per unit when it first acquires a target within 6 u, `% 100 < 4`.
3. `SIM_BARKS` keys now available: the 13 moment keys, `deaths`, `taunts`, `engage:<role> hurt:<role> rout:<role> cheer:<role>` for the 9 roles, and `status:<name>` for the 7 statuses.

## Note for RENDER (`src/render/labels.js`)
`WorldLabels.snapshot()` drops a bubble when `u.dead` is truthy, but `Unit` has no `dead` property (it has `alive`), and `unit_corpse_done` removes the unit from `byId` after `deathLinger` (>= 1.6 s). So a last-words bubble would be shown for about 1.6 s and then vanish with its owner. Please keep a bubble alive after its unit is gone: store the last screen position when the owner disappears and let the bubble finish its own `until`. Last words are the funniest line the game has; they need their full 3 seconds.

## Why it matters
Every battle currently has a silent army. With the changes above the same battle shows a handful of bubbles ("Who is covering my right? Nikias? NIKIAS!", "Tell Gaius he was a good projectile.", "Hic! Which army am I?") at a rate the existing limiter keeps tasteful, from lines that were written, tested (<= 12 words) and swept for tone already.
