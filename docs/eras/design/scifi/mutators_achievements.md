# Sci-Fi mutators and achievements (binding)

Owner: DESIGN-ERA-SCI-FI part 2. Consumers: SIM (`sim/mutators.js` rows), UI (`_mutpicker`, achievements screen, CU16 matrix), `save/stats.js` (new lifetime keys, whitelist), COMEDY-SF (copy), BALANCE (mutator-off controls). Campaign missions force `mutators: []` (`applyModeRules`), so neither mutator touches a mission or a star test; they live in Quick Battle, Survival and Daily. Puzzles allow no mutators (Ancient rule: "no mutators, free retries").

## 1. Two era mutators (shared nine + these two)

The shared nine (`big_heads tiny_titans moon_gravity chicken_rain wine_rain_always friendly_fire_fiesta speedy_soldiers ragdoll_frenzy glass_cannons`) unlock by TOTAL stars across all eras (thresholds 3..27, never raised). On Sci-Fi strings `moon_gravity` is shown as "Low Gravity Fiesta" (a label swap through `getTB`, id unchanged) because the era's Moon is already low-gravity. The two below unlock by mission reward (CU11 ledger rows M3 and M9). Text shape follows `mutators_text.js`: `{id, name, desc, short (<= 6 words), locked}` plus the new `joke` and `mods`. `feel_sheet.md` s12 decided the pair; A's `sf_static_cling` and B's `sf_blackout` stay in reserve (section 4).

### 1.1 `sf_overcharge`, "Overcharge"

| field | value |
|---|---|
| unlock | mission reward of `sf_overclock_oops` (M3, reward id `sf_r3_overcharge`) |
| name | Overcharge |
| desc | Every bubble is bigger and regrows faster, and every break goes off with a bang that rattles everybody nearby. Bubbles last longer. The bangs last louder. |
| short | Big bubbles, loud breaks |
| joke | "Bubbles huge, breaks loud. Please stand at least one bubble away." |
| locked | "Locked. Clear Overclock Oops and your bubbles will outgrow your ego." |
| mods (design keys; SIM maps them to the mutator table) | `shieldCapMul: 1.6`, `shieldDelayMul: 0.6` (the recharge delay and the break window `recover` both scaled), `breakShock {r:3, dmg:20, type:'energy', stagger:0.4, friendly:true, chainPerTick:1, fork:'era:overcharge'}`: every `shield_break` emits a shock ring that damages and staggers everyone within 3 u, friend or foe, and may pop one more bubble per tick (never a chain storm: the cap is one chained break per tick, 20 damage cannot kill a fresh unit); applies to every `eshield` def (12 of 34) and to boss bubbles (the Concierge, the Manta); defs without a bubble are untouched; `announcerFlag: 'overcharge'` |
| mutator x mechanic matrix | DISABLED with reason together with `sf_warranty_void` ("The warranty and the overcharge disagree about bubbles"); allowed with every shared mutator; with `moon_gravity` the shock stagger becomes a knock-up (visible and funny, allowed); allowed in Survival, Daily and Quick; EMP interaction: an EMP pulse zeroes a bubble and forces SHIELDDOWN but does NOT emit the shock (only damage-caused breaks do) |
| design check (ER7 control) | mutator-off vs on: median battle length within +-15 percent of baseline on the Sci-Fi ring rows (bigger bubbles, faster regeneration and the shock roughly cancel); `shield_break` events per 100 s rise by at least 25 percent; the shock never kills a full-health unit; the ring rows "Wardens + Tenders vs Rivet Gunners" and "Dustpans vs Salvo Carts across lava" keep their direction; the mirror stays inside 45-55 percent |
| announcer hook | category `mutator_sf_overcharge` x3: [B] "OVERCHARGE! The bubbles are bigger! The breaks are louder! Please clap, then duck!" [P] "A larger bubble breaks with a larger bang. Is that progress, or merely volume?" [C] "Every break now hits the neighbours. I said keep a gap. I said it about bubbles." |

### 1.2 `sf_warranty_void`, "Warranty Void"

| field | value |
|---|---|
| unlock | mission reward of `sf_queen_size` (M9, reward id `sf_r9_warranty_void`) |
| name | Warranty Void |
| desc | Bubbles never regrow, for anyone. Everything hits ten percent harder. The sticker says it was your idea. Healers and repair still work; only the bubbles have gone. |
| short | No bubble regrowth, hits +10% |
| joke | "Sticker removed. Warranty void. Please do not read the other stickers." |
| locked | "Locked. Win Queen Size Bed. The sticker is on the underside of the finale." |
| mods | `shieldRegenMul: 0` for every unit of both teams (a bubble is a one-shot buffer; `delay` and `recover` irrelevant; the `recharge` aura of the Tender and the Tech's delay halving do nothing and their tooltips say so), `dmgMul: 1.10` on all damage dealt, `announcerFlag: 'void'`; hit points, healers, repair and the Nano Spritz bubble refill still work (the god power `sf_nano_spritz` refills a bubble even under the mutator: the one way back, which is its joke) |
| mutator x mechanic matrix | DISABLED with reason together with `sf_overcharge`; allowed with every shared mutator including `glass_cannons` (they stack: very short battles); the Tender's `recharge` aura shows a struck-through ring while the mutator is on; allowed in Survival (bubble bosses become plain hit-point bags with a one-time buffer: the watchdog is progress-based and unaffected) |
| design check | mutator-off vs on: median battle length SHORTER by 10 to 30 percent (the stall risk of regeneration is removed, which is why this mutator is also the reserve control for ER7's "regeneration never pushes a mirror past 120 s"); shielded-army win rates move toward the unshielded ones; the ring rows keep their direction except rows 1 and 2 (Tender line vs chip), which are expected to flip toward chip and are listed as "mutator-sensitive" |
| announcer hook | category `mutator_sf_warranty_void` x3: [B] "WARRANTY VOID! The bubbles do not come back! This is a one-time offer on a one-time bubble!" [P] "A bubble that never returns is simply a coat. Is it still a shield?" [C] "Sticker removed. Everything is now permanent. I said do not remove the sticker." |

### 1.3 Reserve (not shipped)

`sf_static_cling` from proposal A (every 10 s, 6 percent of all units, either side, drop their bubble and stand stunned for 1 s) and `sf_blackout` from proposal B (night, detection radius x0.5, cloak duration x2, EMP radius +50 percent, every tell stays visible) stay as possible patches. `sf_static_cling` overlaps the shock ring of Overcharge and punishes the player without a tell; `sf_blackout` is the mission-4 blackout turned into a mutator and would need a new weather row that hides no tell (the rule: no mutator may hide a tell).

## 2. New lifetime stat keys and BattleSummary fields

`normalizeStats` drops unknown keys on every load, so these MUST be added to `NUM_KEYS` (and to the Doc/`transfer.js` whitelist) or the achievements below silently never unlock. All are non-negative counters. The `sf` prefix keeps them era-scoped. Sources are the same `MissionTracker` counters as `usedMechanic` and the star helpers (`missions_outline.md` s0.2), now also produced in plain battles. The existing `godPowers` map (`godPowers.sf_orbital_clean`, ...) already counts casts, and `arenasPlayed` already records the arenas (its keys must be valid arena ids: REGISTRY adds the twelve `sf_*` ids to `ARENA_IDS`).

| stat key (lifetime, `stats.`) | summary field (per battle, `ev.`) | counts | source event |
|---|---|---|---|
| `sfShieldBreaks` | `ev.shieldBreaksDealt` | enemy bubbles broken by the player's side | `shield_break` with the victim on the other team |
| `sfOwnBreaks` | `ev.ownBreaks` | the player's own bubbles broken (feeds `ownBreaksAtMost`) | `shield_break` on the player's team |
| (per battle only) | `ev.empMachinesMax` | the largest number of enemy machines hit by one player-owned pulse | `emp_pulse` followed by `emp_hit` events grouped by pulse |
| `sfEmpHits` | `ev.empHits` | distinct enemy machines stunned | `emp_hit` |
| `sfCloakKills` | `ev.cloakKills` | kills made by a unit that was cloaked when its attack began (feeds `usedMechanic('cloak')`) | `unit_cloak` why `attack` followed by `unit_kill` within 1.2 s by the same attacker |
| `sfHoverLiquidKills` | `ev.hoverLiquidKills` | kills by hover-layer units while standing over deep water, lava, goo or a rift | `unit_kill` with the attacker's layer and cell |
| `sfBlinks` | `ev.blinks` | player blinks cast | `unit_blink` |
| `sfStrikeKills` | `ev.strikeKills`, `ev.strikeKillsMax` | kills by `call_strike` and the orbital god power; the largest number from one strike | `strike_call` + `unit_kill` cause `strike` within 0.6 s of the explosion |
| `sfStunnedBossKills` | `ev.stunnedBossKills` | boss kills made while the boss was inside its EMP duration | `unit_kill` of a boss def within the EMP window of its last `emp_hit` |
| `sfHealedHp` | `ev.healedHp` | hit points healed or repaired on the player's side (Medic, Tech, Shepherd, Nano Spritz, the Hummock aura) | `unit_heal` sum |
| `sfAirKills` | `ev.airKills` | air-layer units killed by the player's side | `unit_kill` with target layer `air` |
| (per battle only) | `ev.lastSurvivorDef`, `ev.survivorCount`, `ev.survivorsAllMachine` | the def id of the last unit alive on the player's side, how many survive, whether all are `machine` | end-of-battle summary |

## 3. Twelve achievements

Three are generated per era by the shared helper (`ancient_history`, `overachiever`, `tourist` semantics); eight are designed; one is hidden. Ids carry `sf_`; icons are existing icon-set words or new simple glyphs (UI picks). `desc` is funny and states the condition; the hidden one is "???" until unlocked. Tests are written against the lifetime object `stats` (already updated with the battle) and the per-battle summary `ev`, like `humor/achievements.js`.

| # | id | name | desc (shown) | icon | test |
|---|---|---|---|---|---|
| 1 | `sf_history` | The Future Is Now (Sort Of) | Finish the Sci-Fi campaign. A Moon, a Concierge and a Queen, in that order of paperwork. | clapperboard | `stats.campaign.completedEras` includes `'scifi'` (generated: all nine `sf_*` missions have >= 1 star) |
| 2 | `sf_overachiever` | Overachiever, But In Space | Earn all 27 stars in the Sci-Fi campaign. The bubble is full. The star chart is not. | star-chart | `totalCampaignStars(sfMissions) === 27` |
| 3 | `sf_tourist` | Galaxy Tourist | Fight on all 12 Sci-Fi arenas. The Moon was the cheap seats. | map | `Object.keys(stats.arenasPlayed)` contains every `sf_*` arena id (12) |
| 4 | `sf_bubble_wrap` | Bubble Wrap | Pop 200 enemy bubbles, lifetime. It is not therapy. It is, a little. | bubble | `stats.sfShieldBreaks >= 200` |
| 5 | `sf_turn_it_off` | Have You Tried Turning It Off? | Switch off 12 or more enemy machines with one EMP pulse. They stopped mid-bow. | power | `ev.empMachinesMax >= 12` |
| 6 | `sf_peekaboo` | Peekaboo | Make 10 kills from cloak in one battle. Nobody saw it. That was the point. | eye-closed | `ev.cloakKills >= 10` |
| 7 | `sf_hover_derby` | Hover Derby | Get 10 kills with hover units standing over lava, water, goo or a rift in one battle. The floor stayed lava. | hover | `ev.hoverLiquidKills >= 10` |
| 8 | `sf_hop_along` | Hop Along | Blink 40 times in one battle. The distance was consulted, once. | arrow-hop | `ev.blinks >= 40` |
| 9 | `sf_deep_clean` | Deep Clean | Kill 12 or more units with a single orbital strike. The crater is also spotless. | beam | `ev.strikeKillsMax >= 12` |
| 10 | `sf_timber` | Timber (Metallic) | Topple a boss while it is stunned by EMP. It was on hold. It stayed on hold. | tree-fall | `ev.stunnedBossKills >= 1` |
| 11 | `sf_space_goat` | Space Goat Syndrome | Win a battle whose last survivor is a Glow Grazer. It is not a goat. It wins like one. | lamp | `ev.won && ev.lastSurvivorDef === 'glow_grazer'` |
| 12 | HIDDEN `sf_soul_search` | Does It Have A Soul? | `???` (unlocked text: "Win a battle with at least five survivors, all machines. Plato has opened a debate. Nobody has closed it.") | gear | `ev.won && ev.survivorCount >= 5 && ev.survivorsAllMachine === true` |

Notes: (1) `sf_history` fires from the same campaign event as `ancient_history` (CU9) and must not fire for Ancient, Medieval or Modern. (2) Achievement ids are immutable once shipped. (3) The achievements screen groups by era with filter tabs (CU9); `sf_soul_search` shows as a locked card with a question mark; it is invisible to the Codex and the Stats screen until unlocked. (4) **Mechanic coverage:** bubbles #4, EMP #5, cloak #6, hover #7, blink #8, orbital strike #9, mech topple #10, the era mascot #11, the hidden one #12, tourist #3, campaign #1, 27 stars #2: every headline mechanic of the era has an achievement. (5) Reserve (not shipped): B's `sf_untouchable` (win a battle of >= 20 units with zero own bubble breaks; a nice trophy but it rewards turtling), `sf_air_traffic` (10 air kills in one battle) and `sf_pest_control` (destroy 10 hive spires or eggs); kept for a patch. (6) `sf_tourist` requires all 12 arenas, including the Quick-only `sf_iceworld`; puzzles, Survival, Daily and the Arena Builder count as playing (the existing `arenasPlayed` rule).

## 4. Mutator and achievement checks for the gate

1. Every achievement id above exists in the achievements screen test and in `NUM_KEYS` where it reads a lifetime key (only `sf_bubble_wrap` and the generated three do; the per-battle fields `empMachinesMax`, `cloakKills`, `hoverLiquidKills`, `blinks`, `strikeKillsMax`, `stunnedBossKills`, `lastSurvivorDef`, `survivorCount` and `survivorsAllMachine` are added to the `BattleSummary` contract).
2. The two mutator ids resolve in `_mutpicker`, in the CU16 matrix and in `transfer.js` enums; a share code carrying either validates only when the reward is earned or the code is imported with the mutator unlocked (the Ancient rule); the pair is mutually exclusive in a share code.
3. The hidden achievement is invisible to the Codex and to the Stats screen until unlocked.
4. `sf_overcharge` and `sf_warranty_void` never appear in `campaignApi.rules` (mutators forced `[]`).
5. Tests: `tests/sim/mutators_scifi.test.mjs` runs each mutator against a constructed battle (a Warden line with a Tender versus 17 Rivet Gunners): Overcharge shows `shield_break` shocks with the one-chain-per-tick cap and no kill of a full-health unit; Warranty Void shows zero regeneration events for both teams and a +10 percent damage factor; the mutually exclusive pair is rejected by `sanitizeMutators`.
