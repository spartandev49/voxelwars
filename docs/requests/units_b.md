# UNITS-B -> COORD / BEASTS / SIM / ANIM / DOCS : integration notes and requests

Owner: UNITS-B. Code: `src/content/era_ancient/units/units_b.js`, `parts/units_b_{persians,barbarians,mythic}.js` (+ helper `parts/_units_b_kit.js`), `tests/units/units_b.test.mjs`,
look-dev copies `tools/contact_ub.mjs` (+ `contact_ub_entry.js`) and `tools/shot_ub.mjs` (+ `shot_ub_entry.js`). Sheets: `docs/sheets/ub_*.png`.

## What `units/units_b.js` exports
- `MODELS[id] = {kind:'humanoid', blueprint}` for: the nine humanoid/monster units `immortal sparabara xerxes axe_thrower druid chieftain minotaur cyclops medusa`, the riders
  `rider_cataphract rider_camel rider_numidian rider_hannibal rider_centaur`, and the crews `crew_elephant_a/b crew_catapult_a/b/c crew_ballista_a/b` (same pattern as t0's `rider_*`:
  `content.js collect(...,'MODELS')` merges them harmlessly; none of those extra ids is a unit id).
- `BLUEPRINTS` (the bare blueprints), `RIDERS = {cataphract:'rider_cataphract', camel_rider:'rider_camel', numidian:'rider_numidian', hannibal:'rider_hannibal', centaur_archer:'rider_centaur'}`
  and `CREWS = {war_elephant:[2 ids], catapult:[3 ids], ballista:[2 ids]}`.

## COORD (content.js wiring, nothing else is needed from you)
1. Mounted / centaur units: `BUILDERS[unit]({rider: compileSoldier(BLUEPRINTS[RIDERS[unit]], {range, radius, scale}).model})`. Verified: seat error 0.000 for cataphract, camel_rider, numidian,
   hannibal; part counts 27 / 24 / 24 / 26; centaur_archer 17 (torso keeps bow + quiver, legs dropped by BEASTS).
2. Crews: `BUILDERS.war_elephant({crew: CREWS.war_elephant.map(id => compileSoldier(BLUEPRINTS[id]).model)})` (36 parts), `catapult` (36), `ballista` (26).
   **`compileSoldier(bp, {lite:true})` does not exist**: the option is silently ignored and returns the normal 10-12 part hum1 model. That is what BEASTS' mounted test and `docs/units_lib.md` call "lite";
   the crews above are authored to stay at 10-12 parts (no crest, cape, back or off-hand) so every composed model is <= 48 parts without it. If a true `hum_lite` merge is wanted, UNITS-LIB would have to
   add `opts.lite` (merge forearm into upper arm, shin into thigh, drop crest/cape): the blueprints do not depend on it.
3. The elephant builder has two crew slots and no driver slot, so "2 archers + driver" is delivered as 2 archers (the howdah crew); a mahout needs a BEASTS attach point.
4. `tools/gen-registry.mjs` already globs `units/*.js` and `parts/*.js`; running it (the gate does) registers my parts for the Workshop. `units_b.js` also imports its parts directly so Node tools and tests work without the app.

## SIM
- Informational: monsters use the compiled hum1 model scaled by `stats.js scale` (minotaur 1.7, cyclops 2.2; the brief said 1.8-2.6 but stats.js wins; the models read well anywhere in 1.7-2.6). `compileForDef`
  divides the weapon length rule by `scale`, so world reach is capped at 3.6 u; the cyclops `tree_club` and minotaur axe use `minLen` so they never shrink below a readable length (cyclops tip ~4.0 u from the axis at scale 2.2).
- The chieftain's `stats.js` has no radius, `compileForDef` then uses 0.55 (sim default) while the body-type default is 0.62; both compile (checked in the test).

## ANIM
- Parts that move with the head/body: Medusa's snake crown is static voxels in `head`/`crest`/`body` (a small `crest` sway reads as writhing); druid hood + shawl collar are in `head` + `body`; the cataphract pennon is part of the
  `weapon` voxels; axe-thrower rack is the `back` part; minotaur horns and cap tips are in `crest`.
- Off-hand items: `throwing_axe` and `golden_sickle` hang down-forward like `second_sword` (`meta.rest [2.44|2.2,0,0]`); the cyclops `boulder` is a normal 14 x 14 x 6 off-hand (the throw clip should lift the `offhand` part).
- `sparabara_bow` is a ONE-handed bow (`style 'shoot'`, `twoHanded:false`) so the pavise stays; the library bows are two-handed and would drop the shield.

## DOCS
- New part ids (all selectable in the Workshop, no unlock keys: the specs name none):
  helms `persian_fez royal_tiara cataphract_helm turban horned_fur_cap horned_giant druid_hood brow_band minotaur_head cyclops_face gorgon_hair`; faces `beard_ringlets beard_two_braids`;
  tunics `royal_robe thrower_tunic druid_robe clan_tunic minotaur_fur cyclops_tunic gorgon_gown`; armors `immortal_scale scale_hauberk horn_baldric minotaur_harness`; shoulders `gorgon_stole`; legs `persian_trousers`;
  capes `bearskin_short`; backs `scimitar_back axe_rack`; mains `sparabara_bow kontos_pennon war_club tree_club`; offs `gerron pavise_wall throwing_axe golden_sickle boulder`.
