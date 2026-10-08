# Medieval mutators and achievements (binding)

Owner: DESIGN-ERA-MEDIEVAL part 2. Consumers: SIM (`sim/mutators.js` rows), UI (`_mutpicker`, achievements screen, CU16 matrix), `save/stats.js` (new lifetime keys, whitelist), COMEDY-MED (copy), BALANCE (mutator-off controls).

## 1. Two era mutators (shared nine + these two)

The shared nine (`big_heads tiny_titans moon_gravity chicken_rain wine_rain_always friendly_fire_fiesta speedy_soldiers ragdoll_frenzy glass_cannons`) unlock by TOTAL stars across all eras (thresholds 3..27, never raised). The two below unlock by mission reward (the CU11 ledger rows M1 and M6). Text shape follows `mutators_text.js`: `{id, name, desc, short (<= 6 words), locked}` plus the new `joke` and `mods`.

### 1.1 `med_foam_swords`, "Pageant Rules"

| field | value |
|---|---|
| unlock | mission reward of `med_dress_rehearsal` (M1) |
| name | Pageant Rules |
| desc | Every weapon is foam. Hits do less damage and knock soldiers about; the fallen are "knocked out" and sit up laughing. Battles last longer and cavalry bounce. |
| short | Foam weapons, big bonks |
| joke | "The swords were swapped at the interval. For once, in the right direction." |
| locked | "Locked. Win the Dress Rehearsal. The foam is on order." |
| mods (design keys; SIM maps them to the mutator table) | `weaponDmgMul: 0.6` (melee and projectile weapon damage); `kbMul: 2.0` (stacks with `moon_gravity` up to a cap of 4); `critMul: 0` (no critical hits); `deathStyle: 'knocked_out'` (render and fx only: the fallen sit up, wave, fade; they still count as dead for rules, scores and morale); `hitCue: 'med_foam_bonk'`; fire, poison, hazards and god powers are NOT scaled |
| mutator x mechanic matrix | DISABLED with reason together with `glass_cannons`: "Foam cannot be a glass cannon. The committee is confused." Allowed with everything else. With `ragdoll_frenzy` the bonk is louder |
| design check (ER7 control) | mutator-off vs on: median battle length rises by at least 40 percent; win rates of the ring rows stay inside their direction (brace still beats cavalry) |
| announcer hook | category `mutator_med_foam_swords` x3: [B] "FOAM SWORDS! The bonk is OFFICIAL!" [P] "If nothing can hurt anyone, is it still a battle, or only a very energetic argument?" [C] "The foam was the only thing that arrived on time." |

### 1.2 `med_plague_season`, "Plague Season"

| field | value |
|---|---|
| unlock | mission reward of `med_bell_tolls_lunch` (M6) |
| name | Plague Season |
| desc | Healing is halved and a mint-green cloud drifts across the field every so often. Everyone inside sneezes, slows down and politely sits out the next minute. |
| short | Half healing, drifting sneezes |
| joke | "Cassandra has asked to be credited." |
| locked | "Locked. Hold the abbey until lunch. Cassandra is already packing." |
| mods | `healMul: 0.5` (heal pulses, soup cart, abbess, physician); `cloud: {first: 25 s, every: 40 s, dur: 10 s, r: 5, drift: true, slow: 0.3, dps: 2, noheal: true, team: 'neutral', placement: 'seeded point on the centre line'}` (a gas `dot_cloud`; it uses its own RNG fork `fork('era:plague_cloud')` so battles stay deterministic); `bubble: 'cough'` for units inside (barks `sneeze`, `excuse_me`); deaths from it use the `poison` kill verbs ("sat down in the green") |
| mutator x mechanic matrix | DISABLED with reason together with `wine_rain_always`: "Both of these are about what goes in the cup. The abbey declines to choose." Interacts with the physician and soup cart (healing halved: the lesson line says so) and with fire (gas doubles on fire, both sides) |
| design check | mutator-off vs on: Bellfount army win rate drops by 5 to 12 points; total cloud damage per battle stays under 4 percent of total damage; no unit dies only to the cloud in a fresh-army battle (dps 2 over 10 s) |
| announcer hook | category `mutator_med_plague_season` x3: [C] "I predicted this. It arrives every forty seconds now. I take a small pleasure in the schedule." [B] "A CLOUD! Everyone say excuse me!" [P] "The sneeze is the most honest thing on this field. Is it also the most contagious?" |

### 1.3 Reserve (not shipped)

`med_pennant_parade` (every melee soldier carries a tiny banner: aura r3, +4 percent damage, loss x0.85, strongest aura wins) and `med_mud_season` (ground speed x0.85, charge bonus x0.5, fire on props x0.4) from proposal B. They overlap the signature mechanic and the slot-3 god power and would complicate the matrix; kept as a possible patch.

## 2. New lifetime stat keys and BattleSummary fields

`normalizeStats` drops unknown keys on every load, so these MUST be added to `NUM_KEYS` (and to the Doc/`transfer.js` whitelist) or the achievements below silently never unlock. All are non-negative counters. The `med` prefix keeps them era-scoped. Sources are sim events already planned in `spec/M`.

| stat key (lifetime, `stats.`) | summary field (per battle, `ev.`) | counts | source event |
|---|---|---|---|
| `medBraceBreaks` | `ev.braceBreaks` | cavalry or beast charges broken by a braced block | `brace_break` |
| `medBannersDown` | `ev.bannersDown` | enemy banners felled by the player's side | `banner_fall` (enemy team) |
| `medBoltHeavyKills` | `ev.heavyKilledByBolts` | kills of targets with armor >= 0.4 by weapons with ap >= 0.5 | `unit_kill` with ap and armor flags |
| `medUnhorsed` | `ev.unhorsed` | enemy `bailout` events (horse died, knight stood up) | `bailout` |
| `medGatesBroken` | `ev.gateFallSecs` (min over gates) | gates destroyed; seconds from first ram contact to fall | `prop_destroyed`, first `structure_hit` by a ram |
| `medHealedHp` | `ev.healedHp` | hit points healed on the player's side | `unit_heal` sum |
| `medFireKills` | `ev.byCause.fire` (existing map) | kills by fire, oil or burning props | `unit_kill` cause fire |
| `medDragonKills` | `ev.killsByDef.cinderwyrm` (existing map) | Cinderwyrms killed by the player | `unit_kill` def |
| `huzzahs` | n/a | Brutus HUZZAH lines heard (counted by the announcer driver, see `humour.md` 1.1) | announcer driver |
| `soupCasts` | n/a | already covered by the existing `godPowers.med_soup_cart` map | `god_power` |

## 3. Twelve achievements

Three are generated per era by the shared helper (`ancient_history`, `overachiever`, `tourist` semantics); eight are designed; one is hidden. Ids carry `med_`; icons are existing icon-set words or new simple glyphs (UI picks). `desc` is funny and states the condition; the hidden one is "???" until unlocked. Tests are written against the lifetime object `stats` (already updated with the battle) and the per-battle summary `ev`, like `humor/achievements.js`.

| # | id | name | desc (shown) | icon | test |
|---|---|---|---|---|---|
| 1 | `med_history` | Medieval Times (Mostly Mud) | Finish the Medieval campaign. Dragon, damp and a slightly burnt tabard. | scroll | `stats.campaign.completedEras` includes `'medieval'` (generated: all nine `med_*` missions have >= 1 star) |
| 2 | `med_overachiever` | Gold Star Embroidery | Earn all 27 stars in the Medieval campaign. The tapestry is gold thread now. | star | `totalCampaignStars(medMissions) === 27` |
| 3 | `med_tourist` | Grand Tour Of Damp Places | Fight on all 12 Medieval arenas. Bring a coat. | map | `Object.keys(stats.arenasPlayed)` contains every `med_*` arena id (12) |
| 4 | `med_pointy_end` | Pointy End Forward | Break 25 charges on braced pikes, lifetime. The horses have written to complain. | pike | `stats.medBraceBreaks >= 25` |
| 5 | `med_vexillologist` | Vexillologist's Nightmare | Topple 6 enemy banners in one battle. The bunting is going to need a minute. | flag | `ev.bannersDown >= 6` |
| 6 | `med_tin_opener` | Tin Opener | Kill 15 armoured soldiers with bolts in one won battle. Plate is a suggestion. | bolt | `ev.won && ev.heavyKilledByBolts >= 15` |
| 7 | `med_unhorsed` | Unhorsed And Unbothered | Unhorse 10 knights in one battle. They get up, they say Ahem, they lose anyway. | horseshoe | `ev.unhorsed >= 10` |
| 8 | `med_door_prize` | Door Prize | Bring down an enemy gate within 45 seconds of the first ram contact. Knock, knock, structurally. | gate | `ev.gateFallSecs > 0 && ev.gateFallSecs <= 45` |
| 9 | `med_soup` | Bring Out The Soup | Heal 4,000 hit points in one won battle. The soup is, medically speaking, soup. | bowl | `ev.won && ev.healedHp >= 4000` |
| 10 | `med_oil_painting` | Oil Painting | Win a battle with 20 kills by fire or oil. Frame it, but not near the thatch. | flame | `ev.won && (ev.byCause.fire || 0) >= 20` |
| 11 | `med_dragon_slayer` | Dragon Insurance Claim | Kill a Cinderwyrm. The claim is pending, the dragon is not. | dragon | `(ev.killsByDef.cinderwyrm || 0) >= 1` |
| 12 | HIDDEN `med_dennis` | Dennis Takes The Credit | `???` (unlocked text: "Win a battle in which only costume dragons survive. Dennis has notes.") | costume | `ev.won && ev.aliveDefs` has `pageant_dragon >= 1` and no other defs |

Notes: (1) `med_history` fires from the same campaign event as `ancient_history` (CU9) and must not fire for Ancient. (2) Achievement ids are immutable once shipped. (3) The achievements screen groups by era with filter tabs (CU9); `med_dennis` shows as a locked card with a question mark. (4) Mechanic coverage: brace #4, colours #5, bolts #6, charge #7, gates #8, healers #9, fire #10, air #11; arc fire has no achievement (the tests of M8 and M9 carry it); this is acknowledged, not accidental.
