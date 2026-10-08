# Sci-Fi god powers (binding): six powers, stable slot semantics

Owner: DESIGN-ERA-SCI-FI part 2. Consumers: SIM (GodPower interpreter, M15), UI (HUD `DEFAULTS`, `POWER_ICON`, aim-ring colours, 6 icons of the 18), AUDIO (6 power cues of the 18), COMEDY-SF (copy), `save/stats.js` (per-power cast counters). The set is the one `feel_sheet.md` s12 decided (A's set with B's cooldown classes), checked against the code (`src/sim/godpowers.js`: `zeus_lightning` chains from the bolt to the nearest enemy and 3 more jumps; `meteor` calls `areaDamage(.., -1)` so it **hurts everyone** in the ring, as does `earthquake`; `heal_wave` heals allies; `wine_rain` pulses a status on everyone; `raise_chickens` is `addSquad`) and against `missions_outline.md` s0.1 item 4.

## 0. How these plug in

- Schema (plan CU12): `GodPower {id, slot, name, icon, blurb, joke, tutorialLine, kind, cd, delay, r, dur, effect, telegraph, cue}`. Ancient powers keep their ids and numbers bit-identically through the same interpreter; Sci-Fi powers are data rows in `era_scifi/godpowers.js`. **No new engine branch and no new effect family**: every Sci-Fi power is an instance of one of the six families that already exist, so Sci-Fi is the one era whose six powers map one-to-one onto the Ancient six (the Modern pack needed one new family, `spawn_hazards`; the Medieval pack does not use `zone_quake`).
- **Slot semantics never change across eras** (keys 1 to 6): 1 quick strike, 2 big strike, 3 area control, 4 heal/repair, 5 status, 6 summon/reinforce.

| generic effect family | Ancient instance | Sci-Fi instance |
|---|---|---|
| `strike_point` (short telegraph, point damage, optional chain) | `zeus_lightning` | `sf_arc_tickle` |
| `strike_area_delayed` (long telegraph, `areaDamage` + crater) | `meteor` | `sf_orbital_clean` |
| `zone_quake` (shake, stagger, prop damage) | `earthquake` | `sf_gravity_burp` |
| `heal_area` (instant heal of allies in a circle) | `heal_wave` | `sf_nano_spritz` (organic, machine and shield filters all on) |
| `zone_status` (timed circle applying a status each pulse) | `wine_rain` | `sf_off_switch` (status `EMP`, machines only) |
| `summon_units` (spawn a squad for the caster's team) | `raise_chickens` | `sf_grazer_drop` |

- All damage and heal numbers below are **design numbers**; the interpreter multiplies them by `G.godMul` (1.6) exactly as it does for Ancient. BALANCE may retune `cd` and numbers inside the ranges, not the family or the slot.
- `kind` drives the HUD tint and the ally-fire rule: `harm` hits the other team only, `help` benefits the caster's team, `neutral` affects everyone in the circle (as the Ancient meteor and earthquake do).
- **Mission data needs two small hooks** (requests R3 and R4 in `missions_outline.md` s5): `powers.disable: [ids]` (a power greyed with a reason) and `powers.override: {id: {field: value}}` (a data patch for one mission, used once). The AI does not cast god powers. Puzzles turn all six OFF. Survival, Daily and Quick have them ON.
- **Teaching policy.** A power that only deals damage or heals never pre-empts a lesson; a power that would trivialise a taught mechanic is held back. Hence: `sf_off_switch` (EMP is taught in mission 5) is disabled in missions 1 to 4; `sf_gravity_burp` has its prop damage patched to 0 in mission 3 (the reactor core and pylons are the lesson); the orbital power stays on from mission 1 because it behaves exactly as the Ancient meteor did (ring, crater, hurts everyone) and mission 8's lesson is the caster-borne version: the first-sight beat `sf_b_strike` keys on a `strike_call` whose source is a UNIT (the Housekeeper) or the station, never on a player god power, which carries its own `tutorialLine` caption.

## 1. The six powers

### Slot 1: `sf_arc_tickle`, "Arc Tickle"

| field | value |
|---|---|
| kind | harm |
| icon idea | a cyan zig-zag arc that hops across five small hexagons, the last one popping like a bubble; a rubber duck silhouette in the corner (the thing the intern did not pet) |
| aim ring colour | ion cyan `#35e0ff` |
| blurb | "A bolt that hops from one enemy to the next. It pops bubbles first." |
| joke | "Chains between up to five enemies. Zeus's intern found it in the lost-property box. The label said 'Do Not Pet'." |
| alt joke (intern's note) | "Intern's note: it is not a toy. It tickles. Please stop asking who." |
| tutorialLine | "Press 1. Aim at a clump. The arc pops the first bubble and hops on four times." |
| cd / delay / r / dur | 6 s / 0.35 s / 3 / 0 |
| effect | `strike_point {hits:1, dmg:70, type:'energy', ap:0.5, chain:{n:4, r:6, falloff:0.85}, hitsAir:true, friendly:false}`: energy damage drains a bubble before hit points (M4 absorb, `vs.energy` = 1), so one jump pops a 40-point trooper bubble and chips the body; the chain jumps to the nearest enemy of the caster as the Ancient lightning does; it never harms friends; machines take it fully (no EMP interaction) |
| telegraph | a thin cyan spark ring on the ground for 0.35 s, a high crackle |
| cue idea | `sf_cue_arc`: a bright "zzt" and four rising "tk" hops, the last a very small "boing"; no thunder |
| stat key | `godPowers.sf_arc_tickle` |

### Slot 2: `sf_orbital_clean`, "Orbital Deep Clean"

| field | value |
|---|---|
| kind | neutral (the ring hurts everyone inside it, as the Ancient meteor does; the telegraph is the fairness contract) |
| icon idea | a downward pencil beam from a tiny satellite onto a red ring, with a feather duster stuck in the crater |
| aim ring colour | alarm red `#ff3d5a`, rotating |
| blurb | "Two seconds after the red ring appears, a beam from orbit clears it. Leaves a crater." |
| joke | "Requested through Zeus's intern, who asked the satellite nicely. Stand outside the ring. The ring is not a suggestion." |
| alt joke | "Intern's note: pressed Submit twice. The satellite is very thorough." |
| tutorialLine | "Press 2. The ring lights for two seconds. Everyone inside it is cleaned, friends included." |
| cd / delay / r / dur | 20 s / 2.0 s / 5 / 0 |
| effect | `strike_area_delayed {pending:1, kind:'orbital', dmg:140, type:'energy', ap:0.5, pen:2.0, kb:10, crater:{r:2.5, via:'lazy'}, structDmg:200, friendly:true}`: the `STRIKE_KINDS.orbital` row of M10 (`energy`, pen 2.0, kb 10, crater r x 0.5), `areaDamage(.., -1)` like the meteor, `makeCrater` lazy (counts against the crater cap of 3 per second), prop damage 200 as the meteor; it hits ground and hover units, air-layer units are above the ring and untouched; the kill verbs read "deep-cleaned", "rinsed", "filed under sky" |
| telegraph | a rotating red ring with a descending pencil beam for 2.0 s, a rising charge tone; the ring is drawn on the ground at r 5 and is visible at 60 u |
| cue idea | `sf_cue_orbital`: a 2 s charge (rising synth drone with countdown ticks), 0.15 s of silence, then a deep "KRAAA-THOOM" with a cyan zap; music ducks 6 dB; obeys the R16 flash limiter |
| stat key | `godPowers.sf_orbital_clean` (feeds `usedMechanic('strike')` and the achievements `sf_deep_clean`) |

### Slot 3: `sf_gravity_burp`, "Gravity Burp"

| field | value |
|---|---|
| kind | neutral (everyone in the circle, as the Ancient earthquake) |
| icon idea | a downward-pointing arrow in a bubble with three small rocks floating up out of it and a hiccup mark |
| aim ring colour | dust lilac `#c9b8ff` |
| blurb | "For five seconds, everyone in the circle floats, stumbles and falls over. Props take a dent." |
| joke | "Zeus's intern pressed a button labelled 'g'. Everything is briefly lighter and slightly offended." |
| alt joke | "Intern's note: it works on everyone equally. Mostly on the ones standing up." |
| tutorialLine | "Press 3. A five-second wobble in a wide circle. Heavy things shrug it off." |
| cd / delay / r / dur | 30 s / 0 / 14 / 5 s |
| effect | `zone_quake {r:14, dur:5, every:1, stagger:0.6, knockdown:{chance:0.3, stun:0.8}, massImmune:8, propDmg:130, layers:['ground','hover'], friendly:true}`: the Ancient earthquake numbers; units with mass >= 8 (mechs, bosses, the Stomper) ignore it; air-layer units are above it; hover units stagger and bob; shield and cloak are untouched (not a damage type, no bubble interaction); **mission 3 overrides `propDmg` to 0** so the reactor core and pylons stay a lesson |
| telegraph | a circle of floating dust and pebbles rising, a low "bwoomp"; no delay, the ring is the cast |
| cue idea | `sf_cue_burp`: a soft sub drop, a slide whistle going up, a tiny hiccup at the end of each pulse |
| stat key | `godPowers.sf_gravity_burp` |

### Slot 4: `sf_nano_spritz`, "Nano Spritz"

| field | value |
|---|---|
| kind | help |
| icon idea | a spray bottle with a mint-green mist ring, a tiny spanner and a bubble in the mist |
| aim ring colour | mint `#5be8a8` |
| blurb | "A mist mends soldiers, repairs machines and refills bubbles in a circle." |
| joke | "Fixes soldiers, robots and the occasional feeling. Contains 40% hand sanitiser." |
| alt joke | "Intern's note: one squirt per customer. The customer is everyone." |
| tutorialLine | "Press 4. Park the mist on your wounded. It mends bodies, machines and bubbles, a little." |
| cd / delay / r / dur | 25 s / 0.6 s / 12 / 0 |
| effect | `heal_area {organic:'+60 hp', machine:'+60 hp', shield:'refill to cap', team:'ally', filter:'any', instant:true}`: both M6a filters on at once (the Ancient `heal_wave` is the organic-only instance); the shield refill sets `u.sh = shMax` and clears `SHIELDDOWN`; poisoned or `NOHEAL` units are not healed (poison keeps ticking); alien and organic units are healed like humans; it does not cancel EMP; the unit healers (Medic, Tech, Shepherd, Tender) are not replaced by it (smaller, 25 s) |
| telegraph | a green hex ring on the ground at r 12 for 0.6 s, a mint mist rolling in |
| cue idea | `sf_cue_spritz`: a spray "fsst" three times, a happy ascending chime per healed unit (`heal_chime`, thinned), a bubble "ting" for each refilled shield |
| stat key | `godPowers.sf_nano_spritz` (feeds `sfHealedHp` and the callback `sf_cb_sanitiser`) |

### Slot 5: `sf_off_switch`, "Big Red Off Switch"

| field | value |
|---|---|
| kind | neutral (it switches off every MACHINE in the circle, friends included; organic and alien units are untouched) |
| icon idea | a chunky red toggle in a hexagonal bezel with a tiny sleeping robot face and a lock tag reading a smile glyph |
| aim ring colour | static blue `#5fa8ff` |
| blurb | "For eight seconds, machines in the circle are switched off in pulses and their bubbles drop." |
| joke | "Zeus's intern labelled it 'DO NOT PRESS'. Therefore it lives in slot five." |
| alt joke | "Intern's note: last used on the office coffee machine. The coffee machine has since retired." |
| tutorialLine | "Press 5. Everything made of metal in the circle goes on hold. Yours too." |
| cd / delay / r / dur | 30 s / 0.4 s / 12 / 8 s |
| effect | `zone_status {status:'EMP', affects:'machine', every:2.0, pulse:{stun:1.0, shieldZero:true, cancelCloak:true}, dur:8, friendly:true, bossCap:'as unit'}`: the M6b rule on a timer: each pulse (every 2.0 s for 8 s, four pulses) applies EMP for 1.0 s to every unit in r 12 tagged `machine` (the same filter as the Tinker), zeroes its bubble and forces SHIELDDOWN, cancels a machine's cloak; **boss caps apply** (the Concierge and the Rex are capped at 2.0 to 2.5 s per stun, and a pulse is 1.0 s, so a boss loses half its time); drones and hover machines descend while stunned (M7); organic and alien units are not selected, so Skitter and Glowmoss armies ignore it; **disabled in missions 1 to 4** |
| telegraph | a blue static ring at r 12 with arcs crawling on the ground, a low hum rising for 0.4 s; machines in range show the blue arcs on each pulse and a "please hold" bubble above the first pulse |
| cue idea | `sf_cue_offswitch`: a big mechanical "clunk" of a switch, then the family 5 `emp_burst` pulse four times, each followed by one `robot_powerdown` "pdddt" on the nearest machine only |
| stat key | `godPowers.sf_off_switch` (feeds `usedMechanic('emp')` and the achievement `sf_turn_it_off`) |

### Slot 6: `sf_grazer_drop`, "Grazer Drop"

| field | value |
|---|---|
| kind | help |
| icon idea | a fluffy round creature with a gold lamp on a stalk under a small pod parachute, a gift tag on the pod |
| aim ring colour | lamp amber `#ffb02e`, six small rings |
| blurb | "Six Glow Grazers drop in pods and join your side. Their lamps reveal cloaked units." |
| joke | "Delivered by Zeus's intern. Signed for by nobody. The grazers are thrilled." |
| alt joke | "Intern's note: they are not goats. Please stop checking." |
| tutorialLine | "Press 6. Drop them where your line is thin. They charge, and their lamps spot cloaked units." |
| cd / delay / r / dur | 18 s / 0.6 s / 3 / 0 |
| effect | `summon_units {units:[{def:'glow_grazer', n:6}], team:'caster', place:'cursor', cap:12, drift:{height:14, dur:1.2, shape:'pod'}, cooldownShared:false}`: free units flagged `summoned` (excluded from `startCount` and `startCost`, so star 2 is unaffected), field cap 12 summoned units, six `sf_drop_pod` landing puffs staggered 0.1 s; a fixed def (the era mascot) so no new interpreter rule; the Grazer's `detect` lamp (r10) is live on landing |
| telegraph | six small amber rings on the ground growing over 0.6 s, a column of confetti stars at each |
| cue idea | `sf_cue_grazer_drop`: six soft parachute "fwup"s, six cheerful thuds, a doorbell, and a collective unimpressed "baa" that is not a goat |
| stat key | `godPowers.sf_grazer_drop` (feeds the achievement `sf_space_goat` and the callback `sf_cb_goat`) |

## 2. Per-mission availability

All nine missions leave god powers ON, except where stated. Puzzles turn all six OFF.

| mission | note |
|---|---|
| M1 | powers introduced by the basics beat `b_powers` (key 1) and an era caption on the first press of each key; **slot 5 disabled** (`powers.disable`, "The intern has not been told about this one yet.") |
| M2 | slot 5 disabled; slot 3 pushes hover units that stand in the circle (a visible bob) but does not affect the third islet's capture clock; slot 6's pods may land on islets (the Grazers are ground units: they land on a basalt islet and cannot leave it, which is a visible joke and a capture helper) |
| M3 | slot 5 disabled; **slot 3 `propDmg` patched to 0** (`powers.override`) so the core and pylons stay a lesson; slot 2's ring still damages props at 200 (it is a ring, not a wobble) and a pylon that dies pops nearby bubbles, including the player's |
| M4 | slot 5 disabled; slot 6 drops Grazers whose lamps count for the `sf_lamp_reveal` toast (the lesson mission treats them as a roster unit) |
| M5 | slot 5 enabled (EMP is now taught); the power uses the same cap on Valet Drones and Crawlers as the Tinker's EMP; the set-piece threshold (>= 8 machines) can be earned by the power or by the Tinkers |
| M6 | all enabled; the Concierge's stun cap (2.5 s) makes the power's pulses (1.0 s) a window for a back stab, never a lock |
| M7 | all enabled; slot 5 does nothing to the Skitter wave (aliens are organic) and the toast says so once ("Nothing metal here"); slot 6's Grazers drop on the near bank or the ford only if the cursor is on land |
| M8 | all enabled; the Housekeeper's Deep Clean and slot 2 share the ring look but not the cooldown; the first-sight beat `sf_b_strike` fires only for the Housekeeper's cast |
| M9 | all six enabled; summoned Grazers never count as the player's army cost; slot 2 and the Housekeeper count for `usedMechanic('strike', 25)` |

## 3. The intern gag: where he is named

The intern is offstage. He has no portrait, no voice and no fourth `who`. He appears in exactly these places:

1. **Arrival card** (once per era): "ARRIVAL: THE FUTURE. Zeus's intern pressed the third button on the time remote..." (`humour.md` s3.1).
2. **Chooser caption** (era card): "THE FUTURE. Selected by Zeus's intern, who held the remote upside down." (`feel_sheet.md` s12, verbatim).
3. **God-power tooltips**: the `joke` of slots 1, 2, 3, 5 and 6 names him; each `alt joke` is phrased "Intern's note: ..."; at most one "Intern's note" line is visible on any screen at once.
4. **Cooldown and block messages** (HUD, text only): a cooldown that finishes shows a soft chime and the ring sweep closing, no text; a blocked power (slot 5 in M1 to M4) shows "The intern has not been told about this one yet." (the same blocked-power line as the Modern pack, kept on purpose as a cross-era running gag).
5. **Finale card** ("all four eras cleared", `humour.md` s3.3): the line "Somebody has been promoted; we will not say who." implies him; the card never names him.
6. **Stalemate drill** (below): his stationery only (a gift ribbon, a sticky note on the pod), and the attribution is to "the sky", never to him.

### 3.1 Era intervention (stalemate watchdog)

Ancient: warning at 12 s, advance order at 18, Zeus plus the goat at 30, Zeus ragequits and the battle is drawn at 44. Sci-Fi uses the same draft pacing as Modern (`feel_sheet.md`/`M.md` 3.10: warn 16 s, advance 24 s, intervene 40 s, quit 60 s, `progress:true`, so a shield recharge does not count as progress and a bubble stall cannot hide inside the watchdog) and swaps the staging (`intervention {kind:'button', unit:null, gift:'glow_grazer'}`, `mascot:'glow_grazer'`):

| stage | what the player sees | announcer (category `stalemate`) |
|---|---|---|
| 16 s warning | a single "bleep" from orbit; a dish on the arena edge swivels; a small "STANDBY" pictogram over the minimap | [C] "Nobody is firing. The satellite has noticed. I can hear it noticing." |
| 24 s advance | idle units get an advance order (a hex-shaped ripple runs through both armies) | [B] "Orders from ORBIT! Everybody advance! The satellite has opinions!" |
| 40 s ping | a red ring on the centroid of EACH army; after 2.0 s both take a small orbital ping (30 energy, r 4, no crater); then a gift-wrapped pod drops between the lines, opens, and one Glow Grazer trots out wearing a ribbon (it joins the army that is behind on cost; ties go to the player) | [P] "A satellite fires on both sides and delivers one grazer. Is that diplomacy, or catering?" |
| 60 s draw | the sky dims, a hold chime plays, a banner reads RATED G, FOR GLOWING and the battle ends in a draw | [B] "Mission Control has gone to LUNCH! Nobody won! Everybody gets a ticket stub!" |

The attribution is "the sky" or "Mission Control", never the intern; the gift ribbon carries a blank sticky note (no text).
