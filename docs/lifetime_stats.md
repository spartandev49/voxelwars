# lifetime_stats.md: the lifetime-stats shape and the BattleSummary (contract between `src/save/stats.js`, HUMOR achievements and the announcer)

Owner of this document: HUMOR. Owner of `src/save/stats.js`: COORD. COORD accumulates the stats below from the sim event stream (spec 8.2) plus the UI events `arena_saved`, `soldier_saved`, `arena_played`, and persists them under `vw.stats` as `{ v: 1, ...keys }`. A missing key means 0. All values are non-negative numbers unless stated.

## 1. Dispatch order (important)
On `battle_end` the app must run, in this order:
1. `save/stats` accumulates the battle (so lifetime totals already include it);
2. `checkAchievements(stats, ev, unlocked)` from `humor/achievements.js` with `ev = BattleSummary` (section 3);
3. the announcer receives `battle_end` (its callbacks, e.g. "chicken defeat number 3", read the already-updated stats).
`createAnnouncer({ stats })` keeps a reference to the live stats object; call `ann.setStats(obj)` if the object is ever replaced.

## 2. LifetimeStats keys
"Player team" is the team the human controls (`playerTeam`). In spectator or mirror setups use team 0.

| key | meaning | accumulated from |
|---|---|---|
| `battles`, `wins`, `losses`, `draws` | battles finished, by result for the player team | `battle_end` (`winner`) |
| `playSeconds` | sum of `battle_end.t` | `battle_end` |
| `kills` | enemies killed by the player team (friendly kills excluded) | `unit_kill` with `srcTeam == playerTeam`, `friendly == false` |
| `unitsLost` | player-team units that died | `unit_kill` with `dstTeam == playerTeam` |
| `friendlyKills` | allies killed by the player team | `unit_kill` with `friendly == true`, `srcTeam == playerTeam` |
| `byCause` | object `{cause: n}` of player-team kills per cause | `unit_kill.cause` |
| `kicks` | kicks landed by the player team | `ability_cast` with `ability == 'kick'` |
| `chickenKills` | kills by player-team `sacred_chicken` units | `unit_kill.srcDef == 'sacred_chicken'` |
| `chickenDefeats` | lost battles in which the winning side still had at least one `sacred_chicken` alive | `battle_end.perDef` |
| `chickenTantrums` | chicken tantrums seen | `chicken_tantrum` |
| `goatKills` | kills by player-team `battle_goat` units | `unit_kill.srcDef == 'battle_goat'` |
| `monologues` | philosopher monologues | `philosopher_monologue` |
| `sleeps`, `bribes` | senator sleep statuses applied, units converted | `status_apply` (`sleep`), `unit_convert` |
| `trojanReveals` | Trojan horse reveals | `trojan_reveal` |
| `cyclopsMisses` | boulders a Cyclops threw off target | `cyclops_misaim` |
| `catapultMisfires` | crew members launched | `catapult_misfire` |
| `immortalsRevived` | Immortal revivals | `unit_revive` |
| `immortalsKilledAfterRevive` | Immortals killed after they had revived | `unit_kill.revived == true` |
| `thronesSat` | Xerxes thrones | `throne_sit` |
| `zeusInterventions` | Zeus lightning interventions | `intervention.kind == 'zeus'` |
| `zeusRagequits` | battles that ended in a draw by Zeus leaving | `battle_end` with `winner == -1` and `reason == 'intervention'` |
| `godPowers` | object `{kind: n}` | `god_power` |
| `stoned` | soldiers turned to stone | `stone_gaze.count` |
| `trampleKills` | kills by trampling (any trampler) | `unit_kill.cause == 'trample'` |
| `heroKills`, `heroLosses` | enemy heroes killed, own heroes lost | `hero_down` (`team`) |
| `maxStreak` | best `kill_streak.count` by a player-team unit | `kill_streak` |
| `takeCommandKills` | kills made while possessing a unit | `unit_kill.byPlayer == true` |
| `arenasSaved`, `soldiersSaved` | UI saves | `arena_saved`, `soldier_saved` |
| `arenasPlayed` | object `{arenaId: n}` of battles fought per arena preset | `arena_played` / battle setup |
| `campaign` | `{ stars: { missionId: 0..3 }, completed: boolean }` | campaign progress |
| `byDef` | object `{defId: {spawned, kills, deaths}}` | `unit_spawn`, `unit_kill` |

Arena ids for Tourist Trap: `marathon thermopylae colosseum nile giza persepolis carthage teutoburg alpine olympus troy styx cyclops oasis` (the 14 presets; `arenalab` and `random` do not count).
Mission ids: `marathon_sort_of thermopylae_snack pyramid_scheme nile_crossing alps_elephant teutoburg_peekaboo troy_giftshop cyclops_meet zeus_bad_day`.

## 3. BattleSummary (`ev` with `kind: 'battle_end'`)
Built by COORD at `battle_end` from the same event stream; passed to achievement tests and used for the results screen funny stats.

```js
{ kind: 'battle_end',
  win: boolean,               // player team won
  draw: boolean,
  reason: 'elimination'|'time'|'objective'|'rout'|'intervention',
  t: number,                  // battle seconds
  playerTeam: 0|1, arenaId: string, mission: string|null,
  objective: string|null,     // objective type: 'eliminate'|'kill_general'|'hold_hill'|'protect_vip'|'survive_waves'|'destroy'
  vipDef: string|null, vipDamage: number,       // damage the VIP took (0 = untouched)
  unitsStart: number, unitsLost: number, unitsAlive: number,
  aliveDefs: { defId: n },    // player-team units alive at the end, by def
  playerCostStart: number, enemyCostStart: number,
  kills: number, friendlyKills: number,
  killsByDef: { defId: n }, killsByCause: { cause: n },     // player team
  elephantTrampleKills: number, stonedUnits: number, cyclopsMisses: number, kicks: number,
  maxMeteorKills: number,     // most kills attributed to a single meteor cast
  trojanRevealed: boolean, wineRain: boolean,   // wineRain: wine rain (power or mutator) was active during the battle
  takeCommandKills: number }
```
Other `ev` kinds the achievement checker may receive: `{ kind: 'arena_saved' }`, `{ kind: 'soldier_saved' }`, `{ kind: 'arena_played', arenaId }`, `{ kind: 'campaign' }`. Tests that depend on one battle return false for any other kind, so a plain re-check can never grant them by accident.

## 4. Announcer integration (ctx and events)
`createAnnouncer({ rng, stats })` returns `{ onEvent(type, payload, ctx), tick(dt), nextLine(), reset(), setStats(s), setSpeed(x), debug() }`.
- Feed it the whole sim event stream (it ignores unknown and high-frequency events cheaply). Payloads are read immediately and never retained.
- `ctx` is optional and may be the same object every call: `{ speed, arena: id | {id,name}, factions: [nameA, nameB], teamNames: [a, b], playerTeam, mission: id | null, unitName(defId, plural), nameOf(unitId) }`. `nameOf` returns a soldier's personal name (custom soldiers, `names.js`) used by the `{killer}` slot.
- `tick(dt)` takes REAL seconds (not sim seconds). The caller loops: `ann.tick(dt); let l; while ((l = ann.nextLine())) show(l);` Each line is `{ id, cat, sub, who, text, pri, at, dur, head, chain: {key,i,n}|null }`; `dur` is a suggested display time; a chain's later beats arrive 1.1 s apart, so stack them as one exchange.
- Payload assumptions: `big_swing.team` is the side that gained and `ratio` is that team's power over the other (< 1 means a swing against it); `lead_change.team` is the new leader; `battle_end.perDef` is `{team: {defId: alive}}`.
