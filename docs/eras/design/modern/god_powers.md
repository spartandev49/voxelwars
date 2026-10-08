# Modern god powers (binding): six powers, stable slot semantics

Owner: DESIGN-ERA-MODERN part 2. Consumers: SIM (GodPower interpreter, M15), UI (HUD `DEFAULTS`, `POWER_ICON`, aim-ring colours, 6 icons of the 18), AUDIO (6 power cues of the 18), COMEDY-MOD (copy), `save/stats.js` (per-power cast counters). The set follows the recommendation of `feel_sheet.md` s12 (A's set with B's puns) and the mission-availability rules of `missions_outline.md` 0.1 item 3.

## 0. How these plug in

- Schema (plan CU12): `GodPower {id, slot, name, icon, blurb, joke, tutorialLine, kind, cd, delay, r, dur, effect, telegraph, cue}`. Ancient powers keep their ids and numbers bit-identically through the same interpreter; Modern powers are data rows in `era_modern/godpowers.js`. No new engine branch per power: each `effect` names one of the generic **effect families** of `GodPowers` (the Ancient six are instances of them; the Medieval pack uses the same names).
- **Slot semantics never change across eras** (keys 1 to 6): 1 quick strike, 2 big strike, 3 area control, 4 heal/repair, 5 status, 6 summon/reinforce.

| generic effect family | Ancient instance | Modern instance |
|---|---|---|
| `strike_point` (short telegraph, point damage, optional chain) | `zeus_lightning` | `mod_gp_ricochet_request` |
| `strike_area_delayed` (long telegraph, `areaDamage` + crater; `pending[]` list for several impacts) | `meteor` | `mod_gp_strafing_run` (five impacts on a line) |
| `spawn_hazards` (**one new family**, request R-GP1: places N team-owned `mine_*` hazards in a disc; reuses the M11 trigger rule and the sanitizer's extra fields) | none (`earthquake` was area control) | `mod_gp_minefield_gift` |
| `heal_area` (timed or instant heal of allies in a circle) | `heal_wave` | `mod_gp_tea_break` (organic and machine filters both on) |
| `zone_status` (timed circle applying a status each tick to units inside) | `wine_rain` | `mod_gp_please_hold` |
| `summon_units` (spawn a squad for the caster's team) | `raise_chickens` | `mod_gp_express_delivery` |

- **Fallback for the one new family.** If SIM declines `spawn_hazards`, slot 3 reverts to the existing `zone_quake` family as `mod_gp_rolling_barrage` ("Rolling Barrage": a five-second shake with shells walking across a disc of r 14, staggering and damaging props; B's slot 3) and the reward text and tooltips of this file change by a one-line swap. Mines are M11 and M11 is inside the Modern freeze, so the primary stands.
- All damage and heal numbers below are **design numbers**; the interpreter multiplies them by `G.godMul` (1.6) exactly as it does for Ancient. BALANCE may retune `cd` and numbers inside the ranges, not the family or the slot.
- `kind` drives the HUD tint and the ally-fire rule: `harm` hits the other team, `help` benefits the caster's team, `neutral` affects everyone in the circle.
- The AI does not cast god powers. Puzzles turn all six OFF. Survival, Daily and Quick have them ON.

## 1. The six powers

### Slot 1: `mod_gp_ricochet_request`, "Ricochet Request"

| field | value |
|---|---|
| kind | harm |
| icon idea | one round with a luggage tag, three rubber stamps on its side and a dotted path bouncing off four cardboard targets |
| aim ring colour | laser red `#e2483d` |
| blurb | "One round hits a target, then bounces to four more. Armour still counts." |
| joke | "One round that has been through a lot. Authorised by Zeus's intern, who asked for lightning and was handed a ricochet." |
| alt joke (intern's note) | "Intern's note: it was the only round in the drawer. It has been forwarded four times." |
| tutorialLine | "Press 1. Aim at a clump. The intern sent one very well-travelled round." |
| cd / delay / r / dur | 6 s / 0.35 s / 3 / 0 |
| effect | `strike_point {hits:1, dmg:45, type:'bullet', ap:0.3, chain:{n:4, r:6, falloff:0.85}, hitsAir:true, friendly:false}`: a bullet hit with the Ancient lightning's chain rule, so armour counts (tanks take about a tenth, helicopters and drones take it fully); it never harms friends |
| telegraph | a thin red laser dot on the target for 0.35 s |
| cue idea | `mod_cue_ricochet`: a cap-gun pop, then four rising `plink` pings, the last a very small "boing"; no thunder |
| stat key | `godPowers.mod_gp_ricochet_request` |

### Slot 2: `mod_gp_strafing_run`, "Strafing Run (Pending Approval)"

| field | value |
|---|---|
| kind | harm (props and neutrals inside the line are hit too; it never hurts friends) |
| icon idea | a paper-plane silhouette dragging a dashed line over five small craters, an hourglass stapled to its wing |
| aim ring colour | dashed amber `#ffb300` |
| blurb | "Five shells walk along a 24-unit line toward the cursor. Leaves craters." |
| joke | "Please allow 3 to 5 working seconds. The intern has stapled the request to the wrong aircraft." |
| alt joke | "Intern's note: approved by the helicopter. Do not ask which one." |
| tutorialLine | "Press 2. The line points from your army toward the cursor. The intern says five working seconds. It is two." |
| cd / delay / r / dur | 40 s / 2.0 s / 2.4 per impact (line 24 u) / 0 |
| effect | `strike_area_delayed {pending:5, line:{len:24, from:'army_centroid', to:'cursor'}, dmg:70, type:'explosive', ap:0.3, falloff:[1.0,0.5], kb:3, structDmg:0.5, crater:{r:1.6, depth:'shallow'}, flyover:true}`: five impacts spaced 6 u apart, each its own `areaDamage` + `makeCrater` (counts against the crater rate cap; the five are staggered 0.15 s); the flyover is a render shadow and a sound only; `structDmg` 0.5 keeps the boxcars and the sluice gate from skipping their missions |
| telegraph | a dashed arrow along the line with an ETA clock ticking down from 2 s, five ground rings lighting in sequence, a rising whistle |
| cue idea | `mod_cue_strafe`: a high thin whistle, a pitched-down toy-jet flyover, five whump-and-tin-clatter impacts; the "blast_med" family, not a film explosion |

### Slot 3: `mod_gp_minefield_gift`, "Minefield, Gift Wrapped"

| field | value |
|---|---|
| kind | neutral (an armed mine hurts whoever steps on it, as Sapper mines do) |
| icon idea | a gift box tied with yellow-and-black tape, a small blinking amber light on the bow |
| aim ring colour | tape yellow `#fbeb8f` over black |
| blurb | "Wraps fourteen mines in a disc. Hidden from the enemy, armed in three seconds." |
| joke | "Contents: surprise. Recipient: whoever steps first. Gift receipt: none." |
| alt joke | "Intern's note: it is a gift. Please do not open it with your feet." |
| tutorialLine | "Press 3. Wrap it round a choke, not round your own line." |
| cd / delay / r / dur | 40 s / 0.6 s / 7 / 0 |
| effect | `spawn_hazards {kind:'mine', n:14, r:7, team:'caster', arm:3, dmg:150, aoe:2.5, vsVehicle:1.5, visibleToEnemy:false, friendly:'after_armed'}`: the same trigger rule as `lay_mine` (M11); the mines spawn in a seeded scatter (fork `era:godpower`) and carry no per-Sapper cap; the owner sees a `mod_tape_ring` and a blinking light on each, the enemy sees a ring for 0.4 s as one springs; Dozer Plough ignores them (`mine_immune`) |
| telegraph | a yellow tape ring unrolling around the disc over 0.6 s, fourteen small gift bows popping up |
| cue idea | `mod_cue_gift`: tape unrolling, a cheerful ribbon ping, then the same patient `mine_blip` as the Sapper's mines; a muted pop and "boing" on a trigger |
| availability | **disabled in M1 to M6** (`powers.disable`, mines are taught in M6); enabled from M7; counts toward the M8 star-3 mines counter and the M9 Bingo Card |

### Slot 4: `mod_gp_tea_break`, "Tea Break and Spanner"

| field | value |
|---|---|
| kind | help |
| icon idea | a steaming mug on a saucer with a spanner lying flat beside it |
| aim ring colour | mint steam `#8ff0c0` |
| blurb | "A tea trolley heals people and repairs machines in a circle over four seconds." |
| joke | "Heals people and machines. Not the argument. The intern made the tea. It is orange. Do not ask." |
| alt joke | "Intern's note: one sugar, for the tank." |
| tutorialLine | "Press 4. Park the tea on your wounded. It mends people and machines, a little." |
| cd / delay / r / dur | 30 s / 0.5 s / 9 / 4 s |
| effect | `heal_area {organic:'+45 hp over dur', machine:'+60 hp over dur', team:'ally', filter:'any', pulse:true}`: both M6a filters on at once, lower per-class numbers than the units' own pulses summed (First-Aider 20 x 3 targets / 5 s, Mechanic 35 / 4 s); poisoned or `NOHEAL` units are not healed; the first-aid and mechanic units of M8 are NOT replaced by it (the power is smaller and has a 30 s cooldown) |
| telegraph | a mint steam ring on the ground at r 9; a tea trolley rolls into the circle and parks over 0.5 s; spanner glints and a lollipop sparkle rise together |
| cue idea | `mod_cue_tea`: a kettle click, a pour, wheel squeak and a spoon ting; a tiny `heal_chime` on every tick; the pen-click that ends every cooldown |
| stat key | `godPowers.mod_gp_tea_break` (feeds `modHealedHp` and the callback `mod_cb_tea`) |

### Slot 5: `mod_gp_please_hold`, "Please Hold"

| field | value |
|---|---|
| kind | neutral (it puts everyone in the circle on hold, friends included) |
| icon idea | a telephone handset with three sound arcs over a hold-music note and a tiny pushpin in the handset |
| aim ring colour | candy pink `#f2a8d2` |
| blurb | "Everyone in the circle stops to listen to the hold music, confused and pinned, for four seconds." |
| joke | "Your enemy is important to us. Their call will be answered in the order it was received. Which is never." |
| alt joke | "Intern's note: now playing, the hold music. The pan flute has been asked to stop." |
| tutorialLine | "Press 5. Aim it at their line, not at yours. Everyone in the circle is on hold." |
| cd / delay / r / dur | 35 s / 0.4 s / 9 / 4 s |
| effect | `zone_status {status:['CONFUSE','SUPPRESS'], suppress:'full_meter', affects:'all', dur:4, tick:0.5}`: CONFUSE (the Ancient Philosopher's status: units wander and do not attack) plus a full SUPPRESS meter for pinnable units; tanks, air and drones are `pin_immune` and are only confused; the pin ring and pushpin show on every pinned unit, so the power teaches the pin tell again |
| telegraph | pulsing sound-wave rings at the circle edge with a phone-handset pictogram floating above the point; the music ducks 3 dB as the circle opens |
| cue idea | `mod_cue_hold`: a phone ring, two bars of lounge vibraphone, a polite synth voice-less melody; the hold music of the map bed in miniature |
| stat key | `godPowers.mod_gp_please_hold` |

### Slot 6: `mod_gp_express_delivery`, "Express Delivery"

| field | value |
|---|---|
| kind | help |
| icon idea | a cardboard box with an arrow pictogram pointing the wrong way, an umbrella canopy on top |
| aim ring colour | mint `#8ff0c0` with an aubergine edge |
| blurb | "Six Flowerpot Peashooters drift down on umbrellas and join your side." |
| joke | "Arrives in a box marked THIS WAY UP. It was not up." |
| alt joke | "Intern's note: signature required. Signed by a flowerpot." |
| tutorialLine | "Press 6. Drop them where your line is thin. They arrive upside down." |
| cd / delay / r / dur | 30 s / 0.6 s / 3 / 0 |
| effect | `summon_units {units:[{def:'flowerpot_peashooter', n:6}], team:'caster', place:'cursor', cap:12, drift:{height:9, dur:1.5, shape:'umbrella'}, cooldownShared:false}`: free units flagged `summoned` (excluded from `startCount` and `startCost` so star 2 is unaffected), field cap 12 summoned units; a fixed def (not "the cheapest line unit") because it needs no new interpreter rule and the Shed's peashooter is the cheapest line unit of the era anyway |
| telegraph | an umbrella-shaped shadow growing on the ground over 0.6 s, a column of confetti at the point |
| cue idea | `mod_cue_delivery`: a doorbell, a cardboard thud, six small parachute flaps and a polite "ta-da" on a kazoo |
| stat key | `godPowers.mod_gp_express_delivery` |

## 2. Per-mission availability

All nine missions leave god powers ON, except where stated. Puzzles turn all six OFF.

| mission | note |
|---|---|
| M1 | powers introduced by the basics beat `b_powers` (key 1) and the era caption on the first press of each key; slot 3 (Minefield) disabled |
| M2 to M6 | `mod_gp_minefield_gift` disabled (`powers.disable`, request R4); M5: the Strafing Run does half structure damage (`structDmg` 0.5 already) so the boxcars stay a shell lesson; M6: the Strafing Run does not damage friendly props (the tower) |
| M7 | Minefield enabled; the Strafing Run line cannot hit air (no hitsAir) so it is no answer to the Parasols |
| M8 | Tea Break heals both classes in smaller doses than the units: the rules text says so; Minefield counts for star 3 |
| M9 | all six enabled; the Express Delivery summons count as `summoned` and never as the player's army cost |

## 3. The intern gag: where he is named

The intern is offstage. He has no portrait, no voice and no fourth `who`. He appears in exactly these places:

1. **Arrival card** (once per era): "Passengers Brutus, Plato and Cassandra were re-routed by Zeus's intern, who selected NEXT ERA instead of NEXT MATCH." (`feel_sheet.md` s7, verbatim).
2. **Chooser caption** (era card): "MODERN. The intern says this is the right century. He has pressed 'hold' on the next one."
3. **God-power tooltips**: the `joke` of slots 1, 2, 4 and 6 names him or his stationery; each `alt joke` is phrased "Intern's note: ..."; at most one "Intern's note" line is visible on any screen at once.
4. **Cooldown and block messages** (HUD, text only): a cooldown that finishes shows a pen-click icon on the ring and the toast "The line is open again." (no name); a blocked power (for example the Minefield in M1) shows "The intern has not been told about this one yet."
5. **Finale card** ("all eras cleared" card, `humour.md` 3.3): the sandwich "initialled I." and the note "Sorry about the routing." imply him; the card never names him.
6. **Stalemate drill** (below): his stationery only (a streamer, a stamp).

### 3.1 Era intervention (stalemate watchdog)

Ancient: warning at 12 s, advance order at 18, Zeus plus the goat at 30, Zeus ragequits and the battle is drawn at 44. Modern keeps the same timings and swaps the staging (`intervention {kind:'drill', unit:'fishbowl_chopper'}`, `mascot:'fishbowl_chopper'`, unarmed, goldfish visible):

| stage | what the player sees | announcer (category `stalemate`) |
|---|---|---|
| 12 s warning | a PA click and a squeal from a loudspeaker on the edge of the field | [C] "Nobody is fighting. The schedule has a gap here. I can see it." |
| 18 s advance | the loudspeaker orders; idle units get an advance order | [B] "The loudspeaker! Someone remembered there was a WAR!" |
| 30 s drill | a siren wails; both armies stop in neat rows (idle clip) and a Fishbowl Chopper arrives, unarmed, and hovers between the lines trailing a paper streamer | [P] "A drill. Is it a rehearsal if the audience is the enemy?" |
| 44 s draw | hold music begins; a giant rubber stamp thuds down across the screen (UI overlay, a plain tick pictogram) and the battle ends in a draw | [B] "The stamp! Nobody WON! Everybody gets a biscuit!" |
