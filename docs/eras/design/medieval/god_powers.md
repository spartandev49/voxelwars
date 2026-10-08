# Medieval god powers (binding): six powers, stable slot semantics

Owner: DESIGN-ERA-MEDIEVAL part 2. Consumers: SIM (GodPower interpreter, M15), UI (HUD `DEFAULTS`, `POWER_ICON`, aim-ring colours, 6 icons of the 18), AUDIO (6 power cues of the 18), COMEDY-MED (copy), `save/stats.js` (per-power cast counters).

## 0. How these plug in

- Schema (plan CU12): `GodPower {id, slot, name, icon, blurb, joke, tutorialLine, kind, cd, delay, r, dur, effect, telegraph, cue}`. Ancient powers keep their ids and numbers bit-identically through the same interpreter; Medieval powers are data rows in `era_medieval/godpowers.js`. No new engine branch per power: each `effect` names one of six generic **effect families** that already exist in `GodPowers` (the Ancient six are instances of them).
- **Slot semantics never change across eras** (keys 1 to 6): 1 quick strike, 2 big strike, 3 area control, 4 heal/repair, 5 status, 6 summon/reinforce.

| generic effect family | Ancient instance | Medieval instance |
|---|---|---|
| `strike_point` (short telegraph, point damage, optional chain) | `zeus_lightning` | `med_royal_volley` |
| `strike_area_delayed` (long telegraph, `areaDamage` + crater) | `meteor` | `med_bell_drop` |
| `zone_status` (timed circle applying a status each tick to units inside) | `wine_rain` | `med_mud_season`, `med_precedence_dispute` |
| `heal_area` (timed or instant heal of allies in a circle) | `heal_wave` | `med_soup_cart` |
| `summon_units` (spawn a squad for the caster's team) | `raise_chickens` | `med_audience_joins` |
| `zone_quake` (shake, stagger, prop damage) | `earthquake` | not used by Medieval (Subsidence from proposal B was dropped: it would trivialise gates) |

- All damage and heal numbers below are **design numbers**; the interpreter multiplies them by `G.godMul` (1.6) exactly as it does for Ancient. BALANCE may retune `cd` and numbers inside the ranges, not the family or the slot.
- `kind` drives the HUD tint and the ally-fire rule: `harm` hits the other team (and, if stated, friends in the circle), `help` benefits the caster's team, `neutral` affects everyone in the circle.

## 1. The six powers

### Slot 1: `med_royal_volley`, "Royal Courtesy Volley"

| field | value |
|---|---|
| kind | harm |
| icon idea | seven thin arrows converging into a rust-orange ring on parchment (one arrow is a bit late) |
| aim ring colour | rust `#c8501e` |
| blurb | "Seven arrows land in a small circle. Armour still counts." |
| joke | "A volley from archers who are not there. The intern was told 'a bit of lightning' and sent an archery club." |
| alt joke (third hover) | "Intern's note: the Smiting box was already ticked. We left it." |
| tutorialLine | "Press 1. Aim at a clump. The intern sent an archery club." |
| cd / delay / r / dur | 8 s / 0.6 s / 3.2 / 0 |
| effect | `strike_point {hits:7, dmgTotal:55, type:'pierce', ap:0.2, spread:'seeded', chain:0, hitsAir:false, friendly:false}` (arrows scatter inside r via the power's own RNG fork `fork('era:godpower')`; ap 0.2 so plate takes real but reduced damage: the volley is a tax on armour, not a plan; unlike Ancient lightning it never ignores armour and never chains) |
| telegraph | a ring of radius 3.2 on the ground; six thin shadow lines converge on it from the sky over 0.6 s (the seventh is a half-second behind) |
| cue idea | `med_cue_volley`: a soft collective flutter overhead, then a rapid patter of thuds (tink on plate); no thunder |
| stat key | `godPowers.med_royal_volley` (existing `godPowers` map) |

### Slot 2: `med_bell_drop`, "Bell From Above"

| field | value |
|---|---|
| kind | harm (affects both teams inside the ring; it is a very large bell) |
| icon idea | a bronze handbell with a motion streak, shadow ring beneath |
| aim ring colour | bronze `#b07a2c` |
| blurb | "A very large bell, dropped on a circle. Stuns what it does not squash." |
| joke | "Dropped by the intern, who thought it was a pageant prop." |
| alt joke | "Act of God. Covered by every policy except yours." |
| tutorialLine | "Press 2. Wait for the shadow to finish growing. The bell will not wait for you." |
| cd / delay / r / dur | 24 s / 1.8 s / 5.5 / 0 |
| effect | `strike_area_delayed {dmg:240, type:'blunt', ap:0.4, falloff:[1.0,0.5], stun:1.5, kb:5, structDmg:0.5, crater:{r:2, depth:'shallow'}}`; the bell leaves a crater and a ground decal only (no wreck prop: `props.md` has none and wrecks are on the cut ladder). `structDmg` 0.5 keeps the bell from skipping the gate in M5. Counts against the crater rate cap |
| telegraph | a dark growing disc with a bell-shaped shadow that enlarges over 1.8 s; a DONG at 0.9 s and 1.5 s as the countdown tell; red edge in the last 0.4 s |
| cue idea | `med_cue_bell_drop`: rising whistle, one huge round DONG with a long decay, clatter of rubble; reuses the family `med_bell` so the Bellringer and the Great Peal share the timbre |

### Slot 3: `med_mud_season`, "Mud Season"

| field | value |
|---|---|
| kind | neutral (it rains on everyone in the circle: an equal-opportunity swamp) |
| icon idea | a brown puddle with a single boot sinking and three rain lines |
| aim ring colour | mud brown `#6b4a2b` |
| blurb | "Turns a patch of field to mud. Everything inside crawls, and charges stop." |
| joke | "It rains on exactly one field. Meteorologists object. Cavalry object more." |
| alt joke | "Planning permission denied. Retroactively. Loudly." |
| tutorialLine | "Press 3. Put it under a charge, or in front of a line you want to keep." |
| cd / delay / r / dur | 28 s / 0.5 s / 11 / 9 s |
| effect | `zone_status {status:'SLOW', mul:0.55, tick:0.5, affects:'all', chargeMomentum:'cancel', fireOnProps:0.4}`: movement speed x0.55 for units inside; because the charge bonus is gated on speed and run-up, the slow alone cancels most of a charge (if the sim gates the bonus on distance only, request `chargeMul:0` from M3; fallback: slow without the explicit cancel); fire patches and burn timers on props inside the circle run x0.4 (it is wet). No damage |
| telegraph | a brown rain sheet expanding from the point to r 11 over 0.5 s, then a muddy ripple on the ground for the duration |
| cue idea | `med_cue_mud`: heavy rain on mud, squelchy footsteps (`med_step_mud` swaps in for units inside), one low gloop |
| mission note | the one mission it undermines is M4 (the charge lesson). CAMPAIGN-MED may pass `powers.disable:['med_mud_season']` for M4 if the mission rules schema gains it (request in `missions_outline.md` 6); otherwise it stays enabled, because using mud on your own charge is a dumb play the game lets you make |

### Slot 4: `med_soup_cart`, "Soup Cart of Plenty"

| field | value |
|---|---|
| kind | help |
| icon idea | a cart with a steaming cauldron and a ladle, mint steam |
| aim ring colour | soup green `#6fa86a` |
| blurb | "A cart of hot soup heals friendly soldiers in a circle over a few seconds." |
| joke | "The soup is hot. The soup is, medically speaking, soup." |
| alt joke | "Intern's note: it is a miracle. It is soup." |
| tutorialLine | "Press 4. Park the cart on your wounded. It heals flesh, not armour." |
| cd / delay / r / dur | 30 s / 0.8 s / 9 / 4 s |
| effect | `heal_area {amount:'45% maxHp over dur', team:'ally', filter:'organic', morale:+10}`; machines and props are not healed (M6a organic filter); poisoned units (`NOHEAL`) are not healed while the status lasts |
| telegraph | a steam ring on the ground at r 9; a cart silhouette rolls into the circle and parks over 0.8 s; steam plume rises |
| cue idea | `med_cue_soup`: wheel creak, ladle clink on iron, a long contented steam hiss; a tiny chime on every heal tick (shared with `heal_chime`) |
| stat key | `godPowers.med_soup_cart` (feeds the callback "soup served") |

### Slot 5: `med_precedence_dispute`, "Order of Precedence"

| field | value |
|---|---|
| kind | neutral |
| icon idea | two stick figures bowing to each other beside a rolled scroll, both with their hats off |
| aim ring colour | gilt `#c9a227` |
| blurb | "Everyone in the circle stops to argue who should bow first. Friends included." |
| joke | "A rule of etiquette with a fatal flaw: it applies to everyone." |
| alt joke | "Intern's note: everyone stops to check their pockets. Everyone." |
| tutorialLine | "Press 5. Aim it at their line, not at yours." |
| cd / delay / r / dur | 26 s / 0.4 s / 8 / 5 s |
| effect | `zone_status {status:'CONFUSE', affects:'all', dur:5, tick:0.5}`: units inside wander and do not attack (same status as the Ancient Philosopher's cc_field); banner carriers keep their banners up but lose the aura while confused |
| telegraph | a gilt ring on the ground with small bowing-figure glyphs revolving around it |
| cue idea | `med_cue_precedence`: a short trumpet fanfare that fails to resolve, a chorus of creaking joints (bows) and polite coughing; no magic shimmer |

### Slot 6: `med_audience_joins`, "The Audience Gets Involved"

| field | value |
|---|---|
| kind | help |
| icon idea | a row of crowd silhouettes with pitchforks and one small green dragon head among them |
| aim ring colour | lime `#8bb12e` |
| blurb | "Eight spectators and a costume dragon leave the stands and join your side." |
| joke | "The spectators have had enough of watching. Cast by the intern, who was only meant to hold the programme." |
| alt joke | "Intern's note: they were passing. They are very keen. Dennis has already started." |
| tutorialLine | "Press 6. Drop them where your line is thin." |
| cd / delay / r / dur | 40 s / 0.8 s / 3 / 0 |
| effect | `summon_units {units:[{def:'peasant_levy', n:8}, {def:'pageant_dragon', n:1}], team:'caster', place:'cursor', cap:18, cooldownShared:false}`: units are free, flagged `summoned` (excluded from `startCount/startCost` so star 2 is unaffected), field cap 18 summoned units |
| telegraph | a column of light with a banner-stand flash at the point; a crowd cheer swells over 0.8 s |
| cue idea | `med_cue_audience`: a roaring crowd cheer, boots on turf, one kazoo blat from the costume |

## 2. Per-mission availability

All nine missions leave god powers ON. Puzzles turn all six OFF. Survival and Quick have them ON. The AI does not cast god powers; the scripted arson and gas of M6 and M7 are mission `strike` events, not powers.

| mission | note |
|---|---|
| M1 | powers introduced by the basics beat `b_powers` (key 1) and the era caption on first press of each key |
| M4 | mud interacts with the charge lesson (see slot 3) |
| M5 | bell drop does half structure damage so the gate lesson stays a siege |
| M6 | soup cart and the physician share the organic filter; poison blocks both |
| M9 | audience summons Dennis a second time; the finale coda scripts the fixed Dennis separately |

## 3. The intern gag: where he is named

The intern is offstage. He has no portrait, no voice and no fourth `who`. He appears in exactly these places:

1. **Arrival card** (once per era): "Zeus's intern has delivered the commentators..."
2. **God-power tooltips**: `joke` of slots 1, 2 and 6 name him; `alt joke` of slots 4, 5 and 6 are phrased as "Intern's note: ...". At most one "Intern's note" line is visible on any screen at once.
3. **Chooser caption** (era card): "MEDIEVAL. The intern says this is the right century. The sticky note says 'roughly'."
4. **Finale card** ("Medieval cleared"): the sticky note found under the gilded spoon (see `humour.md` section 3).
5. **Stalemate recess** line (below): the intern is never named, only his stationery.

### 3.1 Era intervention (stalemate watchdog)

Ancient: warning at 12 s, advance order at 18, Zeus plus the goat at 30, Zeus ragequits and the battle is drawn at 44. Medieval keeps the same timings and swaps the staging (`intervention {kind:'recess', unit:'pageant_dragon'}`, `mascot:'pageant_dragon'`):

| stage | what the player sees | announcer (category `stalemate`) |
|---|---|---|
| 12 s warning | a single trumpet from the side of the field | [C] "Nobody is fighting. The programme has a gap here. I can see it." |
| 18 s advance | a bugle; idle units get an advance order | [B] "THE BUGLE! Someone remembered there was a WAR!" |
| 30 s recess | a bell rings; both armies stop for tea (idle clip, steam from mugs); then the costume dragon walks on from the wings and stands between the lines, waving | [P] "A recess. Is it an interval if the audience has already left?" |
| 44 s draw | the curtain falls (a painted backdrop drops from above), the grandstand applauds, the battle ends in a draw | [B] "THE CURTAIN! Nobody WON! Everybody gets a pie!" |
