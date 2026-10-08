# Medieval: the five survival bosses (binding, synthesizer part 1)

Rules applied. Five bosses, five different silhouettes, **none a scaled hum1 soldier** (four of the five Ancient bosses are hum1 blueprints, two of them scaled giants; the plan asks for a non-scaled-hum1 silhouette per era boss, so this era makes all five non-hum1). Each boss demands a different answer from the player army (that is what makes the Survival cycle replayable), carries a mechanic joke, and fits `MAX_PARTS` 48 with room to spare. Triangle budgets are set against the measured Ancient references (war_elephant 36 parts: near 56,448 / far 14,168; chariot_archer 43 parts: near 15,309 / far 8,724; plan s5: boss far <= 15 K, vehicle far <= 6 K, far mesh judged at the model's own switch distance and at 80 u). Boss waves are every 5th wave, in this fixed cycle; after wave 25 the cycle repeats with the budget scaled by the normal wave formula.

| wave | id | name | faction | rig | parts (body + crew) | near / far tri budget | hp / cost | demands from the player | wave title |
|---|---|---|---|---|---|---|---|---|---|
| 5 | `great_hog` | Great Hog | yeomen | quad1 species `boar` x2.2 | 13 + 0 | <= 28,000 / <= 7,000 | 1350 / 640 | braced pikes and stakes; it is a charge with legs | "Wave {n}: Best In Show" |
| 10 | `bridge_troll` | Bridge Troll | wyrmkin | quad1 species `troll` x1.8 | 13 + 3 props (hat, receipt book, purse) = 16 | <= 30,000 / <= 8,000 | 1500 / 700 | kiting, crossbow bolts, fire (his moss burns); do not stand in a block when he asks for a toll | "Wave {n}: Toll Free (Not)" |
| 15 | `lady_counterweight` | Lady Counterweight | free_company | trebuchet1 builder x1.6 (three-storey frame) | 9 + 2 lite crew (12) = 21 | <= 34,000 / <= 9,000 | 1500 / 700 | flank riders inside her minimum range 30, fire on the frame, cover from the fourth-shot volley | "Wave {n}: Leverage Buyout" |
| 20 | `rolling_keep` | Rolling Keep | gatehouse | ram1 tower variant | 10 + 3 lite crew (18) = 28 | <= 42,000 / <= 11,000 | 2300 / 780 | fire and oil on the timber, trebuchets from outside its roof volley; pikes for the crew that tumbles out of the bailout | "Wave {n}: Mobile Home" |
| 25 | `cinderwyrm` | Cinderwyrm | wyrmkin | dragon1 full | 20 + 0 (coin and glow are voxels in the parts) | <= 60,000 / <= 15,000 | 2700 / 1400 | anti-air: springalds and longbow volleys; spacing against the breath; it lands at 40 percent hp | "Wave {n}: Dragon Insurance Claim" |

The far-mesh rule (plan s5): the defining feature keeps at least 60 percent of its near silhouette pixels at the model's switch distance and at 80 u. The defining feature per boss is listed below; the `downsample2` lint is the arbiter.

## 1. Great Hog

- **Silhouette:** a barrel body, upturned tusks (2x2 voxel cross-section so they survive the far mesh), bristle ridge, a Best-In-Show ribbon on a tiny tail. Height class L. The ribbon is team-tinted so the boss is never mistaken for scenery.
- **Signature animation:** `bull_charge`: head down, a three-step crouch, then a gallop with the ribbon streaming; it skids to a stop on its hooves in a spray of dust, shakes its head, and looks around for the judges. Idle: a pompous prance (ribbon bounces). Reuse: quad1 horse gallop timing with a new `boar` species row (+7 clips; fallback: borrow the hound gait rows).
- **Entrance beat:** it bursts through the hedge line on the arena edge in a showy trot, a rosette tumbles off its head, Brutus announces the category ("Best In Show, wave five"), the stinger is a three-note brass flourish (`med_sting_hog`), a 3 s low side-on shot follows the first charge. The lane is marked with a telegraph arrow (dash `bull_charge` 12 u).
- **Death/reaction set:** topples sideways with all four legs in the air; the ribbon floats down last. Hit reactions: stagger, headshake.
- **Mechanic joke:** it won Best In Show and has since turned on the judges. The pikeman's counter line is "points toward the horses, please".

## 2. Bridge Troll

- **Silhouette:** hunched back, knuckles on the ground, a hat the size of a pot lid, a coin purse on a chain, a receipt book at the belt. Moss on the shoulders (tag `fire_weak`). Height class L.
- **Signature animation:** knuckle-walk; idle: licks a thumb and counts coins into the receipt book (the book is a 2x2x1 voxel part that keeps readable at 40 px); attack: a two-fist slam; `Toll Demand` (cc_field confuse r6): he holds out a palm and the confused units stop to look for change. Fallback if the new species row is refused: reuse the hum1 x1.8 giant stance (silhouette loses the knuckle-walk).
- **Entrance beat:** a toll booth (`med_toll_booth` prop) slides in from the arena edge on a script `prop` event and he stands up behind it; "THE TOLL BRIDGE IS CLOSED (FOR YOU)" banner; stinger a tuba "wah" (`med_sting_troll`); 4 s shot from water level if the arena has water, else a slow push-in.
- **Death/reaction set:** sits down heavily, hat rolls away, a single coin spins and drops; hit reaction: offended recoil.
- **Mechanic joke:** demands a toll, a receipt and your full name, in that order. His rage at half hp is "he has noticed the receipts are blank".

## 3. Lady Counterweight

- **Silhouette:** a three-storey A-frame, the counterweight painted as a smug hat (a wide-brim hat shape 8x3 voxels), bunting along the arm, cyan patch panels on the frame (Mostly Paid Company). Height class XL, 16 u arm. This is trebuchet1 with a bespoke builder, not a recolour: the frame silhouette is different from the player's `trebuchet`.
- **Signature animation:** the crew heave; the hat counterweight descends slowly, the arm whips, the sling releases with a whump; every fourth shot is a volley of three (`fire_every` n 4) and the crew applaud; a misfire ("counterweight substituted") launches the hat. Idle: the crew polishes the hat. Uses the trebuchet1 `launch` / `reload` clips parameterised to 1.6 scale.
- **Entrance beat:** the ridge/bank opposite the player's army: the camera does a 5 s long-lens push from the player's battery to her silhouette as the frame is wheeled into place; stinger `med_sting_lady` (a groan, a counterweight whump, a whistle); announcer: Cassandra "She is bigger. I said bigger. I used the word."
- **Death/reaction set:** the frame folds sideways, the hat counterweight swings through and lands on the ground upright; crew run in a circle and sit down. Hit reaction: a shudder, no flinch.
- **Mechanic joke:** named by the guild, insured by a rival guild, sued by both.

## 4. Rolling Keep

- **Silhouette:** a crenellated tower on four wheels, a drawbridge for a nose (lowered onto walls and gates), a banner on top, in Gatehouse pale steel with frost pennants. Height class XL.
- **Signature animation:** the long chain rattle as the nose lowers; the slam (structDmg x6) with a puff of dust; the roof volley (eight bolts every 5 s); death or wall contact triggers the bailout: the doors drop open and six crossbowmen tumble out (the crew exit is a `summon_on_death` event with a 1 s staggered spawn). Rolling clip: wheel rotation parts only.
- **Entrance beat:** it rolls into the arena from the edge under its own banner with a 3.5 s side shot; the drawbridge nose lowers and rises again in a bow ("a castle that went for a walk"); stinger a timpani hit and a woodwind fall (`med_sting_keep`).
- **Death/reaction set:** the tower leans, the bridge nose drops, the roof opens and the crew walk out in a line while the tower folds into a crumble prop (non-blocking wreck with smoke, capped with decay). Hit reaction: a groan and a wheel shuffle.
- **Mechanic joke:** a castle that went for a walk and brought its opinions.

## 5. Cinderwyrm

- **Silhouette:** wings with 2-voxel-thick membranes (dense enough to survive the far mesh), a glowing belly (emissive voxels), sulphur scales over oxblood, a spoon-shaped scar on one claw (a recurring detail). Height class XL, air layer. Wing span 14 u.
- **Signature animation:** `fly` loop; the `breathe` clip: it rears, inhales (belly glows brighter for 0.8 s), then exhales a cone (volley of three fireballs, a render-side cone effect); the wing gust is a ring of dust; the tail sweep is `kick`; it lands at 40 percent hp (the landing is a 1.5 s set-piece with a quake ring) and then fights on the ground. Deaths: crash with a coin shower and one spoon that clinks.
- **Entrance beat:** the shadow sweeps the army first (non-attacking flyby), units cower, a scorch line crosses the far hill, then it lands on the lair or the keep roof and roars; 5 s low-angle dolly-up shot; stinger `med_sting_dragon` (low brass and a distant roar); announcer: Cassandra "Lovely day for it."
- **Landing rule (termination safety):** it lands at 40 percent hp, OR 30 s after no anti-air unit remains within 30 u (a design requirement for M7's boss-landing rule; if M7 offers only the hp trigger, the termination rule for unhittable remnants applies). Armygen and campaign validation guarantee anti-air in any army that faces it.
- **Mechanic joke:** slept four hundred years, woke up cranky, somebody took a spoon.

## 6. Cross-checks

- Boss silhouettes: boar, knuckle-walker, three-storey trebuchet, wheeled tower, winged dragon: five different outlines; four factions represented (Wyrmkin twice).
- Boss part totals: 13, 16, 21, 28, 20. Largest crew boss is the Rolling Keep (28); with `MAX_PARTS` 48 all five clear by at least 20.
- The coin_golem is intentionally not a boss (a large hum1-scaled monster that summons hoardlings), so it can be fielded in Quick without dominating an army.
- Tester notes for ER7: each boss is judged in Survival mode (win rate of the reference anti-boss army >= 60 percent, of the autofill army <= 40 percent), not in the 30-62 percent field-win-rate band.
